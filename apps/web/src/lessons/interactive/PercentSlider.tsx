/**
 * NUM.5 interactive (slide 2): a FORWARD percent widget. The learner sets the slider to a
 * target percent and then TYPES the resulting amount, which is checked against the computed
 * value. Gates the lesson once the learner enters the correct amount at the target percent.
 *
 * THE AMOUNT IS NEVER PRINTED UNTIL THE ROUND IS SETTLED. Both the readout above the bar and
 * the `0.25 \times 60 = \;?` line hold a question mark until the learner has either produced
 * the amount or asked to be taught it, because either half of that pair is the answer.
 *
 * It used to be shown as soon as the learner "committed a guess", which was read off a flag
 * set at the top of `check()` before any verdict had been reached. An empty field is not a
 * guess and a wrong number is not one either, so two clicks handed the number over: set the
 * slider to the target, press Check, read the answer off the bar. A percent slider is the
 * shape where that matters most, since the bar can be dragged until a number appears, and
 * the escape a stuck learner is owed is the reveal below, which arrives with the reasoning
 * attached and does not pass for an earned answer.
 *
 * A11y: the range input carries `aria-valuetext` so screen readers hear the percent (and,
 * once settled, the resulting amount) instead of only the raw slider number.
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

interface Ask {
  /** The share to take, as a whole percent reachable on the slider's step of 5. */
  pct: number;
  /** The whole it is taken of. */
  base: number;
}

/**
 * Two shares, neither of them the slide's own $15\%$ of $240$ nor the CFU's $20\%$ of $30$.
 *
 * The first is a quarter, which a learner can reach by halving twice and never touch a
 * decimal; the second is not a familiar fraction, so the only way to it is the hundredths
 * the lesson is teaching. A pool of two boards that were both quarters would deal a
 * different-looking question and ask the same one.
 */
const ASKS: readonly Ask[] = [
  { pct: 25, base: 60 },
  { pct: 40, base: 80 },
];

