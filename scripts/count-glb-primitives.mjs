#!/usr/bin/env node
/**
 * How many `BufferGeometry` instances the shipped GLB set becomes once parsed.
 *
 * `GLTFLoader` makes one geometry per mesh PRIMITIVE, so the JSON chunk of each `.glb`
 * answers the question without a GL context: sum `meshes[].primitives.length`. It exists
 * to settle one measurement — whether the geometries a session still holds after the
 * island disposal fix are drei's `useGLTF` cache (a cache, bounded by the model set) or
 * a second leak (unbounded). A cache cannot exceed this total; a leak can.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "apps/web/src/city/art/models";
/**
 * A measurement report from `measure-client-memory.mjs`. Given one, this sums only the
 * models THAT session fetched, which is the number a residual geometry count has to be
 * compared against — the whole-set total is only the ceiling.
 */
const FROM =
  process.argv.indexOf("--from") === -1
    ? null
    : process.argv[process.argv.indexOf("--from") + 1];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (name.endsWith(".glb")) out.push(path);
  }
  return out;
}

function primitivesIn(path) {
  const buf = readFileSync(path);
  // GLB: 12-byte header, then chunks of [uint32 length, uint32 type, data]. The first
  // chunk is always the JSON one (type 0x4E4F534A).
  const jsonLength = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));
  return (json.meshes ?? []).reduce((n, mesh) => n + (mesh.primitives?.length ?? 0), 0);
}

let files = walk(ROOT);
let scope = `every GLB under ${ROOT}`;
if (FROM !== null) {
  const report = JSON.parse(readFileSync(FROM, "utf8"));
  const last = report.checkpoints[report.checkpoints.length - 1];
  // Suffix match on the tail of the URL path, because a dev server and a built bundle
  // serve the same file from different roots (and the built one adds a content hash).
  const fetched = last.glbFiles ?? [];
  const matchesOf = (url) => {
    const hashless = url.replace(/-[A-Za-z0-9_-]{8}\.glb$/, ".glb");
    const tail = hashless.startsWith("/") ? hashless : `/${hashless}`;
    return files.filter((path) => `/${path}`.endsWith(tail));
  };
  const matched = new Set();
  let ambiguous = 0;
  for (const url of fetched) {
    const hits = matchesOf(url);
    // `models/townhall/`, `models/roads/` and `models/gridwork-modern/` reuse basenames,
    // so a URL recorded as a bare filename can match several files. Counting all of them
    // would inflate the total this exists to bound, so say so rather than pick one.
    if (hits.length > 1) ambiguous += 1;
    for (const hit of hits) matched.add(hit);
  }
  files = [...matched];
  scope = `the ${fetched.length} GLBs fetched by ${report.label} (${last.checkpoint})`;
  if (ambiguous > 0) {
    scope +=
      `; ${ambiguous} of those were recorded as bare filenames that match more than one ` +
      "file on disk, so this total is an UPPER BOUND rather than the exact set";
  }
}

let total = 0;
const rows = [];
for (const file of files) {
  const count = primitivesIn(file);
  total += count;
  rows.push({ file, count });
}
rows.sort((a, b) => b.count - a.count);
console.log(`${files.length} GLB files — ${scope}`);
console.log(`${total} primitives => ${total} BufferGeometry instances once parsed`);
console.log("\nlargest:");
for (const row of rows.slice(0, 10)) {
  console.log(`  ${String(row.count).padStart(4)}  ${row.file}`);
}
