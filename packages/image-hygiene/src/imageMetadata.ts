/**
 * Image metadata stripping over raw bytes — the mechanism behind the photo-of-work
 * upload's data-minimization requirement (`docs/Photo_Work_Upload_Scope.md` §6: *"Strip
 * EXIF/geolocation; store only what's needed"*).
 *
 * ## Why this is a byte-level rewriter and not a library call
 *
 * A student's photo of their paper is taken on a phone, and a phone writes where it was
 * taken into the file: EXIF's GPS IFD carries latitude, longitude and altitude, and the
 * same block carries the device, the timestamp and often the owner's name. That is
 * student PII in an education record (§6), so it must not reach storage at all — not the
 * private bucket, not a log, not a presigned response.
 *
 * The strip therefore has to run in TWO places that share no runtime: the browser, before
 * the presigned PUT (so unstripped bytes never leave the device), and the Lambda, on
 * ingest (so what is stored is guaranteed stripped no matter what the client did). Hence a
 * dependency-free package over `Uint8Array` — no `sharp`, no canvas, no native binding, no
 * Node built-in. It runs identically in Chromium and in `nodejs20.x`.
 *
 * ## What it does and does not touch
 *
 * It rewrites the CONTAINER and never the picture. The encoded image data (a JPEG's
 * entropy-coded scan, a PNG's `IDAT`, a WebP's `VP8`/`VP8L`) is copied byte for byte, so
 * this is lossless: no re-encode, no resample, no quality loss, no change to what a
 * reviewer sees. What it removes is every container slot that can hold text or a device
 * record — for JPEG that is all of `APPn` and `COM` (the same set `jpegtran -copy none`
 * drops), for PNG everything outside an allowlist of decode-relevant chunks, for WebP the
 * `EXIF`/`XMP `/`ICCP` chunks plus the `VP8X` flag bits that advertise them.
 *
 * The wider-than-EXIF sweep is deliberate. XMP is a second copy of the same GPS fields,
 * IPTC a third, an ICC profile names the capture device, and a PNG `tEXt` chunk is free
 * text. Minimization says drop the lot; the cost is an ICC profile's colour fidelity,
 * which is not a property a photo of pencil-on-paper depends on.
 *
 * ## Formats
 *
 * JPEG, PNG and WebP — the three the browser can also produce, which is what makes an
 * unrecognized container answerable rather than a silent pass-through. HEIC/HEIF (an
 * iPhone's native format) is NOT strippable here: its metadata lives in ISOBMFF `meta`
 * boxes, and rewriting those needs a real container parser. The web lane transcodes an
 * unstrippable capture to JPEG before upload instead (`apps/web/src/work-upload`), and
 * the service refuses to store a container it cannot verify — see `sniffImageFormat`.
 */

/** The containers this module can verify and rewrite. */
export type ImageFormat = "jpeg" | "png" | "webp";

/** What a removed block was, in the terms §6's requirement is written in. */
export type MetadataKind = "exif" | "xmp" | "iptc" | "icc" | "text" | "timestamp" | "other";

/** One metadata block found in (or removed from) an image. */
export interface MetadataSegment {
  readonly kind: MetadataKind;
  /** Where it sat, spelled so a message can name it: `JPEG APP1`, `PNG eXIf`, `WebP EXIF`. */
  readonly where: string;
  /** Bytes it occupied, its own header included. */
  readonly byteLength: number;
}

export interface StripResult {
  readonly format: ImageFormat;
  /** The rewritten image. Identical to the input when `removed` is empty. */
  readonly bytes: Uint8Array;
  /** Every block that was dropped, in file order. Empty means the input was already clean. */
  readonly removed: readonly MetadataSegment[];
}

/** A container that is not one of the three, or is truncated/malformed inside. */
export class ImageHygieneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageHygieneError";
  }
}

/** The canonical content type for each container, for a declared-vs-actual comparison. */
const CONTENT_TYPES: Readonly<Record<ImageFormat, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function imageContentType(format: ImageFormat): string {
  return CONTENT_TYPES[format];
}

/**
 * The container a declared content type names, or null for one this module cannot verify.
 * `image/jpg` is accepted as a spelling of `image/jpeg` because browsers and phones emit
 * it; anything else (including `image/heic`) is null and must be refused rather than
 * stored unverified.
 */
