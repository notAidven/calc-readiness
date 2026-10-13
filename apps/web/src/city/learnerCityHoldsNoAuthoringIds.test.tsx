import { NEIGHBORHOOD_LABELS, getLockedDistricts } from "@cr/game";
import { getProductNodes } from "@cr/skill-graph";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { App } from "../App";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { buildingName } from "./buildingAssets";
import { resetCityEra } from "./useCityEra";

/**
 * **THE LEARNER'S CITY SCREEN SPEAKS NO AUTHORING IDENTIFIER, AND CARRIES NO DEV CONTROL.**
 *
 * ## The defect
 *
 * A row of chips reading `D6 D7 D8 D9 D10` sat at the top-left of the city, immediately right
 * of the `STONE` counter, on a learner's own mount. Photographed at 1024x580 by
 * `cityWithoutWebglShots.browser.test.tsx` before anything was changed. `D7` is the authoring
 * lane's domain number: it appears in none of the shipped packs and a learner has never been
 * given it.
 *
 * It came from `StaticCityBackdrop` in `CitySurface.tsx`, the DOM stand-in `CityCanvasHost`
 * renders whenever the 3D scene cannot mount — no WebGL, a failed GLB, a lost context. That is
 * a LEARNER's surface, not a developer's: it is the progressive-enhancement path for a device
 * that cannot run the canvas. It mapped `locked_districts` and printed each district's
 * `domain`, while the very same object carries the `label` the engine derives for it
 * (`NEIGHBORHOOD_LABELS`, whose own comment calls them *"human labels for the skyline"*). Its
 * building plots printed raw `node_id`s the same way, where the 3D scene they stand in for
 * names the skill and the DOM roster calls `buildingName`.
 *
 * ## Why this guard is not scoped to that component
 *
 * `learnerMenuHoldsNoDevSurface.test.tsx` already sweeps for `\bD(?:10|[1-9])\b`, and it was
 * GREEN over this defect throughout, because it is scoped to the ☰ Menu popover — deliberately,
 * and its own comment says so. Scoping by where a mechanic lives is the population defect
 * `qa-verification.mdc` documents: the question is not "which component prints ids" but "what
 * would have to be true of a surface for this defect to be possible there", and the answer is
 * that it renders on the learner's city screen and derives visible text from the registry.
 * Several surfaces do. So the population here is the RENDERED CITY, and the vocabulary is
 * DERIVED FROM THE REGISTRY rather than written down: every in-product domain id and every
 * in-product node id, so a new domain or node is swept the day it is authored.
 *
 * ## The mount
 *
 * `<App />` at `/demo`, because the composition root decides which props are gated and a mount
 * that supplied them by hand would photograph this file's opinion of `App.tsx`.
 * `isDevPersistenceEnabled()` is `import.meta.env.DEV && !isDemoMode() && !isServerBacked(true)`,
 * so exact `/demo` switches the dev gate off exactly as a built artifact's `DEV === false`
 * does — asserted below in both directions, because without it "no authoring id is on screen"
 * and "the city never mounted" are the same observation.
 *
 * jsdom has no WebGL, so `CityCanvasHost` fails closed to the backdrop here without loading
 * `three` — which is why this is the cheap mount for the surface, and it is the same surface a
 * learner without WebGL is served.
 */

/** Every in-product domain the registry knows: `D1`…`D10`. */
const DOMAIN_IDS: readonly string[] = [
  ...new Set(getProductNodes().map((node) => node.domain)),
];

/** Every in-product node id the registry knows: `NUM.F`, `NUM.3`, `TRG.6`, … */
const NODE_IDS: readonly string[] = [...new Set(getProductNodes().map((node) => node.id))];

/**
 * The two SHAPES of authoring identifier that can reach a rendered label, kept apart rather
 * than merged into one list. A floor constrains size and not shape: 100 members of one shape
 * would clear a floor of 70 while the other shape went unswept, which is exactly how the
 * skyline row survived a guard that already looked for `D6`.
 */
const ID_SHAPES: readonly {
  readonly what: string;
  readonly ids: readonly string[];
  readonly shape: RegExp;
  readonly floor: number;
}[] = [
  { what: "domain id", ids: DOMAIN_IDS, shape: /^D\d{1,2}$/, floor: 10 },
  { what: "node id", ids: NODE_IDS, shape: /^[A-Z]{2,4}\.[A-Z0-9]{1,3}$/, floor: 60 },
];

