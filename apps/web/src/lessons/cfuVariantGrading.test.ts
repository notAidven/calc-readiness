/**
 * A check's re-ask grades an answer exactly as its own question would have.
 *
 * ## The defect this was written for
 *
 * A check with a `check` block sent the AUTHORED question to the shared checker, which decides
 * equivalence, and every COMPUTED instance to string membership in the list
 * `cfuAcceptedForms.ts` spells - three strings for a whole number. So one node accepted `49/7`
 * against its authored key of 7 and rejected `56/7` against the 8 its re-ask asks, which is the
 * division that node's own last step performs. A variant is only ever served after a miss, so
 * the whole gap fell on a learner who had just been told they were wrong.
 *
 * ## Why the population is every RE-ASKING pack in the tree
 *
 * Nothing about the asymmetry was authored by the packs it was found on. It is a property of
 * the SHARED path, so it is live on every pack whose check serves a computed re-ask, in every
 * domain, and the population here is derived from `allLessons` rather than written down.
 *
 * It was narrower than that, and the narrowing was the "guard whose input silently became empty"
 * trap: the population was every pack carrying a `check` BLOCK, on the reasoning that the
 * asymmetry is a property of the checker path. Two graders disagreeing does not need a checker,
 * and a roster answer cannot declare a check block at all, so all five D4 CFUs -- which had the
 * defect, in the other direction, on every one of them -- were outside the population while this
 * file reported green. Measured at `68c5aa9a`: 59 packs serve a computed re-ask, 23 of them carry
 * a check block and 36 do not.
 *
 * ## Why the probes are derived from the authored question rather than listed
 *
 * A written-down list of spellings is a guess about what the checker allows, and a guess that
 * is too generous fails on something nobody promised while a guess that is too timid asserts
 * nothing. So each probe is a TRANSFORMATION applied to both keys, and the requirement is
 * conditional on the authored question: a spelling is only owed by the re-ask if the same
 * spelling of the authored answer is accepted on the authored question. A transformation the
 * checker refuses either way is skipped rather than asserted, and cannot make this red.
 */

import { describe, expect, it } from "vitest";

import { checkCfuThroughChecker, gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuSpec } from "./types";

/**
 * Every pack that serves a computed re-ask, which is every pack that can exhibit the asymmetry.
 *
 * It was every pack carrying a `check` BLOCK, and that was the wrong set in the way
 * `qa-verification.mdc` describes: scoped to where the mechanic is implemented rather than to
 * every surface that carries the behaviour. A re-ask being stricter than its authored question is
 * a fact about two graders disagreeing, and a pack with no check block has two graders as much as
 * one with a check block does -- its authored ask reads the pack's typed list where its re-ask
 * reads a computed one. So all five D4 CFUs, whose roster answers cannot declare a check block at
 * all (`answer_type` is `"numeric" | "expression"`), sat outside the population while carrying a
 * defect this file is named after, and the last sweep below reported green over them.
 */
const RE_ASKING = allLessons
  .filter((lesson) => lesson.cfu !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const)
  .filter(([, cfu]) => cfuInstances(cfu).some((instance) => !instance.authored));

/** The half of it the shared checker can be asked about at all. */
const CHECKED = RE_ASKING.filter(([, cfu]) => cfu.check !== undefined);

/** The other half, where a re-ask's only counterpart is the pack's own typed list. */
const CHECKLESS = RE_ASKING.filter(([, cfu]) => cfu.check === undefined);

/**
 * Floors, not fingerprints, and the third one is about SHAPE rather than size.
 *
 * Twenty packs carry a check block today and each serves one computed instance; a domain landing
 * raises those without an edit here, and a resolver that stopped drawing, a registry that
 * stopped loading or a filter that stopped matching fails instead of sweeping an empty tree and
 * reporting green. `CHECKLESS_FLOOR` is the one that cannot be satisfied by growth elsewhere: a
 * population that drifted back to nothing but checked packs would clear the other two while
 * measuring none of the packs the widening was for.
 *
 * ## What the CFU migration did to this pair, and why both moved
 *
 * Ten packs gained a check block, so the two halves traded members: the check-less side fell
 * to 29 and the checked side rose by the same ten. Lowering the first without raising the
 * second would have left the pair describing a smaller population than it started with while
 * both floors passed, which is the slack a ratchet exists to refuse. So `CHECKED_FLOOR` goes
 * UP as `CHECKLESS_FLOOR` comes down: a migration cannot be paid for twice, and a pack that
 * leaves one half has to be found in the other.
 */
const CHECKED_FLOOR = 25;
const INSTANCE_FLOOR = 50;
const CHECKED_INSTANCE_FLOOR = 20;
const CHECKLESS_FLOOR = 28;

