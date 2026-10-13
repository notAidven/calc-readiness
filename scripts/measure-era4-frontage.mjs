#!/usr/bin/env node
/**
 * Measure era four's real geometry against the claim-plate frontage rule.
 *
 * ## Why this script exists
 *
 * `readFrontage()` — the rule deciding where a Succession claim plate sits on a civic
 * building's face — was written while era four had no models at all, so its assumptions
 * were marked UNVERIFIED against real geometry. #507 published twenty era-four GLBs, so
 * they can be checked. This is that check, as a re-runnable measurement rather than a
 * one-off note.
 *
 * ## What it measures, and in which units
 *
 * WORLD UNITS AS PLACED, never native model units, because that is the frame the plate's
 * own numbers live in. `PlacedBuilding.prepareModel` contain-fits every model to its
 * plot — `scale = min(w*4*0.95/sizeX, d*4*0.95/sizeZ)` — so a model's native half-width
 * says nothing about the wall a plate would land on. A 1-cell plot axis is 3.80u wide
 * whatever the model measured before the fit.
 *
 * Per authored door, on the door's own wall plane, at the door's mid-height:
 *
 *   - `reachLeft` / `reachRight` — how far the wall runs from the door's CENTRE LINE
 *     before it ends, each way, as a contiguous run. This is the quantity the rule is
 *     about: a plate one bay to the door's side needs `bay + plateHalfWidth` of reach.
 *   - `planeHalfWidth` — half the full contiguous wall run through the door.
 *   - `doorWidth`, and the door's offset from the wall run's midpoint.
 *
 * Reach is reported RAW so any threshold can be applied to it. The script prints verdicts
 * at several candidate bay values because the sheet stating the rule is not in the
 * repository (see the report), and a measurement that survives the missing constant is
 * worth more than one that guesses it.
 *
 * ## How it knows where the doors are
 *
 * It does not guess from geometry. The GLBs export unnamed meshes (`mesh_0`, `mesh_1`, …),
 * so a door cannot be found by name in the file. Instead the script rebuilds each building
 * from the SAME procedural kit the exporter uses, with `Era4Kit.plankDoor` and
 * `Era4Kit.doorway` wrapped to record every call. Both builders lay their geometry toward
 * local +Z, so the door's outward normal is the group's local +Z axis — read off the world
 * matrix rather than inferred.
 *
 * ## And it proves it rebuilt the shipped building
 *
 * An instrumented rebuild is only evidence about the shipped GLB if it IS the shipped GLB.
 * `--verify` (on by default) parses each committed file and compares a full mesh census —
 * count, and every mesh's world-space size and centre, sorted — against the rebuild. The
 * kit draws from `Math.random()` for some props AND for its textures, so the same seeded
 * stream the exporter uses is reproduced here; a census mismatch means the rebuild drifted
 * and every door position below it is void.
 *
 * Usage:
 *   node scripts/measure-era4-frontage.mjs
 *   node scripts/measure-era4-frontage.mjs --json
 *   node scripts/measure-era4-frontage.mjs --no-verify
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-04-classical-all-buildings.dc.html",
);
const MODELS = join(ROOT, "apps/web/src/city/art/models");

/* -------------------------------------------------------------------------- */
/* The runtime constants this measurement is expressed in                      */
/* -------------------------------------------------------------------------- */

/** `worldLayout.GRID_CELL` — side of one placement cell, world units. */
const GRID_CELL = 4;
/** `worldLayout.FOOTPRINT_FILL` — how much of its plot a fitted model spans. */
const FOOTPRINT_FILL = 0.95;
/** `worldLayout.MAX_BUILD_HEIGHT` — the rendered-height ceiling. */
const MAX_BUILD_HEIGHT = GRID_CELL * 6;

/**
 * Half the claim plate's width, world units — `buildClaimPlate`'s slab is
 * `box(1.05, 0.78, 0.12)`, so a plate centred `s` from the door needs `s + 0.525` of wall.
 */
