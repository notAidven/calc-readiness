/**
 * EL.2 interactive (slide 3): the three features a transformed exponential hands over, and
 * the name each one goes by.
 *
 * A rule and the three readings taken off it, laid out left to right, with the TERM for each
 * reading to be dropped underneath. This is a correspondence rather than a procedure, which is
 * what `LabelParts` is for, and the labelling matters more here than it looks: the three
 * readings are all small numbers or a small pair, so a learner who has the arithmetic and not
 * the vocabulary cannot say which of them a question about "the asymptote" is asking for, and
 * that is exactly the confusion the practice set's L1 and L2 shapes separate.
 *
 * Every name is a real term the lesson or its prerequisites have introduced, and all three
 * answer the same question the board asks: what is this reading CALLED. None of them is a
 * paraphrase of a term, and none describes what the reading does.
 *
 * The `y`-intercept is deliberately the one whose value is not simply copied out of the rule:
 * it is the coefficient and the constant added together, so its slot is the one a learner who
 * reads the constant off twice will get wrong. `LabelParts` deals the names in a derangement,
 * so no name is ever offered opposite the reading it belongs to, and it passes its own live
 * `othersRemain`, so being told one name hands the figure back with the other two still to place.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Variant {
  /** The coefficient, the base, and the constant on the end. */
  a: number;
  b: number;
  k: number;
}

/**
 * Two rules. Neither is the CFU's, and the second is REFLECTED, so its intercept sits below
 * its asymptote and the pair cannot be answered by one remembered arrangement.
 */
const VARIANTS: readonly Variant[] = [
  { a: 2, b: 3, k: 5 },
  { a: -4, b: 2, k: 3 },
];

export function ExpFeatureLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(VARIANTS.length, props);
  const { a, b, k } = VARIANTS[variant.index] ?? (VARIANTS[0] as Variant);
  // A negative coefficient prints its own sign, so one spelling covers both variants.
  const lead = `${a} \\cdot ${b}^{x} + ${k}`;
  const intercept = a + k;
  const climbs = a > 0;

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(3, variant.index)}
      lead={`y = ${lead} \\quad\\Rightarrow\\quad`}
      parts={[
        {
          id: "asymptote",
          latex: `y = ${k}`,
          name: "horizontal asymptote",
          spoken: `the line y equals ${k}`,
          why: (
            <>
              The power shrinks toward <InlineMath latex="0" /> at one end of the graph, so
              the constant on the end is what the outputs press toward. A line the curve
              approaches and never reaches is its horizontal asymptote, and here that line
              is <InlineMath latex={`y = ${k}`} />.
            </>
          ),
        },
        {
          id: "intercept",
          latex: `(0,\\, ${intercept})`,
          name: "y-intercept",
          spoken: `the point 0 comma ${intercept}`,
          why: (
            <>
              At <InlineMath latex="x = 0" /> the power is <InlineMath latex="1" /> whatever
              the base is, so the height there is the coefficient plus the constant:{" "}
              <InlineMath latex={`${a} + ${k} = ${intercept}`} />. The point where a graph
              crosses the vertical axis is its <InlineMath latex="y" />
              -intercept.
            </>
          ),
        },
        {
          id: "factor",
          latex: `${b}`,
          name: "growth factor",
          spoken: `the ${b} being raised to the power`,
          why: (
            <>
              Every step multiplies the distance from the asymptote by the number being
              raised to the power, and that number is the growth factor. The outputs here
              run <InlineMath latex={`${a + k}`} />, <InlineMath latex={`${a * b + k}`} />,{" "}
              <InlineMath latex={`${a * b * b + k}`} />, which stand{" "}
              <InlineMath latex={`${Math.abs(a)}`} />,{" "}
              <InlineMath latex={`${Math.abs(a * b)}`} />,{" "}
              <InlineMath latex={`${Math.abs(a * b * b)}`} /> away from{" "}
              <InlineMath latex={`y = ${k}`} />, so it is those distances that{" "}
              <InlineMath latex={`${b}`} /> multiplies rather than the outputs themselves.
              The factor is above <InlineMath latex="1" />, so the distances keep widening
              and the curve pulls away from its asymptote rather than settling onto it.
            </>
          ),
        },
      ]}
      objective="Goal: put the right name to each of the three readings taken off this rule, so a question about any one of them names the reading it wants."
      prompt="Drag each name into the box above the reading it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          All three readings come straight off the rule with no power to evaluate: the
          constant on the end gives the asymptote, the coefficient added to it gives the
          crossing height, and the base decides the direction. Here the coefficient is{" "}
          <InlineMath latex={`${a}`} /> and the base is above <InlineMath latex="1" />, so
          the curve sits {climbs ? "above" : "below"} the line{" "}
          <InlineMath latex={`y = ${k}`} /> and runs {climbs ? "up" : "down"} to the right.
        </>
      }
      ariaLabel={`The rule y equals ${a} times ${b} to the x plus ${k}, beside the three readings taken off it`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different rule"
    />
  );
}
