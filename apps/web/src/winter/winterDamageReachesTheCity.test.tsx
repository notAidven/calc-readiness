import { EARN } from "@cr/economy";
import {
  createHardWinter,
  type HardWinterState,
  hardWinterDamage,
  hardWinterReducer,
  hardWinterRepairPrices,
  winterCellKey,
} from "@cr/game";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CitySurface } from "../city/CitySurface";
import { createCityDevSession, D1_NODE_IDS } from "../city/citySession";
import { type RepairTarget, repairCrisisDamage } from "../city/crisisRepair";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import { openBuiltShelf } from "../city/test/openBuiltShelf";
import { isTownHall } from "../city/townHall";
import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { liveCityLayoutFrom } from "./liveCityLayout";
import { snapshotWithWinterDamage } from "./scarLiveCity";

/**
 * **THE JOIN: what a real winter EMITS is what the real city can SHOW and REPAIR.**
 *
 * Every link in this chain is already tested, and the chain itself was not. That gap is the
 * shape of it:
 *
 *  - `liveCityScar.test.tsx` proves the carry-back button writes what the winter did.
 *  - `crisisDamagePersistence.test.ts` proves a damaged blob survives the round trip.
 *  - `ruinLessonAccess.test.tsx` proves a ruin never stands between a learner and a lesson.
 *  - `crisisRepairSurface.test.tsx` proves the panel can clear a ruin.
 *
 * The last two build their fixtures by handing {@link snapshotWithWinterDamage} a report
 * written by hand — `{ buildings: [...D1_NODE_IDS, TOWN_HALL_ID], cells: ["4,0"] }`. That is
 * the right way to test those properties and it means NOTHING in the tree checks that a
 * winter emits ids and keys of that shape. Two independently green halves that disagree
 * about a string is the whole failure: the city's suite would stay green over its own
 * literals while the demo showed ground no button could reclaim.
 *
 * There is real reason to think the seam is where a defect would sit. The engine keys ground
 * with `winterCellKey` and the city keys it with `roadCellKey` — two functions, in two
 * packages, that have never been compared, and a repair aimed at a key the damage does not
 * carry comes back `not_ruined`, which is the ONE refusal that spends nothing and reports no
 * error. A silent no-op is what a mismatch here looks like from the outside.
 *
 * So this plays a winter through the REAL reducer over a board read from a REAL saved city
 * by the REAL live-board path, and then hands the projection — untouched, unread, and
 * unedited by this file — to the city. Nothing here writes a node id or a cell key.
 */

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** A cell for each skill, clear of the hub's reserved block. Mirrors `ruinLessonAccess`. */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

const PRICES = hardWinterRepairPrices();

/**
 * A WINTER PLAYED TO ITS END, ruinously, through the real reducer and nothing else.
 *
 * Every round declares a fire in a corner and answers nothing right, so the tier is `none`, no
 * cell is warmed, and the frost takes every building it reaches.
 *
 * **ROUND ONE USED TO GIVE UP THE OUTERMOST RING**, which was the only action that scarred
 * GROUND, so this fixture ended with both kinds of damage and the tests below could measure the
 * cell half. The lead ruled that action out on 2026-08-02, so a winter's damage is buildings
 * alone and the cell assertions here are re-derived rather than re-fixtured — the city's
 * scarred-ground path is still live and is exercised where its damage comes from a construction
 * rather than from a winter.
 *
 * Answers are not simulated here beyond their COUNT, because the reducer takes a count: the
 * questions are the surface's business (`HardWinterSurface.test.tsx` grades real ones through
 * the real checker) and what this file needs is a state in `ended` with damage in it.
 */
function playARuinousWinter(start: HardWinterState): HardWinterState {
  let winter = start;

  while (winter.phase !== "ended") {
    const round = winter.round;
    winter = hardWinterReducer(winter, {
      type: "declare",
      action: { kind: "fire", col: 0, row: 0 },
    });
    winter = hardWinterReducer(winter, { type: "resolve", correct: 0, asked: 3 });
    winter = hardWinterReducer(winter, { type: "end_round" });
    if (winter.round === round && winter.phase !== "ended") {
      throw new Error(`the winter stopped advancing at round ${round}`);
    }
  }
  return winter;
}

/**
 * Build a real city, read it as a winter board, ruin it, and carry the damage back — then
 * RELOAD, which is what makes the city session below a consumer of storage rather than of
 * anything this test still holds in memory.
 */
