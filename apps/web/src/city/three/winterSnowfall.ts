import * as THREE from "three";

/**
 * **FALLING SNOW — TWO LAYERS, BECAUSE A FLAKE HAS TWO DIFFERENT JOBS.**
 *
 * Wired from the design batch's asset 6. Against the dark wood of a building a pale flake
 * reads on VALUE. Against a grey-white overcast sky it has almost no value to spend, so the
 * sky layer uses a flake slightly DARKER than the sky and depends on size and motion instead.
 * Getting that backwards is the everyday way falling snow disappears against the thing it is
 * meant to be falling in front of.
 *
 * Flakes are square unlit points — the default point primitive, no sprite texture anywhere,
 * because a round flake needs an alpha sprite and there are no textures in this scene. At
 * 0.11–0.20 world units they are two to four pixels on screen and the shape is not legible
 * either way, so the trade costs nothing.
 *
 * The volume is a cylinder that RIDES WITH the camera's orbit target, so density stays
 * constant as the heading swings a full 360° and the player pans. A fixed volume would thin
 * out on one side of the island.
 *
 * ## Seeded, not random
 *
 * The batch spawns flakes with `Math.random()`. This uses the island's own `mulberry32` seed
 * pattern instead, for the reason `StarterIsland.tsx` gives for its scatter and the snow
 * course gives for its jitter: the same island has to look the same across a reload and a
 * save. It also keeps the field reproducible for a test, which a random field is not.
 */

/** Volume: the r=30 grass disc plus overhang, and tall enough to cover the smoke column. */
const VOLUME_R = 34;
const VOLUME_H = 26;

/** Seeds for the two layers, so each is stable across a reload and distinct from the other. */
const LAYER_SEEDS = [0x5f0a3d, 0xce17b2] as const;

export const SNOWFALL_NAME = "winter-snowfall";
export const SNOWFALL_NEAR_NAME = "winter-snowfall-near";
export const SNOWFALL_SKY_NAME = "winter-snowfall-sky";

/**
 * Total points in the field, across both layers. One draw call per layer, no texture and no
 * shader, so the budget is points and nothing else.
 */
export const SNOWFALL_BUDGET = 2300;

interface LayerSpec {
  readonly name: string;
  readonly count: number;
  readonly size: number;
  readonly color: number;
  readonly opacity: number;
  /** World units per second downward. */
  readonly fall: number;
  /** World units per second of lateral wander. */
  readonly drift: number;
}

const LAYERS: readonly LayerSpec[] = [
  // NEAR: reads against buildings. Bright, big, fast.
  {
    name: SNOWFALL_NEAR_NAME,
    count: 900,
    size: 0.2,
    color: 0xf4f9f8,
    opacity: 0.95,
    fall: 3.1,
    drift: 1.5,
  },
  // SKY: reads against the grey-white sky, so it is DARKER than `WINTER_LIGHT.sky`
  // (0xdce0de) or it vanishes. Small and slow, so it does not read as ash.
  {
    name: SNOWFALL_SKY_NAME,
    count: 1400,
    size: 0.11,
    color: 0xc3ced1,
    opacity: 0.85,
    fall: 1.9,
    drift: 0.9,
  },
];

/** Small deterministic RNG, the same one the island seeds its scatter with. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FlakeData {
  /** Per-flake phase, so the wander is not one synchronised sway. */
  readonly phase: Float32Array;
  /** The spawn column each flake falls down, so `t` alone places it. */
  readonly homeX: Float32Array;
  readonly homeZ: Float32Array;
  readonly homeY: Float32Array;
  readonly spec: LayerSpec;
}

function buildLayer(spec: LayerSpec, seed: number): THREE.Points {
  const rng = mulberry32(seed);
  const positions = new Float32Array(spec.count * 3);
  const phase = new Float32Array(spec.count);
  const homeX = new Float32Array(spec.count);
  const homeZ = new Float32Array(spec.count);
  const homeY = new Float32Array(spec.count);
  for (let i = 0; i < spec.count; i += 1) {
    // sqrt of a uniform draw spreads the flakes evenly over the disc's AREA rather than
    // crowding them at the middle.
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * VOLUME_R;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = rng() * VOLUME_H;
    positions.set([x, y, z], i * 3);
    homeX[i] = x;
    homeZ[i] = z;
    homeY[i] = y;
    phase[i] = rng() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: spec.size,
      color: spec.color,
      opacity: spec.opacity,
      transparent: true,
      // Near flakes big, far flakes small — the only depth cue a point has.
      sizeAttenuation: true,
      // Flakes must not occlude each other into grey blocks.
      depthWrite: false,
      // Far flakes die with the sea, which keeps the frame from fizzing at the edges.
      fog: true,
    }),
  );
  points.name = spec.name;
  const data: FlakeData = { phase, homeX, homeZ, homeY, spec };
  points.userData = data;
  // The volume rides with the camera target, so a frustum test against its build-time
  // bounds would cull it the moment the player pans.
  points.frustumCulled = false;
  return points;
}

/**
 * The whole field: two layers of square points, 2300 in total, in one group.
 *
 * The group is positioned by {@link updateSnowfall} onto the camera's orbit target; before the
 * first update it sits on the island centre, which is where the target starts.
 */
export function buildSnowfall(): THREE.Group {
  const group = new THREE.Group();
  group.name = SNOWFALL_NAME;
  for (const [i, spec] of LAYERS.entries()) {
    group.add(buildLayer(spec, LAYER_SEEDS[i] ?? 0x5f0a3d));
  }
  return group;
}

/**
 * One frame of snowfall: every flake falls, wanders and wraps, and the volume follows
 * `target` so density stays constant under a 360° orbit and a pan.
 *
 * **Position is a pure function of `t`, not an integration of deltas.** That matters twice: a
 * dropped frame cannot make the field drift, and — the reason it is written this way — the
 * field's state is fully determined by one number, so nothing here accumulates and nothing
 * here has to be reset. Under reduced motion the caller passes a fixed `t` and the field is a
 * still image of falling snow.
 *
 * Nothing about the crisis depends on this being called: it moves no round and decides no
 * outcome (`test/hardWinterClockless.test.ts` owns that claim for the engine and the winter's
 * playable surface).
 */
export function updateSnowfall(
  group: THREE.Object3D,
  t: number,
  target: { readonly x: number; readonly z: number },
): void {
  group.position.set(target.x, 0, target.z);
  for (const child of group.children) {
    const points = child as THREE.Points;
    const { phase, homeX, homeZ, homeY, spec } = points.userData as FlakeData;
    const position = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < spec.count; i += 1) {
      const p = phase[i] as number;
      // Fall, wrapping through the volume height. `+ VOLUME_H` keeps the modulus positive.
      const fallen = ((homeY[i] as number) - spec.fall * t) % VOLUME_H;
      const y = fallen < 0 ? fallen + VOLUME_H : fallen;
      // Lateral wander, bounded so a flake can never leave the volume: the lean is a
      // sinusoid rather than a drift term, which is what removes the batch's recycle-and-
      // undo-the-lean bookkeeping along with the state it needed.
      const sway = spec.drift * 0.8;
      const x = (homeX[i] as number) + Math.sin(t * 0.9 + p) * sway;
      const z = (homeZ[i] as number) + Math.cos(t * 0.7 + p) * sway * 0.6;
      position.setXYZ(i, x, y, z);
    }
    position.needsUpdate = true;
  }
}
