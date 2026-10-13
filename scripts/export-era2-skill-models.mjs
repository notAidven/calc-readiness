#!/usr/bin/env node
/**
 * Export era two's FIVE SKILL BUILDINGS from Evan's authored art source into the flat
 * GLB registry directory, three stages each.
 *
 *   in   apps/web/src/city/art/building-sources/era-02-neolithic-all-buildings.dc.html
 *   out  apps/web/src/city/art/models/<node-prefix>-<stage>.glb   (15 files)
 *
 * A SEPARATE FILE FROM `export-civic-models.mjs` ON PURPOSE, and it is not a fork. That
 * script owns era ONE's four civic types out of a DIFFERENT source file, with its own
 * naming key (`civic-<type>-<stage>`), its own eight-absent-stages exemption and its own
 * pinned digests. Era two's skill set shares none of those: every one of its fifteen
 * files is committed, and its names come from the SKILL GRAPH rather than from
 * `@cr/game`'s civic table. What the two do share is the shape — lift the builder class
 * verbatim, seed `Math.random`, offer `--check` and `--no-seed` — and that precedent is
 * followed here deliberately rather than re-invented.
 *
 * ## THE NAMING KEY: `<nodeFilePrefix(node)>-<stage>.glb`, FLAT IN `art/models/`
 *
 * `exp-1-site.glb`, `exp-1-construction.glb`, `exp-1-built.glb`, then the same three for
 * `rad-1` … `rad-4`. This is not a new convention: it is the one
 * `apps/web/src/city/buildingAssets.ts` already reads, where `nodeFilePrefix` lowercases
 * a node id and turns `.` into `-`, and the registry is keyed by BASENAME. So the
 * addresses era two's models answer to are decided by the skill graph, not here.
 *
 * FLAT, NOT `art/models/d2/`. The model glob is NON-RECURSIVE, so a subdirectory would
 * make all fifteen invisible — `resolveBuildingModel` failing closed to a procedural pad
 * with every test still green — and making the glob recursive is worse, because
 * `gridwork-modern/`'s eighteen preserved `num-*` basenames would then compete for the
 * same keys with glob order picking the winner. `buildingAssets.ts` documents both hazards
 * at the glob itself. Flat is safe by CONSTRUCTION rather than convention: no `exp-*` or
 * `rad-*` basename can collide with era one's eighteen `num-*`, era one's four `civic-*`,
 * the hall's `townhall/` or the roads' `road-*`.
 *
 * ## WHY A SCRIPT: THE ART IS PROCEDURAL three.js
 *
 * The source is a self-unpacking design-tool bundle whose real document is a JSON string
 * in a `<script type="__bundler/template">` block, holding a `class Component extends
 * DCLogic` that emits a `THREE.Group` per building per stage. Without a committed exporter
 * nobody could regenerate a model or diff a change to one. The class is lifted VERBATIM
 * and evaluated against a stub of the design tool's base class; nothing is hand-ported,
 * because a hand-port would be a second source of truth and would drift from Evan's the
 * first time he re-exports.
 *
 * THE STAGE MAPPING IS THE SOURCE'S OWN, taken from its `_rebuild()` era-two branch, and
 * it matches `buildingAssets.ts`'s `MODEL_STAGES` exactly:
 *
 *   built        ← `_nDefs()[art]()`               the source's "Finished"
 *   construction ← `_nStageFrame(T, art, foot)`    the source's "Frame up"
 *   site         ← `_nStageCleared(T, foot)`       the source's "Cleared ground"
 *
 * The two early stages take the `foot` the FINISHED builder returns, so `_nDefs()[art]()`
 * is called first for every stage even when its group is thrown away — exactly as
 * `_rebuild()` does it. That call order is also what the seeded random stream is measured
 * against, so it is load-bearing for the bytes and not merely tidy.
 *
 * THE GROUND PAD STAYS IN (`_npad`), because era one's committed set keeps its pads and
 * `PlacedBuilding.prepareModel` CONTAIN-FITS whatever it is given to the node's footprint.
 * Dropping the pad here would render era two's buildings systematically larger on the same
 * plot than era one's.
 *
 * ## COLOUR MANAGEMENT IS DISABLED, AND THAT IS THE ONE REAL DIFFERENCE FROM ERA ONE
 *
 * Evan's two palettes are written for different points in the pipeline. Era one's `_mat`
 * hands a raw hex to `new THREE.Color(...)`; era two's `_nmat` hands the same kind of hex
 * in and then calls **`.convertSRGBToLinear()` itself**. The source bundles three r128,
 * where `new Color(hex)` did no conversion, so that explicit call is the only one there is
 * and the result is linear. Under the r185 this script exports with, `new Color(hex)`
 * ALREADY converts sRGB → linear, so Evan's call would apply a SECOND conversion and every
 * era-two surface would export measurably too dark. `ColorManagement.enabled = false`
 * restores r128's semantics for exactly the span of the build, which leaves one conversion
 * and a `baseColorFactor` that is linear — which is what the glTF spec asks for and what
 * `GLTFExporter` writes out unchanged (`material.color.toArray()`, no conversion of its
 * own). Era one needs none of this and does not get it: it is not this script's file.
 *
 * Measured rather than argued, on `rad-3-built.glb`'s mud brick against the era's authored
 * body hue: see `--check-colour`. THAT HUE IS READ OUT OF THE SOURCE rather than written
 * down here, because era two's palette is an OPEN DECISION and a hardcoded hex would turn
 * this diagnostic into a silent assertion about which way it went. The 2026-07-30 re-export
 * moved `NP.brick` from `#B4714F` to `#C0A66B`; #296 proposes moving it again. Reading
 * `get NP()` means the measurement follows Evan without this file taking a side.
 *
 * ## THE MATERIALS ARE `MeshToonMaterial`, SO `GLTFExporter` WARNS AND THAT IS EXPECTED
 *
 * glTF has no toon material, so the exporter logs `Use MeshStandardMaterial or
 * MeshBasicMaterial for best results` once per material and writes the colour, the map and
 * the opacity through the generic path. Colour and texture therefore survive; the toon
 * ramp does not, and the city's own `reviveMaterial` re-applies what glTF cannot carry.
 * That warning is filtered from the page-error trap below BY NAME rather than by turning
 * the trap off, so a real page error still fails the export.
 *
 * Usage:  node scripts/export-era2-skill-models.mjs [--out <dir>] [--check] [--no-seed]
 *   --check          writes to a temp dir and reports, per file, whether the bytes match
 *                    the tree. All fifteen are committed, so there is no absent-by-design
 *                    exemption here and a missing file is simply red.
 *   --no-seed        leaves `Math.random` alone. THE COUNTER-DEMONSTRATION: `--check
 *                    --no-seed` reports FOURTEEN of the fifteen DIFFERING, which is what
 *                    makes a green plain `--check` mean something. The one it does not is
 *                    named in {@link SEED_INDEPENDENT}, and that set is asserted in both
 *                    directions rather than described here, so neither a file that quietly
 *                    stops depending on the stream nor a named file that starts depending
 *                    on it can pass unnoticed.
 *   --check-colour   prints the mud-brick `baseColorFactor` both ways, against the body hue
 *                    the SOURCE authors (read from its `NP` palette at run time), so the
 *                    paragraph above is a measurement rather than a claim.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-02-neolithic-all-buildings.dc.html",
);
const DEFAULT_OUT = join(ROOT, "apps/web/src/city/art/models");

/**
 * THE NODE → ART-SLUG MAPPING, and the half of it that is derived is the half that could
 * go wrong.
 *
 * `node` is a SKILL GRAPH id and is not ours to invent: `ERA_SEQUENCE[1].nodes` in
 * `packages/skill-graph/src/eras.ts` ships `EXP.1`, `RAD.1`, `RAD.2`, `RAD.3`, `RAD.4` for
 * the Neolithic, and `apps/web/src/city/era2SkillModels.test.ts` asserts this table's node
 * column against `getEraNodes("neolithic")` in both directions — so a node moved between
 * eras, added or renamed fails there rather than silently exporting a file no loader will
 * ever ask for.
 *
 * `art` is the slug INSIDE Evan's source (`_era2Skill()` / `_nDefs()`), so it is HIS to
 * rename and not ours: editing it would mean editing the lifted source and drifting from
 * whatever he next exports. The pairing between the two columns is the one thing neither
 * file can derive, and it comes from the era's own documents, which name the node beside
 * the building in the roster line itself:
 *
 *   `_era2Skill()`                       "Skill · EXP.1 store", "Skill · RAD.1 workshop", …
 *   `era-02-neolithic/style-guide.md`    the roster table's node column
 *   `era-02-neolithic-building-briefs`   the ten-building table's "Node / role" column
 *
 * All three agree, which is why this table is written down once here rather than guessed.
 * `name` is the era's FINAL learner-facing name as of the 2026-07-29 renames, carried only
 * so this script's log names what it just wrote; nothing reads it.
 *
 * THE HUB IS NOT HERE. The source's sixth skill-shaped entry, `shrine` (whose building is
 * now the Elders' Hearth — the slug outlived the withdrawn Shrine), is era two's
 * `town-hall` and belongs to the hall's own registry (`art/models/townhall/`), not to this
 * flat node-keyed set. Exporting it here would give the hub a node-derived basename it has
 * no node for.
 */