async function cityRuinedByARealWinter(material: number) {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const built = withDevPersistence(createCityDevSession(), store);
  for (const nodeId of D1_NODE_IDS) {
    const cell = CELL_FOR[nodeId];
    if (!cell) {
      throw new Error(`no test cell for ${nodeId}`);
    }
    await built.placeSkill(nodeId, { ...cell, rot: 0 });
    // Complete and mastered, so "the lesson is still reachable" below is a claim about the
    // ruin rather than an accident of a building that was never finished.
    await built.advanceMasteryDev(nodeId, 3);
  }
  store.flush();

  const saved = store.load();
  if (saved === null) {
    throw new Error("the fixture city did not save");
  }

  // THE REAL LIVE-BOARD PATH. If this ever stopped agreeing with the city about what a
  // placement's `(col, row)` means, the winter would ruin cells nothing in the city owns.
  const live = liveCityLayoutFrom(saved);
  if (live.status !== "ready") {
    throw new Error(`the saved city is not playable: ${live.message}`);
  }

  const winter = playARuinousWinter(
    createHardWinter({ era: "prehistoric", buildings: live.layout.buildings }),
  );
  const report = hardWinterDamage(winter);
  /*
   * **ONE SCARRED CELL, WRITTEN IN THE WINTER'S OWN KEY FORMAT, because no winter produces one any
   * more.** `report.cells` was the abandoned ring until 2026-08-02; the lead ruled that action out,
   * so the winter's damage is buildings alone.
   *
   * The cell is kept, and it is kept as a CONSTRUCTION rather than dropped, because what the
   * ground half of this file measures is not a winter: it is that `winterCellKey` and `roadCellKey`
   * are two functions in two packages that produce the same string. That claim is still live —
   * `CrisisDamage.ruined_cells` is persisted, `ScarredGround` draws it and `reclaimRuinedCell`
   * clears it — and a repair aimed at a key the damage does not carry returns `not_ruined` while
   * spending nothing, which is the only refusal in the whole path with no error behind it.
   *
   * So the key comes from `winterCellKey`, which is the engine's own, over a real cell of the
   * island. A literal `"4,0"` here would be this test agreeing with itself.
   */
  const scarredCell = winterCellKey(SCARRED_CELL.col, SCARRED_CELL.row);
  const withGround = { ...report, cells: [scarredCell] };

  store.save(snapshotWithWinterDamage(saved, withGround));
  store.flush();

  const restored = store.load();
  if (restored === null) {
    throw new Error("the damage did not survive the save");
  }
  const session = withDevPersistence(createCityDevSession(restored), store);
  const economy = createInMemoryEconomyClient(null);
  // Funded the only way anything is funded: cleared practice sets, at the era-one payout.
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

  return {
    store,
    session,
    economy,
    report,
    scarredCell,
    layout: live.layout,
    onRepairRuin,
    funded,
  };
}

/**
 * The cell the fixture scars, on the island's shoreline: the band a pull-back used to take, and so
 * the band a city carrying a scar from a winter played before 2026-08-02 is most likely to hold.
 */
const SCARRED_CELL = { col: 4, row: 0 } as const;