/** Every authoring identifier, as a boundary-anchored matcher over rendered text. */
const AUTHORING_IDS: readonly { readonly id: string; readonly pattern: RegExp }[] = [
  ...DOMAIN_IDS,
  ...NODE_IDS,
].map((id) => ({ id, pattern: new RegExp(`\\b${id.replace(/\./g, "\\.")}\\b`) }));

/**
 * Building names the registry's nodes actually have, excluding the ones `buildingName` cannot
 * resolve — those degrade to the id, and a set holding them would go on accepting the very
 * strings this file exists to keep off the screen.
 */
const BUILDING_NAMES: ReadonlySet<string> = new Set(
  NODE_IDS.map((id) => buildingName(id)).filter((name) => !NODE_IDS.includes(name)),
);

interface CityReading {
  /** Every run of visible text on the city screen, with the element it sits in. */
  readonly text: readonly { readonly where: string; readonly words: string }[];
  /** The skyline chips of the canvas fallback, in order. */
  readonly skyline: readonly string[];
  /** The building plots of the canvas fallback, in order. */
  readonly plots: readonly string[];
  /** Dev-only stand-in controls found anywhere on the screen. */
  readonly devControls: readonly string[];
  /** Whether the dev gate was open on this mount. */
  readonly devGateOpen: boolean;
}

/**
 * Visible text only. `.visually-hidden` runs are excluded because they are the accessible
 * mirror of a control rather than a label anybody reads, and several of them legitimately
 * carry an id for a screen reader. `aria-hidden` is NOT an exclusion: the canvas well is
 * `aria-hidden="true"` and the backdrop inside it is the most visible thing on the screen.
 */
function visibleText(root: HTMLElement): { where: string; words: string }[] {
  const runs: { where: string; words: string }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const words = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (words === "") {
      continue;
    }
    const parent = node.parentElement;
    if (!parent || parent.closest(".visually-hidden") !== null) {
      continue;
    }
    runs.push({ where: parent.className || parent.tagName.toLowerCase(), words });
  }
  return runs;
}

const textOf = (elements: Iterable<Element>): string[] =>
  [...elements].map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());

/**
 * Walk the title screen into the city at `pathname`, as a learner does, and read it.
 *
 * `openMenu` because the two claims here live on two parts of one screen. The vocabulary
 * sweep is about the city a learner is shown before pressing anything — the HUD and the
 * canvas well — so it reads the screen with the menu shut. The dev-control census has to open
 * the ☰ Menu, because that is where every dev stand-in this shell has actually sits: read
 * with it shut, a developer's mount carries none either and the learner's empty hand proves
 * nothing.
 */
async function readTheCityAt(pathname: string, openMenu = false): Promise<CityReading> {
  window.history.replaceState(null, "", pathname);
  const devGateOpen = isDevPersistenceEnabled();
  const user = userEvent.setup();
  render(<App />);

  await user.click(await screen.findByRole("button", { name: "Start at Era 1" }));
  await screen.findByRole("button", { name: "Build" });
  const skip = screen.queryByTestId("onboarding-advisor-skip");
  if (skip) {
    await user.click(skip);
  }
  if (openMenu) {
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await waitFor(() => {
      if (document.querySelector(".city-menu-popover") === null) {
        throw new Error("the ☰ Menu never opened");
      }
    });
  }
  const shell = await waitFor(() => {
    const found = document.querySelector<HTMLElement>(".city-shell");
    if (!found) {
      throw new Error("the city shell never mounted");
    }
    return found;
  });

  return {
    text: visibleText(shell),
    skyline: textOf(shell.querySelectorAll(".city-backdrop-district")),
    plots: textOf(shell.querySelectorAll(".city-backdrop-node")),
    devControls: [...shell.querySelectorAll<HTMLElement>("[data-testid^='dev-']")].map(
      (el) => el.dataset.testid ?? "",
    ),
    devGateOpen,
  };
}

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
});

