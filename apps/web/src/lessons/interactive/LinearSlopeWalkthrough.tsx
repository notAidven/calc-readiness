/**
 * LF.1 interactive (slide 3): the two-point slope formula, filled in by the learner.
 *
 * The formula is scaffolded on screen from the start, all three rows of it, so the shape of
 * the computation is visible before any of it is done: substitute, simplify, reduce. The
 * blanks ARE the inputs — the learner types into the numerator and denominator of the
 * fraction itself, not into a row of boxes captioned with which slot they stand for. A row
 * only opens once the row above it is right.
 *
 * Typing the substitution rather than watching it is the point of this slide. The whole
 * lesson beat is that both differences have to subtract the same point, and a learner who
 * watches a correct substitution appear has not been asked the question. EITHER point may
 * be taken as `(x_2, y_2)`, because reversing both differences leaves the slope alone, so
 * the row fails only when the top and the bottom are read from opposite ends. The choice
 * pins on the first slot that lands, and the legend, the triangle and the two rows below
 * all follow it.
 *
 * The formula is HTML rather than part of the diagram, because KaTeX drawn into a
 * `foreignObject` cannot hold a focusable input. The plot above it stays SVG.
 *
 * The rise-and-run triangle is drawn once the substitution lands, starting from whichever
 * point the learner took as `(x_1, y_1)`, so the fraction on the page is always visibly the
 * triangle above it. Three point pairs rotate on "start over":
 * one falling, one where both differences subtract a negative, and one whose second point
 * sits to the left so the run itself comes out negative. None is used by the CFU or the
 * practice bank.
 *
 * Each of the three rows is typed, and a number field bounds nothing: the sign slips this
 * slide exists to teach are exactly the ones a learner can repeat forever, so every row
 * carries a reveal that teaches THAT row. While rows are still owed below it the board is
 * handed back rather than spent, so a reveal on the substitution does not throw away a
 * simplify the learner had already earned.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  interiorTicks,
  LABEL,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL,
  SOFT,
} from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 6;
/** Square, and most of the canvas: the formula it used to share the canvas with is HTML now. */
const LEFT = 70;
const RIGHT = 370;
const TOP = 12;
const BOTTOM = 312;
/** `±6` is the plot's border, and a number centered on the border is half outside it. */
const TICKS = interiorTicks([-6, -4, -2, 2, 4, 6], X_MIN, X_MAX);

/** Labels belong inside the plot, off its border by enough not to read as touching it. */
const LABEL_FRAME = plotLabelFrame(
  { left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM },
  8,
);

/** The size every label on the plot is drawn at, and so the size they are placed as. */
const LABEL_SIZE = 13;
const TICK_SIZE = 10;

/**
 * The axis tick numbers, as obstacles. They are drawn inside the plot, against the axes, so a
 * label placed anywhere near an axis is placed on top of one unless it knows they are there.
 * Modelled one box per tick rather than as two full bands, so a label can still slot into the
 * space BETWEEN two ticks, which is usually where it wants to be, and sized to the digits
 * themselves so the ticks do not reserve more of a crowded plot than they occupy.
 */
