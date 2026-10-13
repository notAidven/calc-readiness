import { clearRuinedCell, foldCrisisDamage, NO_CRISIS_DAMAGE } from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { ERA_ONE_TERRAIN } from "../islandGround";
import {
  type Footprint,
  MAX_BUILD_HEIGHT,
  NODE_FOOTPRINTS,
  SURFACE_Y,
} from "../worldLayout";
import { neutralConstructionModel, neutralSiteModel } from "./constructionStages";
import { roadCourseTop } from "./Roads";
import { RUIN_TONES, ruinedStageModel } from "./ruinStage";
import {
  buildScarredGroundGroup,
  SCAR_HATCH_NAME,
  SCAR_PLACEHOLDER_TONE,
  SCAR_TILE_NAME,
  SCAR_TOP,
} from "./ScarredGround";
import { ERA_ONE_PROP_TONES, GROUND_DECAL_TOPS } from "./StarterIsland";
import { WINTER_GROUND_TONES } from "./winterTones";

/**
 * **THE RUIN SEAM: A RUINED THING RESOLVES TO A DIFFERENT REPRESENTATION, AND THE
 * CONSTRAINTS THAT BIND WHATEVER IS PUT BEHIND IT.**
 *
 * The placeholder geometry is Evan's to replace and none of it is asserted here as art. What
 * IS asserted is everything a replacement must not quietly break, because each one is a
 * property of the seam rather than of the picture:
 *
 *  - a ruin is DISTINGUISHABLE from every other state the same lot can be in, at the fixed
 *    camera and at zoom-out — so it differs from the intact building by SILHOUETTE and by
 *    TONE, not by one of them;
 *  - it occupies real volume, because on the canvas the click target IS the geometry and a
 *    ruin that renders nothing takes its own lesson away from the pointer;
 *  - it reads without lighting: no light, no emissive;
 *  - mastery gold `#FFB703` never appears on it;
 *  - scars land one per cell on the shared depth ladder, and adding them did not move a rung.
 *
 * ## Why the population is every authored footprint and not one
 *
 * The templates are built per footprint and cached per footprint, so a rule that holds for a
 * 2×2 can fail for a 1×1 (a height ratio that reads on a big lot can vanish on a small one).
 * The population is therefore derived from `NODE_FOOTPRINTS` — the same table the renderer
 * sizes every lot from — plus the default, rather than a footprint written down here.
 */

/** Every footprint a lot can actually have, derived from the table the renderer uses. */
const FOOTPRINTS: readonly Footprint[] = [...Object.values(NODE_FOOTPRINTS)];

/** Distinct `w×d` shapes among them, which is what the cache is keyed by. */
const SHAPES = new Set(FOOTPRINTS.map((fp) => `${fp.w}x${fp.d}`));

/** Mastery gold, reserved and never a body colour. */
const MASTERY_GOLD = 0xffb703;

function materialsOf(object: THREE.Object3D): THREE.Material[] {
  const found: THREE.Material[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      found.push(m);
    }
  });
  return found;
}

function colorsOf(object: THREE.Object3D): number[] {
  return materialsOf(object).map((m) => (m as THREE.MeshStandardMaterial).color.getHex());
}

