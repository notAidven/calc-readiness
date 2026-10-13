import type { EraId } from "@cr/skill-graph";

import { INTRUSION_LIGHT } from "../intrusionLight";
import { WINTER_LIGHT } from "../winterTones";
import type { CrisisAtmosphere } from "./atmosphere";
import { HARD_WINTER_PROPAGATION } from "./hardWinter";
import { INTRUSION_MECHANIC_COVERAGE, INTRUSION_PROPAGATION } from "./intrusion";
import {
  elsewhere,
  type MechanicCoverage,
  noAnalogue,
  openSeam,
  ownedByTheCrisis,
  sharedSeam,
} from "./mechanics";
import { PLAGUE_LIGHT, PLAGUE_MECHANICS, PLAGUE_PROPAGATION } from "./plague";
import {
  type CrisisPropagationDeclaration,
  type PropagationJob,
  type PropagationRead,
  type PropagationTopology,
  propagationDeclaration,
} from "./propagation";
import { SUCCESSION_LIGHT, SUCCESSION_PROPAGATION } from "./succession";

/**
 * **THE CRISIS REGISTRY: where a crisis registers instead of editing the renderer.**
 *
 * The four in-scope crises are eras 1, 4, 6 and 9 (D-CRISIS-31 as amended by D-CRISIS-33). All
 * four are here. Era one is REGISTERED and its entry is bound to its shipped code; era four is
 * a SLICE, two seams deep, standing here to prove the seams accept a crisis that propagates
 * non-spatially; era six is a slice too, with a playable DOM surface behind it and no world
 * geometry — `crisis/plague.ts` argues that split; and era nine is a slice for the sharper claim,
 * that the seams accept a crisis with NO world geometry for its propagation at all and do not
 * quietly hand it one. Nothing is RESERVED-without-an-entry any more: era six and era nine each
 * arrived with one, in separate changes that each described the other as still reserved.
 *
 * ## THE SEPARATION TABLE IS THE POINT OF THIS FILE
 *
 * A registry's natural failure is that it makes four things look like four rows of one thing.
 * {@link CRISIS_SEPARATION} is the counterweight: it holds §4 of
 * `crisis-reference-packs/README.md` as data, covering all four crises including the two with no
 * entry, and `crisisPropagationSeparation.test.ts` asserts both directions — that every registered
 * crisis matches its reserved row, and that the rows are pairwise distinct on the read, the job
 * and the topology. So era six and era nine's separation is enforced before either exists, which
 * is the only time enforcing it is cheap.
 */

/* -------------------------------------------------------------------------- */
/* Who is in scope                                                            */
/* -------------------------------------------------------------------------- */

/** The four eras with a shipping crisis. Not every era: nine designs are shelved. */
export const CRISIS_ERAS = [
  "prehistoric",
  "classical",
  "renaissance",
  "information_age",
] as const satisfies readonly EraId[];

export type CrisisEraId = (typeof CRISIS_ERAS)[number];

/**
 * **§4 OF THE REFERENCE-PACK README, AS DATA, FOR ALL FOUR.**
 *
 * *"Read down the fourth column and the four are four different visual jobs: watch an edge, watch
 * an object appear, watch a line, read a board. Nothing else in this pass may blur those four."*
 *
 * A reserved row is a claim about a crisis nobody has built, and it is worth writing down for the
 * reason the era six / era seven note gives: a separation is cheap to hold and expensive to
 * recover once two crises have shipped looking alike.
 */
export interface CrisisSeparationRow {
  readonly eraId: CrisisEraId;
  readonly crisis: string;
  /** What propagates. */
  readonly propagates: string;
  /** Along what. */
  readonly along: string;
  readonly read: PropagationRead;
  readonly job: PropagationJob;
  /**
   * **THE RESERVED TOPOLOGY IN FULL, not just its discriminant.**
   *
   * The whole topology rather than its `kind` because the property worth guarding is that the
   * four share no substantive FIELD, and a list of four kinds cannot show that. Carrying the
   * whole shape here also means eras six and nine's are pinned now, while nobody has written a
   * line of either — which is the only moment the pinning is free.
   */
  readonly topology: PropagationTopology;
  /**
   * Whether this crisis has world geometry, a stateful mounted scene layer, or no layer.
   */
  readonly layerKind: "built" | "mounted" | "designed" | "none";
}

