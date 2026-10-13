import { type WinterCellView, type WinterFire, winterDamageStage } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";

import {
  winterShieldedNodeIds,
  winterThreatenedNodeIds,
} from "../../winter/buildingThreat";
import type { WinterBoardSlot } from "../../winter/HardWinterSurface";
import { winterEligibleNodesFromIds } from "../../winter/hardWinterItems";
import {
  type LiveCityResult,
  type LiveCitySource,
  liveCityLayoutFrom,
} from "../../winter/liveCityLayout";
import type { ScarCommit } from "../../winter/scarLiveCity";
import { thawedScarCells, thawWinterRows } from "../../winter/thaw";
import { WINTER_GROUND_TONES } from "./winterTones";

import "./winter-in-city.css";

/**
 * **THE HARD WINTER, HAPPENING ON THE ISLAND — NOT ON A SCREEN ABOUT IT.**
 *
 * The lead's ruling: *"it needs to show in the in-game screen, not a redirect to the same
 * static dev site."* So there is no second board and no second canvas here. The winter draws
 * on the CITY'S OWN canvas — the island already on screen, at the camera the player had, with
 * their real buildings, their rotations, their roads and their mastery stars still on the
 * roofs. Frost creeps over it, fires stand on cells they clicked, and their visible buildings
 * go to ruin in place.
 *
 * ## How the crisis reaches a canvas this component does not own
 *
 * `CityScene` already knows how to draw all of it: `winterRows`, `winterFires`,
 * `onAimWinterCell` and `ruinedNodeIds` are its props. What was missing was a way for the
 * winter's state — which `HardWinterSurface` owns, privately, and should keep owning — to get
 * to them. {@link WinterBoardBridge} is that way: the `renderBoard` slot hands one moment of
 * the winter out on every change, the bridge publishes it upward, and `CitySurface` passes it
 * straight into the canvas host it was already rendering. Nothing is recomputed on the way
 * (`winterCellKey` and `roadCellKey` are the same key, so a cell means the same cell on both
 * boards) and no winter state lives up there — only the last board published.
 *
 * ## What this component actually is: the CONTROLS, worn as a panel
 *
 * Rounds, tiers, declarations, questions, refusals and outcomes are the winter's own
 * (`winter/HardWinterSurface.tsx`) and are reused with no changes to any of them. They are
 * laid out as a centred sheet over the city by `winter-in-city.css`; everything outside the
 * sheet is pointer-transparent, so the island keeps the drag, the zoom and the cell pick.
 * The sheet drops to a band along the bottom while a cell is being aimed at, which is the one
 * interaction that needs the whole board visible — see that file's `[data-aiming]` rule.
 *
 * ## `?winter` is untouched
 *
 * That route mounts the same surface with no `renderBoard` and no `readLiveCity`, so it keeps
 * its 2D grid and its storage read. This is an addition; the debugging surface is not being
 * replaced. The grid is also the FALLBACK here — see {@link WinterInCityProps.canvasLive}.
 *
 * ## Why the winter's surface is lazy
 *
 * `WinterEntryChip` earns the city bundle its independence by importing React and nothing
 * else, and mounting the winter in-city would have thrown that away if the import were eager:
 * the city would start paying for `@cr/game`'s winter closure, the item pool and the practice
 * answer widgets on every load. Behind `lazy` the chunk is still only fetched by somebody who
 * pressed the chip.
 */

type HardWinterSurfaceModule = typeof import("../../winter/HardWinterSurface");

let hardWinterSurfaceModule: Promise<HardWinterSurfaceModule> | null = null;
let preloadedHardWinterSurface: HardWinterSurfaceModule["HardWinterSurface"] | null = null;

/**
 * One request for the winter chunk, shared by React.lazy and the one browser guard that needs
 * the chunk warm before it starts timing the live-canvas behaviour after the mount.
 */
