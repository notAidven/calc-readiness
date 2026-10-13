import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { type ReactElement, type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  buildForum,
  FLOOR_ACROSS,
  SEA_ACROSS,
  SEA_LEVEL,
  SUCCESSION_CAMERA,
} from "../../succession/successionForum";
import {
  SUCCESSION_FORUM,
  type SuccessionForum,
  successionStands,
} from "../../succession/successionStands";
import type { SuccessionBoardView } from "../../succession/successionView";
import type { OrbitControlsLike } from "./applyOrbit";
import { applyCityFraming, type ViewOffsetCamera } from "./cityFraming";
import { atmosphereFogRange, atmosphereHex } from "./crisis/atmosphere";
import { forumCameraDistance, forumFraming } from "./forumFraming";
import {
  ASSEMBLY_SUPPORTER_NAME,
  BASIN_WATER_NAME,
  CLAIM_POST_NAME,
  FIGURE_NAME,
  OPENING_BAR_NAME,
  PLINTH_HEIGHT,
  SHUTTER_NAME,
} from "./successionScene";
import { SUCCESSION_SCENE_TONES as S, SUCCESSION_LIGHT } from "./successionTones";

/**
 * **THE SUCCESSION, ON AN ISLAND — the crisis's own scene, on its own canvas.**
 *
 * ## WHY THIS IS NOT THREADED THROUGH `CityCanvasHost`
 *
 * Era one's winter is dressed onto the city island: `CityCanvasHost` carries eight winter-shaped
 * props and `CityScene` reads them. That was right for the first crisis and it is the wrong
 * pattern for the second, third and fourth — three more crises would put twenty-four more props
 * on one shared component, and three people building them at once would all be editing the same
 * two files.
 *
 * So a crisis owns its scene. This mounts its own `<Canvas>`, its own four lights out of its own
 * registered preset, and its own procedural geometry, and it edits neither `CityScene.tsx` nor
 * `CityCanvasHost.tsx`. **The cost is that this island is the dispute's forum rather than the
 * player's own city**, which is honest for era four in a way it would not be for era one: a
 * Succession district has no position, so there is no player city layout for one to be laid over.
 *
 * ## THE FOUR LIGHTS ARE THE REGISTERED PRESET AND NOTHING ELSE
 *
 * `SUCCESSION_LIGHT` — high, hard and still. The key is raised close to overhead and keeps its
 * full `shadowIntensity` where era one drops its to 0.55, and that is not a preference: **every
 * mark on this island is a groove, and a groove is read by the shadow lying inside it.** The
 * fog's near plane is pushed OUT rather than pulled in, so everything is visible and nobody will
 * say what they intend.
 *
 * ## AND NOTHING ON SCREEN DECIDES ANYTHING
 *
 * The board arrives projected and the stands arrive computed; this only mounts them. A pick names
 * a district by reading the id off the group it was built for, so an allegiance is never a
 * function of where a ray landed.
 */

/* -------------------------------------------------------------------------- */
/* M23: ambient motion, and there is almost none                              */
/* -------------------------------------------------------------------------- */

/**
 * **THE TWO THINGS THAT MOVE, AND THE CLAUSE THAT MATTERS MOST IS THE ONE ABOUT WHAT DOES NOT.**
 *
 * §2.6 calls era four's crisis the stillest of the nine. *"The basin's water moves and the block
 * in the crane's sling turns slightly, and nothing else in the city does."* So: a slow rise and
 * fall on the basin's surface, and a slight turn on a block hanging in a sling. No smoke, no
 * flags, no crowd, no birds.
 *
 * **NOTHING THAT MOVES MAY ADVANCE THE ENCOUNTER**, and it matters more here than anywhere else,
 * because era four has a cycle and *"a cycle that appeared to turn on its own would read as a
 * timer"*. That is structural rather than promised: this component is handed a scene graph and a
 * frame interval, and the only things in scope are a `position.y` and a `rotation.y`. There is no
 * dispatch, no reducer and no state setter anywhere it could reach, so no amount of elapsed time
 * can move a district.
 *
 * ## REDUCED MOTION HOLDS A STILL FRAME RATHER THAN REMOVING THE OBJECTS
 *
 * Era one's snow and smoke *"hold a still frame under `prefers-reduced-motion` rather than
 * disappearing"*, and the same rule applies. Under reduced motion this component is not mounted,
 * so the basin's water sits at the level `buildBasin` gave it and the hoisted block hangs square.
 * Both objects are still there and both are the same objects; what goes is the animation.
 */