function sizeOf(object: THREE.Object3D): THREE.Vector3 {
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

describe("the ruin seam resolves a ruined building to its own representation", () => {
  it("sweeps every authored footprint, and the population is derived rather than listed", () => {
    // Floors, because every sweep below is per-footprint and one over a shortened list would
    // pass by not looking. Era one authors seven placements over at least two distinct shapes.
    expect(FOOTPRINTS.length).toBeGreaterThanOrEqual(7);
    expect(SHAPES.size).toBeGreaterThanOrEqual(2);
  });

  it.each(FOOTPRINTS)(
    "gives a %o lot a ruin that is not its site or its scaffold",
    (fp) => {
      const ruin = ruinedStageModel(fp);
      const site = neutralSiteModel(fp);
      const scaffold = neutralConstructionModel(fp);

      // The three are genuinely different objects, so nothing has been aliased to a stage
      // that already existed (which would make a ruin read as "under construction").
      expect(ruin).not.toBe(site);
      expect(ruin).not.toBe(scaffold);
      // ...and they differ in the two channels a ruin is allowed to read by. Tone first:
      // no colour of the ruin appears in either early stage, so it is not a re-lit site.
      const ruinColors = new Set(colorsOf(ruin));
      expect(ruinColors.size).toBeGreaterThan(0);
      for (const color of ruinColors) {
        expect(colorsOf(site)).not.toContain(color);
        expect(colorsOf(scaffold)).not.toContain(color);
      }
      // Silhouette second: a ruin is markedly shorter than the scaffold on the same lot,
      // which is the half of the read that survives full zoom-out.
      expect(sizeOf(ruin).y).toBeLessThan(sizeOf(scaffold).y * 0.6);
    },
  );

  it.each(FOOTPRINTS)("keeps a %o ruin clickable by giving it real volume", (fp) => {
    // `PlacedBuilding` hangs `onClick` on the group the stage stack renders into, so on the
    // canvas the pointer hits GEOMETRY. A ruin that resolved to an empty group would satisfy
    // every other assertion here and silently put the crisis between a learner and a lesson,
    // which is the one thing crisis damage may never do (`ruinLessonAccess.test.tsx`).
    const size = sizeOf(ruinedStageModel(fp));
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
    expect(size.z).toBeGreaterThan(0);
    // And it stands ON the lot rather than under it, so the mass is in front of the camera.
    const box = new THREE.Box3().setFromObject(ruinedStageModel(fp));
    expect(box.max.y).toBeGreaterThan(0);
  });

  it("scales the ruin with the footprint, so a small lot does not wear a big lot's rubble", () => {
    // The cache is keyed by shape, so this is also the check that the key is doing its job
    // rather than handing every lot the first template that was built.
    const small = sizeOf(ruinedStageModel({ w: 1, d: 1 }));
    const large = sizeOf(ruinedStageModel({ w: 2, d: 2 }));
    expect(large.x).toBeGreaterThan(small.x);
    expect(large.z).toBeGreaterThan(small.z);
  });

  it("caches one template per footprint shape and clones nothing per call", () => {
    expect(ruinedStageModel({ w: 2, d: 2 })).toBe(ruinedStageModel({ w: 2, d: 2 }));
    expect(ruinedStageModel({ w: 1, d: 1 })).not.toBe(ruinedStageModel({ w: 2, d: 2 }));
  });

  it("stays well under the height cap, so a ruin can never read as a standing building", () => {
    for (const fp of FOOTPRINTS) {
      expect(sizeOf(ruinedStageModel(fp)).y).toBeLessThan(MAX_BUILD_HEIGHT * 0.5);
    }
  });
});

/**
 * **THE ART THAT LANDED BEHIND THE SEAM, as properties rather than as pixels.**
 *
 * The block above is the SEAM's contract and was written while the geometry was two grey
 * boxes; it holds whatever goes in. This block is about what actually went in on 2026-07-30,
 * and every assertion in it is one the placeholder failed:
 *
 *  - the placeholder had two boxes, so it had no four walls to give four heights to;
 *  - it had no lean, no snow and no char;
 *  - and its height was CONSTANT across every footprint (2.268u on a 1×1 and on a 3×2 alike),
 *    so a small lot wore a big lot's rubble in the one dimension that matters most at this
 *    camera.
 */
describe("the ruin's silhouette is what makes it read as collapse", () => {
  function boxHeights(object: THREE.Object3D): number[] {
    const heights: number[] = [];
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        heights.push(new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()).y);
      }
    });
    return heights;
  }

  it("gives no two of its four standing walls the same height", () => {
    // A ruin whose walls are all one height reads as a building UNDER CONSTRUCTION, which is
    // a state the same lot can genuinely be in — so the four heights are the read, not a
    // flourish. Taken as the four TALLEST elements, since the walls are what stands.
    const heights = boxHeights(ruinedStageModel({ w: 2, d: 2 }))
      .sort((a, b) => b - a)
      .slice(0, 4)
      .map((h) => h.toFixed(3));
    expect(new Set(heights).size).toBe(4);
  });

  it("leans something, so the mass has a direction", () => {
    let leaning = 0;
    ruinedStageModel({ w: 2, d: 2 }).traverse((child) => {
      if ((child as THREE.Mesh).isMesh && Math.abs(child.rotation.z) > 0.01) {
        leaning += 1;
      }
    });
    expect(leaning).toBeGreaterThan(0);
  });

  it("has snow on it and char in it, so it has been there a while", () => {
    const colors = new Set(colorsOf(ruinedStageModel({ w: 2, d: 2 })));
    expect(colors).toContain(RUIN_TONES.snow);
    expect(colors).toContain(RUIN_TONES.char);
    // And it is a built thing rather than a mass: a floor on the part count, because the
    // whole silhouette argument needs walls, a shard, beams and rubble to be separate boxes.
    expect(boxHeights(ruinedStageModel({ w: 2, d: 2 })).length).toBeGreaterThanOrEqual(15);
  });

  it("scales its HEIGHT with the plot, not only its footprint", () => {
    // The shipped placeholder scaled x and z with the plot and left y alone, so every ruin
    // stood 2.268u whatever lot it was on. Height is the dimension the fixed camera reads
    // first, so a 1×1 ruin standing as tall as a 3×2 one is the visible half of the bug.
    const small = sizeOf(ruinedStageModel({ w: 1, d: 1 }));
    const large = sizeOf(ruinedStageModel({ w: 2, d: 2 }));
    expect(large.y).toBeGreaterThan(small.y * 1.5);
  });

  it("clears the seam's own height ceiling on every footprint, with the margin measured", () => {
    // The tight one is the 1×1, where the scaffold is only 5.2u tall — so this is the
    // assertion that would have caught the batch's authored `storey = 3.0` being applied to a
    // plot-sized template (7.2u on a 2×2, taller than the 4.821u Roundhouse it replaces).
    for (const fp of FOOTPRINTS) {
      const ruin = sizeOf(ruinedStageModel(fp)).y;
      const ceiling = sizeOf(neutralConstructionModel(fp)).y * 0.6;
      expect(
        ruin,
        `${fp.w}x${fp.d}: ${ruin.toFixed(3)} vs ${ceiling.toFixed(3)}`,
      ).toBeLessThan(ceiling);
      // ...and it is not clearing it by vanishing, which is the other way this passes.
      expect(ruin).toBeGreaterThan(ceiling * 0.4);
    }
  });
});

