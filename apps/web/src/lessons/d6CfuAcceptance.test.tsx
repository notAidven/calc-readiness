/**
 * D6 CFU acceptance, both directions, through the real card.
 *
 * Mirrors `d5CfuAcceptance.test.tsx`: every spelling a pack lists as accepted has to grade
 * CORRECT when it is typed into the card a learner is given, and every answer a named
 * misconception produces has to keep grading WRONG. Widening an accepted list can only fail
 * in one direction, so the other direction is measured rather than argued.
 *
 * Grading goes through `LessonCfu` -- mount, type, submit -- rather than through
 * `accepted.has(...)`. Comparing against the pack's own list here would re-implement the one
 * line under test and would pass on a card that never called it, so the verdict is taken
 * from the card's callback AND cross-checked against what the card puts on screen.
 *
 * ## The population
 *
 * Derived from `d6Lessons`, the registry `d6.ts` assembles from `content/lessons/d6/`, so a
 * twelfth pack joins this sweep with no edit here. Three floors sit under it -- the pack
 * count, the accepted-spelling count and the misconception count -- and beside them a census
 * that fails in BOTH directions: a pack with no misconception list fails, and a listed node
 * that is no longer a D6 pack fails. A floor constrains size and not shape, so there is also
 * a per-pack floor: one pack cannot supply the whole count while another supplies nothing.
 *
 * Eight of the eleven packs carry no `cfu.check` and so grade by exact string match, where
 * an unanticipated spelling is a P0 wrong-answer verdict on a correct answer. The other
 * three (FUN.6, FUN.7, FUN.9) route through the shared checker. Both kinds are swept here,
 * because the obligation -- accept what is right, reject what is wrong -- is the same and it
 * is the pack, not the grading path, that decides which answers those are.
 *
 * Three re-ask quality properties of these same checks are asserted in `cfuVariants.test.ts`
 * (FUN.10 rotating max against min, FUN.5 drawing rates of opposite sign, FUN.4 putting its
 * extremum at an endpoint). They are about what a RE-ASK serves and are not repeated here.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type CfuOutcome, LessonCfu } from "./cfu";
import { gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { d6Lessons } from "./d6";
import type { LessonContent } from "./types";

function grade(lesson: LessonContent, answer: string): boolean {
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
    const form = container.querySelector("form");
    if (!(field instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error(`${lesson.node_id}: the card rendered no field or no form`);
    }
    fireEvent.change(field, { target: { value: answer } });
    fireEvent.submit(form);
    if (results.length !== 1) {
      throw new Error(`${lesson.node_id}: ${results.length} verdicts for ${answer}`);
    }
    const outcome = results[0] as CfuOutcome;
    // No reveal is taken here, so `recalled` would mean the card believes it had already
    // printed this answer. That is a defect, not a pass.
    if (outcome === "recalled") {
      throw new Error(`${lesson.node_id}: called ${answer} recalled with no reveal taken`);
    }
    const verdict = outcome === "correct";
    const said = (container.textContent ?? "").includes("Correct! Nice work.");
    if (said !== verdict) {
      throw new Error(
        `${lesson.node_id}: reported ${outcome}, showed ${said}, on ${answer}`,
      );
    }
    return verdict;
  } finally {
    unmount();
  }
}

/** The population: the D6 packs that ship a check, read off the registry. */
const PACKS: readonly LessonContent[] = d6Lessons.filter(
  (lesson) => lesson.cfu !== undefined,
);

/** A floor, not a pin: eleven nodes today, and a twelfth needs no edit here. */
const MIN_PACKS = 11;

/**
 * Answers a learner holding a specific misconception produces. Every one is either
 * mathematically wrong or answers a different question than the prompt asked, so every one
 * must keep being rejected however wide the accepted list gets. Each is labelled with the
 * slip that produces it, so a reader can check the arithmetic rather than trust the label.
 */
