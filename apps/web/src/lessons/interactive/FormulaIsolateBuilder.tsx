/**
 * LIN.3 slide 2: build the rearranged rule when the wanted quantity is inside a group or under
 * a divisor.
 *
 * The slide's method is peel the outermost operation first, and the thing that method produces
 * is an EXPRESSION rather than a decision, so the learner assembles one. Two rules are on the
 * board at once, each with its own check: one has the divisor on the outside and one has the
 * group on the outside, so neither can be finished by copying the shape of the other.
 *
 * The chips include the numerator that forgot to multiply the whole side, and the one that
 * subtracted before clearing the fraction, which are the two ways the outermost-first rule gets
 * broken. Every slot is a real button carrying visible text: nothing on the board is a hidden
 * operand, so a half-built rule reads as half-built rather than as a different rule.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  type RevealFillProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";

interface Rule {
  id: string;
  /** The rule as the tablet has it. */
  given: string;
  /** The quantity to isolate. */
  target: string;
  /** The correct numerator and denominator ids. */
  top: string;
  bottom: string;
  /** The first move, for the reveal. */
  cleared: string;
  why: ReactNode;
  note: ReactNode;
}

interface Chip {
  id: string;
  latex: string;
  spoken: string;
}

interface Board {
  rules: readonly [Rule, Rule];
  chips: readonly Chip[];
}

const BOARDS: readonly Board[] = [
  {
    rules: [
      {
        id: "mould",
        given: "A = \\dfrac{h(a + b)}{2}",
        target: "a",
        top: "twoA-hb",
        bottom: "h",
        cleared: "2A = h(a + b)",
        why: (
          <>
            The divisor is outermost, so multiplying both sides by <InlineMath latex="2" />{" "}
            comes first and gives <InlineMath latex="2A = h(a + b)" />. Dividing by{" "}
            <InlineMath latex="h" /> then gives <InlineMath latex="\dfrac{2A}{h} = a + b" />
            , and taking <InlineMath latex="b" /> off collects the whole of{" "}
            <InlineMath latex="2A - hb" /> over the single <InlineMath latex="h" />.
          </>
        ),
        note: (
          <>
            The <InlineMath latex="2" /> underneath is the outermost operation on that side,
            so it is the first one to undo. Whatever comes off after that has to come off
            the whole side and not one piece of it.
          </>
        ),
      },
      {
        id: "duty",
        given: "T = p(n + c)",
        target: "n",
        top: "T-pc",
        bottom: "p",
        cleared: "\\dfrac{T}{p} = n + c",
        why: (
          <>
            Here nothing is divided yet, so <InlineMath latex="p" /> multiplying the group
            is outermost: dividing both sides by it gives{" "}
            <InlineMath latex="\dfrac{T}{p} = n + c" />. Subtracting{" "}
            <InlineMath latex="c" /> then puts <InlineMath latex="T - pc" /> over{" "}
            <InlineMath latex="p" /> once the two terms are written over one bar.
          </>
        ),
        note: (
          <>
            <InlineMath latex="p" /> multiplies the whole bracket, so it divides the whole
            of the other side. Only after that is there anything to subtract.
          </>
        ),
      },
    ],
    chips: [
      { id: "twoA-hb", latex: "2A - hb", spoken: "2 A minus h b" },
      { id: "T-pc", latex: "T - pc", spoken: "T minus p c" },
      { id: "h", latex: "h", spoken: "h" },
      { id: "p", latex: "p", spoken: "p" },
      { id: "twoA-b", latex: "2A - b", spoken: "2 A minus b" },
      { id: "T-c", latex: "T - c", spoken: "T minus c" },
      { id: "twoh", latex: "2h", spoken: "2 h" },
    ],
  },
  {
    rules: [
      {
        id: "assay",
        given: "S = \\dfrac{k(q - r)}{3}",
        target: "q",
        top: "threeS+kr",
        bottom: "k",
        cleared: "3S = k(q - r)",
        why: (
          <>
            Multiplying both sides by <InlineMath latex="3" /> clears the divisor and gives{" "}
            <InlineMath latex="3S = k(q - r)" />. Dividing by <InlineMath latex="k" /> gives{" "}
            <InlineMath latex="\dfrac{3S}{k} = q - r" />, and because{" "}
            <InlineMath latex="r" /> is SUBTRACTED there it is ADDED to isolate past it, so
            the numerator is <InlineMath latex="3S + kr" />.
          </>
        ),
        note: (
          <>
            The <InlineMath latex="3" /> underneath goes first. Watch the sign on the{" "}
            <InlineMath latex="r" /> when it moves, because the rule subtracts it.
          </>
        ),
      },
      {
        id: "charge",
        given: "W = m(g + d)",
        target: "g",
        top: "W-md",
        bottom: "m",
        cleared: "\\dfrac{W}{m} = g + d",
        why: (
          <>
            <InlineMath latex="m" /> multiplies the whole bracket, so dividing both sides by
            it gives <InlineMath latex="\dfrac{W}{m} = g + d" />. Taking{" "}
            <InlineMath latex="d" /> off and writing both terms over one bar gives{" "}
            <InlineMath latex="\dfrac{W - md}{m}" />.
          </>
        ),
        note: (
          <>
            Nothing here is divided by a plain number, so the multiplier outside the bracket
            is the outermost operation and the first to undo.
          </>
        ),
      },
    ],
    chips: [
      { id: "threeS+kr", latex: "3S + kr", spoken: "3 S plus k r" },
      { id: "W-md", latex: "W - md", spoken: "W minus m d" },
      { id: "k", latex: "k", spoken: "k" },
      { id: "m", latex: "m", spoken: "m" },
      { id: "threeS-kr", latex: "3S - kr", spoken: "3 S minus k r" },
      { id: "W-d", latex: "W - d", spoken: "W minus d" },
      { id: "threek", latex: "3k", spoken: "3 k" },
    ],
  },
];