const PLATE_HALF_WIDTH = 1.05 / 2;
/** The plate slab's half height, for the vertical-room check. */
const PLATE_HALF_HEIGHT = 0.78 / 2;

/**
 * Candidate values for the rule's `BAY`, because the sheet that states it is absent.
 *
 *  - `1.15` is `buildCivicBuilding`'s own `bayStep`, the only bay module that ships.
 *  - `0.55` is the value that makes the brief's quoted "0.5 + BAY" evaluate to the 1.05
 *    it is annotated with, and is also the fallback offset the sheet names.
 *  - `0.80` is a midpoint, so the table shows where each building crosses over.
 */
const BAY_CANDIDATES = [0.55, 0.8, 1.15];

/** The sheet's stated fallback: same bay as the door, offset 0.55. */
const FALLBACK_OFFSET = 0.55;

/* -------------------------------------------------------------------------- */
/* The ten buildings, their art keys and the plots they are fitted to           */
/* -------------------------------------------------------------------------- */

/**
 * Art key → shipped file and runtime footprint.
 *
 * Footprints are the RUNTIME ones and not the source roster's: `civicCatalogue.ts` for the
 * four bought civics, `worldLayout.NODE_FOOTPRINTS` for the five POL nodes, and
 * `townHall.TOWN_HALL_FOOTPRINT` for the hub. Where the two disagree the exporter turns the
 * asset first (`fitQuarterTurns`), which is why the cottages carry one quarter turn.
 */
const BUILDINGS = [
  {
    art: "cottages",
    label: "The Cottages",
    file: "civic-classical-apartment-block-built.glb",
    footprint: { w: 1, d: 2 },
    fitQuarterTurns: 1,
    group: "civic",
  },
  {
    art: "baths",
    label: "The Baths",
    file: "civic-classical-baths-built.glb",
    footprint: { w: 3, d: 2 },
    group: "civic",
  },
  {
    art: "fountain",
    label: "The Fountain",
    file: "civic-classical-fountain-built.glb",
    footprint: { w: 1, d: 1 },
    group: "civic",
  },
  {
    art: "dock",
    label: "The Grain Dock",
    file: "civic-classical-public-granary-built.glb",
    footprint: { w: 2, d: 2 },
    group: "civic",
  },
  {
    art: "stonecutter",
    label: "POL.1 Stonecutter’s Shop",
    file: "pol-1-built.glb",
    footprint: { w: 2, d: 2 },
    group: "pol",
  },
  {
    art: "barracks",
    label: "POL.2 Barracks",
    file: "pol-2-built.glb",
    footprint: { w: 2, d: 1 },
    group: "pol",
  },
  {
    art: "customs",
    label: "POL.3 Customs House",
    file: "pol-3-built.glb",
    footprint: { w: 2, d: 2 },
    group: "pol",
  },
  {
    art: "cellars",
    label: "POL.4 Wine Cellars",
    file: "pol-4-built.glb",
    footprint: { w: 2, d: 1 },
    group: "pol",
  },
  {
    art: "surveyor",
    label: "POL.8 Surveyor’s Shop",
    file: "pol-8-built.glb",
    footprint: { w: 2, d: 2 },
    group: "pol",
  },
  {
    art: "senate",
    label: "Senate House (hub)",
    file: "townhall/townhall-classical-built.glb",
    footprint: { w: 3, d: 2 },
    group: "hub",
  },
];

/* -------------------------------------------------------------------------- */
/* Node hosting for a kit written for a browser                                */
/* -------------------------------------------------------------------------- */

/**
 * The kit paints its detail textures on a 2D canvas. Nothing measured here depends on a
 * pixel, so the canvas is stubbed — but the stub must not disturb the `Math.random()`
 * STREAM, because `_tex` draws from it and the kit's props draw from the same stream
 * afterwards. It does not: every random call is in the kit's own code, and the stub
 * implements the 2D methods as no-ops. The mesh census in `verifyAgainstShipped` is what
 * actually proves this held.
 */
