/**
 * NUM.S interactive (slide 3): fill in the sign table for multiply and divide.
 *
 * The 2x2 grid is the picture this idea wants: all four sign pairs on screen at once, so
 * "same signs" and "different signs" are two halves of one board rather than four
 * unrelated facts. One cell arrives already worked, as the pattern; the other three are
 * the learner's.
 *
 * A wrong call LOCKS that cell rather than letting the learner take the other chip, which
 * is the only thing that makes a two-option call a question. The gate opens on a clean
 * board, a missed board rotates to a different worked cell, and a locked miss can be
 * revealed with the reasoning that produces its sign.
 *
 * The caption under the grid counts progress and states the rule only once the board is
 * finished. The version this replaces printed "same to +, different to -" the whole time,
 * which was fair when every cell was a tap-to-reveal and is the answer key now.
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

type Sign = "+" | "-";
type Cell = readonly [Sign, Sign];

const SIGNS: readonly Sign[] = ["+", "-"];
const resultSign = (a: Sign, b: Sign): Sign => (a === b ? "+" : "-");
const keyOf = ([a, b]: Cell) => `${a}${b}`;
/** Spoken form, so a sign chip has an accessible name KaTeX cannot give it. */
const spoken = (s: Sign) => (s === "+" ? "positive" : "negative");

/** Row-major, which is also the order the blanks are asked in. */
const CELLS: readonly Cell[] = SIGNS.flatMap((row) =>
  SIGNS.map((col) => [row, col] as Cell),
);

/** Which cell arrives already worked. All four corners rotate so a restart is never a replay. */
const BOARDS: readonly Cell[] = CELLS;

const CELL = 56;
const GX = 176;
const GY = 54;

export function SignRulesTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const given = BOARDS[variant.index] ?? (BOARDS[0] as Cell);
  return (
    <SignRulesTableBody
      key={variant.nonce}
      given={given}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function SignRulesTableBody({
  given,
  onSolved,
  onRestart,
}: {
  given: Cell;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [calls, setCalls] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  /** The cell the reveal is speaking about: the most recent wrong call. */
  const [missedKey, setMissedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const givenKey = keyOf(given);
  const blanks = CELLS.filter((cell) => keyOf(cell) !== givenKey);
  const open = blanks.find((cell) => calls[keyOf(cell)] === undefined) ?? null;
  const complete = open === null;
  const missed = Object.values(calls).some((hit) => !hit);
  const solved = complete && !missed;
  const pending = CELLS.find((cell) => keyOf(cell) === missedKey) ?? null;

  function answer(guess: Sign) {
    if (open === null) {
      return;
    }
    const res = resultSign(open[0], open[1]);
    const hit = guess === res;
    const next = { ...calls, [keyOf(open)]: hit };
    setCalls(next);
    if (!hit) {
      setMissedKey(keyOf(open));
      setFeedback(
        res === "+"
          ? "Not quite. Those two signs match, so that cell is locked as a miss."
          : "Not quite. Those two signs differ, so that cell is locked as a miss.",
      );
      return;
    }
    setFeedback(null);
    success();
    if (
      Object.keys(next).length === blanks.length &&
      Object.values(next).every(Boolean) &&
      !done
    ) {
      setDone(true);
      onSolved();
    }
  }

  /**
   * Write one missed cell in. The wrong call already settled it, so this adds the
   * reasoning and the sign; it deliberately leaves the miss standing.
   */
  function revealCell() {
    if (pending === null) {
      return;
    }
    setShown((prev) => ({ ...prev, [keyOf(pending)]: true }));
    setFeedback(null);
  }

  const filled = Object.keys(calls).length;
  const caption = solved
    ? "\\text{same signs} \\to +, \\quad \\text{different signs} \\to -"
    : `${filled} \\text{ of } ${blanks.length} \\text{ filled}`;

  return (
    <div className="lesson-interactive lesson-interactive--sign-rules">
      <svg
        viewBox="0 0 440 200"
        role="img"
        aria-label="Sign rules grid for multiply or divide"
      >
        <title>Sign rules for multiplication and division</title>
        <SvgMath
          latex="\times \; \div"
          x={GX - 18}
          y={GY - 17}
          fontSize={13}
          color={SOFT}
          w={80}
        />
        {SIGNS.map((colSign, c) => (
          <SvgMath
            key={`col-${colSign}`}
            latex={colSign}
            x={GX + c * CELL + CELL / 2}
            y={GY - 18}
            fontSize={16}
            color={LABEL}
            w={CELL}
          />
        ))}
        {SIGNS.map((rowSign, r) => (
          <SvgMath
            key={`row-${rowSign}`}
            latex={rowSign}
            x={GX - 18}
            y={GY + r * CELL + CELL / 2}
            fontSize={16}
            color={LABEL}
            w={CELL}
          />
        ))}
        {SIGNS.map((rowSign, r) =>
          SIGNS.map((colSign, c) => {
            const key = `${rowSign}${colSign}`;
            const res = resultSign(rowSign, colSign);
            const color = res === "+" ? CIVIC : BRICK;
            const call = calls[key];
            const isMiss = call === false;
            // Written in once the cell is settled: the worked cell arrives that way, a
            // correct call earns it, and a reveal fills it after a miss.
            const settled = key === givenKey || call === true || (isMiss && shown[key]);
            const isOpen = open !== null && keyOf(open) === key;
            return (
              <g key={key}>
                <rect
                  x={GX + c * CELL}
                  y={GY + r * CELL}
                  width={CELL}
                  height={CELL}
                  rx={8}
                  fill={settled ? color : "var(--paper)"}
                  fillOpacity={settled ? 0.16 : 1}
                  // A miss is carried by a dashed edge rather than by red, because red is
                  // already this grid's way of saying "negative".
                  stroke={isMiss ? BRICK : settled ? color : isOpen ? SIGNAL : LINE}
                  strokeWidth={isOpen ? 3 : 1.5}
                  strokeDasharray={isMiss ? "5 3" : undefined}
                />
                <SvgMath
                  latex={settled ? res : "?"}
                  x={GX + c * CELL + CELL / 2}
                  y={GY + r * CELL + CELL / 2}
                  fontSize={24}
                  color={settled ? color : SOFT}
                  w={CELL}
                />
              </g>
            );
          }),
        )}
        <SvgMath
          latex={caption}
          x={220}
          y={GY + 2 * CELL + 24}
          fontSize={12}
          color={SOFT}
        />
      </svg>

      <div className="lesson-interactive__controls">
        {complete ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {missed ? "Try a fresh table" : "New table"}
          </button>
        ) : (
          // Both chips carry the same neutral token. The version this replaces coloured
          // each sign-pair button by its own result, which printed the answer on it.
          SIGNS.map((sign) => (
            <button
              key={sign}
              type="button"
              className="lesson-interactive__chip"
              style={{
                color: LABEL,
                borderColor: LINE,
                minWidth: 64,
                justifyContent: "center",
              }}
              aria-label={spoken(sign)}
              onClick={() => answer(sign)}
            >
              <InlineMath latex={sign} />
            </button>
          ))
        )}
      </div>

      <WidgetReveal
        available={pending !== null}
        revealed={missedKey !== null && shown[missedKey] === true}
        answer={
          pending === null ? null : (
            <InlineMath
              latex={`(${pending[0]})(${pending[1]}) \\to ${resultSign(pending[0], pending[1])}`}
            />
          )
        }
        why={pending === null ? null : whyCell(pending)}
        onReveal={revealCell}
        label="Reveal this cell"
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed || feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Same signs give a positive, different signs give a negative. It holds for
            division too, since dividing by a number is multiplying by its reciprocal, which
            carries the same sign.
          </>
        ) : complete && missed ? (
          "A clean table is every call right. Ask whether the two signs match, and take a fresh table."
        ) : (
          (feedback ?? (
            <>
              One cell is worked for you. Decide the sign the highlighted cell comes to,
              then the next.
            </>
          ))
        )}
      </p>
    </div>
  );
}

