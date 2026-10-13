/**
 * The CFU card refuses correct answers because its FORMAT GATES run before its accepted list.
 *
 * `gradeCfuAnswer` consults two format gates — the numeric-literal gate and the lowest-terms
 * gate — and only reaches `acceptedByForm` afterwards. So on a pack declaring
 * `answer_type: "numeric"`, any spelling `isNumericLiteral` cannot read is refused *even when
 * the pack itself lists it in `cfu.accepted`*, and the note the learner is shown says
 * "Enter your final answer as a single number ... not the expression." over an answer that is
 * a single number. #735 folded U+2212 ahead of the same gates, which fixed one GLYPH; the
 * ordering itself was never addressed, so the class stayed open.
 *
 * Four shapes fall through it, and every one of them is a right answer told it is wrong:
 *
 *  - a form the pack ADVERTISES, `-\dfrac{7}{25}` on TRG.9, which is what a learner copying the
 *    fraction off the rendered prompt produces;
 *  - a fraction with spaces around the slash, `1 / 3`, which the two predicates in
 *    `answerFormat.ts` disagree about: `isNumericLiteral` writes `\d+\/\d+` and
 *    `isReducedFraction` writes `\s*\/\s*` two dozen lines below it;
 *  - a trailing decimal point, `5.` where `5.0` is accepted;
 *  - a leading plus, `+3` on RAT.6, which has no check block at all and so refuses with
 *    `note: null` — the learner gets the card's generic miss line and nothing to act on.
 *
 * ## The two populations, and why neither is written down
 *
 * The population is every rendered instance of every pack in the all-domains registry, authored
 * ask and computed re-ask alike, because the defect is not a property of one pack's list: it is
 * a property of the ORDER `gradeCfuAnswer` asks its questions in, and every pack goes through
 * that order. The PRACTICE half of the terminal-period rule is the same claim on the other
 * surface and is asserted in `packages/item-bank/src/terminalPeriodPractice.test.ts`, because a
 * rule about punctuation that holds on one surface and not the other is the inconsistency rather
 * than a fix.
 *
 * It is derived, floored so a resolver that stopped drawing fails here instead of
 * sweeping nothing, and carries a COMPOSITION assertion beside the floor: a floor constrains
 * size and not shape, and the three CFU code paths this defect lives on — the numeric gate, the
 * checker, and the accepted list on a pack with no check block — are each reachable only from
 * their own kind of pack. A population that drifted onto one of them would clear the floor while
 * measuring a third of the defect.
 *
 * Every claim is CONDITIONAL on the plain spelling being graded correct. An ask whose own
 * canonical answer the grader already refuses is a different defect and is asserted on
 * separately (`CANONICAL`, below) rather than silently carried into the probes, so nothing here
 * can go red for a reason other than the spelling under test.
 */

import { describe, expect, it } from "vitest";

import {
  cfuNotation,
  isNumericLiteral,
  isReducedFraction,
  NUMERIC_LITERAL_NOTE,
  REDUCED_FRACTION_NOTE,
} from "./answerFormat";
import { gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuSpec } from "./types";

interface Ask {
  nodeId: string;
  cfu: LessonCfuSpec;
  index: number;
  /** The answer as the reveal prints it and the learner is asked to type it. */
  key: string;
  accepted: readonly string[];
  /** The check's answer type, or `null` on a pack that carries no check block. */
  answerType: string | null;
  simplification: string | null;
  hasCheck: boolean;
}

/** Every rendered CFU instance in the tree, authored ask and computed re-ask alike. */
const ASKS: readonly Ask[] = allLessons.flatMap((lesson) => {
  const cfu = lesson.cfu;
  if (cfu === undefined) {
    return [];
  }
  return cfuInstances(cfu).map((instance, index) => ({
    nodeId: lesson.node_id,
    cfu,
    index,
    key: instance.answerKey,
    accepted: instance.accepted,
    answerType: cfu.check?.answer_type ?? null,
    simplification: cfu.check?.simplification ?? null,
    hasCheck: cfu.check !== undefined,
  }));
});

function grade(ask: Ask, value: string) {
  return gradeCfuAnswer({ nodeId: ask.nodeId, cfu: ask.cfu, index: ask.index, value });
}

/** How a refusal reads in a failure message: the verdict AND the line the learner is shown. */
function refusal(ask: Ask, submitted: string): string {
  const verdict = grade(ask, submitted);
  return `${ask.nodeId}[${ask.index}] (key "${ask.key}") refuses "${submitted}" with note ${
    verdict.note === null
      ? "null, so the card shows only its generic miss line"
      : `"${verdict.note}"`
  }`;
}

