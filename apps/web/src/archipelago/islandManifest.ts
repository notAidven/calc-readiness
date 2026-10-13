import { ERA_SEQUENCE, type EraId, eraNumber } from "@cr/skill-graph";

import {
  hasAuthoredIslandGround,
  type IslandTerrainTones,
  islandGround,
} from "../city/islandGround";
import { eraLandRadius, eraSeaRadius } from "../city/islandLand";
import { ISLAND_SHORE_REACH } from "../city/three/cityFraming";
import { buildableRadiusForLand } from "../city/worldLayout";
import { eraIslandFootprint, eraOwnGrassRadius } from "./bayLayout";

/**
 * **THE ONE PLACE AN ISLAND'S LOOK IS DECIDED — the handoff surface for island art.**
 *
 * Evan has final island design ready and needs somewhere to put it that is not the renderer.
 * Before this module there was no such place: an island's look was decided in four modules
 * with four shapes — `islandGround.ts` (tones and props), `islandLand.ts` (how far the land
 * reaches), `bayLayout.ts` (how big the mark on the overview is) and `StarterIsland.tsx` (3030
 * lines of procedural geometry) — and none of them was a per-era ENTRY. Adding an island meant
 * reading all four and editing at least two.
 *
 * This is that entry. **Ten rows, one per era, and dropping a finished island is editing one
 * of them.** Everything else on this page exists to make that sentence true: the renderer
 * reads {@link islandVisual} rather than deciding anything itself, the radii are DERIVED from
 * the modules that already own them so a row cannot disagree with the game, and
 * {@link islandManifestProblems} refuses a row that names a file nobody shipped.
 *
 * ## THE FORMAT IS THE ONE THIS REPO ALREADY LOADS, AND THAT IS DELIBERATE
 *
 * `glTF-binary` (`.glb`), through `@react-three/drei`'s `useGLTF` — the same loader
 * `PlacedBuilding`, `TownHall`, `GhostBuilding` and `BuildingThumb` already use for the 127
 * committed building models, and the same `import.meta.glob(… "?url" …)` resolution
 * `buildingAssets.ts` uses to turn a filename into a hashed, CloudFront-served URL.
 *
 * ⚑ **AND IT IS NOT THE SHAPE ISLAND ART HAS ACTUALLY ARRIVED IN, which is worth saying here
 * rather than only in the handoff doc.** Every island delivered so far is TYPED TERRAIN DESIGN —
 * an `IslandTerrainTones` palette plus scenery rules over the procedural mass — not geometry.
 * Eras one and two are in `islandGround.ts`; eras three to seven arrive as `islandDesign.ts` in
 * #668. So `procedural` is not a placeholder awaiting a model: it is the live route, and
 * {@link IslandManifestEntry.palette} exists to REPORT it, derived from `islandGround.ts` so an
 * era registered there shows up here the same commit with no edit to this file.
 *
 * The `glb` slot is for an island delivered as geometry, and nothing uses it yet. It is here
 * because a slot that exists before it is needed is the difference between dropping a file and
 * negotiating an interface.
 *
 * **NO THIRD FORMAT IS INVENTED HERE.** If island art arrives as something else — `.gltf` with
 * sidecars, `.fbx`, `.usdz`, a baked atlas over the procedural mass, or a 2.5D sprite for the
 * overview — that is the one unresolved input, and `docs/Island_Asset_Handoff.md` says so in
 * those words. {@link IslandVisualFormat} is a closed union precisely so a new format cannot be
 * smuggled in as a string: adding one is a typed change with a loader beside it, which is a
 * reviewable act rather than a guess. If the island art arrives as something else —
 * `.gltf` with sidecars, `.fbx`, `.usdz`, a texture set for the existing procedural mass, or a
 * 2.5D sprite for the overview — that is the ONE unresolved input, and
 * `docs/Island_Asset_Handoff.md` says so in those words. {@link IslandVisualFormat} is a
 * closed union precisely so a new format cannot be smuggled in as a string: adding one is a
 * typed change with a loader beside it, which is a reviewable act rather than a guess.
 *
 * ## WHAT IS DERIVED RATHER THAN AUTHORED, AND WHY THAT IS THE SAFE DIRECTION
 *
 * A manifest that RESTATED the land radius would be a second opinion about how big the island
 * is, and the placement gate, the camera fit and the citizens' walk all read the first one. So
 * every geometric figure on an entry is read from its existing owner and none is a literal
 * here. What an entry authors is only what has no owner yet: which file to draw, and how to
 * seat it.
 *
 * The one consequence worth naming, because it is visible: `landRadius` is the CUMULATIVE
 * budget (`islandLand.ts`), not `bayLayout.ts`'s per-era one, so era two's island is the size
 * era two's running total wants while holding one era's city. Both are on the entry
 * ({@link IslandManifestEntry.overviewRadius} is the per-era figure) so the gap is legible
 * rather than buried, and closing it is a change to `islandLand.ts` — which carries era one's
 * pinned geometry digest — rather than to this file.
 */

