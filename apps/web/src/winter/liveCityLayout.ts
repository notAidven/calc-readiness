import { hardWinterIsland, type WinterBuildingPlacement, winterCellKey } from "@cr/game";

import type { CityDevSnapshot } from "../city/citySession";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import { placementLabel, TOWN_HALL_ID } from "../city/townHall";
import type { PlacedTransform } from "../city/worldLayout";
import { devSessionStore } from "../devPersistence/devSession";

/**
 * THE PLAYER'S OWN CITY, AS A WINTER BOARD — and the reason it can be read at all.
 *
 * The three authored layouts (`spread`, `packed`, `rimward`) exist to make a tuning
 * number measurable across a RANGE of cities, which is the right instrument for choosing
 * a number and the wrong one for judging whether it feels right. That judgement needs the
 * city the person judging actually built, so this reads it.
 *
 * ## Both sides already agree about the ground, which is why this is a rename and not a
 * projection
 *
 * The winter island is not a fixture: `hardWinterIsland` re-derives `isCellBuildable`'s
 * rule at `eraBuildableRadius("prehistoric")`, which is the same 88 cells at the same
 * `GRID_CELL` of 4 that the city places buildings on. So a placement's `(col, row)` means
 * the same thing on both boards and nothing has to be scaled, offset or rounded. What is
 * dropped is the parts the winter has no notion of — the quarter-turn rotation, and the
 * rest of a multi-cell footprint, since the winter models a building as the one cell it is
 * anchored on.
 *
 * ## It is a SNAPSHOT, and the read is the only direction that exists
 *
 * `devSessionStore.load()` parses the saved blob and returns it; it writes nothing, and
 * neither does anything downstream of here. The winter engine is a pure reducer with no
 * economy write, no mastery write and no session handle, so there is no path by which
 * playing a winter over someone's layout can alter that layout — the encounter is a
 * sandbox by construction rather than by promise, and `liveCityLayout.test.ts` asserts the
 * saved blob is byte-identical after a whole winter is played over it.
 *
 * That matters more than usual here: the person opening this is EVALUATING a tuning
 * number, and a crisis that ruined ground he actually wanted would be the wrong thing to
 * hand him.
 */

/** How a real city arrives here: the saved layout, or nothing when none is saved. */
export interface LiveCityLayout {
  readonly id: "live";
  readonly label: string;
  readonly blurb: string;
  readonly buildings: readonly WinterBuildingPlacement[];
  /** Rim bands the buildings span, which is what makes a board hard or trivial. */
  readonly bands: number;
  /** True when the hall is standing on the island and joined the board. */
  readonly includes_hall: boolean;
}

/** Why there is no live board to play, in words a person can act on. */
export type LiveCityRefusal =
  | { readonly reason: "no_saved_city"; readonly message: string }
  | { readonly reason: "nothing_built"; readonly message: string };

export type LiveCityResult =
  | { readonly status: "ready"; readonly layout: LiveCityLayout }
  | ({ readonly status: "unavailable" } & LiveCityRefusal);

/**
 * Turn a saved city into a winter board.
 *
 * Takes the snapshot rather than reaching for the store, so the conversion is testable
 * without a browser and so the one place that touches storage is named below.
 *
 * The parameter is the two fields this reads and not the whole snapshot, so the CITY can
 * hand over the placements it already holds in memory. That matters for the in-city mount
 * (`city/three/WinterInCity.tsx`): the winter falls on the island currently on screen, and
 * a board re-read from storage could be a debounced save behind the one the player is
 * looking at — which would put frost on cells whose buildings had since moved.
 */
export type LiveCitySource = Pick<CityDevSnapshot, "placements" | "town_hall">;

export function liveCityLayoutFrom(snapshot: LiveCitySource | null): LiveCityResult {
  if (snapshot === null) {
    return {
      status: "unavailable",
      reason: "no_saved_city",
      message:
        "Build something on the island first. This browser holds no saved city yet. " +
        "The winter reads the layout you actually made, and it needs one to fall on.",
    };
  }

  const island = hardWinterIsland(CURRENT_ERA_ID);
  const candidates: PlacedTransform[] = [
    ...(snapshot.town_hall ? [snapshot.town_hall] : []),
    ...snapshot.placements,
  ];

  const seen = new Set<string>();
  const buildings: WinterBuildingPlacement[] = [];
  for (const placed of candidates) {
    const key = winterCellKey(placed.col, placed.row);
    // Off-island or double-anchored placements are DROPPED rather than passed on.
    // `createHardWinter` throws on either, and a saved blob is user data from a browser
    // this code has never met — refusing the whole board because one entry is odd would
    // be a worse answer than playing the rest of the city.
    if (!island.rim_depth.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    buildings.push({ node_id: placed.nodeId, col: placed.col, row: placed.row });
  }

  if (buildings.length === 0) {
    return {
      status: "unavailable",
      reason: "nothing_built",
      message:
        "Your saved city has nothing standing on the island yet. Place a building or two " +
        "and come back. A winter over an empty island freezes nothing and ends flawless, " +
        "which is a pass on an encounter that never happened.",
    };
  }

  const depths = buildings.map(
    (b) => island.rim_depth.get(winterCellKey(b.col, b.row)) as number,
  );
  const bands = new Set(depths).size;

  return {
    status: "ready",
    layout: {
      id: "live",
      label: "Your city",
      blurb: describeLiveCity(buildings.length, bands, depths),
      buildings,
      bands,
      includes_hall: buildings.some((b) => b.node_id === TOWN_HALL_ID),
    },
  };
}

/**
 * How this city compares to the authored boards, in one sentence, because the number that
 * decides whether a winter is tense is how many rim bands the buildings span rather than
 * how many there are. `packed` spans two and is the degenerate case; `spread` and
 * `rimward` span four.
 */
function describeLiveCity(count: number, bands: number, depths: readonly number[]): string {
  const shape =
    bands <= 2
      ? "packed into two rim bands or fewer, which is the shape that makes a winter easy: " +
        "the frost reaches everything at once and one fire can cover the lot"
      : bands >= 4
        ? "spread across four rim bands or more, so the frost arrives in stages and a fire " +
          "reaches a building or two"
        : "spread across three rim bands, between the authored extremes";
  const shore = depths.filter((d) => d === 0).length;
  const exposure =
    shore === 0
      ? "Nothing stands on the shoreline, so the opening pull-back costs no building"
      : `${shore} building${shore === 1 ? " stands" : "s stand"} on the shoreline, so the frost is on ${shore === 1 ? "it" : "them"} from round one`;
  return `${count} building${count === 1 ? "" : "s"} as you placed them, ${shape}. ${exposure}.`;
}

/**
 * The one call that touches storage, and it only ever reads.
 *
 * Deliberately not memoised: the person playing may alt-tab to the city, move a building
 * and come back, and a board that had cached the old layout would quietly be answering a
 * question about a city that no longer exists.
 */
export function loadLiveCityLayout(): LiveCityResult {
  return liveCityLayoutFrom(devSessionStore.load());
}

/** Name any placement the live board carries, hall sentinel included. */
export function liveBuildingLabel(nodeId: string): string {
  return placementLabel(nodeId);
}
