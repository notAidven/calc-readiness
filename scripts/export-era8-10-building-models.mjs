import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants, readFileSync } from "node:fs";
import {
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";

const APPROVED_NODE_IMPORTS = Object.freeze({
  execFile,
  createHash,
  randomBytes,
  constants,
  readFileSync,
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  rm,
  stat,
  unlink,
  writeFile,
  tmpdir,
  basename,
  dirname,
  join,
  relative,
  resolve,
  sep,
  fileURLToPath,
  promisify,
  gunzipSync,
});

void APPROVED_NODE_IMPORTS;

export const SOURCE_CONTRACT = Object.freeze({
  bytes: 1_928_383,
  sha256: "6ee885ef8af7b7c9d9b26cf0ec219fa2c7f5fa8a88133794714f49ef8ba37a69",
  manifestCount: 24,
  resources: Object.freeze({
    three: "b43f7ac9-8d5b-4218-9a75-39aafe705a90",
    atomic_age: "8a39b357-c12e-4bc9-a66f-530e5b51718a",
    information_age: "650d4184-f51f-45f3-a2df-bf92e1ed174e",
    cyberpunk: "b043418c-5d3e-4532-8068-28fc4155770f",
  }),
  decodedKitBytes: Object.freeze({
    atomic_age: 145_862,
    information_age: 126_461,
    cyberpunk: 112_919,
  }),
});

export function assertCanonicalSource(bytes) {
  const input = Buffer.from(bytes);
  if (input.byteLength !== SOURCE_CONTRACT.bytes)
    throw new Error("source byte count mismatch");
  const digest = createHash("sha256").update(input).digest("hex");
  if (digest !== SOURCE_CONTRACT.sha256) throw new Error("source SHA-256 mismatch");
}

export function assertCanonicalKitOwnership(entries) {
  const canonical = "./art/building-sources/era-08-10-gridwork-all-buildings.dc.html";
  for (const [era, id] of Object.entries(SOURCE_CONTRACT.resources)) {
    if (era === "three") continue;
    const owners = Object.entries(entries)
      .filter(([, text]) => text.includes(id))
      .map(([path]) => path);
    if (owners.length !== 1 || owners[0] !== canonical) {
      throw new Error(`${era} resource ${id} owners: ${owners.join(", ") || "none"}`);
    }
  }
}

const ROOT = process.env.INIT_CWD ?? process.cwd();
const execFileAsync = promisify(execFile);
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html",
);
const MODERN_THREE = join(ROOT, "node_modules/three/build/three.cjs");
const SKILL_GRAPH = JSON.parse(
  readFileSync(join(ROOT, "packages/skill-graph/src/skill_graph.json"), "utf8"),
);
const SKILL_IDS = new Set(SKILL_GRAPH.nodes.map((node) => node.id));
const CIVIC_SOURCE = readFileSync(
  join(ROOT, "packages/economy/src/civicCatalogue.ts"),
  "utf8",
);
const CIVIC_IDS_BY_ERA = new Map();
for (const match of CIVIC_SOURCE.matchAll(
  /row\(\s*"([^"]+)",\s*"(atomic_age|information_age|cyberpunk)"/g,
)) {
  const [, id, era] = match;
  const ids = CIVIC_IDS_BY_ERA.get(era) ?? new Set();
  ids.add(id);
  CIVIC_IDS_BY_ERA.set(era, ids);
}
const S = Object.freeze(["site", "construction", "built"]);
const B = Object.freeze(["built"]);
const CANONICAL_LEGACY_ASSIGNMENTS = 1_955;

const p = (
  definition,
  tab,
  title,
  target,
  sourceFootprint,
  ordinal,
  kind,
  runtimeId,
  runtimeEra,
  w,
  d,
  outputBasename,
  stages,
) => {
  const outputDirectory =
    kind === "townhall"
      ? "apps/web/src/city/art/models/townhall"
      : "apps/web/src/city/art/models";
  return Object.freeze({
    definition,
    tab,
    title,
    target,
    sourceFootprint,
    ordinal,
    kind,
    runtimeId,
    runtimeEra,
    runtimeFootprint: Object.freeze({ w, d }),
    outputDirectory,
    outputBasename,
    outputPath: `${outputDirectory}/${outputBasename}`,
    stages,
  });
};

export const ERA_PLANS = Object.freeze([
  Object.freeze({
    era: "atomic_age",
    resourceId: SOURCE_CONTRACT.resources.atomic_age,
    decodedBytes: 145_862,
    kitName: "Era8Kit",
    prerequisites: Object.freeze([]),
    builtOnly: Object.freeze([
      "supermarket",
      "apartment",
      "pool",
      "firestation",
      "townhall",
    ]),
    rows: Object.freeze([
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
    ]),
  }),
  Object.freeze({
    era: "information_age",
    resourceId: SOURCE_CONTRACT.resources.information_age,
    decodedBytes: 126_461,
    kitName: "Era9Kit",
    prerequisites: Object.freeze([]),
    builtOnly: Object.freeze([
      "distribution",
      "condominium",
      "roofgarden",
      "hospital",
      "headquarters",
    ]),
    rows: Object.freeze([
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
    ]),
  }),
  Object.freeze({
    era: "cyberpunk",
    resourceId: SOURCE_CONTRACT.resources.cyberpunk,
    decodedBytes: 112_919,
    kitName: "Era10Kit",
    prerequisites: Object.freeze(["Era9Kit"]),
    builtOnly: Object.freeze(["vertfarm", "pods", "nightmarket", "nightclub", "steamvent"]),
    rows: Object.freeze([
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        S,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
      p(
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
        B,
      ),
    ]),
  }),
]);

function planFor(era) {
  const plan = ERA_PLANS.find((candidate) => candidate.era === era);
  if (!plan) throw new Error(`unknown late-era plan '${era}'`);
  return plan;
}

function assertPlan(plans) {
  const rowCounts = plans.map((plan) => plan.rows.length);
  if (JSON.stringify(rowCounts) !== JSON.stringify([14, 11, 14])) {
    throw new Error(`late-era row counts changed: ${rowCounts.join("/")}`);
  }
  const jobs = plans.flatMap((plan) =>
    plan.rows.flatMap((row) =>
      row.stages.map((stage) => {
        const seedInput = `${row.outputBasename}-${stage}`;
        const relativeFile = `${row.outputPath}-${stage}.glb`;
        return {
          ...row,
          era: plan.era,
          stage,
          seedInput,
          seed: fnv1a32(seedInput),
          relativeFile,
          outputPath: relativeFile,
        };
      }),
    ),
  );
  const expectedByEra = [32, 23, 32];
  if (
    plans
      .map((plan) => jobs.filter((job) => job.era === plan.era).length)
      .some((count, index) => count !== expectedByEra[index])
  )
    throw new Error("late-era output counts changed");
  if (jobs.length !== 87) throw new Error(`expected 87 export jobs, found ${jobs.length}`);
  const categoryCounts = ["skill", "civic", "townhall"].map(
    (kind) => jobs.filter((job) => job.kind === kind).length,
  );
  if (JSON.stringify(categoryCounts) !== JSON.stringify([72, 12, 3])) {
    throw new Error(`late-era category counts changed: ${categoryCounts.join("/")}`);
  }
  const unique = (values, label) => {
    if (new Set(values).size !== values.length) throw new Error(`duplicate ${label}`);
  };
  unique(
    jobs.map((job) => job.outputPath),
    "output path",
  );
  unique(
    plans.flatMap((plan) => plan.rows.map((row) => `${plan.era}:${row.definition}`)),
    "source key",
  );
  unique(
    plans.flatMap((plan) =>
      plan.rows.map((row) => `${plan.era}:${row.kind}:${row.runtimeId}`),
    ),
    "runtime identity",
  );
  for (const plan of plans) {
    const builtOnly = plan.rows
      .filter((row) => row.stages.length === 1 && row.stages[0] === "built")
      .map((row) => row.definition);
    if (JSON.stringify(builtOnly) !== JSON.stringify(plan.builtOnly)) {
      throw new Error(`${plan.era} built-only roster changed`);
    }
    for (const [index, row] of plan.rows.entries()) {
      if (row.ordinal !== index)
        throw new Error(`${plan.era}:${row.definition} ordinal changed`);
      if (
        row.kind === "skill" &&
        (!SKILL_IDS.has(row.target) || row.runtimeId !== row.target)
      ) {
        throw new Error(`${plan.era}:${row.definition} graph membership changed`);
      }
      if (row.kind === "civic" && !CIVIC_IDS_BY_ERA.get(plan.era)?.has(row.runtimeId)) {
        throw new Error(`${plan.era}:${row.definition} catalogue membership changed`);
      }
      if (
        row.kind === "townhall" &&
        (row.runtimeId !== "town-hall" || row.runtimeEra !== plan.era)
      ) {
        throw new Error(`${plan.era}:${row.definition} Hall identity changed`);
      }
      const expectedDirectory =
        row.kind === "townhall"
          ? "apps/web/src/city/art/models/townhall"
          : "apps/web/src/city/art/models";
      if (row.outputDirectory !== expectedDirectory) {
        throw new Error(`${plan.era}:${row.definition} output directory changed`);
      }
      const expectedBasename =
        row.kind === "skill"
          ? row.runtimeId.toLowerCase().replace(".", "-")
          : row.kind === "civic"
            ? `civic-${row.runtimeId.replaceAll("_", "-")}`
            : `townhall-${row.runtimeEra.replaceAll("_", "-")}`;
      if (row.outputBasename !== expectedBasename) {
        throw new Error(`${plan.era}:${row.definition} output basename changed`);
      }
      if (row.outputPath !== `${expectedDirectory}/${expectedBasename}`) {
        throw new Error(`${plan.era}:${row.definition} output path changed`);
      }
      const expectedStages = row.kind === "skill" ? S : B;
      if (JSON.stringify(row.stages) !== JSON.stringify(expectedStages)) {
        throw new Error(`${plan.era}:${row.definition} stage template changed`);
      }
    }
  }
  return jobs;
}

export function deriveExportJobs(plans = ERA_PLANS) {
  const jobs = assertPlan(plans);
  return Object.freeze(jobs.map((job) => Object.freeze(job)));
}

export function fnv1a32(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export async function withBasenameRandom(seedInput, build) {
  const previous = Math.random;
  Math.random = mulberry32(fnv1a32(seedInput));
  try {
    return await build();
  } finally {
    Math.random = previous;
  }
}

const BROWSER_SHA256_SOURCE = `
function gridworkSha256Hex(input) {
  const constants = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const state = [
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
  ];
  const byteLength = input.length;
  const paddedLength = Math.ceil((byteLength + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[byteLength] = 0x80;
  const bitLength = byteLength * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const words = new Uint32Array(64);
  const rotate = (value, bits) => (value >>> bits) | (value << (32 - bits));
  for (let block = 0; block < paddedLength; block += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(block + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15];
      const right = words[index - 2];
      const sigma0 = rotate(left, 7) ^ rotate(left, 18) ^ (left >>> 3);
      const sigma1 = rotate(right, 17) ^ rotate(right, 19) ^ (right >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temporary1) >>> 0;
      d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0; state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0; state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0; state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0; state[7] = (state[7] + h) >>> 0;
  }
  return state.map((value) => value.toString(16).padStart(8, "0")).join("");
}`;

export async function buildDisposableThreeBundle({ injection = null } = {}) {
  if (injection !== null && (typeof injection !== "string" || injection.length === 0)) {
    throw new Error("ordered-image test injection must be a nonempty string or null");
  }
  const directory = await mkdtemp(join(tmpdir(), "era8-10-three-"));
  let handedOff = false;
  try {
    const installed = fileURLToPath(
      import.meta.resolve("three/examples/jsm/exporters/GLTFExporter.js"),
    );
    const before = await readFile(installed);
    const installedExporterSha256 = createHash("sha256").update(before).digest("hex");
    const source = before.toString("utf8");
    const unordered = `				pending.push(

					getToBlobPromise( canvas, mimeType )
						.then( blob => writer.processBufferViewImage( blob ) )
						.then( bufferViewIndex => {

							imageDef.bufferView = bufferViewIndex;

						} )

				);`;
    const ordered = `				const previousImageTask = writer.__orderedImageTask || Promise.resolve();
				const imageTask = previousImageTask
					.then( () => getToBlobPromise( canvas, mimeType ) )
					.then( blob => writer.processBufferViewImage( blob ) )
					.then( bufferViewIndex => {

						imageDef.bufferView = bufferViewIndex;

					} );
				writer.__orderedImageTask = imageTask;
				pending.push( imageTask );`;
    const orderedForTest =
      injection === null
        ? ordered
        : ordered.replace(
            "				const imageTask = previousImageTask",
            `${injection}\n				const imageTask = previousImageTask`,
          );
    if (injection !== null && orderedForTest === ordered) {
      throw new Error("ordered-image injection anchor missing");
    }
    const at = source.indexOf(unordered);
    if (at < 0 || source.indexOf(unordered, at + unordered.length) >= 0) {
      throw new Error("GLTFExporter ordered-image anchor missing or ambiguous");
    }
    const exporterModule = join(directory, "GLTFExporter.js");
    const entry = join(directory, "entry.js");
    const bundle = join(directory, "bundle.js");
    const modelPreparation = join(ROOT, "apps/web/src/city/three/modelPreparation.ts");
    const worldLayout = join(ROOT, "apps/web/src/city/worldLayout.ts");
    await writeFile(
      exporterModule,
      `${source.slice(0, at)}${orderedForTest}${source.slice(at + unordered.length)}`,
      "utf8",
    );
    await writeFile(
      entry,
      [
        'import * as THREE from "three";',
        'import { GLTFExporter } from "./GLTFExporter.js";',
        'import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";',
        'import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";',
        `import { prepareGridworkModel, PLACED_PREPARATION } from ${JSON.stringify(modelPreparation)};`,
        `import { footprintFitScale, GRID_CELL, MAX_BUILD_HEIGHT } from ${JSON.stringify(worldLayout)};`,
        BROWSER_SHA256_SOURCE,
        `globalThis.__gridworkBundle={THREE,GLTFExporter,GLTFLoader,mergeGeometries,prepareGridworkModel,PLACED_PREPARATION,footprintFitScale,GRID_CELL,MAX_BUILD_HEIGHT,sha256Hex:gridworkSha256Hex,installedExporterSha256:${JSON.stringify(installedExporterSha256)}};`,
      ].join("\n"),
      "utf8",
    );
    const esbuild = join(ROOT, "node_modules/esbuild/bin/esbuild");
    await execFileAsync(
      process.execPath,
      [
        esbuild,
        entry,
        "--bundle",
        "--format=iife",
        `--outfile=${bundle}`,
        "--log-level=warning",
      ],
      { env: { ...process.env, NODE_PATH: join(ROOT, "node_modules") } },
    );
    if (!Buffer.from(await readFile(installed)).equals(before)) {
      throw new Error("installed GLTFExporter changed");
    }
    handedOff = true;
    return {
      path: bundle,
      installedExporterSha256,
      dispose: () => rm(directory, { recursive: true, force: true }),
    };
  } finally {
    if (!handedOff) await rm(directory, { recursive: true, force: true });
  }
}

function requireFromRoot(specifier) {
  const { createRequire } = process.getBuiltinModule("node:module");
  return createRequire(join(ROOT, "package.json"))(specifier);
}

function runtimeThree() {
  return requireFromRoot("three");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function triangleCount(geometry) {
  const count = geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0;
  if (count <= 0 || count % 3 !== 0) {
    throw new Error(`static geometry has a non-triangular element count: ${count}`);
  }
  return count / 3;
}

function assertMergeableGeometry(geometry) {
  if (Object.keys(geometry.morphAttributes ?? {}).length > 0) {
    throw new Error("static geometry cannot contain morph attributes");
  }
  if (geometry.morphTargetsRelative) {
    throw new Error("static geometry cannot use relative morph targets");
  }
  const elementCount =
    geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0;
  if (
    geometry.drawRange &&
    (geometry.drawRange.start !== 0 || geometry.drawRange.count < elementCount)
  ) {
    throw new Error("static geometry cannot use a partial draw range");
  }
  for (const attribute of Object.values(geometry.attributes)) {
    if (attribute.isInterleavedBufferAttribute || !attribute.array) {
      throw new Error("interleaved static geometry is unsupported");
    }
  }
}

function attributeSignature(attribute) {
  return {
    itemSize: attribute.itemSize,
    normalized: attribute.normalized,
    array: attribute.array?.constructor?.name ?? "none",
    usage: attribute.usage,
    gpuType: attribute.gpuType ?? null,
  };
}

function geometrySignature(geometry) {
  const attributes = {};
  for (const name of Object.keys(geometry.attributes).sort()) {
    attributes[name] = attributeSignature(geometry.getAttribute(name));
  }
  return stableJson({
    index: geometry.index === null ? null : attributeSignature(geometry.index),
    attributes,
    morphAttributes: Object.keys(geometry.morphAttributes ?? {}).sort(),
  });
}

function serializedMaterialSignature(material) {
  const textureIdentity = (texture) =>
    texture
      ? {
          uuid: texture.uuid,
          offset: texture.offset?.toArray(),
          repeat: texture.repeat?.toArray(),
          center: texture.center?.toArray(),
          rotation: texture.rotation,
          matrix: texture.matrix?.toArray(),
          wrapS: texture.wrapS,
          wrapT: texture.wrapT,
          minFilter: texture.minFilter,
          magFilter: texture.magFilter,
          anisotropy: texture.anisotropy,
          colorSpace: texture.colorSpace,
        }
      : null;
  return stableJson({
    type: material.type,
    color: material.color?.toArray(),
    opacity: material.opacity,
    transparent: Boolean(material.transparent),
    alphaTest: material.alphaTest,
    side: material.side,
    depthTest: Boolean(material.depthTest),
    depthWrite: Boolean(material.depthWrite),
    depthFunc: material.depthFunc,
    colorWrite: Boolean(material.colorWrite),
    blending: material.blending,
    blendSrc: material.blendSrc,
    blendDst: material.blendDst,
    blendEquation: material.blendEquation,
    blendSrcAlpha: material.blendSrcAlpha,
    blendDstAlpha: material.blendDstAlpha,
    blendEquationAlpha: material.blendEquationAlpha,
    premultipliedAlpha: Boolean(material.premultipliedAlpha),
    forceSinglePass: Boolean(material.forceSinglePass),
    polygonOffset: Boolean(material.polygonOffset),
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    toneMapped: Boolean(material.toneMapped),
    dithering: Boolean(material.dithering),
    flatShading: Boolean(material.flatShading),
    vertexColors: Boolean(material.vertexColors),
    fog: Boolean(material.fog),
    map: textureIdentity(material.map),
    gradientMap: textureIdentity(material.gradientMap),
  });
}

function mergeGeometryParts(parts) {
  if (parts.length === 1) return parts[0].geometry;
  const first = parts[0].geometry;
  const merged = first.clone();
  for (const name of Object.keys(merged.attributes)) merged.deleteAttribute(name);
  const attributeNames = Object.keys(first.attributes).sort();
  for (const name of attributeNames) {
    const samples = parts.map((part) => part.geometry.getAttribute(name));
    const totalLength = samples.reduce((sum, attribute) => sum + attribute.array.length, 0);
    const ArrayType = samples[0].array.constructor;
    const array = new ArrayType(totalLength);
    let offset = 0;
    for (const attribute of samples) {
      array.set(attribute.array, offset);
      offset += attribute.array.length;
    }
    const AttributeType = samples[0].constructor;
    const attribute = new AttributeType(array, samples[0].itemSize, samples[0].normalized);
    attribute.setUsage(samples[0].usage);
    if ("gpuType" in samples[0]) attribute.gpuType = samples[0].gpuType;
    merged.setAttribute(name, attribute);
  }
  if (first.index) {
    const vertexCounts = parts.map((part) => part.geometry.getAttribute("position").count);
    const totalVertices = vertexCounts.reduce((sum, count) => sum + count, 0);
    const IndexArray =
      totalVertices > 65_535 || first.index.array instanceof Uint32Array
        ? Uint32Array
        : Uint16Array;
    const totalIndices = parts.reduce((sum, part) => sum + part.geometry.index.count, 0);
    const indices = new IndexArray(totalIndices);
    let indexOffset = 0;
    let vertexOffset = 0;
    for (const [partIndex, part] of parts.entries()) {
      for (let index = 0; index < part.geometry.index.count; index += 1) {
        indices[indexOffset + index] = part.geometry.index.getX(index) + vertexOffset;
      }
      indexOffset += part.geometry.index.count;
      vertexOffset += vertexCounts[partIndex];
    }
    const IndexAttribute = first.index.constructor;
    const index = new IndexAttribute(indices, 1, first.index.normalized);
    index.setUsage(first.index.usage);
    merged.setIndex(index);
  } else {
    merged.setIndex(null);
  }
  merged.clearGroups();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function bakeAndBatchSourceGroup(group) {
  const THREE = runtimeThree();
  if (!group?.isObject3D) throw new Error("source group must be a Three Object3D");
  group.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3();
  const buckets = new Map();
  let sourceMeshes = 0;
  let sourceTriangles = 0;
  let meshOrdinal = 0;
  group.traverse((object) => {
    if (!object.visible) return;
    if (!object.isMesh) {
      if (object.isLine || object.isPoints || object.isSprite) {
        throw new Error("source group contains an unsupported renderable");
      }
      return;
    }
    if (object.isSkinnedMesh || object.isInstancedMesh) {
      throw new Error("source group contains non-static mesh geometry");
    }
    if (Array.isArray(object.material)) {
      throw new Error("source group contains a multi-material mesh");
    }
    assertMergeableGeometry(object.geometry);
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    geometry.clearGroups();
    if (object.material.map && !geometry.getAttribute("uv")) {
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.getAttribute("position").count * 2),
          2,
        ),
      );
    }
    geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
      throw new Error("source mesh has empty world-space bounds");
    }
    sourceBounds.union(geometry.boundingBox);
    sourceMeshes += 1;
    sourceTriangles += triangleCount(geometry);
    const transparent = object.material.transparent === true || object.material.opacity < 1;
    const key = stableJson({
      sourceMaterial: object.material.uuid,
      material: serializedMaterialSignature(object.material),
      geometry: geometrySignature(geometry),
      renderOrder: object.renderOrder,
      opaqueOrder: transparent ? `transparent-${meshOrdinal}` : "opaque",
    });
    const part = {
      geometry,
      material: object.material,
      renderOrder: object.renderOrder,
      name: object.name,
      userData: structuredClone(object.userData ?? {}),
    };
    const bucket = buckets.get(key);
    if (bucket) bucket.push(part);
    else buckets.set(key, [part]);
    meshOrdinal += 1;
  });
  if (sourceMeshes === 0 || sourceBounds.isEmpty()) {
    throw new Error("source group produced no visible static meshes");
  }
  const root = new group.constructor();
  root.name = group.name ? `${group.name}-baked` : "gridwork-baked-root";
  for (const parts of buckets.values()) {
    const geometry = mergeGeometryParts(parts);
    const sourceMesh = group.getObjectByProperty?.("material", parts[0].material);
    const MeshType = sourceMesh?.constructor ?? runtimeThree().Mesh;
    const mesh = new MeshType(geometry, parts[0].material);
    mesh.name = parts[0].name;
    mesh.renderOrder = parts[0].renderOrder;
    mesh.userData = parts[0].userData;
    root.add(mesh);
  }
  root.updateMatrixWorld(true);
  const shippedBounds = new THREE.Box3().setFromObject(root);
  let shippedMeshes = 0;
  let shippedTriangles = 0;
  root.traverse((object) => {
    if (!object.isMesh) return;
    shippedMeshes += 1;
    shippedTriangles += triangleCount(object.geometry);
  });
  if (
    shippedMeshes > sourceMeshes ||
    shippedTriangles !== sourceTriangles ||
    !sourceBounds.min.equals(shippedBounds.min) ||
    !sourceBounds.max.equals(shippedBounds.max)
  ) {
    throw new Error("world-baked geometry changed mesh, triangle, or bounds invariants");
  }
  return {
    root,
    sourceMeshes,
    shippedMeshes,
    sourceTriangles,
    shippedTriangles,
    sourceBounds,
    shippedBounds,
  };
}

const ENUM_GROUPS = Object.freeze({
  side: ["FrontSide", "BackSide", "DoubleSide"],
  depth: [
    "NeverDepth",
    "AlwaysDepth",
    "LessDepth",
    "LessEqualDepth",
    "EqualDepth",
    "GreaterEqualDepth",
    "GreaterDepth",
    "NotEqualDepth",
  ],
  blending: [
    "NoBlending",
    "NormalBlending",
    "AdditiveBlending",
    "SubtractiveBlending",
    "MultiplyBlending",
    "CustomBlending",
  ],
  blendFactor: [
    "ZeroFactor",
    "OneFactor",
    "SrcColorFactor",
    "OneMinusSrcColorFactor",
    "SrcAlphaFactor",
    "OneMinusSrcAlphaFactor",
    "DstAlphaFactor",
    "OneMinusDstAlphaFactor",
    "DstColorFactor",
    "OneMinusDstColorFactor",
    "SrcAlphaSaturateFactor",
    "ConstantColorFactor",
    "OneMinusConstantColorFactor",
    "ConstantAlphaFactor",
    "OneMinusConstantAlphaFactor",
  ],
  blendEquation: [
    "AddEquation",
    "SubtractEquation",
    "ReverseSubtractEquation",
    "MinEquation",
    "MaxEquation",
  ],
  wrapping: ["RepeatWrapping", "ClampToEdgeWrapping", "MirroredRepeatWrapping"],
  filter: [
    "NearestFilter",
    "NearestMipmapNearestFilter",
    "NearestMipmapLinearFilter",
    "LinearFilter",
    "LinearMipmapNearestFilter",
    "LinearMipmapLinearFilter",
  ],
  format: [
    "AlphaFormat",
    "RedFormat",
    "RedIntegerFormat",
    "RGFormat",
    "RGIntegerFormat",
    "RGBAFormat",
    "RGBAIntegerFormat",
    "DepthFormat",
    "DepthStencilFormat",
  ],
  type: [
    "UnsignedByteType",
    "ByteType",
    "ShortType",
    "UnsignedShortType",
    "IntType",
    "UnsignedIntType",
    "FloatType",
    "HalfFloatType",
    "UnsignedShort4444Type",
    "UnsignedShort5551Type",
    "UnsignedInt248Type",
  ],
});

function enumName(THREE, value, group, field) {
  for (const name of ENUM_GROUPS[group]) {
    if (THREE[name] === value) return name;
  }
  throw new Error(`unsupported ${field} value ${String(value)}`);
}

function nullableEnumName(THREE, value, group, field) {
  return value === null || value === undefined
    ? null
    : enumName(THREE, value, group, field);
}

function texturePixelFingerprint(texture) {
  const image = texture.image;
  if (
    !Number.isSafeInteger(image?.width) ||
    image.width <= 0 ||
    !Number.isSafeInteger(image?.height) ||
    image.height <= 0 ||
    typeof image.getContext !== "function"
  ) {
    throw new Error("base-map source pixels are unavailable");
  }
  const source = image
    .getContext("2d", { willReadFrequently: true })
    ?.getImageData(0, 0, image.width, image.height).data;
  if (source?.length !== image.width * image.height * 4) {
    throw new Error("base-map source RGBA pixels are incoherent");
  }
  const encoded = new Uint8Array(source.length);
  const rowBytes = image.width * 4;
  for (let row = 0; row < image.height; row += 1) {
    const sourceRow = texture.flipY ? image.height - row - 1 : row;
    encoded.set(
      source.subarray(sourceRow * rowBytes, (sourceRow + 1) * rowBytes),
      row * rowBytes,
    );
  }
  const digest = createHash("sha256").update(encoded).digest("hex");
  return `rgba8:${image.width}x${image.height}:${digest}`;
}

