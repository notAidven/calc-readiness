import { getNode } from "@cr/skill-graph";
import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { skillDisplayName } from "../../diagnostic/skillNames";
import { civicName, isCivicPlacement } from "../civic";
import { SUSPENDED_CAPTION } from "../suspendedCivic";
import { TOWN_HALL_ID, TOWN_HALL_LABEL } from "../townHall";
import {
  type Footprint,
  footprintFor,
  GRID_CELL,
  type GroundPoint,
  type Transform,
  transformCenter,
} from "../worldLayout";
import { controlsDistance, type OrbitControlsLike } from "./applyOrbit";
import type { CrisisStatus } from "./CrisisStatusMarker";
import {
  MASTERY_STAR_BAND_HEIGHT,
  MASTERY_STAR_BAND_WIDTH,
  STAR_BAND_TOP_ABOVE_ROOF,
} from "./MasteryStars";

/**
 * The floating SKILL LABEL above each skill building — the topic the building
 * teaches ("Signed numbers", "Order of operations"), not the building's name.
 *
 * ## What the label says, and where the words come from
 *
 * A roster row names a building three ways: the stable handle ("Assembly Hall"), this
 * era's dressing ("Gathering Round"), and the SKILL ("Signed numbers"). It is the third
 * that floats here, read from `skillDisplayName` — the same lookup the roster row itself
 * calls — so a rename lands in both places at once. There is no list of names in this
 * file, deliberately: the building names have been renamed twice in a week (D-TH7, then
 * D-ERA29) and a hard-coded copy here would have drifted through both.
 *
 * ## Skills plus one measured landmark
 *
 * The population is derived from the SKILL GRAPH: a placement earns a label iff
 * `getNode(nodeId)` resolves, plus the Town Hall sentinel. The exception is named because
 * it is different behaviour: a stemmed plate names the building and wins collisions; during a
 * crisis the existing status replaces it.
 *
 * ## Decorative, and not the only place any of this is written
 *
 * The whole canvas is `aria-hidden`, so this overlay is decoration carrying no
 * semantics. The keyboard-navigable Built shelf already names every building and its skill,
 * so nothing here is the sole channel for a fact. Plain DOM inside the canvas host (not
 * `drei/Html`) buys the app's self-hosted `var(--font-display)` without a three.js SDF atlas.
 *
 * ## Collision, which is the actual problem
 *
 * Era one's settlement is seven buildings packed near the centre, and six always-on
 * labels overlap at most azimuths. Three mechanisms, in order:
 *
 *  1. **Narrow rects.** Each label is capped at `LABEL_MAX_WIDTH_PX` and wraps, so
 *     "Field properties & the distributive law" becomes a tall narrow block rather than
 *     a 250px bar. Two narrow columns miss each other where two wide bars could not.
 *  2. **Depth-ordered occlusion** (`resolveVisibleLabels`). Nearest-to-camera wins; any
 *     label whose padded screen rect hits an already-kept one is dropped for this frame.
 *     So the pile thins itself as the camera converges the buildings on screen, and the
 *     label you keep is the one on the building in front.
 *  3. **Zoom fade** (`labelZoomOpacity`). Past ~1.35× the default dolly the set fades
 *     out, reaching zero well before full zoom-out — because at that framing even the
 *     survivors of (2) are naming buildings a few pixels wide.
 *
 * Drops and returns are CSS-transitioned (motion-gated), so occlusion reads as a fade
 * rather than a flicker as the camera moves.
 *
 * ## Cost
 *
 * Per frame: ONE `Box3` measurement (round-robin, one building per frame — a roofline
 * only changes on a stage transition, so a few frames of lag is invisible), `n`
 * projections, and a pairwise overlap pass over the nearest `LABEL_BUDGET` candidates.
 * The pairwise pass is quadratic, which is why it is capped: sorting is `O(n log n)` and
 * the quadratic part is bounded at `LABEL_BUDGET²` however large the city grows, so a
 * later era with sixty buildings costs sixty projections and the same 66 rect tests as
 * six do. There is no shadow pass, no raycast, and no geometry — nothing here touches
 * the ground depth ladder.
 */

/** Anchor a label this far above the top of the mastery-star band (world units). */
export const LABEL_CLEARANCE_ABOVE_STARS = 1.6;

/**
 * World-space height of a label's anchor above the building's MEASURED roofline: clear
 * of the star band rather than a guessed constant, so retuning the stars moves the label.
 */
export const LABEL_ANCHOR_ABOVE_ROOF =
  STAR_BAND_TOP_ABOVE_ROOF + LABEL_CLEARANCE_ABOVE_STARS;

/** Roof height (world units) used until a building's mesh is measurable. */
const FALLBACK_TOP_Y = 6;

/**
 * How many candidates the quadratic overlap pass may consider, after sorting by depth.
 * This is the bound that keeps the cost flat as later eras add buildings: everything
 * past the nearest `LABEL_BUDGET` is dropped without being compared to anything.
 */
export const LABEL_BUDGET = 12;

/** Keep the landmark plus a small, collision-resolved sample on a portrait phone. */
export function labelBudgetForViewport(width: number): number {
  if (width <= 480) {
    return 4;
  }
  if (width <= 720) {
    return 6;
  }
  return 8;
}

/** Screen-px breathing room required between two kept labels. */
export const LABEL_COLLISION_PADDING_PX = 6;

