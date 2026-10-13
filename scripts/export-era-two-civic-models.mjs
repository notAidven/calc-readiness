#!/usr/bin/env node
/**
 * Export ERA TWO's FOUR CIVIC BUILDINGS and ITS HUB from Evan's authored art source.
 *
 *   in   apps/web/src/city/art/building-sources/era-02-neolithic-all-buildings.dc.html
 *   out  apps/web/src/city/art/models/civic-<type>-<stage>.glb            (12 emitted, 4 committed)
 *        apps/web/src/city/art/models/townhall/townhall-neolithic-<stage>.glb (3 emitted, 1 committed)
 *
 * A SEPARATE FILE FROM `export-civic-models.mjs` ON PURPOSE, and not because era two is
 * special. Two lanes are exporting out of the same source in the same hour — this one owns
 * the civic four plus the hub, another owns the five skill buildings — and a shared script
 * is a shared merge conflict on every run. The two scripts are deliberately near-identical
 * in shape; that duplication buys lane independence and is cheaper than the collision.
 *
 * TEN OF THESE FIFTEEN ARE DELIBERATELY NOT COMMITTED. See {@link UNCOMMITTED_STAGES}
 * and {@link UNCOMMITTED_DIGESTS}: only `built` resolves, for the civic four (bought, never
 * built through mastery) and for the hub alike (D-TH4 was REVERSED — the hub is always
 * `built`, and its `site`/`construction` are retained-but-unreferenced assets).
 *
 * WHAT THE SOURCE ACTUALLY CONTAINS, verified rather than assumed. It is the same
 * self-unpacking `.dc.html` bundle shape as era one's: the document is a JSON string in a
 * `<script type="__bundler/template">` block, and inside it a
 * `class Component extends DCLogic` emits a `THREE.Group` per building. It carries BOTH
 * eras: era one's roster on the `_defs()` / `_stageCleared` / `_stageFrame` path this
 * script does not touch, and era two's on a parallel `_nDefs()` / `_nStageCleared` /
 * `_nStageFrame` path with its own `NP` palette and `_n*` primitive kit. Era two's
 * `_nDefs()` holds ten entries: the four civic (`granary`, `houses`, `oven`, `well`), the
 * five skill (`seed`, `kiln`, `pen`, `meet`, `tower`) and the hub (`shrine`). This script
 * takes the four and the hub; the five skill entries are ANOTHER LANE'S and are left alone.
 *
 * TWO OF THOSE TEN SLUGS OUTLIVED THE BUILDINGS THEY WERE NAMED FOR. Evan re-authored
 * `EXP.1` and the hub on 2026-07-30 and kept both keys: `seed` now builds the Bee House, not
 * the withdrawn Seed House, and `shrine` now builds the Elders' Hearth — a solid brick mass
 * with a sunken hearth on its deck, a broad stair up the front and a herringbone parapet
 * closing the back — not the withdrawn domed oven under a thatch canopy. Neither slug is
 * ours to rename, because renaming one would mean editing his source and drifting from
 * whatever he next exports.
 *
 * THE TYPE IDS ARE THE CATALOGUE'S, NOT THE ART'S. `packages/economy/src/civicCatalogue.ts`
 * at the tip authors era two as `neolithic_granary`, `neolithic_village_houses`,
 * `neolithic_bread_oven`, `neolithic_village_well` (display names The Granary, The Village
 * Houses, The Bread Oven, The Village Well). The art source's own roster keys are `granary`
 * / `houses` / `oven` / `well`, which are HIS to rename, so {@link ERA_TWO_CIVIC} maps
 * between them exactly as era one's exporter does.
 *
 * THE STAGE MAPPING IS THE SOURCE'S OWN, and it matches `MODEL_STAGES`:
 *
 *   site         ← `_nStageCleared(T, foot)`        the source's "Cleared ground"
 *   construction ← `_nStageFrame(T, slug, foot)`    the source's "Frame up"
 *   built        ← `_nDefs()[slug]()`               the source's "Finished"
 *
 * `foot` IS A RETURN VALUE OF THE BUILT BUILDER, and the two early stages need it to size
 * their pad. So a non-`built` export runs the built builder first, purely to read `foot`,
 * under the BUILT stage's own seed — then re-seeds to the stage's seed before building the
 * stage. That ordering is what keeps a `site` export reproducible: the throwaway call
 * consumes a stream that is reset immediately afterwards.
 *
 * REPRODUCIBILITY RESTS ON THE SEED, as it does for era one: the builders call
 * `Math.random()` for scattered stones, spill, jitter on posts. `Math.random` is REPLACED,
 * per output filename, with a mulberry32 stream seeded by FNV-1a over that name.
 *
 * NOTHING IS HAND-PORTED. The builder class is lifted VERBATIM out of the source's
 * `<script type="text/x-dc">` block and evaluated against a `DCLogic` stub.
 *
 * COLOUR MANAGEMENT IS DISABLED FOR THE SPAN OF THE BUILD, and it has to be, because era
 * two's palette is written for a different point in the pipeline than era one's. Era one's
 * `_mat` hands a raw hex to `new THREE.Color(...)`; era two's `_nmat` hands the hex in and
 * then calls `.convertSRGBToLinear()` ITSELF. Under the r128 the source bundles that is the
 * only conversion there is. Under the r185 this script exports with, `new Color(hex)`
 * already converts, so leaving management on applies a SECOND conversion and every era-two
 * surface exports measurably too dark.
 *
 * MEASURED, on this exporter's own output. The first cut of this script did not disable it,
 * and all five committed models carried the doubly-converted factors: the era's mud brick,
 * `#B4714F` = (180, 113, 79) under the palette of the day, reached `baseColorFactor` as
 * (0.1762, 0.0233, 0.0070), which renders back as (116, 42, 20). With management off it is
 * (0.4566, 0.1652, 0.0782), which renders back as (180, 113, 79). The hex has since moved —
 * the 2026-07-30 re-paint took `NP.brick` to `#C0A66B` — and the arithmetic has not, which is
 * why the census below reads the palette out of the source rather than trusting this
 * paragraph. `scripts/check-era-two-glb-colours.mjs` reads every factor
 * out of all twenty of era two's committed GLBs and reports which family explains it, so
 * the fix is verifiable from the tree rather than from this paragraph; restoring the pre-fix
 * granary turns it red at 15 doubled factors.
 *
 * Usage:  node scripts/export-era-two-civic-models.mjs [--out <dir>] [--check] [--no-seed]
 *   --check    writes to a temp dir and reports whether the bytes match the tree — and, for
 *              the ten stages the tree deliberately does not carry, whether they still
 *              reproduce their pinned SHA-256 ({@link UNCOMMITTED_DIGESTS}).
 *   --no-seed  leaves `Math.random` alone. THE COUNTER-DEMONSTRATION: `--check --no-seed`
 *              reports the files as DIFFERING, which is what makes a green `--check` mean
 *              something.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-02-neolithic-all-buildings.dc.html",
);
const MODELS = join(ROOT, "apps/web/src/city/art/models");

/**
 * The four civic buildings, `type` = the catalogue id with `_` collapsed to `-` (which is
 * what `civicFilePrefix` emits), `art` = Evan's own roster slug inside `_nDefs()`.
 *
 * ERA TWO'S IDS ARE ERA-PREFIXED WHERE ERA ONE'S ARE NOT, and that is the catalogue's
 * choice rather than this file's. `civicCatalogue.ts` documents the convention as
 * `<era>_<slug>` "because names repeat across eras in spirit"; era one's MODEL registry
 * predates the catalogue and is keyed on `@cr/game`'s unprefixed `ERA_ONE_CIVIC_TYPES`.
 * Following the catalogue for era two keeps the filename equal to the address the economy
 * actually holds, which is the whole point of the key, and it is collision-free against era
 * one's four by construction.
 */
