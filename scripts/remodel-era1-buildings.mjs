#!/usr/bin/env node
/**
 * ADD REAL DIMENSIONAL GEOMETRY to era one's eleven committed `built` GLBs (six skill
 * buildings, the hub, four civic types), post-processing the existing authored meshes
 * rather than replacing them.
 *
 * ## REVISION 2 — THE FIRST PASS READ AS STACKED, NOT AUTHORED
 *
 * An independent visual review of revision 1 rejected it: near-black detached cubes at
 * footprint corners, dark rods for posts/ladders, an oversized grey megalith ring dwarfing
 * the Town Hall, and hard near-black doors/caps that read as separate objects glued onto a
 * warm low-poly asset rather than part of it — visible in the ordinary city camera AND in
 * the build-card thumbnails, so it was never a camera artifact.
 *
 * This revision changes two things structurally, not just the numbers:
 *
 * 1. **Every new colour is SAMPLED from that file's own materials** ({@link samplePalette}),
 *    never a fixed hex constant. A foundation, roof accent or post colour is derived from
 *    the darkest/lightest/most common colour ALREADY in that specific building, so it can
 *    never land outside that building's own warm register — and {@link clampLuminanceFloor}
 *    makes "near-black" impossible for any new material, by construction, not by review.
 * 2. **The four-corner "eave post" idea is GONE.** That was the literal disconnected-cube
 *    defect: four isolated boxes sitting at 92% of the footprint, touching nothing. Every
 *    remaining addition is either a single CONTINUOUS shape that hugs the footprint
 *    (a foundation ring/curb, never four separate blocks) or sits flush against / embedded
 *    in the authored surface it belongs to (a recessed doorway plane, a ridge cap sunk into
 *    the roof at the measured roof height, not perched above it with a gap).
 *
 * ## WHY POST-PROCESS INSTEAD OF RE-EXPORTING FROM THE SOURCE
 *
 * `export-era1-skill-models.mjs`'s own header explains why regenerating era one's art from
 * `civic-era-01-all-stages.dc.html` cannot reproduce the committed bytes: the pipeline that
 * produced them (`era1-prehistoric.js`) was never committed. Running that exporter with
 * `--replace-shipped-art` would therefore silently restyle every era-one building as a side
 * effect — a full re-roll, not a controlled fix. This script instead LOADS each committed
 * `built.glb` as-is (so its authored meshes, materials and thatch-noise textures are
 * untouched) and ADDS a small set of new meshes, coloured from the model's own palette.
 *
 * ## WHY THIS DOES NOT REOPEN THE BUILDING-MODEL ISOLATION FIX
 *
 * `buildingVariantIsolation.test.ts` guards a RUNTIME seam: `prepareGridworkModel` must
 * never mount the procedural `applySkillBuildingArtVariation` overlay onto an authored GLB.
 * This script runs once, offline, before anything is committed, and writes the extra
 * geometry INTO the GLB bytes themselves — the result IS the authored asset, not a runtime
 * overlay stacked onto it. The added meshes are never tagged
 * `userData.buildingArtStructure`, which is what that guard actually keys on.
 *
 * ## WHAT IS DELIBERATELY OUT OF SCOPE
 *
 * `site` and `construction` stage files are NOT touched. Every visible-most-of-the-time
 * surface — build-card thumbnails, the placement ghost, and a placed/mastered city — reads
 * the `built` stage exclusively (`BuildingThumb.tsx`, `GhostBuilding.tsx`'s
 * `ghostBuildingIdentity`, `PlacedBuilding.tsx`); the early phases are transient and are a
 * known, documented limitation of this pass (see the PR body).
 *
 * Usage:
 *   node scripts/remodel-era1-buildings.mjs --check     # dry run, reports shape deltas only
 *   node scripts/remodel-era1-buildings.mjs --write     # writes the augmented bytes in place
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MODELS = join(ROOT, "apps/web/src/city/art/models");

/**
 * One row per augmented file. `axis` is the local horizontal axis an entrance/accent faces
 * ("x" or "z", always the POSITIVE direction) — the footprint's SHORT axis, so an entrance
 * sits on a building's narrow face the way a real doorway does. There is no colour field
 * left here: every colour is sampled from the file's own materials at augment time (see
 * {@link samplePalette} in `depthKitBuilderSource`).
 */
const JOBS = [
  {
    file: "num-s-built.glb",
    label: "Assembly Hall, the Roundhouse (NUM.S)",
    axis: "z",
    foundation: "ring",
    cap: "smoke-vent",
    entrance: "recessed-porch",
  },
  {
    file: "num-f-built.glb",
    label: "Store, the Hide Shed (NUM.F)",
    axis: "z",
    foundation: "box",
    cap: "ridge-cap",
    entrance: "recessed-door",
  },
  {
    file: "num-2-built.glb",
    label: "Dwellings, the Hut Cluster (NUM.2)",
    axis: "z",
    foundation: "box",
    cap: "none",
    entrance: "multi-recessed-door",
  },
  {
    file: "num-3-built.glb",
    label: "Workshop, the Tool Shelter (NUM.3)",
    axis: "z",
    foundation: "box",
    cap: "ridge-cap",
    entrance: "workbench",
  },
  {
    file: "num-4-built.glb",
    label: "Commons, the Clearing (NUM.4)",
    axis: "x",
    foundation: "ring-path",
    cap: "none",
    entrance: "none",
    accent: "drying-rack",
  },
  {
    file: "num-5-built.glb",
    label: "Tower, the Lookout (NUM.5)",
    axis: "z",
    foundation: "ring",
    cap: "flag",
    entrance: "ladder-base",
  },
  {
    file: "townhall/townhall-built.glb",
    label: "Town Hall, the Stone Circle (hub)",
    axis: "z",
    foundation: "ring",
    cap: "hearth-vent",
    entrance: "none",
    accent: "megalith-curb",
  },
  {
    file: "civic-smokehouse-built.glb",
    label: "The Smokehouse (civic)",
    axis: "z",
    foundation: "box",
    cap: "vent-stacks",
    entrance: "recessed-door",
  },
  {
    file: "civic-longhouse-built.glb",
    label: "The Family Lodge (civic)",
    axis: "z",
    foundation: "box",
    cap: "ridge-cap",
    entrance: "recessed-porch",
  },
  {
    file: "civic-campfire-built.glb",
    label: "The Campfire (civic)",
    axis: "x",
    foundation: "ring-path",
    cap: "none",
    entrance: "none",
    accent: "central-flame",
  },
  {
    file: "civic-water-spring-built.glb",
    label: "The Spring (civic)",
    axis: "z",
    foundation: "ring",
    cap: "none",
    entrance: "dipping-post",
    accent: "stone-rim-raise",
  },
];

