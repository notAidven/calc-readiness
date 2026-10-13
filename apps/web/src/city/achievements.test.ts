import {
  buildCityViewModel,
  type CrisisDamage,
  createHardWinter,
  type HardWinterState,
  hardWinterDamage,
  hardWinterReducer,
  NO_CRISIS_DAMAGE,
} from "@cr/game";
import { eraNumber } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { snapshotWithWinterDamage } from "../winter/scarLiveCity";
import {
  ACHIEVEMENTS,
  type AchievementState,
  achievementRows,
  crisesRecordedFromMint,
  forgetAchievements,
  hasEarnedAchievement,
  loadEarnedAchievements,
  markAchievementEarned,
  NEW_CITY_ACHIEVEMENT_STATE,
  newlyEarnedAchievements,
} from "./achievements";
import { createCityDevSession } from "./citySession";
import { clearEraId, DEFAULT_ERA_ID, loadEraId, nextEraId, saveEraId } from "./eraState";
import type { CityLoad } from "./types";
import { BUILDABLE_RADIUS, defaultPlacements, type Transform } from "./worldLayout";

/**
 * **EVERY ACHIEVEMENT IS ACTUALLY EARNABLE, ESTABLISHED BY REACHING THE STATE.**
 *
 * An achievement that fires on a condition nobody can reach is worse than no achievement,
 * and this repository has form: a validator rule whose population had been empty since a
 * design change removed all 63 of its inputs, and a livability warning that turned out to
 * be unreachable in era one across all 4,096 mastery vectors. Two of the five rungs of
 * `WinterConclusion`'s own verdict ladder are unreachable at the shipped tuning by that
 * file's own account. So *"the predicate returns true for this object literal"* is not the
 * claim worth making here.
 *
 * **So none of the four states below is written down as an object.** Each is produced by
 * the same code the game runs:
 *
 *  - the crisis one plays a real Hard Winter through the real reducer until it ends, takes
 *    the real `hardWinterDamage` projection, and folds it through `snapshotWithWinterDamage`
 *    — which is the carry-back button's own function;
 *  - the era one writes and reads the real `eraState` storage the advance ceremony writes;
 *  - the mastery one places a skill in a real `createCityDevSession` and finishes its
 *    practice set, then reads the mastery back through `buildCityViewModel`, which is the
 *    same derivation the surface renders from;
 *  - the recovery one is the first two crossed, which is the state a player is in after a
 *    mauling they have not paid to repair.
 *
 * What that buys over a literal: a change to the damage mint, to `eraNumber`, to the
 * mastery ceiling or to the winter's tuning fails here rather than leaving a row nobody can
 * earn.
 */

/* -------------------------------------------------------------------------- */
/* Reaching each state through the code the game runs                         */
/* -------------------------------------------------------------------------- */

/** Era one's six, the roster a fresh island offers. */
const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/**
 * A winter played to its end with every round answered as badly as the engine allows.
 *
 * `correct: 0` on every round is the `none` tier, which wards nothing, so the frost reaches
 * the buildings and the run ends with ruins. It is played through `hardWinterReducer` and
 * nothing else, so the board this hands back is a board the game can deal.
 */
function aRuinousWinter(): HardWinterState {
  let winter = createHardWinter({
    era: DEFAULT_ERA_ID,
    buildings: [
      { node_id: "NUM.S", col: 0, row: 0 },
      { node_id: "NUM.F", col: 2, row: -2 },
      { node_id: "NUM.2", col: -2, row: 1 },
    ],
  });
  // Bounded by the encounter's own length, so a reducer that stopped advancing fails the
  // assertion below rather than spinning.
  for (let pass = 0; pass <= winter.rounds && winter.phase !== "ended"; pass += 1) {
    if (winter.phase === "declaring") {
      winter = hardWinterReducer(winter, {
        type: "declare",
        action: { kind: "fire", col: 0, row: 0 },
      });
    }
    if (winter.phase === "answering") {
      winter = hardWinterReducer(winter, { type: "resolve", correct: 0, asked: 3 });
    }
    if (winter.phase === "resolved") {
      winter = hardWinterReducer(winter, { type: "end_round" });
    }
  }
  return winter;
}

