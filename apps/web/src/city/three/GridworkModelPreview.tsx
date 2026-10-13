import { getEraNodes } from "@cr/skill-graph";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";

import { D1_SKILL_IDS, nodeFilePrefix } from "../buildingAssets";
import {
  CIVIC_ART,
  CIVIC_TYPE_IDS,
  civicBuildingName,
  civicFilePrefix,
  civicFootprint,
  ERA_EIGHT_CIVIC_TYPE_IDS,
  ERA_FIVE_CIVIC_TYPE_IDS,
  ERA_FOUR_CIVIC_TYPE_IDS,
  ERA_NINE_CIVIC_TYPE_IDS,
  ERA_SEVEN_CIVIC_TYPE_IDS,
  ERA_TEN_CIVIC_TYPE_IDS,
  ERA_THREE_CIVIC_TYPE_IDS,
  ERA_TWO_CIVIC_TYPE_IDS,
} from "../civicBuildings";
import { buildingDisplayName, CURRENT_ERA_ID } from "../eraDressing";
import {
  DEFAULT_TOWN_HALL_DOMAIN,
  TOWN_HALL_DESCRIPTORS,
  TOWN_HALL_ERA_MODELS,
  TOWN_HALL_FOOTPRINT,
} from "../townHall";
import { type Footprint, footprintFor, GRID_CELL } from "../worldLayout";
import { retainPreparedModel } from "./modelPreparation";
import { prepareModel } from "./PlacedBuilding";

/**
 * DEV / PREVIEW ONLY — a model picker for inspecting one Gridwork GLB at a time in
 * isolation, with a free orbit the live city does not allow (its tilt is locked).
 * The city itself renders the same GLBs through `three/CityScene.tsx`; this is a
 * bench for checking a single asset, not a preview of an unwired renderer. Open it
 * with `?three` on the dev URL.
 *
 * All 3D/R3F code lives here in `apps/web` — `@cr/game` stays pure.
 */

/**
 * Bundled URLs for every exported model, keyed by basename (`num-s-built.glb`).
 *
 * TWO GLOBS, BOTH NON-RECURSIVE, because the hub's art does not live where everything
 * else's does: the three `townhall-*` stage GLBs sit in a `townhall/` SUBDIRECTORY on
 * purpose, so that `buildingAssets.ts`'s pinned skill count stays exact (`townHall.ts`
 * spells that out). A bench that globbed only the flat directory could not show the hub at
 * all — which is how era two's Shrine would have been committed unphotographed.
 *
 * This registry is the BENCH's own and is deliberately not partitioned the way the runtime
 * ones are: here every basename is a subject to inspect, so the `civic-` exclusion the
 * skill glob carries would only hide four of them. It is never read by the city.
 * `import.meta.glob` requires literal patterns, hence two calls rather than one array.
 */
const MODEL_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  [
    ...Object.entries(
      import.meta.glob("../art/models/*.glb", {
        query: "?url",
        import: "default",
        eager: true,
      }) as Record<string, string>,
    ),
    ...Object.entries(
      import.meta.glob("../art/models/townhall/*.glb", {
        query: "?url",
        import: "default",
        eager: true,
      }) as Record<string, string>,
    ),
  ].map(([path, url]) => [path.split("/").pop() as string, url]),
);

interface PreviewOption {
  readonly prefix: string;
  readonly label: string;
  readonly footprint: Footprint;
}

/**
 * The picker's options, DERIVED rather than transcribed. This used to be a second
 * hard-coded copy of the display names, and two copies of a name set is how they
 * drift: it still said "City Bank" and "Clock Tower" after the live city had been
 * re-dressed to era one. It now reads `D1_SKILL_IDS` for the nodes, `nodeFilePrefix`
 * for the file stem the loader below builds, and `buildingDisplayName` for the label,
 * so a rename or a new era's dressing reaches this bench for free (D-ERA29).
 *
 * The label carries the era DRESSING as well as the stable name, and that is the
 * point of the bench rather than an inconsistency: the GLBs on disk ARE era one's
 * art, so a picker that offers "Dwellings" without "Hut Cluster" would not tell the
 * person inspecting the asset which era's asset they are looking at. It reads
 * `CURRENT_ERA_ID` because the non-recursive model glob only resolves one era's files
 * (see `buildingAssets.ts`) — when D-ERA22 makes resolution era-aware, this picker
 * gains an era control and passes it here.
 */
const NODES: readonly PreviewOption[] = D1_SKILL_IDS.map((nodeId) => ({
  prefix: nodeFilePrefix(nodeId),
  label: `${nodeId} · ${buildingDisplayName(nodeId, CURRENT_ERA_ID)}`,
  footprint: footprintFor(nodeId),
}));

