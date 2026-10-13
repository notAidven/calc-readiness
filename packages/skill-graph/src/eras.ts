/**
 * THE ERA DATA MODEL — one city, ten eras.
 *
 * Authority: `docs/superpowers/specs/2026-07-27-era-progression-design.md`
 * (D-ERA1..D-ERA4, D-ERA25, INV-ERA-2, INV-ERA-5), open item **O-1**, which delegates
 * the exact node sets to this module and is answered here (PR #180). Every node set
 * below is authored here; the spec fixes the era names, the order, and the
 * era-to-domain intent, and explicitly left membership open ("The exact node sets are
 * open (§17 O-1, Gabriel) and are the first thing the era data model needs").
 *
 * ## INV-ERA-5 — the sequence is authored data, never inferred from `DomainId`
 *
 * Three structural facts make the derivation this invariant bans *impossible*
 * rather than merely discouraged, and each is pinned by a test in `eras.test.ts`:
 *
 *  1. **Order is array position in `ERA_SEQUENCE`, and nothing else.** No entry
 *     carries an ordinal field that could drift from its position, so there is no
 *     second opinion about the sequence for a reader or a sort to disagree with.
 *  2. **`EraId` is a slug, not a number.** `Number(id.slice(1))` — the shape
 *     `getLockedDistricts` uses on `DomainId` (`engines/game/src/neighborhood.ts`),
 *     which the spec names as the incidental ordering logic that must not become
 *     the era sequence — yields `NaN` on every era id. There is no ordinal to parse.
 *  3. **No era entry carries a domain at all**, and this file imports no
 *     `DomainId`. Era membership is over NODE ids, which are mnemonic and stable
 *     (D-ERA4: "node ids do not change"), so the coming domain renumber cannot
 *     reach this data.
 *
 * Fact 3 is also load-bearing in the other direction: the grouping below is **not
 * a function of domain**, so no `DomainId`-keyed derivation could reproduce it even
 * if someone tried. Three domains span more than one era (D4 over three, D5 over
 * two, D6 over three) and three eras hold more than one domain, with the
 * Early Modern holding four. That is asserted, with counts, rather than left as a
 * claim.
 *
 * ## Why a graphing lesson never precedes the coordinate plane
 *
 * The registry names `CG.1` as a hard prerequisite for some graphing nodes (`POL.5`,
 * `FUN.4`, `FUN.9`) and not for others (`POL.6`, `POL.7`, `RAT.5`, `FUN.3`, `FUN.10`,
 * `EL.2`, `EL.4`, `TRG.5`, `TRG.6`), because a hard edge records what a learner must
 * have MASTERED and end behaviour can be stated from a degree and a leading
 * coefficient without ever drawing anything. It cannot be TAUGHT that way. So the
 * prerequisite sweep in `eras.test.ts` is blind to nine graph-reading nodes, and the
 * era sets have to carry the rule the graph does not: **no graph-reading lesson sits
 * before the era that introduces the plane.** That rule is what moved `POL.6`,
 * `POL.7` and `RAT.5` out of the Classical and Medieval eras into Early Modern,
 * and it is asserted directly rather than left to the edge list.
 *
 * ## INV-ERA-2 — every node is retained
 *
 * The ten sets are a partition of the 62 in-product nodes (`getProductNodes()`):
 * every node lands in exactly one era, none is dropped, none is duplicated.
 * Asserted in `eras.test.ts` against the registry rather than against a
 * transcribed list, so a registry change fails the test instead of silently
 * shrinking the curriculum.
 *
 * ## The per-era land budget (D-ERA25, Evan): ALL TEN ERAS ARE AUTHORED
 *
 * §17 O-3 ("how much land each era unlocks") is **resolved as D-ERA25** (§5.1): the
 * buildable radius is **per-era authored data**, set as each era's buildings are
 * designed, and there is **no global expansion curve**. Era one is the shipped
 * `BUILDABLE_RADIUS = 22` (`apps/web/src/city/worldLayout.ts`), authored in #202.
 * D-ERA6's "~45" end state is **withdrawn** by D-ERA25 and no figure replaces it as a
 * curve; what replaces it is ten separately derived numbers, below.
 *
 * ### WHAT IS RULED HERE, AND WHAT THIS FILE IS PROPOSING
 *
 * The two are separated deliberately, because a module that cites a ruling nobody made
 * is its own authority and that has bitten this repo before.
 *
 * **RULED, and the citation is prior to this change.** `D-ET8`
 * (`docs/superpowers/specs/2026-07-29-era-trial-contract.md` §19.1) gives the end-of-era
 * ceremony four beats in a ruled causal order, and **beat two is "the island expands"**.
 * A beat that fires at every era advance cannot be built over nine eras with no authored
 * ground: the ceremony either expands the island or it does not, and D-ET8 says it does.
 * That is what makes ten authored budgets a requirement rather than a preference, and it
 * is why `#376` shipped beat two as surveyors staking out ground instead of ground.
 * D-ERA25 supplies the rest: the radius is per-era data (so ten numbers is the right
 * shape) and each authored era must unlock strictly MORE buildable cells than the one
 * before it.
 *
 * **PROPOSED by this change, and owed a decision.** *How* a budget is derived. No
 * document rules a basis, so the derivation below is this file's proposal and is recorded
 * as such in §5.1 and as open item **O-16**. It is cumulative building demand seated at
 * era one's measured fill, which is the only calibration the tree contains; a lead who
 * wants denser or emptier islands moves {@link ERA_ONE_OCCUPIED_CELLS} and every radius
 * follows. Nothing downstream reads the basis, only the radii, so overturning it costs
 * one number.
 *
 * ### What a radius IS, because everything here depends on it
 *
 * **A radius is in WORLD UNITS, not cells**, and the disc is a filled disc. The apparent
 * contradiction (radius 22 giving 88 cells where a disc of radius 22 "should" be about
 * 1,520) is a missing division by `LAND_GRID_CELL ** 2`. A cell is 4x4 world units, so it
 * covers 16 of them, and `pi * 22^2 / 16 = 95.0`. The rest of the gap is the CENTRE rule:
 * `isCellBuildable` counts a cell when its centre lies inside the radius, which loses the
 * part-covered rim. Measured, actual cells over `pi r^2 / 16` runs 0.926 at radius 22,
 * 0.986 at 45 and 1.000 by 120. **1,520 is an area in square world units and was never a
 * cell count.**
 *
 * ### The ordering rule, and why every radius is at the TOP of a tread
 *
 * D-ERA25 fixes how an authored radius is validated, and it is **not on the radius**:
 * because the count is taken on cell centres it climbs in a staircase with flat treads
 * (21 and 22 both yield 88 cells, 23 and 24 both 112, 32 and 33 both 208, 41 and 42 both
 * 332). An era authored one unit larger than its predecessor can unlock ZERO new land, so
 * `findLandBudgetViolations` compares CELL COUNTS.
 *
 * That staircase also makes a radius a non-unique name for a budget, since every radius
 * on a tread yields the identical cell SET. The convention is **the largest radius
 * yielding the chosen cell count**, which is era one's own: the shipped 22 is the top of
 * the 21..22 tread, and taking the bottom would have re-authored a shipped number as 21
 * for nothing. {@link landBudgetRadiusFor} is that rule as code and reproduces all ten
 * radii, era one's included, from the demand column alone.
 *
 * ### Demand is CUMULATIVE, which is the easy thing to get wrong
 *
 * A skill building is raised once and stands forever (§6.4a) and a civic building is
 * bought once and stands forever (D-ERA11, no renovation). So era five's island must hold
 * everything from eras one to five, not era five's own content. Every column of
 * {@link ERA_LAND_DEMAND} is a RUNNING TOTAL. Three sources, each measured rather than
 * assumed:
 *
 *  1. **Skill buildings**, one per node (D-ERA7), at `footprintFor(nodeId)`. 38 of the 62
 *     are authored in `NODE_FOOTPRINTS`; the 24 in eras eight to ten resolve to
 *     `DEFAULT_FOOTPRINT` (2x2) because those guides closed no footprint item. **That is
 *     an UPPER BOUND rather than a guess**: no authored plot in the run exceeds 2x2, so
 *     authoring those 24 can only free cells, and a budget derived from it cannot come out
 *     too small.
 *  2. **Civic buildings**, whatever the era's cheapest closing city buys. Duplicates are
 *     permitted and there is no one-of-each rule, so the count is a property of the
 *     catalogue's prices rather than of its length.
 *  3. **The Town Hall**, 3x2 = 6 cells, pre-seeded and standing from the start (D-TH6).
 *
 * **Where two cheapest cities tie, the demand takes the LARGER footprint.** Era two is
 * the case and it is not hypothetical: since #293 re-priced the catalogue, three Granaries
 * plus three Bread Ovens (18 cells) and four Village Houses plus two Bread Ovens (24
 * cells) both cost exactly 1,080, so "the cells the optimal city takes" has two answers.
 * A learner may buy either, so the budget owes the worse one. This is the same
 * upper-bound direction as the footprint default above, for the same reason: a budget too
 * small is a dead end, and a budget slightly large is a slightly emptier island.
 *
 * ### The fill ratio is MEASURED off era one, not chosen
 *
 * A disc cannot be packed to 100%: roads, spacing and placement freedom all cost cells,
 * and a budget that fits the buildings exactly is unplayable. Era one is the only era with
 * a shipped radius, so it is the only honest calibration available, and its content
 * occupies **47 of 88 cells, 53.4%** (17 skill + 6 hall + 24 civic).
 * {@link ERA_ONE_FILL_RATIO} carries it, and two independent readings say that is a real
 * ceiling rather than a comfortable one:
 *
 *  - **Contiguity binds long before tiles do.** With the hall and era one's six standing
 *    on 23 tiles, 65 are free and exactly **13** further 2x2 buildings fit in them, which
 *    is 52 cells: the free tiles are 80% usable. §5.1 records the same 13 across three
 *    different footprint tables.
 *  - **Placement freedom survives at the ratio.** Packed nearest-centre-first, era one's
 *    whole content (13 buildings, 47 cells) seats on the 88-cell island with **7** legal
 *    2x2 anchors still open, so the calibration is not where the island jams.
 *
 * Each era's budget is then the smallest cell count with
 * `cells * 47 >= occupied * 88`, integer arithmetic so no rounding decides a radius,
 * named by the top of its tread. Because a tread is a jump rather than a step an era
 * lands at or below the calibrated 53.4% and never above it; measured, the ten run 51.3%
 * (era six) to 53.4% (era one, exact by construction).
 *
 * ### Who proves what, since no one package can see all three columns
 *
 * `packages/skill-graph` may not import `apps/` (TS6059) and may not import
 * `packages/economy`, which imports it. So the demand table is authored data here and each
 * column is DERIVED, never pinned, where its source lives:
 *
 *  - `eras.test.ts`: that every radius follows from its own demand row through
 *    {@link landBudgetRadiusFor}, the strict ordering over all ten, and the top-of-tread
 *    convention.
 *  - `apps/web/src/city/eraLandBudget.test.ts`: the skill and hall columns against
 *    `footprintFor` and `TOWN_HALL_FOOTPRINT`, and the packings the 53.4% rests on.
 *  - `packages/economy/src/civicSolvency.test.ts`: the civic column, by exhaustive search
 *    over `CIVIC_CATALOGUE`. #293 re-priced seven catalogues and silently invalidated an
 *    earlier version of this table, which is why that column is re-derived from the
 *    catalogue on every run instead of transcribed and trusted.
 *
 * ### Two things these numbers do NOT do, stated so nobody infers them
 *
 * **They do not move the island a player sees.** `isCellBuildable` and `computeCityLayout`
 * read the module constant `BUILDABLE_RADIUS = 22`, not this data. Wiring the scene is
 * separately gated: §5.1 measures the road layer's depth budget at 4.42 against a bar of
 * 4, so the island can grow about 5% before `depthPrecision.test.ts` goes red, and
 * `ISLAND_GRASS_RADIUS` (30) and `SEA_RADIUS` (58) do not follow the buildable disc. Era
 * two lands exactly on the drawn grass edge, era three would reach past it, and era eight
 * past the lagoon. That is the road-art lane.
 *
 * **They do not make land bite on the lesson channel, and that is inherited from era
 * one.** Era one's entire 600-stone grant buys at most 28 cells of civic building (seven
 * Family Lodges at 20 stone a cell), so a learner who spends every stone on the most
 * land-hungry rows still leaves 37 of 88 cells empty on the SHIPPED island. A ratio
 * calibrated on era one therefore cannot make land binding later. What DOES bite is the
 * practice channel, bounded by effort alone: filling era one's 41 free cells costs 820
 * stone against 80 of headroom, which is 37 practice sets at the current payout of 20
 * against a per-era bound of ten. Tightening the ratio to make land bite on lesson income
 * would mean inventing a number instead of measuring one.
 */

