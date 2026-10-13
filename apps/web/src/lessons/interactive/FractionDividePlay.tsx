/**
 * NUM.F interactive (slide 4): divide one fraction by another.
 *
 * The two taps this replaced ("Flip the divisor", then "Multiply") only uncovered rows that
 * were going to appear anyway, so the slide could be passed without deciding or working out
 * anything. Both halves are now the learner's: WHICH fraction gets flipped, where the wrong
 * options are the two mistakes people actually make, and then the product itself, typed and
 * in lowest terms.
 *
 * One board reduces and the other does not, so "write it in lowest terms" cannot be
 * answered by reflex either way.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SIGNAL_DEEP,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  /** The dividend. */
  n1: number;
  d1: number;
  /** The divisor, the one that gets flipped. */
  n2: number;
  d2: number;
}

/** Neither board reuses the CFU's $\tfrac{2}{5} \times \tfrac{5}{6}$. */
const BOARDS: readonly Board[] = [
  { n1: 3, d1: 4, n2: 2, d2: 7 },
  { n1: 5, d1: 6, n2: 10, d2: 9 },
];

/** Which fraction the learner chose to turn upside down. */
type Flip = "divisor" | "dividend" | "both";

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

const frac = (n: number, d: number) => `\\dfrac{${n}}{${d}}`;

