import { EARN } from "@cr/economy";
import { hardWinterRepairPrices } from "@cr/game";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { snapshotWithWinterDamage } from "../winter/scarLiveCity";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { type RepairTarget, repairCrisisDamage } from "./crisisRepair";
import { CURRENT_ERA_ID } from "./eraDressing";
import { openBuiltShelf } from "./test/openBuiltShelf";

/**
 * **SEEING A RUIN, AND TRIGGERING A REPAIR** — the end of the loop, through the surface.
 *
 * Everything below the UI is asserted elsewhere: the spend in `@cr/economy`, the ordering in
 * `crisisRepair.test.ts`, durability in `devPersistence/crisisDamagePersistence.test.ts`, and
 * lesson access in `ruinLessonAccess.test.tsx`. What is left, and what this file is for, is
 * that a player can actually SEE the damage and actually CLEAR it — a repair path with no
 * button is the same defect as a price nothing charges.
 *
 * The panel is DOM rather than canvas on purpose: the 3D view is `aria-hidden`, so a repair
 * offered only by clicking a cell in the scene would be a spend no keyboard could reach.
 */

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/**
 * A city with one building placed and mastered, ruined, with a patch of scarred ground — and
 * a wallet holding `material`.
 *
 * `cells` defaults to one cell, which is what most assertions here need. It is a parameter
 * because era one's pull-back gives up a whole rim band (28 cells at the narrowest), and a
 * one-cell fixture cannot tell a per-cell control apart from an aggregated one.
 */
async function damagedCity(material: number, cells: readonly string[] = ["4,0"]) {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const built = withDevPersistence(createCityDevSession(), store);
  await built.placeSkill("NUM.S", { col: 2, row: 2, rot: 0 });
  await built.advanceMasteryDev("NUM.S", 3);
  await Promise.resolve();
  store.flush();

  const saved = store.load();
  if (saved === null) {
    throw new Error("the fixture city did not save");
  }
  store.save(snapshotWithWinterDamage(saved, { buildings: ["NUM.S"], cells: [...cells] }));
  store.flush();

  const restored = store.load();
  if (restored === null) {
    throw new Error("the fixture damage did not save");
  }
  const session = withDevPersistence(createCityDevSession(restored), store);
  const economy = createInMemoryEconomyClient(null);

  // Fund the wallet the only way anything is funded: cleared practice sets, so the amount
  // is a whole number of sets and never a minted balance.
  //
  // The payout is READ rather than copied, and `funded` is returned rather than assumed
  // equal to `material`. A set is indivisible, so the wallet lands on the first multiple
  // of the payout at or above the ask — which was the same number while the payout was 10
  // and a repair cost 60, and is not once either moves. A hardcoded 10 here is what made
  // the 2026-07-30 payout ruling look like a repair-pricing failure.
  const perSet = EARN.interleaved.material;
  let funded = 0;
  for (let index = 0; funded < material; index += 1) {
    await economy.reportInterleavedClear({ sessionId: `seed-${index}` });
    funded += perSet;
  }

  const onRepairRuin = (target: RepairTarget) =>
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

  return { session, economy, onRepairRuin, funded };
}

const PRICES = hardWinterRepairPrices();

describe("the city SHOWS its crisis damage", () => {
  it("names the ruins, the scarred ground and the whole bill", async () => {
    const { session, onRepairRuin } = await damagedCity(0);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={0}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    expect(panel.textContent).toContain("1 building in ruins");
    expect(panel.textContent).toContain("1 cell of the island");
    // The whole bill, as a running total under the per-item buttons.
    expect(panel.textContent).toContain(String(PRICES.per_building + PRICES.per_cell));
    // ...and the sentence that keeps the ruling visible where the damage is.
    expect(panel.textContent).toMatch(/Every lesson and every star is untouched/);
  });

  it("renders NOTHING over an undamaged city", async () => {
    const store = createDevSessionStore({
      storage: memStorage(),
      enabled: true,
      debounceMs: 0,
    });
    const session = withDevPersistence(createCityDevSession(), store);
    await session.placeSkill("NUM.S", { col: 2, row: 2, rot: 0 });

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByRole("region", { name: /Crisis damage/i })).toBeNull();
  });

  it("dims an unaffordable repair and says how to afford it, rather than lying", async () => {
    const { session, onRepairRuin } = await damagedCity(0);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={0}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    const buildings = within(panel).getByRole("list", { name: /Buildings in ruins/i });
    expect(
      within(buildings).getByRole("button", {
        name: new RegExp(`Repair for ${PRICES.per_building}`),
      }),
    ).toBeDisabled();
    // THE WAY OUT, in words, because a dimmed button on its own is a dead end.
    expect(panel.textContent).toMatch(/Practise any skill you have built/i);
  });
});

