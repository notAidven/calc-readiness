import type { CityVitality } from "@cr/game";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { CityVitalityPanel } from "./CityVitalityPanel";

import "../styles.css";

/**
 * The HUD and its progressive-disclosure Menu at real browser dimensions.
 *
 * The city itself keeps only Menu in the upper-right corner. Day and Sound live inside its
 * Environment section; App mounts the compact shell-level Sound control only over takeover
 * surfaces. The bottom lane contains only Build; the completed-building roster lives inside
 * its dialog. Every population is read from rendered DOM and floored with a named member so a
 * narrowed selector cannot pass empty.
 *
 * 1024x580 is the short laptop evidence viewport; 390x580 is the requested short phone.
 * The wider frame remains a regression check for the HUD's original overlap report.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
  document.body.innerHTML = "";
});

const VIEWPORTS = [
  { name: "1024x580", width: 1024, height: 580 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x580", width: 390, height: 580 },
] as const;

/** How much of the viewport's height counts as "the bottom lane". */
const BOTTOM_BAND = 0.3;

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface LaneControl {
  readonly id: string;
  readonly box: Box;
  /** Whether the element at the control's own centre is the control (or inside it). */
  readonly answersOwnCentre: boolean;
  /** What did answer, for the failure message. */
  readonly atOwnCentre: string;
  /** Position in the document's focusable order, or -1 if it is not reachable at all. */
  readonly tabPosition: number;
}

/** A stable, readable handle for a control, for assertions and failure messages. */
function handleOf(el: Element): string {
  const testId = (el as HTMLElement).dataset?.testid;
  if (testId) {
    return testId;
  }
  const classes = [...el.classList].join(".");
  return classes === "" ? el.tagName.toLowerCase() : `.${classes}`;
}

