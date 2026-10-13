import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

/**
 * Large structural reads added at the shared model-preparation seam.
 *
 * These are deliberately not prop/decal slots. Each profile changes a building's occupied
 * visual mass in plan or above the roofline, so it survives the normal gameplay camera.
 */
export const BUILDING_ART_PROFILES = [
  "crown",
  "twin-towers",
  "side-tower",
  "front-porch",
  "ridge-monitor",
  "buttressed",
  "split-wings",
  "round-roof",
  "stepped-bays",
] as const;

export type BuildingArtProfile = (typeof BUILDING_ART_PROFILES)[number];

export interface EraArchitecturalGrammar {
  readonly character: string;
  readonly structureColor: number;
  readonly roofColor: number;
  readonly accentColor: number;
  readonly roundSegments: number;
  readonly features: Readonly<Record<BuildingArtProfile, string>>;
}

/**
 * One architectural vocabulary per canonical era. Geometry remains reusable; these names and
 * materials state what that geometry means in its historical setting.
 */
export const ERA_ARCHITECTURAL_GRAMMARS = {
  prehistoric: {
    character:
      "lashed timber frames, hide walls, and low thatch gathered around communal roofs",
    structureColor: 0x77502f,
    roofColor: 0x9a6a2d,
    accentColor: 0xc49b58,
    roundSegments: 7,
    features: {
      crown: "a smoke-crowned timber lookout",
      "twin-towers": "paired forked observation frames",
      "side-tower": "an asymmetrical lashed watch platform",
      "front-porch": "a deep post-and-hide working porch",
      "ridge-monitor": "a raised smoke ridge over the long roof",
      buttressed: "an outer ring of raking timber braces",
      "split-wings": "two low family lean-tos around the main frame",
      "round-roof": "a dominant conical thatch crown",
      "stepped-bays": "separate stepped hide-roof work bays",
    },
  },
  neolithic: {
    character:
      "straw-tempered mud brick, close-set roof beams, and round fired-clay crowns",
    structureColor: 0xa88655,
    roofColor: 0xc6ad78,
    accentColor: 0x8f3e2e,
    roundSegments: 9,
    features: {
      crown: "a clay-capped grain and smoke lantern",
      "twin-towers": "paired mud-brick storage turrets",
      "side-tower": "a tall side granary on a brick base",
      "front-porch": "a beam-roofed threshing porch",
      "ridge-monitor": "a continuous raised drying ridge",
      buttressed: "broad battered mud-brick corner piers",
      "split-wings": "paired low courtyard rooms",
      "round-roof": "a communal clay dome over a brick drum",
      "stepped-bays": "stepped flat-roof workshop bays",
    },
  },
  bronze_age: {
    character: "stone podiums, timber halls, and bronze-capped vents around working courts",
    structureColor: 0x6c5638,
    roofColor: 0x485b45,
    accentColor: 0xa46e3b,
    roundSegments: 8,
    features: {
      crown: "a bronze-capped tally lantern",
      "twin-towers": "paired store towers marking the court",
      "side-tower": "an offset watch and weighing tower",
      "front-porch": "a full-width timber counting portico",
      "ridge-monitor": "a foundry smoke monitor along the ridge",
      buttressed: "battered stone treasury piers",
      "split-wings": "two trade wings around an open court",
      "round-roof": "a council drum under a low conical roof",
      "stepped-bays": "stepped smelting and casting bays",
    },
  },
  classical: {
    character:
      "pale ashlar podiums, terracotta roofs, and civic colonnades with strict symmetry",
    structureColor: 0xe1d6bf,
    roofColor: 0xa93f24,
    accentColor: 0x8c7658,
    roundSegments: 12,
    features: {
      crown: "a tiled civic lantern on a stone drum",
      "twin-towers": "paired honor pylons framing the approach",
      "side-tower": "an offset archive stair tower",
      "front-porch": "a deep columned public portico",
      "ridge-monitor": "a raised clerestory under terracotta",
      buttressed: "projecting ashlar corner antae",
      "split-wings": "balanced side stoas around a court",
      "round-roof": "a circular tiled rotunda",
      "stepped-bays": "a stepped sequence of workshop roof bays",
    },
  },
  medieval: {
    character:
      "stone ground floors, half-timber upper work, and steep slate or tile gables",
    structureColor: 0x6f5b49,
    roofColor: 0x3f4d59,
    accentColor: 0xa24b2b,
    roundSegments: 8,
    features: {
      crown: "a timber bell cote over the roof crossing",
      "twin-towers": "paired half-timber gate turrets",
      "side-tower": "an offset stone stair and watch tower",
      "front-porch": "a jettied market porch on heavy posts",
      "ridge-monitor": "a raised louvred guild-hall ridge",
      buttressed: "four tall masonry buttresses and parapets",
      "split-wings": "two low jettied ranges around a yard",
      "round-roof": "a slate-capped guild rotunda",
      "stepped-bays": "steep stepped-gable workshop bays",
    },
  },
  renaissance: {
    character:
      "ordered stucco and brick masses, slate roofs, cupolas, and measured courtyards",
    structureColor: 0xc2a087,
    roofColor: 0x4d5b69,
    accentColor: 0x8d634c,
    roundSegments: 12,
    features: {
      crown: "a copper-capped survey lantern",
      "twin-towers": "paired stair pavilions on a symmetrical front",
      "side-tower": "an offset oriel and survey stair tower",
      "front-porch": "an arcaded teaching loggia",
      "ridge-monitor": "a north-lit drawing clerestory",
      buttressed: "battered artillery piers and a raised parapet",
      "split-wings": "two measured courtyard wings",
      "round-roof": "an observatory dome on a high drum",
      "stepped-bays": "stepped printing-house gables",
    },
  },
  industrial: {
    character:
      "red brick shells, dark iron roofs, sawtooth bays, stacks, and engine monitors",
    structureColor: 0x7b3026,
    roofColor: 0x202b33,
    accentColor: 0x9a632f,
    roundSegments: 8,
    features: {
      crown: "a tall iron water tank and signal crown",
      "twin-towers": "paired brick engine and hoist towers",
      "side-tower": "an offset boiler and lift tower",
      "front-porch": "an iron train-shed loading canopy",
      "ridge-monitor": "a long louvred engine-house monitor",
      buttressed: "heavy brick piers carrying iron roof trusses",
      "split-wings": "two machine wings around a service court",
      "round-roof": "a riveted gas-holder drum",
      "stepped-bays": "a run of high sawtooth factory bays",
    },
  },
  atomic_age: {
    character:
      "white concrete frames, aluminium service roofs, cantilevers, dishes, and plant towers",
    structureColor: 0xe2e2d7,
    roofColor: 0x27353e,
    accentColor: 0x5c9ba0,
    roundSegments: 14,
    features: {
      crown: "a radar and weather-instrument crown",
      "twin-towers": "paired concrete service and exhaust towers",
      "side-tower": "an offset radio and control tower",
      "front-porch": "a broad cantilevered entrance deck",
      "ridge-monitor": "a continuous wind-tunnel service spine",
      buttressed: "splayed concrete reactor shielding piers",
      "split-wings": "two slab wings around a landscaped court",
      "round-roof": "a dominant hyperbolic cooling drum",
      "stepped-bays": "stepped electronics production roofs",
    },
  },
  information_age: {
    character:
      "dark glass and steel slabs, expressed service floors, roof plants, and atrium cuts",
    structureColor: 0x4a555f,
    roofColor: 0x202b34,
    accentColor: 0xb8a54d,
    roundSegments: 10,
    features: {
      crown: "a rooftop communications crown",
      "twin-towers": "paired service and circulation cores",
      "side-tower": "an offset glass office tower",
      "front-porch": "a full-width steel-and-glass atrium",
      "ridge-monitor": "a raised clean-room and service spine",
      buttressed: "expressed external data-centre bracing",
      "split-wings": "two glass apartment wings around a roof garden",
      "round-roof": "a circular research auditorium",
      "stepped-bays": "stepped server and cooling halls",
    },
  },
  cyberpunk: {
    character:
      "dark composite decks, exposed structure, split towers, neon cuts, and signal crowns",
    structureColor: 0x242b35,
    roofColor: 0x111821,
    accentColor: 0x27c7c9,
    roundSegments: 10,
    features: {
      crown: "a drone-control mast and landing crown",
      "twin-towers": "paired neon plaza pylons",
      "side-tower": "an offset signal and relay tower",
      "front-porch": "a deep cantilevered exchange deck",
      "ridge-monitor": "a raised broadcast and cooling spine",
      buttressed: "splayed armored data-vault braces",
      "split-wings": "two suspended lab wings around a core",
      "round-roof": "a hologram theatre drum and luminous dome",
      "stepped-bays": "stepped robotics fabrication decks",
    },
  },
} as const satisfies Readonly<Record<EraId, EraArchitecturalGrammar>>;