/**
 * Era ids are deliberately non-numeric slugs. See INV-ERA-5 fact 2 above: an
 * ordinal in the id is an invitation to recover the sequence by parsing or sorting
 * it, which is the latent bug D-ERA2 exists to prevent.
 */
export type EraId =
  | "prehistoric"
  | "neolithic"
  | "bronze_age"
  | "classical"
  | "medieval"
  | "renaissance"
  | "industrial"
  | "atomic_age"
  | "information_age"
  | "cyberpunk";

/**
 * How much buildable land an era unlocks (**D-ERA25**): per-era authored data, set as
 * that era's buildings are designed. The `unauthored` variant has no `buildable_radius`,
 * so the compiler prevents a caller reading a radius that nobody has authored.
 *
 * **THE `unauthored` VARIANT STAYS, WITH NO MEMBER.** All ten eras of `ERA_SEQUENCE` are
 * authored, and collapsing a one-member union would delete the compile-time half of the
 * guarantee for the next era anybody adds or re-opens. Its runtime branch stays drivable
 * because {@link landBudgetRadius} takes a budget rather than reading one off the
 * sequence, so the throw is an enforced guard instead of dead code with a passing test
 * beside it.
 */
export type EraLandBudget =
  | { readonly status: "unauthored" }
  | { readonly status: "authored"; readonly buildable_radius: number };