export const CRISIS_SEPARATION = [
  {
    eraId: "prehistoric",
    crisis: "The Hard Winter",
    propagates: "Frost",
    along: "Tile adjacency, a front advancing inward from the rim",
    read: "creeping",
    job: "watch-an-edge",
    topology: {
      kind: "tile-adjacency",
      advance: "inward-from-the-rim",
      frontSubject: "cell-boundary",
    },
    layerKind: "built",
  },
  {
    eraId: "classical",
    crisis: "The Succession",
    propagates: "Allegiance",
    along: "Nothing spatial at all: a district decides in favour of whoever is strongest",
    read: "tipping",
    job: "watch-an-object-arrive",
    topology: {
      kind: "unlinked",
      decidesPer: "district",
      decidedBy: "whoever-is-currently-strongest",
    },
    layerKind: "designed",
  },
  {
    eraId: "renaissance",
    crisis: "The Plague",
    propagates: "Infection",
    along: "Authored inlaid routes between real city buildings",
    read: "reaching",
    job: "watch-a-line",
    topology: {
      kind: "authored-link",
      endpoints: "building-pair",
      linkRelief: "in-the-floor",
      requiresContact: false,
    },
    layerKind: "built",
  },
  {
    eraId: "information_age",
    crisis: "The Intrusion",
    propagates: "A counterfeit probe",
    along: "One ordered route over buildings that stand in the learner's city",
    read: "probing",
    job: "watch-a-probe",
    topology: {
      kind: "city-route",
      movesWhen: "breached-round",
      visits: "real-building",
    },
    layerKind: "mounted",
  },
] as const satisfies readonly CrisisSeparationRow[];

const SEPARATION_BY_ERA = new Map<CrisisEraId, CrisisSeparationRow>(
  CRISIS_SEPARATION.map((row) => [row.eraId, row]),
);

/** The reserved row for one crisis era. Total over {@link CRISIS_ERAS}. */
export function crisisSeparation(eraId: CrisisEraId): CrisisSeparationRow {
  const row = SEPARATION_BY_ERA.get(eraId);
  if (!row) {
    throw new Error(`Era "${eraId}" has no reserved separation row.`);
  }
  return row;
}

/* -------------------------------------------------------------------------- */
/* One crisis's entry                                                         */
/* -------------------------------------------------------------------------- */

/**
 * How far a registered crisis has got.
 *
 * `built` and `slice` are not two points on one road: a slice is deliberately two seams deep and
 * is finished as a slice. Kept apart so nothing reads era four's registry entry as an
 * implementation in progress and starts filling it in.
 */
export type CrisisEntryStatus = "built" | "slice";

export interface CrisisEntry {
  readonly eraId: CrisisEraId;
  readonly crisis: string;
  readonly status: CrisisEntryStatus;
  /** The preset swapped in on entry. Absent on exit; see `atmosphere.ts`. */
  readonly atmosphere: CrisisAtmosphere;
  /** The declaration, builder erased so the four can be swept together. */
  readonly propagation: CrisisPropagationDeclaration;
  /** All twenty-four rows answered. A blank fails `crisisMechanicCoverage.test.ts`. */
  readonly mechanics: MechanicCoverage;
}

/* -------------------------------------------------------------------------- */
/* Era one — registered, and bound to its shipped code                        */
/* -------------------------------------------------------------------------- */