/**
 * **THE FORMATS A MANIFEST ROW MAY NAME. A closed union, so nothing can be guessed.**
 *
 *  - `procedural` — the island `StarterIsland.tsx` builds today, dressed from that era's row
 *    of `islandGround.ts`. Every era is this until an entry says otherwise, which is what
 *    makes the fallback the DEFAULT rather than an error path.
 *  - `glb` — a `glTF-binary` file under {@link ISLAND_ASSET_DIRECTORY}, loaded through the
 *    same `useGLTF` the building models use.
 */
export type IslandVisualFormat = "procedural" | "glb";

/**
 * **WHERE THE FILES GO.** Relative to `apps/web/src/`, and it is a real directory with a
 * README rather than a convention in prose.
 *
 * It is a SIBLING of `city/art/models/`, not that directory, and the separation is load-bearing
 * rather than tidy: `buildingAssets.ts` globs `./art/models/*.glb` non-recursively and maps
 * every match by BARE FILENAME into the per-node building registry. An island dropped in there
 * would join that glob, and `buildingAssets.ts`'s own header records what that costs — *"a
 * third `*.dc.html` dropped in there breaks the advisor shelf guard"* is the same failure one
 * directory over. `islandManifest.test.ts` asserts the two globs stay disjoint.
 */
export const ISLAND_ASSET_DIRECTORY = "city/art/islands";

/**
 * Every island file the build has shipped, by bare filename → hashed URL.
 *
 * `eager: true` with `query: "?url"` inlines ten SHORT STRINGS and no model bytes, which is
 * what makes "one entry per era" cost nothing at load: the bytes arrive when `useGLTF` asks
 * for them, per island, on the island the learner is standing on. This is `buildingAssets.ts`'s
 * own mechanism, verbatim, so the two registries resolve a filename the same way.
 */
const ISLAND_ASSET_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob("../city/art/islands/*.glb", {
      query: "?url",
      import: "default",
      eager: true,
    }) as Record<string, string>,
  ).map(([path, url]) => [path.split("/").pop() as string, url]),
);

/** The filenames the build actually shipped. Read by the validator and by tests. */
export function shippedIslandAssets(): readonly string[] {
  return Object.keys(ISLAND_ASSET_URLS).sort();
}

/**
 * The URL for an island file, or `null` when nothing of that name shipped.
 *
 * `null` rather than a throw, because the fallback is a designed state: an entry naming a file
 * that is not there draws the procedural island and {@link islandManifestProblems} says so out
 * loud, which is strictly better than a city that will not load.
 */
export function islandAssetUrl(file: string): string | null {
  return ISLAND_ASSET_URLS[file] ?? null;
}

/** The island every era draws until a row says otherwise. Carries no file and no seating. */
export interface ProceduralIslandVisual {
  readonly format: "procedural";
}

/**
 * **AN ISLAND EVAN HAS DELIVERED, and every number a renderer needs to seat it.**
 *
 * All six seating fields are REQUIRED rather than optional-with-defaults. A default here would
 * be this module guessing how a model was exported, and the failure mode of a wrong guess is
 * an island floating above its own lagoon or buried in it — which reads as a bug in the game
 * rather than as a manifest row needing a number.
 */
