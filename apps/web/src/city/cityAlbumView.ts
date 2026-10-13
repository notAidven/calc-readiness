import {
  ERA_SEQUENCE,
  type EraDefinition,
  type EraId,
  getEraOfNode,
} from "@cr/skill-graph";

import { lessonByNode } from "../lessons/domains";
import { buildingName } from "./buildingAssets";
import { parseCivicPlacementId } from "./civic";
import { buildingDisplayName, buildingSubtitle } from "./eraDressing";
import { type IslandGroundDressing, islandGround } from "./islandGround";
import { isTownHall, TOWN_HALL_ID, TOWN_HALL_LABEL } from "./townHall";
import { type Footprint, footprintFor, type PlacedTransform } from "./worldLayout";

/**
 * **THE RECONSTRUCTION: which buildings stood on this city at the close of each age,
 * derived from the placements standing on it now.**
 *
 * ## ⚑ THE SURFACE THIS FED IS CUT. THE DERIVATION IS KEPT ON PURPOSE.
 *
 * This was the read model behind the Album (D-ERA19 layer 4, the surface the team lead
 * named the **chronicler**), which shipped in `#393`, gained the bought half of the city in
 * `#514`, and was **cut by the lead on 2026-08-04** along with the Timeline. `CityAlbum.tsx`
 * is gone, the ☰ Menu button is gone, and nothing in the product renders this today.
 *
 * **It is kept because the archipelago needs exactly this function, and #568 §8.8 says so
 * in as many words:** *"The album reconstructs each past era's composition from current
 * placements; under the archipelago that reconstruction stops being a reconstruction"* —
 * the revisited island **is** the Album made literal. So the cut removes the SURFACE that
 * drew this as a page of small plans, and keeps the DERIVATION that answers what stood
 * where, because stage 3 has to answer that question whatever draws it. Deleting it would
 * mean writing the argument below again from scratch, and the argument is the expensive
 * part rather than the forty lines of code under it.
 *
 * **So it has no production caller right now, and that is a stated interval rather than an
 * oversight.** Stage 3 of #575 is unstarted. `cityAlbumView.test.ts` is what keeps this
 * honest in the meantime: it drives every branch, and it holds the two properties below,
 * so this cannot rot into something the island cannot use. If stage 3 is abandoned, this
 * module should go with it — an unreferenced module nobody is waiting on is dead weight,
 * and the only thing separating this from that is #568's plan for it.
 *
 * Named `cityAlbumView.ts` rather than `cityAlbum.ts` on the same rule that gave
 * `eraTimelineView.ts` its name beside the deleted `EraTimeline.tsx`, and it is not a style
 * preference: `test/repoFileCasing.test.ts` fails on two modules in one directory whose
 * specifiers differ only in case, because `./cityAlbum` would mean either file on a
 * case-insensitive checkout. It caught this pair on its first full run.
 *
 * ## ⚑ IT IS NOT THE TIMELINE AND IT IS NOT THE CHRONICLE
 *
 * §11.2 records all three and warns they will be confused unless the difference is
 * written down. Two of the three are now cut and the third was never built, but the
 * distinction is what keeps THIS module re-usable rather than a fifth thing answering
 * *"what have I done"*, so it is written down here in the terms this module can be held
 * to rather than as prose:
 *
 * | Surface | Its input | State |
 * | --- | --- | --- |
 * | **The Timeline** | `(ERA_SEQUENCE, masteredNodeIds)` (the CURRICULUM) | Panel cut 2026-08-04; read model kept at `eraTimelineView.ts` for the archipelago overview |
 * | **The Chronicle** (layer 2) | a DOOR back into a past skill's lesson or practice | Unbuilt, Evan's. Not cut, because there was nothing to cut |
 * | **The Album** (layer 4, here) | `(placements, townHall, liveEraId)` (this player's own LAYOUT) | Panel cut 2026-08-04; this derivation kept for the revisited island |
 *
 * §11.2's own test for whether they are really three things is that *"neither can be
 * derived from the other … the timeline is identical for two learners at the same mastery,
 * and the chronicler never is."* That is a statement about INPUTS, so it is enforceable
 * rather than aspirational, and two properties fall out of it that the tests pin:
 *
 *  1. **THIS MODULE TAKES NO MASTERY INPUT AT ALL.** {@link CityAlbumInput} carries no
 *     `StudentNodeState`, no `Mastery` and no completion status, so it cannot report a
 *     score, a tier or a completion fraction, not because a rule forbids it but because
 *     the number is not in the room. That is **BUILD 2** (*"no parallel point systems"*)
 *     satisfied structurally, and `INV-COS-1` likewise: a record that reads no learning
 *     state cannot be an input to any. **It matters MORE after the cut, not less**: the
 *     lead's reason for cutting was four or five overlapping systems answering *"what
 *     have I done"*, and a revisited island that acquired a mastery on the way to being
 *     built would be the fifth arriving through the back door.
 *  2. **IT IS A RECORD AND NOT A DOOR.** Nothing here resolves a lesson route, a practice
 *     pool or a callback. Adding one would build a second Chronicle beside Evan's, which
 *     is the specific waste §11.2 exists to prevent. #568 §8.8 puts the practice door on
 *     the revisited island's HALL and says the row *"is Evan's and should be settled with
 *     him rather than claimed here"*. When it lands it wants `LessonMenu`
 *     (`apps/web/src/lessons/LessonMenu.tsx`, already opened from two places, §11.4), not
 *     a menu of its own and not this file.
 *
 * ## THE PAST IS RECONSTRUCTED, NOT SNAPSHOTTED, and here is why that is sound
 *
 * A log of what the city looked like at each era needs each era's state. There is no
 * per-era snapshot anywhere and this module does not ask for one, because three facts
 * that already ship make the CURRENT placement set sufficient to recover every past era's
 * composition:
 *
 *  1. **Nothing is ever removed.** D-ERA7 gives a node one placement with no demolish and
 *     no rebuild path; `citySession.ts`'s `placements` map is written and never deleted
 *     from; a crisis RUINS a building and leaves its placement exactly where it was
 *     (`citySession.ts`, `crisis_damage` *"held BESIDE `placements` and never inside
 *     it"*); and server-side `0004_civilization_state.sql` grants `select, insert` plus
 *     `update (grid_col, grid_row, rot)` on `city_placement` and **no `delete`**. So the
 *     set of buildings that stood at the close of era N is a SUBSET of the set standing
 *     now, and the only question is which.
 *  2. **Every node belongs to exactly one era, statically.** `getEraOfNode` reads
 *     `ERA_SEQUENCE` membership (INV-ERA-2), and `eras.test.ts` pins the ten node sets as
 *     a partition of the 62 in-product nodes.
 *  3. **So filtering by the node's era IS the reconstruction**, and it is the same
 *     derivation the shipped city already makes about the same buildings. `eraDressing.ts`
 *     resolves a skill building's dressing against `getEraOfNode(nodeId)` and the hub's
 *     against the live era, on R3's ruling that skill buildings never re-dress. If the era
 *     a standing building is DRESSED for is the era of its node, then the era it belongs
 *     to in an album is the same era, and there is no second notion of *when did this go
 *     up* for the two to disagree about.
 *
 * ### A BOUGHT building dates itself the same way, off its catalogue row
 *
 * The three facts above are about skill nodes. The bought half of the city reaches the
 * same place by a shorter route, and it is worth stating because a purchase looks at
 * first like the thing that WOULD need a stored date. **D-ERA11 freezes a civic building
 * in the era it was bought, makes each era's catalogue exclusive to that era, and refuses
 * renovation**, so its era is a property of the catalogue row its placement id names.
 * `civicPlacementEra` (`packages/economy/src/civicBuilding.ts`) already says exactly this:
 * *"those two facts pin the built era to the id. Stating it as a function rather than a
 * stored field removes the whole class of defect where persisted state disagrees with the
 * catalogue."*
 *
 * **And this is the half of the city that is most worth having here**, which is why it is
 * read at all rather than left to the skill buildings. D-ERA11's own consequence is that
 * *"each era's expansion opens new ground, that era's civic buildings are placed there,
 * and they stay in that era's dress. The player walks outward from a mudbrick core through
 * stone and brick and iron to neon."* Those quarters are the archaeological layers the era
 * model is built to produce, and a skill building is one per node while a civic building
 * is buyable as often as the learner can afford one, so in a played city the bought
 * quarters are most of what they actually CHOSE.
 *
 * ### What `city_placement.era_built` adds, and why it is not needed here
 *
 * The column is written (`services/diagnostic-api/src/writes.ts`, stamped once and left
 * alone by a transform-only `do update`) and **never read back**: `CityPlacementRead`
 * carries no era, and that file says so outright: *"Nothing reads `era_built` back
 * today"*. So it is the STORED answer to which era a building went up in, and it can
 * differ from `getEraOfNode` only where a building is raised while the city stands in a
 * different era. `eraDressing.ts` records that as impossible for anything the city can
 * raise today, and that if D-ERA17 or D-ERA18 ever make it possible *"the raised era moves
 * onto the placement and this function reads it from there"*. **The same applies here, and
 * it is a read of a column that is already stored rather than a migration.**
 *
 * ### The two things that genuinely are NOT recoverable, cited rather than migrated
 *
 * Both are recorded here because the honest answer to *"does this need a snapshot"* is
 * *"only for these"*, and a new table is a schema change with a manual migration behind
 * it:
 *
 *  * **WHERE a building stood.** The only mutable columns are `(grid_col, grid_row, rot)`,
 *    so relocating a building overwrites where it was and no history survives in either
 *    tree. The album is therefore exact about COMPOSITION and present-day about POSITION:
 *    a building that never moved is drawn where it stood, and one that moved is drawn
 *    where it is now. {@link CityAlbumFrame} says so at the field.
 *  * **Roads, and crisis scars.** `city_road` carries **no era column at all** and does
 *    carry a `delete` grant, so a lifted tile leaves no trace and a laid one has no date;
 *    `city_crisis_damage` rows are deleted on repair. Neither can be placed in time, so
 *    the album draws neither rather than drawing a present-day road into era one's frame.
 */