/**
 * Era one's answers to the inventory.
 *
 * Eight rows come back `shared-seam`, and the other sixteen are the honest reason this framework
 * is as small as it is: most of what a crisis is turns out to be its own.
 * `crisisMechanicCoverage.test.ts` names the eight rather than counting them, so this cannot
 * drift into describing a different eight.
 */
const HARD_WINTER_MECHANICS: MechanicCoverage = {
  M1: elsewhere(
    "apps/web/src/city/crisisCall.ts",
    "a chip on the city HUD plus briefing slides in the era advisor's voice; already era-keyed through crisisBriefingFor and hasPlayableCrisis, and DOM rather than scene",
  ),
  M2: openSeam(
    "useCrisisCall fires on the mastery crossing and is session-local and transition-only, so a learner who loads a city already past the trigger is called by nothing; the O-13 chain owns it",
  ),
  M3: sharedSeam(
    "atmosphere",
    "WINTER_LIGHT swaps in on entry and the exit is the ABSENCE of a preset, so nothing has to remember what the sky used to be; the per-cell half of the revert is thawWinterRows and stays era one's, because era four has no cells to thaw",
  ),
  M4: sharedSeam(
    "atmosphere",
    "overcast: key down to 0.58 and raised in angle, sky 0xdce0de, fog pulled in to 1.4 and 10, exposure 0.92",
  ),
  M5: sharedSeam(
    "ladder",
    "a snow course plus six board-state rungs, all continuing the road stack's ladder through winterCourseTop rather than starting a second one over the same ground plane",
  ),
  M6: ownedByTheCrisis(
    "buildFrozenLagoon lays cold water, a faceted sheet and a broken shove-ice lip OVER era one's own lagoon while the crisis is mounted and takes them away on the way out, so the thaw is a removal and the shore its style guide owns is never edited",
  ),
  M7: ownedByTheCrisis("snow caps on era one's own plant archetypes"),
  M8: ownedByTheCrisis(
    "frost, three stages, drawn by relief and facet count rather than by tone, because the whole island is already white",
  ),
  M9: sharedSeam(
    "propagation",
    "the frost front: creeping, along tile adjacency, and the player's job is to watch an edge. The seam carries the declaration and calls buildFrostFrontGroup; it holds no advance rule of its own",
  ),
  M10: ownedByTheCrisis(
    "a hearth of stone and fuel with a smoke column that reads over rooftops",
  ),
  M11: ownedByTheCrisis(
    "a hearth with no ember is a declaration that bought nothing; a burnt-out one is blackened",
  ),
  M12: ownedByTheCrisis(
    "the warded patch, feathered at its rim so it is not another cell edge, sized by radius_by_tier",
  ),
  M13: ownedByTheCrisis(
    "a ghost of the RESULT: ghosted hearth, ghosted held ground, damped flame heat. The cross-crisis rule it obeys (provisional states frame, committed states fill) is stated in the shared crisis brief and has no code seam here",
  ),
  M14: openSeam(
    "burn_rounds_by_tier runs 2 / 2 / 3 and nothing draws it. #407 is landing exactly this row and this pass does not touch winterFire.ts, winterFireGhost.ts or WinterGround.tsx",
  ),
  M15: ownedByTheCrisis(
    "a storm roof oversailing the wall, battens and a berm up the visible walls; shielded is binary on screen and the magnitude is deliberately not drawn",
  ),
  M16: sharedSeam(
    "badge-slot",
    "a billboard above the MEASURED roofline, in the slot the mastery stars occupy the rest of the time, measured over the model AND its shield so the badge rides above a storm roof rather than through it",
  ),
  M17: sharedSeam(
    "damage-overlay",
    "frostShellModel is a surface added to a building that is still standing and still recognisable, banded against the height that building actually renders at; ruin_at 6 with bites of 2, 2, 2, 3, 3",
  ),
  M18: sharedSeam(
    "ruin-template",
    "ruinedStageModel is a footprint-keyed cached template selected as a PlacedModelStack layer kind, so it cross-fades like any other stage and stays a click target carrying its lesson",
  ),
  M19: sharedSeam(
    "ladder",
    "ScarredGround takes the island's own worn rung of the same ladder rather than inventing a sixth, which is what keeps the road stack where groundDepth.test.ts pins it",
  ),
  M20: elsewhere(
    "apps/web/src/city/crisisRepair.ts",
    "material spent on the island afterwards; repair_cost_per_point is derived as rebuild_cost_per_ruin / ruin_at",
  ),
  M21: elsewhere(
    "engines/game HARD_WINTER.abandon and apps/web/src/city/crisisRepair.ts",
    "a reclaimed cell keeps no mark: it leaves ruined_cells, so the layer draws nothing for it and the ground is the island's own again",
  ),
  M22: ownedByTheCrisis(
    "three nested footprints drawn as raised outlines with a tier badge, so the player sees what is already frozen inside the band they are considering",
  ),
  M23: ownedByTheCrisis(
    "falling snow as posed instanced meshes and a drifting smoke column, both holding a still frame under prefers-reduced-motion rather than disappearing",
  ),
  M24: elsewhere(
    "apps/web/src/winter/HardWinterSurface.tsx and winterConclusion.ts",
    "a standalone DOM sheet with a building tile per building and the accuracy in one sentence; outside the scene-asset lane",
  ),
};

