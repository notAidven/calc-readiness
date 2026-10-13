/**
 * RAD.3 interactive (slide 4): the reverse conversion, run as a DISCRIMINATE-then-build.
 * Given the q-th root of x^p, the learner first has to tell the right exponent from its
 * p/q swap, which is the misconception this direction actually produces: the two options
 * differ only in which number is on top, so a learner who is copying rather than reasoning
 * has a coin flip and is told so. Only after the call do they build the exponent by typing
 * the numerator and denominator. Round 1 is the square root of x^5; round 2 is the fourth
 * root of x^3. Neither is the worked example directly above, which is the cube root of x^5:
 * a board that repeats it has printed its own p/q call. Both option chips carry the same
 * neutral token. Gates once both rounds are called and built.
 *
 * Each correct call and each correct box fires the shared success state. A learner who
 * cannot tell the exponent from its swap, or cannot place the two numbers, may reveal the
 * step after a real attempt; the reveal explains which number does which job, fills it in
 * and opens the gate, and it stays silent because nothing was answered.
 *
 * ## Each box is answered on its own
 *
 * One button builds the exponent, because the numerator and the denominator are two halves of
 * ONE conversion rather than two questions. What used to be shared with it was the ANSWER: a
 * learner with the numerator right and the denominator wrong was told "Not quite. The power
 * sitting under the root goes on top, and the index of the root goes on the bottom", which
 * restates the method at both boxes and names neither, while the box that had landed only went
 * dim. So each box now carries its own verdict and its own sentence about what was typed into
 * it. Neither field carries a hue of its own any more either: they were CIVIC and BRICK, the
 * two ends of the correctness palette, on boxes that had not been answered yet.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import {
  type PartVerdict,
  partName,
  WidgetPartNote,
  WidgetPartVerdict,
} from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/** "square root", "cube root", "fourth root": never "3th root". */
function rootName(q: number): string {
  const named: Record<number, string> = {
    2: "square root",
    3: "cube root",
    4: "fourth root",
    5: "fifth root",
  };
  return named[q] ?? `root of index ${q}`;
}

interface Round {
  /** Power under the root = exponent numerator. */
  p: number;
  /** Root index = exponent denominator. */
  q: number;
}

/** The two boxes of the build stage, in the order they are drawn. */
const BOXES = ["num", "den"] as const;
type Box = (typeof BOXES)[number];

const NOTHING_CHECKED: Record<Box, PartVerdict | null> = { num: null, den: null };

