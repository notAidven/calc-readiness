/**
 * POL.4 slide 0: put the missing corner into the L and read the finished square off the ground.
 *
 * The method's name is literal and its algebra is not, so a learner who meets the constant as a
 * formula has no picture to attach it to and no reason for the halving. Here the strips are
 * drawn, the corner they leave open is visibly square, and the number that fills it is the one
 * the learner supplies by placing a block of the right size.
 *
 * Two placements, judged separately (R28): the corner block, and then the side the finished
 * square measures. Getting the corner right and the side wrong is a learner who has seen the
 * picture and not yet read it, which is a different state from getting neither.
 */

import { useState } from "react";
import { SvgHitTarget } from "../svgHitTarget";
import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
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

/** Half the middle coefficient, which is the width of each strip. */
const HALVES: readonly number[] = [4, 5];

const SIDE = 118;
const STRIP = 40;
const FIGURE_W = 400;
/**
 * Horizontal origin of the paving. Derived so the L sits in the middle of the frame rather than
 * against its left edge: the square plus one strip is `SIDE + STRIP` wide, and the leftover space
 * is split evenly. It was `44`, which left 198 of empty viewBox on the right and read as a
 * left-aligned diagram inside an otherwise centered SVG element.
 */
const ORIGIN_X = (FIGURE_W - SIDE - STRIP) / 2;
const ORIGIN_Y = 30;

/** The rule drawn under the paving, which the side length is measured along. */
const RULE_Y = ORIGIN_Y + STRIP + SIDE + 12;

/** The rounded box the finished side length is dropped into, under that rule. */
const SLOT_X = ORIGIN_X + 22;
const SLOT_Y = ORIGIN_Y + STRIP + SIDE + 18;
const SLOT_W = 114;
const SLOT_H = 26;
/** How far inside the slot's outline its hit target sits, so the two do not share an edge. */
const SLOT_INSET = 2;
/** Clear space under the lowest thing drawn, which also covers its outline's outer half. */
const FIGURE_PAD = 8;
/**
 * The frame, DERIVED from the geometry rather than counted alongside it.
 *
 * It was `216`, a hand-count that stopped at the paving: the side slot runs to `SLOT_Y + SLOT_H`,
 * which is 232, so the root SVG clipped the bottom 16 units off it and a learner met an
 * open-bottomed bracket rather than a box to drop the side length into. Reading the height off
 * the lowest thing drawn is what makes that unrepeatable, since moving the slot moves the frame.
 */
const FIGURE_H = SLOT_Y + SLOT_H + FIGURE_PAD;

type SlotId = "corner" | "side";

