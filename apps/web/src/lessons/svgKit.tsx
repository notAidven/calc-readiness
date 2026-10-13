/**
 * Shared primitives for the D1 lesson visuals: theme color tokens, PEMDAS tier colors,
 * the KaTeX math renderers, and layout helpers. These live here (rather than in
 * `visuals.tsx`) so both the static mini-lesson diagrams (`visuals.tsx`), the
 * worked-solution diagrams (`workedSolutionVisuals.tsx`), and the interactive widgets
 * (`interactive/*.tsx`) can import them without an import cycle.
 *
 * All learner-visible math renders through KaTeX: `SvgMath` / `EquationRow` inside a
 * diagram, `InlineMath` in the surrounding HTML controls and status lines. Every math
 * string these take is LaTeX (`\dfrac{2}{3}`, `4 \times 2`), never Unicode arithmetic.
 * Plain `<text>` is still right for non-math labels ("order", "grouping") and for bare
 * integer axis ticks, where KaTeX would buy nothing and cost one foreignObject each.
 *
 * The stylesheet imported below is the app's ONLY KaTeX stylesheet, and it also has to
 * style the prose math that `rehype-katex` renders. So the `katex` version pinned in
 * `apps/web/package.json` must stay on the major `rehype-katex` depends on (0.16), or the
 * two renderers emit different class names against one stylesheet. That is not cosmetic:
 * 0.18 renamed the horizontal-lap internals (`inner`/`fix`) and dropped the old rules, so
 * on 0.18 CSS a 0.16-rendered `\neq` loses its overlay and prints as a slash NEXT TO an
 * equals sign instead of through it.
 */

import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useRef } from "react";

export const LABEL = "var(--ink)";
export const SOFT = "var(--ink-soft)";
export const LINE = "var(--line)";
export const CIVIC = "var(--civic)";
export const BRICK = "var(--brick)";
export const SIGNAL = "var(--signal)";
/**
 * The readable amber, for a state that must not be spoken in the correctness palette.
 *
 * `CIVIC` and `BRICK` are the app's correctness channel and they belong to the LEARNER'S
 * ACTION: green means they got it right, red means they did not. Anything that has to stay
 * marked on the board for a reason of its own, such as the line a two-stage widget is in
 * the middle of repairing, needs a third colour or it borrows a verdict it is not making.
 */
export const SIGNAL_DEEP = "var(--signal-deep)";

/** PEMDAS tier colors: each operation tier gets one on-brand hue. */
export const PEMDAS = {
  paren: SIGNAL,
  exp: BRICK,
  muldiv: CIVIC,
  addsub: LABEL,
} as const;

export type PemdasRole = keyof typeof PEMDAS;

export interface EqToken {
  /** LaTeX for this chunk of the row, e.g. `4 \times 2` or `\dfrac{2}{3}`. */
  text: string;
  /** Tier color; defaults to ink. */
  role?: PemdasRole;
  /** Explicit color; overrides `role` when set (for non-PEMDAS equations). */
  color?: string;
  /** Superscript (e.g. an exponent); folded into the token's LaTeX as `^{...}`. */
  sup?: string;
  /** Draw a line through the token (used for a wrong result). */
  strike?: boolean;
  /**
   * Glue this token to the one before it, closing the binary-operator gap. Use it when a
   * token continues the previous one rather than following it — an exponent tinted its own
   * tier color, for instance (`{ text: "{}", sup: "2", tight: true }`).
   */
  tight?: boolean;
}

/*
 * There is deliberately no font token here. KaTeX owns the face of every piece of math,
 * and a non-math label is prose that belongs in the body font, so a widget that sets a
 * `font-family` can only be styling the words around its math out of step with the rest
 * of the page. The one exception is the typed `<input>`, handled in `styles.css`.
 */

/** TeX's binary-operator spacing, set between `EquationRow` tokens. */
const TOKEN_GAP = "0.22em";

/** A token's LaTeX with any `sup` folded in as an exponent. */
function tokenLatex(token: EqToken): string {
  return token.sup === undefined ? token.text : `${token.text}^{${token.sup}}`;
}