function captureTextureRecord(THREE, texture, sourceTextureKey) {
  texture.updateMatrix();
  return {
    slot: "baseColor",
    sourceTextureKey,
    imageFingerprint: texturePixelFingerprint(texture),
    offset: texture.offset.toArray(),
    repeat: texture.repeat.toArray(),
    center: texture.center.toArray(),
    rotation: texture.rotation,
    matrix: texture.matrix.toArray(),
    matrixAutoUpdate: texture.matrixAutoUpdate,
    wrapS: enumName(THREE, texture.wrapS, "wrapping", "texture wrapS"),
    wrapT: enumName(THREE, texture.wrapT, "wrapping", "texture wrapT"),
    minFilter: enumName(THREE, texture.minFilter, "filter", "texture minFilter"),
    magFilter: enumName(THREE, texture.magFilter, "filter", "texture magFilter"),
    anisotropyRequested: texture.anisotropy,
    generateMipmaps: texture.generateMipmaps,
    flipY: texture.flipY,
    premultiplyAlpha: texture.premultiplyAlpha,
    unpackAlignment: texture.unpackAlignment,
    colorSpace: texture.colorSpace,
  };
}

function captureGradientRecord(THREE, gradient) {
  if (!gradient?.isCanvasTexture) {
    throw new Error("toon gradient must be a CanvasTexture");
  }
  const image = gradient.image;
  if (image?.width !== 3 || image?.height !== 1 || typeof image.getContext !== "function") {
    throw new Error("toon gradient must expose one 3x1 canvas");
  }
  const data = image
    .getContext("2d", { willReadFrequently: true })
    ?.getImageData(0, 0, 3, 1).data;
  if (data?.length !== 12) throw new Error("toon gradient RGBA texels are unavailable");
  return {
    width: 3,
    height: 1,
    channels: 4,
    channelInterpretation: "RGBA8_UNORM",
    texels: [
      Array.from(data.slice(0, 4)),
      Array.from(data.slice(4, 8)),
      Array.from(data.slice(8, 12)),
    ],
    sourceObjectType: "CanvasTexture",
    runtimeObjectType: "DataTexture",
    format: enumName(THREE, gradient.format, "format", "gradient format"),
    type: enumName(THREE, gradient.type, "type", "gradient type"),
    minFilter: enumName(THREE, gradient.minFilter, "filter", "gradient minFilter"),
    magFilter: enumName(THREE, gradient.magFilter, "filter", "gradient magFilter"),
    wrapS: enumName(THREE, gradient.wrapS, "wrapping", "gradient wrapS"),
    wrapT: enumName(THREE, gradient.wrapT, "wrapping", "gradient wrapT"),
    generateMipmaps: gradient.generateMipmaps,
    flipY: gradient.flipY,
    premultiplyAlpha: gradient.premultiplyAlpha,
    unpackAlignment: gradient.unpackAlignment,
    colorSpace: gradient.colorSpace,
  };
}

function captureRenderRecord(THREE, material) {
  return {
    opacity: material.opacity,
    transparent: material.transparent,
    alphaTest: material.alphaTest,
    side: enumName(THREE, material.side, "side", "material side"),
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    depthFunc: enumName(THREE, material.depthFunc, "depth", "material depthFunc"),
    colorWrite: material.colorWrite,
    blending: enumName(THREE, material.blending, "blending", "material blending"),
    blendSrc: enumName(THREE, material.blendSrc, "blendFactor", "material blendSrc"),
    blendDst: enumName(THREE, material.blendDst, "blendFactor", "material blendDst"),
    blendEquation: enumName(
      THREE,
      material.blendEquation,
      "blendEquation",
      "material blendEquation",
    ),
    blendSrcAlpha: nullableEnumName(
      THREE,
      material.blendSrcAlpha,
      "blendFactor",
      "material blendSrcAlpha",
    ),
    blendDstAlpha: nullableEnumName(
      THREE,
      material.blendDstAlpha,
      "blendFactor",
      "material blendDstAlpha",
    ),
    blendEquationAlpha: nullableEnumName(
      THREE,
      material.blendEquationAlpha,
      "blendEquation",
      "material blendEquationAlpha",
    ),
    premultipliedAlpha: material.premultipliedAlpha,
    forceSinglePass: material.forceSinglePass,
    polygonOffset: material.polygonOffset,
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    toneMapped: material.toneMapped,
    dithering: material.dithering,
    flatShading: material.flatShading,
    vertexColors: material.vertexColors,
    fog: material.fog,
  };
}

function copyTransportRenderFields(transport, source) {
  for (const field of [
    "opacity",
    "transparent",
    "alphaTest",
    "side",
    "depthTest",
    "depthWrite",
    "depthFunc",
    "colorWrite",
    "blending",
    "blendSrc",
    "blendDst",
    "blendEquation",
    "blendSrcAlpha",
    "blendDstAlpha",
    "blendEquationAlpha",
    "premultipliedAlpha",
    "forceSinglePass",
    "polygonOffset",
    "polygonOffsetFactor",
    "polygonOffsetUnits",
    "toneMapped",
    "dithering",
    "flatShading",
    "vertexColors",
    "fog",
  ]) {
    if (field in transport) transport[field] = source[field];
  }
}

function assertSupportedMaterialSemantics(THREE, material, sourceMaterialKey) {
  const unsupported = [];
  for (const slot of [
    "alphaMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "lightMap",
    "normalMap",
    "specularMap",
  ]) {
    if (material[slot]) unsupported.push(slot);
  }
  if (material.wireframe === true) unsupported.push("wireframe");
  if (material.visible === false) unsupported.push("visible");
  if (material.alphaHash === true) unsupported.push("alphaHash");
  if (material.alphaToCoverage === true) unsupported.push("alphaToCoverage");
  if (material.stencilWrite === true) unsupported.push("stencilWrite");
  if (material.clippingPlanes?.length) unsupported.push("clippingPlanes");
  if (material.clipIntersection === true) unsupported.push("clipIntersection");
  if (material.clipShadows === true) unsupported.push("clipShadows");
  if (material.precision !== null && material.precision !== undefined) {
    unsupported.push("precision");
  }
  if (material.blendColor && material.blendColor.getHex() !== 0) {
    unsupported.push("blendColor");
  }
  if (material.blendAlpha !== 0) unsupported.push("blendAlpha");
  if (material.emissive && material.emissive.getHex() !== 0) unsupported.push("emissive");
  if (material.emissiveIntensity !== undefined && material.emissiveIntensity !== 1) {
    unsupported.push("emissiveIntensity");
  }
  if (Object.hasOwn(material, "onBeforeCompile")) unsupported.push("onBeforeCompile");
  if (Object.keys(material.userData ?? {}).length > 0) unsupported.push("userData");
  for (const [slot, texture] of [
    ["map", material.map],
    ["gradientMap", material.gradientMap],
  ]) {
    if (!texture) continue;
    if (texture.channel !== 0) unsupported.push(`${slot}.channel`);
    if (texture.mapping !== THREE.UVMapping) unsupported.push(`${slot}.mapping`);
    if (texture.compareFunction !== null && texture.compareFunction !== undefined) {
      unsupported.push(`${slot}.compareFunction`);
    }
  }
  if (unsupported.length > 0) {
    throw new Error(
      `${sourceMaterialKey} has unsupported non-default render fields: ${unsupported.join(", ")}`,
    );
  }
}

function captureMaterial(THREE, material, sourceMaterialKey, textureKeys) {
  if (!material?.isMeshToonMaterial && !material?.isMeshBasicMaterial) {
    throw new Error(`unsupported source material ${material?.type ?? "unknown"}`);
  }
  assertSupportedMaterialSemantics(THREE, material, sourceMaterialKey);
  const kind = material.isMeshToonMaterial ? "toon" : "unlit";
  if (kind === "toon" && !material.gradientMap) {
    throw new Error(`toon material ${sourceMaterialKey} has no gradient map`);
  }
  let baseMap = null;
  if (material.map) {
    if (!textureKeys.has(material.map)) {
      textureKeys.set(material.map, `texture-${String(textureKeys.size).padStart(3, "0")}`);
    }
    const sourceTextureKey = textureKeys.get(material.map);
    material.map.name = sourceTextureKey;
    baseMap = captureTextureRecord(THREE, material.map, sourceTextureKey);
  }
  const record = {
    schema: 1,
    kind,
    sourceMaterialKey,
    color: material.color.toArray(),
    baseMap,
    gradient: kind === "toon" ? captureGradientRecord(THREE, material.gradientMap) : null,
    render: captureRenderRecord(THREE, material),
  };
  const transport =
    kind === "toon"
      ? new THREE.MeshStandardMaterial({
          color: material.color.clone(),
          map: material.map,
          roughness: 1,
          metalness: 0,
        })
      : new THREE.MeshBasicMaterial({
          color: material.color.clone(),
          map: material.map,
        });
  copyTransportRenderFields(transport, material);
  transport.name = `${sourceMaterialKey}-${kind}-transport`;
  transport.userData.gridworkMaterial = record;
  return { record, transport };
}

export function captureGridworkSemantics(baked, job, sourceSha256) {
  const THREE = runtimeThree();
  if (!baked?.root?.isGroup) throw new Error("semantic capture requires a baked Group");
  const scene = new THREE.Scene();
  scene.userData.gridworkLateEraAsset = {
    schema: 1,
    sourceSha256,
    era: job.runtimeEra,
    sourceKey: job.definition,
    stage: job.stage,
    basename: job.seedInput,
  };
  const transports = new Map();
  const textureKeys = new Map();
  let toonMaterials = 0;
  let unlitMaterials = 0;
  let baseMaps = 0;
  let nonDefaultRenderOrders = 0;
  baked.root.traverse((object) => {
    if (!object.isMesh) return;
    if (!transports.has(object.material)) {
      const captured = captureMaterial(
        THREE,
        object.material,
        `material-${String(transports.size).padStart(3, "0")}`,
        textureKeys,
      );
      transports.set(object.material, captured.transport);
      if (captured.record.kind === "toon") toonMaterials += 1;
      else unlitMaterials += 1;
      if (captured.record.baseMap) baseMaps += 1;
    }
    object.material = transports.get(object.material);
    if (object.renderOrder !== 0) {
      if (!Number.isSafeInteger(object.renderOrder)) {
        throw new Error("non-default render order must be a safe integer");
      }
      object.userData.gridworkRenderOrder = object.renderOrder;
      nonDefaultRenderOrders += 1;
    }
  });
  for (const child of [...baked.root.children]) scene.add(child);
  scene.updateMatrixWorld(true);
  return {
    scene,
    toonMaterials,
    unlitMaterials,
    baseMaps,
    nonDefaultRenderOrders,
  };
}

function manifestBlock(html) {
  const marker = '<script type="__bundler/manifest">';
  const first = html.indexOf(marker);
  const second = first < 0 ? -1 : html.indexOf(marker, first + marker.length);
  if (first < 0 || second >= 0)
    throw new Error("expected exactly one __bundler/manifest block");
  const start = first + marker.length;
  const end = html.indexOf("</script>", start);
  if (end < 0) throw new Error("unterminated __bundler/manifest block");
  return html.slice(start, end).trim();
}

export function extractKitSources(bytes) {
  assertCanonicalSource(bytes);
  const manifest = JSON.parse(manifestBlock(Buffer.from(bytes).toString("utf8")));
  if (Object.keys(manifest).length !== SOURCE_CONTRACT.manifestCount) {
    throw new Error(`expected ${SOURCE_CONTRACT.manifestCount} manifest resources`);
  }
  const result = {};
  for (const era of ["atomic_age", "information_age", "cyberpunk"]) {
    const id = SOURCE_CONTRACT.resources[era];
    const entry = manifest[id];
    if (!entry?.compressed || !/javascript/.test(entry.mime)) {
      throw new Error(`${era} source resource ${id} is unavailable`);
    }
    const text = gunzipSync(Buffer.from(entry.data, "base64")).toString("utf8");
    if (Buffer.byteLength(text) !== SOURCE_CONTRACT.decodedKitBytes[era]) {
      throw new Error(`${era} decoded source byte count changed`);
    }
    const plan = planFor(era);
    if (!text.includes(`window.${plan.kitName}`))
      throw new Error(`${era} kit constructor is absent`);
    result[era] = text;
  }
  return Object.freeze({
    ...result,
    decodedBytes: Object.freeze({ ...SOURCE_CONTRACT.decodedKitBytes }),
  });
}

async function installModernThree(page) {
  const bundle = await readFile(MODERN_THREE, "utf8");
  await page.addScriptTag({
    content: `var exports = {};\n${bundle}\nwindow.THREE = exports;`,
  });
}

export async function installLegacyEncodingFacade(page, buildContext) {
  await page.evaluate((context) => {
    /** @type {import("../apps/web/src/city/era8To10ExporterTestTypes").ExportRealm} */
    const realm = window;
    const T = realm.THREE;
    if (!T) throw new Error(`no modern THREE installed for ${context}`);
    if (window.__era8To10LegacyEncodingFacade)
      throw new Error("legacy encoding facade already installed");
    const token = Symbol("r128-sRGBEncoding");
    const namespace = Object.getOwnPropertyDescriptor(T, "sRGBEncoding");
    const prototype = Object.getOwnPropertyDescriptor(T.Texture.prototype, "encoding");
    Object.defineProperty(T, "sRGBEncoding", { configurable: true, value: token });
    Object.defineProperty(T.Texture.prototype, "encoding", {
      configurable: true,
      get() {
        return this.colorSpace === T.SRGBColorSpace ? token : undefined;
      },
      set(value) {
        if (value === token) {
          this.colorSpace = T.SRGBColorSpace;
          window.__era8To10LegacyEncodingFacade.acceptedAssignments += 1;
          return;
        }
        window.__era8To10LegacyEncodingFacade.unsupportedAssignments += 1;
        throw new Error(`unsupported legacy texture encoding in ${context}`);
      },
    });
    window.__era8To10LegacyEncodingFacade = {
      namespace,
      prototype,
      acceptedAssignments: 0,
      unsupportedAssignments: 0,
    };
  }, buildContext);
}

export async function removeLegacyEncodingFacade(page) {
  await page.evaluate(() => {
    const state = window.__era8To10LegacyEncodingFacade;
    if (!state) throw new Error("legacy encoding facade is not installed");
    const T = window.THREE;
    if (state.namespace) Object.defineProperty(T, "sRGBEncoding", state.namespace);
    else delete T.sRGBEncoding;
    if (state.prototype)
      Object.defineProperty(T.Texture.prototype, "encoding", state.prototype);
    else delete T.Texture.prototype.encoding;
    delete window.__era8To10LegacyEncodingFacade;
  });
}

export async function evaluateKit(page, era, options = { prerequisites: true }) {
  const source = extractKitSources(await readFile(SOURCE));
  const plan = planFor(era);
  if (options.prerequisites) {
    for (const kitName of plan.prerequisites) {
      const prerequisite = ERA_PLANS.find((candidate) => candidate.kitName === kitName);
      if (!prerequisite) throw new Error(`${kitName} has no declared source`);
      await page.addScriptTag({ content: source[prerequisite.era] });
    }
  }
  await page.addScriptTag({ content: source[era] });
}

async function ensureExportPage(page, kitSources) {
  const state = await page.evaluate(() => {
    const bundle = globalThis.__gridworkBundle;
    if (
      !bundle?.THREE ||
      !bundle.GLTFExporter ||
      !bundle.GLTFLoader ||
      !bundle.mergeGeometries ||
      !bundle.sha256Hex
    ) {
      throw new Error("disposable Three export bundle is not installed");
    }
    if (globalThis.THREE && globalThis.THREE !== bundle.THREE) {
      throw new Error("page already contains a different Three namespace");
    }
    globalThis.THREE = bundle.THREE;
    return {
      facade: Boolean(globalThis.__era8To10LegacyEncodingFacade),
      atomic: typeof globalThis.Era8Kit === "function",
      information: typeof globalThis.Era9Kit === "function",
      cyberpunk: typeof globalThis.Era10Kit === "function",
      installedExporterSha256: bundle.installedExporterSha256,
    };
  });
  if (!state.facade) await installLegacyEncodingFacade(page, "late-era export");
  if (!state.atomic) await page.addScriptTag({ content: kitSources.atomic_age });
  if (!state.information) await page.addScriptTag({ content: kitSources.information_age });
  if (!state.cyberpunk) await page.addScriptTag({ content: kitSources.cyberpunk });
  return state;
}

function expectedAssetTag(job) {
  return {
    schema: 1,
    sourceSha256: SOURCE_CONTRACT.sha256,
    era: job.runtimeEra,
    sourceKey: job.definition,
    stage: job.stage,
    basename: job.seedInput,
  };
}

export async function validateGlbWithLoader(page, bytes, job) {
  const parsed = parseGlb(bytes);
  const images = (parsed.json.images ?? []).map((image, index) => {
    const payload = embeddedImageBytes(
      parsed.json,
      parsed.binary,
      image,
      `${job.seedInput} image ${index}`,
    );
    return {
      index,
      mimeType: payload.mimeType,
      encoded: Buffer.from(payload.bytes).toString("base64"),
    };
  });
  const formatNames = [
    ...new Set(
      images.map((image) => {
        if (image.mimeType === "image/png") return "PNG";
        if (image.mimeType === "image/jpeg") return "JPEG";
        if (image.mimeType === "image/webp") return "WebP";
        return "unknown image";
      }),
    ),
  ];
  let loaded;
  try {
    loaded = await page.evaluate(
      async ({ encoded, images }) => {
        const realm = globalThis;
        const bundle = realm.__gridworkBundle;
        if (!bundle?.GLTFLoader || !bundle.sha256Hex) {
          throw new Error("disposable GLTFLoader/image fingerprint support is unavailable");
        }
        const decodedImages = [];
        for (const image of images) {
          const binary = atob(image.encoded);
          const payload = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) {
            payload[index] = binary.charCodeAt(index);
          }
          let bitmap;
          try {
            bitmap = await createImageBitmap(new Blob([payload], { type: image.mimeType }));
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const context = canvas.getContext("2d", {
              willReadFrequently: true,
            });
            if (!context) throw new Error("2D decode context unavailable");
            context.drawImage(bitmap, 0, 0);
            const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
            decodedImages.push({
              index: image.index,
              fingerprint: `rgba8:${bitmap.width}x${bitmap.height}:${bundle.sha256Hex(rgba)}`,
            });
          } catch (error) {
            throw new Error(
              `${image.mimeType} image ${image.index} failed native decode: ${String(error)}`,
            );
          } finally {
            bitmap?.close();
          }
        }
        const binary = atob(encoded);
        const input = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          input[index] = binary.charCodeAt(index);
        }
        const gltf = await new Promise((resolve, reject) => {
          new bundle.GLTFLoader().parse(input.buffer, "", resolve, reject);
        });
        return {
          rootIsGroup: gltf.scene.isGroup === true,
          tag: gltf.scene.userData.gridworkLateEraAsset ?? null,
          decodedImages,
        };
      },
      { encoded: Buffer.from(bytes).toString("base64"), images },
    );
  } catch (error) {
    throw new Error(
      `${formatNames.join("/") || "embedded image"} payload decode failed: ${String(error)}`,
    );
  }
  if (!loaded.rootIsGroup) {
    throw new Error(`${job.seedInput} loader root is not a Group`);
  }
  if (stableJson(loaded.tag) !== stableJson(expectedAssetTag(job))) {
    throw new Error(`${job.seedInput} loader-root Scene tag changed`);
  }
  const expectedImageIndexes = images.map(({ index }) => index);
  const decodedImageIndexes = loaded.decodedImages.map(({ index }) => index);
  if (stableJson(decodedImageIndexes) !== stableJson(expectedImageIndexes)) {
    throw new Error(
      `${job.seedInput} decoded image index set does not equal the complete embedded image set`,
    );
  }
  const fingerprintByImage = new Map(
    loaded.decodedImages.map(({ index, fingerprint }) => [index, fingerprint]),
  );
  for (const [index, material] of (parsed.json.materials ?? []).entries()) {
    const record = material.extras?.gridworkMaterial;
    if (!record?.baseMap) continue;
    const textureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index;
    const texture = parsed.json.textures?.[textureIndex];
    const imageIndex = textureImageIndex(texture);
    if (fingerprintByImage.get(imageIndex) !== record.baseMap.imageFingerprint) {
      throw new Error(
        `${job.seedInput} material ${index} texture source image fingerprint changed`,
      );
    }
  }
}

