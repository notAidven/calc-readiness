/**
 * Composite era four's six comparison sheets from the nineteen delivered frames.
 *
 * `output/imagegen/era-04-succession-crisis-scenes/README.md` states the job and this
 * script does exactly that and no more: *"Composited from the single renders and never
 * generated — a layout job: no retouching, no regeneration, no relighting […] Tile, do not
 * scale: each panel keeps its own frame at full size."* So every output pixel below is a
 * byte copied out of a delivered frame, and a panel that does not match the sheet's frame
 * size aborts the run rather than being resized to fit.
 *
 * ## WHY THE SHEET SIZE IS READ OFF THE FRAMES AND NOT WRITTEN DOWN
 *
 * That README says the sheet is *"1400n by 900"*, which was true of the size the frames
 * were commissioned at and is not true of the ones that were delivered: the eighteen asset
 * frames are 1248 square. A hardcoded 1400 by 900 here would either scale them — the one
 * thing the layout job forbids — or refuse to run. So the first panel fixes the sheet's
 * cell size and every other panel is checked against it, which keeps the no-scaling rule
 * whatever size a future re-run comes back at.
 *
 * ## WHY THERE IS NO PNG LIBRARY IN HERE
 *
 * `pngjs` is present in `node_modules` but only as a transitive dependency of
 * `@vitest/browser`, so a tool importing it would break on an unrelated dependency bump.
 * The frames are all 8-bit truecolour and non-interlaced, which is the one PNG shape worth
 * hand-rolling: decode is the five filter predictors and encode is a filter byte per row
 * through `node:zlib`. Anything else in the input aborts.
 *
 * The delivered frames carry a `caBX` content-credentials chunk describing the generation
 * that produced each one. It is deliberately not copied onto a sheet: a composite is not
 * the image that provenance describes.
 *
 * Usage: node tools/composite-succession-sheets.mjs [--check]
 *
 *   --check  verify the sheets on disk match what this script would write, and change
 *            nothing. Exits non-zero on a mismatch.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sceneDir = join(repoRoot, "output/imagegen/era-04-succession-crisis-scenes");

/**
 * The compositing table, transcribed from that README's "How the comparison sheets get
 * assembled" section. The numbers are its own frame numbers and the panels are in its
 * stated left-to-right order; `must_read` is its third column, kept here so a reader of a
 * sheet can see what the sheet is supposed to be evidence of.
 */
const SHEETS = [
  {
    file: "plinth-four-states.png",
    frames: [2, 3, 4, 5],
    must_read:
      "The four told apart by shape alone. A standing upright and a seated mass must " +
      "not resolve into the same pale blob when squinted at",
  },
  {
    file: "boundary-stone-marks.png",
    frames: [7, 8, 9, 10],
    must_read: "Four marks, countable and distinguishable on a small top face",
  },
  {
    file: "drift-warning.png",
    frames: [2, 11, 5],
    must_read:
      "Somebody is about to raise a statue at the second and is doing it at the third. " +
      "The empty first reads as a positive state rather than as a pedestal that failed to draw",
  },
  {
    file: "civic-building-states.png",
    frames: [12, 13, 14],
    must_read:
      "The second kept its whole silhouette and lost its openings; the third gained a " +
      "small object and nothing else; all three are plainly one building",
  },
  {
    file: "influence-counting-board.png",
    frames: [16, 17, 18, 19],
    must_read:
      "Counters countable at a glance, a second row legible as a second row, and the " +
      "socketed counter the same object as those on the slabs, moved",
  },
  {
    file: "planned-against-committed.png",
    frames: [3, 6, 14, 15],
    must_read:
      "A proposal and a fact are the same shape, differing only in translucency and " +
      "value; a viewer can say which is committed without being told",
  },
];

