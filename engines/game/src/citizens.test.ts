import { PRACTICED_MASTERY } from "@cr/mastery-service";
import type { LessonStage, Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { type CitizenState, deriveCitizenRoster } from "./citizens";
import type { CitizenNodeInput } from "./citizens-population";
import type { CitizenRoleId } from "./descriptors";

const SEED = 0x5eed;

/**
 * Nodes in PLACEMENT order — the order the adapter supplies them (plan section 7.3).
 *
 * **THE DEFAULT MASTERY IS `PRACTICED_MASTERY`, NOT ZERO**, and the change is a fixture
 * correction rather than a loosening. Every caller below means "this building is
 * finished", and a finished building is mastery ≥ 1: the ordinary path writes mastery and
 * `lesson_stage: "done"` in one call, and a below-bar finish is mastery 1. The old
 * default of 0 alongside `"done"` was specifically the DIAGNOSTIC TEST-OUT shape, which
 * since 2026-07-30 houses nobody (`citizens-population.ts`) — so leaving it would have
 * made nine assertions about the ordinary path silently measure the test-out one.
 */
function placed(
  entries: readonly {
    node_id: string;
    citizen_role: CitizenRoleId;
    mastery?: Mastery;
    lesson_stage?: LessonStage;
  }[],
): CitizenNodeInput[] {
  return entries.map((entry) => ({
    node_id: entry.node_id,
    citizen_role: entry.citizen_role,
    placed: true,
    mastery: entry.mastery ?? PRACTICED_MASTERY,
    lesson_stage: entry.lesson_stage ?? "done",
    placement_estimate: 0,
  }));
}

const ROWHOUSE = { node_id: "NUM.2", citizen_role: "residence" } as const;
const BANK = { node_id: "NUM.S", citizen_role: "civic" } as const;
const SCHOOL = { node_id: "NUM.3", citizen_role: "school" } as const;

describe("deriveCitizenRoster", () => {
  it("puts the whole founding crowd outside the Civic Center on a bare island", () => {
    const roster = deriveCitizenRoster({ nodes: [], seed: SEED });
    expect(roster.population).toBe(12);
    expect(roster.residence_capacity).toBe(0);
    expect(roster.housed).toBe(0);
    expect(roster.waiting).toHaveLength(12);
    expect(roster.citizens).toHaveLength(12);
    for (const citizen of roster.citizens) {
      expect(citizen.state).toBe("waiting");
      expect(citizen.home_node_id).toBeNull();
    }
    // Nothing throws and nothing divides by zero on an island with no buildings.
    expect(roster.buildings).toEqual([]);
    expect(roster.settled).toBe(false);
  });

  it("houses the earliest arrivals first, and leaves the rest waiting", () => {
    // The Dwellings built (not mastered) is 10 homes against a population of 14
    // (12 founding + 2 for the one complete building).
    const roster = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    expect(roster.population).toBe(14);
    expect(roster.residence_capacity).toBe(10);
    expect(roster.housed).toBe(10);
    expect(roster.waiting).toEqual(["citizen-010", "citizen-011", "citizen-012", "citizen-013"]);
    const home = roster.buildings.find((entry) => entry.node_id === "NUM.2");
    expect(home?.residents).toHaveLength(10);
    expect(home?.residents[0]).toBe(roster.citizens[0]?.id);

    // With TWO housing buildings the greedy fill has to stop at each building's own
    // capacity, not merely at the housed count. One residence hides that bug, because
    // `housed` binds first and the difference is invisible: the Bank's 2 flats must
    // take exactly citizens 0-1 and hand the rest on, or the earliest-in-order
    // building would swallow the whole island.
    const two = deriveCitizenRoster({ nodes: placed([BANK, ROWHOUSE]), seed: SEED });
    expect(two.population).toBe(16);
    expect(two.housed).toBe(12);
    const bank = two.buildings.find((entry) => entry.node_id === "NUM.S");
    const rowhouse = two.buildings.find((entry) => entry.node_id === "NUM.2");
    expect(bank?.residents).toEqual(["citizen-000", "citizen-001"]);
    expect(rowhouse?.residents).toHaveLength(10);
    for (const entry of two.buildings) {
      expect(entry.residents.length, entry.node_id).toBeLessThanOrEqual(
        entry.residence_capacity,
      );
    }
  });

  it("grows a terrace's occupancy when its skill is mastered (D-CIT15's visible half)", () => {
    const built = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    const mastered = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }]),
      seed: SEED,
    });
    expect(built.buildings[0]?.residence_capacity).toBe(10);
    expect(mastered.buildings[0]?.residence_capacity).toBe(30);
    expect(mastered.buildings[0]?.residents.length ?? 0).toBeGreaterThan(
      built.buildings[0]?.residents.length ?? 0,
    );
  });

  it("grows the waiting crowd when a building that houses nobody lands", () => {
    // The most legible statement of what the crowd is FOR: finishing the school
    // brings families who need homes the island does not have yet. A RISE is always
    // new arrivals, never an eviction.
    const before = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    const after = deriveCitizenRoster({ nodes: placed([ROWHOUSE, SCHOOL]), seed: SEED });
    expect(after.population).toBeGreaterThan(before.population);
    expect(after.residence_capacity).toBe(before.residence_capacity);
    expect(after.waiting.length).toBeGreaterThan(before.waiting.length);
    // And nobody who had a home lost one.
    for (const citizen of before.citizens) {
      if (citizen.state !== "waiting") {
        const same = after.citizens.find((other) => other.id === citizen.id);
        expect(same?.home_node_id, citizen.id).not.toBeNull();
      }
    }
  });

  it("seats housed citizens at daytime destinations and leaves the waiting at the hub", () => {
    const roster = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }, SCHOOL]),
      seed: SEED,
    });
    const school = roster.buildings.find((entry) => entry.node_id === "NUM.3");
    expect(school?.daytime_capacity).toBe(8);
    expect(school?.visitors.length ?? 0).toBeGreaterThan(0);
    expect(school?.residents).toEqual([]);
    // A waiting citizen holds no daytime seat (design section 7: they gather at the
    // Civic Center).
    for (const id of roster.waiting) {
      const citizen = roster.citizens.find((entry) => entry.id === id);
      expect(citizen?.day_node_id, id).toBeNull();
      expect(citizen?.state, id).toBe("waiting");
    }

    // The seat LIST has to be checked too, not just each citizen's own field: an
    // implementation that seats the waiting crowd and then blanks their
    // `day_node_id` would still leave their ids in `visitors`, and the panel reads
    // `visitors`. The school alone houses nobody, so with 10 people and 0 homes
    // every one of its 8 seats must stay empty.
    const nobodyHoused = deriveCitizenRoster({ nodes: placed([SCHOOL]), seed: SEED });
    expect(nobodyHoused.housed).toBe(0);
    expect(nobodyHoused.waiting).toHaveLength(14);
    const emptySchool = nobodyHoused.buildings.find((entry) => entry.node_id === "NUM.3");
    expect(emptySchool?.daytime_capacity).toBe(8);
    expect(emptySchool?.visitors).toEqual([]);
    const housedIds = new Set(
      roster.citizens
        .filter((citizen) => citizen.home_node_id !== null)
        .map((citizen) => citizen.id),
    );
    for (const entry of roster.buildings) {
      for (const id of entry.visitors) {
        expect(housedIds.has(id), `${entry.node_id} seats ${id}`).toBe(true);
      }
    }
  });

  it("derives a day state from the role family, never from the display name", () => {
    const roster = deriveCitizenRoster({
      nodes: placed([
        { ...ROWHOUSE, mastery: 2 },
        { ...BANK, mastery: 2 },
        { ...SCHOOL, mastery: 2 },
      ]),
      seed: SEED,
    });
    const states = new Set(roster.citizens.map((citizen) => citizen.state));
    expect(states.has("at_school")).toBe(true);
    expect(states.has("at_work")).toBe(true);
    // No state in the union expresses harm, and none is invented here. `sheltering` is
    // DELIBERATELY absent: it is the union's crisis vocabulary and only the render layer
    // emits it, so a derivation that started handing it out fails here rather than quietly
    // deciding a winter is on. `citizens-roster-invariants.test.ts` holds the same claim over
    // every mastery level of every node.
    const allowed: readonly CitizenState[] = [
      "housed",
      "waiting",
      "commuting",
      "at_school",
      "at_work",
      "visiting",
    ];
    for (const state of states) {
      expect(allowed).toContain(state);
    }
  });

  it("gives every citizen a stable, seeded look and an index-ordered id", () => {
    const roster = deriveCitizenRoster({ nodes: placed([ROWHOUSE]), seed: SEED });
    expect(roster.citizens.map((citizen) => citizen.id)).toEqual([
      "citizen-000",
      "citizen-001",
      "citizen-002",
      "citizen-003",
      "citizen-004",
      "citizen-005",
      "citizen-006",
      "citizen-007",
      "citizen-008",
      "citizen-009",
      "citizen-010",
      "citizen-011",
      "citizen-012",
      "citizen-013",
    ]);
    for (const citizen of roster.citizens) {
      expect(citizen.look.body_tone).toBeGreaterThanOrEqual(0);
      expect(citizen.look.body_tone).toBeLessThan(1);
      expect(citizen.look.height_scale).toBeGreaterThanOrEqual(0.9);
      expect(citizen.look.height_scale).toBeLessThanOrEqual(1.1);
    }
    // A citizen's look must not depend on how many people are on the island, or the
    // whole crowd would re-skin itself every time someone arrived.
    const bigger = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }]),
      seed: SEED,
    });
    expect(bigger.citizens[3]?.look).toEqual(roster.citizens[3]?.look);
  });

  it("declares the island SETTLED only when every skill is mastered and nobody waits", () => {
    const six = placed([
      { node_id: "NUM.S", citizen_role: "civic", mastery: 2 },
      { node_id: "NUM.F", citizen_role: "civic", mastery: 2 },
      { node_id: "NUM.2", citizen_role: "residence", mastery: 2 },
      { node_id: "NUM.3", citizen_role: "school", mastery: 2 },
      { node_id: "NUM.4", citizen_role: "civic", mastery: 2 },
      { node_id: "NUM.5", citizen_role: "civic", mastery: 2 },
    ]);
    const settled = deriveCitizenRoster({ nodes: six, seed: SEED });
    expect(settled.population).toBe(48);
    expect(settled.residence_capacity).toBe(48);
    expect(settled.waiting).toEqual([]);
    expect(settled.housed).toBe(48);
    expect(settled.settled).toBe(true);

    // One skill short of mastery is NOT settled, even if nobody happens to be waiting.
    const almost = deriveCitizenRoster({
      nodes: six.map((node) =>
        node.node_id === "NUM.4" ? { ...node, mastery: 0 as Mastery } : node,
      ),
      seed: SEED,
    });
    expect(almost.waiting).toEqual([]);
    expect(almost.settled).toBe(false);
    // A bare island has nobody housed and is emphatically not settled.
    expect(deriveCitizenRoster({ nodes: [], seed: SEED }).settled).toBe(false);
  });

  it("never reports more citizens than the population, or fewer", () => {
    const roster = deriveCitizenRoster({
      nodes: placed([{ ...ROWHOUSE, mastery: 2 }, SCHOOL, BANK]),
      seed: SEED,
    });
    expect(roster.citizens).toHaveLength(roster.population);
    expect(roster.housed + roster.waiting.length).toBe(roster.population);
    const assigned = roster.buildings.flatMap((entry) => entry.residents);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned).toHaveLength(roster.housed);
  });
});
