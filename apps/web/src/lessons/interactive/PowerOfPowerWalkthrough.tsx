/**
 * EXP.1 interactive (slide 1): step-through of the power-of-a-power rule, parameterized
 * over two rounds rather than one hard-coded case. Play auto-advances on a timer and Step
 * advances one move (keyboard fallback), but the animation STOPS at the repeated-addition
 * row: it lays out the copied factors and their exponents without ever showing the total.
 * The learner then types the combined exponent, and only that entry reveals the result and
 * latches the gate, so pressing Play alone produces nothing.
 */

import { useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";
import { usePlayingSignal } from "./usePlayingSignal";

interface Round {
  /** Inner exponent, x^inner. */
  inner: number;
  /** The outer power the whole thing is raised to. */
  outer: number;
}

/**
 * Two sets of two rounds. Neither set holds the CFU's (x^2)^3 or the slide's (x^4)^2, so
 * the exponents are never read off the page, and "start over" hands out the set the
 * learner has NOT just answered so a second pass is worked rather than recalled.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { inner: 2, outer: 4 },
    { inner: 3, outer: 2 },
  ],
  [
    { inner: 4, outer: 3 },
    { inner: 2, outer: 5 },
  ],
];

const PLAY_MS = 750;

export function PowerOfPowerWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <PowerOfPowerWalkthroughBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function PowerOfPowerWalkthroughBody({
  rounds,
  onSolved,
  onRestart,
  onPlayingChange,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  const [entry, setEntry] = useState("");
  const [entryDone, setEntryDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const { inner, outer } = round;
  const result = inner * outer;
  const lastIndex = rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;

  // step 0 = statement; 1..outer = reveal each copied factor; outer + 1 = the repeated
  // sum WITHOUT its total. There is no auto-advance past that: the total is the
  // learner's to produce.
  const total = outer + 1;
  const expanded = stepIdx >= total;
  const factorsShown = Math.min(Math.max(stepIdx, 0), outer);
  const solved = entryDone;

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (stepIdx >= total) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStepIdx((prev) => Math.min(prev + 1, total));
    }, PLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, stepIdx, total]);

  function step() {
    setPlaying(false);
    setStepIdx((prev) => Math.min(prev + 1, total));
  }

  function replay() {
    setPlaying(false);
    setStepIdx(0);
  }

  /** Close this round out. `earned` is false when the learner revealed it instead. */
  function finishRound(earned: boolean) {
    setEntryDone(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (entryDone) {
      return;
    }
    setAttempted(true);
    const read = readNumericEntry(entry, "integer");
    if (read.ok && read.value === result) {
      finishRound(true);
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about copies of the base, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    setFeedback(
      entry.trim() === ""
        ? "Enter the combined exponent."
        : read.ok
          ? `Not quite. There are ${outer} copies of x to the ${inner}, and they all share a base, so their exponents add.`
          : WHOLE_NUMBER_MISS,
    );
  }

  function reveal() {
    setEntry(String(result));
    setRevealed(true);
    finishRound(false);
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setStepIdx(0);
      setPlaying(false);
      setEntry("");
      setEntryDone(false);
      setAttempted(false);
      setRevealed(false);
      setFeedback(null);
    }
  }

  const spacing = Math.min(108, 380 / Math.max(outer, 1));
  const startX = 220 - ((factorsShown - 1) * spacing) / 2;
  const factors = [];
  for (let k = 1; k <= factorsShown; k++) {
    const x = startX + (k - 1) * spacing;
    if (k > 1) {
      // The separator is its own label, centred on the midpoint of the gap it sits in.
      // Folding it into the factor's own LaTeX as `\cdot\; x^{n}` centred that PAIR on
      // the factor's slot instead, which pushed every dot hard against the term to its
      // right rather than sitting between the two terms it joins.
      factors.push(
        <SvgMath
          key={`s-${k}`}
          latex="\cdot"
          x={x - spacing / 2}
          y={80}
          fontSize={20}
          color={SOFT}
          w={spacing}
        />,
      );
    }
    factors.push(
      <SvgMath
        key={`f-${k}`}
        latex={`x^{${inner}}`}
        x={x}
        y={80}
        fontSize={20}
        color={LABEL}
        w={spacing}
      />,
    );
  }

  const sumLatex = Array(outer).fill(String(inner)).join(" + ");

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <svg
        viewBox="0 0 440 188"
        role="img"
        aria-label={`Power of a power: x to the ${inner}, all raised to the ${outer}`}
      >
        <title>Power-of-a-power walkthrough</title>

        <text x={220} y={20} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={
            solved
              ? `(x^{${inner}})^{${outer}} = x^{${result}}`
              : `(x^{${inner}})^{${outer}}`
          }
          x={220}
          y={42}
          fontSize={20}
          color={solved ? CIVIC : LABEL}
        />

        <line x1={30} y1={58} x2={410} y2={58} stroke={LINE} strokeWidth={1.5} />

        {factors}

        {expanded && (
          <SvgMath
            latex={solved ? `${sumLatex} = ${result}` : sumLatex}
            x={220}
            y={124}
            fontSize={17}
            color={solved ? CIVIC : SOFT}
          />
        )}

        {solved && (
          <SvgMath
            latex={`${inner} \\cdot ${outer} = ${result}`}
            x={220}
            y={162}
            fontSize={22}
            color={CIVIC}
          />
        )}

        {factorsShown === 0 && (
          <text x={220} y={124} textAnchor="middle" fontSize={14} fill={SIGNAL}>
            ready
          </text>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {solved ? (
          isLastRound ? (
            <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
              Start over on new exponents
            </button>
          ) : (
            <button type="button" className="lesson-interactive__check" onClick={nextRound}>
              Next: a new pair of exponents
            </button>
          )
        ) : expanded ? (
          <>
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`(x^{${inner}})^{${outer}} = x^{?},`} /> exponent =
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={entry}
                aria-label="Combined exponent"
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    check();
                  }
                }}
                // Last, so the answer overrides whatever the learner typed for as long as
                // the reveal is up. The animation stops before the total, so the exponent
                // this box holds is the only answer the round asks for.
                {...fill.entry(result)}
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
              onClick={() => setPlaying((p) => !p)}
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
        answer={<InlineMath latex={`${result}`} />}
        why={
          <>
            The copies all share the base <InlineMath latex="x" />, so their exponents add:{" "}
            <InlineMath latex={`${sumLatex} = ${result}`} />. Adding{" "}
            <InlineMath latex={`${inner}`} /> to itself <InlineMath latex={`${outer}`} />{" "}
            times is the same thing as multiplying, which is why the short rule is{" "}
            <InlineMath latex="\left(x^{a}\right)^{b} = x^{ab}" />, and here that reads{" "}
            <InlineMath latex={`${inner} \\cdot ${outer} = ${result}`} />.
          </>
        }
        onReveal={reveal}
        // One total per round, so what is left after this one is explained is the rounds after
        // it, and the walkthrough the learner has already stepped through stays stepped
        // through. False on the last round, which is the one the gate turns on.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            Adding <InlineMath latex={`${inner}`} /> to itself{" "}
            <InlineMath latex={`${outer}`} /> times is the same as multiplying, so{" "}
            <InlineMath latex={`(x^{${inner}})^{${outer}} = x^{${result}}`} />.
          </>
        ) : feedback ? (
          feedback
        ) : stepIdx === 0 ? (
          `x to the ${inner}, all raised to the ${outer}. Press Play or Step to write out the copies.`
        ) : expanded ? (
          `All ${outer} copies are laid out. They share a base, so add their exponents and enter the single exponent they come to.`
        ) : (
          `One copy of the inner power per outer step: ${factorsShown} of ${outer} written.`
        )}
      </p>
    </div>
  );
}
