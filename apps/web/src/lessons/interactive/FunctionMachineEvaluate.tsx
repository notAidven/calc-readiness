/**
 * FUN.1 slide 0: a function as a machine, and evaluating as running one setting through it.
 *
 * Registered as `function-machine-solver`, because the mechanic is type-and-check: the
 * machine lays out the intake, the rule and the output arm, and the learner produces the
 * reading. The rule is on screen from the start, so nothing here is a memory test; what is
 * being asked is whether the setting goes into the rule in place of the variable.
 *
 * Two settings per board, and the SECOND one is negative. That ordering is the teaching: a
 * learner who has just read a machine at a positive setting and then meets a negative one
 * has to substitute rather than pattern-match, and the two readings together are what makes
 * "one setting, one reading" a thing they have seen twice rather than a sentence.
 *
 * Neither board reuses the check's rule or the practice bank's draws.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  /** The rule's name, e.g. `f`. */
  name: string;
  /** The variable it takes. */
  variable: string;
  /** The coefficient and the constant of `a*v + b`. */
  a: number;
  b: number;
  /** The first setting, positive, and the second, negative. */
  first: number;
  second: number;
}

const BOARDS: readonly Board[] = [
  { name: "f", variable: "x", a: 3, b: 2, first: 4, second: -2 },
  { name: "g", variable: "t", a: 5, b: -3, first: 3, second: -1 },
];

/** The rule's box, and so the vertical centre every part of the machine is hung from. */
const RULE_TOP = 38;
const RULE_BOTTOM = 126;

/**
 * The line the intake reading, the rule, the arrows and the output reading all sit on.
 *
 * The rule USED to sit at 70, above this line, because a second `SvgMath` row was pinned at
 * 104 for the substitution and rendered `\;` until there was one to show. So the box a
 * learner met at rest held one expression 12 units high of its own centre, holding a gap
 * open for something that is not there yet.
 *
 * The rule is now on the machine's own centre line and STAYS there: it is the one string on
 * the board that is true before and after the learner acts, and a rule that jumps when the
 * working appears reads as the board redrawing itself rather than as an answer arriving. So
 * the working is not given a reserved row above it to push it up; it is rendered only once
 * there is one, in the space below, and the rule never moves.
 */
const MACHINE_LINE = (RULE_TOP + RULE_BOTTOM) / 2;

/** Where the substituted rule lands once there is one, clear of both the rule and the box. */
const WORKING_LINE = 108;

/** The rule as LaTeX: `f(x) = 3x + 2`. */
function ruleLatex(board: Board): string {
  return `${board.name}(${board.variable}) = ${board.a}${board.variable} ${
    board.b < 0 ? "-" : "+"
  } ${Math.abs(board.b)}`;
}

/** The rule with a setting substituted: `3(-2) + 2`. */
function substituted(board: Board, setting: number): string {
  return `${board.a}(${setting}) ${board.b < 0 ? "-" : "+"} ${Math.abs(board.b)}`;
}

/** A setting as the machine reads it, in words, for the accessible name. */
function spoken(value: number): string {
  return value < 0 ? `negative ${Math.abs(value)}` : `${value}`;
}

