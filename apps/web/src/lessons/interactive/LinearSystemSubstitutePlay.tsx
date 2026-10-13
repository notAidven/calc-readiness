/**
 * LF.4 interactive (slide 1): substitution driven by the learner, one decision at a time.
 *
 * Four beats, in the order the method actually runs. First WHICH variable to isolate, and
 * the system is built so exactly one of the four choices has a coefficient of 1: the three
 * misses each name the fraction they would have dragged into the next line, which is the
 * whole reason the rule exists. Then WHICH expression goes into the other equation, where
 * the two distractors are the two sign slips this step invites. Then the single-variable
 * solve, typed. Then the back-substitution, typed, because a learner who stops at one
 * coordinate has not solved the system.
 *
 * Gates once the pair is complete.
 *
 * Two systems rotate on "start over", and a second one is harder to come by than it looks:
 * the board's first beat only exists while EXACTLY ONE of the four variable-and-equation
 * slots carries a coefficient of 1, which most systems violate in both directions at once,
 * and the solve has to stay whole-numbered on top of that. `2x + y = 8` with `3x - 2y = 5`
 * satisfies both — its only unit coefficient is the `y` of the first equation, and it solves
 * at `(3, 2)` — and it moves the unit coefficient onto the OTHER letter, so the learner who
 * cleared board one by picking `x` has to read the coefficients rather than repeat a habit.
 *
 * Neither system is used by the CFU or the practice bank.
 *
 * The reveal is owed by the two typed beats. Chips can be exhausted; a number field cannot,
 * and the back-substitution in particular is where a learner who has run the method
 * correctly still stalls, having answered the question they think was asked. Each reveal
 * teaches its own beat and hands the board back while later beats are still outstanding.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

const NEUTRAL = { color: LABEL, borderColor: LINE };

/** Which variable, in which equation. The four chips of the first beat. */
type Slot = "x1" | "y1" | "x2" | "y2";

interface Choice {
  id: string;
  latex: string;
  /** Trailing words after the math on the chip face. */
  tail?: string;
  aria: string;
}

const ISOLATE_CHOICES: readonly (Choice & { id: Slot })[] = [
  { id: "x1", latex: "x", tail: "in the first", aria: "isolate x in the first equation" },
  { id: "y1", latex: "y", tail: "in the first", aria: "isolate y in the first equation" },
  { id: "x2", latex: "x", tail: "in the second", aria: "isolate x in the second equation" },
  { id: "y2", latex: "y", tail: "in the second", aria: "isolate y in the second equation" },
];

interface Board {
  first: string;
  second: string;
  aria: string;
  /** The one slot whose coefficient is 1, which is the answer to beat one. */
  isolate: Slot;
  /** Every slot's coefficient, so a wrong chip can name the divide it would have forced. */
  coefficients: Record<Slot, number>;
  /** What the isolated variable equals, e.g. `11 - 2y`. */
  isolated: string;
  /** The term that crossed the equals sign, e.g. `2y`, quoted by both distractors. */
  moved: string;
  /** The two sign slips: the term not negated, and the whole expression negated. */
  keptSign: string;
  flipped: string;
  /** The second equation with the expression dropped in, and then collected. */
  substituted: string;
  collected: string;
  /** The variable the single-variable solve produces, and its value. */
  solveFor: "x" | "y";
  solveValue: number;
  /** The variable the back-substitution produces, and its value. */
  backFor: "x" | "y";
  backValue: number;
  /** The solution pair, in x-then-y order. */
  solution: { x: number; y: number };
}

