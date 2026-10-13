/**
 * Presigned-S3 storage store — the CLIENT half, now wired to a backend that exists.
 *
 * `store.ts`'s factory returns this when the session is server-backed (a configured
 * `VITE_DIAGNOSTIC_API_URL` and Cognito); the in-memory stub remains the store for the local
 * and CI loop, where there is no server at all. The `WorkUploadStore` contract is unchanged,
 * so no call site knows which one it has.
 *
 * ## The three steps, and why there are three
 *
 *  1. **strip, then presign.** `prepareForUpload` removes EXIF/GPS (or transcodes an
 *    unrewritable capture to JPEG and removes it from that) BEFORE anything is sent, so a
 *    photo's coordinates never leave the device. The presign request declares the STRIPPED
 *    size and type, because those are what will actually be PUT.
 *  2. **PUT to the presigned URL.** Straight to the private bucket. A 10 MB photo never
 *    travels through the API.
 *  3. **confirm.** `POST /api/work-upload/complete`, which is where the server reads the
 *    object back, verifies it really is an image, strips it again — the enforced copy — and
 *    writes the `work_upload` row. **Until this call returns, nothing is indexed**, so the
 *    record this store hands back is the one the server stored rather than one built here.
 *
 * A photo the student abandons between (2) and (3) is an unindexed object the bucket's
 * lifecycle rule expires, and (thanks to step 1) it carries no location either way.
 *
 * ## Option B (QR desktop→phone) is still a stub
 *
 * `requestPhonePairing` throws with the reason. It needs a pairing-token service and a
 * login-less mobile upload page — an UNAUTHENTICATED write, which doc §6 calls the sharp edge
 * — and none of that is built. Nothing in this file is a step toward it.
 */

import { prepareForUpload } from "./imageIngest";
import type {
  StoredWorkUpload,
  WorkUploadAssociation,
  WorkUploadListFilter,
  WorkUploadOptions,
  WorkUploadStore,
} from "./types";
import { WorkUploadError } from "./types";
import { validateImageFile } from "./validation";

/** What the client sends to `POST /api/work-upload` to request a presigned PUT. */
export interface PresignRequest {
  readonly association: WorkUploadAssociation;
  readonly contentType: string;
  readonly sizeBytes: number;
}

/** What the presign route returns. `student_id` is derived server-side, never sent. */
export interface PresignResult {
  readonly uploadUrl: string;
  readonly objectKey: string;
  /** The id the route minted; the confirm step is keyed by it. */
  readonly uploadId: string;
  /** The type the URL was SIGNED for — the PUT must send exactly this. */
  readonly contentType: string;
}

/** What the confirm step sends to `POST /api/work-upload/complete`. */
export interface CompleteRequest {
  readonly uploadId: string;
  readonly association: WorkUploadAssociation;
  readonly contentType: string;
}

/** Mint a presigned PUT (backed by `POST /api/work-upload`). Injected for testability. */
export type PresignFn = (
  request: PresignRequest,
  token: string | null,
) => Promise<PresignResult>;

/** Index the uploaded object (backed by `POST /api/work-upload/complete`). */
export type CompleteFn = (
  request: CompleteRequest,
  token: string | null,
) => Promise<StoredWorkUpload>;

/** PUT the bytes to the presigned URL. Injected so tests avoid the network. */
export type PutBlobFn = (
  uploadUrl: string,
  blob: Blob,
  contentType: string,
) => Promise<void>;

export interface PresignedWorkUploadStoreOptions {
  readonly presign: PresignFn;
  /** Confirm + index. Without it nothing is stored, so it is not optional. */
  readonly complete: CompleteFn;
  /** Resolve the current Cognito access token (e.g. `getAccessToken` from the auth client). */
  readonly getToken: () => Promise<string | null>;
  /** Defaults to a plain `fetch` PUT. */
  readonly putBlob?: PutBlobFn;
  /** List the owner's uploads (backed by `GET /api/work-upload`). */
  readonly listRemote: (
    filter: WorkUploadListFilter | undefined,
    token: string | null,
  ) => Promise<readonly StoredWorkUpload[]>;
  /** Delete an upload (object + metadata row), backed by `DELETE /api/work-upload`. */
  readonly deleteRemote: (id: string, token: string | null) => Promise<void>;
  /** Max accepted size; mirrors the route's own cap. */
  readonly maxBytes?: number;
}