/** Cap on a label's rendered width, so long skill names wrap instead of stretching. */
const LABEL_MAX_WIDTH_PX = 124;

/** Hide once the anchor drifts this far beyond the viewport (screen px). */
const LABEL_HIDE_MARGIN_PX = 40;

/**
 * Dolly distances (as multiples of the layout's DEFAULT camera distance) between which
 * the labels fade out. Measured against the dolly rather than each label's own distance
 * to the camera because the per-label spread at one framing (~46u to ~85u at default) is
 * as wide as any sensible fade window, so a per-label ramp would fade the back of the
 * island while the front stayed solid at a framing where all six should read.
 *
 * `VILLAGE_CAMERA.maxDistanceRatio` is 2.6, so `1.9` puts full transparency comfortably
 * inside the reachable range rather than exactly at its edge.
 */
export const LABEL_FADE_START_RATIO = 1.35;
export const LABEL_FADE_END_RATIO = 1.9;

/**
 * **DURING A CRISIS THE LABEL IS THE BUILDING'S STATUS, NOT ITS SKILL.**
 *
 * The lead, having played the Hard Winter: *"during the crisis, instead of the name of the
 * building (e.g signed numbers) should be replaced by status: e.g shielded, in danger (freezes on
 * next turn without protection), or frozen."*
 *
 * The precedent is already in the tree and this is the same ruling one slot up.
 * `CrisisStatusMarker` REPLACES the mastery stars on a marked building rather than sitting beside
 * them, because *"the question a player has during a winter is not how well they know a skill, it
 * is which buildings they are about to lose"*, and the era-advance ceremony stands the labels down
 * for its own beat. The channel above a roofline holds one thing legibly and two never.
 *
 * ## THE SET IS THE ENGINE'S, WHICH IS WHAT THE `satisfies` IS FOR
 *
 * The keys are `CRISIS_STATUSES` — the crisis's own published vocabulary, which
 * `CrisisStatusMarker` draws its badges from — plus the two conditions that vocabulary
 * deliberately has no badge for. So a status the model can produce and this table cannot spell
 * fails to COMPILE, and a word here for a state nothing can reach fails the census in
 * `crisisLabels.test.ts`, which walks a real played board rather than this list.
 *
 * The two additions are named rather than assumed:
 *
 *  - **`shielded`** is not in `CRISIS_STATUSES` because a shield is drawn on the building rather
 *    than badged above it, and it is here because it is the first thing the lead asked the label
 *    to say. It outranks `threatened` for the same reason the mechanic exists: a shield is spent
 *    before the building is, so a shielded building in the front's path is protected, and saying
 *    IN DANGER over it would be the screen contradicting the rule;
 *  - **`safe`** is the complement, and it exists because the ask is that the name is REPLACED. A
 *    badge means something and `crisisDressing` is right to give an unthreatened building none,
 *    but a LABEL that vanished would leave most of era one's board captionless at round one and
 *    read as a bug. It says only what it is allowed to: the frost does not reach this building
 *    when the round closes.
 *
 * A building a fire is holding is deliberately `safe` and not a state of its own. `warded` is
 * already what `winterThreatenedNodeIds` folds into not-threatened, the ground under it wears the
 * island's one warm swatch, and the hearth and its smoke column stand on the cell — three
 * channels saying it before a fourth would.
 */
export const CRISIS_LABEL_TEXT = {
  lost: "FROZEN",
  threatened: "IN DANGER",
  shielded: "SHIELDED",
  safe: "SAFE",
} as const satisfies Record<CrisisStatus | "shielded" | "safe", string>;

/** Which of those a building is in. */
export type CrisisLabelState = keyof typeof CRISIS_LABEL_TEXT;

/**
 * **THE ONE STATUS THAT OUTLIVES ITS CRISIS.**
 *
 * `CRISIS_LABEL_TEXT`'s four are read off a LIVE board and go with the thaw. A civic
 * suspension is durable damage the city carries afterwards (`CrisisDamage.suspended_civic`
 * — era four's *"whole durable consequence"*, era nine's *"whole durable record"*), so it
 * is captioned in the ORDINARY city, where there is no board to resolve it against.
 *
 * That is why it is a member of {@link LabelState} and NOT of `CRISIS_LABEL_TEXT`. Those
 * four are a census over what a crisis board can produce (`crisisLabels.test.ts` walks a
 * real played board to check it), and a word in that table for a state no board reaches
 * would fail it — correctly. The word itself is `suspendedCivic.ts`'s, so the island and
 * the repair panel spell the same thing.
 */
const DURABLE_LABEL_TEXT = { suspended: SUSPENDED_CAPTION } as const;

/**
 * Everything a caption can say instead of a skill name: the crisis's four, plus the one
 * durable state above.
 */
export const LABEL_TEXT = {
  ...CRISIS_LABEL_TEXT,
  ...DURABLE_LABEL_TEXT,
} as const;

export type LabelState = keyof typeof LABEL_TEXT;

/**
 * Every one of them, derived from the table rather than typed out beside it, so a guard sweeps
 * the population the renderer actually spells rather than a copy of it.
 */
export const CRISIS_LABEL_STATES = Object.keys(
  CRISIS_LABEL_TEXT,
) as readonly CrisisLabelState[];

/**
 * The three sets a crisis publishes about its buildings, as the label reads them.
 *
 * The same three `crisisDressing` takes, deliberately: the label and the badge are two readings
 * of one board, and `crisisLabels.test.ts` holds them against each other so a building cannot be
 * badged `lost` and captioned SHIELDED.
 */
