/**
 * PHOTOGRAPHS of GEO.1's two angle triangles, because "the corner measures what it says" is a
 * claim about a rendered surface and a passing measurement of it is not a picture of it.
 *
 * `drawnTriangle.ts` reads each corner off the painted outline and compares it with the label
 * printed in it, and `workedFigureLabels.browser.test.tsx` and
 * `interactive/GeoAngleExplore.browser.test.tsx` assert that per corner over every draw and
 * every board. That is the arithmetic. Whether the resulting shape READS as the shape its
 * numbers describe, whether its labels still sit in their own corners once they are laid out,
 * and whether any of it survives inside the column a learner is actually given, are questions
 * about a frame; `.cursor/rules/qa-verification.mdc` is explicit that the second does not
 * follow from the first.
 *
 * Framed on the WHOLE 920px lesson column (`CITY_DESKTOP`), not cropped to the figure. A shot
 * cropped to the thing that changed proves nothing about what is around it, and the triangle
 * is the one part of the picture nobody doubted.
 *
 * Shot at **1024x580**, a short realistic laptop rather than a comfortable developer viewport,
 * for the reason that rule gives.
 *
 * Not a visual-regression suite: nothing compares against a baseline, so there is no snapshot
 * to update. The assertions are that a shot was taken and that what it photographed was a
 * finished figure rather than an empty card. The PNGs land under `__screenshots__/`, which
 * `.gitignore` already excludes. Regenerate and read them with
 *
 *   npx vitest run --config vitest.browser.config.ts apps/web/src/lessons/d10Geo1TriangleShots.browser.test.tsx
 *
 * out of `apps/web/src/lessons/__screenshots__/d10-geo1-triangle/`.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { cornerMismatches } from "./drawnTriangle";
import { GEO_ANGLE_BOARDS, GeoAngleExplore } from "./interactive/GeoAngleExplore";
import { CITY_DESKTOP } from "./readingWidths";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { WorkedSolution } from "./WorkedSolution";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** A short laptop: ~507px of usable page height once the browser's own chrome is off it. */
const SHORT_LAPTOP = { width: 1024, height: 580 };

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** The column a learner is given in the in-city lesson window on a desktop. */
function inTheLessonColumn(node: Parameters<typeof mount>[0]): HTMLElement {
  h = mount(node);
  h.host.style.width = `${CITY_DESKTOP.column}px`;
  h.host.style.maxWidth = "100%";
  return h.host;
}

async function settle(host: HTMLElement): Promise<void> {
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "the figure typesets its maths",
    20_000,
  );
  await document.fonts.ready;
  // The reveal and the widget both open with a transition; a moving box photographs in the
  // wrong place.
  await new Promise<void>((resolve) => setTimeout(resolve, 420));
}

/** What every shot below has to have caught: a real figure, with its corners checked. */
function assertPhotographable(where: string, host: HTMLElement): void {
  const svg = host.querySelector("svg");
  expect(svg, `${where}: no figure to photograph`).not.toBeNull();
  expect(
    host.querySelectorAll(".katex").length,
    `${where}: the figure's math never typeset`,
  ).toBeGreaterThan(3);
  const box = (svg as SVGElement).getBoundingClientRect();
  expect(box.width, `${where}: the figure has no width`).toBeGreaterThan(200);
  expect(box.height, `${where}: the figure has no height`).toBeGreaterThan(60);
  expect(cornerMismatches(where, host).join("; "), `${where}: corners`).toBe("");
}

test("GEO.1's worked triangle photographs at 1024x580 in the 920px lesson column", async () => {
  // The reported instance, 60 / 60 / 60, which the old fixed outline drew as a scalene
  // triangle with an 80-degree apex; and the sharpest apex the template can deal, 80 / 80,
  // which is what a fixed outline could never have accommodated either.
  for (const params of [
    { triangle: 1, first: 60, second: 60, answer: 60 },
    { triangle: 1, first: 80, second: 80, answer: 20 },
  ]) {
    const where = `worked ${params.first}-${params.second}-${params.answer}`;
    const host = inTheLessonColumn(
      <WorkedSolution templateId="d10.geo1.angle-third.l2" params={params} steps={[]} />,
    );
    await waitFor(() => host.querySelector("svg") !== null, `${where}: the figure mounts`);
    await settle(host);
    assertPhotographable(where, host);

    if (CAPTURE_EVIDENCE) {
      const path = await page.screenshot({
        path: `__screenshots__/d10-geo1-triangle/worked-${params.first}-${params.second}.png`,
      });
      expect(path, `${where}: no screenshot was written`).toBeTruthy();
    }

    h?.cleanup();
    h = null;
  }
});

test("GeoAngleExplore's boards photograph at 1024x580 in the 920px lesson column", async () => {
  const host = inTheLessonColumn(<GeoAngleExplore />);
  await waitFor(() => host.querySelector("[data-angle-slot]") !== null, "the board mounts");

  for (const board of GEO_ANGLE_BOARDS) {
    const [first, second] = board.triangle;
    for (const value of [180 - board.crossing, board.crossing, 180 - first - second]) {
      const entry = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
      if (entry === null) {
        throw new Error("no answer box");
      }
      setInputValue(entry, `${value}`);
      findButton(host, "Check").click();
    }
    await waitFor(
      () => host.querySelectorAll('[data-angle-slot][data-state="solved"]').length === 3,
      `the board marked ${board.crossing} degrees is finished`,
    );
    await settle(host);

    const where = `board ${board.crossing}`;
    assertPhotographable(where, host);
    if (CAPTURE_EVIDENCE) {
      const path = await page.screenshot({
        path: `__screenshots__/d10-geo1-triangle/board-${board.crossing}.png`,
      });
      expect(path, `${where}: no screenshot was written`).toBeTruthy();
    }

    findButton(host, "Start over with different angles").click();
    await waitFor(
      () => host.querySelectorAll('[data-angle-slot][data-state="solved"]').length === 0,
      "the next board is dealt",
    );
  }
});