function loadHardWinterSurface(): Promise<HardWinterSurfaceModule> {
  hardWinterSurfaceModule ??= import("../../winter/HardWinterSurface");
  return hardWinterSurfaceModule;
}

const HardWinterSurface = lazy(async () => ({
  default: (await loadHardWinterSurface()).HardWinterSurface,
}));

/**
 * Settle the exact promise consumed by {@link HardWinterSurface} and retain its component.
 *
 * A resolved import alone does not mark React.lazy's private payload resolved: its first mount
 * still enters Suspense for one retry. A caller that explicitly awaited this preload has
 * already paid that boundary, so render the retained component directly.
 */
export async function preloadHardWinterSurface(): Promise<void> {
  preloadedHardWinterSurface = (await loadHardWinterSurface()).HardWinterSurface;
}

/** Stable empties, so a thawed board keeps one identity across a re-render. */
const NO_FIRES: readonly WinterFire[] = [];
const NO_SCARS: readonly string[] = [];
const NO_CANDIDATES: ReadonlySet<string> = new Set<string>();

/**
 * One moment of the winter, in the shape the CITY's canvas takes it.
 *
 * Deliberately not `WinterBoardSlot`: that is the winter's own vocabulary (a view model, a
 * mode, a cell pick), and this is the renderer's (rows, fires, ruins, two pointer handlers).
 * Translating once here is what keeps `CitySurface` from having to know what a
 * `WinterActionTier` is.
 */
export interface WinterCityBoard {
  /**
   * The engine's projected board — frost, the frost line, wards, scars, both previews.
   *
   * **THAWED once the winter has ended** (`../../winter/thaw.ts`): the transient states come
   * off so the island goes back to being the island, and the durable ones do not.
   */
  readonly rows: readonly (readonly WinterCellView[])[];
  /** Fires standing on the island. Empty once the winter has ended. */
  readonly fires: readonly WinterFire[];
  /**
   * The cell a fire is being aimed at, so the island can stand a GHOST of that fire on it.
   *
   * The covered ground already reaches the renderer per cell, but the centre does not: the
   * island clips the disc, so a candidate near the shore has a lopsided footprint whose
   * centroid is not the cell that was picked. Read off the engine's own preview rather than
   * recomputed, so the hearth cannot stand somewhere the coverage disagrees with.
   */
  readonly firePreviewAt: { readonly col: number; readonly row: number } | null;
  /** Node ids the winter has wrecked, drawn through the city's own ruin seam. */
  readonly ruinedNodeIds: ReadonlySet<string>;
  /**
   * `"col,row"` keys of ground the settlement gave up, for the city's own scarred-ground
   * layer. Empty while the winter is running — the crisis layer is drawing that ground
   * itself then — and populated once it has ended, which is how a scar survives the thaw.
   */
  readonly scarredCells: readonly string[];
  /**
   * Whether the crisis is over. The island has reverted to its ordinary dressing by the time
   * this is `true`; the ruins and the scars have not.
   */
  readonly ended: boolean;
  /**
   * How far the frost has climbed each STANDING building, by node id — the third building
   * state, and the one that only exists while a winter is being played. Empty until the
   * frost marks something.
   */
  readonly frostStageByNodeId: ReadonlyMap<string, number>;
  /**
   * **REINFORCED BUILDINGS, and the reason this is a SET and not a number per building.**
   *
   * The engine models reinforcement as a depleting integer (`WinterBuilding.shield`, granted
   * 2/4/6 by tier and spent a bite at a time), and the island draws none of that magnitude:
   * the ruling is that shielded is BINARY on screen. So what crosses is membership, and a
   * shield that runs out leaves the set in one step.
   *
   * **EMPTY ONCE THE WINTER HAS ENDED**, which is the other half of the same ruling — a
   * building that was reinforced and survived goes back to its ordinary look in the city. The
   * reducer has no reason to zero `shield` when the winter stops, so the phase gate lives in
   * `winterShieldedNodeIds` and is asserted rather than described.
   */
  readonly shieldedNodeIds: ReadonlySet<string>;
  /**
   * Buildings a reinforce could be aimed at, so the island can GHOST the storm roof onto them
   * before anything is committed — the `GhostBuilding` convention, which this crisis could not
   * follow for reinforcing because there was no shield geometry to draw see-through.
   *
   * The candidate set is simply the standing buildings, and it is only non-empty while the
   * player is actually choosing one: a preview standing on the island in every mode would be
   * proposing an action nobody is taking, which is the same rule `onAimCell` is gated by.
   */
  readonly reinforceCandidates: ReadonlySet<string>;
  /**
   * **BUILDINGS THE FROST REACHES WHEN THIS ROUND CLOSES.**
   *
   * A fact about the front's POSITION rather than about accumulated damage, so it is read
   * straight off the cell flags `hardWinterView` already projects through
   * `winterFrostAfterAdvance` — the same function `end_round` advances with. There is one
   * flood fill in this codebase and this is not a second one; see `winter/buildingThreat.ts`.
   *
   * Drawn as the badge that replaces the mastery stars while the crisis is on, and empty once
   * the winter has ended because the thawed rows it is derived from are.
   */
  readonly threatenedNodeIds: ReadonlySet<string>;
  /**
   * A click on the GROUND is a cell pick, or `null` when the winter is not asking for one —
   * which leaves the island inert and the camera in charge of the drag, the same rule
   * `CityScene` already applies to building placement and road painting.
   */
  readonly onAimCell: ((col: number, row: number) => void) | null;
  /**
   * A click on a BUILDING, while a winter is running. Never null, and that is the point: it
   * is how "Reinforce a building" is aimed at the island, AND it is what stops a click on a
   * building opening the city's lesson popup underneath the crisis panel.
   */
  readonly onPickBuilding: (nodeId: string) => void;
}

