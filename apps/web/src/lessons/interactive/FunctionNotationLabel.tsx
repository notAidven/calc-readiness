/**
 * FUN.1 slide 1: what each piece of `f(3) = 11` is called, and why the brackets beside a
 * NAME do not mean what the brackets beside a NUMBER mean.
 *
 * Registered as `function-notation-label`, built on the `LabelParts` kind.
 *
 * The figure carries two statements on purpose. Labelling `f` and `3` on its own teaches two
 * words; setting `4(3)` next to it and asking for the word **factor** makes the learner
 * decide, for two pieces sitting in the same position on the page, which one is being
 * multiplied and which one is a rule's name. That is the misconception this node has to
 * close: `f(3)` is not `f` times `3`, it is the value `f` returns for `3`.
 *
 * Both boards keep the two statements in the same order, so what rotates is the numbers and
 * the name rather than the arrangement, and neither board reuses the check's numbers.
 *
 * ## Why the statements are the bare bracket expressions, and not the equations
 *
 * They were `f(3) = 11 \text{ has}` and `4(3) = 12 \text{ has}`, with a third slot naming the
 * OUTPUT, and that figure could not be drawn: measured at the 460px figure content cap it
 * wanted 526.7px inside a 434px box, so it broke between its two statements and put its blanks
 * on two lines. Every other labelling figure in the tree draws its blanks on one row there
 * (247.1px to 420.9px), and two sweeps assert it — `labelFigureWhole` and `widgetDropSlots`.
 *
 * Slot sizing is not the lever, which `styles.css` says and this figure is the proof of: all
 * four blanks sat exactly at the family's `3.5rem` floor, so 224px of the 434px was empty
 * boxes and the two leads were 237px more. Nothing short of losing a blank fits.
 *
 * The blank it loses is the output, and dropping it shortens the lead as well — `= 11` is only
 * on the board so that the `11` under it has something to be the output OF. What is left is
 * exactly the comparison the figure exists for, and it is a truer statement of it: `f(3)` on
 * its own really does have a name and an input, where the equation had an output that is not
 * part of the notation at all. `4(3)` has a factor and an input in the same two positions. The
 * word "output" is still taught, in this board's own conclusion and in the pack's prose.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type FigurePart, LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Board {
  lead: string;
  parts: readonly FigurePart[];
  ariaLabel: string;
  conclusion: ReactNode;
}

const BOARDS: readonly Board[] = [
  {
    lead: "f(3) \\text{ has}",
    ariaLabel:
      "The function value f of 3, beside the product 4 times 3 written as 4 in brackets 3, with three parts to name",
    conclusion: (
      <>
        Both statements are written with brackets and they mean different things.{" "}
        <InlineMath latex="f(3)" /> hands the input <InlineMath latex="3" /> to the rule
        named <InlineMath latex="f" /> and reads back one output, while{" "}
        <InlineMath latex="4(3)" /> is a product. Function notation never means multiply.
      </>
    ),
    parts: [
      {
        id: "f-name",
        latex: "f",
        name: "name",
        spoken: "the letter f in front of the first brackets",
        why: (
          <>
            The letter in front of the brackets is what the rule is called. It stands for a
            whole rule rather than for a number, so there is nothing there to multiply by.
          </>
        ),
      },
      {
        id: "f-input",
        latex: "3",
        name: "input",
        spoken: "the 3 inside the first brackets",
        before: ",",
        why: (
          <>
            Whatever sits inside the brackets is the number handed in to the rule. Reading{" "}
            <InlineMath latex="f(3)" /> as <InlineMath latex="f \times 3" /> is the mistake
            this figure exists to catch.
          </>
        ),
      },
      {
        id: "f-factor",
        latex: "4",
        name: "factor",
        spoken: "the 4 in front of the second brackets",
        // The product without its value, for the width reason in the header, and because the
        // piece being named is the `4` in front of the brackets rather than what the product
        // comes to. `12` is on screen in this part's own reasoning and in the conclusion.
        lead: "4(3) \\text{ has}",
        why: (
          <>
            Here the thing in front of the brackets is a number, so the brackets really do
            mean multiply: <InlineMath latex="4(3)" /> is <InlineMath latex="12" />. A
            rule's name in that same position never does.
          </>
        ),
      },
    ],
  },
  {
    lead: "g(-2) \\text{ has}",
    ariaLabel:
      "The function value g of negative 2, beside the product 6 times negative 2 written as 6 in brackets negative 2, with three parts to name",
    conclusion: (
      <>
        The brackets look the same in both statements and say different things.{" "}
        <InlineMath latex="g(-2)" /> is the output the rule <InlineMath latex="g" /> returns
        for the input <InlineMath latex="-2" />, while <InlineMath latex="6(-2)" /> is a
        product. A negative input changes nothing about that.
      </>
    ),
    parts: [
      {
        id: "g-name",
        latex: "g",
        name: "name",
        spoken: "the letter g in front of the first brackets",
        why: (
          <>
            The letter in front of the brackets names the rule. Any letter can do that job,
            and it is never a number waiting to be multiplied.
          </>
        ),
      },
      {
        id: "g-input",
        latex: "-2",
        name: "input",
        spoken: "the negative 2 inside the first brackets",
        before: ",",
        why: (
          <>
            The whole number inside the brackets is the input, minus sign included, so{" "}
            <InlineMath latex="g(-2)" /> asks what the rule returns at{" "}
            <InlineMath latex="-2" />.
          </>
        ),
      },
      {
        id: "g-factor",
        latex: "6",
        name: "factor",
        spoken: "the 6 in front of the second brackets",
        // Without its value, for the reason board one's `4(3)` gives, and this board needs
        // the room more: a negative input widens both of its leads.
        lead: "6(-2) \\text{ has}",
        why: (
          <>
            A number in front of brackets multiplies what is inside them, so{" "}
            <InlineMath latex="6(-2)" /> is <InlineMath latex="-12" />. Position alone does
            not decide the meaning: what sits there does.
          </>
        ),
      },
    ],
  },
];

export function FunctionNotationLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LabelParts
      key={variant.nonce}
      lead={board.lead}
      parts={board.parts}
      dealt={labelPartsDeal(board.parts.length, variant.index)}
      objective="Name all three pieces, so the finished figure separates the number a rule is handed from the number that multiplies."
      prompt="Drag and drop each name onto the piece it belongs to."
      conclusion={board.conclusion}
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different pair of statements"
    />
  );
}