function SuccessionAmbient({ scene }: { readonly scene: THREE.Group }): null {
  const water = useMemo(() => scene.getObjectByName(BASIN_WATER_NAME) ?? null, [scene]);
  // Whatever is hanging in a sling, marked as such by whoever built it. Read off `userData`
  // rather than off a name, so the rig cannot animate a block standing on the ground by
  // matching the wrong string.
  const blocks = useMemo(() => {
    const found: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.userData.hoisted === true) {
        found.push(child);
      }
    });
    return found;
  }, [scene]);
  const rest = useRef<number>(water?.position.y ?? 0);
  const since = useRef(0);

  useFrame((_state, delta) => {
    // `delta` is a frame interval and never a wall clock. What it accumulates drives a height
    // and an angle, and no board state is reachable from this scope.
    since.current += delta;
    if (water) {
      water.position.y = rest.current + Math.sin(since.current * 1.1) * 0.035;
    }
    for (const [index, block] of blocks.entries()) {
      // "Turns SLIGHTLY". A block swinging would read as a wrecking ball, which is the one
      // confusion a stone hanging in a sling is most exposed to.
      block.rotation.y = Math.sin(since.current * 0.55 + index) * 0.07;
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* The frame                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * **FIT THE FORUM TO THE CANVAS IT IS IN.**
 *
 * `CityScene` has done this for the island since it was written and the Succession never got it,
 * which is why the arc ran off both sides of a 1024x580 window while looking perfectly framed on
 * the lead's much wider one. `forumFraming.ts` holds the argument and the arithmetic; this
 * is the twelve lines that put the answer on the camera.
 *
 * It is a projection offset and not a camera move, so the controls' target, distance and heading
 * are untouched and there is nothing to restore: the player's own zoom still dollies, and a pick
 * still lands on the object under it because `Raycaster.setFromCamera` unprojects through the
 * same matrix. See `applyCityFraming`'s docblock for why all three numbers ride one call.
 */
function SuccessionFrame(): null {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const view = { width: size.width, height: size.height };
    /*
     * The canvas is full-bleed now. On a wide screen the civic rail occupies the left side,
     * so fit the forum into the strip it leaves rather than centring half the city behind an
     * opaque panel. Below 780px the rail is a bottom sheet and there is no horizontal occlusion.
     */
    const occludedLeft = size.width > 780 ? Math.min(420, size.width * 0.42) + 28 : 0;
    applyCityFraming(
      camera as unknown as ViewOffsetCamera,
      forumFraming({ view, occludedLeft }),
      view,
    );
    camera.updateProjectionMatrix();
    return () => {
      (camera as unknown as ViewOffsetCamera).clearViewOffset();
      camera.updateProjectionMatrix();
    };
  }, [camera, size.width, size.height]);

  return null;
}

export type SuccessionSceneCueKind = "rival-claim" | "rally" | "reopen" | "proposal";

export interface SuccessionSceneCue {
  readonly token: string;
  readonly kind: SuccessionSceneCueKind;
  readonly districtId: string;
  readonly label: string;
}

function cuePosition(
  view: SuccessionBoardView,
  forum: SuccessionForum,
  districtId: string,
): THREE.Vector3 | null {
  const ids = view.districts.map((district) => district.id);
  const stand = successionStands(ids, forum).find(
    (candidate) => candidate.district_id === districtId,
  );
  if (!stand) {
    return null;
  }
  // Between the plinth and its civic building: the whole ward, not one prop, is the subject.
  return new THREE.Vector3(
    THREE.MathUtils.lerp(stand.plinth.x, stand.civic.x, 0.38),
    0.8,
    THREE.MathUtils.lerp(stand.plinth.z, stand.civic.z, 0.38),
  );
}

/**
 * Camera staging driven only by reducer state.
 *
 * A cue moves the camera to the affected ward. Returning to answering or settling returns to
 * the civic-quarter master. Reduced motion snaps to the same frames. No timer can advance the
 * battle because this component receives no dispatcher.
 */
function SuccessionDirector({
  controlsRef,
  view,
  forum,
  cue,
  phase,
  reducedMotion,
}: {
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
  readonly view: SuccessionBoardView;
  readonly forum: SuccessionForum;
  readonly cue: SuccessionSceneCue | null;
  readonly phase: "ready" | "answering" | "response" | "settled";
  readonly reducedMotion: boolean;
}): null {
  const camera = useThree((state) => state.camera);
  const motion = useRef<{
    elapsed: number;
    duration: number;
    fromCamera: THREE.Vector3;
    toCamera: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null>(null);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    const key = cue?.token ?? `wide-${phase}`;
    if (previous.current === key) {
      return;
    }
    previous.current = key;

    const currentTarget = new THREE.Vector3(
      controls.target.x,
      controls.target.y,
      controls.target.z,
    );
    const currentCamera = new THREE.Vector3(
      controls.object.position.x,
      controls.object.position.y,
      controls.object.position.z,
    );
    const target =
      cue === null
        ? new THREE.Vector3(0, 0, -3.6)
        : (cuePosition(view, forum, cue.districtId) ?? currentTarget);
    const dolly = cue === null ? forumCameraDistance() : FLOOR_ACROSS * 1.34;
    const ray = currentCamera.clone().sub(currentTarget).normalize();
    const destination = target.clone().addScaledVector(ray, dolly);

    if (reducedMotion) {
      controls.target.x = target.x;
      controls.target.y = target.y;
      controls.target.z = target.z;
      controls.object.position.x = destination.x;
      controls.object.position.y = destination.y;
      controls.object.position.z = destination.z;
      controls.update();
      camera.updateProjectionMatrix();
      return;
    }
    motion.current = {
      elapsed: 0,
      duration: cue === null ? 0.9 : 1.25,
      fromCamera: currentCamera,
      toCamera: destination,
      fromTarget: currentTarget,
      toTarget: target,
    };
  }, [camera, controlsRef, cue, forum, phase, reducedMotion, view]);

  useFrame((_state, delta) => {
    const controls = controlsRef.current;
    const active = motion.current;
    if (!controls || !active) {
      return;
    }
    active.elapsed += Math.min(delta, 0.05);
    const progress = Math.min(1, active.elapsed / active.duration);
    const eased = 1 - (1 - progress) ** 3;
    const target = active.fromTarget.clone().lerp(active.toTarget, eased);
    const position = active.fromCamera.clone().lerp(active.toCamera, eased);
    controls.target.x = target.x;
    controls.target.y = target.y;
    controls.target.z = target.z;
    controls.object.position.x = position.x;
    controls.object.position.y = position.y;
    controls.object.position.z = position.z;
    controls.update();
    if (progress >= 1) {
      motion.current = null;
    }
  });

  return null;
}

