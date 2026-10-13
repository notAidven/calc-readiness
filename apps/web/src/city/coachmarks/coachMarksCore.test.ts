import { ERA_SEQUENCE } from "@cr/skill-graph";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_ERA_ID } from "../eraState";
import {
  COACH_GROUP_ORDER,
  COACH_MARKS,
  COACH_SKIP_ALL_KEY,
  type CoachMarkId,
  type CoachState,
  coachGroupLabel,
  coachMarkKey,
  coachMarkReference,
  hasSeenCoachMark,
  hasSkippedCoachMarks,
  loadSeenCoachMarks,
  markCoachMarkSeen,
  nextCoachMark,
  ROADS_HINT_MIN_GOLD,
  resetCoachMarks,
  skipAllCoachMarks,
} from "./coachMarksCore";

/** A base "empty island" state; override the fields a scenario needs. */
function state(over: Partial<CoachState> = {}): CoachState {
  return {
    placedCount: 0,
    anyLessonStarted: false,
    anyInConstruction: false,
    anyComplete: false,
    allComplete: false,
    anyTestedOut: false,
    gold: 0,
    roadTileCount: 0,
    interleavedEligible: false,
    musicOn: false,
    ...over,
  };
}

const NONE = new Set<CoachMarkId>();

/** Every hint whose moment is live for this state, in list order. */
function relevantIds(s: CoachState): CoachMarkId[] {
  return COACH_MARKS.filter((mark) => mark.isRelevant(s)).map((mark) => mark.id);
}

/**
 * Walk a learner forward through a sequence of states, remembering hints as they are
 * shown (exactly as the controller remembers them), and assert that no single step
 * queues more than two tooltips. Returns the hints the walk reached.
 */
function walk(progression: readonly Partial<CoachState>[]): Set<CoachMarkId> {
  const seen = new Set<CoachMarkId>();
  for (const step of progression) {
    const queue = relevantIds(state(step)).filter((id) => !seen.has(id));
    expect(queue.length).toBeLessThanOrEqual(2);
    for (const id of queue) {
      seen.add(id);
    }
  }
  return seen;
}

describe("coachMarks — nextCoachMark selector", () => {
  it("shows 'place' on an empty island", () => {
    expect(nextCoachMark(state(), NONE)?.id).toBe("place");
  });

  it("shows 'learn' once a building is placed but no lesson has started", () => {
    expect(nextCoachMark(state({ placedCount: 1 }), NONE)?.id).toBe("learn");
  });

  it("shows 'build' while a building is under construction", () => {
    expect(
      nextCoachMark(
        state({ placedCount: 1, anyLessonStarted: true, anyInConstruction: true }),
        NONE,
      )?.id,
    ).toBe("build");
  });

  it("shows 'master' when a building is complete but not all are", () => {
    expect(
      nextCoachMark(
        state({ placedCount: 1, anyLessonStarted: true, anyComplete: true }),
        NONE,
      )?.id,
    ).toBe("master");
  });

  it("retires 'master' once everything is complete, and then has nothing left", () => {
    const finished = state({
      placedCount: 6,
      anyLessonStarted: true,
      anyComplete: true,
      allComplete: true,
    });
    // Nothing left to unlock, so the master hint's moment has passed. 'move' is still
    // true of a finished city (buildings can always be rearranged) and is the last
    // thing the tutorial has to say.
    expect(nextCoachMark(finished, NONE)?.id).toBe("move");
    expect(nextCoachMark(finished, new Set<CoachMarkId>(["move"]))).toBeNull();
  });

  it("respects order when several hints are relevant at once (build before master)", () => {
    const s = state({
      placedCount: 2,
      anyLessonStarted: true,
      anyInConstruction: true,
      anyComplete: true,
    });
    expect(nextCoachMark(s, NONE)?.id).toBe("build");
  });

  it("skips hints already seen (show-once)", () => {
    // place seen + still an empty island → no other hint is relevant yet.
    expect(nextCoachMark(state(), new Set<CoachMarkId>(["place"]))).toBeNull();
    // learn seen + placed → learn is skipped even though it is relevant.
    expect(
      nextCoachMark(state({ placedCount: 1 }), new Set<CoachMarkId>(["learn"])),
    ).toBeNull();
  });
});

