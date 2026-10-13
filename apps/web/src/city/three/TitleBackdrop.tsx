import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { eraLandRadius } from "../islandLand";
import { type CityLayout, computeCityLayout, SURFACE_Y } from "../worldLayout";
import { CityLighting, cityEnvironment } from "./CityLighting";
import { applyCityFraming, islandFraming } from "./cityFraming";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { StarterIsland } from "./StarterIsland";

/**
 * The ambient title-screen backdrop: the starter island rendered as a living,
 * NON-INTERACTIVE 3D scene behind the start menu. It reuses `StarterIsland` (island
 * + wheeling gulls) under the shared daylight rig — but with NO buildings and NO camera
 * controls the user can grab. A slow auto-orbit gives it life; under
 * `prefers-reduced-motion` the orbit (and the gulls) hold still and the canvas
 * renders a single frame. Default export so it can be `React.lazy`-d, keeping
 * `three` out of the jsdom unit-test graph (the title screen falls back to a static
 * gradient when WebGL is unavailable). The whole canvas is decorative + aria-hidden.
 *
 * ⚑ **It DOES carry the island's cell grid, and the line above used to claim otherwise.**
 * `StarterIsland` bakes the grid into the island group, so every surface that draws the island
 * draws the grid — this one included, since the day the grid was baked in.
 * #566 cited the old wording as
 * evidence the start menu wanted no grid and made the grid a mode, which took it out of the game
 * too; the lead reversed that (*"where did the grid/tiles go?? they need to still be in the
 * game"*), so the wording is corrected here rather than the grid gated again. If the title screen
 * should ever lose its grid, that is a composition call for this file to make on its own and it
 * does not travel through `StarterIsland`.
 *
 * ## THE ISLAND FITS THIS FRAME TOO, AND THAT WAS A COMPOSITION CALL RATHER THAN A GIVEN
 *
 * #419 fixed the city's camera and deliberately left this canvas alone, on the grounds
 * that a title screen may legitimately want its subject cropped and looming the way a
 * poster does. That is a real argument and it was answered rather than assumed
 * (`work-log/gabe/2026-08-02-the-title-screen-is-a-poster-of-an-island.md`): **a poster
 * crop is COMPOSED, and this one was not.** At 1024x580 the drawn island ran 149px past
 * the bottom edge while leaving 60px of empty sky above its far shore — the whole crop on
 * one side, because the projection of a disc seen at this tilt lands 105px BELOW the
 * middle of the screen and nothing was correcting for it. `BACKDROP_DISTANCE_RATIO` says
 * as much: it was pulled to 1.2 *"so the whole island reads"*, which is this file asking
 * for a fit and missing it by a shore. Ratifying that as composition would have been
 * ratifying an accident.
 *
 * And it costs the picture less than it looks. Fitting takes the GRASS disc from 100% of
 * the frame's height to 82%, and what buys the difference is shore rather than sea — the
 * lagoon band is 3%, 17px. Measured against the menu card, the island's whole outline
 * then lands in the gaps the card leaves: its far arc at y 17-36 against a panel top of
 * 95, its near beach at 510-563 against a panel bottom of 485, its widest points at
 * x 167 and 857 against a card spanning 232-792. So the fit shows MORE island outline
 * than the crop did, not less, and the tagline the card carries — *"Build your island"* —
 * now has an island behind it.
 */

/** Ambient azimuth drift (radians/sec) — a slow, calm orbit around the island. */
const DRIFT_SPEED = 0.045;
/**
 * A slightly LONGER LENS than the city's, and since the framing below seats the island
 * that is now all it is.
 *
 * It used to be the fit attempt — *"pull back a touch past the city's default framing so
 * the whole island reads"* — and as a fit it does not work: a camera pulled straight back
 * is still aimed at the island's centre, so it shrinks the overflow without addressing the
 * off-centring that causes it, and 1.2 leaves 149px of near shore off a 580px viewport.
 * The fit is `islandFraming`'s now, which is why this is kept rather than dropped: with
 * the framing on, 1.0 and 1.2 draw the island at exactly the SAME size (both bind on the
 * same vertical fit), so the only thing this ratio still buys is how oblique the disc
 * looks — an effective 38.8° against the city's 47.1°. A flatter, longer lens is what a
 * poster wants, it is what shipped, and it needs less widening to fit (1.23x against
 * 1.52x), which keeps `islandFraming`'s zoom ceiling clear on far more viewports.
 */
const BACKDROP_DISTANCE_RATIO = 1.2;
/**
 * The backdrop's field of view. ONE constant for the `<Canvas>`'s camera and for the
 * framing that measures through it: a framing computed at a different fov from the camera
 * it is applied to is a mis-frame that looks like a tuning problem.
 */
const BACKDROP_FOV = 32;

/**
 * The layout the backdrop's camera sits on — the city's, on the longer lens above.
 *
 * ONE object for the camera AND for the framing, which is the point of returning a layout
 * rather than multiplying the ratio in at each use: `islandFraming` fits the island for the
 * distance it is handed, so the moment the camera's distance and the framing's disagree the
 * island is seated for a camera that is not there.
 *
 * ## WHY IT TAKES A RADIUS NOBODY PASSES YET
 *
 * Exactly `computeCityLayout`'s own reason, one layer up. Everything downstream is derived
 * from the radius — `cameraDistance` is `radius × CAMERA_DISTANCE_RATIO × this ratio`, and
 * `islandFraming` re-derives the frame from both — so the backdrop follows a growing island
 * with nothing re-tuned, and `titleBackdropFraming.test.ts` drives it at grass 30, 35, 46
 * and 69 to show the frame is the same picture at every one.
 *
 * It is the LAYOUT and not a `TitleBackdrop` prop on purpose. A grown island also needs its
 * lagoon re-authored (D-ERA26 makes the shore per-era art, and `computeCityLayout` refuses
 * to derive `seaRadius`), so a radius passed down here alone would frame a correct island
 * inside a lagoon too small for it and put the water's rim on screen. The era that grows
 * the island passes its radius through `computeCityLayout` and re-authors its shore; this
 * seam exists so the camera needs no second decision when it does.
 */
