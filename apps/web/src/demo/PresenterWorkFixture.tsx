import {
  type DragEvent,
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { WorldScene } from "../city/WorldScene";
import { useFullscreen } from "../fullscreen/useFullscreen";
import { InlineMath } from "../lessons/svgKit";

/**
 * The Presenter Work Checker is a stage fixture, not the learner's upload flow.
 *
 * The demo uses one known photograph of one pinned rectangle-perimeter question. Its picker
 * holds the selected image in one local object URL solely to stage the presentation; no client,
 * persistence, upload store, endpoint or model is reachable from this module. The diagnosis
 * remains authored context for the known photo. The ordinary signed-in upload and parse flow
 * remains in `work-upload/` and `LessonPractice`.
 */
export const DEMO_WORK_QUESTION = "P = 2l + 2w,\\quad P = 58,\\quad l = 18";
const DEMO_WORK_QUESTION_PARTS = ["P = 2l + 2w,", "P = 58,", "l = 18"] as const;
export const DEMO_WORK_TRANSCRIPTION = [
  "P = 2l + 2w",
  "P - 2l = 2w",
  "P - l = w",
  "58 - 18 = w = 40",
] as const;
export const DEMO_WORK_LAST_CORRECT_INDEX = 1;
export const DEMO_WORK_FIRST_ERROR_INDEX = 2;
export const DEMO_WORK_CORRECTION = "w = \\dfrac{P - 2l}{2}";
export const DEMO_WORK_SUBSTITUTION = "w = \\dfrac{58 - 2(18)}{2} = 11";
export const DEMO_WORK_FULL_CORRECTION =
  "w = \\dfrac{P - 2l}{2} = \\dfrac{58 - 2(18)}{2} = 11";
export const DEMO_ANALYSIS_DELAY_MS = 2_000;
const DEMO_MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type DemoPhase = "idle" | "error" | "analyzing" | "result";

interface LocalDemoPhoto {
  readonly name: string;
  readonly size: number;
  readonly url: string;
}

function photoError(file: File): string | null {
  if (file.size === 0) {
    return "That file is empty. Choose a photo again.";
  }
  if (!file.type.startsWith("image/")) {
    return "Choose an image file.";
  }
  if (file.size > DEMO_MAX_PHOTO_BYTES) {
    return "That image is too large. Choose a photo smaller than 10 MB.";
  }
  return null;
}

function DemoUpload({
  error,
  dragging,
  inputRef,
  onFile,
  onDragging,
  onRetry,
}: {
  readonly error: string | null;
  readonly dragging: boolean;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onFile: (file: File | undefined) => void;
  readonly onDragging: (dragging: boolean) => void;
  readonly onRetry: () => void;
}): ReactElement {
  function drop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    onDragging(false);
    onFile(event.dataTransfer.files?.[0]);
  }

  return (
    <section
      className="presenter-work-upload"
      data-testid="presenter-work-upload"
      aria-labelledby="presenter-work-upload-title"
      data-demo-critical="upload"
    >
      <header className="presenter-work-upload__head">
        <p className="presenter-work-photo__eyebrow">Upload your work</p>
        <h3 id="presenter-work-upload-title">Add a clear photo of your solution</h3>
        <p>
          Choose a photo from this device. Make sure the full solution is clear and easy to
          read.
        </p>
        <section className="presenter-work-photo__question" aria-label="Question context">
          <span>Question context</span>
          <div className="presenter-work-photo__question-equation">
            {DEMO_WORK_QUESTION_PARTS.map((part) => (
              <InlineMath
                className="presenter-work-photo__question-term"
                key={part}
                latex={part}
              />
            ))}
          </div>
        </section>
      </header>

      <button
        type="button"
        className="presenter-work-upload__dropzone"
        data-dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          onDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => onDragging(false)}
        onDrop={drop}
      >
        <span className="presenter-work-upload__camera" aria-hidden="true">
          ▣
        </span>
        <strong>Choose or drop a photo</strong>
        <span>JPEG, PNG, HEIC, or WebP · max 10 MB</span>
      </button>
      <input
        ref={inputRef}
        className="presenter-work-upload__input"
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Choose a photo of your work"
        onChange={(event) => onFile(event.currentTarget.files?.[0])}
      />

      {error && (
        <div className="presenter-work-upload__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Try another photo
          </button>
        </div>
      )}
    </section>
  );
}

function DemoAnalyzing({
  photo,
  onReset,
}: {
  readonly photo: LocalDemoPhoto;
  readonly onReset: () => void;
}): ReactElement {
  return (
    <section
      className="presenter-work-analyzing"
      role="status"
      aria-label="Checking your work"
      data-demo-critical="analyzing"
    >
      <div className="presenter-work-analyzing__preview">
        <img src={photo.url} alt="Selected rectangle-perimeter work" />
        <span>
          {photo.name} · {Math.max(1, Math.ceil(photo.size / 1024))} KB
        </span>
      </div>
      <div className="presenter-work-analyzing__copy">
        <p className="presenter-work-result__eyebrow">Work check</p>
        <h3>Checking your work…</h3>
        <p>Reading the steps in your photo.</p>
        <div
          className="presenter-work-analyzing__progress"
          role="progressbar"
          aria-label="Work check progress"
        >
          <span />
        </div>
        <button type="button" onClick={onReset}>
          Choose a different photo
        </button>
      </div>
    </section>
  );
}