function installDomStubs() {
  const context2d = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      globalAlpha: 1,
    },
    {
      get: (target, key) => (key in target ? target[key] : () => {}),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  const canvas = () => ({
    width: 0,
    height: 0,
    getContext: () => context2d,
    style: {},
    setAttribute() {},
    addEventListener() {},
  });
  globalThis.self = globalThis;
  globalThis.window = globalThis;
  globalThis.document = {
    createElement: (tag) => (tag === "canvas" ? canvas() : canvas()),
    createElementNS: () => canvas(),
  };
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
  if (!globalThis.URL.createObjectURL) {
    globalThis.URL.createObjectURL = () => "blob:stub";
    globalThis.URL.revokeObjectURL = () => {};
  }
}

/** The exporter's FNV-1a basename seed, reproduced so the random stream matches. */
function seedFor(name) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** The exporter's seeded PRNG, reproduced byte for byte. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
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

/** Extract the one manifest resource defining `window.Era4Kit` (the exporter's method). */
function era4KitSource(html) {
  const manifest = JSON.parse(scriptBlock(html, "__bundler/manifest"));
  const matches = [];
  for (const entry of Object.values(manifest)) {
    if (!/javascript/.test(entry.mime)) {
      continue;
    }
    const stored = Buffer.from(entry.data, "base64");
    const bytes = entry.compressed ? gunzipSync(stored) : stored;
    const source = bytes.toString("utf8");
    if (source.includes("window.Era4Kit")) {
      matches.push(source);
    }
  }
  if (matches.length !== 1) {
    throw new Error(`expected one Era4Kit manifest resource, found ${matches.length}`);
  }
  return matches[0];
}

/* -------------------------------------------------------------------------- */
/* Building, instrumented                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Build one building's `built` phase with every door recorded.
 *
 * The two door builders both lay their geometry toward local +Z — `plankDoor`'s reveal,
 * leaves, surround and threshold are all at positive z, and `doorway`'s jambs and lintel
 * are bedded at +0.07/+0.09 with the reveal punched back behind them — so the OUTWARD
 * NORMAL of a door is its group's local +Z axis. That is read off the world matrix after
 * the build, so a door on a wing that the builder itself rotated is handled with no
 * special case.
 */
function buildInstrumented(THREE, KitClass, building) {
  const doors = [];
  const kit = new KitClass();
  if (kit.bare !== true) {
    throw new Error("Era4Kit no longer defaults to building-only bare mode");
  }

  /**
   * Every opening builder, and how to read an opening's width, height and foot off its
   * arguments. All four lay their geometry toward local +Z, so one normal rule covers them.
   *
   * The two ARCH kinds are recorded because three era-four buildings have no door at all —
   * the Fountain, the Customs House and the Wine Cellars open through round arches and an
   * arcade — and a table that only counted doors would report those three as blank rather
   * than as the different problem they are.
   */
  const OPENINGS = {
    // plankDoor(g, T, w, h, x, y, z, ry, open)
    plankDoor: (a) => ({ door: true, width: a[2], height: a[3], footY: a[5] }),
    // doorway(g, T, w, h, wt, x, y, z, ry, opt)
    doorway: (a) => ({ door: true, width: a[2], height: a[3], footY: a[6] }),
    // archHole(g, T, r, hSpring, wt, x, y, z, ry, opt)
    archHole: (a) => ({
      door: false,
      width: a[2] * 2,
      height: a[3] + a[2],
      footY: a[6],
    }),
    // arcade(g, T, n, bay, pierW, wt, springY, headY, x, y, z, ry, opt) — one bay is the
    // opening; the pier between bays is the only wall a plate could be fixed to.
    arcade: (a) => ({
      door: false,
      width: a[3],
      height: a[6] + a[3] / 2,
      footY: a[9],
      pierWidth: a[4],
      bays: a[2],
    }),
  };

  for (const [method, read] of Object.entries(OPENINGS)) {
    const original = kit[method].bind(kit);
    kit[method] = (...args) => {
      const group = original(...args);
      doors.push({ kind: method, ...read(args), group });
      return group;
    };
  }

  const managed = THREE.ColorManagement.enabled;
  THREE.ColorManagement.enabled = false;
  const realRandom = Math.random;
  Math.random = seededRandom(
    seedFor(
      building.file
        .split("/")
        .pop()
        .replace(/\.glb$/, ""),
    ),
  );
  let root;
  try {
    const build = kit.defs()[building.art];
    if (!build) {
      throw new Error(`no Era4Kit builder for '${building.art}'`);
    }
    root = build("built");
    root.rotation.y = (building.fitQuarterTurns ?? 0) * (Math.PI / 2);
    root.updateMatrixWorld(true);
  } finally {
    Math.random = realRandom;
    THREE.ColorManagement.enabled = managed;
  }
  return { root, doors };
}