/**
 * Profile assignments in canonical `ERA_SEQUENCE.nodes` order. They are concept decisions, not
 * hashes: a cooling tower gets the round roof, an observatory gets the dome, a Classical public
 * hall gets the portico. Geometry is shared across the table, while identity chooses its use.
 */
export const ERA_BUILDING_PROFILE_ASSIGNMENTS = {
  prehistoric: [
    "round-roof",
    "ridge-monitor",
    "split-wings",
    "front-porch",
    "twin-towers",
    "side-tower",
  ],
  neolithic: ["ridge-monitor", "stepped-bays", "buttressed", "round-roof", "side-tower"],
  bronze_age: ["front-porch", "ridge-monitor", "buttressed", "split-wings", "side-tower"],
  classical: ["stepped-bays", "twin-towers", "front-porch", "ridge-monitor", "round-roof"],
  medieval: ["stepped-bays", "ridge-monitor", "front-porch", "side-tower", "split-wings"],
  renaissance: [
    "round-roof",
    "ridge-monitor",
    "side-tower",
    "stepped-bays",
    "front-porch",
    "buttressed",
  ],
  industrial: [
    "ridge-monitor",
    "stepped-bays",
    "split-wings",
    "twin-towers",
    "side-tower",
    "crown",
  ],
  atomic_age: [
    "crown",
    "ridge-monitor",
    "side-tower",
    "split-wings",
    "twin-towers",
    "stepped-bays",
    "front-porch",
    "buttressed",
    "round-roof",
  ],
  information_age: [
    "stepped-bays",
    "side-tower",
    "ridge-monitor",
    "front-porch",
    "split-wings",
    "twin-towers",
  ],
  cyberpunk: [
    "twin-towers",
    "crown",
    "round-roof",
    "side-tower",
    "buttressed",
    "ridge-monitor",
    "stepped-bays",
    "front-porch",
    "split-wings",
  ],
} as const satisfies Readonly<Record<EraId, readonly BuildingArtProfile[]>>;

