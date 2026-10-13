/**
 * D7's four check-less CFUs, graded through the real card.
 *
 * All four LF packs grade by EXACT STRING MATCH: none carries a `cfu.check`, so `cfu.tsx`
 * takes the `accepted.has(normalize(value))` branch and no equivalence logic runs. A correct
 * answer spelled a way the author did not anticipate is therefore told "Not quite.", which is
 * a P0 by `lesson-qa`'s priority table, and `docs/qa-cfu-swarm-d5-d7.md` measured 34 of 100
 * blind-solver spellings rejected across D5 + D7.
 *
 * ## Why this file exists beside `cfuAcceptanceConvention.test.tsx`
 *
 * That sweep states the convention as a closure over the packs' own spellings under the
 * separator, fraction-command and not-equal rewrites, across all five domains. Two rewrites
 * D7 needs sit outside it, and neither gap is incidental:
 *
 *  - **The trailing `.0` decimal is excluded there deliberately**: applied to every pack it
 *    would demand spellings like `x = -4.0, 1` inside an exclusion list, which nobody types.
 *    It is an authoring judgement per pack, so it belongs in a per-domain file that knows
 *    these four answers are a slope, a constant, a liter count and a coordinate pair.
 *  - **Its rewrites are IDENTITIES on `LF.2`.** They key on a top-level separator, a fraction
 *    command or a not-equal sign, and every `LF.2` spelling is one part carrying none of the
 *    three, so that sweep can vary nothing about this pack however it is scoped. The pack
 *    carrying the round's named `y = -3x + (-1)` / `y = -3x + -1` inconsistency is exactly the
 *    pack it is silent about. `PACKS_WITH_NO_SHARED_COVERAGE` below states that as a
 *    measurement over those rewrites rather than as a claim about the other file's current
 *    text, which matters because that file is in flight and has already been rewritten once
 *    while this one was being written.
 *
 * ## The population is derived, and floored, and its composition is asserted
 *
 * `d7Lessons` is the registry `domains.ts` assembles from `content/lessons/d7/`, so a fifth
 * LF pack joins this sweep with no edit here. What is floored is the pack count and the case
 * count; what is asserted separately is that the cases are not all coming from one pack,
 * because a floor constrains size and not shape.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type CfuOutcome, LessonCfu } from "./cfu";
import { d7Lessons } from "./d7";
import type { LessonContent } from "./types";

/** The premise: with a `check` the shared checker computes equivalence and this file is moot. */
const CHECK_LESS: readonly LessonContent[] = d7Lessons.filter(
  (lesson) => lesson.cfu !== undefined && lesson.cfu.check === undefined,
);

/** A floor, not a pin: LF.1 to LF.4 today, and growth needs no edit. */
const MIN_PACKS = 4;

const OPENERS = "([{";
const CLOSERS = ")]}";
const AND = " and ";

/**
 * The separators joining the answer's PARTS: bracket depth zero only. The comma inside
 * `(2, -3)` separates the coordinates of one point and the braces in `\dfrac{-1}{2}` are a
 * fraction, so rewriting either changes the mathematics rather than the notation.
 */
function topLevelSeparators(text: string): { start: number; end: number }[] {
  const found: { start: number; end: number }[] = [];
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (OPENERS.includes(char)) {
      depth += 1;
    } else if (CLOSERS.includes(char)) {
      depth -= 1;
    } else if (depth === 0 && (char === "," || char === ";")) {
      found.push({ start: index, end: index + 1 });
    } else if (depth === 0 && text.startsWith(AND, index)) {
      found.push({ start: index, end: index + AND.length });
      index += AND.length - 1;
    }
  }
  return found;
}

function withSeparator(text: string, separator: string): string {
  const spans = topLevelSeparators(text);
  if (spans.length === 0) {
    return text;
  }
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    out += text.slice(cursor, span.start) + separator;
    cursor = span.end;
  }
  // Runs of spaces collapse: substituting "; " where ", " stood would otherwise leave a
  // double space, which the grader's normalizer strips but which reads as a typo in a report.
  return `${out}${text.slice(cursor)}`.replace(/ {2,}/g, " ");
}

/** Comma, semicolon and the word: interchangeable ways to join the parts of one answer. */
function separatorVariants(text: string): string[] {
  return [withSeparator(text, ", "), withSeparator(text, "; "), withSeparator(text, AND)];
}

