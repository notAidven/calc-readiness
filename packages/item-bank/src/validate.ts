import {
  type AnswerChecker,
  createD1AnswerChecker,
  createInteractiveAnswerChecker,
  createProductAnswerChecker,
  D1_CHECKER_VERSION,
  type D1ItemVersion,
  INTERACTIVE_CHECKER_VERSION,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "@cr/components";
import { createD1MultistageSpec } from "@cr/diagnostic";

import { toProductItemVersions } from "./bank";
import { canonicalRawAnswer } from "./raw-answer";
import { hashItemDefinition, type ItemPackEntry } from "./schema";
import { generateFromTemplate, type ItemTemplate } from "./template";

export interface ItemBankIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
}

/**
 * Which authoritative checker the harness validates against. The default is the
 * locked D1 (v1) checker, so every existing pack validates exactly as before;
 * pass {@link PRODUCT_CHECKER_CONFIG} to validate a Phase-2 product (v2) pack
 * through `createProductAnswerChecker`.
 */
export interface CheckerConfig {
  /** The version each self-consistency probe declares (routed to that checker). */
  checkerVersion: number;
  /** Build the authoritative checker over these projected item versions. */
  checker: (itemVersions: readonly ProductItemVersion[]) => AnswerChecker;
}

/** The locked D1 (v1) harness — the default so current packs are unaffected. */
export const D1_CHECKER_CONFIG: CheckerConfig = {
  checkerVersion: D1_CHECKER_VERSION,
  // `node_id` is item-version metadata only, so the widened (string) node id is a
  // safe cast into the D1 checker's `D1NodeId`-typed registry.
  checker: (itemVersions) =>
    createD1AnswerChecker({ itemVersions: itemVersions as readonly D1ItemVersion[] }),
};

/** The Phase-2 product (v2) harness — grades radicals/factoring/rationals/etc. */
export const PRODUCT_CHECKER_CONFIG: CheckerConfig = {
  checkerVersion: PRODUCT_CHECKER_VERSION,
  checker: (itemVersions) => createProductAnswerChecker({ itemVersions }),
};

/**
 * The interactive (widget-scored) harness — grades `graph` / `number_line` items by
 * dispatching each to its {@link InteractiveAnswerModule} over the item's private
 * `interactive_spec`. It shares the product's v2 generation
 * (`INTERACTIVE_CHECKER_VERSION`); an interactive item pool self-validates against it
 * because `canonicalCorrectAnswer` reconstructs the module's canonical payload.
 */
export const INTERACTIVE_CHECKER_CONFIG: CheckerConfig = {
  checkerVersion: INTERACTIVE_CHECKER_VERSION,
  checker: (itemVersions) => createInteractiveAnswerChecker({ itemVersions }),
};

/**
 * The correct raw answer for an item, reconstructed from its definition. Moved to
 * `./raw-answer.ts` when the walk guards and the diagnostic dev skip needed the same
 * reconstruction; re-aliased here so this module's call sites read as they did.
 */
const canonicalCorrectAnswer = canonicalRawAnswer;

function isExpressionItem(entry: ItemPackEntry): boolean {
  return entry.answer.answer_spec.answer_type === "expression";
}

/** Each `$...$` span in a prose string, or the whole string when it has none. */
function mathSpans(text: string): string[] {
  // A dollar amount is authored as `\$`, so only an unescaped `$` delimits math.
  const spans = Array.from(text.matchAll(/(?<!\\)\$(.*?)(?<!\\)\$/g), (m) => m[1] ?? "");
  return spans.length > 0 ? spans : [text];
}

/**
 * Does a learner-facing string print the same thing on both sides of an `=`?
 *
 * That is the signature of a step claiming work it did not do, e.g. a "reduce"
 * step rendering "3/5 = 3/5" because the value was already in lowest terms.
 *
 * Compares within each math span rather than across the whole sentence, so the
 * surrounding prose and the `$` delimiters cannot glue themselves onto the outer
 * operands and hide the repeat. Folds `\dfrac`/`\tfrac` together so a caption's
 * inline form matches a diagram's display form, and ignores whitespace.
 * Deliberately narrow: real steps such as `\lvert 3 \rvert = 3` or `a + 0 = a`
 * differ across the `=` and stay clean. Exported so the web-side caption guard
 * applies the same rule to what the diagrams render.
 */
