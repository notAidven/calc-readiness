import { insertImplicitProductStar } from "@cr/components";
import { describe, expect, it } from "vitest";

import {
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_TEMPLATES,
  D2_PRACTICE_ITEMS,
  D2_PRACTICE_TEMPLATES,
  D3_PRACTICE_ITEMS,
  D3_PRACTICE_TEMPLATES,
  D4_PRACTICE_ITEMS,
  D4_PRACTICE_TEMPLATES,
  D5_PRACTICE_ITEMS,
  D5_PRACTICE_TEMPLATES,
  D6_PRACTICE_ITEMS,
  D6_PRACTICE_TEMPLATES,
  D7_PRACTICE_ITEMS,
  D7_PRACTICE_TEMPLATES,
  D8_PRACTICE_ITEMS,
  D8_PRACTICE_TEMPLATES,
  D9_PRACTICE_ITEMS,
  D9_PRACTICE_TEMPLATES,
  D10_PRACTICE_ITEMS,
  D10_PRACTICE_TEMPLATES,
  INTERACTIVE_PRACTICE_ITEMS,
} from "./index";
import { generateFromTemplate, type FrozenItem, type ItemTemplate } from "./template";

/**
 * THE ADDITIVITY PROOF for the juxtaposed-product change, stated over the WHOLE BANK
 * (`docs/Answer_Equivalence_Spec.md` §13.13).
 *
 * The change is one string rewrite in `prepareRawAnswer` plus the same call on the
 * `rational_answer` path, and the constraint it has to meet is exact: **no answer graded
 * `correct` may become `incorrect`, and no answer graded `incorrect` may become `correct`.**
 * The only permitted movement is an `invalid_input` becoming a real verdict.
 *
 * That was established by differential measurement before the change landed — 415,182
 * verdicts over 6,937 items (every served instance plus 16 seeded samples of every practice
 * template), each graded against a battery of 60 submissions, before and after: 12,490 moved
 * and every one of them had `invalid_input` as its source; `correct -> incorrect` was 0 and
 * `incorrect -> correct` was 0. A one-off differential cannot be a standing guard, so this
 * file pins the MECHANISM that made it true, which can be re-checked at any tip:
 *
 *  1. a string the rewrite does not change reaches the grader byte-for-byte as before, so its
 *     verdict cannot have moved; and
 *  2. every string the rewrite DOES change is one whose mathjs parse holds a call to a name
 *     outside the grammar's six — a shape `inspectAst` refuses as `invalid_input` under every
 *     `allowedFunctions` configuration the checker passes it (pinned per grammar in
 *     `packages/shared-components/src/implicitProduct.test.ts`).
 *
 * Together those two say the rewrite can only ever move an `invalid_input`, which is what
 * holds `PRODUCT_CHECKER_VERSION` at 2 and `D1_CHECKER_VERSION` at 1.
 *
 * Leg 2 needs the mathjs parse and so lives in the checker's own package, where mathjs is the
 * declared dependency and `checker-core.ts` is the only file that imports it. What lives HERE
 * is everything that needs the BANK: that no authored key moves, that the rewrite fires
 * somewhere and not everywhere, and the census of declared symbols that leg 2's fixture
 * symbol-sets are built from. The census asserts the declared alphabet by set equality, so a
 * new symbol in the bank fails here and sends its owner to the sweep over there rather than
 * letting the two lists drift apart.
 */

const SERVED: readonly FrozenItem[] = [
  ...D1_PRACTICE_ITEMS,
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
  ...D5_PRACTICE_ITEMS,
  ...D6_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D8_PRACTICE_ITEMS,
  ...D9_PRACTICE_ITEMS,
  ...D10_PRACTICE_ITEMS,
  ...INTERACTIVE_PRACTICE_ITEMS,
];

const TEMPLATES: readonly ItemTemplate[] = [
  ...D1_PRACTICE_TEMPLATES,
  ...D2_PRACTICE_TEMPLATES,
  ...D3_PRACTICE_TEMPLATES,
  ...D4_PRACTICE_TEMPLATES,
  ...D5_PRACTICE_TEMPLATES,
  ...D6_PRACTICE_TEMPLATES,
  ...D7_PRACTICE_TEMPLATES,
  ...D8_PRACTICE_TEMPLATES,
  ...D9_PRACTICE_TEMPLATES,
  ...D10_PRACTICE_TEMPLATES,
];

