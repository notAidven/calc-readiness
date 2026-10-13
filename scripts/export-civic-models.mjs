#!/usr/bin/env node
/**
 * Export era one's FOUR CIVIC BUILDINGS from Evan's authored art source into the flat
 * GLB registry directory, three stages each.
 *
 *   in   apps/web/src/city/art/building-sources/civic-era-01-all-stages.dc.html
 *   out  apps/web/src/city/art/models/civic-<type>-<stage>.glb   (12 files)
 *
 * EIGHT OF THOSE TWELVE ARE DELIBERATELY NOT COMMITTED, AND NOTHING IS BROKEN. If you
 * have found an exporter that emits twelve files where eight are absent from the tree,
 * that is the design and not a mistake: see {@link UNCOMMITTED_STAGES} for which eight,
 * why, and the one command that brings them back.
 *
 * WHY A SCRIPT AND NOT A ONE-OFF. The art is PROCEDURAL three.js, not an SVG or a
 * mesh file: the source is a builder class that emits a `THREE.Group` per building
 * per stage. Without a committed exporter nobody could regenerate a model or diff a
 * change to one, so this file is the only thing standing between the GLBs and being
 * unreproducible binaries.
 *
 * REPRODUCIBILITY RESTS ON THE SEED. Evan's builders call `Math.random()` in 76
 * places — scattered stones, tussocks, jitter on every post. Left unseeded, two
 * exports of the same building differ and a diff means nothing. So `Math.random` is
 * REPLACED, per (type, stage), with a mulberry32 stream seeded from that pair's name
 * (see {@link SEEDS}). Re-running this script byte-for-byte reproduces the same 12
 * files; changing a builder changes only what the builder changed.
 *
 * NOTHING IS HAND-PORTED. The builder class is lifted VERBATIM out of the source's
 * `<script type="text/x-dc">` block and evaluated as-is against a stub of the design
 * tool's `DCLogic` base class. A hand-port of 1,500 lines of geometry would be a
 * second source of truth and would drift from Evan's the first time he re-exports.
 *
 * THE STAGE MAPPING IS THE SOURCE'S OWN, and it matches the engine's three model
 * stages exactly (`buildingAssets.ts` `MODEL_STAGES`):
 *
 *   site         ← `_stageCleared(T, def)`   the source's "Cleared ground"
 *   construction ← `_stageFrame(T, def)`     the source's "Frame up"
 *   built        ← `def.build(T, {})`        the source's "Finished"
 *
 * THE GROUND PAD STAYS IN, because that is the convention the shipped era-one set
 * already follows and the two must agree: measured at the tip, `num-2-built.glb` is
 * 19.00 × 17.00 units, which is exactly `_buildShelters`' own `_pad(T, g, 19, 17)`,
 * and `num-2-site.glb` is 21.00 × 19.40, exactly `_stageCleared`'s pad for that
 * footprint. `PlacedBuilding.prepareModel` CONTAIN-FITS whatever it is given to the
 * node's footprint, so dropping the pad here would render era one's civic buildings
 * systematically larger than its skill buildings on the same plot.
 *
 * Usage:  node scripts/export-civic-models.mjs [--out <dir>] [--check] [--no-seed]
 *   --check    writes to a temp dir and reports whether the bytes match the tree — and,
 *              for the eight stages the tree deliberately does not carry, whether they
 *              still reproduce their pinned SHA-256 ({@link UNCOMMITTED_DIGESTS}). That
 *              is the reproducibility assertion, runnable by hand.
 *   --no-seed  leaves `Math.random` alone. THE COUNTER-DEMONSTRATION: it exists so the
 *              seed can be shown to be load-bearing rather than argued to be. `--check
 *              --no-seed` reports every one of the 12 as DIFFERING, which is what makes
 *              the plain `--check` green mean something.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/civic-era-01-all-stages.dc.html",
);
const DEFAULT_OUT = join(ROOT, "apps/web/src/city/art/models");

/**
 * THE NAMING KEY, and the one line the gameplay lane needs from this file:
 * **a civic model is addressed as `civic-<type>-<stage>.glb`**, flat in `art/models/`,
 * where `<type>` is `@cr/game`'s SHIPPED `EraOneCivicTypeId` with `_` collapsed to `-`,
 * and `<stage>` is one of `site` / `construction` / `built`.
 *
 * **`type` is not ours to invent, and the first draft of this file did invent it.** The
 * four ids already ship, in `engines/game/src/city-vitality-tuning.ts`'s
 * `ERA_ONE_CIVIC_TYPES` — `smokehouse`, `longhouse`, `campfire`, `water_spring`, each
 * with its name, footprint, cost, contributions and citizen role. Naming these files
 * after the art's own slugs instead (`lodge`, `spring`) would have produced twelve
 * models the economy lane holds no key for, which is exactly the failure this key
 * exists to prevent.
 *
 * `art` is the slug INSIDE Evan's source (`_defs()` / `_rosters().civic`). Two of the four
 * differ from the shipped id, and this table is the whole reason that is survivable: the
 * slug is a key into Evan's authored `_defs()`, so it is HIS to rename and not ours.
 * `spring` therefore stays `spring` even though the shipped id it feeds became
 * `water_spring` on 2026-07-29 — Evan ruled that the 1×1 row is the spring the art draws
 * rather than the storage pit the catalogue used to name, and the ROW moved. Editing the
 * slug would mean editing `civic-era-01-all-stages.dc.html`, which is lifted verbatim and
 * would drift from his the first time he re-exports. See
 * `apps/web/src/city/civicBuildings.ts` for both notes and who owns what is left of them.
 *
 * **RENAMING A `type` CHANGES THE BYTES, and that is by design rather than a surprise.**
 * {@link SEEDS} is FNV-1a over `"<type>-<stage>"`, so `water-spring-built` draws a
 * different random stream from `storage-pit-built` and the same builder emits a differently
 * jittered spring. The rename was therefore a `git mv` plus a real re-export, and the eight
 * digests in {@link UNCOMMITTED_DIGESTS} were re-measured from that run rather than edited.
 */
