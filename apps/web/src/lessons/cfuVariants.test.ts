/**
 * What a converted check actually serves, and what the unconverted ones are still owed.
 *
 * `cfuVariantRetry.browser.test.tsx` drives the surface: reveal, re-ask, and the answer the
 * passage printed no longer grades. This file holds open the two claims underneath it that a
 * walk through the DOM cannot see, plus an inventory of the packs that have not been done.
 *
 *  1. THE COMPUTED LIST IS NOT NARROWER THAN THE AUTHORED ONE. The check grades by exact match
 *     and never consults the shared checker, because the shipped lists accept LaTeX and the
 *     root glyph that the checker refuses as `invalid_input`. That is a deliberate constraint,
 *     and the obligation it creates is that a computed list carries what a hand-written one
 *     did. Each pack's own speller is run over the pack's OWN authored parameters and every
 *     authored spelling has to come back.
 *
 *  2. A VARIANT CHANGES THE ANSWER. Distinctness by item hash is satisfied by a rewording that
 *     lands on the same answer, and a re-ask like that is #224's defect in a disguise, so what
 *     is asserted is stronger: no two instances of one check share a single accepted spelling.
 *
 *  3. THE GENERATOR HAS SOMEWHERE TO GO. Claim 2 is about the two questions served and cannot
 *     see the size of the space they were drawn from, and at a space of two the enforcement in
 *     claim 2 is what makes the re-ask predictable: the authored question speaks one answer, so
 *     the other is the only draw left. The last block measures the space instead of the draw.
 */

import { generateFromTemplate } from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { cfuKeypad, normalizeAcceptedAnswer } from "./answerFormat";
import {
  CFU_CHECKER_VERSION,
  cfuChecker,
  cfuItemVersionId,
  gradeCfuAnswer,
} from "./cfuChecker";
import { cfuInstances, cfuSpell, cfuVariantTemplate, hasCfuSpeller } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuSpec } from "./types";

const CHECKS = allLessons
  .filter((lesson) => lesson.cfu !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const);

const CONVERTED = CHECKS.filter(([, cfu]) => cfu.variants !== undefined);

/**
 * The authored parameters of each converted check's own question.
 *
 * A fixture, and the only one in this file: the authored question is hand-written prose and was
 * never a template draw, so there is nothing to read the parameters off. What they are used
 * FOR is not a fixture at all -- the accepted list they are checked against is read from the
 * shipped pack -- so a wrong entry here fails rather than agreeing with itself.
 *
 * What it must NOT be is its own population. The agreement assertion below used to run over
 * `Object.keys(AUTHORED_PARAMS)`, which is a list counting itself: EL.6 converted with no entry
 * here, so the one assertion proving a re-ask accepts everything the authored question accepted
 * never ran for it, and nothing went red. The population is the tree's converted checks now, and
 * the census beside it fails in both directions, so a pack arriving without an entry fails here
 * instead of quietly stepping outside the sweep.
 */
