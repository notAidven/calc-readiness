import type { EraId } from "@cr/skill-graph";

import type { CapacityContribution } from "./capacity";
import type { MaterialId } from "./types";

/**
 * **THE FORTY CIVIC BUILDINGS — four per era, as typed data.**
 *
 * These are the buildings the whole resource economy exists to buy (D-ERA7: skill
 * buildings are EARNED one per lesson, civic buildings are BOUGHT). Until now they
 * existed only as markdown tables in ten era folders, which meant no code could
 * price a purchase, cost a teardown or decay a contribution.
 *
 * ## Which artefact is the source of truth, now that there are two
 *
 * **The authored source is the markdown. This module is the copy that code reads,
 * and `test/eraCivicCatalogueParity.test.ts` makes the two provably identical.**
 * Stated as a decision because the alternatives are real and were considered:
 *
 *  - **Parse the markdown at runtime.** A non-starter: this package's contract is
 *    ZERO I/O, and it is imported by the browser app and (later) a Lambda, neither
 *    of which ships `docs/`.
 *  - **Generate this file from the markdown at build time.** Rejected. It makes a
 *    prose document a build input, and these documents are prose first — they carry
 *    struck-through rows, dated amendment blocks and editorial columns (`Wins on`,
 *    `Loses on`) no code will ever read. A build that breaks when another owner
 *    reformats a table is a bad trade for a number that changes rarely.
 *  - **Declare THIS the source and let the markdown drift.** Rejected for the
 *    opposite reason: the numbers are a design artefact, argued for in the prose
 *    around them, and the design owns them. A catalogue whose authoritative copy
 *    lives in a `.ts` file is one nobody will review as a design.
 *
 * The parity test is what makes the split safe, and it is a **partition in both
 * directions** rather than a checklist: every markdown row has exactly one row
 * here, every row here has exactly one markdown row, and matched pairs agree on
 * every field. A row added to either side alone fails loudly.
 *
 * **`test/eraCivicCatalogueDominance.test.ts` keeps reading the markdown, unchanged.**
 * That is deliberate. It is the guard that no row is weakly dominated (D-ERA24), it
 * has no skip path left, and pointing it at this module instead would have made it
 * a guard over a copy. Two independent readers of the same forty rows is a feature.
 *
 * ## Frozen in the era they were bought, structurally
 *
 * A civic building is era-exclusive: buildable only while the player is in its era
 * (era one §1, consequence 2), and frozen there forever after with no renovation
 * (D-ERA11). Those two together mean **the era a building was bought in is always
 * its catalogue era**, so no placement needs to store a `built_era` — and the whole
 * class of defect where a stored era disagrees with the building id cannot arise.
 * `civicBuilding.test.ts` asserts the property rather than leaving it as a remark.
 *
 * ## Duplicates are allowed
 *
 * Every catalogue says "buildable as many times as you can afford". There is no
 * one-of-each rule and no per-era instance cap; land and material are the only
 * constraints. Nothing in this module or its siblings counts placements per type.
 */

/**
 * A building's role in its era's catalogue.
 *
 * **Four roles, one of each per era** — era one §3: *"four is the smallest number
 * that can carry D-ERA24's three axes without a dominated member — one food, one
 * pure livability, one pure happiness, one blend."* That is a partition of every
 * era's four rows, asserted as one in `civicCatalogue.test.ts`.
 *
 * It earns its place by making **O-4 total**. Teardown is priced at 25% of *the
 * current era's cost for that building type*, and building types are era-exclusive,
 * so "that type" cannot mean the same building — era one's Smokehouse has no era-five
 * equivalent by name. It means the same ROLE, which every era has exactly one of.
 *
 * Under the pooled livability ruling `food` and `dwelling` are the same CONTRIBUTION
 * (both feed one livability pool). They are distinguished here because they are
 * distinct catalogue slots with distinct art and distinct prices, not because the
 * capacity model can tell them apart — it cannot, which is precisely why the
 * catalogues had to be differentiated on footprint, cost and a secondary happiness.
 */
export type CivicRole = "food" | "dwelling" | "amenity" | "blend";

export const CIVIC_ROLES: readonly CivicRole[] = ["food", "dwelling", "amenity", "blend"];

/** A footprint in whole grid cells, before rotation. `LAND_GRID_CELL` is 4 world units. */
export interface CivicFootprint {
  readonly width: number;
  readonly depth: number;
}

