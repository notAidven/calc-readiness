import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
// Type-only: a VALUE import of `three` loads a second runtime copy alongside the one
// `Roads.tsx` uses, so the wash is found by three's own `isMesh` flag below.
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  eraCityLayout,
  eraLandDemand,
  eraLandRadius,
  eraSeaRadius,
  ISLAND_GROWTH_CEILING,
} from "../islandLand";
import { roadSurfacing } from "../roadSurfacing";
import { type CityLayout, computeCityLayout, SURFACE_Y } from "../worldLayout";
import { depthResolutionAt, maxViewDistance, VILLAGE_CAMERA } from "./orbitCamera";
import {
  buildRoadsGroup,
  ROAD_HIGHLIGHT_NAME,
  roadStackTop,
  roadSurfaceTops,
} from "./Roads";
import { GROUND_DECAL_STEP, GROUND_DECAL_TOPS } from "./StarterIsland";

/**
 * The camera's depth range vs. the road layer's stacked surfaces.
 *
 * THE BUG THIS PINS: the village camera shipped with three's default `near = 0.1`
 * against a far plane in the low thousands. Perspective depth resolution goes as
 * `distance² × (1/near - 1/far)`, so at full zoom-out one depth step was ~0.039
 * world units — wider than the ~0.02u gap between the road curb's top face and the
 * asphalt's. The two surfaces then swapped per-pixel and the road network read as
 * overlapping, twitching slabs. Zoomed in the same geometry was fine, which is what
 * made it look like a road bug rather than a camera one.
 *
 * The flicker itself needs a GPU and cannot be unit-tested, but the geometry that
 * produced the bad range is pure arithmetic — so the MARGIN is pinned here. If
 * anyone loosens the camera's depth range or squeezes the road stack's surfaces
 * closer together, this fails instead of the artifact quietly coming back.
 *
 * ## What D-ERA30 changed here, and what it deliberately did NOT change
 *
 * The road stack used to be a fixed three surfaces (curb / asphalt / dash) at ad-hoc
 * heights, so `ROAD_SURFACE_TOPS` was one constant object and this file measured it.
 * Roads are now surfaced PER ERA, so the stack's height and course count depend on the
 * era — and the tops are therefore swept over EVERY era in `ERA_SEQUENCE` rather than
 * read from one object. That is a strictly wider sweep than before, not a narrower one.
 *
 * The regression case below is the part that needed care. Its assertion used to be
 * *"the current road stack's tightest gap cannot be resolved at the old camera range"*,
 * and that sentence stops being true once the ladder widens: era one's uniform 0.05u
 * step IS resolvable at the old bad range (~1.3 steps), so an assertion phrased about
 * the current geometry would have gone green for a reason that has nothing to do with
 * the camera being fixed. It is therefore pinned against **the gap that actually
 * shipped and actually flickered** (`SHIPPED_CURB_ASPHALT_GAP`), which is what #152 was
 * about and is a fact about history that no later era can move. The camera guard keeps
 * failing for the camera, and the ladder guard is separate below.
 */

const layout = eraCityLayout("prehistoric");

/**
 * The camera's real near/far, exactly as `CityScene` builds them.
 *
 * `FAR` is sized for the LARGEST island the game draws rather than for era one's, and that is
 * the shipped value rather than a conservative one: R3F creates the camera once and a changed
 * options object cannot re-seed it, so a per-era far plane would be a number the live camera
 * never receives. `CityScene`'s own note carries the mechanism.
 */
const NEAR = VILLAGE_CAMERA.nearPlane;
const FAR = ISLAND_GROWTH_CEILING * VILLAGE_CAMERA.farPlaneRatio;

/** Keep the pan target inside this fraction of the island (mirrors `CityScene`). */
const PAN_BOUND_RATIO = 0.72;

/**
 * The worst case includes the camera's ELASTIC edges: pan may stretch
 * `panOverscrollRatio` past the play-area bound and the dolly `zoomOverscrollRatio`
 * past its far limit before settling back, and while stretched the camera is
 * genuinely further from the scene than the hard bounds alone imply. Folding both in
 * here keeps this test pinning the true worst case rather than a bound the camera can
 * briefly exceed — without it the margin below would be measured somewhere the player
 * can actually get past.
 */
function furthestViewOf(atLayout: CityLayout): number {
  return maxViewDistance(
    atLayout.cameraDistance * (1 + VILLAGE_CAMERA.zoomOverscrollRatio),
    atLayout.seaRadius,
    atLayout.islandRadius * PAN_BOUND_RATIO * (1 + VILLAGE_CAMERA.panOverscrollRatio),
  );
}

const FURTHEST = furthestViewOf(layout);