export interface GlbIslandVisual {
  readonly format: "glb";
  /**
   * The BARE FILENAME under {@link ISLAND_ASSET_DIRECTORY} — not a path and not a URL. Vite
   * hashes the URL at build time, so a path written here would be wrong in production;
   * {@link islandAssetUrl} is the resolution and it is the only one.
   */
  readonly file: string;
  /** Multiplied onto the model. `1` means the export is already in world units. */
  readonly scale: number;
  /** Turn about +Y, in RADIANS, applied before the offset below. */
  readonly rotationY: number;
  /**
   * Where the model's own origin has to be moved to put the island's centre at the world
   * origin, in world units. An export centred on its own island needs `{0, 0, 0}`.
   */
  readonly anchor: { readonly x: number; readonly y: number; readonly z: number };
  /**
   * How far the model's waterline sits BELOW its origin, in world units, positive downward.
   * The renderer lifts the model by this much so the shore meets the lagoon the game draws.
   */
  readonly seaLevelOffset: number;
  /**
   * The radius a pointer may hit the island within, in world units. Optional, and it defaults
   * to the entry's own `landRadius` — which is the correct answer for any island whose
   * silhouette fills its land, and is why this is the one seating field that may be omitted.
   */
  readonly collisionRadius?: number;
  /**
   * Optional picking volume in MODEL-LOCAL coordinates after `scale`. A sphere is the
   * cheap default; a box is available for long or cut-out silhouettes where a radius
   * would make open water clickable.
   */
  readonly pickingBounds?: IslandBounds;
  /**
   * Optional physical collision volume, separate from picking. Omit it while islands
   * are non-colliding scenery; navigation and placement never infer physics from art.
   */
  readonly collisionBounds?: IslandBounds;
}

export type IslandVisual = ProceduralIslandVisual | GlbIslandVisual;

/** A narrow bounds union supported by three without another asset or physics format. */
export type IslandBounds =
  | {
      readonly kind: "sphere";
      readonly center: { readonly x: number; readonly y: number; readonly z: number };
      readonly radius: number;
    }
  | {
      readonly kind: "box";
      readonly min: { readonly x: number; readonly y: number; readonly z: number };
      readonly max: { readonly x: number; readonly y: number; readonly z: number };
    };

/** The procedural island, as a value, so a row can say it rather than omit it. */
export const PROCEDURAL_ISLAND: ProceduralIslandVisual = { format: "procedural" };

/**
 * **HOW AN ISLAND READS FROM A DISTANCE, for the overview's aerial perspective.**
 *
 * Derived rather than authored, on `bayLayout.ts`'s reasoning that the haze is keyed to
 * SEQUENCE distance and never to camera distance. What an entry contributes is its own two
 * water tones, so a hazed island fades toward the sea it sits in rather than toward a grey
 * somebody picked.
 */
export interface IslandHaze {
  /** The lagoon at the shore, as a 24-bit hex number. */
  readonly shallows: number;
  /** The open water beyond it. */
  readonly deepWater: number;
}

/**
 * **THE PALETTE AND FOG A ROW EXPOSES, and every value is a READ.**
 *
 * `tones` is that era's row of `islandGround.ts` — the whole `IslandTerrainTones` object,
 * handed over rather than copied, so the manifest and the renderer cannot come apart. `authored`
 * is the difference between an era whose ground Evan has designed and one still wearing
 * `UNAUTHORED_TERRAIN`, which is the single most useful thing on this page for deciding what to
 * work on next.
 */
export interface IslandPalette {
  readonly tones: IslandTerrainTones;
  /** False while this era's ground is still the deliberately-neutral unauthored fallback. */
  readonly authored: boolean;
  readonly haze: IslandHaze;
}

/** Finite city fog bounds, in world units, derived from this island's geometry. */
export interface IslandFog {
  readonly color: number;
  readonly near: number;
  readonly far: number;
}

