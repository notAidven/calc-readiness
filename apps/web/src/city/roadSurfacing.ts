import type { EraId } from "@cr/skill-graph";

/**
 * PER-ERA ROAD SURFACING — what the city's roads are made of, era by era.
 *
 * Authority: **D-ERA30** in `docs/superpowers/specs/2026-07-27-era-progression-design.md`
 * §5.5. It is the fourth of the same family: D-ERA26 made the island's terrain per-era
 * art, D-ERA27 moved the hue axis from the domain to the era, D-ERA28 did the advisor,
 * and this does the one remaining surface nothing owned — the road network.
 *
 * ## The gap this closes
 *
 * The road layer shipped a twentieth-century street: dark slate ASPHALT, light-grey
 * concrete CURB shoulders and a white PAINTED dashed centreline, run between era one's
 * thatch roundhouses and lashed timber. Paint and aggregate are not era-one materials at
 * all (`eras/era-01-prehistoric/style-guide.md`), so it read as a modern road someone had
 * driven through a prehistoric camp.
 *
 * ## Why per-era rather than simply replacing it with dirt
 *
 * The game ends in a modern city, so asphalt and painted lane markings must be able to
 * come BACK. Hardcoding dirt would trade one era's wrong road for nine others'. So the
 * surfacing is a table keyed by era, exactly as `eraDressing.ts` keys the dressing
 * subtitles, and the renderer is generic over it.
 *
 * ## The shape, and D-ERA28's constraint applied here
 *
 * D-ERA28 records that an era advance may SHRINK a vocabulary — its case was the
 * advisor's pose set — and that consumers must therefore map through a total typed table
 * rather than assume the previous era's vocabulary survives. Roads have exactly that
 * property: era one wants TWO courses (a scuffed verge and a packed tread) where the
 * outgoing modern road had THREE (curb, asphalt, markings), and "painted markings" is a
 * course kind era one cannot express at all.
 *
 * So an era declares an ORDERED LIST of courses rather than filling in a fixed set of
 * named slots:
 *
 *   - the list may be any length, so an era may drop a course another era has;
 *   - each course is a DISCRIMINATED UNION on `kind`, so the renderer switches
 *     exhaustively and a new course kind is a COMPILE ERROR until it is drawn rather
 *     than a course that silently renders nothing;
 *   - the ladder each course sits on is DERIVED from its index (see `Roads.tsx`), never
 *     authored, so no era can invent a height between two rungs and reintroduce the
 *     z-fighting that `depthPrecision.test.ts` exists to prevent.
 *
 * ## Why only era one is authored, and what a missing era does
 *
 * Era one is the only era with authored, ratified art. The nine later style guides are
 * marked PROPOSED, and `eraDressing.ts` sets the precedent that unratified art is not
 * wired: nine of its ten rows are deliberately absent. Each later era OWES a surfacing
 * row as its guide is ratified.
 *
 * A missing era degrades to {@link UNAUTHORED_ROAD_SURFACING} — ONE course of bare
 * earth. This differs from `eraDressing`'s `null` on purpose: a name can be omitted and
 * the building still reads, but a laid road tile the player PAID for cannot render
 * nothing, so the honest fallback is the plainest thing a road can be rather than an
 * invented surface or a borrowed one from the previous era. `hasAuthoredRoadSurfacing`
 * is how a caller or a test tells the two apart.
 */

/** A solid course of road surface: a band across the tile and along every arm. */
export interface RoadSlabCourse {
  readonly kind: "slab";
  /** Stable id, for tests and for reading a depth ladder back by name. */
  readonly id: string;
  readonly color: number;
  readonly roughness: number;
  /** Width across the tile, as a fraction of `GRID_CELL`. */
  readonly widthFactor: number;
  /**
   * Break the outline with worn lumps along both edges, so it reads as ground that got
   * WALKED ON rather than a band that got laid. A straight-edged slab is most of what
   * makes a flat surface look placed — the island's `wornLump` learnt the same thing.
   * A paved era leaves this `false` and keeps its crisp kerb line.
   */
  readonly ragged: boolean;
}

/**
 * Painted lane markings down the centre of every connected arm. A course kind era one
 * cannot express: paint is not one of its materials. Kept in the union because the
 * modern eras this game ends in need it back.
 */
