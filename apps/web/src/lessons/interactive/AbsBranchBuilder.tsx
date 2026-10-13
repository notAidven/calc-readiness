/**
 * LIN.5 slide 1: write down the two ordinary equations the bars unpack into.
 *
 * The slide's whole move is that one equation with bars is two without them. A learner who is
 * shown that pair and agrees with it has still never produced the second one, which is the branch
 * they lose in practice. So both branches are built here, each checked on its own, and the second
 * is not derivable from the first without knowing what the bars do.
 *
 * The chips include the one that negates the SOLUTION and the one that flips a sign inside the
 * bars, which are the two wrong ways to make a second branch. They also include the second
 * branch written the other way round, $-(w - 34) = 5$ multiplied out, and that one is CORRECT:
 * it is where the sign the bars leave free is taken negative, and it solves to the same weight.
 * It was a distractor until `absBranchEquivalent.browser.test.tsx`, and a learner who wrote the
 * standard second branch was marked wrong and told a rule that is not one.
 *
 * Every slot carries visible text in every state, so a half-built pair reads as half-built rather
 * than as a different pair of equations.
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
  /** The equation carrying bars. */
  given: string;
  spoken: string;
  /** The quantity inside the bars, and the number on the right. */
  inside: string;
  right: number;
  /** The chip each slot names as ITS answer: what the reveal writes and prints. */
  positive: string;
  negative: string;
  /**
   * Every chip that is a correct branch for a slot, the canonical one first.
   *
   * Two entries on the negative branch, because two of the chips are the same equation:
   * $w - 34 = -5$ takes the sign on the right, and $-w + 34 = 5$ takes it on the left, and
   * both say the inside sits $5$ from zero on the low side. Grading only the first taught that
   * the second is not a branch at all, which is the standard statement of the rule.
   */
  accepted: Record<Slot, readonly string[]>;
  /** Where each branch lands. */
  lowSolution: number;
  highSolution: number;
  chips: readonly { id: string; latex: string; spoken: string }[];
}

/** Neither board is the paragraph's own $\lvert w - 60 \rvert = 2$ nor the CFU's rule. */
const BOARDS: readonly Board[] = [
  {
    given: "\\lvert w - 34 \\rvert = 5",
    spoken: "the absolute value of w minus 34 equals 5",
    inside: "w - 34",
    right: 5,
    positive: "pos",
    negative: "neg",
    accepted: { positive: ["pos"], negative: ["neg", "whole"] },
    lowSolution: 29,
    highSolution: 39,
    chips: [
      { id: "pos", latex: "w - 34 = 5", spoken: "w minus 34 equals 5" },
      { id: "neg", latex: "w - 34 = -5", spoken: "w minus 34 equals negative 5" },
      { id: "whole", latex: "-w + 34 = 5", spoken: "negative w plus 34 equals 5" },
      { id: "flip", latex: "w + 34 = -5", spoken: "w plus 34 equals negative 5" },
      { id: "solved", latex: "w = -39", spoken: "w equals negative 39" },
    ],
  },
  {
    given: "\\lvert h + 12 \\rvert = 7",
    spoken: "the absolute value of h plus 12 equals 7",
    inside: "h + 12",
    right: 7,
    positive: "pos",
    negative: "neg",
    accepted: { positive: ["pos"], negative: ["neg", "whole"] },
    lowSolution: -19,
    highSolution: -5,
    chips: [
      { id: "pos", latex: "h + 12 = 7", spoken: "h plus 12 equals 7" },
      { id: "neg", latex: "h + 12 = -7", spoken: "h plus 12 equals negative 7" },
      { id: "whole", latex: "-h - 12 = 7", spoken: "negative h minus 12 equals 7" },
      { id: "flip", latex: "h - 12 = -7", spoken: "h minus 12 equals negative 7" },
      { id: "solved", latex: "h = -7", spoken: "h equals negative 7" },
    ],
  },
];

type Slot = "positive" | "negative";
type Verdict = "right" | "wrong";