export interface CrisisLabelBoard {
  readonly ruinedNodeIds: ReadonlySet<string>;
  readonly shieldedNodeIds: ReadonlySet<string>;
  readonly threatenedNodeIds: ReadonlySet<string>;
}

/**
 * What one building's label says during a crisis.
 *
 * Ordered rather than exclusive, because the sets are not disjoint and pretending they were is
 * how a ruin gets captioned as protected: `winterThreatenedNodeIds` includes shielded buildings
 * (the front does reach them) and the engine can hold a shield on a building the same round it
 * is ruined. Ruin first, then the shield, then the threat.
 */
export function crisisLabelState(
  nodeId: string,
  board: CrisisLabelBoard,
): CrisisLabelState {
  if (board.ruinedNodeIds.has(nodeId)) {
    return "lost";
  }
  if (board.shieldedNodeIds.has(nodeId)) {
    return "shielded";
  }
  if (board.threatenedNodeIds.has(nodeId)) {
    return "threatened";
  }
  return "safe";
}

/** Shared so an undamaged city allocates nothing and resolves exactly as it did. */
const NOTHING_SUSPENDED: ReadonlySet<string> = new Set<string>();

/**
 * **WHAT ONE BUILDING'S CAPTION SAYS**, over both the live board and the durable damage, or
 * `null` when it should go on naming its skill.
 *
 * ORDERED, for `crisisLabelState`'s own reason one layer up: the sets are not disjoint and
 * pretending they were is how a wreck gets captioned as merely shut.
 *
 *  - **a ruin outranks a suspension.** They cannot overlap today — a ruin names a skill node
 *    and a suspension a civic placement — so this rung costs nothing and is here because the
 *    day they can overlap is the day the milder word would be a lie;
 *  - **a suspension outranks the live board's read**, which matters for exactly one case and
 *    it is a real one: a winter running over a city that already carries a suspension would
 *    otherwise caption the shuttered building `SAFE`, since the frost is genuinely not
 *    reaching it. True of the frost, false of the building.
 */
export function labelStateFor(
  nodeId: string,
  crisis: CrisisLabelBoard | null,
  suspended: ReadonlySet<string>,
): LabelState | null {
  if (crisis?.ruinedNodeIds.has(nodeId)) {
    return "lost";
  }
  if (suspended.has(nodeId)) {
    return "suspended";
  }
  return crisis === null ? null : crisisLabelState(nodeId, crisis);
}

/**
 * How each status is dressed: a face, and the plate behind it.
 *
 * Read from the winter's own tables and NONE added, exactly as `crisisMarkerTones` is, so the
 * caption and the badge over the same building are one vocabulary. `lost` and `threatened` take
 * the badge's own pair; `shielded` takes the storm roof's timber, which is what
 * `winterTones.ts` already spends on protection that is not a fire; `safe` keeps the ordinary
 * label's quiet teal, because a status nobody has to act on should not shout.
 */
const STATUS_TONES: Record<LabelState, { fill: string; edge: string }> = {
  lost: { fill: "rgba(58,52,44,0.92)", edge: "rgba(111,99,87,0.95)" },
  threatened: { fill: "rgba(60,127,160,0.94)", edge: "rgba(238,245,244,0.85)" },
  shielded: { fill: "rgba(95,71,48,0.94)", edge: "rgba(176,137,104,0.95)" },
  safe: { fill: "rgba(20,42,48,0.72)", edge: "rgba(253,246,230,0.28)" },
  // SUSPENDED TAKES `lost`'S STONE PAIR RATHER THAN A FIFTH SWATCH, which keeps the "no tone
  // added" rule this table is under. The pair's meaning on this island is *this building is
  // out of action*, and a shuttered one is exactly that; what separates it from a wreck is
  // the WORD, which is the channel a caption spends first. The two can never be on one
  // building anyway — a suspension names a civic placement and a ruin a skill node — and
  // where a city carries both, two plates reading FROZEN and SUSPENDED over two different
  // buildings is the right picture of a city that lost one and had another shut.
  suspended: { fill: "rgba(58,52,44,0.92)", edge: "rgba(111,99,87,0.95)" },
};

/** One label's world anchor and its text. Pure data — no three, no DOM. */
export interface SkillLabelTarget {
  readonly nodeId: string;
  /**
   * The hub gets landmark chrome and near-top collision priority; a skill caption names
   * the building's topic; a civic caption names a bought building. It reads slightly
   * smaller than a skill's own text, but a live check (2026-08-22) found several rounds
   * of resizing were chasing the wrong defect: the real problem was a civic label losing
   * the collision pass against a nearby skill caption, not its font size. It now carries
   * near-hub collision priority and the hub's own zoom-fade floor, so it stays as visible
   * as the hub regardless of size.
   */
  readonly kind: "skill" | "hub" | "civic";
  /** Lower wins collision ordering. The ordinary hub nameplate is the sole priority zero. */
  readonly priority: number;
  /** The skill topic, or a status while a crisis is on or a suspension stands. */
  readonly text: string;
  /** Which status this is, or `null` where it names a skill. */
  readonly status: LabelState | null;
  readonly footprint?: Footprint;
  readonly x: number;
  readonly z: number;
}

