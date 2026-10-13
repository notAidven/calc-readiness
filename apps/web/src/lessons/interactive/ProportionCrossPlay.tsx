/**
 * NUM.5 interactive (slide 1): solve a proportion by cross products. The learner first does
 * the cross multiplication by hand (entering each diagonal's product), which reveals the
 * linear equation; then a "Divide both sides" tap isolates $x$. The two fractions carry
 * dashed cross-multiply guides. Gates the lesson once $x$ is reached.
 *
 * The two diagonals settle independently, so a learner who has one of them right is not
 * asked for it again, and the reveal explains whichever one is still open rather than
 * spending the whole board on the one it names.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  SIGNAL,
  SvgMath,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Board {
  /** The known ratio, $\dfrac{a}{b}$. */
  a: number;
  b: number;
  /** The denominator standing under the unknown, $\dfrac{x}{d}$. */
  d: number;
}

/**
 * Two proportions, neither of them the slide's own $\tfrac{2}{5} = \tfrac{x}{35}$.
 *
 * Both divide out exactly, and they are deliberately different sizes: the first crosses to a
 * two-digit product a learner can hold in their head, the second to a three-digit one where
 * the cross product has to be written down before the division is worth attempting.
 */
const BOARDS: readonly Board[] = [
  { a: 3, b: 4, d: 12 },
  { a: 5, b: 6, d: 24 },
];

/** Lowercase and strip spaces and multiplication marks, but keep letters (so "4 * x" -> "4x"). */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s*\u00b7\u00d7]/g, "");
}

