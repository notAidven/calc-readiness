import { WINTER_FIRE_STATES } from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { FOOTPRINT_FILL, GRID_CELL, SEA_RADIUS } from "../worldLayout";
import { WATERLINE_Y } from "./StarterIsland";
import { HEARTH_RADIUS } from "./WinterGround";
import {
  buildHearth,
  buildSmokeColumn,
  buildSmokeWisp,
  COLUMN_HEIGHT,
  FLAME_MESH_NAME,
  FLAME_NAME,
  FUEL_NAME,
  FUEL_STEPS,
  RING_STONES,
  SMOKE_PUFF_NAME,
  updateFire,
  WISP_HEIGHT,
} from "./winterFire";
import {
  buildDrifts,
  buildFrozenLagoon,
  buildSnowCourse,
  buildTroddenPaths,
  DRIFT_MAX_H,
  facedMaterial,
  flatWinter,
} from "./winterScene";
import { buildSnowfall, SNOWFALL_BUDGET, updateSnowfall } from "./winterSnowfall";
import { WINTER_SCENE_TONES } from "./winterTones";

/**
 * **THE CONSTRAINTS EVERY CRISIS SCENE ASSET IS BUILT UNDER, swept over the built assets.**
 *
 * Four lights scene-wide and no post-processing, no textures and no environment map, everything
 * flat-shaded, and every mesh stating both shadow flags rather than leaving them at their
 * defaults. `winterGround.test.ts` owns the assembled LAYER — the ladder, the board states and
 * the emissive exemption; this file owns the assets themselves, so a builder used from a second
 * call site tomorrow is already covered.
 */

/** Every asset this batch builds, named, so the sweeps below derive their population. */
function everyAsset(): { name: string; object: THREE.Object3D }[] {
  return [
    { name: "snow course", object: buildSnowCourse(0.25) },
    { name: "drifts", object: buildDrifts(8 * FOOTPRINT_FILL, 8 * FOOTPRINT_FILL) },
    {
      name: "trodden paths",
      object: buildTroddenPaths(
        [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
        ],
        0.45,
      ),
    },
    { name: "frozen lagoon", object: buildFrozenLagoon(SEA_RADIUS, WATERLINE_Y) },
    // ONE HEARTH PER FIRE STATE, derived from the engine's own list rather than written out, so
    // the day a fifth state exists it is swept here before anybody remembers this file. The third
    // one — a spent hearth — is what the 2026-08-02 ruling made drawable at all.
    ...WINTER_FIRE_STATES.map((state) => ({
      name: `hearth (${state})`,
      object: buildHearth(GRID_CELL * 0.3, state, FUEL_STEPS) as THREE.Object3D,
    })),
    // The burning hearth in its LAST round as well, so the duration ramp's geometry is swept for
    // flat shading, textures and shadow flags exactly as the fresh one is rather than only at the
    // top of the ladder — which is the step nothing else in this file builds.
    {
      name: "hearth (burning out)",
      object: buildHearth(GRID_CELL * 0.3, "burning", 1) as THREE.Object3D,
    },
    { name: "smoke column", object: buildSmokeColumn(7, 315, HEARTH_RADIUS, FUEL_STEPS) },
    // AND THE COLUMN IN ITS LAST ROUND, for the same reason the hearth's last round is here: since
    // the 2026-08-02 ruling the column's height and puff count are a function of `rounds_left`, so
    // the short rung is geometry nothing else in this file builds and it owes the scene budget.
    {
      name: "smoke column (burning out)",
      object: buildSmokeColumn(7, 315, HEARTH_RADIUS, 1),
    },
    { name: "smoke wisp", object: buildSmokeWisp(7, 315, HEARTH_RADIUS) },
  ];
}

function meshesOf(object: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      found.push(child as THREE.Mesh);
    }
  });
  return found;
}

function materialsOf(mesh: THREE.Mesh): THREE.MeshStandardMaterial[] {
  return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(
    (m) => m as THREE.MeshStandardMaterial,
  );
}