const AUTHORED_PARAMS: Readonly<Record<string, Record<string, number>>> = {
  // -8 + 6 = -2: a withdrawal of 8 dollars, then a deposit of 6.
  "NUM.S": { a: 8, b: 6, sa: 1, sb: 0 },
  // 3(x + 4), the first variable letter.
  "NUM.3": { a: 3, b: 4, varIndex: 0, order: 0 },
  // 20% of 30 dollars.
  "NUM.5": { p: 20, base: 30 },
  // -5(2x - 3)(x + 1)^3: the degrees add to 4 and the coefficients multiply to -10.
  "POL.6": {
    outer: -5,
    inner: 2,
    shift: 3,
    root: -1,
    multiplicity: 3,
    degree: 4,
    lead: -10,
  },
  // (x + 2)^4(x - 5)^3(x - 1), asked at x = -2, which is the first factor's zero.
  "POL.7": { r0: -2, r1: 1, r2: 5, m0: 4, m1: 1, m2: 3, asked: 0 },
  // 5(x + 2)^2 - 7, asked for its y-intercept: at x = 0 the bracket is 2, so 5 * 4 - 7 = 13.
  // The `a` of five is outside the practice template's own range, which is the case the
  // speller and the figure both have to be computed rather than looked up for.
  "POL.5": { a: 5, h: -2, k: -7, value: 13 },
  // (-3, 7) to (5, 3): a run of 8, a rise of -4, so a falling line.
  "LF.1": { x1: -3, y1: 7, dx: 8, dy: -4, kind: 2 },
  // The system's solution, (2, -3).
  "LF.4": { elim: 0, x0: 2, y0: -3 },
  // 125 is 25 to the three halves.
  "RAD.3": { value: 125 },
  // Four ingots less 5 balancing one plus 22, so one ingot is 9. It was 7, and moved because the
  // numeric answer field reads "A single number, e.g. 7": see `cfuPlaceholderLeak.test.ts`.
  "LIN.1": { weight: 9 },
  // A melt finishing at 57 from 44 of copper with 2 lost, so 15 of tin.
  "LIN.3": { tin: 15 },
  // 7x + 6 <= 34 solves to x <= 4: a downward ray with its endpoint taken in.
  "LIN.4": { bound: 4, closed: 1, upward: 0 },
  // |w - 45| = 6, so the two branches are 39 and 51.
  "LIN.5": { centre: 45, distance: 6 },
  // |x - 20| < 5, a band from 15 to 25 with neither end taken in.
  "LIN.6": { centre: 20, tolerance: 5, closed: 0 },
  // The template writes its denominator as `x + p`, so the check's `x - 2` is p = -2. Its
  // quadratic then factors as `(x - 2)(x - 3)`, which is exactly the authored equation: the
  // root is 3 and the candidate 2 is the excluded value the algebra invented.
  "RAT.6": { p: -2, r: 3 },
  // Perpendicular to a slope of 1/3 through (-2, 5): slope -3, intercept -1.
  "LF.2": { m: -3, c: -1 },
  // 4096 falling by a quarter a step leaves 16 two steps past 256.
  "EL.1": { m: 16 },
  // Three to the fifth is 243.
  "EL.3": { k: 5 },
  // 3 log 2 + log y: the coefficient lands on 2^3 = 8, and `y` is index 1.
  "EL.5": { base: 2, power: 3, symIndex: 1, value: 8 },
  // 15 - 2 * 3^2 = -3.
  "NUM.2": { lead: 15, factor: 2, base: 3, power: 2, value: -3 },
  // -2x + x^2 + 7x: the two linear terms total 5, on the first variable letter.
  "NUM.4": { varIndex: 0, negative: -2, positive: 7, total: 5 },
  // (2/5)(5/6) = 1/3.
  "NUM.F": { a: 2, b: 5, c: 5, e: 6, n: 1, d: 3 },
  // (x^2)^3 * x^-8 = x^-2, so the answer's power is 2.
  "EXP.1": { varIndex: 0, inner: 2, outer: 3, power: 2 },
  // sqrt(72/25) = 6*sqrt(2)/5.
  "RAD.1": { outside: 6, inside: 2, root: 5 },
  // (sqrt(18) + sqrt(8))/sqrt(5): three and two copies of root 2 over root 5, so root 10.
  "RAD.2": { shared: 2, first: 3, second: 2, bottom: 5, inside: 10 },
  // sqrt(36 x^6) = 6|x^3|: the even exponent halves to an odd 3, which is why it needs bars.
  "RAD.4": { varIndex: 0, coefficient: 6, half: 3 },
  // (x^2 - 64)/(x^2 - 3x - 40): the cancelled factor is (x - 8) and the survivor is (x + 5).
  "RAT.1": { a: 8, b: 5 },
  // (x^2 - 49)/((x + 6)(x + 4)) divided by (x - 7)/(x + 6).
  "RAT.2": { a: 7, b: 6, c: 4 },
  // 3/(x - 1) - 2/(x + 4): the tops are one apart, so the collected numerator is x + 14.
  "RAT.3": { p: 3, q: 2, r: 1, s: 4, constant: 14 },
  // The complex fraction clears to 5/(4x).
  "RAT.4": { d: 4, n: 5 },
  // 3(x - 4)(x + 1) over (x - 4)(x - 1): a hole at (4, 5), an asymptote at x = 1, y = 3.
  "RAT.5": { lead: 3, hole: 4, other: 1, vertical: 1, height: 5 },
  // 320 liters draining at 15 a minute, read at minute 12.
  "LF.3": { rate: 15, minutes: 12, start: 320, left: 140 },
  // 4^x reflected and lifted 5, so the asymptote is y = 5 and the anchor lands at (0, 4).
  "EL.2": { base: 4, shift: 5, anchor: 4 },
  // log(9 - x): the domain stops at 9 and the asymptote stands there.
  "EL.4": { bound: 9 },
  // (x + 6)(2x + 1) = 2x^2 + 13x + 6. The template writes both sides with a coefficient, so
  // the check's monic first side is a = 1: the speller multiplies out from the four numbers
  // rather than reading the answer, which is what makes this the pack's own parameters.
  "POL.1": { a: 1, b: 6, c: 2, d: 1 },
  // 2x^2 + 2x - 24 = 2(x + 4)(x - 3): the common measure is 2 and the roots differ in sign.
  "POL.2": { k: 2, plus: 4, minus: 3 },
  // x(x + 2) = 35, gathered at zero and factored, so the roots are -7 and 5.
  "POL.3": { gap: 2, root: 5, low: -7, high: 5, area: 35 },
  // 2x^2 + 5x - 12 = 0 through the formula: the roots are -4 and the exact fraction 3/2.
  "POL.4": { a: 2, p: 3, q: 4, b: 5, c: -12 },
  // (x^3 - 4x^2 + x + 6) / (x - 3), whose quotient is x^2 - x - 2.
  "POL.8": { r: 3, m: -1, n: -2, b: -4, c: 1, d: 6 },
  // log_2 x + log_2(x - 6) = 4 condenses to x(x - 6) = 16, whose roots are 8 and -2. The shift
  // is the difference of the two, so the pack's equation is fixed by the roots alone.
  "EL.6": { base: 2, exponent: 4, kept: 8, rejected: 2 },
  // A 30 by 40 foundation modelled at one tenth. The speller squares and adds the two sides
  // before dividing, so this fixture carries the rectangle rather than its diagonal: an entry
  // naming 50 would be restating the speller's own working instead of the pack's question.
  "GEO.1": { a: 30, b: 40, n: 10 },
  // An 8 by 5 by 2 cistern, open at the top: 40 of floor, 32 and 20 of walls, and no lid.
  "GEO.2": { l: 8, w: 5, d: 2 },
  // D6, the Gearwright's Menagerie. Every entry carries the pack's own QUESTION and lets the
  // speller recompute the answer, for the reason GEO.1's note gives: a fixture naming the
  // midpoint or the rate would be restating the speller's working back to it.
  //
  // The line crosses six paces LEFT of the bench mark and eight above it, so its two
  // intercepts are (-6, 0) and (0, 8).
  "CG.1": { a: -6, b: 8 },
  // f(x) = 4x - 7 read at -3, beside a log whose setting 2 carries two different motions.
  "FUN.1": { m: 4, c: -7, n: -3, value: -19, isFunction: 0 },
  // 12 - sqrt(x - 3): a root under a subtraction, so the ceiling is 12 and the outputs run
  // downward from it. `upward: 0` is that direction and `useAbs: 0` the inner shape.
  "FUN.2": { upward: 0, useAbs: 0, bound: 12, inner: 3 },
  // 7t below five tons and 4t + 18 from five tons up, read at five tons and at two.
  "FUN.3": { breakAt: 5, rateLow: 7, rateHigh: 4, standing: 18, light: 2 },
  // A chart opening at 4, peaking at 9 by hour three, down to 2 by hour eight and off the end
  // at 11 by hour twelve. The peak is a LOCAL maximum only, which is the question.
  "FUN.4": { h1: 3, h2: 8, h3: 12, r0: 4, r1: 9, r2: 2, r3: 11 },
  // Three marks: 4 units at hour zero, 28 at hour three, 16 at hour six.
  "FUN.5": { t1: 3, t2: 6, v0: 4, v1: 28, v2: 16 },
  // 2x^2 - 3x + 5 at x = 4. The speller forms 2ap + b itself, so the fixture is the rule.
  "FUN.6": { a: 2, b: -3, c: 5, p: 4 },
  // f(x) = 3x + 8 after g(x) = x^2 - 4, evaluated at 5.
  "FUN.7": { a: 3, b: 8, k: -4, n: 5, value: 71 },
  // f(x) = (x + 5)/4, so the inverse is 4x - 5 and it is used at 3.
  "FUN.8": { m: 4, c: 5, v: 3 },
  // An ODD trace logged at f(4) = 9, replayed at double gain, lifted five and started an hour
  // late. The asked input is shift - logged = -3, which is what makes the parity load-bearing.
  "FUN.9": { even: 0, gain: 2, shift: 1, lift: 5, logged: 4, height: 9 },
  // -2|x - 6| + 10: a downward vee, so the height at its corner is a maximum.
  "FUN.10": { stretch: -2, h: 6, k: 10 },
  // D9, trigonometry. Each entry carries the pack's own question for the same reason as the
  // D6 block above: the speller recomputes the answer, so a fixture naming it would be
  // restating the speller's working back to it.
  //
  // A sweep stopping at 405 degrees, which is one whole turn past 45. The speller converts
  // that 45 itself, so this fixture carries the heading and not the pi/4 it becomes.
  "TRG.1": { base: 45, turns: 1 },
  // A wire meeting the mast at 30 degrees with the pad 20 meters out along the deck, and the
  // wire is what the question asks for.
  "TRG.2": { masthead: 30, given: 20, asksWire: 1 },
  // The reading at 240 degrees. The pack asks for the HORIZONTAL reach, which is the cosine,
  // so isSine is 0 and the speller reads the sign off the quadrant rather than being handed it.
  "TRG.3": { isSine: 0, deg: 240 },
  // sin = -4/5 in the third quadrant: the leg opposite is 4, the leg adjacent 3, and the
  // quadrant is what makes the tangent positive.
  "TRG.4": { opposite: 4, adjacent: 3, hyp: 5, quadrant: 3, givenSine: 1 },
  // y = 3 sin(2x) - 1, asked for the largest value, so the answer is the midline plus the
  // amplitude rather than either one of them.
  "TRG.5": { amplitude: 3, coefficient: 2, midline: -1, wantsMax: 1, isSine: 1 },
  // y = tan(3x), with no coefficient out in front, so the outside is 1.
  "TRG.6": { outside: 1, inside: 3 },
  // arccos(cos 300), which the speller resolves as 360 - 300 rather than reading 60 back.
  "TRG.7": { kind: 0, deg: 300 },
  // 2 sin x + 1 = 0: a sine, a reference angle of 30, and a negative value, which places the
  // roster in the third and fourth quadrants and puts the larger heading at 330.
  "TRG.8": { isSine: 1, reference: 30, negative: 1 },
  // sin = 3/5 in the first quadrant, so cos 2t is (25 - 18)/25. The quadrant is carried
  // because the pack states one, and the speller ignores it exactly as the arithmetic does.
  "TRG.9": { opposite: 3, adjacent: 4, hyp: 5, quadrant: 1, givenSine: 1 },
};

/**
 * Every check that has NOT been converted, with the reason.
 *
 * Empty, and kept rather than deleted, because an empty exception list is a claim the census
 * below asserts: every check in the tree serves a genuinely different question on its re-ask.
 * The slot stays so that a domain landing with an unconvertible check has somewhere honest to
 * say so, and so that saying so costs a reason rather than a silence.
 *
 * There were 26 entries here, in two kinds, and the split is worth keeping as the record of how
 * the rollout went rather than as live inventory:
 *
 *   "pool twin"  the node's pool already held a template asking this check's question, so the
 *                conversion was a `template_id` and a speller. Eleven of them, and ten were
 *                mechanical. EL.5 was filed here and was not one: `d8.el5.condense-sum.l2`
 *                condenses BARE logarithms and says in its own comment that moving a
 *                coefficient inside first is the check's job, not the pool's, so the twin
 *                would have re-asked a strictly easier question and EL.5 got a generator.
 *   "no twin"    the check asked something no pool template asks, so a generator was written.
 *                Fifteen, of which nine are composites answering in two or three parts.
 *
 * There were no multiple-choice checks to exempt: measured over all 26, none carried an options
 * field (the schema has none), none asked a choice-style stem, and exactly one enumerated a
 * closed option set at all -- LF.1's three words, which is one PART of a composite answer whose
 * other part is a slope, and which is converted by rotating the subject so the correct word
 * moves.
 *
 * D4's five landed on `integration` after that and were converted the same way, which is worth
 * a line because their arrival is the argument for keeping the census rather than the list. The
 * validator requires both fields now, so those five packs failed `check:lessons` on the merge
 * rather than slipping in unconverted: a domain landing mid-flight is the ordinary case here,
 * twice over in one branch, and both times it was a gate that said so rather than a reviewer.
 * Their twins also cost a second look, because two of the three the census had named were
 * strictly EASIER than the check they would have re-asked -- see the POL.1 and POL.2 notes in
 * `cfuVariants.ts`.
 */
