import {
  buildEventIdFor,
  type CivicBuildingDefinition,
  civicBuildingOrThrow,
  civicCatalogueForEra,
} from "@cr/economy";
import { buildCityViewModel } from "@cr/game";
import { getEraNodes } from "@cr/skill-graph";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CivicPurchaseAsk, CivicPurchaseOutcome } from "../economy/economyClient";
import { createInMemoryEconomyClient } from "../economy/economySession";
import * as citizenAdapters from "./citizens";
import { cityCitizenRoster, cityVitality } from "./citizens";
import {
  type CityDevSession,
  type CivicPurchaseResult,
  createCityDevSession,
} from "./citySession";
import { cityEraId, resetCityEra, setCityEra } from "./useCityEra";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  occupiedCells,
  type PlacedTransform,
  type Transform,
} from "./worldLayout";

type PayForCivic = (ask: CivicPurchaseAsk) => Promise<CivicPurchaseOutcome>;
type LedgerBackedPlace = (
  buildingId: string,
  transform: Transform,
  pay: PayForCivic,
) => Promise<CivicPurchaseResult>;

function placeWithLedger(
  session: CityDevSession,
  buildingId: string,
  transform: Transform,
  pay: PayForCivic,
): Promise<CivicPurchaseResult> {
  return (session.placeCivic as unknown as LedgerBackedPlace)(buildingId, transform, pay);
}

async function openSpot(
  session: CityDevSession,
  row: CivicBuildingDefinition,
): Promise<Transform> {
  const load = await session.load();
  const occupants: PlacedTransform[] = [
    ...(load.placements ?? []),
    ...(load.town_hall ? [load.town_hall] : []),
    ...(load.civic ?? []),
  ];
  const spot = findOpenCell(
    { w: row.footprint.width, d: row.footprint.depth },
    occupiedCells(occupants),
    BUILDABLE_RADIUS,
  );
  if (spot === null) {
    throw new Error(`no legal spot for ${row.id}`);
  }
  return spot;
}

async function fundedBronzeEconomy() {
  setCityEra("bronze_age");
  const client = createInMemoryEconomyClient();
  await client.reportLessonComplete({ nodeId: "LIN.1" });
  await client.reportLessonComplete({ nodeId: "LIN.3" });
  return client;
}

async function fundedMedievalEconomy() {
  setCityEra("medieval");
  const client = createInMemoryEconomyClient();
  for (const nodeId of getEraNodes("medieval")) {
    await client.reportLessonComplete({ nodeId });
  }
  return client;
}

async function fundedIndustrialEconomy() {
  setCityEra("industrial");
  const client = createInMemoryEconomyClient();
  for (const nodeId of getEraNodes("industrial")) {
    await client.reportLessonComplete({ nodeId });
  }
  return client;
}

function learningBytes(load: Awaited<ReturnType<CityDevSession["load"]>>): string {
  return JSON.stringify({
    node_states: load.node_states,
    neighborhood_state: load.neighborhood_state ?? null,
    era_id: cityEraId(),
  });
}

function contributionRowsOf(
  civic: readonly PlacedTransform[],
): readonly { livability: number; happiness: number }[] {
  const candidate = (
    citizenAdapters as typeof citizenAdapters & {
      civicContributionRowsOf?: (
        civic: readonly PlacedTransform[],
      ) => readonly { livability: number; happiness: number }[];
    }
  ).civicContributionRowsOf;
  expect(
    candidate,
    "the web boundary resolves explicit civic contribution rows",
  ).toBeTypeOf("function");
  return (candidate as NonNullable<typeof candidate>)(civic);
}

afterEach(() => {
  resetCityEra();
  vi.restoreAllMocks();
});

