/**
 * EL.1 interactive (slide 3): where $e$ comes from, and the one thing to do with it.
 *
 * Play and Step chop a year's growth into more and more steps and print what each split
 * reaches. The values climb by less and less and run into a ceiling, and the walkthrough
 * names that ceiling as $e^{r}$ rather than asking the learner to guess a decimal from a
 * sequence, which would be a reading exercise rather than a question.
 *
 * Then it STOPS, and what the learner produces is the exponent. Every continuous-growth
 * problem in this node's practice turns on assembling $rt$ correctly and nothing else, so
 * that is the value the gate is spent on: pressing Play to the end produces nothing.
 *
 * The rate is deliberately not the slide's $100\%$. The prose works the ceiling out at
 * $100\%$ and names $e \approx 2.71828$, so a board on the same rate would arrive with its
 * ceiling already printed a paragraph above it.
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

interface Split {
  /** How many times a year the growth is applied. */
  times: number;
  /** What that split reaches, already rounded for display. */
  reaches: string;
  /** True where `reaches` is the exact value rather than a rounding of it. */
  exact?: boolean;
  /** How the split is said, for the accessible name. */
  spoken: string;
}

interface Round {
  /** The yearly rate, as a percent, and as the decimal the formula takes. */
  percent: number;
  rate: string;
  /** The ladder of splits, coarsest first. */
  splits: readonly Split[];
  /** The ceiling the ladder runs into, rounded. */
  ceiling: string;
  /** The concrete question the walkthrough ends on. */
  principal: number;
  years: number;
}

/**
 * Two rounds. Both ladders are computed from $\left(1 + \tfrac{r}{n}\right)^{n}$ and both
 * ceilings are $e^{r}$, so the pattern is the same and no number is shared.
 */
const ROUNDS: readonly Round[] = [
  {
    percent: 50,
    rate: "0.5",
    splits: [
      { times: 1, reaches: "1.5", exact: true, spoken: "once a year reaches 1.5" },
      { times: 2, reaches: "1.5625", exact: true, spoken: "twice a year reaches 1.5625" },
      { times: 12, reaches: "1.6321", spoken: "monthly reaches 1.6321" },
      { times: 365, reaches: "1.6482", spoken: "daily reaches 1.6482" },
    ],
    ceiling: "1.6487",
    principal: 300,
    years: 6,
  },
  {
    percent: 200,
    rate: "2",
    splits: [
      { times: 1, reaches: "3", exact: true, spoken: "once a year reaches 3" },
      { times: 2, reaches: "4", exact: true, spoken: "twice a year reaches 4" },
      { times: 12, reaches: "6.3586", spoken: "monthly reaches 6.3586" },
      { times: 365, reaches: "7.3488", spoken: "daily reaches 7.3488" },
    ],
    ceiling: "7.3891",
    principal: 250,
    years: 4,
  },
];

const PLAY_MS = 900;

/**
 * Where the ladder of splits starts, and the pitch between two of its rows.
 *
 * Each row is a `\dfrac` inside a `\left(\right)` carrying an exponent, so the delimiters grow
 * to the fraction and the superscript sits above them: 49 user units of ink at `fontSize` 15,
 * measured over the glyph boxes in Chromium. The rows shipped on a pitch of 26, which is half
 * of that, so every row was drawn through the one above it. The pitch has to clear the ink and
 * leave a sliver, which `ExpContinuousWalkthrough.browser.test.tsx` holds; shrinking the
 * fraction to a `\tfrac` instead is what `lesson-katex` rules out for a diagram.
 */
const FIRST_ROW_Y = 86;
const ROW_PITCH = 58;