const NOT_YET_CONVERTED: Readonly<Record<string, string>> = {};

/**
 * The checks whose re-ask deliberately asks a DIFFERENT ANSWER SHAPE from their authored question.
 *
 * The agreement assertion below spells each pack's own authored parameters through the speller its
 * `variants.template_id` names, and requires every authored spelling back. That works because a
 * re-ask normally rotates the numbers of the same shape, so one speller describes both questions.
 * Where a node's whole point is a discrimination between two shapes, it cannot: LIN.6's authored
 * question is the towards-the-bars band and its re-ask is the away-from union, so the union
 * speller run over the band's parameters produces `(-inf, 15) U (25, inf)` and does not contain
 * the authored `(15, 25)`. That is the fix working, not the obligation failing.
 *
 * LIN.4 is here for the same reason and by the same route: its check asks a single ray and re-asks
 * `d3.lin4.compound-or.l2`, the union shape authored at the check's own tier so the re-ask is not
 * harder than the question the learner has just missed.
 *
 * So the obligation is redirected rather than dropped. Each entry names the template whose shape
 * the AUTHORED question has, and the assertion runs against that instead, which is the same claim
 * about the same list: nothing the pack hand-wrote is lost by the machinery that computes lists.
 *
 * Asserted in both directions, per `.cursor/rules/qa-verification.mdc`. An entry whose variant
 * speller HAS started covering the authored list is excusing nothing and fails; an entry naming a
 * node that is no longer a converted check fails; and an entry whose named authored-shape speller
 * does not cover the authored list fails, which is what stops the redirection from being a way to
 * point the assertion at something easier.
 */
const RE_ASK_CHANGES_SHAPE: readonly {
  node: string;
  authoredShapeTemplate: string;
  reason: string;
}[] = [
  {
    node: "LIN.4",
    authoredShapeTemplate: "d3.lin4.two-step.l2",
    reason:
      "the pack teaches that two stretches which do not touch are written as two pieces joined by a union, so the check asks a single ray and re-asks the union; the ray speller cannot spell a two-piece answer",
  },
  {
    node: "LIN.6",
    authoredShapeTemplate: "d3.lin6.band.l1",
    reason:
      "the node's stated core is which way the sign points deciding one band or two rays, so the check asks the band and re-asks the union; one speller cannot spell both shapes",
  },
];