/** What the album needs, and deliberately the whole of it. See the header, point 1. */
export interface CityAlbumInput {
  /**
   * The skill buildings standing on the island now: `CityLoad.placements`, unfiltered.
   * The album partitions them by era rather than asking the caller to.
   */
  readonly placements: readonly PlacedTransform[];
  /**
   * The BOUGHT buildings standing on the island: `CityLoad.civic`, unfiltered, each a
   * `PlacedTransform` whose `nodeId` is a civic placement id (`civic.ts`).
   *
   * Held apart from {@link placements} because the city holds the two apart, and read
   * here for a reason that is this surface's own: **a bought building is the one class
   * of thing on the island that is DEFINED by an era.** D-ERA11 freezes it in the era
   * it was bought, makes each era's catalogue exclusive to that era, and refuses
   * renovation, which is what produces the design's *"mudbrick core through stone and
   * brick and iron to neon"* reading. An album that drew only the earned buildings drew
   * the half of the city the curriculum handed over and left out the half the learner
   * chose.
   */
  readonly civic?: readonly PlacedTransform[];
  /** The island hub, or `null` when a load carried none. Never in `placements`. */
  readonly townHall?: PlacedTransform | null;
  /** The era the city is standing in (`eraState.ts`). The album stops here. */
  readonly liveEraId: EraId;
}