export function formatForContentType(contentType: string): ImageFormat | null {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "image/jpeg" || type === "image/jpg") {
    return "jpeg";
  }
  if (type === "image/png") {
    return "png";
  }
  if (type === "image/webp") {
    return "webp";
  }
  return null;
}

function byteAt(bytes: Uint8Array, index: number): number {
  const value = bytes[index];
  if (value === undefined) {
    throw new ImageHygieneError(
      `the image ends mid-structure (wanted byte ${index} of ${bytes.length})`,
    );
  }
  return value;
}

function startsWith(bytes: Uint8Array, offset: number, prefix: readonly number[]): boolean {
  if (offset + prefix.length > bytes.length) {
    return false;
  }
  return prefix.every((expected, index) => bytes[offset + index] === expected);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let index = offset; index < offset + length && index < bytes.length; index += 1) {
    out += String.fromCharCode(byteAt(bytes, index));
  }
  return out;
}

const JPEG_SOI = [0xff, 0xd8];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * The container the BYTES are, read from its magic number — never from a declared MIME
 * type, which is client-supplied and therefore not evidence of anything.
 *
 * This is what turns §6's "image/* only" from a header check into a content check: a
 * caller that declares `image/png` and PUTs a PDF (or a zip, or a script) sniffs as null
 * and is refused.
 */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (startsWith(bytes, 0, JPEG_SOI)) {
    return "jpeg";
  }
  if (startsWith(bytes, 0, PNG_SIGNATURE)) {
    return "png";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }
  return null;
}

/** Concatenate the kept spans into one buffer. */
function join(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Classify a JPEG `APPn`/`COM` payload by the signature it opens with. */
function classifyJpegSegment(marker: number, payload: Uint8Array): MetadataKind {
  const opening = ascii(payload, 0, 32);
  if (opening.startsWith("Exif\u0000")) {
    return "exif";
  }
  if (opening.startsWith("http://ns.adobe.com/xap/1.0/")) {
    return "xmp";
  }
  if (opening.startsWith("ICC_PROFILE\u0000")) {
    return "icc";
  }
  if (opening.startsWith("Photoshop 3.0\u0000")) {
    return "iptc";
  }
  if (marker === 0xfe) {
    return "text";
  }
  return "other";
}

/** JPEG markers that stand alone: no length field, no payload. `0xD9` is `EOI`. */
function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xd9;
}

/**
 * Rewrite a JPEG, dropping every `APPn` (0xE0–0xEF) and `COM` (0xFE) segment.
 *
 * Parsing stops at `SOS` (0xDA): everything from there to the end is entropy-coded scan
 * data plus its terminating `EOI`, in which a `0xFF` byte is data and not a marker. It is
 * copied verbatim, which is both the correct reading of the format and the reason this is
 * lossless.
 */
function stripJpeg(bytes: Uint8Array): StripResult {
  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  const removed: MetadataSegment[] = [];
  let cursor = 2;

  while (cursor < bytes.length) {
    if (byteAt(bytes, cursor) !== 0xff) {
      throw new ImageHygieneError(
        `JPEG marker expected at byte ${cursor}, found 0x${byteAt(bytes, cursor).toString(16)}`,
      );
    }
    // 0xFF fill bytes are legal padding before a marker.
    let markerAt = cursor + 1;
    while (markerAt < bytes.length && byteAt(bytes, markerAt) === 0xff) {
      markerAt += 1;
    }
    const marker = byteAt(bytes, markerAt);
    if (isStandaloneMarker(marker)) {
      kept.push(bytes.subarray(cursor, markerAt + 1));
      cursor = markerAt + 1;
      continue;
    }
    const length = (byteAt(bytes, markerAt + 1) << 8) | byteAt(bytes, markerAt + 2);
    if (length < 2) {
      throw new ImageHygieneError(
        `JPEG segment at byte ${markerAt} declares length ${length}`,
      );
    }
    const end = markerAt + 1 + length;
    if (end > bytes.length) {
      throw new ImageHygieneError(
        `JPEG segment at byte ${markerAt} runs past the end of the image`,
      );
    }
    if (marker === 0xda) {
      // The scan and everything after it, verbatim.
      kept.push(bytes.subarray(cursor));
      cursor = bytes.length;
      continue;
    }
    const isApp = marker >= 0xe0 && marker <= 0xef;
    if (isApp || marker === 0xfe) {
      const payload = bytes.subarray(markerAt + 3, end);
      removed.push({
        kind: classifyJpegSegment(marker, payload),
        where: isApp ? `JPEG APP${marker - 0xe0}` : "JPEG COM",
        byteLength: end - cursor,
      });
      cursor = end;
      continue;
    }
    kept.push(bytes.subarray(cursor, end));
    cursor = end;
  }

  return { format: "jpeg", bytes: join(kept), removed };
}

