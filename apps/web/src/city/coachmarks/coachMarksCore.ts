/**
 * Contextual coach-marks — the pure core (no React): the ordered hint list, the
 * game-state shape they read, the "which hint shows now" selector, and the
 * localStorage helpers. After the first-run demo reel hands off, `CoachMarks`
 * surfaces the next relevant, unseen hint over the real HUD as the learner plays.
 * See `docs/superpowers/specs/2026-07-24-demo-reel-coachmarks-design.md` for the
 * original four hints and `2026-07-27-tutorial-refresh-design.md` for the seven
 * that teach the economy, roads, the hub, moving, and the soundtrack.
 */

import { INTERLEAVED_PRACTICE_MIN_COMPLETED } from "@cr/economy";
import type { EraId } from "@cr/skill-graph";

import { materialWord, materialWordCapitalised } from "../../economy/materialWord";
import { runtimeStorage } from "../../storage/runtimeStorage";
import { ROAD_TILE_GOLD_COST } from "../roads";

/** The coach-marks, in the order they can appear across a first playthrough. */
export type CoachMarkId =
  | "place"
  | "sound"
  | "testedOut"
  | "learn"
  | "build"
  | "economy"
  | "master"
  | "roads"
  | "roadRemove"
  | "interleaved"
  | "move";

/**
 * Which HUD element a hint or a tutorial spotlight anchors to (resolved to an element
 * by `CoachMarks` and by `OnboardingSpotlight`).
 *
 * **THE LAST SIX ARE NOT HINT ANCHORS AND THAT IS NOT A GAP.** `population`,
 * `livability` and `happiness` are the City Life panel's three rows, `cityLife` is the whole
 * panel, `town` is the always-visible progress capsule, and `menu` is the ☰ button. They let
 * onboarding ring the real visible surface each concept teaches. No `COACH_MARKS` entry
 * points at one; the two consumers share a registry, not a list.
 *
 * `menu` and `sound` deliberately resolve to the same ☰ button — Sound lives inside the
 * Menu, so the door to both is one control, and naming them separately keeps each
 * spotlight's INTENT readable at the call site.
 *
 * ⚑ `camera` IS NEITHER A HINT ANCHOR NOR A SPOTLIGHT TARGET. It is the camera toolbar, and it
 * is registered so a hint can be told to KEEP OFF it: the first-use hint anchors above the Build
 * button with the toolbar between them, and covered up to 12,504px² of it. The registry is the
 * seam for exactly this — the toolbar is `CitySurface`'s own child, but the tooltip that has to
 * avoid it is three components away — and `coachmarks/tooltipPlacement.ts` is what does the
 * avoiding.
 */
export type CoachAnchor =
  | "build"
  | "buildings"
  | "viewport"
  | "callout"
  | "economy"
  | "sound"
  | "townhall"
  | "population"
  | "livability"
  | "happiness"
  | "cityLife"
  | "town"
  | "menu"
  | "camera";

/**
 * Which section of the How to play panel a hint is listed under. Grouping lives on
 * the hint itself so that panel's reference list is GENERATED from this table and
 * cannot drift from the hints a learner actually gets.
 */
export type CoachGroup = "build" | "gold" | "practice" | "sound";

/**
 * How much of the era's material the roads hint waits for: enough for a short path
 * (four tiles), not for one lonely tile. Two reasons, and the second is the
 * load-bearing one.
 *
 *  1. Honesty — pointing someone at Roads when they can afford a single tile is a tip
 *     they cannot act on in any satisfying way.
 *  2. SEQUENCING. This is what keeps the hint off the "first lesson finished" moment,
 *     which already carries `economy` and `master`. An earlier draft staggered it on
 *     "a second building has been placed" instead, which works for a learner who
 *     starts on an empty island — and fails completely for one who TESTED OUT, since
 *     the diagnostic hands them several placed buildings before they earn anything. The
 *     STOCKPILE is the signal that staggers both entry paths, because one lesson pays a
 *     sixth of the era's total.
 */
export const ROADS_HINT_MIN_GOLD = ROAD_TILE_GOLD_COST * 4;

/**
 * The How to play panel's section heading for a group, in the era the city is standing
 * in. A function rather than a record because one of the four headings IS the era's
 * material: it said "Gold" until the gold-drop retired that currency, then era one's
 * "Stone" in all ten eras while the word was a module constant.
 */
