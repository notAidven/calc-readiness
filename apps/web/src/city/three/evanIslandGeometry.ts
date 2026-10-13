import * as THREE from "three";

import type {
  DesignedIslandEraId,
  EraIslandDesign,
  EvanSourcePalette,
} from "../islandDesign";
import type { CityLayout } from "../worldLayout";

const TAU = Math.PI * 2;
const SOURCE_PLATEAU_RADIUS = 27;

export const EVAN_ISLAND_SOURCE = {
  directory: "docs/design-refs/evan-islands/source",
  era2: "era-02-neolithic.js",
  eras3To10: "era-03-through-10.js",
  facets: 13,
  plateauRadius: SOURCE_PLATEAU_RADIUS,
  shoreRadius: 29,
  keelRadius: 21.6,
  rotation: Math.PI / 7,
} as const;

export interface EvanIslandBuildOptions {
  readonly grassRadius: number;
  readonly seaRadius: number;
  /** The city reserves this radial disc for plots, roads, labels, and civic interaction. */
  readonly protectedRadius?: number;
  readonly includeSea?: boolean;
}

type Random = () => number;

export interface EvanRuntimeClearing {
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly radiusX: number;
  readonly radiusZ: number;
  readonly rotation: number;
}

/**
 * Authored build clearings in Evan's 27-unit source coordinates.
 *
 * These are negative-space decisions, not replacement terrain: they remove only generic scatter,
 * scrub and broad ground patches inside a few settlement rooms. Named landforms, water, trees and
 * shoreline keep their source transforms. Source-comparison builds pass `protectedRadius: 0`, so
 * this live-city mask never touches the isolated port.
 */
export const EVAN_RUNTIME_CLEARINGS: Readonly<
  Record<DesignedIslandEraId, readonly EvanRuntimeClearing[]>
> = {
  prehistoric: [
    { name: "hearth-ground", x: 0, z: 0, radiusX: 8.6, radiusZ: 7.2, rotation: 0.1 },
    { name: "hide-working-yard", x: 10, z: 4, radiusX: 7.2, radiusZ: 5.2, rotation: 0.5 },
    { name: "shelter-ground", x: -9, z: -7, radiusX: 7, radiusZ: 5.4, rotation: -0.4 },
  ],
  neolithic: [
    { name: "hearth-green", x: 0, z: 0, radiusX: 8.4, radiusZ: 7.2, rotation: 0.2 },
    { name: "eastern-pasture", x: 11, z: 4, radiusX: 7.2, radiusZ: 5.4, rotation: 0.55 },
    { name: "western-yard", x: -10, z: -5, radiusX: 6.8, radiusZ: 5.2, rotation: -0.45 },
  ],
  bronze_age: [
    { name: "council-ground", x: 0, z: 0, radiusX: 8.2, radiusZ: 7, rotation: -0.2 },
    { name: "terrace-court", x: 11, z: -5, radiusX: 7.4, radiusZ: 5.2, rotation: 0.3 },
    { name: "olive-yard", x: -7, z: 10, radiusX: 6.4, radiusZ: 5.4, rotation: -0.7 },
  ],
  classical: [
    { name: "agora", x: 0, z: 0, radiusX: 8.6, radiusZ: 7.2, rotation: 0 },
    {
      name: "south-stoa-ground",
      x: 7,
      z: -11,
      radiusX: 7.2,
      radiusZ: 5.2,
      rotation: -0.25,
    },
    { name: "western-court", x: -11, z: 3, radiusX: 6.8, radiusZ: 5.4, rotation: 0.45 },
  ],
  medieval: [
    { name: "market-green", x: 0, z: 0, radiusX: 8.2, radiusZ: 6.8, rotation: 0.15 },
    { name: "abbey-yard", x: 10, z: 7, radiusX: 6.8, radiusZ: 5.2, rotation: -0.45 },
    { name: "mill-close", x: -9, z: -8, radiusX: 7, radiusZ: 5.2, rotation: 0.55 },
  ],
  renaissance: [
    { name: "survey-square", x: 0, z: 0, radiusX: 8.8, radiusZ: 7.2, rotation: -0.12 },
    { name: "merchant-close", x: 9, z: -9, radiusX: 7, radiusZ: 5.4, rotation: 0.48 },
    { name: "coppice-yard", x: -11, z: 5, radiusX: 6.8, radiusZ: 5.2, rotation: -0.35 },
  ],
  industrial: [
    { name: "works-square", x: 0, z: 0, radiusX: 8.6, radiusZ: 7, rotation: 0.1 },
    { name: "rail-yard", x: -9, z: -9, radiusX: 7.6, radiusZ: 5.2, rotation: -0.35 },
    { name: "canal-court", x: 10, z: 7, radiusX: 6.6, radiusZ: 5.2, rotation: 0.6 },
  ],
  atomic_age: [
    { name: "civic-campus", x: 0, z: 0, radiusX: 8.8, radiusZ: 7.4, rotation: 0 },
    { name: "laboratory-lawn", x: -10, z: 6, radiusX: 7.2, radiusZ: 5.4, rotation: 0.4 },
    { name: "service-court", x: 8, z: -10, radiusX: 6.8, radiusZ: 5.2, rotation: -0.5 },
  ],
  information_age: [
    { name: "network-campus", x: 0, z: 0, radiusX: 9, radiusZ: 7.4, rotation: 0.08 },
    { name: "research-court", x: -9, z: 8, radiusX: 7.2, radiusZ: 5.2, rotation: -0.4 },
    { name: "service-green", x: 10, z: -7, radiusX: 6.8, radiusZ: 5.2, rotation: 0.45 },
  ],
  cyberpunk: [
    { name: "exchange-deck", x: 0, z: 0, radiusX: 8.8, radiusZ: 7, rotation: -0.1 },
    { name: "canal-market", x: 10, z: 7, radiusX: 7, radiusZ: 5.2, rotation: 0.5 },
    { name: "reclaim-yard", x: -10, z: -7, radiusX: 7.2, radiusZ: 5.4, rotation: -0.45 },
  ],
};

interface SourceDimensions {
  readonly N: 13;
  readonly RP: 27;
  readonly RS: 29;
  readonly RK: 21.6;
  readonly TOP: 0;
  readonly RIM: -0.55;
  readonly BEV: -1.42;
  readonly WY: -1.15;
  readonly ROT: number;
}

const D: SourceDimensions = {
  N: 13,
  RP: 27,
  RS: 29,
  RK: 21.6,
  TOP: 0,
  RIM: -0.55,
  BEV: -1.42,
  WY: -1.15,
  ROT: Math.PI / 7,
};

function lcg(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function evanRuntimeClearingContains(
  clearing: EvanRuntimeClearing,
  point: { readonly x: number; readonly z: number },
): boolean {
  const cosine = Math.cos(clearing.rotation);
  const sine = Math.sin(clearing.rotation);
  const dx = point.x - clearing.x;
  const dz = point.z - clearing.z;
  const x = dx * cosine + dz * sine;
  const z = -dx * sine + dz * cosine;
  return (x / clearing.radiusX) ** 2 + (z / clearing.radiusZ) ** 2 <= 1;
}

function disposeRemovedGeometry(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
    }
  });
}

/**
 * Screen-composition budget derived from the quieter Era 1 learner frame.
 *
 * These are separate family ceilings rather than one mesh cap: ground flecks, broad patches,
 * vegetation and shore detail compete differently with buildings and labels. Keeping a
 * non-empty population in every family preserves the island read; limiting each family keeps
 * one procedural layer from recreating the clutter after another is reduced.
 */
export const CALM_ISLAND_COMPOSITION = {
  sourceGroundActors: 92,
  groundPatches: 4,
  floraActors: 18,
  prehistoricGravel: 36,
  prehistoricBoulders: 12,
  looseShoreActors: 42,
  reedMeshes: 18,
  repeatedSignatureDetails: 12,
} as const;

const SECONDARY_SIGNATURE_DETAIL =
  /(?:boulder|bracken|chunk|coppice|crystal|enclosure|furrow|gravel|hedge|marker|pile|post|reed|revetment|rubble|scrub|slab-\d|spoil|stone|thorn)/;

function evenlySpacedKeepSet(length: number, kept: number): ReadonlySet<number> {
  if (kept >= length) {
    return new Set(Array.from({ length }, (_, index) => index));
  }
  if (kept <= 1) {
    return new Set([0]);
  }
  return new Set(
    Array.from({ length: kept }, (_, index) =>
      Math.round((index * (length - 1)) / (kept - 1)),
    ),
  );
}

function trimChildren(
  parent: THREE.Object3D | undefined,
  maximum: number,
  qualifies: (child: THREE.Object3D) => boolean = () => true,
): number {
  if (parent === undefined) {
    return 0;
  }
  const candidates = parent.children.filter(qualifies);
  if (candidates.length <= maximum) {
    return 0;
  }
  const keep = evenlySpacedKeepSet(candidates.length, maximum);
  let removed = 0;
  candidates.forEach((child, index) => {
    if (keep.has(index)) {
      return;
    }
    parent.remove(child);
    disposeRemovedGeometry(child);
    removed += 1;
  });
  return removed;
}

function authoredFlora(root: THREE.Object3D, eraId: DesignedIslandEraId) {
  const name =
    eraId === "prehistoric" || eraId === "neolithic"
      ? "wind-cropped-trees"
      : eraId === "classical"
        ? "cypress-stands"
        : eraId === "medieval"
          ? "willow-marsh"
          : eraId === "atomic_age"
            ? "topiary-groves"
            : "evan-authored-flora";
  return root.getObjectByName(name);
}

/**
 * Remove repeated secondary marks without moving, scaling or renaming any retained object.
 *
 * The source constructors remain the authority for composition and era identity: every named
 * signature group survives, as do its large landforms. This pass only samples the repeated
 * procedural families that made all ten shipped cameras read as equally busy. Even sampling
 * keeps their authored spread around the island instead of opening one conspicuous bald sector.
 */
function restrainDecorativePopulation(root: THREE.Group, design: EraIslandDesign): void {
  let removed = 0;
  removed += trimChildren(
    root.getObjectByName("evan-ground-scatter"),
    CALM_ISLAND_COMPOSITION.sourceGroundActors,
  );
  removed += trimChildren(
    root.getObjectByName("grazing-patches"),
    CALM_ISLAND_COMPOSITION.groundPatches,
  );
  removed += trimChildren(
    authoredFlora(root, design.eraId),
    CALM_ISLAND_COMPOSITION.floraActors,
  );

  if (design.eraId === "prehistoric") {
    removed += trimChildren(
      root.getObjectByName("gravel-shelf"),
      CALM_ISLAND_COMPOSITION.prehistoricGravel,
    );
    removed += trimChildren(
      root.getObjectByName("shore-boulder-clusters"),
      CALM_ISLAND_COMPOSITION.prehistoricBoulders,
    );
    // The shipped camera layers three natural families into the same small landing sector:
    // boulder cluster 2, three gravel-shelf pieces, and one generic small stone. Together with
    // the former slipway pebbles they completed the reported diagonal pile. Cull by the source
    // position that produces that screen-space overlap, not by today's child names, while the
    // same families keep their independent floors around the rest of the shore.
    for (const family of [
      root.getObjectByName("shore-boulder-clusters"),
      root.getObjectByName("gravel-shelf"),
      root.getObjectByName("evan-ground-scatter"),
    ]) {
      for (const child of [...(family?.children ?? [])]) {
        const inLandingSector =
          child.position.x >= 2.7 && child.position.x <= 11.7 && child.position.z >= 21.6;
        if (!inLandingSector) {
          continue;
        }
        family?.remove(child);
        disposeRemovedGeometry(child);
        removed += 1;
      }
    }
  } else {
    removed += trimChildren(
      root.getObjectByName("gravel-rim"),
      CALM_ISLAND_COMPOSITION.looseShoreActors,
      (child) => child.name !== "reed-banks",
    );
  }
  removed += trimChildren(
    root.getObjectByName("reed-banks"),
    CALM_ISLAND_COMPOSITION.reedMeshes,
  );
  const familyBudgeted = new Set([
    "gravel-rim",
    "gravel-shelf",
    "shore-boulder-clusters",
    "reed-banks",
    authoredFlora(root, design.eraId)?.name,
  ]);
  for (const signature of design.signatures) {
    if (familyBudgeted.has(signature)) {
      continue;
    }
    removed += trimChildren(
      root.getObjectByName(signature),
      CALM_ISLAND_COMPOSITION.repeatedSignatureDetails,
      (child) => SECONDARY_SIGNATURE_DETAIL.test(child.name),
    );
  }

  root.userData.calmIslandComposition = true;
  root.userData.calmIslandRemovedActors = removed;
}

function cullChildrenInClearings(
  parent: THREE.Object3D,
  clearings: readonly EvanRuntimeClearing[],
  qualifies: (child: THREE.Object3D) => boolean,
): number {
  let removed = 0;
  for (const child of [...parent.children]) {
    if (
      qualifies(child) &&
      clearings.some((clearing) => evanRuntimeClearingContains(clearing, child.position))
    ) {
      parent.remove(child);
      disposeRemovedGeometry(child);
      removed += 1;
    }
  }
  return removed;
}

