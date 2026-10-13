/**
 * LF.4 interactive (slide 2): the learner picks the multipliers, so elimination stops being
 * a trick that happens to work and becomes a choice with a reason.
 *
 * Neither variable in this system cancels on its own, so both equations have to be scaled.
 * A pair that does not cancel is refused with the actual scaled coefficients printed back,
 * and the "equal is not opposite" slip (scaling to match instead of to oppose) gets its own
 * line, because that is the miss that survives an otherwise correct plan. Once the pair is
 * right, Scale shows the rebuilt system and Add strikes the cancelling terms out in place,
 * so the vanishing is something the learner watches rather than something they are told.
 *
 * Gates on the add.
 *
 * Two systems rotate on "start over", and the second one is constrained rather than chosen:
 * for BOTH equations to need scaling, no coefficient may divide its partner in either
 * variable, and the survivor still has to come out whole. `3x + 2y = 12` with
 * `2x - 5y = -11` clears both — 3 against 2 and 2 against -5 — and solves at `(2, 3)`. Its
 * chip sets are built to the same standard as the first board's: they contain a cancelling
 * pair (top by 2 with bottom by -3, which turns the x terms into 6 and -6) and the
 * equal-not-opposite trap (top by 2 with bottom by 3, which turns them both into 6), so the
 * refusal that names the slip has something to refuse.
 *
 * Neither system is used by the CFU or the practice bank.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import {
  type LessonWidgetProps,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Board {
  a1: number;
  b1: number;
  c1: number;
  a2: number;
  b2: number;
  c2: number;
  /** The multiplier chips offered for each equation. */
  topMultipliers: readonly number[];
  bottomMultipliers: readonly number[];
  aria: string;
}

const BOARDS: readonly Board[] = [
  {
    a1: 2,
    b1: 3,
    c1: 12,
    a2: 5,
    b2: -2,
    c2: 11,
    topMultipliers: [2, 3, 5, -2],
    bottomMultipliers: [2, 3, 5, -3],
    aria: "Scaling 2x plus 3y equals 12 and 5x minus 2y equals 11 until one variable's coefficients are opposites, then adding",
  },
  {
    a1: 3,
    b1: 2,
    c1: 12,
    a2: 2,
    b2: -5,
    c2: -11,
    topMultipliers: [2, 3, 5, -2],
    bottomMultipliers: [2, 3, -2, -3],
    aria: "Scaling 3x plus 2y equals 12 and 2x minus 5y equals negative 11 until one variable's coefficients are opposites, then adding",
  },
];

const NEUTRAL = { color: LABEL, borderColor: LINE };

/** A variable term with its coefficient folded in: `3x`, `-x`, `x`. */
function vTerm(coeff: number, variable: string): string {
  if (coeff === 1) {
    return variable;
  }
  if (coeff === -1) {
    return `-${variable}`;
  }
  return `${coeff}${variable}`;
}

/** A signed value read aloud, for the aria-labels KaTeX makes textContent unfit for. */
function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

function equationTokens(
  xCoeff: number,
  yCoeff: number,
  constant: number,
  struck: "x" | "y" | null,
): EqToken[] {
  return [
    {
      text: vTerm(xCoeff, "x"),
      color: struck === "x" ? SIGNAL : LABEL,
      strike: struck === "x",
    },
    { text: yCoeff < 0 ? "-" : "+" },
    {
      text: vTerm(Math.abs(yCoeff), "y"),
      color: struck === "y" ? SIGNAL : LABEL,
      strike: struck === "y",
    },
    { text: "=" },
    { text: `${constant}` },
  ];
}

