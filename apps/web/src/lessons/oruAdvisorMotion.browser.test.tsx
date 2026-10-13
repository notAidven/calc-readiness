/**
 * Oru's poses and Oru's motion are the stylesheet's job, so they are checked in real
 * Chromium against the real stylesheet — `OruAdvisorCharacter.test.tsx` runs in the jsdom
 * harness, which has `css: false` and so cannot see a single one of these rules.
 *
 * Two claims, and the delivery is the reason both need proving. It ships its animations
 * and its mood switching as INLINE styles driven by a `renderVals()` template step, which
 * the port has to convert into CSS keyed off `data-mood`; an inline animation would render
 * identically and escape `prefers-reduced-motion` entirely, and inline mood switching
 * would work while re-mounting the character on every line of dialogue.
 *
 * 1. **`data-mood` really re-poses Oru.** Asserted through `getComputedStyle`, so it is
 *    the cascade answering and not the markup.
 * 2. **Nothing Oru animates escapes `prefers-reduced-motion: reduce`.** Collected from the
 *    live CSSOM: whatever the browser reports as animating in the character has to appear
 *    inside the reduced-motion block with its animation switched off. Vitest's browser mode
 *    exposes no media emulation, so the gate is read from the rule rather than by flipping
 *    the preference — but the set it has to cover is measured, not listed by hand, which is
 *    the part that would otherwise rot as parts are added.
 *
 * ## ⚑ THE SWEEP IS OVER ALL TEN COSTUMES, and the population is why
 *
 * It used to run at era one's dress alone, which was every dress there was. Five of the ten
 * costumes hang something off the instrument the era's advisor carries — era three's two
 * balance pans, era four's four plumb-lines, era six's plumb bob — and every one of those
 * moves. **Scoped to the default costume this file would have reported green over nine eras
 * of ungated motion**, which is the exact shape `.cursor/rules/qa-verification.mdc` records
 * as the ordinary way a guard fails here: the population was the layer the mechanic was
 * implemented in rather than the set of things that exhibit it.
 *
 * So the population is `ERA_SEQUENCE` and the wardrobe is read from it, with a floor under
 * the number of moving parts found, because "all of them are gated" is true of none of them.
 *
 * `styles.css` is imported LAST, as `main.tsx` imports it, so the app's rules win here the
 * way they win in the app.
 */

import { ERA_SEQUENCE } from "@cr/skill-graph";
import { afterEach, expect, test } from "vitest";