/** Default PUT: stream the blob to S3 via the presigned URL. */
async function defaultPutBlob(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: blob,
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new WorkUploadError(
        "signature",
        "The secure upload link was refused. Choose the photo again to get a fresh link.",
      );
    }
    throw new WorkUploadError(
      "upload",
      "The photo upload did not finish. Your lesson is safe; try saving the photo again.",
    );
  }
}

/**
 * Fully authenticated, private-by-default store (doc §6 "Private by default"). The browser
 * never touches S3 or the DB directly: it holds a short-lived URL for one object, minted for
 * its own `student_id`.
 */
export class PresignedWorkUploadStore implements WorkUploadStore {
  private readonly options: PresignedWorkUploadStoreOptions;

  constructor(options: PresignedWorkUploadStoreOptions) {
    this.options = options;
  }

  async upload(
    file: File,
    association: WorkUploadAssociation,
    progressOptions?: WorkUploadOptions,
  ): Promise<StoredWorkUpload> {
    const check = validateImageFile(file, { maxBytes: this.options.maxBytes });
    if (!check.ok) {
      throw new WorkUploadError(check.reason, check.message);
    }
    const progress = progressOptions?.onProgress;
    try {
      progress?.({
        stage: "preparing",
        percent: 15,
        message: "Removing location details from the photo…",
      });
      // STRIP FIRST. Everything after this point handles metadata-free bytes.
      const prepared = await prepareForUpload(file, this.options.maxBytes);
      progress?.({
        stage: "authorizing",
        percent: 35,
        message: "Creating a private upload link…",
      });
      const token = await this.options.getToken();
      if (token === null) {
        throw new WorkUploadError(
          "signed_out",
          "Your sign-in has expired. Sign in again, then choose the photo once more.",
        );
      }
      const presigned = await this.options.presign(
        {
          association,
          contentType: prepared.contentType,
          sizeBytes: prepared.blob.size,
        },
        token,
      );
      progress?.({
        stage: "uploading",
        percent: 65,
        message: "Uploading the private photo…",
      });
      const put = this.options.putBlob ?? defaultPutBlob;
      // The type the URL was signed for, not the one we asked for: it is inside the signature.
      await put(presigned.uploadUrl, prepared.blob, presigned.contentType);
      progress?.({
        stage: "finishing",
        percent: 90,
        message: "Checking and saving the cleaned photo…",
      });
      // The record comes back from the server, so what the student sees is what was stored.
      return await this.options.complete(
        {
          uploadId: presigned.uploadId,
          association,
          contentType: presigned.contentType,
        },
        token,
      );
    } catch (error) {
      if (error instanceof WorkUploadError) {
        throw error;
      }
      throw new WorkUploadError(
        "upload",
        "The photo upload did not finish. Your lesson is safe; try saving the photo again.",
      );
    }
  }

  async remove(id: string): Promise<void> {
    await this.options.deleteRemote(id, await this.options.getToken());
  }

  async list(filter?: WorkUploadListFilter): Promise<readonly StoredWorkUpload[]> {
    return this.options.listRemote(filter, await this.options.getToken());
  }
}

/**
 * QR desktop→phone hand-off (doc §3 Option B) — the recommended FAST-FOLLOW, not v1.
 *
 * STUBBED ON PURPOSE, and still stubbed now that the authenticated backend exists. Option B is
 * materially more surface: a pairing-token service (`POST /api/work-upload/pair`), a login-less
 * mobile upload page (`POST /api/work-upload/mobile`, an UNAUTHENTICATED write), desktop
 * polling, and the security a login-less write implies — short-lived single-use tokens bound to
 * the desktop session + student, rate limits, size/type caps (doc §6 "the sharp edge"). None of
 * that exists, so this throws rather than pretending to pair.
 */
export const QR_FAST_FOLLOW_NOTE =
  "Send-from-phone (QR) is a documented fast-follow (doc §3 Option B). It needs a " +
  "pairing endpoint + login-less mobile upload page, which are not built in v1.";

export function requestPhonePairing(): never {
  throw new Error(QR_FAST_FOLLOW_NOTE);
}