describe("every crisis asset obeys the scene budget", () => {
  it("sweeps a derived population of every builder, with a floor", () => {
    const assets = everyAsset();
    // A floor, because every sweep below iterates this list and a shortened one would pass by
    // not looking. Nine builders across the ground, ice, hearth and smoke assets — the hearth
    // contributes one per fire state, so the floor moves with the union rather than being a digit
    // somebody has to remember to raise.
    expect(assets.length).toBeGreaterThanOrEqual(7 + WINTER_FIRE_STATES.length);
    // ...and every state really is in it, which is what stops the line above being met by six
    // ground builders and three copies of one hearth. A superset rather than an equality: the
    // burning hearth is also built at the bottom of its fuel ladder, which is a step rather than a
    // state, and the claim here is about the states being covered.
    const hearths = new Set(
      assets.filter((a) => a.name.startsWith("hearth")).map((a) => a.name),
    );
    for (const state of WINTER_FIRE_STATES) {
      expect(hearths, state).toContain(`hearth (${state})`);
    }
    expect(hearths.size).toBeGreaterThanOrEqual(WINTER_FIRE_STATES.length);
    for (const asset of assets) {
      expect(meshesOf(asset.object).length, asset.name).toBeGreaterThan(0);
    }
    // ...and the population is big: an assertion over four boxes would be worth little.
    // Measured at 122 meshes across the seven builders.
    expect(assets.reduce((n, a) => n + meshesOf(a.object).length, 0)).toBeGreaterThan(100);
  });

  it("adds no light of any kind, because the budget is the scene's four", () => {
    for (const { name, object } of everyAsset()) {
      let lights = 0;
      object.traverse((child) => {
        if ((child as THREE.Light).isLight) {
          lights += 1;
        }
      });
      expect(lights, name).toBe(0);
    }
  });

  it("uses no texture and no environment map anywhere", () => {
    // There are none in this scene, and one would have to be loaded from somewhere: a texture
    // slot with anything in it is a wiring mistake rather than an art decision.
    for (const { name, object } of everyAsset()) {
      for (const mesh of meshesOf(object)) {
        for (const material of materialsOf(mesh)) {
          for (const slot of [
            "map",
            "normalMap",
            "roughnessMap",
            "envMap",
            "aoMap",
          ] as const) {
            expect(material[slot], `${name} ${mesh.name} ${slot}`).toBeFalsy();
          }
        }
      }
    }
  });

  it("flat-shades everything and keeps metalness at zero", () => {
    for (const { name, object } of everyAsset()) {
      for (const mesh of meshesOf(object)) {
        for (const material of materialsOf(mesh)) {
          expect(material.flatShading, `${name} ${mesh.name}`).toBe(true);
          expect(material.metalness, `${name} ${mesh.name}`).toBe(0);
        }
      }
    }
  });

  it("never sets vertexColors over geometry that has no colour attribute", () => {
    // The black-out hazard. `winterFrost.test.ts` holds the buildings' half and
    // `winterCrisisScene.browser.test.tsx` holds the pixel reproduction.
    let faced = 0;
    for (const { name, object } of everyAsset()) {
      for (const mesh of meshesOf(object)) {
        for (const material of materialsOf(mesh)) {
          if (material.vertexColors) {
            faced += 1;
            expect(
              mesh.geometry.getAttribute("color"),
              `${name} ${mesh.name}`,
            ).toBeDefined();
          }
        }
      }
    }
    // A floor, because "none is broken" holds trivially over assets with no faceted material.
    expect(faced).toBeGreaterThanOrEqual(2);
  });

  /**
   * **A GROUND PLANE WOUND THE WRONG WAY IS INVISIBLE AND PASSES EVERYTHING ELSE.**
   *
   * Both hand-built discs in this batch — the snow course and the lagoon's ice sheet — shipped
   * wound face-DOWN in a first pass and were back-face culled out of every frame. Nothing
   * detected it: the meshes were in the scene, the materials compiled, the triangles were
   * submitted, the counts were right, the colour attributes were present. Only a photograph
   * showed the island still green under a floating collar of shove ice.
   *
   * So the winding is measured, per triangle, on every asset that presents an up-facing
   * surface. Written down as a population rather than a spot check, because the two that were
   * wrong were the only two built by hand, and the next hand-built surface will be too.
   */
  it("winds every up-facing surface so its front face is the one the camera sees", () => {
    const upFacing: { name: string; object: THREE.Object3D }[] = [
      { name: "snow course", object: buildSnowCourse(0.25) },
      { name: "frozen lagoon", object: buildFrozenLagoon(SEA_RADIUS, WATERLINE_Y) },
    ];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    let checked = 0;

    for (const { name, object } of upFacing) {
      for (const mesh of meshesOf(object)) {
        const material = materialsOf(mesh)[0] as THREE.MeshStandardMaterial;
        // A double-sided surface is visible either way and owes nothing here; nothing in this
        // batch is one, and this is stated so the exemption is explicit rather than implied.
        if (material.side !== THREE.FrontSide) {
          continue;
        }
        const position = mesh.geometry.getAttribute("position");
        if (mesh.geometry.index || position.count % 3 !== 0) {
          continue;
        }
        let downward = 0;
        for (let f = 0; f < position.count; f += 3) {
          a.fromBufferAttribute(position as THREE.BufferAttribute, f);
          b.fromBufferAttribute(position as THREE.BufferAttribute, f + 1);
          c.fromBufferAttribute(position as THREE.BufferAttribute, f + 2);
          const normalY = b.sub(a).cross(c.sub(a)).normalize().y;
          // Only the near-horizontal faces are up-facing surfaces; a shove-ice plate is a box
          // and has walls, so a vertical face is not a defect.
          if (normalY < -0.5) {
            downward += 1;
          }
          checked += 1;
        }
        expect(downward, `${name} / ${mesh.name}: ${downward} faces point down`).toBe(0);
      }
    }
    // A floor, because "no face points down" is trivially true of no faces at all — which is
    // also what an empty geometry would report.
    expect(checked).toBeGreaterThan(2000);
  });

  it("refuses to build a faced material for geometry with no attribute at all", () => {
    // Structural rather than careful: the hazard is unrepresentable, not merely documented.
    expect(() => facedMaterial(new THREE.BoxGeometry(1, 1, 1))).toThrow(
      /color.*attribute/i,
    );
    const geometry = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        new Float32Array(geometry.getAttribute("position").count * 3).fill(1),
        3,
      ),
    );
    expect(facedMaterial(geometry).vertexColors).toBe(true);
  });
});

