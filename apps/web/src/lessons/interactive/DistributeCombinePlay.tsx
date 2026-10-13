/**
 * NUM.4 interactive: reduce 2(x + 3) + 4x one move at a time (in the PemdasStepSolver
 * click-through style). The learner taps the action to apply next: distribute the 2 first,
 * then combine like terms. Each correct move reveals the next reduced row; a wrong move
 * nudges without advancing. The lesson gate opens once the expression reaches 6x + 6.
 */

import { type ReactNode, useState } from "react";
import type { EqToken } from "../svgKit";
import { CIVIC, EquationRow, InlineMath, LINE, stackGapMid } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

interface Action {
  /** Stable identity for the React key and the shuffle, since `label` is now typeset. */
  key: string;
  label: ReactNode;
  correct: boolean;
  nudge?: ReactNode;
}

interface Step {
  result: EqToken[];
  actions: Action[];
}

const START: EqToken[] = [{ text: "2(x + 3) + 4x" }];

const STEPS: Step[] = [
  {
    result: [
      { text: "2x", color: CIVIC },
      { text: "+" },
      { text: "6" },
      { text: "+" },
      { text: "4x", color: CIVIC },
    ],
    actions: [
      {
        key: "distribute",
        label: (
          <>
            Distribute the <InlineMath latex="2" />
          </>
        ),
        correct: true,
      },
      {
        key: "combine-2-4",
        label: (
          <>
            Combine <InlineMath latex="2" /> and <InlineMath latex="4" />
          </>
        ),
        correct: false,
        nudge: (
          <>
            Not yet. The <InlineMath latex="2" /> is still attached to the parentheses, and{" "}
            <InlineMath latex="2" /> is not a like term with <InlineMath latex="4x" />.
            Distribute the <InlineMath latex="2" /> first.
          </>
        ),
      },
    ],
  },
  {
    result: [{ text: "6x", color: CIVIC }, { text: "+" }, { text: "6" }],
    actions: [
      { key: "combine-like", label: "Combine like terms", correct: true },
      {
        key: "add-6-4x",
        label: (
          <>
            Add <InlineMath latex="6" /> and <InlineMath latex="4x" />
          </>
        ),
        correct: false,
        nudge: (
          <>
            <InlineMath latex="6" /> is a constant and <InlineMath latex="4x" /> is an{" "}
            <InlineMath latex="x" />
            -term, so they are not like terms. Combine the <InlineMath latex="x" />
            -terms <InlineMath latex="2x" /> and <InlineMath latex="4x" /> instead.
          </>
        ),
      },
    ],
  },
];

/** Fisher-Yates shuffle returning a new array so the correct action is not always first. */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function DistributeCombinePlay({ onComplete }: { onComplete?: () => void }) {
  const [revealed, setRevealed] = useState(0);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const [order, setOrder] = useState(() => STEPS.map((s) => shuffle(s.actions)));
  const success = useWidgetSuccess();

  const solved = revealed >= STEPS.length;
  const currentActions = solved ? [] : (order[revealed] ?? []);

  function pick(action: Action) {
    if (solved) {
      return;
    }
    if (action.correct) {
      setFeedback(null);
      const next = revealed + 1;
      setRevealed(next);
      success();
      if (next >= STEPS.length && !done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    setFeedback(action.nudge ?? "Not yet. Try a different move.");
  }

  function reset() {
    setRevealed(0);
    setFeedback(null);
    setOrder(STEPS.map((s) => shuffle(s.actions)));
  }

  const rows: EqToken[][] = [START, ...STEPS.slice(0, revealed).map((s) => s.result)];
  const cx = 220;
  const top = 34;
  const rowH = 46;
  const fontSize = 20;
  const height = top + (rows.length - 1) * rowH + 30;

  return (
    <div className="lesson-interactive lesson-interactive--reduce">
      <svg
        viewBox={`0 0 440 ${height}`}
        role="img"
        aria-label="Reduce 2 times (x plus 3) plus 4x one move at a time"
      >
        <title>Distribute first, then combine like terms</title>
        {rows.map((tokens, index) => {
          const y = top + index * rowH;
          const yPrev = top + (index - 1) * rowH;
          const gapMid = stackGapMid(yPrev, y);
          return (
            <g key={tokens.map((t) => t.text).join()}>
              {index > 0 && (
                <text
                  x={cx}
                  y={gapMid}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fill={LINE}
                >
                  {"\u2193"}
                </text>
              )}
              <EquationRow cx={cx} y={y} fontSize={fontSize} tokens={tokens} />
            </g>
          );
        })}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          {currentActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="lesson-interactive__step"
              onClick={() => pick(action)}
            >
              {action.label}
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
            Distribute first, then combine like terms: <InlineMath latex="2(x + 3) + 4x" />{" "}
            becomes <InlineMath latex="6x + 6" />.
          </>
        ) : (
          (feedback ?? "Which move comes next? Tap the action to apply it.")
        )}
      </p>
    </div>
  );
}
