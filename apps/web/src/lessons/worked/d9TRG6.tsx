/**
 * Worked-solution figures for the D9 TRG.6 practice templates: where the graph has nothing,
 * how far apart those places sit, and what the reading underneath a reciprocal was.
 *
 * Two pictures cover the five items, because the node asks two kinds of question.
 *
 * An ASYMPTOTE is a fact about spacing, so the three items that ask for one are drawn on a
 * line: the breaks marked where they fall, the branches sketched between them running away at
 * both ends, and the gap the answer names bracketed across the top. A column of arithmetic
 * cannot show a learner that the first break of a tangent sits HALF a period in, which is the
 * single mistake `asymptote-radian.l3` exists to catch, and the bracket on that figure is
 * drawn against the period beside it for exactly that reason.
 *
 * A RECIPROCAL is a fact about one reading, so the two items that ask about one are drawn on
 * the circle: the terminal ray at the heading, the reference angle it folds back to, and the
 * coordinate the function is built on marked on the axis it lives on. A learner who missed
 * one of those has almost always taken the reading from the wrong axis or given it the wrong
 * sign, and both of those are visible in the picture and in neither of the numbers.
 *
 * Everything is driven by the owning template's `template_params`, with a default for every
 * key, and each figure recomputes what `generate()` computed by the same route rather than
 * reading a stored answer back.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { gcd, type WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Formatters                                                                  */
/* -------------------------------------------------------------------------- */

/** A signed multiple of pi as LaTeX, reduced, with a denominator of one left off. */
export function piTex(num: number, den: number): string {
  const factor = gcd(num, den);
  const n = num / factor;
  const d = den / factor;
  const sign = n < 0 ? "-" : "";
  const size = Math.abs(n);
  const head = size === 1 ? "\\pi" : `${size}\\pi`;
  return d === 1 ? `${sign}${head}` : `${sign}\\dfrac{${head}}{${d}}`;
}

/** The same multiple of pi read aloud, for an accessible name. */
export function piSpoken(num: number, den: number): string {
  const factor = gcd(num, den);
  const n = num / factor;
  const d = den / factor;
  const head = Math.abs(n) === 1 ? "pi" : `${Math.abs(n)} pi`;
  const body = d === 1 ? head : `${head} over ${d}`;
  return n < 0 ? `negative ${body}` : body;
}

/** A root over an integer, as LaTeX, with the parts that are one left unprinted. */
function radicalTex(
  negative: boolean,
  coeff: number,
  radicand: number,
  den: number,
): string {
  const root = `\\sqrt{${radicand}}`;
  const top = coeff === 1 ? root : `${coeff}${root}`;
  const body = den === 1 ? top : `\\dfrac{${top}}{${den}}`;
  return negative ? `-${body}` : body;
}

/** The same value read aloud. */
function radicalSpoken(
  negative: boolean,
  coeff: number,
  radicand: number,
  den: number,
): string {
  const top = coeff === 1 ? `root ${radicand}` : `${coeff} root ${radicand}`;
  const body = den === 1 ? top : `${top} over ${den}`;
  return negative ? `negative ${body}` : body;
}

/* -------------------------------------------------------------------------- */
/* The line: breaks, branches, and the gap between two of them                 */
/* -------------------------------------------------------------------------- */

interface Mark {
  /** Where the break sits along the drawn line, as a fraction of its length. */
  at: number;
  /** What the break is called, as LaTeX. */
  label: string;
  /** True on the one break the item's answer names. */
  answer?: boolean;
}

/** How far below the line the break dashes and the branch curves reach. */
const BELOW_AXIS = 42;
/** The clear space a label keeps from anything it is not part of. */
const LABEL_CLEAR = 8;
/** The size a break's own name is drawn at. */
const TICK_SIZE = 13;
/**
 * Half the ink height of one break label, as a share of the size it is drawn at.
 *
 * An allowance rather than a measurement, for the reason `d9TRG1.tsx` gives at length: the
 * layout is chosen before KaTeX has laid anything out. Sized for the tall case, a `\dfrac`,
 * which every radian break carries.
 */
const TICK_HALF = TICK_SIZE * 0.95;
/** Blank frame left under the break labels. */
const TICK_FOOT = 12;