/**
 * **THE SHADOW FLAGS, AS A NAMED EXCEPTION RATHER THAN AS A BLANKET.**
 *
 * The house rule is that every mesh states `castShadow` and `receiveShadow`. Both default to
 * `false`, so "stated" and "forgotten" are indistinguishable from outside — what IS checkable is
 * the behaviour the rule is about: a mesh participates in the shadow system unless there is a
 * reason it cannot.
 *
 * Three meshes genuinely cannot, and they are named with their reasons. A member that does not
 * owe the property and a member that forgot it look identical from inside a guard, so the list
 * is asserted in BOTH directions: an entry that no longer appears in any asset fails, and a
 * listed mesh that starts participating fails.
 */
const SHADOWLESS: readonly { readonly name: string; readonly why: string }[] = [
  {
    name: SMOKE_PUFF_NAME,
    why: "a shadow-casting cloud of transparent balls reads as a bug, and one that took a shadow would read as solid",
  },
  {
    name: FLAME_MESH_NAME,
    why: "an unlit bright face is the only way to say hot without a fifth lamp; a shadow across it would make it a lit surface again",
  },
];

describe("every mesh takes part in the shadow system, or is named as unable to", () => {
  function allMeshes(): THREE.Mesh[] {
    return everyAsset().flatMap((asset) => meshesOf(asset.object));
  }

  it("gives every other mesh at least one of the two flags", () => {
    const exempt = new Set(SHADOWLESS.map((entry) => entry.name));
    const swept = allMeshes().filter((mesh) => !exempt.has(mesh.name));
    // Floors on the swept half, so the exemption cannot be what emptied it. Measured at 108
    // of the 122 meshes, so the exemption covers 14 and the sweep covers the rest.
    expect(swept.length).toBeGreaterThan(90);
    for (const mesh of swept) {
      expect(
        mesh.castShadow || mesh.receiveShadow,
        `${mesh.name || "(unnamed)"} neither casts nor receives`,
      ).toBe(true);
    }
  });

  it("holds the exception list to both directions", () => {
    const meshes = allMeshes();
    for (const entry of SHADOWLESS) {
      const named = meshes.filter((mesh) => mesh.name === entry.name);
      // Direction one: a declared exception that no longer exists is excusing nothing, and it
      // fails here rather than sitting in the list for good.
      expect(
        named.length,
        `${entry.name} is a declared exception that still exists`,
      ).toBeGreaterThan(0);
      // Direction two: a listed mesh that has quietly started taking part is no longer
      // described by its own excuse, so the excuse fails rather than going on covering it.
      for (const mesh of named) {
        expect(
          mesh.castShadow || mesh.receiveShadow,
          `${entry.name} has quietly started taking part: ${entry.why}`,
        ).toBe(false);
      }
      expect(entry.why.length).toBeGreaterThan(40);
    }
    // And the list has not swallowed the population.
    const exempt = new Set(SHADOWLESS.map((entry) => entry.name));
    expect(meshes.filter((mesh) => exempt.has(mesh.name)).length).toBeLessThan(
      meshes.length / 4,
    );
  });
});

