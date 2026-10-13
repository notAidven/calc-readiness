import type { EraId } from "@cr/skill-graph";

import type { IslandTerrainTones } from "./islandGround";

export type DesignedIslandEraId =
  | "prehistoric"
  | "neolithic"
  | "bronze_age"
  | "classical"
  | "medieval"
  | "renaissance"
  | "industrial"
  | "atomic_age"
  | "information_age"
  | "cyberpunk";

export type IslandGroundPattern =
  | "natural-tussock"
  | "terraced-earth"
  | "regular-stone-bond"
  | "broken-paving"
  | "surveyed-geometry"
  | "industrial-setts";

export type IslandShoreline =
  | "shelving-shore"
  | "partial-quay"
  | "ashlar-wall"
  | "defended-riverfront"
  | "curved-embankment"
  | "straight-docks"
  | "evan-source";

export interface EvanSourcePalette {
  readonly keel: number;
  readonly shore: number;
  readonly ground: number;
  readonly sea: number;
  readonly trunk: number;
  readonly leaf: readonly number[];
  readonly grass: readonly number[];
  readonly reed: readonly number[];
  readonly stone: readonly number[];
  readonly [tone: string]: number | readonly number[];
}

export interface IslandBaseScatter {
  readonly wildTrees: number;
  readonly scrub: number;
  readonly blades: number;
  readonly reeds: number;
  readonly shore: number;
}

export interface IslandWaterDesign {
  readonly roughness: number;
  readonly metalness: number;
  readonly harbourTone: number;
  readonly harbourRoughness: number;
  readonly harbourMetalness: number;
  readonly harbourStart: number;
  readonly harbourSweep: number;
}

export interface EraIslandDesign {
  readonly eraId: DesignedIslandEraId;
  readonly sceneName: string;
  readonly referenceName: string;
  readonly groundPattern: IslandGroundPattern;
  readonly patternLine: string;
  readonly patternOpacity: number;
  readonly shoreline: IslandShoreline;
  readonly baseScatter: IslandBaseScatter;
  readonly water: IslandWaterDesign;
  readonly terrain: IslandTerrainTones;
  /** Exact standalone constructor number and pigments checked in under docs/design-refs. */
  readonly sourceEra: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  readonly sourceClassName: string;
  readonly sourcePalette: EvanSourcePalette;
  /** Named authored landforms. Guards derive their expected scene population from this list. */
  readonly signatures: readonly string[];
}

export const INDUSTRIAL_LOCK = {
  halfWidth: 2.3,
  depth: 4.4,
} as const;

const scatter = {
  wildTrees: 0,
  scrub: 0,
  blades: 0,
  reeds: 0,
  shore: 0,
} as const;

const ERA_1_PALETTE = {
  keel: 0x8a6a45,
  shore: 0xc9b98a,
  ground: 0xa8b850,
  sea: 0xa8d4d8,
  trunk: 0x8f6c45,
  leaf: [0x7ea350, 0x93b45f, 0x6b8f45],
  grass: [0xc2cc68, 0xa8b850, 0x7f9a4e],
  reed: [0xaeb85e, 0xc2cc68],
  stone: [0x8b93a0, 0x8b8779, 0x7c8591, 0x9aa1ac, 0x6f7885],
  wetGravel: 0x998a63,
} as const satisfies EvanSourcePalette;

function terrain(palette: EvanSourcePalette): IslandTerrainTones {
  return {
    shallows: palette.sea,
    deepWater: palette.sea,
    ground: palette.ground,
    groundPale: palette.shore,
    earth: palette.ground,
    earthWorn: palette.keel,
    earthDeep: palette.keel,
    coarseSand: palette.shore,
    gravel: palette.stone[0] ?? palette.shore,
    gravelWet: palette.stone[2] ?? palette.keel,
    trunk: palette.trunk,
    scrub: palette.leaf[0] ?? palette.ground,
    reed: palette.reed[0] ?? palette.ground,
    foliage: palette.leaf,
    bladeTones: palette.grass,
    reedTones: palette.reed,
    rockTones: palette.stone,
    gridLine: "rgba(40,35,29,0.68)",
  };
}