/**
 * Floors, and the composition beside them.
 *
 * Read off the printed counts once the sweep was green rather than copied from a report: 124
 * rendered instances over 62 packs, 46 of them declaring a numeric check, 56 carrying no check
 * block, 8 declaring `reduced_fraction`, and 36,112 advertised forms across all of them. They
 * are floors, not fingerprints — a domain landing raises them with no edit here — and what they
 * refuse is the other direction, where a filter stops matching and a sweep over nothing reports
 * clean.
 */
const ASK_FLOOR = 120;
const NUMERIC_ASK_FLOOR = 40;
const CHECKLESS_ASK_FLOOR = 50;
const REDUCED_FRACTION_ASK_FLOOR = 8;
const STRUCTURED_ASK_FLOOR = 10;
const ADVERTISED_FORM_FLOOR = 30_000;

const NUMERIC_ASKS = ASKS.filter((ask) => ask.answerType === "numeric");
const CHECKLESS_ASKS = ASKS.filter((ask) => !ask.hasCheck);
const REDUCED_FRACTION_ASKS = ASKS.filter(
  (ask) => ask.simplification === "reduced_fraction",
);
/** Asks whose answer is not a bare number, which is where the parity gap runs the OTHER way. */
const STRUCTURED_ASKS = ASKS.filter(
  (ask) => !/^[+-]?(\d+(\.\d+)?|\.\d+|\d+\s*\/\s*\d+)$/.test(ask.key),
);

describe("the CFU population this sweep runs over", () => {
  it("is derived, floored, and composed of every path the gates sit in front of", () => {
    expect(
      ASKS.length,
      `only ${ASKS.length} rendered CFU instances, under the floor of ${ASK_FLOOR}: the registry or the instance resolver stopped producing them`,
    ).toBeGreaterThanOrEqual(ASK_FLOOR);
    // The composition a floor cannot state. Each count is a DIFFERENT branch of
    // `gradeCfuAnswer`: the numeric gate, the lowest-terms gate, the accepted list as the whole
    // decision, and the checker.
    expect(
      NUMERIC_ASKS.length,
      `only ${NUMERIC_ASKS.length} asks declare a numeric check, under ${NUMERIC_ASK_FLOOR}: the numeric gate is the path with no coverage`,
    ).toBeGreaterThanOrEqual(NUMERIC_ASK_FLOOR);
    expect(
      CHECKLESS_ASKS.length,
      `only ${CHECKLESS_ASKS.length} asks carry no check block, under ${CHECKLESS_ASK_FLOOR}: the accepted-list-only path is the one with no coverage`,
    ).toBeGreaterThanOrEqual(CHECKLESS_ASK_FLOOR);
    expect(
      REDUCED_FRACTION_ASKS.length,
      `only ${REDUCED_FRACTION_ASKS.length} asks declare reduced_fraction, under ${REDUCED_FRACTION_ASK_FLOOR}: the lowest-terms gate is the path with no coverage`,
    ).toBeGreaterThanOrEqual(REDUCED_FRACTION_ASK_FLOOR);
    expect(
      STRUCTURED_ASKS.length,
      `only ${STRUCTURED_ASKS.length} asks answer with something other than a bare number, under ${STRUCTURED_ASK_FLOOR}: the trailing-period rule would be measured on one shape of key only`,
    ).toBeGreaterThanOrEqual(STRUCTURED_ASK_FLOOR);
  });

  /**
   * The conditional every probe below rests on. If a pack's own canonical answer is refused,
   * that is a defect of its own and the probes over that pack would go red for the wrong reason.
   */
  it("grades every instance's own canonical answer correct", () => {
    const refused = ASKS.filter((ask) => !grade(ask, ask.key).correct).map((ask) =>
      refusal(ask, ask.key),
    );
    expect(refused).toEqual([]);
  });
});

describe("a spelling the pack itself advertises is graded correct", () => {
  /**
   * The sharpest form of the ordering defect: the string was typed into `cfu.accepted` by the
   * author, so the pack has promised to take it, and the gate in front of the list refuses it
   * anyway. Measured at `3fbe5fcb`, exactly 12 of 36,112 advertised forms failed — all on a
   * computed re-ask, all on the four `reduced_fraction` packs, all of them LaTeX fractions.
   */
  it("over every form in every instance's accepted list", () => {
    const refused: string[] = [];
    let graded = 0;
    for (const ask of ASKS) {
      for (const form of ask.accepted) {
        graded += 1;
        if (!grade(ask, form).correct) {
          refused.push(refusal(ask, form));
        }
      }
    }
    expect(
      graded,
      `only ${graded} advertised forms graded, under the floor of ${ADVERTISED_FORM_FLOOR}: the accepted lists stopped resolving`,
    ).toBeGreaterThanOrEqual(ADVERTISED_FORM_FLOOR);
    expect(refused).toEqual([]);
  });
});

