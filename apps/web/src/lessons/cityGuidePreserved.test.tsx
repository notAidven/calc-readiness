/**
 * `CityGuideCharacter` is PRESERVED AND DELIBERATELY UNWIRED — the same treatment
 * `city/art/models/gridwork-modern/` gives the original Gridwork building models.
 *
 * Era one is the Prehistoric Era and its advisor is Oru, so the hard hat, hi-vis jacket,
 * rolled blueprint and skyline badge are out of period. They are not dead weight though:
 * that vocabulary is roughly eras 8-10, and per D-ERA28 the advisor is per-era art
 * re-dressed at every advance. CityGuide comes back when its era does.
 *
 * **Nothing in the product imports it. That is the point, and it is what makes this file
 * necessary** — an unwired component has no user to notice when it stops working, and
 * nothing in the toolchain would report it: Biome's recommended preset has no unused-export
 * rule, `noUnusedLocals` is not set, and there is no knip/ts-prune in the repo. So the
 * guard is here instead, and it is deliberately about the things a tidy-up would take:
 * the component renders at every pose it claims, its design source is still on the shelf,
 * and its stylesheet block is still present. Re-wiring it for its era should be a wiring
 * job, not an excavation.
 *
 * Its MOTION and its POSES need a real CSSOM and are checked next door in
 * `cityGuidePreserved.browser.test.tsx`; this harness runs `css: false`.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CityGuideCharacter, type CityGuideMood } from "./CityGuideCharacter";

const CITY_GUIDE_MOODS_TYPED: Record<CityGuideMood, true> = {
  idle: true,
  talk: true,
  wave: true,
  cheer: true,
};
const CITY_GUIDE_MOODS = Object.keys(CITY_GUIDE_MOODS_TYPED) as CityGuideMood[];

/**
 * Every `.ts`/`.tsx` under `apps/web/src`, as text. The sweep is over the whole app rather
 * than the directories an importer seems likely to live in, because "seems likely" is what
 * a missed importer hides behind.
 */
const APP_SOURCES = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const PRODUCT_FILES = Object.keys(APP_SOURCES).filter((path) => !path.includes(".test."));
const TEST_FILES = Object.keys(APP_SOURCES).filter((path) => path.includes(".test."));

/** Files whose source imports `CityGuideCharacter` under any relative spelling. */
function importersOf(paths: string[]): string[] {
  return paths.filter((path) =>
    /from\s+"[^"]*\/CityGuideCharacter"/.test(APP_SOURCES[path] ?? ""),
  );
}

describe("CityGuide is preserved and has no product consumer", () => {
  it("the sweep actually read the app's sources", () => {
    // Floors: "no importers" over an empty sweep is not a finding about anything.
    expect(PRODUCT_FILES.length).toBeGreaterThan(100);
    expect(TEST_FILES.length).toBeGreaterThan(20);
  });

  it("no product file imports it — only this preservation guard does", () => {
    expect(importersOf(PRODUCT_FILES)).toEqual([]);
    // And the sweep can see an importer when there is one, which is what stops the
    // assertion above from passing because the regex is simply wrong.
    expect(importersOf(TEST_FILES).length).toBeGreaterThan(0);
  });

  it("still renders every pose it claims, so re-wiring is a wiring job", () => {
    expect(CITY_GUIDE_MOODS.length).toBe(4);
    for (const mood of CITY_GUIDE_MOODS) {
      const { container, unmount } = render(<CityGuideCharacter mood={mood} />);
      const root = container.querySelector(".city-guide");
      expect(root, `CityGuide at ${mood}`).not.toBeNull();
      expect(root?.getAttribute("data-mood")).toBe(mood);
      // The parts each pose needs are all still in the markup (it is static, like Oru's).
      for (const part of [
        "city-guide__arm",
        "city-guide__eyes-open",
        "city-guide__eyes-happy",
        "city-guide__mouth-smile",
        "city-guide__mouth-talk",
        "city-guide__hat",
      ]) {
        expect(container.querySelectorAll(`.${part}`).length, part).toBeGreaterThan(0);
      }
      unmount();
    }
  });

  it("keeps its `wave` and `cheer` poses, which are why it is worth keeping", () => {
    // Oru has neither, so these two are the expressive range the era-one advisor lost.
    expect(CITY_GUIDE_MOODS).toContain("wave");
    expect(CITY_GUIDE_MOODS).toContain("cheer");
  });
});

