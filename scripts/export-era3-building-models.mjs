#!/usr/bin/env node
/**
 * Export every Bronze Age building from Evan's attached Gridwork bundle.
 *
 * Source:
 *   apps/web/src/city/art/building-sources/era-03-bronze-age-all-buildings.dc.html
 *
 * Runtime outputs:
 *   - five skill nodes × site/construction/built, flat in art/models/ (15 GLBs)
 *   - four bought civic types × built, flat under civic-<catalogue-id>-built.glb (4 GLBs)
 *   - the built Council Hall in art/models/townhall/ (1 GLB)
 *
 * The attachment supplies all three phases for all ten buildings. Civic buildings are
 * bought complete and the hub is always complete, so their ten early-phase files remain
 * reproducible but unbundled, following the era-one and era-two convention. `--check`
 * regenerates all thirty and verifies those ten against pinned SHA-256 digests.
 *
 * The attachment is a self-unpacking HTML artifact. Its Era3Kit is not an image or GLB:
 * it is a gzip-compressed JavaScript resource in `__bundler/manifest` that procedurally
 * builds `THREE.Group`s. This exporter extracts that resource verbatim, evaluates it with
 * the same Three.js version the app uses, seeds `Math.random` per output basename, and
 * exports GLB.
 *
 * Usage:
 *   node scripts/export-era3-building-models.mjs
 *   node scripts/export-era3-building-models.mjs --check
 *   node scripts/export-era3-building-models.mjs --all --out tmp/era3-all-stages
 *   node scripts/export-era3-building-models.mjs --check --no-seed
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-03-bronze-age-all-buildings.dc.html",
);
const MODELS = join(ROOT, "apps/web/src/city/art/models");
const TOWNHALL_MODELS = join(MODELS, "townhall");

/**
 * The only authored join: attachment art key → current roster address.
 *
 * Skill ids come from `getEraNodes("bronze_age")`; civic ids come from
 * `civicCatalogueForEra("bronze_age")`; the hub has no node/type id and is keyed by era.
 * Names in the attachment and both current rosters agree exactly, so no row is inferred
 * from visual similarity.
 */