const CIVIC = [
  { type: "longhouse", art: "lodge" },
  { type: "smokehouse", art: "smoke" },
  { type: "campfire", art: "campfire" },
  { type: "water-spring", art: "spring" },
];

const STAGES = ["site", "construction", "built"];

/**
 * THE EIGHT EARLY-STAGE FILES ARE DELIBERATELY NOT COMMITTED — `site` and `construction`,
 * for all four types. Only `civic-<type>-built.glb` is in the tree.
 *
 * WHY. A civic building is **bought, not built through mastery**: it has no lesson, no CFU
 * and no `student_node_state` row, so nothing in the shipped design ever advances one off
 * `built` and `resolveCivicModel` is only ever asked for `built`
 * (`apps/web/src/city/civicBuildings.ts`). Committing the other eight cost 2,559,576 bytes
 * of `dist` for stages no code path reaches.
 *
 * **THE ART IS NOT LOST, AND THAT IS THE WHOLE POINT OF THIS SCRIPT.** Evan authored all
 * three moments deliberately — the source's own stage picker offers "Cleared ground" /
 * "Frame up" / "Finished" for every civic type, and each has its own `frame()` builder
 * rather than a generic scaffold. The art is CODE, it is committed
 * (`civic-era-01-all-stages.dc.html`), and the seed makes it reproducible, so one command
 * brings all twelve back:
 *
 *   node scripts/export-civic-models.mjs           # writes all 12 into the tree
 *
 * If you want them back permanently, that command plus `git add` on the eight is the whole
 * change: the registry glob picks them up and `resolveCivicModel` returns them with no code
 * edit. Until then it answers an early stage with the shared procedural stand-in rather
 * than `null`, deliberately (`CIVIC_UNBUNDLED_STAGES` holds that decision).
 *
 * {@link UNCOMMITTED_DIGESTS} pins what the eight must regenerate to, so "recoverable" is
 * something `--check` verifies rather than something this comment promises.
 */
const UNCOMMITTED_STAGES = new Set(["site", "construction"]);

/**
 * SHA-256 of the eight uncommitted files as this exporter produces them, measured at the
 * commit that removed them from the tree. `--check` regenerates and compares against these,
 * so a builder edit that silently changes an early stage is still caught even though the
 * bytes are not in git.
 *
 * A deliberate change to one of these builders is expected to turn `--check` red here; the
 * fix is to re-measure and update the digest in the same commit as the builder change,
 * exactly as a committed GLB would be re-exported.
 */
