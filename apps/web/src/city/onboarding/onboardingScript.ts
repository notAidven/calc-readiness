import { INTERLEAVED_PRACTICE_MIN_COMPLETED } from "@cr/economy";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import { materialWord } from "../../economy/materialWord";
import type { AdvisorDress, OruMood } from "../../lessons/OruAdvisorCharacter";
import { runtimeStorage } from "../../storage/runtimeStorage";
import type { CoachAnchor, CoachMarkId } from "../coachmarks/coachMarksCore";
import { CURRENT_ERA_ID, resolveEraAdvisor } from "../eraDressing";

/**
 * The first-run script and every learner-visible task string it owns.
 *
 * The register is calm, concrete, and complete: no slogans or primitive fragments. Two
 * named exceptions carry an exclamation mark on explicit product instruction (2026-08-21):
 * the advisor's own opening "Hello!" and the "resources" moment's reward line -- both are
 * called out by exact string wherever the corpus is swept for the rejected register. Each
 * frame carries one part of the loop, and four frames hand the learner into an existing
 * live surface instead of describing it from the bubble.
 *
 * The mechanics come from their authorities:
 *
 * - `INTERLEAVED_PRACTICE_MIN_COMPLETED` controls the Town Hall entry.
 * - `materialWord` resolves the current era's resource.
 *
 * The Bay row is filtered through {@link OnboardingSurfaces}. Its guided visit mounts the real
 * navigator; this module never invents a second island view.
 *
 * Add a moment to {@link OnboardingMomentId} and {@link MOMENT_BODIES}. Record key order is the
 * sequence, so the step count, dev replay, reference card, copy sweeps, and frame inventory move
 * together. Whether the prose is good still requires independent copy and UX review; the tests
 * only enforce factual coverage, bounded frames, and the rejected register's absence.
 */

/** The moments, in the order a first-run learner meets them. */
export type OnboardingMomentId =
  | "advisor"
  | "bay"
  | "place"
  | "lessons"
  | "resources"
  | "civic"
  | "cityLife"
  | "townhall"
  | "allSet";

/** Moments completed by visiting a live game surface rather than reading another paragraph. */
export type OnboardingActionMomentId = "lessons" | "civic" | "townhall" | "bay";

/** Copy for one guided live-surface visit. */
export interface OnboardingActionTaskCopy {
  readonly open: string;
  readonly done: string;
  readonly nudge: string;
}

/**
 * The four non-destructive surface visits. The host opens its existing surface; onboarding
 * only records that it was viewed and never performs the surface's game actions.
 */
export const ONBOARDING_ACTION_TASKS: Readonly<
  Record<OnboardingActionMomentId, OnboardingActionTaskCopy>
> = {
  lessons: {
    open: "Open skill building",
    done: "You viewed the real lesson and practice entry.",
    nudge: "Open the skill building before continuing.",
  },
  civic: {
    open: "Open Build",
    done: "You placed a civic building.",
    nudge: "Place a civic building before continuing.",
  },
  townhall: {
    open: "Open Town Hall",
    done: "You viewed the Town Hall's Interleaved practice entry.",
    nudge: "Open the Town Hall before continuing.",
  },
  bay: {
    open: "Open the Bay",
    done: "You navigated the real Bay and returned to the tour.",
    nudge: "Move to another island in the Bay before continuing.",
  },
};

/** Which live-surface tasks this run has completed. Kept outside learning progress. */
export type OnboardingActionVisits = Readonly<Record<OnboardingActionMomentId, boolean>>;

export const EMPTY_ONBOARDING_ACTION_VISITS: OnboardingActionVisits = {
  lessons: false,
  civic: false,
  townhall: false,
  bay: false,
};

export function isOnboardingActionMoment(
  id: OnboardingMomentId,
): id is OnboardingActionMomentId {
  return id === "lessons" || id === "civic" || id === "townhall" || id === "bay";
}

/**
 * **A SURFACE A MOMENT NEEDS BEFORE IT MAY BE TAUGHT.**
 *
 * `bay` is the archipelago navigator, which is not universally on. A tutorial that told the
 * rest of the cities to open it would be teaching a control the learner cannot find.
 *
 * The condition is on the MOMENT rather than on its wording, so the moment either happens with
 * the thing it describes on screen or does not happen at all.
 */
