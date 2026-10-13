import { MAX_VEHICLES, VEHICLES_PER_ROAD_TILES, WALK_SPEED_UNITS_PER_SEC } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it, vi } from "vitest";

import {
  ERA_VEHICLES,
  hasAuthoredVehicle,
  VEHICLE_SPEED_CEILING,
  vehicleForEra,
} from "./eraVehicles";
import { roadSurfacing } from "./roadSurfacing";
import { type RoadCell, roadCellKey } from "./roads";
import {
  cellUnder,
  MIN_VEHICLE_SEPARATION,
  planVehicles,
  roadRuns,
  type VehiclePlan,
  vehicleBudget,
  vehiclePose,
} from "./vehicleRoutes";
import { GRID_CELL } from "./worldLayout";

/**
 * **THE SIX RULES OF §4.4, MEASURED RATHER THAN ASSERTED**, plus the one property the
 * whole item is for: a vehicle is on a road, always, and there is no vehicle where there
 * is no road.
 *
 * Every case here was run RED before it was run green, by injecting the defect it is
 * written against — the road-only walk allowed to step onto bare ground, the budget
 * allowed a second vehicle per run, the pose given an easing curve, the era table given a
 * fallback. A test written green may be asserting nothing.
 */

const ERA_ONE: EraId = ERA_SEQUENCE[0]?.id as EraId;
const FORM = vehicleForEra(ERA_ONE);

function cells(...pairs: readonly (readonly [number, number])[]): RoadCell[] {
  return pairs.map(([col, row]) => ({ col, row }));
}

/** A straight east-west run of `n` tiles along row 0, starting at col 0. */
function straight(n: number): RoadCell[] {
  return Array.from({ length: n }, (_, i) => ({ col: i, row: 0 }));
}

function form(): NonNullable<typeof FORM> {
  if (FORM === null) {
    throw new Error("era one has no authored vehicle, so nothing below can be measured");
  }
  return FORM;
}

/** Sample a plan's pose across several whole out-and-back cycles. */
function samplePoses(plan: VehiclePlan, steps = 600) {
  const cycleSeconds = (2 * plan.length) / plan.form.speedUnitsPerSec;
  return Array.from({ length: steps }, (_, i) => {
    const seconds = (i / steps) * cycleSeconds * 2.5;
    return { seconds, pose: vehiclePose(plan, seconds) };
  });
}