/** Raise only the state carriers that arrived on this reducer beat. */
function SuccessionStateMotion({
  scene,
  cue,
  reducedMotion,
}: {
  readonly scene: THREE.Group;
  readonly cue: SuccessionSceneCue | null;
  readonly reducedMotion: boolean;
}): null {
  const active = useRef<{
    elapsed: number;
    objects: {
      object: THREE.Object3D;
      y: number;
      scaleY: number;
      scaleXZ: number;
    }[];
  } | null>(null);

  useEffect(() => {
    if (reducedMotion || cue === null || cue.kind === "proposal") {
      active.current = null;
      return;
    }
    const district = scene.getObjectByName(`succession-district-${cue.districtId}`);
    if (!district) {
      return;
    }
    const objects: {
      object: THREE.Object3D;
      y: number;
      scaleY: number;
      scaleXZ: number;
    }[] = [];
    district.traverse((object) => {
      const arriving =
        object.name === FIGURE_NAME ||
        object.name === ASSEMBLY_SUPPORTER_NAME ||
        (cue.kind === "rival-claim" &&
          (object.name === SHUTTER_NAME ||
            object.name === OPENING_BAR_NAME ||
            object.name === CLAIM_POST_NAME));
      if (!arriving) {
        return;
      }
      objects.push({
        object,
        y: object.position.y,
        scaleY: object.scale.y,
        scaleXZ: object.scale.x,
      });
      object.position.y -= object.name === FIGURE_NAME ? PLINTH_HEIGHT * 0.85 : 0.45;
      object.scale.set(object.scale.x * 0.72, object.scale.y * 0.18, object.scale.z * 0.72);
    });
    active.current = { elapsed: 0, objects };
  }, [cue, reducedMotion, scene]);

  useFrame((_state, delta) => {
    const motion = active.current;
    if (!motion) {
      return;
    }
    motion.elapsed += Math.min(delta, 0.05);
    const progress = Math.min(1, motion.elapsed / 0.72);
    const eased = 1 - (1 - progress) ** 3;
    for (const item of motion.objects) {
      item.object.position.y = THREE.MathUtils.lerp(
        item.y - (item.object.name === FIGURE_NAME ? PLINTH_HEIGHT * 0.85 : 0.45),
        item.y,
        eased,
      );
      item.object.scale.set(
        THREE.MathUtils.lerp(item.scaleXZ * 0.72, item.scaleXZ, eased),
        THREE.MathUtils.lerp(item.scaleY * 0.18, item.scaleY, eased),
        THREE.MathUtils.lerp(item.scaleXZ * 0.72, item.scaleXZ, eased),
      );
    }
    if (progress >= 1) {
      active.current = null;
    }
  });
  return null;
}

