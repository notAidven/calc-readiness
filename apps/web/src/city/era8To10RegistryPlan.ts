export type LateEraId = "atomic_age" | "information_age" | "cyberpunk";

export type LateEraSkillBuilding = readonly [
  handle: string,
  mass: string,
  subtitle: string,
];

export const LATE_ERA_SKILL_BUILDINGS = {
  atomic_age: {
    "FUN.4": ["Assembly Hall", "hall", "the Weather Office"],
    "LF.1": ["Assembly Hall", "hall", "the Telephone Exchange"],
    "FUN.6": ["Store", "store", "the Radio Workshop"],
    "FUN.5": ["Workshop", "workshop", "the Wind Tunnel"],
    "FUN.9": ["Dwellings", "dwelling", "the Housing Blocks"],
    "LF.2": ["Workshop", "workshop", "the Electronics Works"],
    "LF.3": ["Store", "store", "the Nuclear Weapons Facility"],
    "FUN.10": ["Commons", "yard", "the Power Station"],
    "LF.4": ["Tower", "tower", "the Cooling Tower"],
  },
  information_age: {
    "EL.1": ["Assembly Hall", "hall", "the Data Centre"],
    "EL.2": ["Tower", "tower", "the Office Tower"],
    "EL.3": ["Workshop", "workshop", "the Chip Factory"],
    "EL.4": ["Store", "store", "the Research Lab"],
    "EL.5": ["Dwellings", "dwelling", "the Glass Apartments"],
    "EL.6": ["Commons", "yard", "the Air Force Base"],
  },
  cyberpunk: {
    "TRG.1": ["Commons", "yard", "the Neon Plaza"],
    "TRG.2": ["Workshop", "workshop", "Drone Command"],
    "TRG.3": ["Assembly Hall", "hall", "the Hologram Theatre"],
    "TRG.4": ["Tower", "tower", "the Signal Tower"],
    "TRG.5": ["Store", "store", "the Data Vault"],
    "TRG.6": ["Tower", "tower", "the Broadcast Tower"],
    "TRG.7": ["Workshop", "workshop", "the Robotics Lab"],
    "TRG.8": ["Assembly Hall", "hall", "the Stock Exchange"],
    "TRG.9": ["Dwellings", "dwelling", "the Quantum Core"],
  },
} as const satisfies Readonly<
  Record<LateEraId, Readonly<Record<string, LateEraSkillBuilding>>>
>;

export interface LateEraHall {
  readonly subtitle: string;
  readonly basename: string;
  readonly runtimeId: "town-hall";
  readonly runtimeEra: LateEraId;
}

export const LATE_ERA_HALLS = {
  atomic_age: {
    subtitle: "the Heating Plant",
    basename: "townhall-atomic-age-built.glb",
    runtimeId: "town-hall",
    runtimeEra: "atomic_age",
  },
  information_age: {
    subtitle: "the Headquarters",
    basename: "townhall-information-age-built.glb",
    runtimeId: "town-hall",
    runtimeEra: "information_age",
  },
  cyberpunk: {
    subtitle: "the Steam Vent",
    basename: "townhall-cyberpunk-built.glb",
    runtimeId: "town-hall",
    runtimeEra: "cyberpunk",
  },
} as const satisfies Readonly<Record<LateEraId, LateEraHall>>;

export interface LateEraCivicRow {
  readonly id: string;
  readonly era: string;
}

export function lateEraCivicIds(
  catalogue: readonly LateEraCivicRow[],
  era: LateEraId,
): readonly string[] {
  const ids = catalogue.filter((row) => row.era === era).map((row) => row.id);

  if (ids.length !== 4 || new Set(ids).size !== 4) {
    throw new Error(`expected exactly four unique civic rows for ${era}`);
  }

  return ids;
}
