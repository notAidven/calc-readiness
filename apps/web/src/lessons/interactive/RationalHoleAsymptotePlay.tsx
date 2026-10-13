/**
 * RAT.5 interactive (slide 1), the load-bearing call of the whole node: both forbidden
 * doses come off the SAME bottom, and the graph treats them completely differently. The
 * learner rules on each one, and the mark it earns is drawn on the gauge only when the
 * call is right, so the picture is built by the judgement rather than shown alongside it.
 *
 * A wrong tap locks that row as a miss (the board can be retaken from the top), so the two
 * doses cannot be brute-forced against each other. Both chips carry the same neutral
 * token, so colour is never a tell. The recipe appears nowhere else in the lesson.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";
import {
  createGaugePlane,
  GaugeAxes,
  GaugeCurve,
  GaugeHole,
  GaugeTickLabels,
  GaugeVerticalAsymptote,
} from "./RationalGaugePlane";

const ORIGINAL = "P(x) = \\dfrac{(x + 2)(x - 3)}{(x - 3)(x - 5)}";
const REDUCED = "= \\dfrac{x + 2}{x - 5}";

const HOLE_X = 3;
const ASYMPTOTE_X = 5;

const PLANE = createGaugePlane({ xMin: -4, xMax: 10, yMin: -8, yMax: 8 });
const X_TICKS = [-2, 2, 3, 5, 8];
const Y_TICKS = [-6, -3, 3, 6];

function potency(x: number): number {
  return (x + 2) / (x - 5);
}

const HOLE_Y = potency(HOLE_X);

interface Dose {
  value: number;
  /** True when the factor cancels, so the dose is a hole rather than an asymptote. */
  cancels: boolean;
  factor: string;
  aria: string;
}

const DOSES: readonly Dose[] = [
  {
    value: HOLE_X,
    cancels: true,
    factor: "x - 3",
    aria: "the value 3, whose factor x minus 3 appears in both the numerator and the denominator",
  },
  {
    value: ASYMPTOTE_X,
    cancels: false,
    factor: "x - 5",
    aria: "the value 5, whose factor x minus 5 appears only in the denominator",
  },
];

export function RationalHoleAsymptotePlay({ onComplete }: { onComplete?: () => void }) {
  const [calls, setCalls] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const complete = Object.keys(calls).length === DOSES.length;
  const missed = Object.values(calls).some((hit) => !hit);
  const solved = complete && !missed;
  const holeEarned = calls[HOLE_X] === true;
  const asymptoteEarned = calls[ASYMPTOTE_X] === true;

  function answer(dose: Dose, guessHole: boolean) {
    if (calls[dose.value] !== undefined) {
      return;
    }
    const hit = guessHole === dose.cancels;
    const next = { ...calls, [dose.value]: hit };
    setCalls(next);
    if (hit) {
      setFeedback(null);
      success();
    } else {
      setFeedback(
        dose.cancels
          ? "That factor appears in the numerator as well, so it cancels and leaves a hole. Row locked as a miss."
          : "That factor survives in the denominator, so the graph has a vertical asymptote there. Row locked as a miss.",
      );
    }
    // Every row CALLED, not every row called correctly (R29). Ruling wrongly on one excluded
    // value and correctly on the other is a learner who has answered both questions.
    if (Object.keys(next).length === DOSES.length && !fired) {
      setFired(true);
      onComplete?.();
    }
  }

  function reset() {
    setCalls({});
    setFeedback(null);
  }

  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <svg
        viewBox="0 0 440 278"
        role="img"
        aria-label="The graph of x plus 2 times x minus 3 over x minus 3 times x minus 5. It has a hole at 3 and a vertical asymptote at 5."
      >
        <title>One denominator, two very different excluded values</title>

        <GaugeAxes plane={PLANE} xTicks={X_TICKS} yTicks={Y_TICKS} yLatex="P(x)" />
        {asymptoteEarned && <GaugeVerticalAsymptote plane={PLANE} x={ASYMPTOTE_X} />}
        <GaugeCurve plane={PLANE} f={potency} poles={[ASYMPTOTE_X]} />
        {holeEarned && <GaugeHole plane={PLANE} x={HOLE_X} y={HOLE_Y} />}
        <GaugeTickLabels plane={PLANE} xTicks={X_TICKS} yTicks={Y_TICKS} />

        {/* Two stacked fractions, so the rows are spaced by the height of a `\dfrac` at
            this size rather than by the single line the numbers would take. */}
        <SvgMath latex={ORIGINAL} x={210} y={206} fontSize={17} color={LABEL} w={330} />
        <SvgMath latex={REDUCED} x={210} y={252} fontSize={16} color={SOFT} w={330} />
      </svg>

      {/* The board, and the grid every row borrows its columns from: the value, the two calls,
          and the verdict glyph. Without it each row sized its own tracks, so "Vertical
          asymptote" needed a hardcoded 10rem cap that was still narrower than the words. */}
      <div className="lesson-classify">
        {DOSES.map((dose) => {
          const call = calls[dose.value];
          const locked = call !== undefined;
          return (
            <div key={dose.value} className="lesson-classify__row">
              {/* Ink in every state (R26): the excluded value being ruled on is not the thing
                that was right or wrong, and the row's glyph already says which that was. */}
              <span className="lesson-interactive__step-eq">
                <InlineMath latex={`x = ${dose.value}`} color={LABEL} />
              </span>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`${dose.aria}, is a hole`}
                onClick={() => answer(dose, true)}
              >
                A hole
              </button>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`${dose.aria}, is a vertical asymptote`}
                onClick={() => answer(dose, false)}
              >
                Vertical asymptote
              </button>
              <span
                className="lesson-classify__check"
                style={{ color: call ? CIVIC : BRICK }}
              >
                {locked ? (call ? "\u2713" : "\u2717") : ""}
              </span>
            </div>
          );
        })}
      </div>

      {complete && (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          {missed ? "Try again" : "Start over"}
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed || feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Both values came from the same denominator.{" "}
            <span style={{ color: SIGNAL }}>The cancelled factor</span> leaves a hole at{" "}
            <InlineMath latex="x = 3" />, and the surviving <InlineMath latex="x - 5" />{" "}
            gives a vertical asymptote at <InlineMath latex="x = 5" />.
          </>
        ) : (
          (feedback ??
          (complete && missed ? (
            "A factor that also appears in the numerator cancels and leaves a hole; a factor that only sits underneath gives a vertical asymptote. A fresh board is ready when you are."
          ) : (
            <>
              Rule on each excluded value. Ask whether that factor also appears in the
              numerator of <InlineMath latex="(x + 2)(x - 3)" />.
            </>
          )))
        )}
      </p>
    </div>
  );
}
