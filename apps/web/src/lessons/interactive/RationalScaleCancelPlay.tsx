/**
 * RAT.2 interactive (slide 1): cancel across a product of two rational expressions, then
 * multiply what survives. A click-through in two moves, themed as the guild's Scaling
 * Table. First the learner combines the two recipes over one bar, then they have to NAME
 * the factor that appears both above and below before anything is allowed to cancel, so
 * the widget cannot be finished by pressing the only button on screen.
 *
 * The instance (x + 1)/(x - 4) times (x - 4)/(x + 6) is deliberately different from the
 * CFU's greatsword division and from every practice shape.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

/** The three factors on offer; only the shared one cancels. */
const FACTORS: readonly { latex: string; spoken: string; shared: boolean }[] = [
  { latex: "x + 1", spoken: "x plus 1", shared: false },
  { latex: "x - 4", spoken: "x minus 4", shared: true },
  { latex: "x + 6", spoken: "x plus 6", shared: false },
];

const PRODUCT = "\\dfrac{x + 1}{x - 4} \\times \\dfrac{x - 4}{x + 6}";
const ONE_BAR = "= \\dfrac{(x + 1)(x - 4)}{(x - 4)(x + 6)}";
const RESULT = "= \\dfrac{x + 1}{x + 6}";

export function RationalScaleCancelPlay({ onComplete }: { onComplete?: () => void }) {
  const [combined, setCombined] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  function combine() {
    setCombined(true);
    setFeedback(null);
  }

  function pick(index: number) {
    const factor = FACTORS[index];
    if (!factor || cancelled) {
      return;
    }
    if (!factor.shared) {
      setFeedback(
        "That one appears in only one place. A factor cancels only when it sits above the bar AND below it.",
      );
      return;
    }
    setFeedback(null);
    setCancelled(true);
    success();
    if (!done) {
      setDone(true);
      onComplete?.();
    }
  }

  function reset() {
    setCombined(false);
    setCancelled(false);
    setFeedback(null);
  }

  let status: ReactNode;
  if (!combined) {
    status = "First move: put the two fractions over one bar.";
  } else if (!cancelled) {
    status = "Now name the factor that sits both above the bar and below it.";
  } else {
    status = (
      <>
        The shared factor divided out, so the result is{" "}
        <InlineMath latex="\dfrac{x + 1}{x + 6}" />. Factor, cancel across, multiply what is
        left.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <svg
        viewBox="0 0 440 202"
        role="img"
        aria-label="The product of x plus 1 over x minus 4 and x minus 4 over x plus 6 cancels to x plus 1 over x plus 6"
      >
        <title>Cancel across a product of two rational expressions</title>

        <SvgMath latex={PRODUCT} x={220} y={34} fontSize={20} color={LABEL} h={80} />

        {combined && (
          <SvgMath latex={ONE_BAR} x={220} y={100} fontSize={20} color={LABEL} h={80} />
        )}

        {cancelled && (
          <>
            <text x={220} y={148} textAnchor="middle" fontSize={13} fill={SOFT}>
              the shared factor divides out, top and bottom
            </text>
            <SvgMath latex={RESULT} x={220} y={178} fontSize={20} color={CIVIC} h={70} />
          </>
        )}
      </svg>

      {!combined && (
        <div className="lesson-interactive__controls">
          <button type="button" className="lesson-interactive__check" onClick={combine}>
            Put them over one bar
          </button>
        </div>
      )}

      {combined && !cancelled && (
        <div className="lesson-interactive__controls">
          {FACTORS.map((factor, index) => (
            <button
              key={factor.latex}
              type="button"
              className="lesson-interactive__chip"
              style={{ color: LABEL }}
              aria-label={`Cancel ${factor.spoken}`}
              onClick={() => pick(index)}
            >
              <InlineMath latex={factor.latex} />
            </button>
          ))}
        </div>
      )}

      {cancelled && (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={cancelled ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {feedback ? <span style={{ color: BRICK }}>{feedback}</span> : status}
      </p>
    </div>
  );
}