function SuccessionWorldLabel({
  view,
  forum,
  cue,
}: {
  readonly view: SuccessionBoardView;
  readonly forum: SuccessionForum;
  readonly cue: SuccessionSceneCue | null;
}): ReactElement | null {
  const threat = view.districts.find((district) => district.decides_next);
  const districtId = cue?.districtId ?? threat?.id;
  if (!districtId) {
    return null;
  }
  const at = cuePosition(view, forum, districtId);
  if (!at) {
    return null;
  }
  return (
    <Html
      center
      position={[at.x, at.y + 4.8, at.z]}
      wrapperClass="sx-world-label-wrap"
      zIndexRange={[30, 20]}
    >
      <span className="sx-world-label" data-kind={cue?.kind ?? "threat"}>
        {cue?.label ?? "Rival moves next"}
      </span>
    </Html>
  );
}

/* -------------------------------------------------------------------------- */
/* The canvas                                                                 */
/* -------------------------------------------------------------------------- */

export interface SuccessionIslandProps {
  readonly view: SuccessionBoardView;
  /** Holds the two ambient motions as a still frame. Never removes an object. */
  readonly reducedMotion?: boolean;
  /** The reducer event the camera and arriving state carriers are staging. */
  readonly cue?: SuccessionSceneCue | null;
  readonly phase?: "ready" | "answering" | "response" | "settled";
  /** Handed the live controls so a harness can drive the player's own camera buttons. */
  readonly controlsRef?: RefObject<OrbitControlsLike | null>;
  /** A pick on a district's furniture, by ID. There is no place in this callback. */
  readonly onPickDistrict?: (districtId: string) => void;
  readonly forum?: SuccessionForum;
}