/** `\frac` is the commoner command and LF.1 shipped only `\dfrac`. Pure lexical swap. */
function fractionCommandVariants(text: string): string[] {
  const out = [text];
  if (text.includes("\\dfrac")) {
    out.push(text.replaceAll("\\dfrac", "\\frac"));
  }
  if (/\\frac/.test(text.replaceAll("\\dfrac", ""))) {
    out.push(text.replaceAll("\\frac", "\\dfrac"));
  }
  return out;
}

/**
 * `y = -3x + (-1)` and `y = -3x + -1`. LF.2 accepted the parenthesised form and rejected the
 * bare one, which is the same construction with two characters removed.
 */
function negativeConstantVariants(text: string): string[] {
  const out = [text];
  const flat = text.replace(/\+\s*\(\s*(-\d+(?:\.\d+)?)\s*\)/g, "+ $1");
  if (flat !== text) {
    out.push(flat);
  }
  const wrapped = text.replace(/\+\s*(-\d+(?:\.\d+)?)(?![\d.])/g, "+ ($1)");
  if (wrapped !== text) {
    out.push(wrapped);
  }
  return out;
}

/**
 * A trailing integer also spells with `.0`: `140` and `140.0`, `- 1` and `- 1.0`.
 *
 * Scoped to the LAST number in the string and to nothing else, deliberately. That is where a
 * learner who worked in decimals puts one — it is the value they just computed or read off —
 * and widening it to every numeral in the string would demand `-15.0x + 320.0`, which is not
 * a spelling anybody produces. A fraction is excluded because `-1/2` does not become `-1/2.0`.
 */
function trailingDecimalVariants(text: string): string[] {
  const out = [text];
  const endsInInteger = /(?:^|[^\d./])(\d+)\s*$/.test(text);
  const endsInFraction = /\/\s*\d+\s*$/.test(text);
  if (endsInInteger && !endsInFraction) {
    out.push(text.replace(/(\d+)(\s*)$/, "$1.0$2"));
  }
  return out;
}

const FAMILIES = [
  fractionCommandVariants,
  negativeConstantVariants,
  trailingDecimalVariants,
  separatorVariants,
];

/** How the grader compares: `cfu.tsx` reads this through `normalizeAcceptedAnswer`. */
function normalizeLikeTheGrader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Every spelling the convention requires, to a FIXED POINT. Iterating matters: a `.0` variant
 * of a two-part answer drags its own separator variants in, and applying each family once
 * would leave exactly those combinations out.
 */
function closureOf(seeds: readonly string[]): Map<string, string> {
  const byNormalized = new Map<string, string>();
  const queue: string[] = [];
  const push = (spelling: string) => {
    const key = normalizeLikeTheGrader(spelling);
    if (key.length === 0 || byNormalized.has(key)) {
      return;
    }
    byNormalized.set(key, spelling);
    queue.push(spelling);
  };
  for (const seed of seeds) {
    push(seed);
  }
  while (queue.length > 0) {
    const next = queue.shift() as string;
    for (const family of FAMILIES) {
      for (const variant of family(next)) {
        push(variant);
      }
    }
  }
  return byNormalized;
}

/**
 * Grade one answer the way a learner is graded: mount the real card, type into the real field,
 * submit the real form. Comparing against `accepted` here would re-implement the one line
 * under test and would pass on a card that never called it. The verdict is cross-checked
 * against the visible feedback, so a case cannot pass on a callback the screen contradicts.
 */
function gradesAsCorrect(lesson: LessonContent, answer: string): boolean {
  const cfu = lesson.cfu;
  if (!cfu) {
    throw new Error(`${lesson.node_id} has no CFU`);
  }
  const results: CfuOutcome[] = [];
  const { container, unmount } = render(
    <LessonCfu
      cfu={cfu}
      nodeId={lesson.node_id}
      onResult={(outcome) => results.push(outcome)}
    />,
  );
  try {
    const field = container.querySelector('input[type="text"]');
    if (!(field instanceof HTMLInputElement)) {
      throw new Error(`${lesson.node_id}: the card rendered no answer field`);
    }
    const form = container.querySelector("form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error(`${lesson.node_id}: the card rendered no form to submit`);
    }
    fireEvent.change(field, { target: { value: answer } });
    fireEvent.submit(form);
    if (results.length !== 1) {
      throw new Error(
        `${lesson.node_id}: submitting reported ${results.length} verdicts, expected 1`,
      );
    }
    const outcome = results[0] as CfuOutcome;
    // This harness never takes a reveal, so `recalled` would mean the card believes an answer
    // was already on screen when none was. That is a defect, not a pass.
    if (outcome === "recalled") {
      throw new Error(
        `${lesson.node_id}: the card called ${answer} recalled, but no reveal was taken`,
      );
    }
    const verdict = outcome === "correct";
    const said = (container.textContent ?? "").includes("Correct! Nice work.");
    if (said !== verdict) {
      throw new Error(
        `${lesson.node_id}: the card reported ${outcome} and showed ${said} for ${answer}`,
      );
    }
    return verdict;
  } finally {
    unmount();
  }
}

