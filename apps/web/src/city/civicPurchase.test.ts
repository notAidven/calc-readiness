import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { describe, expect, it } from "vitest";

import { type CityDevSession, createCityDevSession } from "./citySession";
import { civicPlacementId, civicTypeOf, isCivicPlacement } from "./civic";
import { civicTestPayment } from "./civicTestSupport";
import { TOWN_HALL_ID } from "./townHall";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  footprintFor,
  isCellBuildable,
  occupiedCells,
  type PlacedTransform,
  placementRefusal,
  type Transform,
  unreachableNodeIds,
} from "./worldLayout";

/**
 * **BUYING A CIVIC BUILDING — the purchase path, end to end through the real session.**
 *
 * Era one's catalogue was authored, priced and wired into both capacity models, and none
 * of that was reachable: there was no way to buy one. This file is the guard on the path
 * that changed it, and it is written against `createCityDevSession` itself rather than a
 * stub, so what it proves is a property of the code the app runs.
 *
 * ## What each block is evidence for
 *
 *  - **The spend**, and that it is ATOMIC in both directions: an affordable purchase
 *    places a building and records exactly the catalogue price; an unaffordable one
 *    leaves the island and the spend byte-for-byte unchanged.
 *  - **The reachability gate (D-ERA35)**. The rule landed the same day for `placeSkill`,
 *    `moveSkill` and `moveTownHall`, and a fourth layout write that went around it would
 *    have re-opened exactly the defect it closed. So the refusal is DEMONSTRATED, on a
 *    layout built here to seal a pocket, and demonstrated in BOTH directions: a civic
 *    building that would be walled in, and a civic building that would wall a skill
 *    building in.
 *  - **The footprint comes from the catalogue** (era one §3, frozen by INV-ERA-1 /
 *    D-ERA10), so a 2×1 Smokehouse occupies two cells and not the default four.
 *  - **Nothing about a purchase touches learning state** (INV-COS-1): no node state, no
 *    placement, no checkpoint.
 */

/** The catalogue price, read from the table so a reprice moves the test with it. */
function costOf(type: EraOneCivicTypeId): number {
  return ERA_ONE_CIVIC_TYPES[type].cost;
}

/** Enough stone to buy anything in the catalogue several times over. */
const RICH = 10_000;

/**
 * A LEGAL spot for the next civic building of a type, found the way the surface finds
 * one for the ghost (`findOpenCell` with the reachability predicate) rather than written
 * down as a cell.
 *
 * WHY NOT A LITERAL. Era one's island is a 22-unit DISC on a 4-unit grid, so whether a
 * cell is buildable depends on where its footprint's far corner lands — `{col: 4, row: 0}`
 * holds a 1×1 and refuses a 2×2. A hardcoded cell therefore tests the geometry of the
 * disc rather than the purchase path, and it fails for a reason that looks exactly like
 * the feature being broken. Every spot below is DERIVED, and the tests that are about a
 * refusal construct their illegality explicitly instead.
 */
async function openSpotFor(
  session: CityDevSession,
  type: EraOneCivicTypeId,
): Promise<Transform> {
  const load = await session.load();
  const others: PlacedTransform[] = [
    ...(load.placements ?? []),
    ...(load.town_hall ? [load.town_hall] : []),
    ...(load.civic ?? []),
  ];
  const nodeId = civicPlacementId(type, 0);
  const spot = findOpenCell(
    footprintFor(nodeId),
    occupiedCells(others),
    BUILDABLE_RADIUS,
    0,
    {
      nodeId,
      others,
    },
  );
  if (!spot) {
    throw new Error(`the island has no legal spot left for a ${type}`);
  }
  return spot;
}

