/**
 * POL.4 slide 2: take an equation to the form $(x + h)^{2} = k$, then read the solutions off it.
 *
 * Three answers, judged separately (R28), because they fail separately. The bracket's constant
 * comes from halving; the number on the right comes from adding the same constant to BOTH sides,
 * which is the step that gets dropped; and the pair of solutions comes from keeping both signs,
 * which is the step from the previous lesson that gets dropped instead. One verdict over all
 * three would tell a learner who lost only the second that they had understood none of it.
 *
 * All three rows are live at once, and that is a decision rather than a default: each of the
 * three is determinable from the original equation on its own, so gating a row behind the one
 * above it would make a learner who could answer the last one wait on a row they had missed.
 * A recorded miss does not hold the finished board shut either (R29): the gate turns on every
 * row having been CALLED.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  /** $x^{2} + 2h x + c = 0$, whose completed form is $(x + h)^{2} = h^{2} - c$. */
  h: number;
  c: number;
}

/** Neither board is the slide's own $x^{2} + 6x - 7 = 0$. Both leave a perfect square on the right. */
const BOARDS: readonly Board[] = [
  { h: 4, c: -9 },
  { h: 5, c: -11 },
];

type Verdict = "right" | "wrong";
type RowId = "bracket" | "right" | "roots";

