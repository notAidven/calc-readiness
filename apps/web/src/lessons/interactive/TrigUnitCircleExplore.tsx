/**
 * TRG.3 slide 0 (BESPOKE): the unit circle, worked as an antenna turning on its pad.
 *
 * The slide's claim is that a heading and a position are the same fact written two ways, so
 * the learner has to produce the heading from a description of the position rather than read
 * a position off a heading they were handed. Each task names where the antenna has to end up
 * ("as far left of the vertical axis as it can go, with no vertical reach at all") and never
 * names the heading, so aiming it is the question.
 *
 * ## The two reaches are named for the axis each is measured from
 *
 * They used to be "along the pad" and "across the pad". Those read as a matched pair and are
 * nothing of the kind: neither word carries its own meaning, so which one was the horizontal
 * one had to be guessed, and the board never said. It could not keep them straight itself
 * either, asking for a position "as far across the pad as it can go" on one board and for the
 * same axis "as far below the center" on the other. So each reach is now named for the axis it
 * is measured from: the HORIZONTAL REACH is how far the tip sits left or right of the vertical
 * axis, and the VERTICAL REACH is how far it sits above or below the horizontal axis. Any
 * direction beside one of them is said in the four words the sibling boards on this slide
 * already use, `TrigQuadrantSorter`'s "above the horizontal axis" and "right of the vertical
 * axis". The antenna, the pad and the headings all stay; what went is using "along" and
 * "across" as if they named a direction.
 *
 * Naming the direction rather than only the size is also what keeps the miss at 270 degrees a
 * real one. The opening task asks for the tip as far ABOVE the horizontal axis as it reaches:
 * 270 degrees reaches exactly as far vertically and the other way, so it is still the tempting
 * answer, and it is now decidably the wrong one rather than an ambiguity in the question.
 *
 * ## Why there is no live readout of the two reaches
 *
 * There was going to be one, and it hands the whole board over: with the two coordinates
 * updating as the arm turns, a learner reaches every task by dragging until the numbers look
 * like the sentence, which is a search rather than a piece of reasoning. What turns instead
 * is a dashed drop to each axis, so the two reaches are visible AS LENGTHS while the arm
 * moves and are not readable as values. The values are written on only after a heading is
 * locked in and found correct, which is the moment they teach something.
 *
 * The current heading in degrees IS shown, because the pad is marked and an engineer aiming a
 * dish can see where it points. Knowing the arm sits at 210 degrees is not knowing what the
 * antenna reaches there, which is the whole of what the board asks.
 *
 * ## Dragging, and the two buttons beside it
 *
 * The arm follows a pointer anywhere on the pad and snaps to the sixteen marked headings, so
 * the interaction is the physical one the framing describes. The step buttons are not a
 * lesser fallback: they are how the board is worked from a keyboard, and they are what a test
 * drives, since a drag asserts the pointer plumbing and not the mathematics.
 *
 * ## Why the ROUND's imperative is in the task slot and not the status line
 *
 * It used to be the other way around: `WidgetTask` carried a board-level goal that never said
 * what to do right now, and `targets[at].question`, the sentence that does, rendered in
 * `.lesson-interactive__status` below the pad, the chips and the controls. So a learner met an
 * exploration-styled pad with a vague goal on top and the real instruction below the fold, and
 * a wrong lock-in then overwrote that instruction with feedback and did not put it back until
 * the round advanced: the task was not merely late, it left the screen at the first miss. The
 * imperative therefore leads, and the status line keeps the one job it can keep across an
 * overwrite, which is the standing aiming prompt and the per-attempt feedback that replaces it.
 * Do not restate the question down there; two copies of a task is the fix wearing the defect's
 * clothes.
 */

import { type ReactNode, useRef, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

/**
 * Every heading the pad is marked for: the four quadrantal ones and the special angles in
 * each quadrant. Sixteen stops, so the arm cannot be parked between two of them and no task
 * has an answer the pad does not offer.
 */
const MARKED: readonly number[] = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
];

/**
 * What the status line says while a heading is being aimed. It is a strategy line and not the
 * task: the task is in the slot above the pad, where a wrong attempt cannot overwrite it, and
 * this is what the same wrong attempt is free to replace.
 */
