/**
 * The minus a learner READS is not the minus either grader accepts.
 *
 * KaTeX paints a binary and a unary minus as U+2212 MINUS SIGN, so a coefficient copied off a
 * rendered prompt, an answer chip or a reveal carries U+2212 and not the ASCII hyphen. mathjs
 * cannot lex U+2212 at all, so every text comparator in the product checker refuses the answer
 * as `invalid_input`, and the CFU card never even reaches the checker: `gradeCfuAnswer` runs
 * `isNumericLiteral` first and answers `NUMERIC_LITERAL_NOTE` over a numeric check, which tells
 * a learner who typed the right number to type a number.
 *
 * That the glyph really reaches typed input is measured rather than argued: 21 widgets under
 * `interactive/` each carry their own `.replace(/\u2212/g, "-")` before they compare anything.
 * Each of those fixed one widget; the two CENTRAL graders — the shared product checker and this
 * app's CFU card — had no such line, so every surface that is not one of those 21 was live.
 *
 * ## What this file measures, and where the population comes from
 *
 * Both graders, because the defect is one property of two paths and fixing either alone leaves
 * the other refusing the same string:
 *
 *  - the CFU path, through {@link gradeCfuAnswer}, over every ASK IN THE TREE whose own answer
 *    contains a minus — the authored question and each computed re-ask alike, since a re-ask is
 *    served after a miss and is the worst moment to refuse a right answer for its glyph;
 *  - the practice path, through the same `practiceAuthorityChecker` the browser and the
 *    authenticated clear both grade with, over every PRODUCT-version practice item whose own
 *    canonical answer contains a minus.
 *
 * Neither population is written down. Both are derived, floored so that a resolver which stopped
 * drawing or a registry that stopped loading fails here instead of sweeping nothing, and both
 * carry a COMPOSITION assertion beside the floor: a floor constrains size and not shape, and the
 * three CFU paths this defect lives on (the numeric gate, the checker, and the accepted-list on a
 * pack with no check block) are each reachable only from their own kind of pack.
 *
 * Every claim is CONDITIONAL on the plain spelling being accepted. An ask whose own ASCII answer
 * the grader already refuses is somebody else's defect and is skipped rather than asserted on, so
 * nothing here can go red for a reason other than the glyph.
 */

import { D1_CHECKER_VERSION, PRODUCT_CHECKER_VERSION } from "@cr/components";
import {
  canonicalRawAnswer,
  checkerVersionForPracticeItem,
  type FrozenItem,
  PRACTICE_AUTHORITY_ITEMS,
  practiceAuthorityChecker,
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuSpec } from "./types";

const UNICODE_MINUS = "\u2212";

/** The same answer as the learner reads it: every ASCII hyphen repainted as KaTeX's minus. */
function asRendered(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replaceAll("-", UNICODE_MINUS);
  }
  if (Array.isArray(value)) {
    return value.map(asRendered);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, asRendered(inner)]),
    );
  }
  return value;
}

/** Is there a minus anywhere in a raw answer, whatever shape that answer has? */
function holdsMinus(value: unknown, glyph = "-"): boolean {
  if (typeof value === "string") {
    return value.includes(glyph);
  }
  if (Array.isArray(value)) {
    return value.some((inner) => holdsMinus(inner, glyph));
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some((inner) => holdsMinus(inner, glyph));
  }
  return false;
}

interface Ask {
  nodeId: string;
  cfu: LessonCfuSpec;
  index: number;
  key: string;
  /** The check's answer type, or `null` on a pack that can declare no check block. */
  answerType: string | null;
}

/**
 * Every CFU ask in the tree whose own answer carries a minus, authored and computed alike.
 *
 * Derived from `allLessons` and from each pack's resolved instances rather than from the packs
 * that happen to carry a `check` block, because refusing U+2212 is not a property of the checker:
 * a pack with no check block grades its typed answer against the accepted list, which is a second
 * grader with the same blind spot. Scoping to where the checker is reachable would leave every
 * roster CFU outside a sweep named after a defect it has.
 */
