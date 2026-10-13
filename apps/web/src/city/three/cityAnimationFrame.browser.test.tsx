import type { RefObject } from "react";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";
import { cdp } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { eraCityLayout } from "../islandLand";
import type { OrbitControlsLike } from "./applyOrbit";
import CityScene from "./CityScene";

/**
 * The learner's city has real ambient motion, but that does not require submitting the next
 * expensive WebGL frame in the same uninterrupted animation loop. On the constrained
 * production surface the current `frameloop="always"` leaves no 25 ms idle window: input waits
 * behind the next software-rendering task even while the learner is only looking at the city.
 *
 * This guard measures the product behavior rather than a scheduler helper:
 *
 * - motion-on must keep drawing AND a real shipped gull must move;
 * - consecutive render bursts must leave the main thread an intentional idle window;
 * - reduced motion must stop drawing until scene state or a camera command invalidates it.
 *
 * `renderer.render` is observed through Three's own devtools event, the same boundary used by
 * `scripts/measure-client-memory.mjs`. The probe restores the method after each case and does
 * not retain a renderer after unmount.
 */

interface RenderCall {
  readonly start: number;
  readonly end: number;
}

interface RenderProbe {
  readonly calls: () => readonly RenderCall[];
  readonly flock: () => THREE.Object3D | null;
  readonly renderer: () => THREE.WebGLRenderer | null;
  readonly reset: () => void;
  readonly restore: () => void;
}

interface ThreeDevtoolsScope {
  __THREE_DEVTOOLS__?: EventTarget;
}

/**
 * This scene submits six renderer calls per visual frame: ContactShadows' target work plus the
 * visible scene. At 25 ms between slow animation bursts a 500 ms window measured 66 calls,
 * against 84 from the uninterrupted loop. 72 leaves one whole six-call burst of scheduler
 * variance while still failing if the scheduler is deleted. Kept absolute rather than expressed
 * as "less than before", so deleting the scheduler cannot move its own baseline.
 */
const MAX_RENDER_CALLS_PER_WINDOW = 72;
const browser = cdp() as unknown as {
  send(method: string, params: Record<string, unknown>): Promise<void>;
};

function shippedFlock(scene: THREE.Scene): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  scene.traverse((node) => {
    if (
      found === null &&
      node.type === "Group" &&
      node.children.length === 5 &&
      node.children.every(
        (bird) =>
          bird.type === "Group" &&
          bird.children.length === 8 &&
          bird.position.y > 20 &&
          bird.scale.x >= 1,
      )
    ) {
      found = node;
    }
  });
  return found;
}