/**
 * Publishes one moment of the winter to the city, and withdraws it on the way out.
 *
 * A component rather than a call inside `renderBoard` because the publish is an EFFECT — a
 * parent's `setState` during a child's render is exactly the thing React refuses — and a
 * render prop is not a place hooks may live. It renders nothing into the winter's board slot
 * on purpose: the board is the island, and the island is somebody else's canvas.
 */
function WinterBoardBridge({
  slot,
  onBoard,
}: {
  readonly slot: WinterBoardSlot;
  readonly onBoard: (board: WinterCityBoard | null) => void;
}) {
  const { view, winter, mode, onPick } = slot;

  /**
   * The pick, held behind a ref and deliberately NOT a dependency of the board below.
   *
   * `HardWinterSurface` declares `pickCell` in its component body, so it is a new function
   * on every render — and publishing to the city re-renders the city, which re-renders the
   * winter, which makes another one. Keying the board on that identity is an infinite loop
   * (measured: React's "Maximum update depth exceeded", and it starved the click handler so
   * no fire could be placed at all). Keyed on the winter's VALUES instead, the board is
   * stable across a re-render that changed nothing, so the effect below only fires when the
   * board really moved.
   */
  const pickRef = useRef(onPick);
  useEffect(() => {
    pickRef.current = onPick;
  });

  const cellByKey = useMemo(() => {
    const map = new Map<string, WinterCellView>();
    for (const line of view.rows) {
      for (const cell of line) {
        map.set(`${cell.col},${cell.row}`, cell);
      }
    }
    return map;
  }, [view.rows]);

  const ruinedNodeIds = useMemo(
    () => new Set(winter.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id)),
    [winter.buildings],
  );

  /**
   * THE END OF THE CRISIS, AS A CHANGE ON SCREEN. The winter's own state keeps every frozen
   * cell after `phase: "ended"` — the reducer does not clear `frozen`, and the outcome panel's
   * copy already says the frost gives that ground back in spring — so the island would go on
   * wearing the crisis for as long as the outcome panel is up, which is why the crisis had no
   * visible ending. `thawWinterRows` takes the weather off and leaves the damage; the scars
   * move to the city's own durable layer so they survive the thaw rather than going with it.
   *
   * Driven by the phase, so the transition happens on the state change the player's own last
   * action caused. There is no clock anywhere in it (see `../../winter/thaw.ts`).
   */
  const ended = winter.phase === "ended";
  const rows = useMemo(
    () => (ended ? thawWinterRows(view.rows) : view.rows),
    [ended, view.rows],
  );
  const scarredCells = useMemo(
    () => (ended ? thawedScarCells(view.rows) : NO_SCARS),
    [ended, view.rows],
  );

  // Read through the ENGINE's own reading rather than divided here, so the canvas cannot
  // disagree with the 2D board about how hurt something is.
  const frostStageByNodeId = useMemo(() => {
    const stages = new Map<string, number>();
    for (const building of winter.buildings) {
      const stage = winterDamageStage(building);
      if (building.state === "standing" && stage > 0) {
        stages.set(building.node_id, stage);
      }
    }
    return stages;
  }, [winter.buildings]);

  // Two numbers rather than the preview object, so the memo below is keyed on values: the
  // view is rebuilt on every render of the surface and an object identity would republish the
  // board each time, which is the loop `pickRef` exists to avoid.
  const aimCol = ended ? null : (view.fire_preview?.col ?? null);
  const aimRow = ended ? null : (view.fire_preview?.row ?? null);

  const shieldedNodeIds = useMemo(
    () => winterShieldedNodeIds(winter.buildings, ended),
    [winter.buildings, ended],
  );

  // Derived from the THAWED rows rather than from `view.rows`, so the end of the winter takes
  // the threat off the island through the same function that takes the frost off the ground —
  // one decision about when the crisis is over, not two that could disagree.
  const threatenedNodeIds = useMemo(() => winterThreatenedNodeIds(rows), [rows]);

  // Only while a reinforce is actually being aimed. A ghost standing on every building in
  // every mode would be proposing an action nobody is taking, which is exactly the rule
  // `onAimCell` is gated by one field down.
  const reinforceCandidates = useMemo(() => {
    if (ended || mode !== "reinforce") {
      return NO_CANDIDATES;
    }
    return new Set(
      winter.buildings.filter((b) => b.state === "standing").map((b) => b.node_id),
    );
  }, [ended, mode, winter.buildings]);

  const board = useMemo<WinterCityBoard>(
    () => ({
      rows,
      fires: ended ? NO_FIRES : winter.fires,
      firePreviewAt:
        aimCol === null || aimRow === null ? null : { col: aimCol, row: aimRow },
      ruinedNodeIds,
      scarredCells,
      ended,
      frostStageByNodeId,
      shieldedNodeIds,
      reinforceCandidates,
      threatenedNodeIds,
      // Only while a FIRE is being aimed. A ground plane that took a click in every mode
      // would also take the click that ends a camera orbit, which is why placement and road
      // painting gate theirs the same way.
      onAimCell:
        mode !== "fire"
          ? null
          : (col, row) => {
              // Resolved against the ENGINE's own board rather than accepted as two numbers:
              // a click on the lagoon or outside the island resolves to no cell and is
              // dropped, so the ground cannot report a declaration the winter would refuse.
              const cell = cellByKey.get(`${col},${row}`);
              if (cell?.land) {
                pickRef.current(cell);
              }
            },
      onPickBuilding: (nodeId) => {
        const placed = winter.buildings.find((b) => b.node_id === nodeId);
        const cell = placed ? cellByKey.get(`${placed.col},${placed.row}`) : undefined;
        if (cell) {
          pickRef.current(cell);
        }
      },
    }),
    [
      rows,
      ended,
      scarredCells,
      winter.fires,
      winter.buildings,
      ruinedNodeIds,
      frostStageByNodeId,
      shieldedNodeIds,
      reinforceCandidates,
      threatenedNodeIds,
      mode,
      cellByKey,
      aimCol,
      aimRow,
    ],
  );

  useEffect(() => {
    onBoard(board);
  }, [board, onBoard]);

  // Leaving the winter must put the island back, so the withdrawal is tied to the mount
  // rather than to the exit button — an unmount by any other route (an error boundary, a
  // route change) has to clear it too, or the city keeps wearing a crisis nobody is playing.
  useEffect(() => () => onBoard(null), [onBoard]);

  return null;
}

