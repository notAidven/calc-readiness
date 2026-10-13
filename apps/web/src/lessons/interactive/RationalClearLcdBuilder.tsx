/**
 * RAT.4 interactive (Verdigris Hold, the Master-Recipe Board): route (b) on the SAME board
 * that `rational-nested-flip-spot` clears the long way. Instead of combining
 * the top and the bottom separately, multiply both of them by the least measure that clears
 * every inner fraction at once, and the stack collapses in one move.
 *
 * The learner taps factor chips to build that multiplier. The decoy `(x + 3)` is a factor
 * nothing on the board is measured over, and tapping the same factor twice builds a
 * multiplier that works but is larger than the board needs, which is the mistake this widget
 * exists to catch. Gates once the product is exactly one of each inner measure, and the
 * cleared board is revealed so the two routes can be seen landing in the same place.
 */

import { type ReactNode, useState } from "react";
import { ComplexFractionSvg } from "../complexFraction";
import { CIVIC, EquationRow, InlineMath, LABEL, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

/**
 * The three factors on offer, with `em` the width each one typesets at in the product row
 * (measured in Chromium, rounded up), which is what lets the row shrink itself to fit
 * rather than spilling over the label beside it.
 */
const FACTORS = [
  { id: "x", latex: "x", spoken: "x", em: 0.75 },
  { id: "3", latex: "3", spoken: "3", em: 0.62 },
  { id: "x+3", latex: "(x + 3)", spoken: "x plus 3", em: 4.4 },
] as const;

type FactorId = (typeof FACTORS)[number]["id"];

const NUMERATOR = "\\dfrac{1}{x} + \\dfrac{1}{3}";
const DENOMINATOR = "\\dfrac{1}{x} - \\dfrac{1}{3}";
const CLEARED = "\\dfrac{3 + x}{3 - x}";

/** Product-row geometry: the box left of it holds the label, so the row owns 340. */
const ROW_W = 340;
const MAX_FONT = 20;
const MIN_FONT = 10;
/** A standalone `\cdot` token, plus the gap `EquationRow` sets between two tokens. */
const DOT_EM = 2.4;
const TOKEN_GAP_EM = 0.22;
/**
 * Four factors is two more than the board needs and one more than the duplicate-a-measure
 * mistake this widget exists to catch. Further taps are refused rather than shrunk.
 */
const MAX_PICKS = 4;

function factorFor(id: FactorId): (typeof FACTORS)[number] {
  return FACTORS.find((factor) => factor.id === id) ?? FACTORS[0];
}

/** The largest size at which the whole product still fits the row. */
function fitFontSize(picks: readonly FactorId[]): number {
  if (picks.length === 0) {
    return MAX_FONT;
  }
  const ems =
    picks.reduce((total, id) => total + factorFor(id).em, 0) +
    (picks.length - 1) * DOT_EM +
    (2 * picks.length - 2) * TOKEN_GAP_EM;
  return Math.max(MIN_FONT, Math.min(MAX_FONT, Math.floor(ROW_W / ems)));
}

function countsOf(picks: readonly FactorId[]): Record<FactorId, number> {
  const counts = { x: 0, "3": 0, "x+3": 0 } as Record<FactorId, number>;
  for (const pick of picks) {
    counts[pick] += 1;
  }
  return counts;
}

export function RationalClearLcdBuilder({ onComplete }: { onComplete?: () => void }) {
  const [picks, setPicks] = useState<FactorId[]>([]);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  function add(id: FactorId) {
    if (solved) {
      return;
    }
    if (picks.length >= MAX_PICKS) {
      setFeedback("That multiplier is already far larger than needed. Undo one.");
      return;
    }
    setFeedback(null);
    setPicks((current) => [...current, id]);
  }

  function undo() {
    if (solved) {
      return;
    }
    setFeedback(null);
    setPicks((current) => current.slice(0, -1));
  }

  function reset() {
    setPicks([]);
    setFeedback(null);
    setSolved(false);
  }

  function check() {
    if (solved) {
      return;
    }
    if (picks.length === 0) {
      setFeedback("Tap a factor to start building the multiplier.");
      return;
    }
    const counts = countsOf(picks);
    if (counts["x+3"] > 0) {
      setFeedback(
        <>
          Nothing in this expression has denominator <InlineMath latex="x + 3" />. Look at
          what sits under each inner fraction bar.
        </>,
      );
      return;
    }
    if (counts.x === 1 && counts["3"] === 1) {
      setSolved(true);
      setFeedback(null);
      success();
      if (!done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    if (counts.x === 0) {
      setFeedback(
        <>
          That leaves the <InlineMath latex="\dfrac{1}{x}" /> parts uncleared.
        </>,
      );
      return;
    }
    if (counts["3"] === 0) {
      setFeedback(
        <>
          That leaves the <InlineMath latex="\dfrac{1}{3}" /> parts uncleared.
        </>,
      );
      return;
    }
    setFeedback(
      "That multiplier does clear both inner denominators, but each one only has to appear once.",
    );
  }

  const productTokens =
    picks.length === 0
      ? [{ text: "?", color: SOFT }]
      : picks.flatMap((pick, index) =>
          index === 0
            ? [{ text: factorFor(pick).latex, color: solved ? CIVIC : SIGNAL }]
            : [
                { text: "\\cdot", color: LABEL },
                { text: factorFor(pick).latex, color: solved ? CIVIC : SIGNAL },
              ],
        );

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Multiplying the whole numerator and the whole denominator by{" "}
        <InlineMath latex="3x" /> clears every inner denominator at once, and it lands on{" "}
        <InlineMath latex="\dfrac{3 + x}{3 - x}" />, exactly where the reciprocal route
        landed.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else {
    status = (
      <>
        Tap factors to build the smallest multiplier that clears both{" "}
        <InlineMath latex="\dfrac{1}{x}" /> and <InlineMath latex="\dfrac{1}{3}" /> in this
        expression.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg
        viewBox="0 0 440 280"
        role="img"
        aria-label="Clear a complex fraction by multiplying its numerator and denominator by the LCD of the inner fractions"
      >
        <title>
          Multiply numerator and denominator by the LCD that clears the inner fractions
        </title>
        {/* The stack sits high; the multiply row sits low enough that the denominator
            (`1/x - 1/3`) never meets the product the learner is building. */}
        <ComplexFractionSvg
          numerator={NUMERATOR}
          denominator={DENOMINATOR}
          cx={244}
          cy={82}
          fontSize={17}
          mainBarHalfWidth={110}
          partWidth={340}
          outerGap={22}
        />
        <text x={8} y={200} fontSize={12} fill={SOFT} dominantBaseline="middle">
          multiply by
        </text>
        <EquationRow
          tokens={productTokens}
          cx={248}
          y={200}
          fontSize={fitFontSize(picks)}
          w={ROW_W}
        />
        {solved && (
          <>
            <text x={8} y={248} fontSize={12} fill={SOFT} dominantBaseline="middle">
              clears to
            </text>
            <SvgMath latex={CLEARED} x={248} y={248} fontSize={17} color={CIVIC} w={340} />
          </>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {FACTORS.map((factor) => (
          <button
            key={factor.id}
            type="button"
            className="lesson-interactive__chip"
            style={{ color: SIGNAL }}
            aria-label={`add the factor ${factor.spoken}`}
            disabled={solved}
            onClick={() => add(factor.id)}
          >
            <InlineMath latex={factor.latex} />
          </button>
        ))}
        <button
          type="button"
          className="lesson-interactive__step"
          disabled={solved || picks.length === 0}
          onClick={undo}
        >
          Undo
        </button>
        <button
          type="button"
          className="lesson-interactive__check"
          disabled={solved}
          onClick={check}
        >
          Check
        </button>
        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={reset}>
            Start over
          </button>
        )}
      </div>

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