const ERA_TWO_CIVIC = [
  { type: "neolithic-granary", art: "granary" },
  { type: "neolithic-village-houses", art: "houses" },
  { type: "neolithic-bread-oven", art: "oven" },
  { type: "neolithic-village-well", art: "well" },
];

/**
 * THE HUB IS ADDRESSED THE HUB'S WAY, NOT THE CIVIC WAY, and the difference is not
 * cosmetic. A civic model sits FLAT in `art/models/` under a `civic-` prefix, paid for by
 * an exclusion on the skill glob. The hub's three stage GLBs sit in the `townhall/`
 * SUBDIRECTORY with a dedicated glob of their own (`townHall.ts`, spec §8), precisely so
 * they stay additional to the skill set's pinned 18 — and `TOWN_HALL_DESCRIPTORS` names
 * their basenames explicitly rather than deriving them, because the hub has no type id to
 * derive from. So era two's hub is `townhall-neolithic-<stage>.glb` in that subdirectory,
 * and it is named for the ERA because the hub re-themes per era on one unchanging 3×2
 * placement (era one's Stone Circle → era two's Elders' Hearth).
 *
 * NAMING IT FOR THE ERA IS WHAT MADE THE 2026-07-30 REDESIGN A RE-EXPORT AND NOT A MIGRATION.
 * Evan withdrew the Shrine and authored the Elders' Hearth in its place; because the basename
 * keys on the era, `TOWN_HALL_ERA_MODELS.neolithic` and `TOWN_HALL_DESCRIPTORS` both stayed
 * exactly as they were and only the bytes under them changed. The art slug inside the source
 * is still `shrine`, which is his to rename and not this file's.
 */
