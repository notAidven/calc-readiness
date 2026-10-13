import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";
import { deriveCitizenRoster } from "./citizens";
import { buildingLedger, type CitizenNodeInput } from "./citizens-population";
import { deriveCityVitality } from "./city-vitality";
import {
  ERA_ONE_CIVIC_TYPES,
  ERA_ONE_FREE_CIVIC,
  type EraOneCivicTypeId,
  HAPPINESS_BAND_FLOOR,
  type HappinessBand,
} from "./city-vitality-tuning";
import type { CitizenRoleId } from "./descriptors";

/**
 * **WHICH HAPPINESS BAND A PURCHASE CAN REACH, AND AT WHAT PRICE — measured against the
 * catalogue at the tip rather than against anybody's memory of it.**
 *
 * ## The finding this file exists to record
 *
 * Before civic buildings were buyable the happiness system had exactly ONE attainable
 * value. A fully mastered era-one city is 44 people; its six skill buildings cap amenity
 * coverage at 9 (`SKILL_HAPPINESS_BY_ROLE` over D1's roles); `settling` needs 60% of the
 * population covered and `content` needs 100%; and the one free civic row is a Smokehouse
 * carrying zero happiness. So the whole capacity model sat at `restless` and could not
 * leave it. Roads (1 coverage a tile) opened `settling` at 18 tiles; this file is the
 * other half — the denser, deliberate route the catalogue was authored to be.
 *
 * ## Why the arithmetic is asserted rather than written in a comment
 *
 * Because it moved this afternoon and will move again. `#233` renamed the material and
 * `#236` rebalanced six of the ten catalogues, and a note recorded before either said
 * *"one Hearth Circle at 20 coverage takes a mastered city straight to `content`"*. Both
 * halves of that are now false: the type is the **Campfire**, and one of them reaches
 * `settling` and NOT `content`. Every figure below is derived from
 * {@link ERA_ONE_CIVIC_TYPES} and {@link HAPPINESS_BAND_FLOOR} in this file, so a reprice
 * changes the answer here instead of leaving a stale sentence somewhere.
 *
 * NOTHING HERE IS A GATE (INV-COS-1). A band is a readout; reaching one unlocks nothing
 * and failing to reach one blocks nothing. What the test protects is that the dial can
 * MOVE, which is a different property from anything depending on where it sits.
 */

const D1_ROLES: readonly { node_id: string; citizen_role: CitizenRoleId }[] = [
  { node_id: "NUM.S", citizen_role: "civic" },
  { node_id: "NUM.F", citizen_role: "civic" },
  { node_id: "NUM.2", citizen_role: "residence" },
  { node_id: "NUM.3", citizen_role: "school" },
  { node_id: "NUM.4", citizen_role: "civic" },
  { node_id: "NUM.5", citizen_role: "civic" },
];

function masteredNodes(): CitizenNodeInput[] {
  return D1_ROLES.map((entry) => ({
    ...entry,
    placed: true,
    mastery: 2 as Mastery,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  }));
}

const MASTERED_LEDGER = buildingLedger(masteredNodes());

/** A mastered city carrying the free row plus whatever was bought. */
function cityWith(bought: readonly EraOneCivicTypeId[]) {
  const civic = [...ERA_ONE_FREE_CIVIC, ...bought].map((id) => ({
    livability: ERA_ONE_CIVIC_TYPES[id].livability,
    happiness: ERA_ONE_CIVIC_TYPES[id].happiness,
  }));
  return deriveCityVitality({
    ledger: MASTERED_LEDGER,
    civic,
  });
}

/** What a list of purchases costs, from the catalogue and never from a literal. */
function priceOf(bought: readonly EraOneCivicTypeId[]): number {
  return bought.reduce((total, id) => total + ERA_ONE_CIVIC_TYPES[id].cost, 0);
}

/**
 * The CHEAPEST purchase list that reaches a band, searched over the catalogue rather
 * than asserted from a guess. Breadth-first over multisets up to `maxBuildings`, so the
 * answer is the catalogue's own answer and a reprice moves it without this file being
 * edited.
 */
function cheapestReaching(
  band: HappinessBand,
  maxBuildings: number,
): { bought: EraOneCivicTypeId[]; cost: number } | null {
  const types = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];
  let best: { bought: EraOneCivicTypeId[]; cost: number } | null = null;
  const walk = (from: number, bought: EraOneCivicTypeId[]): void => {
    if (bought.length > 0 && cityWith(bought).happiness.band === band) {
      const cost = priceOf(bought);
      if (best === null || cost < best.cost) {
        best = { bought: [...bought], cost };
      }
      // A superset only ever costs more, so there is nothing cheaper down this branch.
      return;
    }
    if (bought.length >= maxBuildings) {
      return;
    }
    // Non-decreasing indices, so each MULTISET is visited once rather than each ordering.
    for (let i = from; i < types.length; i += 1) {
      bought.push(types[i] as EraOneCivicTypeId);
      walk(i, bought);
      bought.pop();
    }
  };
  walk(0, []);
  return best;
}

