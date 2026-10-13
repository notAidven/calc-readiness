import { applyRecordVerification, foldCrisisDamage, NO_CRISIS_DAMAGE } from "@cr/game";
import { describe, expect, it } from "vitest";

import { createApiCitySession, type CityWritePayload } from "./apiCitySession";
import { createCityDevSession } from "./citySession";
import type { CityLoad } from "./types";

const RELAY_PLACEMENT = "information_age_civic_archive_relay_1";

function relayReport(bandsDark: number) {
  return {
    buildings: [],
    cells: [],
    overwritten_records: [{ placement_id: RELAY_PLACEMENT, bands_dark: bandsDark }],
  } as const;
}

describe("the relay scar and verification persistence", () => {
  it("records no scar for a whole record and persists a partial record exactly", () => {
    expect(foldCrisisDamage(NO_CRISIS_DAMAGE, relayReport(0)).overwritten_records).toEqual(
      [],
    );

    const damaged = foldCrisisDamage(NO_CRISIS_DAMAGE, relayReport(4));
    expect(damaged.overwritten_records).toEqual([
      {
        placement_id: RELAY_PLACEMENT,
        damage_id: "d1",
        bands_dark: 4,
        verification_attempted: false,
      },
    ]);
  });

  it("writes back one band per verification answer, only once, keyed by damage id", () => {
    const damaged = foldCrisisDamage(NO_CRISIS_DAMAGE, relayReport(4));
    const verified = applyRecordVerification(damaged, "d1", 2);
    expect(verified.overwritten_records[0]).toMatchObject({
      bands_dark: 2,
      verification_attempted: true,
    });
    expect(applyRecordVerification(verified, "d1", 3)).toBe(verified);
    expect(applyRecordVerification(damaged, "unknown", 3)).toBe(damaged);
  });

  it("survives an exact dev-session save and reload, including a spent verification", async () => {
    const first = createCityDevSession();
    await first.recordCrisisDamage(relayReport(6));
    await first.verifyOverwrittenRecord("d1", 0);
    const saved = await first.load();

    const restored = createCityDevSession({
      node_states: saved.node_states,
      neighborhood_states: saved.neighborhood_state ? [saved.neighborhood_state] : [],
      placements: saved.placements ?? [],
      roads: saved.roads ?? [],
      road_gold_spent: saved.road_gold_spent ?? 0,
      town_hall: saved.town_hall ?? null,
      civic: saved.civic ?? [],
      civic_material_spent: saved.civic_material_spent ?? 0,
      crisis_damage: saved.crisis_damage,
    });

    expect((await restored.load()).crisis_damage?.overwritten_records).toEqual([
      {
        placement_id: RELAY_PLACEMENT,
        damage_id: "d1",
        bands_dark: 6,
        verification_attempted: true,
      },
    ]);
  });

  it("mirrors the scar and spent verification through authoritative signed-in persistence", async () => {
    const base: CityLoad = {
      node_states: [],
      neighborhood_state: null,
      placements: [],
      civic: [],
      roads: [],
      road_gold_spent: 0,
      town_hall: null,
      crisis_damage: NO_CRISIS_DAMAGE,
    };
    const writes: CityWritePayload[] = [];
    const session = createApiCitySession({
      studentId: "00000000-0000-4000-8000-000000000009",
      load: async () => base,
      save: async (city) => {
        writes.push(city);
      },
      eraId: () => "information_age",
      debounceMs: 60_000,
    });

    await session.recordCrisisDamage(relayReport(5));
    await session.verifyOverwrittenRecord("d1", 3);
    await session.flush();

    expect(writes).toHaveLength(1);
    expect(writes.at(0)?.crisis_damage?.overwritten_records).toEqual([
      {
        placement_id: RELAY_PLACEMENT,
        damage_id: "d1",
        bands_dark: 2,
        verification_attempted: true,
      },
    ]);
  });
});