const BOARDS: readonly Board[] = [
  {
    first: "x + 2y = 11",
    second: "3x - 4y = -7",
    aria: "Solving x plus 2y equals 11 with 3x minus 4y equals negative 7 by substitution, giving the pair 3, 4",
    isolate: "x1",
    coefficients: { x1: 1, y1: 2, x2: 3, y2: -4 },
    isolated: "11 - 2y",
    moved: "2y",
    keptSign: "11 + 2y",
    flipped: "2y - 11",
    substituted: "3(11 - 2y) - 4y = -7",
    collected: "33 - 10y = -7",
    solveFor: "y",
    solveValue: 4,
    backFor: "x",
    backValue: 3,
    solution: { x: 3, y: 4 },
  },
  {
    first: "2x + y = 8",
    second: "3x - 2y = 5",
    aria: "Solving 2x plus y equals 8 with 3x minus 2y equals 5 by substitution, giving the pair 3, 2",
    isolate: "y1",
    coefficients: { x1: 2, y1: 1, x2: 3, y2: -2 },
    isolated: "8 - 2x",
    moved: "2x",
    keptSign: "8 + 2x",
    flipped: "2x - 8",
    substituted: "3x - 2(8 - 2x) = 5",
    collected: "7x - 16 = 5",
    solveFor: "x",
    solveValue: 3,
    backFor: "y",
    backValue: 2,
    solution: { x: 3, y: 2 },
  },
];

/** The letter a slot's chip stands for. */
function slotLetter(slot: Slot): "x" | "y" {
  return slot.startsWith("x") ? "x" : "y";
}

/** Which of the two equations a slot lives in. */
function slotEquation(board: Board, slot: Slot): string {
  return slot.endsWith("1") ? board.first : board.second;
}

/** The fraction a divide by `n` drags in, in the word a learner would use for it. */
function fractionWord(n: number): string {
  const words: Record<number, string> = {
    2: "halves",
    3: "thirds",
    4: "quarters",
    5: "fifths",
    6: "sixths",
    7: "sevenths",
    8: "eighths",
    9: "ninths",
  };
  return words[Math.abs(n)] ?? "fractions";
}

