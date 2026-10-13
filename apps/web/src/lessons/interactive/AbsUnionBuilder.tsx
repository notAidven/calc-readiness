/**
 * LIN.6 slide 2: build the two-piece answer, one ray at a time.
 *
 * The slide argues the failures cannot be one band. Writing the result is where the argument gets
 * tested, because the union has a shape a learner has to produce rather than recognise: two rays
 * pointing OUTWARDS, each keeping the bracket its own sign gave it.
 *
 * Two rays, checked separately, because they are separately winnable: the lower one comes from the
 * negated branch and the upper from the plain one, and a learner can get either without the other.
 * The chips include both rays pointing INWARDS, which is the union that covers the whole scale and
 * is what a learner writes when they keep the direction of the sign instead of the direction of the
 * branch.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The rule carrying bars, and the branch pair it unpacks into. */
  given: string;
  spoken: string;
  branches: string;
  /** The correct chip ids, lower ray first. */
  lower: string;
  upper: string;
  standard: number;
  tolerance: number;
  strict: boolean;
  chips: readonly { id: string; latex: string; spoken: string }[];
}

/** Neither board is the paragraph's own $\lvert w - 60 \rvert > 2$, whose answer the prose states. */
const BOARDS: readonly Board[] = [
  {
    given: "\\lvert w - 45 \\rvert > 6",
    spoken: "the absolute value of w minus 45 is greater than 6",
    branches: "w - 45 > 6 \\;\\text{ or }\\; w - 45 < -6",
    lower: "low",
    upper: "high",
    standard: 45,
    tolerance: 6,
    strict: true,
    chips: [
      { id: "low", latex: "(-\\infty, 39)", spoken: "everything below 39" },
      { id: "high", latex: "(51, \\infty)", spoken: "everything above 51" },
      {
        id: "low-closed",
        latex: "(-\\infty, 39]",
        spoken: "everything up to and including 39",
      },
      { id: "inward-low", latex: "(39, \\infty)", spoken: "everything above 39" },
      { id: "inward-high", latex: "(-\\infty, 51)", spoken: "everything below 51" },
    ],
  },
  {
    given: "\\lvert w - 20 \\rvert \\ge 8",
    spoken: "the absolute value of w minus 20 is at least 8",
    branches: "w - 20 \\ge 8 \\;\\text{ or }\\; w - 20 \\le -8",
    lower: "low",
    upper: "high",
    standard: 20,
    tolerance: 8,
    strict: false,
    chips: [
      { id: "low", latex: "(-\\infty, 12]", spoken: "everything up to and including 12" },
      { id: "high", latex: "[28, \\infty)", spoken: "everything from 28 upwards" },
      { id: "low-open", latex: "(-\\infty, 12)", spoken: "everything below 12" },
      { id: "inward-low", latex: "[12, \\infty)", spoken: "everything from 12 upwards" },
      {
        id: "inward-high",
        latex: "(-\\infty, 28]",
        spoken: "everything up to and including 28",
      },
    ],
  },
];

type Slot = "lower" | "upper";
type Verdict = "right" | "wrong";