const HUB = { type: "townhall-neolithic", art: "shrine", dir: join(MODELS, "townhall") };

const STAGES = ["site", "construction", "built"];

/**
 * TEN OF THE FIFTEEN ARE DELIBERATELY NOT COMMITTED — `site` and `construction`, for all
 * four civic types AND for the hub.
 *
 * WHY, FOR THE CIVIC FOUR. A civic building is **bought, not built through mastery**: no
 * lesson, no CFU, no `student_node_state` row, so `resolveCivicModel` is only ever asked
 * for `built`. This is era one's settled precedent, not a new decision — era one authored
 * all twelve, committed all twelve, established that eight were unreachable and deleted
 * them in `d9328f8` for 2.56 MB of `dist`. Committing era two's eight would be re-making a
 * mistake somebody already paid to undo.
 *
 * WHY, FOR THE HUB. **D-TH4 was REVERSED on 2026-07-26**: the hall no longer builds itself
 * through completion-driven stages, it is ALWAYS `built`, and `resolveTownHallModel` is
 * only ever called with `built`. Era one's hub still carries all three files in the tree —
 * that is a pre-reversal artefact, not a convention to copy, and copying it would spend
 * `dist` on two more files no code path reaches.
 *
 * THE ART IS NOT LOST. It is code, the code is committed
 * (`era-02-neolithic-all-buildings.dc.html`), the seed makes it reproducible, and one
 * command brings all fifteen back:
 *
 *   node scripts/export-era-two-civic-models.mjs
 *
 * {@link UNCOMMITTED_DIGESTS} pins what the ten must regenerate to, so "recoverable" is
 * something `--check` VERIFIES rather than something this comment promises.
 */
const UNCOMMITTED_STAGES = new Set(["site", "construction"]);

/**
 * SHA-256 of the ten uncommitted files as this exporter produces them, measured from a
 * real run at the commit that last changed them.
 *
 * A deliberate change to one of these builders is expected to turn `--check` red here; the
 * fix is to re-measure and update the digest in the same commit as the builder change,
 * exactly as a committed GLB would be re-exported. **All ten were re-measured on 2026-07-31**
 * for the re-authored source: the palette moved, `_nFrames().shrine` became the Elders'
 * Hearth's frame, and `_nGranary` and `_nWell` were reworked, so every one of them moved.
 */
const UNCOMMITTED_DIGESTS = {
  "civic-neolithic-granary-site.glb":
    "6a27a65f3107a3fff1e13a992971361c37839cb8be6d9b9e464a8ee38c4136a3",
  "civic-neolithic-granary-construction.glb":
    "e62beb6d24daecab67dea7312f3fc9d744628cbaa09a2cd14a842ff930f52f4a",
  "civic-neolithic-village-houses-site.glb":
    "8742e062c3e817d4bfecab14ff0d8c806a862be7b6bc4318319d8c88b582b39e",
  "civic-neolithic-village-houses-construction.glb":
    "065af685ce41b715b114d65da51c18ee24631bf0dd29c038a00015b073d4118d",
  "civic-neolithic-bread-oven-site.glb":
    "95e2d73d07d3af87ee0963225c289ec4057c188fe9cd5d54294cb6a3f83e38aa",
  "civic-neolithic-bread-oven-construction.glb":
    "a97e844fd6cf7dc0f0def2d91f1918deac5cb299361a7564f01b5b38b7ce3143",
  "civic-neolithic-village-well-site.glb":
    "0500b3357a61a0a421209bd4a1f76ef49999f9175cb5dc97aa7a87a7bc4f08fb",
  "civic-neolithic-village-well-construction.glb":
    "e5c779dc6c15e467f30dac3c70183864443f3468af990a7eaa481981c49b1a93",
  "townhall-neolithic-site.glb":
    "6bf8798fa45279b067db0dc93f8fe726cf267147667a23c9312b931d81674747",
  "townhall-neolithic-construction.glb":
    "07786909246d30423b53d0a18021100a2bda995412f0ab5feb7524aea913f898",
};