function water(sea: number): IslandWaterDesign {
  return {
    roughness: 0.24,
    metalness: 0.06,
    harbourTone: sea,
    harbourRoughness: 0.24,
    harbourMetalness: 0.06,
    harbourStart: 0,
    harbourSweep: Math.PI * 2,
  };
}

const ERA_2_PALETTE = {
  keel: 0x6e5638,
  shore: 0xd9c79c,
  ground: 0xa88b57,
  sea: 0x5e8a88,
  trunk: 0x5e4429,
  leaf: [0x66743e, 0x5a6a38, 0x74804a],
  grass: [0x94914f, 0x86844a, 0xa09a5c],
  reed: [0x8e8a55, 0x9e9a62, 0x7c7a4a],
  stone: [0x8e887c, 0x9f998c, 0x756f64],
} as const satisfies EvanSourcePalette;

const ERA_3_PALETTE = {
  keel: 0x7a6b52,
  shore: 0xd8cdb2,
  ground: 0xc0b190,
  sea: 0x4e7a76,
  trunk: 0x8e8271,
  leaf: [0x7c8967, 0x6e7c5a, 0x8b9673],
  grass: [0xc2ae78, 0xb39f68, 0xceba85],
  reed: [0xa79a62, 0xb6a972, 0x968a52],
  stone: [0xb6b9b3, 0xc7cac4, 0x9da19b],
  thorn: [0x8a8b5e, 0x767a50],
  ore: 0x6e9e8c,
  oreDk: 0x4f7a6c,
  salt: 0xe9e4d2,
  brine: 0x8fa79e,
  dust: 0xcfc4a6,
} as const satisfies EvanSourcePalette;

const ERA_4_PALETTE = {
  keel: 0x9a927c,
  shore: 0xe0d8c0,
  ground: 0xc6ba9a,
  sea: 0x4e7c7a,
  trunk: 0x7a6247,
  leaf: [0x5e7b3c, 0x46602c, 0x6b8845],
  cyp: [0x3e5a32, 0x466428, 0x37502b],
  grass: [0xa8a868, 0x97975b, 0xb8b478],
  reed: [0x8e9a5a, 0x9ea968, 0x7e8a4e],
  stone: [0x9da09a, 0xaeb1ab, 0x84877f],
  rock: 0xb7b4a6,
  rockLt: 0xc8c5b6,
  rockDk: 0x9b9889,
  grav: 0xcfc7b2,
} as const satisfies EvanSourcePalette;

const ERA_5_PALETTE = {
  keel: 0x6b5f4c,
  shore: 0xb0a88f,
  ground: 0x6e7a46,
  sea: 0x4e6a64,
  trunk: 0x6b5641,
  leaf: [0x53703a, 0x3d5629, 0x62804a],
  hedge: [0x415a2c, 0x364c25, 0x4b6633],
  grass: [0x77854a, 0x6a7742, 0x869457],
  reed: [0x8a8a50, 0x9a9a5e, 0x7a7a46],
  stone: [0x8f8c7e, 0xa5a192, 0x6f6d62],
  chalk: 0xd8d2be,
  chalkLt: 0xe6e1d0,
  chalkDk: 0xbcb6a2,
  mud: 0x6e5f46,
  water: 0x455f58,
  bracken: [0x8a6e3c, 0x9c7f46],
} as const satisfies EvanSourcePalette;

const ERA_6_PALETTE = {
  keel: 0x6e6151,
  shore: 0xa89a80,
  ground: 0x76824c,
  sea: 0x5c7f80,
  trunk: 0x5a4630,
  leaf: [0x5e6e3c, 0x4c5b30, 0x6c7c48],
  hedge: [0x44532c, 0x3a4826, 0x4e5e33],
  grass: [0x7f8a50, 0x717c46, 0x8d975c],
  reed: [0x8e9058, 0x9ea066, 0x7e8048],
  stone: [0xb4a98f, 0xc5baa0, 0xa0957c],
  sand: 0xc0a784,
  sandLt: 0xd1b995,
  sandDk: 0xa48d6c,
  furrow: 0x8a8e52,
  mud: 0x8a7c62,
  mudDk: 0x736648,
  water: 0x53736f,
} as const satisfies EvanSourcePalette;