const UNCOMMITTED_DIGESTS = {
  "civic-longhouse-site.glb":
    "755c4d6f58ac5e4bdbbfa2718d07b64edf0d958a86c5124b4adfcaa375d90d0e",
  "civic-longhouse-construction.glb":
    "da5650870a94f97714fbffb838c60eccb69d6ada7875c2e4209b4f33021333a0",
  "civic-smokehouse-site.glb":
    "326bfcb067d7d5362a843ce5d06887be1d18741065ef42406f2e1b519d184b7c",
  "civic-smokehouse-construction.glb":
    "476e22704c9ba00b845f6287943104d03fad49d789534639d1ff29778aacf42f",
  "civic-campfire-site.glb":
    "e9f18fa3a046753ad2b0f7d1801ec27e30a9552763eeb6016e04518a2607dd66",
  "civic-campfire-construction.glb":
    "ecc468a8a39223a475efcb5d1e56ed9499dcf3d8534a15677f144c1be9c62183",
  // RE-MEASURED 2026-07-29 from a real `--out` run, not edited: `storage_pit` became
  // `water_spring`, and the seed is FNV-1a over the output name, so both files legitimately
  // regenerate to new bytes under the new name.
  "civic-water-spring-site.glb":
    "2dcaa509f21c4749f06135cbf845b8017d9516ef1c8410ba50e6e25811ec7493",
  "civic-water-spring-construction.glb":
    "345d13d7ef522320f197cc58822278b1a96b8e232f17cae5a430b8cb2abb4c87",
};

/**
 * A stable 32-bit seed per (type, stage) — FNV-1a over `"<type>-<stage>"`, so the
 * seed is derived from the output filename and cannot drift out of step with it.
 */
