/**
 * POL.2 slide 3: rearrange the leftover paving and read the two sides off it.
 *
 * The identity is usually handed over as a pattern to memorize, and a learner who memorizes it
 * cannot tell it from the sum, which does not factor at all. The dissection is the argument:
 * cut the L-shaped leftover once, carry the smaller piece round, and the two pieces close up
 * into a single rectangle whose sides are the sum and the difference. Nothing has to be taken
 * on trust, because the area never changed.
 *
 * Three placements, each judged on its own (R28): the piece goes where it fits, and then the
 * two dimensions go on the two edges of what it made. The gate turns on all three being CALLED
 * rather than on all three being right first time (R29).
 *
 * ## The figure has to BE the dissection it argues from
 *
 * QA came back a second time unable to say what the carried piece was or what it was carried
 * from, and the labels were not the whole of it: the figure was not a dissection of the shape
 * it claimed. It drew an `88 x 88` square to be carried into an `88 x 44` slot, and its two
 * pieces covered 13552 units of a leftover measuring `132^2 - 44^2 = 15488`, leaving a `44 x 44`
 * hole in the middle of the L that nothing painted at all. "Carried piece" reads as nothing
 * when there is no coherent piece to carry.
 *
 * The cut the prose always described, and now the one the figure draws:
 *
 * - the fixed lower rectangle is `BIG x (BIG - CUT)`, which is `x` by `x - cut`;
 * - the moving strip is `(BIG - CUT) x CUT`, which is `x - cut` by `cut`, and it is the whole
 *   of the top band beside the corner that was taken out;
 * - `11616 + 3872 = 15488`, so the two of them tile the leftover exactly;
 * - a quarter turn makes the strip `CUT` wide by `BIG - CUT` deep, and against the right-hand
 *   end of the lower rectangle that closes the paving up into one `(BIG + CUT) x (BIG - CUT)`
 *   rectangle, which is `(x + cut)(x - cut)`.
 *
 * `DifferenceSquaresDrag.browser.test.tsx` measures all of that off the rendered geometry, so
 * a figure that stops tiling fails rather than merely looking odd.
 *
 * ## Saying which placement is open, and where it goes
 *
 * An earlier round of QA could not tell what was being asked or where to click. Three separate
 * causes, fixed apart, and the same file holds each one:
 *
 * - The only instruction was the `WidgetTask` goal, which covers all three placements at once
 *   and so describes none of them. Each placement now states its own, in a line of its own.
 *   NOT on `.lesson-interactive__status`: that is the `aria-live` region, and the first wrong
 *   drop spends it on feedback, which is the defect `widgetTask.tsx` was extracted for.
 * - The three targets were unlabeled dashed rectangles told apart by stroke color. They are
 *   captioned on the figure now, and the open one says "drop here" inside itself. The mark has
 *   to be a WORD: `svgKit` reserves green and red for a verdict on the learner's action, so a
 *   hue here would be claiming they had got something right (R26).
 * - The tray carried two chips both reading `x + 6`, graded differently by an id that is not a
 *   distinction on screen. A duplicate is not a hard question, it is an unanswerable one, so
 *   it is gone. The `6 \text{ by } 6` decoy stays: it names the piece that was REMOVED, which
 *   is the confusion the slide is actually about.
 *
 * ## What the figure now answers without being asked
 *
 * - WHAT MOVES, AND FROM WHERE. The source strip is shaded, captioned on itself, and joined to
 *   its landing place by a drawn arc. Placement 1 is still a question, because the caption says
 *   only that the strip moves; its two sides are what the learner has to read off.
 * - WHAT `x` MEASURES. Both `x` labels sit on tick-bounded dimension lines spanning the whole
 *   original square, outside it, so neither can be read as measuring the shaded box; and the
 *   corner that was taken out carries `cut` on both of its sides.
 */

import { type ReactNode, useState } from "react";
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

/** The side of the square that was cut out. The big square's side stays the variable. */
const CUTS: readonly number[] = [6, 9];

/** Figure geometry, in viewBox units. The square is drawn 132 across. */
const BIG = 132;
const CUT = 44;
const ORIGIN_X = 52;
const ORIGIN_Y = 78;