function threeBundle() {
  const dir = join(ROOT, "output/era1-depth-kit");
  mkdirSync(dir, { recursive: true });
  const entry = join(dir, "three-entry.js");
  const out = join(dir, "three-bundle.js");
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

/**
 * Build the added-geometry group in-page. Every new part is a fresh THREE primitive with a
 * fresh material sampled from the host model's own palette; nothing here reads or mutates
 * the loaded scene's own meshes or materials, and nothing here is tagged
 * `userData.buildingArtStructure` (that flag is reserved for the runtime procedural-fallback
 * overlay and must never appear on an authored asset).
 */
function depthKitBuilderSource() {
  return `
    /**
     * The authored surface height near the footprint's centre, sampled by five downward
     * raycasts (centre + four offsets) rather than trusting \`box.max.y\`. A single tall thin
     * feature elsewhere in the mesh (a chimney, a finial) can sit well above the actual roof
     * plane, and a cap sized off the raw apex then floats visibly clear of the roof it is
     * meant to sit on — measured on the Family Lodge, whose committed apex is a chimney, not
     * its ridge. The MEDIAN of five samples is insensitive to any one of them being a spike.
     */
    function roofSurfaceHeight(T, scene, w, d, apexY) {
      const raycaster = new T.Raycaster();
      raycaster.far = 10000;
      const offsets = [
        [0, 0],
        [w * 0.15, 0],
        [-w * 0.15, 0],
        [0, d * 0.15],
        [0, -d * 0.15],
      ];
      const samples = [];
      for (const [ox, oz] of offsets) {
        raycaster.set(new T.Vector3(ox, apexY + 200, oz), new T.Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(scene, true);
        if (hits.length > 0) samples.push(hits[0].point.y);
      }
      if (samples.length === 0) return apexY;
      samples.sort((a, b) => a - b);
      return samples[Math.floor(samples.length / 2)];
    }

    /**
     * The actual WALL FACE along \`axis\`, found by casting horizontal rays INWARD from well
     * outside the model toward the centre, at a height inside the wall band (never the pad).
     * \`box.max\`/\`box.min\` cannot be used for this: the box is computed over the WHOLE scene,
     * which includes the ground pad — \`export-era1-skill-models.mjs\` keeps the pad in every
     * committed file — and the pad's outer edge sits well past the actual wall on every one of
     * these buildings (measured: the Roundhouse's wall face is at z≈4.7, its pad at z≈8.25).
     * An entrance placed at the pad edge floats past the wall with daylight under it — the
     * exact defect an independent review found on the Roundhouse, Lookout and Family Lodge.
     *
     * Samples several offsets AROUND \`centerOffset\` (never just one) because the offset
     * itself may line up with a door gap already cut into the wall — sampling only the
     * centreline would then read straight through to the far interior wall or floor and
     * report a coordinate deep inside the building. The MEDIAN is insensitive to one such
     * outlier as long as most of the samples land on solid wall.
     */
    function wallFaceCoord(T, scene, axis, sign, sampleY, centerOffset, jitter) {
      const raycaster = new T.Raycaster();
      raycaster.far = 800;
      const originDist = 400;
      const deltas = [0, jitter, -jitter, jitter * 1.8, -jitter * 1.8];
      const samples = [];
      for (const delta of deltas) {
        const off = centerOffset + delta;
        const origin =
          axis === "x"
            ? new T.Vector3(sign * originDist, sampleY, off)
            : new T.Vector3(off, sampleY, sign * originDist);
        const dir = axis === "x" ? new T.Vector3(-sign, 0, 0) : new T.Vector3(0, 0, -sign);
        raycaster.set(origin, dir);
        const hits = raycaster.intersectObject(scene, true);
        if (hits.length > 0) {
          samples.push(axis === "x" ? hits[0].point.x : hits[0].point.z);
        }
      }
      if (samples.length === 0) return sign * Math.abs(centerOffset) + sign * 0.01;
      samples.sort((a, b) => a - b);
      return samples[Math.floor(samples.length / 2)];
    }

    /**
     * The ground pad's own top surface, found the same way as the wall face: by raycasting
     * DOWN at several points near the footprint's corners and edges — where the pad is bare,
     * on every one of these eleven files, because none of their authored structures reach a
     * corner — and taking the MEDIAN. \`wallFaceCoord\` needs a sample height clear of this
     * surface (a horizontal ray AT pad height hits the pad's own outer rim instead of the
     * wall, reproducing the exact defect this file exists to fix) and clear of any prop
     * scattered near an edge, which the median is robust to.
     */
    function groundPadTop(T, scene, w, d, apexY) {
      const raycaster = new T.Raycaster();
      raycaster.far = 10000;
      const probes = [
        [w * 0.46, d * 0.46],
        [-w * 0.46, d * 0.46],
        [w * 0.46, -d * 0.46],
        [-w * 0.46, -d * 0.46],
        [w * 0.46, 0],
        [-w * 0.46, 0],
        [0, d * 0.46],
        [0, -d * 0.46],
      ];
      const samples = [];
      for (const [x, z] of probes) {
        raycaster.set(new T.Vector3(x, apexY + 200, z), new T.Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(scene, true);
        if (hits.length > 0) samples.push(hits[0].point.y);
      }
      if (samples.length === 0) return apexY;
      samples.sort((a, b) => a - b);
      return samples[Math.floor(samples.length / 2)];
    }

    /**
     * Classify a grid of points across the footprint into "covered" (a downward ray hits
     * something near the roof plane) or "open" (it hits the ground/hearth well below that),
     * and return the CENTROID of the covered samples plus their median surface height. Every
     * other roofed building in this kit is centred under its own roof, so this returns
     * approximately (0, roofY) for them and changes nothing there. The hub is the one
     * exception — its roof sits over only part of the ring (\`style-guide.md\` §6: "one wide
     * conical thatch roof carried on heavy posts over part of the ring and the rest of it
     * open to the sky") — so a centred accent would sit over open sky, not the roof, on that
     * one file. This is what finds the roof wherever it actually is instead of assuming it is
     * centred.
     */
    function roofRegionCentroid(T, scene, w, d, baseY, apexY) {
      const raycaster = new T.Raycaster();
      raycaster.far = 10000;
      const cols = 7;
      const covered = [];
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < cols; j += 1) {
          const x = (i / (cols - 1) - 0.5) * w * 0.82;
          const z = (j / (cols - 1) - 0.5) * d * 0.82;
          raycaster.set(new T.Vector3(x, apexY + 200, z), new T.Vector3(0, -1, 0));
          const hits = raycaster.intersectObject(scene, true);
          if (hits.length === 0) continue;
          const y = hits[0].point.y;
          if (y > baseY + (apexY - baseY) * 0.45) covered.push({ x, z, y });
        }
      }
      if (covered.length === 0) {
        const y = roofSurfaceHeight(T, scene, w, d, apexY);
        return { x: 0, z: 0, y, peakY: y };
      }
      const cx = covered.reduce((s, p) => s + p.x, 0) / covered.length;
      const cz = covered.reduce((s, p) => s + p.z, 0) / covered.length;
      const ys = covered.map((p) => p.y).sort((a, b) => a - b);
      return { x: cx, z: cz, y: ys[Math.floor(ys.length / 2)], peakY: ys[ys.length - 1] };
    }

    function luminanceOf(hex) {
      const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function mixHex(a, b, t) {
      const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
      const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
      const r = Math.round(ar + (br - ar) * t);
      const g = Math.round(ag + (bg - ag) * t);
      const bl = Math.round(ab + (bb - ab) * t);
      return (r << 16) | (g << 8) | bl;
    }
    function darkenHex(hex, amount) {
      const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
      const nr = Math.round(r * (1 - amount));
      const ng = Math.round(g * (1 - amount));
      const nb = Math.round(b * (1 - amount));
      return (nr << 16) | (ng << 8) | nb;
    }
    /**
     * Raise a colour's luminance to at least \`floor\` (0-255) by scaling it toward white,
     * preserving its hue/chroma ratio rather than flattening it to grey. This is the hard
     * invariant that makes a "near-black artifact" impossible for any generated material,
     * independent of whatever the sampled/derived colour upstream happened to compute to.
     */
    function clampLuminanceFloor(hex, floor) {
      const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
      const lum = luminanceOf(hex);
      if (lum >= floor) return hex;
      const scale = Math.min(4, floor / Math.max(lum, 1));
      const nr = Math.min(255, Math.round(r * scale));
      const ng = Math.min(255, Math.round(g * scale));
      const nb = Math.min(255, Math.round(b * scale));
      return (nr << 16) | (ng << 8) | nb;
    }

    /** R channel minus B channel — positive for earth/wood/thatch tones, negative for the
     * cool teal/blue/grey accents a few of these models also carry (a canvas awning, a
     * stone-tool prop). Roof/wood colours are sampled from the WARM subset only: the
     * Workshop's single largest material by triangle count is a teal shade canopy, and
     * without this filter the "dominant colour, darkened" rule handed the ridge cap that
     * canopy's teal rather than any of the building's own warm wood/thatch tones. */
    function warmthOf(hex) {
      return ((hex >> 16) & 0xff) - (hex & 0xff);
    }

    /**
     * Sample the host model's OWN material palette, weighted by triangle count, so every
     * new colour this script introduces is derived from colours already present in that
     * specific building rather than a hand-picked constant. Returns the darkest/lightest/
     * most common colours that cover at least 2% of the model's triangles (so a single tiny
     * accent material can't skew the sample), each computed once over EVERY significant
     * colour (for stone/curb accents, which may legitimately be cool-toned) and once over
     * only the WARM subset (for roof/wood accents, which must not pick up a cool outlier).
     */
    function samplePalette(T, scene) {
      const rows = new Map();
      let totalTris = 0;
      scene.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const geometry = o.geometry;
        const count = geometry.index
          ? geometry.index.count
          : geometry.attributes.position.count;
        const tris = count / 3;
        totalTris += tris;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const material of materials) {
          if (!material || !material.color) continue;
          const hex = material.color.getHex(T.SRGBColorSpace);
          rows.set(hex, (rows.get(hex) ?? 0) + tris);
        }
      });
      const entries = [...rows.entries()].map(([hex, tris]) => ({
        hex,
        share: totalTris > 0 ? tris / totalTris : 0,
      }));
      const significant = entries.filter((e) => e.share >= 0.02);
      const pool = significant.length > 0 ? significant : entries;
      const byLum = [...pool].sort((a, b) => luminanceOf(a.hex) - luminanceOf(b.hex));
      const dominant = [...entries].sort((a, b) => b.share - a.share)[0];
      const warmPool = pool.filter((e) => warmthOf(e.hex) > -6);
      const warmSource = warmPool.length > 0 ? warmPool : pool;
      const warmByLum = [...warmSource].sort(
        (a, b) => luminanceOf(a.hex) - luminanceOf(b.hex),
      );
      const warmDominant = [...entries.filter((e) => warmthOf(e.hex) > -6)].sort(
        (a, b) => b.share - a.share,
      )[0];
      return {
        darkest: byLum[0]?.hex ?? 0x6b5a45,
        lightest: byLum[byLum.length - 1]?.hex ?? 0xd8c4a0,
        dominant: dominant?.hex ?? 0x8c7254,
        warmDarkest: warmByLum[0]?.hex ?? 0x6b5a45,
        warmDominant: warmDominant?.hex ?? dominant?.hex ?? 0x8c7254,
      };
    }

    function buildDepthKit(T, scene, box, cfg) {
      const kit = new T.Group();
      kit.name = "Era1DepthKit";
      kit.userData.era1DepthKit = true;
      const w = box.max.x - box.min.x;
      const d = box.max.z - box.min.z;
      const short = Math.min(w, d);
      const long = Math.max(w, d);
      const baseY = box.min.y;
      const apexY = box.max.y;
      const height = apexY - baseY;
      const roofY = roofSurfaceHeight(T, scene, w, d, apexY);
      // A height inside the wall band, clear of the ground pad (see \`groundPadTop\`) and
      // clear of the roof: the pad's own top plus a margin, capped well below the apex so a
      // slender building (the Lookout) never samples above its own low wall band.
      const padTop = groundPadTop(T, scene, w, d, apexY);
      const wallSampleY = Math.min(
        padTop + Math.max(0.8, height * 0.08),
        baseY + height * 0.4,
      );

      // ── Every new colour, DERIVED from this model's own palette. No fixed hex constant
      // is used anywhere below, and every one of these is floor-clamped so it can never
      // read as near-black regardless of what the source model's own darkest tone is. ──
      const palette = samplePalette(T, scene);
      const foundationColor = clampLuminanceFloor(
        mixHex(palette.warmDarkest, 0x8a7a5c, 0.4),
        60,
      );
      const roofAccentColor = clampLuminanceFloor(
        darkenHex(palette.warmDominant, 0.22),
        58,
      );
      const woodColor = clampLuminanceFloor(darkenHex(palette.warmDarkest, 0.15), 62);
      const stoneColor = clampLuminanceFloor(mixHex(palette.lightest, palette.darkest, 0.45), 95);
      const doorwayColor = clampLuminanceFloor(darkenHex(palette.warmDarkest, 0.35), 48);

      function mesh(geometry, color, opts) {
        const clamped = clampLuminanceFloor(color, 45);
        const material = new T.MeshStandardMaterial({
          color: clamped,
          flatShading: true,
          roughness: (opts && opts.roughness) || 0.85,
          metalness: 0,
          emissive: (opts && opts.emissive) || 0x000000,
          emissiveIntensity: (opts && opts.emissiveIntensity) || 0,
        });
        const m = new T.Mesh(geometry, material);
        m.castShadow = true;
        m.receiveShadow = true;
        // Tagged by SPATIAL ROLE (never by which JS branch created it) so a guard can test
        // each role's own contact claim independently: foundation/cap hug the whole footprint
        // by design (they bridge the pad to the wall or roof), while entrance/accent props
        // must sit against the building's own structure, never out at the pad's edge. Read
        // back in \`era1BuildingDepth.browser.test.tsx\` via \`userData.era1Category\`.
        m.userData.era1Category = (opts && opts.category) || "other";
        // A SEPARATE flag from category: whether THIS PART is the one meant to touch a real
        // surface directly, or whether it legitimately rests on ANOTHER kit part instead (a
        // canopy on its posts, a crossbar on its rails/legs, a ladder rung between its rails,
        // a flame on its hearth ring) — both are "entrance"/"accent" by role, but only the
        // support member owes a ground-contact claim; the member it carries does not float
        // independently of it. Defaults to true; set \`grounded: false\` at the few call sites
        // that are carried rather than supporting.
        m.userData.era1Grounded = (opts && opts.grounded) !== false;
        return m;
      }

      // ── Foundation: ONE continuous low plinth/curb the walls visibly stand ON, closing
      // the gap between the ground pad (box.min.y) and the wall base (y≈0). Never four
      // separate corner pieces — a single ring/box that hugs the footprint with a minimal
      // (2%) overhang, so it reads as a course the building sits on rather than a stacked
      // block. Height is capped in absolute units, not just as a fraction of the model's
      // own height, so a short building (the Spring) doesn't get a foundation taller than
      // its own body. ──
      const foundationH = Math.min(Math.max(0.35, height * 0.05), 1.1);
      if (cfg.foundation === "ring") {
        const r = (short / 2) * 1.02;
        const geo = new T.CylinderGeometry(r, r * 1.015, foundationH, 20);
        const m = mesh(geo, foundationColor, { roughness: 1, category: "foundation" });
        m.position.set(0, baseY + foundationH / 2 + 0.03, 0);
        kit.add(m);
      } else if (cfg.foundation === "box") {
        const geo = new T.BoxGeometry(w * 1.02, foundationH, d * 1.02);
        const m = mesh(geo, foundationColor, { roughness: 1, category: "foundation" });
        m.position.set(0, baseY + foundationH / 2 + 0.03, 0);
        kit.add(m);
      } else if (cfg.foundation === "ring-path") {
        // Squash a circular ring into an ELLIPSE matching this footprint's own w:d ratio.
        // A plain circle sized to the long axis (tried and discarded) oversized the short
        // axis by up to 2x on an elongated plot like the Commons' 1x2 — exactly the kind of
        // out-of-proportion addition the bounding-box guard below exists to catch.
        const rOuter = (long / 2) * 0.97;
        const rInner = rOuter * 0.82;
        const geo = new T.RingGeometry(rInner, rOuter, 24);
        geo.rotateX(-Math.PI / 2);
        const m = mesh(geo, foundationColor, { roughness: 1, category: "foundation" });
        m.scale.set(w / long, 1, d / long);
        m.position.set(0, baseY + 0.05, 0);
        kit.add(m);
      }

      // ── Roof accent, SUNK INTO the measured roof surface (never perched above it with a
      // visible gap) and coloured a mild step darker than the roof's own dominant colour —
      // never a separate hard-edged, high-contrast cap. ──
      if (cfg.cap === "smoke-vent") {
        // A single low, broad cap (not a tall sharp spike) — a smoke-hole rim sitting IN
        // the thatch rather than a witch's-hat stuck on top of it.
        const r = short * 0.14;
        const h = Math.max(0.35, height * 0.09);
        const geo = new T.CylinderGeometry(r * 0.55, r, h, 10);
        const m = mesh(geo, roofAccentColor, { roughness: 1, category: "cap" });
        m.position.set(0, roofY - h * 0.3, 0);
        kit.add(m);
      } else if (cfg.cap === "ridge-cap") {
        const along = w >= d ? "x" : "z";
        const len = (along === "x" ? w : d) * 0.78;
        const thick = Math.max(0.3, short * 0.06);
        const riseH = Math.max(0.22, height * 0.035);
        const geo =
          along === "x"
            ? new T.BoxGeometry(len, riseH, thick)
            : new T.BoxGeometry(thick, riseH, len);
        const m = mesh(geo, roofAccentColor, { roughness: 0.9, category: "cap" });
        // Sunk half INTO the roof surface so it reads as a ridge board embedded in the
        // thatch/shingle, not a plank resting on top with a visible seam.
        m.position.set(0, roofY - riseH * 0.3, 0);
        kit.add(m);
      } else if (cfg.cap === "vent-stacks") {
        const along = w >= d ? "x" : "z";
        const span = (along === "x" ? w : d) * 0.4;
        const r = short * 0.045;
        const h = Math.max(0.4, height * 0.14);
        for (let i = 0; i < 2; i += 1) {
          const t = i - 0.5;
          const geo = new T.CylinderGeometry(r, r * 1.15, h, 8);
          const m = mesh(geo, woodColor, { roughness: 1, category: "cap" });
          const offset = t * span;
          if (along === "x") m.position.set(offset, roofY + h * 0.3, 0);
          else m.position.set(0, roofY + h * 0.3, offset);
          kit.add(m);
        }
      } else if (cfg.cap === "flag") {
        const poleH = height * 0.24;
        const pole = mesh(
          new T.CylinderGeometry(short * 0.025, short * 0.03, poleH, 6),
          woodColor,
          { roughness: 0.9, category: "cap" },
        );
        pole.position.set(0, apexY + poleH / 2 - 0.1, 0);
        kit.add(pole);
        const flagColor = clampLuminanceFloor(mixHex(0xb54a3a, palette.warmDominant, 0.35), 90);
        const flag = mesh(new T.BoxGeometry(short * 0.26, short * 0.15, 0.05), flagColor, {
          roughness: 0.7,
          category: "cap",
        });
        flag.position.set(short * 0.13, apexY + poleH * 0.78, 0);
        kit.add(flag);
      } else if (cfg.cap === "hearth-vent") {
        // The hub's roof covers only PART of its ring (style-guide.md §6) — measured, this
        // file's own roof sits well off-centre, over roughly its +X half — so a cap centred
        // on the whole footprint (as \`smoke-vent\` is, correctly, for the buildings whose
        // roof spans the whole plan) would sit over the OPEN half instead, floating over
        // bare hearth stones rather than resting on any roof. \`roofRegionCentroid\` finds
        // where the covered roof actually is, so this reuses the Roundhouse's own vocabulary
        // (the two round-plan masses share a mass and should read as kin) sized a little
        // more generously — this is also the one piece of this pass that gives the hub back
        // some of the height the Roundhouse and the Lookout have that it currently lacks:
        // contain-fit is X/Z only (\`worldLayout.ts\`'s \`footprintFitScale\`), so height added
        // here, which does not widen the footprint, raises the hub's own rendered height by
        // the same fraction once it is fit to its plot. Broad and short (radius bigger than
        // its own height) rather than tall and narrow, so the extra height reads as a
        // squat, dressed smoke-hole rim — never a pillar or spike.
        const region = roofRegionCentroid(T, scene, w, d, baseY, apexY);
        const r = short * 0.17;
        const h = Math.max(0.6, height * 0.22);
        const geo = new T.CylinderGeometry(r * 0.6, r, h, 10);
        const m = mesh(geo, roofAccentColor, { roughness: 1, category: "cap" });
        // Standing mostly ABOVE the ridge (only lightly sunk in), unlike the sunk-flush
        // \`smoke-vent\`/\`ridge-cap\` treatment elsewhere in this file — those are read against
        // a roof that already covers the whole plan; this is the one deliberate exception,
        // and it is the height-restoring move the module docblock names above.
        m.position.set(region.x, region.peakY + h * 0.35, region.z);
        kit.add(m);
      }

      // ── Entrance: a RECESSED, tonal doorway plane flush against the wall (never a
      // protruding box), with SHORT, thick timber posts in a colour sampled from the
      // model's own dark tone — never a thin dark "rod". ──
      const doorW = short * 0.2;
      const doorH = Math.min(height * 0.3, short * 0.7);
      const wallJitter = Math.max(0.4, short * 0.1);
      /** This entrance feature's own wall depth at \`offset\`, never the pad's outer edge. */
      function wallAt(offset) {
        return wallFaceCoord(T, scene, cfg.axis, 1, wallSampleY, offset, wallJitter);
      }
      function recessedDoor(x, z) {
        const geo = new T.PlaneGeometry(doorW, doorH);
        const door = mesh(geo, doorwayColor, { roughness: 1, category: "entrance" });
        if (cfg.axis === "x") {
          door.rotation.y = Math.PI / 2;
          door.position.set(x, baseY + doorH / 2 + 0.05, z);
        } else {
          door.position.set(x, baseY + doorH / 2 + 0.05, z);
        }
        return door;
      }
      if (cfg.entrance === "recessed-door") {
        // Set flush AT the wall's OWN face — found by raycasting inward until the first
        // authored surface (wallAt/wallFaceCoord), never read off the pad's outer edge —
        // with a small inset so the plane reads as a shadowed opening rather than a panel
        // glued on.
        const at = wallAt(0) - short * 0.01;
        if (cfg.axis === "x") kit.add(recessedDoor(at, 0));
        else kit.add(recessedDoor(0, at));
      } else if (cfg.entrance === "multi-recessed-door") {
        const along = cfg.axis === "x" ? "z" : "x";
        const span = (along === "x" ? w : d) * 0.55;
        for (let i = 0; i < 3; i += 1) {
          const t = i / 2 - 0.5;
          const offset = t * span;
          // EACH door's own wall depth, not one shared value — a hut cluster's three
          // doorways sit on separate huts that are not all at the same depth, and a
          // doorway is a thin plane, so the wrong depth on any one of them lands it in
          // open air beside its hut rather than on that hut's own wall.
          const at = wallAt(offset) - short * 0.01;
          if (cfg.axis === "x") kit.add(recessedDoor(at, offset));
          else kit.add(recessedDoor(offset, at));
        }
      } else if (cfg.entrance === "recessed-porch") {
        // A shallow porch: the door plane flush at the wall, plus two SHORT, stout posts
        // (timber-thick, not rod-thin) standing just outside it holding up a small overhang
        // in the roof's own tone — the posts stand no taller than the doorway itself, so
        // nothing rises above the eave line as a separate silhouette.
        const face = wallAt(0);
        const at = face - short * 0.01;
        if (cfg.axis === "x") kit.add(recessedDoor(at, 0));
        else kit.add(recessedDoor(0, at));
        const postH = doorH * 0.95;
        const postR = Math.max(0.28, short * 0.045);
        const gap = doorW * 1.5;
        const postsAt = face + short * 0.05;
        for (const side of [-1, 1]) {
          const geo = new T.CylinderGeometry(postR, postR * 1.1, postH, 8);
          const post = mesh(geo, woodColor, { roughness: 0.85, category: "entrance" });
          const along = (gap / 2) * side;
          if (cfg.axis === "x") post.position.set(postsAt, baseY + postH / 2, along);
          else post.position.set(along, baseY + postH / 2, postsAt);
          kit.add(post);
        }
        const canopy = mesh(
          new T.BoxGeometry(cfg.axis === "x" ? short * 0.05 : gap * 1.1, Math.max(0.22, height * 0.03), cfg.axis === "x" ? gap * 1.1 : short * 0.05),
          roofAccentColor,
          { roughness: 0.9, category: "entrance", grounded: false },
        );
        const canopyAt = face + short * 0.08;
        if (cfg.axis === "x") canopy.position.set(canopyAt, baseY + postH + 0.1, 0);
        else canopy.position.set(0, baseY + postH + 0.1, canopyAt);
        kit.add(canopy);
      } else if (cfg.entrance === "workbench") {
        const bench = mesh(
          new T.BoxGeometry(short * 0.45, height * 0.15, short * 0.2),
          woodColor,
          { roughness: 0.85, category: "entrance" },
        );
        const legH = height * 0.13;
        // Set back from the open front, under the shelter's own roof, rather than at a
        // fraction of the pad — the workbench belongs INSIDE the working floor it is on.
        const benchAt = wallAt(0) - short * 0.22;
        if (cfg.axis === "x") bench.position.set(benchAt, baseY + legH, 0);
        else bench.position.set(0, baseY + legH, benchAt);
        kit.add(bench);
      } else if (cfg.entrance === "ladder-base") {
        // Thicker, timber-toned rails (not thin dark rods) and fewer rungs, kept LOW
        // (under a third of the tower's height) and set FLUSH against the tower's own wall
        // face — never floating out at the pad edge with daylight under it — so it reads as
        // a base-access ladder prop, not a detached structure beside the tower frame above.
        const railH = Math.min(height * 0.28, short * 1.4);
        const railR = Math.max(0.16, short * 0.045);
        const railAt = wallAt(0) - short * 0.02;
        for (const side of [-1, 1]) {
          const rail = mesh(
            new T.CylinderGeometry(railR, railR, railH, 6),
            woodColor,
            { roughness: 0.85, category: "entrance" },
          );
          const along = side * short * 0.14;
          if (cfg.axis === "x") rail.position.set(railAt, baseY + railH / 2, along);
          else rail.position.set(along, baseY + railH / 2, railAt);
          kit.add(rail);
        }
        for (let i = 0; i < 3; i += 1) {
          const rung = mesh(
            new T.CylinderGeometry(railR * 0.7, railR * 0.7, short * 0.24, 6),
            woodColor,
            { roughness: 0.85, category: "entrance", grounded: false },
          );
          rung.rotation.z = Math.PI / 2;
          const y = baseY + railH * (0.22 + i * 0.32);
          if (cfg.axis === "x") rung.position.set(railAt, y, 0);
          else {
            rung.rotation.y = Math.PI / 2;
            rung.position.set(0, y, railAt);
          }
          kit.add(rung);
        }
      } else if (cfg.entrance === "dipping-post") {
        // A short post scaled to the basin, standing at the basin's own kerb — found the
        // same raycast way as every other entrance prop, not a fixed fraction of the pad —
        // rather than a tall dark rod towering over a small civic prop.
        const postH = Math.min(height * 0.9, short * 1.1);
        const postAt = wallAt(0) - short * 0.05;
        const post = mesh(
          new T.CylinderGeometry(short * 0.03, short * 0.035, postH, 8),
          woodColor,
          { roughness: 0.85, category: "entrance" },
        );
        post.position.set(0, baseY + postH / 2, postAt);
        kit.add(post);
        const bar = mesh(
          new T.CylinderGeometry(short * 0.02, short * 0.02, short * 0.4, 6),
          woodColor,
          { roughness: 0.85, category: "entrance", grounded: false },
        );
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, baseY + postH * 0.94, postAt - short * 0.2);
        kit.add(bar);
      }

      // ── Standalone accents: subtle, low, and coloured from the sampled palette. ──
      if (cfg.accent === "central-flame") {
        const ring = mesh(
          new T.TorusGeometry(short * 0.22, short * 0.04, 8, 20),
          stoneColor,
          { roughness: 1, category: "accent" },
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, baseY + 0.18, 0);
        kit.add(ring);
        const flame = mesh(new T.ConeGeometry(short * 0.1, short * 0.32, 8), 0xe0672b, {
          emissive: 0xd9622e,
          emissiveIntensity: 1.1,
          category: "accent",
          grounded: false,
        });
        flame.position.set(0, baseY + 0.18 + (short * 0.32) / 2, 0);
        kit.add(flame);
      } else if (cfg.accent === "drying-rack") {
        // The Clearing's own brief names this prop directly (\`style-guide.md\` §6, the
        // \`yard\` mass: "two or three boulders, a LASHED DRYING RACK, one tree left
        // standing") — a real lashed A-frame the settlement's hides actually hang from,
        // which is what a flat cleared plot with only ground texture, shrubs and a tree
        // was missing: one built, coherent form, off to one side so most of the ground
        // still reads open and cleared (the mass's whole point per the through-line: "open
        // ground deliberately kept open"). Two crossed leg-pairs, a crossbar lashed at
        // their apex, and a few hide strips hanging from it — modest, well under the
        // tree's own height, never a second building.
        const along = w >= d ? "x" : "z";
        const span = (along === "x" ? w : d) * 0.22;
        const rackH = Math.min(height * 0.42, short * 1.05);
        const legR = Math.max(0.14, short * 0.022);
        const centre = -(along === "x" ? w : d) * 0.24;
        for (const side of [-1, 1]) {
          const geo = new T.CylinderGeometry(legR, legR * 1.2, rackH, 6);
          const m = mesh(geo, woodColor, { roughness: 0.9, category: "accent" });
          m.rotation.z = side * 0.22;
          const trans = side * span * 0.3;
          if (along === "x") m.position.set(centre, baseY + rackH / 2, trans);
          else m.position.set(trans, baseY + rackH / 2, centre);
          kit.add(m);
        }
        const bar = mesh(
          new T.CylinderGeometry(legR * 0.85, legR * 0.85, span * 0.75, 6),
          woodColor,
          { roughness: 0.9, category: "accent", grounded: false },
        );
        if (along === "x") {
          bar.rotation.z = Math.PI / 2;
          bar.position.set(centre, baseY + rackH * 0.92, 0);
        } else {
          bar.rotation.x = Math.PI / 2;
          bar.position.set(0, baseY + rackH * 0.92, centre);
        }
        kit.add(bar);
        for (let i = -1; i <= 1; i += 1) {
          const t = i * span * 0.22;
          const geo =
            along === "x"
              ? new T.BoxGeometry(0.14, rackH * 0.34, span * 0.16)
              : new T.BoxGeometry(span * 0.16, rackH * 0.34, 0.14);
          const strip = mesh(geo, doorwayColor, {
            roughness: 1,
            category: "accent",
            grounded: false,
          });
          if (along === "x") strip.position.set(centre, baseY + rackH * 0.72, t);
          else strip.position.set(t, baseY + rackH * 0.72, centre);
          kit.add(strip);
        }
      } else if (cfg.accent === "megalith-curb") {
        // A LOW ring of curb stones sitting close against the plaza's own edge — knee-to
        // shoulder, not towering — so the Circle reads as dressed with detail rather than
        // fenced in by it. Eight stones (up from six) with four gate markers standing a
        // little taller: the hub is the settlement's own civic centre and the one building
        // permitted "significant undressed stone above footing level" (style-guide.md §6),
        // so a slightly denser, slightly taller ring than an ordinary building's curb reads
        // as more finished detail without any single stone becoming a pillar.
        const count = 8;
        const radius = (short / 2) * 1.06;
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2;
          const isGate = i % 2 === 0;
          const slabH = height * (isGate ? 0.48 : 0.3);
          const slab = mesh(
            new T.BoxGeometry(short * 0.095, slabH, short * 0.15),
            stoneColor,
            { roughness: 1, category: "accent" },
          );
          slab.position.set(
            Math.cos(angle) * radius,
            baseY + slabH / 2 + 0.03,
            Math.sin(angle) * radius,
          );
          slab.rotation.y = angle;
          kit.add(slab);
        }
      } else if (cfg.accent === "stone-rim-raise") {
        // The basin's own rim HEIGHT — found by raycasting DOWN at the centre from a ceiling
        // clear of the ground pad, never off the model's overall apex. On this file the apex
        // is one of the awning's three support poles standing off to one side (measured: the
        // pole's own footprint is entirely off-centre, at roughly x -2.7..-2.2, z -1.4..-0.9,
        // while the basin itself is centred at the origin) — \`apexY\` reads THAT pole's tip,
        // nowhere near the basin below it, so a ring built off it floated well above the
        // basin: the exact "detached brown hoop" defect an independent review found here.
        // The centre is clear of the pole cluster (whose footprint never reaches x=0), so a
        // single centred downward probe reliably reports the basin's own surface instead.
        //
        // The radius is NOT probed outward the same way: the "worn earth… beaten pale and
        // hard" the brief calls for (style-guide.md §6) is a subtle raised texture over most
        // of the plot, with no clean step down to bare pad short of the scattered kerb props
        // near the very edge, so an outward probe here reads noise, not a boundary. short*
        // 0.22 is measured instead, directly, against the basin/kerb meshes themselves
        // (extending to a radius of about 1.8 against a short axis of 8.8).
        const ceiling = Math.min(baseY + height * 0.35, apexY - 0.3);
        const raycaster = new T.Raycaster();
        raycaster.far = height + 400;
        raycaster.set(new T.Vector3(0, ceiling, 0), new T.Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(scene, true);
        const centreY = hits.length > 0 ? hits[0].point.y : baseY;
        const rimRadius = short * 0.22;
        const ring = mesh(
          new T.TorusGeometry(rimRadius, Math.max(0.1, short * 0.018), 8, 20),
          stoneColor,
          { roughness: 1, category: "accent" },
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, centreY + 0.03, 0);
        kit.add(ring);
      }

      return kit;
    }
    window.buildDepthKit = buildDepthKit;
  `;
}

async function openPage() {
  const bundle = threeBundle();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(String(e)));
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: bundle });
  await page.addScriptTag({ content: depthKitBuilderSource() });
  return { browser, page, problems };
}