/* -------------------------------------------------------------------------- */
/* Era four — a slice, and its inventory read from its brief                  */
/* -------------------------------------------------------------------------- */

/**
 * Era four's answers, read from `crises/era-04-succession-crisis.md` rather than implemented.
 *
 * **Ten rows come back `no-analogue`, and that is the finding rather than a gap.** Era four has
 * no hazard object, no ground layer, no footprint, no duration, no protection, no accumulating
 * damage, no ruin and no ground lost — and every one of those is a ruling in its brief with a
 * reason attached. The inventory's own warning is respected: `M9` is NOT answered *"era four has
 * no propagation"*, because a district drifting to a claimant is propagation with an unusual
 * topology, and that answer would be false.
 */
const SUCCESSION_MECHANICS: MechanicCoverage = {
  M1: elsewhere(
    "apps/web/src/city/crisisCall.ts",
    "the Classical call now carries the Succession's own four-slide briefing and enters the live city mount",
  ),
  M2: openSeam("the same O-13 gap era one has, and nothing about it is era-specific"),
  M3: sharedSeam(
    "atmosphere",
    "BUILT: SuccessionInCity keeps the learner's city canvas mounted, applies SUCCESSION_LIGHT, and binds its marker layer to current stable placement ids. SuccessionConclusion exits back to that city; settled markers restore from battle persistence",
  ),
  M4: sharedSeam(
    "atmosphere",
    "high, hard and still: key cooler, whiter, up to 1.44 and taken close to overhead, hemisphere down and bouncing stone rather than earth, a bleached horizon, and the fog near plane pushed OUT for clarity. successionTones.ts re-exports this preset beside era four's scene palette rather than re-authoring it, so the atmosphere the registry declares and the atmosphere the scene mounts cannot come apart",
  ),
  M5: noAnalogue(
    "era four lays no ground layer at all, and successionScene.ts holds the refusal structurally: it builds boundary stones and a boundary RUN and has no fill to call. A fill would cover the paving, which is the era's whole ground identity, and would make the board read as a map rather than as a city; its buildable radius of 43 against a drawn grass radius of 30 would also paint past the drawn island. The stones are set into the paving's own joint lines, which are objects and not a course",
  ),
  M6: ownedByTheCrisis(
    "BUILT in successionScene.ts: the port shuts. Hulls stand off at anchor, the quay has a deck, a lip and bollards and no cargo builder to call, the treadwheel crane is stopped mid-lift with its load still in the air, and the public basin still runs in a water tone a measured step above the shut harbour's, which is worth keeping precisely because everything else has stopped",
  ),
  M7: ownedByTheCrisis(
    "the limbed-up trees are untouched, because a political dispute does not change what grows; the one permitted change is at their foot, where the ground has been standing-room",
  ),
  M8: noAnalogue(
    "era four's hazard is not a thing on the board, it is a state of the board: the antagonist is time passing without you, expressed as districts deciding on their own. The consequence the brief accepts is that the whole atmosphere has to be carried by a city that has stopped working",
  ),
  M9: sharedSeam(
    "propagation",
    "allegiance, tipping, along nothing spatial: a numbered block waits at the foot of a plinth and goes up on it when the drift lands. Same object, moved. A district with no block is not drifting this cycle, and that absence is as informative as the block",
  ),
  M10: ownedByTheCrisis(
    "influence, the first banked resource in the ten, tallied on a marble slab still ruled out for lettering, and spent to raise a figure on a plinth",
  ),
  M11: ownedByTheCrisis(
    "a plinth is bare, carries a standing figure, carries a seated one, or carries a figure under a hoist in a sling and not yet set; the two claimants separate by POSE, which survives full zoom-out where a three-tone body colour would not",
  ),
  M12: noAnalogue(
    "influence has no aimed footprint. It is banked over several batches and spent on a district as a whole, so there is no ground to cover and nothing to size",
  ),
  M13: ownedByTheCrisis(
    "the provisional register in section 7.3: a claim is framed before it is committed, which is era one's fire-preview rule applied to an object rather than to ground",
  ),
  M14: noAnalogue(
    "nothing era four places expires. A raised statue is permanent and is the crisis's persistent record of how it went, so there is no duration to draw",
  ),
  M15: noAnalogue(
    "era four has no protect action. The player's mark is influence spent to CLAIM a district, not to shield anything, so there is no protection and no magnitude of it left",
  ),
  M16: sharedSeam(
    "badge-slot",
    "a contested district's civic building owes a mark above its roofline in the same slot era one's threat badge takes. The statuses are era four's own and are not era one's two: held-standing, held-seated, contested",
  ),
  M17: noAnalogue(
    "era four damages CAPACITY, not fabric. A contested district's civic building is shuttered and lifts on its own, so nothing accumulates and there is no threshold to cross",
  ),
  M18: noAnalogue(
    "nothing is ruined. A shuttered building has kept its silhouette and lost its openings, and the shared crisis brief rules that the two must not converge because one is repairable at a price and the other lifts on its own",
  ),
  M19: noAnalogue(
    "no ground is lost. Era four lays no ground layer, and its persistent record is the statues that stay standing after the crisis rather than a mark on the floor",
  ),
  M20: noAnalogue(
    "there is nothing to repair, because nothing was damaged in fabric. Capacity comes back when the district decides",
  ),
  M21: noAnalogue(
    "no ground is given up, so there is none to buy back. What is given up is a district, and it is claimed rather than reclaimed",
  ),
  M22: ownedByTheCrisis(
    "the three rungs of the influence ladder, read off the counting board rather than off a card",
  ),
  M23: ownedByTheCrisis(
    "BUILT as SuccessionAmbient, and almost nothing moves, which is the read: the basin's water runs and the port crane's load turns slightly in its sling, and nothing else does. The rig is handed a scene graph and a frame interval with no reducer in scope, so nothing that moves can advance the encounter. Era four's crisis is the stillest of the nine, and a cycle that appeared to turn on its own would read as a timer. Under reduced motion it is not mounted and both objects hold their built frame",
  ),
  M24: elsewhere(
    "the resolution panel, per section 9.5 of its brief",
    "DOM, and outside the scene-asset lane exactly as era one's conclusion sheet is",
  ),
};

