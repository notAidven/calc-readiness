/**
 * EL.4 slide 1: the vertical asymptote, sorted out one input at a time.
 *
 * Three bins rather than two, because the slide's claim has three cases and a two-way board
 * would have to drop one of them: an input above one gives a value above zero, an input
 * between zero and one gives a value below zero, and an input at zero or under it gives no
 * value at all. The third bin is the asymptote. A board that only offered "above" and "below"
 * would have taught the plunge and hidden the wall the plunge runs beside.
 *
 * A wrong call LOCKS the row, and the gate opens only on a clean board, which is what keeps a
 * three-option question a question rather than an activity with retries. A settled row keeps
 * all three options on screen, disabled and marked, because the teaching here is the
 * comparison. The palette follows the shared rule: the learner's own pick is a verdict in
 * `CIVIC` or `BRICK`, and the call that was right on a row they MISSED is `SIGNAL_DEEP` and
 * dashed, since green there would credit a pick nobody made.
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

/** The three calls, in the order they are drawn under every row. */
const CALLS = ["Above zero", "Below zero", "No value"] as const;

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
  /** Not their pick: the call that was right here. A standing mark, so not green. */
  standing: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    fill: undefined,
    glyph: "\u2713",
    spoken: "the right call here, which you did not pick",
  },
} as const;

type MarkName = keyof typeof MARKS;

interface Row {
  id: string;
  /** The logarithm being called, as LaTeX. */
  latex: string;
  spoken: string;
  /** Which of `CALLS` is the right one. */
  right: 0 | 1 | 2;
  /** ONE sentence: why the call the learner made was not the right one. */
  note: string;
  /** The fuller reasoning, printed by the board's reveal when this row was missed. */
  why: ReactNode;
}

/**
 * Two boards, one on the common logarithm and one on the natural logarithm, so neither can be
 * answered by pattern-matching the numerals on the other. Every board offers all three calls,
 * so no row can be settled by elimination.
 */
const BOARDS: readonly (readonly Row[])[] = [
  [
    {
      id: "b0-r1",
      latex: "\\log 1000",
      spoken: "log of 1000",
      right: 0,
      note: "The input is above 1, so reaching it takes a positive number of factors of 10 and the value comes out above zero.",
      why: (
        <>
          <InlineMath latex="10^{3} = 1000" />, so <InlineMath latex="\log 1000 = 3" />.
          Every input above <InlineMath latex="1" /> needs a positive exponent, so the whole
          right-hand part of the curve sits above the horizontal axis.
        </>
      ),
    },
    {
      id: "b0-r2",
      latex: "\\log 0.01",
      spoken: "log of 0.01",
      right: 1,
      note: "The input lies between 0 and 1, and only a negative exponent takes 10 below 1, so the value is negative.",
      why: (
        <>
          <InlineMath latex="10^{-2} = 0.01" />, so <InlineMath latex="\log 0.01 = -2" />.
          Inputs between <InlineMath latex="0" /> and <InlineMath latex="1" /> are exactly
          where the curve runs below the axis, and the closer the input creeps to{" "}
          <InlineMath latex="0" /> the further down it goes.
        </>
      ),
    },
    {
      id: "b0-r3",
      latex: "\\log 0",
      spoken: "log of 0",
      right: 2,
      note: "No exponent takes 10 to 0, so there is nothing for this logarithm to hand back.",
      why: (
        <>
          A logarithm hands back an exponent, and no exponent takes{" "}
          <InlineMath latex="10" /> to <InlineMath latex="0" />: the powers get smaller and
          smaller without ever arriving. So there is no value here at all, and{" "}
          <InlineMath latex="x = 0" /> is the vertical asymptote rather than a point of the
          graph.
        </>
      ),
    },
    {
      id: "b0-r4",
      latex: "\\log(-5)",
      spoken: "log of negative 5",
      right: 2,
      note: "Every power of 10 is positive, so no exponent produces a negative number and this logarithm has no value.",
      why: (
        <>
          <InlineMath latex="10" /> raised to anything at all is positive, so no exponent
          produces <InlineMath latex="-5" />. Negative inputs are outside the domain
          altogether, which is why the curve exists only to the right of{" "}
          <InlineMath latex="x = 0" />.
        </>
      ),
    },
  ],
  [
    {
      id: "b1-r1",
      latex: "\\ln e^{4}",
      spoken: "l n of e to the 4",
      right: 0,
      note: "The natural logarithm returns the exponent on e, and that exponent is positive here.",
      why: (
        <>
          The natural logarithm has base <InlineMath latex="e" />, so it returns the
          exponent it finds: <InlineMath latex="\ln e^{4} = 4" />. The input{" "}
          <InlineMath latex="e^{4}" /> is well above <InlineMath latex="1" />, and every
          input above <InlineMath latex="1" /> gives a value above zero.
        </>
      ),
    },
    {
      id: "b1-r2",
      latex: "\\ln \\dfrac{1}{e}",
      spoken: "l n of one over e",
      right: 1,
      note: "A reciprocal is a negative power, so the exponent this returns is below zero.",
      why: (
        <>
          <InlineMath latex="\dfrac{1}{e} = e^{-1}" />, so{" "}
          <InlineMath latex="\ln \dfrac{1}{e} = -1" />. The input sits between{" "}
          <InlineMath latex="0" /> and <InlineMath latex="1" />, which is the stretch of the
          curve that lies under the axis.
        </>
      ),
    },
    {
      id: "b1-r3",
      latex: "\\ln 0",
      spoken: "l n of 0",
      right: 2,
      note: "No power of e reaches 0, so this logarithm has nothing to hand back.",
      why: (
        <>
          Powers of <InlineMath latex="e" /> shrink toward <InlineMath latex="0" /> as the
          exponent falls, and they never get there. So there is no exponent to return, and{" "}
          <InlineMath latex="x = 0" /> is where the graph runs off downward instead of
          crossing.
        </>
      ),
    },
    {
      id: "b1-r4",
      latex: "\\ln(-2)",
      spoken: "l n of negative 2",
      right: 2,
      note: "Every power of e is positive, so a negative input is outside the domain and there is no value.",
      why: (
        <>
          <InlineMath latex="e" /> raised to any exponent is positive, so nothing gives{" "}
          <InlineMath latex="-2" />. The natural logarithm has the same domain as every
          other logarithm: the positive numbers, and nothing else.
        </>
      ),
    },
  ],
];