describe("the road-only walk: a vehicle is on a road, and nowhere else", () => {
  it("puts every sampled position of every vehicle inside a cell that carries a road", () => {
    // A network with a bend, a T and a dead end, so the walk has corners to get wrong.
    const network = cells(
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 2],
      [4, 2],
      [2, 3],
      [1, 3],
    );
    const laid = new Set(network.map((cell) => roadCellKey(cell.col, cell.row)));
    const plans = planVehicles(network, form());
    expect(plans.length, "the fixture has to produce a vehicle at all").toBeGreaterThan(0);

    let sampled = 0;
    for (const plan of plans) {
      for (const { pose } of samplePoses(plan)) {
        const under = cellUnder(pose);
        expect(
          laid.has(roadCellKey(under.col, under.row)),
          `a ${plan.form.label} left the road at (${under.col}, ${under.row})`,
        ).toBe(true);
        sampled += 1;
      }
    }
    // The floor. "Every sampled position was on a road" is satisfied by sampling nothing,
    // which is exactly how a guard in this repository has gone green over an empty
    // population before.
    expect(sampled).toBeGreaterThan(500);
  });

  it("only ever travels cells the road set actually holds", () => {
    const network = cells([0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]);
    const laid = new Set(network.map((cell) => roadCellKey(cell.col, cell.row)));
    for (const run of roadRuns(network)) {
      for (const cell of run.cells) {
        expect(laid.has(roadCellKey(cell.col, cell.row))).toBe(true);
      }
    }
    // ...and the run is a WALK: every cell four-neighbours the next, so the polyline
    // between two consecutive centres is one cell long and cannot cut a corner across
    // ground nobody paved.
    for (const run of roadRuns(network)) {
      for (let i = 1; i < run.cells.length; i += 1) {
        const a = run.cells[i - 1] as RoadCell;
        const b = run.cells[i] as RoadCell;
        expect(Math.abs(a.col - b.col) + Math.abs(a.row - b.row)).toBe(1);
      }
    }
    expect(roadRuns(network)[0]?.cells.length).toBeGreaterThanOrEqual(4);
  });

  it("takes the LONGEST walk through a component, not the first one it finds", () => {
    // AN L WHOSE CORNER IS THE CANONICALLY FIRST CELL, which is the fixture that tells the
    // two searches apart. A single sweep from `(0, 0)` reaches the end of the longer arm and
    // reconstructs SIX of the ten cells; the second sweep, from that end, finds the far end
    // of the other arm and gets all ten. A straight road cannot show this, because its first
    // cell is already an endpoint and one sweep is enough — which is exactly how a test can
    // pass over a walk that only ever covers half the road.
    const corner = [
      { col: 0, row: 0 },
      ...[1, 2, 3, 4].map((col) => ({ col, row: 0 })),
      ...[1, 2, 3, 4, 5].map((row) => ({ col: 0, row })),
    ];
    const runs = roadRuns(corner);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.cells).toHaveLength(10);
    // ...and the run really does turn the corner rather than run down one arm.
    const cols = new Set(runs[0]?.cells.map((cell) => cell.col));
    const rows = new Set(runs[0]?.cells.map((cell) => cell.row));
    expect(cols.size).toBeGreaterThan(1);
    expect(rows.size).toBeGreaterThan(1);

    // And a one-cell stub off a long spine does not shorten the walk either.
    const spine = roadRuns([...straight(8), { col: 3, row: 1 }]);
    expect(spine).toHaveLength(1);
    expect(spine[0]?.cells).toHaveLength(8);
  });

  it("gives an island with no road on it no vehicle at all, which is not a gate", () => {
    expect(planVehicles([], form())).toEqual([]);
    expect(roadRuns([])).toEqual([]);
    // D-CIT7 is about citizens, who have to get somewhere. A vehicle is the visible
    // consequence of a spend, so no spend means nothing to see and no learner is affected.
    // The control: the same call over a paved network does produce one.
    expect(planVehicles(straight(VEHICLES_PER_ROAD_TILES), form()).length).toBe(1);
  });

  it("refuses a lone tile a vehicle, because a vehicle that stops is against R1", () => {
    const lone = cells([0, 0]);
    expect(roadRuns(lone)).toHaveLength(1);
    expect(roadRuns(lone)[0]?.cells).toHaveLength(1);
    // Budget is zero at one tile anyway, so pad the network with a second, DISCONNECTED
    // run long enough to earn the budget. The lone tile still gets nothing.
    const padded = [...lone, ...straight(8).map((c) => ({ col: c.col + 4, row: 6 }))];
    const plans = planVehicles(padded, form());
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.cells.length).toBeGreaterThanOrEqual(2);
      expect(plan.length).toBeGreaterThanOrEqual(GRID_CELL);
    }
  });
});