export async function exportOne(options) {
  const { job, page, kitSources, bare, installedExporterSha256 } = options;
  if (!/^[a-f0-9]{64}$/.test(installedExporterSha256)) {
    throw new Error("export requires the installed GLTFExporter SHA-256");
  }
  if (
    job.seedInput !== `${job.outputBasename}-${job.stage}` ||
    job.seed !== fnv1a32(job.seedInput) ||
    job.relativeFile !== job.outputPath ||
    !job.relativeFile.endsWith(`/${job.seedInput}.glb`)
  ) {
    throw new Error(
      `invalid export job seed/path contract for ${job.seedInput ?? "unknown"}`,
    );
  }
  const problems = [];
  const onConsole = (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      problems.push(`console ${message.type()}: ${message.text()}`);
    }
  };
  const onPageError = (error) => problems.push(`page error: ${String(error)}`);
  const onRequest = (request) => {
    if (!request.url().startsWith("blob:")) {
      problems.push(`unexpected request: ${request.url()}`);
    }
  };
  const onRequestFailed = (request) => {
    if (request.url().startsWith("blob:")) return;
    problems.push(
      `failed request: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
    );
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("request", onRequest);
  page.on("requestfailed", onRequestFailed);
  try {
    const exportPage = await ensureExportPage(page, kitSources);
    if (exportPage.installedExporterSha256 !== installedExporterSha256) {
      throw new Error("installed exporter hash handoff disagrees with disposable bundle");
    }
    const result = await page.evaluate(
      async (payload) => {
        const bundle = globalThis.__gridworkBundle;
        const T = bundle.THREE;
        const stable = (value) => {
          if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
          if (value && typeof value === "object") {
            return `{${Object.keys(value)
              .sort()
              .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
              .join(",")}}`;
          }
          return JSON.stringify(value);
        };
        const enumGroups = {
          side: ["FrontSide", "BackSide", "DoubleSide"],
          depth: [
            "NeverDepth",
            "AlwaysDepth",
            "LessDepth",
            "LessEqualDepth",
            "EqualDepth",
            "GreaterEqualDepth",
            "GreaterDepth",
            "NotEqualDepth",
          ],
          blending: [
            "NoBlending",
            "NormalBlending",
            "AdditiveBlending",
            "SubtractiveBlending",
            "MultiplyBlending",
            "CustomBlending",
          ],
          blendFactor: [
            "ZeroFactor",
            "OneFactor",
            "SrcColorFactor",
            "OneMinusSrcColorFactor",
            "SrcAlphaFactor",
            "OneMinusSrcAlphaFactor",
            "DstAlphaFactor",
            "OneMinusDstAlphaFactor",
            "DstColorFactor",
            "OneMinusDstColorFactor",
            "SrcAlphaSaturateFactor",
            "ConstantColorFactor",
            "OneMinusConstantColorFactor",
            "ConstantAlphaFactor",
            "OneMinusConstantAlphaFactor",
          ],
          blendEquation: [
            "AddEquation",
            "SubtractEquation",
            "ReverseSubtractEquation",
            "MinEquation",
            "MaxEquation",
          ],
          wrapping: ["RepeatWrapping", "ClampToEdgeWrapping", "MirroredRepeatWrapping"],
          filter: [
            "NearestFilter",
            "NearestMipmapNearestFilter",
            "NearestMipmapLinearFilter",
            "LinearFilter",
            "LinearMipmapNearestFilter",
            "LinearMipmapLinearFilter",
          ],
          format: [
            "AlphaFormat",
            "RedFormat",
            "RedIntegerFormat",
            "RGFormat",
            "RGIntegerFormat",
            "RGBAFormat",
            "RGBAIntegerFormat",
            "DepthFormat",
            "DepthStencilFormat",
          ],
          type: [
            "UnsignedByteType",
            "ByteType",
            "ShortType",
            "UnsignedShortType",
            "IntType",
            "UnsignedIntType",
            "FloatType",
            "HalfFloatType",
            "UnsignedShort4444Type",
            "UnsignedShort5551Type",
            "UnsignedInt248Type",
          ],
        };
        const enumName = (value, group, field) => {
          for (const name of enumGroups[group]) {
            if (T[name] === value) return name;
          }
          throw new Error(`unsupported ${field} value ${String(value)}`);
        };
        const nullableEnumName = (value, group, field) =>
          value === null || value === undefined ? null : enumName(value, group, field);
        const sourceTextureKeys = new Map();
        const imageFingerprint = (texture) => {
          const image = texture.image;
          if (
            !Number.isSafeInteger(image?.width) ||
            image.width <= 0 ||
            !Number.isSafeInteger(image?.height) ||
            image.height <= 0 ||
            typeof image.getContext !== "function"
          ) {
            throw new Error("base-map source pixels are unavailable");
          }
          const source = image
            .getContext("2d", { willReadFrequently: true })
            ?.getImageData(0, 0, image.width, image.height).data;
          if (source?.length !== image.width * image.height * 4) {
            throw new Error("base-map source RGBA pixels are incoherent");
          }
          const encoded = new Uint8Array(source.length);
          const rowBytes = image.width * 4;
          for (let row = 0; row < image.height; row += 1) {
            const sourceRow = texture.flipY ? image.height - row - 1 : row;
            encoded.set(
              source.subarray(sourceRow * rowBytes, (sourceRow + 1) * rowBytes),
              row * rowBytes,
            );
          }
          return `rgba8:${image.width}x${image.height}:${bundle.sha256Hex(encoded)}`;
        };
        const textureRecord = (texture, sourceTextureKey) => {
          texture.updateMatrix();
          return {
            slot: "baseColor",
            sourceTextureKey,
            imageFingerprint: imageFingerprint(texture),
            offset: texture.offset.toArray(),
            repeat: texture.repeat.toArray(),
            center: texture.center.toArray(),
            rotation: texture.rotation,
            matrix: texture.matrix.toArray(),
            matrixAutoUpdate: texture.matrixAutoUpdate,
            wrapS: enumName(texture.wrapS, "wrapping", "texture wrapS"),
            wrapT: enumName(texture.wrapT, "wrapping", "texture wrapT"),
            minFilter: enumName(texture.minFilter, "filter", "texture minFilter"),
            magFilter: enumName(texture.magFilter, "filter", "texture magFilter"),
            anisotropyRequested: texture.anisotropy,
            generateMipmaps: texture.generateMipmaps,
            flipY: texture.flipY,
            premultiplyAlpha: texture.premultiplyAlpha,
            unpackAlignment: texture.unpackAlignment,
            colorSpace: texture.colorSpace,
          };
        };
        const gradientRecord = (gradient) => {
          if (!gradient?.isCanvasTexture)
            throw new Error("toon gradient must be a CanvasTexture");
          const image = gradient.image;
          if (
            image?.width !== 3 ||
            image?.height !== 1 ||
            typeof image.getContext !== "function"
          ) {
            throw new Error("toon gradient must expose one 3x1 canvas");
          }
          const data = image
            .getContext("2d", { willReadFrequently: true })
            ?.getImageData(0, 0, 3, 1).data;
          if (data?.length !== 12) {
            throw new Error("toon gradient RGBA texels are unavailable");
          }
          return {
            width: 3,
            height: 1,
            channels: 4,
            channelInterpretation: "RGBA8_UNORM",
            texels: [
              Array.from(data.slice(0, 4)),
              Array.from(data.slice(4, 8)),
              Array.from(data.slice(8, 12)),
            ],
            sourceObjectType: "CanvasTexture",
            runtimeObjectType: "DataTexture",
            format: enumName(gradient.format, "format", "gradient format"),
            type: enumName(gradient.type, "type", "gradient type"),
            minFilter: enumName(gradient.minFilter, "filter", "gradient minFilter"),
            magFilter: enumName(gradient.magFilter, "filter", "gradient magFilter"),
            wrapS: enumName(gradient.wrapS, "wrapping", "gradient wrapS"),
            wrapT: enumName(gradient.wrapT, "wrapping", "gradient wrapT"),
            generateMipmaps: gradient.generateMipmaps,
            flipY: gradient.flipY,
            premultiplyAlpha: gradient.premultiplyAlpha,
            unpackAlignment: gradient.unpackAlignment,
            colorSpace: gradient.colorSpace,
          };
        };
        const renderRecord = (material) => ({
          opacity: material.opacity,
          transparent: Boolean(material.transparent),
          alphaTest: material.alphaTest,
          side: enumName(material.side, "side", "material side"),
          depthTest: Boolean(material.depthTest),
          depthWrite: Boolean(material.depthWrite),
          depthFunc: enumName(material.depthFunc, "depth", "material depthFunc"),
          colorWrite: Boolean(material.colorWrite),
          blending: enumName(material.blending, "blending", "material blending"),
          blendSrc: enumName(material.blendSrc, "blendFactor", "material blendSrc"),
          blendDst: enumName(material.blendDst, "blendFactor", "material blendDst"),
          blendEquation: enumName(
            material.blendEquation,
            "blendEquation",
            "material blendEquation",
          ),
          blendSrcAlpha: nullableEnumName(
            material.blendSrcAlpha,
            "blendFactor",
            "material blendSrcAlpha",
          ),
          blendDstAlpha: nullableEnumName(
            material.blendDstAlpha,
            "blendFactor",
            "material blendDstAlpha",
          ),
          blendEquationAlpha: nullableEnumName(
            material.blendEquationAlpha,
            "blendEquation",
            "material blendEquationAlpha",
          ),
          premultipliedAlpha: Boolean(material.premultipliedAlpha),
          forceSinglePass: Boolean(material.forceSinglePass),
          polygonOffset: Boolean(material.polygonOffset),
          polygonOffsetFactor: material.polygonOffsetFactor,
          polygonOffsetUnits: material.polygonOffsetUnits,
          toneMapped: Boolean(material.toneMapped),
          dithering: Boolean(material.dithering),
          flatShading: Boolean(material.flatShading),
          vertexColors: Boolean(material.vertexColors),
          fog: Boolean(material.fog),
        });
        const copyRender = (transport, source) => {
          for (const field of [
            "opacity",
            "transparent",
            "alphaTest",
            "side",
            "depthTest",
            "depthWrite",
            "depthFunc",
            "colorWrite",
            "blending",
            "blendSrc",
            "blendDst",
            "blendEquation",
            "blendSrcAlpha",
            "blendDstAlpha",
            "blendEquationAlpha",
            "premultipliedAlpha",
            "forceSinglePass",
            "polygonOffset",
            "polygonOffsetFactor",
            "polygonOffsetUnits",
            "toneMapped",
            "dithering",
            "flatShading",
            "vertexColors",
            "fog",
          ]) {
            if (field in transport) transport[field] = source[field];
          }
        };
        const assertSupportedMaterial = (material, sourceMaterialKey) => {
          const unsupported = [];
          for (const slot of [
            "alphaMap",
            "aoMap",
            "bumpMap",
            "displacementMap",
            "emissiveMap",
            "envMap",
            "lightMap",
            "normalMap",
            "specularMap",
          ]) {
            if (material[slot]) unsupported.push(slot);
          }
          if (material.wireframe === true) unsupported.push("wireframe");
          if (material.visible === false) unsupported.push("visible");
          if (material.alphaHash === true) unsupported.push("alphaHash");
          if (material.alphaToCoverage === true) unsupported.push("alphaToCoverage");
          if (material.stencilWrite === true) unsupported.push("stencilWrite");
          if (material.clippingPlanes?.length) unsupported.push("clippingPlanes");
          if (material.clipIntersection === true) unsupported.push("clipIntersection");
          if (material.clipShadows === true) unsupported.push("clipShadows");
          if (material.precision !== null && material.precision !== undefined) {
            unsupported.push("precision");
          }
          if (material.blendColor && material.blendColor.getHex() !== 0) {
            unsupported.push("blendColor");
          }
          if (material.blendAlpha !== 0) unsupported.push("blendAlpha");
          if (material.emissive && material.emissive.getHex() !== 0) {
            unsupported.push("emissive");
          }
          if (
            material.emissiveIntensity !== undefined &&
            material.emissiveIntensity !== 1
          ) {
            unsupported.push("emissiveIntensity");
          }
          if (Object.hasOwn(material, "onBeforeCompile"))
            unsupported.push("onBeforeCompile");
          if (Object.keys(material.userData ?? {}).length > 0) unsupported.push("userData");
          for (const [slot, texture] of [
            ["map", material.map],
            ["gradientMap", material.gradientMap],
          ]) {
            if (!texture) continue;
            if (texture.channel !== 0) unsupported.push(`${slot}.channel`);
            if (texture.mapping !== T.UVMapping) unsupported.push(`${slot}.mapping`);
            if (texture.compareFunction !== null && texture.compareFunction !== undefined) {
              unsupported.push(`${slot}.compareFunction`);
            }
          }
          if (unsupported.length > 0) {
            throw new Error(
              `${sourceMaterialKey} has unsupported non-default render fields: ${unsupported.join(", ")}`,
            );
          }
        };
        const captureMaterial = (material, sourceMaterialKey) => {
          if (!material?.isMeshToonMaterial && !material?.isMeshBasicMaterial) {
            throw new Error(`unsupported source material ${material?.type ?? "unknown"}`);
          }
          assertSupportedMaterial(material, sourceMaterialKey);
          const kind = material.isMeshToonMaterial ? "toon" : "unlit";
          if (kind === "toon" && !material.gradientMap) {
            throw new Error(`toon material ${sourceMaterialKey} has no gradient map`);
          }
          let baseMap = null;
          if (material.map) {
            if (!sourceTextureKeys.has(material.map)) {
              sourceTextureKeys.set(
                material.map,
                `texture-${String(sourceTextureKeys.size).padStart(3, "0")}`,
              );
            }
            const sourceTextureKey = sourceTextureKeys.get(material.map);
            material.map.name = sourceTextureKey;
            baseMap = textureRecord(material.map, sourceTextureKey);
          }
          const record = {
            schema: 1,
            kind,
            sourceMaterialKey,
            color: material.color.toArray(),
            baseMap,
            gradient: kind === "toon" ? gradientRecord(material.gradientMap) : null,
            render: renderRecord(material),
          };
          const transport =
            kind === "toon"
              ? new T.MeshStandardMaterial({
                  color: material.color.clone(),
                  map: material.map,
                  roughness: 1,
                  metalness: 0,
                })
              : new T.MeshBasicMaterial({
                  color: material.color.clone(),
                  map: material.map,
                });
          copyRender(transport, material);
          transport.name = `${sourceMaterialKey}-${kind}-transport`;
          transport.userData.gridworkMaterial = record;
          return { record, transport };
        };
        const geometrySignature = (geometry) => {
          const attribute = (value) => ({
            itemSize: value.itemSize,
            normalized: value.normalized,
            array: value.array?.constructor?.name ?? "none",
            usage: value.usage,
            gpuType: value.gpuType ?? null,
          });
          const attributes = {};
          for (const name of Object.keys(geometry.attributes).sort()) {
            attributes[name] = attribute(geometry.getAttribute(name));
          }
          return stable({
            index: geometry.index ? attribute(geometry.index) : null,
            attributes,
            morphAttributes: Object.keys(geometry.morphAttributes ?? {}).sort(),
          });
        };
        const countTriangles = (geometry) => {
          const count =
            geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0;
          if (count <= 0 || count % 3 !== 0) {
            throw new Error(`static geometry has a non-triangular element count: ${count}`);
          }
          return count / 3;
        };

        const previousRandom = Math.random;
        const previousColorManagement = T.ColorManagement.enabled;
        const previousGetContext = HTMLCanvasElement.prototype.getContext;
        const shouldSeed = globalThis.__gridworkSeedMode !== "unseeded";
        delete globalThis.__gridworkSeedMode;
        let seedState = payload.seed >>> 0;
        if (shouldSeed) {
          Math.random = () => {
            seedState = (seedState + 0x6d2b79f5) >>> 0;
            let mixed = seedState;
            mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
            mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
            return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
          };
        }
        T.ColorManagement.enabled = false;
        HTMLCanvasElement.prototype.getContext = function (kind, contextOptions) {
          if (kind === "2d") {
            return previousGetContext.call(this, kind, {
              ...(contextOptions ?? {}),
              willReadFrequently: true,
            });
          }
          return previousGetContext.call(this, kind, contextOptions);
        };
        let authored;
        try {
          const Constructor = globalThis[payload.kitName];
          if (typeof Constructor !== "function") {
            throw new Error(`${payload.kitName} is unavailable`);
          }
          const kit = new Constructor();
          kit.bare = payload.bare;
          const build = kit.defs()[payload.definition];
          if (typeof build !== "function") {
            throw new Error(`no ${payload.kitName} builder for ${payload.definition}`);
          }
          authored = build(payload.stage);
        } finally {
          Math.random = previousRandom;
          T.ColorManagement.enabled = previousColorManagement;
          HTMLCanvasElement.prototype.getContext = previousGetContext;
        }
        if (!authored?.isObject3D)
          throw new Error("source builder did not return an Object3D");
        authored.updateMatrixWorld(true);

        const materialCaptures = new Map();
        const buckets = new Map();
        const sourceBounds = new T.Box3();
        const sourceTextures = new Set();
        let sourceMeshes = 0;
        let sourceTriangles = 0;
        let meshOrdinal = 0;
        authored.traverse((object) => {
          if (!object.visible) return;
          if (!object.isMesh) {
            if (object.isLine || object.isPoints || object.isSprite) {
              throw new Error(`${payload.definition} contains an unsupported renderable`);
            }
            return;
          }
          if (object.isSkinnedMesh || object.isInstancedMesh) {
            throw new Error(`${payload.definition} contains non-static mesh geometry`);
          }
          if (Array.isArray(object.material)) {
            throw new Error(`${payload.definition} contains a multi-material mesh`);
          }
          if (Object.keys(object.geometry.morphAttributes ?? {}).length > 0) {
            throw new Error(`${payload.definition} contains morph geometry`);
          }
          for (const attribute of Object.values(object.geometry.attributes)) {
            if (attribute.isInterleavedBufferAttribute || !attribute.array) {
              throw new Error(`${payload.definition} contains interleaved geometry`);
            }
          }
          if (!materialCaptures.has(object.material)) {
            const sourceMaterialKey = `material-${String(materialCaptures.size).padStart(3, "0")}`;
            materialCaptures.set(
              object.material,
              captureMaterial(object.material, sourceMaterialKey),
            );
            if (object.material.map) sourceTextures.add(object.material.map);
            if (object.material.gradientMap)
              sourceTextures.add(object.material.gradientMap);
          }
          const geometry = object.geometry.clone();
          geometry.applyMatrix4(object.matrixWorld);
          geometry.clearGroups();
          if (object.material.map && !geometry.getAttribute("uv")) {
            geometry.setAttribute(
              "uv",
              new T.Float32BufferAttribute(
                new Float32Array(geometry.getAttribute("position").count * 2),
                2,
              ),
            );
          }
          geometry.computeBoundingBox();
          if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
            throw new Error(`${payload.definition} has empty world-space mesh bounds`);
          }
          sourceBounds.union(geometry.boundingBox);
          sourceMeshes += 1;
          sourceTriangles += countTriangles(geometry);
          const captured = materialCaptures.get(object.material);
          const transparent =
            object.material.transparent === true || object.material.opacity < 1;
          const key = stable({
            sourceMaterialIdentity: object.material.uuid,
            material: captured.record,
            geometry: geometrySignature(geometry),
            renderOrder: object.renderOrder,
            opaqueOrder: transparent ? `transparent-${meshOrdinal}` : "opaque",
          });
          const part = {
            geometry,
            transport: captured.transport,
            renderOrder: object.renderOrder,
            name: object.name,
          };
          const bucket = buckets.get(key);
          if (bucket) bucket.push(part);
          else buckets.set(key, [part]);
          meshOrdinal += 1;
        });
        if (sourceMeshes === 0 || sourceBounds.isEmpty()) {
          throw new Error(`${payload.definition} produced no visible static meshes`);
        }

        const bakedRoot = new T.Group();
        for (const [key, parts] of buckets) {
          const geometry =
            parts.length === 1
              ? parts[0].geometry
              : bundle.mergeGeometries(
                  parts.map((part) => part.geometry),
                  false,
                );
          if (!geometry) throw new Error(`${payload.definition} merge failed for ${key}`);
          const mesh = new T.Mesh(geometry, parts[0].transport);
          mesh.name = parts[0].name;
          mesh.renderOrder = parts[0].renderOrder;
          if (mesh.renderOrder !== 0) {
            if (!Number.isSafeInteger(mesh.renderOrder)) {
              throw new Error("non-default render order must be a safe integer");
            }
            mesh.userData.gridworkRenderOrder = mesh.renderOrder;
          }
          bakedRoot.add(mesh);
        }
        bakedRoot.updateMatrixWorld(true);
        const shippedBounds = new T.Box3().setFromObject(bakedRoot);
        let shippedMeshes = 0;
        let shippedTriangles = 0;
        let nonDefaultRenderOrders = 0;
        bakedRoot.traverse((object) => {
          if (!object.isMesh) return;
          shippedMeshes += 1;
          shippedTriangles += countTriangles(object.geometry);
          if (object.renderOrder !== 0) nonDefaultRenderOrders += 1;
        });
        if (
          shippedMeshes > sourceMeshes ||
          shippedTriangles !== sourceTriangles ||
          !sourceBounds.min.equals(shippedBounds.min) ||
          !sourceBounds.max.equals(shippedBounds.max)
        ) {
          throw new Error(`${payload.definition} changed world-baked geometry invariants`);
        }

        function makeTaggedExportScene(THREE, scenePayload, root) {
          const scene = new THREE.Scene();
          scene.userData.gridworkLateEraAsset = {
            schema: 1,
            sourceSha256: scenePayload.sourceSha256,
            era: scenePayload.runtimeEra,
            sourceKey: scenePayload.definition,
            stage: scenePayload.stage,
            basename: scenePayload.seedInput,
          };
          for (const child of [...root.children]) scene.add(child);
          return scene;
        }
        const scene = makeTaggedExportScene(T, payload, bakedRoot);
        const glb = await new Promise((resolve, reject) => {
          new bundle.GLTFExporter().parse(scene, resolve, reject, {
            binary: true,
            onlyVisible: true,
          });
        });
        const bytes = new Uint8Array(glb);
        let binary = "";
        const chunk = 32_768;
        for (let offset = 0; offset < bytes.length; offset += chunk) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
        }
        const materialSemantics = [...materialCaptures.values()]
          .map(({ record }) => record)
          .sort((left, right) =>
            left.sourceMaterialKey.localeCompare(right.sourceMaterialKey),
          );
        const baseMaps = materialSemantics.map((record) => record.baseMap).filter(Boolean);
        const anisotropyHistogram = {};
        for (const baseMap of baseMaps) {
          const key = String(baseMap.anisotropyRequested);
          anisotropyHistogram[key] = (anisotropyHistogram[key] ?? 0) + 1;
        }
        const nodeOrders = [];
        scene.traverse((object) => {
          if (object.userData.gridworkRenderOrder !== undefined) {
            nodeOrders.push(object.userData.gridworkRenderOrder);
          }
        });
        const sourceSize = sourceBounds.getSize(new T.Vector3());
        const shippedSize = shippedBounds.getSize(new T.Vector3());
        return {
          b64: btoa(binary),
          sourceMeshes,
          shippedMeshes,
          sourceTriangles,
          shippedTriangles,
          sourceBounds: {
            min: sourceBounds.min.toArray(),
            max: sourceBounds.max.toArray(),
            size: sourceSize.toArray(),
          },
          shippedBounds: {
            min: shippedBounds.min.toArray(),
            max: shippedBounds.max.toArray(),
            size: shippedSize.toArray(),
          },
          materialCount: materialSemantics.length,
          toonMaterialCount: materialSemantics.filter((record) => record.kind === "toon")
            .length,
          unlitMaterialCount: materialSemantics.filter((record) => record.kind === "unlit")
            .length,
          baseMapCount: baseMaps.length,
          textureCount: sourceTextures.size,
          anisotropyHistogram,
          samplerSemanticRecords: baseMaps,
          colorSpaceRoles: {
            srgbColorMaps: baseMaps.filter(
              (record) => record.colorSpace === T.SRGBColorSpace,
            ).length,
            nonColorMaps:
              materialSemantics.filter((record) => record.gradient !== null).length +
              baseMaps.filter((record) => record.colorSpace !== T.SRGBColorSpace).length,
          },
          materialSemantics,
          toon: materialSemantics.filter((record) => record.kind === "toon"),
          nonDefaultRenderOrderCount: nonDefaultRenderOrders,
          nodeOrders,
        };
      },
      {
        sourceSha256: SOURCE_CONTRACT.sha256,
        runtimeEra: job.runtimeEra,
        definition: job.definition,
        stage: job.stage,
        seedInput: job.seedInput,
        seed: job.seed,
        kitName: planFor(job.era).kitName,
        bare,
      },
    );
    await page.waitForTimeout(0);
    if (problems.length > 0) {
      throw new Error(`export page rejected ${job.seedInput}: ${problems.join("; ")}`);
    }
    const bytes = Buffer.from(result.b64, "base64");
    const parsed = parseGlb(bytes);
    const json = parsed.json;
    const output = Object.freeze({
      job,
      file: basename(job.relativeFile),
      relativeFile: job.relativeFile,
      era: job.era,
      kind: job.kind,
      stage: job.stage,
      runtimeId: job.runtimeId,
      runtimeEra: job.runtimeEra,
      bytes: new Uint8Array(bytes),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sourceMeshes: result.sourceMeshes,
      shippedMeshes: result.shippedMeshes,
      sourceTriangles: result.sourceTriangles,
      shippedTriangles: result.shippedTriangles,
      sourceBounds: result.sourceBounds,
      shippedBounds: result.shippedBounds,
      materialCount: result.materialCount,
      toonMaterialCount: result.toonMaterialCount,
      unlitMaterialCount: result.unlitMaterialCount,
      baseMapCount: result.baseMapCount,
      textureCount: result.textureCount,
      embeddedImageCount: json.images?.length ?? 0,
      anisotropyHistogram: Object.freeze({ ...result.anisotropyHistogram }),
      samplerSemanticDigest: createHash("sha256")
        .update(stableJson(result.samplerSemanticRecords))
        .digest("hex"),
      colorSpaceRoles: Object.freeze({ ...result.colorSpaceRoles }),
      materialSemantics: Object.freeze(result.materialSemantics),
      toon: Object.freeze(result.toon),
      nonDefaultRenderOrderCount: result.nonDefaultRenderOrderCount,
      semanticDigest: createHash("sha256")
        .update(
          stableJson({
            materialSemantics: result.materialSemantics,
            nodeOrders: result.nodeOrders,
          }),
        )
        .digest("hex"),
      installedExporterSha256,
    });
    validateGlb(bytes, job, output);
    await validateGlbWithLoader(page, bytes, job);
    await page.waitForTimeout(0);
    if (problems.length > 0) {
      throw new Error(`loaded export rejected ${job.seedInput}: ${problems.join("; ")}`);
    }
    return output;
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("request", onRequest);
    page.off("requestfailed", onRequestFailed);
  }
}

function assertFidelityOptions(options) {
  exactObjectKeys(
    options,
    [
      "mode",
      "bare",
      "writeShippingMetadata",
      "stagedRoot",
      "jobs",
      "sourceBytes",
      "pageFactory",
    ],
    "staged fidelity options",
  );
  const shipping =
    options.mode === "shipping" &&
    options.bare === true &&
    options.writeShippingMetadata === true;
  const comparison =
    options.mode === "comparison" &&
    options.bare === false &&
    options.writeShippingMetadata === false;
  if (!shipping && !comparison) {
    throw new Error("staged fidelity mode/bare/metadata contract changed");
  }
  if (
    typeof options.stagedRoot !== "string" ||
    options.stagedRoot.length === 0 ||
    typeof options.pageFactory !== "function"
  ) {
    throw new Error("staged fidelity requires a stage root and page factory");
  }
  assertCanonicalSource(options.sourceBytes);
  const canonical = deriveExportJobs();
  const expected = canonical.map((job) => job.relativeFile).sort();
  const observed = options.jobs?.map((job) => job.relativeFile).sort();
  if (
    !Array.isArray(options.jobs) ||
    options.jobs.length !== 87 ||
    new Set(observed).size !== 87 ||
    stableJson(observed) !== stableJson(expected)
  ) {
    throw new Error("staged fidelity jobs do not equal the exact 87-path export plan");
  }
  return canonical;
}

async function assertExactFidelityInventory(stagedRoot, expectedFiles) {
  const observed = [];
  const visit = async (directory, prefix = "") => {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const relativePath = prefix ? `${prefix}/${name}` : name;
      const entry = await lstat(path);
      if (entry.isSymbolicLink()) {
        throw new Error(`staged fidelity inventory contains a symlink: ${relativePath}`);
      }
      if (entry.isDirectory()) await visit(path, relativePath);
      else if (entry.isFile()) observed.push(relativePath);
      else
        throw new Error(
          `staged fidelity inventory contains an unsupported entry: ${relativePath}`,
        );
    }
  };
  await visit(stagedRoot);
  const expected = [...expectedFiles].sort();
  if (stableJson(observed.sort()) !== stableJson(expected)) {
    const missing = expected.find((file) => !observed.includes(file));
    const extra = observed.find((file) => !expected.includes(file));
    throw new Error(
      missing
        ? `staged fidelity output missing: ${basename(missing)}`
        : `staged fidelity output is unplanned: ${extra}`,
    );
  }
}

function stagedModelUrl(relativeFile) {
  return `https://gridwork-stage.invalid/models/${relativeFile
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export async function runStagedFidelityGate(options) {
  const jobs = assertFidelityOptions(options);
  const expectedFiles = jobs.map((job) => job.relativeFile);
  await assertExactFidelityInventory(options.stagedRoot, expectedFiles);
  const kitSources = extractKitSources(options.sourceBytes);
  const bundle = await buildDisposableThreeBundle();
  const fulfilled = new Set();
  const results = [];
  try {
    for (const era of ["atomic_age", "information_age", "cyberpunk"]) {
      const created = await options.pageFactory();
      const { page } = created;
      const eraJobs = jobs.filter((job) => job.era === era);
      const allowed = new Set(eraJobs.map((job) => job.relativeFile));
      const problems = [];
      const onConsole = (message) => {
        if (
          message.type() === "warning" &&
          /GL Driver Message .*GPU stall due to ReadPixels/.test(message.text())
        ) {
          return;
        }
        if (message.type() === "warning" || message.type() === "error") {
          problems.push(`console ${message.type()}: ${message.text()}`);
        }
      };
      const onPageError = (error) => problems.push(`page error: ${String(error)}`);
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      try {
        await page.route("**/*", async (route) => {
          const requestUrl = new URL(route.request().url());
          if (
            requestUrl.origin !== "https://gridwork-stage.invalid" ||
            !requestUrl.pathname.startsWith("/models/")
          ) {
            return route.abort("blockedbyclient");
          }
          const file = decodeURIComponent(requestUrl.pathname.replace(/^\/models\//, ""));
          if (
            !allowed.has(file) ||
            file.includes("..") ||
            file.startsWith("/") ||
            file.startsWith("\\")
          ) {
            return route.abort("blockedbyclient");
          }
          fulfilled.add(file);
          return route.fulfill({
            status: 200,
            contentType: "model/gltf-binary",
            body: await readFile(join(options.stagedRoot, ...file.split("/"))),
          });
        });
        await page.setContent("<!doctype html><html><body></body></html>");
        await page.addScriptTag({ path: bundle.path });
        await page.evaluate(() => {
          const runtime = globalThis.__gridworkBundle;
          if (
            !runtime?.THREE ||
            typeof runtime.prepareGridworkModel !== "function" ||
            runtime.PLACED_PREPARATION?.materials !== "restored"
          ) {
            throw new Error(
              "Task 8 placed-preparation seam is absent from fidelity bundle",
            );
          }
          globalThis.THREE = runtime.THREE;
        });
        await installLegacyEncodingFacade(page, `${era} staged fidelity`);
        if (era === "cyberpunk") {
          await page.addScriptTag({ content: kitSources.information_age });
        }
        await page.addScriptTag({ content: kitSources[era] });

        for (const job of eraJobs) {
          const result = await page.evaluate(
            async ({ job: activeJob, bare, url }) => {
              const runtime = globalThis.__gridworkBundle;
              const T = runtime.THREE;
              const stable = (value) => {
                if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
                if (value && typeof value === "object") {
                  return `{${Object.keys(value)
                    .sort()
                    .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
                    .join(",")}}`;
                }
                return JSON.stringify(value);
              };
              const expectedTag = {
                schema: 1,
                sourceSha256: activeJob.sourceSha256,
                era: activeJob.runtimeEra,
                sourceKey: activeJob.definition,
                stage: activeJob.stage,
                basename: activeJob.seedInput,
              };
              const buildSource = () => {
                const previousRandom = Math.random;
                const previousColorManagement = T.ColorManagement.enabled;
                let seedState = activeJob.seed >>> 0;
                Math.random = () => {
                  seedState = (seedState + 0x6d2b79f5) >>> 0;
                  let mixed = seedState;
                  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
                  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
                  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
                };
                T.ColorManagement.enabled = false;
                try {
                  const Ctor = globalThis[activeJob.kitName];
                  if (typeof Ctor !== "function") {
                    throw new Error(
                      `fidelity source constructor missing: ${activeJob.kitName}`,
                    );
                  }
                  const kit = new Ctor();
                  kit.bare = bare;
                  const build = kit.defs()[activeJob.definition];
                  if (typeof build !== "function") {
                    throw new Error(
                      `fidelity source builder missing: ${activeJob.seedInput}`,
                    );
                  }
                  const source = build(activeJob.stage);
                  if (!source?.isObject3D) {
                    throw new Error(
                      `fidelity source is not Object3D: ${activeJob.seedInput}`,
                    );
                  }
                  return source;
                } finally {
                  Math.random = previousRandom;
                  T.ColorManagement.enabled = previousColorManagement;
                }
              };
              const prepareSource = (source) => {
                const root = new T.Group();
                source.updateMatrixWorld(true);
                source.traverse((object) => {
                  if (!object.visible || !object.isMesh) return;
                  const geometry = object.geometry.clone();
                  geometry.applyMatrix4(object.matrixWorld);
                  const mesh = new T.Mesh(geometry, object.material);
                  mesh.name = object.name;
                  mesh.renderOrder = object.renderOrder;
                  root.add(mesh);
                });
                root.updateMatrixWorld(true);
                const bounds = new T.Box3().setFromObject(root);
                if (bounds.isEmpty())
                  throw new Error(`${activeJob.seedInput} source bounds empty`);
                const size = bounds.getSize(new T.Vector3());
                const scale = runtime.footprintFitScale(
                  size.x,
                  size.z,
                  activeJob.runtimeFootprint,
                );
                root.scale.setScalar(scale);
                const fitted = new T.Box3().setFromObject(root);
                const height = fitted.max.y - fitted.min.y;
                if (height > runtime.MAX_BUILD_HEIGHT + 1e-8) {
                  throw new Error(
                    `${activeJob.seedInput} source activates MAX_BUILD_HEIGHT`,
                  );
                }
                root.position.set(
                  -(fitted.min.x + fitted.max.x) / 2,
                  -fitted.min.y,
                  -(fitted.min.z + fitted.max.z) / 2,
                );
                root.traverse((object) => {
                  if (!object.isMesh) return;
                  object.castShadow = true;
                  object.receiveShadow = true;
                });
                root.updateMatrixWorld(true);
                return root;
              };
              const loaded = await new Promise((resolve, reject) => {
                new runtime.GLTFLoader().load(url, resolve, undefined, reject);
              });
              if (
                !loaded.scene?.isGroup ||
                stable(loaded.scene.userData.gridworkLateEraAsset) !== stable(expectedTag)
              ) {
                throw new Error(`${activeJob.seedInput} loader-root tag changed`);
              }
              const source = prepareSource(buildSource());
              const restored = runtime.prepareGridworkModel(
                loaded.scene,
                activeJob.runtimeFootprint,
                runtime.PLACED_PREPARATION,
              );
              const restoredBounds = new T.Box3().setFromObject(restored);
              const restoredHeight = restoredBounds.max.y - restoredBounds.min.y;
              if (restoredHeight > runtime.MAX_BUILD_HEIGHT + 1e-8) {
                throw new Error(
                  `${activeJob.seedInput} restored output activates MAX_BUILD_HEIGHT`,
                );
              }
              const collect = (root) => {
                const materials = new Set();
                const orders = [];
                root.traverse((object) => {
                  if (object.renderOrder !== 0) orders.push(object.renderOrder);
                  if (!object.isMesh) return;
                  const rows = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                  for (const material of rows) materials.add(material);
                });
                const anisotropies = [...materials]
                  .map((material) => material.map?.anisotropy)
                  .filter((value) => value !== undefined)
                  .sort((left, right) => left - right);
                return { anisotropies, orders: orders.sort((left, right) => left - right) };
              };
              const sourceSemantics = collect(source);
              const restoredSemantics = collect(restored);
              if (
                stable(sourceSemantics.anisotropies) !==
                stable(restoredSemantics.anisotropies)
              ) {
                throw new Error(`${activeJob.seedInput} restored anisotropy changed`);
              }
              if (stable(sourceSemantics.orders) !== stable(restoredSemantics.orders)) {
                throw new Error(`${activeJob.seedInput} restored render order changed`);
              }
              if (
                activeJob.definition === "vertfarm" &&
                activeJob.stage === "built" &&
                !restoredSemantics.orders.includes(3)
              ) {
                throw new Error(
                  `${activeJob.seedInput} Vertical Farm renderOrder 3 is missing`,
                );
              }

              const renderer = new T.WebGLRenderer({
                antialias: false,
                alpha: true,
                preserveDrawingBuffer: true,
                powerPreference: "high-performance",
              });
              renderer.setPixelRatio(1);
              renderer.setSize(256, 256, false);
              renderer.outputColorSpace = T.SRGBColorSpace;
              renderer.toneMapping = T.NoToneMapping;
              renderer.shadowMap.enabled = true;
              const target = new T.WebGLRenderTarget(256, 256, {
                format: T.RGBAFormat,
                type: T.UnsignedByteType,
                depthBuffer: true,
                stencilBuffer: false,
              });
              target.texture.colorSpace = T.SRGBColorSpace;
              const referenceBounds = new T.Box3().setFromObject(source);
              referenceBounds.union(restoredBounds);
              const center = referenceBounds.getCenter(new T.Vector3());
              const sphere = referenceBounds.getBoundingSphere(new T.Sphere());
              const camera = new T.PerspectiveCamera(35, 1, 0.01, 1_000);
              const direction = new T.Vector3(1.3, 1, 1.3).normalize();
              const distance =
                (Math.max(sphere.radius, runtime.GRID_CELL) /
                  Math.sin(T.MathUtils.degToRad(camera.fov / 2))) *
                1.25;
              camera.position.copy(center).addScaledVector(direction, distance);
              camera.lookAt(center);
              camera.updateProjectionMatrix();
              const render = (object) => {
                const scene = new T.Scene();
                const ambient = new T.AmbientLight(0xffffff, 1.25);
                const key = new T.DirectionalLight(0xffffff, 2.2);
                key.position.copy(center).add(new T.Vector3(18, 28, 16));
                key.castShadow = true;
                scene.add(ambient, key, object);
                renderer.setRenderTarget(target);
                renderer.setClearColor(0, 0);
                renderer.clear(true, true, true);
                renderer.render(scene, camera);
                const pixels = new Uint8Array(256 * 256 * 4);
                renderer.readRenderTargetPixels(target, 0, 0, 256, 256, pixels);
                scene.remove(object);
                return pixels;
              };
              const sourcePixels = render(source);
              const restoredPixels = render(restored);
              let alphaMismatches = 0;
              const errors = [];
              let total = 0;
              for (let offset = 0; offset < sourcePixels.length; offset += 4) {
                if (sourcePixels[offset + 3] !== restoredPixels[offset + 3]) {
                  alphaMismatches += 1;
                }
                for (let channel = 0; channel < 3; channel += 1) {
                  const error = Math.abs(
                    sourcePixels[offset + channel] - restoredPixels[offset + channel],
                  );
                  errors.push(error);
                  total += error;
                }
              }
              errors.sort((left, right) => left - right);
              const p99 =
                errors[Math.min(errors.length - 1, Math.floor(errors.length * 0.99))];
              target.dispose();
              renderer.dispose();
              renderer.forceContextLoss();
              return {
                file: activeJob.relativeFile,
                alphaMismatches,
                meanRgbByteError: total / errors.length,
                p99RgbByteError: p99,
                anisotropies: restoredSemantics.anisotropies,
                renderOrders: restoredSemantics.orders,
              };
            },
            {
              job: {
                ...job,
                sourceSha256: SOURCE_CONTRACT.sha256,
                kitName: planFor(job.era).kitName,
              },
              bare: options.bare,
              url: stagedModelUrl(job.relativeFile),
            },
          );
          if (result.alphaMismatches !== 0) {
            throw new Error(
              `${job.seedInput} staged fidelity alpha mismatch: ${result.alphaMismatches}`,
            );
          }
          if (result.meanRgbByteError > 0.5) {
            throw new Error(
              `${job.seedInput} staged fidelity mean RGB byte error ${result.meanRgbByteError}`,
            );
          }
          if (result.p99RgbByteError > 2) {
            throw new Error(
              `${job.seedInput} staged fidelity p99 RGB byte error ${result.p99RgbByteError}`,
            );
          }
          results.push(result);
        }
        if (problems.length > 0) {
          throw new Error(
            `${era} staged fidelity page rejected output: ${problems.join("; ")}`,
          );
        }
        await removeLegacyEncodingFacade(page);
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageError);
        await created.close();
      }
    }
  } finally {
    await bundle.dispose();
  }
  const expected = [...expectedFiles].sort();
  const observed = [...fulfilled].sort();
  if (stableJson(observed) !== stableJson(expected)) {
    throw new Error("staged fidelity fulfilled set does not equal the exact 87 paths");
  }
  const sortedResults = [...results].sort((left, right) =>
    left.file.localeCompare(right.file),
  );
  return deepFreeze({
    files: 87,
    alphaMismatches: 0,
    worstMeanRgbByteError: Math.max(
      ...sortedResults.map((result) => result.meanRgbByteError),
    ),
    worstP99RgbByteError: Math.max(
      ...sortedResults.map((result) => result.p99RgbByteError),
    ),
    resultsDigest: createHash("sha256").update(stableJson(sortedResults)).digest("hex"),
  });
}

function exactObjectKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value);
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(`${label} keys/order changed: ${actual.join(",")}`);
  }
}