export function hasIdentityRestatement(text: string): boolean {
  return mathSpans(text).some((span) => {
    const sides = span
      .replace(/\\[dt]frac/g, "\\frac")
      .replace(/\s+/g, "")
      .split("=");
    return sides.some(
      (side, index) => index > 0 && side.length > 0 && side === sides[index - 1],
    );
  });
}

/**
 * Validate a set of authored item packs against the authoring invariants. Returns
 * every issue found (empty = clean). Errors must block a release; warnings flag
 * gaps to fill. Wired into CI via `validate.test.ts`.
 *
 * Note on the self-consistency check: it verifies each key satisfies its OWN spec
 * (parses, matches the declared representation/simplification/unit, uses defined
 * symbols) — not that the key is the right answer to the prompt. Prompt-vs-key
 * correctness is the job of golden fixtures (content/README).
 */
export function validateItemBank(
  entries: readonly ItemPackEntry[],
  config: CheckerConfig = D1_CHECKER_CONFIG,
): ItemBankIssue[] {
  const issues: ItemBankIssue[] = [];
  const checker = config.checker(toProductItemVersions(entries));

  // 1. Unique item-version ids.
  const seenIds = new Map<string, number>();
  for (const entry of entries) {
    seenIds.set(entry.item_version_id, (seenIds.get(entry.item_version_id) ?? 0) + 1);
  }
  for (const [id, count] of seenIds) {
    if (count > 1) {
      issues.push({
        severity: "error",
        code: "duplicate_item_version_id",
        message: `item_version_id "${id}" is used ${count} times; ids must be unique`,
      });
    }
  }

  // 2. No identical content shared between practice and assessment pools.
  const hashPools = new Map<string, Set<string>>();
  for (const entry of entries) {
    const hash = hashItemDefinition(entry);
    const pool = entry.form === "practice" ? "practice" : "assessment";
    const pools = hashPools.get(hash) ?? new Set<string>();
    pools.add(pool);
    hashPools.set(hash, pools);
  }
  for (const [hash, pools] of hashPools) {
    if (pools.has("practice") && pools.has("assessment")) {
      issues.push({
        severity: "error",
        code: "practice_assessment_reuse",
        message: `item content (hash ${hash}) appears in both a practice and an assessment pool; they must be distinct`,
      });
    }
  }

  // 3. Per-item structural + self-consistency checks.
  for (const entry of entries) {
    if (!entry.prompt.trim()) {
      issues.push({
        severity: "error",
        code: "empty_prompt",
        message: `${entry.item_version_id} has an empty prompt`,
      });
    }
    if (isExpressionItem(entry) && !entry.answer.allowed_symbols?.length) {
      issues.push({
        severity: "error",
        code: "missing_allowed_symbols",
        message: `${entry.item_version_id} is an expression item but declares no allowed_symbols`,
      });
    }
    if (
      entry.answer.answer_spec.unit_policy === "required_exact_unit" &&
      !entry.answer.accepted_units?.length
    ) {
      issues.push({
        severity: "error",
        code: "missing_accepted_units",
        message: `${entry.item_version_id} requires a unit but declares no accepted_units`,
      });
    }

    // Self-consistency: the authored key must grade correct under the checker.
    const result = checker({
      raw_answer: canonicalCorrectAnswer(entry.answer),
      item_version_id: entry.item_version_id,
      equivalence_checker_version: config.checkerVersion,
    });
    if (result.status !== "correct") {
      issues.push({
        severity: "error",
        code: "answer_key_not_correct",
        message: `${entry.item_version_id} answer key does not grade correct (status=${result.status}, reason=${result.reason_code})`,
      });
    }
  }

  // 4. Coverage: each assessment form must supply every cell the multistage spec serves.
  const spec = createD1MultistageSpec();
  const requiredCells = new Set<string>();
  for (const stage of Object.values(spec.stages)) {
    for (const slot of stage.slots) {
      requiredCells.add(`${slot.node_id}:L${slot.difficulty}`);
    }
  }
  const cellsByForm = new Map<string, Set<string>>([
    ["A", new Set()],
    ["B", new Set()],
  ]);
  for (const entry of entries) {
    const cells = cellsByForm.get(entry.form);
    if (cells) {
      cells.add(`${entry.node_id}:L${entry.difficulty}`);
    }
  }
  for (const [form, cells] of cellsByForm) {
    for (const cell of requiredCells) {
      if (!cells.has(cell)) {
        issues.push({
          severity: "error",
          code: "missing_coverage",
          message: `form ${form} is missing an item for spec cell ${cell}`,
        });
      }
    }
  }

  // 5. Parallel forms must not share an identical item in the same cell (a student
  //    must never see the same item at pre and post).
  const cellFormHashes = new Map<string, Map<string, string>>();
  for (const entry of entries) {
    if (entry.form === "practice") {
      continue;
    }
    const cell = `${entry.node_id}:L${entry.difficulty}`;
    const forms = cellFormHashes.get(cell) ?? new Map<string, string>();
    forms.set(entry.form, hashItemDefinition(entry));
    cellFormHashes.set(cell, forms);
  }
  for (const [cell, forms] of cellFormHashes) {
    if (forms.get("A") && forms.get("A") === forms.get("B")) {
      issues.push({
        severity: "error",
        code: "parallel_form_collision",
        message: `forms A and B share an identical item for cell ${cell}`,
      });
    }
  }

  return issues;
}

