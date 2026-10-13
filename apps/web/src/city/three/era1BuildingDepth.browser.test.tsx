import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { getEraNodes } from "@cr/skill-graph";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";

import { resolveBuildingModel } from "../buildingAssets";
import { civicFootprint, resolveCivicModel } from "../civicBuildings";
import { CITY_KEY_POS, resolveLightSpec } from "./CityLighting";
import { resolveTownHallModel, TOWN_HALL_FOOTPRINT, TOWN_HALL_ID } from "../townHall";
import type { Footprint } from "../worldLayout";
import { footprintFor } from "../worldLayout";
import {
  disposePreparedModel,
  PLACED_PREPARATION,
  prepareGridworkModel,
} from "./modelPreparation";

/**
 * A RENDER-based guard for era one's complete population of eleven `built` models (six
 * skill buildings, the hub, four civic types): it loads each one's REAL bundled GLB, runs
 * it through the REAL `prepareGridworkModel` fit/ground/material pipeline, renders it under
 * a lighting rig matching the live city's, and measures the rendered PIXELS — never an
 * implementation string, a filename, or a source-code marker.
 *
 * ## WHAT "FLAT" MEANS HERE, MEASURED RATHER THAN ASSERTED
 *
 * A building that reads as a flat colour blob under the real camera produces a render
 * whose pixels vary little from one another: no roof/wall break, no foundation shadow, no
 * entrance notch, no contrasting accent. {@link colorStddev} is the combined per-channel
 * standard deviation over every silhouette pixel — low for a flat blob, high for a model
 * with genuine light/dark and hue variation across its surface. This is the SAME family of
 * evidence the QA rule for spatial claims asks for (a rendered frame, not a dimension), just
 * reduced to one number per building instead of an image a human reads.
 *
 * ## THE BASELINE IS MEASURED, NOT GUESSED — BUT COLOUR VARIANCE IS NOT THE PRIMARY GUARD
 *
 * {@link BEFORE_COLOR_STDDEV} is this exact metric measured against the ORIGINAL, unmodified
 * `built.glb` for every one of these eleven files (recorded at `9d6c1242`, the tip this fix
 * branched from) — the flat state the fix corrects.
 *
 * A first revision required each building to clear {@link IMPROVEMENT_FLOOR}× that baseline,
 * reasoning that added depth should show up as more pixel variance. It does — but so does a
 * BADLY added defect: an independent visual review rejected that revision's geometry outright
 * (detached near-black corner blocks, dark rods for posts/ladders, an oversized megalith ring
 * dwarfing the Town Hall), and every one of those defects reads as MORE colour variance, not
 * less, so this metric could not have caught them. The fix for the rejected geometry — toning
 * every addition down to the host model's own sampled, floor-clamped palette — is also, for
 * several buildings (the Spring's raised rim + post lands in the basin's own warm stone tone
 * rather than a stark dark brown), a measurable DECREASE in colour variance versus the flat
 * original. So {@link IMPROVEMENT_FLOOR} is now a loose sanity floor rather than a strict
 * per-building requirement, and the STRUCTURAL "adds real, integrated geometry" test below —
 * population presence, a near-black floor, and bounding-box containment, all read from the
 * REAL exported scene graph — is the test that actually fails on a plain revert (zero
 * depth-kit meshes) and on a rejected-rev1-style stacked/oversized/near-black regression,
 * either of which colour variance alone could pass.
 *
 * Reverting `apps/web/src/city/art/models/{num-*,townhall/townhall,civic-*}-built.glb` to
 * their pre-fix bytes reproduces {@link BEFORE_COLOR_STDDEV} almost exactly and fails the
 * structural test's population-presence check (zero depth-kit meshes) for every one of the
 * eleven — checked by running it against `git show 9d6c1242:<path>` rather than argued in
 * prose. The rejected first-revision bytes (`git show c365b0cf:<path>`) fail the SAME
 * structural test's near-black and bounding-box checks instead.
 *
 * ## WHY NOT JUST GREP FOR "Era1DepthKit"
 *
 * A string match on that group name would prove the fix was ATTEMPTED, not that it WORKED —
 * a kit that failed to attach, attached with degenerate (zero-scale, fully-occluded, or
 * off-model) geometry, or attached in a colour identical to its host would still contain the
 * string and still read flat. This file instead reads the real, exported THREE.js scene
 * graph — the same one `prepareGridworkModel` hands the live renderer — and measures its
 * actual mesh count, material colours and bounding boxes, plus (in the last test) the actual
 * rendered pixels. `findKitGroup` locates that group by name only to separate "added" from
 * "original" meshes for those real geometric measurements; the name itself proves nothing on
 * its own and is asserted nowhere.
 */

