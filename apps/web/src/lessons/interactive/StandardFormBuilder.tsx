/**
 * POL.1 slide 4: assemble a finished product in standard form, highest power first.
 *
 * Two things go wrong at this point and neither is the multiplication. The first is leaving the
 * two cross terms uncollected, so the answer runs to four terms; the second is writing the
 * terms in the order they happened to be produced rather than in descending powers. So the tray
 * offers both uncollected strips AND their sum, and it offers them out of order, which makes
 * the second decision as live as the first.
 *
 * A refused tap says which of the two rules it broke rather than only that it was wrong, and
 * the board keeps every chip already placed, so a learner who orders correctly and then reaches
 * for an uncollected strip loses that tap and nothing else.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Chip {
  id: string;
  latex: string;
  spoken: string;
  /** The slot this chip belongs in, or null for a chip that belongs in none. */
  slot: number | null;
  /** Why a chip that belongs nowhere does not. */
  refusal?: ReactNode;
}

interface Board {
  /** The product being expanded, as $(ax + b)(cx + d)$. */
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Neither product is the slide's own $(2x + 3)(x + 4)$ nor the check's $(x + 6)(2x + 1)$. */
const BOARDS: readonly Board[] = [
  { a: 3, b: 2, c: 1, d: 5 },
  { a: 2, b: 5, c: 1, d: 3 },
];

export function StandardFormBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <StandardFormBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function StandardFormBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { a, b, c, d } = board;
  const lead = a * c;
  const outer = a * d;
  const inner = b * c;
  const middle = outer + inner;
  const constant = b * d;
  const given = `(${a}x + ${b})(${c === 1 ? "" : c}x + ${d})`;
  const answer = `${lead}x^{2} + ${middle}x + ${constant}`;

  const chips: readonly Chip[] = [
    {
      id: "outer",
      latex: `${outer}x`,
      spoken: `${outer} x`,
      slot: null,
      refusal: (
        <>
          That is one of the two strips on its own. Both of them are counted in{" "}
          <InlineMath latex="x" />, so they are like terms and a finished amount carries
          their sum rather than either of them separately.
        </>
      ),
    },
    { id: "const", latex: `${constant}`, spoken: `plain ${constant}`, slot: 2 },
    { id: "mid", latex: `${middle}x`, spoken: `${middle} x`, slot: 1 },
    {
      id: "inner",
      latex: `${inner}x`,
      spoken: `${inner} x`,
      slot: null,
      refusal: (
        <>
          That is the other strip on its own, and the same objection applies: it is a like
          term with <InlineMath latex={`${outer}x`} />, so the two collect into one before
          the amount is written down.
        </>
      ),
    },
    { id: "lead", latex: `${lead}x^{2}`, spoken: `${lead} x squared`, slot: 0 },
  ];

