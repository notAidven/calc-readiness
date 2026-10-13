/**
 * GEO.2 interactive (slide 0): which measurement of the piazza each order is counted from.
 *
 * The two quantities are taught together because they are read off the SAME rectangle, and a
 * learner who has met them separately can still reach for whichever one they computed last.
 * So the board is a list of jobs on one court, and the call is what the job is counted from.
 *
 * Three calls rather than two, and the third is not padding: a court has plenty of
 * measurements that are neither of these (a depth, a height), and a two-way board would teach
 * that every number about a rectangle has to be one of the pair. It also stops the board being
 * worked by elimination, since neither call is the answer to a fixed number of rows.
 *
 * A wrong call LOCKS the row and the gate needs a clean board, which is what makes this a
 * question rather than an activity with retries. A settled row keeps all three calls on
 * screen, disabled and marked, because the teaching here is the comparison. The palette
 * follows the shared rule: the learner's own pick is a verdict in `CIVIC` or `BRICK`, and the
 * call that was right on a row they MISSED is `SIGNAL_DEEP` and dashed, since green there
 * would credit a pick that was never made.
 */

import { Fragment, type ReactNode, useRef, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

/** The three calls, in the order they are drawn under every row. */
const CALLS = ["Area", "Perimeter", "Neither"] as const;

/** What a marked option is saying, in every channel it says it in. */
const MARKS = {
  /** Their pick, and it was right. The one mark that gets a fill. */
  chosenRight: {
    colour: CIVIC,
    style: "solid",
    fill: `color-mix(in srgb, ${CIVIC} 15%, var(--paper))`,
    glyph: "\u2713",
    spoken: "your answer, correct",
  },
  /** Their pick, and it was wrong. Outline only, so a fill never means "wrong". */
  chosenWrong: {
    colour: BRICK,
    style: "solid",
    fill: undefined,
    glyph: "\u2717",
    spoken: "your answer, wrong",
  },
  /** Not their pick: the call that was right here. A standing mark, so not green. */
  standing: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    fill: undefined,
    glyph: "\u2713",
    spoken: "the right call here, which you did not pick",
  },
} as const;

type MarkName = keyof typeof MARKS;

interface Order {
  id: string;
  /** The job, as it would be written on the order. */
  job: string;
  /** Which of `CALLS` is the right one. */
  right: 0 | 1 | 2;
  /** ONE sentence: why the call the learner made was not the right one. */
  note: string;
  /** The fuller reasoning, printed by the board's reveal when this row was missed. */
  why: ReactNode;
}

interface Board {
  /** The court every order on this board is measured from. */
  length: number;
  width: number;
  orders: readonly Order[];
}

/**
 * Two courts, with different orders on each and different measurements to reach. Neither
 * reuses the slide's own $12$ by $9$ court or the check's cistern.
 */