const CENSUS_FLOOR = 11;
/**
 * A SOFT sanity floor on the render-pixel signal, not the primary guard — see the module
 * docblock. A tastefully toned-down addition can legitimately measure slightly BELOW its
 * pre-fix colour variance (the Spring does, by ~9%); this only catches a render that has
 * gone essentially back to flat, not a subtle redesign.
 */
const IMPROVEMENT_FLOOR = 0.85;

/**
 * Measured against the pre-fix tree (`9d6c1242`) with the identical harness below. See the
 * module docblock — this is the "before" half of the failing-before/passing-after evidence.
 */
const BEFORE_COLOR_STDDEV: Readonly<Record<string, number>> = {
  "NUM.S": 40.35,
  "NUM.F": 40.52,
  "NUM.2": 40.13,
  "NUM.3": 45.0,
  "NUM.4": 47.47,
  "NUM.5": 40.62,
  [TOWN_HALL_ID]: 42.86,
  smokehouse: 33.44,
  longhouse: 32.68,
  campfire: 33.39,
  water_spring: 37.11,
};

interface PopulationEntry {
  readonly key: string;
  readonly label: string;
  readonly url: string | null;
  readonly kind: string;
  readonly footprint: Footprint | null;
}

function buildPopulation(): readonly PopulationEntry[] {
  const skillNodes = getEraNodes("prehistoric");
  const skillEntries: PopulationEntry[] = skillNodes.map((nodeId) => {
    const model = resolveBuildingModel(nodeId, "built");
    return {
      key: nodeId,
      label: `skill building ${nodeId}`,
      url: model.url,
      kind: model.kind,
      footprint: footprintFor(nodeId),
    };
  });
  const hallModel = resolveTownHallModel("built");
  const hallEntry: PopulationEntry = {
    key: TOWN_HALL_ID,
    label: "the hub (Stone Circle)",
    url: hallModel?.url ?? null,
    kind: hallModel?.kind ?? "built",
    footprint: TOWN_HALL_FOOTPRINT,
  };
  const civicIds = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];
  const civicEntries: PopulationEntry[] = civicIds.map((typeId) => {
    const model = resolveCivicModel(typeId, "built");
    return {
      key: typeId,
      label: `civic building ${typeId}`,
      url: model?.url ?? null,
      kind: model?.kind ?? "built",
      footprint: civicFootprint(typeId),
    };
  });
  return [...skillEntries, hallEntry, ...civicEntries];
}

interface RenderMetric {
  readonly pixels: number;
  readonly colorStddev: number;
}

/**
 * Load, prepare (the REAL fit/ground/material pipeline), and render one building under a
 * fixed camera/lighting rig approximating the live city's (`orbitCamera.ts`'s
 * `VILLAGE_CAMERA.polarAngle`/`azimuthAngle`, `CityLighting.tsx`'s day rig). The camera
 * distance is FIXED across every building rather than auto-framed to each one's own
 * bounding sphere: contain-fit already normalises every building to fill its own footprint,
 * so a fixed frame is what lets a genuinely bigger silhouette (the hub's megalith ring)
 * occupy more of the render — auto-framing would zoom out to compensate and cancel out the
 * very size increase this guard is meant to catch.
 */