/**
 * The served instances plus a slice of the parameter space, seeded exactly as
 * `validateTemplates` seeds it so the samples are the same instances the validation harness
 * grades. A served pool is a frozen draw; a template can generate a shape no frozen draw
 * happens to hold, and this change is about a SHAPE.
 */
const POPULATION: readonly FrozenItem[] = [
  ...SERVED,
  ...TEMPLATES.flatMap((template) =>
    Array.from({ length: 4 }, (_unused, index) =>
      generateFromTemplate(template, "A", 900_000 + index),
    ),
  ),
];

/** The other copy of `GRAMMAR_FUNCTION_NAMES`, lower-cased for comparison. */
const GRAMMAR_FUNCTIONS: readonly string[] = [
  "sqrt",
  "nthroot",
  "cbrt",
  "abs",
  "log",
  "ln",
];

/**
 * Submissions built from each item's own key, so the corpus follows the bank rather than a
 * list somebody wrote down: the key, the key with its stars dropped (the spelling this change
 * exists for), the key with its stars turned into spaces, and the key upper-cased.
 */
function submissionsFor(item: FrozenItem): string[] {
  const key = String(item.answer.answer_key ?? "");
  if (!key) {
    return [];
  }
  return [
    key,
    key.replaceAll("*", ""),
    key.replaceAll("*", " "),
    key.toUpperCase(),
    `-(${key})`,
    `(${key}) + 1`,
    `1/${key}`,
  ];
}

/** Shapes no key produces, kept as a fixed tail so the refusals are exercised everywhere. */
const FIXED_PROBES: readonly string[] = [
  "x(x + 2)",
  "x (x + 2)",
  "X(X + 2)",
  "x(2)",
  "xy",
  "x y",
  "3xx/2",
  "f(x)",
  "sin(x)",
  "g(2)",
  "sqrt(4)",
  "abs(-3)",
  "log(2)",
  "ln(2)",
  "cbrt(8)",
  "nthRoot(8, 3)",
  "SQRT(4)",
  "nthroot(8, 3)",
  "m(a)",
  "pi(2)",
  "2pi",
  "1 1/2",
];

