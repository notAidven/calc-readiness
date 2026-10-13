import { expressionVariable, simplifyMath } from "../../../promptFormat";
import { expressionAnswer, type ItemTemplate, type Rng } from "../../../template";
import type { GoldenFixture } from "../../golden";
import { workedSolution } from "../../hints";
import { varTerm } from "../_shared";

/** Diagnostic L2 (routing stage) — combine like terms with a subtracted constant. */
export const num4_l2: ItemTemplate = {
  template_id: "d1.num-4.l2",
  node_id: "NUM.4",
  difficulty: 2,
  concept: "combine-like-terms",
  generate(rng: Rng) {
    // Combine like terms: p*x + q*x - r -> (p+q)*x - r. The constant is
    // subtracted (never the "Nx + N" form mathjs factors) and p+q >= 4 keeps
    // the coefficient >= 2.
    const p = rng.int(2, 6);
    const q = rng.int(2, 6);
    const r = rng.int(2, 9);
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    return {
      prompt: simplifyMath(`${varTerm(p, v)} + ${varTerm(q, v)} - ${r}`),
      answer: expressionAnswer(`${p + q}*${v} - ${r}`, [v]),
      params: { p, q, r, varIndex },
      hints: [
        `The like terms are the two that carry the variable $${v}$. The constant is on its own and cannot join them.`,
        `Add the coefficients of the $${v}$-terms, then carry the constant across unchanged, sign included.`,
      ],
      worked_solution: workedSolution([
        `Add the $${v}$-coefficients: $${p} + ${q} = ${p + q}$.`,
        `Keep the constant term: $-${r}$.`,
        `Combine: $${varTerm(p + q, v)} - ${r}$.`,
      ]),
    };
  },
};

/** Diagnostic L3 (up stage) — distribute then combine. */
export const num4_l3: ItemTemplate = {
  template_id: "d1.num-4.l3",
  node_id: "NUM.4",
  difficulty: 3,
  concept: "distribute-then-combine",
  generate(rng: Rng) {
    // Distribute then combine: m(x - k) + n*x -> (m+n)*x - m*k. The constant is
    // subtracted (never the "Nx + N" factoring case); m+n >= 4 keeps the
    // coefficient >= 2 and m*k >= 4 keeps a real constant term.
    const m = rng.int(2, 4);
    const k = rng.int(2, 4);
    const n = rng.int(2, 5);
    const varIndex = rng.int(0, 3);
    const order = rng.int(0, 1);
    const v = expressionVariable(varIndex);
    const distributed = `${m}(${v} - ${k})`;
    const other = varTerm(n, v);
    const prompt = order === 1 ? `${other} + ${distributed}` : `${distributed} + ${other}`;
    return {
      prompt: simplifyMath(prompt),
      answer: expressionAnswer(`${m + n}*${v} - ${m * k}`, [v]),
      params: { m, k, n, varIndex, order },
      hints: [
        "Clear the parentheses first: the outside number multiplies both terms inside, including the one being subtracted.",
        `Then add the two $${v}$-terms together, and leave the constant as its own term.`,
      ],
      worked_solution: workedSolution([
        `Distribute: $${m}(${v} - ${k}) = ${varTerm(m, v)} - ${m * k}$.`,
        order === 1
          ? `Rewrite: $${varTerm(n, v)} + ${varTerm(m, v)} - ${m * k}$.`
          : `Rewrite: $${varTerm(m, v)} - ${m * k} + ${varTerm(n, v)}$.`,
        `Add the $${v}$-terms: $${m} + ${n} = ${m + n}$.`,
        `Result: $${varTerm(m + n, v)} - ${m * k}$.`,
      ]),
    };
  },
};

