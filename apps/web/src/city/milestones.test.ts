import {
  type CrisisDamage,
  crisisDamageId,
  foldCrisisDamage,
  isCrisisDamageClear,
  NO_CRISIS_DAMAGE,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import {
  cityRecoveredMilestone,
  firstCrisisMilestone,
  MILESTONE_CITY_RECOVERED,
  MILESTONE_FIRST_CRISIS,
} from "./milestones";

/**
 * THE TWO PREDICATES, DRIVEN THROUGH THE ENGINE'S OWN FOLD rather than over hand-built
 * damage records.
 *
 * `foldCrisisDamage` is what advances the mint, and the mint is the once-only key, so a
 * fixture that set `next_damage_id` by hand would be asserting against this file's belief
 * about the mint rather than against the mint. Every state below is reached by folding a
 * real damage report and clearing it the way the repair path does.
 *
 * `milestonesAreNotAPointSystem.test.ts` in `test/` holds the other half: that nothing
 * anywhere counts these, collects them, persists them or reads a clock to decide one.
 */

/** A crisis run that ruined one building and scarred two cells. */
function oneCrisis(damage: CrisisDamage = NO_CRISIS_DAMAGE): CrisisDamage {
  return foldCrisisDamage(damage, { buildings: ["NUM.2"], cells: ["1,1", "1,2"] });
}

/** Every ruin repaired, which is what the repair path leaves behind. */
function repaired(damage: CrisisDamage): CrisisDamage {
  return { ...damage, ruined_buildings: [], ruined_cells: [], suspended_civic: [] };
}

describe("the first-crisis milestone", () => {
  it("is the lead's own sentence, unedited", () => {
    // Quoted verbatim from the ruling, exclamation mark included: "overruling spov - short
    // achievements like 'You defeated your first crisis!' literally cant hurt".
    expect(MILESTONE_FIRST_CRISIS).toBe("You defeated your first crisis!");
  });

  it("fires on a city no crisis has ever reached", () => {
    expect(NO_CRISIS_DAMAGE.next_damage_id).toBe(1);
    expect(firstCrisisMilestone(NO_CRISIS_DAMAGE)).toBe(MILESTONE_FIRST_CRISIS);
  });

  it("is unconditional, so it cannot be missed", () => {
    // The guardrail that rules out "survived a crisis without losing a building": a
    // milestone you can fail to get is a punishment wearing a reward's clothes. This
    // predicate takes no outcome, and the proof is that a city carrying nothing and a city
    // about to be wrecked are the same input to it.
    expect(firstCrisisMilestone(NO_CRISIS_DAMAGE)).toBe(MILESTONE_FIRST_CRISIS);
    expect(isCrisisDamageClear(NO_CRISIS_DAMAGE)).toBe(true);
  });

  it("never fires again once a crisis has been carried back", () => {
    const after = oneCrisis();
    expect(after.next_damage_id).toBe(2);
    expect(firstCrisisMilestone(after)).toBeNull();
    // Repairing everything does not make it the first crisis again: the mint only rises.
    expect(firstCrisisMilestone(repaired(after))).toBeNull();
    expect(firstCrisisMilestone(oneCrisis(after))).toBeNull();
  });
});

describe("the recovery milestone", () => {
  it("fires on the transition to clear, and only on the transition", () => {
    const damaged = oneCrisis();
    const clear = repaired(damaged);
    expect(cityRecoveredMilestone(damaged, clear)).toBe(MILESTONE_CITY_RECOVERED);

    // A city that was ALREADY clear has not just recovered. This is the baseline
    // discipline: a line for something that happened three sessions ago is a false event.
    expect(cityRecoveredMilestone(clear, clear)).toBeNull();
    expect(cityRecoveredMilestone(NO_CRISIS_DAMAGE, NO_CRISIS_DAMAGE)).toBeNull();
  });

  it("waits for the LAST scar rather than the first repair", () => {
    const damaged = oneCrisis();
    // The building is repaired and two cells of ground are still scarred.
    const halfway = { ...damaged, ruined_buildings: [] };
    expect(isCrisisDamageClear(halfway)).toBe(false);
    expect(cityRecoveredMilestone(damaged, halfway)).toBeNull();
    // And it lands on the reclaim that finishes the job.
    expect(cityRecoveredMilestone(halfway, repaired(halfway))).toBe(
      MILESTONE_CITY_RECOVERED,
    );
  });

  it("is once only: a second crisis's recovery says nothing", () => {
    const first = oneCrisis();
    expect(cityRecoveredMilestone(first, repaired(first))).toBe(MILESTONE_CITY_RECOVERED);

    // A second winter mints `d2`, so the city has carried two crises and the line is spent.
    const second = oneCrisis(repaired(first));
    expect(crisisDamageId(second.next_damage_id - 1)).toBe("d2");
    expect(cityRecoveredMilestone(second, repaired(second))).toBeNull();
  });

  it("reads a suspended civic contribution as damage, like the predicate it wraps", () => {
    // `isCrisisDamageClear` counts all three sets, and so must this: a city whose civic
    // capacity is still suspended is not back on its feet, and a milestone that fired
    // there would be the game not noticing what is still wrong.
    const damaged = foldCrisisDamage(NO_CRISIS_DAMAGE, {
      buildings: ["NUM.2"],
      cells: [],
      suspended_civic: ["civic-1"],
    });
    const buildingsOnly = { ...damaged, ruined_buildings: [] };
    expect(cityRecoveredMilestone(damaged, buildingsOnly)).toBeNull();
    expect(cityRecoveredMilestone(buildingsOnly, repaired(buildingsOnly))).toBe(
      MILESTONE_CITY_RECOVERED,
    );
  });
});

describe("neither milestone is a score", () => {
  it("says nothing that could be added up", () => {
    for (const line of [MILESTONE_FIRST_CRISIS, MILESTONE_CITY_RECOVERED]) {
      expect(line, line).not.toMatch(/\d|%/);
      expect(line, line).toMatch(/^[A-Z].*[.!]$/);
      // Short, which is the lead's own word. His example is six words.
      expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(8);
    }
    // And they are two different sentences about two different beats: surviving a crisis
    // and putting the city back are not the same event, which is why there are two.
    expect(MILESTONE_FIRST_CRISIS).not.toBe(MILESTONE_CITY_RECOVERED);
  });
});
