/**
 * RAT.4 interactive (Verdigris Hold, the Master-Recipe Board): rule on the doses a NESTED
 * board forbids. This is the domain-tracking beat the node owns, and a complex fraction has
 * three sources of a forbidden measure plus two decoys:
 *
 *  - the top recipe's inner bottom (x + 1) forbids -1;
 *  - the bottom recipe's inner bottom (x - 4) forbids 4;
 *  - the bottom recipe's inner TOP (x - 2) forbids 2, because the whole bottom recipe is the
 *    divisor and a divisor may never be zero;
 *  - the top recipe's inner top (x - 6) forbids nothing: a zero up there just empties the
 *    board;
 *  - and 0 is an ordinary dose here, since no inner bottom is a bare x.
 *
 * Its board appears nowhere else in the lesson, so the CFU stays a fresh problem. Gates once
 * every dose is ruled on correctly.
 */

import { useState } from "react";
import { ComplexFractionSvg } from "../complexFraction";
import { CIVIC, InlineMath, LABEL, LINE, SOFT } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const NUMERATOR = "\\dfrac{x - 6}{x + 1}";
const DENOMINATOR = "\\dfrac{x - 2}{x - 4}";

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
    latex: "x = -1",
    spoken: "x equals negative 1",
    forbidden: true,
    because:
      "That value makes an inner denominator zero, so the numerator is undefined before anything is cleared.",
  },
  {
    latex: "x = 6",
    spoken: "x equals 6",
    forbidden: false,
    because:
      "That zero sits on the top recipe's own numerator, which nothing divides by. It makes the top zero, which is allowed.",
  },
  {
    latex: "x = 2",
    spoken: "x equals 2",
    forbidden: true,
    because:
      "The whole denominator is what you divide by, and at that value the denominator is itself zero.",
  },
  {
    latex: "x = 4",
    spoken: "x equals 4",
    forbidden: true,
    because:
      "That value makes the inner denominator of the divisor zero, which was a denominator all along.",
  },
  {
    latex: "x = 0",
    spoken: "x equals 0",
    forbidden: false,
    because: "No inner denominator here is a bare variable, so zero is an ordinary value.",
  },
];

export function RationalNestedDoseSorter({ onComplete }: { onComplete?: () => void }) {
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
        viewBox="0 0 440 210"
        role="img"
        aria-label="x minus 6 over x plus 1, stacked over x minus 2 over x minus 4"
      >
        <title>Which values does a complex fraction exclude?</title>
        <ComplexFractionSvg
          numerator={NUMERATOR}
          denominator={DENOMINATOR}
          cx={220}
          cy={92}
          fontSize={19}
          mainBarHalfWidth={110}
          partWidth={280}
          outerGap={22}
        />
        <text x={220} y={198} textAnchor="middle" fontSize={13} fill={SOFT}>
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
            A complex fraction excludes every inner denominator, <InlineMath latex="-1" />{" "}
            and <InlineMath latex="4" /> here, AND the value that makes the divisor zero,{" "}
            <InlineMath latex="2" />. Only the top recipe's own numerator is free, which is
            why <InlineMath latex="6" /> is allowed.
          </>
        ) : (
          (feedback ?? "For each value, tap Excluded or Allowed.")
        )}
      </p>
    </div>
  );
}
