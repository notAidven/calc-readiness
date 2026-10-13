/**
 * The collapsed-surd guard: a radical's hook-and-bar has to actually be painted.
 *
 * `.lesson-visual svg` and `.lesson-interactive svg` are DESCENDANT selectors, so they also
 * match the tiny `<svg>` KaTeX draws a radical's surd with, and their `height: auto` beat
 * KaTeX's own `height: inherit` and collapsed it to about a tenth of a pixel. The radical
 * sign was then not painted at all: every D2 diagram and figure caption rendered
 * `\sqrt{50t^{7}}` as a bare `50t^{7}`, a different and false statement.
 *
 * No jsdom test can see this — jsdom has no layout — and no other browser test could see it
 * either, because they all mount into a bare host where the app stylesheet never applies.
 * So this file loads the real stylesheet, and it loads it in the real ORDER: the two rules
 * tie with KaTeX's on specificity, so which one wins is decided purely by which sheet is
 * injected last. `main.tsx` imports the component tree (which pulls in `katex.min.css` via
 * `svgKit`) and only THEN `./styles.css`, so the app's rules win in the app. Importing
 * `../styles.css` first here would silently invert that and the guard would pass on a
 * broken build, which is why `styles.css` is imported last below and why the first test
 * asserts the ordering it depends on.
 */

import { expect, test } from "vitest";

import { allLessons } from "./domains";
import { mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

import "../styles.css";

/** Every visual id any lesson places, across every registered domain. */
const liveVisualIds = () =>
  Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  );

/** Index of the first injected stylesheet carrying a selector `match` accepts. */
function sheetIndexWithSelector(match: (selector: string) => boolean): number {
  return Array.from(document.styleSheets).findIndex((sheet) => {
    try {
      return Array.from(sheet.cssRules).some((rule) => {
        const selector = (rule as CSSStyleRule).selectorText;
        return typeof selector === "string" && match(selector);
      });
    } catch {
      return false; // cross-origin sheet; not ours either way.
    }
  });
}

/**
 * The surd is the `<svg>` inside the `.hide-tail` span KaTeX wraps it in, and that span
 * carries the height the glyph is supposed to fill. Measuring the svg against its own
 * wrapper rather than against a pixel constant keeps the assertion true at any font size.
 */
function surdsIn(root: ParentNode): { svg: SVGElement; wrapper: HTMLElement }[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".katex .hide-tail")).flatMap(
    (wrapper) => {
      const svg = wrapper.querySelector("svg");
      return svg ? [{ svg, wrapper }] : [];
    },
  );
}

test("the app stylesheet loads after KaTeX's, as it does in the app", () => {
  const katexSheet = sheetIndexWithSelector((s) => s.includes(".hide-tail"));
  const appSheet = sheetIndexWithSelector((s) => s.includes(".lesson-visual svg"));

  expect(katexSheet, "KaTeX's stylesheet is loaded").toBeGreaterThanOrEqual(0);
  expect(appSheet, "the app stylesheet is loaded").toBeGreaterThanOrEqual(0);
  // If this ever flips, the two tests below stop testing anything: KaTeX's `height:
  // inherit` would win on source order and the surd would be correct by accident.
  expect(
    appSheet,
    "the app stylesheet must be injected after KaTeX's, or the surd guard is vacuous",
  ).toBeGreaterThan(katexSheet);
});

test("a radical's surd is painted at full height in every lesson visual", async () => {
  let measured = 0;

  for (const id of liveVisualIds()) {
    const local = mount(<LessonVisual id={id} />);
    const { host } = local;
    await waitFor(
      () => host.querySelector("figure.lesson-visual") !== null,
      `renders ${id}`,
    );

    for (const { svg, wrapper } of surdsIn(host)) {
      const surd = svg.getBoundingClientRect();
      const slot = wrapper.getBoundingClientRect();
      measured += 1;

      // The collapse measured about 0.1px. A painted surd fills its wrapper.
      expect(surd.height, `${id}: surd has height`).toBeGreaterThan(1);
      expect(surd.width, `${id}: surd has width`).toBeGreaterThan(1);
      expect(surd.height, `${id}: surd fills its .hide-tail slot`).toBeGreaterThanOrEqual(
        slot.height * 0.9,
      );
    }

    local.cleanup();
  }

  // Without this the sweep would pass vacuously the day it stops drawing radicals, which
  // is exactly the day it stops being a guard.
  expect(measured, "the sweep rendered radicals to measure").toBeGreaterThan(10);
});

/**
 * The same property one layer in. The second offending rule is `.lesson-interactive svg`,
 * so a fix that only restored the figure-level one would leave every widget collapsed.
 */
test("and inside a widget's own .lesson-interactive container", async () => {
  const local = mount(<LessonVisual id="simplify-radical-solver" />);
  const { host } = local;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the widget container mounts",
  );

  const container = host.querySelector<HTMLElement>(".lesson-interactive");
  if (!container) {
    throw new Error("no .lesson-interactive container");
  }
  const surds = surdsIn(container);
  expect(surds.length, "the widget draws at least one radical").toBeGreaterThan(0);

  for (const { svg, wrapper } of surds) {
    const surd = svg.getBoundingClientRect();
    expect(surd.height).toBeGreaterThan(1);
    expect(surd.height).toBeGreaterThanOrEqual(
      wrapper.getBoundingClientRect().height * 0.9,
    );
  }

  local.cleanup();
});