describe("era one's happiness bands, before and after the catalogue is buyable", () => {
  it("is stuck at the bottom band when nothing can be bought — the defect", () => {
    const stuck = cityWith([]);
    // The measurement the feature exists to change, restated from the model rather than
    // quoted: 44 people, 9 coverage from the skill buildings, and the free row adding
    // none of it.
    expect(stuck.population).toBe(48);
    expect(stuck.happiness.coverage).toBe(9);
    expect(stuck.happiness.band).toBe("restless");
    expect(ERA_ONE_CIVIC_TYPES[ERA_ONE_FREE_CIVIC[0] as EraOneCivicTypeId].happiness).toBe(
      0,
    );

    // And there is no other band a mastered city could be in without buying something:
    // the population and the skill coverage are both pure functions of learning state,
    // so with the catalogue unavailable this ONE value is the whole range.
    const bands = new Set<HappinessBand>();
    for (let mastered = 0; mastered <= D1_ROLES.length; mastered += 1) {
      const nodes = masteredNodes().map((node, index) =>
        index < mastered ? node : { ...node, mastery: 0 as Mastery },
      );
      bands.add(
        deriveCityVitality({
          ledger: buildingLedger(nodes),
          civic: ERA_ONE_FREE_CIVIC.map((id) => ({
            livability: ERA_ONE_CIVIC_TYPES[id].livability,
            happiness: ERA_ONE_CIVIC_TYPES[id].happiness,
          })),
        }).happiness.band,
      );
    }
    expect([...bands]).toEqual(["restless"]);
  });

  it("reaches SETTLING for one Campfire, and 100 stone is the cheapest way there", () => {
    const cheapest = cheapestReaching("settling", 4);
    expect(cheapest).not.toBeNull();
    expect(cheapest?.bought).toEqual(["campfire"]);
    expect(cheapest?.cost).toBe(100);

    // Stated as the arithmetic, so a reader can check the derivation and not just the
    // conclusion: 9 from the skills + 20 from the Campfire = 29 of 44 = 66%, and
    // `settling` starts at 60.
    const settled = cityWith(["campfire"]);
    expect(settled.happiness.coverage).toBe(29);
    expect(settled.happiness.level).toBe(60);
    expect(settled.happiness.level).toBeGreaterThanOrEqual(HAPPINESS_BAND_FLOOR.settling);
    expect(settled.happiness.band).toBe("settling");
  });

  it("reaches CONTENT for two Campfires at 200 stone — NOT for one, as was recorded", () => {
    // The correction. A note written before #236 said one of these took a mastered city
    // "straight to content"; one takes it to `settling`, because `content` requires FULL
    // coverage (era one §6's settled ending is "everyone", not "most") and 29 of 44 is
    // not everyone.
    expect(cityWith(["campfire"]).happiness.band).not.toBe("content");

    const cheapest = cheapestReaching("content", 6);
    expect(cheapest).not.toBeNull();
    expect(cheapest?.bought).toEqual(["campfire", "campfire"]);
    expect(cheapest?.cost).toBe(200);

    const content = cityWith(["campfire", "campfire"]);
    expect(content.happiness.coverage).toBe(49);
    expect(content.happiness.level).toBe(100);
    expect(content.happiness.band).toBe("content");
    // Every dial full, which is what the panel's settled note is keyed on.
    expect(content.shortfalls.none).toBe(true);
  });

  it("is affordable inside era one's FINITE supply, with the guarantee's own numbers", () => {
    // Era one earns 600 stone and nothing else ever arrives (§7: "era one's finite
    // supply is exactly 600"). So `content` at 200 is a third of the run's whole
    // income — a real decision, and not one the learner can be locked out of.
    const LESSON_LUMP = 100;
    const granted = D1_ROLES.length * LESSON_LUMP;
    expect(granted).toBe(600);
    const contentCost = cheapestReaching("content", 6)?.cost ?? Number.POSITIVE_INFINITY;
    expect(contentCost).toBeLessThan(granted);
    // …and it leaves room for the livability side of the catalogue too, which is the
    // half INV-ERA-4's solvency predicate is about.
    expect(granted - contentCost).toBeGreaterThanOrEqual(
      ERA_ONE_CIVIC_TYPES.longhouse.cost,
    );
  });

  it("moves LIVABILITY too, so the catalogue is not a happiness-only feature", () => {
    const bare = cityWith([]).livability.sustains;
    const withHomes = cityWith(["longhouse", "longhouse"]).livability.sustains;
    expect(withHomes - bare).toBe(2 * ERA_ONE_CIVIC_TYPES.longhouse.livability);
    // Pooled, not limited: two dwellings are 40, never `min(20, 20)` (#236).
    expect(withHomes - bare).toBe(40);
  });
});