/** The damage a city carries after that winter is carried home. The real fold. */
function damageAfterCarryingAWinterHome(): CrisisDamage {
  const winter = aRuinousWinter();
  expect(winter.phase, "the winter never ended, so nothing can be carried home").toBe(
    "ended",
  );
  const report = hardWinterDamage(winter);
  // The floor under everything the crisis and recovery rows rest on: a winter that ruined
  // nothing folds nothing, and `scarLiveCity` refuses it as `nothing_to_record`.
  expect(
    report.buildings.length,
    "the worst winter the engine can play ruined nothing, so no city can carry damage home",
  ).toBeGreaterThan(0);
  const snapshot = snapshotWithWinterDamage(
    {
      node_states: [],
      neighborhood_states: [],
      placements: [],
      town_hall: null,
      crisis_damage: NO_CRISIS_DAMAGE,
    },
    report,
  );
  return snapshot.crisis_damage ?? NO_CRISIS_DAMAGE;
}

/** A spot for a node clear of the pre-seeded hall, exactly as `citySession.test.ts` does. */
async function spotFor(
  session: ReturnType<typeof createCityDevSession>,
  nodeId: string,
): Promise<Transform> {
  const hall = (await session.load()).town_hall;
  if (!hall) {
    throw new Error("expected a pre-seeded town hall");
  }
  const spot = defaultPlacements([nodeId], [hall], BUILDABLE_RADIUS).find(
    (placed) => placed.nodeId === nodeId,
  );
  if (!spot) {
    throw new Error(`no free spot for ${nodeId}`);
  }
  return { col: spot.col, row: spot.row, rot: spot.rot };
}

/** A city load in which one skill has been taken to full mastery, through the session. */
async function cityWithOneSkillMastered(): Promise<CityLoad> {
  const session = createCityDevSession();
  const node = D1_NODES[0];
  await session.placeSkill(node, await spotFor(session, node));
  // The practice-completion stand-in, at the top of the ladder. `advanceMasteryDev` clamps
  // to the ceiling itself, so this asks for the ceiling rather than naming it.
  await session.advanceMasteryDev(node, 3);
  return session.load();
}

/** How the surface counts full-mastery skills: the view model's `gold`, nothing else. */
function masteredSkillsIn(load: CityLoad): number {
  return buildCityViewModel({
    node_states: load.node_states,
    neighborhood_state: load.neighborhood_state ?? null,
  }).buildings.filter((building) => building.gold).length;
}