export function AbsUnionBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <AbsUnionBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AbsUnionBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [entries, setEntries] = useState<Partial<Record<Slot, string>>>({});
  const [verdicts, setVerdicts] = useState<Partial<Record<Slot, Verdict>>>({});
  const [settled, setSettled] = useState<Partial<Record<Slot, boolean>>>({});
  const [revealedSlot, setRevealedSlot] = useState<Slot | null>(null);
  const [active, setActive] = useState<Slot>("lower");
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const chipById = new Map(board.chips.map((chip) => [chip.id, chip]));
  const wanted: Record<Slot, string> = { lower: board.lower, upper: board.upper };
  const allSettled = settled.lower === true && settled.upper === true;

  /**
   * The ray a reveal is on offer for, which is the one a passage on screen is explaining.
   *
   * Read off the board rather than off `revealedSlot`: the first reveal teaches and STOPS, so
   * the widget's own `reveal` never runs on it and nothing records which ray it was about. The
   * mark keyed on `revealedSlot` was therefore false over the whole window it exists for, and
   * the slot went on showing the inward-pointing ray the learner had just been told was wrong.
   */
  const outstanding: Slot | null =
    verdicts[active] !== undefined && settled[active] !== true ? active : null;
  const handed: Slot | null = fill.given ? outstanding : null;
  const low = board.standard - board.tolerance;
  const high = board.standard + board.tolerance;

  function open(next: Partial<Record<Slot, boolean>>) {
    if (next.lower && next.upper && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function place(chipId: string) {
    if (settled[active] || fill.given) {
      return;
    }
    setEntries((prev) => ({ ...prev, [active]: chipId }));
  }

  function check(slot: Slot) {
    if (settled[slot]) {
      return;
    }
    if (!entries[slot]) {
      setVerdicts((prev) => ({ ...prev, [slot]: "wrong" }));
      return;
    }
    if (entries[slot] === wanted[slot]) {
      setVerdicts((prev) => ({ ...prev, [slot]: "right" }));
      const next = { ...settled, [slot]: true };
      setSettled(next);
      success();
      open(next);
      setActive(slot === "lower" ? "upper" : "lower");
      return;
    }
    setVerdicts((prev) => ({ ...prev, [slot]: "wrong" }));
  }

  function reveal(slot: Slot) {
    setEntries((prev) => ({ ...prev, [slot]: wanted[slot] }));
    setRevealedSlot(slot);
    setVerdicts((prev) => ({ ...prev, [slot]: "wrong" }));
    const next = { ...settled, [slot]: true };
    setSettled(next);
    open(next);
  }

  const rows: readonly { slot: Slot; stage: string; label: string }[] = [
    {
      slot: "lower",
      stage: "lower ray",
      label: "the ray of weights well under the standard",
    },
    {
      slot: "upper",
      stage: "upper ray",
      label: "the ray of weights well over the standard",
    },
  ];

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: write the two rays this rule's answer is made of, one for each way a weight
        can fail. Pick a ray, then pick the interval that belongs in it.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={board.given} color={LABEL} />, which unpacks into{" "}
        <InlineMath latex={board.branches} color={SOFT} />
      </p>

      <div className="lesson-equation">
        {rows.map((row) => {
          const given = handed === row.slot;
          const entry = given ? wanted[row.slot] : entries[row.slot];
          const verdict = verdicts[row.slot] ?? null;
          const done = settled[row.slot] === true;
          const live = !done && !given && active === row.slot;
          return (
            <div key={row.slot} data-part-row={row.slot}>
              <div className="lesson-equation__row" data-state={done ? "done" : "open"}>
                <span className="lesson-equation__stage">{row.stage}</span>
                <span className="lesson-equation__body">
                  <button
                    type="button"
                    className={
                      entry
                        ? "lesson-equation__slot lesson-equation__slot--done"
                        : "lesson-equation__slot lesson-equation__slot--locked"
                    }
                    style={{
                      width: "auto",
                      minWidth: "7rem",
                      // Absolute rather than comparative (R26): an idle slot is dimmed to a fixed
                      // opacity, and the live one names itself. A slot holding a handed-over ray
                      // is at full strength too, since it is what the passage is about.
                      opacity: done || live || given ? 1 : 0.55,
                      color: done ? CIVIC : LABEL,
                    }}
                    aria-label={
                      given
                        ? `${row.label} was given, not answered`
                        : live
                          ? `${partName(row.label, verdict)}, the ray being filled`
                          : partName(row.label, verdict)
                    }
                    aria-pressed={live}
                    disabled={done}
                    onClick={() => setActive(row.slot)}
                    {...fill.mark(given)}
                  >
                    {entry ? (
                      <InlineMath latex={chipById.get(entry)?.latex ?? ""} />
                    ) : (
                      <span aria-hidden="true">?</span>
                    )}
                  </button>
                </span>
                <span className="lesson-equation__aside">
                  {verdict ? <WidgetPartVerdict verdict={verdict} /> : null}
                  {done ? null : (
                    <button
                      type="button"
                      className="lesson-interactive__check lesson-interactive__check--part"
                      onClick={() => check(row.slot)}
                    >
                      Check
                    </button>
                  )}
                </span>
              </div>
              {verdict === "wrong" && !done && !fill.given ? (
                <WidgetPartNote>
                  A failing weight drifts AWAY from the standard, so each ray points
                  outwards from its own endpoint. The bracket on it comes from the sign in{" "}
                  <InlineMath latex={board.given} />, which is{" "}
                  {board.strict ? "strict" : "the at-least kind"}.
                </WidgetPartNote>
              ) : null}
            </div>
          );
        })}
      </div>

      {allSettled ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different rule
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          {board.chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-interactive__chip"
              aria-label={`Put ${chip.spoken} in the ${active} ray`}
              // One neutral token on every chip: a hue here would mark the answer.
              style={{ color: LABEL, borderColor: LINE }}
              onClick={() => place(chip.id)}
            >
              <InlineMath latex={chip.latex} />
            </button>
          ))}
        </div>
      )}

      {rows.map((row) => (
        <WidgetReveal
          key={row.slot}
          available={outstanding === row.slot}
          revealed={revealedSlot === row.slot}
          answer={<InlineMath latex={chipById.get(wanted[row.slot])?.latex ?? ""} />}
          why={
            row.slot === "lower" ? (
              <>
                The negated branch is{" "}
                <InlineMath
                  latex={`w - ${board.standard} ${board.strict ? "<" : "\\le"} -${board.tolerance}`}
                />
                , so adding <InlineMath latex={String(board.standard)} /> gives{" "}
                <InlineMath latex={`w ${board.strict ? "<" : "\\le"} ${low}`} />. That ray
                points downwards from <InlineMath latex={String(low)} />, and its bracket is{" "}
                {board.strict
                  ? "round, because the sign is strict"
                  : "square, because the sign is the at-least kind and takes its endpoint in"}
                .
              </>
            ) : (
              <>
                The plain branch is{" "}
                <InlineMath
                  latex={`w - ${board.standard} ${board.strict ? ">" : "\\ge"} ${board.tolerance}`}
                />
                , so adding <InlineMath latex={String(board.standard)} /> gives{" "}
                <InlineMath latex={`w ${board.strict ? ">" : "\\ge"} ${high}`} />. That ray
                points upwards from <InlineMath latex={String(high)} />, away from the
                standard rather than towards it.
              </>
            )
          }
          onReveal={() => reveal(row.slot)}
          othersRemain={settled[row.slot === "lower" ? "upper" : "lower"] !== true}
          label={`Reveal the ${row.slot} ray`}
        />
      ))}

      <p
        className="lesson-interactive__status"
        data-state={allSettled ? "solved" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : allSettled ? (
          <>
            Joined with a union that is{" "}
            <InlineMath
              latex={`${chipById.get(board.lower)?.latex ?? ""} \\cup ${chipById.get(board.upper)?.latex ?? ""}`}
            />
            . The two rays point away from each other, and the whole passing band lies in
            the gap they leave.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            You are filling the {active} ray. Each ray is checked on its own.
          </span>
        )}
      </p>
    </div>
  );
}
