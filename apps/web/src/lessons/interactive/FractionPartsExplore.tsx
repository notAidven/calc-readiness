/**
 * NUM.F interactive (slide 0): name the two parts of a fraction.
 *
 * The fraction is drawn as three separate pieces (numerator, bar, denominator) rather
 * than handed to KaTeX as one `\dfrac`, because a stacked fraction renders as a single
 * box and the whole point here is to point AT the top number and the bottom number
 * separately. Each number carries a real button, so the learner clicks the math itself
 * and the widget stays keyboard operable.
 *
 * The reveal is ordered on purpose: the denominator comes first because it is what makes
 * the parts exist. Until the whole is cut into four, "three of them" means nothing. So
 * naming the bottom number splits the bar, and only then does naming the top number
 * shade three of those parts. Tapping out of order says why rather than just refusing.
 *
 * Gates the lesson once both parts are named. The fraction is 3/4, which the CFU
 * (2/5 x 5/6) does not reuse.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const N = 3;
const D = 4;

/* The fraction, drawn piece by piece on the left. */
const FX = 84; // centre line of the fraction
const NUM_Y = 66; // numerator centre
const BAR_Y = 100; // the fraction bar
const DEN_Y = 134; // denominator centre
const HALF_W = 30; // half the fraction bar's width
const HIT_W = 64;
const HIT_H = 44;

/* The bar model on the right. */
const BAR_X = 176;
const BAR_W = 236;
const BAR_TOP = 78;
const BAR_H = 44;

/** 0 = nothing named, 1 = denominator named, 2 = both named. */
type Step = 0 | 1 | 2;

export function FractionPartsExplore({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const solved = step === 2;
  const cell = BAR_W / D;

  function nameDenominator() {
    if (step !== 0) {
      return;
    }
    setFeedback(null);
    setStep(1);
    success();
  }

  function nameNumerator() {
    if (step === 0) {
      setFeedback(
        "Start with the bottom number. Until you know how many equal parts the whole was cut into, counting them means nothing.",
      );
      return;
    }
    if (step !== 1) {
      return;
    }
    setFeedback(null);
    setStep(2);
    success();
    if (!done) {
      setDone(true);
      onComplete?.();
    }
  }

  function reset() {
    setStep(0);
    setFeedback(null);
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        <InlineMath latex={`\\dfrac{${N}}{${D}}`} />: the denominator sets how many equal
        parts the whole is cut into, and the numerator counts how many of them you have.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (step === 1) {
    status =
      "The bottom number is the denominator, so the whole is cut into four equal parts. Now click the number that counts how many of those parts you have.";
  } else {
    status = "Click the number that tells you how many equal parts the whole was cut into.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--fraction-parts">
      <svg
        viewBox="0 0 440 210"
        role="img"
        aria-label="The fraction three fourths beside a bar cut into four equal parts with three shaded"
      >
        <title>The numerator and the denominator of three fourths</title>

        {/* The fraction, drawn as separate pieces so each number is its own target. */}
        <SvgMath
          latex={String(N)}
          x={FX}
          y={NUM_Y}
          fontSize={30}
          color={step === 2 ? CIVIC : LABEL}
          w={120}
        />
        <line
          x1={FX - HALF_W}
          y1={BAR_Y}
          x2={FX + HALF_W}
          y2={BAR_Y}
          stroke={LINE}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <SvgMath
          latex={String(D)}
          x={FX}
          y={DEN_Y}
          fontSize={30}
          color={step >= 1 ? SIGNAL : LABEL}
          w={120}
        />

        {/* Part names appear only once the learner has named them. */}
        {step === 2 && (
          <text x={FX} y={26} textAnchor="middle" fontSize={13} fill={CIVIC}>
            numerator
          </text>
        )}
        {step >= 1 && (
          <text x={FX} y={182} textAnchor="middle" fontSize={13} fill={SIGNAL}>
            denominator
          </text>
        )}

        {/* The bar model: one whole, then cut into parts, then shaded. */}
        {step === 2 && (
          <rect
            x={BAR_X}
            y={BAR_TOP}
            width={cell * N}
            height={BAR_H}
            fill={CIVIC}
            fillOpacity={0.85}
          />
        )}
        {step >= 1 &&
          Array.from({ length: D - 1 }, (_, i) => (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid of equal cells
              key={i}
              x1={BAR_X + (i + 1) * cell}
              y1={BAR_TOP}
              x2={BAR_X + (i + 1) * cell}
              y2={BAR_TOP + BAR_H}
              stroke={SIGNAL}
              strokeWidth={1.5}
            />
          ))}
        <rect
          x={BAR_X}
          y={BAR_TOP}
          width={BAR_W}
          height={BAR_H}
          fill="none"
          stroke={LINE}
          strokeWidth={1.5}
        />
        <text
          x={BAR_X + BAR_W / 2}
          y={BAR_TOP + BAR_H + 24}
          textAnchor="middle"
          fontSize={13}
          fill={SOFT}
        >
          {step === 0
            ? "one whole"
            : step === 1
              ? "four equal parts"
              : "three of the four parts"}
        </text>

        {/* Hit targets last, so nothing painted above can swallow a click. */}
        <foreignObject
          x={FX - HIT_W / 2}
          y={NUM_Y - HIT_H / 2}
          width={HIT_W}
          height={HIT_H}
          style={{ overflow: "visible" }}
        >
          <button
            type="button"
            aria-label="the top number of the fraction"
            disabled={solved}
            onClick={nameNumerator}
            style={{
              width: "100%",
              height: "100%",
              padding: 0,
              borderRadius: 8,
              border: `1.5px dashed ${step === 2 ? CIVIC : LINE}`,
              background: "transparent",
              cursor: solved ? "default" : "pointer",
            }}
          />
        </foreignObject>
        <foreignObject
          x={FX - HIT_W / 2}
          y={DEN_Y - HIT_H / 2}
          width={HIT_W}
          height={HIT_H}
          style={{ overflow: "visible" }}
        >
          <button
            type="button"
            aria-label="the bottom number of the fraction"
            disabled={step >= 1}
            onClick={nameDenominator}
            style={{
              width: "100%",
              height: "100%",
              padding: 0,
              borderRadius: 8,
              border: `1.5px dashed ${step >= 1 ? SIGNAL : LINE}`,
              background: "transparent",
              cursor: step >= 1 ? "default" : "pointer",
            }}
          />
        </foreignObject>
      </svg>

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
        {status}
      </p>
    </div>
  );
}