function stateOf(id: string): (state: AchievementState) => boolean {
  const found = ACHIEVEMENTS.find((achievement) => achievement.id === id);
  if (!found) {
    throw new Error(`no achievement declared with id ${id}`);
  }
  return found.isEarned;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("every achievement is reachable, by reaching it", () => {
  it("gives the crisis row a city that has carried a real winter home", () => {
    const damage = damageAfterCarryingAWinterHome();
    const state: AchievementState = {
      ...NEW_CITY_ACHIEVEMENT_STATE,
      crisesRecorded: crisesRecordedFromMint(damage.next_damage_id),
    };
    // The mint really moved, which is the whole condition, and it moved by exactly one run.
    expect(state.crisesRecorded).toBe(1);
    expect(stateOf("crisis-behind-you")(state)).toBe(true);
    // AND A FRESH ISLAND DOES NOT HAVE IT, so the assertion above is about the winter.
    expect(stateOf("crisis-behind-you")(NEW_CITY_ACHIEVEMENT_STATE)).toBe(false);
  });

  it("gives the era row a city standing where a real advance would put it", () => {
    const second = nextEraId(DEFAULT_ERA_ID);
    // The floor: there IS a second age to advance into. On a one-era sequence this row
    // would be the unreachable condition this file exists to rule out.
    expect(second, "the authored era sequence has no second age").not.toBeNull();
    if (second === null) {
      return;
    }
    saveEraId(second);
    const state: AchievementState = {
      ...NEW_CITY_ACHIEVEMENT_STATE,
      agesBehind: eraNumber(loadEraId()) - 1,
    };
    expect(state.agesBehind).toBe(1);
    expect(stateOf("first-age")(state)).toBe(true);

    clearEraId();
    expect(eraNumber(loadEraId()) - 1).toBe(0);
    expect(stateOf("first-age")({ ...NEW_CITY_ACHIEVEMENT_STATE, agesBehind: 0 })).toBe(
      false,
    );
  });

  it("gives the mastery row a skill taken to the top of the ladder in a real session", async () => {
    const load = await cityWithOneSkillMastered();
    const state: AchievementState = {
      ...NEW_CITY_ACHIEVEMENT_STATE,
      masteredSkills: masteredSkillsIn(load),
    };
    expect(state.masteredSkills).toBe(1);
    expect(stateOf("first-mastery")(state)).toBe(true);

    // A city whose skill is merely BUILT does not have it, which is the distinction the
    // copy makes: topping out is not mastery.
    const built = createCityDevSession();
    const node = D1_NODES[1];
    await built.placeSkill(node, await spotFor(built, node));
    await built.advanceMasteryDev(node, 2);
    const partial = masteredSkillsIn(await built.load());
    expect(partial, "a mastery-2 building already reads as full mastery").toBe(0);
    expect(
      stateOf("first-mastery")({
        ...NEW_CITY_ACHIEVEMENT_STATE,
        masteredSkills: partial,
      }),
    ).toBe(false);
  });

  it("gives the recovery row a mastered skill over a city still holding a ruin", async () => {
    const damage = damageAfterCarryingAWinterHome();
    const load = await cityWithOneSkillMastered();
    const state: AchievementState = {
      crisesRecorded: crisesRecordedFromMint(damage.next_damage_id),
      agesBehind: 0,
      masteredSkills: masteredSkillsIn(load),
      standingRuins: damage.ruined_buildings.length,
    };
    expect(state.standingRuins).toBeGreaterThan(0);
    expect(state.masteredSkills).toBeGreaterThan(0);
    expect(stateOf("learning-through-ruin")(state)).toBe(true);

    // NEITHER HALF ALONE, which is what makes it a different row rather than a second
    // spelling of the mastery one.
    expect(stateOf("learning-through-ruin")({ ...state, standingRuins: 0 })).toBe(false);
    expect(stateOf("learning-through-ruin")({ ...state, masteredSkills: 0 })).toBe(false);
  });

  /**
   * AND THE FOUR TOGETHER, on one city, because a set of individually reachable rows can
   * still be a set no single run can hold: each state above was built in isolation.
   */
  it("lets one city hold all four at once", async () => {
    const damage = damageAfterCarryingAWinterHome();
    const load = await cityWithOneSkillMastered();
    const second = nextEraId(DEFAULT_ERA_ID);
    if (second === null) {
      throw new Error("the authored era sequence has no second age");
    }
    saveEraId(second);

    const state: AchievementState = {
      crisesRecorded: crisesRecordedFromMint(damage.next_damage_id),
      agesBehind: eraNumber(loadEraId()) - 1,
      masteredSkills: masteredSkillsIn(load),
      standingRuins: damage.ruined_buildings.length,
    };
    expect(newlyEarnedAchievements(state, new Set()).map((a) => a.id)).toEqual(
      ACHIEVEMENTS.map((a) => a.id),
    );
  });
});

describe("earned once, and permanently", () => {
  it("remembers an achievement across a read, and a reload reads storage again", () => {
    expect(loadEarnedAchievements().size).toBe(0);
    const first = ACHIEVEMENTS[0];
    if (first === undefined) {
      throw new Error("the table is empty");
    }

    markAchievementEarned(first.id);
    expect(hasEarnedAchievement(first.id)).toBe(true);
    // `loadEarnedAchievements` is the reload: it reads storage rather than any in-memory
    // set, so this is the assertion that survives a page refresh.
    expect([...loadEarnedAchievements()]).toEqual([first.id]);

    // Recording it twice is not two of anything. There is no count to increment.
    markAchievementEarned(first.id);
    expect(loadEarnedAchievements().size).toBe(1);
  });

  it("stops offering one it has already recorded, whatever the state says", () => {
    const everything: AchievementState = {
      crisesRecorded: 3,
      agesBehind: 4,
      masteredSkills: 6,
      standingRuins: 2,
    };
    const all = newlyEarnedAchievements(everything, new Set());
    expect(all.length).toBe(ACHIEVEMENTS.length);

    // The earning pass is idempotent, which is what stops a re-render, a reload or a
    // second crisis re-announcing something.
    const earned = new Set(all.map((achievement) => achievement.id));
    expect(newlyEarnedAchievements(everything, earned)).toEqual([]);
  });

  it("forgets every one on the dev reset, and nothing else", () => {
    localStorage.setItem("cr.coach.place", "true");
    for (const achievement of ACHIEVEMENTS) {
      markAchievementEarned(achievement.id);
    }
    expect(loadEarnedAchievements().size).toBe(ACHIEVEMENTS.length);

    forgetAchievements();
    expect(loadEarnedAchievements().size).toBe(0);
    // A neighbouring key under a different prefix is untouched: this walks the table
    // rather than clearing by prefix.
    expect(localStorage.getItem("cr.coach.place")).toBe("true");
  });

  /**
   * Storage being unavailable loses the record and nothing else. `markAchievementEarned`'s
   * `catch` is the claim; a throwing `setItem` is how it is measured, because "there is a
   * try/catch" and "the surface survives private mode" are two claims.
   */
  it("survives storage that refuses to be written", () => {
    const refuses = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      expect(() => markAchievementEarned("crisis-behind-you")).not.toThrow();
      // The refusal really happened, so the absence below is the catch working rather than
      // a spy that never ran.
      expect(refuses).toHaveBeenCalled();
      expect(hasEarnedAchievement("crisis-behind-you")).toBe(false);
    } finally {
      refuses.mockRestore();
    }
  });
});