/** A label's measured on-screen box plus how far its building is from the camera. */
export interface LabelBox {
  readonly nodeId: string;
  readonly priority: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Distance from the camera to this label's anchor; nearest wins a collision. */
  readonly depth: number;
}

/**
 * The labels a set of placements earns: one per SKILL building, positioned at its
 * footprint centre. Anything the skill graph does not know is dropped, which is how the
 * Town Hall (a sentinel deliberately outside the graph) gets none.
 *
 * **EXCEPT WHILE A CRISIS IS ON, WHEN THE HUB IS CAPTIONED TOO, BECAUSE THE POPULATION IS THE
 * BOARD'S AND NOT THE GRAPH'S.** A skill label names a skill and the hall teaches none, so the
 * graph is the right population for it. A status caption answers *what is about to happen to this
 * building*, and the frost takes the hall on exactly the same terms as anything else: the live
 * board hands the hall to `createHardWinter` with the rest (`liveCityLayout`'s `includes_hall`), the
 * engine ruins and shields it through the same fields, and #449 found the shielded hall was the one
 * subject in this crisis no frame had ever been taken of — precisely because every population in
 * the tree had been copied from a file that correctly exempts it. So the filter here is scoped by
 * the behaviour rather than by the implementation, and `CityScene` hands this the hall alongside the
 * placements while a winter is on.
 *
 * **A BOUGHT CIVIC BUILDING NAMES ITSELF TOO** (2026-08-22: "add name tags to the civic
 * buildings like the skill buildings do? but smaller"), so a longhouse or a smokehouse
 * reads the same as a skill building does — its own name, floating over its own roof — and
 * not just Town Hall's landmark plate. `kind: "civic"` marks it so the overlay can render it
 * SMALLER than a skill's caption, per that same instruction; the name itself comes from
 * `civicName` (`../civic`), the placement-id-aware reading of the art lane's catalogue, not
 * a second copy of it.
 *
 * **AND A SUSPENDED CIVIC BUILDING IS CAPTIONED IN THE ORDINARY CITY EVEN WHEN THE ABOVE ISN'T
 * TRUE**, which is the one caption on a civic building that predates it and still widens the
 * population on its own: `suspended` is a durable state a placement id can carry regardless of
 * whether `isCivicPlacement` recognises it, so it stays a named exception here rather than being
 * folded into the civic branch above. It earns one for being SHUT: that is a fact about this
 * building the player has to be able to see and has to be able to act on, and it survives every
 * crisis going home.
 */
export function skillLabelTargets(
  placed: readonly (Transform & { readonly nodeId: string })[],
  crisis: CrisisLabelBoard | null = null,
  suspended: ReadonlySet<string> = NOTHING_SUSPENDED,
): SkillLabelTarget[] {
  const targets: SkillLabelTarget[] = [];
  for (const placement of placed) {
    const kind =
      placement.nodeId === TOWN_HALL_ID
        ? "hub"
        : getNode(placement.nodeId) !== undefined
          ? "skill"
          : isCivicPlacement(placement.nodeId)
            ? "civic"
            : "skill";
    const captionable =
      kind === "hub" ||
      kind === "civic" ||
      getNode(placement.nodeId) !== undefined ||
      suspended.has(placement.nodeId);
    if (!captionable) {
      continue;
    }
    const footprint: Footprint = footprintFor(placement.nodeId);
    const centre: GroundPoint = transformCenter(placement, footprint);
    const status = labelStateFor(placement.nodeId, crisis, suspended);
    targets.push({
      nodeId: placement.nodeId,
      kind,
      // 2026-08-22: a civic label at priority 0.5 still reliably lost to the HUB's own
      // priority-0 nameplate whenever the two sat close enough on screen to overlap --
      // which is common, since a civic building is bought near the founding cluster the
      // hub anchors. That is what "moving it farther from Town Hall fixes it" turned out
      // to mean: not a skill-label collision (0.5 already beat those), but the hub's own
      // landmark box reserving the space first. Tying civic to the hub's own priority (0)
      // means the two are settled by DEPTH like any other tie, so whichever is nearer the
      // camera wins instead of the hub automatically reserving the space -- the only way
      // a civic label can be "as reliably visible as the hub" when the two sit close
      // together is for neither to have a standing priority advantage over the other.
      priority: (kind === "hub" || kind === "civic") && status === null ? 0 : 1,
      text:
        status === null
          ? kind === "hub"
            ? TOWN_HALL_LABEL
            : kind === "civic"
              ? civicName(placement.nodeId)
              : skillDisplayName(placement.nodeId)
          : LABEL_TEXT[status],
      status,
      footprint,
      x: centre.x,
      z: centre.z,
    });
  }
  return targets;
}

/** Do two padded screen boxes touch? */
function overlaps(a: LabelBox, b: LabelBox, padding: number): boolean {
  return (
    a.left < b.left + b.width + padding &&
    b.left < a.left + a.width + padding &&
    a.top < b.top + b.height + padding &&
    b.top < a.top + a.height + padding
  );
}

