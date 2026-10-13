/**
 * LIN.4 slide 4: solve, then write the range down the way practice asks for it.
 *
 * The slide solves one duty rule end to end and stops. Writing the result is where the attempt is
 * actually lost, because a learner who has the right stretch and the wrong bracket is marked wrong
 * for a choice nothing made them think about. So each row here asks for both endpoints and both
 * brackets, and it is graded as one range per row: a right stretch with a wrong end is not a
 * partly-right answer.
 *
 * Two rows, checked separately, because they are separately winnable. One divides by a positive and
 * one by a negative, so the row that reverses its sign cannot be finished by copying the other.
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
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Rule {
  id: string;
  /** The inequality to solve. */
  given: string;
  spoken: string;
  /** The solved form, and the interval it is written as. */
  solved: string;
  /** The finite endpoint, and which side of it the range runs. */
  bound: number;
  /** True when the range runs upward from the bound. */
  upward: boolean;
  /** True when the finite end is taken in. */
  closed: boolean;
  /** The step that isolates the variable, for the note and the reveal. */
  step: string;
  /** Set when this row's sign reverses. */
  reversed: boolean;
}

interface Board {
  rules: readonly [Rule, Rule];
}

function interval(rule: Rule): string {
  return rule.upward
    ? `${rule.closed ? "[" : "("}${rule.bound}, \\infty)`
    : `(-\\infty, ${rule.bound}${rule.closed ? "]" : ")"}`;
}

/** Neither board is the paragraph's own $5x + 4 \le 34$ nor the CFU's $7x + 6 \le 34$. */
const BOARDS: readonly Board[] = [
  {
    rules: [
      {
        id: "duty",
        given: "6x + 5 \\le 41",
        spoken: "6 x plus 5 is at most 41",
        solved: "x \\le 6",
        bound: 6,
        upward: false,
        closed: true,
        step: "6x \\le 36",
        reversed: false,
      },
      {
        id: "rebate",
        given: "-4x < 20",
        spoken: "negative 4 x is less than 20",
        solved: "x > -5",
        bound: -5,
        upward: true,
        closed: false,
        step: "x > -5",
        reversed: true,
      },
    ],
  },
  {
    rules: [
      {
        id: "toll",
        given: "3x - 7 > 8",
        spoken: "3 x minus 7 is greater than 8",
        solved: "x > 5",
        bound: 5,
        upward: true,
        closed: false,
        step: "3x > 15",
        reversed: false,
      },
      {
        id: "levy",
        given: "-2x \\ge 14",
        spoken: "negative 2 x is at least 14",
        solved: "x \\le -7",
        bound: -7,
        upward: false,
        closed: true,
        step: "x \\le -7",
        reversed: true,
      },
    ],
  },
];

type Verdict = "right" | "wrong";
interface Entry {
  bound: string;
  end: "closed" | "open" | null;
  side: "up" | "down" | null;
}

const BLANK: Entry = { bound: "", end: null, side: null };

