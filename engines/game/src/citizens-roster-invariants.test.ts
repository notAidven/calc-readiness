import type { Mastery } from "@cr/state-schema";
import { describe, expect, it, vi } from "vitest";

import { type CitizenState, deriveCitizenRoster } from "./citizens";
import type { CitizenNodeInput } from "./citizens-population";
import type { CitizenRoleId } from "./descriptors";

const SEED = 0x570e;

const D1_ORDER: readonly { node_id: string; citizen_role: CitizenRoleId }[] = [
  { node_id: "NUM.S", citizen_role: "civic" },
  { node_id: "NUM.F", citizen_role: "civic" },
  { node_id: "NUM.2", citizen_role: "residence" },
  { node_id: "NUM.3", citizen_role: "school" },
  { node_id: "NUM.4", citizen_role: "civic" },
  { node_id: "NUM.5", citizen_role: "civic" },
];

function nodesAt(mastery: Readonly<Record<string, Mastery>>): CitizenNodeInput[] {
  return D1_ORDER.map((entry) => ({
    ...entry,
    placed: true,
    mastery: mastery[entry.node_id] ?? 0,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  }));
}

describe("determinism (D-CIT1)", () => {
  it("returns a deep-equal roster for the same seed and state, twice", () => {
    const nodes = nodesAt({ "NUM.2": 2, "NUM.S": 1 });
    const first = deriveCitizenRoster({ nodes, seed: SEED });
    const second = deriveCitizenRoster({ nodes, seed: SEED });
    // Deep equality INCLUDING citizen order: any `Math.random`, `Date.now`, or
    // map-iteration dependence shows up here.
    expect(second).toEqual(first);
    expect(second.citizens.map((citizen) => citizen.id)).toEqual(
      first.citizens.map((citizen) => citizen.id),
    );
  });

  it("does not read the clock, so an hour later is the same city", () => {
    // Deriving twice back to back does NOT prove this: two calls in one test land in
    // the same millisecond, so a `Date.now()` leak would sail through the deep-equal
    // above. Moving the clock an hour between the two calls is what makes the
    // no-clock half of D-CIT1 falsifiable.
    const nodes = nodesAt({ "NUM.2": 2, "NUM.S": 1 });
    const clock = vi.spyOn(Date, "now");
    try {
      clock.mockReturnValue(1_700_000_000_000);
      const first = deriveCitizenRoster({ nodes, seed: SEED });
      clock.mockReturnValue(1_700_003_600_000);
      const second = deriveCitizenRoster({ nodes, seed: SEED });
      expect(second).toEqual(first);
    } finally {
      clock.mockRestore();
    }
  });

  it("changes the looks but not one count when the seed changes", () => {
    const nodes = nodesAt({ "NUM.2": 2 });
    const a = deriveCitizenRoster({ nodes, seed: 1 });
    const b = deriveCitizenRoster({ nodes, seed: 2 });
    expect(b.population).toBe(a.population);
    expect(b.residence_capacity).toBe(a.residence_capacity);
    expect(b.waiting).toEqual(a.waiting);
    expect(b.citizens[0]?.home_node_id).toBe(a.citizens[0]?.home_node_id);
    expect(b.citizens[0]?.look).not.toEqual(a.citizens[0]?.look);
  });
});

describe("roads amplify only (D-CIT7 / INV-COS-1)", () => {
  it("takes no road input at all, so the roster cannot depend on one", () => {
    // The strongest form of the assertion the design asks for: roads are deep-equal
    // in effect because they are not an input. A future contributor who adds a
    // `road_cells` field has to break this test to do it.
    const nodes = nodesAt({ "NUM.2": 2, "NUM.3": 2 });
    const roster = deriveCitizenRoster({ nodes, seed: SEED });
    const keys = Object.keys(roster).sort();
    expect(keys).toEqual(
      [
        "buildings",
        "citizens",
        "daytime_capacity",
        "housed",
        "population",
        "residence_capacity",
        "settled",
        "waiting",
      ].sort(),
    );
    // And the input surface: exactly two fields, neither of them a road.
    const input = { nodes, seed: SEED };
    expect(Object.keys(input).sort()).toEqual(["nodes", "seed"]);
  });
});

