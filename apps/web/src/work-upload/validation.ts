/**
 * Client-side ingest validation for photo-of-work uploads.
 *
 * Data-minimization on ingest (doc §6): accept `image/*` only and cap the size. This
 * is a friendly first gate, not a security boundary — the real presign Lambda MUST
 * re-check type + size server-side (and strip EXIF/geolocation) before storing.
 */

import type { WorkUploadRejectionReason } from "./types";

/** Hard cap on a single upload. Cameras produce large files; 10 MB is generous for a page of work. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Human-readable description of what we accept, for UI copy. */
export const ACCEPTED_IMAGE_DESCRIPTION = "a photo (JPEG, PNG, HEIC, or WebP)";

export type ImageValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: WorkUploadRejectionReason;
      readonly message: string;
    };

export interface ImageValidationOptions {
  readonly maxBytes?: number;
}

/**
 * Validate a candidate file. Returns a friendly, student-facing message on rejection
 * (never gates progress — uploading is always optional, doc §6).
 */
export function validateImageFile(
  file: File,
  options: ImageValidationOptions = {},
): ImageValidationResult {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;

  if (!file || file.size === 0) {
    return {
      ok: false,
      reason: "empty",
      message: "That file looks empty. Try taking the photo again.",
    };
  }

  // Accept any image subtype (image/jpeg, image/png, image/heic, …) — the doc's
  // "image/* only" rule. A phone camera capture always lands here.
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      reason: "not_an_image",
      message: `Please choose ${ACCEPTED_IMAGE_DESCRIPTION}.`,
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: "too_large",
      message: `That photo is too large (max ${formatBytes(maxBytes)}). Try a smaller one.`,
    };
  }

  return { ok: true };
}

/** Compact byte formatter for UI copy (e.g. "10 MB", "512 KB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