/** Every mesh's world-space size and centre, sorted — the census both sides must agree on. */
function meshCensus(THREE, object) {
  const rows = [];
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    const box = new THREE.Box3().setFromObject(child);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    rows.push(
      [size.x, size.y, size.z, centre.x, centre.y, centre.z]
        .map((value) => value.toFixed(3))
        .join(","),
    );
  });
  rows.sort();
  return rows;
}

/**
 * Prove the rebuild IS the committed file, so the recorded door positions are the shipped
 * doors' positions. A census mismatch voids every measurement taken from the rebuild.
 */
async function verifyAgainstShipped(THREE, GLTFLoader, building, rebuilt) {
  const path = join(MODELS, building.file);
  const buffer = readFileSync(path);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  const shipped = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, "", (gltf) => resolve(gltf.scene), reject);
  }).catch((error) => {
    throw new Error(`could not parse ${building.file}: ${error}`);
  });
  const shippedCensus = meshCensus(THREE, shipped);
  const rebuiltCensus = meshCensus(THREE, rebuilt);
  const mismatches = [];
  if (shippedCensus.length !== rebuiltCensus.length) {
    mismatches.push(
      `mesh count ${rebuiltCensus.length} rebuilt vs ${shippedCensus.length} shipped`,
    );
  }
  const limit = Math.min(shippedCensus.length, rebuiltCensus.length);
  let differing = 0;
  for (let index = 0; index < limit; index += 1) {
    if (shippedCensus[index] !== rebuiltCensus[index]) {
      differing += 1;
      if (differing <= 3) {
        mismatches.push(`row ${index}: ${rebuiltCensus[index]} != ${shippedCensus[index]}`);
      }
    }
  }
  if (differing > 3) {
    mismatches.push(`…and ${differing - 3} further differing rows`);
  }
  return { ok: mismatches.length === 0, mismatches, meshes: shippedCensus.length };
}

/* -------------------------------------------------------------------------- */
/* The placement transform, reproduced from `PlacedBuilding.prepareModel`       */
/* -------------------------------------------------------------------------- */

/**
 * Apply the runtime's own contain-fit, height cap and grounding to a built model, so every
 * measurement below is in the world units a plate would actually be drawn in.
 *
 * This is `prepareModel` without the material work: uniform `footprintFitScale`, then the
 * `MAX_BUILD_HEIGHT` squash on Y only, then centre on XZ and sit on Y=0.
 */
