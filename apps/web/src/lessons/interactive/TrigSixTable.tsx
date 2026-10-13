/**
 * TRG.4 slide 0: all six functions at one heading, built from the two readings.
 *
 * The claim the slide makes is that six names carry only two independent numbers, and that
 * is a claim about a COLUMN rather than about any one function. So the sine and the cosine
 * are given as the pattern and the other four are blanks, with the recipe for each printed
 * in the middle column: the learner is not being asked to recall which function is which,
 * they are being asked to run four recipes off the same two values and watch the column
 * fill up out of them.
 *
 * The tray carries the two measured readings as distractors alongside the four answers,
 * because copying a reading straight down is the slip this table is built to catch, and the
 * four answers are each other's distractors already: `3/4` and `4/3` differ only in which
 * way up they are, which is the whole of what separates a tangent from a cotangent.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  /** The sine is `p/c` and the cosine is `q/c`, both positive: one heading in quadrant I. */
  p: number;
  q: number;
  c: number;
}

/**
 * Two headings, each from a right triangle with whole sides, so every one of the six values
 * is a clean fraction and the arithmetic never stands between the learner and the pattern.
 * Neither heading is the check's, and the two share no value with each other.
 */
const BOARDS: readonly Board[] = [
  { p: 3, q: 4, c: 5 },
  { p: 12, q: 5, c: 13 },
];

function frac(n: number, d: number): string {
  return `\\dfrac{${n}}{${d}}`;
}

function spokenFrac(n: number, d: number): string {
  return `${n} over ${d}`;
}

function board(
  p: number,
  q: number,
  c: number,
): {
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
} {
  const measured = "\\text{read off the meter}";
  const rows: readonly TableRow[] = [
    {
      id: `sin-${c}`,
      fixed: ["\\sin\\theta", measured],
      value: frac(p, c),
      blank: false,
      spoken: "sine",
    },
    {
      id: `cos-${c}`,
      fixed: ["\\cos\\theta", measured],
      value: frac(q, c),
      blank: false,
      spoken: "cosine",
    },
    {
      id: `tan-${c}`,
      fixed: ["\\tan\\theta", "\\dfrac{\\sin\\theta}{\\cos\\theta}"],
      value: frac(p, q),
      blank: true,
      spoken: "tangent",
      why: (
        <>
          Dividing the sine by the cosine puts the same denominator on the top and the
          bottom, so it cancels and only the two numerators are left:{" "}
          <InlineMath latex={`${frac(p, c)} \\div ${frac(q, c)} = ${frac(p, q)}`} />. The
          tangent is not measured separately; it is what the other two make.
        </>
      ),
    },
    {
      id: `csc-${c}`,
      fixed: ["\\csc\\theta", "\\dfrac{1}{\\sin\\theta}"],
      value: frac(c, p),
      blank: true,
      spoken: "cosecant",
      why: (
        <>
          Dividing <InlineMath latex="1" /> by a fraction turns it over, so the cosecant is
          the sine upside down: <InlineMath latex={`${frac(p, c)}`} /> becomes{" "}
          <InlineMath latex={`${frac(c, p)}`} />. The name begins with co- and it still
          belongs to the sine.
        </>
      ),
    },
    {
      id: `sec-${c}`,
      fixed: ["\\sec\\theta", "\\dfrac{1}{\\cos\\theta}"],
      value: frac(c, q),
      blank: true,
      spoken: "secant",
      why: (
        <>
          The secant is the cosine turned over, so <InlineMath latex={`${frac(q, c)}`} />{" "}
          becomes <InlineMath latex={`${frac(c, q)}`} />. Reaching for the sine here is the
          usual slip, because <InlineMath latex="\sec" /> and <InlineMath latex="\sin" />{" "}
          look alike written down. The pairing crosses over: the name carrying co- belongs
          to the sine, and this one, without it, belongs to the cosine.
        </>
      ),
    },
    {
      id: `cot-${c}`,
      fixed: ["\\cot\\theta", "\\dfrac{\\cos\\theta}{\\sin\\theta}"],
      value: frac(q, p),
      blank: true,
      spoken: "cotangent",
      why: (
        <>
          The cotangent divides the cosine by the sine, which is the tangent the other way
          up: <InlineMath latex={`${frac(q, c)} \\div ${frac(p, c)} = ${frac(q, p)}`} />.
          Two functions can be built from the same pair of readings and still be different,
          because the order of the division is part of the recipe.
        </>
      ),
    },
  ];

  const options = [
    { n: p, d: q },
    { n: c, d: p },
    { n: c, d: q },
    { n: q, d: p },
    // The two measured readings, because copying one straight down is the slip.
    { n: p, d: c },
    { n: q, d: c },
  ].map(({ n, d }) => ({
    id: `o-${n}-${d}`,
    latex: frac(n, d),
    spoken: spokenFrac(n, d),
  }));

  return { rows, options };
}

export function TrigSixTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { p, q, c } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { rows, options } = board(p, q, c);

  return (
    <FillTable
      key={variant.nonce}
      headings={["function", "built from the two readings", "value at this heading"]}
      rows={rows}
      options={options}
      objective={
        <>
          Goal: fill the value of the other four functions at this one heading, until the
          table shows all six coming out of the two readings at the top.
        </>
      }
      prompt="Run the recipe in the middle column on the two readings above, then bring its value over."
      conclusion={
        <>
          All six, from <InlineMath latex={frac(p, c)} /> and{" "}
          <InlineMath latex={frac(q, c)} /> and nothing else. Two of the six are the
          readings turned over, one is the readings divided, and one is that division
          reversed, so a heading only ever carries two independent numbers however many
          names are hung on them.
        </>
      }
      ariaLabel="A table of the six trigonometric functions at one heading, with the sine and cosine given and the other four to be filled in"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over at a different heading"
    />
  );
}
