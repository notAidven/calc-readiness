/**
 * FUN.9 slide 2: even, odd or neither, called one rule at a time.
 *
 * ## The evidence arrives AFTER the call
 *
 * Each row prints $h(-x)$ only once the row has been settled. Printed up front, the board
 * becomes a matching exercise between two expressions already on screen and the substitution
 * the slide is about never has to be carried out; printed afterwards, it is the check on a
 * claim the learner had to make from the exponents. That is also why the rules here are read
 * rather than drawn: this node's whole point is that symmetry is a claim to be tested, not a
 * shape to be eyed, so there is deliberately no graph on this board to eye.
 *
 * A wrong tap LOCKS the row, and the gate opens only on a clean board, which is what keeps a
 * three-option question a question rather than an activity with retries. A settled row keeps
 * all three options on screen, disabled and marked, because the comparison is the teaching. The
 * palette follows the shared rule: the learner's own pick is a verdict in `CIVIC` or `BRICK`,
 * and the call that was right on a row they MISSED is `SIGNAL_DEEP` and dashed, since green
 * there would credit a pick nobody made.
 *
 * ## Every board holds one of each, and every rule carries three terms
 *
 * One of each, because a board without a mixed rule is not asking a question: "neither" is the
 * commonest answer in the wild and the one a learner who classifies by eye never reaches. Three
 * terms, because the practice bank's symmetry shape draws TWO, so nothing on this board can
 * come back as a practice item, and because a constant is an even power in disguise, which is
 * the reading that makes an otherwise odd rule land on neither.
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
const CALLS = ["Even", "Odd", "Neither"] as const;

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
  /** The rule, as LaTeX, without its name: the task line says every row is $h$. */
  latex: string;
  spoken: string;
  /** Which of {@link CALLS} is the right one. */
  right: 0 | 1 | 2;
  /** $h(-x)$, tidied. Printed only once the row settles. */
  reflected: string;
  /** ONE sentence: why the call the learner made was not the right one. */
  note: string;
  /** The fuller reasoning, printed by the board's reveal when this row was missed. */
  why: ReactNode;
}

/**
 * Two boards. Each holds one rule of each kind, and the first row's answer is never the first
 * call on offer, so no row can be settled by taking the leftmost button. Neither board reuses a
 * rule from the lesson prose or from the check.
 */
