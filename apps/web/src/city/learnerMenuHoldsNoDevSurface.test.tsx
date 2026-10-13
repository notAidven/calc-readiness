import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { App, surfaceMeta } from "../App";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import type { CityEntrySurface } from "./types";
import { resetCityEra } from "./useCityEra";

/**
 * **NO DEVELOPMENT SURFACE IS REACHABLE FROM THE LEARNER'S ☰ MENU.**
 *
 * ## The defect
 *
 * `CheckerLab` shipped in the menu's "Other places" nav as a peer of Diagnostic and Lessons,
 * in identical chip styling, on a learner's build. Reported by `docs/qa-prose-2026-08-08.md`
 * §4.1 and photographed on the learner's own mount at 1024x580 by
 * `learnerMenuShots.browser.test.tsx` before anything was changed. What it opens says
 * *"This development fixture"* in learner-visible copy, under the eyebrow "Capability probe"
 * and the title "The D1 answer checker", with chips reading "41 golden cases" and "Node +
 * Chromium parity".
 *
 * ## Why this guard is not written against the prop
 *
 * The mechanism was a single unconditional prop — `App.tsx` gates its three `onDev*` props on
 * `devControlsEnabled` and passes `onOpenSurface` two lines below with no gate — and the
 * tempting guard is *"that prop is conditional"*. That is a fact about the implementation, and
 * it is not even the right fix: the whole nav hangs on that one prop, so gating it would take
 * Diagnostic and Lessons out of a learner's menu too. A guard written to it would also be
 * walked straight past by the next dev surface that arrives by any other route, which is the
 * population defect `qa-verification.mdc` documents at length.
 *
 * So the subject here is the BEHAVIOUR — what the learner's menu offers — and it is measured
 * two ways that fail independently:
 *
 *  1. **A census against the app's own surface enumeration.** `App.tsx`'s `surfaceMeta` is a
 *     `Record<CityEntrySurface, …>`, so a new surface does not compile until it has a row
 *     there. The learner's nav must offer EXACTLY that record's keys minus the named
 *     development ones. A surface added and left ungated fails, because it appears in the nav
 *     while sitting in neither list; a learner surface that quietly disappears fails too.
 *  2. **A vocabulary sweep over the rendered menu.** A control a learner can press must not
 *     speak the authoring lane's vocabulary. This is the one that catches a dev affordance
 *     that arrives somewhere other than this nav, and its patterns are proved load-bearing
 *     below against the real copy of the surface this file exists for.
 *
 * ## The two mounts
 *
 * `<App />` both times, because the defect is a wiring decision in the composition root and a
 * mount that supplies `onOpenSurface` by hand would be testing this file's opinion of
 * `App.tsx`. The only thing that differs is the address: `isDevPersistenceEnabled()` is
 * `import.meta.env.DEV && !isDemoMode() && !isServerBacked(true)`, so exact `/demo` switches
 * the dev gate off inside a dev server exactly as a built artifact's `DEV === false` does.
 * Both answers of that predicate are asserted, because without them "no dev surface is on the
 * menu" and "the mount never reached the city" are the same observation.
 */

/** Every surface the city can open, from the app's own exhaustive record. */
const ALL_SURFACES = Object.keys(surfaceMeta) as CityEntrySurface[];

/**
 * The surfaces that are development fixtures, each with the reason it is one.
 *
 * A NAMED LIST THAT FAILS BOTH WAYS, per `qa-verification.mdc`: a member that stops existing
 * fails, so an entry cannot sit here forever exempting nothing; a member that becomes
 * learner-reachable fails, so the list cannot go on excusing something it has stopped
 * describing. Quietly leaving a dev surface out of the population instead of naming it here
 * is exactly how the next one ships.
 */
const DEV_ONLY_SURFACES: ReadonlyMap<CityEntrySurface, string> = new Map([
  [
    "checker",
    "a live probe of the D1 answer checker, whose own copy calls it a development fixture and " +
      "whose chips report golden-case counts and Node/Chromium parity",
  ],
]);

