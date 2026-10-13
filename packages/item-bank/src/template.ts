import type { AnswerType, D1AnswerDefinition, NumberLineExpected } from "@cr/components";

import {
  hashItemDefinition,
  type ItemDifficulty,
  type ItemForm,
  type ItemPackEntry,
} from "./schema";

/**
 * A small deterministic PRNG (mulberry32). Given the same seed it always draws
 * the same sequence, so template instances are reproducible — which is what lets
 * us freeze an assessment form to stable immutable item versions.
 */
export interface Rng {
  /** Uniform integer in [minInclusive, maxInclusive]. */
  int(minInclusive: number, maxInclusive: number): number;
  /** Uniform element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
}

/**
 * Optional render context passed to a template's `generate()`. Carries the item
 * `form` so a template can render a building-themed prompt for lesson `practice`
 * items while keeping the diagnostic assessment forms (`"A"` / `"B"`) neutral and
 * byte-identical. Templates that do not theme simply ignore it.
 */
export interface GenerateContext {
  form: ItemForm;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    int(minInclusive, maxInclusive) {
      return minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));
    },
    pick(items) {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) {
        throw new Error("cannot pick from an empty list");
      }
      return item;
    },
  };
}

export interface RenderedItem {
  prompt: string;
  answer: D1AnswerDefinition;
  /** The parameters drawn, recorded for provenance (Contracts §4.1 template_params). */
  params: Record<string, number>;
  /**
   * Progressive hints (Mastery_Scoring_Spec §4): up to three per item, each scaffolding
   * a further step (fewer than three only when a problem has no further non-revealing
   * step). A hint NEVER states the final answer or writes a full solving expression.
   * Omitted for assessment-only templates (v1 forms / v2 walk / product), which are
   * never shown with hints; required (and stress-checked) for practice templates.
   */
  hints?: readonly string[];
  /**
   * Full worked solution, shown only after the student reveals (gives up), as an
   * ordered list of steps (one entry per step; the last entry is the final answer).
   * The web renderer supplies step numbering and colors, so entries carry no leading
   * number. Each entry may contain `$...$` KaTeX. Omitted for assessment-only templates.
   */
  worked_solution?: readonly string[];
}

/**
 * A parameterized item generator: the authoring unit that replaces hand-written
 * static items. One template yields many instances, so a template covers a whole
 * (node, difficulty) cell and both parallel forms are just different seeds.
 */
export interface ItemTemplate {
  template_id: string;
  node_id: string;
  difficulty: ItemDifficulty;
  /**
   * Which lesson concept this template tests. Coverage-aware practice selection spreads
   * a set across concepts, so an untagged template is only spread by `template_id` —
   * acceptable for the assessment-only pools (v1 forms / v2 walk / product), expected
   * for every practice template.
   */
  concept?: string;
  /**
   * Draw parameters and render a concrete item. MUST be deterministic in `rng`.
   * `context.form` (when supplied) lets a template theme the `practice` prompt
   * without touching the neutral assessment forms; math, params, and the answer
   * key MUST NOT depend on it.
   */
  generate(rng: Rng, context?: GenerateContext): RenderedItem;
  /**
   * Optional "variety" fingerprint over the drawn params: instances sharing it are
   * near-twins — structurally too similar to serve in the same cell (e.g. `a(bx+c)`
   * differing only in `c`, so `5(3x+4)` and `5(3x+5)`). `freezeDeepParallelForms`
   * requires the instances it freezes into ONE (form, node) cell to have DISTINCT
   * variety keys — stronger than content-hash distinctness, which alone lets those
   * near-twins both freeze. Omit to fall back to content-hash distinctness only.
   */
  varietyKey?: (params: Record<string, number>) => string;
}