describe("the list reads as a record and an invitation", () => {
  it("shows the earned sentence for an earned row and the invitation for the rest", () => {
    const one = ACHIEVEMENTS[1];
    if (one === undefined) {
      throw new Error("the table has fewer than two rows");
    }
    const rows = achievementRows(new Set([one.id]));
    expect(rows.length).toBe(ACHIEVEMENTS.length);

    const shown = rows.find((row) => row.id === one.id);
    expect(shown?.earned).toBe(true);
    expect(shown?.line).toBe(one.earned);

    for (const row of rows.filter((entry) => entry.id !== one.id)) {
      const declared = ACHIEVEMENTS.find((entry) => entry.id === row.id);
      expect(row.earned).toBe(false);
      expect(row.line).toBe(declared?.toEarn);
      // And the invitation is a DIFFERENT sentence, so an unearned row is not the earned
      // one in the past tense with a tick missing.
      expect(row.line).not.toBe(declared?.earned);
    }
  });

  it("reads earned rows first, so the record comes before the invitation", () => {
    const last = ACHIEVEMENTS[ACHIEVEMENTS.length - 1];
    if (last === undefined) {
      throw new Error("the table is empty");
    }
    const rows = achievementRows(new Set([last.id]));
    expect(rows[0]?.id).toBe(last.id);
    expect(rows.slice(1).every((row) => !row.earned)).toBe(true);
  });
});