/**
 * What the island's own tones mean, said in the island's own tones.
 *
 * Each entry is a NAME and an optional explanation, split rather than one string, because the
 * key is laid out across one row beside the settlement counts (`winter-in-city.css`) and a clause
 * is the one thing on that row long enough to cost a second one. Splitting it lets a narrow
 * window fold the explanation without dropping the entry, which is what the lead asked to keep.
 *
 * **THE ICE FRONT LEADS, because it is the only entry that is true on load.** At round one
 * nothing is frozen — `createHardWinter` opens with an empty set and the first advance is part of
 * `end_round` — so every entry under it describes an empty board until a round has been played,
 * and the first thing a player can actually find on the island is where the frost starts.
 *
 * The frost line's clause used to be *"the only part that moves next"*, and it stopped being true
 * when the front arrived: the FRONT is what moves next, and the line is how far the frost has got.
 * A key that said otherwise would name the two states in each other's terms.
 */
export const ISLAND_LEGEND: readonly (readonly [number, string, string?])[] = [
  [WINTER_GROUND_TONES.frostFront, "the ice front", "where it reaches this round"],
  [WINTER_GROUND_TONES.frost, "frozen"],
  [WINTER_GROUND_TONES.frostLine, "the frost line", "how far it has got"],
  [WINTER_GROUND_TONES.warded, "a fire is holding this"],
];