/**
 * One catalogue row.
 *
 * `id` is a STABLE SLUG and `name` is the display string. They are separate on
 * purpose: a placement records the id, and three agents renamed buildings while the
 * dominance guard was being written, so a display rename must not orphan every
 * stored placement. The parity test joins on `name`, so a rename in the markdown
 * alone fails — which is the loud outcome, since only a human can say whether a
 * renamed row is the same building.
 *
 * ## THAT SEPARATION HAS NOW BEEN TESTED, and it held: FIFTEEN ROWS RENAMED, ZERO IDS
 *
 * #244's naming pass moved fifteen of the forty display names and **not one `id`
 * moved with them**, which is the field doing its job rather than a shortcut. The
 * consequence is that thirteen ids now read oddly beside their own names —
 * `prehistoric_longhouse` holds *The Family Lodge*, `medieval_cottages` holds *The
 * Castle*, `information_age_park` holds *The Roof Garden* — and **two read as actively
 * wrong**, because the lead moved the hospital from Early Modern to the Information
 * Age: `renaissance_hospital` holds *The Painters' School* and `information_age_clinic`
 * holds *The Hospital*.
 *
 * **THE IDS STAY, and the argument is not that the churn is small.** It is small — five
 * occurrences across two files in this package, measured, with no stored placement, no
 * document and no other lane referencing either id — and that is beside the point:
 *
 *  - An id encoding a display name was always going to drift. This is that drift
 *    arriving, not a new problem, and the field exists precisely so that arriving
 *    costs nothing.
 *  - Renaming these two would be the SECOND time an id moved with a display name, which
 *    establishes the wrong precedent for the next of the fifteen. Thirteen of them are
 *    mismatched in exactly the same way and nobody proposes renaming those, so renaming
 *    two would leave thirteen mismatches under an inconsistent rule — worse than fifteen
 *    mismatches under a clear one.
 *  - A placement records the id. Era six has no placements today; the mechanism is the
 *    point, and it stops being a mechanism the first time it is waived for tidiness.
 *
 * The two moved rows are PINNED in `civicCatalogue.test.ts` rather than only commented,
 * so a later silent id rename has to be a deliberate one.
 */
export interface CivicBuildingDefinition {
  readonly id: CivicBuildingId;
  readonly era: EraId;
  /** Exactly the markdown table's `Building` cell, bold markers stripped. */
  readonly name: string;
  readonly role: CivicRole;
  readonly footprint: CivicFootprint;
  /** Cost in {@link material}, already at this era's `2^(N-1)` scale. */
  readonly cost: number;
  /** The era's material. Denormalised from `ERA_MATERIALS`; the parity test pins it. */
  readonly material: MaterialId;
  /** What one placement contributes, before any legacy decay. */
  readonly provides: CapacityContribution;
}

/**
 * Stable ids: `<era>_<slug>`. Era-prefixed because names repeat across eras in
 * spirit (three eras have a "Baths") and a placement id must be unambiguous.
 */
export type CivicBuildingId =
  | "prehistoric_smokehouse"
  | "prehistoric_longhouse"
  | "prehistoric_campfire"
  | "prehistoric_storage_pit"
  | "neolithic_granary"
  | "neolithic_village_houses"
  | "neolithic_bread_oven"
  | "neolithic_village_well"
  | "bronze_age_terraced_fields"
  | "bronze_age_walled_houses"
  | "bronze_age_bathhouse"
  | "bronze_age_weigh_house"
  | "classical_public_granary"
  | "classical_apartment_block"
  | "classical_baths"
  | "classical_fountain"
  | "medieval_great_barn"
  | "medieval_cottages"
  | "medieval_market_square"
  | "medieval_chapel"
  | "renaissance_covered_market"
  | "renaissance_grand_apartments"
  | "renaissance_town_square"
  | "renaissance_hospital"
  | "industrial_cold_store"
  | "industrial_workers_houses"
  | "industrial_public_baths"
  | "industrial_library"
  | "atomic_age_supermarket"
  | "atomic_age_apartment_tower"
  | "atomic_age_swimming_pool"
  | "atomic_age_community_centre"
  | "information_age_food_warehouse"
  | "information_age_residential_tower"
  | "information_age_park"
  | "information_age_clinic"
  | "cyberpunk_vertical_farm"
  | "cyberpunk_capsule_homes"
  | "cyberpunk_night_market"
  | "cyberpunk_station";

/** Terse constructor, so a forty-row table reads as a table. */
function row(
  id: CivicBuildingId,
  era: EraId,
  material: MaterialId,
  name: string,
  role: CivicRole,
  width: number,
  depth: number,
  cost: number,
  livability: number,
  happiness: number,
): CivicBuildingDefinition {
  return {
    id,
    era,
    name,
    role,
    footprint: { width, depth },
    cost,
    material,
    provides: { livability, happiness },
  };
}

