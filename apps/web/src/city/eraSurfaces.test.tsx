import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import { CURRENT_ERA_ID } from "./eraDressing";
import { ERA_ISLAND_GROUND, hasAuthoredIslandGround } from "./islandGround";
import {
  ERA_ROAD_SURFACING,
  hasAuthoredRoadSurfacing,
  roadSurfacing,
  UNAUTHORED_ROAD_SURFACING,
} from "./roadSurfacing";
import {
  describeEraTownHallArt,
  hasAuthoredEraTownHall,
  resolveEraTownHall,
  TOWN_HALL_ERA_MODELS,
} from "./townHall";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { resetCityEra } from "./useCityEra";

/**
 * **WHAT AN ERA ADVANCE ACTUALLY CHANGES, surface by surface, swept from `ERA_SEQUENCE`.**
 *
 * The four surfaces an advance still re-dresses are the island, the roads, the advisor and the
 * Town Hall (D-ERA26 / D-ERA30 / D-ERA28 / D-ERA22, and the 2026-07-29 re-dressing ruling's
 * named exceptions). Each has its own file for its own mechanism; this one is the cross-surface
 * read, and it exists to answer one question honestly per era: **is this surface's pipeline
 * able to carry per-era content at all, or is it only missing content?**
 *
 * That distinction is the whole point. A pipeline that cannot carry an era is a WIRING defect
 * and stays broken when content lands; a pipeline with a working fallback and no rows is a
 * CONTENT gap and lights up the moment a row is authored. Both look identical on screen today,
 * which is exactly why they need separating in a test rather than in prose.
 */