const ERA_7_PALETTE = {
  keel: 0x5a5148,
  shore: 0x8e8578,
  ground: 0x66654b,
  sea: 0x53625e,
  trunk: 0x4a4034,
  leaf: [0x55603a, 0x47512f, 0x616b44],
  grass: [0x6e7052, 0x636349, 0x7a7a5c],
  reed: [0x7e7e4e, 0x8c8c5a, 0x6e6e42],
  stone: [0x9a9689, 0xafab9e, 0x7a786e],
  coal: 0x1b1b1e,
  coalLt: 0x2c2c31,
  shale: 0x3e3e42,
  ash: 0x8c8478,
  ashDk: 0x736c61,
  sand: 0xa8a08e,
  sandLt: 0xbab2a0,
  sandDk: 0x8a8271,
  silt: 0x5e5648,
  water: 0x3e4a47,
  rust: 0x6e4a34,
  soot: 0x54332c,
  burnt: 0x38302a,
} as const satisfies EvanSourcePalette;

const ERA_8_PALETTE = {
  keel: 0x8b8471,
  shore: 0xcfc7b0,
  ground: 0xa9ae96,
  sea: 0x4e8480,
  trunk: 0x8a7c66,
  leaf: [0x6f8f76, 0x628069, 0x7c9a82],
  grass: [0x93ab93, 0x86a087, 0xa2b79e],
  reed: [0x9aa97e, 0x8a9970],
  stone: [0xc6c0ae, 0xd5cfbd, 0xb2ac9a],
  conc: 0xc9c2ae,
  concLt: 0xdcd5c0,
  concDk: 0xa9a290,
  lawn: 0x7fa089,
  lawnDk: 0x6c8d77,
  hard: 0xc4bda8,
  water: 0x5c9a94,
  waterDk: 0x477e79,
  orange: 0xe08234,
} as const satisfies EvanSourcePalette;

const ERA_9_PALETTE = {
  keel: 0x5f666c,
  shore: 0x8e959b,
  ground: 0x7e8880,
  sea: 0x39585f,
  trunk: 0x5c5f5e,
  leaf: [0x4c6b58, 0x42604f, 0x577561],
  grass: [0x74887a, 0x6a7e71, 0x82958a],
  reed: [0x71856a, 0x63775e],
  stone: [0x9aa0a5, 0xaab0b4, 0x848a8f],
  pad: 0x8e969a,
  padLt: 0xa2aaae,
  padDk: 0x6e7679,
  steel: 0x6e767e,
  water: 0x2f6e72,
  waterLt: 0x3e8a88,
  grav: 0x9ba2a6,
} as const satisfies EvanSourcePalette;

const ERA_10_PALETTE = {
  keel: 0x24282e,
  shore: 0x333941,
  ground: 0x2e333b,
  sea: 0x141b24,
  trunk: 0x3a4048,
  leaf: [0x2f4a3e, 0x274038, 0x35544a],
  grass: [0x39474a, 0x314042, 0x35474a],
  reed: [0x35474a, 0x2d3d40],
  stone: [0x3e444c, 0x4a515a, 0x343a41],
  conc: 0x3e454e,
  concDk: 0x2a2f37,
  metal: 0x565e69,
  metalDk: 0x424951,
  wet: 0x27303b,
  water: 0x1e3242,
  rust: 0x5a3a2e,
  cyan: 0x3ae6dc,
  mag: 0xe8479c,
  viol: 0x8a5ce8,
  amber: 0xe8a33c,
} as const satisfies EvanSourcePalette;

