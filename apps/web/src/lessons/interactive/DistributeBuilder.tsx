/**
 * NUM.3 interactive (slide 1): distribute a factor across a sum with a two-cell area model.
 * The learner types the product for each term and checks it; each correct entry fills its
 * area cell and the expanded expression assembles.
 *
 * Every board is a POSITIVE round followed by a NEGATIVE one, and the gate waits for both,
 * so the sign misconception ($3 \times -4 = -12$) cannot be walked past. The variable is `n`
 * (not `x`) so it never looks like the multiplication sign.
 *
 * The two cells settle independently, and the reveal explains whichever one is still open
 * rather than spending a board that is still asking for the other cell or the second round.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Round {
  factor: number;
  varSym: string;
  op: "+" | "-";
  constMag: number;
}

/**
 * Two boards, a positive round then a negative one on each, and neither board reuses the
 * slide's own $5(t - 3)$ or the CFU's $3(x + 4)$.
 *
 * The second board is deliberately not a relabelling of the first: both of its factors are
 * larger than either of the first board's, so the products are two-digit numbers a learner
 * cannot read off a times table they have just recited.
 */
const BOARDS: readonly (readonly Round[])[] = [
  [
    { factor: 2, varSym: "n", op: "+", constMag: 5 },
    { factor: 3, varSym: "n", op: "-", constMag: 4 },
  ],
  [
    { factor: 4, varSym: "n", op: "+", constMag: 7 },
    { factor: 6, varSym: "n", op: "-", constMag: 5 },
  ],
];

/**
 * A cell the learner has not filled in yet.
 *
 * `\mathord{?}` rather than a bare `?`, because the assembled line below sets it as the
 * operand of the round's operator. KaTeX classes `?` as a CLOSE atom, and TeX demotes a
 * binary operator standing before a close atom to an ordinary one, which takes the medium
 * space out on both sides: `2(n + 5) = ?+?`. One spelling for all three cells, so the two
 * that carry no operator cannot drift away from the one that does.
 */
const UNKNOWN = "\\mathord{?}";

const FALLBACK: Round = { factor: 1, varSym: "n", op: "+", constMag: 0 };

/** Lowercase and strip spaces, multiplication marks; map unicode minus to a hyphen. */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u2212/g, "-")
    .replace(/[\s*·\u00d7]/g, "");
}

