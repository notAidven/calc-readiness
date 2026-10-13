/**
 * LF.3 interactive (slide 3): the full run, description to model to prediction.
 *
 * Six stages, accumulating on screen rather than replacing one another, so the finished
 * board reads as the whole method: pull the rate, pull the starting value, assemble the
 * model, substitute, and only then ask whether the prediction is one the data can carry.
 * The last stage draws the range the description quotes, with the prediction inside it
 * and a far-out input outside it, which is the difference between an interpolation and
 * an extrapolation made visible.
 *
 * Play auto-advances on a timer, Step advances one stage (keyboard and test fallback),
 * Back walks it in reverse, and Replay restarts. Gates once the final stage is reached.
 * The rental is not used by the CFU or the practice bank.
 */

import { type ReactNode, useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { usePlayingSignal } from "./usePlayingSignal";

/** A van rents for a flat $35 plus $25 a day, quoted for 1 to 10 day rentals. */
const RATE = 25;
const START = 35;
const QUERY = 6;
const PREDICTION = RATE * QUERY + START;
const RANGE_LOW = 1;
const RANGE_HIGH = 10;
const FAR = 20;

const STAGE_LABELS: readonly string[] = [
  "the description",
  "pull out the rate",
  "pull out the starting value",
  "write the model",
  "substitute the input",
  "judge the prediction",
];

const LAST = STAGE_LABELS.length - 1;
const PLAY_MS = 1200;

/** Days to an x coordinate on the range strip. */
const STRIP_X = 60;
const STRIP_W = 340;
function dayX(day: number): number {
  return STRIP_X + (day / FAR) * STRIP_W;
}

const ROW_RATE_Y = 92;
const ROW_START_Y = 122;
const ROW_MODEL_Y = 158;
const ROW_PREDICT_Y = 192;
const STRIP_Y = 228;

export function LinearModelWalkthrough({
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

  function step() {
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
    status = "Press Play or Step to run the description all the way to a prediction.";
  } else if (stage === 1) {
    status = (
      <>
        The words "for each day" mark the rate, so <InlineMath latex="25" /> is measured in
        dollars per day and it multiplies the input.
      </>
    );
  } else if (stage === 2) {
    status = (
      <>
        The flat charge is paid once, however long the rental runs, so it is the bill at{" "}
        <InlineMath latex="x = 0" /> and it is measured in plain dollars.
      </>
    );
  } else if (stage === 3) {
    status = (
      <>
        Rate times input, plus starting value. Notice the model says nothing about{" "}
        <InlineMath latex={`${QUERY}`} /> days yet, it covers every number of days at once.
      </>
    );
  } else if (stage === 4) {
    status = (
      <>
        Substituting <InlineMath latex={`x = ${QUERY}`} /> gives{" "}
        <InlineMath latex={`\\$${PREDICTION}`} />. Multiply before you add, and keep the
        unit: the answer is dollars, not days.
      </>
    );
  } else {
    status = (
      <>
        <InlineMath latex={`${QUERY}`} /> days sits inside the quoted{" "}
        <InlineMath latex={`${RANGE_LOW}`} /> to <InlineMath latex={`${RANGE_HIGH}`} /> day
        range, so this is an interpolation and the model is on solid ground. A{" "}
        <InlineMath latex={`${FAR}`} /> day rental would be an extrapolation: the arithmetic
        still runs, but nothing in the description promises the same rate out there.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <svg
        viewBox="0 0 440 280"
        role="img"
        aria-label="A van rents for a flat 35 dollars plus 25 dollars per day for 1 to 10 days, so the model is y equals 25x plus 35 and a 6 day rental costs 185 dollars, an interpolation"
      >
        <title>From a description to a linear model to a prediction</title>

        <text x={220} y={16} textAnchor="middle" fontSize={11} fill={SOFT}>
          {`step ${stage + 1} of ${STAGE_LABELS.length}: ${STAGE_LABELS[stage] ?? ""}`}
        </text>

        <SvgMath
          latex={`\\text{A van rents for a flat } \\$${START} \\text{, plus } \\$${RATE} \\text{ for each day.}`}
          x={220}
          y={38}
          fontSize={13}
          w={430}
        />
        <SvgMath
          latex={`\\text{Rentals run } ${RANGE_LOW} \\text{ to } ${RANGE_HIGH} \\text{ days. Find the cost of a } ${QUERY} \\text{ day rental.}`}
          x={220}
          y={58}
          fontSize={13}
          w={430}
        />
        <line x1={40} y1={74} x2={400} y2={74} stroke={LINE} strokeWidth={1} />

        {stage >= 1 && (
          <>
            <text x={18} y={ROW_RATE_Y + 4} fontSize={11} fill={SOFT}>
              rate
            </text>
            <SvgMath
              latex={`m = ${RATE} \\text{ dollars per day}`}
              x={250}
              y={ROW_RATE_Y}
              fontSize={16}
              color={SIGNAL}
              w={340}
            />
          </>
        )}

        {stage >= 2 && (
          <>
            <text x={18} y={ROW_START_Y + 4} fontSize={11} fill={SOFT}>
              start
            </text>
            <SvgMath
              latex={`b = ${START} \\text{ dollars, the cost at } x = 0`}
              x={250}
              y={ROW_START_Y}
              fontSize={16}
              color={BRICK}
              w={340}
            />
          </>
        )}

        {stage >= 3 && (
          <>
            <text x={18} y={ROW_MODEL_Y + 4} fontSize={11} fill={SOFT}>
              model
            </text>
            <SvgMath
              latex={`y = ${RATE}x + ${START}`}
              x={250}
              y={ROW_MODEL_Y}
              fontSize={20}
              color={CIVIC}
              w={340}
            />
          </>
        )}

        {stage >= 4 && (
          <>
            <text x={18} y={ROW_PREDICT_Y + 4} fontSize={11} fill={SOFT}>
              predict
            </text>
            <SvgMath
              latex={`y = ${RATE}(${QUERY}) + ${START} = ${PREDICTION}`}
              x={250}
              y={ROW_PREDICT_Y}
              fontSize={17}
              color={LABEL}
              w={340}
            />
          </>
        )}

        {stage >= 5 && (
          <>
            <rect
              x={dayX(RANGE_LOW)}
              y={STRIP_Y - 9}
              width={dayX(RANGE_HIGH) - dayX(RANGE_LOW)}
              height={18}
              rx={5}
              fill={CIVIC}
              fillOpacity={0.18}
            />
            <line
              x1={STRIP_X}
              y1={STRIP_Y}
              x2={STRIP_X + STRIP_W}
              y2={STRIP_Y}
              stroke={LINE}
              strokeWidth={2}
            />
            <circle cx={dayX(QUERY)} cy={STRIP_Y} r={5} fill={CIVIC} />
            <circle cx={dayX(FAR)} cy={STRIP_Y} r={5} fill={BRICK} />
            {[RANGE_LOW, QUERY, RANGE_HIGH, FAR].map((day) => (
              <text
                key={day}
                x={dayX(day)}
                y={STRIP_Y + 22}
                textAnchor="middle"
                fontSize={10}
                fill={SOFT}
              >
                {day}
              </text>
            ))}
            <SvgMath
              latex="\text{inside the quoted range: an interpolation}"
              x={220}
              y={268}
              fontSize={13}
              color={CIVIC}
              w={430}
            />
          </>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {/* Back stays available on the last stage too, so a learner who watched the
            prediction land can walk it back without replaying from the top. */}
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