/**
 * The curb-to-asphalt gap the flickering road stack SHIPPED WITH, in world units.
 * A historical constant, deliberately a literal: it is the geometry #152 was reported
 * against, and pinning the camera regression to it is what keeps that assertion about
 * the camera rather than about whatever the current era happens to surface roads with.
 */
const SHIPPED_CURB_ASPHALT_GAP = 0.02;

/** The tightest gap between any two stacked road surfaces in one era (the fight risk). */
function tightestRoadSurfaceGap(eraId: EraId): number {
  const tops = [...roadSurfaceTops(eraId)].sort((a, b) => a - b);
  let tightest = Number.POSITIVE_INFINITY;
  for (let i = 1; i < tops.length; i += 1) {
    tightest = Math.min(tightest, (tops[i] ?? 0) - (tops[i - 1] ?? 0));
  }
  return tightest;
}

/** The tightest gap any era can present — the number the whole game is held to. */
function tightestGapOverAllEras(): number {
  return Math.min(...ERA_SEQUENCE.map((era) => tightestRoadSurfaceGap(era.id)));
}

/** One resolvable depth step at the furthest the camera ever sees the roads. */
function depthStep(near: number, far: number): number {
  return depthResolutionAt(FURTHEST, near, far);
}

/**
 * How many resolvable depth steps separate the closest pair of road surfaces at the
 * furthest the camera ever sees them. Below 1 they z-fight outright; this is the
 * headroom the fix bought, and the number the assertions guard.
 */
function roadSurfaceHeadroom(near: number, far: number): number {
  return tightestGapOverAllEras() / depthStep(near, far);
}

describe("depth precision — the road layer must stay separable at full zoom-out", () => {
  it("keeps the road surfaces several depth steps apart at the furthest view, in every era", () => {
    // 4× is the bar: comfortably clear of the 1× z-fight threshold, with slack for
    // the fact that a real fragment's depth is interpolated, not exact.
    expect(roadSurfaceHeadroom(NEAR, FAR)).toBeGreaterThan(4);

    // A FLOOR under the sweep. `Math.min` over an empty era list is `Infinity`, and a
    // one-course era has no pair and so is also `Infinity` — either would sail past
    // the bar above while asserting nothing. So: eras exist, and at least one of them
    // really does stack two courses that could fight.
    expect(ERA_SEQUENCE.length).toBeGreaterThan(1);
    expect(Number.isFinite(tightestGapOverAllEras())).toBe(true);
    const stacked = ERA_SEQUENCE.filter((era) => roadSurfacing(era.id).courses.length > 1);
    expect(stacked.length).toBeGreaterThan(0);
  });

  it("fails for the old 0.1 near plane — the range that caused the flicker", () => {
    // The regression itself: three's default near against the old ×40 far plane could
    // not resolve the curb/asphalt gap AS SHIPPED at all (headroom below 1). Measured
    // against the historical gap, not the current ladder — see the header.
    expect(
      SHIPPED_CURB_ASPHALT_GAP / depthStep(0.1, layout.islandRadius * 40),
    ).toBeLessThan(1);
  });

  it("blames the near plane, not the far plane", () => {
    // Pulling the far plane in without touching `near` buys essentially nothing —
    // `1/near` dominates `1/near - 1/far`. Pinned so a future "fix" that only
    // tightens `far` cannot be mistaken for one that works.
    const farOnly = SHIPPED_CURB_ASPHALT_GAP / depthStep(0.1, layout.islandRadius * 10);
    expect(farOnly).toBeLessThan(1);
    const wide = SHIPPED_CURB_ASPHALT_GAP / depthStep(0.1, layout.islandRadius * 40);
    expect(farOnly / wide).toBeLessThan(1.01);
  });

  it("keeps the near plane under the closest anything solid can get", () => {
    // Precision improves as `near` grows, so the temptation is to keep raising it —
    // but the near plane CLIPS. Sweeping ~12k camera states (every zoom / pan /
    // azimuth extreme) against the fully built city, nothing solid — island,
    // buildings, roads, dock — came within 3u of the camera. Only the mastery-star
    // billboards' bounding boxes graze closer (~0.95u, one star skimming the bottom
    // of the frustum at full zoom-in panned to the bound), and at that range a star
    // is already several screens tall; an A/B render there at near 1 vs 0.02 differed
    // in 0.02% of pixels with no visible cut. Staying under 3 is what keeps this fix
    // from trading a flicker for a clipping bug.
    expect(NEAR).toBeLessThan(3);
  });

  it("covers the whole visible scene with the far plane", () => {
    expect(FAR).toBeGreaterThan(FURTHEST);
  });
});