export function DistributeBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rounds = BOARDS[variant.index] ?? (BOARDS[0] as readonly Round[]);
  return (
    <DistributeBuilderBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DistributeBuilderBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [xVal, setXVal] = useState("");
  const [cVal, setCVal] = useState("");
  const [xDone, setXDone] = useState(false);
  const [cDone, setCDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? rounds[0] ?? FALLBACK;
  const { factor, varSym, op, constMag } = round;
  const signedConst = op === "-" ? -constMag : constMag;
  const constProduct = factor * signedConst; // 10, then -12
  /** `2(n + 5)`, the expression this round distributes. */
  const factored = `${factor}(${varSym} ${op} ${constMag})`;

  const X_EXPECTED = normalize(`${factor}${varSym}`); // "2n", "3n"
  const C_EXPECTED = normalize(String(constProduct)); // "10", "-12"

  const solved = xDone && cDone;
  const isLastRound = roundIndex === lastIndex;

  /**
   * Which cell the reveal is about, and whether anything else is still outstanding.
   *
   * Both read live. `othersRemain` is false only on the reveal that explains the LAST open
   * cell of the LAST round, because that cell is the gate and handing the board back there
   * would be handing the gate over with it.
   */
  const explaining: "x" | "c" = xDone ? "c" : "x";
  const cellsOpen = (xDone ? 0 : 1) + (cDone ? 0 : 1);
  const othersRemain = cellsOpen > 1 || !isLastRound;

  function check() {
    setAttempted(true);
    const nextX = xDone || normalize(xVal) === X_EXPECTED;
    const nextC = cDone || normalize(cVal) === C_EXPECTED;
    setXDone(nextX);
    setCDone(nextC);
    // One badge per cell that just landed, so checking a second time is silent.
    if ((nextX && !xDone) || (nextC && !cDone)) {
      success();
    }
    if (nextX && nextC) {
      setFeedback(null);
      if (isLastRound && !done) {
        setDone(true);
        onSolved();
      }
      return;
    }
    const triedX = !nextX && xVal.trim() !== "";
    const triedC = !nextC && cVal.trim() !== "";
    setFeedback(
      triedX || triedC ? (
        <>
          Not quite. Multiply the <InlineMath latex={String(factor)} /> by each term inside,
          and mind the sign.
        </>
      ) : null,
    );
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setXVal("");
      setCVal("");
      setXDone(false);
      setCDone(false);
      setFeedback(null);
    }
  }

  /**
   * The reveal that lets the learner past: settle this round's cells, and either close the
   * board out or move them on to the round that is still owed.
   *
   * It deliberately does not skip the second round. A learner who was shown the first round's
   * product has been taught the move, not the sign rule the second round exists for, and the
   * shared layer opens the gate on this reveal anyway, so nothing is gained by taking the
   * negative round off them as well.
   */
  function reveal() {
    setXDone(true);
    setCDone(true);
    setFeedback(null);
    if (!isLastRound) {
      return;
    }
    setRevealed(true);
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  // Area-model geometry.
  const top = 44;
  const boxH = 64;
  const xW = 150;
  const cW = 110;
  const left = 110;
  const xMid = left + xW / 2;
  const cMid = left + xW + cW / 2;

  const constLabel =
    op === "-" ? `${factor} \\times (-${constMag})` : `${factor} \\times ${constMag}`;
  const cCellText = cDone ? String(constProduct) : UNKNOWN;
  const cResultText = cDone ? String(Math.abs(constProduct)) : UNKNOWN;

  return (
    <div className="lesson-interactive lesson-interactive--distribute">
      <svg
        viewBox="0 0 440 190"
        role="img"
        aria-label={`Distribute ${factor} times (${varSym} ${op === "-" ? "minus" : "plus"} ${constMag})`}
      >
        <title>Area model for {factored}</title>
        {/* factor on the left */}
        <SvgMath
          latex={String(factor)}
          x={left - 22}
          y={top + boxH / 2}
          fontSize={20}
          color={BRICK}
          w={60}
        />
        {/* term labels on top */}
        <SvgMath latex={varSym} x={xMid} y={top - 16} fontSize={17} color={LABEL} w={xW} />
        <SvgMath
          latex={`${op} ${constMag}`}
          x={cMid}
          y={top - 16}
          fontSize={17}
          color={LABEL}
          w={cW}
        />
        {/* variable-term cell */}
        <rect
          x={left}
          y={top}
          width={xW}
          height={boxH}
          fill={SIGNAL}
          fillOpacity={xDone ? 0.28 : 0.08}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={xDone ? X_EXPECTED : UNKNOWN}
          x={xMid}
          y={top + boxH / 2}
          fontSize={20}
          color={xDone ? LABEL : SOFT}
          w={xW}
        />
        {/* const cell */}
        <rect
          x={left + xW}
          y={top}
          width={cW}
          height={boxH}
          fill={CIVIC}
          fillOpacity={cDone ? 0.28 : 0.08}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={cCellText}
          x={cMid}
          y={top + boxH / 2}
          fontSize={20}
          color={cDone ? LABEL : SOFT}
          w={cW}
        />
        {/* assembled expression */}
        <SvgMath
          latex={`${factored} = ${xDone ? X_EXPECTED : UNKNOWN} ${op} ${cResultText}`}
          x={220}
          y={161}
          fontSize={20}
          color={solved ? CIVIC : LABEL}
        />
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with different factors
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next round: a negative term
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: SIGNAL }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${factor} \\times ${varSym} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={xDone ? X_EXPECTED : xVal}
              disabled={xDone}
              aria-label={`${factor} times ${varSym}`}
              onChange={(e) => setXVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              // Only the cell the passage is explaining is filled in; the other one is still
              // the learner's to produce, which is what `othersRemain` promised them.
              {...(explaining === "x" ? fill.entry(X_EXPECTED) : {})}
            />
          </div>
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${constLabel} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={cDone ? String(constProduct) : cVal}
              disabled={cDone}
              aria-label={`${factor} times ${op === "-" ? "negative " : ""}${constMag}`}
              onChange={(e) => setCVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              {...(explaining === "c" ? fill.entry(String(constProduct)) : {})}
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
        othersRemain={othersRemain}
        answer={
          explaining === "x" ? (
            <InlineMath latex={X_EXPECTED} />
          ) : (
            <InlineMath latex={String(constProduct)} />
          )
        }
        why={
          explaining === "x" ? (
            <>
              Distributing hands the factor outside to every term inside, one at a time. The
              first term is <InlineMath latex={varSym} /> on its own, so this cell is{" "}
              <InlineMath latex={`${factor} \\times ${varSym}`} />, and multiplying a number
              by a variable just writes them side by side: <InlineMath latex={X_EXPECTED} />
              . The area model says the same thing, since this cell is{" "}
              <InlineMath latex={String(factor)} /> tall and <InlineMath latex={varSym} />{" "}
              wide.
            </>
          ) : (
            <>
              The second term is{" "}
              <InlineMath latex={op === "-" ? `-${constMag}` : String(constMag)} />, and the
              sign belongs to the term it stands in front of, so it travels into the
              product: <InlineMath latex={`${constLabel} = ${constProduct}`} />.{" "}
              {op === "-" ? (
                <>
                  A positive factor times a negative term is negative, which is why the
                  expanded line reads{" "}
                  <InlineMath latex={`${X_EXPECTED} - ${Math.abs(constProduct)}`} /> rather
                  than a sum.
                </>
              ) : (
                <>
                  Both parts are positive here, so the expanded line reads{" "}
                  <InlineMath latex={`${X_EXPECTED} + ${constProduct}`} />.
                </>
              )}
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
            Distribute to every term inside:{" "}
            <InlineMath
              latex={`${factored} = ${X_EXPECTED} ${op} ${Math.abs(constProduct)}`}
            />
            .
          </>
        ) : (
          (feedback ?? "Type each product, then press Check.")
        )}
      </p>
    </div>
  );
}
