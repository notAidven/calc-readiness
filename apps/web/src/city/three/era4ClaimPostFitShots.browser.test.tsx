import { Canvas } from "@react-three/fiber";
import type { ReactElement } from "react";
import type * as THREE from "three";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { civicPlacementId } from "../civic";
import { civicFootprint, resolveCivicModel } from "../civicBuildings";
import { CANVAS_WAIT_MS } from "../shotBudget";
import type { Footprint, GroundPoint } from "../worldLayout";
import { GRID_CELL } from "../worldLayout";
import { PlacedBuilding } from "./PlacedBuilding";
import { buildClaimPost, CLAIM, CLAIM_POST_NAME } from "./successionScene";

/**
 * **THE CLAIM POST, AT WORLD SCALE, BESIDE THE BUILDINGS IT ACTUALLY STANDS AT.**
 *
 * This file used to photograph a claim PLATE against the same four buildings, and that frame is
 * still in `docs/design-refs/era4-frontage/` because it is the evidence the plate was retired on:
 * `scripts/measure-era4-frontage.mjs` found the 1.05-wide slab wider than the entrance it sat
 * beside on all ten claimable buildings, and the frame is what those ratios look like.
 *
 * **The replacement owes the same evidence and it is not the same claim.** The post never touches
 * a wall, so *"does it fit the frontage"* is not a question anybody can ask about it. What can
 * still go wrong is scale: the post is authored in the forum's own frame, where
 * `buildCivicBuilding` draws a 5.75-wide civic building, and a real era-four model is
 * **contain-fitted to its plot** at anything from 0.1378 to 0.4258. So the question this frame
 * answers is whether a 0.40-square upright standing at the plot's corner reads as a marker on
 * that building at the size the city actually draws it, on the widest and the narrowest plots in
 * the set.
 *
 * **The Fountain is the case worth looking at**, and it is the one the retired rule could not
 * express at all: a 1x1 plot with no door and only arches. It gets a post at its plot corner like
 * everything else.
 *
 *   VITE_ERA4_POST_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/three/era4ClaimPostFitShots.browser.test.tsx
 */

const SHOTS = Boolean(import.meta.env.VITE_ERA4_POST_SHOTS);
const VIEW = { width: 1024, height: 580 } as const;
const NAME = "01-post-against-real-buildings";

/** The four claimable civic types, in the catalogue's own order. */
const CLAIMABLE: readonly { id: string; label: string }[] = [
  { id: "classical_public_granary", label: "Grain Dock" },
  { id: "classical_apartment_block", label: "Cottages" },
  { id: "classical_baths", label: "Baths" },
  { id: "classical_fountain", label: "Fountain" },
];

/**
 * Wide enough that no two of these plots can touch and no post can stand inside its neighbour's
 * plot, and narrow enough that the leftmost building's post — which stands off the far side of the
 * widest plot in the row — is still inside the frame. The four are 2x2, 1x2, 3x2 and 1x1, so the
 * closest approach is the Baths' 6u half-plot against the Cottages' 2u.
 */
const SPACING = 10;

function centreFor(index: number): GroundPoint {
  return { x: (index - (CLAIMABLE.length - 1) / 2) * SPACING, z: 0 };
}

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
    restore = null;
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = testViewportBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

function pngSize(base64: string): { width: number; height: number } {
  const binary = atob(base64);
  const at = (i: number): number => binary.charCodeAt(i) & 0xff;
  const read = (offset: number): number =>
    (at(offset) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3);
  expect(binary.slice(1, 4), "not a PNG").toBe("PNG");
  return { width: read(16) >>> 0, height: read(20) >>> 0 };
}