  const [placed, setPlaced] = useState(0);
  const [missed, setMissed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const slots: readonly Chip[] = [0, 1, 2]
    .map((index) => chips.find((chip) => chip.slot === index))
    .filter((chip): chip is Chip => Boolean(chip));
  const solved = placed >= slots.length;
  const wanted = slots[placed] ?? null;
  /** The chip the passage on screen has put in the open slot, for as long as it is up. */
  const givenChip = fill.given ? wanted : null;

  function advance(earned: boolean) {
    const next = placed + 1;
    setPlaced(next);
    setMissed(null);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= slots.length && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function take(chip: Chip) {
    if (solved || wanted === null) {
      return;
    }
    if (chip.id === wanted.id) {
      advance(true);
      return;
    }
    setMissed(chip.id);
    setFeedback(
      chip.slot === null ? (
        chip.refusal
      ) : (
        <>
          That term belongs in the finished amount, and not here. Standard form runs from
          the highest power down, so the slot still open is asking for{" "}
          {placed === 0
            ? "the squared term"
            : placed === 1
              ? "the term in x"
              : "the plain number"}
          .
        </>
      ),
    );
  }

  function reveal() {
    if (wanted === null) {
      return;
    }
    setRevealed(true);
    advance(false);
  }

  const tray = chips.filter(
    (chip) =>
      chip.id !== givenChip?.id &&
      !slots.slice(0, placed).some((filled) => filled.id === chip.id),
  );

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: write the finished product as a single amount, with every kind of term
        appearing once and the highest power first.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={`${given} =`} color={LABEL} />
      </p>

      <div className="lesson-interactive__controls">
        {slots.map((slot, index) => {
          const done = index < placed;
          const open = index === placed;
          return (
            <span
              key={slot.id}
              className="lesson-equation__slot"
              data-state={done ? "done" : open ? "open" : "waiting"}
              // A slot is a piece of the statement rather than a control, so it takes the
              // one role that carries an accessible name for a graphic.
              role="img"
              aria-label={
                done
                  ? `${slot.spoken}, placed`
                  : open && fill.given
                    ? `${slot.spoken} was given, not answered`
                    : `Slot ${index + 1}, still open`
              }
              style={{
                borderColor: done ? CIVIC : open ? LABEL : SOFT,
                borderStyle: open && fill.given ? "dashed" : "solid",
              }}
              {...fill.mark(open)}
            >
              {done || (open && fill.given) ? (
                <InlineMath latex={slot.latex} color={done ? CIVIC : LABEL} />
              ) : (
                <span style={{ color: SOFT }}>&#183;&#183;&#183;</span>
              )}
            </span>
          );
        })}
      </div>

      <div className="lesson-sorter__tray">
        {solved ? (
          <span className="lesson-sorter__tray-empty">Amount complete</span>
        ) : (
          tray.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-interactive__chip"
              aria-label={chip.spoken}
              style={{ color: LABEL, borderColor: missed === chip.id ? BRICK : SOFT }}
              onClick={() => take(chip)}
            >
              <InlineMath latex={chip.latex} />
            </button>
          ))
        )}
      </div>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different product
        </button>
      ) : null}

      {wanted !== null && (
        <WidgetReveal
          available={missed !== null}
          revealed={revealed}
          answer={<InlineMath latex={wanted.latex} />}
          why={
            placed === 0 ? (
              <>
                The squared term comes from the two <InlineMath latex="x" /> pieces meeting,
                so it is{" "}
                <InlineMath latex={`${a}x \\cdot ${c === 1 ? "" : c}x = ${lead}x^{2}`} />.
                Standard form puts the highest power first, which is why this slot is the
                one that opens.
              </>
            ) : placed === 1 ? (
              <>
                Two rectangles are counted in <InlineMath latex="x" />, namely{" "}
                <InlineMath latex={`${outer}x`} /> and <InlineMath latex={`${inner}x`} />,
                and they are like terms. Their coefficients add, so the middle term is{" "}
                <InlineMath latex={`${outer} + ${inner} = ${middle}`} /> lots of{" "}
                <InlineMath latex="x" />.
              </>
            ) : (
              <>
                The last piece is the two plain numbers meeting, so it is{" "}
                <InlineMath latex={`${b} \\cdot ${d} = ${constant}`} />. It carries no
                variable, which is what puts it at the end of a standard-form amount.
              </>
            )
          }
          onReveal={reveal}
          label="Reveal the next term"
          othersRemain={placed < slots.length - 1}
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : solved ? (
          <>
            <InlineMath latex={`${given} = ${answer}`} color={CIVIC} />. Four rectangles
            were produced and three terms were written, because the two strips were like
            terms and collected into one.
          </>
        ) : feedback ? (
          <span style={{ color: BRICK }}>{feedback}</span>
        ) : (
          <span style={{ color: SOFT }}>
            The slots fill from the left, and only one is open at a time.
          </span>
        )}
      </p>
    </div>
  );
}