type Slot = "top" | "bottom";
type Verdict = "right" | "wrong";

export function FormulaIsolateBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <FormulaIsolateBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function FormulaIsolateBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [entries, setEntries] = useState<Record<string, Partial<Record<Slot, string>>>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [settled, setSettled] = useState<Record<string, boolean>>({});
  const [revealedRule, setRevealedRule] = useState<string | null>(null);
  const [active, setActive] = useState<{ rule: string; slot: Slot }>({
    rule: board.rules[0].id,
    slot: "top",
  });
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const chipById = new Map(board.chips.map((chip) => [chip.id, chip]));
  const allSettled = board.rules.every((rule) => settled[rule.id]);
  const activeRule = board.rules.find((rule) => rule.id === active.rule) ?? board.rules[0];

  /**
   * The rule a reveal is on offer for, which is the one a passage on screen is explaining.
   *
   * Read off the board rather than off `revealedRule`, and it has to be: the first reveal
   * TEACHES AND STOPS, so this widget's own `reveal` never runs on it and nothing records which
   * rule it was about. The mark keyed on `revealedRule` was therefore false over the one window
   * it exists for, and the passage stated a rearrangement above two slots still holding the
   * chips the learner had just been told were wrong.
   *
   * BOTH of the rule's slots are handed over together, because the passage explains one whole
   * fraction: a numerator over a denominator the learner is still owed is not the answer the
   * passage states.
   */
  const outstanding: string | null =
    verdicts[active.rule] !== undefined && settled[active.rule] !== true
      ? active.rule
      : null;
  const handedRule: string | null = fill.given ? outstanding : null;

  function open(next: Record<string, boolean>) {
    if (board.rules.every((rule) => next[rule.id]) && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function place(chipId: string) {
    if (settled[active.rule] || fill.given) {
      return;
    }
    setEntries((prev) => ({
      ...prev,
      [active.rule]: { ...prev[active.rule], [active.slot]: chipId },
    }));
    setActive((prev) => ({ ...prev, slot: prev.slot === "top" ? "bottom" : "top" }));
  }

  function check(rule: Rule) {
    if (settled[rule.id]) {
      return;
    }
    const entry = entries[rule.id] ?? {};
    if (!entry.top || !entry.bottom) {
      setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
      return;
    }
    if (entry.top === rule.top && entry.bottom === rule.bottom) {
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
    setEntries((prev) => ({
      ...prev,
      [rule.id]: { top: rule.top, bottom: rule.bottom },
    }));
    setRevealedRule(rule.id);
    setVerdicts((prev) => ({ ...prev, [rule.id]: "wrong" }));
    const next = { ...settled, [rule.id]: true };
    setSettled(next);
    open(next);
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: write each rule out re-pointed at the quantity named beside it, as one
        fraction. Pick a slot, then pick the piece that belongs in it.
      </WidgetTask>

      <div className="lesson-equation">
        {board.rules.map((rule) => {
          const given = handedRule === rule.id;
          const entry = given
            ? { top: rule.top, bottom: rule.bottom }
            : (entries[rule.id] ?? {});
          const verdict = verdicts[rule.id] ?? null;
          const done = settled[rule.id] === true;
          const colour = done ? CIVIC : LABEL;
          return (
            <div key={rule.id} data-part-row={rule.target}>
              <p className="lesson-equation__naming">
                <InlineMath latex={rule.given} color={SOFT} />, for{" "}
                <InlineMath latex={rule.target} color={SOFT} />
              </p>
              <div className="lesson-equation__row" data-state={done ? "done" : "open"}>
                {/* Typeset, not interpolated: a variable in a plain string is not math, and
                    nothing in the cascade can protect it from the stage's own case transform. */}
                <span className="lesson-equation__stage lesson-equation__stage--math">
                  <InlineMath latex={`${rule.target} =`} />
                </span>
                <span className="lesson-equation__body" style={{ color: colour }}>
                  <span className="lesson-equation__frac">
                    <span className="lesson-equation__part">
                      <SlotButton
                        label={
                          given
                            ? `Numerator for ${rule.target} was given, not answered`
                            : partName(`Numerator for ${rule.target}`, verdict)
                        }
                        chip={entry.top ? chipById.get(entry.top) : undefined}
                        live={
                          !done &&
                          !given &&
                          active.rule === rule.id &&
                          active.slot === "top"
                        }
                        settled={done}
                        given={given}
                        marked={fill.mark(given)}
                        onSelect={() => setActive({ rule: rule.id, slot: "top" })}
                      />
                    </span>
                    <span className="lesson-equation__bar" />
                    <span className="lesson-equation__part">
                      <SlotButton
                        label={
                          given
                            ? `Denominator for ${rule.target} was given, not answered`
                            : partName(`Denominator for ${rule.target}`, verdict)
                        }
                        chip={entry.bottom ? chipById.get(entry.bottom) : undefined}
                        live={
                          !done &&
                          !given &&
                          active.rule === rule.id &&
                          active.slot === "bottom"
                        }
                        settled={done}
                        given={given}
                        marked={fill.mark(given)}
                        onSelect={() => setActive({ rule: rule.id, slot: "bottom" })}
                      />
                    </span>
                  </span>
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
              {verdict === "wrong" && !done ? (
                <WidgetPartNote>{rule.note}</WidgetPartNote>
              ) : null}
              {done && verdict === "wrong" ? (
                <WidgetPartNote>{rule.why}</WidgetPartNote>
              ) : null}
            </div>
          );
        })}
      </div>

      {allSettled ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with two different rules
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          {board.chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-interactive__chip"
              aria-label={`Put ${chip.spoken} in the ${active.slot === "top" ? "numerator" : "denominator"}`}
              // One neutral token on every chip: a hue here would mark the answer.
              style={{ color: LABEL, borderColor: LINE }}
              onClick={() => place(chip.id)}
            >
              <InlineMath latex={chip.latex} />
            </button>
          ))}
        </div>
      )}

      {board.rules.map((rule) => (
        <WidgetReveal
          key={rule.id}
          available={outstanding === rule.id}
          revealed={revealedRule === rule.id}
          answer={
            <InlineMath
              latex={`${rule.target} = \\dfrac{${chipById.get(rule.top)?.latex ?? ""}}{${chipById.get(rule.bottom)?.latex ?? ""}}`}
            />
          }
          why={rule.why}
          onReveal={() => reveal(rule)}
          othersRemain={board.rules.some(
            (other) => other.id !== rule.id && !settled[other.id],
          )}
          label={`Reveal the rule for ${rule.target}`}
        />
      ))}

      <p
        className="lesson-interactive__status"
        data-state={allSettled ? "solved" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : allSettled ? (
          <>
            Both rules are re-pointed, and the outermost operation went first on each of
            them: the divisor on one, the multiplier outside the bracket on the other. Any
            row you missed carries its working underneath it.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            You are filling the {active.slot === "top" ? "numerator" : "denominator"} of the
            rule for <InlineMath latex={activeRule.target} color={SOFT} />. Each rule is
            checked on its own.
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * One slot of the fraction. It is a real button carrying visible text in every state, so an
 * unfilled slot reads as a slot rather than as a rule with a piece missing (R31).
 */
function SlotButton({
  label,
  chip,
  live,
  settled,
  given,
  marked,
  onSelect,
}: {
  label: string;
  chip: Chip | undefined;
  live: boolean;
  settled: boolean;
  /** True while this slot is showing an answer the reveal handed over. */
  given: boolean;
  marked: RevealFillProps;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={
        chip
          ? "lesson-equation__slot lesson-equation__slot--done"
          : "lesson-equation__slot lesson-equation__slot--locked"
      }
      aria-label={live ? `${label}, the slot being filled` : label}
      aria-pressed={live}
      disabled={settled}
      // Absolute rather than comparative: the slot NOT being filled is dimmed to a fixed
      // opacity, and the live one says so in its accessible name (R26). A slot holding a
      // handed-over piece is at full strength as well, being what the passage is about.
      style={{ opacity: settled || live || given ? 1 : 0.55 }}
      onClick={onSelect}
      {...marked}
    >
      {chip ? <InlineMath latex={chip.latex} /> : <span aria-hidden="true">?</span>}
    </button>
  );
}
