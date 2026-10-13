#!/usr/bin/env node
/**
 * Export every Classical building from Evan's attached Gridwork bundle.
 *
 * Source:
 *   apps/web/src/city/art/building-sources/era-04-classical-all-buildings.dc.html
 *
 * Runtime outputs:
 *   - five skill nodes × site/construction/built, flat in art/models/ (15 GLBs)
 *   - four bought civic types × built, flat under civic-<catalogue-id>-built.glb (4 GLBs)
 *   - the built Senate House in art/models/townhall/ (1 GLB)
 *
 * The attachment supplies all three phases for all ten buildings. Civic buildings are
 * bought complete and the hub is always complete, so their ten early-phase files remain
 * reproducible but unbundled, following the era-one and era-two convention. `--check`
 * regenerates all thirty and verifies those ten against pinned SHA-256 digests.
 *
 * The attachment is a self-unpacking HTML artifact. Its Era4Kit is not an image or GLB:
 * it is one gzip-compressed JavaScript resource in an 18-entry `__bundler/manifest` that
 * procedurally builds `THREE.Group`s. No image, SVG, GLB or linked sibling asset is present.
 * This exporter extracts that resource verbatim, checks the whole attachment's SHA-256,
 * evaluates the kit with the same Three.js version the app uses, seeds `Math.random` per
 * output basename, and exports GLB.
 *
 * Era4Kit defaults to `bare = true`, explicitly documented by the source as "the building
 * alone": no ground pad, surrounding apron, water, planting, vehicles or loose goods. The
 * runtime exports preserve that authored default. The standalone viewer can set `bare =
 * false` for a diorama, but those surroundings do not belong inside a frozen gameplay plot.
 *
 * Usage:
 *   node scripts/export-era4-building-models.mjs
 *   node scripts/export-era4-building-models.mjs --check
 *   node scripts/export-era4-building-models.mjs --all --out tmp/era4-all-stages
 *   node scripts/export-era4-building-models.mjs --check --no-seed
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-04-classical-all-buildings.dc.html",
);
const MODELS = join(ROOT, "apps/web/src/city/art/models");
const TOWNHALL_MODELS = join(MODELS, "townhall");
const SOURCE_SHA256 = "65d525c68cd840178031fba2e5fbf9044d13ad5cba8e34f5d50253e26f10b891";

/**
 * The only authored join: attachment art key → current roster address.
 *
 * Skill ids come from `getEraNodes("classical")`; civic ids come from
 * `civicCatalogueForEra("classical")`; the hub has no node/type id and is keyed by era.
 * The source itself records the five POL ids and the four civic identities in its roster.
 * The civic catalogue shortens "Civic Baths" to "The Baths", but the unique Classical
 * amenity row and the source key `baths` make that join exact rather than visual inference.
 */
const BUILDINGS = [
  { kind: "townhall", id: "classical", art: "senate", name: "the Senate House" },
  { kind: "civic", id: "classical_baths", art: "baths", name: "the Civic Baths" },
  {
    kind: "civic",
    id: "classical_apartment_block",
    art: "cottages",
    // Source roster: 2×1 (long X). Current frozen catalogue: 1×2 (long Z).
    // Turn the asset before export so uniform contain-fit aligns long axis to long axis.
    fitQuarterTurns: 1,
    name: "the Cottages",
  },
  { kind: "civic", id: "classical_fountain", art: "fountain", name: "the Fountain" },
  {
    kind: "civic",
    id: "classical_public_granary",
    art: "dock",
    name: "the Grain Dock",
  },
  { kind: "skill", id: "POL.1", art: "stonecutter", name: "the Stonecutter’s Shop" },
  { kind: "skill", id: "POL.2", art: "barracks", name: "the Barracks" },
  { kind: "skill", id: "POL.3", art: "customs", name: "the Customs House" },
  { kind: "skill", id: "POL.4", art: "cellars", name: "the Wine Cellars" },
  { kind: "skill", id: "POL.8", art: "surveyor", name: "the Surveyor’s Shop" },
];

const STAGES = ["site", "construction", "built"];

/**
 * The ten source-authored phases that runtime deliberately does not bundle: site and
 * construction for four civic buildings and the always-built hub.
 *
 * Filled from a seeded `--all` run. `--check` asserts this map in both directions against
 * the plan, so an exemption cannot silently become stale or grow to hide a built file.
 */