describe("current-era civic purchase transaction", () => {
  it("buys a Bronze civic through the real ledger and commits its canonical placement", async () => {
    const row = civicBuildingOrThrow("bronze_age_terraced_fields");
    const economy = await fundedBronzeEconomy();
    const session = createCityDevSession();
    const before = await session.load();
    expect((await economy.getWallet()).spendable).toBeGreaterThanOrEqual(row.cost);

    const attempted = await placeWithLedger(
      session,
      row.id,
      await openSpot(session, row),
      (ask) => economy.purchaseCivicBuilding(ask),
    ).then(
      (value) => ({ value, error: null }),
      (error: unknown) => ({ value: null, error }),
    );

    expect(attempted.error, "the canonical Bronze row must not throw").toBeNull();
    const result = attempted.value as CivicPurchaseResult;
    expect(result.status).toBe("built");
    expect(result.cost).toBe(row.cost);
    expect(result.placementId).toBe("civic:bronze_age_terraced_fields:0");

    const after = await session.load();
    expect(after.civic).toEqual([expect.objectContaining({ nodeId: result.placementId })]);
    expect(learningBytes(after)).toBe(learningBytes(before));
    expect(session.civicMaterialSpent()).toBe(0);

    const spendRows = economy.snapshot().entries.filter((entry) => entry.kind === "spend");
    expect(spendRows).toHaveLength(1);
    expect(spendRows[0]?.event_id).toBe(buildEventIdFor(result.placementId as string));
    expect(spendRows[0]?.reason_code).toBe(`build:${result.placementId}`);
    expect(spendRows[0]?.resource_type).toBe("bronze");
    expect(spendRows[0]?.amount).toBe(row.cost);

    const moved = await openSpot(session, row);
    await session.moveCivic(result.placementId as string, moved);
    expect((await session.load()).civic).toEqual([
      { nodeId: result.placementId, ...moved },
    ]);
    expect(
      economy.snapshot().entries.filter((entry) => entry.kind === "spend"),
    ).toHaveLength(1);
  });

  it("buys all four Medieval civic rows through the ledger and places each canonical id", async () => {
    const rows = civicCatalogueForEra("medieval");
    expect(rows).toHaveLength(4);
    const economy = await fundedMedievalEconomy();
    const session = createCityDevSession();
    expect((await economy.getWallet()).spendable).toBeGreaterThanOrEqual(
      rows.reduce((sum, row) => sum + row.cost, 0),
    );

    const results: CivicPurchaseResult[] = [];
    for (const row of rows) {
      results.push(
        await placeWithLedger(session, row.id, await openSpot(session, row), (ask) =>
          economy.purchaseCivicBuilding(ask),
        ),
      );
    }

    expect(results.map((result) => result.status)).toEqual([
      "built",
      "built",
      "built",
      "built",
    ]);
    expect(results.map((result) => result.placementId)).toEqual(
      rows.map((row, index) => `civic:${row.id}:${index}`),
    );
    expect((await session.load()).civic).toHaveLength(4);
    expect(
      economy.snapshot().entries.filter((entry) => entry.kind === "spend"),
    ).toHaveLength(4);
  });

  it("buys, places, and moves the exact four Industrial civic rows without a second debit", async () => {
    const rows = civicCatalogueForEra("industrial");
    expect(rows.map((row) => row.id)).toEqual([
      "industrial_cold_store",
      "industrial_workers_houses",
      "industrial_public_baths",
      "industrial_library",
    ]);
    const economy = await fundedIndustrialEconomy();
    const session = createCityDevSession();
    expect((await economy.getWallet()).spendable).toBeGreaterThanOrEqual(
      rows.reduce((sum, row) => sum + row.cost, 0),
    );

    const results: CivicPurchaseResult[] = [];
    for (const row of rows) {
      results.push(
        await placeWithLedger(session, row.id, await openSpot(session, row), (ask) =>
          economy.purchaseCivicBuilding(ask),
        ),
      );
    }
    expect(results.map((result) => result.status)).toEqual(rows.map(() => "built"));
    expect(results.map((result) => result.placementId)).toEqual(
      rows.map((row, index) => `civic:${row.id}:${index}`),
    );

    const first = results[0]?.placementId as string;
    const moved = await openSpot(session, rows[0] as CivicBuildingDefinition);
    await session.moveCivic(first, moved);
    expect((await session.load()).civic).toContainEqual({ nodeId: first, ...moved });
    expect(
      economy.snapshot().entries.filter((entry) => entry.kind === "spend"),
    ).toHaveLength(4);
  });

  it("refuses every wrong-era row before payment, placement, or sequence mint", async () => {
    setCityEra("neolithic");
    const session = createCityDevSession();
    const bronze = civicBuildingOrThrow("bronze_age_weigh_house");
    const pay = vi.fn<PayForCivic>();

    const attempted = await placeWithLedger(
      session,
      bronze.id,
      await openSpot(session, bronze),
      pay,
    ).then(
      (value) => ({ value, error: null }),
      (error: unknown) => ({ value: null, error }),
    );

    expect(attempted.error, "wrong-era is a named refusal, not a throw").toBeNull();
    expect(attempted.value).toMatchObject({
      status: "wrong_era",
      placementId: null,
      cost: bronze.cost,
    });
    expect(pay).not.toHaveBeenCalled();
    expect((await session.load()).civic).toEqual([]);
  });

  it("buys duplicate types under distinct structured ids and distinct ledger debits", async () => {
    const row = civicBuildingOrThrow("bronze_age_terraced_fields");
    const economy = await fundedBronzeEconomy();
    const session = createCityDevSession();
    const pay: PayForCivic = (ask) => economy.purchaseCivicBuilding(ask);

    const first = await placeWithLedger(session, row.id, await openSpot(session, row), pay);
    const second = await placeWithLedger(
      session,
      row.id,
      await openSpot(session, row),
      pay,
    );

    expect([first.status, second.status]).toEqual(["built", "built"]);
    expect([first.placementId, second.placementId]).toEqual([
      "civic:bronze_age_terraced_fields:0",
      "civic:bronze_age_terraced_fields:1",
    ]);
    const debits = economy.snapshot().entries.filter((entry) => entry.kind === "spend");
    expect(debits).toHaveLength(2);
    expect(new Set(debits.map((entry) => entry.event_id)).size).toBe(2);
  });

  it("normalizes an already-paid placement into the one missing city commit", async () => {
    const row = civicBuildingOrThrow("bronze_age_terraced_fields");
    const economy = await fundedBronzeEconomy();
    const session = createCityDevSession();
    const placementId = "civic:bronze_age_terraced_fields:0";
    const prepaid = await economy.purchaseCivicBuilding({
      placementId,
      building: row.id,
    });
    expect(prepaid.status).toBe("spent");

    const result = await placeWithLedger(
      session,
      row.id,
      await openSpot(session, row),
      (ask) => economy.purchaseCivicBuilding(ask),
    );

    expect(result).toMatchObject({
      status: "built",
      placementId,
      cost: row.cost,
      economyStatus: "already_spent",
    });
    expect((await session.load()).civic).toHaveLength(1);
    expect(
      economy.snapshot().entries.filter((entry) => entry.kind === "spend"),
    ).toHaveLength(1);
  });

  it("fails closed before payment for unknown, unavailable, and spatially invalid asks", async () => {
    const pay = vi.fn<PayForCivic>();
    const session = createCityDevSession();

    setCityEra("bronze_age");
    expect(
      await placeWithLedger(session, "not_a_civic", { col: 0, row: 0, rot: 0 }, pay),
    ).toMatchObject({ status: "unknown_type", placementId: null });
    const bronze = civicBuildingOrThrow("bronze_age_bathhouse");
    expect(
      await placeWithLedger(session, bronze.id, { col: 999, row: 999, rot: 0 }, pay),
    ).toMatchObject({ status: "refused", refusal: "bounds", placementId: null });

    setCityEra("renaissance");
    const unavailable = civicBuildingOrThrow("renaissance_covered_market");
    expect(
      await placeWithLedger(
        session,
        unavailable.id,
        await openSpot(session, unavailable),
        pay,
      ),
    ).toMatchObject({ status: "unavailable", placementId: null });
    expect(pay).not.toHaveBeenCalled();
    expect((await session.load()).civic).toEqual([]);
  });

  it("serializes other layout writes while payment is in flight", async () => {
    setCityEra("bronze_age");
    const row = civicBuildingOrThrow("bronze_age_terraced_fields");
    const session = createCityDevSession();
    const spot = await openSpot(session, row);
    let release!: (outcome: CivicPurchaseOutcome) => void;
    const pendingPayment = new Promise<CivicPurchaseOutcome>((resolve) => {
      release = resolve;
    });
    const pay = vi.fn<PayForCivic>(() => pendingPayment);

    const purchase = placeWithLedger(session, row.id, spot, pay);
    await vi.waitFor(() => expect(pay).toHaveBeenCalledTimes(1));
    const competing = session.placeSkill("LIN.1", spot);
    release({
      status: "spent",
      spendable: 10_000 - row.cost,
      cost: row.cost,
      building: row,
    });
    await purchase;
    await competing;

    const load = await session.load();
    expect(load.civic).toHaveLength(1);
    expect(load.placements?.map((placement) => placement.nodeId)).not.toContain("LIN.1");
  });

  it("serializes a fresh diagnostic reset behind an in-flight payment", async () => {
    setCityEra("bronze_age");
    const row = civicBuildingOrThrow("bronze_age_terraced_fields");
    const session = createCityDevSession();
    const spot = await openSpot(session, row);
    let release!: (outcome: CivicPurchaseOutcome) => void;
    const pendingPayment = new Promise<CivicPurchaseOutcome>((resolve) => {
      release = resolve;
    });
    const pay = vi.fn<PayForCivic>(() => pendingPayment);

    const purchase = placeWithLedger(session, row.id, spot, pay);
    await vi.waitFor(() => expect(pay).toHaveBeenCalledTimes(1));
    session.seedFromPlacement({}, []);
    release({
      status: "spent",
      spendable: 10_000 - row.cost,
      cost: row.cost,
      building: row,
    });
    await purchase;

    expect((await session.load()).civic).toEqual([]);
  });

  it("changes vitality by the exact Bronze catalogue row and changes no learning bytes", async () => {
    const row = civicBuildingOrThrow("bronze_age_walled_houses");
    const economy = await fundedBronzeEconomy();
    const session = createCityDevSession();
    const before = await session.load();
    const beforeVm = buildCityViewModel({
      node_states: before.node_states,
      neighborhood_state: before.neighborhood_state ?? null,
      era_id: "bronze_age",
    });
    const vitalityBefore = cityVitality({
      viewModel: beforeVm,
      placements: before.placements ?? [],
      civic: contributionRowsOf(before.civic ?? []),
    });
    const rosterBefore = cityCitizenRoster({
      viewModel: beforeVm,
      placements: before.placements ?? [],
      civic: before.civic ?? [],
    });

    const result = await placeWithLedger(
      session,
      row.id,
      await openSpot(session, row),
      (ask) => economy.purchaseCivicBuilding(ask),
    );
    expect(result.status).toBe("built");

    const after = await session.load();
    const afterVm = buildCityViewModel({
      node_states: after.node_states,
      neighborhood_state: after.neighborhood_state ?? null,
      era_id: "bronze_age",
    });
    const vitalityAfter = cityVitality({
      viewModel: afterVm,
      placements: after.placements ?? [],
      civic: contributionRowsOf(after.civic ?? []),
    });
    const rosterAfter = cityCitizenRoster({
      viewModel: afterVm,
      placements: after.placements ?? [],
      civic: after.civic ?? [],
    });

    expect(vitalityAfter.livability.sustains - vitalityBefore.livability.sustains).toBe(
      row.provides.livability,
    );
    expect(vitalityAfter.happiness.coverage - vitalityBefore.happiness.coverage).toBe(
      row.provides.happiness,
    );
    expect(learningBytes(after)).toBe(learningBytes(before));
    expect(rosterAfter.population).toBe(rosterBefore.population);
    expect(
      rosterAfter.buildings.find((building) => building.node_id === result.placementId)
        ?.role,
    ).toBe("residence");
  });

  it("spends nothing when the ledger reports insufficient material", async () => {
    setCityEra("bronze_age");
    const row = civicBuildingOrThrow("bronze_age_bathhouse");
    const session = createCityDevSession();
    const economy = createInMemoryEconomyClient();
    const beforeWallet = await economy.getWallet();

    const result = await placeWithLedger(
      session,
      row.id,
      await openSpot(session, row),
      (ask) => economy.purchaseCivicBuilding(ask),
    );

    expect(result.status).toBe("insufficient_material");
    expect(result.placementId).toBeNull();
    expect((await session.load()).civic).toEqual([]);
    expect(await economy.getWallet()).toEqual(beforeWallet);
    expect(economy.snapshot().entries).toEqual([]);
  });
});
