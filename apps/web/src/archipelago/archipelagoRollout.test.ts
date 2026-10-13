import { describe, expect, it } from "vitest";

import { archipelagoAvailable, isArchipelagoEnabled } from "./archipelagoFlag";

type RolloutEnv = Parameters<typeof isArchipelagoEnabled>[0] & {
  readonly VITE_ARCHIPELAGO_MODE?: string;
};

describe("the production archipelago rollout switch", () => {
  it("enables the bay in a production build only for the explicit bay mode", () => {
    expect(
      isArchipelagoEnabled({ DEV: false, VITE_ARCHIPELAGO_MODE: "bay" } as RolloutEnv, ""),
    ).toBe(true);
    for (const mode of [undefined, "", "off", "single-island", "unexpected"]) {
      expect(
        isArchipelagoEnabled(
          { DEV: false, VITE_ARCHIPELAGO_MODE: mode } as RolloutEnv,
          "?bay",
        ),
        String(mode),
      ).toBe(false);
    }
  });

  it("keeps the query-param developer preview when no rollout mode is configured", () => {
    expect(isArchipelagoEnabled({ DEV: true } as RolloutEnv, "?bay")).toBe(true);
    expect(isArchipelagoEnabled({ DEV: true } as RolloutEnv, "")).toBe(false);
  });

  it("lets an operator roll back to the single-island experience without deleting data", () => {
    const off = { DEV: false, VITE_ARCHIPELAGO_MODE: "single-island" } as RolloutEnv;
    expect(isArchipelagoEnabled(off, "?bay")).toBe(false);
    expect(isArchipelagoEnabled(off, "?reset&bay=1")).toBe(false);
  });

  it("falls back to one island when a deployed API lacks the partition capability", () => {
    expect(
      archipelagoAvailable({
        rolloutEnabled: true,
        serverBacked: true,
        serverVersion: undefined,
      }),
    ).toBe(false);
    expect(
      archipelagoAvailable({
        rolloutEnabled: true,
        serverBacked: true,
        serverVersion: 1,
      }),
    ).toBe(true);
    expect(
      archipelagoAvailable({
        rolloutEnabled: false,
        serverBacked: true,
        serverVersion: 1,
      }),
    ).toBe(false);
  });
});