/**
 * Which labels survive this frame: walk the candidates nearest-camera-first and keep one
 * only when its padded box clears every label already kept, so the label that survives a
 * collision is the one on the building in front. Returns node ids in the order kept.
 *
 * Candidates past `budget` are discarded before any comparison, which is what bounds the
 * quadratic pass — see the cost note in the file header.
 *
 * **ONE PASS, BECAUSE THERE IS ONE OVERLAY IN THIS CHANNEL AGAIN.** #470 added a `reserved` list
 * here so that this pass and `ShieldTags`' own could resolve against a shared answer: two hosts
 * drew above a roofline, each policed only its own boxes, and at 1024x580 `NUM.2`'s `SHIELDED` tag
 * was photographed covering the tail of `NUM.5`'s *"Ratios, proportions & percents"* — a tag over
 * one building eating a NEIGHBOUR's label. That second host is gone (see `CRISIS_LABEL_TEXT`: the
 * status IS the label now), so the ruling it enforced across two passes is enforced by there being
 * one, and a reservation parameter no caller can pass would only look like a live mechanism.
 */
export function resolveVisibleLabels(
  boxes: readonly LabelBox[],
  budget: number = LABEL_BUDGET,
  padding: number = LABEL_COLLISION_PADDING_PX,
): string[] {
  const considered = [...boxes]
    .sort((a, b) => a.priority - b.priority || a.depth - b.depth)
    .slice(0, budget);
  const kept: LabelBox[] = [];
  const won: string[] = [];
  for (const candidate of considered) {
    if (!kept.some((other) => overlaps(candidate, other, padding))) {
      kept.push(candidate);
      won.push(candidate.nodeId);
    }
  }
  return won;
}

/**
 * Whether one label actually renders this frame, given the frame's collision verdict.
 *
 * **A LANDMARK (the hub, or a bought civic building) IS EXEMPT FROM THE COLLISION GATE
 * ENTIRELY, and this is a deliberate reversal of an earlier, narrower fix.** Tying a
 * civic label's `priority` to the hub's own (see `skillLabelTargets`) settled WHICH of
 * the two shows when their boxes overlap — whoever is nearer the camera — but the actual
 * ask was that neither should have to lose at all: *"no it shouldnt be one winning over
 * the other they should just overlap"* (2026-08-22). There are at most a small handful of
 * these landmark labels in a city at once, so rendering both unconditionally costs
 * nothing against the budget the collision gate exists to protect, and it is the plainer
 * answer to what was asked. An ordinary skill caption still thins itself around a
 * landmark exactly as before — `kept` still reflects the landmark's box as an obstacle
 * for everyone else — only the landmark's OWN visibility skips the gate.
 */
export function labelIsShown(
  target: Pick<SkillLabelTarget, "nodeId" | "kind" | "status">,
  offScreen: ReadonlySet<string>,
  kept: ReadonlySet<string>,
  namesVisible: boolean,
): boolean {
  const allowedByPreference = target.status !== null || namesVisible;
  const exemptFromCollision =
    (target.kind === "hub" || target.kind === "civic") && target.status === null;
  return (
    allowedByPreference &&
    !offScreen.has(target.nodeId) &&
    (exemptFromCollision || kept.has(target.nodeId))
  );
}

/**
 * Label opacity at a given camera dolly distance: solid out to
 * `LABEL_FADE_START_RATIO × defaultDistance`, then a linear ramp to nothing by
 * `LABEL_FADE_END_RATIO`. Pulling back turns the settlement into a cluster a few dozen
 * pixels across, where a legible label is a lie about what it is pointing at.
 */
export function labelZoomOpacity(dollyDistance: number, defaultDistance: number): number {
  if (defaultDistance <= 0) {
    return 1;
  }
  const start = defaultDistance * LABEL_FADE_START_RATIO;
  const end = defaultDistance * LABEL_FADE_END_RATIO;
  if (dollyDistance <= start) {
    return 1;
  }
  if (dollyDistance >= end) {
    return 0;
  }
  return (end - dollyDistance) / (end - start);
}

/** A label's rendered box size (screen px), measured once rather than every frame. */
export interface LabelSize {
  readonly width: number;
  readonly height: number;
}