export function CompleteSquareDrag(props: LessonWidgetProps) {
  const variant = useWidgetVariants(HALVES.length, props);
  const half = HALVES[variant.index] ?? (HALVES[0] as number);
  return (
    <CompleteSquareDragBody
      key={variant.nonce}
      half={half}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CompleteSquareDragBody({
  half,
  onSolved,
  onRestart,
}: {
  half: number;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const middle = 2 * half;
  const corner = half * half;

  const chips = [
    {
      id: "corner",
      latex: `${corner}`,
      spoken: `a block of ${corner}`,
      slot: "corner" as SlotId,
    },
    { id: "side", latex: `x + ${half}`, spoken: `x plus ${half}`, slot: "side" as SlotId },
    {
      id: "double",
      latex: `${middle}`,
      spoken: `a block of ${middle}`,
      slot: null,
    },
    {
      id: "middleSide",
      latex: `x + ${middle}`,
      spoken: `x plus ${middle}`,
      slot: null,
    },
  ];

  const [called, setCalled] = useState<Partial<Record<SlotId, boolean>>>({});
  const [filledBy, setFilledBy] = useState<Partial<Record<SlotId, string>>>({});
  const [missed, setMissed] = useState<string | null>(null);
  const [revealedSlot, setRevealedSlot] = useState<SlotId | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const order: readonly SlotId[] = ["corner", "side"];
  const openSlot = order.find((slot) => called[slot] !== true) ?? null;
  const solved = openSlot === null;
  /**
   * The part a passage on screen is about, which is the one still in hand.
   *
   * Read off the board rather than off a `revealed` flag of the widget's own: the shared layer
   * runs a widget's `onReveal` only on the reveal that lets the learner PAST, never on the one
   * that re-asks, so a flag set there is false over exactly the window the fill is shown in.
   */
  const givenChip =
    fill.given && openSlot !== null
      ? (chips.find((chip) => chip.slot === openSlot) ?? null)
      : null;

  function settle(slot: SlotId, chipId: string, earned: boolean) {
    const next = { ...called, [slot]: true };
    setFilledBy({ ...filledBy, [slot]: chipId });
    setCalled(next);
    setMissed(null);
    if (earned) {
      success();
    }
    if (order.every((each) => next[each] === true) && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function drop(slot: SlotId) {
    if (slot !== openSlot) {
      return;
    }
    const id = pickup.take();
    const chip = chips.find((candidate) => candidate.id === id);
    if (!chip) {
      return;
    }
    if (chip.slot === slot) {
      settle(slot, chip.id, true);
      return;
    }
    setMissed(chip.id);
  }

  function reveal() {
    if (openSlot === null) {
      return;
    }
    const chip = chips.find((candidate) => candidate.slot === openSlot);
    setRevealedSlot(openSlot);
    if (chip) {
      settle(openSlot, chip.id, false);
    }
  }

  const cornerLabel =
    givenChip?.slot === "corner"
      ? { latex: givenChip.latex, given: true }
      : called.corner === true
        ? {
            latex: chips.find((c) => c.id === filledBy.corner)?.latex ?? "",
            given: false,
          }
        : null;
  const sideLabel =
    givenChip?.slot === "side"
      ? { latex: givenChip.latex, given: true }
      : called.side === true
        ? { latex: chips.find((c) => c.id === filledBy.side)?.latex ?? "", given: false }
        : null;

  const tray = chips.filter(
    (chip) =>
      chip.id !== givenChip?.id &&
      !order.some((slot) => filledBy[slot] === chip.id && called[slot] === true),
  );

  return (
    <div className="lesson-interactive lesson-interactive--drag">
      <WidgetTask>
        Goal: fill the open corner so the paving becomes a square, then say what the
        finished square measures along one side.
      </WidgetTask>

      {/* 420, not the default 460. This board was already inside the 350px band at 334.4px,
        by 15.6px, and 15.6px is one rewrap of the task line above it: that line is a single
        894px row here and a second one would cost 20.4px. 420 draws the paving 252px tall and
        puts 40px between the board and the band. */}
      <WidgetBeside
        figureWidth={420}
        figure={
          <svg viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`} role="img">
            <title>An L-shaped piece of ground with one corner still missing</title>

            <rect
              x={ORIGIN_X}
              y={ORIGIN_Y + STRIP}
              width={SIDE}
              height={SIDE}
              fill="none"
              stroke={LINE}
              strokeWidth={1.6}
            />
            <SvgMath
              latex="x^{2}"
              x={ORIGIN_X + SIDE / 2}
              y={ORIGIN_Y + STRIP + SIDE / 2}
              fontSize={14}
              color={LABEL}
              w={SIDE}
            />

            {/* The two strips, each half the middle coefficient wide. */}
            <rect
              x={ORIGIN_X}
              y={ORIGIN_Y}
              width={SIDE}
              height={STRIP}
              fill={`color-mix(in srgb, ${SIGNAL_DEEP} 12%, transparent)`}
              stroke={LINE}
              strokeWidth={1.4}
            />
            <SvgMath
              latex={`${half}x`}
              x={ORIGIN_X + SIDE / 2}
              y={ORIGIN_Y + STRIP / 2}
              fontSize={12}
              color={LABEL}
              w={SIDE}
            />
            <rect
              x={ORIGIN_X + SIDE}
              y={ORIGIN_Y + STRIP}
              width={STRIP}
              height={SIDE}
              fill={`color-mix(in srgb, ${SIGNAL_DEEP} 12%, transparent)`}
              stroke={LINE}
              strokeWidth={1.4}
            />
            <SvgMath
              latex={`${half}x`}
              x={ORIGIN_X + SIDE + STRIP / 2}
              y={ORIGIN_Y + STRIP + SIDE / 2}
              fontSize={12}
              color={LABEL}
              w={STRIP}
            />

            {/* The open corner: the slot the first placement fills. */}
            <rect
              x={ORIGIN_X + SIDE}
              y={ORIGIN_Y}
              width={STRIP}
              height={STRIP}
              fill={cornerLabel ? `color-mix(in srgb, ${CIVIC} 12%, transparent)` : "none"}
              stroke={
                cornerLabel?.given
                  ? SIGNAL_DEEP
                  : cornerLabel
                    ? CIVIC
                    : openSlot === "corner"
                      ? LABEL
                      : SOFT
              }
              strokeDasharray={cornerLabel && !cornerLabel.given ? undefined : "5 4"}
              strokeWidth={1.6}
            />
            <SvgHitTarget
              x={ORIGIN_X + SIDE}
              y={ORIGIN_Y}
              width={STRIP}
              height={STRIP}
              active={openSlot === "corner"}
              label={
                cornerLabel === null
                  ? "Drop a block into the open corner"
                  : cornerLabel.given
                    ? "The corner block was given, not answered"
                    : "The corner is filled"
              }
              onPick={() => drop("corner")}
              mark={fill.mark(cornerLabel?.given === true)}
            >
              {cornerLabel ? (
                <InlineMath
                  latex={cornerLabel.latex}
                  color={cornerLabel.given ? SIGNAL_DEEP : CIVIC}
                />
              ) : null}
            </SvgHitTarget>

            {/* The side of the finished square: the slot the second placement fills. */}
            <line
              x1={ORIGIN_X}
              y1={RULE_Y}
              x2={ORIGIN_X + SIDE + STRIP}
              y2={RULE_Y}
              stroke={cornerLabel ? LABEL : SOFT}
              strokeWidth={1.2}
            />
            <g>
              <rect
                x={SLOT_X}
                y={SLOT_Y}
                width={SLOT_W}
                height={SLOT_H}
                rx={6}
                fill="none"
                stroke={
                  sideLabel?.given
                    ? SIGNAL_DEEP
                    : sideLabel
                      ? CIVIC
                      : openSlot === "side"
                        ? LABEL
                        : SOFT
                }
                strokeDasharray={sideLabel && !sideLabel.given ? undefined : "5 4"}
                strokeWidth={1.5}
              />
              <SvgHitTarget
                x={SLOT_X + SLOT_INSET}
                y={SLOT_Y + SLOT_INSET}
                width={SLOT_W - 2 * SLOT_INSET}
                height={SLOT_H - 2 * SLOT_INSET}
                active={openSlot === "side"}
                label={
                  sideLabel === null
                    ? "Say what the finished square measures along one side"
                    : sideLabel.given
                      ? "The side was given, not answered"
                      : "The side is labeled"
                }
                onPick={() => drop("side")}
                mark={fill.mark(sideLabel?.given === true)}
              >
                {sideLabel ? (
                  <InlineMath
                    latex={sideLabel.latex}
                    color={sideLabel.given ? SIGNAL_DEEP : CIVIC}
                  />
                ) : null}
              </SvgHitTarget>
            </g>
          </svg>
        }
      >
        <div className="lesson-sorter__tray">
          {solved ? (
            <span className="lesson-sorter__tray-empty">Square completed</span>
          ) : (
            tray.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="lesson-sorter__chip"
                draggable
                aria-label={chip.spoken}
                aria-pressed={pickup.held === chip.id}
                // BRICK on a missed chip is a verdict on a piece the learner DID offer. Carrying
                // one is not an offer, so the held chip takes the third hue rather than the
                // colour this board gives a correctly placed label.
                style={{
                  color: LABEL,
                  borderColor:
                    missed === chip.id
                      ? BRICK
                      : pickup.held === chip.id
                        ? SIGNAL_DEEP
                        : SOFT,
                }}
                onDragStart={() => pickup.hold(chip.id)}
                onDragEnd={() => pickup.clear()}
                onClick={() => pickup.toggle(chip.id)}
              >
                <InlineMath latex={chip.latex} />
              </button>
            ))
          )}
        </div>

        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different piece of ground
          </button>
        ) : null}

        {openSlot !== null && (
          <WidgetReveal
            available={missed !== null}
            revealed={revealedSlot === openSlot}
            answer={
              <InlineMath
                latex={chips.find((chip) => chip.slot === openSlot)?.latex ?? ""}
              />
            }
            why={
              openSlot === "corner" ? (
                <>
                  Each strip is <InlineMath latex={`${half}`} /> wide, because the two of
                  them together supply the <InlineMath latex={`${middle}x`} />. The gap they
                  leave is that width both ways, so it is{" "}
                  <InlineMath latex={`${half} \\times ${half} = ${corner}`} />.
                </>
              ) : (
                <>
                  Along the bottom the ground runs <InlineMath latex="x" /> for the big
                  square and <InlineMath latex={`${half}`} /> for the strip, so the finished
                  side is <InlineMath latex={`x + ${half}`} />. It is the strip's width that
                  appears there, not the whole middle coefficient.
                </>
              )
            }
            onReveal={reveal}
            label="Reveal this placement"
            othersRemain={order.filter((slot) => called[slot] !== true).length > 1}
          />
        )}

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : missed ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {fill.given ? null : solved ? (
            <>
              <InlineMath
                latex={`x^{2} + ${middle}x + ${corner} = (x + ${half})^{2}`}
                color={CIVIC}
              />
              . The constant is the strip's width squared, and the strip's width is half the
              middle coefficient, which is where the halving in the rule comes from.
            </>
          ) : missed ? (
            <span style={{ color: BRICK }}>
              The two strips together supply <InlineMath latex={`${middle}x`} />, so each of
              them is half of that. The corner is that width both ways.
            </span>
          ) : (
            <span style={{ color: SOFT }}>
              One placement is open at a time, and the figure shows which.
            </span>
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