describe("placeCivic — the spend", () => {
  it("places the building and records exactly the catalogue price", async () => {
    const session = createCityDevSession();
    const spot = await openSpotFor(session, "longhouse");
    const result = await session.placeCivic("longhouse", spot, civicTestPayment(RICH));

    expect(result.status).toBe("built");
    expect(result.cost).toBe(costOf("longhouse"));
    expect(result.placementId).not.toBeNull();
    expect(isCivicPlacement(result.placementId ?? "")).toBe(true);
    expect(civicTypeOf(result.placementId ?? "")).toBe("longhouse");

    const load = await session.load();
    expect(load.civic).toHaveLength(1);
    expect(load.civic?.[0]).toMatchObject({
      nodeId: result.placementId,
      col: spot.col,
      row: spot.row,
      rot: spot.rot,
    });
    expect(session.civicMaterialSpent()).toBe(0);
    expect(load.civic_material_spent).toBe(0);
  });

  it("buys the same type repeatedly, each on its own plot and its own id", async () => {
    // Era one §0: buildable "as many times as you can afford". Two of a type must be two
    // buildings, which is the whole reason a placement carries a sequence number.
    const session = createCityDevSession();
    const first = await session.placeCivic(
      "campfire",
      await openSpotFor(session, "campfire"),
      civicTestPayment(RICH),
    );
    const second = await session.placeCivic(
      "campfire",
      await openSpotFor(session, "campfire"),
      civicTestPayment(RICH),
    );

    expect(first.status).toBe("built");
    expect(second.status).toBe("built");
    expect(second.placementId).not.toBe(first.placementId);
    const load = await session.load();
    expect(load.civic).toHaveLength(2);
    expect(new Set((load.civic ?? []).map((p) => p.nodeId)).size).toBe(2);
    expect(session.civicMaterialSpent()).toBe(0);
  });

  it("refuses an unaffordable purchase and spends NOTHING", async () => {
    const session = createCityDevSession();
    const cost = costOf("water_spring");
    // The spot is LEGAL, so the only thing under test is affordability — otherwise a
    // refusal here would be indistinguishable from a bad cell.
    const spot = await openSpotFor(session, "water_spring");
    const result = await session.placeCivic(
      "water_spring",
      spot,
      civicTestPayment(cost - 1),
    );

    expect(result.status).toBe("insufficient_material");
    expect(result.cost).toBe(cost);
    expect(result.placementId).toBeNull();
    const load = await session.load();
    expect(load.civic).toEqual([]);
    expect(session.civicMaterialSpent()).toBe(0);
  });

  it("buys at EXACTLY the price — the boundary, so the check is not off by one", async () => {
    const session = createCityDevSession();
    const cost = costOf("smokehouse");
    const spot = await openSpotFor(session, "smokehouse");
    expect(
      (await session.placeCivic("smokehouse", spot, civicTestPayment(cost))).status,
    ).toBe("built");
    expect(session.civicMaterialSpent()).toBe(0);
  });

  it("prices every row from the catalogue, all four of them", async () => {
    // Derived from the table rather than a written-down list, and floored, so a fifth
    // type (or a reprice) is covered without this test being edited.
    const ids = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];
    expect(ids.length).toBeGreaterThanOrEqual(4);
    for (const id of ids) {
      const session = createCityDevSession();
      const spot = await openSpotFor(session, id);
      // Affordability is checked BEFORE the placement gate, so a legal spot with an
      // empty stockpile isolates the price.
      const attempt = await session.placeCivic(id, spot, civicTestPayment(0));
      expect(attempt.status, id).toBe("insufficient_material");
      expect(attempt.cost, id).toBe(costOf(id));
      expect(attempt.cost, id).toBeGreaterThan(0);
      // …and the same spot with money buys it, so the price is the only thing that
      // refused it.
      expect((await session.placeCivic(id, spot, civicTestPayment(RICH))).status, id).toBe(
        "built",
      );
    }
  });
});

/**
 * Four skill buildings that between them occupy all four orthogonal neighbours of the
 * cell `(col, row)` and nothing else of it, so that cell becomes a sealed 1×1 pocket.
 *
 * The shapes are chosen so the four footprints DO NOT OVERLAP each other, which the
 * obvious four-2×2 arrangement does at the diagonals: `NUM.3` is the island's 1×1 and
 * `NUM.4` its 1×2, and those are what fit the two tight sides. Era one's footprints are
 * frozen (INV-ERA-1 / D-ERA10), so this arrangement cannot silently stop working.
 */
