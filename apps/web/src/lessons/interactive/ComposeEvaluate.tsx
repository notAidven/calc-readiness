/**
 * FUN.7 interactive (slide 2): evaluate $(f \circ g)(n)$ one stage at a time.
 *
 * The circle notation is the whole difficulty of this slide, and it is a reading problem
 * rather than an arithmetic one: the function written FIRST is the one that acts LAST. So
 * the widget refuses to take the finished value. It asks for the inner value on its own,
 * and only then opens the outer box, which makes the handover a thing the learner has
 * written down rather than a step they can skip past.
 *
 * The two misses that are worth naming are named. Typing $f(n)$ into the inner box is
 * reading the notation left to right, and typing $f(n)$ into the outer box is using the
 * original input twice; both are answered with the number the learner actually produced,
 * not with a restatement of the rule.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Round {
  /** Outer function `f(x) = fa*x + fb`. */
  fa: number;
  fb: number;
  /** Inner function `g(x) = ga*x + gb`. */
  ga: number;
  gb: number;
  /** The input the pair is evaluated at. */
  n: number;
}

/**
 * Two pools of two rounds. Each pool opens on an inner function whose coefficient is 1, so
 * the first round is about the ORDER alone, and closes on one that scales as well, so the
 * second cannot be finished by adding the two given numbers together.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { fa: 2, fb: 5, ga: 1, gb: -3, n: 7 },
    { fa: 4, fb: -1, ga: 2, gb: 2, n: 3 },
  ],
  [
    { fa: 3, fb: 2, ga: 1, gb: 4, n: 5 },
    { fa: 5, fb: -6, ga: 3, gb: -1, n: 4 },
  ],
];

/** `+ 5` / `- 3`, the operator and magnitude that follow a term. */
function tail(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** A linear body such as `2x + 5`, `x - 3`, `-x + 4`. */
function linear(slope: number, constant: number): string {
  const head = slope === 1 ? "x" : slope === -1 ? "-x" : `${slope}x`;
  return `${head} ${tail(constant)}`;
}

/** `(-3)` for a negative, so a substituted value never runs into the sign before it. */
function bracketed(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

export function ComposeEvaluate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <ComposeEvaluateBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ComposeEvaluateBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [innerVal, setInnerVal] = useState("");
  const [outerVal, setOuterVal] = useState("");
  const [innerDone, setInnerDone] = useState(false);
  const [outerDone, setOuterDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const { fa, fb, ga, gb, n } = round;
  const isLastRound = roundIndex === lastIndex;

  const innerValue = ga * n + gb;
  const outerValue = fa * innerValue + fb;
  /** What the learner gets by reading the notation left to right and starting with `f`. */
  const outerAtInput = fa * n + fb;

  const solved = innerDone && outerDone;

  function closeRound() {
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function checkInner() {
    if (innerDone) {
      return;
    }
    setAttempted(true);
    const typed = innerVal.trim();
    if (typed !== "" && Number(typed) === innerValue) {
      setInnerDone(true);
      setFeedback(null);
      success();
      return;
    }
    if (typed !== "" && Number(typed) === outerAtInput) {
      setFeedback(
        <>
          That is <InlineMath latex={`f(${n})`} />, the other function. In{" "}
          <InlineMath latex="(f \circ g)" /> it is <InlineMath latex="g" /> that stands next
          to the input, so <InlineMath latex="g" /> is the one that meets the{" "}
          <InlineMath latex={`${n}`} />.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not that. Put the input into <InlineMath latex={`g(x) = ${linear(ga, gb)}`} /> and
        work out the single number it returns.
      </>,
    );
  }

  function checkOuter() {
    if (outerDone) {
      return;
    }
    setAttempted(true);
    const typed = outerVal.trim();
    if (typed !== "" && Number(typed) === outerValue) {
      setOuterDone(true);
      setFeedback(null);
      success();
      closeRound();
      return;
    }
    if (typed !== "" && Number(typed) === outerAtInput) {
      setFeedback(
        <>
          That used the <InlineMath latex={`${n}`} /> again. The outer function is handed{" "}
          <InlineMath latex={`${innerValue}`} />, which is what <InlineMath latex="g" />{" "}
          returned, and the original input is finished with.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not that. Put <InlineMath latex={`${bracketed(innerValue)}`} /> into{" "}
        <InlineMath latex={`f(x) = ${linear(fa, fb)}`} />.
      </>,
    );
  }

  function reveal() {
    setInnerDone(true);
    setOuterDone(true);
    setRevealed(true);
    setFeedback(null);
    closeRound();
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setInnerVal("");
      setOuterVal("");
      setInnerDone(false);
      setOuterDone(false);
      setAttempted(false);
      setRevealed(false);
      setFeedback(null);
    }
  }

  const innerShown = innerDone ? `${innerValue}` : "?";
  const outerShown = outerDone ? `${outerValue}` : "?";

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Send the input through the two functions in the order the circle notation names, and
        produce both numbers it passes through: what the inner function returns, and what
        the pair returns.
      </WidgetTask>

      <svg
        viewBox="0 0 440 168"
        role="img"
        aria-label={`Evaluating f of g of ${n}, where g of x is ${linear(ga, gb)} and f of x is ${linear(fa, fb)}`}
      >
        <title>Two functions in a chain, evaluated at one input</title>

        <text x={220} y={18} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`(f \\circ g)(${n})`}
          x={220}
          y={46}
          fontSize={20}
          color={LABEL}
          w={420}
        />

        {/* The chain itself: input, the inner machine, the handover, the outer machine. */}
        <SvgMath latex={`${n}`} x={40} y={104} fontSize={18} color={LABEL} w={56} />
        <line x1={66} y1={104} x2={98} y2={104} stroke={LINE} strokeWidth={2} />

        <rect
          x={98}
          y={80}
          width={106}
          height={48}
          rx={8}
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />
        <SvgMath
          latex={`g(x) = ${linear(ga, gb)}`}
          x={151}
          y={104}
          fontSize={15}
          color={LABEL}
          w={102}
        />

        <line x1={204} y1={104} x2={236} y2={104} stroke={LINE} strokeWidth={2} />
        <SvgMath
          latex={innerShown}
          x={220}
          y={80}
          fontSize={16}
          color={innerDone ? CIVIC : SOFT}
          w={56}
        />

        <rect
          x={236}
          y={80}
          width={106}
          height={48}
          rx={8}
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />
        <SvgMath
          latex={`f(x) = ${linear(fa, fb)}`}
          x={289}
          y={104}
          fontSize={15}
          color={LABEL}
          w={102}
        />

        <line x1={342} y1={104} x2={374} y2={104} stroke={LINE} strokeWidth={2} />
        <SvgMath
          latex={outerShown}
          x={404}
          y={104}
          fontSize={18}
          color={solved ? CIVIC : SOFT}
          w={64}
        />

        <text x={151} y={148} textAnchor="middle" fontSize={11} fill={SOFT}>
          acts first
        </text>
        <text x={289} y={148} textAnchor="middle" fontSize={11} fill={SOFT}>
          acts second
        </text>
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different pair of functions
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a different pair
          </button>
        )
      ) : !innerDone ? (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: LABEL }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`g(${n}) =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={innerVal}
              aria-label={`the value of g at ${n}`}
              onChange={(event) => setInnerVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkInner();
                }
              }}
              {...fill.entry(innerValue)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkInner}>
            Check the inner value
          </button>
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: LABEL }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`f(${bracketed(innerValue)}) =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={outerVal}
              aria-label={`the value of f at ${innerValue}`}
              onChange={(event) => setOuterVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkOuter();
                }
              }}
              {...fill.entry(outerValue)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkOuter}>
            Check the pair's value
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={`(f \\circ g)(${n}) = ${outerValue}`} />}
        why={
          <>
            <InlineMath latex="(f \circ g)" /> names the outer function first, so{" "}
            <InlineMath latex={`(f \\circ g)(${n})`} /> is{" "}
            <InlineMath latex={`f(g(${n}))`} /> and the input belongs to{" "}
            <InlineMath latex="g" />. That gives{" "}
            <InlineMath
              latex={`g(${n}) = ${ga === 1 ? "" : `${ga} \\times `}${bracketed(n)} ${tail(gb)} = ${innerValue}`}
            />
            , and only that value reaches <InlineMath latex="f" />:{" "}
            <InlineMath
              latex={`f(${bracketed(innerValue)}) = ${fa} \\times ${bracketed(innerValue)} ${tail(fb)} = ${outerValue}`}
            />
            .
          </>
        }
        onReveal={reveal}
        label="Reveal both values"
        // This reveal explains the whole round, both boxes together, so what is left over is
        // the rounds after it. False on the last one, where the board is the gate.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath
              latex={`(f \\circ g)(${n}) = f(g(${n})) = f(${bracketed(innerValue)}) = ${outerValue}`}
            />
            . The inner function met the input and the outer function met only its output.
          </>
        ) : (
          (feedback ??
          (innerDone ? (
            <>
              That is what <InlineMath latex="g" /> hands over. Now give that number, and
              only that number, to <InlineMath latex="f" />.
            </>
          ) : (
            <>
              The function standing next to the input acts first. Work out its value at{" "}
              <InlineMath latex={`${n}`} /> before anything else.
            </>
          )))
        )}
      </p>
    </div>
  );
}
