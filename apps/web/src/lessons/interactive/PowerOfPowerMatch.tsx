/**
 * EXP.1 interactive (slide 3): join each power of a power to the single power it equals.
 *
 * The distractors are not invented. In every board one pair's ADD answer is another pair's
 * correct answer, so a learner who reaches for $x^{a+b}$ finds a chip waiting for them and
 * then runs out of chips at the end. The mistake costs two joins rather than being caught
 * on the spot, which is what makes matching the right shape here: the rule that decides
 * the whole board is the one being confused with its neighbour.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  pairs: readonly { inner: number; outer: number }[];
  /** How the right column is dealt: indices into `pairs`. Never in order. */
  dealt: readonly number[];
}

/**
 * Board 1: the add-trap for $(x^{4})^{2}$ is $x^{6}$, which is the honest answer to
 * $(x^{2})^{3}$ sitting right beside it. Board 2 does the same with $x^{7}$.
 */
const BOARDS: readonly Board[] = [
  {
    pairs: [
      { inner: 2, outer: 3 },
      { inner: 4, outer: 2 },
      { inner: 3, outer: 3 },
    ],
    dealt: [2, 0, 1],
  },
  {
    pairs: [
      { inner: 5, outer: 2 },
      { inner: 7, outer: 1 },
      { inner: 2, outer: 6 },
    ],
    dealt: [1, 2, 0],
  },
];

export function PowerOfPowerMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  const pairs: MatchPair[] = board.pairs.map(({ inner, outer }) => {
    const product = inner * outer;
    const sum = inner + outer;
    return {
      id: `p${inner}-${outer}`,
      left: `\\left(x^{${inner}}\\right)^{${outer}}`,
      right: `x^{${product}}`,
      leftSpoken: `x to the ${inner}, all raised to the ${outer}`,
      rightSpoken: `x to the ${product}`,
      why: (
        <>
          <InlineMath latex={`\\left(x^{${inner}}\\right)^{${outer}}`} /> is {outer} copies
          of <InlineMath latex={`x^{${inner}}`} /> multiplied together, and copies that
          share a base add their exponents, so the total is{" "}
          <InlineMath latex={`${inner}`} /> added to itself {outer} times. Adding a number
          to itself {outer} times is multiplying it by {outer}, which is why the rule is{" "}
          <InlineMath latex="\left(x^{a}\right)^{b} = x^{ab}" /> and the answer is{" "}
          <InlineMath latex={`x^{${product}}`} />, not <InlineMath latex={`x^{${sum}}`} />.
        </>
      ),
    };
  });

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={pairs}
      rightOrder={board.dealt}
      prompt="Tap a power of a power on the left, then tap the single power on the right that it equals. You can also drag and drop one onto the other."
      conclusion={
        <>
          Every join came out at <InlineMath latex="x^{ab}" />, never{" "}
          <InlineMath latex="x^{a+b}" />. That second form belongs to a different shape:{" "}
          <InlineMath latex="x^{a} \cdot x^{b}" />, two powers side by side rather than one
          power raised again.
        </>
      }
      ariaLabel="Three powers of a power, to be joined to the single power each one equals"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with three new powers"
    />
  );
}
