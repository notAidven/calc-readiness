/**
 * Worked-solution figures for the D9 TRG.8 practice templates (solve a basic trigonometric
 * equation over one full revolution and hand back every heading that fits).
 *
 * Every entry is a FIGURE rather than a column of steps, and it is the same figure five times
 * because the five templates differ only in how much algebra runs before the picture. What a
 * learner gets wrong on this node is almost never the arithmetic: it is stopping at the first
 * heading, or placing the reference angle in the quadrant next door. A step card can assert
 * that there are two answers; a circle with the level line drawn across it SHOWS the line
 * cutting the circle twice, which is the entire content of `incomplete_solution_set`.
 *
 * So each figure draws three things together:
 *
 *  - the **level**, as a dashed line at the value the equation demands. For a sine that is a
 *    horizontal line, for a cosine a vertical one, and for a tangent a line through the center
 *    at that slope, which is why a tangent's two headings come out half a turn apart rather
 *    than reflected about an axis.
 *  - the **reference angle**, as a shaded acute wedge off the positive horizontal, so the size
 *    of the value and the placement of the headings are visibly two separate decisions.
 *  - every **heading in the roster**, each on its own ray with its measure printed outside the
 *    circle, so the count is read off the picture rather than taken on trust.
 *
 * Everything is recomputed from `template_params` by the same route `generate()` took, with a
 * default for every parameter. Nothing here is in radians: the plan's spike measured that a
 * roster cannot hold pi at the KEY, so a learner on this node is never shown a spelling the
 * answer field would refuse.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import type { WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* The shared vocabulary, recomputed rather than imported                      */
/* -------------------------------------------------------------------------- */

type Fn = "sin" | "cos" | "tan";

/** The numeric code `generate()` records the function under in `template_params`. */
const FN_BY_CODE: Record<number, Fn> = { 0: "sin", 1: "cos", 2: "tan" };

export const FN_TEX: Record<Fn, string> = { sin: "\\sin", cos: "\\cos", tan: "\\tan" };
export const FN_WORD: Record<Fn, string> = { sin: "sine", cos: "cosine", tan: "tangent" };

export function fnOf(code: number): Fn {
  return FN_BY_CODE[code] ?? "sin";
}

/** The exact unsigned value of `fn` at an acute special heading, as LaTeX. */
function exactTex(fn: Fn, ref: number): string {
  if (fn === "sin") {
    return ref === 30
      ? "\\dfrac{1}{2}"
      : ref === 45
        ? "\\dfrac{\\sqrt{2}}{2}"
        : "\\dfrac{\\sqrt{3}}{2}";
  }
  if (fn === "cos") {
    return ref === 30
      ? "\\dfrac{\\sqrt{3}}{2}"
      : ref === 45
        ? "\\dfrac{\\sqrt{2}}{2}"
        : "\\dfrac{1}{2}";
  }
  return ref === 30 ? "\\dfrac{\\sqrt{3}}{3}" : ref === 45 ? "1" : "\\sqrt{3}";
}

export function signedTex(fn: Fn, ref: number, negative: boolean): string {
  return negative ? `-${exactTex(fn, ref)}` : exactTex(fn, ref);
}

/** The two quadrants the function carries the drawn sign in, in words. */
export function quadrantWords(fn: Fn, negative: boolean): string {
  if (fn === "sin") {
    return negative ? "third and fourth" : "first and second";
  }
  if (fn === "cos") {
    return negative ? "second and third" : "first and fourth";
  }
  return negative ? "second and fourth" : "first and third";
}

/** The two headings in the window, ascending, by the same route `generate()` takes. */
export function placements(fn: Fn, ref: number, negative: boolean): number[] {
  if (fn === "sin") {
    return negative ? [180 + ref, 360 - ref] : [ref, 180 - ref];
  }
  if (fn === "cos") {
    return negative ? [180 - ref, 180 + ref] : [ref, 360 - ref];
  }
  return negative ? [180 - ref, 360 - ref] : [ref, 180 + ref];
}

