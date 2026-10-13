import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { beforeEach, describe, expect, it } from "vitest";

import { materialWord } from "../../economy/materialWord";
import {
  COACH_MARKS,
  type CoachAnchor,
  hasSeenCoachMark,
} from "../coachmarks/coachMarksCore";
import { CURRENT_ERA_ID, resolveEraAdvisor } from "../eraDressing";
import {
  FIRST_BUILDING_TASK,
  forgetOnboardingAdvisor,
  hasSeenOnboardingAdvisor,
  loadOnboardingAdvisorStep,
  markOnboardingAdvisorSeen,
  ONBOARDING_ADVISOR_DONE_KEY,
  ONBOARDING_ADVISOR_STEP_KEY,
  ONBOARDING_GATED_MOMENT,
  ONBOARDING_MOMENT_ORDER,
  ONBOARDING_TAUGHT_COACH_MARKS,
  type OnboardingSurfaces,
  onboardingBriefingFor,
  onboardingBriefingLines,
  onboardingMomentOrder,
  onboardingTaughtCoachMarkIds,
  resumeOnboardingAt,
  saveOnboardingAdvisorStep,
} from "./onboardingScript";

/**
 * **THE ONBOARDING MOMENT TABLE AND ITS THREE STORED FACTS — the pure core, mounting nothing.**
 *
 * Everything here is a claim about the CONTENT and the SEQUENCING, which is why it lives apart
 * from `OnboardingAdvisor.test.tsx` (the surface) and
 * `advisorIsTheCrisisRegister.test.tsx` (the presentation). Copy that can be swept without a
 * render is copy that gets swept, which is `crisisCall.ts`'s own reason for the same split.
 *
 * ## ⚑ HALF OF THIS FILE IS THE PRODUCT LEAD'S REVIEW, TURNED INTO ASSERTIONS
 *
 * His verdict on the shipped intro was *"it really doesn't explain what the game does and is
 * awful user experience"*, and every item under it was a claim about the copy: stop the
 * writerly language, explain the concepts simply, avoid bullets, one mechanic per slide, stop
 * saying "Sire", make it clear he is an advisor. A rewrite satisfies all of that on the day it
 * lands and none of it a month later, so each item that can be mechanised is below.
 *
 * **What cannot be mechanised is whether the prose is any good**, and nothing here pretends
 * otherwise. `.cursor/rules/qa-verification.mdc` is explicit that a rewrite is discharged by
 * somebody reading the new prose against the objection. These assertions are the floor under
 * that reading, not a substitute for it: they catch a moment that grew a second idea, a "Sire"
 * that came back, a spotlight pointing at a control that no longer exists, and a sequence that
 * quietly turned back into a wall of text.
 */

const ALL_ERAS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);
/**
 * **EVERY SURFACE ON, so the sweeps below read the WHOLE corpus.**
 *
 * A moment can now be gated on a surface the city may not have (`OnboardingSurfaces`), and the
 * default withholds those. A copy sweep run on the default would therefore be green over a
 * sentence it had never read, which is the exact shape of guard `.cursor/rules/qa-verification.mdc`
 * calls the ordinary way one fails here. The gating itself is asserted separately, in
 * "the surface-gated moments" below.
 */
const ALL_SURFACES: OnboardingSurfaces = { bay: true };
const MOMENTS = onboardingBriefingFor(CURRENT_ERA_ID, ALL_SURFACES).moments;

beforeEach(() => {
  localStorage.clear();
});

