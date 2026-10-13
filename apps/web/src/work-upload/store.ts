/**
 * The storage seam: an in-memory store for the local/CI loop, and the real presigned store
 * when there is a server to talk to.
 *
 * The in-memory store is not a placeholder for a missing backend any more — the backend
 * landed (doc §4's four MUST-ADDs: the presign + confirm + list + delete routes, the private
 * uploads bucket, and the `work_upload` table). It is what the dev and CI loop legitimately
 * gets, because that loop has no server at all (`apps/web/src/api.ts` `isServerBacked`): a
 * captured photo is validated, held for the session as a `blob:` object URL so the student
 * can see their own preview, and is fully inert.
 *
 * `createWorkUploadStore` is the only place that decides between them, and the
 * `WorkUploadStore` contract is identical either way, so no call site knows which it has.
 *
 * STORE-ONLY INVARIANT: this module imports nothing from the grading path and exposes
 * no scoring surface (see `types.ts`, `workUploadInvariant.browser.test.tsx`, and
 * `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts`, which sweeps the backend too).
 */

import { isServerBacked } from "../api";
import { createPresignedWorkUploadStore } from "./api";
import type {
  StoredWorkUpload,
  WorkUploadAssociation,
  WorkUploadListFilter,
  WorkUploadOptions,
  WorkUploadStore,
} from "./types";
import { WorkUploadError } from "./types";
import { validateImageFile } from "./validation";

/** Best-effort `blob:` URL creation; returns undefined where the API is unavailable. */
function createObjectUrlSafe(blob: Blob): string | undefined {
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(blob);
  }
  return undefined;
}

function revokeObjectUrlSafe(url: string): void {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

/** Build a synthetic key mirroring the eventual student-scoped S3 key shape (doc §4). */
function devObjectKey(association: WorkUploadAssociation, id: string): string {
  const anchor =
    association.surface === "diagnostic-review"
      ? `${association.administration_id}/${association.item_version_id}`
      : `${association.node_id}/${association.item_version_id}`;
  return `work-uploads/dev-local/${association.surface}/${anchor}/${id}`;
}

function matchesFilter(record: StoredWorkUpload, filter: WorkUploadListFilter): boolean {
  const { association } = record;
  if (filter.item_version_id && association.item_version_id !== filter.item_version_id) {
    return false;
  }
  if (
    filter.node_id &&
    !(association.surface !== "diagnostic-review" && association.node_id === filter.node_id)
  ) {
    return false;
  }
  if (
    filter.administration_id &&
    !(
      association.surface === "diagnostic-review" &&
      association.administration_id === filter.administration_id
    )
  ) {
    return false;
  }
  return true;
}

/**
 * The dev/CI/demo store. Holds the artifact Blob + a `blob:` preview URL in memory for
 * the session; nothing is persisted and nothing leaves the page.
 */
export class InMemoryWorkUploadStore implements WorkUploadStore {
  private readonly records = new Map<string, StoredWorkUpload>();
  private readonly blobs = new Map<string, Blob>();

  async upload(
    file: File,
    association: WorkUploadAssociation,
    options?: WorkUploadOptions,
  ): Promise<StoredWorkUpload> {
    const check = validateImageFile(file);
    if (!check.ok) {
      throw new WorkUploadError(check.reason, check.message);
    }
    options?.onProgress?.({
      stage: "preparing",
      percent: 25,
      message: "Preparing the private preview…",
    });
    const id = crypto.randomUUID();
    const record: StoredWorkUpload = {
      id,
      association,
      contentType: file.type,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      objectKey: devObjectKey(association, id),
      previewUrl: createObjectUrlSafe(file),
      status: "stored",
    };
    this.records.set(id, record);
    this.blobs.set(id, file);
    options?.onProgress?.({
      stage: "finishing",
      percent: 90,
      message: "Finishing the save…",
    });
    return record;
  }

  async remove(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record?.previewUrl) {
      revokeObjectUrlSafe(record.previewUrl);
    }
    this.records.delete(id);
    this.blobs.delete(id);
  }

  async list(filter?: WorkUploadListFilter): Promise<readonly StoredWorkUpload[]> {
    const all = [...this.records.values()];
    return filter ? all.filter((record) => matchesFilter(record, filter)) : all;
  }

  /** Dev-only: the raw Blob behind an upload (a real reviewer surface would use a presigned GET). */
  getBlob(id: string): Blob | undefined {
    return this.blobs.get(id);
  }
}

/**
 * Whether Cognito is configured, read from the same two variables
 * `auth/cognitoClient.ts`'s `getUserPool()` reads.
 *
 * Asked here rather than imported so that the Cognito SDK stays out of the lesson chunk: this
 * factory is reached from `LessonPractice`, and `amazon-cognito-identity-js` is several tens of
 * kilobytes that a learner who never uploads a photo should not download. `api.ts` reaches the
 * real client through a dynamic `import()` for the same reason, and only when a token is
 * actually needed.
 */
function isCognitoConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_COGNITO_USER_POOL_ID && import.meta.env.VITE_COGNITO_CLIENT_ID,
  );
}

/**
 * Build the store for the current environment — the one decision point.
 *
 * SERVER-BACKED means both halves of the shared gate: a configured API
 * (`VITE_DIAGNOSTIC_API_URL`) and configured Cognito, exactly as `isServerBacked` defines it
 * for the diagnostic client and the city seed. Both, because a photo belongs to a verified
 * `sub`: an API with no auth could only ever answer 401, and auth with no API has nowhere to
 * put the bytes.
 *
 * When that gate is open the presigned store is returned even for a learner who is not signed
 * in *yet* — it asks for a token per upload and refuses with `signed_out` if there is none.
 * The alternative (quietly handing back the in-memory stub) would tell a student their work was
 * saved into a tab they are about to close.
 *
 * The presigned store is loaded through a deferred require-style import inside
 * `createPresignedWorkUploadStore`, so the dev/CI path costs nothing.
 */
export function createWorkUploadStore(): WorkUploadStore {
  if (!isServerBacked(isCognitoConfigured())) {
    return new InMemoryWorkUploadStore();
  }
  return createPresignedWorkUploadStore();
}

let singleton: WorkUploadStore | null = null;

/** The process-wide default store (one dev store shared across the session's uploads). */
export function getWorkUploadStore(): WorkUploadStore {
  if (singleton === null) {
    singleton = createWorkUploadStore();
  }
  return singleton;
}
