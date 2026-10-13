/**
 * FUN.3 slide 0: which piece owns this input, decided before any arithmetic happens.
 *
 * The whole node turns on this one question, and it is the only mistake the node is really
 * about: a learner who substitutes into the wrong formula computes flawlessly and reports a
 * number that is not the function's value. So this board deliberately asks for NO arithmetic
 * at all. Each row names an input and the learner calls the piece of the definition whose
 * condition it satisfies; the formulas in those pieces are on screen the whole time and are
 * never needed.
 *
 * Every board carries three conditions and at least two rows whose input sits exactly ON a
 * break point, so the strict / non-strict distinction is what settles them rather than a
 * glance at the size of the number. The two boards flip which side of each break is closed,
 * so the second cannot be answered by remembering the first.
 *
 * A wrong call LOCKS its row and the gate opens only on a clean board, which is what keeps a
 * three-option call a question rather than an activity with retries. A settled row keeps all
 * three options on screen, disabled and marked: the learner's own pick is a verdict in `CIVIC`
 * or `BRICK`, and the call that was right on a row they MISSED is `SIGNAL_DEEP` and dashed,
 * because green there would credit a pick nobody made.
 */

import { Fragment, type ReactNode, useRef, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

/** What a marked option is saying, in every channel it says it in. */
const MARKS = {
  /** Their pick, and it was right. The one mark that gets a fill. */
  chosenRight: {
    colour: CIVIC,
    style: "solid",
    fill: `color-mix(in srgb, ${CIVIC} 15%, var(--paper))`,
    glyph: "\u2713",
    spoken: "your answer, correct",
  },
  /** Their pick, and it was wrong. Outline only, so a fill never means "wrong". */
  chosenWrong: {
    colour: BRICK,
    style: "solid",
    fill: undefined,
    glyph: "\u2717",
    spoken: "your answer, wrong",
  },
  /** Not their pick: the condition that held here. A standing mark, so not green. */
  standing: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    fill: undefined,
    glyph: "\u2713",
    spoken: "the condition that holds here, which you did not pick",
  },
} as const;

type MarkName = keyof typeof MARKS;

interface Row {
  id: string;
  /** The input being placed, as LaTeX. */
  latex: string;
  spoken: string;
  /** Which of the board's conditions is the one it satisfies. */
  right: 0 | 1 | 2;
  /** ONE sentence: why the condition the learner picked is not the one that holds. */
  note: string;
  /** The fuller reasoning, printed by the board's reveal when this row was missed. */
  why: ReactNode;
}

interface Board {
  /** The whole definition, as a `cases` block. */
  definition: string;
  /** The same definition read aloud, for the accessible name. */
  spoken: string;
  /** The three conditions, in the order they are drawn under every row. */
  conditions: readonly { latex: string; spoken: string }[];
  rows: readonly Row[];
}

/**
 * What each option is CALLED on the chip: the line of the definition, by its place in it.
 *
 * The conditions themselves are typeset once, in the `cases` block overhead, and are not
 * repeated on the buttons. Two reasons, and the second is the one that decided it:
 *
 *  - A worded call is what every other classify board in the tree offers, and a chip is a
 *    control the learner reads rather than a place to restate the board.
 *  - `x < -2` typeset into a chip needs a box the row cannot give it on a 390px phone. The
 *    condition is three inches above the button either way, so nothing is lost by naming the
 *    line instead of reprinting it, and the full condition stays in the accessible name below.
 *
 * Reading the signs is still the whole question: which LINE owns `x = -2` cannot be answered
 * without them, and the two boards close opposite sides of each break so the ordinals rotate.
 */
const CALLS = ["First piece", "Middle piece", "Last piece"] as const;

/**
 * Two boards. The first closes each break on its RIGHT-hand stretch and the second closes
 * each on its LEFT, so a learner who settled the first board by position has to read the
 * inequality signs on the second. Neither definition is the check's freight rate.
 */