/**
 * A horizontal line with the breaks marked on it and the branches running away between them.
 *
 * The branch curves are SUGGESTIVE rather than plotted: a tangent's real shape between two
 * asymptotes is not the point of any of these three items, and a plotted one would need a
 * vertical scale the figure has no room to label. What the curves carry is the only thing the
 * items ask about, which is that the graph leaves at each break and comes back after it.
 *
 * A break's NAME is written under the dash that marks it, and the two are on the same x, so
 * the only thing keeping them apart is how far down the label starts. At a hardcoded
 * `axisY + 48` it started above where the dash stopped, and every figure here painted its
 * dashes through its own tick labels. So the label's y is derived from what it has to clear,
 * and the frame is derived from the label: the viewBox is 15 units taller than the 240 it used
 * to be because that is what the content came to, which is the trade the alternative could not
 * make.
 */
export function BreakLine({
  marks,
  span,
  rows,
  ariaLabel,
  title,
}: {
  marks: readonly Mark[];
  /** The gap the answer measures: two mark indices and what to call the distance. */
  span?: { from: number; to: number; label: string };
  /** Math to stand under the line, one entry per row. */
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const left = 44;
  const right = 416;
  const axisY = 168;
  const px = (at: number) => left + at * (right - left);
  const tickY = axisY + BELOW_AXIS + LABEL_CLEAR + TICK_HALF;
  const height = Math.round(tickY + TICK_HALF + TICK_FOOT);

  const from = span === undefined ? null : marks[span.from];
  const to = span === undefined ? null : marks[span.to];

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      {/* A branch between each neighbouring pair of breaks, leaving at both ends. */}
      {marks.slice(0, -1).map((mark, index) => {
        const next = marks[index + 1] as Mark;
        const x0 = px(mark.at);
        const x1 = px(next.at);
        const mid = (x0 + x1) / 2;
        return (
          <path
            key={`branch-${mark.label}`}
            d={`M ${x0 + 5} ${axisY + 26} C ${mid - 10} ${axisY + 4}, ${mid + 10} ${axisY - 4}, ${x1 - 5} ${axisY - 26}`}
            fill="none"
            stroke={SIGNAL}
            strokeWidth={2}
          />
        );
      })}

      <line x1={36} y1={axisY} x2={424} y2={axisY} stroke={LINE} strokeWidth={1.6} />

      {marks.map((mark) => (
        <g key={`mark-${mark.label}`}>
          <line
            x1={px(mark.at)}
            y1={axisY - 48}
            x2={px(mark.at)}
            y2={axisY + BELOW_AXIS}
            stroke={mark.answer === true ? CIVIC : BRICK}
            strokeWidth={mark.answer === true ? 2.2 : 1.4}
            strokeDasharray="5 4"
          />
          <SvgMath
            latex={mark.label}
            x={px(mark.at)}
            y={tickY}
            fontSize={TICK_SIZE}
            color={mark.answer === true ? CIVIC : LABEL}
            w={110}
          />
        </g>
      ))}

      {from !== undefined && from !== null && to !== undefined && to !== null && (
        <g>
          <line
            x1={px(from.at)}
            y1={axisY - 56}
            x2={px(to.at)}
            y2={axisY - 56}
            stroke={CIVIC}
            strokeWidth={1.8}
          />
          <SvgMath
            latex={span?.label ?? ""}
            x={(px(from.at) + px(to.at)) / 2}
            y={axisY - 76}
            fontSize={14}
            color={CIVIC}
            w={140}
          />
        </g>
      )}

      {/* The algebra sits above everything, on rows far enough apart that a stacked fraction
          in one of them clears the row below without overlapping the bracket beneath. */}
      {rows.map((row, index) => (
        <SvgMath
          key={row}
          latex={row}
          x={230}
          y={20 + index * 30}
          fontSize={15}
          color={LABEL}
          w={420}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The circle: a heading, its reference angle, and the reading underneath      */
/* -------------------------------------------------------------------------- */

/**
 * The unit circle with one terminal ray on it, and a column of math beside it.
 *
 * `axis` says which coordinate the item's function is built on, so the figure marks the
 * horizontal one for a secant and the vertical one for a cosecant instead of marking both and
 * leaving the learner to pick. Cotangent is built on both, and marks both.
 */
function CircleWorked({
  degrees,
  reference,
  axis,
  rows,
  ariaLabel,
  title,
}: {
  degrees: number;
  /** The reference angle, drawn as an arc back to the nearest half of the horizontal axis. */
  reference: number;
  axis: "horizontal" | "vertical" | "both";
  rows: readonly string[];
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const center = { x: 118, y: 118 };
  const r = 66;
  const radians = (degrees * Math.PI) / 180;
  const point = {
    x: center.x + r * Math.cos(radians),
    y: center.y - r * Math.sin(radians),
  };
  const marksHorizontal = axis === "horizontal" || axis === "both";
  const marksVertical = axis === "vertical" || axis === "both";

  return (
    <svg viewBox="0 0 440 240" role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <line
        x1={center.x - r - 18}
        y1={center.y}
        x2={center.x + r + 18}
        y2={center.y}
        stroke={LINE}
        strokeWidth={1.4}
      />
      <line
        x1={center.x}
        y1={center.y - r - 18}
        x2={center.x}
        y2={center.y + r + 18}
        stroke={LINE}
        strokeWidth={1.4}
      />
      <circle
        cx={center.x}
        cy={center.y}
        r={r}
        fill="none"
        stroke={SOFT}
        strokeWidth={1.4}
      />

      {/* The terminal ray, and the coordinate the function is built on. */}
      <line
        x1={center.x}
        y1={center.y}
        x2={point.x}
        y2={point.y}
        stroke={LABEL}
        strokeWidth={2.2}
      />
      {marksHorizontal && (
        <line
          x1={center.x}
          y1={center.y}
          x2={point.x}
          y2={center.y}
          stroke={CIVIC}
          strokeWidth={3}
        />
      )}
      {marksVertical && (
        <line
          x1={point.x}
          y1={center.y}
          x2={point.x}
          y2={point.y}
          stroke={CIVIC}
          strokeWidth={3}
        />
      )}
      <line
        x1={point.x}
        y1={point.y}
        x2={point.x}
        y2={center.y}
        stroke={SOFT}
        strokeWidth={1.2}
        strokeDasharray="4 3"
      />
      <circle cx={point.x} cy={point.y} r={4.5} fill={LABEL} stroke="none" />

      {/* Both angle labels clear the axis tips at `r + 18`, so neither is drawn on top of an
          axis, and both stay inside the frame: a label centered past the viewBox is clipped by
          the figure rather than by anything a caption could explain. */}
      <SvgMath
        latex={`${degrees}^{\\circ}`}
        x={center.x}
        y={center.y + r + 32}
        fontSize={13}
        color={LABEL}
        w={110}
      />
      {/* Only where there is one to fold back to: a ray lying along an axis has no
          reference angle, and printing "reference 0 degrees" would invent one. */}
      {reference > 0 && (
        <SvgMath
          latex={`\\text{reference } ${reference}^{\\circ}`}
          x={center.x}
          y={center.y - r - 32}
          fontSize={13}
          color={SOFT}
          w={190}
        />
      )}

      {rows.map((row, index) => (
        <SvgMath
          key={row}
          latex={row}
          x={320}
          y={72 + index * 40}
          fontSize={16}
          color={index === rows.length - 1 ? CIVIC : LABEL}
          w={220}
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

/** The four functions, in the order `asymptote-degree.l2` indexes them. */
const FUNCTION_NAMES = ["tan", "cot", "sec", "csc"] as const;

/** The reading underneath each, which is the reading whose zeros are the breaks. */
const BOTTOM_WORD = ["cosine", "sine", "cosine", "sine"] as const;

/** Every heading in $[0, 360)$ where `fn(bx)` breaks, by the same route `generate()` took. */
function breakHeadings(fnIndex: number, b: number): number[] {
  const first = fnIndex === 0 || fnIndex === 2 ? 90 : 0;
  const out: number[] = [];
  for (let k = 0; first + 180 * k < 360 * b; k += 1) {
    out.push((first + 180 * k) / b);
  }
  return out;
}

/** The three functions, in the order `reciprocal-exact.l3` indexes them. */
const EXACT_NAMES = ["sec", "csc", "cot"] as const;
const EXACT_WORDS = ["secant", "cosecant", "cotangent"] as const;
const EXACT_BOTTOM = ["cosine", "sine", "sine"] as const;

export const TRG6_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg6.tangent-period.l1": {
    // Three breaks, so the period is a gap BETWEEN two of them rather than a distance from
    // the origin. A figure showing one break and one arrow would be answering a different
    // question, and it is the question `asymptote-radian.l3` asks.
    Svg: ({ a = 2, b = 3 }) => (
      <BreakLine
        marks={[
          { at: 0.08, label: piTex(-1, 2 * b) },
          { at: 0.5, label: piTex(1, 2 * b) },
          { at: 0.92, label: piTex(3, 2 * b) },
        ]}
        span={{ from: 1, to: 2, label: piTex(1, b) }}
        rows={[`y = ${a === 1 ? "" : a}\\tan(${b === 1 ? "" : b}x)`]}
        ariaLabel={`A tangent graph with breaks a distance of ${piSpoken(1, b)} apart, which is its period`}
        title="One cycle of the tangent, measured from one break to the next"
      />
    ),
    caption: ({ a = 2, b = 3 }) =>
      `Every break of $y = ${a === 1 ? "" : a}\\tan(${b === 1 ? "" : b}x)$ is the same distance from the one before it, and that distance is one full cycle. The coefficient $${b}$ shares a half turn out rather than a whole one, because a tangent comes back to itself twice as often as a sine does, so the period is $${piTex(1, b)}$. The $${a}$ out in front stretches the branches and moves no break at all.`,
  },

  "d9.trg6.asymptote-degree.l2": {
    Svg: ({ fn = 0, b = 1 }) => {
      const headings = breakHeadings(fn, b);
      const name = FUNCTION_NAMES[fn] ?? "tan";
      return (
        <BreakLine
          marks={headings.map((heading) => ({
            at: 0.06 + (heading / 360) * 0.88,
            label: `${heading}^{\\circ}`,
            answer: true,
          }))}
          rows={[
            `y = \\${name}(${b === 1 ? "x" : `${b}x`})`,
            `\\${BOTTOM_WORD[fn] === "cosine" ? "cos" : "sin"}(${b === 1 ? "x" : `${b}x`}) = 0`,
          ]}
          ariaLabel={`A number line from 0 to 360 degrees with breaks marked at ${headings.join(", ")} degrees`}
          title="Every heading in one turn where the graph has no value"
        />
      );
    },
    caption: ({ fn = 0, b = 1 }) => {
      const headings = breakHeadings(fn, b);
      const name = FUNCTION_NAMES[fn] ?? "tan";
      const bottom = BOTTOM_WORD[fn] ?? "cosine";
      const inside = b === 1 ? "x" : `${b}x`;
      return `Written as a fraction, $\\${name}(${inside})$ has the ${bottom} of $${inside}$ underneath it, so it breaks wherever that reading is zero. ${
        b === 1
          ? `Inside one turn that happens twice, half a turn apart.`
          : `The argument runs through $${b}$ turns while $x$ runs through one, so dividing by $${b}$ brings $${headings.length}$ of them inside the window.`
      } The headings are $${headings.map((h) => `${h}^{\\circ}`).join("$, $")}$.`;
    },
  },

  "d9.trg6.secant-defined.l2": {
    Svg: ({ degrees = 90, broken = 1 }) => (
      <CircleWorked
        degrees={degrees}
        // A quadrantal heading has no reference angle to print. The fold to the horizontal
        // axis at $90^{\circ}$ and $270^{\circ}$ is a quarter turn, which lands ON the
        // vertical axis instead of acute against the horizontal one, and those two headings
        // are exactly this shape's BROKEN draws: the ones the figure exists for.
        reference={degrees % 90 === 0 ? 0 : Math.min(degrees % 180, 180 - (degrees % 180))}
        axis="horizontal"
        rows={
          broken === 1
            ? [`\\cos ${degrees}^{\\circ} = 0`, "\\dfrac{1}{0}", "\\text{undefined}"]
            : [
                `\\sec ${degrees}^{\\circ} = \\dfrac{1}{\\cos ${degrees}^{\\circ}}`,
                "\\text{defined}",
              ]
        }
        ariaLabel={`The unit circle with a ray at ${degrees} degrees, whose horizontal coordinate is ${broken === 1 ? "zero" : "not zero"}`}
        title="The heading, and the horizontal coordinate secant is built on"
      />
    ),
    caption: ({ degrees = 90, broken = 1 }) =>
      broken === 1
        ? `At $${degrees}^{\\circ}$ the ray points straight along the vertical axis, so its horizontal coordinate is exactly $0$. Secant is one over that coordinate, and nothing divides into $0$, so there is no value here and the graph runs away on both sides of this heading.`
        : `The green length is the horizontal coordinate at $${degrees}^{\\circ}$, which is the cosine. It is not zero, so turning it over gives an ordinary number: being negative or small does not stop a reading being inverted, and only a coordinate of exactly $0$ does.`,
  },

  "d9.trg6.reciprocal-exact.l3": {
    Svg: ({
      fn = 0,
      degrees = 150,
      reference = 30,
      negative = 1,
      coeff = 2,
      radicand = 3,
      den = 3,
    }) => {
      const name = EXACT_NAMES[fn] ?? "sec";
      return (
        <CircleWorked
          degrees={degrees}
          reference={reference}
          axis={fn === 0 ? "horizontal" : fn === 1 ? "vertical" : "both"}
          rows={[
            `\\${name} ${degrees}^{\\circ}`,
            `= ${radicalTex(negative === 1, coeff, radicand, den)}`,
          ]}
          ariaLabel={`The unit circle with a ray at ${degrees} degrees, folding back to a reference angle of ${reference} degrees, whose ${EXACT_WORDS[fn] ?? "secant"} is ${radicalSpoken(negative === 1, coeff, radicand, den)}`}
          title="The heading, its reference angle, and the coordinates the value is built from"
        />
      );
    },
    caption: ({
      fn = 0,
      degrees = 150,
      reference = 30,
      negative = 1,
      rationalized = 1,
      coeff = 2,
      radicand = 3,
      den = 3,
    }) => {
      const word = EXACT_WORDS[fn] ?? "secant";
      const bottom = EXACT_BOTTOM[fn] ?? "cosine";
      const value = radicalTex(negative === 1, coeff, radicand, den);
      return `Folding $${degrees}^{\\circ}$ back to its reference angle of $${reference}^{\\circ}$ gives the SIZE of every coordinate there, and the quadrant gives the sign, which is ${
        negative === 1 ? "negative" : "positive"
      } here. The ${word} is built on the ${bottom}${fn === 2 ? ", with the cosine over it" : ""}, and ${
        fn === 2 ? "dividing the one by the other" : "turning that reading over"
      } leaves ${
        rationalized === 1
          ? `a root underneath, so moving it up with a matching multiplication gives $${value}$`
          : `$${value}$ with nothing underneath to rationalize`
      }.`;
    },
  },

  "d9.trg6.asymptote-radian.l3": {
    // The bracket runs from the ORIGIN to the first break, and the period is drawn beside it
    // from that break to the next. Those two lengths side by side are the whole content of
    // the item: the answer is half of the period, and a learner who answered the period is
    // looking at the gap next door.
    Svg: ({ a = 2, b = 2 }) => (
      <BreakLine
        marks={[
          { at: 0.08, label: piTex(-1, 2 * b) },
          { at: 0.5, label: piTex(1, 2 * b), answer: true },
          { at: 0.92, label: piTex(3, 2 * b) },
        ]}
        span={{ from: 1, to: 2, label: `\\text{period } ${piTex(1, b)}` }}
        rows={[
          `y = ${a === 1 ? "" : a}\\tan(${b}x)`,
          `${b}x = \\dfrac{\\pi}{2} \\;\\Rightarrow\\; x = ${piTex(1, 2 * b)}`,
        ]}
        ariaLabel={`A tangent graph whose first positive break is at ${piSpoken(1, 2 * b)}, half of its period of ${piSpoken(1, b)}`}
        title="The first positive break, and the period it is half of"
      />
    ),
    caption: ({ a = 2, b = 2 }) =>
      `The break in green is the first one to the right of the origin, and it is where the argument $${b}x$ reaches a quarter turn: $${b}x = \\dfrac{\\pi}{2}$ puts $x$ at $${piTex(1, 2 * b)}$. The gap beside it is the period, $${piTex(1, b)}$, and the answer is half of that rather than equal to it, because a tangent's first break comes half a cycle in. The $${a}$ in front moves nothing here.`,
  },
};