describe("coachMarks — the hints that teach what shipped after the reel", () => {
  it("tells a learner where mute lives once music is on and they have interacted", () => {
    // Gated on a placed building purely as proof the autoplay gate has opened, so the
    // hint can never claim music is playing before anything could have played.
    expect(nextCoachMark(state({ musicOn: true }), NONE)?.id).toBe("place");
    expect(nextCoachMark(state({ placedCount: 1, musicOn: true }), NONE)?.id).toBe("sound");
    expect(nextCoachMark(state({ placedCount: 1, musicOn: false }), NONE)?.id).toBe(
      "learn",
    );
  });

  it("explains a tested-out building, which is the state the reel never covers", () => {
    // A test-out pretest retires the reel (UnlockCelebration owns that moment), so
    // these learners meet a built-but-unpracticed city with no intro at all.
    const testedOut = state({
      placedCount: 2,
      anyLessonStarted: true,
      anyTestedOut: true,
    });
    const hint = nextCoachMark(testedOut, NONE);
    expect(hint?.id).toBe("testedOut");
    expect(hint?.text(DEFAULT_ERA_ID)).toMatch(/without the lesson/i);
    expect(hint?.text(DEFAULT_ERA_ID)).toMatch(/practice set/i);
  });

  it("introduces gold the first time the learner has any", () => {
    // Mid-lesson with an empty wallet there is nothing to say about gold yet.
    expect(
      nextCoachMark(state({ placedCount: 1, anyLessonStarted: true }), NONE),
    ).toBeNull();
    const paid = state({ placedCount: 1, anyLessonStarted: true, gold: 15 });
    expect(nextCoachMark(paid, NONE)?.id).toBe("economy");
  });

  it("names the material's sinks in one hint rather than two", () => {
    const economy = COACH_MARKS.find((mark) => mark.id === "economy");
    // It named the Shop and roads until the 2026-08-03 sunset. Roads and the Build menu
    // are the two sinks a learner has now, and the folding is kept for the same reason:
    // two hints would fire in the same instant.
    expect(economy?.text(DEFAULT_ERA_ID)).toMatch(/roads/i);
    expect(economy?.text(DEFAULT_ERA_ID)).toMatch(/build/i);
    expect(COACH_MARKS.some((mark) => mark.id === ("shop" as CoachMarkId))).toBe(false);
  });

  it("mentions neither the shop nor XP in any hint, anywhere", () => {
    // A CENSUS over every hint's learner-visible text and its How-to-play reference
    // line, in every era — the copy is era-parameterised, so a single-era check would
    // sweep a tenth of what ships. The population is `COACH_MARKS` itself, floored, so a
    // hint added later is inside it without anyone remembering this file.
    expect(COACH_MARKS.length).toBeGreaterThanOrEqual(8);
    for (const era of ERA_SEQUENCE) {
      for (const mark of COACH_MARKS) {
        const copy = `${mark.text(era.id)} ${mark.reference?.(era.id) ?? ""}`;
        expect(copy.length, `${mark.id} says nothing in ${era.id}`).toBeGreaterThan(10);
        expect(copy, `${mark.id} names the sunset shop in ${era.id}`).not.toMatch(/shop/i);
        expect(copy, `${mark.id} names XP in ${era.id}`).not.toMatch(/\bxp\b/i);
        expect(copy, `${mark.id} names a cosmetic in ${era.id}`).not.toMatch(/cosmetic/i);
      }
    }
  });

  it("teaches that Roads is a TAB inside Build, and only before any road is laid", () => {
    const canPave = state({
      placedCount: 2,
      anyLessonStarted: true,
      anyComplete: true,
      gold: ROADS_HINT_MIN_GOLD,
    });
    const hint = nextCoachMark(canPave, new Set<CoachMarkId>(["economy", "master"]));
    expect(hint?.id).toBe("roads");
    expect(hint?.text(DEFAULT_ERA_ID)).toMatch(/tab inside build/i);

    // One lesson's pay is not enough: the hint waits for a short path's worth of gold,
    // which is also what keeps it off the busy "first building finished" moment.
    expect(relevantIds({ ...canPave, gold: ROADS_HINT_MIN_GOLD - 1 })).not.toContain(
      "roads",
    );
    // Self-retiring: a learner who found the tab on their own is never told about it.
    expect(relevantIds({ ...canPave, roadTileCount: 3 })).not.toContain("roads");
  });

  it("teaches lifting a road tile once one exists, and promises the full refund", () => {
    const paved = state({ placedCount: 2, anyLessonStarted: true, roadTileCount: 4 });
    const hint = nextCoachMark(paved, NONE);
    expect(hint?.id).toBe("roadRemove");
    expect(hint?.text(DEFAULT_ERA_ID)).toMatch(/every last unit comes back/i);
  });

  it("points at the Town Hall once interleaved practice is unlocked", () => {
    const eligible = state({
      placedCount: 3,
      anyLessonStarted: true,
      anyComplete: true,
      interleavedEligible: true,
    });
    const hint = nextCoachMark(
      eligible,
      new Set<CoachMarkId>(["master", "roadRemove", "roads"]),
    );
    expect(hint?.id).toBe("interleaved");
    // The hub is the Town Hall, and no SKILL building may be mistaken for it.
    // THREE of NUM.S's names are guarded: "Assembly Hall" is what it is called now
    // (D-ERA29); "Roundhouse" is its
    // era-one dressing since D-ERA31, and it is the newest hazard, because the dressing
    // NUM.S used to carry — the hub's round, now "Stone Circle" — moved to the hub in that
    // so the two rounds are now one word apart and a writer reaching for the hub's round
    // can land on the skill building's; "City Bank" (#148) survives in legacy content.
    //
    // "Stone Circle" is deliberately NOT guarded: since D-ERA31 it is the hub's own
    // dressing, so it is a legal word here — what may never appear is a SKILL's name.
    expect(hint?.text(DEFAULT_ERA_ID)).toContain("Town Hall");
    expect(hint?.text(DEFAULT_ERA_ID)).not.toContain("Assembly Hall");
    expect(hint?.text(DEFAULT_ERA_ID)).not.toContain("Roundhouse");
    expect(hint?.text(DEFAULT_ERA_ID)).not.toContain("City Bank");
    // It falls back to the Buildings disclosure, because the roster row it prefers
    // only exists while the roster is open.
    expect(hint?.anchor).toBe("townhall");
    expect(hint?.fallbackAnchor).toBe("buildings");
  });

  it("mentions moving last, and only in a settled city", () => {
    const settled = state({ placedCount: 3, anyLessonStarted: true, anyComplete: true });
    const seen = new Set<CoachMarkId>(["master"]);
    expect(nextCoachMark(settled, seen)?.id).toBe("move");
    // Two buildings is too early: it would have landed in the same breath as 'roads'.
    expect(relevantIds({ ...settled, placedCount: 2 })).not.toContain("move");
    expect(COACH_MARKS[COACH_MARKS.length - 1]?.id).toBe("move");
  });

  it("never stacks more than two hints onto one moment of a real playthrough", () => {
    // The sequencing claim the spec makes, pinned. If a future hint's precondition
    // collides with an existing moment, this fails here rather than handing the learner
    // a wall of tooltips.
    const progression: readonly Partial<CoachState>[] = [
      {}, // lands on an empty island
      { placedCount: 1, musicOn: true }, // places their first building (music kicks in)
      { placedCount: 1, musicOn: true, anyLessonStarted: true, anyInConstruction: true },
      {
        placedCount: 1,
        musicOn: true,
        anyLessonStarted: true,
        anyComplete: true,
        gold: 15,
      },
      {
        placedCount: 2,
        musicOn: true,
        anyLessonStarted: true,
        anyComplete: true,
        gold: 30,
      },
      {
        placedCount: 2,
        musicOn: true,
        anyLessonStarted: true,
        anyComplete: true,
        gold: 15,
        roadTileCount: 3,
      },
      {
        placedCount: 3,
        musicOn: true,
        anyLessonStarted: true,
        anyComplete: true,
        gold: 40,
        roadTileCount: 3,
      },
      {
        placedCount: 3,
        musicOn: true,
        anyLessonStarted: true,
        anyComplete: true,
        gold: 60,
        roadTileCount: 3,
        interleavedEligible: true,
      },
    ];

    const seen = walk(progression);
    // The whole list is reached except 'testedOut', which belongs to the OTHER entry
    // path (below) — so the bound above is not vacuous.
    expect(seen).toEqual(
      new Set(COACH_MARKS.map((mark) => mark.id).filter((id) => id !== "testedOut")),
    );

    // The test-out entry path: the diagnostic pre-builds buildings, the reel is retired,
    // and the learner arrives mid-game. Same bound has to hold on this path too.
    walk([
      { placedCount: 2, anyLessonStarted: true, anyTestedOut: true, musicOn: true },
      {
        placedCount: 2,
        anyLessonStarted: true,
        anyComplete: true,
        musicOn: true,
        gold: 15,
      },
    ]);
  });

  it("gives every hint a How to play section, so the panel cannot omit one", () => {
    for (const mark of COACH_MARKS) {
      expect(COACH_GROUP_ORDER).toContain(mark.group);
      expect(coachGroupLabel(mark.group, DEFAULT_ERA_ID)).toBeTruthy();
    }
  });

  it("keeps every hint free of internal node ids and emoji, in both phrasings", () => {
    for (const mark of COACH_MARKS) {
      for (const copy of [
        mark.text(DEFAULT_ERA_ID),
        coachMarkReference(mark, DEFAULT_ERA_ID),
      ]) {
        expect(copy).not.toMatch(/NUM\./);
        expect(copy).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });
});

describe("coachMarks — localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remembers seen hints per id and loads the set", () => {
    expect(hasSeenCoachMark("place")).toBe(false);
    markCoachMarkSeen("place");
    expect(localStorage.getItem(coachMarkKey("place"))).toBe("true");
    expect(hasSeenCoachMark("place")).toBe(true);

    markCoachMarkSeen("build");
    const seen = loadSeenCoachMarks();
    expect(seen.has("place")).toBe(true);
    expect(seen.has("build")).toBe(true);
    expect(seen.has("learn")).toBe(false);
  });

  it("'Skip tips' reads as every hint seen, so the pure selector needs no new argument", () => {
    expect(hasSkippedCoachMarks()).toBe(false);
    skipAllCoachMarks();
    expect(hasSkippedCoachMarks()).toBe(true);
    expect(localStorage.getItem(COACH_SKIP_ALL_KEY)).toBe("true");

    const seen = loadSeenCoachMarks();
    expect(seen.size).toBe(COACH_MARKS.length);
    expect(nextCoachMark(state(), seen)).toBeNull();
  });

  it("'Show tips again' clears every hint AND the skip-all opt-out", () => {
    markCoachMarkSeen("place");
    markCoachMarkSeen("roads");
    skipAllCoachMarks();

    resetCoachMarks();

    expect(hasSkippedCoachMarks()).toBe(false);
    expect(loadSeenCoachMarks().size).toBe(0);
    // The learner gets the hints their CURRENT progress makes relevant, not a replay
    // of the ones they have grown out of.
    expect(
      nextCoachMark(
        state({ placedCount: 2, anyLessonStarted: true, roadTileCount: 2 }),
        NONE,
      )?.id,
    ).toBe("roadRemove");
  });

  it("keeps the skip-all key out of the per-hint keyspace", () => {
    for (const mark of COACH_MARKS) {
      expect(coachMarkKey(mark.id)).not.toBe(COACH_SKIP_ALL_KEY);
    }
  });
});
