/**
 * WorkParseCard — what a machine reading of a learner's paper working looks like when you
 * are honest about how often it is wrong.
 *
 * `docs/Photo_Work_Upload_Scope.md` §3.5 asks for the parse to be presented provisionally:
 * *"here's what we read — correct us if we got it wrong."* At the measured page-level
 * misread rate for the best frontier model behind an API — **37.62%**
 * (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4) — that sentence is not politeness, it is
 * the accurate description of the output, and this component is built around it rather than
 * decorated with it:
 *
 *  - **The hedge is the first thing rendered**, above the transcript, not a footnote under
 *    it. It is the server's `headline`, so it cannot drift from what the backend believes it
 *    sent.
 *  - **"This doesn't change your progress" is always on screen**, in the caveat, because a
 *    learner shown a machine reading of their mistake has no way of knowing that from the
 *    outside — and it is the invariant (§1, §7) that makes the whole feature safe.
 *  - **The suspect line is marked "check this line", not "wrong".** The reading localizes
 *    where it stopped following the working; it does not mark the answer, and there is no
 *    field in `WorkParse` that could.
 *  - **The coaching sits under the line it is about, and inside the same hedge.** When the
 *    server can ground a reading in the item's own solution it sends a few sentences on what
 *    happened at that line plus one or two things to try. It is rendered between the
 *    transcript and the caveat rather than at the top, because a paragraph of confident
 *    explanation above the hedge would be the most authoritative thing on a card whose whole
 *    subject is how often it is wrong. Both halves or neither: see the JSX comment.
 *  - **Below the confidence threshold the server sends no suspect line at all**, so a
 *    low-confidence reading renders as a plain transcript. That is a backend decision
 *    (`workUploadParse.ts`) rather than a styling one, which is why this component has no
 *    way to point at a line the server did not point at.
 *  - **"That's not what I wrote" is a dismissal, and only a dismissal.** It hides the card.
 *    Sending the correction anywhere is a feature with a design question attached — see
 *    `parseTypes.ts`'s note on why `WorkParseClient` has one method.
 *
 * Inert, like `WorkUpload`: it takes an upload id and a client, has no access to the lesson
 * session, the checker or the mastery service, and hands back nothing.
 */

import { useId, useRef, useState } from "react";

import { getWorkParseClient } from "./parseClient";
import { isWorkParse, type WorkParse, type WorkParseClient } from "./parseTypes";
import type { WorkParseUnavailable } from "./parseTypes";
import "./work-upload.css";

export interface WorkParseCardProps {
  /** Which of the learner's own uploads to read. Ownership is established server-side. */
  readonly uploadId: string;
  /** The read seam. Defaults to the dev stub, which calls nothing. */
  readonly client?: WorkParseClient;
  /** Notified when the learner dismisses the reading. */
  readonly onDismissed?: () => void;
  readonly className?: string;
}

type State =
  | { phase: "idle" }
  | { phase: "reading" }
  | { phase: "done"; result: WorkParse | WorkParseUnavailable }
  | { phase: "dismissed" };

