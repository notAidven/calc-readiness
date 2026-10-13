/**
 * **WHAT THE INTRO PROMISES, NOW THAT IT DOES NOT LIST THE SKILLS.**
 *
 * The product lead asked for *"this super intimidating laundry list of skills"* to come off
 * the diagnostic's first screen. A list is easy to delete and the reassurance it was
 * carrying is not, so this file is about the reassurance: a learner about to sit a placement
 * test needs to know roughly what is coming, roughly how long it takes, and what happens
 * afterwards, and those three facts have to survive the deletion.
 *
 * ## The three claims, and why each is checked here rather than left to the frame
 *
 * `diagnosticFirstScreens.browser.test.tsx` photographs the result, which is the evidence a
 * SPATIAL claim owes. But "the card still says how long it takes" is not spatial — it is a
 * fact about strings — and a frame is the wrong instrument for it: a reviewer looking at a
 * picture of a tidy card will not notice that the sentence about the adaptive walk went out
 * with the list.
 *
 * ## The numbers are held to the measurement they came from
 *
 * `TYPICAL_QUESTIONS` is read off `docs/Diagnostic_Coverage_Length_Measurement.md` (median
 * 36 items over this scope). `DIAGNOSTIC_DURATION_ESTIMATE` is the product's broader planning
 * range: it must say "about" because an adaptive, untimed open-response sitting has no fixed
 * item count or per-item clock.
 *
 * ⚑ **They are read off `diagnosticShape.ts` rather than off `DiagnosticRunner.tsx`, because
 * that is where they now live.** The first-run start choice quotes the same two figures before
 * the diagnostic bundle exists, so a single module owns them and both readers import it. The
 * The intro checks still read `DiagnosticRunner.tsx`, since what they are about is whether the
 * card still prints the canonical expectations.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { getNodeOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { skillDisplayName } from "./skillNames";

const SOURCE = readFileSync(path.join(__dirname, "DiagnosticRunner.tsx"), "utf8") as string;

/** The intro's own copy, read off the source rather than off a rendered tree. */
const INTRO = (() => {
  const from = SOURCE.indexOf("function IntroView(");
  const to = SOURCE.indexOf("function SectionView(");
  if (from < 0 || to < 0 || to < from) {
    throw new Error("IntroView is no longer a function in DiagnosticRunner.tsx");
  }
  return SOURCE.slice(from, to);
})();

const SHAPE_SOURCE = readFileSync(
  path.join(__dirname, "diagnosticShape.ts"),
  "utf8",
) as string;

const numberOf = (name: string): number => {
  const found = new RegExp(`export const ${name} = (\\d+)`).exec(SHAPE_SOURCE);
  if (!found) {
    throw new Error(`${name} is no longer declared in diagnosticShape.ts`);
  }
  return Number(found[1]);
};

const TYPICAL_QUESTIONS = numberOf("TYPICAL_QUESTIONS");
const durationMatch = /export const DIAGNOSTIC_DURATION_ESTIMATE = "([^"]+)"/.exec(
  SHAPE_SOURCE,
);
if (!durationMatch) {
  throw new Error(
    "DIAGNOSTIC_DURATION_ESTIMATE is no longer declared in diagnosticShape.ts",
  );
}
const DIAGNOSTIC_DURATION_ESTIMATE = durationMatch[1] as string;

/**
 * The measured item figure this promise is rounded from, quoted from the published
 * measurement rather than restated. `docs/Diagnostic_Coverage_Length_Measurement.md`, shipped
 * policy, 62-node scope, mild noise, n = 6,000:
 * `items med / n / p99 / max = 36 / 47 / 53 / 58`.
 */