export interface RoadMarkingsCourse {
  readonly kind: "markings";
  readonly id: string;
  readonly color: number;
  /** Dash length along the arm, and its width across it, as fractions of `GRID_CELL`. */
  readonly lengthFactor: number;
  readonly widthFactor: number;
}

export type RoadCourse = RoadSlabCourse | RoadMarkingsCourse;

export interface RoadSurfacing {
  /**
   * The courses, LOWEST FIRST. Index is meaning: it fixes the depth rung each course
   * sits on, so reordering this array restacks the road.
   */
  readonly courses: readonly RoadCourse[];
}

/* -------------------------------------------------------------------------- */
/* Era one — a path worn into the ground                                      */
/* -------------------------------------------------------------------------- */

/**
 * Era one's road is the ground itself, worn through. Evan:
 * *"I would like the roads to be like dirt pathing in the ground."*
 *
 * ## How this relates to the worn earth the island ALREADY draws
 *
 * `StarterIsland` renders worn bare earth and footpaths as decals in the margin — the
 * same fiction. The two could easily read as redundant, so they are deliberately made
 * ONE material system with a VALUE step between them, rather than two systems that
 * happen to share a hue:
 *
 *   - the VERGE is the island's ambient worn-earth tone EXACTLY (`C.earth` `#c9a06a`).
 *     A road's edge is the same soil, scuffed the same way, so it is the same colour.
 *   - the TREAD is darker than every worn tone the island uses (`#9d7748` reads 0.201
 *     in three's working space, against the island's `earth` 0.364, `earthWorn` 0.262
 *     and `earthDeep` 0.157). That reads as harder-worn: a route people take every
 *     day, not the incidental scuffing around a drying rack.
 *
 * They also cannot meet in plan — roads are inside `BUILDABLE_RADIUS` (22) and every
 * island decal is outside 25 — so there is no seam for them to fight along.
 *
 * ## Why it does not vanish into ground that is already earth-coloured
 *
 * The ground the roads actually lie on is not the margin's dirt, it is the vivid
 * yellow-green tussock (`#a8b850`, hue 73, lightness 0.280) that the re-saturation pass
 * left. Judged against THAT, the path is legible from BOTH sides: the verge is lighter
 * than the tussock (0.364 vs 0.280) and the tread is darker (0.201 vs 0.280). A
 * two-sided value contrast is also what makes it read as SUNKEN rather than laid on
 * top, which is the whole of what Evan asked for — a pale dusty rim stepping down into
 * a dark packed hollow.
 */
const ERA_ONE_VERGE: RoadSlabCourse = {
  kind: "slab",
  id: "verge",
  color: 0xc9a06a,
  roughness: 0.96,
  widthFactor: 0.66,
  ragged: true,
};

const ERA_ONE_TREAD: RoadSlabCourse = {
  kind: "slab",
  id: "tread",
  color: 0x9d7748,
  roughness: 0.98,
  widthFactor: 0.42,
  ragged: true,
};

/**
 * The surfacing an era with no authored row falls back to: one course of bare earth,
 * and nothing else. Deliberately the plainest thing a road can be — see the header for
 * why this is a real fallback rather than `null`.
 */