/** **ONE ISLAND, COMPLETELY.** The row Evan edits, and the only thing the renderer reads. */
export interface IslandManifestEntry {
  readonly eraId: EraId;
  /** 1-based position in `ERA_SEQUENCE`. Era one is 1. */
  readonly number: number;
  /** Learner-facing era name, for a caption or a card. */
  readonly name: string;
  /** ⚑ THE ONE AUTHORED FIELD. Everything else on this entry is derived. */
  readonly visual: IslandVisual;
  /** How far the drawn land reaches, world units — `islandLand.ts`'s cumulative budget. */
  readonly landRadius: number;
  /** How far the lagoon reaches, world units. */
  readonly seaRadius: number;
  /**
   * The disc a learner may place on, world units — `worldLayout.buildableRadiusForLand` over
   * this island's own drawn land, which is the same derivation the shipped placement gate uses
   * (`liveIsland.ts`). Deriving it from `landRadius` rather than from the era is what keeps a
   * wider island's disc widening with it.
   */
  readonly buildableRadius: number;
  /** Land plus beach: the complete silhouette/camera footprint in world units. */
  readonly footprintRadius: number;
  /** Land plus beach: what the camera has to fit. `cityFraming.ts`'s own reach. */
  readonly fitRadius: number;
  /** How big the island's mark is on the bay overview — `bayLayout.ts`'s per-era figure. */
  readonly overviewRadius: number;
  readonly palette: IslandPalette;
  readonly fog: IslandFog;
}

/**
 * **THE TEN ROWS. `Record<EraId, …>` and not `Partial`, so adding an era without an island
 * does not typecheck.**
 *
 * `islandGround.ts` chose the same shape for `ERA_GROUND_LADDER` and gave the reason: a total
 * record is *"the one place this module differs in shape"* from the partial tables, because
 * every era owes the property. Every era owes an island.
 *
 * **Every row is `PROCEDURAL_ISLAND` today, and that is the honest state of the art rather
 * than a placeholder to be tidied.** No island model has been delivered; the procedural mass
 * plus that era's ground dressing is what ships. Evan changes one row to a
 * {@link GlbIslandVisual}, drops one file, and that era draws his island.
 */
export const ISLAND_VISUALS: Readonly<Record<EraId, IslandVisual>> = Object.fromEntries(
  ERA_SEQUENCE.map((era) => [era.id, PROCEDURAL_ISLAND]),
) as Record<EraId, IslandVisual>;

/** The haze pair for an era, off its own ground dressing's water tones. */
function hazeFor(tones: IslandTerrainTones): IslandHaze {
  return { shallows: tones.shallows, deepWater: tones.deepWater };
}

/**
 * **ONE ISLAND'S WHOLE ENTRY.**
 *
 * Composed on every call rather than frozen at module scope, for `islandGround.ts`'s reason:
 * its own resolver returns a fresh object per call, and a cached entry here would be a second
 * lifetime for a value that module owns. The composition is a handful of arithmetic reads, and
 * `StarterIsland` memoises what it does with the result.
 */
export function islandManifestEntry(eraId: EraId): IslandManifestEntry {
  const era = ERA_SEQUENCE[eraNumber(eraId) - 1];
  if (era === undefined) {
    throw new Error(
      `island manifest: "${eraId}" is not in ERA_SEQUENCE, so it has no island. That is the ` +
        "sequence and this manifest coming apart rather than a caller passing something odd.",
    );
  }
  const dressing = islandGround(eraId);
  const landRadius = eraLandRadius(eraId);
  return {
    eraId,
    number: eraNumber(eraId),
    name: era.name,
    visual: ISLAND_VISUALS[eraId],
    landRadius,
    seaRadius: eraSeaRadius(eraId),
    buildableRadius: buildableRadiusForLand(landRadius),
    footprintRadius: landRadius + ISLAND_SHORE_REACH,
    fitRadius: landRadius + ISLAND_SHORE_REACH,
    overviewRadius: eraOwnGrassRadius(eraId),
    palette: {
      tones: dressing.tones,
      authored: hasAuthoredIslandGround(eraId),
      haze: hazeFor(dressing.tones),
    },
    fog: {
      color: dressing.tones.deepWater,
      near: landRadius * 3,
      far: landRadius * 20,
    },
  };
}