const BOARDS: readonly Board[] = [
  {
    length: 14,
    width: 9,
    orders: [
      {
        id: "b0-slabs",
        job: "Slabs to pave the whole court",
        right: 0,
        note: "Slabs cover the surface inside the rim, and covering is counted in square meters.",
        why: (
          <>
            Paving fills the inside of the rectangle, so the order is the surface it lies
            on: <InlineMath latex="14 \times 9 = 126" /> square meters. Nothing about the
            rim is involved, because a slab in the middle of the court is as much of the
            order as one at the edge.
          </>
        ),
      },
      {
        id: "b0-kerb",
        job: "Curb stone cut to run right round the rim",
        right: 1,
        note: "The curb follows the boundary, and a boundary is a distance rather than a surface.",
        why: (
          <>
            The curb runs along the edge and nowhere else, so the order is the distance
            round it: <InlineMath latex="14 + 9 + 14 + 9 = 46" /> meters. Doubling the
            length of the court would not double this, since only two of the four sides
            would have grown.
          </>
        ),
      },
      {
        id: "b0-drain",
        job: "How far the drain is sunk below the paving",
        right: 2,
        note: "A depth is measured straight downward, so neither measurement of the court produces it.",
        why: (
          <>
            A depth is one length taken at right angles to the paving, and the court's
            length and width say nothing about it. Not every number on a plan is one of the
            two: a rectangle only offers the surface inside it and the distance round it.
          </>
        ),
      },
      {
        id: "b0-awning",
        job: "Cloth stretched over the court as an awning",
        right: 0,
        note: "The cloth has to cover the whole court, and covering is counted in square meters.",
        why: (
          <>
            The awning has to reach every part of the court underneath it, so it is bought
            by the same <InlineMath latex="126" /> square meters the slabs are. Two
            different materials, one measurement, because both of them cover rather than
            bound.
          </>
        ),
      },
    ],
  },
  {
    length: 11,
    width: 7,
    orders: [
      {
        id: "b1-rope",
        job: "Rope run once around the court to fence the work",
        right: 1,
        note: "The rope follows the boundary, so it is a distance and not a surface.",
        why: (
          <>
            One circuit of the court is the distance round it:{" "}
            <InlineMath latex="11 + 7 + 11 + 7 = 36" /> meters. A rope is bought by the
            meter, which is the unit the boundary is measured in.
          </>
        ),
      },
      {
        id: "b1-turf",
        job: "Turf lifted from the whole plot",
        right: 0,
        note: "Turf is lifted off the surface inside the rim, and a surface is counted in square meters.",
        why: (
          <>
            The turf covers the inside of the rectangle, so the amount lifted is{" "}
            <InlineMath latex="11 \times 7 = 77" /> square meters. It is the same
            measurement paving would need, since both of them are about the surface rather
            than the edge.
          </>
        ),
      },
      {
        id: "b1-wall",
        job: "The height of the wall standing along one side",
        right: 2,
        note: "A height is measured upward, so neither measurement of the court produces it.",
        why: (
          <>
            The wall's height is measured up from the ground, and the court's length and
            width fix neither it nor anything derived from it. A rectangle on the ground
            offers the surface inside it and the distance round it, and a height is neither.
          </>
        ),
      },
      {
        id: "b1-rail",
        job: "Timber for a low rail set along every side",
        right: 1,
        note: "A rail set along every side follows the boundary, so it is counted in meters.",
        why: (
          <>
            The rail runs along all four sides, which is exactly the distance round the
            court: <InlineMath latex="36" /> meters. It is the rope's measurement again,
            because the job is the same job in a different material.
          </>
        ),
      },
    ],
  },
];