describe("the checks that compute their own variants", () => {
  it("the sweep found the tree's checks, and the converted ones inside it", () => {
    // Floors rather than fingerprints. 38 is what the tree holds today, having been 26 when
    // this file was written: D3's five LIN packs landed mid-flight, D4's five POL packs landed
    // on the merge back, and D10's two GEO packs landed against this contract rather than
    // before it. A domain losing its checks is worth failing on and a domain gaining some only
    // raises this, but it does NOT pass silently, because the census below refuses anything on
    // neither list.
    expect(CHECKS.length, "the sweep found no checks at all").toBeGreaterThanOrEqual(38);
    expect(
      CONVERTED.length,
      "a pack has lost its variants, so a check somewhere re-asks the identical question",
    ).toBeGreaterThanOrEqual(38);
  });

  it.each(CONVERTED.map(([nodeId]) => nodeId))(
    "%s names a template that exists and a speller that is registered",
    (nodeId) => {
      const cfu = CHECKS.find(([id]) => id === nodeId)?.[1];
      const templateId = cfu?.variants?.template_id ?? "";
      expect(
        cfuVariantTemplate(templateId),
        `${nodeId} names template ${templateId}, which resolves to nothing`,
      ).toBeDefined();
      expect(
        hasCfuSpeller(templateId),
        `${nodeId} names template ${templateId}, which has no registered speller`,
      ).toBe(true);
    },
  );

  it.each(CONVERTED.map(([nodeId]) => nodeId))(
    "%s resolves as many instances as it declares",
    (nodeId) => {
      const cfu = CHECKS.find(([id]) => id === nodeId)?.[1] as LessonCfuSpec;
      const instances = cfuInstances(cfu);
      // A declaration the generator cannot fill is the quiet failure this catches: the card
      // degrades to the authored question on purpose rather than throwing at mount, so without
      // this the pack would go on claiming variants it never serves.
      expect(instances.length, `${nodeId} declares variants it cannot draw`).toBe(
        cfu.variants?.count,
      );
      expect(
        instances[0]?.authored,
        `${nodeId}'s first instance is not the authored one`,
      ).toBe(true);
      expect(instances[0]?.prompt, `${nodeId}'s authored question moved`).toBe(cfu.prompt);
      expect(instances[0]?.accepted, `${nodeId}'s authored accepted list moved`).toEqual(
        cfu.accepted,
      );
    },
  );

  it.each(CONVERTED.map(([nodeId]) => nodeId))(
    "%s: no two instances share an accepted spelling",
    (nodeId) => {
      const cfu = CHECKS.find(([id]) => id === nodeId)?.[1] as LessonCfuSpec;
      const instances = cfuInstances(cfu);
      // Per instance, so that a list's own duplicate spellings are not mistaken for a
      // collision: three of LF.4's fifteen authored entries differ only in spacing, which the
      // card normalizes away, and that is a harmless authored habit rather than a shared
      // answer. What must not happen is one instance accepting a string ANOTHER accepts.
      const perInstance = instances.map(
        (instance) => new Set(instance.accepted.map(normalizeAcceptedAnswer)),
      );
      perInstance.forEach((forms, index) => {
        for (let earlier = 0; earlier < index; earlier += 1) {
          const shared = [...forms].filter((form) =>
            (perInstance[earlier] as Set<string>).has(form),
          );
          expect(
            shared,
            `${nodeId}: instances ${earlier} and ${index} both accept these, so the answer the reveal printed is still typeable`,
          ).toEqual([]);
        }
      });
      // A floor under the assertion above, which containment over empty sets satisfies for free.
      for (const [index, forms] of perInstance.entries()) {
        expect(
          forms.size,
          `${nodeId}: instance ${index} accepts nothing at all`,
        ).toBeGreaterThan(0);
      }
      expect(perInstance.length, `${nodeId} resolved a single instance`).toBeGreaterThan(1);
    },
  );

  it.each(CONVERTED.map(([nodeId]) => nodeId))(
    "%s: every instance carries a question, an answer and the reasoning for it",
    (nodeId) => {
      const cfu = CHECKS.find(([id]) => id === nodeId)?.[1] as LessonCfuSpec;
      for (const instance of cfuInstances(cfu)) {
        // A floor on "there is a question here at all", and it has to clear the tersest real
        // prompt in the tree rather than the tersest authored one. RAD.3's draw is `Work out
        // $32^{3/5}$.`, which is twenty characters exactly: a complete question, and it
        // reddened a floor of `> 20` that had only ever seen hand-written prose. Fifteen still
        // fails an empty prompt, a bare `$x$?` or any stub, which is what this is for.
        expect(
          instance.prompt.length,
          `${nodeId}: an instance has no question`,
        ).toBeGreaterThan(15);
        expect(instance.answerKey, `${nodeId}: an instance has no answer`).not.toBe("");
        expect(
          instance.accepted[0],
          `${nodeId}: an instance accepts nothing`,
        ).toBeDefined();
        // The reveal PRINTS `answerKey` and then asks the learner to type it, so a key the
        // check would mark wrong is a reveal that teaches a wrong answer. LF.1's level line
        // failed here before the speller's canonical form became the printed one: the template
        // keyed its slope `0/1` where the check accepts `0`.
        expect(
          instance.accepted.map(normalizeAcceptedAnswer),
          `${nodeId}: the reveal prints "${instance.answerKey}", which this instance does not accept`,
        ).toContain(normalizeAcceptedAnswer(instance.answerKey));
        // The reveal prints the answer and then this, and a reveal that prints an answer with
        // nothing behind it is the one thing the mechanic must never be. The floor is the
        // shortest authored hint in the tree, which is 105 characters.
        expect(
          instance.hint.length,
          `${nodeId}: an instance's reasoning is too short to be reasoning`,
        ).toBeGreaterThan(100);
        // And it must not simply state the answer. `validateTemplates` enforces this over every
        // pooled template, but the CFU-only templates are in no pool, so nothing else would.
        expect(
          normalizeAcceptedAnswer(instance.hint).includes(
            normalizeAcceptedAnswer(instance.answerKey),
          ),
          `${nodeId}: an instance's hint states the answer it is supposed to lead to`,
        ).toBe(false);
      }
    },
  );

  it("every computed instance's answer is one a learner can actually type", () => {
    // `answerKeypad.test.ts` makes a claim like this over the AUTHORED answer of every pack,
    // which was the whole population while a check had one question. It is not any more, and the
    // gap is the kind that ships: a computed instance is a question the learner is SHOWN, its
    // canonical answer is what `WidgetReveal` prints and asks them to produce, and nothing was
    // looking at it. The population belongs to the behaviour, every question the check can serve,
    // rather than to where the questions came from.
    //
    // The rule here is "typable at all", which is wider than the sibling file's and is the right
    // one for this risk. That file asks whether the KEYPAD can write the answer and skips a card
    // offering no keys, because a numeric check deliberately gets none (its placeholder says "a
    // single number", and a key contradicting that line is the drift the shared dispatch exists
    // to prevent) and its minus sign comes from the keyboard. What a COMPUTED answer risks
    // instead is a speller reaching for a glyph no keyboard has, which would print in the reveal
    // as an answer the learner cannot produce.
    //
    // Today it covers the four spellers a canonical form actually flows through: `integerForms`
    // (NUM.S, NUM.5, and LF.1's level slope), `linearForms` (NUM.3), `pointForms` (LF.4) and
    // `compositeForms` (LF.1). It is a TRIPWIRE for the shapes that are not written yet rather
    // than a live catch on them, and those are the ones full of characters this would reject:
    // RAD.4's answer accepts pipes and `abs(...)`, RAT.1's authored list accepts the not-equal
    // sign, RAD.1's accepts the root glyph. Injecting the root glyph into `integerForms` reddens
    // this on three packs, so it is measuring rather than asserting nothing.
    const unreachable: string[] = [];
    let checked = 0;
    for (const [nodeId, cfu] of CONVERTED) {
      for (const instance of cfuInstances(cfu)) {
        if (instance.authored) {
          continue;
        }
        checked += 1;
        const fromKeys = new Set(
          cfuKeypad(cfu.check, instance.accepted).flatMap((key) => [...key.insert]),
        );
        const answer = instance.accepted[0] ?? "";
        // Printable ASCII is on every keyboard; anything else has to come from a key.
        const missing = [...answer].filter(
          (char) => !/^[ -~]$/.test(char) && !fromKeys.has(char),
        );
        if (missing.length > 0) {
          unreachable.push(
            `${nodeId}: ${JSON.stringify(answer)} needs ${JSON.stringify(missing.join(""))}, which is on neither the keyboard nor this card's keypad`,
          );
        }
      }
    }
    expect(
      checked,
      "no computed instance was checked, so this proves nothing",
    ).toBeGreaterThan(4);
    expect(unreachable.join("\n")).toBe("");
  });

  it("LF.1's re-ask moves the WORD, not only the numbers", () => {
    // The one check in the tree whose answer has a fixed-word part. Rotating the points alone
    // would leave `decreasing` correct on every instance, and a learner who remembered one word
    // out of three would be halfway to the answer without reading the question.
    //
    // This is pinned HERE rather than enforced in the resolver, and the distinction is worth
    // stating: the generic constraints reject an instance that shares an accepted spelling, and
    // a different slope with the SAME word clears that easily (`-3/4, decreasing` against
    // `-1/2, decreasing` shares nothing). Enforcing word rotation generically would need the
    // authored instance's parameters, which the resolver does not have; what it has instead is
    // the template drawing `kind` first, and this assertion, which fails if a reseed or a range
    // change quietly costs the rotation.
    const cfu = CHECKS.find(([id]) => id === "LF.1")?.[1] as LessonCfuSpec;
    const words = ["increasing", "decreasing", "constant"];
    const wordOf = (accepted: readonly string[]): string | undefined =>
      words.find((word) => accepted.some((form) => form.includes(word)));
    const instances = cfuInstances(cfu);
    const first = wordOf(instances[0]?.accepted ?? []);
    expect(first, "LF.1's authored answer names none of the three words").toBeDefined();
    for (const [index, instance] of instances.entries()) {
      if (index === 0) {
        continue;
      }
      const word = wordOf(instance.accepted);
      expect(word, `LF.1 instance ${index} names none of the three words`).toBeDefined();
      expect(
        word,
        `LF.1 instance ${index} is still "${first}", so the fixed-word part did not rotate and a learner who remembered the word is halfway there`,
      ).not.toBe(first);
    }
  });

  it("FUN.10's re-ask flips the vee over, not only the numbers", () => {
    // LF.1's problem on a two-word answer, which is the sharper version of it: a learner who
    // remembered `maximum` out of two options would be halfway to every re-ask. The resolver's
    // generic constraints do not catch that — `(3, 7), maximum` shares no spelling with
    // `(6, 10), maximum` — so the rotation is carried by the template's `varietyKey` being the
    // verdict alone, and pinned here rather than left to that comment.
    const cfu = CHECKS.find(([id]) => id === "FUN.10")?.[1] as LessonCfuSpec;
    const wordOf = (accepted: readonly string[]): string | undefined =>
      ["maximum", "minimum"].find((word) => accepted.some((form) => form.includes(word)));
    const words = cfuInstances(cfu).map((instance) => wordOf(instance.accepted));
    expect(words[0], "FUN.10's authored answer names neither word").toBe("maximum");
    expect(
      new Set(words).size,
      `FUN.10 serves only ${JSON.stringify(words)}, so a learner shown a maximum is never re-asked a minimum`,
    ).toBe(2);
  });

  it("FUN.5's two rates are always whole and always disagree in direction", () => {
    // The pack's third and fourth paragraphs ARE the sign the subtraction carries and the fact
    // that a shift can climb overall while falling across its last stretch. A draw whose two
    // rates agreed in sign would re-ask the question with both of those removed, and a draw
    // that did not divide out would turn it into a question about dividing.
    const cfu = CHECKS.find(([id]) => id === "FUN.5")?.[1] as LessonCfuSpec;
    const instances = cfuInstances(cfu);
    expect(instances.length, "FUN.5 resolved nothing to check").toBeGreaterThan(1);
    for (const [index, instance] of instances.entries()) {
      const parts = (instance.accepted[0] ?? "")
        .split(",")
        .map((part) => Number(part.trim()));
      expect(parts.length, `FUN.5 instance ${index} is not a pair of rates`).toBe(2);
      for (const rate of parts) {
        expect(
          Number.isInteger(rate),
          `FUN.5 instance ${index} draws a rate that did not divide out: ${instance.accepted[0]}`,
        ).toBe(true);
      }
      expect(
        (parts[0] as number) * (parts[1] as number) < 0,
        `FUN.5 instance ${index} draws two rates of the same sign (${instance.accepted[0]}), so the window that disagrees is gone`,
      ).toBe(true);
    }
  });

  it("FUN.4's highest reading is always at an end of the shift, never at the turn", () => {
    // The trap this check exists for: a trace can climb to a modest peak, dip, and run off the
    // end of the shift higher than that peak ever was. A draw whose peak WAS the answer would
    // be answerable by reading the turn, which is the misconception rather than the skill.
    const cfu = CHECKS.find(([id]) => id === "FUN.4")?.[1] as LessonCfuSpec;
    const instances = cfuInstances(cfu);
    expect(instances.length, "FUN.4 resolved nothing to check").toBeGreaterThan(1);
    for (const [index, instance] of instances.entries()) {
      const params = instance.authored ? (AUTHORED_PARAMS["FUN.4"] ?? {}) : instance.params;
      const readings = [params.r0 ?? 0, params.r1 ?? 0, params.r2 ?? 0, params.r3 ?? 0];
      const highest = Math.max(...readings);
      expect(
        highest,
        `FUN.4 instance ${index} peaks at its turn, so the endpoint the question is about is not the answer`,
      ).toBe(params.r3);
      expect(
        highest > (params.r1 ?? 0),
        `FUN.4 instance ${index} ties its endpoint with its turn, so reading the turn also gets it right`,
      ).toBe(true);
    }
  });

  it("every converted check has its authored parameters written down", () => {
    const converted = new Set(CONVERTED.map(([nodeId]) => nodeId));
    const written = new Set(Object.keys(AUTHORED_PARAMS));
    expect(
      [...converted].filter((nodeId) => !written.has(nodeId)),
      "these converted checks have no authored parameters, so the agreement assertion below cannot run for them and their re-ask may accept less than they do",
    ).toEqual([]);
    expect(
      [...written].filter((nodeId) => !converted.has(nodeId)),
      "these have parameters written down and are no longer converted checks, so the fixture is describing something that has moved",
    ).toEqual([]);
    // A floor under both, because two empty sets agree perfectly.
    expect(written.size, "the fixture describes nothing").toBeGreaterThanOrEqual(36);
  });

  it.each(CONVERTED.map(([nodeId]) => nodeId))(
    "%s: the computed list accepts everything the authored list accepted",
    (nodeId) => {
      const cfu = CHECKS.find(([id]) => id === nodeId)?.[1];
      expect(cfu, `${nodeId} has no check`).toBeDefined();
      const shapeChange = RE_ASK_CHANGES_SHAPE.find((entry) => entry.node === nodeId);
      const templateId =
        shapeChange?.authoredShapeTemplate ??
        (cfu as LessonCfuSpec).variants?.template_id ??
        "";
      const params = AUTHORED_PARAMS[nodeId];
      expect(
        params,
        `${nodeId}: no authored parameters, so there is nothing to spell its accepted list from`,
      ).toBeDefined();
      const authoredKey =
        (cfu as LessonCfuSpec).check?.answer_key ??
        (cfu as LessonCfuSpec).accepted[0] ??
        "";
      const computed = cfuSpell(templateId, params ?? {}, authoredKey);
      expect(computed, `${nodeId}: no speller ran`).toBeDefined();
      const forms = new Set((computed ?? []).map(normalizeAcceptedAnswer));
      for (const authored of (cfu as LessonCfuSpec).accepted) {
        expect(
          forms.has(normalizeAcceptedAnswer(authored)),
          `${nodeId}: the computed list drops the authored spelling "${authored}", so a converted question accepts less than the one it stands beside`,
        ).toBe(true);
      }
      // The floor: containment holds trivially over an empty list.
      expect(forms.size, `${nodeId}: the speller produced nothing`).toBeGreaterThanOrEqual(
        (cfu as LessonCfuSpec).accepted.length,
      );
    },
  );

  // Written as a loop rather than `it.each`, because a list that emptied would emit no tests at
  // all and the file would report green over an exception nobody is checking.
  it("each shape-changing re-ask is a real one, and its redirection still excuses something", () => {
    const wrong: string[] = [];
    for (const { node, authoredShapeTemplate, reason } of RE_ASK_CHANGES_SHAPE) {
      const cfu = CHECKS.find(([id]) => id === node)?.[1];
      // Direction one: a renamed, deleted or unconverted node cannot sit here forever.
      if (cfu === undefined || cfu.variants === undefined) {
        wrong.push(`${node} is declared as changing shape but is not a converted check`);
        continue;
      }
      if (reason.length <= 40) {
        wrong.push(`${node}'s reason is too short to be a reason`);
      }
      const params = AUTHORED_PARAMS[node] ?? {};
      const authoredKey = cfu.check?.answer_key ?? cfu.accepted[0] ?? "";
      const covers = (templateId: string): boolean => {
        const forms = new Set(
          (cfuSpell(templateId, params, authoredKey) ?? []).map(normalizeAcceptedAnswer),
        );
        return cfu.accepted.every((form) => forms.has(normalizeAcceptedAnswer(form)));
      };
      // Direction two: if the variant speller HAS come to cover the authored list, the two
      // questions are back to one shape and this entry is excusing nothing while hiding that the
      // re-ask stopped asking the other half of the node.
      if (covers(cfu.variants.template_id)) {
        wrong.push(
          `${node}'s variant speller ${cfu.variants.template_id} now covers its authored list, so the re-ask no longer changes shape and this entry must come off the list`,
        );
      }
      // And the redirection has to be load-bearing rather than a softer target: the named
      // authored-shape speller owes exactly what the variant one was being asked for.
      if (!covers(authoredShapeTemplate)) {
        wrong.push(
          `${node} redirects its agreement assertion at ${authoredShapeTemplate}, which does not spell its authored list either, so the obligation has been dropped rather than moved`,
        );
      }
    }
    expect(wrong.join("\n")).toBe("");
  });
});

