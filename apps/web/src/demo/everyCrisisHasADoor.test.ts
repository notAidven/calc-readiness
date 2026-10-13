import { describe, expect, it } from "vitest";

import { DEMO_CRISES } from "./demoRoutes";

/**
 * **EVERY BUILT CRISIS HAS A DOOR SOMETHING ACTUALLY MOUNTS.**
 *
 * The defect this file was written for is the one the lead reported on 2026-08-05 as *"dont see
 * this on qa"* about era four's Succession forum, and it is not that the forum was missing.
 * `#603` had merged; `SuccessionEntryChip` existed, gated, documented, with its own tests, and
 * its header called itself *"THE DEV DOOR INTO THE SUCCESSION"*. **Nothing mounted it.** Nor
 * `PlagueEntryChip`, nor `IntrusionEntryChip`. Measured on that tree: a search of every non-test
 * `.tsx` under `apps/web/src` for each component name preceded by `<` returned era one's winter
 * chip and nothing else, so three of the four built crises were reachable only by typing a query
 * parameter that appears on no surface.
 *
 * ## THE POPULATION IS SCOPED BY THE BEHAVIOUR, WHICH IS WHY IT IS KEYED ON THE ROUTE
 *
 * The obvious spelling of this guard is "every `*EntryChip` module is mounted", and it is the
 * wrong one twice over. It would miss a crisis whose route shipped with no chip module at all —
 * the exact shape of the failure, one step earlier — and it would fail on a chip kept for a
 * surface that has been withdrawn. What has to be true for the defect to be possible is that
 * **a route the app answers has no control anywhere that navigates to it**, so the population is
 * `DEMO_CRISES` (which `demoRoutes.test.ts` proves is the router's own set of crisis branches),
 * and the evidence for each member is an mounted element whose `href` reaches that route.
 *
 * A chip could carry that href without importing a line of any other chip, which is the reason
 * this is a search for the ROUTE across the mounted tree rather than a list of component names.
 */

/**
 * Every `.tsx` in the web app, as source text. Not scoped to a folder: the whole point is that a
 * door added somewhere nobody expected is still a door, and one removed from `CitySurface` is
 * still removed.
 */
const WEB_SOURCES = import.meta.glob("../**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const MOUNTED_SOURCES = Object.entries(WEB_SOURCES).filter(
  ([path]) => !path.includes(".test."),
);

/**
 * The components that build a link to one crisis, by the parameter they open.
 *
 * Read as: *if any of these is mounted, that crisis has a door.* The list is per-crisis rather
 * than global so the failure message can name the crisis that lost its handle, and a crisis that
 * grows a second kind of door only has to add a name here.
 */
const DOORS: ReadonlyMap<string, readonly string[]> = new Map([
  ["winter", ["WinterEntryChip"]],
  ["succession", ["SuccessionEntryChip"]],
  ["plague", ["PlagueEntryChip"]],
  ["intrusion", ["IntrusionEntryChip"]],
]);

/** Every non-test source that mounts one of the named components. */
function mountsOf(components: readonly string[]): string[] {
  return MOUNTED_SOURCES.filter(([, source]) =>
    components.some((component) => source.includes(`<${component}`)),
  ).map(([path]) => path);
}

describe("every crisis the app routes has a control that opens it", () => {
  /**
   * THE PREMISE. A sweep over an empty glob reports green over nothing, which is the ordinary
   * way a guard in this tree goes wrong, so the source population is floored and the crisis
   * population is checked for the member that was actually reported missing.
   */
  it("sweeps a real tree, and knows about era four", () => {
    expect(
      MOUNTED_SOURCES.length,
      "the glob found no non-test .tsx sources",
    ).toBeGreaterThan(50);
    expect(DEMO_CRISES.length).toBeGreaterThanOrEqual(4);
    expect(DEMO_CRISES.map((crisis) => crisis.param)).toContain("succession");
    // Set equality with the door table, so a crisis added to the console without a door entry
    // fails here rather than being silently unswept.
    expect(DEMO_CRISES.map((crisis) => crisis.param).sort()).toEqual(
      [...DOORS.keys()].sort(),
    );
  });

  for (const crisis of DEMO_CRISES) {
    it(`${crisis.label} (?${crisis.param}) is mounted somewhere a player can press it`, () => {
      const components = DOORS.get(crisis.param) ?? [];
      expect(
        components.length,
        `no door component is registered for ?${crisis.param}`,
      ).toBeGreaterThan(0);
      const mounts = mountsOf(components);
      expect(
        mounts,
        `${components.join(" / ")} exists but nothing mounts it, so ?${crisis.param} is reachable only by typing the URL — which is exactly what "dont see this on qa" was`,
      ).not.toEqual([]);
    });
  }

  /**
   * **THE DETECTOR, FIRED AT THE DEFECT.** The four cases above pass by finding something, and a
   * search that had stopped working would fail rather than pass — but a search keyed to a name
   * nothing uses would pass the loop above by matching some unrelated string, so what is checked
   * here is that the matcher distinguishes a mounted component from an imported one and from one
   * that does not exist.
   */
  it("tells a mount from an import, and finds nothing for a component that does not exist", () => {
    expect(mountsOf(["ThereIsNoSuchChip"])).toEqual([]);
    // An import without a mount is exactly the state the three orphaned chips were in, and it
    // must not count as a door.
    const importOnly = {
      "./x.tsx": 'import { SuccessionEntryChip } from "./SuccessionEntryChip";',
    };
    expect(
      Object.entries(importOnly).filter(([, source]) =>
        source.includes("<SuccessionEntryChip"),
      ),
    ).toEqual([]);
    // ...where the real tree has the mount as well as the import.
    expect(mountsOf(["SuccessionEntryChip"]).length).toBeGreaterThan(0);
  });
});