/** The roster typeset for a caption or a label. */
export function rosterTex(headings: readonly number[]): string {
  return `\\{${[...headings]
    .sort((a, b) => a - b)
    .map((h) => `${h}^{\\circ}`)
    .join(",\\; ")}\\}`;
}

/** The roster read aloud, for an aria-label. */
export function rosterSpoken(headings: readonly number[]): string {
  return [...headings]
    .sort((a, b) => a - b)
    .map((h) => `${h} degrees`)
    .join(" and ");
}

/* -------------------------------------------------------------------------- */
/* The circle                                                                  */
/* -------------------------------------------------------------------------- */

const CX = 220;
const CY = 172;
const R = 82;
/** How far past the rim the axes and the level lines run. */
const REACH = R + 22;
/** Where a heading's measure is printed, measured from the center. */
const LABEL_R = R + 28;
/**
 * How far a TANGENT's level runs, which is further than the other two.
 *
 * A tangent's level is collinear with both of its rays, so the only part of it that can be
 * seen at all is whatever sticks out past the rim. At `REACH` that stub was 22 units long and
 * the heading's own label plate, centred at `LABEL_R`, painted straight over it: the line the
 * caption calls "one line through the center" was invisible in every rendered frame. This
 * reaches well past the labels so the dashes emerge on both sides of them.
 */
const SLOPE_REACH = R + 54;
/**
 * Everything above the algebra strip fits inside this.
 *
 * The circle sits low enough in the band that a vertical level's value, printed above the top
 * of its line, clears the equation. It did not at first: a cosine board draws its level as a
 * vertical line and labels it at the top, and with the circle 22 units higher the fraction
 * landed on top of the equation it was supposed to be explaining.
 */
const CIRCLE_BAND = 306;
const ROW_PITCH = 34;

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function on(deg: number, radius = R): { x: number; y: number } {
  return { x: CX + radius * Math.cos(rad(deg)), y: CY - radius * Math.sin(rad(deg)) };
}

/** What the equation demands, drawn across the circle. */
interface Level {
  /** `horizontal` for a sine, `vertical` for a cosine, `slope` for a tangent. */
  kind: "horizontal" | "vertical" | "slope";
  /** The height, the offset across, or the slope. */
  value: number;
  /**
   * The value typeset, printed at the end of the line, or absent to draw the line unlabelled.
   *
   * A tangent's level passes THROUGH both of its headings, so a label at either end of it
   * lands on top of a heading's measure. The equation above the circle already states the
   * value, so the line is left to say the one thing the equation cannot: that both answers are
   * two ends of a single line, half a turn apart.
   */
  tex?: string;
  /**
   * Label the other end: below a vertical line, left of a horizontal one.
   *
   * The quadratic shape draws two parallel levels at once, and two labels at the same end of
   * two parallel lines are two labels in the same place.
   */
  flip?: boolean;
}

export function levelFor(fn: Fn, ref: number, negative: boolean): Level {
  const size =
    fn === "tan"
      ? Math.tan(rad(ref))
      : fn === "sin"
        ? Math.sin(rad(ref))
        : Math.cos(rad(ref));
  const value = negative ? -size : size;
  if (fn === "tan") {
    return { kind: "slope", value };
  }
  return {
    kind: fn === "sin" ? "horizontal" : "vertical",
    value,
    tex: signedTex(fn, ref, negative),
  };
}

/**
 * The level's value as a one-line label.
 *
 * A `\dfrac` is roughly twice the height of a bare number, and a vertical level's label sits
 * in the narrow band between the equation above it and the nearest heading's measure below.
 * The inline fraction fits that band; the display one rendered legibly and left about five
 * pixels of daylight, which is a collision waiting for the next value that is one glyph wider.
 */
function levelLabelTex(tex: string): string {
  return tex.replace(/\\dfrac/g, "\\tfrac");
}