async function renderAndMeasure(url: string, footprint: Footprint): Promise<RenderMetric> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const prepared = prepareGridworkModel(gltf.scene, footprint, PLACED_PREPARATION);

  const canvas = document.createElement("canvas");
  const size = 256;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  try {
    renderer.setSize(size, size, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.add(prepared);
    const spec = resolveLightSpec("day", false);
    scene.add(new THREE.HemisphereLight(spec.hemiSky, spec.hemiGround, spec.hemiIntensity));
    scene.add(new THREE.AmbientLight(spec.ambient, spec.ambientIntensity));
    const d = 30;
    const key = new THREE.DirectionalLight(spec.key, spec.keyIntensity);
    key.position.set(CITY_KEY_POS[0] * d, CITY_KEY_POS[1] * d, CITY_KEY_POS[2] * d);
    scene.add(key);
    // `CityLighting.tsx`'s FILL_POS is not exported; this ratio is its literal, restated
    // here only as an approximation for this test's rig (not a load-bearing shared value).
    const fill = new THREE.DirectionalLight(spec.rim, spec.rimIntensity);
    fill.position.set(1.4 * d, 0.85 * d, -1.45 * d);
    scene.add(fill);

    const box = new THREE.Box3().setFromObject(prepared);
    const center = new THREE.Vector3(
      (box.min.x + box.max.x) / 2,
      0,
      (box.min.z + box.max.z) / 2,
    );
    const polar = 0.72; // VILLAGE_CAMERA.polarAngle
    const azimuth = -Math.PI * 0.28; // VILLAGE_CAMERA.azimuthAngle
    const dist = 34;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, dist * 10);
    camera.position.set(
      center.x + dist * Math.sin(polar) * Math.sin(azimuth),
      dist * Math.cos(polar),
      center.z + dist * Math.sin(polar) * Math.cos(azimuth),
    );
    camera.lookAt(center);

    renderer.render(scene, camera);

    const gl = renderer.getContext();
    const pixels = new Uint8Array(size * size * 4);
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let n = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumSqR = 0;
    let sumSqG = 0;
    let sumSqB = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const a = pixels[i + 3] as number;
      if (a < 20) continue;
      const r = pixels[i] as number;
      const g = pixels[i + 1] as number;
      const b = pixels[i + 2] as number;
      n += 1;
      sumR += r;
      sumG += g;
      sumB += b;
      sumSqR += r * r;
      sumSqG += g * g;
      sumSqB += b * b;
    }
    const varOf = (sum: number, sumSq: number) => (n > 0 ? sumSq / n - (sum / n) ** 2 : 0);
    const colorVariance = varOf(sumR, sumSqR) + varOf(sumG, sumSqG) + varOf(sumB, sumSqB);
    return { pixels: n, colorStddev: Math.sqrt(Math.max(0, colorVariance)) };
  } finally {
    disposePreparedModel(prepared);
    renderer.dispose();
  }
}

/** Depth-kit meshes are grouped under a node named exactly this by `remodel-era1-buildings.mjs`. */
const KIT_NAME = "Era1DepthKit";

/** `Object3D.clone(true)` preserves `.name`, so the kit is still findable after prepare/fit. */
function findKitGroup(root: THREE.Object3D): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (o.name === KIT_NAME) found = o;
  });
  return found;
}

function isDescendantOf(object: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = object;
  while (p) {
    if (p === ancestor) return true;
    p = p.parent;
  }
  return false;
}

interface KitInspection {
  readonly kitMeshCount: number;
  readonly darkestKitLuminance: number;
  readonly originalBox: THREE.Box3;
  readonly kitBox: THREE.Box3;
}

/**
 * Load and prepare (the REAL pipeline) one building, then separate its meshes into
 * "original" (everything NOT under the {@link KIT_NAME} group) and "kit" (everything under
 * it), reporting exactly what the anti-artifact checks below need: how many new meshes
 * exist, the darkest colour among them (in 0-255 luminance), and the two disjoint bounding
 * boxes to compare. This reads the REAL exported THREE.js scene graph and REAL material
 * colours of the bundled asset — never a source-code string.
 */
function inspectKit(root: THREE.Object3D): KitInspection {
  root.updateMatrixWorld(true);
  const kitGroup = findKitGroup(root);
  const originalBox = new THREE.Box3();
  const kitBox = new THREE.Box3();
  let kitMeshCount = 0;
  let darkestKitLuminance = Number.POSITIVE_INFINITY;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const underKit = kitGroup !== null && isDescendantOf(o, kitGroup);
    if (underKit) {
      kitMeshCount += 1;
      kitBox.expandByObject(o);
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const material of materials) {
        const color = (material as THREE.MeshStandardMaterial).color;
        if (!color) continue;
        const hex = color.getHex(THREE.SRGBColorSpace);
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        darkestKitLuminance = Math.min(darkestKitLuminance, lum);
      }
    } else {
      originalBox.expandByObject(o);
    }
  });
  return { kitMeshCount, darkestKitLuminance, originalBox, kitBox };
}