export interface OnboardingSurfaces {
  /** The bay navigator (`☰ Menu → The bay`) is reachable in this city. */
  readonly bay: boolean;
}

/** What a city with nothing extra switched on gets: the moments everybody is taught. */
export const NO_EXTRA_SURFACES: OnboardingSurfaces = { bay: false };

/** Everything a moment says, with the era's words already resolved into it. */
export interface OnboardingMoment {
  readonly id: OnboardingMomentId;
  /** His pose. `talk` unless the moment is about something he can point at. */
  readonly mood: OruMood;
  /**
   * The step's name in the accessibility tree. Announced, never drawn.
   *
   * It is what is left of the old on-screen heading. A heading over a single sentence is a
   * label on a label, and a stack of labels is what made the old screen read as a
   * specification; a `<section>` with no accessible name is worse, so the name stays and
   * the drawing goes.
   */
  readonly title: string;
  /** The shout, at the top of the bubble in speaking type. What he actually says. */
  readonly lead: string;
  /**
   * One or two sentences under the shout, in prose. Never a list.
   *
   * The shout carries the concept and this carries what the learner does about it. Both are
   * load-bearing, which is a change from the old rows: with three bullets underneath, a
   * shout could afford to be a hook that said nothing.
   */
  readonly body: string;
  /**
   * The live HUD control lit up while this moment is on screen, or null when there is
   * nothing on screen to point at.
   *
   * A `CoachAnchor` rather than a selector, so the spotlight resolves an element through the
   * registry the contextual hints already use and a renamed control is a compile error here
   * rather than a spotlight over empty air.
   */
  readonly spotlight: CoachAnchor | null;
  /**
   * The surface this moment describes, when it describes one that is not always there.
   *
   * `undefined` on every moment about the island itself, which is the common case and the
   * default. See {@link OnboardingSurfaces}.
   */
  readonly requires?: keyof OnboardingSurfaces;
}

/** A moment before its id is attached: what {@link MOMENT_BODIES} rows return. */
type OnboardingMomentBody = Omit<OnboardingMoment, "id">;

/**
 * THE ROWS. Keyed by the id union, so the set cannot drift from the type in either direction,
 * and read in key order, so this literal IS the sequence.
 *
 * The `Record` is doing the same work `CRISIS_ACTION_TERMS`'s does one surface over: a moment
 * added to the union without a row here fails to compile, and a row whose moment has been
 * removed fails to compile too. A written-down list would have gone on narrating a tutorial
 * that no longer existed, and the guard over it would have been counting its own list.
 */
const MOMENT_BODIES: Readonly<
  Record<OnboardingMomentId, (eraId: EraId) => OnboardingMomentBody>
