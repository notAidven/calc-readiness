import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { EVAN_ISLAND_DESIGNS } from "../islandDesign";
import { buildEvanIslandGroup } from "./evanIslandGeometry";

const SHOTS = Boolean(import.meta.env.VITE_EVAN_ISLAND_SHOTS);
const OUTPUT = "output/design-review/evan-islands";
const VIEWPORT = { width: 1024, height: 580 } as const;
const SOURCE_CAMERA = { theta: 0.72, phi: 1.12, radius: 102, targetY: 2, fov: 30 } as const;
type EvanSourceEraId = Exclude<keyof typeof EVAN_ISLAND_DESIGNS, "prehistoric">;
const SOURCE_SKIES: Readonly<Record<EvanSourceEraId, readonly [string, string, string]>> = {
  neolithic: ["#F6EDD8", "#EEE1C4", "#E0CFAB"],
  bronze_age: ["#F7EFD9", "#EFE3C2", "#DFCDA4"],
  classical: ["#F6F1E1", "#EDE6D0", "#DCD3B8"],
  medieval: ["#EFEEDC", "#E2E2CB", "#CFD1B4"],
  renaissance: ["#F2F0E2", "#E6E4D2", "#D3D2BB"],
  industrial: ["#EDEBE4", "#DEDDD5", "#C9C8C0"],
  atomic_age: ["#F4F1E4", "#E6EADF", "#CFDACE"],
  information_age: ["#EAEEF0", "#D7DEE3", "#BFCAD1"],
  cyberpunk: ["#2C2536", "#1D1B28", "#101018"],
};
let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function SourceCamera(): null {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    const sinPhi = Math.sin(SOURCE_CAMERA.phi);
    camera.position.set(
      SOURCE_CAMERA.radius * sinPhi * Math.sin(SOURCE_CAMERA.theta),
      SOURCE_CAMERA.targetY + SOURCE_CAMERA.radius * Math.cos(SOURCE_CAMERA.phi),
      SOURCE_CAMERA.radius * sinPhi * Math.cos(SOURCE_CAMERA.theta),
    );
    camera.lookAt(0, SOURCE_CAMERA.targetY, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Port({ eraId }: { readonly eraId: EvanSourceEraId }) {
  const island = useMemo(
    () =>
      buildEvanIslandGroup(EVAN_ISLAND_DESIGNS[eraId], {
        grassRadius: 27,
        seaRadius: 46,
        protectedRadius: 0,
      }),
    [eraId],
  );
  const sky = SOURCE_SKIES[eraId];
  return (
    <div
      id="evan-port-stage"
      style={{
        position: "fixed",
        inset: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
        background: `radial-gradient(125% 100% at 50% 2%, ${sky[0]} 0%, ${sky[1]} 52%, ${sky[2]} 100%)`,
      }}
    >
      <Canvas
        dpr={1}
        camera={{ fov: SOURCE_CAMERA.fov, near: 0.1, far: 900 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping;
          gl.setClearColor(0x000000, 0);
        }}
      >
        <SourceCamera />
        <ambientLight color={0xf6ecd6} intensity={0.44} />
        {/* Evan's viewer predates physically-correct light units. Three r185 removes the legacy
            π multiplier, so this is the same irradiance rather than the same now-dimmer digit. */}
        <directionalLight
          color={0xfff0d6}
          position={[-26, 44, 20]}
          intensity={0.62 * Math.PI}
        />
        <primitive object={island} />
      </Canvas>
    </div>
  );
}

function stageBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  const stage = document.getElementById("evan-port-stage");
  if (frame === null || stage === null) {
    throw new Error("the Evan source-equivalent port frame is unavailable");
  }
  const frameBox = frame.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: frameBox.left + outer.scrollX + stageBox.left,
    y: frameBox.top + outer.scrollY + stageBox.top,
    width: stageBox.width,
    height: stageBox.height,
  };
}

async function capture(filename: string): Promise<void> {
  const browser = cdp() as unknown as {
    send: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
  };
  const shot = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...stageBox(), scale: 1 },
  });
  if (!shot.data) {
    throw new Error(`Chromium returned no screenshot for ${filename}`);
  }
  if (SHOTS) {
    await commands.writeFile(`${OUTPUT}/${filename}`, shot.data, { encoding: "base64" });
  }
}

test.runIf(SHOTS)(
  "captures the typed port at the standalone source camera for eras 2–10",
  async () => {
    await page.viewport(VIEWPORT.width, VIEWPORT.height);
    const eras = (
      Object.keys(EVAN_ISLAND_DESIGNS) as Array<keyof typeof EVAN_ISLAND_DESIGNS>
    ).filter(
      (eraId): eraId is EvanSourceEraId =>
        eraId !== "prehistoric" && EVAN_ISLAND_DESIGNS[eraId].sourceEra >= 2,
    );
    for (const eraId of eras) {
      harness?.cleanup();
      harness = mount(<Port eraId={eraId} />);
      await waitFor(
        () => document.querySelector("#evan-port-stage canvas") !== null,
        `${eraId} source-equivalent port canvas`,
        20_000,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      await capture(`port-source-camera-${eraId}-1024x580.png`);
    }
    expect(eras).toHaveLength(9);
  },
  120_000,
);