function wallsAround(col: number, row: number): PlacedTransform[] {
  return [
    { nodeId: "NUM.2", col: col - 2, row: row - 1, rot: 0 }, // 2×2, covers west
    { nodeId: "NUM.5", col: col + 1, row, rot: 0 }, // 2×2, covers east
    { nodeId: "NUM.3", col, row: row - 1, rot: 0 }, // 1×1, covers north
    { nodeId: "NUM.4", col, row: row + 1, rot: 0 }, // 1×2, covers south
  ];
}

describe("placeCivic — the placement gate is the SAME gate (D-ERA35)", () => {
  it("refuses a placement off the island, and spends nothing", async () => {
    const session = createCityDevSession();
    const result = await session.placeCivic(
      "longhouse",
      { col: 900, row: 900, rot: 0 },
      civicTestPayment(RICH),
    );
    expect(result.status).toBe("refused");
    expect(result.refusal).toBe("bounds");
    expect((await session.load()).civic).toEqual([]);
    expect(session.civicMaterialSpent()).toBe(0);
  });

  it("refuses a placement overlapping the pre-seeded hub, and spends nothing", async () => {
    const session = createCityDevSession();
    const hall = (await session.load()).town_hall as PlacedTransform;
    const result = await session.placeCivic(
      "longhouse",
      { col: hall.col, row: hall.row, rot: 0 },
      civicTestPayment(RICH),
    );
    expect(result.status).toBe("refused");
    expect(result.refusal).toBe("overlap");
    expect((await session.load()).civic).toEqual([]);
    expect(session.civicMaterialSpent()).toBe(0);
  });

  /**
   * THE REACHABILITY REFUSAL, on a layout built to make it possible.
   *
   * A 1×1 hole is walled on all four sides by 2×2 skill buildings, so the only cell the
   * Water Spring could take is one nobody could then walk up to. This is the case
   * `placementRefusal` exists for and it is checked over the WHOLE hypothetical set —
   * the naive version, validating only the candidate's own footprint, misses it.
   *
   * The FIXTURE IS VERIFIED FIRST: the pocket really is sealed and the four walls
   * really are all reachable without it, so a refusal here is the rule firing and not
   * the fixture being broken in some other way.
   */
  it("refuses a purchase that would leave the building unreachable on foot", async () => {
    const session = createCityDevSession();
    const hall = (await session.load()).town_hall as PlacedTransform;

    // The pocket: a single cell walled on all four sides. Its position is SEARCHED for
    // rather than written down, because the buildable area is a disc on a grid and the
    // hub already sits in the middle of it — the one arrangement that works is not
    // guessable, and a guess that misses fails looking exactly like a broken feature.
    // The search asks the shipped rule the same question the test then asks the session.
    const pocket = (() => {
      for (let col = -6; col <= 6; col += 1) {
        for (let row = -6; row <= 6; row += 1) {
          if (!isCellBuildable(col, row, BUILDABLE_RADIUS)) {
            continue;
          }
          const walls = wallsAround(col, row);
          const others = [hall, ...walls];
          // Every wall has to be legal in its own right, including against the hub…
          const legal = walls.every(
            (wall, index) =>
              placementRefusal({
                candidate: wall,
                others: [hall, ...walls.slice(0, index)],
                blockedCells: occupiedCells([hall, ...walls.slice(0, index)]),

                buildableRadius: BUILDABLE_RADIUS,
              }) === null,
          );
          // …the pocket has to be genuinely OPEN, and nothing may be stranded before the
          // purchase, or the refusal would be about an inherited defect (which
          // `placementRefusal` deliberately does not hold against a move).
          const spring: PlacedTransform = {
            nodeId: "civic:water_spring:0",
            col,
            row,
            rot: 0,
          };
          if (
            legal &&
            !occupiedCells(others).has(`${col},${row}`) &&
            unreachableNodeIds(others, BUILDABLE_RADIUS).length === 0 &&
            unreachableNodeIds([...others, spring], BUILDABLE_RADIUS).includes(
              spring.nodeId,
            )
          ) {
            return { col, row, walls };
          }
        }
      }
      return null;
    })();
    expect(pocket, "a sealable pocket exists on era one's island").not.toBeNull();
    const { col, row, walls } = pocket as NonNullable<typeof pocket>;

    for (const wall of walls) {
      await session.placeSkill(wall.nodeId, wall);
    }
    const placed = (await session.load()).placements ?? [];
    expect(placed, "the four walls all went down").toHaveLength(walls.length);
    // Restated against the SESSION's own state rather than the search's: the pocket is
    // open, nothing is stranded yet, and dropping a building in strands it.
    expect(occupiedCells([...placed, hall]).has(`${col},${row}`)).toBe(false);
    expect(unreachableNodeIds([...placed, hall], BUILDABLE_RADIUS)).toEqual([]);
    expect(
      unreachableNodeIds(
        [...placed, hall, { nodeId: "civic:water_spring:0", col, row, rot: 0 }],
        BUILDABLE_RADIUS,
      ),
    ).toContain("civic:water_spring:0");

    // THE ASSERTION. The purchase is affordable and the cell is empty and in bounds; the
    // only thing wrong with it is that nobody could walk up to what it would build.
    const result = await session.placeCivic(
      "water_spring",
      { col, row, rot: 0 },
      civicTestPayment(RICH),
    );
    expect(result.status).toBe("refused");
    expect(result.refusal).toBe("unreachable");
    expect((await session.load()).civic).toEqual([]);
    expect(session.civicMaterialSpent()).toBe(0);

    // And the SAME building, same session, same stockpile, on ground with a way in: so
    // the refusal above is the rule and not a civic building being unbuyable.
    const fine = await session.placeCivic(
      "water_spring",
      await openSpotFor(session, "water_spring"),
      civicTestPayment(RICH),
    );
    expect(fine.status).toBe("built");
  });

  it("refuses a SKILL placement that would wall a bought building in", async () => {
    // The other direction, and the one that would be missed if civic buildings were only
    // in the overlap set and not in the reachability walk: the thing sealed off is the
    // purchase, and the placement doing the sealing is a skill building.
    const session = createCityDevSession();
    const hall = (await session.load()).town_hall as PlacedTransform;

    const arrangement = (() => {
      for (let col = -6; col <= 6; col += 1) {
        for (let row = -6; row <= 6; row += 1) {
          if (!isCellBuildable(col, row, BUILDABLE_RADIUS)) {
            continue;
          }
          // A 1×1 Water Spring boxed in by three 2×2 skill buildings, with the fourth
          // side being the one the player is about to close.
          const spring: PlacedTransform = {
            nodeId: "civic:water_spring:0",
            col,
            row,
            rot: 0,
          };
          const all = wallsAround(col, row);
          const three = all.slice(0, 3);
          const closer = all[3] as PlacedTransform;
          const before = [hall, ...three, spring];
          const legal = [...three, spring].every(
            (candidate, index) =>
              placementRefusal({
                candidate,
                others: [hall, ...three.slice(0, index)],
                blockedCells: occupiedCells([hall, ...three.slice(0, index)]),

                buildableRadius: BUILDABLE_RADIUS,
              }) === null,
          );
          if (
            legal &&
            unreachableNodeIds(before, BUILDABLE_RADIUS).length === 0 &&
            unreachableNodeIds([...before, closer], BUILDABLE_RADIUS).includes(
              spring.nodeId,
            )
          ) {
            return { spring, three, closer };
          }
        }
      }
      return null;
    })();
    expect(arrangement, "an arrangement that boxes a purchase in exists").not.toBeNull();
    const { spring, three, closer } = arrangement as NonNullable<typeof arrangement>;

    for (const wall of three) {
      await session.placeSkill(wall.nodeId, wall);
    }
    const bought = await session.placeCivic(
      "water_spring",
      { col: spring.col, row: spring.row, rot: 0 },
      civicTestPayment(RICH),
    );
    expect(bought.status).toBe("built");

    // The skill placement that would close the last side is refused — because the bought
    // building is in `others`, which is what `readOccupants` puts it there for.
    await session.placeSkill(closer.nodeId, closer);
    const after = await session.load();
    expect(after.placements?.map((p) => p.nodeId)).not.toContain(closer.nodeId);
    expect(after.placements).toHaveLength(three.length);
    // The purchase is still standing and still paid for.
    expect(after.civic).toHaveLength(1);
    expect(session.civicMaterialSpent()).toBe(0);
  });

  it("is an OCCUPANT: a bought building blocks a later skill placement", async () => {
    const session = createCityDevSession();
    const at = await openSpotFor(session, "longhouse");
    expect((await session.placeCivic("longhouse", at, civicTestPayment(RICH))).status).toBe(
      "built",
    );

    // A skill dropped on the Longhouse's cells is refused, exactly as it would be on
    // another skill building or the hub — a civic building is not invisible to placement.
    await session.placeSkill("NUM.3", at);
    expect((await session.load()).placements).toEqual([]);

    // …and the same skill lands elsewhere, so what refused it was the Longhouse.
    const elsewhere = await openSpotFor(session, "smokehouse");
    await session.placeSkill("NUM.3", elsewhere);
    expect((await session.load()).placements).toHaveLength(1);

    const civic = ((await session.load()).civic ?? [])[0] as PlacedTransform;
    expect(occupiedCells([civic]).size).toBe(
      ERA_ONE_CIVIC_TYPES.longhouse.footprint[0] *
        ERA_ONE_CIVIC_TYPES.longhouse.footprint[1],
    );
  });

  it("sizes the ghost from the CATALOGUE footprint, not the default 2x2", async () => {
    // Era one §3 gives the Smokehouse 2×1 and the Water Spring 1×1; `footprintFor`'s
    // fallback is 2×2, so a civic id that fell through to it would silently claim
    // ground the catalogue never gave it — and D-ERA10 freezes these figures, so there
    // is no version of this where the fallback is close enough.
    const ids = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];
    expect(ids.length).toBeGreaterThanOrEqual(4);
    for (const id of ids) {
      const [w, d] = ERA_ONE_CIVIC_TYPES[id].footprint;
      expect(footprintFor(`civic:${id}:0`), id).toEqual({ w, d });
    }
    // At least one row must differ from the default, or the assertion above holds for the
    // wrong reason.
    expect(
      ids.filter((id) => {
        const [w, d] = ERA_ONE_CIVIC_TYPES[id].footprint;
        return w !== 2 || d !== 2;
      }).length,
    ).toBeGreaterThanOrEqual(2);

    // And it reaches the real occupancy: a 2×1 Smokehouse takes two cells.
    const session = createCityDevSession();
    const built = await session.placeCivic(
      "smokehouse",
      await openSpotFor(session, "smokehouse"),
      civicTestPayment(RICH),
    );
    const civic = ((await session.load()).civic ?? [])[0] as PlacedTransform;
    expect(built.status).toBe("built");
    expect(occupiedCells([civic]).size).toBe(2);
  });
});