export function LogDomainClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = BOARDS[variant.index] ?? (BOARDS[0] as readonly Row[]);
  return (
    <LogDomainClassifyBody
      key={variant.nonce}
      rows={rows}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LogDomainClassifyBody({
  rows,
  onSolved,
  onRestart,
}: {
  rows: readonly Row[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Row id -> the call the learner made, as an index into `CALLS`. */
  const [calls, setCalls] = useState<Record<string, number>>({});
  /**
   * The same map, authoritative inside the handler. Two rows answered in quick succession are
   * two updates against one render, so reading `calls` out of the closure would drop the first
   * call and the board would never be seen as finished.
   */
  const callsRef = useRef<Record<string, number>>({});
  const [walked, setWalked] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const complete = Object.keys(calls).length === rows.length;
  const missedRows = rows.filter(
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
    const clean = rows.every((candidate) => next[candidate.id] === candidate.right);
    if (clean && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** Every option renders in the SAME neutral token until its row settles. */
  const neutral = { color: LABEL, borderColor: LINE };

  /** The call that was right on each missed row, named beside the logarithm it belongs to. */
  const missedCalls = (
    <>
      {missedRows.map((row, at) => (
        <Fragment key={row.id}>
          {at === 0 ? null : at === missedRows.length - 1 ? " and " : ", "}
          <InlineMath latex={row.latex} />
          {`: ${CALLS[row.right]}`}
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: call each logarithm by the value it comes to, until every row on the board has
        been settled by where its input sits against <InlineMath latex="0" /> and{" "}
        <InlineMath latex="1" />.
      </WidgetTask>

      {/* The board, and the grid every row borrows its columns from: the logarithm, then the
          three calls. Without it each row sized its own tracks and the alignment had to be
          hardcoded, which is what clipped the labels. */}
      <div className="lesson-classify">
        {rows.map((row) => {
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
                  logarithm by the learner's correctness would make a perfectly ordinary
                  expression look like the thing that was wrong. */}
                <span className="lesson-interactive__step-eq">
                  <InlineMath latex={row.latex} color={LABEL} />
                </span>
                {CALLS.map((label, at) => {
                  const name = markOf(at);
                  const mark = name === null ? null : MARKS[name];
                  return (
                    <button
                      key={label}
                      type="button"
                      className="lesson-interactive__chip"
                      data-mark={name ?? undefined}
                      disabled={locked}
                      aria-label={
                        mark === null
                          ? `${row.spoken}: ${label}`
                          : `${row.spoken}: ${label}, ${mark.spoken}`
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
                      {label}
                      {mark === null ? null : (
                        <span aria-hidden="true" className="lesson-classify__mark">
                          {mark.glyph}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* The whole of what a missed row says, under the row it is about rather than in
                the shared status line the next row's answer would overwrite. */}
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
            othersRemain={rows.some((row) => calls[row.id] === undefined)}
          />
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {missed ? "Try a fresh set of logarithms" : "Start over on the other logarithm"}
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
            Every call landed. Inputs above <InlineMath latex="1" /> give values above zero,
            inputs between <InlineMath latex="0" /> and <InlineMath latex="1" /> give values
            below zero and keep falling as the input shrinks, and at{" "}
            <InlineMath latex="0" /> and below there is no value at all. The line{" "}
            <InlineMath latex="x = 0" /> is the boundary those two facts meet at.
          </>
        ) : complete && missed ? (
          "The board is finished with a call that did not hold. The reasoning is below, and a fresh set follows it."
        ) : (
          <>
            Ask which exponent the base would need. Where no exponent will do it, the
            logarithm has no value.
          </>
        )}
      </p>
    </div>
  );
}
