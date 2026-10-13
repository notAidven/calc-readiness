/**
 * RAT.2 interactive (slide 4): sort candidate doses for a DIVISION into forbidden and safe.
 * Division has three sources of a forbidden measure, and this widget makes the learner meet
 * all of them plus the two decoys:
 *
 *  - the dividend's bottom (x - 7) forbids 7;
 *  - the divisor's bottom (x + 2) forbids -2;
 *  - the divisor's TOP (x - 5) forbids 5, because flipping sends it underneath;
 *  - the dividend's top (x + 4) forbids nothing: a zero there just empties the brew;
 *  - and 0 is an ordinary dose here, since no bottom is a bare x.
 *
 * Gates once every dose is ruled on correctly. Its instance appears nowhere else in the
 * lesson, so the CFU stays a fresh problem.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const EXPRESSION = "\\dfrac{x + 4}{x - 7} \\div \\dfrac{x - 5}{x + 2}";

interface Dose {
  /** The candidate dose, as LaTeX. */
  latex: string;
  spoken: string;
  forbidden: boolean;
  /** Why, shown when the learner rules the other way. */
  because: string;
}

const DOSES: readonly Dose[] = [
  {
    latex: "x = 7",
    spoken: "x equals 7",
    forbidden: true,
    because:
      "At that value the dividend's denominator is zero, so the expression is undefined.",
  },
  {
    latex: "x = -4",
    spoken: "x equals negative 4",
    forbidden: false,
    because:
      "That zero sits on the dividend's own numerator, which no flip sends underneath. It makes the quotient zero, which is allowed.",
  },
  {
    latex: "x = 5",
    spoken: "x equals 5",
    forbidden: true,
    because:
      "That is the zero of the divisor's numerator, and flipping sends that numerator underneath, so it is excluded.",
  },
  {
    latex: "x = -2",
    spoken: "x equals negative 2",
    forbidden: true,
    because:
      "That is the zero of the divisor's denominator, which was a denominator from the start.",
  },
  {
    latex: "x = 0",
    spoken: "x equals 0",
    forbidden: false,
    because: "No denominator here is a bare variable, so zero is an ordinary value.",
  },
];

export function RationalDivideDoseSorter({ onComplete }: { onComplete?: () => void }) {
  const [ruled, setRuled] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const solved = DOSES.every((dose) => ruled[dose.latex]);

  function rule(dose: Dose, guessForbidden: boolean) {
    if (ruled[dose.latex]) {
      return;
    }
    if (guessForbidden !== dose.forbidden) {
      setFeedback(dose.because);
      return;
    }
    const next = { ...ruled, [dose.latex]: true };
    setRuled(next);
    setFeedback(null);
    success();
    if (DOSES.every((candidate) => next[candidate.latex]) && !done) {
      setDone(true);
      onComplete?.();
    }
  }

  function reset() {
    setRuled({});
    setFeedback(null);
  }

  // Both chips render in the SAME neutral token, so colour is never a tell.
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <svg
        viewBox="0 0 440 92"
        role="img"
        aria-label="x plus 4 over x minus 7 divided by x minus 5 over x plus 2"
      >
        <title>Which values does a division exclude?</title>
        <SvgMath latex={EXPRESSION} x={220} y={38} fontSize={20} color={LABEL} h={80} />
        <text x={220} y={82} textAnchor="middle" fontSize={13} fill={SOFT}>
          rule on each value below
        </text>
      </svg>

      {/* The board, and the grid every row borrows its columns from: the value, the two calls,
          and the verdict glyph. Without it each row sized its own tracks and the alignment had
          to be hardcoded in rem, which is what clipped the labels. */}
      <div className="lesson-classify">
        {DOSES.map((dose) => {
          const locked = ruled[dose.latex] === true;
          return (
            <div key={dose.latex} className="lesson-classify__row">
              <span className="lesson-interactive__step-eq">
                <InlineMath latex={dose.latex} />
              </span>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`${dose.spoken} is excluded`}
                onClick={() => rule(dose, true)}
              >
                Excluded
              </button>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`${dose.spoken} is allowed`}
                onClick={() => rule(dose, false)}
              >
                Allowed
              </button>
              <span className="lesson-classify__check" style={{ color: CIVIC }}>
                {locked ? "\u2713" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            A division excludes every original denominator AND the divisor's numerator, so
            this one rules out <InlineMath latex="7" />, <InlineMath latex="5" /> and{" "}
            <InlineMath latex="-2" />. Only the dividend's own numerator is free, which is
            why <InlineMath latex="-4" /> is allowed.
          </>
        ) : (
          (feedback ?? "For each value, tap Excluded or Allowed.")
        )}
      </p>
    </div>
  );
}