describe("how many, and R2: never two on one run", () => {
  it("buys one vehicle per VEHICLES_PER_ROAD_TILES tiles, capped at MAX_VEHICLES", () => {
    expect(vehicleBudget(0)).toBe(0);
    expect(vehicleBudget(VEHICLES_PER_ROAD_TILES - 1)).toBe(0);
    expect(vehicleBudget(VEHICLES_PER_ROAD_TILES)).toBe(1);
    expect(vehicleBudget(VEHICLES_PER_ROAD_TILES * 3)).toBe(3);
    expect(vehicleBudget(VEHICLES_PER_ROAD_TILES * MAX_VEHICLES)).toBe(MAX_VEHICLES);
    expect(vehicleBudget(VEHICLES_PER_ROAD_TILES * MAX_VEHICLES * 4)).toBe(MAX_VEHICLES);
    // The divisor is the number that decides whether the player ever sees one, so it is
    // held to the value §4.5's arithmetic recommends rather than left to drift back to 8.
    expect(VEHICLES_PER_ROAD_TILES).toBe(4);
  });

  it("spends the budget across runs, one each, and never puts two on the same run", () => {
    // Four separate four-tile roads: budget 4, runs 4, so all four are spent and each
    // lands on its own. The interesting half is that they are DIFFERENT runs.
    const network = [0, 1, 2, 3].flatMap((i) =>
      straight(4).map((cell) => ({ col: cell.col, row: cell.row + i * 2 })),
    );
    const plans = planVehicles(network, form());
    expect(plans).toHaveLength(4);
    // The floor, and it is what stops this passing on a tree with one vehicle in it:
    // there are several vehicles, and the run ids are all distinct.
    expect(plans.length).toBeGreaterThanOrEqual(2);
    expect(new Set(plans.map((plan) => plan.runId)).size).toBe(plans.length);
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(plans.length);
  });

  it("holds ONE vehicle on a single long road rather than a convoy on it", () => {
    // 24 tiles in one component earns a budget of six and gets one, because six on one
    // out-and-back run is either a queue moving in lockstep or six vehicles passing each
    // other head-on, and R2 refuses the first while the second cannot be separated at all.
    const network = straight(24);
    expect(vehicleBudget(network.length)).toBe(MAX_VEHICLES);
    const plans = planVehicles(network, form());
    expect(plans).toHaveLength(1);
    expect(plans[0]?.cells).toHaveLength(24);
  });

  it("keeps two vehicles on one run further apart than R2 allows, vacuously and by construction", () => {
    // The letter of R2, over a network built to earn six vehicles across six runs. Any two
    // that share a run would have to be within reach of each other at some `t`; none do,
    // because none share a run. Stated as a measurement anyway, with the count floor that
    // makes it non-empty.
    const network = [0, 1, 2, 3, 4, 5].flatMap((i) =>
      straight(4).map((cell) => ({ col: cell.col, row: cell.row + i * 2 })),
    );
    const plans = planVehicles(network, form());
    expect(plans).toHaveLength(MAX_VEHICLES);
    const byRun = new Map<string, VehiclePlan[]>();
    for (const plan of plans) {
      byRun.set(plan.runId, [...(byRun.get(plan.runId) ?? []), plan]);
    }
    expect(byRun.size).toBe(plans.length);
    for (const shared of byRun.values()) {
      for (let t = 0; t < 40; t += 0.25) {
        for (let i = 0; i < shared.length; i += 1) {
          for (let j = i + 1; j < shared.length; j += 1) {
            const a = vehiclePose(shared[i] as VehiclePlan, t);
            const b = vehiclePose(shared[j] as VehiclePlan, t);
            expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(
              MIN_VEHICLE_SEPARATION,
            );
          }
        }
      }
    }
    expect(MIN_VEHICLE_SEPARATION).toBe(3 * GRID_CELL);
  });
});

describe("R1: constant velocity, and no state machine anywhere", () => {
  it("covers the same distance in every equal slice of time", () => {
    const plan = planVehicles(straight(12), form())[0] as VehiclePlan;
    const speed = plan.form.speedUnitsPerSec;
    const step = 0.05;
    let measured = 0;
    let reversals = 0;
    let previous = vehiclePose(plan, 0);
    for (let t = step; t < 120; t += step) {
      const next = vehiclePose(plan, t);
      const moved = Math.hypot(next.x - previous.x, next.z - previous.z);
      // Every step is either a full step of travel or one of the two instants per cycle
      // where the sign flips at a dead end. Nothing in between, which is what rules out an
      // ease-in, a brake, a wait and a queue all at once.
      if (Math.abs(moved - speed * step) > 1e-9) {
        reversals += 1;
        expect(moved).toBeLessThan(speed * step);
      } else {
        measured += 1;
      }
      previous = next;
    }
    expect(measured).toBeGreaterThan(2000);
    // A handful of turns over 120 seconds, not a vehicle that keeps changing its mind.
    expect(reversals).toBeLessThan(10);
  });

  it("never travels faster than a citizen walks, for every form in the table", () => {
    // THE MOTION RULE (§4.3), as one inequality over the whole table rather than ten
    // arguments. The floor stops it holding over an empty table.
    const forms = Object.values(ERA_VEHICLES);
    expect(forms.length).toBeGreaterThanOrEqual(1);
    for (const entry of forms) {
      expect(entry?.speedUnitsPerSec).toBeLessThanOrEqual(WALK_SPEED_UNITS_PER_SEC);
      // ...and nothing is so slow it reads as stuck.
      expect(entry?.speedUnitsPerSec).toBeGreaterThanOrEqual(1.0);
    }
    expect(VEHICLE_SPEED_CEILING).toBe(WALK_SPEED_UNITS_PER_SEC);
  });

  it("faces the way it is going, and turns round at the end rather than vanishing", () => {
    const plan = planVehicles(straight(6), form())[0] as VehiclePlan;
    const headings = new Set(
      samplePoses(plan, 400).map(({ pose }) => pose.headingY.toFixed(3)),
    );
    // A straight east-west run has exactly two headings: out, and back.
    expect(headings.size).toBe(2);
    // And it is present at every sampled instant: an out-and-back never removes itself.
    for (const { pose } of samplePoses(plan, 200)) {
      expect(Number.isFinite(pose.x)).toBe(true);
      expect(Number.isFinite(pose.z)).toBe(true);
      expect(pose.distance).toBeGreaterThanOrEqual(0);
      expect(pose.distance).toBeLessThanOrEqual(plan.length + 1e-9);
    }
  });
});

