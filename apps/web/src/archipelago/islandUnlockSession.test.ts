import { ERA_SEQUENCE } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { eraPlacementFromSeed, seedPlacingAtEra } from "../catchup/eraPlacement";
import { type CityDevSnapshot, createCityDevSession } from "../city/citySession";
import { TOWN_HALL_ID } from "../city/townHall";
import { cityEraId, resetCityEra } from "../city/useCityEra";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";

const FIRST = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
const SECOND = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];
const FOURTH = ERA_SEQUENCE[3] as (typeof ERA_SEQUENCE)[number];

let session: ArchipelagoSession | null = null;

beforeEach(resetCityEra);
afterEach(() => {
  session?.dispose();
  session = null;
  resetCityEra();
});

function build(
  options: {
    readonly stashed?: Parameters<typeof createArchipelagoSession>[0]["stashed"];
    readonly onFound?: (eraId: (typeof ERA_SEQUENCE)[number]["id"]) => void;
    readonly onChange?: Parameters<typeof createArchipelagoSession>[0]["onChange"];
    readonly onLand?: Parameters<typeof createArchipelagoSession>[0]["onLand"];
  } = {},
): ArchipelagoSession {
  return createArchipelagoSession({
    initial: createCityDevSession(null),
    makeIsland: (snapshot: CityDevSnapshot) => createCityDevSession(snapshot),
    ...options,
  });
}

describe("passing unlocks a destination without forcing travel", () => {
  it("refuses account-style travel until explicit founding authority succeeds", async () => {
    const founded: unknown[] = [];
    session = createArchipelagoSession({
      initial: createCityDevSession(null),
      makeIsland: (snapshot) => createCityDevSession(snapshot),
      requireExplicitFoundingAuthority: true,
      onFound: (eraId, authority) => {
        founded.push([eraId, authority]);
      },
    });

    await session.sailTo(SECOND.id);
    expect(session.standing()).toBe(FIRST.id);
    expect(session.islands()).toEqual([FIRST.id]);
    expect(founded).toEqual([]);

    await session.unlockIsland(SECOND.id, { source: "diagnostic" });
    expect(founded).toEqual([[SECOND.id, { source: "diagnostic" }]]);
    await session.sailTo(SECOND.id);
    expect(session.standing()).toBe(SECOND.id);
  });

  it("founds exactly once, keeps the standing island, and Sail explicitly advances", async () => {
    const founded: string[] = [];
    const changed: string[][] = [];
    session = build({
      onFound: (eraId) => founded.push(eraId),
      onChange: (state) => changed.push(state.islands.map((island) => island.eraId)),
    });

    await session.unlockIsland(SECOND.id);
    await session.unlockIsland(SECOND.id);

    expect(session.standing()).toBe(FIRST.id);
    expect(session.islands()).toEqual([FIRST.id, SECOND.id]);
    expect(founded).toEqual([SECOND.id]);
    expect(changed).toEqual([[FIRST.id, SECOND.id]]);
    expect(session.snapshot().islands[1]?.layout.town_hall?.nodeId).toBe(TOWN_HALL_ID);

    await session.sailTo(SECOND.id);
    expect(session.standing()).toBe(SECOND.id);
  });

  it("Keep Learning is a no-op on standing era while the destination stays founded", async () => {
    session = build();
    await session.unlockIsland(SECOND.id);

    const beforeKeepLearning = session.snapshot();
    // The product's Keep Learning action deliberately performs no navigation write.
    const afterKeepLearning = session.snapshot();

    expect(afterKeepLearning).toBe(beforeKeepLearning);
    expect(afterKeepLearning.standing).toBe(FIRST.id);
    expect(afterKeepLearning.islands.map((island) => island.eraId)).toEqual([
      FIRST.id,
      SECOND.id,
    ]);
  });

  it("a refresh/replay restores the founded destination and cannot found or award it again", async () => {
    const firstGrants: string[] = [];
    session = build({ onFound: (eraId) => firstGrants.push(eraId) });
    await session.unlockIsland(SECOND.id);
    const stashed = session
      .snapshot()
      .islands.filter((island) => island.eraId !== FIRST.id);
    session.dispose();

    const replayGrants: string[] = [];
    session = build({
      stashed,
      onFound: (eraId) => replayGrants.push(eraId),
    });
    await session.unlockIsland(SECOND.id);

    expect(firstGrants).toEqual([SECOND.id]);
    expect(replayGrants).toEqual([]);
    expect(session.standing()).toBe(FIRST.id);
    expect(session.islands()).toEqual([FIRST.id, SECOND.id]);
  });

  it("keeps standing and era transactional when durable Sail fails, then retries once", async () => {
    let offline = true;
    const landings: string[] = [];
    const founded: string[] = [];
    session = build({
      onFound: (eraId) => founded.push(eraId),
      onLand: async (eraId) => {
        landings.push(eraId);
        if (offline) {
          throw new Error("offline save");
        }
      },
    });
    await session.unlockIsland(SECOND.id);

    await expect(session.sailTo(SECOND.id)).rejects.toThrow("offline save");
    expect(session.standing()).toBe(FIRST.id);
    expect(cityEraId()).toBe(FIRST.id);
    expect(founded).toEqual([SECOND.id]);

    // A rejected landing must not poison later reads or a coalesced retry.
    await expect(session.load()).resolves.toBeDefined();
    offline = false;
    await Promise.all([session.sailTo(SECOND.id), session.sailTo(SECOND.id)]);
    expect(session.standing()).toBe(SECOND.id);
    expect(cityEraId()).toBe(SECOND.id);
    expect(landings).toEqual([SECOND.id, SECOND.id]);
    expect(founded).toEqual([SECOND.id]);
  });
});

describe("diagnostic placement bypasses island exams for the skipped prefix", () => {
  it("unlocks through the destination atomically, retries, and replays without duplicate grants", async () => {
    const placement = eraPlacementFromSeed(seedPlacingAtEra(FOURTH.id));
    expect(placement.skipped).toEqual(ERA_SEQUENCE.slice(0, 3).map((era) => era.id));
    expect(placement.skipped.length).toBeGreaterThanOrEqual(3);
    const expected = ERA_SEQUENCE.slice(0, 4).map((era) => era.id);
    let offline = true;
    const grants: string[] = [];

    session = build({
      onFound: (eraId) => {
        grants.push(eraId);
        if (offline && eraId === expected[2]) {
          throw new Error("transient founding failure");
        }
      },
    });
    await expect(session.unlockDiagnosticPrefix(expected)).rejects.toThrow(
      "transient founding failure",
    );
    expect(session.islands()).toEqual([FIRST.id]);

    offline = false;
    await session.unlockDiagnosticPrefix(expected);
    const grantsAfterRetry = [...grants];
    await session.unlockDiagnosticPrefix(expected);

    expect(session.islands()).toEqual(expected);
    expect(session.islands()).not.toContain(ERA_SEQUENCE[expected.length]?.id);
    expect(session.standing()).toBe(FIRST.id);
    expect(grants).toEqual(grantsAfterRetry);
    expect(
      session.snapshot().islands.map((island) => island.layout.town_hall?.nodeId),
    ).toEqual(expected.map(() => TOWN_HALL_ID));
  });
});