const UNCOMMITTED_DIGESTS = {
  "townhall-classical-site.glb":
    "7efcb1bced561fa9c21206f71f9bc1210a2ff63078bd388518e7658675620a71",
  "townhall-classical-construction.glb":
    "78ca4cf49c233a42917354c9254299a5b96dd0f7a154b6a74053ed10a1b899f2",
  "civic-classical-baths-site.glb":
    "f92949232cb412b2f9945733b5be8a3f0bde1afbbd983e7f1788caa144012186",
  "civic-classical-baths-construction.glb":
    "3610aad5ee7a4cf8477379b46500f12d491dfeeafefb053b5968ec0641abe1d6",
  "civic-classical-apartment-block-site.glb":
    "7f39fc5c3efe7e9044c48009d473d6d44ec15c42603fbd939724f02c4347a65f",
  "civic-classical-apartment-block-construction.glb":
    "f100cdf1a38f0f21e9ceddbcde992663f949673560c00e5ad18b6ccfee6dafd9",
  "civic-classical-fountain-site.glb":
    "bb70c232b4c92293f0decf71de064939c99806ed483948f257795a8f5e1c99d8",
  "civic-classical-fountain-construction.glb":
    "ee05b4a3f7e00cf4c0e2c195081dbd1d2665b19425eaeb929ab093d26897b1b7",
  "civic-classical-public-granary-site.glb":
    "fe4de7682132f92f2d16ed657ad4519da6e64d08f7532b256ff9c7479e491b05",
  "civic-classical-public-granary-construction.glb":
    "d0bf376d1ef2c6889e75462df33c0eba577c1bcf5292057ec7cd6f69d3e376c0",
};

/** Files whose bytes genuinely do not depend on Math.random, asserted both ways. */
const SEED_INDEPENDENT = new Set([]);

function nodeFilePrefix(nodeId) {
  return nodeId.toLowerCase().replace(/\./g, "-");
}

function civicFilePrefix(typeId) {
  return `civic-${typeId.replace(/_/g, "-")}`;
}

function prefixFor(building) {
  switch (building.kind) {
    case "skill":
      return nodeFilePrefix(building.id);
    case "civic":
      return civicFilePrefix(building.id);
    default:
      return "townhall-classical";
  }
}

function outputDirFor(building) {
  return building.kind === "townhall" ? TOWNHALL_MODELS : MODELS;
}

/** Skill phases all ship; bought civic buildings and the hub ship only their built phase. */
function isCommitted(building, stage) {
  return building.kind === "skill" || stage === "built";
}

function plan() {
  return BUILDINGS.flatMap((building) =>
    STAGES.map((stage) => ({
      ...building,
      stage,
      name: `${prefixFor(building)}-${stage}.glb`,
      dir: outputDirFor(building),
      committed: isCommitted(building, stage),
    })),
  );
}

function seedFor(name) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function scriptBlock(html, type) {
  const marker = `<script type="${type}">`;
  const open = html.indexOf(marker);
  if (open < 0) {
    throw new Error(`no ${type} block — is this a Gridwork offline bundle?`);
  }
  const start = open + marker.length;
  const close = html.indexOf("</script>", start);
  if (close < 0) {
    throw new Error(`unterminated ${type} block`);
  }
  return html.slice(start, close).trim();
}

/** Extract the one manifest resource that defines window.Era4Kit. */
function era4KitSource(html) {
  const manifest = JSON.parse(scriptBlock(html, "__bundler/manifest"));
  const matches = [];
  for (const [uuid, entry] of Object.entries(manifest)) {
    if (!/javascript/.test(entry.mime)) {
      continue;
    }
    const stored = Buffer.from(entry.data, "base64");
    const bytes = entry.compressed ? gunzipSync(stored) : stored;
    const source = bytes.toString("utf8");
    if (source.includes("window.Era4Kit")) {
      matches.push({ uuid, source });
    }
  }
  if (matches.length !== 1) {
    throw new Error(`expected one Era4Kit manifest resource, found ${matches.length}`);
  }
  const match = matches[0];
  if (!match.source.includes("defs()") || !match.source.includes("roster()")) {
    throw new Error(`Era4Kit resource ${match.uuid} has no defs()/roster() contract`);
  }
  return match.source;
}

