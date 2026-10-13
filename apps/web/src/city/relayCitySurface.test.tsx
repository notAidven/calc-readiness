import { NO_CRISIS_DAMAGE } from "@cr/game";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { civicPlacementId } from "./civic";
import type { CityLoad } from "./types";

const PLACEMENT = civicPlacementId("information_age_food_warehouse", 1);
let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function city(attempted = false, withPlacement = true): CityLoad {
  return {
    node_states: [],
    neighborhood_state: null,
    placements: [],
    civic: withPlacement ? [{ nodeId: PLACEMENT, col: 0, row: 0, rot: 0 }] : [],
    roads: [],
    road_gold_spent: 0,
    town_hall: null,
    crisis_damage: {
      ...NO_CRISIS_DAMAGE,
      next_damage_id: 2,
      overwritten_records: [
        {
          placement_id: PLACEMENT,
          damage_id: "d1",
          bands_dark: 4,
          verification_attempted: attempted,
        },
      ],
    },
  };
}

describe("the Intrusion scar in the ordinary city", () => {
  it("offers one free verification and explicitly says the scar withholds nothing", async () => {
    const verify = vi.fn(async () => city(true).crisis_damage ?? NO_CRISIS_DAMAGE);
    harness = mount(
      <CitySurface
        loadCity={async () => city()}
        eraId="information_age"
        enableCanvas={false}
        onVerifyOverwrittenRecord={verify}
      />,
    );
    await waitFor(
      () => document.body.textContent?.includes("The Civic Archive Relay") ?? false,
      "the record scar row appears",
    );
    expect(document.body.textContent).toContain("4 of nine bands");
    expect(document.body.textContent).toContain("It withholds nothing");
    expect(
      document.querySelector<HTMLButtonElement>('[aria-label^="Verify the record"]'),
    ).not.toBeNull();
  });

  it("shows a spent verification without offering a second attempt", async () => {
    harness = mount(
      <CitySurface
        loadCity={async () => city(true)}
        eraId="information_age"
        enableCanvas={false}
        onVerifyOverwrittenRecord={async () => NO_CRISIS_DAMAGE}
      />,
    );
    await waitFor(
      () => document.body.textContent?.includes("Verification used") ?? false,
      "the spent verification state appears",
    );
    expect(document.querySelector('[aria-label^="Verify the record"]')).toBeNull();
  });

  it("left-joins an orphaned scar to nothing", async () => {
    harness = mount(
      <CitySurface
        loadCity={async () => city(false, false)}
        eraId="information_age"
        enableCanvas={false}
      />,
    );
    await waitFor(
      () => document.querySelector('[data-testid="city-viewport"]') !== null,
      "the city loads",
    );
    expect(document.body.textContent).not.toContain("The Civic Archive Relay");
  });
});