describe("drifts are sized so the building still reads as a building", () => {
  it("never rises above the measured cap, on any wall", () => {
    const drifts = buildDrifts(8 * FOOTPRINT_FILL, 8 * FOOTPRINT_FILL);
    const height = new THREE.Box3().setFromObject(drifts).getSize(new THREE.Vector3()).y;
    // Plus the 0.04 seat that beds them into the snow.
    expect(height).toBeLessThanOrEqual(DRIFT_MAX_H + 0.05);
    expect(height).toBeGreaterThan(DRIFT_MAX_H * 0.5);
  });

  it("banks OUTWARD past the wall, so the snow meets the building rather than sitting in it", () => {
    const span = 8 * FOOTPRINT_FILL;
    const drifts = buildDrifts(span, span);
    const reach = new THREE.Box3().setFromObject(drifts).getSize(new THREE.Vector3()).x;
    expect(reach).toBeGreaterThan(span);
  });

  it("closes the corners, which a heading between the axes would otherwise show hollow", () => {
    // Four walls plus two corner wedges. The wedges are the reason the count is six.
    expect(meshesOf(buildDrifts(8, 8))).toHaveLength(6);
  });

  it("scales with the footprint, so a small lot does not wear a big lot's snow", () => {
    const small = new THREE.Box3()
      .setFromObject(buildDrifts(4 * FOOTPRINT_FILL, 4 * FOOTPRINT_FILL))
      .getSize(new THREE.Vector3());
    const large = new THREE.Box3()
      .setFromObject(buildDrifts(8 * FOOTPRINT_FILL, 8 * FOOTPRINT_FILL))
      .getSize(new THREE.Vector3());
    expect(large.x).toBeGreaterThan(small.x);
    // ...but the HEIGHT does not, because the cap is a measurement about the camera and not
    // about the plot. It is not bit-identical: the crest notch is hashed off the bank's own
    // length, so a longer wall notches at slightly different places. Within 3%.
    expect(Math.abs(large.y - small.y) / large.y).toBeLessThan(0.03);
    expect(large.y).toBeLessThanOrEqual(DRIFT_MAX_H + 0.05);
    expect(small.y).toBeLessThanOrEqual(DRIFT_MAX_H + 0.05);
  });
});