export function coachGroupLabel(group: CoachGroup, eraId: EraId): string {
  switch (group) {
    case "build":
      return "Building your city";
    case "practice":
      return "Lessons and practice";
    // The word comes from the shipped material registry, so a rename reaches this
    // heading rather than leaving it naming something that does not exist.
    case "gold":
      return materialWordCapitalised(eraId);
    default:
      return "Sound";
  }
}

/** The section order the How to play panel renders. */
export const COACH_GROUP_ORDER: readonly CoachGroup[] = [
  "build",
  "practice",
  "gold",
  "sound",
];

/**
 * The minimal live game state the coach-marks read (derived by `CitySurface` from
 * its city view model, the shared wallet, and the audio preferences). Each field is
 * a simple, already-computed signal so the selector stays pure + trivially testable.
 */
export interface CoachState {
  /** Buildings placed on the island. */
  readonly placedCount: number;
  /** Any placed building whose lesson has started (past not_started/preview). */
  readonly anyLessonStarted: boolean;
  /** Any placed building mid lesson/practice (teaching or practice, not yet built). */
  readonly anyInConstruction: boolean;
  /** Any placed building topped out (built or mastered). */
  readonly anyComplete: boolean;
  /** Every building is complete — nothing left to unlock (hides the master hint). */
  readonly allComplete: boolean;
  /**
   * Any placed building the diagnostic put up WITHOUT its lesson (`tested_out`).
   * These learners never see the reel — it is retired so `UnlockCelebration` owns
   * that moment — so the first thing they need is what that state means.
   */
  readonly anyTestedOut: boolean;
  /**
   * The spendable stockpile — the road-net wallet balance the HUD shows.
   *
   * Still NAMED `gold`, deliberately: it is an internal signal with no learner-facing
   * text on it, and renaming it reaches `CitySurface` and four suites for no change in
   * behaviour. Reported as a seam rather than done here.
   */
  readonly gold: number;
  /** Road tiles laid on the island. */
  readonly roadTileCount: number;
  /** The Town Hall's interleaved practice is unlocked (≥2 finished practice sets). */
  readonly interleavedEligible: boolean;
  /** The soundtrack preference is on, so the learner is (or is about to be) hearing it. */
  readonly musicOn: boolean;
}

export interface CoachMarkDef {
  readonly id: CoachMarkId;
  /**
   * The hint copy (also the tooltip's accessible label), in the era the city is
   * standing in.
   *
   * A function of the era and not a string, uniformly, even though only two hints spend
   * their argument today. These were baked at import from `MATERIAL_WORD`, which was
   * itself pinned to era one, so the economy and roads hints named era one's stone in
   * all ten eras. A mixed `string | (era) => string` would let the next era-dependent
   * sentence be written as the pinned shape without anything noticing.
   */
  readonly text: (eraId: EraId) => string;
  /**
   * How the How to play card states this rule, for the hints whose in-context wording
   * only makes sense in context. "Music is playing" is true at the moment the hint
   * appears and merely presumptuous in a reference list, and "You tested out of a
   * skill" is downright false for a reader who did not. Most hints need no second
   * phrasing, and `referenceText` gives the card the right one for the few that do.
   */
  readonly reference?: (eraId: EraId) => string;
  /** Preferred anchor element. */
  readonly anchor: CoachAnchor;
  /** Used when the preferred anchor isn't mounted (e.g. no callout open yet). */
  readonly fallbackAnchor?: CoachAnchor;
  /** Which How to play section lists this hint. */
  readonly group: CoachGroup;
  /** True while this hint's moment is live (drives which hint shows). */
  readonly isRelevant: (state: CoachState) => boolean;
}

/**
 * The ordered hints. The controller shows the FIRST that is relevant AND unseen, so
 * order encodes both the natural first-playthrough progression and priority.
 *
 * TWO PROPERTIES KEEP THIS LIST FROM BECOMING A LECTURE as it grows.
 *
 *  1. EVERY HINT SELF-RETIRES. A predicate says "…and the learner has not done this
 *     yet", so a learner who finds the Roads tab (or lifts a road tile, or opens the
 *     hub) on their own never gets that hint at all. The tutorial shrinks for players
 *     who explore.
 *  2. PRECONDITIONS ARE STAGGERED so no more than two hints become relevant at the
 *     same instant. `roads` waits for a second lesson's worth of gold and `move` for a
 *     third placed building, not because those numbers matter, but because their
 *     natural triggers would otherwise have fired in the same breath as
 *     `economy`/`master` and stacked three tooltips onto one moment. Where a fact
 *     would have needed its own hint at an already-busy moment it was folded into a
 *     neighbour instead: `master` carries mastery stars, and `economy` carries the
 *     material's sinks. (It carried them because a separate SHOP hint would have fired
 *     in the same instant; the shop is sunset and the folding is kept, because roads and
 *     the build menu are still two facts arriving at one moment.)
 *
 *     BOTH ENTRY PATHS COUNT. A learner who tests out of the diagnostic arrives with
 *     several buildings already placed, so "placed count" staggers nothing for them —
 *     which is why the roads hint keys off gold. `coachMarksCore.test.ts` walks both
 *     paths and fails if any moment queues a third tooltip.
 */