/**
 * FOUR OF THE FIFTEEN CONTAIN NO `Math.random()` CALL AT ALL, and saying which matters
 * because the `--no-seed` counter-demonstration is what makes a green `--check` mean
 * anything, and a file that is seed-independent cannot participate in it.
 *
 * `--check --no-seed` reports **11 of 15 DIFFERING**. The four that do not differ are the
 * civic `construction` stages, and the reason is a fact about the source rather than a
 * weakness in the seeding: `_nStageFrame` looks its "Frame up" body up in `_nFrames()`,
 * and **era two's `_nFrames()` has entries for the five SKILL buildings and the hub only**
 * — `seed`, `kiln`, `pen`, `meet`, `tower`, `shrine`. There is no `granary`, `houses`,
 * `oven` or `well` frame, so a civic `construction` export is the generic surround alone
 * (pad, swept ground, a brick stack, mud-brick rows drying, a pot and a basket), which
 * happens to be the part of the kit that draws no random numbers.
 *
 * That is ALSO the strongest argument for the stage decision below: era one's civic set
 * authored a real `frame()` per type and the early stages were still unreachable; era two
 * does not author them at all, so committing a civic `construction` would commit a
 * scaffold with no building inside it.
 */
const SEED_INDEPENDENT = new Set([
  "civic-neolithic-granary-construction.glb",
  "civic-neolithic-village-houses-construction.glb",
  "civic-neolithic-bread-oven-construction.glb",
  "civic-neolithic-village-well-construction.glb",
]);

/**
 * A stable 32-bit seed per output file — FNV-1a over the basename stem, so the seed is
 * derived from the filename and cannot drift out of step with it. Renaming a type
 * therefore changes the bytes, deliberately: the same builder draws a differently jittered
 * building under a different stream.
 */
function seedFor(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The design tool ships a SELF-UNPACKING page: the real document is a JSON string in a
 * `<script type="__bundler/template">` block. So the markup holding the builder class is
 * one `JSON.parse` inside the file, not the file itself.
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
  if (!/_nDefs\s*\(\)/.test(body)) {
    throw new Error("no `_nDefs()` in the source — this is not the era-two bundle");
  }
  return body;
}

/**
 * Bundle three + `GLTFExporter` into one browser-loadable file, on demand. Built rather
 * than committed, so the exporter always runs against the SAME three the app renders with
 * (`apps/web/package.json`, 0.185) instead of a stale copy of it.
 */