describe("a purchase moves the capacity dials and NOTHING else (D-CIT2, INV-COS-1)", () => {
  const BOUGHT: readonly EraOneCivicTypeId[] = [
    "longhouse",
    "longhouse",
    "campfire",
    "smokehouse",
    "water_spring",
  ];

  it("never changes the population, however much is bought", () => {
    // The rule a bought home could most easily break: population is a pure function of
    // LEARNING state, so no amount of stone summons anybody (D-CIT2, and
    // `citizens-invariants.test.ts`'s "capacity never gates arrivals" from the other
    // side). Buying four Longhouses must not add eight citizens.
    const bare = cityWith([]).population;
    for (let count = 1; count <= BOUGHT.length; count += 1) {
      expect(cityWith(BOUGHT.slice(0, count)).population, `${count} bought`).toBe(bare);
    }
    expect(BOUGHT.length).toBeGreaterThanOrEqual(4);
  });

  it("never changes who is housed, or the settled ending's spare-home count", () => {
    // `ENDGAME_SPARE_HOMES = 0` pins full-mastery `residence_capacity` to the population
    // exactly — "every home occupied and nobody waiting". A bought Longhouse contributes
    // LIVABILITY, which is a different question, so it must leave this ledger alone.
    const nodes = masteredNodes();
    const bare = deriveCitizenRoster({ nodes, seed: 1 });
    const bought = deriveCitizenRoster({
      nodes,
      civic: BOUGHT.map((type, index) => ({
        placement_id: `civic:${type}:${index}`,
        citizen_role: ERA_ONE_CIVIC_TYPES[type].citizen_role,
      })),
      seed: 1,
    });

    expect(bought.population).toBe(bare.population);
    expect(bought.residence_capacity).toBe(bare.residence_capacity);
    expect(bought.daytime_capacity).toBe(bare.daytime_capacity);
    expect(bought.housed).toBe(bare.housed);
    expect(bought.waiting).toEqual(bare.waiting);
    expect(bought.settled).toBe(bare.settled);
    // Every citizen's home and destination is the one they had, person for person.
    expect(bought.citizens).toEqual(bare.citizens);
    // Floors, so none of the above is an agreement over nothing.
    expect(bare.population).toBe(48);
    expect(bare.residence_capacity).toBe(48);
  });

  it("enters the roster with the AUTHORED role — a Longhouse is a residence", () => {
    const roster = deriveCitizenRoster({
      nodes: masteredNodes(),
      civic: [
        { placement_id: "civic:longhouse:0", citizen_role: "residence" },
        { placement_id: "civic:smokehouse:1", citizen_role: "civic" },
        { placement_id: "civic:campfire:2", citizen_role: "civic" },
        { placement_id: "civic:water_spring:3", citizen_role: "civic" },
      ],
      seed: 1,
    });
    const byId = new Map(roster.buildings.map((entry) => [entry.node_id, entry]));

    // The distinction the panel and the crowd must agree on: the era's dwelling is a
    // residence, and the food store is not.
    expect(byId.get("civic:longhouse:0")?.role).toBe("residence");
    expect(byId.get("civic:smokehouse:1")?.role).toBe("civic");
    expect(byId.get("civic:campfire:2")?.role).toBe("civic");
    expect(byId.get("civic:water_spring:3")?.role).toBe("civic");

    // Keyed by PLACEMENT id, so two of a type are two buildings rather than one
    // overwriting the other.
    const two = deriveCitizenRoster({
      nodes: masteredNodes(),
      civic: [
        { placement_id: "civic:longhouse:0", citizen_role: "residence" },
        { placement_id: "civic:longhouse:1", citizen_role: "residence" },
      ],
      seed: 1,
    });
    expect(two.buildings.filter((b) => b.node_id.startsWith("civic:"))).toHaveLength(2);

    // And a role, not a doorstep: nobody lives or works in a bought building today.
    for (const [id, entry] of byId) {
      if (id.startsWith("civic:")) {
        expect(entry.residence_capacity, id).toBe(0);
        expect(entry.residents, id).toEqual([]);
        expect(entry.visitors, id).toEqual([]);
      }
    }

    // Census both ways, so neither a missing entry nor a stray one passes: exactly the
    // four bought buildings joined the six earned ones.
    expect(roster.buildings).toHaveLength(D1_ROLES.length + 4);
    expect(
      roster.buildings.filter((entry) => entry.node_id.startsWith("civic:")),
    ).toHaveLength(4);
  });

  it("every catalogue row declares a role the roster can report", () => {
    // Derived from the table, so a fifth type arrives here as a failure rather than as a
    // building the roster silently cannot describe.
    const ids = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];
    expect(ids.length).toBeGreaterThanOrEqual(4);
    const roles: readonly CitizenRoleId[] = ["residence", "school", "civic"];
    for (const id of ids) {
      expect(roles, `${id} declares a known role`).toContain(
        ERA_ONE_CIVIC_TYPES[id].citizen_role,
      );
    }
    // The catalogue must distinguish at least two roles, or the field is decoration and
    // "a Longhouse is a residence, a Smokehouse is not" is not being expressed at all.
    expect(
      new Set(ids.map((id) => ERA_ONE_CIVIC_TYPES[id].citizen_role)).size,
    ).toBeGreaterThanOrEqual(2);
  });
});
