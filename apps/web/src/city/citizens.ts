import { civicBuildingOrThrow, NO_CONTRIBUTION } from "@cr/economy";
import {
  buildingLedger,
  type CapacityContribution,
  type CitizenNodeInput,
  type CitizenRoster,
  type CityViewModel,
  type CityVitality,
  type CivicRosterInput,
  deriveCitizenRoster,
  deriveCityVitality,
} from "@cr/game";
import type { LessonStage } from "@cr/state-schema";

import { parseCivicPlacementId } from "./civic";
import { isTownHall } from "./townHall";
import type { PlacedTransform } from "./worldLayout";

/**
 * The ONE place the web lane and the engine meet over citizens.
 *
 * It is deliberately THIN, and D-CIT17 is why: the social role is resolved inside the
 * engine, from the neighborhood descriptor, and arrives on `CityBuildingView` already
 * decided. So this adapter looks nothing up — it reads a role the generic pipeline
 * produced and pairs it with what is actually on the ground. The earlier design had
 * this file reading `D1_NODE_BUILDINGS[nodeId].gridworkId` and threading the art mass
 * across the boundary; that is gone, along with the import.
 *
 * Three things this deliberately does NOT do:
 *   - it does not look up or invent a role (the descriptor decided it);
 *   - it does not decide who lives where (the engine does, and the scene reads it);
 *   - it does not invent a seed (D-CIT8 — the seed is an input).
 *
 * The building order it hands over is PLACEMENT order, which is what makes "placing a
 * new building never changes an existing citizen's home" hold: a new building appends
 * and draws only from people with no home yet.
 */

/**
 * THE CITY'S OWN SEED, read off the student the city belongs to.
 *
 * D-CIT8 requires the seed to be an INPUT and forbids a renderer minting one, because a
 * minted seed re-skins the crowd on every mount. The student id is the stable per-student
 * value the roster's docblock asks for, and it arrives on every `StudentNodeState` the city
 * loads, so this is a projection of an input into the numeric shape `createSeededRng`
 * takes rather than an invention.
 *
 * It lives beside {@link cityCitizenRoster} because this is the one file where the web lane
 * and the engine meet over citizens, and a second copy of this hash anywhere else would be
 * a second city.
 */