/**
 * Vocabulary that marks a control as belonging to the authoring lane rather than to a learner.
 *
 * Every pattern is taken from copy that actually shipped on `CheckerLab`, not invented, and
 * the set is proved load-bearing below by running it over that surface's own chrome. Scoped
 * to the ☰ Menu popover deliberately: this is a claim about the learner's main menu, and
 * widening it to the whole city would drag in unrelated HUD copy this lane has not measured.
 */
const DEV_VOCABULARY: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  {
    pattern: /development fixture/i,
    why: "the surface declares its own status to a learner",
  },
  {
    pattern: /capability probe/i,
    why: "an engineering word for a thing to try, not to learn",
  },
  { pattern: /golden case/i, why: "a test-suite term; nothing in any pack defines it" },
  { pattern: /chromium|\bparity\b/i, why: "the browser matrix is not a subject" },
  { pattern: /checker lab/i, why: "reads as a place to study and is neither" },
  {
    pattern: /\bD(?:10|[1-9])\b/,
    why: "the authoring lane's internal domain number, which appears in none of the 62 packs",
  },
];

function devVocabularyIn(text: string): string[] {
  return DEV_VOCABULARY.filter(({ pattern }) => pattern.test(text)).map(
    ({ pattern, why }) => `${String(pattern)} (${why})`,
  );
}

interface MenuReading {
  /** Surface ids the "Other places" nav offers, read off `data-surface`. */
  readonly surfaces: Set<CityEntrySurface>;
  /** Every pressable control in the popover, by its visible label. */
  readonly controls: string[];
  /** Whether the dev gate was open on this mount. */
  readonly devGateOpen: boolean;
}

/** Walk the title screen into the city at `pathname` and open the ☰ Menu, as a learner does. */
async function readTheMenuAt(pathname: string): Promise<MenuReading> {
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
  await user.click(screen.getByRole("button", { name: "Menu" }));
  const popover = await waitFor(
    () => {
      // Presenter mode pre-mounts a hidden shell containing only its shortcut. Wait for the
      // learner navigation created by the open render, then recover its owning menu.
      const navigation = screen.queryByRole("navigation", { name: "Other places" });
      const found = navigation?.closest<HTMLElement>(".city-menu-popover") ?? null;
      if (!found) {
        throw new Error("the ☰ Menu never opened");
      }
      return found;
    },
    { timeout: 3_000 },
  );

  return {
    surfaces: new Set(
      [...popover.querySelectorAll<HTMLElement>("[data-surface]")].map(
        (el) => el.dataset.surface as CityEntrySurface,
      ),
    ),
    controls: [...popover.querySelectorAll("button, a")].map((el) =>
      (el.textContent ?? "").replace(/\s+/g, " ").trim(),
    ),
    devGateOpen,
  };
}

const sorted = (surfaces: Iterable<CityEntrySurface>): string[] =>
  [...surfaces].sort((a, b) => a.localeCompare(b));

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