/**
 * ERA TWO'S FIVE SKILL BUILDINGS, and this bench is the ONLY surface that can show them.
 *
 * They cannot be photographed in the city and it is not worth trying: era two's nodes are
 * `product_scope: "target"`, the MVP count is pinned at six, and `CURRENT_ERA_ID` derives
 * from `ERA_SEQUENCE[0]`, so there is no era-two city to put them in. On top of that
 * `resolveBuildingModel` returns `null` for any node absent from `D1_NODE_BUILDINGS`, and
 * naming era two's buildings there is a dressing ruling rather than plumbing. So until
 * that lands, the fifteen GLBs are bundled and unreachable everywhere except here.
 *
 * DERIVED from `ERA_SEQUENCE`, like the row above, so a node moved between eras reaches
 * this picker for free. The label carries the node id and the era rather than a display
 * name, deliberately: era two HAS no `eraDressing` row yet, and inventing one here would
 * put a second, unratified copy of those names in the tree — which is exactly the drift
 * the row above was rewritten to remove.
 */
const ERA_TWO_NODES: readonly PreviewOption[] = getEraNodes("neolithic").map((nodeId) => ({
  prefix: nodeFilePrefix(nodeId),
  label: `${nodeId} · era two (Neolithic)`,
  footprint: footprintFor(nodeId),
}));

/** Era three's five exported skill buildings, derived from the same era roster as the city. */
const ERA_THREE_NODES: readonly PreviewOption[] = getEraNodes("bronze_age").map(
  (nodeId) => ({
    prefix: nodeFilePrefix(nodeId),
    label: `${nodeId} · ${buildingDisplayName(nodeId, "bronze_age")}`,
    footprint: footprintFor(nodeId),
  }),
);

/** Era four's five exported skill buildings, derived from the current Classical roster. */
const ERA_FOUR_NODES: readonly PreviewOption[] = getEraNodes("classical").map((nodeId) => ({
  prefix: nodeFilePrefix(nodeId),
  label: `${nodeId} · ${buildingDisplayName(nodeId, "classical")}`,
  footprint: footprintFor(nodeId),
}));

/** Era five's five exported Medieval skill buildings, keyed by current RAT node ids. */
const ERA_FIVE_NODES: readonly PreviewOption[] = getEraNodes("medieval").map((nodeId) => ({
  prefix: nodeFilePrefix(nodeId),
  label: `${nodeId} · ${buildingDisplayName(nodeId, "medieval")}`,
  footprint: footprintFor(nodeId),
}));

/** Era seven's six Industrial skill buildings, including both shared-mass pairs. */
const ERA_SEVEN_NODES: readonly PreviewOption[] = getEraNodes("industrial").map(
  (nodeId) => ({
    prefix: nodeFilePrefix(nodeId),
    label: `${nodeId} · ${buildingDisplayName(nodeId, "industrial")}`,
    footprint: footprintFor(nodeId),
  }),
);

const ERA_EIGHT_NODES: readonly PreviewOption[] = getEraNodes("atomic_age").map(
  (nodeId) => ({
    prefix: nodeFilePrefix(nodeId),
    label: `${nodeId} · ${buildingDisplayName(nodeId, "atomic_age")}`,
    footprint: footprintFor(nodeId),
  }),
);

const ERA_NINE_NODES: readonly PreviewOption[] = getEraNodes("information_age").map(
  (nodeId) => ({
    prefix: nodeFilePrefix(nodeId),
    label: `${nodeId} · ${buildingDisplayName(nodeId, "information_age")}`,
    footprint: footprintFor(nodeId),
  }),
);

const ERA_TEN_NODES: readonly PreviewOption[] = getEraNodes("cyberpunk").map((nodeId) => ({
  prefix: nodeFilePrefix(nodeId),
  label: `${nodeId} · ${buildingDisplayName(nodeId, "cyberpunk")}`,
  footprint: footprintFor(nodeId),
}));

/**
 * The four BOUGHT civic buildings, offered in the same picker as the six earned ones.
 *
 * They are here because this bench is the ONLY surface that can show them yet: they have
 * no purchase flow, no session row and no placement, so nothing in the live city resolves
 * one. Until that lands, `?three` is where you check that the twelve GLBs actually load
 * and render rather than fail closed to a procedural pad.
 *
 * DERIVED, like the skill row above, and through the SAME helpers the loader uses
 * (`civicFilePrefix` for the file stem, `civicBuildingName` for the label). This bench
 * used to hold a hard-coded copy of the skill names and shipped "City Bank" for a week
 * after the city had been re-dressed; a second copy of the civic names would do the same.
 *
 * The label carries the ART name in brackets where it differs from the catalogue's
 * (`Family Lodge`, `The Spring`), because on this bench the art is the subject: someone
 * inspecting `civic-water-spring-built.glb` needs to be told, at the moment they look at
 * it, that the source's own word for it is `The Spring`. See `civicBuildings.ts` on both
 * divergences — the Lodge's is open, the spring's is one word left over from a ruling.
 */
