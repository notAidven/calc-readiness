/**
 * FUN.2 slide 3: having found the allowed inputs, write them down the way practice asks for
 * them.
 *
 * Finding the boundary is the part a learner thinks the question is about, and it is not where
 * the attempt is lost. A domain with the right boundary and the wrong bracket is marked wrong
 * for a choice nothing made them think about, so each row here asks for all three pieces at
 * once and is graded as one interval: a right stretch with a wrong end is not a partly-right
 * answer.
 *
 * Two rows per board, and the pairing is the whole design. One row's root stands on its own,
 * so its boundary is TAKEN IN: the root of zero is zero, which is a perfectly good output. The
 * other row's root sits underneath a quotient, so the same boundary is LEFT OUT, because a
 * zero there empties the bottom. Same arithmetic, opposite bracket, and across the two boards
 * all four combinations of direction and bracket appear, so neither piece can be answered by
 * habit.
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
import { numericEntryProps, readNumericEntry, WHOLE_NUMBER_MISS } from "./numericEntry";

interface Rule {
  id: string;
  /** The rule whose domain is wanted. */
  given: string;
  spoken: string;
  /** The condition the allowed inputs have to satisfy, as LaTeX. */
  condition: string;
  /** The solved condition, e.g. `x \ge 5`. */
  solved: string;
  /** The boundary input, and which side of it the domain runs. */
  bound: number;
  /** True when the domain runs upward from the boundary. */
  upward: boolean;
  /** True when the boundary itself is allowed. */
  closed: boolean;
  /** Why the boundary is in or out, in one clause that completes "because ...". */
  because: string;
}

interface Board {
  rules: readonly [Rule, Rule];
}

/** The letter a rule is called by, read off its own statement: `f` out of `f(x) = ...`. */
function ruleLetter(rule: Rule): string {
  return rule.given.slice(0, Math.max(0, rule.given.indexOf("(")));
}

function interval(rule: Rule): string {
  return rule.upward
    ? `${rule.closed ? "[" : "("}${rule.bound}, \\infty)`
    : `(-\\infty, ${rule.bound}${rule.closed ? "]" : ")"}`;
}

/**
 * Two boards. Across the four rows every combination of direction and bracket appears exactly
 * once, and none of them is the CFU's rule.
 */
