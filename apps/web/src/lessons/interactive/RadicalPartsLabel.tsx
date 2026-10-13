/**
 * RAD.1 interactive (slide 0): name the parts of a square root, and pick out the value the
 * symbol is actually allowed to return.
 *
 * The naming and the principal-root rule arrive together in the prose, so they are tested
 * together here. Two of the three slots are vocabulary; the third is the one that matters,
 * because both $6$ and $-6$ square to $36$ and only one of them is what the symbol names.
 * Putting "result" onto the positive value and nothing onto the negative one is the rule
 * being applied rather than recited.
 *
 * All three chips are NAMES, because the goal line asks for a name. "What the symbol hands
 * back" was a description sitting in a slot the widget's own goal calls a name, and it ran
 * about three times the width of the other two, which fought the slot sizing. "Principal
 * root" was considered and rejected as heavier than this slot needs: the conclusion below
 * already teaches the single-value property in full.
 *
 * ## The expression is written out, and the three parts are quoted from it
 *
 * The figure used to BE the three terms, in a row: `\sqrt{\phantom{00}}`, then `49`, then
 * `= 7`. Read left to right that is a root sign with nothing under its bar followed by a
 * separate `49`, which is not $\sqrt{49}$ — it is a hollow radical beside a number, and the
 * only sense a learner can make of the juxtaposition is a product. The `49` was drawn OUTSIDE
 * the very symbol the slide is teaching it sits inside.
 *
 * `\sqrt{49} = 7` is now stated whole in the lead and the three named parts are quoted after
 * a "has", the same shape RAD.3's `fraction-exponent-label` takes. The radical sign is
 * `\surd` rather than a `\sqrt` with a hollowed radicand: `\surd` is the character itself, so
 * nothing in the figure is drawn invisible and nothing reads as an unfinished expression. It
 * loses the vinculum, which is why the wording is "root sign" rather than the old
 * "hook-and-bar symbol" — the bar belongs to the radicand it covers, and there is no radicand
 * on a symbol quoted on its own.
 *
 * Assembling $\sqrt{49}$ out of the slotted parts is impossible in this kind and not a matter
 * of taste: the radicand has to sit UNDER the surd, the parts sit in a flex row, and a slot is
 * 3.5rem wide at minimum. That is the same constraint that forced the same shape one node
 * over, and it is why the numbers appear twice.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Variant {
  radicand: number;
  root: number;
}

/** Neither radicand is the slide's own $36$. */
const VARIANTS: readonly Variant[] = [
  { radicand: 49, root: 7 },
  { radicand: 81, root: 9 },
];

export function RadicalPartsLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(VARIANTS.length, props);
  const { radicand, root } = VARIANTS[variant.index] ?? (VARIANTS[0] as Variant);

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(3, variant.index)}
      lead={`\\sqrt{${radicand}} = ${root} \\;\\text{has}`}
      parts={[
        {
          id: "radical",
          latex: "\\surd",
          name: "radical",
          spoken: "the root sign on its own",
          why: (
            <>
              The root sign itself is the radical. It is the instruction, and on its own it
              asks a question rather than naming a number: what, multiplied by itself, gives
              whatever is written under its bar?
            </>
          ),
        },
        {
          id: "radicand",
          latex: `${radicand}`,
          before: "\\text{,}",
          name: "radicand",
          spoken: `the ${radicand} underneath`,
          why: (
            <>
              The number sitting inside the radical is the radicand, so here the radicand is{" "}
              <InlineMath latex={`${radicand}`} />. It is what the question is being asked
              about.
            </>
          ),
        },
        {
          id: "principal",
          latex: `${root}`,
          before: "\\text{,}",
          name: "result",
          spoken: `the ${root} on the right`,
          why: (
            <>
              Two numbers pass the test, since{" "}
              <InlineMath latex={`${root} \\times ${root} = ${radicand}`} /> and{" "}
              <InlineMath latex={`(-${root}) \\times (-${root}) = ${radicand}`} /> as well,
              but the symbol has to name exactly one of them. It always names the one that
              is not negative, which is called the principal root, so{" "}
              <InlineMath latex={`\\sqrt{${radicand}} = ${root}`} /> and never{" "}
              <InlineMath latex={`-${root}`} />.
            </>
          ),
        },
      ]}
      objective="Goal: put a name to each part of a square root: the symbol, what sits inside it, and what it hands back."
      prompt="Drag each name into the box above the part it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          <InlineMath latex={`\\sqrt{${radicand}} = ${root}`} />, with a single value coming
          back and never a negative one. That single-value promise is what lets a root be
          written down as an answer at all: <InlineMath latex={`\\sqrt{${radicand}}`} /> is
          a number, not a choice between two.
        </>
      }
      ariaLabel={`The square root of ${radicand} equals ${root}, with its parts to be named`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different root"
    />
  );
}