export function WorkParseCard({
  uploadId,
  client,
  onDismissed,
  className,
}: WorkParseCardProps) {
  const [held, setHeld] = useState<{
    readonly uploadId: string;
    readonly state: State;
  }>({ uploadId, state: { phase: "idle" } });
  const [heldConsent, setHeldConsent] = useState<{
    readonly uploadId: string;
    readonly consented: boolean;
  }>({ uploadId, consented: false });
  const state: State = held.uploadId === uploadId ? held.state : { phase: "idle" };
  const consented = heldConsent.uploadId === uploadId ? heldConsent.consented : false;
  const consentId = useId();
  const statusId = useId();
  const requestRef = useRef(0);
  const currentUploadRef = useRef(uploadId);
  // Updating the ref during render closes the one-frame gap an effect would leave: a result
  // for photo A cannot land after this component has already been pointed at photo B.
  currentUploadRef.current = uploadId;
  const activeClient = client ?? getWorkParseClient();

  function setState(next: State) {
    setHeld({ uploadId, state: next });
  }

  async function handleRead() {
    const request = requestRef.current + 1;
    requestRef.current = request;
    setState({ phase: "reading" });
    let result: WorkParse | WorkParseUnavailable;
    try {
      result = await activeClient.read(uploadId);
    } catch {
      // The production client resolves ordinary failures, but an injected or future client may
      // still reject. Even that failure belongs to this optional card, not the lesson around it.
      result = {
        uploadId,
        outcome: "unavailable",
        provisional: true,
        reason: "service",
        headline: "We couldn't read your work this time.",
        caveat:
          "Your photo is still saved. Try reading it again later; this never changes your progress.",
      };
    }
    if (requestRef.current === request && currentUploadRef.current === uploadId) {
      setState({ phase: "done", result });
    }
  }

  if (state.phase === "dismissed") {
    return null;
  }

  if (state.phase === "idle" || state.phase === "reading") {
    return (
      <section
        className={`work-parse${className ? ` ${className}` : ""}`}
        data-phase={state.phase}
        aria-label="Read my working"
        aria-describedby={`${consentId} ${statusId}`}
      >
        <p className="work-parse__headline">Optional automated reading</p>
        <p className="work-parse__blurb" id={consentId}>
          Only after you ask, we send the cleaned, saved photo to the automated reader in
          our AWS account. It tries to transcribe your steps and find where the work stopped
          matching. The transcription can be wrong and is never a grade.
        </p>
        <label className="work-parse__consent">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) =>
              setHeldConsent({ uploadId, consented: event.currentTarget.checked })
            }
            disabled={state.phase === "reading"}
          />
          <span>Send this photo to the automated reader</span>
        </label>
        <button
          type="button"
          className="work-parse__btn work-parse__btn--primary"
          onClick={handleRead}
          disabled={state.phase === "reading" || !consented}
        >
          {state.phase === "reading" ? "Reading your working…" : "Read my working"}
        </button>
        <p
          className="work-parse__status"
          id={statusId}
          role={state.phase === "reading" ? "status" : undefined}
          aria-live="polite"
          aria-atomic="true"
        >
          {state.phase === "reading"
            ? "The automated reader is working. You can still move on."
            : "You choose when anything is sent: check the box and press Read."}
        </p>
      </section>
    );
  }

  const { result } = state;
  const parse = isWorkParse(result) ? result : null;
  const unavailableResult = parse ? null : (result as WorkParseUnavailable);
  const canRetry = parse
    ? parse.outcome === "unreadable"
    : unavailableResult?.reason !== "paused";

  return (
    <section
      className={`work-parse${className ? ` ${className}` : ""}`}
      data-phase="done"
      data-outcome={result.outcome}
      aria-label="What we read in your working"
    >
      {/* The hedge, first and unconditionally. Server-authored so it cannot drift. */}
      <p className="work-parse__headline">{result.headline}</p>
      <p className="work-parse__authority">
        Provisional automated transcription only. It may be wrong and never changes your
        score or progress.
      </p>

      {parse && parse.steps.length > 0 && (
        <>
          {parse.suspectStepIndex !== undefined && (
            <p className="work-parse__locator">Where the work stopped matching</p>
          )}
          <ol className="work-parse__steps" aria-label="Provisional transcription">
            {parse.steps.map((step, index) => {
              const suspect = parse.suspectStepIndex === index;
              return (
                <li
                  // A transcript is an ordered list of lines with no identity of their own;
                  // two lines of a page can legitimately read the same.
                  // biome-ignore lint/suspicious/noArrayIndexKey: position IS the identity here
                  key={`${index}-${step}`}
                  className="work-parse__step"
                  data-suspect={suspect || undefined}
                >
                  <span className="work-parse__step-text">{step}</span>
                  {suspect && (
                    <span className="work-parse__step-flag">check this line</span>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {/* The coaching, under the line it is about and above the caveat, so the hedge is
          still the last thing read as well as the first. Rendered only when the server sent
          both halves: an explanation with no actions leaves a learner told and not helped,
          and actions with no explanation read as an instruction from something that has
          just marked their page. */}
      {parse?.explanation !== undefined && parse.nextSteps !== undefined && (
        <div className="work-parse__coaching">
          <p className="work-parse__coaching-text">{parse.explanation}</p>
          <p className="work-parse__coaching-lead">Worth trying on paper</p>
          <ul className="work-parse__next-steps">
            {parse.nextSteps.map((step) => (
              <li key={step} className="work-parse__next-step">
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="work-parse__caveat">{result.caveat}</p>

      <div className="work-parse__actions">
        {canRetry && (
          <button
            type="button"
            className="work-parse__btn work-parse__btn--primary"
            onClick={handleRead}
          >
            Try reading again
          </button>
        )}
        <button
          type="button"
          className="work-parse__btn work-parse__btn--ghost"
          onClick={() => {
            setState({ phase: "dismissed" });
            onDismissed?.();
          }}
        >
          {parse && parse.steps.length > 0 ? "That's not what I wrote" : "Close"}
        </button>
      </div>
    </section>
  );
}
