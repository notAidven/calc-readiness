import {
  createSuccession,
  SUCCESSION_LIVE_CITY_BOARD,
  type SuccessionState,
  successionReducer,
} from "@cr/game";
import type { StudentNodeState } from "@cr/state-schema";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { civicPlacementId } from "../city/civic";
import { createCityDevSession } from "../city/citySession";
import { CitySurface } from "../city/CitySurface";
import { SuccessionInCity } from "../city/three/SuccessionInCity";
import { resetCityEra, setCityEraForPreview } from "../city/useCityEra";
import { successionCityRoster } from "./successionCity";
import {
  createLocalSuccessionSession,
  type SuccessionBattleSnapshot,
  type SuccessionSession,
} from "./successionSession";

const CIVIC = civicPlacementId("classical_baths", 0);
const POLITICAL_PLACEMENTS = [
  { nodeId: "POL.1", col: -4, row: -3, rot: 0 },
  { nodeId: "POL.2", col: 3, row: -3, rot: 1 },
  { nodeId: "POL.3", col: -3, row: 3, rot: 2 },
] as const;
const CITY = {
  nodeStates: POLITICAL_PLACEMENTS.map(
    (placement): StudentNodeState => ({
      student_id: "succession-test",
      node_id: placement.nodeId,
      placement_estimate: 0,
      mastery: 2,
      mastery_updated_at: "2026-08-10T00:00:00.000Z",
      completion_status: "complete",
      lesson_stage: "done",
      last_practiced_at: "2026-08-10T00:00:00.000Z",
    }),
  ),
  placements: POLITICAL_PLACEMENTS,
  civic: [{ nodeId: CIVIC, col: 4, row: 3, rot: 0 }],
} as const;

beforeEach(() => {
  setCityEraForPreview("classical");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
});

function battleSession(initial: SuccessionState): SuccessionSession {
  const battle: SuccessionBattleSnapshot = {
    revision: 1,
    state: initial,
    active_batch: null,
    verdicts: [],
  };
  return {
    async load() {
      return { battle };
    },
    async command(command) {
      if (command.type !== "start") {
        throw new Error(`unexpected command ${command.type}`);
      }
      return { battle };
    },
  };
}

function settle(state: SuccessionState): SuccessionState {
  let next = state;
  while (next.phase !== "settled") {
    if (next.phase === "ready") {
      next = successionReducer(next, { type: "start_batch" });
    } else if (next.phase === "answering") {
      next = successionReducer(next, { type: "resolve_batch", correct: 0, asked: 3 });
    } else {
      next = successionReducer(next, { type: "finish_response" });
    }
  }
  return next;
}

