import { describe, expect, it } from "vitest";

import {
  findImageMetadata,
  formatForContentType,
  ImageHygieneError,
  sniffImageFormat,
  stripImageMetadata,
} from "./imageMetadata";

/**
 * **THE EVIDENCE THAT GEOLOCATION IS ACTUALLY REMOVED, not that a function was called.**
 *
 * The privacy requirement (`docs/Photo_Work_Upload_Scope.md` §6) is about bytes, so every
 * case below is about bytes. Each fixture is built here, from the format specifications,
 * carrying a GPS coordinate whose exact byte sequence is known — so the assertions are
 * "these coordinates are present in the input" and "they are absent from the output",
 * which is a measurement. A test that asserted `stripImageMetadata` had been invoked would
 * pass over an implementation that returned its input unchanged.
 *
 * The other half of the claim is that stripping is LOSSLESS, because a reviewer has to be
 * able to read the student's handwriting afterwards. That is asserted as byte identity of
 * the encoded picture (a JPEG's scan, a PNG's `IDAT`, a WebP's `VP8 `), not as "the file
 * still opens".
 */

/** Where `needle` first appears in `haystack`, or -1. */
function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        continue outer;
      }
    }
    return start;
  }
  return -1;
}

function bytes(...values: (number | number[] | Uint8Array | string)[]): Uint8Array {
  const flat: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      flat.push(value);
    } else if (typeof value === "string") {
      for (let index = 0; index < value.length; index += 1) {
        flat.push(value.charCodeAt(index));
      }
    } else {
      flat.push(...value);
    }
  }
  return new Uint8Array(flat);
}