/**
 * Whether an era may be exposed to learners. This is deliberately explicit: content presence,
 * authored land, and art coverage are inputs to release, not alternate release predicates.
 * Release gates in the web composition layer read this exact field.
 */
export type EraReleaseState =
  | { readonly status: "development"; readonly reason: string }
  | { readonly status: "released" };

export interface EraDefinition {
  readonly id: EraId;
  /** The learner-facing chapter name, fixed by the spec's §3 table. */
  readonly name: string;
  readonly release: EraReleaseState;
  /**
   * The era's curated node set (D-ERA3). Node ids only — never a domain, never a
   * count, so the domain renumber cannot reach it.
   */
  readonly nodes: readonly string[];
  readonly land: EraLandBudget;
  /** Why these nodes sit in this era, for the reader INV-ERA-5 exists to serve. */
  readonly rationale: string;
}

/**
 * THE ERA SEQUENCE. **Array position is the play order** — era one first, era ten
 * last. This array is the single source of truth for the sequence; `eraNumber`
 * derives the human-facing "Era N of 10" from the position, and nothing derives
 * the position from anything else.
 *
 * To reorder the game, move an entry. To move a skill between eras, move its id.
 */
export const ERA_SEQUENCE: readonly EraDefinition[] = [
  {
    id: "prehistoric",
    name: "Prehistoric Era",
    release: { status: "released" },
    nodes: ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"],
    // 22 is the shipped `BUILDABLE_RADIUS`, so this describes the island D1's buildings
    // already stand on rather than a number chosen here (#202). 47 occupied cells want
    // 88.00 and the tread holds exactly 88, so the calibration era is exact by
    // construction and the tread below (80 at radius 20) is 8 cells short.
    land: { status: "authored", buildable_radius: 22 },
    rationale:
      "Counting, tallying, sharing a kill. The six MVP nodes, prereq-closed and " +
      "the only era with authored lessons, items and models today.",
  },
  {
    id: "neolithic",
    name: "Neolithic Era",
    release: { status: "released" },
    nodes: ["EXP.1", "RAD.1", "RAD.2", "RAD.3", "RAD.4"],
    // 89 cumulative cells want 166.64; 164 at radius 29 is 2.64 short, and 172's tread is
    // 30 alone. THE NARROWEST MARGIN IN THE RUN, and the era whose cheapest city ties at
    // two footprints (18 and 24 cells, both 1,080 grain) since #293. The tie is taken at
    // 24, so this radius is the one the tie-break decides.
    land: { status: "authored", buildable_radius: 30 },
    rationale:
      "First settlements and agriculture: seed that multiplies, grain stores " +
      "doubling, harvests scaling. Exponents and radicals entire.",
  },
  {
    id: "bronze_age",
    name: "Bronze Age",
    release: { status: "released" },
    nodes: ["LIN.1", "LIN.3", "LIN.4", "LIN.5", "LIN.6"],
    // 131 cumulative cells want 245.28; 216 at radius 34 is 29.28 short, and 248's tread
    // is 35 alone.
    land: { status: "authored", buildable_radius: 35 },
    rationale:
      "Trade on a balance scale — what weight of tin balances this copper. " +
      "Linear equations and inequalities entire.",
  },
  {
    id: "classical",
    name: "Classical Era",
    release: { status: "released" },
    nodes: ["POL.1", "POL.2", "POL.3", "POL.4", "POL.8"],
    // 177 cumulative cells want 331.40; 316 at radius 40 is 15.40 short, and 332's tread
    // is 41..42, so the top of it is 42.
    land: { status: "authored", buildable_radius: 42 },
    rationale:
      "Geometric algebra, areas as products, many terms in one expression. The " +
      "polynomial domain minus the three lessons the coordinate plane gates: POL.5 " +
      "requires CG.1 and FUN.1 outright, and POL.6 and POL.7 are graph-reading " +
      "lessons that no hard edge stops but that nothing can teach before there are " +
      "axes. What stays is the algebra a Greek could do on a wax tablet — expand, " +
      "factor, solve a quadratic, divide one polynomial by another.",
  },
  {
    id: "medieval",
    name: "Medieval Era",
    release: { status: "released" },
    nodes: ["RAT.1", "RAT.2", "RAT.3", "RAT.4", "RAT.6"],
    // 217 cumulative cells want 406.30; 392 at radius 45 is 14.30 short, and 408's tread
    // is 46 alone.
    land: { status: "authored", buildable_radius: 46 },
    rationale:
      "Guild ledgers, tithes, land divided into shares. Rational expressions as " +
      "arithmetic and as equations — simplify, multiply, add, nest, and solve while " +
      "rejecting the extraneous root — following polynomials as the prereq graph " +
      "requires. RAT.5 leaves with the other graph-reading lessons, because a hole " +
      "and a vertical asymptote are facts about a picture.",
  },
  {
    id: "renaissance",
    name: "Early Modern",
    release: { status: "released" },
    nodes: ["GEO.1", "GEO.2", "CG.1", "POL.6", "POL.7", "RAT.5"],
    // 269 cumulative cells want 503.66; 484 at radius 50 is 19.66 short, and 524's tread
    // is 51 alone. The emptiest island of the ten at 51.3%, because the jump from 484 to
    // 524 overshoots by more than most.
    land: { status: "authored", buildable_radius: 51 },
    rationale:
      "Perspective, surveying, domes, and the century that put curves on axes. " +
      "Geometry combined with the coordinate plane per §3.1 gives the bridge the " +
      "spec wants — learn shapes, then learn to put them on axes — and the three " +
      "graph-reading lessons follow the plane rather than precede it: end behaviour " +
      "and polynomial graphs (POL.6, POL.7) and rational graphs with their holes " +
      "and asymptotes (RAT.5). Descartes' La Géométrie is where the theory of " +
      "equations meets the curve, so the era that introduces the plane is where " +
      "'how many times does this cross, and where' belongs.",
  },
  {
    id: "industrial",
    name: "Industrial Era",
    release: { status: "released" },
    nodes: ["FUN.1", "FUN.2", "FUN.3", "FUN.7", "FUN.8", "POL.5"],
    // 313 cumulative cells want 586.04; 560 at radius 54 is 26.04 short, and 608's tread
    // is 55 alone.
    land: { status: "authored", buildable_radius: 55 },
    rationale:
      "A machine is input to output; railways on plotted grids. The " +
      "function-as-machine half of the Functions split (§3.1): notation and " +
      "evaluation, domain and range, piecewise, composition (machines in series) " +
      "and inverses (a machine run backwards). POL.5, graphing quadratics, joins " +
      "them because it needs CG.1 and FUN.1 and because it is a graphing lesson.",
  },
  {
    id: "atomic_age",
    name: "Atomic Age",
    release: { status: "released" },
    nodes: ["FUN.4", "FUN.5", "FUN.6", "FUN.9", "FUN.10", "LF.1", "LF.2", "LF.3", "LF.4"],
    // 379 cumulative cells want 709.62; 688 at radius 59 is 21.62 short, and 716's tread
    // is 60 alone. The largest single jump in demand, because nine nodes all resolve to
    // the 2x2 default.
    land: { status: "authored", buildable_radius: 60 },
    rationale:
      "The century that measured everything per hour. The rate-and-measurement " +
      "half of the Functions split lands on the same theme as Linear Functions & " +
      "Rates: average rate of change and the difference quotient sit beside slope " +
      "as rate of change, with reading graph features, transformations and " +
      "absolute-value graphs alongside.",
  },
  {
    id: "information_age",
    name: "Information Age",
    release: { status: "released" },
    nodes: ["EL.1", "EL.2", "EL.3", "EL.4", "EL.5", "EL.6"],
    // 433 cumulative cells want 810.72; 788 at radius 63 is 22.72 short, and 812's tread
    // is 64 alone.
    land: { status: "authored", buildable_radius: 64 },
    rationale:
      "Doubling transistors, orders of magnitude. Exponential and logarithmic " +
      "entire, after both exponents (era two) and functions (eras seven, eight).",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Era",
    release: { status: "released" },
    nodes: [
      "TRG.1",
      "TRG.2",
      "TRG.3",
      "TRG.4",
      "TRG.5",
      "TRG.6",
      "TRG.7",
      "TRG.8",
      "TRG.9",
    ],
    // 490 cumulative cells want 917.45; 912 at radius 68 is 5.45 short, and 936's tread is
    // 69 alone. The whole ten-era city, 123 buildings and 490 cells, packs onto it with
    // 446 cells spare, measured rather than summed
    // (`apps/web/src/city/eraLandBudget.test.ts`).
    land: { status: "authored", buildable_radius: 69 },
    rationale:
      "Waves, signals, rotation, rendering. Trigonometry entire, last because it " +
      "depends on geometry, radicals and transformations.",
  },
];