describe("a ruin reads by geometry and tone, never by lighting", () => {
  it.each(FOOTPRINTS)("adds no light and no emissive to a %o ruin", (fp) => {
    const ruin = ruinedStageModel(fp);
    let lights = 0;
    ruin.traverse((child) => {
      if ((child as THREE.Light).isLight) {
        lights += 1;
      }
    });
    expect(lights).toBe(0);

    const mats = materialsOf(ruin);
    // A floor under the sweep: a template with no materials would pass the loop vacuously.
    expect(mats.length).toBeGreaterThan(0);
    for (const m of mats) {
      const standard = m as THREE.MeshStandardMaterial;
      expect(standard.emissive?.getHex() ?? 0).toBe(0);
      // Flat shading is how every other stage template here reads its facets without a
      // gradient; a smooth-shaded ruin would be reading by lighting.
      expect(standard.flatShading).toBe(true);
    }
  });
});

describe("mastery gold is reserved and never appears on a ruin", () => {
  it("keeps it off every placeholder tone, on the building and on the ground", () => {
    const tones = [...Object.values(RUIN_TONES), SCAR_PLACEHOLDER_TONE];
    // A floor, so an emptied token table cannot satisfy this by having nothing to check.
    expect(tones.length).toBeGreaterThanOrEqual(3);
    for (const tone of tones) {
      expect(tone).not.toBe(MASTERY_GOLD);
    }
  });

  it("keeps it out of every rendered material, whatever the tones are named", () => {
    // The tones above are what this file can see; the sweep is over what actually ships, so
    // a colour introduced straight into the geometry is caught too.
    for (const fp of FOOTPRINTS) {
      for (const color of colorsOf(ruinedStageModel(fp))) {
        expect(color).not.toBe(MASTERY_GOLD);
      }
    }
    for (const color of colorsOf(buildScarredGroundGroup(["0,0"]))) {
      expect(color).not.toBe(MASTERY_GOLD);
    }
  });
});