/** Built before any test runs, so the table's size is a measurement and not a side effect. */
interface Case {
  node: string;
  lesson: LessonContent;
  variant: string;
}

const CASES: Case[] = [];
for (const lesson of CHECK_LESS) {
  for (const [, variant] of closureOf(lesson.cfu?.accepted ?? [])) {
    CASES.push({ node: lesson.node_id, lesson, variant });
  }
}

/** A floor. With an empty table `it.each` emits no tests and the file reports a pass. */
const MIN_CASES = 120;

/**
 * The packs the shared closure sweep reaches no case on, each with the reason, asserted in
 * BOTH directions below: an entry that starts contributing there fails, and a pack that stops
 * contributing there without being listed fails too. Without the second direction this file
 * could go on claiming to cover a gap that had closed; without the first, a listed pack could
 * sit here forever excusing nothing.
 *
 * `LF.2`: every accepted spelling is a single part with no top-level separator and no fraction
 * command, so those rewrites are identities on all of them. The not-equal rewrite is an
 * identity on all four D7 packs, none of which states an exclusion, so it is not modelled
 * below: including it could only ever add zero.
 */
const PACKS_WITH_NO_SHARED_COVERAGE = ["LF.2"] as const;

/** The shared sweep's own two rewrites, so "reaches no case there" is measured, not assumed. */
function sharedSweepCaseCount(lesson: LessonContent): number {
  const seeds = lesson.cfu?.accepted ?? [];
  const reached = new Set<string>();
  for (const seed of seeds) {
    for (const notation of fractionCommandVariants(seed)) {
      for (const spelling of [...separatorVariants(notation), notation]) {
        if (spelling !== seed) {
          reached.add(spelling);
        }
      }
    }
  }
  return reached.size;
}

/**
 * Wrong answers that must STAY wrong. Widening an accepted list can only fail in one
 * direction, so the direction has to be measured: one entry here is recovered verbatim from
 * `docs/qa-cfu-swarm-d5-d7.md` (`y = 1/3x + 17/3`, the parallel slope where perpendicular was
 * asked, which that round names as its most tempting near-miss); the rest are built from the
 * misconceptions each node's own prose warns about, and they are labelled so a reader can
 * check the mathematics rather than trust the label.
 */
const WRONG: readonly { node: string; answer: string; misconception: string }[] = [
  // LF.1: m = (3 - 7)/(5 - (-3)) = -4/8 = -1/2, decreasing.
  { node: "LF.1", answer: "1/2, increasing", misconception: "sign of the rise dropped" },
  { node: "LF.1", answer: "-2, decreasing", misconception: "run over rise, inverted" },
  {
    node: "LF.1",
    answer: "-1/2, increasing",
    misconception: "right slope, word read off the wrong sign",
  },
  {
    node: "LF.1",
    answer: "-4/2, decreasing",
    misconception: "denominator subtracted as 5 - 3",
  },
  {
    node: "LF.1",
    answer: "1/2, decreasing",
    misconception: "only one difference reversed",
  },
  // LF.2: perpendicular to y = x/3 through (-2, 5) is y = -3x - 1.
  {
    node: "LF.2",
    answer: "y = 1/3x + 17/3",
    misconception: "parallel slope, not perpendicular (swarm's named near-miss)",
  },
  {
    node: "LF.2",
    answer: "y = 3x + 11",
    misconception: "reciprocal taken, sign never changed",
  },
  {
    node: "LF.2",
    answer: "y = -3x + 11",
    misconception: "correct slope, x = 2 substituted instead of -2",
  },
  {
    node: "LF.2",
    answer: "y = -1/3x + 13/3",
    misconception: "sign changed, fraction never flipped",
  },
  { node: "LF.2", answer: "y = -3x + 1", misconception: "b solved with a sign slip" },
  // LF.3: 320 liters draining 15 per minute is -15x + 320, and 140 at x = 12.
  {
    node: "LF.3",
    answer: "15x + 320, 500",
    misconception: "draining entered as a positive rate",
  },
  {
    node: "LF.3",
    answer: "320x - 15, 3825",
    misconception: "rate and starting value swapped",
  },
  {
    node: "LF.3",
    answer: "-15x + 320, 180",
    misconception: "model right, evaluated at x = 12 as 320 - 140",
  },
  {
    node: "LF.3",
    answer: "-15x, 140",
    misconception: "starting value dropped from the model",
  },
  {
    node: "LF.3",
    answer: "-15x + 320, 155",
    misconception: "one step of the rate left uncounted",
  },
  // LF.4: 4x + 3y = -1 and 3x - 2y = 12 meet at (2, -3).
  {
    node: "LF.4",
    answer: "(-3, 2)",
    misconception: "coordinates written in the wrong order",
  },
  { node: "LF.4", answer: "(2, 3)", misconception: "sign of y lost on back-substitution" },
  { node: "LF.4", answer: "(-2, -3)", misconception: "sign of x lost" },
  {
    node: "LF.4",
    answer: "(3, -2)",
    misconception: "both coordinates from the wrong variable",
  },
  {
    node: "LF.4",
    answer: "(2, -3.5)",
    misconception: "arithmetic slip in the back-substitution",
  },
];

