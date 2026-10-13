import { ERA_SEQUENCE } from "@cr/skill-graph";
// Type-only, following `islandDressingFillsTheIsland.test.ts`: a VALUE import of `three` here
// loads a second runtime copy alongside the one `StarterIsland.tsx` uses, and meshes are
// recognised by three's own `isMesh` flag.
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import {
  buildActivePlacementGrid,
  buildIslandGroup,
  PLACEMENT_GRID,
  PLACEMENT_GRID_OPACITY,
} from "./StarterIsland";

/**
 * The strength this grid drew at from the day it was baked until 2026-08-05, and the strength the
 * lead was looking at when he said a grown island's graphics *"are cooked"*.
 *
 * A retired number kept on purpose, because the ceiling below is only meaningful against it: a
 * bare `0.36` would read as a taste, and this says whose frame it is half of.
 */
const REJECTED_AS_TOO_STRONG = 0.72;

/**
 * **THE ISLAND'S CELL GRID IS DRAWN. ALWAYS, IN EVERY ERA, ON EVERY SURFACE THAT DRAWS THE
 * ISLAND — AND THIS FILE EXISTS BECAUSE IT WAS ONCE NOT.**
 *
 * #566 gated the grid on
 * `placing || roadPainting`, on the diagnosis that a grid over an undressed interior is what
 * makes a grown island read as an unfinished build site. The lead, on the tree that shipped:
 * *"dude wtf - where did the grid/tiles go?? they need to still be in the game - revert whatever
 * PR you did that took them away."*
 *
 * So this file is the same file inverted. It used to hold *"the island hands the grid over
 * switched off"*; it now holds the ruling that replaced it, in four parts:
 *
 *  1. **the island hands the grid over DRAWN**, at every era, at the shipped opacity;
 *  2. **at a strength inside a band with BOTH ends written down** — non-zero, so it cannot be
 *     hidden by shipping a zero, and quiet, so it cannot go back to the strength behind the
 *     lead's *other* complaint. That second end is new: see `and quiet enough to be ground`;
 *  3. **nothing downstream can hide it** — no source reaches into the group for the grid, and
 *     the file that owns it writes neither `.visible` nor `.opacity`, which is precisely the
 *     mechanism #566 used (a `useFrame` writer on that one material);
 *  4. **every surface that draws the island shows the cells**, with NO exception list, because
 *     there is no longer a flag for a surface to be excused from passing.
 *
 * ## ⚑ THE LEAD COMPLAINED ABOUT THIS GRID TWICE, FROM OPPOSITE DIRECTIONS
 *
 * Reading only the quote above gets the strength wrong, which is how it came to be restored at
 * the number the earlier complaint was about. Before *"where did the grid/tiles go"* there was
 * *"the graphics also are cooked after the age advances / the island expands"*, and that frame is
 * this grid at 0.72 over an era six island whose empty ground #544 had just taken to 32.2%.
 * Shown both, he ruled for **two strengths**: quiet at rest, brighter while placing. Part 2 is
 * that ruling, and it is why a floor alone is not enough.
 *
 * ## What this file does NOT claim
 *
 * That the island looks good, or that the number inside the band is the right one. #566's
 * diagnosis was measured and the measurement stands: `islandBareInterior.test.ts` holds the
 * undressed centre at every era, and after #544 it is ~80% of the island's area. The lead's
 * ruling is that the tiles are not what pays for that. A frame is owed for the visual half and it
 * is not this file's — `.cursor/rules/qa-verification.mdc` rules that a spatial claim needs a
 * rendered frame somebody looked at, and those live in `islandReadsAsAPlace.browser.test.tsx` at
 * 1024x580 under `docs/design-refs/island-reads-as-a-place/`.
 *
 * Nor does it touch `CityScene`'s brighter drei `BuildGrid`, which is mounted on
 * `placing || roadPainting` and has been since it was written. That one is the placement
 * affordance and gating it is right. This one is the ground — and the two of them are the two
 * strengths the ruling asks for, one predicate apart.
 */

/* -------------------------------------------------------------------------- */
/* 1. The island hands it over drawn                                          */
/* -------------------------------------------------------------------------- */