/**
 * THE CATALOGUE, in era order and in each era's authored row order.
 *
 * Every number is transcribed from that era's `civic-buildings.md` §2/§3 table and
 * held to it by the parity test. Two things worth reading off the table rather than
 * assuming:
 *
 *  - **Contributions follow the era ladder exactly** — the magnitude is
 *    `20 × 2 ^ (N-1)` in every era. **Costs do NOT**, and since 2026-07-30 they do not
 *    even share a shape: each era authors its own four prices, and all ten ratio vectors
 *    are distinct. Era seven prices its food building at 3,840 where the ladder would say
 *    5,120, deliberately, because it is *"the cheapest livability in the run so far"*. So
 *    costs are authored data and cannot be derived from a multiplier.
 *  - **The LADDER is between eras and the SHAPE is within one.** The team lead ruled on
 *    2026-07-30 that *"the buildings shouldn't all have the same price ratios and be
 *    priced the exact same relative to each other across eras"*. What varies is which of
 *    the four an era makes dearest and by how much — era five's amenity is the cheapest
 *    of its four, era six's is the dearest, era eight's dwelling is the dearest — and
 *    what does NOT vary is the era's total city price, because that is the number
 *    solvency is measured against. `civicSolvency.test.ts` derives both halves.
 *  - **A `food` row's `Provides` cell says "food for ~N"** and a dwelling's says
 *    "N livability". Under the pooled ruling those are the same contribution, and
 *    both land in `livability` here. That mapping IS the flip, and it is what makes
 *    a food row and a dwelling row comparable at all.
 */
