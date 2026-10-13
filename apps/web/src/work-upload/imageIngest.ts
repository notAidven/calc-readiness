/**
 * Client-side ingest preparation: make a captured photo safe to upload BEFORE it leaves the
 * device.
 *
 * `docs/Photo_Work_Upload_Scope.md` §6 requires EXIF/geolocation to be stripped on ingest. The
 * service strips again when it indexes the object (`services/diagnostic-api/src/workUpload.ts`
 * `complete`) and that copy is the enforced one — but the enforced copy runs *after* the bytes
 * are already in the bucket, and a student who closes the tab between the PUT and the confirm
 * would leave an unstripped photograph sitting there until the retention rule expires it.
 *
 * So this runs first, and it is what makes the strong version of the claim true: **a photo's
 * GPS coordinates never leave the phone at all.**
 *
 * ## Two paths, because a phone does not always hand over a JPEG
 *
 *  - **JPEG / PNG / WebP** — rewritten losslessly by `@cr/image-hygiene`. The picture is
 *    copied byte for byte; only the metadata containers go.
 *  - **Anything else the browser can decode** — HEIC/HEIF above all, which is an iPhone's
 *    native format and which our stripper deliberately cannot rewrite (its metadata lives in
 *    ISOBMFF boxes; rewriting those needs a real container parser). Rather than refuse an
 *    iPhone photo, it is TRANSCODED to JPEG through a canvas, which drops every metadata box
 *    as a side effect of re-encoding pixels — and then stripped anyway, so the JFIF block the
 *    encoder adds goes too and the output is uniform whichever path produced it.
 *
 * A file the browser cannot decode either is rejected. That is the honest outcome: we will not
 * upload bytes we cannot verify, and the service would refuse them at ingest regardless.
 */

import {
  imageContentType,
  type MetadataSegment,
  sniffImageFormat,
  stripImageMetadata,
} from "@cr/image-hygiene";

import { WorkUploadError } from "./types";
import { formatBytes, MAX_UPLOAD_BYTES } from "./validation";

/** JPEG quality for the transcode path. High enough that pencil on paper stays legible. */
const TRANSCODE_QUALITY = 0.92;

export interface PreparedUpload {
  /** What to PUT: metadata-free bytes. */
  readonly blob: Blob;
  /** The content type of `blob`, which the presign request must declare. */
  readonly contentType: string;
  /** What was removed, for the caller to report or assert on. */
  readonly removed: readonly MetadataSegment[];
  /** True when the original had to be re-encoded (a HEIC capture, say). */
  readonly transcoded: boolean;
}

/** Re-encode through a canvas, which is what erases an unrewritable container's metadata. */
async function transcodeToJpeg(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") {
    throw new WorkUploadError(
      "not_an_image",
      "This device can't prepare that photo. Try a JPEG or PNG.",
    );
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // A format this browser cannot decode (a HEIC on desktop Chrome, a corrupt file). We do
    // not upload bytes we cannot verify.
    throw new WorkUploadError(
      "not_an_image",
      "We couldn't read that photo. Try taking it again, or choose a JPEG or PNG.",
    );
  }
  try {
    const { width, height } = bitmap;
    // Full resolution: the point of the photo is legible handwriting, so nothing is downscaled
    // here. The size cap below is what bounds it.
    if (typeof OffscreenCanvas === "function") {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("no 2d context");
      }
      context.drawImage(bitmap, 0, 0);
      return await canvas.convertToBlob({ type: "image/jpeg", quality: TRANSCODE_QUALITY });
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("no 2d context");
    }
    context.drawImage(bitmap, 0, 0);
    const encoded = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", TRANSCODE_QUALITY);
    });
    if (!encoded) {
      throw new Error("toBlob produced nothing");
    }
    return encoded;
  } finally {
    bitmap.close();
  }
}

/**
 * Strip (or transcode-then-strip) a captured file, and hold the result to the size cap.
 *
 * The cap is re-checked here because the transcode path changes the size: a 9 MB HEIC can
 * re-encode larger, and the presign request must declare a size the route will accept.
 */
export async function prepareForUpload(
  file: File,
  maxBytes = MAX_UPLOAD_BYTES,
): Promise<PreparedUpload> {
  const original = new Uint8Array(await file.arrayBuffer());
  const known = sniffImageFormat(original);
  const transcoded = known === null;
  const source = transcoded
    ? new Uint8Array(await (await transcodeToJpeg(file)).arrayBuffer())
    : original;
  // Strip whichever bytes we ended up with. On the transcode path this usually only finds the
  // encoder's own JFIF block, and running it anyway is what makes the output uniform.
  const hygiene = stripImageMetadata(source);
  if (hygiene.bytes.length > maxBytes) {
    throw new WorkUploadError(
      "too_large",
      `That photo is too large (max ${formatBytes(maxBytes)}). Try a smaller one.`,
    );
  }
  const contentType = imageContentType(hygiene.format);
  return {
    // The cast is TypeScript's, not a runtime concern: `BlobPart` wants
    // `ArrayBufferView<ArrayBuffer>` and a `Uint8Array<ArrayBufferLike>` is not assignable to
    // it (its buffer could in principle be a `SharedArrayBuffer`). Copying the bytes to satisfy
    // the type would mean a second 10 MB allocation per photo.
    blob: new Blob([hygiene.bytes as unknown as BlobPart], { type: contentType }),
    contentType,
    removed: hygiene.removed,
    transcoded,
  };
}