describe("the smoke column marks the fire without pretending to be lit", () => {
  it("rises to the authored height and leans downwind", () => {
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, FUEL_STEPS);
    const box = new THREE.Box3().setFromObject(column);
    expect(box.max.y).toBeGreaterThan(COLUMN_HEIGHT);
    // Downwind at 315°: cos is positive and sin is negative, so the stack drifts +x and -z.
    const top = column.children[column.children.length - 1] as THREE.Object3D;
    expect(top.position.x).toBeGreaterThan(1);
    expect(top.position.z).toBeLessThan(-1);
  });

  it("puts its mass at the top, where it is read against the sky", () => {
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, FUEL_STEPS);
    const radii = column.children.map(
      (puff) =>
        new THREE.Box3().setFromObject(puff).getSize(new THREE.Vector3()).x / puff.scale.x,
    );
    expect(radii[radii.length - 1] as number).toBeGreaterThan((radii[0] as number) * 2.5);
  });

  /**
   * **THE WISP IS NOT A SMALL COLUMN, and the two requirements pull in opposite directions.** The
   * column exists to be findable over the settlement from the far rim; the wisp is over a fire that
   * is OUT, so it must be visible up close and lost at zoom-out. Both halves are measured against
   * the column rather than against a number of their own, with margins, so a retune of the column
   * carries the wisp with it and neither can drift into the other's job.
   */
  it("keeps the wisp far shorter, thinner and fainter than a live fire's column", () => {
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, FUEL_STEPS);
    const wisp = buildSmokeWisp(3, 315, HEARTH_RADIUS);
    const heightOf = (group: THREE.Object3D) => new THREE.Box3().setFromObject(group).max.y;

    // A fifth of the column at most, which is the plate's own proportion (a seventh) with room.
    expect(heightOf(wisp)).toBeLessThan(heightOf(column) * 0.2);
    expect(WISP_HEIGHT).toBeLessThan(COLUMN_HEIGHT / 5);
    // ...and it is still THERE. A wisp of nothing would satisfy every line above.
    expect(heightOf(wisp)).toBeGreaterThan(1);
    expect(wisp.children.length).toBeGreaterThanOrEqual(3);

    const widest = (group: THREE.Object3D) =>
      Math.max(
        ...group.children.map(
          (puff) => new THREE.Box3().setFromObject(puff).getSize(new THREE.Vector3()).x,
        ),
      );
    expect(widest(wisp)).toBeLessThan(widest(column) * 0.35);

    // FAINTER, by a margin rather than by a hair: the column's own floor is 0.4 and every puff
    // here is under half of that.
    const opacityOf = (group: THREE.Object3D) =>
      group.children.map(
        (puff) => ((puff as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity,
      );
    expect(Math.max(...opacityOf(wisp))).toBeLessThan(
      Math.min(...opacityOf(column)) - 0.05,
    );
    for (const opacity of opacityOf(wisp)) {
      // Visible, though: a wisp at zero opacity is "or none at all" implemented as a lie, since
      // the meshes would still be in the scene and in every count.
      expect(opacity).toBeGreaterThan(0.1);
    }

    // AND THE FRAME LOOP LEAVES IT ALONE, which is what its name buys: `WinterGround`'s loop
    // drives `updateFire` for a `SMOKE_COLUMN_NAME` child and finds none here, so a dead fire
    // does not billow like a live one.
    expect(wisp.name).not.toBe(column.name);
    expect(wisp.getObjectByName(column.name)).toBeUndefined();
  });

  /**
   * **AND IT IS STILL NOT A SMALL COLUMN AT THE ONE RUNG WHERE THAT GOT HARD.**
   *
   * The test above compares the wisp with a WHOLE-FUEL column, which is the easy comparison and was
   * the only one there was: every column had the same height. The 2026-08-02 ruling made the
   * column's reach the fire's duration, so the pair that now decides whether a spent hearth reads
   * as spent is the wisp against the column of a fire in its LAST round — the shortest living plume
   * the layer can draw. Measured against that one rather than against the tallest, because a margin
   * held at the top of a ladder says nothing about the bottom of it.
   *
   * This is the assertion that sets the floor under `COLUMN_SHORTEST`: taking the share low enough
   * to make the duration read further would eventually bring a burning fire's column down onto a
   * dead one's wisp, and that is the failure it has to be traded against rather than a preference.
   */
  it("keeps the wisp clearly under the column of a fire in its very last round", () => {
    const shortest = buildSmokeColumn(3, 315, HEARTH_RADIUS, 1);
    const wisp = buildSmokeWisp(3, 315, HEARTH_RADIUS);
    const heightOf = (group: THREE.Object3D) => new THREE.Box3().setFromObject(group).max.y;

    // A FLOOR ON THE SUBJECT FIRST: the last rung is still a real column with puffs in it, so what
    // follows is a comparison between two objects rather than a wisp beating an empty group.
    expect(shortest.children.length).toBeGreaterThanOrEqual(4);
    expect(heightOf(shortest)).toBeGreaterThan(heightOf(wisp) * 2);

    // THINNER AND FAINTER AT THE LAST RUNG TOO. The margins are looser than the whole-fuel pair's
    // above, deliberately: the short column really is nearer the wisp, and pretending otherwise is
    // how a guard ends up asserting the tall column twice.
    const widest = (group: THREE.Object3D) =>
      Math.max(
        ...group.children.map(
          (puff) => new THREE.Box3().setFromObject(puff).getSize(new THREE.Vector3()).x,
        ),
      );
    expect(widest(wisp)).toBeLessThan(widest(shortest) * 0.6);
    const opacityOf = (group: THREE.Object3D) =>
      group.children.map(
        (puff) => ((puff as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity,
      );
    expect(Math.max(...opacityOf(wisp))).toBeLessThan(
      Math.min(...opacityOf(shortest)) - 0.05,
    );
  });

  /**
   * **THE LOWEST PUFF WAS INSIDE THE FLAME, AND EVERY ASSERTION IN THIS FILE PASSED OVER IT.**
   *
   * `COLUMN_BASE` was the world constant 2.6 with the comment *"where the lowest puff sits, clear of
   * the flame tip"*. The hearth ships at `GRID_CELL * 0.3` = 1.2u and its core tongue reaches
   * `1.94 * radius` = 2.33u, so a puff centred at 2.6 with a radius of 0.9 had its underside at 1.9
   * — 0.43u **below** the tip, on the same axis, in `SMOKE_DARK` at 0.92 opacity. The first thing
   * drawn over a burning hearth was therefore a near-opaque dark lump covering the top of its own
   * flame, which is most of why the fire read grey rather than orange in
   * `docs/design-refs/hard-winter-crisis/`.
   *
   * Nothing here could see it, because every assertion about the column was about the column and
   * every assertion about the hearth was about the hearth. The relation between two assets is a
   * third claim and it needs its own test.
   *
   * BOTH ASSETS ARE MEASURED AS BUILT rather than reasoned about: the flame's tip comes off the box
   * of the group `buildHearth` actually produced, so a retuned tongue moves the requirement, and the
   * column is measured again after `updateFire` because the flame breathes up to 17% taller and the
   * puffs recycle to the floor — a clearance that only holds at rest is a clearance that fails in
   * the one state a player watches.
   */
  it("keeps every puff clear of the flame it rises from, at rest and over a recycle", () => {
    const hearth = buildHearth(HEARTH_RADIUS, "burning", FUEL_STEPS);
    const flame = hearth.getObjectByName(FLAME_NAME) as THREE.Object3D;
    expect(flame, "the hearth built no flame, so there is nothing to clear").toBeDefined();
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, FUEL_STEPS);
    const tipOf = () => new THREE.Box3().setFromObject(flame).max.y;
    const lowestOf = () =>
      Math.min(
        ...column.children.map((puff) => new THREE.Box3().setFromObject(puff).min.y),
      );

    // A FLOOR FIRST: there is really a flame with height in it, so the clearance below is about
    // two objects rather than about an empty group at the origin.
    expect(tipOf()).toBeGreaterThan(HEARTH_RADIUS);
    expect(column.children.length).toBeGreaterThan(3);

    expect(lowestOf(), "the lowest puff sits inside the flame at rest").toBeGreaterThan(
      tipOf(),
    );
    for (const t of [0, 0.7, 3.4, 11, 137, 1000]) {
      updateFire(hearth, column, t);
      expect(lowestOf(), `the lowest puff sits inside the flame at t=${t}`).toBeGreaterThan(
        tipOf(),
      );
    }
  });

  /**
   * And the wisp clears the RING, which is what a spent hearth has instead of a flame.
   *
   * Its base read `COLUMN_BASE * 0.62` — a fraction of the burning column's own floor, so it was
   * derived from a number about a flame this hearth does not have, and from a radius neither
   * constant could see. What it has to rise out of is nine stones standing up to 1.07 of the
   * radius.
   */
  it("keeps the wisp clear of the spent ring it rises from", () => {
    const spent = buildHearth(HEARTH_RADIUS, "spent", 1);
    const wisp = buildSmokeWisp(3, 315, HEARTH_RADIUS);
    const ring = new THREE.Box3().setFromObject(spent).max.y;
    expect(ring, "the spent hearth has no ring to clear").toBeGreaterThan(
      HEARTH_RADIUS / 2,
    );
    const lowest = Math.min(
      ...wisp.children.map((puff) => new THREE.Box3().setFromObject(puff).min.y),
    );
    expect(lowest, "the wisp's lowest puff is inside the stones").toBeGreaterThan(ring);
  });

  it("thins out with height and never reaches full transparency", () => {
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, FUEL_STEPS);
    const opacities = column.children.map(
      (puff) => ((puff as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity,
    );
    expect(opacities[0] as number).toBeGreaterThan(
      opacities[opacities.length - 1] as number,
    );
    for (const opacity of opacities) {
      expect(opacity).toBeGreaterThan(0.4);
      expect(opacity).toBeLessThanOrEqual(1);
    }
  });

  it("holds the column inside its own footprint over a whole recycle, so it cannot walk away", () => {
    // The drift is derived from `t` rather than integrated, so this is also the check that a
    // long session does not accumulate: the same bound has to hold at t = 0 and at t = 400.
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, FUEL_STEPS);
    const hearth = buildHearth(GRID_CELL * 0.3, "burning", FUEL_STEPS);
    for (const t of [0, 1, 7.5, 40, 400]) {
      updateFire(hearth, column, t);
      const box = new THREE.Box3().setFromObject(column);
      expect(box.max.y, `t=${t}`).toBeLessThan(COLUMN_HEIGHT + 12);
      expect(box.min.y, `t=${t}`).toBeGreaterThan(-2);
      expect(Math.hypot(box.max.x, box.max.z), `t=${t}`).toBeLessThan(20);
    }
  });

  it("jitters the flame's scale and nothing else in the scene", () => {
    const hearth = buildHearth(GRID_CELL * 0.3, "burning", FUEL_STEPS);
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, FUEL_STEPS);
    const flame = hearth.getObjectByName("winter-flame") as THREE.Object3D;
    updateFire(hearth, column, 0.4);
    const first = flame.scale.clone();
    updateFire(hearth, column, 0.9);
    expect(flame.scale.equals(first)).toBe(false);
    // Bounded: a flame that scaled past this would poke out of its own stone ring.
    for (const t of [0, 0.3, 1.7, 12, 400]) {
      updateFire(hearth, column, t);
      expect(flame.scale.y).toBeGreaterThan(0.8);
      expect(flame.scale.y).toBeLessThan(1.2);
    }
  });

  it("has nothing lit about a hearth that never caught, or one that has burnt out", () => {
    for (const state of WINTER_FIRE_STATES.filter((s) => s !== "burning")) {
      const out = buildHearth(GRID_CELL * 0.3, state, FUEL_STEPS);
      expect(out.getObjectByName("winter-flame"), state).toBeUndefined();
      expect(
        meshesOf(out).filter((mesh) => mesh.name === FLAME_MESH_NAME),
        state,
      ).toHaveLength(0);
      // ...and it is still a laid hearth rather than nothing: the board has to be able to report
      // a declaration that bought nothing, and a fire that did its work and is done.
      expect(meshesOf(out).length, state).toBeGreaterThanOrEqual(9);
    }
  });

  /**
   * **THE SAME HEARTH LATER, AND NOT A DIFFERENT OBJECT.** The brief's requirement for the spent
   * state is two changes at once and nothing else: *"the stones darkening AND the ground
   * reverting"*, with the ring *"still a complete ring of nine laid stones: darkened, not
   * collapsed, scattered or broken"*. So the geometry is asserted IDENTICAL and the tones asserted
   * different — which is the only way to tell "the same hearth in a later state" from a second
   * object that happens to stand on the same cell.
   *
   * The ground half of it is not this file's: a spent fire wards nothing, so the ochre reverts
   * through the engine (`hard-winter-spent-fire.test.ts`) and is photographed in
   * `winterSpentHearth.browser.test.tsx`.
   */
  it("draws a spent hearth as the same stones, darkened, with its fuel charred", () => {
    const radius = GRID_CELL * 0.3;
    const burning = buildHearth(radius, "burning", FUEL_STEPS);
    const spent = buildHearth(radius, "spent", FUEL_STEPS);
    const cold = buildHearth(radius, "never_caught", FUEL_STEPS);
    // The burning hearth in its LAST round, which is the step the spent one has to be continuous
    // with. Its `roundsLeft` is deliberately the bottom of the ladder while the spent hearth's is
    // the top, because a spent hearth does not read `roundsLeft` at all.
    const burningOut = buildHearth(radius, "burning", 1);

    // Same ring, stone for stone: nine boxes at the same nine positions and the same nine sizes.
    const ringOf = (hearth: THREE.Group) =>
      meshesOf(hearth)
        .filter((mesh) => mesh.name !== FUEL_NAME && mesh.name !== FLAME_MESH_NAME)
        .map((mesh) => ({
          at: mesh.position
            .toArray()
            .map((n) => n.toFixed(6))
            .join(),
          size: new THREE.Box3()
            .setFromBufferAttribute(
              mesh.geometry.getAttribute("position") as THREE.BufferAttribute,
            )
            .getSize(new THREE.Vector3())
            .toArray()
            .map((n) => n.toFixed(6))
            .join(),
        }));
    expect(ringOf(spent).length, "the spent ring lost a stone").toBe(RING_STONES);
    expect(ringOf(spent)).toEqual(ringOf(burning));
    expect(ringOf(spent)).toEqual(ringOf(cold));

    // ...and every tone in it is DARKER than the same stone on a hearth that is or was never lit,
    // by a margin. The margin is what stops this passing on two tones a player cannot tell apart:
    // it is a fifth of the range, and `STONE_SPENT` against `STONE` is 0.24 of it.
    const luminance = (hex: number): number =>
      (0.2126 * ((hex >> 16) & 0xff) +
        0.7152 * ((hex >> 8) & 0xff) +
        0.0722 * (hex & 0xff)) /
      255;
    const stoneTones = (hearth: THREE.Group) =>
      new Set(
        meshesOf(hearth)
          .filter((mesh) => mesh.name !== FUEL_NAME && mesh.name !== FLAME_MESH_NAME)
          .map((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex()),
      );
    const litStones = [...stoneTones(burning)];
    const spentStones = [...stoneTones(spent)];
    expect(litStones.length).toBe(2);
    expect(spentStones.length).toBe(2);
    expect([...stoneTones(cold)]).toEqual(litStones);
    // THE TWO RANGES DO NOT OVERLAP: every stone on a spent hearth is darker than every stone on
    // a hearth that is or was never lit, which is stronger than comparing the pairs off and is
    // what "gone dark" means when the ring alternates two tones. The MARGIN is what stops it
    // passing on two tones nobody could tell apart — the closest pair here, `STONE_SPENT` against
    // `STONE_DARK`, measures 0.141 in relative luminance, and like-for-like they are 0.28 and 0.24
    // — and the injection that proves the margin bites is toning the spent ring in `STONE` /
    // `STONE_DARK`, which reports 0 against it.
    const DARKER_BY = 0.1;
    expect(
      Math.min(...litStones.map(luminance)) - Math.max(...spentStones.map(luminance)),
      `${spentStones.map((h) => `#${h.toString(16)}`)} against ${litStones.map((h) => `#${h.toString(16)}`)}`,
    ).toBeGreaterThan(DARKER_BY);

    // The fuel is CHARRED THROUGH, which is what the brief spends its one hex on, and it is the
    // half that tells a spent hearth from one that never caught at a glance.
    //
    // It is also where this state meets #407's fuel ladder, and the two agree: a spent hearth
    // stands at the BOTTOM of that ladder, so what is left of its stack is the one log the last
    // burning frame had, charred. Posing it at the top instead would make the stack GROW at the
    // moment the fire went out, which is the incoherence this asserts against — a hearth that never
    // caught keeps the whole stack, because it burnt nothing.
    const fuelTones = (hearth: THREE.Group) =>
      meshesOf(hearth)
        .filter((mesh) => mesh.name === FUEL_NAME)
        .map((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex());
    expect(fuelTones(spent).length).toBeLessThan(fuelTones(cold).length);
    expect(fuelTones(spent).length).toBe(fuelTones(burningOut).length);
    expect(fuelTones(cold).length).toBe(fuelTones(burning).length);
    expect(new Set(fuelTones(spent))).toEqual(new Set([WINTER_SCENE_TONES.CHAR]));
    expect(fuelTones(cold)).not.toContain(WINTER_SCENE_TONES.CHAR);
  });
});

describe("the falling snow is seeded, bounded and pure in t", () => {
  it("builds the same field twice, so a reload does not reshuffle the weather", () => {
    const a = buildSnowfall();
    const b = buildSnowfall();
    const first = (group: THREE.Object3D) =>
      (group.children[0] as THREE.Points).geometry.getAttribute("position").array;
    expect(Array.from(first(a).slice(0, 60))).toEqual(Array.from(first(b).slice(0, 60)));
  });

  it("spends the authored point budget across two layers and no more", () => {
    const field = buildSnowfall();
    expect(field.children).toHaveLength(2);
    const total = field.children.reduce(
      (n, layer) => n + (layer as THREE.Points).geometry.getAttribute("position").count,
      0,
    );
    expect(total).toBe(SNOWFALL_BUDGET);
  });

  it("uses no sprite texture, because a round flake would need one", () => {
    for (const layer of buildSnowfall().children) {
      const material = (layer as THREE.Points).material as THREE.PointsMaterial;
      expect(material.map).toBeFalsy();
      expect(material.alphaMap).toBeFalsy();
      // Near flakes big, far flakes small, which is the only depth cue a point has.
      expect(material.sizeAttenuation).toBe(true);
      // Flakes must not occlude each other into grey blocks, and far ones die with the sea.
      expect(material.depthWrite).toBe(false);
      expect(material.fog).toBe(true);
    }
  });

  it("makes the sky layer DARKER than the overcast sky it is read against", () => {
    // The whole point of the second layer: a pale flake against a grey-white sky has no value
    // left to spend, so the sky layer has to go the other way.
    const [near, sky] = buildSnowfall().children as [THREE.Points, THREE.Points];
    const luminance = (points: THREE.Points) => {
      const c = (points.material as THREE.PointsMaterial).color;
      return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
    };
    const skyTone = new THREE.Color(0xdce0de);
    expect(luminance(sky)).toBeLessThan(
      skyTone.r * 0.2126 + skyTone.g * 0.7152 + skyTone.b * 0.0722,
    );
    expect(luminance(near)).toBeGreaterThan(luminance(sky));
  });

  it("keeps every flake inside the volume however long the crisis runs", () => {
    // Position is a pure function of `t`, so nothing accumulates and the bound at t = 4000 is
    // the bound at t = 0. A field that drifted would empty one side of the island over a long
    // session, which is exactly the defect nobody would see in a short test.
    const field = buildSnowfall();
    for (const t of [0, 0.5, 13, 900, 4000]) {
      updateSnowfall(field, t, { x: 6, z: -4 });
      for (const layer of field.children) {
        const position = (layer as THREE.Points).geometry.getAttribute("position");
        for (let i = 0; i < position.count; i += 37) {
          const y = position.getY(i);
          expect(y, `t=${t}`).toBeGreaterThanOrEqual(0);
          expect(y, `t=${t}`).toBeLessThanOrEqual(26);
          expect(Math.hypot(position.getX(i), position.getZ(i)), `t=${t}`).toBeLessThan(37);
        }
      }
    }
  });

  it("rides with the camera target, so density does not thin out under a pan", () => {
    const field = buildSnowfall();
    updateSnowfall(field, 1, { x: 12, z: -9 });
    expect(field.position.x).toBe(12);
    expect(field.position.z).toBe(-9);
    // The volume is not frustum-culled against its build-time bounds, which would drop the
    // whole field the moment it moved.
    for (const layer of field.children) {
      expect(layer.frustumCulled).toBe(false);
    }
  });

  it("holds a still frame under reduced motion rather than disappearing", () => {
    // The caller passes a fixed `t`, so the field is a photograph of falling snow. A layer that
    // needed motion to exist would leave the crisis with no weather for anyone who asked for
    // less of it.
    const field = buildSnowfall();
    updateSnowfall(field, 0, { x: 0, z: 0 });
    const before = Array.from(
      (field.children[0] as THREE.Points).geometry.getAttribute("position").array,
    );
    updateSnowfall(field, 0, { x: 0, z: 0 });
    const after = Array.from(
      (field.children[0] as THREE.Points).geometry.getAttribute("position").array,
    );
    expect(after).toEqual(before);
    expect(before.some((value) => value !== 0)).toBe(true);
  });
});

describe("the house material helper is the house rule", () => {
  it("flat-shades and de-metals by default, and lets a caller override the rest", () => {
    const plain = flatWinter();
    expect(plain.flatShading).toBe(true);
    expect(plain.metalness).toBe(0);
    expect(plain.roughness).toBeGreaterThan(0.9);
    expect(flatWinter({ roughness: 1 }).roughness).toBe(1);
  });
});
