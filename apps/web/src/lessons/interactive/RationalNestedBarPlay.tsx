/**
 * RAT.4 interactive (Verdigris Hold, the Master-Recipe Board): find the bar that actually
 * divides. A complex fraction carries three bars, and the whole node depends on reading the
 * LONG middle one as the division that holds the two recipes apart, so the learner rules on
 * which bar that is before any algebra starts.
 *
 * The stack is drawn bar by bar rather than handed to KaTeX as one nested `\dfrac`, so each
 * bar is a real line the widget can highlight when it is picked. Picking a short bar says
 * why it is only an inner measure; picking the main bar reveals the same board written as a
 * division and gates the lesson.
 *
 * The learner clicks the BAR, not a button naming it: reading which line divides is the whole
 * skill, and a chip row labelled "Main bar" lets it be answered without ever looking at the
 * expression. Each bar therefore carries a real `<button>` in a `foreignObject` sized to it,
 * the same in-diagram click target `LinearLineGraphPlay` uses for its lattice points, so the
 * widget stays tab-navigable and screen-reader operable. Hovering or tabbing to a bar lights
 * it and its hit box, since a bare rule gives no sign it can be clicked.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

interface Bar {
  id: "top" | "main" | "bottom";
  spoken: string;
  x1: number;
  x2: number;
  y: number;
  /** Shown when this bar is picked and it is not the main one. */
  because: string;
}

const BARS: readonly Bar[] = [
  {
    id: "top",
    spoken: "the short bar inside the top fraction",
    x1: 194,
    x2: 246,
    y: 58,
    because:
      "That bar only divides inside the top fraction. Look for the one that separates the whole numerator from the whole denominator.",
  },
  {
    id: "main",
    spoken: "the long bar across the middle of the expression",
    x1: 138,
    x2: 302,
    y: 114,
    because: "",
  },
  {
    id: "bottom",
    spoken: "the short bar inside the bottom fraction",
    x1: 198,
    x2: 242,
    y: 168,
    because:
      "That bar only divides inside the bottom fraction. The bar you want has a whole fraction above it and a whole fraction below it.",
  },
];

/* The click target around each bar. The two short bars are only ~50 units wide, which is a
   thin thing to hit, so the box is padded outward; 28 units of height still leaves a clear
   gap between bars sitting 54 units apart. */
const HIT_PAD_X = 12;
const HIT_H = 28;

const DIVISION = "\\dfrac{2}{x - 5} \\div \\dfrac{7}{x}";

export function RationalNestedBarPlay({ onComplete }: { onComplete?: () => void }) {
  const [picked, setPicked] = useState<Bar["id"] | null>(null);
  const [hovered, setHovered] = useState<Bar["id"] | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();

  const solved = picked === "main";
  const wrong = picked !== null && picked !== "main";
  // Read through `solved` rather than clearing on pick: the winning click disables the
  // buttons, and a disabled button never fires its leave event, so the raw state sticks.
  const hoverId = solved ? null : hovered;

  function pick(bar: Bar) {
    if (solved) {
      return;
    }
    setPicked(bar.id);
    if (bar.id === "main" && !done) {
      setDone(true);
      success();
      onComplete?.();
    }
  }

  // Guarded so a leave that arrives after the pointer has already reached the next bar
  // cannot wipe out that bar's highlight.
  function clearHover(id: Bar["id"]) {
    setHovered((current) => (current === id ? null : current));
  }

  function barColor(bar: Bar): string {
    if (picked === bar.id) {
      return bar.id === "main" ? CIVIC : BRICK;
    }
    // SIGNAL cannot be mistaken for a verdict: CIVIC marks the right bar, BRICK a wrong one.
    return hoverId === bar.id ? SIGNAL : LINE;
  }

  function barWidth(bar: Bar): number {
    const base = bar.id === "main" ? 3.5 : 2;
    return hoverId === bar.id ? base + 1.5 : base;
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      {/* No `role="img"`: an `img` subtree is presentational, which would hide the bar
          buttons inside it from assistive tech. The `<title>` and the label describe it. */}
      <svg
        viewBox="0 0 440 270"
        aria-label="A complex fraction: 2 over x minus 5, stacked over 7 over x"
      >
        <title>Which bar divides the whole numerator by the whole denominator?</title>

        <SvgMath latex="2" x={220} y={38} fontSize={18} color={LABEL} w={120} />
        <SvgMath latex="x - 5" x={220} y={80} fontSize={18} color={LABEL} w={140} />
        <SvgMath latex="7" x={220} y={148} fontSize={18} color={LABEL} w={120} />
        <SvgMath latex="x" x={220} y={190} fontSize={18} color={LABEL} w={120} />

        {/* The band under the hovered bar shows the whole click target, which is wider and
            far taller than the rule the learner is aiming at. */}
        {BARS.filter((bar) => bar.id === hoverId).map((bar) => (
          <rect
            key={`band-${bar.id}`}
            x={bar.x1 - HIT_PAD_X}
            y={bar.y - HIT_H / 2}
            width={bar.x2 - bar.x1 + 2 * HIT_PAD_X}
            height={HIT_H}
            rx={6}
            fill={SIGNAL}
            opacity={0.12}
          />
        ))}

        {BARS.map((bar) => (
          <line
            key={bar.id}
            x1={bar.x1}
            y1={bar.y}
            x2={bar.x2}
            y2={bar.y}
            stroke={barColor(bar)}
            strokeWidth={barWidth(bar)}
            strokeLinecap="round"
          />
        ))}

        {solved && (
          <>
            <text x={8} y={240} fontSize={12} fill={SOFT} dominantBaseline="middle">
              read as
            </text>
            <SvgMath latex={DIVISION} x={244} y={240} fontSize={18} color={CIVIC} w={330} />
          </>
        )}

        {/* Click targets last, so no label painted above can swallow a click. */}
        {BARS.map((bar) => (
          <foreignObject
            key={`hit-${bar.id}`}
            x={bar.x1 - HIT_PAD_X}
            y={bar.y - HIT_H / 2}
            width={bar.x2 - bar.x1 + 2 * HIT_PAD_X}
            height={HIT_H}
          >
            <button
              type="button"
              aria-label={`pick ${bar.spoken}`}
              disabled={solved}
              onClick={() => pick(bar)}
              onPointerEnter={() => setHovered(bar.id)}
              onPointerLeave={() => clearHover(bar.id)}
              onFocus={() => setHovered(bar.id)}
              onBlur={() => clearHover(bar.id)}
              style={{
                width: "100%",
                height: "100%",
                padding: 0,
                border: "none",
                borderRadius: 6,
                background: "transparent",
                cursor: solved ? "default" : "pointer",
              }}
            />
          </foreignObject>
        ))}
      </svg>

      {solved && (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__reset"
            onClick={() => setPicked(null)}
          >
            Start over
          </button>
        </div>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : wrong ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            That long bar is a division sign. The expression reads{" "}
            <InlineMath latex="\dfrac{2}{x - 5}" /> divided by{" "}
            <InlineMath latex="\dfrac{7}{x}" />, and the short bars are just the inner
            fraction lines.
          </>
        ) : wrong ? (
          (BARS.find((bar) => bar.id === picked)?.because ?? "")
        ) : (
          "This complex fraction has multiple fraction bars. Click the one that divides the whole numerator by the whole denominator."
        )}
      </p>
    </div>
  );
}