function sourceDesign(input: {
  readonly eraId: DesignedIslandEraId;
  readonly sourceEra: EraIslandDesign["sourceEra"];
  readonly referenceName: string;
  readonly sceneName: string;
  readonly groundPattern: IslandGroundPattern;
  readonly palette: EvanSourcePalette;
  readonly signatures: readonly string[];
}): EraIslandDesign {
  return {
    eraId: input.eraId,
    sourceEra: input.sourceEra,
    sourceClassName: `Era${input.sourceEra}Island`,
    sceneName: input.sceneName,
    referenceName: input.referenceName,
    groundPattern: input.groundPattern,
    patternLine: "rgba(50,45,36,0.34)",
    patternOpacity: 0,
    shoreline: "evan-source",
    baseScatter: scatter,
    water: water(input.palette.sea),
    terrain: terrain(input.palette),
    sourcePalette: input.palette,
    signatures: input.signatures,
  };
}

/** The complete ten-era authored island registry. */
export const EVAN_ISLAND_DESIGNS: Readonly<Record<DesignedIslandEraId, EraIslandDesign>> = {
  prehistoric: {
    ...sourceDesign({
      eraId: "prehistoric",
      sourceEra: 1,
      sceneName: "prehistoric-windblown-shore-camp",
      referenceName: "The Windblown Shore Camp",
      groundPattern: "natural-tussock",
      palette: ERA_1_PALETTE,
      // 2026-08-21: prehistoric's gravel-shelf and shore-boulder-clusters props were removed
      // deliberately ("take out any of the art thats not the trees") — they no longer exist as
      // landforms, so they are no longer named signatures. wind-cropped-trees is the only
      // landform era one still authors.
      signatures: ["wind-cropped-trees"],
    }),
    shoreline: "shelving-shore",
    terrain: {
      ...terrain(ERA_1_PALETTE),
      deepWater: 0x3f7f92,
      earth: 0xc9a06a,
      earthWorn: 0xb2854f,
      coarseSand: 0xc9b98a,
      gravel: 0xb8a877,
      gravelWet: 0x998a63,
      gridLine: "rgba(46,66,24,0.95)",
    },
  },
  neolithic: sourceDesign({
    eraId: "neolithic",
    sourceEra: 2,
    sceneName: "evan-era2-neolithic-island",
    referenceName: "The Island",
    groundPattern: "terraced-earth",
    palette: ERA_2_PALETTE,
    signatures: ["grazing-patches", "wind-cropped-trees", "gravel-rim", "reed-banks"],
  }),
  bronze_age: {
    ...sourceDesign({
      eraId: "bronze_age",
      sourceEra: 3,
      sceneName: "evan-era3-dry-headland",
      referenceName: "The Dry Headland",
      groundPattern: "terraced-earth",
      palette: ERA_3_PALETTE,
      signatures: ["dry-stone-terraces", "copper-outcrop", "salt-pan"],
    }),
  },
  classical: sourceDesign({
    eraId: "classical",
    sourceEra: 4,
    sceneName: "evan-era4-limestone-promontory",
    referenceName: "The Promontory",
    groundPattern: "regular-stone-bond",
    palette: ERA_4_PALETTE,
    signatures: ["limestone-shelves", "shelf-knoll", "gravel-cove", "cypress-stands"],
  }),
  medieval: sourceDesign({
    eraId: "medieval",
    sourceEra: 5,
    sceneName: "evan-era5-river-island",
    referenceName: "The River Island",
    groundPattern: "broken-paving",
    palette: ERA_5_PALETTE,
    signatures: ["chalk-bluff", "stream-mouth", "hedgerows", "willow-marsh"],
  }),
  renaissance: sourceDesign({
    eraId: "renaissance",
    sourceEra: 6,
    sceneName: "evan-era6-estuary-island",
    referenceName: "The Estuary Island",
    groundPattern: "surveyed-geometry",
    palette: ERA_6_PALETTE,
    signatures: ["ridge-and-furrow", "cut-drain", "sandstone-ridge", "tidal-mud"],
  }),
  industrial: sourceDesign({
    eraId: "industrial",
    sourceEra: 7,
    sceneName: "evan-era7-coalfield",
    referenceName: "The Coalfield",
    groundPattern: "industrial-setts",
    palette: ERA_7_PALETTE,
    signatures: ["coal-seam", "spoil-heaps", "sandstone-quarry", "silted-channel"],
  }),
  atomic_age: sourceDesign({
    eraId: "atomic_age",
    sourceEra: 8,
    sceneName: "evan-era8-graded-shelf",
    referenceName: "The Graded Shelf",
    groundPattern: "surveyed-geometry",
    palette: ERA_8_PALETTE,
    signatures: ["graded-terrace", "hardstanding", "engineered-basin", "topiary-groves"],
  }),
  information_age: sourceDesign({
    eraId: "information_age",
    sourceEra: 9,
    sceneName: "evan-era9-levelled-shelf",
    referenceName: "The Levelled Shelf",
    groundPattern: "regular-stone-bond",
    palette: ERA_9_PALETTE,
    signatures: ["graded-stone-beds", "retention-basin", "straight-drain", "riprap-bank"],
  }),
  cyberpunk: sourceDesign({
    eraId: "cyberpunk",
    sourceEra: 10,
    sceneName: "evan-era10-reclaim",
    referenceName: "The Reclaim",
    groundPattern: "industrial-setts",
    palette: ERA_10_PALETTE,
    signatures: ["standing-water", "reclaimed-slabs", "steam-fissure", "block-revetment"],
  }),
};