const MINUS_ASKS: Ask[] = allLessons.flatMap((lesson) => {
  const cfu = lesson.cfu;
  if (cfu === undefined) {
    return [];
  }
  return cfuInstances(cfu).flatMap((instance, index) =>
    instance.answerKey.includes("-")
      ? [
          {
            nodeId: lesson.node_id,
            cfu,
            index,
            key: instance.answerKey,
            answerType: cfu.check?.answer_type ?? null,
          },
        ]
      : [],
  );
});

/**
 * Every practice item a learner can be served whose own answer carries a minus, restricted to
 * the ones the PRODUCT (v2) checker grades.
 *
 * The restriction is a carve-out with a reason and it is asserted in both directions below: the
 * locked v1 checker recomputes historical responses, so folding a glyph there would rescore
 * answers already scored (Answer_Equivalence_Spec §13.13), and this lane changes the v2 dispatch
 * only. `D1_MINUS_ITEMS` pins what that leaves behind, so the carve-out cannot quietly become
 * permanent or quietly become empty.
 */
const PRODUCT_MINUS_ITEMS: readonly FrozenItem[] = PRACTICE_AUTHORITY_ITEMS.filter(
  (item) =>
    checkerVersionForPracticeItem(item) === PRODUCT_CHECKER_VERSION &&
    holdsMinus(canonicalRawAnswer(item.answer)),
);

const D1_MINUS_ITEMS: readonly FrozenItem[] = PRACTICE_AUTHORITY_ITEMS.filter(
  (item) =>
    checkerVersionForPracticeItem(item) === D1_CHECKER_VERSION &&
    holdsMinus(canonicalRawAnswer(item.answer)),
);

/**
 * Floors, measured at `3e3b2f54` by forcing each of them red and reading the printed count.
 *
 * The reading: 46 CFU asks in the tree answer with a minus — 10 declaring a numeric check, 1 an
 * expression check, 8 one of the other four check types, and 27 carrying no check block at all —
 * and 663 product practice items do. They are floors and not fingerprints: a domain landing
 * raises them without an edit here. What they refuse is the opposite direction, where a filter
 * stops matching and a containment assertion over an empty collection reports a clean sweep.
 *
 * `EXPRESSION_ASK_FLOOR` is 1 because the tree holds exactly one such ask today (POL.6's
 * `-10x^4`), and a floor of one is worth writing down precisely because it is that thin: it is
 * the only member standing between the checker path and having no coverage here at all.
 */
const ASK_FLOOR = 40;
const NUMERIC_ASK_FLOOR = 8;
const EXPRESSION_ASK_FLOOR = 1;
const CHECKLESS_ASK_FLOOR = 24;
const PRACTICE_ITEM_FLOOR = 600;
const D1_CARVE_OUT_FLOOR = 30;

/**
 * The two instances the plan this work came from quotes, checked by name.
 *
 * A sweep proves the class and a named instance proves the instance, and they fail differently:
 * a population that narrows takes the sweep's members away silently, where these two go red
 * saying which pack stopped keying the answer they were written for. `FUN.9` is a numeric check,
 * so it is the one the `isNumericLiteral` gate refused before any checker ran; `POL.6` is the
 * single expression check with a minus in the tree.
 */
const NAMED_INSTANCES: readonly { nodeId: string; index: number; key: string }[] = [
  { nodeId: "FUN.9", index: 0, key: "-13" },
  { nodeId: "POL.6", index: 0, key: "-10x^4" },
];

function gradePractice(item: FrozenItem, rawAnswer: unknown) {
  return practiceAuthorityChecker({
    raw_answer: rawAnswer,
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForPracticeItem(item),
  });
}

