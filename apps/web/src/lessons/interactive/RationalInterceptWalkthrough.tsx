/**
 * RAT.5 interactive (slide 2), the two readings the ranging chart hands you for free. A
 * step-by-step walkthrough of P(x) = (x - 6) / (x + 2): the trace crosses zero where the
 * TOP is zero, the reading at x = 0 is P(0), and the bottom's zero is the input the chart
 * cannot plot. Each frame adds one row and one mark on the chart.
 *
 * "Play" runs the frames on a timer (cleaned up on unmount) and becomes "Pause"; the frame
 * controls "Step" and "Back" are held while it runs, so pausing is the way to take the wheel
 * mid-animation. "Step" advances one row for keyboard and test use, "Back" walks one row
 * down, and "Replay" starts over. Gates the
 * lesson once the last frame is on screen. Its recipe is used nowhere else in the node.
 */

import { useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  createGaugePlane,
  GaugeAxes,
  GaugeCurve,
  GaugePoint,
  GaugeTickLabels,
  GaugeVerticalAsymptote,
} from "./RationalGaugePlane";
import { usePlayingSignal } from "./usePlayingSignal";

const PLANE = createGaugePlane({ xMin: -8, xMax: 10, yMin: -8, yMax: 8, bottom: 148 });
const X_TICKS = [-6, -2, 2, 6, 9];
const Y_TICKS = [-6, -3, 3, 6];

const POLE = -2;

function potency(x: number): number {
  return (x - 6) / (x + 2);
}

interface Frame {
  label: string;
  latex: string;
  color: string;
}

const ROWS: readonly Frame[] = [
  { label: "the graph", latex: "P(x) = \\dfrac{x - 6}{x + 2}", color: LABEL },
  {
    label: "x-intercept",
    latex: "x - 6 = 0 \\;\\Longrightarrow\\; (6,\\, 0)",
    color: CIVIC,
  },
  {
    label: "y-intercept",
    latex: "P(0) = \\dfrac{-6}{2} = -3 \\;\\Longrightarrow\\; (0,\\, -3)",
    color: SIGNAL,
  },
  {
    label: "vertical asymptote",
    latex: "x + 2 = 0 \\;\\Longrightarrow\\; x = -2",
    color: BRICK,
  },
];

const LAST = ROWS.length - 1;
const FRAME_MS = 1200;
const ROW_TOP = 174;
const ROW_PITCH = 27;

export function RationalInterceptWalkthrough({
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
        viewBox="0 0 440 272"
        role="img"
        aria-label="The graph of x minus 6 over x plus 2 has an x-intercept at 6, a y-intercept at negative 3, and a vertical asymptote at negative 2."
      >
        <title>x-intercept, y-intercept, and vertical asymptote on one graph</title>

        <GaugeAxes plane={PLANE} xTicks={X_TICKS} yTicks={Y_TICKS} yLatex="P(x)" />
        {frame >= 3 && <GaugeVerticalAsymptote plane={PLANE} x={POLE} />}
        <GaugeCurve plane={PLANE} f={potency} poles={[POLE]} />
        {frame >= 1 && <GaugePoint plane={PLANE} x={6} y={0} color={CIVIC} r={5} />}
        {frame >= 2 && <GaugePoint plane={PLANE} x={0} y={-3} color={SIGNAL} r={5} />}
        <GaugeTickLabels plane={PLANE} xTicks={X_TICKS} yTicks={Y_TICKS} />

        {ROWS.map((row, index) =>
          index <= frame ? (
            <g key={row.label}>
              <text x={6} y={ROW_TOP + index * ROW_PITCH + 4} fontSize={11} fill={SOFT}>
                {row.label}
              </text>
              <SvgMath
                latex={row.latex}
                x={258}
                y={ROW_TOP + index * ROW_PITCH}
                fontSize={15}
                color={row.color}
                w={330}
              />
            </g>
          ) : null,
        )}
      </svg>

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
            The x-intercept is at <InlineMath latex="(6,\, 0)" /> where the numerator is
            zero, and the y-intercept is <InlineMath latex="(0,\, -3)" /> at{" "}
            <InlineMath latex="x = 0" />. The denominator's zero,{" "}
            <InlineMath latex="x = -2" />, is an excluded value with a vertical asymptote.
          </>
        ) : frame === 2 ? (
          "One row left: the denominator's zero gives a vertical asymptote."
        ) : frame === 1 ? (
          <>
            Now substitute <InlineMath latex="x = 0" /> to find the y-intercept on the
            graph.
          </>
        ) : (
          "Play or step through the graph, one feature at a time."
        )}
      </p>
    </div>
  );
}