export const COACH_MARKS: readonly CoachMarkDef[] = [
  {
    id: "place",
    text: () => "Drag a building onto an open plot.",
    anchor: "build",
    group: "build",
    isRelevant: (s) => s.placedCount === 0,
  },
  {
    // Music is ON by default and starts on the learner's first interaction, so the
    // game owes them a visible sentence about the off switch immediately — a learner
    // in a silent classroom cannot wait until they finish a lesson to find it. The
    // placed-count term is proof that an interaction has happened, so this can never
    // claim music is playing before the autoplay gate has opened.
    id: "sound",
    text: () => "Music is playing. Open Menu for Sound, mute, and volume controls.",
    reference: () =>
      "Menu → Environment → Sound: music and sound effects each have a switch, plus a volume slider.",
    anchor: "sound",
    group: "sound",
    isRelevant: (s) => s.musicOn && s.placedCount > 0,
  },
  {
    // Wording tracks the honest test-out copy already shipped on the building menu:
    // the building went up without the lesson, and practice is what earns the stars.
    id: "testedOut",
    text: () =>
      "You tested out of a skill, so its building went up without the lesson. Run its practice set to earn its mastery stars.",
    reference: () =>
      "A skill you tested out of on the diagnostic has its building up already, without the lesson. Run its practice set to earn its mastery stars.",
    anchor: "buildings",
    group: "practice",
    isRelevant: (s) => s.anyTestedOut,
  },
  {
    id: "learn",
    text: () => "Click your building to start its lesson.",
    anchor: "viewport",
    group: "practice",
    isRelevant: (s) => s.placedCount > 0 && !s.anyLessonStarted,
  },
  {
    id: "build",
    text: () => "Finish the lesson + check, then practice to build it.",
    anchor: "callout",
    fallbackAnchor: "viewport",
    group: "practice",
    isRelevant: (s) => s.anyInConstruction,
  },
  {
    // **THIS NAMED XP AND THE SHOP UNTIL 2026-08-03**, and both are sunset. What is left
    // is the one currency and the two things a learner can do with it, so the hint gets
    // shorter rather than losing its moment: the material arriving is still the beat that
    // needs explaining, and it now has one name and two sinks instead of two names and
    // three. The `shop` anchor went with the chip it pointed at, so this anchors on the
    // stockpile itself — which is what `fallbackAnchor` already resolved to whenever the
    // chip was not mounted.
    id: "economy",
    text: (era) =>
      `A practiced skill earns its one-time ${materialWord(era)} award when it reaches the mastery bar. Spend ${materialWord(era)} on civic buildings and roads in Build.`,
    anchor: "economy",
    group: "gold",
    isRelevant: (s) => s.gold > 0,
  },
  {
    id: "master",
    text: () =>
      "The stars over a building show its mastery. Master a skill to unlock new buildings.",
    anchor: "buildings",
    group: "practice",
    isRelevant: (s) => s.anyComplete && !s.allComplete,
  },
  {
    // WHERE the Roads tab lives is the unguessable fact here — it is a tab inside the
    // Build menu, not a button of its own.
    id: "roads",
    text: (era) => `Roads are a tab inside Build. Each tile costs ${materialWord(era)}.`,
    anchor: "build",
    group: "gold",
    isRelevant: (s) => s.gold >= ROADS_HINT_MIN_GOLD && s.roadTileCount === 0,
  },
  {
    // Only the CLICK needs teaching: the tile popup and the paint bar both already
    // print the refund on the button that performs it.
    id: "roadRemove",
    text: () => "Click a paved tile to pick it back up. Every last unit comes back.",
    anchor: "viewport",
    group: "gold",
    isRelevant: (s) => s.roadTileCount > 0,
  },
  {
    id: "interleaved",
    text: (era) =>
      `The Town Hall now offers Interleaved practice with skills whose practice sets you finished. Cleared rounds can award ${materialWord(era)} while this era's allowance remains.`,
    reference: (era) =>
      `After you finish practice sets for ${INTERLEAVED_PRACTICE_MIN_COMPLETED} skills, the Town Hall offers Interleaved practice. Cleared rounds can award ${materialWord(era)} while this era's allowance remains.`,
    anchor: "townhall",
    fallbackAnchor: "buildings",
    group: "practice",
    isRelevant: (s) => s.interleavedEligible,
  },
  {
    // Last in the list, so it only ever fills a quiet moment.
    id: "move",
    text: () => "A placed building can still move. Open it and choose Move building.",
    anchor: "buildings",
    group: "build",
    isRelevant: (s) => s.placedCount >= 3 && s.anyComplete,
  },
];