/**
 * Validate parameterized templates by sampling instances across seeds and
 * checking each generated item is well-formed and self-consistent (its computed
 * key grades correct through the real checker). This catches a parameter range
 * that produces a broken key BEFORE any instance is frozen into a form — the key
 * safety net that makes template-based authoring trustworthy at scale.
 */
/**
 * Validate a lesson practice pool against the locked composition (content/README:
 * a five-slot 1×L1/2×L2/2×L3 set per node) plus the pool-level invariants that
 * `validateItemBank` does not express on its own: every entry is a `practice`
 * item, ids are unique, no two items share content, each key grades correct, and
 * each node supplies exactly the expected per-difficulty counts. Cross-pool
 * (practice vs assessment) reuse is still `validateItemBank`'s job — run it over
 * the combined pack for that.
 */
export function validatePracticePool(
  entries: readonly ItemPackEntry[],
  expected: {
    nodes: readonly string[];
    mix: readonly { difficulty: number; count: number }[];
  },
  config: CheckerConfig = D1_CHECKER_CONFIG,
): ItemBankIssue[] {
  const issues: ItemBankIssue[] = [];
  const checker = config.checker(toProductItemVersions(entries));

  const seenIds = new Set<string>();
  const seenHashes = new Set<string>();
  for (const entry of entries) {
    if (entry.form !== "practice") {
      issues.push({
        severity: "error",
        code: "not_a_practice_item",
        message: `${entry.item_version_id} is in the practice pool but has form "${entry.form}"`,
      });
    }
    if (seenIds.has(entry.item_version_id)) {
      issues.push({
        severity: "error",
        code: "duplicate_item_version_id",
        message: `item_version_id "${entry.item_version_id}" is used more than once`,
      });
    }
    seenIds.add(entry.item_version_id);

    const hash = hashItemDefinition(entry);
    if (seenHashes.has(hash)) {
      issues.push({
        severity: "error",
        code: "duplicate_practice_content",
        message: `two practice items share identical content (hash ${hash}); every practice item must be distinct`,
      });
    }
    seenHashes.add(hash);

    const result = checker({
      raw_answer: canonicalCorrectAnswer(entry.answer),
      item_version_id: entry.item_version_id,
      equivalence_checker_version: config.checkerVersion,
    });
    if (result.status !== "correct") {
      issues.push({
        severity: "error",
        code: "answer_key_not_correct",
        message: `${entry.item_version_id} answer key does not grade correct (status=${result.status}, reason=${result.reason_code})`,
      });
    }
  }

  // Composition: each expected node supplies exactly the mix's per-difficulty counts.
  for (const node of expected.nodes) {
    for (const { difficulty, count } of expected.mix) {
      const actual = entries.filter(
        (entry) => entry.node_id === node && entry.difficulty === difficulty,
      ).length;
      if (actual !== count) {
        issues.push({
          severity: "error",
          code: "practice_composition_mismatch",
          message: `node ${node} has ${actual} L${difficulty} practice items, expected ${count}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Validate the v2 walk assessment pool against the walk's serving invariants —
 * distinct from `validateItemBank`, whose coverage check is bound to the MST spec
 * cells (L1/L2/L3), which the walk (L2-only, difficulty-agnostic) does not fill.
 *
 * Checks: every entry is an assessment item with a unique id and a self-consistent
 * key; each served (form, node) holds ≥ `minItemsPerCell` items with DISTINCT
 * content (so the 2-of-3 rule never repeats a probe); and Form A shares no item
 * content with Form B for any node (a student never sees a pre item at post).
 * Cross-pool reuse (walk vs practice vs v1) is still `validateItemBank`'s
 * hash-pool job — run it over the combined pack for that.
 */
export function validateWalkPool(
  entries: readonly ItemPackEntry[],
  expected: { nodes: readonly string[]; minItemsPerCell: number },
  config: CheckerConfig = D1_CHECKER_CONFIG,
): ItemBankIssue[] {
  const issues: ItemBankIssue[] = [];
  const checker = config.checker(toProductItemVersions(entries));

  const seenIds = new Set<string>();
  // (form, node) -> set of distinct content hashes it serves.
  const hashesByCell = new Map<string, Set<string>>();
  // node -> form -> set of content hashes (for the A∩B disjointness check).
  const hashesByNodeForm = new Map<string, Map<string, Set<string>>>();

  for (const entry of entries) {
    if (entry.form === "practice") {
      issues.push({
        severity: "error",
        code: "not_an_assessment_item",
        message: `${entry.item_version_id} is in the walk pool but has form "practice"`,
      });
      continue;
    }
    if (seenIds.has(entry.item_version_id)) {
      issues.push({
        severity: "error",
        code: "duplicate_item_version_id",
        message: `item_version_id "${entry.item_version_id}" is used more than once`,
      });
    }
    seenIds.add(entry.item_version_id);

    const hash = hashItemDefinition(entry);
    const cellKey = `${entry.form}:${entry.node_id}`;
    const cellHashes = hashesByCell.get(cellKey) ?? new Set<string>();
    cellHashes.add(hash);
    hashesByCell.set(cellKey, cellHashes);

    const forms = hashesByNodeForm.get(entry.node_id) ?? new Map<string, Set<string>>();
    const formHashes = forms.get(entry.form) ?? new Set<string>();
    formHashes.add(hash);
    forms.set(entry.form, formHashes);
    hashesByNodeForm.set(entry.node_id, forms);

    const result = checker({
      raw_answer: canonicalCorrectAnswer(entry.answer),
      item_version_id: entry.item_version_id,
      equivalence_checker_version: config.checkerVersion,
    });
    if (result.status !== "correct") {
      issues.push({
        severity: "error",
        code: "answer_key_not_correct",
        message: `${entry.item_version_id} answer key does not grade correct (status=${result.status}, reason=${result.reason_code})`,
      });
    }
  }

  // Depth: each served (form, node) holds ≥ minItemsPerCell distinct items.
  for (const node of expected.nodes) {
    for (const form of ["A", "B"]) {
      const distinct = hashesByCell.get(`${form}:${node}`)?.size ?? 0;
      if (distinct < expected.minItemsPerCell) {
        issues.push({
          severity: "error",
          code: "insufficient_walk_depth",
          message: `form ${form} node ${node} has ${distinct} distinct items, needs ≥${expected.minItemsPerCell} for the 2-of-3 rule`,
        });
      }
    }
  }

  // No pre/post reuse: A and B must not share any item content for a node.
  for (const [node, forms] of hashesByNodeForm) {
    const a = forms.get("A");
    const b = forms.get("B");
    if (a && b) {
      for (const hash of a) {
        if (b.has(hash)) {
          issues.push({
            severity: "error",
            code: "parallel_form_collision",
            message: `walk forms A and B share an identical item (hash ${hash}) for node ${node}`,
          });
          break;
        }
      }
    }
  }

  return issues;
}

export function validateTemplates(
  templates: readonly ItemTemplate[],
  samplesPerTemplate = 25,
  config: CheckerConfig = D1_CHECKER_CONFIG,
): ItemBankIssue[] {
  const issues: ItemBankIssue[] = [];

  for (const template of templates) {
    const samples = Array.from({ length: samplesPerTemplate }, (_unused, index) =>
      generateFromTemplate(template, "A", 900_000 + index),
    );
    const checker = config.checker(toProductItemVersions(samples));

    for (const sample of samples) {
      if (
        sample.node_id !== template.node_id ||
        sample.difficulty !== template.difficulty
      ) {
        issues.push({
          severity: "error",
          code: "template_metadata_mismatch",
          message: `${template.template_id} produced an instance with node ${sample.node_id}/L${sample.difficulty}, expected ${template.node_id}/L${template.difficulty}`,
        });
      }
      const result = checker({
        // Use the canonical raw answer (structured for rational_answer, §3) rather
        // than the bare `answer_key`, so every product category is sampled correctly.
        raw_answer: canonicalCorrectAnswer(sample.answer),
        item_version_id: sample.item_version_id,
        equivalence_checker_version: config.checkerVersion,
      });
      if (result.status !== "correct") {
        issues.push({
          severity: "error",
          code: "template_instance_not_correct",
          message: `${template.template_id} instance does not grade correct (status=${result.status}, reason=${result.reason_code}); params=${JSON.stringify(sample.template_params)}`,
        });
      }

      // Hint / worked-solution invariants (Mastery_Scoring_Spec §4): up to three
      // progressive hints (at least one; fewer than three only when a problem has no
      // further non-revealing step), every hint and the solution non-empty, and no
      // hint leaks the final answer key (the automatable half of "hints never state
      // the answer"). Only practice templates author hints; assessment-only templates
      // (v1 forms / v2 walk / product) carry none, so skip the checks for them.
      const authoredHintContent =
        sample.hints.length > 0 || sample.worked_solution.length > 0;
      if (authoredHintContent && (sample.hints.length < 1 || sample.hints.length > 3)) {
        issues.push({
          severity: "error",
          code: "hint_count_mismatch",
          message: `${template.template_id} produced ${sample.hints.length} hints (expected 1 to 3)`,
        });
      }
      if (authoredHintContent && sample.hints.some((hint) => !hint.trim())) {
        issues.push({
          severity: "error",
          code: "empty_hint",
          message: `${template.template_id} produced an empty hint`,
        });
      }
      if (
        authoredHintContent &&
        (sample.worked_solution.length === 0 ||
          sample.worked_solution.some((step) => !step.trim()))
      ) {
        issues.push({
          severity: "error",
          code: "empty_worked_solution",
          message: `${template.template_id} produced an empty worked-solution step`,
        });
      }
      // A step is written once but rendered for every draw, so one phrased as
      // "now reduce" claims work that never happened whenever the value arrived
      // already reduced, and prints itself twice ("3/5 = 3/5"). Author those
      // conditionally instead (see `d1.num-f.l1`).
      if (authoredHintContent) {
        const restated = sample.worked_solution.find((step) =>
          hasIdentityRestatement(step),
        );
        if (restated) {
          issues.push({
            severity: "error",
            code: "worked_solution_identity_step",
            message: `${template.template_id} worked-solution step restates itself across "=": ${restated}; params=${JSON.stringify(sample.template_params)}`,
          });
        }
      }
      const normalizedKey =
        typeof sample.answer.answer_key === "string"
          ? sample.answer.answer_key.replace(/\s+/g, "").toLowerCase()
          : "";
      if (authoredHintContent && normalizedKey) {
        // Match the answer key only as a standalone value: digit boundaries stop
        // a short numeric key ("10") from matching inside a larger number that a
        // hint legitimately mentions (e.g. "out of 100").
        const escaped = normalizedKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const leakPattern = new RegExp(`(?<!\\d)${escaped}(?!\\d)`);
        if (
          sample.hints.some((hint) =>
            leakPattern.test(hint.replace(/\s+/g, "").toLowerCase()),
          )
        ) {
          issues.push({
            severity: "error",
            code: "hint_leaks_answer",
            message: `${template.template_id} hint contains the answer key "${sample.answer.answer_key}"; params=${JSON.stringify(sample.template_params)}`,
          });
        }
      }
    }
  }

  return issues;
}
