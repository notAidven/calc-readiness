/**
 * NUM.3 interactive: rearrange concrete sums without changing the value. The learner
 * swaps the order of 3 + 5 (commutative) and regroups (2 + 4) + 6 (associative); each
 * action reorders the terms while the running total holds at 8 and 12. Gates the lesson
 * once the learner has performed both a swap and a regroup.
 */

import { type ReactNode, useState } from "react";
import type { EqToken } from "../svgKit";
import { CIVIC, EquationRow, InlineMath, LABEL, LINE, SIGNAL, SOFT } from "../svgKit";

export function CommutativeAssociativePlay({ onComplete }: { onComplete?: () => void }) {
  const [swapped, setSwapped] = useState(false);
  const [regrouped, setRegrouped] = useState(false);
  const [hasSwapped, setHasSwapped] = useState(false);
  const [hasRegrouped, setHasRegrouped] = useState(false);
  const [done, setDone] = useState(false);
  const solved = hasSwapped && hasRegrouped;

  function swap() {
    setSwapped((v) => !v);
    setHasSwapped(true);
    if (hasRegrouped && !done) {
      setDone(true);
      onComplete?.();
    }
  }

  function regroup() {
    setRegrouped((v) => !v);
    setHasRegrouped(true);
    if (hasSwapped && !done) {
      setDone(true);
      onComplete?.();
    }
  }

  function reset() {
    setSwapped(false);
    setRegrouped(false);
    setHasSwapped(false);
    setHasRegrouped(false);
  }

  const commTokens: EqToken[] = swapped
    ? [
        { text: "5", color: SIGNAL },
        { text: "+" },
        { text: "3", color: CIVIC },
        { text: "=" },
        { text: "8", color: hasSwapped ? CIVIC : LABEL },
      ]
    : [
        { text: "3", color: CIVIC },
        { text: "+" },
        { text: "5", color: SIGNAL },
        { text: "=" },
        { text: "8", color: hasSwapped ? CIVIC : LABEL },
      ];

  // The parenthesized pair stays ONE token so KaTeX hugs its delimiters to the terms
  // inside; separate tokens would put a binary-operator gap after the open paren.
  const assocTokens: EqToken[] = regrouped
    ? [
        { text: "2", color: CIVIC },
        { text: "+" },
        { text: "(4 + 6)", color: SIGNAL },
        { text: "=" },
        { text: "12", color: hasRegrouped ? CIVIC : LABEL },
      ]
    : [
        { text: "(2 + 4)", color: CIVIC },
        { text: "+" },
        { text: "6", color: SIGNAL },
        { text: "=" },
        { text: "12", color: hasRegrouped ? CIVIC : LABEL },
      ];

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Order and grouping moved the numbers around, but <InlineMath latex="3 + 5" /> still
        makes <InlineMath latex="8" /> and <InlineMath latex="(2 + 4) + 6" /> still makes{" "}
        <InlineMath latex="12" />.
      </>
    );
  } else if (hasSwapped) {
    status = (
      <>
        The order flipped but the total held at <InlineMath latex="8" />. Now regroup the
        second line.
      </>
    );
  } else if (hasRegrouped) {
    status = (
      <>
        The grouping shifted but the total held at <InlineMath latex="12" />. Now swap the
        order on the first line.
      </>
    );
  } else {
    status = "Swap the order on line 1 and regroup line 2. Watch each total stay the same.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--rearrange">
      <svg
        viewBox="0 0 440 170"
        role="img"
        aria-label="Commutative swap of 3 plus 5 and associative regroup of (2 plus 4) plus 6, both keeping their totals"
      >
        <title>Commutative and associative rearrangements keep the total</title>
        {/* `dominantBaseline`, because the row's `y` is the equation's CENTER. */}
        <text x={34} y={52} dominantBaseline="central" fontSize={11} fill={SOFT}>
          Commutative
        </text>
        <EquationRow cx={252} y={52} fontSize={20} tokens={commTokens} />
        <line x1={34} y1={86} x2={406} y2={86} stroke={LINE} strokeWidth={1} />
        <text x={34} y={122} dominantBaseline="central" fontSize={11} fill={SOFT}>
          Associative
        </text>
        <EquationRow cx={252} y={122} fontSize={20} tokens={assocTokens} />
      </svg>

      {/* One neutral token on both moves. `--civic` on "Swap the order" was the correctness
          channel spent before the learner had done anything (R26), and it was worse for
          sitting beside a `--signal` sibling: two hues on two moves reads as a
          recommendation, and the totals on the board go `--civic` when a move lands, so the
          green was saying two different things at once. The moves are told apart by their
          words and by the row each one acts on. */}
      <div className="lesson-interactive__controls">
        <button
          type="button"
          className="lesson-interactive__chip"
          style={{ color: LABEL, borderColor: LINE }}
          onClick={swap}
        >
          Swap the order
        </button>
        <button
          type="button"
          className="lesson-interactive__chip"
          style={{ color: LABEL, borderColor: LINE }}
          onClick={regroup}
        >
          Regroup
        </button>
        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={reset}>
            Start over
          </button>
        )}
      </div>

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
