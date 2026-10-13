import type { ReactElement } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { SuccessionFixtureRoute } from "./SuccessionFixtureRoute";
import { SuccessionSurface } from "./SuccessionSurface";
import { type SuccessionScenarioId, successionScenario } from "./successionScenarios";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_SUCCESSION_CIVIL_WAR_SHOTS);
const DESKTOP = { width: 1024, height: 580 } as const;
const PHONE = { width: 390, height: 580 } as const;
const OUT = "output/era-04-succession/classical-civil-war";

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

async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send(method: string, params?: Record<string, unknown>): Promise<{ data: string }>;
  };
  const box = testerBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...box, scale: 1 },
  });
  return shot.data;
}

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));
}

async function frame(input: {
  readonly name: string;
  readonly view: { readonly width: number; readonly height: number };
  readonly surface: ReactElement;
  readonly ready: string;
}): Promise<void> {
  await page.viewport(input.view.width, input.view.height);
  harness = mount(
    <div className="city-shell crisis-route-host" style={{ position: "fixed", inset: 0 }}>
      {input.surface}
    </div>,
  );
  await waitFor(
    () => document.querySelector(input.ready) !== null,
    `${input.name} never reached ${input.ready}`,
    20_000,
  );
  await waitFor(
    () => document.querySelector(".sx-viewport canvas") !== null,
    `${input.name} never mounted the real forum canvas`,
    20_000,
  );
  await document.fonts.ready;
  await settle();

  const shell = document.querySelector<HTMLElement>(".sx-shell");
  const city = document.querySelector<HTMLElement>(".sx-viewport");
  const side = document.querySelector<HTMLElement>(".sx-side");
  if (!shell || !city || !side) {
    throw new Error(`${input.name} has no whole surface`);
  }
  const shellBox = shell.getBoundingClientRect();
  const cityBox = city.getBoundingClientRect();
  expect(Math.round(shellBox.width)).toBe(input.view.width);
  expect(Math.round(shellBox.height)).toBe(input.view.height);
  expect(side.scrollTop, `${input.name} opened with its controls scrolled`).toBe(0);
  if (input.view.width === DESKTOP.width) {
    expect(
      cityBox.width / shellBox.width,
      "surrounding forum is not visible",
    ).toBeGreaterThan(0.55);
  } else {
    expect(cityBox.height / shellBox.height, "phone frame lost the city").toBeGreaterThan(
      0.3,
    );
  }
  const strategic = side.querySelector<HTMLElement>(".sx-actions, .sx-proposal");
  if (strategic) {
    expect(strategic.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      side.getBoundingClientRect().bottom + 1,
    );
  }
  for (const button of side.querySelectorAll<HTMLButtonElement>("button")) {
    const box = button.getBoundingClientRect();
    if (box.bottom > 0 && box.top < input.view.height) {
      expect(
        box.height,
        `${button.textContent} is shorter than 44px`,
      ).toBeGreaterThanOrEqual(44);
    }
  }

  if (SHOTS) {
    if (SHOTS) {
      await commands.writeFile(`${OUT}/${input.name}.png`, await capture(), {
        encoding: "base64",
      });
    }
  }
}

test("the required civil-war states keep the surrounding city in frame", async () => {
  await frame({
    name: "01-announcement-1024x580",
    view: DESKTOP,
    surface: (
      <SuccessionFixtureRoute
        initial={successionScenario("announcement").build()}
        enableCanvas
      />
    ),
    ready: '[data-testid="sx-advisor"]',
  });
  const later = document.querySelector<HTMLElement>('[data-testid="sx-advisor-later"]');
  if (!later) {
    throw new Error("the advisor has no dismissal control");
  }
  const laterBox = later.getBoundingClientRect();
  const hit = document.elementFromPoint(
    laterBox.left + laterBox.width / 2,
    laterBox.top + laterBox.height / 2,
  );
  expect(
    hit === later || later.contains(hit),
    "the full-bleed forum intercepts the advisor's controls",
  ).toBe(true);

  const states: readonly {
    name: string;
    scenario: SuccessionScenarioId;
    ready: string;
    reducedMotion?: boolean;
    view?: typeof PHONE;
  }[] = [
    {
      name: "02-rally-proposed-1024x580",
      scenario: "rally-choice",
      ready: '[data-testid="sx-proposal"]',
    },
    {
      name: "03-reopen-proposed-1024x580",
      scenario: "reopen-choice",
      ready: '[data-testid="sx-proposal"]',
    },
    {
      name: "04-correct-consequence-1024x580",
      scenario: "correct-consequence",
      ready: '[data-testid="sx-response"]',
    },
    {
      name: "05-incorrect-consequence-1024x580",
      scenario: "incorrect-consequence",
      ready: '[data-testid="sx-response"]',
    },
    {
      name: "06-best-ending-1024x580",
      scenario: "best-ending",
      ready: '[data-testid="sx-conclusion"][data-verdict="best"]',
    },
    {
      name: "07-partial-ending-1024x580",
      scenario: "partial-ending",
      ready: '[data-testid="sx-conclusion"][data-verdict="partial"]',
    },
    {
      name: "08-rally-proposed-390x580",
      scenario: "rally-choice",
      ready: '[data-testid="sx-proposal"]',
      view: PHONE,
    },
    {
      name: "09-reduced-motion-1024x580",
      scenario: "correct-consequence",
      ready: '.sx-shell[data-reduced-motion="true"]',
      reducedMotion: true,
    },
  ];

  for (const state of states) {
    await frame({
      name: state.name,
      view: state.view ?? DESKTOP,
      surface: (
        <SuccessionSurface
          initial={successionScenario(state.scenario).build()}
          enableCanvas
          reducedMotion={state.reducedMotion}
        />
      ),
      ready: state.ready,
    });
    harness?.cleanup();
    harness = null;
  }
}, 180_000);