export function LinearSystemEliminateBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <LinearSystemEliminateBuildBody
      key={variant.nonce}
      board={BOARDS[variant.index] ?? (BOARDS[0] as Board)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearSystemEliminateBuildBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const {
    a1: A1,
    b1: B1,
    c1: C1,
    a2: A2,
    b2: B2,
    c2: C2,
    topMultipliers,
    bottomMultipliers,
  } = board;
  const [top, setTop] = useState<number | null>(null);
  const [bottom, setBottom] = useState<number | null>(null);
  const [stage, setStage] = useState(0);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();

  const solved = stage >= 2;
  const m1 = top ?? 1;
  const m2 = bottom ?? 1;
  const scaledX1 = A1 * m1;
  const scaledY1 = B1 * m1;
  const scaledC1 = C1 * m1;
  const scaledX2 = A2 * m2;
  const scaledY2 = B2 * m2;
  const scaledC2 = C2 * m2;
  const xCancels = scaledX1 + scaledX2 === 0;
  const yCancels = scaledY1 + scaledY2 === 0;
  const struck: "x" | "y" | null = stage >= 2 ? (yCancels ? "y" : "x") : null;

  // The equation that survives the add, and the value it hands back.
  const survivor = yCancels ? "x" : "y";
  const survivorCoeff = yCancels ? scaledX1 + scaledX2 : scaledY1 + scaledY2;
  const survivorTotal = scaledC1 + scaledC2;
  const survivorValue = survivorCoeff === 0 ? 0 : survivorTotal / survivorCoeff;

  function choose(side: "top" | "bottom", value: number) {
    setFeedback(null);
    if (side === "top") {
      setTop(value);
    } else {
      setBottom(value);
    }
  }

  function scale() {
    if (top === null || bottom === null) {
      setFeedback("Choose a multiplier for each equation first.");
      return;
    }
    if (xCancels || yCancels) {
      setFeedback(null);
      if (stage === 0) {
        success();
      }
      setStage(1);
      return;
    }
    const sameX = scaledX1 === scaledX2;
    const sameY = scaledY1 === scaledY2;
    setFeedback(
      <>
        Those give <InlineMath latex={vTerm(scaledX1, "x")} /> and{" "}
        <InlineMath latex={vTerm(scaledX2, "x")} />, and{" "}
        <InlineMath latex={vTerm(scaledY1, "y")} /> and{" "}
        <InlineMath latex={vTerm(scaledY2, "y")} />.{" "}
        {sameX || sameY
          ? "One pair matches, but matching is not opposite: adding them would double that term instead of removing it."
          : "Neither pair adds to zero, so adding the equations would still leave both variables."}
      </>,
    );
  }

  function add() {
    setStage(2);
    setFeedback(null);
    success();
    onSolved();
  }

  /**
   * Back to the multiplier chips on the SAME system. Deliberately not the restart: a learner
   * whose pair cancelled but who wants the other route is not asking for a new question.
   */
  function changeMultipliers() {
    setTop(null);
    setBottom(null);
    setStage(0);
    setFeedback(null);
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        The <InlineMath latex={yCancels ? "y" : "x"} /> terms are opposites, so they add to
        zero and drop out, leaving{" "}
        <InlineMath latex={`${vTerm(survivorCoeff, survivor)} = ${survivorTotal}`} /> and{" "}
        <InlineMath latex={`${survivor} = ${survivorValue}`} />. Back-substitute into either
        original equation for the other coordinate.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 1) {
    status = (
      <>
        Scaled. The <InlineMath latex={yCancels ? "y" : "x"} /> coefficients are now
        opposites, so add the two equations and watch that term go.
      </>
    );
  } else {
    status = (
      <>
        Pick a multiplier for each equation so that one variable's coefficients become
        opposites, then press Scale.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg viewBox="0 0 440 232" role="img" aria-label={board.aria}>
        <title>Choosing multipliers so a variable cancels</title>

        <text x={8} y={44} fontSize={11} fill={SOFT}>
          system
        </text>
        <SvgMath
          latex={`${vTerm(A1, "x")} ${B1 < 0 ? "-" : "+"} ${vTerm(Math.abs(B1), "y")} = ${C1}`}
          x={250}
          y={24}
          fontSize={18}
          color={LABEL}
          w={340}
        />
        <SvgMath
          latex={`${vTerm(A2, "x")} ${B2 < 0 ? "-" : "+"} ${vTerm(Math.abs(B2), "y")} = ${C2}`}
          x={250}
          y={52}
          fontSize={18}
          color={LABEL}
          w={340}
        />
        <line x1={70} y1={72} x2={424} y2={72} stroke={LINE} strokeWidth={1} />

        <text x={8} y={120} fontSize={11} fill={SOFT}>
          scaled
        </text>
        {stage >= 1 ? (
          <>
            <EquationRow
              tokens={equationTokens(scaledX1, scaledY1, scaledC1, struck)}
              cx={250}
              y={102}
              fontSize={18}
              w={340}
            />
            <EquationRow
              tokens={equationTokens(scaledX2, scaledY2, scaledC2, struck)}
              cx={250}
              y={136}
              fontSize={18}
              w={340}
            />
          </>
        ) : (
          <SvgMath latex="?" x={250} y={118} fontSize={20} color={SOFT} w={340} />
        )}

        {solved && (
          <>
            <line x1={130} y1={156} x2={370} y2={156} stroke={LINE} strokeWidth={1.5} />
            <text x={8} y={184} fontSize={11} fill={SOFT}>
              add
            </text>
            <SvgMath
              latex={`${vTerm(survivorCoeff, survivor)} = ${survivorTotal}`}
              x={250}
              y={180}
              fontSize={18}
              color={LABEL}
              w={340}
            />
            <SvgMath
              latex={`${survivor} = ${survivorValue}`}
              x={250}
              y={210}
              fontSize={20}
              color={CIVIC}
              w={340}
            />
          </>
        )}
      </svg>

      {stage === 0 && (
        <>
          <div className="lesson-interactive__controls">
            <span className="lesson-interactive__field-label">Top by</span>
            {topMultipliers.map((value) => (
              <button
                key={`t${value}`}
                type="button"
                className="lesson-interactive__chip"
                style={NEUTRAL}
                data-state={top === value ? "solved" : undefined}
                aria-label={`multiply the top equation by ${spoken(value)}`}
                onClick={() => choose("top", value)}
              >
                <InlineMath latex={value < 0 ? `\\times (${value})` : `\\times ${value}`} />
              </button>
            ))}
          </div>
          <div className="lesson-interactive__controls">
            <span className="lesson-interactive__field-label">Bottom by</span>
            {bottomMultipliers.map((value) => (
              <button
                key={`b${value}`}
                type="button"
                className="lesson-interactive__chip"
                style={NEUTRAL}
                data-state={bottom === value ? "solved" : undefined}
                aria-label={`multiply the bottom equation by ${spoken(value)}`}
                onClick={() => choose("bottom", value)}
              >
                <InlineMath latex={value < 0 ? `\\times (${value})` : `\\times ${value}`} />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="lesson-interactive__controls">
        {stage === 0 && (
          <button type="button" className="lesson-interactive__check" onClick={scale}>
            Scale
          </button>
        )}
        {stage === 1 && (
          <>
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={changeMultipliers}
            >
              Change multipliers
            </button>
            <button type="button" className="lesson-interactive__check" onClick={add}>
              Add the equations
            </button>
          </>
        )}
        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different system
          </button>
        )}
      </div>

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
