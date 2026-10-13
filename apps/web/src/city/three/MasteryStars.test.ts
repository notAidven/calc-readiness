import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { orientStarsFacingCamera, starVertices } from "./MasteryStars";

// The fixed village camera tilt (VILLAGE_CAMERA.polarAngle, 0.72 rad ≈ the ~49°
// Clash-of-Clans-style tilt). From +Y. A star that stands vertically in the world is
// seen at this angle, so it foreshortens/slants; a camera-facing billboard does not.
const VILLAGE_POLAR = 0.72;

// One star slot's spacing (STAR_SIZE * 1.18); a 3-star row sits at x = -s, 0, +s.
const STAR_SPACING = 1.5 * 1.18;
const SLOT_XS = [-1, 0, 1].map((i) => i * STAR_SPACING);

/**
 * A PerspectiveCamera on the fixed village tilt at `azimuth`, orbiting (looking at)
 * `target`. Mirrors CityScene's `initialCameraPosition` + `MapControls` (up = +Y, no
 * roll). Returns a real camera because the billboard copies the camera's orientation.
 */
function cameraAt(target: THREE.Vector3, azimuth: number, distance = 120): THREE.Camera {
  const horizontal = Math.sin(VILLAGE_POLAR) * distance;
  const camera = new THREE.PerspectiveCamera(32, 1200 / 800, 0.1, 4000);
  camera.position.set(
    target.x + horizontal * Math.sin(azimuth),
    target.y + Math.cos(VILLAGE_POLAR) * distance,
    target.z + horizontal * Math.cos(azimuth),
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  return camera;
}

/** Attach the 3 star-slot children (local x offsets) the component lays out. */
function addSlots(stars: THREE.Object3D): THREE.Object3D[] {
  return SLOT_XS.map((x) => {
    const slot = new THREE.Object3D();
    slot.position.set(x, 0, 0);
    stars.add(slot);
    return slot;
  });
}

/** Project a world point to screen pixels through `camera` (1200×800 viewport). */
function toScreen(worldPos: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } {
  const ndc = worldPos.clone().project(camera);
  return { x: (ndc.x * 0.5 + 0.5) * 1200, y: (-ndc.y * 0.5 + 0.5) * 800 };
}

describe("starVertices (canonical star: one point up, two legs down)", () => {
  const OUTER = 0.5;
  const INNER = 0.23;
  const outerPoints = starVertices(OUTER, INNER).filter((_, index) => index % 2 === 0);

  it("puts exactly ONE outer point at the very top, centered on x = 0", () => {
    const highest = Math.max(...outerPoints.map((p) => p.y));
    const top = outerPoints.filter((p) => Math.abs(p.y - highest) < 1e-9);
    expect(top).toHaveLength(1);
    expect(top[0]?.y).toBeCloseTo(OUTER, 9);
    expect(top[0]?.x).toBeCloseTo(0, 9);
  });

  it("puts exactly TWO outer legs along the bottom, mirrored about x = 0", () => {
    // The upside-down bug produced the opposite: two points at the top and a
    // single leg pointing straight down.
    const lowest = Math.min(...outerPoints.map((p) => p.y));
    const bottom = outerPoints
      .filter((p) => Math.abs(p.y - lowest) < 1e-9)
      .sort((a, b) => a.x - b.x);
    expect(bottom).toHaveLength(2);
    expect(bottom[0]?.x).toBeCloseTo(-(bottom[1]?.x ?? 0), 9);
    expect(lowest).toBeLessThan(0);
  });

  it("alternates 5 outer and 5 inner vertices on their radii", () => {
    const all = starVertices(OUTER, INNER);
    expect(all).toHaveLength(10);
    for (const [index, point] of all.entries()) {
      const radius = Math.hypot(point.x, point.y);
      expect(radius).toBeCloseTo(index % 2 === 0 ? OUTER : INNER, 9);
    }
  });
});

describe("orientStarsFacingCamera (camera-facing billboard)", () => {
  it("matches the camera's WORLD orientation regardless of the parent building's rotation", () => {
    // Buildings rotate in 90° steps; the cluster must end up facing the camera in
    // WORLD space no matter how its parent is turned (the parent rotation is undone).
    const buildingYaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const azimuths = [0, Math.PI / 4, Math.PI / 2, (2 * Math.PI) / 3, -Math.PI / 4];
    const target = new THREE.Vector3(0, 6, 0);

    for (const buildingYaw of buildingYaws) {
      for (const azimuth of azimuths) {
        const building = new THREE.Group();
        building.rotation.y = buildingYaw;
        const stars = new THREE.Group();
        stars.position.set(0, 6, 0);
        building.add(stars);
        building.updateMatrixWorld(true);

        const camera = cameraAt(target, azimuth);
        orientStarsFacingCamera(stars, camera);

        const starWorld = new THREE.Quaternion();
        stars.getWorldQuaternion(starWorld);
        const camWorld = new THREE.Quaternion();
        camera.getWorldQuaternion(camWorld);

        // Same orientation ⇒ |dot| ≈ 1 (quaternion double-cover: q and -q are equal).
        expect(Math.abs(starWorld.dot(camWorld))).toBeGreaterThan(1 - 1e-6);
      }
    }
  });

  it("undoes a parent's pitch + roll + yaw so the cluster still faces the camera", () => {
    // Stress case: an ancestor carrying a non-trivial rotation on all three axes. The
    // world-quaternion approach must fully neutralize it so the result equals the camera.
    const parentRotations: Array<[number, number, number]> = [
      [0.35, 0.6, 0.25],
      [-0.5, Math.PI / 3, 0.4],
      [0.2, -0.8, -0.3],
    ];
    const azimuths = [0, Math.PI / 4, -Math.PI / 3];

    for (const [px, py, pz] of parentRotations) {
      for (const azimuth of azimuths) {
        const parent = new THREE.Group();
        parent.rotation.set(px, py, pz);
        const stars = new THREE.Group();
        stars.position.set(0, 6, 0);
        stars.rotation.set(0.5, 0.3, 0.9); // start tilted every which way
        parent.add(stars);
        parent.updateMatrixWorld(true);

        const camera = cameraAt(new THREE.Vector3(0, 6, 0), azimuth);
        orientStarsFacingCamera(stars, camera);

        const starWorld = new THREE.Quaternion();
        stars.getWorldQuaternion(starWorld);
        const camWorld = new THREE.Quaternion();
        camera.getWorldQuaternion(camWorld);
        expect(Math.abs(starWorld.dot(camWorld))).toBeGreaterThan(1 - 1e-6);
      }
    }
  });

  it("projects the row to a LEVEL, HORIZONTAL line on screen for an OFF-CENTER building", () => {
    // The camera orbits the ISLAND center, but a building sits off to the side. Facing
    // the camera puts the row along the camera's screen-right axis, so it projects to a
    // dead-level line on screen for every building at any azimuth.
    const islandTarget = new THREE.Vector3(0, 2, 0);
    const buildingCenters = [
      new THREE.Vector3(16, 0, 8),
      new THREE.Vector3(-14, 0, 10),
      new THREE.Vector3(6, 0, -18),
    ];
    const azimuths = [0, Math.PI / 4, Math.PI / 2, -(2 * Math.PI) / 3];

    for (const center of buildingCenters) {
      for (const azimuth of azimuths) {
        const outer = new THREE.Group(); // PlacedBuilding's position-only group
        outer.position.copy(center);
        const stars = new THREE.Group();
        stars.position.set(0, 8.6, 0);
        outer.add(stars);
        const slots = addSlots(stars);
        outer.updateMatrixWorld(true);

        const camera = cameraAt(islandTarget, azimuth, 69);
        orientStarsFacingCamera(stars, camera);
        outer.updateMatrixWorld(true);

        const screen = slots.map((s) =>
          toScreen(s.getWorldPosition(new THREE.Vector3()), camera),
        );
        const ys = screen.map((p) => p.y);
        const ySpread = Math.max(...ys) - Math.min(...ys);
        const xSpread =
          Math.max(...screen.map((p) => p.x)) - Math.min(...screen.map((p) => p.x));
        // The three slots land on one horizontal screen line (sub-pixel spread), and
        // the row spans a real horizontal width (it isn't collapsed edge-on).
        expect(xSpread).toBeGreaterThan(10);
        expect(ySpread).toBeLessThan(0.05);
      }
    }
  });

  it("stands the stars POINT-UP on screen (local +Y projects straight up)", () => {
    // A star's local up (+Y) must project to screen-up: directly above the cluster
    // origin (same screen x) and higher on screen (smaller screen y). That is what
    // makes each star read as an upright, point-up star rather than tipped.
    const islandTarget = new THREE.Vector3(0, 2, 0);
    const centers = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(16, 0, 8)];
    const azimuths = [0, Math.PI / 3, -Math.PI / 4];

    for (const center of centers) {
      for (const azimuth of azimuths) {
        const outer = new THREE.Group();
        outer.position.copy(center);
        const stars = new THREE.Group();
        stars.position.set(0, 8.6, 0);
        outer.add(stars);
        const originMarker = new THREE.Object3D();
        const upMarker = new THREE.Object3D();
        upMarker.position.set(0, 1, 0); // one unit up the star's local +Y
        stars.add(originMarker);
        stars.add(upMarker);
        outer.updateMatrixWorld(true);

        const camera = cameraAt(islandTarget, azimuth, 69);
        orientStarsFacingCamera(stars, camera);
        outer.updateMatrixWorld(true);

        const originScreen = toScreen(
          originMarker.getWorldPosition(new THREE.Vector3()),
          camera,
        );
        const upScreen = toScreen(upMarker.getWorldPosition(new THREE.Vector3()), camera);
        // Straight up: negligible horizontal drift, and higher on screen (smaller y).
        expect(Math.abs(upScreen.x - originScreen.x)).toBeLessThan(0.05);
        expect(upScreen.y).toBeLessThan(originScreen.y - 1);
      }
    }
  });
});