/** The nineteen frames, by the README's own numbering. Index 0 is unused. */
const FRAMES = [
  null,
  "wide-master.png",
  "plinth-bare.png",
  "plinth-standing-figure.png",
  "plinth-seated-figure.png",
  "plinth-block-hoisted.png",
  "plinth-standing-figure-proposed.png",
  "boundary-stone-unmarked.png",
  "boundary-stone-chevron.png",
  "boundary-stone-ring.png",
  "boundary-stone-both.png",
  "drift-block-at-the-foot.png",
  "civic-building-open.png",
  "civic-building-shuttered.png",
  "civic-building-inscription.png",
  "civic-building-inscription-proposed.png",
  "counting-slab-empty.png",
  "counting-slab-one-row.png",
  "counting-slab-second-row.png",
  "counter-in-the-pedestal-socket.png",
];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BYTES_PER_PIXEL = 3;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let index = 0; index < buffer.length; index += 1) {
    c = CRC_TABLE[(c ^ buffer[index]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

/**
 * Decode an 8-bit truecolour non-interlaced PNG to `{ width, height, pixels }`, where
 * `pixels` is tightly packed RGB with no filter bytes in it.
 */
function decodePng(path) {
  const file = readFileSync(path);
  if (!file.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${path}: not a PNG`);
  }

  let width = 0;
  let height = 0;
  const idat = [];
  let offset = 8;
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString("ascii", offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colour, compression, filter, interlace] = body.subarray(8, 13);
      if (depth !== 8 || colour !== 2 || compression !== 0 || filter !== 0) {
        throw new Error(
          `${path}: expected 8-bit truecolour, got depth ${depth} colour ${colour}`,
        );
      }
      if (interlace !== 0) {
        throw new Error(`${path}: interlaced PNGs are not handled`);
      }
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * BYTES_PER_PIXEL;
  if (raw.length !== (stride + 1) * height) {
    throw new Error(`${path}: unexpected scanline length`);
  }

  const pixels = Buffer.allocUnsafe(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const above = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    unfilter(filterType, line, out, above, path);
  }

  return { width, height, pixels };
}

/** The five PNG filter predictors, reversed in place into `out`. */
function unfilter(filterType, line, out, above, path) {
  const bpp = BYTES_PER_PIXEL;
  for (let index = 0; index < line.length; index += 1) {
    const left = index >= bpp ? out[index - bpp] : 0;
    const up = above ? above[index] : 0;
    const upLeft = above && index >= bpp ? above[index - bpp] : 0;
    const value = line[index];
    switch (filterType) {
      case 0:
        out[index] = value;
        break;
      case 1:
        out[index] = (value + left) & 0xff;
        break;
      case 2:
        out[index] = (value + up) & 0xff;
        break;
      case 3:
        out[index] = (value + ((left + up) >> 1)) & 0xff;
        break;
      case 4:
        out[index] = (value + paeth(left, up, upLeft)) & 0xff;
        break;
      default:
        throw new Error(`${path}: unknown filter ${filterType}`);
    }
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

function chunk(type, body) {
  const head = Buffer.allocUnsafe(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** Encode tightly packed RGB back to an 8-bit truecolour PNG. */
function encodePng({ width, height, pixels }) {
  const stride = width * BYTES_PER_PIXEL;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    // Filter 1 (Sub) over flat-shaded faces: cheap, and it beats storing raw by a long way.
    raw[y * (stride + 1)] = 1;
    const line = pixels.subarray(y * stride, (y + 1) * stride);
    const out = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let index = 0; index < stride; index += 1) {
      out[index] =
        (line[index] - (index >= BYTES_PER_PIXEL ? line[index - BYTES_PER_PIXEL] : 0)) &
        0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Butt `panels` together left to right at full size. Refuses to scale or crop. */
function tile(panels, sheetFile) {
  const [first] = panels;
  const { width: cellWidth, height: cellHeight } = first.image;
  for (const panel of panels) {
    if (panel.image.width !== cellWidth || panel.image.height !== cellHeight) {
      throw new Error(
        `${sheetFile}: ${panel.file} is ${panel.image.width}x${panel.image.height} and the ` +
          `sheet's cell is ${cellWidth}x${cellHeight}. Tile, do not scale: regenerate the ` +
          "frame at the anchor's size rather than resizing it here.",
      );
    }
  }

  const width = cellWidth * panels.length;
  const stride = width * BYTES_PER_PIXEL;
  const cellStride = cellWidth * BYTES_PER_PIXEL;
  const pixels = Buffer.allocUnsafe(stride * cellHeight);
  for (const [column, panel] of panels.entries()) {
    for (let y = 0; y < cellHeight; y += 1) {
      panel.image.pixels.copy(
        pixels,
        y * stride + column * cellStride,
        y * cellStride,
        (y + 1) * cellStride,
      );
    }
  }
  return { width, height: cellHeight, pixels };
}

const checkOnly = process.argv.includes("--check");
let mismatches = 0;

for (const sheet of SHEETS) {
  const panels = sheet.frames.map((number) => {
    const file = FRAMES[number];
    if (!file) {
      throw new Error(
        `${sheet.file}: the README asks for frame ${number} and none is named`,
      );
    }
    return { number, file, image: decodePng(join(sceneDir, file)) };
  });

  const encoded = encodePng(tile(panels, sheet.file));
  const target = join(sceneDir, sheet.file);
  const panelList = panels.map((panel) => `${panel.number} ${panel.file}`).join(" | ");

  if (checkOnly) {
    let existing = null;
    try {
      existing = readFileSync(target);
    } catch {
      existing = null;
    }
    if (!existing?.equals(encoded)) {
      mismatches += 1;
      console.error(`${sheet.file}: on disk does not match the table — ${panelList}`);
    }
    continue;
  }

  writeFileSync(target, encoded);
  const image = decodePng(target);
  console.log(
    `${sheet.file} ${image.width}x${image.height} from ${panels.length} panels: ${panelList}`,
  );
}

if (checkOnly) {
  console.log(
    mismatches === 0
      ? `all ${SHEETS.length} sheets match the compositing table`
      : `${mismatches} of ${SHEETS.length} sheets do not match`,
  );
  process.exit(mismatches === 0 ? 0 : 1);
}
