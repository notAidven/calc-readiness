/**
 * How TALL a piece of rendered KaTeX actually is, for the tests that size one box against
 * another.
 *
 * The companion to `katexBaseline.ts`, and it exists for the same reason: the obvious
 * measurement is wrong in a way that produces a plausible number. `getBoundingClientRect` on
 * a KaTeX span returns the CSS inline box, which for a non-replaced inline element is the
 * FONT's ascent plus descent — a property of the typeface and the font size, not of the maths
 * inside. So every wrapper in an expression measures the same:
 *
 *   `.mfrac` holding `\dfrac{14}{2}` at the worked figures' 18px .............. 21.0 units
 *   `.mfrac` holding anything else at the worked figures' 18px ............... 21.0 units
 *
 * That constant is how a delimiter came to be sized against nothing. `d4.pol4.complete.l1`
 * shipped a `size1` bracket around a display fraction — a bracket 0.60x its own contents,
 * reported twice by a learner as too short — while a guard measuring `.delimsizing`'s box
 * over `.mfrac`'s box read 2.05 and called it OVERSIZED. The numerator was real and the
 * denominator was the font.
 *
 * A `.vlist` is the exception, and it is not a general fix: KaTeX writes explicit `height`
 * styles onto the two rows of a `vlist-t2`, so a fraction's reserved height and depth ARE
 * readable there (36.1 units for that same fraction). But a sized delimiter is a single glyph
 * in `KaTeX_Size1..4` with no vlist at all, so the two sides of a ratio cannot both be read
 * that way — which is the whole difficulty.
 *
 * What is measured here instead is PAINTED INK, the same way `workedFigureLabels`'s
 * `paintedTextBox` measures an SVG `<text>`: Canvas reports a string's real ink extents about
 * its baseline in a given font, and an inline box's baseline is recoverable from its bottom
 * (`bottom - fontBoundingBoxDescent`). Recursed over a subtree's leaves it gives the
 * top and bottom of everything a learner can see, in page coordinates, for a fraction and for
 * a bracket alike:
 *
 *   \dfrac{14}{2} .... 37.0        \bigl( size1 .... 22.0   0.60x
 *   \Bigl( size2 ..... 31.6 0.85x  \left( / \biggl( size3 .. 41.1  1.11x
 *   \Biggl( size4 .... 52.6 1.42x  bare ( .......... 18.2   0.49x
 */

let measuring: CanvasRenderingContext2D | null = null;

function measuringContext(): CanvasRenderingContext2D {
  if (measuring === null) {
    const found = document.createElement("canvas").getContext("2d");
    if (found === null) {
      throw new Error("no 2d context to measure glyph ink with");
    }
    measuring = found;
  }
  return measuring;
}

/** The top and bottom of some painted ink, in page coordinates. */
export interface Ink {
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
}

/**
 * The ink of one text-bearing leaf element.
 *
 * `null` when there is nothing drawn, so a caller counts what it measured rather than folding
 * an empty box into a union and reporting a height that came from somewhere else.
 */
function leafInk(node: Element): Ink | null {
  const text = (node.textContent ?? "").trim();
  if (text.length === 0) {
    return null;
  }
  const rect = node.getBoundingClientRect();
  if (rect.height < 0.5) {
    return null;
  }
  const style = getComputedStyle(node);
  const context = measuringContext();
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics = context.measureText(text);
  const baseline = rect.bottom - metrics.fontBoundingBoxDescent;
  const top = baseline - metrics.actualBoundingBoxAscent;
  const bottom = baseline + metrics.actualBoundingBoxDescent;
  return { top, bottom, height: bottom - top };
}

/**
 * The painted ink of a whole KaTeX subtree: every glyph leaf, plus any rule KaTeX draws.
 *
 * `.katex-mathml` is skipped. KaTeX's `htmlAndMathml` output emits every expression twice and
 * the MathML copy is hidden, so counting it doubles the population and can contribute a box
 * from a layout nobody sees.
 */
export function paintedInk(root: Element): Ink | null {
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  const walk = (node: Element): void => {
    if (node.classList.contains("katex-mathml")) {
      return;
    }
    const children = Array.from(node.children);
    if (children.length > 0) {
      for (const child of children) {
        walk(child);
      }
      return;
    }
    // A fraction's rule is a border on an empty span, so its own box IS its ink.
    if (node.classList.contains("frac-line")) {
      const rect = node.getBoundingClientRect();
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
      return;
    }
    const ink = leafInk(node);
    if (ink !== null) {
      top = Math.min(top, ink.top);
      bottom = Math.max(bottom, ink.bottom);
    }
  };
  walk(root);

  return Number.isFinite(top) && Number.isFinite(bottom)
    ? { top, bottom, height: bottom - top }
    : null;
}
