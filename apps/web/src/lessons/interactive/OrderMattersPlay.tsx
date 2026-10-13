/**
 * NUM.2 interactive: order matters in 3 + 4 x 2. The learner chooses which operation to
 * do first. Choosing "multiply 4 x 2" reveals the correct reduction 3 + 8 = 11 and gates
 * the lesson. Choosing "add 3 + 4" shows the wrong left-to-right result 14 crossed out
 * with a nudge, and lets the learner try again.
 */

import { useState } from "react";

import {
  BRICK,
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LINE,
  SvgMath,
  stackGapMid,
} from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

type Choice = "mul" | "add";

const START: readonly EqToken[] = [
  { text: "3", role: "addsub" },
  { text: "+", role: "addsub" },
  { text: "4", role: "muldiv" },
  { text: "\\times", role: "muldiv" },
  { text: "2", role: "muldiv" },
];

export function OrderMattersPlay({ onComplete }: { onComplete?: () => void }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const solved = choice === "mul";

  function pick(next: Choice) {
    setChoice(next);
    if (next === "mul" && !done) {
      setDone(true);
      success();
      onComplete?.();
    }
  }

  function reset() {
    setChoice(null);
  }

  // Match `PemdasStepSolver`: every row centers on `y`, arrows sit at `stackGapMid`.
  const cx = 220;
  const top = 34;
  const rowH = 44;
  const labelY = top + rowH;
  const stepY = top + 2 * rowH;
  const resultY = top + 3 * rowH;
  const svgHeight = resultY + 24;

  return (
    <div className="lesson-interactive lesson-interactive--order-matters">
      <svg
        viewBox={`0 0 440 ${svgHeight}`}
        role="img"
        aria-label="In 3 plus 4 times 2, multiply first to get 11; adding left to right wrongly gives 14"
      >
        <title>Which operation comes first?</title>
        <EquationRow cx={cx} y={top} fontSize={22} tokens={START} />

        {choice && (
          <>
            <text
              x={cx}
              y={stackGapMid(top, labelY)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fill={LINE}
            >
              &#8595;
            </text>
            <SvgMath
              latex={solved ? "\\times \\text{ first}" : "\\text{left} \\to \\text{right}"}
              x={cx}
              y={labelY}
              fontSize={12}
              color={solved ? CIVIC : BRICK}
            />
            <text
              x={cx}
              y={stackGapMid(labelY, stepY)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fill={LINE}
            >
              &#8595;
            </text>
            <EquationRow
              cx={cx}
              y={stepY}
              fontSize={20}
              tokens={
                solved
                  ? [{ text: "3 + 8", role: "addsub" }]
                  : [{ text: "7 \\times 2", role: "muldiv" }]
              }
            />
            <text
              x={cx}
              y={stackGapMid(stepY, resultY)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fill={LINE}
            >
              &#8595;
            </text>
            <SvgMath
              latex={solved ? "11" : "14"}
              x={cx}
              y={resultY}
              fontSize={22}
              color={solved ? CIVIC : BRICK}
              strike={!solved}
            />
            {solved ? (
              <path
                d={`M ${248 - 6} ${resultY} l 4 5 l 8 -10`}
                fill="none"
                stroke={CIVIC}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <g stroke={BRICK} strokeWidth={2.5} strokeLinecap="round">
                <line x1={248 - 5} y1={resultY - 5} x2={248 + 5} y2={resultY + 5} />
                <line x1={248 - 5} y1={resultY + 5} x2={248 + 5} y2={resultY - 5} />
              </g>
            )}
          </>
        )}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__step"
            style={{ color: CIVIC, borderColor: CIVIC }}
            onClick={() => pick("mul")}
          >
            Multiply <InlineMath latex="4 \times 2" /> first
          </button>
          <button
            type="button"
            className="lesson-interactive__step"
            style={{ color: BRICK, borderColor: BRICK }}
            onClick={() => pick("add")}
          >
            Add <InlineMath latex="3 + 4" /> first
          </button>
        </div>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : choice === "add" ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Multiply before add: <InlineMath latex="3 + 4 \times 2 = 3 + 8 = 11" />.
          </>
        ) : choice === "add" ? (
          <>
            Going left to right gives <InlineMath latex="14" />, but order matters.
            Multiplication comes before addition.
          </>
        ) : (
          <>
            In <InlineMath latex="3 + 4 \times 2" />, which operation should you do first?
          </>
        )}
      </p>
    </div>
  );
}