export function FractionDividePlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <FractionDivideBody
      key={variant.nonce}
      board={board}
      // Never zero, so the right answer is never the chip on the left: a board solvable by
      // taking the first option is not asking anything.
      rotate={1 + (variant.index % 2)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function FractionDivideBody({
  board: { n1, d1, n2, d2 },
  rotate,
  onSolved,
  onRestart,
}: {
  board: Board;
  rotate: number;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [num, setNum] = useState("");
  const [den, setDen] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // A node, not a string: the wrong-answer nudge below restates the two products, and they
  // have to be typeset where they are restated rather than printed as bare digits.
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const rawN = n1 * d2;
  const rawD = d1 * n2;
  const g = gcd(rawN, rawD);
  const ansN = rawN / g;
  const ansD = rawD / g;
  const reduces = g > 1;

  /** Close the board out. `earned` is false when the learner revealed it instead. */
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

  function chooseFlip(choice: Flip) {
    if (flipped) {
      return;
    }
    if (choice === "divisor") {
      setFeedback(null);
      setFlipped(true);
      success();
      return;
    }
    setAttempted(true);
    setFeedback(
      choice === "dividend"
        ? "Not that one. The fraction you are dividing BY is the one that turns over; the fraction being divided stays as it is."
        : "Not both. Only the divisor turns over, and flipping the other one changes the value you started with.",
    );
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    if (num.trim() === "" || den.trim() === "") {
      setFeedback("Fill in both the top and the bottom.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about multiplying straight across, which would answer a question
    // the learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const readN = readNumericEntry(num, "integer");
    const readD = readNumericEntry(den, "integer");
    if (!readN.ok || !readD.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    const enteredN = readN.value;
    const enteredD = readD.value;
    if (enteredD === 0) {
      setFeedback("A denominator cannot be zero.");
      return;
    }
    if (enteredN * ansD !== ansN * enteredD) {
      setFeedback(
        <>
          Not quite. Multiply straight across: <InlineMath latex={`${n1} \\times ${d2}`} />{" "}
          on top, and <InlineMath latex={`${d1} \\times ${n2}`} /> underneath.
        </>,
      );
      return;
    }
    if (enteredN !== ansN || enteredD !== ansD) {
      setFeedback(
        "That is the right value, but not yet in lowest terms. Divide the top and the bottom by what they share.",
      );
      return;
    }
    finish(true);
  }

  const offered: readonly { kind: Flip; latex: string | null; spoken: string }[] = [
    { kind: "divisor", latex: frac(n2, d2), spoken: `Flip ${n2} over ${d2}, the divisor` },
    {
      kind: "dividend",
      latex: frac(n1, d1),
      spoken: `Flip ${n1} over ${d1}, the dividend`,
    },
    { kind: "both", latex: null, spoken: "Flip both fractions" },
  ];
  const choices = offered.map(
    (_, i) => offered[(i + rotate) % offered.length] as (typeof offered)[number],
  );

  function reveal() {
    setFlipped(true);
    setNum(String(ansN));
    setDen(String(ansD));
    setRevealed(true);
    finish(false);
  }

  return (
    <div className="lesson-interactive lesson-interactive--divide">
      {/* Taller than flat text rows: a \dfrac needs about 2.2x the font size. */}
      <svg
        viewBox="0 0 440 184"
        role="img"
        aria-label={`Divide ${n1} over ${d1} by ${n2} over ${d2} by multiplying by the reciprocal`}
      >
        <title>Dividing fractions by multiplying with the reciprocal</title>
        <EquationRow
          cx={220}
          y={46}
          fontSize={20}
          align="equals-center"
          tokens={[
            { text: "\\phantom{=}" },
            { text: frac(n1, d1) },
            // One span, not an operator token plus an operand, so the strike-through runs
            // unbroken. The leading `{}` gives \div a left operand, which is what makes
            // KaTeX space it as a binary operator; `tight` then drops the row's own gap so
            // the space is not counted twice.
            {
              text: `{}\\div ${frac(n2, d2)}`,
              color: BRICK,
              strike: flipped,
              tight: true,
            },
          ]}
        />
        {flipped && (
          <EquationRow
            cx={220}
            y={98}
            fontSize={20}
            align="equals-center"
            tokens={[
              { text: "=" },
              { text: frac(n1, d1) },
              { text: "\\times", color: SIGNAL },
              { text: frac(d2, n2), color: SIGNAL },
            ]}
          />
        )}
        {solved && (
          <EquationRow
            cx={220}
            y={150}
            fontSize={20}
            tokens={[
              {
                text: reduces
                  ? `= ${frac(rawN, rawD)} = ${frac(ansN, ansD)}`
                  : `= ${frac(ansN, ansD)}`,
                color: CIVIC,
              },
            ]}
          />
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different division
          </button>
        ) : flipped ? (
          <>
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">top</span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={num}
                aria-label="Numerator of the answer, in lowest terms"
                onChange={(e) => setNum(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    check();
                  }
                }}
                // Last, so the answer overrides whatever the learner typed for as long as
                // the reveal is up. `ansN`/`ansD` are the reduced pair `check` requires and
                // the fraction the reveal prints once the divisor has been turned over.
                {...fill.entry(ansN)}
              />
            </div>
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">bottom</span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={den}
                aria-label="Denominator of the answer, in lowest terms"
                onChange={(e) => setDen(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    check();
                  }
                }}
                {...fill.entry(ansD)}
              />
            </div>
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          </>
        ) : (
          // Every option carries the same neutral token, so colour never marks the answer.
          // The fill dashes the divisor, which is the only choice `chooseFlip` accepts and
          // the one the reveal names while nothing has been turned over yet.
          choices.map((choice) => (
            <button
              key={choice.kind}
              type="button"
              className="lesson-interactive__chip"
              style={{
                color: LABEL,
                borderColor: choice.kind === "divisor" && fill.given ? SIGNAL_DEEP : LINE,
                borderStyle: choice.kind === "divisor" && fill.given ? "dashed" : "solid",
              }}
              aria-label={choice.spoken}
              onClick={() => chooseFlip(choice.kind)}
              {...fill.mark(choice.kind === "divisor")}
            >
              {choice.latex === null ? (
                "Flip both"
              ) : (
                <>
                  Flip <InlineMath latex={choice.latex} />
                </>
              )}
            </button>
          ))
        )}
      </div>

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={
          flipped ? (
            <InlineMath latex={frac(ansN, ansD)} />
          ) : (
            <>
              flip <InlineMath latex={frac(n2, d2)} />, the divisor
            </>
          )
        }
        why={
          flipped ? (
            <>
              Multiply straight across:{" "}
              <InlineMath
                latex={`${frac(n1, d1)} \\times ${frac(d2, n2)} = \\dfrac{${n1} \\times ${d2}}{${d1} \\times ${n2}} = ${frac(rawN, rawD)}`}
              />
              .{" "}
              {reduces ? (
                <>
                  Top and bottom share <InlineMath latex={`${g}`} />, so dividing both by it
                  gives <InlineMath latex={frac(ansN, ansD)} />, which is lowest terms.
                </>
              ) : (
                <>
                  Top and bottom share no factor above <InlineMath latex="1" />, so{" "}
                  <InlineMath latex={frac(ansN, ansD)} /> is already in lowest terms.
                </>
              )}
            </>
          ) : (
            <>
              Dividing asks how many of the divisor fit into the dividend, so it is the
              DIVISOR that turns over: <InlineMath latex={frac(n2, d2)} /> becomes{" "}
              <InlineMath latex={frac(d2, n2)} /> and the <InlineMath latex="\div" />{" "}
              becomes a <InlineMath latex="\times" />. Flipping the dividend instead would
              change the number you set out to divide.
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
        {revealed ? null : solved ? (
          <>
            Dividing by <InlineMath latex={frac(n2, d2)} /> is the same as multiplying by{" "}
            <InlineMath latex={frac(d2, n2)} />, so{" "}
            <InlineMath
              latex={`${frac(n1, d1)} \\div ${frac(n2, d2)} = ${frac(ansN, ansD)}`}
            />
            .
          </>
        ) : feedback ? (
          feedback
        ) : flipped ? (
          "Now multiply straight across, and enter the answer in lowest terms."
        ) : (
          "Dividing by a fraction is multiplying by a reciprocal. Which of these turns over?"
        )}
      </p>
    </div>
  );
}
