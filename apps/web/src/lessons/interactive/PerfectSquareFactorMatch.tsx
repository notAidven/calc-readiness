/**
 * RAD.1 interactive (slide 3): join each radicand to a perfect square hiding inside it.
 *
 * Before a root can be simplified the learner has to see a perfect square in a number that
 * does not look like one, and that is a piece of recall about products, not a procedure.
 * Matching is the shape that drills it.
 *
 * It used to ask for the LARGEST square, which is the thing the method no longer needs:
 * finding the biggest factor in one go is the hard part, and simplifying does not depend
 * on it. So each board is built so that exactly ONE of the squares on offer divides each
 * radicand. A wrong join is a real perfect square that simply does not go in, which is the
 * mistake worth making, and the board never rewards spotting a maximum.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  entries: readonly { radicand: number; square: number }[];
  dealt: readonly number[];
}

/**
 * Every square on one board divides exactly one of that board's radicands, so each join
 * has a single right answer and the two it is not is a genuine near miss. Neither board
 * uses the slide's own $72$.
 */
const BOARDS: readonly Board[] = [
  {
    // 9 goes into 45 only; 25 into 50 only; 4 into 12 only.
    entries: [
      { radicand: 45, square: 9 },
      { radicand: 50, square: 25 },
      { radicand: 12, square: 4 },
    ],
    dealt: [2, 0, 1],
  },
  {
    // 16 goes into 48 only; 9 into 63 only; 49 into 98 only.
    entries: [
      { radicand: 48, square: 16 },
      { radicand: 63, square: 9 },
      { radicand: 98, square: 49 },
    ],
    dealt: [1, 2, 0],
  },
];

export function PerfectSquareFactorMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  const pairs: MatchPair[] = board.entries.map(({ radicand, square }) => {
    const rest = radicand / square;
    const root = Math.round(Math.sqrt(square));
    return {
      id: `n${radicand}`,
      left: `\\sqrt{${radicand}}`,
      right: `${square}`,
      leftSpoken: `the square root of ${radicand}`,
      rightSpoken: `${square}`,
      why: (
        <>
          <InlineMath latex={`${radicand} = ${square} \\cdot ${rest}`} />, and{" "}
          <InlineMath latex={`${square}`} /> is a perfect square because{" "}
          <InlineMath latex={`${root} \\cdot ${root} = ${square}`} />. Neither of the other
          two squares on the board divides <InlineMath latex={`${radicand}`} /> evenly, so
          this is the one that can come out of it.
        </>
      ),
    };
  });

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={pairs}
      rightOrder={board.dealt}
      prompt="Tap a root on the left, then tap the perfect square that divides the number inside it. You can also drag and drop one onto the other."
      conclusion={
        <>
          A root turns a perfect square into a whole number and leaves everything else
          alone, so the useful question about a radicand is never whether the whole of it is
          a perfect square. It is whether any <em>part</em> of it is. That is what makes{" "}
          <InlineMath latex="\sqrt{a \cdot b} = \sqrt{a} \cdot \sqrt{b}" /> worth having.
        </>
      }
      ariaLabel="Three square roots, to be joined to a perfect square dividing each radicand"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with three new numbers"
    />
  );
}
