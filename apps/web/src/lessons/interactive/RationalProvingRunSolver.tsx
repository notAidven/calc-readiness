/**
 * RAT.6 interactive (Verdigris Hold, the Proving Cauldron): the full run on one charge,
 * `(x^2 - 4x)/(x - 6) = 12/(x - 6)`, typed one stage at a time. The learner writes the
 * forbidden list FIRST, then the candidates the clearing produced, then the doses that
 * survive the check. Each stage locks when it is right and posts its row into the figure,
 * so the finished diagram is the shape of the answer the practice set asks for.
 *
 * Every stage is parsed as a SET, so order never matters and `{6, -2}` reads the same as
 * `-2, 6`. That is deliberate rehearsal: the practice grader takes a solution set the same
 * way, and it is the stage-three list that a learner who skips the check gets wrong.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

const EQUATION = "\\dfrac{x^{2} - 4x}{x - 6} = \\dfrac{12}{x - 6}";

interface Stage {
  /** What the learner is asked for, as the field label's math plus its wording. */
  label: string;
  ariaLabel: string;
  expected: readonly number[];
  /** The row this stage posts into the figure once it locks. */
  rowLabel: string;
  rowLatex: string;
  rowColor: string;
  miss: ReactNode;
}

const STAGES: readonly Stage[] = [
  {
    label: "Excluded values",
    ariaLabel: "Excluded values",
    expected: [6],
    rowLabel: "excluded",
    rowLatex: "x \\neq 6",
    rowColor: BRICK,
    miss: (
      <>
        Not that. Read it off the denominator both sides share: the value of{" "}
        <InlineMath latex="x" /> that would make <InlineMath latex="x - 6" /> zero.
      </>
    ),
  },
  {
    label: "Candidates after clearing",
    ariaLabel: "Candidates after clearing denominators",
    expected: [-2, 6],
    rowLabel: "candidates",
    rowLatex: "x = 6 \\quad\\text{or}\\quad x = -2",
    rowColor: LABEL,
    miss: (
      <>
        Multiply both sides by <InlineMath latex="x - 6" />, bring every term to one side,
        and factor. There are two candidates, so list both, separated by a comma.
      </>
    ),
  },
  {
    label: "Solution set",
    ariaLabel: "Solution set",
    expected: [-2],
    rowLabel: "solution",
    rowLatex: "\\{-2\\}",
    rowColor: CIVIC,
    miss: (
      <>
        Hold each candidate against the excluded-value list. One of them matches an excluded
        value that <InlineMath latex="x - 6" /> forbids, so it never belonged to the
        equation you started with.
      </>
    ),
  },
];

/**
 * Parse a typed list of values into a sorted set. Tolerates braces, an `x =` in front of
 * each value, and any spacing, so the learner is graded on the math and not the
 * punctuation. Returns `null` when a piece is not a number.
 */
function parseSet(raw: string): number[] | null {
  const inner = raw
    .trim()
    .replace(/^[{[]/, "")
    .replace(/[}\]]$/, "");
  const pieces = inner
    .split(",")
    .map((piece) => piece.trim().replace(/^[a-z]\s*(=|\u2260|!=)\s*/i, ""))
    .filter((piece) => piece.length > 0);
  if (pieces.length === 0) {
    return null;
  }
  const values: number[] = [];
  for (const piece of pieces) {
    const value = Number(piece.replace(/\u2212/g, "-"));
    if (!Number.isFinite(value)) {
      return null;
    }
    if (!values.includes(value)) {
      values.push(value);
    }
  }
  return values.sort((a, b) => a - b);
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Where each posted row sits in the figure. */
const ROW_Y = [104, 142, 180];

export function RationalProvingRunSolver({ onComplete }: { onComplete?: () => void }) {
  const [stage, setStage] = useState(0);
  const [entry, setEntry] = useState("");
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const solved = stage >= STAGES.length;
  const current = STAGES[stage];

  function check() {
    if (solved || !current) {
      return;
    }
    const parsed = parseSet(entry);
    if (!parsed) {
      setFeedback("Type the values as plain numbers, separated by commas.");
      return;
    }
    if (
      !sameSet(
        parsed,
        [...current.expected].sort((a, b) => a - b),
      )
    ) {
      setFeedback(current.miss);
      return;
    }
    setFeedback(null);
    setEntry("");
    const next = stage + 1;
    setStage(next);
    success();
    if (next >= STAGES.length && !done) {
      setDone(true);
      onComplete?.();
    }
  }

  function reset() {
    setStage(0);
    setEntry("");
    setFeedback(null);
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        That is the whole process: list excluded values, clear denominators, solve, then
        check. The solution set is <InlineMath latex="\{-2\}" />, and{" "}
        <InlineMath latex="x = 6" /> was invented by clearing denominators, so it never goes
        in the answer.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 0) {
    status = (
      <>Start where you always start: which value does the original equation exclude?</>
    );
  } else if (stage === 1) {
    status = (
      <>
        The list is written. Clear denominators and solve, then type every candidate the
        algebra gives you.
      </>
    );
  } else {
    status = (
      <>
        Two candidates on the table. Check each against the excluded-value list, then type
        only what survives.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg
        viewBox="0 0 440 212"
        role="img"
        aria-label="x squared minus 4x over x minus 6 equals 12 over x minus 6, excluded value 6, candidates 6 and negative 2, solution negative 2"
      >
        <title>Solving a rational equation step by step</title>
        <SvgMath latex={EQUATION} x={236} y={48} fontSize={20} w={380} />
        {STAGES.map((row, index) =>
          index < stage ? (
            <g key={row.rowLabel}>
              <text x={8} y={(ROW_Y[index] ?? 0) + 4} fontSize={12} fill={SOFT}>
                {row.rowLabel}
              </text>
              <SvgMath
                latex={row.rowLatex}
                x={248}
                y={ROW_Y[index] ?? 0}
                fontSize={17}
                color={row.rowColor}
                w={320}
              />
            </g>
          ) : null,
        )}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={reset}>
          Start over
        </button>
      ) : (
        current && (
          <div className="lesson-interactive__controls">
            <div className="lesson-interactive__field" style={{ color: current.rowColor }}>
              <span className="lesson-interactive__field-label">{current.label}</span>
              <input
                className="lesson-interactive__input"
                type="text"
                inputMode="text"
                value={entry}
                aria-label={current.ariaLabel}
                onChange={(event) => setEntry(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    check();
                  }
                }}
              />
            </div>
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          </div>
        )
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