export function GeoPavingClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GeoPavingClassifyBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GeoPavingClassifyBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Row id -> the call the learner made, as an index into `CALLS`. */
  const [calls, setCalls] = useState<Record<string, number>>({});
  /**
   * The same map, readable synchronously. Two rows called inside one task are batched into a
   * single render, so `calls` is one commit stale in the second handler. The body is keyed on
   * the variant nonce, so this resets with the rest of the state on a redraw.
   */
  const answered = useRef<Record<string, number>>({});
  const [walked, setWalked] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const orders = board.orders;
  const area = board.length * board.width;
  const perimeter = 2 * (board.length + board.width);

  const complete = Object.keys(calls).length === orders.length;
  const missedRows = orders.filter(
    (order) => calls[order.id] !== undefined && calls[order.id] !== order.right,
  );
  const missed = missedRows.length > 0;
  const solved = complete && !missed;

  function answer(order: Order, took: number) {
    if (answered.current[order.id] !== undefined) {
      return;
    }
    const next = { ...answered.current, [order.id]: took };
    answered.current = next;
    setCalls(next);
    if (took !== order.right) {
      return;
    }
    success();
    const clean = orders.every((row) => next[row.id] === row.right);
    if (clean && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** Every option renders in the SAME neutral token until its row settles. */
  const neutral = { color: LABEL, borderColor: LINE };

  /** The call that was right on each missed row, named beside the job it belongs to. */
  const missedCalls = (
    <>
      {missedRows.map((order, at) => (
        <Fragment key={order.id}>
          {at === 0 ? null : at === missedRows.length - 1 ? " and " : ", "}
          {`${order.job}: ${CALLS[order.right]}`}
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: call every order on this court by the measurement it is counted from, until
        the whole list has been sorted into what covers the court, what runs round it, and
        what neither measurement gives.
      </WidgetTask>

      <p className="lesson-classify__reading">
        The court measures <InlineMath latex={`${board.length}`} /> meters by{" "}
        <InlineMath latex={`${board.width}`} /> meters.
      </p>

      {/* THE BOARD GRID, which every row borrows its columns from. Without it the rows were
          each `grid-template-columns: subgrid` with no grid to inherit from, and subgrid on a
          box that is not a grid item resolves to `none` — so all four cells auto-placed into
          one column and the whole board came out as a single stack, the job wrapped a word to
          a line with its three calls underneath it. The classes read correctly the whole time,
          which is why nothing in the DOM said so. The default four tracks are the shape here:
          the job, then the three calls. */}
      <div className="lesson-classify">
        {orders.map((order) => {
          const call = calls[order.id];
          const locked = call !== undefined;
          const markOf = (at: number): MarkName | null => {
            if (!locked) {
              return null;
            }
            const right = at === order.right;
            if (at === call) {
              return right ? "chosenRight" : "chosenWrong";
            }
            return right && call !== order.right ? "standing" : null;
          };
          return (
            <div
              key={order.id}
              className="lesson-classify__item"
              data-settled={locked ? "true" : undefined}
            >
              <div className="lesson-classify__row">
                {/* Ink in every state: the verdict belongs on the options, and tinting the job
                  by the learner's correctness would make a perfectly good order look wrong. */}
                <span className="lesson-interactive__step-eq" style={{ color: LABEL }}>
                  {order.job}
                </span>
                {CALLS.map((label, at) => {
                  const name = markOf(at);
                  const mark = name === null ? null : MARKS[name];
                  return (
                    <button
                      key={label}
                      type="button"
                      className="lesson-interactive__chip"
                      data-mark={name ?? undefined}
                      disabled={locked}
                      aria-label={
                        mark === null
                          ? `${order.job}: ${label}`
                          : `${order.job}: ${label}, ${mark.spoken}`
                      }
                      style={
                        mark === null
                          ? neutral
                          : {
                              color: mark.colour,
                              borderColor: mark.colour,
                              borderStyle: mark.style,
                              background: mark.fill,
                            }
                      }
                      onClick={() => answer(order, at)}
                    >
                      {label}
                      {mark === null ? null : (
                        <span aria-hidden="true" className="lesson-classify__mark">
                          {mark.glyph}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* What a missed row says, under the row it is about rather than in the shared
                status line the next row's answer would overwrite. */}
              {locked && call !== order.right ? (
                <p className="lesson-classify__note" data-state="wrong" role="status">
                  {order.note}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {complete && (
        <div className="lesson-interactive__controls">
          <WidgetReveal
            available={missed}
            revealed={walked}
            answer={missedCalls}
            why={missedRows.map((order) => (
              <Fragment key={order.id}>{order.why} </Fragment>
            ))}
            onReveal={() => setWalked(true)}
            label="Show the working"
            // Read off the board rather than passed as a constant. Every order has been
            // called by the time this control exists, so there is nothing to hand back.
            othersRemain={orders.some((order) => calls[order.id] === undefined)}
          />
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {missed ? "Try a fresh set of orders" : "Start over on a different court"}
          </button>
        </div>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : complete && missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Every order landed. Covering this court takes <InlineMath latex={`${area}`} />{" "}
            square meters and running round it takes <InlineMath latex={`${perimeter}`} />{" "}
            meters, from the same two measurements.
          </>
        ) : complete && missed ? (
          "The list is finished with a call that did not hold. The reasoning is below, and a fresh set of orders follows it."
        ) : (
          "Ask what each order actually touches: the surface inside the court, the line round its edge, or something the two measurements never reach."
        )}
      </p>
    </div>
  );
}