const MISCONCEPTIONS: Record<string, readonly string[]> = {
  // Crossings (-6, 0) and (0, 8): midpoint (-3, 4), and legs 6 and 8 give a length of 10.
  "CG.1": [
    "(-3, 4), 14", // the two legs added instead of squared and rooted
    "(-3, 4), 100", // the square root never taken
    "(-3, 4), 2", // the legs subtracted
    "(3, 4), 10", // counting left from the bench mark read as positive
    "(-3, -4), 10", // sign carried onto the up coordinate instead
    "(-6, 8), 10", // the crossings added rather than averaged
    "(-6, 4), 10", // only the up coordinate averaged
    "(-3, 4), 9", // the length read off the vertical crossing alone
  ],
  // f(x) = 4x - 7 at -3 is -19, and the log repeats the input 2 against two outputs.
  //
  // `no, -19` used to sit in this list as *"the two halves in the order the prompt did not
  // ask for"*, and it was the one entry here that met neither half of the standard above: it
  // is arithmetically right and it answers the question that was asked. FUN.1's two parts are
  // a number and a verdict word, so a reader can see which is which whichever order they
  // arrive in, and `cfuVariants.ts` now reverses this pack for that reason. Its replacement
  // is a real slip. The reversal of an answer whose two parts CANNOT be told apart is still a
  // misconception and still listed, on FUN.3 and FUN.5 below.
  "FUN.1": [
    "-19, yes", // the repeated OUTPUT 5 taken as the harmless one and the input overlooked
    "19, no", // the sign of the product lost
    "-6, no", // 4(-3) read as 4 - 3
    "-5, no", // -12 - 7 collected as -12 + 7
    "-12, no", // the constant term dropped
    "-19", // the log never answered
    "5, no", // the input's minus sign dropped, so 4(3) - 7 was computed
  ],
  // f(x) = 12 - sqrt(x - 3): the RANGE is (-inf, 12].
  "FUN.2": [
    "[3, inf)", // the domain answered instead of the range
    "(3, inf)", // the domain, with its reachable end dropped
    "[12, inf)", // subtracting the root read as adding it
    "(-inf, 12)", // 12 excluded, though the root really does reach 0
    "(-inf, inf)", // the root's floor never used
    "[0, 12]", // the root's own outputs handed back
    "(-inf, 9]", // 12 - 3 taken as the ceiling
  ],
  // C(t) = 7t for t < 5 and 4t + 18 for t >= 5: C(5) = 38 and C(2) = 14.
  "FUN.3": [
    "35, 14", // the boundary load sent to the strict-inequality piece
    "38, 26", // the 2 ton load sent to the second piece
    "35, 26", // both loads sent to the wrong piece
    "14, 38", // the lighter load written first
    "52", // the two charges added
    "38", // only one charge given
    "40, 20", // the prompt's own example copied
  ],
  // Marks (0, 4), (3, 9), (8, 2), (12, 11): falling across 3 to 8, highest reading 11.
  "FUN.4": [
    "(3, 8), 9", // the local turn read as the highest reading of the shift
    "(3, 8), 2", // the lowest reading given
    "(3, 8), 12", // the hour of the maximum given rather than the reading
    "(0, 3), 11", // the first rising leg given
    "(8, 12), 11", // the second rising leg given
    "(9, 2), 11", // the readings used where the hours were asked for
    "(3, 8)", // the highest reading never given
  ],
  // 4 at hour 0, 28 at hour 3, 16 at hour 6: the two rates are 2 and -4.
  "FUN.5": [
    "-4, 2", // the two windows answered in the wrong order
    "2, 4", // the sign of the falling window dropped
    "8, -4", // the whole shift read as its first window
    "2, -12", // the second window never divided by its three hours
    "12, -12", // neither window divided
    "-2, -4", // the sign of the rising window dropped
    "2, -6", // the second window divided by two hours
  ],
  // f(x) = 2x^2 - 3x + 5 at x = 4: the quotient is 2h + 13.
  "FUN.6": [
    "2h - 3", // (4 + h)^2 expanded as 16 + h^2, so the cross term never appeared
    "4h + 13", // the leading 2 distributed a second time
    "2h - 13", // the sign of the collected linear term lost
    "2h^2 + 13h", // the h underneath never cancelled
    "13", // the h term dropped from the simplified quotient
    "h + 13", // the leading coefficient dropped
    "2h + 5", // f(4) subtracted as though it were the constant term
  ],
  // f(x) = 3x + 8 and g(x) = x^2 - 4: (f o g)(5) = f(21) = 71.
  "FUN.7": [
    "525", // the order reversed: g(f(5))
    "83", // g's own constant dropped, so f met 25
    "21", // the inner value handed back as the answer
    "23", // f(5) computed and g never used
    "63", // f's constant dropped
    "75", // both: g read as 5^2 and f's constant dropped
    "67", // 3(21) + 4, the constant halved
  ],
  // f(x) = (x + 5)/4: the inverse is 4x - 5, and it sends 3 to 7.
  "FUN.8": [
    "4x + 5, 17", // the sign never changed when the 5 crossed over
    "(x - 5)/4, -1/2", // the operations undone in the order they were written
    "x/4 - 5, -17/4", // only the bar cleared
    "(x + 5)/4, 2", // the original rule handed back as its own inverse
    "4x - 20, -8", // the 5 multiplied by 4 along with the x
    "4x - 5, 12", // the rule right and the substitution slipped
    "4x - 5, -7", // the sign of the value lost
  ],
  // f odd with f(4) = 9, and g(x) = 2f(x - 1) + 5: g(-3) = 2(-9) + 5 = -13.
  "FUN.9": [
    "23", // odd symmetry never used, so f(-4) was read as 9
    "13", // the same, with the lift subtracted
    "-18", // the lift dropped
    "-23", // the lift subtracted
    "-9", // f(-4) handed back untransformed
    "-4", // the doubling dropped
    "9", // the logged value handed back
  ],
  // f(x) = -2|x - 6| + 10: the vee turns at (6, 10) and opens downward.
  "FUN.10": [
    "(6, 10), minimum", // the negative multiplier outside the bars overlooked
    "(-6, 10), maximum", // the sign inside the bars read straight off
    "(6, -10), maximum", // the sign of the height taken from the multiplier
    "(10, 6), maximum", // the coordinates swapped
    "(-6, 10), minimum", // both slips together
    "(6, 10)", // the direction word never given
    "maximum", // the vertex never given
  ],
};

