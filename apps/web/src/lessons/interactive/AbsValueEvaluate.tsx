/**
 * FUN.10 slide 2: the two numbers outside the bars, met by evaluating through them in order.
 *
 * Three stages, one open at a time: what the bars are handed, what they give back, and what
 * the stretch and the shift then do to it. A learner who multiplies before taking the bars,
 * or who lets the stretch reach inside them, is stopped at the stage where that happens
 * rather than at a single wrong total with nothing saying which move went wrong.
 *
 * The worked line accumulates as each value lands, so the picture is built by the learner
 * rather than uncovered: nothing below the current stage is on screen until it is produced.
 */

import { useState } from "react";

import {
  BRICK,
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Round {
  /** The rule `a|x - h| + k`, and the input it is evaluated at. */
  a: number;
  h: number;
  k: number;
  x: number;
}

/**
 * Two rounds. The first stretches and drops, the second reflects and lifts, so the sign of
 * the number in front of the bars is a thing to read rather than a thing to assume. Neither
 * is the check's rule and neither appears in the slide's prose.
 */
const ROUNDS: readonly Round[] = [
  { a: 3, h: 2, k: -4, x: -1 },
  { a: -2, h: -3, k: 7, x: 1 },
];

/** `x - 2` / `x + 3`, the argument as the learner reads it. */
function argTex(h: number): string {
  return h < 0 ? `x + ${-h}` : `x - ${h}`;
}

/** A number wrapped for reading inside an expression: `4` stays, `-4` gains brackets. */
function numTex(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** The tail added outside the bars: ` + 7`, ` - 4`, or nothing at all. */
function tailTex(k: number): string {
  if (k === 0) {
    return "";
  }
  return k < 0 ? ` - ${-k}` : ` + ${k}`;
}

/**
 * The same tail as two tokens, the operator standing on its own.
 *
 * `EquationRow` puts its gap on both sides of a token, so an operator glued to its operand
 * renders the pair tight and pushes the space past the sign. `visualsMath.test.tsx` sweeps
 * every registered visual for exactly that.
 */
function tailTokens(k: number, color: string): EqToken[] {
  if (k === 0) {
    return [];
  }
  return [
    { text: k < 0 ? "-" : "+", color },
    { text: `${Math.abs(k)}`, color },
  ];
}

/** The same number said in words, so an accessible name is not read off KaTeX. */
function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

/** The whole rule read aloud, for the diagram's accessible name. */
function ruleSpoken(a: number, h: number, k: number): string {
  const inside = h < 0 ? `x plus ${-h}` : `x minus ${h}`;
  const outside = k === 0 ? "" : k < 0 ? `, minus ${-k}` : `, plus ${k}`;
  return `${spoken(a)} times the absolute value of ${inside}${outside}`;
}

const STAGE_LABELS: readonly string[] = [
  "inside the bars",
  "what the bars give back",
  "after the stretch and the shift",
];

export function AbsValueEvaluate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(ROUNDS.length, props);
  const round = ROUNDS[variant.index] ?? (ROUNDS[0] as Round);
  return (
    <AbsValueEvaluateBody
      key={variant.nonce}
      round={round}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AbsValueEvaluateBody({
  round,
  onSolved,
  onRestart,
}: {
  round: Round;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const { a, h, k, x } = round;
  const inside = x - h;
  const bars = Math.abs(inside);
  const total = a * bars + k;
  const answers = [inside, bars, total];
  const solved = stage >= answers.length;

  /** Settle the open stage. `earned` is false when the learner was told the value. */
  function settle(earned: boolean) {
    const next = stage + 1;
    setStage(next);
    setEntry("");
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= answers.length && !done) {
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
      setFeedback("Give the value for the stage that is open.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to a note about the bars, which would answer a question the learner did not
    // ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === answers[stage]) {
      settle(true);
      return;
    }
    setFeedback(
      stage === 0
        ? "Not yet. The bars have not acted at all yet, so this is only the input with the number inside the bars taken off it, sign and all."
        : stage === 1
          ? "Not yet. The bars report a distance from zero, so whatever they were handed comes back as its size."
          : "Not yet. The number in front of the bars multiplies what they gave back, and only then is the number on the outside added on.",
    );
  }

  function reveal() {
    setEntry(String(answers[stage]));
    setRevealed(true);
    settle(false);
  }

  const rule: EqToken[] = [
    { text: "f(x)", color: SOFT },
    { text: "=", color: SOFT },
    { text: `${a}`, color: SIGNAL },
    { text: `\\left\\lvert ${argTex(h)} \\right\\rvert`, color: LABEL },
    ...tailTokens(k, BRICK),
  ];

  const substituted: EqToken[] = [
    { text: `f(${numTex(x)})`, color: SOFT },
    { text: "=", color: SOFT },
    { text: `${a}`, color: SIGNAL },
    {
      text: `\\left\\lvert ${numTex(x)} ${h < 0 ? "+" : "-"} ${Math.abs(h)} \\right\\rvert`,
      color: stage === 0 ? SIGNAL_DEEP : LABEL,
    },
    ...tailTokens(k, BRICK),
  ];

  const afterInside: EqToken[] = [
    { text: "=", color: SOFT },
    { text: `${a}`, color: SIGNAL },
    {
      text: `\\left\\lvert ${numTex(inside)} \\right\\rvert`,
      color: stage === 1 ? SIGNAL_DEEP : LABEL,
    },
    ...tailTokens(k, BRICK),
  ];

  const afterBars: EqToken[] = [
    { text: "=", color: SOFT },
    { text: `${a}`, color: SIGNAL },
    { text: `\\times`, color: SOFT },
    { text: `${bars}`, color: LABEL },
    ...tailTokens(k, BRICK),
  ];

  const landed: EqToken[] = [
    { text: "=", color: SOFT },
    { text: `${total}`, color: CIVIC },
  ];

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: work this rule out at the given input one stage at a time, ending with the
        value the whole rule hands back.
      </WidgetTask>

      <svg
        viewBox="0 0 440 196"
        role="img"
        aria-label={`Evaluating the rule ${ruleSpoken(a, h, k)}, at x equals ${spoken(x)}`}
      >
        <title>An absolute-value rule worked out one stage at a time</title>

        <rect
          x={16}
          y={12}
          width={408}
          height={172}
          rx={8}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
        />

        <EquationRow tokens={rule} cx={220} y={36} fontSize={17} w={400} align="center" />
        <EquationRow
          tokens={substituted}
          cx={220}
          y={72}
          fontSize={17}
          w={400}
          align="center"
        />
        {stage >= 1 && (
          <EquationRow
            tokens={afterInside}
            cx={220}
            y={106}
            fontSize={17}
            w={400}
            align="center"
          />
        )}
        {stage >= 2 && (
          <EquationRow
            tokens={afterBars}
            cx={220}
            y={140}
            fontSize={17}
            w={400}
            align="center"
          />
        )}
        {stage >= 3 && (
          <EquationRow
            tokens={landed}
            cx={220}
            y={172}
            fontSize={18}
            w={400}
            align="center"
          />
        )}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different rule
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: SIGNAL_DEEP }}>
            <span className="lesson-interactive__field-label">
              {STAGE_LABELS[stage] ?? ""}
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`the value ${STAGE_LABELS[stage] ?? ""}`}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
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
        othersRemain={stage < answers.length - 1}
        answer={<InlineMath latex={String(answers[stage] ?? total)} />}
        why={
          stage === 0 ? (
            <>
              Only the quantity inside the bars is worked out at this stage, and it keeps
              whatever sign it comes out with:{" "}
              <InlineMath
                latex={`${numTex(x)} ${h < 0 ? "+" : "-"} ${Math.abs(h)} = ${inside}`}
              />
              .
            </>
          ) : stage === 1 ? (
            <>
              The bars hand back the distance from zero, so{" "}
              <InlineMath
                latex={`\\left\\lvert ${numTex(inside)} \\right\\rvert = ${bars}`}
              />
              . The number in front of the bars has still not been used.
            </>
          ) : (
            <>
              Now the outside numbers act, the stretch first and the shift after it:{" "}
              <InlineMath latex={`${a} \\times ${bars}${tailTex(k)} = ${total}`} />.
            </>
          )
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            The bars act on the inside and nothing else, so the stretch and the shift wait
            their turn. That order is what puts the vertex of{" "}
            <InlineMath
              latex={`y = ${a}\\left\\lvert ${argTex(h)} \\right\\rvert${tailTex(k)}`}
            />{" "}
            at <InlineMath latex={`(${h},\\, ${k})`} /> whatever the input.
          </>
        ) : (
          (feedback ??
          "The bars are worked out before anything outside them, so take the inside first and let the outside numbers wait.")
        )}
      </p>
    </div>
  );
}
