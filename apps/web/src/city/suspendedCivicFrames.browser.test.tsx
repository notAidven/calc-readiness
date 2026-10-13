import { civicBuildingOrThrow, civicLiftSuspensionCost, EARN } from "@cr/economy";
import { expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { createInMemoryEconomyClient } from "../economy/economySession";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import {
  type CityDevSession,
  type CivicPayment,
  createCityDevSession,
  D1_NODE_IDS,
} from "./citySession";
import { type RepairTarget, repairCrisisDamage } from "./crisisRepair";
import { CURRENT_ERA_ID } from "./eraDressing";
import { SUSPENDED_CAPTION } from "./suspendedCivic";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  occupiedCells,
  type PlacedTransform,
} from "./worldLayout";

import "../styles.css";

/**
 * **CAN A PLAYER SEE WHICH BUILDINGS ARE SHUT, AND WHY?**
 *
 * That is a claim about a RENDERED FRAME and no passing test discharges it.
 * `suspendedCivicReachesTheCity.test.tsx` proves the two dials fall and the panel offers a
 * lift; it says nothing about whether anything on the island points at the building the
 * livability fell for. `.cursor/rules/qa-verification.mdc`: *"a spatial claim owes a rendered
 * frame that someone LOOKED at"*, at a short realistic viewport with the viewport named.
 *
 * So this mounts the real `CitySurface` over a real city with a real suspension, photographs
 * the whole window at **1024x580**, presses the real Reopen button, and photographs it again.
 *
 * ## Nothing about the composition is rebuilt
 *
 * `CitySurface` owns the wiring from its own `crisis_damage` through `CityCanvasHost` and
 * `CityScene` to the label overlay, and that chain is four optional props long. A harness that
 * mounted the scene itself would be photographing a composition the product does not have —
 * which is exactly the failure `carryBackFrames.browser.test.tsx` was written against.
 *
 * ## Off by default, for the reason `winterZeroAccuracy.browser.test.tsx` records
 *
 * A full shadow-mapped scene is heavy, and a heavy scene left switched on in this suite
 * starves an animation-timing assertion in a DIFFERENT file rather than failing here. Run:
 *
 *   VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/suspendedCivicFrames.browser.test.tsx
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** A short, realistic window — and the one every crisis frame in this tree is taken at. */
const VIEW = { width: 1024, height: 580 } as const;

const FRAMES = "docs/design-refs/suspended-civic";

const LODGE = civicBuildingOrThrow("prehistoric_longhouse");
const CAMPFIRE = civicBuildingOrThrow("prehistoric_campfire");

/** Six skills ringed round the hub's block, as the carry-back frames place them. */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

let h: Harness | null = null;

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function settle(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

/** The composited frame, over CDP — `page.screenshot` never settles over a live canvas. */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = testViewportBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(`${FRAMES}/${name}.png`, shot, { encoding: "base64" });
  }
}

/** Width and height out of a PNG's IHDR, so a scaled capture cannot pass for the viewport. */
function pngSize(base64: string): { width: number; height: number } {
  const binary = atob(base64);
  const at = (i: number): number => binary.charCodeAt(i) & 0xff;
  const read = (offset: number): number =>
    (at(offset) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3);
  expect(binary.slice(1, 4), "not a PNG").toBe("PNG");
  return { width: read(16) >>> 0, height: read(20) >>> 0 };
}

/**
 * Buy one civic building at the first seat the placement rule accepts.
 *
 * SEARCHED RATHER THAN PINNED, and not for tidiness: a refused `placeCivic` is a silent
 * no-op that returns a null id, and the first cut of this file hard-coded two cells that the
 * six-skill ring had already taken. A photograph of a city missing the building it is about
 * is the failure this searches past.
 */
async function buy(
  session: CityDevSession,
  economy: ReturnType<typeof createInMemoryEconomyClient>,
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
  const bought = await session.placeCivic(buildingId, spot, pay);
  if (bought.placementId === null) {
    throw new Error(`the fixture ${buildingId} was not bought: ${bought.status}`);
  }
  return bought.placementId;
}

/** Era one placed and mastered, two civic buildings bought, one of them shuttered. */
async function aCityWithAShutteredBuilding() {
  const economy = createInMemoryEconomyClient();
  for (const nodeId of D1_NODE_IDS) {
    await economy.reportLessonComplete({ nodeId });
  }
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
  await session.recordCrisisDamage({
    buildings: [],
    cells: [],
    suspended_civic: [lodge],
  });
  // A refused placement is a silent no-op, so the settlement in the frame is counted rather
  // than assumed: without this the picture can quietly become a picture of a smaller city.
  const load = await session.load();
  expect(load.placements?.map((p) => p.nodeId).sort()).toEqual([...D1_NODE_IDS].sort());
  expect(load.civic?.map((p) => p.nodeId).sort()).toEqual([lodge, campfire].sort());

  // Enough material to reopen it, earned through practice the way a player earns it.
  const lift = civicLiftSuspensionCost(LODGE, CURRENT_ERA_ID);
  for (let index = 0; index < Math.ceil(lift / EARN.interleaved.material); index += 1) {
    await economy.reportInterleavedClear({ sessionId: `lift-${index}` });
  }
  return { session, economy, lodge, campfire, lift };
}

