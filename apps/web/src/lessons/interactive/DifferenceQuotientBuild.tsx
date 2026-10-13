/**
 * FUN.6 interactive (slide 0): the difference quotient built once over a CONCRETE step,
 * before any algebra.
 *
 * The formula is scaffolded on screen and the blanks ARE the inputs, in the positions the
 * values occupy in the fraction: the later output, the starting output, and the value of the
 * quotient itself. Nothing is symbolic here on purpose. The whole of slide 0 is that this
 * fraction is a comparison of two readings against the gap between them, and a learner who
 * has worked one out in plain numbers meets `f(x + h)` on the next slide knowing what the
 * top of the fraction was for.
 *
 * Each output the learner lands is also drawn into the diagram above, over the input it
 * belongs to, so the picture and the fraction are the same two readings throughout.
 *
 * Three parameter sets rotate on "start over", and none of them is the check's rule or any
 * rule the practice bank asks about symbolically: the quotient here is a number.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  type RevealFilledEntry,
  type RevealFillProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Reading {
  /** The rule as the learner reads it, without the `f(x) =`. */
  ruleTex: string;
  /** The same rule, read aloud. */
  spoken: string;
  at: (x: number) => number;
  /** The input the step starts from, and the size of the step. */
  start: number;
  step: number;
}

/**
 * Three sets, each chosen so both outputs and the quotient itself come out whole: an
 * arithmetic slip is not what this slide is about, so the numbers stay out of the way.
 */
const SETS: readonly Reading[] = [
  { ruleTex: "x^{2}", spoken: "x squared", at: (x) => x * x, start: 3, step: 2 },
  {
    ruleTex: "x^{2} + 4",
    spoken: "x squared plus 4",
    at: (x) => x * x + 4,
    start: 1,
    step: 5,
  },
  { ruleTex: "2x^{2}", spoken: "2 x squared", at: (x) => 2 * x * x, start: 2, step: 3 },
];

/** Where the two inputs sit on the diagram's input line. */
const AXIS_Y = 120;
const START_X = 150;
const END_X = 310;

function readingAt(index: number): Reading {
  return SETS[index] ?? (SETS[0] as Reading);
}

/** A typed integer, or null when the entry is not one. */
function parseInteger(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "");
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : null;
}

/**
 * One blank in the formula, in the position of the value it holds. A row that has not opened
 * yet shows a dashed box with nothing to focus, and a settled one shows its value typeset,
 * keeping the outline so a negative still reads apart from a minus in front of it.
 */
function Slot({
  state,
  value,
  settled,
  aria,
  color,
  given,
  onChange,
  onEnter,
}: {
  state: "locked" | "open" | "done";
  value: string;
  settled: string;
  aria: string;
  color: string;
  given: RevealFilledEntry | RevealFillProps;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (state === "done") {
    return (
      <span className="lesson-equation__slot lesson-equation__slot--done" style={{ color }}>
        <InlineMath latex={settled} />
      </span>
    );
  }
  if (state === "locked") {
    return <span className="lesson-equation__slot lesson-equation__slot--locked" />;
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color }}
      type="text"
      inputMode="numeric"
      value={value}
      aria-label={aria}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
      // Last, so the revealed answer overrides whatever is typed for as long as it is up.
      {...given}
    />
  );
}

/** One stage of the formula: its name, the equation, and the button that grades it. */
function Stage({
  name,
  state,
  onCheck,
  children,
}: {
  name: string;
  state: "locked" | "open" | "done";
  onCheck: () => void;
  children: ReactNode;
}) {
  return (
    <div className="lesson-equation__row" data-state={state}>
      <span className="lesson-equation__stage">{name}</span>
      <span className="lesson-equation__body">{children}</span>
      {state === "open" ? (
        <button type="button" className="lesson-interactive__check" onClick={onCheck}>
          Check
        </button>
      ) : null}
    </div>
  );
}