const BUILDINGS = [
  { kind: "skill", id: "LIN.1", art: "hall", name: "the Merchants’ Hall" },
  { kind: "skill", id: "LIN.3", art: "foundry", name: "the Bronze Foundry" },
  { kind: "skill", id: "LIN.4", art: "treasury", name: "the Treasury" },
  { kind: "skill", id: "LIN.5", art: "yard", name: "the Ingot Yard" },
  { kind: "skill", id: "LIN.6", art: "stronghold", name: "the Stronghold" },
  {
    kind: "civic",
    id: "bronze_age_terraced_fields",
    art: "fields",
    // Source roster: 3×2 (long X). Current frozen catalogue: 1×2 (long Z).
    // Turn the asset before export so uniform contain-fit aligns long axis to long axis.
    fitQuarterTurns: 1,
    // The delivered 3×2 composition is nearly square after that turn (30 × 34), so a
    // uniform fit to 1×2 fills only 53.8% of the long axis. Repeat the authored terrace
    // composition along that axis: terrain, retaining walls, irrigation, crop rows and
    // props all keep their proportions, while the combined 30 × 64 subject matches the
    // long plot without stretching.
    longAxisRepeat: { copies: 2, step: 30 },
    name: "the Terraced Fields",
  },
  {
    kind: "civic",
    id: "bronze_age_walled_houses",
    art: "houses",
    name: "the Walled Houses",
  },
  { kind: "civic", id: "bronze_age_bathhouse", art: "steam", name: "the Steam House" },
  {
    kind: "civic",
    id: "bronze_age_weigh_house",
    art: "post",
    name: "the Trading Post",
  },
  { kind: "townhall", id: "bronze_age", art: "council", name: "the Council Hall" },
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
  "civic-bronze-age-terraced-fields-site.glb":
    "3030b3d19c3da6bf0355a9f0c277996ef7a4f373c4cfa86b415452970ba583ff",
  "civic-bronze-age-terraced-fields-construction.glb":
    "fc2c29860d2863d98c26c9f626815cd7b2e5e617bceeaa875ac365677d2f6369",
  "civic-bronze-age-walled-houses-site.glb":
    "1f326a025518d1d9b57480a1713e5cf3c6e3c25ed03b0fafa4753ba69b75da83",
  "civic-bronze-age-walled-houses-construction.glb":
    "38fd77bf7217365fecf86203c918c8a7d23375ff1c686a284bb768d0b44bb61e",
  "civic-bronze-age-bathhouse-site.glb":
    "2442cfe44f5f9696c40b42dc4a0dd937bc1df0dcb8642814fc0aae71d1e4987a",
  "civic-bronze-age-bathhouse-construction.glb":
    "c7c071e4af4e88af2d4bb4ee26bb4ad2fc7a7a3ddae7be86495fdfffa557166a",
  "civic-bronze-age-weigh-house-site.glb":
    "831f9e0d56469c0aee89be298f6999ad21c49022fdce6428a079f27dbccb5297",
  "civic-bronze-age-weigh-house-construction.glb":
    "92b387bcee088800486e77372cdebf8bac519044bc601cef634a48e1b3115ae2",
  "townhall-bronze-age-site.glb":
    "b61fb9ccd524af9f2571e9ba35a65ae252f0975ad9cf3a37291c7f571044639d",
  "townhall-bronze-age-construction.glb":
    "7a2141e8bbb968b30797a9f5ebddeefcab45886d1332f082dc15727f66dcb7ff",
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
      return "townhall-bronze-age";
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

/** Extract the one manifest resource that defines window.Era3Kit. */
function era3KitSource(html) {
  const manifest = JSON.parse(scriptBlock(html, "__bundler/manifest"));
  const matches = [];
  for (const [uuid, entry] of Object.entries(manifest)) {
    if (!/javascript/.test(entry.mime)) {
      continue;
    }
    const stored = Buffer.from(entry.data, "base64");
    const bytes = entry.compressed ? gunzipSync(stored) : stored;
    const source = bytes.toString("utf8");
    if (source.includes("window.Era3Kit")) {
      matches.push({ uuid, source });
    }
  }
  if (matches.length !== 1) {
    throw new Error(`expected one Era3Kit manifest resource, found ${matches.length}`);
  }
  const match = matches[0];
  if (!match.source.includes("defs()") || !match.source.includes("roster()")) {
    throw new Error(`Era3Kit resource ${match.uuid} has no defs()/roster() contract`);
  }
  return match.source;
}

/** Bundle the app's Three.js and GLTFExporter for browser evaluation. */
function threeBundle() {
  const dir = join(ROOT, "tmp/era3-exporter");
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

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const all = args.includes("--all") || check;
  const seeded = !args.includes("--no-seed");
  const outIndex = args.indexOf("--out");
  const overrideOut = check
    ? mkdtempSync(join(tmpdir(), "era3-building-glb-"))
    : outIndex >= 0
      ? args[outIndex + 1]
      : null;

  const jobs = plan();
  assertUncommittedPopulation(jobs);
  const selected = all ? jobs : jobs.filter((job) => job.committed);
  const kitSource = era3KitSource(readFileSync(SOURCE, "utf8"));
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

  const sourceKeys = await page.evaluate(() => Object.keys(new window.Era3Kit().defs()));
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
      async ([art, stage, seed, seeded, fitQuarterTurns, longAxisRepeat]) => {
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
        // Era3Kit calls convertSRGBToLinear itself, as it did under bundled Three r128.
        // Disable r185's implicit conversion for the build so each material converts once.
        T.ColorManagement.enabled = false;
        try {
          const kit = new window.Era3Kit();
          const build = kit.defs()[art];
          if (!build) {
            throw new Error(`no Era3Kit builder for '${art}'`);
          }
          const sourceGroup = build(stage);
          sourceGroup.rotation.y = fitQuarterTurns * (Math.PI / 2);
          sourceGroup.updateMatrixWorld(true);
          let group = sourceGroup;
          if (longAxisRepeat) {
            const repeated = new T.Group();
            const centre = (longAxisRepeat.copies - 1) / 2;
            for (let copy = 0; copy < longAxisRepeat.copies; copy += 1) {
              const segment = sourceGroup.clone(true);
              segment.position.z += (copy - centre) * longAxisRepeat.step;
              repeated.add(segment);
            }
            group = repeated;
          }
          group.updateMatrixWorld(true);
          const box = new T.Box3().setFromObject(group);
          const size = box.getSize(new T.Vector3());

          const geometries = new Set();
          let meshes = 0;
          let triangles = 0;
          let geometryBytes = 0;
          group.traverse((object) => {
            if (!object.isMesh) {
              return;
            }
            meshes += 1;
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
            size: [size.x, size.y, size.z].map((value) => Number(value.toFixed(2))),
            meshes,
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
        job.longAxisRepeat ?? null,
      ],
    );

    const bytes = Buffer.from(result.b64, "base64");
    const dir = overrideOut ?? job.dir;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, job.name), bytes);
    written.push({
      ...job,
      bytes: bytes.length,
      size: result.size,
      meshes: result.meshes,
      triangles: result.triangles,
      geometryBytes: result.geometryBytes,
    });
    console.log(
      `${job.name.padEnd(50)} ${String(bytes.length).padStart(9)} B  ` +
        `${result.size.join(" × ")}u  ${String(result.meshes).padStart(4)} meshes  ` +
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
