/**
 * EL.6 slide 0: the exponential equation that stops being exponential.
 *
 * The unknown is upstairs, where arithmetic cannot reach it, and the slide's move is that
 * nothing has to reach it. Rewrite the right side on the SAME base and the two sides can only
 * agree by agreeing in the exponent, because one base climbs past every value exactly once
 * and never comes back to it. What is left is an ordinary linear equation.
 *
 * So the board is two stages and the learner types both. Stage one asks for the exponent that
 * writes the right side on the base, which is the step that makes the method available at
 * all; stage two reads the exponent equation the match forces and asks for `x`. Neither is
 * watched: a learner shown a correct rewrite has not been asked the question, and the exponent
 * equation is withheld until they have earned it.
 *
 * The blanks are IN the equation rather than in a row of boxes beneath it, and stage one's
 * blank is raised, because the value it holds is an exponent and that is where an exponent
 * sits. Only the open stage holds an input; the stage below it shows a dashed slot with
 * nothing to focus, so the learner tabs through the question being asked and nothing else.
 *
 * The exponent on the right is deliberately never the answer to stage two, because every board
 * carries a shift. Reading `5` off `2^{5}` and calling it `x` is the miss the shift exists to
 * catch, and it gets a line of feedback naming it rather than the generic one.
 *
 * The gate is spent on both answers, one badge each. Stage one alone would let a learner past
 * on having recognised a power, which is the easier half and not the half the slide is about.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  type RevealAnchorProps,
  type RevealFilledEntry,
  type RevealFillProps,
  useRevealAnchor,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  base: number;
  /**
   * The exponent on the left is `x + shift`, and the shift is never zero: a bare `x` upstairs
   * would make stage two a copy of stage one's answer rather than a step.
   */
  shift: number;
  /** The right side as dealt, an exact power of the base but not written as one. */
  target: number;
  /** The exponent that writes the target on the base, and so stage one's answer. */
  power: number;
}

/**
 * Three boards, on three bases, none of them the CFU's numbers. The shift changes sign across
 * them, so undoing it is never the same arithmetic twice.
 */
const BOARDS: readonly Board[] = [
  { base: 2, shift: 1, target: 32, power: 5 },
  { base: 3, shift: -1, target: 81, power: 4 },
  { base: 5, shift: 2, target: 625, power: 4 },
];

/**
 * The column both equations hang on, and the margin each side keeps from it.
 *
 * The two rows are a before and an after of ONE equation, so the relation has to sit in one
 * place and the left side, which is the SAME expression in both, has to land on itself. Neither
 * happens if a row is centred as a block: the left side is wider than either right side, so
 * centring pushes the relation off by half the difference, and the difference is not the same on
 * the two rows. Anchoring both rows to this column instead needs no measurement pass, because
 * what is being lined up is identical ink.
 */
const EQ_X = 220;
const GUTTER = 13;

/**
 * How far each exponent sits from the column, for the tie that joins them.
 *
 * A fixed reach rather than a measured one, and legitimately so: every board is a one-digit base
 * under a two-glyph exponent (`2^{x+1}` against `2^{5}`, `3^{x-1}` against `3^{4}`, `5^{x+2}`
 * against `5^{4}`), so all three draw the same widths and the two exponents land the same
 * distance out on every one of them.
 */
const TIE_REACH = GUTTER + 13;

/** The exponent on the left, as LaTeX: `x + 1`, or `x - 1`. */
function exponentTex(shift: number): string {
  return shift < 0 ? `x - ${-shift}` : `x + ${shift}`;
}

/** The same, in words, for an accessible name. */
function exponentSpoken(shift: number): string {
  return shift < 0 ? `x minus ${-shift}` : `x plus ${shift}`;
}

/** What undoes the shift, named for what the learner does to both sides. */
function undoSpoken(shift: number): string {
  return shift < 0 ? `Adding ${-shift} to` : `Subtracting ${shift} from`;
}

/**
 * One blank in the equation, in the position the value it holds occupies in the math.
 *
 * Three states, and only the open one is an `<input>`: a stage that has not opened yet shows
 * an empty dashed box with nothing to focus, and a settled slot shows its value typeset while
 * keeping the outline that tells it apart from the fixed glyphs around it.
 */
