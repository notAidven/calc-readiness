import { civicBuildingOrThrow, civicLiftSuspensionCost, EARN } from "@cr/economy";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CitySurfaceProps } from "./CitySurface";

/**
 * **THE COMPOSITION ROOT REALLY HANDS THE CITY A WAY TO REOPEN A SHUTTERED BUILDING.**
 *
 * `suspendedCivicReachesTheCity.test.tsx` presses the panel's own button over a `CitySurface`
 * this repository wires itself, so it says nothing about whether `App` supplies the third
 * clear. `CrisisRepairDeps.clearCivic` is not optional and would fail to compile if it were
 * missing — but a handler that resolves against a DIFFERENT city compiles perfectly, and that
 * is exactly the defect #527 found: *"a writer and a reader that are not the same city"*.
 *
 * So this follows `carryBackComposition.test.tsx` in shape and for its reason: mount the REAL
 * `App`, capture what it hands `CitySurface`, and then USE the handle rather than assert it
 * exists — the claim is made against `loadCity`, the function the surface derives the panel
 * and the caption from.
 */

let captured: CitySurfaceProps | null = null;

vi.mock("./CitySurface", () => ({
  CitySurface: (props: CitySurfaceProps) => {
    captured = props;
    return <div data-testid="city-stub" />;
  },
}));

vi.mock("../diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: () => null,
}));

const { App } = await import("../App");
const { devSessionStore, snapshotFromLoad } = await import("../devPersistence/devSession");
const { DEV_STUDENT_KEY } = await import("../auth/LocalSessionProvider");
const { createCityDevSession } = await import("./citySession");
const { civicTestPayment } = await import("./civicTestSupport");
const { CURRENT_ERA_ID } = await import("./eraDressing");

const LODGE = civicBuildingOrThrow("prehistoric_longhouse");
const LIFT = civicLiftSuspensionCost(LODGE, CURRENT_ERA_ID);

/** A saved city with a bought Family Lodge on it that a crisis has shuttered. */
async function saveACityWithAShutteredLodge(): Promise<string> {
  localStorage.setItem(DEV_STUDENT_KEY, "composition-test");
  const seed = createCityDevSession();
  await seed.placeSkill("NUM.2", { col: -3, row: 2, rot: 0 });
  const bought = await seed.placeCivic(
    "prehistoric_longhouse",
    { col: 2, row: 2, rot: 0 },
    civicTestPayment(100_000),
  );
  if (bought.placementId === null) {
    throw new Error(`the fixture Lodge was not bought: ${bought.status}`);
  }
  await seed.recordCrisisDamage({
    buildings: [],
    cells: [],
    suspended_civic: [bought.placementId],
  });
  devSessionStore.save(snapshotFromLoad(await seed.load()));
  devSessionStore.flush();
  return bought.placementId;
}

beforeEach(() => {
  localStorage.clear();
  captured = null;
  // This suite exercises the retained repair implementation, which ordinary play withholds.
  vi.stubEnv("VITE_CRISIS_CAPABILITY", "enabled");
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

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

describe("App hands the city a way to lift a suspension", () => {
  it("quotes the catalogue's price and refuses with nothing spent when the wallet is empty", async () => {
    const placementId = await saveACityWithAShutteredLodge();
    const props = await theCityAppBuilt();

    // THE FLOOR: the city App built is the saved one, and the suspension really is on it.
    const before = await props.loadCity?.();
    expect(before?.civic?.map((p) => p.nodeId)).toEqual([placementId]);
    expect(before?.crisis_damage?.suspended_civic.map((s) => s.placement_id)).toEqual([
      placementId,
    ]);

    const repair = props.onRepairRuin;
    expect(repair, "App gave the city no way to repair anything").toBeDefined();

    const refused = await repair?.({ kind: "civic", placementId });
    expect(refused?.status).toBe("insufficient_material");
    // THE PRICE REACHED THE SPEND, which is the half a compile check cannot make: a target
    // kind the price function did not recognise would quote 0 and be refused as
    // `invalid_cost` instead.
    expect(refused?.cost, "the lift was not priced from the catalogue").toBe(LIFT);
    expect(LIFT).toBeGreaterThan(0);
    // …and nothing moved, so trying is free.
    const after = await props.loadCity?.();
    expect(after?.crisis_damage?.suspended_civic.map((s) => s.placement_id)).toEqual([
      placementId,
    ]);
  });

  /**
   * **USED, NOT MERELY PRESENT.** The claim is made against `loadCity`: a `clearCivic`
   * pointed at a session the surface does not render from would pass every type check and
   * leave the shutters up on screen, which is #527's defect exactly.
   */
  it("reopens the building in the same city the island is rendered from", async () => {
    const placementId = await saveACityWithAShutteredLodge();
    const props = await theCityAppBuilt();

    // Earn the price through the app's own economy handle, the way a player does: material
    // comes from finishing practice, and one cleared set at era one covers a lift.
    const sets = Math.ceil(LIFT / EARN.interleaved.material);
    for (let index = 0; index < sets; index += 1) {
      await props.onInterleavedClear?.({ sessionId: `lift-${index}` });
    }

    const lifted = await props.onRepairRuin?.({ kind: "civic", placementId });
    expect(lifted?.status, "the lift was refused, so nothing below is measuring it").toBe(
      "repaired",
    );
    expect(lifted?.repaired).toBe(true);
    expect(lifted?.cost).toBe(LIFT);

    const after = await props.loadCity?.();
    expect(after?.crisis_damage?.suspended_civic).toEqual([]);
    // AND THE BUILDING IS STILL STANDING. A lift is not a rebuild and not a purchase: the
    // placement was never removed, so there is nothing here to have put back.
    expect(after?.civic?.map((p) => p.nodeId)).toEqual([placementId]);
  });

  /**
   * The ledger keeps its own account, and it must say what happened rather than something
   * close to it. A lift recorded as a `building` repair is a true debit under a false
   * description, and the reason code is the reconstructable source of truth for the economy.
   */
  it("records the debit as a civic lift, keyed by the suspension's damage id", async () => {
    const placementId = await saveACityWithAShutteredLodge();
    const props = await theCityAppBuilt();
    for (let index = 0; index < Math.ceil(LIFT / EARN.interleaved.material); index += 1) {
      await props.onInterleavedClear?.({ sessionId: `ledger-${index}` });
    }

    const lifted = await props.onRepairRuin?.({ kind: "civic", placementId });
    expect(lifted?.status).toBe("repaired");
    expect(lifted?.damageId).toBe("d1");
    // A second press is free and clears nothing, because the suspension is gone. The status
    // says why rather than reporting a spend that did not happen.
    const again = await props.onRepairRuin?.({ kind: "civic", placementId });
    expect(again?.status).toBe("not_ruined");
    expect(again?.spendable).toBeNull();
  });
});