/**
 * PNG chunks kept, as an ALLOWLIST rather than a deny-list.
 *
 * A deny-list would pass through any chunk type nobody thought of, and a PNG chunk type is
 * four arbitrary bytes: `eXIf` is only the standardized way to carry EXIF in a PNG, and a
 * private chunk can carry anything at all. Everything here is needed to decode or to
 * render the picture correctly; everything else goes.
 */
const PNG_KEPT_CHUNKS: ReadonlySet<string> = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "gAMA",
  "cHRM",
  "sRGB",
  "sBIT",
  "bKGD",
  "hIST",
  "pHYs",
  // APNG, so an animated capture survives the strip rather than losing its frames.
  "acTL",
  "fcTL",
  "fdAT",
]);

function classifyPngChunk(type: string, payload: Uint8Array): MetadataKind {
  if (type === "eXIf") {
    return "exif";
  }
  if (type === "iCCP") {
    return "icc";
  }
  if (type === "tIME") {
    return "timestamp";
  }
  if (type === "iTXt" && ascii(payload, 0, 17) === "XML:com.adobe.xmp") {
    return "xmp";
  }
  if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
    return "text";
  }
  return "other";
}

/**
 * Rewrite a PNG, keeping only {@link PNG_KEPT_CHUNKS}.
 *
 * Bytes after `IEND` are dropped too. They are not part of the image by any reading of the
 * format, and appending a payload there is a well-worn way to smuggle data past a naive
 * stripper.
 */
function stripPng(bytes: Uint8Array): StripResult {
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  const removed: MetadataSegment[] = [];
  let cursor = 8;

  while (cursor < bytes.length) {
    if (cursor + 8 > bytes.length) {
      throw new ImageHygieneError(`PNG chunk header at byte ${cursor} is truncated`);
    }
    const length =
      (byteAt(bytes, cursor) << 24) |
      (byteAt(bytes, cursor + 1) << 16) |
      (byteAt(bytes, cursor + 2) << 8) |
      byteAt(bytes, cursor + 3);
    if (length < 0) {
      throw new ImageHygieneError(`PNG chunk at byte ${cursor} declares length ${length}`);
    }
    const type = ascii(bytes, cursor + 4, 4);
    const end = cursor + 12 + length;
    if (end > bytes.length) {
      throw new ImageHygieneError(`PNG chunk ${type} at byte ${cursor} runs past the end`);
    }
    if (PNG_KEPT_CHUNKS.has(type)) {
      kept.push(bytes.subarray(cursor, end));
    } else {
      removed.push({
        kind: classifyPngChunk(type, bytes.subarray(cursor + 8, end - 4)),
        where: `PNG ${type}`,
        byteLength: end - cursor,
      });
    }
    cursor = end;
    if (type === "IEND") {
      if (cursor < bytes.length) {
        removed.push({
          kind: "other",
          where: "PNG trailing bytes after IEND",
          byteLength: bytes.length - cursor,
        });
      }
      return { format: "png", bytes: join(kept), removed };
    }
  }
  throw new ImageHygieneError("PNG ends without an IEND chunk");
}

/** RIFF chunks kept. Everything outside this set is metadata by elimination. */
const WEBP_KEPT_CHUNKS: ReadonlySet<string> = new Set([
  "VP8 ",
  "VP8L",
  "VP8X",
  "ALPH",
  "ANIM",
  "ANMF",
]);