/** An item frozen from a template instance; carries template provenance. */
export interface FrozenItem extends ItemPackEntry {
  template_id: string;
  template_params: Record<string, number>;
  /**
   * The lesson concept the source template declared, stamped through so selection and
   * validation read ONE field on the item rather than joining back to the template.
   * Not part of `hashItemDefinition`, so tagging cannot disturb a pinned content hash.
   */
  concept?: string;
  /** Progressive hints for this instance (never leak the answer); see `RenderedItem`. */
  hints: readonly string[];
  /** Worked-solution steps for this instance, shown only on reveal; see `RenderedItem`. */
  worked_solution: readonly string[];
}

/** Deterministically generate one frozen item from a template, form, and seed. */
export function generateFromTemplate(
  template: ItemTemplate,
  form: ItemForm,
  seed: number,
): FrozenItem {
  const rendered = template.generate(createRng(seed), { form });
  return {
    item_version_id: `${template.template_id}:${form}:${seed}`,
    node_id: template.node_id,
    difficulty: template.difficulty,
    form,
    prompt: rendered.prompt,
    answer: rendered.answer,
    template_id: template.template_id,
    template_params: rendered.params,
    // Omit the key entirely for untagged (assessment-only) templates rather than
    // stamping `undefined`, so a frozen item's shape is unchanged for those pools.
    ...(template.concept === undefined ? {} : { concept: template.concept }),
    hints: rendered.hints ?? [],
    worked_solution: rendered.worked_solution ?? [],
  };
}

/**
 * Freeze one instance per template into an assessment form. Each template gets a
 * distinct seed (`seedBase + index`), so Form A and Form B (different `seedBase`)
 * are structurally matched but never share surface numbers.
 */
export function freezeForm(
  templates: readonly ItemTemplate[],
  form: ItemForm,
  seedBase: number,
): FrozenItem[] {
  return templates.map((template, index) =>
    generateFromTemplate(template, form, seedBase + index),
  );
}

/**
 * Freeze the two parallel assessment forms with a guarantee that no cell's Form-B
 * item is identical to its Form-A item (a student must never see the same item at
 * pre and post). If a small parameter space collides, Form B's seed is bumped
 * deterministically until its content differs.
 */
export function freezeParallelForms(
  templates: readonly ItemTemplate[],
  seedBaseA: number,
  seedBaseB: number,
): { formA: FrozenItem[]; formB: FrozenItem[] } {
  const formA = freezeForm(templates, "A", seedBaseA);
  const formB = formA.map((aItem, index) => {
    const template = templates[index];
    if (!template) {
      throw new Error(`missing template at index ${index}`);
    }
    const aHash = hashItemDefinition(aItem);
    let seed = seedBaseB + index;
    let candidate = generateFromTemplate(template, "B", seed);
    for (
      let attempt = 0;
      attempt < 50 && hashItemDefinition(candidate) === aHash;
      attempt += 1
    ) {
      seed += 1000;
      candidate = generateFromTemplate(template, "B", seed);
    }
    return candidate;
  });
  return { formA, formB };
}

/**
 * Freeze `instancesPerCell` parallel instances per template into each of two forms
 * — the deeper counterbalanced pools the v2 walk needs. The walk's 2-of-3
 * adjudication serves up to three items for a single node in one administration,
 * so a served cell must hold ≥3 items that never repeat (a confirm never reuses a
 * probe item), and Form A (pre) must never share an item with Form B (post).
 *
 * Distinctness is global, by content hash: every frozen item is unique against
 * every other item in BOTH forms AND against `avoidHashes` (pass the existing
 * assessment + practice hashes so no authored item is ever shared across pools).
 * A colliding draw bumps the seed deterministically until it is unique. Seeds are
 * spaced `instancesPerCell`-wide per template so a bump never collides an id with
 * the next cell.
 *
 * When a template declares a `varietyKey`, instances within a single (form, node)
 * cell must ALSO be structurally distinct (distinct variety keys), not just
 * content-distinct — so a cell never freezes near-twins that differ in one param.
 */
