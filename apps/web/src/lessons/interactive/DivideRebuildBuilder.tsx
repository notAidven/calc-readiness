/**
 * POL.8 slide 0: rebuild a dividend out of the three things a division reports.
 *
 * The four names are usually met as a list and forgotten as one. What makes them stick is the
 * statement that binds them, so the interaction is to assemble that statement rather than to
 * recite it: divisor times quotient, plus remainder, is the dividend. Building it is also the
 * audit the slide asks for, which means the learner leaves the board holding the check rather
 * than a vocabulary list.
 *
 * The tray offers a plausible wrong assembly at every position, and refusing one names which
 * of the four quantities it was, so a wrong tap is answered by the statement rather than by a
 * verdict.
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

interface Board {
  /** Dividend $= (x + p)(x + q) + r$. */
  p: number;
  q: number;
  r: number;
}

/**
 * Neither board is the slide's own $x^{2} + 7x + 12$ divided by $x + 2$ with remainder $2$.
 *
 * Board 2 was re-opened as a possible repeat and SETTLED as a near-miss, so the reasoning is
 * here rather than in a report nobody reads next round. Its bracket pair is the slide's pair
 * swapped, and $(x + 5)(x + 2)$ is the product the worked example's step 4 prints as
 * $x^{2} + 7x + 10$. That is a shared SHAPE and not a shared instance, on three counts: the
 * board audits $x^{2} + 7x + 17 \div (x + 5)$ against the slide's $x^{2} + 7x + 12 \div
 * (x + 2)$, its remainder is $7$ against $2$, and the swap puts $x + 5$ in the DIVISOR role
 * the slide gave to $x + 2$. This board asks which chip is which and never asks for that
 * product at all. So a learner arriving with the worked
 * example memorised gets board 2 wrong, which is the tell that it is a fresh audit rather
 * than the same one twice.
 */
const BOARDS: readonly Board[] = [
  { p: 3, q: 6, r: 4 },
  { p: 5, q: 2, r: 7 },
];

interface Chip {
  id: string;
  latex: string;
  spoken: string;
  slot: number | null;
  refusal?: ReactNode;
}

export function DivideRebuildBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <DivideRebuildBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DivideRebuildBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { p, q, r } = board;
  const dividend = `x^{2} + ${p + q}x + ${p * q + r}`;
  const divisor = `x + ${p}`;
  const quotient = `x + ${q}`;

  const chips: readonly Chip[] = [
    { id: "rem", latex: `${r}`, spoken: `the remainder ${r}`, slot: 2 },
    { id: "divisor", latex: divisor, spoken: `x plus ${p}`, slot: 0 },
    { id: "quotient", latex: quotient, spoken: `x plus ${q}`, slot: 1 },
    {
      id: "dividend",
      latex: dividend,
      spoken: "the dividend itself",
      slot: null,
      refusal: (
        <>
          That is the dividend, which is what the whole statement rebuilds. It sits on the
          left of the equals sign and cannot also appear on the right.
        </>
      ),
    },
    {
      id: "product",
      latex: `${p * q + r}`,
      spoken: `the constant ${p * q + r}`,
      slot: null,
      refusal: (
        <>
          <InlineMath latex={`${p * q + r}`} /> is the dividend's own constant term, and it
          is bigger than the remainder because the product{" "}
          <InlineMath latex={`${p} \\times ${q}`} /> contributes to it as well. A remainder
          is what is left after the product has been taken out.
        </>
      ),
    },
  ];

  const slots: readonly Chip[] = [0, 1, 2]
    .map((index) => chips.find((chip) => chip.slot === index))
    .filter((chip): chip is Chip => Boolean(chip));
  const stages = ["divisor", "quotient", "remainder"];

  const [placed, setPlaced] = useState(0);
  const [missed, setMissed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = placed >= slots.length;
  const wanted = slots[placed] ?? null;
  const givenChip = fill.given ? wanted : null;

  function advance(earned: boolean) {
    const next = placed + 1;
    setPlaced(next);
    setMissed(null);
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
  }

  const missChip = chips.find((chip) => chip.id === missed) ?? null;
  const tray = chips.filter(
    (chip) =>
      chip.id !== givenChip?.id &&
      !slots.slice(0, placed).some((filled) => filled.id === chip.id),
  );

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: rebuild the dividend from the three quantities a division reports, so the
        statement on screen is the audit a yard would run.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath
          latex={`${dividend} \\div (${divisor}) \\;\\text{ leaves a remainder of } ${r}`}
          color={LABEL}
        />
      </p>

      <div className="lesson-interactive__controls">
        <InlineMath latex={`${dividend} =`} color={LABEL} />
        {slots.map((slot, index) => {
          const done = index < placed;
          const open = index === placed;
          return (
            <span key={slot.id} style={{ display: "inline-flex", alignItems: "center" }}>
              {index === 2 ? <InlineMath latex="+" color={LABEL} /> : null}
              {index === 1 ? <InlineMath latex="\times" color={LABEL} /> : null}
              <span
                className="lesson-equation__slot"
                data-state={done ? "done" : open ? "open" : "waiting"}
                // A slot is a piece of the statement rather than a control, so it takes the
                // one role that carries an accessible name for a graphic.
                role="img"
                aria-label={
                  done
                    ? `${stages[index]}, placed`
                    : open && fill.given
                      ? `the ${stages[index]} was given, not answered`
                      : `the ${stages[index]}, still open`
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
                  <span style={{ color: SOFT }}>{stages[index]}</span>
                )}
              </span>
            </span>
          );
        })}
      </div>

      <div className="lesson-sorter__tray">
        {solved ? (
          <span className="lesson-sorter__tray-empty">Statement complete</span>
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
          Start over with a different division
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
                The divisor is the amount being divided BY, and here that is{" "}
                <InlineMath latex={divisor} />. It multiplies the quotient in the statement,
                which is why it takes the first position.
              </>
            ) : placed === 1 ? (
              <>
                The quotient is the whole count the division produced, and multiplying it by
                the divisor gives <InlineMath latex={`x^{2} + ${p + q}x + ${p * q}`} />.
                That is the dividend short by exactly the remainder, which is what the last
                position supplies.
              </>
            ) : (
              <>
                The remainder is what the divisor could not reach, and adding it closes the
                gap: <InlineMath latex={`${p * q} + ${r} = ${p * q + r}`} />. A remainder is
                always smaller in degree than the divisor, which is why this one is a plain
                number.
              </>
            )
          }
          onReveal={() => {
            setRevealed(true);
            advance(false);
          }}
          label="Reveal the next quantity"
          othersRemain={placed < slots.length - 1}
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missChip ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : solved ? (
          <>
            <InlineMath
              latex={`${dividend} = (${divisor})(${quotient}) + ${r}`}
              color={CIVIC}
            />
            . Multiplying the right-hand side out returns the dividend exactly, which is the
            check to reach for whenever a division looks wrong.
          </>
        ) : missChip ? (
          <span style={{ color: BRICK }}>
            {missChip.refusal ?? "That one belongs elsewhere in the statement."}
          </span>
        ) : (
          <span style={{ color: SOFT }}>
            The positions fill from the left, and only one is open at a time.
          </span>
        )}
      </p>
    </div>
  );
}
