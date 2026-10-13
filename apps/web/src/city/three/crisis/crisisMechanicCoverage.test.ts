import { describe, expect, it } from "vitest";

import {
  answerReason,
  CRISIS_MECHANICS,
  FRAMEWORK_SEAMS,
  type FrameworkSeam,
  MECHANIC_IDS,
  rowsOnSharedSeams,
} from "./mechanics";
import { CRISIS_ENTRIES, PLAYED_CRISIS_ERA } from "./registry";

/**
 * **EVERY CRISIS ANSWERS ALL TWENTY-FOUR ROWS, AND A BLANK IS A FAILURE.**
 *
 * The rule is `crisis-reference-packs/README.md` §2's, verbatim: *"a blank row fails; a row saying
 * 'no analogue, because ...' passes."* Era one's brief lost the shield and the threatened building
 * to an omission nobody reached, and *"an omission that is never reached is invisible in review"*.
 * This is the review reaching it.
 *
 * ## THE POPULATION IS THE REGISTERED CRISES, AND THE SHAPE IS ASSERTED, NOT JUST THE SIZE
 *
 * A count of two clears with two copies of era one. So the sweep also asserts the composition:
 * exactly one entry is `built`, at least one is a `slice`, and the two answer the rows
 * differently — because a slice that answered every row the way era one does would be era one
 * with a different name, which is exactly the sameness this framework is at risk of producing.
 */

describe("the inventory itself is the twenty-four rows and nothing else", () => {
  it("holds twenty-four rows with unique ids and real titles", () => {
    expect(CRISIS_MECHANICS).toHaveLength(24);
    expect(new Set(MECHANIC_IDS).size).toBe(24);
    expect(MECHANIC_IDS[0]).toBe("M1");
    expect(MECHANIC_IDS[23]).toBe("M24");
    // Eight, because M18's title is *"The ruin"* and that is the shortest the README has. The
    // floor is here to catch a blank, not to legislate prose length.
    for (const row of CRISIS_MECHANICS) {
      expect(row.title.length, row.id).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("every registered crisis answers every row", () => {
  it("has the three production crises built and keeps the remaining slices explicit", () => {
    expect(CRISIS_ENTRIES.length).toBeGreaterThanOrEqual(2);
    const built = CRISIS_ENTRIES.filter((entry) => entry.status === "built");
    const slices = CRISIS_ENTRIES.filter((entry) => entry.status === "slice");
    expect(built.map((entry) => entry.eraId).sort()).toEqual([
      "information_age",
      "prehistoric",
      "renaissance",
    ]);
    expect(slices.length).toBeGreaterThanOrEqual(1);
    // The winter renderer's pointer remains one of the built crises; the others pass their own.
    expect(PLAYED_CRISIS_ERA).toBe("prehistoric");
  });

  it("leaves no row unanswered and no answer blank", () => {
    for (const entry of CRISIS_ENTRIES) {
      const answered = Object.keys(entry.mechanics).sort();
      expect(answered, entry.eraId).toEqual([...MECHANIC_IDS].sort());
      for (const id of MECHANIC_IDS) {
        const reason = answerReason(entry.mechanics[id]);
        // A because that is not a because is a blank row with punctuation in it.
        expect(reason.length, `${entry.eraId} ${id}`).toBeGreaterThan(30);
      }
    }
  });

  it("never claims a seam that does not exist", () => {
    for (const entry of CRISIS_ENTRIES) {
      for (const id of MECHANIC_IDS) {
        const answer = entry.mechanics[id];
        if (answer.kind !== "shared-seam") {
          continue;
        }
        expect(FRAMEWORK_SEAMS, `${entry.eraId} ${id}`).toContain(answer.seam);
      }
    }
  });

  it("leaves no seam decorative: every one is claimed by a row", () => {
    // The other direction, and the one that catches a module standing in this directory that
    // nothing actually uses. A seam nobody claims is a seam nobody needed.
    const claimed = new Set<FrameworkSeam>();
    for (const entry of CRISIS_ENTRIES) {
      for (const id of MECHANIC_IDS) {
        const answer = entry.mechanics[id];
        if (answer.kind === "shared-seam") {
          claimed.add(answer.seam);
        }
      }
    }
    expect([...claimed].sort()).toEqual([...FRAMEWORK_SEAMS].sort());
  });
});

describe("the two crises answer the inventory differently", () => {
  it("puts era one on eight shared-seam rows, named", () => {
    const winter = CRISIS_ENTRIES.find((entry) => entry.eraId === "prehistoric");
    if (!winter) {
      throw new Error("era one is expected in the registry");
    }
    // Named rather than counted. A count of eight is satisfied by any eight rows, and WHICH
    // eight is the deliverable: entry and exit, the atmosphere, the ground, the propagation, the
    // threatened building, accumulating damage, the ruin, and ground lost for good.
    expect(rowsOnSharedSeams(winter.mechanics)).toEqual([
      "M3",
      "M4",
      "M5",
      "M9",
      "M16",
      "M17",
      "M18",
      "M19",
    ]);
  });

  it("does not force era four's answers into era one's shape", () => {
    const winter = CRISIS_ENTRIES.find((entry) => entry.eraId === "prehistoric");
    const succession = CRISIS_ENTRIES.find((entry) => entry.eraId === "classical");
    if (!winter || !succession) {
      throw new Error("both registered crises are expected");
    }
    // THE EVIDENCE THAT THE FRAMEWORK IS NOT A FROST. Era four answers ten rows "no analogue",
    // and era one answers none of them that way: a framework that had bent era four through era
    // one's mechanics would have found an analogue for every one.
    const eraFourHasNone = MECHANIC_IDS.filter(
      (id) => succession.mechanics[id].kind === "no-analogue",
    );
    const eraOneHasNone = MECHANIC_IDS.filter(
      (id) => winter.mechanics[id].kind === "no-analogue",
    );
    expect(eraOneHasNone).toEqual([]);
    // The composition, not just the count: these are the rows both briefs explicitly rule out.
    expect(eraFourHasNone).toEqual([
      "M5",
      "M8",
      "M12",
      "M14",
      "M15",
      "M17",
      "M18",
      "M19",
      "M20",
      "M21",
    ]);
  });

  it("never answers the propagation row with no analogue", () => {
    // The inventory's own named trap: "era four has no propagation" would be a FALSE answer,
    // because a district drifting to a claimant is propagation with an unusual topology. Swept
    // over every crisis, so the answer cannot become available to a later one.
    for (const entry of CRISIS_ENTRIES) {
      expect(entry.mechanics.M9.kind, entry.eraId).toBe("shared-seam");
    }
  });

  it("keeps era one's two open rows open rather than quietly claiming them", () => {
    const winter = CRISIS_ENTRIES.find((entry) => entry.eraId === "prehistoric");
    if (!winter) {
      throw new Error("era one is expected in the registry");
    }
    // M2 is the unanswered-call gap and M14 is the fire's duration, which #407 is landing and
    // this pass deliberately did not touch. Both are admissions and both have to stay visible.
    expect(winter.mechanics.M2.kind).toBe("open");
    expect(winter.mechanics.M14.kind).toBe("open");
    expect(answerReason(winter.mechanics.M14)).toContain("#407");
  });
});
