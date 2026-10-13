import { describe, expect, it } from "vitest";

import {
  applyCameraAction,
  clampControlsToBounds,
  type OrbitControlsLike,
} from "./applyOrbit";
import { cameraKeyIntent, VILLAGE_CAMERA } from "./orbitCamera";

describe("village camera key intents", () => {
  it("maps arrows / WASD to PAN, +- to zoom, Q/E to rotate, 0 to recenter", () => {
    expect(cameraKeyIntent("ArrowUp")).toBe("panUp");
    expect(cameraKeyIntent("w")).toBe("panUp");
    expect(cameraKeyIntent("ArrowDown")).toBe("panDown");
    expect(cameraKeyIntent("s")).toBe("panDown");
    expect(cameraKeyIntent("ArrowLeft")).toBe("panLeft");
    expect(cameraKeyIntent("a")).toBe("panLeft");
    expect(cameraKeyIntent("ArrowRight")).toBe("panRight");
    expect(cameraKeyIntent("d")).toBe("panRight");
    expect(cameraKeyIntent("+")).toBe("zoomIn");
    expect(cameraKeyIntent("-")).toBe("zoomOut");
    expect(cameraKeyIntent("q")).toBe("rotateLeft");
    expect(cameraKeyIntent("Q")).toBe("rotateLeft");
    expect(cameraKeyIntent("e")).toBe("rotateRight");
    expect(cameraKeyIntent("E")).toBe("rotateRight");
    expect(cameraKeyIntent("0")).toBe("recenter");
  });

  it("ignores keys that are not camera controls (R stays a BUILDING rotate)", () => {
    expect(cameraKeyIntent("Tab")).toBeNull();
    expect(cameraKeyIntent("Enter")).toBeNull();
    // R rotates the building during placement — it is NOT a camera control.
    expect(cameraKeyIntent("r")).toBeNull();
    expect(cameraKeyIntent("R")).toBeNull();
  });

  it("keeps a fixed oblique tilt (clamped zoom) while the azimuth is free to orbit", () => {
    expect(VILLAGE_CAMERA.polarAngle).toBeGreaterThan(0);
    expect(VILLAGE_CAMERA.polarAngle).toBeLessThan(Math.PI / 2);
    expect(VILLAGE_CAMERA.minDistanceRatio).toBeLessThan(VILLAGE_CAMERA.maxDistanceRatio);
    expect(VILLAGE_CAMERA.zoomStep).toBeLessThan(1);
    expect(VILLAGE_CAMERA.rotateStep).toBeGreaterThan(0);
  });
});

function fakeControls(): OrbitControlsLike & { reset: () => void } {
  const home = { px: 10, py: 10, pz: 10, az: 0 };
  let az = home.az;
  return {
    object: { position: { x: home.px, y: home.py, z: home.pz } },
    target: { x: 0, y: 0, z: 0 },
    minDistance: 6,
    maxDistance: 40,
    getAzimuthalAngle: () => az,
    setAzimuthalAngle: (value: number) => {
      az = value;
    },
    update: () => {},
    reset() {
      this.object.position.x = home.px;
      this.object.position.y = home.py;
      this.object.position.z = home.pz;
      this.target.x = 0;
      this.target.y = 0;
      this.target.z = 0;
      az = home.az;
    },
  };
}

function distance(controls: OrbitControlsLike): number {
  return Math.hypot(
    controls.object.position.x - controls.target.x,
    controls.object.position.y - controls.target.y,
    controls.object.position.z - controls.target.z,
  );
}

describe("applyCameraAction", () => {
  it("pans camera + target together on the ground plane (distance preserved)", () => {
    const controls = fakeControls();
    const before = distance(controls);
    applyCameraAction(controls, "panUp");
    // The target moved off the origin, and the eye→target distance is unchanged.
    expect(Math.hypot(controls.target.x, controls.target.z)).toBeGreaterThan(0);
    expect(distance(controls)).toBeCloseTo(before, 4);
  });

  it("dollies within the clamped distance range", () => {
    const controls = fakeControls();
    const start = distance(controls);
    applyCameraAction(controls, "zoomIn");
    expect(distance(controls)).toBeLessThan(start);
    for (let i = 0; i < 40; i += 1) {
      applyCameraAction(controls, "zoomIn");
    }
    expect(distance(controls)).toBeGreaterThanOrEqual(controls.minDistance - 1e-6);
    for (let i = 0; i < 80; i += 1) {
      applyCameraAction(controls, "zoomOut");
    }
    expect(distance(controls)).toBeLessThanOrEqual(controls.maxDistance + 1e-6);
  });

  it("orbits the azimuth by ±rotateStep (spin around, tilt untouched)", () => {
    const controls = fakeControls();
    const start = controls.getAzimuthalAngle();
    applyCameraAction(controls, "rotateRight");
    expect(controls.getAzimuthalAngle()).toBeCloseTo(start + VILLAGE_CAMERA.rotateStep, 6);
    applyCameraAction(controls, "rotateLeft");
    applyCameraAction(controls, "rotateLeft");
    expect(controls.getAzimuthalAngle()).toBeCloseTo(start - VILLAGE_CAMERA.rotateStep, 6);
  });

  it("recenters to the saved home framing", () => {
    const controls = fakeControls();
    applyCameraAction(controls, "panRight");
    applyCameraAction(controls, "zoomIn");
    applyCameraAction(controls, "recenter");
    expect(controls.target.x).toBeCloseTo(0, 6);
    expect(controls.target.z).toBeCloseTo(0, 6);
  });

  it("clamps the pan target to the island play area", () => {
    const controls = fakeControls();
    controls.target.x = 100;
    controls.target.z = -80;
    clampControlsToBounds(controls, 5);
    expect(controls.target.x).toBeLessThanOrEqual(5);
    expect(controls.target.x).toBeGreaterThanOrEqual(-5);
    expect(controls.target.z).toBeGreaterThanOrEqual(-5);
    expect(controls.target.z).toBeLessThanOrEqual(5);
  });

  it("keeps the pan target within bounds when panning near an edge", () => {
    const controls = fakeControls();
    for (let i = 0; i < 200; i += 1) {
      applyCameraAction(controls, "panUp", 8);
    }
    expect(Math.abs(controls.target.x)).toBeLessThanOrEqual(8 + 1e-6);
    expect(Math.abs(controls.target.z)).toBeLessThanOrEqual(8 + 1e-6);
  });
});