function Slot({
  state,
  value,
  settled,
  aria,
  waiting,
  color,
  raised = false,
  anchor,
  fill,
  onChange,
  onEnter,
}: {
  state: "locked" | "open" | "done";
  value: string;
  /** The LaTeX the slot shows once it is settled. */
  settled: string;
  aria: string;
  /** What a screen reader hears while the slot is still waiting its turn. */
  waiting: string;
  color: string;
  /** An exponent sits above the line it is an exponent on, so its blank does too. */
  raised?: boolean;
  anchor?: RevealAnchorProps;
  fill?: RevealFilledEntry | RevealFillProps;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  const lift = raised ? { transform: "translateY(-0.55rem)" } : undefined;
  if (state === "done") {
    return (
      <span
        className="lesson-equation__slot lesson-equation__slot--done"
        style={{ color, ...lift }}
      >
        <InlineMath latex={settled} color={color} />
      </span>
    );
  }
  if (state === "locked") {
    return (
      <span className="lesson-equation__slot lesson-equation__slot--locked" style={lift}>
        <span className="visually-hidden">{waiting}</span>
      </span>
    );
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color, ...lift }}
      type="text"
      inputMode="numeric"
      value={value}
      aria-label={aria}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
      {...anchor}
      {...fill}
    />
  );
}

/** One stage of the working: its name, the equation itself, and the button that grades it. */
function Stage({
  name,
  state,
  onCheck,
  children,
}: {
  name: string;
  state: "locked" | "open" | "done";
  onCheck: () => void;
  children: ReactNode;
}) {
  return (
    <div className="lesson-equation__row" data-state={state}>
      <span className="lesson-equation__stage">{name}</span>
      <span className="lesson-equation__body">{children}</span>
      {state === "open" ? (
        <button type="button" className="lesson-interactive__check" onClick={onCheck}>
          Check
        </button>
      ) : null}
    </div>
  );
}