describe("scarred ground draws one tile per ruined cell", () => {
  function tiles(cells: readonly string[]): THREE.Object3D[] {
    const found: THREE.Object3D[] = [];
    buildScarredGroundGroup(cells).traverse((child) => {
      if (child.name === SCAR_TILE_NAME) {
        found.push(child);
      }
    });
    return found;
  }

  it("draws nothing on an undamaged island", () => {
    expect(tiles([])).toHaveLength(0);
  });

  it("draws one tile per cell, centred on that cell", () => {
    const found = tiles(["0,0", "3,-2", "-4,5"]);
    expect(found).toHaveLength(3);
    const at = new Map(found.map((t) => [`${t.position.x},${t.position.z}`, t]));
    // Cell centres are offset half a cell from the grid index, so a tile placed at the raw
    // index would land a quarter-cell off — visible as a scar straddling four cells.
    expect(at.has("2,2")).toBe(true); // cellCenter(0, 0)
    expect(at.has("14,-6")).toBe(true); // cellCenter(3, -2)
    expect(at.has("-14,22")).toBe(true); // cellCenter(-4, 5)
  });

  it("collapses a duplicate cell rather than stacking two coplanar slabs on it", () => {
    expect(tiles(["7,7", "7,7", "7,7"])).toHaveLength(1);
  });

  it("lies on the island's own ground ladder, below the road stack", () => {
    // The scar shares the `worn` rung rather than inventing one — see `SCAR_TOP`.
    expect(SCAR_TOP).toBeCloseTo(SURFACE_Y + GROUND_DECAL_TOPS.worn, 10);
    // And it is under the road stack's LOWEST course, so if a road and a scar ever landed on
    // one cell (the session forbids it) the road would win rather than the two z-fighting.
    expect(SCAR_TOP).toBeLessThan(roadCourseTop(0));
  });

  it("did not move a rung to make room for itself", () => {
    // `groundDepth.test.ts` holds `GROUND_DECAL_TOPS` to a uniform ladder whose top stays
    // below 0.11, and `ROAD_BASE_RUNG` is derived from its LENGTH — so a sixth rung added
    // here would push every road course up. Pinned from this side too, because the failure
    // would surface in files this one has no other reason to touch.
    expect(Object.keys(GROUND_DECAL_TOPS)).toHaveLength(2);
    expect(Math.max(...Object.values(GROUND_DECAL_TOPS))).toBeLessThan(0.11);
  });

  it("beds the slab so only its top face shows, and pulls it toward the camera in depth", () => {
    const tile = tiles(["1,1"])[0] as THREE.Mesh;
    expect(tile).toBeDefined();
    // The box is centred BELOW the surface by half its thickness, so its sides are swallowed
    // by the ground and it reads as worn in rather than as a slab set down on the grass.
    expect(tile.position.y).toBeLessThan(SURFACE_Y);
    const material = tile.material as THREE.MeshStandardMaterial;
    expect(material.polygonOffset).toBe(true);
    expect(material.polygonOffsetFactor).toBeLessThan(0);
  });

  it("ignores a cell key that is not a cell, rather than drawing at NaN", () => {
    // A slab at NaN vanishes from the render and takes no error with it, so a malformed key
    // would read as "the seam is not wired" during a demo.
    expect(tiles(["", "not-a-cell", "4,"])).toHaveLength(0);
  });

  it("fills the whole cell, because the claim a scar makes is about the whole cell", () => {
    const size = sizeOf(buildScarredGroundGroup(["0,0"]));
    expect(size.x).toBeCloseTo(4, 6); // GRID_CELL
    expect(size.z).toBeCloseTo(4, 6);
  });
});