const AIMING =
  "The two dashed drops are the two reaches: the sideways one is the horizontal reach, measured from the vertical axis, and the up-and-down one is the vertical reach, measured from the horizontal axis. Turn the arm until both of them look the way the task above describes.";

const CENTER = { x: 180, y: 150 } as const;
const RADIUS = 100;

/** Where a heading lands on the pad, in SVG user units. */
function padPoint(heading: number, reach: number = RADIUS): { x: number; y: number } {
  const radians = (heading * Math.PI) / 180;
  return {
    x: CENTER.x + reach * Math.cos(radians),
    y: CENTER.y - reach * Math.sin(radians),
  };
}

/** The marked heading nearest a bearing, so a drag always settles on a stop. */
function snap(bearing: number): number {
  const wrapped = ((bearing % 360) + 360) % 360;
  let best = MARKED[0] as number;
  let gap = 360;
  for (const heading of MARKED) {
    const raw = Math.abs(wrapped - heading);
    const around = Math.min(raw, 360 - raw);
    if (around < gap) {
      gap = around;
      best = heading;
    }
  }
  return best;
}

interface Target {
  key: string;
  /** Where the antenna has to end up, described without naming the heading. */
  question: ReactNode;
  heading: number;
  /** The horizontal reach, signed and as LaTeX: how far left or right of the vertical axis. */
  along: string;
  /** The vertical reach, signed and as LaTeX: how far above or below the horizontal axis. */
  across: string;
  /**
   * How a screen reader says the pair, rendered `.visually-hidden` beside the recorded chip's
   * KaTeX. The chip's own math is an ordered pair with no words in it, so without this a
   * screen-reader user hears two numbers and is not told which reach either one of them is.
   */
  spoken: string;
  why: ReactNode;
}

interface Board {
  /** Where the arm starts: a marked heading that answers none of the tasks. */
  start: number;
  targets: readonly Target[];
}

/**
 * Two boards, and no task is repeated between them. Each opens on a quadrantal heading, where
 * one reach is the full radius and the other is nothing at all, and closes on a heading whose
 * two reaches are equal in size, which is the first place a learner meets a radical as a
 * position rather than as a triangle ratio.
 */
