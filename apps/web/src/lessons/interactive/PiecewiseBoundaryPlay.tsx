/**
 * FUN.3 slide 2: rule on the break point itself.
 *
 * The two stretches of a piecewise function meet at one input, and the inequality signs are
 * the only thing that says which of them owns it. So this widget asks the learner to make
 * that ruling twice over, in the two forms it takes:
 *
 *  1. WHICH FORMULA produces the value there. "Both rules" is offered as an option and is the
 *     misconception worth meeting head on, because a function that answered twice for one
 *     input would not be a function at all.
 *  2. WHERE THE CLOSED DOT GOES. The two stretches are drawn as parallel tracks over the
 *     inputs, each ending at the break, and the learner sets each endpoint open or closed.
 *     Exactly one of them may be closed, and which one is decided by the sign rather than by
 *     the side.
 *
 * Both rounds of a set are boundary rounds, and within a set one break is owned by the LEFT
 * stretch and the other by the RIGHT, in opposite order between the two sets. So no round can
 * be settled by remembering where the closed dot was last time.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

/* -------------------------------------------------------------------------- */
/* The two-track picture                                                        */
/* -------------------------------------------------------------------------- */

const LEFT_PX = 50;
const RIGHT_PX = 390;
/** Inputs shown either side of the break. */
const REACH = 4;
const TRACK_LEFT_Y = 62;
const TRACK_RIGHT_Y = 108;
const AXIS_Y = 156;
const BREAK_PX = (LEFT_PX + RIGHT_PX) / 2;

/** Where an input sits along the axis, for a window centered on the break. */
function mapInput(value: number, breakAt: number): number {
  return LEFT_PX + ((value - (breakAt - REACH)) / (2 * REACH)) * (RIGHT_PX - LEFT_PX);
}

/* -------------------------------------------------------------------------- */
/* Content                                                                      */
/* -------------------------------------------------------------------------- */

/** Which stretch the break belongs to. */
type Owner = "left" | "right";

interface Round {
  definition: string;
  spoken: string;
  /** The input the two stretches meet at. */
  breakAt: number;
  /** The input's own name, which is not the function's name. */
  variable: string;
  /** The condition on each stretch, as LaTeX and as words. */
  leftCondition: string;
  leftSpoken: string;
  rightCondition: string;
  rightSpoken: string;
  /** The formula on each stretch. */
  leftFormula: string;
  rightFormula: string;
  owner: Owner;
  /** What the owning formula gives at the break, written out and as a value. */
  substitution: string;
  value: number;
  /** What the OTHER formula would have given, which is the value the break does not take. */
  otherValue: number;
  /** The break as it is written in the question, e.g. `f(2)`. */
  askLatex: string;
  /** Why the owning stretch is the one that claims the break. */
  why: ReactNode;
}