/** How the How to play card states a hint (its `reference` form, or its hint copy). */
export function coachMarkReference(mark: CoachMarkDef, eraId: EraId): string {
  return (mark.reference ?? mark.text)(eraId);
}

/** The first relevant, not-yet-seen hint for the current state (or null for none). */
export function nextCoachMark(
  state: CoachState,
  seen: ReadonlySet<CoachMarkId>,
): CoachMarkDef | null {
  for (const mark of COACH_MARKS) {
    if (!seen.has(mark.id) && mark.isRelevant(state)) {
      return mark;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Per-hint localStorage (show-once, remembered across sessions)              */
/* -------------------------------------------------------------------------- */

const COACH_KEY_PREFIX = "cr.coach.";

/**
 * Set when the learner presses "Skip tips" on any hint: the whole contextual layer
 * is off until they ask for it back from How to play. It is deliberately NOT a
 * `CoachMarkId`, so it can never collide with a hint's own key.
 */
export const COACH_SKIP_ALL_KEY = `${COACH_KEY_PREFIX}skipAll`;

/** localStorage key for one hint's seen flag. */
export function coachMarkKey(id: CoachMarkId): string {
  return `${COACH_KEY_PREFIX}${id}`;
}

/** True once the learner has seen (and dismissed / advanced past) this hint. */
export function hasSeenCoachMark(id: CoachMarkId): boolean {
  try {
    return runtimeStorage()?.getItem(coachMarkKey(id)) === "true";
  } catch {
    return false;
  }
}

/** Remember that this hint has been seen so it never shows again. */
export function markCoachMarkSeen(id: CoachMarkId): void {
  try {
    runtimeStorage()?.setItem(coachMarkKey(id), "true");
  } catch {
    // Storage can be unavailable (private mode / disabled); the hint simply won't
    // be remembered across sessions. A nicety, not a correctness requirement.
  }
}

/** True once the learner has turned the whole contextual hint layer off. */
export function hasSkippedCoachMarks(): boolean {
  try {
    return runtimeStorage()?.getItem(COACH_SKIP_ALL_KEY) === "true";
  } catch {
    return false;
  }
}

/** "Skip tips" — retire every hint at once. Reversible from How to play. */
export function skipAllCoachMarks(): void {
  try {
    runtimeStorage()?.setItem(COACH_SKIP_ALL_KEY, "true");
  } catch {
    // See markCoachMarkSeen: unremembered, not broken.
  }
}

/**
 * "Show tips again" — forget every hint AND the skip-all opt-out, so the contextual
 * layer starts over from whatever state the learner's city is now in (they will get
 * the hints their progress makes relevant, not the ones they have grown out of).
 */
export function resetCoachMarks(): void {
  try {
    const storage = runtimeStorage();
    for (const mark of COACH_MARKS) {
      storage?.removeItem(coachMarkKey(mark.id));
    }
    storage?.removeItem(COACH_SKIP_ALL_KEY);
  } catch {
    // See markCoachMarkSeen.
  }
}

/**
 * The hints already seen (read once when the controller mounts). The skip-all
 * opt-out reads as "every hint seen", which keeps `nextCoachMark` a pure function of
 * state + seen with no extra argument.
 */
export function loadSeenCoachMarks(): Set<CoachMarkId> {
  const seen = new Set<CoachMarkId>();
  const skipAll = hasSkippedCoachMarks();
  for (const mark of COACH_MARKS) {
    if (skipAll || hasSeenCoachMark(mark.id)) {
      seen.add(mark.id);
    }
  }
  return seen;
}