/** Read a typed integer or decimal; returns null when it is not a plain number. */
function parseValue(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, "").replace(/^\+/, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function LinearSystemSubstitutePlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <LinearSystemSubstitutePlayBody
      key={variant.nonce}
      board={BOARDS[variant.index] ?? (BOARDS[0] as Board)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearSystemSubstitutePlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [beat, setBeat] = useState(0);
  const [entry, setEntry] = useState("");
  const [missed, setMissed] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [revealed, setRevealed] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = beat > 3;
  const isolateLetter = slotLetter(board.isolate);
  const expressionChoices: readonly Choice[] = [
    { id: "minus", latex: board.isolated, aria: `the expression ${board.isolated}` },
    { id: "plus", latex: board.keptSign, aria: `the expression ${board.keptSign}` },
    { id: "flip", latex: board.flipped, aria: `the expression ${board.flipped}` },
  ];

  function pickIsolate(choice: Choice & { id: Slot }) {
    if (choice.id === board.isolate) {
      setMissed(null);
      setFeedback(null);
      setBeat(1);
      success();
      return;
    }
    setMissed(choice.id);
    const divisor = board.coefficients[choice.id];
    setFeedback(
      <>
        Isolating <InlineMath latex={slotLetter(choice.id)} /> in{" "}
        <InlineMath latex={slotEquation(board, choice.id)} /> needs a divide by{" "}
        <InlineMath latex={String(divisor)} />, so every term picks up{" "}
        {fractionWord(divisor)}. One slot in this system already has a coefficient of{" "}
        <InlineMath latex="1" />; look for it.
      </>,
    );
  }

  function pickExpression(choice: Choice) {
    if (choice.id === "minus") {
      setMissed(null);
      setFeedback(null);
      setBeat(2);
      success();
      return;
    }
    setMissed(choice.id);
    if (choice.id === "plus") {
      setFeedback(
        <>
          That keeps the sign the term already had. <InlineMath latex={board.moved} /> is
          ADDED on the left of <InlineMath latex={board.first} />, so moving it to the other
          side makes it a subtraction.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        That is the opposite of the right expression. Subtract{" "}
        <InlineMath latex={board.moved} /> from both sides, not{" "}
        <InlineMath latex={isolateLetter} />.
      </>,
    );
  }

  function checkEntry() {
    const value = parseValue(entry);
    if (value === null) {
      setFeedback("Type a single number.");
      return;
    }
    if (beat === 2) {
      if (value === board.solveValue) {
        setEntry("");
        setFeedback(null);
        setMissed(null);
        setBeat(3);
        success();
        return;
      }
      setFeedback(
        <>
          Not yet. Distribute across both terms of <InlineMath latex={board.isolated} />,
          then gather the <InlineMath latex={board.solveFor} /> terms on one side and the
          plain numbers on the other.
        </>,
      );
      return;
    }
    if (value === board.backValue) {
      setEntry("");
      setFeedback(null);
      setMissed(null);
      setBeat(4);
      success();
      onSolved();
      return;
    }
    setFeedback(
      <>
        Not yet. Put your <InlineMath latex={board.solveFor} /> value back into{" "}
        <InlineMath latex={`${isolateLetter} = ${board.isolated}`} />.
      </>,
    );
  }

  /**
   * The reveal's own resolution: settle the beat it explained and open the next one. Only
   * the reveal that lets the learner past runs this; the one that re-asks leaves the board
   * exactly as it stands, with the explained beat still theirs to answer.
   */
  function fillIn() {
    setRevealed(true);
    setEntry("");
    setMissed(null);
    setFeedback(null);
    setBeat((current) => current + 1);
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Solved. The pair <InlineMath latex={`(${board.solution.x}, ${board.solution.y})`} />{" "}
        satisfies both equations, and the back substitution is what turned one coordinate
        into the whole solution.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (beat === 0) {
    status = "Which variable is cheapest to isolate, and in which equation?";
  } else if (beat === 1) {
    status = (
      <>
        Good pick. Now choose the expression that <InlineMath latex={isolateLetter} />{" "}
        equals, ready to drop into <InlineMath latex={board.second} />.
      </>
    );
  } else if (beat === 2) {
    status = (
      <>
        Only <InlineMath latex={board.solveFor} /> is left. Distribute, collect, and solve
        for <InlineMath latex={board.solveFor} />.
      </>
    );
  } else {
    status = (
      <>
        Back-substitute: put that value into{" "}
        <InlineMath latex={`${isolateLetter} = ${board.isolated}`} /> to get the other
        coordinate.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg viewBox="0 0 440 236" role="img" aria-label={board.aria}>
        <title>Substitution, one step at a time</title>

        <text x={8} y={44} fontSize={11} fill={SOFT}>
          system
        </text>
        <SvgMath latex={board.first} x={250} y={24} fontSize={18} color={LABEL} w={340} />
        <SvgMath latex={board.second} x={250} y={52} fontSize={18} color={LABEL} w={340} />
        <line x1={70} y1={72} x2={424} y2={72} stroke={LINE} strokeWidth={1} />

        <text x={8} y={98} fontSize={11} fill={SOFT}>
          isolate
        </text>
        <SvgMath
          /* A blank square rather than the letter, because naming the letter here would
             answer the chips below it: the first beat IS which variable to isolate. */
          latex={beat >= 1 ? `${isolateLetter} = ${board.isolated}` : "\\square = \\;?"}
          x={250}
          y={94}
          fontSize={18}
          color={beat >= 1 ? SIGNAL : SOFT}
          w={340}
        />

        {beat >= 1 && (
          <>
            <text x={8} y={130} fontSize={11} fill={SOFT}>
              substitute
            </text>
            <SvgMath
              latex={beat >= 2 ? board.substituted : board.second}
              x={250}
              y={126}
              fontSize={18}
              color={beat >= 2 ? LABEL : SOFT}
              w={340}
            />
          </>
        )}

        {beat >= 2 && (
          <>
            <text x={8} y={162} fontSize={11} fill={SOFT}>
              solve
            </text>
            <SvgMath
              latex={board.collected}
              x={250}
              y={158}
              fontSize={18}
              color={LABEL}
              w={340}
            />
          </>
        )}

        {beat >= 3 && (
          <SvgMath
            latex={`${board.solveFor} = ${board.solveValue}`}
            x={250}
            y={186}
            fontSize={18}
            color={SIGNAL}
            w={340}
          />
        )}

        {solved && (
          <>
            <text x={8} y={218} fontSize={11} fill={SOFT}>
              solution
            </text>
            <SvgMath
              latex={`(${board.solution.x}, ${board.solution.y})`}
              x={250}
              y={214}
              fontSize={20}
              color={CIVIC}
              w={340}
            />
          </>
        )}
      </svg>

      {beat === 0 && (
        <div className="lesson-interactive__controls">
          {ISOLATE_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="lesson-interactive__chip"
              style={NEUTRAL}
              data-state={missed === choice.id ? "wrong" : undefined}
              aria-label={choice.aria}
              onClick={() => pickIsolate(choice)}
            >
              <InlineMath latex={choice.latex} />
              {choice.tail ? ` ${choice.tail}` : null}
            </button>
          ))}
        </div>
      )}

      {beat === 1 && (
        <div className="lesson-interactive__controls">
          {expressionChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="lesson-interactive__chip"
              style={NEUTRAL}
              data-state={missed === choice.id ? "wrong" : undefined}
              aria-label={choice.aria}
              onClick={() => pickExpression(choice)}
            >
              <InlineMath latex={choice.latex} />
            </button>
          ))}
        </div>
      )}

      {(beat === 2 || beat === 3) && (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${beat === 2 ? board.solveFor : board.backFor} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={entry}
              aria-label={`the value of ${beat === 2 ? board.solveFor : board.backFor}`}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  checkEntry();
                }
              }}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkEntry}>
            Check
          </button>
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different system
        </button>
      )}

      <WidgetReveal
        available={feedback !== null && !solved}
        revealed={revealed}
        answer={
          beat === 0 ? (
            <>
              Isolate <InlineMath latex={isolateLetter} /> in{" "}
              <InlineMath latex={board.first} />.
            </>
          ) : beat === 1 ? (
            <InlineMath latex={`${isolateLetter} = ${board.isolated}`} />
          ) : beat === 2 ? (
            <InlineMath latex={`${board.solveFor} = ${board.solveValue}`} />
          ) : (
            <InlineMath latex={`${board.backFor} = ${board.backValue}`} />
          )
        }
        why={
          beat === 0 ? (
            <>
              Every slot can be isolated; the question is what it costs. Dividing by a
              coefficient puts a fraction on every term that follows it, and the whole rest
              of the method then carries it, so the slot to take is the one whose
              coefficient is already <InlineMath latex="1" />. Read the four coefficients
              off the two equations and exactly one of them is.
            </>
          ) : beat === 1 ? (
            <>
              A term does not keep its sign when it changes sides. Here{" "}
              <InlineMath latex={board.moved} /> is added to{" "}
              <InlineMath latex={isolateLetter} />, so getting{" "}
              <InlineMath latex={isolateLetter} /> alone means subtracting it from both
              sides, and what is left on the right is what{" "}
              <InlineMath latex={isolateLetter} /> equals. Substituting an expression with
              the wrong sign is the commonest way this method goes wrong while looking
              right.
            </>
          ) : beat === 2 ? (
            <>
              Substituting has done its job: <InlineMath latex={board.substituted} /> has
              only one letter in it, so it is an ordinary equation now. Multiply through the
              bracket first, then collect the <InlineMath latex={board.solveFor} /> terms on
              one side and the plain numbers on the other, which gives{" "}
              <InlineMath latex={board.collected} />.
            </>
          ) : (
            <>
              One coordinate is not a solution to a system: the answer is a PAIR, and you
              already have the machine that produces the other half. Put{" "}
              <InlineMath latex={`${board.solveFor} = ${board.solveValue}`} /> back into{" "}
              <InlineMath latex={`${isolateLetter} = ${board.isolated}`} />, which is the
              line you built at the start precisely so it would be waiting here.
            </>
          )
        }
        onReveal={fillIn}
        label={
          beat === 0
            ? "Reveal which slot to take"
            : beat === 1
              ? "Reveal what it equals"
              : beat === 2
                ? "Reveal how the solve goes"
                : "Reveal how to finish the pair"
        }
        othersRemain={beat < 3}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