function placeInWorld(THREE, root, footprint) {
  const holder = new THREE.Group();
  holder.add(root);

  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3());
  const fitX = (footprint.w * GRID_CELL * FOOTPRINT_FILL) / (size.x || 1);
  const fitZ = (footprint.d * GRID_CELL * FOOTPRINT_FILL) / (size.z || 1);
  const scale = Math.min(fitX, fitZ);
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  const sized = new THREE.Box3().setFromObject(holder);
  const height = sized.max.y - sized.min.y;
  if (height > MAX_BUILD_HEIGHT) {
    root.scale.y *= MAX_BUILD_HEIGHT / height;
    root.updateMatrixWorld(true);
  }

  const grounded = new THREE.Box3().setFromObject(holder);
  root.position.set(
    -(grounded.min.x + grounded.max.x) / 2,
    -grounded.min.y,
    -(grounded.min.z + grounded.max.z) / 2,
  );
  holder.updateMatrixWorld(true);

  const placed = new THREE.Box3().setFromObject(holder);
  return {
    holder,
    scale,
    span: placed.getSize(new THREE.Vector3()),
  };
}

/* -------------------------------------------------------------------------- */
/* The frontage measurement                                                    */
/* -------------------------------------------------------------------------- */

/** Probe step along the wall, world units — fine enough to resolve a 0.1u pier. */
const PROBE_STEP = 0.02;
/** How far along the wall to look before giving up. */
const PROBE_LIMIT = 12;
/** How far in front of the wall a probe ray starts. */
const PROBE_STANDOFF = 3;
/**
 * How far off the door's own plane a hit still counts as THIS wall, world units.
 *
 * The kit's own convention puts a door group ON the face it is cut into — "callers place
 * this group on the face" — so the door's origin plane IS the wall plane, and the band is
 * about how much relief counts as the same wall rather than as a separate structure.
 *
 * 0.20 is a shade under twice the claim plate's own 0.12 bedding depth: a surface within it
 * is one a plate could be fixed flat to, and a pilaster or stair standing further out is
 * one it could not. THE VALUE MATTERS AND WAS MEASURED RATHER THAN PICKED. At 0.85 — a
 * plausible-looking figure in native units for a full-size model — the cottages' stone
 * stair, which stands 1.8 to 3.4 NATIVE units proud of the shop fronts, reads as wall,
 * because that model is fitted at 0.17 and 1.8 native is only 0.31 world. It inflated the
 * cottages' left reach from 0.63 to 1.12 and would have turned a fail into a pass.
 *
 * `--band` re-runs at another value; the report carries the sensitivity sweep that shows no
 * verdict in the table turns on the choice.
 */
const DEFAULT_WALL_BAND = 0.2;

/**
 * How far the wall runs each way from a door's centre line, at the door's mid-height.
 *
 * Walks outward in `PROBE_STEP` increments casting a ray at the wall from `PROBE_STANDOFF`
 * in front, and stops at the first offset where nothing is hit inside the wall band. That
 * makes the result a CONTIGUOUS run: a plate cannot bridge the gap between two wings, so a
 * measurement that summed disjoint wall would overstate the room available.
 */