function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
  return value;
}

function finiteTuple(value, length, label) {
  if (!Array.isArray(value) || value.length !== length) {
    throw new Error(`${label} must contain ${length} values`);
  }
  return value.map((entry, index) => finiteNumber(entry, `${label}[${index}]`));
}

export function parseGlb(bytes) {
  const input = Buffer.from(bytes);
  if (input.byteLength < 20 || input.toString("ascii", 0, 4) !== "glTF") {
    throw new Error("GLB framing has no glTF magic");
  }
  if (input.readUInt32LE(4) !== 2) throw new Error("GLB framing is not version 2");
  if (input.readUInt32LE(8) !== input.byteLength) {
    throw new Error("GLB framing length does not match its bytes");
  }
  let offset = 12;
  let json = null;
  let binary = null;
  let chunkIndex = 0;
  while (offset < input.byteLength) {
    if (offset + 8 > input.byteLength)
      throw new Error("GLB framing has a truncated chunk header");
    const length = input.readUInt32LE(offset);
    const type = input.readUInt32LE(offset + 4);
    if (length % 4 !== 0 || offset + 8 + length > input.byteLength) {
      throw new Error("GLB framing has an invalid chunk length");
    }
    const chunk = input.subarray(offset + 8, offset + 8 + length);
    if (chunkIndex === 0) {
      if (type !== 0x4e4f534a) throw new Error("GLB framing first chunk is not JSON");
      try {
        json = JSON.parse(chunk.toString("utf8").trimEnd());
      } catch (error) {
        throw new Error(`GLB JSON chunk is invalid: ${String(error)}`);
      }
    } else if (chunkIndex === 1) {
      if (type !== 0x004e4942) throw new Error("GLB framing second chunk is not BIN");
      binary = Buffer.from(chunk);
    } else {
      throw new Error("GLB framing contains an unsupported extra chunk");
    }
    chunkIndex += 1;
    offset += 8 + length;
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("GLB JSON chunk is not an object");
  }
  if (!binary) throw new Error("GLB has no embedded BIN chunk");
  if (json.asset?.version !== "2.0") throw new Error("GLB does not declare glTF 2.0");
  if (!Array.isArray(json.buffers) || json.buffers.length !== 1) {
    throw new Error("GLB must declare exactly one embedded buffer");
  }
  if (json.buffers[0].uri !== undefined) throw new Error("GLB buffer has an external URI");
  const declared = json.buffers[0].byteLength;
  if (
    !Number.isSafeInteger(declared) ||
    declared <= 0 ||
    declared > binary.byteLength ||
    binary.byteLength - declared > 3
  ) {
    throw new Error("GLB embedded buffer length is incoherent");
  }
  return Object.freeze({
    json,
    binary: new Uint8Array(binary),
  });
}

const ACCESSOR_COMPONENTS = Object.freeze({
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
});

const COMPONENT_READERS = Object.freeze({
  5120: { bytes: 1, read: (view, offset) => view.getInt8(offset) },
  5121: { bytes: 1, read: (view, offset) => view.getUint8(offset) },
  5122: { bytes: 2, read: (view, offset) => view.getInt16(offset, true) },
  5123: { bytes: 2, read: (view, offset) => view.getUint16(offset, true) },
  5124: { bytes: 4, read: (view, offset) => view.getInt32(offset, true) },
  5125: { bytes: 4, read: (view, offset) => view.getUint32(offset, true) },
  5126: { bytes: 4, read: (view, offset) => view.getFloat32(offset, true) },
});

function readAccessor(json, binary, accessorIndex, label) {
  if (!Number.isSafeInteger(accessorIndex) || accessorIndex < 0) {
    throw new Error(`${label} references an invalid accessor index`);
  }
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`${label} references missing accessor ${accessorIndex}`);
  if (accessor.sparse !== undefined)
    throw new Error(`${label} uses unsupported sparse accessor`);
  const components = ACCESSOR_COMPONENTS[accessor.type];
  const reader = COMPONENT_READERS[accessor.componentType];
  if (!components || !reader) throw new Error(`${label} has invalid accessor shape`);
  if (accessor.normalized !== undefined && typeof accessor.normalized !== "boolean") {
    throw new Error(`${label} accessor normalized flag is invalid`);
  }
  if (!Number.isSafeInteger(accessor.count) || accessor.count <= 0) {
    throw new Error(`${label} accessor has no values`);
  }
  if (!Number.isSafeInteger(accessor.bufferView) || accessor.bufferView < 0) {
    throw new Error(`${label} accessor has no bufferView index`);
  }
  const bufferView = json.bufferViews?.[accessor.bufferView];
  if (bufferView?.buffer !== 0) {
    throw new Error(`${label} accessor has no embedded bufferView`);
  }
  const viewOffset = bufferView.byteOffset ?? 0;
  const accessorOffset = accessor.byteOffset ?? 0;
  const elementBytes = components * reader.bytes;
  const stride = bufferView.byteStride ?? elementBytes;
  const declaredBufferLength = json.buffers?.[0]?.byteLength;
  if (!Number.isSafeInteger(viewOffset) || viewOffset < 0 || viewOffset % 4 !== 0) {
    throw new Error(`${label} bufferView byteOffset alignment is invalid`);
  }
  if (
    !Number.isSafeInteger(bufferView.byteLength) ||
    bufferView.byteLength <= 0 ||
    !Number.isSafeInteger(declaredBufferLength) ||
    viewOffset + bufferView.byteLength > declaredBufferLength ||
    viewOffset + bufferView.byteLength > binary.byteLength
  ) {
    throw new Error(`${label} bufferView range is invalid`);
  }
  if (bufferView.target !== undefined && ![34962, 34963].includes(bufferView.target)) {
    throw new Error(`${label} bufferView target is invalid`);
  }
  if (
    !Number.isSafeInteger(accessorOffset) ||
    accessorOffset < 0 ||
    accessorOffset % reader.bytes !== 0 ||
    (viewOffset + accessorOffset) % reader.bytes !== 0
  ) {
    throw new Error(`${label} accessor byteOffset alignment is invalid`);
  }
  if (
    bufferView.byteStride !== undefined &&
    (!Number.isSafeInteger(bufferView.byteStride) ||
      bufferView.byteStride < 4 ||
      bufferView.byteStride > 252 ||
      bufferView.byteStride % 4 !== 0 ||
      bufferView.byteStride < elementBytes)
  ) {
    throw new Error(`${label} bufferView byteStride is invalid`);
  }
  if (
    !Number.isSafeInteger(accessorOffset) ||
    accessorOffset + (accessor.count - 1) * stride + elementBytes > bufferView.byteLength
  ) {
    throw new Error(`${label} accessor exceeds its bufferView`);
  }
  for (const [field, tuple] of [
    ["min", accessor.min],
    ["max", accessor.max],
  ]) {
    if (tuple !== undefined) {
      finiteTuple(tuple, components, `${label} accessor.${field}`);
    }
  }
  const data = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const values = new Array(accessor.count * components);
  for (let item = 0; item < accessor.count; item += 1) {
    const start = viewOffset + accessorOffset + item * stride;
    for (let component = 0; component < components; component += 1) {
      const value = reader.read(data, start + component * reader.bytes);
      if (!Number.isFinite(value))
        throw new Error(`${label} accessor contains a nonfinite value`);
      values[item * components + component] = value;
    }
  }
  return { accessor, bufferView, components, values };
}

function validateAttributeAccessorEncoding(semantic, decoded, label) {
  const { accessor } = decoded;
  const normalized = accessor.normalized === true;
  if (decoded.bufferView.target !== undefined && decoded.bufferView.target !== 34962) {
    throw new Error(`${label} ${semantic} bufferView target is not ARRAY_BUFFER`);
  }
  const fail = () => {
    throw new Error(
      `${label} ${semantic} accessor encoding is invalid: ${accessor.type}/${accessor.componentType}/normalized=${normalized}`,
    );
  };
  if (semantic === "POSITION" || semantic === "NORMAL") {
    if (accessor.type !== "VEC3" || accessor.componentType !== 5126 || normalized) {
      fail();
    }
    return;
  }
  if (semantic === "TANGENT") {
    if (accessor.type !== "VEC4" || accessor.componentType !== 5126 || normalized) {
      fail();
    }
    return;
  }
  if (/^TEXCOORD_\d+$/.test(semantic)) {
    const legal =
      (accessor.componentType === 5126 && !normalized) ||
      ([5121, 5123].includes(accessor.componentType) && normalized);
    if (accessor.type !== "VEC2" || !legal) fail();
    return;
  }
  if (/^COLOR_\d+$/.test(semantic)) {
    const legal =
      (accessor.componentType === 5126 && !normalized) ||
      ([5121, 5123].includes(accessor.componentType) && normalized);
    if (!["VEC3", "VEC4"].includes(accessor.type) || !legal) fail();
    return;
  }
  if (/^_[A-Z0-9_]+$/.test(semantic)) return;
  throw new Error(`${label} uses unsupported vertex attribute semantic ${semantic}`);
}

function validateIndexAccessorEncoding(decoded, label) {
  const { accessor } = decoded;
  if (
    accessor.type !== "SCALAR" ||
    ![5121, 5123, 5125].includes(accessor.componentType) ||
    accessor.normalized === true
  ) {
    throw new Error(`${label} index accessor encoding is invalid`);
  }
  const viewTarget = decoded.bufferView?.target;
  if (viewTarget !== undefined && viewTarget !== 34963) {
    throw new Error(`${label} index bufferView target is invalid`);
  }
  if (decoded.bufferView?.byteStride !== undefined) {
    throw new Error(`${label} index bufferView must not declare byteStride`);
  }
}

function decodedVectorBounds(values, components, label) {
  if (components !== 3 || values.length === 0 || values.length % 3 !== 0) {
    throw new Error(`${label} cannot produce decoded VEC3 bounds`);
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = values[index + axis];
      if (!Number.isFinite(value)) {
        throw new Error(`${label} contains a nonfinite decoded POSITION`);
      }
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  return { min, max };
}

function assertDecodedBoundsEqual(declared, decoded, label) {
  for (const field of ["min", "max"]) {
    const tuple = finiteTuple(declared[field], 3, `${label} declared ${field}`);
    for (let axis = 0; axis < 3; axis += 1) {
      if (!closeEnough(tuple[axis], decoded[field][axis])) {
        throw new Error(
          `${label} declared POSITION bounds differ from decoded values at ${field}[${axis}]`,
        );
      }
    }
  }
}

function assertBoundsRecord(bounds, label) {
  exactObjectKeys(bounds, ["min", "max", "size"], label);
  const min = finiteTuple(bounds.min, 3, `${label}.min`);
  const max = finiteTuple(bounds.max, 3, `${label}.max`);
  const size = finiteTuple(bounds.size, 3, `${label}.size`);
  for (let axis = 0; axis < 3; axis += 1) {
    if (max[axis] < min[axis] || Math.abs(max[axis] - min[axis] - size[axis]) > 1e-6) {
      throw new Error(`${label} is incoherent on axis ${axis}`);
    }
  }
  if (!size.some((value) => value > 0)) throw new Error(`${label} is empty`);
  return { min, max, size };
}

function closeEnough(left, right) {
  return (
    Math.abs(left - right) <= Math.max(1e-4, Math.abs(left) * 1e-6, Math.abs(right) * 1e-6)
  );
}

function assertBoundsEqual(left, right, label) {
  for (const field of ["min", "max", "size"]) {
    for (let axis = 0; axis < 3; axis += 1) {
      if (!closeEnough(left[field][axis], right[field][axis])) {
        throw new Error(`${label} differs at ${field}[${axis}]`);
      }
    }
  }
}

const RENDER_KEYS = Object.freeze([
  "opacity",
  "transparent",
  "alphaTest",
  "side",
  "depthTest",
  "depthWrite",
  "depthFunc",
  "colorWrite",
  "blending",
  "blendSrc",
  "blendDst",
  "blendEquation",
  "blendSrcAlpha",
  "blendDstAlpha",
  "blendEquationAlpha",
  "premultipliedAlpha",
  "forceSinglePass",
  "polygonOffset",
  "polygonOffsetFactor",
  "polygonOffsetUnits",
  "toneMapped",
  "dithering",
  "flatShading",
  "vertexColors",
  "fog",
]);
const BASE_MAP_KEYS = Object.freeze([
  "slot",
  "sourceTextureKey",
  "imageFingerprint",
  "offset",
  "repeat",
  "center",
  "rotation",
  "matrix",
  "matrixAutoUpdate",
  "wrapS",
  "wrapT",
  "minFilter",
  "magFilter",
  "anisotropyRequested",
  "generateMipmaps",
  "flipY",
  "premultiplyAlpha",
  "unpackAlignment",
  "colorSpace",
]);
const GRADIENT_KEYS = Object.freeze([
  "width",
  "height",
  "channels",
  "channelInterpretation",
  "texels",
  "sourceObjectType",
  "runtimeObjectType",
  "format",
  "type",
  "minFilter",
  "magFilter",
  "wrapS",
  "wrapT",
  "generateMipmaps",
  "flipY",
  "premultiplyAlpha",
  "unpackAlignment",
  "colorSpace",
]);
const MATERIAL_KEYS = Object.freeze([
  "schema",
  "kind",
  "sourceMaterialKey",
  "color",
  "baseMap",
  "gradient",
  "render",
]);

function validateMaterialRecord(record, label) {
  exactObjectKeys(record, MATERIAL_KEYS, label);
  if (record.schema !== 1 || !["toon", "unlit"].includes(record.kind)) {
    throw new Error(`${label} has an invalid semantic schema/kind`);
  }
  if (!/^material-\d{3}$/.test(record.sourceMaterialKey)) {
    throw new Error(`${label} has an invalid source material key`);
  }
  finiteTuple(record.color, 3, `${label}.color`);
  exactObjectKeys(record.render, RENDER_KEYS, `${label}.render`);
  for (const field of [
    "opacity",
    "alphaTest",
    "polygonOffsetFactor",
    "polygonOffsetUnits",
  ]) {
    finiteNumber(record.render[field], `${label}.render.${field}`);
  }
  for (const field of [
    "transparent",
    "depthTest",
    "depthWrite",
    "colorWrite",
    "premultipliedAlpha",
    "forceSinglePass",
    "polygonOffset",
    "toneMapped",
    "dithering",
    "flatShading",
    "vertexColors",
    "fog",
  ]) {
    if (typeof record.render[field] !== "boolean") {
      throw new Error(`${label}.render.${field} must be boolean`);
    }
  }
  for (const field of [
    "side",
    "depthFunc",
    "blending",
    "blendSrc",
    "blendDst",
    "blendEquation",
  ]) {
    if (typeof record.render[field] !== "string" || record.render[field].length === 0) {
      throw new Error(`${label}.render.${field} must be a named enum`);
    }
  }
  for (const field of ["blendSrcAlpha", "blendDstAlpha", "blendEquationAlpha"]) {
    if (record.render[field] !== null && typeof record.render[field] !== "string") {
      throw new Error(`${label}.render.${field} must be null or a named enum`);
    }
  }
  if (record.baseMap !== null) {
    exactObjectKeys(record.baseMap, BASE_MAP_KEYS, `${label}.baseMap`);
    if (record.baseMap.slot !== "baseColor")
      throw new Error(`${label} base map slot changed`);
    if (!/^texture-\d{3}$/.test(record.baseMap.sourceTextureKey)) {
      throw new Error(`${label} base map source texture key changed`);
    }
    if (!/^rgba8:\d+x\d+:[a-f0-9]{64}$/.test(record.baseMap.imageFingerprint)) {
      throw new Error(`${label} base map image fingerprint changed`);
    }
    finiteTuple(record.baseMap.offset, 2, `${label}.baseMap.offset`);
    finiteTuple(record.baseMap.repeat, 2, `${label}.baseMap.repeat`);
    finiteTuple(record.baseMap.center, 2, `${label}.baseMap.center`);
    finiteTuple(record.baseMap.matrix, 9, `${label}.baseMap.matrix`);
    finiteNumber(record.baseMap.rotation, `${label}.baseMap.rotation`);
    finiteNumber(
      record.baseMap.anisotropyRequested,
      `${label}.baseMap.anisotropyRequested`,
    );
    for (const field of [
      "matrixAutoUpdate",
      "generateMipmaps",
      "flipY",
      "premultiplyAlpha",
    ]) {
      if (typeof record.baseMap[field] !== "boolean") {
        throw new Error(`${label}.baseMap.${field} must be boolean`);
      }
    }
    if (![1, 2, 4, 8].includes(record.baseMap.unpackAlignment)) {
      throw new Error(`${label}.baseMap.unpackAlignment is invalid`);
    }
    for (const field of ["wrapS", "wrapT", "minFilter", "magFilter", "colorSpace"]) {
      if (typeof record.baseMap[field] !== "string") {
        throw new Error(`${label}.baseMap.${field} must be a string`);
      }
    }
  }
  if (record.kind === "toon") {
    exactObjectKeys(record.gradient, GRADIENT_KEYS, `${label}.gradient`);
    if (
      record.gradient.width !== 3 ||
      record.gradient.height !== 1 ||
      record.gradient.channels !== 4 ||
      record.gradient.channelInterpretation !== "RGBA8_UNORM" ||
      record.gradient.sourceObjectType !== "CanvasTexture" ||
      record.gradient.runtimeObjectType !== "DataTexture"
    ) {
      throw new Error(`${label} gradient shape/interpretation changed`);
    }
    if (
      !Array.isArray(record.gradient.texels) ||
      record.gradient.texels.length !== 3 ||
      record.gradient.texels.some(
        (texel) =>
          !Array.isArray(texel) ||
          texel.length !== 4 ||
          texel.some((value) => !Number.isInteger(value) || value < 0 || value > 255),
      )
    ) {
      throw new Error(`${label} gradient must contain three RGBA texels`);
    }
  } else if (record.gradient !== null) {
    throw new Error(`${label} unlit gradient must be null`);
  }
}

const GLTF_WRAP_BY_THREE_NAME = Object.freeze({
  ClampToEdgeWrapping: 33071,
  MirroredRepeatWrapping: 33648,
  RepeatWrapping: 10497,
});

const GLTF_FILTER_BY_THREE_NAME = Object.freeze({
  NearestFilter: 9728,
  LinearFilter: 9729,
  NearestMipmapNearestFilter: 9984,
  LinearMipmapNearestFilter: 9985,
  NearestMipmapLinearFilter: 9986,
  LinearMipmapLinearFilter: 9987,
});

function assertNumericTupleEqual(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    throw new Error(`${label} shape changed`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (!closeEnough(actual[index], expected[index])) {
      throw new Error(`${label} differs at [${index}]`);
    }
  }
}

function textureImageIndex(texture) {
  const webpSource = texture?.extensions?.EXT_texture_webp?.source;
  if (webpSource !== undefined) return webpSource;
  return texture?.source;
}

function validateActualMaterialEncoding(json, material, record, index, label) {
  const materialLabel = `${label} material ${index}`;
  const pbr = material.pbrMetallicRoughness;
  if (!pbr || typeof pbr !== "object") {
    throw new Error(`${materialLabel} has no PBR transport`);
  }
  assertNumericTupleEqual(
    pbr.baseColorFactor ?? [1, 1, 1, 1],
    [...record.color, record.render.opacity],
    `${materialLabel} base color factor`,
  );
  const expectedRoughness = record.kind === "unlit" ? 0.9 : 1;
  if (pbr.metallicFactor !== 0 || !closeEnough(pbr.roughnessFactor, expectedRoughness)) {
    throw new Error(`${materialLabel} transport metallic/roughness factors changed`);
  }
  if (
    pbr.metallicRoughnessTexture !== undefined ||
    material.normalTexture !== undefined ||
    material.occlusionTexture !== undefined ||
    material.emissiveTexture !== undefined ||
    material.emissiveFactor !== undefined
  ) {
    throw new Error(`${materialLabel} gained unsupported glTF material channels`);
  }

  const expectedAlphaMode = record.render.transparent
    ? "BLEND"
    : record.render.alphaTest > 0
      ? "MASK"
      : "OPAQUE";
  const actualAlphaMode = material.alphaMode ?? "OPAQUE";
  if (actualAlphaMode !== expectedAlphaMode) {
    throw new Error(
      `${materialLabel} alpha mode changed: ${actualAlphaMode} != ${expectedAlphaMode}`,
    );
  }
  if (expectedAlphaMode === "MASK") {
    if (!closeEnough(material.alphaCutoff ?? 0.5, record.render.alphaTest)) {
      throw new Error(`${materialLabel} alpha cutoff changed`);
    }
  } else if (material.alphaCutoff !== undefined) {
    throw new Error(`${materialLabel} has an unexpected alpha cutoff`);
  }

  const expectedDoubleSided = record.render.side === "DoubleSide";
  if (!["FrontSide", "BackSide", "DoubleSide"].includes(record.render.side)) {
    throw new Error(`${materialLabel} side metadata is invalid`);
  }
  if (Boolean(material.doubleSided) !== expectedDoubleSided) {
    throw new Error(`${materialLabel} double-sided/side behavior changed`);
  }
  const unlit = Boolean(material.extensions?.KHR_materials_unlit);
  if ((record.kind === "unlit") !== unlit) {
    throw new Error(`${materialLabel} KHR_materials_unlit mismatch`);
  }

  const baseColorTexture = pbr.baseColorTexture;
  if (record.baseMap === null) {
    if (baseColorTexture !== undefined) {
      throw new Error(`${materialLabel} gained a source base map`);
    }
    return;
  }
  if (
    !baseColorTexture ||
    !Number.isSafeInteger(baseColorTexture.index) ||
    baseColorTexture.index < 0 ||
    (baseColorTexture.texCoord ?? 0) !== 0
  ) {
    throw new Error(
      `${materialLabel} dropped a base map/image/sampler; texture/image/sampler linkage is invalid`,
    );
  }
  const texture = json.textures?.[baseColorTexture.index];
  const sourceIndex = textureImageIndex(texture);
  const image = json.images?.[sourceIndex];
  const sampler = json.samplers?.[texture?.sampler];
  if (
    !texture ||
    !Number.isSafeInteger(sourceIndex) ||
    !image ||
    !Number.isSafeInteger(texture.sampler) ||
    !sampler
  ) {
    throw new Error(
      `${materialLabel} dropped a base map/image/sampler; texture/image/sampler linkage is invalid`,
    );
  }
  if (texture.name !== record.baseMap.sourceTextureKey) {
    throw new Error(
      `${materialLabel} texture/image/sampler linkage changed source texture identity`,
    );
  }
  const expectedSampler = {
    wrapS: GLTF_WRAP_BY_THREE_NAME[record.baseMap.wrapS],
    wrapT: GLTF_WRAP_BY_THREE_NAME[record.baseMap.wrapT],
    minFilter: GLTF_FILTER_BY_THREE_NAME[record.baseMap.minFilter],
    magFilter: GLTF_FILTER_BY_THREE_NAME[record.baseMap.magFilter],
  };
  for (const [field, expected] of Object.entries(expectedSampler)) {
    if (expected === undefined || sampler[field] !== expected) {
      throw new Error(
        `${materialLabel} sampler ${field} changed: ${String(sampler[field])} != ${String(expected)}`,
      );
    }
  }
  if (
    !Number.isSafeInteger(record.baseMap.anisotropyRequested) ||
    record.baseMap.anisotropyRequested < 1
  ) {
    throw new Error(`${materialLabel} anisotropy metadata is invalid`);
  }
  if (
    record.baseMap.center.some((value) => value !== 0) ||
    record.baseMap.matrixAutoUpdate !== true
  ) {
    throw new Error(`${materialLabel} base-map transform is not glTF-representable`);
  }
  const { Matrix3 } = runtimeThree();
  const expectedMatrix = new Matrix3()
    .setUvTransform(
      record.baseMap.offset[0],
      record.baseMap.offset[1],
      record.baseMap.repeat[0],
      record.baseMap.repeat[1],
      record.baseMap.rotation,
      record.baseMap.center[0],
      record.baseMap.center[1],
    )
    .toArray();
  assertNumericTupleEqual(
    record.baseMap.matrix,
    expectedMatrix,
    `${materialLabel} base-map matrix metadata`,
  );
  const transformed =
    record.baseMap.offset.some((value) => value !== 0) ||
    record.baseMap.repeat.some((value) => value !== 1) ||
    record.baseMap.rotation !== 0;
  const actualTransform = baseColorTexture.extensions?.KHR_texture_transform;
  if (transformed !== Boolean(actualTransform)) {
    throw new Error(`${materialLabel} KHR_texture_transform presence changed`);
  }
  if (actualTransform) {
    if ((actualTransform.texCoord ?? 0) !== 0) {
      throw new Error(`${materialLabel} texture transform texCoord changed`);
    }
    assertNumericTupleEqual(
      actualTransform.offset ?? [0, 0],
      record.baseMap.offset,
      `${materialLabel} texture transform offset`,
    );
    assertNumericTupleEqual(
      actualTransform.scale ?? [1, 1],
      record.baseMap.repeat,
      `${materialLabel} texture transform scale`,
    );
    if (!closeEnough(actualTransform.rotation ?? 0, record.baseMap.rotation)) {
      throw new Error(`${materialLabel} texture transform rotation changed`);
    }
  }
}

function validatePngContainer(bytes, label) {
  try {
    if (
      bytes.length < 45 ||
      !Buffer.from(bytes.subarray(0, 8)).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    ) {
      throw new Error("PNG signature is missing");
    }
    let cursor = 8;
    let chunkIndex = 0;
    let foundData = false;
    let foundEnd = false;
    while (cursor < bytes.length) {
      if (cursor + 12 > bytes.length) throw new Error("chunk header is truncated");
      const length =
        (bytes[cursor] << 24) |
        (bytes[cursor + 1] << 16) |
        (bytes[cursor + 2] << 8) |
        bytes[cursor + 3];
      const type = Buffer.from(bytes.subarray(cursor + 4, cursor + 8)).toString("ascii");
      if (length < 0 || cursor + 12 + length > bytes.length) {
        throw new Error(`chunk ${type} exceeds payload`);
      }
      if (chunkIndex === 0) {
        if (type !== "IHDR" || length !== 13) {
          throw new Error("IHDR is missing or malformed");
        }
        const width =
          (bytes[cursor + 8] << 24) |
          (bytes[cursor + 9] << 16) |
          (bytes[cursor + 10] << 8) |
          bytes[cursor + 11];
        const height =
          (bytes[cursor + 12] << 24) |
          (bytes[cursor + 13] << 16) |
          (bytes[cursor + 14] << 8) |
          bytes[cursor + 15];
        if (width <= 0 || height <= 0) {
          throw new Error("IHDR dimensions are empty");
        }
      }
      if (type === "IDAT") foundData = true;
      cursor += 12 + length;
      chunkIndex += 1;
      if (type === "IEND") {
        foundEnd = true;
        break;
      }
    }
    if (!foundData || !foundEnd || cursor !== bytes.length) {
      throw new Error("IDAT/IEND population is invalid");
    }
  } catch (error) {
    throw new Error(`${label} PNG payload decode failed: ${String(error)}`);
  }
}

function validateJpegContainer(bytes, label) {
  try {
    if (bytes.length < 6 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error("SOI marker is missing");
    }
    let cursor = 2;
    let foundFrame = false;
    let foundScan = false;
    while (cursor < bytes.length) {
      if (bytes[cursor] !== 0xff) throw new Error(`marker missing at byte ${cursor}`);
      while (cursor < bytes.length && bytes[cursor] === 0xff) cursor += 1;
      const marker = bytes[cursor];
      cursor += 1;
      if (marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (cursor + 2 > bytes.length) throw new Error("segment length is truncated");
      const length = (bytes[cursor] << 8) | bytes[cursor + 1];
      if (length < 2 || cursor + length > bytes.length) {
        throw new Error("segment exceeds payload");
      }
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
        ].includes(marker)
      ) {
        if (length < 8) throw new Error("frame header is truncated");
        const height = (bytes[cursor + 3] << 8) | bytes[cursor + 4];
        const width = (bytes[cursor + 5] << 8) | bytes[cursor + 6];
        if (width <= 0 || height <= 0) throw new Error("frame dimensions are empty");
        foundFrame = true;
      }
      if (marker === 0xda) {
        foundScan = true;
        if (bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
          throw new Error("EOI marker is missing");
        }
        break;
      }
      cursor += length;
    }
    if (!foundFrame || !foundScan) throw new Error("frame or scan marker is missing");
  } catch (error) {
    throw new Error(`${label} JPEG payload decode failed: ${String(error)}`);
  }
}