/**
 * Floors on the SPELLINGS, which is what the last sweep below actually measures.
 *
 * Measured at `68c5aa9a`, with the counts printed by forcing these red: 159 spellings tried
 * across the 59 re-asking packs, 102 of them accepted on the authored question and therefore
 * owed by the re-ask. A containment assertion holds for free over nothing, and "the
 * transformation produced null everywhere" and "the checker refused every probe" both look
 * exactly like a clean sweep from outside these two numbers.
 *
 * The previous reading was 106 and 75 over a population of 20. Both halves of the widening move
 * these: the population went from the checked packs to every re-asking pack, and the roster
 * probes gave the packs whose answer is a SET something to be probed with, which none of the
 * integer and fraction transformations above could do.
 */
const PROBE_FLOOR = 140;
const OWED_FLOOR = 90;

/**
 * A spelling of the same value, in the shapes a learner types. Each is applied to the authored
 * key and to the computed one, and only the ones the authored question ACCEPTS are required of
 * the re-ask, so this list is a source of probes rather than a claim about the checker.
 *
 * `undone division` is the one the defect was found on, and it is not synthetic: a node whose
 * last step is "divide both pans by 7" is answered `56/7` by a learner who writes the division
 * down instead of evaluating it.
 */
const SPELLINGS: readonly { name: string; of: (key: string) => string | null }[] = [
  { name: "a decimal point and a zero", of: (key) => spellInteger(key, (n) => `${n}.0`) },
  { name: "three decimal places", of: (key) => spellInteger(key, (n) => `${n}.000`) },
  {
    name: "a leading zero",
    of: (key) => spellInteger(key, (n) => (n < 0 ? `-0${-n}` : `0${n}`)),
  },
  {
    name: "the undone division",
    of: (key) => spellInteger(key, (n) => `${n * 7}/7`),
  },
  {
    name: "an unreduced third",
    of: (key) => spellInteger(key, (n) => `${n * 3}/3`),
  },
  {
    name: "an explicit plus",
    of: (key) => spellInteger(key, (n) => (n < 0 ? null : `+${n}`)),
  },
  { name: "an unreduced fraction", of: (key) => spellFraction(key, 3) },
  {
    name: "the same answer in brackets",
    of: (key) => (/^[-\w./^*+ ]+$/.test(key) ? `(${key})` : null),
  },
  // Four probes for a ROSTER key, without which widening the population above buys nothing on
  // the packs it was widened for: every probe before this one is a transformation of a single
  // integer or a single fraction, and a roster key like `{-7, 5}` matches none of them, so D4's
  // five CFUs would have contributed a population and no probes. A set has no order and the
  // braces are optional on every pack that accepts one, so all four are the same answer.
  { name: "a roster without its braces", of: (key) => spellRoster(key, ", ", false) },
  { name: "a roster joined by a semicolon", of: (key) => spellRoster(key, "; ", true) },
  { name: "a roster joined by the word and", of: (key) => spellRoster(key, " and ", true) },
  {
    name: "a roster in the other order",
    of: (key) => {
      const parts = rosterParts(key);
      return parts === null ? null : spellRosterFrom([...parts].reverse(), ", ", true);
    },
  },
];

function spellInteger(key: string, spell: (value: number) => string | null): string | null {
  return /^-?\d+$/.test(key.trim()) ? spell(Number(key.trim())) : null;
}

/**
 * The values in a roster key, or `null` where the key is not one.
 *
 * Every part has to be a bare number or fraction, which is what keeps a COMPOSITE key out: an
 * answer like `(3, 8), 11` splits on its commas into pieces that are not numbers, and spelling it
 * as a roster would produce a string that is not the same answer.
 */
function rosterParts(key: string): readonly string[] | null {
  const inner = /^\{(.+)\}$/.exec(key.trim())?.[1] ?? key.trim();
  const parts = inner.split(",").map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }
  return parts.every((part) => /^[+-]?\d+(\.\d+)?(\/\d+)?$/.test(part)) ? parts : null;
}

function spellRoster(key: string, join: string, braced: boolean): string | null {
  const parts = rosterParts(key);
  return parts === null ? null : spellRosterFrom(parts, join, braced);
}

function spellRosterFrom(parts: readonly string[], join: string, braced: boolean): string {
  const list = parts.join(join);
  return braced ? `{${list}}` : list;
}

function spellFraction(key: string, factor: number): string | null {
  const parts = /^(-?\d+)\/(\d+)$/.exec(key.trim());
  if (parts === null) {
    return null;
  }
  return `${Number(parts[1]) * factor}/${Number(parts[2]) * factor}`;
}