/** The inclusive pacing band every era must sit within (spec §3.1, O-1). */
export const ERA_MIN_NODES = 3;
export const ERA_MAX_NODES = 9;

/**
 * Cells the Town Hall stands on. `TOWN_HALL_FOOTPRINT` is 3x2 (D-TH6), it is pre-seeded
 * and always built, and it is the one occupant belonging to no era. Mirrored here for the
 * same reason {@link LAND_GRID_CELL} is, since nothing in `packages/` may import `apps/`,
 * and pinned against the real footprint by `apps/web/src/city/eraLandBudget.test.ts`.
 */
export const HALL_LAND_CELLS = 6;

/**
 * **THE ARITHMETIC BEHIND EACH ERA'S RADIUS**, as the running totals a budget is derived
 * from. Authored here rather than computed because two of the three columns come from
 * modules this package may not import; each is re-derived from its own source by the test
 * named in the header's "who proves what", so a moved footprint or a re-priced catalogue
 * fails loudly instead of leaving ten stale radii behind.
 *
 * Read a row as: by the end of this era the island must hold `cumulative_skill_cells` of
 * earned buildings, `cumulative_civic_cells` of the cheapest closing city, and the hall.
 * {@link occupiedLandCells} sums them and {@link landBudgetRadiusFor} turns the sum into
 * the era's radius.
 */