export function citizenSeedFor(studentId: string | undefined): number {
  if (!studentId) {
    // An unauthenticated or not-yet-loaded city still has to draw the same crowd twice, so
    // this is a constant rather than a clock. It is only ever reached before the first node
    // state arrives.
    return 0x01712e4;
  }
  let hash = 0x811c9dc5;
  for (let index = 0; index < studentId.length; index += 1) {
    hash = Math.imul(hash ^ studentId.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

/**
 * `CityBuildingView` exposes the DERIVED `construction_state` rather than the raw
 * `lesson_stage`, so the stage is reconstructed here and the engine re-derives
 * completeness from it through the same `deriveConstructionState` rule. Do NOT
 * "simplify" this by teaching the engine to accept a `construction_state`: that would
 * let a caller ASSERT completeness instead of deriving it, which is the one thing
 * D-CIT10 exists to prevent. If it ever needs to go, the clean replacement is to pass
 * the raw `StudentNodeState` rows in alongside the view model.
 */
function lessonStageFor(state: CityViewModel["buildings"][number]): LessonStage {
  switch (state.construction_state) {
    case "complete":
    case "gold":
      return "done";
    case "practice":
      return "practice";
    case "teaching":
      return "teaching";
    default:
      return "not_started";
  }
}

function citizenNodes(
  viewModel: CityViewModel,
  placements: readonly PlacedTransform[],
): CitizenNodeInput[] {
  const buildingByNode = new Map(
    viewModel.buildings.map((building) => [building.node_id, building]),
  );

  const nodes: CitizenNodeInput[] = [];
  for (const placed of placements) {
    // The hub is not a skill node: no registry entry, no `student_node_state` row,
    // and it never appears in `viewModel.buildings`. Its daytime staff is a constant
    // in the engine's table, so there is nothing to thread here.
    //
    // The `!building` guard below already skips it for exactly that reason, so this
    // line changes no behaviour today. It is kept because "the hub is not a citizen
    // building" is a rule a reader should find stated, not infer from a lookup miss.
    if (isTownHall(placed.nodeId)) {
      continue;
    }
    const building = buildingByNode.get(placed.nodeId);
    if (!building) {
      continue;
    }
    nodes.push({
      node_id: building.node_id,
      // Resolved from the descriptor by `resolveNeighborhood`, not looked up here.
      citizen_role: building.citizen_role,
      // Everything in `placements` is, by definition, on the ground.
      placed: true,
      mastery: building.mastery,
      lesson_stage: lessonStageFor(building),
      placement_estimate: building.blueprint.placement_estimate,
      authoring_complete: building.construction_state !== "preview",
    });
  }

  return nodes;
}

/* ========================================================================== */
/* THE RENDER LANE'S ENTRY POINT — read this before drawing a citizen          */
/* ========================================================================== */

/**
 * DRAW `roster.population`. DO NOT DRAW A CAPACITY.
 *
 * The design authors both, they diverge for most of the game, and drawing the wrong
 * one looks like a balance bug rather than a rendering bug:
 *
 *   - **`roster.population`** is a HEADCOUNT — the people who are actually here. It is
 *     a pure function of learning state (D-CIT2): the founding crowd, plus a term per
 *     completed building and a larger term per mastered skill. This is the number of
 *     bodies to instance.
 *   - **`roster.residence_capacity`** is a CAPACITY — how many the city could house.
 *     Per PR #218 it is the HOUSING INPUT to livability, not a headcount, and it is
 *     routinely both above and below the population.
 *   - **`cityVitality().livability.sustains`** is the other capacity, and is even
 *     further from a headcount: it folds food in as well.
 *
 * `roster.housed + roster.waiting.length === population`, always. So the split to
 * render is housed-versus-waiting, and the total is `population` either way.
 *
 * WHAT EACH PERSON IS: `roster.citizens[]`, in stable index order, each carrying
 * `state`, `home_node_id`, `day_node_id` and a seeded `look`. The per-building view is
 * `roster.buildings[]`, keyed by `node_id` and carrying the `role` — `residence` /
 * `school` / `civic` — which is where D-CIT17 put it. Nothing needs looking up.
 *
 * THE COUNT IS EXACT AND UNCAPPED HERE. `MAX_RENDERED_CITIZENS` caps RENDERING only
 * (D-CIT9); the roster, the counts and the DOM readout stay exact, so the cap belongs
 * in the scene and never in this derivation.
 *
 * THE HUD AND THE RENDERER CANNOT DISAGREE, structurally rather than by convention:
 * `cityCitizenRoster` and `cityVitality` both derive from the same `citizenNodes()`
 * list through the same `buildingLedger`, and the population is `citizenPopulation`
 * either way. There is no stored counter for the two to drift apart on.
 * `cityPeople.contract.test.ts` pins it.
 */

/**
 * The stable seed the roster is derived from. An INPUT rather than something the
 * renderer mints (D-CIT8), which is the whole reason it is a named constant here and
 * not a `Math.random()` in a component.
 *
 * It is a FIXED value rather than a per-student one because nothing in this lane has a
 * student identifier to key on today, and minting one would be a persistence decision
 * that is not this file's to make. What D-CIT1 actually asks for is that the same
 * learner sees the same crowd across sessions with nothing saved, and a constant
 * satisfies that; what it costs is that two learners see the same faces, which is
 * invisible to either of them. Swap in a per-student value here when one exists and
 * every look re-rolls with no other change.
 */
export const CITY_CITIZEN_SEED = 0x570e;

/**
 * The bought civic buildings as roster inputs: a placement id and its catalogue type,
 * derived from the placement's own id. A transform that is not a civic placement (or
 * names a type the catalogue does not author) is dropped rather than guessed at, which
 * is what keeps a stale dev snapshot from inventing a role.
 *
 * NO GEOMETRY CROSSES HERE (D-CIT8): the roster gets ids and types, never cells.
 */
function civicRosterInputs(civic: readonly PlacedTransform[]): CivicRosterInput[] {
  const rows: CivicRosterInput[] = [];
  for (const placed of civic) {
    const parsed = parseCivicPlacementId(placed.nodeId);
    if (parsed !== null) {
      rows.push({
        placement_id: placed.nodeId,
        citizen_role: parsed.row.role === "dwelling" ? "residence" : "civic",
      });
    }
  }
  return rows;
}

/**
 * Every civic TYPE standing on the island, one entry per building — the shape
 * `deriveCityVitality` wants, since the catalogue is buildable as many times as the
 * player can afford.
 *
 * THE FREE ROW LEADS, AND IT IS NOT A PLACEMENT. Era one section 4 gives the starting
 * city a Smokehouse *"introduced by the tutorial as the player's first real placement
 * choice"*, and that placement does not exist yet (O-8, Evan). So its contribution
 * arrives here as a phantom row exactly as it did before purchases existed, and the
 * bought buildings are APPENDED to it. Seeding a real Smokehouse placement without
 * removing this row is the one way to double-count the starting city's 20 livability,
 * which is why `seedFromPlacement` says so at the point it clears the civic list.
 *
 * ## A SUSPENDED BUILDING CONTRIBUTES NOTHING, AND THE FREE ROW IS NOT SUSPENDABLE
 *
 * The second argument is the crisis's `suspended_civic`, as a set of PLACEMENT IDS
 * (`suspendedCivic.ts`). A shuttered building keeps its row and zeroes it, which is
 * `@cr/economy`'s own treatment of the same flag — `civicCityCapacities` maps a suspended
 * placement to `NO_CONTRIBUTION` rather than dropping it — so the two lanes withhold the
 * same thing in the same shape and the row count stays a count of standing buildings.
 *
 * **THE FREE ROW IS PUSHED BEFORE THE LOOP AND IS KEYED BY NOTHING**, which is what makes
 * it structurally unsuspendable rather than merely unsuspended today. It has no placement,
 * so it has no placement id, so no `suspended_civic` record can name it — and era one's
 * starting city cannot lose the 20 livability it is guaranteed (section 8.1) to a crisis
 * that shuttered a Smokehouse the player later BOUGHT. That bought Smokehouse is a real
 * placement with a real id and is suspended on its own terms, one row further down.
 * `suspendedCivicSuppression.test.ts` measures both halves of that sentence.
 */
const FREE_SMOKEHOUSE = civicBuildingOrThrow("prehistoric_smokehouse");
const FREE_SMOKEHOUSE_CONTRIBUTION: CapacityContribution = {
  livability: FREE_SMOKEHOUSE.provides.livability,
  happiness: FREE_SMOKEHOUSE.provides.happiness,
};

/** Shared so an undamaged city allocates nothing and reads identically to before. */
const NOTHING_SUSPENDED: ReadonlySet<string> = new Set<string>();

export function civicContributionRowsOf(
  civic: readonly PlacedTransform[],
  suspended: ReadonlySet<string> = NOTHING_SUSPENDED,
): CapacityContribution[] {
  const rows: CapacityContribution[] = [{ ...FREE_SMOKEHOUSE_CONTRIBUTION }];
  for (const placed of civic) {
    const row = parseCivicPlacementId(placed.nodeId)?.row;
    if (row !== undefined) {
      rows.push(
        suspended.has(placed.nodeId)
          ? { ...NO_CONTRIBUTION }
          : {
              livability: row.provides.livability,
              happiness: row.provides.happiness,
            },
      );
    }
  }
  return rows;
}

export function cityCitizenRoster(params: {
  readonly viewModel: CityViewModel;
  readonly placements: readonly PlacedTransform[];
  /**
   * The bought civic buildings. They add a per-building ROLE and nothing else — no
   * population, no homes, no daytime seats (see `CitizenRosterInput.civic` in the
   * engine for the two shipped invariants that requires).
   */
  readonly civic?: readonly PlacedTransform[];
  readonly seed?: number;
}): CitizenRoster {
  return deriveCitizenRoster({
    nodes: citizenNodes(params.viewModel, params.placements),
    civic: civicRosterInputs(params.civic ?? []),
    seed: params.seed ?? CITY_CITIZEN_SEED,
  });
}

/**
 * The city's LIVABILITY and HAPPINESS, off the same placed-and-complete set the
 * roster reads (D-CIT10), through the same thin adapter and with nothing looked up
 * here.
 *
 * NO SEED, deliberately. The roster needs one because it invents individuals; the two
 * capacities are totals over what stands on the ground, so a seed would be an input
 * that could not change the answer — and one the renderer would then be tempted to
 * mint (D-CIT8 forbids exactly that).
 *
 * THE CIVIC LIST defaults to era one's free Smokehouse and nothing else, which is what
 * the starting city is guaranteed (section 8.1 / era one section 4) and so is still the
 * right answer for a city that has bought nothing. A caller with purchases passes
 * {@link civicTypesOf} over its placement list, which leads with that same free row —
 * so the default and the wired path agree on the starting city rather than differing by
 * 20 livability.
 *
 * (This comment used to read *"There is no way to BUY a civic building yet"*. There is
 * now: `citySession.placeCivic`.)
 */
export function cityVitality(params: {
  readonly viewModel: CityViewModel;
  readonly placements: readonly PlacedTransform[];
  readonly civic?: readonly CapacityContribution[];
  /**
   * Laid road tiles. Happiness coverage only — never an input to the roster
   * (D-CIT18). Omit or pass 0 when the city has no paths.
   */
  readonly roadTileCount?: number;
}): CityVitality {
  return deriveCityVitality({
    ledger: buildingLedger(citizenNodes(params.viewModel, params.placements)),
    civic: params.civic ?? [FREE_SMOKEHOUSE_CONTRIBUTION],
    roadTileCount: params.roadTileCount ?? 0,
  });
}