function LevelLine({ level }: { level: Level }): JSX.Element {
  if (level.kind === "horizontal") {
    const y = CY - level.value * R;
    return (
      <g>
        <line
          x1={CX - REACH}
          y1={y}
          x2={CX + REACH}
          y2={y}
          stroke={SIGNAL_DEEP}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        {level.tex !== undefined && (
          <SvgMath
            latex={levelLabelTex(level.tex)}
            x={level.flip ? CX - REACH - 6 : CX + REACH + 6}
            y={y}
            anchor={level.flip ? "end" : "start"}
            fontSize={13}
            color={SIGNAL_DEEP}
            plate
            w={100}
          />
        )}
      </g>
    );
  }
  if (level.kind === "vertical") {
    const x = CX + level.value * R;
    return (
      <g>
        <line
          x1={x}
          y1={CY - REACH}
          x2={x}
          y2={CY + REACH}
          stroke={SIGNAL_DEEP}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        {level.tex !== undefined && (
          <SvgMath
            latex={levelLabelTex(level.tex)}
            x={x}
            y={level.flip ? CY + REACH + 16 : CY - REACH - 16}
            fontSize={13}
            color={SIGNAL_DEEP}
            plate
            w={92}
          />
        )}
      </g>
    );
  }
  const dx = SLOPE_REACH / Math.hypot(1, level.value);
  const dy = dx * level.value;
  return (
    <line
      x1={CX - dx}
      y1={CY + dy}
      x2={CX + dx}
      y2={CY - dy}
      stroke={SIGNAL_DEEP}
      strokeWidth={1.5}
      strokeDasharray="6 4"
    />
  );
}

/** The shaded acute wedge off the positive horizontal, with its measure inside. */
function ReferenceWedge({ measure }: { measure: number }): JSX.Element {
  const arm = 42;
  const tip = on(measure, arm);
  const label = on(measure / 2, arm + 20);
  return (
    <g>
      <path
        d={`M ${CX} ${CY} L ${CX + arm} ${CY} A ${arm} ${arm} 0 0 0 ${tip.x} ${tip.y} Z`}
        fill={SOFT}
        fillOpacity={0.16}
        stroke={SOFT}
        strokeWidth={1.2}
      />
      <SvgMath
        latex={`${measure}^{\\circ}`}
        x={label.x}
        y={label.y}
        fontSize={12}
        color={SOFT}
        plate
        w={54}
      />
    </g>
  );
}

/**
 * The whole figure: circle, one or two levels, the reference wedge, a ray per heading, an
 * optional strip of algebra rows underneath, and the roster last.
 *
 * `closingTex` is for a question the roster does not finish. Every pooled shape here is graded
 * on the roster itself, so it closes there; TRG.8's CHECK asks which of the two headings is
 * the LARGER, and a figure ending on `\{210^{\circ},\; 330^{\circ}\}` has printed the answer
 * and both of the wrong ways to read it. Supplied, the roster steps back to the working ink
 * and the closing line carries the accent instead.
 */
