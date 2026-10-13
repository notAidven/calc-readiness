/**
 * EL.5 interactive (slide 0): the product rule, produced from values rather than announced.
 *
 * The board hands over two common logarithms as decimals and then asks for two things the
 * learner can work out INDEPENDENTLY of each other: what the two decimals add up to, and what
 * the logarithm of the product is. Neither blank can be answered by reading the other one, and
 * they land on the same number, which is the whole discovery. A table that had printed the
 * conclusion, or that asked for only one of the two, would have made the coincidence something
 * to take on trust instead of something the learner writes down twice.
 *
 * The tray carries the three answers a learner reaches by mishandling the pair: the logarithm
 * of the SUM of the two numbers, the DIFFERENCE of the two logarithms, and their PRODUCT. The
 * product itself and the sum of the two arguments are there too, for the learner who answers a
 * question about a logarithm with the number underneath it.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  /** The two factors, and the product they build. */
  first: number;
  second: number;
  product: number;
  /** Their common logarithms, rounded to three places, and the value both blanks share. */
  firstLog: string;
  secondLog: string;
  total: string;
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

/**
 * Two boards, neither of them the pair named in the slide's own opening. Both are chosen so
 * the two rounded readings add to a whole number exactly, because a sum that came to
 * `1.9999` would leave the learner arguing with the rounding instead of reading the pattern.
 */
const BOARDS: readonly Board[] = [
  {
    first: 4,
    second: 25,
    product: 100,
    firstLog: "0.602",
    secondLog: "1.398",
    total: "2",
    rows: [
      {
        id: "b0-first",
        fixed: ["\\log 4"],
        value: "0.602",
        blank: false,
        spoken: "log 4",
      },
      {
        id: "b0-second",
        fixed: ["\\log 25"],
        value: "1.398",
        blank: false,
        spoken: "log 25",
      },
      {
        id: "b0-sum",
        fixed: ["\\log 4 + \\log 25"],
        value: "2",
        blank: true,
        spoken: "log 4 plus log 25",
        why: (
          <>
            Both readings are already on the board, so this row is an addition and nothing
            else: <InlineMath latex="0.602 + 1.398 = 2" />. Adding two logarithms is a
            question about the two exponents, never about the numbers underneath them.
          </>
        ),
      },
      {
        id: "b0-product",
        fixed: ["\\log 100"],
        value: "2",
        blank: true,
        spoken: "log 100",
        why: (
          <>
            A <InlineMath latex="\log" /> with no base written has base{" "}
            <InlineMath latex="10" />, and <InlineMath latex="10^{2} = 100" />, so this row
            is <InlineMath latex="2" />. It was worked out from the powers of ten on its
            own, which is what makes it evidence rather than a repetition of the row above.
          </>
        ),
      },
    ],
    options: [
      { id: "b0-two", latex: "2", spoken: "2" },
      { id: "b0-logsum", latex: "1.462", spoken: "1.462" },
      { id: "b0-diff", latex: "0.796", spoken: "0.796" },
      { id: "b0-times", latex: "0.842", spoken: "0.842" },
      { id: "b0-twentynine", latex: "29", spoken: "29" },
      { id: "b0-hundred", latex: "100", spoken: "100" },
    ],
  },
  {
    first: 5,
    second: 200,
    product: 1000,
    firstLog: "0.699",
    secondLog: "2.301",
    total: "3",
    rows: [
      {
        id: "b1-first",
        fixed: ["\\log 5"],
        value: "0.699",
        blank: false,
        spoken: "log 5",
      },
      {
        id: "b1-second",
        fixed: ["\\log 200"],
        value: "2.301",
        blank: false,
        spoken: "log 200",
      },
      {
        id: "b1-sum",
        fixed: ["\\log 5 + \\log 200"],
        value: "3",
        blank: true,
        spoken: "log 5 plus log 200",
        why: (
          <>
            The two readings are given, so this row is their sum:{" "}
            <InlineMath latex="0.699 + 2.301 = 3" />. What is being added here is two
            exponents on base <InlineMath latex="10" />, not the two arguments.
          </>
        ),
      },
      {
        id: "b1-product",
        fixed: ["\\log 1000"],
        value: "3",
        blank: true,
        spoken: "log 1000",
        why: (
          <>
            <InlineMath latex="10^{3} = 1000" />, so this row is <InlineMath latex="3" />,
            counted off the powers of ten without looking at the row above it. Two separate
            routes reaching one value is the evidence the board exists for.
          </>
        ),
      },
    ],
    options: [
      { id: "b1-three", latex: "3", spoken: "3" },
      { id: "b1-logsum", latex: "2.312", spoken: "2.312" },
      { id: "b1-diff", latex: "1.602", spoken: "1.602" },
      { id: "b1-times", latex: "1.608", spoken: "1.608" },
      { id: "b1-twoohfive", latex: "205", spoken: "205" },
      { id: "b1-thousand", latex: "1000", spoken: "1000" },
    ],
  },
];

export function LogProductTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["logarithm", "value"]}
      rows={board.rows}
      options={board.options}
      objective={
        <>
          Goal: finish the value column, then compare what the two logarithms add up to with
          the logarithm of <InlineMath latex={`${board.first} \\cdot ${board.second}`} />{" "}
          underneath it, and say whether a logarithm of a product has anything to do with a
          sum.
        </>
      }
      prompt="Each blank is worked out from the rows already filled in or from the powers of ten, whichever is shorter."
      conclusion={
        <>
          <InlineMath
            latex={`\\log ${board.first} + \\log ${board.second} = ${board.total}`}
          />{" "}
          and <InlineMath latex={`\\log ${board.product} = ${board.total}`} />, reached two
          different ways. A logarithm is an exponent, multiplying powers of one base adds
          their exponents, so the logarithm of a product is the sum of the logarithms:{" "}
          <InlineMath latex="\log(xy) = \log x + \log y" />.
        </>
      }
      ariaLabel="A table of common logarithms, with the sum of two of them and the logarithm of their product left blank"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different pair of factors"
    />
  );
}
