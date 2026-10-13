/**
 * EXP.1 interactive (slide 6): build the argument that FORCES a negative exponent to be a
 * reciprocal, one step at a time.
 *
 * The halving ladder shows what the values are; it does not show why they could not have
 * been anything else. This does. Every step of the chain rests on a rule the learner
 * already has, and the only way to lay it out is to know which rule each line is standing
 * on, so ordering is the interaction rather than a costume on one.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The variable or number the chain is run on. */
  base: string;
  /** The exponent, as written. */
  k: string;
  /** The reciprocal the chain lands on. */
  reciprocal: string;
  spokenBase: string;
  /** The order the four steps are dealt in. Never in order. */
  dealt: readonly number[];
}

/**
 * The chain runs on REAL NUMBERS first. Laid out over `x` and `k` it is four lines of
 * symbols whose order can be argued about without any of them meaning anything, and QA
 * read it exactly that way. On $2$ and $3$ every line is a fact the learner can check,
 * and the second board generalises it once the shape is familiar.
 */
const BOARDS: readonly Board[] = [
  { base: "2", k: "3", reciprocal: "\\dfrac{1}{8}", spokenBase: "2", dealt: [1, 3, 0, 2] },
  {
    base: "x",
    k: "k",
    reciprocal: "\\dfrac{1}{x^{k}}",
    spokenBase: "x",
    dealt: [2, 0, 3, 1],
  },
];

export function NegativeExponentOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { base, k, reciprocal, spokenBase } = board;
  const power = `${base}^{${k}}`;
  const inverse = `${base}^{-${k}}`;

  const steps: OrderedStep[] = [
    {
      id: "product",
      latex: `${power} \\cdot ${inverse} = ${base}^{${k} + (-${k})}`,
      spoken: `${spokenBase} to the ${k} times ${spokenBase} to the minus ${k} equals ${spokenBase} to the ${k} plus negative ${k}`,
      why: (
        <>
          Nothing can be said about <InlineMath latex={inverse} /> until it is put next to
          something, so the chain opens by multiplying it by <InlineMath latex={power} />.
          Both powers share a base, so the product rule applies and their exponents add.
        </>
      ),
    },
    {
      id: "cancel",
      latex: `${base}^{${k} + (-${k})} = ${base}^{0}`,
      spoken: `${spokenBase} to the ${k} plus negative ${k} equals ${spokenBase} to the zero`,
      why: (
        <>
          This step is only arithmetic in the exponent:{" "}
          <InlineMath latex={`${k} + (-${k}) = 0`} />. It has to come after the exponents
          have been added, because until then there is no single exponent to work out.
        </>
      ),
    },
    {
      id: "zero",
      latex: `${base}^{0} = 1`,
      spoken: `${spokenBase} to the zero equals one`,
      why: (
        <>
          Halving a ledger of powers all the way down settled this one: the exponent
          reaching zero changes nothing about the halving, so{" "}
          <InlineMath latex={`${base}^{0} = 1`} />. It is what turns the chain into
          something useful, because it says the product{" "}
          <InlineMath latex={`${power} \\cdot ${inverse}`} /> is not just some power. It is
          exactly <InlineMath latex="1" />.
        </>
      ),
    },
    {
      id: "conclude",
      latex: `${inverse} = ${reciprocal}`,
      spoken: `${spokenBase} to the minus ${k} equals one over ${spokenBase} to the ${k}`,
      why: (
        <>
          Two numbers whose product is <InlineMath latex="1" /> are reciprocals, and a
          number has only one reciprocal. So <InlineMath latex={inverse} /> is not merely
          allowed to be <InlineMath latex={reciprocal} />; there is nothing else it could
          be.
        </>
      ),
    },
  ];

  return (
    <OrderSteps
      key={variant.nonce}
      steps={steps}
      dealt={board.dealt}
      // Deliberately the open question, not the destination. The last chip on offer IS
      // `inverse = reciprocal`, so a goal line naming the value would hand over the final
      // tap. The two ingredients are named in words for the same reason: written out,
      // `base^0 = 1` is itself one of the four chips.
      objective={
        <>
          Goal: settle what <InlineMath latex={inverse} /> is forced to equal, using nothing
          but the product rule and the value of a zero exponent.
        </>
      }
      prompt="Tap the line that comes next."
      conclusion={
        <>
          A negative exponent was never a separate rule to remember. Keeping the product
          rule and <InlineMath latex={`${base}^{0} = 1`} /> leaves exactly one value that{" "}
          <InlineMath latex={inverse} /> is allowed to have, and that value is{" "}
          <InlineMath latex={reciprocal} />.
        </>
      }
      ariaLabel="Four lines of an argument, to be put in the order that each one rests on"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different base"
    />
  );
}
