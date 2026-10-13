import { cityRosterNodeIds } from "@cr/game";
import { getEraNodes, getEraOfNode } from "@cr/skill-graph";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { CANVAS_WAIT_MS, framedTestBudget } from "../shotBudget";
import { footprintFor, type GroundPoint } from "../worldLayout";
import { PlacedBuilding } from "./PlacedBuilding";

/**
 * **AN UNMAPPED BUILDING, ON A REAL GPU: VISIBLE, DRAWN, AND CLICKABLE.**
 *
 * `unmappedBuilding.test.ts` proves the fallback BUILDS the right objects; it runs in node,
 * where nothing is ever drawn and nothing is ever picked. That leaves the two halves of the
 * defect that only a live context can answer, and they are the two halves that made it
 * dangerous:
 *
 *  1. **VISIBLE.** The meshes reach the live scene graph through R3F's own reconciler, and
 *     the renderer rasterises them — `gl.info.render.triangles` counts what the draw calls
 *     actually submitted, so a material that failed to compile or geometry the frustum
 *     culled away is a zero here. A `<group>` that was built and never attached is a zero too.
 *  2. **CLICKABLE.** `PlacedBuilding` hangs `onClick` on the named group, and R3F resolves a
 *     pointer event by RAYCASTING into the scene — so on the canvas the click target IS the
 *     geometry. A named group containing no mesh has nothing to intersect, which is why the
 *     old `null` model did not merely look wrong: it took the lesson behind the building away
 *     from the pointer, silently, with every unit test green.
 *
 * The sweep is over every node the city can place that has no `built` GLB, derived from the
 * resolver over `cityRosterNodeIds` rather than from a list here. Era 8–10 wiring moved all 24
 * late-era nodes into authored art; the exact neutral cohort is now Early Modern's six nodes.
 *
 * The final assertion is a REAL DOM CLICK through R3F's event system on one of them, because
 * "a ray from this test hits geometry" and "the handler the product wires actually fires" are
 * different claims and only the second is what a learner does.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Every node in the widest city roster, before the resolver partitions it. */
const WIDEST_ROSTER: readonly string[] = cityRosterNodeIds("cyberpunk");

/** Every node the widest roster can place that falls through to the neutral templates. */
const UNMAPPED: readonly string[] = WIDEST_ROSTER.filter(
  (nodeId) => resolveBuildingModel(nodeId, "built").kind !== "glb",
);

/** The complement: nodes with an authored built GLB. */
const MAPPED: readonly string[] = WIDEST_ROSTER.filter(
  (nodeId) => resolveBuildingModel(nodeId, "built").kind === "glb",
);

/** Enough clear space between lots that no two footprints (max 2 cells = 8u) can touch. */
const SPACING = 12;
const COLUMNS = 8;

/** A tidy grid centred on the origin, so one fixed camera frames the whole population. */
function centreFor(index: number): GroundPoint {
  const rows = Math.ceil(UNMAPPED.length / COLUMNS);
  return {
    x: ((index % COLUMNS) - (COLUMNS - 1) / 2) * SPACING,
    z: (Math.floor(index / COLUMNS) - (rows - 1) / 2) * SPACING,
  };
}

function groupFor(scene: THREE.Object3D, nodeId: string): THREE.Object3D | undefined {
  return scene.getObjectByName(`building-${nodeId}`);
}

function meshesIn(object: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      found.push(mesh);
    }
  });
  return found;
}

function renderedGeometryIdentity(object: THREE.Object3D): string {
  object.updateWorldMatrix(true, true);
  return meshesIn(object)
    .map((mesh) => {
      const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
      const positions = mesh.geometry.getAttribute("position")?.count ?? 0;
      return `${size.x.toFixed(3)}x${size.y.toFixed(3)}x${size.z.toFixed(3)}:${positions}`;
    })
    .sort()
    .join("|");
}

/** Straight down onto a lot's centre — the simplest ray that must find a building. */
function hitsFromAbove(scene: THREE.Object3D, centre: GroundPoint): THREE.Intersection[] {
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(centre.x, 400, centre.z),
    new THREE.Vector3(0, -1, 0),
  );
  return raycaster.intersectObject(scene, true);
}

