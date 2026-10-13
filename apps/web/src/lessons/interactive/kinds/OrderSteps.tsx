/**
 * INTERACTION KIND: putting steps in order.
 *
 * The learner is shown the steps of one argument, shuffled, and taps whichever they think
 * comes NEXT. A correct tap moves that step into the numbered column; a wrong tap says why
 * that step cannot come yet. It suits any idea whose content is a chain of dependencies,
 * because the only way to build the chain is to know which fact each step rests on.
 *
 * Tapping the next step is a produced value, not activity: there is exactly one right
 * answer at each position and the widget refuses the others, so the order cannot be walked
 * into by clicking. The gate opens on the completed chain.
 *
 * Revealing the next step does not cost the chain while there are steps after it. The passage
 * explains the one step and the chain comes BACK with every rung already built still built
 * and the explained step still on the tray, which is `othersRemain` on the reveal. On the last
 * step it is false, because that step is the gate.
 *
 * `objective` and `prompt` are two different lines and both are required. R9 says the task
 * statement lives in the widget, and this widget satisfied it with "Tap the line that comes
 * next", which tells the learner how to work the control and nothing about what they are
 * building: the chips here form a derivation, and QA read four shuffled lines with no idea
 * they were assembling a proof. So the goal is a field on the KIND rather than prose in one
 * widget, and it is required rather than optional, because a widget that forgets it is
 * exactly the widget that produced the defect.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT } from "../../svgKit";
import { WidgetReveal } from "../../widgetFeedback";
import { useRevealFill, useRevealReAsk, useWidgetSuccess } from "../../widgetMechanics";
import { WidgetTask } from "../../widgetTask";

export interface OrderedStep {
  id: string;
  /** The step, as LaTeX where it is math and as prose where it is not. */
  latex?: string;
  text?: string;
  /** How a screen reader should say it. */
  spoken: string;
  /** Why this step sits where it does: what it rests on, or what it makes possible. */
  why: ReactNode;
}

export interface OrderStepsProps {
  /** The steps in their CORRECT order. */
  steps: readonly OrderedStep[];
  /** The order they are dealt in: indices into `steps`. Never the identity. */
  dealt: readonly number[];
  /**
   * WHAT the learner is building, and how they will know it is done. Phrase it as the open
   * question the chain settles, never as the conclusion: the last step is itself one of the
   * chips on offer, so a goal line that states the result hands over the final tap.
   */
  objective: ReactNode;
  /** HOW to operate the board. One short line; the widget explains a refused tap itself. */
  prompt: string;
  conclusion: ReactNode;
  ariaLabel: string;
  onSolved: () => void;
  onRestart: () => void;
  restartLabel: string;
}

function StepBody({ step, color }: { step: OrderedStep; color: string }) {
  if (step.latex !== undefined) {
    return <InlineMath latex={step.latex} color={color} />;
  }
  return <span style={{ color }}>{step.text}</span>;
}

export function OrderSteps({
  steps,
  dealt,
  objective,
  prompt,
  conclusion,
  ariaLabel,
  onSolved,
  onRestart,
  restartLabel,
}: OrderStepsProps) {
  const [placed, setPlaced] = useState(0);
  const [missed, setMissed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = placed >= steps.length;
  const wanted = steps[placed] ?? null;
  /** The step the passage on screen names, sitting in the open rung while it is up. */
  const givenStep = fill.given ? wanted : null;
  const pool = dealt
    .map((i) => steps[i])
    .filter((s): s is OrderedStep => Boolean(s))
    .filter((s) => steps.indexOf(s) >= placed)
    // A given step comes off the tray exactly as a correctly tapped one does, so the board
    // never shows a rung filled with a step that is still on offer beneath it.
    .filter((s) => s.id !== givenStep?.id);

  function advance(earned: boolean) {
    const next = placed + 1;
    setPlaced(next);
    setMissed(null);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= steps.length) {
      onSolved();
    }
  }

  function tap(step: OrderedStep) {
    if (solved || wanted === null) {
      return;
    }
    if (step.id === wanted.id) {
      setRevealed(false);
      advance(true);
      return;
    }
    // A fresh attempt: the reveal steps aside so it can be offered for the step in hand.
    setRevealed(false);
    setMissed(step.id);
    setFeedback(
      "Not quite. That step cannot come next, because it rests on something that is not on the board yet.",
    );
  }

  function reveal() {
    setRevealed(true);
    advance(false);
  }

  const revealedStep = revealed ? (steps[placed - 1] ?? null) : null;

  return (
    <div className="lesson-interactive lesson-interactive--order">
      {/* Above the board and outside the status line, because the goal stands for the whole
          interaction while the status line is spent on this tap's feedback. */}
      <WidgetTask>{objective}</WidgetTask>

      <ol className="lesson-order__list" aria-label={ariaLabel}>
        {steps.slice(0, placed).map((step) => (
          <li key={step.id} className="lesson-order__slot" data-state="placed">
            <StepBody step={step} color={CIVIC} />
          </li>
        ))}
        {!solved && (
          /* Where the next step will land. An empty dashed rung says that on its own, so
             the words that used to sit in it are kept for a screen reader only: the same
             convention the drop slots in `LabelParts` and `FillTable` follow. Empty, that
             is, unless a reveal has just named the step, in which case the rung holds it. */
          <li
            className="lesson-order__slot"
            data-state="open"
            {...fill.mark(givenStep !== null)}
          >
            {givenStep === null ? (
              <span className="visually-hidden">The next step goes here</span>
            ) : (
              <>
                <StepBody step={givenStep} color={LABEL} />
                <span className="visually-hidden">
                  {`, ${givenStep.spoken}, given rather than answered`}
                </span>
              </>
            )}
          </li>
        )}
      </ol>

      <div className="lesson-sorter__tray">
        {/* Keyed on `solved`: a fill can take the last chip off the tray while the chain is
            still a step short of finished. */}
        {solved ? (
          <span className="lesson-sorter__tray-empty">Every step placed</span>
        ) : (
          pool.map((step) => (
            <button
              key={step.id}
              type="button"
              className="lesson-sorter__chip"
              aria-label={`Place ${step.spoken} next`}
              style={{ borderColor: missed === step.id ? BRICK : SOFT }}
              onClick={() => tap(step)}
            >
              <StepBody step={step} color={LABEL} />
            </button>
          ))
        )}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {restartLabel}
        </button>
      )}

      <WidgetReveal
        available={missed !== null && !solved}
        revealed={revealedStep !== null}
        // The step still WANTED, not the one already placed: the reveal is read at the
        // moment of the click, when the answer being asked for is this step.
        answer={wanted === null ? null : <StepBody step={wanted} color={LABEL} />}
        why={wanted === null ? null : wanted.why}
        onReveal={reveal}
        label="Reveal the next step"
        // The chain is built in order, so what is left after the wanted step is every step
        // above it in the list.
        othersRemain={placed + 1 < steps.length}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealedStep !== null && !solved
          ? null
          : solved
            ? conclusion
            : (feedback ?? prompt)}
      </p>
    </div>
  );
}
