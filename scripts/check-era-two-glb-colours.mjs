/**
 * A BUILD-VERSUS-GLB COLOUR CENSUS OVER EVERY COMMITTED ERA-TWO MODEL.
 *
 * ## Why era two needs one and era one did not
 *
 * Era two's material helper calls `.convertSRGBToLinear()` ITSELF:
 *
 *   _nmat(T, col, …) { … new T.Color(col).convertSRGBToLinear() … }
 *
 * That is the only conversion there is under the r128 the art source bundles, where
 * `new Color(hex)` did none. Under the r185 both exporters run, `new Color(hex)` already
 * converts, so an export that leaves `ColorManagement.enabled` alone applies a SECOND
 * conversion and every era-two surface lands measurably too dark. Both exporters therefore
 * disable colour management for the span of the build.
 *
 * `GLTFExporter` writes `material.color.toArray()` unchanged, so the `baseColorFactor` in a
 * committed file is exactly what the build put in the material, and a committed model is in
 * one of three families for each authored hex `h`:
 *
 *   srgbToLinear(h)                 ONE conversion. Linear, which is what glTF asks a
 *                                   factor to be, so it renders back as `h`. INTENDED.
 *   srgbToLinear(srgbToLinear(h))   TWO. Too dark: `#B4714F` = (180, 113, 79) renders back
 *                                   as (116, 42, 20). This is the defect.
 *   h                               NONE. Slightly too bright, and reachable only for the
 *                                   materials the source builds WITHOUT `_nmat`.
 *
 * ## What it is for
 *
 * The civic lane's first export did not disable management, and all five of its committed
 * models carried the doubly-converted factors while its header described the intended ones.
 * A header is a claim; this is a measurement, so run it after any era-two re-export rather
 * than reading either exporter's prose. Exit code is non-zero if any factor is
 * doubly converted.
 *
 * Usage:  node scripts/check-era-two-glb-colours.mjs [--verbose]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MODELS = join(ROOT, "apps/web/src/city/art/models");
const SOURCE = join(
  ROOT,
  "apps/web/src/city/art/building-sources/era-02-neolithic-all-buildings.dc.html",
);

/** The builder class, out of the self-unpacking `.dc.html` — the same lift both exporters do. */
function builderSource() {
  const marker = '<script type="__bundler/template">';
  const raw = readFileSync(SOURCE, "utf8");
  const open = raw.indexOf(marker);
  if (open < 0) throw new Error("no __bundler/template block — is this a .dc.html export?");
  const start = open + marker.length;
  const html = JSON.parse(raw.slice(start, raw.indexOf("</script>", start)).trim());
  const dc = html.indexOf('<script type="text/x-dc"');
  if (dc < 0) throw new Error('no <script type="text/x-dc"> block in the art source');
  const bodyStart = html.indexOf(">", dc) + 1;
  return html.slice(bodyStart, html.indexOf("</script>", bodyStart));
}

/**
 * EVERY AUTHORED COLOUR, not just the `NP` palette, because a hex handed straight to
 * `_nmat` or to `new Color(...)` is a palette entry in everything but name and a census
 * that missed it would report a real colour as unexplained.
 */