describe("the city REPAIRS its crisis damage", () => {
  it("clears a ruined building, charges the authored price, and updates the panel", async () => {
    const user = userEvent.setup();
    const { session, economy, onRepairRuin, funded } = await damagedCity(
      PRICES.per_building,
    );
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={funded}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    const before = (await economy.getWallet()).spendable;
    expect(before).toBe(funded);
    expect(funded).toBeGreaterThanOrEqual(PRICES.per_building);

    await user.click(
      within(panel).getByRole("button", {
        name: new RegExp(`Repair for ${PRICES.per_building}`),
      }),
    );

    // The material left the wallet, the ruin left the city, and the placement stayed put.
    await waitFor(async () => {
      expect((await economy.getWallet()).spendable).toBe(funded - PRICES.per_building);
    });
    expect(session.crisisDamage().ruined_buildings).toEqual([]);
    expect((await session.load()).placements?.map((p) => p.nodeId)).toEqual(["NUM.S"]);

    // The panel is still up (there is scarred ground left) but no longer lists a ruin, and it
    // says what happened where a screen reader will hear it.
    await waitFor(() => {
      const live = screen.getByRole("region", { name: /Crisis damage/i });
      expect(live.textContent).toContain("Every building came through");
      expect(live.querySelector('ul[aria-label="Buildings in ruins"]')).toBeNull();
    });
    expect(document.body.textContent).toMatch(
      new RegExp(`Repaired .* for ${PRICES.per_building}`),
    );
  });

  it("reclaims a scarred cell, and the ground becomes buildable again", async () => {
    const user = userEvent.setup();
    const { session, onRepairRuin } = await damagedCity(PRICES.per_cell);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={10}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    // Scarred, so nothing may be placed there yet — checked through the session, which is the
    // authority every placement path gates on.
    await session.placeSkill("NUM.3", { col: 4, row: 0, rot: 0 });
    expect((await session.load()).placements?.map((p) => p.nodeId)).not.toContain("NUM.3");

    await user.click(
      within(panel).getByRole("button", {
        name: new RegExp(`Reclaim all 1 for ${PRICES.per_cell}`),
      }),
    );

    await waitFor(() => {
      expect(session.crisisDamage().ruined_cells).toEqual([]);
    });
    // And now the SAME placement lands, which is what makes the refusal above a fact about
    // the scar rather than about the cell.
    await session.placeSkill("NUM.3", { col: 4, row: 0, rot: 0 });
    expect((await session.load()).placements?.map((p) => p.nodeId)).toContain("NUM.3");
  });

  /**
   * **THE GROUND IS ONE PRESS OVER A WHOLE BAND, which is the half of the lead's complaint the
   * one-cell fixture above cannot see.** Era one's pull-back gives up a whole rim band — 28,
   * 52, 72 or 84 cells (`hard-winter-tuning.ts`) — so the fixture that matters is a wide one,
   * and the assertion is that the number of ground CONTROLS does not grow with it.
   */
  it("reclaims a whole band of ground from one button, at the summed price", async () => {
    const user = userEvent.setup();
    const band = ["4,0", "4,1", "5,0", "5,1", "6,0", "6,1", "7,0"];
    const bill = band.length * PRICES.per_cell;
    const { session, economy, onRepairRuin, funded } = await damagedCity(bill, band);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={funded}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    const ground = within(panel).getByRole("list", { name: /Scarred ground/i });
    expect(ground.textContent).toContain(`${band.length} cells of the island`);
    // ONE row and ONE control for the whole band. The per-cell version put one of each here
    // per cell, so this is the assertion that the panel stopped being denominated in tiles.
    expect(within(ground).getAllByRole("listitem")).toHaveLength(1);
    expect(within(ground).getAllByRole("button")).toHaveLength(1);

    const before = (await economy.getWallet()).spendable;
    await user.click(
      within(ground).getByRole("button", {
        name: new RegExp(`Reclaim all ${band.length} for ${bill}`),
      }),
    );

    // Every cell cleared, and the wallet down by exactly the summed authored price — so the
    // aggregate button is charging the per-cell prices rather than a bulk rate it invented.
    await waitFor(() => {
      expect(session.crisisDamage().ruined_cells).toEqual([]);
    });
    expect((await economy.getWallet()).spendable).toBe(before - bill);
  });

  /**
   * **BUILDINGS PRECEDE GROUND, AND NOTHING SITS BETWEEN THEM AND THE HEADING.**
   *
   * The lead: *"it should show buildings to repair first and foremost, like that should be the
   * top of the view."* Both sections existing says nothing about that, and neither does reading
   * the JSX — so this compares real DOM positions in the rendered panel.
   *
   * Three separate claims, because they fail in three different ways:
   *
   *  1. the buildings section comes before the ground section in document order;
   *  2. the buildings section is the FIRST thing after the head, so the bill — which is the
   *     total of the things below it — cannot climb back above them;
   *  3. the heading counts buildings and mentions no cells, because *"5 in ruins · 72 cells
   *     scarred"* put the largest number on the panel in the first line a player reads.
   */
  it("puts the buildings above the ground, and the bill below both", async () => {
    const { session, onRepairRuin } = await damagedCity(0);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={0}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    const buildings = within(panel).getByRole("list", { name: /Buildings in ruins/i });
    const ground = within(panel).getByRole("list", { name: /Scarred ground/i });
    const bill = panel.querySelector(".hud-repairs-total");
    if (bill === null) {
      throw new Error("the panel has no bill line to place");
    }

    // (1) Buildings before ground. `DOCUMENT_POSITION_FOLLOWING` is the bit set when the
    // argument comes AFTER the node the method was called on.
    expect(
      buildings.compareDocumentPosition(ground) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // (2) ...and the buildings are the first section in the panel, with the bill after both.
    const order = [...panel.querySelectorAll("[data-repair-section], .hud-repairs-total")];
    expect(
      order.map((element) => element.getAttribute("data-repair-section") ?? "total"),
    ).toEqual(["buildings", "ground", "total"]);

    // (3) The heading is denominated in buildings and in nothing else.
    const heading = within(panel).getByRole("heading");
    expect(heading.textContent).toBe("1 building in ruins");
    expect(heading.textContent).not.toMatch(/cell/i);
  });

  it("offers the repair from the building's own callout too, beside its lesson", async () => {
    const user = userEvent.setup();
    const { session, economy, onRepairRuin, funded } = await damagedCity(
      PRICES.per_building,
    );
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={funded}
      />,
    );

    await openBuiltShelf(user);
    await user.click(
      document.querySelector<HTMLElement>(
        'button.city-plot[data-node-id="NUM.S"]',
      ) as HTMLElement,
    );
    const menu = await screen.findByRole("dialog");

    // The ruin is stated and the repair is offered — WITHOUT the lesson card being touched.
    expect(menu.textContent).toContain("In ruins");
    expect(menu.querySelector<HTMLElement>(".lesson-menu-card")).toBeEnabled();
    await user.click(
      within(menu).getByRole("button", {
        name: new RegExp(`Repair for ${PRICES.per_building}`),
      }),
    );

    await waitFor(async () => {
      expect((await economy.getWallet()).spendable).toBe(funded - PRICES.per_building);
    });
    expect(session.crisisDamage().ruined_buildings).toEqual([]);
  });

  it("shows the damage but offers no repair when no host wired one", async () => {
    // The default a test (or a surface with no economy) gets: the ruin is never HIDDEN, it is
    // only unclearable here. Hiding it would be the failure floor's opposite.
    const { session } = await damagedCity(60);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    expect(panel.textContent).toContain("1 building in ruins");
    for (const button of within(panel).getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
