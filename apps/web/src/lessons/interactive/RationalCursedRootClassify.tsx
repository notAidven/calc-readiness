/**
 * RAT.6 interactive (Verdigris Hold, the Proving Cauldron): the load-bearing call. The
 * algebra has already been run, so the board shows the original equation, the forbidden
 * list read off its ORIGINAL denominator, and the candidates the clearing produced. The
 * learner rules on each candidate by testing it against that list.
 *
 * A wrong tap LOCKS the row as a miss rather than letting the other chip be tried, so the
 * board cannot be brute-forced. One board has NO cursed root at all, so "reject the odd
 * one out" is not a strategy that survives the rotation. Both chips carry the same neutral
 * token, so colour is never a tell, and no board is reused by the CFU or the item bank.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

interface Candidate {
  value: number;
  /** True when the cauldron accepts it, false when it lands on a forbidden dose. */
  holds: boolean;
}

interface Board {
  equation: string;
  forbidden: string;
  candidates: string;
  /** Spoken form of the whole board, for the SVG's accessible description. */
  spoken: string;
  roots: readonly Candidate[];
}

const BOARDS: readonly Board[] = [
  {
    equation: "\\dfrac{x^{2} - 2x}{x - 5} = \\dfrac{15}{x - 5}",
    forbidden: "x \\neq 5",
    candidates: "x = 5 \\quad\\text{or}\\quad x = -3",
    spoken:
      "x squared minus 2x over x minus 5 equals 15 over x minus 5, excluded value 5, candidates 5 and negative 3",
    roots: [
      { value: 5, holds: false },
      { value: -3, holds: true },
    ],
  },
  {
    equation: "\\dfrac{x^{2} + x}{x + 6} = \\dfrac{30}{x + 6}",
    forbidden: "x \\neq -6",
    candidates: "x = -6 \\quad\\text{or}\\quad x = 5",
    spoken:
      "x squared plus x over x plus 6 equals 30 over x plus 6, excluded value negative 6, candidates negative 6 and 5",
    roots: [
      { value: -6, holds: false },
      { value: 5, holds: true },
    ],
  },
  {
    // No cursed root on this board: the forbidden dose is not among the candidates.
    equation: "\\dfrac{x^{2} - 4x}{x + 2} = \\dfrac{5}{x + 2}",
    forbidden: "x \\neq -2",
    candidates: "x = 5 \\quad\\text{or}\\quad x = -1",
    spoken:
      "x squared minus 4x over x plus 2 equals 5 over x plus 2, excluded value negative 2, candidates 5 and negative 1",
    roots: [
      { value: 5, holds: true },
      { value: -1, holds: true },
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

export function RationalCursedRootClassify({ onComplete }: { onComplete?: () => void }) {
  const [boardIndex, setBoardIndex] = useState(0);
  const [calls, setCalls] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const board = boardAt(boardIndex);
  const complete = Object.keys(calls).length === board.roots.length;
  const missed = Object.values(calls).some((hit) => !hit);
  const solved = complete && !missed;

  function answer(root: Candidate, guessHolds: boolean) {
    if (calls[root.value] !== undefined) {
      return;
    }
    const hit = guessHolds === root.holds;
    const next = { ...calls, [root.value]: hit };
    setCalls(next);
    if (hit) {
      setFeedback(null);
      success();
    } else {
      setFeedback(
        root.holds
          ? "That candidate is not on the excluded-value list, so it belongs in the solution set. Row locked as a miss."
          : "That candidate matches an excluded value from the original denominator, so the algebra invented it. Row locked as a miss.",
      );
    }
    // Every candidate CALLED, not every candidate called correctly (R29). The board still
    // reports the miss, in the row's note and in its own status line; it just stops holding
    // a learner who has ruled on every candidate it offered.
    if (Object.keys(next).length === board.roots.length && !fired) {
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
      <svg viewBox="0 0 440 172" role="img" aria-label={board.spoken}>
        <title>An equation with its excluded values and the candidates it produced</title>
        <SvgMath latex={board.equation} x={236} y={48} fontSize={20} w={380} />
        <text x={8} y={106} fontSize={12} fill={SOFT}>
          excluded
        </text>
        <SvgMath
          latex={board.forbidden}
          x={244}
          y={102}
          fontSize={17}
          color={BRICK}
          w={320}
        />
        <text x={8} y={146} fontSize={12} fill={SOFT}>
          candidates
        </text>
        <SvgMath latex={board.candidates} x={244} y={142} fontSize={17} w={320} />
      </svg>

      {/* The board, and the grid every row borrows its columns from: the candidate, the two
          calls, and the verdict glyph. Without it each row sized its own tracks, so both long
          labels needed hardcoded caps that were still narrower than the words. */}
      <div className="lesson-classify">
        {board.roots.map((root) => {
          const call = calls[root.value];
          const locked = call !== undefined;
          return (
            <div key={root.value} className="lesson-classify__row">
              {/* Ink in every state (R26). A candidate turned BRICK by a miscall reads as this
                board's own mark for an excluded value, which is the call under test. */}
              <span className="lesson-interactive__step-eq">
                <InlineMath latex={`x = ${sp(root.value)}`} color={LABEL} />
              </span>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`${spoken(root.value)} is in the solution set`}
                onClick={() => answer(root, true)}
              >
                In solution set
              </button>
              <button
                type="button"
                className="lesson-interactive__chip"
                style={neutral}
                disabled={locked}
                aria-label={`${spoken(root.value)} is an extraneous solution`}
                onClick={() => answer(root, false)}
              >
                Extraneous, reject
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
          ? board.roots.every((root) => root.holds)
            ? "All correct, and notice that nothing was extraneous this time. A candidate is only rejected when it is actually on the excluded-value list."
            : "All correct. The extraneous solution is the one that matches an excluded value, and it does not belong in your answer."
          : (feedback ??
            (complete && missed
              ? "A candidate is extraneous exactly when it matches an excluded value of the original denominator, and it belongs in the solution set otherwise. A new problem is ready when you are."
              : "Test each candidate against the excluded-value list. A wrong tap locks that row."))}
      </p>
    </div>
  );
}