const BOARDS: readonly Board[] = [
  {
    definition:
      "f(x) = \\begin{cases} -3 & x < -2 \\\\ 2x + 1 & -2 \\le x < 3 \\\\ 12 & x \\ge 3 \\end{cases}",
    spoken:
      "f of x equals negative 3 when x is less than negative 2, 2x plus 1 when x is at least negative 2 and less than 3, and 12 when x is at least 3",
    conditions: [
      { latex: "x < -2", spoken: "x is less than negative 2" },
      {
        latex: "-2 \\le x < 3",
        spoken: "x is at least negative 2 and less than 3",
      },
      { latex: "x \\ge 3", spoken: "x is at least 3" },
    ],
    rows: [
      {
        id: "a-r1",
        latex: "x = -6",
        spoken: "x equals negative 6",
        right: 0,
        note: "This input sits below negative 2, and the middle stretch starts at negative 2, so it never reaches this input.",
        why: (
          <>
            <InlineMath latex="-6" /> is further left than <InlineMath latex="-2" />, so the
            only condition it satisfies is <InlineMath latex="x < -2" />. The middle stretch
            has a floor at <InlineMath latex="-2" /> and this input is under it.
          </>
        ),
      },
      {
        id: "a-r2",
        latex: "x = -2",
        spoken: "x equals negative 2",
        right: 1,
        note: "The first condition is a strict less-than, so it stops short of this input, while the middle one is written with an at-least sign and takes it in.",
        why: (
          <>
            The break at <InlineMath latex="-2" /> is claimed by whichever side is written
            without the strictness. <InlineMath latex="x < -2" /> excludes it and{" "}
            <InlineMath latex="-2 \le x" /> includes it, so the middle stretch owns this
            input.
          </>
        ),
      },
      {
        id: "a-r3",
        latex: "x = 1",
        spoken: "x equals 1",
        right: 1,
        note: "This input lies between the two break points, which is exactly the stretch the middle condition describes.",
        why: (
          <>
            <InlineMath latex="1" /> is above <InlineMath latex="-2" /> and below{" "}
            <InlineMath latex="3" />, so it satisfies both halves of{" "}
            <InlineMath latex="-2 \le x < 3" /> at once. A double condition has to be read
            as two tests, and this input passes each of them.
          </>
        ),
      },
      {
        id: "a-r4",
        latex: "x = 3",
        spoken: "x equals 3",
        right: 2,
        note: "The middle condition stops strictly below this input, so the last stretch is the one that reaches it.",
        why: (
          <>
            The middle stretch runs up to <InlineMath latex="3" /> without arriving, because
            its ceiling is written <InlineMath latex="x < 3" />. The last condition is{" "}
            <InlineMath latex="x \ge 3" />, so this input belongs to it.
          </>
        ),
      },
    ],
  },
  {
    definition:
      "g(t) = \\begin{cases} 4t & t \\le 1 \\\\ 9 - t & 1 < t \\le 6 \\\\ 2t - 8 & t > 6 \\end{cases}",
    spoken:
      "g of t equals 4t when t is at most 1, 9 minus t when t is above 1 and at most 6, and 2t minus 8 when t is above 6",
    conditions: [
      { latex: "t \\le 1", spoken: "t is at most 1" },
      { latex: "1 < t \\le 6", spoken: "t is above 1 and at most 6" },
      { latex: "t > 6", spoken: "t is above 6" },
    ],
    rows: [
      {
        id: "b-r1",
        latex: "t = 1",
        spoken: "t equals 1",
        right: 0,
        note: "Here it is the FIRST condition that is written without the strictness, so the break belongs to it and the middle stretch starts just above.",
        why: (
          <>
            <InlineMath latex="t \le 1" /> takes in <InlineMath latex="1" /> itself, and the
            middle condition opens with <InlineMath latex="1 < t" />, which does not. The
            closed side has moved to the left here, so the break is the first stretch's.
          </>
        ),
      },
      {
        id: "b-r2",
        latex: "t = 6",
        spoken: "t equals 6",
        right: 1,
        note: "The middle condition ends with an at-most sign, so it reaches this input, and the last one starts strictly above it.",
        why: (
          <>
            The upper end of the middle stretch is written <InlineMath latex="t \le 6" />,
            which includes <InlineMath latex="6" />, while the last condition is{" "}
            <InlineMath latex="t > 6" /> and starts past it. So the middle stretch owns this
            input.
          </>
        ),
      },
      {
        id: "b-r3",
        latex: "t = -3",
        spoken: "t equals negative 3",
        right: 0,
        note: "This input is well below the first break point, so the first stretch is the only one that reaches it.",
        why: (
          <>
            <InlineMath latex="-3" /> is below <InlineMath latex="1" />, so{" "}
            <InlineMath latex="t \le 1" /> holds. The other two stretches both begin above{" "}
            <InlineMath latex="1" />, so neither of them can reach this input.
          </>
        ),
      },
      {
        id: "b-r4",
        latex: "t = 10",
        spoken: "t equals 10",
        right: 2,
        note: "This input is past the second break point, and the middle stretch is capped there.",
        why: (
          <>
            <InlineMath latex="10" /> is above <InlineMath latex="6" />, so the only
            condition left is <InlineMath latex="t > 6" />. The middle stretch is capped at{" "}
            <InlineMath latex="6" />, so it stops before this input.
          </>
        ),
      },
    ],
  },
];