function seedFor(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const SEEDS = Object.fromEntries(
  CIVIC.flatMap(({ type }) =>
    STAGES.map((stage) => [`${type}-${stage}`, seedFor(`${type}-${stage}`)]),
  ),
);

/**
 * The design tool ships a SELF-UNPACKING page: the real document is a JSON string in
 * a `<script type="__bundler/template">` block, and its assets are base64 + gzip in a
 * sibling manifest. So the markup that holds the builder class is one `JSON.parse`
 * inside the file, not the file itself.
 */
function unpackTemplate(html) {
  const marker = '<script type="__bundler/template">';
  const open = html.indexOf(marker);
  if (open < 0) {
    throw new Error("no __bundler/template block — is this a .dc.html export?");
  }
  const start = open + marker.length;
  return JSON.parse(html.slice(start, html.indexOf("</script>", start)).trim());
}

/** Lift the builder class out of the source's `<script type="text/x-dc">` block. */
function builderClassSource(html) {
  const open = html.indexOf('<script type="text/x-dc"');
  if (open < 0) {
    throw new Error('no <script type="text/x-dc"> block in the art source');
  }
  const bodyStart = html.indexOf(">", open) + 1;
  const close = html.indexOf("</script>", bodyStart);
  const body = html.slice(bodyStart, close);
  if (!/class\s+Component\s+extends\s+DCLogic/.test(body)) {
    throw new Error("the x-dc block is not the `class Component extends DCLogic` one");
  }
  return body;
}

/**
 * Bundle three + `GLTFExporter` into one browser-loadable file, on demand. Built
 * rather than committed, so the exporter always runs against the SAME three the app
 * renders with (`apps/web/package.json`) instead of a stale copy of it.
 */
function threeBundle() {
  const entry = join(ROOT, "output/civic/three-entry.js");
  const out = join(ROOT, "output/civic/three-bundle.js");
  execFileSync("mkdir", ["-p", join(ROOT, "output/civic")]);
  writeFileSync(
    entry,
    [
      'import * as THREE from "three";',
      'import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";',
      'import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";',
      "window.THREE = THREE;",
      "window.GLTFExporter = GLTFExporter;",
      "window.GLTFLoader = GLTFLoader;",
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

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const seeded = !args.includes("--no-seed");
  const outIndex = args.indexOf("--out");
  const outDir = check
    ? mkdtempSync(join(tmpdir(), "civic-glb-"))
    : outIndex >= 0
      ? args[outIndex + 1]
      : DEFAULT_OUT;

  const classSource = builderClassSource(unpackTemplate(readFileSync(SOURCE, "utf8")));

  // The app renders with three 0.185 (`apps/web/package.json`), so EXPORT with 0.185
  // too: a GLB written by the source's own bundled r128 and read by r185 would cross
  // the r152 colour-management change, and the whole point of the export is that what
  // Evan drew is what the city shows. The builders only touch primitives both agree on.
  const bundle = threeBundle();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") {
      problems.push(m.text());
    }
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: bundle });
  await page.evaluate(
    ([source]) => {
      // The design tool's base class, stubbed down to what the builders touch.
      window.DCLogic = class DCLogic {
        constructor() {
          this.props = {};
          this.state = {};
        }
        setState(next) {
          Object.assign(this.state, next);
        }
      };
      // biome-ignore lint/security/noGlobalEval: the point is to run Evan's source verbatim.
      window.__Component = eval(`${source.trim()}\n;Component`);
    },
    [classSource],
  );

  const written = [];
  for (const { type, art } of CIVIC) {
    for (const stage of STAGES) {
      const name = `civic-${type}-${stage}.glb`;
      const b64 = await page.evaluate(
        async ([art, stage, seed, seeded]) => {
          // Seeded mulberry32 in place of Math.random, so the export is reproducible.
          let s = seed >>> 0;
          const real = Math.random;
          if (seeded) {
            Math.random = () => {
              s = (s + 0x6d2b79f5) >>> 0;
              let t = s;
              t = Math.imul(t ^ (t >>> 15), t | 1);
              t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
              return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
          }
          try {
            const T = window.THREE;
            const c = new window.__Component();
            c.props = { details: true };
            c._detail = true;
            c._mc = new Map();
            const def = c._defs()[art];
            const group =
              stage === "built"
                ? def.build(T, {})
                : stage === "construction"
                  ? c._stageFrame(T, def)
                  : c._stageCleared(T, def);
            const box = new T.Box3().setFromObject(group);
            const size = box.getSize(new T.Vector3());
            const glb = await new Promise((res, rej) =>
              new window.GLTFExporter().parse(group, res, rej, { binary: true }),
            );
            let bin = "";
            const bytes = new Uint8Array(glb);
            for (let i = 0; i < bytes.length; i += 1) {
              bin += String.fromCharCode(bytes[i]);
            }
            let meshes = 0;
            group.traverse((o) => {
              if (o.isMesh) {
                meshes += 1;
              }
            });
            return {
              b64: btoa(bin),
              size: [size.x, size.y, size.z].map((n) => Number(n.toFixed(2))),
              meshes,
            };
          } finally {
            Math.random = real;
          }
        },
        [art, stage, SEEDS[`${type}-${stage}`], seeded],
      );
      const bytes = Buffer.from(b64.b64, "base64");
      writeFileSync(join(outDir, name), bytes);
      written.push({ name, bytes: bytes.length, ...b64, b64: undefined });
      console.log(
        `${name.padEnd(34)} ${String(bytes.length).padStart(8)} B  ` +
          `${b64.size.join(" × ")}u  ${b64.meshes} meshes`,
      );
    }
  }
  await browser.close();

  if (problems.length > 0) {
    console.error("\nPAGE ERRORS (the export is not trustworthy):");
    for (const p of problems) {
      console.error(`  ${p}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n${written.length} files, ${written.reduce((a, w) => a + w.bytes, 0)} bytes total`,
  );

  if (check) {
    console.log(`\n--check: comparing ${outDir} against the tree`);
    let differing = 0;
    for (const { name } of written) {
      const fresh = readFileSync(join(outDir, name));
      const stage = name
        .replace(/\.glb$/, "")
        .split("-")
        .pop();
      const declaredUncommitted = UNCOMMITTED_STAGES.has(stage);
      const digest = createHash("sha256").update(fresh).digest("hex");
      let tracked;
      try {
        tracked = readFileSync(join(DEFAULT_OUT, name));
      } catch {
        tracked = null;
      }

      // THE EXEMPTION IS ASSERTED IN BOTH DIRECTIONS, so it can neither excuse an absence
      // that has stopped existing nor hide a `built` model deleted by accident.
      if (declaredUncommitted) {
        if (tracked) {
          // A declared-uncommitted stage that IS in the tree: the declaration has stopped
          // describing the tree, so say so rather than passing quietly.
          console.log(`  ${name}: PRESENT in the tree but declared uncommitted`);
          differing += 1;
          continue;
        }
        const pinned = UNCOMMITTED_DIGESTS[name];
        const same = pinned === digest;
        console.log(
          same
            ? `  ${name}: absent by design, regenerates to its pinned digest`
            : `  ${name}: absent by design, but REGENERATED DIFFERENTLY ` +
                `(pinned ${pinned ?? "nothing"}, got ${digest})`,
        );
        if (!same) {
          differing += 1;
        }
        continue;
      }
      if (!tracked) {
        // Not declared uncommitted and not there: a committed model has gone missing.
        console.log(`  ${name}: MISSING from the tree and NOT declared uncommitted`);
        differing += 1;
        continue;
      }
      if (UNCOMMITTED_DIGESTS[name]) {
        // A committed stage may not also be pinned as an absent one, or the two records
        // disagree about which files the tree is supposed to carry.
        console.log(`  ${name}: committed, but also pinned as an uncommitted stage`);
        differing += 1;
        continue;
      }
      const same = fresh.equals(tracked);
      console.log(`  ${name}: ${same ? "identical" : "DIFFERS"}`);
      if (!same) {
        differing += 1;
      }
    }
    console.log(differing === 0 ? "\nreproducible" : `\n${differing} file(s) differ`);
    process.exitCode = differing === 0 ? 0 : 1;
  }
}

await main();
