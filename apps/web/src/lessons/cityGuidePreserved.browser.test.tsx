/**
 * The stylesheet half of CityGuide's preservation (see `cityGuidePreserved.test.tsx` for
 * why it is preserved at all). Its `.city-guide` block in `styles.css` STAYS, and this is
 * what makes that a decision with evidence behind it rather than 96 lines nobody dared
 * delete: the poses still resolve through the cascade, and the motion is still gated.
 *
 * A component with no consumer cannot lose its CSS loudly. Deleting the block would leave
 * `CityGuideCharacter` rendering an unstyled pile of overlapping SVG at every mood, and
 * nothing would say so until someone tried to wire it up for era eight — which is exactly
 * the archaeology this preservation is meant to avoid.
 *
 * Real Chromium and the real stylesheet, imported LAST as `main.tsx` imports it.
 */

import { afterEach, expect, test } from "vitest";

import { CityGuideCharacter, type CityGuideMood } from "./CityGuideCharacter";
import { type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

const MOODS: readonly CityGuideMood[] = ["idle", "talk", "wave", "cheer"];

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

async function character(mood: CityGuideMood): Promise<HTMLElement> {
  h?.cleanup();
  const harness = mount(<CityGuideCharacter mood={mood} />);
  h = harness;
  await waitFor(
    () => harness.host.querySelector(`.city-guide[data-mood="${mood}"]`) !== null,
    `CityGuide mounted at mood ${mood}`,
  );
  return harness.host.querySelector<HTMLElement>(".city-guide") as HTMLElement;
}

function one(root: HTMLElement, cls: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`.${cls}`);
  if (!found) {
    throw new Error(`missing part: ${cls}`);
  }
  return found;
}

/** The class list of every element the browser reports as carrying an animation. */
function animatingParts(root: HTMLElement): string[][] {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  return nodes
    .filter((node) => getComputedStyle(node).animationName !== "none")
    .map((node) => Array.from(node.classList));
}

/** Every `city-guide__…` class a `prefers-reduced-motion: reduce` block stands down. */
function reducedMotionClasses(): Set<string> {
  const found = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        if (!rule.conditionText.includes("prefers-reduced-motion")) {
          continue;
        }
        for (const inner of Array.from(rule.cssRules)) {
          if (!(inner instanceof CSSStyleRule)) {
            continue;
          }
          if (inner.style.getPropertyValue("animation-name") !== "none") {
            continue;
          }
          for (const [, cls] of inner.selectorText.matchAll(/\.(city-guide__[\w-]+)/g)) {
            if (cls) {
              found.add(cls);
            }
          }
        }
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    walk(sheet.cssRules);
  }
  return found;
}

test("its stylesheet block is still in styles.css", async () => {
  const root = await character("idle");
  // The block is not merely present, it is still doing work: `.city-guide` sizes the SVG
  // and `__body` carries the bob. Both read a browser default if the block is gone.
  expect(getComputedStyle(root).display).toBe("block");
  expect(getComputedStyle(one(root, "city-guide__body")).animationName).toBe("cg-bob");
  expect(reducedMotionClasses().size).toBeGreaterThan(0);
});

test("all four poses still resolve through the cascade", async () => {
  // idle: the arm sways, open eyes, a smile.
  let root = await character("idle");
  expect(getComputedStyle(one(root, "city-guide__arm")).animationName).toBe("cg-sway");
  expect(getComputedStyle(one(root, "city-guide__eyes-happy")).display).toBe("none");
  expect(getComputedStyle(one(root, "city-guide__mouth-smile")).opacity).toBe("1");
  expect(getComputedStyle(one(root, "city-guide__mouth-talk")).opacity).toBe("0");

  // talk: the smile hands over to the chattering mouth.
  root = await character("talk");
  expect(getComputedStyle(one(root, "city-guide__mouth-smile")).opacity).toBe("0");
  expect(getComputedStyle(one(root, "city-guide__mouth-talk")).animationName).toBe(
    "cg-talk",
  );

  // wave: the same arm, a different keyframe set.
  root = await character("wave");
  expect(getComputedStyle(one(root, "city-guide__arm")).animationName).toBe("cg-wave");

  // cheer: waving AND the happy eye arcs swap in.
  root = await character("cheer");
  expect(getComputedStyle(one(root, "city-guide__arm")).animationName).toBe("cg-wave");
  expect(getComputedStyle(one(root, "city-guide__eyes-open")).display).toBe("none");
  expect(getComputedStyle(one(root, "city-guide__eyes-happy")).display).not.toBe("none");
});

test("every part that animates is still stood down under prefers-reduced-motion", async () => {
  const gated = reducedMotionClasses();
  for (const mood of MOODS) {
    const animating = animatingParts(await character(mood));
    // Floor first: "all of them are gated" holds trivially over an empty list. Nine
    // elements move at every mood — the body, four sparkles, the arm, two eyes and the
    // hard hat — and `talk` adds the chattering mouth.
    expect(animating.length, `animating parts at ${mood}`).toBeGreaterThanOrEqual(9);
    const ungated = animating.filter((classes) => !classes.some((cls) => gated.has(cls)));
    expect(ungated, `ungated animating parts at ${mood}`).toEqual([]);
  }
});
