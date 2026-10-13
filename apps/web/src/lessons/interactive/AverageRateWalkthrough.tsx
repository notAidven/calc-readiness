/**
 * FUN.5 interactive (slide 1): the average rate of change of a function given by a rule.
 *
 * Play and Step walk the two evaluations out on the curve, one endpoint at a time, and then
 * draw the two legs the fraction is built from. The walk STOPS there: both legs are labelled
 * with a question mark, so pressing Play from start to finish produces nothing at all. The
 * learner supplies the change in the output first and the rate second, which is the whole of
 * what the board asks and the whole of what opens the gate.
 *
 * Two answers rather than one, deliberately: the subtraction and the division are different
 * steps and the first is where a sign is lost, so a reveal on the subtraction hands the board
 * back with the division still to do.
 *
 * All three rules keep their outputs positive over the window, because the coordinate plane
 * is not a prerequisite here and a curve dipping under an axis would be teaching a second
 * thing. One rule falls across its window, so the negative rate is met rather than described.
 */

import { type ReactNode, useEffect, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";
import { usePlayingSignal } from "./usePlayingSignal";

interface Rule {
  /** The rule as the learner reads it. */
  latex: string;
  /** The same rule, read aloud, for the accessible description. */
  spoken: string;
  at: (x: number) => number;
  from: number;
  to: number;
  /** The widest input the curve is drawn over. */
  window: number;
}

const RULES: readonly Rule[] = [
  {
    latex: "f(x) = x^{2} + 2",
    spoken: "f of x equals x squared plus 2",
    at: (x) => x * x + 2,
    from: 1,
    to: 5,
    window: 6,
  },
  {
    // Falling across its window, so the rate comes out negative.
    latex: "f(x) = 30 - x^{2}",
    spoken: "f of x equals 30 minus x squared",
    at: (x) => 30 - x * x,
    from: 1,
    to: 4,
    window: 5,
  },
  {
    latex: "f(x) = x^{2} - 3x + 6",
    spoken: "f of x equals x squared minus 3 x plus 6",
    at: (x) => x * x - 3 * x + 6,
    from: 1,
    to: 5,
    window: 6,
  },
];

const LEFT = 54;
const RIGHT = 420;
const TOP = 16;
const BOTTOM = 176;
const LABEL_SIZE = 13;
/** The tick numbers' row, and the row both axis captions read on. */
const AXIS_CAPTION = BOTTOM + 16;
/** The rule's own band, below everything the axis says. */
const RULE_LINE = 208;
const PLAY_MS = 750;
/** Plot the endpoints, then the two legs. Nothing auto-advances past that. */
const STEPS = 3;

function ruleAt(index: number): Rule {
  return RULES[index] ?? (RULES[0] as Rule);
}

function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

export function AverageRateWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(RULES.length, props);
  return (
    <AverageRateWalkthroughBody
      key={variant.nonce}
      rule={ruleAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function AverageRateWalkthroughBody({
  rule,
  onSolved,
  onRestart,
  onPlayingChange,
}: {
  rule: Rule;
  onSolved: () => void;
  onRestart: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  /** 0 the change in the output, 1 the rate, 2 done. */
  const [stage, setStage] = useState(0);
  const [changeEntry, setChangeEntry] = useState("");
  const [rateEntry, setRateEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const left = rule.at(rule.from);
  const right = rule.at(rule.to);
  const change = right - left;
  const span = rule.to - rule.from;
  const rate = change / span;
  const landed = stepIdx >= STEPS;
  const solved = stage >= 2;

  const outputs = [rule.at(0), rule.at(rule.window), left, right];
  const yMax = Math.ceil((Math.max(...outputs) + 1) / 10) * 10;

  const mapX = (x: number): number => LEFT + (x / rule.window) * (RIGHT - LEFT);
  const mapY = (y: number): number => BOTTOM - (y / yMax) * (BOTTOM - TOP);

  const frame = plotLabelFrame({ left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM }, 8);

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (stepIdx >= STEPS) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStepIdx((prev) => Math.min(prev + 1, STEPS));
    }, PLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, stepIdx]);

  function step() {
    setPlaying(false);
    setStepIdx((prev) => Math.min(prev + 1, STEPS));
  }

  function replay() {
    setPlaying(false);
    setStepIdx(0);
  }

  function checkChange() {
    setAttempted(true);
    // A fresh attempt: the reveal steps aside so it can be offered for the step in hand.
    setRevealed(false);
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to a note about subtracting the outputs, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(changeEntry, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === change) {
      setFeedback(null);
      setStage(1);
      success();
      return;
    }
    setFeedback(
      <>
        Not yet. Take the output at the right end and subtract the output at the left end,
        in that order, and keep whatever sign that gives.
      </>,
    );
  }

  function checkRate() {
    setAttempted(true);
    setRevealed(false);
    const read = readNumericEntry(rateEntry, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === rate) {
      setFeedback(null);
      setStage(2);
      success();
      onSolved();
      return;
    }
    setFeedback(
      <>
        Not yet. The inputs run from <InlineMath latex={String(rule.from)} /> to{" "}
        <InlineMath latex={String(rule.to)} />, so divide the change in the output by{" "}
        <InlineMath latex={String(span)} />.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    if (stage === 0) {
      setChangeEntry(String(change));
      setStage(1);
      return;
    }
    setRateEntry(String(rate));
    setStage(2);
    onSolved();
  }

  const curve: string[] = [];
  for (let x = 0; x <= rule.window + 1e-9; x += 0.2) {
    const y = rule.at(x);
    if (y >= 0 && y <= yMax) {
      curve.push(`${mapX(x)},${mapY(y)}`);
    }
  }

  const leftLabel = labelSpot({
    x: mapX(rule.from),
    y: mapY(left),
    frame,
    dx: -1,
    dy: change > 0 ? 1 : -1,
    halfW: labelHalfW(`f(${rule.from}) = ${left}`, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
  });
  const rightLabel = labelSpot({
    x: mapX(rule.to),
    y: mapY(right),
    frame,
    dx: -1,
    dy: change > 0 ? -1 : 1,
    halfW: labelHalfW(`f(${rule.to}) = ${right}`, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 12,
    avoid: [leftLabel] as readonly LabelBox[],
  });
  const risenLatex = stage >= 1 ? String(change) : "?";
  const runLatex = String(span);
  const riseLabel = labelSpot({
    x: mapX(rule.to),
    y: (mapY(left) + mapY(right)) / 2,
    frame,
    dx: 1,
    dy: 0,
    halfW: labelHalfW(risenLatex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [leftLabel, rightLabel] as readonly LabelBox[],
  });
  const runLabel = labelSpot({
    x: (mapX(rule.from) + mapX(rule.to)) / 2,
    y: mapY(left),
    frame,
    dx: 0,
    dy: change > 0 ? 1 : -1,
    halfW: labelHalfW(runLatex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [leftLabel, rightLabel, riseLabel] as readonly LabelBox[],
  });

  const xTicks: number[] = [];
  for (let x = 1; x < rule.window; x += 1) {
    xTicks.push(x);
  }
  const yTicks: number[] = [];
  for (let y = 10; y < yMax; y += 10) {
    yTicks.push(y);
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        The output changed by <InlineMath latex={String(change)} /> while the input moved{" "}
        <InlineMath latex={String(span)} />, so the average rate of change is{" "}
        <InlineMath latex={`\\dfrac{${change}}{${span}} = ${rate}`} />.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 1) {
    status = (
      <>
        The change in the output is in. Now spread it over the inputs the interval covers.
      </>
    );
  } else if (landed) {
    status = (
      <>
        Both ends are evaluated and the two legs are drawn. Work out the change in the
        output.
      </>
    );
  } else if (stepIdx === 0) {
    status = (
      <>Only the ends of the interval are used. Press Play or Step to evaluate them.</>
    );
  } else if (stepIdx === 1) {
    status = (
      <>
        Left end evaluated: <InlineMath latex={`f(${rule.from}) = ${left}`} />.
      </>
    );
  } else {
    status = (
      <>
        Right end evaluated: <InlineMath latex={`f(${rule.to}) = ${right}`} />.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Goal: the average rate of change of this rule from the left end of the interval to
        the right end.
      </WidgetTask>

      <svg
        viewBox="0 0 440 226"
        role="img"
        aria-label={`The curve of ${rule.spoken}, evaluated at ${spoken(rule.from)} and at ${spoken(rule.to)}`}
      >
        <title>Average rate of change of a function given by a rule</title>

        <rect
          data-plot-frame=""
          x={LEFT}
          y={TOP}
          width={RIGHT - LEFT}
          height={BOTTOM - TOP}
          rx={6}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
        />
        {yTicks.map((value) => (
          <line
            key={`grid-${value}`}
            x1={LEFT}
            y1={mapY(value)}
            x2={RIGHT}
            y2={mapY(value)}
            stroke={LINE}
            strokeWidth={0.75}
            opacity={0.6}
          />
        ))}
        {xTicks.map((value) => (
          <line
            key={`vgrid-${value}`}
            x1={mapX(value)}
            y1={TOP}
            x2={mapX(value)}
            y2={BOTTOM}
            stroke={LINE}
            strokeWidth={0.5}
            opacity={0.45}
          />
        ))}

        <polyline
          points={curve.join(" ")}
          fill="none"
          stroke={SOFT}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {stepIdx >= 1 && (
          <>
            <circle cx={mapX(rule.from)} cy={mapY(left)} r={5.5} fill={SIGNAL} />
            <PlotLabel
              box={leftLabel}
              latex={`f(${rule.from}) = ${left}`}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />
          </>
        )}
        {stepIdx >= 2 && (
          <>
            <circle cx={mapX(rule.to)} cy={mapY(right)} r={5.5} fill={SIGNAL} />
            <PlotLabel
              box={rightLabel}
              latex={`f(${rule.to}) = ${right}`}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />
          </>
        )}
        {stepIdx >= STEPS && (
          <>
            <line
              x1={mapX(rule.from)}
              y1={mapY(left)}
              x2={mapX(rule.to)}
              y2={mapY(left)}
              stroke={CIVIC}
              strokeWidth={2}
            />
            <line
              x1={mapX(rule.to)}
              y1={mapY(left)}
              x2={mapX(rule.to)}
              y2={mapY(right)}
              stroke={BRICK}
              strokeWidth={2}
            />
            <PlotLabel
              box={runLabel}
              latex={runLatex}
              fontSize={LABEL_SIZE}
              color={CIVIC}
            />
            <PlotLabel
              box={riseLabel}
              latex={risenLatex}
              fontSize={LABEL_SIZE}
              color={BRICK}
            />
          </>
        )}

        {xTicks.map((value) => (
          <text
            key={`xtick-${value}`}
            x={mapX(value)}
            y={AXIS_CAPTION}
            textAnchor="middle"
            fontSize={10}
            fill={value === rule.from || value === rule.to ? LABEL : SOFT}
          >
            {value}
          </text>
        ))}
        {yTicks.map((value) => (
          <text
            key={`ytick-${value}`}
            x={LEFT - 8}
            y={mapY(value) + 3.5}
            textAnchor="end"
            fontSize={10}
            fill={SOFT}
          >
            {value}
          </text>
        ))}
        {/*
          Both axis captions sit at the END of the axis they name, which is what keeps the
          band under the plot free for the rule.

          "input" used to be centred at `BOTTOM + 34`, which is 210, directly on top of the
          rule below: the rule's box is centred on 208, so the caption was painted through
          the middle of the expression rather than beside it. Moved to the far end of the
          input axis it now matches "output", which has always sat at the top of the axis it
          names rather than centred along it.
        */}
        <text x={RIGHT} y={AXIS_CAPTION} textAnchor="end" fontSize={11} fill={SOFT}>
          input
        </text>
        <text x={LEFT - 8} y={TOP - 4} textAnchor="end" fontSize={11} fill={SOFT}>
          output
        </text>

        {/*
          `h` is given because the default is `fontSize * 3`, which puts a 48-unit box around
          a 16-unit expression: centred on 208 that box runs to 232, six units past the
          bottom of a 226-unit viewBox, and an SVG clips at its own frame.
        */}
        <SvgMath
          latex={rule.latex}
          x={(LEFT + RIGHT) / 2}
          y={RULE_LINE}
          fontSize={16}
          w={300}
          h={34}
        />
      </svg>

      <div className="lesson-interactive__controls">
        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different rule
          </button>
        ) : landed ? (
          <>
            <div
              className="lesson-interactive__field"
              style={{ color: stage === 0 ? BRICK : CIVIC }}
            >
              <span className="lesson-interactive__field-label">
                <InlineMath
                  latex={
                    stage === 0
                      ? `f(${rule.to}) - f(${rule.from}) =`
                      : `\\dfrac{${change}}{${span}} =`
                  }
                />
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={stage === 0 ? changeEntry : rateEntry}
                aria-label={
                  stage === 0
                    ? "the change in the output between the two ends"
                    : "the average rate of change"
                }
                onChange={(event) => {
                  if (stage === 0) {
                    setChangeEntry(event.target.value);
                  } else {
                    setRateEntry(event.target.value);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (stage === 0) {
                      checkChange();
                    } else {
                      checkRate();
                    }
                  }
                }}
                {...fill.entry(stage === 0 ? change : rate)}
              />
            </div>
            <button
              type="button"
              className="lesson-interactive__check"
              onClick={stage === 0 ? checkChange : checkRate}
            >
              Check
            </button>
            <button type="button" className="lesson-interactive__step" onClick={replay}>
              Replay
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={() => setPlaying((value) => !value)}
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

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={stage === 0 ? String(change) : String(rate)} />}
        why={
          stage === 0 ? (
            <>
              The rule gives <InlineMath latex={`f(${rule.from}) = ${left}`} /> and{" "}
              <InlineMath latex={`f(${rule.to}) = ${right}`} />, and the change runs from
              the left end to the right end, so it is{" "}
              <InlineMath latex={`${right} - ${left} = ${change}`} />. The output ends{" "}
              {change < 0 ? "below" : "above"} where it started, which is what fixes the
              sign.
            </>
          ) : (
            <>
              The input moves from <InlineMath latex={String(rule.from)} /> to{" "}
              <InlineMath latex={String(rule.to)} />, which is{" "}
              <InlineMath latex={String(span)} />, and the output moves{" "}
              <InlineMath latex={String(change)} /> across it. Sharing that change out over
              the interval gives{" "}
              <InlineMath latex={`\\dfrac{${change}}{${span}} = ${rate}`} /> for each unit
              of input, whatever the curve did in between.
            </>
          )
        }
        onReveal={reveal}
        // The division is still outstanding while the subtraction is being explained.
        othersRemain={stage === 0}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : status}
      </p>
    </div>
  );
}
