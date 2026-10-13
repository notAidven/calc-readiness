/**
 * RAT.1 interactive (slide 1): click through reducing a recipe in two moves, factor then
 * cancel. Each stage offers the correct move beside the classic wrong one, and both option
 * buttons carry the same neutral token so colour never marks the answer.
 *
 * The wrong moves are the two that actually cost batches: cancelling loose TERMS out of a
 * sum ("the 12 and the 16") before anything is written as a product, and cancelling a
 * factor the top does not have. The recipe here is not used by the CFU or the practice
 * bank, and its two forbidden doses stay on screen after the cancel so the slide's point
 * survives its own last move.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

/** (3x + 12) / (x^2 - 16) reduces to 3 / (x - 4), forbidden at x = 4 and x = -4. */
const START = "\\dfrac{3x + 12}{x^{2} - 16}";
const FACTORED = "\\dfrac{3(x + 4)}{(x - 4)(x + 4)}";
const REDUCED = "\\dfrac{3}{x - 4}";
const RESTRICTION = "x \\ne 4, \\;\\; x \\ne -4";

type Stage = 0 | 1 | 2;
type Miss = "terms" | "wrongfactor" | null;

const ROW0_Y = 58;
const ROW1_Y = 126;
const ROW2_Y = 194;

export function RationalReducePlay({ onComplete }: { onComplete?: () => void }) {
  const [stage, setStage] = useState<Stage>(0);
  const [miss, setMiss] = useState<Miss>(null);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const solved = stage === 2;
  const neutral = { color: LABEL, borderColor: LINE };

  function advance(next: Stage) {
    setMiss(null);
    setStage(next);
    success();
    if (next === 2 && !fired) {
      setFired(true);
      onComplete?.();
    }
  }

  function reset() {
    setStage(0);
    setMiss(null);
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <svg
        viewBox="0 0 440 248"
        role="img"
        aria-label="Reduce 3x plus 12 over x squared minus 16 to 3 over x minus 4, with excluded values 4 and negative 4"
      >
        <title>Factor a fraction, then cancel the shared factor</title>

        <SvgMath latex={START} x={220} y={ROW0_Y} fontSize={26} />

        {stage >= 1 && (
          <>
            <text x={220} y={ROW0_Y + 34} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath latex={FACTORED} x={220} y={ROW1_Y} fontSize={26} />
          </>
        )}

        {stage >= 2 && (
          <>
            <text x={220} y={ROW1_Y + 34} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath latex={REDUCED} x={150} y={ROW2_Y} fontSize={26} color={CIVIC} />
            <SvgMath latex={RESTRICTION} x={320} y={ROW2_Y} fontSize={17} color={BRICK} />
          </>
        )}

        {stage === 0 && (
          <text x={220} y={ROW1_Y} textAnchor="middle" fontSize={13} fill={SOFT}>
            what is the first move?
          </text>
        )}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          {stage === 0 ? (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => advance(1)}
              >
                <InlineMath latex="\text{Factor the top and the bottom}" />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => setMiss("terms")}
              >
                <InlineMath latex="\text{Cancel the } 12 \text{ and the } 16" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => advance(2)}
              >
                <InlineMath latex="\text{Cancel } (x + 4)" />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => setMiss("wrongfactor")}
              >
                <InlineMath latex="\text{Cancel } (x - 4)" />
              </button>
            </>
          )}
        </div>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : miss ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            The shared factor cancels and <InlineMath latex={REDUCED} /> is left. Both
            excluded values from the original denominator, <InlineMath latex="x = 4" /> and{" "}
            <InlineMath latex="x = -4" />, still apply, even though one of those factors is
            gone.
          </>
        ) : miss === "terms" ? (
          <>
            Those are terms inside a sum and a difference, not factors of the whole top and
            bottom. Nothing can cancel until both parts are written as products.
          </>
        ) : miss === "wrongfactor" ? (
          <>
            The top is <InlineMath latex="3(x + 4)" />, and it carries no{" "}
            <InlineMath latex="(x - 4)" /> to cancel against. Only a factor that appears on
            both levels can leave.
          </>
        ) : stage === 0 ? (
          "Write each part as a product before you cancel anything."
        ) : (
          "Now cancel the factor that appears on both the top and the bottom."
        )}
      </p>
    </div>
  );
}