function measureReach(THREE, holder, door, scaleBand, wallBand) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = PROBE_STANDOFF * 2;

  const matrix = door.group.matrixWorld;
  const origin = new THREE.Vector3().setFromMatrixPosition(matrix);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(matrix).setY(0).normalize();
  const tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal);

  const midHeight = origin.y + (door.height * scaleBand) / 2;
  const targets = [];
  holder.traverse((child) => {
    if (child.isMesh) {
      targets.push(child);
    }
  });

  const hasWallAt = (offset, height) => {
    const point = origin
      .clone()
      .addScaledVector(tangent, offset)
      .setY(height)
      .addScaledVector(normal, PROBE_STANDOFF);
    raycaster.set(point, normal.clone().negate());
    const hits = raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      // Signed distance of the hit from the door's own plane, along the outward normal.
      const depth = hit.point.clone().sub(origin).dot(normal);
      if (Math.abs(depth) <= wallBand) {
        return true;
      }
      // Hits arrive nearest-first from a standoff in front, so once one lands behind the
      // band there is no wall on this plane here and anything further in is another mass.
      if (depth < -wallBand) {
        return false;
      }
    }
    return false;
  };

  const runTo = (sign) => {
    let offset = 0;
    while (offset < PROBE_LIMIT) {
      const next = offset + PROBE_STEP;
      if (!hasWallAt(sign * next, midHeight)) {
        return offset;
      }
      offset = next;
    }
    return PROBE_LIMIT;
  };

  /**
   * The widest UNBROKEN wall anywhere on this opening's plane, at the opening's mid-height,
   * and where its middle sits relative to the opening.
   *
   * This is the measurement that survives the missing rule: whatever `readFrontage()` does
   * with bays and offsets, a 1.05-wide plate has to land on a piece of wall at least that
   * wide, and this says whether the building has one on the face its entrance is in. It is
   * the answer for an arcaded front, where reach from the opening's centre is zero by
   * construction because the centre of the bay is a hole.
   */
  const longestRun = () => {
    let best = { width: 0, centre: 0 };
    let runStart = null;
    for (let offset = -PROBE_LIMIT; offset <= PROBE_LIMIT; offset += PROBE_STEP) {
      if (hasWallAt(offset, midHeight)) {
        if (runStart === null) {
          runStart = offset;
        }
      } else if (runStart !== null) {
        const width = offset - PROBE_STEP - runStart;
        if (width > best.width) {
          best = { width, centre: (runStart + offset - PROBE_STEP) / 2 };
        }
        runStart = null;
      }
    }
    if (runStart !== null) {
      const width = PROBE_LIMIT - runStart;
      if (width > best.width) {
        best = { width, centre: (runStart + PROBE_LIMIT) / 2 };
      }
    }
    return best;
  };

  const widest = longestRun();

  /**
   * Unbroken wall measured UP AND DOWN at the spot a plate would actually be fixed — the
   * middle of the widest run found above, not above the door's own head. A plate sits BESIDE
   * an entrance, so the wall over the entrance is the wrong column: it is the entablature on
   * a porticoed front, and reads as no room on a building with plenty.
   */
  const verticalRunAtPlate = () => {
    if (widest.width <= 0) {
      return 0;
    }
    let up = 0;
    while (up < 6 && hasWallAt(widest.centre, midHeight + up + PROBE_STEP)) {
      up += PROBE_STEP;
    }
    let down = 0;
    while (down < 6 && hasWallAt(widest.centre, midHeight - down - PROBE_STEP)) {
      down += PROBE_STEP;
    }
    return up + down;
  };
  const verticalRoom = verticalRunAtPlate();

  return {
    reachLeft: runTo(-1),
    reachRight: runTo(1),
    widestWallOnPlane: widest.width,
    widestWallCentreOffset: widest.centre,
    verticalRunAtPlate: verticalRoom,
    midHeight,
    normal: [normal.x, normal.z],
  };
}

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

