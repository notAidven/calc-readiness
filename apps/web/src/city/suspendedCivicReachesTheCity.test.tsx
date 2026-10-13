import { civicBuildingOrThrow, civicLiftSuspensionCost, EARN } from "@cr/economy";
import { NO_CRISIS_RUIN } from "@cr/game";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { createInMemoryEconomyClient } from "../economy/economySession";
import { CitySurface } from "./CitySurface";
import {
  type CityDevSession,
  type CivicPayment,
  createCityDevSession,
  D1_NODE_IDS,
} from "./citySession";
import { type RepairTarget, repairCrisisDamage } from "./crisisRepair";
import { CURRENT_ERA_ID } from "./eraDressing";
import { resetCityEra } from "./useCityEra";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  occupiedCells,
  type PlacedTransform,
} from "./worldLayout";

/**
 * **A SUSPENDED CIVIC BUILDING COSTS THE CITY NOTHING — measured where the player reads it.**
 *
 * `CrisisDamage.suspended_civic` is written by era four's Succession
 * (*"era four's whole durable consequence"*) and era nine's Intrusion (*"era nine's whole
 * durable record"*). It is computed, folded, validated, persisted and counted in two crisis
 * conclusions. **Nothing in the city reads it.** `CitySurface` hands
 * `civicContributionRowsOf(civicPlacements)` the raw placement list, so a suspended building
 * goes on contributing its livability and its happiness exactly as if the crisis had never
 * happened — which `docs/superpowers/specs/2026-08-04-late-game-livability-measurement.md`
 * had already noticed in passing and nobody had turned into a failure.
 *
 * This is #527's defect one field over. There the write was correct and the READER was
 * missing; here the write is correct and there is no reader at all.
 *
 * ## Why this measures the CITY and not the adapter
 *
 * `@cr/economy` already knows how to withhold a suspended placement's capacity —
 * `civicCityCapacities` skips it, `civicSuspendedCapacity` names what is withheld, and both
 * are tested. That is one green half. `crisis-damage.test.ts`, `succession-play.test.ts` and
 * `intrusion.test.ts` all assert the field is written correctly, which is the other. #527's
 * finding was that two independently green halves that never meet is the whole failure, so
 * this file mounts the real `CitySurface` and reads the City Life panel — the number the
 * player sees.
 *
 * ## Scoped to A CITY HOLDING A SUSPENSION, never to a crisis
 *
 * Nothing below mentions the Succession or the Intrusion. The fixture records a
 * `CrisisDamageReport` through the session's own `recordCrisisDamage`, which is the one way
 * damage gets in, so a third crisis that writes the same field is covered by this file on the
 * day it ships rather than owed a second guard. `suspendedCivicIsCrisisAgnostic.test.ts`
 * asserts that scoping over the real crisis engines.
 */

/** Cells for era one's six skills, clear of the hub's reserved block. */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

/**
 * The two bought buildings this city stands on.
 *
 * **The Lodge carries BOTH axes and the Campfire carries only happiness**, which is what makes
 * the two assertions below independent: a suppression wired to livability alone would still
 * pass a happiness check that had nothing to lose.
 */
const LODGE = civicBuildingOrThrow("prehistoric_longhouse");
const CAMPFIRE = civicBuildingOrThrow("prehistoric_campfire");

afterEach(() => {
  resetCityEra();
});

async function fundedEraOneEconomy() {
  const economy = createInMemoryEconomyClient();
  for (const nodeId of D1_NODE_IDS) {
    await economy.reportLessonComplete({ nodeId });
  }
  return economy;
}

async function buy(
  session: CityDevSession,
  economy: Awaited<ReturnType<typeof fundedEraOneEconomy>>,
  buildingId: string,
): Promise<string> {
  const row = civicBuildingOrThrow(buildingId);
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
    throw new Error(`no open cell for ${buildingId}`);
  }
  const pay: CivicPayment = (ask) => economy.purchaseCivicBuilding(ask);
  const result = await session.placeCivic(buildingId, spot, pay);
  if (result.status !== "built" || result.placementId === null) {
    throw new Error(`could not buy ${buildingId}: ${result.status}`);
  }
  return result.placementId;
}