afterEach(() => {
  cleanup();
  resetCityEra();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("the vocabulary the learner's city screen is written in", () => {
  /**
   * THE POPULATION, before it is used to conclude anything. Derived from the registry rather
   * than written down, floored so it cannot be empty, and floored PER SHAPE so one shape
   * cannot carry the count for the other.
   */
  it("derives both shapes of authoring identifier from the registry", () => {
    for (const { what, ids, shape, floor } of ID_SHAPES) {
      expect(
        ids.length,
        `the ${what} population is smaller than the tree's`,
      ).toBeGreaterThanOrEqual(floor);
      for (const id of ids) {
        expect(id, `${id} is in the ${what} population but is not shaped like one`).toMatch(
          shape,
        );
      }
    }
    // The named members this file exists for, so the derivation cannot drift off them.
    expect(DOMAIN_IDS).toContain("D6");
    expect(DOMAIN_IDS).toContain("D10");
    expect(NODE_IDS).toContain("NUM.3");
    expect(NODE_IDS).toContain("NUM.F");
    // And the two shapes are disjoint, so nothing is being counted twice into either floor.
    expect(DOMAIN_IDS.filter((id) => NODE_IDS.includes(id))).toEqual([]);
  });

  /**
   * THE PREMISE. Both routes must render fully, while the stand-in controls that once leaked
   * authoring identifiers remain deleted from the learner and developer experiences.
   */
  it("keeps deleted stand-in controls off both learner and developer routes", async () => {
    const learner = await readTheCityAt("/demo", true);
    cleanup();
    const developer = await readTheCityAt("/", true);

    expect(learner.devGateOpen, "the /demo mount is running with dev controls on").toBe(
      false,
    );
    expect(
      developer.devGateOpen,
      "the dev mount has no dev controls, so an absence on the learner's proves nothing",
    ).toBe(true);
    expect(developer.devControls).toEqual([]);
    expect(
      learner.devControls,
      `the learner's city carries ${learner.devControls.join(", ")}`,
    ).toEqual([]);
  });

  /**
   * THE SWEEP. Every visible run of text on the learner's city, against every identifier the
   * registry knows.
   *
   * FLOOR AND COMPOSITION first, because a sweep over a screen that rendered nothing passes
   * trivially, and because a floor on the number of text runs says nothing about whether the
   * SURFACE THIS DEFECT LIVES ON was among them.
   */
  it("prints no domain id and no node id where a learner can read it", async () => {
    const learner = await readTheCityAt("/demo");

    expect(
      learner.text.length,
      `the city rendered ${learner.text.length} runs of visible text`,
    ).toBeGreaterThanOrEqual(10);
    expect(
      learner.skyline.length,
      "the canvas fallback did not render its skyline, so this sweep never saw the surface " +
        "the defect was on",
    ).toBeGreaterThanOrEqual(9);
    expect(
      learner.plots.length,
      "the canvas fallback did not render its building plots",
    ).toBeGreaterThanOrEqual(6);

    for (const { where, words } of learner.text) {
      const spoken = AUTHORING_IDS.filter(({ pattern }) => pattern.test(words)).map(
        ({ id }) => id,
      );
      expect(
        spoken,
        `the city shows a learner "${words}" (in .${where}), which speaks the authoring ` +
          `lane's ${spoken.join(", ")}`,
      ).toEqual([]);
    }
  });

  /**
   * AND THE POSITIVE HALF, so the sweep above cannot be satisfied by blanking the labels.
   * Set equality against the engine's own derivation, which fails whichever way the skyline
   * and `getLockedDistricts` come apart.
   */
  it("names the far districts the way the engine names them", async () => {
    const learner = await readTheCityAt("/demo");
    const expected = getLockedDistricts().map((district) => district.label);

    expect(
      expected.length,
      "the engine derives no far districts to name",
    ).toBeGreaterThanOrEqual(9);
    expect(
      learner.skyline,
      "the skyline and the engine's own district derivation disagree",
    ).toEqual(expected);
    // Each one is a label rather than a key, asserted against the table directly so that
    // renaming a district cannot quietly turn a label back into an id.
    for (const chip of learner.skyline) {
      expect(
        Object.values(NEIGHBORHOOD_LABELS),
        `the skyline chip "${chip}" is not one of the human labels`,
      ).toContain(chip);
      expect(
        Object.keys(NEIGHBORHOOD_LABELS),
        `the skyline chip "${chip}" is a registry key`,
      ).not.toContain(chip);
    }
  });

  /**
   * The same for the building plots, which stand in for the 3D scene's labels — and the scene
   * names the skill a building teaches, never its node id.
   */
  it("names the buildings the way the roster names them", async () => {
    const learner = await readTheCityAt("/demo");

    expect(
      BUILDING_NAMES.size,
      "no node has a resolvable building name, so this check accepts anything",
    ).toBeGreaterThanOrEqual(6);
    for (const plot of learner.plots) {
      expect(
        BUILDING_NAMES.has(plot),
        `the fallback backdrop labels a building "${plot}", which is not a building name`,
      ).toBe(true);
    }
  });
});