const BOARDS: readonly Board[] = [
  {
    start: 30,
    targets: [
      {
        key: "quarter",
        question: (
          <>
            Aim the antenna so its tip sits as far above the horizontal axis as it can go,
            with no horizontal reach at all.
          </>
        ),
        heading: 90,
        along: "0",
        across: "1",
        spoken: "horizontal reach nothing, vertical reach one",
        why: (
          <>
            A quarter turn from the start leaves the arm pointing straight up. Its tip sits
            directly above the center, so the horizontal reach is nothing at all and the
            vertical reach is the full radius. On the unit circle that point is{" "}
            <InlineMath latex="(0,\, 1)" />, and the two numbers are exactly{" "}
            <InlineMath latex="\cos 90^{\circ}" /> and{" "}
            <InlineMath latex="\sin 90^{\circ}" />.
          </>
        ),
      },
      {
        key: "half",
        question: (
          <>
            Now aim it so its tip sits as far left of the vertical axis as it can go, with
            no vertical reach at all.
          </>
        ),
        heading: 180,
        along: "-1",
        across: "0",
        spoken: "horizontal reach negative one, vertical reach nothing",
        why: (
          <>
            Half a turn puts the arm back on the horizontal axis, pointing the other way.
            The horizontal reach is the full radius, but it is measured leftward, so it
            counts as <InlineMath latex="-1" />, and there is no vertical reach. The point
            is <InlineMath latex="(-1,\, 0)" />: a leftward reach is what a negative cosine
            means.
          </>
        ),
      },
      {
        key: "diagonal",
        question: (
          <>
            Aim it so the horizontal reach and the vertical reach are the same size as each
            other, with the tip left of the vertical axis and below the horizontal axis.
          </>
        ),
        heading: 225,
        along: "-\\dfrac{\\sqrt{2}}{2}",
        across: "-\\dfrac{\\sqrt{2}}{2}",
        spoken:
          "horizontal reach negative root two over two, vertical reach negative root two over two",
        why: (
          <>
            Equal reaches put the arm exactly halfway between two axes, and left of the
            vertical axis and below the horizontal axis is the third quadrant, so the
            heading is <InlineMath latex="225^{\circ}" />. Each reach is{" "}
            <InlineMath latex="\dfrac{\sqrt{2}}{2}" /> of the radius, one measured leftward
            and one measured downward, so both are negative and the point is{" "}
            <InlineMath latex="\left(-\dfrac{\sqrt{2}}{2},\, -\dfrac{\sqrt{2}}{2}\right)" />
            .
          </>
        ),
      },
    ],
  },
  {
    start: 150,
    targets: [
      {
        key: "start-line",
        question: (
          <>
            Aim the antenna so its tip sits as far right of the vertical axis as it can go,
            with no vertical reach at all.
          </>
        ),
        heading: 0,
        along: "1",
        across: "0",
        spoken: "horizontal reach one, vertical reach nothing",
        why: (
          <>
            Pointing straight along the horizontal axis to the right is where a turn is
            measured from, so the heading is <InlineMath latex="0^{\circ}" />. The tip sits
            the full radius right of the center and level with it, which is the point{" "}
            <InlineMath latex="(1,\, 0)" />. Every other heading on the board is measured
            from here.
          </>
        ),
      },
      {
        key: "three-quarter",
        question: (
          <>
            Now aim it so its tip sits as far below the horizontal axis as it can go, with
            no horizontal reach at all.
          </>
        ),
        heading: 270,
        along: "0",
        across: "-1",
        spoken: "horizontal reach nothing, vertical reach negative one",
        why: (
          <>
            Three quarters of a turn leaves the arm pointing straight down. There is no
            horizontal reach, and the vertical reach is the full radius measured downward,
            so it counts as <InlineMath latex="-1" />. The point is{" "}
            <InlineMath latex="(0,\, -1)" />.
          </>
        ),
      },
      {
        key: "diagonal-up",
        question: (
          <>
            Aim it so the horizontal reach and the vertical reach are the same size as each
            other, with the tip right of the vertical axis and above the horizontal axis.
          </>
        ),
        heading: 45,
        along: "\\dfrac{\\sqrt{2}}{2}",
        across: "\\dfrac{\\sqrt{2}}{2}",
        spoken: "horizontal reach root two over two, vertical reach root two over two",
        why: (
          <>
            Equal reaches put the arm exactly halfway between two axes, and right of the
            vertical axis and above the horizontal axis is the first quadrant, so the
            heading is <InlineMath latex="45^{\circ}" />. Each reach is{" "}
            <InlineMath latex="\dfrac{\sqrt{2}}{2}" /> of the radius, one measured rightward
            and one measured upward, so both are positive and the point is{" "}
            <InlineMath latex="\left(\dfrac{\sqrt{2}}{2},\, \dfrac{\sqrt{2}}{2}\right)" />.
          </>
        ),
      },
    ],
  },
];

