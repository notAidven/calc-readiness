/**
 * TRG.6 interactive (slide 1): the heading, the two readings there, and whether tangent has
 * a value at all.
 *
 * A table rather than a single question, because the claim the slide makes is a comparison.
 * "Tangent has no value at $90^{\circ}$" is a fact about one heading; put it in a column
 * beside the headings where tangent has a perfectly ordinary value and it becomes the test
 * that separates them, which is the division at the bottom of the ratio. Every board here
 * runs three ordinary rows against two broken ones.
 *
 * The board carries the sine as well as the cosine, which the plan's one-line shape does not.
 * It has to: tangent is $\dfrac{\sin\theta}{\cos\theta}$ and a row holding only the cosine is
 * a row no learner can fill except by recognising the answer. With both readings on the row
 * the blank is a division, and the rows where it has no value are the rows whose divisor is
 * zero rather than the rows a learner has been told to remember.
 *
 * The opening row is already worked and its tangent is an ordinary number, so the pattern the
 * table hands over is the move and not the verdict.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

/** What a row says, before it is turned into the shape `FillTable` reads. */
interface Reading {
  degrees: number;
  /** The sine and cosine at that heading, as LaTeX. */
  sin: string;
  cos: string;
  /** The tangent there, as LaTeX, or the undefined marker. */
  tan: string;
  /** How a screen reader says the heading and its two readings. */
  spoken: string;
  /** Why the blank takes that value. */
  why: ReactNode;
}

const UNDEFINED = "\\text{undefined}";

/** A row whose cosine is zero, so the division at the bottom of the ratio cannot be done. */
function broken(degrees: number, sin: string, spokenSin: string): Reading {
  return {
    degrees,
    sin,
    cos: "0",
    tan: UNDEFINED,
    spoken: `${degrees} degrees, where the sine is ${spokenSin} and the cosine is zero`,
    why: (
      <>
        The tangent is <InlineMath latex="\dfrac{\sin\theta}{\cos\theta}" />, and the cosine
        here is <InlineMath latex="0" />. Dividing by zero produces nothing at all, so
        tangent has no value at <InlineMath latex={`${degrees}^{\\circ}`} /> and its graph
        runs away on both sides of that heading instead of crossing it.
      </>
    ),
  };
}

/** An ordinary row: the two readings divide, and the quotient is the blank. */
function divides(
  degrees: number,
  sin: string,
  cos: string,
  tan: string,
  spoken: string,
  note: ReactNode,
): Reading {
  return {
    degrees,
    sin,
    cos,
    tan,
    spoken,
    why: (
      <>
        <InlineMath latex={`\\tan ${degrees}^{\\circ} = \\dfrac{${sin}}{${cos}}`} />, and{" "}
        {note} So the value is <InlineMath latex={tan} />.
      </>
    ),
  };
}

interface Board {
  /** The first row is the worked pattern; the rest are blank. */
  readings: readonly Reading[];
  options: readonly { id: string; latex: string; spoken: string }[];
  /** The two headings on this board where the ratio has no value, for the closing line. */
  breaks: string;
}

const BOARDS: readonly Board[] = [
  {
    readings: [
      divides(
        0,
        "0",
        "1",
        "0",
        "0 degrees, where the sine is zero and the cosine is one",
        <>
          a zero divided by anything other than zero is <InlineMath latex="0" />.
        </>,
      ),
      divides(
        45,
        "\\dfrac{\\sqrt{2}}{2}",
        "\\dfrac{\\sqrt{2}}{2}",
        "1",
        "45 degrees, where the sine and the cosine are both root two over two",
        <>the two readings are identical, so the quotient is one.</>,
      ),
      broken(90, "1", "one"),
      divides(
        135,
        "\\dfrac{\\sqrt{2}}{2}",
        "-\\dfrac{\\sqrt{2}}{2}",
        "-1",
        "135 degrees, where the sine is root two over two and the cosine is negative root two over two",
        <>the two readings are the same size with opposite signs.</>,
      ),
      broken(270, "-1", "negative one"),
    ],
    options: [
      { id: "a-0", latex: "0", spoken: "zero" },
      { id: "a-1", latex: "1", spoken: "one" },
      { id: "a-neg1", latex: "-1", spoken: "negative one" },
      { id: "a-root2", latex: "\\sqrt{2}", spoken: "root two" },
      { id: "a-undef", latex: UNDEFINED, spoken: "undefined" },
    ],
    breaks: "90^{\\circ} \\text{ and } 270^{\\circ}",
  },
  {
    readings: [
      divides(
        30,
        "\\dfrac{1}{2}",
        "\\dfrac{\\sqrt{3}}{2}",
        "\\dfrac{\\sqrt{3}}{3}",
        "30 degrees, where the sine is one half and the cosine is root three over two",
        <>
          halving cancels from both, leaving <InlineMath latex="\dfrac{1}{\sqrt{3}}" />,
          which is written with the root moved off the bottom.
        </>,
      ),
      divides(
        60,
        "\\dfrac{\\sqrt{3}}{2}",
        "\\dfrac{1}{2}",
        "\\sqrt{3}",
        "60 degrees, where the sine is root three over two and the cosine is one half",
        <>the halves cancel and the root is left on the top.</>,
      ),
      broken(90, "1", "one"),
      divides(
        180,
        "0",
        "-1",
        "0",
        "180 degrees, where the sine is zero and the cosine is negative one",
        <>
          the top is <InlineMath latex="0" /> and the bottom is not.
        </>,
      ),
      broken(270, "-1", "negative one"),
    ],
    options: [
      { id: "b-root3", latex: "\\sqrt{3}", spoken: "root three" },
      { id: "b-third", latex: "\\dfrac{\\sqrt{3}}{3}", spoken: "root three over three" },
      { id: "b-0", latex: "0", spoken: "zero" },
      { id: "b-neg1", latex: "-1", spoken: "negative one" },
      { id: "b-undef", latex: UNDEFINED, spoken: "undefined" },
    ],
    breaks: "90^{\\circ} \\text{ and } 270^{\\circ}",
  },
];

function toRow(reading: Reading, blank: boolean): TableRow {
  return {
    id: `heading-${reading.degrees}`,
    fixed: [`${reading.degrees}^{\\circ}`, reading.sin, reading.cos],
    value: reading.tan,
    blank,
    spoken: reading.spoken,
    why: reading.why,
  };
}

export function TrigAsymptoteTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["heading", "sine there", "cosine there", "tangent there"]}
      rows={board.readings.map((reading, index) => toRow(reading, index > 0))}
      options={board.options}
      objective="Goal: finish the tangent column, until the table shows which headings the ratio can be worked out at and which it cannot."
      prompt="Divide the sine on a row by the cosine beside it, and bring that value over."
      conclusion={
        <>
          Every row divides except the two whose cosine is <InlineMath latex="0" />, and
          those two are not hard rows: they are headings where tangent has no value at all.
          On this board they sit at <InlineMath latex={board.breaks} />, half a turn apart,
          which is where the graph runs away instead of crossing.
        </>
      }
      ariaLabel="Five headings, each with its sine and its cosine, and the tangent to be worked out from them"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different headings"
    />
  );
}