function threeBundle() {
  const dir = join(ROOT, "output/era-two-civic");
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

/** Every (output basename, art slug, stage) this exporter is responsible for. */
function plan() {
  const jobs = [];
  for (const { type, art } of ERA_TWO_CIVIC) {
    for (const stage of STAGES) {
      jobs.push({ name: `civic-${type}-${stage}.glb`, art, stage, dir: MODELS });
    }
  }
  for (const stage of STAGES) {
    jobs.push({ name: `${HUB.type}-${stage}.glb`, art: HUB.art, stage, dir: HUB.dir });
  }
  return jobs;
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const seeded = !args.includes("--no-seed");
  const outIndex = args.indexOf("--out");
  const overrideOut = check
    ? mkdtempSync(join(tmpdir(), "era2-civic-glb-"))
    : outIndex >= 0
      ? args[outIndex + 1]
      : null;

  const classSource = builderClassSource(unpackTemplate(readFileSync(SOURCE, "utf8")));
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
  for (const job of plan()) {
    const stem = job.name.replace(/\.glb$/, "");
    const builtStem = stem.replace(/-(site|construction|built)$/, "-built");
    const result = await page.evaluate(
      async ([art, stage, seed, builtSeed, seeded]) => {
        const real = Math.random;
        const stream = (n) => {
          let s = n >>> 0;
          return () => {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        };
        const T = window.THREE;
        const managedColour = T.ColorManagement.enabled;
        // ONE sRGB → LINEAR CONVERSION, NOT TWO. Era two's `_nmat` calls
        // `.convertSRGBToLinear()` itself, which is the only conversion there is under the
        // r128 the art source bundles and one too many under the r185 this script exports
        // with, where `new Color(hex)` already converts. Disabling colour management for
        // exactly the span of the build restores r128's semantics, so `baseColorFactor`
        // comes out linear — which is what glTF asks for and what `GLTFExporter` writes
        // unchanged. The skill lane's exporter does the same for the same reason.
        T.ColorManagement.enabled = false;
        try {
          const c = new window.__Component();
          c.props = { details: true };
          c._detail = true;
          c._mc = new Map();

          // The early stages size their pad from the BUILT builder's `foot`, so read it
          // first under the built stage's own seed, then re-seed for the stage itself.
          if (seeded) {
            Math.random = stream(builtSeed);
          }
          const finished = c._nDefs()[art]();
          if (!finished || !finished.g) {
            throw new Error(`no era-two builder for '${art}'`);
          }
          if (seeded) {
            Math.random = stream(seed);
          }
          const group =
            stage === "built"
              ? finished.g
              : stage === "construction"
                ? c._nStageFrame(T, art, finished.foot)
                : c._nStageCleared(T, finished.foot);

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
          T.ColorManagement.enabled = managedColour;
        }
      },
      [job.art, job.stage, seedFor(stem), seedFor(builtStem), seeded],
    );
    const bytes = Buffer.from(result.b64, "base64");
    const dir = overrideOut ?? job.dir;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, job.name), bytes);
    written.push({ ...job, bytes: bytes.length, size: result.size, meshes: result.meshes });
    console.log(
      `${job.name.padEnd(44)} ${String(bytes.length).padStart(8)} B  ` +
        `${result.size.join(" × ")}u  ${result.meshes} meshes`,
    );
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
    console.log(`\n--check: comparing ${overrideOut} against the tree`);
    let differing = 0;
    const unchanged = [];
    for (const { name, dir, stage } of written) {
      const fresh = readFileSync(join(overrideOut, name));
      const declaredUncommitted = UNCOMMITTED_STAGES.has(stage);
      const digest = createHash("sha256").update(fresh).digest("hex");
      let tracked;
      try {
        tracked = readFileSync(join(dir, name));
      } catch {
        tracked = null;
      }

      // THE EXEMPTION IS ASSERTED IN BOTH DIRECTIONS, so it can neither excuse an absence
      // that has stopped existing nor hide a `built` model deleted by accident.
      if (declaredUncommitted) {
        if (tracked) {
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
        if (same) {
          unchanged.push(name);
        } else {
          differing += 1;
        }
        continue;
      }
      if (!tracked) {
        console.log(`  ${name}: MISSING from the tree and NOT declared uncommitted`);
        differing += 1;
        continue;
      }
      if (UNCOMMITTED_DIGESTS[name]) {
        console.log(`  ${name}: committed, but also pinned as an uncommitted stage`);
        differing += 1;
        continue;
      }
      const same = fresh.equals(tracked);
      console.log(`  ${name}: ${same ? "identical" : "DIFFERS"}`);
      if (same) {
        unchanged.push(name);
      } else {
        differing += 1;
      }
    }

    if (seeded) {
      console.log(differing === 0 ? "\nreproducible" : `\n${differing} file(s) differ`);
      process.exitCode = differing === 0 ? 0 : 1;
      return;
    }

    // THE COUNTER-DEMONSTRATION, ASSERTED IN BOTH DIRECTIONS rather than eyeballed.
    // Unseeded, every file that draws a random number must come out different — otherwise
    // the seed is not doing the work the seeded `--check` claims credit for. The four
    // exceptions are NAMED ({@link SEED_INDEPENDENT}), so a file that quietly stops
    // depending on the stream fails here, and a named file that starts depending on it
    // fails here too.
    const surprises = unchanged.filter((n) => !SEED_INDEPENDENT.has(n));
    const stale = [...SEED_INDEPENDENT].filter((n) => !unchanged.includes(n));
    console.log(
      `\n--no-seed: ${differing} of ${written.length} differ; ` +
        `${unchanged.length} unchanged (${written.length - SEED_INDEPENDENT.size} expected to differ)`,
    );
    for (const n of surprises) {
      console.log(`  ${n}: UNCHANGED without the seed, and not declared seed-independent`);
    }
    for (const n of stale) {
      console.log(`  ${n}: declared seed-independent but it DIFFERED without the seed`);
    }
    // A floor, so the two set comparisons above cannot both hold over nothing.
    const ok =
      surprises.length === 0 &&
      stale.length === 0 &&
      differing >= written.length - SEED_INDEPENDENT.size;
    console.log(ok ? "the seed is load-bearing" : "the seed claim does not hold");
    process.exitCode = ok ? 0 : 1;
  }
}

await main();