function SuccessionForumGroup({
  view,
  reducedMotion,
  forum,
  cue,
  onPickDistrict,
}: {
  readonly view: SuccessionBoardView;
  readonly reducedMotion: boolean;
  readonly forum: SuccessionForum;
  readonly cue: SuccessionSceneCue | null;
  readonly onPickDistrict?: (districtId: string) => void;
}): ReactElement {
  const scene = useMemo(() => buildForum(view, forum), [view, forum]);

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: <primitive> is a react-three-fiber
          3D object rather than a DOM element. The canvas is decoration; the district list in
          `SuccessionSurface` is the keyboard-operable board and is the accessible way to reach
          every district. */}
      <primitive
        object={scene}
        onClick={(event: { object: THREE.Object3D; stopPropagation: () => void }) => {
          if (!onPickDistrict) {
            return;
          }
          // Walk UP to whichever group was built for a district and read its id. A raycast gives
          // a mesh; what a pick MEANS is the district that mesh belongs to, and that is an
          // ancestor's name rather than anything about where the hit landed.
          let node: THREE.Object3D | null = event.object;
          while (node !== null) {
            const id = node.userData.districtId;
            if (typeof id === "string") {
              event.stopPropagation();
              onPickDistrict(id);
              return;
            }
            node = node.parent;
          }
        }}
      />
      {!reducedMotion && <SuccessionAmbient scene={scene} />}
      <SuccessionStateMotion scene={scene} cue={cue} reducedMotion={reducedMotion} />
      <SuccessionWorldLabel view={view} forum={forum} cue={cue} />
    </>
  );
}

/**
 * The scene's four lights, out of the registered preset and out of nothing else.
 *
 * Positions are the preset's `posRatio` triples against the drawn floor, exactly as era one's are
 * against the island: a literal would stop scaling the day the forum is resized.
 */
function SuccessionLights(): ReactElement {
  const key = SUCCESSION_LIGHT.key;
  const fill = SUCCESSION_LIGHT.fill;
  const span = FLOOR_ACROSS;
  return (
    <>
      <hemisphereLight
        args={[
          atmosphereHex(SUCCESSION_LIGHT.hemi.sky),
          atmosphereHex(SUCCESSION_LIGHT.hemi.ground),
          SUCCESSION_LIGHT.hemi.intensity,
        ]}
      />
      <ambientLight
        color={atmosphereHex(SUCCESSION_LIGHT.ambient.color)}
        intensity={SUCCESSION_LIGHT.ambient.intensity}
      />
      <directionalLight
        castShadow
        color={atmosphereHex(key.color)}
        intensity={key.intensity}
        shadow-intensity={key.shadowIntensity}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-far={span * 4}
        /*
         * **THE BIAS, AND THIS ISLAND SHIPPED WITHOUT ANY.**
         *
         * `CityLighting` has carried `-0.0006` and `0.02` since it was written; this canvas is a
         * separate mount and never got them, which is a defect rather than a difference — and this
         * is the worst island in the game to have it on, because `SUCCESSION_LIGHT` holds
         * `shadowIntensity` at 1 and this crisis draws its detail in RECESSES a few hundredths
         * deep. A 30-unit shadow camera over a 2048 map is a texel of about 0.029 world units, and
         * a mark cut 0.045 into a face is one and a half texels: measured on a frame, the claim
         * post's marble skin came back mid-grey because its own core, standing 0.045 behind it, was
         * shadowing it. See `docs/design-refs/era4-claim-post/README.md`.
         *
         * `normalBias` is larger than the city's because the shadow camera is larger — the city
         * frames one island at `half`, this frames a 30-unit forum — so a texel here covers more
         * ground and needs more slope offset. The sheet's own preview scaffold arrived at 0.035 for
         * a 9-unit camera, which is the same reasoning from the other end.
         */
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
        position={[key.posRatio[0] * span, key.posRatio[1] * span, key.posRatio[2] * span]}
      />
      <directionalLight
        color={atmosphereHex(fill.color)}
        intensity={fill.intensity}
        position={[
          fill.posRatio[0] * span * 0.7,
          fill.posRatio[1] * span * 0.7,
          fill.posRatio[2] * span * 0.7,
        ]}
      />
    </>
  );
}

