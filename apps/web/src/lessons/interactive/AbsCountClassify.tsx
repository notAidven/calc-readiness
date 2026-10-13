/**
 * LIN.5 slide 3: how many solutions, read off the right-hand side before any algebra.
 *
 * The slide's claim is that both broken cases are visible before any work is done, straight off the
 * number on the right. A learner told that has still never used it, so this board hands over four
 * rules and asks for the count on each, with no solving. Making the call four times is what turns
 * "two answers is a consequence, not a property" into something usable.
 *
 * Each board carries all three counts, so a learner cannot settle a row by elimination. One rule
 * per board has its bars ISOLATED first, because a negative number on the right of an un-isolated
 * rule is not yet a negative distance, and reading the sign off too early is the one way this
 * shortcut is misapplied.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

type Count = "two" | "one" | "none";

/**
 * The three calls, as numerals and in increasing order.
 *
 * Written "Two", "One", "None" the row was a scale running backwards and the words hid it: three
 * counts spelled out do not announce themselves as a sequence, so the row read as three unordered
 * options. As `0, 1, 2` the ordering is visible, and it has to be the right way round.
 *
 * `id` stays the internal key. `rule.count` is compared against it throughout, so the grading is
 * not a function of the label at all. `spoken` stays too: it is what each option's `aria-label`
 * says, so a screen reader keeps hearing "two solutions" rather than the digit, and it is the
 * reason a bare numeral is enough on screen.
 */
const COUNTS: readonly { id: Count; label: string; spoken: string }[] = [
  { id: "none", label: "0", spoken: "no solutions" },
  { id: "one", label: "1", spoken: "one solution" },
  { id: "two", label: "2", spoken: "two solutions" },
];

interface Rule {
  id: string;
  latex: string;
  spoken: string;
  count: Count;
  why: ReactNode;
}

const BOARDS: readonly (readonly Rule[])[] = [
  [
    {
      id: "a-two",
      latex: "\\lvert x - 7 \\rvert = 3",
      spoken: "the absolute value of x minus 7 equals 3",
      count: "two",
      why: (
        <>
          The right-hand side is a positive distance, so the quantity inside can sit that
          far from zero on either side. Two branches, two solutions.
        </>
      ),
    },
    {
      id: "a-none",
      latex: "\\lvert x + 5 \\rvert = -8",
      spoken: "the absolute value of x plus 5 equals negative 8",
      count: "none",
      why: (
        <>
          A distance is never negative, so nothing at all can be <InlineMath latex="-8" />{" "}
          away from zero. There is no branch to write and the solution set is empty.
        </>
      ),
    },
    {
      id: "a-one",
      latex: "\\lvert 4x - 6 \\rvert = 0",
      spoken: "the absolute value of 4 x minus 6 equals 0",
      count: "one",
      why: (
        <>
          Only zero sits zero away from zero, and <InlineMath latex="-0" /> is the same
          number as <InlineMath latex="0" />, so the two branches say exactly the same
          thing. One equation, one solution.
        </>
      ),
    },
    {
      id: "a-isolate",
      latex: "\\lvert x - 2 \\rvert + 9 = 4",
      spoken: "the absolute value of x minus 2, plus 9, equals 4",
      count: "none",
      why: (
        <>
          The bars are not on their own yet, so the <InlineMath latex="4" /> is not the
          distance. Taking <InlineMath latex="9" /> off both sides gives{" "}
          <InlineMath latex="\lvert x - 2 \rvert = -5" />, and only then is the right-hand
          side a distance, and a negative one. The count has to wait for the bars to be
          isolated.
        </>
      ),
    },
  ],
  [
    {
      id: "b-one",
      latex: "\\lvert 2x + 5 \\rvert = 0",
      spoken: "the absolute value of 2 x plus 5 equals 0",
      count: "one",
      why: (
        <>
          Zero has only one number at distance zero from it, so both branches collapse onto{" "}
          <InlineMath latex="2x + 5 = 0" />. One solution, and it need not be a whole
          number.
        </>
      ),
    },
    {
      id: "b-two",
      latex: "\\lvert 5 - x \\rvert = 11",
      spoken: "the absolute value of 5 minus x equals 11",
      count: "two",
      why: (
        <>
          A positive distance on the right, so two branches. The quantity inside the bars is
          written the other way round here, which changes the arithmetic in each branch and
          not the count.
        </>
      ),
    },
    {
      id: "b-isolate",
      latex: "3\\lvert x + 1 \\rvert = 12",
      spoken: "3 times the absolute value of x plus 1 equals 12",
      count: "two",
      why: (
        <>
          Dividing both sides by <InlineMath latex="3" /> isolates the bars and leaves{" "}
          <InlineMath latex="\lvert x + 1 \rvert = 4" />, a positive distance, so there are
          two branches. The multiplier outside the bars has to go before the right-hand side
          can be read as a distance at all.
        </>
      ),
    },
    {
      id: "b-none",
      latex: "\\lvert 6x - 1 \\rvert = -2",
      spoken: "the absolute value of 6 x minus 1 equals negative 2",
      count: "none",
      why: (
        <>
          The bars are already alone and the number beside them is negative, so nothing can
          satisfy it. No amount of algebra recovers a solution from this, which is why the
          sign is worth reading first.
        </>
      ),
    },
  ],
];