describe("the surfaces the city's ☰ Menu offers", () => {
  /**
   * THE PREMISE, in both directions, before anything is concluded from an absence. A gate
   * asserted one way only is satisfied by a nav that was deleted or never rendered.
   */
  it("switches its dev gate on the address, so the two mounts really differ", async () => {
    const learner = await readTheMenuAt("/demo");
    cleanup();
    const developer = await readTheMenuAt("/");

    expect(learner.devGateOpen, "the /demo mount is running with dev controls on").toBe(
      false,
    );
    expect(
      developer.devGateOpen,
      "the dev mount has no dev controls, so it proves nothing",
    ).toBe(true);
    expect(developer.surfaces.size).toBeGreaterThan(learner.surfaces.size);
  });

  /**
   * THE CENSUS. Set equality, so it fails whichever way the nav and the app's surface record
   * come apart: an ungated new surface appears in the learner's set and not in the expected
   * one, and a learner surface that vanishes appears in the expected set and not the nav's.
   */
  it("offers a learner exactly the surfaces that are not development fixtures", async () => {
    const learner = await readTheMenuAt("/demo");

    // FLOOR AND COMPOSITION. Containment over an empty nav holds trivially, and a floor
    // constrains size and not shape, so the two named members are asserted beside the count.
    expect(
      ALL_SURFACES.length,
      "the app's surface record is smaller than the tree's",
    ).toBeGreaterThanOrEqual(3);
    expect(
      learner.surfaces.size,
      `the learner's nav offered ${sorted(learner.surfaces).join(", ")}`,
    ).toBeGreaterThanOrEqual(2);
    expect(learner.surfaces.has("diagnostic")).toBe(true);
    expect(learner.surfaces.has("lessons")).toBe(true);

    const expected = ALL_SURFACES.filter((surface) => !DEV_ONLY_SURFACES.has(surface));
    expect(
      sorted(learner.surfaces),
      "a surface is offered to a learner that is neither a learner surface nor a named " +
        "development one, or a learner surface has silently left the menu",
    ).toEqual(sorted(expected));
  });

  /**
   * THE EXCEPTION LIST, BOTH DIRECTIONS. This is what stops the exemption becoming permanent
   * by neglect: an entry naming a surface that no longer exists fails, an entry that is no
   * longer reachable even to a developer fails, and an entry that has come back to the
   * learner's menu fails.
   */
  it("keeps every named development surface off a learner's menu and on a developer's", async () => {
    expect(
      DEV_ONLY_SURFACES.size,
      "the exception list is empty, so it excuses nothing",
    ).toBeGreaterThanOrEqual(1);
    expect(
      DEV_ONLY_SURFACES.size,
      "the exception list has grown until it has swallowed the menu",
    ).toBeLessThan(ALL_SURFACES.length);

    for (const [surface, reason] of DEV_ONLY_SURFACES) {
      expect(
        ALL_SURFACES,
        `${surface} is a declared exception naming a surface the app no longer has`,
      ).toContain(surface);
      expect(reason.length, `${surface} is exempted without a reason`).toBeGreaterThan(20);
    }

    const learner = await readTheMenuAt("/demo");
    cleanup();
    const developer = await readTheMenuAt("/");

    for (const surface of DEV_ONLY_SURFACES.keys()) {
      expect(
        learner.surfaces.has(surface),
        `${surface} is a development fixture and a learner can open it from the ☰ Menu`,
      ).toBe(false);
      expect(
        developer.surfaces.has(surface),
        `${surface} is exempted as dev-only but is not reachable on a dev mount either, so ` +
          "the exemption describes a deletion rather than a gate",
      ).toBe(true);
    }

    // And the dev mount sees everything, so the gate is a gate and not a second omission.
    expect(sorted(developer.surfaces)).toEqual(sorted(ALL_SURFACES));
  });

  /**
   * THE VOCABULARY SWEEP, which is the half that does not depend on the surface arriving
   * through this particular nav. Its patterns are proved load-bearing first, against the real
   * chrome copy of the surface this file exists for — a prose rule whose shape cannot match
   * the sentence it was written for is the `#187` defect, and this is the cheapest way to
   * rule it out.
   */
  it("speaks no authoring-lane vocabulary to a learner", async () => {
    const devChrome = [...DEV_ONLY_SURFACES.keys()]
      .filter((surface) => surface in surfaceMeta)
      .map((surface) => `${surfaceMeta[surface].eyebrow} ${surfaceMeta[surface].title}`);
    expect(
      devChrome.length,
      "no named development surface still exists, so there is nothing to test the vocabulary " +
        "against and it could be matching nothing at all",
    ).toBeGreaterThanOrEqual(1);
    for (const chrome of devChrome) {
      expect(
        devVocabularyIn(chrome),
        `the vocabulary matches nothing in "${chrome}", the copy it was written for, so it ` +
          "would not have caught this defect and cannot be trusted to catch the next one",
      ).not.toHaveLength(0);
    }

    const learner = await readTheMenuAt("/demo");

    // FLOOR AND COMPOSITION on the swept population, so "no control speaks dev" cannot pass
    // over a popover that rendered no controls at all.
    expect(
      learner.controls.length,
      `the ☰ Menu held ${learner.controls.join(", ")}`,
    ).toBeGreaterThanOrEqual(5);
    expect(learner.controls).toContain("Diagnostic");
    expect(learner.controls).toContain("Lessons");

    for (const label of learner.controls) {
      expect(
        devVocabularyIn(label),
        `the ☰ Menu offers a learner a control reading "${label}"`,
      ).toEqual([]);
    }
  });
});