/**
 * Whether a piece on a frame's plan is the hub, a skill building the learner EARNED, or
 * a civic building they BOUGHT.
 *
 * Three rather than two because the surface fills them differently, and a learner who
 * cannot tell a quarter they paid for from a building their study raised is reading one
 * undifferentiated blob rather than their own city.
 */
export type AlbumPieceKind = "hall" | "skill" | "civic";

/**
 * One building on one frame's plan: what it is called, where it sits, and how much room
 * it takes. Enough to draw a plot and to name it, and nothing else.
 */
export interface AlbumPiece {
  /** Stable within a frame. The node id for a skill, the hub's sentinel for the hall. */
  readonly id: string;
  readonly kind: AlbumPieceKind;
  /**
   * THE LEARNER-FACING NAME, or `null` when the city has no name for this building.
   *
   * `null` is not defensiveness. `buildingName` documents its own fallback as *"or the
   * node id if unmapped"*, and 56 of the 62 nodes are unmapped, so the obvious
   * `buildingDisplayName(nodeId, era)` prints `RAD.1`, and prints
   * `"RAD.1, the Potter's Kiln"` for the five era-two nodes that DO have a dressing, which
   * a `label !== nodeId` check would wave through. {@link albumLabel} is the three-step
   * fallback that cannot leak one, and `null` is its honest floor: the surface draws the
   * plot and says nothing about it.
   */
  readonly label: string | null;
  /** The era this building belongs to. For the hall, the frame's own era (it re-themes). */
  readonly eraId: EraId;
  readonly col: number;
  readonly row: number;
  readonly rot: number;
  /**
   * Pre-rotation, as `footprintFor` gives it. A consumer that needs the cells this
   * actually covers rotates it with `rotatedFootprint` (`worldLayout.ts`), which is
   * where the 3D island reads it from too.
   *
   * There was a one-line `albumPieceSpan` here that did exactly that call, and it went
   * with the surface: its only caller was the deleted SVG plan, and a wrapper kept for
   * nobody is the same defect as a deletion, one function down.
   */
  readonly footprint: Footprint;
  /** True when this building went up in the frame's own era. The hall is never new. */
  readonly arrived: boolean;
}

