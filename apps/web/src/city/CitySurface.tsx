import {
  type CivicBuildingId,
  civicCatalogueRow,
  lessonCompleteEventId,
  type MaterialBalances,
  materialForEraOrThrow,
} from "@cr/economy";
import {
  buildCityViewModel,
  type CityBuildingView,
  type CityStormView,
  type CityViewModel,
  type CityVitality,
  type ConstructionState,
  type CrisisDamage,
  type CrisisDamageReport,
  type CrisisOverwrittenRecord,
  cityRosterNodeIds,
  crisisRepairCost,
  hardWinterRepairPrices,
  NO_CRISIS_DAMAGE,
  PLAGUE_ERA,
  type RelayState,
  type SuccessionState,
} from "@cr/game";
import {
  ERA_SEQUENCE,
  type EraDefinition,
  type EraId,
  eraNumber,
  getEraOfNode,
  getEraOrThrow,
  getNode,
  teachingOrder,
} from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import {
  type KeyboardEvent,
  lazy,
  type ReactNode,
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type * as THREE from "three";
import { archipelagoEnabled } from "../archipelago/archipelagoFlag";
import type { PresenterBuildingRemovalResult } from "../archipelago/archipelagoSession";
import { type ArchipelagoState, layoutFromLoad } from "../archipelago/islandState";
import type { AuthenticatedAccount } from "../auth/AccountBoundary";
import { AudioSettings } from "../audio/AudioSettings";
import { playSfx } from "../audio/soundEffects";
import { useMusicEnabled } from "../audio/useAudio";
import { CityCatchUp } from "../catchup/CityCatchUp";
import { eraPlacementFromSeed } from "../catchup/eraPlacement";
import { CompletionCeremony } from "../completion/CompletionCeremony";
import { hasFinishedCompletionCeremony } from "../completion/completionState";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import {
  type PlacementSeed,
  pretestRostersFromPlacement,
} from "../diagnostic/placementRosters";
import { skillDisplayName } from "../diagnostic/skillNames";
import { materialWord } from "../economy/materialWord";
import { BugReportButton } from "../feedback/BugReportButton";
import { FullscreenMenuAction } from "../fullscreen/FullscreenMenuAction";
import { IntrusionEntryChip } from "../intrusion/IntrusionEntryChip";
import { authoringCompletenessForNodes, lessonByNode } from "../lessons/domains";
import { LESSON_MENU_LINE, LessonMenu } from "../lessons/LessonMenu";
import { completedNodeIdsFrom } from "../lessons/lessonProgress";
import { ReviewMistakes } from "../lessons/ReviewMistakes";
import type { TeachingSection } from "../lessons/teachingSections";
import { PlagueEntryChip } from "../plague/PlagueEntryChip";
import type { PlagueSession } from "../plague/plaguePersistence";
import { type RelayAnswerFeedback, relayCityView } from "../relay/relayCityView";
import type { RelaySession } from "../relay/relayPersistence";
import { useCompletionRewards } from "../rewards/CompletionRewardProvider";
import {
  civicCompletionReward,
  lessonCompletionReward,
  roadCompletionReward,
  skillCompletionReward,
} from "../rewards/completionRewards";
import { SuccessionEntryChip } from "../succession/SuccessionEntryChip";
import {
  SUCCESSION_CITY_OVERVIEW,
  type SuccessionCityRoster,
} from "../succession/successionCity";
import type { SuccessionSession } from "../succession/successionSession";
import { describeCrisisEra, resolveCrisisEra } from "../winter/crisisEra";
import { WinterEntryChip } from "../winter/WinterEntryChip";
import { AchievementNote } from "./AchievementNote";
import { AchievementsPanel } from "./AchievementsPanel";
import {
  ACHIEVEMENTS,
  type AchievementState,
  crisesRecordedFromMint,
  forgetAchievements,
  loadEarnedAchievements,
  markAchievementEarned,
  newlyEarnedAchievements,
} from "./achievements";
import {
  buildMenuMessage,
  CONSTRUCTION_STATE_LABEL,
  cityContributionMessage,
  cityLoadedMessage,
  civicPlacedMessage,
  civicRefusedMessage,
  civicUnaffordableMessage,
  lessonActionLabel,
  lessonEntryMessage,
  lightingMessage,
  moveCancelMessage,
  moveConfirmMessage,
  moveRotateMessage,
  moveStartMessage,
  moveStepMessage,
  PALETTE_LABEL,
  placementCancelMessage,
  placementMoveMessage,
  placementRefusalReason,
  placementRotateMessage,
  placementStartMessage,
  rotationLabel,
  skillCompleteMessage,
  skillPlacedMessage,
  skillSelectionMessage,
  stormActionMessage,
  stormEncounterMessage,
  stormMessage,
  stormResultMessage,
  townHallSelectionMessage,
} from "./announcements";
import { BuildingUnlockedPopup } from "./BuildingUnlockedPopup";
import { buildingName, resolveBuildingModel } from "./buildingAssets";
import {
  readBuildingLabelsVisible,
  writeBuildingLabelsVisible,
} from "./buildingLabelPreference";
import { CityVitalityPanel, HappinessFace } from "./CityVitalityPanel";
import { CrisisCallAdvisor, CrisisCallNotice } from "./CrisisCallAdvisor";
import { CrisisSeedControl } from "./CrisisSeedControl";
import { playSkillChime } from "./chime";
import {
  CITY_CITIZEN_SEED,
  cityCitizenRoster,
  cityVitality,
  civicContributionRowsOf,
} from "./citizens";
import {
  type CivicPurchaseResult,
  type CivicRemovalResult,
  D1_NODE_IDS,
  type DevBuildStage,
  type RoadCommitResult,
  type RoadRemoveResult,
} from "./citySession";
import { runCityStorageMigrations } from "./cityStorageMigrations";
import {
  type CivicContributions,
  civicContributions,
  civicName,
  civicPlacementId,
  civicTypeOf,
  isCivicPlacement,
} from "./civic";
import {
  type CivicOption,
  civicOptionsForEra,
  resolveCivicModel,
  resolveRestoredCivicModel,
} from "./civicBuildings";
import { CoachMarks } from "./coachmarks/CoachMarks";
import { useCoachAnchor } from "./coachmarks/coachAnchorRegistry";
import {
  type CoachAnchor,
  type CoachState,
  markCoachMarkSeen,
  resetCoachMarks,
} from "./coachmarks/coachMarksCore";
import { crisisBriefingForCityCrisis, useCrisisCall } from "./crisisCall";
import type { CrisisRepairResult, RepairTarget } from "./crisisRepair";
import {
  type CrisisSeedPlan,
  crisisSeedMessage,
  planCrisisSeed,
  runCrisisSeed,
} from "./crisisSeed";
import { buildingDisplayName, buildingSubtitle, CURRENT_ERA_ID } from "./eraDressing";
import { nextEraId } from "./eraState";
import { masteredNodeIdsFrom } from "./eraTimelineView";
import { HudIcon, type IconName } from "./HudIcon";
import { type EraDoorVariant, IslandUnlockDoor } from "./IslandUnlockDoor";
import { IslandUnlockExam } from "./IslandUnlockExam";
import {
  eraIslandLandRadius,
  eraIslandSeaRadius,
  eraLandRadius,
  eraSeaRadius,
} from "./islandLand";
import type {
  IslandFoundingAuthority,
  IslandUnlockExamResponseOutcome,
  IslandUnlockExamResponseRequest,
} from "./islandUnlockAuthority";
import { loadIslandUnlockExam } from "./islandUnlockExamPersistence";
import { type LessonHost, stubLessonHost } from "./lessonHost";
import { cityRecoveredMilestone, firstCrisisMilestone } from "./milestones";
import { loadMockCity } from "./mockCity";
import { DemoReel } from "./onboarding/DemoReel";
import { HowToPlay } from "./onboarding/HowToPlay";
import { OnboardingAdvisor } from "./onboarding/OnboardingAdvisor";
import {
  EMPTY_ONBOARDING_ACTION_VISITS,
  forgetOnboardingAdvisor,
  hasSeenOnboardingAdvisor,
  markOnboardingAdvisorSeen,
  type OnboardingActionMomentId,
  type OnboardingMomentId,
  type OnboardingActionVisits,
  type OnboardingSurfaces,
  onboardingTaughtCoachMarkIds,
  saveOnboardingAdvisorStep,
} from "./onboarding/onboardingScript";
import { hasSeenOnboardingDemo, markOnboardingDemoSeen } from "./onboarding/useDemoScript";
import { buildStageFor, PALETTE_VARIANTS, type PaletteVariant } from "./palette";
import { RecordVerification } from "./RecordVerification";
import { RelayInCity } from "./RelayInCity";
import { relayPlacement, standingRecordScars } from "./relayPlacement";
import {
  isRoadCellLayable,
  parseRoadCellKey,
  ROAD_TILE_GOLD_COST,
  type RoadCell,
  roadCellKey,
  roadCost,
  roadRefund,
} from "./roads";
import {
  type StandingSuspension,
  standingSuspensions,
  suspendedCapacity,
  suspendedCivicIds,
} from "./suspendedCivic";
import { applyCameraAction, type OrbitControlsLike } from "./three/applyOrbit";
import { CityCanvasHost } from "./three/CityCanvasHost";
import type { ScenePlacement } from "./three/CityScene";
import { PLAGUE_LIGHT } from "./three/crisis/plague";
import { SUCCESSION_LIGHT } from "./three/crisis/succession";
import { INTRUSION_LIGHT } from "./three/intrusionLight";
import { type CameraAction, cameraKeyIntent } from "./three/orbitCamera";
import type { SuccessionCityBoard } from "./three/SuccessionInCity";
import { type WinterCityBoard, WinterInCity } from "./three/WinterInCity";
import {
  describeEraTownHallArt,
  isTownHall,
  placementLabel,
  resolveEraTownHall,
  TOWN_HALL_ID,
  TOWN_HALL_LABEL,
} from "./townHall";
import type { CityEntrySurface, CityLoad, CityLoader, StormAttemptResult } from "./types";
import { type RewardBuilding, UnlockCelebration } from "./UnlockCelebration";
import { setCityEra, useCityEra } from "./useCityEra";
import { useReducedMotion } from "./useReducedMotion";
import { useScrollCue } from "./useScrollCue";
import { WorldScene } from "./WorldScene";
import {
  cellCenter,
  computeCityLayout,
  findOpenCell,
  footprintFor,
  occupiedCells,
  type PlacedTransform,
  type PlacementRefusal,
  placementRefusal,
  SURFACE_Y,
  transformCenter,
} from "./worldLayout";

/**
 * Live 3D building thumbnail for the build-menu cards. Lazy + code-split so the
 * extra R3F canvases only load when the menu actually renders them (and never in
 * headless tests, which pass `enableCanvas={false}` and get a static glyph).
 */
const BuildingThumb = lazy(() => import("./three/BuildingThumb"));
const SuccessionInCity = lazy(() =>
  import("./three/SuccessionInCity").then((module) => ({
    default: module.SuccessionInCity,
  })),
);

/** Human lesson title for a node (e.g. "Signed numbers"), from the all-domains registry. */
function lessonTitleFor(nodeId: string): string {
  return lessonByNode[nodeId]?.title ?? "";
}

/**
 * "No pretest hand-off" — the default for `pretestPlacement`. A module-level frozen object
 * rather than a `{}` default, because a fresh literal on every render would re-run the
 * roster memo (and every memo below it) on every render of an ordinary city.
 */
const EMPTY_PLACEMENT: PlacementSeed = Object.freeze({});

/**
 * One build-menu card. Every D1 building keeps a card for its whole life, in one
 * of three states: BUILT (already placed on the island — shown as a non-buildable
 * "Built" card), LOCKED (a prerequisite building isn't complete yet), or ready to
 * build (unlocked and not yet placed).
 */
interface BuildMenuEntry {
  readonly nodeId: string;
  readonly name: string;
  readonly lessonTitle: string;
  /** True once the building is placed on the island — shown as a "Built" card. */
  readonly built: boolean;
  /** True while a prerequisite building is not yet completed (built/mastered). */
  readonly locked: boolean;
  /** Names of the prerequisite BUILDINGS still to complete (for the locked hint). */
  readonly missingPrereqNames: readonly string[];
}

/** One era's slice of the build menu: the chapter, and the cards it raised. */
interface BuildMenuEraGroup {
  readonly era: EraDefinition;
  readonly entries: readonly BuildMenuEntry[];
}

/**
 * The build menu's cards, cut by era, in play order.
 *
 * **Why the menu needs an era axis at all.** Since the roster became cumulative the
 * Lessons tab holds every era's buildings and every earlier era's: eleven cards in era
 * two, sixteen in era three, sixty-two in era ten, appended after the ones a player
 * already owns. Two things break at once. A player who has just advanced has to scroll
 * the row past everything they already had to reach what the advance gave them, and the
 * row mounts one live `<Canvas>` per card against a browser budget of roughly sixteen
 * WebGL contexts a page — measured on this branch, era three already runs the menu with
 * four contexts force-lost and five cards previewing nothing. Cutting the row by era
 * bounds both: the walk is the era's own length, and so is the context bill.
 *
 * **The buckets are walked off `ERA_SEQUENCE`, never off the entries.** Array position is
 * the play order and the only sanctioned reading of it (INV-ERA-5), so the rail cannot
 * disagree with the sequence about which chapter came first. An era the roster has not
 * reached contributes no group at all, which is what keeps the rail to the eras a player
 * has actually played rather than ten chips, eight of them onto an empty panel.
 *
 * **A node no era rosters would be dropped here, so a test holds the union.** It cannot
 * happen through the shipped path — `cityRosterNodeIds` is built by flat-mapping
 * `ERA_SEQUENCE`'s own node lists, so every entry has an era by construction — but
 * "cannot happen" is the kind of claim that stops being true quietly. `buildMenuEraAxis`
 * asserts, for every era, that the grouped cards are exactly the ungrouped roster, so a
 * roster that ever admits an eraless node fails there instead of hiding a building.
 */
function groupEntriesByEra(
  entries: readonly BuildMenuEntry[],
): readonly BuildMenuEraGroup[] {
  return ERA_SEQUENCE.flatMap((era) => {
    const group = entries.filter((entry) => getEraOfNode(entry.nodeId)?.id === era.id);
    return group.length === 0 ? [] : [{ era, entries: group }];
  });
}

/**
 * The index a roving-tabindex strip should move focus to for a key, or `null` when the
 * key is not one of its own. Shared by all three of the build menu's strips (categories,
 * eras, cards) so a fourth cannot arrive with its own idea of what End does.
 */
function rovingTarget(key: string, current: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** "A", "A and B", or "A, B and C" — the locked-card prerequisite hint list. */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * ⚑ **THE BAY OVERVIEW, BEHIND A DYNAMIC IMPORT INSIDE A STATICALLY-DEAD BRANCH.**
 *
 * `archipelagoFlag.ts` promises that *"the archipelago modules are imported lazily behind the
 * gate"*, and an ordinary top-level import quietly makes that false. **Measured rather than
 * assumed**, on a real `vite build` with the eager import in place: `archipelago-stage`,
 * `archipelago-bay` and `island-card` were all in `dist/assets/index-*.css`, and the overview's
 * own strings were in `dist/assets/index-*.js`. Dead JSX does not remove a side-effecting
 * `import "./archipelago.css"`.
 *
 * All three build inputs are replaced statically by Vite. Single-island production emits no
 * bay chunk; a developer gets it behind `?bay`, and either an explicit bay rollout or the
 * frontend-only demo build gets the production navigator.
 */
const ArchipelagoOverview =
  import.meta.env.DEV ||
  import.meta.env.VITE_DEMO_MODE === "true" ||
  import.meta.env.VITE_ARCHIPELAGO_MODE === "bay"
    ? lazy(async () => ({
        default: (await import("../archipelago/ArchipelagoOverview")).ArchipelagoOverview,
      }))
    : null;

const PlagueInCity = lazy(async () => ({
  default: (await import("./three/PlagueInCity")).PlagueInCity,
}));

export type CityInitialEntry =
  | {
      readonly kind: "lesson";
      readonly nodeId: string;
      /** Presenter/reviewer-only opening step; ordinary lesson entry omits it. */
      readonly initialTeachingStep?: {
        readonly index: number;
        readonly section: TeachingSection;
      };
    }
  | { readonly kind: "practice"; readonly nodeId: string }
  | { readonly kind: "review" }
  | { readonly kind: "interleaving" }
  | { readonly kind: "bay" };

export type CityBuildEntryCategory = "lessons" | "civic" | "roads";

export interface CitySurfaceProps {
  /**
   * The signed-in learner's account identity, when this surface is mounted under
   * `AccountBoundary`. Threaded through to the ☰ Menu's "Report a bug" entry, which
   * needs a real access token to attach the report to an account and is simply absent
   * (rather than disabled) for anonymous/demo/local sessions that have none.
   */
  account?: AuthenticatedAccount | null;
  /** Retryable state loader; defaults to the in-file mock seed for this phase. */
  loadCity?: CityLoader;
  /** External state reread trigger that preserves this surface and its Three canvas identity. */
  refreshToken?: number;
  /** Demo-only entry seam: open with one already-placed building selected. */
  initialSelectedNodeId?: string;
  /** Browser-frame seam: open one standing building's real anchored detail on load. */
  initialOpenBuildingId?: string;
  /** Presenter/reviewer seam: initialize a real city-owned activity, never a parallel page. */
  initialEntry?: CityInitialEntry;
  /** Changes on shell navigation even when both surfaces map to the city baseline. */
  activityToken?: number;
  /** Category selected whenever the real Build menu opens; ordinary play starts on Lessons. */
  buildEntryCategory?: CityBuildEntryCategory;
  /** Shell-level history updates when a requested activity exits to the city. */
  onActivityExit?: () => void;
  /** Presenter mode records progress without covering the live subject with transient cards. */
  suppressAchievementNotes?: boolean;
  /** Presenter or a disabled product capability must not launch crisis briefings. */
  suppressCrisisCalls?: boolean;
  /**
   * Composition-root crisis capability. Ordinary App play passes the canonical decision;
   * direct component fixtures retain the crisis surface unless they opt out explicitly.
   */
  crisisCapabilityEnabled?: boolean;
  /** Demo/presenter setup rendered inside the existing Menu; non-demo play omits it. */
  presenterMenuTools?: (closeMenu: () => void) => ReactNode;
  /** Presenter-only Atlas shortcut target; absent from learner/account compositions. */
  presenterAtlasHomeEraId?: EraId;
  /** Presenter-only source-raster projection for the two pinned reference islands. */
  presenterReferenceFraming?: boolean;
  /**
   * Presenter-only progression target. Its unbuilt skill card leads the current-era row;
   * once its real placement lands, the 3D camera frames its stages for the audience.
   */
  presenterBuildingFocusNodeId?: string;
  /** Progressive-enhancement R3F canvas; pass false in headless tests. */
  enableCanvas?: boolean;
  /** Capability-qualified bay rollout. Omit to use the build/query flag directly. */
  bayAvailable?: boolean;
  /** Browser-evidence seam for renderer counters; omitted in production play. */
  archipelagoMetrics?: boolean;
  /** Browser-evidence seam that holds the short-lived founding overlay. */
  archipelagoCeremonyOverlayHold?: boolean;
  /** Reset a founded past island; absent on the single-island fallback. */
  onResetIsland?: (eraId: EraId) => void | Promise<void>;
  /** Persist a destination island and its Town Hall without changing the standing island. */
  onUnlockIsland?: (
    eraId: EraId,
    authority?: IslandFoundingAuthority,
  ) => void | Promise<void>;
  onRecordIslandExamResponse?: (
    eraId: EraId,
    request: IslandUnlockExamResponseRequest,
  ) => Promise<IslandUnlockExamResponseOutcome>;
  /** Persist and settle travel before the city publishes the destination era. */
  onSailIsland?: (eraId: EraId) => void | Promise<void>;
  /** Explicit reduced-motion override (otherwise read from the media query). */
  reducedMotion?: boolean;
  /**
   * Enable the first-run onboarding auto-demo. `App` passes this for the LIVE city
   * only, as `entry === null`, so the demo never auto-plays behind the diagnostic
   * takeover; default `false` keeps it out of unrelated unit tests. It is gated
   * once-only by the `cr.onboarding.demoSeen` localStorage flag and only plays when
   * the diagnostic unlocked nothing (a test-out pretest shows `UnlockCelebration`
   * instead). See `onboarding/useDemoScript` + the design spec.
   */
  enableOnboardingDemo?: boolean;
  /** Enter the lesson shell that teaches this node (navigation only). */
  onStartLesson?: (nodeId: string, lessonShell: string | null) => void;
  /** Begin (or replay) the neighborhood storm checkpoint. */
  onAttemptStorm?: (neighborhoodId: string) => Promise<StormAttemptResult> | undefined;
  /** Open a secondary in-world surface (Survey / Lessons / Checker) as an overlay. */
  onOpenSurface?: (surface: CityEntrySurface) => void;
  /**
   * The onboarding tour's "civic" moment has just been reached. The host reports the
   * one-time civic-bootstrap material grant (idempotent server-side, so safe to call on
   * every arrival including a Back revisit) so the learner can afford the building the
   * tour is about to tell them about, rather than only being told about one.
   */
  onOnboardingCivicMoment?: () => void;
  /** Swappable lesson-hosting seam; defaults to the MVP stub (see `lessonHost.tsx`). */
  lessonHost?: LessonHost;
  /**
   * RELOCATE the pre-seeded Town Hall (the HUB) to a new grid transform (D-TH9 —
   * movable like any building; purely spatial). The hall is never placed by the player
   * (it is pre-seeded at the island centre), only moved. In-app session state only,
   * NEVER a game write. Defaults to a no-op when the host wires no session.
   */
  onMoveTownHall?: (transform: PlacedTransform) => void | Promise<void>;
  /**
   * Drop a D1 skill's building at a free grid transform (the approved layout
   * feature). In-app session state only — NEVER a game/shared-schema write.
   */
  onPlaceSkill?: (nodeId: string, transform: PlacedTransform) => void | Promise<void>;
  /**
   * RELOCATE an already-placed building to a new grid transform (the approved
   * move feature). Purely spatial and, like `onPlaceSkill`, in-app session state
   * only — NEVER a game/shared-schema write, and it never touches mastery/lesson
   * state. Defaults to a no-op when the host wires no session.
   */
  onMoveSkill?: (nodeId: string, transform: PlacedTransform) => void | Promise<void>;
  /**
   * THE COMPLETED PRETEST'S PLACEMENT — every node the diagnostic administered, with the
   * 0-3 estimate it landed on. Empty (`{}`) except right after a pretest hand-off.
   *
   * **IT FEEDS THREE READERS AND IS THE ONLY PROP FOR ANY OF THEM**, which is where two lanes
   * met. The reward screen reports how much of the ADMINISTRATION the learner tested out of, so
   * both of its numbers have to come off one object — a pre-filtered list left them as era
   * one's six either way, and a learner who tested out of 4 of the widened instrument's 20
   * skills read *"You tested out of 2 of 6"*. The test-out catch-up reads the same object as an
   * ERA placement (`catchup/eraPlacement.ts`: an era fires when every one of its nodes passed),
   * and it cannot be handed the flattened list instead, because an era the diagnostic CLEARED
   * and an era it never PROBED both read as "absent from the list". And `placeSkill`'s test-out
   * seam needs the per-node reading, which is derived here rather than passed in.
   *
   * It is deliberately the raw seed rather than any derived plan. The era derivation is a
   * conjunction over the era's own nodes and must have exactly one implementation, or a surface
   * can hand over an age the accuracy record never measured.
   *
   * **Empty, or handing nothing over, mounts nothing at all** — no celebration and no catch-up —
   * which is why every existing test that renders a city without it is unchanged.
   */
  pretestPlacement?: PlacementSeed;
  /**
   * **Test seam: how many buildings the catch-up should report as waiting for room.**
   *
   * Threaded to `CityCatchUp.waitingOverride`, whose docblock carries the argument: the shortfall
   * arises naturally at the fourth handed age, and a browser frame that walked there timed out at
   * 300 seconds. It overrides the COUNT and nothing else, so the sentence and its placement in
   * the frame are the shipped ones. Undefined everywhere but
   * `catchUpWaitingShots.browser.test.tsx`.
   */
  catchUpWaitingOverride?: number;
  /**
   * DEV-only stand-in for the mastery/lesson lane advancing mastery of a PLACED
   * skill. When provided, a clearly-labeled developer control renders so the full
   * loop can be driven to all-six-mastered. This is NEVER a game write.
   */
  onDevAdvanceMastery?: (nodeId: string, mastery?: Mastery) => void | Promise<void>;
  /**
   * DEV-only stand-in for the INTERMEDIATE lesson signal (Foundation→Construction):
   * fired when the learner finishes teaching + passes the CFU and enters the practice
   * set, so the building advances to the Construction stage before practice completes.
   * Parallel to `onDevAdvanceMastery`; undefined (a safe no-op) on the server path.
   */
  onDevLessonTaught?: (nodeId: string) => void | Promise<void>;
  /**
   * **THE REAL LESSON PROGRESSION, which is not the same thing as the two stand-ins above
   * even though it began life sharing their props.**
   *
   * `onLessonTaught` fires when a learner passes the CFU and `onPracticeComplete` when they
   * finish the practice set. Both used to be `onDev…`, which meant they were withheld
   * wherever the dev panel was — and the dev panel is withheld from any deployment with an
   * API configured. So a signed-in learner passed the check and the building stayed at
   * Foundation, which is to say the "Continue construction" callout never appeared and the
   * practice set was unreachable. They are separate props now because they answer a
   * different question: the `onDev…` three decide whether to OFFER the Developer panel, and
   * these two are what the lesson does when a learner finishes part of it.
   *
   * Still optional, because a surface mounted without them (most of this file's tests) must
   * keep rendering; a lesson simply does not write back.
   */
  onLessonTaught?: (nodeId: string) => void | Promise<void>;
  /** Practice set finished, with the mastery it evidenced. See {@link onLessonTaught}. */
  onPracticeComplete?: (
    nodeId: string,
    mastery: Mastery,
    evidenceId: string,
  ) => void | Promise<void>;
  /** Observe the confirmed practice transition without replacing its session writer. */
  onPracticeReceipt?: (
    nodeId: string,
    mastery: Mastery,
    evidenceId: string,
  ) => void | Promise<void>;
  /**
   * DEV-only stage OVERRIDE (temporary, for testing): force a PLACED skill's
   * rendered build stage directly (Site / Construction / Built). When provided, a
   * per-node segmented control renders in the dev panel beside "Advance mastery".
   * An additional override — NEVER a game write.
   */
  onDevSetStage?: (nodeId: string, stage: DevBuildStage) => void | Promise<void>;
  /**
   * One-way progression OBSERVER (INV-COS-1): fired with the freshly-loaded city
   * state after every load/refresh. The economy layer uses it to derive
   * server-verified earn grants (lesson complete / mastery star) from progression
   * — the economy READS learning state and never gates it. Purely a read-out; the
   * callback must not mutate city state. Undefined outside the economy-wired app.
   */
  onCityLoad?: (load: CityLoad) => void;
  /** @deprecated Town Hall Review mistakes does not issue mixed-practice payouts. */
  onInterleavedClear?: (input: {
    sessionId: string;
    struggleLevel?: number;
    responses?: readonly { itemVersionId: string; rawAnswer: unknown }[];
  }) => void | Promise<void>;
  /**
   * Spendable gold (already net of prior road spend), read from the shared economy
   * wallet. Drives the LIVE running-cost affordability while painting roads. `null`
   * (no economy wired) leaves the preview always-affordable — the atomic commit in
   * {@link onCommitRoads} is still the authority, so this only tunes the preview.
   */
  goldAvailable?: number | null;
  /**
   * **`WalletView.materials` — the full per-era picture, for the bay overview only.**
   *
   * Distinct from {@link goldAvailable}, and the distinction is the wallet's own: `spendable`
   * answers *"what can I spend right now"* and is the LIVE era's stockpile by design, where
   * `materials` is *"the full picture … what a per-era readout wants"* (`economyClient.ts`).
   * The overview is exactly that per-era readout — each island's own balance is read from this
   * field — and showing `spendable` against ten islands would report one number ten times.
   *
   * Optional and unread off the bay, so nothing on the demo path takes a new dependency: with
   * the archipelago flag off this prop reaches no component at all.
   */
  walletMaterials?: MaterialBalances;
  /**
   * Read the durable founded-island set for the actual-renderer carousel. Selection and
   * preview consume this callback only; all writes remain in the existing session flows.
   */
  getArchipelagoSnapshot?: () => ArchipelagoState;
  /**
   * ATOMICALLY commit a road path (the gold sink). Fail-closed like a shop purchase:
   * the caller spends through the shared wallet and lays the tiles all-or-nothing;
   * insufficient gold lays NOTHING. In-app session state only — never a game write.
   */
  onCommitRoads?: (cells: readonly RoadCell[]) => Promise<RoadCommitResult>;
  /**
   * Remove road tiles: frees the cells AND refunds their full price, however the
   * removal was triggered (a picked tile's popup or the paint bar's bulk erase).
   * The host is the authority on what a removal actually returns — it only refunds
   * cells that really carried a road — so the reported {@link RoadRemoveResult}
   * drives the announcement rather than a number the surface guessed. In-app
   * session state only, never a game write.
   */
  onRemoveRoads?: (
    cells: readonly RoadCell[],
  ) => void | Promise<RoadRemoveResult | void> | RoadRemoveResult;
  /**
   * Spendable ERA MATERIAL (era one: stone), already net of prior civic spend, read
   * from the shared stockpile. Drives which civic cards read as affordable and the
   * refusal copy when one does not. `null` (no economy wired) leaves every card
   * affordable in the preview — {@link onPlaceCivic} is the authority on the spend, so
   * this only tunes what the menu says.
   */
  materialAvailable?: number | null;
  /**
   * The era material's learner-facing name, for the cost tags and the announcements
   * ("80 stone"). A PROP rather than a module read for the same reason `eraId` is one:
   * the surface can be rendered in any era, and each authors its own material
   * (`packages/economy/src/materials.ts`). Defaults to era one's.
   */
  materialLabel?: string;
  /**
   * BUY and place one civic building of a type (era one section 3's catalogue). The
   * host is the authority on BOTH halves and reports which happened, so the
   * announcement states what actually occurred rather than what the surface hoped
   * would: an unaffordable purchase and a placement the reachability rule refused are
   * different sentences, and neither spends anything. In-app session state only —
   * never a game write, and nothing it returns gates a lesson (INV-COS-1).
   */
  onPlaceCivic?: (
    buildingId: CivicBuildingId,
    transform: PlacedTransform,
  ) => Promise<CivicPurchaseResult>;
  /**
   * RELOCATE an already-bought civic building, by its civic placement id — the spatial
   * twin of {@link onMoveSkill} for the BOUGHT half of the island, reached from the Move
   * control on that building's popup.
   *
   * SPENDS NOTHING: the building is already paid for, and the two capacities it
   * contributes belong to its type rather than to where it stands, so a move moves no
   * dial. Undefined outside the wired app, in which case the popup still opens and
   * reports what the building gives — only the relocation is unavailable, which is the
   * right default for a test that wired no session and never hides the building.
   */
  onMoveCivic?: (placementId: string, transform: PlacedTransform) => Promise<void>;
  /** Delete one paid civic through the owning session. Never accepts skill or Hall ids. */
  onRemoveCivic?: (placementId: string) => Promise<CivicRemovalResult>;
  /**
   * Presenter-only visual-layout edit. Omitted from learner, ordinary local, and account
   * compositions, so those surfaces neither render nor dispatch building deletion.
   */
  onPresenterRemoveBuilding?: (nodeId: string) => Promise<PresenterBuildingRemovalResult>;
  /**
   * **STAND UP THE CIVIC BUILDINGS A CAUGHT-UP LEARNER INHERITED**, at seats the catch-up has
   * already laid out for the age it has just founded (`catchup/civicSeats.ts`).
   *
   * The bought half of {@link onPlaceSkill}, and the same shape for the same reason: the walk
   * decides where, the host owns the write, and the session is the authority on whether each
   * seat is legal. SPENDS NOTHING — these were bought by the city the learner walked into, in
   * ages they have already walked past, so `onPlaceCivic`'s purchase path would refuse every one
   * of them `wrong_era`.
   *
   * Undefined outside the wired app, in which case the walk runs and seeds nothing — the right
   * default for a surface test that wired no session.
   */
  onSeedCivics?: (seats: readonly PlacedTransform[]) => void | Promise<void>;
  /**
   * **REPAIR ONE PIECE OF CRISIS DAMAGE**: spend the authored price, clear the ruin.
   *
   * The host owns the sequence (`city/crisisRepair.ts`) because it spans the wallet and the
   * session, and it is fail-closed like a road commit: a repair the stockpile cannot cover
   * spends nothing and clears nothing. The surface only ever ASKS — the reported
   * {@link CrisisRepairResult} drives the announcement, so the copy states what actually
   * happened rather than what the button hoped would.
   *
   * Undefined outside the wired app, in which case a ruin is VISIBLE and not repairable —
   * which is the right default for a test that wired no economy, and never hides the ruin.
   */
  onRepairRuin?: (target: RepairTarget) => Promise<CrisisRepairResult>;
  /**
   * **RECORD WHAT A CRISIS DID TO THIS CITY** — the opposite direction to
   * {@link onRepairRuin}, and the one that had no wiring at all.
   *
   * A crisis is played over the island by a mount this surface owns, and the damage it
   * produces has to land in the SAME session the island is drawn from. The winter's
   * carry-back wrote the saved blob directly instead, which is correct for `?winter` and
   * invisible here: `App.tsx` builds its session once, so a write behind its back reaches
   * nothing on screen and is overwritten by the session's own next save. `carryBackReaches
   * TheIsland.test.tsx` is that defect end to end.
   *
   * Undefined outside the wired app, in which case the winter falls back to the saved blob
   * exactly as `?winter` does. That is the honest default for a test that wired no session,
   * and it is what `winterInCityCarryBack.test.tsx` asserts is NOT what the app does.
   */
  onCarryCrisisDamage?: (report: CrisisDamageReport) => Promise<unknown>;
  /** Resolve one persisted overwritten-record verification through the owning session. */
  onVerifyOverwrittenRecord?: (damageId: string, correct: number) => Promise<CrisisDamage>;
  /** Browser-frame seam: mount the production in-city relay at a proven engine state. */
  relayPreviewState?: RelayState;
  /** Versioned authoritative Intrusion resume store for this learner identity. */
  relaySession?: RelaySession | null;
  /** Canonical `?intrusion` entry: open the production relay on this ready city. */
  initialIntrusionInCity?: boolean;
  /** Optional route-level navigation after the in-city Intrusion closes. */
  onIntrusionExit?: () => void;
  /** Exact Care House resume authority: Aurora when signed in, browser storage in demo. */
  plagueSession?: PlagueSession | null;
  /** Exact Succession authority, shared by the in-city mount and its persisted history. */
  successionSession?: SuccessionSession | null;
  /** Canonical `?succession` entry: raise the Classical city briefing on first ready read. */
  autoOpenSuccession?: boolean;
  /** Browser-frame seam: mount the in-city Succession at a proven engine state. */
  successionPreviewState?: SuccessionState;
  /** Preview route seam: open the Plague on this already-mounted live city. */
  initialPlagueInCity?: boolean;
  /** Optional route-level navigation after the in-city Plague closes. */
  onPlagueExit?: () => void;
  /**
   * The era the city is currently wearing, which picks the per-era DRESSING SUBTITLE
   * a building's display name carries (D-ERA29, `eraDressing.ts`). Defaults to
   * {@link CURRENT_ERA_ID} — the first entry in `ERA_SEQUENCE`, and the only era with
   * authored content today. It is a prop rather than a module read so the surface can
   * be rendered in any era, which is what pins the one invariant D-ERA29 owes D-ERA9:
   * the announced name's LEADING token is the stable handle in every era.
   */
  eraId?: EraId;
  /**
   * Which of the era door's three variants the ☰ Menu mounts, or absent for
   * {@link ERA_DOOR_VARIANT}.
   *
   * A SEAM WHILE THE THREE ARE BEING CHOSEN BETWEEN, and it comes out with the two that lose.
   * It exists so `eraAdvanceDoorShots.browser.test.tsx` can photograph each variant in the
   * real menu, on the real city, beside the rows it has to out-rank — which is the whole
   * question being asked of the pictures. Photographing a variant in a hand-built popover
   * would answer a different one.
   */
  eraDoorVariant?: EraDoorVariant;
}

/** The dev stage-setter options (ordered), shared by the panel + the announcement. */
const DEV_STAGE_OPTIONS: readonly { stage: DevBuildStage; label: string }[] = [
  { stage: "site", label: "Site" },
  { stage: "construction", label: "Construction" },
  { stage: "built", label: "Built" },
];
const DEV_STAGE_LABEL: Record<DevBuildStage, string> = {
  site: "Site",
  construction: "Construction",
  built: "Built",
};

/**
 * The dev stage currently rendered for a node, so the segmented control can mark
 * it active. `advanced` (mastery ≥ 2, full mastery included) reuses the finished
 * `built` model, so it highlights the "Built" option.
 */
function devStageOf(state: ConstructionState): DevBuildStage {
  const stage = buildStageFor(state);
  return stage === "advanced" ? "built" : stage;
}

type LoadStatus = "loading" | "ready" | "error";

/**
 * Which activity a building's click-menu launches into the lesson host: teach/review
 * the lesson, run the graded practice set, or the endless infinite-practice drill.
 */
type LessonEntry = "lesson" | "practice" | "infinite";

/**
 * Whether the live ghost is PLACING a brand-new building (`place`) or RELOCATING
 * one that is already on the island (`move`). The two share the entire ghost /
 * drag / keyboard / validity machinery; only the entry point, the copy, and where
 * the confirmed transform is written (place vs move) differ — so a move is just
 * "placement mode, pre-seeded with this building's current transform".
 */
type PlacementMode = "place" | "move";

/** An active build placement OR move: the chosen skill + its live grid transform. */
interface Placement {
  readonly nodeId: string;
  readonly col: number;
  readonly row: number;
  readonly rot: number;
  readonly mode: PlacementMode;
  /**
   * Set exactly when the ghost is a BOUGHT civic building rather than a skill.
   *
   * The ghost needs an id before the purchase exists, because `footprintFor` sizes it
   * from one — so it carries the PROVISIONAL id below, whose type segment is all the
   * footprint lookup reads. The real sequence-numbered id is minted by the session on
   * confirm, and only if the purchase actually goes through: a refused or unaffordable
   * attempt must not consume an id or leave one behind.
   */
  readonly civicId?: CivicBuildingId;
}

/**
 * The ghost's stand-in id while a civic building is being positioned. `civicTypeOf`
 * parses the type out of it exactly as it does a real one, so every gate the ghost goes
 * through — the footprint, the refusal, the bar's label — behaves as it will once the
 * building is bought. The `preview` tail is not a number, so it can never collide with
 * a minted id (`nextCivicSequence` reads integers).
 */
function civicPreviewId(buildingId: CivicBuildingId): string {
  // A valid structured id so every consumer uses the strict parser, but outside any
  // realistic minted sequence so ignore-self placement logic cannot hide an existing :0.
  return civicPlacementId(buildingId, Number.MAX_SAFE_INTEGER);
}

/** Keep the pan target inside this fraction of the island (matches CityScene). */
const PAN_BOUND_RATIO = 0.72;

/**
 * How far above the ground (world units) a picked road tile's popup anchors. Roads
 * are flat, so this stands in for the roofline the building popup measures — just
 * enough clearance that the card's tail points at the tile without covering it.
 */
const ROAD_CALLOUT_LIFT = 1.6;

/**
 * How long the recovery milestone stays on screen, in the slot the crisis-damage panel
 * has just vacated.
 *
 * It clears ITSELF rather than offering a dismiss, because a milestone that asks for a
 * click is busywork and a milestone that stays is a surface. Long enough to read one short
 * sentence without hurrying, and short enough that an island with nothing wrong with it is
 * back to being exactly the island it was. It is a display window and not game state:
 * nothing keys off it, and it is the same `window.setTimeout` the reward arc already uses.
 */
const RECOVERY_NOTE_MS = 7000;

/**
 * How long an achievement's moment stays on screen.
 *
 * `RECOVERY_NOTE_MS`'s reasoning and deliberately a little longer than it, because this
 * card carries two lines rather than one and often lands as another surface closes. Long
 * enough to notice, read and ignore, and short enough that the island is the island again.
 *
 * It clears itself and it is a display window rather than game state: nothing keys off it.
 */
const ACHIEVEMENT_NOTE_MS = 8000;

export function CitySurface({
  account = null,
  loadCity = loadMockCity,
  refreshToken = 0,
  initialSelectedNodeId,
  initialOpenBuildingId,
  initialEntry,
  activityToken = 0,
  onActivityExit,
  suppressAchievementNotes = false,
  suppressCrisisCalls = false,
  crisisCapabilityEnabled = true,
  presenterMenuTools,
  presenterAtlasHomeEraId,
  presenterReferenceFraming = false,
  presenterBuildingFocusNodeId,
  enableCanvas = true,
  bayAvailable,
  archipelagoMetrics = false,
  onResetIsland,
  onUnlockIsland,
  onRecordIslandExamResponse,
  onSailIsland,
  reducedMotion: reducedMotionOverride,
  enableOnboardingDemo = false,
  buildEntryCategory = "lessons",
  onStartLesson,
  onAttemptStorm,
  onOpenSurface,
  onOnboardingCivicMoment,
  onMoveTownHall,
  onPlaceSkill,
  onMoveSkill,
  pretestPlacement = EMPTY_PLACEMENT,
  catchUpWaitingOverride,
  onDevAdvanceMastery,
  onDevLessonTaught,
  onDevSetStage,
  onLessonTaught,
  onPracticeComplete,
  onPracticeReceipt,
  onCityLoad,
  goldAvailable = null,
  walletMaterials,
  getArchipelagoSnapshot,
  onCommitRoads,
  onRemoveRoads,
  materialAvailable = null,
  materialLabel = "stone",
  onPlaceCivic,
  onMoveCivic,
  onRemoveCivic,
  onPresenterRemoveBuilding,
  onRepairRuin,
  onCarryCrisisDamage,
  onVerifyOverwrittenRecord,
  relayPreviewState,
  relaySession = null,
  initialIntrusionInCity = false,
  onIntrusionExit,
  plagueSession = null,
  successionSession = null,
  autoOpenSuccession = false,
  successionPreviewState,
  initialPlagueInCity = false,
  onPlagueExit,
  lessonHost = stubLessonHost,
  eraId: eraIdProp,
  eraDoorVariant,
}: CitySurfaceProps) {
  useEffect(() => {
    runCityStorageMigrations();
  }, []);
  // THE ERA THE CITY IS STANDING IN. The prop still wins where a caller supplies one (every
  // test that renders a specific era, and `eraDressing.test.tsx`'s whole point); with none,
  // the surface follows the stored era rather than the era-one constant, which is what makes
  // an advance visible here at all. `eraState.ts` for the state, and `eraDressing.ts`'s
  // `CURRENT_ERA_ID` docblock for why this call site was decided on its own rather than as
  // part of a set.
  const liveEraId = useCityEra();
  const eraId = eraIdProp ?? liveEraId;
  const civicOptions = useMemo(() => civicOptionsForEra(eraId), [eraId]);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;
  const requestedEntryKind = initialEntry?.kind ?? null;
  const requestedEntryNodeId =
    initialEntry?.kind === "lesson" || initialEntry?.kind === "practice"
      ? initialEntry.nodeId
      : null;
  const requestedTeachingStep =
    initialEntry?.kind === "lesson" ? initialEntry.initialTeachingStep : undefined;
  const requestedReview =
    requestedEntryKind === "review" || requestedEntryKind === "interleaving";
  // Read only by the "sound" coach-mark, which tells a first-time learner where the
  // mute/volume controls are — the soundtrack ships ON, so a game that starts playing
  // music unasked owes them that sentence immediately.
  const musicEnabled = useMusicEnabled();

  // WHAT THE PRETEST ADMINISTERED AND WHICH OF IT PASSED, split once, here. Every reader
  // below takes `pretestUnlocked` from this, and the reward screen takes its headline from
  // the same `pretestPlacement` it was split out of, so there is one source for both.
  const pretestRosters = useMemo(
    () => pretestRostersFromPlacement(pretestPlacement),
    [pretestPlacement],
  );
  const pretestUnlocked = pretestRosters.testedOut;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [load, setLoad] = useState<CityLoad | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Nothing is selected on an ordinary island — the detail card is contextual and appears
  // once the player picks a building. A URL fixture may name one already-placed building so
  // three presentation presets frame the same skill without a preparatory click.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialSelectedNodeId ?? null,
  );
  const [shopOpen, setShopOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  /**
   * **HOW MANY SKILL BUILDINGS HAVE BEEN CONFIRMED SINCE THIS SURFACE MOUNTED.**
   *
   * Bumped only by the skill branch of `confirmPlacement`, never by civic purchases or moves,
   * and read by exactly one consumer: the onboarding gate, which asks specifically for a skill
   * building.
   *
   * A COUNTER RATHER THAN A CALLBACK PROP, and the reason is that the tutorial must not be
   * able to change what a placement does. A `onFirstPlacement` handler threaded into the
   * confirm path would put tutorial state inside the city's write path, where a future edit
   * could make the write conditional on it; a number the confirm path increments and never
   * reads is a report the tutorial can subscribe to and cannot influence.
   *
   * `placedNodeIds.size` would have been the derived alternative and it is the wrong signal:
   * it is a load-derived set, so it also moves on a reload, on a dev seed and on a catch-up
   * walk. What the gate is about is a placement HAPPENING, which is an event.
   */
  const [islandPlacements, setIslandPlacements] = useState(0);
  const [onboardingSkillNodeId, setOnboardingSkillNodeId] = useState<string | null>(null);
  const [onboardingActionVisits, setOnboardingActionVisits] =
    useState<OnboardingActionVisits>(EMPTY_ONBOARDING_ACTION_VISITS);
  const [onboardingActiveSurface, setOnboardingActiveSurface] =
    useState<OnboardingActionMomentId | null>(null);
  // Declared here (ahead of `confirmPlacement`) rather than beside the rest of the
  // onboarding-action wiring below: `confirmPlacement`'s civic-success branch calls it,
  // and a `useCallback` dependency array is evaluated eagerly at render time, so a
  // reference to a `const` whose own declaration has not run yet throws (TDZ), not just
  // reads stale.
  const markOnboardingActionVisited = useCallback((moment: OnboardingActionMomentId) => {
    setOnboardingActionVisits((visits) =>
      visits[moment] ? visits : { ...visits, [moment]: true },
    );
  }, []);
  // ROAD PAINT MODE (the gold sink). `null` = not painting; otherwise the ordered
  // draft path being traced. `roadPaintMode` swaps between LAYING new tiles and
  // marking existing ones to ERASE (both use the same draft + confirm/cancel).
  const [roadDraft, setRoadDraft] = useState<RoadCell[] | null>(null);
  const [roadPaintMode, setRoadPaintMode] = useState<"lay" | "erase">("lay");
  // The single road tile picked by clicking it on the island (outside paint mode).
  // It is highlighted in 3D and opens the anchored remove-with-refund popup.
  const [selectedRoadTile, setSelectedRoadTile] = useState<RoadCell | null>(null);
  // One-removal-at-a-time latch. A removal is async (session write → reload), so
  // without this a double-click could fire two removals for the same tile before
  // the first reload lands. The session refuses the second one anyway (only cells
  // that still carry a road are refunded), so this is belt-and-braces on the UI.
  const roadRemovalBusyRef = useRef(false);
  // Keyboard tracing anchor: the cell the first arrow-press starts the path from
  // (mouse painting ignores it). Set when road mode opens.
  const roadSeedRef = useRef<RoadCell>({ col: 0, row: 0 });
  const [enteredNodeId, setEnteredNodeId] = useState<string | null>(requestedEntryNodeId);
  // True when the lesson was opened to RESUME a Construction building's practice
  // ("Practice" callout action) — it starts the lesson directly in the practice set
  // instead of at teaching.
  const [resumePractice, setResumePractice] = useState(requestedEntryKind === "practice");
  // True when the lesson was opened straight into the endless infinite-practice drill
  // (the building menu's "Infinite practice" action). Mutually exclusive with
  // `resumePractice`; both false means the lesson opens at teaching / the revisit menu.
  const [resumeInfinite, setResumeInfinite] = useState(false);
  // Clicking a PLACED building (3D or the Built shelf) opens its lesson popup.
  const [lessonPopupNodeId, setLessonPopupNodeId] = useState<string | null>(null);
  // True while the Town Hall's interleaved-practice drill is open (the hub's primary
  // action). It is a standalone island activity, NOT a node lesson, so it is held apart
  // from `enteredNodeId` and never routes through the lesson host.
  const [interleavedOpen, setInterleavedOpen] = useState(requestedReview);
  const [stormOpen, setStormOpen] = useState(false);
  const [lastStormResult, setLastStormResult] = useState<StormAttemptResult | null>(null);
  // The two persistent civic HUD surfaces: the top-right ☰ Menu and top-left Town status.
  // The completed-building roster is local to the Build dialog that owns its Built shelf.
  const [menuOpen, setMenuOpen] = useState(false);
  const presenterMenuCommitTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (presenterMenuCommitTimerRef.current !== null) {
        window.clearTimeout(presenterMenuCommitTimerRef.current);
      }
      document.body.classList.remove("presenter-menu-open");
    },
    [],
  );
  /** The Hard Winter is running ON this city, over the island rather than on its own screen. */
  const [winterInCity, setWinterInCity] = useState(false);
  /** Era four's Succession is running on this city's real placed-building roster. */
  const [successionInCity, setSuccessionInCity] = useState(
    crisisCapabilityEnabled && successionPreviewState !== undefined,
  );
  /**
   * The explicit crisis door the player chose from Menu.
   *
   * This is separate from `useCrisisCall`: that hook owns the crisis this era EARNS at its
   * midpoint, while these dev doors are named destinations. Conflating the two made the
   * Hard Winter button dispatch through the Information Age hook and open the Intrusion.
   */
  const [requestedMenuCrisis, setRequestedMenuCrisis] = useState<
    "hard-winter" | "succession" | "intrusion" | null
  >(null);
  /** The redesigned Intrusion is running over the same real island. */
  const [relayInCity, setRelayInCity] = useState(
    crisisCapabilityEnabled && (relayPreviewState !== undefined || initialIntrusionInCity),
  );
  const [relayBoard, setRelayBoard] = useState<RelayState | null>(
    crisisCapabilityEnabled ? (relayPreviewState ?? null) : null,
  );
  const [relayFeedback, setRelayFeedback] = useState<RelayAnswerFeedback>({
    answered: 0,
    verdicts: [],
  });
  const [recordVerification, setRecordVerification] =
    useState<CrisisOverwrittenRecord | null>(null);
  /** Era six's Care House is running over this same island. */
  const [plagueInCity, setPlagueInCity] = useState(
    crisisCapabilityEnabled && initialPlagueInCity,
  );
  const [plagueLayer, setPlagueLayer] = useState<THREE.Object3D | null>(null);
  /**
   * One moment of that winter, published by `WinterInCity` so THIS canvas draws the crisis —
   * frost on these cells, fires where they were clicked, these buildings in ruins. Null
   * whenever no winter is running, which is the ordinary city.
   */
  const [winterBoard, setWinterBoard] = useState<WinterCityBoard | null>(null);
  const [successionBoard, setSuccessionBoard] = useState<SuccessionCityBoard | null>(null);
  useEffect(() => {
    if (crisisCapabilityEnabled) {
      return;
    }
    setWinterInCity(false);
    setSuccessionInCity(false);
    setRequestedMenuCrisis(null);
    setRelayInCity(false);
    setRelayBoard(null);
    setRecordVerification(null);
    setPlagueInCity(false);
    setPlagueLayer(null);
    setWinterBoard(null);
    setSuccessionBoard(null);
  }, [crisisCapabilityEnabled]);
  /**
   * **A CRISIS HAS THE ISLAND, so the city's own doors into a lesson are shut.**
   *
   * `winter-in-city.css` has said since the in-city mount landed that *"while a winter is
   * falling, the CITY's own controls are inert"*, and it enforced that in a stylesheet: one
   * `pointer-events: none` on `.hud`. A stylesheet cannot close a door. It does not touch the
   * keyboard — a dimmed roster row is still tabbable and still answers Enter — and the React
   * handler behind it went on doing exactly what it does on an ordinary island. So a click on
   * a roster row opened a lesson popup underneath the crisis panel, in the middle of a timed
   * encounter, and the ruling only LOOKED enforced.
   *
   * **IT IS `winterInCity` AND NOT `winterBoard`, and that difference is half the defect.**
   * The island's own click already deferred to the crisis, but it deferred on the BOARD —
   * the moment of the winter that `WinterInCity` publishes back for the canvas to draw. The
   * board is null for the whole of three real states in which the crisis is nonetheless on
   * screen: while `HardWinterSurface` is still being fetched behind its `lazy`, on a mount
   * whose canvas is not live (`WinterInCityProps.canvasLive`, which is what a machine with
   * no WebGL gets), and on the refusal card an island with nothing to lose is shown. Keying
   * the gate on the board would have left every one of those with a live city underneath.
   *
   * `winterInCity` is the crisis being ON SCREEN, which is the fact the gate is about.
   */
  const crisisHasTheIsland =
    crisisCapabilityEnabled &&
    (winterInCity ||
      successionInCity ||
      relayInCity ||
      plagueInCity ||
      recordVerification !== null);
  const [townOpen, setTownOpen] = useState(false);
  const [variant, setVariant] = useState<PaletteVariant>("day");
  const [buildingLabelsVisible, setBuildingLabelsVisible] = useState(
    readBuildingLabelsVisible,
  );
  // "You've unlocked N buildings!" celebration — shown once when the city mounts
  // fresh after a pretest that unlocked (tested out) at least one building.
  // Dismissing it opens the build menu so those buildings are placeable at once.
  // (Diagnostic hand-off UX, fed by App's pretest placement.)
  const [unlockCelebrationOpen, setUnlockCelebrationOpen] = useState(
    () => pretestUnlocked.length > 0,
  );
  // The IN-PLAY "new building unlocked" popup: finishing a building can satisfy the
  // prerequisites of one or more still-locked buildings, and those should be
  // celebrated rather than quietly appearing in the build menu. Holds the buildings
  // freed by the most recent completion (empty = no popup).
  const [newlyUnlocked, setNewlyUnlocked] = useState<readonly RewardBuilding[]>([]);
  const [celebrateTokens, setCelebrateTokens] = useState<Record<string, number>>({});
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const completionRewards = useCompletionRewards();

  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const successionCameraFrameRef = useRef<number | null>(null);
  const skillButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const stormBtnRef = useRef<HTMLButtonElement | null>(null);
  const buildBtnRef = useRef<HTMLButtonElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  // The anchored lesson-menu popup's root element. The 3D scene projects the selected
  // building's world position to screen space and glues this element above it each
  // frame (see CalloutTracker); it lives here (outside the aria-hidden canvas) so it
  // stays in the accessible DOM and renders even with no WebGL. Also the "build"
  // coach-mark's anchor when the popup is open.
  const calloutRef = useRef<HTMLDivElement | null>(null);
  // The element focus returns to after the info callout / its lesson closes
  // (the 3D viewport for a map click, or the Build button for a Built-shelf one).
  const lessonPopupReturnRef = useRef<HTMLElement | null>(null);
  // A learning takeover makes the city inert. Focus therefore cannot be restored until the
  // render that removes `inert`; hold the destination here and focus it from the effect below.
  const learningReturnFocusRef = useRef<HTMLElement | null>(null);
  const townHallBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const townBtnRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const loadAnnouncedRef = useRef(false);
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const prevMasteryRef = useRef<{
    readonly buildings: Map<
      string,
      {
        readonly complete: boolean;
        readonly constructionState: ConstructionState;
        readonly mastery: number;
      }
    >;
    readonly vitality: {
      readonly population: number;
      readonly livability: number;
      readonly happiness: number;
    } | null;
  } | null>(null);
  useEffect(() => {
    if (enteredNodeId !== null || interleavedOpen) {
      return;
    }
    const target = learningReturnFocusRef.current;
    if (target) {
      learningReturnFocusRef.current = null;
      (target.isConnected ? target : viewportRef.current)?.focus({ preventScroll: true });
    }
  }, [enteredNodeId, interleavedOpen]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (successionCameraFrameRef.current !== null) {
        cancelAnimationFrame(successionCameraFrameRef.current);
      }
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadToken is an intentional Retry trigger.
  useEffect(() => {
    let active = true;
    setStatus("loading");
    setErrorMessage(null);
    setSelectedNodeId(initialOpenBuildingId ?? null);
    setShopOpen(false);
    setPlacement(null);
    setRoadDraft(null);
    setSelectedRoadTile(null);
    setMenuOpen(false);
    setTownOpen(false);
    setLessonPopupNodeId(initialOpenBuildingId ?? null);
    loadAnnouncedRef.current = false;

    loadCity()
      .then((data) => {
        if (!active) {
          return;
        }
        setLoad(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "We could not load your neighborhood.",
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [initialOpenBuildingId, loadCity, reloadToken]);

  const refresh = useCallback(async () => {
    try {
      const data = await loadCity();
      if (mountedRef.current) {
        setLoad(data);
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        setAssertive(
          error instanceof Error
            ? `Could not refresh: ${error.message} Showing last known state.`
            : "Could not refresh. Showing last known state.",
        );
      }
    }
  }, [loadCity]);

  useEffect(() => {
    if (refreshToken > 0) {
      void refresh();
    }
  }, [refresh, refreshToken]);

  // One-way progression read-out (INV-COS-1): hand every freshly-loaded/refreshed
  // city state to the economy observer, if any. The economy derives idempotent
  // earn grants from this; it never feeds back into learning state. No-op when the
  // app wires no economy (default), so unrelated tests are unaffected.
  useEffect(() => {
    if (load) {
      onCityLoad?.(load);
    }
  }, [load, onCityLoad]);

  const viewModel = useMemo<CityViewModel | null>(
    () =>
      load
        ? buildCityViewModel({
            node_states: load.node_states,
            // The ROSTER is the era's: this era's nodes and every earlier era's
            // (`@cr/game` — `cityRosterNodeIds`). Omitting this is what pinned the city
            // to era one's six buildings whatever era the player was in, because the
            // view model then resolved its plots from D1's `mvp` nodes.
            era_id: eraId,
            neighborhood_state: load.neighborhood_state ?? null,
            authoring_complete: authoringCompletenessForNodes(
              cityRosterNodeIds(eraId),
              load.authoring_complete,
            ),
          })
        : null,
    [load, eraId],
  );

  /**
   * The rollout mode is fixed for this mount. In bay mode the rendered city is one era's
   * fixed island; with the rollback switch off it remains the cumulative single island.
   */
  const archipelago = useMemo(
    () => (bayAvailable ?? archipelagoEnabled()) || onUnlockIsland !== undefined,
    [bayAvailable, onUnlockIsland],
  );

  /**
   * THE ISLAND THE STANDING ERA IS DRAWN ON, and it moves exactly once per advance.
   *
   * Keyed on the standing era alone. `CityScene` memoises the camera's configuration on this
   * object so a state change never resets the player's pan, zoom, or orbit.
   */
  const layout = useMemo(
    () =>
      computeCityLayout(
        archipelago ? eraIslandLandRadius(eraId) : eraLandRadius(eraId),
        archipelago ? eraIslandSeaRadius(eraId) : eraSeaRadius(eraId),
      ),
    [archipelago, eraId],
  );

  const archipelagoSnapshot =
    archipelago && getArchipelagoSnapshot ? getArchipelagoSnapshot() : null;
  // The unlock exam never changes the standing island's buildable ground. Founding the
  // destination and choosing where to stand are separate writes, so the current layout is the
  // placement authority throughout the exam and reveal.
  const buildableRadius = layout.buildableRadius;

  const buildingByNode = useMemo(
    () => new Map((viewModel?.buildings ?? []).map((b) => [b.node_id, b])),
    [viewModel],
  );

  const skills = useMemo(() => viewModel?.buildings ?? [], [viewModel]);

  const placements = useMemo<PlacedTransform[]>(
    () => [...(load?.placements ?? [])],
    [load],
  );
  const placedByNode = useMemo(
    () => new Map(placements.map((p) => [p.nodeId, p])),
    [placements],
  );
  const placedNodeIds = useMemo(
    () => new Set(placements.map((p) => p.nodeId)),
    [placements],
  );
  // Committed road tiles + their cell keys. Roads, buildings, and the hall are all
  // mutually exclusive on a cell (see `buildingOccupied` / `occupied` below) — a road
  // only ever blocks a CELL, never a building's ability to exist somewhere, so it can
  // never gate learning (INV-COS-1). Counted BEFORE vitality so the happiness dial
  // can include path coverage (D-CIT7 amplify) without reading roads into the roster.
  const committedRoads = useMemo<RoadCell[]>(() => [...(load?.roads ?? [])], [load]);
  const roadKeys = useMemo(
    () => new Set(committedRoads.map((c) => roadCellKey(c.col, c.row))),
    [committedRoads],
  );
  // The BOUGHT civic buildings on the ground. They are what actually carries the
  // city's livability and happiness (D-ERA7), so they are read BEFORE vitality — and
  // they are grid occupants like any building, so they are in `allOccupants` below too.
  const civicPlacements = useMemo<PlacedTransform[]>(
    () => [...(load?.civic ?? [])],
    [load],
  );
  // The relay route is derived before the full Town Hall presentation block below.
  const relayTownHall = useMemo<PlacedTransform | null>(
    () => load?.town_hall ?? null,
    [load],
  );

  /**
   * WHAT A CRISIS DID AND NOBODY HAS REPAIRED YET (`@cr/game` — `crisis-damage.ts`).
   *
   * Read from the load beside `placements` and never merged into it, which is the failure
   * floor holding at the render layer too: a ruined building is still in `placements`, so
   * every surface that draws from placements — the 3D scene, the roster, the lesson callout
   * — draws the ruin, and the lesson behind it stays one click away.
   *
   * IT IS READ HERE, ABOVE VITALITY, because the third of its three sets is an input to the
   * arithmetic and not only to the chrome: a suspended civic building withholds its two
   * capacities (`suspendedCivic.ts`), so the damage has to be in scope before the dials are
   * derived. The two ruin sets are unchanged and are consumed further down as they were.
   */
  const crisisDamage = useMemo(
    () =>
      crisisCapabilityEnabled
        ? (load?.crisis_damage ?? NO_CRISIS_DAMAGE)
        : NO_CRISIS_DAMAGE,
    [crisisCapabilityEnabled, load],
  );
  const relayHost = useMemo(() => relayPlacement(civicPlacements), [civicPlacements]);
  useEffect(() => {
    if (crisisCapabilityEnabled && initialIntrusionInCity && relayHost !== null) {
      setRelayInCity(true);
    }
  }, [crisisCapabilityEnabled, initialIntrusionInCity, relayHost]);
  const relayScar = useMemo(
    () =>
      relayHost === null
        ? null
        : ((crisisDamage.overwritten_records ?? []).find(
            (record) => record.placement_id === relayHost.nodeId,
          ) ?? null),
    [crisisDamage, relayHost],
  );
  const visibleCrisisDamage = useMemo(() => {
    return {
      ...crisisDamage,
      overwritten_records: standingRecordScars(crisisDamage, civicPlacements),
    };
  }, [crisisDamage, civicPlacements]);
  /**
   * The hostile feed's route over buildings that actually stand on this island.
   *
   * The relay is the first hop. From there a deterministic nearest-neighbour walk takes at
   * most six more real placements, including the Town Hall when it is among the nearest. The
   * cap keeps the physical layer under its mesh budget on a late-era island with dozens of
   * inherited buildings; it never invents a target and it never changes engine arithmetic.
   */
  const relayTargetIds = useMemo<readonly string[]>(() => {
    if (relayHost === null) {
      return [];
    }
    const MAX_TARGETS = 6;
    const candidates = [
      ...placements,
      ...civicPlacements,
      ...(relayTownHall ? [{ ...relayTownHall, nodeId: TOWN_HALL_ID }] : []),
    ];
    const unique = new Map(candidates.map((placement) => [placement.nodeId, placement]));
    unique.delete(relayHost.nodeId);
    const route = [relayHost.nodeId];
    let current = transformCenter(relayHost, footprintFor(relayHost.nodeId));
    while (route.length < MAX_TARGETS && unique.size > 0) {
      const next = [...unique.values()].sort((a, b) => {
        const ac = transformCenter(a, footprintFor(a.nodeId));
        const bc = transformCenter(b, footprintFor(b.nodeId));
        const ad = Math.hypot(ac.x - current.x, ac.z - current.z);
        const bd = Math.hypot(bc.x - current.x, bc.z - current.z);
        return ad - bd || a.nodeId.localeCompare(b.nodeId);
      })[0];
      if (!next) {
        break;
      }
      route.push(next.nodeId);
      unique.delete(next.nodeId);
      current = transformCenter(next, footprintFor(next.nodeId));
    }
    return route;
  }, [civicPlacements, placements, relayHost, relayTownHall]);
  const relayRenderState = useMemo(
    () =>
      relayHost === null
        ? null
        : relayBoard !== null
          ? {
              placementId: relayHost.nodeId,
              dark: relayBoard.dark,
              shuttersClosed: relayBoard.shutters_closed,
              copy: relayBoard.copy,
              proposal: relayBoard.phase === "armed" ? relayBoard.armed : null,
              cityView: relayCityView(relayBoard, relayTargetIds, relayFeedback),
            }
          : relayScar !== null
            ? {
                placementId: relayHost.nodeId,
                dark: relayScar.bands_dark,
                shuttersClosed: 0,
                copy: "spent" as const,
                proposal: null,
              }
            : null,
    [relayBoard, relayFeedback, relayHost, relayScar, relayTargetIds],
  );
  const ruinedNodeIds = useMemo(
    () => new Set(crisisDamage.ruined_buildings.map((b) => b.node_id)),
    [crisisDamage],
  );
  /** Scarred ground: unbuildable, un-roadable, and reclaimable at the authored price. */
  const ruinedGround = useMemo(
    () => crisisDamage.ruined_cells.map((record) => record.cell),
    [crisisDamage],
  );
  /**
   * **THE CIVIC BUILDINGS A CRISIS SHUTTERED, whichever crisis it was.**
   *
   * The membership set the capacity suppression and the island caption both read, and the
   * priced rows the repair panel offers. Both come from `suspendedCivic.ts`, which knows
   * about the FIELD and about no crisis, so era four, era nine and whatever writes it next
   * are one code path here rather than three.
   */
  const suspendedCivic = useMemo(() => suspendedCivicIds(crisisDamage), [crisisDamage]);
  const visibleSuspendedCivic = useMemo(
    () =>
      new Set([
        ...suspendedCivic,
        ...(successionInCity ? (successionBoard?.suspendedCivicIds ?? []) : []),
      ]),
    [successionBoard, successionInCity, suspendedCivic],
  );
  const successionThreatenedNodeIds = useMemo(
    () =>
      successionInCity && successionBoard?.threatenedPlacementId
        ? new Set([successionBoard.threatenedPlacementId])
        : null,
    [successionBoard, successionInCity],
  );
  const suspensions = useMemo(
    () => standingSuspensions(crisisDamage, civicPlacements, eraId),
    [crisisDamage, civicPlacements, eraId],
  );
  /**
   * The bought buildings by placement id — the civic twin of `placedByNode`, and the
   * lookup that lets a civic id answer the two questions the popup machinery asks of
   * every building: "is it standing?" (`openLessonPopup`'s gate) and "where, so the card
   * can be glued above it?" (`calloutAnchor`). Both used to consult `placedNodeIds`
   * alone, which is a set of SKILL nodes, so a bought building answered no to the first
   * and the click opened nothing at all.
   */
  const civicByNode = useMemo(
    () => new Map(civicPlacements.map((p) => [p.nodeId, p])),
    [civicPlacements],
  );
  // The two capacities PR #218 ruled, off the same placed-and-complete set the
  // citizen roster reads, plus every bought civic row and the laid road count for
  // happiness. Derived, never stored: population and the happiness level are readouts
  // (D-ERA13), and nothing here is persisted, so a retune is retroactive.
  const vitality = useMemo(
    () =>
      viewModel
        ? cityVitality({
            viewModel,
            placements,
            // Leads with era one's free Smokehouse, which has no placement yet, then
            // one entry per bought building. See `civicTypesOf`.
            //
            // A CRISIS-SUSPENDED BUILDING IS ZEROED HERE, which is the whole of what a
            // suspension costs the player: the two dials fall, the provision reading reads
            // the fallen numbers, and both readouts say so. It is applied at this one seam
            // rather than at the panel so the crowd, the HUD and the alarm cannot disagree
            // about how much capacity the city has. See `suspendedCivic.ts`.
            civic: civicContributionRowsOf(civicPlacements, suspendedCivic),
            roadTileCount: committedRoads.length,
          })
        : null,
    [viewModel, placements, civicPlacements, suspendedCivic, committedRoads.length],
  );
  /*
    ⚑ NOTHING SOUNDS HERE FOR PEOPLE LEAVING, AND SOMETHING USED TO.

    A `seenDeparturesRef` held the last reading and `departureSfx` decided, from the two
    readings either side of a change, whether the tick owed one `citizens-depart` — one door
    closing for the tick and never one per person, silent on the first reading, silent on a
    falling count and silent through the shallow band.

    Departures were removed as a mechanic on 2026-08-05 ("citizens do not leave"), so the
    module, the sample and the `SfxName` are deleted rather than left wired to a count that is
    always zero. This is still the app's only `deriveCityVitality` call, which is why the
    absence is worth a note here: it is the one place such a sound could ever have been made.
  */
  // The people themselves, for the 3D crowd. Derived HERE and handed to the scene
  // rather than derived inside it, because the scene reads assignments and never
  // computes them (D-CIT8) — and because this is the same call the readout above goes
  // through, so the crowd and the panel cannot report different populations.
  // Deliberately does NOT take roads (D-CIT18).
  const citizens = useMemo(
    () =>
      viewModel
        ? cityCitizenRoster({ viewModel, placements, civic: civicPlacements })
        : null,
    [viewModel, placements, civicPlacements],
  );
  // The picked tile, re-validated against the CONFIRMED road layout every render:
  // once the tile is gone (removed here, or paved over by any other path) the
  // selection resolves to null, which closes the popup and drops the highlight. The
  // committed state is the authority — the selection can never outlive its tile.
  const selectedRoad = useMemo(
    () =>
      selectedRoadTile &&
      roadKeys.has(roadCellKey(selectedRoadTile.col, selectedRoadTile.row))
        ? selectedRoadTile
        : null,
    [selectedRoadTile, roadKeys],
  );

  // The island HUB placement (Town Hall). PRE-SEEDED, so present on every dev/mock
  // island from the start (null only in a host path that loads no hall). Held APART
  // from the skill placements — it is not a skill node, so it never dilutes the
  // roster's `N/6`, the build-menu lesson cards, or mastery stars.
  const townHall = useMemo<PlacedTransform | null>(() => load?.town_hall ?? null, [load]);
  const townHallPresent = townHall !== null;

  /**
   * **THE CITY BACK ON ITS FEET, watched for as a TRANSITION rather than read as a state.**
   *
   * `isCrisisDamageClear` is true of every island nothing has happened to, so the milestone
   * cannot be a read of the current damage: it is the moment the last scar goes, which is
   * the repair the player just paid for. This is `prevMasteryRef`'s discipline one more time
   * — the first ready read only seeds the baseline, so a city that LOADS already repaired
   * has not just recovered and says nothing.
   *
   * It is a NOTE and not a store. Nothing reads it back, it is never persisted, and it
   * clears itself, so there is nowhere for a second milestone to accumulate beside it. See
   * `milestones.ts` for the once-only key.
   */
  const [recoveryNote, setRecoveryNote] = useState<string | null>(null);
  const previousDamageRef = useRef<CrisisDamage | null>(null);
  useEffect(() => {
    if (load === null) {
      return;
    }
    const previous = previousDamageRef.current;
    previousDamageRef.current = crisisDamage;
    if (previous === null) {
      return;
    }
    const note = cityRecoveredMilestone(previous, crisisDamage);
    if (note === null) {
      return;
    }
    setRecoveryNote(note);
    setPolite(note);
    window.setTimeout(() => {
      if (mountedRef.current) {
        setRecoveryNote(null);
      }
    }, RECOVERY_NOTE_MS);
  }, [load, crisisDamage]);

  /**
   * **THE ACHIEVEMENTS: four reads, and the moment one of them comes true.**
   *
   * The record layer over what this run has done, which is a different layer from the two
   * crisis acknowledgements above: those are a sentence on a beat and are never stored, and
   * these are earned once and kept. `achievements.ts` carries the argument for why the two
   * do not restate each other and `test/achievementsAreNotAScore.test.ts` measures it.
   *
   * **NOTHING NEW IS TRACKED HERE.** Every field of the state is a read of something the
   * surface has already derived for another purpose: the damage mint it prices repairs off,
   * the era it dresses the island in, the mastery the stars are drawn from, and the ruins it
   * is already rendering. That is the whole of the condition side of the framework.
   */
  const achievementState = useMemo<AchievementState>(
    () => ({
      crisesRecorded: crisesRecordedFromMint(crisisDamage.next_damage_id),
      // Position in the authored sequence less one, so a city in its first age reads zero
      // and the first advance is what earns the row.
      agesBehind: eraNumber(eraId) - 1,
      // FULL mastery (`gold`), not the built stage: topping out is already celebrated with
      // a chime and a note, and the last star is the beat nothing marks.
      masteredSkills: viewModel?.buildings.filter((building) => building.gold).length ?? 0,
      standingRuins: crisisDamage.ruined_buildings.length,
    }),
    [crisisDamage, eraId, viewModel],
  );

  /**
   * WHICH ONES THIS LEARNER HAS, and the one being announced right now.
   *
   * The earned set is held in state rather than read from storage on every render so the
   * list and the moment agree within a tick, and it is SEEDED from storage once, which is
   * what makes "earned once and permanently" survive a reload.
   */
  const [earnedAchievements, setEarnedAchievements] = useState<ReadonlySet<string>>(() =>
    loadEarnedAchievements(),
  );
  const [achievementNote, setAchievementNote] = useState<string | null>(null);
  // The list, opened from the ☰ Menu. Declared here beside the state it shows rather than
  // with the other menu panels, because the dev control inside it closes the card.
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  /**
   * Record one and give it its moment.
   *
   * Shared by the real path and by the dev control, deliberately: a reviewer photographing
   * the moment must be photographing the shipped one. The write happens before the state
   * update so a reload mid-announcement still remembers it.
   */
  const recordAchievement = useCallback(
    (id: string, line: string) => {
      markAchievementEarned(id);
      setEarnedAchievements((held) => new Set(held).add(id));
      if (!suppressAchievementNotes) {
        setAchievementNote(line);
        setPolite(line);
        window.setTimeout(() => {
          if (mountedRef.current) {
            setAchievementNote(null);
          }
        }, ACHIEVEMENT_NOTE_MS);
      }
    },
    [suppressAchievementNotes],
  );

  /*
    THE EARNING PASS. It runs on every state change and is idempotent, because
    `newlyEarnedAchievements` subtracts what is already recorded — so a re-render, a reload
    or a second crisis cannot re-announce something.

    IT DOES NOT WAIT FOR A BASELINE, which is the opposite of the recovery note above it,
    and the difference is the point. That note marks a TRANSITION, so a city that loads
    already repaired has not just recovered. An achievement is a standing FACT about the
    run, so a learner who earned one in a build that predates this table should be told the
    first time the game can see it, not never.

    ONLY THE FIRST of a batch is announced, because two cards over one island is a pile
    rather than a moment; the rest are recorded silently and are in the list. The batch is
    real: an era advance on a mastered city can satisfy two rows on one tick.
  */
  useEffect(() => {
    if (status !== "ready") {
      return;
    }
    const arrived = newlyEarnedAchievements(achievementState, earnedAchievements);
    if (arrived.length === 0) {
      return;
    }
    const [first, ...quiet] = arrived;
    if (first !== undefined) {
      recordAchievement(first.id, first.earned);
    }
    for (const achievement of quiet) {
      markAchievementEarned(achievement.id);
    }
    if (quiet.length > 0) {
      setEarnedAchievements((held) => {
        const next = new Set(held);
        for (const achievement of quiet) {
          next.add(achievement.id);
        }
        return next;
      });
    }
  }, [status, achievementState, earnedAchievements, recordAchievement]);

  /** DEV: record one from the list's own panel, and get out of the way of its moment. */
  const fireAchievement = useCallback(
    (id: string) => {
      const achievement = ACHIEVEMENTS.find((entry) => entry.id === id);
      if (achievement === undefined) {
        return;
      }
      setAchievementsOpen(false);
      recordAchievement(achievement.id, achievement.earned);
    },
    [recordAchievement],
  );
  /** DEV: forget every one, leaving the open list on a set of invitations. */
  const forgetEarnedAchievements = useCallback(() => {
    forgetAchievements();
    setEarnedAchievements(new Set());
    setAchievementNote(null);
  }, []);

  /**
   * WHOSE CRISIS THE WINTER CHIP OFFERS, derived rather than asserted.
   *
   * The chip's hover said *"Play era one's mid-era crisis"* — true today, silently false the
   * day a second era's winter is built, and already odd for a player standing in era three.
   * `resolveCrisisEra` knows which eras have both ground and content for a board, so the copy
   * travels with the board rather than describing a pin that has moved.
   */
  const crisisPhrase = useMemo(() => {
    if (eraId === "classical") {
      return "The Succession";
    }
    if (eraId === PLAGUE_ERA) {
      return "The Care House";
    }
    const crisis = resolveCrisisEra(eraId);
    return describeCrisisEra(crisis, getEraOrThrow(crisis.eraId).name);
  }, [eraId]);

  /**
   * The scarred ground the CANVAS draws: what a previous crisis left, plus what the winter
   * on screen has just finished leaving.
   *
   * Only the persisted half feeds placement validity above — a winter writes nothing to the
   * city unless the player asks it to, and the sandbox promise is that an unfinished carry-back
   * changes nothing. What this adds is purely a picture: once a winter has thawed, its own
   * layer stops drawing the ground it gave up, so the city's durable-damage layer has to draw
   * it or the scars would vanish with the frost — which is the one thing the revert must not do.
   */
  const scarredGround = useMemo(() => {
    const winterScars = winterBoard?.scarredCells ?? [];
    if (winterScars.length === 0) {
      return ruinedGround;
    }
    return [...new Set([...ruinedGround, ...winterScars])];
  }, [ruinedGround, winterBoard]);

  // Every occupant on the grid — skills, the hall, and every BOUGHT civic building — so
  // placement validity accounts for all three the same way (they reuse the ordinary
  // occupancy math). Civic buildings are in the REACHABILITY half of the rule as well as
  // the overlap half, because they are exactly as capable of walling a neighbour in
  // (D-ERA35); the session's own `readOccupants` composes the identical list, which is
  // what keeps the ghost from ever offering a drop the session will refuse.
  const allOccupants = useMemo<PlacedTransform[]>(
    () => [...placements, ...(townHall ? [townHall] : []), ...civicPlacements],
    [placements, townHall, civicPlacements],
  );
  const occupantById = useMemo(
    () => new Map(allOccupants.map((occupant) => [occupant.nodeId, occupant])),
    [allOccupants],
  );
  useEffect(() => {
    if (!crisisCapabilityEnabled || eraId !== "classical") {
      setSuccessionBoard(null);
      return;
    }
    if (successionSession === null || successionInCity) {
      return;
    }
    let active = true;
    void Promise.all([
      successionSession.load(),
      import("../succession/successionCity"),
      import("./three/SuccessionInCity"),
    ]).then(([loadedSuccession, cityModule, inCityModule]) => {
      if (!active || loadedSuccession.battle === null) {
        return;
      }
      let roster: SuccessionCityRoster;
      try {
        roster = cityModule.successionCityRoster({
          placements,
          townHall,
          civic: civicPlacements,
        });
      } catch {
        return;
      }
      const aftermath = inCityModule.successionAftermathBoard(
        loadedSuccession.battle.state,
        roster,
      );
      if (aftermath !== null) {
        setSuccessionBoard(aftermath);
      }
    });
    return () => {
      active = false;
    };
  }, [
    civicPlacements,
    crisisCapabilityEnabled,
    eraId,
    placements,
    successionInCity,
    successionSession,
    townHall,
  ]);
  // Cells occupied by a building OR the hall (NOT roads) — the road-lay validity set:
  // a road can't be laid on a building or on the hub's reserved 3×2 cells.
  //
  // SCARRED GROUND IS IN HERE, so a road cannot be paved over a scar either. The session's
  // `occupiedForPlacement` is the authority and already blocks it (an unaffordable or
  // illegal commit lays nothing), so this is the PREVIEW agreeing with the commit rather
  // than a second rule — a paint stroke that looked legal and then laid nothing is the
  // shape of bug this mirroring exists to avoid.
  const buildingOccupied = useMemo(() => {
    const cells = occupiedCells(allOccupants);
    for (const key of ruinedGround) {
      cells.add(key);
    }
    return cells;
  }, [allOccupants, ruinedGround]);
  // Full occupancy a building/hall placement validates against: buildings + hall +
  // roads + scarred ground, all mutually exclusive (nothing can drop onto a road, no road
  // sits under a building/hall, and nothing at all sits on ground a crisis scarred).
  const occupied = useMemo(() => {
    const cells = new Set(buildingOccupied);
    for (const key of roadKeys) {
      cells.add(key);
    }
    return cells;
  }, [buildingOccupied, roadKeys]);

  // The node (or the hall) currently being MOVED, or null when placing fresh / idle.
  const moveNodeId = placement?.mode === "move" ? placement.nodeId : null;
  // Occupancy the ACTIVE ghost validates against. While moving, the moved occupant's
  // own current footprint is excluded (the ignore-self rule) — the hall included, so
  // moving it never collides with itself — but every road cell is STILL blocked, so a
  // relocation can't drop a building or the hub onto a road. Placing fresh uses the
  // full occupancy. Independent of the live col/row/rot, so it stays stable across a
  // drag/nudge session.
  const occupiedForActive = useMemo(() => {
    if (!moveNodeId) {
      return occupied;
    }
    const cells = occupiedCells(allOccupants, moveNodeId);
    for (const key of roadKeys) {
      cells.add(key);
    }
    // Scarred ground is never ignored, exactly like a road: `ignoreNodeId` exists so a
    // building can be dropped back onto its own footprint, and a scar under a building the
    // player is relocating is still a scar the moment they let go of it.
    for (const key of ruinedGround) {
      cells.add(key);
    }
    return cells;
  }, [moveNodeId, allOccupants, occupied, roadKeys, ruinedGround]);
  // The other occupants the REACHABILITY half of the rule walks around: buildings and
  // the hall, minus the one being moved, and deliberately without roads — paving blocks
  // a cell but never a walk (INV-COS-1). Scarred ground is left out on the same footing
  // as a road: it refuses a PLACEMENT and does not stop a person crossing it. That is a
  // reading of `integration`'s crisis model rather than a ruling on it, and it is flagged
  // on the forward-merge — see the merge commit. Held apart from `occupiedForActive`
  // because the two sets are genuinely different questions: "what can I not overlap" and
  // "what can a person not walk through".
  const othersForActive = useMemo(
    () =>
      moveNodeId
        ? allOccupants.filter((occupant) => occupant.nodeId !== moveNodeId)
        : allOccupants,
    [moveNodeId, allOccupants],
  );
  // The live refusal for the active ghost's cell — `null` when it may be committed,
  // otherwise WHY, so the bar and the live region can both say it.
  const refusalFor = useCallback(
    (transform: PlacedTransform): PlacementRefusal | null =>
      placementRefusal({
        candidate: transform,
        others: othersForActive,
        blockedCells: occupiedForActive,
        buildableRadius,
      }),
    [othersForActive, occupiedForActive, buildableRadius],
  );

  // Live road-draft economics: cost scales with the drafted tile count; a lay is
  // affordable when the spendable wallet covers it (an erase never needs gold — it
  // hands gold back). The atomic commit re-checks authoritatively — this only drives
  // the live preview.
  const roadDraftCost = useMemo(() => roadCost(roadDraft?.length ?? 0), [roadDraft]);
  // What a confirmed ERASE hands back: the same per-tile price, so removing is
  // exactly as expensive as laying was — in reverse.
  const roadDraftRefund = useMemo(() => roadRefund(roadDraft?.length ?? 0), [roadDraft]);
  const roadAffordable =
    roadPaintMode === "erase" || goldAvailable === null || goldAvailable >= roadDraftCost;

  // Is the selected thing STANDING IN THE CITY? Everything that reads this asks that
  // question and not "is it a placed skill", which is what it used to answer. A BOUGHT
  // civic building is standing and is absent from `placedNodeIds` (it lives in
  // `load.civic`), so it read as unplaced and the HUD raised the "Ready to build" card
  // over a building already paid for — headed with its raw placement id, since
  // `buildingName` knows only `NUM.*` keys, and offering a Build that would open a fresh
  // ghost for it. The visible twin of the false "not built yet" announcement, from the
  // same root: skill-building machinery asked about a bought building.
  const selectedPlaced = selectedNodeId
    ? isTownHall(selectedNodeId)
      ? townHallPresent
      : placedNodeIds.has(selectedNodeId) ||
        civicPlacements.some((p) => p.nodeId === selectedNodeId)
    : false;
  // The placed building whose info callout is open (its full info lives there now).
  const lessonPopupBuilding = lessonPopupNodeId
    ? (buildingByNode.get(lessonPopupNodeId) ?? null)
    : null;
  /**
   * The BOUGHT civic building whose panel is open, with the capacities it contributes.
   *
   * Gated on the building actually STANDING (`civicByNode`) and not merely on the id
   * parsing as civic, so a stale id — a snapshot restored after the building was removed,
   * or a row this era no longer authors — opens nothing rather than a card describing a
   * building that is not there. The three popup branches are mutually exclusive by
   * construction: `buildingByNode` holds skill nodes, this holds civic placements, and
   * the hub is its own sentinel, so no id can satisfy two of them.
   */
  const civicPopup = useMemo(() => {
    if (!lessonPopupNodeId || !civicByNode.has(lessonPopupNodeId)) {
      return null;
    }
    const contributions = civicContributions(lessonPopupNodeId);
    return contributions === null ? null : { nodeId: lessonPopupNodeId, contributions };
  }, [lessonPopupNodeId, civicByNode]);

  // The open popup's anchor — the selected building's footprint-center ground
  // position + its nodeId. The 3D scene measures that building's live roofline and
  // projects the point to screen space each frame, so the menu tracks the building
  // (glued just above it) as the camera pans / orbits / zooms.
  const calloutAnchor = useMemo(() => {
    // A picked ROAD TILE anchors the same popup at its own cell, just above the
    // asphalt: there is no model to measure, so it passes an explicit height and the
    // card floats over the tile it belongs to. (Selecting a tile closes the building
    // menu and vice-versa, so the two can never contend for the anchor.)
    if (selectedRoad) {
      const { x, z } = cellCenter(selectedRoad.col, selectedRoad.row);
      return { nodeId: null, x, z, anchorY: SURFACE_Y + ROAD_CALLOUT_LIFT };
    }
    if (!lessonPopupNodeId) {
      return null;
    }
    // All three kinds of building anchor the same way — the popup is glued above whatever
    // is standing there — so all three transforms are looked up here. A bought civic
    // building is in `civicByNode`; without it the anchor was `null`, and a card with no
    // anchor is a card the scene cannot place.
    const transform = isTownHall(lessonPopupNodeId)
      ? townHall
      : (placedByNode.get(lessonPopupNodeId) ?? civicByNode.get(lessonPopupNodeId) ?? null);
    if (!transform) {
      return null;
    }
    const center = transformCenter(transform, footprintFor(lessonPopupNodeId));
    return { nodeId: lessonPopupNodeId, x: center.x, z: center.z };
  }, [lessonPopupNodeId, placedByNode, civicByNode, townHall, selectedRoad]);

  const scenePlaced = useMemo<ScenePlacement[]>(
    () =>
      // Hide the building being MOVED at its old spot — the translucent ghost stands
      // in for it while it is relocated (exactly like first-time placement). Dropping
      // it from `placed` also means the scene's own drag-path occupancy no longer
      // counts it, so the fluid drag agrees with the keyboard path's ignore-self rule.
      placements
        .filter((p) => p.nodeId !== moveNodeId)
        .map((p) => {
          const building = buildingByNode.get(p.nodeId) ?? null;
          return {
            nodeId: p.nodeId,
            col: p.col,
            row: p.row,
            rot: p.rot,
            model: building
              ? resolveBuildingModel(p.nodeId, buildStageFor(building.construction_state))
              : null,
            // Mastery tier drives the floating stars above the building (same value
            // the callout shows as "Mastery X of 3"); 0 for an unmapped building.
            mastery: building?.mastery ?? 0,
            celebrateToken: celebrateTokens[p.nodeId] ?? 0,
          };
        })
        // The BOUGHT half of the island. A civic building has no lesson, so it has no
        // construction phases to climb: it renders at its finished mass from the moment
        // it is paid for (`resolveCivicModel` defaults to the `built` stage).
        //
        // `mastery: 0` IS NOT WHAT KEEPS A STAR RACK OFF IT, and believing that it was is
        // exactly what put one there — 0 is a real tier, and a real tier draws three
        // EMPTY stars over every bought building. What actually refuses the rack is
        // `placementStars`, which asks `placementEarnsMastery` about the id's CLASS and
        // hands back `null` before any tier is read. The 0 here is inert: the prop is
        // required and a building with no `student_node_state` row has no other honest
        // value to report.
        //
        // The MODEL is keyed by TYPE and the placement by ID, which is the join this
        // line makes: two Longhouses are two scene objects wearing one mass.
        .concat(
          civicPlacements
            .filter((p) => p.nodeId !== moveNodeId)
            .map((p) => {
              const modelType = civicTypeOf(p.nodeId);
              return {
                nodeId: p.nodeId,
                col: p.col,
                row: p.row,
                rot: p.rot,
                model: modelType === null ? null : resolveRestoredCivicModel(modelType),
                mastery: 0,
                celebrateToken: 0,
              };
            }),
        ),
    [placements, civicPlacements, buildingByNode, celebrateTokens, moveNodeId],
  );

  // How many buildings are still off the island (i.e. still buildable). Drives the
  // build-menu open announcement and the "all built" Build-button label.
  const unplacedCount = useMemo(
    () => skills.filter((b) => !placedNodeIds.has(b.node_id)).length,
    [skills, placedNodeIds],
  );

  const skillIds = useMemo(() => new Set(skills.map((b) => b.node_id)), [skills]);

  // A building counts as COMPLETED for prerequisite gating once it has been placed
  // AND topped out — its finished model is standing ("built") or it is mastered
  // ("advanced"). Read straight from the city's real construction state, so
  // completing a prerequisite (dev stage-setter → Built, or advancing mastery)
  // unlocks its dependents live on the very next recompute.
  const completedNodeIds = useMemo(() => {
    const done = new Set<string>();
    for (const building of skills) {
      if (!placedNodeIds.has(building.node_id)) {
        continue;
      }
      const stage = buildStageFor(building.construction_state);
      if (stage === "built" || stage === "advanced") {
        done.add(building.node_id);
      }
    }
    return done;
  }, [skills, placedNodeIds]);

  // The island's aggregate completion — `c of N` — shown on the hub panel (island
  // progress). N = this island's completable skill count; c = how many reached
  // Complete. It no longer drives the hall's model (the hall is always `built`).
  const completedCount = completedNodeIds.size;
  const skillCount = skills.length;

  // The skills the learner has actually PRACTICED — a finished practice set,
  // `mastery >= 1` — which is the same rule the drill pools on. Memoized so the drill's
  // scheduler is not rebuilt (resetting the session) on every unrelated re-render.
  const practicedNodeIds = useMemo(
    () => completedNodeIdsFrom(load?.node_states ?? []),
    [load],
  );
  // Of those, the ones the item bank can actually serve problems for: what there is to
  // MIX. Gating on this — rather than on the island's Complete-building count — is what
  // keeps the offer honest, since a tested-out building is Complete at mastery 0 and
  // contributes nothing to interleave.
  //
  // The mix is the ERA's, and `eraId` is the era the city is wearing — the same value
  // that dresses every building name below. It is read directly rather than mapped from
  // the neighborhood's `DomainId`, which INV-ERA-5 forbids: a domain can sit in three
  // eras, so no `DomainId` determines one.
  //
  // `"revisit-practiced"` is what keeps the hub's one repeatable activity alive past era
  // one: this era's own nodes cannot be completed yet (plot derivation resolves zero plots
  // outside era one), so pinned to the era's pool the entry point went inert in eras two
  // through ten and told a learner with six finished skills they had finished none. The
  // SAME value goes to the drill below, so the gate and the drill read one pool.
  // Review mistakes has a truthful empty state, so the Town Hall door is always available.
  const interleavedEligible = true;

  // The island HUB for the 3D scene, at its grid transform. Hidden (null) while the hall
  // itself is being MOVED — the translucent ghost stands in for it, exactly like a skill
  // building relocation.
  const sceneTownHall = useMemo(
    () =>
      townHall && moveNodeId !== TOWN_HALL_ID
        ? {
            col: townHall.col,
            row: townHall.row,
            rot: townHall.rot,
            model: resolveEraTownHall(eraId, CURRENT_ERA_ID).model,
            celebrateToken: 0,
          }
        : null,
    [townHall, moveNodeId, eraId],
  );

  // The build-menu cards, ordered by the D1 TEACHING sequence (foundational skills
  // first, derived from the skill-graph prereq edges). Only SKILL buildings appear —
  // the Town Hall is pre-seeded and not placeable, so it has no card. EVERY skill keeps
  // a card for its whole life in one of three states: BUILT (already placed — a
  // non-buildable "Built" card, so a placed building is never dropped from the list),
  // LOCKED (still unbuilt and gated until every prerequisite building in this city is
  // completed), or ready to build (unlocked and not yet placed — placeable immediately,
  // there is no first-placement gate). Buildings with no prerequisites start ready.
  const buildMenuEntries = useMemo<BuildMenuEntry[]>(() => {
    const byNode = new Map(skills.map((b) => [b.node_id, b]));
    return teachingOrder(skills.map((b) => b.node_id)).flatMap((nodeId) => {
      if (!byNode.has(nodeId)) {
        return [];
      }
      const placed = placedNodeIds.has(nodeId);
      const prereqBuildings = (getNode(nodeId)?.prereqs ?? []).filter((prereq) =>
        skillIds.has(prereq),
      );
      const missing = prereqBuildings.filter((prereq) => !completedNodeIds.has(prereq));
      return [
        {
          nodeId,
          name: buildingDisplayName(nodeId, eraId),
          lessonTitle: lessonTitleFor(nodeId),
          // A placed building is already on the island → shown as Built, and never
          // locked; prerequisite locking only gates still-unbuilt buildings.
          built: placed,
          locked: !placed && missing.length > 0,
          missingPrereqNames: missing.map((prereq) => buildingName(prereq)),
        },
      ];
    });
  }, [skills, placedNodeIds, skillIds, completedNodeIds, eraId]);

  const placedBuildings = useMemo(
    () => skills.filter((b) => placedNodeIds.has(b.node_id)),
    [skills, placedNodeIds],
  );

  // The diagnostic-unlock reward popup's two card grids, derived over THIS ISLAND'S
  // ROSTER — `buildMenuEntries`, which is `viewModel.buildings` in teaching order, i.e.
  // this era's nodes and every earlier era's (`@cr/game`'s `cityRosterNodeIds`). So the
  // grids and the build menu the CTA opens show the same buildings, which they did not
  // when this read `D1_NODE_IDS`: that list is the diagnostic's old six, and in era two it
  // would have shown era one's cards over an eleven-building island.
  //
  // It is NOT the instrument's twenty-node scope, and `UnlockCelebration`'s header records
  // the two reasons (a live `<Canvas>` per card against ~16 WebGL contexts a page, and
  // eight of the twenty having no building name). The headline's own numbers come from the
  // placement instead, which is what makes the grids free to be the island's:
  //   • skips  = island buildings the pretest freed (placement >= 2)
  //   • learns = the island's remaining buildings
  // Each card carries its resolved topic name (skillNames) + building name.
  const rewardBuildingFor = useCallback(
    (nodeId: string): RewardBuilding => ({
      nodeId,
      topic: skillDisplayName(nodeId),
      building: buildingName(nodeId),
    }),
    [],
  );
  // Watch the LOCKED set for buildings whose prerequisites just became satisfied.
  // A node LEAVING that set is the unlock moment, so it earns the celebratory
  // popup. The first observation only seeds the baseline, so a city that loads with
  // buildings already unlocked — including a diagnostic test-out, which owns its own
  // reward screen (`UnlockCelebration`) — never fires this on entry. `freed` keeps
  // the teaching order because `buildMenuEntries` is already in it.
  const prevLockedRef = useRef<{
    readonly eraId: EraId;
    readonly nodeIds: ReadonlySet<string>;
    readonly settling: boolean;
  } | null>(null);
  useEffect(() => {
    const locked = new Set(
      buildMenuEntries.filter((entry) => entry.locked).map((entry) => entry.nodeId),
    );
    const previous = prevLockedRef.current;
    if (!previous) {
      prevLockedRef.current = { eraId, nodeIds: locked, settling: false };
      return;
    }
    if (previous.eraId !== eraId) {
      prevLockedRef.current = { eraId, nodeIds: locked, settling: true };
      // A landfall replaces the build-menu population. Its already-standing buildings are
      // not unlock events, even when the island being left held the same shared skill as an
      // unplaced locked card. The first render after the era store moves still holds the old
      // island's async load, so mark it settling rather than accepting that mixed frame as the
      // baseline. Drop any modal left over from the old era at the same boundary.
      setNewlyUnlocked((held) => (held.length === 0 ? held : []));
      return;
    }
    if (previous.settling) {
      // `refresh()` has now handed the destination layout to this era. This is the baseline;
      // only the next locked -> ready transition on the same island is an unlock event.
      prevLockedRef.current = { eraId, nodeIds: locked, settling: false };
      return;
    }
    prevLockedRef.current = { eraId, nodeIds: locked, settling: false };
    const freed = buildMenuEntries
      .filter((entry) => !entry.locked && previous.nodeIds.has(entry.nodeId))
      .map((entry) => rewardBuildingFor(entry.nodeId));
    if (freed.length > 0 && !suppressAchievementNotes) {
      setNewlyUnlocked(freed);
      if (!reducedMotion) {
        playSfx("building-unlocked");
      }
      // The unlock celebration is a MODAL popup; the building lesson menu is a
      // NON-modal anchored popup. If a building unlocks while a lesson menu is open
      // (e.g. advancing a prerequisite from the dev panel with a menu up), close the
      // menu so the two never overlap or fight for focus — the celebration wins.
      setLessonPopupNodeId(null);
    }
  }, [buildMenuEntries, eraId, rewardBuildingFor, reducedMotion, suppressAchievementNotes]);

  const unlockedSet = useMemo(() => new Set(pretestUnlocked), [pretestUnlocked]);
  const islandRosterNodeIds = useMemo(
    () => buildMenuEntries.map((entry) => entry.nodeId),
    [buildMenuEntries],
  );
  const skipRewards = useMemo(
    () =>
      islandRosterNodeIds
        .filter((nodeId) => unlockedSet.has(nodeId))
        .map(rewardBuildingFor),
    [islandRosterNodeIds, unlockedSet, rewardBuildingFor],
  );
  const learnRewards = useMemo(
    () =>
      islandRosterNodeIds
        .filter((nodeId) => !unlockedSet.has(nodeId))
        .map(rewardBuildingFor),
    [islandRosterNodeIds, unlockedSet, rewardBuildingFor],
  );

  // The ghost model. PLACING a fresh building shows the FINISHED (built) look so the
  // player sees exactly what they're building. MOVING shows the building's CURRENT
  // stage (site / construction / built) — a move is purely spatial and must never
  // imply a stage change — falling back to the built model if the stage can't
  // resolve. Every stage is scaled to fill the same footprint, so size is constant.
  const ghostModelUrl = useMemo(() => {
    if (!placement) {
      return null;
    }
    // The Town Hall is only ever RELOCATED (it is pre-seeded, never placed), and it is
    // always the FINISHED hall — so its move ghost previews `townhall-built`. This is
    // the ONLY place the hall's ghost appears. Fit/scaled by `GhostBuilding` through the
    // same footprint-fit + height-cap path the placed hall uses, so the ghost matches.
    if (isTownHall(placement.nodeId)) {
      return resolveEraTownHall(eraId, CURRENT_ERA_ID).model?.url ?? null;
    }
    // A BOUGHT CIVIC BUILDING resolves through its own registry, and its id is the reason
    // it has to: a civic placement carries the synthetic `civic:<type>:preview` id
    // (`civic.ts`), which `resolveBuildingModel` cannot know — it reads `NUM.*` keys and
    // the hub sentinel. Without this branch the memo answered `null` for every civic row
    // and `CityScene` drew no ghost at all, so the learner dragged an invisible building.
    //
    // ALWAYS THE `built` STAGE, for BOTH place and move, and that is not the skill lane's
    // "show the finished look" convention being copied: it is the only stage that exists.
    // The eight early civic stages were deleted (`d9328f8`), and `resolveCivicModel` answers
    // a `site` or `construction` request with a neutral procedural stand-in carrying
    // `url: null` rather than an error — which here would have meant a grey placeholder
    // that reads as a broken model. A civic building also has no lesson and so no
    // construction phases to climb (see `scenePlaced`), so its current stage IS `built`
    // and a move previews exactly what is standing.
    const ghostCivicType = civicTypeOf(placement.nodeId);
    if (ghostCivicType !== null) {
      return resolveCivicModel(ghostCivicType, "built")?.url ?? null;
    }
    if (placement.mode === "move") {
      const building = buildingByNode.get(placement.nodeId);
      const stage = building ? buildStageFor(building.construction_state) : "built";
      return (
        resolveBuildingModel(placement.nodeId, stage)?.url ??
        resolveBuildingModel(placement.nodeId, "built")?.url ??
        null
      );
    }
    return resolveBuildingModel(placement.nodeId, "built")?.url ?? null;
    // `eraId` for the hub branch above: the move ghost has to preview the era's OWN hall,
    // or relocating it after an advance shows the learner the previous era's building.
  }, [placement, buildingByNode, eraId]);

  // `null` = a spot that may be committed; otherwise the reason it is refused, which
  // both the visible bar and the live region name (never colour alone).
  const placementRefusalNow = useMemo(
    () => (placement ? refusalFor(placement) : "bounds"),
    [placement, refusalFor],
  );
  const placementValid = placement !== null && placementRefusalNow === null;

  const placingName = placement ? placementLabel(placement.nodeId) : "";
  const enteredBuilding = (enteredNodeId && buildingByNode.get(enteredNodeId)) || null;
  useEffect(() => {
    if (status === "ready" && viewModel && !loadAnnouncedRef.current) {
      loadAnnouncedRef.current = true;
      setPolite(cityLoadedMessage(viewModel.neighborhood_id, viewModel.storm));
    }
  }, [status, viewModel]);

  // Skill-complete juice (moderate, reduced-motion-gated): when a PLACED building
  // newly reaches "built" (complete), fire a per-building 3D bounce, a soft chime,
  // a reward-to-HUD arc, and a polite announcement. The first ready render only
  // seeds the baseline (no false celebration for pre-complete buildings).
  //
  // The baseline also carries `mastery` now, so a star being EARNED is observable
  // here too. It was not before: this ref stored only `{ complete }`, and the 3D
  // `MasteryStars` just draw whatever count the data holds. The economy used to be the
  // other candidate and never could have been — its `reportStar` re-derived every star
  // on every city load, so it fired in batches and could not tell a new star from a
  // remembered one — and it is gone entirely with the 2026-08-03 XP sunset. A rise in
  // this diff is the one honest "that star is new" signal in the app.
  useEffect(() => {
    if (!viewModel) {
      return;
    }
    const previous = prevMasteryRef.current;
    const nextBuildings = new Map(
      viewModel.buildings.map((b) => [
        b.node_id,
        {
          complete: b.complete,
          constructionState: b.construction_state,
          mastery: b.mastery,
        },
      ]),
    );
    const nextVitality = vitality
      ? {
          population: vitality.population,
          livability: vitality.livability.sustains,
          happiness: vitality.happiness.coverage,
        }
      : null;
    if (previous) {
      const completed: Array<{
        readonly building: CityBuildingView;
        readonly context: "Skill building complete" | "Mastery complete";
      }> = [];
      for (const building of viewModel.buildings) {
        if (!placedNodeIds.has(building.node_id)) {
          continue;
        }
        const was = previous.buildings.get(building.node_id);
        const newlyBuilt =
          building.construction_state === "complete" &&
          was?.constructionState !== "complete";
        const newlyComplete = building.complete && !was?.complete;
        if (newlyBuilt || newlyComplete) {
          completed.push({
            building,
            context: newlyBuilt ? "Skill building complete" : "Mastery complete",
          });
          setCelebrateTokens((tokens) => ({
            ...tokens,
            [building.node_id]: (tokens[building.node_id] ?? 0) + 1,
          }));
          setPolite(skillCompleteMessage(building));
          if (!reducedMotion) {
            playSkillChime();
          }
        }
        // A star arriving WITHOUT the building completing (mastery 1 → 2 → 3) has its
        // own note; on the completing tick the chime above already covers it, so the
        // two never stack into one loud event.
        if (
          !newlyBuilt &&
          !newlyComplete &&
          was !== undefined &&
          building.mastery > was.mastery
        ) {
          if (!reducedMotion) {
            playSfx("mastery-star");
          }
        }
      }
      if (completed.length > 0 && previous.vitality !== null && nextVitality !== null) {
        const nodeIds = completed.map(({ building }) => building.node_id).sort();
        const single = completed.length === 1 ? (completed[0] ?? null) : null;
        const completedBuildings = completed.filter(
          ({ context }) => context === "Skill building complete",
        );
        const [firstCompletedBuildingName, ...otherCompletedBuildingNames] =
          completedBuildings.map(({ building }) => buildingName(building.node_id));
        const completionHeadline =
          firstCompletedBuildingName === undefined
            ? null
            : otherCompletedBuildingNames.length === 0
              ? `${firstCompletedBuildingName} is now complete`
              : `${[firstCompletedBuildingName, ...otherCompletedBuildingNames].join(", ")} are now complete`;
        const groupKey =
          single === null
            ? `skill-completion:${nodeIds.join("|")}`
            : lessonCompleteEventId(single.building.node_id);
        completionRewards.enqueue(
          skillCompletionReward({
            id: `${groupKey}:${completed.map(({ building }) => building.mastery).join("|")}`,
            groupKey,
            context:
              completedBuildings.length > 0
                ? "Skill building complete"
                : (single?.context ?? "Mastery complete"),
            subject:
              single === null
                ? `${completed.length} buildings completed`
                : buildingName(single.building.node_id),
            headline: completionHeadline,
            before: previous.vitality,
            after: nextVitality,
          }),
        );
      }
    }
    prevMasteryRef.current = { buildings: nextBuildings, vitality: nextVitality };
  }, [viewModel, vitality, placedNodeIds, reducedMotion, completionRewards]);

  const cycleVariant = useCallback(() => {
    const index = PALETTE_VARIANTS.indexOf(variantRef.current);
    const nextVariant = PALETTE_VARIANTS[(index + 1) % PALETTE_VARIANTS.length] ?? "day";
    setVariant(nextVariant);
    setPolite(lightingMessage(nextVariant));
  }, []);

  const focusPlacement = useCallback(
    (placementId: string) => {
      const transform = occupantById.get(placementId);
      const controls = controlsRef.current;
      if (transform && controls) {
        const center = transformCenter(transform, footprintFor(placementId));
        controls.target.x = center.x;
        controls.target.y = layout.cameraTarget[1];
        controls.target.z = center.z;
        controls.update();
      }
    },
    [layout, occupantById],
  );
  const focusSkill = focusPlacement;
  const focusSuccessionPlacement = useCallback(
    (placementId: string | null) => {
      const controls = controlsRef.current;
      if (!controls) {
        return false;
      }
      const overview = placementId === SUCCESSION_CITY_OVERVIEW;
      const transform =
        placementId === null || overview ? null : occupantById.get(placementId);
      const overviewCenters = overview
        ? [...occupantById.values()].map((occupant) =>
            transformCenter(occupant, footprintFor(occupant.nodeId)),
          )
        : [];
      const target =
        overview && overviewCenters.length > 0
          ? {
              x:
                overviewCenters.reduce((total, center) => total + center.x, 0) /
                overviewCenters.length,
              y: layout.cameraTarget[1],
              z:
                overviewCenters.reduce((total, center) => total + center.z, 0) /
                overviewCenters.length,
            }
          : transform === null || transform === undefined
            ? {
                x: layout.cameraTarget[0],
                y: layout.cameraTarget[1],
                z: layout.cameraTarget[2],
              }
            : (() => {
                const center = transformCenter(transform, footprintFor(transform.nodeId));
                return { x: center.x, y: layout.cameraTarget[1], z: center.z };
              })();
      const dx = controls.object.position.x - controls.target.x;
      const dy = controls.object.position.y - controls.target.y;
      const dz = controls.object.position.z - controls.target.z;
      const held = Math.hypot(dx, dy, dz) || 1;
      const wanted =
        placementId === null
          ? layout.cameraDistance
          : Math.max(
              controls.minDistance,
              Math.min(
                controls.maxDistance,
                layout.cameraDistance * (overview ? 0.52 : 0.34),
              ),
            );
      const fromTarget = { ...controls.target };
      const fromPosition = { ...controls.object.position };
      const toPosition = {
        x: target.x + (dx / held) * wanted,
        y: target.y + (dy / held) * wanted,
        z: target.z + (dz / held) * wanted,
      };
      const apply = (progress: number) => {
        controls.target.x = fromTarget.x + (target.x - fromTarget.x) * progress;
        controls.target.y = fromTarget.y + (target.y - fromTarget.y) * progress;
        controls.target.z = fromTarget.z + (target.z - fromTarget.z) * progress;
        controls.object.position.x =
          fromPosition.x + (toPosition.x - fromPosition.x) * progress;
        controls.object.position.y =
          fromPosition.y + (toPosition.y - fromPosition.y) * progress;
        controls.object.position.z =
          fromPosition.z + (toPosition.z - fromPosition.z) * progress;
        controls.update();
      };
      if (reducedMotion || typeof requestAnimationFrame !== "function") {
        apply(1);
        return true;
      }
      if (successionCameraFrameRef.current !== null) {
        cancelAnimationFrame(successionCameraFrameRef.current);
      }
      let began: number | null = null;
      const move = (time: number) => {
        began ??= time;
        const progress = Math.min(1, (time - began) / 720);
        apply(1 - (1 - progress) ** 3);
        if (progress < 1) {
          successionCameraFrameRef.current = requestAnimationFrame(move);
        } else {
          successionCameraFrameRef.current = null;
        }
      };
      successionCameraFrameRef.current = requestAnimationFrame(move);
      return true;
    },
    [layout, occupantById, reducedMotion],
  );

  const selectSkill = useCallback(
    (nodeId: string, focus = false) => {
      setSelectedNodeId(nodeId);
      const building = buildingByNode.get(nodeId) ?? null;
      const placed = placedNodeIds.has(nodeId);
      setPolite(skillSelectionMessage(nodeId, building, placed));
      if (focus) {
        focusSkill(nodeId);
      }
    },
    [buildingByNode, placedNodeIds, focusSkill],
  );

  /* ---------------------------------------------------------------------- */
  /* Consolidated HUD surfaces: ☰ Menu + Town status                         */
  /* ---------------------------------------------------------------------- */

  const setPreMountedPresenterMenuVisible = useCallback((visible: boolean) => {
    const menu = document.getElementById("city-menu-popover");
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    menu.hidden = !visible;
    menu.inert = !visible;
    menu.style.display = visible ? "" : "none";
    document.body.classList.toggle("presenter-menu-open", visible);
    menuBtnRef.current?.setAttribute("aria-expanded", String(visible));
    if (visible) {
      menu
        .querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
        ?.focus();
    }
  }, []);
  const toggleMenu = useCallback(() => {
    if (presenterMenuTools !== undefined) {
      const menu = document.getElementById("city-menu-popover");
      const visible = menu instanceof HTMLElement && !menu.hidden;
      if (presenterMenuCommitTimerRef.current !== null) {
        window.clearTimeout(presenterMenuCommitTimerRef.current);
        presenterMenuCommitTimerRef.current = null;
      }
      if (visible) {
        setPreMountedPresenterMenuVisible(false);
        setMenuOpen(false);
        return;
      }
      setPreMountedPresenterMenuVisible(true);
      presenterMenuCommitTimerRef.current = window.setTimeout(() => {
        presenterMenuCommitTimerRef.current = null;
        setMenuOpen(true);
      }, 1000);
      return;
    }
    setMenuOpen((open) => !open);
  }, [presenterMenuTools, setPreMountedPresenterMenuVisible]);
  const closeMenu = useCallback(() => {
    if (presenterMenuCommitTimerRef.current !== null) {
      window.clearTimeout(presenterMenuCommitTimerRef.current);
      presenterMenuCommitTimerRef.current = null;
    }
    setPreMountedPresenterMenuVisible(false);
    setMenuOpen(false);
    menuBtnRef.current?.focus();
  }, [setPreMountedPresenterMenuVisible]);
  const toggleTown = useCallback(() => setTownOpen((open) => !open), []);
  const closeTown = useCallback(() => {
    setTownOpen(false);
    townBtnRef.current?.focus();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Build shop + free placement (CoC / Mini Cities 2 build grammar)         */
  /* ---------------------------------------------------------------------- */

  /** Set only by the onboarding civic-buildings step, so its "Open Build" shortcut lands
   * straight on the Civic tab instead of the ordinary Skill-buildings default. Cleared on
   * close so a later, ordinary Build-menu open is unaffected. */
  const [onboardingBuildCategory, setOnboardingBuildCategory] =
    useState<CityBuildEntryCategory | null>(null);

  const openShop = useCallback(() => {
    // A CRISIS HAS THE ISLAND (see `crisisHasTheIsland`). The build menu is a door into a
    // lesson as well as a shop: every placed building is a "Built" card, and activating one
    // runs `openBuiltFromShop` straight into the lesson popup.
    if (crisisHasTheIsland) {
      return;
    }
    setShopOpen(true);
    setPolite(buildMenuMessage(unplacedCount));
  }, [unplacedCount, crisisHasTheIsland]);

  const closeShop = useCallback(() => {
    setShopOpen(false);
    setOnboardingActiveSurface((surface) => (surface === "civic" ? null : surface));
    setOnboardingBuildCategory(null);
    buildBtnRef.current?.focus();
  }, []);

  const startPlacement = useCallback(
    (nodeId: string) => {
      // A CRISIS HAS THE ISLAND (see `crisisHasTheIsland`), and a placement is the one city
      // action that would take the crisis's own board away from it: `CityScene` drops the
      // winter's aim plane while `placing` is true, so a stray press here stops fires being
      // placeable with nothing on screen saying why. `winter-in-city.css` has recorded that
      // as the reason the HUD stands down since the in-city mount landed; this is the half
      // of it a stylesheet could not do.
      if (crisisHasTheIsland) {
        return;
      }
      // Only SKILL buildings are placed by the player (the hall is pre-seeded and only
      // moved, never placed). A skill is placeable once — a placed one is a no-op.
      if (placedNodeIds.has(nodeId)) {
        return;
      }
      // The seed must be a spot the player can actually confirm, reachability
      // included — `placementStartMessage` says "valid", and a ghost that opens
      // blocked would make that the one announcement no sighted user is shown.
      const spot = findOpenCell(footprintFor(nodeId), occupied, buildableRadius, 0, {
        nodeId,
        others: allOccupants,
      }) ?? {
        col: 0,
        row: 0,
        rot: 0,
      };
      setShopOpen(false);
      setSelectedNodeId(nodeId);
      setSelectedRoadTile(null);
      setPlacement({ nodeId, col: spot.col, row: spot.row, rot: spot.rot, mode: "place" });
      setPolite(placementStartMessage(placementLabel(nodeId)));
    },
    [placedNodeIds, occupied, allOccupants, buildableRadius, crisisHasTheIsland],
  );

  /**
   * Start positioning a BOUGHT civic building — the same ghost, the same drag, the same
   * arrow keys, the same refusal copy as a skill placement, because it is the same
   * machinery with a different id in it.
   *
   * AFFORDABILITY IS CHECKED HERE AND AGAIN AT THE COMMIT, and the second check is the
   * real one (`onPlaceCivic` is the authority and spends nothing when it refuses). This
   * one exists so an unaffordable card SAYS why instead of opening a ghost that cannot
   * be confirmed — the same reason `startPlacement` seeds a spot that passes
   * reachability rather than one the bar would immediately call blocked.
   */
  const startCivicPlacement = useCallback(
    (buildingId: CivicBuildingId) => {
      // A CRISIS HAS THE ISLAND. Same reasoning as `startPlacement`: this is the same ghost
      // on the same board, and the board belongs to the winter until it ends.
      if (crisisHasTheIsland) {
        return;
      }
      const option = civicOptions.find((candidate) => candidate.row.id === buildingId);
      if (option === undefined) {
        setPolite("Civic buildings for this era are not available yet. Nothing was spent.");
        return;
      }
      const { row } = option;
      if (materialAvailable !== null && materialAvailable < row.cost) {
        setPolite(
          civicUnaffordableMessage({
            name: row.name,
            cost: row.cost,
            available: materialAvailable,
            materialLabel,
          }),
        );
        return;
      }
      const nodeId = civicPreviewId(row.id);
      const spot = findOpenCell(footprintFor(nodeId), occupied, buildableRadius, 0, {
        nodeId,
        others: allOccupants,
      }) ?? { col: 0, row: 0, rot: 0 };
      setShopOpen(false);
      // `onboardingActiveSurface` deliberately STAYS "civic" through the ghost placement
      // (see `confirmPlacement`'s civic-success branch, which is what actually clears
      // this moment now): it also suspends the advisor bubble while a live surface is
      // up, so keeping it set here is what keeps the advisor out of the way of the real
      // confirm bar instead of popping back over it. `cancelPlacement` clears it if the
      // learner backs out without placing.
      setSelectedNodeId(null);
      setSelectedRoadTile(null);
      setPlacement({
        nodeId,
        col: spot.col,
        row: spot.row,
        rot: spot.rot,
        mode: "place",
        civicId: row.id,
      });
      setPolite(placementStartMessage(row.name));
    },
    [
      civicOptions,
      materialAvailable,
      materialLabel,
      occupied,
      allOccupants,
      buildableRadius,
      crisisHasTheIsland,
    ],
  );

  // Enter MOVE mode for an already-placed building: re-open the SAME placement
  // ghost, pre-seeded with the building's current transform. Deliberately kept
  // independent of the trigger (the anchored menu today) so the entry point can be
  // relocated later without touching this machinery. The building is hidden at its
  // old spot (see `scenePlaced`) with the ghost standing in; because the stored
  // placement is never mutated until confirm, Escape restores it untouched.
  const startMove = useCallback(
    (nodeId: string) => {
      // A CRISIS HAS THE ISLAND. A move is a placement wearing different copy, so it takes
      // the winter's aim plane away in exactly the way `startPlacement` describes.
      if (crisisHasTheIsland) {
        return;
      }
      // The hall relocates through the SAME move machinery as any building (D-TH9);
      // only its current transform is sourced separately (it is not a skill node). A
      // BOUGHT civic building joins on exactly that footing — not a skill node either, so
      // its transform comes from its own map, and everything after this line is shared.
      const current = isTownHall(nodeId)
        ? townHall
        : (placedByNode.get(nodeId) ?? civicByNode.get(nodeId));
      if (!current) {
        return;
      }
      setShopOpen(false);
      setLessonPopupNodeId(null);
      setSelectedNodeId(nodeId);
      setSelectedRoadTile(null);
      setPlacement({
        nodeId,
        col: current.col,
        row: current.row,
        rot: current.rot,
        mode: "move",
      });
      setPolite(moveStartMessage(placementLabel(nodeId)));
    },
    [placedByNode, civicByNode, townHall, crisisHasTheIsland],
  );

  // Where focus lands after a move ends (confirm/cancel): the building's roster
  // button (the accessible source of truth) if present, else the map viewport.
  const focusAfterMove = useCallback((nodeId: string) => {
    const target =
      (isTownHall(nodeId) ? townHallBtnRef.current : skillButtonRefs.current.get(nodeId)) ??
      viewportRef.current;
    target?.focus();
  }, []);

  const nudge = useCallback(
    (dcol: number, drow: number) => {
      setPlacement((current) => {
        if (!current) {
          return current;
        }
        // Move one fine cell per nudge (matches the per-cell snap), so keyboard
        // placement steps at the same resolution as dragging on the grid.
        const next = {
          ...current,
          col: current.col + dcol,
          row: current.row + drow,
        };
        const refusal = refusalFor(next);
        const label = placementLabel(next.nodeId);
        setPolite(
          next.mode === "move"
            ? moveStepMessage(label, refusal)
            : placementMoveMessage(label, refusal),
        );
        return next;
      });
    },
    [refusalFor],
  );

  const rotate = useCallback(() => {
    setPlacement((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current, rot: (current.rot + 1) % 4 };
      const refusal = refusalFor(next);
      const label = placementLabel(next.nodeId);
      setPolite(
        next.mode === "move"
          ? moveRotateMessage(label, next.rot, refusal)
          : placementRotateMessage(label, next.rot, refusal),
      );
      return next;
    });
  }, [refusalFor]);

  const setCell = useCallback(
    (col: number, row: number) => {
      setPlacement((current) => {
        if (!current || (current.col === col && current.row === row)) {
          return current;
        }
        const next = { ...current, col, row };
        const refusal = refusalFor(next);
        const label = placementLabel(next.nodeId);
        setPolite(
          next.mode === "move"
            ? moveStepMessage(label, refusal)
            : placementMoveMessage(label, refusal),
        );
        return next;
      });
    },
    [refusalFor],
  );

  const cancelPlacement = useCallback(() => {
    const active = placement;
    if (!active) {
      return;
    }
    const label = placementLabel(active.nodeId);
    setPlacement(null);
    if (active.civicId !== undefined) {
      // Backing out of a civic ghost without confirming: bring the advisor back (it was
      // suspended for the ghost, not dismissed) rather than leaving it hidden with no
      // surface open to explain why.
      setOnboardingActiveSurface((surface) => (surface === "civic" ? null : surface));
    }
    if (active.mode === "move") {
      // The stored placement was never mutated, so leaving move mode restores the
      // building at its original position + rotation.
      setPolite(moveCancelMessage(label));
      focusAfterMove(active.nodeId);
    } else {
      setPolite(placementCancelMessage(label));
      buildBtnRef.current?.focus();
    }
  }, [placement, focusAfterMove]);

  const confirmPlacement = useCallback(() => {
    const active = placement;
    if (!active) {
      return;
    }
    const refusal = refusalFor(active);
    if (refusal !== null) {
      // `placementLabel`, not `buildingName`: the active ghost can be the hub, whose
      // sentinel id `buildingName` cannot resolve (it falls back to the id, so this
      // announced the literal "town-hall"). Every sibling announcement in this
      // machinery already wraps the sentinel the same way.
      const label = placementLabel(active.nodeId);
      setPolite(
        active.mode === "move"
          ? moveStepMessage(label, refusal)
          : placementMoveMessage(label, refusal),
      );
      return;
    }
    const transform: PlacedTransform = {
      nodeId: active.nodeId,
      col: active.col,
      row: active.row,
      rot: active.rot,
    };
    setPlacement(null);

    // TOWN HALL: the hub is pre-seeded and only ever RELOCATED (never placed), so its
    // confirm path is purely spatial — persist the new transform and re-read, exactly
    // like any building's move. It shares the same machinery; only its transform is
    // written through the hall's own session write.
    if (isTownHall(active.nodeId)) {
      void (async () => {
        await onMoveTownHall?.(transform);
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        setSelectedNodeId(TOWN_HALL_ID);
        setPolite(moveConfirmMessage(TOWN_HALL_LABEL));
        focusAfterMove(TOWN_HALL_ID);
      })();
      return;
    }

    // CIVIC: buy it and place it, in one host call, because a spend without a building
    // and a building without a spend are both states the city must never be in. The
    // host reports which of the three things happened and the announcement says THAT —
    // never "built" over a refusal, which is the one way this could lie to a
    // screen-reader user while the canvas quietly showed nothing new.
    if (active.civicId !== undefined) {
      const row = civicCatalogueRow(active.civicId);
      if (row === null) {
        setPolite("That civic building is unavailable. Nothing was spent.");
        return;
      }
      void (async () => {
        const result = await onPlaceCivic?.(row.id, transform);
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        if (result === undefined || result.status === "built") {
          setPolite(
            civicPlacedMessage({
              name: row.name,
              cost: result?.cost ?? row.cost,
              materialLabel,
              livability: row.provides.livability,
              happiness: row.provides.happiness,
            }),
          );
          // THE CIVIC TOUR MOMENT CLEARS ON A REAL PLACEMENT, not on opening the tab
          // (which used to mark it done immediately) -- a learner could Next past the
          // step having only looked at the catalogue, never actually placing anything.
          // `onboardingActiveSurface` also has to come back down HERE: it went up when
          // the ghost was started (see `startCivicPlacement`) and nothing else clears it
          // on a SUCCESSFUL build -- `closeShop` only fires on an explicit shop close, and
          // this path never goes back through the shop. Left set, it keeps
          // `OnboardingAdvisor`'s `suspended` (`activeSurface === moment.id`) true forever,
          // which renders the whole advisor `hidden` -- the tour was still there, just
          // invisible, which is indistinguishable from having closed.
          if (onboardingActiveSurface === "civic") {
            markOnboardingActionVisited("civic");
            setOnboardingActiveSurface(null);
          }
          // Silent during the onboarding civic moment: the "Building complete" celebration
          // is a full-screen modal, and it was popping up OVER the advisor the instant a
          // learner cleared this step -- the tour looked like it had closed rather than
          // like it was still there waiting for Next. Skill placements never hit this at
          // all (only a later, separate LESSON pass grants anything for those), so civic
          // is the only placement path that needed an explicit guard.
          if (
            result?.status === "built" &&
            result.placementId !== null &&
            onboardingActiveSurface !== "civic"
          ) {
            completionRewards.enqueue(
              civicCompletionReward({
                id: result.placementId,
                groupKey: result.placementId,
                result,
                building: row,
                material: materialForEraOrThrow(eraId),
              }),
            );
          }
          if (!reducedMotion) {
            playSfx("place-building");
          }
        } else if (result.status === "insufficient_material") {
          setPolite(
            civicUnaffordableMessage({
              name: row.name,
              cost: result.cost,
              available: materialAvailable ?? 0,
              materialLabel,
            }),
          );
        } else if (result.status === "refused" && result.refusal !== null) {
          setPolite(civicRefusedMessage(row.name, result.refusal));
        } else {
          setPolite(`${row.name} could not be built. Nothing was spent.`);
        }
        buildBtnRef.current?.focus();
      })();
      return;
    }

    // CIVIC MOVE: the bought half's relocation, and it needs its own line here for the
    // same reason it needed its own session write — the generic move below calls
    // `onMoveSkill`, which is keyed on a `student_node_state` row this building has never
    // had, so a civic id handed to it is a no-op that would have left the ghost's drop
    // silently discarded. Split on the ID's class rather than on `civicType`, which only
    // a fresh PURCHASE sets (see `startCivicPlacement`); a move is seeded from what is
    // already standing and carries no type.
    //
    // Nothing is spent and no dial moves: the building is paid for, and its two capacities
    // are properties of its type, not of where it stands.
    if (active.mode === "move" && isCivicPlacement(active.nodeId)) {
      void (async () => {
        await onMoveCivic?.(active.nodeId, transform);
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        setSelectedNodeId(active.nodeId);
        // `placementLabel`, not `buildingName`: this id is not a skill node, so
        // `buildingName` would fall back to announcing the raw `civic:campfire:0`.
        setPolite(moveConfirmMessage(placementLabel(active.nodeId)));
        focusAfterMove(active.nodeId);
      })();
      return;
    }

    // MOVE: purely spatial. Persist the new transform (never a game write) and
    // re-read. Mastery / lesson state / construction stage are untouched, so the
    // building's stars + callouts simply follow it to its new spot.
    if (active.mode === "move") {
      void (async () => {
        await onMoveSkill?.(active.nodeId, transform);
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        setSelectedNodeId(active.nodeId);
        setPolite(moveConfirmMessage(buildingName(active.nodeId)));
        focusAfterMove(active.nodeId);
      })();
      return;
    }

    // PLACE: a tested-out (unlocked) or already-complete building drops in already
    // built; every other skill lays a fresh Foundation (site). Placement NEVER
    // auto-opens a lesson for ANY path — the learner clicks the building to start
    // (Foundation) or continue (Construction) it. `preBuilt` only tunes the copy.
    const placedBuilding = buildingByNode.get(active.nodeId);
    const preBuilt =
      (placedBuilding?.complete ?? false) || pretestUnlocked.includes(active.nodeId);
    void (async () => {
      await onPlaceSkill?.(active.nodeId, transform);
      await refresh();
      if (!mountedRef.current) {
        return;
      }
      // See `islandPlacements`. The onboarding gate opens on this and nothing else, so it
      // opens for a learner who found the Build menu on their own and ignored the panel.
      setIslandPlacements((count) => count + 1);
      setOnboardingSkillNodeId(active.nodeId);
      setSelectedNodeId(active.nodeId);
      setPolite(skillPlacedMessage(active.nodeId, preBuilt));
      // After the await, so the thud lands with the building actually on the grid
      // rather than with the click that requested it.
      if (!reducedMotion) {
        playSfx("place-building");
      }
      skillButtonRefs.current.get(active.nodeId)?.focus();
    })();
  }, [
    placement,
    refusalFor,
    onMoveTownHall,
    onPlaceSkill,
    onMoveSkill,
    onPlaceCivic,
    onMoveCivic,
    materialAvailable,
    materialLabel,
    refresh,
    buildingByNode,
    pretestUnlocked,
    focusAfterMove,
    reducedMotion,
    completionRewards,
    eraId,
    onboardingActiveSurface,
    markOnboardingActionVisited,
  ]);

  // ---- Road paint mode (the repeatable gold sink) ------------------------
  // Whether a cell can be APPENDED to the current draft: laying needs an empty,
  // in-bounds cell clear of buildings + existing roads; erasing marks an EXISTING
  // road for removal. Deduplicated against the draft either way.
  const roadCanAppend = useCallback(
    (draft: readonly RoadCell[], cell: RoadCell): boolean => {
      const key = roadCellKey(cell.col, cell.row);
      if (draft.some((c) => roadCellKey(c.col, c.row) === key)) {
        return false;
      }
      if (roadPaintMode === "erase") {
        return roadKeys.has(key);
      }
      return isRoadCellLayable(cell, {
        buildingCells: buildingOccupied,
        roadCells: roadKeys,
        buildableRadius,
      });
    },
    [roadPaintMode, roadKeys, buildingOccupied, buildableRadius],
  );

  const startRoadMode = useCallback(() => {
    setShopOpen(false);
    setLessonPopupNodeId(null);
    setPlacement(null);
    setSelectedNodeId(null);
    setSelectedRoadTile(null);
    const seed = findOpenCell({ w: 1, d: 1 }, occupied, buildableRadius) ?? {
      col: 0,
      row: 0,
      rot: 0,
    };
    roadSeedRef.current = { col: seed.col, row: seed.row };
    setRoadPaintMode("lay");
    setRoadDraft([]);
    setPolite(
      "Road mode. Drag across the map to trace a path; Enter builds it, Escape cancels.",
    );
    /*
      THE ACTUAL ARROW-KEY HANDLER, not `RoadPaintBar`'s Confirm. A fresh draft is always
      EMPTY (`setRoadDraft([])` above), so `RoadPaintBar`'s own mount effect — which focuses
      its Confirm button — always lands on a DISABLED button (`canConfirm` requires a
      non-empty draft) and is therefore always a no-op: focus stays wherever it was, which is
      usually the "Roads" card the shop is about to unmount. Arrow keys are read by
      `handleViewportKeyDown` on `.city-viewport` alone (`RoadPaintBar` has no arrow-key
      handling of its own — see its doc comment), so a learner whose focus never reached the
      viewport gets nothing from the first ArrowRight they press. Move focus here instead,
      synchronously with the state change that opens the draft.
    */
    viewportRef.current?.focus();
  }, [occupied, buildableRadius]);

  const paintRoadCell = useCallback(
    (col: number, row: number) => {
      setRoadDraft((draft) =>
        draft && roadCanAppend(draft, { col, row }) ? [...draft, { col, row }] : draft,
      );
    },
    [roadCanAppend],
  );

  // Keyboard tracing: each arrow extends the path one cell from its head (the first
  // press also drops the starting tile at the seed). Mirrors the drag path.
  const extendRoad = useCallback(
    (dcol: number, drow: number) => {
      setRoadDraft((draft) => {
        if (!draft) {
          return draft;
        }
        const last = draft[draft.length - 1];
        const from = last ?? roadSeedRef.current;
        const candidates: RoadCell[] = last
          ? [{ col: from.col + dcol, row: from.row + drow }]
          : [from, { col: from.col + dcol, row: from.row + drow }];
        let next = draft;
        for (const cell of candidates) {
          if (roadCanAppend(next, cell)) {
            next = [...next, cell];
          }
        }
        return next;
      });
    },
    [roadCanAppend],
  );

  const undoRoadCell = useCallback(() => {
    setRoadDraft((draft) => (draft && draft.length > 0 ? draft.slice(0, -1) : draft));
  }, []);

  const toggleRoadErase = useCallback(() => {
    setRoadPaintMode((mode) => {
      const nextMode = mode === "lay" ? "erase" : "lay";
      if (nextMode === "erase") {
        // Re-seed the keyboard trace onto an EXISTING tile: an erase draft can only
        // contain laid roads, so anchoring it at the open cell the lay mode seeded
        // would leave arrow-key erasing unable to mark anything at all.
        const first = committedRoads[0];
        if (first) {
          roadSeedRef.current = { col: first.col, row: first.row };
        }
      }
      setPolite(
        nextMode === "erase"
          ? `Erase mode. Select roads to remove. Each tile refunds ${ROAD_TILE_GOLD_COST} ${materialWord(eraId)}.`
          : "Lay mode. Trace a path to build roads.",
      );
      return nextMode;
    });
    // A lay draft and an erase draft aren't mixable, so switching resets the draft.
    setRoadDraft([]);
  }, [committedRoads, eraId]);

  const cancelRoads = useCallback(() => {
    setRoadDraft(null);
    setRoadPaintMode("lay");
    setPolite(`Road mode closed. No ${materialWord(eraId)} spent.`);
    viewportRef.current?.focus();
  }, [eraId]);

  /* ---- Picking a single laid tile (click to remove, full refund) --------- */

  // Clicking a laid tile on the island SELECTS it: the 3D layer highlights that one
  // cell and the anchored popup opens over it offering the refund. Only a cell that
  // actually carries a road can be picked (a building, the hub, and bare terrain are
  // not in `roadKeys`, and neither is anything mid-placement / mid-paint, where the
  // road layer is inert anyway) — so removal can never reach a non-road.
  const selectRoadTile = useCallback(
    (col: number, row: number) => {
      if (placement || roadDraft) {
        return;
      }
      if (!roadKeys.has(roadCellKey(col, row))) {
        return;
      }
      setLessonPopupNodeId(null);
      setSelectedNodeId(null);
      setSelectedRoadTile({ col, row });
      setPolite(
        `Road tile selected. Remove it for a full refund of ${ROAD_TILE_GOLD_COST} ${materialWord(eraId)}.`,
      );
    },
    [placement, roadDraft, roadKeys, eraId],
  );

  const closeRoadTilePopup = useCallback(() => {
    setSelectedRoadTile(null);
    viewportRef.current?.focus({ preventScroll: true });
  }, []);

  // Remove the picked tile and hand back exactly what it cost. Guarded twice against
  // a double credit: the popup closes (and the latch trips) on the FIRST click, so a
  // rapid second click has no selection left to act on, and the session refunds only
  // cells that still carry a road. The removed cell frees up for building or paving
  // again, and its neighbours re-tile from the reloaded road set.
  const removeSelectedRoadTile = useCallback(() => {
    const cell = selectedRoad;
    if (!cell || roadRemovalBusyRef.current) {
      return;
    }
    roadRemovalBusyRef.current = true;
    setSelectedRoadTile(null);
    void (async () => {
      try {
        const result = (await onRemoveRoads?.([cell])) ?? null;
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        const refunded = result ? result.refund : roadRefund(1);
        setPolite(`Road tile removed. ${refunded} ${materialWord(eraId)} refunded.`);
        if (!reducedMotion) {
          playSfx("road-remove");
        }
        viewportRef.current?.focus({ preventScroll: true });
      } finally {
        roadRemovalBusyRef.current = false;
      }
    })();
  }, [selectedRoad, onRemoveRoads, refresh, reducedMotion, eraId]);

  const confirmRoads = useCallback(() => {
    const draft = roadDraft;
    if (!draft || draft.length === 0) {
      return;
    }
    const cells = [...draft];
    if (roadPaintMode === "erase") {
      // BULK erase and the per-tile popup are the same economic action: both call
      // `onRemoveRoads`, so both refund the identical `ROAD_TILE_GOLD_COST` per tile.
      // Only the gesture differs — a fast sweep versus one deliberate tile.
      setRoadDraft(null);
      setRoadPaintMode("lay");
      void (async () => {
        const result = (await onRemoveRoads?.(cells)) ?? null;
        await refresh();
        if (mountedRef.current) {
          const removed = result ? result.removedCount : cells.length;
          const refunded = result ? result.refund : roadRefund(cells.length);
          setPolite(
            `Removed ${removed} road ${removed === 1 ? "tile" : "tiles"}. ${refunded} ${materialWord(eraId)} refunded.`,
          );
          // ONE sound per commit, not per tile: a bulk sweep of twenty tiles is a
          // single decision, and twenty overlapping ticks would be a burst of noise.
          if (removed > 0 && !reducedMotion) {
            playSfx("road-remove");
          }
          viewportRef.current?.focus();
        }
      })();
      return;
    }
    // LAY: refuse the WHOLE commit if the wallet can't cover it (never a partial
    // purchase); the confirm button is already disabled, this guards the keyboard.
    if (!roadAffordable) {
      setPolite(
        `${draft.length} ${draft.length === 1 ? "tile" : "tiles"} costs ${roadDraftCost} ${materialWord(eraId)}, which is more than your stockpile holds. Practise any skill you have built to earn more.`,
      );
      return;
    }
    setRoadDraft(null);
    void (async () => {
      const result = await onCommitRoads?.(cells);
      await refresh();
      if (!mountedRef.current) {
        return;
      }
      if (result?.status === "committed") {
        setPolite(
          `Built ${result.laidCount} road ${result.laidCount === 1 ? "tile" : "tiles"} for ${result.cost} ${materialWord(eraId)}.`,
        );
        const roadId = `road:${cells
          .map((cell) => roadCellKey(cell.col, cell.row))
          .sort()
          .join("|")}`;
        completionRewards.enqueue(
          roadCompletionReward({
            id: roadId,
            groupKey: roadId,
            result,
            material: materialForEraOrThrow(eraId),
          }),
        );
        // Only on a real commit, so the refused-purchase branch below stays silent
        // rather than sounding like something was built.
        if (!reducedMotion) {
          playSfx("road-lay");
        }
      } else {
        setPolite("Your stockpile is untouched, and the island is unchanged.");
      }
      viewportRef.current?.focus();
    })();
  }, [
    roadDraft,
    roadPaintMode,
    roadAffordable,
    roadDraftCost,
    onCommitRoads,
    onRemoveRoads,
    refresh,
    reducedMotion,
    eraId,
    completionRewards,
  ]);

  /**
   * REPAIR ONE RUIN: ask the host, refresh, and say what actually happened.
   *
   * Announced from the reported result rather than from what the button hoped for, which is
   * the same discipline the road commit keeps: a repair the stockpile could not cover
   * changed nothing, and copy that congratulated the player anyway would be worse than
   * silence. The price is quoted in every branch, because a player who cannot afford it
   * needs to know what they are saving for.
   */
  const repairRuin = useCallback(
    (target: RepairTarget) => {
      if (!onRepairRuin) {
        return;
      }
      void (async () => {
        const result = await onRepairRuin(target);
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        // `placementLabel` rather than `buildingName`, because the hall is a placement the
        // winter can ruin and is not a skill node — naming it by its sentinel id would be
        // the one repair message that read as an internal error. A civic placement goes
        // through `civicName`, which is the same lookup the popup and the build menu use.
        const what =
          target.kind === "building"
            ? placementLabel(target.nodeId)
            : target.kind === "ground"
              ? `the ground at ${target.cell.col}, ${target.cell.row}`
              : civicName(target.placementId);
        // A LIFT IS NOT A REPAIR AND IS NOT SPOKEN AS ONE. Nothing was broken: the shutters
        // went up and the building went on standing, so the verb is REOPEN throughout and
        // "is not in ruins" would be the one refusal that reads as a contradiction of the
        // panel it came from.
        const reopening = target.kind === "civic";
        setPolite(
          result.status === "repaired"
            ? reopening
              ? `Reopened ${what} for ${result.cost} ${materialWord(eraId)}.`
              : `Repaired ${what} for ${result.cost} ${materialWord(eraId)}.`
            : result.status === "insufficient_material"
              ? `${what} costs ${result.cost} ${materialWord(eraId)} to ${reopening ? "reopen" : "repair"}, and your stockpile is untouched. Practise any skill you have built and come back.`
              : result.status === "not_ruined"
                ? reopening
                  ? `${what} is already open. Nothing was spent.`
                  : `${what} is not in ruins. Nothing was spent.`
                : `${what} could not be ${reopening ? "reopened" : "repaired"}. Nothing was spent.`,
        );
      })();
    },
    [onRepairRuin, refresh, eraId],
  );

  /**
   * RECLAIM ALL THE SCARRED GROUND: one press, one announcement, one spend per cell.
   *
   * The UI aggregates and the LEDGER DOES NOT, which is the whole shape of this. Each cell is
   * still spent for under its own `repair:<damage_id>` idempotency key (`crisisRepair.ts`), so
   * a run that stops half way leaves the rest standing and re-payable and charges nobody
   * twice. A single atomic ground spend would need a new economy primitive and a damage id
   * that no crisis mints; aggregating at the surface needs neither and invents no price.
   *
   * Sequential rather than concurrent, because the stockpile is checked per spend: firing 72
   * of these at once would race the balance and could overdraw it. It STOPS at the first
   * refusal for the same reason — a wallet that has run dry will refuse the remaining 40 one
   * at a time, and a player does not need 40 identical refusals in the ledger's log.
   *
   * `not_ruined` is skipped rather than treated as a stop: it is the one refusal that spends
   * nothing and means the cell was already clear (a double press, or a stale panel).
   */
  const reclaimAllGround = useCallback(() => {
    if (!onRepairRuin) {
      return;
    }
    const cells = crisisDamage.ruined_cells.map((record) => parseRoadCellKey(record.cell));
    if (cells.length === 0) {
      return;
    }
    void (async () => {
      let cleared = 0;
      let spent = 0;
      let refused = false;
      for (const cell of cells) {
        const result = await onRepairRuin({ kind: "ground", cell });
        if (result.status === "repaired") {
          cleared += 1;
          spent += result.cost;
        } else if (result.status !== "not_ruined") {
          refused = true;
          break;
        }
      }
      await refresh();
      if (!mountedRef.current) {
        return;
      }
      const asked = cells.length;
      const bill = asked * hardWinterRepairPrices().per_cell;
      setPolite(
        cleared === asked
          ? `Reclaimed ${cleared} cell${cleared === 1 ? "" : "s"} of ground for ${spent} ${materialWord(eraId)}.`
          : cleared === 0
            ? refused
              ? `Reclaiming that ground costs ${bill} ${materialWord(eraId)}, and your stockpile is untouched. Practise any skill you have built and come back.`
              : "That ground is no longer scarred. Nothing was spent."
            : `Reclaimed ${cleared} of ${asked} cells for ${spent} ${materialWord(eraId)}. Practise any skill you have built to reclaim the rest.`,
      );
    })();
  }, [onRepairRuin, refresh, crisisDamage, eraId]);

  /**
   * **CARRY A CRISIS'S DAMAGE BACK INTO THIS CITY: record it, then RE-READ.**
   *
   * The two lines are one fix and neither is sufficient. The write has to go through the
   * session (`onCarryCrisisDamage`) so the object the island is drawn from is the object that
   * changed; the `refresh()` is what makes the change appear, because `crisisDamage` — and so
   * `ruinedNodeIds`, the roster's badges and the repair panel — are all memoised off `load`,
   * and nothing else in the winter's exit path re-reads it.
   *
   * It is AWAITED by the caller (`scarLiveCity`), so the crisis's own "leave" happens after
   * the island has taken the damage. Without that the player lands back on a city that is
   * still drawing the buildings they just lost, which is the report this fixes.
   *
   * Returns a refusal or null, which is `ScarCommit`'s shape. There is nothing to refuse: a
   * live session always has a city to write to, and that is precisely the difference from the
   * saved-blob default this replaces.
   */
  const carryCrisisDamage = useCallback(
    async (report: CrisisDamageReport): Promise<null> => {
      await onCarryCrisisDamage?.(report);
      await refresh();
      return null;
    },
    [onCarryCrisisDamage, refresh],
  );

  // Open a PLACED building's lesson popup, remembering the trigger to restore
  // focus to on close. No-op for an empty/unplaced skill or during placement.
  const openLessonPopup = useCallback(
    (nodeId: string, trigger: HTMLElement | null) => {
      /**
       * **A CRISIS HAS THE ISLAND, and this is the door the report came through.**
       *
       * The gate is HERE, at the one function that puts a lesson menu on screen, rather than
       * at any of the four controls that call it. That is deliberate: the island's click had
       * a gate of its own and the roster row did not, and the reason is simply that whoever
       * wrote the island's gate was looking at the island. Four callers reach this line — the
       * 3D map, the roster's skill rows, the roster's island-hub row, and the build menu's
       * "Built" cards — and only one of them had ever been thought about. A gate on each
       * caller is a gate a fifth caller does not get; a gate here is one a fifth caller
       * cannot miss.
       *
       * The controls are ALSO disabled while this is true, and that is not redundancy for
       * its own sake: this line is what makes the refusal true, and `disabled` is what makes
       * it legible. A row that silently swallowed a press would read as broken.
       */
      if (crisisHasTheIsland) {
        return;
      }
      // "IS IT STANDING?" — asked of all three kinds of building, because all three have
      // a popup. `placedNodeIds` is the SKILL set and a bought civic building lives in
      // `load.civic`, so testing it alone answered no for every civic id and this returned
      // before opening anything: the reason a click on one did nothing at all. Same
      // correction `selectedPlaced` already carries a few hundred lines up.
      const placed = isTownHall(nodeId)
        ? townHallPresent
        : placedNodeIds.has(nodeId) || civicByNode.has(nodeId);
      if (placement || roadDraft || !placed) {
        return;
      }
      lessonPopupReturnRef.current = trigger;
      // One anchored popup at a time: opening a building's menu drops any picked
      // road tile (and `selectRoadTile` closes this one), so they never contend.
      setSelectedRoadTile(null);
      setLessonPopupNodeId(nodeId);
    },
    [placement, roadDraft, placedNodeIds, civicByNode, townHallPresent, crisisHasTheIsland],
  );

  // Point the camera at the Town Hall (its footprint center).
  const focusTownHall = useCallback(() => {
    const controls = controlsRef.current;
    if (townHall && controls) {
      const center = transformCenter(townHall, footprintFor(TOWN_HALL_ID));
      controls.target.x = center.x;
      controls.target.y = layout.cameraTarget[1];
      controls.target.z = center.z;
      controls.update();
      // The hub is the island landmark, not another roster row. One ordinary dolly step gives
      // its plaza and silhouette a distinct inspection frame while preserving the player's
      // fixed tilt and the same zoom limits used by the camera controls.
      applyCameraAction(controls, "zoomIn");
    }
  }, [townHall, layout]);

  // Select the Town Hall (roster / map click): announce island progress + whether
  // interleaved practice is available yet.
  const selectTownHall = useCallback(
    (focus = false) => {
      setSelectedNodeId(TOWN_HALL_ID);
      setPolite(townHallSelectionMessage(completedCount, skillCount, interleavedEligible));
      if (focus) {
        focusTownHall();
      }
    },
    [completedCount, skillCount, focusTownHall],
  );

  // Activating a BUILT card in the build menu. A placed building can't be
  // re-placed, so this NEVER starts a placement — it closes the shop and opens
  // that building's lesson popup instead (focus returns to the Build button). The
  // Town Hall's Built card opens its island-hub panel rather than a lesson.
  const openBuiltFromShop = useCallback(
    (nodeId: string) => {
      setShopOpen(false);
      if (isTownHall(nodeId)) {
        selectTownHall(true);
        openLessonPopup(TOWN_HALL_ID, buildBtnRef.current);
        return;
      }
      selectSkill(nodeId, true);
      openLessonPopup(nodeId, buildBtnRef.current);
    },
    [selectSkill, selectTownHall, openLessonPopup],
  );

  const activateFromBuiltShelf = useCallback(
    (nodeId: string) => {
      if (placedNodeIds.has(nodeId)) {
        openBuiltFromShop(nodeId);
      } else {
        startPlacement(nodeId);
      }
    },
    [placedNodeIds, openBuiltFromShop, startPlacement],
  );

  const handleSkillKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const count = skills.length;
      if (count === 0) {
        return;
      }
      let nextIndex = index;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          nextIndex = (index + 1) % count;
          break;
        case "ArrowUp":
        case "ArrowLeft":
          nextIndex = (index - 1 + count) % count;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = count - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const nodeId = skills[nextIndex]?.node_id;
      if (nodeId) {
        selectSkill(nodeId);
        skillButtonRefs.current.get(nodeId)?.focus();
      }
    },
    [skills, selectSkill],
  );

  const dispatchCamera = useCallback(
    (action: CameraAction) => {
      const controls = controlsRef.current;
      if (controls) {
        applyCameraAction(controls, action, layout.islandRadius * PAN_BOUND_RATIO);
      }
    },
    [layout],
  );

  const toggleBuildingLabels = useCallback(() => {
    setBuildingLabelsVisible((current) => {
      const next = !current;
      writeBuildingLabelsVisible(next);
      return next;
    });
  }, []);

  // Close the info callout (Esc / Close) and restore focus to its trigger.
  const closeLessonPopup = useCallback(() => {
    setLessonPopupNodeId(null);
    setOnboardingActiveSurface((surface) =>
      surface === "lessons" || surface === "townhall" ? null : surface,
    );
    const ret = lessonPopupReturnRef.current;
    lessonPopupReturnRef.current = null;
    ret?.focus();
  }, []);

  const handleViewportKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Escape closes the open building callout even when focus sits on the map
      // viewport (e.g. after a mouse click on a building) rather than inside the
      // callout — so Escape always dismisses it. Placement owns Escape itself.
      if (!placement && lessonPopupNodeId && event.key === "Escape") {
        event.preventDefault();
        closeLessonPopup();
        return;
      }
      // Same for a picked road tile: Escape from the map clears the selection.
      if (!placement && !roadDraft && selectedRoad && event.key === "Escape") {
        event.preventDefault();
        closeRoadTilePopup();
        return;
      }
      if (roadDraft) {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            extendRoad(0, -1);
            return;
          case "ArrowDown":
            event.preventDefault();
            extendRoad(0, 1);
            return;
          case "ArrowLeft":
            event.preventDefault();
            extendRoad(-1, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            extendRoad(1, 0);
            return;
          case "Backspace":
          case "Delete":
            event.preventDefault();
            undoRoadCell();
            return;
          case "q":
          case "Q":
            event.preventDefault();
            dispatchCamera("rotateLeft");
            return;
          case "e":
          case "E":
            event.preventDefault();
            dispatchCamera("rotateRight");
            return;
          case "Enter":
            event.preventDefault();
            confirmRoads();
            return;
          case "Escape":
            event.preventDefault();
            cancelRoads();
            return;
          default:
            return;
        }
      }
      if (placement) {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            nudge(0, -1);
            return;
          case "ArrowDown":
            event.preventDefault();
            nudge(0, 1);
            return;
          case "ArrowLeft":
            event.preventDefault();
            nudge(-1, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            nudge(1, 0);
            return;
          case "r":
          case "R":
            event.preventDefault();
            rotate();
            return;
          case "q":
          case "Q":
            // Camera-rotate stays available during placement (distinct from R,
            // which rotates the BUILDING). Everything else stays placement-only.
            event.preventDefault();
            dispatchCamera("rotateLeft");
            return;
          case "e":
          case "E":
            event.preventDefault();
            dispatchCamera("rotateRight");
            return;
          case "Enter":
            event.preventDefault();
            confirmPlacement();
            return;
          case "Escape":
            event.preventDefault();
            cancelPlacement();
            return;
          default:
            return;
        }
      }
      const action = cameraKeyIntent(event.key);
      if (action) {
        event.preventDefault();
        dispatchCamera(action);
      }
    },
    [
      placement,
      roadDraft,
      lessonPopupNodeId,
      closeLessonPopup,
      selectedRoad,
      closeRoadTilePopup,
      nudge,
      rotate,
      confirmPlacement,
      cancelPlacement,
      extendRoad,
      undoRoadCell,
      confirmRoads,
      cancelRoads,
      dispatchCamera,
    ],
  );

  // Open a placed building's lesson at one of the three building-menu activities:
  //  - "lesson"   → teaching + CFU (or the revisit menu once practiced),
  //  - "practice" → straight into the graded practice set (resume Construction),
  //  - "infinite" → straight into Anthony's endless infinite-practice drill.
  const handleEnterLesson = useCallback(
    (building: CityBuildingView, entry: LessonEntry = "lesson") => {
      // A CRISIS HAS THE ISLAND. Its three callers all sit on the lesson popup, which cannot
      // be open while this is true — so this line is a backstop rather than a live gate, and
      // it is here because "unreachable through the surfaces we know about" is a fact about
      // today's callers and this is a fact about the behaviour.
      if (crisisHasTheIsland) {
        return;
      }
      setResumePractice(entry === "practice");
      setResumeInfinite(entry === "infinite");
      setOnboardingActiveSurface((surface) => (surface === "lessons" ? null : surface));
      onStartLesson?.(building.node_id, building.lesson_shell);
      setEnteredNodeId(building.node_id);
      setPolite(lessonEntryMessage(building));
    },
    [onStartLesson, crisisHasTheIsland],
  );

  const closeLesson = useCallback(() => {
    setResumePractice(false);
    setResumeInfinite(false);
    setEnteredNodeId((current) => {
      // Restore focus to the popup trigger if the lesson came from the popup,
      // else to the current node's list button (e.g. the place → enter path).
      const ret = lessonPopupReturnRef.current;
      lessonPopupReturnRef.current = null;
      learningReturnFocusRef.current =
        ret ??
        (current ? skillButtonRefs.current.get(current) : null) ??
        viewportRef.current;
      return null;
    });
    onActivityExit?.();
  }, [onActivityExit]);

  // Finish the taught lesson (teaching + CFU done): end the lesson and return the
  // learner to the building's select-screen CALLOUT, now showing "Continue
  // construction — complete the practice problems" as the explicit next step. The
  // Construction signal (`markLessonTaught`, via the lesson's onLessonTaught) has
  // already advanced the session synchronously, so we re-read first — the reopened
  // callout reflects Construction, and practice is one deliberate tap away (the
  // BREAK between the two separately-launched steps). Distinct from `closeLesson`
  // (plain "Back to city"), which does not reopen the callout.
  const finishLessonToCallout = useCallback(
    (nodeId: string) => {
      void (async () => {
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        setResumePractice(false);
        setResumeInfinite(false);
        setEnteredNodeId(null);
        setSelectedNodeId(nodeId);
        // A CRISIS HAS THE ISLAND: the lesson still ENDS, because leaving a learner inside a
        // scene they finished would be the worse failure, but the callout it hands back to is
        // a lesson menu and does not open over a crisis. Unreachable through today's
        // surfaces — nothing can enter a lesson while the gate is up — and gated anyway,
        // because "no caller can get here" is a fact about today's callers.
        if (!crisisHasTheIsland) {
          lessonPopupReturnRef.current =
            skillButtonRefs.current.get(nodeId) ?? viewportRef.current;
          setLessonPopupNodeId(nodeId);
        }
      })();
    },
    [refresh, crisisHasTheIsland],
  );

  // Clash-of-Clans "tap empty ground to dismiss": a click that hit no building
  // closes the open popup (and deselects). The camera stays fully interactive —
  // R3F never fires this for a pan/orbit drag, so panning keeps the popup up. No
  // trigger to restore to (the map was clicked), so focus falls back to the
  // viewport. A no-op during placement and when nothing is open.
  const handleBackgroundTap = useCallback(() => {
    if (placement) {
      return;
    }
    // A picked road tile dismisses on the same "tap away" gesture as a building
    // popup. (A click that lands ON a road stops there, so picking a tile never
    // immediately un-picks itself.)
    if (selectedRoadTile) {
      setSelectedRoadTile(null);
    }
    if (!lessonPopupNodeId) {
      return;
    }
    lessonPopupReturnRef.current = null;
    setLessonPopupNodeId(null);
    setOnboardingActiveSurface((surface) =>
      surface === "lessons" || surface === "townhall" ? null : surface,
    );
    setSelectedNodeId(null);
    viewportRef.current?.focus({ preventScroll: true });
  }, [placement, lessonPopupNodeId, selectedRoadTile]);

  // The popup's lesson action: close the popup and step into the lesson scene
  // (keeping the trigger so `closeLesson` restores focus there afterwards). A
  // Foundation / Complete building opens at teaching / the review menu; a
  // Construction building RESUMES straight in its practice set.
  const enterLessonFromPopup = useCallback(
    (building: CityBuildingView) => {
      setLessonPopupNodeId(null);
      handleEnterLesson(building, "lesson");
    },
    [handleEnterLesson],
  );

  const continueConstructionFromPopup = useCallback(
    (building: CityBuildingView) => {
      setLessonPopupNodeId(null);
      handleEnterLesson(building, "practice");
    },
    [handleEnterLesson],
  );

  // The building menu's "Infinite practice" action: close the callout and open the
  // lesson straight in Anthony's endless drill (reusing the lesson's infinite phase).
  const startInfinitePracticeFromPopup = useCallback(
    (building: CityBuildingView) => {
      setLessonPopupNodeId(null);
      handleEnterLesson(building, "infinite");
    },
    [handleEnterLesson],
  );

  // The hub panel's primary action: open the learner's persisted missed-item queue.
  const startInterleavedPractice = useCallback(() => {
    // A CRISIS HAS THE ISLAND. Reached from the hub panel, which the gate above already keeps
    // shut; kept here for the reason `handleEnterLesson` records.
    if (crisisHasTheIsland) {
      return;
    }
    setLessonPopupNodeId(null);
    setOnboardingActiveSurface((surface) => (surface === "townhall" ? null : surface));
    setInterleavedOpen(true);
    setPolite("Review mistakes opened.");
  }, [crisisHasTheIsland]);

  const closeInterleavedPractice = useCallback(() => {
    setInterleavedOpen(false);
    const ret = lessonPopupReturnRef.current;
    lessonPopupReturnRef.current = null;
    learningReturnFocusRef.current = ret ?? townHallBtnRef.current ?? viewportRef.current;
    onActivityExit?.();
  }, [onActivityExit]);

  // The building menu's "Move" action: close the callout and enter move mode for
  // this building (`startMove` closes the popup itself, but keep it explicit here).
  const moveFromPopup = useCallback(
    (building: CityBuildingView) => {
      startMove(building.node_id);
    },
    [startMove],
  );

  const removeFromPresenterPopup = useCallback(
    (nodeId: string) => {
      if (!onPresenterRemoveBuilding) {
        return;
      }
      setLessonPopupNodeId(null);
      setSelectedNodeId(null);
      void (async () => {
        const result = await onPresenterRemoveBuilding(nodeId);
        await refresh();
        if (!mountedRef.current) {
          return;
        }
        setPolite(
          result.status === "removed"
            ? `${placementLabel(nodeId)} removed from the disposable Presenter city. Learning progress was kept.`
            : `${placementLabel(nodeId)} is required island infrastructure and was not removed.`,
        );
      })();
    },
    [onPresenterRemoveBuilding, refresh],
  );

  const removeCivicFromPopup = useCallback(
    async (placementId: string): Promise<CivicRemovalResult> => {
      if (!onRemoveCivic) {
        return { placementId, status: "missing" };
      }
      try {
        const result = await onRemoveCivic(placementId);
        await refresh();
        if (mountedRef.current) {
          setLessonPopupNodeId(null);
          setSelectedNodeId(null);
          setPolite(
            `${placementLabel(placementId)} removed. Spent ${materialLabel} was not returned.`,
          );
        }
        return result;
      } catch (error: unknown) {
        await refresh();
        if (mountedRef.current) {
          setAssertive(
            `${placementLabel(placementId)} could not be deleted. It is still standing. Try again.`,
          );
        }
        throw error;
      }
    },
    [materialLabel, onRemoveCivic, refresh],
  );

  const handleAttemptStorm = useCallback(
    (storm: CityStormView) => {
      setAssertive(stormActionMessage(storm.neighborhood_id));
      const outcome = onAttemptStorm?.(storm.neighborhood_id);
      void (async () => {
        const result = await outcome;
        await refresh();
        if (result && mountedRef.current) {
          setLastStormResult(result);
          setAssertive(stormResultMessage(storm.neighborhood_id, result));
        }
      })();
    },
    [onAttemptStorm, refresh],
  );

  const openStorm = useCallback(
    (storm: CityStormView) => {
      // A CRISIS HAS THE ISLAND. The checkpoint is a full-screen encounter of practice items:
      // not the lesson popup, and the same thing about it — a learning takeover the player did
      // not ask for, arriving in the middle of a timed crisis.
      if (crisisHasTheIsland) {
        return;
      }
      setLastStormResult(null);
      setStormOpen(true);
      setPolite(stormEncounterMessage(storm.neighborhood_id));
    },
    [crisisHasTheIsland],
  );

  const closeStorm = useCallback(() => {
    setStormOpen(false);
    stormBtnRef.current?.focus();
  }, []);

  const handleDevAdvanceMastery = useCallback(
    (nodeId: string, mastery?: Mastery) => {
      void (async () => {
        await onDevAdvanceMastery?.(nodeId, mastery);
        await refresh();
        if (mountedRef.current) {
          setPolite(
            `Advanced mastery for ${placementLabel(nodeId)} (developer stand-in). Practice complete, and the city is recomputed from confirmed state.`,
          );
        }
      })();
    },
    [onDevAdvanceMastery, refresh],
  );

  // The intermediate lesson signal (Foundation → Construction): the learner finished
  // teaching + passed the CFU and is entering practice, so the building advances to
  // the Construction stage. Fired both by a real lesson (via the lesson host) AND by
  // the dev "Simulate lesson" control — the DEV lesson stand-in that STOPS at the
  // scaffold, distinct from "Advance mastery" (the practice step that completes the
  // building). A safe no-op on the server-backed path (undefined prop).
  const handleDevLessonTaught = useCallback(
    (nodeId: string) => {
      void (async () => {
        await onDevLessonTaught?.(nodeId);
        await refresh();
        if (mountedRef.current) {
          setPolite(
            `Simulated the lesson for ${placementLabel(nodeId)} (developer stand-in). It is under construction now, and the practice set completes it.`,
          );
        }
      })();
    },
    [onDevLessonTaught, refresh],
  );

  // The real progression pair, each mirroring its `handleDev…` sibling above: write back,
  // re-read, announce. They refresh through the same `refresh()` because the city is
  // recomputed from confirmed state either way — what differs is only who confirmed it.
  const handlePracticeComplete = useCallback(
    async (nodeId: string, mastery: Mastery, evidenceId: string): Promise<void> => {
      await onPracticeComplete?.(nodeId, mastery, evidenceId);
      await onPracticeReceipt?.(nodeId, mastery, evidenceId);
      await refresh();
      if (mountedRef.current) {
        setPolite(
          `Practice complete for ${placementLabel(nodeId)}. The city is recomputed from confirmed state.`,
        );
      }
    },
    [onPracticeComplete, onPracticeReceipt, refresh],
  );

  const handleLessonTaught = useCallback(
    async (nodeId: string): Promise<void> => {
      await onLessonTaught?.(nodeId);
      await refresh();
      completionRewards.enqueue(
        lessonCompletionReward({
          nodeId,
          subject: buildingName(nodeId),
        }),
      );
      if (mountedRef.current) {
        setPolite(
          `${placementLabel(nodeId)} is under construction now, and the practice set completes it.`,
        );
      }
    },
    [completionRewards, onLessonTaught, refresh],
  );

  /**
   * DEV: stand the city up in the state that fires this era's mid-era crisis, and stop.
   *
   * It places and masters the era's nodes up to its midpoint (`crisisSeed.ts`) through the
   * SAME two session writes the game uses — `onPlaceSkill`, the write `confirmPlacement`
   * makes when a ghost is dropped, and `onDevAdvanceMastery`, the existing practice
   * stand-in. Then it refreshes and does nothing else. The trigger, the announcement and
   * the advisor are the production path reading the state it left, which is the only way
   * this control is worth anything: a button that opened the advisor directly would be
   * green with the trigger deleted.
   */
  const crisisSeedPlan = useMemo(
    () =>
      crisisCapabilityEnabled && onPlaceSkill && onDevAdvanceMastery
        ? planCrisisSeed({
            eraId,
            buildableNodeIds: D1_NODE_IDS,
            placedNodeIds,
            masteredNodeIds: new Set(masteredNodeIdsFrom(load?.node_states ?? [])),
          })
        : null,
    [
      crisisCapabilityEnabled,
      eraId,
      placedNodeIds,
      load,
      onPlaceSkill,
      onDevAdvanceMastery,
    ],
  );

  const handleDevSeedCrisis = useCallback(() => {
    if (!crisisSeedPlan) {
      return;
    }
    void (async () => {
      // `occupied` and not `placements`: it is the set the placement ghost validates
      // against, so it already holds the pre-seeded Town Hall, the roads and any ground a
      // crisis scarred. A seed that dodged only the other buildings would be refused by
      // the session at the island's centre.
      const result = await runCrisisSeed(crisisSeedPlan, occupied, {
        placeSkill: (nodeId, transform) => onPlaceSkill?.(nodeId, transform),
        advanceMastery: (nodeId, mastery) => onDevAdvanceMastery?.(nodeId, mastery),
      });
      await refresh();
      if (mountedRef.current) {
        setMenuOpen(false);
        setPolite(crisisSeedMessage(crisisSeedPlan, result));
      }
    })();
  }, [crisisSeedPlan, occupied, onPlaceSkill, onDevAdvanceMastery, refresh]);

  const handleDevSetStage = useCallback(
    (nodeId: string, stage: DevBuildStage) => {
      void (async () => {
        await onDevSetStage?.(nodeId, stage);
        await refresh();
        if (mountedRef.current) {
          setPolite(
            `Set ${nodeId} to the ${DEV_STAGE_LABEL[stage]} stage (developer override). City recomputed from confirmed state.`,
          );
        }
      })();
    },
    [onDevSetStage, refresh],
  );

  /* ---------------------------------------------------------------------- */
  /* First-run onboarding: advisor, one real skill placement, read-only       */
  /* surface visits, then contextual coach-marks (onboarding/, coachmarks/).   */
  /* ---------------------------------------------------------------------- */

  /*
   * **THE ADVISOR IS WHAT FIRST-RUN ONBOARDING IS NOW, AND THE REEL IS THE REPLAY.**
   *
   * The team lead: *"the tool-tips that show at the start of the game are super dull and dont
   * give much information. start wiring up the stuff that would make the advisor display on
   * screen like he does for the crisis."* `onboarding/OnboardingAdvisor.tsx` is that, in the
   * crisis's own presentation, and it takes the slot the reel used to hold: same trigger, same
   * once-only contract, same hand-off to the coach-marks.
   *
   * **`DemoReel` is not deleted, and the reason is in the ask.** Its montage of a real building
   * actually going up is the one thing a standing advisor cannot show, and *"anything genuinely
   * useful must survive"*. So it moved from being the first thing a learner is given to being
   * opt-in behind `☰ Menu → How to play → Watch the intro again`, where it was already
   * reachable. Nothing about that route changed.
   */
  /*
   * WHICH OPTIONAL SURFACES THIS CITY HAS, for the tour and for the reference card that
   * quotes it. One object, off the same `archipelago` resolution the ☰ Menu's own bay row
   * hangs off, so a learner is never told about a door the menu does not offer them.
   */
  const tourSurfaces = useMemo<OnboardingSurfaces>(
    () => ({ bay: archipelago }),
    [archipelago],
  );
  const advisorSeenAtMountRef = useRef(
    hasSeenOnboardingAdvisor() || hasSeenOnboardingDemo(),
  );
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  /*
   * Bumped to remount `CoachMarks`, which re-reads the per-hint localStorage flags. Two callers:
   * How to play's "Show tips again" (which cleared them) and the advisor finishing (which set
   * three of them). It is declared up here with the rest of the onboarding state rather than
   * beside the panel that used to be its only caller.
   */
  const [coachResetToken, setCoachResetToken] = useState(0);
  /*
   * THE DEV REPLAY TOKEN. `OnboardingAdvisor` seeds its step from storage once, as lazy initial
   * state, so opening it at a chosen moment is a REMOUNT rather than a prop: the control writes
   * the step and bumps this, exactly as "Show tips again" remounts `CoachMarks` on
   * `coachResetToken`. A non-zero token also forces the sequence up past its own seen-flag,
   * because a replay is a request rather than a first run.
   */
  const [onboardingReplayToken, setOnboardingReplayToken] = useState(0);
  const onboardingAdvisorActive =
    enableOnboardingDemo &&
    !plagueInCity &&
    status === "ready" &&
    (onboardingReplayToken > 0 ||
      (pretestUnlocked.length === 0 &&
        !advisorSeenAtMountRef.current &&
        !onboardingDismissed));
  /*
   * Finish/Skip/Escape. The component has already written its own seen-flag, so the unmount is
   * most of the job and it hands off to the coach-marks (`coachActive` opens once the advisor is
   * gone).
   *
   * **WHAT THE OUTCOME DECIDES is whether the hints he took over are retired**, and the split is
   * the honest one: a learner who WALKED the moments has been told how to place a building, so
   * `place`, `learn` and `build` firing afterwards would be the same instruction in a duller
   * voice. A learner who SKIPPED has been told nothing, so those three stay as the fallback and
   * the old behaviour is exactly what they get. See `ONBOARDING_TAUGHT_COACH_MARKS`.
   */
  const endOnboardingAdvisor = useCallback((outcome: "walked" | "skipped") => {
    if (outcome === "walked") {
      for (const id of onboardingTaughtCoachMarkIds()) {
        markCoachMarkSeen(id);
      }
    }
    setOnboardingActiveSurface(null);
    setOnboardingDismissed(true);
    setOnboardingReplayToken(0);
    // Remount the hint layer so the retirements above are read back at once, rather than
    // leaving a hint on screen that storage now says has been seen.
    setCoachResetToken((token) => token + 1);
  }, []);
  const replayOnboardingAdvisor = useCallback((fromStep: number) => {
    forgetOnboardingAdvisor();
    saveOnboardingAdvisorStep(fromStep);
    setOnboardingActionVisits(EMPTY_ONBOARDING_ACTION_VISITS);
    setOnboardingActiveSurface(null);
    setOnboardingDismissed(false);
    setOnboardingReplayToken((token) => token + 1);
  }, []);

  /**
   * **"PLACE ONE FOR ME": THE ESCAPE HATCH ON THE ONE GATED MOMENT, and it places a real
   * building.**
   *
   * The placement moment is now the city's own flow rather than a board in a speech bubble,
   * which is what the product lead asked for and is also a longer road: open a menu, read
   * cards, choose one, aim a ghost, confirm. A learner who cannot walk it must not be stuck at
   * the front door of a demo, so the tutorial offers to walk it for them.
   *
   * **It is the same write, not a shortcut past it.** The building is chosen the way the menu
   * would offer it (teaching order, first card that is neither placed nor prerequisite-locked)
   * and seated the way `startPlacement` seeds a ghost (`findOpenCell` with reachability, so
   * the spot is one the confirm bar would have accepted). Then it calls `onPlaceSkill` and
   * `refresh`, which is precisely what `confirmPlacement` does. The learner ends up with the
   * building they would have had, in a spot they could have chosen, and the gate opens through
   * `islandPlacements` like any other placement.
   *
   * It refuses in exactly the cases the real flow refuses: a crisis holding the island, and no
   * unlocked card to place. Both leave the gate shut, which is correct — Skip is one press
   * away and is never gated.
   */
  const placeFirstBuildingForLearner = useCallback(() => {
    if (crisisHasTheIsland) {
      return;
    }
    const entry = buildMenuEntries.find((row) => !row.built && !row.locked);
    if (!entry) {
      return;
    }
    const spot = findOpenCell(footprintFor(entry.nodeId), occupied, buildableRadius, 0, {
      nodeId: entry.nodeId,
      others: allOccupants,
    });
    if (!spot) {
      return;
    }
    void (async () => {
      await onPlaceSkill?.(entry.nodeId, {
        nodeId: entry.nodeId,
        col: spot.col,
        row: spot.row,
        rot: spot.rot,
      });
      await refresh();
      if (!mountedRef.current) {
        return;
      }
      setIslandPlacements((count) => count + 1);
      setOnboardingSkillNodeId(entry.nodeId);
      setPolite(skillPlacedMessage(entry.nodeId, false));
    })();
  }, [
    crisisHasTheIsland,
    buildMenuEntries,
    occupied,
    buildableRadius,
    allOccupants,
    onPlaceSkill,
    refresh,
  ]);

  // The reel, now reachable ONLY from How to play's "Watch the intro again". It bypasses the
  // first-run gate entirely (the learner asked for it), and clears itself on finish/skip.
  const demoSeenAtMountRef = useRef(hasSeenOnboardingDemo());
  const [demoReplay, setDemoReplay] = useState(false);
  const demoActive = enableOnboardingDemo && status === "ready" && demoReplay;
  const endOnboardingDemo = useCallback(() => {
    markOnboardingDemoSeen();
    setDemoReplay(false);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* "How to play" — the opt-in reference card + the tutorial's replay hatch  */
  /* ---------------------------------------------------------------------- */

  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  const openHowToPlay = useCallback(() => {
    setMenuOpen(false);
    setHowToPlayOpen(true);
  }, []);
  // Closing returns focus to the ☰ button the panel was opened from.
  const closeHowToPlay = useCallback(() => {
    setHowToPlayOpen(false);
    menuBtnRef.current?.focus();
  }, []);
  /**
   * ⚑ **THE BAY (☰ Menu → The bay) — the navigation surface, behind the same `?bay` gate.**
   *
   * The row and the panel both hang off {@link archipelago}, which `archipelagoFlag.ts` makes
   * true only under `import.meta.env.DEV` AND an explicit `?bay` — neither of which the demo
   * runbook's own `?reset` URL satisfies, and the first of which every `vite build` compiles
   * to the literal `false`. So with the flag off there is no row, no panel and no import
   * reached.
   *
   * It is where the ☰ Menu's Timeline and Album rows used to be, which is not a coincidence:
   * the 2026-08-04 ruling cut both *"because the archipelago's overview screen answers 'where
   * is this going' off the same inputs the Timeline read, and its revisitable island answers
   * 'what did I build' by being the place rather than a picture of it."* This is that screen.
   */
  const [bayOpen, setBayOpen] = useState(requestedEntryKind === "bay");
  /**
   * A placement ghost belongs only to the island and activity where the player chose it.
   *
   * Presenter navigation deliberately retains this CitySurface and its canvas. That also
   * retained `placement`, `selectedNodeId`, and road-edit state unless the transition cleared
   * them explicitly, so Bay could carry a Neolithic ghost onto Prehistoric ground and reopen
   * on a blocked "Build here" bar. Ordinary Menu → Bay had the same state path. Clear all
   * uncommitted spatial edits at the shared activity boundary; committed session layout is
   * untouched, and a destination's real unbuilt card remains available through Build.
   */
  const clearTransientBuildState = useCallback(() => {
    setPlacement(null);
    setRoadDraft(null);
    setSelectedRoadTile(null);
    setSelectedNodeId(null);
    setLessonPopupNodeId(null);
    setShopOpen(false);
    setPolite("");
  }, []);
  const syncRequestedActivity = useCallback(
    (clearTransient: boolean) => {
      if (crisisHasTheIsland) {
        return;
      }
      if (clearTransient) {
        clearTransientBuildState();
      }
      setEnteredNodeId(requestedEntryNodeId);
      setResumePractice(requestedEntryKind === "practice");
      setResumeInfinite(false);
      setInterleavedOpen(requestedReview);
      setBayOpen(requestedEntryKind === "bay");
      setLessonPopupNodeId(null);
      setTownOpen(false);
      setShopOpen(false);
      setMenuOpen(false);
    },
    [
      clearTransientBuildState,
      crisisHasTheIsland,
      requestedEntryKind,
      requestedEntryNodeId,
      requestedReview,
    ],
  );
  const requestedActivityKey = `${activityToken}:${requestedEntryKind ?? "city"}:${
    requestedEntryNodeId ?? ""
  }`;
  const syncedActivityRef = useRef<string | null>(null);
  // This reset must settle before the next frame. A passive effect can arrive after the
  // presenter has already reopened Menu following a fast era/activity switch, then close the
  // newly opened Menu as stale cleanup from the prior route.
  useLayoutEffect(() => {
    if (syncedActivityRef.current === requestedActivityKey) {
      return;
    }
    const initialSync = syncedActivityRef.current === null;
    syncedActivityRef.current = requestedActivityKey;
    syncRequestedActivity(!initialSync);
  }, [requestedActivityKey, syncRequestedActivity]);
  const openBay = useCallback(() => {
    clearTransientBuildState();
    setMenuOpen(false);
    // The diagnostic reward can leave the six WebGL build thumbnails mounted under the
    // full-screen hero. Clear every covered city panel before the one-canvas carousel mounts.
    setShopOpen(false);
    setTownOpen(false);
    setBayOpen(true);
  }, [clearTransientBuildState]);
  const closeBay = useCallback(() => {
    setBayOpen(false);
    setOnboardingActiveSurface((surface) => (surface === "bay" ? null : surface));
    menuBtnRef.current?.focus();
    onActivityExit?.();
  }, [onActivityExit]);
  const previewEra = useCallback((previewEraId: EraId) => {
    const name = getEraOrThrow(previewEraId).name;
    setPolite(
      `Viewing ${name} terrain only. No unlocking, building, settling, sailing, or saving.`,
    );
  }, []);

  /**
   * See `OnboardingAdvisor.onMomentReached`: fired on ARRIVAL at each tour moment. Only
   * the "civic" moment does anything with it — the civic-bootstrap grant needs to land
   * before the learner reads the step, not on the "Build" click that leaves it.
   */
  const onboardingMomentReached = useCallback(
    (moment: OnboardingMomentId) => {
      if (moment === "civic") {
        onOnboardingCivicMoment?.();
      }
    },
    [onOnboardingCivicMoment],
  );

  const openOnboardingAction = useCallback(
    (moment: OnboardingActionMomentId) => {
      if (moment === "lessons") {
        const nodeId =
          onboardingSkillNodeId && placedNodeIds.has(onboardingSkillNodeId)
            ? onboardingSkillNodeId
            : (placements.at(-1)?.nodeId ?? null);
        if (nodeId === null) {
          return;
        }
        setOnboardingActiveSurface(moment);
        markOnboardingActionVisited(moment);
        selectSkill(nodeId, true);
        openLessonPopup(nodeId, viewportRef.current);
        return;
      }
      if (moment === "civic") {
        setOnboardingActiveSurface("civic");
        setOnboardingBuildCategory("civic");
        // NOT marked visited here: opening the tab used to clear this moment outright,
        // which let a learner Next past it having only looked at the catalogue. It now
        // clears in `confirmPlacement`'s civic-success branch, on an actual building
        // going down -- see the comment there.
        openShop();
        return;
      }
      if (moment === "townhall") {
        if (!townHallPresent) {
          return;
        }
        setOnboardingActiveSurface("townhall");
        markOnboardingActionVisited("townhall");
        selectTownHall(true);
        openLessonPopup(TOWN_HALL_ID, viewportRef.current);
        return;
      }
      setOnboardingActiveSurface("bay");
      openBay();
    },
    [
      markOnboardingActionVisited,
      onboardingSkillNodeId,
      openBay,
      openLessonPopup,
      openShop,
      placedNodeIds,
      placements,
      selectSkill,
      selectTownHall,
      townHallPresent,
    ],
  );

  // NOT marking "civic" visited here any more: the shop opens straight onto the Civic
  // tab, so a click here is at most a RE-click of the tab already showing, never proof
  // a building went down. The real clearance is in `confirmPlacement`'s civic-success
  // branch.
  const noteOnboardingBuildCategory = useCallback((_category: string) => {}, []);

  const noteOnboardingBayNavigation = useCallback(() => {
    if (onboardingActiveSurface === "bay") {
      markOnboardingActionVisited("bay");
    }
  }, [markOnboardingActionVisited, onboardingActiveSurface]);
  /**
   * **SAIL TO AN ISLAND BEHIND THE LEARNER THROUGH THE HOST'S ONE LANDFALL.**
   *
   * The local fallback still writes the era store directly: `archipelagoSession.ts` subscribes
   * to it and swaps the ground. A composed app gets {@link onSailIsland}, though, because its
   * landfall may also persist an account pointer or keep Presenter navigation in step with the
   * island. Bypassing that callback moved the rendered Presenter city while leaving its URL on
   * the departed era; completing the next practice reconstructed that stale city.
   *
   * Close only after the host commits. A rejected durable landing therefore leaves the Bay and
   * its retry route available instead of presenting the destination before it exists.
   */
  const sailToIsland = useCallback(
    (destination: EraId) => {
      const sail = async (): Promise<void> => {
        try {
          if (onSailIsland) {
            await onSailIsland(destination);
          } else {
            setCityEra(destination);
          }
          setBayOpen(false);
          setPolite(`You are back on your ${getEraOrThrow(destination).name} island.`);
        } catch (error: unknown) {
          setAssertive(
            error instanceof Error
              ? `Could not sail: ${error.message}`
              : "Could not sail to that island.",
          );
        }
      };
      void sail();
    },
    [onSailIsland],
  );
  const openAchievements = useCallback(() => {
    setMenuOpen(false);
    setAchievementsOpen(true);
  }, []);
  const closeAchievements = useCallback(() => {
    setAchievementsOpen(false);
    menuBtnRef.current?.focus();
  }, []);

  /* The unlock exam is one net-score run. Passing founds the destination without moving the
     learner; the two explicit choice buttons are the only path that can then change standing. */
  const [unlockExamOpen, setUnlockExamOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("ending"),
  );
  const destinationEraId = nextEraId(eraId);
  const savedUnlock = destinationEraId === null ? null : loadIslandUnlockExam(eraId);
  const destinationUnlocked =
    destinationEraId !== null &&
    (archipelagoSnapshot?.islands.some((island) => island.eraId === destinationEraId) ===
      true ||
      (savedUnlock !== null && savedUnlock.phase !== "exam"));
  const openUnlockExam = useCallback(() => {
    setMenuOpen(false);
    if (nextEraId(eraId) === null) {
      if (!hasFinishedCompletionCeremony()) {
        setCompletionOpen(true);
      }
      return;
    }
    setUnlockExamOpen(true);
  }, [eraId]);
  const closeUnlockExam = useCallback(
    (notifyActivityExit = true) => {
      setUnlockExamOpen(false);
      if (notifyActivityExit) {
        onActivityExit?.();
      }
    },
    [onActivityExit],
  );
  const keepLearningHere = useCallback(() => {
    setPolite("The destination remains unlocked. You are still on this island.");
    closeUnlockExam();
  }, [closeUnlockExam]);
  const sailAfterUnlock = useCallback(
    async (destination: EraId) => {
      if (onSailIsland) {
        await onSailIsland(destination);
      } else {
        sailToIsland(destination);
      }
      playSfx("era-advance");
      // A successful Sail callback owns the new standing-island route. Replaying the old
      // activity-exit callback here would put a presenter straight back on the era just left.
      closeUnlockExam(false);
    },
    [closeUnlockExam, onSailIsland, sailToIsland],
  );
  const persistUnlockedIsland = useCallback(
    async (destination: EraId, authority?: IslandFoundingAuthority) => {
      if (onUnlockIsland === undefined) {
        // In account single-island rollback mode, the target response already atomically
        // founded the destination and Town Hall. There is no client archipelago mirror to
        // update and no second authority/layout write to invent.
        if (onRecordIslandExamResponse !== undefined) {
          setPolite(
            `${getEraOrThrow(destination).name} island is unlocked on your account. You are still on this island.`,
          );
          return;
        }
        throw new Error(
          "Island persistence is unavailable for this account. Your standing island is unchanged.",
        );
      }
      await onUnlockIsland(destination, authority);
      setPolite(
        `${getEraOrThrow(destination).name} island is unlocked. You are still on the ${
          getEraOrThrow(eraId).name
        } island.`,
      );
    },
    [eraId, onRecordIslandExamResponse, onUnlockIsland],
  );
  const closeCompletion = useCallback(() => {
    setCompletionOpen(false);
    menuBtnRef.current?.focus();
  }, []);

  /**
   * ⚑ **THE GROUND CHANGES WHEN THE ISLAND DOES — one re-read, for every way of moving.**
   *
   * Under the archipelago the era moving IS a crossing: `archipelagoSession.ts` swaps which
   * island's ground the session serves. This surface renders from `load`, which is a snapshot
   * taken at mount, so without a re-read a learner would arrive in the Neolithic and find
   * their Prehistoric buildings standing on the new island — which is precisely the *"the
   * destination is a prop"* limit #644 named and staged.
   *
   * **It is ONE effect rather than a call at each door**, and that is the point:
   * the explicit Sail choice, catch-up landing and bay ({@link sailToIsland}) all move the
   * era and nothing else, so none
   * of them needed teaching and none of them can forget.
   *
   * There is no race with the swap. `session.load()` waits on the landfall — the session's own
   * tail, which `apiCitySession.ts` established for hydration and this reuses — so a refresh
   * fired the instant the era moves reads the island being ARRIVED at, never the one being
   * left.
   *
   * Off the flag this never runs, so the single-island city re-dresses on an era change
   * exactly as it always has, with no extra read.
   */
  const standingOnRef = useRef(eraId);
  const transientBuildEraRef = useRef(eraId);
  useLayoutEffect(() => {
    if (transientBuildEraRef.current === eraId) {
      return;
    }
    transientBuildEraRef.current = eraId;
    // Bay and Presenter activity navigation clear before dispatching the landfall. This is
    // the behavior-level backstop for ceremony, catch-up, dev controls, and any host that
    // moves the era store directly: no transient edit can cross an island boundary.
    clearTransientBuildState();
  }, [clearTransientBuildState, eraId]);
  useEffect(() => {
    if (!archipelago || standingOnRef.current === eraId) {
      return;
    }
    standingOnRef.current = eraId;
    void refresh();
  }, [archipelago, eraId, refresh]);

  /* ---------------------------------------------------------------------- */
  /* THE TEST-OUT CATCH-UP — the ages the diagnostic handed over            */
  /* ---------------------------------------------------------------------- */

  /**
   * The diagnostic placement selected from the archipelago, when a learner settles one of the
   * islands their diagnostic unlocked. It overrides the initial hand-off only for that explicit
   * selection and carries the chosen era's position in the same catch-up walk.
   */
  const [archipelagoCatchUp, setArchipelagoCatchUp] = useState<{
    readonly placementByNode: Readonly<Record<string, number>>;
    readonly startAt: number;
  } | null>(null);
  const [catchUpClosed, setCatchUpClosed] = useState(false);
  // The pretest's placement IS the catch-up's seed; there is no second prop. An EMPTY
  // placement is "no pretest happened" and reads as null rather than as a placement that
  // cleared nothing — the two behave alike through `eraPlacementFromSeed` today, because an
  // empty seed hands over an empty `skipped`, but relying on that would make the mount
  // condition depend on a coincidence instead of on the fact.
  const catchUpSeed =
    archipelagoCatchUp?.placementByNode ??
    (Object.keys(pretestPlacement).length > 0 ? pretestPlacement : null);
  /**
   * Read through the REAL reader, so a dev jump and a real pretest reach the same conjunction
   * over the same evidence. A control that handed the walk a plan directly could show a
   * reviewer an age the instrument would never have handed over.
   */
  const catchUpPlacement = useMemo(
    () => (catchUpSeed === null ? null : eraPlacementFromSeed(catchUpSeed)),
    [catchUpSeed],
  );
  const settleDiagnosticIsland = useCallback(
    (selectedEraId: EraId) => {
      const placementByNode = Object.fromEntries(
        (load?.node_states ?? []).map((state) => [state.node_id, state.placement_estimate]),
      );
      const placement = eraPlacementFromSeed(placementByNode);
      const startAt = placement.skipped.indexOf(selectedEraId);
      if (startAt < 0) {
        setPolite(
          `${getEraOrThrow(selectedEraId).name} is not eligible for diagnostic settlement.`,
        );
        return;
      }
      setArchipelagoCatchUp({ placementByNode, startAt });
      setCatchUpClosed(false);
      setBayOpen(false);
    },
    [load],
  );
  /**
   * **AND IT YIELDS TO THE DIAGNOSTIC REWARD**, on the same rule the in-play unlock popup and
   * the onboarding reel already follow: two modals may not stack on first entry, and the
   * once-only reward wins because it is the sentence explaining why the learner is here.
   *
   * This was invisible until the two were fed from ONE placement. They arrived as separate
   * props, `App` set both from the same hand-off, and no test set both — so a learner who
   * tested out of the whole of era one already got the catch-up prompt drawn over the
   * celebration. Widening the instrument turns that from an edge case into the common one:
   * only era one could fire at twenty nodes, and eras one to five can fire at thirty-four.
   *
   * Dismissing the reward — "Start building", the corner close, or `Esc` — flips this open, so
   * the order is: hear what the diagnostic found, then walk the ages it handed over.
   */
  const catchUpOpen = !catchUpClosed && !unlockCelebrationOpen && catchUpPlacement !== null;

  /**
   * THE LANDING. Reported once by the walk, and this is the whole of the reject's progression
   * consequence: the age the city stands in moves, and nothing else does.
   *
   * `setCityEra` rather than `advanceCityEra`, because the landing is an absolute age rather
   * than a step — a learner who stopped in age three lands in age three however many ages the
   * diagnostic had cleared, which is exactly §10.9's *"its as if they were placed into 3"*. And
   * it is said out loud because the whole of what an age change draws is on a canvas that is
   * `aria-hidden`.
   */
  const landCatchUp = useCallback((arrived: EraId) => {
    setCityEra(arrived);
    setPolite(`Your city starts in the ${getEraOrThrow(arrived).name}.`);
  }, []);
  const closeCatchUp = useCallback(() => {
    setCatchUpClosed(true);
  }, []);
  /**
   * ⚑ **THE WALK'S WRITES, RE-READ — and without this the walk's own layout is laid out on an
   * island it cannot see.**
   *
   * Every other host write on this surface is `await onX(); await refresh()`, and the catch-up's
   * two were the exception: they called the session and nothing re-read it. That is not a
   * cosmetic staleness, because the walk's `occupants` and `placedNodeIds` props are derived
   * from `load` — so `autoPlace` laid age `N`'s roster out against an island holding only the
   * hall, the seats landed on top of ages `1..N-1`'s buildings, and `placeSkill` refused every
   * one of them SILENTLY (a refusal is a no-op, and `ringLayout` had already reported success,
   * so `onShortfall` never fired either).
   *
   * **Measured through this surface at a four-age placement, before and after:** 6 of 21 skill
   * buildings seated, and 21 of 21 with the re-read. `eraDiscSeatsTheRoster.test.tsx` reported
   * 21 of 21 throughout, because its harness hands the walk its own fresh occupants — *"this is
   * the one line of `CitySurface` these counts depend on, so it is the one line stood in for"*.
   * It was standing in for a line that was not there. `inheritedCivicsSeatedAtTheFounding
   * .test.tsx` drives the shipped surface instead, which is what closes that gap.
   *
   * One refresh per write rather than one per age: the seats of a single age are computed
   * against one occupancy snapshot and cannot collide with each other, so what has to be true is
   * only that the last of them has landed before the NEXT age is laid out — and a founding runs
   * between the two. `load()` waits on the session's own layout tail, so a refresh can never
   * read a half-committed city.
   */
  const writeThroughTheWalk = useCallback(
    async (write: () => void | Promise<void>): Promise<void> => {
      await write();
      await refresh();
    },
    [refresh],
  );
  /**
   * THE AUTO-LAYOUT'S SHORTFALL, SAID OUT LOUD.
   *
   * Measured: a deep diagnostic roster can exceed the bounded standing island. The
   * learner is not stuck — a handed-over building is `complete`, so its card stays in the
   * build menu — but a city quietly three buildings short is the kind of defect nobody notices
   * until it is on a screen in front of somebody.
   */
  const reportCatchUpShortfall = useCallback((era: EraId, unseated: readonly string[]) => {
    const count = unseated.length;
    setPolite(
      `${count} of the ${getEraOrThrow(era).name}'s buildings had no room on the island yet. ` +
        `They are waiting in the build menu whenever you want to place them.`,
    );
  }, []);
  const replayOnboardingDemo = useCallback(() => {
    setHowToPlayOpen(false);
    setDemoReplay(true);
  }, []);
  // The route the advisor's closing line promises: "Ask me again from the menu whenever you
  // like." From the beginning, because a learner asking for the tutorial back wants the whole
  // of it and not wherever they happened to stop.
  const talkToAdvisorAgain = useCallback(() => {
    setHowToPlayOpen(false);
    replayOnboardingAdvisor(0);
  }, [replayOnboardingAdvisor]);
  const restoreCoachMarks = useCallback(() => {
    resetCoachMarks();
    setCoachResetToken((token) => token + 1);
    closeHowToPlay();
    setPolite("Tips are back on. The next one appears as you play.");
  }, [closeHowToPlay]);

  // A test-out pretest shows the celebratory reward hand-off, not the tutorial; retire the
  // tutorial (mark it seen) so it can never also pop on a later, empty-city visit. Both flags,
  // because both surfaces gate on their own and a learner who took that route should meet
  // neither.
  useEffect(() => {
    if (
      enableOnboardingDemo &&
      status === "ready" &&
      pretestUnlocked.length > 0 &&
      !(demoSeenAtMountRef.current && advisorSeenAtMountRef.current)
    ) {
      markOnboardingDemoSeen();
      markOnboardingAdvisorSeen();
      demoSeenAtMountRef.current = true;
      advisorSeenAtMountRef.current = true;
    }
  }, [enableOnboardingDemo, status, pretestUnlocked.length]);

  // The live game-state signals the coach-marks read (derived from the same view
  // model the HUD uses, plus the shared wallet and the audio preference).
  // `completedNodeIds` already means "placed AND topped out".
  const coachState = useMemo<CoachState>(() => {
    const placed = skills.filter((b) => placedNodeIds.has(b.node_id));
    const anyLessonStarted = placed.some(
      (b) => b.construction_state !== "not_started" && b.construction_state !== "preview",
    );
    const anyInConstruction = placed.some(
      (b) => b.construction_state === "teaching" || b.construction_state === "practice",
    );
    return {
      placedCount: placed.length,
      anyLessonStarted,
      anyInConstruction,
      anyComplete: completedNodeIds.size > 0,
      allComplete: skills.length > 0 && completedNodeIds.size === skills.length,
      anyTestedOut: placed.some((b) => b.tested_out),
      gold: goldAvailable ?? 0,
      roadTileCount: committedRoads.length,
      interleavedEligible,
      musicOn: musicEnabled,
    };
  }, [
    skills,
    placedNodeIds,
    completedNodeIds,
    goldAvailable,
    committedRoads.length,
    musicEnabled,
  ]);

  // The HUD elements each coach-mark anchor slot resolves to. Economy remains an App
  // sibling and registers itself. Sound now lives under Menu, so its coach slot points
  // to that always-visible door instead of an off-world floating control.
  const coachAnchors = useMemo<Partial<Record<CoachAnchor, RefObject<HTMLElement | null>>>>(
    () => ({
      build: buildBtnRef,
      // "buildings" remains the semantic coach slot for the door to the roster. The roster
      // moved into Build, so both names deliberately resolve to the same persistent control.
      buildings: buildBtnRef,
      viewport: viewportRef,
      callout: calloutRef,
      townhall: townHallBtnRef,
      town: townBtnRef,
      sound: menuBtnRef,
      // The same door: Sound lives inside the Menu, and the bay is a row in it. Two names
      // for one control keeps each spotlight's intent readable where it is written.
      menu: menuBtnRef,
    }),
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* THE MID-ERA CRISIS CALL (D-CRISIS-9 / D-CRISIS-10)                       */
  /* ---------------------------------------------------------------------- */

  // The whole entry sequence, in one hook: `@cr/game` decides whether the era's trigger
  // has been crossed, `crisisCall.ts` holds the call back until the learner is free and
  // speaks the announcement, and the two components below are the notice and the advisor.
  // Nothing about it is a second code path — the dev seed in the ☰ Menu writes node states
  // and lands here exactly as a finished lesson does.
  //
  // The deferral list is the takeover set `coachActive` uses one block down, for the same
  // reason and with the same shape: a crisis that interrupted a lesson would make "not
  // being ready" into a consequence, which D-CRISIS-10 rules out in as many words.
  const crisis = useCrisisCall({
    eraId,
    nodeStates:
      crisisCapabilityEnabled && status === "ready" && !suppressCrisisCalls
        ? (load?.node_states ?? null)
        : null,
    deferred:
      demoActive ||
      // The onboarding advisor is the same character in the same presentation, so a crisis
      // arriving under it would be him interrupting himself.
      onboardingAdvisorActive ||
      enteredNodeId !== null ||
      interleavedOpen ||
      stormOpen ||
      winterInCity ||
      relayInCity ||
      (eraId === "information_age" && relayHost === null) ||
      plagueInCity ||
      unlockCelebrationOpen ||
      howToPlayOpen ||
      achievementsOpen ||
      unlockExamOpen ||
      completionOpen ||
      newlyUnlocked.length > 0,
    onAnnounce: setAssertive,
  });
  const requestedMenuBriefing = useMemo(() => {
    if (!crisisCapabilityEnabled || requestedMenuCrisis === null) {
      return null;
    }
    const crisisEraId =
      requestedMenuCrisis === "intrusion"
        ? "information_age"
        : requestedMenuCrisis === "succession"
          ? "classical"
          : resolveCrisisEra(eraId).eraId;
    return crisisBriefingForCityCrisis(eraId, crisisEraId);
  }, [crisisCapabilityEnabled, eraId, requestedMenuCrisis]);
  const autoSuccessionOpenedRef = useRef(false);
  useEffect(() => {
    if (
      !crisisCapabilityEnabled ||
      !autoOpenSuccession ||
      status !== "ready" ||
      autoSuccessionOpenedRef.current
    ) {
      return;
    }
    autoSuccessionOpenedRef.current = true;
    if (eraId !== "classical") {
      setAssertive("The Succession opens on your Classical city.");
      return;
    }
    setRequestedMenuCrisis("succession");
  }, [autoOpenSuccession, crisisCapabilityEnabled, eraId, status]);

  // Coach-marks surface only during LIVE play: ready, the tutorial gone, and no takeover
  // (placement / road draft / either Menu / storm / lesson shell / reward / How to play) up.
  // Enabled alongside the tutorial so returning learners still get the marks; each hint
  // self-gates by its own localStorage flag, so nothing shows once all are seen (or
  // once the learner has pressed "Skip tips").
  //
  // `!roadDraft` is deliberately alongside `!placement`: both are a learner mid-interaction
  // with the one keyboard handler that owns arrow keys on `.city-viewport`, and a coach-mark
  // mounting on top of either steals the DOM's attention (and, on a parked focus, the focus
  // itself — see `Tooltip`'s own mount effect) away from it. Road draft used to be the one
  // gap: starting a road left `shopOpen` false and `placement` null, so a hint that had been
  // waiting on the Build button (e.g. "roads") could newly qualify and mount pointed at a
  // button the learner had just used, right as they began tracing a path.
  const coachActive =
    enableOnboardingDemo &&
    status === "ready" &&
    !demoActive &&
    !onboardingAdvisorActive &&
    !menuOpen &&
    !placement &&
    !roadDraft &&
    !shopOpen &&
    !stormOpen &&
    !enteredNodeId &&
    !unlockCelebrationOpen &&
    !howToPlayOpen &&
    // A crisis has the island, so a coachmark about building on it is pointing at ground
    // the player cannot build on until the winter ends.
    !crisisHasTheIsland &&
    !crisis.briefingOpen;
  const learningSurfaceOpen = enteredBuilding !== null || interleavedOpen;
  const presenterBuildingStateBytes =
    presenterBuildingFocusNodeId === undefined
      ? undefined
      : JSON.stringify(
          load?.node_states.find(
            (state) => state.node_id === presenterBuildingFocusNodeId,
          ) ?? null,
        );

  return (
    <div
      className="city-surface"
      data-reduced-motion={reducedMotion}
      data-palette={variant}
      data-menu-open={menuOpen ? "true" : "false"}
      data-demo={demoActive ? "true" : undefined}
      data-learning-active={learningSurfaceOpen ? "true" : undefined}
      data-presenter-building-state-bytes={presenterBuildingStateBytes}
      // The standing island's authored land radius, exposed for spatial verification.
      data-land-radius={layout.islandRadius}
      // A crisis is on the island, so the city's own chrome stands down — see
      // `three/winter-in-city.css` for why that is correctness and not styling.
      //
      // OFF `crisisHasTheIsland` AND NOT OFF THE BOARD, which is a fix rather than a tidy-up:
      // the board is null while the winter's surface is still being fetched, on a mount whose
      // canvas is not live, and on the refusal card — three states in which the crisis is on
      // screen and the whole HUD was drawn at full strength and fully live under it. The
      // stylesheet's own comment already claimed the dimming lasted "the whole encounter".
      data-winter={crisisHasTheIsland ? "true" : undefined}
      data-succession-history={
        !successionInCity && successionBoard?.settled ? "true" : undefined
      }
      // The modal unlock exam owns focus and pointer input while it is active.
      data-island-exam={unlockExamOpen ? "true" : undefined}
    >
      {/*
        THE DOCUMENT'S FURNITURE, which the city had none of: measured on the ordinary learner
        mount at `b7bdc6d2`, 0 `main` landmarks, 0 level-one headings and no links, at all eight
        windows. So a screen-reader learner arriving in their city had nothing to jump to and no
        heading saying where they were, and a keyboard learner had to tab the whole HUD — City
        Life's three triggers, the Menu, six camera controls — to reach the map they came for.

        The link is FIRST in the surface, which is the only position that makes it a skip rather
        than one more stop, and it lands on the map itself rather than on the landmark: the map is
        the thing the learner is heading for, and it is already focusable because it is a
        keyboard-driven widget. `href` names the landmark so the target is semantic and so the
        control degrades to an anchor; the press is handled rather than followed, because a hash
        in the address bar is a history entry `returnTo.ts` would then have to validate.

        The heading is `visually-hidden` and that is not a shortcut. This city's name is DRAWN, in
        a 3D scene that is `aria-hidden` by construction (D-ERA9 / D-CIT13: the canvas carries no
        meaning, the DOM does), so there is no visible text that is the page's title and putting a
        banner over the island would be a caption for nobody. It names the island the surface is
        actually standing on, read off the standing era rather than written out.
      */}
      {/* biome-ignore lint/a11y/useValidAnchor: a real fragment link to the main landmark, whose
          press is handled so focus lands on the keyboard-driven map inside it rather than on the
          landmark, and so a hash never enters the address bar `returnTo.ts` validates. */}
      <a
        className="city-skip-link"
        href="#city-main"
        onClick={(event) => {
          event.preventDefault();
          viewportRef.current?.focus({ preventScroll: true });
        }}
      >
        Skip to the map
      </a>
      <h1 className="visually-hidden" data-testid="city-heading">
        {`Your ${getEraOrThrow(eraId).name} island`}
      </h1>
      <div className="visually-hidden" aria-live="polite" data-testid="city-live-polite">
        {polite}
      </div>
      <div
        className="visually-hidden"
        aria-live="assertive"
        role="alert"
        data-testid="city-live-assertive"
      >
        {assertive}
      </div>

      {status === "loading" && (
        <div className="city-status" role="status" data-testid="city-loading">
          Loading your neighborhood…
        </div>
      )}

      {status === "error" && (
        <div className="city-error" role="alert" data-testid="city-error">
          <p>{errorMessage}</p>
          <p className="city-error-note">
            The city stays read-only until state loads. No progress was lost.
          </p>
          <button
            type="button"
            className="city-action"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {status === "ready" && viewModel && (
        <main
          className="city-stage-full"
          id="city-main"
          data-learning-background
          inert={learningSurfaceOpen}
          aria-hidden={learningSurfaceOpen || undefined}
          hidden={learningSurfaceOpen}
        >
          {/* The 3D map is a decorative, keyboard-interactive widget; the DOM
              roster below carries all semantics. `application` is the ARIA role
              for a custom region where arrow/camera keys should reach the widget,
              so it must be focusable — hence the scoped tabindex suppression. */}
          {/* biome-ignore-start lint/a11y/noNoninteractiveTabindex: interactive 3D map widget (role=application) must be focusable for keyboard camera + placement control. */}
          <div
            className="city-viewport"
            role="application"
            tabIndex={0}
            ref={viewportRef}
            aria-label="Village map. Drag to pan and scroll to zoom, or use the arrow keys to pan, plus and minus to zoom, and 0 to recenter. Click a placed building to open its lesson. In build mode, drag on the map to move the building, the arrow keys nudge it one cell, R rotates it, Enter builds here, and Escape cancels. This 3D view is decorative; use the Built shelf inside Build to select skills and build."
            aria-roledescription="Interactive 3D village map"
            data-testid="city-viewport"
            onKeyDown={handleViewportKeyDown}
          >
            <div className="city-canvas" aria-hidden="true">
              <CityCanvasHost
                enableCanvas={enableCanvas && !bayOpen && !unlockExamOpen}
                layout={layout}
                placed={scenePlaced}
                townHall={sceneTownHall}
                citizens={citizens}
                // The seed is threaded rather than re-read in the scene so that the
                // looks the roster generated and the places the scene jitters are
                // provably drawn from ONE value (D-CIT8).
                citizenSeed={CITY_CITIZEN_SEED}
                variant={variant}
                reducedMotion={reducedMotion}
                controlsRef={controlsRef}
                showSkillLabels={buildingLabelsVisible}
                skillLabelsStandDown={successionInCity}
                presenterReferenceFraming={presenterReferenceFraming}
                presenterBuildingFocusNodeId={presenterBuildingFocusNodeId}
                {...(archipelagoMetrics ? { metricsTargetRef: viewportRef } : {})}
                onSelect={(nodeId) => {
                  // While a winter is falling on this island a building click belongs to the
                  // CRISIS — it is how "Reinforce" is aimed — and never to the city, whose
                  // lesson popup would open underneath the winter's panel.
                  if (winterBoard) {
                    winterBoard.onPickBuilding(nodeId);
                    return;
                  }
                  // Clicking a placed building (or the Town Hall) in the 3D scene
                  // opens its popup; focus returns to the (focusable) viewport on
                  // close. The hall opens its island-hub panel, not a lesson menu.
                  if (isTownHall(nodeId)) {
                    selectTownHall(false);
                  } else {
                    selectSkill(nodeId, false);
                  }
                  openLessonPopup(nodeId, viewportRef.current);
                }}
                placing={placement !== null}
                placement={
                  placement
                    ? {
                        nodeId: placement.nodeId,
                        col: placement.col,
                        row: placement.row,
                        rot: placement.rot,
                        valid: placementValid,
                      }
                    : null
                }
                ghostModelUrl={ghostModelUrl}
                onHoverCell={setCell}
                calloutAnchor={calloutAnchor}
                calloutTargetRef={calloutRef}
                onBackgroundTap={handleBackgroundTap}
                roads={committedRoads}
                roadPainting={roadDraft !== null}
                roadPreview={roadDraft ?? undefined}
                roadPreviewAffordable={roadAffordable}
                onPaintRoadCell={paintRoadCell}
                selectedRoadTile={selectedRoad}
                onSelectRoadTile={selectRoadTile}
                // The standing island's own era drives its ground and roads.
                eraId={eraId}
                ruinedNodeIds={winterBoard ? winterBoard.ruinedNodeIds : ruinedNodeIds}
                // NOT swapped for a board's set the way the ruins above are, because no
                // crisis board holds one: a suspension is durable damage the city carries,
                // so the standing set is the answer with a winter on the island and without.
                suspendedCivicIds={visibleSuspendedCivic}
                relayState={relayRenderState}
                frostStageByNodeId={winterBoard?.frostStageByNodeId}
                shieldedNodeIds={winterBoard?.shieldedNodeIds}
                reinforceCandidates={winterBoard?.reinforceCandidates}
                crisisThreatenedNodeIds={
                  successionThreatenedNodeIds ?? winterBoard?.threatenedNodeIds
                }
                // The ground a just-finished winter gave up is UNIONED with the ground a
                // previous crisis scarred, because after the thaw a scar is durable damage
                // rather than a crisis in progress: the winter's own layer stops drawing it
                // (`three/WinterInCity.tsx`) and this one takes it over, so the island can
                // revert to its ordinary dressing with the scars still on it.
                ruinedCells={scarredGround}
                winterRows={winterBoard?.rows ?? null}
                winterFires={winterBoard?.fires}
                winterFirePreviewAt={winterBoard?.firePreviewAt ?? null}
                onAimWinterCell={winterBoard?.onAimCell ?? undefined}
                crisisGround={successionBoard?.layer ?? plagueLayer}
                crisisWeather={
                  successionInCity
                    ? SUCCESSION_LIGHT
                    : relayInCity
                      ? INTRUSION_LIGHT
                      : plagueInCity
                        ? PLAGUE_LIGHT
                        : null
                }
                crisisSidePanel={successionInCity}
                crisisPanelSide={plagueInCity ? "right" : null}
                fallback={
                  <StaticCityBackdrop
                    skills={skills}
                    storm={viewModel.storm}
                    districts={viewModel.locked_districts}
                    placedNodeIds={placedNodeIds}
                    selectedNodeId={selectedNodeId}
                  />
                }
              />
            </div>
          </div>
          {/* biome-ignore-end lint/a11y/noNoninteractiveTabindex: end interactive 3D map suppression. */}

          {/* Global finishing pass: one overlay carries the gradient wash,
              a soft vignette, and a faint grain for cohesion. */}
          <div className="city-finishing" aria-hidden="true" data-testid="city-finishing" />

          <TownCapsule
            viewModel={viewModel}
            storm={viewModel.storm}
            open={townOpen}
            onToggle={toggleTown}
            onClose={closeTown}
            onEnterStorm={openStorm}
            crisisHasTheIsland={crisisHasTheIsland}
            capsuleBtnRef={townBtnRef}
            stormBtnRef={stormBtnRef}
            vitality={vitality}
          />

          <div className="hud hud-top-right">
            <div className="hud-top-right-bar">
              <button
                type="button"
                className="city-chip hud-menu-toggle"
                aria-label="Menu"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-controls="city-menu-popover"
                ref={menuBtnRef}
                onClick={toggleMenu}
              >
                <HudIcon name="menu" />
                Menu
              </button>
            </div>
            {(menuOpen || presenterMenuTools !== undefined) && (
              <MenuPopover
                id="city-menu-popover"
                open={menuOpen}
                account={account}
                onOpenSurface={(surface) => {
                  setMenuOpen(false);
                  onOpenSurface?.(surface);
                }}
                onOpenCurrentCrisis={() => {
                  setMenuOpen(false);
                  if (crisis.briefing) {
                    crisis.requestBriefing();
                  }
                }}
                onOpenSuccession={() => {
                  setMenuOpen(false);
                  setRequestedMenuCrisis("succession");
                }}
                onOpenHardWinter={() => {
                  setMenuOpen(false);
                  setRequestedMenuCrisis("hard-winter");
                }}
                onOpenIntrusion={
                  relayHost === null
                    ? undefined
                    : () => {
                        setMenuOpen(false);
                        setRequestedMenuCrisis("intrusion");
                      }
                }
                crisisPhrase={crisisPhrase}
                crisisCapabilityEnabled={crisisCapabilityEnabled}
                devBuildings={
                  presenterMenuTools
                    ? null
                    : onDevAdvanceMastery || onDevSetStage || onDevLessonTaught
                      ? placedBuildings
                      : null
                }
                onDevSimulateLesson={onDevLessonTaught ? handleDevLessonTaught : undefined}
                onDevAdvance={onDevAdvanceMastery ? handleDevAdvanceMastery : undefined}
                onDevSetStage={onDevSetStage ? handleDevSetStage : undefined}
                onDevSeedCrisis={crisisSeedPlan ? handleDevSeedCrisis : undefined}
                crisisSeedPlan={crisisSeedPlan}
                presenterTools={presenterMenuTools?.(closeMenu)}
                onHowToPlay={openHowToPlay}
                onBay={openBay}
                bayEnabled={archipelago}
                onAchievements={openAchievements}
                onCeremony={openUnlockExam}
                onClose={closeMenu}
                eraId={eraId}
                nodeStates={load?.node_states ?? []}
                destinationUnlocked={destinationUnlocked}
                inProgressExamScore={savedUnlock?.phase === "exam" ? savedUnlock.score : 0}
                eraDoorVariant={eraDoorVariant}
                variant={variant}
                onCycleVariant={cycleVariant}
              />
            )}
          </div>

          <div className="hud hud-camera-cluster">
            <CameraControls
              dispatch={dispatchCamera}
              buildingLabelsVisible={buildingLabelsVisible}
              onToggleBuildingLabels={toggleBuildingLabels}
            />
          </div>

          {/* A selected UNPLACED skill shows the quick "ready to build" card; a
              PLACED building's full detail + lesson now lives in the popup that a
              click/activation opens (see LessonPopup below). */}
          {!placement && selectedNodeId && !selectedPlaced && (
            <div className="hud hud-detail">
              <ReadyToBuildCard
                name={buildingName(selectedNodeId)}
                // A selection made before the crisis leaves this card on screen through it,
                // so its one control says it cannot act rather than swallowing the press.
                crisisHasTheIsland={crisisHasTheIsland}
                onBuild={() => startPlacement(selectedNodeId)}
              />
            </div>
          )}

          {placement && (
            <PlacementBar
              mode={placement.mode}
              name={placingName}
              rot={placement.rot}
              refusal={placementRefusalNow}
              onConfirm={confirmPlacement}
              onCancel={cancelPlacement}
              onRotate={rotate}
              onNudge={nudge}
            />
          )}

          {roadDraft !== null && (
            <RoadPaintBar
              eraId={eraId}
              mode={roadPaintMode}
              tileCount={roadDraft.length}
              cost={roadDraftCost}
              refund={roadDraftRefund}
              affordable={roadAffordable}
              goldAvailable={goldAvailable}
              onConfirm={confirmRoads}
              onCancel={cancelRoads}
              onUndo={undoRoadCell}
              onToggleErase={toggleRoadErase}
            />
          )}

          {/* WHAT A CRISIS DID, AND WHAT PUTTING IT RIGHT COSTS. Renders only over a city
              that carries damage, so an undamaged island is exactly the island it was. */}
          <CrisisRepairPanel
            eraId={eraId}
            damage={visibleCrisisDamage}
            suspensions={suspensions}
            spendable={goldAvailable}
            onRepair={onRepairRuin ? repairRuin : null}
            onReclaimGround={onRepairRuin ? reclaimAllGround : null}
            onVerifyRecord={onVerifyOverwrittenRecord ? setRecordVerification : null}
          />

          {/* THE RECOVERY MILESTONE, in the slot the panel above has just vacated — where
              the player's eyes already are, on the button they just pressed. One sentence,
              no chrome, and it takes itself away (`RECOVERY_NOTE_MS`). */}
          {recoveryNote !== null && (
            <p className="hud hud-milestone" data-testid="city-milestone">
              {recoveryNote}
            </p>
          )}

          {/* THE ACHIEVEMENT MOMENT. Top centre, clear of the chip lane on the right, the
              repair panel in the middle of it, and the dock below. It takes itself away
              (`ACHIEVEMENT_NOTE_MS`) and it carries no number. */}
          {achievementNote !== null &&
            !menuOpen &&
            !crisis.briefingOpen &&
            !crisisHasTheIsland && (
              <AchievementNote line={achievementNote} reducedMotion={reducedMotion} />
            )}

          <div className="hud hud-dock">
            {!placement && roadDraft === null && (
              /* The ONE build entry point: the menu's tab strip carries both the
                 skill buildings and Roads, so neither gets its own dock button.
                 Stays enabled even at all-built — the menu keeps every building as a
                 "Built" card, so opening it is a sensible review of the city. */
              <button
                type="button"
                className="city-build-button"
                ref={buildBtnRef}
                aria-haspopup="dialog"
                // A crisis has the island: the menu's "Built" cards are a door into the
                // lesson popup, and its buildable ones into a ghost over the crisis's board.
                disabled={crisisHasTheIsland}
                onClick={openShop}
              >
                <HudIcon name="hammer" />
                <span>Build</span>
              </button>
            )}
          </div>

          {/* Clicking a placed building (3D scene OR the Buildings roster) opens the
              advisor NPC + the three lesson entry points (Review lesson / Practice /
              Infinite practice) — the SAME revisit menu the lesson lands on — as a
              lightweight popup glued ABOVE the building (Clash-of-Clans style), NOT a
              centered modal. It lives inside the stage so the scene can project the
              building's screen position onto it every frame. */}
          {lessonPopupBuilding && !enteredBuilding && newlyUnlocked.length === 0 && (
            <BuildingLessonMenu
              key={lessonPopupBuilding.node_id}
              calloutRef={calloutRef}
              building={lessonPopupBuilding}
              ruined={ruinedNodeIds.has(lessonPopupBuilding.node_id)}
              repairCost={hardWinterRepairPrices().per_building}
              onRepair={
                onRepairRuin
                  ? () =>
                      repairRuin({
                        kind: "building",
                        nodeId: lessonPopupBuilding.node_id,
                      })
                  : null
              }
              onReviewLesson={enterLessonFromPopup}
              onPractice={continueConstructionFromPopup}
              onInfinitePractice={startInfinitePracticeFromPopup}
              onMove={moveFromPopup}
              onDelete={
                onPresenterRemoveBuilding
                  ? () => removeFromPresenterPopup(lessonPopupBuilding.node_id)
                  : null
              }
              onClose={closeLessonPopup}
              eraId={eraId}
            />
          )}

          {/* Clicking the Town Hall (3D scene OR its roster entry) opens the island
              HUB panel — NOT a lesson menu (the hall has no lesson): the island's
              completion progress and the interleaved-practice entry, the hub's primary
              action (spec §6.1, §7). Same anchored, non-modal popup mechanism as the
              building menu. */}
          {lessonPopupNodeId === TOWN_HALL_ID &&
            townHall &&
            !enteredBuilding &&
            newlyUnlocked.length === 0 && (
              <TownHallPanel
                calloutRef={calloutRef}
                eraId={eraId}
                complete={completedCount}
                total={skillCount}
                onInterleavedPractice={startInterleavedPractice}
                onMove={() => startMove(TOWN_HALL_ID)}
                onClose={closeLessonPopup}
              />
            )}

          {/* Clicking a BOUGHT civic building opens its own panel — not a lesson menu
              (it has no lesson) and not the hub's (it has no completion): what the
              purchase gives the city, plus the same Move control every other building
              carries. Same anchored, non-modal callout mechanism as the two above. */}
          {civicPopup && !enteredBuilding && newlyUnlocked.length === 0 && (
            <CivicBuildingPanel
              key={civicPopup.nodeId}
              calloutRef={calloutRef}
              nodeId={civicPopup.nodeId}
              contributions={civicPopup.contributions}
              suspended={suspendedCivic.has(civicPopup.nodeId)}
              materialLabel={materialLabel}
              onMove={() => startMove(civicPopup.nodeId)}
              onDelete={
                onRemoveCivic ? () => removeCivicFromPopup(civicPopup.nodeId) : null
              }
              onClose={closeLessonPopup}
            />
          )}

          {/* Clicking a laid road tile picks it (the 3D layer frames that one cell in
              gold) and opens this small anchored popup over it — the same non-modal
              callout chrome buildings use — offering a removal that hands the tile's
              full price back. */}
          {selectedRoad && !enteredBuilding && newlyUnlocked.length === 0 && (
            <RoadTilePopup
              eraId={eraId}
              key={roadCellKey(selectedRoad.col, selectedRoad.row)}
              calloutRef={calloutRef}
              refund={roadRefund(1)}
              onRemove={removeSelectedRoadTile}
              onClose={closeRoadTilePopup}
            />
          )}

          {/* FIRST-RUN ONBOARDING: the advisor, over the island, in the crisis's own
              presentation. The live HUD stays UP behind him, unlike the reel, and that is
              deliberate twice over now: he names the Build menu and the City life rows, and
              since the 2026-08-04 review each of those moments puts a RING round the control
              it is talking about. `anchors` is the same record `CoachMarks` resolves through,
              passed rather than re-derived so a hint and a spotlight can never point at two
              different elements. On finish/skip it unmounts and hands off to the coach-marks
              below. */}
          {onboardingAdvisorActive && (
            <OnboardingAdvisor
              /*
               * A STRING KEY, AND THE `replay-` PREFIX IS LOAD-BEARING RATHER THAN DECORATIVE.
               *
               * The key is here to RESET STATE, which is what the dev replay control needs:
               * `OnboardingAdvisor` seeds its step from storage as lazy initial state, so opening
               * it at a chosen moment is a remount.
               *
               * It was `key={onboardingReplayToken}`, and the first-run token is 0. Measured at
               * this tip, on React 19 through `@vitejs/plugin-react`'s automatic JSX runtime: a
               * NUMERIC ZERO key on this conditionally-rendered single child makes the advisor
               * mount TWICE. Two live instances in one parent, the first frozen on moment one,
               * the second appended beside it, with `CitySurface` itself rendering three times
               * and never re-rendering across the click that produced the second node. A
               * non-zero numeric key and any string key both behave correctly, so the
               * interpolation is what keeps this out of the zero case for good.
               */
              key={`replay-${onboardingReplayToken}`}
              eraId={eraId}
              // Which optional surfaces this city has, so the bay is explained only where it
              // can be opened. `bayAvailable` is the same prop the ☰ Menu's own row hangs
              // off, so the tour and the door agree by construction.
              surfaces={tourSurfaces}
              anchors={coachAnchors}
              reducedMotion={reducedMotion}
              /* THE GATE'S THREE FACTS AND ITS TWO ACTIONS. The count is what opens the
                 gate; the two booleans only decide which sentence the panel prints while
                 the learner is mid-flow. See `islandPlacements`. */
              placementCount={islandPlacements}
              buildMenuOpen={shopOpen}
              positioningOnIsland={placement !== null}
              actionVisits={onboardingActionVisits}
              activeSurface={onboardingActiveSurface}
              onOpenBuildMenu={openShop}
              onPlaceForMe={placeFirstBuildingForLearner}
              onOpenAction={openOnboardingAction}
              onMomentReached={onboardingMomentReached}
              onDone={endOnboardingAdvisor}
            />
          )}

          {/* The REEL, now opt-in: a framed, skippable "video" popup above the stage, reached
              only from How to play. The live HUD is hidden (via [data-demo]) while it plays. */}
          {demoActive && (
            <DemoReel
              enableCanvas={enableCanvas}
              reducedMotion={reducedMotion}
              onDone={endOnboardingDemo}
            />
          )}

          {/* Contextual coach-marks: small anchored, once-only hints over the live
              HUD, surfaced from real game state once the reel has handed off. */}
          <CoachMarks
            key={coachResetToken}
            active={coachActive}
            eraId={eraId}
            reducedMotion={reducedMotion}
            state={coachState}
            anchors={coachAnchors}
          />

          {/* The opt-in reference card + the only route back to the reel and the
              tips once they have been seen or skipped (☰ Menu → How to play). */}
          {howToPlayOpen && (
            <HowToPlay
              eraId={eraId}
              // The card quotes the tour, so it has to quote the tour THIS learner gets:
              // listing a bay row on a city with no bay would be the same false promise one
              // panel over.
              surfaces={tourSurfaces}
              onTalkToAdvisor={talkToAdvisorAgain}
              onWatchIntro={replayOnboardingDemo}
              onShowTips={restoreCoachMarks}
              onClose={closeHowToPlay}
            />
          )}

          {/* Achievements (☰ Menu → Achievements): the record of what this run has done,
              earned rows and invitations, and NO count of either. It is handed the earned
              SET and nothing else — no node states, no mastery, no era — because a panel
              that took a mastery could report a score, which BUILD 2 forbids. */}
          {achievementsOpen && (
            <AchievementsPanel
              earned={earnedAchievements}
              onDevFire={fireAchievement}
              onDevForget={forgetEarnedAchievements}
              onClose={closeAchievements}
            />
          )}

          {/* ⚑ THE BAY (☰ Menu → The bay) — the overview, and the only way between islands.
              `archipelago` is read once at mount from `archipelagoFlag.ts`, whose two
              conditions the demo runbook's own URL does not satisfy, so a presenter following
              it sees no row and mounts no panel.

              It is handed what the cut Timeline row was handed — node states and the standing
              era — plus `walletMaterials`, which is the one thing a map has that a list did
              not: what each island still holds. `onSailTo` is the door, and it is reached from
              an island's CARD rather than from the map, so a mis-click on a 91px circle cannot
              move the learner's whole civilization. */}
          {archipelago && bayOpen && ArchipelagoOverview && (
            <Suspense fallback={null}>
              <ArchipelagoOverview
                nodeStates={load?.node_states ?? []}
                liveEraId={eraId}
                materials={walletMaterials}
                foundedIslands={archipelagoSnapshot?.islands}
                standingIslandLayout={load ? layoutFromLoad(load) : null}
                onEnterIsland={closeBay}
                onPreviewEra={previewEra}
                presenterHome={
                  presenterAtlasHomeEraId === undefined
                    ? undefined
                    : {
                        eraId: presenterAtlasHomeEraId,
                        onReturn: sailToIsland,
                      }
                }
                {...(onboardingActiveSurface === "bay"
                  ? {
                      onNavigate: noteOnboardingBayNavigation,
                      returnLabel: "Return to tour",
                    }
                  : {
                      onSailTo: sailToIsland,
                      onSettleIsland: settleDiagnosticIsland,
                      onResetIsland,
                    })}
                onClose={closeBay}
                reducedMotion={reducedMotion}
                enableCanvas={enableCanvas}
                collectMetrics={archipelagoMetrics}
              />
            </Suspense>
          )}

          {unlockExamOpen && destinationEraId !== null && (
            <IslandUnlockExam
              eraId={eraId}
              onUnlockIsland={persistUnlockedIsland}
              onRecordResponse={onRecordIslandExamResponse}
              onSail={sailAfterUnlock}
              onKeepLearning={keepLearningHere}
              onExit={closeUnlockExam}
              returnFocusRef={menuBtnRef}
              enableCanvas={enableCanvas}
              reducedMotion={reducedMotion}
            />
          )}

          {/* THE TEST-OUT CATCH-UP. The diagnostic authorizes each prefix founding and the
              learner sees one concise Town Hall representation before choosing where to land. */}
          {catchUpOpen && catchUpPlacement !== null && (
            <CityCatchUp
              placement={catchUpPlacement}
              occupants={allOccupants}
              placedNodeIds={placedNodeIds}
              onPlaceSkill={(nodeId, transform) =>
                writeThroughTheWalk(() => onPlaceSkill?.(nodeId, transform))
              }
              onUnlockIsland={onUnlockIsland}
              onLanded={landCatchUp}
              onShortfall={reportCatchUpShortfall}
              onClose={closeCatchUp}
              startAt={archipelagoCatchUp?.startAt}
              waitingOverride={catchUpWaitingOverride}
            />
          )}

          {/* The game-completion ceremony: the retake, and what happens when its
              results come back. Opened only by the LAST era's progression finishing,
              and only once per playthrough. It is deliberately mounted here, over the
              live city, rather than as a full-screen takeover: the subject of the
              ending is the city, so the city has to be visible around it. */}
          {completionOpen && <CompletionCeremony eraId={eraId} onExit={closeCompletion} />}
        </main>
      )}

      {enteredBuilding &&
        lessonHost.render({
          nodeId: enteredBuilding.node_id,
          lessonShell: enteredBuilding.lesson_shell,
          archetypeLabel: enteredBuilding.archetype.label,
          constructionLabel: CONSTRUCTION_STATE_LABEL[enteredBuilding.construction_state],
          mastery: enteredBuilding.mastery,
          onExit: closeLesson,
          // The learner's own practice result, and the developer's skip, from the two props
          // that mean those two things. They were one prop, so un-gating the first would have
          // handed every signed-in learner the second — see `LessonHostContext.onDevComplete`.
          onPracticeComplete: onPracticeComplete
            ? (mastery: Mastery, evidenceId: string) =>
                handlePracticeComplete(enteredBuilding.node_id, mastery, evidenceId)
            : undefined,
          onDevComplete: onDevAdvanceMastery
            ? (mastery?: Mastery) =>
                handleDevAdvanceMastery(enteredBuilding.node_id, mastery)
            : undefined,
          // Foundation → Construction when the learner finishes teaching + the CFU.
          onLessonTaught: onLessonTaught
            ? () => handleLessonTaught(enteredBuilding.node_id)
            : undefined,
          // End the lesson and return to the (now Construction) building's callout,
          // where practice is the explicit next step (the break between the two).
          onFinishLesson: () => finishLessonToCallout(enteredBuilding.node_id),
          // "Practice" resumes a building straight in the graded practice set;
          // "Infinite practice" opens the endless drill. Mutually exclusive.
          resumePractice,
          resumeInfinite,
          initialTeachingStep: requestedTeachingStep,
          // The "Review lesson" entry (neither resume flag) comes FROM the city's
          // building-click menu, which already offered the three choices — so skip
          // the lesson's own identical revisit menu and open the content directly.
          skipMenu: !resumePractice && !resumeInfinite,
        })}

      {/* The Town Hall's interleaved practice: one endless session drawn ACROSS the
          era's practiced skills (the hub's whole purpose, spec §6.1). It is a
          standalone island activity, so it mounts the era drill directly rather than
          routing through the node-scoped lesson host. */}
      {interleavedOpen && (
        <WorldScene
          eyebrow={`${TOWN_HALL_LABEL} · island hub`}
          title="Review mistakes"
          tone="lesson"
          size="large"
          exitLabel="Back to city"
          onExit={closeInterleavedPractice}
        >
          <ReviewMistakes
            key={`${eraId}:${activityToken}`}
            eraId={eraId}
            onExit={closeInterleavedPractice}
          />
        </WorldScene>
      )}

      {stormOpen && viewModel && (
        <StormEncounter
          storm={viewModel.storm}
          lastResult={lastStormResult}
          onFace={handleAttemptStorm}
          onExit={closeStorm}
        />
      )}

      {shopOpen && (
        <BuildShop
          eraId={eraId}
          initialCategory={onboardingBuildCategory ?? buildEntryCategory}
          featuredLessonNodeId={presenterBuildingFocusNodeId}
          entries={buildMenuEntries}
          civicOptions={civicOptions}
          builtRoster={{
            listId: "city-built-list",
            placedCount: placedBuildings.length,
            total: skills.length,
            skills,
            placedByNode,
            selectedNodeId,
            ruinedNodeIds,
            buttonRefs: skillButtonRefs,
            onActivate: activateFromBuiltShelf,
            onKeyDown: handleSkillKeyDown,
            townHallPresent,
            townHallProgress: `${completedCount} of ${skillCount}`,
            townHallBtnRef,
            onActivateTownHall: () => openBuiltFromShop(TOWN_HALL_ID),
            crisisHasTheIsland,
            eraId,
          }}
          onChoose={startPlacement}
          onOpenBuilt={openBuiltFromShop}
          onStartRoads={startRoadMode}
          onChooseCivic={startCivicPlacement}
          onCategoryVisit={noteOnboardingBuildCategory}
          onClose={closeShop}
          showThumbnails={enableCanvas}
          goldAvailable={goldAvailable}
          materialAvailable={materialAvailable}
          materialLabel={materialLabel}
        />
      )}

      {status === "ready" && unlockCelebrationOpen && pretestUnlocked.length > 0 && (
        <UnlockCelebration
          placement={pretestPlacement}
          skips={skipRewards}
          learns={learnRewards}
          enableThumbnails={enableCanvas}
          reducedMotion={reducedMotion}
          onPlace={() => {
            setUnlockCelebrationOpen(false);
            // Through `openShop`, and not `setShopOpen` — this is the third door into the
            // build menu, and a door that sets the state itself is a door outside the
            // crisis gate that lives in `openShop`.
            openShop();
          }}
          onClose={() => setUnlockCelebrationOpen(false)}
        />
      )}

      {/* In-play unlock moment. Yields to the once-only diagnostic reward and the
          onboarding reel so two popups can never stack on first entry. */}
      {status === "ready" &&
        newlyUnlocked.length > 0 &&
        !unlockCelebrationOpen &&
        !demoActive && (
          <BuildingUnlockedPopup
            buildings={newlyUnlocked}
            enableThumbnails={enableCanvas}
            reducedMotion={reducedMotion}
            onBuild={() => {
              setNewlyUnlocked([]);
              // See `UnlockCelebration` above: the build menu has one opener, so it has one
              // crisis gate.
              openShop();
            }}
            onClose={() => setNewlyUnlocked([])}
          />
        )}

      {/* EXPLICIT MENU DOORS. Their labels select the briefing and the surface together;
          they do not dispatch through whichever crisis the live era happens to announce. */}
      {status === "ready" &&
        requestedMenuCrisis !== null &&
        requestedMenuBriefing !== null &&
        !crisisHasTheIsland && (
          <CrisisCallAdvisor
            briefing={requestedMenuBriefing}
            onFace={() => {
              const requested = requestedMenuCrisis;
              setRequestedMenuCrisis(null);
              // Answer the standing call only when it is the crisis this named door opened.
              // Information Age → Hard Winter must not consume a waiting Intrusion, and the
              // symmetrical case must not consume a waiting winter.
              if (crisis.briefing?.eraId === requestedMenuBriefing.eraId) {
                crisis.answerCall();
              }
              if (requested === "intrusion") {
                if (relayHost !== null) {
                  setRelayInCity(true);
                } else {
                  setAssertive(
                    "The Intrusion needs a Civic Archive Relay on this island before it can open.",
                  );
                }
              } else if (requested === "succession") {
                if (successionSession !== null && allOccupants.length >= 2) {
                  setSuccessionInCity(true);
                } else {
                  setAssertive(
                    "The Succession cannot open until this city has two placed buildings.",
                  );
                }
              } else {
                setWinterInCity(true);
              }
            }}
            onLater={() => setRequestedMenuCrisis(null)}
          />
        )}

      {/* THE CRISIS CALL. The notice is the crisis WAITING (D-CRISIS-10) and the advisor is
          the terms; "Face the winter" is the only thing that starts the encounter, and the
          ☰ Menu entry now reaches it through this card rather than around it, so there is
          one ritual with two ways of arriving at it.

          THE TWO BEATS ARE GATED DIFFERENTLY ON PURPOSE. The notice keeps `crisis.standing`
          because it is the crisis ANNOUNCING itself, which D-CRISIS-9 says is earned at
          `ceil(n / 2)` of the era's nodes; raising it any earlier would be the crisis
          arriving before the learner did anything. The advisor also answers the player
          ASKING, which is not earned and never was: `crisisBriefingFor` depends on the era
          alone, so the terms exist from the first minute of it. Both stand down while the
          winter is running. */}
      {crisisCapabilityEnabled &&
        status === "ready" &&
        crisis.briefing &&
        !crisisHasTheIsland && (
          <>
            {crisis.standing && !crisis.briefingOpen && (
              <CrisisCallNotice
                briefing={crisis.briefing}
                onExplain={crisis.openBriefing}
              />
            )}
            {crisis.briefingOpen && requestedMenuCrisis === null && (
              <CrisisCallAdvisor
                briefing={crisis.briefing}
                onFace={() => {
                  crisis.answerCall();
                  if (eraId === "information_age" && relayHost !== null) {
                    setRelayInCity(true);
                  } else if (eraId === "classical") {
                    if (successionSession !== null && allOccupants.length >= 2) {
                      setSuccessionInCity(true);
                    } else {
                      setAssertive(
                        "The Succession cannot open until this city has two placed buildings.",
                      );
                    }
                  } else if (eraId === PLAGUE_ERA) {
                    if (plagueSession !== null && townHall !== null) {
                      setPlagueInCity(true);
                    } else {
                      setAssertive("The Care House cannot open until the city is saved.");
                    }
                  } else {
                    setWinterInCity(true);
                  }
                }}
                onLater={crisis.closeBriefing}
              />
            )}
          </>
        )}

      {/* THE HARD WINTER, HAPPENING HERE. Not a screen and not a second canvas: the board is
          the island above, and this is the winter's own controls worn as a panel over it. It
          publishes each moment back through `setWinterBoard`, which is what the canvas host
          draws. Lazy, so the city bundle still does not pay for it. */}
      {crisisCapabilityEnabled && winterInCity && (
        <WinterInCity
          placements={placements}
          townHall={townHall}
          canvasLive={enableCanvas}
          practisedNodeIds={practicedNodeIds}
          // ONE MILESTONE LINE, decided here because "is this your first crisis" is a fact
          // about the island rather than about this encounter. It is a read over the city's
          // own persisted damage mint and nothing else; see `milestones.ts` for why that is
          // the once-only key and what it can and cannot promise.
          milestone={firstCrisisMilestone(crisisDamage)}
          // The era the city wears, so the crisis stops being pinned to the era-one constant.
          // It cannot always follow — nine eras have no authored land for a board to be built
          // from (D-ERA25) — so the surface resolves it and says which crisis it got.
          liveEraId={eraId}
          onBoard={setWinterBoard}
          // WHERE THE CARRY-BACK WRITES, and it is only ever supplied when the host wired a
          // session: with none, `scarLiveCity` keeps its saved-blob default rather than
          // recording into a city nothing owns.
          onCarryDamage={onCarryCrisisDamage ? carryCrisisDamage : undefined}
          onExit={() => setWinterInCity(false)}
        />
      )}
      {crisisCapabilityEnabled && successionInCity && successionSession !== null && (
        <Suspense
          fallback={<p className="succession-in-city__loading">Calling the city wards…</p>}
        >
          <SuccessionInCity
            session={successionSession}
            placements={placements}
            townHall={townHall}
            civic={civicPlacements}
            reducedMotion={reducedMotion}
            onBoard={setSuccessionBoard}
            onFocus={focusSuccessionPlacement}
            onCarryDamage={onCarryCrisisDamage ? carryCrisisDamage : undefined}
            onExit={(aftermath) => {
              setSuccessionInCity(false);
              setSuccessionBoard(aftermath);
            }}
          />
        </Suspense>
      )}
      {crisisCapabilityEnabled && relayInCity && relayHost !== null && (
        <RelayInCity
          session={relaySession}
          practisedNodeIds={practicedNodeIds}
          cityTargetIds={relayTargetIds}
          {...(relayPreviewState ? { initialState: relayPreviewState } : {})}
          onStateChange={setRelayBoard}
          onFeedbackChange={setRelayFeedback}
          onCarryRecord={async (bandsDark) => {
            await carryCrisisDamage({
              buildings: [],
              cells: [],
              overwritten_records:
                bandsDark === 0
                  ? []
                  : [{ placement_id: relayHost.nodeId, bands_dark: bandsDark }],
            });
          }}
          onExit={() => {
            setRelayBoard(null);
            setRelayFeedback({ answered: 0, verdicts: [] });
            setRelayInCity(false);
            onIntrusionExit?.();
          }}
        />
      )}
      {crisisCapabilityEnabled && recordVerification !== null && (
        <RecordVerification
          record={recordVerification}
          practisedNodeIds={practicedNodeIds}
          onResolve={async (damageId, correct) => {
            await onVerifyOverwrittenRecord?.(damageId, correct);
            await refresh();
          }}
          onClose={() => setRecordVerification(null)}
        />
      )}
      {crisisCapabilityEnabled &&
        plagueInCity &&
        plagueSession !== null &&
        townHall !== null && (
          <Suspense
            fallback={
              <p className="pl-care-shell pl-care-shell--loading">
                Opening the Care House…
              </p>
            }
          >
            <PlagueInCity
              session={plagueSession}
              placements={placements}
              townHall={townHall}
              practisedNodeIds={practicedNodeIds}
              onLayer={setPlagueLayer}
              onExit={() => {
                setPlagueInCity(false);
                setPlagueLayer(null);
                onPlagueExit?.();
              }}
            />
          </Suspense>
        )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HUD pieces                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The compact top-left town capsule ("Foundations · N/6" + a slim mastery meter).
 * Tapping it opens the Town popover, which carries the storm/checkpoint block. At 6/6
 * the capsule gains a soft-gold "Checkpoint ready" state (never solid gold — that is
 * reserved for the Build button + genuine rewards).
 */
function TownCapsule({
  viewModel,
  storm,
  open,
  onToggle,
  onClose,
  onEnterStorm,
  crisisHasTheIsland,
  capsuleBtnRef,
  stormBtnRef,
  vitality,
}: {
  viewModel: CityViewModel;
  storm: CityStormView;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEnterStorm: (storm: CityStormView) => void;
  /** A crisis is on the island, so the checkpoint cannot be entered. */
  crisisHasTheIsland: boolean;
  capsuleBtnRef: { current: HTMLButtonElement | null };
  stormBtnRef: { current: HTMLButtonElement | null };
  vitality: CityVitality | null;
}) {
  const total = viewModel.buildings.length;
  // Counted from the buildings directly rather than through `cosmetic_preview`, which
  // is the superseded pre-economy stub (see `engines/game/src/cosmetic-preview.ts`).
  // Same number — `complete` is `mastery >= 2`, which is exactly what that stub counted
  // — but read from the thing it is actually about.
  const mastered = viewModel.buildings.filter((building) => building.complete).length;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const checkpointReady = storm.phase === "ready";

  return (
    <div className="hud hud-top-left">
      {/* One stable <h2> keeps the district in the document outline even while
          the Town popover is closed. */}
      <h2 className="visually-hidden">{viewModel.label}</h2>
      <button
        type="button"
        className="city-capsule"
        data-testid="town-capsule"
        data-checkpoint={checkpointReady ? "ready" : undefined}
        aria-label={`Foundations district: ${mastered} of ${total} skills mastered.${
          checkpointReady ? " Checkpoint ready." : ""
        } Open the town status.`}
        aria-expanded={open}
        aria-controls="city-town-popover"
        ref={capsuleBtnRef}
        onClick={onToggle}
      >
        <span className="city-capsule-top">
          {/* The kicker names what the count MEASURES, not the district (which the
              popover header, the HUD kicker, and this button's own aria-label all
              still say). The number is `mastered_count`, so an unlabelled "0/6" over
              six rows reading Complete looked like a contradiction rather than two
              different facts (#103). */}
          <span className="city-capsule-kicker">Mastered</span>
          <span className="city-capsule-count">
            <strong>{mastered}</strong>/{total}
          </span>
        </span>
        <span
          className="hud-meter"
          data-testid="hud-meter"
          role="progressbar"
          aria-label="Skills mastered"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={mastered}
        >
          <span style={{ width: `${pct}%` }} />
        </span>
        {checkpointReady && (
          <span className="city-capsule-flag">
            <HudIcon name="storm" />
            Checkpoint ready
          </span>
        )}
      </button>
      {/* Always-on, and directly under the capsule rather than inside the popover:
          section 7 requires the population readout be PROMINENT, and a number behind
          a disclosure is not. */}
      {vitality && <CityVitalityPanel vitality={vitality} />}
      {open && (
        <TownPopover
          viewModel={viewModel}
          storm={storm}
          onEnterStorm={onEnterStorm}
          crisisHasTheIsland={crisisHasTheIsland}
          onClose={onClose}
          stormBtnRef={stormBtnRef}
        />
      )}
    </div>
  );
}

/** The Town status popover: the district header and the checkpoint/storm block, calm. */
function TownPopover({
  viewModel,
  storm,
  onEnterStorm,
  crisisHasTheIsland,
  onClose,
  stormBtnRef,
}: {
  viewModel: CityViewModel;
  storm: CityStormView;
  onEnterStorm: (storm: CityStormView) => void;
  /** A crisis is on the island, so the checkpoint cannot be entered. */
  crisisHasTheIsland: boolean;
  onClose: () => void;
  stormBtnRef: { current: HTMLButtonElement | null };
}) {
  const locked = storm.phase === "locked";
  const ready = storm.phase === "ready";
  // Opening moves focus to the storm CTA; Escape closes + restores the capsule.
  useEffect(() => {
    stormBtnRef.current?.focus();
  }, [stormBtnRef]);

  return (
    <section
      className="hud-popover city-town-popover"
      id="city-town-popover"
      aria-label="Town status"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <span className="hud-kicker">Foundations district · {viewModel.label}</span>
      <div className="hud-storm" data-phase={storm.phase}>
        <span className="micro-label">
          <HudIcon name="storm" />
          Checkpoint
        </span>
        <p className="hud-storm-status">{stormMessage(storm)}</p>
        <button
          type="button"
          className={
            ready ? "city-action city-action-primary" : "city-action city-action-small"
          }
          // A crisis has the island (see `crisisHasTheIsland`): the checkpoint is a
          // full-screen encounter of practice items, and it is not what the player pressed
          // "Face the winter" for. The label still says which of the two it is refusing on.
          disabled={locked || crisisHasTheIsland}
          ref={stormBtnRef}
          onClick={() => onEnterStorm(storm)}
        >
          {locked
            ? "Storm locked"
            : storm.phase === "cleared"
              ? "Replay storm"
              : "Enter the storm"}
        </button>
      </div>
      {/* A "N cosmetic rewards earned (preview)" line used to sit here, projecting one
          cosmetic per mastered node. It is gone rather than reworded: the reward model
          did not get renamed, it changed shape. Mastery pays XP, the era's material comes
          from lessons and interleaved practice, cosmetics are BOUGHT with it in the Shop, and the
          only earned ones are the prestige items gated on XP level — so that count
          corresponded to nothing a learner could collect. The economy HUD shows the
          real material and XP. */}
      <p className="city-town-more">More districts coming.</p>
    </section>
  );
}

function EntryLauncher({
  onOpenSurface,
  onOpenSuccession,
  onOpenCurrentCrisis,
  onOpenHardWinter,
  onOpenIntrusion,
  crisisPhrase,
  crisisCapabilityEnabled,
  eraId,
}: {
  onOpenSurface?: (surface: CityEntrySurface) => void;
  onOpenSuccession?: () => void;
  onOpenCurrentCrisis?: () => void;
  onOpenHardWinter: () => void;
  onOpenIntrusion?: () => void;
  /** Whose crisis the winter chip offers — derived, never the literal "era one's". */
  crisisPhrase: string;
  /** The composition root's single decision for every crisis destination in this nav. */
  crisisCapabilityEnabled: boolean;
  eraId: EraId;
}) {
  if (!onOpenSurface) {
    return null;
  }
  /*
   * `devOnly` IS THE GATE, AND IT IS PER-ENTRY BECAUSE THE PROP CANNOT BE.
   *
   * `CheckerLab` shipped to learners here. It is a development fixture — its own copy says
   * *"This development fixture"*, over the eyebrow "Capability probe" and the title "The D1
   * answer checker" — and it sat in this nav as a peer of Diagnostic and Lessons, in the same
   * chip styling, photographed on a learner's mount at 1024x580 by
   * `learnerMenuShots.browser.test.tsx`. What a learner concludes from it is R32 at its
   * strongest: "golden cases", "Node + Chromium parity" and "D1" are not merely unearned
   * vocabulary but UN-EARNABLE, since none of them is about mathematics and no lesson will
   * ever define them.
   *
   * The obvious fix is not available. `App.tsx` gates its `onDev*` props on
   * `devControlsEnabled` and passes `onOpenSurface` unconditionally two lines below, so gating
   * that prop the same way looks like the one-word change — and it would take Diagnostic and
   * Lessons out of a learner's menu with it, because this whole nav hangs on that one prop
   * being present. The gate therefore belongs on the ENTRY.
   *
   * `isDevPersistenceEnabled()` is the same predicate `devControlsEnabled` reads, and the same
   * one the four crisis chips below already carry, so the nav now has one definition of "dev"
   * rather than two. Guarded behaviourally by `learnerMenuHoldsNoDevSurface.test.tsx`, which
   * censuses the surfaces this nav offers against `App.tsx`'s own surface record rather than
   * against this array, so a dev surface added here by any route has to be classified.
   */
  const entries: {
    surface: CityEntrySurface;
    label: string;
    icon: IconName;
    devOnly?: true;
  }[] = [
    { surface: "diagnostic", label: "Diagnostic", icon: "survey" },
    { surface: "lessons", label: "Lessons", icon: "lessons" },
    { surface: "checker", label: "Checker Lab", icon: "checker", devOnly: true },
  ];
  const devSurfacesEnabled = isDevPersistenceEnabled();
  return (
    <nav className="hud-entries" aria-label="Other places">
      {entries
        .filter((entry) => !entry.devOnly || devSurfacesEnabled)
        .map((entry) => (
          <button
            key={entry.surface}
            type="button"
            className="city-chip"
            // The surface id, so a guard can census what this nav offers without reading the
            // labels a learner sees. A label is copy and moves; the surface is the claim.
            data-surface={entry.surface}
            onClick={() => onOpenSurface(entry.surface)}
          >
            <HudIcon name={entry.icon} />
            {entry.label}
          </button>
        ))}
      {crisisCapabilityEnabled && (
        <>
          {/* Named crisis actions have named dispatches: Succession takes the classical era,
              the Care House keeps its current-era hook, and Hard Winter and The Intrusion each
              open their own in-city surface. */}
          {eraId === "classical" ? (
            <SuccessionEntryChip unlocked onOpenInCity={onOpenSuccession} />
          ) : crisisPhrase === "The Care House" ? (
            <PlagueEntryChip onOpenInCity={onOpenCurrentCrisis} />
          ) : (
            <WinterEntryChip onOpenInCity={onOpenHardWinter} crisis={crisisPhrase} />
          )}
          {eraId === "classical" && (
            <WinterEntryChip onOpenInCity={onOpenHardWinter} crisis="The Hard Winter" />
          )}
          {eraId === "classical" ? null : <SuccessionEntryChip />}
          {crisisPhrase === "The Care House" ? null : <PlagueEntryChip />}
          {onOpenIntrusion && <IntrusionEntryChip onOpenInCity={onOpenIntrusion} />}
          {/* The old standalone page remains useful as an isolated fixture, and is named as
              one. */}
          <IntrusionEntryChip />
        </>
      )}
    </nav>
  );
}

function EnvironmentSettings({
  variant,
  onCycleVariant,
}: {
  readonly variant: PaletteVariant;
  readonly onCycleVariant: () => void;
}) {
  const label = PALETTE_LABEL[variant];
  return (
    <section
      className="city-menu-section city-menu-environment"
      data-testid="menu-environment"
      aria-labelledby="city-menu-environment-title"
    >
      <header className="city-menu-section-heading">
        <HudIcon name="sun" />
        <h3 id="city-menu-environment-title">Environment</h3>
      </header>
      <div className="city-menu-settings">
        <button
          type="button"
          className="city-menu-setting"
          aria-label={`Cycle lighting theme, currently ${label}`}
          data-testid="lighting-toggle"
          onClick={onCycleVariant}
        >
          <HudIcon
            name={
              variant === "night" ? "moon" : variant === "colorblind" ? "contrast" : "sun"
            }
          />
          <span className="city-menu-setting-label">Lighting</span>
          <span className="city-menu-setting-state">{label}</span>
        </button>
        <AudioSettings placement="menu" />
      </div>
    </section>
  );
}

/**
 * The single ☰ Menu popover: Environment, Survey/Lessons/Checker, How to play, and
 * (dev only) the mastery stand-in. Day and Sound live in the grouped Environment section
 * instead of consuming world-space as standalone HUD controls. Cosmetics are NOT here,
 * reached from the always-visible chip beside the gold balance (see the note below on
 * the removed preview section).
 */
function MenuPopover({
  id,
  open,
  account,
  onOpenSurface,
  devBuildings,
  onDevSimulateLesson,
  onDevAdvance,
  onDevSetStage,
  onDevSeedCrisis,
  crisisSeedPlan,
  presenterTools,
  onHowToPlay,
  onBay,
  bayEnabled,
  onAchievements,
  onCeremony,
  onClose,
  onOpenSuccession,
  onOpenCurrentCrisis,
  onOpenHardWinter,
  onOpenIntrusion,
  eraId,
  nodeStates,
  destinationUnlocked,
  inProgressExamScore,
  eraDoorVariant,
  crisisPhrase,
  crisisCapabilityEnabled,
  variant,
  onCycleVariant,
}: {
  id: string;
  /** Presenter setup is pre-mounted so opening Menu does not mount a city-sized subtree. */
  open: boolean;
  /** The signed-in learner's account, when there is one; gates the "Report a bug" row. */
  account?: AuthenticatedAccount | null;
  onOpenSurface?: (surface: CityEntrySurface) => void;
  onOpenSuccession?: () => void;
  onOpenCurrentCrisis?: () => void;
  onOpenHardWinter: () => void;
  onOpenIntrusion?: () => void;
  crisisPhrase: string;
  crisisCapabilityEnabled: boolean;
  devBuildings: readonly CityBuildingView[] | null;
  onDevSimulateLesson?: (nodeId: string) => void;
  onDevAdvance?: (nodeId: string) => void;
  onDevSetStage?: (nodeId: string, stage: DevBuildStage) => void;
  /** DEV: seed the state this era's mid-era crisis fires from, then hand off. */
  onDevSeedCrisis?: () => void;
  crisisSeedPlan?: CrisisSeedPlan | null;
  /** Presenter-only target-era controls supplied by the presenter composition root. */
  presenterTools?: ReactNode;
  /** Open the How to play reference card (the tutorial's replay hatch). */
  onHowToPlay: () => void;
  /** Open the bay: the ten islands as geography, and the way between them. */
  onBay: () => void;
  /**
   * ⚑ Whether the bay's row exists at all. `archipelagoFlag.ts`, read once by the surface.
   * A REQUIRED prop rather than a defaulted one, so a mount cannot forget it and get the row
   * for free: the menu is on the demo path and the flag is what keeps it off.
   */
  bayEnabled: boolean;
  /** Open the Achievements card: what this run has done, and what it has not done yet. */
  onAchievements: () => void;
  /** Open the current island's unlock exam or final completion reward. */
  onCeremony: () => void;
  onClose: () => void;
  /** The era the city is standing in — the era the door leads OUT of. */
  eraId: EraId;
  nodeStates: readonly StudentNodeState[];
  destinationUnlocked: boolean;
  /** Persisted score shown on the learner's resume door. */
  inProgressExamScore: number;
  /** Which door variant to mount. See `CitySurfaceProps.eraDoorVariant`. */
  eraDoorVariant?: EraDoorVariant;
  /** The current city lighting treatment and its existing cycle action. */
  variant: PaletteVariant;
  onCycleVariant: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  // Opening moves focus to the first control; Escape closes + restores the button.
  useEffect(() => {
    if (open) {
      ref.current
        ?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
        ?.focus();
    }
  }, [open]);
  return (
    <section
      ref={ref}
      className="hud-popover city-menu-popover"
      id={id}
      aria-label="Menu"
      hidden={!open}
      inert={!open}
      style={open ? undefined : { display: "none" }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {presenterTools}
      {(open || presenterTools === undefined) && (
        <>
          <IslandUnlockDoor
            eraId={eraId}
            nodeStates={nodeStates}
            destinationUnlocked={destinationUnlocked}
            inProgressScore={inProgressExamScore}
            onOpen={onCeremony}
            variant={eraDoorVariant}
          />
          <EnvironmentSettings variant={variant} onCycleVariant={onCycleVariant} />
          <EntryLauncher
            onOpenSurface={onOpenSurface}
            onOpenSuccession={onOpenSuccession}
            onOpenCurrentCrisis={onOpenCurrentCrisis}
            onOpenHardWinter={onOpenHardWinter}
            onOpenIntrusion={onOpenIntrusion}
            crisisPhrase={crisisPhrase}
            crisisCapabilityEnabled={crisisCapabilityEnabled}
            eraId={eraId}
          />
          {/* The tutorial's front door for a learner who skipped the intro, or who
          cannot remember how something works. Deliberately in the ☰ Menu rather
          than on the HUD: it must be findable, not permanently in the way. */}
          <button
            type="button"
            className="city-action city-action-ghost menu-how-to-play"
            data-testid="menu-how-to-play"
            onClick={onHowToPlay}
          >
            <HudIcon name="lessons" />
            How to play
          </button>
          {/* ⚑ THE BAY. Rendered ONLY when `archipelagoFlag.ts` says so — which needs `?bay` on a
          dev server, so it is absent from the demo's own address and compiled out of every
          build. With the flag off this menu is byte-for-byte the menu that ships, which
          `archipelagoFlagIsOff.test.tsx` measures by reading the real popover rather than by
          trusting this comment. */}
          {bayEnabled && (
            <button
              type="button"
              className="city-action city-action-ghost menu-bay"
              data-testid="menu-bay"
              onClick={onBay}
            >
              <HudIcon name="survey" />
              The bay
            </button>
          )}
          {/* ACHIEVEMENTS. The second and last of the reference rows. It was the fourth until
          the 2026-08-04 ruling cut the Timeline and the Album from this menu: the
          archipelago's overview screen answers "where is this going" off the same inputs
          the Timeline read, and its revisitable island answers "what did I build" by being
          the place rather than a picture of it. This one answers "what have I done", it is
          in the menu and never on the HUD for the reason How to play is: findable, and
          never permanently in the way. */}
          <button
            type="button"
            className="city-action city-action-ghost menu-achievements"
            data-testid="menu-achievements"
            onClick={onAchievements}
          >
            <HudIcon name="check" />
            Achievements
          </button>
          {/* Only a signed-in account has somewhere for a report to attach; anonymous,
          demo, and local sessions simply do not offer this row. */}
          {account && <BugReportButton account={account} />}
          <FullscreenMenuAction />
          {devBuildings && (onDevSimulateLesson || onDevAdvance || onDevSetStage) && (
            <DevPanel
              buildings={devBuildings}
              onSimulateLesson={onDevSimulateLesson}
              onAdvance={onDevAdvance}
              onSetStage={onDevSetStage}
              onSeedCrisis={onDevSeedCrisis}
              crisisSeedPlan={crisisSeedPlan ?? null}
            />
          )}
        </>
      )}
    </section>
  );
}

/**
 * Fixed-tilt village camera controls: rotate (orbit), zoom, and recenter. Pan is
 * drag / arrow keys; rotate is drag / Q·E / these buttons — the tilt never moves.
 */
function CameraControls({
  dispatch,
  buildingLabelsVisible,
  onToggleBuildingLabels,
}: {
  dispatch: (action: CameraAction) => void;
  buildingLabelsVisible: boolean;
  onToggleBuildingLabels: () => void;
}) {
  const buildingLabelAction = buildingLabelsVisible
    ? "Hide building labels"
    : "Show building labels";
  // Registered as a KEEP-CLEAR region rather than as a hint anchor: no coach-mark points here,
  // and the first-use hint used to sit on this toolbar and swallow the press at the centre of
  // five of its six buttons. See `coachmarks/tooltipPlacement.ts`.
  const cameraAnchor = useCoachAnchor("camera");
  return (
    <div
      className="hud-camera"
      role="toolbar"
      aria-label="Camera controls"
      ref={cameraAnchor}
    >
      <button
        type="button"
        className="city-icon-button"
        aria-label="Rotate view left"
        onClick={() => dispatch("rotateLeft")}
      >
        <HudIcon name="rotate-left" />
      </button>
      <button
        type="button"
        className="city-icon-button"
        aria-label="Rotate view right"
        onClick={() => dispatch("rotateRight")}
      >
        <HudIcon name="rotate-right" />
      </button>
      <button
        type="button"
        className="city-icon-button"
        aria-label="Zoom in"
        onClick={() => dispatch("zoomIn")}
      >
        <HudIcon name="plus" />
      </button>
      <button
        type="button"
        className="city-icon-button"
        aria-label="Recenter view"
        onClick={() => dispatch("recenter")}
      >
        <HudIcon name="home" />
      </button>
      <button
        type="button"
        className="city-icon-button"
        aria-label="Zoom out"
        onClick={() => dispatch("zoomOut")}
      >
        <HudIcon name="minus" />
      </button>
      <button
        type="button"
        className="city-icon-button"
        aria-label={buildingLabelAction}
        aria-pressed={buildingLabelsVisible}
        title={buildingLabelAction}
        data-testid="building-labels-toggle"
        onClick={onToggleBuildingLabels}
      >
        <HudIcon name="building" />
      </button>
    </div>
  );
}

/** The advisor's greeting for a building's click-menu, sensitive to its stage. */
function buildingMenuLine(building: CityBuildingView): string {
  switch (buildStageFor(building.construction_state)) {
    case "built":
    case "advanced":
      // The shared "you've already worked through this skill" greeting is untrue for
      // a tested-out building: the diagnostic built it, so the lesson is unread and
      // the practice set unanswered (#103).
      return building.tested_out
        ? "You tested out of this one, so its building went up without the lesson. Read it any time, or run the practice set to earn its mastery stars."
        : LESSON_MENU_LINE;
    case "construction":
      return "You've broken ground here. Finish the practice set to complete the building, or run back through the lesson.";
    default:
      return "Ready to learn this one? Start the lesson to break ground. Practice opens once you finish it.";
  }
}

/** Description under the first (lesson) card, matching its state-sensitive label. */
function lessonCardDesc(building: CityBuildingView): string {
  switch (building.construction_state) {
    case "complete":
    case "gold":
      // "Reread" presumes a first read a tested-out learner never had (#103).
      return building.tested_out
        ? "Read the full mini-lesson."
        : "Reread the full mini-lesson.";
    case "not_started":
    case "preview":
      return "Learn this skill step by step.";
    default:
      return "Pick the mini-lesson back up.";
  }
}

/**
 * The building CLICK-MENU: clicking a placed building (3D scene OR the Buildings
 * roster) opens the advisor NPC + the three lesson entry points — Review lesson,
 * Practice, and Infinite practice — the SAME revisit menu the lesson itself lands
 * on, lifted into the shared `LessonMenu` (compact variant) and shown here as a
 * lightweight popup glued ABOVE the building rather than a centered modal.
 *
 * The 3D scene projects the building's world position onto `calloutRef` every frame
 * (see `CalloutTracker`), so the popup tracks the building as the camera pans /
 * orbits / zooms and clamps/flips to stay on-screen near a viewport edge; a tail
 * points down (or up, when flipped) at the building it belongs to.
 *
 * Non-blocking, NON-modal by design: the root is `pointer-events: none` (only its
 * card opts back in), so a pointer-drag anywhere — including on the popup — still
 * pans/orbits the map, and the scene is never scrimmed while a building is selected.
 * Practice + Infinite practice are GATED until the skill is past Foundation (its
 * lesson + CFU are done): a fresh Foundation building leads with the lesson and shows
 * a "finish the lesson to unlock practice" hint. Choosing an activity closes this
 * popup and steps into the lesson host. A small "Move building" control sits BELOW
 * the three cards (see `onMove`) to relocate the building on the island. It is a
 * labelled `role="dialog"`: focus moves to the lesson card on open, Escape / the
 * corner ✕ / tapping empty ground close it, and the caller restores focus to the
 * trigger. The keyboard-navigable Buildings roster stays the accessible entry, and
 * because it opens this same popup, the Move action is reachable from it too.
 */
function BuildingLessonMenu({
  building,
  calloutRef,
  ruined,
  repairCost,
  onRepair,
  onReviewLesson,
  onPractice,
  onInfinitePractice,
  onMove,
  onDelete,
  onClose,
  eraId,
}: {
  building: CityBuildingView;
  /** Owned by CitySurface — the scene glues this element above the building. */
  calloutRef: RefObject<HTMLDivElement | null>;
  /**
   * Whether a crisis has left this building in ruins.
   *
   * IT CHANGES NOTHING ABOUT THE THREE LESSON CARDS, and that is the load-bearing part.
   * The ruin adds a banner and a repair control above them; the cards' own gate is
   * `pastFoundation` and nothing else, so `practiceLocked` still means "the lesson and CFU
   * are not done" and never "this building is damaged". Damage may not cut off access to
   * learning (team lead, 2026-07-30), and this is the one component where that could be
   * broken with a single extra `||`. `ruinLessonAccess.test.tsx` is the measurement.
   */
  ruined: boolean;
  /** The authored price of putting this building back, for the button's own label. */
  repairCost: number;
  /** Null when no host wired a repair: the ruin is still SHOWN, just not clearable here. */
  onRepair: (() => void) | null;
  onReviewLesson: (building: CityBuildingView) => void;
  onPractice: (building: CityBuildingView) => void;
  onInfinitePractice: (building: CityBuildingView) => void;
  /**
   * Enter MOVE mode to relocate this building on the island. Rendered as a small,
   * separate control BELOW the three lesson cards rather than a fourth card, so
   * the shared `LessonMenu` keeps its compact 3-option layout untouched (this is
   * the same "tap a building → Move" affordance Clash of Clans exposes).
   */
  onMove: (building: CityBuildingView) => void;
  /** Presenter-only disposable layout edit; null on every learner/account composition. */
  onDelete: (() => void) | null;
  onClose: () => void;
  /** The era whose dressing subtitle the title carries (D-ERA29). */
  eraId: EraId;
}) {
  const stage = buildStageFor(building.construction_state);
  const pastFoundation = stage === "construction" || stage === "built";
  const lessonTitle = lessonTitleFor(building.node_id);
  const titleId = "building-callout-title";
  // WHAT THIS BUILDING GIVES THE CITY. Null until it actually holds somebody, which is
  // why this is the only per-building surface that can carry the figure honestly: the
  // callout opens over a placed building in every state, and a fresh foundation simply
  // has no line rather than a promise. See `cityContributionMessage`.
  const gives = cityContributionMessage(building);

  // Move focus to the (always-available) lesson card on open, so the keyboard path
  // from the Buildings roster lands ready to act and Escape is caught here. The
  // immediate focus covers the common case; the rAF re-focus survives React
  // StrictMode's dev double-mount and the opening click's own focus.
  useEffect(() => {
    const focusLesson = () => {
      calloutRef.current
        ?.querySelector<HTMLElement>(".lesson-menu-card:not([disabled])")
        ?.focus({ preventScroll: true });
    };
    focusLesson();
    const raf = requestAnimationFrame(focusLesson);
    return () => cancelAnimationFrame(raf);
  }, [calloutRef]);

  return (
    <div
      className="building-callout"
      data-flip="above"
      role="dialog"
      aria-labelledby={titleId}
      ref={calloutRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="building-callout-card">
        <button
          type="button"
          className="building-callout-close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
        <header className="building-callout-head">
          <span className="micro-label">
            {lessonTitle ? lessonTitle : "Skill · lesson"}
          </span>
          {/* THE CALLOUT'S ACCESSIBLE NAME (`aria-labelledby` points here), so this
              is the one place D-ERA29's ruling is literally the announced string:
              `"{stable}, {subtitle}"`, stable handle FIRST, subtitle not hidden. */}
          <h2 id={titleId}>{buildingDisplayName(building.node_id, eraId)}</h2>
        </header>
        {/* THE CONTRIBUTION LINE, in the slot directly under the title — the same place
            a civic building's *"N more people sustained"* will land, so a learner who
            has read one has read both. Above the ruin banner, because a ruin is a
            temporary state and this is what the building IS. */}
        {gives !== null && <p className="building-callout-gives">{gives}</p>}
        {/*
          THE RUIN SITS ABOVE THE LESSON CARDS AND DOES NOT TOUCH THEM. It is deliberately
          not a replacement view: a learner who opens a ruined building to reread its lesson
          must find the lesson, so the banner states the damage, offers the repair, and says
          in words that the lesson is still there.
        */}
        {ruined && (
          <div className="building-callout-ruin" data-ruined="true">
            <p>
              <strong>In ruins.</strong> A crisis damaged this building. Its lesson, its
              practice and its stars are exactly where you left them, because repairing it
              is about the building rather than about the skill.
            </p>
            <button
              type="button"
              className="city-action building-callout-repair"
              disabled={onRepair === null}
              onClick={() => onRepair?.()}
            >
              {`Repair for ${repairCost} ${materialWord(eraId)}`}
            </button>
          </div>
        )}
        <LessonMenu
          compact
          line={buildingMenuLine(building)}
          lessonLabel={lessonActionLabel(building)}
          lessonDesc={lessonCardDesc(building)}
          onReviewLesson={() => onReviewLesson(building)}
          onPractice={() => onPractice(building)}
          onInfinitePractice={() => onInfinitePractice(building)}
          practiceLocked={!pastFoundation}
        />
        {/* Move sits apart from the three lesson cards: relocating a building is a
            spatial action, not a lesson activity, and keeping it out of LessonMenu
            preserves that shared menu's compact layout. */}
        <div className="building-callout-actions">
          <button
            type="button"
            className="building-callout-move"
            onClick={() => onMove(building)}
          >
            <HudIcon name="move" />
            Move building
          </button>
          {onDelete && (
            <button type="button" className="building-callout-delete" onClick={onDelete}>
              <HudIcon name="close" />
              Delete building
            </button>
          )}
        </div>
      </div>
      <span className="building-callout-tail" aria-hidden="true" />
    </div>
  );
}

/**
 * The Town Hall panel: the island-HUB detail surface, opened by clicking the hall
 * (3D scene OR its roster entry). It is NOT the lesson menu — the hall has no lesson
 * (spec §2.2). It shows the island's completion PROGRESS and hosts the hub's primary
 * action, REVIEW MISTAKES: the persisted questions this learner missed or skipped in
 * this era. The action is always available because an empty queue has its own truthful
 * state rather than pretending unrelated mixed practice is a mistake list. A small
 * "Move building" control relocates the hall like any building (D-TH9).
 *
 * Reuses the SAME anchored, non-modal callout mechanism as `BuildingLessonMenu` (the
 * scene glues `calloutRef` above the hall each frame); it is a labelled `role="dialog"`
 * and fully keyboard-operable (design §9).
 */
function TownHallPanel({
  calloutRef,
  complete,
  total,
  onInterleavedPractice,
  onMove,
  onClose,
  eraId,
}: {
  calloutRef: RefObject<HTMLDivElement | null>;
  /** The era whose dressing subtitle the hub's title carries (D-ERA29). */
  eraId: EraId;
  complete: number;
  total: number;
  onInterleavedPractice: () => void;
  onMove: () => void;
  onClose: () => void;
}) {
  const titleId = "town-hall-panel-title";
  const reasonId = "town-hall-panel-reason";
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
  // Whose hall is on the island, and whether that is this era's own — see the note at the
  // paragraph this feeds. `null` in an era whose hall is authored and bundled.
  const hall = resolveEraTownHall(eraId, CURRENT_ERA_ID);
  const hallArt = describeEraTownHallArt(hall, getEraOrThrow(hall.showing_era).name);

  useEffect(() => {
    const focusFirst = () => {
      calloutRef.current
        ?.querySelector<HTMLElement>(".town-hall-panel-action, .building-callout-move")
        ?.focus({ preventScroll: true });
    };
    focusFirst();
    const raf = requestAnimationFrame(focusFirst);
    return () => cancelAnimationFrame(raf);
  }, [calloutRef]);

  return (
    <div
      className="building-callout town-hall-panel"
      data-flip="above"
      data-testid="town-hall-panel"
      role="dialog"
      aria-labelledby={titleId}
      ref={calloutRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="building-callout-card">
        <button
          type="button"
          className="building-callout-close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
        <header className="building-callout-head">
          <span className="micro-label">The island hub</span>
          {/* THE CALLOUT'S ACCESSIBLE NAME, the same contract the skill callout above
              honours: `"{stable}, {subtitle}"`, stable handle FIRST. This read the bare
              `TOWN_HALL_LABEL` until D-ERA31, which made the hub the ONE building whose
              callout dropped its dressing while its roster row carried it — a D-ERA29
              gap rather than a deliberate omission, and one that mattered more the
              moment the hub became the building wearing the era's round. */}
          <h2 id={titleId}>{buildingDisplayName(TOWN_HALL_ID, eraId)}</h2>
        </header>
        <div className="town-hall-panel-body">
          {/* WHOSE HALL IS ACTUALLY STANDING. `resolveEraTownHall` has always reported its
              fallback in `art` and argued that reporting it is what makes the fallback honest —
              "a surface can say which it is showing" — and no surface said: both call sites read
              `.model` and dropped the verdict, so all ten eras showed era one's hall in silence.
              This is the one place the hub is described in words, so it is where it belongs. */}
          {hallArt && (
            <p className="town-hall-panel-art" data-testid="town-hall-art-note">
              {hallArt}
            </p>
          )}
          <p className="town-hall-panel-progress">
            <strong>
              {complete} of {total}
            </strong>{" "}
            skills complete
          </p>
          {/* Meter is an ENHANCEMENT over the word progress above, never the only
              signal (design §9, never colour alone). */}
          <span className="hud-meter" role="presentation">
            <span style={{ width: `${pct}%` }} />
          </span>
          <div className="town-hall-panel-action-group">
            <button
              type="button"
              className="city-action city-action-primary town-hall-panel-action"
              aria-describedby={reasonId}
              data-testid="town-hall-interleaved"
              onClick={onInterleavedPractice}
            >
              <HudIcon name="lessons" />
              Review mistakes
            </button>
            <p className="town-hall-panel-reason" id={reasonId}>
              Questions you miss or skip are saved here. One correct review clears each
              question.
            </p>
          </div>
        </div>
        <div className="building-callout-actions">
          <button type="button" className="building-callout-move" onClick={onMove}>
            <HudIcon name="move" />
            Move building
          </button>
        </div>
      </div>
      <span className="building-callout-tail" aria-hidden="true" />
    </div>
  );
}

/**
 * The BOUGHT CIVIC BUILDING's panel: what opens when a learner clicks one standing in
 * the city. It reuses the anchored, non-modal callout the other two popups use (the scene
 * glues `calloutRef` above the building each frame), and it answers the two questions a
 * bought building can actually be asked — what it gives the city, and where it stands.
 *
 * ## What it deliberately does NOT carry, and why the list is written down
 *
 * A civic building is BOUGHT, not earned (D-ERA7): no graph node, no `student_node_state`
 * row, no mastery, no prerequisite chain, no lesson and no construction phases. So every
 * question the SKILL popup's grammar asks about a building is a question this one cannot
 * have an answer to, and asking it anyway is not a cosmetic slip — it is the defect that
 * has shipped three times in a week from exactly this root:
 *
 *  - an empty **0-of-3 mastery star rack** floated over every bought building, because
 *    `mastery: 0` was read as a real tier rather than as "no ladder exists";
 *  - a **"not built yet"** announcement over a building the learner had just paid for;
 *  - a **"Ready to build"** card offering to place a building already standing.
 *
 * So this panel has no mastery row, no progress meter, no stage label, no lesson or
 * practice entry points, and no build offer. `civicBuildingPopup.test.tsx` requires the
 * absence of each of those by name rather than eyeballing the result, because "it looks
 * right" is what shipped the other three.
 *
 * A PROGRESS METER IS THE SUBTLEST OF THEM and is worth its own sentence: the hub's panel
 * carries `.hud-meter` legitimately, because an island really is part-complete. A bought
 * building can never be part-bought, so a meter here — even one drawn full — would be the
 * star rack again in another shape.
 *
 * ## The figures
 *
 * The two capacities come from `civicContributions`, which is also where the live region's
 * selection sentence gets them. That is one source on purpose: the announcement and this
 * card describe the same building at the same moment, and two readings of the catalogue is
 * how they come to disagree after a retune. A dial that does not move is OMITTED rather
 * than shown as a zero, matching the spoken sentence — *"0 people sustained"* is the
 * empty-meter defect written as text.
 *
 * ## AND WHAT A SHUTTERED ONE SAYS, which is the same defect one surface over
 *
 * A crisis-suspended building contributes nothing (`suspendedCivic.ts`), and this card went
 * on reporting *"20 more people sustained"* over it — a figure the city was not counting,
 * about a building the player could see standing. That is the fourth instance of the root
 * cause the list above records: a grammar that describes the TYPE being read onto an
 * INSTANCE whose state contradicts it.
 *
 * So the figures stay and their tense changes: the head says the building is shut and the
 * list is what it WOULD give, which is the honest reading of a suspension and is also what
 * tells a player what reopening it buys them. The catalogue is still the one source; nothing
 * here re-derives a capacity.
 */
function CivicBuildingPanel({
  calloutRef,
  nodeId,
  contributions,
  suspended,
  materialLabel,
  onMove,
  onDelete,
  onClose,
}: {
  calloutRef: RefObject<HTMLDivElement | null>;
  /** The civic PLACEMENT id — this building, not its type (two Campfires are two cards). */
  nodeId: string;
  /** The authored capacities, read through the one source the announcement reads. */
  contributions: CivicContributions;
  /** Whether a crisis has this one shut, so the card's tense matches the city's arithmetic. */
  suspended: boolean;
  /** The standing era's material name, used in the no-refund warning. */
  materialLabel: string;
  onMove: () => void;
  /** Canonical civic-only deletion; null only when the host has no writable session. */
  onDelete: (() => Promise<CivicRemovalResult>) | null;
  onClose: () => void;
}) {
  const titleId = "civic-panel-title";
  const confirmationId = "civic-delete-confirmation";
  const name = placementLabel(nodeId);
  const type = civicTypeOf(nodeId);
  const cost = type === null ? null : (civicCatalogueRow(type)?.cost ?? null);
  const { livability, happiness } = contributions;
  const movesNothing = livability <= 0 && happiness <= 0;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const focusFirst = () => {
      calloutRef.current
        ?.querySelector<HTMLElement>(
          confirming ? ".civic-delete-confirm" : ".building-callout-move",
        )
        ?.focus({ preventScroll: true });
    };
    focusFirst();
    const raf = requestAnimationFrame(focusFirst);
    return () => cancelAnimationFrame(raf);
  }, [calloutRef, confirming]);

  const confirmDelete = async () => {
    if (!onDelete || deleting) {
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete();
    } catch {
      setDeleteError(`${name} could not be deleted. It is still standing. Try again.`);
      setDeleting(false);
    }
  };

  return (
    <div
      className="building-callout civic-building-panel"
      data-flip="above"
      data-testid="civic-panel"
      data-confirming={confirming ? "true" : "false"}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={confirming ? confirmationId : undefined}
      ref={calloutRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          event.preventDefault();
          if (confirming) {
            setConfirming(false);
            setDeleteError("");
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="building-callout-card">
        <button
          type="button"
          className="building-callout-close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
        <header className="building-callout-head">
          {/* The hub's panel says "Island hub · not a skill" for the same reason: naming
              what a building IS is what stops the skill grammar being read onto it. */}
          <span className="micro-label">Bought building · not a skill</span>
          {/* THE CALLOUT'S ACCESSIBLE NAME. `placementLabel` resolves a civic placement id
              to its authored name ("The Campfire"); the raw id never reaches the screen. */}
          <h2 id={titleId}>{confirming ? `Delete ${name}?` : name}</h2>
        </header>
        {confirming ? (
          <div className="civic-delete-confirmation" aria-live="assertive">
            <p id={confirmationId}>
              Delete {name} from this island?{" "}
              {cost === null
                ? `Spent ${materialLabel} will not be returned.`
                : `The ${cost} ${materialLabel} spent on it will not be returned.`}
            </p>
            {deleteError && (
              <p className="civic-delete-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="civic-delete-actions">
              <button
                type="button"
                className="building-callout-delete civic-delete-confirm"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                Delete {name}
              </button>
              <button
                type="button"
                className="building-callout-move"
                disabled={deleting}
                onClick={() => {
                  setConfirming(false);
                  setDeleteError("");
                }}
              >
                Keep building
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="civic-panel-body" data-suspended={suspended ? "true" : "false"}>
              <p className="civic-panel-note">
                {suspended
                  ? "A crisis has this one shut, so the city is doing without the two figures below. Reopen it from the Crisis damage panel."
                  : "What it gives the city, for as long as it stands."}
              </p>
              <ul className="civic-panel-contributions">
                {livability > 0 && (
                  <li data-testid="civic-panel-livability">
                    <strong>{livability}</strong> more people sustained
                  </li>
                )}
                {happiness > 0 && (
                  <li data-testid="civic-panel-happiness">
                    <strong>{happiness}</strong> Happiness
                  </li>
                )}
                {movesNothing && (
                  <li data-testid="civic-panel-none">It adds to neither dial.</li>
                )}
              </ul>
            </div>
            <div className="building-callout-actions">
              <button type="button" className="building-callout-move" onClick={onMove}>
                <HudIcon name="move" />
                Move building
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="building-callout-delete"
                  onClick={() => setConfirming(true)}
                >
                  <HudIcon name="close" />
                  Delete {name}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <span className="building-callout-tail" aria-hidden="true" />
    </div>
  );
}

/**
 * The picked ROAD TILE's popup: the small anchored card that opens over a tile the
 * player clicked on the island, offering to lift it back up for a FULL refund.
 *
 * It reuses the building callout's chrome and mechanics wholesale — the scene glues
 * `calloutRef` above the tile every frame, it is non-modal (only the card takes
 * pointer events, so the map still pans under it), it is a labelled `role="dialog"`
 * with Escape / ✕ / tap-away to dismiss, and focus lands on the remove action. The
 * refund rides on the button as a gold price tag, in the same idiom the Roads build
 * card prices a tile with, so the cost and the refund read as one exchange rate.
 */
function RoadTilePopup({
  eraId,
  calloutRef,
  refund,
  onRemove,
  onClose,
}: {
  /** The era the city is standing in — the copy below names its material. */
  eraId: EraId;
  calloutRef: RefObject<HTMLDivElement | null>;
  /** Gold this tile hands back — always exactly what it cost to lay. */
  refund: number;
  onRemove: () => void;
  onClose: () => void;
}) {
  const titleId = "road-tile-popup-title";

  useEffect(() => {
    const focusRemove = () => {
      calloutRef.current
        ?.querySelector<HTMLElement>(".road-tile-remove")
        ?.focus({ preventScroll: true });
    };
    focusRemove();
    const raf = requestAnimationFrame(focusRemove);
    return () => cancelAnimationFrame(raf);
  }, [calloutRef]);

  return (
    <div
      className="building-callout road-tile-callout"
      data-flip="above"
      data-testid="road-tile-popup"
      role="dialog"
      aria-labelledby={titleId}
      ref={calloutRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="building-callout-card">
        <button
          type="button"
          className="building-callout-close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
        <header className="building-callout-head">
          <span className="micro-label">Road · one tile</span>
          <h2 id={titleId}>Paved tile</h2>
        </header>
        <p className="road-tile-note">
          Take it back up and what it cost returns to your wallet, in full.
        </p>
        <button
          type="button"
          className="city-action city-action-primary road-tile-remove"
          data-testid="road-tile-remove"
          onClick={onRemove}
        >
          <HudIcon name="close" />
          Remove
          <span className="road-tile-refund">
            <HudIcon name="gem" />+{refund} {materialWord(eraId)}
          </span>
        </button>
      </div>
      <span className="building-callout-tail" aria-hidden="true" />
    </div>
  );
}

function ReadyToBuildCard({
  name,
  crisisHasTheIsland,
  onBuild,
}: {
  name: string;
  /** A crisis is on the island, so there is no ground to break. See `crisisHasTheIsland`. */
  crisisHasTheIsland: boolean;
  onBuild: () => void;
}) {
  return (
    <aside className="city-detail" aria-labelledby="city-detail-title">
      <header className="city-detail-head">
        <span className="micro-label">Ready to build</span>
        <h3 id="city-detail-title">{name}</h3>
        <p className="city-detail-archetype">Not built yet</p>
      </header>
      <p className="city-detail-progress-label">
        Break ground anywhere on the island. Drop it on open grass, rotate it to taste, and
        it rises through construction as you master the skill.
      </p>
      <button
        type="button"
        className="city-action city-action-primary"
        disabled={crisisHasTheIsland}
        onClick={onBuild}
      >
        Build it
      </button>
    </aside>
  );
}

/**
 * The floating confirm/cancel bar shown during placement AND move (CoC confirm
 * grammar). `mode` only swaps the copy — "Placing"/"Build here" for a fresh
 * building vs "Moving"/"Drop here" for a relocation — everything else (keyboard
 * handling, rotate/nudge, validity gating) is identical, since a move reuses the
 * placement machinery.
 */
function PlacementBar({
  mode,
  name,
  rot,
  refusal,
  onConfirm,
  onCancel,
  onRotate,
  onNudge,
}: {
  mode: PlacementMode;
  name: string;
  rot: number;
  /** `null` = a spot that may be committed; otherwise WHY it is refused. */
  refusal: PlacementRefusal | null;
  onConfirm: () => void;
  onCancel: () => void;
  onRotate: () => void;
  onNudge: (dcol: number, drow: number) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);
  const moving = mode === "move";
  const valid = refusal === null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a floating HUD group of placement controls; role="group" is valid ARIA and a <fieldset>'s form chrome is inappropriate for an overlay bar.
    <div
      className="hud hud-placement"
      role="group"
      aria-label={`${moving ? "Moving" : "Placing"} ${name}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        } else if (event.key === "r" || event.key === "R") {
          event.preventDefault();
          onRotate();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          onNudge(0, -1);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          onNudge(0, 1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          onNudge(-1, 0);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onNudge(1, 0);
        }
      }}
    >
      <div className="city-placement" data-valid={valid}>
        <div className="city-placement-copy">
          <span className="micro-label">
            {moving ? "Moving" : "Placing"} · {valid ? "valid" : "blocked"} ·{" "}
            {rotationLabel(rot)}
          </span>
          <strong>{name}</strong>
          {/* A refusal REPLACES the controls hint with its reason: "blocked" over a
              patch of plainly empty ground reads as a broken input unless the bar
              says what is wrong with it. Same sentence the live region speaks. */}
          <span className="city-placement-hint">
            {refusal === null
              ? "Drag on the map or use the arrows to move it, R to rotate."
              : placementRefusalReason(refusal)}
          </span>
        </div>
        <div className="city-placement-actions">
          <button
            type="button"
            className="city-action city-action-ghost"
            onClick={onCancel}
          >
            <HudIcon name="close" />
            Cancel
          </button>
          <button
            type="button"
            className="city-action city-action-ghost"
            onClick={onRotate}
          >
            <HudIcon name="rotate-right" />
            Rotate
          </button>
          <button
            type="button"
            className="city-action city-action-primary"
            ref={confirmRef}
            disabled={!valid}
            onClick={onConfirm}
          >
            <HudIcon name="check" />
            {moving ? "Drop here" : "Build here"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The floating running-cost bar shown while PAINTING ROADS (mirrors PlacementBar's
 * confirm grammar). It shows the live tile count and gold cost against the spendable
 * wallet, refuses to confirm when the wallet can't cover it (fail-closed — never a
 * partial purchase), and toggles between LAYING and ERASING. Erasing is the BULK
 * counterpart of picking one tile and removing it, and pays exactly the same: the
 * bar shows the running refund the sweep will hand back, so the two paths can never
 * look (or be) economically different. Enter/Escape are handled by the viewport; the
 * buttons mirror them.
 */
function RoadPaintBar({
  eraId,
  mode,
  tileCount,
  cost,
  refund,
  affordable,
  goldAvailable,
  onConfirm,
  onCancel,
  onUndo,
  onToggleErase,
}: {
  /** The era the city is standing in — the copy below names its material. */
  eraId: EraId;
  mode: "lay" | "erase";
  tileCount: number;
  cost: number;
  /** Gold a confirmed ERASE hands back (the drafted tiles' full price). */
  refund: number;
  affordable: boolean;
  goldAvailable: number | null;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onToggleErase: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);
  const erasing = mode === "erase";
  const empty = tileCount === 0;
  const canConfirm = !empty && (erasing || affordable);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a floating HUD group of controls; role="group" is valid ARIA and a <fieldset>'s form chrome is inappropriate for an overlay bar.
    <div
      className="hud hud-placement"
      role="group"
      aria-label={erasing ? "Removing roads" : "Laying roads"}
      data-testid="road-paint-bar"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="city-placement" data-valid={canConfirm}>
        <div className="city-placement-copy">
          <span className="micro-label">
            {erasing ? "Erasing roads" : "Laying roads"} · {tileCount}{" "}
            {tileCount === 1 ? "tile" : "tiles"}
            {erasing
              ? ` · +${refund} ${materialWord(eraId)} back`
              : ` · ${cost} ${materialWord(eraId)}`}
          </span>
          <strong data-testid="road-cost">
            {erasing
              ? `Remove ${tileCount} · +${refund} ${materialWord(eraId)}`
              : `${cost} ${materialWord(eraId)}`}
          </strong>
          <span className="city-placement-hint" data-testid="road-hint">
            {erasing
              ? "Drag over roads to mark them; Enter removes them and refunds every tile, Escape cancels."
              : affordable
                ? "Drag on the map to trace a path; Enter builds, Escape cancels."
                : `${goldAvailable === null ? "" : `You have ${goldAvailable} ${materialWord(eraId)}. `}Practise a skill to earn enough for this path.`}
          </span>
        </div>
        <div className="city-placement-actions">
          <button
            type="button"
            className="city-action city-action-ghost"
            onClick={onCancel}
          >
            <HudIcon name="close" />
            Cancel
          </button>
          <button
            type="button"
            className="city-action city-action-ghost"
            onClick={onUndo}
            disabled={empty}
          >
            <HudIcon name="rotate-left" />
            Undo
          </button>
          <button
            type="button"
            className="city-action city-action-ghost"
            onClick={onToggleErase}
            data-testid="road-erase-toggle"
          >
            <HudIcon name={erasing ? "road" : "close"} />
            {erasing ? "Lay" : "Erase"}
          </button>
          <button
            type="button"
            className="city-action city-action-primary"
            ref={confirmRef}
            disabled={!canConfirm}
            onClick={onConfirm}
            data-testid="road-confirm"
          >
            <HudIcon name="check" />
            {erasing ? "Remove" : "Build here"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * **WHAT A CRISIS DID, AND WHAT PUTTING IT RIGHT COSTS** — the repair surface.
 *
 * ## A PLAYER THINKS IN BUILDINGS, SO THE PANEL IS DENOMINATED IN BUILDINGS
 *
 * The team lead: *"repair mechanism is really bad - shouldnt be on a per-tile basis; it
 * should show buildings to repair first and foremost, like that should be the top of the
 * view."*
 *
 * A building has a name, a lesson behind it, a mastery state and a cell the player chose. A
 * CELL is substrate. So the buildings are enumerated individually, first, immediately under a
 * heading that counts nothing else — and the ground is ONE line with ONE price beneath them.
 *
 * **MEASURED, because the shape of this panel is a function of how much ground a winter
 * actually gives up.** `HARD_WINTER.abandon` takes a whole rim band per pull-back: era one's
 * bands are 28, 52, 72 and 84 cells (`hard-winter-tuning.ts` tabulates them against the
 * price). Played to the end with three pull-backs, the winter hands this panel 5 ruined
 * buildings and **72 scarred cells** — which the per-cell version rendered as **77 buttons**,
 * 72 of them reading *"Ground at -3, -5 / Reclaim for 3 stone"*, inside a 400px scroll box.
 * That is the *"per-tile basis"*, and it was a per-cell ACTION and not merely a per-cell
 * presentation: every one of those 72 was its own spend.
 *
 * ## WHY BUILDINGS STAY PER-ITEM AND GROUND DOES NOT
 *
 * The old note here defended per-item on the grounds that it *"keeps the choice with a player
 * who cannot afford everything"*. That argument is sound for buildings and vacuous for cells:
 * the buildings differ from each other — repair the one whose lesson you were about to
 * practise — while one scarred cell is interchangeable with the next, and a row reading
 * *"Ground at -3, -5"* gave a player no way to tell which of 72 rows was the cell they cared
 * about anyway. So the choice per-item was protecting never existed on the ground half.
 *
 * The ground bill is all-or-nothing at `cells × per_cell`, and its button is dimmed until the
 * whole of it is affordable rather than quietly spending as far as the wallet reaches. A
 * label promising 72 cells for 216 that delivered 33 for 99 would be the worse failure; the
 * broke line below says how to earn the rest.
 *
 * **NO NUMBER IS INVENTED.** The ground price is the sum of the authored per-cell prices, and
 * the ledger stays per cell — the reclaim loop spends under each cell's own
 * `repair:<damage_id>` key (`crisisRepair.ts`), so a run that stops half way converges and
 * nothing is charged twice.
 *
 * [DEFAULT TAKEN 2026-07-30, not a ruling: that ground is reclaimable AT ALL was authorised
 * by the lead as a default to take rather than stall on; `hard-winter-tuning.ts` records the
 * contradiction it resolves, with both sides quoted. Reversing it means deleting the ground
 * line here and the reclaim path in `crisisRepair.ts`.]
 *
 * DOM, not canvas, and that is not a shortcut. The 3D view is `aria-hidden` decoration, so a
 * repair offered only by clicking a cell in the scene would be a spend no keyboard could
 * reach. Every ruin here is a real button with the price in its accessible name — and that
 * argument is why the SUSPENSIONS are here too rather than only captioned on the island: the
 * caption above a roof is the spatial half, this is the reachable one.
 *
 * It renders NOTHING over an undamaged city, so an island nothing has happened to is exactly
 * the island it was.
 */

/**
 * *"20 livability and 5 happiness"*, or one of the two, or the empty string.
 *
 * ONE PHRASE FOR BOTH LINES, because a per-building row and the panel's total are two
 * readings of one arithmetic and a second spelling of it is a second place for the axes to
 * come apart. The empty case is real: era one's amenity row provides no livability, so a
 * suspension can genuinely have one axis and never both zero (a catalogue row that provided
 * nothing at all would be a dominated row, which `eraCivicCatalogueDominance` forbids).
 */
function withheldPhrase(withheld: {
  readonly livability: number;
  readonly happiness: number;
}): string {
  const parts: string[] = [];
  if (withheld.livability > 0) {
    parts.push(`${withheld.livability} livability`);
  }
  if (withheld.happiness > 0) {
    parts.push(`${withheld.happiness} happiness`);
  }
  return parts.join(" and ");
}

function CrisisRepairPanel({
  eraId,
  damage,
  suspensions,
  spendable,
  onRepair,
  onReclaimGround,
  onVerifyRecord,
}: {
  /** The era the city is standing in — the copy below names its material. */
  eraId: EraId;
  readonly damage: CrisisDamage;
  /**
   * The civic buildings a crisis has shuttered, already joined to what is standing and
   * already priced (`suspendedCivic.ts`). Passed in rather than derived here for the reason
   * the capacity suppression is applied at one seam: the panel must not be able to name a
   * suspension the arithmetic is not withholding.
   */
  readonly suspensions: readonly StandingSuspension[];
  /** The spendable stockpile, or null when no economy is wired (then nothing is dimmed). */
  readonly spendable: number | null;
  /** Null when no host wired a repair: the damage is still SHOWN, just not clearable. */
  readonly onRepair: ((target: RepairTarget) => void) | null;
  /** Reclaim every scarred cell in one press. Null for the same reason as `onRepair`. */
  readonly onReclaimGround: (() => void) | null;
  readonly onVerifyRecord: ((record: CrisisOverwrittenRecord) => void) | null;
}) {
  const prices = hardWinterRepairPrices();
  const ruinedBuildings = damage.ruined_buildings;
  const ruinedCells = damage.ruined_cells;
  const overwrittenRecords = damage.overwritten_records;
  if (
    ruinedBuildings.length === 0 &&
    ruinedCells.length === 0 &&
    suspensions.length === 0 &&
    overwrittenRecords.length === 0
  ) {
    return null;
  }
  const withheld = suspendedCapacity(suspensions);
  const liftBill = suspensions.reduce((sum, row) => sum + row.liftCost, 0);
  const total = crisisRepairCost(damage, prices) + liftBill;
  const groundCost = ruinedCells.length * prices.per_cell;
  const affordable = (cost: number): boolean => spendable === null || spendable >= cost;
  // The cheapest thing on the panel, which is what "you cannot do anything here yet" means
  // now that the ground is one bill. Read off what is actually offered rather than assumed
  // to be the per-cell price: with every building already repaired, the ground bill IS the
  // cheapest thing, and a broke line keyed to 3 would have gone quiet exactly then. A lift
  // is per-building like a rebuild, so each of them is its own candidate.
  const cheapest = Math.min(
    ...[
      ...(ruinedBuildings.length > 0 ? [prices.per_building] : []),
      ...(ruinedCells.length > 0 ? [groundCost] : []),
      ...suspensions.map((row) => row.liftCost),
    ],
  );

  return (
    // The accessible name is the STABLE words rather than the counts, so a screen-reader
    // user can find the region again after a repair has changed the numbers in its heading.
    <section className="hud hud-repairs" aria-label="Crisis damage">
      <div className="hud-repairs-head">
        <span className="micro-label">Crisis damage</span>
        {/*
          THE HEADING COUNTS BUILDINGS AND NOTHING ELSE. It used to read
          "5 in ruins · 72 cells scarred", which put a unit nobody thinks in at the top of
          the view and made the first thing a player read the largest number on the panel.
          What the ground cost is said once, on the ground's own line, where it is payable.
        */}
        <h2 id="city-repairs-title">
          {ruinedBuildings.length > 0
            ? `${ruinedBuildings.length} building${ruinedBuildings.length === 1 ? "" : "s"} in ruins`
            : suspensions.length > 0
              ? `${suspensions.length} building${suspensions.length === 1 ? "" : "s"} shut`
              : overwrittenRecords.length > 0
                ? "The public record is marked"
                : "Every building came through"}
        </h2>
      </div>

      {/* BUILDINGS FIRST, and nothing between them and the heading — not even the bill,
          which is bookkeeping and now sits under the things it is the total of. */}
      {ruinedBuildings.length > 0 && (
        <ul
          className="hud-repairs-list"
          aria-label="Buildings in ruins"
          data-repair-section="buildings"
        >
          {ruinedBuildings.map((record) => (
            <li key={record.node_id}>
              <span className="hud-repairs-what">{placementLabel(record.node_id)}</span>
              <button
                type="button"
                className="city-action hud-repairs-action"
                disabled={onRepair === null || !affordable(prices.per_building)}
                onClick={() => onRepair?.({ kind: "building", nodeId: record.node_id })}
              >
                {`Repair for ${prices.per_building} ${materialWord(eraId)}`}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* CIVIC BUILDINGS A CRISIS SHUTTERED. Per-item like the rebuilds above and for the
          same reason: they differ from each other, and which one you can afford to reopen
          first is a real choice. Each row NAMES WHAT IS BEING WITHHELD, because a
          suspension is invisible on the balance sheet otherwise — the building is still
          standing, so a player looking at a livability figure that does not add up would be
          counting a building the city is not counting. `@cr/economy`'s
          `civicSuspendedCapacity` exists for exactly that sentence and says so. */}
      {suspensions.length > 0 && (
        <ul
          className="hud-repairs-list"
          aria-label="Buildings shut by a crisis"
          data-repair-section="suspended"
        >
          {suspensions.map((row) => (
            <li key={row.placementId} data-suspended-placement={row.placementId}>
              <p className="hud-repairs-ground-what">
                <span className="hud-repairs-what">{row.name}</span>
                <span>
                  Shut, so the city is doing without {withheldPhrase(row)}. The building is
                  still yours.
                </span>
              </p>
              <button
                type="button"
                className="city-action hud-repairs-action"
                disabled={onRepair === null || !affordable(row.liftCost)}
                onClick={() => onRepair?.({ kind: "civic", placementId: row.placementId })}
              >
                {`Reopen for ${row.liftCost} ${materialWord(eraId)}`}
              </button>
            </li>
          ))}
        </ul>
      )}

      {overwrittenRecords.length > 0 && (
        <ul
          className="hud-repairs-list"
          aria-label="Overwritten public records"
          data-repair-section="records"
        >
          {overwrittenRecords.map((record) => (
            <li key={record.damage_id} data-record-placement={record.placement_id}>
              <p className="hud-repairs-ground-what">
                <span className="hud-repairs-what">The Civic Archive Relay</span>
                <span>
                  {record.bands_dark} of nine bands are still the counterfeit's. It
                  withholds nothing.
                </span>
              </p>
              {record.verification_attempted ? (
                <span className="hud-repairs-what">Verification used</span>
              ) : (
                <button
                  type="button"
                  className="city-action hud-repairs-action"
                  disabled={onVerifyRecord === null}
                  onClick={() => onVerifyRecord?.(record)}
                  aria-label="Verify the record. Three questions. One band comes back for each one you get right. One attempt, and leaving it costs nothing."
                >
                  Verify the record
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* GROUND, AGGREGATED — one line, one price, one press. It is named as land and not as
          coordinates, and it keeps saying that the loss is permanent until it is bought back,
          because "Pull everyone inward" gave this ground up as a choice the player made. */}
      {ruinedCells.length > 0 && (
        // STILL A LABELLED LIST, and still `Scarred ground`, so a screen-reader user finds the
        // ground work exactly where it was. What changed is that the list has ONE item however
        // wide the band is, which is the whole of the fix stated in the accessibility tree.
        <ul
          className="hud-repairs-list hud-repairs-ground"
          aria-label="Scarred ground"
          data-repair-section="ground"
        >
          <li>
            <p className="hud-repairs-ground-what">
              <span className="hud-repairs-what">Scarred ground</span>
              <span>
                {ruinedCells.length} cell{ruinedCells.length === 1 ? "" : "s"} of the
                island, unbuildable and un-roadable until they are reclaimed.
              </span>
            </p>
            <button
              type="button"
              className="city-action hud-repairs-action"
              disabled={onReclaimGround === null || !affordable(groundCost)}
              onClick={() => onReclaimGround?.()}
            >
              {`Reclaim all ${ruinedCells.length} for ${groundCost} ${materialWord(eraId)}`}
            </button>
          </li>
        </ul>
      )}

      {/* THE RUIN SENTENCE IS SCOPED TO CITIES THAT HAVE ONE. It read unconditionally, and
          the first frame of a suspension-only city caught it promising that "a ruined
          building is still yours, and its lesson is still one click away" over an island
          with nothing ruined on it — reassurance about a loss the player has not had, which
          is its own small lie. The suspension line is scoped the same way. */}
      <p className="hud-repairs-total">
        {total > 0
          ? `${total} ${materialWord(eraId)} to put the physical damage back. `
          : ""}
        Every lesson and every star is untouched.
        {ruinedBuildings.length > 0
          ? " A ruined building is still yours, and its lesson is still one click away in Build's Built shelf."
          : ""}
        {withheld.livability + withheld.happiness > 0
          ? ` While the shutters are up, City life is short of ${withheldPhrase(withheld)}.`
          : ""}
      </p>

      {/*
        THE WAY OUT FOR A PLAYER WITH NOTHING. A repair is refused with nothing spent when
        the stockpile will not cover it, so the buttons above are dimmed rather than
        misleading — and this line is what turns a dimmed button into an instruction. It is
        true because a ruin is a state and not a removal: the buildings are still here, so
        their practice is still earnable, so the material is still earnable.
      */}
      {spendable !== null && Number.isFinite(cheapest) && spendable < cheapest && (
        <p className="hud-repairs-broke">
          You have {spendable} {materialWord(eraId)}. Practise any skill you have built
          (every practice set pays) and come back.
        </p>
      )}
    </section>
  );
}

interface BuiltRosterProps {
  listId: string;
  placedCount: number;
  total: number;
  skills: readonly CityBuildingView[];
  placedByNode: ReadonlyMap<string, PlacedTransform>;
  selectedNodeId: string | null;
  /**
   * Buildings a crisis has left in ruins. A RUIN IS A BADGE ON THE ROW, never a row
   * removed: the row is still here, still activates the lesson menu, and still reports the
   * skill's own progress.
   */
  ruinedNodeIds: ReadonlySet<string>;
  buttonRefs: { current: Map<string, HTMLButtonElement> };
  onActivate: (nodeId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  /** Whether the island HUB is present (pre-seeded, so normally always true). */
  townHallPresent: boolean;
  townHallProgress: string;
  townHallBtnRef: { current: HTMLButtonElement | null };
  onActivateTownHall: () => void;
  crisisHasTheIsland: boolean;
  /** The era whose dressing subtitle each row carries (D-ERA29). */
  eraId: EraId;
}

interface BuildingsDisclosureProps extends BuiltRosterProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  disclosureBtnRef: { current: HTMLButtonElement | null };
}

/**
 * The Build panel's Built subsection. It reuses the complete roster and preserves the same
 * roving arrow-key selection (Up/Down/Left/Right/Home/End via `onKeyDown`),
 * `aria-pressed` state, and activation (placed → select + focus camera; unplaced →
 * start placement). Opening moves focus to the selected (or first) building. Escape
 * collapses this inner disclosure and restores focus to its summary without closing the
 * Build dialog around it.
 */
function BuildingsDisclosure({
  open,
  onToggle,
  onClose,
  listId,
  placedCount,
  total,
  skills,
  placedByNode,
  selectedNodeId,
  ruinedNodeIds,
  buttonRefs,
  onActivate,
  onKeyDown,
  disclosureBtnRef,
  townHallPresent,
  townHallProgress,
  townHallBtnRef,
  onActivateTownHall,
  crisisHasTheIsland,
  eraId,
}: BuildingsDisclosureProps) {
  // Opening moves focus to the selected option (or the first). Closing restores
  // the trigger via the caller's `onClose`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only on open/close.
  useEffect(() => {
    if (!open) {
      return;
    }
    // The selected row wins; with no selection, the hub leads the Built shelf, then
    // the first skill is the fallback for a rare unfounded surface.
    if (townHallPresent && selectedNodeId === TOWN_HALL_ID) {
      townHallBtnRef.current?.focus();
      return;
    }
    const selected = selectedNodeId ? buttonRefs.current.get(selectedNodeId) : undefined;
    if (selected) {
      selected.focus();
      return;
    }
    if (townHallPresent) {
      townHallBtnRef.current?.focus();
      return;
    }
    const target = buttonRefs.current.get(skills[0]?.node_id ?? "");
    target?.focus();
  }, [open]);

  return (
    <section className="build-shop-built" aria-label="Completed buildings">
      <button
        type="button"
        className="build-shop-built-toggle"
        aria-expanded={open}
        aria-controls={listId}
        ref={disclosureBtnRef}
        onClick={onToggle}
      >
        <HudIcon name={open ? "chevron-down" : "chevron-up"} />
        <HudIcon name="building" />
        <span>Built</span>
        <span className="build-shop-built-count">
          {placedCount}/{total}
        </span>
      </button>
      {open && (
        // biome-ignore lint/a11y/useSemanticElements: a disclosure region grouping the reused roster controls; role="group" is valid here and a fieldset's form chrome is not.
        <div
          className="build-shop-built-panel"
          id={listId}
          role="group"
          aria-label="Built"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }}
        >
          {/* The island HUB is a real, labelled, focusable roster entry — DISTINCT
              from the six skill plots and excluded from the N/6 count (it is not a
              skill). Pre-seeded, so present from the start. Design §9. */}
          {townHallPresent && (
            // biome-ignore lint/a11y/useSemanticElements: a labelled hub region grouping the single island-hub control; role="group" is valid ARIA and a <fieldset>'s form chrome is inappropriate here.
            <div className="city-hub-entry" role="group" aria-label="Island hub">
              <button
                type="button"
                className="city-plot city-plot--hub"
                aria-pressed={selectedNodeId === TOWN_HALL_ID}
                data-node-id={TOWN_HALL_ID}
                data-testid="town-hall-roster-entry"
                ref={townHallBtnRef}
                disabled={crisisHasTheIsland}
                onClick={onActivateTownHall}
              >
                <span className="city-plot-heading">
                  <span className="city-plot-node">{TOWN_HALL_LABEL}</span>
                  {buildingSubtitle(TOWN_HALL_ID, eraId) ? (
                    <span className="city-plot-dressing">
                      {buildingSubtitle(TOWN_HALL_ID, eraId)}
                    </span>
                  ) : null}
                </span>
                <span className="city-plot-name">The island hub</span>
                <span className="city-plot-status">
                  <span className="city-plot-state" data-state="hub">
                    Built
                  </span>
                </span>
                <span className="city-plot-progress">
                  {townHallProgress} skills complete
                </span>
              </button>
            </div>
          )}
          <ul className="city-plot-list" aria-label="Buildings">
            {skills.map((building, index) => {
              const placed = placedByNode.has(building.node_id);
              const state: ConstructionState | "empty" = placed
                ? building.construction_state
                : "empty";
              const ruined = placed && ruinedNodeIds.has(building.node_id);
              return (
                <li key={building.node_id}>
                  <button
                    type="button"
                    className="city-plot"
                    aria-pressed={building.node_id === selectedNodeId}
                    data-node-id={building.node_id}
                    data-state={state}
                    data-empty={placed ? undefined : "true"}
                    data-ruined={ruined ? "true" : undefined}
                    data-archetype={building.archetype.id}
                    ref={(element) => {
                      if (element) {
                        buttonRefs.current.set(building.node_id, element);
                      } else {
                        buttonRefs.current.delete(building.node_id);
                      }
                    }}
                    disabled={crisisHasTheIsland}
                    onClick={() => onActivate(building.node_id)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                  >
                    {/* Learner-facing labels only: the STABLE building name leads,
                        this era's dressing sits beside it, and the human SKILL topic
                        sits under both. The raw `node_id` (NUM.S, NUM.F, …) is an
                        internal registry id and is kept out of the UI — it survives
                        only as the `data-node-id` hook.

                        The dressing is NOT `aria-hidden` (D-ERA29): this row's
                        accessible name is the concatenation of its spans, so putting
                        the dressing after the stable name is what keeps the handle
                        the LEADING token while still announcing the era flavour. An
                        era with no authored dressing renders nothing extra. */}
                    <span className="city-plot-heading">
                      <span className="city-plot-node">
                        {buildingName(building.node_id)}
                      </span>
                      {buildingSubtitle(building.node_id, eraId) ? (
                        <span className="city-plot-dressing">
                          {buildingSubtitle(building.node_id, eraId)}
                        </span>
                      ) : null}
                    </span>
                    <span className="city-plot-name">
                      {skillDisplayName(building.node_id)}
                    </span>
                    {placed ? (
                      <>
                        <span className="city-plot-status">
                          <span className="city-plot-state" data-state={state}>
                            {CONSTRUCTION_STATE_LABEL[building.construction_state]}
                          </span>
                          {/* The ruin rides BESIDE the construction state rather than
                              replacing it, because they are different facts and the row owes
                              both: the building is still Complete (its lesson is done, its
                              stars are its stars) AND it is in ruins. */}
                          {ruined && (
                            <span className="city-plot-ruin" data-ruined="true">
                              In ruins · repairable
                            </span>
                          )}
                        </span>
                        {/* "4 of 5" reads as a target next to an unfinished row and
                            as a SCORE next to a Complete one, so a tested-out
                            building — Complete at mastery 0, zero items answered —
                            names how it got built instead (#103). */}
                        <span className="city-plot-progress">
                          {building.tested_out ? (
                            "Tested out"
                          ) : (
                            <>
                              {building.progress.required_correct} of{" "}
                              {building.progress.set_size}
                            </>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="city-plot-status">
                          <span className="city-plot-state" data-state="empty">
                            Not built
                          </span>
                        </span>
                        <span className="city-plot-progress">Ready to build</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * THE BUILD MENU'S TAB STRIP, AND THE ONE PLACE ITS ORDER IS DECIDED.
 *
 * Written down rather than derived, and it has to be: the three categories come from
 * three unrelated sources (the D1 teaching order, the civic catalogue, one road tile
 * price), so there is no catalogue or enum that could rank them. What matters is that
 * this is the ONLY ranking — the strip maps over this array and the tabpanel branches on
 * ids, so nothing anywhere renders a second order that could drift from it.
 *
 * `heading` retitles the dialog for the active tab (the shop sells more than skills now);
 * a tab without one keeps the default title.
 *
 * ## CIVIC SITS AHEAD OF ROADS, and Decorations and Defences are gone
 *
 * Both ruled by the team lead on 2026-08-04 off a running build: *"remove decorations and
 * defenses from the option list"* and *"move civic ahead of roads"*.
 *
 * **What the two removed tabs were: empty placeholders, and nothing else.** They shipped
 * `enabled: false` with a "Soon" pip and no catalogue behind either of them; selecting one
 * was impossible and the panel behind them said *"Decorations buildings are on the way"*.
 * So this is not a scope cut and no catalogue row had to be decided — it is two doors
 * removed that opened onto nothing. Nothing else in the tree referenced either id; the
 * only other mention was `work-log/evan.md`, which had already flagged the Decorations tab
 * as a naming collision with the (since-deleted) cosmetic Shop and left it for a decision.
 *
 * **The `enabled` field stays, deliberately, with no false member today.** It is what
 * `buildMenuCategoriesAreLive.test.tsx` measures against: a guard saying "every category
 * in this strip can be entered" over a codebase that could not express a dead one would be
 * unfalsifiable, and one `enabled: false` here is the injection that proves it red.
 */
const BUILD_TABS: readonly {
  id: CityBuildEntryCategory;
  label: string;
  enabled: boolean;
  heading?: string;
  /**
   * Whether this category's catalogue grows by ERA, and so gets the era rail
   * ({@link EraRail}). One field rather than a check on the tab id, so the Civic tab
   * opts in by flipping it the day its later-era rows are wired: `CIVIC_TYPE_IDS` is
   * era one's four today and the catalogue is four rows per era thereafter (D-ERA11),
   * so that tab reaches forty rows on the same curve the Lessons tab is on.
   */
  eraAxis?: boolean;
}[] = [
  {
    id: "lessons",
    label: "Lessons",
    enabled: true,
    heading: "Choose a skill to build",
    eraAxis: true,
  },
  // ENABLED 2026-07-29, MOVED AHEAD OF ROADS 2026-08-04. This tab shipped disabled with a
  // "Soon" pip because era one's catalogue was `PROPOSED` and there was no way to buy
  // anything; the catalogue is now ruled (era one civic-buildings.md §7: *"Nothing here is
  // open"*) and `placeCivic` exists, so the tab it was always for is the tab it is — and
  // it now sits where the lead put it, second, between the lessons and the paving.
  {
    id: "civic",
    label: "Civic",
    enabled: true,
    heading: "Buy a building for your people",
  },
  { id: "roads", label: "Roads", enabled: true, heading: "Pave roads across the island" },
];

/**
 * THE ERA RAIL — the build menu's second axis, under the category tabs.
 *
 * The categories say what KIND of thing you are buying; this says WHICH CHAPTER raised
 * it. It opens on the era the city is standing in, so the buildings an advance just gave
 * a player are the first thing in the panel rather than the last.
 *
 * ## It is the category tablist's grammar, deliberately, and its own shape
 *
 * Same roles, same roving tabindex, same `aria-disabled`-never-`disabled` rule — a
 * `disabled` button drops focus and strands a keyboard user mid-strip, which is a defect
 * this repo has now found twice. What differs is the SHAPE: the categories are underlined
 * tabs and the eras are filled pills, because two identical strips stacked would read as
 * one control that had wrapped. Nothing new enters the palette; the selected pill is the
 * same `--game-blue` the selected category tab underlines itself with.
 *
 * ## Eras a player has not reached do not appear
 *
 * The rail is drawn from the roster, which is eras one..N inclusive, so it grows by one
 * pill per advance and never shows a chapter the player has not played. That is the whole
 * answer to "ten tabs, eight of them empty": there is no era ten pill on era two's
 * island, so there is no empty panel to click into and no `aria-disabled` pill to explain.
 *
 * ## What it says out loud
 *
 * The canvas is `aria-hidden`, so the pill's accessible name is doing real work: it is the
 * era's name plus how many of that era's buildings are still to build ("Prehistoric Era,
 * 2 still to build"). That count is why leaving era one behind is safe — a player standing
 * in era two can see, without changing anything, that era one still owes them two
 * buildings. The visible pip is the bare numeral; the words are for the screen reader.
 */
function EraRail({
  groups,
  activeEra,
  onSelect,
}: {
  groups: readonly BuildMenuEraGroup[];
  activeEra: EraId;
  onSelect: (eraId: EraId) => void;
}) {
  const [focusEra, setFocusEra] = useState(() =>
    Math.max(
      0,
      groups.findIndex((group) => group.era.id === activeEra),
    ),
  );
  const railRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = rovingTarget(event.key, focusEra, groups.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    setFocusEra(next);
    railRefs.current[next]?.focus();
  };

  return (
    <div
      className="build-era-rail"
      role="tablist"
      aria-label="Era"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
    >
      {groups.map((group, index) => {
        const toBuild = group.entries.filter((entry) => !entry.built).length;
        return (
          <button
            key={group.era.id}
            type="button"
            role="tab"
            id={`build-era-tab-${group.era.id}`}
            className="build-era-pill"
            data-era={group.era.id}
            aria-selected={activeEra === group.era.id}
            aria-controls="build-tabpanel"
            // The name is spelled out rather than composed from the pip, which is
            // `aria-hidden`: composing it puts a space before the comma ("Prehistoric
            // Era , all built"), and the era's own name still opens the label, so a
            // speech-recognition user can still say what they can see.
            aria-label={
              toBuild > 0
                ? `${group.era.name}, ${toBuild} still to build`
                : `${group.era.name}, all built`
            }
            tabIndex={focusEra === index ? 0 : -1}
            ref={(element) => {
              railRefs.current[index] = element;
            }}
            onClick={() => {
              setFocusEra(index);
              onSelect(group.era.id);
            }}
          >
            {group.era.name}
            {toBuild > 0 && (
              <span className="build-era-pill-count" aria-hidden="true">
                {toBuild}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One lesson card, in one of three states. A BUILT card (the building is already
 * placed on the island) shows a de-emphasized "Built" state — a check badge on the
 * thumbnail and a slate "Built" tag — and can never be re-built; activating it
 * opens that building's lesson instead of starting a placement. A LOCKED card (a
 * prerequisite building isn't complete yet) shows the Clash-of-Clans locked state —
 * greyed, a padlock over the thumbnail, and a "Complete <prereq> first" hint — and
 * cannot be built (`aria-disabled`; activating it announces the reason). Otherwise
 * the card is ready to build. Cards share ONE tab stop for the horizontally-
 * scrolling row via a roving tabindex: only the focused card is tabbable, and the
 * row's arrow-key handler moves focus + scrolls it into view.
 */
function BuildCard({
  entry,
  showThumbnail,
  focused,
  buttonRef,
  onChoose,
  onLockedActivate,
  onBuiltActivate,
}: {
  entry: BuildMenuEntry;
  showThumbnail: boolean;
  focused: boolean;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onChoose: (nodeId: string) => void;
  onLockedActivate: (entry: BuildMenuEntry) => void;
  onBuiltActivate: (nodeId: string) => void;
}) {
  const activate = () => {
    if (entry.built) {
      onBuiltActivate(entry.nodeId);
    } else if (entry.locked) {
      onLockedActivate(entry);
    } else {
      onChoose(entry.nodeId);
    }
  };
  return (
    <li
      className="build-card"
      data-node-id={entry.nodeId}
      data-built={entry.built ? "true" : undefined}
      data-locked={entry.locked ? "true" : undefined}
    >
      <div className="build-card-thumb" aria-hidden="true">
        {/* Live 3D preview of the finished skill building. */}
        {showThumbnail ? (
          <Suspense
            fallback={
              <span className="build-card-thumb-fallback">
                <HudIcon name="building" />
              </span>
            }
          >
            <BuildingThumb nodeId={entry.nodeId} />
          </Suspense>
        ) : (
          <span className="build-card-thumb-fallback">
            <HudIcon name="building" />
          </span>
        )}
        {entry.built ? (
          <span className="build-card-built-badge">
            <HudIcon name="check" />
          </span>
        ) : entry.locked ? (
          <span className="build-card-lock">
            <HudIcon name="lock" />
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="build-card-cta"
        data-node-id={entry.nodeId}
        tabIndex={focused ? 0 : -1}
        aria-disabled={entry.locked || undefined}
        onClick={activate}
        ref={buttonRef}
      >
        <span className="build-card-name">{entry.name}</span>
        {entry.lessonTitle && (
          <span className="build-card-lesson">{entry.lessonTitle}</span>
        )}
        {entry.built ? (
          <span className="build-card-tag build-card-tag--built">
            <HudIcon name="check" />
            Built
          </span>
        ) : entry.locked ? (
          <span className="build-card-tag build-card-tag--locked">
            <HudIcon name="lock" />
            Complete {joinNames(entry.missingPrereqNames)} first
          </span>
        ) : (
          <span className="build-card-tag">Ready to build</span>
        )}
      </button>
    </li>
  );
}

/**
 * The Roads tab's single card — the build menu's entry point into road paint mode,
 * shaped like a lesson card so the tab reads as a native member of the shop. Roads
 * are a REPEATABLE gold sink, so the card never "completes" and is never locked:
 * activating it always opens paint mode, which stays useful with an empty wallet
 * because removing tiles pays gold back. Affordability is advisory here (the paint
 * bar is the fail-closed authority on the spend) — a wallet that can't cover a single
 * tile gets an honest note rather than a disabled card.
 */
function RoadsBuildCard({
  eraId,
  goldAvailable,
  onStart,
}: {
  /** The era the city is standing in — the copy below names its material. */
  eraId: EraId;
  goldAvailable: number | null;
  onStart: () => void;
}) {
  const short = goldAvailable !== null && goldAvailable < ROAD_TILE_GOLD_COST;
  return (
    <li className="build-card build-card--roads" data-node-id="roads">
      <div className="build-card-thumb" aria-hidden="true">
        <span className="build-card-thumb-fallback">
          <HudIcon name="road" />
        </span>
      </div>
      <button
        type="button"
        className="build-card-cta"
        data-node-id="roads"
        onClick={onStart}
      >
        <span className="build-card-name">Roads</span>
        <span className="build-card-lesson">
          Trace paths across the island to join your buildings up. Click any tile later to
          take it back up for a full refund.
        </span>
        <span className="build-card-tag build-card-tag--cost">
          <HudIcon name="gem" />
          {ROAD_TILE_GOLD_COST} {materialWord(eraId)} per tile
        </span>
        {short && (
          <span className="build-card-tag build-card-tag--locked">
            Practise a skill to earn enough for a tile
          </span>
        )}
      </button>
    </li>
  );
}

/**
 * One CIVIC card: a type from era one's catalogue, priced in the era material, with
 * what it provides read as A QUANTITY OF A NAMED STATISTIC.
 *
 * ── THE STATISTIC IS NAMED, AND ITS ICON IS THE PANEL'S OWN ───────────────────
 *
 * The clauses read `40 Livability` and `10 Happiness`, each behind the glyph the CITY
 * LIFE panel labels that row with: `HudIcon name="home"` for livability, and
 * `CityVitalityPanel`'s own {@link HappinessFace} for happiness. Ruled by the team lead
 * off a running build — *"instead of saying 'sustains 40 more' it should say like '40
 * Livability' with an associated livability icon. likewise with happiness; it should have
 * some kind of emoticon so that its more obvious."*
 *
 * **THE TIE IS THE FEATURE, not the decoration.** What the icon buys is that a learner
 * reading a card knows WHICH NUMBER IN THE PANEL is about to move, so it is only worth
 * anything while it is the same glyph in both places. That is why the face is imported
 * rather than redrawn: two similar faces in two files are two glyphs free to drift, and
 * the tie would quietly stop being true without either one looking wrong. `home` and the
 * face are the panel's choices, checked against the one open branch touching that panel
 * (#500, which adds a distress `alert` and leaves both of these alone).
 *
 * The face wears a FIXED `content` mouth here, and that is the one place the card and the
 * panel deliberately differ. The panel's mouth is a READING — it tracks the band the city
 * is actually in — whereas a card is quoting what a purchase adds, which has no band. A
 * smile is the honest picture of "+10 Happiness" and it is the mouth that reads as an
 * emoticon at card size; the outline, the eyes and the stroke weight are shared, which is
 * what carries the recognition.
 *
 * IT STATES BOTH CAPACITIES, ALWAYS, INCLUDING THE ZERO. The four types differ mostly
 * in their MIX (D-ERA24's third axis), and a card that printed only its non-zero dial
 * would make the Smokehouse and the Longhouse look like the same building at the same
 * price — which is precisely the collapse #236's rebalance was for. The Longhouse's 5
 * happiness is the whole of era one's rebalance, so it has to be readable on the card
 * that sells it.
 *
 * THE PLOT SIZE STAYS, unpictured and in words. *"2×1 plot"* is the land half of the
 * trade the catalogue is built around — era two pays its steepest premium for a saved
 * cell — so it is the one clause on this line that is not a city statistic and does not
 * want a glyph.
 *
 * UNAFFORDABLE IS A NOTE, NOT A DISABLED BUTTON, following `RoadsBuildCard`: the card
 * stays activatable and says what is short, because a silently dead control is the one
 * thing a learner cannot debug. The atomic session write is the authority either way.
 *
 * IT PREVIEWS ITS BUILDING THROUGH THE SAME `BuildingThumb` THE LESSON CARDS USE, not a
 * second preview mechanism: one component, one canvas grammar, one place a change to how
 * a card looks lands. Only the SUBJECT differs (`civicType` rather than `nodeId`), which
 * routes the lookup through `resolveCivicModel` at the `built` stage — the only stage a
 * bought building has.
 *
 * WHAT IS DELIBERATELY NOT CARRIED OVER FROM THE LESSON CARD. `BuildCard` overlays a
 * check badge, a padlock and a "Ready to build" / "Complete X first" tag on its
 * thumbnail; all three presume a lesson, a prerequisite chain and a mastery ladder, and a
 * civic type has none of the three. Twice today machinery written for mastery-built
 * buildings has misdescribed bought ones (an empty 0-of-3 star rack, a false "not built
 * yet"), so the civic thumb is the preview and nothing else: no badge, no lock, no state.
 * The preview is also purely DECORATIVE — the `aria-hidden` box means the row's
 * accessible name stays the name, the price and the two contributions on the button.
 */
function CivicBuildCard({
  option,
  showThumbnail,
  materialAvailable,
  materialLabel,
  focused,
  buttonRef,
  onChoose,
}: {
  option: CivicOption;
  showThumbnail: boolean;
  materialAvailable: number | null;
  materialLabel: string;
  focused: boolean;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onChoose: (buildingId: CivicBuildingId) => void;
}) {
  const { row, modelType } = option;
  const short = materialAvailable !== null && materialAvailable < row.cost;
  /*
    THE SHORTFALL LEADS WITH THE STOCKPILE, not with the refusal. It read "Not enough
    {material} yet: you have {n}", which put the shortfall in front of the fact and is
    what `test/cityCopyRegister.test.ts` exists to stop; it survived because the sentence
    is JSX text and that sweep used to read only string literals. The grammar is the one
    `CrisisRepairPanel`'s broke line already uses ("You have 12 stone. Practise any skill
    ...") and the one `civicUnaffordableMessage` announces, so the card, the panel and the
    live region now say the same thing the same way round.

    IT ALSO SAYS BY HOW MUCH, which the old line only implied: the price is in the tag
    directly above, so a learner had to subtract to find out what the wait costs them.
   */
  const toGo = row.cost - (materialAvailable ?? 0);
  const provides = [
    row.provides.livability > 0
      ? {
          key: "livability",
          icon: <HudIcon name="home" />,
          quantity: `${row.provides.livability} Livability`,
        }
      : null,
    row.provides.happiness > 0
      ? {
          key: "happiness",
          icon: <HappinessFace band="content" />,
          quantity: `${row.provides.happiness} Happiness`,
        }
      : null,
  ].filter((clause): clause is NonNullable<typeof clause> => clause !== null);
  return (
    <li className="build-card build-card--civic" data-node-id={row.id}>
      <div className="build-card-thumb" aria-hidden="true">
        {/* Live 3D preview of the building being sold — the lesson cards' component. */}
        {showThumbnail ? (
          <Suspense
            fallback={
              <span className="build-card-thumb-fallback">
                <HudIcon name="home" />
              </span>
            }
          >
            <BuildingThumb civicType={modelType} />
          </Suspense>
        ) : (
          <span className="build-card-thumb-fallback">
            <HudIcon name="home" />
          </span>
        )}
      </div>
      <button
        type="button"
        className="build-card-cta"
        data-node-id={row.id}
        data-testid={`civic-card-${row.id}`}
        tabIndex={focused ? 0 : -1}
        ref={buttonRef}
        onClick={() => onChoose(row.id)}
      >
        <span className="build-card-name">{row.name}</span>
        {/* A WRAPPING FLEX ROW, and not the "·"-joined sentence this used to be, which is
            a layout fix the first frame at 1024x580 forced. An inline-flex clause takes
            its baseline from the svg inside it, so the statistic sat a couple of pixels
            above the plain text after it and the separators dangled at the ends of
            wrapped lines, reading as full stops. As flex items every clause aligns on one
            axis, and a clause is a whole item so it can never break between its glyph and
            its figure. The separator is gone with the mechanism that broke: the glyph
            opens each statistic and the plot clause is the muted one, so the boundaries
            are carried by weight and colour rather than by punctuation. */}
        <span className="build-card-lesson build-card-provides">
          {provides.map((clause) => (
            <span className="build-card-stat" key={clause.key}>
              {clause.icon}
              {clause.quantity}
            </span>
          ))}
          <span className="build-card-plot">
            {row.footprint.width}×{row.footprint.depth} plot
          </span>
        </span>
        {/* `gem` and not `building`: this is a PRICE, and `gem` is what the economy HUD
            labels the material stockpile with (`EconomyHud.tsx`) and what the roads
            card's own price tag already wears. It used to be `building`, which is the
            glyph the city life panel labels POPULATION with — harmless while nothing on
            the card pointed at that panel, and a collision the moment the line above
            started doing exactly that. */}
        <span className="build-card-tag build-card-tag--cost">
          <HudIcon name="gem" />
          {row.cost} {materialLabel}
        </span>
        {short && (
          <span
            className="build-card-tag build-card-tag--locked"
            data-testid={`civic-card-short-${row.id}`}
          >
            You have {materialAvailable} {materialLabel}: {toGo} to go
          </span>
        )}
      </button>
    </li>
  );
}

/**
 * The build menu ("shop"), on the Clash-of-Clans "Buildings & Traps" layout: a top
 * tab bar (Lessons, Roads, plus disabled "coming soon" placeholders) over a
 * HORIZONTALLY-SCROLLABLE, centered single row of cards. The row scrolls left/right
 * and its cards sit vertically centered in the panel. Lesson cards are ORDERED by
 * the D1 teaching sequence (foundations first) and PREREQUISITE-LOCKED (a card stays
 * greyed + padlocked until its prerequisite buildings are complete). Each card
 * carries a live 3D preview of the finished building, its city-narrative name, and
 * the lesson it teaches.
 *
 * ROADS is a peer tab, not a special case: selecting it only SHOWS the roads card
 * (it does not enter paint mode), so the tab strip survives arrow-key browsing and
 * the player can switch back. Activating the card is what opens road paint mode —
 * the same grammar as a lesson card opening building placement — and, like a
 * placement, that closes the menu. The two modes therefore can never overlap.
 *
 * ERA IS THE SECOND AXIS, and it is a strip rather than a re-ordering ({@link EraRail}).
 * The Lessons catalogue is cumulative — era two's island offers era two's buildings AND
 * era one's, era ten's offers all sixty-two — so a category alone can no longer say what
 * a row should hold. The rail cuts the row to one chapter and opens on the chapter the
 * city is standing in, which is both the ask (the buildings an advance just gave you are
 * not behind the ones you already had) and the only way the previews stay affordable: a
 * card mounts a live WebGL context, the browser allows about sixteen a page, and a
 * cumulative row asks for sixty-two. Roads has one card and no era axis, so it has no
 * rail; the Civic tab will take the same one unchanged when its later-era rows land.
 *
 * Keyboard: each strip is roving (Arrow/Home/End move focus, Enter/Space activate;
 * disabled tabs stay focusable but never selectable) and is one tab stop, so the dialog
 * is category strip, then era strip, then the card row, then Cancel. The card row has its
 * own roving tabindex — Arrow/Home/End move focus between cards and scroll the focused
 * card into view, Enter/Space build an unlocked card (a locked card announces why it
 * can't be built instead). The dialog keeps Escape-to-close, and the tabpanel is labelled
 * by BOTH strips, so it announces as "Lessons, Neolithic Era" rather than just "Lessons".
 */
function BuildShop({
  eraId,
  initialCategory,
  featuredLessonNodeId,
  entries,
  civicOptions,
  builtRoster,
  onChoose,
  onOpenBuilt,
  onStartRoads,
  onChooseCivic,
  onCategoryVisit,
  onClose,
  showThumbnails,
  goldAvailable,
  materialAvailable,
  materialLabel,
}: {
  /**
   * The era the city is standing in. Two consumers, which is why it arrives once rather
   * than as a pair: the roads card names this era's material, and the era rail opens on
   * this era's chapter.
   */
  eraId: EraId;
  initialCategory: CityBuildEntryCategory;
  /** Presenter-only row lead; ordinary learner rows omit it and retain teaching order. */
  featuredLessonNodeId?: string;
  entries: readonly BuildMenuEntry[];
  civicOptions: readonly CivicOption[];
  builtRoster: BuiltRosterProps;
  onChoose: (nodeId: string) => void;
  onOpenBuilt: (nodeId: string) => void;
  onStartRoads: () => void;
  onChooseCivic: (buildingId: CivicBuildingId) => void;
  onCategoryVisit?: (category: string) => void;
  onClose: () => void;
  showThumbnails: boolean;
  goldAvailable: number | null;
  materialAvailable: number | null;
  materialLabel: string;
}) {
  const [activeTab, setActiveTab] = useState<CityBuildEntryCategory>(initialCategory);
  const [focusTab, setFocusTab] = useState(() =>
    Math.max(
      0,
      BUILD_TABS.findIndex((tab) => tab.id === initialCategory),
    ),
  );
  const [focusCard, setFocusCard] = useState(0);
  const [lockedNotice, setLockedNotice] = useState("");
  const [builtOpen, setBuiltOpen] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const builtBtnRef = useRef<HTMLButtonElement | null>(null);
  const rowWheelCleanupRef = useRef<(() => void) | null>(null);
  // A short window cannot hold a card plus this menu's own chrome, and an overlay scrollbar says
  // nothing until something moves. See `.build-shop-more`.
  const { ref: frameRef, more } = useScrollCue<HTMLDivElement>();

  // The cards cut by chapter, in play order. Only skill cards are here (the pre-seeded
  // Town Hall is not placeable, so it has no card); prerequisite locking is carried on
  // each entry already, so no gate override.
  const eraGroups = useMemo(() => groupEntriesByEra(entries), [entries]);

  // The rail opens on the era the city is standing in. The fallback is the LAST reached
  // era rather than the first, so a city whose era somehow rosters nothing still opens on
  // the newest chapter it has — never silently back at era one, which is the state the
  // player is least likely to notice is wrong.
  const [activeEra, setActiveEra] = useState<EraId | null>(null);
  const selectedEra =
    eraGroups.find((group) => group.era.id === activeEra)?.era.id ??
    eraGroups.find((group) => group.era.id === eraId)?.era.id ??
    eraGroups[eraGroups.length - 1]?.era.id ??
    null;
  const activeGroup = eraGroups.find((group) => group.era.id === selectedEra) ?? null;
  const activeCategory = BUILD_TABS.find((tab) => tab.id === activeTab);
  // A category on the era axis shows ONE chapter's cards; anything else shows its whole
  // (small, fixed) catalogue. Keyed on the category's own `eraAxis` field rather than on
  // its id, so the Civic tab joins by flipping that field and nothing here changes.
  const railGroups = activeCategory?.eraAxis ? eraGroups : [];
  const chapterEntries = activeCategory?.eraAxis ? (activeGroup?.entries ?? []) : entries;
  const featuredIndex =
    activeCategory?.eraAxis && featuredLessonNodeId !== undefined
      ? chapterEntries.findIndex((entry) => entry.nodeId === featuredLessonNodeId)
      : -1;
  const shownEntries =
    featuredIndex > 0
      ? [
          chapterEntries[featuredIndex] as BuildMenuEntry,
          ...chapterEntries.slice(0, featuredIndex),
          ...chapterEntries.slice(featuredIndex + 1),
        ]
      : chapterEntries;

  // Open with focus on the active tab — the tablist is the menu's entry point.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only initial focus.
  useEffect(() => {
    tabRefs.current[focusTab]?.focus();
  }, []);

  // Let a vertical mouse wheel scroll the horizontal card row (Clash-of-Clans
  // "Buildings & Traps" feel). React 19 registers `wheel` as a PASSIVE listener
  // at the root, so a synthetic onWheel can't preventDefault — we attach a
  // native, non-passive listener via this callback ref instead. Trackpads
  // already emit a horizontal `deltaX`, so we take whichever axis dominates
  // rather than summing them (no double-apply). When the row is scrolled to an
  // end and the wheel still pushes further outward, we do NOT preventDefault, so
  // the event passes through to scroll the page/menu normally.
  const bindCardRow = useCallback((node: HTMLUListElement | null) => {
    rowWheelCleanupRef.current?.();
    rowWheelCleanupRef.current = null;
    if (!node) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const maxScroll = node.scrollWidth - node.clientWidth;
      // No horizontal overflow → nothing to scroll; let the page handle it.
      if (maxScroll <= 0) {
        return;
      }
      // Dominant axis so a trackpad's native horizontal delta isn't counted
      // twice with the vertical one (a mouse wheel only sends deltaY).
      const rawDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (rawDelta === 0) {
        return;
      }
      // Normalize line/page deltas (some mouse wheels report lines, not pixels).
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1;
      const delta = rawDelta * unit;
      const atStart = node.scrollLeft <= 0;
      const atEnd = node.scrollLeft >= maxScroll - 1;
      // At an end and still pushing outward → let the wheel scroll the page/menu.
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) {
        return;
      }
      event.preventDefault();
      node.scrollLeft = Math.max(0, Math.min(maxScroll, node.scrollLeft + delta));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    rowWheelCleanupRef.current = () => {
      node.removeEventListener("wheel", onWheel);
    };
  }, []);

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = rovingTarget(event.key, focusTab, BUILD_TABS.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    setFocusTab(next);
    tabRefs.current[next]?.focus();
  };

  // Roving arrow-key navigation across the horizontal card row (also the keyboard
  // "scroll", since the focused card is scrolled to the row's center).
  const onCardKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    // The row's length depends on which tab is showing — the selected era's lesson
    // cards, four civic ones. Read from the tab rather than always from `shownEntries`,
    // or arrow-keying the civic row would wrap past its last card onto two focusless
    // indices.
    const count = activeTab === "civic" ? civicOptions.length : shownEntries.length;
    if (count === 0) {
      return;
    }
    const next = rovingTarget(event.key, focusCard, count);
    if (next === null) {
      return;
    }
    event.preventDefault();
    setFocusCard(next);
    const button = cardRefs.current[next];
    button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "center" });
  };

  const announceLocked = (entry: BuildMenuEntry) => {
    setLockedNotice(
      `${entry.name} is locked. Complete ${joinNames(entry.missingPrereqNames)} first.`,
    );
  };

  const closeBuilt = () => {
    setBuiltOpen(false);
    builtBtnRef.current?.focus();
  };

  return (
    <div
      className="build-shop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-shop-title"
      // The cue floats over the frame's bottom edge, so the frame gives it a band to sit in
      // rather than letting it cover a card's own name. See `.build-shop-more`.
      data-more={more ? "true" : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="build-shop-frame" ref={frameRef}>
        <header className="build-shop-head">
          <div>
            <span className="micro-label">Build menu</span>
            <h2 id="build-shop-title">
              {activeCategory?.heading ?? "Choose a skill to build"}
            </h2>
          </div>
          <button
            type="button"
            className="city-icon-button"
            aria-label="Close build menu"
            onClick={onClose}
          >
            <HudIcon name="close" />
          </button>
        </header>

        <BuildingsDisclosure
          {...builtRoster}
          open={builtOpen}
          onToggle={() => setBuiltOpen((open) => !open)}
          onClose={closeBuilt}
          disclosureBtnRef={builtBtnRef}
        />

        <div
          className="build-shop-tabs"
          role="tablist"
          aria-label="Build categories"
          onKeyDown={onTabKeyDown}
        >
          {BUILD_TABS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`build-tab-${tab.id}`}
              className="build-tab"
              aria-selected={activeTab === tab.id}
              aria-controls="build-tabpanel"
              aria-disabled={tab.enabled ? undefined : true}
              data-disabled={tab.enabled ? undefined : "true"}
              tabIndex={focusTab === index ? 0 : -1}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              onClick={() => {
                setFocusTab(index);
                if (tab.enabled) {
                  setActiveTab(tab.id);
                  onCategoryVisit?.(tab.id);
                  // The rows are different lengths, so a card index carried across a
                  // tab switch can point past the end of the new row and leave the
                  // roving tabindex with nothing focusable on it.
                  setFocusCard(0);
                }
              }}
            >
              {tab.label}
              {!tab.enabled && <span className="build-tab-soon">Soon</span>}
            </button>
          ))}
        </div>

        {railGroups.length > 0 && selectedEra !== null && (
          <EraRail
            // Remounted per category, so the rail's roving focus starts on the era the
            // panel is actually showing rather than on wherever it was left in another
            // tab's strip.
            key={activeTab}
            groups={railGroups}
            activeEra={selectedEra}
            onSelect={(next) => {
              setActiveEra(next);
              // The eras are different lengths, so a card index carried across a switch
              // can point past the end of the new row — the same reason the category
              // strip resets it.
              setFocusCard(0);
            }}
          />
        )}

        <div
          className="build-tabpanel"
          role="tabpanel"
          id="build-tabpanel"
          // Named by BOTH strips when there are both, so the panel announces as
          // "Lessons, Neolithic Era" — the era grouping reaches a screen reader as
          // structure rather than as a visual cue it cannot see.
          aria-labelledby={
            railGroups.length > 0 && selectedEra !== null
              ? `build-tab-${activeTab} build-era-tab-${selectedEra}`
              : `build-tab-${activeTab}`
          }
        >
          {activeTab === "roads" ? (
            <ul className="build-card-row" aria-label="Roads to lay">
              <RoadsBuildCard
                eraId={eraId}
                goldAvailable={goldAvailable}
                onStart={onStartRoads}
              />
            </ul>
          ) : activeTab === "civic" ? (
            // The catalogue's own row order, derived from the table rather than written
            // out again (`CIVIC_TYPE_IDS`), so a re-authored catalogue reaches the menu
            // without a second list to keep in step. Its own roving tabindex, the same
            // as the lesson row's, so the four cards are one tab stop.
            civicOptions.length === 0 ? (
              <p className="build-shop-empty">
                This age&apos;s civic buildings are not available yet.
              </p>
            ) : (
              <ul
                className="build-card-row"
                aria-label="Civic buildings to buy"
                onKeyDown={onCardKeyDown}
              >
                {civicOptions.map((option, index) => (
                  <CivicBuildCard
                    key={option.row.id}
                    option={option}
                    showThumbnail={showThumbnails}
                    materialAvailable={materialAvailable}
                    materialLabel={materialLabel}
                    focused={index === focusCard}
                    buttonRef={(element) => {
                      cardRefs.current[index] = element;
                    }}
                    onChoose={onChooseCivic}
                  />
                ))}
              </ul>
            )
          ) : activeCategory?.enabled ? (
            shownEntries.length === 0 ? (
              // Named as a chapter and phrased like its two sibling empty states above and
              // below, both of which already lead with what is coming rather than with what
              // is absent.
              <p className="build-shop-empty">
                This chapter&apos;s buildings are on the way.
              </p>
            ) : (
              <ul
                className="build-card-row"
                // The era is IN the row's name, so a screen-reader user hears which
                // chapter's buildings these are without inspecting the rail.
                aria-label={
                  activeGroup
                    ? `${activeGroup.era.name} skill buildings to place, ${
                        featuredIndex >= 0 ? "Presenter target first" : "in teaching order"
                      }`
                    : "Skill buildings to place, in teaching order"
                }
                // Remounted per era so the wheel binding follows the row it scrolls.
                key={selectedEra ?? activeTab}
                ref={bindCardRow}
                onKeyDown={onCardKeyDown}
              >
                {shownEntries.map((entry, index) => (
                  <BuildCard
                    key={entry.nodeId}
                    entry={entry}
                    showThumbnail={showThumbnails}
                    focused={index === focusCard}
                    buttonRef={(element) => {
                      cardRefs.current[index] = element;
                    }}
                    onChoose={onChoose}
                    onLockedActivate={announceLocked}
                    onBuiltActivate={onOpenBuilt}
                  />
                ))}
              </ul>
            )
          ) : (
            <p className="build-shop-empty">
              {activeCategory?.label ?? "These"} buildings are on the way.
            </p>
          )}
        </div>

        <div className="visually-hidden" aria-live="assertive">
          {lockedNotice}
        </div>

        <button type="button" className="city-action city-action-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>

      {more && (
        <p className="build-shop-more" aria-hidden="true">
          {/* The words carry the cue; the chevron is decoration on an already-hidden
              paragraph, and every card is in the DOM a screen reader reads. */}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 10l6 6 6-6" />
          </svg>
          More below
        </p>
      )}
    </div>
  );
}

/* The ☰ Menu's `CosmeticsPopover` was REMOVED here, not reworded.
 *
 * It said "Coming in the ranked expansion. Keep mastering skills — nothing here is
 * spendable yet." above a seven-item catalog tagged "Coming soon". Every word of that
 * was true when it shipped and none of it is now: the cosmetic economy landed, and a
 * real 24-item Shop with prices, a gold wallet, ownership and equipping sits two chips
 * away in the economy HUD. It was the one surface in the game that actively told a
 * learner a shipped feature did not exist.
 *
 * WHY REMOVED RATHER THAN TURNED INTO A LINK INTO THE SHOP. The Shop chip is already
 * always on screen, beside the gold balance it spends — the obvious place — and the
 * tutorial's `economy` coach-mark now points a first-time learner straight at it. A
 * second entry point buried in a menu adds no discoverability, and adds a surface for
 * exactly this staleness to recur. Nothing the section displayed was worth keeping:
 * its catalog is superseded by the real one, and its "earned rewards" projection
 * described a reward model that no longer exists (see the Town popover above).
 *
 * The engine-side stub that fed it (`cosmetic-preview.ts`, and the
 * `cosmetic_preview` descriptor threaded through `descriptors.ts` /
 * `resolveNeighborhood` / `CityViewModel`) is now unread by the app. It is left in
 * place deliberately: retiring it means changing the generic neighborhood-descriptor
 * contract that the D2 island also resolves through, so it is its own change with its
 * own review surface rather than a rider on a copy fix. The module carries a
 * SUPERSEDED header saying so, and saying not to wire it into new UI. */

/**
 * DEV-only stand-in for the mastery/lesson lane (rendered only when a dev handler
 * is injected). Lists the PLACED skills with up to two lifecycle stand-ins per node,
 * mirroring the real 3-step progression — NOT a game write:
 *  - "Simulate lesson" (`onSimulateLesson`) fires ONLY the lesson-taught transition
 *    (Foundation → Construction), so the building STOPS at the scaffold; it never
 *    completes the building or touches mastery. Locked out once past Foundation.
 *  - "Advance mastery" (`onAdvance`) is the separate PRACTICE step that finishes
 *    construction and records mastery, so it takes the building further (Complete).
 * When `onSetStage` is provided it also renders a per-node stage OVERRIDE
 * (Site / Construction / Built) that jumps a placed building straight to a
 * rendered phase for testing — an additional override, still never a game write.
 */
function DevPanel({
  buildings,
  onSimulateLesson,
  onAdvance,
  onSetStage,
  onSeedCrisis,
  crisisSeedPlan,
}: {
  buildings: readonly CityBuildingView[];
  onSimulateLesson?: (nodeId: string) => void;
  onAdvance?: (nodeId: string) => void;
  onSetStage?: (nodeId: string, stage: DevBuildStage) => void;
  onSeedCrisis?: () => void;
  crisisSeedPlan?: CrisisSeedPlan | null;
}) {
  return (
    <section
      className="city-menu-section city-devtools"
      aria-labelledby="city-devtools-title"
    >
      <span className="micro-label">Developer stand-in</span>
      <h3 id="city-devtools-title">Simulate lessons (dev only)</h3>
      {onSeedCrisis && crisisSeedPlan && (
        <CrisisSeedControl plan={crisisSeedPlan} onSeed={onSeedCrisis} />
      )}
      <p className="city-devtools-note">
        Stands in for the mastery/lesson lane on a placed skill, and it is not a game write.
        Simulate lesson runs the teaching plus CFU only, stopping at Construction
        (scaffolding); Advance mastery is the separate practice step that completes it
        (mastery 2 completes a building, and all six unlocks the storm).
        {onSetStage
          ? " Set stage forces a placed building straight to a phase (a temporary dev override)."
          : ""}
      </p>
      {buildings.length === 0 ? (
        <p className="city-devtools-note">Build a skill on the island to construct it.</p>
      ) : (
        <ul className="city-devtools-list">
          {buildings.map((building) => {
            const currentStage = devStageOf(building.construction_state);
            // The lesson-taught transition has already fired once a building is past
            // Foundation (Construction or Built), so "Simulate lesson" locks out —
            // it must never regress a scaffolded / complete building.
            const lessonTaught = currentStage !== "site";
            return (
              <li key={building.node_id}>
                <div className="city-devtools-row">
                  <span>
                    {building.node_id} · mastery {building.mastery} of 3
                  </span>
                  {onSimulateLesson && (
                    <button
                      type="button"
                      className="city-action city-action-small"
                      disabled={lessonTaught}
                      onClick={() => onSimulateLesson(building.node_id)}
                    >
                      {lessonTaught ? "Lesson done" : "Simulate lesson"}
                    </button>
                  )}
                  {onAdvance && (
                    <button
                      type="button"
                      className="city-action city-action-small"
                      disabled={building.mastery >= 3}
                      onClick={() => onAdvance(building.node_id)}
                    >
                      {building.mastery >= 3 ? "Maxed" : "Advance mastery"}
                    </button>
                  )}
                </div>
                {onSetStage && (
                  // biome-ignore lint/a11y/useSemanticElements: a dev-only segmented control grouping stage toggles; role="group" is valid ARIA and a <fieldset>'s form chrome is inappropriate here.
                  <div
                    className="city-devtools-stages"
                    role="group"
                    aria-label={`Set ${building.node_id} build stage`}
                  >
                    <span className="micro-label city-devtools-stages-label">
                      Set stage
                    </span>
                    <div className="city-devtools-segmented">
                      {DEV_STAGE_OPTIONS.map((option) => (
                        <button
                          key={option.stage}
                          type="button"
                          className="city-devtools-stage"
                          aria-pressed={currentStage === option.stage}
                          onClick={() => onSetStage(building.node_id, option.stage)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Deterministic, animation-free DOM stand-in shown if the 3D canvas can't mount.
 *
 * IT IS A LEARNER'S SURFACE, not a developer's, which is what decides the words on it: it is
 * the progressive-enhancement path for a device with no WebGL, a failed GLB, or a lost
 * context (`three/CityCanvasHost.tsx`), so everything it draws is read by somebody who never
 * chose it. It printed `district.domain` and `building.node_id` — `D7`, `NUM.3` — until
 * 2026-08-08, which is the authoring lane's vocabulary and appears in none of the packs. Both
 * names were already in reach: `LockedDistrict` carries the engine's own `label` beside the
 * id it is keyed by, and `buildingName` is what the DOM roster above calls. The scene this
 * stands in for names the skill a building teaches (`three/SkillLabels.tsx`), so an id here
 * was also the one state of the city where the words changed with the hardware.
 *
 * Guarded by `learnerCityHoldsNoAuthoringIds.test.tsx`, which sweeps the rendered city
 * against every id the registry knows rather than against this component.
 */
function StaticCityBackdrop({
  skills,
  storm,
  districts,
  placedNodeIds,
  selectedNodeId,
}: {
  skills: readonly CityBuildingView[];
  storm: CityStormView;
  districts: CityViewModel["locked_districts"];
  placedNodeIds: ReadonlySet<string>;
  selectedNodeId: string | null;
}) {
  return (
    <div className="city-backdrop" data-testid="city-backdrop">
      <div className="city-backdrop-skyline">
        {districts.map((district) => (
          <span key={district.domain} className="city-backdrop-district">
            {district.label}
          </span>
        ))}
      </div>
      <div className="city-backdrop-plots">
        {skills.map((building) => {
          const placed = placedNodeIds.has(building.node_id);
          return (
            <div
              key={building.node_id}
              className="city-backdrop-plot"
              data-state={placed ? building.construction_state : "empty"}
              data-archetype={building.archetype.id}
              data-selected={building.node_id === selectedNodeId}
            >
              <span className="city-backdrop-node">{buildingName(building.node_id)}</span>
            </div>
          );
        })}
      </div>
      <div className="city-backdrop-storm" data-phase={storm.phase}>
        Storm {storm.phase}
      </div>
    </div>
  );
}

function StormEncounter({
  storm,
  lastResult,
  onFace,
  onExit,
}: {
  storm: CityStormView;
  lastResult: StormAttemptResult | null;
  onFace: (storm: CityStormView) => void;
  onExit: () => void;
}): ReactNode {
  return (
    <WorldScene
      eyebrow="Neighborhood checkpoint"
      title="Face the storm"
      tone="storm"
      onExit={onExit}
      actions={
        <button
          type="button"
          className="city-action city-action-primary"
          onClick={() => onFace(storm)}
        >
          Face the storm
        </button>
      }
    >
      <p className="world-scene-lede">{stormMessage(storm)}</p>
      <p className="world-scene-note">
        Clear {storm.required_correct} of {storm.item_count} to finish it, and retry as many
        times as you like. The soft timer only ever grows a bonus.
      </p>
      {lastResult && (
        <p className="world-scene-result" role="status">
          {lastResult.cleared
            ? lastResult.checkpoint_cleared
              ? "Cleared. The neighborhood checkpoint is complete."
              : "Cleared."
            : "Still standing. Face it again whenever you are ready."}
        </p>
      )}
    </WorldScene>
  );
}
