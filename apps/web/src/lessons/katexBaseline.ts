/**
 * Where a rendered piece of KaTeX actually sits on the line, for the tests that align maths.
 *
 * A KaTeX box's BOTTOM is not where its maths sits: it is the baseline plus the expression's
 * DEPTH, and depth swings with the content — 9.7px under `x^{\dfrac{5}{4}} \text{ has}`
 * against 7.7px under a bare `5` at the labelling figures' font size. So a row that lines two
 * expressions up by their box bottoms has put their baselines 2px apart, which is how RAD.3's
 * `5` and `4` came to sit below the expression they name.
 *
 * The depth is readable, because KaTeX writes it into the DOM. Every rendered expression opens
 * with a `<span class="strut">`, an empty inline box of height (height + depth) carrying
 * `vertical-align: -{depth}em`, which is how KaTeX reserves the line it needs. The computed
 * `vertical-align` therefore resolves to a negative pixel length that IS the depth, and a
 * strut with no `vertical-align` at all is an expression with no depth.
 *
 * MEASURED OFF THE STRUT, not off the `.katex` box, and the difference is not cosmetic. The
 * strut is the one box KaTeX guarantees ends exactly `depth` below the baseline; the outer
 * `.katex` box need not, and where the two disagree the subtraction lands somewhere that is
 * not a baseline at all. Written the wrong way round first, this reported 5.1px of stagger
 * across `radical-parts-label` where the strut says 0.0px — a plausible-looking number, in the
 * right units, off by an element.
 */

/**
 * Where a row of blanks wants the maths beside it to be READ, in page coordinates.
 *
 * Not the band's centre, which is where a box goes and not where text goes: the ink of "has"
 * stands entirely above its baseline and nothing hangs below it, so a baseline on the centre
 * draws the word in the band's lower half. Optical centring puts the x-height band on the
 * centre instead, which is the baseline half an x-height below it.
 *
 * The x-height is MEASURED, off a `1ex` box in the font the caller's element resolves, rather
 * than taken as a fraction of the em: a test that assumed one would be asserting the
 * stylesheet's own `0.25em` back at itself, and would go on passing if the figure's font
 * changed to one shaped differently.
 */
export function readingLine(host: HTMLElement, bandCentre: number): number {
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;width:1ex;height:1ex;padding:0;border:0";
  host.appendChild(probe);
  const ex = probe.getBoundingClientRect().width;
  probe.remove();
  return bandCentre + ex / 2;
}

/** One KaTeX box's vertical position, in page coordinates. */
export interface KatexPosition {
  /** Where the maths sits: the bottom of the strut, less the expression's own depth. */
  readonly baseline: number;
  /** How far the deepest ink reaches below that baseline, in px. */
  readonly depth: number;
  /** The bottom of the rendered `.katex` box, which is where box alignment lands. */
  readonly bottom: number;
}

/**
 * The baseline of the KaTeX inside `host`, or `null` when there is none to read.
 *
 * `null` rather than a fallback, so a caller counts what it measured: a selector that stopped
 * matching would otherwise be indistinguishable from a row that happened to line up.
 */
export function katexBaseline(host: HTMLElement): KatexPosition | null {
  const katex = host.classList.contains("katex")
    ? host
    : host.querySelector<HTMLElement>(".katex");
  if (katex === null) {
    return null;
  }
  const strut = katex.querySelector<HTMLElement>(".strut");
  if (strut === null) {
    return null;
  }
  const verticalAlign = getComputedStyle(strut).verticalAlign;
  const depth = verticalAlign.endsWith("px") ? -Number.parseFloat(verticalAlign) : 0;
  return {
    baseline: strut.getBoundingClientRect().bottom - depth,
    depth,
    bottom: katex.getBoundingClientRect().bottom,
  };
}