export interface EraLandDemand {
  readonly era: EraId;
  /**
   * Every skill building from era one to this era, at `footprintFor(nodeId)`. The 24 nodes
   * of eras eight to ten resolve to the 2x2 `DEFAULT_FOOTPRINT`, which is an UPPER bound:
   * no authored plot in the run exceeds 2x2, so those guides can only ever free cells.
   */
  readonly cumulative_skill_cells: number;
  /**
   * Every civic building the cheapest closing city buys from era one to this era. Cheapest
   * means the exhaustive optimum over whole buildings, not the greedy per-axis pick, and
   * where two optima tie at different footprints the LARGER is taken (era two, since #293).
   */
  readonly cumulative_civic_cells: number;
  /** {@link HALL_LAND_CELLS}, carried per row so a row is a complete statement. */
  readonly hall_cells: number;
}

/** Terse constructor, so a ten-row table reads as a table. */
function demand(
  era: EraId,
  cumulative_skill_cells: number,
  cumulative_civic_cells: number,
): EraLandDemand {
  return {
    era,
    cumulative_skill_cells,
    cumulative_civic_cells,
    hall_cells: HALL_LAND_CELLS,
  };
}

// Arguments are the two CUMULATIVE totals. The trailing comment is what the era itself
// adds: new skill cells, then the cheapest closing city it buys and the cells that takes.
export const ERA_LAND_DEMAND: readonly EraLandDemand[] = [
  demand("prehistoric", 17, 24), // +17 skill, +24 civic: 4x Family Lodge, 2x Campfire
  demand("neolithic", 35, 48), // +18, +24: 4x Village Houses, 2x Bread Oven (the tie)
  demand("bronze_age", 53, 72), // +18, +24: 3x Terraced Fields, 3x Steam House
  demand("classical", 69, 102), // +16, +30: 3x Grain Dock, 3x Baths
  demand("medieval", 85, 126), // +16, +24: 3x Great Barn, 3x Fairground
  demand("renaissance", 107, 156), // +22, +30: 3x Covered Market, 3x Town Square
  demand("industrial", 127, 180), // +20, +24: 3x Food Works, 3x Railroad Station
  demand("atomic_age", 163, 210), // +36, +30: 3x Supermarket, 3x Swimming Pool
  demand("information_age", 187, 240), // +24, +30: 3x Distribution Center, 3x Roof Garden
  demand("cyberpunk", 223, 261), // +36, +21: 3x Pod Apartments, 3x Night Market
];