/** Floors, so an emptied table cannot read as a pass. */
const MIN_ACCEPTED = 60;
const MIN_WRONG = 60;
const MIN_WRONG_PER_PACK = 6;

describe("D6 CFU acceptance, both directions, through the real card", () => {
  it("sweeps every D6 pack that ships a check, and nothing else", () => {
    expect(PACKS.length, "a D6 pack lost its check").toBeGreaterThanOrEqual(MIN_PACKS);
    expect(PACKS.map((lesson) => lesson.node_id).sort()).toEqual(
      d6Lessons.map((lesson) => lesson.node_id).sort(),
    );
    // Both directions: a pack with no misconception list fails here, and a listed node that
    // is no longer a D6 pack fails here too.
    expect(Object.keys(MISCONCEPTIONS).sort()).toEqual(
      PACKS.map((lesson) => lesson.node_id).sort(),
    );
  });

  it("grades every accepted entry as correct", () => {
    const rejected: string[] = [];
    let checked = 0;
    for (const lesson of PACKS) {
      const entries = lesson.cfu?.accepted ?? [];
      expect(entries.length, `${lesson.node_id} accepts nothing`).toBeGreaterThan(0);
      for (const entry of entries) {
        checked += 1;
        if (!grade(lesson, entry)) {
          rejected.push(`${lesson.node_id}: ${JSON.stringify(entry)}`);
        }
      }
    }
    expect(checked, "no accepted entry was graded").toBeGreaterThan(MIN_ACCEPTED);
    console.log(`[d6-accept] ${checked} accepted entries graded through the real card`);
    expect(rejected.join("\n")).toBe("");
  }, 120_000);

  it("still rejects every misconception answer", () => {
    const leaked: string[] = [];
    let checked = 0;
    for (const lesson of PACKS) {
      const cases = MISCONCEPTIONS[lesson.node_id] ?? [];
      // Shape, not only size: the total floor below is satisfied by one pack supplying
      // everything, so each pack owes its own cases.
      expect(
        cases.length,
        `${lesson.node_id} has too few misconception cases`,
      ).toBeGreaterThanOrEqual(MIN_WRONG_PER_PACK);
      for (const wrong of cases) {
        checked += 1;
        if (grade(lesson, wrong)) {
          leaked.push(`${lesson.node_id}: ${JSON.stringify(wrong)} was ACCEPTED`);
        }
      }
    }
    expect(checked, "no misconception answer was graded").toBeGreaterThan(MIN_WRONG);
    console.log(
      `[d6-reject] ${checked} misconception answers graded through the real card`,
    );
    expect(leaked.join("\n")).toBe("");
  }, 120_000);
});