export function DifferenceQuotientBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(SETS.length, props);
  return (
    <DifferenceQuotientBuildBody
      key={variant.nonce}
      reading={readingAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DifferenceQuotientBuildBody({
  reading,
  onSolved,
  onRestart,
}: {
  reading: Reading;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { ruleTex, spoken, at, start, step } = reading;
  const end = start + step;
  const later = at(end);
  const first = at(start);
  const quotient = (later - first) / step;

  /** 0 the later output, 1 the starting output, 2 the quotient, 3 done. */
  const [stage, setStage] = useState(0);
  const [entry, setEntry] = useState({ later: "", first: "", quotient: "" });
  const [attempted, setAttempted] = useState(false);
  const [revealedStage, setRevealedStage] = useState<number | null>(null);
  /**
   * The stages the learner was GIVEN rather than answered.
   *
   * They are marked in amber rather than green, because green is a verdict on the learner's
   * own action and there was no action to pass one on (R26).
   */
  const [handedOver, setHandedOver] = useState<readonly number[]>([]);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = stage >= 3;

  function stageState(index: number): "locked" | "open" | "done" {
    if (stage > index) {
      return "done";
    }
    return stage === index ? "open" : "locked";
  }

  /** The value the open stage is asking for, and how to say it. */
  const wanted = stage === 0 ? later : stage === 1 ? first : quotient;

  /** Advance past the open stage. `earned` is false when the learner revealed it. */
  function advance(earned: boolean) {
    setFeedback(null);
    setAttempted(false);
    if (earned) {
      success();
    }
    const next = stage + 1;
    setStage(next);
    if (next >= 3) {
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    const raw = stage === 0 ? entry.later : stage === 1 ? entry.first : entry.quotient;
    const typed = parseInteger(raw);
    setAttempted(true);
    if (typed === wanted) {
      advance(true);
      return;
    }
    if (typed === null) {
      setFeedback("Enter a whole number.");
      return;
    }
    if (stage === 2) {
      setFeedback(
        <>
          Not yet. Divide the change in output by the size of the step: the top is{" "}
          <InlineMath latex={`${later} - ${first}`} /> and the bottom is{" "}
          <InlineMath latex={String(step)} />.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not yet. Put the input into the rule in place of every <InlineMath latex="x" />,
        then work it out.
      </>,
    );
  }

  function reveal() {
    const shown = String(wanted);
    setHandedOver((prev) => [...prev, stage]);
    setEntry((prev) =>
      stage === 0
        ? { ...prev, later: shown }
        : stage === 1
          ? { ...prev, first: shown }
          : { ...prev, quotient: shown },
    );
    setRevealedStage(stage);
    advance(false);
  }

  /** An output is drawn into the diagram once it has been settled, and not before. */
  const laterShown = stage > 0;
  const firstShown = stage > 1;

  /** Green for a value the learner produced, amber for one they were handed. */
  const settledColor = (index: number): string =>
    handedOver.includes(index) ? SIGNAL_DEEP : CIVIC;

  /** A slot is ink while it is being answered, and takes its verdict once it settles. */
  const slotColor = (index: number): string =>
    stageState(index) === "done" ? settledColor(index) : LABEL;

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Over a step of <InlineMath latex={`h = ${step}`} /> the output changed by{" "}
        <InlineMath latex={String(later - first)} />, so the difference quotient is{" "}
        <InlineMath latex={String(quotient)} /> per unit of input.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 0) {
    status = (
      <>
        The step ends at <InlineMath latex={String(end)} />, so the later output is{" "}
        <InlineMath latex={`f(${end})`} />.
      </>
    );
  } else if (stage === 1) {
    status = (
      <>
        Now the output the step started from, <InlineMath latex={`f(${start})`} />.
      </>
    );
  } else {
    status = (
      <>
        Last one: the change in output over the size of the step. The bottom of the fraction
        is the step itself, <InlineMath latex={`h = ${step}`} />.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Work out the difference quotient of <InlineMath latex={`f(x) = ${ruleTex}`} /> over
        a step of <InlineMath latex={`h = ${step}`} /> starting at{" "}
        <InlineMath latex={`x = ${start}`} />. You will have the two outputs and the value
        of the fraction they make.
      </WidgetTask>

      <WidgetBeside
        figure={
          <svg
            viewBox="0 0 440 196"
            role="img"
            aria-label={`Two readings of ${spoken}, at input ${start} and at input ${end}, with a step of ${step} between them`}
          >
            <title>Two readings and the step between them</title>

            <line
              x1={40}
              y1={AXIS_Y}
              x2={400}
              y2={AXIS_Y}
              stroke={LINE}
              strokeWidth={1.5}
            />
            {[START_X, END_X].map((x) => (
              <line
                key={`tick${x}`}
                x1={x}
                y1={AXIS_Y - 7}
                x2={x}
                y2={AXIS_Y + 7}
                stroke={SOFT}
                strokeWidth={1.75}
              />
            ))}
            <SvgMath
              latex={String(start)}
              x={START_X}
              y={AXIS_Y + 22}
              fontSize={15}
              color={SOFT}
            />
            <SvgMath
              latex={String(end)}
              x={END_X}
              y={AXIS_Y + 22}
              fontSize={15}
              color={SOFT}
            />

            {/* The step, bracketed under the axis rather than over it, so it never lands on the
            output boxes above. */}
            <line
              x1={START_X}
              y1={AXIS_Y + 36}
              x2={END_X}
              y2={AXIS_Y + 36}
              stroke={SIGNAL}
              strokeWidth={1.5}
            />
            {[START_X, END_X].map((x) => (
              <line
                key={`brace${x}`}
                x1={x}
                y1={AXIS_Y + 28}
                x2={x}
                y2={AXIS_Y + 36}
                stroke={SIGNAL}
                strokeWidth={1.5}
              />
            ))}
            <SvgMath
              latex={`h = ${step}`}
              x={(START_X + END_X) / 2}
              y={AXIS_Y + 56}
              fontSize={15}
              color={SIGNAL}
              w={120}
            />

            {[
              {
                x: START_X,
                label: `f(${start})`,
                value: first,
                shown: firstShown,
                stage: 1,
              },
              { x: END_X, label: `f(${end})`, value: later, shown: laterShown, stage: 0 },
            ].map((box) => (
              <g key={box.label}>
                <SvgMath
                  latex={box.label}
                  x={box.x}
                  y={28}
                  fontSize={14}
                  color={SOFT}
                  w={120}
                />
                <rect
                  x={box.x - 43}
                  y={47}
                  width={86}
                  height={34}
                  rx={6}
                  fill="var(--paper)"
                  stroke={box.shown ? settledColor(box.stage) : LINE}
                  strokeWidth={1.5}
                  strokeDasharray={box.shown ? undefined : "4 4"}
                />
                {box.shown && (
                  <SvgMath
                    latex={String(box.value)}
                    x={box.x}
                    y={64}
                    fontSize={19}
                    color={settledColor(box.stage)}
                    w={90}
                  />
                )}
                <line
                  x1={box.x}
                  y1={83}
                  x2={box.x}
                  y2={AXIS_Y - 9}
                  stroke={SOFT}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              </g>
            ))}
          </svg>
        }
      >
        <div className="lesson-equation">
          <p className="lesson-equation__naming">
            <InlineMath latex={`f(x) = ${ruleTex}`} />{" "}
            {/* The rule and the step are two independent facts, and the row is text flow, so
              nothing separates them unless it is written down: JSX strips the newline between
              two elements entirely and they would read as one statement. The spaces either
              side of the spacer are the break opportunity a narrow column needs. */}
            <span style={{ display: "inline-block", inlineSize: "var(--space-sm)" }} />{" "}
            <InlineMath latex={`h = ${step}`} />
          </p>

          <Stage name="later output" state={stageState(0)} onCheck={check}>
            <InlineMath latex={`f(${end}) =`} />
            <Slot
              state={stageState(0)}
              value={entry.later}
              settled={String(later)}
              aria={`the output at input ${end}`}
              color={slotColor(0)}
              given={stage === 0 ? fill.entry(later) : {}}
              onChange={(next) => setEntry((prev) => ({ ...prev, later: next }))}
              onEnter={check}
            />
          </Stage>

          <Stage name="starting output" state={stageState(1)} onCheck={check}>
            <InlineMath latex={`f(${start}) =`} />
            <Slot
              state={stageState(1)}
              value={entry.first}
              settled={String(first)}
              aria={`the output at input ${start}`}
              color={slotColor(1)}
              given={stage === 1 ? fill.entry(first) : {}}
              onChange={(next) => setEntry((prev) => ({ ...prev, first: next }))}
              onEnter={check}
            />
          </Stage>

          <Stage name="the quotient" state={stageState(2)} onCheck={check}>
            <span className="lesson-equation__frac">
              <span className="lesson-equation__part">
                <InlineMath
                  latex={firstShown ? `${later} - ${first}` : `f(${end}) - f(${start})`}
                />
              </span>
              <span className="lesson-equation__bar" />
              <span className="lesson-equation__part">
                <InlineMath latex={String(step)} />
              </span>
            </span>
            <InlineMath latex="=" />
            <Slot
              state={stageState(2)}
              value={entry.quotient}
              settled={String(quotient)}
              aria="the value of the difference quotient"
              color={slotColor(2)}
              given={stage === 2 ? fill.entry(quotient) : {}}
              onChange={(next) => setEntry((prev) => ({ ...prev, quotient: next }))}
              onEnter={check}
            />
          </Stage>
        </div>

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different rule and step
          </button>
        )}

        <WidgetReveal
          available={attempted && !solved}
          revealed={revealedStage === stage}
          answer={<InlineMath latex={String(wanted)} />}
          why={
            stage === 2 ? (
              <>
                The top of the fraction is the change in output,{" "}
                <InlineMath latex={`${later} - ${first} = ${later - first}`} />, and the
                bottom is the step, <InlineMath latex={String(step)} />. Dividing one by the
                other gives the change per unit of input.
              </>
            ) : (
              <>
                Put the input in place of every <InlineMath latex="x" /> in{" "}
                <InlineMath latex={ruleTex} /> and work it out. That is all{" "}
                <InlineMath latex={`f(${stage === 0 ? end : start})`} /> asks for.
              </>
            )
          }
          onReveal={reveal}
          // Two outputs and then the quotient, so the two earlier rows still owe an answer and
          // the board can be handed back. On the last row it is the gate, so it cannot be.
          othersRemain={stage < 2}
          label="Reveal this value"
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {revealedStage === stage && !solved ? null : status}
        </p>
      </WidgetBeside>
    </div>
  );
}