export interface SkillBuildingArtVariation {
  readonly nodeId: string;
  readonly eraId: EraId;
  readonly profile: BuildingArtProfile;
  readonly structuralFeature: string;
  readonly grammar: EraArchitecturalGrammar;
}

const VARIATIONS: readonly SkillBuildingArtVariation[] = ERA_SEQUENCE.flatMap((era) => {
  const assignments = ERA_BUILDING_PROFILE_ASSIGNMENTS[era.id];
  if (assignments.length !== era.nodes.length) {
    throw new Error(
      `${era.id} has ${era.nodes.length} canonical skill buildings but ${assignments.length} art profiles`,
    );
  }
  return era.nodes.map((nodeId, index) => {
    const profile = assignments[index];
    if (!profile) {
      throw new Error(`${nodeId} has no building-art profile`);
    }
    const grammar = ERA_ARCHITECTURAL_GRAMMARS[era.id];
    return {
      nodeId,
      eraId: era.id,
      profile,
      structuralFeature: grammar.features[profile],
      grammar,
    };
  });
});

const VARIATION_BY_NODE = new Map(
  VARIATIONS.map((variation) => [variation.nodeId, variation]),
);

/** The deterministic structural variation for a canonical skill node; never for civics or Hall. */
export function buildingArtVariationForNode(
  nodeId: string,
): SkillBuildingArtVariation | null {
  return VARIATION_BY_NODE.get(nodeId) ?? null;
}

/** Registry-derived public census used by the population and geometry-collapse guards. */
export function skillBuildingArtVariations(): readonly SkillBuildingArtVariation[] {
  return VARIATIONS;
}
