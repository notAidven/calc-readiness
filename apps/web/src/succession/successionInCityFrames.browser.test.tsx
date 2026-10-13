import {
  createSuccession,
  SUCCESSION_LIVE_CITY_BOARD,
  type SuccessionState,
  successionReducer,
} from "@cr/game";
import type { ReactElement } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { createCityDevSession } from "../city/citySession";
import { CitySurface } from "../city/CitySurface";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { successionCityRoster } from "./successionCity";
import type { SuccessionBattleSnapshot, SuccessionSession } from "./successionSession";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_SUCCESSION_CITY_SHOTS);
const OUT = "output/design-review/succession-winter-standard/after";
const VIEWS = [
  { width: 1024, height: 580 },
  { width: 390, height: 580 },
] as const;
const PLACEMENTS = [
  { nodeId: "POL.1", col: -4, row: -3, rot: 0 },
  { nodeId: "POL.2", col: 3, row: -3, rot: 1 },
  { nodeId: "POL.3", col: -3, row: 3, rot: 2 },
  { nodeId: "POL.4", col: 3, row: 3, rot: 3 },
  { nodeId: "POL.8", col: 0, row: 5, rot: 0 },
] as const;

let harness: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
  localStorage.clear();
});

function sessionAt(state: SuccessionState): SuccessionSession {
  const battle: SuccessionBattleSnapshot = {
    revision: 1,
    state,
    active_batch: null,
    verdicts: [],
  };
  return {
    async load() {
      return { battle };
    },
    async command(command) {
      if (command.type !== "start") {
        throw new Error(`frame session received ${command.type}`);
      }
      return { battle };
    },
  };
}

function mid(state: SuccessionState): SuccessionState {
  const answering = successionReducer(state, { type: "start_batch" });
  return successionReducer(answering, {
    type: "resolve_batch",
    correct: 3,
    asked: 3,
  });
}

function settled(state: SuccessionState): SuccessionState {
  let next = state;
  while (next.phase !== "settled") {
    if (next.phase === "ready") {
      next = successionReducer(next, { type: "start_batch" });
    } else if (next.phase === "answering") {
      next = successionReducer(next, {
        type: "resolve_batch",
        correct: 0,
        asked: 3,
      });
    } else {
      next = successionReducer(next, { type: "finish_response" });
    }
  }
  return next;
}

function testerBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the browser test is not mounted in its tester frame");
  }
  const box = frame.getBoundingClientRect();
  return {
    x: box.left + window.parent.scrollX,
    y: box.top + window.parent.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function screenshot(path: string): Promise<void> {
  const session = cdp() as unknown as {
    send(method: string, params: Record<string, unknown>): Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...testerBox(), scale: 1 },
  });
  if (SHOTS) {
    await commands.writeFile(path, shot.data, { encoding: "base64" });
  }
}

async function frame(input: {
  readonly state: SuccessionState;
  readonly name: string;
  readonly view: (typeof VIEWS)[number];
  readonly city: ReturnType<typeof createCityDevSession>;
}): Promise<void> {
  await page.viewport(input.view.width, input.view.height);
  harness = mount(
    (
      <div className="city-shell" style={{ position: "fixed", inset: 0 }}>
        <CitySurface
          enableCanvas
          eraId="classical"
          reducedMotion
          loadCity={input.city.load}
          successionSession={sessionAt(input.state)}
          successionPreviewState={input.state}
          onOpenSurface={() => undefined}
        />
      </div>
    ) as ReactElement,
  );
  await waitFor(
    () => document.querySelector(".city-canvas canvas") !== null,
    `${input.name} never mounted the real city canvas`,
    60_000,
  );
  await waitFor(
    () => document.querySelector('[data-testid="succession-in-city"]') !== null,
    `${input.name} never mounted the in-city crisis`,
    30_000,
  );
  document
    .querySelector<HTMLElement>('[data-testid="sx-dev-skip"]')
    ?.style.setProperty("display", "none");
  await document.fonts.ready;
  // The stars and citizens are procedural and arrive before the GLBs. Wait for the model
  // suspense boundaries too, or the first frame can photograph labels floating over empty plots.
  await new Promise<void>((resolve) => setTimeout(resolve, 4000));

  const shell = document.querySelector<HTMLElement>(".city-surface");
  expect(shell?.getBoundingClientRect().width).toBe(input.view.width);
  expect(document.querySelectorAll('[data-testid="succession-in-city"]')).toHaveLength(1);
  await screenshot(`${OUT}/${input.name}-${input.view.width}x${input.view.height}.png`);
}

test.runIf(SHOTS)(
  "captures opening, escalation, and resolution on the same real city",
  async () => {
    for (const view of VIEWS) {
      const city = createCityDevSession(undefined, { placements: PLACEMENTS });
      for (const placement of PLACEMENTS) {
        await city.advanceMasteryDev(placement.nodeId, 3);
      }
      const loaded = await city.load();
      const roster = successionCityRoster({
        placements: loaded.placements ?? [],
        townHall: loaded.town_hall ?? null,
        civic: loaded.civic ?? [],
      });
      const opening = createSuccession({
        boardId: SUCCESSION_LIVE_CITY_BOARD,
        districts: roster.districts,
      });
      for (const [name, state] of [
        ["opening-world", opening],
        ["mid-escalation", mid(opening)],
        ["resolution", settled(opening)],
      ] as const) {
        await frame({ state, name, view, city });
        harness?.cleanup();
        harness = null;
      }
    }
  },
  300_000,
);
