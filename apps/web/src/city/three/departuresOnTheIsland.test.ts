import { type CitizenNodeInput, deriveCitizenRoster } from "@cr/game";
import { describe, expect, it } from "vitest";

import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "../worldLayout";
import { CITIZEN_STAND_RADIUS, type CitizenPlace, citizenPlaces } from "./citizenPlaces";
import { shelterGround } from "./citizenShelter";

/**
 * **NOBODY STANDS OFF THE SETTLEMENT, ON ANY ISLAND THIS LAYER CAN BE HANDED.**
 *
 * ## ⚑ THIS FILE ASSERTED THE OPPOSITE, AND THE GEOMETRY IT USED IS WHY IT SURVIVES
 *
 * It was *"a departure, on the island"*, and it proved the team lead's third item: *"Departure
 * has to be legible on the island, not only in a number. The citizens are already drawn;
 * someone walking away is a strong image."* It measured WHERE the leavers stood (past
 * {@link CITIZEN_STAND_RADIUS}, on the permanently clear grass annulus), that they were the
 * right people (reverse arrival order), that their walk beat pointed outward, and that they
 * were spread far enough apart to read as a line of figures rather than one blob.
 *
 * On 2026-08-05 departures were removed as a mechanic entirely — *"maybe just remove the
 * actual consequences just tell them their people are unhappy?"* — so the shoreline exodus is
 * deleted from `citizenPlaces.ts`. **The line it was measured against is the whole reason this
 * file is rewritten rather than deleted**: `CITIZEN_STAND_RADIUS` is a real boundary in the
 * shipped geometry, every ordinary citizen has always been inside it, and *"is anybody outside
 * it"* is therefore a question with a meaningful answer whichever way the design goes. Turned
 * around, the same measurement is the render layer's half of the ruling.
 *
 * ## What it now claims, and why the population is the input space rather than one board
 *
 * `test/departuresAreWired.test.ts` §1 holds the ENGINE to reporting no headcount and §2 holds
 * every source to saying nothing about people leaving. Neither of those can see a render layer
 * that decided on its own to stage somebody at the water's edge, and a guard that only checked
 * a fair-weather island would not either. So this sweeps everything `citizenPlaces` accepts —
 * roster sizes from one person to a full town, with and without a hub, with and without a
 * crisis board, with and without ruins — and asserts that not one place it returns is outside
 * the settlement.
 *
 * The control matters as much as the sweep: *"nobody is outside"* is also what a broken
 * distance test reports, so the last case builds a place outside the line by hand and fails if
 * the detector cannot see it.
 */

const SEED = 0x5eed;
const HUB = TOWN_HALL_CENTER_TRANSFORM;
const SKILL_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;
const ROLES: Readonly<Record<string, CitizenNodeInput["citizen_role"]>> = {
  "NUM.2": "residence",
  "NUM.3": "school",
};

const PLACEMENTS: readonly PlacedTransform[] = defaultPlacements(
  [...SKILL_NODES],
  [{ ...HUB, nodeId: TOWN_HALL_ID }],
  BUILDABLE_RADIUS,
);

/** A roster from the first `nodes` of era one's six, so the crowd sweeps from 8 up to 44. */
function rosterOf(nodes: number) {
  return deriveCitizenRoster({
    nodes: SKILL_NODES.slice(0, nodes).map((nodeId) => ({
      node_id: nodeId,
      citizen_role: ROLES[nodeId] ?? "civic",
      placed: true,
      mastery: 2,
      lesson_stage: "done" as const,
      placement_estimate: 0 as const,
    })),
    seed: SEED,
  });
}

const ROSTER = rosterOf(SKILL_NODES.length);

/**
 * A crisis board with real frost on it.
 *
 * Built rather than mocked because `shelterGround(null)` returns `null`, which is the
 * fair-weather path — a fixture that quietly produced one would make every crisis assertion
 * below pass while proving nothing about a crisis board.
 */
function frozenBoard() {
  return shelterGround([
    Array.from({ length: 12 }, (_, col) => ({
      col: col - 6,
      row: 0,
      land: true,
      frozen: col < 4,
      frost_next: col === 4,
    })),
  ] as never);
}

const distance = (point: { x: number; z: number }) => Math.hypot(point.x, point.z);

/** Whether any place in a staging is outside the settlement, and which. */
function outsideTheSettlement(places: readonly CitizenPlace[]): string[] {
  return places
    .filter((place) => distance(place.point) > CITIZEN_STAND_RADIUS)
    .map((place) => `${place.id} at ${distance(place.point).toFixed(1)}u`);
}