describe("the Succession on the city session it belongs to", () => {
  it("opens the canonical city briefing without visiting the authored fixture", async () => {
    const city = createCityDevSession(undefined, CITY);
    const succession = createLocalSuccessionSession({ storage: null });
    render(
      <CitySurface
        autoOpenSuccession
        enableCanvas={false}
        reducedMotion
        eraId="classical"
        loadCity={city.load}
        successionSession={succession}
        onOpenSurface={() => undefined}
      />,
    );

    await screen.findByTestId("crisis-call-advisor");
    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByTestId("crisis-call-next"));
    }
    fireEvent.click(screen.getByTestId("crisis-call-face"));
    await screen.findByTestId("succession-in-city");

    const reloaded = await city.load();
    const actual = new Set([
      ...(reloaded.placements ?? []).map((placement) => placement.nodeId),
      ...(reloaded.town_hall ? [reloaded.town_hall.nodeId] : []),
      ...(reloaded.civic ?? []).map((placement) => placement.nodeId),
    ]);
    await waitFor(async () => {
      expect(
        new Set(
          (await succession.load()).battle?.state.districts.map(
            (district) => district.civic.placement_id,
          ),
        ),
      ).toEqual(actual);
    });
  });

  it("launches from the city menu through its advisor and keeps the city mount", async () => {
    const city = createCityDevSession(undefined, CITY);
    const succession = createLocalSuccessionSession({ storage: null });
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        eraId="classical"
        loadCity={city.load}
        successionSession={succession}
        onOpenSurface={() => undefined}
      />,
    );

    await screen.findByTestId("city-viewport");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const entry = await screen.findByTestId("sx-entry-chip");
    expect(entry.tagName).toBe("BUTTON");
    fireEvent.click(entry);
    await screen.findByTestId("crisis-call-advisor");
    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByTestId("crisis-call-next"));
    }
    fireEvent.click(screen.getByTestId("crisis-call-face"));

    await screen.findByTestId("succession-in-city");
    await waitFor(async () => {
      const started = await succession.load();
      expect(started.battle?.state.board).toBe(SUCCESSION_LIVE_CITY_BOARD);
      expect(
        started.battle?.state.districts.map((district) => district.civic.placement_id),
      ).toEqual(
        successionCityRoster({
          placements: (await city.load()).placements ?? [],
          townHall: (await city.load()).town_hall ?? null,
          civic: (await city.load()).civic ?? [],
        }).districts.map((district) => district.civic.placement_id),
      );
    });
  });

  it("writes nothing to the city before authoritative settlement and returns it unchanged", async () => {
    const city = createCityDevSession(undefined, CITY);
    const before = await city.load();
    const roster = successionCityRoster({
      placements: before.placements ?? [],
      townHall: before.town_hall ?? null,
      civic: before.civic ?? [],
    });
    const carry = vi.fn(city.recordCrisisDamage);
    const leave = vi.fn();
    render(
      <SuccessionInCity
        session={battleSession(
          createSuccession({
            boardId: SUCCESSION_LIVE_CITY_BOARD,
            districts: roster.districts,
          }),
        )}
        placements={before.placements ?? []}
        townHall={before.town_hall ?? null}
        civic={before.civic ?? []}
        reducedMotion
        onBoard={() => undefined}
        onFocus={() => undefined}
        onCarryDamage={carry}
        onExit={leave}
      />,
    );

    await screen.findByTestId("sx-ready");
    expect(carry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("sx-exit"));
    await waitFor(() => expect(leave).toHaveBeenCalledWith(null));
    expect(carry).not.toHaveBeenCalled();
    expect(await city.load()).toEqual(before);
  });

  it("carries only real bought-civic suspensions after settlement and keeps every placement", async () => {
    const city = createCityDevSession(undefined, CITY);
    const before = await city.load();
    const roster = successionCityRoster({
      placements: before.placements ?? [],
      townHall: before.town_hall ?? null,
      civic: before.civic ?? [],
    });
    const resolved = settle(
      createSuccession({
        boardId: SUCCESSION_LIVE_CITY_BOARD,
        districts: roster.districts,
      }),
    );
    const leave = vi.fn();
    render(
      <SuccessionInCity
        session={battleSession(resolved)}
        placements={before.placements ?? []}
        townHall={before.town_hall ?? null}
        civic={before.civic ?? []}
        reducedMotion
        onBoard={() => undefined}
        onFocus={() => undefined}
        onCarryDamage={city.recordCrisisDamage}
        onExit={leave}
      />,
    );

    await screen.findByTestId("sx-conclusion");
    expect(city.crisisDamage().suspended_civic).toEqual([]);
    fireEvent.click(screen.getByTestId("sx-leave"));
    await waitFor(() =>
      expect(
        city.crisisDamage().suspended_civic.map((entry) => entry.placement_id),
      ).toEqual([CIVIC]),
    );
    const after = await city.load();
    expect(after.placements).toEqual(before.placements);
    expect(after.town_hall).toEqual(before.town_hall);
    expect(after.civic).toEqual(before.civic);
    expect(leave.mock.calls[0]?.[0]?.boundPlacementIds).toEqual(
      new Set(roster.bindings.map((binding) => binding.placement.nodeId)),
    );
  });

  it("cannot carry a removed civic from a stale settled client", async () => {
    const oldCity = createCityDevSession(undefined, CITY);
    const oldLoad = await oldCity.load();
    const oldRoster = successionCityRoster({
      placements: oldLoad.placements ?? [],
      townHall: oldLoad.town_hall ?? null,
      civic: oldLoad.civic ?? [],
    });
    const stale = settle(
      createSuccession({
        boardId: SUCCESSION_LIVE_CITY_BOARD,
        districts: oldRoster.districts,
      }),
    );
    const replacement = [...CITY.placements, { nodeId: "POL.4", col: 4, row: 3, rot: 0 }];
    const carry = vi.fn();
    const leave = vi.fn();
    render(
      <SuccessionInCity
        session={battleSession(stale)}
        placements={replacement}
        townHall={oldLoad.town_hall ?? null}
        civic={[]}
        reducedMotion
        onBoard={() => undefined}
        onFocus={() => undefined}
        onCarryDamage={carry}
        onExit={leave}
      />,
    );

    await screen.findByTestId("sx-conclusion");
    fireEvent.click(screen.getByTestId("sx-leave"));
    await waitFor(() => expect(leave).toHaveBeenCalled());
    expect(carry).not.toHaveBeenCalled();
  });

  it("restores the settled ward history over the same city after a city reload", async () => {
    const city = createCityDevSession(undefined, CITY);
    const loaded = await city.load();
    const roster = successionCityRoster({
      placements: loaded.placements ?? [],
      townHall: loaded.town_hall ?? null,
      civic: loaded.civic ?? [],
    });
    const resolved = settle(
      createSuccession({
        boardId: SUCCESSION_LIVE_CITY_BOARD,
        districts: roster.districts,
      }),
    );

    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        eraId="classical"
        loadCity={city.load}
        successionSession={battleSession(resolved)}
        onOpenSurface={() => undefined}
      />,
    );

    await waitFor(() =>
      expect(
        document.querySelector('.city-surface[data-succession-history="true"]'),
      ).not.toBeNull(),
    );
    expect((await city.load()).placements).toEqual(loaded.placements);
    expect((await city.load()).civic).toEqual(loaded.civic);
  });
});
