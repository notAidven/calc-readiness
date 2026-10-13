/**
 * RAT.1 interactive (slide 2): the load-bearing call. A recipe is shown ALREADY reduced,
 * beside the original it came from, and the learner sorts candidate doses as forbidden or
 * safe to pour. One forbidden dose on every board comes from a factor that CANCELLED, so a
 * learner reading only the reduced ratio marks it safe and loses the board.
 *
 * A wrong tap LOCKS that row as a miss rather than letting the other chip be tried, so the
 * board cannot be brute-forced; a missed board rotates to a fresh recipe instead of
 * replaying the memorized one. Neither board is used by the CFU or the practice bank.
 *
 * Both chips carry the same neutral token, so colour is never a tell. Green and red are the
 * correctness channel and they report on the learner's own pick (R26), which on this board is
 * more than a convention: most doses here ARE excluded, so a standing green on "Allowed" would
 * point steadily at the wrong call.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

interface Dose {
  value: number;
  forbidden: boolean;
}

interface Board {
  original: string;
  reduced: string;
  /** Spoken form of the whole board, for the SVG's accessible description. */
  spoken: string;
  doses: readonly Dose[];
}

const BOARDS: readonly Board[] = [
  {
    original: "\\dfrac{x^{2} - x - 6}{x^{2} - 4}",
    reduced: "\\dfrac{x - 3}{x - 2}",
    spoken:
      "x squared minus x minus 6 over x squared minus 4 reduces to x minus 3 over x minus 2, excluded values 2 and negative 2",
    doses: [
      { value: 2, forbidden: true },
      { value: -2, forbidden: true },
      { value: 3, forbidden: false },
      { value: 0, forbidden: false },
    ],
  },
  {
    original: "\\dfrac{x^{2} + 5x + 6}{x^{2} - 9}",
    reduced: "\\dfrac{x + 2}{x - 3}",
    spoken:
      "x squared plus 5x plus 6 over x squared minus 9 reduces to x plus 2 over x minus 3, excluded values 3 and negative 3",
    doses: [
      { value: 3, forbidden: true },
      { value: -3, forbidden: true },
      { value: -2, forbidden: false },
      { value: 1, forbidden: false },
    ],
  },
];

function boardAt(index: number): Board {
  return BOARDS[index % BOARDS.length] ?? (BOARDS[0] as Board);
}

/** A signed value as LaTeX, with negatives parenthesized. */
function sp(n: number): string {
  return n < 0 ? `(-${-n})` : `${n}`;
}

/** A signed value read aloud, for the aria-labels KaTeX makes textContent unfit for. */
function spoken(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}

export function RationalExclusionClassify({ onComplete }: { onComplete?: () => void }) {
  const [boardIndex, setBoardIndex] = useState(0);
  const [calls, setCalls] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const board = boardAt(boardIndex);
  const complete = Object.keys(calls).length === board.doses.length;
  const missed = Object.values(calls).some((hit) => !hit);
  const solved = complete && !missed;

  function answer(dose: Dose, guessForbidden: boolean) {
    if (calls[dose.value] !== undefined) {
      return;
    }
    const hit = guessForbidden === dose.forbidden;
    const next = { ...calls, [dose.value]: hit };
    setCalls(next);
    if (hit) {
      setFeedback(null);
      success();
    } else {
      setFeedback(
        dose.forbidden
          ? "That value makes the original denominator zero, so it stays excluded even after the factor cancels. Row locked as a miss."
          : "That value leaves the original denominator nonzero, so it is allowed. Row locked as a miss.",
      );
    }
    // Every row CALLED, not every row called correctly (R29). A learner who misses one row
    // and then rules on the rest has answered every question this board asks; holding the
    // gate shut sends them back through the rows they already had right.
    if (Object.keys(next).length === board.doses.length && !fired) {
      setFired(true);
      onComplete?.();
    }
  }

  function newBoard() {
    setBoardIndex((index) => (index + 1) % BOARDS.length);
    setCalls({});
    setFeedback(null);
  }

  // Both chips render in the SAME neutral token, so colour is never a tell.
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <svg viewBox="0 0 440 116" role="img" aria-label={board.spoken}>
        <title>An expression beside its reduced form</title>
        <text x={112} y={26} textAnchor="middle" fontSize={12} fill={SOFT}>
          as written
        </text>
        <SvgMath latex={board.original} x={112} y={74} fontSize={22} w={220} />
        <text x={228} y={74} textAnchor="middle" fontSize={20} fill={LINE}>
          &#8594;
        </text>
        <text x={340} y={26} textAnchor="middle" fontSize={12} fill={SOFT}>
          reduced
        </text>
        <SvgMath latex={board.reduced} x={340} y={74} fontSize={22} color={CIVIC} w={180} />
      </svg>

      {/* The board, and the grid every row borrows its columns from: the value, the two calls,
          and the verdict glyph. Without it each row sized its own tracks and the alignment had
          to be hardcoded in rem, which is what clipped the labels. */}
      <div className="lesson-classify">
        {board.doses.map((dose) => {
          const call = calls[dose.value];
          const locked = call !== undefined;
          return (
            <div key={dose.value} className="lesson-classify__row">
              {/* Ink in every state (R26). The verdict is the row's own glyph; tinting the value
                under judgement made it read as the board's own answer, and BRICK is the colour
                this widget paints an excluded value in. */}
              <span className="lesson-interactive__step-eq">
                <InlineMath latex={`x = ${sp(dose.value)}`} color={LABEL} />
              </span>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`x equals ${spoken(dose.value)} is excluded`}
                onClick={() => answer(dose, true)}
              >
                Excluded
              </button>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`x equals ${spoken(dose.value)} is allowed`}
                onClick={() => answer(dose, false)}
              >
                Allowed
              </button>
              <span
                className="lesson-classify__check"
                style={{ color: call ? CIVIC : BRICK }}
              >
                {locked ? (call ? "\u2713" : "\u2717") : ""}
              </span>
            </div>
          );
        })}
      </div>

      {complete && (
        <button type="button" className="lesson-interactive__reset" onClick={newBoard}>
          {missed ? "Try a new problem" : "New problem"}
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed || feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved
          ? "All correct. Both excluded values come from the original denominator, including the one whose factor cancelled away."
          : (feedback ??
            (complete && missed
              ? "An excluded value is any value that makes the denominator zero as it was first written, cancelled factors included. A new problem is ready when you are."
              : "For each value, decide whether it makes the ORIGINAL denominator zero. A wrong tap locks that row."))}
      </p>
    </div>
  );
}
