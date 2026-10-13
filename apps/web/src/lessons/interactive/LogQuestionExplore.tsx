import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/**
 * EL.3 slide 0: the question multiplication cannot answer, met before it has a name.
 *
 * The multiples on the strip open to show themselves written as repeated factors, and the
 * multiple the question asks about is deliberately NOT one of them, and neither is the CFU's.
 * So the answer is not on the board to be read off: it is reached by placing the missing
 * multiple in the pattern the opened ones establish, which is the reading the whole node rests
 * on. Board 2 offered 243 until 2026-07-31, which opened as five threes while the node's CFU
 * asked how many passes of tripling reach 243.
 *
 * Free exploration first, then one value produced. Two multiples have to be opened before the
 * question is asked, because a learner who answers from memory has not met the pattern the
 * next slide is about to name.
 */

interface Rung {
  /** The multiple, and how many factors of the base reach it. */
  value: number;
  factors: number;
}

interface Board {
  base: number;
  /** The multiples on offer, which never include the target. */
  strip: readonly Rung[];
  /** The multiple the question asks about, sitting inside the strip's range. */
  target: number;
  /** How many factors of the base reach the target. */
  answer: number;
  /** The two rungs the target sits between, for the reveal. */
  below: Rung;
  above: Rung;
}

const BOARDS: readonly Board[] = [
  {
    base: 2,
    strip: [
      { value: 2, factors: 1 },
      { value: 4, factors: 2 },
      { value: 8, factors: 3 },
      { value: 16, factors: 4 },
      { value: 64, factors: 6 },
    ],
    target: 32,
    answer: 5,
    below: { value: 16, factors: 4 },
    above: { value: 64, factors: 6 },
  },
  {
    base: 3,
    strip: [
      { value: 3, factors: 1 },
      { value: 9, factors: 2 },
      { value: 81, factors: 4 },
      { value: 729, factors: 6 },
    ],
    target: 27,
    answer: 3,
    below: { value: 9, factors: 2 },
    above: { value: 81, factors: 4 },
  },
];

/** How many multiples must be opened before the question is put. */
const EXPLORE_FLOOR = 2;

export function LogQuestionExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LogQuestionExploreBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

/** `2 \cdot 2 \cdot 2`, the multiple written out as the factors that build it. */
function product(base: number, factors: number): string {
  return Array.from({ length: factors }, () => `${base}`).join(" \\cdot ");
}

function LogQuestionExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [opened, setOpened] = useState<readonly number[]>([]);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const asking = opened.length >= EXPLORE_FLOOR;

  function open(rung: Rung) {
    if (opened.includes(rung.value)) {
      return;
    }
    // Appended from the previous value rather than from the `opened` this handler closed
    // over: two rungs opened inside one task share a render, and the second would otherwise
    // rebuild the list from a value that does not hold the first, dropping a reading the
    // learner asked for and holding the question shut behind the count.
    setOpened((prev) => (prev.includes(rung.value) ? prev : [...prev, rung.value]));
    setFeedback(null);
  }

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
    const read = readNumericEntry(typed, "integer");
    if (read.ok && read.value === board.answer) {
      finish(true);
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about opening the multiples, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    setFeedback(
      typed === ""
        ? "Enter how many factors it takes."
        : read.ok
          ? `Not that many. Open the multiples on either side of ${board.target} and count where it has to fall between them.`
          : WHOLE_NUMBER_MISS,
    );
  }

  function reveal() {
    setEntry(String(board.answer));
    setRevealed(true);
    finish(false);
  }

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <WidgetTask>
        Goal: open the multiples to see each one written as repeated factors, then say how
        many factors of <InlineMath latex={String(board.base)} /> multiply together to make{" "}
        <InlineMath latex={String(board.target)} />, which is not one of them.
      </WidgetTask>

      <div className="lesson-interactive__controls">
        {board.strip.map((rung) => (
          <button
            key={rung.value}
            type="button"
            className="lesson-interactive__chip"
            disabled={opened.includes(rung.value)}
            aria-label={
              opened.includes(rung.value)
                ? `${rung.value} is open`
                : `Open ${rung.value} to see its factors`
            }
            style={{
              color: LABEL,
              borderColor: opened.includes(rung.value) ? CIVIC : SOFT,
            }}
            onClick={() => open(rung)}
          >
            <InlineMath latex={String(rung.value)} />
          </button>
        ))}
      </div>

      <ul className="lesson-explore__readings">
        {board.strip
          .filter((rung) => opened.includes(rung.value))
          .map((rung) => (
            <li key={`read-${rung.value}`}>
              <InlineMath
                latex={`${rung.value} = ${product(board.base, rung.factors)}`}
                color={LABEL}
              />
            </li>
          ))}
      </ul>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different pair of numbers
        </button>
      ) : asking ? (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">
              factors of <InlineMath latex={String(board.base)} /> making{" "}
              <InlineMath latex={String(board.target)} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`How many factors of ${board.base} multiply to make ${board.target}`}
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
      ) : null}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={String(board.answer)} />}
        why={
          <>
            <InlineMath latex={String(board.below.value)} /> takes{" "}
            <InlineMath latex={String(board.below.factors)} /> factors and{" "}
            <InlineMath latex={String(board.above.value)} /> takes{" "}
            <InlineMath latex={String(board.above.factors)} />, so{" "}
            <InlineMath latex={String(board.target)} /> sits between them at{" "}
            <InlineMath latex={String(board.answer)} />:{" "}
            <InlineMath latex={`${product(board.base, board.answer)} = ${board.target}`} />.
            Dividing is no help here, because{" "}
            <InlineMath
              latex={`\\tfrac{${board.target}}{${board.base}} = ${board.target / board.base}`}
            />{" "}
            answers how many of them fit inside it rather than how many of them multiply
            together to make it.
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
            <InlineMath latex={`${product(board.base, board.answer)} = ${board.target}`} />,
            so the answer is <InlineMath latex={String(board.answer)} /> factors. That count
            is an exponent, and asking for it is a question none of the four operations
            answers.
          </>
        ) : feedback ? (
          feedback
        ) : asking ? (
          "The opened multiples fix the pattern. Place the one in the question inside it."
        ) : (
          `Open at least ${EXPLORE_FLOOR} of the multiples to see how each one is built.`
        )}
      </p>
    </div>
  );
}