const MIN_WRONG = 20;

const byNode: Readonly<Record<string, LessonContent>> = Object.fromEntries(
  CHECK_LESS.map((lesson) => [lesson.node_id, lesson]),
);

describe("D7's check-less CFUs accept every equivalent spelling", () => {
  it(`grades ${CASES.length} spellings across ${CHECK_LESS.length} packs`, () => {
    expect(
      CHECK_LESS.length,
      "a D7 pack left the check-less population; this file's premise moved",
    ).toBeGreaterThanOrEqual(MIN_PACKS);
    expect(CASES.length, "the closure table shrank").toBeGreaterThanOrEqual(MIN_CASES);
    // Shape, not only size: a floor of 120 is satisfied by one pack contributing all of them.
    for (const lesson of CHECK_LESS) {
      const mine = CASES.filter((entry) => entry.node === lesson.node_id);
      expect(mine.length, `${lesson.node_id} contributes no spelling`).toBeGreaterThan(3);
    }
    console.log(
      `[d7-cfu] ${CHECK_LESS.length} packs, ${CASES.length} spellings: ` +
        CHECK_LESS.map(
          (l) =>
            `${l.node_id}=${CASES.filter((c) => c.node === l.node_id).length}` +
            `(authored ${l.cfu?.accepted.length ?? 0})`,
        ).join(", "),
    );
  });

  it("every D7 CFU is graded by exact string match, which is why this sweep is needed", () => {
    expect(CHECK_LESS.map((lesson) => lesson.node_id)).toEqual(
      d7Lessons.map((lesson) => lesson.node_id),
    );
  });

  /**
   * The gap this file covers, asserted both ways. A listed pack that starts getting cases from
   * the shared sweep fails; an unlisted pack that gets none from it fails.
   */
  it("names exactly the packs the shared closure sweep reaches no case on", () => {
    // Existence first, so this assertion is REACHABLE: behind the set equality below it could
    // only ever run on a list already known to match the tree, which is no assertion at all.
    for (const node of PACKS_WITH_NO_SHARED_COVERAGE) {
      expect(
        byNode[node],
        `${node} is a declared exception that no longer exists`,
      ).toBeDefined();
    }
    const uncovered = CHECK_LESS.filter((lesson) => sharedSweepCaseCount(lesson) === 0).map(
      (lesson) => lesson.node_id,
    );
    expect(uncovered.sort()).toEqual([...PACKS_WITH_NO_SHARED_COVERAGE].sort());
  });

  it.each(CASES)("$node accepts $variant", ({ lesson, variant }: Case) => {
    expect(
      gradesAsCorrect(lesson, variant),
      `${lesson.node_id} rejects "${variant}", which is its own accepted answer in different notation`,
    ).toBe(true);
  });
});

describe("D7's check-less CFUs still reject the misconception answers", () => {
  it(`grades ${WRONG.length} wrong answers`, () => {
    expect(WRONG.length).toBeGreaterThanOrEqual(MIN_WRONG);
    for (const lesson of CHECK_LESS) {
      expect(
        WRONG.filter((entry) => entry.node === lesson.node_id).length,
        `${lesson.node_id} has no wrong answer under test`,
      ).toBeGreaterThan(3);
    }
  });

  it.each(WRONG)("$node rejects $answer ($misconception)", ({ node, answer }) => {
    const lesson = byNode[node];
    if (!lesson) {
      throw new Error(`${node} is not a check-less D7 pack`);
    }
    expect(
      gradesAsCorrect(lesson, answer),
      `${node} ACCEPTS the wrong answer "${answer}"`,
    ).toBe(false);
  });
});