function validateWebpContainer(bytes, label) {
  try {
    if (
      bytes.length < 20 ||
      Buffer.from(bytes.subarray(0, 4)).toString("ascii") !== "RIFF" ||
      Buffer.from(bytes.subarray(8, 12)).toString("ascii") !== "WEBP"
    ) {
      throw new Error("RIFF/WEBP signature is missing");
    }
    const declared = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
    if (declared < 4 || declared + 8 !== bytes.length) {
      throw new Error("RIFF payload length is incoherent");
    }
    let cursor = 12;
    let imageChunk = false;
    while (cursor < bytes.length) {
      if (cursor + 8 > bytes.length) throw new Error("chunk header is truncated");
      const fourcc = Buffer.from(bytes.subarray(cursor, cursor + 4)).toString("ascii");
      const length =
        bytes[cursor + 4] |
        (bytes[cursor + 5] << 8) |
        (bytes[cursor + 6] << 16) |
        (bytes[cursor + 7] << 24);
      if (length < 0 || cursor + 8 + length > bytes.length) {
        throw new Error(`chunk ${fourcc} exceeds payload`);
      }
      if (["VP8 ", "VP8L", "VP8X"].includes(fourcc)) imageChunk = true;
      cursor += 8 + length + (length % 2);
    }
    if (cursor !== bytes.length || !imageChunk) {
      throw new Error("image chunk population is invalid");
    }
  } catch (error) {
    throw new Error(`${label} WebP payload decode failed: ${String(error)}`);
  }
}

function imagePayloadWithoutGlbPadding(bytes, mimeType, label) {
  let payloadLength;
  if (mimeType === "image/png") {
    let cursor = 8;
    while (cursor + 12 <= bytes.length) {
      const length =
        (bytes[cursor] << 24) |
        (bytes[cursor + 1] << 16) |
        (bytes[cursor + 2] << 8) |
        bytes[cursor + 3];
      if (length < 0 || cursor + 12 + length > bytes.length) break;
      const type = Buffer.from(bytes.subarray(cursor + 4, cursor + 8)).toString("ascii");
      cursor += 12 + length;
      if (type === "IEND") {
        payloadLength = cursor;
        break;
      }
    }
  } else if (mimeType === "image/jpeg") {
    let end = bytes.length;
    while (end > 0 && bytes[end - 1] === 0 && bytes.length - end < 4) end -= 1;
    if (end >= 2 && bytes[end - 2] === 0xff && bytes[end - 1] === 0xd9) {
      payloadLength = end;
    }
  } else if (mimeType === "image/webp" && bytes.length >= 12) {
    const declared = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
    if (declared >= 4) payloadLength = declared + 8;
  }
  if (
    !Number.isSafeInteger(payloadLength) ||
    payloadLength <= 0 ||
    payloadLength > bytes.length ||
    bytes.length - payloadLength > 3 ||
    bytes.subarray(payloadLength).some((value) => value !== 0)
  ) {
    const format =
      mimeType === "image/png"
        ? "PNG"
        : mimeType === "image/jpeg"
          ? "JPEG"
          : mimeType === "image/webp"
            ? "WebP"
            : mimeType;
    throw new Error(`${label} ${format} payload decode failed: length/padding is invalid`);
  }
  return bytes.subarray(0, payloadLength);
}

function embeddedImageBytes(json, binary, image, label) {
  if (image.uri !== undefined) throw new Error(`${label} image has an external URI`);
  const view = json.bufferViews?.[image.bufferView];
  if (view?.buffer !== 0) throw new Error(`${label} image has no embedded bufferView`);
  if (view.target !== undefined) {
    throw new Error(`${label} image bufferView must not declare a GPU target`);
  }
  const start = view.byteOffset ?? 0;
  const end = start + view.byteLength;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(view.byteLength) ||
    end > binary.length
  ) {
    throw new Error(`${label} image exceeds its bufferView`);
  }
  const paddedBytes = binary.subarray(start, end);
  const bytes = imagePayloadWithoutGlbPadding(paddedBytes, image.mimeType, label);
  if (image.mimeType === "image/png") {
    validatePngContainer(bytes, label);
  } else if (image.mimeType === "image/jpeg") {
    validateJpegContainer(bytes, label);
  } else if (image.mimeType === "image/webp") {
    validateWebpContainer(bytes, label);
  } else {
    throw new Error(`${label} embedded image MIME type is unsupported`);
  }
  return { bytes, mimeType: image.mimeType };
}

function collectExtensionNames(value, result = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectExtensionNames(entry, result);
    return result;
  }
  if (!value || typeof value !== "object") return result;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "extensions" && entry && typeof entry === "object") {
      for (const extension of Object.keys(entry)) result.add(extension);
    }
    collectExtensionNames(entry, result);
  }
  return result;
}