/** Every island this layer can be handed, named so a failure says which one. */
function everyIsland(): { readonly label: string; readonly places: CitizenPlace[] }[] {
  const boards: { label: string; places: CitizenPlace[] }[] = [];
  const frozen = frozenBoard();
  for (let nodes = 1; nodes <= SKILL_NODES.length; nodes += 1) {
    const roster = rosterOf(nodes);
    const placements = PLACEMENTS.slice(0, nodes);
    for (const [shelterLabel, shelter] of [
      ["fair weather", null],
      ["a crisis board", frozen],
    ] as const) {
      for (const [hubLabel, hub] of [
        ["with a hub", HUB],
        ["unfounded", null],
      ] as const) {
        for (const [ruinLabel, ruinedNodeIds] of [
          ["nothing wrecked", undefined],
          ["two in ruins", new Set(SKILL_NODES.slice(0, 2))],
        ] as const) {
          boards.push({
            label: `${nodes} nodes, ${shelterLabel}, ${hubLabel}, ${ruinLabel}`,
            places: [
              ...citizenPlaces({
                roster,
                placements,
                hub,
                seed: SEED,
                shelter,
                ruinedNodeIds,
              }),
            ],
          });
        }
      }
    }
  }
  return boards;
}

describe("the crowd stays in the settlement, whatever the city is short of", () => {
  it("sweeps a real island and a real crowd, or it measures nothing", () => {
    // The floors, first and separately. Every claim below is "for all places", which an empty
    // staging satisfies, and the fixture that produces an empty staging is easy to write by
    // accident.
    expect(ROSTER.citizens.length).toBe(48);
    expect(CITIZEN_STAND_RADIUS).toBeGreaterThan(0);

    const islands = everyIsland();
    expect(islands.length).toBeGreaterThanOrEqual(48);
    for (const island of islands) {
      expect(island.places.length, `${island.label}: nobody was staged`).toBeGreaterThan(0);
    }
    // And a crisis board really is one, or half the sweep is the fair-weather path twice.
    const frozen = frozenBoard();
    expect(frozen, "the crisis fixture is not a crisis board").not.toBeNull();
    expect(frozen?.frozen.size ?? 0).toBeGreaterThan(0);
  });

  it("puts nobody past the line, on any island it can be handed", () => {
    const offenders: string[] = [];
    for (const island of everyIsland()) {
      for (const who of outsideTheSettlement(island.places)) {
        offenders.push(`${island.label}: ${who}`);
      }
    }
    expect(
      offenders,
      "somebody is staged outside the settlement, which is the shape a departure took",
    ).toEqual([]);
  });

  it("stages everybody the roster holds, so nobody is quietly dropped instead", () => {
    // The other way a departure can reach a picture: not by moving somebody out but by
    // leaving them out. `Citizens.tsx` names this failure twice over ("people vanished"), and
    // it would be invisible to the distance sweep above.
    for (let nodes = 1; nodes <= SKILL_NODES.length; nodes += 1) {
      const roster = rosterOf(nodes);
      const places = citizenPlaces({
        roster,
        placements: PLACEMENTS.slice(0, nodes),
        hub: HUB,
        seed: SEED,
      });
      expect(places, `${nodes} nodes`).toHaveLength(roster.citizens.length);
      expect(new Set(places.map((place) => place.id)).size).toBe(roster.citizens.length);
    }
  });

  it("keeps every walk beat inside the settlement too, not only the resting place", () => {
    // The beat was the departure's own tell: the leavers' `walkTo` pointed FURTHER OUT, so a
    // staging could satisfy the resting-place sweep and still animate somebody off the island.
    const offenders: string[] = [];
    for (const island of everyIsland()) {
      for (const place of island.places) {
        if (distance(place.walkTo) > CITIZEN_STAND_RADIUS) {
          offenders.push(
            `${island.label}: ${place.id} walks to ${distance(place.walkTo)}u`,
          );
        }
      }
    }
    expect(offenders, "a walk beat leads out of the settlement").toEqual([]);
  });

  it("detects a place outside the settlement when there is one", () => {
    // The sweeps above pass by finding nothing, which is also how they would look if the
    // distance test had been broken into matching nothing. The staging fed in here is the one
    // the deleted `leavingPlace()` produced: `CITIZEN_STAND_RADIUS + 2.4` on the near-shore
    // bearing, with the beat 1.4u further out again.
    const staged: CitizenPlace[] = [
      {
        id: "citizen-043",
        point: { x: 0, z: CITIZEN_STAND_RADIUS + 2.4 },
        walkTo: { x: 0, z: CITIZEN_STAND_RADIUS + 3.8 },
        state: "housed",
        shelteredIn: null,
      },
    ];
    expect(outsideTheSettlement(staged)).toHaveLength(1);
    expect(distance(staged[0]?.walkTo ?? { x: 0, z: 0 })).toBeGreaterThan(
      CITIZEN_STAND_RADIUS,
    );

    // ...and it does not fire on a citizen standing at the very edge of the annulus, which is
    // a legal place and the nearest legal place to the line.
    expect(
      outsideTheSettlement([
        { ...(staged[0] as CitizenPlace), point: { x: 0, z: CITIZEN_STAND_RADIUS } },
      ]),
    ).toEqual([]);
  });
});
