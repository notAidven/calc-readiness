/**
 * GEO.1 interactive (slide 1): the theorem rearranged to hand back a side that was never
 * measured, walked one line at a time.
 *
 * The working is laid out by the learner rather than printed at once, because the order is
 * the skill: square, combine, then undo the squaring. The last line the stepper writes is
 * the root itself and not its value, so the board stops exactly where the question starts
 * and pressing "Next step" to the end produces nothing to copy.
 *
 * The two boards run the rearrangement in both directions. One is missing its hypotenuse and
 * combines with an addition; the other is missing a leg and combines with a subtraction, off
 * the hypotenuse's square rather than onto it. A widget that only ever added would leave the
 * commonest error in this topic untouched.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { NUMERIC_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  /** The upright leg, the base leg and the hypotenuse; the unknown one is `null`. */
  up: number | null;
  base: number | null;
  hyp: number | null;
  /** What the figure is, for the accessible name. */
  what: string;
}

/**
 * Neither board is the slide's square of side five, and neither answer is the CFU's fifty.
 * Both are exact whole numbers, so the root resolves and the stepper is about the route.
 */
const BOARDS: readonly Board[] = [
  { up: 9, base: 12, hyp: null, what: "a rectangular plot measured along two sides" },
  { up: 15, base: null, hyp: 17, what: "a brace whose length and rise are both known" },
];

/** Which side the board leaves out, and the number that fills it. */
function missing(board: Board): { slot: "up" | "base" | "hyp"; value: number } {
  if (board.hyp === null) {
    const up = board.up as number;
    const base = board.base as number;
    return { slot: "hyp", value: Math.sqrt(up * up + base * base) };
  }
  if (board.base === null) {
    const up = board.up as number;
    const hyp = board.hyp as number;
    return { slot: "base", value: Math.sqrt(hyp * hyp - up * up) };
  }
  const base = board.base as number;
  const hyp = board.hyp as number;
  return { slot: "up", value: Math.sqrt(hyp * hyp - base * base) };
}

/** The three lines the stepper writes, in order, as LaTeX. */
function lines(board: Board): readonly string[] {
  const { slot } = missing(board);
  if (slot === "hyp") {
    const up = board.up as number;
    const base = board.base as number;
    return [
      `${up}^{2} = ${up * up}, \\;\\; ${base}^{2} = ${base * base}`,
      `${up * up} + ${base * base} = ${up * up + base * base}`,
      `c = \\sqrt{${up * up + base * base}}`,
    ];
  }
  const hyp = board.hyp as number;
  const known = (slot === "base" ? board.up : board.base) as number;
  return [
    `${hyp}^{2} = ${hyp * hyp}, \\;\\; ${known}^{2} = ${known * known}`,
    `${hyp * hyp} - ${known * known} = ${hyp * hyp - known * known}`,
    `a = \\sqrt{${hyp * hyp - known * known}}`,
  ];
}