/**
 * **A RECLAIMED CELL LEAVES NOTHING BEHIND, AND THIS IS THE FILE THAT MEASURES IT.**
 *
 * Era one's art brief §3.5 called given-up ground *"the only state on the board with no way
 * back"* and the addendum reported that against `abandon.reclaim_cost_per_cell: 3` as an
 * unresolved contradiction (`2026-08-01-hard-winter-art-brief-addendum.md:261`). The reading
 * that would have saved the sentence is that the ground keeps a permanent SCAR even once the
 * cell is bought back, so *"no way back"* would be a claim about the picture rather than about
 * the mechanic. **It is not the case, and this block is why the claim can be made rather than
 * argued.**
 *
 * The whole seam is one set. `crisis-damage.ts` records a scar as a member of `ruined_cells`;
 * `clearRuinedCell` filters it out; `CitySurface` maps that array straight to the cell keys
 * `CityScene` hands this layer, and {@link buildScarredGroundGroup} draws one tile per key it is
 * given and nothing per key it is not. So a reclaim is not a state change on a scar, it is the
 * scar ceasing to exist, and the ground under it goes back to whatever the island authored.
 *
 * **Measured here rather than read off the source**, because the composition is where this could
 * break: either half could grow a residual state (a healed-scar tone, a set of cells that were
 * ever given up) and the other half would still look correct in review. Injected both ways
 * before this was written, `clearRuinedCell` returning its input unchanged and this layer
 * drawing a tile for a cell no longer in the set, and each fails below.
 */
describe("a cell bought back keeps no mark, so there is no scarred-but-reclaimed state", () => {
  /** The cell keys the layer actually draws, read off the group rather than off the input. */
  function drawn(cells: readonly string[]): string[] {
    const keys: string[] = [];
    buildScarredGroundGroup(cells).traverse((child) => {
      if (child.name === SCAR_TILE_NAME) {
        // `cellCenter` offsets half a cell, so this is the inverse of what the tile did.
        keys.push(`${(child.position.x - 2) / 4},${(child.position.z - 2) / 4}`);
      }
    });
    return keys.sort();
  }

  /** One winter's worth of given-up ground, folded the way a carry-back folds it. */
  const band = ["4,0", "4,1", "5,0", "5,1", "6,0"];
  const scarred = foldCrisisDamage(NO_CRISIS_DAMAGE, { buildings: [], cells: band });
  const groundOf = (damage: typeof scarred): readonly string[] =>
    damage.ruined_cells.map((record) => record.cell);

  it("draws the whole band while it is unpaid for", () => {
    // A floor first, so every assertion below is over a layer that was drawing something.
    expect(groundOf(scarred)).toHaveLength(band.length);
    expect(drawn(groundOf(scarred))).toEqual([...band].sort());
  });

  it("draws nothing at all once every cell is reclaimed", () => {
    let damage = scarred;
    for (const cell of band) {
      damage = clearRuinedCell(damage, cell);
    }
    expect(groundOf(damage)).toEqual([]);

    // Not "no tile" but NO GEOMETRY: a residual scar would most plausibly arrive as a fainter
    // slab or a hatch without one, and either would satisfy an assertion about tiles alone.
    const group = buildScarredGroundGroup(groundOf(damage));
    let meshes = 0;
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes += 1;
      }
    });
    expect(meshes, "something is still drawn over ground that was paid for").toBe(0);
    expect(materialsOf(group)).toEqual([]);
    expect(sizeOf(group).length()).toBe(0);
  });

  it("leaves the cells still owed for and only those, so a part-paid band is legible", () => {
    // The realistic case: a player who could afford three cells of five. What is on screen has
    // to be the two they still owe for, because that is the bill the panel is quoting them.
    let damage = scarred;
    for (const cell of ["4,0", "5,0", "6,0"]) {
      damage = clearRuinedCell(damage, cell);
    }
    expect(drawn(groundOf(damage))).toEqual(["4,1", "5,1"]);
  });

  it("says so in its own prop doc, so the next reader is not left to derive it", () => {
    // The tones are the state's, not the reclaim's: ground given up and ground given up during a
    // winter are one state (asserted below), and there is no third tone for ground bought back.
    // A reclaimed cell has no tone at all, which is the whole finding, and the only way to keep
    // that true is for it to have no entry anywhere.
    expect(Object.keys(WINTER_GROUND_TONES)).not.toContain("reclaimed");
  });
});