export function freezeDeepParallelForms(
  templates: readonly ItemTemplate[],
  options: {
    instancesPerCell: number;
    seedBaseA: number;
    seedBaseB: number;
    avoidHashes?: Iterable<string>;
  },
): { formA: FrozenItem[]; formB: FrozenItem[] } {
  const { instancesPerCell, seedBaseA, seedBaseB, avoidHashes = [] } = options;
  const used = new Set<string>(avoidHashes);
  const stride = Math.max(instancesPerCell, 1) * 1000;

  const freezeSide = (form: ItemForm, seedBase: number): FrozenItem[] => {
    const items: FrozenItem[] = [];
    templates.forEach((template, index) => {
      // Per (form, node) cell: reject a candidate that repeats existing CONTENT
      // (global) or, when the template declares one, a variety key already used in
      // THIS cell (so the cell never serves structural near-twins).
      const cellVariety = new Set<string>();
      const collides = (item: FrozenItem): boolean => {
        if (used.has(hashItemDefinition(item))) {
          return true;
        }
        const variety = template.varietyKey?.(item.template_params);
        return variety !== undefined && cellVariety.has(variety);
      };
      let seed = seedBase + index * stride;
      for (let instance = 0; instance < instancesPerCell; instance += 1) {
        let candidate = generateFromTemplate(template, form, seed);
        for (let attempt = 0; attempt < 500 && collides(candidate); attempt += 1) {
          seed += 1;
          candidate = generateFromTemplate(template, form, seed);
        }
        used.add(hashItemDefinition(candidate));
        const variety = template.varietyKey?.(candidate.template_params);
        if (variety !== undefined) {
          cellVariety.add(variety);
        }
        items.push(candidate);
        seed += 1;
      }
    });
    return items;
  };

  const formA = freezeSide("A", seedBaseA);
  const formB = freezeSide("B", seedBaseB);
  return { formA, formB };
}

/** Numeric answer definition helper (exact value, permissive representation). */
export function numericAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "numeric",
      equivalence: "exact_value",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** Numeric fraction answer that must be written in lowest terms (NUM.F lesson). */
export function reducedFractionAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "numeric",
      equivalence: "exact_value",
      representation: "fraction",
      simplification: "reduced_fraction",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Expression answer definition helper (symbolic equivalence over `allowedSymbols`).
 *
 * `simplification` defaults to "combined_polynomial", which requires the response
 * be a fully expanded/combined polynomial in the checker's canonical term order
 * (coefficient·x then constant) — the right rule for "expand"/"simplify" prompts,
 * where crediting an unexpanded copy of the prompt would over-place a student.
 * Pass "none" to accept any equivalent form (e.g. pure field-property recognition).
 *
 * Authoring guard for "combined_polynomial": mathjs `simplify` factors ONLY the
 * exact `Nx + N` case (coefficient equals a positive constant), and it drops a
 * leading coefficient of 1. So keys must keep coefficient ≥ 2 and avoid an
 * identical coefficient/constant with a `+` sign. `validateTemplates` enforces
 * this by grading sampled instances through the real checker.
 */
