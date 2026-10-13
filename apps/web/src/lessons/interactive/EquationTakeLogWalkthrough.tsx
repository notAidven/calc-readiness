/**
 * EL.6 interactive (slide 1): no base will match, so take a logarithm of both sides.
 *
 * Play and Step lay the algebra out one line at a time, on the equation itself rather than on
 * an identity: the equation, a logarithm applied to BOTH sides, the exponent brought down in
 * front where it is an ordinary multiplier, and the division that isolates the unknown, with
 * the two readings a calculator gives printed underneath it. Then it STOPS, one division
 * short. Watching a quotient be printed teaches nothing, so what the gate is spent on is the
 * value that division comes to, rounded the way the question asks for it. Pressing Play to the
 * end produces nothing on its own.
 *
 * Rounding is the second thing the shape is about, and the checker treats a stated precision
 * as a FLOOR: a learner who carries more digits is right and a learner who rounds early is
 * not. So an under-rounded entry is refused, and the readings on the board are printed to four
 * places while the answer is asked for to three, which is what makes carrying the extra digit
 * through the division the natural thing to do.
 *
 * The reveal passes no `othersRemain`, and legitimately never will: this board holds ONE
 * answer, the value of the unknown, and that answer is the gate. A reveal here always explains
 * the last outstanding answer, so handing the instance back would be handing over the gate.
 * `revealReAsk.test.ts` carries this file in `NEVER_HANDS_BACK` for that reason.
 */