function verdictFor(reach, bay) {
  return reach + 1e-9 >= bay + PLATE_HALF_WIDTH;
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const verify = !args.includes("--no-verify");
  const bandIndex = args.indexOf("--band");
  const wallBand = bandIndex < 0 ? DEFAULT_WALL_BAND : Number(args[bandIndex + 1]);
  if (!Number.isFinite(wallBand) || wallBand <= 0) {
    throw new Error("--band requires one positive number, world units");
  }

  installDomStubs();
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

  // `defs()` reaches for `window.THREE` at build time, exactly as it does in the browser
  // the exporter drives, so the app's own Three.js is published under that name here too.
  globalThis.THREE = THREE;

  const kitSource = era4KitSource(readFileSync(SOURCE, "utf8"));
  // The kit is an IIFE assigning `window.Era4Kit`; `window` is `globalThis` here.
  new Function(kitSource)();
  const KitClass = globalThis.Era4Kit;
  if (typeof KitClass !== "function") {
    throw new Error("Era4Kit did not install");
  }

  const results = [];
  for (const building of BUILDINGS) {
    const { root, doors } = buildInstrumented(THREE, KitClass, building);

    let verification = { ok: null, mismatches: [], meshes: null };
    if (verify) {
      verification = await verifyAgainstShipped(THREE, GLTFLoader, building, root);
    }

    const { holder, scale, span } = placeInWorld(THREE, root, building.footprint);

    const measured = doors.map((door) => {
      const reach = measureReach(THREE, holder, door, scale, wallBand);
      const planeWidth = reach.reachLeft + reach.reachRight;
      return {
        kind: door.kind,
        isDoor: door.door,
        doorWidthWorld: door.width * scale,
        doorHeightWorld: door.height * scale,
        pierWidthWorld: door.pierWidth === undefined ? null : door.pierWidth * scale,
        reachLeft: reach.reachLeft,
        reachRight: reach.reachRight,
        reachBest: Math.max(reach.reachLeft, reach.reachRight),
        planeWidth,
        planeHalfWidth: planeWidth / 2,
        widestWallOnPlane: reach.widestWallOnPlane,
        widestWallCentreOffset: reach.widestWallCentreOffset,
        verticalRunAtPlate: reach.verticalRunAtPlate,
        normal: reach.normal,
      };
    });

    // The principal entrance: the widest authored DOOR, because that is how a classical
    // building says which of its doors is the front one. A building with no door at all
    // falls back to its widest arched opening, which is a different answer and is labelled
    // as one rather than being allowed to look like a door in the table.
    const pick = (pool) =>
      pool.reduce(
        (best, door) =>
          best === null || door.doorWidthWorld > best.doorWidthWorld ? door : best,
        null,
      );
    const realDoors = measured.filter((door) => door.isDoor);
    const principal = realDoors.length > 0 ? pick(realDoors) : pick(measured);
    const worst = (realDoors.length > 0 ? realDoors : measured).reduce(
      (bad, door) => (bad === null || door.reachBest < bad.reachBest ? door : bad),
      null,
    );

    results.push({
      art: building.art,
      label: building.label,
      file: building.file,
      group: building.group,
      footprint: `${building.footprint.w}×${building.footprint.d}`,
      fitScale: scale,
      spanWorld: [span.x, span.y, span.z],
      openingCount: measured.length,
      doorCount: realDoors.length,
      hasDoor: realDoors.length > 0,
      verification,
      principal,
      worst,
      doors: measured,
    });
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    return;
  }

  const num = (value, places = 2) =>
    value === null || value === undefined ? "—" : value.toFixed(places);

  console.log("ERA FOUR FRONTAGE MEASUREMENT — world units as placed\n");
  console.log(
    `plate half-width ${PLATE_HALF_WIDTH} · required reach = BAY + ${PLATE_HALF_WIDTH}` +
      ` · wall band ±${wallBand}` +
      ` · candidates BAY ∈ {${BAY_CANDIDATES.join(", ")}}\n`,
  );

  const verdict = (reach, bay) =>
    reach === null || reach === undefined
      ? "n/a"
      : verdictFor(reach, bay)
        ? "HOLDS"
        : "FAILS";

  console.log("A · THE PRINCIPAL ENTRANCE, AND THE WALL BESIDE IT\n");
  const header = [
    "building".padEnd(26),
    "plot".padEnd(5),
    "fit".padEnd(7),
    "entrance".padEnd(10),
    "open".padEnd(6),
    "reach".padEnd(7),
    "halfW".padEnd(7),
    ...BAY_CANDIDATES.map((bay) => `bay${bay}`.padEnd(7)),
    "census",
  ].join(" ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const row of results) {
    const principal = row.principal;
    const entrance =
      principal === null ? "none" : principal.isDoor ? "door" : `arch(${principal.kind})`;
    console.log(
      [
        row.label.padEnd(26),
        row.footprint.padEnd(5),
        num(row.fitScale, 4).padEnd(7),
        entrance.padEnd(10),
        num(principal?.doorWidthWorld).padEnd(6),
        num(principal?.reachBest).padEnd(7),
        num(principal?.planeHalfWidth).padEnd(7),
        ...BAY_CANDIDATES.map((bay) =>
          verdict(principal?.reachBest ?? null, bay).padEnd(7),
        ),
        row.verification.ok === null
          ? "skipped"
          : row.verification.ok
            ? `ok ${row.verification.meshes}`
            : `MISMATCH ${row.verification.mismatches[0]}`,
      ].join(" "),
    );
  }

  console.log(
    "\nB · THE WORST DOOR ON EACH BUILDING — the rule must hold for whichever one it picks\n",
  );
  const worstHeader = [
    "building".padEnd(26),
    "doors".padEnd(6),
    "worstReach".padEnd(11),
    ...BAY_CANDIDATES.map((bay) => `bay${bay}`.padEnd(7)),
    `fallback ${FALLBACK_OFFSET}`,
  ].join(" ");
  console.log(worstHeader);
  console.log("-".repeat(worstHeader.length));
  for (const row of results) {
    console.log(
      [
        row.label.padEnd(26),
        String(row.doorCount).padEnd(6),
        num(row.worst?.reachBest).padEnd(11),
        ...BAY_CANDIDATES.map((bay) =>
          verdict(row.worst?.reachBest ?? null, bay).padEnd(7),
        ),
        verdict(row.worst?.reachBest ?? null, FALLBACK_OFFSET),
      ].join(" "),
    );
  }

  console.log(
    `\nC · WIDEST UNBROKEN WALL ON THE ENTRANCE'S OWN PLANE — can a ${(PLATE_HALF_WIDTH * 2).toFixed(2)}-wide plate be fixed at all\n`,
  );
  const wallHeader = [
    "building".padEnd(26),
    "widestWall".padEnd(11),
    "plate fits".padEnd(11),
    "vertRoom".padEnd(9),
    "plate tall enough",
  ].join(" ");
  console.log(wallHeader);
  console.log("-".repeat(wallHeader.length));
  for (const row of results) {
    const principal = row.principal;
    const wall = principal?.widestWallOnPlane ?? null;
    console.log(
      [
        row.label.padEnd(26),
        num(wall).padEnd(11),
        (wall === null ? "n/a" : wall >= PLATE_HALF_WIDTH * 2 ? "yes" : "NO").padEnd(11),
        num(principal?.verticalRunAtPlate).padEnd(9),
        principal === null
          ? "n/a"
          : principal.verticalRunAtPlate >= PLATE_HALF_HEIGHT * 2
            ? "yes"
            : "NO",
      ].join(" "),
    );
  }

  console.log(`\nD · THE PLATE IS AN ABSOLUTE SIZE AND THE BUILDINGS ARE A FITTED ONE\n`);
  const ratioHeader = [
    "building".padEnd(26),
    "fit".padEnd(7),
    "frontage".padEnd(9),
    "entrance".padEnd(9),
    "plate÷frontage".padEnd(15),
    "plate÷entrance",
  ].join(" ");
  console.log(ratioHeader);
  console.log("-".repeat(ratioHeader.length));
  for (const row of results) {
    const principal = row.principal;
    // The frontage span is the plot axis the entrance looks along: the model is contain-fit,
    // so this is the widest the building can ever be on that face.
    const frontage = Math.max(row.spanWorld[0], row.spanWorld[2]);
    console.log(
      [
        row.label.padEnd(26),
        num(row.fitScale, 4).padEnd(7),
        num(frontage).padEnd(9),
        num(principal?.doorWidthWorld).padEnd(9),
        `${num((PLATE_HALF_WIDTH * 2) / frontage)}×`.padEnd(15),
        principal === null
          ? "—"
          : `${num((PLATE_HALF_WIDTH * 2) / principal.doorWidthWorld)}×`,
      ].join(" "),
    );
  }

  const outPath = join(ROOT, "docs/design-refs/era4-frontage/frontage-measurements.json");
  try {
    writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
    console.log(`\nwrote ${outPath}`);
  } catch {
    // The directory may not exist when the script is run outside the report's context.
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
