/**
 * NUM.5 interactive: reduce the rate 120 mi / 2 hr to a unit rate. The learner picks the
 * divisor that scales the bottom to 1 (divide by 2, correct) versus divide by 3 or 4
 * (wrong). On the correct pick, both parts reduce and the second fraction shows the unit
 * rate 60 mi / 1 hr. Gates the lesson once the unit rate is reached.
 */

import { type ReactNode, useState } from "react";

import { InlineMath, LABEL, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const NUM = 120; // 120 mi
const DEN = 2; // 2 hr
const CORRECT = 2;
const DIVISORS = [2, 3, 4] as const;

/** A rate as a real stacked fraction (this replaces the old text/rule/text glyph). */
const rate = (miles: string, hours: string) =>
  `\\dfrac{${miles}\\ \\text{mi}}{${hours}\\ \\text{hr}}`;

export function UnitRatePlay({ onComplete }: { onComplete?: () => void }) {
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const solved = done;

  function pick(divisor: number) {
    if (solved) {
      return;
    }
    if (divisor === CORRECT) {
      setFeedback(null);
      setDone(true);
      success();
      onComplete?.();
      return;
    }
    setFeedback(
      <>
        Dividing by <InlineMath latex={String(divisor)} /> leaves{" "}
        <InlineMath latex={`${DEN} \\div ${divisor}`} />, which is not{" "}
        <InlineMath latex="1\ \text{hr}" />. Pick the divisor that makes the bottom{" "}
        <InlineMath latex="1" />.
      </>,
    );
  }

  function reset() {
    setDone(false);
    setFeedback(null);
  }

  const reduced = solved
    ? rate(String(NUM / CORRECT), String(DEN / CORRECT))
    : rate("?", "?");

  return (
    <div className="lesson-interactive lesson-interactive--unit-rate">
      <svg
        viewBox="0 0 440 120"
        role="img"
        aria-label="Reduce 120 miles per 2 hours to a unit rate of 60 miles per 1 hour"
      >
        <title>Scale a rate down to a unit rate</title>
        <SvgMath
          latex={rate(String(NUM), String(DEN))}
          x={120}
          y={62}
          fontSize={15}
          color={LABEL}
          w={180}
        />
        <line x1={190} y1={62} x2={252} y2={62} stroke={SOFT} strokeWidth={1.5} />
        <path d="M 252 62 L 244 58 L 244 66 Z" fill={SOFT} />
        <SvgMath
          // `\mathord{?}`: `?` is a CLOSE atom in KaTeX, and a binary operator before a close
          // atom is demoted to an ordinary one, so a bare `?` sets this as `÷?`.
          latex={solved ? `\\div ${CORRECT}` : "\\div \\mathord{?}"}
          x={221}
          y={46}
          fontSize={12}
          color={SIGNAL}
          w={80}
        />
        <SvgMath
          latex={reduced}
          x={320}
          y={62}
          fontSize={15}
          color={solved ? LABEL : SOFT}
          w={180}
        />
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          {DIVISORS.map((d) => (
            <button
              key={d}
              type="button"
              className="lesson-interactive__step"
              aria-label={`divide by ${d}`}
              onClick={() => pick(d)}
            >
              <span className="lesson-interactive__step-eq">
                <InlineMath latex={`\\div ${d}`} />
              </span>
            </button>
          ))}
        </div>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Divide both parts by <InlineMath latex={String(CORRECT)} />:{" "}
            <InlineMath
              latex={`\\tfrac{${NUM}\\ \\text{mi}}{${DEN}\\ \\text{hr}} = \\tfrac{${
                NUM / CORRECT
              }\\ \\text{mi}}{1\\ \\text{hr}}`}
            />
            .
          </>
        ) : (
          (feedback ?? (
            <>
              Which divisor turns <InlineMath latex={`${DEN}\\ \\text{hr}`} /> into{" "}
              <InlineMath latex="1\ \text{hr}" />? Divide both parts by it.
            </>
          ))
        )}
      </p>
    </div>
  );
}
