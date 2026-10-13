import { type ReactElement, useState } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";

import "./diagnostic-dev-skip.css";

/**
 * **DEV: ANSWER THE WHOLE DIAGNOSTIC AT A CHOSEN ACCURACY, INSTEAD OF TYPING IT.**
 *
 * The instrument is twenty nodes wide now, and a walk costs a median of 23 questions
 * (`engines/diagnostic/sim/widened-scope.sim.test.ts`). Every state anybody wants to LOOK
 * at — the results table, the placement hand-off, the "you've unlocked N buildings"
 * celebration, the pre/post gain — sits behind those twenty-three, and behind
 * forty-something more for the retake. So this is the winter's dev skip
 * (`winter/winterDevSkip.css` carries its layout argument) answering the same request on the
 * surface with the longer runway.
 *
 * ## IT NAMES AN ACCURACY, AND THAT IS THE POINT
 *
 * A plain "skip to the end" would reach ONE result. The interesting states are not later,
 * they are DIFFERENT: acing tests out of everything and hands the city twenty built
 * buildings, missing everything places at the start everywhere, and a mixed run is the only
 * one that shows the results table doing what it is for — some skills strong, some to
 * review, some inferred from the map rather than tested. The walk itself also takes
 * different shapes at each: a pass credits a prerequisite closure and climbs, a confirmed
 * miss prunes a whole dependent cone, so a miss-everything run is over in single figures
 * while an acing one is examined across nine domains.
 *
 * ## IT ANSWERS, IT DOES NOT FORGE
 *
 * Every rung drives the REAL walk through the REAL runtime: the same `submitStage` the
 * typed answers go through, the same authoritative scorer, the same finalize. The only
 * thing it substitutes is the keystrokes, and it takes those from the item bank's own
 * `canonicalRawAnswer` / `wellFormedWrongRawAnswer`, so an "incorrect" here is a
 * well-formed answer the grader rejects rather than a flag set on a response row. Nothing
 * about the placement it produces is synthetic.
 *
 * The wrong answers being well-formed is load-bearing rather than fastidious: an
 * unparseable answer is a FAULT, the walk re-serves the item instead of scoring it, and a
 * skip built on garbage would hang on question one.
 *
 * ## THE GATE IS THE REPO'S, NOT A NEW ONE
 *
 * {@link isDevPersistenceEnabled} — `!isServerBacked(true)`, which is
 * `VITE_DIAGNOSTIC_API_URL` being unset — exactly as the winter's dev skip does it, and for the
 * three reasons recorded there: `docs/Deployment.md` bakes that variable into the shipped
 * SPA so a real learner cannot reach this; the predicate answers synchronously from the
 * first frame, so the control never flashes; and it errs safe, reporting disabled for a
 * deployment with an endpoint and a signed-out user. `winterDevSkipStaysDev.test.ts` is the
 * repo-level guard on that predicate and `diagnosticDevSkipIsGated.test.tsx` is this
 * surface's own.
 *
 * ## AND THERE IS DELIBERATELY NO OVERRIDE PROP
 *
 * The control reads the environment itself and offers no way to be told otherwise. Its
 * sibling in the winter takes an optional flag that supersedes the gate, mirroring
 * `devSessionStore`'s option of the same name, and that flag needs a tracked-source sweep of
 * its own to stop a mount from passing it — which is a hole that can only be closed at the
 * call sites, and only for as long as somebody keeps sweeping them.
 *
 * Declining the flag removes the hazard outright instead: the gate is UNROUTABLE rather than
 * merely defaulted, so there is nothing for a mount to override and nothing for a copied
 * mount to carry onto a learner's build. That is `IntrusionEntryChip`'s shape and
 * `WinterEntryChip`'s before it — one definition of "dev" per feature, read at the one place
 * that renders. It costs the tests nothing: they drive the real environment through
 * `vi.stubEnv`, which is what they should have been measuring in the first place, since
 * *"it is behind a gate"* and *"the gate works"* are two claims and only the second is worth
 * having.
 *
 * The stake here is higher than for the winter's, which resolves rounds of an unscored
 * encounter. This one ANSWERS A DIAGNOSTIC: rendered past its gate it would let a learner
 * hand themselves a full test-out, twenty buildings and a placement they never earned, and
 * written by the real scorer so nothing downstream could tell.
 */

/** One rung of the ladder: a label, and the accuracy it answers at. */
export interface DiagnosticSkipRung {
  readonly id: string;
  /** The button face. */
  readonly label: string;
  /** What a reviewer gets, for the aria-label and the note. */
  readonly describe: string;
  /**
   * Whether the `index`-th answer of the run should be correct. A function rather than a
   * rate so a rung is deterministic: two presses of "half right" produce the same walk,
   * which is what makes a screenshot reproducible.
   */
  readonly correctAt: (index: number) => boolean;
}