> = {
  advisor: () => ({
    mood: "talk",
    title: "Your advisor",
    // Says who he is and what he is for; how to control the tour is NOT repeated here
    // any more -- the persistent footer under every step ("You can replay this tour
    // from Menu, under How to play") already covers Menu, and the only escape hatch
    // worth calling out up front is Skip, which the footer does not mention.
    lead: "Hello! I'm Oru, your advisor. I'll walk you through how the game works.",
    body: "You can skip at any point.",
    spotlight: null,
  }),

  bay: () => ({
    mood: "point",
    title: "The Bay",
    // Placed second (not last) on request: a learner needs the shape of the whole
    // game -- ten islands, each a domain to master, in order -- before the moments
    // that follow start teaching one island's mechanics.
    lead: `This island is one of ${ERA_SEQUENCE.length}, each a domain of math you'll master in order.`,
    body: "Open the Bay to move to a founded island or preview a locked island, then Return to tour.",
    spotlight: "menu",
    requires: "bay",
  }),

  place: () => ({
    mood: "point",
    title: "Place a skill building",
    lead: "A skill building begins as a foundation on the island.",
    body: "Use the live Build menu for this step.",
    spotlight: "build",
  }),

  lessons: () => ({
    mood: "talk",
    title: "Lessons and construction",
    lead: "Open a skill building to see its lesson and practice.",
    body: "Pass the lesson check to start construction. Its practice set finishes the building.",
    spotlight: "viewport",
  }),

  resources: (eraId) => ({
    mood: "talk",
    title: "Mastery and resources",
    // Names WHERE the practice set lives (inside the skill's own lesson) before saying
    // what it pays. NOT an action moment any more: the redirect used to open the lesson
    // popup, but a freshly-placed skill has not passed its lesson check yet, so that
    // popup shows "Start lesson" rather than the practice set itself -- a button
    // promising to open something it structurally cannot show on a first visit. Product
    // instruction (2026-08-21) is the exact reward line, exclamation included.
    lead: "Each skill's lesson holds the practice set that records your mastery.",
    body: `Completing a practice set successfully grants you mastery of that skill and a reward of ${materialWord(eraId)}!`,
    spotlight: "economy",
  }),

  civic: (eraId) => ({
    mood: "talk",
    title: "Civic buildings",
    lead: "Civic buildings are separate from skill buildings and have no lessons.",
    body: `Use ${materialWord(eraId)} to buy civic buildings and roads. Civic in Build shows their effects.`,
    spotlight: "build",
  }),

  cityLife: () => ({
    mood: "talk",
    title: "City life",
    lead: "Population counts the people living here. Livability and Happiness are the city's limits.",
    body: "Civic buildings raise one or both limits, and each road tile adds Happiness.",
    spotlight: "cityLife",
  }),

  townhall: (eraId) => ({
    mood: "talk",
    title: "Town Hall practice",
    lead: "The Town Hall offers Interleaved practice with skills you have practiced.",
    body: `It opens after practice sets for ${INTERLEAVED_PRACTICE_MIN_COMPLETED} skills. Rounds can award ${materialWord(eraId)} until the era allowance is used.`,
    spotlight: "townhall",
  }),

  // The closing send-off, added on product instruction (2026-08-21). Nothing left to
  // point at -- same reasoning as "advisor"'s own `spotlight: null` -- and it is what
  // moves the "Start building" label onto THIS moment's Next/Finish button, since that
  // label is purely positional (`step === lastStep`, `OnboardingAdvisor.tsx`).
  allSet: () => ({
    mood: "talk",
    title: "Ready to build",
    lead: "You're all set, start building!",
    body: "Head to Build whenever you're ready.",
    spotlight: null,
  }),
};

/**
 * The sequence, derived from the record's own key order.
 *
 * Not a second written-down list: the rows above are in reading order and `Object.keys`
 * preserves it, so there is one place a moment's position is decided. The cast is the same one
 * `CRISIS_ACTION_ORDER` makes, and for the same reason.
 */
export const ONBOARDING_MOMENT_ORDER = Object.keys(
  MOMENT_BODIES,
) as readonly OnboardingMomentId[];

/**
 * The moments a city with THESE surfaces is taught, in order.
 *
 * A filter over the one order above rather than a second list, so a surface-gated moment
 * cannot end up in a different place depending on which switch is on.
 */
export function onboardingMomentOrder(
  surfaces: OnboardingSurfaces,
): readonly OnboardingMomentId[] {
  return onboardingBriefingFor(CURRENT_ERA_ID, surfaces).moments.map((moment) => moment.id);
}

/* -------------------------------------------------------------------------- */
/* The real placement action                                                    */
/* -------------------------------------------------------------------------- */

/**
 * **THE GATED MOMENT: Next does not advance past it until the learner has put a building on
 * the real island.**
 *
 * Placement is distinct from the four read-only surface visits above: it confirms one skill
 * building through the city's own write path. Named here so the advisor, host, replay control,
 * and tests read the same placement moment.
 */
export const ONBOARDING_GATED_MOMENT: OnboardingMomentId = "place";

/**
 * **EVERY STRING THE PLACEMENT TASK PUTS ON SCREEN, and the states are the CITY'S states.**
 *
 * Here rather than in the component for the reason the moments are: this is learner-facing
 * copy, and copy in a module is copy a test can sweep without mounting anything.
 * {@link onboardingBriefingLines} includes it, so the dash sweep and the register rules reach
 * it too.
 *
 * ## ⚑ THIS USED TO NARRATE A TOY BOARD, AND THE PRODUCT LEAD KILLED IT
 *
 * *"they should actually have to place the building and not just drag a house into a 2d box
 * like what is the point of that bro."* The retired copy had a `house`, a `plot`, a `holding`
 * and a `wrongDrop`, which are the states of a drag between two tiles inside a speech bubble.
 * None of them exists any more. **The states below are the real flow's**, read off
 * `CitySurface`: the Build menu is shut, the Build menu is open, a ghost is on the island
 * waiting to be confirmed, and a building is standing. Nothing here is a rehearsal.
 */
