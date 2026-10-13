import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright";
import { describe, expect, it } from "vitest";

type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? DeepMutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;

function requiredRow<T>(
  plans: readonly { readonly rows: readonly T[] }[],
  planIndex: number,
  rowIndex: number,
): T {
  const plan = plans[planIndex];
  const row = plan?.rows[rowIndex];
  if (row === undefined) throw new Error(`missing mutation row ${planIndex}:${rowIndex}`);
  return row;
}

const ROOT = process.cwd();
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html",
);

async function pageFactory() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/*", (route) => route.abort());
  const page = await context.newPage();
  return {
    page,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

const EXPECTED_ROWS = [
  [
    "atomic_age",
    "weather",
    "Weather",
    "the Weather Office",
    "FUN.4",
    "3×2",
    0,
    "skill",
    "FUN.4",
    "atomic_age",
    2,
    2,
    "fun-4",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "exchange",
    "Exchange",
    "the Telephone Exchange",
    "LF.1",
    "3×2",
    1,
    "skill",
    "LF.1",
    "atomic_age",
    2,
    2,
    "lf-1",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "radio",
    "Radio",
    "the Radio Workshop",
    "FUN.6",
    "2×2",
    2,
    "skill",
    "FUN.6",
    "atomic_age",
    2,
    2,
    "fun-6",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "tunnel",
    "Wind Tunnel",
    "the Wind Tunnel",
    "FUN.5",
    "3×2",
    3,
    "skill",
    "FUN.5",
    "atomic_age",
    2,
    2,
    "fun-5",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "housing",
    "Housing",
    "the Housing Blocks",
    "FUN.9",
    "3×2",
    4,
    "skill",
    "FUN.9",
    "atomic_age",
    2,
    2,
    "fun-9",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "electronics",
    "Electronics",
    "the Electronics Works",
    "LF.2",
    "3×2",
    5,
    "skill",
    "LF.2",
    "atomic_age",
    2,
    2,
    "lf-2",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "nuclear",
    "Nuclear",
    "the Nuclear Weapons Facility",
    "LF.3",
    "3×3",
    6,
    "skill",
    "LF.3",
    "atomic_age",
    2,
    2,
    "lf-3",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "power",
    "Power",
    "the Power Station",
    "FUN.10",
    "3×3",
    7,
    "skill",
    "FUN.10",
    "atomic_age",
    2,
    2,
    "fun-10",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "cooling",
    "Cooling",
    "the Cooling Tower",
    "LF.4",
    "2×2",
    8,
    "skill",
    "LF.4",
    "atomic_age",
    2,
    2,
    "lf-4",
    "site,construction,built",
  ],
  [
    "atomic_age",
    "supermarket",
    "Supermarket",
    "the Supermarket",
    "civic",
    "3×2",
    9,
    "civic",
    "atomic_age_supermarket",
    "atomic_age",
    2,
    2,
    "civic-atomic-age-supermarket",
    "built",
  ],
  [
    "atomic_age",
    "apartment",
    "Apartments",
    "the Apartment Tower",
    "civic",
    "2×2",
    10,
    "civic",
    "atomic_age_apartment_tower",
    "atomic_age",
    1,
    1,
    "civic-atomic-age-apartment-tower",
    "built",
  ],
  [
    "atomic_age",
    "pool",
    "Pool",
    "the Swimming Pool",
    "civic",
    "3×2",
    11,
    "civic",
    "atomic_age_swimming_pool",
    "atomic_age",
    3,
    2,
    "civic-atomic-age-swimming-pool",
    "built",
  ],
  [
    "atomic_age",
    "firestation",
    "Fire Station",
    "the Fire Station",
    "civic",
    "3×2",
    12,
    "civic",
    "atomic_age_community_centre",
    "atomic_age",
    2,
    1,
    "civic-atomic-age-community-centre",
    "built",
  ],
  [
    "atomic_age",
    "townhall",
    "Town Hall",
    "the Town Hall & Heating Plant",
    "civic",
    "3×3",
    13,
    "townhall",
    "town-hall",
    "atomic_age",
    3,
    2,
    "townhall-atomic-age",
    "built",
  ],
  [
    "information_age",
    "datacentre",
    "Data Centre",
    "the Data Centre",
    "EL.1",
    "3×2",
    0,
    "skill",
    "EL.1",
    "information_age",
    2,
    2,
    "el-1",
    "site,construction,built",
  ],
  [
    "information_age",
    "officetower",
    "Office Tower",
    "the Office Tower",
    "EL.2",
    "2×2",
    1,
    "skill",
    "EL.2",
    "information_age",
    2,
    2,
    "el-2",
    "site,construction,built",
  ],
  [
    "information_age",
    "chipfab",
    "Chip Factory",
    "the Chip Factory",
    "EL.3",
    "3×3",
    2,
    "skill",
    "EL.3",
    "information_age",
    2,
    2,
    "el-3",
    "site,construction,built",
  ],
  [
    "information_age",
    "researchlab",
    "Research Lab",
    "the Research Lab",
    "EL.4",
    "3×2",
    3,
    "skill",
    "EL.4",
    "information_age",
    2,
    2,
    "el-4",
    "site,construction,built",
  ],
  [
    "information_age",
    "glassapts",
    "Glass Apartments",
    "the Glass Apartments",
    "EL.5",
    "3×2",
    4,
    "skill",
    "EL.5",
    "information_age",
    2,
    2,
    "el-5",
    "site,construction,built",
  ],
  [
    "information_age",
    "airbase",
    "Air Force Base",
    "the Air Force Base",
    "EL.6",
    "3×3",
    5,
    "skill",
    "EL.6",
    "information_age",
    2,
    2,
    "el-6",
    "site,construction,built",
  ],
  [
    "information_age",
    "distribution",
    "Distribution",
    "the Distribution Centre",
    "civic",
    "3×3",
    6,
    "civic",
    "information_age_food_warehouse",
    "information_age",
    2,
    2,
    "civic-information-age-food-warehouse",
    "built",
  ],
  [
    "information_age",
    "condominium",
    "Condominium",
    "the Condominium",
    "civic",
    "2×2",
    7,
    "civic",
    "information_age_residential_tower",
    "information_age",
    1,
    1,
    "civic-information-age-residential-tower",
    "built",
  ],
  [
    "information_age",
    "roofgarden",
    "Roof Garden",
    "the Roof Garden",
    "civic",
    "3×3",
    8,
    "civic",
    "information_age_park",
    "information_age",
    3,
    2,
    "civic-information-age-park",
    "built",
  ],
  [
    "information_age",
    "hospital",
    "Hospital",
    "the Hospital",
    "civic",
    "3×3",
    9,
    "civic",
    "information_age_clinic",
    "information_age",
    1,
    2,
    "civic-information-age-clinic",
    "built",
  ],
  [
    "information_age",
    "headquarters",
    "Headquarters",
    "the Headquarters",
    "civic",
    "3×3",
    10,
    "townhall",
    "town-hall",
    "information_age",
    3,
    2,
    "townhall-information-age",
    "built",
  ],
  [
    "cyberpunk",
    "neonplaza",
    "Neon Plaza",
    "the Neon Plaza",
    "TRG.1",
    "3×3",
    0,
    "skill",
    "TRG.1",
    "cyberpunk",
    2,
    2,
    "trg-1",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "dronecommand",
    "Drone Command",
    "the Drone Command",
    "TRG.2",
    "3×2",
    1,
    "skill",
    "TRG.2",
    "cyberpunk",
    2,
    2,
    "trg-2",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "hologram",
    "Hologram Theatre",
    "the Hologram Theatre",
    "TRG.3",
    "3×2",
    2,
    "skill",
    "TRG.3",
    "cyberpunk",
    2,
    2,
    "trg-3",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "signaltower",
    "Signal Tower",
    "the Signal Tower",
    "TRG.4",
    "2×2",
    3,
    "skill",
    "TRG.4",
    "cyberpunk",
    2,
    2,
    "trg-4",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "datavault",
    "Data Vault",
    "the Data Vault",
    "TRG.5",
    "3×2",
    4,
    "skill",
    "TRG.5",
    "cyberpunk",
    2,
    2,
    "trg-5",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "broadcast",
    "Broadcast Tower",
    "the Broadcast Tower",
    "TRG.6",
    "3×3",
    5,
    "skill",
    "TRG.6",
    "cyberpunk",
    2,
    2,
    "trg-6",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "robotics",
    "Robotics Lab",
    "the Robotics Lab",
    "TRG.7",
    "3×2",
    6,
    "skill",
    "TRG.7",
    "cyberpunk",
    2,
    2,
    "trg-7",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "exchange",
    "Stock Exchange",
    "the Stock Exchange",
    "TRG.8",
    "3×3",
    7,
    "skill",
    "TRG.8",
    "cyberpunk",
    2,
    2,
    "trg-8",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "quantum",
    "Quantum Core",
    "the Quantum Core",
    "TRG.9",
    "3×3",
    8,
    "skill",
    "TRG.9",
    "cyberpunk",
    2,
    2,
    "trg-9",
    "site,construction,built",
  ],
  [
    "cyberpunk",
    "vertfarm",
    "Vertical Farm",
    "the Vertical Farm",
    "civic",
    "2×2",
    9,
    "civic",
    "cyberpunk_vertical_farm",
    "cyberpunk",
    1,
    1,
    "civic-cyberpunk-vertical-farm",
    "built",
  ],
  [
    "cyberpunk",
    "pods",
    "Pod Apartments",
    "the Pod Apartments",
    "civic",
    "2×2",
    10,
    "civic",
    "cyberpunk_capsule_homes",
    "cyberpunk",
    1,
    1,
    "civic-cyberpunk-capsule-homes",
    "built",
  ],
  [
    "cyberpunk",
    "nightmarket",
    "Night Market",
    "the Night Market",
    "civic",
    "3×3",
    11,
    "civic",
    "cyberpunk_night_market",
    "cyberpunk",
    3,
    2,
    "civic-cyberpunk-night-market",
    "built",
  ],
  [
    "cyberpunk",
    "nightclub",
    "Nightclub",
    "the Nightclub",
    "civic",
    "3×2",
    12,
    "civic",
    "cyberpunk_station",
    "cyberpunk",
    2,
    2,
    "civic-cyberpunk-station",
    "built",
  ],
  [
    "cyberpunk",
    "steamvent",
    "Town Hall",
    "the Steam Vent",
    "civic",
    "4×4",
    13,
    "townhall",
    "town-hall",
    "cyberpunk",
    3,
    2,
    "townhall-cyberpunk",
    "built",
  ],
] as const;

describe("Era 8-10 source contract", () => {
  it("freezes all 39 authored rows and the exact 87 output jobs", async () => {
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    const actualRows = exporter.ERA_PLANS.flatMap((plan) =>
      plan.rows.map((row) => [
        plan.era,
        row.definition,
        row.tab,
        row.title,
        row.target,
        row.sourceFootprint,
        row.ordinal,
        row.kind,
        row.runtimeId,
        row.runtimeEra,
        row.runtimeFootprint.w,
        row.runtimeFootprint.d,
        row.outputBasename,
        row.stages.join(","),
      ]),
    );
    expect(actualRows).toEqual(EXPECTED_ROWS);
    expect(Object.isFrozen(exporter.ERA_PLANS)).toBe(true);
    expect(exporter.ERA_PLANS.map((plan) => plan.rows.length)).toEqual([14, 11, 14]);
    const jobs = exporter.deriveExportJobs();
    expect(jobs).toHaveLength(87);
    expect(jobs.filter((job) => job.stage === "site")).toHaveLength(24);
    expect(jobs.filter((job) => job.stage === "construction")).toHaveLength(24);
    expect(jobs.filter((job) => job.stage === "built")).toHaveLength(39);
    expect(jobs.map((job) => job.outputPath)).toEqual(
      exporter.ERA_PLANS.flatMap((plan) =>
        plan.rows.flatMap((row) =>
          row.stages.map((stage) => `${row.outputPath}-${stage}.glb`),
        ),
      ),
    );
  });

  it("rejects rows outside the live graph, civic catalogue, and canonical output templates", async () => {
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    const plan = () =>
      structuredClone(exporter.ERA_PLANS) as DeepMutable<typeof exporter.ERA_PLANS>;

    const wrongSkill = plan();
    requiredRow(wrongSkill, 0, 0).target = "NOT.A.SKILL";
    expect(() => exporter.deriveExportJobs(wrongSkill)).toThrow(/graph/);

    const wrongCivic = plan();
    requiredRow(wrongCivic, 0, 9).runtimeId = "atomic_age_not_a_catalogue_entry";
    expect(() => exporter.deriveExportJobs(wrongCivic)).toThrow(/catalogue/);

    const wrongDirectory = plan();
    requiredRow(wrongDirectory, 0, 0).outputDirectory = "tmp/escape" as never;
    expect(() => exporter.deriveExportJobs(wrongDirectory)).toThrow(/output directory/);

    const wrongPath = plan();
    requiredRow(wrongPath, 0, 0).outputPath = "apps/web/src/city/art/models/not-fun-4";
    expect(() => exporter.deriveExportJobs(wrongPath)).toThrow(/output path/);

    const wrongStagePath = plan();
    requiredRow(wrongStagePath, 0, 0).stages = ["site", "construction", "other" as never];
    expect(() => exporter.deriveExportJobs(wrongStagePath)).toThrow(/stage/);
  });

  it("evaluates each compressed source in an isolated browser and restores its bridge", async () => {
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    const source = new Uint8Array(await readFile(SOURCE));
    const kits = exporter.extractKitSources(source);
    expect(
      Object.fromEntries(
        ["atomic_age", "information_age", "cyberpunk"].map((era) => [
          era,
          new TextEncoder().encode(kits[era as keyof typeof kits] as string).byteLength,
        ]),
      ),
    ).toEqual({
      atomic_age: 145_862,
      information_age: 126_461,
      cyberpunk: 112_919,
    });

    let acceptedAssignments = 0;
    for (const [era, count, randomCalls, decodedBytes] of [
      ["atomic_age", 14, 21, 145_862],
      ["information_age", 11, 29, 126_461],
      ["cyberpunk", 14, 5, 112_919],
    ] as const) {
      const inspection = await exporter.inspectSourceContract(era, pageFactory);
      expect(inspection.era).toBe(era);
      expect(inspection.roster).toHaveLength(count);
      expect(inspection.definitions).toHaveLength(count);
      expect(inspection.bare).toBe(true);
      expect(inspection.decodedBytes).toBe(decodedBytes);
      expect(inspection.directRandomCalls).toBe(randomCalls);
      expect(inspection.jobs).toHaveLength(era === "information_age" ? 23 : 32);
      expect(inspection.legacyEncoding.bridgeVersion).toBe(1);
      expect(inspection.legacyEncoding.acceptedLegacyEncodingAssignments).toBeGreaterThan(
        0,
      );
      expect(inspection.legacyEncoding.unsupportedLegacyEncodingAssignments).toBe(0);
      acceptedAssignments += inspection.legacyEncoding.acceptedLegacyEncodingAssignments;
    }
    expect(acceptedAssignments).toBe(1_955);
  });
});

describe("Era 8-10 legacy r128 bridge", () => {
  it("makes legacy sRGB assignments reversible and proves Era 10 needs Era 9 first", async () => {
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    const inspection = await exporter.inspectSourceContract("cyberpunk", pageFactory);
    expect(inspection.useBeforeBaseError).toMatch(/Era9Kit/);
    expect(inspection.roster).toHaveLength(14);
    expect(inspection.legacy.rawModernColorSpace).not.toBe("srgb");
    expect(inspection.legacy.facadeColorSpace).toBe("srgb");
    expect(inspection.legacy.hasOwnEncoding).toBe(false);
    expect(inspection.legacy.restored).toBe(true);
  });
});
