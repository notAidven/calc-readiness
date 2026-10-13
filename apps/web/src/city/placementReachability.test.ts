import { cityRosterNodeIds } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { type CityDevSession, createCityDevSession, D1_NODE_IDS } from "./citySession";
import { civicTestPayment } from "./civicTestSupport";
import { eraBuildableDiscRadius } from "./islandLand";
import { MOCK_CITY_LOAD } from "./mockCity";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import {
  BUILDABLE_RADIUS,
  cellCenter,
  defaultPlacements,
  footprintCells,
  footprintFor,
  GRID_CELL,
  isCellBuildable,
  isCellWalkable,
  isPlacementValid,
  occupiedCells,
  type PlacedTransform,
  placementRefusal,
  type Transform,
  unreachableNodeIds,
  WALKABLE_RADIUS,
  walkableRadiusFor,
} from "./worldLayout";

/**
 * THE REACHABILITY PLACEMENT RULE (Evan, 2026-07-29, closing O-13).
 *
 * *"A building may only be placed where every building remains reachable by walkable
 * ground"* — walkable-touching, explicitly NOT road-touching — and an invalid placement
 * is BLOCKED rather than penalised. It governs moves as well as placements, the Town
 * Hall included (it is movable per D-TH9, and its 3×2 is the widest wall on the island).
 *
 * WHAT THIS FILE IS SCOPED BY. The population is not "the modules that import the flood
 * fill" but **every surface that can commit a layout** — a gate that forgot the rule and
 * a gate that never had it look identical from outside. Three of those are the session's
 * transform-taking writes, and the census below derives them from the session's own
 * interface rather than from this list, so a fourth cannot be added without failing
 * here. The React surfaces gate on the same `placementRefusal` and are covered by
 * `CitySurface.test.tsx` (the confirm path) and by this file's pure cases.
 *
 * WHAT IT MUST NOT BECOME. Nothing here may gate on a road or on gold: roads are purely
 * cosmetic (INV-COS-1, `roads.ts`) and "roads as required infrastructure" is a rejected
 * alternative in the citizens design (D-CIT7, D-CIT18). The road-blindness case below is
 * the assertion that keeps that honest.
 */