/**
 * THIS GUARD'S POPULATION IS LEARNING ADVANCES, and since 2026-07-31 that is narrower than
 * the behaviour it is named after. Recorded here rather than in a design document because
 * this is where somebody widening it will be standing.
 *
 * The team lead ruled that a mid-era crisis takes CAPACITY and that the people it was
 * holding leave, returning when capacity is bought back (D-CRISIS-28; the citizens design's
 * AMENDMENT 3). Eviction therefore has a second cause, and it is not in the space swept
 * below: the 4096 vectors and their 24,576 single-node advances only ever RAISE mastery, and
 * capacity is monotone in mastery, so `min(population, capacity)` cannot fall here however
 * carefully the sweep is written.
 *
 * MEASURED, both directions, at `03d5a2b9`:
 *
 *   - Inject a capacity-only penalty into `buildingLedger` — the shape a crisis penalty
 *     would have, and demonstrably enough to displace 16 citizens on a settled island — and
 *     THIS FILE REPORTS 8 PASSED, 0 FAILED, this test among them. Widened to every file over
 *     the two ledgers: 65 passed across 8 files.
 *   - It is not vacuous, though. Make capacity fall as a function of MASTERY instead (set
 *     `NUM.2`'s `residence_mastered` below its `residence_built`) and this test fails
 *     loudly, naming citizens and vectors: "citizen-022 lost its home when NUM.2 advanced
 *     (vector 4062)".
 *
 * So it measures capacity falling in the one variable it quantifies over and is blind to it
 * falling in any other — a guard scoped by the implementation rather than by the behaviour
 * (`.cursor/rules/qa-verification.mdc`). WHOEVER WIRES O-20 owes this file a population of
 * "capacity reductions from any source", and owes it a demonstrated red at the widened
 * lines: an assertion relaxed without one is not evidence that anything is still guarded.
 */
describe("no eviction, over all 4096 mastery vectors and every single-node advance", () => {
  it("keeps every housed citizen housed", () => {
    const levels: readonly Mastery[] = [0, 1, 2, 3];
    const nodeIds = D1_ORDER.map((entry) => entry.node_id);
    const total = 4 ** nodeIds.length;

    // Each vector is a base-4 code with node `d` as digit `d`, so ADVANCING node `d`
    // by one is just `code + 4**d` — another member of the same 4096. Deriving the
    // whole space ONCE and indexing into it covers exactly the same 24,576 advances
    // as the naive nested loop while doing 4,096 derivations instead of 28,672.
    const housedByCode: Set<string>[] = [];
    const homeByCode: Map<string, string | null>[] = [];
    for (let code = 0; code < total; code += 1) {
      const vector: Record<string, Mastery> = {};
      let rest = code;
      for (const nodeId of nodeIds) {
        vector[nodeId] = levels[rest % 4] ?? 0;
        rest = Math.floor(rest / 4);
      }
      const roster = deriveCitizenRoster({ nodes: nodesAt(vector), seed: SEED });
      housedByCode.push(
        new Set(
          roster.citizens
            .filter((citizen) => citizen.home_node_id !== null)
            .map((citizen) => citizen.id),
        ),
      );
      homeByCode.push(
        new Map(roster.citizens.map((citizen) => [citizen.id, citizen.home_node_id])),
      );
    }

    // Roughly 700,000 individual citizen checks, so they are COLLECTED and asserted
    // once rather than run through `expect` each: a per-citizen `expect` costs more
    // than the derivation it is checking and pushes this one test past the suite's
    // per-test budget. The coverage is identical, and a violation still names the
    // exact citizen, vector, and node.
    const evictions: string[] = [];
    let advances = 0;
    for (let code = 0; code < total; code += 1) {
      const housedBefore = housedByCode[code];
      if (!housedBefore) {
        throw new Error(`no roster derived for vector ${code}`);
      }
      let place = 1;
      for (const nodeId of nodeIds) {
        const level = Math.floor(code / place) % 4;
        place *= 4;
        if (level === 3) {
          continue;
        }
        const homeById = homeByCode[code + place / 4];
        if (!homeById) {
          throw new Error(`no roster derived for the advance of ${nodeId} from ${code}`);
        }
        for (const id of housedBefore) {
          if (homeById.get(id) == null) {
            evictions.push(`${id} lost its home when ${nodeId} advanced (vector ${code})`);
          }
        }
        advances += 1;
      }
    }
    expect(evictions).toEqual([]);
    expect(advances).toBeGreaterThan(4000);
  });
});

describe("assignment stability (section 4's whole reason to exist)", () => {
  it("never changes an existing citizen's home when a NEW building is placed", () => {
    // Buildings arrive in placement order, so a new one appends and draws only from
    // people with no home. Walk the whole island one placement at a time.
    let placed: CitizenNodeInput[] = [];
    let previous = deriveCitizenRoster({ nodes: placed, seed: SEED });
    for (const entry of D1_ORDER) {
      placed = [
        ...placed,
        {
          ...entry,
          placed: true,
          mastery: 0,
          lesson_stage: "done" as const,
          placement_estimate: 0 as const,
        },
      ];
      const next = deriveCitizenRoster({ nodes: placed, seed: SEED });
      for (const citizen of previous.citizens) {
        if (citizen.home_node_id === null) {
          continue;
        }
        const same = next.citizens.find((other) => other.id === citizen.id);
        expect(same?.home_node_id, `${citizen.id} after placing ${entry.node_id}`).toBe(
          citizen.home_node_id,
        );
      }
      previous = next;
    }
  });
});