export function AbsCountClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rules = BOARDS[variant.index] ?? (BOARDS[0] as readonly Rule[]);
  return (
    <AbsCountClassifyBody
      key={variant.nonce}
      rules={rules}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AbsCountClassifyBody({
  rules,
  onSolved,
  onRestart,
}: {
  rules: readonly Rule[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [calls, setCalls] = useState<Record<string, Count>>({});
  /**
   * The rows a REVEAL settled, kept apart from the rows the learner called.
   *
   * One record for two different facts. Writing the true count into `calls` settled the row
   * and closed the board, and it also said the learner had made that call: the chip came back
   * `chosenRight`, ticked, and announced as "your answer, correct", and the board's miss count
   * — which only counts calls that DISAGREE with the truth — went on reading the run as clean.
   * A row nobody answered belongs in neither of those, so it is recorded here instead, and the
   * mark it gets is `standing`, the one the family already keeps for the call that was right on
   * a row the learner did not make: a statement about the board rather than a verdict on
   * anybody. `revealCredit.browser.test.tsx` plays it.
   */
  const [given, setGiven] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const open = rules.filter((rule) => calls[rule.id] === undefined && !given.has(rule.id));
  const complete = open.length === 0;
  const missed = rules.some(
    (rule) =>
      given.has(rule.id) || (calls[rule.id] !== undefined && calls[rule.id] !== rule.count),
  );
  /** The row a reveal would be about: the first one still outstanding. */
  const target = open[0] ?? null;

  function settle(nextCalls: Record<string, Count>, nextGiven: ReadonlySet<string>) {
    setCalls(nextCalls);
    setGiven(nextGiven);
    // The gate turns on every row being ANSWERED FOR, not on every row being right first time
    // (R29). A row the learner was handed counts towards finishing the board and towards
    // nothing else: it is not their call, and `missed` above says so.
    if (
      rules.every((rule) => nextCalls[rule.id] !== undefined || nextGiven.has(rule.id)) &&
      !gateOpen
    ) {
      setGateOpen(true);
      onSolved();
    }
  }

  function call(rule: Rule, count: Count) {
    if (calls[rule.id] !== undefined || given.has(rule.id)) {
      return;
    }
    if (count === rule.count) {
      success();
    }
    settle({ ...calls, [rule.id]: count }, given);
  }

  function reveal() {
    if (!target) {
      return;
    }
    setRevealedId(target.id);
    settle(calls, new Set(given).add(target.id));
  }

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: say how many solutions each of these four rules has, reading the right-hand
        side rather than solving any of them.
      </WidgetTask>

      {/* ONE grid for the board, with every row borrowing its columns. Hand-rolled on
          `.lesson-interactive__rows` each row was its own flex line, so the three calls started
          wherever that row's rule happened to end: measured at the 920px desktop lesson column,
          the first call sat anywhere across 28.9px depending on the width of the rule beside it,
          and the four rows never formed columns at all. Nothing here sets a width, which is the
          point: the widest rule on the board sizes track one for every row at once. */}
      <div className="lesson-classify lesson-classify--even-calls">
        {rules.map((rule) => {
          const called = calls[rule.id];
          // Settled either way; RIGHT only where the learner is the one who called it. A
          // revealed row is settled with no call on it, which leaves every chip unchosen and
          // puts the `standing` mark on the count that was right here.
          const settled = called !== undefined || given.has(rule.id);
          const right = called !== undefined && called === rule.count;
          return (
            <div
              key={rule.id}
              className="lesson-classify__item"
              data-settled={settled ? "true" : undefined}
            >
              <div className="lesson-classify__row">
                {/* The rule itself stays INK in every state: tinting the subject of the question by
                    the learner's correctness puts a third meaning on the same palette (R26). */}
                <span className="lesson-interactive__step-eq">
                  <InlineMath latex={rule.latex} color={LABEL} />
                </span>
                {COUNTS.map((option) => {
                  const chosen = called === option.id;
                  const standing = settled && !right && option.id === rule.count;
                  const colour = chosen
                    ? right
                      ? CIVIC
                      : BRICK
                    : standing
                      ? SIGNAL_DEEP
                      : LABEL;
                  const glyph = chosen
                    ? right
                      ? "\u2713"
                      : "\u2717"
                    : standing
                      ? "\u2713"
                      : "";
                  const spoken = chosen
                    ? right
                      ? `${option.spoken}, your answer, correct`
                      : `${option.spoken}, your answer, wrong`
                    : standing
                      ? `${option.spoken}, the right call here, which you did not pick`
                      : option.spoken;
                  /* Names the same three marks the rest of the classify family names, because
                     the shared layer keys off the attribute and not off the glyph: every settled
                     chip is disabled and dimmed to 40%, and `[data-mark]:disabled` is the opt-out
                     that keeps the ones still saying something legible. Missing it drew the
                     standing tick on a missed row — the whole of that row's teaching — at 40%. */
                  const markName = chosen
                    ? right
                      ? "chosenRight"
                      : "chosenWrong"
                    : standing
                      ? "standing"
                      : undefined;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className="lesson-interactive__chip"
                      data-mark={markName}
                      aria-label={`${rule.spoken}: ${spoken}`}
                      aria-pressed={chosen}
                      disabled={settled}
                      style={{
                        color: colour,
                        borderColor: settled ? colour : LINE,
                        borderStyle: standing ? "dashed" : "solid",
                        background:
                          chosen && right
                            ? `color-mix(in srgb, ${CIVIC} 15%, var(--paper))`
                            : undefined,
                      }}
                      onClick={() => call(rule, option.id)}
                    >
                      {option.label}
                      {/* Classed rather than bare, because the fit guard measures a chip's
                          LABEL against its box and finds it by stripping
                          `.lesson-classify__mark`. An unclassed glyph is read as part of the
                          label, so the width it checks is one nobody wrote. */}
                      {/* Always present, and EMPTY until this option is marked, so the board's
                          shared columns include the tick's slot from first paint. Inserted only
                          on press, a one-character label and its tick sit on one flex line and
                          the column grew every chip on the board at once.

                          The slot is held open by `.lesson-classify__mark:empty::after` rather
                          than by a hidden tick character, because a mark's TEXT is how the mark
                          guards read what an option is saying: a placeholder glyph tells
                          `chipPressedState` that every settled option carries the answer, and it
                          then reports the three-quarters of them the disabled rule correctly
                          dims. Pseudo-element content is not in `textContent`, so the slot
                          measures without speaking. */}
                      <span aria-hidden="true" className="lesson-classify__mark">
                        {glyph}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Valence off the class rather than an inline colour: the red is the same either
                  way, but the class carries the weight with it, so the sentence still separates
                  from the prose for a learner who cannot tell the two hues apart. */}
              {settled && !right ? (
                <p className="lesson-classify__note" data-state="wrong">
                  {rule.why}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {complete ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {missed ? "Try a fresh set" : "New set of four rules"}
        </button>
      ) : null}

      {/* `answer` hands up the SPOKEN count, not the chip's label: what the host prints is a
          sentence, and the label is a numeral on a button. "0 for |x + 5| = -8" states a count
          of zero without naming what there is none of. The comment sits out here because
          `revealReAsk.test.ts` reads the `answer` expression's own source and fails on the word
          it needs to use to say this. */}
      <WidgetReveal
        available={Object.keys(calls).length > 0 && target !== null}
        revealed={revealedId !== null}
        answer={
          target ? (
            <>
              {COUNTS.find((option) => option.id === target.count)?.spoken ?? ""} for{" "}
              <InlineMath latex={target.latex} />
            </>
          ) : null
        }
        why={target ? target.why : null}
        onReveal={reveal}
        othersRemain={open.length > 1}
      />

      <p
        className="lesson-interactive__status"
        data-state={complete && !missed ? "solved" : "prompt"}
        aria-live="polite"
      >
        {revealedId !== null ? null : complete ? (
          missed ? (
            <>
              That is all four called, so you are good to carry on. Every row you missed
              says why just underneath it.
            </>
          ) : (
            <>
              All four, without solving one of them. A positive number beside isolated bars
              gives two, a zero gives one, and a negative gives none, and the word isolated
              is doing real work in that sentence.
            </>
          )
        ) : (
          <span style={{ color: SOFT }}>
            Get the bars on their own first, then read the number left beside them.
          </span>
        )}
      </p>
    </div>
  );
}