describe("a check grades its re-ask the way it grades its own question", () => {
  it("the sweep found the packs that re-ask, the checked ones and the check-less ones", () => {
    const instances = RE_ASKING.reduce(
      (total, [, cfu]) =>
        total + cfuInstances(cfu).filter((instance) => !instance.authored).length,
      0,
    );
    const short: string[] = [];
    if (CHECKED.length < CHECKED_FLOOR) {
      short.push(
        `only ${CHECKED.length} packs carry both a check block and a computed re-ask, under the floor of ${CHECKED_FLOOR}, so the checker sweep is close to vacuous`,
      );
    }
    if (CHECKLESS.length < CHECKLESS_FLOOR) {
      short.push(
        `only ${CHECKLESS.length} packs re-ask with NO check block, under the floor of ${CHECKLESS_FLOOR}: the population has narrowed back to where the mechanic is implemented, which is how all five D4 CFUs sat outside it`,
      );
    }
    if (instances < INSTANCE_FLOOR) {
      short.push(
        `only ${instances} computed instances resolved across ${RE_ASKING.length} re-asking packs, under the floor of ${INSTANCE_FLOOR}`,
      );
    }
    expect(short.join("\n")).toBe("");
  });

  // Scoped to CHECKED rather than to the whole population, and that is a fact about what the
  // claim MEANS rather than a narrowing: `checkCfuThroughChecker` returns null where a pack has
  // no check block, so "the shared checker can grade the question the re-ask asks" is not a
  // statement about a check-less pack at all. Those packs owe the sweep below this one instead,
  // where the population IS all of them. Returning null was also what made the old population
  // silently harmless: this sweep would have reported green over D4 while measuring nothing.
  it("every computed instance's own answer grades correct through the checker", () => {
    // The narrow statement of "the two paths agree": the shared checker can grade the question
    // the re-ask actually asks. It could not - `cfuChecker` registered one item version per node
    // off the pack's AUTHORED key, so a computed instance reached the checker as
    // `item_version_not_found` and every answer to it came back refused.
    //
    // Asserted through `checkCfuThroughChecker` rather than through the card's own
    // `gradeCfuAnswer`, and that is the difference between measuring this and appearing to:
    // the card answers off the accepted list first, and the list holds the canonical answer by
    // construction, so grading it that way would come back correct with the checker never
    // consulted. This is the one claim the list cannot satisfy on the checker's behalf.
    const wrong: string[] = [];
    let graded = 0;
    for (const [nodeId, cfu] of CHECKED) {
      cfuInstances(cfu).forEach((instance, index) => {
        if (instance.authored) {
          return;
        }
        graded += 1;
        const answer = instance.accepted[0] ?? "";
        const result = checkCfuThroughChecker({ nodeId, cfu, index, value: answer });
        if (result?.client_correct !== true) {
          wrong.push(
            `${nodeId} instance ${index}: the answer its own reveal prints, ${JSON.stringify(answer)}, comes back from the checker as ${JSON.stringify(result?.reason_code ?? "no result at all")}`,
          );
        }
      });
    }
    expect(wrong.join("\n")).toBe("");
    // The floor under it, printed: an empty population passes the line above for free.
    expect(graded, `${graded} computed answers were graded`).toBeGreaterThanOrEqual(
      CHECKED_INSTANCE_FLOOR,
    );
  });

  it("every spelling the authored question accepts, the re-ask accepts too", () => {
    const stricter: string[] = [];
    let probes = 0;
    let owed = 0;
    for (const [nodeId, cfu] of RE_ASKING) {
      const instances = cfuInstances(cfu);
      // A check-less pack's authored answer is the string its reveal prints, since it has no
      // `answer_key` to declare. Reading only the check block is the other half of why this
      // sweep was empty on D4: even inside the widened population, every probe below is keyed
      // off this string, and `""` transforms to nothing.
      const authoredKey = cfu.check?.answer_key ?? cfu.accepted[0] ?? "";
      for (const spelling of SPELLINGS) {
        const onAuthored = spelling.of(authoredKey);
        if (onAuthored === null) {
          continue;
        }
        probes += 1;
        // The authored question is the standard. A spelling it refuses is not owed by anybody,
        // and asserting on one would be asserting against the checker rather than against the
        // asymmetry between the two questions.
        if (!gradeCfuAnswer({ nodeId, cfu, index: 0, value: onAuthored }).correct) {
          continue;
        }
        instances.forEach((instance, index) => {
          if (instance.authored) {
            return;
          }
          const onVariant = spelling.of(instance.answerKey);
          if (onVariant === null) {
            return;
          }
          owed += 1;
          if (!gradeCfuAnswer({ nodeId, cfu, index, value: onVariant }).correct) {
            stricter.push(
              `${nodeId}: ${JSON.stringify(onAuthored)} is correct on the authored question (key ${JSON.stringify(authoredKey)}) and ${JSON.stringify(onVariant)} is graded WRONG on the re-ask (key ${JSON.stringify(instance.answerKey)}), which is ${spelling.name}`,
            );
          }
        });
      }
    }
    expect(stricter.join("\n")).toBe("");
    // Two floors, collected so that forcing them red prints both, because the assertion above is
    // a containment and holds for free over nothing: one on how many spellings were tried at
    // all, and one on how many the authored question accepted and so genuinely put the re-ask
    // under an obligation.
    const short: string[] = [];
    if (probes < PROBE_FLOOR) {
      short.push(`only ${probes} spellings were tried, under the floor of ${PROBE_FLOOR}`);
    }
    if (owed < OWED_FLOOR) {
      short.push(
        `only ${owed} spellings were accepted on the authored question and so owed by the re-ask, under the floor of ${OWED_FLOOR}`,
      );
    }
    expect(short.join("\n")).toBe("");
  });
});
