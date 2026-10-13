/**
 * NUM.S interactive (slide 2): subtraction as adding the opposite. The learner is asked to
 * CHOOSE the rewrite, then to CHOOSE the sum it comes to; the rows on the diagram appear as
 * each is called correctly, and the gate opens on the second.
 *
 * It used to be a second worked example wearing an interaction's clothes. Both buttons called
 * the same `advance()`, and the rows they uncovered were module constants written before the
 * learner arrived, so the gate opened on having CLICKED rather than on having understood: the
 * one slide in this lesson about rewriting a subtraction never asked anybody to rewrite one.
 * Every wrong rewrite the learner can reach is now on the board beside the right one, each
 * with the mistake it comes from named when it is picked.
 *
 * Bounded choice with unlimited retry, so there is no reveal here and none is owed: nothing
 * can be typed that the board will not recognise, and every wrong pick is answered with the
 * misconception behind it rather than with "try again".
 */

import { type ReactNode, useState } from "react";

import { type EqToken, EquationRow, InlineMath, LABEL, SIGNAL, SOFT } from "../svgKit";
import {
  type LessonWidgetProps,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Board {
  /** The expression is `a - b`; `b` may itself be negative, which is the harder case. */
  a: number;
  b: number;
  /** Where in the option list the correct pick sits, so it is not always in one place. */
  rotate: number;
}

/**
 * Two subtractions, neither of them slide 2's own $6 - (-11)$.
 *
 * They are the two cases the rule has to cover and they behave differently under it: taking
 * a positive away moves left and lands below zero, while taking a NEGATIVE away turns into
 * an addition that moves right. A learner who has learned "subtracting makes it smaller"
 * gets through the first board and is stopped by the second.
 */
const BOARDS: readonly Board[] = [
  { a: 5, b: 9, rotate: 1 },
  { a: 2, b: -7, rotate: 2 },
];

/** A signed operand as it is written after a `+`: negatives get their own parentheses. */
const addend = (n: number) => (n < 0 ? `(${n})` : String(n));
/** And as it is written at the head of an expression, where no parentheses are wanted. */
const lead = (n: number) => String(n);

/** Reads a latex operand out loud, so the option's accessible name is not raw KaTeX. */
function spoken(latex: string): string {
  return latex
    .replace(/\(-(\d+)\)/g, "negative $1")
    .replace(/(^|\s)-(\d+)/g, "$1negative $2")
    .replace(/\+/g, "plus");
}

export function SubtractAsAddPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <SubtractAsAddBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function SubtractAsAddBody({
  board: { a, b, rotate },
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [stage, setStage] = useState(0); // 0 asking for the rewrite, 1 asking for the sum, 2 done
  const [nudge, setNudge] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const opposite = -b;
  const value = a + opposite;
  const solved = stage >= 2;

  const START: readonly EqToken[] = [
    { text: lead(a) },
    { text: "-", color: SOFT },
    { text: b < 0 ? `(${b})` : String(b), color: SOFT },
  ];
  const REWRITE: readonly EqToken[] = [
    { text: lead(a) },
    { text: "+", color: SIGNAL },
    { text: addend(opposite), color: SIGNAL },
  ];
  const RESULT: readonly EqToken[] = [{ text: `= ${value}`, color: LABEL }];

  /**
   * The rewrites a learner actually reaches, each with the mistake it comes from.
   *
   * They are not decoration: "kept the sign" is the whole misconception this slide exists to
   * correct, and "flipped the wrong number" is what the phrase "change the sign" produces in
   * a learner who has been given it without being told WHICH sign.
   */
  const rewrites = [
    {
      latex: `${lead(a)} + ${addend(opposite)}`,
      correct: true,
      nudge: "",
    },
    {
      latex: `${lead(a)} + ${addend(b)}`,
      correct: false,
      nudge: `That turns the minus into a plus and leaves ${b} alone. Subtracting is adding the OPPOSITE, so the number has to move to the other side of zero as well.`,
    },
    {
      latex: `${lead(-a)} + ${addend(b)}`,
      correct: false,
      nudge: `That flips the wrong number. The ${a} is not the one being taken away, so it keeps its sign; the number after the minus is the one that turns into its opposite.`,
    },
    {
      latex: `${lead(-a)} + ${addend(opposite)}`,
      correct: false,
      nudge: `The opposite of ${b} is right, but the ${a} has been flipped too. Only the number being taken away changes sign.`,
    },
  ];

  const sums = [
    { value, correct: true, nudge: "" },
    {
      value: -value,
      correct: false,
      nudge: `That is the right size and the wrong side of zero. Walk it: start at ${a} and move ${Math.abs(opposite)} ${opposite < 0 ? "left" : "right"}.`,
    },
    {
      value: a + b,
      correct: false,
      nudge: (
        <>
          That is the sum of the original numbers, before the opposite was taken. The
          addition to work is <InlineMath latex={`${lead(a)} + ${addend(opposite)}`} />.
        </>
      ),
    },
    {
      value: -(a + b),
      correct: false,
      nudge: `Both signs have been changed at once. Only the number being subtracted turns into its opposite; the ${a} stays where it is.`,
    },
  ];

  /** Deal an option list in a fixed order that is not the same one on both boards. */
  function dealt<T>(options: readonly T[], by: number): T[] {
    const at = by % options.length;
    return [...options.slice(at), ...options.slice(0, at)];
  }

  function callRewrite(ok: boolean, why: ReactNode) {
    if (ok) {
      setNudge(null);
      setStage(1);
      success();
      return;
    }
    setNudge(why);
  }

  function callSum(ok: boolean, why: ReactNode) {
    if (ok) {
      setNudge(null);
      setStage(2);
      success();
      if (!done) {
        setDone(true);
        onSolved();
      }
      return;
    }
    setNudge(why);
  }

  return (
    <div className="lesson-interactive lesson-interactive--subtract">
      <svg
        viewBox="0 0 440 150"
        role="img"
        aria-label={`Rewrite ${a} minus ${b < 0 ? `negative ${-b}` : b} as an addition, then compute it`}
      >
        <title>Subtracting is adding the opposite</title>
        <EquationRow tokens={START} cx={220} y={44} fontSize={22} />
        {stage >= 1 && <EquationRow tokens={REWRITE} cx={220} y={88} fontSize={22} />}
        {stage >= 2 && <EquationRow tokens={RESULT} cx={220} y={128} fontSize={22} />}
      </svg>

      <div className="lesson-interactive__controls">
        {stage === 0 &&
          dealt(rewrites, rotate).map((option) => (
            <button
              key={option.latex}
              type="button"
              className="lesson-interactive__chip"
              aria-label={spoken(option.latex)}
              onClick={() => callRewrite(option.correct, option.nudge)}
            >
              <InlineMath latex={option.latex} />
            </button>
          ))}
        {stage === 1 &&
          dealt(sums, rotate).map((option) => (
            <button
              key={option.value}
              type="button"
              className="lesson-interactive__chip"
              aria-label={String(option.value)}
              onClick={() => callSum(option.correct, option.nudge)}
            >
              <InlineMath latex={String(option.value)} />
            </button>
          ))}
        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different subtraction
          </button>
        )}
      </div>

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : nudge ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            <InlineMath
              latex={`${lead(a)} - ${b < 0 ? `(${b})` : b} = ${lead(a)} + ${addend(opposite)} = ${value}`}
            />
            . Subtracting a number adds its opposite.
          </>
        ) : nudge ? (
          nudge
        ) : stage === 0 ? (
          <>
            Rewrite <InlineMath latex={`${lead(a)} - ${b < 0 ? `(${b})` : b}`} /> as an
            addition: which of these adds the opposite of{" "}
            <InlineMath latex={b < 0 ? `(${b})` : String(b)} />?
          </>
        ) : (
          <>
            Now add: what does <InlineMath latex={`${lead(a)} + ${addend(opposite)}`} />{" "}
            come to?
          </>
        )}
      </p>
    </div>
  );
}