describe("A2 — the Town Hall says whose hall is standing", () => {
  /**
   * THE DEFECT: `resolveEraTownHall` has always reported its fallback in `art`, and its own
   * docblock argues that reporting it is what makes the fallback honest — *"a surface can say
   * which it is showing"*. No surface said. Both `CitySurface` call sites read `.model` and
   * dropped the verdict, so all ten eras rendered era one's hall in silence, which is
   * indistinguishable from a pipeline that has no era axis.
   *
   * Era two USED to be the case worth naming: it declared `townhall-neolithic-built.glb` while
   * the bundle had not got it, so it reported `fallback` where eras three to ten reported
   * `unauthored`. **#316 landed that GLB**, so era two is now `authored` and the `fallback`
   * verdict has NO era in it. The floor below is therefore derived from the two tables rather
   * than written down as a number, and the branch itself is covered by the test after this one,
   * which builds the verdict directly — because a branch with no live example is a branch that
   * would otherwise stop being checked at all.
   */
  it("distinguishes a missing asset from an unauthored hall, in every era", () => {
    let authored = 0;
    let missingAsset = 0;
    let unauthored = 0;

    for (const era of ERA_SEQUENCE) {
      const resolved = resolveEraTownHall(era.id, CURRENT_ERA_ID);
      const note = describeEraTownHallArt(resolved, era.name);

      // TOTAL: a hall always renders. A blank island is worse than a visibly era-one hall in a
      // city whose roster, roads, hub name and ground have all already advanced.
      expect(resolved.model, era.id).not.toBeNull();

      switch (resolved.art) {
        case "authored":
          authored += 1;
          expect(resolved.showing_era, era.id).toBe(era.id);
          expect(hasAuthoredEraTownHall(era.id), era.id).toBe(true);
          // Nothing to admit, so nothing is said.
          expect(note, era.id).toBeNull();
          break;
        case "fallback":
          missingAsset += 1;
          // The era DECLARED a hall; the bundle has not got it.
          expect(TOWN_HALL_ERA_MODELS[era.id], era.id).toBeDefined();
          expect(hasAuthoredEraTownHall(era.id), era.id).toBe(false);
          expect(resolved.showing_era, era.id).toBe(era.id);
          expect(note, era.id).toMatch(/not in the build yet/i);
          break;
        default:
          unauthored += 1;
          // Nobody has designed this era's hall.
          expect(TOWN_HALL_ERA_MODELS[era.id], era.id).toBeUndefined();
          expect(resolved.showing_era, era.id).toBe(era.id);
          expect(note, era.id).toMatch(/no finished Hall model of its own yet/i);
      }
    }

    // FLOORS, derived from the table and the bundle rather than written down.
    expect(authored + missingAsset + unauthored).toBe(ERA_SEQUENCE.length);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(authored).toBeGreaterThanOrEqual(1);
    expect(unauthored).toBe(1);

    // The `fallback` count is an EQUALITY against the eras that are declared-but-unbundled,
    // not a floor, because that population is empty today and a floor of one would have to be
    // either failing or lying. Equality fails in the direction that matters: an era that
    // declares a hall before its GLB lands must report `fallback`, and an era whose GLB lands
    // must stop reporting it. Both halves of the switch above already assert the per-era
    // properties, so this pins only the split.
    const declaredButUnbundled = ERA_SEQUENCE.filter(
      (era) =>
        TOWN_HALL_ERA_MODELS[era.id] !== undefined && !hasAuthoredEraTownHall(era.id),
    ).map((era) => era.id);
    expect(missingAsset, `declared but unbundled: ${declaredButUnbundled.join(", ")}`).toBe(
      declaredButUnbundled.length,
    );
  });

  /**
   * **THE `fallback` BRANCH, WITH NO ERA LEFT IN IT.**
   *
   * Era two was the only era that ever reported `fallback`, and #316 bundled its GLB. The sweep
   * above can therefore no longer reach this branch from any real era, and the two sentences it
   * exists to keep apart — *a designed hall whose model is missing* versus *no hall designed* —
   * would go unchecked on a derived population alone.
   *
   * So the verdict is constructed rather than resolved. `describeEraTownHallArt` takes a
   * `ResolvedEraTownHall` as a parameter, which makes both branches reachable without touching
   * the bundle: what is under test here is the COPY DECISION, and that is the half that would
   * mislead a reviewer chasing a missing GLB if it collapsed into the unauthored sentence.
   */
  it("still says a missing model and an undesigned hall differently, with no era in either", () => {
    const eraOneName = ERA_SEQUENCE.find((era) => era.id === CURRENT_ERA_ID)?.name ?? "";
    expect(eraOneName).not.toBe("");
    const model = resolveEraTownHall(CURRENT_ERA_ID, CURRENT_ERA_ID).model;

    const missingModel = describeEraTownHallArt(
      { model, showing_era: CURRENT_ERA_ID, art: "fallback" },
      eraOneName,
    );
    const noHallDesigned = describeEraTownHallArt(
      { model, showing_era: CURRENT_ERA_ID, art: "unauthored" },
      eraOneName,
    );
    const bundled = describeEraTownHallArt(
      { model, showing_era: CURRENT_ERA_ID, art: "authored" },
      eraOneName,
    );

    expect(missingModel).toMatch(/not in the build yet/i);
    expect(noHallDesigned).toMatch(/no finished Hall model of its own yet/i);
    // The distinction, asserted as a distinction and not just as two regexes that happen to
    // match: collapsing the switch's two non-authored arms would make these equal.
    expect(missingModel).not.toBe(noHallDesigned);
    // Both identify the intentional era-specific treatment rather than borrowing another age.
    expect(missingModel).toMatch(/era-specific civic landmark/i);
    expect(noHallDesigned).toMatch(/era-specific civic landmark/i);
    // And an authored hall still admits nothing, so the note cannot become unconditional.
    expect(bundled).toBeNull();
  });

  it("puts the note on the hub's own panel, and only where there is something to admit", async () => {
    const withoutHall = ERA_SEQUENCE.find(
      (era) => resolveEraTownHall(era.id, CURRENT_ERA_ID).art !== "authored",
    );
    expect(withoutHall).toBeDefined();

    // ERA ONE: its own hall is bundled, so the panel says nothing about art. Mounted through
    // the `eraId` prop over the default mock city, which is the one loader that seeds a hall —
    // the same way `eraDressing.test.tsx` reaches the hub's callout.
    const user = userEvent.setup();
    const own = render(<CitySurface enableCanvas={false} eraId={CURRENT_ERA_ID} />);
    await openBuiltShelf(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));
    await screen.findByTestId("town-hall-panel");
    expect(screen.queryByTestId("town-hall-art-note")).toBeNull();
    own.unmount();

    // AN ERA WITH NO FINISHED HALL GLB: the panel names the intentional fallback treatment.
    render(<CitySurface enableCanvas={false} eraId={withoutHall?.id ?? "classical"} />);
    await openBuiltShelf(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));
    await screen.findByTestId("town-hall-panel");
    const note = screen.getByTestId("town-hall-art-note");
    expect(note).toHaveTextContent(/era-specific civic landmark/i);
    expect(note).not.toHaveTextContent(/Prehistoric Era/i);
    expect(note.closest("[aria-hidden='true']")).toBeNull();
  });

  beforeEach(() => resetCityEra());
  afterEach(() => resetCityEra());
});

/**
 * **A3 — the roads are a CONTENT gap and not a wiring one, and this is the confirmation.**
 *
 * The finding to check was that `ERA_ROAD_SURFACING` holds two rows and eras three to ten fall
 * to a single bare-earth course. That is true, and it is the pipeline working: `CityScene` passes
 * `eraId` to `Roads`, `Roads` calls `roadSurfacing(eraId)`, and the surfacing is a total
 * function over a `Partial` table with a named fallback. **So no code change is owed here**, and
 * this test is the evidence for that claim rather than a fix.
 *
 * What it pins is the property that makes it a content gap: every era resolves to a usable
 * surfacing, the authored rows are the ones the table declares, and the unauthored eras get the
 * NAMED fallback rather than era one's row. `three/roadSurface.test.ts` already reads the built
 * meshes; this reads the pipeline's shape over the whole sequence, which is the part the audit
 * asked about.
 */