export function validateGlb(bytes, job, source) {
  const parsed = parseGlb(bytes);
  const json = parsed.json;
  const binary = parsed.binary;
  const label = job.seedInput;
  if (
    source.job !== job ||
    source.file !== basename(job.relativeFile) ||
    source.relativeFile !== job.relativeFile ||
    job.outputPath !== job.relativeFile ||
    job.seed !== fnv1a32(job.seedInput) ||
    !job.relativeFile.endsWith(`/${job.seedInput}.glb`)
  ) {
    throw new Error(`${label} exact path/job contract changed`);
  }
  const actualHash = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  if (source.sha256 !== actualHash || source.bytes.byteLength !== bytes.byteLength) {
    throw new Error(`${label} byte/hash metadata changed`);
  }
  if (!/^[a-f0-9]{64}$/.test(source.installedExporterSha256)) {
    throw new Error(`${label} installed exporter hash is missing`);
  }

  const allowedExtensions = new Set([
    "KHR_materials_unlit",
    "KHR_texture_transform",
    "EXT_texture_webp",
  ]);
  const observedExtensions = collectExtensionNames(json);
  for (const extension of observedExtensions) {
    if (!allowedExtensions.has(extension)) {
      throw new Error(`${label} uses unsupported extension ${extension}`);
    }
    if (!(json.extensionsUsed ?? []).includes(extension)) {
      throw new Error(`${label} extension ${extension} is missing from extensionsUsed`);
    }
  }
  for (const extension of json.extensionsUsed ?? []) {
    if (!allowedExtensions.has(extension)) {
      throw new Error(`${label} uses unsupported extension ${extension}`);
    }
    if (!observedExtensions.has(extension)) {
      throw new Error(`${label} extensionsUsed declares absent extension ${extension}`);
    }
  }
  for (const extension of json.extensionsRequired ?? []) {
    if (
      !allowedExtensions.has(extension) ||
      !(json.extensionsUsed ?? []).includes(extension)
    ) {
      throw new Error(`${label} requires unsupported extension ${extension}`);
    }
    if (!observedExtensions.has(extension)) {
      throw new Error(`${label} required extension ${extension} is absent`);
    }
  }
  if (
    observedExtensions.has("EXT_texture_webp") &&
    !(json.extensionsRequired ?? []).includes("EXT_texture_webp")
  ) {
    throw new Error(`${label} EXT_texture_webp is missing from extensionsRequired`);
  }
  if (
    json.cameras?.length ||
    json.animations?.length ||
    json.skins?.length ||
    json.extensions?.KHR_lights_punctual
  ) {
    throw new Error(`${label} is not a static light/camera-free GLB`);
  }
  if (!Array.isArray(json.scenes) || json.scenes.length !== 1 || json.scene !== 0) {
    throw new Error(`${label} must contain one explicit default glTF Scene`);
  }
  const scene = json.scenes[0];
  const expectedTag = expectedAssetTag(job);
  if (stableJson(scene.extras?.gridworkLateEraAsset) !== stableJson(expectedTag)) {
    throw new Error(`${label} raw glTF Scene tag changed`);
  }
  if (!Array.isArray(scene.nodes) || scene.nodes.length === 0) {
    throw new Error(`${label} glTF Scene is empty`);
  }

  for (const [index, view] of (json.bufferViews ?? []).entries()) {
    const offset = view.byteOffset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset % 4 !== 0) {
      throw new Error(`${label} bufferView byteOffset alignment is invalid at ${index}`);
    }
    if (
      view.buffer !== 0 ||
      !Number.isSafeInteger(view.byteLength) ||
      view.byteLength <= 0 ||
      offset + view.byteLength > json.buffers[0].byteLength ||
      offset + view.byteLength > binary.length
    ) {
      throw new Error(`${label} bufferView ${index} is incoherent`);
    }
    if (
      view.byteStride !== undefined &&
      (!Number.isSafeInteger(view.byteStride) ||
        view.byteStride < 4 ||
        view.byteStride > 252 ||
        view.byteStride % 4 !== 0)
    ) {
      throw new Error(`${label} bufferView byteStride is invalid at ${index}`);
    }
    if (view.target !== undefined && ![34962, 34963].includes(view.target)) {
      throw new Error(`${label} bufferView ${index} target is invalid`);
    }
  }
  for (let index = 0; index < (json.accessors ?? []).length; index += 1) {
    readAccessor(json, binary, index, `${label} accessor ${index}`);
  }

  const materials = json.materials ?? [];
  if (materials.length !== source.materialCount || materials.length === 0) {
    throw new Error(`${label} material count changed`);
  }
  const materialSemantics = materials
    .map((material, index) => {
      if (!["OPAQUE", "MASK", "BLEND"].includes(material.alphaMode ?? "OPAQUE")) {
        throw new Error(`${label} material ${index} has invalid alphaMode`);
      }
      if (material.doubleSided !== undefined && typeof material.doubleSided !== "boolean") {
        throw new Error(`${label} material ${index} has invalid doubleSided`);
      }
      const record = material.extras?.gridworkMaterial;
      validateMaterialRecord(record, `${label} material ${index}`);
      validateActualMaterialEncoding(json, material, record, index, label);
      return record;
    })
    .sort((left, right) => left.sourceMaterialKey.localeCompare(right.sourceMaterialKey));
  const expectedSemantics = [...source.materialSemantics].sort((left, right) =>
    left.sourceMaterialKey.localeCompare(right.sourceMaterialKey),
  );
  if (stableJson(materialSemantics) !== stableJson(expectedSemantics)) {
    throw new Error(`${label} material semantic transport changed`);
  }
  const derivedToon = source.materialSemantics.filter((record) => record.kind === "toon");
  if (stableJson(source.toon) !== stableJson(derivedToon)) {
    throw new Error(`${label} toon subset metadata is not exact ordered deep equality`);
  }
  const toonCount = materialSemantics.filter((record) => record.kind === "toon").length;
  const unlitCount = materialSemantics.filter((record) => record.kind === "unlit").length;
  const baseMapRecords = materialSemantics.map((record) => record.baseMap).filter(Boolean);
  if (
    toonCount !== source.toonMaterialCount ||
    unlitCount !== source.unlitMaterialCount ||
    baseMapRecords.length !== source.baseMapCount
  ) {
    throw new Error(`${label} semantic material census changed`);
  }
  const samplerDigest = createHash("sha256")
    .update(stableJson(baseMapRecords))
    .digest("hex");
  if (samplerDigest !== source.samplerSemanticDigest) {
    throw new Error(`${label} sampler semantic digest changed`);
  }
  const anisotropyHistogram = {};
  for (const record of baseMapRecords) {
    const key = String(record.anisotropyRequested);
    anisotropyHistogram[key] = (anisotropyHistogram[key] ?? 0) + 1;
  }
  if (stableJson(anisotropyHistogram) !== stableJson(source.anisotropyHistogram)) {
    throw new Error(`${label} requested anisotropy changed`);
  }
  const colorSpaceRoles = {
    srgbColorMaps: baseMapRecords.filter((record) => record.colorSpace === "srgb").length,
    nonColorMaps:
      materialSemantics.filter((record) => record.gradient !== null).length +
      baseMapRecords.filter((record) => record.colorSpace !== "srgb").length,
  };
  if (stableJson(colorSpaceRoles) !== stableJson(source.colorSpaceRoles)) {
    throw new Error(`${label} color/non-color texture roles changed`);
  }

  for (const [index, image] of (json.images ?? []).entries()) {
    embeddedImageBytes(json, binary, image, `${label} image ${index}`);
  }
  if ((json.images?.length ?? 0) !== source.embeddedImageCount) {
    throw new Error(`${label} embedded image count changed`);
  }
  const validWrap = new Set([33071, 33648, 10497]);
  const validMag = new Set([9728, 9729]);
  const validMin = new Set([9728, 9729, 9984, 9985, 9986, 9987]);
  for (const [index, sampler] of (json.samplers ?? []).entries()) {
    if (
      (sampler.wrapS !== undefined && !validWrap.has(sampler.wrapS)) ||
      (sampler.wrapT !== undefined && !validWrap.has(sampler.wrapT)) ||
      (sampler.magFilter !== undefined && !validMag.has(sampler.magFilter)) ||
      (sampler.minFilter !== undefined && !validMin.has(sampler.minFilter))
    ) {
      throw new Error(`${label} sampler ${index} is invalid`);
    }
  }
  for (const [index, texture] of (json.textures ?? []).entries()) {
    const sourceIndex = textureImageIndex(texture);
    if (
      !Number.isSafeInteger(sourceIndex) ||
      !json.images?.[sourceIndex] ||
      !Number.isSafeInteger(texture.sampler) ||
      !json.samplers?.[texture.sampler]
    ) {
      throw new Error(`${label} texture ${index} has an invalid image/sampler reference`);
    }
    const usesWebp = texture.extensions?.EXT_texture_webp !== undefined;
    if (usesWebp !== (json.images[sourceIndex].mimeType === "image/webp")) {
      throw new Error(`${label} texture ${index} WebP extension linkage is invalid`);
    }
    if (usesWebp && texture.source !== undefined) {
      throw new Error(`${label} texture ${index} has ambiguous WebP/core image linkage`);
    }
  }

  const sceneNodeSet = new Set();
  const parentByNode = new Map();
  const visitNode = (nodeIndex, ancestors, parent) => {
    if (!Number.isSafeInteger(nodeIndex) || !json.nodes?.[nodeIndex]) {
      throw new Error(`${label} Scene references a missing node`);
    }
    if (ancestors.has(nodeIndex)) throw new Error(`${label} node graph contains a cycle`);
    if (parentByNode.has(nodeIndex)) {
      throw new Error(`${label} node graph gives node ${nodeIndex} multiple parents`);
    }
    parentByNode.set(nodeIndex, parent);
    sceneNodeSet.add(nodeIndex);
    const node = json.nodes[nodeIndex];
    if (
      node.camera !== undefined ||
      node.skin !== undefined ||
      node.extensions?.KHR_lights_punctual
    ) {
      throw new Error(`${label} node is not static`);
    }
    if (
      node.translation !== undefined ||
      node.rotation !== undefined ||
      node.scale !== undefined ||
      (node.matrix !== undefined &&
        stableJson(node.matrix) !==
          stableJson([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
    ) {
      throw new Error(`${label} exported root is not world-baked identity geometry`);
    }
    const next = new Set(ancestors);
    next.add(nodeIndex);
    for (const child of node.children ?? []) visitNode(child, next, nodeIndex);
  };
  for (const node of scene.nodes) visitNode(node, new Set(), "scene");
  if (sceneNodeSet.size !== (json.nodes?.length ?? 0)) {
    throw new Error(`${label} node graph contains unreachable nodes`);
  }

  let meshCount = 0;
  let primitiveCount = 0;
  let vertexCount = 0;
  let triangleTotal = 0;
  const glbMin = [Infinity, Infinity, Infinity];
  const glbMax = [-Infinity, -Infinity, -Infinity];
  const nonDefaultOrders = [];
  for (const nodeIndex of sceneNodeSet) {
    const node = json.nodes[nodeIndex];
    if (node.extras?.gridworkRenderOrder !== undefined) {
      if (
        !Number.isSafeInteger(node.extras.gridworkRenderOrder) ||
        node.extras.gridworkRenderOrder === 0
      ) {
        throw new Error(`${label} node render-order extra is invalid`);
      }
      nonDefaultOrders.push(node.extras.gridworkRenderOrder);
    }
    if (node.mesh === undefined) continue;
    const mesh = json.meshes?.[node.mesh];
    if (!mesh || !Array.isArray(mesh.primitives) || mesh.primitives.length === 0) {
      throw new Error(`${label} node references an empty mesh`);
    }
    meshCount += 1;
    for (const primitive of mesh.primitives) {
      primitiveCount += 1;
      if ((primitive.mode ?? 4) !== 4)
        throw new Error(`${label} contains non-triangle geometry`);
      if (primitive.targets?.length) throw new Error(`${label} contains morph targets`);
      if (
        primitive.extensions?.KHR_draco_mesh_compression ||
        primitive.extensions?.EXT_meshopt_compression
      ) {
        throw new Error(`${label} contains compressed geometry`);
      }
      if (!materials[primitive.material])
        throw new Error(`${label} primitive material is invalid`);
      const position = readAccessor(
        json,
        binary,
        primitive.attributes?.POSITION,
        `${label} POSITION`,
      );
      const normal = readAccessor(
        json,
        binary,
        primitive.attributes?.NORMAL,
        `${label} NORMAL`,
      );
      validateAttributeAccessorEncoding("POSITION", position, label);
      validateAttributeAccessorEncoding("NORMAL", normal, label);
      if (
        position.components !== 3 ||
        normal.components !== 3 ||
        normal.accessor.count !== position.accessor.count
      ) {
        throw new Error(`${label} POSITION/NORMAL counts are incoherent`);
      }
      vertexCount += position.accessor.count;
      for (const [semantic, accessorIndex] of Object.entries(primitive.attributes ?? {})) {
        const attribute = readAccessor(json, binary, accessorIndex, `${label} ${semantic}`);
        validateAttributeAccessorEncoding(semantic, attribute, label);
        if (attribute.accessor.count !== position.accessor.count) {
          throw new Error(`${label} attribute counts are incoherent`);
        }
      }
      const material = materials[primitive.material];
      if (
        material.pbrMetallicRoughness?.baseColorTexture &&
        primitive.attributes?.TEXCOORD_0 === undefined
      ) {
        throw new Error(`${label} textured primitive has no UVs`);
      }
      let elements = position.accessor.count;
      if (primitive.indices !== undefined) {
        const indices = readAccessor(json, binary, primitive.indices, `${label} indices`);
        validateIndexAccessorEncoding(indices, label);
        if (
          indices.components !== 1 ||
          ![5121, 5123, 5125].includes(indices.accessor.componentType) ||
          indices.values.some((value) => value < 0 || value >= position.accessor.count)
        ) {
          throw new Error(`${label} primitive indices are out of range`);
        }
        elements = indices.accessor.count;
      }
      if (elements % 3 !== 0)
        throw new Error(`${label} primitive triangle count is fractional`);
      triangleTotal += elements / 3;
      const decodedBounds = decodedVectorBounds(
        position.values,
        position.components,
        `${label} POSITION`,
      );
      assertDecodedBoundsEqual(position.accessor, decodedBounds, `${label} POSITION`);
      const minimum = decodedBounds.min;
      const maximum = decodedBounds.max;
      for (let axis = 0; axis < 3; axis += 1) {
        if (maximum[axis] < minimum[axis])
          throw new Error(`${label} POSITION bounds are inverted`);
        glbMin[axis] = Math.min(glbMin[axis], minimum[axis]);
        glbMax[axis] = Math.max(glbMax[axis], maximum[axis]);
      }
    }
  }
  if (!meshCount || !primitiveCount || !vertexCount || !triangleTotal) {
    throw new Error(`${label} has an empty geometry population`);
  }
  if (meshCount !== source.shippedMeshes || meshCount > source.sourceMeshes) {
    throw new Error(`${label} mesh nonincrease invariant changed`);
  }
  if (
    triangleTotal !== source.shippedTriangles ||
    source.shippedTriangles !== source.sourceTriangles
  ) {
    throw new Error(`${label} triangle equality invariant changed`);
  }
  if (nonDefaultOrders.length !== source.nonDefaultRenderOrderCount) {
    throw new Error(`${label} non-default render-order census changed`);
  }
  if (
    job.definition === "vertfarm" &&
    job.stage === "built" &&
    !nonDefaultOrders.includes(3)
  ) {
    throw new Error(`${label} Vertical Farm renderOrder 3 is missing`);
  }
  const semanticDigest = createHash("sha256")
    .update(stableJson({ materialSemantics, nodeOrders: nonDefaultOrders }))
    .digest("hex");
  if (semanticDigest !== source.semanticDigest) {
    throw new Error(`${label} canonical semantic digest changed`);
  }

  const sourceBounds = assertBoundsRecord(source.sourceBounds, `${label} source bounds`);
  const shippedBounds = assertBoundsRecord(source.shippedBounds, `${label} shipped bounds`);
  assertBoundsEqual(sourceBounds, shippedBounds, `${label} source/shipped bounds`);
  const glbBounds = {
    min: glbMin,
    max: glbMax,
    size: glbMax.map((value, axis) => value - glbMin[axis]),
  };
  assertBoundsEqual(shippedBounds, glbBounds, `${label} GLB/shipped bounds`);
  return Object.freeze({
    file: source.relativeFile,
    meshes: meshCount,
    primitives: primitiveCount,
    vertices: vertexCount,
    triangles: triangleTotal,
    materials: materials.length,
    images: json.images?.length ?? 0,
    valid: true,
  });
}

function assertStableMetadataInput(value, path = "metadata input") {
  if (ArrayBuffer.isView(value)) return;
  if (typeof value === "string") {
    if (/^(?:\/|[A-Za-z]:[\\/])/.test(value)) {
      throw new Error(`metadata input contains an absolute path at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  const unstableKeys = new Set([
    "timestamp",
    "createdAt",
    "generatedAt",
    "pid",
    "hostname",
    "host",
    "browserProfile",
    "browserProfilePath",
    "userDataDir",
  ]);
  for (const [key, entry] of Object.entries(value)) {
    if (unstableKeys.has(key)) throw new Error(`unstable metadata key ${key}`);
    assertStableMetadataInput(entry, `${path}.${key}`);
  }
}

function sortedRecord(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function metadataAggregate(outputs) {
  const sum = (field) => outputs.reduce((total, output) => total + output[field], 0);
  return {
    bytes: outputs.reduce((total, output) => total + output.bytes.byteLength, 0),
    sourceMeshes: sum("sourceMeshes"),
    shippedMeshes: sum("shippedMeshes"),
    sourceTriangles: sum("sourceTriangles"),
    shippedTriangles: sum("shippedTriangles"),
    materials: sum("materialCount"),
    toonMaterials: sum("toonMaterialCount"),
    unlitMaterials: sum("unlitMaterialCount"),
    baseMaps: sum("baseMapCount"),
    textures: sum("textureCount"),
    embeddedImages: sum("embeddedImageCount"),
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function buildMetadata(input) {
  assertStableMetadataInput(input);
  exactObjectKeys(
    input,
    ["outputs", "fidelity", "legacyEncoding", "orderedImages"],
    "metadata build input",
  );
  if (!Array.isArray(input.outputs) || input.outputs.length !== 87) {
    throw new Error("metadata requires exactly 87 outputs");
  }
  const orderedPaths = input.outputs.map((output) => output.relativeFile);
  if (
    stableJson(orderedPaths) !==
    stableJson([...orderedPaths].sort((left, right) => left.localeCompare(right)))
  ) {
    throw new Error("metadata outputs are not sorted by repository-relative path");
  }
  if (new Set(orderedPaths).size !== 87)
    throw new Error("metadata output paths are not unique");
  const planned = deriveExportJobs();
  const plannedByPath = new Map(planned.map((job) => [job.relativeFile, job]));
  if (
    stableJson([...plannedByPath.keys()].sort()) !== stableJson([...orderedPaths].sort())
  ) {
    throw new Error("metadata output paths do not equal the exact export plan");
  }
  if (
    input.orderedImages?.strategy !== "serialized invocation order" ||
    !/^[a-f0-9]{64}$/.test(input.orderedImages.installedExporterSha256 ?? "")
  ) {
    throw new Error("metadata ordered-image contract is invalid");
  }
  const installedExporterSha256 = input.orderedImages.installedExporterSha256;
  if (
    input.outputs.some(
      (output) => output.installedExporterSha256 !== installedExporterSha256,
    )
  ) {
    throw new Error("installed exporter hash disagreement across outputs");
  }
  if (
    input.legacyEncoding?.bridgeVersion !== 1 ||
    input.legacyEncoding.acceptedAssignments !== CANONICAL_LEGACY_ASSIGNMENTS ||
    input.legacyEncoding.unsupportedAssignments !== 0
  ) {
    throw new Error("metadata legacy encoding census is invalid");
  }
  if (
    input.fidelity?.files !== 87 ||
    input.fidelity.alphaMismatches !== 0 ||
    !Number.isFinite(input.fidelity.worstMeanRgbByteError) ||
    input.fidelity.worstMeanRgbByteError < 0 ||
    input.fidelity.worstMeanRgbByteError > 0.5 ||
    !Number.isFinite(input.fidelity.worstP99RgbByteError) ||
    input.fidelity.worstP99RgbByteError < 0 ||
    input.fidelity.worstP99RgbByteError > 2 ||
    !/^[a-f0-9]{64}$/.test(input.fidelity.resultsDigest ?? "")
  ) {
    throw new Error("metadata fidelity result is invalid");
  }

  const rows = input.outputs.map((output, index) => {
    exactObjectKeys(
      output,
      [
        "job",
        "file",
        "relativeFile",
        "era",
        "kind",
        "stage",
        "runtimeId",
        "runtimeEra",
        "bytes",
        "sha256",
        "sourceMeshes",
        "shippedMeshes",
        "sourceTriangles",
        "shippedTriangles",
        "sourceBounds",
        "shippedBounds",
        "materialCount",
        "toonMaterialCount",
        "unlitMaterialCount",
        "baseMapCount",
        "textureCount",
        "embeddedImageCount",
        "anisotropyHistogram",
        "samplerSemanticDigest",
        "colorSpaceRoles",
        "materialSemantics",
        "toon",
        "nonDefaultRenderOrderCount",
        "semanticDigest",
        "installedExporterSha256",
      ],
      "metadata export result",
    );
    const job = plannedByPath.get(output.relativeFile);
    if (!job) throw new Error(`metadata output ${index} is not planned`);
    if (
      output.file !== basename(job.relativeFile) ||
      output.era !== job.era ||
      output.kind !== job.kind ||
      output.stage !== job.stage ||
      output.runtimeId !== job.runtimeId ||
      output.runtimeEra !== job.runtimeEra ||
      output.job?.relativeFile !== job.relativeFile ||
      output.job?.seedInput !== job.seedInput ||
      output.job?.seed !== job.seed
    ) {
      throw new Error(`metadata output identity changed for ${job.seedInput}`);
    }
    const bytes = Buffer.from(output.bytes);
    if (
      bytes.byteLength <= 0 ||
      output.sha256 !== createHash("sha256").update(bytes).digest("hex")
    ) {
      throw new Error(`metadata output byte/hash mismatch for ${job.seedInput}`);
    }
    if (
      !Number.isSafeInteger(output.sourceMeshes) ||
      !Number.isSafeInteger(output.shippedMeshes) ||
      output.sourceMeshes <= 0 ||
      output.shippedMeshes <= 0 ||
      output.shippedMeshes > output.sourceMeshes ||
      !Number.isSafeInteger(output.sourceTriangles) ||
      output.sourceTriangles <= 0 ||
      output.shippedTriangles !== output.sourceTriangles ||
      output.materialCount !== output.materialSemantics.length ||
      output.toonMaterialCount + output.unlitMaterialCount !== output.materialCount ||
      output.toon.length !== output.toonMaterialCount ||
      !/^[a-f0-9]{64}$/.test(output.samplerSemanticDigest) ||
      !/^[a-f0-9]{64}$/.test(output.semanticDigest)
    ) {
      throw new Error(`metadata output census changed for ${job.seedInput}`);
    }
    assertBoundsRecord(output.sourceBounds, `${job.seedInput} source bounds`);
    assertBoundsRecord(output.shippedBounds, `${job.seedInput} shipped bounds`);
    assertBoundsEqual(
      output.sourceBounds,
      output.shippedBounds,
      `${job.seedInput} metadata bounds`,
    );
    for (const [materialIndex, semantic] of output.materialSemantics.entries()) {
      validateMaterialRecord(semantic, `${job.seedInput} semantic ${materialIndex}`);
    }
    const materialSemantics = [...output.materialSemantics].sort((left, right) =>
      left.sourceMaterialKey.localeCompare(right.sourceMaterialKey),
    );
    if (stableJson(materialSemantics) !== stableJson(output.materialSemantics)) {
      throw new Error(`metadata material semantics are not sorted for ${job.seedInput}`);
    }
    const derivedToon = materialSemantics.filter((semantic) => semantic.kind === "toon");
    if (stableJson(output.toon) !== stableJson(derivedToon)) {
      throw new Error(
        `metadata toon subset is not exact ordered deep equality for ${job.seedInput}`,
      );
    }
    return {
      file: job.relativeFile,
      era: job.era,
      definition: job.definition,
      tab: job.tab,
      title: job.title,
      target: job.target,
      sourceFootprint: job.sourceFootprint,
      ordinal: job.ordinal,
      kind: job.kind,
      runtimeId: job.runtimeId,
      runtimeEra: job.runtimeEra,
      stage: job.stage,
      runtimeFootprint: {
        w: job.runtimeFootprint.w,
        d: job.runtimeFootprint.d,
      },
      seedInput: job.seedInput,
      seed: job.seed,
      sha256: output.sha256,
      bytes: bytes.byteLength,
      sourceMeshes: output.sourceMeshes,
      shippedMeshes: output.shippedMeshes,
      sourceTriangles: output.sourceTriangles,
      shippedTriangles: output.shippedTriangles,
      materialCount: output.materialCount,
      toonMaterialCount: output.toonMaterialCount,
      unlitMaterialCount: output.unlitMaterialCount,
      baseMapCount: output.baseMapCount,
      textureCount: output.textureCount,
      embeddedImageCount: output.embeddedImageCount,
      anisotropyHistogram: sortedRecord(output.anisotropyHistogram),
      samplerSemanticDigest: output.samplerSemanticDigest,
      colorSpaceRoles: {
        srgbColorMaps: output.colorSpaceRoles.srgbColorMaps,
        nonColorMaps: output.colorSpaceRoles.nonColorMaps,
      },
      materialSemantics,
      toon: derivedToon,
      nonDefaultRenderOrderCount: output.nonDefaultRenderOrderCount,
      semanticDigest: output.semanticDigest,
      sourceBounds: {
        min: [...output.sourceBounds.min],
        max: [...output.sourceBounds.max],
        size: [...output.sourceBounds.size],
      },
      shippedBounds: {
        min: [...output.shippedBounds.min],
        max: [...output.shippedBounds.max],
        size: [...output.shippedBounds.size],
      },
    };
  });
  const byEraOutputs = Object.fromEntries(
    ["atomic_age", "information_age", "cyberpunk"].map((era) => [
      era,
      input.outputs.filter((output) => output.era === era),
    ]),
  );
  for (const [era, expectedCount] of [
    ["atomic_age", 32],
    ["information_age", 23],
    ["cyberpunk", 32],
  ]) {
    const population = byEraOutputs[era];
    if (
      population.length !== expectedCount ||
      population.reduce((sum, output) => sum + output.toonMaterialCount, 0) <= 0 ||
      population.reduce((sum, output) => sum + output.unlitMaterialCount, 0) <= 0
    ) {
      throw new Error(`${era} metadata semantic/output floor changed`);
    }
  }
  const census = {
    definitions: 39,
    outputs: 87,
    byEra: {
      atomic_age: { definitions: 14, outputs: 32 },
      information_age: { definitions: 11, outputs: 23 },
      cyberpunk: { definitions: 14, outputs: 32 },
    },
    byKind: {
      skill: rows.filter((row) => row.kind === "skill").length,
      civic: rows.filter((row) => row.kind === "civic").length,
      townhall: rows.filter((row) => row.kind === "townhall").length,
    },
  };
  if (stableJson(census.byKind) !== stableJson({ skill: 72, civic: 12, townhall: 3 })) {
    throw new Error("metadata category census changed");
  }
  const document = {
    schema: 1,
    source: {
      repositoryPath:
        "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html",
      bytes: SOURCE_CONTRACT.bytes,
      sha256: SOURCE_CONTRACT.sha256,
      manifestCount: SOURCE_CONTRACT.manifestCount,
      resources: {
        three: SOURCE_CONTRACT.resources.three,
        atomic_age: SOURCE_CONTRACT.resources.atomic_age,
        information_age: SOURCE_CONTRACT.resources.information_age,
        cyberpunk: SOURCE_CONTRACT.resources.cyberpunk,
      },
      decodedKitBytes: {
        atomic_age: SOURCE_CONTRACT.decodedKitBytes.atomic_age,
        information_age: SOURCE_CONTRACT.decodedKitBytes.information_age,
        cyberpunk: SOURCE_CONTRACT.decodedKitBytes.cyberpunk,
      },
      directRandomCalls: {
        atomic_age: 21,
        information_age: 29,
        cyberpunk: 5,
      },
    },
    generator: "scripts/export-era8-10-building-models.mjs",
    bare: true,
    seed: {
      hash: "fnv1a32",
      generator: "mulberry32",
      input: "output basename without .glb",
    },
    orderedImages: {
      strategy: "serialized invocation order",
      installedExporterSha256,
    },
    batching: "world-transform + exact material/index/attribute/render-order signature",
    semanticTransport: {
      asset: "gridworkLateEraAsset",
      material: "gridworkMaterial",
      version: 1,
    },
    legacyEncoding: {
      bridgeVersion: 1,
      acceptedAssignments: input.legacyEncoding.acceptedAssignments,
      unsupportedAssignments: 0,
    },
    census,
    fidelity: {
      files: 87,
      alphaMismatches: 0,
      worstMeanRgbByteError: input.fidelity.worstMeanRgbByteError,
      worstP99RgbByteError: input.fidelity.worstP99RgbByteError,
      resultsDigest: input.fidelity.resultsDigest,
    },
    outputs: rows,
    aggregates: {
      byEra: {
        atomic_age: metadataAggregate(byEraOutputs.atomic_age),
        information_age: metadataAggregate(byEraOutputs.information_age),
        cyberpunk: metadataAggregate(byEraOutputs.cyberpunk),
      },
      global: metadataAggregate(input.outputs),
    },
  };
  assertStableMetadataInput(document);
  return deepFreeze(document);
}

const ART_RELATIVE_ROOT = "apps/web/src/city/art";
const MODELS_RELATIVE_ROOT = `${ART_RELATIVE_ROOT}/models`;
const BUILDING_SOURCES_RELATIVE_ROOT = `${ART_RELATIVE_ROOT}/building-sources`;
const METADATA_RELATIVE_PATH = `${BUILDING_SOURCES_RELATIVE_ROOT}/era-08-10-gridwork-export-metadata.json`;
const GENERATED_MANIFEST_RELATIVE_PATH = `${ART_RELATIVE_ROOT}/era8To10AssetManifest.generated.ts`;
const DESTINATION_LOCK_BASENAME = ".era8-10-export.lock";
const DESTINATION_LOCK_OWNER_BASENAME = "owner.json";
const RELEASE_NONCE_PATTERN = /^[a-f0-9]{32}$/;
const METADATA_OUTPUT_KEYS = Object.freeze([
  "file",
  "era",
  "definition",
  "tab",
  "title",
  "target",
  "sourceFootprint",
  "ordinal",
  "kind",
  "runtimeId",
  "runtimeEra",
  "stage",
  "runtimeFootprint",
  "seedInput",
  "seed",
  "sha256",
  "bytes",
  "sourceMeshes",
  "shippedMeshes",
  "sourceTriangles",
  "shippedTriangles",
  "materialCount",
  "toonMaterialCount",
  "unlitMaterialCount",
  "baseMapCount",
  "textureCount",
  "embeddedImageCount",
  "anisotropyHistogram",
  "samplerSemanticDigest",
  "colorSpaceRoles",
  "materialSemantics",
  "toon",
  "nonDefaultRenderOrderCount",
  "semanticDigest",
  "sourceBounds",
  "shippedBounds",
]);

function isMissing(error) {
  return error && typeof error === "object" && error.code === "ENOENT";
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function assertContainedPath(root, path, label) {
  const rootPath = resolve(root);
  const targetPath = resolve(path);
  const fromRoot = relative(rootPath, targetPath);
  if (
    fromRoot === "" ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    resolve(rootPath, fromRoot) !== targetPath
  ) {
    throw new Error(`${label} escapes ${rootPath}`);
  }
  return targetPath;
}

function repositoryRootForDestination(destinationRoot) {
  const segments = ART_RELATIVE_ROOT.split("/");
  const repositoryRoot = resolve(destinationRoot, ...segments.map(() => ".."));
  if (resolve(repositoryRoot, ...segments) !== resolve(destinationRoot)) {
    throw new Error(
      `destination root must end with the canonical ${ART_RELATIVE_ROOT} path`,
    );
  }
  return repositoryRoot;
}

function stageRootForEntry(entry) {
  if (
    typeof entry?.relativeFile !== "string" ||
    typeof entry?.stagedPath !== "string" ||
    entry.relativeFile.includes("\\")
  ) {
    throw new Error("publication entry has an invalid staged path");
  }
  const suffix = entry.relativeFile.split("/").join(sep);
  const stagedPath = resolve(entry.stagedPath);
  const marker = `${sep}${suffix}`;
  if (!stagedPath.endsWith(marker)) {
    throw new Error(`${entry.relativeFile} is outside its invocation-owned stage`);
  }
  return stagedPath.slice(0, -marker.length);
}

function assertCanonicalJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length !== 87) {
    throw new Error("release-owned path population must contain exactly 87 jobs");
  }
  const actual = jobs.map((job) => job?.relativeFile);
  const canonical = deriveExportJobs().map((job) => job.relativeFile);
  if (
    actual.some(
      (path) =>
        typeof path !== "string" ||
        path.includes("\\") ||
        !path.startsWith(`${MODELS_RELATIVE_ROOT}/`) ||
        !path.endsWith(".glb") ||
        path
          .split("/")
          .some((segment) => segment === "" || segment === "." || segment === ".."),
    ) ||
    stableJson(sortedUnique(actual)) !== stableJson(sortedUnique(canonical)) ||
    new Set(actual).size !== 87
  ) {
    throw new Error("release-owned path population changed or contains an escape");
  }
  return actual;
}

export function expectedReleaseOwnedPaths(jobs) {
  return Object.freeze(
    [...assertCanonicalJobs(jobs), METADATA_RELATIVE_PATH].sort((left, right) =>
      left.localeCompare(right),
    ),
  );
}

function tempSiblingFor(relativePath, nonce) {
  return `${dirname(relativePath)}/.${basename(relativePath)}.era8-10-${nonce}.tmp`;
}

function exactTemporaryOwner(relativePath, expected) {
  for (const expectedPath of expected) {
    if (dirname(relativePath) !== dirname(expectedPath)) continue;
    const prefix = `.${basename(expectedPath)}.era8-10-`;
    const name = basename(relativePath);
    if (!name.startsWith(prefix) || !name.endsWith(".tmp")) continue;
    const nonce = name.slice(prefix.length, -".tmp".length);
    if (
      RELEASE_NONCE_PATTERN.test(nonce) &&
      relativePath === tempSiblingFor(expectedPath, nonce)
    ) {
      return expectedPath;
    }
  }
  return null;
}

function isReleaseCandidate(relativePath, expected) {
  const name = basename(relativePath);
  return expected.some((expectedPath) => {
    const expectedName = basename(expectedPath);
    const stem = expectedName.endsWith(".glb")
      ? expectedName.slice(0, -".glb".length)
      : expectedName.slice(0, -".json".length);
    return (
      name.startsWith(stem) ||
      name.startsWith(`.${expectedName}.era8-10-`) ||
      name.startsWith(`.${stem}`)
    );
  });
}

async function optionalLstat(path, io) {
  try {
    return await io.lstat(path, { bigint: true });
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

export async function classifyReleaseOwnedPaths(repositoryRoot, jobs, io) {
  const expected = expectedReleaseOwnedPaths(jobs);
  const expectedSet = new Set(expected);
  const owned = [];
  const tempSiblings = [];
  const unknownCandidates = [];
  const unrelated = [];
  const visit = async (relativeDirectory) => {
    const absoluteDirectory = resolve(repositoryRoot, ...relativeDirectory.split("/"));
    const directoryStat = await optionalLstat(absoluteDirectory, io);
    if (directoryStat === null) return;
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
      if (isReleaseCandidate(relativeDirectory, expected)) {
        unknownCandidates.push(relativeDirectory);
      } else {
        unrelated.push(relativeDirectory);
      }
      return;
    }
    const names = await io.readdir(absoluteDirectory);
    for (const name of [...names].sort((left, right) => left.localeCompare(right))) {
      const relativePath = `${relativeDirectory}/${name}`;
      const absolutePath = assertContainedPath(
        repositoryRoot,
        resolve(absoluteDirectory, name),
        `classified path ${relativePath}`,
      );
      const entry = await io.lstat(absolutePath, { bigint: true });
      if (expectedSet.has(relativePath)) {
        if (entry.isFile() && !entry.isSymbolicLink()) owned.push(relativePath);
        else unknownCandidates.push(relativePath);
        continue;
      }
      if (exactTemporaryOwner(relativePath, expected) !== null) {
        if (entry.isFile() && !entry.isSymbolicLink()) tempSiblings.push(relativePath);
        else unknownCandidates.push(relativePath);
        continue;
      }
      if (isReleaseCandidate(relativePath, expected)) {
        unknownCandidates.push(relativePath);
        continue;
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        await visit(relativePath);
        continue;
      }
      unrelated.push(relativePath);
    }
  };

  await visit(MODELS_RELATIVE_ROOT);
  await visit(BUILDING_SOURCES_RELATIVE_ROOT);
  const generatedPath = resolve(
    repositoryRoot,
    ...GENERATED_MANIFEST_RELATIVE_PATH.split("/"),
  );
  const generatedStat = await optionalLstat(generatedPath, io);
  let generatedManifest = null;
  if (generatedStat !== null) {
    if (generatedStat.isFile() && !generatedStat.isSymbolicLink()) {
      generatedManifest = GENERATED_MANIFEST_RELATIVE_PATH;
    } else {
      unknownCandidates.push(GENERATED_MANIFEST_RELATIVE_PATH);
    }
  }
  return Object.freeze({
    expected,
    owned: Object.freeze(sortedUnique(owned)),
    tempSiblings: Object.freeze(sortedUnique(tempSiblings)),
    generatedManifest,
    unknownCandidates: Object.freeze(sortedUnique(unknownCandidates)),
    unrelated: Object.freeze(sortedUnique(unrelated)),
  });
}

function validateMetadataDocument(metadata, jobs) {
  exactObjectKeys(
    metadata,
    [
      "schema",
      "source",
      "generator",
      "bare",
      "seed",
      "orderedImages",
      "batching",
      "semanticTransport",
      "legacyEncoding",
      "census",
      "fidelity",
      "outputs",
      "aggregates",
    ],
    "production metadata",
  );
  if (
    metadata.schema !== 1 ||
    metadata.generator !== "scripts/export-era8-10-building-models.mjs" ||
    metadata.bare !== true ||
    metadata.source?.repositoryPath !==
      "apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html" ||
    metadata.source?.bytes !== SOURCE_CONTRACT.bytes ||
    metadata.source?.sha256 !== SOURCE_CONTRACT.sha256 ||
    metadata.source?.manifestCount !== SOURCE_CONTRACT.manifestCount
  ) {
    throw new Error("production metadata source/schema contract changed");
  }
  const expectedCensus = {
    definitions: 39,
    outputs: 87,
    byEra: {
      atomic_age: { definitions: 14, outputs: 32 },
      information_age: { definitions: 11, outputs: 23 },
      cyberpunk: { definitions: 14, outputs: 32 },
    },
    byKind: { skill: 72, civic: 12, townhall: 3 },
  };
  if (stableJson(metadata.census) !== stableJson(expectedCensus)) {
    throw new Error("production metadata census is not the exact 39/87 population");
  }
  if (
    metadata.fidelity?.files !== 87 ||
    metadata.fidelity?.alphaMismatches !== 0 ||
    !Array.isArray(metadata.outputs) ||
    metadata.outputs.length !== 87
  ) {
    throw new Error("production metadata fidelity/output census is invalid");
  }
  const canonicalByPath = new Map(deriveExportJobs().map((job) => [job.relativeFile, job]));
  const expectedGlbs = expectedReleaseOwnedPaths(jobs).filter((path) =>
    path.endsWith(".glb"),
  );
  const outputPaths = metadata.outputs.map((row) => row?.file);
  if (
    stableJson(outputPaths) !==
      stableJson(
        [...outputPaths].sort((left, right) => String(left).localeCompare(String(right))),
      ) ||
    stableJson(outputPaths) !== stableJson(expectedGlbs) ||
    new Set(outputPaths).size !== 87
  ) {
    throw new Error("production metadata output path census is not exact and sorted");
  }
  for (const [index, row] of metadata.outputs.entries()) {
    exactObjectKeys(row, METADATA_OUTPUT_KEYS, `production metadata output ${index}`);
    const job = canonicalByPath.get(row.file);
    if (
      !job ||
      row.era !== job.era ||
      row.definition !== job.definition ||
      row.kind !== job.kind ||
      row.runtimeId !== job.runtimeId ||
      row.runtimeEra !== job.runtimeEra ||
      row.stage !== job.stage ||
      row.seedInput !== job.seedInput ||
      row.seed !== job.seed ||
      !/^[a-f0-9]{64}$/.test(row.sha256 ?? "") ||
      !Number.isSafeInteger(row.bytes) ||
      row.bytes <= 0
    ) {
      throw new Error(`production metadata output identity/hash is invalid at ${index}`);
    }
  }
  return metadata.outputs;
}

function parseMetadataBytes(bytes, jobs) {
  let metadata;
  try {
    metadata = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`production metadata JSON parse failed: ${String(error)}`);
  }
  validateMetadataDocument(metadata, jobs);
  return metadata;
}

let generatedManifestContractPromise;
function loadGeneratedManifestContract() {
  if (!generatedManifestContractPromise) {
    generatedManifestContractPromise = import(
      new URL("./generate-era8-10-asset-manifest.mjs", import.meta.url).href
    );
  }
  return generatedManifestContractPromise;
}

export async function validateProductionManifest(repositoryRoot, io, options = {}) {
  const phase = options.phase ?? "final";
  if (phase !== "final" && phase !== "pre-generation-publication") {
    throw new Error(`unknown production manifest validation phase: ${String(phase)}`);
  }
  const jobs = deriveExportJobs();
  const inventory = await classifyReleaseOwnedPaths(repositoryRoot, jobs, io);
  if (inventory.unknownCandidates.length > 0) {
    throw new Error(
      `production contains unknown candidate paths: ${inventory.unknownCandidates.join(", ")}`,
    );
  }
  if (inventory.tempSiblings.length > 0) {
    throw new Error(
      `production contains an incomplete temporary sibling: ${inventory.tempSiblings.join(", ")}`,
    );
  }
  if (stableJson(inventory.owned) !== stableJson(inventory.expected)) {
    const missing = inventory.expected.filter((path) => !inventory.owned.includes(path));
    throw new Error(`production is missing release-owned paths: ${missing.join(", ")}`);
  }
  const metadataPath = resolve(repositoryRoot, ...METADATA_RELATIVE_PATH.split("/"));
  const metadata = parseMetadataBytes(await io.readFile(metadataPath), jobs);
  const mismatches = [];
  for (const row of metadata.outputs) {
    const path = assertContainedPath(
      repositoryRoot,
      resolve(repositoryRoot, ...row.file.split("/")),
      `metadata output ${row.file}`,
    );
    const pathStat = await io.lstat(path, { bigint: true });
    if (!pathStat.isFile() || pathStat.isSymbolicLink()) {
      throw new Error(`${row.file} is not a regular production GLB`);
    }
    const bytes = await io.readFile(path);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== row.bytes || digest !== row.sha256) {
      mismatches.push(
        `${row.file}: byte count/hash ${bytes.byteLength}/${digest} != ${row.bytes}/${row.sha256}`,
      );
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`production manifest hash mismatch: ${mismatches.join("; ")}`);
  }
  if (inventory.generatedManifest === null && phase === "final") {
    throw new Error(
      `generated manifest is required for final production validation: ${GENERATED_MANIFEST_RELATIVE_PATH}`,
    );
  }
  if (inventory.generatedManifest !== null) {
    const generatedSource = await io.readFile(
      resolve(repositoryRoot, ...inventory.generatedManifest.split("/")),
      "utf8",
    );
    const { parseEra8To10AssetManifestSource, renderEra8To10AssetManifest } =
      await loadGeneratedManifestContract();
    let generatedManifest;
    try {
      generatedManifest = parseEra8To10AssetManifestSource(generatedSource);
    } catch (error) {
      throw new Error(
        `generated manifest value import/source census rejected by strict parser: ${String(
          error,
        )}`,
      );
    }
    const canonicalSource = renderEra8To10AssetManifest({ metadata, jobs });
    if (generatedSource !== canonicalSource) {
      throw new Error(
        "generated manifest source differs from the canonical renderer output",
      );
    }
    const expectedGlbs = inventory.expected.filter((path) => path.endsWith(".glb"));
    if (
      generatedManifest.schema !== 1 ||
      generatedManifest.census !== 87 ||
      generatedManifest.files.length !== 87 ||
      new Set(generatedManifest.files).size !== 87 ||
      stableJson(generatedManifest.files) !== stableJson(expectedGlbs) ||
      stableJson(Object.keys(generatedManifest.urls)) !== stableJson(expectedGlbs)
    ) {
      throw new Error(
        "generated manifest strict files/URL census does not match validated metadata",
      );
    }
  }
  return Object.freeze({
    compared: 88,
    mismatches: Object.freeze([]),
    observedSetDigest: createHash("sha256")
      .update(inventory.owned.join("\n"))
      .digest("hex"),
  });
}

export async function acquireDestinationLock(options) {
  if (
    (options?.mode !== "promotion" && options?.mode !== "repair") ||
    typeof options.destinationRoot !== "string" ||
    !options.io
  ) {
    throw new Error(
      "destination lock options require promotion/repair mode, root, and I/O",
    );
  }
  const destinationStat = await options.io.lstat(options.destinationRoot, { bigint: true });
  if (!destinationStat.isDirectory() || destinationStat.isSymbolicLink()) {
    throw new Error("destination lock root must be a real directory");
  }
  repositoryRootForDestination(options.destinationRoot);
  const lockPath = resolve(options.destinationRoot, DESTINATION_LOCK_BASENAME);
  const ownerPath = resolve(lockPath, DESTINATION_LOCK_OWNER_BASENAME);
  const nonce = randomBytes(16).toString("hex");
  let createdDirectory = false;
  let lockIdentity = null;
  let ownerIdentity = null;
  let handle;
  try {
    await options.io.mkdir(lockPath, { mode: 0o700 });
    createdDirectory = true;
    const lockStat = await options.io.lstat(lockPath, { bigint: true });
    if (!lockStat.isDirectory() || lockStat.isSymbolicLink()) {
      throw new Error("created destination lock is not a real directory");
    }
    lockIdentity = { device: lockStat.dev, inode: lockStat.ino };
    handle = await options.io.open(
      ownerPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    const ownerStat = await handle.stat({ bigint: true });
    ownerIdentity = { device: ownerStat.dev, inode: ownerStat.ino };
    await handle.writeFile(
      `${JSON.stringify({ nonce, pid: process.pid, mode: options.mode })}\n`,
      "utf8",
    );
    await handle.sync();
    await handle.close();
    handle = null;
    await options.io.fsyncDirectory(lockPath);
    return Object.freeze({
      path: lockPath,
      ownerPath,
      nonce,
      mode: options.mode,
      device: lockIdentity.device,
      inode: lockIdentity.inode,
      ownerDevice: ownerIdentity.device,
      ownerInode: ownerIdentity.inode,
    });
  } catch (error) {
    if (
      !createdDirectory &&
      error &&
      typeof error === "object" &&
      error.code === "EEXIST"
    ) {
      throw new Error(`destination lock already exists at ${lockPath}`);
    }
    try {
      if (handle) {
        await handle.close();
        handle = null;
      }
      if (createdDirectory && lockIdentity) {
        await removeOwnedLockDirectory(
          {
            path: lockPath,
            ownerPath,
            nonce,
            mode: options.mode,
            device: lockIdentity.device,
            inode: lockIdentity.inode,
            ownerDevice: ownerIdentity?.device ?? null,
            ownerInode: ownerIdentity?.inode ?? null,
          },
          options.io,
          { ownerMayBeAbsent: ownerIdentity === null },
        );
      }
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `destination lock creation failed and identity-safe cleanup failed: ${String(error)}`,
      );
    }
    throw error;
  }
}

function matchesLockIdentity(statValue, lock) {
  return (
    statValue?.isDirectory() === true &&
    !statValue.isSymbolicLink() &&
    statValue.dev === lock.device &&
    statValue.ino === lock.inode
  );
}

function matchesOwnerIdentity(statValue, lock) {
  return (
    statValue?.isFile() === true &&
    !statValue.isSymbolicLink() &&
    statValue.dev === lock.ownerDevice &&
    statValue.ino === lock.ownerInode
  );
}

function assertDestinationLockHandle(lock) {
  if (
    !lock ||
    typeof lock.path !== "string" ||
    typeof lock.ownerPath !== "string" ||
    resolve(lock.ownerPath) !== resolve(lock.path, DESTINATION_LOCK_OWNER_BASENAME) ||
    basename(lock.path) !== DESTINATION_LOCK_BASENAME ||
    !RELEASE_NONCE_PATTERN.test(lock.nonce ?? "") ||
    (lock.mode !== "promotion" && lock.mode !== "repair") ||
    typeof lock.device !== "bigint" ||
    typeof lock.inode !== "bigint" ||
    typeof lock.ownerDevice !== "bigint" ||
    typeof lock.ownerInode !== "bigint"
  ) {
    throw new Error("destination lock ownership handle is malformed");
  }
}

async function assertDestinationLockOwner(lock, io) {
  assertDestinationLockHandle(lock);
  const before = await optionalLstat(lock.path, io);
  if (!matchesLockIdentity(before, lock)) {
    throw new Error("destination lock device/inode no longer matches its owner");
  }
  const ownerBefore = await optionalLstat(lock.ownerPath, io);
  if (!matchesOwnerIdentity(ownerBefore, lock)) {
    throw new Error("destination lock owner payload inode no longer matches its owner");
  }
  let payload;
  try {
    payload = JSON.parse(await io.readFile(lock.ownerPath, "utf8"));
  } catch (error) {
    throw new Error(`destination lock payload cannot be reread: ${String(error)}`);
  }
  if (
    payload?.nonce !== lock.nonce ||
    payload?.mode !== lock.mode ||
    !Number.isSafeInteger(payload?.pid)
  ) {
    throw new Error("destination lock nonce/payload no longer matches its owner");
  }
  const after = await optionalLstat(lock.path, io);
  if (!matchesLockIdentity(after, lock)) {
    throw new Error("destination lock device/inode changed during owner reread");
  }
  const ownerAfter = await optionalLstat(lock.ownerPath, io);
  if (!matchesOwnerIdentity(ownerAfter, lock)) {
    throw new Error("destination lock owner payload inode changed during owner reread");
  }
  const members = await io.readdir(lock.path);
  if (members.length !== 1 || members[0] !== DESTINATION_LOCK_OWNER_BASENAME) {
    throw new Error("destination lock directory contains unowned entries");
  }
}

async function removeOwnedLockDirectory(lock, io, { ownerMayBeAbsent = false } = {}) {
  const before = await optionalLstat(lock.path, io);
  if (!matchesLockIdentity(before, lock)) {
    throw new Error("destination lock directory is no longer owned");
  }
  const owner = await optionalLstat(lock.ownerPath, io);
  if (owner !== null) {
    if (
      typeof lock.ownerDevice !== "bigint" ||
      typeof lock.ownerInode !== "bigint" ||
      !matchesOwnerIdentity(owner, lock)
    ) {
      throw new Error("destination lock owner payload is no longer owned");
    }
    await io.unlink(lock.ownerPath);
    await io.fsyncDirectory(lock.path);
  } else if (!ownerMayBeAbsent) {
    throw new Error("destination lock owner payload is missing");
  }
  const after = await optionalLstat(lock.path, io);
  if (!matchesLockIdentity(after, lock)) {
    throw new Error("destination lock directory changed before removal");
  }
  const remaining = await io.readdir(lock.path);
  if (remaining.length !== 0) {
    throw new Error("destination lock directory is not empty after owner removal");
  }
  await io.rmdir(lock.path);
  await io.fsyncDirectory(dirname(lock.path));
}

export async function releaseDestinationLock(lock, io) {
  await assertDestinationLockOwner(lock, io);
  await removeOwnedLockDirectory(lock, io);
}

async function assertRegularStagedEntry(entry, io) {
  const stagedStat = await io.lstat(entry.stagedPath, { bigint: true });
  if (!stagedStat.isFile() || stagedStat.isSymbolicLink()) {
    throw new Error(`${entry.relativeFile} staged path is not a regular file`);
  }
  const bytes = await io.readFile(entry.stagedPath);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (
    !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "") ||
    !Number.isSafeInteger(entry.bytes) ||
    entry.bytes <= 0 ||
    bytes.byteLength !== entry.bytes ||
    digest !== entry.sha256
  ) {
    throw new Error(`${entry.relativeFile} staged byte count/hash mismatch`);
  }
  return { bytes, stagedStat };
}

function assertPublicationPlan(plan, destinationRoot) {
  if (plan?.mode !== "production") {
    throw new Error("publication mode must be production");
  }
  if (!Array.isArray(plan.entries) || plan.entries.length !== 87 || !plan.metadata) {
    throw new Error("publication plan requires exactly 87 GLBs and metadata last");
  }
  const repositoryRoot = repositoryRootForDestination(destinationRoot);
  const jobs = deriveExportJobs();
  const expectedGlbs = expectedReleaseOwnedPaths(jobs).filter((path) =>
    path.endsWith(".glb"),
  );
  const actualGlbs = plan.entries.map((entry) => entry?.relativeFile);
  if (
    new Set(actualGlbs).size !== 87 ||
    stableJson([...actualGlbs].sort()) !== stableJson(expectedGlbs) ||
    plan.metadata.relativeFile !== METADATA_RELATIVE_PATH ||
    actualGlbs.includes(METADATA_RELATIVE_PATH)
  ) {
    throw new Error(
      "publication plan does not contain the exact 87 GLBs with metadata last",
    );
  }
  const allEntries = [...plan.entries, plan.metadata];
  const stageRoots = new Set();
  for (const entry of allEntries) {
    const stageRoot = stageRootForEntry(entry);
    stageRoots.add(stageRoot);
    const expectedFinal = resolve(repositoryRoot, ...entry.relativeFile.split("/"));
    if (resolve(entry.finalPath) !== expectedFinal) {
      throw new Error(
        `${entry.relativeFile} destination path escapes the publication root`,
      );
    }
    assertContainedPath(
      repositoryRoot,
      entry.finalPath,
      `${entry.relativeFile} destination`,
    );
  }
  if (stageRoots.size !== 1) {
    throw new Error("publication files do not share one invocation-owned stage");
  }
  const [stageRoot] = stageRoots;
  if (!basename(stageRoot).startsWith("era8-10-stage-")) {
    throw new Error("publication stage is not an invocation-owned era8-10 mkdtemp root");
  }
  return { allEntries, jobs, repositoryRoot, stageRoot };
}

const PREPARED_PUBLICATION_STATE = new WeakMap();

async function assertExactStageInventory(stageRoot, entries, io) {
  const expected = new Set(entries.map((entry) => entry.relativeFile));
  const found = new Set();
  const visit = async (directory, relativeDirectory = "") => {
    const names = await io.readdir(directory);
    for (const name of names) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const path = resolve(directory, name);
      const entry = await io.lstat(path, { bigint: true });
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        if (![...expected].some((candidate) => candidate.startsWith(`${relativePath}/`))) {
          throw new Error(
            `publication stage contains an unexpected directory: ${relativePath}`,
          );
        }
        await visit(path, relativePath);
        continue;
      }
      if (
        entry.isFile() &&
        !entry.isSymbolicLink() &&
        (expected.has(relativePath) ||
          (relativeDirectory === "" && name === ".era8-10-stage-owner.json"))
      ) {
        if (expected.has(relativePath)) found.add(relativePath);
        continue;
      }
      throw new Error(
        `publication stage contains an unexpected path/type: ${relativePath}`,
      );
    }
  };
  await visit(stageRoot);
  if (
    found.size !== expected.size ||
    [...expected].some((relativePath) => !found.has(relativePath))
  ) {
    throw new Error("publication stage inventory does not contain the exact 88 paths");
  }
}

export async function prepareManifestLastPromotion(plan, destinationRoot, io) {
  const { allEntries, jobs, stageRoot } = assertPublicationPlan(plan, destinationRoot);
  const stageStat = await io.lstat(stageRoot, { bigint: true });
  if (!stageStat.isDirectory() || stageStat.isSymbolicLink()) {
    throw new Error("publication owned stage is not a real directory");
  }
  const physicalStage = await io.realpath(stageRoot);
  await assertExactStageInventory(stageRoot, allEntries, io);
  const stagedIdentities = new Map();
  for (const entry of allEntries) {
    const { stagedStat } = await assertRegularStagedEntry(entry, io);
    const physicalEntry = await io.realpath(entry.stagedPath);
    assertContainedPath(
      physicalStage,
      physicalEntry,
      `${entry.relativeFile} physical staged path`,
    );
    const existingFinal = await optionalLstat(entry.finalPath, io);
    if (existingFinal !== null) {
      throw new Error(`${entry.relativeFile} destination already exists`);
    }
    stagedIdentities.set(entry.relativeFile, {
      device: stagedStat.dev,
      inode: stagedStat.ino,
    });
  }
  const stagedMetadata = parseMetadataBytes(
    await io.readFile(plan.metadata.stagedPath),
    jobs,
  );
  const metadataByPath = new Map(stagedMetadata.outputs.map((row) => [row.file, row]));
  for (const entry of plan.entries) {
    const row = metadataByPath.get(entry.relativeFile);
    if (!row || row.sha256 !== entry.sha256 || row.bytes !== entry.bytes) {
      throw new Error(`${entry.relativeFile} disagrees with staged metadata`);
    }
  }
  const prepared = Object.freeze({
    mode: "production",
    entries: Object.freeze(plan.entries.map((entry) => Object.freeze({ ...entry }))),
    metadata: Object.freeze({ ...plan.metadata }),
    destinationRoot: resolve(destinationRoot),
    stageRoot: resolve(stageRoot),
  });
  PREPARED_PUBLICATION_STATE.set(prepared, {
    destinationRoot: resolve(destinationRoot),
    stageRoot: resolve(stageRoot),
    stagedIdentities,
  });
  return prepared;
}

function matchesStagedIdentity(statValue, identity) {
  return (
    statValue?.isFile() === true &&
    !statValue.isSymbolicLink() &&
    statValue.dev === identity?.device &&
    statValue.ino === identity?.inode
  );
}

async function removeOwnedTemporary(temporaryPath, identity, io) {
  const observed = await optionalLstat(temporaryPath, io);
  if (observed === null) return;
  if (
    !observed.isFile() ||
    observed.isSymbolicLink() ||
    observed.dev !== identity.device ||
    observed.ino !== identity.inode
  ) {
    throw new Error(`temporary sibling ownership changed before cleanup: ${temporaryPath}`);
  }
  await io.unlink(temporaryPath);
  await io.fsyncDirectory(dirname(temporaryPath));
}

async function removeNonceOwnedTemporaryAfterFstatFailure(temporaryPath, entry, lock, io) {
  await assertDestinationLockOwner(lock, io);
  if (
    temporaryPath !== tempSiblingFor(entry.finalPath, lock.nonce) ||
    assertContainedPath(dirname(lock.path), temporaryPath, "temporary cleanup path") !==
      resolve(temporaryPath)
  ) {
    throw new Error("temporary cleanup path is not the exact nonce-owned sibling");
  }
  const before = await optionalLstat(temporaryPath, io);
  if (before === null) return;
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error("temporary cleanup path is a symlink or non-regular file");
  }
  const probe = await io.open(
    temporaryPath,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  let probeStat;
  try {
    probeStat = await probe.stat({ bigint: true });
  } finally {
    await probe.close();
  }
  const after = await optionalLstat(temporaryPath, io);
  if (
    after === null ||
    !after.isFile() ||
    after.isSymbolicLink() ||
    probeStat.dev !== before.dev ||
    probeStat.ino !== before.ino ||
    after.dev !== before.dev ||
    after.ino !== before.ino
  ) {
    throw new Error("temporary cleanup identity changed during fstat retry");
  }
  await io.unlink(temporaryPath);
  await io.fsyncDirectory(dirname(temporaryPath));
}

async function publishOneEntry(entry, lock, deps, stagedIdentity) {
  const temporaryPath = tempSiblingFor(entry.finalPath, lock.nonce);
  let handle;
  let created = false;
  let temporaryIdentity = null;
  let renamed = false;
  try {
    handle = await deps.io.open(
      temporaryPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    created = true;
    const temporaryStat = await handle.stat({ bigint: true });
    temporaryIdentity = { device: temporaryStat.dev, inode: temporaryStat.ino };
    const stagedStat = await deps.io.lstat(entry.stagedPath, { bigint: true });
    if (!matchesStagedIdentity(stagedStat, stagedIdentity)) {
      throw new Error(
        `${entry.relativeFile} staged file identity changed after preparation`,
      );
    }
    const stagedBytes = await deps.io.readFile(entry.stagedPath);
    await handle.writeFile(stagedBytes);
    await handle.sync();
    const immediatelyBeforeRename = await deps.io.readFile(entry.stagedPath);
    const digest = createHash("sha256").update(immediatelyBeforeRename).digest("hex");
    if (immediatelyBeforeRename.byteLength !== entry.bytes || digest !== entry.sha256) {
      throw new Error(
        `${entry.relativeFile} staged hash changed immediately before rename`,
      );
    }
    await deps.boundary(`verified-staged:${entry.relativeFile}`);
    await deps.io.rename(temporaryPath, entry.finalPath);
    renamed = true;
    await deps.io.fsyncDirectory(dirname(entry.finalPath));
  } catch (error) {
    const cleanupErrors = [];
    if (handle) {
      try {
        await handle.close();
      } catch (closeError) {
        cleanupErrors.push(closeError);
      }
      handle = null;
    }
    if (!renamed && created) {
      try {
        if (temporaryIdentity !== null) {
          await removeOwnedTemporary(temporaryPath, temporaryIdentity, deps.io);
        } else {
          await removeNonceOwnedTemporaryAfterFstatFailure(
            temporaryPath,
            entry,
            lock,
            deps.io,
          );
        }
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        `publication failed and owned temporary cleanup failed: ${String(error)}`,
      );
    }
    throw error;
  } finally {
    if (handle) await handle.close();
  }
}

export async function promoteManifestLast(plan, lock, deps) {
  if (
    !lock ||
    lock.mode !== "promotion" ||
    !RELEASE_NONCE_PATTERN.test(lock.nonce ?? "") ||
    dirname(lock.path) === lock.path ||
    !deps?.io ||
    typeof deps.boundary !== "function"
  ) {
    throw new Error("manifest-last promotion requires an owned lock and dependencies");
  }
  const preparedState = PREPARED_PUBLICATION_STATE.get(plan);
  if (
    !preparedState ||
    resolve(preparedState.destinationRoot) !== resolve(dirname(lock.path)) ||
    resolve(plan.destinationRoot) !== resolve(preparedState.destinationRoot) ||
    resolve(plan.stageRoot) !== resolve(preparedState.stageRoot)
  ) {
    throw new Error(
      "manifest-last promotion requires a prepared immutable publication plan",
    );
  }
  await assertDestinationLockOwner(lock, deps.io);
  for (const entry of [...plan.entries, plan.metadata]) {
    if ((await optionalLstat(entry.finalPath, deps.io)) !== null) {
      throw new Error(
        `${entry.relativeFile} destination already exists under lock; refusing overwrite`,
      );
    }
  }
  await deps.boundary("after-promoted-0");
  let promoted = 0;
  for (const entry of plan.entries) {
    await publishOneEntry(
      entry,
      lock,
      deps,
      preparedState.stagedIdentities.get(entry.relativeFile),
    );
    promoted += 1;
    await deps.boundary(`after-promoted-${promoted}`);
  }
  await publishOneEntry(
    plan.metadata,
    lock,
    deps,
    preparedState.stagedIdentities.get(plan.metadata.relativeFile),
  );
  promoted += 1;
  await deps.boundary(`after-promoted-${promoted}`);
}

function assertRepairTarget(relativePath, expected, inventory) {
  if (expected.includes(relativePath)) return;
  if (inventory.tempSiblings.includes(relativePath)) {
    if (exactTemporaryOwner(relativePath, expected) !== null) return;
  }
  if (
    relativePath === GENERATED_MANIFEST_RELATIVE_PATH &&
    inventory.generatedManifest === relativePath
  ) {
    return;
  }
  throw new Error(
    `repair target escapes the immutable release-owned path whitelist: ${relativePath}`,
  );
}

export async function repairIncompleteLateEraOutput(deps) {
  const { repositoryRoot, jobs, io } = deps ?? {};
  const expected = expectedReleaseOwnedPaths(jobs);
  const destinationRoot = resolve(repositoryRoot, ...ART_RELATIVE_ROOT.split("/"));
  const lock = await acquireDestinationLock({
    destinationRoot,
    mode: "repair",
    io,
  });
  try {
    const inventory = await classifyReleaseOwnedPaths(repositoryRoot, jobs, io);
    if (inventory.unknownCandidates.length > 0) {
      throw new Error(
        `repair refuses unknown candidate paths: ${inventory.unknownCandidates.join(", ")}`,
      );
    }
    const targets = [
      ...inventory.owned,
      ...inventory.tempSiblings,
      ...(inventory.generatedManifest === null ? [] : [inventory.generatedManifest]),
    ];
    for (const relativePath of targets) {
      assertRepairTarget(relativePath, expected, inventory);
      const path = assertContainedPath(
        repositoryRoot,
        resolve(repositoryRoot, ...relativePath.split("/")),
        `repair target ${relativePath}`,
      );
      await assertDestinationLockOwner(lock, io);
      const entry = await io.lstat(path, { bigint: true });
      if (!entry.isFile() || entry.isSymbolicLink()) {
        throw new Error(`repair target ${relativePath} is a symlink or non-regular file`);
      }
    }
    for (const relativePath of targets) {
      await assertDestinationLockOwner(lock, io);
      const path = resolve(repositoryRoot, ...relativePath.split("/"));
      await io.unlink(path);
      await io.fsyncDirectory(dirname(path));
    }
  } finally {
    await releaseDestinationLock(lock, io);
  }
}

export async function inspectSourceContract(era, pageFactory) {
  const plan = planFor(era);
  const created = await pageFactory();
  const { page } = created;
  let restored = false;
  try {
    await page.setContent("<!doctype html><html><body></body></html>");
    await installModernThree(page);
    const rawModernColorSpace = await page.evaluate(() => {
      const texture = new window.THREE.Texture();
      texture.encoding = Symbol("raw-r128-srgb");
      return texture.colorSpace;
    });
    const before = await page.evaluate(() => ({
      namespace: Object.getOwnPropertyDescriptor(window.THREE, "sRGBEncoding"),
      prototype: Object.getOwnPropertyDescriptor(
        window.THREE.Texture.prototype,
        "encoding",
      ),
    }));
    await installLegacyEncodingFacade(page, `${era} source contract`);
    const facade = await page.evaluate(() => {
      const texture = new window.THREE.Texture();
      texture.encoding = window.THREE.sRGBEncoding;
      return {
        colorSpace: texture.colorSpace,
        hasOwnEncoding: Object.hasOwn(texture, "encoding"),
      };
    });
    await page.evaluate(() => {
      window.__era8To10LegacyEncodingFacade.acceptedAssignments = 0;
      window.__era8To10LegacyEncodingFacade.unsupportedAssignments = 0;
    });
    let useBeforeBaseError = null;
    if (era === "cyberpunk") {
      await evaluateKit(page, era, { prerequisites: false });
      useBeforeBaseError = await page.evaluate(() => {
        try {
          const Ctor = window.Era10Kit;
          window.__era8To10Era10Ctor = Ctor;
          new Ctor();
          return null;
        } catch (error) {
          return `Era9Kit prerequisite absent: ${String(error)}`;
        }
      });
      await evaluateKit(page, "information_age", { prerequisites: false });
    } else {
      await evaluateKit(page, era);
    }
    const contract = await page.evaluate(({ kitName, era: activeEra }) => {
      const Ctor = activeEra === "cyberpunk" ? window.Era10Kit : window[kitName];
      const kit = new Ctor();
      return {
        roster: kit.roster(),
        builtOnly: kit.builtOnly(),
        definitions: Object.keys(kit.defs()),
        bare: kit.bare,
      };
    }, plan);
    const source = extractKitSources(await readFile(SOURCE))[era];
    const directRandomCalls = source.match(/Math\.random\s*\(/g)?.length ?? 0;
    const expectedRoster = plan.rows.map((row) => [
      row.definition,
      row.tab,
      row.title,
      row.target,
      row.sourceFootprint,
      row.ordinal,
    ]);
    if (JSON.stringify(contract.roster) !== JSON.stringify(expectedRoster)) {
      throw new Error(`${era} source roster changed`);
    }
    if (JSON.stringify(contract.builtOnly) !== JSON.stringify(plan.builtOnly)) {
      throw new Error(`${era} source built-only roster changed`);
    }
    if (
      JSON.stringify([...contract.definitions].sort()) !==
      JSON.stringify(plan.rows.map((row) => row.definition).sort())
    ) {
      throw new Error(`${era} source definitions changed`);
    }
    if (contract.bare !== true) throw new Error(`${era} source no longer defaults to bare`);
    const jobs = deriveExportJobs().filter((job) => job.era === era);
    const legacyEncoding = await page.evaluate(
      ({ activeEra, kitName, jobs: plannedJobs }) => {
        const Ctor = activeEra === "cyberpunk" ? window.Era10Kit : window[kitName];
        for (const job of plannedJobs) {
          const previousRandom = Math.random;
          let seedState = job.seed >>> 0;
          Math.random = () => {
            seedState = (seedState + 0x6d2b79f5) >>> 0;
            let mixed = seedState;
            mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
            mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
            return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
          };
          try {
            const kit = new Ctor();
            kit.bare = true;
            const build = kit.defs()[job.definition];
            if (typeof build !== "function") {
              throw new Error(`source inspection builder missing: ${job.seedInput}`);
            }
            const built = build(job.stage);
            if (!built?.isObject3D) {
              throw new Error(`source inspection build is not Object3D: ${job.seedInput}`);
            }
          } finally {
            Math.random = previousRandom;
          }
        }
        const state = window.__era8To10LegacyEncodingFacade;
        return {
          bridgeVersion: 1,
          acceptedLegacyEncodingAssignments: state.acceptedAssignments,
          unsupportedLegacyEncodingAssignments: state.unsupportedAssignments,
        };
      },
      { activeEra: era, kitName: plan.kitName, jobs },
    );
    if (
      legacyEncoding.acceptedLegacyEncodingAssignments <= 0 ||
      legacyEncoding.unsupportedLegacyEncodingAssignments !== 0
    ) {
      throw new Error(`${era} legacy encoding evaluation census changed`);
    }
    await removeLegacyEncodingFacade(page);
    restored = await page.evaluate(
      (original) =>
        JSON.stringify(Object.getOwnPropertyDescriptor(window.THREE, "sRGBEncoding")) ===
          JSON.stringify(original.namespace) &&
        JSON.stringify(
          Object.getOwnPropertyDescriptor(window.THREE.Texture.prototype, "encoding"),
        ) === JSON.stringify(original.prototype) &&
        !window.__era8To10LegacyEncodingFacade,
      before,
    );
    return Object.freeze({
      era,
      ...contract,
      decodedBytes: plan.decodedBytes,
      directRandomCalls,
      jobs,
      useBeforeBaseError,
      legacyEncoding: Object.freeze(legacyEncoding),
      legacy: Object.freeze({
        rawModernColorSpace,
        facadeColorSpace: facade.colorSpace,
        hasOwnEncoding: facade.hasOwnEncoding,
        restored,
      }),
    });
  } finally {
    if (!restored) {
      try {
        await removeLegacyEncodingFacade(page);
      } catch {
        // The page may have failed before installation; teardown must still close it.
      }
    }
    await created.close();
  }
}

export function parseArgs(argv) {
  if (!Array.isArray(argv)) throw new Error("exporter arguments must be an array");
  const flags = new Set();
  let out = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (typeof argument !== "string") throw new Error("exporter arguments must be strings");
    if (argument === "--out") {
      if (flags.has(argument)) throw new Error("Duplicate exporter flag: --out");
      const value = argv[index + 1];
      if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
        throw new Error("--out requires one non-empty path value");
      }
      customOutputSegments(value);
      flags.add(argument);
      out = value;
      index += 1;
      continue;
    }
    if (
      ![
        "--check",
        "--no-seed",
        "--comparison",
        "--repair-incomplete-late-era-output",
      ].includes(argument)
    ) {
      throw new Error(`Unknown exporter argument: ${argument}`);
    }
    if (flags.has(argument)) throw new Error(`Duplicate exporter flag: ${argument}`);
    flags.add(argument);
  }
  const has = (flag) => flags.has(flag);
  const selected = [
    has("--check"),
    out !== null,
    has("--comparison"),
    has("--repair-incomplete-late-era-output"),
  ].filter(Boolean).length;
  if (selected > 1 || (has("--no-seed") && !has("--check"))) {
    throw new Error("exporter flags select contradictory modes");
  }
  if (has("--no-seed") && selected !== 1) {
    throw new Error("--no-seed requires --check");
  }
  if (has("--check")) {
    return Object.freeze({
      mode: has("--no-seed") ? "no-seed" : "check",
      bare: true,
      out: null,
      seeded: !has("--no-seed"),
    });
  }
  if (out !== null) return Object.freeze({ mode: "custom", bare: true, out, seeded: true });
  if (has("--comparison")) {
    return Object.freeze({ mode: "comparison", bare: false, out: null, seeded: true });
  }
  if (has("--repair-incomplete-late-era-output")) {
    return Object.freeze({ mode: "repair", bare: true, out: null, seeded: true });
  }
  return Object.freeze({ mode: "production", bare: true, out: null, seeded: true });
}

function customOutputSegments(path) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.startsWith("/") ||
    path.startsWith("\\") ||
    /^[A-Za-z]:/.test(path)
  ) {
    throw new Error("custom output must be a non-empty relative path");
  }
  const segments = path.split(/[\\/]/);
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error("custom output path traversal is not allowed");
  }
  return segments;
}

const CUSTOM_PARENT_HANDLES = new WeakMap();
const CUSTOM_OUTPUT_HANDLES = new WeakMap();

async function assertOwnedCustomParent(parent, io) {
  const metadata = CUSTOM_PARENT_HANDLES.get(parent);
  if (!metadata || metadata.io !== io || !io?.lstat || !io?.realpath) {
    throw new Error("custom output requires an invocation-owned parent handle");
  }
  const current = await optionalLstat(metadata.path, io);
  if (
    current === null ||
    !current.isDirectory() ||
    current.isSymbolicLink() ||
    current.dev !== metadata.device ||
    current.ino !== metadata.inode
  ) {
    throw new Error("custom output parent ownership changed");
  }
  const physical = await io.realpath(metadata.path);
  if (resolve(physical) !== resolve(metadata.realPath)) {
    throw new Error("custom output parent physical path changed");
  }
  return metadata;
}

async function cleanupUnverifiedCustomParent(path, _io) {
  const temporaryRoot = resolve(tmpdir());
  if (
    dirname(resolve(path)) !== temporaryRoot ||
    !basename(path).startsWith("era8-10-custom-output-")
  ) {
    throw new Error("unverified custom output cleanup path is outside the owned temp root");
  }
  let initial;
  try {
    initial = await lstat(path, { bigint: true });
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  if (!initial.isDirectory() || initial.isSymbolicLink()) {
    throw new Error("unverified custom output parent is not a real directory");
  }
  const [physicalRoot, physicalPath] = await Promise.all([
    realpath(temporaryRoot),
    realpath(path),
  ]);
  assertContainedPath(physicalRoot, physicalPath, "unverified custom output cleanup path");
  const beforeRemoval = await lstat(path, { bigint: true });
  if (
    !beforeRemoval.isDirectory() ||
    beforeRemoval.isSymbolicLink() ||
    beforeRemoval.dev !== initial.dev ||
    beforeRemoval.ino !== initial.ino ||
    (await readdir(path)).length !== 0
  ) {
    throw new Error("unverified custom output parent changed before cleanup");
  }
  const immediatelyBeforeRemoval = await lstat(path, { bigint: true });
  if (
    immediatelyBeforeRemoval.dev !== initial.dev ||
    immediatelyBeforeRemoval.ino !== initial.ino
  ) {
    throw new Error("unverified custom output parent identity changed before cleanup");
  }
  await rmdir(path);
}

async function cleanupCapturedCustomParent(path, identity) {
  const temporaryRoot = resolve(tmpdir());
  if (
    dirname(resolve(path)) !== temporaryRoot ||
    !basename(path).startsWith("era8-10-custom-output-")
  ) {
    throw new Error("captured custom output cleanup path is outside the owned temp root");
  }
  const beforeRemoval = await lstat(path, { bigint: true });
  if (
    !beforeRemoval.isDirectory() ||
    beforeRemoval.isSymbolicLink() ||
    beforeRemoval.dev !== identity.device ||
    beforeRemoval.ino !== identity.inode
  ) {
    throw new Error("captured custom output parent identity changed before cleanup");
  }
  const [physicalRoot, physicalPath] = await Promise.all([
    realpath(temporaryRoot),
    realpath(path),
  ]);
  assertContainedPath(physicalRoot, physicalPath, "captured custom output cleanup path");
  if ((await readdir(path)).length !== 0) {
    throw new Error("captured custom output parent is not empty during cleanup");
  }
  const immediatelyBeforeRemoval = await lstat(path, { bigint: true });
  if (
    !immediatelyBeforeRemoval.isDirectory() ||
    immediatelyBeforeRemoval.isSymbolicLink() ||
    immediatelyBeforeRemoval.dev !== identity.device ||
    immediatelyBeforeRemoval.ino !== identity.inode
  ) {
    throw new Error("captured custom output parent identity changed before removal");
  }
  await rmdir(path);
}

async function disposeOwnedCustomParent() {
  const metadata = CUSTOM_PARENT_HANDLES.get(this);
  if (!metadata) {
    throw new Error("custom output requires an invocation-owned parent handle");
  }
  await assertOwnedCustomParent(this, metadata.io);
  await metadata.io.rm(metadata.path, { recursive: true, force: true });
  await metadata.io.fsyncDirectory(dirname(metadata.path));
  CUSTOM_PARENT_HANDLES.delete(this);
}

async function disposeOwnedCustomOutput() {
  const metadata = CUSTOM_OUTPUT_HANDLES.get(this);
  if (!metadata) {
    throw new Error("custom output requires an invocation-owned output handle");
  }
  await disposeOwnedCustomParent.call(metadata.parent);
  CUSTOM_OUTPUT_HANDLES.delete(this);
}

export async function createOwnedCustomParent(io) {
  if (!io?.lstat || !io?.realpath || !io?.rm || !io?.fsyncDirectory) {
    throw new Error("custom output requires filesystem ownership dependencies");
  }
  const path = await mkdtemp(join(tmpdir(), "era8-10-custom-output-"));
  let identity = null;
  let directoryHandle;
  const nonce = randomBytes(16).toString("hex");
  try {
    directoryHandle = await open(path, constants.O_RDONLY);
    const authoritative = await directoryHandle.stat({ bigint: true });
    if (!authoritative.isDirectory() || authoritative.isSymbolicLink()) {
      throw new Error("created custom output parent is not a real directory");
    }
    identity = { device: authoritative.dev, inode: authoritative.ino };
    const created = await io.lstat(path, { bigint: true });
    if (
      !created.isDirectory() ||
      created.isSymbolicLink() ||
      created.dev !== identity.device ||
      created.ino !== identity.inode
    ) {
      throw new Error("created custom output parent identity changed during first read");
    }
    const realPath = await io.realpath(path);
    const parent = Object.freeze({
      path,
      realPath,
      nonce,
      device: identity.device,
      inode: identity.inode,
      dispose: disposeOwnedCustomParent,
    });
    CUSTOM_PARENT_HANDLES.set(parent, {
      io,
      path,
      realPath,
      nonce,
      device: identity.device,
      inode: identity.inode,
    });
    return parent;
  } catch (error) {
    if (identity === null) {
      await cleanupUnverifiedCustomParent(path, io);
    } else {
      await cleanupCapturedCustomParent(path, identity);
    }
    throw error;
  } finally {
    if (directoryHandle) await directoryHandle.close();
  }
}

export async function assertSafeCustomOutput(path, parent, io) {
  if (!io?.lstat || !io?.mkdir || !io?.realpath) {
    throw new Error("custom output requires filesystem ownership dependencies");
  }
  const segments = customOutputSegments(path);
  const parentMetadata = await assertOwnedCustomParent(parent, io);
  let currentPath = parentMetadata.path;
  for (const [index, segment] of segments.entries()) {
    const candidate = join(currentPath, segment);
    const isLeaf = index === segments.length - 1;
    const existing = await optionalLstat(candidate, io);
    if (existing !== null) {
      if (existing.isSymbolicLink()) {
        throw new Error(`custom output ancestor is a symlink: ${candidate}`);
      }
      if (isLeaf || !existing.isDirectory()) {
        throw new Error(`custom output path already exists: ${candidate}`);
      }
    } else {
      await io.mkdir(candidate, { mode: 0o700 });
    }
    const current = await io.lstat(candidate, { bigint: true });
    if (!current.isDirectory() || current.isSymbolicLink()) {
      throw new Error(`custom output ancestor is a symlink or non-directory: ${candidate}`);
    }
    const physical = await io.realpath(candidate);
    assertContainedPath(
      parentMetadata.realPath,
      physical,
      "custom output physical ancestor",
    );
    currentPath = candidate;
  }
  const outputStat = await io.lstat(currentPath, { bigint: true });
  const realPath = await io.realpath(currentPath);
  const output = Object.freeze({
    path: currentPath,
    realPath,
    parentPath: parentMetadata.path,
    realParentPath: parentMetadata.realPath,
    nonce: parentMetadata.nonce,
    device: outputStat.dev,
    inode: outputStat.ino,
    parentDevice: parentMetadata.device,
    parentInode: parentMetadata.inode,
    dispose: disposeOwnedCustomOutput,
  });
  CUSTOM_OUTPUT_HANDLES.set(output, { parent });
  return output;
}

export async function createOwnedCustomOutput(path, io) {
  const parent = await createOwnedCustomParent(io);
  try {
    return await assertSafeCustomOutput(path, parent, io);
  } catch (error) {
    await parent.dispose();
    throw error;
  }
}

async function runWithOwnedScratch(prefix, work) {
  const scratch = await mkdtemp(join(tmpdir(), prefix));
  const scratchStat = await lstat(scratch, { bigint: true });
  if (!scratchStat.isDirectory() || scratchStat.isSymbolicLink()) {
    throw new Error("owned scratch root is not a real directory");
  }
  try {
    return await work(scratch);
  } finally {
    const current = await optionalLstat(scratch, {
      lstat,
    });
    if (
      current?.isDirectory() &&
      !current.isSymbolicLink() &&
      current.dev === scratchStat.dev &&
      current.ino === scratchStat.ino
    ) {
      await rm(scratch, { recursive: true, force: true });
    }
  }
}

export async function runOwnedScratchCheck(options) {
  if (!["check", "no-seed"].includes(options?.mode) || !options?.repositoryRoot) {
    throw new Error("scratch check requires check/no-seed mode and repository root");
  }
  return runWithOwnedScratch(`era8-10-${options.mode}-`, async (scratchRoot) => {
    // Staging is deliberately isolated here. Task 5 never acquires a publication lock or
    // creates a production-side temporary; later export tasks supply the staged work.
    if (typeof options.runScratch === "function") {
      await options.runScratch({ scratchRoot, mode: options.mode, jobs: options.jobs });
    }
  });
}

async function writeAndSync(path, bytes, io) {
  await io.mkdir(dirname(path), { recursive: true });
  await io.writeFile(path, bytes, { flag: "wx" });
  const handle = await io.open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
  await io.fsyncDirectory(dirname(path));
}

export async function writeMetadataAndFsync(
  stagedRoot,
  metadata,
  io = NODE_DEPENDENCIES.io,
) {
  const path = join(stagedRoot, ...METADATA_RELATIVE_PATH.split("/"));
  await writeAndSync(path, `${JSON.stringify(metadata, null, 2)}\n`, io);
  return path;
}

async function generateValidatedStageAt(options) {
  const { mode, sourceBytes, jobs, stagedRoot, io, pageFactory } = options;
  const comparison = mode === "comparison";
  if (!comparison && mode !== "custom") {
    throw new Error("validated staging requires custom or comparison mode");
  }
  assertCanonicalSource(sourceBytes);
  const canonical = deriveExportJobs();
  if (
    jobs.length !== 87 ||
    stableJson(jobs.map((job) => job.relativeFile)) !==
      stableJson(canonical.map((job) => job.relativeFile))
  ) {
    throw new Error("validated staging jobs do not equal the canonical 87-path plan");
  }
  const bare = !comparison;
  const kitSources = extractKitSources(sourceBytes);
  const bundle = await buildDisposableThreeBundle();
  const outputs = [];
  const created = await pageFactory();
  try {
    await created.page.setContent("<!doctype html><html><body></body></html>");
    await created.page.addScriptTag({ path: bundle.path });
    for (const job of jobs) {
      const output = await exportOne({
        job,
        page: created.page,
        kitSources,
        bare,
        installedExporterSha256: bundle.installedExporterSha256,
      });
      const path = join(stagedRoot, ...job.relativeFile.split("/"));
      await writeAndSync(path, output.bytes, io);
      const reread = await io.readFile(path);
      if (
        reread.byteLength !== output.bytes.byteLength ||
        createHash("sha256").update(reread).digest("hex") !== output.sha256
      ) {
        throw new Error(`staged output reread mismatch: ${job.seedInput}`);
      }
      outputs.push(output);
    }
    const hasFacade = await created.page.evaluate(() =>
      Boolean(globalThis.__era8To10LegacyEncodingFacade),
    );
    if (hasFacade) await removeLegacyEncodingFacade(created.page);
  } finally {
    await created.close();
    await bundle.dispose();
  }
  outputs.sort((left, right) => left.relativeFile.localeCompare(right.relativeFile));
  await assertExactFidelityInventory(
    stagedRoot,
    jobs.map((job) => job.relativeFile),
  );
  const fidelityOptions = comparison
    ? { mode: "comparison", bare: false, writeShippingMetadata: false }
    : { mode: "shipping", bare: true, writeShippingMetadata: true };
  const fidelity = await runStagedFidelityGate({
    ...fidelityOptions,
    stagedRoot,
    jobs,
    sourceBytes,
    pageFactory,
  });
  let metadata = null;
  let metadataEntry = null;
  if (!comparison) {
    const inspections = [];
    for (const era of ["atomic_age", "information_age", "cyberpunk"]) {
      inspections.push(await inspectSourceContract(era, pageFactory));
    }
    const acceptedAssignments = inspections.reduce(
      (total, inspection) =>
        total + inspection.legacyEncoding.acceptedLegacyEncodingAssignments,
      0,
    );
    const unsupportedAssignments = inspections.reduce(
      (total, inspection) =>
        total + inspection.legacyEncoding.unsupportedLegacyEncodingAssignments,
      0,
    );
    metadata = buildMetadata({
      outputs,
      fidelity,
      legacyEncoding: {
        bridgeVersion: 1,
        acceptedAssignments,
        unsupportedAssignments,
      },
      orderedImages: {
        strategy: "serialized invocation order",
        installedExporterSha256: bundle.installedExporterSha256,
      },
    });
    const metadataPath = await writeMetadataAndFsync(stagedRoot, metadata, io);
    const metadataBytes = await io.readFile(metadataPath);
    metadataEntry = Object.freeze({
      relativeFile: METADATA_RELATIVE_PATH,
      stagedPath: metadataPath,
      finalPath: metadataPath,
      sha256: createHash("sha256").update(metadataBytes).digest("hex"),
      bytes: metadataBytes.byteLength,
    });
  }
  const entries = Object.freeze(
    outputs.map((output) =>
      Object.freeze({
        relativeFile: output.relativeFile,
        stagedPath: join(stagedRoot, ...output.relativeFile.split("/")),
        finalPath: join(stagedRoot, ...output.relativeFile.split("/")),
        sha256: output.sha256,
        bytes: output.bytes.byteLength,
      }),
    ),
  );
  return Object.freeze({
    mode,
    stageRoot: stagedRoot,
    outputs: Object.freeze(outputs),
    entries,
    metadata,
    metadataEntry,
    fidelity,
  });
}

export async function createValidatedOwnedStage(options) {
  const { mode, sourceBytes, jobs, io, pageFactory } = options ?? {};
  const stageRoot = await mkdtemp(join(tmpdir(), "era8-10-stage-"));
  const identity = await lstat(stageRoot, { bigint: true });
  let handedOff = false;
  const dispose = async () => {
    const current = await optionalLstat(stageRoot, io);
    if (
      current === null ||
      !current.isDirectory() ||
      current.isSymbolicLink() ||
      current.dev !== identity.dev ||
      current.ino !== identity.ino
    ) {
      throw new Error("owned validated stage identity changed before cleanup");
    }
    await io.rm(stageRoot, { recursive: true, force: true });
    await io.fsyncDirectory(dirname(stageRoot));
  };
  try {
    const generated = await generateValidatedStageAt({
      mode: mode.mode,
      sourceBytes,
      jobs,
      stagedRoot: stageRoot,
      io,
      pageFactory,
    });
    if (
      generated.mode !== "custom" ||
      generated.metadata === null ||
      !generated.metadataEntry
    ) {
      throw new Error("owned custom stage did not produce shipping metadata");
    }
    handedOff = true;
    return Object.freeze({
      ...generated,
      metadata: generated.metadataEntry,
      metadataDocument: generated.metadata,
      dispose,
    });
  } finally {
    if (!handedOff) await dispose();
  }
}

async function assertOwnedCustomOutput(output, io) {
  const metadata = CUSTOM_OUTPUT_HANDLES.get(output);
  if (!metadata) {
    throw new Error("custom publication requires an invocation-owned output handle");
  }
  const parent = await assertOwnedCustomParent(metadata.parent, io);
  const current = await io.lstat(output.path, { bigint: true });
  if (
    !current.isDirectory() ||
    current.isSymbolicLink() ||
    current.dev !== output.device ||
    current.ino !== output.inode
  ) {
    throw new Error("custom publication output ownership changed");
  }
  const physical = await io.realpath(output.path);
  assertContainedPath(parent.realPath, physical, "custom publication output");
  return parent;
}

export async function publishOwnedCustomOutput(plan, deps) {
  exactObjectKeys(
    plan,
    ["mode", "entries", "metadata", "destination"],
    "custom publication plan",
  );
  if (plan.mode !== "custom" || !deps?.io) {
    throw new Error("custom publication requires custom mode and filesystem dependencies");
  }
  await assertOwnedCustomOutput(plan.destination, deps.io);
  const canonical = deriveExportJobs()
    .map((job) => job.relativeFile)
    .sort();
  const observed = plan.entries.map((entry) => entry.relativeFile).sort();
  if (
    plan.entries.length !== 87 ||
    new Set(observed).size !== 87 ||
    stableJson(observed) !== stableJson(canonical) ||
    plan.metadata?.relativeFile !== METADATA_RELATIVE_PATH
  ) {
    throw new Error("custom publication does not contain exact 87 GLBs plus metadata");
  }
  if ((await deps.io.readdir(plan.destination.path)).length !== 0) {
    throw new Error("custom publication destination is not empty");
  }
  for (const entry of plan.entries) {
    const destination = assertContainedPath(
      plan.destination.path,
      resolve(plan.destination.path, ...entry.relativeFile.split("/")),
      `custom publication ${entry.relativeFile}`,
    );
    await deps.io.mkdir(dirname(destination), { recursive: true });
    await deps.io.copyFile(entry.stagedPath, destination, constants.COPYFILE_EXCL);
    const copied = await deps.io.readFile(destination);
    if (
      copied.byteLength !== entry.bytes ||
      createHash("sha256").update(copied).digest("hex") !== entry.sha256
    ) {
      throw new Error(`custom publication byte/hash mismatch: ${entry.relativeFile}`);
    }
    await deps.io.fsyncDirectory(dirname(destination));
  }
  const metadataDestination = join(plan.destination.path, basename(METADATA_RELATIVE_PATH));
  await deps.io.copyFile(
    plan.metadata.stagedPath,
    metadataDestination,
    constants.COPYFILE_EXCL,
  );
  const metadataBytes = await deps.io.readFile(metadataDestination);
  if (
    metadataBytes.byteLength !== plan.metadata.bytes ||
    createHash("sha256").update(metadataBytes).digest("hex") !== plan.metadata.sha256
  ) {
    throw new Error("custom publication metadata byte/hash mismatch");
  }
  await deps.io.fsyncDirectory(plan.destination.path);
  await assertOwnedCustomOutput(plan.destination, deps.io);
  return plan.destination.path;
}

export async function runOwnedComparisonScratch(options) {
  if (!options?.repositoryRoot) throw new Error("comparison requires a repository root");
  return runWithOwnedScratch("era8-10-comparison-", async (scratchRoot) => {
    if (options.sourceBytes && options.pageFactory && options.io) {
      const generated = await generateValidatedStageAt({
        mode: "comparison",
        sourceBytes: options.sourceBytes,
        jobs: options.jobs,
        stagedRoot: scratchRoot,
        io: options.io,
        pageFactory: options.pageFactory,
      });
      if (generated.metadata !== null || generated.metadataEntry !== null) {
        throw new Error("comparison scratch wrote shipping metadata");
      }
      return;
    }
    if (typeof options.runScratch === "function") {
      await options.runScratch({ scratchRoot, mode: "comparison", jobs: options.jobs });
    }
  });
}

export const NODE_DEPENDENCIES = Object.freeze({
  io: Object.freeze({
    open,
    readFile,
    writeFile,
    copyFile,
    link,
    lstat,
    mkdir,
    readdir,
    realpath,
    rename,
    rmdir,
    rm,
    stat,
    unlink,
    async fsyncDirectory(path) {
      const handle = await open(path, "r");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    },
  }),
  pageFactory: async () => {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 256, height: 256 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    return {
      page,
      close: async () => {
        await context.close();
        await browser.close();
      },
    };
  },
});

export async function main(argv = process.argv.slice(2), deps = NODE_DEPENDENCIES) {
  const mode = parseArgs(argv);
  const runtime = { ...NODE_DEPENDENCIES, ...deps, io: deps.io ?? NODE_DEPENDENCIES.io };
  const sourceBytes = new Uint8Array(await runtime.io.readFile(SOURCE));
  assertCanonicalSource(sourceBytes);
  const jobs = deriveExportJobs(ERA_PLANS);
  if (mode.mode === "no-seed") {
    return runOwnedScratchCheck({
      ...runtime,
      mode: mode.mode,
      repositoryRoot: ROOT,
      jobs,
    });
  }
  if (mode.mode === "check") {
    return validateProductionManifest(ROOT, runtime.io);
  }
  if (mode.mode === "repair") {
    return repairIncompleteLateEraOutput({
      repositoryRoot: ROOT,
      jobs,
      io: runtime.io,
    });
  }
  if (mode.mode === "production") {
    const inventory = await classifyReleaseOwnedPaths(ROOT, jobs, runtime.io);
    if (inventory.unknownCandidates.length > 0 || inventory.tempSiblings.length > 0) {
      throw new Error(
        "late-era production contains unknown or interrupted candidates; run " +
          "node scripts/export-era8-10-building-models.mjs --repair-incomplete-late-era-output",
      );
    }
    const present = inventory.owned.length + (inventory.generatedManifest === null ? 0 : 1);
    if (present > 0 && inventory.owned.length !== 88) {
      throw new Error(
        `late-era production is incomplete (${inventory.owned.length}/88 release files); run ` +
          "node scripts/export-era8-10-building-models.mjs --repair-incomplete-late-era-output",
      );
    }
    if (inventory.owned.length === 88) {
      return validateProductionManifest(ROOT, runtime.io);
    }

    const stage = await createValidatedOwnedStage({
      mode: { mode: "custom", bare: true, out: null, seeded: true },
      sourceBytes,
      jobs,
      ...runtime,
    });
    try {
      const finalEntry = (entry) =>
        Object.freeze({
          ...entry,
          finalPath: resolve(ROOT, ...entry.relativeFile.split("/")),
        });
      const publication = {
        mode: "production",
        entries: Object.freeze(stage.entries.map(finalEntry)),
        metadata: finalEntry(stage.metadata),
      };
      const destinationRoot = resolve(ROOT, ...ART_RELATIVE_ROOT.split("/"));
      const prepared = await prepareManifestLastPromotion(
        publication,
        destinationRoot,
        runtime.io,
      );
      const lock = await acquireDestinationLock({
        destinationRoot,
        mode: "promotion",
        io: runtime.io,
      });
      try {
        await promoteManifestLast(prepared, lock, {
          io: runtime.io,
          boundary: runtime.boundary ?? (async () => {}),
        });
      } finally {
        await releaseDestinationLock(lock, runtime.io);
      }
    } finally {
      await stage.dispose();
    }
    return validateProductionManifest(ROOT, runtime.io, {
      phase: "pre-generation-publication",
    });
  }
  if (mode.mode === "comparison") {
    return runOwnedComparisonScratch({
      ...runtime,
      repositoryRoot: ROOT,
      jobs,
      sourceBytes,
    });
  }
  const owned = await createOwnedCustomOutput(mode.out, runtime.io);
  try {
    const stage = await createValidatedOwnedStage({
      mode,
      sourceBytes,
      jobs,
      ...runtime,
    });
    try {
      const retained = await publishOwnedCustomOutput(
        {
          mode: "custom",
          entries: stage.entries,
          metadata: stage.metadata,
          destination: owned,
        },
        runtime,
      );
      process.stdout.write(`${retained}\n`);
      return retained;
    } finally {
      await stage.dispose();
    }
  } catch (error) {
    await owned.dispose();
    throw error;
  }
}

const isMain =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) await main(process.argv.slice(2), {});