describe("no harm state (D-CIT6, enforced in the type)", () => {
  it("has an exhaustive, harmless switch over every member of the union", () => {
    // This fails to COMPILE if a state is added to the union, which is the point:
    // a future contributor cannot add `sick`, `angry`, or `leaving` without arriving
    // here first. And every arm is a neutral or positive description.
    const describeState = (state: CitizenState): string => {
      switch (state) {
        case "housed":
          return "at home";
        case "waiting":
          return "waiting for a home";
        case "commuting":
          return "on the way";
        case "at_school":
          return "at school";
        case "at_work":
          return "at work";
        case "visiting":
          return "out and about";
        // ADDED 2026-08-02, through this gate rather than round it. A crisis board asked for
        // a state and the only honest one is where a person has GOT TO — indoors, out of the
        // weather — which is the same register as `housed` and the opposite of every state
        // this union refuses. `freezing` and `dying` are still not here and would still have
        // to argue their way past the banned list below.
        case "sheltering":
          return "safe indoors, out of the weather";
        default: {
          const exhaustive: never = state;
          return exhaustive;
        }
      }
    };
    const every: readonly CitizenState[] = [
      "housed",
      "waiting",
      "commuting",
      "at_school",
      "at_work",
      "visiting",
      "sheltering",
    ];
    expect(every).toHaveLength(7);
    for (const state of every) {
      const text = describeState(state);
      expect(text.length).toBeGreaterThan(0);
      for (const banned of [
        "homeless",
        "unhoused",
        "failing",
        "sick",
        "leaving",
        // The four a crisis makes tempting. Named here because the crisis board is exactly
        // where the next contributor will be standing when they want one of them.
        "freezing",
        "starving",
        "dying",
        "trapped",
      ]) {
        expect(text, state).not.toContain(banned);
      }
    }
  });

  it("carries a crisis state that the pure derivation never emits", () => {
    // TWO CLAIMS, and the pair is the point. The union has to hold `sheltering` — without it
    // the render layer has no vocabulary for a crisis and draws people strolling over ice —
    // and `deriveCitizenRoster` has to never emit it, because this function takes no crisis
    // input and a state it invented would be a second opinion about whether a winter is on.
    // `commuting` is here for the same pair of reasons and is asserted beside it, so a
    // refactor that started emitting either from the roster fails.
    const renderOnly: readonly CitizenState[] = ["commuting", "sheltering"];
    const emitted = new Set<CitizenState>();
    const levels: readonly Mastery[] = [0, 1, 2, 3];
    let derivations = 0;
    for (const level of levels) {
      for (const entry of D1_ORDER) {
        const roster = deriveCitizenRoster({
          nodes: nodesAt({ [entry.node_id]: level }),
          seed: SEED,
        });
        for (const citizen of roster.citizens) {
          emitted.add(citizen.state);
        }
        derivations += 1;
      }
    }
    // The floor: a sweep over nothing would satisfy the exclusion below trivially.
    expect(derivations).toBe(levels.length * D1_ORDER.length);
    expect(emitted.size).toBeGreaterThanOrEqual(3);
    for (const state of renderOnly) {
      expect(emitted.has(state), `the roster emitted the render-only ${state}`).toBe(false);
    }
  });
});

describe("an unauthored island does not throw (D-CIT12)", () => {
  it("returns the founding crowd, no roles, no capacity, everyone waiting", () => {
    // D2-D10 are `architected` with zero plots and no authored roles.
    const roster = deriveCitizenRoster({ nodes: [], seed: SEED });
    expect(roster.population).toBe(12);
    expect(roster.residence_capacity).toBe(0);
    expect(roster.buildings).toEqual([]);
    expect(roster.waiting).toHaveLength(12);
    expect(roster.settled).toBe(false);
    // `housed` is a COUNT and has to agree with the homes that exist: an island with
    // no buildings houses nobody. Asserting only the waiting list would miss a
    // `housed = population` bug, because with no buildings to fill nobody gets a home
    // either way and the two numbers silently disagree.
    expect(roster.housed).toBe(0);
    expect(roster.housed).toBeLessThanOrEqual(roster.residence_capacity);
    expect(roster.housed + roster.waiting.length).toBe(roster.population);
    // And with a node nobody has authored a capacity entry for.
    const hotel = deriveCitizenRoster({
      nodes: [
        {
          node_id: "EXP.1",
          citizen_role: "civic",
          placed: true,
          mastery: 2,
          lesson_stage: "done",
          placement_estimate: 0,
        },
      ],
      seed: SEED,
    });
    expect(hotel.buildings[0]?.role).toBe("civic");
    expect(hotel.waiting).toHaveLength(hotel.population);
  });
});
