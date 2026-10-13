/**
 * WorkUpload — the self-contained, droppable "add a photo of your work" affordance.
 *
 * Photo CAPTURE + STORE-ONLY (doc §3 Option A, the recommended first slice): a direct
 * device capture / file input (`accept="image/*" capture="environment"` opens the rear
 * camera on a phone, a normal picker on desktop) plus drag-and-drop, a preview, remove,
 * and upload status. It is deliberately additive and INERT: it takes only an
 * `association` + a `WorkUploadStore`, has no access to the lesson session, the checker,
 * or the mastery service, and hands back only a `StoredWorkUpload`. There is no path
 * from here to grading (doc §1/§7 store-only invariant).
 *
 * QR desktop→phone hand-off (doc §3 Option B) is a documented fast-follow, stubbed in
 * `presigned.ts` (`requestPhonePairing`) — not part of the v1 component.
 */

import { type DragEvent, useEffect, useId, useRef, useState } from "react";

import { getWorkUploadStore } from "./store";
import type {
  StoredWorkUpload,
  WorkUploadAssociation,
  WorkUploadProgress,
  WorkUploadStore,
} from "./types";
import { WorkUploadError } from "./types";
import { formatBytes, MAX_UPLOAD_BYTES, validateImageFile } from "./validation";
import "./work-upload.css";

type Phase = "idle" | "selected" | "uploading" | "uploaded" | "deleting" | "error";

export interface WorkUploadProps {
  /** What the photo is anchored to (a wrong-answer / review moment). */
  readonly association: WorkUploadAssociation;
  /** Storage seam. Defaults to the process-wide dev store. */
  readonly store?: WorkUploadStore;
  /** Max accepted file size in bytes. */
  readonly maxBytes?: number;
  /** Heading / affordance label. */
  readonly heading?: string;
  /** Notified with the stored record (metadata only — never a score). */
  readonly onUploaded?: (record: StoredWorkUpload) => void;
  /** Notified after an upload is removed. */
  readonly onRemoved?: (id: string) => void;
  readonly className?: string;
}

function CameraIcon() {
  return (
    <svg
      className="work-upload__icon"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 16 h7 l3 -4 h16 l3 4 h7 v22 h-36 z" />
      <circle cx={24} cy={27} r={7} />
    </svg>
  );
}

function statusFor(phase: Phase, message: string | null): string {
  switch (phase) {
    case "selected":
      return "Ready to save. Check your photo, then save it for review.";
    case "uploading":
      return message ?? "Saving your photo…";
    case "uploaded":
      return message ?? "Saved for review. This never affects your score or mastery.";
    case "deleting":
      return "Deleting the saved photo and its automated reading…";
    case "error":
      return message ?? "Something went wrong. Please try again.";
    default:
      return "Photos are private and stored for review only, and never graded.";
  }
}

function safeUploadError(error: WorkUploadError): string {
  switch (error.reason) {
    case "signed_out":
    case "auth":
      return "Your sign-in has expired. Sign in again, then try this photo once more.";
    case "signature":
      return "The secure upload link was refused. Choose the photo again to get a fresh link.";
    case "upload":
      return "The photo upload did not finish. Your lesson is safe; try saving the photo again.";
    case "delete":
      return "We couldn't delete the saved photo. It is still private; try delete again.";
    default:
      // These three are local validation messages authored by this module, not wire text.
      return error.message;
  }
}