/**
 * Moving the list ahead of the gates is a change to a GUARD as much as a fix, so it owes the
 * same evidence: the two gates still have to refuse what they were written to refuse, and the
 * lists still have to hold nothing they were relied on to exclude.
 *
 * The lowest-terms gate is the load-bearing one. `cfuVariants.ts` turned `unreduced` OFF on all
 * four `reduced_fraction` spellers *because* the gate ran first, recording that widening the
 * list and narrowing the checker "cannot both apply". The reorder is only safe while the first
 * half of that is still true, so it is measured here in the direction that fails if a speller
 * ever turns the flag back on.
 */
describe("the format gates still bite behind the list", () => {
  /** `1/2` scaled to `2/4`: the unreduced spelling of the same number. */
  function scaledBy(key: string, factor: number): string | null {
    const match = key.trim().match(/^([+-]?\d+)\/(\d+)$/);
    if (!match) {
      return null;
    }
    return `${Number(match[1]) * factor}/${Number(match[2]) * factor}`;
  }

  it("no reduced_fraction pack advertises an unreduced spelling for the reorder to let through", () => {
    expect(
      REDUCED_FRACTION_ASKS.length,
      "no ask declares reduced_fraction, so this measures nothing",
    ).toBeGreaterThanOrEqual(REDUCED_FRACTION_ASK_FLOOR);
    const carried: string[] = [];
    for (const ask of REDUCED_FRACTION_ASKS) {
      for (const form of ask.accepted) {
        if (/^[+-]?\d+\s*\/\s*\d+$/.test(form) && !isReducedFraction(form)) {
          carried.push(
            `${ask.nodeId}[${ask.index}] advertises the unreduced "${form}", so the list now accepts what the lowest-terms gate was refusing`,
          );
        }
      }
    }
    expect(carried).toEqual([]);
  });

  it("and the lowest-terms gate still refuses an unreduced answer, with its own note", () => {
    let judged = 0;
    const taken: string[] = [];
    for (const ask of REDUCED_FRACTION_ASKS) {
      const unreduced = scaledBy(ask.key, 3);
      if (unreduced === null || unreduced === ask.key) {
        continue;
      }
      judged += 1;
      const verdict = grade(ask, unreduced);
      if (verdict.correct || verdict.note !== REDUCED_FRACTION_NOTE) {
        taken.push(
          `${ask.nodeId}[${ask.index}] (key "${ask.key}") answers "${unreduced}" as ${
            verdict.correct
              ? "correct"
              : `incorrect with note ${JSON.stringify(verdict.note)}`
          }`,
        );
      }
    }
    expect(
      judged,
      "no unreduced spelling was tried, so the gate is unmeasured",
    ).toBeGreaterThan(4);
    expect(taken).toEqual([]);
  });

  it("and the numeric gate still refuses the expression it was written for", () => {
    expect(
      NUMERIC_ASKS.length,
      "no numeric ask, so the gate is unmeasured",
    ).toBeGreaterThanOrEqual(NUMERIC_ASK_FLOOR);
    const taken: string[] = [];
    for (const ask of NUMERIC_ASKS) {
      // An expression no pack lists, so the only thing that can accept it is a gate that
      // stopped running. It is deliberately not equal to any key: what the gate refuses is the
      // SHAPE, and a learner handing back `2 + 3 * 4` has not computed anything.
      const verdict = grade(ask, "2 + 3 * 4");
      if (verdict.correct || verdict.note !== NUMERIC_LITERAL_NOTE) {
        taken.push(
          `${ask.nodeId}[${ask.index}] answers "2 + 3 * 4" as ${
            verdict.correct
              ? "correct"
              : `incorrect with note ${JSON.stringify(verdict.note)}`
          }`,
        );
      }
    }
    expect(taken).toEqual([]);
  });
});