function installRenderProbe(): RenderProbe {
  const scope = window as unknown as ThreeDevtoolsScope;
  const previous = scope.__THREE_DEVTOOLS__;
  const target = new EventTarget();
  const log: RenderCall[] = [];
  let seenRenderer: THREE.WebGLRenderer | null = null;
  let seenFlock: THREE.Object3D | null = null;
  let realRender: THREE.WebGLRenderer["render"] | null = null;

  target.addEventListener("observe", (rawEvent) => {
    const observed = (
      rawEvent as CustomEvent<THREE.WebGLRenderer & { readonly isWebGLRenderer?: boolean }>
    ).detail;
    if (observed?.isWebGLRenderer !== true || seenRenderer !== null) {
      return;
    }
    seenRenderer = observed;
    realRender = observed.render;
    observed.render = function renderWithTiming(scene, camera) {
      const start = performance.now();
      const result = realRender?.call(observed, scene, camera);
      const end = performance.now();
      log.push({ start, end });
      const renderedScene = scene as THREE.Scene;
      if (seenFlock === null && renderedScene.isScene) {
        seenFlock = shippedFlock(renderedScene);
      }
      return result;
    };
  });
  scope.__THREE_DEVTOOLS__ = target;

  return {
    calls: () => log,
    flock: () => seenFlock,
    renderer: () => seenRenderer,
    reset: () => {
      log.splice(0, log.length);
    },
    restore: () => {
      if (seenRenderer !== null && realRender !== null) {
        seenRenderer.render = realRender;
      }
      scope.__THREE_DEVTOOLS__ = previous;
      seenRenderer = null;
      seenFlock = null;
    },
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function mountScene(
  reducedMotion: boolean,
  placementActive = false,
): {
  readonly harness: Harness;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
} {
  const controlsRef: RefObject<OrbitControlsLike | null> = { current: null };
  const harness = mount(
    <div style={{ width: 640, height: 360 }}>
      <CityScene
        layout={eraCityLayout("prehistoric")}
        placed={[]}
        variant="day"
        reducedMotion={reducedMotion}
        controlsRef={controlsRef}
        onSelect={() => {}}
        roads={[]}
        placing={placementActive}
        placement={
          placementActive
            ? { nodeId: "NUM.2", col: -1, row: -1, rot: 0, valid: true }
            : null
        }
      />
    </div>,
  );
  return { harness, controlsRef };
}

let h: Harness | null = null;
let probe: RenderProbe | null = null;

afterEach(async () => {
  await browser.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  h?.cleanup();
  h = null;
  probe?.restore();
  probe = null;
});

test("ambient motion advances while render bursts leave an idle window", async () => {
  // Exercise the slow-frame branch deterministically instead of relying on host load.
  await browser.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  probe = installRenderProbe();
  ({ harness: h } = mountScene(false));

  await waitFor(
    () => probe?.renderer()?.info.render.triangles !== 0 && probe?.flock() !== null,
    "the city never rendered its shipped gull flock",
    20_000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 500));

  const bird = probe.flock()?.children[0];
  expect(bird, "the five-bird flock had no first gull to observe").toBeTruthy();
  const before = bird?.position.clone();
  probe.reset();
  await new Promise<void>((resolve) => setTimeout(resolve, 500));

  const calls = probe.calls();
  const idleGaps = calls
    .slice(1)
    .map((call, index) => call.start - (calls[index]?.end ?? call.start))
    // Render-target passes inside one visual frame are back-to-back. Only inter-frame gaps
    // describe time the browser can hand to input.
    .filter((gap) => gap > 3);
  const medianIdle = median(idleGaps);
  const moved = before?.distanceTo(bird?.position ?? before) ?? 0;

  expect(calls.length, "motion-on stopped submitting frames").toBeGreaterThan(3);
  expect(
    calls.length,
    `${calls.length} renders landed in 500 ms; the ambient loop did not yield between bursts`,
  ).toBeLessThanOrEqual(MAX_RENDER_CALLS_PER_WINDOW);
  expect(moved, "the renderer ran but the shipped gull stayed frozen").toBeGreaterThan(
    0.01,
  );
  expect(
    idleGaps.length,
    `only ${idleGaps.length} inter-frame gaps were observable across ${calls.length} renders`,
  ).toBeGreaterThanOrEqual(3);
  expect(
    medianIdle,
    `render bursts left a median ${medianIdle.toFixed(1)} ms idle gap; input still cannot ` +
      "enter the main thread for the intended 25 ms yield",
  ).toBeGreaterThanOrEqual(20);
}, 30_000);

test("reduced motion sleeps until an imperative camera command invalidates the canvas", async () => {
  probe = installRenderProbe();
  const mounted = mountScene(true);
  h = mounted.harness;

  await waitFor(
    () =>
      probe?.renderer()?.info.render.triangles !== 0 &&
      probe?.flock() !== null &&
      mounted.controlsRef.current !== null,
    "the reduced-motion city never became ready",
    20_000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  probe.reset();
  await new Promise<void>((resolve) => setTimeout(resolve, 250));

  expect(
    probe.calls().length,
    "the reduced-motion city kept redrawing after every animated object had stood down",
  ).toBe(0);

  const controls = mounted.controlsRef.current;
  expect(controls, "the camera controls disappeared before the input check").toBeTruthy();
  controls?.setAzimuthalAngle(controls.getAzimuthalAngle() + 0.2);
  controls?.update();

  await waitFor(
    () => (probe?.calls().length ?? 0) > 0,
    "an imperative camera command changed the camera but did not paint it",
    2_000,
  );
}, 30_000);

test("reduced-motion placement repaints pointer and touch drags", async () => {
  probe = installRenderProbe();
  ({ harness: h } = mountScene(true, true));

  await waitFor(
    () => probe?.renderer()?.info.render.triangles !== 0,
    "the placement canvas never rendered",
    20_000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  // The neutral ghost's mount effect may request one late frame. Require a whole quiet window
  // after that work instead of sampling through it and calling the async mount an animation.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    probe.reset();
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    if (probe.calls().length === 0) {
      break;
    }
  }
  expect(probe.calls().length, "the reduced-motion placement canvas did not sleep").toBe(0);

  const canvas = h.host.querySelector("canvas");
  expect(canvas, "placement mounted no canvas to drag").toBeTruthy();
  const box = canvas?.getBoundingClientRect();
  if (!canvas || !box) {
    return;
  }
  // Synthetic PointerEvents do not register a native active pointer in Chromium, while
  // OrbitControls correctly releases capture on pointerup. Keep the control path intact but
  // make capture inert for this synthetic input (real-pointer shot tests cover native capture).
  // Controls may connect to the canvas or its event-source parent, so patch the shared prototype.
  const realSetPointerCapture = Element.prototype.setPointerCapture;
  const realReleasePointerCapture = Element.prototype.releasePointerCapture;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  const drag = (pointerType: "mouse" | "touch", pointerId: number, dx: number) => {
    const dispatch = (type: string, x: number, buttons: number) =>
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId,
          pointerType,
          button: 0,
          buttons,
          clientX: x,
          clientY: box.top + box.height / 2,
        }),
      );
    const x = box.left + box.width / 2;
    dispatch("pointerdown", x, 1);
    dispatch("pointermove", x + dx, 1);
    dispatch("pointerup", x + dx, 0);
  };

  try {
    drag("mouse", 1, 48);
    await waitFor(
      () => (probe?.calls().length ?? 0) > 0,
      "a pointer placement drag moved the ghost but did not repaint it",
      2_000,
    );

    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    probe.reset();
    drag("touch", 2, -48);
    await waitFor(
      () => (probe?.calls().length ?? 0) > 0,
      "a touch placement drag moved the ghost but did not repaint it",
      2_000,
    );
  } finally {
    Element.prototype.setPointerCapture = realSetPointerCapture;
    Element.prototype.releasePointerCapture = realReleasePointerCapture;
  }
}, 30_000);