/* -------------------------------------------------------------------------- */
/* The registry                                                               */
/* -------------------------------------------------------------------------- */

const ENTRIES: readonly CrisisEntry[] = [
  {
    eraId: "prehistoric",
    crisis: "The Hard Winter",
    status: "built",
    atmosphere: WINTER_LIGHT,
    propagation: propagationDeclaration(HARD_WINTER_PROPAGATION),
    mechanics: HARD_WINTER_MECHANICS,
  },
  {
    eraId: "classical",
    crisis: "The Succession",
    status: "slice",
    atmosphere: SUCCESSION_LIGHT,
    propagation: propagationDeclaration(SUCCESSION_PROPAGATION),
    mechanics: SUCCESSION_MECHANICS,
  },
  /*
   * ERA SIX, and everything it declares is in `crisis/plague.ts` rather than here.
   *
   * Two agents are adding two more surfaces to this same array, so the entry is four lines and
   * the hundred lines of inventory prose live in era six's own module. It is a `slice` for the
   * reason that file states at length: era six's PLAYABLE surface is built and is DOM
   * (`apps/web/src/plague/`, at `?plague`), and its world geometry is not — so the propagation
   * layer stays `designed` and era one remains the one `built` entry.
   */
  {
    eraId: "renaissance",
    crisis: "The Plague",
    status: "built",
    atmosphere: PLAGUE_LIGHT,
    propagation: propagationDeclaration(PLAGUE_PROPAGATION),
    mechanics: PLAGUE_MECHANICS,
  },
  /**
   * Era nine. A slice, and its two seams and its twenty-four answers are all in
   * `./intrusion.ts` rather than here.
   *
   * **That is not tidiness, it is the propagation guard.** `test/intrusionPropagation.test.ts`
   * derives one of its two populations from behaviour — every tracked source that names a
   * compromised status in code — and requires it to sit inside the crisis's own named modules.
   * Era nine's mechanic answers cannot be written without that vocabulary, so writing them in
   * this file would have pulled a shared four-crisis registry into era nine's population and
   * taken trunk red. The entry here is an import and six lines.
   */
  {
    eraId: "information_age",
    crisis: "The Intrusion",
    status: "built",
    atmosphere: INTRUSION_LIGHT,
    propagation: propagationDeclaration(INTRUSION_PROPAGATION),
    mechanics: INTRUSION_MECHANIC_COVERAGE,
  },
];

