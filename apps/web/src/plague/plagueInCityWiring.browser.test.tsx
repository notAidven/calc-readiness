import { createPlague, type PlagueState, plagueReducer } from "@cr/game";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { PlagueRoute } from "./PlagueRoute";
import type { PlagueSession } from "./plaguePersistence";

import "../styles.css";

const REVIEW = Boolean(import.meta.env.VITE_PLAGUE_WINTER_REVIEW);
const OUT = "output/design-review/plague-winter-standard";

function fixedSession(initial: PlagueState): PlagueSession {
  let state = initial;
  return {
    load: async () => state,
    start: async () => state,
    dispatch: async (event) => {
      state = plagueReducer(state, event);
      return state;
    },
  };
}

function testerBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (frame === null) {
    throw new Error("the browser test has no tester frame");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function capture(name: string): Promise<void> {
  const session = cdp() as unknown as {
    send(
      method: string,
      params: Record<string, unknown>,
    ): Promise<{ readonly data: string }>;
  };
  const box = testerBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (REVIEW) {
    await commands.writeFile(`${OUT}/${name}.png`, shot.data, { encoding: "base64" });
  }
}

let harness: Harness | null = null;
const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

afterEach(() => {
  harness?.cleanup();
  harness = null;
  window.history.replaceState(null, "", originalUrl);
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("cr.plague-care-house.") || key?.startsWith("cr.devSession.")) {
      localStorage.removeItem(key);
    }
  }
});

test("the actual Plague application route opens on a fresh local city", async () => {
  window.history.replaceState(null, "", `${window.location.pathname}?plague&reset`);
  harness = mount(<App />);

  await waitFor(
    () =>
      document.querySelector(".city-viewport canvas") !== null &&
      document.querySelector('[data-testid="pl-care-house"]') !== null,
    "the actual Plague route did not keep its live city and crisis mounted",
    30000,
  );
  expect(document.querySelector('[data-testid="plague-in-city"]')).not.toBeNull();
  expect(
    document.querySelector('[data-testid="onboarding-advisor"]'),
    "the first-run advisor covered the live city behind the Care House",
  ).toBeNull();
});

test("the Plague preview route mounts the crisis on a visible city renderer", async () => {
  harness = mount(<PlagueRoute session={fixedSession(createPlague())} />);
  await waitFor(
    () => document.querySelector('[data-testid="pl-care-house"]') !== null,
    "the Plague surface never opened",
    30000,
  );

  for (const viewport of [
    { width: 1024, height: 580, name: "before-opening-1024x580" },
    { width: 390, height: 580, name: "before-opening-390x580" },
  ] as const) {
    await page.viewport(viewport.width, viewport.height);
    await document.fonts.ready;
    if (REVIEW) {
      await capture(viewport.name);
    }
  }

  expect(
    document.querySelector(".city-viewport canvas"),
    "the route rendered the Care House over an empty city-shell instead of the live island",
  ).not.toBeNull();
  expect(document.querySelector('[data-testid="plague-in-city"]')).not.toBeNull();
});