/**
 * THE ADVISOR SHELF — one `.dc.html` design source per advisor character, and nothing else.
 *
 * ## Why this is set equality and not "contains at least"
 *
 * The shelf is a small, hand-curated directory whose whole purpose is that a port can be
 * checked against its stored original. Set equality in both directions is what makes it
 * load-bearing: a file APPEARING here without a declared component is an orphan source
 * nobody will maintain, and a file DISAPPEARING is a port that can no longer be checked.
 * Weakening it to containment would survive both.
 *
 * **It was widened from two entries to three on 2026-07-31, when era two's advisor art
 * landed** (`MakaAdvisor.dc.html` → `MakaAdvisorCharacter.tsx`). Widened rather than
 * side-stepped: a genuine third advisor belongs on the advisor shelf, and hiding the file in
 * a subdirectory to dodge this glob is the arrangement that breaks the day somebody makes
 * the glob recursive. `art/sources/README.md` §"Why it stayed here" makes the same argument
 * for CityGuide and it applies unchanged.
 *
 * ## The census is a named table, so it fails both ways
 *
 * Each row names the source, the component ported from it, and why it is on the shelf. A
 * bare count of three would be satisfied by three of anything; asserting the table against
 * the glob in both directions is what pins the COMPOSITION rather than the size.
 */
const SHELF_CENSUS: Readonly<Record<string, { component: string; why: string }>> = {
  "CityGuide.dc.html": {
    component: "CityGuideCharacter.tsx",
    why: "PRESERVED AND DELIBERATELY UNWIRED — a later era's advisor (roughly eras 8-10)",
  },
  "OruAdvisor.dc.html": {
    component: "OruAdvisorCharacter.tsx",
    why: "LIVE — era one's advisor, the Prehistoric elder the learner is introduced to",
  },
  "MakaAdvisor.dc.html": {
    component: "MakaAdvisorCharacter.tsx",
    why: "LIVE — era two's advisor art, ported 2026-07-31 from Evan's Gridwork Eras export",
  },
};

describe("the advisor shelf holds exactly one source per advisor character", () => {
  const SHELF = import.meta.glob("../city/art/sources/*.dc.html", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  const COMPONENTS = import.meta.glob("./*Character.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  const shelved = Object.keys(SHELF)
    .map((path) => path.replace("../city/art/sources/", ""))
    .sort();

  it("holds precisely the three declared sources — set equality, both directions", () => {
    // Both directions at once: an undeclared file on the shelf fails, and a declared row
    // whose file is gone fails. Neither can be satisfied by the other's slack.
    expect(shelved).toEqual(Object.keys(SHELF_CENSUS).sort());
    // Floor, so the equality above is not two empty lists agreeing with each other.
    expect(shelved.length).toBe(3);
  });

  it("pairs every shelved source with a component that exists", () => {
    let paired = 0;
    for (const [source, row] of Object.entries(SHELF_CENSUS)) {
      expect(row.why.length, `${source} is shelved with no reason`).toBeGreaterThan(20);
      expect(
        COMPONENTS[`./${row.component}`],
        `${source} names ${row.component}, which is not in lessons/`,
      ).toBeDefined();
      paired += 1;
    }
    expect(paired).toBe(shelved.length);
  });

  it("keeps every source a real drawing rather than a stub left behind", () => {
    // Not merely present. CityGuide is the 240x240 SVG delivery; the two advisors ported
    // since are percentage-boxed HTML with a four-pose `data-props` enum.
    const cityGuide = SHELF["../city/art/sources/CityGuide.dc.html"] ?? "";
    expect(cityGuide.length).toBeGreaterThan(5000);
    expect(cityGuide).toContain('viewBox="0 0 240 240"');
    expect(cityGuide).toContain("cg-wave");

    for (const source of ["OruAdvisor.dc.html", "MakaAdvisor.dc.html"]) {
      const text = SHELF[`../city/art/sources/${source}`] ?? "";
      expect(text.length, `${source} is a stub`).toBeGreaterThan(5000);
      // The pose vocabulary the port is checked against, in the source's own words.
      for (const pose of ["idle", "talk", "point", "squint"]) {
        expect(text, `${source} does not offer ${pose}`).toContain(pose);
      }
    }
  });
});
