import { Bounds, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * The demo reel's LIVE building model — the same Gridwork GLBs the city renders,
 * shown inside the framed reel "screen" at the current beat's build stage (a `site`
 * foundation, a `construction` scaffold, or the finished `built` model). It reuses
 * `BuildingThumb`'s lean grammar (clone the GLB, revive the flat-shaded materials
 * glTF drops, `frameloop="demand"` so it renders when the model/stage changes and
 * then idles, no shadows/orbit) — this is the reel's real-model money shot. The
 * canvas is decorative (`aria-hidden` + pointer-events off via CSS).
 *
 * Only mounted by `ReelStage` when WebGL is available; headless/no-WebGL gets the
 * static silhouette fallback instead, so this file never runs in the jsdom suite.
 */

/** Re-apply the flat-shading + emissive traits the glTF export drops (mirrors the city). */
function reviveMaterial(source: THREE.Material): THREE.Material {
  const mat = source.clone();
  if (mat instanceof THREE.MeshStandardMaterial) {
    mat.flatShading = true;
    const e = mat.emissive;
    if (e && e.r + e.g + e.b > 0) {
      mat.emissiveIntensity = 1.2;
    }
  }
  mat.needsUpdate = true;
  return mat;
}

function ReelModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const invalidate = useThree((state) => state.invalidate);
  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(reviveMaterial)
          : reviveMaterial(obj.material);
      }
    });
    return root;
  }, [gltf.scene]);

  // On-demand rendering: nudge a frame once the model (and Bounds' fit) is ready.
  // `url` stays in the deps so swapping the build stage re-fires the render.
  useEffect(() => {
    if (model) {
      invalidate();
    }
  }, [invalidate, model]);

  return <primitive object={model} />;
}

export default function ReelBuilding({ url }: { url: string }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [46, 33, 46], fov: 32, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Cool hemisphere + warm key, matching the Gridwork diorama, minus shadows. */}
      <hemisphereLight args={["#e3ecf7", "#c2c8d4", 0.95]} />
      <ambientLight color="#eef3fb" intensity={0.35} />
      <directionalLight position={[-30, 52, 32]} intensity={1.1} color="#fff3e2" />
      <directionalLight position={[28, 18, -30]} intensity={0.35} color="#bcd4e6" />
      <Suspense fallback={null}>
        {/* `key` forces a fresh auto-fit when the build stage (url) changes. */}
        <Bounds key={url} fit clip observe margin={1.25}>
          <ReelModel url={url} />
        </Bounds>
      </Suspense>
    </Canvas>
  );
}