const BOARDS: readonly (readonly Round[])[] = [
  [
    {
      definition: "f(x) = \\begin{cases} 3x - 1 & x \\le 2 \\\\ x + 5 & x > 2 \\end{cases}",
      spoken:
        "f of x equals 3x minus 1 when x is at most 2, and x plus 5 when x is above 2",
      breakAt: 2,
      variable: "x",
      leftCondition: "x \\le 2",
      leftSpoken: "x is at most 2",
      rightCondition: "x > 2",
      rightSpoken: "x is above 2",
      leftFormula: "3x - 1",
      rightFormula: "x + 5",
      owner: "left",
      substitution: "3(2) - 1",
      value: 5,
      otherValue: 7,
      askLatex: "f(2)",
      why: (
        <>
          <InlineMath latex="x \le 2" /> is written without the strictness, so it takes in{" "}
          <InlineMath latex="2" /> itself, and <InlineMath latex="x > 2" /> begins past it.
          The left stretch therefore owns the break, and its endpoint is the closed one.
        </>
      ),
    },
    {
      definition: "g(x) = \\begin{cases} 8 - x & x < -3 \\\\ 2x & x \\ge -3 \\end{cases}",
      spoken:
        "g of x equals 8 minus x when x is less than negative 3, and 2x when x is at least negative 3",
      breakAt: -3,
      variable: "x",
      leftCondition: "x < -3",
      leftSpoken: "x is less than negative 3",
      rightCondition: "x \\ge -3",
      rightSpoken: "x is at least negative 3",
      leftFormula: "8 - x",
      rightFormula: "2x",
      owner: "right",
      substitution: "2(-3)",
      value: -6,
      otherValue: 11,
      askLatex: "g(-3)",
      why: (
        <>
          This time the strict sign is on the left: <InlineMath latex="x < -3" /> stops
          short of <InlineMath latex="-3" />, and <InlineMath latex="x \ge -3" /> takes it
          in. So the closed dot has moved to the right stretch, on the same picture.
        </>
      ),
    },
  ],
  [
    {
      definition: "h(t) = \\begin{cases} 4t + 2 & t < 1 \\\\ 9 - t & t \\ge 1 \\end{cases}",
      spoken:
        "h of t equals 4t plus 2 when t is less than 1, and 9 minus t when t is at least 1",
      breakAt: 1,
      variable: "t",
      leftCondition: "t < 1",
      leftSpoken: "t is less than 1",
      rightCondition: "t \\ge 1",
      rightSpoken: "t is at least 1",
      leftFormula: "4t + 2",
      rightFormula: "9 - t",
      owner: "right",
      substitution: "9 - 1",
      value: 8,
      otherValue: 6,
      askLatex: "h(1)",
      why: (
        <>
          <InlineMath latex="t < 1" /> runs up to <InlineMath latex="1" /> without arriving,
          while <InlineMath latex="t \ge 1" /> includes it. The right stretch owns the break
          and takes the closed dot.
        </>
      ),
    },
    {
      definition: "p(t) = \\begin{cases} t + 7 & t \\le -4 \\\\ 3t & t > -4 \\end{cases}",
      spoken:
        "p of t equals t plus 7 when t is at most negative 4, and 3t when t is above negative 4",
      breakAt: -4,
      variable: "t",
      leftCondition: "t \\le -4",
      leftSpoken: "t is at most negative 4",
      rightCondition: "t > -4",
      rightSpoken: "t is above negative 4",
      leftFormula: "t + 7",
      rightFormula: "3t",
      owner: "left",
      substitution: "-4 + 7",
      value: 3,
      otherValue: -12,
      askLatex: "p(-4)",
      why: (
        <>
          <InlineMath latex="t \le -4" /> reaches <InlineMath latex="-4" /> and{" "}
          <InlineMath latex="t > -4" /> starts above it, so the left stretch is the owner
          here even though the break sits well below zero.
        </>
      ),
    },
  ],
];

/** The three calls, in the order they are drawn. All three answer the same question. */
const CALLS = ["The first formula", "The second formula", "Both formulas"] as const;