/**
 * `VP8X` feature flags that ADVERTISE the chunks being removed: ICC (0x20), EXIF (0x08),
 * XMP (0x04). Leaving them set describes an image whose metadata chunks are gone, which
 * some decoders read as a malformed file — so the flags are cleared with the chunks.
 */
const VP8X_METADATA_FLAGS = 0x20 | 0x08 | 0x04;

function classifyWebpChunk(fourcc: string): MetadataKind {
  if (fourcc === "EXIF") {
    return "exif";
  }
  if (fourcc === "XMP ") {
    return "xmp";
  }
  if (fourcc === "ICCP") {
    return "icc";
  }
  return "other";
}

function writeUint32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

/**
 * Rewrite a WebP (a RIFF container), dropping `EXIF`, `XMP ` and `ICCP`.
 *
 * Two things a naive chunk filter gets wrong and this does not: the RIFF header's own size
 * field has to be rewritten to the new payload length, and `VP8X`'s feature flags have to
 * stop claiming the chunks that are gone.
 */
function stripWebp(bytes: Uint8Array): StripResult {
  const kept: Uint8Array[] = [];
  const removed: MetadataSegment[] = [];
  let cursor = 12;

  while (cursor < bytes.length) {
    if (cursor + 8 > bytes.length) {
      throw new ImageHygieneError(`WebP chunk header at byte ${cursor} is truncated`);
    }
    const fourcc = ascii(bytes, cursor, 4);
    const size =
      byteAt(bytes, cursor + 4) |
      (byteAt(bytes, cursor + 5) << 8) |
      (byteAt(bytes, cursor + 6) << 16) |
      (byteAt(bytes, cursor + 7) << 24);
    if (size < 0) {
      throw new ImageHygieneError(`WebP chunk ${fourcc} declares size ${size}`);
    }
    // RIFF pads every odd-sized payload to an even boundary.
    const end = cursor + 8 + size + (size % 2);
    if (cursor + 8 + size > bytes.length) {
      throw new ImageHygieneError(`WebP chunk ${fourcc} runs past the end of the image`);
    }
    if (WEBP_KEPT_CHUNKS.has(fourcc)) {
      const chunk = bytes.slice(cursor, Math.min(end, bytes.length));
      if (fourcc === "VP8X" && chunk.length > 8) {
        chunk[8] = byteAt(chunk, 8) & ~VP8X_METADATA_FLAGS;
      }
      kept.push(chunk);
    } else {
      removed.push({
        kind: classifyWebpChunk(fourcc),
        where: `WebP ${fourcc}`,
        byteLength: Math.min(end, bytes.length) - cursor,
      });
    }
    cursor = end;
  }

  const payload = join(kept);
  const out = new Uint8Array(12 + payload.length);
  out.set(bytes.subarray(0, 12), 0);
  out.set(payload, 12);
  // "RIFF" size counts everything after the size field itself, i.e. "WEBP" + the chunks.
  writeUint32LE(out, 4, 4 + payload.length);
  return { format: "webp", bytes: out, removed };
}

/**
 * Strip every metadata block from an image, or throw for a container this cannot verify.
 *
 * The returned bytes are safe to store: the picture is unchanged, and no EXIF/GPS, XMP,
 * IPTC, ICC, comment or text block survives. Call it before the bytes leave the device AND
 * again on ingest — the two calls are the browser's and the Lambda's, and the second is
 * the one that is enforced rather than trusted.
 */
export function stripImageMetadata(bytes: Uint8Array): StripResult {
  const format = sniffImageFormat(bytes);
  if (format === null) {
    throw new ImageHygieneError(
      "the bytes are not a JPEG, PNG or WebP image, so their metadata cannot be stripped",
    );
  }
  if (format === "jpeg") {
    return stripJpeg(bytes);
  }
  if (format === "png") {
    return stripPng(bytes);
  }
  return stripWebp(bytes);
}

/**
 * Every metadata block still present in an image — the VERIFIER half.
 *
 * Written so that "the stored object carries no geolocation" is a measurement rather than
 * a claim about which functions were called: run it over what is actually stored and
 * assert the list is empty. `stripImageMetadata` followed by this is idempotent by
 * construction, which is what the ingest path relies on.
 */
export function findImageMetadata(bytes: Uint8Array): readonly MetadataSegment[] {
  return stripImageMetadata(bytes).removed;
}