/**
 * The shut harbour, as one sheet. It is the era's OWN water and the crisis does not re-tint it:
 * era one's lagoon goes cold because the weather changed, and nothing about era four's weather
 * changed the sea. What changed is that nothing is moving on it.
 */
function SuccessionSea(): ReactElement {
  return (
    <mesh
      receiveShadow={false}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, SEA_LEVEL, 0]}
    >
      {/* WIDE AND SHALLOW, so the edge a player sees is the FAR one and never a corner: the
          horizon has to run right across the frame, and a square sheet whose far edge only just
          spans the view puts its own corners in the top two corners of the picture. */}
      <planeGeometry args={[SEA_ACROSS * 6, SEA_ACROSS * 2]} />
      <meshStandardMaterial color={S.WATER_SLATE} flatShading roughness={0.9} />
    </mesh>
  );
}

export function SuccessionIsland({
  view,
  reducedMotion = false,
  cue = null,
  phase = "ready",
  controlsRef,
  onPickDistrict,
  forum = SUCCESSION_FORUM,
}: SuccessionIslandProps): ReactElement {
  const fog = atmosphereFogRange(SUCCESSION_LIGHT, FLOOR_ACROSS);
  const localControlsRef = useRef<OrbitControlsLike | null>(null);

  return (
    <Canvas
      shadows
      dpr={1}
      /*
       * FRAMED SO THE PORT AND THE ARC ARE BOTH IN SHOT. The districts stand on an arc in front
       * and the shut port is behind it, and the crisis's whole atmosphere is carried by a city
       * that has stopped working — so a camera that framed only the plinths would photograph the
       * mechanic and lose the reason it matters. Measured at 1024x580 against the side panel:
       * this puts the quay, the crane and every plinth inside the strip the panel leaves.
       */
      camera={{
        position: [...SUCCESSION_CAMERA.position],
        fov: SUCCESSION_CAMERA.fov,
        near: 1,
        far: FLOOR_ACROSS * 14,
      }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = SUCCESSION_LIGHT.exposure;
        scene.background = new THREE.Color(SUCCESSION_LIGHT.sky);
        scene.fog = new THREE.Fog(SUCCESSION_LIGHT.fog.color, fog.near, fog.far);
      }}
    >
      <SuccessionFrame />
      <SuccessionDirector
        controlsRef={localControlsRef}
        view={view}
        forum={forum}
        cue={cue}
        phase={phase}
        reducedMotion={reducedMotion}
      />
      <SuccessionLights />
      <SuccessionSea />
      <SuccessionForumGroup
        view={view}
        reducedMotion={reducedMotion}
        forum={forum}
        cue={cue}
        onPickDistrict={onPickDistrict}
      />
      <OrbitControls
        ref={(instance) => {
          localControlsRef.current = instance as unknown as OrbitControlsLike | null;
          if (controlsRef) {
            controlsRef.current = instance as unknown as OrbitControlsLike | null;
          }
        }}
        enableDamping={false}
        enableRotate
        // The tilt is LOCKED, exactly as the city's is: `VILLAGE_CAMERA.polarAngle` is the whole
        // reason a cut groove reads at all, and a frame taken from a friendlier angle would be
        // evidence about a camera the game does not ship. Every number is
        // `SUCCESSION_CAMERA`'s, so the framing a guard measures is the framing that mounts.
        minPolarAngle={SUCCESSION_CAMERA.polar}
        maxPolarAngle={SUCCESSION_CAMERA.polar}
        minDistance={FLOOR_ACROSS * SUCCESSION_CAMERA.nearRatio}
        maxDistance={FLOOR_ACROSS * SUCCESSION_CAMERA.farRatio}
        target={[...SUCCESSION_CAMERA.target]}
      />
    </Canvas>
  );
}

export default SuccessionIsland;
