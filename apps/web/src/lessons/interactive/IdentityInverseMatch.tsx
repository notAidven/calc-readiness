/**
 * NUM.3 interactive (slide 2): join each identity or inverse expression to what it gives.
 *
 * The thing worth learning here is the DIFFERENCE between the two families, not either rule
 * on its own: an identity hands the number back, an inverse collapses it to $0$ or to $1$.
 * That is a correspondence rather than a procedure, which is why this is a matching board.
 *
 * Matching is what makes the confusion cost something. The four right-hand chips are exactly
 * the four answers a learner might reach for, so somebody who thinks an inverse preserves
 * the number takes the chip an identity row needs and runs short at the end. Being told the
 * rule does not dislodge that mix-up; running out of chips does.
 *
 * The two additive rows share one number and the two multiplicative rows share another, so
 * each right-hand chip is distinct while the pairs a learner has to tell apart still sit
 * next to each other.
 *
 * Each pair carries its `name`, so joining one says which of the four rules it was and the
 * name stays on the joined item. Without that, only the learner who joined a pair WRONGLY
 * ever saw the words "additive inverse", since the naming lives in the reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  /** The number the two additive rules are stated about. */
  additive: string;
  spokenAdditive: string;
  /** The number the two multiplicative rules are stated about. */
  multiplicative: string;
  spokenMultiplicative: string;
  /** The reciprocal of `multiplicative`, as LaTeX, spelled out rather than computed. */
  reciprocal: string;
  spokenReciprocal: string;
  /** How the right column is dealt: indices into the four rules. Never in order. */
  dealt: readonly number[];
}

/**
 * Board 0 states the rules over letters, board 1 over digits. The numeric board is a
 * genuinely different question rather than the same board relettered: with values in place
 * the learner has to work out that $5 \times \tfrac{1}{5}$ is $1$ instead of reading the
 * answer off the shape of the symbols.
 */
const BOARDS: readonly Board[] = [
  {
    additive: "a",
    spokenAdditive: "a",
    multiplicative: "b",
    spokenMultiplicative: "b",
    reciprocal: "\\tfrac{1}{b}",
    spokenReciprocal: "one over b",
    dealt: [2, 0, 3, 1],
  },
  {
    additive: "7",
    spokenAdditive: "7",
    multiplicative: "5",
    spokenMultiplicative: "5",
    reciprocal: "\\tfrac{1}{5}",
    spokenReciprocal: "one fifth",
    dealt: [1, 3, 0, 2],
  },
];

export function IdentityInverseMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { additive: a, multiplicative: m, reciprocal: recip } = board;

  const pairs: MatchPair[] = [
    {
      id: "add-identity",
      left: `${a} + 0`,
      right: a,
      leftSpoken: `${board.spokenAdditive} plus zero`,
      rightSpoken: board.spokenAdditive,
      name: "additive identity",
      why: (
        <>
          <InlineMath latex="0" /> is the <strong>additive identity</strong>: adding it
          moves nothing along the number line, so the number comes back unchanged and{" "}
          <InlineMath latex={`${a} + 0 = ${a}`} />. Collapsing to <InlineMath latex="0" />{" "}
          is the job of the additive inverse, which adds the opposite instead.
        </>
      ),
    },
    {
      id: "mul-identity",
      left: `${m} \\times 1`,
      right: m,
      leftSpoken: `${board.spokenMultiplicative} times one`,
      rightSpoken: board.spokenMultiplicative,
      name: "multiplicative identity",
      why: (
        <>
          <InlineMath latex="1" /> is the <strong>multiplicative identity</strong>: one copy
          of a number is that number, so <InlineMath latex={`${m} \\times 1 = ${m}`} />.
          Landing ON <InlineMath latex="1" /> is the job of the multiplicative inverse.
        </>
      ),
    },
    {
      id: "add-inverse",
      left: `${a} + (-${a})`,
      right: "0",
      leftSpoken: `${board.spokenAdditive} plus negative ${board.spokenAdditive}`,
      rightSpoken: "zero",
      name: "additive inverse",
      why: (
        <>
          <InlineMath latex={`-${a}`} /> is the <strong>additive inverse</strong> of{" "}
          <InlineMath latex={a} />: the same distance from zero on the other side, so the
          two cancel and <InlineMath latex={`${a} + (-${a}) = 0`} />. An inverse undoes the
          number rather than preserving it, and what it undoes to is the identity for
          addition, <InlineMath latex="0" />.
        </>
      ),
    },
    {
      id: "mul-inverse",
      left: `${m} \\times ${recip}`,
      right: "1",
      leftSpoken: `${board.spokenMultiplicative} times ${board.spokenReciprocal}`,
      rightSpoken: "one",
      name: "multiplicative inverse",
      why: (
        <>
          <InlineMath latex={recip} /> is the <strong>multiplicative inverse</strong>, or
          reciprocal, of <InlineMath latex={m} />. Multiplying by it divides the number
          straight back out, so{" "}
          <InlineMath latex={`${m} \\times ${recip} = \\tfrac{${m}}{${m}} = 1`} />, landing
          on the identity for multiplication rather than on the one for addition.
        </>
      ),
    },
  ];

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={pairs}
      rightOrder={board.dealt}
      prompt="Tap an expression on the left, then tap what it gives on the right. You can also drag and drop one onto the other."
      conclusion={
        <>
          The two identities handed the number straight back, and the two inverses undid it.
          Which value an inverse undoes TO depends on the operation: addition lands on{" "}
          <InlineMath latex="0" /> and multiplication on <InlineMath latex="1" />, each on
          its own identity.
        </>
      }
      ariaLabel="Four identity and inverse expressions, to be joined to the value each one gives"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different numbers"
    />
  );
}