const CIVIC: readonly PreviewOption[] = CIVIC_TYPE_IDS.map((typeId) => {
  const art = CIVIC_ART[typeId];
  const name = civicBuildingName(typeId);
  return {
    prefix: civicFilePrefix(typeId),
    label:
      art.divergence === null ? `civic · ${name}` : `civic · ${name} (art: ${art.artName})`,
    footprint: civicFootprint(typeId) ?? { w: 2, d: 2 },
  };
});

/**
 * ERA TWO'S FOUR BOUGHT CIVIC BUILDINGS, and this bench is the ONLY surface that can show
 * them — more absolutely than for era one's four, which at least have a live era to be
 * bought in one day. Era two's nodes are `product_scope: "target"`, MVP is pinned at six
 * and `CURRENT_ERA_ID` derives from `ERA_SEQUENCE[0]`, so there is no era-two city.
 * Without this row the four GLBs would be bundled, resolvable, and unphotographable.
 *
 * DERIVED from `ERA_TWO_CIVIC_TYPE_IDS` (one filter over the shipped catalogue) and
 * labelled through `civicBuildingName`, so a renamed row reaches the bench for free —
 * which matters here, since `#243` renamed several civic rows on 29–30 July. There is no
 * art-name bracket as there is above because era two's art source and the catalogue use
 * the same four names; a divergence table for a set with no divergence would be a list
 * that only ever grows.
 */
const CIVIC_ERA_TWO: readonly PreviewOption[] = ERA_TWO_CIVIC_TYPE_IDS.map((typeId) => ({
  prefix: civicFilePrefix(typeId),
  label: `civic · ${civicBuildingName(typeId)}`,
  footprint: civicFootprint(typeId) ?? { w: 2, d: 2 },
}));

/** Era three's four bought-building models, addressed by their catalogue ids. */
const CIVIC_ERA_THREE: readonly PreviewOption[] = ERA_THREE_CIVIC_TYPE_IDS.map(
  (typeId) => ({
    prefix: civicFilePrefix(typeId),
    label: `civic · ${civicBuildingName(typeId)}`,
    footprint: civicFootprint(typeId) ?? { w: 2, d: 2 },
  }),
);

/** Era four's four built civic models, addressed by their current catalogue ids. */
const CIVIC_ERA_FOUR: readonly PreviewOption[] = ERA_FOUR_CIVIC_TYPE_IDS.map((typeId) => ({
  prefix: civicFilePrefix(typeId),
  label: `civic · ${civicBuildingName(typeId)}`,
  footprint: civicFootprint(typeId) ?? { w: 2, d: 2 },
}));

/** Era five's four built civic models, addressed by stable catalogue ids. */
const CIVIC_ERA_FIVE: readonly PreviewOption[] = ERA_FIVE_CIVIC_TYPE_IDS.map((typeId) => ({
  prefix: civicFilePrefix(typeId),
  label: `civic · ${civicBuildingName(typeId)}`,
  footprint: civicFootprint(typeId) ?? { w: 2, d: 2 },
}));

/** Era seven's four Industrial bought-building models, keyed by stable catalogue id. */
const CIVIC_ERA_SEVEN: readonly PreviewOption[] = ERA_SEVEN_CIVIC_TYPE_IDS.map(
  (typeId) => ({
    prefix: civicFilePrefix(typeId),
    label: `civic · ${civicBuildingName(typeId)}`,
    footprint: civicFootprint(typeId) ?? { w: 2, d: 2 },
  }),
);

function civicPreviewRows(typeIds: readonly string[]): readonly PreviewOption[] {
  return typeIds.map((typeId) => ({
    prefix: civicFilePrefix(typeId),
    label: `civic · ${civicBuildingName(typeId)}`,
    footprint: civicFootprint(typeId) ?? { w: 2, d: 2 },
  }));
}

const CIVIC_ERA_EIGHT = civicPreviewRows(ERA_EIGHT_CIVIC_TYPE_IDS);
const CIVIC_ERA_NINE = civicPreviewRows(ERA_NINE_CIVIC_TYPE_IDS);
const CIVIC_ERA_TEN = civicPreviewRows(ERA_TEN_CIVIC_TYPE_IDS);