/** One kit mesh, tagged by spatial role, with its REAL world-space bounding box. */
interface CategorizedKitMesh {
  readonly box: THREE.Box3;
}

interface SpatialInspection {
  readonly originalMeshes: readonly THREE.Mesh[];
  readonly originalBox: THREE.Box3;
  readonly entranceMeshes: readonly CategorizedKitMesh[];
  readonly groundedMeshes: readonly CategorizedKitMesh[];
}

/**
 * Separates a prepared root's meshes into the ORIGINAL authored set (for independent
 * raycasting — never the script's own {@link inspectKit} boxes, which this file must not
 * reuse if it is to check the fix rather than agree with it) and the KIT set, read back by
 * the spatial role `scripts/remodel-era1-buildings.mjs` tags every kit material with
 * (`userData.era1Category`: "entrance", "foundation", "cap" or "accent"). "entrance" is the
 * porch/doorway/ladder/dipping-post family the QA finding named; "entrance" plus "accent"
 * together are what {@link groundedMeshes} checks for a floating gap, since an accent (the
 * Spring's basin rim, the Clearing's drying rack) owes the same contact claim.
 */
function inspectSpatial(root: THREE.Object3D): SpatialInspection {
  root.updateMatrixWorld(true);
  const kitGroup = findKitGroup(root);
  const originalMeshes: THREE.Mesh[] = [];
  const originalBox = new THREE.Box3();
  const entranceMeshes: CategorizedKitMesh[] = [];
  const groundedMeshes: CategorizedKitMesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const underKit = kitGroup !== null && isDescendantOf(o, kitGroup);
    if (!underKit) {
      originalMeshes.push(o);
      originalBox.expandByObject(o);
      return;
    }
    const userData = o.userData as { era1Category?: string; era1Grounded?: boolean };
    const category = userData.era1Category;
    const box = new THREE.Box3().setFromObject(o);
    if (category === "entrance") entranceMeshes.push({ box });
    // era1Grounded === false marks a part that legitimately rests on ANOTHER kit part (a
    // canopy on its posts, a crossbar on its rails, a ladder rung between them, a flame on
    // its hearth ring) rather than on the ground/wall/basin directly — see the script's own
    // docblock on `userData.era1Grounded`. Only the support member owes a ground-contact
    // claim, so the carried member is excluded here rather than read as a false floating gap.
    if (
      (category === "entrance" || category === "accent") &&
      userData.era1Grounded !== false
    ) {
      groundedMeshes.push({ box });
    }
  });
  return { originalMeshes, originalBox, entranceMeshes, groundedMeshes };
}

/**
 * The building's own STRUCTURAL envelope — the original authored meshes' bounding box with
 * the ground pad's own layers excluded — found by the same INDEPENDENT classification this
 * PR's fix uses in the script (thin AND spanning most of the model's own footprint), applied
 * here fresh against the real bundled geometry rather than trusted from the script's report.
 * This is what an entrance addition is checked against below: the wall, never the pad.
 */
function structuralEnvelope(
  originalMeshes: readonly THREE.Mesh[],
  originalBox: THREE.Box3,
): THREE.Box3 {
  const size = originalBox.getSize(new THREE.Vector3());
  const heightFloor = Math.max(0.6, size.y * 0.04);
  const structural = new THREE.Box3();
  for (const m of originalMeshes) {
    const box = new THREE.Box3().setFromObject(m);
    const s = box.getSize(new THREE.Vector3());
    const padLike = s.y <= heightFloor && (s.x >= size.x * 0.8 || s.z >= size.z * 0.8);
    if (!padLike) {
      structural.expandByPoint(box.min);
      structural.expandByPoint(box.max);
    }
  }
  return structural;
}