/** Bundle the app's Three.js and GLTFExporter for browser evaluation. */
function threeBundle() {
  const dir = join(ROOT, "tmp/era4-exporter");
  mkdirSync(dir, { recursive: true });
  const entry = join(dir, "three-entry.js");
  const out = join(dir, "three-bundle.js");
  writeFileSync(
    entry,
    [
      'import * as THREE from "three";',
      'import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";',
      "window.THREE = THREE;",
      "window.GLTFExporter = GLTFExporter;",
      "",
    ].join("\n"),
  );
  const esbuild = join(ROOT, "node_modules/.bin/esbuild");
  if (!existsSync(esbuild)) {
    throw new Error("esbuild not installed — run `npm install` at the repo root");
  }
  execFileSync(esbuild, [
    entry,
    "--bundle",
    "--format=iife",
    `--outfile=${out}`,
    "--log-level=warning",
  ]);
  return out;
}

function assertUncommittedPopulation(jobs) {
  const expected = jobs
    .filter((job) => !job.committed)
    .map((job) => job.name)
    .sort();
  const declared = Object.keys(UNCOMMITTED_DIGESTS).sort();
  if (expected.length !== 10 || JSON.stringify(expected) !== JSON.stringify(declared)) {
    throw new Error(
      `uncommitted digest population does not match the ten civic/hub early phases:\n` +
        `expected ${expected.join(", ")}\n` +
        `declared ${declared.join(", ")}`,
    );
  }
}

function parseArgs(argv) {
  const seen = new Set();
  let check = false;
  let all = false;
  let seeded = true;
  let out = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!["--check", "--all", "--no-seed", "--out"].includes(arg)) {
      throw new Error(`Unknown exporter argument: ${JSON.stringify(arg)}`);
    }
    if (seen.has(arg)) {
      throw new Error(`Duplicate exporter flag: ${arg}`);
    }
    seen.add(arg);

    switch (arg) {
      case "--check":
        check = true;
        break;
      case "--all":
        all = true;
        break;
      case "--no-seed":
        seeded = false;
        break;
      default: {
        const value = argv[index + 1];
        if (typeof value !== "string" || value.trim() === "" || value.startsWith("--")) {
          throw new Error("--out requires one non-empty path value");
        }
        out = value.trim();
        index += 1;
      }
    }
  }

  if (!seeded && !check) {
    throw new Error(
      "--no-seed requires --check so random bytes can never overwrite assets",
    );
  }
  if (all && !out && !check) {
    throw new Error(
      "--all requires --out so deliberately unbundled stages stay out of the tree",
    );
  }
  if (check && all) {
    throw new Error(
      "--check already verifies all stages and cannot be combined with --all",
    );
  }
  if (check && out) {
    throw new Error(
      "--check owns an isolated temp output and cannot be combined with --out",
    );
  }

  return { check, all: all || check, seeded, out };
}

function physicalPath(candidate) {
  const suffix = [];
  let existing = resolve(candidate);
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) {
      throw new Error(`Cannot resolve exporter output path: ${candidate}`);
    }
    suffix.unshift(basename(existing));
    existing = parent;
  }
  return resolve(realpathSync(existing), ...suffix);
}

function assertSafeCustomOut(out) {
  if (out === null) {
    return;
  }
  const productionModels = physicalPath(MODELS);
  const customOut = physicalPath(out);
  const fromProduction = relative(productionModels, customOut);
  const insideProduction =
    fromProduction === "" ||
    (!isAbsolute(fromProduction) &&
      fromProduction !== ".." &&
      !fromProduction.startsWith(`..${sep}`));
  if (insideProduction) {
    throw new Error(
      `Custom --out cannot resolve inside the production model tree: ${customOut}`,
    );
  }
}