export function AbsBranchBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <AbsBranchBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AbsBranchBuilderBody({
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
  const [active, setActive] = useState<Slot>("positive");
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const chipById = new Map(board.chips.map((chip) => [chip.id, chip]));
  const wanted: Record<Slot, string> = {
    positive: board.positive,
    negative: board.negative,
  };
  const allSettled = settled.positive === true && settled.negative === true;

  /**
   * The branch a reveal is on offer for, which is the one a passage on screen is explaining.
   *
   * Read off the board rather than off `revealedSlot`, and it has to be: the first reveal
   * TEACHES AND STOPS, so the widget's own `reveal` never runs on it and the slot the passage is
   * about is not recorded anywhere. Marking on `revealedSlot` marked nothing at all over the one
   * window the mark exists for, which left the passage naming a branch above a slot still
   * holding the chip the learner got wrong.
   */
  const outstanding: Slot | null =
    verdicts[active] !== undefined && settled[active] !== true ? active : null;
  const handed: Slot | null = fill.given ? outstanding : null;

  function open(next: Partial<Record<Slot, boolean>>) {
    if (next.positive && next.negative && !gateOpen) {
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
    const entry = entries[slot];
    if (!entry) {
      setVerdicts((prev) => ({ ...prev, [slot]: "wrong" }));
      return;
    }
    if (board.accepted[slot].includes(entry)) {
      setVerdicts((prev) => ({ ...prev, [slot]: "right" }));
      const next = { ...settled, [slot]: true };
      setSettled(next);
      success();
      open(next);
      setActive(slot === "positive" ? "negative" : "positive");
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
      slot: "positive",
      stage: "branch one",
      label: "the branch where the inside is positive",
    },
    {
      slot: "negative",
      stage: "branch two",
      label: "the branch where the inside is negative",
    },
  ];

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: write the two ordinary equations this one unpacks into, so that between them
        they account for every weight the bars allow. Pick a branch, then pick the equation
        for it.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={board.given} color={LABEL} />
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
                      minWidth: "8rem",
                      // Absolute rather than comparative: the slot not being filled is dimmed to
                      // a fixed opacity and the live one says so in its own name (R26). A slot
                      // holding a handed-over answer is at full strength too, or the one thing
                      // the passage is about would be the faintest thing on the board.
                      opacity: done || live || given ? 1 : 0.55,
                      color: done ? CIVIC : LABEL,
                    }}
                    aria-label={
                      given
                        ? `${row.label} was given, not answered`
                        : live
                          ? `${partName(row.label, verdict)}, the branch being filled`
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
                  What the bars leave free is the SIGN of{" "}
                  <InlineMath latex={board.inside} />: one branch has it sitting{" "}
                  <InlineMath latex={String(board.right)} /> above zero and the other has it{" "}
                  <InlineMath latex={String(board.right)} /> below. Both branches keep the
                  same two sides of the equation, and the only thing they disagree about is
                  which way round that sign goes.
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
              aria-label={`Put ${chip.spoken} in ${active === "positive" ? "branch one" : "branch two"}`}
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
            row.slot === "positive" ? (
              <>
                One way for <InlineMath latex={board.inside} /> to sit{" "}
                <InlineMath latex={String(board.right)} /> from zero is to BE{" "}
                <InlineMath latex={String(board.right)} />, which is this branch and the one
                most learners write down without prompting.
              </>
            ) : (
              <>
                The other way is for <InlineMath latex={board.inside} /> to be{" "}
                <InlineMath latex={`-${board.right}`} />, because{" "}
                <InlineMath latex={`\\lvert -${board.right} \\rvert = ${board.right}`} />{" "}
                just as much. Putting the sign on the right is one way to write that;{" "}
                <InlineMath latex={`-(${board.inside}) = ${board.right}`} /> is the same
                branch with the sign taken on the left, and it lands on the same weight.
              </>
            )
          }
          onReveal={() => reveal(row.slot)}
          othersRemain={settled[row.slot === "positive" ? "negative" : "positive"] !== true}
          label={`Reveal ${row.stage}`}
        />
      ))}

      <p
        className="lesson-interactive__status"
        data-state={allSettled ? "solved" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : allSettled ? (
          <>
            Two ordinary equations, no bars left. Solving them gives{" "}
            <InlineMath latex={String(board.lowSolution)} /> and{" "}
            <InlineMath latex={String(board.highSolution)} />, and each of those really does
            read back an error of <InlineMath latex={String(board.right)} />.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            You are filling {active === "positive" ? "branch one" : "branch two"}. Each
            branch is checked on its own.
          </span>
        )}
      </p>
    </div>
  );
}