/**
 * The rungs, strongest first, so the eye lands on the best case as it does on the results.
 *
 * "Half right" alternates rather than sampling. A rate would make the interesting rung the
 * one nobody can reproduce, and the results table is the thing being photographed.
 */
export const DIAGNOSTIC_SKIP_RUNGS: readonly DiagnosticSkipRung[] = [
  {
    id: "ace",
    label: "All right",
    describe: "answer every remaining question correctly (tests out of everything)",
    correctAt: () => true,
  },
  {
    id: "mixed",
    label: "Half right",
    describe: "answer every other remaining question correctly (a mixed placement)",
    correctAt: (index) => index % 2 === 0,
  },
  {
    id: "thin",
    label: "One in three",
    describe: "answer one remaining question in three correctly (mostly review)",
    correctAt: (index) => index % 3 === 0,
  },
  {
    id: "miss",
    label: "All wrong",
    describe: "answer every remaining question incorrectly (starts from the ground up)",
    correctAt: () => false,
  },
];

/** What a completed scripted run reports back, for the note. */
export interface DiagnosticSkipResult {
  itemsAsked: number;
  purpose: "pre" | "post";
}

export interface DiagnosticDevSkipProps {
  /**
   * Run a whole administration, answering with `correctAt`. `fromCurrent` continues the run
   * in progress; otherwise a fresh one is started, so the control works from the overview
   * screen as well as mid-question.
   */
  readonly onRun: (
    rung: DiagnosticSkipRung,
    fromCurrent: boolean,
  ) => Promise<DiagnosticSkipResult | null>;
  /** True while a question is on screen, so "answer the rest" has a run to continue. */
  readonly midRun: boolean;
  /** True while the runner is awaiting the engine; presses are refused rather than queued. */
  readonly busy: boolean;
}

export function DiagnosticDevSkip({
  onRun,
  midRun,
  busy,
}: DiagnosticDevSkipProps): ReactElement | null {
  /**
   * WHAT THE LAST PRESS DID, and nothing else.
   *
   * The results table narrates the placement perfectly well on its own. What it cannot say
   * is HOW MANY QUESTIONS the walk asked to get there, which is the number the instrument
   * is judged on and the one a reviewer is usually here to read.
   */
  const [note, setNote] = useState<string | null>(null);
  /**
   * FOLDED AWAY TO A CHIP, so the corner it covers is recoverable — open by default, on
   * the winter panel's reasoning: a control that has to be unfolded first has put a press in
   * front of the press.
   */
  const [open, setOpen] = useState(true);
  // Read at render, from the environment, with nothing in front of it. Both hooks above run
  // first because they must run unconditionally; the gate is the next thing that happens.
  if (!isDevPersistenceEnabled()) {
    return null;
  }

  async function run(rung: DiagnosticSkipRung): Promise<void> {
    setNote(`Answering… (${rung.describe})`);
    const result = await onRun(rung, midRun);
    if (!result) {
      setNote("That run did not complete. The error is above.");
      return;
    }
    setNote(
      `Answered the ${result.purpose === "post" ? "retake" : "diagnostic"} at "${rung.label}": ` +
        `${result.itemsAsked} question${result.itemsAsked === 1 ? "" : "s"} asked.`,
    );
  }

  return (
    <aside className="dgx-skip" aria-labelledby="dgx-skip-title" data-testid="dgx-dev-skip">
      <p className="dgx-skip__eyebrow">Dev only, not on the learner build</p>
      <button
        type="button"
        id="dgx-skip-title"
        className="dgx-skip__title"
        aria-expanded={open}
        data-testid="dgx-dev-skip-fold"
        onClick={() => setOpen(!open)}
      >
        Answer it for me
        <span className="dgx-skip__fold" aria-hidden="true">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <>
          <fieldset className="dgx-skip__group">
            <legend className="dgx-skip__legend">
              {midRun
                ? "Answer every remaining question at"
                : "Start it and answer every question at"}
            </legend>
            <div className="dgx-skip__row">
              {DIAGNOSTIC_SKIP_RUNGS.map((rung) => (
                <button
                  key={rung.id}
                  type="button"
                  className="dgx-skip__rung"
                  data-rung={rung.id}
                  data-testid={`dgx-dev-skip-${rung.id}`}
                  disabled={busy}
                  aria-label={`Then ${rung.describe}`}
                  onClick={() => void run(rung)}
                >
                  {rung.label}
                </button>
              ))}
            </div>
          </fieldset>
          {/* `aria-live`, because the question count is the one consequence of a press that
              no other part of the screen reports. */}
          <p className="dgx-skip__note" aria-live="polite">
            {note ?? "Real walk, real scorer, real placement: only the typing is skipped."}
          </p>
        </>
      )}
    </aside>
  );
}