export function RosterCircleWorked({
  equationTex,
  levels,
  reference,
  headings,
  rows,
  closingTex,
  ariaLabel,
  title,
}: {
  /** The equation as the item states it, printed above the circle. */
  equationTex: string;
  levels: readonly Level[];
  /** The acute reference angle the wedge shows. */
  reference: number;
  headings: readonly number[];
  /** The algebra that ran before the circle. Empty for the three direct shapes. */
  rows: readonly string[];
  /** One line under the roster, naming which of its headings the question wanted. */
  closingTex?: string;
  ariaLabel: string;
  title: string;
}): JSX.Element {
  const height =
    CIRCLE_BAND +
    rows.length * ROW_PITCH +
    ROW_PITCH +
    (closingTex === undefined ? 0 : ROW_PITCH);

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath latex={equationTex} x={CX} y={18} fontSize={17} color={LABEL} />

      <circle cx={CX} cy={CY} r={R} fill="none" stroke={LINE} strokeWidth={1.5} />
      <line x1={CX - REACH} y1={CY} x2={CX + REACH} y2={CY} stroke={LINE} strokeWidth={1} />
      <line x1={CX} y1={CY - REACH} x2={CX} y2={CY + REACH} stroke={LINE} strokeWidth={1} />

      {levels.map((level) => (
        <LevelLine key={`${level.kind}:${level.value}`} level={level} />
      ))}

      <ReferenceWedge measure={reference} />

      {headings.map((deg) => {
        const tip = on(deg);
        const label = on(deg, LABEL_R);
        return (
          <g key={deg}>
            <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={CIVIC} strokeWidth={2.2} />
            <circle cx={tip.x} cy={tip.y} r={5} fill={CIVIC} />
            <SvgMath
              latex={`${deg}^{\\circ}`}
              x={label.x}
              y={label.y}
              fontSize={13}
              color={CIVIC}
              plate
              w={64}
            />
          </g>
        );
      })}

      {rows.map((row, index) => (
        <SvgMath
          key={row}
          latex={row}
          x={CX}
          y={CIRCLE_BAND + 17 + index * ROW_PITCH}
          fontSize={15}
          color={LABEL}
          w={420}
        />
      ))}

      <SvgMath
        latex={`x \\in ${rosterTex(headings)}`}
        x={CX}
        y={closingTex === undefined ? height - 18 : height - 18 - ROW_PITCH}
        fontSize={16}
        color={closingTex === undefined ? CIVIC : LABEL}
        w={420}
      />

      {closingTex !== undefined && (
        <SvgMath
          latex={closingTex}
          x={CX}
          y={height - 18}
          fontSize={16}
          color={CIVIC}
          w={420}
        />
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The five entries                                                            */
/* -------------------------------------------------------------------------- */

/** The three direct shapes differ only in the function and the sign. */
function directVisual(fallback: {
  fn: number;
  ref: number;
  neg: number;
}): WorkedSolutionVisual {
  return {
    Svg: ({ fn = fallback.fn, ref = fallback.ref, neg = fallback.neg }) => {
      const f = fnOf(fn);
      const negative = neg === 1;
      const headings = placements(f, ref, negative);
      return (
        <RosterCircleWorked
          equationTex={`${FN_TEX[f]} x = ${signedTex(f, ref, negative)}`}
          levels={[levelFor(f, ref, negative)]}
          reference={ref}
          headings={headings}
          rows={[]}
          ariaLabel={`A circle with the ${FN_WORD[f]} level drawn across it. It meets the circle at ${rosterSpoken(headings)}, both built from a reference angle of ${ref} degrees.`}
          title={`Solving a ${FN_WORD[f]} equation over one revolution`}
        />
      );
    },
    caption: ({ fn = fallback.fn, ref = fallback.ref, neg = fallback.neg }) => {
      const f = fnOf(fn);
      const negative = neg === 1;
      const headings = placements(f, ref, negative);
      const tail =
        f === "tan"
          ? " The dashed line runs through the center, so the two headings are opposite ends of it, half a turn apart."
          : " The dashed level cuts the circle twice inside the window, which is why the answer is a roster and not one heading of it.";
      return `The size of the value fixes the reference angle at $${ref}^{\\circ}$, and its ${negative ? "minus sign" : "positive sign"} puts that angle in the ${quadrantWords(f, negative)} quadrants, giving $${rosterTex(headings)}$.${tail}`;
    },
  };
}

/**
 * A window shape's figure: the same circle, with the window step named under the roster.
 *
 * The circle draws the TERMINAL RAYS, and the whole content of both window shapes is that the
 * rays do not move when the window changes — only their names do. So the figure is deliberately
 * the same picture as {@link directVisual}'s, and `closingTex` carries the difference: the
 * two-revolution shape names four headings over two rays, and the signed shape names the same two
 * rays the way a window starting below zero names them.
 *
 * Drawing four rays for the two-turn shape was tried and rejected: a heading and that heading
 * plus a full turn share one terminal ray exactly, so the second pair would land on top of the
 * first and the figure would be claiming two rays where the mathematics has two.
 */
function windowVisual(
  fallback: { fn: number; ref: number; neg: number },
  rename: (base: readonly number[]) => number[],
  windowTex: string,
  explain: (negative: boolean, f: Fn) => string,
): WorkedSolutionVisual {
  const read = (params: { fn?: number; ref?: number; neg?: number }) => {
    const fn = params.fn ?? fallback.fn;
    const ref = params.ref ?? fallback.ref;
    const negative = (params.neg ?? fallback.neg) === 1;
    const f = fnOf(fn);
    const base = placements(f, ref, negative);
    return { f, ref, negative, base, named: rename(base) };
  };
  return {
    Svg: (params) => {
      const { f, ref, negative, base, named } = read(params);
      return (
        <RosterCircleWorked
          equationTex={`${FN_TEX[f]} x = ${signedTex(f, ref, negative)}`}
          levels={[levelFor(f, ref, negative)]}
          reference={ref}
          headings={base}
          rows={[]}
          closingTex={`${windowTex}\\;\\Rightarrow\\; ${rosterTex(named)}`}
          ariaLabel={`A circle with the ${FN_WORD[f]} level drawn across it, meeting it at ${rosterSpoken(base)}. Over the stated window those same directions are named ${rosterSpoken(named)}.`}
          title={`Solving a ${FN_WORD[f]} equation over a window other than one revolution`}
        />
      );
    },
    caption: (params) => {
      const { f, negative, named } = read(params);
      return `${explain(negative, f)} The rays the level meets do not move, so the roster over the stated window is $${rosterTex(named)}$: same directions, named the way that window names them.`;
    },
  };
}

export const TRG8_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg8.sine-basic.l1": directVisual({ fn: 0, ref: 30, neg: 0 }),
  "d9.trg8.cosine-negative.l2": directVisual({ fn: 1, ref: 60, neg: 1 }),
  "d9.trg8.tangent-basic.l2": directVisual({ fn: 2, ref: 45, neg: 0 }),

  "d9.trg8.two-turn-window.l2": windowVisual(
    { fn: 0, ref: 30, neg: 0 },
    (base) => [...base, ...base.map((value) => value + 360)],
    "0^{\\circ} \\le x < 720^{\\circ}",
    (_negative, f) =>
      f === "tan"
        ? "Tangent repeats every half turn, so its two headings are already opposite ends of one line and the window's second revolution continues the same spacing."
        : "Adding a full turn to a heading leaves it pointing the same way, so a window two revolutions wide admits each heading twice.",
  ),
  "d9.trg8.signed-window.l2": windowVisual(
    { fn: 0, ref: 30, neg: 1 },
    (base) => base.map((value) => (value < 180 ? value : value - 360)),
    "-180^{\\circ} \\le x < 180^{\\circ}",
    () =>
      "The window starts below zero, so a heading at or past a half turn is named by subtracting a full revolution from it.",
  ),

  "d9.trg8.linear-in-trig.l3": {
    Svg: ({ fn = 0, a = 2, bNum = -1, bRad = 1, ref = 30, neg = 0 }) => {
      const f = fnOf(fn);
      const negative = neg === 1;
      const headings = placements(f, ref, negative);
      return (
        <RosterCircleWorked
          equationTex={`${a}${FN_TEX[f]} x ${constantTex(bNum, bRad)} = 0`}
          levels={[levelFor(f, ref, negative)]}
          reference={ref}
          headings={headings}
          rows={[
            `${a}${FN_TEX[f]} x = ${movedConstantTex(bNum, bRad)}`,
            `${FN_TEX[f]} x = ${signedTex(f, ref, negative)}`,
          ]}
          ariaLabel={`The equation is rearranged until the ${FN_WORD[f]} stands alone, and the level it then demands meets the circle at ${rosterSpoken(headings)}.`}
          title={`Isolating the ${FN_WORD[f]}, then reading the roster off the circle`}
        />
      );
    },
    caption: ({ fn = 0, a = 2, ref = 30, neg = 0 }) => {
      const f = fnOf(fn);
      const negative = neg === 1;
      const headings = placements(f, ref, negative);
      return `The two rows underneath are the whole of the algebra: the constant crosses over, then both sides are divided by $${a}$. Only once $${FN_TEX[f]} x$ stands alone is there a level to draw, and that level meets the circle at $${rosterTex(headings)}$. Reaching for the circle while the coefficient is still attached reads the wrong value off it.`;
    },
  },

  "d9.trg8.quadratic-in-form.l3": {
    Svg: ({ fn = 0, p = 1, q = 1 }) => {
      const f = fnOf(fn);
      const halfRef = f === "sin" ? 30 : 60;
      const pair = placements(f, halfRef, p < 0);
      const single = f === "sin" ? (q > 0 ? 90 : 270) : q > 0 ? 0 : 180;
      const headings = [...pair, single];
      const extreme: Level = {
        kind: f === "sin" ? "horizontal" : "vertical",
        value: q > 0 ? 1 : -1,
        tex: q > 0 ? "1" : "-1",
        flip: true,
      };
      return (
        <RosterCircleWorked
          equationTex={quadraticTex(f, p, q)}
          levels={[levelFor(f, halfRef, p < 0), extreme]}
          reference={halfRef}
          headings={headings}
          rows={[factoredTex(f, p, q)]}
          ariaLabel={`Two levels are drawn across the circle. The half level meets it twice and the level at ${q > 0 ? "1" : "negative 1"} touches it once, giving ${rosterSpoken(headings)}.`}
          title="Two levels out of one factored equation"
        />
      );
    },
    caption: ({ fn = 0, p = 1, q = 1 }) => {
      const f = fnOf(fn);
      const halfRef = f === "sin" ? 30 : 60;
      const pair = placements(f, halfRef, p < 0);
      const single = f === "sin" ? (q > 0 ? 90 : 270) : q > 0 ? 0 : 180;
      const headings = [...pair, single];
      return `Reading $${FN_TEX[f]} x$ as one unknown factors the equation, and each factor sets its own level. The level at $${p < 0 ? "-\\tfrac{1}{2}" : "\\tfrac{1}{2}"}$ cuts the circle twice; the level at $${q < 0 ? "-1" : "1"}$ only touches it, at $${single}^{\\circ}$, because that is the largest size the ${FN_WORD[f]} ever reaches. Three headings in all: $${rosterTex(headings)}$.`;
    },
  },
};

/* -------------------------------------------------------------------------- */
/* The two algebra shapes' own typesetting                                     */
/* -------------------------------------------------------------------------- */

/** The constant as it stands in the equation, e.g. `+ \sqrt{2}`. */
function constantTex(bNum: number, bRad: number): string {
  const size = Math.abs(bNum);
  const body =
    bRad === 1 ? `${size}` : size === 1 ? `\\sqrt{${bRad}}` : `${size}\\sqrt{${bRad}}`;
  return `${bNum < 0 ? "-" : "+"} ${body}`;
}

/** The same constant after it crosses the equals sign, so its sign flips. */
function movedConstantTex(bNum: number, bRad: number): string {
  const size = Math.abs(bNum);
  const body =
    bRad === 1 ? `${size}` : size === 1 ? `\\sqrt{${bRad}}` : `${size}\\sqrt{${bRad}}`;
  return `${bNum < 0 ? "" : "-"}${body}`;
}

/** `2u^2 - (2q + p)u + pq`, with a coefficient of one left unwritten. */
function quadraticTex(f: Fn, p: number, q: number): string {
  const tex = FN_TEX[f];
  const linear = -(2 * q + p);
  const size = Math.abs(linear) === 1 ? "" : `${Math.abs(linear)}`;
  return `2${tex}^{2} x ${linear < 0 ? "-" : "+"} ${size}${tex} x ${p * q < 0 ? "-" : "+"} ${Math.abs(p * q)} = 0`;
}

function factoredTex(f: Fn, p: number, q: number): string {
  const tex = FN_TEX[f];
  return `(2${tex} x ${p < 0 ? "+" : "-"} 1)(${tex} x ${q < 0 ? "+" : "-"} 1) = 0`;
}