function cloneMaterialWith(
  source: THREE.Material,
  change: (material: THREE.Material) => void,
): THREE.Material {
  const material = source.clone();
  change(material);
  material.needsUpdate = true;
  return material;
}

function adaptEvanIslandForCity(root: THREE.Group, design: EraIslandDesign): void {
  const clearings = EVAN_RUNTIME_CLEARINGS[design.eraId];
  let removed = 0;
  const patches = root.getObjectByName("grazing-patches");
  if (patches !== undefined) {
    removed += cullChildrenInClearings(patches, clearings, () => true);
  }
  const scatter = root.getObjectByName("evan-ground-scatter");
  if (scatter !== undefined) {
    removed += cullChildrenInClearings(scatter, clearings, () => true);
  }
  const flora =
    root.getObjectByName("evan-authored-flora") ??
    root.getObjectByName("wind-cropped-trees") ??
    root.getObjectByName("cypress-stands") ??
    root.getObjectByName("willow-marsh") ??
    root.getObjectByName("topiary-groves");
  if (flora !== undefined) {
    removed += cullChildrenInClearings(
      flora,
      clearings,
      (child) =>
        /scrub|thorn|bracken|coppice|topiary-single|reclaim-scrub/.test(child.name) &&
        !/tree|olive|cypress|willow|elm|survivor/.test(child.name),
    );
  }

  const structuralTerrain = new Set([
    "evan-battered-keel",
    "evan-shore-rim",
    "prehistoric-shore-gravel",
    "prehistoric-shore-wet-gravel",
    "evan-plateau",
    "island-lagoon",
  ]);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    if (mesh.userData.terrainSurface === true && !structuralTerrain.has(mesh.name)) {
      const makeOverlay = (material: THREE.Material) =>
        cloneMaterialWith(material, (clone) => {
          clone.depthWrite = false;
        });
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(makeOverlay)
        : makeOverlay(mesh.material);
      mesh.renderOrder = 100;
      mesh.userData.runtimeTerrainOverlay = true;
    }
    if (
      design.eraId === "cyberpunk" &&
      (mesh.name.includes("neon-reflection") ||
        mesh.name.includes("fissure-amber-glow") ||
        mesh.name.includes("revetment-marker"))
    ) {
      const raiseNeon = (material: THREE.Material) =>
        cloneMaterialWith(material, (clone) => {
          clone.toneMapped = false;
          clone.transparent = true;
          clone.opacity = Math.max(0.66, clone.opacity);
          clone.depthWrite = false;
        });
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(raiseNeon)
        : raiseNeon(mesh.material);
      mesh.renderOrder = 110;
    }
  });
  root.userData.evanRuntimeClearings = clearings.map((clearing) => clearing.name);
  root.userData.evanRuntimeClearedObjects = removed;
}

class EvanIslandBuilder {
  readonly root = new THREE.Group();
  readonly palette: EvanSourcePalette;
  private readonly materials = new Map<number, THREE.MeshToonMaterial>();
  private readonly emissive = new Map<string, THREE.MeshBasicMaterial>();
  private readonly gradientMap: THREE.DataTexture;
  private random: Random = lcg(1);
  private sequence = 0;

  constructor(
    readonly design: EraIslandDesign,
    readonly protectedRadius: number,
    readonly includeSea: boolean,
  ) {
    this.palette = design.sourcePalette;
    this.gradientMap = new THREE.DataTexture(
      new Uint8Array([188, 188, 188, 255, 224, 224, 224, 255, 255, 255, 255, 255]),
      3,
      1,
      THREE.RGBAFormat,
    );
    this.gradientMap.minFilter = THREE.NearestFilter;
    this.gradientMap.magFilter = THREE.NearestFilter;
    this.gradientMap.generateMipmaps = false;
    this.gradientMap.needsUpdate = true;
    this.root.name = design.sceneName;
    this.root.userData.evanSourceEra = design.sourceEra;
    this.root.userData.evanSourceClass = design.sourceClassName;
  }

  build(): THREE.Group {
    this.land();
    this.patches();
    this.features();
    this.flora();
    this.ground();
    this.shore();
    restrainDecorativePopulation(this.root, this.design);
    if (this.protectedRadius > 0) {
      adaptEvanIslandForCity(this.root, this.design);
    }
    return this.root;
  }

  private rng(seed: number): Random {
    // The source seeds composition coordinates but uses Math.random() inside primitive detail.
    // Keep those streams separate: authored placements follow Evan's literal LCG seeds, while
    // formerly-unseeded rotations, colour picks and blade jitter become deterministic.
    this.random = lcg(seed ^ 0x9e3779b9);
    return lcg(seed);
  }

  private pick<T>(values: readonly T[], random: Random = this.random): T {
    const value = values[Math.floor(random() * values.length)];
    if (value === undefined) {
      throw new Error(
        `Evan island ${this.design.sourceEra}: cannot pick from an empty palette.`,
      );
    }
    return value;
  }

  private tone(name: string): number {
    const value = this.palette[name];
    if (typeof value !== "number") {
      throw new Error(
        `Evan island ${this.design.sourceEra}: "${name}" is not a scalar tone.`,
      );
    }
    return value;
  }

  private tones(name: string): readonly number[] {
    const value = this.palette[name];
    if (!Array.isArray(value)) {
      throw new Error(
        `Evan island ${this.design.sourceEra}: "${name}" is not a tone family.`,
      );
    }
    return value as unknown as readonly number[];
  }

  private mat(color: number): THREE.MeshToonMaterial {
    const existing = this.materials.get(color);
    if (existing) {
      return existing;
    }
    const material = new THREE.MeshToonMaterial({
      // Modern Three converts numeric CSS/sRGB colours on assignment. Evan's older standalone
      // did that conversion explicitly; doing both here would double-convert and blacken it.
      color,
      gradientMap: this.gradientMap,
    });
    this.materials.set(color, material);
    return material;
  }

