import type { WinterAction, WinterResolution, WinterRoundLog } from "@cr/game";
import { describe, expect, it } from "vitest";

import { resolutionEarnedItsChime, resolutionSfx, roundClosingSfx } from "./winterSfx";

/**
 * **THE ANTI-STACKING CLAIM, WHERE IT CAN ACTUALLY BE MEASURED.**
 *
 * `hardWinterSfx.test.tsx` plays a whole winter and asserts that a round which struck
 * several buildings makes one crack. That assertion is true and it is not sufficient:
 * inject the defect it was written for — one crack per ruined building — and the whole
 * suite still reports **41 passed**, because `building-frozen` carries a 400 ms retrigger
 * floor and the floor silently absorbed the extra plays. The test was measuring the
 * backstop and calling it the mechanism.
 *
 * So the subject here is the DECISION rather than the audio. What is claimed is that a
 * round which struck six buildings owes ONE crack, and a function that returns the sounds
 * a transition owes can be asked that directly. The same injection on this file reports
 * six and fails at the line below.
 *
 * The rest of the file is the shape of the population: every combination of "the frost
 * took ground", "the frost reached the settlement" and "the winter ended" resolves to a
 * named set, so a fourth event added to a round transition has to decide where it sits.
 */

function log(over: Partial<WinterRoundLog> = {}): WinterRoundLog {
  const action: WinterAction = { kind: "fire", col: 0, row: 0 };
  return {
    round: 1,
    resolution: {
      round: 1,
      action,
      correct: 0,
      asked: 3,
      tier: "none",
      magnitude: null,
      helped: [],
    },
    froze: 0,
    ruined: [],
    damaged: [],
    bite: 1,
    spread_steps: 1,
    ...over,
  };
}

function resolution(over: Partial<WinterResolution> = {}): WinterResolution {
  return {
    round: 1,
    action: { kind: "fire", col: 0, row: 0 },
    correct: 3,
    asked: 3,
    tier: "strong",
    magnitude: 2,
    helped: [],
    ...over,
  };
}

describe("closing a round", () => {
  it("cracks ONCE for a round that ruined six buildings", () => {
    const sounds = roundClosingSfx(
      log({ froze: 9, ruined: ["a", "b", "c", "d", "e", "f"] }),
      false,
    );

    expect(
      sounds.filter((sound) => sound === "building-frozen"),
      "the event is that the frost reached the settlement, which happened once",
    ).toHaveLength(1);
  });

  it("cracks once for a round that ruined some and merely damaged others", () => {
    const sounds = roundClosingSfx(
      log({ froze: 4, ruined: ["a", "b"], damaged: ["c", "d", "e"] }),
      false,
    );

    expect(sounds.filter((sound) => sound === "building-frozen")).toHaveLength(1);
  });

  it("says nothing about buildings on a round that reached none of them", () => {
    expect(roundClosingSfx(log({ froze: 5 }), false)).toEqual(["frost-advance"]);
  });

  it("says nothing about the ground on a round the frost took none of", () => {
    expect(roundClosingSfx(log({ froze: 0, damaged: ["a"] }), false)).toEqual([
      "building-frozen",
    ]);
  });

  it("is silent on a round where nothing at all happened", () => {
    expect(roundClosingSfx(log(), false)).toEqual([]);
    expect(roundClosingSfx(undefined, false)).toEqual([]);
  });

  it("drips only on the transition that ends the winter", () => {
    expect(roundClosingSfx(log({ froze: 3 }), false)).not.toContain("thaw");
    expect(roundClosingSfx(log({ froze: 3 }), true)).toContain("thaw");
    // The end of a winter can arrive on a round that also took ground and struck a
    // building, which is three events on one press and deliberately three.
    expect(roundClosingSfx(log({ froze: 3, ruined: ["a", "b"] }), true)).toEqual([
      "frost-advance",
      "building-frozen",
      "thaw",
    ]);
  });

  it("never repeats a sound within one transition, however the round went", () => {
    for (const froze of [0, 1, 40]) {
      for (const ruined of [[], ["a"], ["a", "b", "c"]]) {
        for (const damaged of [[], ["d"], ["d", "e", "f", "g"]]) {
          for (const justEnded of [false, true]) {
            const sounds = roundClosingSfx(log({ froze, ruined, damaged }), justEnded);
            expect(
              new Set(sounds).size,
              `froze ${froze}, ruined ${ruined.length}, damaged ${damaged.length}`,
            ).toBe(sounds.length);
          }
        }
      }
    }
  });
});

describe("resolving a round", () => {
  it("lights a fire that caught, and stays quiet about one that did not", () => {
    expect(resolutionSfx(resolution())).toEqual(["fire-lit"]);
    // `magnitude` is null at tier `none`: a laid hearth that bought nothing.
    expect(resolutionSfx(resolution({ tier: "none", magnitude: null }))).toEqual([]);
  });

  it("says nothing about a fire when the action was a reinforce", () => {
    expect(
      resolutionSfx(resolution({ action: { kind: "reinforce", node_id: "NUM.S" } })),
    ).toEqual([]);
  });

  it("earns the check mark only where the round earned something", () => {
    expect(resolutionEarnedItsChime(resolution({ tier: "strong" }))).toBe(true);
    expect(resolutionEarnedItsChime(resolution({ tier: "weak" }))).toBe(true);
    expect(resolutionEarnedItsChime(resolution({ tier: "none" }))).toBe(false);
    expect(resolutionEarnedItsChime(null)).toBe(false);
  });
});