export const CIVIC_CATALOGUE: readonly CivicBuildingDefinition[] = [
  // Era 1 — Prehistoric (stone, ×1). The Family Lodge carries the hall's own fire, which
  // is what stops it being a Smokehouse that costs a plot more.
  row(
    "prehistoric_smokehouse",
    "prehistoric",
    "stone",
    "The Smokehouse",
    "food",
    2,
    1,
    80,
    20,
    0,
  ),
  row(
    "prehistoric_longhouse",
    "prehistoric",
    "stone",
    "The Family Lodge",
    "dwelling",
    2,
    2,
    80,
    20,
    5,
  ),
  row(
    "prehistoric_campfire",
    "prehistoric",
    "stone",
    "The Campfire",
    "amenity",
    2,
    2,
    100,
    0,
    20,
  ),
  row(
    "prehistoric_storage_pit",
    "prehistoric",
    "stone",
    "The Spring",
    "blend",
    1,
    1,
    120,
    10,
    10,
  ),

  // Era 2 — Neolithic (grain, ×2). Land is tightest in the run here, so the era pays the
  // run's steepest premium for a saved plot: the 1×1 Well is 2.14× the Granary.
  row("neolithic_granary", "neolithic", "grain", "The Granary", "food", 2, 1, 140, 40, 0),
  row(
    "neolithic_village_houses",
    "neolithic",
    "grain",
    "The Village Houses",
    "dwelling",
    2,
    2,
    160,
    40,
    10,
  ),
  row(
    "neolithic_bread_oven",
    "neolithic",
    "grain",
    "The Bread Oven",
    "amenity",
    2,
    2,
    220,
    0,
    40,
  ),
  row(
    "neolithic_village_well",
    "neolithic",
    "grain",
    "The Village Well",
    "blend",
    1,
    1,
    300,
    20,
    20,
  ),

  // Era 3 — Bronze Age (bronze, ×4). Earthwork food against a made-metal premium on
  // everything built: the Steam House is the first amenity anybody actually wants.
  row(
    "bronze_age_terraced_fields",
    "bronze_age",
    "bronze",
    "The Terraced Fields",
    "food",
    1,
    2,
    260,
    80,
    0,
  ),
  row(
    "bronze_age_walled_houses",
    "bronze_age",
    "bronze",
    "The Walled Houses",
    "dwelling",
    2,
    2,
    340,
    80,
    20,
  ),
  row(
    "bronze_age_bathhouse",
    "bronze_age",
    "bronze",
    "The Steam House",
    "amenity",
    3,
    2,
    460,
    0,
    80,
  ),
  row(
    "bronze_age_weigh_house",
    "bronze_age",
    "bronze",
    "The Trading Post",
    "blend",
    1,
    1,
    520,
    40,
    40,
  ),

  // Era 4 — Classical (silver, ×8). First era whose dwelling carries no secondary,
  // separated from the food row on cost and footprint instead — and the era where the
  // dwelling first carries a real height premium, at 1.5× the food row.
  row(
    "classical_public_granary",
    "classical",
    "silver",
    "The Grain Dock",
    "food",
    2,
    2,
    560,
    160,
    0,
  ),
  row(
    "classical_apartment_block",
    "classical",
    "silver",
    "The Cottages",
    "dwelling",
    1,
    2,
    840,
    160,
    0,
  ),
  row("classical_baths", "classical", "silver", "The Baths", "amenity", 3, 2, 880, 0, 160),
  row(
    "classical_fountain",
    "classical",
    "silver",
    "The Fountain",
    "blend",
    1,
    1,
    1120,
    80,
    80,
  ),

  // Era 5 — Medieval (coins, ×16). THE ONE ERA WHOSE AMENITY IS THE CHEAPEST OF ITS FOUR:
  // a fair is mostly open ground, where a tithe barn and a castle are real buildings.
  row(
    "medieval_great_barn",
    "medieval",
    "gold",
    "The Great Barn",
    "food",
    2,
    2,
    1600,
    320,
    0,
  ),
  row(
    "medieval_cottages",
    "medieval",
    "gold",
    "The Castle",
    "dwelling",
    2,
    1,
    2080,
    320,
    0,
  ),
  row(
    "medieval_market_square",
    "medieval",
    "gold",
    "The Fairground",
    "amenity",
    2,
    2,
    1280,
    0,
    320,
  ),
  row("medieval_chapel", "medieval", "gold", "The Chapel", "blend", 1, 1, 2400, 160, 160),

  // Era 6 — Early Modern (gems, ×32). THE ONE ERA WHOSE AMENITY IS THE DEAREST OF ITS
  // FOUR, which is what §2 there demands of the Town Square: it must lose on cost as
  // well as on land, or the era's signature building is the only right answer.
  row(
    "renaissance_covered_market",
    "renaissance",
    "gems",
    "The Covered Market",
    "food",
    2,
    2,
    2080,
    640,
    0,
  ),
  row(
    "renaissance_grand_apartments",
    "renaissance",
    "gems",
    "The Merchant Houses",
    "dwelling",
    2,
    2,
    3200,
    640,
    160,
  ),
  row(
    "renaissance_town_square",
    "renaissance",
    "gems",
    "The Town Square",
    "amenity",
    3,
    2,
    3680,
    0,
    640,
  ),
  // THE ID IS A KEY, NOT A DESCRIPTION. `renaissance_hospital` holds *The Painters'
  // School* because the lead moved the hospital to era nine, where
  // `information_age_clinic` now holds *The Hospital*. Neither id moves: see
  // `CivicBuildingDefinition`, and the pin in `civicCatalogue.test.ts`.
  row(
    "renaissance_hospital",
    "renaissance",
    "gems",
    "The Painters' School",
    "blend",
    1,
    2,
    3360,
    320,
    320,
  ),

  // Era 7 — Industrial (coal, ×64). The food row is priced BELOW the ladder on
  // purpose — the cheapest livability in the run so far. Both era 7 display names
  // moved in the row swap; the ids did not.
  row(
    "industrial_cold_store",
    "industrial",
    "coal",
    "The Food Works",
    "food",
    2,
    2,
    3840,
    1280,
    0,
  ),
  row(
    "industrial_workers_houses",
    "industrial",
    "coal",
    "The Workers' Houses",
    "dwelling",
    2,
    1,
    4480,
    1280,
    0,
  ),
  row(
    "industrial_public_baths",
    "industrial",
    "coal",
    "The Railroad Station",
    "amenity",
    2,
    2,
    6400,
    0,
    1280,
  ),
  row(
    "industrial_library",
    "industrial",
    "coal",
    "The Library",
    "blend",
    1,
    1,
    7680,
    640,
    640,
  ),

  // Era 8 — Atomic (electricity, ×128). THE ONE ERA WHOSE DWELLING IS THE DEAREST OF ITS
  // FOUR: §2 there calls the one-cell Apartment Tower "the era's steepest premium", and
  // the supermarket is what makes this era's food the cheapest thing in its catalogue.
  row(
    "atomic_age_supermarket",
    "atomic_age",
    "electricity",
    "The Supermarket",
    "food",
    2,
    2,
    8960,
    2560,
    0,
  ),
  row(
    "atomic_age_apartment_tower",
    "atomic_age",
    "electricity",
    "The Apartment Tower",
    "dwelling",
    1,
    1,
    18560,
    2560,
    0,
  ),
  row(
    "atomic_age_swimming_pool",
    "atomic_age",
    "electricity",
    "The Swimming Pool",
    "amenity",
    3,
    2,
    14080,
    0,
    2560,
  ),
  row(
    "atomic_age_community_centre",
    "atomic_age",
    "electricity",
    "The Fire Station",
    "blend",
    2,
    1,
    17280,
    1280,
    1280,
  ),

  // Era 9 — Information (silicon, ×256). Logistics make food the cheapest coefficient
  // outside era seven; open ground is the era's scarce luxury, so the Roof Garden takes
  // the largest amenity premium in the run.
  row(
    "information_age_food_warehouse",
    "information_age",
    "silicon",
    "The Distribution Center",
    "food",
    2,
    2,
    15360,
    5120,
    0,
  ),
  row(
    "information_age_residential_tower",
    "information_age",
    "silicon",
    "The Condominium",
    "dwelling",
    1,
    1,
    24320,
    5120,
    0,
  ),
  row(
    "information_age_park",
    "information_age",
    "silicon",
    "The Roof Garden",
    "amenity",
    3,
    2,
    30720,
    0,
    5120,
  ),
  // The other half of the hospital's move: this id says clinic and this row IS the
  // hospital. Stable by the same rule — a placement records the id.
  row(
    "information_age_clinic",
    "information_age",
    "silicon",
    "The Hospital",
    "blend",
    1,
    2,
    33280,
    2560,
    2560,
  ),

  // Era 10 — Cyberpunk (data, ×512). The ONLY era whose food row is dearer than its
  // dwelling: the Farm carries a quarter-magnitude happiness for being the city's one
  // fresh food, and the Homes take the run's cheapest dwelling price for being its
  // least dignified housing. Both are 1×1, so nothing else could separate them.
  row(
    "cyberpunk_vertical_farm",
    "cyberpunk",
    "data",
    "The Vertical Farm",
    "food",
    1,
    1,
    40960,
    10240,
    2560,
  ),
  row(
    "cyberpunk_capsule_homes",
    "cyberpunk",
    "data",
    "The Pod Apartments",
    "dwelling",
    1,
    1,
    35840,
    10240,
    0,
  ),
  row(
    "cyberpunk_night_market",
    "cyberpunk",
    "data",
    "The Night Market",
    "amenity",
    3,
    2,
    46080,
    0,
    10240,
  ),
  row(
    "cyberpunk_station",
    "cyberpunk",
    "data",
    "The Nightclub",
    "blend",
    2,
    2,
    61440,
    5120,
    5120,
  ),
];