/** True when `object` is `ancestor` or sits under it. */
function isUnder(object: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (node === ancestor) {
      return true;
    }
  }
  return false;
}

/**
 * **THE FOUR WAITS BELOW COULD NOT ALL BE REACHED, so one of them was doing the failing.**
 *
 * This test declared no timeout, which in browser mode means vitest's 15000ms default, and
 * its own waits summed to 8000 + 8000 + 4000 + 4000. On the runner it passed at **4233ms**
 * and failed at **11909ms** on the SAME commit — attempts 1 and 2 of run 30706860187 — and
 * the failure was `waitFor timed out: nothing was rasterised`, the 4000ms one, reached with
 * about three seconds of the test's life left. Fifty-six buildings at 640x640 through a
 * software rasteriser, on a two-core runner already running a second Chromium worker, is
 * simply not a four-second first frame on a bad draw.
 *
 * So the waits are levelled at `CANVAS_WAIT_MS` and the test is given a real box to hold
 * them: 40s of worst-case waiting inside 60s, which is what makes the LAST of them reachable
 * and therefore able to report by name. Nothing about what they assert has moved.
 */
const UNMAPPED_TEST_BUDGET_MS = framedTestBudget(2);

test("every unmapped node draws a building the renderer submits and a ray can hit", {
  timeout: UNMAPPED_TEST_BUDGET_MS,
}, async () => {
  // Floors under both halves, plus the exact current split. The GPU guard renders the one
  // remaining fallback cohort and keeps a large authored control population beside it.
  expect(WIDEST_ROSTER).toHaveLength(62);
  expect(new Set(WIDEST_ROSTER).size).toBe(WIDEST_ROSTER.length);
  expect(MAPPED.length).toBeGreaterThanOrEqual(56);
  expect(UNMAPPED).toHaveLength(6);
  expect(MAPPED.length + UNMAPPED.length).toBe(WIDEST_ROSTER.length);

  // Size and shape: every placeable node has an era, and the fallback is all and only the
  // six Early Modern nodes. Wiring or dropping one member therefore fails both count and set.
  const mappedEraIds = MAPPED.map((nodeId) => getEraOfNode(nodeId)?.id);
  const unmappedEraIds = UNMAPPED.map((nodeId) => getEraOfNode(nodeId)?.id);
  expect(mappedEraIds).not.toContain(undefined);
  expect(unmappedEraIds).not.toContain(undefined);
  expect(new Set(unmappedEraIds)).toEqual(new Set(["renaissance"]));
  const earlyModern = getEraNodes("renaissance");
  expect(earlyModern).toHaveLength(6);
  expect([...UNMAPPED].sort()).toEqual([...earlyModern].sort());

  let scene: THREE.Scene | null = null;
  let gl: THREE.WebGLRenderer | null = null;
  let cam: THREE.Camera | null = null;
  const clicked: string[] = [];

  h = mount(
    <div style={{ width: 640, height: 640 }}>
      <Canvas
        camera={{ position: [0, 190, 190], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          scene = state.scene;
          gl = state.gl;
          cam = state.camera;
        }}
      >
        <ambientLight intensity={1} />
        {UNMAPPED.map((nodeId, index) => (
          <PlacedBuilding
            key={nodeId}
            nodeId={nodeId}
            center={centreFor(index)}
            rotationY={0}
            footprint={footprintFor(nodeId)}
            model={resolveBuildingModel(nodeId, "built")}
            mastery={0}
            reducedMotion
            celebrateToken={0}
            onSelect={() => clicked.push(nodeId)}
          />
        ))}
      </Canvas>
    </div>,
  );

  await waitFor(
    () => scene !== null && gl !== null && cam !== null,
    "the canvas never created",
    CANVAS_WAIT_MS,
  );
  const liveScene = scene as unknown as THREE.Scene;
  const renderer = gl as unknown as THREE.WebGLRenderer;
  const camera = cam as unknown as THREE.Camera;

  // 1. THE NAMED GROUPS REACH THE LIVE SCENE **CARRYING GEOMETRY**, counted through the
  //    reconciler's own tree. The stage stack mounts its layers in an effect, so the wait is
  //    on the meshes rather than on the group — a group with no mesh is precisely the state
  //    this is here to rule out, and waiting on the group alone would pass over it.
  await waitFor(
    () =>
      UNMAPPED.every((nodeId) => {
        const group = groupFor(liveScene, nodeId);
        return group !== undefined && meshesIn(group).length > 0;
      }),
    "an unmapped node never reached the scene with geometry",
    CANVAS_WAIT_MS,
  );

  // 2. EACH ONE HAS REAL VOLUME. This is the assertion that was false before the fallback:
  //    the group existed, and it was empty.
  for (const nodeId of UNMAPPED) {
    const group = groupFor(liveScene, nodeId) as THREE.Object3D;
    expect(meshesIn(group).length, nodeId).toBeGreaterThan(0);
    const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    expect(size.x, nodeId).toBeGreaterThan(0);
    expect(size.y, nodeId).toBeGreaterThan(0);
    expect(size.z, nodeId).toBeGreaterThan(0);
  }
  const renderedIdentities = UNMAPPED.map((nodeId) => {
    const group = groupFor(liveScene, nodeId) as THREE.Object3D;
    return [nodeId, renderedGeometryIdentity(group)] as const;
  });
  expect(
    new Set(renderedIdentities.map(([, identity]) => identity)).size,
    `Early Modern renderer collapsed its six buildings: ${renderedIdentities
      .map(([nodeId, identity]) => `${nodeId}=${identity}`)
      .join("; ")}`,
  ).toBe(UNMAPPED.length);

  // 3. THE RENDERER ACTUALLY SUBMITTED THEM. Triangles are counted per frame, so this is
  //    what the GPU drew rather than what the scene contains.
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "nothing was rasterised",
    CANVAS_WAIT_MS,
  );
  expect(renderer.info.render.triangles).toBeGreaterThan(UNMAPPED.length);

  // 4. EACH ONE IS A RAYCAST TARGET, and the hit lands under ITS named group — which is the
  //    group `onClick` hangs on. R3F resolves every pointer event this way, so this is the
  //    mechanism and not a proxy for it.
  for (const [index, nodeId] of UNMAPPED.entries()) {
    const group = groupFor(liveScene, nodeId) as THREE.Object3D;
    const hits = hitsFromAbove(liveScene, centreFor(index));
    expect(hits.length, `${nodeId} has no raycast target`).toBeGreaterThan(0);
    expect(
      hits.some((hit) => isUnder(hit.object, group)),
      `${nodeId}'s own group was not hit`,
    ).toBe(true);
  }

  // 5. AND THE HANDLER FIRES, through R3F's own event system rather than through a ray this
  //    test aimed. One node is enough for this half: steps 1-4 are what generalise, and what
  //    is being proved here is that a hit on the neutral shell reaches `onSelect` at all.
  const target = UNMAPPED[0] as string;
  const targetGroup = groupFor(liveScene, target) as THREE.Object3D;
  const canvas = h.host.querySelector("canvas") as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();

  // Project the shell's own centre of mass to screen space, so the synthetic pointer lands
  // on geometry rather than on a guessed pixel.
  const box = new THREE.Box3().setFromObject(targetGroup);
  const point = box.getCenter(new THREE.Vector3());
  const ndc = point.clone().project(camera);
  const clientX = rect.left + ((ndc.x + 1) / 2) * rect.width;
  const clientY = rect.top + ((1 - ndc.y) / 2) * rect.height;

  for (const type of ["pointermove", "pointerdown", "pointerup", "click"] as const) {
    canvas.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: type === "pointerdown" ? 1 : 0,
      }),
    );
  }

  await waitFor(
    () => clicked.includes(target),
    `clicking ${target}'s neutral shell did not reach onSelect`,
    CANVAS_WAIT_MS,
  );
});