/** Compatibility census for guards written before the complete delivery arrived. */
export const ERA_THREE_TO_SEVEN_ISLANDS = {
  bronze_age: EVAN_ISLAND_DESIGNS.bronze_age,
  classical: EVAN_ISLAND_DESIGNS.classical,
  medieval: EVAN_ISLAND_DESIGNS.medieval,
  renaissance: EVAN_ISLAND_DESIGNS.renaissance,
  industrial: EVAN_ISLAND_DESIGNS.industrial,
} as const;

export function eraIslandDesign(eraId: EraId): EraIslandDesign | null {
  return EVAN_ISLAND_DESIGNS[eraId as DesignedIslandEraId] ?? null;
}

export function drawEraGroundPattern(
  context: CanvasRenderingContext2D,
  design: EraIslandDesign | null,
  size: number,
  cells: number,
  pixelsPerCell: number,
): void {
  if (!design) {
    return;
  }

  context.save();
  context.strokeStyle = design.patternLine;
  context.lineWidth = 1;

  if (design.groundPattern === "terraced-earth") {
    for (let y = pixelsPerCell / 2; y < size; y += pixelsPerCell) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y + pixelsPerCell * 0.35);
      context.stroke();
    }
  } else if (design.groundPattern === "regular-stone-bond") {
    const course = pixelsPerCell * 0.65;
    for (let y = 0, row = 0; y <= size; y += course, row += 1) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
      const offset = row % 2 === 0 ? 0 : pixelsPerCell;
      for (let x = offset; x <= size; x += pixelsPerCell * 2) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, Math.min(size, y + course));
        context.stroke();
      }
    }
  } else if (design.groundPattern === "broken-paving") {
    for (let row = 0; row < cells * 2; row += 1) {
      const y = row * (size / (cells * 2));
      context.beginPath();
      context.moveTo(0, y);
      for (let step = 0; step <= cells; step += 1) {
        const x = step * (size / cells);
        context.lineTo(x, y + ((row + step) % 3 === 0 ? 2 : -1));
      }
      context.stroke();
    }
  } else if (design.groundPattern === "surveyed-geometry") {
    const center = size / 2;
    for (let ring = 1; ring <= 5; ring += 1) {
      context.beginPath();
      context.arc(center, center, (ring * size) / 12, 0, Math.PI * 2);
      context.stroke();
    }
    for (let ray = 0; ray < 12; ray += 1) {
      const phi = (ray / 12) * Math.PI * 2;
      context.beginPath();
      context.moveTo(center, center);
      context.lineTo(center + Math.sin(phi) * center, center + Math.cos(phi) * center);
      context.stroke();
    }
  } else {
    const pitch = Math.max(4, Math.floor(pixelsPerCell / 2));
    for (let y = 0, row = 0; y <= size; y += pitch, row += 1) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
      const offset = row % 2 === 0 ? 0 : pitch;
      for (let x = offset; x <= size; x += pitch * 2) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, Math.min(size, y + pitch));
        context.stroke();
      }
    }
  }

  context.restore();
}
