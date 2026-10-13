/**
 * LIN.6 slide 1: the same unpacking, on four rules, until the band is the obvious answer.
 *
 * The slide unpacks one at-most rule into a compound inequality and reads off one band. A claim that
 * this always happens is a claim about several rules, so the table is the shape it already has: the
 * first row is worked, and the rows under it are the same move on rules with different standards,
 * tolerances and brackets. Each finished row stays on screen while the next is worked.
 *
 * The options include the band the learner gets by adding the tolerance to the standard on both
 * ends, and the union that belongs to the OTHER direction of sign, which is the mistake this whole
 * node exists to separate.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

/** Neither board is the paragraph's own $\lvert w - 60 \rvert \le 2$, which is worked in full. */
const BOARDS: readonly Board[] = [
  {
    rows: [
      {
        id: "a0",
        fixed: ["\\lvert w - 30 \\rvert \\le 4", "-4 \\le w - 30 \\le 4"],
        value: "[26, 34]",
        blank: false,
        spoken: "the absolute value of w minus 30 is at most 4",
      },
      {
        id: "a1",
        fixed: ["\\lvert w - 18 \\rvert \\le 5", "-5 \\le w - 18 \\le 5"],
        value: "[13, 23]",
        blank: true,
        spoken: "the absolute value of w minus 18 is at most 5",
        why: (
          <>
            Adding <InlineMath latex="18" /> right across{" "}
            <InlineMath latex="-5 \le w - 18 \le 5" /> gives{" "}
            <InlineMath latex="13 \le w \le 23" />. Both ends are taken in, because the sign
            was the at-most kind on both sides of the compound inequality.
          </>
        ),
      },
      {
        id: "a2",
        fixed: ["\\lvert w - 40 \\rvert < 6", "-6 < w - 40 < 6"],
        value: "(34, 46)",
        blank: true,
        spoken: "the absolute value of w minus 40 is less than 6",
        why: (
          <>
            The same move gives <InlineMath latex="34 < w < 46" />, and this sign is STRICT,
            so neither end is taken in and both brackets are round. The band is the same
            width as it would be with an at-most sign, and it is missing its two endpoints.
          </>
        ),
      },
      {
        id: "a3",
        fixed: ["\\lvert w + 7 \\rvert \\le 3", "-3 \\le w + 7 \\le 3"],
        value: "[-10, -4]",
        blank: true,
        spoken: "the absolute value of w plus 7 is at most 3",
        why: (
          <>
            The quantity inside adds rather than subtracts, so isolating{" "}
            <InlineMath latex="w" /> means taking <InlineMath latex="7" /> off right across:{" "}
            <InlineMath latex="-10 \le w \le -4" />. A band can sit entirely below zero, and
            it is still one band.
          </>
        ),
      },
    ],
    options: [
      { id: "a-13", latex: "[13, 23]", spoken: "the closed band from 13 to 23" },
      { id: "a-34", latex: "(34, 46)", spoken: "the open band from 34 to 46" },
      {
        id: "a-neg",
        latex: "[-10, -4]",
        spoken: "the closed band from negative 10 to negative 4",
      },
      { id: "a-both", latex: "[4, 10]", spoken: "the closed band from 4 to 10" },
      {
        id: "a-union",
        latex: "(-\\infty, 34) \\cup (46, \\infty)",
        spoken: "the union of everything below 34 and everything above 46",
      },
    ],
  },
  {
    rows: [
      {
        id: "b0",
        fixed: ["\\lvert w - 25 \\rvert \\le 2", "-2 \\le w - 25 \\le 2"],
        value: "[23, 27]",
        blank: false,
        spoken: "the absolute value of w minus 25 is at most 2",
      },
      {
        id: "b1",
        fixed: ["\\lvert w - 12 \\rvert < 8", "-8 < w - 12 < 8"],
        value: "(4, 20)",
        blank: true,
        spoken: "the absolute value of w minus 12 is less than 8",
        why: (
          <>
            Adding <InlineMath latex="12" /> right across gives{" "}
            <InlineMath latex="4 < w < 20" />, with both ends left out because the sign is
            strict. One band, and the tolerance is what sets its width.
          </>
        ),
      },
      {
        id: "b2",
        fixed: ["\\lvert 2w - 10 \\rvert \\le 6", "-6 \\le 2w - 10 \\le 6"],
        value: "[2, 8]",
        blank: true,
        spoken: "the absolute value of 2 w minus 10 is at most 6",
        why: (
          <>
            Adding <InlineMath latex="10" /> right across gives{" "}
            <InlineMath latex="4 \le 2w \le 16" />, and dividing right across by{" "}
            <InlineMath latex="2" /> gives <InlineMath latex="2 \le w \le 8" />. The divisor
            is positive, so no sign turns over on that step.
          </>
        ),
      },
      {
        id: "b3",
        fixed: ["\\lvert w + 3 \\rvert < 5", "-5 < w + 3 < 5"],
        value: "(-8, 2)",
        blank: true,
        spoken: "the absolute value of w plus 3 is less than 5",
        why: (
          <>
            Taking <InlineMath latex="3" /> off right across gives{" "}
            <InlineMath latex="-8 < w < 2" />. The band straddles zero, which changes
            nothing about the method and is worth seeing once.
          </>
        ),
      },
    ],
    options: [
      { id: "b-4", latex: "(4, 20)", spoken: "the open band from 4 to 20" },
      { id: "b-2", latex: "[2, 8]", spoken: "the closed band from 2 to 8" },
      { id: "b-neg", latex: "(-8, 2)", spoken: "the open band from negative 8 to 2" },
      { id: "b-half", latex: "[-2, 8]", spoken: "the closed band from negative 2 to 8" },
      {
        id: "b-union",
        latex: "(-\\infty, 4) \\cup (20, \\infty)",
        spoken: "the union of everything below 4 and everything above 20",
      },
    ],
  },
];

export function AbsBandTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["the rule", "the compound inequality", "the band, in interval notation"]}
      rows={board.rows}
      options={board.options}
      objective="Goal: finish the last column, until the table shows every one of these rules leaving a single band and the brackets coming from the sign."
      prompt="Isolate the variable right across the middle column, then read the band off it."
      conclusion={
        <>
          Four rules, four single bands. The at-most signs closed their ends and the strict
          ones left them open, and the arithmetic between the two kinds never differed at
          all.
        </>
      }
      ariaLabel="A table of at-most absolute-value rules, each unpacked into a compound inequality, with the interval to complete"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four different rules"
    />
  );
}