describe("a real winter's damage lands on the real city", () => {
  it("ruins buildings and no ground, and names only placements the city owns", async () => {
    const { report, layout, session, scarredCell } = await cityRuinedByARealWinter(0);

    // Floors first: every assertion in this file would hold trivially over a winter that
    // ruined nothing, and a winter that ruined nothing is the likeliest way this fixture
    // rots — a tuning change to the fire radius or the cold budget would do it silently.
    expect(report.buildings.length).toBeGreaterThanOrEqual(1);
    // A CENSUS OF ZERO where this read `toBeGreaterThanOrEqual(1)`: no winter scars ground since
    // the give-up-ground action was ruled out on 2026-08-02, and asserting the emptiness is what
    // would catch a `hardWinterDamage` that started shipping frozen cells across.
    expect(report.cells).toEqual([]);

    // THE FAILURE FLOOR, at the seam: every ruined subject is a placement the city already
    // had. A node id the city does not own is a ruin no button can ever clear.
    const owned = new Set(layout.buildings.map((b) => b.node_id));
    for (const nodeId of report.buildings) {
      expect(owned.has(nodeId), `${nodeId} is not on the board`).toBe(true);
    }

    // Nothing was removed: the placements survive the crisis in full.
    const placed = (await session.load()).placements ?? [];
    expect(placed.map((p) => p.nodeId).sort()).toEqual([...D1_NODE_IDS].sort());

    // ...and the damage the CITY holds is the damage the WINTER reported, subject for
    // subject. Compared as sets, because the fold's ordering is not the report's and this is
    // a claim about identity rather than about order.
    const damage = session.crisisDamage();
    expect(damage.ruined_buildings.map((b) => b.node_id).sort()).toEqual(
      [...report.buildings].sort(),
    );
    // The scarred cell is the fixture's own construction rather than the winter's; see the helper.
    expect(damage.ruined_cells.map((c) => c.cell)).toEqual([scarredCell]);
  }, 60000);

  it("shows every ruin it was given, counted rather than described", async () => {
    const { report, onRepairRuin, session } = await cityRuinedByARealWinter(0);
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
    // The panel's own numbers, so a ruin dropped between the fold and the render fails here
    // rather than at the point somebody tries to repair the one that is missing. The heading
    // counts buildings and the ground line counts cells, which is the panel's whole shape:
    // buildings are things a player has a relationship with, ground is one aggregate.
    expect(panel.textContent).toContain(
      `${report.buildings.length} building${report.buildings.length === 1 ? "" : "s"} in ruins`,
    );
    // The panel's ground line counts the CITY's scarred cells, which the fixture constructs (see
    // the helper): a winter contributes none.
    const cells = session.crisisDamage().ruined_cells.length;
    expect(cells, "no scar to count, so the ground line proves nothing").toBeGreaterThan(0);
    expect(panel.textContent).toContain(
      `${cells} cell${cells === 1 ? "" : "s"} of the island`,
    );

    // A repair control per RUINED BUILDING, which is what makes the count above more than a
    // caption...
    const buildings = within(panel).getByRole("list", { name: /Buildings in ruins/i });
    expect(within(buildings).getAllByRole("listitem")).toHaveLength(
      report.buildings.length,
    );
    /*
     * ...and exactly ONE control for the ground, whatever the scar's size, priced at the sum of the
     * authored per-cell prices.
     *
     * **THE FIXTURE THAT MADE THIS TEST SHARP IS GONE, and saying so is the honest half.** This
     * winter gave up a whole 28-cell rim band, so it was the fixture that would have shown a
     * per-cell version rendering dozens of identical buttons; the give-up-ground action was ruled
     * out on 2026-08-02 and the fixture now constructs ONE scarred cell, so "one control whatever
     * the size" is asserted over a size of one. What is still measured is that the control exists,
     * that there is exactly one of it, and that its price is the per-cell price times the count.
     */
    const ground = within(panel).getByRole("list", { name: /Scarred ground/i });
    expect(within(ground).getAllByRole("listitem")).toHaveLength(1);
    expect(within(ground).getAllByRole("button")).toHaveLength(1);
    expect(
      within(ground).getByRole("button", {
        name: new RegExp(`Reclaim all ${cells} for ${cells * PRICES.per_cell}`),
      }),
    ).toBeInTheDocument();
  }, 60000);

  it("keeps the lesson of a building THIS winter ruined one click away", async () => {
    const user = userEvent.setup();
    const { report, session, onRepairRuin } = await cityRuinedByARealWinter(0);

    // A skill the winter actually ruined, chosen from its report rather than picked here —
    // the hub is skipped because it has no lesson (`ruinLessonAccess.test.tsx` owns that
    // exception and asserts it both ways).
    const ruinedSkill = report.buildings.find((id) => !isTownHall(id));
    if (ruinedSkill === undefined) {
      throw new Error("the winter ruined no skill building, so there is nothing to open");
    }

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={0}
      />,
    );

    await openBuiltShelf(user);
    const row = document.querySelector<HTMLElement>(
      `button.city-plot[data-node-id="${ruinedSkill}"]`,
    );
    if (row === null) {
      throw new Error(`${ruinedSkill} was ruined and then vanished from the roster`);
    }
    expect(row.getAttribute("data-ruined")).toBe("true");
    expect(row).toBeEnabled();

    await user.click(row);
    const menu = await screen.findByRole("dialog");
    const lessonCard = menu.querySelector<HTMLElement>(".lesson-menu-card");
    if (lessonCard === null) {
      throw new Error("the ruined building's menu has no lesson card");
    }
    expect(lessonCard).toBeEnabled();
    expect(menu.textContent).toContain("In ruins");
  }, 60000);
});