/** Everything standing on the island by the end of an era. */
export function occupiedLandCells(demand: EraLandDemand): number {
  return demand.cumulative_skill_cells + demand.cumulative_civic_cells + demand.hall_cells;
}

const landDemandByEra = new Map<EraId, EraLandDemand>(
  ERA_LAND_DEMAND.map((entry) => [entry.era, entry]),
);

/** An era's demand row, or a loud failure. Never a zero standing in for a missing row. */
export function eraLandDemand(eraId: EraId): EraLandDemand {
  const row = landDemandByEra.get(eraId);

  if (!row) {
    throw new Error(
      `Era "${eraId}" has no land-demand row. ERA_LAND_DEMAND covers all ten eras of ` +
        `ERA_SEQUENCE; a missing row is a table defect rather than a caller error.`,
    );
  }

  return row;
}

/**
 * **THE CALIBRATION**, measured off the only era with a shipped radius: era one's 47
 * occupied cells against its 88 buildable ones, 53.4%. Every later budget is sized so its
 * island is as full as the island the game actually ships, rather than as full as a
 * comfort factor says.
 *
 * Kept as two integers rather than a decimal so the requirement stays exact arithmetic,
 * `cells * 47 >= occupied * 88`, with no rounding standing between a demand row and a
 * radius. **This is the one number a lead overturning O-16 would move**, and every radius
 * follows from it.
 */
export const ERA_ONE_BUILDABLE_CELLS = 88;
export const ERA_ONE_OCCUPIED_CELLS = 47;
export const ERA_ONE_FILL_RATIO = ERA_ONE_OCCUPIED_CELLS / ERA_ONE_BUILDABLE_CELLS;

