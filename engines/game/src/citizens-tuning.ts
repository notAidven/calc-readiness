import { type EraId, eraNumber, getEraOfNode } from "@cr/skill-graph";
import type { PlacementEstimate } from "@cr/state-schema";

import { DIAGNOSTIC_MASTERY_PLACEMENT_GATE } from "./island-unlock-exam";

/**
 * The SINGLE tuning table for citizens and city life (D-CIT14), pure and
 * framework-free.
 *
 * Every NUMBER the feature has lives here, not as a literal inside a derivation, so
 * a retune is one edit. Because nothing about the population is persisted (D-CIT1),
 * a retune applies RETROACTIVELY to every existing city with no migration and no
 * backfill. The tests pin the RELATIONSHIPS between these numbers, not the digits:
 * mastery beats building on both ledgers, the school and the park house nobody, and
 * the island's totals settle exactly full.
 *
 * All values are FIRST GUESSES; expect to retune (design section 8).
 *
 * WHAT IS NOT HERE: the ROLE each building plays. A role is the building's IDENTITY
 * and lives with the island's other identity data, in the neighborhood descriptor
 * (`descriptors.ts`, `citizen_roles` — D-CIT17); capacity is a separate NUMBER and
 * lives here. That split is the design's own (section 3), and it is why a `civic`
 * building can carry a few flats while a `school` carries none.
 *
 * Keyed by NODE ID, matching the role map. Not by display name (mutable — `NUM.S`
 * has already gone "Town Hall" → "City Bank" → "Assembly Hall", and D-ERA29 adds a
 * per-era subtitle on top) and not by Gridwork art mass (which lives in `apps/web` and
 * this package cannot see).
 *
 * The per-node comments below name the building and sketch WHERE its few flats are.
 * They are the room COUNT's rationale, not a description of the art: they used to say
 * "the deco tower" and "above the reading room", which described the retired modern set
 * rather than the era-one masses that actually render.
 */

/** How many people one building holds: two ledgers, three numbers. */
export interface CitizenCapacity {
  /** Homes once the building is placed and complete (design section 8.2). */
  readonly residence_built: number;
  /** Homes once its skill is mastered (`mastery >= 2`) — strictly larger (D-CIT15). */
  readonly residence_mastered: number;
  /**
   * Daytime seats: who is AT this building rather than on the street (design
   * section 8.3, the second ledger from GROUNDED CORRECTION 1). It has NO bearing
   * on who is waiting for a home, and it does not grow with mastery.
   */
  readonly daytime: number;
}

/* -------------------------------------------------------------------------- */
/* Population (design section 8.1)                                            */
/* -------------------------------------------------------------------------- */

/**
 * The people who wander out of the Civic Center on a bare island — and the whole
 * reason the middle of the game has pull, because they are the crowd that has to be
 * housed. Small enough that each is an individual you can follow.
 */
export const FOUNDING_POPULATION = 12;

/**
 * Finishing an era-one building visibly brings people. The smallest "some people arrived";
 * later eras multiply this base through {@link populationEraMultiplier}.
 *
 * **IT IS PAID AT `PRACTICED_MASTERY`, i.e. a scored practice set, not at the
 * construction stage** (`citizens-population.ts` for the ruling and what it overrules).
 * A learner at three of five has learned something, and this is the honest
 * representation of that: a few people, where zero would understate it and the full
 * mastered crowd would overstate it. A learner who tested out and has not practised gets
 * nothing here, which is the state the economy also pays nothing for.
 */
export const CITIZENS_PER_COMPLETE_BUILDING = 2;

/**
 * Mastering an era-one skill brings TWICE the build term, so mastery is unambiguously the
 * bigger reward and the ordering is visible rather than arithmetic (D-CIT2).
 * Mastering one era-one skill (2 + 4 = 6 people) is that era's largest learning arrival.
 * Gold mastery (3) adds nothing (D-CIT11).
 * Later eras multiply both terms equally, preserving the 1:2 relationship.
 */
export const CITIZENS_PER_MASTERED_SKILL = 4;

/**
 * Population gains use the same civilization curve as the era material economy: era N is
 * `2^(N-1)` times era one.
 *
 * This is a mirror rather than an economy import. The game engine contains progression gates,
 * and INV-COS-1 forbids an import from the economy package into this directory. The all-era
 * integration guard in `apps/web/src/city/eraVitalityScaling.test.ts` compares this behavior
 * with `eraCostMultiplier` for every canonical era, so either curve changing alone fails.
 *
 * Only LEARNING-DRIVEN arrivals are scaled. The Town Hall's eight founders remain eight on
 * every island: they are founding provision, not a lesson reward. This keeps era one's approved
 * 8 + 6-per-mastered-skill curve byte-for-byte unchanged while a later era's lesson brings a
 * crowd denominated at the same scale as the material it awards and the civic capacity it buys.
 */