import { useEffect, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { NUMERIC_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";
import { usePlayingSignal } from "./usePlayingSignal";

interface Round {
  /** The base being raised to the unknown, and the number no power of it lands on. */
  base: number;
  target: number;
  /** The two common-logarithm readings, as a calculator shows them to four places. */
  logTarget: string;
  logBase: string;
  /** The two powers the target sits between, which is why no exponent can be read off. */
  below: number;
  above: number;
}

/**
 * Two rounds, neither of them the pair the slide's prose walks. Both are chosen so the exact
 * value sits well clear of a rounding boundary in the third decimal place: dividing the two
 * four-place readings and dividing the unrounded logarithms agree there, so the round is about
 * the rule rather than about the fourth digit.
 */
const ROUNDS: readonly Round[] = [
  { base: 5, target: 40, logTarget: "1.6021", logBase: "0.6990", below: 25, above: 125 },
  { base: 3, target: 20, logTarget: "1.3010", logBase: "0.4771", below: 9, above: 27 },
];

const PLAY_MS = 950;

/** How close a typed value has to be to count when it carries more digits than were asked for. */
const TOLERANCE = 0.0005;

export function EquationTakeLogWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(ROUNDS.length, props);
  const round = ROUNDS[variant.index] ?? (ROUNDS[0] as Round);
  return (
    <EquationTakeLogWalkthroughBody
      key={variant.nonce}
      round={round}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function EquationTakeLogWalkthroughBody({
  round,
  onSolved,
  onRestart,
  onPlayingChange,
}: {
  round: Round;
  onSolved: () => void;
  onRestart: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  /**
   * 0 is the equation on its own, 1 the logarithm taken of both sides, 2 the exponent brought
   * down, 3 the division isolated, 4 the two readings and the quotient waiting to be worked.
   */
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const LAST = 4;
  const laid = stage >= LAST;
  const exact = Math.log(round.target) / Math.log(round.base);
  const key = exact.toFixed(3);
  const equation = `${round.base}^{x} = ${round.target}`;

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

  function step() {
    setPlaying(false);
    setStage((prev) => Math.min(prev + 1, LAST));
  }

  function replay() {
    setPlaying(false);
    setStage(0);
  }

  /** Close the round out. `earned` is false when the learner was handed the value. */
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
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Enter the value the division comes to, to three decimal places.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about which way round the division goes, which would answer a
    // question the learner did not ask. The attempt above still stands, so the reveal stays
    // on offer.
    const read = readNumericEntry(typed, "decimal");
    if (!read.ok) {
      setFeedback(NUMERIC_MISS);
      return;
    }
    const value = read.value;
    if (value.toFixed(3) === key || Math.abs(value - exact) < TOLERANCE) {
      finish(true);
      return;
    }
    setFeedback(
      `Not that one. Divide ${round.logTarget} by ${round.logBase}, keeping every digit the display gives you, and round only the answer, to three decimal places.`,
    );
  }

  function reveal() {
    setEntry(key);
    setRevealed(true);
    finish(false);
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Goal: watch <InlineMath latex={equation} /> be turned into a division, then give the
        value of <InlineMath latex="x" />, rounded to three decimal places.
      </WidgetTask>

      <svg
        viewBox="0 0 440 336"
        role="img"
        aria-label={`Solving ${round.base} to the x equals ${round.target} by taking a logarithm of both sides, bringing the exponent down in front, and dividing log ${round.target}, about ${round.logTarget}, by log ${round.base}, about ${round.logBase}`}
      >
        <title>An exponential equation solved by taking a logarithm of both sides</title>

        <text x={220} y={16} textAnchor="middle" fontSize={11} fill={SOFT}>
          {`step ${stage + 1} of ${LAST + 1}`}
        </text>

        <SvgMath latex={equation} x={220} y={42} fontSize={18} color={LABEL} w={430} />
        <text x={220} y={70} textAnchor="middle" fontSize={11} fill={SOFT}>
          {`no power of ${round.base} lands on ${round.target}: it sits between ${round.below} and ${round.above}`}
        </text>
        <line x1={30} y1={82} x2={410} y2={82} stroke={LINE} strokeWidth={1} />

        {stage >= 1 && (
          <SvgMath
            latex={`\\log\\left(${round.base}^{x}\\right) = \\log ${round.target}`}
            x={220}
            y={114}
            fontSize={16}
            color={SIGNAL}
            w={430}
          />
        )}

        {stage >= 2 && (
          <SvgMath
            latex={`x \\log ${round.base} = \\log ${round.target}`}
            x={220}
            y={158}
            fontSize={16}
            color={LABEL}
            w={430}
          />
        )}

        {stage >= 3 && (
          <SvgMath
            latex={`x = \\dfrac{\\log ${round.target}}{\\log ${round.base}}`}
            x={220}
            y={208}
            fontSize={16}
            color={LABEL}
            w={430}
          />
        )}

        {laid && (
          <>
            <SvgMath
              latex={`\\log ${round.target} \\approx ${round.logTarget}, \\quad \\log ${round.base} \\approx ${round.logBase}`}
              x={220}
              y={250}
              fontSize={14}
              color={LABEL}
              w={430}
            />
            <line x1={30} y1={268} x2={410} y2={268} stroke={LINE} strokeWidth={1} />
            <SvgMath
              latex={`x \\approx \\dfrac{${round.logTarget}}{${round.logBase}} \\approx ${
                solved ? key : "\\;?"
              }`}
              x={220}
              y={304}
              fontSize={18}
              color={solved ? CIVIC : SOFT}
              w={430}
            />
          </>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different equation
          </button>
        ) : laid ? (
          <>
            <div className="lesson-interactive__field">
              <span className="lesson-interactive__field-label">
                <InlineMath latex="x \approx" />
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("decimal")}
                value={entry}
                aria-label={`The value of x in ${round.base} to the x equals ${round.target}, to three decimal places`}
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    check();
                  }
                }}
              />
            </div>
            <button type="button" className="lesson-interactive__check" onClick={check}>
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

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={key} />}
        why={
          <>
            A logarithm of both sides keeps <InlineMath latex={equation} /> true, and the
            power rule brings the exponent down in front:{" "}
            <InlineMath latex={`x \\log ${round.base} = \\log ${round.target}`} />. Dividing
            by <InlineMath latex={`\\log ${round.base}`} /> isolates it, so{" "}
            <InlineMath latex={`x = \\dfrac{\\log ${round.target}}{\\log ${round.base}}`} />
            . The two readings are <InlineMath latex={round.logTarget} /> and{" "}
            <InlineMath latex={round.logBase} />, and dividing them gives{" "}
            <InlineMath latex={exact.toFixed(6)} />, which is <InlineMath latex={key} /> to
            three decimal places. The logarithm of the number the equation lands on goes on
            top, the logarithm of the base underneath.
          </>
        }
        onReveal={reveal}
        label="Reveal the value"
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath latex={`x \\approx ${key}`} />. The unknown was stuck upstairs in
            the exponent, and one logarithm applied to both sides brought it down in front
            where a division could reach it.
          </>
        ) : feedback ? (
          feedback
        ) : stage === 0 ? (
          `No exponent can be read off ${round.target} here. Press Play or Step to undo the exponential with a logarithm.`
        ) : laid ? (
          "Both readings are on the board and the division is set up. Give the value it comes to."
        ) : (
          `Line ${stage} of ${LAST} laid out.`
        )}
      </p>
    </div>
  );
}
