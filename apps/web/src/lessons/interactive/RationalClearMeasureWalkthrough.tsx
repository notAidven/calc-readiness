/**
 * RAT.6 interactive (Verdigris Hold, the Proving Cauldron): a step-by-step walkthrough of
 * clearing the measures on `3/x + 1/4 = 5/x`. The forbidden dose is read off the ORIGINAL
 * denominators in the SECOND frame, before the multiplication that erases them, because
 * once the fractions are gone the equation no longer remembers what it forbade. The last
 * frame holds the candidate against that list, which is the move the whole node turns on.
 *
 * "Play" runs the frames on a timer (cleaned up on unmount) and becomes "Pause"; the frame
 * controls "Step" and "Back" are held while it runs, so pausing is the way to take the wheel
 * mid-animation. "Step" advances one row for keyboard and test use, "Back" walks one row
 * down, and "Replay" starts over. Gates the
 * lesson once the final frame, the check, is on screen.
 */

import { useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { usePlayingSignal } from "./usePlayingSignal";

interface Frame {
  label: string;
  y: number;
  latex: string;
  color: string;
  fontSize: number;
}

/** Frame 0 is always on screen; frames 1 to 5 appear as the walkthrough advances. */
const ROWS: readonly Frame[] = [
  {
    label: "equation",
    y: 48,
    latex: "\\dfrac{3}{x} + \\dfrac{1}{4} = \\dfrac{5}{x}",
    color: LABEL,
    fontSize: 21,
  },
  { label: "excluded", y: 104, latex: "x \\neq 0", color: BRICK, fontSize: 18 },
  { label: "LCD", y: 142, latex: "4x", color: SIGNAL, fontSize: 18 },
  { label: "cleared", y: 180, latex: "12 + x = 20", color: LABEL, fontSize: 18 },
  { label: "candidate", y: 218, latex: "x = 8", color: LABEL, fontSize: 18 },
  { label: "check", y: 256, latex: "8 \\neq 0", color: CIVIC, fontSize: 18 },
];

const LAST = ROWS.length - 1;
const FRAME_MS = 1100;

export function RationalClearMeasureWalkthrough({
  onComplete,
  onPlayingChange,
}: {
  onComplete?: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (frame >= LAST) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setFrame((current) => current + 1), FRAME_MS);
    return () => clearTimeout(timer);
  }, [playing, frame]);

  useEffect(() => {
    if (frame === LAST && !done) {
      setDone(true);
      onComplete?.();
    }
  }, [frame, done, onComplete]);

  const finished = frame === LAST;

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetBeside
        figure={
          <svg
            viewBox="0 0 440 286"
            role="img"
            aria-label="Clear 3 over x plus 1 over 4 equals 5 over x by multiplying through by 4x, leaving x equals 8, which is not the excluded value 0"
          >
            <title>Clearing denominators in a rational equation</title>
            {ROWS.map((row, index) =>
              index <= frame ? (
                <g key={row.label}>
                  <text x={8} y={row.y + 4} fontSize={12} fill={SOFT}>
                    {row.label}
                  </text>
                  <SvgMath
                    latex={row.latex}
                    x={250}
                    y={row.y}
                    fontSize={row.fontSize}
                    color={row.color}
                    w={340}
                  />
                </g>
              ) : null,
            )}
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__step"
            disabled={frame === 0 || playing}
            onClick={() => setFrame((current) => Math.max(current - 1, 0))}
          >
            Back
          </button>
          <button
            type="button"
            className="lesson-interactive__step"
            disabled={finished}
            onClick={() => setPlaying((current) => !current)}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="lesson-interactive__step"
            disabled={playing || finished}
            onClick={() => setFrame((current) => Math.min(current + 1, LAST))}
          >
            Step
          </button>
          {finished && (
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={() => {
                setPlaying(false);
                setFrame(0);
              }}
            >
              Replay
            </button>
          )}
        </div>

        <p
          className="lesson-interactive__status"
          data-state={finished ? "solved" : "prompt"}
          aria-live="polite"
        >
          {finished ? (
            <>
              <InlineMath latex="8" /> is not an excluded value, so it is a valid solution.
              Notice that the cleared equation had already forgotten{" "}
              <InlineMath latex="x \neq 0" />, which is why the list gets written down
              first.
            </>
          ) : frame === 4 ? (
            "One row left: check that candidate against the excluded value."
          ) : frame === 3 ? (
            "The fractions are gone. Solve the ordinary equation that is left."
          ) : frame === 2 ? (
            "Multiply every term by that LCD and every denominator divides out."
          ) : frame === 1 ? (
            "The list is written. Now find the LCD that both denominators divide into."
          ) : (
            "Two denominators, one unknown. Play or step through, and watch what gets written down first."
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
