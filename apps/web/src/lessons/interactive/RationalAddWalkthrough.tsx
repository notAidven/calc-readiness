/**
 * RAT.3 interactive (Verdigris Hold, the Blending Vat): a step-by-step walkthrough of two
 * ladles pouring into one vat, `1/x + 1/(x + 2)`. Each frame adds one row, ending with the
 * forbidden measures read off the ORIGINAL denominators rather than the combined one,
 * which is the domain-tracking beat this lesson must not let the skin hide.
 *
 * "Play" runs the frames on a timer (cleaned up on unmount) and becomes "Pause"; the frame
 * controls "Step" and "Back" are held while it runs, so pausing is the way to take the wheel
 * mid-animation. "Step" advances one row for keyboard and test use, "Back" walks one row
 * down, and "Replay" starts over. Gates the lesson once the last frame,
 * the forbidden measures, is on screen.
 */

import { useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { usePlayingSignal } from "./usePlayingSignal";

interface Frame {
  label: string;
  y: number;
  latex: string;
  color: string;
}

/** Frame 0 is always on screen; frames 1 to 4 appear as the walkthrough advances. */
const ROWS: readonly Frame[] = [
  { label: "add", y: 42, latex: "\\dfrac{1}{x} + \\dfrac{1}{x + 2}", color: LABEL },
  { label: "LCD", y: 88, latex: "x(x + 2)", color: SIGNAL },
  {
    label: "rewrite",
    y: 138,
    latex: "\\dfrac{x + 2}{x(x + 2)} + \\dfrac{x}{x(x + 2)}",
    color: LABEL,
  },
  { label: "combine", y: 188, latex: "\\dfrac{2x + 2}{x(x + 2)}", color: CIVIC },
  { label: "excluded", y: 232, latex: "x \\neq 0, \\quad x \\neq -2", color: BRICK },
];

const LAST = ROWS.length - 1;
const FRAME_MS = 1100;

export function RationalAddWalkthrough({
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
      <svg
        viewBox="0 0 440 258"
        role="img"
        aria-label="Add one over x and one over x plus 2 over the LCD x times x plus 2"
      >
        <title>Add two fractions over a common denominator</title>
        {ROWS.map((row, index) =>
          index <= frame ? (
            <g key={row.label}>
              <text x={8} y={row.y + 4} fontSize={12} fill={SOFT}>
                {row.label}
              </text>
              <SvgMath
                latex={row.latex}
                x={244}
                y={row.y}
                fontSize={index === 0 ? 20 : 18}
                color={row.color}
                w={360}
              />
            </g>
          ) : null,
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {/* Back stays available on the last frame too, so a learner who watched a pour go by
            can walk it back without replaying from the top. */}
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
            The sum is <InlineMath latex="\dfrac{2x + 2}{x(x + 2)}" />, and the excluded
            values <InlineMath latex="0" /> and <InlineMath latex="-2" /> come from the
            original denominators <InlineMath latex="x" /> and <InlineMath latex="x + 2" />.
          </>
        ) : frame === 3 ? (
          "One row left: state the excluded values from the original denominators."
        ) : frame === 2 ? (
          "Both fractions now share the same denominator, so add the numerators."
        ) : frame === 1 ? (
          "Give each fraction the factor its denominator was missing, numerator and denominator."
        ) : (
          "The two fractions have different denominators. Play or step through the addition."
        )}
      </p>
    </div>
  );
}