/**
 * THE HUB, which re-themes per era on one unchanging 3×2 placement — era one's Stone
 * Circle, era two's Elders' Hearth. Named from `TOWN_HALL_ERA_MODELS` rather than transcribed, and
 * the era-one entry comes off `TOWN_HALL_DESCRIPTORS` for the same reason, so a re-theme
 * added in `townHall.ts` shows up here without a second edit.
 *
 * The stems are `basename minus -<stage>.glb`, because the picker composes
 * `${prefix}-${stage}.glb`; the hub's basenames already follow that shape.
 */
const DEFAULT_HUB_BUILT =
  TOWN_HALL_DESCRIPTORS[DEFAULT_TOWN_HALL_DOMAIN]?.stage_models[2] ?? "";

const HUB: readonly PreviewOption[] = [
  {
    prefix: DEFAULT_HUB_BUILT.replace(/-built\.glb$/, ""),
    label: "hub · era one (Stone Circle)",
    footprint: TOWN_HALL_FOOTPRINT,
  },
  // `TOWN_HALL_ERA_MODELS` is now `integration`'s era-keyed table of ONE finished basename
  // per era (it held a `[site, construction, built]` triple in this lane until the
  // 2026-07-30 merge took the era-advance lane's shape). So the value IS the basename.
  ...Object.entries(TOWN_HALL_ERA_MODELS)
    // `prehistoric` names the same file as the domain descriptor above; one option and one
    // React key per GLB, rather than duplicate `townhall` rows.
    .filter(([, basename]) => basename !== DEFAULT_HUB_BUILT)
    .map(([era, basename]) => ({
      prefix: (basename ?? "").replace(/-built\.glb$/, ""),
      label: `hub · ${era} (${
        era === "neolithic"
          ? "Elders' Hearth"
          : era === "bronze_age"
            ? "Council Hall"
            : era === "classical"
              ? "Senate House"
              : era === "medieval"
                ? "Court House"
                : era === "industrial"
                  ? "Industrial Engine House"
                  : "re-theme"
      })`,
      footprint: TOWN_HALL_FOOTPRINT,
    })),
].filter((row) => row.prefix.length > 0);

const STAGES: ReadonlyArray<{ id: string; label: string }> = [
  { id: "site", label: "Site · Empty Lot" },
  { id: "construction", label: "Construction · Scaffolding" },
  { id: "built", label: "Built · Completed" },
];

const PREVIEW_OPTIONS: readonly PreviewOption[] = [
  ...NODES,
  ...ERA_TWO_NODES,
  ...ERA_THREE_NODES,
  ...ERA_FOUR_NODES,
  ...ERA_FIVE_NODES,
  ...ERA_SEVEN_NODES,
  ...ERA_EIGHT_NODES,
  ...ERA_NINE_NODES,
  ...ERA_TEN_NODES,
  ...CIVIC,
  ...CIVIC_ERA_TWO,
  ...CIVIC_ERA_THREE,
  ...CIVIC_ERA_FOUR,
  ...CIVIC_ERA_FIVE,
  ...CIVIC_ERA_SEVEN,
  ...CIVIC_ERA_EIGHT,
  ...CIVIC_ERA_NINE,
  ...CIVIC_ERA_TEN,
  ...HUB,
];

function GridworkModel({ url, footprint }: { url: string; footprint: Footprint }) {
  const gltf = useGLTF(url);
  const model = useMemo(() => prepareModel(gltf.scene, footprint), [gltf.scene, footprint]);

  useEffect(() => retainPreparedModel(model), [model]);

  return <primitive object={model} />;
}

/**
 * The selected model's frozen gameplay plot, with two cells of surrounding grid in frame.
 * This is spatial evidence rather than a dimensions readout: the model above is the SAME
 * runtime-prepared object `PlacedBuilding` draws, so spill, clipping and wasted plot space
 * are visible against actual cell lines at the short verification viewport.
 */
function PlotFitContext({ footprint }: { footprint: Footprint }) {
  const width = footprint.w * GRID_CELL;
  const depth = footprint.d * GRID_CELL;
  const extent = Math.max(width, depth) + GRID_CELL * 4;
  const divisions = Math.round(extent / GRID_CELL);

  return (
    <group>
      <gridHelper
        args={[extent, divisions, "#7890A8", "#A9B7C7"]}
        position={[0, -0.04, 0]}
      />
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[width, 0.06, depth]} />
        <meshStandardMaterial color="#C8D8E8" transparent opacity={0.42} />
      </mesh>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[width, 0.07, depth]} />
        <meshBasicMaterial color="#315F8B" transparent opacity={0.86} wireframe />
      </mesh>
    </group>
  );
}

