import { ERA_SEQUENCE, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { deriveCapacities } from "./capacity";
import {
  applyCivicPurchase,
  civicCityCapacities,
  civicContribution,
  civicPlacementEra,
  civicSuspendedCapacity,
  civicTeardownCost,
  civicTeardownMaterial,
  legacyDecayFactor,
} from "./civicBuilding";
import { CIVIC_ROLES, civicBuildingForRole, civicBuildingOrThrow } from "./civicCatalogue";
import { LEGACY_DECAY_FLOOR, TEARDOWN_COST_FRACTION } from "./constants";
import { lessonCompleteGrant } from "./earn";
import { applyGrant } from "./grant";
import { appendEntries, materialBalanceOf } from "./ledger";
import { ERA_MATERIALS, lessonMaterialAmount } from "./materials";
import { EMPTY_LEDGER_VIEW, type LedgerView } from "./types";

const STUDENT = "s1";
const NOW = Date.UTC(2026, 0, 1);

const SMOKEHOUSE = civicBuildingOrThrow("prehistoric_smokehouse");
const LONGHOUSE = civicBuildingOrThrow("prehistoric_longhouse");
const CAMPFIRE = civicBuildingOrThrow("prehistoric_campfire");

/** A ledger holding `lessons` era-one lesson payouts — the only stone that exists. */
function withLessons(lessons: number): LedgerView {
  const nodes = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"];
  let view = EMPTY_LEDGER_VIEW;
  for (const nodeId of nodes.slice(0, lessons)) {
    const result = applyGrant(
      view,
      lessonCompleteGrant({ studentId: STUDENT, nodeId, nowMs: NOW }),
    );
    view = appendEntries(view, result.rows);
  }
  return view;
}

describe("O-5 legacy decay — 0.9 ^ (eras behind), floored at 0.5", () => {
  it("leaves a current-era building at full contribution", () => {
    expect(legacyDecayFactor("prehistoric", "prehistoric")).toBe(1);
    expect(civicContribution(LONGHOUSE, "prehistoric")).toEqual(LONGHOUSE.provides);
  });

  it("never rewards a building for being AHEAD of the current era", () => {
    // Not reachable through purchase (era-exclusivity), but a factor above 1 would be
    // a capacity bonus for time travel, so it is clamped rather than trusted.
    expect(legacyDecayFactor("cyberpunk", "prehistoric")).toBe(1);
  });

  it("matches the arithmetic era one §7 spells out", () => {
    expect(legacyDecayFactor("prehistoric", "neolithic")).toBeCloseTo(0.9, 10);
    expect(legacyDecayFactor("prehistoric", "classical")).toBeCloseTo(0.729, 10);
    expect(legacyDecayFactor("prehistoric", "industrial")).toBeCloseTo(0.531441, 10);
  });

  it("reaches the floor at SEVEN eras behind, and never goes under", () => {
    // `0.9 ** 6 = 0.531` is above the floor and `0.9 ** 7 = 0.478` is the first power
    // below it, so SEVEN behind is where the floor starts binding. Asserted as the
    // crossing rather than at one point, because an off-by-one here is exactly the
    // error two era documents made (see the next test).
    //
    // Era one is era 1, so six behind is era 7 (industrial) and seven behind is era 8
    // (atomic age) — not the other way round, which is how this test first failed.
    expect(eraNumber("industrial") - eraNumber("prehistoric")).toBe(6);
    expect(legacyDecayFactor("prehistoric", "industrial")).toBeGreaterThan(
      LEGACY_DECAY_FLOOR,
    );
    expect(eraNumber("atomic_age") - eraNumber("prehistoric")).toBe(7);
    expect(legacyDecayFactor("prehistoric", "atomic_age")).toBe(LEGACY_DECAY_FLOOR);
    expect(legacyDecayFactor("prehistoric", "cyberpunk")).toBe(LEGACY_DECAY_FLOOR);
    for (const era of ERA_SEQUENCE) {
      expect(legacyDecayFactor("prehistoric", era.id), era.id).toBeGreaterThanOrEqual(
        LEGACY_DECAY_FLOOR,
      );
    }
  });

  it("puts exactly THREE eras on the floor by era ten, not six", () => {
    // Pinned because two era documents state this wrong and neither is editable from
    // here. Era nine's file says "the first three eras' quarters are all on the
    // floor" (it is the first TWO: eras 1 and 2 at 8 and 7 behind). Era ten's says
    // "six of the nine earlier eras sit on the floor" (it is three: eras 1, 2, 3).
    // The curve is right in both files; the counts are not.
    const onFloor = ERA_SEQUENCE.filter(
      (era) => legacyDecayFactor(era.id, "cyberpunk") === LEGACY_DECAY_FLOOR,
    ).map((era) => era.id);
    expect(onFloor).toEqual(["prehistoric", "neolithic", "bronze_age"]);

    const onFloorAtEraNine = ERA_SEQUENCE.filter(
      (era) => legacyDecayFactor(era.id, "information_age") === LEGACY_DECAY_FLOOR,
    ).map((era) => era.id);
    expect(onFloorAtEraNine).toEqual(["prehistoric", "neolithic"]);
  });

  it("FLOORS a decayed contribution — no fractional people", () => {
    // 20 livability three eras on is 20 × 0.729 = 14.58, which must read as 14 and
    // not 14.58 or 15: a capacity is people, and flooring is the direction that can
    // only under-report, matching `greedyPlanCost`'s upper bound on cost.
    expect(civicContribution(LONGHOUSE, "classical")).toEqual({
      livability: 14,
      happiness: 3,
    });
    // 5 happiness × 0.729 = 3.645 -> 3.
    expect(Number.isInteger(civicContribution(LONGHOUSE, "classical").happiness)).toBe(
      true,
    );
  });

  it("decays a whole city through the SHIPPED aggregation, not a second sum", () => {
    const placements = [
      { placementId: "p1", building: SMOKEHOUSE.id },
      { placementId: "p2", building: LONGHOUSE.id },
      { placementId: "p3", building: CAMPFIRE.id },
    ];
    // At home: 20 + 20 + 0 livability, 0 + 5 + 20 happiness.
    expect(civicCityCapacities(placements, "prehistoric")).toEqual({
      livability: 40,
      happiness: 25,
    });
    // One era on, each row floored individually: 18 + 18 + 0, 0 + 4 + 18.
    expect(civicCityCapacities(placements, "neolithic")).toEqual({
      livability: 36,
      happiness: 22,
    });
    // And it IS `deriveCapacities` doing the summing, so the pooled-livability ruling
    // has one implementation rather than two that can drift.
    expect(civicCityCapacities(placements, "neolithic")).toEqual(
      deriveCapacities(
        placements.map((p) =>
          civicContribution(civicBuildingOrThrow(p.building), "neolithic"),
        ),
      ),
    );
  });

  it("is empty-safe", () => {
    expect(civicCityCapacities([], "prehistoric")).toEqual({
      livability: 0,
      happiness: 0,
    });
  });
});

/**
 * **CAN THE CAPACITY MODEL SAY "THIS BUILDING'S CONTRIBUTION IS SUSPENDED"?**
 *
 * The failure floor (team lead, 2026-07-30) lets a crisis leave buildings *"temporarily
 * unusable"* and *"reduce civic capacity"* while forbidding it *"permanently remove an earned
 * building"*, so the model needs a state between "contributing" and "gone". These are the
 * assertions that it has one, and that the state is a FLAG rather than a deletion.
 *
 * The Lost Herd is the crisis this is for and it does not exist; era one has no placeable
 * civic building either (the Civic build tab is disabled). So nothing writes the flag today,
 * and that is exactly why it is asserted here — the capacity readout it will feed can be
 * built against a model that already answers the question.
 */
describe("a SUSPENDED civic building keeps its place and contributes nothing", () => {
  const placements = [
    { placementId: "p1", building: SMOKEHOUSE.id },
    { placementId: "p2", building: LONGHOUSE.id },
    { placementId: "p3", building: CAMPFIRE.id },
  ];

  it("withholds exactly the suspended placement's contribution", () => {
    const suspended = placements.map((p) =>
      p.placementId === "p2" ? { ...p, suspended: true } : p,
    );
    // The Longhouse (20 livability, 5 happiness) is withheld and the other two are not.
    expect(civicCityCapacities(suspended, "prehistoric")).toEqual({
      livability: 20,
      happiness: 20,
    });
    expect(civicCityCapacities(placements, "prehistoric")).toEqual({
      livability: 40,
      happiness: 25,
    });
  });

  it("NAMES what is being withheld, so a penalty can be shown rather than only felt", () => {
    const suspended = placements.map((p) =>
      p.placementId === "p2" ? { ...p, suspended: true } : p,
    );
    expect(civicSuspendedCapacity(suspended, "prehistoric")).toEqual({
      livability: 20,
      happiness: 5,
    });
    // The two halves must add back up to the undamaged city, or a readout showing both would
    // be telling the player two numbers that do not reconcile.
    const held = civicCityCapacities(suspended, "prehistoric");
    const withheld = civicSuspendedCapacity(suspended, "prehistoric");
    expect({
      livability: held.livability + withheld.livability,
      happiness: held.happiness + withheld.happiness,
    }).toEqual(civicCityCapacities(placements, "prehistoric"));
  });

  it("reports zero withheld on an undamaged city, so a readout can branch on it", () => {
    expect(civicSuspendedCapacity(placements, "prehistoric")).toEqual({
      livability: 0,
      happiness: 0,
    });
    // `suspended: false` is the same as absent — a flag that had to be deleted rather than
    // set false would make lifting a suspension a different operation from never having one.
    expect(
      civicSuspendedCapacity(
        placements.map((p) => ({ ...p, suspended: false })),
        "prehistoric",
      ),
    ).toEqual({ livability: 0, happiness: 0 });
  });

  it("still DECAYS a suspended building's withheld figure by its age", () => {
    // The withheld amount is what the building would be contributing NOW, not what it
    // contributed when it was built — otherwise lifting a suspension in a later era would
    // restore less than the readout promised.
    const suspended = [{ placementId: "p2", building: LONGHOUSE.id, suspended: true }];
    expect(civicSuspendedCapacity(suspended, "neolithic")).toEqual(
      civicContribution(LONGHOUSE, "neolithic"),
    );
    expect(civicSuspendedCapacity(suspended, "neolithic").livability).toBe(18);
    // Which is strictly less than at home, so the decay really is being applied here rather
    // than this reading as an accident of a single-era fixture.
    expect(civicSuspendedCapacity(suspended, "prehistoric").livability).toBe(20);
  });

  it("leaves OWNERSHIP alone: a suspended building is still the building it was", () => {
    // Suspension is about contribution and never about ownership, which is the half of the
    // ruling that says a crisis may not "permanently remove an earned building". Everything
    // derived from the placement's identity must read identically with the flag set.
    const owned = { placementId: "p2", building: LONGHOUSE.id };
    const damaged = { ...owned, suspended: true };
    expect(civicPlacementEra(damaged)).toBe(civicPlacementEra(owned));
    // And clearing it costs what clearing it always did — a discount for a damaged building
    // would be the economy quietly agreeing it is worth less than an earned one. Asserted
    // against the era ladder's own figure rather than against itself, so this is not a
    // tautology: 25% of the current era's equivalent, rounded up.
    expect(civicTeardownCost(civicBuildingOrThrow(damaged.building), "prehistoric")).toBe(
      Math.ceil(LONGHOUSE.cost * TEARDOWN_COST_FRACTION),
    );
  });
});

describe("a placement's era is DERIVED, never stored", () => {
  it("reads the frozen era off the building id", () => {
    expect(civicPlacementEra({ placementId: "p1", building: LONGHOUSE.id })).toBe(
      "prehistoric",
    );
  });

  it("is total over the catalogue, so no placement can disagree with its id", () => {
    // Era-exclusivity plus never-renovate means the catalogue era IS the built era.
    // Asserted over all forty so the property is the catalogue's, not one row's.
    for (const era of ERA_SEQUENCE) {
      for (const role of CIVIC_ROLES) {
        const building = civicBuildingForRole(era.id, role);
        expect(
          civicPlacementEra({ placementId: "x", building: building.id }),
          building.id,
        ).toBe(era.id);
      }
    }
  });
});

describe("O-4 teardown — 25% of the CURRENT era's cost for that role, no refund", () => {
  it("costs a quarter of the same era's own build, rounded up", () => {
    expect(civicTeardownCost(LONGHOUSE, "prehistoric")).toBe(20);
    expect(TEARDOWN_COST_FRACTION).toBe(0.25);
    expect(20).toBe(Math.ceil(LONGHOUSE.cost * TEARDOWN_COST_FRACTION));
  });

  it("prices an OLD building against the CURRENT era, which is the whole ruling", () => {
    // Era one's Family Lodge cleared in era eight. Priced against its own 80 stone this
    // would be 20 — loose change against an economy in five figures, and a decision
    // nobody would think about. Against era eight's dwelling (18,560) it is 4,640.
    //
    // 3,200 until 2026-07-30, when the per-era cost-variance ruling made era eight's
    // Apartment Tower the dearest of its four at 18,560 rather than 12,800. That the
    // figure MOVED with another era's price is the ruling under test rather than a
    // maintenance cost: O-4 prices against the current era, so it is supposed to.
    expect(civicTeardownCost(LONGHOUSE, "atomic_age")).toBe(4640);
    expect(civicTeardownCost(LONGHOUSE, "atomic_age")).toBeGreaterThan(
      Math.ceil(LONGHOUSE.cost * TEARDOWN_COST_FRACTION),
    );
  });

  it("uses the ROLE's current equivalent, not the building's own price", () => {
    // The food and dwelling rows of era one both cost 80, but their era-ten
    // equivalents differ (40,960 vs 35,840), so clearing them late differs too. If
    // teardown read the original cost these two would be equal.
    expect(civicTeardownCost(SMOKEHOUSE, "cyberpunk")).toBe(10240);
    expect(civicTeardownCost(LONGHOUSE, "cyberpunk")).toBe(8960);
    expect(SMOKEHOUSE.cost).toBe(LONGHOUSE.cost);
  });

  it("is never free, for any of the forty in any of the ten eras", () => {
    // The floor that matters: a rounding rule that produced 0 would make clearing an
    // old quarter free, which is the opposite of "a real decision late on".
    let checked = 0;
    for (const era of ERA_SEQUENCE) {
      for (const role of CIVIC_ROLES) {
        for (const current of ERA_SEQUENCE) {
          const cost = civicTeardownCost(civicBuildingForRole(era.id, role), current.id);
          expect(cost, `${era.id}/${role} cleared in ${current.id}`).toBeGreaterThan(0);
          expect(Number.isInteger(cost)).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(400);
  });

  it("rises monotonically with the era it is cleared in", () => {
    // "Clearing a quarter late is a real decision rather than loose change" as an
    // ordering rather than as two spot values.
    const costs = ERA_SEQUENCE.map((era) => ({
      era: era.id,
      cost: civicTeardownCost(LONGHOUSE, era.id),
    }));
    for (const [index, entry] of costs.entries()) {
      const previous = costs[index - 1];
      if (previous === undefined) {
        continue;
      }
      expect(entry.cost, entry.era).toBeGreaterThan(previous.cost);
    }
  });

  it("is paid in the CURRENT era's material, and every era can name one", () => {
    expect(civicTeardownMaterial("prehistoric")).toBe("stone");
    // This asserted `null` for era ten while minting was gated on authored words, and
    // the null was the defect: an era that mints a material can be torn down in it.
    expect(civicTeardownMaterial("cyberpunk")).toBe("data");
    // Over the whole population, and against the registry rather than a literal list,
    // so the two cannot drift. Ten distinct materials is the floor with a shape — a
    // sweep returning era one's `stone` ten times would satisfy a mere non-null check.
    const materials = ERA_SEQUENCE.map((era) => civicTeardownMaterial(era.id));
    expect(materials.every((material) => material !== null)).toBe(true);
    expect(new Set(materials).size).toBe(10);
    expect(materials).toEqual(ERA_SEQUENCE.map((era) => ERA_MATERIALS[era.id].material.id));
  });
});

describe("purchase — priced from the catalogue, duplicates allowed", () => {
  it("spends the catalogue's cost and leaves the rest of the stockpile", () => {
    const view = withLessons(1);
    expect(materialBalanceOf(view, "stone")).toBe(lessonMaterialAmount("prehistoric"));

    const result = applyCivicPurchase(view, {
      studentId: STUDENT,
      placementId: "plot-1",
      building: LONGHOUSE.id,
      currentEra: "prehistoric",
      nowMs: NOW,
    });
    expect(result.status).toBe("spent");
    expect(result.balance).toBe(100 - LONGHOUSE.cost);
    expect(result.building?.id).toBe(LONGHOUSE.id);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.resource_type).toBe("stone");
    expect(result.rows[0]?.kind).toBe("spend");
  });

  it("takes NO cost from the caller — there is no parameter to inflate", () => {
    // INV-COS-4 structurally: `applyMaterialSpend` accepts a cost because no
    // catalogue existed when it was written; this wrapper is that catalogue, so a
    // client cannot name its own price. A key census on the input, so a `cost`
    // parameter added later fails here.
    const input = {
      studentId: STUDENT,
      placementId: "plot-1",
      building: LONGHOUSE.id,
      currentEra: "prehistoric" as const,
      nowMs: NOW,
    };
    expect(Object.keys(input).sort()).toEqual([
      "building",
      "currentEra",
      "nowMs",
      "placementId",
      "studentId",
    ]);
    expect(applyCivicPurchase(withLessons(1), input).rows[0]?.amount).toBe(LONGHOUSE.cost);
  });

  it("ALLOWS duplicates — a second Family Lodge is a second placement and a second 80", () => {
    let view = withLessons(2); // 200 stone
    for (const placementId of ["plot-1", "plot-2"]) {
      const result = applyCivicPurchase(view, {
        studentId: STUDENT,
        placementId,
        building: LONGHOUSE.id,
        currentEra: "prehistoric",
        nowMs: NOW,
      });
      expect(result.status, placementId).toBe("spent");
      view = appendEntries(view, result.rows);
    }
    expect(materialBalanceOf(view, "stone")).toBe(200 - 2 * LONGHOUSE.cost);
    // And both count toward capacity — the point of allowing them.
    expect(
      civicCityCapacities(
        [
          { placementId: "plot-1", building: LONGHOUSE.id },
          { placementId: "plot-2", building: LONGHOUSE.id },
        ],
        "prehistoric",
      ),
    ).toEqual({ livability: 40, happiness: 10 });
  });

  it("is IDEMPOTENT per placement id, so a replay changes nothing", () => {
    let view = withLessons(2);
    const input = {
      studentId: STUDENT,
      placementId: "plot-1",
      building: LONGHOUSE.id,
      currentEra: "prehistoric" as const,
      nowMs: NOW,
    };
    const first = applyCivicPurchase(view, input);
    view = appendEntries(view, first.rows);
    const replay = applyCivicPurchase(view, input);
    expect(replay.status).toBe("already_spent");
    expect(replay.rows).toEqual([]);
    expect(materialBalanceOf(view, "stone")).toBe(200 - LONGHOUSE.cost);
  });

  it("is ATOMIC on a shortfall — no rows, and the balance is untouched", () => {
    // 100 stone against era one's dearest row at 120.
    const view = withLessons(1);
    const result = applyCivicPurchase(view, {
      studentId: STUDENT,
      placementId: "plot-1",
      building: "prehistoric_storage_pit",
      currentEra: "prehistoric",
      nowMs: NOW,
    });
    expect(result.status).toBe("insufficient_material");
    expect(result.rows).toEqual([]);
    expect(result.building).toBeNull();
    expect(materialBalanceOf(view, "stone")).toBe(100);
  });

  it("refuses a building from another era (era-exclusivity)", () => {
    const result = applyCivicPurchase(withLessons(6), {
      studentId: STUDENT,
      placementId: "plot-1",
      building: "neolithic_granary",
      currentEra: "prehistoric",
      nowMs: NOW,
    });
    expect(result.status).toBe("wrong_era");
    expect(result.rows).toEqual([]);
  });

  it("refuses an unknown id rather than treating it as free", () => {
    const result = applyCivicPurchase(withLessons(6), {
      studentId: STUDENT,
      placementId: "plot-1",
      building: "prehistoric_ghost_hut",
      currentEra: "prehistoric",
      nowMs: NOW,
    });
    expect(result.status).toBe("unknown_building");
    expect(result.rows).toEqual([]);
  });

  it("says 'you cannot afford it' in every era, because every era has a material", () => {
    // This asserted `era_material_unauthored` for era ten. It is now the affordability
    // answer, which is the correct one: era ten mints `data`, so an empty stockpile
    // means saved up too little rather than nothing to save.
    const result = applyCivicPurchase(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      placementId: "plot-1",
      building: "cyberpunk_station",
      currentEra: "cyberpunk",
      nowMs: NOW,
    });
    expect(result.status).toBe("insufficient_material");
    expect(result.status).not.toBe("era_material_unauthored");
    expect(result.rows).toEqual([]);
  });

  it("still reports era_material_unauthored if the registry stops resolving one", () => {
    // **THE STATUS IS UNREACHABLE THROUGH THE SHIPPED REGISTRY NOW, so it is proved by
    // injection rather than left as a branch nothing covers.** It is kept because what
    // it guards changed subject rather than going away: it used to mean "nobody has
    // authored this era's material" and now means "the registry failed to resolve one",
    // which is a defect rather than a state — the same move `materialForEraOrThrow`
    // made. A status no test can reach is a status the next reader deletes.
    const registry = ERA_MATERIALS as unknown as Record<string, { material: unknown }>;
    const saved = registry.cyberpunk;
    try {
      registry.cyberpunk = { material: null };
      const result = applyCivicPurchase(EMPTY_LEDGER_VIEW, {
        studentId: STUDENT,
        placementId: "plot-1",
        building: "cyberpunk_station",
        currentEra: "cyberpunk",
        nowMs: NOW,
      });
      expect(result.status).toBe("era_material_unauthored");
      expect(result.rows).toEqual([]);
      expect(result.building).toBeNull();
    } finally {
      registry.cyberpunk = saved as { material: unknown };
    }
    // And restored, so the injection cannot leak into a later test in this file.
    expect(
      applyCivicPurchase(EMPTY_LEDGER_VIEW, {
        studentId: STUDENT,
        placementId: "plot-1",
        building: "cyberpunk_station",
        currentEra: "cyberpunk",
        nowMs: NOW,
      }).status,
    ).toBe("insufficient_material");
  });

  it("reaches the wallet in every era, over all forty rows and not a sample", () => {
    // The inverse of the census that used to require 36 refusals. Every row of every
    // era now gets an AFFORDABILITY answer rather than a "this era cannot pay" one, so
    // the whole outgoings side is reachable — which is the thing D-5 was blocking.
    let priced = 0;
    for (const era of ERA_SEQUENCE) {
      for (const role of CIVIC_ROLES) {
        const building = civicBuildingForRole(era.id, role);
        const result = applyCivicPurchase(EMPTY_LEDGER_VIEW, {
          studentId: STUDENT,
          placementId: `plot-${building.id}`,
          building: building.id,
          currentEra: era.id,
          nowMs: NOW,
        });
        expect(result.status, building.id).toBe("insufficient_material");
        priced += 1;
      }
    }
    expect(priced).toBe(40);
    expect(ERA_SEQUENCE.length).toBe(10);
  });

  it("lets a purchase SUCCEED in every era, given that era's own stockpile", () => {
    // The census that used to read `["prehistoric"]`. Refusing for want of a balance is
    // not the same as being buyable, so this funds each era's food row from its own
    // material and asserts the spend actually lands — the claim "the economy works in
    // all ten eras" reduces to this line.
    const buyable = ERA_SEQUENCE.filter((era) => {
      const building = civicBuildingForRole(era.id, "food");
      const funded = appendEntries(EMPTY_LEDGER_VIEW, [
        {
          student_id: STUDENT,
          event_id: `fund:${era.id}`,
          resource_type: ERA_MATERIALS[era.id].material.id,
          kind: "grant",
          amount: building.cost,
          reason_code: "lesson_complete",
          created_at: new Date(NOW).toISOString(),
        },
      ]);
      const result = applyCivicPurchase(funded, {
        studentId: STUDENT,
        placementId: `p-${era.id}`,
        building: building.id,
        currentEra: era.id,
        nowMs: NOW,
      });
      return (
        result.status === "spent" &&
        result.balance === 0 &&
        result.rows[0]?.resource_type === ERA_MATERIALS[era.id].material.id
      );
    }).map((era) => era.id);
    expect(buyable).toEqual(ERA_SEQUENCE.map((era) => era.id));
    expect(buyable).toHaveLength(10);
  });

  it("orders its checks world-first, so a bad id never reads as unaffordable", () => {
    // An unknown id in an era with no material must report the id, and a wrong-era
    // building must report the era — a caller that showed "save up more stone" for
    // either would be lying about what is wrong.
    expect(
      applyCivicPurchase(EMPTY_LEDGER_VIEW, {
        studentId: STUDENT,
        placementId: "p",
        building: "not_a_building",
        currentEra: "cyberpunk",
        nowMs: NOW,
      }).status,
    ).toBe("unknown_building");
    expect(
      applyCivicPurchase(EMPTY_LEDGER_VIEW, {
        studentId: STUDENT,
        placementId: "p",
        building: "prehistoric_longhouse",
        currentEra: "cyberpunk",
        nowMs: NOW,
      }).status,
    ).toBe("wrong_era");
  });
});

describe("the era ladder these mechanics ride on", () => {
  it("numbers eras from one, so a decay of zero eras behind is the current era", () => {
    expect(eraNumber("prehistoric")).toBe(1);
    expect(eraNumber("cyberpunk")).toBe(ERA_SEQUENCE.length);
  });
});