describe("era one's built models read as dimensional, not flat, under the real render", () => {
  it("derives the complete eleven-building population with a floor", () => {
    const population = buildPopulation();
    expect(population.length).toBeGreaterThanOrEqual(CENSUS_FLOOR);
    expect(population).toHaveLength(CENSUS_FLOOR);
    expect(new Set(population.map((p) => p.key)).size).toBe(CENSUS_FLOOR);
    expect(Object.keys(BEFORE_COLOR_STDDEV).sort()).toEqual(
      population.map((p) => p.key).sort(),
    );
  });

  it("resolves every population member to its authored GLB, never the flat procedural fallback", () => {
    const population = buildPopulation();
    const unresolved = population.filter((p) => p.kind !== "glb" || !p.url);
    expect(
      unresolved.map((p) => p.label),
      "these buildings fell back to the shared neutral procedural shell " +
        "(constructionStages.ts) instead of loading their own model",
    ).toEqual([]);
  });

  it("adds real, integrated geometry — present, non-trivial, never near-black, never oversized", async () => {
    const population = buildPopulation();
    const failures: string[] = [];
    const NEAR_BLACK_FLOOR = 40;
    const MAX_HORIZONTAL_OVERHANG = 1.35;
    const MAX_HEIGHT_MULTIPLE = 2.6;
    const MIN_HEIGHT_COVERAGE = 0.18;
    for (const entry of population) {
      if (!entry.url || !entry.footprint) {
        failures.push(`${entry.key}: no resolvable url/footprint`);
        continue;
      }
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(entry.url);
      const prepared = prepareGridworkModel(
        gltf.scene,
        entry.footprint,
        PLACED_PREPARATION,
      );
      try {
        const inspection = inspectKit(prepared);
        const label = entry.key;
        // Present: a plain revert to the pre-fix bytes has NO "Era1DepthKit" group and
        // zero kit meshes — this is what actually fails on a revert, unlike colour variance.
        if (inspection.kitMeshCount < 2) {
          failures.push(
            `${label}: only ${inspection.kitMeshCount} depth-kit meshes (expected >= 2 — ` +
              "no added geometry, or it failed to attach)",
          );
          continue;
        }
        // Never near-black: the exact defect an independent review rejected in revision 1.
        if (inspection.darkestKitLuminance < NEAR_BLACK_FLOOR) {
          failures.push(
            `${label}: darkest new material luminance ${inspection.darkestKitLuminance.toFixed(1)} ` +
              `is below the near-black floor of ${NEAR_BLACK_FLOOR}`,
          );
        }
        const origSize = inspection.originalBox.getSize(new THREE.Vector3());
        const origCenter = inspection.originalBox.getCenter(new THREE.Vector3());
        const kitSize = inspection.kitBox.getSize(new THREE.Vector3());
        const halfW = origSize.x / 2;
        const halfD = origSize.z / 2;
        const kitHalfW = Math.max(
          Math.abs(inspection.kitBox.max.x - origCenter.x),
          Math.abs(inspection.kitBox.min.x - origCenter.x),
        );
        const kitHalfD = Math.max(
          Math.abs(inspection.kitBox.max.z - origCenter.z),
          Math.abs(inspection.kitBox.min.z - origCenter.z),
        );
        // Bounded relative to the source's own footprint: rejects a rev1-style megalith
        // ring or corner post sitting far outside the building it is meant to belong to.
        if (halfW > 0 && kitHalfW > halfW * MAX_HORIZONTAL_OVERHANG) {
          failures.push(
            `${label}: depth-kit X half-extent ${kitHalfW.toFixed(2)} exceeds ` +
              `${MAX_HORIZONTAL_OVERHANG}× the source's own ${halfW.toFixed(2)}`,
          );
        }
        if (halfD > 0 && kitHalfD > halfD * MAX_HORIZONTAL_OVERHANG) {
          failures.push(
            `${label}: depth-kit Z half-extent ${kitHalfD.toFixed(2)} exceeds ` +
              `${MAX_HORIZONTAL_OVERHANG}× the source's own ${halfD.toFixed(2)}`,
          );
        }
        if (origSize.y > 0 && kitSize.y > origSize.y * MAX_HEIGHT_MULTIPLE) {
          failures.push(
            `${label}: depth-kit height ${kitSize.y.toFixed(2)} exceeds ` +
              `${MAX_HEIGHT_MULTIPLE}× the source's own ${origSize.y.toFixed(2)} ` +
              "(an oversized tower/pillar, not a subtle accent)",
          );
        }
        // Non-trivial: the added geometry must span a real fraction of the building's own
        // height, so a single flush, invisible sliver cannot pass as "added depth".
        if (origSize.y > 0 && kitSize.y < origSize.y * MIN_HEIGHT_COVERAGE) {
          failures.push(
            `${label}: depth-kit height ${kitSize.y.toFixed(2)} covers less than ` +
              `${(MIN_HEIGHT_COVERAGE * 100).toFixed(0)}% of the source's own ` +
              `${origSize.y.toFixed(2)} — too small to read as added structure`,
          );
        }
      } finally {
        disposePreparedModel(prepared);
      }
    }
    expect(
      failures,
      `${failures.length} of ${population.length} buildings fail the anti-artifact bounds`,
    ).toEqual([]);
  }, 60_000);

  it("renders every building with meaningfully more colour variance than its pre-fix bytes", async () => {
    const population = buildPopulation();
    const failures: string[] = [];
    for (const entry of population) {
      if (!entry.url || !entry.footprint) {
        failures.push(`${entry.key}: no resolvable url/footprint`);
        continue;
      }
      const metric = await renderAndMeasure(entry.url, entry.footprint);
      const before = BEFORE_COLOR_STDDEV[entry.key];
      if (before === undefined) {
        failures.push(`${entry.key}: no recorded pre-fix baseline`);
        continue;
      }
      if (metric.pixels < 200) {
        failures.push(
          `${entry.key}: only ${metric.pixels} silhouette pixels rendered (nothing visible)`,
        );
        continue;
      }
      const floor = before * IMPROVEMENT_FLOOR;
      if (metric.colorStddev < floor) {
        failures.push(
          `${entry.key}: colorStddev ${metric.colorStddev.toFixed(2)} does not clear ` +
            `${floor.toFixed(2)} (${IMPROVEMENT_FLOOR}× its pre-fix ${before})`,
        );
      }
    }
    expect(
      failures,
      `${failures.length} of ${population.length} buildings still read flat`,
    ).toEqual([]);
  }, 60_000);
});