/* ------------------------------------------- the population the sweep above cannot have */

/**
 * SPELLINGS NOBODY WROTE DOWN, over BOTH instances.
 *
 * The sweep above derives its forward population as `lesson.cfu.accepted`, so it can only
 * ever grade strings an author already listed. That is not a floor problem or a coverage
 * problem, it is a shape problem: a correct answer nobody anticipated is invisible to it BY
 * CONSTRUCTION, and an unanticipated correct answer is exactly the P0 this file exists to
 * catch. Round one measured what that costs — 7,378 gradings over the eleven packs found 22
 * rejections and every one of them was of a CORRECT answer, while the guard was green.
 *
 * So this population is derived from each instance's own canonical answer instead, by
 * applying rewrites that cannot change what an answer MEANS: dropping the space after a
 * separator, swapping one separator for another the packs already use, writing an explicit
 * plus on a positive number, and giving a two-part answer in the other order. None of them
 * consults `accepted`, so a spelling the author never thought of is in the population the
 * moment the rewrite applies to the answer.
 *
 * ## Both instances, and why instance 1 does not go through the card
 *
 * Eleven of those 22 rejections were on the computed re-ask, which the sweep above never
 * reaches: `LessonCfu` opens on instance 0 and only advances when a reveal is taken, and
 * this file treats a `recalled` verdict as a defect. Instance 1 is therefore graded through
 * `gradeCfuAnswer` directly. That is the function the card was just shown to call — the
 * sweep above renders the card, types, submits, and cross-checks the verdict against what
 * appears on screen — so what is being taken on trust here is one indirection that the
 * instance-0 leg measures on every single case.
 */