export function ProportionCrossPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <ProportionCrossBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ProportionCrossBody({
  board: { a, b, d },
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [prodVal, setProdVal] = useState("");
  const [coefVal, setCoefVal] = useState("");
  const [prodDone, setProdDone] = useState(false);
  const [coefDone, setCoefDone] = useState(false);
  const [solveDone, setSolveDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const product = a * d;
  const answer = product / b;
  const PROD_EXPECTED = String(product);
  const COEF_EXPECTED = `${b}x`;

  const solved = solveDone;
  const crossDone = prodDone && coefDone;

  /**
   * Which diagonal the reveal is about, and whether the other one is still outstanding.
   *
   * Read live rather than stored: on the reveal that explains the LAST open diagonal there is
   * nothing to hand the board back for, since the only step left is the division the widget
   * itself performs, and handing it back there would be handing over the gate.
   */
  const explaining: "prod" | "coef" = prodDone ? "coef" : "prod";
  const othersRemain = !prodDone && !coefDone;

  const crossTokens: EqToken[] = [{ text: `${b}x = ${product}` }];
  const solveTokens: EqToken[] = [
    { text: "x" },
    { text: "=" },
    { text: String(answer), color: CIVIC },
  ];

  /** Close the board out. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setProdDone(true);
    setCoefDone(true);
    setSolveDone(true);
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
    if (crossDone) {
      return;
    }
    setAttempted(true);
    // The two diagonals are independent, so they settle independently: a learner who has one
    // of them right does not get it back to re-enter because the other was wrong.
    const nextProd = prodDone || normalize(prodVal) === PROD_EXPECTED;
    const nextCoef = coefDone || normalize(coefVal) === COEF_EXPECTED;
    setProdDone(nextProd);
    setCoefDone(nextCoef);
    // One badge per diagonal that just landed, so checking a second time is silent.
    if ((nextProd && !prodDone) || (nextCoef && !coefDone)) {
      success();
    }
    if (nextProd && nextCoef) {
      setFeedback(null);
      return;
    }
    setFeedback(
      nextProd ? (
        <>
          That diagonal is right. The other one is <InlineMath latex={`${b} \\times x`} />.
        </>
      ) : nextCoef ? (
        <>
          That diagonal is right. The other one is{" "}
          <InlineMath latex={`${a} \\times ${d}`} />.
        </>
      ) : (
        <>
          Not quite. Multiply along each diagonal:{" "}
          <InlineMath latex={`${a} \\times ${d}`} />, and{" "}
          <InlineMath latex={`${b} \\times x`} />.
        </>
      ),
    );
  }

  function divide() {
    if (!crossDone || solveDone) {
      return;
    }
    finish(true);
  }

  function reveal() {
    setProdVal(PROD_EXPECTED);
    setCoefVal(COEF_EXPECTED);
    setRevealed(true);
    finish(false);
  }

  const cx = 220;
  const half = 55;
  const leftFrac = cx - half;
  const rightFrac = cx + half;
  const fontSize = 18;
  // A \dfrac is centered on its own rule, so the numerator and denominator centers sit
  // symmetrically about `barY`. The dashed cross-multiply guides land on those centers.
  const barY = 56;
  const arm = fontSize * 0.55;
  const numCenter = barY - arm;
  const denCenter = barY + arm;

  return (
    <div className="lesson-interactive lesson-interactive--proportion">
      <svg
        viewBox="0 0 440 160"
        role="img"
        aria-label={`Solve ${a} over ${b} equals x over ${d} by cross products, giving x equals ${answer}`}
      >
        <title>Solve a proportion by cross products</title>
        <SvgMath
          latex={`\\dfrac{${a}}{${b}}`}
          x={leftFrac}
          y={barY}
          fontSize={fontSize}
          color={LABEL}
          w={120}
        />
        <SvgMath latex="=" x={cx} y={barY} fontSize={fontSize} color={LABEL} w={60} />
        {/* The whole right-hand side carries CIVIC: it is the side holding the unknown. */}
        <SvgMath
          latex={`\\dfrac{x}{${d}}`}
          x={rightFrac}
          y={barY}
          fontSize={fontSize}
          color={CIVIC}
          w={120}
        />
        <path
          d={`M ${leftFrac} ${numCenter} L ${rightFrac} ${denCenter}`}
          stroke={SIGNAL}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="none"
        />
        <path
          d={`M ${leftFrac} ${denCenter} L ${rightFrac} ${numCenter}`}
          stroke={SIGNAL}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="none"
        />
        {crossDone && <EquationRow cx={cx} y={118} fontSize={18} tokens={crossTokens} />}
        {solveDone && <EquationRow cx={cx} y={144} fontSize={18} tokens={solveTokens} />}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different proportion
        </button>
      ) : crossDone ? (
        <div className="lesson-interactive__controls">
          <button type="button" className="lesson-interactive__step" onClick={divide}>
            Divide both sides by <InlineMath latex={String(b)} />
          </button>
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: SIGNAL }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${a} \\times ${d} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              value={prodDone ? PROD_EXPECTED : prodVal}
              disabled={prodDone}
              aria-label={`${a} times ${d}`}
              onChange={(e) => setProdVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              // Only the diagonal the passage is explaining is filled in. The other one is
              // still the learner's to produce, which is what `othersRemain` promised them.
              {...(explaining === "prod" ? fill.entry(PROD_EXPECTED) : {})}
            />
          </div>
          <div className="lesson-interactive__field" style={{ color: SIGNAL }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${b} \\times x =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={coefDone ? COEF_EXPECTED : coefVal}
              disabled={coefDone}
              aria-label={`${b} times x`}
              onChange={(e) => setCoefVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              {...(explaining === "coef" ? fill.entry(COEF_EXPECTED) : {})}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !crossDone}
        revealed={revealed}
        othersRemain={othersRemain}
        answer={
          explaining === "prod" ? (
            <InlineMath latex={PROD_EXPECTED} />
          ) : (
            <InlineMath latex={COEF_EXPECTED} />
          )
        }
        why={
          explaining === "prod" ? (
            <>
              A cross product runs from the top of one ratio to the bottom of the other, so
              this diagonal joins the <InlineMath latex={String(a)} /> to the{" "}
              <InlineMath latex={String(d)} />:{" "}
              <InlineMath latex={`${a} \\times ${d} = ${product}`} />. Both of its numbers
              are known, which is why this side comes out as a plain number while the other
              side still carries the unknown.
            </>
          ) : (
            <>
              The other diagonal joins the <InlineMath latex={String(b)} /> to the{" "}
              <InlineMath latex="x" />, and there is nothing to work out yet because{" "}
              <InlineMath latex="x" /> has no value: multiplying just writes the two side by
              side as <InlineMath latex={COEF_EXPECTED} />. Setting the two cross products
              equal is what turns the proportion into{" "}
              <InlineMath latex={`${b}x = ${product}`} />, an ordinary equation.
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
            Cross products give <InlineMath latex={`${b}x = ${product}`} />, so{" "}
            <InlineMath latex={`x = ${answer}`} />.
          </>
        ) : crossDone ? (
          <>
            Now divide both sides by <InlineMath latex={String(b)} /> to isolate{" "}
            <InlineMath latex="x" />.
          </>
        ) : (
          (feedback ?? "Cross multiply along each diagonal, then press Check.")
        )}
      </p>
    </div>
  );
}