  private emat(color: number, opacity = 1): THREE.MeshBasicMaterial {
    const key = `${color}|${opacity}`;
    const existing = this.emissive.get(key);
    if (existing) {
      return existing;
    }
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    });
    this.emissive.set(key, material);
    return material;
  }

  private mesh(
    group: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.userData.evanAuthored = true;
    group.add(mesh);
    return mesh;
  }

  private box(
    group: THREE.Object3D,
    name: string,
    width: number,
    height: number,
    depth: number,
    color: number,
    x: number,
    y: number,
    z: number,
    rotationY = 0,
    glow = false,
  ): THREE.Mesh {
    const mesh = this.mesh(
      group,
      new THREE.BoxGeometry(width, height, depth),
      glow ? this.emat(color) : this.mat(color),
      name,
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    return mesh;
  }

  private cyl(
    group: THREE.Object3D,
    name: string,
    top: number,
    bottom: number,
    height: number,
    color: number,
    x: number,
    y: number,
    z: number,
    segments = 12,
    glow = false,
  ): THREE.Mesh {
    const mesh = this.mesh(
      group,
      new THREE.CylinderGeometry(top, bottom, height, segments),
      glow ? this.emat(color) : this.mat(color),
      name,
    );
    mesh.position.set(x, y, z);
    return mesh;
  }

  private cone(
    group: THREE.Object3D,
    name: string,
    radius: number,
    height: number,
    color: number,
    x: number,
    y: number,
    z: number,
    segments = 8,
  ): THREE.Mesh {
    return this.cyl(group, name, 0, radius, height, color, x, y + height / 2, z, segments);
  }

  private disc(
    group: THREE.Object3D,
    name: string,
    radius: number,
    height: number,
    color: number,
    x: number,
    y: number,
    z: number,
    segments = 9,
    squeeze = 1,
    rotationY = 0,
  ): THREE.Mesh {
    const mesh = this.cyl(
      group,
      name,
      radius,
      radius * 0.94,
      height,
      color,
      x,
      y + height / 2,
      z,
      segments,
    );
    mesh.scale.z = squeeze;
    mesh.rotation.y = rotationY;
    mesh.userData.terrainSurface = true;
    return mesh;
  }

  /**
   * One continuous faceted slope between adjacent Era 1 shore materials.
   *
   * Shared boundary wobble keeps consecutive courses touching while breaking the concentric,
   * machined-ring silhouette. The geometry has no vertical riser: every material transition is
   * a sloped surface, which is what makes the edge read as a shelf rather than a terrace.
   */
  private prehistoricShoreCourse(
    group: THREE.Object3D,
    name: string,
    innerRadius: number,
    outerRadius: number,
    innerY: number,
    outerY: number,
    color: number,
    innerBoundary: number,
    outerBoundary: number,
  ): THREE.Mesh {
    const positions: number[] = [];
    const indices: number[] = [];
    const boundaryRadius = (base: number, boundary: number, index: number): number =>
      base +
      Math.sin(index * 1.73 + boundary * 0.91) * 0.06 +
      Math.cos(index * 0.79 - boundary * 1.27) * 0.03;
    for (let index = 0; index <= D.N; index += 1) {
      const facet = index % D.N;
      const angle = D.ROT + (facet / D.N) * TAU;
      for (const [radius, y, boundary] of [
        [innerRadius, innerY, innerBoundary],
        [outerRadius, outerY, outerBoundary],
      ] as const) {
        const r = boundaryRadius(radius, boundary, facet);
        positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
      }
      if (index < D.N) {
        const at = index * 2;
        indices.push(at, at + 2, at + 1, at + 1, at + 2, at + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const course = this.mesh(group, geometry, this.mat(color), name);
    course.receiveShadow = true;
    course.userData.terrainSurface = true;
    course.userData.prehistoricShoreCourse = true;
    return course;
  }

  /**
   * A low, crowned earth mass: one readable silhouette, no flat lid and no prop population.
   *
   * The long axis follows the shoreline, so each rise frames the settlement from outside the
   * walkable disc instead of pointing into a building lane. Half a faceted sphere gives the key
   * light enough changing normal to describe the height without adding texture or decals. The
   * closed ellipsoid is half-buried in the plateau: no open underside reaches the shadow pass,
   * and the visible crown grows out of the ground instead of sitting on it like a separate prop.
   */
  private prehistoricLandform(
    parent: THREE.Object3D,
    input: {
      readonly id: string;
      readonly angle: number;
      readonly radius: number;
      readonly tangentSpan: number;
      readonly radialSpan: number;
      readonly height: number;
      readonly color: number;
    },
  ): void {
    const [x, z] = this.pt(input.angle, input.radius);
    const landform = new THREE.Group();
    landform.name = `prehistoric-${input.id}`;
    landform.position.set(x, D.TOP - 0.06, z);
    landform.rotation.y = -input.angle - Math.PI / 2;
    landform.userData.prehistoricLandform = true;
    landform.userData.landformId = input.id;

    const crown = this.mesh(
      landform,
      new THREE.SphereGeometry(1, 9, 6),
      this.mat(input.color),
      `${landform.name}-crown`,
    );
    crown.scale.set(input.tangentSpan / 2, input.height / 2, input.radialSpan / 2);
    crown.castShadow = true;
    crown.receiveShadow = true;
    parent.add(landform);
  }

  /**
   * Three asymmetrical rises make the flat buildable clearing read as sheltered ground.
   *
   * All three stay outside the source-space protected radius (22.5u for Era 1), leave the
   * +z boat/paddle corridor open, and use terrain tones already present on the island.
   */
  private prehistoricRelief(group: THREE.Object3D): void {
    const relief = new THREE.Group();
    relief.name = "prehistoric-terrain-relief";
    this.prehistoricLandform(relief, {
      id: "windward-tussock-shoulder",
      angle: 2.52,
      radius: 23.8,
      tangentSpan: 7,
      radialSpan: 1.9,
      height: 1.35,
      color: this.palette.ground,
    });
    this.prehistoricLandform(relief, {
      id: "eroded-earth-bank",
      angle: 3.83,
      radius: 24,
      tangentSpan: 8,
      radialSpan: 2,
      height: 1.55,
      color: 0xa5ae51,
    });
    this.prehistoricLandform(relief, {
      id: "gravel-backed-rise",
      angle: 5.18,
      radius: 23.8,
      tangentSpan: 6.5,
      radialSpan: 1.8,
      height: 1.4,
      color: 0xb0b45f,
    });
    group.add(relief);
  }

  private slab(
    group: THREE.Object3D,
    name: string,
    width: number,
    height: number,
    depth: number,
    color: number,
    x: number,
    y: number,
    z: number,
    rotationY = 0,
    tilt = 0,
  ): THREE.Mesh {
    const mesh = this.box(
      group,
      name,
      width,
      height,
      depth,
      color,
      x,
      y + height / 2,
      z,
      rotationY,
    );
    mesh.rotation.z = tilt;
    return mesh;
  }

  private strip(
    group: THREE.Object3D,
    name: string,
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    width: number,
    color: number,
    y: number = D.TOP,
    height: number = 0.12,
    glow = false,
  ): THREE.Mesh {
    const length = Math.hypot(x1 - x0, z1 - z0);
    return this.box(
      group,
      name,
      length,
      height,
      width,
      color,
      (x0 + x1) / 2,
      y + height / 2,
      (z0 + z1) / 2,
      -Math.atan2(z1 - z0, x1 - x0),
      glow,
    );
  }

  private pad(
    group: THREE.Object3D,
    name: string,
    width: number,
    depth: number,
    color: number,
    x: number,
    z: number,
    rotationY = 0,
    y: number = D.TOP,
    height: number = 0.12,
  ): THREE.Mesh {
    const mesh = this.box(
      group,
      name,
      width,
      height,
      depth,
      color,
      x,
      y + height / 2,
      z,
      rotationY,
    );
    mesh.userData.terrainSurface = true;
    return mesh;
  }

  private pt(angle: number, radius: number): readonly [number, number] {
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  }

  private terrY(x: number, z: number): number {
    const radius = Math.hypot(x, z);
    return radius < D.RP - 0.3 ? D.TOP : radius < D.RS ? D.RIM : D.BEV;
  }

  private authoredGroup(name: string, build: (group: THREE.Group) => void): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    group.userData.evanSignature = this.design.signatures.includes(name);
    build(group);
    this.root.add(group);
    return group;
  }

  private plantGroup(
    parent: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    build: (group: THREE.Group) => void,
  ): void {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, this.terrY(x, z), z);
    build(group);
    parent.add(group);
  }

  private pole(
    group: THREE.Object3D,
    name: string,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    color = this.palette.trunk,
  ): THREE.Mesh {
    return this.cyl(
      group,
      name,
      radius * 0.94,
      radius,
      height,
      color,
      x,
      y + height / 2,
      z,
      7,
    );
  }

  private stone(
    group: THREE.Object3D,
    name: string,
    scale: number,
    x: number,
    y: number,
    z: number,
    color = this.pick(this.palette.stone),
    random: Random = this.random,
  ): THREE.Mesh {
    const mesh = this.mesh(
      group,
      new THREE.DodecahedronGeometry(scale, 0),
      this.mat(color),
      name,
    );
    mesh.position.set(x, y + scale * 0.4, z);
    mesh.scale.set(1, 0.62, 0.9);
    mesh.rotation.set(0.1, random() * TAU, 0.08);
    return mesh;
  }

  private broadleaf(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
    leaves: readonly number[] = this.palette.leaf,
  ): void {
    this.pole(group, `${name}-trunk`, 0.3 * scale, 2.2 * scale, x, 0, z);
    const crowns = [
      [0, 2.8, 0, 1.4],
      [1, 2.35, 0.35, 0.95],
      [-0.8, 2.5, -0.55, 0.9],
      [0.25, 3.45, -0.65, 0.78],
    ] as const;
    for (const [index, [bx, by, bz, radius]] of crowns.entries()) {
      const mesh = this.mesh(
        group,
        new THREE.IcosahedronGeometry(radius * scale, 0),
        this.mat(this.pick(leaves)),
        `${name}-crown-${index + 1}`,
      );
      mesh.position.set(x + bx * scale, by * scale, z + bz * scale);
      mesh.scale.set(1.15, 0.86, 1);
      mesh.rotation.set(this.random(), this.random() * TAU, this.random());
    }
  }

  private neolithicTree(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
  ): void {
    this.pole(group, `${name}-trunk`, 0.26 * scale, 2 * scale, x, 0, z);
    const crowns = [
      [0, 2.5, 0, 1.25],
      [0.9, 2.1, 0.3, 0.85],
      [-0.7, 2.2, -0.5, 0.8],
      [0.2, 3.05, -0.6, 0.7],
    ] as const;
    crowns.forEach(([bx, by, bz, radius], index) => {
      const mesh = this.mesh(
        group,
        new THREE.IcosahedronGeometry(radius * scale, 0),
        this.mat(this.pick(this.palette.leaf)),
        `${name}-crown-${index + 1}`,
      );
      mesh.position.set(x + bx * scale, by * scale, z + bz * scale);
      mesh.scale.set(1.15, 0.78, 1);
      mesh.rotation.set(this.random(), this.random() * TAU, this.random());
    });
  }

  private olive(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
    leaves: readonly number[] = this.palette.leaf,
  ): void {
    const trunk = this.pole(group, `${name}-trunk`, 0.34 * scale, 1.15 * scale, x, 0, z);
    trunk.rotation.z = 0.1;
    const crowns = [
      [-0.55, 1.7, 0.1, 1.15, 0.62],
      [0.6, 1.9, -0.2, 1, 0.6],
      [0.05, 2.25, 0.45, 0.8, 0.58],
    ] as const;
    crowns.forEach(([bx, by, bz, radius, squeeze], index) => {
      const mesh = this.mesh(
        group,
        new THREE.IcosahedronGeometry(radius * scale, 0),
        this.mat(this.pick(leaves)),
        `${name}-crown-${index + 1}`,
      );
      mesh.position.set(x + bx * scale, by * scale, z + bz * scale);
      mesh.scale.set(1.3, squeeze, 1.2);
      mesh.rotation.set(0.2, this.random() * TAU, 0.15);
    });
  }

  private spire(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
    leaves: readonly number[] = this.palette.leaf,
  ): void {
    this.pole(group, `${name}-trunk`, 0.16 * scale, 0.9 * scale, x, 0, z);
    const color = this.pick(leaves);
    this.cone(
      group,
      `${name}-lower`,
      0.72 * scale,
      4.6 * scale,
      color,
      x,
      0.5 * scale,
      z,
      7,
    );
    this.cone(
      group,
      `${name}-upper`,
      0.5 * scale,
      2.4 * scale,
      color,
      x,
      3.1 * scale,
      z,
      7,
    );
  }

  private coppice(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
    leaves: readonly number[] = this.palette.leaf,
  ): void {
    for (let index = 0; index < 5; index += 1) {
      const angle = this.random() * TAU;
      const radius = 0.3 * scale;
      const stem = this.pole(
        group,
        `${name}-stem-${index + 1}`,
        0.1 * scale,
        (1.5 + this.random() * 0.9) * scale,
        x + Math.cos(angle) * radius,
        0,
        z + Math.sin(angle) * radius,
      );
      stem.rotation.z = (this.random() - 0.5) * 0.4;
      stem.rotation.x = (this.random() - 0.5) * 0.4;
    }
    const crown = this.mesh(
      group,
      new THREE.IcosahedronGeometry(1.15 * scale, 0),
      this.mat(this.pick(leaves)),
      `${name}-crown`,
    );
    crown.position.set(x, 2.1 * scale, z);
    crown.scale.set(1.2, 0.74, 1.1);
    crown.rotation.y = this.random() * TAU;
  }

  private deadTree(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
    color = this.palette.trunk,
  ): void {
    this.pole(group, `${name}-trunk`, 0.3 * scale, 2.4 * scale, x, 0, z, color);
    const branches = [
      [0.5, 2.2, 0.1, 1.5, 0.8],
      [-0.45, 2.5, -0.3, 1.2, -0.9],
      [0.1, 2.8, 0.5, 1, 0.4],
    ] as const;
    branches.forEach(([bx, by, bz, length, tilt], index) => {
      const branch = this.cyl(
        group,
        `${name}-branch-${index + 1}`,
        0.06 * scale,
        0.13 * scale,
        length * scale,
        color,
        x + bx * scale,
        by * scale,
        z + bz * scale,
        5,
      );
      branch.rotation.z = tilt;
      branch.rotation.x = (this.random() - 0.5) * 0.7;
    });
  }

  private scrub(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    radius: number,
    leaves: readonly number[] = this.palette.leaf,
  ): THREE.Mesh {
    const mesh = this.mesh(
      group,
      new THREE.IcosahedronGeometry(radius, 0),
      this.mat(this.pick(leaves)),
      name,
    );
    mesh.position.set(x, radius * 0.55, z);
    mesh.scale.set(1.12, 0.7, 1);
    mesh.rotation.set(this.random(), this.random() * TAU, this.random());
    return mesh;
  }

  private topiary(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
    leaves: readonly number[] = this.palette.leaf,
  ): void {
    this.pole(group, `${name}-trunk`, 0.15 * scale, 1.6 * scale, x, 0, z);
    const crown = this.mesh(
      group,
      new THREE.IcosahedronGeometry(0.92 * scale, 1),
      this.mat(this.pick(leaves)),
      `${name}-crown`,
    );
    crown.position.set(x, 2.4 * scale, z);
    crown.scale.set(1, 0.94, 1);
  }

  private tuft(
    group: THREE.Object3D,
    name: string,
    x: number,
    z: number,
    scale: number,
  ): void {
    for (let index = 0; index < 5; index += 1) {
      const mesh = this.cone(
        group,
        `${name}-${index + 1}`,
        0.08 * scale,
        (0.55 + this.random() * 0.45) * scale,
        this.pick(this.palette.grass),
        x + (this.random() - 0.5) * 0.66 * scale,
        0,
        z + (this.random() - 0.5) * 0.66 * scale,
        4,
      );
      mesh.rotation.z = (this.random() - 0.5) * 0.65;
      mesh.rotation.x = (this.random() - 0.5) * 0.55;
    }
  }

  private reeds(
    group: THREE.Object3D,
    name: string,
    x: number,
    y: number,
    z: number,
    radius: number,
    count: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * TAU;
      const distance = this.random() * radius;
      const height = 1.3 + this.random() * 1.1;
      const reed = this.cyl(
        group,
        `${name}-${index + 1}`,
        0.035,
        0.055,
        height,
        this.pick(this.palette.reed),
        x + Math.cos(angle) * distance,
        y + height / 2 - 0.25,
        z + Math.sin(angle) * distance,
        4,
      );
      reed.rotation.z = (this.random() - 0.5) * 0.5;
      reed.rotation.x = (this.random() - 0.5) * 0.4;
    }
  }

  private hedgerow(
    group: THREE.Object3D,
    name: string,
    angle0: number,
    radius0: number,
    angle1: number,
    radius1: number,
    count: number,
    radius: number,
    leaves: readonly number[],
  ): void {
    const [x0, z0] = this.pt(angle0, radius0);
    const [x1, z1] = this.pt(angle1, radius1);
    for (let index = 0; index <= count; index += 1) {
      const amount = index / count;
      const x = x0 + (x1 - x0) * amount;
      const z = z0 + (z1 - z0) * amount;
      this.plantGroup(group, `${name}-${index + 1}`, x, z, (plant) =>
        this.scrub(plant, "crown", 0, 0, radius * (0.82 + this.random() * 0.4), leaves),
      );
    }
  }

  private land(): void {
    const group = new THREE.Group();
    group.name = "evan-shared-13-sided-plateau";
    const deck = (
      name: string,
      top: number,
      bottom: number,
      height: number,
      color: number,
      yTop: number,
    ) => {
      const mesh = this.cyl(
        group,
        name,
        top,
        bottom,
        height,
        color,
        0,
        yTop - height / 2,
        0,
        D.N,
      );
      mesh.rotation.y = D.ROT;
      mesh.userData.terrainSurface = true;
    };
    deck("evan-battered-keel", D.RK + 6.8, D.RK, 9.6, this.palette.keel, D.BEV + 0.1);
    deck("evan-plateau", D.RP, D.RP + 0.5, 0.68, this.palette.ground, D.TOP);
    if (this.design.sourceEra === 1) {
      this.prehistoricShoreCourse(
        group,
        "evan-shore-rim",
        D.RP - 0.05,
        D.RP + 0.4,
        D.TOP + 0.02,
        -0.12,
        0xc3b584,
        0,
        1,
      );
      this.prehistoricShoreCourse(
        group,
        "prehistoric-shore-gravel",
        D.RP + 0.4,
        D.RP + 0.85,
        -0.12,
        -0.3,
        0xb8a877,
        1,
        2,
      );
      this.prehistoricShoreCourse(
        group,
        "prehistoric-shore-wet-gravel",
        D.RP + 0.85,
        D.RP + 1.3,
        -0.3,
        -0.72,
        0xb8aa7e,
        2,
        3,
      );
      this.prehistoricRelief(group);
    } else {
      deck("evan-shore-rim", D.RS, D.RK + 6.75, 1, this.palette.shore, D.RIM + 0.1);
    }
    if (this.includeSea) {
      const sea = this.cyl(
        group,
        "island-lagoon",
        1,
        0.94,
        5.2,
        this.palette.sea,
        0,
        D.WY - 2.6,
        0,
        72,
      );
      sea.scale.set(46, 1, 46);
      const red = ((this.palette.sea >> 16) & 0xff) / 255;
      const green = ((this.palette.sea >> 8) & 0xff) / 255;
      const blue = (this.palette.sea & 0xff) / 255;
      sea.material = new THREE.MeshStandardMaterial({
        // The standalone assigns the sea hex directly in a legacy colour-managed renderer.
        // Store those channel values as linear to reproduce that one intentionally brighter
        // material under modern Three's automatic sRGB conversion.
        color: new THREE.Color().setRGB(red, green, blue, THREE.LinearSRGBColorSpace),
        roughness: 0.24,
        metalness: 0.06,
        flatShading: true,
      });
      sea.userData.terrainSurface = true;
    }
    this.root.add(group);
  }

  private patchDefinitions(): readonly (readonly [number, number, number, number])[] {
    const byEra: Record<number, readonly (readonly [number, number, number, number])[]> = {
      // Era 1's former six 2.8–4.2u-radius cylinders became the oversized brown polygons visible
      // in the public frame. Three sub-unit variations retain the legal-grid depth-overlap
      // contract without becoming landforms, plazas or a substitute for the crowned relief.
      // 2026-08-21: the two brown-toned patches read as clutter ("delete all the brown stuff");
      // all three are now shades of the same green so they read as intentional grazing patches.
      1: [
        [1.78, 0.86, 0.72, 0x9eaa4a],
        [3.12, 0.84, 0.64, 0x8fa347],
        [5.82, 0.88, 0.78, 0xa6b555],
      ],
      2: [
        [1.6, 0.42, 7.4, 0x9c8250],
        [4.35, 0.55, 8.6, 0xb39463],
        [5.55, 0.48, 7, 0xb1935f],
        [0.62, 0.68, 6.6, 0x9a8a52],
        [3.55, 0.3, 5.4, 0xb0955f],
        [0.05, 0.86, 5, 0x8f8449],
        [2.2, 0.88, 5.6, 0xae9260],
      ],
      3: [
        [1.6, 0.42, 7.4, 0xb6a582],
        [4.35, 0.55, 8.6, 0xcbbc98],
        [2.85, 0.72, 6.2, 0xafa07c],
        [5.55, 0.48, 7, 0xc7b693],
        [0.62, 0.68, 6.6, 0xb9aa86],
        [3.55, 0.3, 5.4, 0xc9ba96],
        [0.05, 0.86, 5, 0xab9c79],
        [2.2, 0.88, 5.6, 0xc3b48f],
      ],
      4: [
        [1.6, 0.42, 7.4, 0xb4ac8a],
        [4.35, 0.55, 8.6, 0xc2ba98],
        [2.85, 0.72, 6.2, 0xa9a57f],
        [5.55, 0.48, 7, 0xbcb593],
        [0.62, 0.68, 6.6, 0xb0a98a],
        [3.55, 0.3, 5.4, 0xc4bc9c],
        [0.05, 0.86, 5, 0xa6a17c],
        [2.2, 0.88, 5.6, 0xbeb694],
      ],
      5: [
        [1.6, 0.42, 7.4, 0x77864a],
        [4.35, 0.55, 8.6, 0x64703f],
        [2.85, 0.72, 6.2, 0x7c8b4e],
        [5.55, 0.48, 7, 0x687545],
        [0.62, 0.68, 6.6, 0x808e52],
        [3.55, 0.3, 5.4, 0x6b7843],
        [0.05, 0.86, 5, 0x74824a],
        [2.2, 0.88, 5.6, 0x616d3c],
      ],
      6: [
        [1.6, 0.42, 7.4, 0x7f8b52],
        [4.35, 0.55, 8.6, 0x6e7a47],
        [2.85, 0.72, 6.2, 0x86924f],
        [5.55, 0.48, 7, 0x74804a],
        [0.62, 0.68, 6.6, 0x8a9656],
        [3.55, 0.3, 5.4, 0x717d48],
        [0.05, 0.86, 5, 0x7c8850],
        [2.2, 0.88, 5.6, 0x6a7644],
      ],
      7: [
        [1.6, 0.42, 7.4, 0x676650],
        [4.35, 0.55, 8.6, 0x72705a],
        [2.85, 0.72, 6.2, 0x5c5c44],
        [5.55, 0.48, 7, 0x6c6a52],
        [0.62, 0.68, 6.6, 0x615f49],
        [3.55, 0.3, 5.4, 0x757360],
        [0.05, 0.86, 5, 0x585843],
        [2.2, 0.88, 5.6, 0x6e6c54],
      ],
      8: [
        [1.6, 0.42, 7.8, 0x86a78e],
        [4.35, 0.55, 8.8, 0xb8b7a0],
        [2.85, 0.72, 6.4, 0x7c9e86],
        [5.55, 0.48, 7.2, 0xafb29b],
        [0.62, 0.68, 6.8, 0x8aae93],
        [3.55, 0.3, 5.6, 0xc0bca6],
        [0.05, 0.86, 5.2, 0x9fa98f],
        [2.2, 0.88, 5.8, 0xb5b49d],
      ],
      9: [
        [1.6, 0.42, 7.6, 0x74857c],
        [4.35, 0.55, 8.6, 0x8a9490],
        [2.85, 0.72, 6.2, 0x6c7d74],
        [5.55, 0.48, 7, 0x869089],
        [0.62, 0.68, 6.6, 0x788a80],
        [3.55, 0.3, 5.4, 0x929a94],
        [0.05, 0.86, 5, 0x707f77],
        [2.2, 0.88, 5.6, 0x8c9691],
      ],
      10: [
        [1.6, 0.42, 7.6, 0x333942],
        [4.35, 0.55, 8.6, 0x2a3038],
        [2.85, 0.72, 6.2, 0x363d46],
        [5.55, 0.48, 7, 0x2c323b],
        [0.62, 0.68, 6.6, 0x323944],
        [3.55, 0.3, 5.4, 0x272d35],
        [0.05, 0.86, 5, 0x353c45],
        [2.2, 0.88, 5.6, 0x2a3039],
      ],
    };
    return byEra[this.design.sourceEra] ?? [];
  }

  private patches(): void {
    const random = this.rng(this.design.sourceEra === 2 ? 20260804 : 20260805);
    const group = new THREE.Group();
    group.name = "grazing-patches";
    group.userData.evanSignature = this.design.signatures.includes(group.name);
    for (const [
      index,
      [angle, factor, radius, color],
    ] of this.patchDefinitions().entries()) {
      const [x, z] = this.pt(angle, D.RP * factor);
      const patch =
        this.design.sourceEra === 2
          ? this.cyl(
              group,
              `ground-patch-${index + 1}`,
              radius,
              radius * (0.86 + random() * 0.2),
              0.14,
              color,
              x,
              D.TOP + 0.02,
              z,
              7 + Math.floor(random() * 3),
            )
          : this.disc(
              group,
              `ground-patch-${index + 1}`,
              radius,
              0.14,
              color,
              x,
              D.TOP + 0.02,
              z,
              7 + Math.floor(random() * 3),
              0.7 + random() * 0.5,
              random() * TAU,
            );
      if (this.design.sourceEra === 2) {
        patch.rotation.y = random() * TAU;
        patch.scale.z = 0.7 + random() * 0.5;
        patch.userData.terrainSurface = true;
      }
      patch.position.y = D.TOP + 0.09;
    }
    this.root.add(group);
  }

  private features(): void {
    switch (this.design.sourceEra) {
      case 1:
        this.prehistoricFeatures();
        return;
      case 2:
        return;
      case 3:
        this.bronzeFeatures();
        return;
      case 4:
        this.classicalFeatures();
        return;
      case 5:
        this.medievalFeatures();
        return;
      case 6:
        this.earlyModernFeatures();
        return;
      case 7:
        this.industrialFeatures();
        return;
      case 8:
        this.atomicFeatures();
        return;
      case 9:
        this.informationFeatures();
        return;
      case 10:
        this.cyberpunkFeatures();
    }
  }

  /**
   * Era 1 authors no decorative props at all, on explicit request (2026-08-21): "just take
   * out any of the art thats not the trees, it just looks so bad." The gravel-shelf and
   * shore-boulder-cluster stone families this method used to build are gone entirely --
   * `wind-cropped-trees` (built by the shared flora pass, not here) is untouched, and so is
   * the island's terrain/ground itself.
   */
  private prehistoricFeatures(): void {}

  private bronzeFeatures(): void {
    const random = this.rng(30301);
    this.authoredGroup("dry-stone-terraces", (group) => {
      for (const [radius, span, center] of [
        [D.RP * 0.74, 1.18, 4.98],
        [D.RP * 0.86, 1.05, 5.05],
        [D.RP * 0.95, 0.86, 5.12],
      ] as const) {
        const count = Math.round((span * radius) / 0.72);
        for (let index = 0; index <= count; index += 1) {
          const angle = center - span / 2 + (span * index) / count;
          const [x, z] = this.pt(angle, radius + (random() - 0.5) * 0.3);
          const block = this.box(
            group,
            `terrace-stone-${this.sequence++}`,
            0.62 + random() * 0.2,
            0.34 + random() * 0.14,
            0.5,
            this.pick(this.palette.stone, random),
            x,
            this.terrY(x, z) + 0.17,
            z,
            -angle,
          );
          if (random() < 0.5) block.position.y += 0.26;
        }
      }
      for (const [index, [angle, radius, size]] of [
        [5.05, D.RP * 0.905, 3],
        [4.78, D.RP * 0.89, 2.7],
        [5.34, D.RP * 0.9, 2.7],
        [4.95, D.RP * 0.8, 3.2],
        [5.22, D.RP * 0.795, 2.8],
        [4.68, D.RP * 0.79, 2.5],
      ].entries()) {
        const [x, z] = this.pt(angle ?? 0, radius ?? 0);
        this.disc(
          group,
          `worked-bed-${index + 1}`,
          size ?? 1,
          0.14,
          0xa88c5c,
          x,
          D.TOP + 0.08,
          z,
          8,
          0.4,
          -(angle ?? 0),
        );
      }
    });
    this.authoredGroup("copper-outcrop", (group) => {
      const [x, z] = this.pt(2.05, D.RP * 0.88);
      for (let index = 0; index < 24; index += 1) {
        const angle = random() * TAU;
        const radius = random() * 3.4;
        const scale = 0.45 + random();
        const color =
          random() < 0.34
            ? random() < 0.5
              ? this.tone("ore")
              : this.tone("oreDk")
            : this.pick(this.palette.stone, random);
        this.stone(
          group,
          `copper-rock-${index + 1}`,
          scale,
          x + Math.cos(angle) * radius,
          D.TOP - 0.05,
          z + Math.sin(angle) * radius,
          color,
          random,
        );
      }
      this.slab(
        group,
        "outcrop-bed",
        4.2,
        1.7,
        2.8,
        this.palette.stone[2] ?? 0,
        x,
        D.TOP,
        z,
        0.5,
        0.06,
      );
      this.slab(
        group,
        "copper-face",
        3,
        0.7,
        1.9,
        this.tone("ore"),
        x + 0.7,
        D.TOP + 1.5,
        z - 0.4,
        0.72,
        -0.06,
      );
      this.slab(
        group,
        "copper-dark-face",
        1.9,
        0.9,
        1.3,
        this.tone("oreDk"),
        x + 1.6,
        D.TOP + 2.1,
        z - 0.9,
        1.05,
        -0.1,
      );
    });
    this.authoredGroup("salt-pan", (group) => {
      const [x, z] = this.pt(3.55, D.RP * 0.99);
      this.disc(
        group,
        "salt-crust",
        4.3,
        0.1,
        this.tone("salt"),
        x,
        D.RIM + 0.02,
        z,
        11,
        0.68,
        0.4,
      );
      this.disc(
        group,
        "brine-sheet",
        3,
        0.08,
        this.tone("brine"),
        x,
        D.RIM + 0.06,
        z,
        11,
        0.66,
        0.4,
      );
      for (let index = 0; index < 22; index += 1) {
        const angle = random() * TAU;
        const radius = 3.2 + random() * 1.4;
        this.stone(
          group,
          `salt-crystal-${index + 1}`,
          0.14 + random() * 0.2,
          x + Math.cos(angle) * radius,
          D.RIM,
          z + Math.sin(angle) * radius * 0.68,
          this.tone("salt"),
          random,
        );
      }
    });
  }

  private classicalFeatures(): void {
    const random = this.rng(40401);
    this.authoredGroup("limestone-shelves", (group) => {
      const beds = [
        [0.3, 0.8, 7, 5, 0.42, 0.3],
        [0.3, 0.8, 5.2, 3.6, 0.4, -0.15],
        [2.3, 0.86, 6.2, 4.4, 0.4, 0.9],
        [2.3, 0.86, 4.2, 3, 0.38, 1.25],
        [4.25, 0.82, 5.6, 4, 0.4, 2.1],
      ] as const;
      beds.forEach(([angle, factor, width, depth, height, rotation], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.slab(
          group,
          `limestone-bed-${index + 1}`,
          width,
          height,
          depth,
          random() < 0.5 ? this.tone("rock") : this.tone("rockLt"),
          x,
          this.terrY(x, z) + (height > 0.41 ? 0 : 0.4),
          z,
          rotation,
        );
      });
    });
    this.authoredGroup("shelf-knoll", (group) => {
      const [x, z] = this.pt(0.3, D.RP * 0.8);
      const beds = [
        [5.4, 0.46, this.tone("rockDk")],
        [4, 0.42, this.tone("rock")],
        [2.6, 0.38, this.tone("rockLt")],
      ] as const;
      beds.forEach(([radius, height, color], index) => {
        this.disc(
          group,
          `knoll-bed-${index + 1}`,
          radius,
          height,
          color,
          x,
          D.TOP + 0.1 + index * 0.4,
          z,
          9,
          0.78,
          0.4 + index * 0.3,
        );
      });
      for (let index = 0; index < 16; index += 1) {
        const angle = random() * TAU;
        const radius = 2.8 + random() * 3.4;
        this.stone(
          group,
          `knoll-stone-${index + 1}`,
          0.2 + random() * 0.5,
          x + Math.cos(angle) * radius,
          D.TOP,
          z + Math.sin(angle) * radius * 0.8,
          undefined,
          random,
        );
      }
    });
    this.authoredGroup("gravel-cove", (group) => {
      const [x, z] = this.pt(5.35, D.RS - 0.4);
      this.disc(
        group,
        "cove-upper-strand",
        5,
        0.1,
        this.tone("grav"),
        x,
        D.RIM + 0.02,
        z,
        11,
        0.55,
        5.35,
      );
      this.disc(
        group,
        "cove-lower-strand",
        3.2,
        0.1,
        0xdcd5c2,
        x * 1.05,
        D.BEV + 0.12,
        z * 1.05,
        9,
        0.5,
        5.35,
      );
      for (let index = 0; index < 4; index += 1) {
        const [sx, sz] = this.pt(5.35 + (index - 1.5) * 0.055, D.RP - 0.4 + index * 0.55);
        this.slab(
          group,
          `cove-step-${index + 1}`,
          3.6 - index * 0.5,
          0.3,
          1,
          this.tone("rockDk"),
          sx,
          D.RIM - 0.12 * index,
          sz,
          -5.35,
        );
      }
      for (let index = 0; index < 26; index += 1) {
        const angle = 5.35 + (random() - 0.5) * 0.5;
        const radius = D.RP + random() * 2.6;
        const [sx, sz] = this.pt(angle, radius);
        this.stone(
          group,
          `cove-gravel-${index + 1}`,
          0.12 + random() * 0.26,
          sx,
          radius > D.RS - 0.2 ? D.BEV + 0.2 : D.RIM,
          sz,
          this.tone("grav"),
          random,
        );
      }
    });
  }

  private medievalFeatures(): void {
    const random = this.rng(50501);
    this.authoredGroup("chalk-bluff", (group) => {
      const [x, z] = this.pt(1.05, D.RP * 0.93);
      this.disc(
        group,
        "chalk-lower-bed",
        5.6,
        0.9,
        this.tone("chalkDk"),
        x,
        D.TOP - 0.1,
        z,
        9,
        0.6,
        1,
      );
      this.disc(
        group,
        "chalk-middle-bed",
        4,
        0.8,
        this.tone("chalk"),
        x + 0.4,
        D.TOP + 0.78,
        z + 0.2,
        8,
        0.58,
        1.3,
      );
      this.disc(
        group,
        "chalk-upper-bed",
        2.3,
        0.6,
        this.tone("chalkLt"),
        x + 0.9,
        D.TOP + 1.5,
        z + 0.1,
        7,
        0.6,
        0.8,
      );
      for (let index = 0; index < 24; index += 1) {
        const angle = random() * TAU;
        const radius = 3.4 + random() * 3;
        const sx = x + Math.cos(angle) * radius;
        const sz = z + Math.sin(angle) * radius * 0.6;
        this.stone(
          group,
          `chalk-rubble-${index + 1}`,
          0.16 + random() * 0.34,
          sx,
          this.terrY(sx, sz),
          sz,
          random() < 0.6 ? this.tone("chalk") : this.tone("chalkDk"),
          random,
        );
      }
    });
    this.authoredGroup("stream-mouth", (group) => {
      const [x, z] = this.pt(3.95, D.RP * 0.97);
      this.disc(
        group,
        "stream-mud",
        4.6,
        0.14,
        this.tone("mud"),
        x,
        D.TOP - 0.06,
        z,
        10,
        0.5,
        3.95,
      );
      this.disc(
        group,
        "stream-water",
        3.4,
        0.1,
        this.tone("water"),
        x,
        D.TOP - 0.02,
        z,
        10,
        0.42,
        3.95,
      );
      this.reeds(group, "stream-reeds-west", x - 1.6, D.TOP + 0.05, z + 1, 1.8, 22);
      this.reeds(group, "stream-reeds-east", x + 1.8, D.TOP + 0.05, z - 0.9, 1.6, 18);
      [
        [-3.6, 1.9, 0.9],
        [3.4, -2, 1],
        [0.4, 2.6, 0.8],
      ].forEach(([dx, dz, scale], index) => {
        this.plantGroup(
          group,
          `willow-${index + 1}`,
          x + (dx ?? 0),
          z + (dz ?? 0),
          (plant) =>
            this.broadleaf(plant, "willow", 0, 0, scale ?? 1, [0x6e8a46, 0x5e7a3c]),
        );
      });
    });
    this.authoredGroup("hedgerows", (group) => {
      this.hedgerow(
        group,
        "hedge-a",
        2.3,
        D.RP * 0.42,
        2.3,
        D.RP * 0.95,
        14,
        0.72,
        this.tones("hedge"),
      );
      this.hedgerow(
        group,
        "hedge-b",
        5.1,
        D.RP * 0.46,
        5.35,
        D.RP * 0.94,
        13,
        0.7,
        this.tones("hedge"),
      );
      this.hedgerow(
        group,
        "hedge-c",
        0.15,
        D.RP * 0.58,
        0.62,
        D.RP * 0.92,
        10,
        0.66,
        this.tones("hedge"),
      );
      for (let index = 0; index < 26; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.66 + random() * 0.28));
        this.plantGroup(group, `bracken-${index + 1}`, x, z, (plant) =>
          this.scrub(plant, "bracken", 0, 0, 0.32 + random() * 0.22, this.tones("bracken")),
        );
      }
    });
  }

  private earlyModernFeatures(): void {
    const random = this.rng(60601);
    this.authoredGroup("ridge-and-furrow", (group) => {
      const angle = 1.95;
      const [cx, cz] = this.pt(angle, D.RP * 0.72);
      const ux = Math.cos(angle + Math.PI / 2);
      const uz = Math.sin(angle + Math.PI / 2);
      for (let index = -6; index <= 6; index += 1) {
        const offset = index * 1.15;
        const length = 15.5 * Math.sqrt(Math.max(0.08, 1 - (offset / 8.4) ** 2));
        this.box(
          group,
          `furrow-${index + 7}`,
          0.78,
          0.2,
          length,
          index % 2 ? this.tone("furrow") : 0x7a8648,
          cx + ux * offset,
          D.TOP + 0.1,
          cz + uz * offset,
          -(angle - Math.PI / 2),
        );
      }
    });
    this.authoredGroup("cut-drain", (group) => {
      const angle = 4.55;
      const [x0, z0] = this.pt(angle, D.RP * 0.3);
      const [x1, z1] = this.pt(angle, D.RS - 0.6);
      const length = Math.hypot(x1 - x0, z1 - z0);
      const rotation = -Math.atan2(z1 - z0, x1 - x0);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      this.box(
        group,
        "drain-mud-cut",
        length,
        0.16,
        2.5,
        this.tone("mudDk"),
        cx,
        D.TOP - 0.03,
        cz,
        rotation,
      );
      this.box(
        group,
        "drain-water",
        length,
        0.12,
        1.5,
        this.tone("water"),
        cx,
        D.TOP + 0.02,
        cz,
        rotation,
      );
      for (const side of [-1, 1]) {
        this.box(
          group,
          `drain-bank-${side}`,
          length * 0.94,
          0.5,
          1.1,
          this.tone("mud"),
          cx + Math.cos(angle + Math.PI / 2) * 1.9 * side,
          D.TOP + 0.25,
          cz + Math.sin(angle + Math.PI / 2) * 1.9 * side,
          rotation,
        );
      }
      this.reeds(
        group,
        "drain-reeds",
        x1 - (x1 - x0) * 0.06,
        D.TOP + 0.05,
        z1 - (z1 - z0) * 0.06,
        1.9,
        20,
      );
    });
    this.authoredGroup("sandstone-ridge", (group) => {
      const [x, z] = this.pt(0.1, D.RP * 0.9);
      const beds = [
        [9, 3.4, 0.5, this.tone("sandDk")],
        [7.2, 2.6, 0.44, this.tone("sand")],
        [5, 1.8, 0.4, this.tone("sandLt")],
      ] as const;
      beds.forEach(([width, depth, height, color], index) => {
        this.slab(
          group,
          `sandstone-bed-${index + 1}`,
          width,
          height,
          depth,
          color,
          x,
          D.TOP + index * 0.44,
          z,
          0.1 - index * 0.08,
        );
      });
      for (let index = 0; index < 18; index += 1) {
        const angle = random() * TAU;
        const radius = 3 + random() * 3.2;
        this.stone(
          group,
          `sandstone-rubble-${index + 1}`,
          0.18 + random() * 0.4,
          x + Math.cos(angle) * radius,
          D.TOP,
          z + Math.sin(angle) * radius * 0.7,
          random() < 0.6 ? this.tone("sand") : this.tone("sandDk"),
          random,
        );
      }
    });
    this.authoredGroup("tidal-mud", (group) => {
      [
        [4.55, 6, 0.5],
        [5.15, 4.4, 0.55],
        [3.95, 4, 0.5],
      ].forEach(([angle, radius, squeeze], index) => {
        const [x, z] = this.pt(angle ?? 0, D.RS + 1.4);
        this.disc(
          group,
          `mud-flat-${index + 1}`,
          radius ?? 1,
          0.1,
          this.tone("mud"),
          x,
          D.WY - 0.2,
          z,
          10,
          squeeze ?? 1,
          -(angle ?? 0),
        );
      });
    });
    this.authoredGroup("hedged-strips", (group) => {
      this.hedgerow(
        group,
        "enclosure-a",
        1.3,
        D.RP * 0.5,
        1.3,
        D.RP * 0.96,
        12,
        0.6,
        this.tones("hedge"),
      );
      this.hedgerow(
        group,
        "enclosure-b",
        2.62,
        D.RP * 0.5,
        2.62,
        D.RP * 0.96,
        12,
        0.6,
        this.tones("hedge"),
      );
      this.hedgerow(
        group,
        "enclosure-c",
        3.4,
        D.RP * 0.55,
        3.72,
        D.RP * 0.94,
        11,
        0.58,
        this.tones("hedge"),
      );
      this.hedgerow(
        group,
        "enclosure-d",
        5.6,
        D.RP * 0.52,
        5.9,
        D.RP * 0.93,
        11,
        0.58,
        this.tones("hedge"),
      );
    });
  }

  private industrialFeatures(): void {
    const random = this.rng(70701);
    this.authoredGroup("coal-seam", (group) => {
      const [x, z] = this.pt(2.45, D.RP * 0.92);
      const ix = Math.cos(2.45);
      const iz = Math.sin(2.45);
      const tx = Math.cos(2.45 + Math.PI / 2);
      const tz = Math.sin(2.45 + Math.PI / 2);
      const beds = [
        [8, 1.5, 0.42, this.tone("coal")],
        [7.2, 1.65, 0.4, this.tone("shale")],
        [6.2, 1.8, 0.4, this.tone("ashDk")],
        [5.2, 1.95, 0.45, 0x60604a],
      ] as const;
      beds.forEach(([width, depth, height, color], index) => {
        const inset = -index * 1.5;
        this.slab(
          group,
          `coal-bed-${index + 1}`,
          width,
          height,
          depth,
          color,
          x + ix * inset,
          D.TOP - 0.15 + index * 0.4,
          z + iz * inset,
          -2.45,
        );
      });
      for (let index = 0; index < 12; index += 1) {
        const across = (random() - 0.5) * 12;
        const out = 1.4 + random() * 2.4;
        const sx = x + tx * across + ix * out;
        const sz = z + tz * across + iz * out;
        this.box(
          group,
          `coal-spall-${index + 1}`,
          0.5 + random() * 0.6,
          0.3 + random() * 0.3,
          0.4 + random() * 0.5,
          random() < 0.6 ? this.tone("coal") : this.tone("shale"),
          sx,
          this.terrY(sx, sz) + 0.18,
          sz,
          random() * TAU,
        );
      }
      for (let index = 0; index < 26; index += 1) {
        const angle = random() * TAU;
        const radius = 3.2 + random() * 3.4;
        const sx = x + Math.cos(angle) * radius;
        const sz = z + Math.sin(angle) * radius * 0.62;
        const color =
          random() < 0.5
            ? this.tone("coal")
            : random() < 0.5
              ? this.tone("shale")
              : this.tone("ashDk");
        this.stone(
          group,
          `coal-rubble-${index + 1}`,
          0.14 + random() * 0.34,
          sx,
          this.terrY(sx, sz),
          sz,
          color,
          random,
        );
      }
    });
    this.authoredGroup("spoil-heaps", (group) => {
      const [x, z] = this.pt(2.45, D.RP * 0.92);
      const ix = Math.cos(2.45);
      const iz = Math.sin(2.45);
      const tx = Math.cos(2.45 + Math.PI / 2);
      const tz = Math.sin(2.45 + Math.PI / 2);
      [[-5, -4.2, 1.4, 0.8]].forEach(([dx, dz, radius, height], index) => {
        const sx = x + ix * (dx ?? 0) + tx * (dz ?? 0);
        const sz = z + iz * (dx ?? 0) + tz * (dz ?? 0);
        this.disc(
          group,
          `spoil-foot-${index + 1}`,
          (radius ?? 1) * 1.3,
          0.12,
          this.tone("coalLt"),
          sx,
          D.TOP + 0.02,
          sz,
        );
        this.cone(
          group,
          `spoil-heap-${index + 1}`,
          radius ?? 1,
          height ?? 1,
          this.tone("coal"),
          sx,
          D.TOP + 0.1,
          sz,
          7,
        );
      });
    });
    this.authoredGroup("sandstone-quarry", (group) => {
      const [x, z] = this.pt(5.45, D.RP * 0.88);
      const ix = Math.cos(5.45);
      const iz = Math.sin(5.45);
      const tx = Math.cos(5.45 + Math.PI / 2);
      const tz = Math.sin(5.45 + Math.PI / 2);
      const beds = [
        [13, 2.6, 0.38, this.tone("sandDk")],
        [11.4, 2.4, 0.36, this.tone("sand")],
        [9.4, 2.2, 0.34, this.tone("sandLt")],
      ] as const;
      beds.forEach(([width, depth, height, color], index) => {
        const inset = -index * 1.6;
        this.slab(
          group,
          `quarry-bench-${index + 1}`,
          width,
          height,
          depth,
          color,
          x + ix * inset,
          D.TOP - 0.1 + index * 0.34,
          z + iz * inset,
          -5.45,
        );
      });
      this.disc(
        group,
        "quarry-floor",
        5.4,
        0.1,
        0xa39b89,
        x + ix * 3.4,
        D.TOP + 0.04,
        z + iz * 3.4,
        9,
        0.62,
        5.45,
      );
      for (let index = 0; index < 22; index += 1) {
        const across = (random() - 0.5) * 13;
        const out = 1.6 + random() * 3.6;
        const sx = x + tx * across + ix * out;
        const sz = z + tz * across + iz * out;
        this.box(
          group,
          `quarry-block-${index + 1}`,
          0.55 + random() * 0.6,
          0.3 + random() * 0.3,
          0.5 + random() * 0.45,
          random() < 0.5 ? this.tone("sand") : this.tone("sandDk"),
          sx,
          this.terrY(sx, sz) + 0.2,
          sz,
          random() * TAU,
        );
      }
    });
    this.authoredGroup("silted-channel", (group) => {
      const [x0, z0] = this.pt(0.55, D.RP * 0.34);
      const [x1, z1] = this.pt(0.39, D.RS - 0.5);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const length = Math.hypot(x1 - x0, z1 - z0);
      const rotation = -Math.atan2(z1 - z0, x1 - x0);
      this.box(
        group,
        "channel-silt",
        length,
        0.3,
        2,
        this.tone("silt"),
        cx,
        D.TOP + 0.07,
        cz,
        rotation,
      );
      this.box(
        group,
        "channel-water",
        length,
        0.16,
        1.15,
        this.tone("water"),
        cx,
        D.TOP + 0.22,
        cz,
        rotation,
      );
      for (const side of [-1, 1]) {
        this.box(
          group,
          `channel-bank-${side}`,
          length * 0.92,
          0.44,
          0.7,
          this.tone("ashDk"),
          cx + Math.cos(0.55 + Math.PI / 2) * 1.35 * side,
          D.TOP + 0.2,
          cz + Math.sin(0.55 + Math.PI / 2) * 1.35 * side,
          rotation,
        );
      }
      this.reeds(group, "channel-reeds-a", cx + 1.5, D.TOP + 0.05, cz + 1.8, 2, 18);
      this.reeds(group, "channel-reeds-b", cx - 2, D.TOP + 0.05, cz - 1.6, 1.8, 14);
    });
    this.authoredGroup("sooty-flats", (group) => {
      [
        [2.45, 0.62, 4.6],
        [1.85, 0.48, 3.2],
        [3.1, 0.55, 3.6],
        [0.95, 0.7, 2.8],
      ].forEach(([angle, factor, radius], index) => {
        const [x, z] = this.pt(angle ?? 0, D.RP * (factor ?? 0));
        this.disc(
          group,
          `ash-flat-${index + 1}`,
          radius ?? 1,
          0.1,
          this.tone("ashDk"),
          x,
          D.TOP + 0.06,
          z,
          9,
          0.66,
          angle,
        );
      });
    });
  }

  private atomicFeatures(): void {
    const random = this.rng(80801);
    this.authoredGroup("graded-terrace", (group) => {
      for (const [radius, span, center] of [
        [D.RP * 0.74, 1, 5.02],
        [D.RP * 0.88, 0.86, 5.02],
      ] as const) {
        const count = Math.round((span * radius) / 1.6);
        for (let index = 0; index < count; index += 1) {
          const angle = center - span / 2 + (span * (index + 0.5)) / count;
          const [x, z] = this.pt(angle, radius);
          this.box(
            group,
            `terrace-lip-${this.sequence++}`,
            (span * radius) / count + 0.1,
            0.46,
            0.7,
            index % 3 ? this.tone("conc") : this.tone("concLt"),
            x,
            D.TOP + 0.23,
            z,
            -(angle + Math.PI / 2),
          );
        }
      }
      [
        [5.02, 0.81, 5],
        [5.02, 0.64, 4.2],
      ].forEach(([angle, factor, radius], index) => {
        const [x, z] = this.pt(angle ?? 0, D.RP * (factor ?? 0));
        this.disc(
          group,
          `cut-lawn-${index + 1}`,
          radius ?? 1,
          0.14,
          this.tone("lawn"),
          x,
          D.TOP + 0.04,
          z,
          10,
          0.44,
          -(angle ?? 0),
        );
      });
    });
    this.authoredGroup("hardstanding", (group) => {
      [
        [1.35, 0.52, 6.6, 0.72],
        [0.35, 0.4, 4.6, 0.7],
      ].forEach(([angle, factor, radius, squeeze], index) => {
        const [x, z] = this.pt(angle ?? 0, D.RP * (factor ?? 0));
        this.disc(
          group,
          `hardstanding-${index + 1}`,
          radius ?? 1,
          0.12,
          this.tone("hard"),
          x,
          D.TOP + 0.03,
          z,
          11,
          squeeze ?? 1,
          angle,
        );
      });
    });
    this.authoredGroup("engineered-basin", (group) => {
      const [x, z] = this.pt(1.92, D.RP * 0.99);
      this.disc(
        group,
        "basin-concrete-lip",
        5.4,
        0.16,
        this.tone("concLt"),
        x,
        D.RIM + 0.02,
        z,
        12,
        0.62,
        1.92,
      );
      this.disc(
        group,
        "basin-dark-water",
        4.4,
        0.1,
        this.tone("waterDk"),
        x,
        D.RIM + 0.1,
        z,
        12,
        0.6,
        1.92,
      );
      this.disc(
        group,
        "basin-water",
        3.4,
        0.08,
        this.tone("water"),
        x,
        D.RIM + 0.14,
        z,
        12,
        0.58,
        1.92,
      );
      for (let index = -2; index <= 2; index += 1) {
        const [sx, sz] = this.pt(1.92 + index * 0.075, D.RP - 0.9);
        this.box(
          group,
          `basin-step-${index + 3}`,
          1.5,
          0.34,
          0.7,
          this.tone("conc"),
          sx,
          D.TOP + 0.17,
          sz,
          -(1.92 + Math.PI / 2),
        );
      }
      for (const [angle, factor] of [
        [1.55, 0.99],
        [2.3, 0.99],
      ] as const) {
        const [sx, sz] = this.pt(angle, D.RP * factor);
        this.pole(
          group,
          `orange-marker-${angle}`,
          0.1,
          0.66,
          sx,
          this.terrY(sx, sz),
          sz,
          this.tone("concLt"),
        );
        this.box(
          group,
          `orange-head-${angle}`,
          0.26,
          0.2,
          0.26,
          this.tone("orange"),
          sx,
          this.terrY(sx, sz) + 0.66,
          sz,
          0,
          true,
        );
      }
      const [lx, lz] = this.pt(3.3, D.RP * 0.8);
      this.slab(
        group,
        "pale-ledges-a",
        6.4,
        0.34,
        3.6,
        random() < 0.5 ? (this.palette.stone[0] ?? 0) : (this.palette.stone[1] ?? 0),
        lx,
        D.TOP,
        lz,
        1.5,
      );
      this.slab(
        group,
        "pale-ledges-b",
        4,
        0.34,
        2.4,
        random() < 0.5 ? (this.palette.stone[0] ?? 0) : (this.palette.stone[1] ?? 0),
        lx,
        D.TOP,
        lz,
        1.1,
      );
    });
  }

  private informationFeatures(): void {
    const random = this.rng(90901);
    this.authoredGroup("graded-stone-beds", (group) => {
      const [x, z] = this.pt(0.42, D.RP * 0.76);
      const beds = [
        [13, 7, 0.34, this.tone("padDk")],
        [10.4, 5.4, 0.32, this.tone("pad")],
        [7.4, 3.8, 0.3, this.tone("padLt")],
      ] as const;
      beds.forEach(([width, depth, height, color], index) => {
        this.slab(
          group,
          `levelled-bed-${index + 1}`,
          width,
          height,
          depth,
          color,
          x,
          D.TOP + index * 0.3,
          z,
          0.42 + index * 0.05,
        );
      });
      for (let index = 0; index < 9; index += 1) {
        const angle = random() * TAU;
        const radius = 4.4 + random() * 3;
        const sx = x + Math.cos(angle) * radius;
        const sz = z + Math.sin(angle) * radius * 0.7;
        this.stone(
          group,
          `levelled-bed-stone-${index + 1}`,
          0.2 + random() * 0.34,
          sx,
          this.terrY(sx, sz),
          sz,
          this.pick(this.palette.stone, random),
          random,
        );
      }
      [
        [2.35, 0.52, 6.6, 0.66],
        [5.05, 0.46, 4.8, 0.7],
      ].forEach(([angle, factor, radius, squeeze], index) => {
        const [gx, gz] = this.pt(angle ?? 0, D.RP * (factor ?? 0));
        this.disc(
          group,
          `gravel-flat-${index + 1}`,
          radius ?? 1,
          0.12,
          this.tone("grav"),
          gx,
          D.TOP + 0.03,
          gz,
          12,
          squeeze ?? 1,
          angle,
        );
      });
    });
    this.authoredGroup("retention-basin", (group) => {
      const [x, z] = this.pt(4.62, D.RP * 0.97);
      this.pad(
        group,
        "retention-stone-lip",
        12,
        7.4,
        this.palette.stone[2] ?? 0,
        x,
        z,
        -4.62,
        D.RIM + 0.02,
        0.2,
      );
      this.pad(
        group,
        "retention-water",
        10.2,
        5.8,
        this.tone("water"),
        x,
        z,
        -4.62,
        D.RIM + 0.1,
        0.1,
      );
      this.pad(
        group,
        "retention-water-light",
        7,
        3.4,
        this.tone("waterLt"),
        x,
        z,
        -4.62,
        D.RIM + 0.14,
        0.08,
      );
    });
    this.authoredGroup("straight-drain", (group) => {
      const [x0, z0] = this.pt(4.62, D.RP * 0.34);
      const [x1, z1] = this.pt(4.62, D.RP * 0.9);
      this.strip(
        group,
        "stone-drain",
        x0,
        z0,
        x1,
        z1,
        2.4,
        this.palette.stone[2] ?? 0,
        D.TOP - 0.02,
        0.14,
      );
      this.strip(
        group,
        "drain-water",
        x0,
        z0,
        x1,
        z1,
        1.2,
        this.tone("water"),
        D.TOP + 0.06,
        0.06,
      );
    });
    this.authoredGroup("riprap-bank", (group) => {
      for (let index = 0; index < 34; index += 1) {
        const angle = 1.9 + random() * 2;
        const radius = D.RP + 0.3 + random() * 2.2;
        const [x, z] = this.pt(angle, radius);
        const block = this.box(
          group,
          `riprap-${index + 1}`,
          0.5 + random() * 0.45,
          0.4 + random() * 0.35,
          0.5 + random() * 0.45,
          this.pick(this.palette.stone, random),
          x,
          D.RIM + 0.2,
          z,
          random() * TAU,
        );
        block.rotation.z = (random() - 0.5) * 0.35;
      }
    });
  }

  private cyberpunkFeatures(): void {
    const random = this.rng(101001);
    this.authoredGroup("standing-water", (group) => {
      for (let index = 0; index < 10; index += 1) {
        const angle = random() * TAU;
        const radius = D.RP * (0.22 + random() * 0.72);
        const [x, z] = this.pt(angle, radius);
        this.disc(
          group,
          `standing-water-${index + 1}`,
          2.2 + random() * 3.4,
          0.1,
          this.tone("wet"),
          x,
          D.TOP + 0.02,
          z,
          9,
          0.55 + random() * 0.45,
          random() * TAU,
        );
        if (random() < 0.75) {
          const color = this.pick(
            [this.tone("cyan"), this.tone("mag"), this.tone("viol"), this.tone("amber")],
            random,
          );
          const reflection = this.box(
            group,
            `neon-reflection-${index + 1}`,
            0.4,
            0.04,
            2.4 + random() * 2.6,
            color,
            x,
            D.TOP + 0.14,
            z,
            random() * TAU,
            true,
          );
          (reflection.material as THREE.MeshBasicMaterial).transparent = true;
          (reflection.material as THREE.MeshBasicMaterial).opacity = 0.5;
        }
      }
    });
    this.authoredGroup("reclaimed-slabs", (group) => {
      for (let index = 0; index < 13; index += 1) {
        const angle = random() * TAU;
        const radius = D.RP * (0.28 + random() * 0.66);
        const [x, z] = this.pt(angle, radius);
        const slab = this.slab(
          group,
          `reclaimed-slab-${index + 1}`,
          2 + random() * 3,
          0.22 + random() * 0.2,
          1.6 + random() * 2.2,
          random() < 0.5 ? this.tone("conc") : this.tone("concDk"),
          x,
          D.TOP,
          z,
          random() * TAU,
        );
        slab.rotation.z = (random() - 0.5) * 0.05;
      }
    });
    this.authoredGroup("steam-fissure", (group) => {
      const [x, z] = this.pt(2.68, D.RP * 0.6);
      this.disc(
        group,
        "fissure-fill",
        5.6,
        0.12,
        this.tone("concDk"),
        x,
        D.TOP + 0.02,
        z,
        9,
        0.34,
        2.68,
      );
      this.disc(
        group,
        "fissure-crack",
        3.6,
        0.1,
        0x1b2028,
        x,
        D.TOP + 0.08,
        z,
        9,
        0.26,
        2.68,
      );
      [
        [-2.4, 0.8],
        [2.2, 0.95],
      ].forEach(([distance, scale], index) => {
        const sx = x + Math.cos(2.68 + Math.PI / 2) * (distance ?? 0);
        const sz = z + Math.sin(2.68 + Math.PI / 2) * (distance ?? 0);
        this.steam(group, `steam-${index + 1}`, sx, D.TOP + 0.2, sz, scale ?? 1);
      });
      const glow = this.box(
        group,
        "fissure-amber-glow",
        6.2,
        0.04,
        0.7,
        this.tone("amber"),
        x,
        D.TOP + 0.14,
        z,
        -2.68,
        true,
      );
      (glow.material as THREE.MeshBasicMaterial).transparent = true;
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.4;
    });
    this.authoredGroup("block-revetment", (group) => {
      for (const [start, end] of [
        [0.3, 2.05],
        [3.45, 5.3],
      ] as const) {
        const count = Math.round(((end - start) * D.RP) / 2.6);
        for (let index = 0; index < count; index += 1) {
          const angle = start + (end - start) * ((index + 0.5) / count);
          const [x, z] = this.pt(angle, D.RP - 0.4 + (random() - 0.5) * 0.5);
          const block = this.box(
            group,
            `revetment-block-${this.sequence++}`,
            1.5 + random() * 0.4,
            0.8 + random() * 0.3,
            1.1,
            random() < 0.5 ? this.tone("conc") : (this.palette.stone[2] ?? 0),
            x,
            D.TOP + 0.36,
            z,
            -(angle + Math.PI / 2) + (random() - 0.5) * 0.2,
          );
          block.rotation.z = (random() - 0.5) * 0.14;
          if (index % 4 === 0) {
            this.box(
              group,
              `revetment-marker-${this.sequence++}`,
              0.34,
              0.14,
              0.34,
              index % 12 ? this.tone("amber") : this.tone("cyan"),
              x,
              D.TOP + 0.82,
              z,
              0,
              true,
            );
          }
        }
      }
      for (let index = 0; index < 9; index += 1) {
        const angle = random() * TAU;
        const radius = D.RP * (0.35 + random() * 0.58);
        const [x, z] = this.pt(angle, radius);
        const debris = this.box(
          group,
          `rusted-debris-${index + 1}`,
          0.7 + random() * 0.7,
          0.4 + random() * 0.3,
          0.6 + random() * 0.5,
          random() < 0.35 ? this.tone("rust") : this.tone("metalDk"),
          x,
          D.TOP + 0.22,
          z,
          random() * TAU,
        );
        debris.rotation.z = (random() - 0.5) * 0.3;
      }
    });
  }

  private steam(
    group: THREE.Object3D,
    name: string,
    x: number,
    y: number,
    z: number,
    scale: number,
  ): void {
    const material = this.emat(0xc6dde4, 0.19);
    const puffs = [
      [0, 0.5, 0, 0.85],
      [0.35, 1.5, 0.2, 1.2],
      [-0.3, 2.7, -0.25, 1.5],
      [0.25, 4, 0.3, 1.05],
    ] as const;
    puffs.forEach(([dx, dy, dz, radius], index) => {
      const puff = this.mesh(
        group,
        new THREE.IcosahedronGeometry(radius * scale, 1),
        material,
        `${name}-puff-${index + 1}`,
      );
      puff.position.set(x + dx * scale, y + dy * scale, z + dz * scale);
      puff.scale.set(1, 0.82, 1);
    });
  }

  private flora(): void {
    const group = new THREE.Group();
    group.name =
      this.design.sourceEra === 1 || this.design.sourceEra === 2
        ? "wind-cropped-trees"
        : this.design.sourceEra === 8
          ? "topiary-groves"
          : this.design.sourceEra === 4
            ? "cypress-stands"
            : this.design.sourceEra === 5
              ? "willow-marsh"
              : "evan-authored-flora";
    group.userData.evanSignature = this.design.signatures.includes(group.name);
    const era = this.design.sourceEra;
    const floraSeed = {
      1: 10102,
      2: 31337,
      3: 30302,
      4: 40402,
      5: 50502,
      6: 60602,
      7: 70702,
      8: 80802,
      9: 90902,
      10: 101002,
    }[era] as number;
    const random = this.rng(floraSeed);
    if (era === 1) {
      const trees = [
        [0.55, 0.91, 0.78],
        [1.82, 0.86, 0.92],
        [2.95, 0.92, 0.74],
        [4.08, 0.88, 0.86],
        [5.38, 0.9, 0.8],
      ] as const;
      trees.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `wind-cropped-tree-${index + 1}`, x, z, (plant) =>
          this.neolithicTree(plant, "tree", 0, 0, scale),
        );
      });
      // Era 1 keeps only the trees and grazing patches on the ground (2026-08-21: "retain the
      // trees and a few of the green patches; delete all the brown stuff... there should be
      // like 8 things total") -- the scrub-bush scatter this loop used to add is gone.
    } else if (era === 2) {
      const trees = [
        [2.62, 0.9, 1.05],
        [3.05, 0.93, 0.9],
        [3.52, 0.9, 1.15],
        [4.3, 0.92, 0.95],
        [2.2, 0.94, 0.85],
        [1.05, 0.94, 0.9],
        [4.55, 0.86, 0.8],
        [5.6, 0.91, 1],
        [0.42, 0.93, 0.88],
        [1.78, 0.88, 1.1],
        [3.85, 0.94, 0.82],
      ] as const;
      trees.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `wind-cropped-tree-${index + 1}`, x, z, (plant) =>
          this.neolithicTree(plant, "tree", 0, 0, scale),
        );
      });
      for (let index = 0; index < 26; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.72 + random() * 0.22));
        this.plantGroup(group, `scrub-${index + 1}`, x, z, (plant) =>
          this.scrub(plant, "scrub", 0, 0, 0.5 + random() * 0.35),
        );
      }
    } else if (era === 3) {
      const olives = [
        [2.62, 0.8, 1],
        [3.05, 0.86, 0.85],
        [1.05, 0.88, 0.95],
        [0.42, 0.83, 0.9],
        [1.78, 0.76, 1.05],
        [4.62, 0.84, 0.88],
        [5.85, 0.86, 0.95],
        [0.95, 0.62, 0.8],
        [4.1, 0.7, 0.92],
        [3.42, 0.62, 0.9],
        [0.2, 0.58, 0.85],
        [1.42, 0.5, 0.95],
        [2.3, 0.55, 0.8],
        [5.3, 0.62, 0.9],
        [4.85, 0.46, 0.85],
        [6.05, 0.5, 0.95],
        [2.95, 0.44, 0.8],
      ] as const;
      olives.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `olive-${index + 1}`, x, z, (plant) =>
          this.olive(plant, "olive", 0, 0, scale),
        );
      });
      for (let index = 0; index < 78; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.32 + random() * 0.62));
        this.plantGroup(group, `thorn-${index + 1}`, x, z, (plant) =>
          this.scrub(plant, "thorn", 0, 0, 0.34 + random() * 0.34, this.tones("thorn")),
        );
      }
    } else if (era === 4) {
      for (const [angle, factor] of [
        [0.3, 0.62],
        [2.3, 0.68],
        [4.25, 0.64],
      ] as const) {
        for (let index = 0; index < 5; index += 1) {
          const [x, z] = this.pt(
            angle + (random() - 0.5) * 0.34,
            D.RP * factor + (random() - 0.5) * 4.2,
          );
          this.plantGroup(group, `cypress-${angle}-${index}`, x, z, (plant) =>
            this.spire(plant, "cypress", 0, 0, 0.72 + random() * 0.3, this.tones("cyp")),
          );
        }
      }
      const olives = [
        [1.35, 0.84, 1],
        [1.72, 0.8, 0.85],
        [3.2, 0.86, 0.95],
        [3.62, 0.82, 0.9],
        [5.05, 0.86, 1],
        [4.75, 0.78, 0.82],
        [2.75, 0.9, 0.9],
        [0.85, 0.88, 0.95],
      ] as const;
      olives.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `olive-${index}`, x, z, (plant) =>
          this.olive(plant, "olive", 0, 0, scale),
        );
      });
      for (let index = 0; index < 30; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.6 + random() * 0.35));
        this.plantGroup(group, `scrub-${index}`, x, z, (plant) =>
          this.scrub(plant, "scrub", 0, 0, 0.4 + random() * 0.3),
        );
      }
    } else if (era === 5) {
      for (let index = 0; index < 16; index += 1) {
        const [x, z] = this.pt(
          2.95 + (random() - 0.5) * 1.5,
          D.RP * (0.72 + random() * 0.24),
        );
        this.plantGroup(group, `oak-wood-${index}`, x, z, (plant) =>
          this.broadleaf(plant, "oak", 0, 0, 0.85 + random() * 0.45),
        );
      }
      const trees = [
        [0.45, 0.86, 1.1],
        [1.85, 0.8, 0.95],
        [4.7, 0.88, 1.05],
        [5.75, 0.84, 0.9],
        [4.25, 0.62, 1],
      ] as const;
      trees.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `oak-${index}`, x, z, (plant) =>
          this.broadleaf(plant, "oak", 0, 0, scale),
        );
      });
      for (let index = 0; index < 22; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.5 + random() * 0.42));
        this.plantGroup(group, `coppice-${index}`, x, z, (plant) =>
          this.coppice(plant, "coppice", 0, 0, 0.5 + random() * 0.25),
        );
      }
    } else if (era === 6) {
      for (const [angle, factors] of [
        [1.3, [0.56, 0.72, 0.88]],
        [2.62, [0.6, 0.84]],
        [5.6, [0.58, 0.8]],
        [3.55, [0.62, 0.86]],
      ] as const) {
        for (const factor of factors) {
          const [x, z] = this.pt(angle + (random() - 0.5) * 0.06, D.RP * factor);
          this.plantGroup(group, `hedgerow-elm-${angle}-${factor}`, x, z, (plant) =>
            this.broadleaf(plant, "elm", 0, 0, 0.95 + random() * 0.3),
          );
        }
      }
      for (let index = 0; index < 14; index += 1) {
        const [x, z] = this.pt(3.15 + (random() - 0.5), D.RP * (0.74 + random() * 0.2));
        this.plantGroup(group, `coppice-${index}`, x, z, (plant) =>
          this.coppice(plant, "coppice", 0, 0, 0.55 + random() * 0.3),
        );
      }
      for (let index = 0; index < 22; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.6 + random() * 0.34));
        this.plantGroup(group, `scrub-${index}`, x, z, (plant) =>
          this.scrub(plant, "scrub", 0, 0, 0.34 + random() * 0.24),
        );
      }
    } else if (era === 7) {
      const live = [
        [4.1, 0.78, 0.95],
        [4.55, 0.68, 0.85],
        [3.8, 0.86, 0.9],
        [5.95, 0.8, 1],
        [0.2, 0.84, 0.9],
        [4.9, 0.9, 0.85],
      ] as const;
      live.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `survivor-${index}`, x, z, (plant) =>
          this.broadleaf(plant, "survivor", 0, 0, scale),
        );
      });
      const dead = [
        [2.1, 0.72, 0.85],
        [2.8, 0.78, 0.95],
        [1.6, 0.66, 0.8],
        [3.05, 0.62, 0.75],
        [1.3, 0.82, 0.9],
      ] as const;
      dead.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `dead-tree-${index}`, x, z, (plant) =>
          this.deadTree(plant, "dead", 0, 0, scale, this.tone("burnt")),
        );
      });
      for (let index = 0; index < 24; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.5 + random() * 0.44));
        this.plantGroup(group, `scrub-${index}`, x, z, (plant) =>
          this.scrub(plant, "scrub", 0, 0, 0.3 + random() * 0.28),
        );
      }
    } else if (era === 8) {
      for (const [angle, factor, count, spread] of [
        [0.55, 0.72, 5, 3.4],
        [2.85, 0.62, 4, 3],
        [4.35, 0.78, 4, 3.2],
      ] as const) {
        const [cx, cz] = this.pt(angle, D.RP * factor);
        for (let index = 0; index < count; index += 1) {
          const turn = random() * TAU;
          const radius = random() * spread;
          this.plantGroup(
            group,
            `topiary-${angle}-${index}`,
            cx + Math.cos(turn) * radius,
            cz + Math.sin(turn) * radius * 0.9,
            (plant) => this.topiary(plant, "topiary", 0, 0, 0.78 + random() * 0.28),
          );
        }
      }
      for (const [angle, factor] of [
        [1.35, 0.86],
        [3.55, 0.88],
        [5.6, 0.66],
        [1.95, 0.44],
      ] as const) {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `topiary-single-${angle}`, x, z, (plant) =>
          this.topiary(plant, "topiary", 0, 0, 0.86),
        );
      }
      for (let index = 0; index < 12; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.4 + random() * 0.52));
        this.plantGroup(group, `scrub-${index}`, x, z, (plant) =>
          this.scrub(plant, "scrub", 0, 0, 0.34 + random() * 0.24),
        );
      }
    } else if (era === 9) {
      for (const [angle, factor, count] of [
        [1.78, 0.66, 5],
        [4.9, 0.72, 4],
      ] as const) {
        const [cx, cz] = this.pt(angle, D.RP * factor);
        for (let index = 0; index < count; index += 1) {
          const turn = random() * TAU;
          const radius = random() * 3;
          this.plantGroup(
            group,
            `spire-${angle}-${index}`,
            cx + Math.cos(turn) * radius,
            cz + Math.sin(turn) * radius * 0.85,
            (plant) => this.spire(plant, "spire", 0, 0, 0.48 + random() * 0.14),
          );
        }
      }
      for (const [angle, factor, count] of [
        [3.3, 0.6, 4],
        [0.3, 0.86, 3],
        [5.9, 0.48, 3],
      ] as const) {
        const [cx, cz] = this.pt(angle, D.RP * factor);
        for (let index = 0; index < count; index += 1) {
          const turn = random() * TAU;
          const radius = random() * 2.8;
          this.plantGroup(
            group,
            `topiary-${angle}-${index}`,
            cx + Math.cos(turn) * radius,
            cz + Math.sin(turn) * radius * 0.9,
            (plant) => this.topiary(plant, "topiary", 0, 0, 0.7 + random() * 0.2),
          );
        }
      }
      for (let index = 0; index < 14; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.42 + random() * 0.5));
        this.plantGroup(group, `scrub-${index}`, x, z, (plant) =>
          this.scrub(plant, "scrub", 0, 0, 0.3 + random() * 0.22),
        );
      }
    } else {
      for (let index = 0; index < 16; index += 1) {
        const [x, z] = this.pt(random() * TAU, D.RP * (0.3 + random() * 0.64));
        this.plantGroup(group, `reclaim-scrub-${index}`, x, z, (plant) =>
          this.scrub(plant, "scrub", 0, 0, 0.32 + random() * 0.3),
        );
      }
      const dead = [
        [1.2, 0.72, 0.9],
        [3.9, 0.66, 0.85],
        [5.35, 0.8, 0.95],
        [0.55, 0.58, 0.8],
      ] as const;
      dead.forEach(([angle, factor, scale], index) => {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `metal-dead-tree-${index}`, x, z, (plant) =>
          this.deadTree(plant, "dead", 0, 0, scale, this.tone("metalDk")),
        );
      });
      for (const [angle, factor] of [
        [2.2, 0.86],
        [4.6, 0.84],
        [0.15, 0.9],
      ] as const) {
        const [x, z] = this.pt(angle, D.RP * factor);
        this.plantGroup(group, `reclaim-coppice-${angle}`, x, z, (plant) =>
          this.coppice(plant, "coppice", 0, 0, 0.5),
        );
      }
    }
    this.root.add(group);
  }

  private ground(): void {
    const era = this.design.sourceEra;
    // Era 1 has no ground-scatter props at all (2026-08-21: "take out any of the art thats
    // not the trees"). The tuft/small-stone scatter this count used to size is decorative
    // clutter, not terrain -- the trees and the ground itself are unaffected.
    const count =
      era === 1 ? 0 : era <= 7 ? 430 : era === 8 ? 210 : era === 9 ? 200 : 190;
    const ratio =
      era === 1 ? 0.7 : era === 7 ? 0.72 : era === 9 ? 0.78 : era === 10 ? 0.55 : 0.84;
    const random = this.rng(
      era === 2
        ? 31337
        : era === 8
          ? 80803
          : era === 9
            ? 90903
            : era === 10
              ? 101003
              : 31337,
    );
    if (era === 2) {
      // Era II's source carries one LCG from its 26 scrub placements into ground scatter.
      for (let draw = 0; draw < 26 * 3; draw += 1) random();
    }
    const group = new THREE.Group();
    group.name = "evan-ground-scatter";
    for (let index = 0; index < count; index += 1) {
      const [x, z] = this.pt(
        random() * TAU,
        D.RP * Math.sqrt(0.03 + random() * 0.93) * 0.96,
      );
      const item = new THREE.Group();
      item.name = `ground-scatter-${index + 1}`;
      item.position.set(x, this.terrY(x, z), z);
      if (random() < ratio) {
        this.tuft(item, "tuft", 0, 0, 1 + random() * 0.7);
      } else {
        this.stone(
          item,
          "small-stone",
          0.14 + random() * 0.24,
          0,
          0,
          0,
          undefined,
          era === 2 ? this.random : random,
        );
      }
      group.add(item);
    }
    this.root.add(group);
  }

  private shore(): void {
    const random = this.rng(551213);
    const group = new THREE.Group();
    group.name = "gravel-rim";
    group.userData.evanSignature = this.design.signatures.includes(group.name);
    /*
     * Era 1 already authors its complete `gravel-shelf` and `shore-boulder-clusters` above.
     * Layering this shared 150-piece rim and 27 more boulders over those signatures produced
     * the repeated rubble necklace and the lower-right pile in the public frame. Later eras
     * still rely on this shared family; only the duplicated Prehistoric population is omitted.
     */
    const rimGravelCount = this.design.sourceEra === 1 ? 0 : 150;
    for (let index = 0; index < rimGravelCount; index += 1) {
      const [x, z] = this.pt(random() * TAU, D.RP - 0.5 + random() * (D.RS - D.RP + 0.9));
      const radius = Math.hypot(x, z);
      this.stone(
        group,
        `rim-gravel-${index + 1}`,
        0.1 + random() * 0.17,
        x,
        (radius > D.RS - 0.2 ? D.BEV + 0.2 : D.RIM) - 0.04,
        z,
        undefined,
        this.design.sourceEra === 2 ? this.random : random,
      );
    }
    const boulders =
      this.design.sourceEra === 4
        ? ([
            [0.75, 5],
            [2.4, 6],
            [3.2, 5],
            [4.8, 5],
            [5.6, 4],
          ] as const)
        : this.design.sourceEra === 6
          ? ([
              [0.75, 3],
              [3.2, 4],
              [4.8, 3],
            ] as const)
          : this.design.sourceEra === 7
            ? ([
                [0.75, 4],
                [2.4, 5],
                [4.8, 4],
              ] as const)
            : this.design.sourceEra === 8
              ? ([
                  [0.75, 3],
                  [2.4, 4],
                  [4.8, 3],
                ] as const)
              : this.design.sourceEra === 9
                ? ([
                    [0.75, 5],
                    [2.4, 6],
                    [3.2, 5],
                    [4, 6],
                    [4.8, 5],
                    [5.6, 6],
                  ] as const)
                : this.design.sourceEra === 10
                  ? ([
                      [0.75, 4],
                      [2.4, 5],
                      [4, 4],
                      [5.6, 5],
                    ] as const)
                  : ([
                      [0.75, 4],
                      [2.4, 5],
                      [3.2, 4],
                      [4, 5],
                      [4.8, 4],
                      [5.6, 5],
                    ] as const);
    for (const [angle, count] of this.design.sourceEra === 1 ? [] : boulders) {
      for (let index = 0; index < count; index += 1) {
        const prehistoric = this.design.sourceEra === 1;
        const [x, z] = this.pt(
          angle + (random() - 0.5) * 0.26,
          D.RP + (prehistoric ? 0.2 + random() : 0.3 + random() * 2),
        );
        this.stone(
          group,
          `shore-boulder-${angle}-${index}`,
          prehistoric ? 0.45 + random() * 0.4 : 0.5 + random() * 0.7,
          x,
          D.RIM + 0.1,
          z,
          undefined,
          this.design.sourceEra === 2 ? this.random : random,
        );
      }
    }
    const reedBanks: readonly (readonly [number, number])[] =
      // 2026-08-21: era 1 keeps only its trees and grazing patches ("there should be like 8
      // things total") -- the tan reed-bank stalks this used to draw are gone.
      this.design.sourceEra === 1
        ? []
        : this.design.sourceEra === 3
          ? [
              [1.15, 12],
              [3.6, 10],
            ]
          : this.design.sourceEra === 4
            ? [
                [1.15, 14],
                [5.1, 12],
              ]
            : this.design.sourceEra === 5
              ? [
                  [1.15, 26],
                  [2.75, 22],
                  [3.6, 24],
                  [5.1, 20],
                  [6, 18],
                ]
              : this.design.sourceEra === 6
                ? [
                    [1.15, 20],
                    [2.75, 16],
                    [5.1, 18],
                  ]
                : this.design.sourceEra === 7
                  ? [
                      [1.15, 18],
                      [3.6, 16],
                      [5.1, 14],
                    ]
                  : this.design.sourceEra === 8
                    ? [
                        [1.15, 10],
                        [3.6, 8],
                      ]
                    : this.design.sourceEra === 9
                      ? [[1.15, 8]]
                      : this.design.sourceEra === 10
                        ? [
                            [1.15, 8],
                            [3.6, 6],
                          ]
                        : [
                            [1.15, 22],
                            [2.75, 18],
                            [3.6, 20],
                            [5.1, 16],
                            [6, 14],
                          ];
    const reeds = new THREE.Group();
    reeds.name = "reed-banks";
    reeds.userData.evanSignature = this.design.signatures.includes(reeds.name);
    for (const [angle, count] of reedBanks) {
      const prehistoric = this.design.sourceEra === 1;
      const [x, z] = this.pt(angle, D.RS + (prehistoric ? 0.15 : 0.7));
      this.reeds(
        reeds,
        `reed-bank-${angle}`,
        x,
        D.WY - 0.15,
        z,
        prehistoric ? 1.2 : 2.1,
        count,
      );
    }
    group.add(reeds);
    this.root.add(group);
  }
}

