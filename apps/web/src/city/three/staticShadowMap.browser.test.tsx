import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { eraCityLayout } from "../islandLand";
import { CityLighting } from "./CityLighting";
import { StarterIsland } from "./StarterIsland";

/**
 * **THE SHADOW MAP IS A PICTURE OF STATIC GROUND, AND IT WAS BEING REDRAWN SIXTY TIMES A
 * SECOND.**
 *
 * The city runs `frameloop="always"` because citizens walk, gulls fly and carts move. All
 * three of those set `castShadow = false` — deliberately, and long before this test —
 * so while a player is simply looking at the city, **nothing that casts a shadow is
 * moving.** Three does not know that: `WebGLShadowMap.autoUpdate` defaults to true, so
 * every frame re-rendered the whole shadow map from scratch.
 *
 * Re-measured after #671 batched the island, at 1024x580 under 4x CPU throttling with
 * `scripts/profile-city-frames.mjs`: the repaired signature removes 58.7 of 137.3 dev
 * draws per submission and 16.3 of 45.3 production draws. The current
 * `frozen-shadows` and `no-shadows` ablations remain draw-for-draw identical; the
 * remaining offscreen work is Drei's separate contact-shadow target.
 *
 * ## WHAT THIS FILE MEASURES, AND WHY IT IS NOT A PROPERTY ASSERTION
 *
 * Asserting `gl.shadowMap.autoUpdate === false` would restate the implementation and
 * prove nothing about cost. Three also keeps CALLING `shadowMap.render()` every frame
 * once frozen — it early-returns inside — so counting those calls measures nothing
 * either.
 *
 * So this counts **the draw calls that go into the shadow map**, by wrapping the GL
 * context: a shadow pass renders into a framebuffer object, the main pass renders to the
 * default framebuffer (`null`), and `bindFramebuffer` says which is current. That is the
 * work itself, in the units the profiler measured.
 *
 * ## AND IT MUST STILL UPDATE WHEN A CASTER MOVES
 *
 * A shadow map frozen forever is a bug, not a fix: a building placed after the freeze
 * would cast no shadow, and a stale shadow under a moved object is worse than a costly
 * correct one. The second case is the half that makes the first one safe — it moves a
 * caster and requires the pass to run again.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

const VIEW = 320;
const WAIT_MS = 15_000;
const TEST_TIMEOUT_MS = 60_000;
/**
 * Repeatable fault injection for the two nonzero floors. The ordinary run is shadowed;
 * `VITE_STATIC_SHADOW_GUARD_INJECT=unshadowed` must fail at "no shadow draws at all".
 */
const SHADOWS_ENABLED = import.meta.env.VITE_STATIC_SHADOW_GUARD_INJECT !== "unshadowed";

interface ShadowCounter {
  /** Draw calls issued while a framebuffer object was bound, i.e. into the shadow map. */
  shadowDraws: () => number;
  /** Draw calls issued to the default framebuffer, i.e. the picture the player sees. */
  mainDraws: () => number;
  frames: (count: number) => Promise<void>;
}

/**
 * Wrap the live GL context so draws can be attributed to the pass that issued them.
 * Instance-level, so nothing leaks between cases the way a prototype patch would.
 */