export function GeoDiagonalStepper(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GeoDiagonalStepperBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GeoDiagonalStepperBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const gap = missing(board);
  const written = lines(board);
  const ready = stage >= written.length;

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
      setFeedback("Enter the length the root on the last line stands for.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about what a square root stands for, which would answer a question
    // the learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "decimal");
    if (!read.ok) {
      setFeedback(NUMERIC_MISS);
      return;
    }
    if (read.value === gap.value) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. The last line is a square root, so the answer is the number that gives the total under the root when it is multiplied by itself.",
    );
  }

  function reveal() {
    setEntry(String(gap.value));
    setRevealed(true);
    finish(false);
  }

  /** The upright leg, the base leg and the hypotenuse, with the unknown one shown as `?`. */
  function sideLabel(slot: "up" | "base" | "hyp"): string {
    if (gap.slot === slot) {
      return solved ? String(gap.value) : "?";
    }
    const value = slot === "up" ? board.up : slot === "base" ? board.base : board.hyp;
    return String(value);
  }

  function sideColor(slot: "up" | "base" | "hyp"): string {
    return gap.slot === slot ? (solved ? CIVIC : BRICK) : LABEL;
  }

  // Both legs are known once the gap is filled in, so the figure can be drawn to the shape
  // the numbers describe rather than to a fixed one. A drawn shape that contradicts its own
  // labels is the figure teaching against the arithmetic beside it.
  const legUp = board.up ?? gap.value;
  const legBase = board.base ?? gap.value;
  const unit = 130 / Math.max(legUp, legBase);
  const corner = { x: 74, y: 172 };
  const top = { x: 74, y: 172 - legUp * unit };
  const right = { x: 74 + legBase * unit, y: 172 };
  const mid = { x: (top.x + right.x) / 2, y: (top.y + right.y) / 2 };
  const away = Math.hypot(mid.x - corner.x, mid.y - corner.y) || 1;
  const hypLabel = {
    x: mid.x + ((mid.x - corner.x) / away) * 26,
    y: mid.y + ((mid.y - corner.y) / away) * 26,
  };
  const rowX = 320;

  return (
    <div className="lesson-interactive lesson-interactive--stepper">
      <WidgetTask>
        Goal: lay out the working one line at a time, then give the length of the side the
        figure leaves unmeasured.
      </WidgetTask>

      <svg
        viewBox="0 0 440 216"
        role="img"
        aria-label={`A right triangle from ${board.what}, with one side unknown, beside the working that finds it`}
      >
        <title>A right triangle with one side missing, and the theorem rearranged</title>

        <path
          d={`M ${corner.x} ${corner.y} L ${top.x} ${top.y} L ${right.x} ${right.y} Z`}
          fill="none"
          stroke={LINE}
          strokeWidth={1.6}
        />
        {/* The right angle itself, drawn rather than asserted: the theorem needs it. */}
        <path
          d={`M ${corner.x} ${corner.y - 14} L ${corner.x + 14} ${corner.y - 14} L ${corner.x + 14} ${corner.y}`}
          fill="none"
          stroke={SOFT}
          strokeWidth={1.2}
        />

        <SvgMath
          latex={sideLabel("up")}
          x={44}
          y={(corner.y + top.y) / 2}
          fontSize={16}
          color={sideColor("up")}
          w={52}
        />
        <SvgMath
          latex={sideLabel("base")}
          x={(corner.x + right.x) / 2}
          y={192}
          fontSize={16}
          color={sideColor("base")}
          w={72}
        />
        <SvgMath
          latex={sideLabel("hyp")}
          x={hypLabel.x}
          y={hypLabel.y}
          fontSize={16}
          color={sideColor("hyp")}
          w={60}
        />

        <SvgMath
          latex="a^{2} + b^{2} = c^{2}"
          x={rowX}
          y={44}
          fontSize={16}
          color={SOFT}
          w={200}
        />
        {written.map((latex, index) =>
          stage > index ? (
            <SvgMath
              key={latex}
              latex={latex}
              x={rowX}
              y={84 + index * 40}
              fontSize={16}
              color={index === written.length - 1 ? CIVIC : LABEL}
              w={220}
            />
          ) : null,
        )}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different figure
        </button>
      ) : ready ? (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex={gap.slot === "hyp" ? "c =" : "a ="} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("decimal")}
              value={entry}
              aria-label="The length of the missing side"
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
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__check"
            data-stage={stage}
            onClick={() => setStage(stage + 1)}
          >
            Next step
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={String(gap.value)} />}
        why={
          <>
            The last line asks for the number whose square is the total underneath it, and{" "}
            <InlineMath latex={`${gap.value}^{2} = ${gap.value * gap.value}`} /> lands on
            exactly that total. So the square root resolves to a whole number here, and the
            missing side is <InlineMath latex={String(gap.value)} />.
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
            The two known sides fix the third one completely:{" "}
            <InlineMath latex={written[written.length - 1] as string} /> is{" "}
            <InlineMath latex={String(gap.value)} />, with nothing measured on the ground.
          </>
        ) : (
          (feedback ??
          (ready
            ? "The working is laid out as far as the root. Give the length that root stands for."
            : "Take the working forward one line, and watch what each line does to the one above it."))
        )}
      </p>
    </div>
  );
}