const SKILL = [
  // `EXP.1`'s BUILDING was re-authored on 2026-07-30 and its ART SLUG WAS NOT. Evan
  // withdrew the Seed House — a raised boarded store on stone stumps — for the Bee House, a
  // long brick block standing flat on the ground with two courses of clay hive-tube mouths
  // through its warm face, and left `_nDefs().seed` as the key. So the slug is a stale name
  // for a live entry rather than a mistake, and following it is what keeps this table equal
  // to whatever he next exports; renaming it here would edit his source.
  { node: "EXP.1", art: "seed", name: "the Bee House" },
  { node: "RAD.1", art: "kiln", name: "the Potter's Kiln" },
  { node: "RAD.2", art: "pen", name: "the Sheep Pen" },
  { node: "RAD.3", art: "meet", name: "the Meeting House" },
  { node: "RAD.4", art: "tower", name: "the Stone Tower" },
];

/**
 * THE ONE FILE OF THE FIFTEEN THAT COMES OUT THE SAME WITHOUT THE SEED, named so that the
 * `--no-seed` counter-demonstration is a guard rather than a paragraph.
 *
 * `rad-1-construction.glb` is seed-INDEPENDENT rather than accidentally equal. Its builder
 * does draw from `Math.random` — hundreds of times — but only into the canvases `_ntex`
 * paints WITHOUT it, and the file embeds exactly ONE 256×256 image where the finished stages
 * embed several, so nothing random reaches its bytes.
 *
 * IT USED TO BE TWO, AND THE OTHER ONE LEFT THE LIST BY BUILDING SOMETHING ELSE.
 * `exp-1-construction.glb` was seed-independent for the same reason until 2026-07-30, when
 * `EXP.1` became the Bee House: the Seed House's frame stood timber posts on stone pads and
 * the Bee House's stands a BRICK WALL, so the frame now pulls in `_ntex`'s randomly-painted
 * brick canvas. Measured rather than argued — the file embedded 1 image at `d7a08d6` and
 * embeds 2 now, and `--check --no-seed` moved from 13 differing to 14 on exactly that file.
 * That is what this set is for: it caught the change instead of leaving `14 file(s) differ`
 * to be read as noise.
 */