/** Every entry, in sequence order. What a validator and a handoff page read. */
export function islandManifest(): readonly IslandManifestEntry[] {
  return ERA_SEQUENCE.map((era) => islandManifestEntry(era.id));
}

/**
 * **WHAT THE RENDERER ACTUALLY DRAWS FOR AN ERA, and the fallback is IN here rather than at
 * the call site.**
 *
 * A `glb` row whose file did not ship resolves to {@link PROCEDURAL_ISLAND}, so a half-finished
 * drop is an island that looks unfinished instead of a city that will not load. Putting that
 * decision here rather than in `StarterIsland` is what keeps it to one implementation: the
 * renderer asks what to draw and draws it, and there is no second opinion about what "missing"
 * means.
 *
 * Returns the resolved visual AND the URL, because a caller that had to resolve the URL a second
 * time could resolve it differently.
 */
export function islandVisual(eraId: EraId):
  | { readonly visual: ProceduralIslandVisual; readonly url: null }
  | {
      readonly visual: GlbIslandVisual;
      readonly url: string;
    } {
  const visual = ISLAND_VISUALS[eraId];
  if (visual.format === "procedural") {
    return { visual: PROCEDURAL_ISLAND, url: null };
  }
  const url = islandAssetUrl(visual.file);
  return url === null ? { visual: PROCEDURAL_ISLAND, url: null } : { visual, url };
}

/**
 * **EVERY WAY A ROW CAN BE WRONG, as sentences a person can act on.**
 *
 * Returns an empty array for a healthy manifest. It is a LIST rather than a throw because the
 * useful thing during a drop is all of the problems at once, and because the app must keep
 * running: `islandVisual` above already degrades every one of these to the procedural island,
 * so this is the report and not the guard rail.
 *
 * `islandManifest.test.ts` runs it over the shipped manifest and asserts it is empty, and shows
 * each rule red by injecting the row it is written for.
 */