/** One era's page: the city as it stood when the city was standing in that era. */
export interface CityAlbumFrame {
  readonly era: EraDefinition;
  /** 1-based play position, from `ERA_SEQUENCE` order (INV-ERA-5). */
  readonly number: number;
  /**
   * EVERYTHING THAT STOOD, hall first then the earned and bought buildings in era order.
   *
   * Exact about which buildings, present-day about where they are. See the header's
   * *"two things that genuinely are NOT recoverable"*.
   */
  readonly stood: readonly AlbumPiece[];
  /** The subset of {@link stood} that went up in this era. Never includes the hall. */
  readonly raised: readonly AlbumPiece[];
  /**
   * The hub as this era dressed it: era one's *Stone Circle*, era two's *the Elders'
   * Hearth*, era three's *the Council Hall*, era four's *the Senate House*, and the bare
   * "Town Hall" for the eras with no ratified dressing.
   *
   * This is the field §11.3's argument turns on: after the re-dressing ruling the hall is
   * the only building whose earlier looks are *"genuinely lost"*, which makes the album
   * *"the only place nine retired halls can ever be seen again."* As far as the AUTHORED
   * data goes, which was three of the ten when this shipped and is four at the time of
   * writing, and {@link hallDressed} reports which. The count is not pinned here: this
   * reads `eraDressing.ts` live, so a ratified guide turns these pages with no change in
   * this file, which is the property the field exists to have.
   */
  readonly hallLabel: string;
  /** True when this era has a ratified hub dressing, so a surface need not guess. */
  readonly hallDressed: boolean;
  /** The era's ground, from the ratified ladder. Total; `art` says which it got. */
  readonly ground: IslandGroundDressing;
  /** True on the era the city is standing in, which is always the last frame. */
  readonly live: boolean;
}

export interface CityAlbum {
  /** Era one first, the live era last. Never an era the city has not reached. */
  readonly frames: readonly CityAlbumFrame[];
  /** The era the city is standing in. Always the album's last frame. */
  readonly liveEraId: EraId;
  /**
   * True when the learner has neither earned nor bought a building anywhere on the
   * island, so the album's only subject is the hub it was given for free.
   *
   * Named rather than derived at the surface because it is the state EVERY learner is in
   * on day one, and whatever draws this has to be written for it first.
   *
   * It counts PURCHASES as well as masteries, and that is a correction rather than a
   * widening: while this read only saw skill placements, a learner who had spent a whole
   * era's stockpile on quarters opened their album and was told nothing had been raised.
   */
  readonly empty: boolean;
}

