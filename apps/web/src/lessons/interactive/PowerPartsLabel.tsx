/**
 * EXP.1 interactive (slide 0): name the parts of a power, and say what the exponent counts.
 *
 * The vocabulary slide used to be four sentences of naming with nothing to do, which is the
 * one shape a learner reads past. Naming is a correspondence, so the interaction is
 * labelling: each name has to land on the piece of the expression it belongs to, including
 * the written-out product, which is where "the exponent counts copies of the base" stops
 * being a definition and becomes something the learner has checked.
 *
 * Starting over deals a different power, so the second pass is worked rather than recalled.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Variant {
  base: number;
  exponent: number;
}

/** Neither power is the slide's own $2^{10}$, so the names cannot be read off the prose. */
const VARIANTS: readonly Variant[] = [
  { base: 3, exponent: 5 },
  { base: 7, exponent: 4 },
];

const COUNT_WORD: Record<number, string> = { 4: "four", 5: "five" };

export function PowerPartsLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(VARIANTS.length, props);
  const { base, exponent } = VARIANTS[variant.index] ?? (VARIANTS[0] as Variant);
  const written = Array(exponent).fill(String(base)).join(" \\cdot ");
  const copies = COUNT_WORD[exponent] ?? String(exponent);

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(3, variant.index)}
      parts={[
        {
          id: "base",
          latex: `${base}`,
          name: "base",
          spoken: `the ${base} on the line`,
          why: (
            <>
              The base is the number being multiplied, and here that is{" "}
              <InlineMath latex={`${base}`} />. Every one of the copies on the right is a{" "}
              <InlineMath latex={`${base}`} />, which is what makes it the base.
            </>
          ),
        },
        {
          id: "exponent",
          latex: `${exponent}`,
          name: "exponent",
          spoken: `the raised ${exponent}`,
          raised: true,
          why: (
            <>
              The exponent is the small raised number, and its job is to count. Here it says{" "}
              <InlineMath latex={`${exponent}`} />, and there are {copies} copies of the
              base written out on the right, which is the same {exponent}.
            </>
          ),
        },
        {
          id: "product",
          latex: written,
          before: "=",
          name: `${copies} copies of the base`,
          spoken: "the written out product",
          why: (
            <>
              This is what <InlineMath latex={`${base}^{${exponent}}`} /> is shorthand for.
              The exponent counts how many copies of the base are multiplied together, so an
              exponent of {exponent} means exactly {copies} of them in a row.
            </>
          ),
        },
      ]}
      lead=""
      objective="Goal: put a name to each of the three things a power is made of: what gets multiplied, how many times, and the whole thing together."
      prompt="Drag each name into the box above the part it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          A base with an exponent on it is called a <strong>power</strong>, so{" "}
          <InlineMath latex={`${base}^{${exponent}}`} /> is a power with base{" "}
          <InlineMath latex={`${base}`} /> and exponent <InlineMath latex={`${exponent}`} />
          . The exponent is a count, not a multiplier:{" "}
          <InlineMath latex={`${base}^{${exponent}}`} /> is {copies} copies multiplied
          together, not <InlineMath latex={`${base} \\cdot ${exponent}`} />.
        </>
      }
      ariaLabel={`${base} to the ${exponent}, written out as ${copies} copies of ${base} multiplied together`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different power"
    />
  );
}