/**
 * **SPOILED GROUND, NOT ABSENT GROUND.**
 *
 * The team lead, on the crisis surface: *"the broken ground is too dark and jarrin[g]"*. The
 * scar was `0x4a4844`, a dead char, and against near-white winter snow that is not a strong
 * read but the LOUDEST read the scene can produce — which is why it looked like a hole in the
 * island rather than like damaged land.
 *
 * Both assertions below are about the pair of channels, because fixing one alone is how this
 * gets worse rather than better: raising the value narrows the tone gap, so the tone gap stops
 * being allowed to be the only thing carrying the state.
 */
describe("a scar reads as spoiled ground rather than as a hole in the island", () => {
  /** Relative luminance of an sRGB hex — the same formula `winterGround.test.ts` measures with. */
  function luminance(hex: number): number {
    const c = new THREE.Color(hex);
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  }

  /** Blue minus red: the cast, which is how a neutral is told from a tinted tone. */
  function cast(hex: number): number {
    return (hex & 0xff) - ((hex >> 16) & 0xff);
  }

  function saturation(hex: number): number {
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(hex).getHSL(hsl);
    return hsl.s;
  }

  it("is a mid-value ash rather than a near-black, measured against the ground it lies on", () => {
    // The two grounds a scar can lie on: era one's tussock while the weather is fair, and the
    // winter's lit snow while a crisis is on. Both read off their own authored tables, so a
    // re-toned island moves this assertion with it instead of leaving it describing the past.
    const tussock = luminance(ERA_ONE_TERRAIN.ground);
    const snow = 0.9; // WINTER_SCENE_TONES.SNOW_LIT, and `winterGround.test.ts` owns it
    const scar = luminance(SCAR_PLACEHOLDER_TONE);

    // STILL THE DARKEST THING ON THE GROUND — a scar that stopped being a step down would
    // stop being legible at all, which is the opposite failure and the easier one to ship.
    expect(scar).toBeLessThan(tussock);
    expect(tussock - scar).toBeGreaterThan(0.1);

    // ...and no longer at the far end of the range. The old char sat 0.835 below lit snow,
    // which is a wider gap than any two things on this island, and it is the number the lead
    // was looking at. The ceiling is what would fail if somebody put the char back.
    expect(snow - scar, "the scar is back at maximum contrast against snow").toBeLessThan(
      0.7,
    );

    // The value is doing the work and the SATURATION is what keeps it clear of the worn-earth
    // decals at a similar value: a scar is ash, not soil.
    expect(saturation(SCAR_PLACEHOLDER_TONE)).toBeLessThan(0.2);
    expect(saturation(ERA_ONE_TERRAIN.earth)).toBeGreaterThan(0.5);
    // Neutral, not tinted, so it borrows no meaning from the frost's blues or the fire's ochre.
    expect(Math.abs(cast(SCAR_PLACEHOLDER_TONE))).toBeLessThan(20);

    // And it is the island's own authored ash rather than a fifth tone invented for this state.
    expect(SCAR_PLACEHOLDER_TONE).toBe(ERA_ONE_PROP_TONES.ash);
  });

  it("is the SAME tone the crisis gives up ground in, so the thaw changes nothing", () => {
    /*
     * **THE HANDOFF, PINNED FROM THE ONE SIDE THAT CAN SEE BOTH TONES.**
     *
     * Ground given up during a winter and a scar standing after the thaw are ONE state at two
     * moments, drawn by two layers: `WinterGround.tsx` draws it while the crisis is on, and this
     * layer takes over the moment the winter's own layer stops (`CitySurface.tsx` unions the two
     * sets for exactly that reason). Two numbers for one state means the island changes colour
     * as the frost lifts, reporting a change that nothing made.
     *
     * It is asserted HERE and not in `winterGround.test.ts` because this is the only file that
     * has cause to import both tables, and because the winter's table cannot import this one:
     * `winterTones.ts` may not open `three`, which is why it carries the ash as a literal.
     *
     * That literal is also what makes the "too dark" claim above cover the crisis board. The
     * winter's snow is the harsher of the two backgrounds — near-white, so a near-black patch on
     * it is the widest contrast the scene can produce — and this equality is what stops the two
     * halves of the fix from drifting apart with only one of them guarded.
     */
    expect(WINTER_GROUND_TONES.abandoned).toBe(SCAR_PLACEHOLDER_TONE);
  });

  it("carries the state in a HATCH as well as in the tone, so it is not colour alone", () => {
    // INV-CRISIS-16: never hue alone. A flat slab in one tone is exactly that, and it is what
    // this layer shipped as — survivable-looking only because the tone was near-black, which is
    // the thing that just changed.
    const group = buildScarredGroundGroup(["0,0", "3,-2"]);
    const hatches: THREE.Object3D[] = [];
    group.traverse((child) => {
      if (child.name === SCAR_HATCH_NAME) {
        hatches.push(child);
      }
    });
    // One hatch per cell, and a floor under the bars so an empty group cannot satisfy this.
    expect(hatches).toHaveLength(2);
    for (const hatch of hatches) {
      expect(hatch.children.length, "the hatch has no bars in it").toBeGreaterThanOrEqual(
        5,
      );
      // At 45 degrees, which is the angle the 2D board already marks abandoned ground at.
      expect(hatch.rotation.y).toBeCloseTo(Math.PI / 4, 6);
    }

    // The bars are a VALUE STEP off the slab and not a second hue, so the hatch survives being
    // read in greyscale — which is the whole reason it counts as a second channel.
    const tones = new Set(colorsOf(group));
    expect(tones.size, "the hatch is the same tone as the slab under it").toBe(2);
    const [dark, light] = [...tones].sort((a, b) => luminance(a) - luminance(b)) as [
      number,
      number,
    ];
    expect(luminance(light) - luminance(dark)).toBeGreaterThan(0.04);
    for (const tone of tones) {
      expect(
        Math.abs(cast(tone)),
        "a hatch bar carries a hue the slab does not",
      ).toBeLessThan(20);
    }
  });

  it("keeps the hatch on the slab's own rung, so the layer still takes one rung", () => {
    // The bars are COPLANAR with the slab's top face on purpose: a raised hatch would need a
    // rung of its own, and `GROUND_DECAL_TOPS` is held to a two-rung ladder that the road stack
    // is derived from. A fixed polygon-offset winner is what makes coplanar safe here.
    const group = buildScarredGroundGroup(["0,0"]);
    const tops: number[] = [];
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      if (box) {
        tops.push(new THREE.Vector3().copy(box.max).applyMatrix4(worldMatrix(mesh)).y);
      }
    });
    expect(tops.length).toBeGreaterThanOrEqual(6);
    for (const top of tops) {
      expect(top).toBeCloseTo(SCAR_TOP, 6);
    }

    // ...and the hatch's own bias beats the slab's, so which one shows is decided once rather
    // than per pixel per frame.
    const biases = materialsOf(group).map(
      (m) => (m as THREE.MeshStandardMaterial).polygonOffsetFactor,
    );
    expect(Math.min(...biases)).toBeLessThan(Math.max(...biases));
    for (const bias of biases) {
      expect(bias).toBeLessThan(0);
    }
  });
});

/** World matrix for a node whose ancestors have not been updated by a renderer. */
function worldMatrix(node: THREE.Object3D): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  const chain: THREE.Object3D[] = [];
  for (let at: THREE.Object3D | null = node; at; at = at.parent) {
    chain.unshift(at);
  }
  for (const link of chain) {
    link.updateMatrix();
    matrix.multiply(link.matrix);
  }
  return matrix;
}