/**
 * **THE ISLAND'S GROWTH CEILING IS THIS GUARD'S NUMBER, so this is where it is held.**
 *
 * `city/islandLand.ts` draws each era's island at its authored budget plus era one's own
 * margin, clamped at `ISLAND_GROWTH_CEILING`. That clamp exists for exactly one reason and it
 * is the reason this file measures: `cameraDistance = islandRadius * CAMERA_DISTANCE_RATIO`,
 * so a bigger island is seen from further away, and depth resolution degrades with the SQUARE
 * of the view distance. Past about grass 46 the road layer's closest pair of surfaces stops
 * being separable and the network reads as twitching slabs again — the #152 artefact, arrived
 * at from the other direction.
 *
 * So the ceiling is not quoted at the guard, it is swept through it: every era's SHIPPED
 * radius, at the lagoon and camera distance that radius really gets, against the same 4-step
 * bar era one is held to. And the row past the ceiling is measured too, because a ceiling that
 * nothing on the far side of it fails is a ceiling nobody has checked.
 */
describe("island growth is bounded by this same margin (§5.1, re-derived)", () => {
  /**
   * The road layer's headroom at an era's island, through the range the LIVE camera has.
   *
   * `NEAR`/`FAR` rather than a per-era pair, because the camera is created once — so the only
   * thing an era moves here is how far the dolly ends up from the scene.
   */
  function headroomAt(radius: number, sea: number): number {
    const grown = computeCityLayout(radius, sea);
    return tightestGapOverAllEras() / depthResolutionAt(furthestViewOf(grown), NEAR, FAR);
  }

  it("keeps every era's shipped island above the 4-step bar", () => {
    // A FLOOR first: ten eras, and at least one of them really is bigger than era one, so
    // this is a sweep over a growing island rather than ten copies of the same measurement.
    expect(ERA_SEQUENCE).toHaveLength(10);
    expect(Math.max(...ERA_SEQUENCE.map((era) => eraLandRadius(era.id)))).toBeGreaterThan(
      layout.islandRadius,
    );

    for (const era of ERA_SEQUENCE) {
      const radius = eraLandRadius(era.id);
      expect(
        headroomAt(radius, eraSeaRadius(era.id)),
        `${era.id} at grass ${radius}`,
      ).toBeGreaterThan(4);
      // ...and the ONE far plane the camera is given still covers the whole visible scene at
      // that size, which is what makes sizing it for the ceiling rather than the era correct.
      expect(FAR, era.id).toBeGreaterThan(
        furthestViewOf(computeCityLayout(radius, eraSeaRadius(era.id))),
      );
    }
  });

  it("fails on the far side of the ceiling, which is what makes it a ceiling", () => {
    /*
     * NOT A HYPOTHETICAL: era four's own budget asks for grass 50 (42 + era one's 8-unit
     * margin) and `islandLand.ts` clamps it to 46. This is the island that clamp refuses,
     * measured — so the clamp is a guard rather than a caution, and loosening it turns this
     * assertion red rather than turning the roads to slabs on somebody's screen.
     */
    expect(eraLandDemand("classical")).toBe(50);
    expect(eraLandDemand("classical")).toBeGreaterThan(ISLAND_GROWTH_CEILING);
    const refused = eraLandDemand("classical");
    expect(
      headroomAt(refused, (refused * layout.seaRadius) / layout.islandRadius),
      `grass ${refused} is what era four asked for`,
    ).toBeLessThan(4);
    // And the ceiling itself is the last radius that passes, to within a unit — so it is
    // pitched AT the budget rather than somewhere safely under it.
    expect(headroomAt(ISLAND_GROWTH_CEILING, eraSeaRadius("cyberpunk"))).toBeGreaterThan(4);
    expect(
      headroomAt(
        ISLAND_GROWTH_CEILING + 4,
        ((ISLAND_GROWTH_CEILING + 4) * layout.seaRadius) / layout.islandRadius,
      ),
    ).toBeLessThan(4);
  });
});