export const FIRST_BUILDING_TASK = {
  /**
   * The imperative AND the finish condition, and the first thing in the panel (`WidgetTask`'s
   * rule). It says what to do and what it buys.
   */
  task: "Place one skill building on the island.",
  /**
   * Nothing open yet: the whole route, in one sentence.
   *
   * Kept SHORT rather than complete, and the length is measured rather than judged. The
   * stood-down panel gets a 273px corner between the City life panel and the dock, and
   * `.crisis-call-slide` scrolls rather than spills, so a sentence that wraps to a third line
   * pushes the shortcut button or the status line off the bottom of the bubble with nothing
   * saying so. "on the island" comes out because {@link task}, one line above it, already says
   * it.
   */
  prompt: "Open Build and choose an unlocked skill.",
  /** The Build menu is open and the cards are showing. */
  choosing: "Choose an unlocked skill building.",
  /** A ghost is on the island and the confirm bar is up. */
  positioning: "Choose its position, then select Build here.",
  /**
   * The learner backed out of a placement. Nothing is wrong and nothing is lost.
   *
   * It read *"No trouble at all."* until `cityCopyRegister.test.ts` caught it: that rule
   * refuses a sentence that OPENS on a negation, on the reasoning that the first word a
   * remedial learner reads should be the state rather than the absence of a problem. The
   * reassurance survives; only the word order changed.
   */
  cancelled: "The placement was canceled. Open Build when you are ready to try again.",
  /** A real building is standing on the real island. */
  done: "Your first skill building is now on the island.",
  /** The escape hatch did it, and the line is honest about which of them placed it. */
  doneForYou: "I placed one skill building. You can move it later if you wish.",
  /** What the gated Next says when it is pressed too early. */
  nudge: "Place one skill building before continuing, or choose Place one for me.",
  /** The button in the panel that opens the real Build menu, for a learner who cannot find it. */
  openBuild: "Open Build",
  /** The escape hatch, in the tray beside Skip. */
  doItForMe: "Place one for me",
} as const;

/* -------------------------------------------------------------------------- */
/* The briefing                                                                */
/* -------------------------------------------------------------------------- */

/**
 * WHO IS SPEAKING, WHAT HE IS WEARING, AND EVERYTHING HE SAYS, for a city in this era.
 *
 * The advisor comes off `resolveEraAdvisor`, which is the same total call the crisis briefing
 * and the era ceremony both use, so the name and the costume are one answer and cannot
 * disagree. Onboarding is era one in practice, because a brand-new learner is standing in era
 * one; it takes the era rather than assuming it so that a replay in era six dresses him in era
 * six's clothes instead of putting a hide tunic on an Early Modern island.
 */
export interface OnboardingBriefing {
  readonly eraId: EraId;
  /** The dialogue's accessible name. Announced, never drawn. */
  readonly title: string;
  readonly advisorName: string;
  readonly advisorDress: AdvisorDress;
  readonly moments: readonly OnboardingMoment[];
}

export function onboardingBriefingFor(
  eraId: EraId,
  surfaces: OnboardingSurfaces = NO_EXTRA_SURFACES,
): OnboardingBriefing {
  const advisor = resolveEraAdvisor(eraId);
  return {
    eraId,
    title: "How to play your city",
    advisorName: advisor.name,
    advisorDress: advisor.dress,
    moments: ONBOARDING_MOMENT_ORDER.map((id) => ({
      id,
      ...MOMENT_BODIES[id](eraId),
    })).filter(
      // A moment that describes a surface this city does not have is not taught at all; see
      // {@link OnboardingSurfaces}. `NO_EXTRA_SURFACES` is the default because withholding a
      // sentence is the safe failure and promising a control that is not there is not.
      (moment) => moment.requires === undefined || surfaces[moment.requires],
    ),
  };
}

/** Every sentence of a briefing, flattened, with the task's own copy. The shape a sweep reads. */
export function onboardingBriefingLines(briefing: OnboardingBriefing): readonly string[] {
  return [
    ...briefing.moments.flatMap((moment) => [
      moment.title,
      moment.lead,
      moment.body,
      ...(isOnboardingActionMoment(moment.id)
        ? Object.values(ONBOARDING_ACTION_TASKS[moment.id])
        : []),
    ]),
    ...Object.values(FIRST_BUILDING_TASK),
    ONBOARDING_CLOSING_LINE,
    ONBOARDING_SKIP_LABEL,
  ];
}

