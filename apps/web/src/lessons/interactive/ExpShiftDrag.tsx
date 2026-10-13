/**
 * EL.2 interactive (slide 1): three rules, three candidate asymptotes, and which line each
 * rule levels off toward.
 *
 * The board draws the LINES and not the curves, and that is the whole design. A plotted curve
 * shows where it flattens, so a board that arrived with three curves on it would be asking the
 * learner to read an answer already drawn; with only the lines up, the height has to be worked
 * out of the rule. Each rule's curve is drawn once its card lands on the right line, so the
 * evidence arrives after the claim rather than before it.
 *
 * The three rules are chosen so that no two of them can be separated by the same reading. Two
 * differ only in the SIGN of the constant on the end, so a learner who knows the constant is
 * the answer still has to carry its sign; the third moves sideways instead, and its asymptote
 * is the untouched $y = 0$, which is the misconception the slide exists for. A learner who
 * believes every transformation drags the asymptote with it has nowhere to put that card.
 *
 * A wrong drop is refused and explained and the card goes back to the tray, which is
 * `LabelParts`'s behaviour and is right here for the same reason: three cards is three
 * answers, so locking one would end a board the learner had two thirds of. What stops that
 * being a free retry is that the cards are all the same colour and the lines are dealt in an
 * order that never matches the tray, so nothing on screen pairs them up by position.
 *
 * `othersRemain` is live and is `unplaced.length > 1`: revealing one card's line hands the
 * board BACK while another card is still out, and only spends the instance on the last one.
 */

import { type ReactNode, useRef, useState } from "react";