const eraById = new Map<EraId, EraDefinition>(ERA_SEQUENCE.map((era) => [era.id, era]));

const eraIndexById = new Map<EraId, number>(
  ERA_SEQUENCE.map((era, index) => [era.id, index]),
);

const eraByNodeId = new Map<string, EraDefinition>(
  ERA_SEQUENCE.flatMap((era) => era.nodes.map((nodeId) => [nodeId, era] as const)),
);

export function getEra(eraId: EraId): EraDefinition | undefined {
  return eraById.get(eraId);
}

export function getEraOrThrow(eraId: EraId): EraDefinition {
  const era = getEra(eraId);

  if (!era) {
    throw new Error(`Unknown era: ${eraId}`);
  }

  return era;
}

/** The one release predicate used by every era-level release gate. */
export function isEraReleased(era: EraDefinition | EraId): boolean {
  const definition = typeof era === "string" ? getEraOrThrow(era) : era;
  return definition.release.status === "released";
}

/** Released eras in play order. */
export function releasedEras(): readonly EraDefinition[] {
  return ERA_SEQUENCE.filter(isEraReleased);
}

/**
 * The 1-based play position of an era, derived from `ERA_SEQUENCE` order. This is
 * the ONLY sanctioned way to get an era's number: it reads the authored sequence,
 * so it cannot disagree with it (INV-ERA-5).
 */
export function eraNumber(eraId: EraId): number {
  const index = eraIndexById.get(eraId);

  if (index === undefined) {
    throw new Error(`Unknown era: ${eraId}`);
  }

  return index + 1;
}

/** The era at a 1-based play position, or `undefined` outside 1..10. */
export function eraAtNumber(position: number): EraDefinition | undefined {
  return ERA_SEQUENCE[position - 1];
}

/** The era a node belongs to. Every in-product node has exactly one (INV-ERA-2). */
export function getEraOfNode(nodeId: string): EraDefinition | undefined {
  return eraByNodeId.get(nodeId);
}

export function getEraNodes(eraId: EraId): readonly string[] {
  return getEraOrThrow(eraId).nodes;
}

/** Every node in play order: era one's nodes first, era ten's last. */
export function getEraOrderedNodes(): readonly string[] {
  return ERA_SEQUENCE.flatMap((era) => era.nodes);
}

/**
 * Fail-loud on an unauthored land budget. A missing radius must never resolve to a
 * plausible default: silently returning era one's 22 for an era whose buildings have not
 * been designed would make unauthored land look authored, which is the failure mode the
 * spec's fail-loud descriptor fences exist to prevent.
 *
 * **IT TAKES THE BUDGET RATHER THAN READING IT, and that is the whole reason it exists as
 * its own function.** No era in `ERA_SEQUENCE` is unauthored, so a throw reachable only
 * through the sequence would be unreachable code: present, untested and quietly rotting.
 * Handed a budget, the branch stays drivable from a test, which is what keeps the
 * `unauthored` variant an enforced guard rather than a decorative one.
 */
export function landBudgetRadius(eraId: EraId, land: EraLandBudget): number {
  if (land.status !== "authored") {
    throw new Error(
      `Era "${eraId}" has no authored buildable radius yet: per D-ERA25 the radius is ` +
        `per-era data, authored when that era's buildings are designed. Later eras may ` +
        `stay unauthored indefinitely, so this is not an open decision to wait on.`,
    );
  }

  return land.buildable_radius;
}

/** An era's authored buildable radius. All ten are authored; see D-ERA25 in the header. */
export function eraBuildableRadius(eraId: EraId): number {
  return landBudgetRadius(eraId, getEraOrThrow(eraId).land);
}

/**
 * Side of one placement cell in world units — `GRID_CELL` in
 * `apps/web/src/city/worldLayout.ts`. Mirrored rather than imported because nothing in
 * `packages/` may import `apps/`: this package is a project reference the app depends
 * on, and importing that file here fails `tsc --build` with TS6059 (outside `rootDir`)
 * and TS6307, so the mirror is forced rather than preferred. It is pinned in
 * `eras.test.ts` by the shipped island's own figure — radius 22 must yield the 88 cells
 * `isCellBuildable` produces and the spec's §5 table enumerates. At any other cell size
 * that assertion fails (at 5 the same radius gives 60), which is the drift guard.
 */
export const LAND_GRID_CELL = 4;

/**
 * How many placement cells sit on buildable ground at `radius`, by the rule
 * `isCellBuildable` uses: a cell counts when its CENTRE, at
 * `(index + 0.5) * LAND_GRID_CELL`, lies within the radius.
 *
 * This is the quantity an era's land budget is validated on, because the radius is a
 * poor proxy for it. The count climbs in a staircase with flat treads (21 and 22 both
 * give 88 cells, 23 and 24 both 112, 41 and 42 both 332), so a radius bumped by one can
 * be worth no new land at all.
 */