/**
 * **HIS CLOSING OFFER, and it is the sequence's only mention of the ☰ Menu.**
 *
 * It was `OnboardingAdvisor.tsx`'s own string until now, which put one learner-facing sentence
 * outside every sweep this module exists to feed. What it says also grew: *"ask me again"* was
 * true and pointed at a menu the learner had never been told about, so the line now names the
 * Menu and the two other things in it a first-run learner will want (the reference card and the
 * sound controls). That is the whole of the menu orientation the sequence owes; the Menu's own
 * rows say the rest.
 */
export const ONBOARDING_CLOSING_LINE =
  "You can replay this tour from Menu, under How to play.";

/**
 * The way out, worded so that what it leaves is obvious.
 *
 * *"Skip"* on its own reads as skipping the STEP on a screen with Back and Next either side of
 * it. This ends the whole tour, and a learner about to lose the explanation should be able to
 * tell that from the button.
 */
export const ONBOARDING_SKIP_LABEL = "Skip tour";

/* -------------------------------------------------------------------------- */
/* The hints the advisor has taken over                                        */
/* -------------------------------------------------------------------------- */

/**
 * **THE COACH-MARKS THE ADVISOR NOW SAYS HIMSELF, retired when the sequence ends.**
 *
 * This is the *"replace the opening tooltips"* half of the ask, and it is a replacement rather
 * than a deletion: the hints stay in `COACH_MARKS`, so `HowToPlay`'s reference card still lists
 * every one of them and "Show tips again" still brings them back. What changes is that a learner
 * who has just been told a thing by a character is not told it again ninety seconds later by a
 * tooltip in a duller voice.
 *
 * ## ⚑ FOUR NOW, AND THE REST OF THE HINT LAYER IS DELIBERATELY UNTOUCHED
 *
 * The lead's complaint was about the OPENING, and the contextual layer is not one thing. A hint
 * that fires at the moment it becomes true is the good half of the idea: *"Music is playing.
 * Mute it or change the volume under Sound"* is worth having in a silent classroom and cannot be
 * pre-taught, *"Click a paved tile to pick it back up"* means nothing until a tile is paved, and
 * the interleaved hint waits on two finished practice sets. Retiring those would be throwing out
 * what works with what does not.
 *
 * **The economy hint joins the list in this pass, and the reason is a content fix rather than a
 * change of mind.** It stayed a hint through the first rebuild because it named ROADS as a sink
 * and nothing in the sequence did, so retiring it would have taken a fact off the screen rather
 * than moved it. The `civic` moment now says roads out loud, in the lead's own framing, so the
 * fact has a home and the hint is a repeat.
 *
 * So exactly the hints whose sentence is now in a moment are listed, each with the moment that
 * took it over, and `onboardingReplacesTheTooltips.test.tsx` holds the list in both directions:
 * an entry that is no longer a hint fails, and the survivors are floored so this can never
 * become "retire the whole layer".
 *
 * The type is `CoachMarkId`, so a renamed or deleted hint is a compile error here rather than an
 * entry that goes on retiring nothing.
 */
export const ONBOARDING_TAUGHT_COACH_MARKS: readonly {
  readonly id: CoachMarkId;
  readonly takenOverBy: OnboardingMomentId;
  readonly why: string;
}[] = [
  {
    id: "place",
    takenOverBy: "place",
    why: 'its whole text is "Drag a building onto an open plot", and that moment does not say it, it holds Next shut until the learner has put a real building on the real island',
  },
  {
    id: "learn",
    takenOverBy: "lessons",
    why: '"Click your building to start its lesson" is the lessons moment\'s shout almost word for word, with the island it tells the learner to use spotlit behind it',
  },
  {
    id: "build",
    takenOverBy: "lessons",
    why: '"Finish the lesson + check, then practice to build it" is the same moment\'s second sentence, which goes on to say what it produces',
  },
  {
    id: "economy",
    takenOverBy: "civic",
    why: '"Lessons and practice pay in stone. Spend it on roads, or on the buildings in the Build menu" is now split across the resources moment, which says where it comes from, and the civic moment, which names roads and civic buildings as the two sinks',
  },
];

/** Just the ids, which is what the host passes to the coach-mark layer. */
export function onboardingTaughtCoachMarkIds(): readonly CoachMarkId[] {
  return ONBOARDING_TAUGHT_COACH_MARKS.map((entry) => entry.id);
}

