/**
 * FUN.2 slide 2: which rules restrict a domain, and in which of the two possible ways.
 *
 * Three calls rather than two, because the slide's claim has three cases and a two-way board
 * would have to drop one of them. A zero denominator throws out exactly ONE input and leaves
 * the rest of the line standing; an even root refuses A WHOLE STRETCH at once; and most rules,
 * an odd root included, refuse nothing. Offered only "restricted" and "unrestricted", a learner
 * could pass this board without ever noticing that the two restrictions take away different
 * amounts, which is the distinction the interval on the next slide is built out of.
 *
 * The odd root is on both boards on purpose. It is the row that separates a learner who has
 * read "a root restricts the domain" as a shape from one who has read it as an arithmetic fact
 * about squaring, and it is why the paragraph says even root rather than root.
 *
 * A wrong call LOCKS the row and the gate wants a clean board. A settled row keeps all three
 * options on screen, disabled and marked, because the comparison is the teaching; the learner's
 * own pick is a verdict in `CIVIC` or `BRICK`, and the call that was right on a row they MISSED
 * is `SIGNAL_DEEP` and dashed, since green there would credit a pick nobody made.
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

/**
 * The three calls, in the order they are drawn under every row.
 *
 * All three answer the one question the task poses — how much of the line does this rule
 * refuse — so they are three quantities of the same thing and not two counts beside a shape.
 */
const CALLS = ["No inputs refused", "One input refused", "A stretch refused"] as const;

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
  /** The rule being called, as LaTeX. */
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
 * Two boards. Each carries one quotient, one even root and two rules that refuse nothing, so
 * no row can be settled by elimination and no board is answerable from the shape of the other.
 */
const BOARDS: readonly (readonly Row[])[] = [
  [
    {
      id: "b0-r1",
      latex: "f(x) = \\dfrac{5}{x - 4}",
      spoken: "f of x equals 5 over x minus 4",
      right: 1,
      note: "The bottom of a quotient is zero at one input and nowhere else, so one input goes and the rest of the line stays.",
      why: (
        <>
          The bottom <InlineMath latex="x - 4" /> is zero when <InlineMath latex="x = 4" />,
          and a quotient has no value there. Every other input gives the bottom some nonzero
          value, so exactly one number is thrown out.
        </>
      ),
    },
    {
      id: "b0-r2",
      latex: "g(x) = \\sqrt{x + 6}",
      spoken: "g of x equals the square root of x plus 6",
      right: 2,
      note: "A square root has no real value when what sits under it is negative, and that is true of a whole stretch of inputs rather than one.",
      why: (
        <>
          Under the root sits <InlineMath latex="x + 6" />, which is negative for every
          input below <InlineMath latex="-6" />. A square root has no real value there, so
          the rule refuses that entire stretch and keeps everything from{" "}
          <InlineMath latex="-6" /> upward.
        </>
      ),
    },
    {
      id: "b0-r3",
      latex: "h(x) = 3x^{2} - 7",
      spoken: "h of x equals 3 x squared minus 7",
      right: 0,
      note: "Squaring and multiplying and subtracting all work on any number at all, so nothing here can refuse an input.",
      why: (
        <>
          There is no bottom to empty and no root to look under. Squaring any number,
          scaling it and subtracting are all defined for every input, so a polynomial like
          this one accepts the whole line.
        </>
      ),
    },
    {
      id: "b0-r4",
      latex: "p(x) = \\sqrt[3]{x - 1}",
      spoken: "p of x equals the cube root of x minus 1",
      right: 0,
      note: "A cube root is an ODD root, and an odd root of a negative number is a perfectly good negative number.",
      why: (
        <>
          It is the EVEN roots that refuse negatives, because nothing squared comes out
          negative. Cubing does: <InlineMath latex="(-2)^{3} = -8" />, so{" "}
          <InlineMath latex="\sqrt[3]{-8} = -2" /> and this rule accepts every input.
        </>
      ),
    },
  ],
  [
    {
      id: "b1-r1",
      latex: "f(x) = \\dfrac{x + 2}{2x - 10}",
      spoken: "f of x equals x plus 2 over 2 x minus 10",
      right: 1,
      note: "What the top does is beside the point: only the input that empties the bottom is thrown out, and there is one of those.",
      why: (
        <>
          Set the bottom to zero: <InlineMath latex="2x - 10 = 0" /> gives{" "}
          <InlineMath latex="x = 5" />. A zero on the TOP is just an output of zero and
          costs nothing, so one input goes and every other one stays.
        </>
      ),
    },
    {
      id: "b1-r2",
      latex: "g(x) = \\sqrt{9 - x}",
      spoken: "g of x equals the square root of 9 minus x",
      right: 2,
      note: "The quantity under an even root has to be zero or more, and here that rules out a whole stretch of inputs at once.",
      why: (
        <>
          Under the root sits <InlineMath latex="9 - x" />, which goes negative as soon as
          the input passes <InlineMath latex="9" />. So everything above{" "}
          <InlineMath latex="9" /> is refused, and the rule keeps the stretch running
          downward from there.
        </>
      ),
    },
    {
      id: "b1-r3",
      latex: "h(x) = 6 - 4x",
      spoken: "h of x equals 6 minus 4 x",
      right: 0,
      note: "Multiplying and subtracting are defined for every number, so a straight line rule refuses nothing.",
      why: (
        <>
          Nothing here can fail: there is no denominator and no root. Every input is
          multiplied and subtracted, both of which work on any number, so this rule accepts
          the whole line.
        </>
      ),
    },
    {
      id: "b1-r4",
      latex: "p(x) = \\sqrt[3]{5x}",
      spoken: "p of x equals the cube root of 5 x",
      right: 0,
      note: "A cube root is an ODD root, so a negative quantity under it is no trouble at all.",
      why: (
        <>
          <InlineMath latex="5x" /> is negative for every negative input, and a cube root
          handles that: <InlineMath latex="\sqrt[3]{-125} = -5" />. Only an even root
          refuses a negative, so this rule accepts every input.
        </>
      ),
    },
  ],
];

export function DomainRestrictionClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = BOARDS[variant.index] ?? (BOARDS[0] as readonly Row[]);
  return (
    <DomainRestrictionClassifyBody
      key={variant.nonce}
      rows={rows}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DomainRestrictionClassifyBody({
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
        Goal: call each rule by how much of the line it refuses, until every row on the
        board has been settled.
      </WidgetTask>

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
            {missed ? "Try a fresh set of rules" : "Start over on the other set of rules"}
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
            Every call landed. A zero on the bottom of a quotient costs exactly one input,
            an even root costs a whole stretch, and everything else, odd roots included,
            accepts the line entire.
          </>
        ) : complete && missed ? (
          "The board is finished with a call that did not hold. The reasoning is below, and a fresh set follows it."
        ) : (
          <>
            Ask two questions of each rule. Is there a bottom that some input empties, and
            is there an even root that some input drives negative?
          </>
        )}
      </p>
    </div>
  );
}