export function IntervalWriteBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <IntervalWriteBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function IntervalWriteBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [settled, setSettled] = useState<Record<string, boolean>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const allSettled = board.rules.every((rule) => settled[rule.id]);

  /**
   * The row a reveal is on offer for: checked, missed, and still the learner's.
   *
   * ONE at a time, because the shared fill flag carries no row with it. Both rows can be missed
   * before either is settled, and this board filled EVERY endpoint whenever any reveal was
   * holding: a passage about one rule's range printed the other rule's endpoint into its box,
   * which is an answer the learner was never told about and had not been asked for yet.
   *
   * Only the endpoint is filled. The direction and the bracket are `aria-pressed` chips rather
   * than blanks, so the fill has nothing to write into for them and the passage above carries
   * them in words.
   */
  const outstanding =
    board.rules.find(
      (rule) => verdicts[rule.id] !== undefined && settled[rule.id] !== true,
    ) ?? null;
  const givenId = fill.given ? (outstanding?.id ?? null) : null;

  function entryFor(id: string): Entry {
    return entries[id] ?? BLANK;
  }

  /**
   * Merge a patch into one row's entry, reading the PREVIOUS state rather than the render's.
   *
   * Reading `entryFor(id)` here would lose the earlier of two changes made before the next
   * render: choosing a direction and then a bracket would keep only the bracket.
   */
  function update(id: string, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [id]: { ...(prev[id] ?? BLANK), ...patch } }));
  }

  function open(next: Record<string, boolean>) {
    if (board.rules.every((rule) => next[rule.id]) && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function check(rule: Rule) {
    if (settled[rule.id]) {
      return;
    }
    const entry = entryFor(rule.id);
    if (entry.bound.trim() === "" || entry.end === null || entry.side === null) {
      setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss: the note under the row
    // says so rather than restating how to isolate the variable, which would answer a
    // question the learner did not ask.
    const read = readNumericEntry(entry.bound, "integer");
    if (!read.ok) {
      setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
      return;
    }
    const hit =
      read.value === rule.bound &&
      (entry.end === "closed") === rule.closed &&
      (entry.side === "up") === rule.upward;
    if (hit) {
      setVerdicts((prev) => ({ ...prev, [rule.id]: "right" }));
      const next = { ...settled, [rule.id]: true };
      setSettled(next);
      success();
      open(next);
      return;
    }
    setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
  }

  function reveal(rule: Rule) {
    update(rule.id, {
      bound: String(rule.bound),
      end: rule.closed ? "closed" : "open",
      side: rule.upward ? "up" : "down",
    });
    setRevealedId(rule.id);
    setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
    const next = { ...settled, [rule.id]: true };
    setSettled(next);
    open(next);
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: solve each rule and write its answer as an interval. Enter the endpoint, say
        which way the range runs from it, and say whether that endpoint is in the range.
      </WidgetTask>

      <div className="lesson-equation">
        {board.rules.map((rule) => {
          const entry = entryFor(rule.id);
          const verdict = verdicts[rule.id] ?? null;
          const done = settled[rule.id] === true;
          return (
            <div key={rule.id} data-part-row={rule.id}>
              <div className="lesson-equation__row" data-state={done ? "done" : "open"}>
                <span className="lesson-equation__stage lesson-equation__stage--math">
                  <InlineMath latex={rule.given} color={done ? CIVIC : LABEL} />
                </span>
                <span className="lesson-equation__body">
                  <input
                    className="lesson-equation__slot"
                    {...numericEntryProps("integer")}
                    value={entry.bound}
                    readOnly={done}
                    placeholder="Endpoint"
                    aria-label={partName(`Endpoint for ${rule.spoken}`, verdict)}
                    onChange={(event) => update(rule.id, { bound: event.target.value })}
                    {...(givenId === rule.id ? fill.entry(rule.bound) : {})}
                  />
                </span>
                <span className="lesson-equation__aside">
                  {verdict ? <WidgetPartVerdict verdict={verdict} /> : null}
                  {done ? null : (
                    <button
                      type="button"
                      className="lesson-interactive__check lesson-interactive__check--part"
                      onClick={() => check(rule)}
                    >
                      Check
                    </button>
                  )}
                </span>
              </div>

              {done ? (
                // Inside the row rather than in a row-NOTE: a note is the channel a missed part
                // is answered on, and putting a settled part's summary there reads as a
                // correction for something that was right.
                <p className="lesson-equation__naming" style={{ color: CIVIC }}>
                  <InlineMath latex={rule.solved} color={CIVIC} />, which is{" "}
                  <InlineMath latex={interval(rule)} color={CIVIC} />.
                </p>
              ) : (
                // A group per question rather than four chips in one wrapping row: the row asks
                // two separate things, and which pair a chip belongs to was left to wherever
                // `flex-wrap` happened to break. The chips carry the same neutral token, so the
                // grouping is the only thing saying which choice is which.
                <div className="lesson-interactive__control-groups">
                  {/* No `role="group"` on either: every chip's own `aria-label` already names
                      the rule and the choice, so the grouping is what a SIGHTED learner is
                      missing and a screen reader is not. */}
                  <div className="lesson-interactive__controls">
                    {(
                      [
                        ["down", "Runs downward"],
                        ["up", "Runs upward"],
                      ] as const
                    ).map(([side, label]) => (
                      <button
                        key={side}
                        type="button"
                        className="lesson-interactive__chip"
                        aria-label={`${label} from the endpoint, for ${rule.spoken}`}
                        aria-pressed={entry.side === side}
                        // Only the UNCHOSEN border is set here. The chosen one belongs to
                        // `.lesson-interactive__chip[aria-pressed="true"]`, and an inline colour
                        // beats a stylesheet, so naming it here would put this board back on the
                        // grey-against-grey the shared rule was written to replace.
                        style={{
                          color: LABEL,
                          borderColor: entry.side === side ? undefined : LINE,
                        }}
                        onClick={() => update(rule.id, { side })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="lesson-interactive__controls">
                    {(
                      [
                        ["closed", "Endpoint in"],
                        ["open", "Endpoint out"],
                      ] as const
                    ).map(([end, label]) => (
                      <button
                        key={end}
                        type="button"
                        className="lesson-interactive__chip"
                        aria-label={`${label} of the range, for ${rule.spoken}`}
                        aria-pressed={entry.end === end}
                        style={{
                          color: LABEL,
                          borderColor: entry.end === end ? undefined : LINE,
                        }}
                        onClick={() => update(rule.id, { end })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {verdict === "wrong" && !done && !fill.given ? (
                <WidgetPartNote>
                  {readNumericEntry(entry.bound, "integer").ok ? (
                    <>
                      Isolate the variable first, which takes this rule to{" "}
                      <InlineMath latex={rule.step} />.{" "}
                      {rule.reversed
                        ? "The number being divided out is negative here, so the direction of the sign is not what it was."
                        : "The sign keeps its direction, because nothing negative was divided out."}{" "}
                      Then read the endpoint off, and let the sign decide the bracket.
                    </>
                  ) : (
                    WHOLE_NUMBER_MISS
                  )}
                </WidgetPartNote>
              ) : null}
            </div>
          );
        })}
      </div>

      {allSettled ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with two different rules
        </button>
      ) : null}

      {board.rules.map((rule) => (
        <WidgetReveal
          key={rule.id}
          available={outstanding?.id === rule.id}
          revealed={revealedId === rule.id}
          answer={<InlineMath latex={interval(rule)} />}
          why={
            <>
              Isolating the variable gives <InlineMath latex={rule.solved} />
              {rule.reversed
                ? ", and the direction turned over on the way because the divisor was negative"
                : ", with the direction unchanged"}
              . The range therefore runs {rule.upward ? "upward" : "downward"} from{" "}
              <InlineMath latex={String(rule.bound)} />, and the sign is{" "}
              {rule.closed
                ? "the at-least or at-most kind, so the endpoint is taken in and its bracket is square"
                : "strict, so the endpoint is left out and its bracket is round"}
              . Written out that is <InlineMath latex={interval(rule)} />.
            </>
          }
          onReveal={() => reveal(rule)}
          othersRemain={board.rules.some(
            (other) => other.id !== rule.id && !settled[other.id],
          )}
          label="Reveal this range"
        />
      ))}

      <p
        className="lesson-interactive__status"
        data-state={allSettled ? "solved" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : allSettled ? (
          <>
            Both ranges are written. One of the two reversed its sign on the way, because
            its divisor was negative, and that changed which way the range runs without
            changing any of the arithmetic.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            Each rule is checked on its own, and a range needs all three of its parts before
            it can be checked at all.
          </span>
        )}
      </p>
    </div>
  );
}
