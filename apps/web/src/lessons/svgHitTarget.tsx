/**
 * A real `<button>` laid over a region of an SVG figure.
 *
 * A drop target drawn as a `<rect>` is a shape, and a shape carrying `role="button"` with a
 * hand-rolled `onKeyDown` is a control re-implemented: it is not focusable in the order a
 * button is, it does not take the platform's activation keys, and it announces itself only as
 * well as the attributes somebody remembered to add. So the shape stays decorative and the
 * control is a button, positioned over it through `foreignObject`.
 *
 * It lives BESIDE `interactive/` rather than inside it, with the other shared widget parts
 * (`widgetTask.tsx`, `widgetPartVerdict.tsx`), because the source sweeps take every file under
 * `interactive/` to be a widget: one that fires no success badge and appears in no registry is
 * a finding there, and a primitive is neither.
 *
 * The button is transparent and borderless, so the figure below it is what the learner sees.
 * `disabled` is spent for the same reason it is spent on a chip tray: a target that is not the
 * open one is not in the tab order at all, rather than focusable and inert.
 *
 * It takes a DRAG as well as a tap, and here rather than at each call site, because the two
 * gestures are one affordance: a board that accepts only the tap looks broken to the learner
 * who picked the chip up. That is what POL.2 and POL.4 were, and neither widget's source was
 * wrong — the platform simply refuses to deliver a `drop` to a target that does not cancel
 * `dragover`. Guarded by `svgHitTargetDrop.browser.test.tsx`, which drives the real gesture.
 */

import { type CSSProperties, type ReactNode, useState } from "react";

import { LABEL } from "./svgKit";
import type { RevealFillProps } from "./widgetMechanics";

/**
 * Transparent, borderless, and CENTERING.
 *
 * Every call site puts something in the middle of a box, so the centering is the container's
 * and not each caller's: written as an opt-in it was taken by two of the five call sites and
 * missed by three, which is how `x + 4` came to sit against the top edge of POL.4's rounded
 * side slot. `lineHeight: 1` is load-bearing beside the flex properties, and this is the
 * reason a wrapper doing the same three properties was not enough: a span holding KaTeX's
 * inline-block is a LINE BOX sized by the font, not by the maths, so centering that box still
 * leaves the glyphs off centre by the font's leading. Guarded by
 * `svgHitTargetCentering.browser.test.tsx`, which measures the ink rather than the wrapper.
 */
const BARE: CSSProperties = {
  width: "100%",
  height: "100%",
  padding: 0,
  margin: 0,
  background: "transparent",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

/**
 * What a target looks like with a chip carried over it.
 *
 * `:hover` does not fire during a native drag, so this state cannot be left to CSS and is held
 * in the component instead. The mark is deliberately hueless: `svgKit` reserves green and red
 * for a verdict on what the learner did (R26), and a target saying "you could let go here" has
 * judged nothing yet. An inset outline and a faint wash of the ink colour say it instead, and
 * the outline is inset so it marks the target rather than painting over the figure's own lines.
 */
const CARRIED: CSSProperties = {
  outline: `2px dashed ${LABEL}`,
  outlineOffset: -2,
  background: `color-mix(in srgb, ${LABEL} 10%, transparent)`,
};

export function SvgHitTarget({
  x,
  y,
  width,
  height,
  label,
  active,
  onPick,
  mark,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The control's whole accessible name: what it is, and what has happened to it. */
  label: string;
  /** False once this target is settled or is not the one in hand. */
  active: boolean;
  onPick: () => void;
  /** The shared reveal-fill attributes, where this target is the one a passage filled. */
  mark?: RevealFillProps;
  /** Anything drawn INSIDE the target, e.g. the value a placement put there. */
  children?: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const carried = active && over;

  return (
    <foreignObject x={x} y={y} width={width} height={height}>
      <button
        type="button"
        disabled={!active}
        aria-label={label}
        data-over={carried ? "yes" : "no"}
        onClick={onPick}
        // A drop is delivered only to a target that CANCELS `dragover`, so a target with no
        // handler here is refused by the platform before any widget code runs: which is why
        // both boards took a tap and ignored a drag until this was added. `dragenter` is
        // cancelled too, so the target is a valid drop zone from the moment the chip arrives
        // rather than from the first move inside it.
        onDragEnter={(e) => {
          if (!active) {
            return;
          }
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => {
          if (!active) {
            return;
          }
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!active) {
            return;
          }
          e.preventDefault();
          setOver(false);
          onPick();
        }}
        style={{
          ...BARE,
          cursor: active ? "pointer" : "default",
          ...(carried ? CARRIED : null),
        }}
        {...mark}
      >
        {children}
      </button>
    </foreignObject>
  );
}