export function PiecewiseBoundaryPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rounds = BOARDS[variant.index] ?? (BOARDS[0] as readonly Round[]);
  return (
    <PiecewiseBoundaryPlayBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function PiecewiseBoundaryPlayBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  /** 0 = name the formula, 1 = set the two dots, 2 = the round is finished. */
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [missedCall, setMissedCall] = useState<number | null>(null);
  const [leftClosed, setLeftClosed] = useState(false);
  const [rightClosed, setRightClosed] = useState(false);
  const [dotsWrong, setDotsWrong] = useState<"both" | "neither" | "swapped" | null>(null);
  const [callRevealed, setCallRevealed] = useState(false);
  const [dotsRevealed, setDotsRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const lastIndex = rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;
  const ownerIsLeft = round.owner === "left";
  const finished = stage === 2;

  const ownerCondition = ownerIsLeft ? round.leftCondition : round.rightCondition;
  const ownerFormula = ownerIsLeft ? round.leftFormula : round.rightFormula;

  const ticks = Array.from(
    { length: 2 * REACH + 1 },
    (_unused, index) => round.breakAt - REACH + index,
  );

  function advance(next: 1 | 2, earned: boolean) {
    setMissedCall(null);
    setDotsWrong(null);
    setStage(next);
    if (earned) {
      success();
    }
    if (next === 2 && isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function call(at: number) {
    if (stage !== 0) {
      return;
    }
    const right = ownerIsLeft ? 0 : 1;
    if (at === right) {
      advance(1, true);
      return;
    }
    setMissedCall(at);
  }

  function checkDots() {
    if (stage !== 1) {
      return;
    }
    if (leftClosed === ownerIsLeft && rightClosed === !ownerIsLeft) {
      advance(2, true);
      return;
    }
    if (leftClosed && rightClosed) {
      setDotsWrong("both");
      return;
    }
    if (!leftClosed && !rightClosed) {
      setDotsWrong("neither");
      return;
    }
    setDotsWrong("swapped");
  }

  function nextRound() {
    if (roundIndex >= lastIndex) {
      return;
    }
    setRoundIndex(roundIndex + 1);
    setStage(0);
    setMissedCall(null);
    setLeftClosed(false);
    setRightClosed(false);
    setDotsWrong(null);
    setCallRevealed(false);
    setDotsRevealed(false);
  }

  function revealDots() {
    setDotsRevealed(true);
    setLeftClosed(ownerIsLeft);
    setRightClosed(!ownerIsLeft);
    advance(2, false);
  }

  /** Every option renders in the SAME neutral token, so colour never marks the answer. */
  const neutral = { color: LABEL, borderColor: LINE };
  const dotInk = finished ? CIVIC : LABEL;

  let status: ReactNode;
  if (finished) {
    status = (
      <>
        <InlineMath latex={`${round.askLatex} = ${round.substitution} = ${round.value}`} />,
        and the other formula would have given{" "}
        <InlineMath latex={String(round.otherValue)} /> at the same input. Only one of those
        may be the value, which is why only one endpoint is closed.
      </>
    );
  } else if (missedCall === 2) {
    status = (
      <>
        Both cannot be right. One input may have only one value, and these two formulas
        disagree at the break, so the signs have to hand it to exactly one of them.
      </>
    );
  } else if (missedCall !== null) {
    status = (
      <>
        Not that one. Read the two signs at the break: a strict <InlineMath latex="<" /> or{" "}
        <InlineMath latex=">" /> leaves the break to its neighbor, and{" "}
        <InlineMath latex="\le" /> or <InlineMath latex="\ge" /> claims it.
      </>
    );
  } else if (dotsWrong === "both") {
    status =
      "Two closed endpoints would give this input two values at once. Exactly one stretch may claim it.";
  } else if (dotsWrong === "neither") {
    status =
      "With both endpoints open the break belongs to no stretch at all, and then the function has no value there. One of them has to claim it.";
  } else if (dotsWrong === "swapped") {
    status = (
      <>
        The closed dot is on the wrong stretch. The one that claims the break is the stretch
        whose sign includes it, and that is <InlineMath latex={ownerCondition} />.
      </>
    );
  } else if (stage === 0) {
    status = (
      <>
        The break is the one input both conditions are written about. Decide which formula
        is allowed to produce <InlineMath latex={round.askLatex} />.
      </>
    );
  } else {
    status = (
      <>
        <InlineMath latex={ownerCondition} /> is the condition that holds. Now draw that
        ruling: close the endpoint on the stretch that owns the break and leave the other
        one open.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Goal: settle the break point, first by naming the formula that produces{" "}
        <InlineMath latex={round.askLatex} /> and then by closing exactly one of the two
        endpoints on the picture.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={round.definition} color={LABEL} />
      </p>

      <svg viewBox="0 0 440 210" role="img" aria-label={round.spoken}>
        <title>The two stretches of inputs meeting at the break point</title>

        {/* The break, running through both tracks and down to the axis. */}
        <line
          x1={BREAK_PX}
          y1={44}
          x2={BREAK_PX}
          y2={AXIS_Y}
          stroke={LINE}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* The left stretch: inputs below the break, ending at it. */}
        <line
          x1={LEFT_PX}
          y1={TRACK_LEFT_Y}
          x2={BREAK_PX}
          y2={TRACK_LEFT_Y}
          stroke={stage === 0 ? SOFT : dotInk}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          cx={BREAK_PX}
          cy={TRACK_LEFT_Y}
          r={6.5}
          fill={leftClosed ? dotInk : "var(--paper)"}
          stroke={stage === 0 ? SOFT : dotInk}
          strokeWidth={2}
        />
        <SvgMath
          latex={round.leftCondition}
          x={(LEFT_PX + BREAK_PX) / 2}
          y={TRACK_LEFT_Y - 24}
          fontSize={15}
          color={LABEL}
          w={200}
        />

        {/* The right stretch: inputs above the break, starting at it. */}
        <line
          x1={BREAK_PX}
          y1={TRACK_RIGHT_Y}
          x2={RIGHT_PX}
          y2={TRACK_RIGHT_Y}
          stroke={stage === 0 ? SOFT : dotInk}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          cx={BREAK_PX}
          cy={TRACK_RIGHT_Y}
          r={6.5}
          fill={rightClosed ? dotInk : "var(--paper)"}
          stroke={stage === 0 ? SOFT : dotInk}
          strokeWidth={2}
        />
        <SvgMath
          latex={round.rightCondition}
          x={(BREAK_PX + RIGHT_PX) / 2}
          y={TRACK_RIGHT_Y - 24}
          fontSize={15}
          color={LABEL}
          w={200}
        />

        {/* The inputs themselves, as a plain axis. */}
        <line
          x1={LEFT_PX - 8}
          y1={AXIS_Y}
          x2={RIGHT_PX + 8}
          y2={AXIS_Y}
          stroke={SOFT}
          strokeWidth={1.4}
        />
        {ticks.map((tick) => (
          <line
            key={`tick${tick}`}
            x1={mapInput(tick, round.breakAt)}
            y1={AXIS_Y - 4}
            x2={mapInput(tick, round.breakAt)}
            y2={AXIS_Y + 4}
            stroke={SOFT}
            strokeWidth={1}
          />
        ))}
        {ticks.map((tick) => (
          <text
            key={`num${tick}`}
            x={mapInput(tick, round.breakAt)}
            y={AXIS_Y + 18}
            textAnchor="middle"
            fontSize={10}
            fill={SOFT}
          >
            {tick}
          </text>
        ))}
        <SvgMath
          latex={`\\text{break point } ${round.variable} = ${round.breakAt}`}
          x={BREAK_PX}
          y={192}
          fontSize={13}
          color={SIGNAL}
          w={240}
        />
      </svg>

      {finished ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on two different break points
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: another break point
          </button>
        )
      ) : stage === 0 ? (
        <div className="lesson-interactive__controls">
          {CALLS.map((label, at) => (
            <button
              key={label}
              type="button"
              className="lesson-interactive__chip"
              data-state={missedCall === at ? "wrong" : undefined}
              style={neutral}
              aria-label={`${label} produces the value at the break point`}
              onClick={() => call(at)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__chip"
            style={neutral}
            aria-pressed={leftClosed}
            aria-label={`the endpoint on the stretch where ${round.leftSpoken}, currently ${leftClosed ? "closed" : "open"}`}
            onClick={() => {
              setDotsWrong(null);
              setLeftClosed((value) => !value);
            }}
          >
            <InlineMath latex={round.leftCondition} />
            {leftClosed ? ": closed" : ": open"}
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            style={neutral}
            aria-pressed={rightClosed}
            aria-label={`the endpoint on the stretch where ${round.rightSpoken}, currently ${rightClosed ? "closed" : "open"}`}
            onClick={() => {
              setDotsWrong(null);
              setRightClosed((value) => !value);
            }}
          >
            <InlineMath latex={round.rightCondition} />
            {rightClosed ? ": closed" : ": open"}
          </button>
          <button type="button" className="lesson-interactive__check" onClick={checkDots}>
            Check the endpoints
          </button>
        </div>
      )}

      <WidgetReveal
        available={stage === 0 && missedCall !== null}
        revealed={callRevealed}
        answer={<InlineMath latex={ownerFormula} />}
        why={round.why}
        onReveal={() => {
          setCallRevealed(true);
          advance(1, false);
        }}
        label="Reveal which formula owns the break"
        // The endpoints are still to be set at this stage, but it is read off the state
        // rather than asserted, so a stage that has moved on cannot go on claiming work.
        othersRemain={stage !== 2}
      />

      <WidgetReveal
        available={stage === 1 && dotsWrong !== null}
        revealed={dotsRevealed}
        answer={
          <>
            a closed dot on <InlineMath latex={ownerCondition} /> and an open one on the
            other
          </>
        }
        why={round.why}
        onReveal={revealDots}
        label="Reveal where the closed dot goes"
        // Setting the dots closes the round, so what is left after it is explained is the
        // rounds after it. False on the last one, which is the gate.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={
          finished
            ? "solved"
            : missedCall !== null || dotsWrong !== null
              ? "wrong"
              : "prompt"
        }
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