/**
 * Two sets of two roots. Each set keeps one round with the power above the index and one
 * with it below, so the p/q call cannot be settled by size alone. "Start over" hands out
 * the set the learner has NOT just called.
 *
 * The opening round used to be the cube root of x^5, which is the worked example on this
 * slide, so the p/q call and both boxes were printed above the board. It keeps the power
 * above the index, which is the property this set needs from its first round.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { p: 5, q: 2 },
    { p: 3, q: 4 },
  ],
  [
    { p: 4, q: 5 },
    { p: 7, q: 2 },
  ],
];

export function ExponentFormBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <ExponentFormBuilderBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ExponentFormBuilderBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [called, setCalled] = useState(false);
  const [numVal, setNumVal] = useState("");
  const [denVal, setDenVal] = useState("");
  const [numDone, setNumDone] = useState(false);
  const [denDone, setDenDone] = useState(false);
  const [marks, setMarks] = useState<Record<Box, PartVerdict | null>>(NOTHING_CHECKED);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const isLastRound = roundIndex === lastIndex;
  const solved = called && numDone && denDone;

  /** The two chips are the exponent and its p/q swap, shown in a fixed order. */
  const swapFirst = round.p > round.q;

  function closeRound() {
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function call(choseCorrect: boolean) {
    if (called) {
      return;
    }
    setAttempted(true);
    if (choseCorrect) {
      setCalled(true);
      setFeedback(null);
      success();
      return;
    }
    setFeedback(
      `Not quite. That one is the swap. The power under the root is ${round.p}, and it goes on top; the index of the root is ${round.q}, and it goes on the bottom.`,
    );
  }

  /**
   * A box's verdict after a check: right once it has landed, and NOT WRONG while it is empty,
   * because an unanswered box is unanswered rather than incorrect.
   */
  function markFor(landed: boolean, typed: string): PartVerdict | null {
    return landed ? "right" : typed.trim() === "" ? null : "wrong";
  }

  function check() {
    setAttempted(true);
    // Plain entry takes anything, so each box is read before it is compared: a non-number
    // is a miss the note under the row names, not a NaN that reaches the comparison.
    const numRead = readNumericEntry(numVal, "integer");
    const denRead = readNumericEntry(denVal, "integer");
    const nextNum = numDone || (numRead.ok && numRead.value === round.p);
    const nextDen = denDone || (denRead.ok && denRead.value === round.q);
    // One tone per box that has just landed, so a half-right build is half confirmed.
    if (nextNum && !numDone) {
      success();
    }
    if (nextDen && !denDone) {
      success();
    }
    setNumDone(nextNum);
    setDenDone(nextDen);
    // And one verdict per box, from the one press, so a half-right build is not answered as a
    // whole miss.
    setMarks({ num: markFor(nextNum, numVal), den: markFor(nextDen, denVal) });
    if (nextNum && nextDen) {
      setFeedback(null);
      closeRound();
    }
  }

  /** Type into one box, which retires its verdict: that was about the previous entry. */
  function typeInto(box: Box, raw: string) {
    if (box === "num") {
      setNumVal(raw);
    } else {
      setDenVal(raw);
    }
    setMarks((prev) => (prev[box] === null ? prev : { ...prev, [box]: null }));
  }

  function reveal() {
    setCalled(true);
    setNumDone(true);
    setDenDone(true);
    setRevealed(true);
    setFeedback(null);
    // Handed answers earn no verdict either way: nothing was answered.
    setMarks(NOTHING_CHECKED);
    closeRound();
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setCalled(false);
      setNumVal("");
      setDenVal("");
      setNumDone(false);
      setDenDone(false);
      setMarks(NOTHING_CHECKED);
      setAttempted(false);
      setRevealed(false);
      setFeedback(null);
    }
  }

  const neutral = { color: LABEL, borderColor: LINE };
  const builtLatex = `x^{\\frac{${numDone ? round.p : "?"}}{${denDone ? round.q : "?"}}}`;

  /**
   * The answer to ONE missed box, in the number that box actually holds. Both branches name a
   * quantity on screen rather than restating which number does which job.
   */
  function boxNote(box: Box, raw: string): ReactNode {
    // Plain entry takes anything, so a non-number is its own miss rather than reaching the
    // sentences below as a NaN and being printed back at the learner. The floor the box's
    // `min` used to carry is checked here too, now that the attribute has gone with the
    // spinner: a numerator is a power, so 1 or more, and a denominator is a root index.
    const read = readNumericEntry(raw, "integer");
    if (!read.ok) {
      return WHOLE_NUMBER_MISS;
    }
    const floor = box === "num" ? 1 : 2;
    if (read.value < floor) {
      return box === "num" ? (
        <>The power sitting under the root is 1 or more, so the top of the exponent is.</>
      ) : (
        <>An index names which root it is, so it is 2 or more, and so is the bottom.</>
      );
    }
    const typed = read.value;
    const other = box === "num" ? round.q : round.p;
    if (typed === other) {
      return box === "num" ? (
        <>
          That <InlineMath latex={`${typed}`} /> is the index of the root, and an index
          names the root, so it is the bottom of the exponent.
        </>
      ) : (
        <>
          That <InlineMath latex={`${typed}`} /> is the power sitting under the root, and an
          ordinary power is the top of the exponent.
        </>
      );
    }
    return (
      <>
        <InlineMath latex={`\\sqrt[${round.q}]{x^{${round.p}}}`} /> has only{" "}
        <InlineMath latex={`${round.p}`} /> and <InlineMath latex={`${round.q}`} /> in it,
        and this box has <InlineMath latex={`${typed}`} />.
      </>
    );
  }

  /** One box, its verdict, and the sentence answering it. */
  function buildRow(box: Box) {
    const isNum = box === "num";
    const landed = isNum ? numDone : denDone;
    const typed = isNum ? numVal : denVal;
    const verdict = marks[box];
    return (
      <div key={box} className="lesson-interactive__row">
        {/* Ink, not CIVIC or BRICK: those are this app's correctness channel, and drawing an
            unanswered box in either end of it said something about an answer nobody gave. */}
        <div className="lesson-interactive__field" style={{ color: LABEL }}>
          <span className="lesson-interactive__field-label">
            {isNum ? "Exponent numerator =" : "Exponent denominator ="}
          </span>
          <input
            className="lesson-interactive__input"
            {...numericEntryProps("integer")}
            value={landed ? String(isNum ? round.p : round.q) : typed}
            disabled={landed}
            aria-label={partName(
              isNum ? "Exponent numerator" : "Exponent denominator",
              verdict,
            )}
            onChange={(e) => typeInto(box, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                check();
              }
            }}
            // Last, so the answer overrides whatever the learner typed for as long as the
            // reveal is up. This reveal explains the WHOLE exponent, so both boxes are
            // filled, each with the number `check` grades it against: the power under the
            // root on top, the index of the root underneath.
            {...fill.entry(isNum ? round.p : round.q)}
          />
        </div>
        {verdict !== null && <WidgetPartVerdict verdict={verdict} />}
        {verdict === "wrong" && <WidgetPartNote>{boxNote(box, typed)}</WidgetPartNote>}
      </div>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Turn this root back into a single fraction exponent, and get its two numbers the
        right way up: swapping them names a different number rather than the same one
        written differently.
      </WidgetTask>

      <svg
        viewBox="0 0 440 148"
        role="img"
        aria-label={`The ${rootName(round.q)} of x to the ${round.p}, beside the fraction exponent being built from it`}
      >
        <title>Build the rational-exponent form of a radical</title>

        <text x={220} y={22} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`\\sqrt[${round.q}]{x^{${round.p}}}`}
          x={116}
          y={78}
          fontSize={24}
          color={LABEL}
          w={160}
          h={76}
        />

        <SvgMath latex="=" x={200} y={78} fontSize={20} color={SOFT} w={40} />

        <SvgMath
          latex={called ? builtLatex : "x^{\\frac{?}{?}}"}
          x={300}
          y={78}
          fontSize={24}
          color={solved ? CIVIC : SOFT}
          w={180}
          h={76}
        />
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with two new roots
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new root
          </button>
        )
      ) : !called ? (
        // Both chips carry the same neutral token, so colour never marks the answer. Which
        // one is the true form is now said outright rather than left to the reader of
        // `swapFirst`, because the fill has to dash exactly that one: it is the chip `call`
        // accepts and the exponent the reveal's own `answer` prints.
        <div className="lesson-interactive__controls">
          {[swapFirst, !swapFirst].map((isTrueForm) => (
            <button
              key={isTrueForm ? "true-form" : "swap"}
              type="button"
              className="lesson-interactive__step"
              style={{
                ...neutral,
                borderColor: isTrueForm && fill.given ? SIGNAL_DEEP : LINE,
                borderStyle: isTrueForm && fill.given ? "dashed" : "solid",
              }}
              onClick={() => call(isTrueForm)}
              {...fill.mark(isTrueForm)}
            >
              <InlineMath
                latex={
                  isTrueForm
                    ? `x^{\\frac{${round.p}}{${round.q}}}`
                    : `x^{\\frac{${round.q}}{${round.p}}}`
                }
              />
            </button>
          ))}
        </div>
      ) : (
        // Stacked, one row per box, so each box's verdict and each box's answer sit with the
        // box they are about. One button still: the two numbers are one conversion.
        <div className="lesson-interactive__rows">
          {BOXES.map((box) => buildRow(box))}
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Build the exponent
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={`x^{\\frac{${round.p}}{${round.q}}}`} />}
        why={
          <>
            The two numbers are doing different jobs, so their places are not
            interchangeable. The index of the root is <InlineMath latex={`${round.q}`} />,
            and an index is what names a root, so it becomes the bottom of the exponent,
            exactly as <InlineMath latex="x^{1/q} = \sqrt[q]{x}" /> had it. The power
            sitting under the root is <InlineMath latex={`${round.p}`} />, which is an
            ordinary power, so it becomes the top. Swapping them would name{" "}
            <InlineMath latex={`x^{\\frac{${round.q}}{${round.p}}}`} />, which is a
            different number rather than a differently written one.
          </>
        }
        onReveal={reveal}
        // This reveal explains the WHOLE round — the call and both boxes — so nothing is left
        // of it afterwards and what remains is the rounds after it. False on the last round,
        // where the board is the gate and handing it back would hand that over.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath
              latex={`\\sqrt[${round.q}]{x^{${round.p}}} = x^{\\frac{${round.p}}{${round.q}}}`}
            />
            . The power under the root goes on top and the index goes on the bottom. Swap
            them and you have named a different number, not the same one written
            differently.
          </>
        ) : (
          (feedback ??
          (called
            ? "That is the right one. Now build it by typing the top number and then the bottom number."
            : "These two differ only in which number is on top, so only one of them is this root. Which one?"))
        )}
      </p>
    </div>
  );
}