/**
 * Why a cell comes out the sign it does, argued on 4 and 3 rather than asserted. The
 * negative-times-negative case is the one nobody has a reason to believe, so it gets the
 * pattern argument rather than a restatement of the rule.
 */
function whyCell([row, col]: Cell) {
  const res = resultSign(row, col);
  if (row === "+" && col === "+") {
    return (
      <>
        <InlineMath latex="(+4)(+3)" /> is four copies of <InlineMath latex="3" />, which is{" "}
        <InlineMath latex="12" />. Nothing pulls the total below zero, so two positives give
        a <strong>positive</strong>.
      </>
    );
  }
  if (res === "-") {
    const product = row === "-" ? "(-4)(+3)" : "(+4)(-3)";
    const copies =
      row === "-"
        ? "three copies of -4 added together"
        : "four copies of -3 added together";
    return (
      <>
        <InlineMath latex={product} /> is {copies}, and every copy pulls the same way down
        the line, so the total is <InlineMath latex="-12" />. Signs that differ leave one
        factor pointing backwards, which is why the product is <strong>negative</strong>.
      </>
    );
  }
  return (
    <>
      Step the times table for <InlineMath latex="-4" /> down one at a time:{" "}
      <InlineMath latex="(-4)(2) = -8" />, <InlineMath latex="(-4)(1) = -4" />,{" "}
      <InlineMath latex="(-4)(0) = 0" />. Every line adds <InlineMath latex="4" /> to the
      one above, and the step does not change just because the second factor has gone below
      zero, so the next line is <InlineMath latex="(-4)(-1) = 4" />. Two negatives give a{" "}
      <strong>positive</strong>, and it comes out of continuing the pattern rather than out
      of a rule somebody decided.
    </>
  );
}