/**
 * A real era-one city with six skills placed and two civic buildings bought, optionally
 * carrying a crisis's suspension of some of them.
 *
 * The suspension arrives through `recordCrisisDamage` — the session's own way in, and the
 * one #527 built — rather than through a hand-made blob, so this exercises the same fold a
 * carry-back would.
 */
async function aCity(suspend: readonly string[] = []): Promise<{
  readonly session: CityDevSession;
  readonly economy: Awaited<ReturnType<typeof fundedEraOneEconomy>>;
  readonly lodge: string;
  readonly campfire: string;
}> {
  const economy = await fundedEraOneEconomy();
  const session = createCityDevSession();
  for (const nodeId of D1_NODE_IDS) {
    const cell = CELL_FOR[nodeId];
    if (!cell) {
      throw new Error(`no test cell for ${nodeId}`);
    }
    await session.placeSkill(nodeId, { ...cell, rot: 0 });
    await session.advanceMasteryDev(nodeId, 3);
  }
  const lodge = await buy(session, economy, LODGE.id);
  const campfire = await buy(session, economy, CAMPFIRE.id);
  const ids = suspend.map((which) => (which === LODGE.id ? lodge : campfire));
  if (ids.length > 0) {
    await session.recordCrisisDamage({ ...NO_CRISIS_RUIN, suspended_civic: ids });
  }
  return { session, economy, lodge, campfire };
}

function renderCity(
  session: CityDevSession,
  economy?: Awaited<ReturnType<typeof fundedEraOneEconomy>>,
) {
  const onRepairRuin =
    economy === undefined
      ? undefined
      : (target: RepairTarget) =>
          repairCrisisDamage(
            {
              damage: session.crisisDamage,
              economy,
              clearBuilding: session.repairRuinedBuilding,
              clearCell: session.reclaimRuinedCell,
              clearCivic: session.liftSuspendedCivic,
              eraId: CURRENT_ERA_ID,
            },
            target,
          );
  return render(
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onDevAdvanceMastery={session.advanceMasteryDev}
      onCarryCrisisDamage={session.recordCrisisDamage}
      onRepairRuin={onRepairRuin}
      onOpenSurface={() => undefined}
    />,
  );
}

/** The two figures the City Life panel puts in front of the player. */
async function vitalityOnScreen(): Promise<{
  readonly sustains: number;
  readonly covered: number;
}> {
  const livability = await screen.findByTestId("vitality-livability");
  const happiness = await screen.findByTestId("vitality-happiness");
  const figureIn = (row: HTMLElement): number => {
    const value = within(row).getByRole("definition").textContent ?? "";
    const digits = /-?\d+/.exec(value);
    if (digits === null) {
      throw new Error(`no figure in "${value}"`);
    }
    return Number(digits[0]);
  };
  return { sustains: figureIn(livability), covered: figureIn(happiness) };
}

describe("a city holding a suspended civic building", () => {
  /**
   * **THE REPRODUCTION.** Two cities, identical but for one recorded suspension, rendered
   * through the real surface. Before the consumer existed they reported the same livability,
   * which is the defect in one number.
   *
   * Both halves of the message carry a figure on purpose, following
   * `carryBackReachesTheIsland`'s discipline: `40 / 40` is the defect and a future `0 / 0`
   * says the fixture rotted (a catalogue retune to a zero-livability dwelling would do it
   * silently) rather than quietly passing.
   */
  it("sustains fewer people than the same city with nothing suspended", async () => {
    const clear = await aCity();
    const clearView = renderCity(clear.session);
    const before = await vitalityOnScreen();
    clearView.unmount();

    const hit = await aCity([LODGE.id]);
    renderCity(hit.session);
    const after = await vitalityOnScreen();

    expect(
      after.sustains,
      `an unsuspended city sustains ${before.sustains} and a suspended one sustains ` +
        `${after.sustains}; the Lodge's ${LODGE.provides.livability} livability is still ` +
        `being counted for a building the crisis shut`,
    ).toBe(before.sustains - LODGE.provides.livability);
  });

  /**
   * The happiness axis, separately, because a suppression wired to livability alone would
   * pass the case above and leave half the contribution standing. The Campfire is the era's
   * pure-amenity row, so this measures a suspension with no livability in it at all.
   */
  it("covers fewer people than the same city with nothing suspended", async () => {
    const clear = await aCity();
    const clearView = renderCity(clear.session);
    const before = await vitalityOnScreen();
    clearView.unmount();

    const hit = await aCity([CAMPFIRE.id]);
    renderCity(hit.session);
    const after = await vitalityOnScreen();

    expect(
      before.covered,
      "nobody was covered before the suspension, so there is nothing for it to withhold",
    ).toBeGreaterThan(0);
    expect(
      after.covered,
      `an unsuspended city covers ${before.covered} and a suspended one covers ` +
        `${after.covered}; the Campfire's ${CAMPFIRE.provides.happiness} happiness is ` +
        `still being counted for a building the crisis shut`,
    ).toBeLessThan(before.covered);
  });
});