/**
 * The name to print for a building, or `null` when the city has none.
 *
 * Three steps, in this order, and the order is the argument:
 *
 *  1. **The city's own name**, `buildingDisplayName`: the stable era-neutral handle plus
 *     the era's dressing (*"Dwellings, Hut Cluster"*). Taken only when `buildingName`
 *     resolved to a real name, which is what keeps the node-id fallback out.
 *  2. **The era's dressing alone** (*"the Potter's Kiln"*), for a node with a ratified
 *     dressing and no mapped building. A dressing is a proper noun for a BUILDING, which
 *     is what an album shows, so it beats the lesson title here.
 *  3. **The lesson's title**, the one remaining learner-facing string for a node.
 *
 * `null` when none of the three exists. Never the node id: this album's whole prose
 * surface is swept for all 62 of them.
 */
export function albumLabel(nodeId: string, eraId: EraId): string | null {
  if (isTownHall(nodeId)) {
    return buildingDisplayName(TOWN_HALL_ID, eraId);
  }
  if (buildingName(nodeId) !== nodeId) {
    return buildingDisplayName(nodeId, eraId);
  }
  return buildingSubtitle(nodeId, eraId) ?? lessonByNode[nodeId]?.title ?? null;
}

function skillPiece(placed: PlacedTransform, frameEraId: EraId): AlbumPiece | null {
  const era = getEraOfNode(placed.nodeId);
  if (!era) {
    // A placement for a node in no era. Unreachable through the registry (`eras.test.ts`
    // pins the ten sets as a partition of the 62 in-product nodes), and dropped rather
    // than guessed at, because the alternative is filing it under an era it is not from.
    return null;
  }
  return {
    id: placed.nodeId,
    kind: "skill",
    label: albumLabel(placed.nodeId, era.id),
    eraId: era.id,
    col: placed.col,
    row: placed.row,
    rot: placed.rot,
    footprint: footprintFor(placed.nodeId),
    arrived: era.id === frameEraId,
  };
}

/**
 * A bought building, filed under the era whose catalogue sold it.
 *
 * **The era comes off the id, and that is a reconstruction on exactly the header's
 * argument rather than a second one.** `civicPlacementEra`
 * (`packages/economy/src/civicBuilding.ts`) puts it in the same terms: *"buildings are
 * era-exclusive and never renovate (D-ERA11), so those two facts pin the built era to
 * the id. Stating it as a function rather than a stored field removes the whole class of
 * defect where persisted state disagrees with the catalogue."* So the album needs no
 * `era_built` read and no snapshot here either, and for the same reason it needs neither
 * for a skill node.
 *
 * `null` for an id this build's catalogue does not sell, which is `civicTypeOf`'s own
 * rule: *"a restored dev snapshot holding an id for a type this era no longer authors
 * must drop that building rather than resolve it to some other row of the catalogue."*
 * A dropped building is a plot missing from a plan; a guessed one is a page that says
 * the learner built something they did not.
 */
function civicPiece(placed: PlacedTransform, frameEraId: EraId): AlbumPiece | null {
  const parsed = parseCivicPlacementId(placed.nodeId);
  if (parsed === null) {
    return null;
  }
  return {
    id: placed.nodeId,
    kind: "civic",
    // The catalogue's own name ("The Smokehouse"), which is authored for all forty rows,
    // so this branch has no `null` floor to fall through to the way `albumLabel` does.
    label: parsed.row.name,
    eraId: parsed.row.era,
    col: placed.col,
    row: placed.row,
    rot: placed.rot,
    footprint: footprintFor(placed.nodeId),
    arrived: parsed.row.era === frameEraId,
  };
}