const MEASURED_MEDIAN_ITEMS = 36;
describe("the intro sets expectations without a roster", () => {
  /**
   * The roster is gone BY MECHANISM as well as by name, and the mechanism is the half that
   * matters.
   *
   * A hardcoded-name sweep alone reads as thorough and asserts almost nothing here: nobody
   * writes sixty-two names out, they render them, and the list this screen carried was
   * `SCOPE_NODES.map(...)` calling `skillDisplayName` per node. Forced false — the map put
   * back exactly as it shipped — a name sweep over the source stays GREEN because there is
   * no name in it to find, while the two assertions below fail. Both halves are kept: the
   * mechanism catches a rendered roster, the names catch a hand-written one.
   *
   * The RENDERED half is covered too, and by three suites, because a source check cannot see
   * what a learner sees: `DiagnosticRunner.test.tsx` (`.dgx-node` count),
   * `diagnosticFirstScreens.browser.test.tsx` and `widenedScopeShots.browser.test.tsx` all
   * fail on that same injection, the last two naming all 62.
   */
  it("names no skill in the scope, and does not render one per node", () => {
    expect(
      INTRO,
      "the intro iterates the scope again, which is how a roster renders",
    ).not.toMatch(/SCOPE_NODES\s*(\.\s*map|\.\s*forEach|\.\s*flatMap)/);
    expect(
      INTRO,
      "the intro reaches for a skill's display name, which it only ever needs to list one",
    ).not.toMatch(/skillDisplayName/);

    // The population is the live scope, so a hand-written list is found too. Floored,
    // because a containment over an empty scope is free.
    expect(DIAGNOSTIC_WALK_SCOPE.length).toBeGreaterThanOrEqual(62);
    const named = DIAGNOSTIC_WALK_SCOPE.filter((nodeId) => {
      const display = skillDisplayName(nodeId);
      return display !== nodeId && INTRO.includes(display);
    });
    expect(
      named,
      "the intro names individual skills again, which is the laundry list this screen removed",
    ).toEqual([]);
    // …and the sweep can still see a name, so its emptiness is about the intro rather than
    // about `skillDisplayName` having gone silent.
    expect(
      DIAGNOSTIC_WALK_SCOPE.filter((nodeId) => skillDisplayName(nodeId) !== nodeId).length,
      "no scope node has a display name, so the sweep above found nothing to look for",
    ).toBeGreaterThanOrEqual(62);
  });

  it("still promises the breadth, derived from the scope rather than written down", () => {
    // Both figures have to be INTERPOLATED, not typed. A literal 62 in the copy would read
    // identically and would go stale the day a node is authored.
    expect(INTRO, "the skill count is a literal, so it can rot").toMatch(
      /\{SCOPE_NODES\.length\}\s*skills/,
    );
    expect(INTRO, "the subject-area count is a literal, so it can rot").toMatch(
      /\{SCOPE_DOMAIN_COUNT\}\s*\{?"?\s*\}?\s*subject areas/,
    );
    // And the two derivations are really the live scope.
    expect(new Set(DIAGNOSTIC_WALK_SCOPE.map((id) => getNodeOrThrow(id).domain)).size).toBe(
      10,
    );
  });

  it("still says it adapts, and what that means for the number above", () => {
    expect(INTRO.toLowerCase()).toContain("adaptive");
    // The specific reassurance the roster was hiding: the count is not the question count.
    expect(
      INTRO,
      "nothing tells the learner they will not be asked about every skill in the scope",
    ).toMatch(/will not be asked about all/i);
  });

  it("still says what happens afterwards", () => {
    expect(INTRO, "the hand-off to the city is no longer promised").toMatch(/your city/i);
    expect(INTRO, "the per-skill starting point is no longer promised").toMatch(
      /starting point/i,
    );
    expect(INTRO, "the no-pass-no-fail reassurance is gone").toMatch(
      /no passing or failing|not a test|no grades/i,
    );
  });

  /**
   * THE ITEM FIGURE, held to the measurement in both directions; and the duration held as an
   * explicit estimate rather than a fixed-length guarantee.
   *
   * A rounded item promise can go wrong two ways and both are worth failing on: drifting UP
   * past the median, and drifting DOWN so far that it stops describing the instrument.
   */
  it("promises a length it can keep", () => {
    expect(
      TYPICAL_QUESTIONS,
      `the promise (${TYPICAL_QUESTIONS}) is above the measured median (${MEASURED_MEDIAN_ITEMS}), so it over-promises`,
    ).toBeLessThanOrEqual(MEASURED_MEDIAN_ITEMS);
    expect(
      TYPICAL_QUESTIONS,
      "the promise has drifted so far below the measured median that it describes nothing",
    ).toBeGreaterThanOrEqual(Math.floor(MEASURED_MEDIAN_ITEMS * 0.8));
    expect(DIAGNOSTIC_DURATION_ESTIMATE).toMatch(/^about 15[–-]20 minutes$/);
    // Both reach the screen.
    expect(INTRO).toContain("{TYPICAL_QUESTIONS}");
    expect(INTRO).toContain("{DIAGNOSTIC_DURATION_ESTIMATE}");
    expect(INTRO).not.toMatch(/~?10\s*(?:min|minutes)/i);
  });
});
