/**
 * Photo-of-work upload — shared types for the v1 STORE-ONLY seam.
 *
 * Source of truth: `docs/Photo_Work_Upload_Scope.md` (v0.2). v1 is photo CAPTURE +
 * STORE-ONLY: an uploaded image is attached to a wrong-answer / review moment for
 * later human review and is deliberately **one-way and inert**.
 *
 * LOAD-BEARING INVARIANT (doc §1, §3.5, §7): a work-upload is NEVER an input to
 * mastery, placement, or the pre/post metric. That is enforced structurally here —
 * nothing in this type surface carries a score, a correctness verdict, or a mastery
 * value, and no method returns one. The whole `work-upload` module deliberately
 * imports nothing from the grading path (`@cr/mastery-service`, `@cr/scorer`, the
 * answer checkers); see `workUploadInvariant.test.ts`.
 */

/**
 * What a captured photo is anchored to, so it can be found again for review. All of
 * this is already in hand at the lesson hook points (doc §5). The owning student is
 * intentionally NOT here: the real backend derives `student_id` from the verified
 * Cognito JWT `sub` server-side (doc §4/§6), never from client-supplied input.
 */
export type WorkUploadAssociation =
  | LessonWorkUploadAssociation
  | DiagnosticReviewWorkUploadAssociation;

/** A miss (or given-up/revealed slot) inside lesson practice or the end-of-lesson CFU. */
export interface LessonWorkUploadAssociation {
  readonly surface: "lesson-practice" | "lesson-cfu";
  readonly node_id: string;
  readonly item_version_id: string;
  /** Optional generator provenance (doc §5) — helps a reviewer reproduce the item. */
  readonly template_id?: string;
  /** Optional practice-set / attempt anchor. */
  readonly attempt_id?: string;
}

/**
 * A POST-diagnostic review upload (doc §2/§5). The diagnostic itself is deliberately
 * NOT an in-the-moment attach point (anxiety-sensitive, no mid-test grades), so this
 * is only ever used from a post-test review surface — none is wired in v1.
 */
export interface DiagnosticReviewWorkUploadAssociation {
  readonly surface: "diagnostic-review";
  readonly administration_id: string;
  readonly item_version_id: string;
}

/** Where an upload is in its lifecycle, from the student's point of view. */
export type WorkUploadStatus = "stored" | "uploaded";

/**
 * A stored work-upload record. Note what is ABSENT and must stay absent: no
 * `mastery`, no `score`, no `correct` / `client_correct`, no `placement`. The record
 * is metadata about an artifact held for review — never an assessment signal.
 */
export interface StoredWorkUpload {
  readonly id: string;
  readonly association: WorkUploadAssociation;
  readonly contentType: string;
  readonly sizeBytes: number;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /**
   * The storage key. For the dev/in-memory stub this is a synthetic path that mirrors
   * the eventual student-scoped S3 key shape; for the presigned backend it is the real
   * private object key. Access is always server-mediated — never a public URL.
   */
  readonly objectKey: string;
  /**
   * A short-lived, viewable URL for the artifact, when one is available. For the
   * in-memory stub this is a `blob:` object URL (in-page only, this session); for the
   * presigned backend it would be a short-lived presigned GET minted for the owner.
   */
  readonly previewUrl?: string;
  readonly status: WorkUploadStatus;
}

/** Narrow a stored-upload list to one association context (dev/reviewer convenience). */
export interface WorkUploadListFilter {
  readonly item_version_id?: string;
  readonly node_id?: string;
  readonly administration_id?: string;
}

/** Coarse, truthful milestones for a fetch-based upload (not invented byte percentages). */
export type WorkUploadProgressStage =
  | "preparing"
  | "authorizing"
  | "uploading"
  | "finishing";

export interface WorkUploadProgress {
  readonly stage: WorkUploadProgressStage;
  readonly percent: number;
  readonly message: string;
}

export interface WorkUploadOptions {
  readonly onProgress?: (progress: WorkUploadProgress) => void;
}

/**
 * The storage seam. v1 ships an in-memory dev implementation; the presigned S3
 * implementation is scaffolded but gated on a backend that does not exist yet (see
 * `presigned.ts` and `README.md`). The interface is intentionally tiny and
 * capture-only: `upload`, `remove`, `list`. There is deliberately NO `grade`,
 * `score`, or `getMastery` — the invariant above is a property of this surface.
 */
export interface WorkUploadStore {
  /** Validate + store a captured image against its association. */
  upload(
    file: File,
    association: WorkUploadAssociation,
    options?: WorkUploadOptions,
  ): Promise<StoredWorkUpload>;
  /** Delete an upload (object + metadata). Student/parent-initiated deletion (doc §6). */
  remove(id: string): Promise<void>;
  /** List the caller's own uploads, optionally scoped to one association. */
  list(filter?: WorkUploadListFilter): Promise<readonly StoredWorkUpload[]>;
}

/**
 * Why a candidate file was rejected before it was ever stored.
 *
 * `signed_out` is the one the presigned store adds: a photo belongs to a student, so with no
 * verified `sub` there is nobody to store it for. It is a rejection rather than a silent
 * fall-back to the in-memory stub on purpose — telling a signed-out learner their work was
 * saved, when it lives in a tab they are about to close, is the one outcome worse than asking
 * them to sign in.
 */
export type WorkUploadRejectionReason =
  | "empty"
  | "not_an_image"
  | "too_large"
  | "signed_out"
  | "auth"
  | "signature"
  | "upload"
  | "delete";

/** A client-side rejection (bad type, too big, empty) — surfaced to the student as copy. */
export class WorkUploadError extends Error {
  readonly reason: WorkUploadRejectionReason;

  constructor(reason: WorkUploadRejectionReason, message: string) {
    super(message);
    this.name = "WorkUploadError";
    this.reason = reason;
  }
}