/** Every caption the overlay is drawing right now, by placement id. */
function captions(): ReadonlyMap<string, string> {
  return new Map(
    Array.from(document.querySelectorAll<HTMLElement>("[data-skill-label]")).map(
      (element) => [element.dataset.skillLabel ?? "", element.textContent ?? ""] as const,
    ),
  );
}

test.runIf(SHOTS)(
  `photographs a city with a shuttered civic building at ${VIEW.width}x${VIEW.height}`,
  async () => {
    await page.viewport(VIEW.width, VIEW.height);
    const { session, economy, lodge, campfire, lift } = await aCityWithAShutteredBuilding();
    const spendableBefore = (await economy.getWallet()).spendable;

    h = mount(
      <CitySurface
        enableCanvas
        reducedMotion
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        goldAvailable={spendableBefore}
        materialAvailable={spendableBefore}
        // As `App.tsx` wires it, so what is photographed is the shipped composition.
        onRepairRuin={(target: RepairTarget) =>
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
          )
        }
        onOpenSurface={() => undefined}
      />,
    );

    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      40000,
    );
    await document.fonts.ready;
    // The GLBs resolve behind their own Suspense boundaries, so a first frame is a bare island.
    await settle(3500);
    /*
     * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip`
     * puts a device-metrics override on the page, which R3F reads as a resize, so the first
     * clipped capture after a mount comes back as the frame drawn before any of that settled.
     */
    await capture();
    await settle(800);

    /*
     * **THE CAPTION IS ON THE ISLAND AND IT IS ON THE RIGHT BUILDING**, asserted before the
     * frame is kept so a photograph of an island with no caption on it is a failure here
     * rather than something a reviewer has to notice.
     *
     * This is also the only assertion in the tree that covers `CityScene`'s pass-through to
     * the overlay: `suspendedCivicIsCrisisAgnostic` tests `skillLabelTargets` directly and
     * `CitySurface` hands the set to `CityCanvasHost`, but the four-prop chain between them
     * is only exercised by a real mount.
     */
    await waitFor(
      () => captions().get(lodge) === SUSPENDED_CAPTION,
      "the island is drawing no SUSPENDED caption over the shuttered building",
      20000,
    );
    // …and the Campfire beside it is captionless, so the caption MEANS something.
    expect(captions().has(campfire)).toBe(false);

    const shut = await capture();
    await keep(`${VIEW.width}x${VIEW.height}-1-a-shuttered-civic-building`, shut);

    // The reachable half, in the same frame: the panel names it, says what it is costing, and
    // offers the lift at the catalogue's price.
    const panel = query<HTMLElement>('[aria-label="Crisis damage"]');
    expect(panel.textContent).toContain(LODGE.name);
    expect(panel.textContent).toContain(`${LODGE.provides.livability} livability`);
    const sustainsShut = Number(
      /-?\d+/.exec(
        query<HTMLElement>('[data-testid="vitality-livability"] dd').textContent ?? "",
      )?.[0] ?? "0",
    );

    findButton(panel, new RegExp(`Reopen for ${lift} stone`)).click();
    await waitFor(
      () => document.querySelector('[aria-label="Crisis damage"]') === null,
      "the panel never cleared, so the lift did not land",
      20000,
    );
    // The caption goes with it, which is the other half of "a caption means something".
    await waitFor(
      () => !captions().has(lodge),
      "the caption is still over a building nobody has shut",
      20000,
    );
    await settle(2500);
    await capture();
    await settle(1200);

    const reopened = await capture();
    await keep(`${VIEW.width}x${VIEW.height}-2-the-same-city-reopened`, reopened);

    const sustainsOpen = Number(
      /-?\d+/.exec(
        query<HTMLElement>('[data-testid="vitality-livability"] dd').textContent ?? "",
      )?.[0] ?? "0",
    );
    expect(sustainsOpen).toBe(sustainsShut + LODGE.provides.livability);

    for (const [name, shot] of [
      ["shuttered", shut],
      ["reopened", reopened],
    ] as const) {
      const size = pngSize(shot);
      expect(size.width, `${name} came back ${size.width}px wide`).toBe(VIEW.width);
      expect(size.height, `${name} came back ${size.height}px tall`).toBe(VIEW.height);
    }

    if (SHOTS) {
      await commands.writeFile(
        `${FRAMES}/measured-${VIEW.width}x${VIEW.height}.txt`,
        [
          `viewport: ${VIEW.width}x${VIEW.height}, reducedMotion, one mount, camera untouched`,
          `shuttered: ${LODGE.name} (${lodge}), captioned ${SUSPENDED_CAPTION} on the island`,
          `standing beside it: ${CAMPFIRE.name} (${campfire}), captionless`,
          `livability sustained while shut: ${sustainsShut}`,
          `livability sustained after the lift: ${sustainsOpen} (+${LODGE.provides.livability})`,
          `the lift cost ${lift} stone, from a stockpile of ${spendableBefore}`,
          "",
          `1-a-shuttered-civic-building.png: the whole window — the caption over the Lodge,`,
          "  the crisis-damage panel naming it and pricing the lift, and City life short by 20",
          "2-the-same-city-reopened.png: the same city at the same camera after the press",
        ].join("\n"),
        { encoding: "utf-8" },
      );
    }

    h?.cleanup();
    h = null;
  },
  300000,
);