export const UNAUTHORED_ROAD_SURFACING: RoadSurfacing = {
  courses: [
    {
      kind: "slab",
      id: "bare-earth",
      color: 0xc9a06a,
      roughness: 0.96,
      widthFactor: 0.56,
      ragged: false,
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Era two — the path trodden into worked ground                              */
/* -------------------------------------------------------------------------- */

/**
 * Era two's road, and it is **PROVISIONAL — see the caveat below before defending it.**
 *
 * Transcribed from `docs/superpowers/specs/eras/era-02-neolithic/style-guide.md`, which
 * gives this era exactly two sentences about ground and they agree with each other. §3's
 * structural language: *"Ground worked and swept, not paved. Packed earth, beaten hardest
 * where it is used hardest."* And the island section: *"The worn paths of era one are now
 * trodden into shallow hollow ways"*, between which lie *"the first cleared plots — turf
 * stripped, stones picked out and heaped at the plot edges"*, so that ground *"reads in two
 * states for the first time: worked soil, raked and darker, against the pale dry tussock
 * that has not been touched yet."*
 *
 * ## What that makes the road, and why it is not just era one again
 *
 * Era one's is a path **worn** into tussock, so it is legible from both sides by value: a
 * pale scuffed verge above the grass and a dark tread below it. Era two's is a path
 * **trodden** into soil somebody has already turned over, and a hollow way is a route that
 * has sunk. So the same two courses change in three ways, all of them stated by the guide
 * rather than chosen here:
 *
 *  - the **verge narrows** (0.66 → 0.58). A cleared plot's edge is where the picked stones
 *    were heaped, so the scuffed margin has something to stop against for the first time;
 *  - the **tread widens and darkens** (0.42 → 0.50, `#9d7748` → `#7c5c37`). This is a
 *    settlement that walks the same route every day between store, oven and field, and
 *    *"beaten hardest where it is used hardest"* is the guide's own phrase for it;
 *  - both stay **ragged**, because nothing here is laid. Paving waits for the Classical
 *    era, which owns lime mortar and dressed stone; era two's §2 lists both as *"explicitly
 *    absent, because they are later eras' signature moves"*.
 *
 * The tread reads 0.115 in three's working space against era one's 0.201 and the tussock's
 * 0.280, so the two-sided contrast era one relies on survives and deepens rather than
 * inverting.
 *
 * ## ⚑ THE CAVEAT, and it is the reason this block is longer than the data
 *
 * **Era two's guide is marked PROPOSED as a whole**, and this module's header sets the bar
 * as ratified art: *"`eraDressing.ts` sets the precedent that unratified art is not wired:
 * nine of its ten rows are deliberately absent. Each later era OWES a surfacing row as its
 * guide is ratified."* Era two's **subtitle row** cleared that bar on 2026-07-29 and is
 * wired in `eraDressing.ts` on the strength of its own ratification — *"All seven are the
 * team lead's final names and the row is ready to wire"* — and **no equivalent sentence
 * exists for its ground.** So this row is a faithful transcription of authored-but-unratified
 * prose, wired because the era advance is meant to be visible and the roads are one of the
 * four things D-ET2 says an advance changes.
 *
 * **What it is NOT is a ratified surfacing**, and the honest alternative is on the record:
 * without this row era two takes {@link UNAUTHORED_ROAD_SURFACING}, one course of bare
 * earth, which is a defensible reading of *"packed earth, worked and swept"* and is a
 * visible change too. Evan owns the call. If he wants the fallback instead, delete this
 * entry and the constant below and nothing else moves.
 */
const ERA_TWO_VERGE: RoadSlabCourse = {
  kind: "slab",
  id: "verge",
  color: 0xbe9464,
  roughness: 0.96,
  widthFactor: 0.58,
  ragged: true,
};

const ERA_TWO_HOLLOW: RoadSlabCourse = {
  kind: "slab",
  id: "tread",
  color: 0x7c5c37,
  roughness: 0.98,
  widthFactor: 0.5,
  ragged: true,
};

/**
 * The surfacings, era by era. **Eras one and two**, and era one is the only RATIFIED one —
 * see {@link ERA_TWO_HOLLOW}'s block for what era two's is and is not, and the header for
 * why the remaining eight are absent rather than guessed.
 */
/*
 * ⚑ ERAS ONE AND TWO ARE SWAPPED HERE, ON EXPLICIT PRODUCT INSTRUCTION (2026-08-20): "swap
 * the artwork of eras 1 and 2." `prehistoric` now renders the courses authored for era two
 * (the trodden hollow way) and `neolithic` now renders the courses authored for era one (the
 * worn verge and tread). The course objects themselves are untouched; only which key points
 * at which pair moved.
 */
export const ERA_ROAD_SURFACING: Readonly<Partial<Record<EraId, RoadSurfacing>>> = {
  prehistoric: { courses: [ERA_TWO_VERGE, ERA_TWO_HOLLOW] },
  neolithic: { courses: [ERA_ONE_VERGE, ERA_ONE_TREAD] },
};

/** Whether this era has an AUTHORED surfacing, as opposed to the bare-earth fallback. */
export function hasAuthoredRoadSurfacing(eraId: EraId): boolean {
  return eraId in ERA_ROAD_SURFACING;
}

/**
 * The surfacing to render this era's roads with. TOTAL: always returns a usable
 * surfacing, so the renderer never branches on absence and a laid tile always draws.
 */
export function roadSurfacing(eraId: EraId): RoadSurfacing {
  return ERA_ROAD_SURFACING[eraId] ?? UNAUTHORED_ROAD_SURFACING;
}
