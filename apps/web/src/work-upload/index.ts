/**
 * Photo-of-work upload. Public surface for the lane: v1 photo CAPTURE + STORE, and the v2
 * READING, which is feedback-only and presented provisionally. See `README.md` for the
 * scope, the two invariants and what each half needs from a deployment.
 */

export { createPresignedWorkUploadStore, parseStoredWorkUpload } from "./api";
export { type PreparedUpload, prepareForUpload } from "./imageIngest";
export {
  createHttpWorkParseClient,
  createStubWorkParseClient,
  createWorkParseClient,
  getWorkParseClient,
  type HttpWorkParseClientOptions,
} from "./parseClient";
export {
  isWorkParse,
  type WorkParse,
  type WorkParseClient,
  type WorkParseFailureReason,
  type WorkParseOutcome,
  type WorkParseUnavailable,
} from "./parseTypes";
export { WorkParseCard, type WorkParseCardProps } from "./WorkParseCard";
export {
  type CompleteFn,
  type CompleteRequest,
  PresignedWorkUploadStore,
  type PresignedWorkUploadStoreOptions,
  type PresignFn,
  type PresignRequest,
  type PresignResult,
  type PutBlobFn,
  QR_FAST_FOLLOW_NOTE,
  requestPhonePairing,
} from "./presigned";
export {
  createWorkUploadStore,
  getWorkUploadStore,
  InMemoryWorkUploadStore,
} from "./store";
export type {
  DiagnosticReviewWorkUploadAssociation,
  LessonWorkUploadAssociation,
  StoredWorkUpload,
  WorkUploadAssociation,
  WorkUploadListFilter,
  WorkUploadOptions,
  WorkUploadProgress,
  WorkUploadProgressStage,
  WorkUploadRejectionReason,
  WorkUploadStatus,
  WorkUploadStore,
} from "./types";
export { WorkUploadError } from "./types";
export {
  ACCEPTED_IMAGE_DESCRIPTION,
  formatBytes,
  MAX_UPLOAD_BYTES,
  validateImageFile,
} from "./validation";
export { WorkUpload, type WorkUploadProps } from "./WorkUpload";
export { WorkChecker, type WorkCheckerProps } from "./WorkChecker";