export function buildableCellCount(radius: number): number {
  // One cell beyond the widest a centre could sit, so the sweep cannot clip the disc.
  const reach = Math.ceil(radius / LAND_GRID_CELL) + 1;
  let count = 0;

  for (let col = -reach; col <= reach; col += 1) {
    for (let row = -reach; row <= reach; row += 1) {
      const x = (col + 0.5) * LAND_GRID_CELL;
      const z = (row + 0.5) * LAND_GRID_CELL;

      if (Math.hypot(x, z) <= radius) {
        count += 1;
      }
    }
  }

  return count;
}

/**
 * **THE DERIVATION, AS CODE.** The buildable radius that seats `occupied` cells at era
 * one's measured fill: the smallest cell count with
 * `cells * ERA_ONE_OCCUPIED_CELLS >= occupied * ERA_ONE_BUILDABLE_CELLS`, named by the
 * LARGEST radius that yields it.
 *
 * Both halves are load-bearing. The comparison is integer arithmetic so no float decides a
 * boundary, and era two is the reason rather than an illustration: the tread below it holds
 * 164 cells against a requirement of 166.64, so it is ruled out by under three cells. The
 * top-of-tread convention is what makes the answer a function at all, since every radius
 * on a tread yields the identical cell set and without a rule there are two to five
 * equally correct names for one budget. It is era one's own convention rather than a new
 * one (22 is the top of the 21..22 tread), so this reproduces the shipped radius from era
 * one's demand row and not merely the later nine.
 */
export function landBudgetRadiusFor(occupied: number): number {
  if (!Number.isInteger(occupied) || occupied <= 0) {
    throw new Error(
      `Land demand must be a positive whole number of cells, not ${occupied}. A budget ` +
        `derived from a fractional or empty demand is a bug in the demand table.`,
    );
  }

  let radius = 1;

  while (
    buildableCellCount(radius) * ERA_ONE_OCCUPIED_CELLS <
    occupied * ERA_ONE_BUILDABLE_CELLS
  ) {
    radius += 1;
  }

  // Walk to the top of the tread: the same cells, under the name era one already uses.
  const cells = buildableCellCount(radius);

  while (buildableCellCount(radius + 1) === cells) {
    radius += 1;
  }

  return radius;
}

/** The part of an era the D-ERA25 ordering rule reads. `EraDefinition` satisfies it. */
export interface EraLandEntry {
  readonly id: EraId;
  readonly land: EraLandBudget;
}

/** An authored era that unlocks no more land than the authored era before it. */
export interface LandBudgetViolation {
  readonly era: EraId;
  readonly previousEra: EraId;
  readonly radius: number;
  readonly previousRadius: number;
  readonly cells: number;
  readonly previousCells: number;
  readonly message: string;
}

/**
 * D-ERA25's ordering rule: **each authored era unlocks strictly MORE buildable cells
 * than the previously authored era**, validated on the cell count and never on the
 * radius, since a radius one unit larger can unlock nothing. Unauthored eras are
 * skipped rather than read as zero, so era five may be authored while eras two to four
 * are still pending and is then compared against era one.
 *
 * Returns every violation so a caller can report all of them; an empty array is the
 * pass. It is only ever as strong as the sequence it is handed: over a sequence with
 * fewer than two authored eras there are no consecutive pairs and it cannot fail. That
 * used to describe `ERA_SEQUENCE` itself, where era one alone was authored and the sweep
 * over real data was vacuous. **All ten are authored now, so it compares nine consecutive
 * pairs**, and `eras.test.ts` states that count as a floor and forces a real failure into
 * the real sequence rather than only into a synthetic one.
 */
export function findLandBudgetViolations(
  sequence: readonly EraLandEntry[],
): LandBudgetViolation[] {
  const violations: LandBudgetViolation[] = [];
  let previous: { era: EraId; radius: number; cells: number } | undefined;

  for (const { id, land } of sequence) {
    if (land.status !== "authored") {
      continue;
    }

    const cells = buildableCellCount(land.buildable_radius);

    if (previous && cells <= previous.cells) {
      violations.push({
        era: id,
        previousEra: previous.era,
        radius: land.buildable_radius,
        previousRadius: previous.radius,
        cells,
        previousCells: previous.cells,
        message:
          `Era "${id}" (radius ${land.buildable_radius}) unlocks ${cells} buildable ` +
          `cells, no more than "${previous.era}" (radius ${previous.radius}) at ` +
          `${previous.cells} cells. D-ERA25: each authored era must unlock strictly ` +
          `MORE cells than the previously authored one. Cell count climbs in a ` +
          `staircase with flat treads, so comparing the radii would have passed this.`,
      });
    }

    previous = { era: id, radius: land.buildable_radius, cells };
  }

  return violations;
}