export function PiecewisePieceSelect(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <PiecewisePieceSelectBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function PiecewisePieceSelectBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Row id -> the condition the learner called, as an index into `board.conditions`. */
  const [calls, setCalls] = useState<Record<string, number>>({});
  /**
   * The same map, authoritative inside the handler. Two rows answered in quick succession
   * are two updates against one render, so reading `calls` out of the closure would drop the
   * first call and the board would never be seen as finished.
   */
  const callsRef = useRef<Record<string, number>>({});
  const [walked, setWalked] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const complete = Object.keys(calls).length === board.rows.length;
  const missedRows = board.rows.filter(
    (row) => calls[row.id] !== undefined && calls[row.id] !== row.right,
  );
  const missed = missedRows.length > 0;
  const solved = complete && !missed;

  function answer(row: Row, took: number) {
    if (callsRef.current[row.id] !== undefined) {
      return;
    }
    const next = { ...callsRef.current, [row.id]: took };
    callsRef.current = next;
    setCalls(next);
    if (took !== row.right) {
      return;
    }
    success();
    const clean = board.rows.every((candidate) => next[candidate.id] === candidate.right);
    if (clean && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** Every option renders in the SAME neutral token until its row settles. */
  const neutral = { color: LABEL, borderColor: LINE };

  /** The condition that held on each missed row, named beside the input it belongs to. */
  const missedCalls = (
    <>
      {missedRows.map((row, at) => (
        <Fragment key={row.id}>
          {at === 0 ? null : at === missedRows.length - 1 ? " and " : ", "}
          <InlineMath latex={row.latex} />
          {": "}
          <InlineMath latex={board.conditions[row.right]?.latex ?? ""} />
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: settle every input on the board by naming the piece of the definition whose
        condition it satisfies. No arithmetic is needed, and the formulas are here only so
        you can see which condition each of them belongs to.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={board.definition} color={LABEL} />
      </p>

      <div className="lesson-classify">
        {board.rows.map((row) => {
          const call = calls[row.id];
          const locked = call !== undefined;
          const markOf = (at: number): MarkName | null => {
            if (!locked) {
              return null;
            }
            const right = at === row.right;
            if (at === call) {
              return right ? "chosenRight" : "chosenWrong";
            }
            return right && call !== row.right ? "standing" : null;
          };
          return (
            <div
              key={row.id}
              className="lesson-classify__item"
              data-settled={locked ? "true" : undefined}
            >
              <div className="lesson-classify__row">
                {/* Ink in every state: the verdict belongs on the options, and tinting the
                  input by the learner's correctness would make an ordinary number look like
                  the thing that was wrong. */}
                <span className="lesson-interactive__step-eq">
                  <InlineMath latex={row.latex} color={LABEL} />
                </span>
                {board.conditions.map((condition, at) => {
                  const name = markOf(at);
                  const mark = name === null ? null : MARKS[name];
                  return (
                    <button
                      key={condition.latex}
                      type="button"
                      className="lesson-interactive__chip"
                      data-mark={name ?? undefined}
                      disabled={locked}
                      aria-label={
                        mark === null
                          ? `${row.spoken}: ${CALLS[at]}, ${condition.spoken}`
                          : `${row.spoken}: ${CALLS[at]}, ${condition.spoken}, ${mark.spoken}`
                      }
                      style={
                        mark === null
                          ? neutral
                          : {
                              color: mark.colour,
                              borderColor: mark.colour,
                              borderStyle: mark.style,
                              background: mark.fill,
                            }
                      }
                      onClick={() => answer(row, at)}
                    >
                      {CALLS[at]}
                      {mark === null ? null : (
                        <span aria-hidden="true" className="lesson-classify__mark">
                          {mark.glyph}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* The whole of what a missed row says, under the row it is about rather than
                in the shared status line the next row's answer would overwrite. */}
              {locked && call !== row.right ? (
                <p className="lesson-classify__note" data-state="wrong" role="status">
                  {row.note}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {complete && (
        <div className="lesson-interactive__controls">
          <WidgetReveal
            available={missed}
            revealed={walked}
            answer={missedCalls}
            why={missedRows.map((row) => <Fragment key={row.id}>{row.why} </Fragment>)}
            onReveal={() => setWalked(true)}
            label="Show the working"
            // Read off the board rather than passed as a constant. Every row has been called
            // by the time this control exists, so there is nothing left to hand back.
            othersRemain={board.rows.some((row) => calls[row.id] === undefined)}
          />
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {missed ? "Try a fresh set of inputs" : "Start over on the other function"}
          </button>
        </div>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : complete && missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Every input placed, and none of them needed a single multiplication. The
            conditions cover the whole input range between them and never overlap, so
            exactly one of them holds for any input you are handed.
          </>
        ) : complete && missed ? (
          "The board is finished with a call that did not hold. The reasoning is below, and a fresh set of inputs follows it."
        ) : (
          <>
            Compare the input against each condition in turn. Where the input lands exactly
            on a break point, the sign is what settles it: a strict one leaves the input out
            and <InlineMath latex="\le" /> or <InlineMath latex="\ge" /> takes it in.
          </>
        )}
      </p>
    </div>
  );
}