export function FunctionMachineEvaluate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <FunctionMachineEvaluateBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function FunctionMachineEvaluateBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** 0 asks for the first reading, 1 for the second, 2 is finished. */
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = stage === 2;
  const setting = stage === 1 ? board.second : board.first;
  const reading = board.a * setting + board.b;

  function advance(earned: boolean) {
    setFeedback(null);
    setEntry("");
    setAttempted(false);
    setRevealed(false);
    if (earned) {
      success();
    }
    if (stage === 0) {
      setStage(1);
      setShown(null);
      return;
    }
    setStage(2);
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
      setFeedback("Enter a number.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about substituting the setting, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === reading) {
      setShown(reading);
      advance(true);
      return;
    }
    setFeedback(
      "Not that reading. Put the setting in place of the variable everywhere it appears in the rule, then work the multiplication out before the addition.",
    );
  }

  function reveal() {
    setEntry(String(reading));
    setShown(reading);
    setRevealed(true);
    // The second setting is still owed on stage one, so this moves on rather than opening
    // the gate, and it is never credited.
    advance(false);
  }

  const shownReading = solved || shown !== null;

  return (
    <div className="lesson-interactive lesson-interactive--solver">
      <WidgetTask>
        Run both settings through the machine and give the reading each one produces, so the
        rule has answered a positive setting and a negative one.
      </WidgetTask>

      <svg
        viewBox="0 0 440 172"
        role="img"
        aria-label={`A machine holding the rule ${board.name} of ${board.variable} equals ${board.a} ${board.variable} plus ${board.b}, with the setting ${spoken(setting)} at its intake`}
      >
        <title>A machine fed one setting and returning one reading</title>

        <rect
          x={18}
          y={54}
          width={84}
          height={56}
          rx={8}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1.2}
        />
        <text x={60} y={46} textAnchor="middle" fontSize={11} fill={SOFT}>
          setting in
        </text>
        <SvgMath
          latex={String(setting)}
          x={60}
          y={MACHINE_LINE}
          fontSize={20}
          color={SIGNAL}
          w={80}
        />

        <line
          x1={104}
          y1={MACHINE_LINE}
          x2={140}
          y2={MACHINE_LINE}
          stroke={SOFT}
          strokeWidth={1.6}
        />
        <path d="M 140 82 L 132 78 L 132 86 Z" fill={SOFT} />

        <rect
          data-rule-frame=""
          x={142}
          y={RULE_TOP}
          width={156}
          height={RULE_BOTTOM - RULE_TOP}
          rx={10}
          fill="var(--paper-deep)"
          stroke={LINE}
          strokeWidth={1.4}
        />
        <text x={220} y={30} textAnchor="middle" fontSize={11} fill={SOFT}>
          the rule
        </text>
        <SvgMath
          latex={ruleLatex(board)}
          x={220}
          y={MACHINE_LINE}
          fontSize={17}
          color={LABEL}
          w={150}
          h={26}
        />
        {shownReading && (
          <SvgMath
            latex={substituted(board, setting)}
            x={220}
            y={WORKING_LINE}
            fontSize={15}
            color={SIGNAL}
            w={150}
            h={26}
          />
        )}

        <line
          x1={300}
          y1={MACHINE_LINE}
          x2={336}
          y2={MACHINE_LINE}
          stroke={SOFT}
          strokeWidth={1.6}
        />
        <path d="M 336 82 L 328 78 L 328 86 Z" fill={SOFT} />

        <rect
          x={338}
          y={54}
          width={84}
          height={56}
          rx={8}
          fill="var(--paper)"
          stroke={shownReading ? CIVIC : LINE}
          strokeWidth={1.2}
        />
        <text x={380} y={46} textAnchor="middle" fontSize={11} fill={SOFT}>
          reading out
        </text>
        <SvgMath
          latex={shownReading ? String(reading) : "?"}
          x={380}
          y={MACHINE_LINE}
          fontSize={20}
          color={shownReading ? CIVIC : SOFT}
          w={80}
        />

        <text x={220} y={148} textAnchor="middle" fontSize={11} fill={SOFT}>
          one setting in, exactly one reading out
        </text>
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different machine
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${board.name}(${setting}) =`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`The reading ${board.name} gives at the setting ${spoken(setting)}`}
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
        answer={<InlineMath latex={String(reading)} />}
        why={
          <>
            The setting takes the place of every <InlineMath latex={board.variable} /> in
            the rule, so the machine works out{" "}
            <InlineMath latex={substituted(board, setting)} />, which is{" "}
            <InlineMath latex={String(reading)} />. The brackets are there so the setting is
            multiplied as one whole number, sign and all.
          </>
        }
        onReveal={reveal}
        // Stage one still owes the second setting, so the board is worth handing back;
        // stage two is the gate, and handing that back would hand the gate over.
        othersRemain={stage === 0}
        label="Reveal this reading"
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : solved ? (
          <>
            Both settings went through the same rule and each one came back with exactly one
            reading. A rule that behaves like that is a <strong>function</strong>, and
            working out what it returns is called evaluating it.
          </>
        ) : feedback ? (
          feedback
        ) : stage === 1 ? (
          "Same machine, a negative setting this time. The whole negative number goes into the rule, so keep it in brackets."
        ) : (
          "The rule is printed on the machine. Work out what it hands back at the setting sitting in the intake."
        )}
      </p>
    </div>
  );
}