/**
 * The inventory, held honest in both directions.
 *
 * A check that is not converted and a check that was forgotten look identical from outside a
 * list of the converted ones, and the second is how a rollout stops at five and nobody notices.
 */
describe("every check is either converted or declared outstanding, with a reason", () => {
  it("the two lists between them cover the tree exactly", () => {
    const declared = new Set(Object.keys(NOT_YET_CONVERTED));
    const converted = new Set(CONVERTED.map(([nodeId]) => nodeId));
    const missing = CHECKS.map(([nodeId]) => nodeId).filter(
      (nodeId) => !declared.has(nodeId) && !converted.has(nodeId),
    );
    expect(
      missing,
      "these checks are neither converted nor declared outstanding, so they are simply forgotten",
    ).toEqual([]);
    const both = [...declared].filter((nodeId) => converted.has(nodeId));
    expect(both, "these checks are claimed as both converted and outstanding").toEqual([]);
    expect(
      declared.size + converted.size,
      "the two lists overlap or over-cover the tree",
    ).toBe(CHECKS.length);
  });

  // Written as a loop rather than as `it.each`, because the list is empty and `it.each([])`
  // does not run: the sweep would report green over a population of nothing, which is the
  // exact shape of failure this pair of directions exists to prevent.
  it("each outstanding entry is a real check that really has no variants", () => {
    const wrong: string[] = [];
    for (const nodeId of Object.keys(NOT_YET_CONVERTED)) {
      const cfu = CHECKS.find(([id]) => id === nodeId)?.[1];
      // Direction one: a renamed or deleted node cannot sit in the list forever, excusing
      // nothing and hiding that it excuses nothing.
      if (cfu === undefined) {
        wrong.push(`${nodeId} is declared outstanding but has no check in the tree`);
        continue;
      }
      // Direction two: a check that gains variants has to leave the list, or the list stops
      // describing the tree and starts excusing it.
      if (cfu.variants !== undefined) {
        wrong.push(
          `${nodeId} now declares variants, so it is converted and must come off this list`,
        );
      }
    }
    expect(wrong.join("\n")).toBe("");
  });

  it("each outstanding entry says why, in enough detail to act on", () => {
    const wrong: string[] = [];
    for (const [nodeId, reason] of Object.entries(NOT_YET_CONVERTED)) {
      if (reason.length <= 40) {
        wrong.push(`${nodeId}'s reason is too short to be a reason`);
      }
      // The two kinds decide whether what is left is one pass or a long tail, so an entry that
      // classifies itself as neither is an entry nobody can plan around.
      if (!(reason.startsWith("pool twin:") || reason.startsWith("no twin:"))) {
        wrong.push(
          `${nodeId}'s reason does not say whether a pool template already asks this question`,
        );
      }
    }
    expect(wrong.join("\n")).toBe("");
  });

  it("every check in the tree serves a different question on its re-ask", () => {
    // The claim the empty exception list above makes, asserted rather than left implied. This
    // is the same statement as `CONVERTED.length >= 38` read from the other end, and it is
    // worth both: that one is a floor and cannot notice a pack that loses its variants while
    // another gains some, and this one names the pack.
    const unconverted = CHECKS.filter(([, cfu]) => cfu.variants === undefined).map(
      ([nodeId]) => nodeId,
    );
    expect(
      unconverted,
      "these checks re-ask the byte-identical question, and are not declared as exceptions",
    ).toEqual([]);
    // The floor under it: containment over an empty tree would satisfy the line above.
    expect(
      CHECKS.length,
      "the sweep found no checks, so the assertion above is vacuous",
    ).toBeGreaterThanOrEqual(38);
  });
});

/**
 * How many DIFFERENT answers a converted generator can reach, which is a different question
 * from whether one draw differed.
 *
 * The sweep above asserts that no two served instances share a spelling, and `resolve` enforces
 * it by rejecting any draw colliding with something already spoken. Over a generator with two
 * answers in it, that enforcement inverts: the authored question speaks one of the two, so the
 * re-ask is not merely likely to be the other, it is FORCED to be, and a learner who takes the
 * reveal answers the second question by copying the first and changing its sign. The distinctness
 * rule is what makes the re-ask predictable rather than what stops it being so, so no assertion
 * written in terms of distinctness can see this.
 *
 * Three is the threshold because two is exactly where the inversion happens. At three a revealed
 * answer leaves two candidates and the learner still has to do the work; at two there is nothing
 * left to decide.
 *
 * Sampled rather than enumerated, because a template's draw space is private to it. 2000 seeds
 * over the resolver's own base is far past saturation for every generator here: the tightest
 * non-exempt one (EL.3) reaches its third answer inside the first dozen.
 */