function uint16BE(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function uint32BE(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function uint16LE(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function uint32LE(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

/**
 * THE COORDINATES. A real EXIF GPS latitude is three RATIONALs (degrees, minutes,
 * seconds), each a pair of 32-bit LE integers. 37° 25' 30.50" — the byte sequence the
 * tests below hunt for on both sides of the strip.
 */
const GPS_LATITUDE_BYTES = bytes(
  uint32LE(37),
  uint32LE(1),
  uint32LE(25),
  uint32LE(1),
  uint32LE(3050),
  uint32LE(100),
);

/** A little-endian TIFF/EXIF payload with an IFD0 → GPS IFD carrying the latitude above. */
function exifPayload(): Uint8Array {
  const ifd0At = 8;
  const ifd0Length = 2 + 2 * 12 + 4;
  const makeAt = ifd0At + ifd0Length;
  const makeValue = bytes("ACME\u0000");
  const gpsIfdAt = makeAt + makeValue.length;
  const gpsIfdLength = 2 + 2 * 12 + 4;
  const latitudeAt = gpsIfdAt + gpsIfdLength;

  const ifd0 = bytes(
    uint16LE(2),
    // Make (0x010F), ASCII, 5 chars, stored out of line.
    uint16LE(0x010f),
    uint16LE(2),
    uint32LE(makeValue.length),
    uint32LE(makeAt),
    // GPSInfo IFD pointer (0x8825), LONG, 1.
    uint16LE(0x8825),
    uint16LE(4),
    uint32LE(1),
    uint32LE(gpsIfdAt),
    uint32LE(0),
  );
  const gpsIfd = bytes(
    uint16LE(2),
    // GPSLatitudeRef (0x0001), ASCII, 2 — short enough to sit inline.
    uint16LE(0x0001),
    uint16LE(2),
    uint32LE(2),
    bytes("N\u0000\u0000\u0000"),
    // GPSLatitude (0x0002), RATIONAL, 3 — the 24 bytes at `latitudeAt`.
    uint16LE(0x0002),
    uint16LE(5),
    uint32LE(3),
    uint32LE(latitudeAt),
    uint32LE(0),
  );
  return bytes(
    "Exif\u0000\u0000",
    "II",
    uint16LE(0x002a),
    uint32LE(ifd0At),
    ifd0,
    makeValue,
    gpsIfd,
    GPS_LATITUDE_BYTES,
  );
}

/** `FF <marker> <length> <payload>` — a JPEG segment. */
function jpegSegment(marker: number, payload: Uint8Array): Uint8Array {
  return bytes(0xff, marker, uint16BE(payload.length + 2), payload);
}

/**
 * The entropy-coded scan: the picture itself, which a strip must not touch. `FF 00` in the
 * middle is a stuffed byte — real scan data, and the thing a parser that kept walking past
 * `SOS` would mistake for a marker.
 */
const JPEG_SCAN = bytes(0x01, 0x02, 0x03, 0xff, 0x00, 0x04, 0x05, 0x00, 0x77);

/** A JPEG carrying JFIF, EXIF-with-GPS, XMP, an ICC profile and a comment. */
function jpegWithMetadata(): Uint8Array {
  return bytes(
    0xff,
    0xd8,
    jpegSegment(0xe0, bytes("JFIF\u0000", 0x01, 0x02, 0x00, 0x00, 0x01, 0x00, 0x01, 0, 0)),
    jpegSegment(0xe1, exifPayload()),
    jpegSegment(0xe1, bytes("http://ns.adobe.com/xap/1.0/\u0000<x:xmpmeta/>")),
    jpegSegment(0xe2, bytes("ICC_PROFILE\u0000", 0x01, 0x01, 0x02, 0x03)),
    jpegSegment(0xfe, bytes("taken at home")),
    // DQT, SOF0 (the dimensions), DHT — decode data, all of which must survive.
    jpegSegment(0xdb, bytes(0x00, 0x10, 0x11)),
    jpegSegment(0xc0, bytes(0x08, uint16BE(64), uint16BE(48), 0x01, 0x01, 0x11, 0x00)),
    jpegSegment(0xc4, bytes(0x00, 0x01, 0x02)),
    jpegSegment(0xda, bytes(0x01, 0x01, 0x00, 0x00, 0x3f, 0x00)),
    JPEG_SCAN,
    0xff,
    0xd9,
  );
}

/** `<length> <type> <payload> <crc>` — a PNG chunk. The CRC is not recomputed by a strip. */
function pngChunk(type: string, payload: Uint8Array): Uint8Array {
  return bytes(uint32BE(payload.length), type, payload, uint32BE(0x12345678));
}

const PNG_IDAT = bytes(0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01);

function pngWithMetadata(): Uint8Array {
  return bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    pngChunk("IHDR", bytes(uint32BE(64), uint32BE(48), 0x08, 0x02, 0x00, 0x00, 0x00)),
    pngChunk("eXIf", exifPayload().subarray(6)),
    pngChunk("tEXt", bytes("Author\u0000A. Student")),
    pngChunk("tIME", bytes(uint16BE(2026), 0x08, 0x05, 0x0c, 0x00, 0x00)),
    pngChunk("iCCP", bytes("Camera\u0000", 0x00, 0x01)),
    pngChunk("IDAT", PNG_IDAT),
    pngChunk("IEND", new Uint8Array()),
    // Trailing bytes after IEND: not part of the image, and a classic smuggling slot.
    bytes("smuggled: 37.4251 N"),
  );
}

/** `<fourcc> <size LE> <payload> [pad]` — a RIFF chunk. */
function riffChunk(fourcc: string, payload: Uint8Array): Uint8Array {
  const pad = payload.length % 2 === 1 ? [0x00] : [];
  return bytes(fourcc, uint32LE(payload.length), payload, pad);
}

const WEBP_VP8 = bytes(0x9d, 0x01, 0x2a, 0x40, 0x00, 0x30, 0x00, 0x11, 0x22, 0x33);

function webpWithMetadata(): Uint8Array {
  const chunks = bytes(
    // VP8X with the ICC (0x20), EXIF (0x08) and XMP (0x04) feature flags all set.
    riffChunk(
      "VP8X",
      bytes(0x2c, 0x00, 0x00, 0x00, uint16LE(63), 0x00, uint16LE(47), 0x00),
    ),
    riffChunk("VP8 ", WEBP_VP8),
    riffChunk("EXIF", exifPayload().subarray(6)),
    riffChunk("XMP ", bytes("<x:xmpmeta/>")),
    riffChunk("ICCP", bytes(0x01, 0x02, 0x03)),
  );
  return bytes("RIFF", uint32LE(4 + chunks.length), "WEBP", chunks);
}

describe("sniffImageFormat reads the container, never the declared type", () => {
  it("recognizes the three strippable containers", () => {
    expect(sniffImageFormat(jpegWithMetadata())).toBe("jpeg");
    expect(sniffImageFormat(pngWithMetadata())).toBe("png");
    expect(sniffImageFormat(webpWithMetadata())).toBe("webp");
  });

  it("refuses anything else, including a container it cannot rewrite", () => {
    // The PDF a caller could PUT while declaring `image/png`, and the HEIC an iPhone can
    // hand over — both must be refused rather than stored unverified (§6).
    expect(sniffImageFormat(bytes("%PDF-1.7\n"))).toBeNull();
    expect(sniffImageFormat(bytes(uint32BE(24), "ftypheic", uint32BE(0)))).toBeNull();
    expect(sniffImageFormat(bytes("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImageFormat(new Uint8Array())).toBeNull();
  });

  it("maps declared content types onto containers, and HEIC onto none", () => {
    expect(formatForContentType("image/jpeg")).toBe("jpeg");
    expect(formatForContentType("image/jpg")).toBe("jpeg");
    expect(formatForContentType("IMAGE/PNG")).toBe("png");
    expect(formatForContentType("image/webp; charset=binary")).toBe("webp");
    expect(formatForContentType("image/heic")).toBeNull();
    expect(formatForContentType("application/pdf")).toBeNull();
  });
});

describe("JPEG", () => {
  const input = jpegWithMetadata();

  it("carries the GPS latitude before the strip", () => {
    // The fixture is only evidence if the thing being removed is provably in it.
    expect(indexOfBytes(input, GPS_LATITUDE_BYTES)).toBeGreaterThan(0);
    expect(findImageMetadata(input).map((segment) => segment.kind)).toEqual([
      "other",
      "exif",
      "xmp",
      "icc",
      "text",
    ]);
  });

  it("removes the GPS latitude, and every other metadata segment, from the bytes", () => {
    const result = stripImageMetadata(input);

    expect(indexOfBytes(result.bytes, GPS_LATITUDE_BYTES)).toBe(-1);
    expect(indexOfBytes(result.bytes, bytes("Exif\u0000\u0000"))).toBe(-1);
    expect(indexOfBytes(result.bytes, bytes("ns.adobe.com/xap"))).toBe(-1);
    expect(indexOfBytes(result.bytes, bytes("taken at home"))).toBe(-1);
    expect(indexOfBytes(result.bytes, bytes("ICC_PROFILE"))).toBe(-1);
    expect(result.removed.map((segment) => segment.where)).toEqual([
      "JPEG APP0",
      "JPEG APP1",
      "JPEG APP1",
      "JPEG APP2",
      "JPEG COM",
    ]);
    // And the file got smaller by exactly what was dropped.
    const dropped = result.removed.reduce((sum, segment) => sum + segment.byteLength, 0);
    expect(result.bytes.length).toBe(input.length - dropped);
  });

  it("leaves the picture byte-identical (lossless)", () => {
    const result = stripImageMetadata(input);

    // The scan, its SOS header and the EOI, verbatim.
    const scanAt = indexOfBytes(result.bytes, JPEG_SCAN);
    expect(scanAt).toBeGreaterThan(0);
    expect([...result.bytes.subarray(scanAt)]).toEqual([...JPEG_SCAN, 0xff, 0xd9]);
    // The frame header, so the dimensions survive: SOF0 with 64x48.
    expect(
      indexOfBytes(result.bytes, bytes(0xff, 0xc0, uint16BE(11), 0x08, uint16BE(64))),
    ).toBeGreaterThan(0);
    // A 0xFF byte inside the scan is DATA, not a marker. If the parser had kept walking
    // past SOS it would have mis-read `FF 00` and truncated the picture here.
    expect(indexOfBytes(result.bytes, bytes(0x03, 0xff, 0x00, 0x04))).toBeGreaterThan(0);
  });

  it("is idempotent: a stripped JPEG has nothing left to remove", () => {
    const once = stripImageMetadata(input);
    const twice = stripImageMetadata(once.bytes);
    expect(twice.removed).toEqual([]);
    expect([...twice.bytes]).toEqual([...once.bytes]);
    expect(findImageMetadata(once.bytes)).toEqual([]);
  });

  it("throws on a truncated segment rather than emitting half an image", () => {
    const truncated = input.subarray(0, 40);
    expect(() => stripImageMetadata(truncated)).toThrow(ImageHygieneError);
  });
});

describe("PNG", () => {
  const input = pngWithMetadata();

  it("removes eXIf, text, timestamp, colour profile and post-IEND bytes", () => {
    expect(indexOfBytes(input, GPS_LATITUDE_BYTES)).toBeGreaterThan(0);
    const result = stripImageMetadata(input);

    expect(indexOfBytes(result.bytes, GPS_LATITUDE_BYTES)).toBe(-1);
    expect(indexOfBytes(result.bytes, bytes("A. Student"))).toBe(-1);
    expect(indexOfBytes(result.bytes, bytes("smuggled"))).toBe(-1);
    expect(result.removed.map((segment) => `${segment.where}:${segment.kind}`)).toEqual([
      "PNG eXIf:exif",
      "PNG tEXt:text",
      "PNG tIME:timestamp",
      "PNG iCCP:icc",
      "PNG trailing bytes after IEND:other",
    ]);
  });

  it("keeps IHDR, IDAT and IEND byte-identical", () => {
    const result = stripImageMetadata(input);
    expect(indexOfBytes(result.bytes, PNG_IDAT)).toBeGreaterThan(0);
    expect(indexOfBytes(result.bytes, bytes("IHDR", uint32BE(64), uint32BE(48)))).toBe(
      8 + 4,
    );
    expect(indexOfBytes(result.bytes, bytes("IEND"))).toBeGreaterThan(0);
    expect(findImageMetadata(result.bytes)).toEqual([]);
  });

  it("drops a private chunk nobody allowlisted, rather than passing it through", () => {
    // The allowlist is the point: a deny-list would carry `stEG` straight into storage.
    const smuggler = bytes(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      pngChunk("IHDR", bytes(uint32BE(1), uint32BE(1), 0x08, 0x02, 0x00, 0x00, 0x00)),
      pngChunk("stEG", bytes("37.4251,-122.0841")),
      pngChunk("IDAT", PNG_IDAT),
      pngChunk("IEND", new Uint8Array()),
    );
    const result = stripImageMetadata(smuggler);
    expect(indexOfBytes(result.bytes, bytes("37.4251"))).toBe(-1);
    expect(result.removed.map((segment) => segment.where)).toEqual(["PNG stEG"]);
  });

  it("throws when the chunk stream is truncated or has no IEND", () => {
    expect(() => stripImageMetadata(input.subarray(0, 30))).toThrow(ImageHygieneError);
  });
});

describe("WebP", () => {
  const input = webpWithMetadata();

  it("removes EXIF, XMP and ICCP", () => {
    expect(indexOfBytes(input, GPS_LATITUDE_BYTES)).toBeGreaterThan(0);
    const result = stripImageMetadata(input);

    expect(indexOfBytes(result.bytes, GPS_LATITUDE_BYTES)).toBe(-1);
    expect(indexOfBytes(result.bytes, bytes("xmpmeta"))).toBe(-1);
    expect(result.removed.map((segment) => `${segment.where}:${segment.kind}`)).toEqual([
      "WebP EXIF:exif",
      "WebP XMP :xmp",
      "WebP ICCP:icc",
    ]);
    expect(indexOfBytes(result.bytes, WEBP_VP8)).toBeGreaterThan(0);
  });

  it("rewrites the RIFF size so the container is not left describing bytes that are gone", () => {
    const result = stripImageMetadata(input);
    const declared =
      (result.bytes[4] ?? 0) |
      ((result.bytes[5] ?? 0) << 8) |
      ((result.bytes[6] ?? 0) << 16) |
      ((result.bytes[7] ?? 0) << 24);
    expect(declared).toBe(result.bytes.length - 8);
  });

  it("clears the VP8X flags that advertised the removed chunks", () => {
    const result = stripImageMetadata(input);
    const vp8xAt = indexOfBytes(result.bytes, bytes("VP8X"));
    expect(vp8xAt).toBeGreaterThan(0);
    const flags = result.bytes[vp8xAt + 8] ?? 0;
    // ICC (0x20), EXIF (0x08), XMP (0x04) off; the alpha flag (0x04 is XMP, 0x10 alpha) and
    // everything else untouched — the fixture set 0x2c, so 0x00 is what must remain.
    expect(flags & (0x20 | 0x08 | 0x04)).toBe(0);
    expect(findImageMetadata(result.bytes)).toEqual([]);
  });
});

describe("stripImageMetadata refuses what it cannot verify", () => {
  it("throws for a non-image, so nothing unverified can be stored", () => {
    expect(() => stripImageMetadata(bytes("%PDF-1.7\n"))).toThrow(
      /not a JPEG, PNG or WebP/,
    );
  });

  it("leaves an already-clean image untouched", () => {
    const clean = bytes(
      0xff,
      0xd8,
      jpegSegment(0xdb, bytes(0x00, 0x10)),
      jpegSegment(0xda, bytes(0x01, 0x01, 0x00)),
      JPEG_SCAN,
      0xff,
      0xd9,
    );
    const result = stripImageMetadata(clean);
    expect(result.removed).toEqual([]);
    expect([...result.bytes]).toEqual([...clean]);
  });
});