/** Split on separators OUTSIDE any bracket, so an interval or a point stays whole. */
function topLevelParts(answer: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < answer.length; i += 1) {
    const ch = answer[i] as string;
    if ("([{".includes(ch)) {
      depth += 1;
    } else if (")]}".includes(ch)) {
      depth -= 1;
    } else if (depth === 0 && (ch === "," || ch === ";")) {
      parts.push(answer.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(answer.slice(start).trim());
  return parts.filter((part) => part.length > 0);
}

/** A bare signed number, which is the only thing an explicit plus can be written on. */
function isBareNumber(text: string): boolean {
  return /^-?(\d+(\.\d+)?|\d+\/\d+)$/.test(text.trim());
}

interface Rewrite {
  /** What the rewrite is called when it fails, so a failure names the class. */
  readonly kind: "spacing" | "semicolon" | "and" | "explicit-plus" | "reversed";
  readonly text: string;
}

/**
 * Every meaning-preserving respelling of one canonical answer.
 *
 * Deliberately conservative: a rewrite that could change the answer is not offered at all,
 * because a false positive here would be a guard demanding the pack accept something wrong.
 */
function rewritesOf(canonical: string): Rewrite[] {
  const parts = topLevelParts(canonical);
  const out: Rewrite[] = [];
  if (parts.length === 2) {
    out.push({ kind: "spacing", text: `${parts[0]},${parts[1]}` });
    out.push({ kind: "semicolon", text: `${parts[0]}; ${parts[1]}` });
    out.push({ kind: "and", text: `${parts[0]} and ${parts[1]}` });
    out.push({ kind: "reversed", text: `${parts[1]}, ${parts[0]}` });
  }
  if (parts.length === 1 && isBareNumber(canonical) && !canonical.trim().startsWith("-")) {
    out.push({ kind: "explicit-plus", text: `+${canonical.trim()}` });
  }
  return out;
}

/**
 * The packs whose two parts CANNOT be told apart, so the order is content and not spelling.
 *
 * This is the one rewrite above that a pack may legitimately refuse, and refusing it is a
 * ruling rather than a gap: both of FUN.3's parts are bare charges and both of FUN.5's are
 * bare signed rates, so the reversed string is character-for-character what a learner
 * produces by pairing the right values with the wrong questions — FUN.3 by reading the heavy
 * load off the light piece, FUN.5 by averaging each window over the other's endpoints. Both
 * slips are in `MISCONCEPTIONS` above, which is where the same two strings are asserted
 * WRONG. Accepting them would grade a real misconception correct.
 *
 * Every other D6 pack pairs two parts of different kinds — a point beside a scalar, a number
 * beside a verdict word, an interval beside a reading, a rule beside a value — and reverses,
 * which is the test `cfuVariants.ts` states on `cfu.fun8.find-inverse` and the behaviour EL.2,
 * EL.4 and LF.1 already ship.
 *
 * ASSERTED BOTH WAYS below, so the list cannot rot: a listed pack that starts accepting the
 * reversal fails, and a listed node that is no longer a two-part D6 pack fails.
 */
const ORDER_IS_LOAD_BEARING: readonly string[] = ["FUN.3", "FUN.5"];

/**
 * Floors under the derivation, since every assertion below is over a computed set.
 *
 * The per-KIND floor beside the total is the one that matters, and it is here because the
 * total cannot do its job alone: a rewrite that stopped being generated would leave this
 * block reporting a comfortable green over a population missing the very class that failed
 * in round one. `explicit-plus` is the sharp case — it applies only to an answer that is one
 * bare positive number, so it is generated three times out of fifty-five and a total floor
 * would never notice it go.
 *
 * MEASURED, printed by the census below rather than estimated: `and=14 explicit-plus=3
 * reversed=10 semicolon=14 spacing=14`, 55 respellings over 9 of the 11 packs. Nine and not
 * eleven because two packs offer no rewrite at all, correctly: FUN.2 answers with a single
 * interval, whose only comma is inside its own brackets, and FUN.6 answers with an
 * expression that is neither two parts nor a bare number.
 */
const MIN_REWRITES = 50;
const MIN_REWRITTEN_PACKS = 9;
const MIN_INSTANCES = 20;
const MIN_PER_KIND: Record<Rewrite["kind"], number> = {
  spacing: 12,
  semicolon: 12,
  and: 12,
  reversed: 8,
  "explicit-plus": 2,
};

describe("D6 CFU acceptance over spellings no author listed", () => {
  it("sweeps both instances of every pack, not just the authored one", () => {
    let instances = 0;
    const perPack: string[] = [];
    for (const lesson of PACKS) {
      const cfu = lesson.cfu;
      if (!cfu) {
        throw new Error(`${lesson.node_id} has no CFU`);
      }
      const list = cfuInstances(cfu);
      expect(
        list.length,
        `${lesson.node_id} resolves no instance at all`,
      ).toBeGreaterThanOrEqual(1);
      instances += list.length;
      if (list.length < 2) {
        perPack.push(`${lesson.node_id} serves only ${list.length} instance(s)`);
      }
    }
    // Shape beside size: the whole point of this block is the re-ask, so a tree where every
    // pack had quietly lost its variants would satisfy a total floor and measure nothing.
    expect(perPack.join("\n"), "a D6 pack stopped serving a re-ask").toBe("");
    expect(instances, "the instance sweep collapsed").toBeGreaterThanOrEqual(MIN_INSTANCES);
  });

  it("grades every meaning-preserving respelling as correct", () => {
    const rejected: string[] = [];
    let checked = 0;
    const packsWithRewrites = new Set<string>();
    const perKind = new Map<Rewrite["kind"], number>();
    for (const lesson of PACKS) {
      const cfu = lesson.cfu;
      if (!cfu) {
        throw new Error(`${lesson.node_id} has no CFU`);
      }
      cfuInstances(cfu).forEach((instance, index) => {
        const canonical = instance.accepted[0];
        if (canonical === undefined) {
          rejected.push(`${lesson.node_id}#${index}: instance accepts nothing`);
          return;
        }
        for (const rewrite of rewritesOf(canonical)) {
          if (
            rewrite.kind === "reversed" &&
            ORDER_IS_LOAD_BEARING.includes(lesson.node_id)
          ) {
            continue;
          }
          checked += 1;
          packsWithRewrites.add(lesson.node_id);
          perKind.set(rewrite.kind, (perKind.get(rewrite.kind) ?? 0) + 1);
          const verdict =
            index === 0
              ? grade(lesson, rewrite.text)
              : gradeCfuAnswer({
                  nodeId: lesson.node_id,
                  cfu,
                  index,
                  value: rewrite.text,
                }).correct;
          if (!verdict) {
            rejected.push(
              `${lesson.node_id}#${index} [${rewrite.kind}]: ` +
                `${JSON.stringify(rewrite.text)} rejected, ` +
                `canonical ${JSON.stringify(canonical)}`,
            );
          }
        }
      });
    }
    const census = [...perKind]
      .sort()
      .map(([kind, count]) => `${kind}=${count}`)
      .join(" ");
    expect(checked, `no respelling was graded: ${census}`).toBeGreaterThanOrEqual(
      MIN_REWRITES,
    );
    // Per kind BEFORE the pack count, because it is the sharper diagnosis of the same
    // shortfall: a lost rewrite usually also costs a pack, and "spacing stopped being
    // generated" tells a reader what to fix where "too few packs" does not.
    for (const [kind, floor] of Object.entries(MIN_PER_KIND)) {
      expect(
        perKind.get(kind as Rewrite["kind"]) ?? 0,
        `the ${kind} rewrite has stopped being generated, so this sweep is green over a population that no longer contains it: ${census}`,
      ).toBeGreaterThanOrEqual(floor);
    }
    expect(
      packsWithRewrites.size,
      `the respellings came from too few packs, so one pack is carrying the count: ${census}`,
    ).toBeGreaterThanOrEqual(MIN_REWRITTEN_PACKS);
    console.log(
      `[d6-respell] ${checked} respellings across ${packsWithRewrites.size} packs (${census}), ` +
        `derived from the answer rather than from any accepted list`,
    );
    expect(rejected.join("\n")).toBe("");
  }, 240_000);

  it("keeps the order load-bearing exactly where it is content, and says so both ways", () => {
    const twoPart = PACKS.filter((lesson) => {
      const canonical = lesson.cfu?.accepted[0];
      return canonical !== undefined && topLevelParts(canonical).length === 2;
    }).map((lesson) => lesson.node_id);

    // A listed node that is no longer a two-part D6 pack is excusing nothing.
    expect(
      ORDER_IS_LOAD_BEARING.filter((id) => !twoPart.includes(id)),
      "a pack is exempted from the reversal rewrite but no longer has two parts to reverse",
    ).toEqual([]);
    // ...and the list has not grown until it excuses the whole population.
    expect(
      twoPart.length - ORDER_IS_LOAD_BEARING.length,
      "the exemption list has swallowed most of the two-part packs",
    ).toBeGreaterThanOrEqual(4);

    // The other direction, and the one that makes the exemption provable rather than
    // assumed: each listed pack must really REFUSE the reversal. One that quietly starts
    // accepting it has stopped being an exception and fails here rather than sitting in the
    // list forever describing nothing.
    const adopted: string[] = [];
    for (const id of ORDER_IS_LOAD_BEARING) {
      const lesson = PACKS.find((pack) => pack.node_id === id);
      const canonical = lesson?.cfu?.accepted[0];
      if (!lesson || canonical === undefined) {
        throw new Error(`${id} is listed but is not a D6 pack with a CFU`);
      }
      const reversed = rewritesOf(canonical).find((r) => r.kind === "reversed");
      if (!reversed) {
        throw new Error(`${id} is listed but offers no reversal to refuse`);
      }
      if (grade(lesson, reversed.text)) {
        adopted.push(`${id}: ${JSON.stringify(reversed.text)} is now ACCEPTED`);
      }
    }
    expect(
      adopted.join("\n"),
      "a pack listed as order-load-bearing has started accepting the reversal",
    ).toBe("");
  }, 120_000);
});