const SEED_INDEPENDENT = new Set(["rad-1-construction.glb"]);

const STAGES = ["site", "construction", "built"];

/** node_id → file prefix, the same rule `buildingAssets.ts`'s `nodeFilePrefix` applies. */
function nodeFilePrefix(nodeId) {
  return nodeId.toLowerCase().replace(/\./g, "-");
}

/**
 * A stable 32-bit seed per output file — FNV-1a over the basename's stem, so the seed is
 * derived from the filename and cannot drift out of step with it. Renaming a node would
 * therefore change the bytes, which is the same deliberate property era one's civic
 * exporter has.
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
 * `<script type="__bundler/template">` block, and its assets are base64 + gzip in a
 * sibling manifest. So the markup that holds the builder class is one `JSON.parse` inside
 * the file, not the file itself.
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

/**
 * Lift the builder class out of the source's `<script type="text/x-dc">` block, and refuse
 * a source that does not carry era two: the file also holds era one's roster, and an older
 * export of it would produce fifteen files built from `_nDefs().granary` fallbacks rather
 * than failing.
 */
function builderClassSource(html) {
  const open = html.indexOf('<script type="text/x-dc"');
  if (open < 0) {
    throw new Error('no <script type="text/x-dc"> block in the art source');
  }
  const bodyStart = html.indexOf(">", open) + 1;
  const body = html.slice(bodyStart, html.indexOf("</script>", bodyStart));
  if (!/class\s+Component\s+extends\s+DCLogic/.test(body)) {
    throw new Error("the x-dc block is not the `class Component extends DCLogic` one");
  }
  for (const required of ["_nDefs", "_nStageFrame", "_nStageCleared", "_era2Skill"]) {
    if (!body.includes(required)) {
      throw new Error(
        `the art source has no \`${required}\` — this is an era-one-only export, ` +
          "not the era-two one this script needs",
      );
    }
  }
  return body;
}

