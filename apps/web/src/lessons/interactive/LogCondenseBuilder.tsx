/**
 * EL.5 interactive (slide 2): condensing a sum of logarithms, built factor by factor.
 *
 * The board is the three rules run backwards, and the one move that has to happen before any
 * gathering is the coefficient going back inside as an exponent. So the learner does not type
 * a finished expression: they say, for each term of the sum, WHICH factor that term
 * contributes to the single argument. A coefficient left as a coefficient then has nowhere to
 * go, and the mistake shows up as a chip that is wrong rather than as a sentence saying so.
 *
 * The tray is built out of the two ways that move goes wrong. Beside each correct factor sits
 * the same term with its coefficient left multiplying the variable, and the other term's
 * exponent transplanted onto this one, so a learner who has the rule but not the bookkeeping
 * has somewhere plausible to land. Every chip is drawn in one neutral token: the correctness
 * palette reports on the learner's pick and nothing else.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealAnchor,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

/** One term of the sum, and the factor it contributes to the condensed argument. */
interface Slot {
  /** The term as it appears in the sum being condensed. */
  term: string;
  /** The factor it becomes inside the single logarithm. */
  factor: string;
  /** That factor said in words, for the reveal and the slot's accessible name. */
  spoken: string;
  /** The variable it is built on, and the coefficient that has to move. */
  variable: string;
  coefficient: number;
}

interface Board {
  /** The whole sum, as LaTeX, shown above the scaffold. */
  sum: string;
  /** The finished single logarithm, printed only once the board is complete. */
  condensed: string;
  slots: readonly [Slot, Slot];
  options: readonly { id: string; latex: string; spoken: string }[];
}

/**
 * Two boards. The first moves one coefficient and leaves the other term bare, so the learner
 * meets the two cases side by side; the second moves both, with the two exponents swappable
 * between the terms, which is the bookkeeping slip the first board cannot test.
 */
const BOARDS: readonly Board[] = [
  {
    sum: "2 \\log m + \\log n",
    condensed: "\\log(m^{2} n)",
    slots: [
      {
        term: "2 \\log m",
        factor: "m^{2}",
        spoken: "m squared",
        variable: "m",
        coefficient: 2,
      },
      {
        term: "\\log n",
        factor: "n",
        spoken: "n",
        variable: "n",
        coefficient: 1,
      },
    ],
    options: [
      { id: "b0-2m", latex: "2m", spoken: "2 m" },
      { id: "b0-nsq", latex: "n^{2}", spoken: "n squared" },
      { id: "b0-msq", latex: "m^{2}", spoken: "m squared" },
      { id: "b0-2n", latex: "2n", spoken: "2 n" },
      { id: "b0-n", latex: "n", spoken: "n" },
      { id: "b0-m", latex: "m", spoken: "m" },
    ],
  },
  {
    sum: "3 \\log p + 4 \\log q",
    condensed: "\\log(p^{3} q^{4})",
    slots: [
      {
        term: "3 \\log p",
        factor: "p^{3}",
        spoken: "p cubed",
        variable: "p",
        coefficient: 3,
      },
      {
        term: "4 \\log q",
        factor: "q^{4}",
        spoken: "q to the fourth",
        variable: "q",
        coefficient: 4,
      },
    ],
    options: [
      { id: "b1-3p", latex: "3p", spoken: "3 p" },
      { id: "b1-q4", latex: "q^{4}", spoken: "q to the fourth" },
      { id: "b1-p4", latex: "p^{4}", spoken: "p to the fourth" },
      { id: "b1-4q", latex: "4q", spoken: "4 q" },
      { id: "b1-p3", latex: "p^{3}", spoken: "p cubed" },
      { id: "b1-q3", latex: "q^{3}", spoken: "q cubed" },
    ],
  },
];