const SQUARE_RIGHT = ORIGIN_X + BIG;
const SQUARE_BOTTOM = ORIGIN_Y + BIG;

/**
 * The cut, which runs the width of the square along the lower edge of the corner that was
 * taken out. Above it: the removed corner on the left, and the strip that moves beside it.
 */
const CUT_LINE_Y = ORIGIN_Y + CUT;
const STRIP_X = ORIGIN_X + CUT;
const STRIP_W = BIG - CUT;

/** The lower rectangle, which never moves: `x` by `x - cut`. */
const LOWER_H = BIG - CUT;

/**
 * Where the carried strip lands: the same piece a quarter turn round, hard against the
 * right-hand end of the lower rectangle, which is what closes the paving up into one
 * rectangle. Flush, with no gap: a gap here is the difference between a dissection and two
 * shapes near each other.
 */
const PIECE_X = SQUARE_RIGHT;
const PIECE_Y = CUT_LINE_Y;
const PIECE_W = CUT;
const PIECE_H = LOWER_H;
const RIGHT_EDGE = PIECE_X + PIECE_W;

/** How far outside the square its two dimension lines are drawn. */
const DIM_GAP = 26;
const DIM_TOP_Y = ORIGIN_Y - DIM_GAP;
const DIM_LEFT_X = ORIGIN_X - DIM_GAP;
/** How far a dimension line's end ticks reach past it, and how far short of the square. */
const TICK_OUT = 6;
const TICK_CLEAR = 3;

const LONG_RULE_Y = SQUARE_BOTTOM + 30;
const LONG_SLOT = {
  x: ORIGIN_X + (BIG + CUT - 110) / 2,
  y: LONG_RULE_Y + 24,
  w: 110,
  h: 26,
};
const SHORT_RULE_X = RIGHT_EDGE + 12;
const SHORT_SLOT = {
  x: RIGHT_EDGE + 34,
  y: (PIECE_Y + SQUARE_BOTTOM) / 2 - 13,
  w: 104,
  h: 26,
};

/** Room for the captions under the long slot and above the short one. */
const FIGURE_W = 440;
const FIGURE_H = LONG_SLOT.y + LONG_SLOT.h + 14;

type SlotId = "piece" | "long" | "short";

/**
 * The placements in the order they open, each with the two things the board was missing: the
 * name the figure prints beside its target, and the imperative for the step.
 *
 * An imperative names the TARGET and the kind of thing that goes in it, never which chip is
 * right. "Drag and drop the leftover strip" would have read as an instruction and been the
 * answer to placement 1, whose whole question is which of the pieces on offer is the one that
 * moves. Now that the figure marks WHICH strip moves, the question placement 1 asks is what
 * that strip's two sides measure, so the imperative asks for two sides and the tray still
 * offers a wrong pair. The wording covers the tap fallback because `usePickup` offers one.
 */
const PLACEMENTS: readonly { id: SlotId; caption: string; asks: string }[] = [
  {
    id: "piece",
    caption: "where the strip lands",
    asks: "Drag and drop the two sides of the moving strip into the dashed space where it lands, at the right-hand end of the lower rectangle. You can also tap a part and then tap the space.",
  },
  {
    id: "long",
    caption: "the long edge",
    asks: "Drag and drop a length into the box labeled long edge, under the figure. You can also tap a length and then tap the box.",
  },
  {
    id: "short",
    caption: "the short edge",
    asks: "Drag and drop a length into the box labeled short edge, at the right. You can also tap a length and then tap the box.",
  },
];

const ORDER: readonly SlotId[] = PLACEMENTS.map((placement) => placement.id);

interface Chip {
  id: string;
  latex: string;
  spoken: string;
  slot: SlotId | null;
  refusal?: ReactNode;
}

/** How a target's outline reads. Weight and dash carry it, so no state is a hue alone. */
type TargetState = "settled" | "given" | "open" | "waiting";

const OUTLINE: Record<TargetState, { stroke: string; dash?: string; width: number }> = {
  // The learner's own pick is solid; a standing mark that is not a verdict is dashed (R26).
  settled: { stroke: CIVIC, width: 1.8 },
  given: { stroke: SIGNAL_DEEP, dash: "5 4", width: 1.8 },
  open: { stroke: LABEL, dash: "5 4", width: 2.2 },
  waiting: { stroke: SOFT, dash: "5 4", width: 1.2 },
};