async function settle(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * One claim post at a building's plot corner, at the size the forum gives it and at no scale of
 * its own.
 *
 * **The placement rule is the whole point and it is two subtractions.** The plot is
 * `footprint * GRID_CELL` on the ground; the post stands `CLAIM.POST.inset` off its front-left
 * corner. Nothing here reads a mesh, a door, a frontage or a bay — which is exactly why it can be
 * written down for a 1x1 fountain and a 3x2 baths in the same line.
 */
function PostAt({
  centre,
  footprint,
  wallHeight,
}: {
  readonly centre: GroundPoint;
  readonly footprint: Footprint;
  readonly wallHeight: number;
}): ReactElement {
  const post = buildClaimPost("chevron", wallHeight);
  const half = {
    x: (footprint.w * GRID_CELL) / 2,
    z: (footprint.d * GRID_CELL) / 2,
  };
  return (
    <primitive
      object={post}
      position={[
        centre.x - (half.x + CLAIM.POST.inset),
        0,
        centre.z + half.z + CLAIM.POST.inset,
      ]}
    />
  );
}

function ClaimPostFitScene({
  onScene,
}: {
  readonly onScene: (scene: THREE.Scene) => void;
}): ReactElement {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#dfe6ec" }}>
      <Canvas
        camera={{ position: [0, 8.5, 37], fov: 40 }}
        gl={{ preserveDrawingBuffer: true }}
        shadows
        onCreated={(state) => {
          // Low and aimed low, so the row fills the frame rather than sitting in a band of sky —
          // and far enough back that the leftmost post is inside the left edge.
          state.camera.lookAt(0, 2.5, 0);
          state.camera.updateProjectionMatrix();
          onScene(state.scene);
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[14, 26, 12]} intensity={1.44} castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#ded5c0" />
        </mesh>
        {CLAIMABLE.map((civic, index) => {
          const footprint = civicFootprint(civic.id);
          const model = resolveCivicModel(civic.id, "built");
          if (!footprint || !model) {
            throw new Error(`${civic.id} has no footprint or no model`);
          }
          return (
            <group key={civic.id}>
              <PlacedBuilding
                nodeId={civicPlacementId(civic.id, index + 1)}
                center={centreFor(index)}
                rotationY={0}
                footprint={footprint}
                model={model}
                mastery={0}
                reducedMotion
                celebrateToken={0}
                onSelect={() => {}}
              />
              {/*
                The forum's own civic wall is 2.5, which is the height the post is sized against
                on the building the crisis draws today. Kept here so the two are comparable — and
                because the clamp means every one of these posts comes out at the same 1.05
                whatever the model measures, which is the property the frame is checking.
              */}
              <PostAt centre={centreFor(index)} footprint={footprint} wallHeight={2.5} />
            </group>
          );
        })}
      </Canvas>
    </div>
  );
}

test.runIf(SHOTS)(
  "photographs the claim post at world scale at the four claimable buildings' plot corners",
  async () => {
    await page.viewport(VIEW.width, VIEW.height);

    let scene: THREE.Scene | null = null;
    h = mount(<ClaimPostFitScene onScene={(value) => (scene = value)} />);

    await waitFor(
      () => document.querySelector("canvas") !== null,
      "no canvas mounted",
      CANVAS_WAIT_MS,
    );
    await settle(6000);

    /*
     * THE GLBs REALLY LOADED, so this is not a frame of four empty pads wearing posts.
     * `PlacedBuilding` fails CLOSED to a shared procedural shell when a model is missing, and
     * that shell is one box — so a frame of four fallbacks would look like a perfectly good frame
     * of four buildings and prove nothing about era four's art. The four real models carry 152,
     * 672, 838 and 170 meshes, so a floor well above any fallback separates the two cases.
     */
    const live = scene as THREE.Scene | null;
    expect(live, "the canvas never handed its scene out").not.toBeNull();
    let meshes = 0;
    let posts = 0;
    (live as THREE.Scene).traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes += 1;
      }
      if (child.name === CLAIM_POST_NAME) {
        posts += 1;
      }
    });
    expect(posts, "one post per claimable building").toBe(CLAIMABLE.length);
    expect(meshes, `only ${meshes} meshes: the era-four GLBs did not load`).toBeGreaterThan(
      1500,
    );

    await capture();
    await settle(1200);
    const shot = await capture();
    const size = pngSize(shot);
    expect(size.width).toBe(VIEW.width);
    expect(size.height).toBe(VIEW.height);
    // Both destinations are literals at their own call, which
    // `test/testWritesStayOutOfTheTree.test.ts` requires: it resolves each path statically to
    // decide whether the write lands in the tracked tree.
    if (SHOTS) {
      await commands.writeFile(
        `docs/design-refs/era4-claim-post/${NAME}-${VIEW.width}x${VIEW.height}.png`,
        shot,
        { encoding: "base64" },
      );
    }
    if (SHOTS) {
      await commands.writeFile(
        `output/era-04-succession/claim-post/${NAME}-${VIEW.width}x${VIEW.height}.png`,
        shot,
        { encoding: "base64" },
      );
    }
  },
  600000,
);