/** Load, augment, and re-export one file's bytes; returns the new bytes + a shape report. */
async function augmentOne(page, bytes, cfg) {
  const b64 = bytes.toString("base64");
  const result = await page.evaluate(
    async ([b64In, cfg]) => {
      const bin = atob(b64In);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) buf[i] = bin.charCodeAt(i);
      const gltf = await new Promise((res, rej) =>
        new window.GLTFLoader().parse(buf.buffer, "", res, rej),
      );
      // IDEMPOTENT ON AN ALREADY-AUGMENTED FILE: the tracked GLBs this script reads are the
      // committed, already-kitted bytes (a prior run wrote its kit directly into them), so
      // reloading one and adding a second "Era1DepthKit" sibling would compound onto the
      // first pass's geometry instead of replacing it, and would measure the box (and every
      // raycast in buildDepthKit) against a scene that already includes one kit's own
      // additions. Strip any existing kit group first so re-running this script is a true
      // replacement of the previous pass, not a second layer on top of it.
      const staleKits = [];
      gltf.scene.traverse((o) => {
        if (o.name === "Era1DepthKit") staleKits.push(o);
      });
      for (const stale of staleKits) stale.parent?.remove(stale);
      const box = new window.THREE.Box3().setFromObject(gltf.scene);
      const before = {
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z],
      };
      const kit = window.buildDepthKit(window.THREE, gltf.scene, box, cfg);
      const group = new window.THREE.Group();
      group.add(gltf.scene);
      group.add(kit);
      const afterBox = new window.THREE.Box3().setFromObject(group);
      let kitMeshes = 0;
      const kitColors = [];
      kit.traverse((o) => {
        if (o.isMesh) {
          kitMeshes += 1;
          kitColors.push(o.material.color.getHex(window.THREE.SRGBColorSpace));
        }
      });
      const glb = await new Promise((res, rej) =>
        new window.GLTFExporter().parse(group, res, rej, { binary: true }),
      );
      const arr = new Uint8Array(glb);
      let out = "";
      for (let i = 0; i < arr.length; i += 1) out += String.fromCharCode(arr[i]);
      return {
        b64: btoa(out),
        before,
        after: {
          min: [afterBox.min.x, afterBox.min.y, afterBox.min.z],
          max: [afterBox.max.x, afterBox.max.y, afterBox.max.z],
        },
        kitMeshes,
        kitColors,
      };
    },
    [b64, cfg],
  );
  return {
    bytes: Buffer.from(result.b64, "base64"),
    before: result.before,
    after: result.after,
    kitMeshes: result.kitMeshes,
    kitColors: result.kitColors,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const { browser, page, problems } = await openPage();

  console.log(
    `${write ? "WRITING" : "CHECK (dry run, pass --write to persist)"} — ${JOBS.length} files\n`,
  );
  for (const job of JOBS) {
    const path = join(MODELS, job.file);
    const original = readFileSync(path);
    const { bytes, before, after, kitMeshes, kitColors } = await augmentOne(
      page,
      original,
      job,
    );
    const heightBefore = (before.max[1] - before.min[1]).toFixed(2);
    const heightAfter = (after.max[1] - after.min[1]).toFixed(2);
    const darkest = Math.min(
      ...kitColors.map((hex) => {
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }),
    );
    console.log(
      `${job.file.padEnd(34)} ${job.label.padEnd(38)} ` +
        `${original.length}B -> ${bytes.length}B  +${kitMeshes} kit meshes  ` +
        `height ${heightBefore}u -> ${heightAfter}u  darkest-new-lum ${darkest.toFixed(1)}`,
    );
    if (write) {
      writeFileSync(path, bytes);
    }
  }
  await browser.close();

  if (problems.length > 0) {
    console.error("\nPAGE ERRORS:");
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
  } else if (write) {
    console.log("\nwrote all files in place");
  } else {
    console.log("\ndry run only — pass --write to persist");
  }
}

await main();
