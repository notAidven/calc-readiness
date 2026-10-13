/**
 * NUM.4 interactive (slide 0): call each pair of terms alike or not alike.
 *
 * A wrong tap LOCKS that row as a miss rather than letting the learner take the other
 * button, which is the whole difference between this and a two-button guess: with only two
 * options a nudge-and-retry is not a question at all. The gate opens on a clean board, and
 * a missed board rotates to different terms instead of replaying the one just answered.
 *
 * Both terms in a row are drawn in the same neutral colour until the row settles. Colouring
 * degree one differently from degree two, which this widget used to do, answers the
 * question before it is asked: matching colours would mean "alike" without the learner ever
 * reading an exponent.
 *
 * A locked miss can be revealed, which names both variable parts and, where they match,
 * carries out the combination the pair allows. The reveal teaches the row rather than
 * rescuing the board, so a missed board still rotates instead of opening the gate.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Term {
  coef: number;
  /** The variable part, as LaTeX. Two terms are alike exactly when these match. */
  part: string;
  partSpoken: string;
}

interface Row {
  id: string;
  a: Term;
  b: Term;
}

/**
 * Two boards. Either button under a finished board rotates to the other, so neither a
 * clean board nor a missed one can be replayed on the terms just answered.
 */
const BOARDS: readonly (readonly Row[])[] = [
  [
    {
      id: "x-x",
      a: { coef: 2, part: "x", partSpoken: "x" },
      b: { coef: 5, part: "x", partSpoken: "x" },
    },
    {
      id: "x2-x2",
      a: { coef: 4, part: "x^{2}", partSpoken: "x squared" },
      b: { coef: 7, part: "x^{2}", partSpoken: "x squared" },
    },
    {
      id: "x-x2",
      a: { coef: 3, part: "x", partSpoken: "x" },
      b: { coef: 3, part: "x^{2}", partSpoken: "x squared" },
    },
  ],
  [
    {
      id: "y2-y",
      a: { coef: 2, part: "y^{2}", partSpoken: "y squared" },
      b: { coef: 2, part: "y", partSpoken: "y" },
    },
    {
      id: "m-m",
      a: { coef: 8, part: "m", partSpoken: "m" },
      b: { coef: 1, part: "m", partSpoken: "m" },
    },
    {
      id: "y3-y3",
      a: { coef: 5, part: "y^{3}", partSpoken: "y cubed" },
      b: { coef: 9, part: "y^{3}", partSpoken: "y cubed" },
    },
  ],
];

/** A coefficient of one is written by leaving it off, the way a learner will see it. */
function termLatex(term: Term): string {
  return term.coef === 1 ? term.part : `${term.coef}${term.part}`;
}

export function LikeTermsClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = BOARDS[variant.index] ?? (BOARDS[0] as readonly Row[]);
  return (
    <LikeTermsClassifyBody
      key={variant.nonce}
      rows={rows}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LikeTermsClassifyBody({
  rows,
  onSolved,
  onRestart,
}: {
  rows: readonly Row[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [calls, setCalls] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const complete = Object.keys(calls).length === rows.length;
  const missed = Object.values(calls).some((hit) => !hit);
  const solved = complete && !missed;

  function answer(row: Row, guessLike: boolean) {
    if (calls[row.id] !== undefined) {
      return;
    }
    const like = row.a.part === row.b.part;
    const hit = guessLike === like;
    const next = { ...calls, [row.id]: hit };
    setCalls(next);
    if (!hit) {
      setFeedback(
        like
          ? "Not quite. Those two carry the same variable part, so that row is locked as a miss."
          : "Not quite. Those two carry different variable parts, so that row is locked as a miss.",
      );
      return;
    }
    setFeedback(null);
    success();
    if (
      Object.keys(next).length === rows.length &&
      Object.values(next).every(Boolean) &&
      !done
    ) {
      setDone(true);
      onSolved();
    }
  }

  /** Open one missed row up. The wrong tap already settled it; this adds the reasoning. */
  function revealRow(row: Row) {
    setShown((prev) => ({ ...prev, [row.id]: true }));
    setFeedback(null);
  }

  // Both option chips render in the SAME neutral token, so colour is never a tell.
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      {/* The board, and the grid every row borrows its columns from: the pair of terms, the two
          calls, and the verdict glyph. Without it each row sized its own tracks and the pair
          column had to be pinned by hand to keep the buttons under each other. */}
      <div className="lesson-classify">
        {rows.map((row) => {
          const call = calls[row.id];
          const locked = call !== undefined;
          const like = row.a.part === row.b.part;
          const opened = shown[row.id] === true;
          const tone = locked ? (call ? CIVIC : BRICK) : LABEL;
          return (
            <div key={row.id} className="lesson-classify__item">
              <div className="lesson-classify__row">
                <span className="lesson-interactive__step-eq">
                  <InlineMath latex={termLatex(row.a)} color={tone} />
                  <span style={{ color: SOFT }}>{" and "}</span>
                  <InlineMath latex={termLatex(row.b)} color={tone} />
                </span>
                {locked ? (
                  <span className="lesson-classify__outcome" style={{ color: tone }}>
                    {call
                      ? like
                        ? "Like terms"
                        : "Not alike"
                      : like
                        ? "Actually like terms"
                        : "Actually not alike"}
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="lesson-interactive__chip"
                      style={neutral}
                      onClick={() => answer(row, true)}
                    >
                      Like terms
                    </button>
                    <button
                      type="button"
                      className="lesson-interactive__chip"
                      style={neutral}
                      onClick={() => answer(row, false)}
                    >
                      Not alike
                    </button>
                  </>
                )}
                <span className="lesson-classify__check" style={{ color: tone }}>
                  {locked ? (call ? "\u2713" : "\u2717") : ""}
                </span>
              </div>
              <WidgetReveal
                available={locked && !call}
                revealed={opened}
                answer={like ? "Like terms" : "Not alike"}
                why={
                  like ? (
                    <>
                      Both terms carry the variable part <InlineMath latex={row.a.part} />,
                      the same letter to the same power, so they are like terms and their
                      coefficients add:{" "}
                      <InlineMath
                        latex={`${termLatex(row.a)} + ${termLatex(row.b)} = ${row.a.coef + row.b.coef}${row.a.part}`}
                      />
                      .
                    </>
                  ) : (
                    <>
                      One term carries <InlineMath latex={row.a.part} /> and the other
                      carries <InlineMath latex={row.b.part} />. The same letter raised to a
                      different power is a different variable part, so there is nothing to
                      add and{" "}
                      <InlineMath latex={`${termLatex(row.a)} + ${termLatex(row.b)}`} />{" "}
                      stays as it is.
                    </>
                  )
                }
                onReveal={() => revealRow(row)}
                // The wrong tap already printed the right call on the row, so reasoning,
                // not the answer, is what is left to offer.
                label="Reveal why"
              />
            </div>
          );
        })}
      </div>

      {complete && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {missed ? "Try a fresh set" : "New set of terms"}
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed || feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved
          ? "Like terms share the same variable AND the same power. Only those can combine."
          : complete && missed
            ? "A clean set is every call right. Read the exponent as well as the letter, and take a fresh set."
            : (feedback ??
              "For each pair, check the letter and its power, then make the call for that row.")}
      </p>
    </div>
  );
}