/**
 * Bundle three + `GLTFExporter` into one browser-loadable file, on demand. Built rather
 * than committed, so the exporter always runs against the SAME three the app renders with
 * (`apps/web/package.json`) instead of a stale copy of it.
 */
function threeBundle() {
  const entry = join(ROOT, "output/era2-skill/three-entry.js");
  const out = join(ROOT, "output/era2-skill/three-bundle.js");
  execFileSync("mkdir", ["-p", join(ROOT, "output/era2-skill")]);
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

/** The toon-material notice `GLTFExporter` logs by design — see the header. */
const EXPECTED_WARNING = "Use MeshStandardMaterial or MeshBasicMaterial";

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const seeded = !args.includes("--no-seed");
  const checkColour = args.includes("--check-colour");
  const outIndex = args.indexOf("--out");
  const outDir = check
    ? mkdtempSync(join(tmpdir(), "era2-skill-glb-"))
    : outIndex >= 0
      ? args[outIndex + 1]
      : DEFAULT_OUT;

  const classSource = builderClassSource(unpackTemplate(readFileSync(SOURCE, "utf8")));
  const bundle = threeBundle();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      if (!m.text().includes(EXPECTED_WARNING)) {
        problems.push(m.text());
      }
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

  if (checkColour) {
    const measured = await page.evaluate(() => {
      const T = window.THREE;
      // THE HUE COMES OUT OF THE SOURCE'S OWN PALETTE, so this diagnostic keeps measuring
      // the era's body brick across a re-paint instead of measuring a hex this file
      // remembers. `get NP()` is the same accessor every `_n*` builder reads.
      const authored = new window.__Component().NP.brick;
      const managed = new T.Color(authored).convertSRGBToLinear().toArray();
      T.ColorManagement.enabled = false;
      const unmanaged = new T.Color(authored).convertSRGBToLinear().toArray();
      T.ColorManagement.enabled = true;
      return { authored, managed, unmanaged };
    });
    const fmt = (a) => a.map((n) => n.toFixed(4)).join(", ");
    // Round-trip each back to an 8-bit sRGB triple, which is the comparison that matters:
    // the loader reads `baseColorFactor` as linear, so whichever row lands back on the
    // authored triple is the one the city will show.
    const toSrgb8 = (a) =>
      a
        .map((v) =>
          Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)),
        )
        .join(", ");
    const hex = `#${measured.authored.toString(16).toUpperCase().padStart(6, "0")}`;
    const triple = [16, 8, 0].map((s) => (measured.authored >> s) & 0xff).join(", ");
    console.log(
      `mud brick ${hex} = (${triple}) authored, read from the source's NP palette`,
    );
    console.log(
      `  ColorManagement ON  → baseColorFactor [${fmt(measured.managed)}] ` +
        `→ renders (${toSrgb8(measured.managed)})`,
    );
    console.log(
      `  ColorManagement OFF → baseColorFactor [${fmt(measured.unmanaged)}] ` +
        `→ renders (${toSrgb8(measured.unmanaged)})   ← this script`,
    );
    await browser.close();
    return;
  }

  const written = [];
  for (const { node, art, name } of SKILL) {
    const prefix = nodeFilePrefix(node);
    for (const stage of STAGES) {
      const file = `${prefix}-${stage}.glb`;
      const result = await page.evaluate(
        async ([art, stage, seed, seeded]) => {
          // Seeded mulberry32 in place of Math.random, so the export is reproducible.
          // Era two needs this even more than era one did: besides the scattered stones
          // and post jitter, `_ntex` PAINTS its brick, thatch and wattle canvases with
          // `Math.random()`, so unseeded runs differ in their texture images too.
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
          const T = window.THREE;
          const managed = T.ColorManagement.enabled;
          T.ColorManagement.enabled = false;
          try {
            // A FRESH component per file, so the texture and material caches (`_ntc`,
            // `_nmc`) are rebuilt under this file's own seed rather than inherited from
            // whichever file ran before it. That is what makes each file independently
            // reproducible instead of only the whole run in order.
            const c = new window.__Component();
            c.props = { details: true };
            c._detail = true;
            const out = c._nDefs()[art]();
            const group =
              stage === "built"
                ? out.g
                : stage === "construction"
                  ? c._nStageFrame(T, art, out.foot)
                  : c._nStageCleared(T, out.foot);
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
            T.ColorManagement.enabled = managed;
          }
        },
        [art, stage, seedFor(`${prefix}-${stage}`), seeded],
      );
      const bytes = Buffer.from(result.b64, "base64");
      writeFileSync(join(outDir, file), bytes);
      written.push({ file, bytes: bytes.length });
      console.log(
        `${file.padEnd(26)} ${String(bytes.length).padStart(8)} B  ` +
          `${result.size.join(" × ")}u  ${String(result.meshes).padStart(4)} meshes  ` +
          `${name}`,
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

  const total = written.reduce((a, w) => a + w.bytes, 0);
  console.log(`\n${written.length} files, ${total} bytes total`);

  if (check) {
    console.log(`\n--check: comparing ${outDir} against the tree`);
    let differing = 0;
    const unchanged = [];
    for (const { file } of written) {
      const fresh = readFileSync(join(outDir, file));
      let tracked;
      try {
        tracked = readFileSync(join(DEFAULT_OUT, file));
      } catch {
        tracked = null;
      }
      if (!tracked) {
        // Every one of the fifteen is committed, so absence is a failure and not an
        // exemption. This differs from era one's civic exporter on purpose: a civic
        // building is bought and never advances off `built`, where a skill building is
        // BUILT THROUGH MASTERY and the city resolves all three of its stages.
        console.log(`  ${file}: MISSING from the tree`);
        differing += 1;
        continue;
      }
      const same = fresh.equals(tracked);
      console.log(`  ${file}: ${same ? "identical" : "DIFFERS"}`);
      if (same) {
        unchanged.push(file);
      } else {
        differing += 1;
      }
    }

    if (seeded) {
      console.log(differing === 0 ? "\nreproducible" : `\n${differing} file(s) differ`);
      process.exitCode = differing === 0 ? 0 : 1;
      return;
    }

    // THE COUNTER-DEMONSTRATION, ASSERTED IN BOTH DIRECTIONS rather than eyeballed, and in
    // the shape the civic lane's exporter already uses. Unseeded, every file that draws a
    // random number into its bytes must come out different — otherwise the seed is not doing
    // the work the seeded `--check` claims credit for. The exception is NAMED
    // ({@link SEED_INDEPENDENT}), so a file that quietly stops depending on the stream fails
    // here, and a named file that starts depending on it fails here too.
    const surprises = unchanged.filter((n) => !SEED_INDEPENDENT.has(n));
    const stale = [...SEED_INDEPENDENT].filter((n) => !unchanged.includes(n));
    console.log(
      `\n--no-seed: ${differing} of ${written.length} differ; ` +
        `${unchanged.length} unchanged ` +
        `(${written.length - SEED_INDEPENDENT.size} expected to differ)`,
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
