/**
 * RAT.2 interactive (slide 3): a step-by-step animated walkthrough of one division,
 * (x + 5)/(x - 3) divided by (x + 5)/(x + 2). Frame 1 flips the divisor and turns the
 * division into a multiplication, frame 2 marks the factor that now sits above and below
 * the bar, frame 3 lands on the quotient. Play auto-advances on a timer, Step advances one
 * frame (keyboard and test fallback), Replay restarts. Gates once the quotient is reached.
 *
 * Themed as pouring one cauldron into vials at the Scaling Table. Its numbers appear
 * nowhere else in the lesson, so the CFU is still a fresh instance.
 */

import { type ReactNode, useEffect, useState } from "react";

import { CIVIC, InlineMath, LABEL, SOFT, SvgMath } from "../svgKit";
import { usePlayingSignal } from "./usePlayingSignal";

const QUOTIENT = "\\dfrac{x + 5}{x - 3} \\div \\dfrac{x + 5}{x + 2}";
const FLIPPED = "= \\dfrac{x + 5}{x - 3} \\times \\dfrac{x + 2}{x + 5}";
const RESULT = "= \\dfrac{x + 2}{x - 3}";

/** Frame 0 shows the division; frames 1 to 3 flip, mark the shared factor, then land. */
const TOTAL = 3;
const PLAY_MS = 1100;

export function RationalReciprocalWalkthrough({
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

  const solved = frame >= TOTAL;

  // Auto-advance timer: re-scheduled per frame, self-stops at the end, cleaned up on unmount.
  useEffect(() => {
    if (!playing) {
      return;
    }
    if (frame >= TOTAL) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setFrame((prev) => Math.min(prev + 1, TOTAL));
    }, PLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, frame]);

  useEffect(() => {
    if (frame >= TOTAL && !done) {
      setDone(true);
      onComplete?.();
    }
  }, [frame, done, onComplete]);

  function step() {
    setPlaying(false);
    setFrame((prev) => Math.min(prev + 1, TOTAL));
  }

  function back() {
    setPlaying(false);
    setFrame((prev) => Math.max(prev - 1, 0));
  }

  function replay() {
    setPlaying(false);
    setFrame(0);
  }

  let status: ReactNode;
  if (frame === 0) {
    status = "Press Play or Step to run the division one move at a time.";
  } else if (frame === 1) {
    status = (
      <>
        Flip the divisor: dividing by <InlineMath latex="\dfrac{x + 5}{x + 2}" /> is
        multiplying by <InlineMath latex="\dfrac{x + 2}{x + 5}" />.
      </>
    );
  } else if (frame === 2) {
    status = (
      <>
        Now it is an ordinary product, and <InlineMath latex="x + 5" /> sits above the bar
        and below it.
      </>
    );
  } else {
    status = (
      <>
        Each quotient is <InlineMath latex="\dfrac{x + 2}{x - 3}" />. Flip, then cancel: no
        other rule changed.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <svg
        viewBox="0 0 440 210"
        role="img"
        aria-label="x plus 5 over x minus 3 divided by x plus 5 over x plus 2 becomes x plus 2 over x minus 3"
      >
        <title>Divide by multiplying by the reciprocal</title>

        <SvgMath latex={QUOTIENT} x={220} y={34} fontSize={20} color={LABEL} h={80} />

        {frame >= 1 && (
          <SvgMath
            latex={FLIPPED}
            x={220}
            y={100}
            fontSize={20}
            color={frame >= 2 ? LABEL : CIVIC}
            h={80}
          />
        )}

        {frame >= 2 && (
          <text x={220} y={148} textAnchor="middle" fontSize={13} fill={SOFT}>
            the shared factor divides out, top and bottom
          </text>
        )}

        {frame >= 3 && (
          <SvgMath latex={RESULT} x={220} y={182} fontSize={20} color={CIVIC} h={70} />
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {/* Back stays available on the last frame too, so a learner who watched the cancel
            go by can walk it back without replaying from the top. */}
        <button
          type="button"
          className="lesson-interactive__step"
          onClick={back}
          disabled={frame === 0 || playing}
        >
          Back
        </button>
        {solved ? (
          <button type="button" className="lesson-interactive__step" onClick={replay}>
            Replay
          </button>
        ) : (
          <>
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={() => setPlaying((prev) => !prev)}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={step}
              disabled={playing}
            >
              Step
            </button>
          </>
        )}
      </div>

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