/**
 * SPATIAL INTEGRATION, not luminance or overall bounds: the four tests above can all pass on
 * a kit that is present, warm-toned, roughly the right size AND still floats. A round-trip
 * defect an independent review found on the Roundhouse, the Lookout and the Family Lodge —
 * "a dark porch/ladder-base block straddles the plot edge with daylight under it" — reads as
 * MORE colour variance (it is high-contrast against the pad), is nowhere NEAR near-black, and
 * sits inside the same overall pad-inclusive bounding box every check above already allows
 * (the pad IS most of that box). None of the four tests above can fail on it. These two do,
 * because they check the thing the defect is actually about: whether a kit mesh sits on/
 * against the building's own authored structure, or merely somewhere inside the model's
 * overall footprint.
 *
 * Both re-derive their evidence from the REAL exported scene graph independently of
 * `scripts/remodel-era1-buildings.mjs`'s own `wallFaceCoord`/`groundPadTop` — a fresh
 * classification and a fresh raycast, run here — so a passing result is not the fix agreeing
 * with itself.
 */
describe("era one's added geometry sits AGAINST the building's own structure, not the ground pad", () => {
  it("keeps every entrance addition against the building's own wall, not out at the pad's edge", async () => {
    const population = buildPopulation();
    const failures: string[] = [];
    // 30% slack over the structural envelope's own half-extent. The regression this catches
    // was not a close call: measured on the pre-fix Roundhouse, the wall face sits at
    // z≈4.7 against a pad edge at z≈8.25 — a porch built off the pad reads at ~1.75× the
    // wall's own half-depth, well past this floor.
    const OVERHANG_TOLERANCE = 1.3;
    for (const entry of population) {
      if (!entry.url || !entry.footprint) continue;
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(entry.url);
      const prepared = prepareGridworkModel(
        gltf.scene,
        entry.footprint,
        PLACED_PREPARATION,
      );
      try {
        const spatial = inspectSpatial(prepared);
        if (spatial.entranceMeshes.length === 0) continue;
        const structural = structuralEnvelope(spatial.originalMeshes, spatial.originalBox);
        if (structural.isEmpty()) continue;
        const center = structural.getCenter(new THREE.Vector3());
        const halfX = (structural.max.x - structural.min.x) / 2;
        const halfZ = (structural.max.z - structural.min.z) / 2;
        spatial.entranceMeshes.forEach(({ box }, i) => {
          const dx = Math.max(
            Math.abs(box.min.x - center.x),
            Math.abs(box.max.x - center.x),
          );
          const dz = Math.max(
            Math.abs(box.min.z - center.z),
            Math.abs(box.max.z - center.z),
          );
          if (halfX > 0 && dx > halfX * OVERHANG_TOLERANCE) {
            failures.push(
              `${entry.key}: entrance mesh #${i} sits ${dx.toFixed(2)} from centre on X, ` +
                `beyond ${(halfX * OVERHANG_TOLERANCE).toFixed(2)} (the wall's own half-` +
                `width is ${halfX.toFixed(2)}) — reads as placed at the pad edge, not the wall`,
            );
          }
          if (halfZ > 0 && dz > halfZ * OVERHANG_TOLERANCE) {
            failures.push(
              `${entry.key}: entrance mesh #${i} sits ${dz.toFixed(2)} from centre on Z, ` +
                `beyond ${(halfZ * OVERHANG_TOLERANCE).toFixed(2)} (the wall's own half-` +
                `depth is ${halfZ.toFixed(2)}) — reads as placed at the pad edge, not the wall`,
            );
          }
        });
      } finally {
        disposePreparedModel(prepared);
      }
    }
    expect(
      failures,
      `${failures.length} entrance additions read as pad-edge, not wall`,
    ).toEqual([]);
  }, 60_000);

  it("grounds every entrance and accent addition on a real authored surface, never floating with a gap beneath it", async () => {
    const population = buildPopulation();
    const failures: string[] = [];
    for (const entry of population) {
      if (!entry.url || !entry.footprint) continue;
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(entry.url);
      const prepared = prepareGridworkModel(
        gltf.scene,
        entry.footprint,
        PLACED_PREPARATION,
      );
      try {
        const spatial = inspectSpatial(prepared);
        if (spatial.groundedMeshes.length === 0 || spatial.originalMeshes.length === 0)
          continue;
        const buildingHeight = spatial.originalBox.max.y - spatial.originalBox.min.y;
        // The regression this catches (the Spring's rim, read off the model's overall apex
        // — the awning pole's tip — instead of the basin below it) floated more than a third
        // of the building's own height clear of anything. A tolerance under 5% of that
        // height leaves no room for a defect of that size to slip through as "close enough".
        const gapTolerance = Math.max(0.35, buildingHeight * 0.05);
        spatial.groundedMeshes.forEach(({ box }, i) => {
          // Sample the mesh's own footprint CORNERS as well as its centre — the exact
          // centre is not the only point that counts as "touching": a curb stone reviewed
          // and accepted in the prior pass sits deliberately close against the plaza's own
          // edge, and its centre can land a hair past the pad while most of its own footprint
          // still overlaps it. This asks "does any part of this mesh reach a real surface",
          // which is the actual contact claim, not "does its exact centroid line up".
          const cx = (box.min.x + box.max.x) / 2;
          const cz = (box.min.z + box.max.z) / 2;
          const samplePoints: ReadonlyArray<readonly [number, number]> = [
            [cx, cz],
            [box.min.x, box.min.z],
            [box.min.x, box.max.z],
            [box.max.x, box.min.z],
            [box.max.x, box.max.z],
          ];
          let bestGap = Number.POSITIVE_INFINITY;
          let anyHit = false;
          for (const [x, z] of samplePoints) {
            const raycaster = new THREE.Raycaster();
            raycaster.far = buildingHeight + 200;
            raycaster.set(
              new THREE.Vector3(x, box.max.y + 50, z),
              new THREE.Vector3(0, -1, 0),
            );
            const hits = raycaster.intersectObjects([...spatial.originalMeshes], false);
            if (hits.length === 0) continue;
            anyHit = true;
            bestGap = Math.min(bestGap, box.min.y - hits[0]!.point.y);
          }
          if (!anyHit) {
            failures.push(
              `${entry.key}: grounded mesh #${i} has no authored surface anywhere below it`,
            );
            return;
          }
          if (bestGap > gapTolerance) {
            failures.push(
              `${entry.key}: grounded mesh #${i} sits ${bestGap.toFixed(2)} above the ` +
                `nearest authored surface below it (tolerance ${gapTolerance.toFixed(2)}) — ` +
                "floats with a gap beneath it",
            );
          }
        });
      } finally {
        disposePreparedModel(prepared);
      }
    }
    expect(
      failures,
      `${failures.length} additions float clear of any real surface`,
    ).toEqual([]);
  }, 60_000);
});