const BOARDS: readonly (readonly Row[])[] = [
  [
    {
      id: "a-mixed",
      latex: "x^{3} + x^{2} - 2",
      spoken: "x cubed plus x squared minus 2",
      right: 2,
      reflected: "-x^{3} + x^{2} - 2",
      note: "The cube changes sign under the swap and the square does not, so the rule as a whole neither holds still nor turns over.",
      why: (
        <>
          Substituting gives <InlineMath latex="h(-x) = -x^{3} + x^{2} - 2" />. Set that
          against <InlineMath latex="h(x) = x^{3} + x^{2} - 2" /> and it differs in the
          first term; set it against <InlineMath latex="-h(x) = -x^{3} - x^{2} + 2" /> and
          it differs in the other two. One term of each parity is all it takes.
        </>
      ),
    },
    {
      id: "a-even",
      latex: "x^{4} - 3x^{2} + 1",
      spoken: "x to the fourth minus 3 x squared plus 1",
      right: 0,
      reflected: "x^{4} - 3x^{2} + 1",
      note: "Every exponent here divides by 2, counting the constant as an exponent of zero, so no term changes sign.",
      why: (
        <>
          Each bracket is raised to a power that divides by <InlineMath latex="2" />, so{" "}
          <InlineMath latex="(-x)^{4} = x^{4}" /> and{" "}
          <InlineMath latex="(-x)^{2} = x^{2}" />, and the constant has nothing to swap.
          That gives <InlineMath latex="h(-x) = h(x)" /> exactly, which is the mirror in the{" "}
          <InlineMath latex="y" />
          -axis.
        </>
      ),
    },
    {
      id: "a-odd",
      latex: "x^{5} - 2x^{3} + x",
      spoken: "x to the fifth minus 2 x cubed plus x",
      right: 1,
      reflected: "-x^{5} + 2x^{3} - x",
      note: "No exponent here divides by 2, so every term changes sign together and the rule comes back as its own opposite.",
      why: (
        <>
          Every power is one that does not divide by <InlineMath latex="2" />, so each term
          flips: <InlineMath latex="h(-x) = -x^{5} + 2x^{3} - x" />. Factor a minus out of
          that and it is <InlineMath latex="-(x^{5} - 2x^{3} + x)" />, which is{" "}
          <InlineMath latex="-h(x)" />, the turn through the origin. There is no constant
          term here, and that matters: one would hold still and spoil it.
        </>
      ),
    },
  ],
  [
    {
      id: "b-odd",
      latex: "x^{5} + 2x^{3} - 4x",
      spoken: "x to the fifth plus 2 x cubed minus 4 x",
      right: 1,
      reflected: "-x^{5} - 2x^{3} + 4x",
      note: "No exponent here divides by 2, so every term changes sign together and the rule comes back as its own opposite.",
      why: (
        <>
          Each power fails to divide by <InlineMath latex="2" />, so every term flips at
          once: <InlineMath latex="h(-x) = -x^{5} - 2x^{3} + 4x" />, which is exactly{" "}
          <InlineMath latex="-h(x)" />. The coefficients play no part in this test; only the
          exponents do.
        </>
      ),
    },
    {
      id: "b-mixed",
      latex: "x^{4} - x^{3} + 2",
      spoken: "x to the fourth minus x cubed plus 2",
      right: 2,
      reflected: "x^{4} + x^{3} + 2",
      note: "The fourth power and the constant hold still while the cube changes sign, so the rule matches neither test.",
      why: (
        <>
          Substituting gives <InlineMath latex="h(-x) = x^{4} + x^{3} + 2" />. Two of those
          three terms are unchanged and one has flipped, so it is not{" "}
          <InlineMath latex="h(x)" />, and it is not{" "}
          <InlineMath latex="-h(x) = -x^{4} + x^{3} - 2" /> either. A single mixed term
          rules both out.
        </>
      ),
    },
    {
      id: "b-even",
      latex: "2x^{4} + x^{2} - 5",
      spoken: "2 x to the fourth plus x squared minus 5",
      right: 0,
      reflected: "2x^{4} + x^{2} - 5",
      note: "Every exponent here divides by 2, counting the constant as an exponent of zero, so no term changes sign.",
      why: (
        <>
          Both powers divide by <InlineMath latex="2" />, so the brackets lose their minus
          signs, and the constant is a power with exponent zero, which is also even. Nothing
          moves: <InlineMath latex="h(-x) = h(x)" />.
        </>
      ),
    },
  ],
];

export function TransformParityClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = BOARDS[variant.index] ?? (BOARDS[0] as readonly Row[]);
  return (
    <TransformParityClassifyBody
      key={variant.nonce}
      rows={rows}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function TransformParityClassifyBody({
  rows,
  onSolved,
  onRestart,
}: {
  rows: readonly Row[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Row id -> the call the learner made, as an index into {@link CALLS}. */
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

  /** The call that was right on each missed row, named beside the rule it belongs to. */
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
        Goal: call each rule below, taken as <InlineMath latex="h(x)" />, by what{" "}
        <InlineMath latex="h(-x)" /> comes back as, until every row on the board has been
        settled.
      </WidgetTask>

      {/* One grid for the whole board, so the rule column and the three calls line up down it
          rather than each row sizing its own tracks. */}
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
                    rule by the learner's correctness would make a perfectly ordinary
                    polynomial look like the thing that was wrong. */}
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

              {/* The substitution, printed only now: before the call it would have been the
                  answer, and after it, it is the check on one. */}
              {locked ? (
                <span className="lesson-classify__reading">
                  <InlineMath latex={`h(-x) = ${row.reflected}`} color={LABEL} />
                </span>
              ) : null}

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
            {missed ? "Try a fresh set of rules" : "Start over on a different set"}
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
            Every call landed. Read the exponents, remembering that a constant is a power
            with exponent zero: all of them divisible by <InlineMath latex="2" /> gives{" "}
            <InlineMath latex="h(-x) = h(x)" />, none of them gives{" "}
            <InlineMath latex="h(-x) = -h(x)" />, and a mixture gives neither, which is
            where most rules land.
          </>
        ) : complete && missed ? (
          "The board is finished with a call that did not hold. The reasoning is below, and a fresh set follows it."
        ) : (
          <>
            Replace <InlineMath latex="x" /> with <InlineMath latex="-x" /> in your head
            before you tap: the exponent on each term decides whether that term changes
            sign.
          </>
        )}
      </p>
    </div>
  );
}