/**
 * Mid-y of the visual gap between two stacked equation rows. `SvgMath` and
 * `EquationRow` center their content on `y`, so the gap between two rows is
 * symmetric and its midpoint is just the mean — no baseline/ascent correction,
 * which is what the old `<text>`-based rows needed.
 */
export function stackGapMid(yPrev: number, yNext: number): number {
  return (yPrev + yNext) / 2;
}

/** The rectangle a label has to stay inside: a plot frame in SVG user units. */
export interface LabelFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Which way a label sits from the thing it names. `0` keeps that axis centered. */
export type LabelDir = -1 | 0 | 1;

/** A placed label, as `labelSpot` needs to hear about it to steer the next one clear. */
export interface LabelBox {
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

function fitsFrame(box: LabelBox, frame: LabelFrame): boolean {
  return (
    box.x - box.halfW >= frame.left &&
    box.x + box.halfW <= frame.right &&
    box.y - box.halfH >= frame.top &&
    box.y + box.halfH <= frame.bottom
  );
}

function collides(a: LabelBox, b: LabelBox): boolean {
  return Math.abs(a.x - b.x) < a.halfW + b.halfW && Math.abs(a.y - b.y) < a.halfH + b.halfH;
}

/** How much of two boxes is shared, as an area. `0` when they are clear of each other. */
function overlapArea(a: LabelBox, b: LabelBox): number {
  const x = Math.max(0, a.halfW + b.halfW - Math.abs(a.x - b.x));
  const y = Math.max(0, a.halfH + b.halfH - Math.abs(a.y - b.y));
  return x * y;
}

/** The same box, moved the shortest distance that puts it wholly inside the frame. */
function clampInto(box: LabelBox, frame: LabelFrame): LabelBox {
  return {
    ...box,
    x: Math.min(Math.max(box.x, frame.left + box.halfW), frame.right - box.halfW),
    y: Math.min(Math.max(box.y, frame.top + box.halfH), frame.bottom - box.halfH),
  };
}

/** `-0` and `0` are `===` but make different map keys, so normalise before deduping. */
function flat(d: number): LabelDir {
  return (d === 0 ? 0 : d) as LabelDir;
}

/**
 * The directions to try, best first: the one asked for, then a single flip, then both, then
 * the four straight-on sides. Deviating by one axis at a time keeps the answer as close to
 * the caller's intent as the geometry allows.
 *
 * The tail matters for a label that asked to stay centred on one axis (`dx` or `dy` of `0`),
 * which otherwise has only two places to go: a label centred over a horizontal line that
 * happens to cross an axis tick has to be able to slide ALONG the line to escape it.
 */
function candidates(dx: LabelDir, dy: LabelDir): readonly [LabelDir, LabelDir][] {
  const ordered: [LabelDir, LabelDir][] = [
    [dx, dy],
    [flat(dx), flat(-dy)],
    [flat(-dx), flat(dy)],
    [flat(-dx), flat(-dy)],
    [flat(dx), 0],
    [0, flat(dy)],
    [flat(-dx), 0],
    [0, flat(-dy)],
    [1, flat(dy)],
    [-1, flat(dy)],
    [flat(dx), 1],
    [flat(dx), -1],
  ];
  const seen = new Set<string>();
  return ordered.filter(([cdx, cdy]) => {
    // [0, 0] would print the label on top of the very thing it names.
    if (cdx === 0 && cdy === 0) {
      return false;
    }
    const key = `${cdx},${cdy}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Where to put the label that names a plotted point or a leg of a triangle.
 *
 * Every graph widget used to hand-write its own offset (`mapY(p.y) + 18`, `mapX(p.x) - 30`),
 * which fails in two ways the moment the geometry moves: a point near an edge pushes its
 * label off the plot, and two labels offset by the same rule land on each other. Neither is
 * fixable by a better constant, because the widgets that hit this deal a new instance on
 * every restart, so there is no one arrangement to tune for.
 *
 * So the caller states the direction it WANTS and which labels are already down, and this
 * walks the eight directions in order of how little they deviate, taking the first that both
 * sits inside the frame and clears everything in `avoid`.
 *
 * When none of them is clean — a point in a corner of a busy plot — every direction is pulled
 * inside the frame and the one that overlaps the least is taken. Staying inside the frame is
 * the part that is not negotiable, so what is left to choose is which crowding to accept, and
 * the label's own point is weighted heaviest among the things to avoid: a coordinate pair
 * printed across the dot it names is worse than one grazing a tick number.
 *
 * Returns a center, matching `SvgMath`, whose `y` is a vertical center rather than a
 * baseline. `halfW` / `halfH` are half the label's ink, not half of `SvgMath`'s deliberately
 * roomy box: that box is transparent and click-through, so only the glyphs have to clear
 * anything.
 */
export function labelSpot({
  x,
  y,
  frame,
  dx,
  dy,
  halfW = 36,
  halfH = 11,
  gap = 14,
  avoid = [],
}: {
  x: number;
  y: number;
  frame: LabelFrame;
  dx: LabelDir;
  dy: LabelDir;
  halfW?: number;
  halfH?: number;
  gap?: number;
  avoid?: readonly LabelBox[];
}): LabelBox {
  const reachX = gap + halfW;
  const reachY = gap + halfH;
  const tried = candidates(dx, dy).map(([cdx, cdy]) => ({
    x: x + cdx * reachX,
    y: y + cdy * reachY,
    halfW,
    halfH,
  }));

  for (const box of tried) {
    if (fitsFrame(box, frame) && !avoid.some((other) => collides(box, other))) {
      return box;
    }
  }

  /** The dot being named, as an obstacle. Its radius is generous on purpose. */
  const own: LabelBox = { x, y, halfW: 8, halfH: 8 };
  let best: { box: LabelBox; cost: number } | null = null;
  for (const box of tried) {
    const inside = clampInto(box, frame);
    const cost =
      overlapArea(inside, own) * 4 +
      avoid.reduce((sum, other) => sum + overlapArea(inside, other), 0);
    if (cost === 0) {
      return inside;
    }
    if (best === null || cost < best.cost) {
      best = { box: inside, cost };
    }
  }
  return best?.box ?? clampInto({ x, y, halfW, halfH }, frame);
}

/**
 * The frame a plot's labels live in: the plot rectangle, pulled in by `inset`.
 *
 * A coordinate label belongs INSIDE the plot. Letting one hang into the margin looks fine
 * until the point is at an edge, and then the label is half off the canvas or sitting on
 * the axis numbers of the plot next to it. The inset is the breathing room that keeps a
 * label from being printed flush against the frame line, which reads as a mistake even
 * when the glyphs technically fit.
 */
export function plotLabelFrame(plot: LabelFrame, inset = 8): LabelFrame {
  return {
    left: plot.left + inset,
    right: plot.right - inset,
    top: plot.top + inset,
    bottom: plot.bottom - inset,
  };
}

/** Roughly one glyph's advance, as a fraction of the font size, averaged over a label. */
const GLYPH_ADVANCE = 0.52;

/** The plate's horizontal padding, which widens the ink it sits behind. */
const PLATE_PAD_X = 4;

/**
 * The two surfaces a diagram label is ever drawn on, and the colour each is painted in.
 *
 * A plate exists to occlude, so it is only invisible when it is the colour of what it covers,
 * and one constant cannot serve both of these. `var(--paper)` is right INSIDE a plot, because
 * every plane in the tree fills its `data-plot-frame` rect with exactly that; it is wrong on
 * the bare figure card, which `.lesson-visual` paints `var(--paper-deep)`, and there the
 * lighter patch reads as an opaque white box behind the label. That is what a reviewer saw
 * behind the degree readings on D9's unit circles, and the same box was on GEO.2 and on every
 * other figure labelling straight onto the card.
 *
 * So the surface is named at the call site and the colour is looked up here. The default is
 * the card, because a label drawn against the card is the ordinary case and a plate inside a
 * plot arrives through {@link PlotLabel}, which asks for the plot surface itself.
 */
const PLATE_SURFACE = {
  /** The `.lesson-visual` figure card that every diagram and widget is mounted in. */
  card: "var(--paper-deep)",
  /** The interior of a plot rect, which every plane in the tree fills with `var(--paper)`. */
  plot: "var(--paper)",
} as const;

export type PlateSurface = keyof typeof PLATE_SURFACE;

/**
 * Half the ink HEIGHT of a one-line label: about half its font size, since a line of math
 * stands roughly one em tall counting the parentheses and the descenders.
 *
 * Worth passing rather than defaulting, because the size a label is placed AS decides how
 * crowded the plot is. The old default modelled a 13-unit label as 22 units tall, which
 * ruled out placements it would in fact have fitted, and on a plot whose labels have to
 * stay inside the grid there are few enough of those to begin with.
 */
export function labelHalfH(fontSize: number): number {
  return fontSize * 0.5 + 1;
}

/**
 * Half the ink width of a short label, estimated from its LaTeX.
 *
 * `labelSpot` can only keep a label inside a frame if it is told how wide the label is,
 * and every caller was taking the same default — so a long pair like `(-12,\, -8)` was
 * placed as though it were as narrow as `(1,\, 2)` and slid past the edge anyway. This is
 * an estimate, not a measurement: KaTeX has not laid the label out at the time the spot is
 * chosen, and a measure-then-place pass would cost a second render of every diagram.
 *
 * Sized for the one-line labels a plot carries (coordinate pairs, `rise = -9`). A label
 * with a fraction in it stacks rather than runs on, so pass `halfW` yourself for those.
 */
export function labelHalfW(latex: string, fontSize: number): number {
  const glyphs = latex
    // `\text{...}` prints its contents, so the braces and the macro are not ink.
    .replace(/\\text\{([^}]*)\}/g, "$1")
    // The thin spaces are narrower than a glyph; near enough to nothing at this size.
    .replace(/\\[,;:!]/g, "")
    .replace(/\\q?quad/g, " ")
    // Any other macro (`\div`, `\pi`) prints as about one glyph.
    .replace(/\\[a-zA-Z]+/g, "x")
    .replace(/[{}^_]/g, "").length;
  return (glyphs * fontSize * GLYPH_ADVANCE) / 2 + PLATE_PAD_X;
}

/**
 * One label placed on a plot: the coordinate pair naming a point, or the leg of a triangle.
 *
 * Takes the box `labelSpot` returned rather than placing itself, because a widget places
 * its labels in sequence and has to feed each finished box into the next one's `avoid`
 * list. What this adds is the two things every on-plot label needs and none of them used
 * to have: the plate that lifts the glyphs off the gridlines they cross, and the
 * `data-plot-label` hook plus ink extents that `plotLayout.test.tsx` reads to prove the
 * label landed inside the plot.
 *
 * The plate is the PLOT surface here rather than the card, since by construction this label
 * is inside the plot rect and every plane fills that rect with `var(--paper)`.
 */
export function PlotLabel({
  box,
  latex,
  fontSize = 13,
  color = LABEL,
  w = 140,
}: {
  box: LabelBox;
  latex: string;
  fontSize?: number;
  color?: string;
  w?: number;
}) {
  return (
    <g
      data-plot-label=""
      data-ink-x={box.x}
      data-ink-y={box.y}
      data-ink-half-w={box.halfW}
      data-ink-half-h={box.halfH}
    >
      <SvgMath
        latex={latex}
        x={box.x}
        y={box.y}
        fontSize={fontSize}
        color={color}
        w={w}
        plate="plot"
      />
    </g>
  );
}

/**
 * The ticks that can be NUMBERED: the ones strictly inside the range.
 *
 * A tick at the end of the range sits exactly on the plot's border, and its number is
 * centered there, so half the ink is drawn outside the plot. The tick MARK is still fine
 * to draw; it is the label that has nowhere to go.
 */
export function interiorTicks(
  ticks: readonly number[],
  min: number,
  max: number,
): readonly number[] {
  return ticks.filter((tick) => tick > min + 1e-9 && tick < max - 1e-9);
}

/**
 * How much clear space an axis number needs between its centre and the plot's border, as a
 * multiple of its own half-extent. At `1` the number merely fits; at `2` it is printed a
 * full width inside, which is what stops it reading as stuck to the frame.
 */
export const TICK_EDGE_CLEARANCE = 2;

/**
 * The ticks that can carry a number on a plane whose window is COMPUTED rather than chosen.
 *
 * `interiorTicks` is enough when the ticks are hand-picked against a fixed range. When the
 * window is sized to the data, the outermost tick lands wherever the zoom puts it, which
 * can be inside the range and still hard against the border. This measures instead.
 */
export function fittingTicks({
  ticks,
  place,
  half,
  start,
  end,
}: {
  ticks: readonly number[];
  /** Where the tick's number is centred, in screen units along the axis it labels. */
  place: (tick: number) => number;
  /** Half the number's extent along that same axis. */
  half: (tick: number) => number;
  start: number;
  end: number;
}): readonly number[] {
  return ticks.filter((tick) => {
    const room = half(tick) * TICK_EDGE_CLEARANCE;
    return place(tick) - room > start && place(tick) + room < end;
  });
}

/**
 * Typeset `latex` into `host` imperatively. Mirrors the diagnostic lane's `MathText`:
 * KaTeX owns the subtree, so we never need `dangerouslySetInnerHTML`, and a malformed
 * expression degrades to its own source instead of blanking the diagram.
 */
function useKatex(latex: string, output: "html" | "htmlAndMathml") {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) {
      return;
    }
    try {
      katex.render(latex, node, { throwOnError: false, output });
    } catch {
      node.textContent = latex;
    }
  }, [latex, output]);
  return host;
}

interface MathSpanProps {
  latex: string;
  color?: string;
  strike?: boolean;
  className?: string;
}

/** One KaTeX span. `data-latex` is the stable hook tests assert on. */
function MathSpan({
  latex,
  color,
  strike,
  className,
  output,
  marginInlineStart,
}: MathSpanProps & {
  output: "html" | "htmlAndMathml";
  marginInlineStart?: string;
}) {
  const host = useKatex(latex, output);
  return (
    <span
      ref={host}
      className={className}
      data-latex={latex}
      style={{
        color,
        marginInlineStart,
        textDecoration: strike ? "line-through" : undefined,
      }}
    />
  );
}

/**
 * One KaTeX expression inline in HTML — the widget controls, chips, field labels and
 * status lines. Keeps MathML beside the visual layer so assistive tech reads the math.
 * The in-diagram renderers skip MathML instead, since their `<svg role="img">` parent
 * hides the subtree from assistive tech and already carries the description.
 */
export function InlineMath(props: MathSpanProps) {
  return <MathSpan {...props} output="htmlAndMathml" />;
}

/**
 * One KaTeX label placed in SVG user space, hosted in a `foreignObject` (KaTeX emits
 * HTML, so this is the only way to put real math in a diagram).
 *
 * `y` is the label's vertical CENTER, not a baseline — the baseline convention is what
 * makes SVG text drift out of alignment with the geometry it labels. The box is
 * deliberately generous with the content flex-centered inside: inside a `foreignObject`
 * one CSS pixel is one SVG user unit, so a roomy box avoids both a measurement pass and
 * the clipping a tight box would cause. `pointerEvents: none` keeps that wide box from
 * stealing clicks from the shapes underneath, which matters in the interactive widgets.
 */
export function SvgMath({
  latex,
  x,
  y,
  anchor = "middle",
  fontSize = 20,
  color = LABEL,
  strike,
  plate,
  w = 440,
  h = fontSize * 3,
}: {
  latex: string;
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
  fontSize?: number;
  color?: string;
  strike?: boolean;
  /**
   * Lay a plate behind the glyphs, for a label drawn over a grid or a curve.
   *
   * It goes on the KaTeX host below, NOT on this box: the box is deliberately roomy, so a
   * plate its size would white out the diagram around the label. The host is a flex item,
   * so it shrinks to the ink and the plate comes out the size of the label.
   *
   * The plate is painted the colour of the surface it covers, so name that surface where the
   * two differ: `true` is the figure card, `"plot"` the interior of a plot rect. See
   * {@link PLATE_SURFACE} for why one colour cannot serve both.
   */
  plate?: boolean | PlateSurface;
  /** Box width in user units; widen only if a label is clipped. */
  w?: number;
  h?: number;
}) {
  const host = useKatex(latex, "html");
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return (
    <foreignObject
      x={left}
      y={y - h / 2}
      width={w}
      height={h}
      data-latex={latex}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent:
            anchor === "middle" ? "center" : anchor === "end" ? "flex-end" : "flex-start",
          color,
          fontSize,
          lineHeight: 1,
          textDecoration: strike ? "line-through" : undefined,
        }}
      >
        <span
          ref={host}
          style={
            plate
              ? {
                  padding: `1px ${PLATE_PAD_X}px`,
                  borderRadius: 4,
                  background: PLATE_SURFACE[plate === true ? "card" : plate],
                }
              : undefined
          }
        />
      </div>
    </foreignObject>
  );
}

/**
 * One centered row of an equation whose tokens are colored by concept (PEMDAS role).
 * Each token is its own KaTeX span in a flex row, because the theme colors are CSS
 * variables (`var(--ink)`) that KaTeX's own `\textcolor` cannot parse. `TOKEN_GAP`
 * between the spans stands in for the spacing KaTeX would have set itself.
 *
 * So an operator is always its own token — never glued to an operand. KaTeX demotes a
 * binary operator that sits at the edge of an expression to an ordinary atom (there is
 * no operand on that side to space it against), so `[{ text: "a +" }, { text: "0" }]`
 * renders `a+` tight and then drops the gap after the plus: `a+ 0`. Split it into
 * `[{ text: "a" }, { text: "+" }, { text: "0" }]` and the gap falls on both sides.
 * `visualsMath.test.tsx` enforces this. A leading `=` that opens a continuation row is
 * fine — it has no token before it. When one span has to stay whole (an unbroken
 * `strike`), give the operator an empty left operand and cancel the row's gap instead:
 * `{ text: "{}\\div \\dfrac{2}{5}", tight: true }`.
 */
/** Left inset within a 440px row at fontSize 20 so continuation rows share one `=` column. */
const EQUALS_ROW_INSET = "5.5rem";
/** Fixed slot for `\phantom{=}` / `=` so `"equals-center"` rows share one column. */
const EQUALS_COL_WIDTH = "1.1em";

function renderEqTokens(tokens: readonly EqToken[]) {
  return tokens.map((token, index) => (
    <MathSpan
      // biome-ignore lint/suspicious/noArrayIndexKey: equation tokens are static and never reordered
      key={`${token.text}-${index}`}
      latex={tokenLatex(token)}
      color={token.color ?? (token.role ? PEMDAS[token.role] : LABEL)}
      strike={token.strike}
      marginInlineStart={token.tight ? `-${TOKEN_GAP}` : undefined}
      output="html"
    />
  ));
}

export function EquationRow({
  tokens,
  cx,
  y,
  fontSize = 20,
  w = 440,
  align = "center",
}: {
  tokens: readonly EqToken[];
  cx: number;
  y: number;
  fontSize?: number;
  w?: number;
  /**
   * `"equals"` left-aligns tokens so the first `=` shares a column across rows.
   * `"equals-center"` centers the row as a block while keeping that column fixed.
   */
  align?: "center" | "equals" | "equals-center";
}) {
  const h = fontSize * 3;
  const equalsCenter = align === "equals-center";
  const equalsAligned = align === "equals";
  const [first, ...rest] = tokens;
  return (
    <foreignObject
      x={cx - w / 2}
      y={y - h / 2}
      width={w}
      height={h}
      data-latex={tokens.map(tokenLatex).join(" ")}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      {equalsCenter && first !== undefined ? (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              columnGap: TOKEN_GAP,
              fontSize,
              lineHeight: 1,
            }}
          >
            <div
              style={{
                width: EQUALS_COL_WIDTH,
                display: "flex",
                justifyContent: "flex-end",
                flexShrink: 0,
              }}
            >
              {renderEqTokens([first])}
            </div>
            {renderEqTokens(rest)}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: equalsAligned ? "flex-start" : "center",
            paddingLeft: equalsAligned ? EQUALS_ROW_INSET : undefined,
            columnGap: TOKEN_GAP,
            fontSize,
            lineHeight: 1,
          }}
        >
          {renderEqTokens(tokens)}
        </div>
      )}
    </foreignObject>
  );
}