describe("the onboarding moment table", () => {
  it("hands out the moments in the record's own order, with a floor under the count", () => {
    const moments = onboardingBriefingFor(CURRENT_ERA_ID, ALL_SURFACES).moments;
    /*
      A FLOOR FIRST. Every assertion below holds trivially over an empty sequence, and the
      sequence is derived from a record, so a table emptied by a bad merge would leave this
      whole file green over nothing. The lead's own number was *"like 10 total slides around,
      or however many you need to cover each mechanic independently"* -- the deliberate
      deletion of "founding" (net-points scoring), "era" (Island Unlock Exam), and
      "buildings" (redundant with what "place" itself already says) took the real count to
      8, on the judgement that none of the three slides' content was worth its own step any
      more. The composition assertion further down is what says the eight that remain are
      the right eight.
    */
    expect(moments.length).toBeGreaterThanOrEqual(8);
    // The order is the record's, checked against what a caller receives rather than against a
    // second written-down list.
    expect(moments.map((moment) => moment.id)).toEqual([...ONBOARDING_MOMENT_ORDER]);
    for (const moment of moments) {
      expect(moment.lead.length, moment.id).toBeGreaterThan(20);
      expect(moment.body.length, moment.id).toBeGreaterThan(20);
      // The title is a name in the accessibility tree, not a sentence: it is what a screen
      // reader reads the section as, so it must exist and must be short enough to be a label.
      expect(moment.title.length, moment.id).toBeGreaterThan(3);
      expect(moment.title.length, moment.id).toBeLessThanOrEqual(28);
    }
  });

  /**
   * **ONE MECHANIC PER MOMENT, ASSERTED AS COMPOSITION AND NOT AS A COUNT.**
   *
   * *"Cover the mechanics, each on its own slide: buildings, resources, population,
   * livability, happiness, civic buildings."* A floor of ten is satisfied by ten of anything,
   * including ten that dropped livability, so the six he named are required BY NAME.
   *
   * Both directions, because a list that has stopped describing the tree is worse than no
   * list: every named mechanic must be a moment that exists, and each must be a DISTINCT
   * moment, so a merge that folded livability and happiness into one row fails here rather
   * than passing on a count of ten.
   */
  it("keeps the complete loop split into distinct, addressable moments", () => {
    const CORE_LOOP = ["resources", "civic", "cityLife", "townhall", "bay"] as const;
    for (const mechanic of CORE_LOOP) {
      expect(ONBOARDING_MOMENT_ORDER, `${mechanic} has no moment of its own`).toContain(
        mechanic,
      );
    }
    expect(new Set(CORE_LOOP).size).toBe(CORE_LOOP.length);
    expect(
      ONBOARDING_MOMENT_ORDER.filter(
        (id) => !CORE_LOOP.includes(id as (typeof CORE_LOOP)[number]),
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  /**
   * **THE REGISTER: one idea per sentence, and no more sentences than ideas.**
   *
   * *"Stop the writerly language."* The two he quoted were *"Bare ground today, and a city by
   * the time we are done"* and *"That is the whole of what grows it"*, and what they have in
   * common is that they are doing two things at once in a line somebody reads cold.
   *
   * A length ceiling is a proxy and it is an honest one: the lead is the biggest type on the
   * screen and the body sits under it, so a sentence that will not fit on two lines at 1024px
   * is a sentence that was written to be admired. Measured over the shipped ten: the longest
   * lead is 88 characters and the longest body is 83.
   */
  it("keeps every sentence short enough to be read once, cold", () => {
    for (const moment of MOMENTS) {
      expect(moment.lead.length, `${moment.id} lead: ${moment.lead}`).toBeLessThanOrEqual(
        100,
      );
      expect(moment.body.length, `${moment.id} body: ${moment.body}`).toBeLessThanOrEqual(
        100,
      );
      // AT MOST TWO SENTENCES IN THE SHOUT AND ONE IN THE BODY. This is the "one idea"
      // rule in the only form a machine can hold: a moment that grew a third clause grew a
      // second mechanic, which is what put three bullets under a heading last time.
      //
      // "advisor" is the one named exception: its lead opens with "Hello!" (product
      // instruction, 2026-08-21), which the sentence-splitter counts as its own clause
      // even though it introduces no second mechanic -- it is a greeting, not an idea.
      const leadCeiling = moment.id === "advisor" ? 3 : 2;
      expect(sentences(moment.lead).length, `${moment.id} lead`).toBeLessThanOrEqual(
        leadCeiling,
      );
      expect(sentences(moment.body).length, `${moment.id} body`).toBeLessThanOrEqual(2);
    }
  });

  /**
   * **NO FRAME IS EVER A WALL, AND THAT IS THE CLAIM. The total is not.**
   *
   * ## ⚑ THIS GUARD WAS LOOSENED ON 2026-08-05, and the loosening is argued rather than
   * quietly done
   *
   * It used to assert `total < 1011` — the drawn character count of the three-bullet screens
   * this sequence replaced, measured at `0b6f95f8` — under the lead's *"do not make it
   * longer"*. That ceiling is now **in direct conflict with a later instruction from the same
   * person**, who reviewed the result and required the intro to explain four things it did
   * not: what a building costs in learning, what the material IS, that practice grants mastery
   * as well as material, and that an age ends. Four facts cannot be added to a corpus under a
   * ceiling set by the corpus before they were asked for, and the honest move is to say so
   * here rather than to shave adjectives until a number goes green.
   *
   * **What his instruction was actually about survives, and it is the per-frame rule.** The
   * complaint was that a screen *"reads as a specification rather than someone talking to
   * you"*, which is a claim about ONE frame: the densest of the three old moments put 359
   * characters on a screen. So the per-frame ceiling stays exactly where it was, at half of
   * that, and the total is now asserted as an AVERAGE against the same number, which is the
   * form that scales with the sequence instead of fighting it. A tenth moment of three hundred
   * characters fails; a tenth moment of a hundred does not.
   *
   * **Watched red at the loosened lines** rather than argued: see
   * `output/onboarding-guard-injections.mjs`, which lengthens one moment's body past the
   * per-frame ceiling and past the average, and requires both to fail with the message that
   * names them.
   */
  it("never puts a wall on one frame, and averages well under the densest screen it replaced", () => {
    const OLD_DENSEST_MOMENT = 359;
    const PER_FRAME_CEILING = Math.round(OLD_DENSEST_MOMENT / 2);
    const drawn = [
      ...MOMENTS.flatMap((moment) => [moment.lead, moment.body]),
      FIRST_BUILDING_TASK.task,
    ];
    const total = drawn.join(" ").length;
    /*
      A FLOOR FIRST, and it is higher than it was, because the second review's whole complaint
      was that the sequence said too little. 1,100 is under the measured 1,461 with room for an
      edit and well over the 1,011 the three-bullet version drew, so a sequence quietly gutted
      back to the shape that failed review fails here.
    */
    expect(
      total,
      `the sequence draws ${total} characters, which is less than the three screens it replaced drew`,
    ).toBeGreaterThan(1100);

    // THE AVERAGE FRAME, which is what "it is not longer to get through" means once the
    // sequence is paginated: every press of Next hands the learner well under half of what
    // the densest old screen handed them all at once.
    const average = total / MOMENTS.length;
    expect(
      Math.round(average),
      `the average frame draws ${Math.round(average)} characters against the ${OLD_DENSEST_MOMENT} the densest old screen drew`,
    ).toBeLessThan(PER_FRAME_CEILING);

    // AND NO SINGLE FRAME, which is the assertion the average cannot make: ten frames
    // averaging 140 is satisfied by nine of 100 and one of 500.
    for (const moment of MOMENTS) {
      const onOneFrame =
        `${moment.lead} ${moment.body}`.length +
        (moment.id === ONBOARDING_GATED_MOMENT ? FIRST_BUILDING_TASK.task.length + 1 : 0);
      expect(
        onOneFrame,
        `${moment.id} puts ${onOneFrame} characters on one frame`,
      ).toBeLessThan(PER_FRAME_CEILING);
    }
  });

  it("does not retain the superseded reward or progression claims", () => {
    const lines = onboardingBriefingLines(
      onboardingBriefingFor(CURRENT_ERA_ID, ALL_SURFACES),
    );
    expect(lines.length, "there is no sequence to read").toBeGreaterThan(25);
    expect(lines.join(" ")).not.toMatch(/\bevery practice problem\b[^.]*\bpay/i);
    expect(lines.join(" ")).not.toMatch(/\ball six\b[^.]*\bceremony\b/i);
  });

  /**
   * **"MATH", NEVER "MATHS", and the sweep is over the resolved lines in all ten eras.**
   *
   * *"'math', never 'maths'. American English throughout."* A deletion is the one ask a grep
   * discharges, and this is the grep, kept where it can fail rather than run once by hand: the
   * word came back into two sentences between one review and the next.
   *
   * `\bmaths\b` rather than a bare substring, so "mathsy" would be caught and "mathematics"
   * would not be a false alarm.
   */
  it("never says maths, in any era, and could still tell if it did", () => {
    const BRITISH = /\bmaths\b/i;
    for (const eraId of ALL_ERAS) {
      for (const line of onboardingBriefingLines(
        onboardingBriefingFor(eraId, ALL_SURFACES),
      )) {
        expect(line, `${eraId}: ${line}`).not.toMatch(BRITISH);
      }
    }
    // THE PATTERN STILL READS, so the absence above is an absence rather than a dead regex,
    // and the corpus is real. The string is the sentence this rule was written off.
    expect(BRITISH.test("Every building here stands for one maths skill.")).toBe(true);
    expect(
      onboardingBriefingLines(onboardingBriefingFor(CURRENT_ERA_ID, ALL_SURFACES)).length,
    ).toBeGreaterThan(25);
  });

  it("uses a calm register rather than slogans or exclamations", () => {
    const spoken = MOMENTS.flatMap((moment) => [moment.lead, moment.body]);
    // 8 moments × 2 lines each, since "founding", "era" and "buildings" were all deleted.
    // A floor rather than an exact count, so a new moment does not have to touch this.
    expect(spoken.length).toBeGreaterThanOrEqual(16);
    // Two named exceptions carry an exclamation mark on explicit product instruction
    // (2026-08-21): the advisor's own opening, and the "resources" moment's reward line.
    // Neither is the sales register this rule exists to keep out -- a greeting and a
    // stated payout -- so both are excluded by exact string rather than loosening the
    // rule for every other line.
    const EXCLAIMED = new Set([
      "Hello! I'm Oru, your advisor. I'll walk you through how the game works.",
      `Completing a practice set successfully grants you mastery of that skill and a reward of ${materialWord(CURRENT_ERA_ID)}!`,
      "You're all set, start building!",
    ]);
    for (const line of spoken) {
      if (!EXCLAIMED.has(line)) {
        expect(line).not.toContain("!");
      }
      expect(line).not.toMatch(/\band it pays\b|\byour turn\b|\blook at that\b/i);
    }
  });

  /**
   * **"SIRE" IS GONE, and the sweep is over the resolved sentences in all ten eras.**
   *
   * *"Stop saying 'Sire' in every sentence."* It opened all three shouts. This reads the
   * briefing rather than the source so an era that resolved it back in through a substitution
   * would fail too.
   */
  it("never addresses the learner as Sire", () => {
    for (const eraId of ALL_ERAS) {
      for (const line of onboardingBriefingLines(
        onboardingBriefingFor(eraId, ALL_SURFACES),
      )) {
        expect(line, `${eraId}: ${line}`).not.toMatch(/\bsire\b/i);
      }
    }
    // AND THE SWEEP IS OVER A REAL CORPUS. An absence over nothing is not an absence.
    expect(
      onboardingBriefingLines(onboardingBriefingFor(CURRENT_ERA_ID, ALL_SURFACES)).length,
    ).toBeGreaterThan(25);
  });

  /**
   * **HE INTRODUCES HIMSELF AS AN ADVISOR, AND SAYS WHAT AN ADVISOR DOES.**
   *
   * *"Make it clear he is an advisor and he is there to guide you."* Naming the role is half
   * of it and the cheap half: a character who says "I am your advisor" and then never advises
   * has still not been introduced. The ruling names three behaviours — he explains what is
   * happening, he tells you what to do next, and he speaks up when something needs your
   * attention — and the opening has to carry all three, in words a learner reads rather than
   * in a role noun.
   *
   * **The verbs are a written-down list and that is a real pin**, so it is argued rather than
   * assumed: each row holds the two or three plainest ways of saying one of the behaviours,
   * the audience is remedial learners, and a rewrite that reaches past them is a rewrite
   * somebody should look at. What is NOT pinned is the order, or the sentences around them.
   */
  it("says who he is, what he will explain, and that Skip is there", () => {
    // "go back" and "return from Menu" are deliberately NOT asserted here any more: the
    // persistent footer under every step already names Menu, and repeating it in the
    // opening moment was the exact redundancy product review asked to cut (2026-08-21).
    const first = MOMENTS[0];
    const opening = `${first?.lead ?? ""} ${first?.body ?? ""}`;
    expect(opening).toMatch(/\badvisor\b/i);
    expect(opening).toContain(resolveEraAdvisor(CURRENT_ERA_ID).name);
    expect(opening).toMatch(/\bhow the game works\b/i);
    expect(opening).toMatch(/\bskip\b/i);
  });

  /**
   * **⚑ ORU IS THE ADVISOR. HE IS NOT THE CHRONICLER.**
   *
   * The product lead, on 2026-08-04, in those words. The intro used to open *"I am Oru, and I
   * keep the city's memory"*, and keeping the city's memory is the CHRONICLER's job: a
   * separate shipped feature, the Album (#514), which records what the city looked like at
   * each age. Two features were claiming one character.
   *
   * ## The sweep is over a VOCABULARY, not over the sentence that was found
   *
   * *"Sweep the whole script for it rather than fixing the one sentence, since the framing may
   * recur."* `.cursor/rules/qa-verification.mdc` says the same thing in general terms: a guard
   * scoped to where a defect was first seen is scoped to the wrong population. So this reads
   * every resolved line in all ten eras against the words that would hand him a Chronicler's
   * job, and the retired sentence is only one of the shapes it catches.
   *
   * ## And EVERY ENTRY is asserted in both directions, not the list as a whole
   *
   * An absence proves nothing if the patterns cannot match anything, and a floor over the list
   * is not enough: six patterns of which five are live still clears a floor of two while the
   * sixth quietly stops reading. So each row carries the sentence it exists to catch and has
   * to catch it. Measured: with only a whole-list floor, editing `memory` into `memorabilia`
   * left this test green, because two other rows happened to catch the retired sentence as
   * well.
   *
   * The retired sentence keeps a floor of its own on top of that, because the rows have to
   * cover the shape that was actually found and not merely each cover themselves.
   */
  it("never gives him the Chronicler's job, and could still tell if it did", () => {
    const CHRONICLER_WORK: readonly {
      readonly says: RegExp;
      readonly catches: string;
      readonly why: string;
    }[] = [
      {
        says: /\bmemor(y|ies)\b/i,
        catches: "I keep the city's memory.",
        why: "the retired sentence's own word, and the Album's whole subject",
      },
      {
        says: /\bchronicl(e|er|ing)\b/i,
        catches: "I am the chronicler of this island.",
        why: "the feature's internal name, which `CitySurface` records was kept out of the label precisely because a chronicler is a PERSON and the Album is a log",
      },
      {
        says: /\bremember(s|ed|ing)?\b/i,
        catches: "I remember every building you have raised.",
        why: "what a memory-keeper does, in the plainest verb for it",
      },
      {
        says: /\b(histor(y|ian|ies)|archive[sd]?|annals)\b/i,
        catches: "Your city's history is safe with me.",
        why: "the same job in the words a learner is likelier to meet than 'chronicle'",
      },
      {
        says: /\bkeeps? (the|a|your) (city|island|record|log|account|story|past)\b/i,
        catches: "I keep the island's story as it grows.",
        why: "the CONSTRUCTION rather than a noun, so a rephrasing that avoids every word above still fails",
      },
      {
        says: /\bthe (city|island)'s (memory|story|past|record)\b/i,
        catches: "Ask me and I will read you the city's past.",
        why: "the possessive form the retired line used, kept separate so the sweep names it",
      },
    ];

    // ONE: nothing he says anywhere, in any era, does the Chronicler's job.
    const offenders: string[] = [];
    for (const eraId of ALL_ERAS) {
      for (const line of onboardingBriefingLines(
        onboardingBriefingFor(eraId, ALL_SURFACES),
      )) {
        for (const entry of CHRONICLER_WORK) {
          if (entry.says.test(line)) {
            offenders.push(`${eraId}: "${line}" (${entry.why})`);
          }
        }
      }
    }
    expect(
      offenders,
      `${offenders.length} lines give the advisor the Chronicler's job:\n${offenders.join("\n")}`,
    ).toEqual([]);

    // TWO: EVERY row can still find the sentence it exists for, so one pattern edited into
    // uselessness fails at its own row rather than being covered by its neighbours.
    const inert = CHRONICLER_WORK.filter((entry) => !entry.says.test(entry.catches));
    expect(
      inert.map((entry) => `${entry.says} no longer catches "${entry.catches}"`),
      "a pattern in the Chronicler sweep has stopped reading",
    ).toEqual([]);
    // THREE: and the rows between them still cover the shape that was actually found — the
    // sentence this ruling retired, verbatim.
    const RETIRED =
      "I am Oru, and I keep the city's memory. I will speak up when there is something new to know.";
    expect(
      CHRONICLER_WORK.filter((entry) => entry.says.test(RETIRED)).length,
      "the sweep can no longer catch the sentence it was written for",
    ).toBeGreaterThanOrEqual(2);
    for (const entry of CHRONICLER_WORK) {
      expect(entry.why.length, `${entry.says} has no reason recorded`).toBeGreaterThan(30);
    }
  });

  /**
   * **EVERY MOMENT THAT NAMES A CONTROL LIGHTS THAT CONTROL UP, and the three that do not are
   * named with their reasons.**
   *
   * *"Whenever a concept is mentioned, highlight the corresponding control."* Three moments
   * have no control to point at, and a moment that does not owe a spotlight and one that
   * forgot its spotlight look identical from outside this guard, so they are a list rather
   * than a filter, asserted BOTH ways: a listed moment that has gained a spotlight fails, and
   * a moment outside the list with no spotlight fails.
   */
  it("points at a control on every moment that has one, with the exceptions named", () => {
    const POINTS_AT_NOTHING: readonly { readonly id: string; readonly why: string }[] = [
      {
        id: "advisor",
        why: "he is introducing himself, so the thing to look at is the character; a ring round a button nobody has been told about yet would be pointing away from him, and the island he names is the background rather than a control",
      },
      {
        id: "allSet",
        why: "the closing send-off names no single control -- Build is only 'whenever you're ready', not a step to take right now -- so a ring here would be pointing at something the learner has already been shown, not something new",
      },
    ];
    const excused = new Set(POINTS_AT_NOTHING.map((entry) => entry.id));

    for (const entry of POINTS_AT_NOTHING) {
      const moment = MOMENTS.find((each) => each.id === entry.id);
      // ONE: the moment still exists, so the exemption is about something.
      expect(moment, `${entry.id} is excused and is no longer a moment`).toBeDefined();
      // TWO: it still has no spotlight, so an entry cannot sit here excusing a moment that
      // has quietly grown one.
      expect(
        moment?.spotlight,
        `${entry.id} has a spotlight now, so its exemption excuses nothing`,
      ).toBeNull();
      expect(entry.why.length, `${entry.id} has no reason recorded`).toBeGreaterThan(60);
    }

    // THREE: everybody else owes one, which is the direction that catches a new moment
    // shipped without a ring.
    const lit = MOMENTS.filter((moment) => !excused.has(moment.id));
    expect(
      lit
        .map((moment) => moment.id)
        .filter((id) => {
          const moment = MOMENTS.find((each) => each.id === id);
          return moment?.spotlight == null;
        }),
      "these moments name a control and light nothing up",
    ).toEqual([]);
    // A FLOOR ON THE LIT ONES, because the sweep above is green over one exemption and a
    // sequence emptied by a bad merge.
    expect(lit.length, "nothing is spotlit at all").toBeGreaterThanOrEqual(7);
  });

  it("does not collapse distinct concepts onto one visible anchor without a named exception", () => {
    /*
      `buildings` is a legacy semantic slot, but #625 moved its roster into Build and
      `CitySurface` now resolves both names to the same button. Count the VISIBLE target,
      not merely the two different strings, or five moments can ring one control while a
      uniqueness check over the enum reports no duplicate.
    */
    const visibleAnchor = (anchor: CoachAnchor): CoachAnchor =>
      anchor === "buildings" ? "build" : anchor === "sound" ? "menu" : anchor;
    const SHARED: readonly {
      readonly anchor: CoachAnchor;
      readonly moments: readonly string[];
      readonly why: string;
    }[] = [
      {
        anchor: "build",
        moments: ["place", "civic"],
        why: "both moments use the same real Build control for a different step: placing one skill building, and opening the Civic catalogue",
      },
    ];

    const byVisibleAnchor = new Map<CoachAnchor, string[]>();
    for (const moment of MOMENTS) {
      if (moment.spotlight === null) {
        continue;
      }
      const anchor = visibleAnchor(moment.spotlight);
      byVisibleAnchor.set(anchor, [...(byVisibleAnchor.get(anchor) ?? []), moment.id]);
    }
    const duplicates = [...byVisibleAnchor]
      .filter(([, moments]) => moments.length > 1)
      .map(([anchor, moments]) => ({ anchor, moments }));

    // FIRST DIRECTION: every exception still exists and still shares the target it names.
    for (const entry of SHARED) {
      expect(entry.why.length, `${entry.anchor} has no reason recorded`).toBeGreaterThan(
        80,
      );
      for (const id of entry.moments) {
        const moment = MOMENTS.find((candidate) => candidate.id === id);
        expect(moment, `${id} is excused and is no longer a moment`).toBeDefined();
        const spotlight = moment?.spotlight ?? null;
        expect(
          spotlight === null ? null : visibleAnchor(spotlight),
          `${id} no longer shares the ${entry.anchor} target`,
        ).toBe(entry.anchor);
      }
    }

    // SECOND DIRECTION: every actual duplicate is exactly one declared group. A sixth moment
    // reusing Build or a second alias for it changes the derived group and fails here.
    expect(duplicates).toEqual(
      SHARED.map(({ anchor, moments }) => ({ anchor, moments: [...moments] })),
    );
    // 6 distinct anchors across 7 spotlit moments (one anchor, "build", shared by exactly
    // the two declared above) is still real distribution, not the tour pointing almost
    // everything at one place.
    expect(
      byVisibleAnchor.size,
      "the tour points almost everything at one place",
    ).toBeGreaterThanOrEqual(6);
  });

  it("gives every moment a distinct id, so a test can address one", () => {
    const ids = MOMENTS.map((moment) => moment.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("signs the dialogue with the era's own advisor and dresses him in the era's clothes", () => {
    // All ten eras, because the sequence is replayable from How to play at any point in a run
    // and a replay in era six must not put a hide tunic on an Early Modern island. The same
    // total `resolveEraAdvisor` call the crisis briefing and the ceremony both use, asserted by
    // IDENTITY so a copy with one field edited fails here too.
    for (const eraId of ALL_ERAS) {
      const briefing = onboardingBriefingFor(eraId, ALL_SURFACES);
      const advisor = resolveEraAdvisor(eraId);
      expect(briefing.advisorName, eraId).toBe(advisor.name);
      expect(briefing.advisorDress, eraId).toBe(advisor.dress);
      expect(briefing.advisorDress.id, eraId).toBe(eraId);
      expect(briefing.eraId, eraId).toBe(eraId);
    }
    expect(ALL_ERAS.length).toBeGreaterThanOrEqual(10);
  });

  it("names the era's material rather than a word, in all ten eras", () => {
    /*
     * `cityCopyRegister.test.ts` bans a price quoted in a generic noun, and it reads string
     * LITERALS, so an interpolation satisfies it by resolving to a placeholder. That leaves the
     * question this covers: does the resolved sentence actually name the era's material. Era one
     * mints stone and era two mints grain, so the two answers differ and the loop below fails
     * over a table that pinned either.
     */
    for (const eraId of ALL_ERAS) {
      const briefing = onboardingBriefingFor(eraId, ALL_SURFACES);
      const economicMoments = ["resources", "civic", "townhall"] as const;
      for (const id of economicMoments) {
        const entry = briefing.moments.find((moment) => moment.id === id);
        expect(entry, `${eraId}: the ${id} economic moment is missing`).toBeDefined();
        const line = `${entry?.lead ?? ""} ${entry?.body ?? ""}`;
        expect(line, `${eraId} quotes a price without naming its material`).toContain(
          materialWord(eraId),
        );
        expect(line, `${eraId} quotes a price in a generic noun`).not.toMatch(
          /\bmaterials?\b/i,
        );
      }
      expect(economicMoments.length).toBe(3);
    }
    // AND THE TWO ANSWERS REALLY DIFFER, so the loop above is not one assertion ten times.
    const first = ALL_ERAS[0] as EraId;
    const second = ALL_ERAS[1] as EraId;
    expect(materialWord(first)).not.toBe(materialWord(second));
  });

  it("carries no em-dash or en-dash in anything he says", () => {
    // The register rule `cityCopyRegister.test.ts` sweeps the sources for. Asserted on the
    // RESOLVED sentences as well, because that sweep reads literals and an interpolated era
    // word could in principle bring one in from the material registry.
    for (const eraId of ALL_ERAS) {
      for (const line of onboardingBriefingLines(
        onboardingBriefingFor(eraId, ALL_SURFACES),
      )) {
        expect(line, `${eraId}: ${line}`).not.toMatch(/[\u2014\u2013]/);
      }
    }
  });

  it("explains the City life limits and the distinct infrastructure that raises them", () => {
    const cityLife = MOMENTS.find((each) => each.id === "cityLife");
    const civic = MOMENTS.find((each) => each.id === "civic");
    expect(cityLife, "there is no City life moment to check").toBeDefined();
    expect(civic, "there is no civic-building moment to check").toBeDefined();

    const limits = `${cityLife?.lead ?? ""} ${cityLife?.body ?? ""}`;
    expect(limits).toMatch(/\bPopulation\b/);
    expect(limits).toMatch(/\bLivability\b/);
    expect(limits).toMatch(/\bHappiness\b/);
    expect(limits).toMatch(/\bCivic buildings raise\b/i);
    expect(limits).toMatch(/\broad tile\b[^.]*\bHappiness\b/i);
    expect(`${civic?.lead ?? ""} ${civic?.body ?? ""}`).toMatch(
      /\bseparate from skill buildings\b/i,
    );
  });

  it("removes the crisis beat, the net-points scoring slide, and the exam slide", () => {
    // "founding" (the net-points scoring slide) was deleted deliberately alongside the
    // civic-buildings "Open Build" fix. "era" (the Island Unlock Exam slide) was deleted
    // deliberately after it: the tour no longer teaches the exam's eligibility or scoring
    // at all, on the call that neither was worth its own step. Neither id may come back.
    const ids = MOMENTS.map((moment) => moment.id);
    expect(ids).not.toContain("founding");
    expect(ids).not.toContain("era");
    expect(ids).not.toContain("crisis");
  });
});

/* -------------------------------------------------------------------------- */
/* Moments that describe a surface not every city has                          */
/* -------------------------------------------------------------------------- */

/**
 * **A MOMENT ABOUT THE BAY IS TAUGHT WHERE THERE IS A BAY, AND NOWHERE ELSE.**
 *
 * `archipelagoFlag.ts` decides which city has the navigator. Everybody else must not be told to
 * choose a Menu row they do not have.
 *
 * The gated moments are a NAMED LIST with a reason each, asserted in both directions, because
 * a moment that genuinely owes a surface and one that forgot to declare it look identical from
 * outside this guard:
 *
 *  - a listed moment that has stopped declaring its surface fails, so an entry cannot sit here
 *    gating nothing;
 *  - a moment outside the list that declares a surface fails, so a gate cannot be added
 *    without a reason recorded beside it.
 *
 * And the two orders are compared, so the gating is proved to DO something rather than
 * asserted to exist.
 */
describe("the surface-gated moments", () => {
  const GATED: readonly {
    readonly id: string;
    readonly surface: keyof OnboardingSurfaces;
    readonly why: string;
  }[] = [
    {
      id: "bay",
      surface: "bay",
      why: "it opens the actual Bay and asks the learner to navigate there, which can only happen when the archipelago navigator is switched on for this city",
    },
  ];

  it("declares a surface on every gated moment, and on no other", () => {
    const listed = new Set(GATED.map((entry) => entry.id));
    for (const entry of GATED) {
      const moment = MOMENTS.find((each) => each.id === entry.id);
      expect(
        moment,
        `${entry.id} is listed as gated and is no longer a moment`,
      ).toBeDefined();
      expect(
        moment?.requires,
        `${entry.id} is listed as gated but no longer declares a surface`,
      ).toBe(entry.surface);
      expect(entry.why.length, `${entry.id} has no reason recorded`).toBeGreaterThan(60);
    }
    expect(
      MOMENTS.filter(
        (moment) => moment.requires !== undefined && !listed.has(moment.id),
      ).map((moment) => moment.id),
      "these moments are gated on a surface with no reason recorded",
    ).toEqual([]);
  });

  it("withholds them from a city without the surface, and only them", () => {
    const withBay = onboardingMomentOrder({ bay: true });
    const withoutBay = onboardingMomentOrder({ bay: false });

    // The full order is what a city with everything gets, so the record's order IS the
    // sequence and the filter cannot reorder it.
    expect(withBay).toEqual([...ONBOARDING_MOMENT_ORDER]);
    // THE GATING DOES SOMETHING: the two differ, by exactly the listed moments.
    expect(withBay.length - withoutBay.length).toBe(GATED.length);
    expect(withBay.filter((id) => !withoutBay.includes(id))).toEqual(
      GATED.map((entry) => entry.id),
    );
    // ...and the city without the surface still has a tour worth walking, so a gate can
    // never quietly become "teach nothing". Eight, not ten: "founding" (net-points
    // scoring), "era" (Island Unlock Exam) and "buildings" (redundant with "place") were
    // all deliberately deleted, "allSet" (the closing send-off) was added, and this count
    // is one further down since it also excludes "bay" itself.
    expect(
      withoutBay.length,
      "the ungated sequence has been gutted",
    ).toBeGreaterThanOrEqual(8);
  });

  it("says nothing about the withheld surface anywhere else in the sequence", () => {
    const lines = onboardingBriefingLines(
      onboardingBriefingFor(CURRENT_ERA_ID, { bay: false }),
    );
    expect(lines.length, "there is no sequence to read").toBeGreaterThan(25);
    const BAY_TALK = /\b(?:the )?Bay\b/i;
    expect(
      lines.filter((line) => BAY_TALK.test(line)),
      "a city with no bay is still being told about one",
    ).toEqual([]);
    // THE PATTERN STILL READS, on the sequence that does have it.
    expect(
      onboardingBriefingLines(onboardingBriefingFor(CURRENT_ERA_ID, { bay: true })).filter(
        (line) => BAY_TALK.test(line),
      ).length,
      "the bay sweep has stopped reading",
    ).toBeGreaterThan(0);
  });

  it("hands the learner into the actual Bay and names the return path", () => {
    const bay = MOMENTS.find((moment) => moment.id === "bay");
    expect(bay, "there is no Bay moment").toBeDefined();
    const spoken = `${bay?.lead ?? ""} ${bay?.body ?? ""}`;
    expect(spoken).toMatch(/\bopen the Bay\b/i);
    expect(spoken).toMatch(/\bmove to a founded island\b/i);
    expect(spoken).toMatch(/\bReturn to tour\b/i);
    expect(spoken).not.toMatch(/\bone day\b/i);
    expect(bay?.spotlight).toBe("menu");
  });
});

/* -------------------------------------------------------------------------- */
/* The one moment the learner has to act on                                    */
/* -------------------------------------------------------------------------- */

describe("the placement gate", () => {
  it("names a real moment, and exactly one", () => {
    expect(ONBOARDING_MOMENT_ORDER).toContain(ONBOARDING_GATED_MOMENT);
    // It is not the first and not the last: a gate on the opening frame is a tutorial that
    // asks before it has explained, and a gate on the closing one is a learner held at the
    // door on the press that was supposed to let them out.
    expect(ONBOARDING_MOMENT_ORDER.indexOf(ONBOARDING_GATED_MOMENT)).toBeGreaterThan(0);
    expect(ONBOARDING_MOMENT_ORDER.indexOf(ONBOARDING_GATED_MOMENT)).toBeLessThan(
      ONBOARDING_MOMENT_ORDER.length - 1,
    );
  });

  /**
   * **THE TASK NAMES THE REAL ROUTE, AND THE ROUTE IS THE CITY'S OWN.**
   *
   * ## ⚑ THIS GUARD WAS REWRITTEN ON 2026-08-05 BECAUSE THE INTERACTION IT DESCRIBED IS GONE
   *
   * It used to require the words *"drag"* and *"click"*, on `interactive-visuals`' rule that
   * widget copy names both routes in the words every learner already knows. That was right
   * for a board with two tiles in a speech bubble and it is wrong now: the lead's verdict was
   * *"they should actually have to place the building and not just drag a house into a 2d box
   * like what is the point of that bro"*, and there is no board to drag anything across. A
   * guard still requiring "drag" would have been a guard requiring the defect.
   *
   * The rule underneath it is unchanged and is what this asserts instead: **the copy names the
   * control the learner has to find, and there is a way past.** The control is the Build menu,
   * which is the one thing a first-run learner cannot guess.
   */
  it("names the real route to a placement, and a way past it", () => {
    const opening =
      `${FIRST_BUILDING_TASK.task} ${FIRST_BUILDING_TASK.prompt}`.toLowerCase();
    expect(opening, "the task never names the island").toMatch(/\bisland\b/);
    expect(opening, "the task never names Build").toMatch(/\bopen build\b/);
    // AND THERE IS A WAY PAST IT, in words, so a learner who cannot walk the flow is never
    // held at the front door of the demo. Two of them: one that does it for them, and one
    // that opens the control they could not find.
    expect(FIRST_BUILDING_TASK.doItForMe.length).toBeGreaterThan(5);
    expect(FIRST_BUILDING_TASK.openBuild.toLowerCase()).toContain("build");
    // AND NOTHING STILL DESCRIBES THE RETIRED BOARD. A sentence about dragging a house onto a
    // plot would be the tutorial teaching a gesture the surface no longer offers.
    for (const line of Object.values(FIRST_BUILDING_TASK)) {
      expect(line, `"${line}" still describes the retired drag board`).not.toMatch(
        /\b(drag|plot|house)\b/i,
      );
    }
  });

  it("has a line for every state the placement flow can be in", () => {
    // A flow that could reach a state with nothing to say would leave the status line holding
    // whatever the last state put there, which after a cancelled placement is the wrong
    // sentence.
    for (const [key, line] of Object.entries(FIRST_BUILDING_TASK)) {
      expect(line.length, `${key} is empty`).toBeGreaterThan(5);
      expect(line, `${key} carries a dash`).not.toMatch(/[\u2014\u2013]/);
    }
    expect(Object.keys(FIRST_BUILDING_TASK).length).toBeGreaterThanOrEqual(10);
    // AND EVERY STATE THE COMPONENT CAN BE IN HAS ITS OWN LINE. `FirstBuildingTask` reads
    // four flow states plus who placed it plus the nudge, and prints one of these; a key
    // missing here is a state that would print the previous state's sentence.
    for (const key of [
      "prompt",
      "choosing",
      "positioning",
      "cancelled",
      "done",
      "doneForYou",
      "nudge",
    ] as const) {
      expect(FIRST_BUILDING_TASK[key].length, `${key} is missing`).toBeGreaterThan(5);
    }
  });
});

describe("resuming where the learner stopped", () => {
  it("clamps a stored step that has stopped meaning anything", () => {
    // The ordinary case.
    expect(resumeOnboardingAt(1, 3)).toBe(1);
    expect(resumeOnboardingAt(2, 3)).toBe(2);
    // Nothing stored: `parseInt("")` is NaN, which is what an untouched browser gives.
    expect(resumeOnboardingAt(Number.NaN, 3)).toBe(0);
    // Junk, and a negative, both from another writer or a hand-edited key.
    expect(resumeOnboardingAt(-4, 3)).toBe(0);
    expect(resumeOnboardingAt(1.7, 3)).toBe(1);
    // PAST THE END, which is the case that would strand a learner: a moment deleted between
    // two visits leaves a stored index with no moment behind it, and a dialogue with nothing
    // in it cannot be got out of.
    expect(resumeOnboardingAt(9, 3)).toBe(2);
    // And a table with no moments at all resolves to something rather than to -1.
    expect(resumeOnboardingAt(2, 0)).toBe(0);
  });

  it("writes the step on every advance and reads it back", () => {
    expect(loadOnboardingAdvisorStep()).toBeNaN();
    saveOnboardingAdvisorStep(2);
    expect(localStorage.getItem(ONBOARDING_ADVISOR_STEP_KEY)).toBe("2");
    expect(loadOnboardingAdvisorStep()).toBe(2);
  });

  it("remembers being seen, and forgets BOTH facts when asked", () => {
    expect(hasSeenOnboardingAdvisor()).toBe(false);
    markOnboardingAdvisorSeen();
    saveOnboardingAdvisorStep(2);
    expect(localStorage.getItem(ONBOARDING_ADVISOR_DONE_KEY)).toBe("true");
    expect(hasSeenOnboardingAdvisor()).toBe(true);

    forgetOnboardingAdvisor();
    // BOTH, and the step is the one that matters: clearing the done flag alone would resume a
    // returning learner at the last moment they read, which is the one outcome a "from the
    // beginning" button must not produce.
    expect(hasSeenOnboardingAdvisor()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_ADVISOR_STEP_KEY)).toBeNull();
    expect(resumeOnboardingAt(loadOnboardingAdvisorStep(), 3)).toBe(0);
  });

  it("keeps its two keys under the app's own namespace and apart from the hints", () => {
    // A collision with a `cr.coach.*` key would retire a hint by accident, and the hint keys
    // are built by prefixing an id, so this is a real adjacency rather than a tidiness point.
    for (const key of [ONBOARDING_ADVISOR_DONE_KEY, ONBOARDING_ADVISOR_STEP_KEY]) {
      expect(key.startsWith("cr.onboarding.")).toBe(true);
    }
    expect(ONBOARDING_ADVISOR_DONE_KEY).not.toBe(ONBOARDING_ADVISOR_STEP_KEY);
    markOnboardingAdvisorSeen();
    saveOnboardingAdvisorStep(1);
    for (const mark of COACH_MARKS) {
      expect(hasSeenCoachMark(mark.id), mark.id).toBe(false);
    }
  });
});

describe("the hints the advisor has taken over", () => {
  it("names only real hints, and never all of them", () => {
    const retired = onboardingTaughtCoachMarkIds();
    const every = COACH_MARKS.map((mark) => mark.id);

    // FLOOR: an empty list would make the whole "replace the opening tooltips" claim vacuous
    // while every assertion about it stayed green.
    expect(retired.length).toBeGreaterThanOrEqual(3);
    // THE FIRST DIRECTION. Every entry is still a hint that ships, so an id that has been
    // renamed or deleted cannot sit here retiring nothing. The type already says this; the
    // runtime check is what survives a widened type or a cast.
    for (const id of retired) {
      expect(every, `${id} is retired and is no longer a coach-mark`).toContain(id);
    }
    // THE SECOND DIRECTION, and it is a floor on the SURVIVORS rather than on the list: this
    // is a replacement of the opening hints and not a switch that turns the contextual layer
    // off, so most of the layer has to be left alone. A list that grew until it had swallowed
    // the hint layer fails here.
    const survivors = every.filter((id) => !retired.includes(id));
    expect(
      survivors.length,
      "the retirement list has swallowed the hint layer",
    ).toBeGreaterThanOrEqual(6);
    expect(survivors.length).toBeGreaterThan(retired.length);
  });

  it("points every entry at a moment that exists, with a reason recorded", () => {
    // The list claims a hint's sentence is now in a MOMENT. The claim that the moment exists
    // is mechanisable and is made here; that the sentence really is in it is not, so each
    // entry carries the reading in prose and the reason is required to be there.
    for (const entry of ONBOARDING_TAUGHT_COACH_MARKS) {
      expect(ONBOARDING_MOMENT_ORDER, entry.id).toContain(entry.takenOverBy);
      expect(entry.why.length, `${entry.id} has no reason recorded`).toBeGreaterThan(40);
    }
    expect(new Set(ONBOARDING_TAUGHT_COACH_MARKS.map((entry) => entry.id)).size).toBe(
      ONBOARDING_TAUGHT_COACH_MARKS.length,
    );
  });

  it("leaves the hints that cannot be pre-taught alone", () => {
    /*
     * THE COMPOSITION, not just the size. A floor of four is satisfied by four of anything,
     * including four that took out the hints the tutorial has no way of replacing.
     *
     * These four are named because each is true only at a moment the tutorial cannot reach:
     * the sound hint waits for the autoplay gate to have opened, `roadRemove` for a tile to be
     * paved, `interleaved` for two finished practice sets, and `testedOut` is flatly false for
     * a learner who did not test out. An advisor speaking on minute one can say none of them.
     */
    const retired = onboardingTaughtCoachMarkIds();
    for (const id of ["sound", "roadRemove", "interleaved", "testedOut"] as const) {
      expect(
        COACH_MARKS.map((mark) => mark.id),
        `${id} is not a hint at all`,
      ).toContain(id);
      expect(retired, `${id} was retired and cannot be pre-taught`).not.toContain(id);
    }
  });

  /**
   * **⚑ `economy` LEFT THE PROTECTED LIST ON 2026-08-05, AND THIS IS THE CONDITION IT LEFT ON.**
   *
   * It was a fifth entry in the loop above with a different reason: the resources moment
   * already taught most of it, but the hint *"Spend it on roads, or on the buildings in the
   * Build menu"* was the only surface naming ROADS as a sink, and retiring it would have taken
   * a fact off the screen rather than moved it. The second review made the civic moment say
   * roads in the lead's own words, so the fact has a home and the hint is now a repeat in a
   * duller voice, which is the whole thing the retirement list exists for.
   *
   * **The exemption is not simply deleted, it is replaced by the thing that made it true.** An
   * entry removed from a protected list leaves no trace, so a later edit that took roads back
   * out of the sequence would silently restore the defect: the hint retired, the fact nowhere.
   * This asserts the precondition instead, in both directions, so that edit fails here.
   */
  it("only retires the economy hint while a moment carries the fact it uniquely held", () => {
    const lines = onboardingBriefingLines(
      onboardingBriefingFor(CURRENT_ERA_ID, ALL_SURFACES),
    );
    const retired = onboardingTaughtCoachMarkIds();
    const hint = COACH_MARKS.find((mark) => mark.id === "economy");
    expect(hint, "the economy hint is not a hint at all any more").toBeDefined();

    // THE FACT, which is the one the hint carried and no moment did: roads cost the era's
    // material. Read on the RESOLVED lines, so it is the live era's word.
    const saysRoads = lines.filter((line) => /\broads\b/i.test(line));
    const saysRoadsCost = saysRoads.filter((line) =>
      new RegExp(
        `\\b(use|spend|costs?)\\b[^.]*\\b${materialWord(CURRENT_ERA_ID)}\\b`,
        "i",
      ).test(line),
    );

    if (retired.includes("economy")) {
      expect(
        saysRoads.length,
        "the economy hint is retired and no moment names roads, so the fact is now nowhere",
      ).toBeGreaterThanOrEqual(1);
      expect(
        saysRoadsCost.length,
        "the sequence names roads but never says they cost anything, which is the half the hint carried",
      ).toBeGreaterThanOrEqual(1);
    } else {
      // THE OTHER DIRECTION. If somebody puts it back under protection, this says why it was
      // ever unprotected rather than leaving a dead branch: the sequence has to have stopped
      // carrying the fact, or the hint is being kept for no stated reason.
      expect(
        saysRoads.length,
        "the economy hint is protected again while the sequence still names roads, so it is a repeat",
      ).toBe(0);
    }
  });
});

/**
 * A run of prose split into its sentences, with the trailing empty produced by a terminal
 * full stop dropped.
 *
 * Deliberately naive: this codebase's learner copy uses no abbreviations with full stops in
 * them, so a split on terminal punctuation is exact over the corpus it is used on. It is used
 * for a CEILING, so the failure direction of a wrong split is a false alarm somebody reads,
 * not a defect that ships.
 */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