const BOARDS: readonly Board[] = [
  {
    rules: [
      {
        id: "b0-root",
        given: "f(x) = \\sqrt{x - 5}",
        spoken: "f of x equals the square root of x minus 5",
        condition: "x - 5 \\ge 0",
        solved: "x \\ge 5",
        bound: 5,
        upward: true,
        closed: true,
        because:
          "the root only has to avoid a negative, and the square root of zero is zero, which is a perfectly good output",
      },
      {
        id: "b0-quotient",
        given: "g(x) = \\dfrac{8}{\\sqrt{3 - x}}",
        spoken: "g of x equals 8 over the square root of 3 minus x",
        condition: "3 - x > 0",
        solved: "x < 3",
        bound: 3,
        upward: false,
        closed: false,
        because:
          "the root is on the BOTTOM here, so a zero under it would empty the denominator, and the boundary has to be left out as well as the negatives",
      },
    ],
  },
  {
    rules: [
      {
        id: "b1-root",
        given: "f(x) = \\sqrt{9 - x}",
        spoken: "f of x equals the square root of 9 minus x",
        condition: "9 - x \\ge 0",
        solved: "x \\le 9",
        bound: 9,
        upward: false,
        closed: true,
        because:
          "nothing is dividing here, so the only requirement is that the quantity under the root is not negative, and zero is allowed",
      },
      {
        id: "b1-quotient",
        given: "g(x) = \\dfrac{2}{\\sqrt{x + 4}}",
        spoken: "g of x equals 2 over the square root of x plus 4",
        condition: "x + 4 > 0",
        solved: "x > -4",
        bound: -4,
        upward: true,
        closed: false,
        because:
          "a root on the BOTTOM has to be more than zero rather than merely not negative, since a zero denominator has no value at all",
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

export function DomainIntervalBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <DomainIntervalBuildBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DomainIntervalBuildBody({
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const allSettled = board.rules.every((rule) => settled[rule.id]);

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
      setPendingId(rule.id);
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss: the note under the row
    // says so rather than restating the method, which would answer a question the learner
    // did not ask.
    const read = readNumericEntry(entry.bound, "integer");
    if (!read.ok) {
      setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
      setPendingId(rule.id);
      return;
    }
    const hit =
      read.value === rule.bound &&
      (entry.end === "closed") === rule.closed &&
      (entry.side === "up") === rule.upward;
    if (!hit) {
      setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
      setPendingId(rule.id);
      return;
    }
    setVerdicts((prev) => ({ ...prev, [rule.id]: "right" }));
    setPendingId((current) => (current === rule.id ? null : current));
    const next = { ...settled, [rule.id]: true };
    setSettled(next);
    success();
    open(next);
  }

  function reveal(rule: Rule) {
    update(rule.id, {
      bound: String(rule.bound),
      end: rule.closed ? "closed" : "open",
      side: rule.upward ? "up" : "down",
    });
    setRevealedId(rule.id);
    setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
    setSettled({ ...settled, [rule.id]: true });
    // NOT `open`. Where this was the last row outstanding, that row's answer IS the gate, so
    // handing it over and opening the gate in the same click would let a learner past on an
    // answer they were given. The shared layer owns the release from here: it hands the board
    // back while another row is open, and releases on the second reveal.
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: write each rule's domain as an interval. Give the boundary input, say which
        way the allowed inputs run from it, and say whether the boundary itself is allowed.
      </WidgetTask>

      <div className="lesson-equation">
        {board.rules.map((rule) => {
          const entry = entryFor(rule.id);
          const verdict = verdicts[rule.id] ?? null;
          const done = settled[rule.id] === true;
          return (
            <div key={rule.id} data-part-row={rule.id}>
              {/* The rule gets a line of its own rather than the row's first cell. That cell is a
                  fixed 4.6rem naming track and `.katex` is `nowrap`, so a statement too wide for it
                  is painted over the input beside it instead of wrapping: these two need 77.5px and
                  79.3px of 73.6px. The stage keeps the short name the row is answered under, which
                  is what a naming track is sized for, and the statement a learner has to read to
                  pick the bracket gets the full width. Guard: `mathCaseTransform.browser.test.tsx`. */}
              <p className="lesson-equation__naming">
                <InlineMath latex={rule.given} color={done ? CIVIC : LABEL} />
              </p>
              <div className="lesson-equation__row" data-state={done ? "done" : "open"}>
                <span className="lesson-equation__stage lesson-equation__stage--math">
                  <InlineMath
                    latex={`${ruleLetter(rule)}(x)`}
                    color={done ? CIVIC : LABEL}
                  />
                </span>
                <span className="lesson-equation__body">
                  <input
                    className="lesson-equation__slot"
                    {...numericEntryProps("integer")}
                    value={entry.bound}
                    readOnly={done}
                    aria-label={partName(`Boundary input for ${rule.spoken}`, verdict)}
                    onChange={(event) => update(rule.id, { bound: event.target.value })}
                    {...(pendingId === rule.id ? fill.entry(rule.bound) : {})}
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
                  <InlineMath latex={rule.solved} color={CIVIC} /> , which is{" "}
                  <InlineMath latex={interval(rule)} color={CIVIC} />.
                </p>
              ) : (
                <div className="lesson-interactive__controls">
                  {(
                    [
                      ["down", "Inputs run downward"],
                      ["up", "Inputs run upward"],
                    ] as const
                  ).map(([side, label]) => (
                    <button
                      key={side}
                      type="button"
                      className="lesson-interactive__chip"
                      aria-label={`${label} from the boundary, for ${rule.spoken}`}
                      aria-pressed={entry.side === side}
                      style={{
                        color: LABEL,
                        borderColor: entry.side === side ? SOFT : LINE,
                      }}
                      onClick={() => update(rule.id, { side })}
                    >
                      {label}
                    </button>
                  ))}
                  {(
                    [
                      ["closed", "Boundary allowed"],
                      ["open", "Boundary refused"],
                    ] as const
                  ).map(([end, label]) => (
                    <button
                      key={end}
                      type="button"
                      className="lesson-interactive__chip"
                      aria-label={`${label}, for ${rule.spoken}`}
                      aria-pressed={entry.end === end}
                      style={{ color: LABEL, borderColor: entry.end === end ? SOFT : LINE }}
                      onClick={() => update(rule.id, { end })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {verdict === "wrong" && !done && !fill.given ? (
                <WidgetPartNote>
                  {readNumericEntry(entry.bound, "integer").ok ? (
                    <>
                      Write down what the quantity under the root has to satisfy, which here
                      is <InlineMath latex={rule.condition} />, and solve that for the
                      input. The sign in it is what settles the bracket, and a negative
                      multiplying the input is the only thing that can turn the direction
                      over.
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
          available={pendingId === rule.id && settled[rule.id] !== true}
          revealed={revealedId === rule.id}
          answer={<InlineMath latex={interval(rule)} />}
          why={
            <>
              The quantity under the root has to satisfy{" "}
              <InlineMath latex={rule.condition} />, {rule.because}. Solving it gives{" "}
              <InlineMath latex={rule.solved} />, so the allowed inputs run{" "}
              {rule.upward ? "upward" : "downward"} from{" "}
              <InlineMath latex={String(rule.bound)} /> and its bracket is{" "}
              {rule.closed ? "square" : "round"}. Written out that is{" "}
              <InlineMath latex={interval(rule)} />.
            </>
          }
          onReveal={() => reveal(rule)}
          othersRemain={board.rules.some(
            (other) => other.id !== rule.id && !settled[other.id],
          )}
          // Named by the rule it is about. Both rows offer a reveal and "Reveal this domain"
          // was true of either, so a learner mid-board could not tell which one they were
          // about to spend.
          label={`Reveal the domain of ${ruleLetter(rule)}`}
        />
      ))}

      <p
        className="lesson-interactive__status"
        data-state={allSettled ? "solved" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : allSettled ? (
          <>
            Both domains are written. The two rules ask the same arithmetic question of the
            same root and get opposite brackets out of it, because one of the roots is
            underneath a quotient and a zero there has nowhere to go.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            Each rule is checked on its own, and a domain needs all three of its pieces
            before it can be checked at all.
          </span>
        )}
      </p>
    </div>
  );
}