export function TrigUnitCircleExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <TrigUnitCircleExploreBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function TrigUnitCircleExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { targets } = board;
  const [heading, setHeading] = useState(board.start);
  const [at, setAt] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [revealedAt, setRevealedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const pad = useRef<SVGSVGElement | null>(null);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = at >= targets.length;
  const open = targets[at] ?? null;

  /**
   * The settled task whose reaches are written on the pad: the one just finished, and only
   * while the arm is still standing at its heading. Turning away clears the labels, so the
   * next task cannot be answered by reading the last one.
   */
  const shownIndex = at - 1;
  const shown =
    shownIndex >= 0 && targets[shownIndex]?.heading === heading
      ? (targets[shownIndex] as Target)
      : null;

  function advance(earned: boolean) {
    const next = at + 1;
    setAt(next);
    setAttempted(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= targets.length) {
      onSolved();
    }
  }

  function turn(by: number) {
    const stops = MARKED.length;
    const where = MARKED.indexOf(heading);
    const from = where < 0 ? 0 : where;
    setHeading(MARKED[(from + by + stops) % stops] as number);
  }

  function lockIn() {
    if (open === null) {
      return;
    }
    setAttempted(true);
    // A fresh attempt steps the reveal aside, so it is on offer for the task in hand rather
    // than staying spent on the one it already explained.
    setRevealedAt(null);
    if (heading === open.heading) {
      advance(true);
      return;
    }
    setFeedback(
      "Not that heading. A reach has a direction as well as a size, so check which way each of the two runs: a horizontal reach to the left, or a vertical reach downward, is a different position from the same distance measured to the right or upward.",
    );
  }

  /** Where a pointer on the pad puts the arm: the marked heading nearest to it. */
  function aimAt(clientX: number, clientY: number) {
    const svg = pad.current;
    if (!svg) {
      return;
    }
    const box = svg.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      return;
    }
    const x = ((clientX - box.left) / box.width) * 360 - CENTER.x;
    const y = CENTER.y - ((clientY - box.top) / box.height) * 300;
    if (x === 0 && y === 0) {
      return;
    }
    setHeading(snap((Math.atan2(y, x) * 180) / Math.PI));
  }

  const tip = padPoint(heading);
  const arm = solved ? CIVIC : BRICK;

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      {/* The imperative for the round in hand, not a board-level goal: what a learner has to
          do right now is the first thing on the widget, and feedback cannot take it away. */}
      <WidgetTask>
        {solved ? (
          <>
            All three positions are aimed, and the pad has recorded the horizontal reach and
            the vertical reach of each of them.
          </>
        ) : (
          <>
            Position {at + 1} of {targets.length}. {open?.question} Get all three and the
            pad will have recorded the horizontal reach and the vertical reach of each one.
          </>
        )}
      </WidgetTask>

      {/* 300, not the default 460: the pad's 360x300 viewBox is squarer than any other swept
        figure, so a full-width column drew it 383px tall and the 340px height cap letterboxed
        it inside a 460px box. Sized instead of capped, it draws 250px tall with no dead side
        margins, which is the 78.8px of task line and figure chrome inside the 350px band. */}
      <WidgetBeside
        figureWidth={300}
        figure={
          /* The arm is dragged around the pad, and every heading the drag can reach is also
             reachable from the two step buttons below, which are the keyboard path. */
          <svg
            ref={pad}
            viewBox="0 0 360 300"
            role="img"
            aria-label={`A circular antenna pad marked at sixteen headings, with the arm currently aimed at ${heading} degrees`}
            onPointerDown={(event) => {
              setDragging(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              aimAt(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (dragging) {
                aimAt(event.clientX, event.clientY);
              }
            }}
            onPointerUp={(event) => {
              setDragging(false);
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => setDragging(false)}
            style={{ touchAction: "none" }}
          >
            <title>
              An antenna on a circular pad, aimed at one of sixteen marked headings
            </title>

            <line
              x1={CENTER.x - RADIUS - 26}
              y1={CENTER.y}
              x2={CENTER.x + RADIUS + 26}
              y2={CENTER.y}
              stroke={LINE}
              strokeWidth={1.2}
            />
            <line
              x1={CENTER.x}
              y1={CENTER.y - RADIUS - 26}
              x2={CENTER.x}
              y2={CENTER.y + RADIUS + 26}
              stroke={LINE}
              strokeWidth={1.2}
            />
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={RADIUS}
              fill="none"
              stroke={LINE}
              strokeWidth={1.6}
            />

            {MARKED.map((mark) => {
              const spot = padPoint(mark);
              const done = targets.some(
                (target, index) => index < at && target.heading === mark,
              );
              return (
                <circle
                  key={mark}
                  cx={spot.x}
                  cy={spot.y}
                  r={done ? 4.5 : 2.6}
                  fill={done ? CIVIC : SOFT}
                />
              );
            })}

            {/* The two reaches, as lengths rather than as values: this is what turns while the
            learner drags, and it is deliberately unlabeled until a heading is locked in. */}
            <line
              x1={tip.x}
              y1={tip.y}
              x2={tip.x}
              y2={CENTER.y}
              stroke={SOFT}
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
            <line
              x1={tip.x}
              y1={tip.y}
              x2={CENTER.x}
              y2={tip.y}
              stroke={SOFT}
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />

            <line
              x1={CENTER.x}
              y1={CENTER.y}
              x2={tip.x}
              y2={tip.y}
              stroke={arm}
              strokeWidth={2.4}
            />
            <circle cx={CENTER.x} cy={CENTER.y} r={3.4} fill={LABEL} />
            <circle
              cx={tip.x}
              cy={tip.y}
              r={8}
              fill="var(--paper)"
              stroke={arm}
              strokeWidth={2.4}
            />

            {/* Both reaches land ON the drawing: one beside the horizontal axis, one beside the
            vertical, and at a diagonal heading the second crosses the circle stroke and a
            marked heading dot. Bare `plate`, which is the figure card `.lesson-visual` paints,
            not `plate="plot"`: there is no plot rect here to fill with `var(--paper)`. */}
            {shown === null ? null : (
              <>
                <SvgMath
                  latex={shown.along}
                  x={tip.x}
                  y={tip.y > CENTER.y ? CENTER.y - 20 : CENTER.y + 20}
                  fontSize={13}
                  color={CIVIC}
                  w={72}
                  plate
                />
                <SvgMath
                  latex={shown.across}
                  x={tip.x > CENTER.x ? CENTER.x - 34 : CENTER.x + 34}
                  y={tip.y}
                  fontSize={13}
                  color={CIVIC}
                  w={72}
                  plate
                />
              </>
            )}
          </svg>
        }
      >
        <div className="lesson-interactive__row">
          <span className="lesson-interactive__chip" data-heading={heading}>
            <InlineMath latex={`${heading}^{\\circ}`} color={solved ? CIVIC : LABEL} />
          </span>
          {targets.map((target, index) => (
            <span
              key={target.key}
              data-reach-slot={target.key}
              data-state={index < at ? "solved" : "waiting"}
              data-open={index === at ? "yes" : "no"}
              className="lesson-interactive__chip"
            >
              <InlineMath
                latex={
                  index < at
                    ? `${target.heading}^{\\circ}: \\left(${target.along},\\, ${target.across}\\right)`
                    : "?"
                }
                color={index < at ? CIVIC : SOFT}
              />
              {index < at ? (
                <span className="visually-hidden">
                  {`, at ${target.heading} degrees: ${target.spoken}`}
                </span>
              ) : null}
            </span>
          ))}
        </div>

        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with different positions
          </button>
        ) : (
          <div className="lesson-interactive__controls">
            <button
              type="button"
              className="lesson-interactive__chip"
              aria-label="Turn the antenna counterclockwise to the next marked heading"
              onClick={() => turn(1)}
            >
              Turn counterclockwise
            </button>
            <button
              type="button"
              className="lesson-interactive__chip"
              aria-label="Turn the antenna clockwise to the next marked heading"
              onClick={() => turn(-1)}
            >
              Turn clockwise
            </button>
            <button type="button" className="lesson-interactive__check" onClick={lockIn}>
              Lock in this heading
            </button>
          </div>
        )}

        <WidgetReveal
          available={attempted && !solved}
          revealed={revealedAt !== null}
          answer={
            open ? (
              <InlineMath
                latex={`${open.heading}^{\\circ}, \\left(${open.along},\\, ${open.across}\\right)`}
              />
            ) : null
          }
          why={open?.why ?? null}
          onReveal={() => {
            if (open === null) {
              return;
            }
            setRevealedAt(at);
            setHeading(open.heading);
            advance(false);
          }}
          label="Reveal this position"
          othersRemain={at + 1 < targets.length}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {revealedAt !== null && !solved ? null : solved ? (
            <>
              Every heading on the pad hands back a pair of reaches, and those two numbers
              are what <InlineMath latex="\cos" /> and <InlineMath latex="\sin" /> of that
              heading mean. What stays fixed at one unit is the distance out to the tip, not
              the two reaches added together: neither of them is ever more than one, and a
              turn that lengthens one shortens the other.
            </>
          ) : (
            (feedback ?? AIMING)
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
