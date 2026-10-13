import type { ReactElement } from "react";

import { previewOf } from "./mathPreviewParser";
import { InlineMath } from "./svgKit";

/**
 * The live typeset reading of what the learner has typed, under the field.
 *
 * A keypad makes `^` and `/` reachable; it does not make a fraction LOOK like a fraction,
 * and that was the actual complaint. This does: `1/x^2` in the field draws a stacked
 * numerator over a denominator underneath it, through the KaTeX that is already in the
 * bundle and already paying for its fonts.
 *
 * ## One-directional, and never a verdict
 *
 * ASCII in, LaTeX out, and no path back. {@link previewOf} is a pure function of the
 * field's value and its result is drawn and then discarded; the value itself goes to
 * `checkAnswer` untouched. This is the direction `ExprBuilderInput` already proves out,
 * where the widget renders `\sqrt[4]{x^{3}}` through the host typesetter while handing
 * the comparator a structured payload the LaTeX never enters.
 *
 * It is also not feedback. A drawn preview says the reader could READ what you wrote, not
 * that it is right, and an undrawn one says only that there is nothing safe to draw yet:
 * either the field is empty, or it carries a character the checker's grammar has no
 * reading for (`√`, a LaTeX backslash, a brace). Nothing here ever says "wrong", because
 * the Check button owns that and a second opinion beside it would be read as one.
 *
 * ## Accessibility
 *
 * The typeset copy is `aria-hidden`, and a `aria-live="polite"` region beside it carries
 * the same content in words. That is the house pattern, and it is deliberately not the
 * naive one: `InlineMath` emits MathML alongside the visual layer, so exposing it would
 * technically be readable, but typeset math markup reads badly aloud and the point of the
 * live region is that we author the spoken string and a test pins it.
 * `ExprBuilderInput.browser.test.tsx` pins both halves of the same pattern for the
 * widget — the region contains `x^3` AND `x to the 3` — and this one is pinned the same
 * way, so a screen-reader user hears "Your answer: 1/x^2, read as 1 over x to the 2."
 */
export function MathPreview({ value }: { value: string }): ReactElement {
  const trimmed = value.trim();
  const preview = previewOf(trimmed);

  return (
    <div className="cr-math-preview" data-empty={preview === null}>
      <span className="micro-label" aria-hidden="true">
        Preview
      </span>
      <span className="cr-math-preview__typeset" aria-hidden="true">
        {preview ? <InlineMath latex={preview.latex} /> : null}
      </span>
      <p className="cr-math-preview__spoken visually-hidden" aria-live="polite">
        {preview
          ? `Your answer: ${trimmed}, read as ${preview.spoken}.`
          : "Nothing to preview yet."}
      </p>
    </div>
  );
}