/** The overlay's DOM: a positioned host plus one element per label, keyed by node id. */
export interface SkillLabelLayer {
  readonly host: HTMLDivElement;
  readonly elements: ReadonlyMap<string, HTMLDivElement>;
  /**
   * Cached box sizes, keyed by node id. Read by the frame loop so it never touches
   * `offsetWidth`: interleaving a layout READ with the transform WRITES below it would
   * force a synchronous reflow per label per frame, which is the one genuinely
   * expensive thing an overlay of this shape can do. The text and `max-width` are
   * fixed, so a size only moves when the display face finishes loading.
   */
  readonly sizes: ReadonlyMap<string, LabelSize>;
  /** Re-measure every label (after mount, and once the web font has loaded). */
  measure(): void;
  /**
   * Hide/show ordinary skill and building names without removing or rebuilding any element.
   * Status captions are gameplay state and never follow this presentation preference.
   */
  setVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * Build the label overlay's DOM under `parent` (the canvas host). Exported so the
 * elements a set of targets produces are assertable in jsdom without a renderer: what
 * this returns is exactly what the player sees, minus the per-frame positions.
 *
 * Styles are inline rather than in `styles.css` so the whole feature is one file, and
 * the type is inherited through `var(--font-display)` — the app's own self-hosted
 * display face, resolved from `:root` at computed-style time.
 */
export function createSkillLabelLayer(
  parent: HTMLElement,
  targets: readonly SkillLabelTarget[],
  reducedMotion: boolean,
): SkillLabelLayer {
  const host = parent.ownerDocument.createElement("div");
  host.dataset.testid = "skill-label-layer";
  // Decoration inside an already-aria-hidden canvas; said again here so the overlay is
  // self-describing rather than relying on an ancestor it does not own.
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;";

  const elements = new Map<string, HTMLDivElement>();
  for (const target of targets) {
    const element = parent.ownerDocument.createElement("div");
    element.dataset.skillLabel = target.nodeId;
    const townHallNameplate = target.kind === "hub" && target.status === null;
    if (townHallNameplate) {
      element.dataset.townHallNameplate = "true";
      element.className = "town-hall-nameplate";
      const mark = parent.ownerDocument.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      mark.setAttribute("viewBox", "0 0 24 24");
      mark.setAttribute("aria-hidden", "true");
      mark.style.cssText = "width:11px;height:11px;flex:none;";
      const path = parent.ownerDocument.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", "M3 10 12 4l9 6M5 10v9h14v-9M9 19v-5h6v5");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      mark.appendChild(path);
      const label = parent.ownerDocument.createElement("span");
      label.textContent = target.text;
      const stem = parent.ownerDocument.createElement("span");
      stem.dataset.townHallStem = "true";
      stem.style.cssText =
        "position:absolute;top:100%;left:50%;width:1px;height:10px;" +
        "margin-left:-0.5px;background:var(--brass);";
      element.append(mark, label, stem);
    } else {
      element.textContent = target.text;
    }
    // A STATUS IS SHOUTED AND A SKILL NAME IS NOT, which is the whole of the styling
    // difference: the caption a player reads during a crisis is a thing they act on, and the
    // one they read in the ordinary city is a caption. Heavier, tracked out, upper case
    // (already, in the words themselves) and in the state's own tone, which is read from the
    // winter's tables rather than added — see `STATUS_TONES`.
    const tone = target.status === null ? STATUS_TONES.safe : STATUS_TONES[target.status];
    if (target.status !== null) {
      element.dataset.labelStatus = target.status;
    }
    // 2026-08-22: a bought civic building's name tag. What actually needed fixing after
    // several rounds of "still too small to notice" turned out to be VISIBILITY, not
    // size — a live check (a real civic placement mounted in a browser) found the label
    // reliably losing the collision pass against a nearby skill caption, never a font-size
    // problem. That is fixed above via `priority` and the zoom-fade floor. With visibility
    // settled, the text itself goes back to reading slightly smaller than a skill's own
    // (11px vs 12px), which was the original ask throughout. A civic building's STATUS
    // caption (a suspension) is untouched by any of this: that is actionable state,
    // styled exactly as every other status is.
    const civicLabel = target.kind === "civic" && target.status === null;
    if (civicLabel) {
      element.dataset.civicLabel = "true";
    }
    element.style.cssText = [
      "position:absolute;top:0;left:0;",
      `max-width:${civicLabel ? LABEL_MAX_WIDTH_PX - 12 : LABEL_MAX_WIDTH_PX}px;`,
      townHallNameplate
        ? "display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:8px;"
        : civicLabel
          ? "padding:3px 6px;border-radius:7px;"
          : "padding:3px 7px;border-radius:8px;",
      `font-family:var(--font-display);font-size:${civicLabel ? 11 : 12}px;`,
      townHallNameplate
        ? "font-weight:700;letter-spacing:0.02em;white-space:nowrap;"
        : target.status === null
          ? "font-weight:600;"
          : "font-weight:800;letter-spacing:0.07em;white-space:nowrap;",
      "line-height:1.15;text-align:center;text-wrap:balance;",
      townHallNameplate
        ? "color:var(--paper);background:color-mix(in srgb,var(--civic-dark) 90%,transparent);"
        : `color:#fdf6e6;background:${tone.fill};`,
      townHallNameplate
        ? "border:1px solid var(--brass);"
        : `border:1px solid ${tone.edge};`,
      townHallNameplate
        ? "box-shadow:0 1px 3px rgba(9,24,28,0.45);"
        : "box-shadow:0 2px 6px rgba(9,24,28,0.35);",
      "text-shadow:0 1px 2px rgba(9,24,28,0.65);",
      "backdrop-filter:blur(2px);",
      "opacity:0;will-change:transform,opacity;",
      reducedMotion ? "" : "transition:opacity 140ms linear;",
    ].join("");
    host.appendChild(element);
    elements.set(target.nodeId, element);
  }

  parent.appendChild(host);
  const sizes = new Map<string, LabelSize>();
  const layer: SkillLabelLayer = {
    host,
    elements,
    sizes,
    measure() {
      for (const [nodeId, element] of elements) {
        if (!element.hidden) {
          sizes.set(nodeId, { width: element.offsetWidth, height: element.offsetHeight });
        }
      }
    },
    setVisible(visible) {
      host.hidden = false;
      for (const target of targets) {
        const element = elements.get(target.nodeId);
        if (element) {
          element.hidden = target.status === null && !visible;
        }
      }
      if (visible) {
        layer.measure();
      }
    },
    dispose() {
      host.remove();
    },
  };
  layer.measure();
  return layer;
}

/**
 * Mounts the label overlay and drives it each frame. Reads `placed` — it derives no
 * placement and owns no state the surface does not already hold.
 */
export function SkillLabels({
  placed,
  crisis = null,
  suspended = NOTHING_SUSPENDED,
  controlsRef,
  defaultCameraDistance,
  reducedMotion,
  namesVisible = true,
  priorityNodeId,
}: {
  /**
   * The buildings that may earn a caption. The skill placements in the ordinary city, and those
   * plus the hall while a crisis is on — see `skillLabelTargets` on why the population is the
   * board's rather than the graph's once the caption is a status.
   */
  readonly placed: readonly (Transform & { readonly nodeId: string })[];
  /**
   * The crisis board, or `null` in the ordinary city.
   *
   * While it is set, every label says its building's STATUS instead of its skill — see
   * {@link CRISIS_LABEL_TEXT}. The three sets are the scene's own, so nothing here derives a
   * rule and the caption cannot disagree with the badge over the same building.
   */
  readonly crisis?: CrisisLabelBoard | null;
  /**
   * Civic placement ids a crisis has shuttered and nobody has paid to reopen
   * (`CrisisDamage.suspended_civic`). Unlike `crisis` this is DURABLE, so it is set in the
   * ordinary city and is what puts a caption over a building that has never had one.
   */
  readonly suspended?: ReadonlySet<string>;
  /** The live camera controls, read for the dolly distance the fade is keyed to. */
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
  /** The layout's default camera distance — the unit the fade ratios are in. */
  readonly defaultCameraDistance: number;
  readonly reducedMotion: boolean;
  /**
   * Presentational preference only; false hides ordinary names without unmounting the layer.
   * Crisis and durable status captions remain mounted and visible.
   */
  readonly namesVisible?: boolean;
  /**
   * Optional Presenter-only subject that wins the collision pass while its build stages are
   * demonstrated. Learner play omits it and retains the ordinary depth ordering unchanged.
   */
  readonly priorityNodeId?: string;
}) {
  const targets = useMemo(
    () =>
      skillLabelTargets(placed, crisis, suspended).map((target) =>
        target.nodeId === priorityNodeId ? { ...target, priority: -1 } : target,
      ),
    [placed, crisis, priorityNodeId, suspended],
  );
  const collectSpatialMetrics = useMemo(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("presenter") === "1",
    [],
  );
  const layerRef = useRef<SkillLabelLayer | null>(null);
  const namesVisibleRef = useRef(namesVisible);
  namesVisibleRef.current = namesVisible;
  const canvasHost = useThree((state) => state.gl.domElement.parentElement);

  // Measured rooflines, per node, refreshed one building per frame (see the cost note).
  const roofTops = useRef(new Map<string, number>());
  const measureCursor = useRef(0);
  const bounds = useRef(new THREE.Box3());
  const viewSpace = useRef(new THREE.Vector3());
  const projected = useRef(new THREE.Vector3());
  const anchor = useRef(new THREE.Vector3());
  const metricPoint = useRef(new THREE.Vector3());
  const cameraRight = useRef(new THREE.Vector3());
  const cameraUp = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!canvasHost) {
      return;
    }
    const layer = createSkillLabelLayer(canvasHost, targets, reducedMotion);
    layerRef.current = layer;
    layer.setVisible(namesVisibleRef.current);
    // The first measurement happens before the self-hosted display face has necessarily
    // loaded, which would leave every box sized for the fallback metrics; re-measure
    // once it is in. Cancelled on unmount so a late resolve cannot touch a dead layer.
    let live = true;
    void canvasHost.ownerDocument.fonts?.ready.then(() => {
      if (live) {
        layer.measure();
      }
    });
    return () => {
      live = false;
      layer.dispose();
      layerRef.current = null;
    };
  }, [canvasHost, targets, reducedMotion]);

  useEffect(() => {
    layerRef.current?.setVisible(namesVisible);
  }, [namesVisible]);

  useFrame((state) => {
    const layer = layerRef.current;
    if (!layer || targets.length === 0) {
      return;
    }
    const { camera, size, scene } = state;

    // Refresh ONE roofline this frame. A roof height only moves on a stage transition
    // (a ~0.3s cross-fade), so measuring round-robin keeps the per-frame cost at a
    // single `Box3` no matter how many buildings the era has.
    const cursorTarget = targets[measureCursor.current % targets.length];
    measureCursor.current += 1;
    if (cursorTarget) {
      const model = scene.getObjectByName(`building-${cursorTarget.nodeId}`);
      if (model) {
        bounds.current.setFromObject(model);
        if (Number.isFinite(bounds.current.max.y)) {
          roofTops.current.set(cursorTarget.nodeId, bounds.current.max.y);
        }
      }
    }

    const controls = controlsRef.current;
    const zoomOpacity = controls
      ? labelZoomOpacity(controlsDistance(controls), defaultCameraDistance)
      : 1;

    const boxes: LabelBox[] = [];
    const offScreen = new Set<string>();
    cameraRight.current.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    cameraUp.current.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    const projectMetric = (x: number, y: number, z: number) => {
      metricPoint.current.set(x, y, z).project(camera);
      return {
        x: (metricPoint.current.x * 0.5 + 0.5) * size.width,
        y: (-metricPoint.current.y * 0.5 + 0.5) * size.height,
      };
    };
    const writeFootprintMetric = (target: SkillLabelTarget, element: HTMLElement): void => {
      const footprint = target.footprint ?? footprintFor(target.nodeId);
      const halfWidth = (footprint.w * GRID_CELL) / 2;
      const halfDepth = (footprint.d * GRID_CELL) / 2;
      const groundCorners = [
        projectMetric(target.x - halfWidth, 0, target.z - halfDepth),
        projectMetric(target.x + halfWidth, 0, target.z - halfDepth),
        projectMetric(target.x + halfWidth, 0, target.z + halfDepth),
        projectMetric(target.x - halfWidth, 0, target.z + halfDepth),
      ];
      element.dataset.footprintScreenBox = JSON.stringify({
        left: Math.min(...groundCorners.map((corner) => corner.x)),
        top: Math.min(...groundCorners.map((corner) => corner.y)),
        right: Math.max(...groundCorners.map((corner) => corner.x)),
        bottom: Math.max(...groundCorners.map((corner) => corner.y)),
      });
    };
    for (const target of targets) {
      if (target.status === null && !namesVisibleRef.current) {
        continue;
      }
      const element = layer.elements.get(target.nodeId);
      if (!element) {
        continue;
      }
      const measuredTop = roofTops.current.get(target.nodeId) ?? FALLBACK_TOP_Y;
      const y = measuredTop + LABEL_ANCHOR_ABOVE_ROOF;
      anchor.current.set(target.x, y, target.z);

      // Same "in front of the camera" test the anchored callout uses (view space, the
      // camera looks down -Z), so a building swung behind the camera by an orbit never
      // projects to a plausible-looking on-screen point.
      viewSpace.current.copy(anchor.current).applyMatrix4(camera.matrixWorldInverse);
      projected.current.copy(anchor.current).project(camera);
      const px = (projected.current.x * 0.5 + 0.5) * size.width;
      const py = (-projected.current.y * 0.5 + 0.5) * size.height;
      if (collectSpatialMetrics) {
        // The footprint is evidence about ground placement, not label visibility. Keep
        // measuring it when the roofline label itself lands outside the frame.
        writeFootprintMetric(target, element);
      }
      const visible =
        viewSpace.current.z < 0 &&
        px >= -LABEL_HIDE_MARGIN_PX &&
        px <= size.width + LABEL_HIDE_MARGIN_PX &&
        py >= -LABEL_HIDE_MARGIN_PX &&
        py <= size.height + LABEL_HIDE_MARGIN_PX;
      if (!visible) {
        offScreen.add(target.nodeId);
        continue;
      }

      // Centred over the building and sitting just above the anchor point. Sizes come
      // from the layer's cache, never from a live `offsetWidth` read — see `sizes`.
      const { width, height } = layer.sizes.get(target.nodeId) ?? { width: 0, height: 0 };
      const left = px - width / 2;
      const top = py - height;
      if (collectSpatialMetrics && target.kind === "skill") {
        const starCenterY =
          measuredTop + STAR_BAND_TOP_ABOVE_ROOF - MASTERY_STAR_BAND_HEIGHT / 2;
        const starCenter = new THREE.Vector3(target.x, starCenterY, target.z);
        const starLeft = starCenter
          .clone()
          .addScaledVector(cameraRight.current, -MASTERY_STAR_BAND_WIDTH / 2);
        const starRight = starCenter
          .clone()
          .addScaledVector(cameraRight.current, MASTERY_STAR_BAND_WIDTH / 2);
        const starTop = starCenter
          .clone()
          .addScaledVector(cameraUp.current, MASTERY_STAR_BAND_HEIGHT / 2);
        const starBottom = starCenter
          .clone()
          .addScaledVector(cameraUp.current, -MASTERY_STAR_BAND_HEIGHT / 2);
        const projectedLeft = projectMetric(starLeft.x, starLeft.y, starLeft.z);
        const projectedRight = projectMetric(starRight.x, starRight.y, starRight.z);
        const projectedTop = projectMetric(starTop.x, starTop.y, starTop.z);
        const projectedBottom = projectMetric(starBottom.x, starBottom.y, starBottom.z);
        element.dataset.masteryStarScreenBox = JSON.stringify({
          left: Math.min(projectedLeft.x, projectedRight.x),
          top: Math.min(projectedTop.y, projectedBottom.y),
          right: Math.max(projectedLeft.x, projectedRight.x),
          bottom: Math.max(projectedTop.y, projectedBottom.y),
        });
      }
      element.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      const stem = element.querySelector<HTMLElement>("[data-town-hall-stem]");
      if (stem) {
        stem.style.left = "50%";
      }
      boxes.push({
        nodeId: target.nodeId,
        left,
        top,
        width,
        height,
        priority: target.priority,
        depth: camera.position.distanceTo(anchor.current),
      });
    }

    const kept = new Set(
      resolveVisibleLabels(
        boxes,
        labelBudgetForViewport(size.width),
        size.width <= 720 ? 10 : LABEL_COLLISION_PADDING_PX,
      ),
    );
    for (const target of targets) {
      const element = layer.elements.get(target.nodeId);
      if (!element) {
        continue;
      }
      const shown = labelIsShown(target, offScreen, kept, namesVisibleRef.current);
      // The hub never fades below 0.35 so it stays legible zoomed all the way out; a
      // civic building's name gets the same floor for the same reason -- it is a small,
      // bought landmark and not part of the crowded skill-caption set the fade exists
      // to thin out.
      const opacity =
        (target.kind === "hub" || target.kind === "civic") && target.status === null
          ? Math.max(zoomOpacity, 0.35)
          : zoomOpacity;
      element.style.opacity = shown ? String(opacity) : "0";
      element.dataset.labelState = shown ? "shown" : "hidden";
    }
  });

  return null;
}