function hallPiece(hall: PlacedTransform, frameEraId: EraId): AlbumPiece {
  return {
    id: TOWN_HALL_ID,
    kind: "hall",
    // Never null: `placementLabel` resolves the sentinel to `TOWN_HALL_LABEL` and D-TH7
    // fixes that name in all ten eras, so the hall always has something to be called.
    label: albumLabel(TOWN_HALL_ID, frameEraId),
    eraId: frameEraId,
    col: hall.col,
    row: hall.row,
    rot: hall.rot,
    footprint: footprintFor(TOWN_HALL_ID),
    // The hub is pre-seeded on every island and never placed, so it arrives in no era.
    // Marking it new on era one's frame would read as the learner having built it.
    arrived: false,
  };
}

/**
 * The album for a city: one frame per age it has stood in, in order.
 *
 * One frame per era from era one up to and INCLUDING the era the city stands in, and
 * never one beyond it. That bound is what stops this becoming a ten-slot set with three
 * filled: a shape with a size, and therefore a completion fraction whether or not
 * anything renders one, which is what **BUILD 2** forbids and what
 * `2026-08-01-game-feel-mechanics-backlog.md` §5.6 prohibition 1 spells out. **The bound
 * carries over to the archipelago unchanged**, where it is the set of islands a learner
 * has actually founded rather than ten slots in a bay with three lit.
 *
 * A frame with nothing new on it is kept rather than skipped: an era in which the learner
 * built nothing is a true page of their own record, and an island they founded and left
 * bare is still an island they founded.
 */
export function cityAlbum(input: CityAlbumInput): CityAlbum {
  const liveIndex = ERA_SEQUENCE.findIndex((era) => era.id === input.liveEraId);
  // An era id outside the sequence reads as era one, following `loadEraId`'s own
  // departure from fail-loud for exactly this case: this value reaches the album from a
  // persisted store, so the failure it guards is a learner arriving at a panel that will
  // not open. Era one is the real floor of the sequence, not a plausible default.
  const upTo = liveIndex === -1 ? 0 : liveIndex;

  // Each placement paired with its era's PLAY POSITION, sorted into era order. The
  // position is what "stood by era N" filters on, and taking it once here is what keeps
  // the per-frame filter a comparison rather than a lookup per frame per building.
  //
  // EARNED AND BOUGHT ARE DATED THE SAME WAY AND THEN TRAVEL TOGETHER. They reach this
  // function as two lists because the city holds them as two lists, and they resolve
  // their era through two different lookups because a node's era is graph membership and
  // a purchase's era is its catalogue row. Past that point the difference stops mattering
  // to an album: both are buildings that went up in an era and stood in every era after
  // it, so merging here is what stops the nesting, the partition and the arrival filter
  // from being written twice and drifting apart.
  const dated = [
    ...input.placements.map((placed) => ({
      placed,
      build: skillPiece,
      at: ERA_SEQUENCE.findIndex((era) => era.id === getEraOfNode(placed.nodeId)?.id),
    })),
    ...(input.civic ?? []).map((placed) => ({
      placed,
      build: civicPiece,
      at: ERA_SEQUENCE.findIndex(
        (era) => era.id === parseCivicPlacementId(placed.nodeId)?.row.era,
      ),
    })),
  ]
    .filter((entry) => entry.at !== -1)
    .sort((a, b) => a.at - b.at);

  const frames = ERA_SEQUENCE.slice(0, upTo + 1).map((era, index): CityAlbumFrame => {
    const stoodBuildings = dated
      .filter((entry) => entry.at <= index)
      .map((entry) => entry.build(entry.placed, era.id))
      .filter((piece): piece is AlbumPiece => piece !== null);
    const hall = input.townHall ? hallPiece(input.townHall, era.id) : null;
    return {
      era,
      number: index + 1,
      stood: hall ? [hall, ...stoodBuildings] : stoodBuildings,
      raised: stoodBuildings.filter((piece) => piece.arrived),
      hallLabel: hall?.label ?? TOWN_HALL_LABEL,
      hallDressed: buildingSubtitle(TOWN_HALL_ID, era.id) !== null,
      ground: islandGround(era.id),
      live: index === upTo,
    };
  });

  return {
    frames,
    liveEraId: ERA_SEQUENCE[upTo]?.id ?? input.liveEraId,
    empty: dated.length === 0,
  };
}