/** Practice-only L1 — combine two like terms, no constant. */
export const num4_l1: ItemTemplate = {
  template_id: "d1.num-4.l1",
  node_id: "NUM.4",
  difficulty: 1,
  generate(rng: Rng) {
    // Combine two like terms, no constant: p*x + q*x -> (p+q)*x. A monomial key
    // (no "Nx + N" factoring case), p+q >= 4 keeps the coefficient >= 2.
    const p = rng.int(2, 6);
    const q = rng.int(2, 6);
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    return {
      prompt: simplifyMath(`${varTerm(p, v)} + ${varTerm(q, v)}`),
      answer: expressionAnswer(`${p + q}*${v}`, [v]),
      params: { p, q, varIndex },
      hints: [
        `Both terms carry the variable $${v}$, so they are like terms and collapse into one term.`,
        `Add the two coefficients and keep the $${v}$ on the result.`,
      ],
      worked_solution: workedSolution([
        `Add the coefficients of the $${v}$-terms: $${p} + ${q} = ${p + q}$.`,
        `Combine: $${varTerm(p + q, v)}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L2: subtract like terms and keep a constant. */
export const num4_l2b: ItemTemplate = {
  template_id: "d1.num-4.l2b",
  node_id: "NUM.4",
  difficulty: 2,
  generate(rng: Rng) {
    // Keep p − q >= 2 (a coefficient of 1 would be dropped by the checker's
    // canonical form) and p − q ≠ r (never the factorable "Nx + N" shape).
    let p = rng.int(4, 8);
    let q = rng.int(2, 6);
    let r = rng.int(2, 9);
    while (p - q < 2 || p - q === r) {
      p = rng.int(4, 8);
      q = rng.int(2, 6);
      r = rng.int(2, 9);
    }
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    return {
      prompt: simplifyMath(`${varTerm(p, v)} - ${varTerm(q, v)} + ${r}`),
      answer: expressionAnswer(`${p - q}*${v} + ${r}`, [v]),
      params: { p, q, r, varIndex },
      hints: [
        `The two $${v}$-terms are like terms and combine, while the constant stays on its own.`,
        `Subtract the coefficients of the $${v}$-terms in the order they are written, then keep the constant beside the result.`,
      ],
      worked_solution: workedSolution([
        `Subtract the coefficients: $${p} - ${q} = ${p - q}$.`,
        `The constant $${r}$ stays as it is.`,
        `Combine: $${varTerm(p - q, v)} + ${r}$.`,
      ]),
    };
  },
};

/**
 * Extra practice shape — L3: distribute, then sort by variable part before combining.
 *
 * The cell's other shape (`d1.num-4.l3`) makes every variable term a like term, so a
 * learner who merges everything in sight still lands on its key, and slide 1 of the
 * mini-lesson ("like terms share the same variable part") is never what decides the
 * answer. Here a squared pile and a linear pile sit side by side and exactly one of them
 * cancels, so the sort IS the work: nothing may reach from one pile into the other.
 *
 * WHY THE KEY ONLY EVER HOLDS ONE VARIABLE TERM. `combined_polynomial`, which every NUM.4
 * answer must declare, reads like terms at the SYMBOL level: `hasUncombinedLikeTerms`
 * flags an answer holding two additive terms that merely MENTION the same letter, so a key
 * such as `4x^2 + 5x + 6` grades `not_simplified` and no shape whose answer keeps both a
 * squared and a linear term can be served on this node at all. One pile has to cancel.
 * That is a constraint of the checker, not a choice of the shape, and it is worth knowing
 * before designing anything else for NUM.4.
 *
 * WHICH pile cancels is what `kind` decides, and it varies for a reason. If the linear
 * pile were always the one to go, a learner would meet the linear terms disappearing every
 * single time and the habit that builds is deleting them on sight, which is the opposite of
 * the sorting this shape exists to teach. Both draws put two squared terms and two linear
 * terms in front of the learner behind the same `m(v + k)` group, so neither the group nor
 * the layout says in advance which pile will survive:
 *
 *  - `kind = 0`, the squared pile survives: two squared terms collect, while the `m·v` the
 *    group distributes meets an explicit `-m·v`. Key `(a + b)v^2 + mk`.
 *  - `kind = 1`, the linear pile survives: the `m·v` the group distributes joins an
 *    explicit `p·v`, while two squared terms of the same magnitude cancel each other.
 *    Key `(m + p)v + mk`.
 *
 * `params` carries the same keys on both draws, so the worked-solution figure reads them
 * without a special case: `kind`, `m`, `k`, `varIndex` and `order` always; `a` and `b` are
 * the two squared coefficients on `kind = 0` (with `p` recorded 0 and unused), while on
 * `kind = 1` `a` is the magnitude of the cancelling squared pair and `p` is the standalone
 * linear coefficient (with `b` recorded 0 and unused).
 *
 * Guards, held on both draws: the surviving coefficient is at least 2, so the checker's
 * canonical form does not drop it (`a + b >= 2` follows from `a, b >= 1`, and `m + p >= 3`
 * from `m >= 2`), and it never equals the constant, which is the `Nx + N` factoring case
 * `num4_l3` sidesteps by subtracting its constant.
 */
export const num4_l3b: ItemTemplate = {
  template_id: "d1.num-4.l3b",
  node_id: "NUM.4",
  difficulty: 3,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const m = rng.int(2, 4);
    const k = rng.int(2, 4);
    const constant = m * k;
    // The cancelling pile's magnitude is free: it leaves nothing behind either way.
    const a = rng.int(1, 4);
    let b = 0;
    let p = 0;
    if (kind === 1) {
      p = rng.int(1, 5);
      while (m + p === constant) {
        p = rng.int(1, 5);
      }
    } else {
      b = rng.int(1, 4);
      while (a + b === constant) {
        b = rng.int(1, 4);
      }
    }
    const varIndex = rng.int(0, 3);
    const order = rng.int(0, 1);
    const v = expressionVariable(varIndex);

    const group = `${m}(${v} + ${k})`;
    // The linear term the group hands over, on both draws.
    const fromGroup = varTerm(m, v);
    // The two squared terms as written, and the standalone linear term beside them.
    const squaredFirst = `${varTerm(a, v)}^{2}`;
    const squaredSecond = kind === 1 ? squaredFirst : `${varTerm(b, v)}^{2}`;
    const standalone = kind === 1 ? varTerm(p, v) : fromGroup;
    // Which of the two piles is subtracted is exactly which one cancels.
    const squaredJoin = kind === 1 ? "-" : "+";
    const standaloneJoin = kind === 1 ? "+" : "-";

    const prompt =
      order === 1
        ? `${group} + ${squaredFirst} ${standaloneJoin} ${standalone} ${squaredJoin} ${squaredSecond}`
        : `${squaredFirst} + ${group} ${standaloneJoin} ${standalone} ${squaredJoin} ${squaredSecond}`;
    const expanded =
      order === 1
        ? `${fromGroup} + ${constant} + ${squaredFirst} ${standaloneJoin} ${standalone} ${squaredJoin} ${squaredSecond}`
        : `${squaredFirst} + ${fromGroup} + ${constant} ${standaloneJoin} ${standalone} ${squaredJoin} ${squaredSecond}`;

    const collected = kind === 1 ? m + p : a + b;
    const answerKey =
      kind === 1 ? `${collected}*${v} + ${constant}` : `${collected}*${v}^2 + ${constant}`;
    const result =
      kind === 1
        ? `${varTerm(collected, v)} + ${constant}`
        : `${varTerm(collected, v)}^{2} + ${constant}`;

    return {
      prompt: simplifyMath(prompt),
      answer: expressionAnswer(answerKey, [v]),
      params: { kind, a, b, p, m, k, varIndex, order },
      hints: [
        "Clear the parentheses first: the number outside multiplies both terms inside the group.",
        "Then sort every term by its variable part. A squared term and a plain variable term have different variable parts, so they never join, however alike the letters look.",
        "Add the coefficients within a pile and leave the other piles alone. If a pile's coefficients add to zero, that pile drops out of the answer altogether.",
      ],
      worked_solution: workedSolution([
        `Distribute: $${group} = ${fromGroup} + ${constant}$.`,
        `Rewrite without parentheses: $${expanded}$.`,
        kind === 1
          ? `Sort by variable part: $${squaredFirst}$ and $-${squaredSecond}$ both carry $${v}^{2}$, while $${fromGroup}$ and $${standalone}$ both carry $${v}$. The two parts never mix.`
          : `Sort by variable part: $${squaredFirst}$ and $${squaredSecond}$ both carry $${v}^{2}$, while $${fromGroup}$ and $-${standalone}$ both carry $${v}$. The two parts never mix.`,
        kind === 1
          ? `Add the $${v}$ coefficients: $${m} + ${p} = ${collected}$.`
          : `Add the $${v}^{2}$ coefficients: $${a} + ${b} = ${collected}$.`,
        kind === 1
          ? `The $${v}^{2}$ terms add to zero: $${squaredFirst} - ${squaredSecond} = 0$.`
          : `The $${v}$ terms add to zero: $${fromGroup} - ${standalone} = 0$.`,
        `Result: $${result}$.`,
      ]),
    };
  },
};

/** Prerequisite-gated walk L2 (tightened, commutativity-guarded). */
export const num4_walk: ItemTemplate = {
  template_id: "d1w.num-4.l2",
  node_id: "NUM.4",
  difficulty: 2,
  generate(rng: Rng) {
    // Combine like terms: px + qx - r -> (p+q)x - r. Order p ≤ q so `px + qx`
    // can't twin `qx + px`. The constant is subtracted (never the "Nx + N" form)
    // and p + q >= 4 keeps the coefficient >= 2.
    let p = rng.int(2, 6);
    let q = rng.int(2, 6);
    if (p > q) {
      [p, q] = [q, p];
    }
    const r = rng.int(2, 9);
    return {
      prompt: `Simplify: ${p}x + ${q}x - ${r}`,
      answer: expressionAnswer(`${p + q}*x - ${r}`, ["x"]),
      params: { p, q, r },
    };
  },
  // A cell's instances must differ in the coefficient pair, not just `r`.
  varietyKey: (params) => `${params.p}:${params.q}`,
};

/** Golden fixtures for NUM.4 — combine like terms (expression). */
export const num4_golden: readonly GoldenFixture[] = [
  {
    item_version_id: "d1.golden.num-4.1",
    node_id: "NUM.4",
    prompt: "Simplify: 5x + 3x - 4",
    answer: expressionAnswer("8*x - 4", ["x"]),
    valid: "8*x - 4",
    alternate_valid: ["8x - 4", "-4 + 8x", "-4+8x"],
    // 8x + 4: sign; 8x - 12: combined the constant into x; 2x - 4: subtracted.
    near_miss: ["8x + 4", "8x - 12", "2x - 4"],
  },
  {
    item_version_id: "d1.golden.num-4.2",
    node_id: "NUM.4",
    prompt: "Simplify: 2(x - 3) + 4x",
    answer: expressionAnswer("6*x - 6", ["x"]),
    valid: "6*x - 6",
    alternate_valid: ["6x - 6", "-6 + 6x", "-6+6x"],
    // 6x + 6: sign; 2x - 6 + 4x: unsimplified; 6x - 3: didn't distribute.
    near_miss: ["6x + 6", "6x - 3", "2x - 6"],
  },
];