const ANSWER_SPACE_SEEDS = 2000;
const MIN_DISTINCT_ANSWERS = 3;

/**
 * Generators that cannot reach three answers, each with the reason it cannot.
 *
 * A declared exception and not a waiver: the entry says what would have to change, and both
 * directions below are asserted, so an entry cannot outlive the pack it names and cannot go on
 * excusing a generator that has since widened.
 */
const TWO_ANSWER_GENERATORS: Readonly<Record<string, string>> = {
  "TRG.3":
    "reads one unit-circle coordinate, so its answer is the value of a sine or a cosine, and " +
    "the surface can grade only the rational ones: `sqrt(3)/2` comes back " +
    "`invalid_input/unsupported_syntax` from the shared checker against itself, and the " +
    "numeric-literal gate in `cfu.tsx` refuses it before either grading path sees it. Of the " +
    "twelve non-quadrantal special headings only the halves survive that, and a half is " +
    "`-1/2` or `1/2`. The two ways out are both outside this file: teach the quadrantal " +
    "readings in the pack's `mini_lesson` so `0` and `\\pm 1` become askable, or grade an " +
    "exact radical on the check surface. Re-typing the check `expression` is NOT one of them " +
    "-- it buys radicals by trading the profile away, and symbolic equivalence would take " +
    "`-2/4` and `-0.5` on the authored question that the computed list refuses on the re-ask, " +
    "which is the P0 `cfuGradingParity.test.tsx` was written for.",
};

describe("a converted generator can reach more answers than the reveal gives away", () => {
  const distinctAnswers = (templateId: string): number => {
    const template = cfuVariantTemplate(templateId);
    if (template === undefined) {
      return 0;
    }
    const answers = new Set<string>();
    for (let seed = 0; seed < ANSWER_SPACE_SEEDS; seed += 1) {
      const drawn = generateFromTemplate(template, "practice", 91_000 + seed);
      const key = drawn.answer.answer_key;
      if (key !== undefined) {
        answers.add(key);
      }
    }
    return answers.size;
  };

  const MEASURED: readonly (readonly [string, number])[] = CONVERTED.map(
    ([nodeId, cfu]) => [nodeId, distinctAnswers(cfu.variants?.template_id ?? "")] as const,
  );

  it("no undeclared generator is narrow enough for the reveal to settle the re-ask", () => {
    const narrow = MEASURED.filter(
      ([nodeId, size]) =>
        size < MIN_DISTINCT_ANSWERS && TWO_ANSWER_GENERATORS[nodeId] === undefined,
    ).map(([nodeId, size]) => `${nodeId} reaches ${size}`);
    expect(
      narrow,
      `these generators reach fewer than ${MIN_DISTINCT_ANSWERS} answers and are not declared, so a learner who takes the reveal can answer the re-ask off it`,
    ).toEqual([]);
    // The floor: the containment above holds trivially over a population of none.
    expect(
      MEASURED.length,
      "no converted generator was measured, so the assertion above is vacuous",
    ).toBeGreaterThanOrEqual(38);
  });

  it("every declared exception is a converted check that is still narrow", () => {
    const stale: string[] = [];
    for (const nodeId of Object.keys(TWO_ANSWER_GENERATORS)) {
      const measured = MEASURED.find(([id]) => id === nodeId);
      if (measured === undefined) {
        stale.push(`${nodeId} is declared here and is not a converted check in the tree`);
        continue;
      }
      // The other direction, and the one that stops an exemption becoming permanent by
      // neglect: a generator that has been widened must lose its entry rather than keep an
      // excuse for a narrowness it no longer has.
      if (measured[1] >= MIN_DISTINCT_ANSWERS) {
        stale.push(
          `${nodeId} now reaches ${measured[1]} answers and no longer needs its exemption`,
        );
      }
    }
    expect(stale.join("\n")).toBe("");
    expect(
      Object.keys(TWO_ANSWER_GENERATORS).length,
      "the exception list is empty, so the two directions above assert nothing",
    ).toBeGreaterThan(0);
  });

  it("each declared exception says what would have to change", () => {
    for (const [nodeId, reason] of Object.entries(TWO_ANSWER_GENERATORS)) {
      const tooShort = `${nodeId}'s reason is too short to act on`;
      expect(reason.length, tooShort).toBeGreaterThan(200);
    }
  });

  it("the declared exception really is served the answer its reveal gives away", () => {
    // What the exemption COSTS, measured rather than argued. Without this the entry above is a
    // note; with it, the day TRG.3 widens, this fails too and says so.
    for (const nodeId of Object.keys(TWO_ANSWER_GENERATORS)) {
      const cfu = CONVERTED.find(([id]) => id === nodeId)?.[1];
      if (cfu === undefined) {
        continue;
      }
      const served = cfuInstances(cfu).map((instance) => instance.answerKey);
      expect(
        served.length,
        `${nodeId} serves one question, so there is no re-ask to give away`,
      ).toBeGreaterThan(1);
      const unsigned = [...new Set(served.map((key) => key.replace(/^-/, "")))];
      expect(
        unsigned,
        `${nodeId} is declared narrow enough that its re-ask is the sign flip of the answer just revealed, and it is serving ${served.join(" then ")}, which is not that`,
      ).toHaveLength(1);
      expect(
        [...new Set(served)],
        `${nodeId} serves the same answer twice, which is a different and worse defect than the one declared`,
      ).toHaveLength(served.length);
    }
  });
});

/**
 * A COMPUTED LIST REFUSES AN UNREDUCED FRACTION ONLY WHERE LOWEST TERMS IS THE GRADED SKILL.
 *
 * POL.4's re-ask asks for the roots of a quadratic through the formula and wants `-4, 2/5`. A
 * learner who reaches `-4, 4/10` has done the whole of what the node teaches — gathering at
 * zero, substituting into the formula, simplifying the radical — and was graded wrong for a
 * reduction the node never asks for and has no `simplification` profile to demand. That is a
 * correct answer marked incorrect, which the rubric puts at P0. The ruling that POL.4 accepts
 * unreduced roots is the content owner's and has been made; this is the code half of it.
 *
 * ## Scoped by the behaviour, not by the node it was reported on
 *
 * The population is every rendered ask whose canonical answer is WRITTEN with a fraction in it,
 * derived by reading the answer rather than by listing the spellers that produce one. Reading
 * the answer is the point: `solutionSetForms` is where the report landed, and scoping to it
 * would have found POL.4 and stopped. Measured over the behaviour instead, the same defect was
 * sitting on THREE more nodes — TRG.3, TRG.4 and TRG.9 — whose answers are single fractions
 * spelled by `fractionForms` and which share not one line of implementation with a solution set.
 *
 * ## The grader is modelled, not assumed, and the two paths differ
 *
 * `cfu.tsx` grades `cfu.check && asked.authored` through `cfuChecker` and EVERYTHING ELSE by
 * exact match against the instance's own list. That distinction is the whole finding on the
 * three TRG nodes, and reading it wrong is how the first version of this sweep reported them
 * falsely: their authored questions carry a `check`, `cfuChecker` builds every numeric spec with
 * `simplification: "none"`, and the checker duly grades `8/6` correct against a key of `4/3`.
 * Their RE-ASKS, graded by a computed list that spelled no unreduced form, refused it. So one
 * card accepted an answer on its first ask and marked the same answer wrong on its second, which
 * needs no new content ruling to be a defect.
 *
 * LF.1 is the precedent rather than a fourth case: its speller already passes
 * `unreduced: true`, and the comment on it records exactly this reasoning — a grader with
 * `simplification: "none"` is saying an unreduced equivalent is the right answer written
 * differently.
 *
 * ## Where refusing is correct, and where it is somebody else's file
 *
 * Two named lists, because they are two different claims. {@link REDUCTION_IS_THE_SKILL} is
 * nodes graded ON the reduction, checked against the packs' own `simplification` profile.
 * {@link AUTHORED_LIST_OWES_THIS} is hand-written `accepted` lists in content packs, which no
 * speller change can reach — `authoredInstance` hands the pack's own strings straight to the
 * grader. Both are asserted in both directions, so a stale entry fails and an unlisted
 * qualifier fails.
 */