export function CompleteSquareSolver(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <CompleteSquareSolverBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CompleteSquareSolverBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { h, c } = board;
  const middle = 2 * h;
  const rightSide = h * h - c;
  const root = Math.sqrt(rightSide);
  const low = -h - root;
  const high = -h + root;
  const given = `x^{2} + ${middle}x ${c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`} = 0`;

  const [entries, setEntries] = useState<Record<RowId, string>>({
    bracket: "",
    right: "",
    roots: "",
  });
  const [verdicts, setVerdicts] = useState<Partial<Record<RowId, Verdict>>>({});
  const [done, setDone] = useState<Partial<Record<RowId, boolean>>>({});
  const [revealedRow, setRevealedRow] = useState<RowId | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const order: readonly RowId[] = ["bracket", "right", "roots"];
  const openRow = order.find((id) => done[id] !== true) ?? null;
  const settled = openRow === null;

  /**
   * The part a passage on screen is about, which is the one still in hand.
   *
   * Read off the board rather than off a `revealed` flag of the widget's own: the shared layer
   * runs a widget's `onReveal` only on the reveal that lets the learner PAST, never on the one
   * that re-asks, so a flag set there is false over exactly the window the fill is shown in.
   */
  const givenRow = fill.given ? openRow : null;
  const clean = order.every((id) => verdicts[id] === "right");

  const answers: Record<RowId, number | string> = {
    bracket: h,
    right: rightSide,
    roots: `${low},${high}`,
  };

  function accepts(id: RowId, typed: string): boolean {
    const value = typed.trim();
    if (value === "") {
      return false;
    }
    if (id === "roots") {
      const parts = value
        .replace(/[{}]/g, "")
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((part) => !Number.isNaN(part));
      return (
        parts.length === 2 && parts.includes(low) && parts.includes(high) && low !== high
      );
    }
    // Plain entry takes anything, so the box is read before it is compared: a non-number is
    // a miss the note under the row names, not a NaN reaching the comparison.
    const read = readNumericEntry(value, "integer");
    return read.ok && read.value === answers[id];
  }

  function settle(id: RowId, earned: boolean) {
    const next = { ...done, [id]: true };
    setDone(next);
    if (earned) {
      success();
    }
    if (order.every((each) => next[each] === true) && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function check(id: RowId) {
    if (done[id]) {
      return;
    }
    if (accepts(id, entries[id])) {
      setVerdicts({ ...verdicts, [id]: "right" });
      settle(id, true);
      return;
    }
    setVerdicts({ ...verdicts, [id]: "wrong" });
  }

  function reveal(id: RowId) {
    setEntries({
      ...entries,
      [id]: id === "roots" ? `${low}, ${high}` : String(answers[id]),
    });
    setVerdicts({ ...verdicts, [id]: "wrong" });
    setRevealedRow(id);
    settle(id, false);
  }

  const rows: readonly {
    id: RowId;
    stage: string;
    before: string;
    after: string;
    label: string;
    note: React.ReactNode;
    answerLatex: string;
    why: React.ReactNode;
    numeric: boolean;
  }[] = [
    {
      id: "bracket",
      stage: "the bracket",
      before: "(x +",
      after: ")^{2}",
      label: "The constant inside the bracket",
      numeric: true,
      note: (
        <>
          The two strips together supply <InlineMath latex={`${middle}x`} />, so each is
          half of that, and the bracket's constant is a strip's width rather than the whole
          middle coefficient.
        </>
      ),
      answerLatex: `${h}`,
      why: (
        <>
          Half of <InlineMath latex={`${middle}`} /> is <InlineMath latex={`${h}`} />, so
          the completed square is <InlineMath latex={`(x + ${h})^{2}`} />. That bracket
          expands to <InlineMath latex={`x^{2} + ${middle}x + ${h * h}`} />, which is the
          left side with <InlineMath latex={`${h * h}`} /> supplied.
        </>
      ),
    },
    {
      id: "right",
      stage: "the right side",
      before: `(x + ${h})^{2} =`,
      after: "",
      label: "The number on the right",
      numeric: true,
      note: (
        <>
          The constant that completes the square has to be added to BOTH sides, and the
          original constant moves across as well, so two things reach the right-hand side.
        </>
      ),
      answerLatex: `${rightSide}`,
      why: (
        <>
          Moving <InlineMath latex={`${c}`} /> across gives{" "}
          <InlineMath latex={`x^{2} + ${middle}x = ${-c}`} />, and adding{" "}
          <InlineMath latex={`${h * h}`} /> to both sides makes the left a square and takes
          the right to <InlineMath latex={`${-c} + ${h * h} = ${rightSide}`} />. Adding to
          one side only is where this row usually goes wrong.
        </>
      ),
    },
    {
      id: "roots",
      stage: "the solutions",
      before: "x =",
      after: "",
      label: "Both solutions, separated by a comma",
      numeric: false,
      note: (
        <>
          Rooting both sides keeps both signs, so there are two values here rather than one,
          and the constant inside the bracket then moves across.
        </>
      ),
      answerLatex: `${low}, ${high}`,
      why: (
        <>
          <InlineMath latex={`(x + ${h})^{2} = ${rightSide}`} /> gives{" "}
          <InlineMath latex={`x + ${h} = ${root}`} /> or{" "}
          <InlineMath latex={`x + ${h} = -${root}`} />, and subtracting{" "}
          <InlineMath latex={`${h}`} /> from each leaves <InlineMath latex={`${high}`} />{" "}
          and <InlineMath latex={`${low}`} />.
        </>
      ),
    },
  ];

  return (
    <div className="lesson-interactive lesson-interactive--solver">
      <WidgetTask>
        Goal: take this equation to the form <InlineMath latex="(x + h)^{2} = k" /> and then
        read both of its solutions off that form.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={given} color={LABEL} />
      </p>

      <div className="lesson-equation">
        {rows.map((rowSpec) => {
          const isDone = done[rowSpec.id] === true;
          const verdict = verdicts[rowSpec.id] ?? null;
          return (
            <div key={rowSpec.id} data-part-row={rowSpec.stage}>
              <div className="lesson-equation__row" data-state={isDone ? "done" : "open"}>
                <span className="lesson-equation__stage">{rowSpec.stage}</span>
                <span className="lesson-equation__body">
                  <InlineMath latex={rowSpec.before} color={isDone ? CIVIC : LABEL} />
                  <input
                    className="lesson-equation__slot"
                    {...(rowSpec.numeric
                      ? numericEntryProps("integer")
                      : ({ type: "text", inputMode: "text" } as const))}
                    value={entries[rowSpec.id]}
                    readOnly={isDone}
                    aria-label={partName(rowSpec.label, verdict)}
                    onChange={(event) =>
                      setEntries({ ...entries, [rowSpec.id]: event.target.value })
                    }
                    {...(givenRow === rowSpec.id
                      ? fill.entry(
                          rowSpec.id === "roots"
                            ? `${low}, ${high}`
                            : String(answers[rowSpec.id]),
                        )
                      : {})}
                  />
                  {rowSpec.after ? (
                    <InlineMath latex={rowSpec.after} color={isDone ? CIVIC : LABEL} />
                  ) : null}
                </span>
                <span className="lesson-equation__aside">
                  {verdict ? <WidgetPartVerdict verdict={verdict} /> : null}
                  {isDone ? null : (
                    <button
                      type="button"
                      className="lesson-interactive__check lesson-interactive__check--part"
                      onClick={() => check(rowSpec.id)}
                    >
                      Check
                    </button>
                  )}
                </span>
              </div>
              {verdict === "wrong" && !fill.given ? (
                <WidgetPartNote>
                  {rowSpec.numeric && !readNumericEntry(entries[rowSpec.id], "integer").ok
                    ? WHOLE_NUMBER_MISS
                    : rowSpec.note}
                </WidgetPartNote>
              ) : null}
            </div>
          );
        })}
      </div>

      {settled ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different equation
        </button>
      ) : null}

      {openRow !== null && (
        <WidgetReveal
          available={verdicts[openRow] !== undefined && done[openRow] !== true}
          revealed={revealedRow === openRow}
          answer={
            <InlineMath
              latex={rows.find((each) => each.id === openRow)?.answerLatex ?? ""}
            />
          }
          why={rows.find((each) => each.id === openRow)?.why}
          onReveal={() => reveal(openRow)}
          label={`Reveal ${rows.find((each) => each.id === openRow)?.stage ?? "this row"}`}
          othersRemain={order.filter((id) => done[id] !== true).length > 1}
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={settled && clean ? "solved" : settled ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : settled ? (
          <>
            <InlineMath latex={given} /> becomes{" "}
            <InlineMath latex={`(x + ${h})^{2} = ${rightSide}`} color={CIVIC} />, so{" "}
            <InlineMath latex={`x = ${high}`} color={CIVIC} /> or{" "}
            <InlineMath latex={`x = ${low}`} color={CIVIC} />. Nothing here needed the
            quadratic to split into two brackets. Any row you missed has a note under it.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            Each row is checked on its own, and the rows are answered from the top down.
          </span>
        )}
      </p>
    </div>
  );
}