export const POPULATION_ERA_MULTIPLIER_STEP = 2;

/** The multiplier for learning-driven population gains in one era. */
export function populationEraMultiplier(eraId: EraId): number {
  return POPULATION_ERA_MULTIPLIER_STEP ** (eraNumber(eraId) - 1);
}

/**
 * The population multiplier for a skill node. Unknown/unregistered nodes retain era-one scale
 * so the total fallback used by unauthored-island tests stays non-throwing.
 */
export function populationGainMultiplierForNode(nodeId: string): number {
  const era = getEraOfNode(nodeId);
  return era === undefined ? 1 : populationEraMultiplier(era.id);
}

/**
 * **THE PLACEMENT AT WHICH THE DIAGNOSTIC HANDS A BUILDING OVER**, which is the second
 * evidence of learning this ledger reads and the reason it can read one at all.
 *
 * `mastery >= PRACTICED_MASTERY` is the first: a scored practice set. This is the other,
 * and `PRACTICED_MASTERY`'s own docblock is where the distinction is drawn — *"a diagnostic
 * test-out writes `completion_status: "complete"`, `lesson_stage: "done"` and a passed
 * `placement_estimate` while leaving `mastery: 0`"*. A passed placement is the ONE of those
 * three that cannot also be reached by turning up, which is why it and not the other two is
 * the signal here.
 *
 * The boundary is imported from the island/diagnostic authority in this package. Web roster,
 * seeding, population, Bay, and server founding therefore cannot hold separate threshold
 * opinions.
 */
export const TESTED_OUT_PLACEMENT: PlacementEstimate = DIAGNOSTIC_MASTERY_PLACEMENT_GATE;

/* -------------------------------------------------------------------------- */
/* The two capacity ledgers (design sections 8.2, 8.3)                        */
/* -------------------------------------------------------------------------- */

/**
 * A node with no entry: no homes and no daytime seats. This is what makes the
 * feature free per island — an unauthored island's buildings need no citizens work
 * at all, and a node can be given capacity later as a pure data edit (design
 * section 17 Q3 is exactly such a promotion).
 */
export const EMPTY_CITIZEN_CAPACITY: CitizenCapacity = {
  residence_built: 0,
  residence_mastered: 0,
  daytime: 0,
};

/**
 * The per-node capacity table.
 *
 * Three `civic` buildings carry a FEW flats — "apartments above a shop" — because the
 * settled ending cannot be hostage to a single building. They are deliberately SMALL
 * because `NUM.S` and `NUM.F` have no prerequisites and can be finished first; a big
 * number there would settle the island too early. The school and the park carry ZERO
 * and that line is not crossed: a school is a school, a lawn houses nobody, and the
 * zero is what makes the mid-game crowd appear (design section 8.5).
 */
export const CITIZEN_NODE_CAPACITY: Readonly<Record<string, CitizenCapacity>> = {
  // the Dwellings — the island's housing, 59% of its homes. The 10 -> 26 jump is the
  // largest single beat in the game.
  "NUM.2": { residence_built: 10, residence_mastered: 30, daytime: 0 },
  // the Assembly Hall — a few quarters under the largest roof; the largest workplace.
  "NUM.S": { residence_built: 2, residence_mastered: 6, daytime: 8 },
  // the Store — a few quarters beside the stores; work and visit mixed.
  "NUM.F": { residence_built: 2, residence_mastered: 6, daytime: 8 },
  // the Tower — a keeper's quarters at its foot; a landmark with a small staff.
  "NUM.5": { residence_built: 2, residence_mastered: 6, daytime: 4 },
  // the Workshop — a visible cohort making the trip, and no homes.
  "NUM.3": { residence_built: 0, residence_mastered: 0, daytime: 8 },
  // the Commons — the loosest destination, and the one that should look busiest.
  "NUM.4": { residence_built: 0, residence_mastered: 0, daytime: 12 },
};

/**
 * The Civic Center's own daytime seats: a small staff. It is ALSO the gathering place
 * for everyone with nowhere to live, and that crowd is UNBOUNDED (design section 7) —
 * it is not limited by this number.
 */
