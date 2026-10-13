/**
 * LF.4 interactive (slide 3): one full run, scale to eliminate, solve, back-substitute, and
 * then CHECK, animated a step at a time.
 *
 * The check is the reason the walkthrough runs to six stages rather than four. Every method
 * in this lesson ends with a pair, and a pair that satisfies one equation is not yet a
 * solution, so the last stage puts the numbers back into both originals and shows each side
 * landing on the constant it has to land on.
 *
 * Play auto-advances on a timer, Next advances one stage (keyboard and test fallback), Back
 * walks it in reverse once the run has started, and Replay restarts. Gates once the final
 * stage is reached. This system is not used by the CFU or the practice bank.
 */

import { type ReactNode, useEffect, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { usePlayingSignal } from "./usePlayingSignal";

/** `3x + 4y = 6` and `5x - 2y = -16`, whose solution is `(-2, 3)`. */
const STAGES: readonly { label: string; lines: readonly string[] }[] = [
  { label: "the system as written", lines: ["3x + 4y = 6", "5x - 2y = -16"] },
  {
    label: "multiply the second equation by 2",
    lines: ["3x + 4y = 6", "10x - 4y = -32"],
  },
  {
    label: "add the equations",
    lines: ["3x + 4y = 6", "10x - 4y = -32", "13x = -26"],
  },
  { label: "solve for x", lines: ["13x = -26", "x = -2"] },
  {
    label: "back-substitute into the first equation",
    lines: ["3(-2) + 4y = 6", "4y = 12", "y = 3"],
  },
  {
    label: "check the pair in both originals",
    lines: ["3(-2) + 4(3) = 6", "5(-2) - 2(3) = -16", "(-2, 3)"],
  },
];

const LAST = STAGES.length - 1;
const PLAY_MS = 1300;
const ROW_Y = [60, 100, 140];

function stageAt(index: number): { label: string; lines: readonly string[] } {
  return STAGES[index] ?? (STAGES[0] as { label: string; lines: readonly string[] });
}

export function LinearSystemWalkthrough({
  onComplete,
  onPlayingChange,
}: {
  onComplete?: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  const [fired, setFired] = useState(false);

  const solved = stage >= LAST;
  const current = stageAt(stage);

  // Auto-advance timer: re-scheduled per stage, self-stops at the end, cleaned up on unmount.
  useEffect(() => {
    if (!playing) {
      return;
    }
    if (stage >= LAST) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStage((prev) => Math.min(prev + 1, LAST));
    }, PLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, stage]);

  useEffect(() => {
    if (stage >= LAST && !fired) {
      setFired(true);
      onComplete?.();
    }
  }, [stage, fired, onComplete]);

  function next() {
    setPlaying(false);
    setStage((prev) => Math.min(prev + 1, LAST));
  }

  function back() {
    setPlaying(false);
    setStage((prev) => Math.max(prev - 1, 0));
  }

  function replay() {
    setPlaying(false);
    setStage(0);
  }

  let status: ReactNode;
  if (stage === 0) {
    status = "Press Play or Next to run the elimination step by step.";
  } else if (stage === 1) {
    status = (
      <>
        The <InlineMath latex="y" /> terms are <InlineMath latex="4y" /> and{" "}
        <InlineMath latex="-2y" />, so doubling the second equation turns{" "}
        <InlineMath latex="-2y" /> into <InlineMath latex="-4y" />, the opposite of{" "}
        <InlineMath latex="4y" />.
      </>
    );
  } else if (stage === 2) {
    status = (
      <>
        Adding the two equations, <InlineMath latex="4y + (-4y)" /> is{" "}
        <InlineMath latex="0" />, so the <InlineMath latex="y" /> term is gone and only{" "}
        <InlineMath latex="13x = -26" /> is left.
      </>
    );
  } else if (stage === 3) {
    status = (
      <>
        One variable, one equation: divide both sides by <InlineMath latex="13" />.
      </>
    );
  } else if (stage === 4) {
    status = (
      <>
        Put <InlineMath latex="x = -2" /> back into an original equation to get the partner
        coordinate.
      </>
    );
  } else {
    status = (
      <>
        Checked in both originals, so <InlineMath latex="(-2, 3)" /> is the solution. A slip
        that survives one equation almost never survives the other, which is why the check
        is worth the extra line.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <svg
        viewBox="0 0 440 172"
        role="img"
        aria-label="Scale the second equation, add to remove y, solve for x equals negative 2, back-substitute to y equals 3, and check the pair in both equations"
      >
        <title>Solve a system by elimination, then check the pair</title>

        <text x={220} y={22} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`step ${stage + 1} of ${STAGES.length}: ${current.label}`}
        </text>

        {current.lines.map((line, index) => {
          const isResult = index === current.lines.length - 1 && index > 0;
          return (
            <SvgMath
              key={line}
              latex={line}
              x={220}
              y={ROW_Y[index] ?? 140}
              fontSize={solved ? 19 : 21}
              color={solved ? (isResult ? CIVIC : LABEL) : isResult ? SIGNAL : LABEL}
              w={420}
            />
          );
        })}

        {stage === 2 && (
          <line x1={130} y1={120} x2={310} y2={120} stroke={LINE} strokeWidth={1} />
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {/* Back stays available on the last stage too, so a learner who watched the check go
            by can walk it back without replaying from the top. */}
        <button
          type="button"
          className="lesson-interactive__step"
          onClick={back}
          disabled={stage === 0 || playing}
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
              onClick={next}
              disabled={playing}
            >
              Next
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