describe("the island draws exactly one cell grid, and it arrives drawn", () => {
  it("at every era, on that era's own island", () => {
    // POPULATION: every authored era, each on the island it is drawn on. FLOOR: ten, so this
    // cannot pass over a sequence that lost its eras.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    let checked = 0;
    for (const era of ERA_SEQUENCE) {
      const grassR = eraLandRadius(era.id);
      const group = buildIslandGroup(eraCityLayout(era.id), islandGround(era.id), grassR);
      const grids: THREE.Mesh[] = [];
      group.traverse((object) => {
        if (object.name === PLACEMENT_GRID) {
          grids.push(object as THREE.Mesh);
        }
      });
      // EXACTLY ONE, in both directions: a second grid would double every line, and none at
      // all is the defect the lead reported.
      expect(grids.length, `${era.id} draws ${grids.length} cell grids`).toBe(1);
      const grid = grids[0] as THREE.Mesh;
      expect(grid.isMesh).toBe(true);
      // ⚑ THE LEAD'S OWN ASK, and the line #566 inverted: the grid is visible without anyone
      // asking for it, because it is the ground a learner builds on rather than a mode.
      expect(grid.visible, `${era.id} hands the grid over hidden`).toBe(true);
      expect(
        (grid.material as THREE.MeshBasicMaterial).opacity,
        `${era.id} hands the grid over at zero opacity, which is hidden by another name`,
      ).toBe(PLACEMENT_GRID_OPACITY);
      const material = grid.material as THREE.MeshBasicMaterial;
      expect(
        material.depthTest,
        `${era.id}'s grid must still disappear behind standing buildings`,
      ).toBe(true);
      expect(
        grid.renderOrder,
        `${era.id}'s legal-cell overlay is not ordered after authored terrain`,
      ).toBeGreaterThanOrEqual(100);
      checked += 1;
    }
    expect(checked).toBe(ERA_SEQUENCE.length);
  });

  /**
   * A FLOOR UNDER THE OPACITY ASSERTION ABOVE, which is otherwise satisfiable by shipping a
   * `PLACEMENT_GRID_OPACITY` of zero — the constant and the assertion would still agree, and
   * the grid would be as invisible as #566 left it.
   */
  it("at a restrained exploration opacity that still leaves a terrain cue", () => {
    // The grid remains present at rest, per the product ruling, but it no longer supplies the
    // dominant contrast over most of the island. The mode-gated BuildGrid below owns the strong
    // placement affordance.
    expect(PLACEMENT_GRID_OPACITY).toBeGreaterThan(0.03);
    expect(PLACEMENT_GRID_OPACITY).toBeLessThanOrEqual(0.25);
  });

  it("clears the owner-observed visibility floor on the whole idle island", () => {
    expect(PLACEMENT_GRID_OPACITY).toBeGreaterThanOrEqual(0.12);
  });

  it("draws the active build grid over every era's terrain", () => {
    let checked = 0;
    for (const era of ERA_SEQUENCE) {
      const grid = buildActivePlacementGrid(
        islandGround(era.id).tones,
        eraCityLayout(era.id).buildableRadius,
      );
      expect(
        (grid.material as THREE.MeshBasicMaterial).depthTest,
        `${era.id}'s active grid must still disappear behind standing buildings`,
      ).toBe(true);
      expect(
        grid.renderOrder,
        `${era.id}'s active build overlay order`,
      ).toBeGreaterThanOrEqual(100);
      checked += 1;
    }
    expect(checked).toBe(ERA_SEQUENCE.length);
  });

  /**
   * **AND A CEILING, WHICH IS THE OTHER HALF OF THE RULING AND THE HALF A FLOOR CANNOT HOLD.**
   *
   * The lead complained about this grid TWICE, from opposite directions, and until now only the
   * second was held. The floor above answers *"where did the grid/tiles go"*. Nothing answered
   * *"the graphics also are cooked after the age advances / the island expands"* — which is the
   * frame this grid drew at {@link REJECTED_AS_TOO_STRONG} over an era six island whose empty
   * ground is 32.2% of its area, and which a floor is satisfied by. Shown both frames, he ruled
   * for two strengths: quiet at rest, brighter while placing.
   *
   * So the band is written down at both ends. It is deliberately a BAND and not the number: which
   * opacity reads as buildable ground and which as a marked-out lot is a look, so a frame decides
   * it and this file cannot — see the constant's own docblock for the frames, and
   * `.cursor/rules/qa-verification.mdc` for why a green run here is not evidence of either.
   */
  it("and quiet enough to be ground rather than a marked-out lot", () => {
    // Half the rejected strength, so "subtle" means something a value cannot drift past while
    // still clearing the floor. 0.72 itself fails here, which is the point: it is the number the
    // "cooked" frame was drawn at, and #636 restored it because the ruling then was only that the
    // tiles had to exist.
    expect(PLACEMENT_GRID_OPACITY).toBeLessThanOrEqual(REJECTED_AS_TOO_STRONG / 2);
    // ...and the band is a real interval rather than a point, so this is not the floor written
    // twice: there is room between the two ends for a frame to move the number.
    expect(REJECTED_AS_TOO_STRONG / 2).toBeGreaterThan(0.1);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Nothing downstream can hide it                                          */
/* -------------------------------------------------------------------------- */

/**
 * Every `.tsx` under `apps/web/src`, read as text. `import.meta.glob` rather than `node:fs` is
 * the house style for a source sweep here, and it is not a preference: this project has no node
 * types, so a `readFileSync` version does not typecheck (`three/personSize.test.ts` says the
 * same, and `relativeToSrc` below is its resolver).
 */
const RAW = import.meta.glob("../../**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * A glob key, as a path relative to `apps/web/src`.
 *
 * `import.meta.glob` hands back keys relative to THIS file and collapses them where it can, so
 * the same sweep returns `./CityScene.tsx` and `../../App.tsx`. Resolving them against this
 * file's own directory is what makes a written-down path mean one thing.
 */
function relativeToSrc(key: string): string {
  const stack: string[] = [];
  for (const segment of `city/three/${key}`.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return stack.join("/");
}

/** Paths relative to `apps/web/src`, with the test files dropped. */
const SOURCES: ReadonlyMap<string, string> = new Map(
  Object.entries(RAW)
    .filter(([path]) => !path.includes(".test."))
    .map(([path, source]) => [relativeToSrc(path), source]),
);

/** The file that builds the live-city grid. */
const ISLAND = "city/three/StarterIsland.tsx";

/**
 * `PLACEMENT_GRID` as a whole token — `\b` already excludes `PLACEMENT_GRID_OPACITY`.
 *
 * Built per call rather than shared: a `/g` regex carries `lastIndex` between `.test()` calls, so
 * one shared instance would skip every other file in a sweep and report a shorter list than the
 * tree has.
 */
function namesTheGrid(source: string): boolean {
  return /\bPLACEMENT_GRID\b/.test(source);
}

/** Does this source remove and dispose the placement-grid mesh after authoring it? */
function stripsThePlacementGrid(source: string): boolean {
  return (
    source.includes("getObjectByName(PLACEMENT_GRID)") &&
    source.includes("placementGrid.removeFromParent()") &&
    source.includes("disposeSceneGraph(placementGrid)")
  );
}

describe("nothing downstream removes or hides the city grid", () => {
  /**
   * **THE MECHANISM #566 USED, asserted absent rather than argued absent.**
   *
   * Its fade was a `useFrame` writer that looked the mesh up with
   * `group.getObjectByName(PLACEMENT_GRID)` and drove `material.opacity` and `.visible` from a
   * prop. Part 1 above cannot see that: it reads `buildIslandGroup`'s output, and a frame-loop
   * writer hides the grid *after* the group is handed over. So this is the half that catches it.
   */
  it("only the builder names the grid, and no source strips it after authoring", () => {
    expect(SOURCES.has(ISLAND), `${ISLAND} is not in the sweep`).toBe(true);
    const namers = [...SOURCES.entries()]
      .filter(([, source]) => namesTheGrid(source))
      .map(([path]) => path)
      .sort();
    // A FLOOR: the sweep found the file that declares the name, so an empty walk cannot pass.
    expect(namers, "an undeclared source names the grid").toEqual([ISLAND]);
    const strippers = [...SOURCES.entries()]
      .filter(([, source]) => stripsThePlacementGrid(source))
      .map(([path]) => path);
    expect(strippers, "a source removes and disposes the placement grid").toEqual([]);
  });

  /**
   * ⚑ **DELIBERATELY BLUNT, and the bluntness is the point.**
   *
   * `StarterIsland.tsx` builds the one mesh the lead asked to keep visible. It writes neither
   * `.visible` nor `.opacity` anywhere today — the grid's opacity is a constructor argument and
   * nothing mutates it after — so a rule against both is free right now and reds the instant
   * somebody adds a fade. If a future fade here is for something else entirely, move the fade
   * rather than loosen this: `.cursor/rules/qa-verification.mdc` requires the loosened lines to
   * be shown red against an injected defect, and that is the cost of the argument.
   */
  it("and the island itself never writes a visibility or an opacity", () => {
    const source = SOURCES.get(ISLAND) as string;
    expect(source.length).toBeGreaterThan(1000);
    expect(/\.visible\s*=[^=]/.test(source), "the island writes a `.visible`").toBe(false);
    expect(/\.opacity\s*=[^=]/.test(source), "the island writes an `.opacity`").toBe(false);
    expect(
      source.includes("getObjectByName"),
      "the island looks a child up by name, which is how the grid was faded out",
    ).toBe(false);
  });

  /**
   * The readers above, injected rather than trusted. An assertion written green may be asserting
   * nothing, and every one of these strings is a shape #566 actually shipped.
   */
  it("reads the writes it is looking for", () => {
    expect(/\.visible\s*=[^=]/.test("grid.visible = material.opacity > 0.001;")).toBe(true);
    expect(/\.visible\s*=[^=]/.test("mesh.visible = false;")).toBe(true);
    expect(/\.opacity\s*=[^=]/.test("material.opacity = placementGridOpacity({")).toBe(
      true,
    );
    expect(/\.opacity\s*=[^=]/.test("mesh.material.opacity = 0;")).toBe(true);
    // ...and it is a WRITE it reads, not a comparison or a declared property, so the shipped
    // material literal and an equality test do not stand in for one.
    expect(/\.opacity\s*=[^=]/.test("opacity: PLACEMENT_GRID_OPACITY,")).toBe(false);
    expect(/\.visible\s*=[^=]/.test("if (grid.visible === true) {")).toBe(false);
    // The name reader, both ways.
    expect("mesh.name = PLACEMENT_GRID;".match(/\bPLACEMENT_GRID\b/g)?.length).toBe(1);
    expect("opacity: PLACEMENT_GRID_OPACITY,".match(/\bPLACEMENT_GRID\b/g)).toBe(null);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Every live/background island shows cells                                */
/* -------------------------------------------------------------------------- */

/**
 * The tags that put an island on screen. **Two, since the island manifest landed.**
 *
 * ⚑ **This guard caught its own population going narrow, which is why there are two.**
 * `IslandFromManifest` was introduced as the one consumer of `islandManifest.ts` and `CityScene`
 * now mounts THAT rather than `StarterIsland` directly — so on a one-tag sweep `CityScene`
 * silently left the population, and the composition assertion below went red rather than quiet.
 * That is the `.cursor/rules/qa-verification.mdc` case verbatim: *"Define a guard's population by
 * who exhibits the behaviour, not by where the behaviour is implemented … a surface can carry a
 * mechanic without importing a line of it."*
 *
 * The behaviour is *"this source causes an island to be drawn"*, and the defect is *"it hands
 * that island a flag that could gate its grid"*. Both are equally possible through either tag —
 * `<IslandFromManifest … placing />` is exactly as bad as `<StarterIsland … placing />` — so
 * both are in the population and both are read by {@link gatesTheGrid}.
 */
const ISLAND_TAGS: readonly string[] = ["StarterIsland", "IslandFromManifest"];

/**
 * Every non-test source under `apps/web/src` that MOUNTS an island.
 *
 * The mount and not the import, and not the word: half a dozen files discuss `StarterIsland` in
 * prose (`ceremonyScenes.tsx` argues at length about not touching it) and none of them draws
 * one, so a mention sweep would hand this guard a population of paragraphs.
 */
function surfacesThatDrawTheIsland(): string[] {
  const mounts = new RegExp(`<(?:${ISLAND_TAGS.join("|")})[\\s/>]`);
  return [...SOURCES.entries()]
    .filter(([, source]) => mounts.test(source))
    .map(([path]) => path)
    .sort();
}

/**
 * Does this source hand the island a flag that could gate its grid?
 *
 * ⚑ **A JSX FLAG NEEDS NO `=`, and reading for one is how #566's own guard passed an injection.**
 * Written as `\bplacing=`, its sweep went green with `<StarterIsland … placing />` — the
 * shorthand boolean, which is the form somebody adding it in a hurry reaches for. So the
 * attribute is matched by what may FOLLOW it: whitespace, `=`, or the tag's own close. That
 * lesson was worth keeping even though the conclusion it served has been reversed.
 *
 * `placing` is named because it is the exact prop #566 added; `grid`-ish names are caught too,
 * because the next attempt will not necessarily reuse the word.
 */
function gatesTheGrid(source: string): boolean {
  return ISLAND_TAGS.some((tag) =>
    new RegExp(`<${tag}[^>]*?\\b(placing|[a-z]*[Gg]rid[a-zA-Z]*)\\s*[=/\\s]`, "s").test(
      source,
    ),
  );
}

describe("every city surface that draws the island shows the cells", () => {
  it("sweeps every island mount and confirms none is excused from the grid", () => {
    const surfaces = surfacesThatDrawTheIsland();
    // A FLOOR under the population, so a walk that found nothing cannot pass.
    expect(surfaces.length, `found ${surfaces.length} surfaces`).toBeGreaterThanOrEqual(2);
    // ...and its COMPOSITION, because a floor constrains size and not shape: a derivation that
    // drifted onto two other files would clear the floor and measure nothing. These are the two
    // real ones — the live city a learner plays on, and the start menu behind the card, which is
    // the surface #566 cited as wanting no grid.
    expect(surfaces).toContain("city/three/CityScene.tsx");
    expect(surfaces).toContain("city/three/TitleBackdrop.tsx");
    // ...and the manifest's own consumer, which is the file that actually mounts the procedural
    // island for the live city now. Named so the widening above cannot quietly narrow again.
    expect(surfaces).toContain("archipelago/IslandFromManifest.tsx");
    expect(
      surfaces.filter((file) => stripsThePlacementGrid(SOURCES.get(file) as string)),
      "a mounting surface strips the placement-grid mesh after authoring",
    ).toEqual([]);

    // ⚑ NO `NO_PLACEMENT_HERE`, and its absence is the ruling. #566 named the title backdrop as
    // an exempt surface; the lead's answer was that the grid is not a mode at all, so there is
    // no flag to be excused from passing, and no surface stands outside that rule.
    let checked = 0;
    for (const file of surfaces) {
      expect(
        gatesTheGrid(SOURCES.get(file) as string),
        `${file} hands the island a flag that could gate its grid`,
      ).toBe(false);
      checked += 1;
    }
    expect(checked).toBe(surfaces.length);
  });

  it("reads a JSX flag written either way, which is what a re-gate would turn on", () => {
    // The reader itself, injected rather than trusted — both spellings of the flag, because one
    // of them is how the last guard here was fooled.
    expect(gatesTheGrid("<StarterIsland layout={l} placing={on} />")).toBe(true);
    expect(gatesTheGrid("<StarterIsland layout={l} placing />")).toBe(true);
    expect(gatesTheGrid("<StarterIsland\n  layout={l}\n  placing\n/>")).toBe(true);
    // ...and a re-gate under a different name, since `placing` is not the only word available.
    expect(gatesTheGrid("<StarterIsland layout={l} showGrid={false} />")).toBe(true);
    expect(gatesTheGrid("<StarterIsland layout={l} gridVisible />")).toBe(true);
    // What it must NOT fire on: the props the island really takes.
    expect(gatesTheGrid("<StarterIsland layout={l} reducedMotion eraId={e} />")).toBe(
      false,
    );
    expect(gatesTheGrid("<StarterIsland layout={islandLayout} />")).toBe(false);
    // ...and it is scoped to the tag, so a `placing` variable elsewhere in a file that mounts a
    // bare island does not stand in for a flag on it.
    expect(
      gatesTheGrid("const placing = true;\nreturn <StarterIsland layout={l} />;"),
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* 4. The other strength, and the predicate that separates them                */
/* -------------------------------------------------------------------------- */

/** Is `CityScene`'s brighter grid mounted BEHIND the placement predicate, rather than always? */
function brighterGridIsGated(source: string): boolean {
  return /\(\s*placing\s*\|\|\s*roadPainting\s*\)\s*&&\s*<BuildGrid\b/.test(source);
}

/**
 * **THE SECOND STRENGTH IS A GATE IN ANOTHER FILE, AND NOTHING HELD IT UNTIL AN INJECTION SAID SO.**
 *
 * The ruling is two strengths — quiet ground, brighter while placing — and everything above holds
 * only the quiet one. The brighten is entirely `CityScene`'s drei `BuildGrid` and entirely its
 * `placing || roadPainting` gate, so removing that gate collapses the two strengths into one
 * bright one drawn always: the *"cooked"* frame back, by a different route, with the resting
 * strength still correct and every assertion above still green. Measured rather than argued —
 * strip the gate, run this file as it stood before this block existed, and it reports **9 passed,
 * 0 failed** over a scene that draws its build grid on an idle island.
 *
 * ⚑ **SCOPED BY THE BEHAVIOUR AND NOT BY THE FILE**, per `.cursor/rules/qa-verification.mdc`.
 * "The island's grid" is implemented in `StarterIsland.tsx` and the behaviour under review — how
 * strongly the ground shows its cells, and when — is exhibited by two components in two files.
 * A guard scoped to the file that owns the mesh is narrower than the ruling it is guarding.
 */
describe("the brighter strength is the gated one, and it is still gated", () => {
  it("mounts CityScene's BuildGrid behind the placement predicate, exactly once", () => {
    const source = SOURCES.get("city/three/CityScene.tsx") as string;
    // EXACTLY ONE MOUNT, so a second ungated copy cannot hide behind a first gated one.
    const mounts = source.match(/<BuildGrid\b/g) ?? [];
    expect(mounts.length, `BuildGrid is mounted ${mounts.length} times`).toBe(1);
    expect(
      brighterGridIsGated(source),
      "CityScene draws its brighter build grid without a placement to draw it for",
    ).toBe(true);
  });

  it("reads the GATE and not the mount, which an ungated mount would satisfy", () => {
    // The reader, injected rather than trusted: the shipped shape passes, and the exact defect
    // above — the mount with its gate stripped — must not.
    expect(
      brighterGridIsGated("{(placing || roadPainting) && <BuildGrid layout={layout} />}"),
    ).toBe(true);
    expect(brighterGridIsGated("<BuildGrid layout={layout} />")).toBe(false);
    expect(brighterGridIsGated("{true && <BuildGrid layout={layout} />}")).toBe(false);
    // ...and a gate that has lost the road-painting half is not this gate either, because a
    // painted road takes cells on the same pitch under the same rules.
    expect(brighterGridIsGated("{placing && <BuildGrid layout={layout} />}")).toBe(false);
  });
});

describe("the flag reader, kept from the guard it was written for", () => {
  it("reads a JSX flag written either way, which is what a re-gate would turn on", () => {
    // The reader itself, injected rather than trusted — both spellings of the flag, because one
    // of them is how the last guard here was fooled.
    expect(gatesTheGrid("<StarterIsland layout={l} placing={on} />")).toBe(true);
    expect(gatesTheGrid("<StarterIsland layout={l} placing />")).toBe(true);
    expect(gatesTheGrid("<StarterIsland\n  layout={l}\n  placing\n/>")).toBe(true);
    // ...and a re-gate under a different name, since `placing` is not the only word available.
    expect(gatesTheGrid("<StarterIsland layout={l} showGrid={false} />")).toBe(true);
    expect(gatesTheGrid("<StarterIsland layout={l} gridVisible />")).toBe(true);
    // What it must NOT fire on: the props the island really takes.
    expect(gatesTheGrid("<StarterIsland layout={l} reducedMotion eraId={e} />")).toBe(
      false,
    );
    expect(gatesTheGrid("<StarterIsland layout={islandLayout} />")).toBe(false);
    // ...and it is scoped to the tag, so a `placing` variable elsewhere in a file that mounts a
    // bare island does not stand in for a flag on it.
    expect(
      gatesTheGrid("const placing = true;\nreturn <StarterIsland layout={l} />;"),
    ).toBe(false);
  });
});