describe("a computed list accepts an unreduced root wherever reducing is not the skill", () => {
  /**
   * Every question the card can render, with the pack it came from. Same derivation as the two
   * R30 sweeps in `answerFormat.test.ts` and `answerKeypad.test.ts`.
   */
  const RENDERED = CHECKS.flatMap(([nodeId, cfu]) =>
    cfuInstances(cfu).map((ask, index) => ({
      nodeId,
      cfu,
      ask,
      index,
      label: `${nodeId}[${index}]`,
    })),
  );

  /**
   * The nodes whose graded skill IS the reduction, so a refusal there is the grader working.
   *
   * Not written from memory: `simplification: "reduced_fraction"` is the pack SAYING lowest
   * terms is the question, and the census below requires this list and that profile to name the
   * same set.
   */
  const REDUCTION_IS_THE_SKILL: Readonly<Record<string, string>> = {
    "NUM.F": "the question is writing the product AS a fraction in lowest terms",
    // The three D9 nodes, which arrived in this list the way the doc comment says a node
    // should: their packs started declaring `simplification: "reduced_fraction"`, and the
    // census below went red until they were named. They were on the tolerant side when this
    // sweep was written, and correctly so — nothing then asked them for lowest terms. The D9
    // QA round changed the content rather than the reading: each prompt now asks for lowest
    // terms in as many words, and each pack declares the profile that says so.
    "TRG.3":
      "the prompt asks for the horizontal reach as a fraction in lowest terms, and the pool " +
      "grades the same value `not_simplified` on `d9.trg3.exact-value-circle.l3`",
    "TRG.4":
      "the prompt asks for the tangent as a fraction in lowest terms, and its `4/3` is the " +
      "reduced form of the ratio the identity hands back",
    "TRG.9":
      "the prompt asks for the double-angle value as a fraction in lowest terms, where the " +
      "unreduced form is the raw quotient before the last step of the work",
  };

  /**
   * Hand-written `accepted` lists that still refuse an unreduced spelling their own node does
   * not grade on. Not fixable from this file at all: `authoredInstance` sets
   * `accepted: cfu.accepted`, so the strings a content pack ships ARE the grader.
   *
   * Each entry names the strings the pack owes, so this is a work item and not a shrug.
   *
   * EMPTY, and it emptied by both packs being widened rather than by anyone deciding it should
   * be: `content/lessons/d4/POL.4.json` took the twelve unreduced roots and
   * `content/lessons/d7/LF.1.json` took `-3/6, decreasing`, and the census below went red on
   * each of them until its entry was deleted. That is the second direction of this list doing
   * the one job it exists for, so the emptiness is measured rather than assumed — the census
   * asserts set EQUALITY against the packs, so the day a pack narrows or a new one arrives
   * short, this file fails asking for an entry rather than passing over a list nobody kept.
   */
  const AUTHORED_LIST_OWES_THIS: Readonly<Record<string, string>> = {};

  /** The same answer with every fraction in it scaled by `k`, which is the same number. */
  function scaledBy(value: string, k: number): string {
    return value.replace(
      /(\d+)\s*\/\s*(\d+)/g,
      (_whole, over: string, under: string) => `${Number(over) * k}/${Number(under) * k}`,
    );
  }

  const WITH_A_FRACTION = RENDERED.filter((entry) =>
    /\d+\s*\/\s*\d+/.test(entry.ask.accepted[0] ?? ""),
  );

  /**
   * True when this instance is graded by its own accepted list. The complement — an authored
   * question on a pack with a `check` — goes to `cfuChecker` instead.
   *
   * Kept as a fact ABOUT an entry rather than as a population filter, which is what it used to
   * be. Scoping the sweep below to the list path scoped it by the IMPLEMENTATION, and the
   * moment `content/lessons/d4/POL.4.json` gained a check block that pack left the population
   * without anybody deciding it should: the behaviour under test — an unreduced spelling of a
   * fractional answer is accepted where reducing is not the skill — is exactly as true of a
   * pack the checker grades, and POL.4 ships twelve unreduced roots for that reason. So the
   * sweep asks {@link gradeCfuAnswer}, which is the dispatch `cfu.tsx` itself calls, and this
   * predicate now only counts how much of the population each path carries.
   */
  const gradedByItsList = (entry: (typeof RENDERED)[number]): boolean =>
    !(entry.cfu.check && entry.ask.authored);

  it("found rendered asks whose answers are written with a fraction", () => {
    expect(
      WITH_A_FRACTION.length,
      "no rendered answer carries a fraction, so every assertion below is vacuous",
    ).toBeGreaterThan(6);
    // The COMPUTED half specifically, which is the only half a speller change can reach.
    expect(
      WITH_A_FRACTION.filter((entry) => !entry.ask.authored).length,
      "no re-ask carries a fraction, so the computed half is untested",
    ).toBeGreaterThan(3);
  });

  it("grades an unreduced spelling of every fractional answer correct", () => {
    const refused: string[] = [];
    let judged = 0;
    let excused = 0;
    let throughTheChecker = 0;

    for (const entry of WITH_A_FRACTION) {
      const canonical = entry.ask.accepted[0] ?? "";
      for (const k of [2, 3]) {
        const unreduced = scaledBy(canonical, k);
        if (unreduced === canonical) {
          continue;
        }
        judged += 1;
        if (!gradedByItsList(entry)) {
          throughTheChecker += 1;
        }
        // The grader the CARD runs, whichever path this entry takes: `cfu.tsx` calls
        // `gradeCfuAnswer`, which is list membership on an entry with no check and the
        // shared checker on a checked authored question.
        if (
          gradeCfuAnswer({
            nodeId: entry.nodeId,
            cfu: entry.cfu,
            index: entry.index,
            value: unreduced,
          }).correct
        ) {
          continue;
        }
        if (
          entry.nodeId in REDUCTION_IS_THE_SKILL ||
          (entry.ask.authored && entry.nodeId in AUTHORED_LIST_OWES_THIS)
        ) {
          excused += 1;
          continue;
        }
        refused.push(
          `${entry.label}: answers ${JSON.stringify(canonical)} and refuses ${JSON.stringify(unreduced)}, the same number`,
        );
      }
    }

    // Three floors, and the third is a COMPOSITION claim rather than a size one. The first says
    // spellings were actually tried; the second that the excuse lists have not grown until they
    // cover everything, which is how a both-ways list still goes quiet. The third says the
    // checker-graded half is genuinely in here, because the population used to be the list path
    // alone and a pack gaining a check block silently left it — a floor on the total would have
    // been cleared by the list packs on their own, which is the shape of the defect rather than
    // a guard against it.
    expect(judged, "no unreduced spelling was tried").toBeGreaterThan(6);
    // The composition first, because it is the more specific claim: the two size floors below
    // would also fail on this regression, and failing at a count is what sent the last reader
    // looking for a missing pack instead of for a filter that had stopped admitting one.
    expect(
      throughTheChecker,
      "no checked pack's authored question reached this sweep, so it has fallen back to the accepted-list path it used to be scoped to",
    ).toBeGreaterThan(0);
    expect(
      judged - excused,
      `the exemptions now cover the population (judged=${judged} excused=${excused})`,
    ).toBeGreaterThan(4);
    expect(refused.join("\n")).toBe("");
  });

  /**
   * What the AUTHORED ask does with an unreduced spelling, which is the other half of every
   * disagreement this file is about: the re-ask is graded by a list, and the authored question by
   * `cfuChecker`, so a node is consistent only when the two agree.
   *
   * Measured through the real checker rather than argued from the spec, because "the spec says
   * `simplification: none`" and "the checker grades it correct" are different claims and only the
   * second is what a learner meets.
   *
   * ## Why this asserts BOTH directions, having once asserted only one
   *
   * It was written to prove the three TRG nodes were a defect rather than a content question:
   * their authored question accepted what their re-ask refused, so no new ruling was needed to
   * call it wrong. Then those nodes were fixed the other way round — the packs declared
   * `reduced_fraction`, which `itemVersion` passes STRAIGHT INTO the spec, so the checker now
   * refuses `-2/4` on the authored question too — and this test's entire population went to zero
   * and its floor fired. It was a genuinely empty population, not a broken derivation.
   *
   * Deleting it would have thrown away the measurement, and relaxing the floor would have left a
   * test passing over nothing. So it asserts the AGREEMENT instead, which is what both fixes were
   * ever for, and it now has something to say about every spec-carrying node rather than only the
   * tolerant ones:
   *
   *  - a node declaring the profile must have its checker REFUSE the unreduced form, which is
   *    what makes the declaration load-bearing rather than decorative — strip
   *    `simplification: "reduced_fraction"` from one of the three packs and this fails there;
   *  - a node declaring nothing must have its checker ACCEPT it, which is the original finding,
   *    and is what says a list refusing it is a disagreement rather than the grader working.
   */
  it("the checker and the profile agree on an unreduced spelling, both ways", () => {
    let strict = 0;
    let tolerant = 0;
    const wrong: string[] = [];
    for (const entry of WITH_A_FRACTION) {
      if (gradedByItsList(entry)) {
        continue;
      }
      const canonical = entry.ask.accepted[0] ?? "";
      const unreduced = scaledBy(canonical, 2);
      if (unreduced === canonical) {
        continue;
      }
      const declaresLowestTerms = entry.cfu.check?.simplification === "reduced_fraction";
      const result = cfuChecker({
        raw_answer: unreduced,
        item_version_id: cfuItemVersionId(entry.nodeId),
        equivalence_checker_version: CFU_CHECKER_VERSION,
      });
      if (declaresLowestTerms) {
        strict += 1;
        if (result.client_correct) {
          wrong.push(
            `${entry.label}: declares reduced_fraction and the checker still takes ${unreduced} against ${canonical}, so the profile is not reaching the grader`,
          );
        }
        continue;
      }
      tolerant += 1;
      if (!result.client_correct) {
        wrong.push(`${entry.label}: the checker refuses ${unreduced} against ${canonical}`);
      }
    }
    expect(wrong.join("\n")).toBe("");
    // A floor under each direction separately, because one of them covering the whole
    // population is exactly how this test emptied out the first time. The strict side is the
    // three D9 nodes; the tolerant side is every other spec-carrying fractional CFU, and if it
    // reaches zero again this fails rather than passing over an excused population.
    //
    // Four is the MEASURED strict population (NUM.F, TRG.3, TRG.4 and TRG.9) rather than a
    // margin under it, and the difference is not pedantry: at three, stripping the profile from
    // one of the four left this test green, because the node simply moved to the tolerant side
    // and the remaining three still cleared the floor. The census below caught it, and a floor
    // that needs another assertion to do its job is not one. It moves UP when a pack adopts the
    // profile, which the census names anyway.
    expect(
      strict,
      "a pack has stopped declaring reduced_fraction on a fractional CFU, so the strict direction is measuring less than it was written for",
    ).toBeGreaterThanOrEqual(4);
    expect(
      strict + tolerant,
      "no spec-carrying fractional CFU was graded at all",
    ).toBeGreaterThan(2);
  });

  /**
   * The unreduced spellings a pack now CARRIES have to come back out of its own speller, because
   * `cfuVariants.test.ts` requires authored ⊆ speller and a pack widened with a string the
   * speller does not produce fails that rule instead of this one.
   *
   * This is the successor to the handoff check, which asserted the same thing about strings that
   * were still owed. Kept rather than dropped when the packs landed, because it is the direction
   * the subset rule cannot express: a speller that stopped emitting unreduced forms would make a
   * pack's own shipped strings unspellable, and it fails HERE naming the scaling, one file away
   * from the option that switches it off.
   *
   * ## Why the population is what a pack SHIPS rather than what grades it
   *
   * It was scoped to the list-graded path, and POL.4 gaining a check block took it from two
   * packs to one and fired the floor. That was the filter being wrong rather than the cohort
   * emptying: the claim here is about a pack's `accepted` list and its speller, and the subset
   * rule this defends (`authored ⊆ speller`, above) applies to a checked pack's list exactly
   * as it does to an unchecked one — a check block changes which grader reads the list, not
   * whether the list has to be spellable. So membership is now the honest reading of the test's
   * own name: an authored ask, with a speller, that CARRIES the unreduced spelling. A pack that
   * never shipped one is owed nothing and was only ever excluded by accident of the old filter.
   */
  it("spells the unreduced forms its authored packs now carry", () => {
    let checked = 0;
    const packs = new Set<string>();
    const unspellable: string[] = [];
    for (const entry of WITH_A_FRACTION) {
      // Authored and carrying a variants block — without one there is no speller for the list
      // to be a subset of and nothing here to say.
      if (!entry.ask.authored || !entry.cfu.variants) {
        continue;
      }
      const shipped = new Set(entry.ask.accepted.map(normalizeAcceptedAnswer));
      const canonical = entry.ask.accepted[0] ?? "";
      const forms = new Set(
        (
          cfuSpell(
            entry.cfu.variants.template_id,
            AUTHORED_PARAMS[entry.nodeId] ?? {},
            canonical,
          ) ?? []
        ).map(normalizeAcceptedAnswer),
      );
      expect(forms.size, `${entry.nodeId}: its speller produced nothing`).toBeGreaterThan(
        0,
      );
      for (const k of [2, 3]) {
        const owed = scaledBy(canonical, k);
        // Only what the pack actually CARRIES. A pack whose list never held the unreduced
        // spelling owes its speller nothing, and asking anyway would turn every reduced-form
        // pack in the tree into a red the moment the filter above widened.
        if (owed === canonical || !shipped.has(normalizeAcceptedAnswer(owed))) {
          continue;
        }
        packs.add(entry.nodeId);
        checked += 1;
        if (!forms.has(normalizeAcceptedAnswer(owed))) {
          unspellable.push(
            `${entry.nodeId}: ships ${JSON.stringify(owed)} but its speller does not spell it`,
          );
        }
      }
    }
    // Floors on both the population and the comparisons, so an emptied cohort cannot pass, and
    // one COMPOSITION assertion beside them: the two packs shipping unreduced spellings are one
    // from either grading path, so this fails rather than passing if the checked one drops out
    // again the way it did when the filter was scoped to the list.
    expect(
      [...packs].sort(),
      "the packs shipping an unreduced spelling have moved; add or remove the pack here with what it now ships",
    ).toEqual(["LF.1", "POL.4"]);
    expect(packs.size, "no authored pack with a fraction and a speller").toBeGreaterThan(1);
    expect(checked, "no unreduced spelling was checked against a speller").toBeGreaterThan(
      2,
    );
    expect(unspellable.join("\n")).toBe("");
  });

  /**
   * The exception lists, held honest in both directions.
   *
   * An entry that stops qualifying fails, so a stale excuse cannot sit here exempting nothing;
   * an unlisted qualifier fails, so the list cannot go on describing a set that has moved. The
   * second direction is the one that matters for `AUTHORED_LIST_OWES_THIS`: the moment a content
   * pack ships the strings named in its entry, this goes red and the entry has to be deleted,
   * which is what stops an owed work item becoming permanent by neglect.
   */
  it("excuses exactly the nodes that qualify, and no others", () => {
    const declares = CHECKS.filter(
      ([, cfu]) => cfu.check?.simplification === "reduced_fraction",
    ).map(([nodeId]) => nodeId);
    expect(
      declares.length,
      "no pack declares reduced_fraction, so that exception list describes nothing",
    ).toBeGreaterThan(0);
    expect([...Object.keys(REDUCTION_IS_THE_SKILL)].sort()).toEqual([...declares].sort());

    // And the authored-list entries, each of which has to STILL be refusing something. A pack
    // that has since been widened fails here and its entry is then dead weight to remove.
    const stillRefusing = new Set<string>();
    for (const entry of WITH_A_FRACTION) {
      if (!entry.ask.authored || !gradedByItsList(entry)) {
        continue;
      }
      const canonical = entry.ask.accepted[0] ?? "";
      const accepted = new Set(entry.ask.accepted.map(normalizeAcceptedAnswer));
      for (const k of [2, 3]) {
        const unreduced = scaledBy(canonical, k);
        if (unreduced !== canonical && !accepted.has(normalizeAcceptedAnswer(unreduced))) {
          stillRefusing.add(entry.nodeId);
        }
      }
    }
    expect(
      [...stillRefusing].sort(),
      "an authored pack has been widened (delete its entry) or a new one is short (add it, with the strings it owes)",
    ).toEqual([...Object.keys(AUTHORED_LIST_OWES_THIS)].sort());
    for (const [nodeId, reason] of Object.entries({
      ...REDUCTION_IS_THE_SKILL,
      ...AUTHORED_LIST_OWES_THIS,
    })) {
      expect(
        reason.length,
        `${nodeId}'s excuse is too short to be a reason`,
      ).toBeGreaterThan(30);
    }
  });
});
