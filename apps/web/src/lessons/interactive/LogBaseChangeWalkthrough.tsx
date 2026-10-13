/**
 * EL.5 interactive (slide 3): change of base, walked as a computation.
 *
 * Play and Step lay the computation out one line at a time: the identity, the substitution
 * into it, and then the two readings a calculator can actually produce. Then it STOPS, one
 * division short. Watching a quotient be printed teaches nothing, so what the gate is spent
 * on is the value that division comes to, rounded the way the question asks for it. Pressing
 * Play to the end produces nothing on its own.
 *
 * Rounding is the second thing the shape is about, and the checker treats a stated precision
 * as a FLOOR: a learner who carries more digits is right and a learner who rounds early is
 * not. So an under-rounded entry is refused here too, and the readings on the board are
 * printed to four places while the answer is asked for to three, which is what makes carrying
 * the extra digit through the division the natural thing to do.
 */

import { useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
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
  /** The base the calculator has no key for, and the number inside the logarithm. */
  base: number;
  argument: number;
  /** The two common-logarithm readings, as a calculator shows them to four places. */
  logArgument: string;
  logBase: string;
}

/**
 * Two rounds, neither of them the pair the slide's prose names. Both are chosen so the exact
 * value sits well clear of a rounding boundary in the third decimal place: a value near one
 * would turn the round into an argument about the fourth digit rather than about the rule.
 */
const ROUNDS: readonly Round[] = [
  { base: 5, argument: 20, logArgument: "1.3010", logBase: "0.6990" },
  { base: 3, argument: 34, logArgument: "1.5315", logBase: "0.4771" },
];

const PLAY_MS = 950;

/** How close a typed value has to be to count when it carries more digits than were asked for. */
const TOLERANCE = 0.0005;

export function LogBaseChangeWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(ROUNDS.length, props);
  const round = ROUNDS[variant.index] ?? (ROUNDS[0] as Round);
  return (
    <LogBaseChangeWalkthroughBody
      key={variant.nonce}
      round={round}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function LogBaseChangeWalkthroughBody({
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
  /** 0 is the question, 1 the identity, 2 the substitution, 3 the readings, 4 the division. */
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
  const exact = Math.log(round.argument) / Math.log(round.base);
  const key = exact.toFixed(3);
  const question = `\\log_{${round.base}} ${round.argument}`;

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
      `Not that one. Divide ${round.logArgument} by ${round.logBase}, keeping every digit the display gives you, and round only the answer, to three decimal places.`,
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
        Goal: watch <InlineMath latex={question} /> be rewritten in a base a calculator can
        read, then give the value it comes to, rounded to three decimal places.
      </WidgetTask>

      <svg
        viewBox="0 0 440 288"
        role="img"
        aria-label={`Changing log base ${round.base} of ${round.argument} into a quotient of two common logarithms, ${round.logArgument} divided by ${round.logBase}`}
      >
        <title>One logarithm rewritten on a base a calculator carries</title>

        <text x={220} y={16} textAnchor="middle" fontSize={11} fill={SOFT}>
          {`step ${stage + 1} of ${LAST + 1}`}
        </text>

        <SvgMath
          latex={`${question} = \\;?`}
          x={220}
          y={40}
          fontSize={18}
          color={LABEL}
          w={430}
        />
        <line x1={30} y1={58} x2={410} y2={58} stroke={LINE} strokeWidth={1} />

        {stage >= 1 && (
          <SvgMath
            latex="\log_{b} N = \dfrac{\log N}{\log b}"
            x={220}
            y={94}
            fontSize={16}
            color={SIGNAL}
            w={430}
          />
        )}

        {stage >= 2 && (
          <SvgMath
            latex={`${question} = \\dfrac{\\log ${round.argument}}{\\log ${round.base}}`}
            x={220}
            y={150}
            fontSize={16}
            color={LABEL}
            w={430}
          />
        )}

        {stage >= 3 && (
          <SvgMath
            latex={`\\log ${round.argument} \\approx ${round.logArgument}, \\quad \\log ${round.base} \\approx ${round.logBase}`}
            x={220}
            y={198}
            fontSize={14}
            color={LABEL}
            w={430}
          />
        )}

        {laid && (
          <>
            <line x1={30} y1={216} x2={410} y2={216} stroke={LINE} strokeWidth={1} />
            <SvgMath
              latex={`\\dfrac{${round.logArgument}}{${round.logBase}} \\approx ${
                solved ? key : "\\;?"
              }`}
              x={220}
              y={252}
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
            Start over on a different base
          </button>
        ) : laid ? (
          <>
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`${question} \\approx`} />
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("decimal")}
                value={entry}
                aria-label={`The value of log base ${round.base} of ${round.argument}, to three decimal places`}
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
            Change of base turns <InlineMath latex={question} /> into{" "}
            <InlineMath latex={`\\dfrac{\\log ${round.argument}}{\\log ${round.base}}`} />,
            and the two readings are <InlineMath latex={round.logArgument} /> and{" "}
            <InlineMath latex={round.logBase} />. Dividing them gives{" "}
            <InlineMath latex={`${exact.toFixed(6)}`} />, which is{" "}
            <InlineMath latex={key} /> to three decimal places. The division goes numerator
            over denominator in the order the rule writes it: the number inside the
            logarithm on top, the base underneath.
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
            <InlineMath latex={`${question} \\approx ${key}`} />. A base with no key of its
            own was evaluated with the two logarithms the calculator does have, and nothing
            about the number inside the logarithm had to change to do it.
          </>
        ) : feedback ? (
          feedback
        ) : stage === 0 ? (
          `No calculator has a base ${round.base} key. Press Play or Step to rewrite the question on a base that does have one.`
        ) : laid ? (
          "Both readings are on the board and the division is set up. Give the value it comes to."
        ) : (
          `Line ${stage} of ${LAST} laid out.`
        )}
      </p>
    </div>
  );
}