export function WorkUpload({
  association,
  store,
  maxBytes = MAX_UPLOAD_BYTES,
  heading = "Add a photo of your work",
  onUploaded,
  onRemoved,
  className,
}: WorkUploadProps) {
  const activeStore = store ?? getWorkUploadStore();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [record, setRecord] = useState<StoredWorkUpload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<WorkUploadProgress | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  // Revoke the local preview object URL when it is replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function resetToIdle() {
    setPreviewUrl(null);
    setSelectedFile(null);
    setRecord(null);
    setMessage(null);
    setProgress(null);
    setDeleteFailed(false);
    setPhase("idle");
    clearInput();
  }

  function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const check = validateImageFile(file, { maxBytes });
    if (!check.ok) {
      setMessage(check.message);
      setPhase("error");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
    setMessage(null);
    setProgress(null);
    setDeleteFailed(false);
    setPhase("selected");
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }
    setPhase("uploading");
    setMessage(null);
    setDeleteFailed(false);
    try {
      const stored = await activeStore.upload(selectedFile, association, {
        onProgress: (next) => {
          setProgress(next);
          setMessage(next.message);
        },
      });
      setRecord(stored);
      setProgress(null);
      setMessage(null);
      setPhase("uploaded");
      onUploaded?.(stored);
    } catch (error) {
      setMessage(
        error instanceof WorkUploadError
          ? safeUploadError(error)
          : "Choose the photo again to save it for review. Nothing was stored this time.",
      );
      setProgress(null);
      setPhase("error");
    }
  }

  async function handleRemove() {
    const id = record?.id;
    if (id) {
      setPhase("deleting");
      setMessage(null);
      try {
        await activeStore.remove(id);
      } catch {
        // Never clear the UI and imply deletion when the private object may still exist.
        setDeleteFailed(true);
        setMessage(
          "We couldn't delete the saved photo. It is still private; try delete again.",
        );
        setPhase("uploaded");
        return;
      }
      onRemoved?.(id);
    }
    resetToIdle();
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  const showPicker = phase === "idle" || phase === "error";
  const showPreview = previewUrl !== null && phase !== "idle" && phase !== "error";

  return (
    <section
      className={`work-upload${className ? ` ${className}` : ""}`}
      data-phase={phase}
      aria-label={heading}
      aria-describedby={statusId}
    >
      <div className="work-upload__head">
        <span className="work-upload__title">{heading}</span>
        <span className="work-upload__optional">Optional</span>
      </div>
      <p className="work-upload__blurb">
        Photograph the paper, not yourself. Keep faces, names, and surroundings out of
        frame. We remove location metadata before saving it privately for review. It never
        changes your score.
      </p>

      {showPicker && (
        <button
          type="button"
          className="work-upload__dropzone"
          data-dragging={dragging}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <CameraIcon />
          <span className="work-upload__dropzone-primary">Take or choose a photo</span>
          <span className="work-upload__dropzone-secondary">or drag an image here</span>
        </button>
      )}

      <input
        ref={inputRef}
        className="work-upload__input"
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={heading}
        tabIndex={-1}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {showPreview && previewUrl && (
        <div className="work-upload__preview">
          <img className="work-upload__thumb" src={previewUrl} alt="The work you added" />
          <div className="work-upload__preview-meta">
            <span className="work-upload__filename">{selectedFile?.name || "photo"}</span>
            {selectedFile && (
              <span className="work-upload__filesize">
                {formatBytes(selectedFile.size)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="work-upload__actions">
        {phase === "selected" && (
          <button
            type="button"
            className="work-upload__btn work-upload__btn--primary"
            onClick={handleUpload}
          >
            Save for review
          </button>
        )}
        {phase === "uploading" && (
          <button type="button" className="work-upload__btn" disabled>
            Saving…
          </button>
        )}
        {phase === "deleting" && (
          <button type="button" className="work-upload__btn" disabled>
            Deleting…
          </button>
        )}
        {(phase === "selected" ||
          phase === "uploading" ||
          phase === "uploaded" ||
          phase === "deleting") && (
          <button
            type="button"
            className="work-upload__btn work-upload__btn--ghost"
            onClick={handleRemove}
            disabled={phase === "uploading" || phase === "deleting"}
          >
            {record ? (deleteFailed ? "Try delete again" : "Delete photo") : "Remove"}
          </button>
        )}
      </div>

      {phase === "uploading" && progress && (
        <div
          className="work-upload__progress"
          role="progressbar"
          aria-label="Photo upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-valuetext={progress.message}
        >
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      )}

      <p
        className="work-upload__status"
        id={statusId}
        data-status={phase}
        aria-live="polite"
        aria-atomic="true"
      >
        {statusFor(phase, message)}
      </p>
    </section>
  );
}