describe("juxtaposed products stay additive over the whole bank", () => {
  it("has a population wide enough for the sweeps below to mean anything", () => {
    expect(SERVED.length, "no served item").toBeGreaterThan(2000);
    expect(TEMPLATES.length, "no practice template").toBeGreaterThan(150);
    expect(POPULATION.length, "the swept population").toBeGreaterThan(2500);
    // Every registered domain contributes, so a pool left off the spread above fails here
    // rather than being silently outside the sweep.
    for (const prefix of ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10"]) {
      expect(
        POPULATION.filter((item) => item.template_id.split(".")[0] === prefix).length,
        `no ${prefix} item is in this sweep`,
      ).toBeGreaterThan(20);
    }
  });

  /**
   * WHAT THE REWRITE DOES, over the bank: every change it makes is the insertion of a `*`
   * immediately before a bracket, and nothing else about the string moves.
   *
   * That is the string-level half of the additivity claim, and it is the half a reader can
   * check without a parser: if the ONLY difference between what the learner typed and what the
   * grader read is a star before a bracket, then the grader read the same expression the
   * learner meant, and the shapes where mathjs would have read a call are the only ones
   * affected. The parse-level half — that such a call was already refused — is in
   * `packages/shared-components/src/implicitProduct.test.ts`.
   */
  it("only ever inserts a star before a bracket, and never anything else", () => {
    let changed = 0;
    let untouched = 0;
    for (const item of POPULATION) {
      const symbols = item.answer.allowed_symbols;
      for (const submitted of [...submissionsFor(item), ...FIXED_PROBES]) {
        const rewritten = insertImplicitProductStar(submitted, symbols);
        if (rewritten === submitted) {
          untouched += 1;
          continue;
        }
        changed += 1;
        // Deleting the inserted stars recovers the original exactly, so no other character
        // moved; and every insertion sits between a declared symbol and a bracket.
        expect(
          rewritten.replace(/(?<=[A-Za-z0-9_])\*(?=\s*\()/g, ""),
          `${item.item_version_id}: ${JSON.stringify(submitted)} was rewritten to ${JSON.stringify(rewritten)}, which is not the original plus stars before brackets`,
        ).toBe(submitted);
        for (const match of rewritten.matchAll(/([A-Za-z][A-Za-z0-9_]*)\*(?=\s*\()/g)) {
          const token = (match[1] ?? "").toLowerCase();
          expect(
            (symbols ?? []).map((symbol) => symbol.toLowerCase()),
            `${item.item_version_id}: a star was inserted after ${JSON.stringify(match[1])}, which this item does not declare as a symbol`,
          ).toContain(token);
          expect(
            GRAMMAR_FUNCTIONS,
            `${item.item_version_id}: a star was inserted after ${JSON.stringify(match[1])}, which the grammar can CALL`,
          ).not.toContain(token);
        }
      }
    }
    // Floors under BOTH halves. "Nothing was ever rewritten" satisfies the assertions above
    // while meaning the fix is absent, and "everything was rewritten" would mean the gate is
    // gone.
    expect(changed, "the rewrite never fires anywhere in the bank").toBeGreaterThanOrEqual(
      500,
    );
    expect(untouched, "the rewrite fires on everything").toBeGreaterThanOrEqual(10_000);
  });

  /**
   * NO AUTHORED KEY MOVES. Every key in the bank is written with explicit stars, so the
   * rewrite must be a no-op on all of them — otherwise an item's own answer would mean
   * something different from the day it was frozen.
   *
   * This is the assertion that catches the interval keys. `d3.lin4.compound-or.l3` keys
   * `(-inf, 2) U (8, inf)`, where `U` is an identifier standing immediately before a bracket:
   * a rewrite gated only on "not a function name" would turn it into `U*(8, inf)` and break a
   * notation the checker parses with its own reader. It survives because the rewrite also
   * requires the name to be a symbol the ITEM DECLARES, and no interval item declares `U`.
   */
  it("changes no authored answer key anywhere in the bank", () => {
    let keys = 0;
    const bracketed: string[] = [];
    for (const item of POPULATION) {
      const key = String(item.answer.answer_key ?? "");
      if (!key) {
        continue;
      }
      keys += 1;
      if (/[A-Za-z][A-Za-z0-9_]*\s*\(/.test(key)) {
        bracketed.push(key);
      }
      expect(
        insertImplicitProductStar(key, item.answer.allowed_symbols),
        `${item.item_version_id}'s own key was rewritten, so its meaning has moved`,
      ).toBe(key);
    }
    expect(keys, "no keys were inspected").toBeGreaterThan(2000);
    // A floor on the keys that actually put an identifier before a bracket, so the assertion
    // above is not passing because no key has the shape at all. `sqrt(...)`, `abs(...)`,
    // `log(...)` and the interval joins all land here.
    expect(
      bracketed.length,
      "no authored key puts an identifier before a bracket, so the no-op claim is vacuous",
    ).toBeGreaterThan(100);
  });

  /**
   * THE SAFETY CLAIM'S PRECONDITION, measured over the bank rather than assumed: no item
   * declares a symbol that is also a name the grammar can call. If one ever did, `sqrt(x)` on
   * that item would be genuinely ambiguous, and the rewrite's function-name check — which
   * deliberately wins over the declared-symbol check — is what decides it in favour of the
   * call.
   */
  it("declares no symbol that collides with a name the grammar can call", () => {
    const declared = new Map<string, number>();
    for (const item of POPULATION) {
      for (const symbol of item.answer.allowed_symbols ?? []) {
        declared.set(symbol, (declared.get(symbol) ?? 0) + 1);
      }
    }
    expect(declared.size, "no item declares any symbol").toBeGreaterThan(5);
    expect(
      [...declared.keys()].filter((symbol) =>
        GRAMMAR_FUNCTIONS.includes(symbol.toLowerCase()),
      ),
      "an item declares a symbol the grammar can also call, so `name(` on it is ambiguous and the rewrite's precedence needs re-arguing",
    ).toEqual([]);
    // The declared alphabet, so a new multi-character symbol arrives here for a decision
    // rather than silently: `xy` as a symbol and `xy` as a product cannot both be readings.
    expect([...declared.keys()].sort()).toEqual([
      "a",
      "b",
      "h",
      "m",
      "n",
      "p",
      "pi",
      "q",
      "t",
      "u",
      "v",
      "x",
      "y",
    ]);
  });
});