/** Typed Three.js port of Evan's standalone classes; no globals, DOM canvas, or bundle runtime. */
export function buildEvanIslandGroup(
  design: EraIslandDesign,
  options: EvanIslandBuildOptions,
): THREE.Group {
  const scale = options.grassRadius / SOURCE_PLATEAU_RADIUS;
  const builder = new EvanIslandBuilder(
    design,
    (options.protectedRadius ?? 0) / scale,
    options.includeSea ?? true,
  );
  const source = builder.build();
  source.scale.setScalar(scale);
  source.userData.evanSourceScale = scale;
  source.userData.grassRadius = options.grassRadius;
  source.userData.seaRadius = options.seaRadius;
  source.userData.protectedRadius = options.protectedRadius ?? 0;

  const lagoon = source.getObjectByName("island-lagoon") as THREE.Mesh | undefined;
  if (lagoon !== undefined) {
    const sourceSeaRadius = 46 * scale;
    const correction = options.seaRadius / sourceSeaRadius;
    lagoon.scale.x *= correction;
    lagoon.scale.z *= correction;
  }
  return source;
}

/** Runtime census used by renderer guards and review reports. */
export function evanIslandGeometryStats(root: THREE.Object3D): {
  readonly meshes: number;
  readonly triangles: number;
  readonly signatures: readonly string[];
} {
  let meshes = 0;
  let triangles = 0;
  const signatures: string[] = [];
  root.traverse((object) => {
    if (object.userData.evanSignature === true) {
      signatures.push(object.name);
    }
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    meshes += 1;
    const index = mesh.geometry.getIndex();
    triangles += index ? index.count / 3 : mesh.geometry.getAttribute("position").count / 3;
  });
  return { meshes, triangles, signatures: signatures.sort() };
}

/** Convenience overload for surfaces that already carry the live layout. */
export function buildEvanCityIsland(
  design: EraIslandDesign,
  layout: CityLayout,
  grassRadius: number,
  protectedRadius: number,
): THREE.Group {
  return buildEvanIslandGroup(design, {
    grassRadius,
    seaRadius: layout.seaRadius,
    protectedRadius,
    includeSea: true,
  });
}