export function expressionAnswer(
  answer_key: string,
  allowedSymbols: readonly string[],
  simplification = "combined_polynomial",
): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    answer_spec: {
      answer_type: "expression",
      equivalence: "symbolic",
      representation: "any",
      simplification,
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Expand-but-do-not-collect answers (NUM.3 L3): the response must be distributed
 * with its plain numbers combined, but repeated variable terms (`2x + 4x`) are
 * accepted, because collecting like terms is NUM.4 material. Same authoring guards
 * as `expressionAnswer` — the key itself is still authored fully combined; the
 * profile only widens what a STUDENT may submit.
 */
export function combinedConstantsAnswer(
  answer_key: string,
  allowedSymbols: readonly string[],
): D1AnswerDefinition {
  return expressionAnswer(answer_key, allowedSymbols, "combined_constants");
}

// ── Phase-2 product (v2) answer-def helpers ──────────────────────────────────
//
// The v2 product checker (`createProductAnswerChecker`, checker version 2) clears
// categories the D1 (v1) checker cannot: radicals, univariate factoring structure,
// domain-aware rationals, solution sets, ordered pairs, target polynomial form, and
// numeric precision (Answer_Equivalence_Spec §2-§6). These helpers author each
// category's `AnswerSpec` with every field set explicitly (no defaults, §13.3), so
// product templates read as cleanly as `numericAnswer`/`expressionAnswer` do for D1.

/** Numeric radical (RAD.1, CG.1 distance): exact representation, simplified radical. */
export function radicalAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "numeric",
      equivalence: "exact_value",
      representation: "exact",
      simplification: "simplified_radical",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Radical over a VARIABLE radicand (RAD.4): the same exact / `simplified_radical`
 * spec as {@link radicalAnswer}, plus the `allowed_symbols` the answer actually
 * uses.
 *
 * Declaring those symbols IS the gate that routes the item to the v2 checker's
 * variable-aware radical path (Answer_Equivalence_Spec v0.15): value by domain-aware
 * sampling, `abs` in the parse grammar, and `|x|` pipe notation rewritten before
 * parsing. A constant-radicand item authored with plain {@link radicalAnswer} still
 * declares none and so keeps the byte-identical pre-existing path.
 */
export function variableRadicalAnswer(
  answer_key: string,
  allowedSymbols: readonly string[],
): D1AnswerDefinition {
  return { ...radicalAnswer(answer_key), allowed_symbols: allowedSymbols };
}

/** Numeric with a required representation + simplification (e.g. LF.1 slope fraction). */
export function representedNumericAnswer(
  answer_key: string,
  representation: "fraction" | "decimal" | "exact",
  simplification = "none",
): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "numeric",
      equivalence: "exact_value",
      representation,
      simplification,
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** Numeric with declared rounding (EL.1 "round to the cent"): author precomputes the key. */
export function precisionAnswer(
  answer_key: string,
  precision: { mode: "decimal_places" | "sig_figs"; value: number; rounding: "half_up" },
  representation: "any" | "decimal" = "decimal",
): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "numeric",
      equivalence: "exact_value",
      representation,
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision,
      unit_policy: "none",
    },
  };
}

/**
 * An EXACT solution roster (EL.6): the members may be logarithms or square roots of
 * constants, so an equation quadratic in `e^x` can state its own answer as
 * `{ln(2), ln(3)}`. Use {@link solutionSetAnswer} for a roster of plain rationals; this
 * one declares `representation: "exact"`, which is the gate that widens the member
 * grammar, and it also makes a rounded root a wrong ANSWER rather than a near-match.
 *
 * Four authoring limits, measured against the real checker rather than assumed:
 *  - **A member's function needs its parentheses.** `ln(2)` parses and `ln 2` does not
 *    (`unknown_symbol`, because the bare token reads as a symbol times 2). Ask for the
 *    answer in a form the keypad produces, and keep the prompt's own math in `\ln(2)`
 *    shape so the learner is not copying a spelling the checker refuses.
 *  - **`log` is the COMMON logarithm and `ln` is the natural one.** They are separate
 *    values here, unlike EL.5's base-independent identity grading, so a key of
 *    `{ln(2)}` genuinely rejects `{log(2)}`. State the base in the prompt.
 *  - **A decimal member grades `wrong_representation`**, never `value_mismatch`, however
 *    many digits it carries. An item that WANTS a rounded root is not this shape: ask it
 *    as a single-answer {@link precisionAnswer} instead.
 *  - **`e` has no binding.** `{ln(2)}` is expressible; a member spelled with `e` is not.
 */
export function exactSolutionSetAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "solution_set",
      equivalence: "structural",
      representation: "exact",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** solution_set (LIN.1): a roster of values, compared order-insensitively. */
