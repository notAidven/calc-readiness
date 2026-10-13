/**
 * RAT.3 interactive (Verdigris Hold, the Blending Vat): build the common measure (LCD)
 * for two casks whose denominators OVERLAP. The learner taps factor chips to append them
 * to a product, and the whole point is the multiplicity: tapping the shared factor twice
 * builds a measure that works but is not the least one, which is the mistake this widget
 * exists to catch. Undo removes the last factor; Check grades the multiset.
 *
 * Gates the lesson once the product is exactly one of each factor.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, EquationRow, InlineMath, LABEL, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

/**
 * The three factors on offer; `x + 3` is the one both casks already hold. `em` is how wide
 * each one typesets at the product row's font size (measured in Chromium, rounded up), which
 * is what lets the row shrink itself to fit rather than spilling over the "measure" label.
 */
const FACTORS = [
  { id: "x", latex: "x", spoken: "x", em: 0.75 },
  { id: "x+3", latex: "(x + 3)", spoken: "x plus 3", em: 3.85 },
  { id: "x-1", latex: "(x - 1)", spoken: "x minus 1", em: 4.4 },
] as const;

type FactorId = (typeof FACTORS)[number]["id"];

const SHARED: FactorId = "x+3";

const PROBLEM = "\\dfrac{5}{x(x + 3)} + \\dfrac{2}{(x + 3)(x - 1)}";

/** Product-row geometry: the box left of it holds the "measure" label, so the row owns 360. */
const ROW_W = 360;
const MAX_FONT = 20;
const MIN_FONT = 10;
/** A standalone `\cdot` token, plus the gap `EquationRow` sets between two tokens. */
const DOT_EM = 2.4;
const TOKEN_GAP_EM = 0.22;
/**
 * Five factors is two more than the least common measure needs and one more than the
 * duplicate-the-shared-factor mistake this widget exists to catch, and it is the most that
 * still typesets legibly inside the row. Further taps are refused rather than shrunk.
 */
const MAX_PICKS = 5;

function factorFor(id: FactorId): (typeof FACTORS)[number] {
  return FACTORS.find((factor) => factor.id === id) ?? FACTORS[0];
}

function latexFor(id: FactorId): string {
  return factorFor(id).latex;
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
  const counts = { x: 0, "x+3": 0, "x-1": 0 } as Record<FactorId, number>;
  for (const pick of picks) {
    counts[pick] += 1;
  }
  return counts;
}

export function RationalAddLcdBuilder({ onComplete }: { onComplete?: () => void }) {
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
      setFeedback(
        "That LCD is already far larger than either denominator needs. Undo a factor.",
      );
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
    const counts = countsOf(picks);
    if (picks.length === 0) {
      setFeedback("Tap a factor to start building the LCD.");
      return;
    }
    if (counts.x === 1 && counts[SHARED] === 1 && counts["x-1"] === 1) {
      setSolved(true);
      setFeedback(null);
      success();
      if (!done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    if (counts.x >= 1 && counts[SHARED] >= 2 && counts["x-1"] >= 1) {
      setFeedback(
        <>
          That LCD does work for both denominators, but <InlineMath latex="(x + 3)" />{" "}
          appears in both already, so it only has to appear once.
        </>,
      );
      return;
    }
    if (counts.x === 0 || counts[SHARED] === 0 || counts["x-1"] === 0) {
      setFeedback("The LCD has to include every factor of both denominators.");
      return;
    }
    setFeedback("A factor only needs to appear as often as it does in one denominator.");
  }

  const productTokens =
    picks.length === 0
      ? [{ text: "?", color: SOFT }]
      : picks.flatMap((pick, index) =>
          index === 0
            ? [{ text: latexFor(pick), color: solved ? CIVIC : SIGNAL }]
            : [
                { text: "\\cdot", color: LABEL },
                { text: latexFor(pick), color: solved ? CIVIC : SIGNAL },
              ],
        );

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        That is the least common denominator: <InlineMath latex="x(x + 3)(x - 1)" />. Each
        factor appears as often as it does in the denominator that needs it most.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else {
    status = (
      <>
        Tap factors to build the smallest LCD that both <InlineMath latex="x(x + 3)" /> and{" "}
        <InlineMath latex="(x + 3)(x - 1)" /> divide into.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg
        viewBox="0 0 440 148"
        role="img"
        aria-label="Build the least common denominator of two rational expressions whose denominators share a factor"
      >
        <title>Least common denominator for two overlapping denominators</title>
        <SvgMath latex={PROBLEM} x={220} y={44} fontSize={18} color={LABEL} w={400} />
        <text x={8} y={110} fontSize={12} fill={SOFT}>
          LCD
        </text>
        <EquationRow
          tokens={productTokens}
          cx={244}
          y={106}
          fontSize={fitFontSize(picks)}
          w={ROW_W}
        />
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
          className="lesson-interactive__step"
          disabled={solved || picks.length === 0}
          onClick={reset}
        >
          Clear
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