export const HUB_DAYTIME_CAPACITY = 4;

/**
 * The capacity for a node, falling back to zeros for anything unlisted (including a
 * missing or unknown id). Total by construction: nothing throws and nothing divides
 * by zero on an unauthored island (D-CIT12).
 */
export function capacityForNode(nodeId: string | undefined | null): CitizenCapacity {
  if (!nodeId) {
    return EMPTY_CITIZEN_CAPACITY;
  }
  return CITIZEN_NODE_CAPACITY[nodeId] ?? EMPTY_CITIZEN_CAPACITY;
}

/* -------------------------------------------------------------------------- */
/* The settled endgame (design section 8.4)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Spare homes at full mastery. ZERO: population at full mastery (44) EQUALS
 * residential capacity at full mastery (44) — "full, settled, and happy" read
 * literally, every home occupied and nobody waiting.
 *
 * The amendment would permit spare homes, but an island with empty houses reads
 * HOLLOW. Kept SEPARATE from the guarantee (`population <= capacity`) so the tuning
 * intent and the promise can be loosened independently (design section 12.1).
 */
export const ENDGAME_SPARE_HOMES = 0;

/* -------------------------------------------------------------------------- */
/* Movement and rendering (design sections 8.6, 14) — consumed by the RENDER   */
/* layer, but held here because D-CIT14 puts ALL tuning in one table.          */
/* -------------------------------------------------------------------------- */

/** ~one grid cell (`GRID_CELL = 4`) every 2.5s: legible at the fixed ~49-degree camera. */
export const WALK_SPEED_UNITS_PER_SEC = 1.6;

/**
 * A road cell costs this much of a bare cell when routing, so traffic VISIBLY
 * follows the paths without a citizen ever refusing bare ground (D-CIT7 — roads
 * amplify, never gate).
 */
export const ROAD_PREFERENCE_WEIGHT = 0.5;

/**
 * One vehicle per this many road tiles, so material spent on roads buys visible life.
 *
 * **THE LOAD-BEARING NUMBER, and it was 8.** `2026-08-01-era-vehicles-and-city-life.md`
 * §4.5 measures era one's island: 88 buildable cells, 23 under its seven skill
 * footprints and 11 under one of each civic type, so **54 free**. At 8 the cap of six
 * needed 48 of those 54, which is 89% of the island paved; at 4 the first vehicle
 * arrives on a four-tile road and the cap needs 24, or 44%. So this is the constant that
 * decides whether a player ever sees a vehicle, and the cap is not.
 *
 * **Arithmetic against era one's island, not a measurement of play**, and flagged as a
 * first guess by the section that derived it. Retune it against a real island.
 */
export const VEHICLES_PER_ROAD_TILES = 4;

/**
 * A safety cap on vehicles, in the same spirit as {@link MAX_RENDERED_CITIZENS} and
 * unreachable for the same reason: six vehicles needs 24 road tiles against the ~54 cells
 * era one leaves free after its seven skill footprints and one of each civic type.
 *
 * Its budget is **INDEPENDENT of the citizen budget** (Q7, answered in
 * `2026-08-01-era-vehicles-and-city-life.md` §6.2): a vehicle count derived from roads
 * and a citizen count derived from mastery must not be coupled, or a crowded island
 * silently loses its traffic and a learning event changes the traffic.
 */
export const MAX_VEHICLES = 6;

/**
 * The RENDER-ONLY cap (D-CIT9, design section 14). The engine's population count,
 * capacities, assignments, and waiting list are EXACT and UNCAPPED, and the DOM
 * readout always reports the true number.
 *
 * PROVISIONAL, and set against a NAMED target (D-CIT20): the floor is a school
 * Chromebook with low-end integrated graphics; the common case is a typical student
 * laptop with integrated graphics. 48 clears the 44 that full D1 mastery produces
 * with a small margin, which is all the cap's job is — a safety net that is routinely
 * load-bearing is a design limit in disguise.
 *
 * DO NOT OVER-ENGINEER THIS NUMBER. It is unreachable on D1 in every build order, so
 * it matters for a later island's roster and for the degradation ladder, not for
 * shipping D1. And it is not the lever that decides whether this runs on a
 * Chromebook: two instanced draws of a few dozen low-poly bodies is a few thousand
 * triangles. The scene's real costs there are `dpr={[1, 2]}`, the shadow pass, and
 * the road layer — none of which citizens make worse.
 */
export const MAX_RENDERED_CITIZENS = 48;
