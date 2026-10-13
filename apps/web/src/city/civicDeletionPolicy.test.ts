import { materialForEra } from "@cr/economy";
import { ERA_SEQUENCE, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it, vi } from "vitest";

import type { EconomyClient, WalletView } from "../economy/economyClient";
import { createApiCitySession } from "./apiCitySession";
import { type CityDevSnapshot, createCityDevSession } from "./citySession";
import { civicOptionsForEra } from "./civicBuildings";
import { createCivicMaterialEconomy } from "./civicEconomy";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";

const CIVIC_ID = "civic:prehistoric_campfire:0";
const CIVIC_PLACEMENT = { nodeId: CIVIC_ID, col: 4, row: 0, rot: 0 } as const;
const SKILL_PLACEMENT = { nodeId: "NUM.S", col: -4, row: 0, rot: 0 } as const;
const SPENT_MATERIAL = 137;

function cityWithPaidCivic(): ReturnType<typeof createCityDevSession> {
  const snapshot: CityDevSnapshot = {
    node_states: [],
    neighborhood_states: [],
    placements: [SKILL_PLACEMENT],
    town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
    civic: [CIVIC_PLACEMENT],
    civic_material_spent: SPENT_MATERIAL,
  };
  return createCityDevSession(snapshot);
}

describe("core civic deletion policy", () => {
  it("keeps behavior-scoped population floors for skills, civics, and the Town Hall", () => {
    const skillIds = getProductNodes().map((node) => node.id);
    const civicTypeIds = ERA_SEQUENCE.flatMap((era) =>
      civicOptionsForEra(era.id).map((option) => option.row.id),
    );

    expect(
      skillIds.length,
      "the skill-forbidden population lost product nodes",
    ).toBeGreaterThanOrEqual(62);
    expect(
      civicTypeIds.length,
      "the civic-allowed population lost authored catalogue rows",
    ).toBeGreaterThanOrEqual(36);
    expect(new Set(civicTypeIds).size).toBe(civicTypeIds.length);
    expect(
      [TOWN_HALL_ID],
      "the protected infrastructure population changed shape",
    ).toHaveLength(1);
  });

  it("removes a civic idempotently without changing its sunk material", async () => {
    const session = cityWithPaidCivic();
    const before = await session.load();
    const material = materialForEra("prehistoric");
    if (!material) {
      throw new Error("Prehistoric has no material for the wallet invariant.");
    }
    const wallet: WalletView = {
      materials: { [material.id]: 500 },
      spendable: 500,
      spendableMaterial: material,
    };
    const economy = createCivicMaterialEconomy(
      { getWallet: async () => wallet } as EconomyClient,
      session.civicMaterialSpent,
      "prehistoric",
    );
    const walletBefore = structuredClone(await economy.getWallet());
    await expect(session.removeCivic(SKILL_PLACEMENT.nodeId)).resolves.toMatchObject({
      status: "missing",
    });
    await expect(session.removeCivic(TOWN_HALL_ID)).resolves.toMatchObject({
      status: "missing",
    });
    expect((await session.load()).placements).toContainEqual(SKILL_PLACEMENT);
    expect((await session.load()).town_hall?.nodeId).toBe(TOWN_HALL_ID);

    await expect(session.removeCivic(CIVIC_ID)).resolves.toEqual({
      placementId: CIVIC_ID,
      status: "removed",
    });
    expect((await session.load()).civic).toEqual([]);
    expect(session.civicMaterialSpent()).toBe(SPENT_MATERIAL);

    await expect(session.removeCivic(CIVIC_ID)).resolves.toEqual({
      placementId: CIVIC_ID,
      status: "missing",
    });
    expect(session.civicMaterialSpent()).toBe(SPENT_MATERIAL);
    expect(before.civic_material_spent).toBe((await session.load()).civic_material_spent);
    expect(await economy.getWallet()).toEqual(walletBefore);
  });

  it("rolls an account deletion back on save failure and lets the exact retry land", async () => {
    const source = cityWithPaidCivic();
    const saves: unknown[] = [];
    const save = vi
      .fn<(city: unknown) => Promise<void>>()
      .mockImplementationOnce(async (city) => {
        saves.push(city);
        throw new Error("save unavailable");
      })
      .mockImplementationOnce(async (city) => {
        saves.push(city);
      });
    const account = createApiCitySession({
      studentId: "account-civic-deletion",
      load: source.load,
      save,
      eraId: () => "prehistoric",
      debounceMs: 0,
    });

    await expect(account.removeCivic(CIVIC_ID)).rejects.toThrow(/save unavailable/i);
    expect((await account.load()).civic).toEqual([CIVIC_PLACEMENT]);
    expect(account.civicMaterialSpent()).toBe(SPENT_MATERIAL);

    await expect(account.removeCivic(CIVIC_ID)).resolves.toMatchObject({
      status: "removed",
    });
    expect((await account.load()).civic).toEqual([]);
    expect(account.civicMaterialSpent()).toBe(SPENT_MATERIAL);
    expect(save).toHaveBeenCalledTimes(2);
    expect(saves).toHaveLength(2);
  });
});