const BY_ID: ReadonlyMap<string, CivicBuildingDefinition> = new Map(
  CIVIC_CATALOGUE.map((building) => [building.id, building]),
);

/** The building, or null for an unknown id. Never throws. */
export function findCivicBuilding(id: string): CivicBuildingDefinition | null {
  return BY_ID.get(id) ?? null;
}

/**
 * The building, or a loud failure. The `resolveNeighborhood` / `materialForEraOrThrow`
 * discipline: an unknown building id resolving to a free, contribution-less placeholder
 * is strictly worse than one that stops.
 */
export function civicBuildingOrThrow(id: string): CivicBuildingDefinition {
  const building = findCivicBuilding(id);
  if (building === null) {
    throw new Error(
      `economy: no civic building "${id}". Ids are era-prefixed slugs from ` +
        `CIVIC_CATALOGUE; a display name is not an id.`,
    );
  }
  return building;
}

/** The four rows buildable in `eraId`, in authored order. */
export function civicCatalogueForEra(eraId: EraId): readonly CivicBuildingDefinition[] {
  return CIVIC_CATALOGUE.filter((building) => building.era === eraId);
}

/**
 * The row filling `role` in `eraId`. Total over both arguments by the one-of-each
 * partition, which `civicCatalogue.test.ts` asserts — so this is what makes O-4's
 * "the current era's cost for that building type" a resolvable question.
 */
export function civicBuildingForRole(
  eraId: EraId,
  role: CivicRole,
): CivicBuildingDefinition {
  const match = CIVIC_CATALOGUE.find(
    (building) => building.era === eraId && building.role === role,
  );
  if (match === undefined) {
    throw new Error(
      `economy: era "${eraId}" has no "${role}" civic building. Every era's ` +
        `catalogue holds exactly one of each role (era one §3), so this is a ` +
        `catalogue defect rather than a missing lookup.`,
    );
  }
  return match;
}

/** Grid cells one placement occupies. The footprint axis is area, not shape. */
export function civicFootprintCells(building: CivicBuildingDefinition): number {
  return building.footprint.width * building.footprint.depth;
}