export function IslandLegend() {
  return (
    <ul className="winter-in-city__legend" data-testid="winter-island-legend">
      {ISLAND_LEGEND.map(([tone, label, why]) => (
        <li key={label}>
          <span
            aria-hidden="true"
            className="winter-in-city__swatch"
            style={{ background: `#${tone.toString(16).padStart(6, "0")}` }}
          />
          {label}
          {why && <span className="winter-in-city__legend-why">: {why}</span>}
        </li>
      ))}
    </ul>
  );
}

export interface WinterInCityProps {
  /**
   * The island as it stands RIGHT NOW, from the city's own state. The winter falls on this
   * and nothing else — see {@link liveCityLayoutFrom}'s note on why it is not re-read from
   * storage.
   *
   * Taken as the two lists rather than as one object so the board can be memoised on their
   * identities: an object literal at the call site would be new on every render of the city,
   * and the city re-renders every time this component publishes to it.
   */
  readonly placements: LiveCitySource["placements"];
  readonly townHall: LiveCitySource["town_hall"];
  /** Where one moment of the winter goes so the city's canvas can draw it. */
  readonly onBoard: (board: WinterCityBoard | null) => void;
  /**
   * Whether the city's 3D canvas is actually rendering. When it is not — no WebGL, a
   * `enableCanvas={false}` host, a scene that failed closed — there is no island to fall on,
   * so the winter keeps the 2D grid it already has rather than showing controls for a board
   * nobody can see.
   */
  readonly canvasLive: boolean;
  /**
   * The skills this learner has practised, which is the set the crisis draws its questions
   * from. Handed over rather than re-read from storage for the same reason `placements` is:
   * a learner who has just finished a practice set may not have flushed, and progress read
   * from storage inside a running city can be a set behind the one on screen.
   */
  readonly practisedNodeIds: readonly string[];
  /**
   * The era the city is standing in. Handed straight through to the winter's surface, which
   * resolves it against the eras whose land budget is authored (`../../winter/crisisEra.ts`) —
   * the island under the crisis now re-dresses with the era, so a crisis that cannot follow it
   * has to say so rather than looking like the city's own age.
   */
  readonly liveEraId?: EraId;
  /**
   * ONE MILESTONE LINE for the crisis's concluding card, or null.
   *
   * Computed by `CitySurface` off the city's own crisis damage (`city/milestones.ts`) and
   * handed down, because *"is this your first crisis"* is a fact about the island and not
   * about this encounter. Passed through untouched: the winter renders the sentence it is
   * given and never decides one, which is what keeps the mechanic in the city's lane.
   */
  readonly milestone?: string | null;
  /**
   * **WHERE THE CARRY-BACK WRITES**, handed down from `CitySurface` and never decided here.
   *
   * The crisis has no business knowing whether this city is a dev session or a signed-in
   * one; what it needs is somewhere to put the damage that the ISLAND BEHIND IT is drawn
   * from. Omitted, `scarLiveCity` falls back to the saved blob, which is what left the lead
   * pressing a button that changed nothing on screen — so the in-city mount always supplies
   * one, and `winterInCityCarryBack.test.tsx` fails if this stops being wired.
   */
  readonly onCarryDamage?: ScarCommit;
  readonly onExit: () => void;
}

