/**
 * RAD.3 interactive (slide 1): say which number of a fraction exponent does which job, and
 * name the index.
 *
 * Everything that goes wrong later in this node goes wrong here: a learner who has not
 * separated the two jobs writes $x^{3/2}$ where $x^{2/3}$ belongs and gets a different
 * number rather than a differently written one. So the top of the fraction takes "power" and
 * the bottom takes "root", with the index of an actual root sign there beside them to be
 * named at the same time.
 *
 * All three chips are single terms, because a name slot holds a name. "Which power to raise
 * to" and "which root to take" were descriptions built round a verb, which is the shape a
 * paraphrase takes when it stands in for a term.
 *
 * The second row is NOT redundant with the first, and must not be collapsed into it: the
 * same number is the "root" of the fraction exponent and the "index" of the radical, and
 * holding those two words against one number is what this slide teaches.
 *
 * ## Both expressions are written out in full, and the numbers are quoted from them
 *
 * The figure used to hollow the numbers out of the expressions with `\phantom` so they
 * appeared only above their slots, and both hollows rendered as something else:
 * `x^{\frac{\phantom{5}}{\phantom{4}}}` kept the fraction BAR and nothing else, so a
 * superscript horizontal line read as $x^{-\ }$ — a negative exponent, which EXP.1 teaches
 * immediately before this — and `\sqrt[\phantom{4}]{x}` read as a plain square root, whose
 * index is 2, directly contradicting the `why` text beside it.
 *
 * So each expression is now complete, and its numbers are quoted after a "has": the learner
 * reads $x^{\dfrac{5}{4}}$ and $\sqrt[4]{x}$, both true, and names the numbers standing under
 * the slots.
 *
 * `\dfrac` rather than `\frac`, and it is not a stylistic choice. A `\frac` inside a
 * superscript is set in script style, which puts its numerator and denominator at
 * scriptscript size — about 8px in a 460px card, which is not a legible statement of the very
 * expression the slide is about. `\dfrac` forces display style, so the fraction comes out at
 * full size where it can be read, which is the house rule for a diagram fraction: give it the
 * room rather than shrink it. A solidus would also be legible and is what this node's PROSE
 * uses ($8^{2/3}$, $x^{p/q}$), but `visualsMath.test.tsx` bans `\d/\d` inside a visual and
 * that guard is right to: an authored `5/4` is indistinguishable from a fraction somebody
 * forgot to typeset.
 *
 * Assembling $x^{5/4}$ out of the slotted parts themselves was tried first and rejected on
 * measurement: a slot is 3.5rem wide at minimum, so the base and the two digits spread over
 * ~130px with the digits at 0.68em, and the result reads as three floating marks rather than
 * as one exponent. That is why the numbers appear twice — once in the expression, once above
 * the slot naming them — and why the "has" is load-bearing rather than decoration.
 *
 * ## No fraction is set in a superscript in the PROSE
 *
 * `\dfrac` buys legibility in the figure because a figure has vertical room. The status line
 * and the reveal panel do not, and a fraction set in a superscript there is script style all
 * the way down: measured at the 460px card, the exponent of `x^{\frac{1}{4}}` in a reveal
 * comes out around 5px, which is a statement nobody can read. `\dfrac` in the same place is
 * legible and grows the paragraph 61.5px -> 81.8px, overlapping the line above it.
 *
 * So the prose does not put a fraction in a superscript at all. It makes the fraction the
 * subject instead ("an exponent of $\tfrac{5}{4}$", "putting $\tfrac{1}{4}$ in the exponent"),
 * which is set at text style, is legible, and costs nothing: 59.0px against the 61.5px the
 * unreadable version took, because the superscript was pushing the line box open.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Variant {
  p: number;
  q: number;
  rootName: string;
}

/** Neither exponent is the slide's own $p/q$ or the CFU's $3/2$. */
const VARIANTS: readonly Variant[] = [
  { p: 5, q: 4, rootName: "fourth root" },
  { p: 2, q: 3, rootName: "cube root" },
];

export function FractionExponentLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(VARIANTS.length, props);
  const { p, q, rootName } = VARIANTS[variant.index] ?? (VARIANTS[0] as Variant);

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(3, variant.index)}
      lead={`x^{\\dfrac{${p}}{${q}}} \\;\\text{has}`}
      parts={[
        {
          id: "top",
          latex: `${p}`,
          name: "power",
          spoken: `the ${p} on top of the fraction`,
          why: (
            <>
              The top of a fraction exponent is an ordinary power, so{" "}
              <InlineMath latex={`${p}`} /> is how many times the base is multiplied by
              itself. It is the part that would still be there if the exponent were the
              whole number <InlineMath latex={`${p}`} />.
            </>
          ),
        },
        {
          id: "bottom",
          latex: `${q}`,
          name: "root",
          spoken: `the ${q} on the bottom of the fraction`,
          why: (
            <>
              The bottom names the root, because putting{" "}
              <InlineMath latex={`\\tfrac{1}{${q}}`} /> in the exponent gives exactly{" "}
              <InlineMath latex={`\\sqrt[${q}]{x}`} />, which is what the slide before
              worked out. So <InlineMath latex={`${q}`} /> asks for the {rootName}, and it
              never acts as a power.
            </>
          ),
        },
        {
          id: "index",
          latex: `${q}`,
          lead: `\\sqrt[${q}]{x} \\;\\text{has}`,
          name: "index",
          spoken: `the small ${q} written into the root sign`,
          why: (
            <>
              The small number written into the radical sign is called the index, and it is
              the same <InlineMath latex={`${q}`} /> that sat on the bottom of the fraction.
              A square root has index <InlineMath latex="2" />, and because it is by far the
              most common that one is left off.
            </>
          ),
        },
      ]}
      // Which number does which job is the whole question, so the goal counts the names it
      // wants without saying which is which. Naming them against their numbers here would
      // be the answer. The count has to be three, though: the root sign's small number is
      // a third name, and it is not one of the two numbers in the fraction exponent.
      objective="Goal: settle which of the two numbers in a fraction exponent does which job, and name the small number a root sign carries as well."
      prompt="Drag each name into the box above the number it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          An exponent of <InlineMath latex={`\\tfrac{${p}}{${q}}`} /> asks for two things at
          once: the {rootName} (named by the bottom) and the power{" "}
          <InlineMath latex={`${p}`} /> (named by the top). Swap them and the exponent reads{" "}
          <InlineMath latex={`\\tfrac{${q}}{${p}}`} />, which is a different number and not
          a different spelling of the same one.
        </>
      }
      ariaLabel={`The fraction exponent ${p} over ${q}, beside a root sign with ${q} written into it`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different exponent"
    />
  );
}