describe("the minus KaTeX paints grades as the minus a keyboard types", () => {
  it("the sweep found asks and practice items of every kind that can carry the glyph", () => {
    const numeric = MINUS_ASKS.filter((ask) => ask.answerType === "numeric");
    const expression = MINUS_ASKS.filter((ask) => ask.answerType === "expression");
    const checkless = MINUS_ASKS.filter((ask) => ask.answerType === null);
    const short: string[] = [];
    if (MINUS_ASKS.length < ASK_FLOOR) {
      short.push(
        `only ${MINUS_ASKS.length} CFU asks in the tree answer with a minus, under the floor of ${ASK_FLOOR}`,
      );
    }
    // The composition, which is the half a floor cannot state. Each of the three counts is a
    // DIFFERENT code path through `gradeCfuAnswer`: a numeric check is refused by the
    // `isNumericLiteral` gate before any checker runs, an expression check reaches the product
    // checker, and a pack with no check block is decided by the accepted list alone. A population
    // that drifted onto one of them would clear the floor above while measuring one third of the
    // defect.
    if (numeric.length < NUMERIC_ASK_FLOOR) {
      short.push(
        `only ${numeric.length} of them declare a NUMERIC check, under the floor of ${NUMERIC_ASK_FLOOR}: the gate that runs before the checker is the path with no coverage`,
      );
    }
    if (expression.length < EXPRESSION_ASK_FLOOR) {
      short.push(
        `only ${expression.length} of them declare an EXPRESSION check, under the floor of ${EXPRESSION_ASK_FLOOR}: the checker path is the one with no coverage`,
      );
    }
    if (checkless.length < CHECKLESS_ASK_FLOOR) {
      short.push(
        `only ${checkless.length} of them carry NO check block, under the floor of ${CHECKLESS_ASK_FLOOR}: the accepted-list path is the one with no coverage`,
      );
    }
    if (PRODUCT_MINUS_ITEMS.length < PRACTICE_ITEM_FLOOR) {
      short.push(
        `only ${PRODUCT_MINUS_ITEMS.length} product practice items answer with a minus, under the floor of ${PRACTICE_ITEM_FLOOR}`,
      );
    }
    expect(short.join("\n")).toBe("");
  });

  it("a CFU answer typed with the rendered minus grades as its ASCII spelling does", () => {
    const refused: string[] = [];
    let owed = 0;
    for (const ask of MINUS_ASKS) {
      const { nodeId, cfu, index, key } = ask;
      // The ASCII spelling is the standard. An ask whose own answer its own grader already
      // refuses is a different defect, and asserting on it would make this file red for a reason
      // that is not the glyph.
      if (!gradeCfuAnswer({ nodeId, cfu, index, value: key }).correct) {
        continue;
      }
      owed += 1;
      const rendered = key.replaceAll("-", UNICODE_MINUS);
      const grade = gradeCfuAnswer({ nodeId, cfu, index, value: rendered });
      if (!grade.correct) {
        refused.push(
          `${nodeId} instance ${index}: ${JSON.stringify(key)} is correct and the same answer as the prompt renders it, ${JSON.stringify(rendered)}, is refused with ${JSON.stringify(grade.note ?? grade.unreadable ?? "no note at all")}`,
        );
      }
    }
    expect(refused.join("\n")).toBe("");
    expect(owed, `${owed} CFU asks accepted their own ASCII answer`).toBeGreaterThanOrEqual(
      ASK_FLOOR,
    );
  });

  it("the two named asks accept the answer their own prompt renders", () => {
    const wrong: string[] = [];
    for (const { nodeId, index, key } of NAMED_INSTANCES) {
      const ask = MINUS_ASKS.find(
        (candidate) => candidate.nodeId === nodeId && candidate.index === index,
      );
      if (ask === undefined || ask.key !== key) {
        wrong.push(
          `${nodeId} instance ${index} no longer answers ${JSON.stringify(key)}: it answers ${JSON.stringify(ask?.key ?? "nothing with a minus in it")}, so this instance has stopped being the one that was reproduced`,
        );
        continue;
      }
      const rendered = key.replaceAll("-", UNICODE_MINUS);
      const grade = gradeCfuAnswer({ nodeId, cfu: ask.cfu, index, value: rendered });
      if (!grade.correct) {
        wrong.push(
          `${nodeId}: ${JSON.stringify(rendered)} is refused with ${JSON.stringify(grade.note ?? grade.unreadable ?? "no note at all")}`,
        );
      }
    }
    expect(wrong.join("\n")).toBe("");
  });

  it("a practice answer typed with the rendered minus grades as its ASCII spelling does", () => {
    const refused: string[] = [];
    let owed = 0;
    for (const item of PRODUCT_MINUS_ITEMS) {
      const canonical = canonicalRawAnswer(item.answer);
      if (gradePractice(item, canonical).client_correct !== true) {
        continue;
      }
      owed += 1;
      const rendered = asRendered(canonical);
      const result = gradePractice(item, rendered);
      if (result.client_correct !== true) {
        refused.push(
          `${item.item_version_id}: ${JSON.stringify(canonical)} is correct and ${JSON.stringify(rendered)} comes back ${JSON.stringify(result.reason_code)}`,
        );
      }
    }
    expect(refused.join("\n")).toBe("");
    expect(
      owed,
      `${owed} product practice items graded their own canonical answer correct`,
    ).toBeGreaterThanOrEqual(PRACTICE_ITEM_FLOOR);
    // Its own budget, because the web suite's 20s default is a limit on a jsdom RENDER and this
    // is 1326 gradings through the CAS. The cost belongs to `rationalize`, whose price on a
    // written product is super-exponential in its degree (`polyCoefficients`), so it is a
    // property of the population rather than of the sweep: trimming the population to fit a
    // render budget would be trading the thing measured for the time it takes to measure it.
  }, 120_000);

  /**
   * The additivity measurement behind the fold, rather than the argument for it.
   *
   * Folding the SUBMITTED text can only move a verdict that string identity decides, because
   * every other comparator sends the answer through mathjs, which cannot lex U+2212 in the first
   * place. `multiple_choice` is that comparator: it compares the raw answer to the key with
   * `===`. So the fold is safe exactly while no answer key carries the glyph, and that is a fact
   * about the tree which can be measured instead of assumed — if a key ever does, folding one
   * side and not the other turns a correct answer wrong.
   */
  it("no authored answer key carries the rendered minus, so folding one side is safe", () => {
    const carriers = PRACTICE_AUTHORITY_ITEMS.filter((item) =>
      holdsMinus(canonicalRawAnswer(item.answer), UNICODE_MINUS),
    ).map((item) => item.item_version_id);
    const cfuCarriers = allLessons
      .filter((lesson) => lesson.cfu?.check?.answer_key.includes(UNICODE_MINUS))
      .map((lesson) => lesson.node_id);
    expect([...carriers, ...cfuCarriers].join("\n")).toBe("");
  });

  /**
   * The carve-out, asserted in both directions so that it cannot outlive its reason.
   *
   * Red one way if the v1 population empties or is renamed away, which would leave a carve-out
   * excusing nothing while reading as though it still described something. Red the other way if
   * the v1 checker starts folding the glyph, which is the day this exception should be deleted
   * and its items moved into the sweep above rather than left sitting here.
   */
  it("the v1 practice items are a named carve-out and still exhibit the refusal", () => {
    const folded: string[] = [];
    let exhibited = 0;
    for (const item of D1_MINUS_ITEMS) {
      const canonical = canonicalRawAnswer(item.answer);
      if (gradePractice(item, canonical).client_correct !== true) {
        continue;
      }
      exhibited += 1;
      if (gradePractice(item, asRendered(canonical)).client_correct === true) {
        folded.push(item.item_version_id);
      }
    }
    expect(
      folded.join("\n"),
      "the locked v1 checker now folds U+2212, so this carve-out is stale: delete it and let these items into the sweep above",
    ).toBe("");
    expect(
      exhibited,
      `${exhibited} v1 practice items answer with a minus and grade their own answer correct`,
    ).toBeGreaterThanOrEqual(D1_CARVE_OUT_FLOOR);
  });
});