function countDraws(renderer: THREE.WebGLRenderer): ShadowCounter {
  const gl = renderer.getContext() as WebGLRenderingContext & {
    __wrappedForShadowCount?: boolean;
  };
  let shadowDraws = 0;
  let mainDraws = 0;
  let boundFbo: WebGLFramebuffer | null = null;

  const realBind = gl.bindFramebuffer.bind(gl);
  gl.bindFramebuffer = (target: number, fbo: WebGLFramebuffer | null) => {
    boundFbo = fbo;
    realBind(target, fbo);
  };
  const realDrawElements = gl.drawElements.bind(gl);
  gl.drawElements = (mode: number, count: number, type: number, offset: number) => {
    if (boundFbo === null) mainDraws += 1;
    else shadowDraws += 1;
    realDrawElements(mode, count, type, offset);
  };
  const realDrawArrays = gl.drawArrays.bind(gl);
  gl.drawArrays = (mode: number, first: number, count: number) => {
    if (boundFbo === null) mainDraws += 1;
    else shadowDraws += 1;
    realDrawArrays(mode, first, count);
  };
  const gl2 = gl as WebGL2RenderingContext;
  if (typeof gl2.drawElementsInstanced === "function") {
    const realDrawElementsInstanced = gl2.drawElementsInstanced.bind(gl2);
    gl2.drawElementsInstanced = (
      mode: number,
      count: number,
      type: number,
      offset: number,
      instanceCount: number,
    ) => {
      if (boundFbo === null) mainDraws += 1;
      else shadowDraws += 1;
      realDrawElementsInstanced(mode, count, type, offset, instanceCount);
    };
  }
  if (typeof gl2.drawArraysInstanced === "function") {
    const realDrawArraysInstanced = gl2.drawArraysInstanced.bind(gl2);
    gl2.drawArraysInstanced = (
      mode: number,
      first: number,
      count: number,
      instanceCount: number,
    ) => {
      if (boundFbo === null) mainDraws += 1;
      else shadowDraws += 1;
      realDrawArraysInstanced(mode, first, count, instanceCount);
    };
  }

  return {
    shadowDraws: () => shadowDraws,
    mainDraws: () => mainDraws,
    frames: async (count: number) => {
      for (let i = 0; i < count; i += 1) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
      // The city's own loop is not this loop, and under software rasterisation a single
      // submission takes far longer than one animation frame, so give it wall time too.
      await new Promise((resolve) => setTimeout(resolve, 700));
    },
  };
}

/**
 * Mount the city and start counting BEFORE the first frame.
 *
 * The counter has to be installed in `onCreated`, not after the mount settles: the first
 * shadow render is the one the freeze must still allow, and a counter attached afterwards
 * misses it and then reports zero for a window in which the map was correctly drawn once.
 * That is not a passing fix, it is a floor measuring the wrong window — the first version
 * of this file failed exactly there.
 */
async function mountCity(options: { reducedMotion?: boolean } = {}): Promise<{
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  counter: ShadowCounter;
}> {
  const layout = eraCityLayout("prehistoric");
  let gl: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let counter: ShadowCounter | null = null;
  h = mount(
    <div style={{ width: VIEW, height: VIEW }}>
      <Canvas
        shadows={SHADOWS_ENABLED}
        frameloop="always"
        camera={{ position: [0, 62, 62], fov: 40 }}
        onCreated={(state) => {
          gl = state.gl;
          scene = state.scene;
          counter = countDraws(state.gl);
        }}
      >
        <CityLighting islandRadius={layout.islandRadius} variant="day" />
        {/* MOTION ON BY DEFAULT, and that is load-bearing rather than incidental. With
            `reducedMotion` the gulls are posed once and hold still, so a signature that
            wrongly watched every node in the scene — casters or not — would still settle
            and this file would pass over a fix that recovered half the pass. The first
            version of this test did exactly that, and the live city's numbers caught what
            it had missed. The gulls animate here, and they cast no shadow. */}
        <StarterIsland
          layout={layout}
          reducedMotion={options.reducedMotion ?? false}
          eraId="prehistoric"
        />
      </Canvas>
    </div>,
  );
  await waitFor(() => gl !== null, "the canvas never created", WAIT_MS);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted nothing",
    WAIT_MS,
  );
  return {
    renderer,
    scene: scene as unknown as THREE.Scene,
    counter: counter as unknown as ShadowCounter,
  };
}

/**
 * A signature of everything that moves and casts NOTHING — the gulls here, the citizens
 * and carts in the real city. Asserted to have changed across the idle window, so "the
 * scene was animating while the shadow map stayed frozen" is measured rather than assumed.
 * Without it this file could pass on a scene that had simply stopped moving, which is the
 * hole the first version fell into.
 */
function nonCasterMotionSignature(scene: THREE.Scene): number {
  let signature = 0;
  let visit = 0;
  scene.traverse((node) => {
    // NOT restricted to meshes. A gull is animated by moving its root `Group`, and its
    // meshes hold constant local positions inside it — so a mesh-only walk reported the
    // flock as motionless and this floor passed while proving nothing.
    if (node.castShadow) return;
    visit += 1;
    signature += visit * (node.position.x + 2 * node.position.y + 3 * node.position.z);
  });
  return signature;
}