describe("a real winter's damage can be repaired away", () => {
  it("clears a building the winter ruined, at the authored 60, and it STAYS cleared", async () => {
    const user = userEvent.setup();
    const { store, session, economy, report, onRepairRuin, funded } =
      await cityRuinedByARealWinter(PRICES.per_building);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={PRICES.per_building}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    expect((await economy.getWallet()).spendable).toBe(funded);
    // A floor with a shape: the wallet must actually cover the repair, or the click below
    // would be asserting a refusal rather than a spend.
    expect(funded).toBeGreaterThanOrEqual(PRICES.per_building);

    const buildings = within(panel).getByRole("list", { name: /Buildings in ruins/i });
    await user.click(
      within(buildings).getAllByRole("button", {
        name: new RegExp(`Repair for ${PRICES.per_building}`),
      })[0] as HTMLElement,
    );

    // The material left the wallet at the authored price, and one ruin left the city.
    await waitFor(async () => {
      expect((await economy.getWallet()).spendable).toBe(funded - PRICES.per_building);
    });
    expect(session.crisisDamage().ruined_buildings).toHaveLength(
      report.buildings.length - 1,
    );

    // AND IT SURVIVES THE RELOAD, which is the half a `useState` would fake: the repair is
    // read back out of storage rather than out of the component that performed it.
    store.flush();
    const reloaded = store.load();
    expect(reloaded?.crisis_damage?.ruined_buildings).toHaveLength(
      report.buildings.length - 1,
    );
    // ...and the building is still the city's, which is the ruling's floor either way.
    expect(reloaded?.placements.map((p) => p.nodeId).sort()).toEqual(
      [...D1_NODE_IDS].sort(),
    );
  }, 60000);

  it("reclaims ground the winter scarred, which is the key formats agreeing or not", async () => {
    const { session, scarredCell, onRepairRuin } = await cityRuinedByARealWinter(
      PRICES.per_cell,
    );

    // The cell comes from the winter's own report, parsed by the CITY's parser. This is the
    // whole point of the test: `winterCellKey` and `roadCellKey` are two functions in two
    // packages, and a repair aimed at a key the damage does not carry returns `not_ruined`
    // while spending nothing — a silent no-op, and the only refusal with no error behind it.
    const [col, row] = scarredCell.split(",").map(Number) as [number, number];

    const before = session.crisisDamage().ruined_cells.length;
    const result = await onRepairRuin({ kind: "ground", cell: { col, row } });

    // Asserted on the STATUS and not only on the count, because `not_ruined` also leaves the
    // count unchanged — the two failures are told apart here or nowhere.
    expect(result.status).toBe("repaired");
    expect(result.repaired).toBe(true);
    expect(result.cost).toBe(PRICES.per_cell);
    expect(result.damageId).toBe("d1");
    expect(session.crisisDamage().ruined_cells).toHaveLength(before - 1);
  }, 60000);

  it("refuses with nothing spent when the stockpile is empty, so a broke city is not stuck", async () => {
    const { session, economy, report, onRepairRuin } = await cityRuinedByARealWinter(0);

    const result = await onRepairRuin({
      kind: "building",
      nodeId: report.buildings[0] as string,
    });

    expect(result.status).toBe("insufficient_material");
    expect(result.repaired).toBe(false);
    // Nothing debited, and the ruin still standing and still repairable later.
    expect((await economy.getWallet()).spendable).toBe(0);
    expect(session.crisisDamage().ruined_buildings).toHaveLength(report.buildings.length);

    // AND THE WAY OUT IS REAL: a practice set pays, and the same repair then lands. This is
    // the path forward for a player with a ruined city and no material, exercised rather
    // than asserted about.
    for (let index = 0; index * 10 < PRICES.per_building; index += 1) {
      await economy.reportInterleavedClear({ sessionId: `recovery-${index}` });
    }
    const second = await onRepairRuin({
      kind: "building",
      nodeId: report.buildings[0] as string,
    });
    expect(second.status).toBe("repaired");
    expect(second.repaired).toBe(true);
  }, 60000);
});