/**
 * **THE PANEL IS THE REACHABLE HALF.** The caption over the roof is in the canvas, which is
 * `aria-hidden` decoration, so a suspension a player could only see and only clear there
 * would be invisible to a screen reader and unreachable from a keyboard — the argument
 * `CrisisRepairPanel`'s own docblock makes about every ruin it lists.
 */
describe("the crisis-damage panel over a city with a shuttered building", () => {
  it("names the building, says what is withheld, and prices the lift", async () => {
    const { session, economy } = await aCity([LODGE.id]);
    renderCity(session, economy);

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    // The heading counts what is actually wrong, and with no ruins that is the shutters
    // rather than the reassurance "Every building came through" would have given.
    expect(panel.textContent).toContain("1 building shut");

    // READ OFF THE ROW AND NOT OFF THE PANEL. The panel's total line names the same two
    // figures, so a whole-panel `toContain` was green with the row's own sentence deleted —
    // measured, as an INERT injection. The row is what a player scanning a list of shuttered
    // buildings reads, and it has to carry its own account of what it is costing them.
    const row = panel.querySelector<HTMLElement>("[data-suspended-placement]");
    expect(row, "the panel lists no shuttered building").not.toBeNull();
    expect(row?.textContent).toContain(LODGE.name);
    expect(row?.textContent).toContain(`${LODGE.provides.livability} livability`);
    expect(row?.textContent).toContain(`${LODGE.provides.happiness} happiness`);

    // …and the price is the catalogue's, in the button's own accessible name.
    const lift = civicLiftSuspensionCost(LODGE, CURRENT_ERA_ID);
    expect(lift).toBeGreaterThan(0);
    within(panel).getByRole("button", { name: new RegExp(`Reopen for ${lift} stone`) });
  });

  it("reopens the building when the button is pressed, and the two dials come back", async () => {
    const user = userEvent.setup();
    const { session, economy } = await aCity([LODGE.id]);
    const lift = civicLiftSuspensionCost(LODGE, CURRENT_ERA_ID);
    // Earn the price the way a player does. The purchases above spent the lesson lumps, so
    // this tops the stockpile back up through practice.
    for (let index = 0; index < Math.ceil(lift / EARN.interleaved.material); index += 1) {
      await economy.reportInterleavedClear({ sessionId: `lift-${index}` });
    }
    const funded = (await economy.getWallet()).spendable;
    expect(funded).toBeGreaterThanOrEqual(lift);

    renderCity(session, economy);
    const shut = await vitalityOnScreen();

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    await user.click(
      within(panel).getByRole("button", { name: new RegExp(`Reopen for ${lift} stone`) }),
    );

    // THE CITY GETS ITS CAPACITY BACK, which is the whole round trip: the suspension is
    // lifted in the session the surface reads, and the surface re-derives from it.
    await waitFor(async () => {
      expect((await vitalityOnScreen()).sustains).toBe(
        shut.sustains + LODGE.provides.livability,
      );
    });
    expect(session.crisisDamage().suspended_civic).toEqual([]);
    // The player paid exactly the quoted price…
    expect((await economy.getWallet()).spendable).toBe(funded - lift);
    // …and the building never left the ground, because a suspension never removed it.
    expect((await session.load()).civic?.length).toBe(2);
    // The panel takes itself away: with nothing shut and nothing ruined there is nothing to
    // report, so an undamaged island is exactly the island it was.
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /Crisis damage/i })).toBeNull();
    });
  });

  it("shows nothing at all over a city with no suspensions", async () => {
    const { session, economy } = await aCity();
    renderCity(session, economy);
    await screen.findByTestId("city-vitality");
    expect(screen.queryByRole("region", { name: /Crisis damage/i })).toBeNull();
  });
});