function visible(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

function describeControl(el: Element, focusable: readonly Element[]): LaneControl {
  const rect = el.getBoundingClientRect();
  const hit = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
  return {
    id: handleOf(el),
    box: {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
    },
    answersOwnCentre: hit !== null && el.contains(hit),
    atOwnCentre: hit === null ? "nothing" : handleOf(hit),
    tabPosition: focusable.indexOf(el),
  };
}

/** Every visible interactive control laid out in the bottom band of the viewport. */
function laneControls(): LaneControl[] {
  const focusable = [
    ...document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter(visible);

  const threshold = window.innerHeight * (1 - BOTTOM_BAND);
  return focusable
    .filter((el) => el.getBoundingClientRect().top >= threshold)
    .map((el) => describeControl(el, focusable));
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const hgt = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return w * hgt;
}

async function mountAt(view: { width: number; height: number }): Promise<void> {
  await page.viewport(view.width, view.height);
  h = mount(
    <div className="city-shell">
      <CitySurface enableCanvas={false} enableOnboardingDemo={false} />
    </div>,
  );
  await waitFor(
    () =>
      document.querySelector("button.city-build-button") !== null &&
      document.querySelector("button.hud-menu-toggle") !== null,
    "Build and Menu both mount",
    20_000,
  );
  // One frame, so both trees have been laid out before anything is measured.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function laneAt(view: { width: number; height: number }): Promise<LaneControl[]> {
  await mountAt(view);
  return laneControls();
}

async function openMenu(): Promise<HTMLElement> {
  const trigger = document.querySelector<HTMLButtonElement>(".hud-menu-toggle");
  if (!trigger) {
    throw new Error("Menu trigger did not mount");
  }
  trigger.click();
  await waitFor(
    () => document.querySelector(".city-menu-popover") !== null,
    "Menu popover did not open",
  );
  const menu = document.querySelector<HTMLElement>(".city-menu-popover");
  if (!menu) {
    throw new Error("Menu popover did not open");
  }
  return menu;
}

function environmentGroupsDayAndSound(): boolean {
  const environment = document.querySelector<HTMLElement>(
    '[data-testid="menu-environment"]',
  );
  const day = document.querySelector<HTMLElement>('[data-testid="lighting-toggle"]');
  const sound = document.querySelector<HTMLElement>('[data-testid="audio-settings"]');
  return (
    environment !== null &&
    day !== null &&
    sound !== null &&
    environment.contains(day) &&
    environment.contains(sound)
  );
}

test.each(VIEWPORTS)(
  "no control in the bottom HUD lane covers another at $name",
  async (view) => {
    const lane = await laneAt(view);
    const ids = lane.map((control) => control.id);

    // FLOOR AND COMPOSITION. The Buildings chip did not merely move out of this selector:
    // it left the document and its roster moved inside Build.
    expect(lane.length, `lane held ${ids.join(", ")}`).toBeGreaterThanOrEqual(1);
    expect(ids).not.toContain("audio-settings-toggle");
    expect(ids.some((id) => id.includes("city-build-button"))).toBe(true);
    expect(document.querySelector(".hud-buildings-toggle")).toBeNull();

    for (let i = 0; i < lane.length; i += 1) {
      for (let k = i + 1; k < lane.length; k += 1) {
        const a = lane[i] as LaneControl;
        const b = lane[k] as LaneControl;
        expect(
          overlapArea(a.box, b.box),
          `${a.id} ${JSON.stringify(a.box)} overlaps ${b.id} ${JSON.stringify(b.box)}`,
        ).toBe(0);
      }
    }
  },
);

test.each(VIEWPORTS)(
  "every bottom-lane control answers its own centre at $name",
  async (view) => {
    const lane = await laneAt(view);
    expect(lane.length).toBeGreaterThanOrEqual(1);
    for (const control of lane) {
      expect(
        control.answersOwnCentre,
        `${control.id}'s own centre resolves to ${control.atOwnCentre}`,
      ).toBe(true);
    }
  },
);

/**
 * **KEYBOARD ORDER AND HIT TARGET ARE SEPARATE QUESTIONS, so they get separate assertions.**
 *
 * The overlap never broke keyboard access — measured before the fix, the Buildings chip was
 * 9th and the Sound chip 12th of 13 focusables, both reachable — and a fix that separated the
 * boxes by taking one of them out of the tab order would trade a mouse-only target for a
 * keyboard-only one. So both are pinned: every control in the lane is in the focusable order,
 * and every one of them is at least the 44px target the dock's own thumb-zone rule asks for.
 */
test.each(VIEWPORTS)(
  "bottom controls stay reachable by keyboard and by thumb at $name",
  async (view) => {
    const lane = await laneAt(view);
    expect(lane.length).toBeGreaterThanOrEqual(1);
    for (const control of lane) {
      expect(
        control.tabPosition,
        `${control.id} is not in the focusable order`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        control.box.bottom - control.box.top,
        `${control.id} is only ${control.box.bottom - control.box.top}px tall`,
      ).toBeGreaterThanOrEqual(44);
    }
  },
);

test.each(VIEWPORTS)("the city floats neither Day nor Sound at $name", async (view) => {
  await mountAt(view);
  expect(document.querySelector('[data-testid="lighting-toggle"]')).toBeNull();
  expect(document.querySelector('[data-testid="audio-settings"]')).toBeNull();

  const menu = document.querySelector<HTMLElement>(".hud-menu-toggle");
  if (!menu) {
    throw new Error("Menu trigger did not mount");
  }
  const control = describeControl(
    menu,
    [...document.querySelectorAll("button:not([disabled])")].filter(visible),
  );
  expect(control.answersOwnCentre).toBe(true);
  expect(control.tabPosition).toBeGreaterThanOrEqual(0);
  expect(control.box.bottom - control.box.top).toBeGreaterThanOrEqual(44);
});

test.each(VIEWPORTS)(
  "Environment groups keyboard-reachable Day and Sound controls at $name",
  async (view) => {
    await mountAt(view);
    const menu = await openMenu();
    expect(environmentGroupsDayAndSound()).toBe(true);
    const camera = document.querySelector<HTMLElement>(".hud-camera-cluster");
    if (!camera) {
      throw new Error("camera controls did not mount");
    }
    expect(visible(camera), "camera controls cover the Menu instead of standing down").toBe(
      false,
    );

    const focusable = [
      ...document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter(visible);
    const controls = [
      menu.querySelector<HTMLElement>('[data-testid="lighting-toggle"]'),
      menu.querySelector<HTMLElement>('[data-testid="audio-settings-toggle"]'),
    ];
    expect(controls.filter(Boolean)).toHaveLength(2);
    const described: LaneControl[] = [];
    for (const node of controls) {
      if (!node) {
        throw new Error("Environment lost one of its two controls");
      }
      const control = describeControl(node, focusable);
      described.push(control);
      expect(control.answersOwnCentre, control.atOwnCentre).toBe(true);
      expect(control.tabPosition).toBeGreaterThanOrEqual(0);
      expect(control.box.bottom - control.box.top).toBeGreaterThanOrEqual(44);
    }
    expect(described[0]?.tabPosition).toBeLessThan(described[1]?.tabPosition ?? -1);

    const box = menu.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(view.width);
    expect(box.bottom).toBeLessThanOrEqual(view.height);
  },
);

test("the Environment guard rejects Sound moved back outside Menu", async () => {
  await mountAt({ width: 1024, height: 580 });
  await openMenu();
  expect(environmentGroupsDayAndSound()).toBe(true);

  const soundRoot = document.querySelector('[data-testid="audio-settings"]');
  if (!(soundRoot instanceof HTMLElement)) {
    throw new Error("Sound root did not mount");
  }
  document.body.append(soundRoot);

  // Defect injection: the same predicate used by the sweep goes red when Sound is returned
  // to a shell-level lane, proving the containment assertion is load-bearing.
  expect(environmentGroupsDayAndSound()).toBe(false);
});

test.each([
  { name: "1024x580", width: 1024, height: 580 },
  { name: "390x580", width: 390, height: 580 },
])("City Life remains a compact single instrument at $name", async (view) => {
  await mountAt(view);
  const panel = document.querySelector('[data-testid="city-vitality"]');
  if (!(panel instanceof HTMLElement)) {
    throw new Error("City Life did not mount");
  }
  const box = panel.getBoundingClientRect();
  const rows = [...panel.querySelectorAll(".hud-vitality-row")];
  const help = [...panel.querySelectorAll(".hud-vitality-help")];

  expect(rows).toHaveLength(3);
  expect(help).toHaveLength(3);
  expect(box.width).toBeLessThanOrEqual(196);
  // At phone width City Life keeps its status lines and bars visible rather than hiding
  // them. The content therefore has a 212px budget, which keeps its measured 208px
  // reading clear of the bottom controls on a 580px screen.
  expect(box.height).toBeLessThanOrEqual(212);
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(view.width);
  expect(box.bottom).toBeLessThanOrEqual(view.height);

  const readings = rows.map((row) => {
    const term = row.querySelector("dd");
    if (!(term instanceof HTMLElement)) {
      throw new Error(`${row.getAttribute("data-testid")} has no rendered reading`);
    }
    return {
      id: row.getAttribute("data-testid") ?? "unknown vitality row",
      text: (term.textContent ?? "").replace(/\s+/g, " ").trim(),
      box: (() => {
        const termBox = term.getBoundingClientRect();
        // A min-width fix could contain the <dd> box while its glyphs still paint outside it.
        const descendants = [...term.querySelectorAll<HTMLElement>("*")].map((node) =>
          node.getBoundingClientRect(),
        );
        return {
          left: Math.min(termBox.left, ...descendants.map((box) => box.left)),
          right: Math.max(termBox.right, ...descendants.map((box) => box.right)),
        };
      })(),
    };
  });
  expect(readings).toHaveLength(3);
  for (const reading of readings) {
    expect(
      reading.box.right,
      `${reading.id} "${reading.text}" ends at x=${reading.box.right.toFixed(2)}, ` +
        `${(reading.box.right - box.right).toFixed(2)}px past the City Life backing at ` +
        `${view.name}`,
    ).toBeLessThanOrEqual(box.right);
    expect(
      reading.box.left,
      `${reading.id} starts outside City Life at ${view.name}`,
    ).toBeGreaterThanOrEqual(box.left);
  }

  for (const row of rows.filter(
    (candidate) => candidate.getAttribute("data-alarm") === "true",
  )) {
    const style = getComputedStyle(row);
    expect(style.borderLeftWidth).toBe("0px");
    expect(style.backgroundImage).toBe("none");
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  }
});

const LONG_CITY_LIFE_VALUES: CityVitality = {
  population: 999_999,
  livability: { sustains: 999_999 },
  happiness: {
    coverage: 999_999,
    covered: 999_999,
    uncovered: 0,
    level: 100,
    band: "content",
    fromPaths: 999_999,
  },
  shortfalls: { livability: 0, happiness: 0, practice: 0, none: false },
  provision: { pressure: 0, cause: null, unmet: false },
};

function contentBox(panel: HTMLElement): Box {
  const rect = panel.getBoundingClientRect();
  const style = getComputedStyle(panel);
  const left = rect.left + panel.clientLeft + Number.parseFloat(style.paddingLeft);
  const top = rect.top + panel.clientTop + Number.parseFloat(style.paddingTop);
  return {
    left,
    top,
    right: rect.right - panel.clientLeft - Number.parseFloat(style.paddingRight),
    bottom: rect.bottom - panel.clientTop - Number.parseFloat(style.paddingBottom),
  };
}

function staysInside(box: DOMRect, bounds: Box): boolean {
  const tolerance = 0.5;
  return (
    box.left >= bounds.left - tolerance &&
    box.top >= bounds.top - tolerance &&
    box.right <= bounds.right + tolerance &&
    box.bottom <= bounds.bottom + tolerance
  );
}

test.each([
  { name: "1024x580", width: 1024, height: 580 },
  { name: "390x580", width: 390, height: 580 },
])(
  "long City Life values keep every stat part inside the learner panel at $name",
  async (view) => {
    await page.viewport(view.width, view.height);
    h = mount(
      <div className="city-shell">
        <CityVitalityPanel vitality={LONG_CITY_LIFE_VALUES} />
      </div>,
    );
    await waitFor(
      () => document.querySelector('[data-testid="city-vitality"]') !== null,
      "City Life panel mounts",
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const panel = document.querySelector<HTMLElement>('[data-testid="city-vitality"]');
    if (!panel) {
      throw new Error("City Life did not mount");
    }
    const bounds = contentBox(panel);
    const parts = [
      ...panel.querySelectorAll<HTMLElement>(
        ".hud-vitality-row dt, .hud-vitality-row dd, .hud-vitality-figure, .hud-vitality-unit, [role='progressbar'], .hud-vitality-terms, .hud-vitality-help",
      ),
      ...panel.querySelectorAll<HTMLElement>(
        ".hud-vitality-scale, .hud-vitality-scale-fill, .hud-vitality-cells, .hud-vitality-cells-fill",
      ),
    ];

    expect(parts.length).toBeGreaterThanOrEqual(16);
    for (const part of parts) {
      expect(
        staysInside(part.getBoundingClientRect(), bounds),
        `${part.className || part.tagName} escaped City Life's content box`,
      ).toBe(true);
    }
  },
);