/** The two sources this file makes structural claims about, read as text. */
const SOURCES = import.meta.glob(["./worldLayout.ts", "./citySession.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function sourceOf(file: string): string {
  const source = SOURCES[`./${file}`];
  // A missing source would make every assertion over it vacuous — the exact way a
  // green guard measures nothing.
  expect(source, file).toBeTypeOf("string");
  expect((source ?? "").length, file).toBeGreaterThan(2000);
  return source ?? "";
}

/* -------------------------------------------------------------------------- */
/* The sealed-in fixture. Five buildings, four of which wall the fifth in.     */
/* -------------------------------------------------------------------------- */

/**
 * A 1×1 School at the origin cell with its four orthogonal neighbours taken:
 *
 *          col -1    0     1     2
 *   row -1 [ 4  ][ F  ][ F  ]
 *   row  0 [ 4  ][ 3! ][ S  ][ S  ]
 *   row  1 [ 5  ][ 5  ][ S  ][ S  ]
 *   row  2 [ 5  ][ 5  ]
 *
 * `NUM.3` (the `3!` above) has walls on all four sides, so nobody can walk up to it.
 * `NUM.5` is the piece that closes the last gap at (0,1) — individually a perfectly
 * legal 2×2 on open ground, and reachable itself from the west. That is the whole point:
 * an implementation that only asks "can I reach the building I am dropping" says yes.
 */
const SEALED_IN = "NUM.3";
const RING_WITHOUT_LAST: readonly PlacedTransform[] = [
  { nodeId: SEALED_IN, col: 0, row: 0, rot: 0 }, // 1×1
  { nodeId: "NUM.4", col: -1, row: -1, rot: 0 }, // 1×2 → (-1,-1) (-1,0)
  { nodeId: "NUM.F", col: 0, row: -1, rot: 0 }, // 2×1 → (0,-1) (1,-1)
  { nodeId: "NUM.S", col: 1, row: 0, rot: 0 }, // 2×2 → (1,0) (2,0) (1,1) (2,1)
];
/** The sealing placement: 2×2 over (-1,1) (0,1) (-1,2) (0,2) — takes the last gap. */
const SEALING_MOVE: Transform = { col: -1, row: 1, rot: 0 };
const SEALING_NODE = "NUM.5";
/** Open ground far from the ring, where the same building is welcome. */
const HARMLESS_MOVE: Transform = { col: -4, row: -4, rot: 0 };
/** The hub, parked clear of the ring (its 3×2 covers the origin by default). */
const HUB_PARKED: Transform = { col: -5, row: -2, rot: 0 };

function occupiedFor(placements: readonly PlacedTransform[]): Set<string> {
  return occupiedCells(placements);
}

describe("the walkable disc the rule is measured over", () => {
  it("is strictly wider than the buildable one, so the perimeter can never be built on", () => {
    expect(WALKABLE_RADIUS).toBeGreaterThan(BUILDABLE_RADIUS);
    const reach = Math.ceil(WALKABLE_RADIUS / GRID_CELL) + 1;
    let buildable = 0;
    let walkableOnly = 0;
    for (let col = -reach; col <= reach; col += 1) {
      for (let row = -reach; row <= reach; row += 1) {
        if (isCellBuildable(col, row, BUILDABLE_RADIUS)) {
          buildable += 1;
          // Every buildable cell is walkable, or a building would stand off the path.
          expect(isCellWalkable(col, row, BUILDABLE_RADIUS)).toBe(true);
        } else if (isCellWalkable(col, row, BUILDABLE_RADIUS)) {
          walkableOnly += 1;
        }
      }
    }
    // The measured island: 88 buildable cells, ringed by a band nothing can claim.
    expect(buildable).toBe(88);
    // A FLOOR under the perimeter, because the whole "this rule costs no land" argument
    // rests on that band existing. An empty annulus would make every flood fill below
    // start from nowhere and report every building stranded.
    expect(walkableOnly).toBeGreaterThanOrEqual(24);
  });

  it("rings the buildable disc on every side, so a layout is always reachable from outside", () => {
    // Not just "there are perimeter cells" but "there are some in every quadrant": a
    // one-sided perimeter would make reachability depend on which way a blob faced.
    const reach = Math.ceil(WALKABLE_RADIUS / GRID_CELL) + 1;
    const quadrants = new Map<string, number>();
    for (let col = -reach; col <= reach; col += 1) {
      for (let row = -reach; row <= reach; row += 1) {
        if (
          isCellBuildable(col, row, BUILDABLE_RADIUS) ||
          !isCellWalkable(col, row, BUILDABLE_RADIUS)
        ) {
          continue;
        }
        const { x, z } = cellCenter(col, row);
        const key = `${x >= 0 ? "+" : "-"}${z >= 0 ? "+" : "-"}`;
        quadrants.set(key, (quadrants.get(key) ?? 0) + 1);
      }
    }
    expect([...quadrants.keys()].sort()).toEqual(["++", "+-", "-+", "--"]);
    for (const [quadrant, count] of quadrants) {
      expect(count, quadrant).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("unreachableNodeIds", () => {
  it("names the building its neighbours walled in — the seal-off case", () => {
    const sealed = [
      ...RING_WITHOUT_LAST,
      { nodeId: SEALING_NODE, ...SEALING_MOVE } satisfies PlacedTransform,
    ];
    // A floor: this is a five-building layout, not an empty one, so "nobody is
    // stranded" below could not have passed by having nothing to check.
    expect(sealed).toHaveLength(5);
    expect(unreachableNodeIds(sealed, BUILDABLE_RADIUS)).toEqual([SEALED_IN]);
    // And every OTHER building in the same layout is fine — the rule is about the one
    // that got walled in, not about density.
    expect(sealed.filter((p) => p.nodeId !== SEALED_IN)).toHaveLength(4);
  });

  it("finds nobody stranded one cell short of the seal", () => {
    expect(RING_WITHOUT_LAST).toHaveLength(4);
    expect(unreachableNodeIds(RING_WITHOUT_LAST, BUILDABLE_RADIUS)).toEqual([]);
  });

  it("clears the shipped era-one layout, hub included", () => {
    const hub: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -2, row: -1, rot: 0 };
    const placements = [
      hub,
      ...defaultPlacements([...D1_NODE_IDS], [hub], BUILDABLE_RADIUS),
    ];
    // Floor + composition: all six skills AND the hub, so this is the real island.
    expect(placements).toHaveLength(7);
    expect(placements.map((p) => p.nodeId)).toContain(TOWN_HALL_ID);
    expect(unreachableNodeIds(placements, BUILDABLE_RADIUS)).toEqual([]);
  });

  it("clears every stage of the mastery arc (buildings arrive one at a time)", () => {
    const hub: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -2, row: -1, rot: 0 };
    const full = defaultPlacements([...D1_NODE_IDS], [hub], BUILDABLE_RADIUS);
    let stages = 0;
    for (let built = 0; built <= full.length; built += 1) {
      expect(unreachableNodeIds([hub, ...full.slice(0, built)], BUILDABLE_RADIUS)).toEqual(
        [],
      );
      stages += 1;
    }
    expect(stages).toBe(7);
  });

  it("is blind to roads: paving a cell neither strands nor rescues anybody", () => {
    // INV-COS-1 / D-CIT7. `unreachableNodeIds` takes buildings and the island, and nothing
    // else, so there is no road argument to pass — this asserts the SHAPE that makes the
    // invariant true by construction, the same way D-CIT18 removed the router's.
    //
    // ⚑ IT USED TO BE AN ARITY OF ONE, and it counted rather than named: `length === 1` says
    // "not a road" only while there is exactly one thing it could be. The buildable disc
    // became an argument when it stopped being era one's constant, so the count is 2 and a
    // count of 2 excludes nothing at all. Named instead, in both directions — these two
    // parameters and no others — so a road argument arriving as a third, or as a rename of the
    // second, fails here rather than passing a wider count.
    const source = sourceOf("worldLayout.ts");
    const signature = /export function unreachableNodeIds\(([^)]*)\)/.exec(source);
    const parameters = (signature?.[1] ?? "")
      .split(",")
      .map((part) => part.split(":")[0]?.trim() ?? "")
      .filter((name) => name.length > 0);
    expect(parameters).toEqual(["placements", "buildableRadius"]);
    expect(unreachableNodeIds.length).toBe(parameters.length);
    expect(source).toMatch(/export function placementRefusal\(/);

    /*
     * AND THE MODULE CANNOT SEE A ROAD OR A WALLET, asserted as an ALLOW-LIST rather
     * than as `imports nothing`.
     *
     * WHY THIS LINE MOVED, since loosening the guard on the rule it guards deserves an
     * answer. It read `expect(source).not.toMatch(/^\s*import\s/m)` — worldLayout
     * imported nothing at all, so "nothing to gate on" and "no imports" were the same
     * sentence. They stopped being the same when civic buildings became buyable:
     * `footprintFor` has to size a bought building, and era one's four footprints are
     * AUTHORED in the catalogue (§3) and frozen across all ten eras by INV-ERA-1 /
     * D-ERA10, so copying them into `NODE_FOOTPRINTS` would have made a second, driftable
     * authority for a figure this repo is not allowed to choose.
     *
     * WHAT THE ORIGINAL WAS FOR IS UNCHANGED AND IS NOW SAID DIRECTLY: no road, no gold,
     * no wallet, no economy in scope, so nothing here can gate on paving or on a balance.
     * `import nothing` was a proxy for that; this is the thing itself, and it is a
     * NARROWER claim in one respect — it names the modules that must stay out, where the
     * old form only counted lines.
     *
     * Asserted in BOTH directions, so neither an unlisted import nor a stale entry
     * survives.
     */
    const ALLOWED_IMPORTS: Readonly<Record<string, string>> = {
      "./civic":
        "parseCivicPlacementId — the one parser resolves the canonical catalogue row and " +
        "its authored footprint. The layout imports no road, wallet or price mechanism.",
    };
    const specifiers = [...source.matchAll(/^import\s[^"']*["']([^"']+)["']/gm)]
      .map((match) => match[1] as string)
      .sort();

    // Floor: the parse found the real import list. Without it an unparseable file would
    // exempt everything below, which is how this kind of guard goes quietly green.
    expect(specifiers.length).toBeGreaterThanOrEqual(1);
    // Direction 1 — nothing imports that is not named, with its reason.
    expect([...new Set(specifiers)].sort()).toEqual(Object.keys(ALLOWED_IMPORTS).sort());
    // Direction 2 — a named entry that is no longer imported fails, so the list cannot
    // sit here excusing something that has gone.
    for (const allowed of Object.keys(ALLOWED_IMPORTS)) {
      expect(specifiers, `${allowed} is still imported`).toContain(allowed);
      expect(ALLOWED_IMPORTS[allowed]?.length ?? 0).toBeGreaterThan(40);
    }
    // And the thing the original line was actually protecting, stated as itself.
    for (const specifier of specifiers) {
      expect(specifier, "no road/gold/economy module is in scope here").not.toMatch(
        /road|gold|econom|wallet|shop|price/i,
      );
    }
    // And no road/economy IDENTIFIER is used in the code, not merely absent from the
    // import list. Comments are stripped first: this module's prose legitimately explains
    // why a road must not gate a placement ("hand a cosmetic gold sink authority over
    // whether a building may exist"), and a check that could not tell that sentence from
    // a call would have to be deleted the first time someone wrote it down.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code.length).toBeGreaterThan(1000);
    expect(code).not.toMatch(/\bROAD_|\broadCells?\b|\bgold\b|\bwallet\b/i);
  });
});

describe("placementRefusal — the hard gate", () => {
  it("refuses a placement that is individually legal but strands a DIFFERENT building", () => {
    const others = RING_WITHOUT_LAST;
    const blockedCells = occupiedFor(others);
    const candidate: PlacedTransform = { nodeId: SEALING_NODE, ...SEALING_MOVE };

    // It passes the OLD rule outright: on the island, overlapping nothing.
    expect(
      isPlacementValid(
        candidate,
        footprintFor(SEALING_NODE),
        blockedCells,
        BUILDABLE_RADIUS,
      ),
    ).toBe(true);
    // And it is reachable ITSELF, so a per-candidate check would wave it through.
    expect(unreachableNodeIds([candidate], BUILDABLE_RADIUS)).toEqual([]);

    expect(
      placementRefusal({
        candidate,
        others,
        blockedCells,
        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("unreachable");
  });

  it("allows the same building on open ground, so the rule is not just a refusal", () => {
    const others = RING_WITHOUT_LAST;
    expect(
      placementRefusal({
        candidate: { nodeId: SEALING_NODE, ...HARMLESS_MOVE },
        others,
        blockedCells: occupiedFor(others),

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBeNull();
  });

  it("names bounds and overlap apart from reachability, so the copy can differ", () => {
    const others = RING_WITHOUT_LAST;
    const blockedCells = occupiedFor(others);
    const offIsland = Math.ceil(BUILDABLE_RADIUS / GRID_CELL) + 1;
    expect(
      placementRefusal({
        candidate: { nodeId: SEALING_NODE, col: offIsland, row: offIsland, rot: 0 },
        others,
        blockedCells,

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("bounds");
    expect(
      placementRefusal({
        candidate: { nodeId: SEALING_NODE, col: 1, row: 0, rot: 0 },
        others,
        blockedCells,

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("overlap");
  });

  it("refuses the MOVE that seals, and lets the same building move elsewhere", () => {
    // The mover starts on open ground and is walked into the gap. Its own footprint is
    // excluded from both sets, exactly as a relocation does.
    const parked: PlacedTransform = { nodeId: SEALING_NODE, ...HARMLESS_MOVE };
    const all = [...RING_WITHOUT_LAST, parked];
    const others = all.filter((p) => p.nodeId !== SEALING_NODE);
    const blockedCells = occupiedCells(all, SEALING_NODE);

    expect(unreachableNodeIds(all, BUILDABLE_RADIUS)).toEqual([]);
    expect(
      placementRefusal({
        candidate: { nodeId: SEALING_NODE, ...SEALING_MOVE },
        others,
        blockedCells,

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("unreachable");
    // A move that does not seal anyone in is still free, including back home.
    expect(
      placementRefusal({
        candidate: parked,
        others,
        blockedCells,
        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBeNull();
  });

  it("refuses a TOWN HALL relocation that seals a skill in (D-TH9 is not an exemption)", () => {
    // The hub's 3×2 covers the last gap at (0,1) from (-2,1). The hall moves through the
    // same machinery as any building, so it can wall a neighbour in the same way.
    const hall: PlacedTransform = { nodeId: TOWN_HALL_ID, ...HUB_PARKED };
    const all = [...RING_WITHOUT_LAST, hall];
    const others = all.filter((p) => p.nodeId !== TOWN_HALL_ID);
    const blockedCells = occupiedCells(all, TOWN_HALL_ID);

    expect(footprintFor(TOWN_HALL_ID)).toEqual({ w: 3, d: 2 });
    expect(unreachableNodeIds(all, BUILDABLE_RADIUS)).toEqual([]);
    expect(
      placementRefusal({
        candidate: { nodeId: TOWN_HALL_ID, col: -2, row: 1, rot: 0 },
        others,
        blockedCells,

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("unreachable");
  });

  it("refuses a ROTATION that seals, since a quarter-turn moves cells like a nudge", () => {
    // A 2×1 at (0,1) leaves the gap; the same building turned to 1×2 covers (0,1)+(0,2).
    const ring = RING_WITHOUT_LAST.filter((p) => p.nodeId !== "NUM.F");
    const others = [...ring, { nodeId: "NUM.F", col: 0, row: -1, rot: 0 }];
    const blocked = occupiedFor(others);
    const flat: PlacedTransform = { nodeId: "NUM.4", col: 0, row: 1, rot: 1 };
    const turned: PlacedTransform = { nodeId: "NUM.4", col: 0, row: 1, rot: 0 };
    // rot 1 turns the 1×2 park into a 2×1: (0,1)+(1,1) — and (1,1) is NUM.S's cell.
    expect(
      placementRefusal({
        candidate: flat,
        others,
        blockedCells: blocked,
        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("overlap");
    // Unturned it is 1×2 over (0,1)+(0,2), which takes the School's last open side.
    expect(
      placementRefusal({
        candidate: turned,
        others,
        blockedCells: blocked,
        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("unreachable");
  });

  it("refuses what the move breaks, never what the layout already inherited", () => {
    // A layout saved before this rule existed can already strand someone. Held against
    // a candidate, that would refuse EVERY move on such an island — including the ones
    // that repair it — which is what would make a saved dev city a soft-lock.
    const bystander: PlacedTransform = { nodeId: "NUM.2", col: -4, row: -4, rot: 0 };
    const legacy = [
      ...RING_WITHOUT_LAST,
      { nodeId: SEALING_NODE, ...SEALING_MOVE } satisfies PlacedTransform,
      bystander,
    ];
    expect(legacy).toHaveLength(6);
    expect(unreachableNodeIds(legacy, BUILDABLE_RADIUS)).toEqual([SEALED_IN]);

    // A move of a building that has nothing to do with the seal is allowed, even though
    // NUM.3 is still stranded after it: the refusal is about what THIS move breaks.
    const withoutBystander = legacy.filter((p) => p.nodeId !== bystander.nodeId);
    expect(unreachableNodeIds(withoutBystander, BUILDABLE_RADIUS)).toEqual([SEALED_IN]);
    expect(
      placementRefusal({
        candidate: { nodeId: bystander.nodeId, col: 2, row: -4, rot: 0 },
        others: withoutBystander,
        blockedCells: occupiedCells(legacy, bystander.nodeId),

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBeNull();

    // The rule has not switched off on that island. Lifting one wall repairs it...
    const repaired = legacy.filter((p) => p.nodeId !== "NUM.F");
    expect(unreachableNodeIds(repaired, BUILDABLE_RADIUS)).toEqual([]);
    // ...and putting that wall straight back is refused, because now it is THIS move
    // that strands somebody.
    expect(
      placementRefusal({
        candidate: { nodeId: "NUM.F", col: 0, row: -1, rot: 0 },
        others: repaired,
        blockedCells: occupiedCells(repaired),

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("unreachable");
  });
});

describe("the shipped demo island (`?mock`), which is what the screenshots photograph", () => {
  /**
   * The two moves the Playwright run drives, on the REAL `MOCK_CITY_LOAD` layout rather
   * than a fixture: `NUM.3` is a 1×1 at (-2,-1) with exactly two open sides, (-3,-1) and
   * (-2,-2). Taking the first is allowed; taking the second is refused. Pinned here so
   * the screenshot's premise is a test rather than a claim about a picture.
   */
  const mockLayout = (): readonly PlacedTransform[] => {
    const hall = MOCK_CITY_LOAD.town_hall;
    expect(hall).not.toBeNull();
    const placements = MOCK_CITY_LOAD.placements ?? [];
    expect(placements).toHaveLength(6);
    return hall ? [...placements, hall] : [...placements];
  };

  it("opens with every building reachable, hub included", () => {
    const layout = mockLayout();
    expect(layout).toHaveLength(7);
    expect(unreachableNodeIds(layout, BUILDABLE_RADIUS)).toEqual([]);
  });

  it("allows the first wall and refuses the second, which is the seal", () => {
    const layout = mockLayout();
    // `NUM.3` sits at (-2,-1) with the hall east and `NUM.4` south, so it starts with
    // exactly two open sides. If that ever stops being true this test is measuring
    // something else, so say it out loud.
    expect(layout).toContainEqual({ nodeId: "NUM.3", col: -2, row: -1, rot: 0 });

    // 1. `NUM.5` west to (-4,-1) takes (-3,-1). Allowed: one side still open.
    const firstOthers = layout.filter((p) => p.nodeId !== "NUM.5");
    const firstMove: PlacedTransform = { nodeId: "NUM.5", col: -4, row: -1, rot: 0 };
    expect(
      placementRefusal({
        candidate: firstMove,
        others: firstOthers,
        blockedCells: occupiedCells(layout, "NUM.5"),

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBeNull();

    // 2. `NUM.2` to (-3,-3) takes (-2,-2), the last one. Refused.
    const after = [...firstOthers, firstMove];
    const secondOthers = after.filter((p) => p.nodeId !== "NUM.2");
    const secondMove: PlacedTransform = { nodeId: "NUM.2", col: -3, row: -3, rot: 0 };
    expect(
      isPlacementValid(
        secondMove,
        footprintFor("NUM.2"),
        occupiedCells(after, "NUM.2"),
        BUILDABLE_RADIUS,
      ),
    ).toBe(true); // on the island, overlapping nothing
    expect(unreachableNodeIds([secondMove], BUILDABLE_RADIUS)).toEqual([]); // and reachable itself
    expect(
      placementRefusal({
        candidate: secondMove,
        others: secondOthers,
        blockedCells: occupiedCells(after, "NUM.2"),

        buildableRadius: BUILDABLE_RADIUS,
      }),
    ).toBe("unreachable");
    // Naming the victim: it is not the building being moved.
    expect(unreachableNodeIds([...secondOthers, secondMove], BUILDABLE_RADIUS)).toEqual([
      "NUM.3",
    ]);
  });
});

describe("the rule is load-bearing, not decorative", () => {
  /**
   * Random legal layouts of all seven occupants, packed within `spread` cells of the
   * origin. Deterministic (one LCG, seeded), so both counts below are fixed.
   */
  function randomLegalLayouts(
    spread: number,
    wanted: number,
  ): readonly (readonly PlacedTransform[])[] {
    let seed = 20260729;
    const random = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const nodes = [TOWN_HALL_ID, ...D1_NODE_IDS];
    const layouts: PlacedTransform[][] = [];
    for (let attempt = 0; attempt < wanted * 400 && layouts.length < wanted; attempt += 1) {
      const placed: PlacedTransform[] = [];
      const occupied = new Set<string>();
      for (const nodeId of nodes) {
        const fp = footprintFor(nodeId);
        for (let tries = 0; tries < 60; tries += 1) {
          const t: Transform = {
            col: Math.round((random() * 2 - 1) * spread),
            row: Math.round((random() * 2 - 1) * spread),
            rot: Math.floor(random() * 4),
          };
          if (!isPlacementValid(t, fp, occupied, BUILDABLE_RADIUS)) {
            continue;
          }
          placed.push({ nodeId, ...t });
          for (const key of footprintCells(t, fp)) {
            occupied.add(key);
          }
          break;
        }
      }
      if (placed.length === nodes.length) {
        layouts.push(placed);
      }
    }
    return layouts;
  }

  const violating = (layouts: readonly (readonly PlacedTransform[])[]): number =>
    layouts.filter((layout) => unreachableNodeIds(layout, BUILDABLE_RADIUS).length > 0)
      .length;

  it("bites on a real share of the BLOB layouts it exists to refuse", () => {
    // "a person should be able to reach the building so the user can't just toss all the
    // buildings in a big blob" — so the population that matters is the blob: seven
    // occupants crammed within two cells of the origin, each individually legal.
    const blobs = randomLegalLayouts(2, 1000);
    expect(blobs.length).toBe(1000);
    for (const layout of blobs) {
      expect(layout).toHaveLength(7);
    }
    // Measured 14.7% over 5000 such layouts. Floored well under that so a footprint
    // retune cannot flake it, but a floor of 50 is not something an inert rule reaches.
    expect(violating(blobs)).toBeGreaterThanOrEqual(50);
    // And not everything: a rule that refused every blob would be a density cap.
    expect(violating(blobs)).toBeLessThan(blobs.length / 2);
  });

  it("costs a spread-out island nothing, which is why it needs no extra land", () => {
    // The other half of "load-bearing rather than punitive": across the whole buildable
    // disc the rule never fires, so a player who is not building a blob never meets it.
    // (0 of 5000 measured; 500 here to keep the suite quick.)
    const spread = randomLegalLayouts(Math.ceil(BUILDABLE_RADIUS / GRID_CELL), 500);
    expect(spread.length).toBe(500);
    expect(violating(spread)).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* The session is the authority: every layout WRITE gates on the same rule.    */
/* -------------------------------------------------------------------------- */

/**
 * The session methods that commit a caller-supplied transform, DERIVED from the
 * session's own interface rather than written down here: every `CityDevSession` member
 * whose parameter list mentions a `Transform`. That is the behavioural population — a
 * surface that takes a transform from outside is a surface that can strand a building,
 * whether or not it shares an implementation with the others.
 *
 * ⚑ `Transform\b` RATHER THAN `\bTransform\b`, WHICH IS A REPAIR AND NOT A TIDY-UP. The
 * word-boundary version could not see a writer whose parameter is a `PlacedTransform`, and
 * `seedCivicBuildings` — the catch-up's inherited seeding — takes a list of exactly those. It
 * commits caller-supplied transforms and can seal a neighbour in like any of the other five, so
 * a population that missed it would be scoped by the SPELLING of a type rather than by the
 * behaviour: precisely the substitution `.cursor/rules/qa-verification.mdc` is about. Widening
 * it added that one member and nothing else, which is measured by the composition below.
 */
function transformWritersFromSource(): readonly string[] {
  const source = sourceOf("citySession.ts");
  const start = source.indexOf("export interface CityDevSession {");
  expect(start).toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf("\n}\n", start));
  return [...body.matchAll(/^ {2}(\w+): \(([^)]*)\) =>/gms)]
    .filter(([, , params]) => /Transform\b/.test(params ?? ""))
    .map(([, name]) => name as string)
    .sort();
}

/** The session's committed layout. `CityLoad.placements` is optional on the type. */
async function layoutOf(session: CityDevSession): Promise<readonly PlacedTransform[]> {
  const placements = (await session.load()).placements;
  expect(placements).toBeDefined();
  return placements ?? [];
}

/**
 * The first cell a campfire can legally stand on that nothing is holding, found by scanning the
 * session's own gate rather than by authoring a coordinate.
 *
 * The alternative is a hand-picked cell, and a hand-picked cell is how an assertion about a
 * REFUSAL quietly becomes an assertion about geometry: `(-6, -6)` reads as open ground and is
 * outside era one's 22-unit disc, so a write refused for being off the island looks exactly like
 * a write refused for the reason under test.
 */
async function firstFreeCivicSpot(
  session: CityDevSession,
  nodeId: string,
): Promise<Transform> {
  const load = await session.load();
  // The session's own occupancy list, minus the building being asked about — which is
  // `refuseLayoutWrite`'s ignore-self rule, so this scan and the gate answer one question.
  const others = [
    ...(load.placements ?? []),
    ...(load.town_hall ? [load.town_hall] : []),
    ...(load.civic ?? []),
  ].filter((occupant) => occupant.nodeId !== nodeId);
  for (let col = -5; col <= 5; col += 1) {
    for (let row = -5; row <= 5; row += 1) {
      const candidate: PlacedTransform = { nodeId, col, row, rot: 0 };
      const refusal = placementRefusal({
        candidate,
        others,
        blockedCells: occupiedCells(others),
        buildableRadius: BUILDABLE_RADIUS,
      });
      if (refusal === null) {
        return { col, row, rot: 0 };
      }
    }
  }
  throw new Error(`no cell on this island accepts ${nodeId}`);
}

/** A city with the ring already standing, so one more piece would seal `NUM.3` in. */
async function sessionWithRing() {
  const session = createCityDevSession();
  // Park the hub well out of the way; the ring lives around the origin, and the hub is
  // pre-seeded ON the origin.
  await session.moveTownHall(HUB_PARKED);
  expect((await session.load()).town_hall).toMatchObject(HUB_PARKED);
  for (const placed of RING_WITHOUT_LAST) {
    await session.placeSkill(placed.nodeId, placed);
  }
  const load = await session.load();
  expect(await layoutOf(session)).toHaveLength(RING_WITHOUT_LAST.length);
  return { session, load };
}

describe("citySession refuses every stranding write", () => {
  it("counts the transform-taking writers off the interface, not off a list", () => {
    const derived = transformWritersFromSource();
    // The claim, in both directions: a new transform-taking method fails here until it
    // is covered below, and a renamed or deleted one fails here too.
    //
    // `placeCivic` IS THE GUARD DOING ITS JOB, recorded rather than quietly absorbed. It
    // read `["moveSkill", "moveTownHall", "placeSkill"]` and went red the moment a fourth
    // transform-taking write existed — which is exactly what "a new transform-taking
    // method fails here until it is covered below" was written to do. It is covered
    // below, in `placeCivic: a sealing purchase buys nothing`.
    //
    // `moveCivic` IS THE SAME THING HAPPENING A SECOND TIME, and recorded the same way.
    // The Move control on a bought building's popup needed a spatial write for the civic
    // half of the island; this list went red on the fifth writer before that write had a
    // reachability test, and it is covered below in `moveCivic: a sealing relocation`.
    //
    // `seedCivicBuildings` IS THE THIRD TIME, and it is the one the guard could not see until
    // its filter was widened: it takes `readonly PlacedTransform[]`, which `\bTransform\b` does
    // not match. It is covered below in `seedCivicBuildings: a sealing seat is not written`.
    expect(derived).toEqual([
      "moveCivic",
      "moveSkill",
      "moveTownHall",
      "placeCivic",
      "placeSkill",
      "restoreCivicAfterFailedRemoval",
      "seedCivicBuildings",
    ]);
    expect(derived.length).toBeGreaterThanOrEqual(7);
    const session = createCityDevSession();
    for (const name of derived) {
      expect(typeof (session as unknown as Record<string, unknown>)[name]).toBe("function");
    }
  });

  it("placeSkill: a sealing drop leaves the layout untouched", async () => {
    const { session } = await sessionWithRing();
    await session.placeSkill(SEALING_NODE, SEALING_MOVE);
    expect((await layoutOf(session)).map((p) => p.nodeId)).not.toContain(SEALING_NODE);
    // And the same building lands fine on open ground, so this is a refusal of the
    // SPOT rather than of the building.
    await session.placeSkill(SEALING_NODE, HARMLESS_MOVE);
    const settled = await layoutOf(session);
    expect(settled.find((p) => p.nodeId === SEALING_NODE)).toMatchObject(HARMLESS_MOVE);
    expect(unreachableNodeIds(settled, BUILDABLE_RADIUS)).toEqual([]);
  });

  it("moveSkill: a sealing relocation leaves the building where it was", async () => {
    const { session } = await sessionWithRing();
    await session.placeSkill(SEALING_NODE, HARMLESS_MOVE);
    await session.moveSkill(SEALING_NODE, SEALING_MOVE);
    const after = await layoutOf(session);
    expect(after.find((p) => p.nodeId === SEALING_NODE)).toMatchObject(HARMLESS_MOVE);
    expect(unreachableNodeIds(after, BUILDABLE_RADIUS)).toEqual([]);
  });

  it("placeCivic: a sealing purchase buys nothing and spends nothing", async () => {
    // The fourth writer. A bought building can seal a neighbour in exactly as an earned
    // one can, so it goes through the same gate — and because this write also SPENDS, the
    // refusal owes a second assertion the other three do not: the material is still
    // there. A gate that refused the placement and took the stone would be worse than no
    // gate at all.
    const { session } = await sessionWithRing();
    // The Campfire, because the seal is a FOOTPRINT fact: `SEALING_MOVE` is the spot a
    // 2×2 closes the ring from, and era one's 2×2 civic rows are the Longhouse and the
    // Campfire (§3, frozen by D-ERA10). Asserted rather than assumed, so a re-authored
    // catalogue fails here instead of silently testing a hole that no longer seals.
    expect(footprintFor("civic:campfire:0")).toEqual(footprintFor(SEALING_NODE));
    const before = session.civicMaterialSpent();
    const refused = await session.placeCivic(
      "campfire",
      SEALING_MOVE,
      civicTestPayment(10_000),
    );
    expect(refused.status).toBe("refused");
    expect(refused.refusal).toBe("unreachable");
    expect((await session.load()).civic).toEqual([]);
    expect(session.civicMaterialSpent()).toBe(before);

    // The same purchase on open ground goes through, so this is a refusal of the SPOT
    // rather than of civic buildings.
    const fine = await session.placeCivic(
      "campfire",
      HARMLESS_MOVE,
      civicTestPayment(10_000),
    );
    expect(fine.status).toBe("built");
    const load = await session.load();
    expect(load.civic).toHaveLength(1);
    expect(
      unreachableNodeIds(
        [...(load.placements ?? []), ...(load.civic ?? [])],
        BUILDABLE_RADIUS,
      ),
    ).toEqual([]);
  });

  it("moveCivic: a sealing relocation leaves the building where it was", async () => {
    // The fifth writer. A bought building can wall a neighbour in by being MOVED onto the
    // last gap exactly as by being bought onto it, so the relocation goes through the same
    // gate. Unlike `placeCivic` this write spends nothing, which is the second thing
    // asserted: a refused move must not quietly become a refunded or re-charged purchase.
    const { session } = await sessionWithRing();
    expect(footprintFor("civic:campfire:0")).toEqual(footprintFor(SEALING_NODE));
    const bought = await session.placeCivic(
      "campfire",
      HARMLESS_MOVE,
      civicTestPayment(10_000),
    );
    expect(bought.status).toBe("built");
    const id = bought.placementId as string;
    const spentAfterPurchase = session.civicMaterialSpent();

    await session.moveCivic(id, SEALING_MOVE);
    const after = (await session.load()).civic ?? [];
    expect(after.find((p) => p.nodeId === id)).toMatchObject(HARMLESS_MOVE);
    expect(
      unreachableNodeIds(
        [...((await session.load()).placements ?? []), ...after],
        BUILDABLE_RADIUS,
      ),
    ).toEqual([]);
    // A move is purely spatial in both directions: refused, it neither charges nor refunds.
    expect(session.civicMaterialSpent()).toBe(spentAfterPurchase);

    // And the same building relocates fine onto open ground, so this is a refusal of the
    // SPOT rather than of moving civic buildings at all — without which the assertions
    // above would also pass over a `moveCivic` that never moved anything. The destination
    // is SCANNED rather than authored, so this stays a statement about moving and not
    // about which corner of this era's island happens to be buildable.
    let landed: Transform | null = null;
    for (let col = -5; col <= 5 && landed === null; col += 1) {
      for (let row = -5; row <= 5; row += 1) {
        const candidate: Transform = { col, row, rot: 0 };
        if (col === HARMLESS_MOVE.col && row === HARMLESS_MOVE.row) {
          continue;
        }
        await session.moveCivic(id, candidate);
        const at = ((await session.load()).civic ?? []).find((p) => p.nodeId === id);
        if (at?.col === col && at?.row === row) {
          landed = candidate;
          break;
        }
      }
    }
    expect(landed, "some open cell accepts the relocation").not.toBeNull();
    expect(session.civicMaterialSpent()).toBe(spentAfterPurchase);
  });

  it("seedCivicBuildings: a sealing seat is not written, and inheritance is not an exemption", async () => {
    // The sixth writer, and the one the derived list above could not see until its filter
    // stopped depending on how a parameter's type is spelled. These buildings are INHERITED
    // rather than bought — the catch-up seeds each founded age's closing city — and nothing
    // about inheriting a building makes it less able to wall a neighbour in. So it goes through
    // the same `refuseLayoutWrite`, and a batch is filtered rather than rejected: the legal
    // seats land and the sealing one does not.
    const { session } = await sessionWithRing();
    expect(footprintFor("civic:campfire:0")).toEqual(footprintFor(SEALING_NODE));
    const before = session.civicMaterialSpent();

    const written = await session.seedCivicBuildings([
      { nodeId: "civic:campfire:0", ...SEALING_MOVE },
    ]);
    expect(written).toEqual([]);
    expect((await session.load()).civic ?? []).toEqual([]);

    // The same building on open ground is written, so this is a refusal of the SPOT rather
    // than of seeding — without which the assertion above would pass over a seeding that
    // never writes anything at all.
    const landed = await session.seedCivicBuildings([
      { nodeId: "civic:campfire:0", ...HARMLESS_MOVE },
      // …and the sealing seat in the SAME batch is still dropped, one seat at a time.
      { nodeId: "civic:campfire:1", ...SEALING_MOVE },
    ]);
    expect(landed).toEqual(["civic:campfire:0"]);
    const load = await session.load();
    expect(load.civic ?? []).toHaveLength(1);
    expect(
      unreachableNodeIds(
        [...(load.placements ?? []), ...(load.civic ?? [])],
        BUILDABLE_RADIUS,
      ),
    ).toEqual([]);
    // AND NOTHING WAS BOUGHT, in either direction: an inherited building is not a purchase, so
    // a seeding that touched the stockpile would be inventing a spend that never happened.
    expect(session.civicMaterialSpent()).toBe(before);

    // AN ID ALREADY STANDING IS REFUSED RATHER THAN MOVED. The ages are seeded one founding at a
    // time, so the same id arriving twice means a later age has minted over an earlier one — and
    // a write that took the second seat would silently RELOCATE a building the learner already
    // has instead of adding one. `moveCivic` is the way to move one, and it is not this.
    const standing = ((await session.load()).civic ?? [])[0];
    expect(standing).toBeDefined();
    // A spot that is genuinely LEGAL and genuinely free, found by scanning rather than authored,
    // so the refusal below is about the id and not about the geometry — which is the failure mode
    // that made the first version of this assertion pass with the check deleted.
    const elsewhere = await firstFreeCivicSpot(session, "civic:campfire:0");
    const again = await session.seedCivicBuildings([
      { nodeId: "civic:campfire:0", ...elsewhere },
    ]);
    expect(again).toEqual([]);
    expect(((await session.load()).civic ?? [])[0]).toEqual(standing);
    expect((await session.load()).civic ?? []).toHaveLength(1);
    // …and the same seat on a session that is NOT already holding that id is written, which is
    // what makes the refusal above a fact about the id.
    const fresh = createCityDevSession();
    await fresh.moveTownHall(HUB_PARKED);
    expect(
      await fresh.seedCivicBuildings([{ nodeId: "civic:campfire:0", ...elsewhere }]),
    ).toEqual(["civic:campfire:0"]);
  });

  it("moveTownHall: the hub is refused the same seal (D-TH9 is not an exemption)", async () => {
    const { session, load } = await sessionWithRing();
    const before = load.town_hall;
    expect(before).not.toBeNull();
    await session.moveTownHall({ col: -2, row: 1, rot: 0 });
    const after = await session.load();
    expect(after.town_hall).toEqual(before);
    // A relocation that seals nobody in still works, so the hall did not simply freeze.
    await session.moveTownHall({ col: -5, row: 1, rot: 0 });
    expect((await session.load()).town_hall).toMatchObject({ col: -5, row: 1 });
  });

  it("keeps a road out of the decision: paving does not license a seal", async () => {
    // The one way a road could leak into this rule is by being counted as a wall or as
    // a path. Neither: the sealing drop is refused with paving beside it, and the
    // harmless drop is allowed with paving beside it too.
    const { session } = await sessionWithRing();
    const lay = await session.layRoads([{ col: -3, row: 1 }], 1000);
    expect(lay.status).toBe("committed");
    await session.placeSkill(SEALING_NODE, SEALING_MOVE);
    expect((await layoutOf(session)).map((p) => p.nodeId)).not.toContain(SEALING_NODE);
    await session.placeSkill(SEALING_NODE, HARMLESS_MOVE);
    expect((await layoutOf(session)).map((p) => p.nodeId)).toContain(SEALING_NODE);
  });

  it("restores a saved layout as written, even one that violates the rule", async () => {
    // The named exception, and the reason `DEV_SESSION_SCHEMA_VERSION` is NOT bumped:
    // a restore must never silently relocate anyone's buildings. It is safe because the
    // rule is inherited-blind (above), so a legacy city is playable and repairable.
    const violating = [
      ...RING_WITHOUT_LAST,
      { nodeId: SEALING_NODE, ...SEALING_MOVE } satisfies PlacedTransform,
    ];
    const session = createCityDevSession({
      node_states: [],
      neighborhood_states: [],
      placements: violating,
      town_hall: { nodeId: TOWN_HALL_ID, ...HUB_PARKED },
    });
    const restored = await layoutOf(session);
    expect(restored).toHaveLength(violating.length);
    expect(unreachableNodeIds(restored, BUILDABLE_RADIUS)).toEqual([SEALED_IN]);
  });
});

/**
 * **THE RULE STILL HOLDS ON A BIGGER ISLAND — the interaction the disc change owes an answer
 * for, measured rather than argued.**
 *
 * A wider disc changes which cells are reachable, and it changes it in two ways at once: there
 * are more buildable cells, and the permanent walkable annulus every flood fill is seeded from
 * moves out with them. Neither is obviously safe. A disc that grew while the annulus stayed at
 * era one's would seed the fill INSIDE the settlement and read every layout as stranded; an
 * annulus that scaled with the disc rather than staying an absolute width would eventually hold
 * no whole cell at all and do the same.
 *
 * `ringLayout.test.ts` checks the catch-up's own layout this way. This is the other one that
 * ships: `defaultPlacements`, the greedy nearest-first pass behind the demo mock, the dev seeds
 * and the crisis seed. Both had their reachability proved on era one's disc only, because era
 * one's disc was the only one there was.
 */
describe("the reachability rule on the island each era is actually drawn on", () => {
  it("clears the greedy layout at every era's own disc, hub included", () => {
    // POPULATION: every era, derived, at the disc that era's drawn land carries. FLOOR: the
    // seated count is summed, so the sweep cannot pass over ten empty layouts.
    let seated = 0;
    for (const era of ERA_SEQUENCE) {
      const disc = eraBuildableDiscRadius(era.id);
      const hub: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -2, row: -1, rot: 0 };
      const placed = defaultPlacements([...cityRosterNodeIds(era.id)], [hub], disc);
      expect(unreachableNodeIds([hub, ...placed], disc), era.id).toEqual([]);
      seated += placed.length;
    }
    // Measured through the real layout, at the hub position this file parks it at rather than
    // at the centre — so it is two short of `eraCityLand.test.ts`'s 301, which is the same
    // sweep with the hub on the origin. Pinned so a layout that stopped seating cannot pass a
    // sweep whose only other assertion is that nobody is stranded, which an empty city clears.
    expect(seated).toBe(299);
  });

  it("keeps a whole ring of annulus to seed the walk from, at every era's disc", () => {
    // The property the fill depends on and the one a proportional margin would quietly break.
    // Counted through the shipped predicates rather than from the constant, so a
    // `walkableRadiusFor` that stopped being an absolute width fails here.
    for (const era of ERA_SEQUENCE) {
      const disc = eraBuildableDiscRadius(era.id);
      const reach = Math.ceil(walkableRadiusFor(disc) / GRID_CELL) + 2;
      let annulus = 0;
      for (let col = -reach; col <= reach; col += 1) {
        for (let row = -reach; row <= reach; row += 1) {
          if (isCellWalkable(col, row, disc) && !isCellBuildable(col, row, disc)) {
            annulus += 1;
          }
        }
      }
      expect(annulus, `${era.id} at disc ${disc}`).toBeGreaterThanOrEqual(8);
    }
  });

  it("STILL CATCHES a sealed building on a wide disc, so the sweep above is earned", () => {
    // THE INJECTION. "Nobody is stranded" is satisfied by a walk that returns `[]` forever, and
    // a walk seeded from an emptied annulus would do exactly that on the widest disc. So the
    // same wall that seals the hall on era one's disc is built on era six's and has to be seen.
    const disc = eraBuildableDiscRadius("renaissance");
    expect(disc).toBeGreaterThan(BUILDABLE_RADIUS);
    const hub: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
    const walled: PlacedTransform[] = [hub];
    let index = 0;
    for (let col = -2; col <= 3; col += 1) {
      for (let row = -2; row <= 3; row += 1) {
        if (col !== -2 && col !== 3 && row !== -2 && row !== 3) {
          continue;
        }
        walled.push({ nodeId: `NUM.3#${index}`, col, row, rot: 0 });
        index += 1;
      }
    }
    expect(unreachableNodeIds(walled, disc)).toContain(TOWN_HALL_ID);
  });
});