test(
  "an idle city stops redrawing its shadow map, and still draws the picture",
  async () => {
    const { counter, scene } = await mountCity();

    // A settling stretch first: the freeze has to let the map be drawn at least once, and
    // the island streams its dressing in over the opening frames.
    await counter.frames(14);
    const shadowAfterSettle = counter.shadowDraws();
    const mainAfterSettle = counter.mainDraws();

    // THE FLOOR, so a broken canvas cannot satisfy anything below: the shadow map was
    // genuinely drawn, and so was the picture.
    expect(
      shadowAfterSettle,
      "no shadow draws at all, so this is not measuring a shadowed scene",
    ).toBeGreaterThan(0);
    expect(
      mainAfterSettle,
      "no main-pass draws at all, so this is not measuring a rendered scene",
    ).toBeGreaterThan(0);

    // Now the city sits there. Nothing that casts a shadow is animated: the island is
    // static and its gulls set castShadow = false.
    const motionBefore = nonCasterMotionSignature(scene);
    await counter.frames(20);
    const shadowIdle = counter.shadowDraws() - shadowAfterSettle;
    const mainIdle = counter.mainDraws() - mainAfterSettle;

    // THE SECOND FLOOR, and the one this file was missing. Something that casts no shadow
    // moved during the window, so what is asserted below is a frozen shadow map under a
    // MOVING scene rather than a scene that had stopped.
    expect(
      nonCasterMotionSignature(scene),
      "nothing that casts no shadow moved during the idle window, so this is not measuring " +
        "an animating city and a signature watching every node would pass here too",
    ).not.toBe(motionBefore);

    // THE PICTURE IS STILL BEING DRAWN. Without this the assertion below would pass on a
    // scene that had stopped rendering entirely, which is the failure mode a naive
    // frameloop="demand" would introduce.
    expect(
      mainIdle,
      "the main pass stopped drawing while idle, so the city has frozen rather than the shadow map",
    ).toBeGreaterThan(0);

    // THE ASSERTION THE FIX IS FOR. An idle city redraws its shadow map a bounded number
    // of times, not once per submission. The allowance is generous on purpose: a few
    // late-arriving commits legitimately re-render it, and the defect this catches is a
    // pass that runs on EVERY frame, which is hundreds of draws over this window.
    expect(
      shadowIdle,
      `the shadow map was redrawn while nothing that casts one moved: ${shadowIdle} shadow ` +
        `draws over an idle window that issued ${mainIdle} main-pass draws`,
    ).toBeLessThan(mainIdle / 4);
  },
  TEST_TIMEOUT_MS,
);

test(
  "moving a shadow caster makes the shadow map render again",
  async () => {
    const { scene, counter } = await mountCity();
    await counter.frames(14);

    // Settle into the frozen state, and prove it is frozen before moving anything --
    // otherwise the second half below could pass on a map that never stopped.
    const beforeIdle = counter.shadowDraws();
    await counter.frames(14);
    const whileIdle = counter.shadowDraws() - beforeIdle;

    // Move a caster. A real one from the island rather than a mesh added for the test, so
    // what is exercised is the same detection a placed building or a bounce goes through.
    let moved: THREE.Object3D | null = null;
    scene.traverse((node) => {
      if (moved === null && node.castShadow && (node as THREE.Mesh).isMesh) moved = node;
    });
    expect(moved, "the island produced no shadow caster to move").not.toBeNull();

    const before = counter.shadowDraws();
    (moved as unknown as THREE.Object3D).position.y += 4;
    await counter.frames(10);
    const afterMove = counter.shadowDraws() - before;

    expect(
      afterMove,
      `the shadow map did not re-render after a caster moved (${afterMove} shadow draws), ` +
        "so every shadow in the city is now stale",
    ).toBeGreaterThan(0);
    // And it re-rendered MORE than the idle window did, so this is a response to the move
    // rather than the residual the idle allowance already tolerates.
    expect(afterMove).toBeGreaterThan(whileIdle);
  },
  TEST_TIMEOUT_MS,
);