export function ExpContinuousWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(ROUNDS.length, props);
  const round = ROUNDS[variant.index] ?? (ROUNDS[0] as Round);
  return (
    <ExpContinuousWalkthroughBody
      key={variant.nonce}
      round={round}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function ExpContinuousWalkthroughBody({
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

  /** Stage 0 is the statement, 1..4 are the splits, and 5 names the ceiling and stops. */
  const LAST = round.splits.length + 1;
  const laid = stage >= LAST;
  const shown = Math.min(Math.max(stage, 0), round.splits.length);
  const exponent = Number(round.rate) * round.years;

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
  }, [playing, stage, LAST]);

  function step() {
    setPlaying(false);
    setStage((prev) => Math.min(prev + 1, LAST));
  }

  function replay() {
    setPlaying(false);
    setStage(0);
  }

  /** Close the round out. `earned` is false when the learner was told the answer. */
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
    const read = readNumericEntry(typed, "decimal");
    if (read.ok && read.value === exponent) {
      finish(true);
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about rate times time, which would answer a question the learner
    // did not ask. The attempt above still stands, so the reveal stays on offer.
    setFeedback(
      typed === ""
        ? "Enter the number that goes in the exponent."
        : read.ok
          ? "Not that one. The exponent of e is the rate multiplied by the time, and both of them are quoted in years."
          : NUMERIC_MISS,
    );
  }

  function reveal() {
    setEntry(String(exponent));
    setRevealed(true);
    finish(false);
  }

  const rowY = (at: number) => FIRST_ROW_Y + at * ROW_PITCH;
  /** Clear of the last split's ink, which reaches half a row below its center. */
  const askY = rowY(round.splits.length - 1) + 46;
  /** Derived, so a round with a different number of splits cannot silently clip. */
  const viewH = askY + 84;

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Goal: watch a year's growth split into smaller and smaller steps, then give the
        exponent that the continuous formula puts on <InlineMath latex="e" /> for the amount
        quoted at the end.
      </WidgetTask>

      <svg
        viewBox={`0 0 440 ${viewH}`}
        role="img"
        aria-label={`One unit growing at ${round.percent} percent a year, split more and more finely: ${round.splits
          .map((split) => split.spoken)
          .join(", ")}, with a ceiling at ${round.ceiling}`}
      >
        <title>Splitting a year's growth until it runs into a ceiling</title>

        <text x={220} y={16} textAnchor="middle" fontSize={11} fill={SOFT}>
          {`step ${stage + 1} of ${LAST + 1}`}
        </text>

        <SvgMath
          latex={`\\text{One unit grows } ${round.percent}\\% \\text{ over a year.}`}
          x={220}
          y={38}
          fontSize={14}
          w={430}
        />
        <line x1={30} y1={54} x2={410} y2={54} stroke={LINE} strokeWidth={1} />

        {round.splits.slice(0, shown).map((split, at) => (
          <g key={split.times}>
            <text x={16} y={rowY(at) + 4} fontSize={10} fill={SOFT}>
              {`${split.times} per year`}
            </text>
            <SvgMath
              latex={`\\left(1 + \\dfrac{${round.rate}}{${split.times}}\\right)^{${split.times}} ${
                split.exact === true ? "=" : "\\approx"
              } ${split.reaches}`}
              x={252}
              y={rowY(at)}
              fontSize={15}
              color={at === round.splits.length - 1 ? SIGNAL : LABEL}
              w={340}
            />
          </g>
        ))}

        {laid && (
          <>
            <line
              x1={30}
              y1={askY - 12}
              x2={410}
              y2={askY - 12}
              stroke={LINE}
              strokeWidth={1}
            />
            <SvgMath
              latex={`\\text{ceiling: } e^{${round.rate}} \\approx ${round.ceiling}`}
              x={220}
              y={askY + 8}
              fontSize={16}
              color={CIVIC}
              w={430}
            />
            <SvgMath
              latex={`A = Pe^{rt}, \\quad P = ${round.principal}, \\; r = ${round.rate}, \\; t = ${round.years}`}
              x={220}
              y={askY + 34}
              fontSize={14}
              color={LABEL}
              w={430}
            />
            <SvgMath
              latex={
                solved
                  ? `A = ${round.principal}e^{${exponent}}`
                  : `A = ${round.principal}e^{\\;?}`
              }
              x={220}
              y={askY + 62}
              fontSize={19}
              color={solved ? CIVIC : SOFT}
              w={430}
            />
          </>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different rate
          </button>
        ) : laid ? (
          <>
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`${round.principal}e^{?},`} /> exponent =
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("decimal")}
                value={entry}
                aria-label="The exponent of e"
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
        answer={<InlineMath latex={String(exponent)} />}
        why={
          <>
            In <InlineMath latex="A = Pe^{rt}" /> the rate and the time are multiplied
            before <InlineMath latex="e" /> is raised to anything, so the exponent here is{" "}
            <InlineMath latex={`rt = ${round.rate} \\cdot ${round.years} = ${exponent}`} />{" "}
            and the amount is <InlineMath latex={`${round.principal}e^{${exponent}}`} />.
            The starting amount <InlineMath latex={`${round.principal}`} /> stays outside
            the exponent, because it is what the growth is applied TO rather than part of
            how much growth there is.
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
            <InlineMath latex={`rt = ${round.rate} \\cdot ${round.years} = ${exponent}`} />,
            so the amount after <InlineMath latex={`${round.years}`} /> years is{" "}
            <InlineMath latex={`${round.principal}e^{${exponent}}`} />. Splitting the year
            more finely never gets past the ceiling, and continuous growth is that ceiling
            written down.
          </>
        ) : feedback ? (
          feedback
        ) : stage === 0 ? (
          `One unit at ${round.percent} percent a year. Press Play or Step to split the year more and more finely.`
        ) : laid ? (
          `The splits climbed by less and less and stopped short of ${round.ceiling}, which is e to the ${round.rate}. Now give the exponent for the amount quoted above.`
        ) : (
          `${shown} of ${round.splits.length} splits printed, and each one lands a little higher than the last.`
        )}
      </p>
    </div>
  );
}