export function LogCondenseBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LogCondenseBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LogCondenseBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** How many factors are settled. The open slot is always the next one along. */
  const [filled, setFilled] = useState(0);
  const [missed, setMissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const anchor = useRevealAnchor();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = filled >= board.slots.length;
  const openSlot = solved ? null : (board.slots[filled] as Slot);

  function advance(earned: boolean) {
    const next = filled + 1;
    setFilled(next);
    setMissed(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= board.slots.length && !done) {
      setDone(true);
      onSolved();
    }
  }

  function place(latex: string) {
    if (openSlot === null) {
      return;
    }
    if (latex === openSlot.factor) {
      setRevealed(false);
      advance(true);
      return;
    }
    // A fresh attempt, so the reveal steps aside and can be offered for the slot in hand.
    setRevealed(false);
    setMissed(true);
    setFeedback(
      "Not that one. Each factor inside the single logarithm comes from exactly one term of the sum, and a number in front of a logarithm has to arrive as an exponent on that term's own variable rather than as something multiplying it.",
    );
  }

  function reveal() {
    setRevealed(true);
    advance(false);
  }

  /** The slot the passage on screen is about: the open one, else the one just explained. */
  const explainedIndex = revealed ? filled - 1 : filled;

  function slotView(slot: Slot, index: number) {
    if (index < filled) {
      return (
        <span
          key={slot.term}
          className="lesson-equation__slot lesson-equation__slot--done"
          style={{ color: CIVIC }}
        >
          <InlineMath latex={slot.factor} color={CIVIC} />
          <span className="visually-hidden">{`, ${slot.spoken}`}</span>
        </span>
      );
    }
    if (index > filled) {
      return (
        <span
          key={slot.term}
          className="lesson-equation__slot lesson-equation__slot--locked"
          style={{ color: SOFT }}
        >
          <span className="visually-hidden">
            {`A factor still to be decided, from the term in ${slot.variable}`}
          </span>
        </span>
      );
    }
    return (
      <span
        key={slot.term}
        className="lesson-equation__slot"
        style={{ color: missed ? BRICK : LABEL }}
        {...anchor(index === explainedIndex)}
        {...fill.mark(true)}
      >
        {fill.given ? (
          <>
            <InlineMath latex={slot.factor} color={LABEL} />
            <span className="visually-hidden">
              {`, ${slot.spoken}, given rather than answered`}
            </span>
          </>
        ) : (
          <span className="visually-hidden">
            {`The factor the term in ${slot.variable} contributes goes here`}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: rebuild <InlineMath latex={board.sum} /> as one logarithm by saying what each
        term of the sum contributes to the single argument, and work out what has to happen
        to a coefficient before it is allowed inside.
      </WidgetTask>

      <div className="lesson-interactive__controls">
        <InlineMath latex={`${board.sum} \\; = \\; \\log \\bigl(`} color={LABEL} />
        {slotView(board.slots[0], 0)}
        <InlineMath latex="\cdot" color={LABEL} />
        {slotView(board.slots[1], 1)}
        <InlineMath latex="\bigr)" color={LABEL} />
      </div>

      <div className="lesson-sorter__tray">
        {solved ? (
          <span className="lesson-sorter__tray-empty">Both factors placed</span>
        ) : (
          board.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="lesson-sorter__chip"
              aria-label={option.spoken}
              style={{ color: LABEL, borderColor: SOFT }}
              onClick={() => place(option.latex)}
            >
              <InlineMath latex={option.latex} />
            </button>
          ))
        )}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different sum
        </button>
      )}

      <WidgetReveal
        available={missed && !solved}
        revealed={revealed}
        answer={openSlot === null ? null : <InlineMath latex={openSlot.factor} />}
        why={
          openSlot === null ? null : openSlot.coefficient === 1 ? (
            <>
              <InlineMath latex={openSlot.term} /> has nothing in front of it, so its
              argument goes inside exactly as it stands. Only a coefficient has to be dealt
              with first, and there is none here to deal with.
            </>
          ) : (
            <>
              <InlineMath latex={openSlot.term} /> is{" "}
              <InlineMath latex={openSlot.variable} /> counted{" "}
              <InlineMath latex={`${openSlot.coefficient}`} /> times over as a sum of
              logarithms, and a repeated sum of logarithms is a repeated multiplication
              inside one:{" "}
              <InlineMath latex={`${openSlot.term} = \\log(${openSlot.factor})`} />. So the
              coefficient arrives as the exponent, not as a multiplier.
            </>
          )
        }
        onReveal={reveal}
        label="Reveal this factor"
        // The last slot IS the gate, so handing that one back would hand the gate over.
        othersRemain={filled + 1 < board.slots.length}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : solved ? (
          <>
            <InlineMath latex={`${board.sum} = ${board.condensed}`} />. Every coefficient
            went inside as an exponent first, and only then did the sum become one logarithm
            of a product.
          </>
        ) : feedback ? (
          feedback
        ) : openSlot === null ? null : (
          <>
            The open slot takes whatever <InlineMath latex={openSlot.term} /> contributes to
            the argument.
          </>
        )}
      </p>
    </div>
  );
}