/* -------------------------------------------------------------------------- */
/* "I have been shown this, and this is where I got to"                        */
/* -------------------------------------------------------------------------- */

/**
 * **SKIPPABLE, NEVER REPEATED, AND RESUMABLE, which is three requirements and two keys.**
 *
 * `localStorage`, in the shape `coachMarksCore.ts` and `crisisCall.ts` both already use: a
 * `cr.`-prefixed key per fact and a try/catch on both sides, because storage can be
 * unavailable in private mode. This deliberately does not reach for `devSessionStore`: that
 * store is the learner's CITY, gated on the app not being server-backed, and a note about
 * which tutorial line somebody has read is neither part of their progress nor something a
 * deployed build should stop remembering.
 *
 *  - **{@link ONBOARDING_ADVISOR_DONE_KEY}** is set on the last moment being passed OR on Skip,
 *    and it is what stops a returning learner being taught again. It is the same contract
 *    `ONBOARDING_DEMO_SEEN_KEY` had, which is why the two are read together at the mount: a
 *    learner who saw the old reel is not shown this either.
 *  - **{@link ONBOARDING_ADVISOR_STEP_KEY}** is written on every advance, and it is what makes
 *    closing the tab mid-tutorial resumable rather than a restart. Without it the sequence is
 *    a trap in one direction and a loop in the other: whichever end the learner is at, they
 *    get moment one again.
 *
 * Unavailable storage costs the resume and the once-only, in that order, and breaks neither:
 * the sequence still runs and Skip still ends it for this visit.
 */
export const ONBOARDING_ADVISOR_DONE_KEY = "cr.onboarding.advisorDone";
export const ONBOARDING_ADVISOR_STEP_KEY = "cr.onboarding.advisorStep";

/** True once the learner has walked the moments to the end, or skipped them. */
export function hasSeenOnboardingAdvisor(): boolean {
  try {
    return runtimeStorage()?.getItem(ONBOARDING_ADVISOR_DONE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Remember that it is over, so a returning learner is never re-taught. */
export function markOnboardingAdvisorSeen(): void {
  try {
    runtimeStorage()?.setItem(ONBOARDING_ADVISOR_DONE_KEY, "true");
  } catch {
    // See the header: an unremembered tutorial replays, which is a nicety rather than a
    // correctness requirement.
  }
}

/** The moment index the last visit got to, or 0 when there is nothing stored. */
export function loadOnboardingAdvisorStep(): number {
  try {
    return Number.parseInt(
      runtimeStorage()?.getItem(ONBOARDING_ADVISOR_STEP_KEY) ?? "",
      10,
    );
  } catch {
    return 0;
  }
}

/** Write down where the learner is, so closing the tab does not restart the sequence. */
export function saveOnboardingAdvisorStep(step: number): void {
  try {
    runtimeStorage()?.setItem(ONBOARDING_ADVISOR_STEP_KEY, String(step));
  } catch {
    // See the header.
  }
}

/**
 * Forget both, so the sequence runs again from moment one.
 *
 * The dev replay control's only action, and every test's `beforeEach`. Both keys, because
 * clearing the done flag alone would resume a returning learner at the last moment they read,
 * which is the one outcome a "play it from the beginning" button must not produce.
 */
export function forgetOnboardingAdvisor(): void {
  try {
    const storage = runtimeStorage();
    storage?.removeItem(ONBOARDING_ADVISOR_DONE_KEY);
    storage?.removeItem(ONBOARDING_ADVISOR_STEP_KEY);
  } catch {
    // See the header.
  }
}

/**
 * WHERE A RETURNING LEARNER PICKS UP: the stored step, clamped into the sequence there
 * actually is.
 *
 * Pure, and separate from the read, because the interesting cases are all about a stored
 * number that no longer means anything: storage holding `NaN` (nothing written, or something
 * else's value), a negative, or an index past the end because a moment was deleted between
 * two visits. Every one of those has to resolve to a moment that exists, since the alternative
 * is a tutorial that opens on nothing and cannot be got out of.
 */
export function resumeOnboardingAt(storedStep: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  if (!Number.isFinite(storedStep) || storedStep < 0) {
    return 0;
  }
  return Math.min(Math.floor(storedStep), total - 1);
}