/**
 * The dev preview surface: a building/stage picker over a free-orbit R3F canvas.
 * Lighting mirrors the Gridwork diorama (cool hemisphere + warm key + rim).
 */
export default function GridworkModelPreview() {
  // The registry is never empty in practice (`buildingAssets.test.ts` pins six
  // skills), and an empty stem simply resolves no URL, so the bench renders an empty
  // canvas rather than crashing.
  const [node, setNode] = useState(NODES[0]?.prefix ?? "");
  const [stage, setStage] = useState("built");
  const fileName = `${node}-${stage}.glb`;
  const url = MODEL_URLS[fileName];
  const footprint = PREVIEW_OPTIONS.find((option) => option.prefix === node)?.footprint ?? {
    w: 2,
    d: 2,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(120% 95% at 50% 4%, #C3CEDE 0%, #DBE1EB 48%, #EDEFF3 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 6,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "calc(100vw - 32px)",
          padding: "10px 14px",
          borderRadius: 16,
          background: "rgba(247, 244, 239, 0.92)",
          border: "1px solid rgba(46, 74, 107, 0.1)",
          boxShadow: "0 18px 40px -16px rgba(46, 74, 107, 0.42)",
          fontFamily: "system-ui, sans-serif",
          color: "#2E4A6B",
        }}
      >
        <strong
          style={{
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            background: "#5B8DEF",
            color: "#fff",
            padding: "3px 8px",
            borderRadius: 999,
          }}
        >
          Dev preview · 3D geometry proof (Phase 1)
        </strong>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          Building
          <select value={node} onChange={(e) => setNode(e.target.value)}>
            <optgroup label="Skill buildings (earned)">
              {NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era two skill buildings (earned)">
              {ERA_TWO_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era three skill buildings (earned)">
              {ERA_THREE_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era four skill buildings (earned)">
              {ERA_FOUR_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era five skill buildings (earned)">
              {ERA_FIVE_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era seven skill buildings (earned)">
              {ERA_SEVEN_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era eight skill buildings (earned)">
              {ERA_EIGHT_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era nine skill buildings (earned)">
              {ERA_NINE_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era ten skill buildings (earned)">
              {ERA_TEN_NODES.map((n) => (
                <option key={n.prefix} value={n.prefix}>
                  {n.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Civic buildings (bought)">
              {CIVIC.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era two civic buildings (bought)">
              {CIVIC_ERA_TWO.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era three civic buildings (bought)">
              {CIVIC_ERA_THREE.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era four civic buildings (bought)">
              {CIVIC_ERA_FOUR.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era five civic buildings (bought)">
              {CIVIC_ERA_FIVE.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era seven civic buildings (bought)">
              {CIVIC_ERA_SEVEN.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era eight civic buildings (bought)">
              {CIVIC_ERA_EIGHT.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era nine civic buildings (bought)">
              {CIVIC_ERA_NINE.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Era ten civic buildings (bought)">
              {CIVIC_ERA_TEN.map((c) => (
                <option key={c.prefix} value={c.prefix}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Hub (pre-seeded, re-themes per era)">
              {HUB.map((h) => (
                <option key={h.prefix} value={h.prefix}>
                  {h.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          Stage
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          Runtime plot {footprint.w}×{footprint.d} · drag to orbit · scroll to zoom
        </span>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [70, 52, 70], fov: 35, near: 0.1, far: 4000 }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={["#DDE3ED"]} />
        <hemisphereLight args={["#d4ddec", "#b7bccb", 0.72]} />
        <ambientLight color="#dfe6f2" intensity={0.3} />
        <directionalLight
          castShadow
          position={[-42, 66, 40]}
          intensity={1.15}
          color="#fff3e2"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={400}
          shadow-camera-left={-140}
          shadow-camera-right={140}
          shadow-camera-top={180}
          shadow-camera-bottom={-40}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[34, 22, -36]} intensity={0.4} color="#bcd4e6" />

        <Suspense fallback={null}>
          {url ? (
            <Bounds
              key={`${url}-${footprint.w}x${footprint.d}`}
              fit
              clip
              observe
              margin={1.15}
            >
              <group>
                <PlotFitContext footprint={footprint} />
                <GridworkModel url={url} footprint={footprint} />
              </group>
            </Bounds>
          ) : null}
        </Suspense>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[2000, 2000]} />
          <shadowMaterial opacity={0.22} transparent />
        </mesh>

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>
    </div>
  );
}