export function titleBackdropLayout(
  /**
   * ERA ONE'S, NAMED. This used to be `islandRadius?: number` handed straight to
   * `computeCityLayout`, so omitting it fell through that function's own default — and a
   * default that quietly meant era one is what put two of era two's guards on era one's
   * island (see `computeCityLayout`'s block). The default is gone there; the title screen
   * really is era one's starter island, so this says which one rather than not saying.
   */
  islandRadius: number = eraLandRadius("prehistoric"),
): CityLayout {
  const layout = computeCityLayout(islandRadius);
  return { ...layout, cameraDistance: layout.cameraDistance * BACKDROP_DISTANCE_RATIO };
}

/** Camera position on the fixed CoC tilt at `azimuth`, framing `layout`'s target. */
export function cameraAt(layout: CityLayout, azimuth: number): [number, number, number] {
  const [tx, ty, tz] = layout.cameraTarget;
  const r = layout.cameraDistance;
  const polar = VILLAGE_CAMERA.polarAngle;
  const s = Math.sin(polar) * r;
  return [tx + s * Math.sin(azimuth), ty + Math.cos(polar) * r, tz + s * Math.cos(azimuth)];
}

/**
 * Puts the island in the frame, and does it ONCE rather than every frame.
 *
 * The framing is `cityFraming.ts`'s one model, unchanged. The title card's CSS owns its own
 * poster placement, so this decorative camera does not become a second city camera.
 *
 * ## WHY THE DRIFT DOES NOT NEED IT RECOMPUTED
 *
 * The ambient camera orbits. The framing does not have to follow, because the island's
 * projection is INVARIANT under that orbit: the drift is a rotation about the world's Y
 * axis through the camera's target, at a fixed polar angle and a fixed distance, so every
 * azimuth is the same picture of a rotationally symmetric disc.
 * `titleBackdropFraming.test.ts` measures that through real `THREE.PerspectiveCamera`s
 * over a full turn rather than arguing it, which is what makes a static view offset the
 * right shape here instead of a `useFrame` hook.
 *
 * `invalidate()` is not optional: under `prefers-reduced-motion` the canvas is
 * `frameloop="demand"` and has already drawn its single frame by the time this effect
 * runs, so without it a reduced-motion visitor gets the unframed picture and nothing ever
 * asks for another.
 */
function BackdropFrame({ layout }: { layout: CityLayout }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }
    const view = { width: size.width, height: size.height };
    applyCityFraming(camera, islandFraming({ view, layout, fov: BACKDROP_FOV }), view);
    invalidate();
    return () => {
      camera.clearViewOffset();
    };
  }, [camera, invalidate, layout, size.height, size.width]);

  return null;
}

/**
 * Drives the ambient camera: a slow azimuth drift around the island on the fixed
 * village tilt, always looking at the island center. Under reduced motion the
 * azimuth is held (t = 0), so the camera sits still at its base heading.
 */
function AmbientCamera({
  layout,
  reducedMotion,
}: {
  layout: CityLayout;
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera);
  useFrame((state) => {
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const azimuth = VILLAGE_CAMERA.azimuthAngle + t * DRIFT_SPEED;
    const [x, y, z] = cameraAt(layout, azimuth);
    camera.position.set(x, y, z);
    camera.lookAt(layout.cameraTarget[0], layout.cameraTarget[1], layout.cameraTarget[2]);
  });
  return null;
}

export default function TitleBackdrop({ reducedMotion }: { reducedMotion: boolean }) {
  const layout = useMemo(() => titleBackdropLayout(), []);
  const env = cityEnvironment("day");
  const camera = useMemo(
    () => ({
      position: cameraAt(layout, VILLAGE_CAMERA.azimuthAngle),
      fov: BACKDROP_FOV,
      near: 0.1,
      far: layout.islandRadius * 40,
    }),
    [layout],
  );

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={reducedMotion ? "demand" : "always"}
      camera={camera}
      // Purely decorative: the menu overlay owns all interaction, so the canvas
      // never grabs pointer/scroll (and there are no controls to grab anyway).
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <color attach="background" args={[env.background]} />
      <fog
        attach="fog"
        args={[env.fog, layout.islandRadius * 3, layout.islandRadius * 20]}
      />
      <CityLighting islandRadius={layout.islandRadius} variant="day" />
      <StarterIsland layout={layout} reducedMotion={reducedMotion} />
      <ContactShadows
        position={[0, SURFACE_Y + 0.02, 0]}
        scale={layout.islandRadius * 2.2}
        blur={2.6}
        far={16}
        opacity={0.34}
        color="#1d4b46"
        frames={reducedMotion ? 1 : Infinity}
      />
      <AmbientCamera layout={layout} reducedMotion={reducedMotion} />
      <BackdropFrame layout={layout} />
    </Canvas>
  );
}