describe("the road ladder is the island's ladder, continued (D-ERA30)", () => {
  it("puts every course on a rung of the island's uniform step, and never between two", () => {
    for (const era of ERA_SEQUENCE) {
      const tops = roadSurfaceTops(era.id);
      expect(tops.length, era.id).toBeGreaterThan(0);
      for (const top of tops) {
        const rung = (top - SURFACE_Y) / GROUND_DECAL_STEP;
        // An exact integer multiple of the shared step: that is what "on a rung"
        // means, and it is the property that makes the gap below always one step.
        expect(rung, `${era.id} course top ${top}`).toBeCloseTo(Math.round(rung), 9);
      }
      const gaps = tops.slice(1).map((top, i) => top - (tops[i] ?? 0));
      for (const gap of gaps) {
        expect(gap, era.id).toBeCloseTo(GROUND_DECAL_STEP, 9);
      }
    }
  });

  it("starts the road stack above every island ground decal, in every era", () => {
    // The island's flat detail is deliberately held BELOW the road stack, so the roads
    // read as lying on the ground rather than interleaved with it. Before D-ERA30 the
    // clearance was one 0.01u sliver (about 2.2 depth steps); continuing the same
    // ladder makes it a full step.
    const highestDecal = SURFACE_Y + Math.max(...Object.values(GROUND_DECAL_TOPS));
    for (const era of ERA_SEQUENCE) {
      const lowestCourse = Math.min(...roadSurfaceTops(era.id));
      expect(lowestCourse, era.id).toBeGreaterThan(highestDecal);
      expect((lowestCourse - highestDecal) / depthStep(NEAR, FAR), era.id).toBeGreaterThan(
        4,
      );
    }
  });

  it("keeps the selection wash clear of the road it is drawn over, in every era", () => {
    // The picked-tile wash is translucent and `depthWrite: false`, so it cannot win a
    // depth fight — but it is still depth-TESTED against the course underneath, and a
    // wash level with a road surface is the same coplanar pair everything else here
    // exists to prevent. Read out of the BUILT GROUP rather than recomputed from the
    // clearance constant, because the defect this guards is precisely someone pinning
    // the highlight to an absolute height again while a paved era's stack rises past it.
    const selected = { col: 0, row: 0 };
    for (const era of ERA_SEQUENCE) {
      const group = buildRoadsGroup(
        [selected, { col: 1, row: 0 }],
        [],
        true,
        selected,
        roadSurfacing(era.id),
      );
      const highlight = group.getObjectByName(ROAD_HIGHLIGHT_NAME);
      expect(highlight, era.id).toBeDefined();
      const washes = (highlight?.children ?? []).filter((child): child is THREE.Mesh => {
        const mesh = child as THREE.Mesh;
        return (
          mesh.isMesh === true && (mesh.material as THREE.Material).transparent === true
        );
      });
      // A floor: the wash has to be there for its clearance to mean anything.
      expect(washes.length, era.id).toBe(1);
      const wash = washes[0] as THREE.Mesh;
      const geometry = wash.geometry as THREE.BoxGeometry;
      const washBottom = wash.position.y - geometry.parameters.height / 2;
      expect(
        (washBottom - roadStackTop(era.id)) / depthStep(NEAR, FAR),
        era.id,
      ).toBeGreaterThan(4);
    }
  });

  it("never uses a slope-amplified polygonOffset factor on road materials", () => {
    // THE BUG THIS PINS: dirt paths (D-ERA30) pushed their lowest course and every
    // ragged lump with `polygonOffsetFactor === units` (1..6). Factor is multiplied by
    // the triangle's depth slope, so at full zoom-out a horizontal slab's offset grows
    // until fragments fail the depth test against the tussock they sit on — green
    // speckles through the path that re-decide as the camera orbits. Units alone are a
    // constant depth-buffer nudge; the ladder already separates courses by ~11 steps
    // (`depthStep` ≈ 0.0045u, `GROUND_DECAL_STEP` = 0.05u), so factor is never owed.
    //
    // Read off the BUILT materials, every era (and a paved three-course surfacing so a
    // future asphalt row cannot reintroduce the factor). Floor: at least one material
    // must actually enable polygonOffset, or "factor is 0" holds vacuously over none.
    const paved = {
      courses: [
        {
          kind: "slab" as const,
          id: "kerb",
          color: 0xd3dae1,
          roughness: 0.9,
          widthFactor: 0.74,
          ragged: false,
        },
        {
          kind: "slab" as const,
          id: "asphalt",
          color: 0x4c586e,
          roughness: 0.92,
          widthFactor: 0.56,
          ragged: false,
        },
        {
          kind: "markings" as const,
          id: "dash",
          color: 0xeef2f5,
          lengthFactor: 0.28,
          widthFactor: 0.06,
        },
      ],
    };
    const surfacings = [
      ...ERA_SEQUENCE.map((era) => ({ label: era.id, surfacing: roadSurfacing(era.id) })),
      { label: "paved-fixture", surfacing: paved },
    ];
    let offsetMaterials = 0;
    for (const { label, surfacing } of surfacings) {
      const group = buildRoadsGroup(
        [
          { col: 0, row: 0 },
          { col: 1, row: 0 },
          { col: 0, row: 1 },
        ],
        [],
        true,
        null,
        surfacing,
      );
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh !== true) {
          return;
        }
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material.transparent) {
          return;
        }
        if (!material.polygonOffset) {
          return;
        }
        offsetMaterials += 1;
        expect(
          material.polygonOffsetFactor,
          `${label} must not slope-amplify road depth offsets`,
        ).toBe(0);
      });
    }
    expect(offsetMaterials).toBeGreaterThan(10);
  });
});