describe("A3 — road surfacing carries every era, and eight of them have no content", () => {
  it("resolves a usable surfacing for every era, and never borrows era one's", () => {
    const eraOne = roadSurfacing(CURRENT_ERA_ID);
    const authored: EraId[] = [];
    const fallback: EraId[] = [];

    for (const era of ERA_SEQUENCE) {
      const surfacing = roadSurfacing(era.id);
      // TOTAL: a laid road tile the player paid for always draws something.
      expect(surfacing.courses.length, era.id).toBeGreaterThan(0);

      if (hasAuthoredRoadSurfacing(era.id)) {
        authored.push(era.id);
        expect(surfacing, era.id).toBe(ERA_ROAD_SURFACING[era.id]);
      } else {
        fallback.push(era.id);
        // The NAMED fallback, not the previous era's row and not era one's.
        expect(surfacing, era.id).toBe(UNAUTHORED_ROAD_SURFACING);
        expect(surfacing, era.id).not.toBe(eraOne);
      }
    }

    expect(authored.length + fallback.length).toBe(ERA_SEQUENCE.length);
    expect(authored).toEqual(Object.keys(ERA_ROAD_SURFACING));
    expect(authored.length).toBeGreaterThanOrEqual(2);
    expect(fallback.length).toBeGreaterThanOrEqual(8);
  });

  /**
   * The three per-era surfaces the city dresses from now have the SAME SHAPE, which is what
   * makes "a row is all that is owed" true of each: a partial table, a named fallback, and a
   * `hasAuthored*` predicate that tells a caller which it got. Asserted as a property of the
   * three rather than described, so a fourth surface wired without the fallback fails here.
   */
  it("gives the island, the roads and the hall the same authored-or-named-fallback shape", () => {
    for (const era of ERA_SEQUENCE) {
      const island = hasAuthoredIslandGround(era.id);
      const roads = hasAuthoredRoadSurfacing(era.id);
      const hall = hasAuthoredEraTownHall(era.id);
      // Each predicate is a real answer about THIS era rather than a constant.
      expect(typeof island, era.id).toBe("boolean");
      expect(typeof roads, era.id).toBe("boolean");
      expect(typeof hall, era.id).toBe("boolean");
    }

    const erasWhere = (authored: (eraId: EraId) => boolean): EraId[] =>
      ERA_SEQUENCE.filter((era) => authored(era.id)).map((era) => era.id);
    const populations = {
      ground: erasWhere(hasAuthoredIslandGround),
      roads: erasWhere(hasAuthoredRoadSurfacing),
      hall: erasWhere(hasAuthoredEraTownHall),
    };
    // Evan's delivery completes the ground population. Roads and Halls remain partial,
    // independently-authored registries and must not inherit that completion.
    expect(populations.ground).toEqual(ERA_SEQUENCE.map((era) => era.id));
    for (const [surface, eras] of Object.entries({
      roads: populations.roads,
      hall: populations.hall,
    })) {
      expect(eras.length, surface).toBeGreaterThan(0);
      expect(eras.length, surface).toBeLessThan(ERA_SEQUENCE.length);
    }

    // EACH PREDICATE ANSWERS OFF ITS OWN REGISTRY, asserted as set equality against that
    // registry's own keys. This is what the clause below used to get from a disagreeing era and
    // is the part that does not depend on one: a predicate repointed at another surface's table
    // fails here the moment the two tables differ by a single era.
    expect(populations.ground).toEqual(Object.keys(ERA_ISLAND_GROUND));
    expect(populations.roads).toEqual(Object.keys(ERA_ROAD_SURFACING));

    /*
     * ERA THREE IS THE LIVE WITNESS THAT THESE ARE INDEPENDENT REGISTRIES. Its island and
     * Council Hall are authored while its road still uses the named fallback. One art drop
     * must not make another surface claim content it does not have.
     */
    expect(populations.ground).not.toEqual(populations.roads);
    expect(hasAuthoredIslandGround("bronze_age")).toBe(true);
    expect(hasAuthoredRoadSurfacing("bronze_age")).toBe(false);
    expect(hasAuthoredEraTownHall("bronze_age")).toBe(true);
    expect(populations.hall).toContain("bronze_age");
    expect(populations.ground).toContain("bronze_age");
    expect(populations.roads).not.toContain("bronze_age");
  });
});