const BY_ERA = new Map<CrisisEraId, CrisisEntry>(
  ENTRIES.map((entry) => [entry.eraId, entry]),
);

/** Every registered crisis, in era order. */
export const CRISIS_ENTRIES: readonly CrisisEntry[] = ENTRIES;

/** One crisis's entry, or `null` in an era whose crisis is reserved but not registered. */
export function crisisEntry(eraId: CrisisEraId): CrisisEntry | null {
  return BY_ERA.get(eraId) ?? null;
}

/**
 * **THE ATMOSPHERE FOR ONE CRISIS, which is what the renderer actually calls.**
 *
 * Throws rather than falling back, following `eraBuildableRadius`'s discipline in `eras.ts`: a
 * fallback preset would silently light a crisis with another era's weather, and a crisis lit as
 * the wrong season is precisely the defect the whole atmosphere seam exists to prevent.
 */
export function crisisAtmosphere(eraId: CrisisEraId): CrisisAtmosphere {
  const entry = BY_ERA.get(eraId);
  if (!entry) {
    throw new Error(`Era "${eraId}" has no registered crisis atmosphere.`);
  }
  return entry.atmosphere;
}

/**
 * The era whose crisis the island draws today.
 *
 * Era one, and named rather than derived from `CURRENT_ERA_ID` because the two are different
 * questions: `resolveCrisisEra` means a city standing in ANY era falls back to the earliest era
 * whose crisis is built, so the board's era and the learner's era come apart from era two onward.
 * When a second crisis is built its surface passes its own era in and this constant stops being
 * the answer; `crisisMechanicCoverage.test.ts` asserts it still names the only `built` entry, so
 * the day that stops being true the guard says so.
 */
export const PLAYED_CRISIS_ERA: CrisisEraId = "prehistoric";