export function DifferenceSquaresDrag(props: LessonWidgetProps) {
  const variant = useWidgetVariants(CUTS.length, props);
  const cut = CUTS[variant.index] ?? (CUTS[0] as number);
  return (
    <DifferenceSquaresDragBody
      key={variant.nonce}
      cut={cut}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DifferenceSquaresDragBody({
  cut,
  onSolved,
  onRestart,
}: {
  cut: number;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [filled, setFilled] = useState<Partial<Record<SlotId, string>>>({});
  const [called, setCalled] = useState<Partial<Record<SlotId, boolean>>>({});
  const [missed, setMissed] = useState<string | null>(null);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const chips: readonly Chip[] = [
    {
      id: "strip",
      latex: `${cut} \\text{ by } (x - ${cut})`,
      spoken: `the strip ${cut} by x minus ${cut}`,
      slot: "piece",
    },
    {
      id: "sum",
      latex: `x + ${cut}`,
      spoken: `x plus ${cut}`,
      slot: "long",
    },
    {
      id: "diff",
      latex: `x - ${cut}`,
      spoken: `x minus ${cut}`,
      slot: "short",
    },
    {
      id: "square",
      latex: `${cut} \\text{ by } ${cut}`,
      spoken: `the square ${cut} by ${cut}`,
      slot: null,
      refusal: (
        <>
          A square of side <InlineMath latex={`${cut}`} /> is the piece that was REMOVED, so
          it is not on the ground to be carried anywhere. What is left to move is the strip
          beside it, above the cut.
        </>
      ),
    },
  ];

  const openSlot = ORDER.find((slot) => called[slot] !== true) ?? null;
  const open = PLACEMENTS.find((placement) => placement.id === openSlot) ?? null;
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
    const nextCalled = { ...called, [slot]: true };
    setFilled({ ...filled, [slot]: chipId });
    setCalled(nextCalled);
    setMissed(null);
    if (earned) {
      success();
    }
    // Each placement settles exactly once (a called slot refuses another drop), and `latch`
    // is idempotent besides, so the gate needs no flag of its own to open only once.
    if (ORDER.every((each) => nextCalled[each] === true)) {
      onSolved();
    }
  }

  function drop(slot: SlotId) {
    if (called[slot] === true || slot !== openSlot) {
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
    if (chip) {
      settle(openSlot, chip.id, false);
    }
  }

  const missChip = chips.find((chip) => chip.id === missed) ?? null;
  const placedPiece = called.piece === true;
  const tray = chips.filter(
    (chip) =>
      chip.id !== givenChip?.id &&
      !ORDER.some((slot) => filled[slot] === chip.id && called[slot] === true),
  );

  /** The label a finished or filled edge shows, and how it is marked. */
  function edge(slot: SlotId): { latex: string | null; given: boolean } {
    if (givenChip !== null && givenChip.slot === slot) {
      return { latex: givenChip.latex, given: true };
    }
    const chipId = filled[slot];
    const chip = chips.find((candidate) => candidate.id === chipId);
    return { latex: called[slot] === true && chip ? chip.latex : null, given: false };
  }

  function stateOf(slot: SlotId, given: boolean, done: boolean): TargetState {
    if (given) {
      return "given";
    }
    if (done) {
      return "settled";
    }
    return openSlot === slot ? "open" : "waiting";
  }

  const longEdge = edge("long");
  const shortEdge = edge("short");
  // Placement 1 is a slot like the other two, and it reads its given off `edge` like the
  // other two. Passing a bare `false` here made the reveal on the FIRST placement the one
  // placement whose answer the board did not show: the strip left the tray, the destination
  // stayed an empty dashed box, and the passage overhead was the only thing carrying it.
  const pieceEdge = edge("piece");
  const pieceState = stateOf("piece", pieceEdge.given, placedPiece);
  const longState = stateOf("long", longEdge.given, longEdge.latex !== null);
  const shortState = stateOf("short", shortEdge.given, shortEdge.latex !== null);
  const carryInk = placedPiece ? SOFT : SIGNAL_DEEP;

  return (
    <div className="lesson-interactive lesson-interactive--drag">
      <WidgetTask>
        Goal: carry the cut piece round so the leftover paving closes up into one rectangle,
        then put a length on each of its two edges.
      </WidgetTask>

      {/* The step in hand, in a line of its own so a wrong drop cannot overwrite it. Styled
          inline rather than through `.lesson-interactive__objective`, which is the goal
          slot's class and belongs to the one line above. */}
      {open !== null && (
        <p
          data-open-placement={open.id}
          style={{
            margin: 0,
            alignSelf: "stretch",
            fontSize: "0.9rem",
            fontWeight: 650,
            lineHeight: 1.5,
            color: LABEL,
          }}
        >
          {`Placement ${ORDER.indexOf(open.id) + 1} of ${ORDER.length}, ${open.caption}. ${open.asks}`}
        </p>
      )}

      <svg viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`} role="img">
        <title>
          A square of side x with a smaller square cut out of one corner, cut once and
          carried round into a rectangle
        </title>

        {/* What the two x labels measure: the whole original square, drawn as one outline. */}
        <rect
          data-tile="square"
          x={ORIGIN_X}
          y={ORIGIN_Y}
          width={BIG}
          height={BIG}
          fill="none"
          stroke={SOFT}
          strokeWidth={1.2}
        />
        {/* The lower rectangle, which never moves: x by (x - cut). */}
        <rect
          data-tile="fixed"
          x={ORIGIN_X}
          y={CUT_LINE_Y}
          width={BIG}
          height={LOWER_H}
          fill="none"
          stroke={LINE}
          strokeWidth={1.6}
        />
        {/* The strip beside the removed corner: the piece that is carried round. */}
        <rect
          data-tile="source"
          x={STRIP_X}
          y={ORIGIN_Y}
          width={STRIP_W}
          height={CUT}
          fill={
            placedPiece ? "none" : `color-mix(in srgb, ${SIGNAL_DEEP} 14%, transparent)`
          }
          stroke={placedPiece ? SOFT : SIGNAL_DEEP}
          strokeDasharray={placedPiece ? "4 4" : undefined}
          strokeWidth={1.6}
        />
        <text
          data-source-caption=""
          x={STRIP_X + STRIP_W / 2}
          y={ORIGIN_Y + CUT - 10}
          textAnchor="middle"
          fontSize={9}
          fill={carryInk}
        >
          {placedPiece ? "moved from here" : "this strip moves"}
        </text>
        {/* The removed corner, drawn hollow so the L is legible. */}
        <rect
          data-tile="cutout"
          x={ORIGIN_X}
          y={ORIGIN_Y}
          width={CUT}
          height={CUT}
          fill="none"
          stroke={SOFT}
          strokeDasharray="3 4"
          strokeWidth={1.2}
        />
        <text
          x={ORIGIN_X + CUT / 2}
          y={ORIGIN_Y + CUT / 2 + 4}
          textAnchor="middle"
          fontSize={11}
          fill={SOFT}
        >
          cut out
        </text>
        {/* The corner's two sides, so the strip's depth is a length the figure states. */}
        <SvgMath
          latex={`${cut}`}
          x={ORIGIN_X + CUT / 2}
          y={ORIGIN_Y - 13}
          fontSize={11}
          color={SOFT}
          w={26}
        />
        <SvgMath
          latex={`${cut}`}
          x={ORIGIN_X - 13}
          y={ORIGIN_Y + CUT / 2}
          fontSize={11}
          color={SOFT}
          w={26}
        />

        {/* The journey: the strip leaves its place in the band and turns into its slot. */}
        <path
          data-carry-arc=""
          d={`M ${STRIP_X + STRIP_W - 4} ${ORIGIN_Y + 10} C ${PIECE_X + 30} ${ORIGIN_Y + 6} ${PIECE_X + 22} ${ORIGIN_Y + 18} ${PIECE_X + 22} ${PIECE_Y - 16}`}
          fill="none"
          stroke={carryInk}
          strokeWidth={1.4}
          strokeDasharray="5 4"
        />
        <path
          d={`M ${PIECE_X + 22} ${PIECE_Y - 6} l -4.5 -10 l 9 0 Z`}
          fill={carryInk}
          stroke="none"
        />

        {/* Where the carried piece lands. */}
        <rect
          data-tile="destination"
          x={PIECE_X}
          y={PIECE_Y}
          width={PIECE_W}
          height={PIECE_H}
          fill={placedPiece ? `color-mix(in srgb, ${CIVIC} 12%, transparent)` : "none"}
          stroke={OUTLINE[pieceState].stroke}
          strokeDasharray={OUTLINE[pieceState].dash}
          strokeWidth={OUTLINE[pieceState].width}
        />
        <TargetCaption
          slot="piece"
          caption={PLACEMENTS[0]?.caption ?? ""}
          x={PIECE_X + PIECE_W / 2}
          y={PIECE_Y + PIECE_H + 14}
          active={openSlot === "piece"}
        />
        <SvgHitTarget
          x={PIECE_X}
          y={PIECE_Y}
          width={PIECE_W}
          height={PIECE_H}
          active={openSlot === "piece"}
          label={
            pieceEdge.given
              ? "The strip lands here, and it was given rather than placed"
              : placedPiece
                ? "The strip lands here, and it is in place"
                : "Placement 1 of 3, where the strip lands: drop the two sides of the moving strip here, at the right-hand end of the lower rectangle"
          }
          onPick={() => drop("piece")}
          mark={fill.mark(pieceEdge.given)}
        >
          {pieceEdge.given ? (
            // The two sides, stacked, rather than the tray chip's own "6 by (x - 6)": this
            // box is CUT wide and LOWER_H tall, so the chip's one-line form overflows it and
            // is clipped to "y (x -" by the foreignObject. Stacked, each side is short enough
            // to fit, and it reads the way the landed strip is drawn: 6 across, x - 6 down.
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                // KaTeX sizes in `em`, so the box's own font size is what scales the two
                // labels down to something a CUT-wide target can hold.
                fontSize: 11,
              }}
            >
              <InlineMath latex={`${cut}`} color={SIGNAL_DEEP} />
              <InlineMath latex={`x - ${cut}`} color={SIGNAL_DEEP} />
            </span>
          ) : openSlot === "piece" ? (
            <DropHere />
          ) : null}
        </SvgHitTarget>

        {/* The two edges of the finished rectangle, each its own slot. */}
        <line
          data-rule="long"
          x1={ORIGIN_X}
          y1={LONG_RULE_Y}
          x2={RIGHT_EDGE}
          y2={LONG_RULE_Y}
          stroke={placedPiece ? LABEL : SOFT}
          strokeWidth={1.2}
        />
        <TargetCaption
          slot="long"
          caption={PLACEMENTS[1]?.caption ?? ""}
          x={LONG_SLOT.x + LONG_SLOT.w / 2}
          y={LONG_SLOT.y - 8}
          active={openSlot === "long"}
        />
        <rect
          x={LONG_SLOT.x}
          y={LONG_SLOT.y}
          width={LONG_SLOT.w}
          height={LONG_SLOT.h}
          rx={6}
          fill="none"
          stroke={OUTLINE[longState].stroke}
          strokeDasharray={OUTLINE[longState].dash}
          strokeWidth={OUTLINE[longState].width}
        />
        <SvgHitTarget
          x={LONG_SLOT.x + 2}
          y={LONG_SLOT.y + 2}
          width={LONG_SLOT.w - 4}
          height={LONG_SLOT.h - 4}
          active={openSlot === "long"}
          label={
            longEdge.given
              ? "The long edge was given, not answered"
              : longEdge.latex !== null
                ? "The long edge is labeled"
                : openSlot === "long"
                  ? "Placement 2 of 3, the long edge: drop a length here"
                  : "The long edge, not open yet"
          }
          onPick={() => drop("long")}
          mark={fill.mark(longEdge.given)}
        >
          {longEdge.latex ? (
            <InlineMath
              latex={longEdge.latex}
              color={longEdge.given ? SIGNAL_DEEP : CIVIC}
            />
          ) : openSlot === "long" ? (
            <DropHere />
          ) : null}
        </SvgHitTarget>

        <line
          data-rule="short"
          x1={SHORT_RULE_X}
          y1={PIECE_Y}
          x2={SHORT_RULE_X}
          y2={SQUARE_BOTTOM}
          stroke={placedPiece ? LABEL : SOFT}
          strokeWidth={1.2}
        />
        <TargetCaption
          slot="short"
          caption={PLACEMENTS[2]?.caption ?? ""}
          x={SHORT_SLOT.x + SHORT_SLOT.w / 2}
          y={SHORT_SLOT.y - 8}
          active={openSlot === "short"}
        />
        <rect
          x={SHORT_SLOT.x}
          y={SHORT_SLOT.y}
          width={SHORT_SLOT.w}
          height={SHORT_SLOT.h}
          rx={6}
          fill="none"
          stroke={OUTLINE[shortState].stroke}
          strokeDasharray={OUTLINE[shortState].dash}
          strokeWidth={OUTLINE[shortState].width}
        />
        <SvgHitTarget
          x={SHORT_SLOT.x + 2}
          y={SHORT_SLOT.y + 2}
          width={SHORT_SLOT.w - 4}
          height={SHORT_SLOT.h - 4}
          active={openSlot === "short"}
          label={
            shortEdge.given
              ? "The short edge was given, not answered"
              : shortEdge.latex !== null
                ? "The short edge is labeled"
                : openSlot === "short"
                  ? "Placement 3 of 3, the short edge: drop a length here"
                  : "The short edge, not open yet"
          }
          onPick={() => drop("short")}
          mark={fill.mark(shortEdge.given)}
        >
          {shortEdge.latex ? (
            <InlineMath
              latex={shortEdge.latex}
              color={shortEdge.given ? SIGNAL_DEEP : CIVIC}
            />
          ) : openSlot === "short" ? (
            <DropHere />
          ) : null}
        </SvgHitTarget>

        {/* The two `x` dimensions, on tick-bounded lines spanning the WHOLE original square.
            Floating a bare `x` at a midpoint is what let the top one read as measuring the
            shaded box it happened to sit over. */}
        <DimensionLine
          axis="x"
          along={DIM_TOP_Y}
          from={ORIGIN_X}
          to={SQUARE_RIGHT}
          toward={ORIGIN_Y}
        />
        <SvgMath
          latex="x"
          x={(ORIGIN_X + SQUARE_RIGHT) / 2}
          y={DIM_TOP_Y - 14}
          fontSize={14}
          color={LABEL}
          w={40}
        />
        <DimensionLine
          axis="y"
          along={DIM_LEFT_X}
          from={ORIGIN_Y}
          to={SQUARE_BOTTOM}
          toward={ORIGIN_X}
        />
        <SvgMath
          latex="x"
          x={DIM_LEFT_X - 14}
          y={(ORIGIN_Y + SQUARE_BOTTOM) / 2}
          fontSize={14}
          color={LABEL}
          w={40}
        />
      </svg>

      <div className="lesson-sorter__tray">
        {solved ? (
          <span className="lesson-sorter__tray-empty">Rectangle closed up</span>
        ) : (
          tray.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={chip.spoken}
              aria-pressed={pickup.held === chip.id}
              // BRICK on a missed chip is a verdict on a piece the learner DID offer, which
              // is what the correctness channel is for. Carrying one is not an offer, so the
              // held chip takes the third hue rather than the colour this board gives a
              // correctly placed edge.
              style={{
                color: LABEL,
                borderColor:
                  missed === chip.id ? BRICK : pickup.held === chip.id ? SIGNAL_DEEP : SOFT,
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
          Start over with a different basin
        </button>
      ) : null}

      {openSlot !== null && (
        <WidgetReveal
          available={missed !== null}
          // The reveal settles the placement it explains, which moves the board on to the
          // next one, and `available` falls with the miss it was offered for. So there is no
          // window in which this board is showing a spent reveal.
          revealed={false}
          answer={
            <InlineMath latex={chips.find((chip) => chip.slot === openSlot)?.latex ?? ""} />
          }
          why={
            openSlot === "piece" ? (
              <>
                The cut runs the width of the square along the lower edge of the corner that
                was taken out. Above it, beside that corner, is a strip{" "}
                <InlineMath latex={`x - ${cut}`} /> long and <InlineMath latex={`${cut}`} />{" "}
                deep. Turning it a quarter turn and setting it against the right-hand end of
                the lower rectangle adds to the length without changing the area, which is
                the whole of the argument.
              </>
            ) : openSlot === "long" ? (
              <>
                The lower rectangle is <InlineMath latex="x" /> long and the carried strip
                adds <InlineMath latex={`${cut}`} /> to it, so the long edge measures{" "}
                <InlineMath latex={`x + ${cut}`} />. That is where the sum in the identity
                comes from.
              </>
            ) : (
              <>
                The square was <InlineMath latex="x" /> deep and the cut-out corner took{" "}
                <InlineMath latex={`${cut}`} /> off that depth, so the short edge measures{" "}
                <InlineMath latex={`x - ${cut}`} />. The two edges differ by twice{" "}
                <InlineMath latex={`${cut}`} />, which is why one is a sum and the other a
                difference.
              </>
            )
          }
          onReveal={reveal}
          label="Reveal this placement"
          othersRemain={ORDER.filter((slot) => called[slot] !== true).length > 1}
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missChip ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : solved ? (
          <>
            The paving never changed, so{" "}
            <InlineMath
              latex={`x^{2} - ${cut * cut} = (x + ${cut})(x - ${cut})`}
              color={CIVIC}
            />
            . The same dissection works for any square taken out of any square, which is
            what makes this a shape worth recognizing rather than a case worth memorizing.
          </>
        ) : missChip ? (
          <span style={{ color: BRICK }}>
            {missChip.refusal ?? "That one belongs on the other edge."}
          </span>
        ) : (
          // The rule the placements rest on, now that the line above carries the imperative.
          <span style={{ color: SOFT }}>
            Nothing is added and nothing is taken away, so the area of the leftover paving
            is the same before and after the carry.
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * One dimension line with a tick at each end, drawn OUTSIDE the thing it measures.
 *
 * The ticks run from `TICK_OUT` past the line to `TICK_CLEAR` short of the geometry, so each
 * one is both the end mark and the extension line back to the corner it came from. That pair
 * is what says which extent the number belongs to: a bare label at a midpoint says only where
 * it was put.
 */
function DimensionLine({
  axis,
  along,
  from,
  to,
  toward,
}: {
  /** Which way the measured extent runs. */
  axis: "x" | "y";
  /** The other coordinate: where the line itself is drawn. */
  along: number;
  from: number;
  to: number;
  /** The near edge of the geometry, which the end ticks reach back to. */
  toward: number;
}) {
  const step = Math.sign(toward - along);
  const near = along - step * TICK_OUT;
  const far = toward - step * TICK_CLEAR;
  const horizontal = axis === "x";
  return (
    <g data-dimension={axis} stroke={LABEL} strokeWidth={1.1}>
      <line
        x1={horizontal ? from : along}
        y1={horizontal ? along : from}
        x2={horizontal ? to : along}
        y2={horizontal ? along : to}
      />
      {[from, to].map((end) => (
        <line
          key={end}
          x1={horizontal ? end : near}
          y1={horizontal ? near : end}
          x2={horizontal ? end : far}
          y2={horizontal ? far : end}
        />
      ))}
    </g>
  );
}

/** The name the figure prints beside a target, marked when that target is the open one. */
function TargetCaption({
  slot,
  caption,
  x,
  y,
  active,
}: {
  slot: SlotId;
  caption: string;
  x: number;
  y: number;
  active: boolean;
}) {
  return (
    <text
      data-target-caption={slot}
      data-active={active}
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={active ? 12 : 11}
      fontWeight={active ? 650 : 400}
      fill={active ? LABEL : SOFT}
    >
      {caption}
    </text>
  );
}

/**
 * What the open target says inside itself, so "click here" is a word and not a hue.
 *
 * Font styling only: centering ink inside a hit target is `svgHitTarget.tsx`'s job, because
 * every one of its call sites needs it and a wrapper only fixes the ones that remember.
 */
function DropHere() {
  return (
    <span style={{ fontSize: "10px", letterSpacing: "0.04em", color: SOFT }}>
      drop here
    </span>
  );
}