export function WinterInCity({
  placements,
  townHall,
  onBoard,
  canvasLive,
  practisedNodeIds,
  liveEraId,
  milestone = null,
  onCarryDamage,
  onExit,
}: WinterInCityProps) {
  const WinterSurface = preloadedHardWinterSurface ?? HardWinterSurface;
  const live = useMemo<LiveCityResult>(
    () => liveCityLayoutFrom({ placements, town_hall: townHall }),
    [placements, townHall],
  );
  const readLiveCity = useCallback(() => live, [live]);
  // Narrowed to era one's own authored nodes here rather than in the surface, so the
  // in-city mount and the `?winter` mount apply D-CRISIS-14's era-one exception through one
  // function instead of two.
  const readMasteredNodes = useCallback(
    () => winterEligibleNodesFromIds(practisedNodeIds),
    [practisedNodeIds],
  );

  // An island with nothing on it is REFUSED rather than quietly swapped for an authored
  // layout. On `?winter` that swap is right — the authored boards are the instrument for
  // judging a tuning number. Here it would be a lie the picture tells: the canvas behind
  // would go on showing this city while the engine played a different one, so frost would
  // land beside buildings it was not falling on.
  if (live.status !== "ready") {
    return (
      <div className="winter-in-city winter-in-city--refused" data-testid="winter-in-city">
        <div className="winter-in-city__rail">
          <h2>The winter has nothing to fall on</h2>
          <p>{live.message}</p>
          <button type="button" className="city-action" onClick={onExit}>
            Back to the island
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="winter-in-city"
      data-testid="winter-in-city"
      data-board={canvasLive ? "island" : "grid"}
    >
      {/* Not a `city-action`: the city's ghost chip is drawn for a HUD strip and this sits on
          whatever the island puts under it. Borrowing that class also lost the colours to
          `.city-shell .city-action-ghost` on source order, which is how it shipped as pale
          text on the lagoon. It owns its own look instead. */}
      <button type="button" className="winter-in-city__exit" onClick={onExit}>
        Leave the winter
      </button>
      <Suspense fallback={<p className="hw-note">Bringing the winter in…</p>}>
        <WinterSurface
          onLeave={onExit}
          onCarryDamage={onCarryDamage}
          readLiveCity={readLiveCity}
          readMasteredNodes={readMasteredNodes}
          liveEraId={liveEraId}
          milestone={milestone}
          renderBoard={
            canvasLive
              ? (slot) => <WinterBoardBridge slot={slot} onBoard={onBoard} />
              : undefined
          }
          /* The key moved OUT of the board slot and into the settlement strip's, so the two can
             share a row. The board slot keeps the bridge and nothing else, which is what it was
             always for: the board is the city's own canvas. */
          renderStatusKey={canvasLive ? () => <IslandLegend /> : undefined}
        />
      </Suspense>
    </div>
  );
}