describe("the three spellings the numeric gate cannot read", () => {
  /** Asks whose answer is a bare fraction, so the spaced spelling is available to probe. */
  const FRACTION_ASKS = ASKS.filter((ask) => /^[+-]?\d+\/\d+$/.test(ask.key));

  it("a fraction with spaces around the slash", () => {
    expect(
      FRACTION_ASKS.length,
      "no ask answers with a bare fraction, so this probe measures nothing",
    ).toBeGreaterThanOrEqual(REDUCED_FRACTION_ASK_FLOOR);
    const refused = FRACTION_ASKS.filter(
      (ask) => !grade(ask, ask.key.replace("/", " / ")).correct,
    ).map((ask) => refusal(ask, ask.key.replace("/", " / ")));
    expect(refused).toEqual([]);
  });

  /**
   * The two predicates in `answerFormat.ts` have to agree about the spaces, or the gate goes
   * on refusing what the gate behind it tolerates.
   */
  it("and the two predicates agree that it is one", () => {
    expect(isNumericLiteral("1 / 3"), "isNumericLiteral refuses a spaced fraction").toBe(
      true,
    );
    expect(isReducedFraction("1 / 3"), "isReducedFraction refuses a spaced fraction").toBe(
      true,
    );
  });

  it("a trailing decimal point on every instance in the tree", () => {
    const refused = ASKS.filter((ask) => !grade(ask, `${ask.key}.`).correct).map((ask) =>
      refusal(ask, `${ask.key}.`),
    );
    expect(refused).toEqual([]);
  });

  it("and the pre-submit gate the practice surfaces share admits both", () => {
    // `LessonPractice`, `InfiniteDrill` and `EraAdvanceCeremony` all gate on this predicate
    // BEFORE any checker runs, so a rule that lives only in `gradeCfuAnswer` reaches one of
    // the four surfaces the learner meets.
    expect(isNumericLiteral("5."), "isNumericLiteral refuses a trailing point").toBe(true);
    expect(isNumericLiteral("+3"), "isNumericLiteral refuses a leading plus").toBe(true);
    expect(isNumericLiteral("2 + 3"), "isNumericLiteral admits an expression").toBe(false);
    expect(isNumericLiteral("."), "isNumericLiteral admits a bare point").toBe(false);
  });
});

describe("a leading plus is a sign and not an expression", () => {
  /** Asks whose answer is a bare positive number, which is the only shape `+` applies to. */
  const POSITIVE_ASKS = ASKS.filter((ask) => /^\d+(\.\d+)?(\/\d+)?$/.test(ask.key));

  it("on every ask whose answer is a bare positive number", () => {
    expect(
      POSITIVE_ASKS.length,
      "no ask answers with a bare positive number, so this probe measures nothing",
    ).toBeGreaterThan(10);
    // The composition that matters here: an exact-match pack bypasses the numeric gate
    // entirely, so the fix has to live in the accepted-list comparison and not in the gate.
    expect(
      POSITIVE_ASKS.filter((ask) => !ask.hasCheck).length,
      "no exact-match pack answers with a bare positive number, so the accepted-list path is unmeasured",
    ).toBeGreaterThan(0);
    const refused = POSITIVE_ASKS.filter((ask) => !grade(ask, `+${ask.key}`).correct).map(
      (ask) => refusal(ask, `+${ask.key}`),
    );
    expect(refused).toEqual([]);
  });
});

describe("an exact-match pack says something when it refuses", () => {
  /**
   * The 28 packs with no check block return `note: null` on every refusal, so the card falls
   * back to its generic miss line and a learner is told nothing about the one thing that is
   * different about these packs: they are graded on how the answer is WRITTEN. The population
   * is the check-less asks whose field already names a notation, because a note pointing at a
   * notation line that says only "Your answer" would point at nothing.
   */
  const NOTATION_ASKS = CHECKLESS_ASKS.filter(
    (ask) => cfuNotation(undefined, ask.accepted) !== "none",
  );

  it("over every check-less ask whose field names a notation", () => {
    expect(
      NOTATION_ASKS.length,
      "no check-less ask names a notation, so this measures nothing",
    ).toBeGreaterThan(20);
    const silent = NOTATION_ASKS.filter(
      (ask) => grade(ask, "not the answer at all").note === null,
    ).map((ask) => `${ask.nodeId}[${ask.index}] refuses with note null`);
    expect(silent).toEqual([]);
  });

  /** And it must not claim the value was right: these packs never learn whether it was. */
  it("without telling the learner their value was correct", () => {
    for (const ask of NOTATION_ASKS.slice(0, 8)) {
      const note = grade(ask, "not the answer at all").note ?? "";
      expect(note.toLowerCase(), `${ask.nodeId}[${ask.index}]`).not.toContain(
        "the value is right",
      );
    }
  });
});

/**
 * THE PRACTICE HALF of the terminal-period rule lives in
 * `packages/item-bank/src/terminalPeriodPractice.test.ts`, not here.
 *
 * It is the same claim about the same punctuation and it belongs beside this file, but it grades
 * ~1,800 items through the real product comparator and this project is the jsdom one: the same
 * sweep is minutes here and seconds in the node project that owns the pool. Cross-referenced in
 * both directions so neither half can be read as the whole rule.
 */