import { advisorDressFor } from "../city/advisorDress";
import {
  type AdvisorDress,
  OruAdvisorCharacter,
  type OruMood,
} from "./OruAdvisorCharacter";
import { type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

const MOODS: readonly OruMood[] = ["idle", "talk", "point", "squint"];
const WARDROBE: readonly AdvisorDress[] = ERA_SEQUENCE.map((era) =>
  advisorDressFor(era.id),
);

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

async function character(mood: OruMood, dress?: AdvisorDress): Promise<HTMLElement> {
  h?.cleanup();
  const harness = mount(<OruAdvisorCharacter mood={mood} dress={dress} />);
  h = harness;
  await waitFor(
    () => harness.host.querySelector(`.oru-advisor[data-mood="${mood}"]`) !== null,
    `Oru mounted at mood ${mood}`,
  );
  return harness.host.querySelector<HTMLElement>(".oru-advisor") as HTMLElement;
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

/** Every `oru-advisor__…` class a `prefers-reduced-motion: reduce` block stands down. */
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
          for (const [, cls] of inner.selectorText.matchAll(/\.(oru-advisor__[\w-]+)/g)) {
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

test("the stylesheet reached the page at all", async () => {
  const root = await character("idle");
  // Without `styles.css` every assertion below would read a browser default and prove
  // nothing, so this is the floor: `.oru-advisor__part` is absolutely positioned by CSS.
  expect(getComputedStyle(one(root, "oru-advisor__body")).position).toBe("absolute");
  expect(reducedMotionClasses().size).toBeGreaterThan(0);
});

test("`data-mood` re-poses Oru through the cascade, not through the markup", async () => {
  // idle: the free arm sways, the eyes are open, the mouth is a closed line.
  let root = await character("idle");
  expect(getComputedStyle(one(root, "oru-advisor__arm")).animationName).toBe("oru-sway");
  expect(getComputedStyle(one(root, "oru-advisor__eyes-open")).display).not.toBe("none");
  expect(getComputedStyle(one(root, "oru-advisor__eyes-narrow")).display).toBe("none");
  expect(getComputedStyle(one(root, "oru-advisor__mouth-line")).opacity).toBe("1");
  expect(getComputedStyle(one(root, "oru-advisor__mouth-talk")).opacity).toBe("0");

  // talk: the line hands over to the chattering mouth.
  root = await character("talk");
  expect(getComputedStyle(one(root, "oru-advisor__mouth-line")).opacity).toBe("0");
  expect(getComputedStyle(one(root, "oru-advisor__mouth-talk")).opacity).toBe("1");
  expect(getComputedStyle(one(root, "oru-advisor__mouth-talk")).animationName).toBe(
    "oru-talk",
  );

  // point: the same arm, a different keyframe set — no second element.
  root = await character("point");
  expect(getComputedStyle(one(root, "oru-advisor__arm")).animationName).toBe("oru-point");

  // squint: the eye pair swaps over.
  root = await character("squint");
  expect(getComputedStyle(one(root, "oru-advisor__eyes-open")).display).toBe("none");
  expect(getComputedStyle(one(root, "oru-advisor__eyes-narrow")).display).not.toBe("none");
});

test("every part that animates is stood down under prefers-reduced-motion", async () => {
  const gated = reducedMotionClasses();
  for (const mood of MOODS) {
    const animating = animatingParts(await character(mood));
    // Floor first: "all of them are gated" holds trivially over an empty list. Nine
    // elements move at every mood — the body, four embers, the free arm, two eyes and
    // the staff's thatch tuft — and `talk` adds the chattering mouth.
    expect(animating.length, `animating parts at ${mood}`).toBeGreaterThanOrEqual(9);
    const ungated = animating.filter((classes) => !classes.some((cls) => gated.has(cls)));
    expect(ungated, `ungated animating parts at ${mood}`).toEqual([]);
  }
});

test("...in every one of the ten costumes, not only the one it defaults to", async () => {
  // See the header. Nine of the ten costumes never reached this file, and five of them
  // hang a moving part off the instrument the era's advisor carries.
  const gated = reducedMotionClasses();
  expect(WARDROBE.length).toBeGreaterThanOrEqual(10);
  expect(WARDROBE.length).toBe(ERA_SEQUENCE.length);

  let hanging = 0;
  for (const dress of WARDROBE) {
    // `talk` is the mood every surface mounts him at, and it is the mood with the most
    // moving parts, so it is the one worth sweeping the whole wardrobe at.
    const root = await character("talk", dress);
    const animating = animatingParts(root);
    expect(animating.length, `animating parts in ${dress.id}`).toBeGreaterThanOrEqual(9);
    const ungated = animating.filter((classes) => !classes.some((cls) => gated.has(cls)));
    expect(ungated, `ungated animating parts in ${dress.id}`).toEqual([]);
    hanging += root.querySelectorAll(".oru-advisor__swing").length;
  }

  // A FLOOR ON WHAT THE SWEEP FOUND, so it cannot pass over a wardrobe in which nothing
  // hangs off anything: the whole reason this test widened is that four eras' instruments
  // carry swinging parts, and if that stopped being true the widening would be asserting
  // nothing. Counted rather than chosen — era one's thatch tuft and stone charm (2), era
  // three's two balance pans (2), era four's four plumb-lines (4) and era six's plumb bob
  // (1) — and held as a floor rather than as a fit so a costume may gain one.
  expect(hanging).toBeGreaterThanOrEqual(9);
});