export function EquationSameBaseStepper(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <EquationSameBaseStepperBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function EquationSameBaseStepperBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** 0 asks for the exponent on the right, 1 asks for `x`, 2 is finished. */
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  /**
   * Which settled stages the learner actually produced. A revealed answer settles its stage
   * too, and green there would credit a step nobody took, so it stands in amber instead.
   */
  const [earned, setEarned] = useState({ rewrite: false, solve: false });
  const success = useWidgetSuccess();
  const anchor = useRevealAnchor();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = stage === 2;
  /** True once the right side is written on the base, which is what ties the exponents. */
  const matched = stage >= 1;
  const solution = board.power - board.shift;
  const wanted = stage === 0 ? board.power : solution;

  const expTex = exponentTex(board.shift);
  const expSpoken = exponentSpoken(board.shift);
  const leftTex = `${board.base}^{${expTex}}`;
  const rightTex = `${board.base}^{${board.power}}`;
  const exponentLine = `${expTex} = ${board.power}`;

  function advance(credit: boolean) {
    setFeedback(null);
    setEntry("");
    setAttempted(false);
    if (credit) {
      success();
    }
    if (stage === 0) {
      setEarned((prev) => ({ ...prev, rewrite: credit }));
      setStage(1);
      return;
    }
    setEarned((prev) => ({ ...prev, solve: credit }));
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
    // A fresh attempt, so a passage that is up is no longer what the board is about.
    setRevealed(false);
    const typed = entry.trim().replace(/\u2212/g, "-");
    if (!/^-?\d+$/.test(typed)) {
      setFeedback("Type a whole number.");
      return;
    }
    const value = Number(typed);
    if (value === wanted) {
      advance(true);
      return;
    }
    if (stage === 0) {
      setFeedback(
        value === board.target ? (
          <>
            That is the number itself, and the blank is upstairs. Count how many factors of{" "}
            <InlineMath latex={String(board.base)} /> multiply together to make{" "}
            <InlineMath latex={String(board.target)} />, and that count is what goes there.
          </>
        ) : (
          <>
            Not that one. <InlineMath latex={`${board.base}^{${value}}`} /> is not{" "}
            <InlineMath latex={String(board.target)} />. Multiply{" "}
            <InlineMath latex={String(board.base)} /> by itself until you land on{" "}
            <InlineMath latex={String(board.target)} />, and the blank takes how many
            factors that took.
          </>
        ),
      );
      return;
    }
    setFeedback(
      value === board.power ? (
        <>
          That is the exponent on the right. The exponent on the left is{" "}
          <InlineMath latex={expTex} />, not <InlineMath latex="x" />, so tying the two
          together still leaves one step: solve <InlineMath latex={exponentLine} /> for{" "}
          <InlineMath latex="x" />.
        </>
      ) : (
        <>
          Not that one. Put your value in for <InlineMath latex="x" /> and the exponent on
          the left has to come out at <InlineMath latex={String(board.power)} />, because
          that is what the right side carries now: <InlineMath latex={exponentLine} />.
        </>
      ),
    );
  }

  function reveal() {
    setEntry(String(wanted));
    setRevealed(true);
    // Stage two may still be owed, in which case this moves on to it rather than opening the
    // gate. Either way the step is not credited, which is what the `false` is for.
    advance(false);
  }

  /** Where one stage stands: waiting its turn, being answered, or settled. */
  function stageState(at: 0 | 1): "locked" | "open" | "done" {
    if (stage > at) {
      return "done";
    }
    return stage === at ? "open" : "locked";
  }

  /**
   * A slot's ink. Settled goes green for an answer the learner produced and amber for one that
   * was handed over, since green is a verdict on their action and a reveal is not one.
   */
  function slotColor(at: 0 | 1, credited: boolean): string {
    if (stage > at) {
      return credited ? CIVIC : SIGNAL_DEEP;
    }
    return feedback !== null && stage === at ? BRICK : LABEL;
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        <InlineMath latex={`${leftTex} = ${rightTex}`} /> forces{" "}
        <InlineMath latex={exponentLine} />, so <InlineMath latex={`x = ${solution}`} />.
        Once one base carries both sides the equation is not exponential any more, and no
        logarithm was needed anywhere.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (matched) {
    status = (
      <>
        Both sides are powers of <InlineMath latex={String(board.base)} /> now, and a base
        never reaches the same value from two different exponents, so the exponents are
        equal. Solve the line they give you.
      </>
    );
  } else {
    status = (
      <>
        The right side is a power of <InlineMath latex={String(board.base)} /> in disguise.
        Write it on that base and the unknown comes down out of the exponent.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--stepper">
      <WidgetTask>
        Goal: write both sides of <InlineMath latex={`${leftTex} = ${board.target}`} /> on
        the base <InlineMath latex={String(board.base)} />, and give the value of{" "}
        <InlineMath latex="x" /> that leaves.
      </WidgetTask>

      <svg
        viewBox="0 0 440 152"
        role="img"
        aria-label={
          matched
            ? `The equation ${board.base} to the ${expSpoken} equals ${board.base} to the ${board.power}, with the two exponents tied together`
            : `The equation ${board.base} to the ${expSpoken} equals ${board.target}, with the right side not yet written as a power of ${board.base}`
        }
      >
        <title>Both sides written on one base</title>

        <g data-row="dealt">
          <SvgMath
            latex={leftTex}
            x={EQ_X - GUTTER}
            y={34}
            anchor="end"
            fontSize={20}
            color={matched ? SOFT : LABEL}
            w={180}
          />
          <SvgMath
            latex="="
            x={EQ_X}
            y={34}
            fontSize={20}
            color={matched ? SOFT : LABEL}
            w={28}
          />
          <SvgMath
            latex={String(board.target)}
            x={EQ_X + GUTTER}
            y={34}
            anchor="start"
            fontSize={20}
            color={matched ? SOFT : LABEL}
            w={180}
          />
        </g>

        {matched ? (
          <>
            {/* The arrow and the tie below it stand on the same axis, so they get separate
                bands: the head stops at 66 and the arc rises no higher than 74. Overlapping
                bands put the arrowhead down on the dashed curve. */}
            <line x1={EQ_X} y1={50} x2={EQ_X} y2={58} stroke={SOFT} strokeWidth={1.4} />
            <path
              data-rewrite-arrowhead=""
              d={`M ${EQ_X} 66 L ${EQ_X - 4.8} 57 L ${EQ_X + 4.8} 57 Z`}
              fill={SOFT}
            />

            <g data-row="rewritten">
              <SvgMath
                latex={leftTex}
                x={EQ_X - GUTTER}
                y={100}
                anchor="end"
                fontSize={20}
                color={LABEL}
                w={180}
              />
              <SvgMath latex="=" x={EQ_X} y={100} fontSize={20} color={LABEL} w={28} />
              <SvgMath
                latex={rightTex}
                x={EQ_X + GUTTER}
                y={100}
                anchor="start"
                fontSize={20}
                color={LABEL}
                w={180}
              />
            </g>

            {/* A standing mark rather than a verdict on anything the learner did, so it is
                amber: the tie is a fact about the equation and it is true before they have
                answered anything. Dashed, and said in words in the caption below, so nothing
                here rests on hue. */}
            <path
              data-exponent-tie=""
              d={`M ${EQ_X - TIE_REACH} 86 Q ${EQ_X} 62 ${EQ_X + TIE_REACH} 86`}
              fill="none"
              stroke={SIGNAL_DEEP}
              strokeWidth={1.6}
              strokeDasharray="5 4"
            />
          </>
        ) : null}

        <text x={EQ_X} y={138} textAnchor="middle" fontSize={11} fill={SOFT}>
          {matched
            ? "one base on both sides, and a base never repeats a value"
            : "the right side is not written on the base yet"}
        </text>
      </svg>

      <div className="lesson-equation">
        <Stage name="rewrite" state={stageState(0)} onCheck={check}>
          <InlineMath latex={`${board.target} = ${board.base}`} color={LABEL} />
          <Slot
            state={stageState(0)}
            value={entry}
            settled={String(board.power)}
            aria={`the exponent that writes ${board.target} on the base ${board.base}`}
            waiting={`the exponent that writes ${board.target} on the base ${board.base}`}
            color={slotColor(0, earned.rewrite)}
            raised
            anchor={anchor(stage === 0)}
            fill={stage === 0 ? fill.entry(String(board.power)) : undefined}
            onChange={setEntry}
            onEnter={check}
          />
        </Stage>

        <Stage name="solve" state={stageState(1)} onCheck={check}>
          {/* The exponent equation the match forces. It is a consequence rather than a verdict
              on the learner, so it stands in amber, and it is withheld until the rewrite above
              has actually been produced. */}
          <InlineMath
            latex={matched ? `${exponentLine},` : `${expTex} = \\;?`}
            color={matched ? SIGNAL_DEEP : SOFT}
          />
          <InlineMath latex="x =" color={LABEL} />
          <Slot
            state={stageState(1)}
            value={entry}
            settled={String(solution)}
            aria="the value of x"
            waiting="the value of x goes here, once the rewrite above is done"
            color={slotColor(1, earned.solve)}
            anchor={anchor(stage === 1)}
            fill={stage === 1 ? fill.entry(String(solution)) : undefined}
            onChange={setEntry}
            onEnter={check}
          />
        </Stage>
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different base
        </button>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={String(wanted)} />}
        why={
          stage === 0 ? (
            <>
              <InlineMath latex={String(board.base)} /> multiplied by itself{" "}
              <InlineMath latex={String(board.power)} /> times is{" "}
              <InlineMath latex={String(board.target)} />, so{" "}
              <InlineMath latex={`${board.target} = ${rightTex}`} />. The blank takes the
              COUNT of factors and never the number they build, and it is that count which
              puts both sides on one base.
            </>
          ) : (
            <>
              A base climbs past every value exactly once, so <InlineMath latex={leftTex} />{" "}
              and <InlineMath latex={rightTex} /> can only be equal when their exponents
              are: <InlineMath latex={exponentLine} />. {undoSpoken(board.shift)} both sides
              leaves <InlineMath latex={`x = ${solution}`} />, so the exponent on the right
              is one step short of the answer.
            </>
          )
        }
        onReveal={reveal}
        label={stage === 0 ? "Reveal the exponent" : "Reveal the value of x"}
        // Stage one still owes stage two, so the board is worth handing back; stage two IS the
        // gate, and handing that back would hand the gate over with it.
        othersRemain={stage === 0}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : status}
      </p>
    </div>
  );
}