describe("placeCivic — what it must NOT touch", () => {
  it("changes no learning state at all (INV-COS-1)", async () => {
    const session = createCityDevSession();
    const before = await session.load();
    await session.placeCivic(
      "campfire",
      await openSpotFor(session, "campfire"),
      civicTestPayment(RICH),
    );
    const after = await session.load();

    expect(after.node_states).toEqual(before.node_states);
    expect(after.neighborhood_state).toEqual(before.neighborhood_state);
    expect(after.placements).toEqual(before.placements);
    expect(after.town_hall).toEqual(before.town_hall);
    // Floor: the comparison ran over a real node set rather than two empty arrays.
    expect(before.node_states.length).toBeGreaterThanOrEqual(6);
  });

  it("does not touch the gold sink, and roads do not touch the material one", async () => {
    const session = createCityDevSession();
    await session.placeCivic(
      "campfire",
      await openSpotFor(session, "campfire"),
      civicTestPayment(RICH),
    );
    expect(session.roadGoldSpent()).toBe(0);

    // A road cell derived the same way, for the same disc-geometry reason.
    const roadCell = findOpenCell(
      { w: 1, d: 1 },
      occupiedCells([
        ...((await session.load()).civic ?? []),
        ...((await session.load()).town_hall
          ? [(await session.load()).town_hall as PlacedTransform]
          : []),
      ]),
      BUILDABLE_RADIUS,
    );
    await session.layRoads([{ col: roadCell?.col ?? 0, row: roadCell?.row ?? 0 }], 10_000);
    expect(session.roadGoldSpent()).toBeGreaterThan(0);
    expect(session.civicMaterialSpent()).toBe(0);
  });

  it("clears on a fresh diagnostic seed, buildings and spend together", async () => {
    const session = createCityDevSession();
    await session.placeCivic(
      "longhouse",
      await openSpotFor(session, "longhouse"),
      civicTestPayment(RICH),
    );
    session.seedFromPlacement({}, []);
    const load = await session.load();
    expect(load.civic).toEqual([]);
    expect(load.civic_material_spent).toBe(0);
    // A fresh island keeps its hub (the pre-seed) and loses everything bought.
    expect(load.town_hall?.nodeId).toBe(TOWN_HALL_ID);
  });

  it("restores from a snapshot with its spend, so a refresh is not a refund", async () => {
    const session = createCityDevSession();
    await session.placeCivic(
      "longhouse",
      await openSpotFor(session, "longhouse"),
      civicTestPayment(RICH),
    );
    await session.placeCivic(
      "campfire",
      await openSpotFor(session, "campfire"),
      civicTestPayment(RICH),
    );
    const saved = await session.load();

    const restored = createCityDevSession({
      node_states: saved.node_states,
      neighborhood_states: [],
      placements: saved.placements ?? [],
      roads: saved.roads,
      road_gold_spent: saved.road_gold_spent,
      town_hall: saved.town_hall,
      civic: saved.civic,
      civic_material_spent: saved.civic_material_spent,
    });
    const reloaded = await restored.load();

    expect(reloaded.civic).toEqual(saved.civic);
    expect(restored.civicMaterialSpent()).toBe(0);
    // The ids survive, so the next purchase cannot mint one that collides with them.
    const next = await restored.placeCivic(
      "smokehouse",
      await openSpotFor(restored, "smokehouse"),
      civicTestPayment(RICH),
    );
    expect(next.status).toBe("built");
    expect((await restored.load()).civic).toHaveLength(3);
    expect(new Set(((await restored.load()).civic ?? []).map((p) => p.nodeId)).size).toBe(
      3,
    );
  });

  it("drops a restored building whose type the catalogue no longer authors", async () => {
    // The safe direction: a stale id must not be resolved to some OTHER row of the
    // catalogue, because a silently re-typed building would contribute the wrong
    // capacities forever.
    const session = createCityDevSession(
      {
        node_states: [],
        neighborhood_states: [],
        placements: [],
        civic: [
          { nodeId: "civic:hearth_circle:0", col: 2, row: 2, rot: 0 },
          { nodeId: "civic:campfire:1", col: 0, row: 2, rot: 0 },
        ],
        civic_material_spent: 200,
      },
      undefined,
    );
    const load = await session.load();
    expect(load.civic?.map((p) => p.nodeId)).toEqual(["civic:campfire:1"]);
    expect(session.civicMaterialSpent()).toBe(200);
  });
});