function authoredHexes(src) {
  const out = new Set();
  for (const [, hex] of src.matchAll(/0x([0-9A-Fa-f]{6})\b/g)) out.add(hex.toUpperCase());
  for (const [, hex] of src.matchAll(/#([0-9A-Fa-f]{6})\b/g)) out.add(hex.toUpperCase());
  if (out.size < 32) {
    throw new Error(
      `only ${out.size} authored colours found — the lift is wrong, not the art`,
    );
  }
  return out;
}

const srgbToLinear = (c) => (c < 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSRGB = (c) => (c < 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const key = (v) => v.map((x) => x.toFixed(4)).join(",");
const hexOf = (v) =>
  `#${v
    .map((x) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;

/** Every `baseColorFactor` in a .glb's JSON chunk. */
function factors(file) {
  const buf = readFileSync(file);
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString("utf8"));
  return (json.materials ?? []).map((mat) => ({
    name: mat.name ?? "",
    factor: (mat.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1]).slice(0, 3),
  }));
}

/**
 * The twenty committed era-two models, DERIVED from the directory rather than listed, so a
 * sixteenth skill file or a sixth civic one is censused instead of silently skipped. The
 * floor is what stops a broken pattern reporting a clean sweep over nothing.
 */
function models() {
  const flat = readdirSync(MODELS);
  const found = [
    ...flat
      .filter((f) => /^(exp|rad)-\d+-(site|construction|built)\.glb$/.test(f))
      .map((f) => ({ lane: "skill", name: f, file: join(MODELS, f) })),
    ...flat
      .filter((f) => /^civic-neolithic-.+\.glb$/.test(f))
      .map((f) => ({ lane: "civic", name: f, file: join(MODELS, f) })),
    ...readdirSync(join(MODELS, "townhall"))
      .filter((f) => /^townhall-neolithic-.+\.glb$/.test(f))
      .map((f) => ({ lane: "hub", name: f, file: join(MODELS, "townhall", f) })),
  ];
  for (const [lane, floor] of [
    ["skill", 15],
    ["civic", 4],
    ["hub", 1],
  ]) {
    const n = found.filter((m) => m.lane === lane).length;
    if (n < floor) {
      throw new Error(`only ${n} ${lane} models found, expected at least ${floor}`);
    }
  }
  return found;
}

const verbose = process.argv.includes("--verbose");
const src = builderSource();
const hexes = authoredHexes(src);
const single = new Map();
const double = new Map();
for (const hex of hexes) {
  const lin = [0, 2, 4].map((o) =>
    srgbToLinear(Number.parseInt(hex.slice(o, o + 2), 16) / 255),
  );
  single.set(key(lin), hex);
  double.set(key(lin.map(srgbToLinear)), hex);
}

const found = models();
console.log(`${hexes.size} authored colours; ${found.length} committed era-two models\n`);
const rows = [];
for (const { lane, name, file } of found) {
  let intended = 0;
  let doubled = 0;
  const raw = [];
  const unknown = [];
  for (const { factor } of factors(file)) {
    const k = key(factor);
    if (factor.every((x) => x > 0.999)) {
      intended += 1; // the textured path's white: fixed under every hypothesis
    } else if (single.has(k)) {
      intended += 1;
    } else if (double.has(k)) {
      doubled += 1;
    } else if (hexes.has(hexOf(factor).slice(1))) {
      raw.push(hexOf(factor)); // authored, but unconverted — see the header's third family
    } else {
      unknown.push(`[${k}] → ${hexOf(linearToSRGB ? factor.map(linearToSRGB) : factor)}`);
    }
  }
  rows.push({ lane, name, intended, doubled, raw, unknown });
}

const width = Math.max(...rows.map((r) => r.name.length));
for (const r of rows) {
  const verdict =
    r.doubled > 0 ? "DOUBLE-CONVERTED" : r.unknown.length > 0 ? "UNKNOWN" : "intended";
  const notes = [];
  if (r.raw.length)
    notes.push(`${r.raw.length} unconverted (${[...new Set(r.raw)].join(" ")})`);
  if (r.unknown.length)
    notes.push(`${r.unknown.length} unknown${verbose ? `: ${r.unknown.join(" ")}` : ""}`);
  console.log(
    `${r.lane.padEnd(5)} ${r.name.padEnd(width)}  intended=${String(r.intended).padStart(3)}` +
      `  doubled=${String(r.doubled).padStart(3)}  ${verdict}` +
      (notes.length ? `  — ${notes.join("; ")}` : ""),
  );
}

const doubled = rows.reduce((n, r) => n + r.doubled, 0);
const unconverted = rows.reduce((n, r) => n + r.raw.length, 0);
const unknown = rows.reduce((n, r) => n + r.unknown.length, 0);
console.log(
  `\n${doubled} doubly converted, ${unconverted} unconverted (authored but not linearised), ` +
    `${unknown} unknown`,
);
if (doubled > 0) {
  console.log(
    "RED: re-export with `ColorManagement.enabled = false` for the span of the build.",
  );
  process.exitCode = 1;
} else {
  console.log("GREEN: every explained factor carries one sRGB → linear conversion.");
}