export function solutionSetAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "solution_set",
      equivalence: "structural",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Interval solution in plain interval notation (LIN.4 compound inequalities, LIN.6
 * absolute-value inequalities). Endpoints and inclusivity are both graded, and a UNION
 * of intervals is a first-class key, so the two shapes an absolute-value inequality
 * produces are both expressible: `|x-3| < 5` keys as `(-2, 8)` and `|x-3| > 5` keys as
 * `(-inf, -2) U (8, inf)`.
 *
 * Use this rather than {@link setBuilderAnswer} unless writing set-builder notation is
 * itself the skill: this path accepts a union written in either order, `U` / `or` / `∪`
 * as the join, and `inf` / `infinity` for an unbounded end, and it separates a wrong SET
 * (`value_mismatch`) from a right set with the wrong brackets (`wrong_bound_inclusivity`).
 *
 * Three authoring limits, measured against the real checker rather than assumed. All
 * three fail CLOSED as `invalid_input` (unanswered per Answer_Equivalence_Spec §12, never
 * a wrong answer), but they decide how the prompt should ask:
 *  - The union join must be WHITESPACE-delimited: `(-inf, -2) U (8, inf)` parses and
 *    `(-inf,-2)U(8,inf)` does not.
 *  - Infinity is spelled `inf` or `infinity`; `oo` is not a token.
 *  - An empty solution set has no interval spelling. An inequality with no solution has
 *    to be asked as a `solutionSetAnswer("{}")` instead, which accepts "no solution".
 */
export function intervalAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "interval",
      equivalence: "structural",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "interval",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Set-builder domain (RAT.5): `interval` graded under `required_notation: "set_builder"`,
 * so an equivalent interval-notation answer is a wrong FORM, not a wrong set. Writing the
 * form IS the skill here.
 *
 * One authoring limit comes from the comparator: it splits a condition on `or` and can
 * `and`-combine only single-interval conditions, so a `!=` (which is two intervals) cannot
 * be conjoined. `{x | x != 2}` grades; `{x | x != -3 and x != 2}` returns `wrong_notation`.
 * A domain with two holes has to be asked as an interval union instead, or split into two
 * items.
 */
export function setBuilderAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "interval",
      equivalence: "structural",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "set_builder",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** Standard-form polynomial (POL.1): symbolic equivalence + `is_standard_polynomial`. */