function DemoResult({ onAppeal }: { readonly onAppeal: () => void }): ReactElement {
  return (
    <section
      className="presenter-work-result"
      data-testid="presenter-work-result"
      aria-labelledby="presenter-work-result-title"
    >
      <header className="presenter-work-result__head">
        <div>
          <p className="presenter-work-result__eyebrow">Your work check</p>
          <h3 className="presenter-work-result__title" id="presenter-work-result-title">
            The first broken move
          </h3>
        </div>
        <section className="presenter-work-result__question" aria-label="Question context">
          <span>Question</span>
          <div className="presenter-work-result__equation presenter-work-result__question-equation">
            <InlineMath latex={DEMO_WORK_QUESTION} />
          </div>
        </section>
      </header>

      <div className="presenter-work-result__story">
        <section
          className="presenter-work-result__transcript"
          data-key-story="transcription"
          aria-labelledby="presenter-work-transcript-title"
        >
          <h4 id="presenter-work-transcript-title">Steps read from your work</h4>
          <ol>
            {DEMO_WORK_TRANSCRIPTION.map((line, index) => {
              const lastCorrect = index === DEMO_WORK_LAST_CORRECT_INDEX;
              const firstError = index === DEMO_WORK_FIRST_ERROR_INDEX;
              return (
                <li
                  className="presenter-work-result__line"
                  data-state={
                    lastCorrect ? "last-correct" : firstError ? "first-error" : undefined
                  }
                  key={line}
                >
                  <div className="presenter-work-result__equation">
                    <InlineMath latex={line} />
                  </div>
                  {lastCorrect && <strong>Last correct line</strong>}
                  {firstError && <strong>First incorrect line</strong>}
                </li>
              );
            })}
          </ol>
        </section>

        <section
          className="presenter-work-result__repair"
          data-key-story="correction"
          aria-labelledby="presenter-work-repair-title"
        >
          <p className="presenter-work-result__repair-label">Correct transformation</p>
          <h4 id="presenter-work-repair-title">
            Divide the whole balance by <InlineMath latex="2" />
          </h4>
          <div className="presenter-work-result__equation presenter-work-result__equation--repair presenter-work-result__equation--desktop">
            <InlineMath latex={DEMO_WORK_CORRECTION} />
          </div>
          <div className="presenter-work-result__equation presenter-work-result__equation--repair presenter-work-result__equation--substitution presenter-work-result__equation--desktop">
            <InlineMath latex={DEMO_WORK_SUBSTITUTION} />
          </div>
          <div className="presenter-work-result__equation presenter-work-result__equation--repair presenter-work-result__equation--mobile">
            <InlineMath latex={DEMO_WORK_FULL_CORRECTION} />
          </div>
          <p className="presenter-work-result__explanation">
            Dividing by <InlineMath latex="2" /> must halve every term.{" "}
            <strong>Next:</strong> Divide the last correct line by <InlineMath latex="2" />,
            then substitute.
          </p>
        </section>
      </div>

      <footer className="presenter-work-result__footer" data-key-story="appeal">
        <p>This feedback does not change your score or progress.</p>
        <button type="button" onClick={onAppeal}>
          That&apos;s not what I wrote
        </button>
      </footer>
    </section>
  );
}

export function PresenterWorkFixture({
  onExit,
}: {
  readonly onExit: () => void;
}): ReactElement {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<LocalDemoPhoto | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const restoreFullscreenOnExit = useRef(
    typeof document !== "undefined" && document.fullscreenElement !== null,
  );
  const { enter: enterFullscreen } = useFullscreen();

  useEffect(() => {
    if (phase !== "analyzing") {
      return;
    }
    const timer = window.setTimeout(() => setPhase("result"), DEMO_ANALYSIS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (photo) {
        URL.revokeObjectURL(photo.url);
      }
    };
  }, [photo]);

  function reset(): void {
    setPhase("idle");
    setError(null);
    setPhoto(null);
    setDragging(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function selectPhoto(file: File | undefined): void {
    if (!file) {
      return;
    }
    const nextError = photoError(file);
    if (nextError) {
      setPhase("error");
      setError(nextError);
      setPhoto(null);
      return;
    }
    setError(null);
    setPhoto({
      name: file.name || "selected photo",
      size: file.size,
      url: URL.createObjectURL(file),
    });
    setPhase("analyzing");
  }

  function exit(): void {
    if (restoreFullscreenOnExit.current) {
      // Invoke the Fullscreen API before leaving this click handler. Browsers require
      // the request to stay in the exit button's user-activation turn.
      void enterFullscreen();
    }
    onExit();
  }

  const showResult = phase === "result";
  return (
    <div className="city-shell presenter-work-shell" data-result={showResult}>
      <WorldScene
        eyebrow="AI work checker"
        title="Photo work feedback"
        tone="lesson"
        size="large"
        exitLabel="Back to city"
        onExit={exit}
      >
        {phase === "result" ? (
          <DemoResult onAppeal={reset} />
        ) : phase === "analyzing" && photo ? (
          <DemoAnalyzing photo={photo} onReset={reset} />
        ) : (
          <DemoUpload
            error={error}
            dragging={dragging}
            inputRef={inputRef}
            onFile={selectPhoto}
            onDragging={setDragging}
            onRetry={reset}
          />
        )}
      </WorldScene>
    </div>
  );
}