import {
  CIVIC,
  InlineMath,
  LABEL,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { usePickup } from "./pickup";

interface Card {
  id: string;
  /** The rule, as LaTeX. */
  latex: string;
  /** How a screen reader says the rule. */
  spoken: string;
  /** The height its graph levels off toward. */
  asymptote: number;
  /** The rule as a function, drawn once the card lands. */
  fn: (x: number) => number;
  /** Why the asymptote sits there. */
  why: ReactNode;
}

interface Board {
  cards: readonly Card[];
  /**
   * The order the cards are DEALT in the tray, as indices into `cards`.
   *
   * The lines sit on the plot in height order, which is `up`, `side`, `down` from the top on
   * every board, so dealing the cards in their own order would put the first card against the
   * first line and the board could be finished top to bottom without reading a rule. This is a
   * derangement of the height order: no card is offered opposite the line it belongs to.
   */
  dealt: readonly number[];
}

function makeBoard(a: number, b: number, up: number, down: number, h: number): Board {
  return {
    cards: [
      {
        id: "up",
        latex: `${a} \\cdot ${b}^{x} + ${up}`,
        spoken: `${a} times ${b} to the x, plus ${up}`,
        asymptote: up,
        fn: (x) => a * b ** x + up,
        why: (
          <>
            The constant is added AFTER the power, so it lifts every output by the same
            amount and carries the line the curve presses toward up with it. The power still
            shrinks toward <InlineMath latex="0" />, so what is left is{" "}
            <InlineMath latex={`${up}`} />.
          </>
        ),
      },
      {
        id: "down",
        latex: `${a} \\cdot ${b}^{x} - ${down}`,
        spoken: `${a} times ${b} to the x, minus ${down}`,
        asymptote: -down,
        fn: (x) => a * b ** x - down,
        why: (
          <>
            Subtracting at the end lowers every output by the same amount, so the line moves
            down rather than up. The sign travels with the constant:{" "}
            <InlineMath latex={`y = -${down}`} />, not <InlineMath latex={`y = ${down}`} />.
          </>
        ),
      },
      {
        id: "side",
        latex: `${a} \\cdot ${b}^{x - ${h}}`,
        spoken: `${a} times ${b} to the x minus ${h}`,
        asymptote: 0,
        fn: (x) => a * b ** (x - h),
        why: (
          <>
            The constant is inside the exponent, so it changes WHEN each output arrives
            rather than how high it is. Sliding a curve sideways cannot change the height it
            levels off at, so this one still presses toward <InlineMath latex="y = 0" />.
          </>
        ),
      },
    ],
    dealt: [2, 1, 0],
  };
}

/**
 * Two boards. Neither uses the CFU's numbers, and the two differ in the coefficient, the
 * base and all three constants, so a restart is a genuinely different question.
 */
const BOARDS: readonly Board[] = [makeBoard(3, 2, 4, 2, 3), makeBoard(2, 3, 6, 5, 2)];

const PLOT = { left: 52, right: 416, top: 14, bottom: 196 };
const VIEW_H = 224;
const SLOT_W = 132;
const SLOT_H = 28;
const SAMPLES = 90;

export function ExpShiftDrag(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <ExpShiftDragBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ExpShiftDragBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /**
   * Card id -> true once its card is sitting on the right line.
   *
   * Mirrored into a ref for the same reason `usePickup` keeps its held value in one: a drop
   * handler closes over the state as of its own render, so two drops landing inside a single
   * frame would each build their next board from the same stale one and the first placement
   * would be thrown away. The ref is readable in the tick it was written.
   */
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const placedNow = useRef<Record<string, boolean>>({});
  const [missed, setMissed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const unplaced = board.dealt
    .map((index) => board.cards[index])
    .filter((card): card is Card => Boolean(card))
    .filter((card) => placed[card.id] !== true);
  const solved = unplaced.length === 0;
  // A card whose answer has been HANDED OVER leaves the tray exactly as a placed one does,
  // or the board would show a line holding a rule that is still on offer beside it.
  const tray = unplaced.filter((card) => !(fill.given && card.id === missed));

  const heights = board.cards.map((card) => card.asymptote);
  const lowest = Math.min(...heights);
  const highest = Math.max(...heights);
  const pad = Math.max((highest - lowest) * 0.35, 2);
  const yMin = lowest - pad;
  const yMax = highest + pad;
  const plotW = PLOT.right - PLOT.left;
  const plotH = PLOT.bottom - PLOT.top;
  const mapX = (x: number): number => PLOT.left + ((x + 3) / 6) * plotW;
  const mapY = (y: number): number => PLOT.bottom - ((y - yMin) / (yMax - yMin)) * plotH;

  /** One curve, sampled across the window and cut where it leaves the box. */
  function path(card: Card): string {
    const points: string[] = [];
    for (let index = 0; index <= SAMPLES; index += 1) {
      const x = -3 + (6 * index) / SAMPLES;
      const y = card.fn(x);
      if (y >= yMin && y <= yMax) {
        points.push(`${mapX(x).toFixed(2)},${mapY(y).toFixed(2)}`);
      }
    }
    return points.join(" ");
  }

  function settle(id: string) {
    const next = { ...placedNow.current, [id]: true };
    placedNow.current = next;
    setPlaced(next);
    if (board.cards.every((card) => next[card.id] === true)) {
      onSolved();
    }
  }

  function dropOn(card: Card) {
    setOver(null);
    const carried = pickup.take();
    if (carried === null || placedNow.current[card.id] === true) {
      return;
    }
    if (carried !== card.id) {
      setMissed(carried);
      setFeedback(
        "Not quite. That rule levels off somewhere else. Find its constant, then check whether it is added at the end or sitting up in the exponent.",
      );
      return;
    }
    setMissed(null);
    setRevealed(null);
    setFeedback(null);
    success();
    settle(card.id);
  }

  function reveal() {
    if (missed === null) {
      return;
    }
    setRevealed(missed);
    setMissed(null);
    setFeedback(null);
    settle(missed);
  }

  const missedCard = board.cards.find((card) => card.id === missed) ?? null;
  const revealedCard = board.cards.find((card) => card.id === revealed) ?? null;

  /*
   * Each line's height is named ON the plot, so the label is placed against the plot rather
   * than nudged off the line: the window is sized to the board's own constants, so where a
   * line sits changes from board to board and a fixed offset would eventually print outside
   * the frame. The labels are fed into each other's `avoid` list in draw order.
   */
  const labelFrame = plotLabelFrame(PLOT, 8);
  const laid: LabelBox[] = [];
  const lineLabels = board.cards.map((card) => {
    const latex = `y = ${card.asymptote}`;
    const box = labelSpot({
      x: PLOT.right - 12,
      y: mapY(card.asymptote),
      frame: labelFrame,
      dx: -1,
      dy: -1,
      halfW: labelHalfW(latex, 13),
      halfH: labelHalfH(13),
      gap: 8,
      avoid: [...laid],
    });
    laid.push(box);
    return { card, latex, box };
  });

  let status: ReactNode;
  if (revealedCard !== null) {
    status = null;
  } else if (solved) {
    status = (
      <>
        A constant added at the end takes the asymptote with it, sign included, and a
        constant inside the exponent leaves it exactly where it was at{" "}
        <InlineMath latex="y = 0" />.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else {
    status =
      "Each line is one candidate height. Work out where each rule levels off, and put the rule on that line.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--drag">
      <WidgetTask>
        Goal: leave every rule sitting on the horizontal line its graph levels off toward,
        so the board says which kind of shift moves that line and which kind leaves it
        alone.
      </WidgetTask>

      <svg
        viewBox={`0 0 440 ${VIEW_H}`}
        role="img"
        aria-label="Three candidate horizontal asymptotes drawn as dashed lines, each with a slot for the rule that levels off there"
      >
        <title>Candidate horizontal asymptotes, one per dashed line</title>

        <rect
          data-plot-frame=""
          x={PLOT.left}
          y={PLOT.top}
          width={plotW}
          height={plotH}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
          rx={6}
        />
        {yMin < 0 && yMax > 0 && (
          <line
            x1={PLOT.left}
            y1={mapY(0)}
            x2={PLOT.right}
            y2={mapY(0)}
            stroke={SOFT}
            strokeWidth={1.25}
          />
        )}
        <line
          x1={mapX(0)}
          y1={PLOT.top}
          x2={mapX(0)}
          y2={PLOT.bottom}
          stroke={SOFT}
          strokeWidth={1.25}
        />

        {/* Each rule's curve, drawn only once its card has landed. */}
        {board.cards
          .filter((card) => placed[card.id] === true)
          .map((card) => (
            <polyline
              key={`curve-${card.id}`}
              points={path(card)}
              fill="none"
              stroke={CIVIC}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          ))}

        {lineLabels.map(({ card, latex, box }) => {
          const done = placed[card.id] === true;
          const given = fill.given && card.id === missed;
          const y = mapY(card.asymptote);
          return (
            <g key={`line-${card.id}`}>
              <line
                x1={PLOT.left}
                y1={y}
                x2={PLOT.right}
                y2={y}
                stroke={done ? CIVIC : SIGNAL}
                strokeWidth={1.6}
                strokeDasharray="7 5"
              />
              <PlotLabel
                box={box}
                latex={latex}
                fontSize={13}
                color={done ? CIVIC : SIGNAL}
              />
              <foreignObject
                x={PLOT.left + 10}
                y={y - SLOT_H / 2}
                width={SLOT_W}
                height={SLOT_H}
                style={{ overflow: "visible" }}
              >
                <button
                  type="button"
                  disabled={done}
                  // A drop target that lives in the SVG rather than carrying one of the shared
                  // sorter/label/table slot classes, so this marks it for anything that sweeps
                  // for drop targets by selector (see widgetRevealReAsk's `poke`).
                  data-drop-slot=""
                  aria-label={
                    given
                      ? `The line y equals ${card.asymptote} was given the rule ${card.spoken}, not answered`
                      : done
                        ? `The line y equals ${card.asymptote} holds ${card.spoken}`
                        : `Drop slot for the line y equals ${card.asymptote}`
                  }
                  {...fill.mark(given)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnter={() => setOver(card.id)}
                  onDragLeave={() => setOver((held) => (held === card.id ? null : held))}
                  onDrop={() => dropOn(card)}
                  onClick={() => dropOn(card)}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    borderRadius: 8,
                    border: `1.5px ${done || given ? "solid" : "dashed"} ${
                      done ? CIVIC : over === card.id ? CIVIC : LINE
                    }`,
                    background: "var(--paper)",
                    color: done ? CIVIC : LABEL,
                    cursor: done ? "default" : "pointer",
                    fontSize: 12,
                  }}
                >
                  {done || given ? <InlineMath latex={card.latex} /> : null}
                </button>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      <div className="lesson-sorter__tray">
        {solved ? (
          <span className="lesson-sorter__tray-empty">Every rule placed</span>
        ) : (
          tray.map((card) => (
            <button
              key={card.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={card.spoken}
              aria-pressed={pickup.held === card.id}
              // A carried card has been offered to nothing, so it takes the third hue rather
              // than the colour this board gives a card it has judged right.
              style={{
                color: LABEL,
                borderColor: pickup.held === card.id ? SIGNAL_DEEP : SOFT,
              }}
              onDragStart={() => pickup.hold(card.id)}
              onDragEnd={() => pickup.clear()}
              onClick={() => pickup.toggle(card.id)}
            >
              <InlineMath latex={card.latex} />
            </button>
          ))
        )}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different set of rules
        </button>
      )}

      <WidgetReveal
        available={missed !== null}
        revealed={revealedCard !== null}
        answer={
          missedCard === null ? null : <InlineMath latex={`y = ${missedCard.asymptote}`} />
        }
        why={missedCard === null ? null : missedCard.why}
        onReveal={reveal}
        label="Reveal this rule's line"
        // The missed card is one of the unplaced ones, so more than one of them means there
        // is another rule to place after this one is explained.
        othersRemain={unplaced.length > 1}
      />

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