export function standardPolyAnswer(
  answer_key: string,
  allowedSymbols: readonly string[] = ["x"],
): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    answer_spec: {
      answer_type: "expression",
      equivalence: "symbolic",
      representation: "any",
      simplification: "none",
      required_form: "is_standard_polynomial",
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** Fully factored over the integers (POL.2): structural + `fully_factored_over_integers`. */
export function factoredAnswer(
  answer_key: string,
  allowedSymbols: readonly string[] = ["x"],
): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    answer_spec: {
      answer_type: "expression",
      equivalence: "structural",
      representation: "any",
      simplification: "none",
      required_form: "fully_factored_over_integers",
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Log expanded into a sum or difference of single-argument logs (EL.5):
 * symbolic equivalence + `is_expanded_log`. Value equivalence alone is not enough,
 * so a condensed answer is rejected `not_expanded`, and so is a partly expanded one
 * that leaves a power inside the log: `log(x^2) + log(y)` fails against
 * `2 * log(x) + log(y)`, which is exactly the power rule the node teaches.
 *
 * The checker treats `log` and `ln` as the same log function when it compares values,
 * so it cannot tell which one the learner typed. That is right for these identities,
 * which hold in every base, and it means an item must never hinge on the TOKEN: do not
 * ask for "the natural log form" and expect the base to be graded.
 */
export function expandedLogAnswer(
  answer_key: string,
  allowedSymbols: readonly string[] = ["x", "y"],
): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    answer_spec: {
      answer_type: "expression",
      equivalence: "symbolic",
      representation: "any",
      simplification: "none",
      required_form: "is_expanded_log",
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Log condensed into a single log of one argument (EL.5): the inverse of
 * {@link expandedLogAnswer}, and an expanded answer is rejected `not_condensed`.
 */
export function condensedLogAnswer(
  answer_key: string,
  allowedSymbols: readonly string[] = ["x", "y"],
): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    answer_spec: {
      answer_type: "expression",
      equivalence: "symbolic",
      representation: "any",
      simplification: "none",
      required_form: "is_condensed_log",
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Domain-aware rational answer (RAT.1): the simplified expression PLUS the
 * excluded values inherited from the ORIGINAL denominator (§3). Dropping an
 * exclusion is wrong even with a correct expression.
 */
export function rationalAnswer(
  answer_key: string,
  excludedValues: readonly string[],
  allowedSymbols: readonly string[] = ["x"],
): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    excluded_values: excludedValues,
    answer_spec: {
      answer_type: "rational_answer",
      equivalence: "structural",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** Ordered pair (CG.1 midpoint): compared as (x, y), order-sensitive. */
export function pointAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "point",
      equivalence: "structural",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** Single-select choice (FUN.1 is-a-function, LF.1 classify): exact-match key. */
export function multipleChoiceAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "multiple_choice",
      equivalence: "none",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Positive-exponent form (EXP.1): symbolic equivalence graded by numeric identity
 * (§4 `positive_exponents`). A numerically-correct answer written with a negative
 * exponent (`x^-2`) is a FORM miss (`not_simplified`), not correct.
 */
export function positiveExponentAnswer(
  answer_key: string,
  allowedSymbols: readonly string[] = ["x"],
): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: allowedSymbols,
    answer_spec: {
      answer_type: "expression",
      equivalence: "symbolic",
      representation: "any",
      simplification: "positive_exponents",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Exact special-angle trig value (TRG.2): exact representation + the simplified
 * radical structural check (§4 `canonical_exact_trig_value`). Rejects a decimal
 * approximation, a perfect-power factor under a root, and a radical denominator.
 */
export function exactTrigValueAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    answer_spec: {
      answer_type: "numeric",
      equivalence: "exact_value",
      representation: "exact",
      simplification: "canonical_exact_trig_value",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/**
 * Exact radian / pi-multiple (TRG.1): `pi` is a recognized constant, exact
 * representation rejects a decimal approximation, compared by float tolerance.
 */
export function exactRadianAnswer(answer_key: string): D1AnswerDefinition {
  return {
    answer_key,
    allowed_symbols: ["pi"],
    answer_spec: {
      answer_type: "numeric",
      equivalence: "exact_value",
      representation: "exact",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** Bundle several answer parts into one multipart item (TRG.2 angle->value table). */
export function multipartAnswer(
  parts: readonly { part_id: string; answer: D1AnswerDefinition }[],
): D1AnswerDefinition {
  return {
    parts,
    answer_spec: {
      answer_type: "multipart",
      equivalence: "none",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

// ── Interactive (widget-scored) answer-def helpers ───────────────────────────
//
// An interactive answer type (`graph`, `number_line`, ...) is scored by its
// registered `InteractiveAnswerModule` over the item's PRIVATE `interactive_spec`
// (the answer key) at `equivalence_checker_version = INTERACTIVE_CHECKER_VERSION`
// (2), never by the text checkers. The AnswerSpec carries no key fields (no
// `answer_key`, `structural` equivalence), so the client renders from the module's
// answer-free `toWorkspace(spec)` and the key stays server-side.

/** Generic interactive answer definition: the answer_type + its private spec. */
export function interactiveAnswer(
  answerType: AnswerType,
  interactiveSpec: unknown,
): D1AnswerDefinition {
  return {
    interactive_spec: interactiveSpec,
    answer_spec: {
      answer_type: answerType,
      equivalence: "structural",
      representation: "any",
      simplification: "none",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    },
  };
}

/** number_line answer definition: point/interval placement scored geometrically. */
export function numberLineAnswer(spec: NumberLineExpected): D1AnswerDefinition {
  return interactiveAnswer("number_line", spec);
}

export function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Format n/d as a reduced fraction string (denominator kept positive). */
export function reducedFraction(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator) || 1;
  const sign = denominator < 0 ? -1 : 1;
  return `${(sign * numerator) / divisor}/${Math.abs(denominator) / divisor}`;
}