async function main() {
  const { check, all, seeded, out } = parseArgs(process.argv.slice(2));
  assertSafeCustomOut(out);
  const overrideOut = check ? mkdtempSync(join(tmpdir(), "era4-building-glb-")) : out;

  const jobs = plan();
  assertUncommittedPopulation(jobs);
  const selected = all ? jobs : jobs.filter((job) => job.committed);
  const sourceBytes = readFileSync(SOURCE);
  const sourceDigest = createHash("sha256").update(sourceBytes).digest("hex");
  if (sourceDigest !== SOURCE_SHA256) {
    throw new Error(
      `Era 4 source is not the canonical attachment: expected ${SOURCE_SHA256}, got ${sourceDigest}`,
    );
  }
  const kitSource = era4KitSource(sourceBytes.toString("utf8"));
  const bundle = threeBundle();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const problems = [];
  const expectedWarnings = [
    "Use MeshStandardMaterial or MeshBasicMaterial",
    "THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial.",
  ];
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !expectedWarnings.some((warning) => message.text().includes(warning))
    ) {
      problems.push(message.text());
    }
  });
  page.on("pageerror", (error) => problems.push(String(error)));
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: bundle });
  await page.addScriptTag({ content: kitSource });

  const sourceKeys = await page.evaluate(() => Object.keys(new window.Era4Kit().defs()));
  const expectedKeys = BUILDINGS.map((building) => building.art);
  if (
    sourceKeys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !sourceKeys.includes(key))
  ) {
    throw new Error(
      `attachment defs do not match the ten mapped buildings: ` +
        `source=[${sourceKeys.join(", ")}], mapping=[${expectedKeys.join(", ")}]`,
    );
  }

  const written = [];
  for (const job of selected) {
    const result = await page.evaluate(
      async ([art, stage, seed, seeded, fitQuarterTurns]) => {
        const realRandom = Math.random;
        let state = seed >>> 0;
        if (seeded) {
          Math.random = () => {
            state = (state + 0x6d2b79f5) >>> 0;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
          };
        }

        const T = window.THREE;
        const managedColour = T.ColorManagement.enabled;
        // Era4Kit calls convertSRGBToLinear itself, as it did under bundled Three r128.
        // Disable r185's implicit conversion for the build so each material converts once.
        T.ColorManagement.enabled = false;
        try {
          const kit = new window.Era4Kit();
          if (kit.bare !== true) {
            throw new Error("Era4Kit no longer defaults to building-only bare mode");
          }
          const build = kit.defs()[art];
          if (!build) {
            throw new Error(`no Era4Kit builder for '${art}'`);
          }
          const group = build(stage);
          group.rotation.y = fitQuarterTurns * (Math.PI / 2);
          group.updateMatrixWorld(true);
          const box = new T.Box3().setFromObject(group);
          const size = box.getSize(new T.Vector3());

          const geometries = new Set();
          const materials = new Set();
          const textures = new Set();
          let meshes = 0;
          let triangles = 0;
          let geometryBytes = 0;
          group.traverse((object) => {
            if (!object.isMesh) {
              return;
            }
            meshes += 1;
            const objectMaterials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            for (const material of objectMaterials) {
              materials.add(material.uuid);
              for (const value of Object.values(material)) {
                if (value?.isTexture) {
                  textures.add(value.uuid);
                }
              }
            }
            const geometry = object.geometry;
            if (geometries.has(geometry.uuid)) {
              return;
            }
            geometries.add(geometry.uuid);
            for (const attribute of Object.values(geometry.attributes)) {
              geometryBytes += attribute.array?.byteLength ?? 0;
            }
            if (geometry.index?.array) {
              geometryBytes += geometry.index.array.byteLength;
              triangles += geometry.index.count / 3;
            } else if (geometry.attributes.position) {
              triangles += geometry.attributes.position.count / 3;
            }
          });

          const glb = await new Promise((resolve, reject) =>
            new window.GLTFExporter().parse(group, resolve, reject, { binary: true }),
          );
          let binary = "";
          const bytes = new Uint8Array(glb);
          for (let index = 0; index < bytes.length; index += 1) {
            binary += String.fromCharCode(bytes[index]);
          }
          return {
            b64: btoa(binary),
            min: box.min.toArray().map((value) => Number(value.toFixed(2))),
            max: box.max.toArray().map((value) => Number(value.toFixed(2))),
            size: [size.x, size.y, size.z].map((value) => Number(value.toFixed(2))),
            meshes,
            materials: materials.size,
            textures: textures.size,
            triangles: Math.round(triangles),
            geometryBytes,
          };
        } finally {
          Math.random = realRandom;
          T.ColorManagement.enabled = managedColour;
        }
      },
      [
        job.art,
        job.stage,
        seedFor(job.name.replace(/\.glb$/, "")),
        seeded,
        job.fitQuarterTurns ?? 0,
      ],
    );

    const bytes = Buffer.from(result.b64, "base64");
    const dir = overrideOut ?? job.dir;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, job.name), bytes);
    written.push({
      ...job,
      bytes: bytes.length,
      min: result.min,
      max: result.max,
      size: result.size,
      meshes: result.meshes,
      materials: result.materials,
      textures: result.textures,
      triangles: result.triangles,
      geometryBytes: result.geometryBytes,
    });
    console.log(
      `${job.name.padEnd(50)} ${String(bytes.length).padStart(9)} B  ` +
        `${result.size.join(" × ")}u  ${String(result.meshes).padStart(4)} meshes  ` +
        `${String(result.materials).padStart(3)} mats  ${String(result.textures).padStart(3)} tex  ` +
        `${String(result.triangles).padStart(7)} tris  ${job.name}`,
    );
  }
  await browser.close();

  if (problems.length > 0) {
    console.error("\nPAGE ERRORS (the export is not trustworthy):");
    for (const problem of problems) {
      console.error(`  ${problem}`);
    }
    process.exitCode = 1;
    return;
  }

  const total = written.reduce((sum, output) => sum + output.bytes, 0);
  console.log(`\n${written.length} files, ${total} bytes total`);

  if (!check) {
    return;
  }

  console.log(`\n--check: comparing ${overrideOut} against the tree`);
  let differing = 0;
  const unchanged = [];
  for (const job of written) {
    const fresh = readFileSync(join(overrideOut, job.name));
    const digest = createHash("sha256").update(fresh).digest("hex");
    let tracked = null;
    try {
      tracked = readFileSync(join(job.dir, job.name));
    } catch {
      tracked = null;
    }

    if (!job.committed) {
      if (tracked) {
        console.log(`  ${job.name}: PRESENT in the tree but declared uncommitted`);
        differing += 1;
        continue;
      }
      const same = UNCOMMITTED_DIGESTS[job.name] === digest;
      console.log(
        same
          ? `  ${job.name}: absent by design, regenerates to its pinned digest`
          : `  ${job.name}: absent by design, but REGENERATED DIFFERENTLY ` +
              `(pinned ${UNCOMMITTED_DIGESTS[job.name] || "nothing"}, got ${digest})`,
      );
      if (same) {
        unchanged.push(job.name);
      } else {
        differing += 1;
      }
      continue;
    }

    if (!tracked) {
      console.log(`  ${job.name}: MISSING from the tree`);
      differing += 1;
      continue;
    }
    if (UNCOMMITTED_DIGESTS[job.name]) {
      console.log(`  ${job.name}: committed but also pinned as uncommitted`);
      differing += 1;
      continue;
    }
    const same = fresh.equals(tracked);
    console.log(`  ${job.name}: ${same ? "identical" : "DIFFERS"}`);
    if (same) {
      unchanged.push(job.name);
    } else {
      differing += 1;
    }
  }

  if (seeded) {
    console.log(differing === 0 ? "\nreproducible" : `\n${differing} file(s) differ`);
    process.exitCode = differing === 0 ? 0 : 1;
    return;
  }

  const surprises = unchanged.filter((name) => !SEED_INDEPENDENT.has(name));
  const stale = [...SEED_INDEPENDENT].filter((name) => !unchanged.includes(name));
  console.log(
    `\n--no-seed: ${differing} of ${written.length} differ; ` +
      `${unchanged.length} unchanged (${written.length - SEED_INDEPENDENT.size} expected to differ)`,
  );
  for (const name of surprises) {
    console.log(`  ${name}: UNCHANGED without the seed, and not declared seed-independent`);
  }
  for (const name of stale) {
    console.log(`  ${name}: declared seed-independent but it DIFFERED without the seed`);
  }
  const ok =
    surprises.length === 0 &&
    stale.length === 0 &&
    differing >= written.length - SEED_INDEPENDENT.size;
  console.log(ok ? "the seed is load-bearing" : "the seed claim does not hold");
  process.exitCode = ok ? 0 : 1;
}

await main();