describe("R4: nothing keys off the learner", () => {
  it("does not read the clock, so an hour later is the same traffic", () => {
    // Deriving twice back to back would not prove it: both calls land in the same
    // millisecond. Moving the clock an hour between them is what makes it falsifiable —
    // the same widening `citizens-roster-invariants.test.ts` applies to the roster.
    const network = cells([0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [4, 1], [5, 1]);
    const clock = vi.spyOn(Date, "now");
    try {
      clock.mockReturnValue(1_700_000_000_000);
      const first = planVehicles(network, form());
      clock.mockReturnValue(1_700_003_600_000);
      const second = planVehicles(network, form());
      expect(second).toEqual(first);
    } finally {
      clock.mockRestore();
    }
  });

  it("returns the identical plan for the identical road set, in any order", () => {
    const network = cells([2, 0], [0, 0], [3, 1], [1, 0], [3, 0], [4, 1]);
    const shuffled = [...network].reverse();
    expect(planVehicles(shuffled, form())).toEqual(planVehicles(network, form()));
    // Duplicates in the road set do not buy a vehicle either: the budget counts DISTINCT
    // tiles, so paving the same cell twice cannot conjure traffic.
    const doubled = [...network, ...network];
    expect(planVehicles(doubled, form())).toEqual(planVehicles(network, form()));
  });

  it("changes only when the roads or the era do", () => {
    const four = straight(4);
    expect(planVehicles(four, form())).toHaveLength(1);
    // Laying tiles may add a vehicle and removing them may take one away, because the
    // player did that. That is the only permitted input.
    expect(planVehicles(four.slice(0, 3), form())).toHaveLength(0);
    expect(planVehicles(four, null)).toHaveLength(0);
  });
});

describe("the era table: one row, and nine absences that are load-bearing", () => {
  it("authors era one and no other era, in both directions", () => {
    // A CENSUS over `ERA_SEQUENCE`, so this fails whichever way the table and the ten eras
    // come apart: an era that quietly gains a vehicle before its guide is ratified fails
    // here, and era one losing its row fails here too.
    const authored = ERA_SEQUENCE.filter((era) => hasAuthoredVehicle(era.id)).map(
      (era) => era.id,
    );
    expect(authored).toEqual([ERA_ONE]);
    expect(ERA_SEQUENCE.length).toBe(10);
    expect(Object.keys(ERA_VEHICLES)).toHaveLength(1);
    for (const era of ERA_SEQUENCE) {
      const resolved = vehicleForEra(era.id);
      if (era.id === ERA_ONE) {
        expect(resolved, "era one is the era a learner is actually in").not.toBeNull();
      } else {
        // NOT a fallback, and this is the difference from every other per-era table in the
        // city: era one's sled hauled across era eight's asphalt is the same defect as a
        // car on era one's earth path, and the empty answer avoids both.
        expect(resolved, `${era.id} must not borrow a neighbour's vehicle`).toBeNull();
      }
      expect(planVehicles(straight(12), resolved)).toHaveLength(era.id === ERA_ONE ? 1 : 0);
    }
  });

  it("keeps era one's sled inside the road it wears", () => {
    // §4.2 sizes era one's body against its TREAD, not its verge, because a dragged thing
    // sits in the track it made. Derived from `roadSurfacing` rather than pinned, so
    // narrowing the road narrows the sled's allowance with it.
    const courses = roadSurfacing(ERA_ONE).courses;
    const slabs = courses.filter((course) => course.kind === "slab");
    expect(slabs.length).toBeGreaterThanOrEqual(2);
    const widths = slabs
      .map((course) => course.widthFactor * GRID_CELL)
      .sort((a, b) => a - b);
    const tread = widths[0] as number;
    const verge = widths[widths.length - 1] as number;
    expect(tread).toBeLessThan(verge);
    expect(form().bodyWidth).toBeLessThanOrEqual(tread);
    // Length and height, per §4.2's table: long enough to read at the measured gull's span
    // at full zoom-out, short enough to sit inside one cell, and under half the shortest
    // building in the era that sets the run's floor.
    expect(form().length).toBeGreaterThanOrEqual(2.6);
    expect(form().length).toBeLessThanOrEqual(3.4);
    expect(form().length).toBeLessThanOrEqual(GRID_CELL);
    expect(form().height).toBeLessThanOrEqual(2.0);
  });
});
