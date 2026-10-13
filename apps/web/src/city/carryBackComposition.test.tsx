import type { CrisisDamageReport } from "@cr/game";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CitySurfaceProps } from "./CitySurface";

/**
 * **THE COMPOSITION ROOT REALLY HANDS THE CITY A WAY TO TAKE DAMAGE.**
 *
 * `carryBackReachesTheIsland.test.tsx` plays the whole winter and proves that a `CitySurface`
 * WIRED with `onCarryCrisisDamage` marks the island. It wires that prop itself, so it says
 * nothing about whether `App` does — and an optional prop nobody passes is precisely how this
 * defect arrived: the write existed, was correct, and reached a city no surface was rendering.
 *
 * This is the other half, at the seam that failed, following
 * `economy/economyClientGate.composition.test.tsx`: mount the REAL `App`, capture what it
 * hands `CitySurface`, and then USE the handle rather than assert its existence. A prop that
 * is present and inert would satisfy a `toBeDefined()` and is the same bug in a new place, so
 * the claim is made against `loadCity` — the very function the surface renders the island
 * from. If the writer and the reader are not the same city, this fails.
 */

let captured: CitySurfaceProps | null = null;

vi.mock("./CitySurface", () => ({
  CitySurface: (props: CitySurfaceProps) => {
    captured = props;
    return <div data-testid="city-stub" />;
  },
}));

// Browser-only (KaTeX / canvas widgets), and nothing here enters the diagnostic. Same stub
// `App.test.tsx` uses, for the same reason.
vi.mock("../diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: () => null,
}));

const { App } = await import("../App");
const { devSessionStore, snapshotFromLoad } = await import("../devPersistence/devSession");
const { DEV_STUDENT_KEY } = await import("../auth/LocalSessionProvider");
const { createCityDevSession } = await import("./citySession");

/** A saved city with one skill on it, so the ruin below names a placement that exists. */
async function saveACityWithABuildingOnIt(): Promise<void> {
  localStorage.setItem(DEV_STUDENT_KEY, "composition-test");
  const seed = createCityDevSession();
  await seed.placeSkill("NUM.2", { col: -3, row: 2, rot: 0 });
  devSessionStore.save(snapshotFromLoad(await seed.load()));
  devSessionStore.flush();
}

beforeEach(() => {
  localStorage.clear();
  captured = null;
  // This file proves the retained crisis write path. Ordinary play now withholds it by
  // default, so opt into the single documented restoration mechanism explicitly.
  vi.stubEnv("VITE_CRISIS_CAPABILITY", "enabled");
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

/** Start the app and hand back the props it gave the city. */
async function theCityAppBuilt(): Promise<CitySurfaceProps> {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
  await screen.findByTestId("city-stub");
  if (captured === null) {
    throw new Error("App never rendered a city");
  }
  return captured;
}

describe("App hands the city somewhere for a crisis's damage to land", () => {
  it("records through the same session the island is rendered from", async () => {
    await saveACityWithABuildingOnIt();
    const props = await theCityAppBuilt();

    // THE FLOOR: the city App built is the saved one, and it is undamaged. Without this the
    // assertion below could pass over a city that was already in ruins.
    const before = await props.loadCity?.();
    expect(before?.placements?.map((p) => p.nodeId)).toEqual(["NUM.2"]);
    expect(before?.crisis_damage?.ruined_buildings ?? []).toEqual([]);

    // THE HANDLE THE WINTER IS GIVEN. `CitySurface` passes it down to `WinterInCity` and on
    // to `scarLiveCity`; with it undefined the crisis silently falls back to writing the
    // saved blob, which is the shipped defect.
    const carry = props.onCarryCrisisDamage;
    expect(carry, "App gave the city no way to record a crisis's damage").toBeDefined();

    const report: CrisisDamageReport = { buildings: ["NUM.2"], cells: [] };
    await carry?.(report);

    // **USED, NOT MERELY PRESENT.** The reader and the writer have to be one city, and this
    // is that claim: `loadCity` is what the real surface derives `ruinedNodeIds` from.
    const after = await props.loadCity?.();
    expect(after?.crisis_damage?.ruined_buildings.map((b) => b.node_id)).toEqual(["NUM.2"]);
    // ...and the placement is untouched, which is the failure floor: a crisis records a state
    // and never a deletion.
    expect(after?.placements?.map((p) => p.nodeId)).toEqual(["NUM.2"]);
  });

  /**
   * **AND IT IS DURABLE THE INSTANT IT IS PRESSED**, which is a promise `scarLiveCity.ts`
   * made with a `flush()` and would have lost when the write moved into the session: the
   * dev store debounces by 250ms, and the player is one click from navigating away.
   *
   * Read with NO flush of this test's own, so what is being measured is the app's.
   */
  it("lands the write immediately rather than leaving it in the debounce window", async () => {
    await saveACityWithABuildingOnIt();
    const props = await theCityAppBuilt();

    await props.onCarryCrisisDamage?.({ buildings: ["NUM.2"], cells: [] });

    expect(
      devSessionStore.load()?.crisis_damage?.ruined_buildings.map((b) => b.node_id),
      "the damage is still sitting in the debounce window",
    ).toEqual(["NUM.2"]);
  });
});