export function islandManifestProblems(
  entries: readonly IslandManifestEntry[] = islandManifest(),
): readonly string[] {
  const problems: string[] = [];

  // EVERY ERA HAS A ROW. The record is total, so this can only fail if the sequence grew and
  // the cast above hid it — which is exactly the failure a total record is supposed to catch
  // and cannot, once a cast is involved.
  for (const era of ERA_SEQUENCE) {
    if (!entries.some((entry) => entry.eraId === era.id)) {
      problems.push(
        `era "${era.id}" (island ${eraNumber(era.id)}) has no manifest entry, so it has no island.`,
      );
    }
  }

  for (const entry of entries) {
    const where = `island ${entry.number} ("${entry.eraId}")`;
    for (const [label, value] of [
      ["landRadius", entry.landRadius],
      ["seaRadius", entry.seaRadius],
      ["buildableRadius", entry.buildableRadius],
      ["footprintRadius", entry.footprintRadius],
      ["fitRadius", entry.fitRadius],
      ["overviewRadius", entry.overviewRadius],
    ] as const) {
      if (!Number.isFinite(value) || value <= 0) {
        problems.push(`${where}: ${label} is ${value}, which cannot size an island.`);
      }
    }
    // The lagoon must reach past the land, or the island is drawn standing on nothing.
    if (entry.seaRadius <= entry.landRadius) {
      problems.push(
        `${where}: seaRadius ${entry.seaRadius} does not reach past landRadius ` +
          `${entry.landRadius}, so there is no water around the island.`,
      );
    }
    // ...and a learner must not be able to build past the shore.
    if (entry.buildableRadius > entry.landRadius) {
      problems.push(
        `${where}: buildableRadius ${entry.buildableRadius} reaches past landRadius ` +
          `${entry.landRadius}, so a building could be placed in the sea.`,
      );
    }
    if (entry.fog.near < entry.footprintRadius || entry.fog.far <= entry.fog.near) {
      problems.push(
        `${where}: fog ${entry.fog.near}..${entry.fog.far} does not bound the ` +
          `${entry.footprintRadius}-unit island footprint.`,
      );
    }

    const visual = entry.visual;
    if (visual.format !== "glb") {
      continue;
    }
    // A NAMED FILE MUST HAVE SHIPPED. This is the rule a drop trips first and the one whose
    // silent version is worst: without it a typo is an island that quietly stays procedural.
    if (islandAssetUrl(visual.file) === null) {
      problems.push(
        `${where}: names "${visual.file}", which is not in ${ISLAND_ASSET_DIRECTORY}/. ` +
          `Shipped: ${shippedIslandAssets().join(", ") || "(nothing yet)"}.`,
      );
    }
    if (!visual.file.endsWith(".glb")) {
      problems.push(
        `${where}: "${visual.file}" is not a .glb, and glTF-binary is the only island format ` +
          "this build loads. See docs/Island_Asset_Handoff.md.",
      );
    }
    if (!Number.isFinite(visual.scale) || visual.scale <= 0) {
      problems.push(`${where}: scale is ${visual.scale}, which draws nothing.`);
    }
    if (!Number.isFinite(visual.rotationY)) {
      problems.push(`${where}: rotationY is ${visual.rotationY}, which is not a turn.`);
    }
    for (const axis of ["x", "y", "z"] as const) {
      if (!Number.isFinite(visual.anchor[axis])) {
        problems.push(`${where}: anchor.${axis} is ${visual.anchor[axis]}.`);
      }
    }
    if (!Number.isFinite(visual.seaLevelOffset)) {
      problems.push(`${where}: seaLevelOffset is ${visual.seaLevelOffset}.`);
    }
    if (
      visual.collisionRadius !== undefined &&
      (!Number.isFinite(visual.collisionRadius) || visual.collisionRadius <= 0)
    ) {
      problems.push(
        `${where}: collisionRadius is ${visual.collisionRadius}; omit it to use landRadius.`,
      );
    }
    for (const [label, bounds] of [
      ["pickingBounds", visual.pickingBounds],
      ["collisionBounds", visual.collisionBounds],
    ] as const) {
      if (bounds === undefined) {
        continue;
      }
      if (bounds.kind === "sphere") {
        for (const axis of ["x", "y", "z"] as const) {
          if (!Number.isFinite(bounds.center[axis])) {
            problems.push(`${where}: ${label}.center.${axis} is ${bounds.center[axis]}.`);
          }
        }
        if (!Number.isFinite(bounds.radius) || bounds.radius <= 0) {
          problems.push(`${where}: ${label}.radius is ${bounds.radius}.`);
        }
        continue;
      }
      for (const axis of ["x", "y", "z"] as const) {
        if (
          !Number.isFinite(bounds.min[axis]) ||
          !Number.isFinite(bounds.max[axis]) ||
          bounds.min[axis] >= bounds.max[axis]
        ) {
          problems.push(
            `${where}: ${label}.${axis} is ${bounds.min[axis]}..${bounds.max[axis]}.`,
          );
        }
      }
    }
  }
  return problems;
}

/**
 * The radius a pointer may hit an island within — its own if it named one, else its land.
 *
 * Here rather than in the picking code so there is one answer, and so an entry that omits it
 * cannot be read as zero by whichever caller looks next.
 */
export function islandPickRadius(entry: IslandManifestEntry): number {
  if (entry.visual.format !== "glb") {
    return entry.landRadius;
  }
  const bounds = entry.visual.pickingBounds ?? entry.visual.collisionBounds;
  if (bounds?.kind === "sphere") {
    return bounds.radius * entry.visual.scale;
  }
  if (bounds?.kind === "box") {
    return (
      Math.max(
        Math.hypot(bounds.min.x, bounds.min.z),
        Math.hypot(bounds.min.x, bounds.max.z),
        Math.hypot(bounds.max.x, bounds.min.z),
        Math.hypot(bounds.max.x, bounds.max.z),
      ) * entry.visual.scale
    );
  }
  return entry.visual.collisionRadius ?? entry.landRadius;
}

/** Land plus beach, which is what the camera fits. Re-exported so a caller needs one import. */
export { eraIslandFootprint };