const TICK_BOXES: readonly LabelBox[] = [
  // The y ticks are drawn right-aligned against the axis, so their ink runs left from there.
  // Each `y` is the ink's middle, which sits about 4 above the baseline the `<text>` is
  // drawn at. Getting that wrong shows up as a label parked one line off a tick.
  ...TICKS.map((tick) => ({
    x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick) - 1,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...TICKS.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 10,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

interface Point {
  x: number;
  y: number;
}

interface Pair {
  first: Point;
  second: Point;
}

/**
 * Which point the learner took as `(x_2, y_2)`. Both readings give the same slope, so this
 * is the learner's to choose rather than the widget's to dictate.
 */
type Order = "as-dealt" | "reversed";

/**
 * Three pairs, each teaching a different reading of the same formula, and each reducing
 * non-trivially so the last row is always a real step.
 */
const PAIRS: readonly Pair[] = [
  // A falling line: the rise is negative, the run positive.
  { first: { x: -2, y: 5 }, second: { x: 4, y: -4 } },
  // Both differences subtract a negative, which is where the sign slips happen.
  { first: { x: -4, y: -3 }, second: { x: 2, y: 5 } },
  // The second point sits to the LEFT, so the run comes out negative.
  { first: { x: 5, y: 1 }, second: { x: -1, y: 5 } },
];

function pairAt(index: number): Pair {
  return PAIRS[index] ?? PAIRS[0] ?? { first: { x: 0, y: 0 }, second: { x: 1, y: 1 } };
}

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** A fraction reduced with the sign carried by the numerator. */
function reduceParts(n: number, d: number): { n: number; d: number } {
  const g = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: Math.abs(d) / g };
}

/** The reduced slope, with a negative sign hoisted out in front of the fraction. */
function reducedTex(n: number, d: number): string {
  const r = reduceParts(n, d);
  if (r.d === 1) {
    return `${r.n}`;
  }
  return r.n < 0 ? `-\\dfrac{${-r.n}}{${r.d}}` : `\\dfrac{${r.n}}{${r.d}}`;
}

/** The value being SUBTRACTED in a difference: a negative one keeps its parentheses. */
function sub(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

function pointTex(p: Point): string {
  return `(${p.x},\\, ${p.y})`;
}

function spoken(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}

function normalize(raw: string): string {
  return raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "")
    .replace(/^\+/, "");
}

/** A typed integer, or null when the entry is not one. */
function parseInteger(raw: string): number | null {
  const cleaned = normalize(raw);
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * A typed slope: a whole number, a decimal, or a fraction. `parts` is set only for a typed
 * fraction, which is what lets the last row tell "right value, still unreduced" apart from
 * a plain wrong answer.
 */
function parseSlope(
  raw: string,
): { value: number; parts?: { n: number; d: number } } | null {
  const cleaned = normalize(raw);
  const fraction = /^(-?\d+)\/(-?\d+)$/.exec(cleaned);
  if (fraction) {
    const n = Number(fraction[1]);
    const d = Number(fraction[2]);
    if (d === 0) {
      return null;
    }
    return { value: n / d, parts: { n, d } };
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? { value } : null;
}

/**
 * One blank in the formula, in the position the value it holds occupies in the math.
 *
 * Three states, and only the open one is an `<input>`: a row that has not opened yet shows
 * an empty dashed box with nothing to focus, so the learner tabs through the row being
 * asked and nothing else, and a slot that is already right shows its value typeset. The
 * box outline survives into that settled state on purpose, since it is what keeps a
 * negative readable in a difference — `-4` in a box, minus `-2` in a box.
 */
function Slot({
  state,
  value,
  settled,
  aria,
  color,
  onChange,
  onEnter,
}: {
  state: "locked" | "open" | "done";
  value: string;
  /** The LaTeX the slot shows once it is right. */
  settled: string;
  aria: string;
  color: string;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (state === "done") {
    return (
      <span className="lesson-equation__slot lesson-equation__slot--done" style={{ color }}>
        <InlineMath latex={settled} />
      </span>
    );
  }
  if (state === "locked") {
    return <span className="lesson-equation__slot lesson-equation__slot--locked" />;
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color }}
      type="text"
      inputMode="text"
      value={value}
      aria-label={aria}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
    />
  );
}

/** A fraction whose numerator and denominator are rows of slots and operators. */
function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="lesson-equation__frac">
      <span className="lesson-equation__part">{top}</span>
      <span className="lesson-equation__bar" />
      <span className="lesson-equation__part">{bottom}</span>
    </span>
  );
}

/** One stage of the formula: its name, the equation itself, and the button that grades it. */
function Stage({
  name,
  state,
  onCheck,
  children,
}: {
  name: string;
  state: "locked" | "open" | "done";
  onCheck: () => void;
  children: ReactNode;
}) {
  return (
    <div className="lesson-equation__row" data-state={state}>
      <span className="lesson-equation__stage">{name}</span>
      <span className="lesson-equation__body">
        <InlineMath latex="m =" />
        {children}
      </span>
      {state === "open" ? (
        <button type="button" className="lesson-interactive__check" onClick={onCheck}>
          Check
        </button>
      ) : null}
    </div>
  );
}

export function LinearSlopeWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(PAIRS.length, props);
  return (
    <LinearSlopeWalkthroughBody
      key={variant.nonce}
      pair={pairAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearSlopeWalkthroughBody({
  pair,
  onSolved,
  onRestart,
}: {
  pair: Pair;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { first, second } = pair;

  /** 0 substitute, 1 simplify, 2 reduce, 3 done. */
  const [row, setRow] = useState(0);
  /**
   * Null until the substitution pins it, and null reads as-dealt, so the widget opens on
   * the same legend and the same triangle it always did.
   */
  const [order, setOrder] = useState<Order | null>(null);
  const [subEntry, setSubEntry] = useState({ y2: "", y1: "", x2: "", x1: "" });
  const [subDone, setSubDone] = useState({ y2: false, y1: false, x2: false, x1: false });
  const [simpEntry, setSimpEntry] = useState({ rise: "", run: "" });
  const [simpDone, setSimpDone] = useState({ rise: false, run: false });
  const [reduceEntry, setReduceEntry] = useState("");
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [revealed, setRevealed] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = row >= 3;

  /** The two points in the roles the learner put them in: `from` is subtracted FROM `to`. */
  const from = order === "reversed" ? second : first;
  const to = order === "reversed" ? first : second;
  const rise = to.y - from.y;
  const run = to.x - from.x;
  const fromTex = pointTex(from);
  const toTex = pointTex(to);

  /** Where one stage of the formula stands: waiting its turn, being answered, or settled. */
  function stageState(stage: number): "locked" | "open" | "done" {
    if (row > stage) {
      return "done";
    }
    return row === stage ? "open" : "locked";
  }

  /** Which slots the typed row gets right under one reading of the formula. */
  function scoreAgainst(choice: Order) {
    const head = choice === "reversed" ? first : second;
    const tail = choice === "reversed" ? second : first;
    return {
      y2: parseInteger(subEntry.y2) === head.y,
      y1: parseInteger(subEntry.y1) === tail.y,
      x2: parseInteger(subEntry.x2) === head.x,
      x1: parseInteger(subEntry.x1) === tail.x,
    };
  }

  function checkSubstitution() {
    const dealt = scoreAgainst("as-dealt");
    const flipped = scoreAgainst("reversed");
    const hits = (marks: typeof dealt) => Object.values(marks).filter(Boolean).length;

    /*
     * The reading is the learner's to choose, and the first slot they get right is the
     * choice: whichever one more of the row agrees with, as-dealt breaking a tie. Pinning
     * it is what keeps the sticky per-slot credit below honest, because a row graded half
     * one way and half the other is exactly the mixed substitution this step exists to
     * catch. Nothing pins while nothing is right, so a learner who mistypes everything is
     * never locked out of the reading they meant.
     */
    let choice = order;
    if (choice === null && hits(dealt) + hits(flipped) > 0) {
      choice = hits(flipped) > hits(dealt) ? "reversed" : "as-dealt";
      setOrder(choice);
    }
    const right = choice === "reversed" ? flipped : dealt;

    const next = {
      y2: subDone.y2 || right.y2,
      y1: subDone.y1 || right.y1,
      x2: subDone.x2 || right.x2,
      x1: subDone.x1 || right.x1,
    };
    const landed =
      (next.y2 && !subDone.y2) ||
      (next.y1 && !subDone.y1) ||
      (next.x2 && !subDone.x2) ||
      (next.x1 && !subDone.x1);
    setSubDone(next);
    if (landed) {
      success();
    }
    if (next.y2 && next.y1 && next.x2 && next.x1) {
      setFeedback(null);
      setRow(1);
      return;
    }
    // The miss this step invites, and it deserves to be named: both differences are read
    // off the points correctly but from opposite ends, so only one of them changes sign.
    const mixed =
      (dealt.y2 && dealt.y1 && flipped.x2 && flipped.x1) ||
      (flipped.y2 && flipped.y1 && dealt.x2 && dealt.x1);
    if (mixed) {
      setFeedback(
        <>
          Right numbers, wrong order. The top difference starts at one point and the bottom
          starts at the other, which flips the sign of just one of them.{" "}
          <InlineMath latex="(x_2,\, y_2)" /> has to be the SAME point on both lines.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not yet. Either point can be <InlineMath latex="(x_2,\, y_2)" />: take{" "}
        <InlineMath latex={pointTex(second)} /> or <InlineMath latex={pointTex(first)} />,
        put both of its coordinates in the second slots, and the other point's in the first
        slots.
      </>,
    );
  }

  function checkSimplify() {
    const next = {
      rise: simpDone.rise || parseInteger(simpEntry.rise) === rise,
      run: simpDone.run || parseInteger(simpEntry.run) === run,
    };
    const landed = (next.rise && !simpDone.rise) || (next.run && !simpDone.run);
    setSimpDone(next);
    if (landed) {
      success();
    }
    if (next.rise && next.run) {
      setFeedback(null);
      setRow(2);
      return;
    }
    setFeedback(
      <>
        Not yet. Work out each difference on its own, and remember that subtracting a
        negative adds: <InlineMath latex={`${to.y} - ${sub(from.y)}`} /> on the top,{" "}
        <InlineMath latex={`${to.x} - ${sub(from.x)}`} /> on the bottom.
      </>,
    );
  }

  function checkReduce() {
    const parsed = parseSlope(reduceEntry);
    if (parsed === null) {
      setFeedback("Type a whole number, a decimal, or a fraction like -3/2.");
      return;
    }
    if (Math.abs(parsed.value - rise / run) > 1e-9) {
      setFeedback(
        <>
          Not yet. Divide <InlineMath latex={`\\dfrac{${rise}}{${run}}`} /> top and bottom
          by the largest number that goes into both, and keep the sign.
        </>,
      );
      return;
    }
    if (parsed.parts && gcd(parsed.parts.n, parsed.parts.d) !== 1) {
      setFeedback(
        <>
          That is the right value, but the fraction still reduces. Both{" "}
          <InlineMath latex={String(parsed.parts.n)} /> and{" "}
          <InlineMath latex={String(parsed.parts.d)} /> divide by{" "}
          <InlineMath latex={String(gcd(parsed.parts.n, parsed.parts.d))} />.
        </>,
      );
      return;
    }
    // A negative denominator carries the same value, but the sign belongs out front.
    if (parsed.parts && parsed.parts.d < 0) {
      setFeedback(
        <>
          That is the right value. Move the sign to the front of the fraction, so the
          denominator stays positive.
        </>,
      );
      return;
    }
    setFeedback(null);
    setRow(3);
    success();
    onSolved();
  }

  /**
   * The reveal's own resolution: settle the row it just explained and open the one below.
   *
   * Only the reveal that lets the learner past runs this, so filling a row in here cannot
   * cost them a row they were still owed: the reveal that re-asks hands the board back
   * untouched, with the explained row still theirs to type.
   */
  function fillIn() {
    setRevealed(true);
    setFeedback(null);
    if (row === 0) {
      setOrder(order ?? "as-dealt");
      setSubDone({ y2: true, y1: true, x2: true, x1: true });
      setRow(1);
      return;
    }
    if (row === 1) {
      setSimpDone({ rise: true, run: true });
      setRow(2);
      return;
    }
    setRow(3);
  }

  /*
   * The four labels drawn against the plot are placed by rule rather than by a fixed nudge,
   * because the pair rotates: a nudge that reads well for one pair walks off the canvas or onto
   * another label for the next.
   *
   * Order matters. The two LEG labels go first, since where they can sit is dictated by the
   * legs: each takes the side of its leg away from the triangle's body, so neither lands inside
   * the triangle, and the rise label clears the y axis and its tick numbers rather than being
   * printed across them. The POINT labels are then placed against them, stepping away from each
   * other so a short segment cannot stack the two, and `avoid` is what stops a point whose
   * preferred side is blocked by the canvas edge from flipping onto a leg label instead.
   *
   * The leg labels only constrain anything once the triangle is on the page. Reserving room for
   * them earlier would push the coordinates somewhere odd during the row that matters most, and
   * they have somewhere to go when the triangle arrives.
   *
   * The LEG labels follow the learner's reading, since they are the fraction being built. The
   * POINT labels are placed against the segment as DEALT instead: they name the two dots, which
   * do not move, so keying them to the reading would jog both coordinates across the plot at the
   * moment the substitution lands.
   */
  const runTex = `\\text{run} = ${run}`;
  const riseTex = `\\text{rise} = ${rise}`;
  const firstTex = pointTex(first);
  const secondTex = pointTex(second);
  const dealtRise = second.y - first.y;
  const dealtRun = second.x - first.x;

  const runLabel = labelSpot({
    x: (mapX(from.x) + mapX(to.x)) / 2,
    y: mapY(from.y),
    frame: LABEL_FRAME,
    dx: 0,
    dy: rise > 0 ? 1 : -1,
    halfW: labelHalfW(runTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: TICK_BOXES,
  });
  const riseLabel = labelSpot({
    x: mapX(to.x),
    y: (mapY(from.y) + mapY(to.y)) / 2,
    frame: LABEL_FRAME,
    dx: run > 0 ? 1 : -1,
    dy: 0,
    halfW: labelHalfW(riseTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: [...TICK_BOXES, runLabel],
  });
  const legLabels = row >= 1 ? [runLabel, riseLabel] : [];
  const firstLabel = labelSpot({
    x: mapX(first.x),
    y: mapY(first.y),
    frame: LABEL_FRAME,
    dx: dealtRun > 0 ? -1 : 1,
    dy: dealtRise > 0 ? 1 : -1,
    halfW: labelHalfW(firstTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, ...legLabels],
  });
  const secondLabel = labelSpot({
    x: mapX(second.x),
    y: mapY(second.y),
    frame: LABEL_FRAME,
    dx: dealtRun > 0 ? 1 : -1,
    dy: dealtRise > 0 ? -1 : 1,
    halfW: labelHalfW(secondTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, ...legLabels, firstLabel],
  });

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        That is the slope: <InlineMath latex={reducedTex(rise, run)} />. Both differences
        subtracted the same point, which is what kept the sign honest.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (row === 0) {
    status = (
      <>
        Fill in the formula. Either point can be <InlineMath latex="(x_2,\, y_2)" />: pick
        one, and subtract the other point on both lines, top and bottom.
      </>
    );
  } else if (row === 1) {
    status = (
      <>
        Substituted. Now work out the two differences: the top is the rise, the bottom is
        the run.
      </>
    );
  } else {
    status = (
      <>
        Last step: reduce <InlineMath latex={`\\dfrac{${rise}}{${run}}`} /> to lowest terms,
        sign included.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      {/* 400, not the default 460: side by side alone left this board 364.7px, 14.7px past the
        350px band. Its two columns are close in height (338.7 figure, 303.5 panel), so the
        narrower figure column is what decides it and the wider panel costs nothing. */}
      <WidgetBeside
        figureWidth={400}
        figure={
          <svg
            viewBox="0 0 440 324"
            role="img"
            aria-label={`The slope through ${spoken(first.x)}, ${spoken(first.y)} and ${spoken(second.x)}, ${spoken(second.y)}, computed one row at a time`}
          >
            <title>Fill in the two-point slope formula</title>

            <rect
              data-plot-frame=""
              x={LEFT}
              y={TOP}
              width={RIGHT - LEFT}
              height={BOTTOM - TOP}
              fill="var(--paper)"
              stroke={LINE}
              strokeWidth={1}
              rx={6}
            />
            {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((tick) => (
              <g key={`grid${tick}`}>
                <line
                  x1={mapX(tick)}
                  y1={TOP}
                  x2={mapX(tick)}
                  y2={BOTTOM}
                  stroke={LINE}
                  strokeWidth={0.5}
                />
                <line
                  x1={LEFT}
                  y1={mapY(tick)}
                  x2={RIGHT}
                  y2={mapY(tick)}
                  stroke={LINE}
                  strokeWidth={0.5}
                />
              </g>
            ))}
            <line
              x1={LEFT}
              y1={mapY(0)}
              x2={RIGHT}
              y2={mapY(0)}
              stroke={SOFT}
              strokeWidth={1.25}
            />
            <line
              x1={mapX(0)}
              y1={TOP}
              x2={mapX(0)}
              y2={BOTTOM}
              stroke={SOFT}
              strokeWidth={1.25}
            />
            {TICKS.map((tick) => (
              <text
                key={`xt${tick}`}
                x={mapX(tick)}
                y={mapY(0) + 14}
                textAnchor="middle"
                fontSize={10}
                fill={SOFT}
              >
                {tick}
              </text>
            ))}
            {TICKS.map((tick) => (
              <text
                key={`yt${tick}`}
                x={mapX(0) - 8}
                y={mapY(tick) + 3}
                textAnchor="end"
                fontSize={10}
                fill={SOFT}
              >
                {tick}
              </text>
            ))}

            <line
              x1={mapX(first.x)}
              y1={mapY(first.y)}
              x2={mapX(second.x)}
              y2={mapY(second.y)}
              stroke={solved ? CIVIC : LABEL}
              strokeWidth={2.25}
            />

            {row >= 1 && (
              <>
                <line
                  x1={mapX(from.x)}
                  y1={mapY(from.y)}
                  x2={mapX(to.x)}
                  y2={mapY(from.y)}
                  stroke={CIVIC}
                  strokeWidth={2.25}
                />
                <line
                  x1={mapX(to.x)}
                  y1={mapY(from.y)}
                  x2={mapX(to.x)}
                  y2={mapY(to.y)}
                  stroke={BRICK}
                  strokeWidth={2.25}
                />
                <PlotLabel
                  box={runLabel}
                  latex={runTex}
                  fontSize={LABEL_SIZE}
                  color={CIVIC}
                />
                <PlotLabel
                  box={riseLabel}
                  latex={riseTex}
                  fontSize={LABEL_SIZE}
                  color={BRICK}
                />
              </>
            )}

            <circle cx={mapX(first.x)} cy={mapY(first.y)} r={5.5} fill={LABEL} />
            <circle cx={mapX(second.x)} cy={mapY(second.y)} r={5.5} fill={SIGNAL} />
            <PlotLabel
              box={firstLabel}
              latex={firstTex}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />
            <PlotLabel
              box={secondLabel}
              latex={secondTex}
              fontSize={LABEL_SIZE}
              color={SIGNAL}
            />
          </svg>
        }
      >
        <div className="lesson-equation">
          {/* The legend states the reading in force, so it follows the learner's choice
            rather than dictating one. Each point keeps the color of its own dot. */}
          <p className="lesson-equation__naming">
            <InlineMath
              latex={`(x_1,\\, y_1) = ${fromTex}`}
              color={from === first ? LABEL : SIGNAL}
            />{" "}
            {/* The two points are independent readings, so the space between them is the only
              thing saying so. It used to come from the row's flex `gap`; the row is text flow
              now, which would leave them touching, so it is written down. The spaces either
              side of the spacer are the break opportunity a narrow column needs. */}
            <span style={{ display: "inline-block", inlineSize: "var(--space-sm)" }} />{" "}
            <InlineMath
              latex={`(x_2,\\, y_2) = ${toTex}`}
              color={to === first ? LABEL : SIGNAL}
            />
          </p>

          <Stage name="substitute" state={stageState(0)} onCheck={checkSubstitution}>
            <Frac
              top={
                <>
                  <Slot
                    state={subDone.y2 ? "done" : stageState(0)}
                    value={subEntry.y2}
                    settled={String(to.y)}
                    aria="y sub 2, the y coordinate of the point you take as point 2"
                    color={BRICK}
                    onChange={(next) => setSubEntry((prev) => ({ ...prev, y2: next }))}
                    onEnter={checkSubstitution}
                  />
                  <InlineMath latex="-" />
                  <Slot
                    state={subDone.y1 ? "done" : stageState(0)}
                    value={subEntry.y1}
                    settled={sub(from.y)}
                    aria="y sub 1, the y coordinate of the point you take as point 1"
                    color={BRICK}
                    onChange={(next) => setSubEntry((prev) => ({ ...prev, y1: next }))}
                    onEnter={checkSubstitution}
                  />
                </>
              }
              bottom={
                <>
                  <Slot
                    state={subDone.x2 ? "done" : stageState(0)}
                    value={subEntry.x2}
                    settled={String(to.x)}
                    aria="x sub 2, the x coordinate of the point you take as point 2"
                    color={CIVIC}
                    onChange={(next) => setSubEntry((prev) => ({ ...prev, x2: next }))}
                    onEnter={checkSubstitution}
                  />
                  <InlineMath latex="-" />
                  <Slot
                    state={subDone.x1 ? "done" : stageState(0)}
                    value={subEntry.x1}
                    settled={sub(from.x)}
                    aria="x sub 1, the x coordinate of the point you take as point 1"
                    color={CIVIC}
                    onChange={(next) => setSubEntry((prev) => ({ ...prev, x1: next }))}
                    onEnter={checkSubstitution}
                  />
                </>
              }
            />
          </Stage>

          <Stage name="simplify" state={stageState(1)} onCheck={checkSimplify}>
            <Frac
              top={
                <Slot
                  state={simpDone.rise ? "done" : stageState(1)}
                  value={simpEntry.rise}
                  settled={String(rise)}
                  aria="the rise, the difference of the y coordinates"
                  color={BRICK}
                  onChange={(next) => setSimpEntry((prev) => ({ ...prev, rise: next }))}
                  onEnter={checkSimplify}
                />
              }
              bottom={
                <Slot
                  state={simpDone.run ? "done" : stageState(1)}
                  value={simpEntry.run}
                  settled={String(run)}
                  aria="the run, the difference of the x coordinates"
                  color={CIVIC}
                  onChange={(next) => setSimpEntry((prev) => ({ ...prev, run: next }))}
                  onEnter={checkSimplify}
                />
              }
            />
          </Stage>

          <Stage name="reduce" state={stageState(2)} onCheck={checkReduce}>
            <Slot
              state={stageState(2)}
              value={reduceEntry}
              settled={reducedTex(rise, run)}
              aria="the slope, reduced to lowest terms"
              color={CIVIC}
              onChange={setReduceEntry}
              onEnter={checkReduce}
            />
          </Stage>
        </div>

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different pair
          </button>
        )}

        <WidgetReveal
          available={feedback !== null && !solved}
          revealed={revealed}
          answer={
            row === 0 ? (
              <InlineMath
                latex={`m = \\dfrac{${to.y} - ${sub(from.y)}}{${to.x} - ${sub(from.x)}}`}
              />
            ) : row === 1 ? (
              <InlineMath latex={`m = \\dfrac{${rise}}{${run}}`} />
            ) : (
              <InlineMath latex={`m = ${reducedTex(rise, run)}`} />
            )
          }
          why={
            row === 0 ? (
              <>
                Pick one point to be <InlineMath latex="(x_2,\, y_2)" /> and then never
                change your mind: the top line subtracts that point's{" "}
                <InlineMath latex="y" /> from the other's, and the bottom line has to
                subtract the SAME point's <InlineMath latex="x" />. Taking{" "}
                <InlineMath latex={toTex} /> as point 2 and <InlineMath latex={fromTex} />{" "}
                as point 1 gives the four numbers above. Reading one line from each end is
                what flips a sign on only half of the fraction.
              </>
            ) : row === 1 ? (
              <>
                Each difference is its own small subtraction, so do them one at a time and
                watch the double negatives: subtracting <InlineMath latex={sub(from.y)} />{" "}
                is adding <InlineMath latex={String(-from.y)} />, and the same on the
                bottom. The top comes out <InlineMath latex={String(rise)} /> and the bottom{" "}
                <InlineMath latex={String(run)} />.
              </>
            ) : (
              <>
                Reducing divides top and bottom by the largest number that goes into both,
                and it never touches the value:{" "}
                <InlineMath latex={`\\dfrac{${rise}}{${run}}`} /> names the same steepness
                before and after. The sign belongs in front of the fraction, so a negative
                on the bottom is moved out rather than left there.
              </>
            )
          }
          onReveal={fillIn}
          label={
            row === 0
              ? "Reveal how to substitute"
              : row === 1
                ? "Reveal the two differences"
                : "Reveal the reduction"
          }
          othersRemain={row < 2}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