export function PercentSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(ASKS.length, props);
  const ask = ASKS[variant.index] ?? (ASKS[0] as Ask);
  return (
    <PercentSliderBody
      key={variant.nonce}
      ask={ask}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function PercentSliderBody({
  ask: { pct: TARGET_PCT, base: BASE },
  onSolved,
  onRestart,
}: {
  ask: Ask;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [pct, setPct] = useState(0);
  const [guess, setGuess] = useState("");
  const [solved, setSolved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const TARGET_VALUE = Math.round((TARGET_PCT / 100) * BASE);
  /** `25\% \text{ of } 60`, the phrase this widget repeats in four places. */
  const percentOf = (share: number) => `${share}\\% \\text{ of } ${BASE}`;
  /** `0.25`, the hundredths the percent is rewritten as. */
  const decimalOf = (share: number) => (share / 100).toFixed(2);

  const value = Math.round((pct / 100) * BASE);
  const showValue = solved;

  function change(next: number) {
    if (solved) {
      return;
    }
    setPct(next);
    setFeedback(null);
  }

  /** Close the round out. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setSolved(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    const entered = Number(guess.trim());
    if (guess.trim() === "" || Number.isNaN(entered)) {
      setFeedback(
        <>
          Type the amount, then press Check. What is{" "}
          <InlineMath latex={percentOf(TARGET_PCT)} />?
        </>,
      );
      return;
    }
    if (pct !== TARGET_PCT) {
      setFeedback(
        <>
          That's the amount at <InlineMath latex={`${pct}\\%`} />. Set the slider to{" "}
          <InlineMath latex={`${TARGET_PCT}\\%`} /> first, then enter{" "}
          <InlineMath latex={percentOf(TARGET_PCT)} />.
        </>,
      );
      return;
    }
    if (entered !== TARGET_VALUE) {
      setFeedback(
        <>
          Not quite. <InlineMath latex={`${TARGET_PCT}\\% = ${decimalOf(TARGET_PCT)}`} />,
          and <InlineMath latex={`${decimalOf(TARGET_PCT)} \\times ${BASE}`} /> is the
          shaded amount. Try again.
        </>,
      );
      return;
    }
    finish(true);
  }

  function reveal() {
    setPct(TARGET_PCT);
    setGuess(String(TARGET_VALUE));
    setRevealed(true);
    finish(false);
  }

  const left = 30;
  const right = 410;
  const barW = right - left;
  const barY = 44;
  const barH = 30;
  const fillW = (pct / 100) * barW;
  const fillX = left + fillW;

  const valueText = showValue ? `${pct}% of ${BASE} is ${value}` : `${pct}% of ${BASE}`;

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <svg viewBox="0 0 440 120" role="img" aria-label={`Shade a percent of ${BASE}`}>
        <title>Find the percent of {BASE}</title>
        {/* track */}
        <rect
          x={left}
          y={barY}
          width={barW}
          height={barH}
          rx={6}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1.5}
        />
        {/* fill */}
        <rect
          x={left}
          y={barY}
          width={fillW}
          height={barH}
          rx={6}
          fill={CIVIC}
          fillOpacity={0.28}
        />
        {fillW > 0 && (
          <line
            x1={fillX}
            y1={barY - 6}
            x2={fillX}
            y2={barY + barH + 6}
            stroke={CIVIC}
            strokeWidth={2}
          />
        )}
        {/* end labels */}
        <text x={left} y={barY + barH + 22} textAnchor="start" fontSize={13} fill={SOFT}>
          0
        </text>
        <text x={right} y={barY + barH + 22} textAnchor="end" fontSize={13} fill={SOFT}>
          {BASE}
        </text>
        {/* live amount: hidden as "?" until the round is settled */}
        <SvgMath
          latex={showValue ? String(value) : "?"}
          x={Math.min(Math.max(fillX, left + 16), right - 16)}
          y={barY - 18}
          fontSize={16}
          color={solved ? CIVIC : LABEL}
          w={80}
        />
        <SvgMath
          latex={`${percentOf(pct)} = ${decimalOf(pct)} \\times ${BASE} = ${
            showValue ? value : "?"
          }`}
          x={220}
          y={105}
          fontSize={14}
          color={LABEL}
        />
      </svg>

      <label className="lesson-interactive__slider-label" htmlFor="num5-percent">
        Set the slider to <InlineMath latex={`${TARGET_PCT}\\%`} />. It is at{" "}
        <strong>{pct}%</strong>.
      </label>
      <input
        id="num5-percent"
        className="lesson-interactive__range"
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        disabled={solved}
        aria-valuetext={valueText}
        onChange={(e) => change(Number(e.target.value))}
      />

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different share
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${percentOf(TARGET_PCT)} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              value={guess}
              aria-label={`${TARGET_PCT} percent of ${BASE}`}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. The slider position is part of the same judgement rather than a
              // second answer, so this box is the whole of what the round asks for.
              {...fill.entry(TARGET_VALUE)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={String(TARGET_VALUE)} />}
        why={
          <>
            A percent counts hundredths, so{" "}
            <InlineMath
              latex={`${TARGET_PCT}\\% = \\dfrac{${TARGET_PCT}}{100} = ${decimalOf(TARGET_PCT)}`}
            />
            . The word <em>of</em> is a multiplication, so{" "}
            <InlineMath latex={percentOf(TARGET_PCT)} /> is{" "}
            <InlineMath
              latex={`${decimalOf(TARGET_PCT)} \\times ${BASE} = ${TARGET_VALUE}`}
            />
            . On the bar that is the shaded part when the slider sits at{" "}
            <InlineMath latex={`${TARGET_PCT}\\%`} />: the whole track is{" "}
            <InlineMath latex={String(BASE)} />, and the shaded piece is{" "}
            <InlineMath latex={String(TARGET_VALUE)} /> of it.
          </>
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            Exactly. <InlineMath latex={percentOf(TARGET_PCT)} /> is{" "}
            <InlineMath latex={String(TARGET_VALUE)} />.
          </>
        ) : (
          (feedback ?? (
            <>
              Set the slider to <InlineMath latex={`${TARGET_PCT}\\%`} />, then type{" "}
              <InlineMath latex={percentOf(TARGET_PCT)} />.
            </>
          ))
        )}
      </p>
    </div>
  );
}
