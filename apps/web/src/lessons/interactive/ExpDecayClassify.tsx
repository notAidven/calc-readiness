/**
 * EL.1 interactive (slide 2): what the SIZE of the base does, called row by row.
 *
 * Three calls rather than two, because the slide's claim has three cases and a two-way board
 * would have to drop one of them: a base above $1$ climbs, a base between $0$ and $1$ falls,
 * and a base of exactly $1$ multiplies by nothing and never moves. The third is the dividing
 * line the other two are defined against, so a board that never offered it would be teaching
 * the rule with its hinge removed. This is why the widget is not built on
 * `kinds/BinaryRowSort`, which is for a board where the SAME TWO calls sit under every row.
 *
 * A wrong call LOCKS the row, and the gate opens only on a clean board, which is what makes a
 * three-option question a question rather than an activity with retries. The row keeps all
 * three options after it settles, disabled and marked, because the teaching here is the
 * comparison: "this one falls" instructs only while it stands beside the call the learner
 * actually made. The palette follows the shared rule, so the learner's own pick is a verdict
 * in `CIVIC` or `BRICK` and the call that was right on a row they MISSED is `SIGNAL_DEEP` and
 * dashed, since crediting them with a pick they never made is what green would do there.
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
const CALLS = ["Grows", "Decays", "Stays flat"] as const;

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

interface Rule {
  id: string;
  /** The rule being classified, as LaTeX. */
  latex: string;
  spoken: string;
  /** Which of `CALLS` is the right one. */
  right: 0 | 1 | 2;
  /** The base, written out, for the note and the reveal. */
  base: string;
  /** ONE sentence: why the call the learner made was not the right one. */
  note: string;
  /** The fuller reasoning, printed by the board's reveal when this row was missed. */
  why: ReactNode;
}

/**
 * Two boards. Neither reuses the slide's $800$ milligram half-life or the CFU's readings, and
 * each one offers all three calls, so no board can be read off by elimination.
 */
const BOARDS: readonly (readonly Rule[])[] = [
  [
    {
      id: "b0-r1",
      latex: "7 \\cdot 3^{x}",
      spoken: "7 times 3 to the x",
      right: 0,
      base: "3",
      note: "The base is 3, which is more than 1, so every step multiplies the amount up rather than down.",
      why: (
        <>
          The base here is <InlineMath latex="3" />, and multiplying by anything above{" "}
          <InlineMath latex="1" /> returns more than it was handed. From{" "}
          <InlineMath latex="7" /> the steps run <InlineMath latex="21" /> and{" "}
          <InlineMath latex="63" />, so this one grows.
        </>
      ),
    },
    {
      id: "b0-r2",
      latex: "9\\left(\\tfrac{1}{5}\\right)^{x}",
      spoken: "9 times one fifth to the x",
      right: 1,
      base: "\\tfrac{1}{5}",
      note: "The base is one fifth, which lies between 0 and 1, so each step keeps only part of what it was given.",
      why: (
        <>
          A base of <InlineMath latex="\tfrac{1}{5}" /> keeps a fifth of the amount and
          discards the rest, so from <InlineMath latex="9" /> the steps run{" "}
          <InlineMath latex="1.8" /> and <InlineMath latex="0.36" />. Nothing about the form{" "}
          <InlineMath latex="ab^{x}" /> changed, only the size of <InlineMath latex="b" />,
          and that alone turned the climb into a fall.
        </>
      ),
    },
    {
      id: "b0-r3",
      latex: "12 \\cdot 1^{x}",
      spoken: "12 times 1 to the x",
      right: 2,
      base: "1",
      note: "The base is exactly 1, and multiplying by 1 changes nothing at all, however many steps are taken.",
      why: (
        <>
          <InlineMath latex="1^{x}" /> is <InlineMath latex="1" /> for every{" "}
          <InlineMath latex="x" />, so the amount is <InlineMath latex="12" /> at every step
          and the graph is a flat line. This is the dividing case: above{" "}
          <InlineMath latex="1" /> is growth, below it is decay, and{" "}
          <InlineMath latex="1" /> itself is neither.
        </>
      ),
    },
    {
      id: "b0-r4",
      latex: "4(0.8)^{x}",
      spoken: "4 times 0.8 to the x",
      right: 1,
      base: "0.8",
      note: "The base is 0.8, which is under 1 even though it looks close to it, so the amount shrinks every step.",
      why: (
        <>
          <InlineMath latex="0.8" /> is less than <InlineMath latex="1" />, so each step
          keeps four fifths of the amount: <InlineMath latex="4 \to 3.2 \to 2.56" />. A
          decimal base does not read as obviously small as a fraction does, and the only
          test that matters is whether it sits below <InlineMath latex="1" />.
        </>
      ),
    },
  ],
  [
    {
      id: "b1-r1",
      latex: "6(0.6)^{x}",
      spoken: "6 times 0.6 to the x",
      right: 1,
      base: "0.6",
      note: "The base is 0.6, which is below 1, so each step hands back less than it was given.",
      why: (
        <>
          Each step keeps <InlineMath latex="0.6" /> of the amount, so from{" "}
          <InlineMath latex="6" /> it runs <InlineMath latex="3.6" /> and then{" "}
          <InlineMath latex="2.16" />. A base under <InlineMath latex="1" /> is decay
          however it is written.
        </>
      ),
    },
    {
      id: "b1-r2",
      latex: "2 \\cdot 5^{x}",
      spoken: "2 times 5 to the x",
      right: 0,
      base: "5",
      note: "The base is 5, well above 1, so the amount is multiplied up at every step.",
      why: (
        <>
          From <InlineMath latex="2" /> the steps run <InlineMath latex="10" /> and{" "}
          <InlineMath latex="50" />, because the base <InlineMath latex="5" /> is above{" "}
          <InlineMath latex="1" />. The small starting amount does not slow it down: the
          base decides the direction, the starting amount only decides where it begins.
        </>
      ),
    },
    {
      id: "b1-r3",
      latex: "30 \\cdot 1^{x}",
      spoken: "30 times 1 to the x",
      right: 2,
      base: "1",
      note: "The base is exactly 1, so no step multiplies the amount by anything and it never moves.",
      why: (
        <>
          Every power of <InlineMath latex="1" /> is <InlineMath latex="1" />, so this rule
          hands back <InlineMath latex="30" /> at every step. A base of{" "}
          <InlineMath latex="1" /> is the line growth and decay are separated by, and it
          belongs to neither of them.
        </>
      ),
    },
    {
      id: "b1-r4",
      latex: "8\\left(\\tfrac{3}{2}\\right)^{x}",
      spoken: "8 times three halves to the x",
      right: 0,
      base: "\\tfrac{3}{2}",
      note: "The base is three halves, which is more than 1, so the amount climbs even though the base is a fraction.",
      why: (
        <>
          <InlineMath latex="\tfrac{3}{2}" /> is <InlineMath latex="1.5" />, which is above{" "}
          <InlineMath latex="1" />, so from <InlineMath latex="8" /> the steps run{" "}
          <InlineMath latex="12" /> and <InlineMath latex="18" />. A fractional base is not
          the test; being under <InlineMath latex="1" /> is.
        </>
      ),
    },
  ],
];

export function ExpDecayClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rules = BOARDS[variant.index] ?? (BOARDS[0] as readonly Rule[]);
  return (
    <ExpDecayClassifyBody
      key={variant.nonce}
      rules={rules}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ExpDecayClassifyBody({
  rules,
  onSolved,
  onRestart,
}: {
  rules: readonly Rule[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Row id -> the call the learner made, as an index into `CALLS`. */
  const [calls, setCalls] = useState<Record<string, number>>({});
  /**
   * The same map, readable synchronously. Two rows called inside one task are batched into a
   * single render, so `calls` is one commit stale in the second handler and a `{ ...calls }`
   * there would overwrite the first row's verdict instead of adding to it. The body is keyed
   * on the variant nonce, so this resets with the rest of the state on a redraw.
   */
  const answered = useRef<Record<string, number>>({});
  const [walked, setWalked] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const complete = Object.keys(calls).length === rules.length;
  const missedRows = rules.filter(
    (rule) => calls[rule.id] !== undefined && calls[rule.id] !== rule.right,
  );
  const missed = missedRows.length > 0;
  const solved = complete && !missed;

  function answer(rule: Rule, took: number) {
    if (answered.current[rule.id] !== undefined) {
      return;
    }
    const next = { ...answered.current, [rule.id]: took };
    answered.current = next;
    setCalls(next);
    if (took !== rule.right) {
      return;
    }
    success();
    const clean = rules.every((r) => next[r.id] === r.right);
    if (clean && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** Every option renders in the SAME neutral token until its row settles. */
  const neutral = { color: LABEL, borderColor: LINE };

  /** The call that was right on each missed row, named beside the rule it belongs to. */
  const missedCalls = (
    <>
      {missedRows.map((rule, at) => (
        <Fragment key={rule.id}>
          {at === 0 ? null : at === missedRows.length - 1 ? " and " : ", "}
          <InlineMath latex={rule.latex} />
          {`: ${CALLS[rule.right]}`}
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: call each rule by what its amount does over the steps, until every rule on the
        board has been sorted by the size of its base alone.
      </WidgetTask>

      {/* The board, and the grid every row borrows its columns from: the rule, then the three
          calls. Without it each row sized its own tracks and the alignment had to be hardcoded,
          which is what clipped the labels. */}
      <div className="lesson-classify">
        {rules.map((rule) => {
          const call = calls[rule.id];
          const locked = call !== undefined;
          const markOf = (at: number): MarkName | null => {
            if (!locked) {
              return null;
            }
            const right = at === rule.right;
            if (at === call) {
              return right ? "chosenRight" : "chosenWrong";
            }
            return right && call !== rule.right ? "standing" : null;
          };
          return (
            <div
              key={rule.id}
              className="lesson-classify__item"
              data-settled={locked ? "true" : undefined}
            >
              <div className="lesson-classify__row">
                {/* Ink in every state: the verdict is on the options, and tinting the rule by
                  the learner's correctness would make a perfectly good rule look wrong. */}
                <span className="lesson-interactive__step-eq">
                  <InlineMath latex={rule.latex} color={LABEL} />
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
                          ? `${rule.spoken}: ${label}`
                          : `${rule.spoken}: ${label}, ${mark.spoken}`
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
                      onClick={() => answer(rule, at)}
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

              {/* The whole of what a missed row says, under the row it is about rather than in
                the shared status line the next row's tap would overwrite. */}
              {locked && call !== rule.right ? (
                <p className="lesson-classify__note" data-state="wrong" role="status">
                  {rule.note}
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
            why={missedRows.map((rule) => <Fragment key={rule.id}>{rule.why} </Fragment>)}
            onReveal={() => setWalked(true)}
            label="Show the working"
            // Read off the board rather than passed as a constant. Every row has been called
            // by the time this control exists, so there is nothing to hand back.
            othersRemain={rules.some((rule) => calls[rule.id] === undefined)}
          />
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {missed
              ? "Try a fresh set of rules"
              : "Start over with a different set of rules"}
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
            Every call landed. The base above <InlineMath latex="1" /> climbs, the base
            between <InlineMath latex="0" /> and <InlineMath latex="1" /> falls, and a base
            of <InlineMath latex="1" /> multiplies by nothing and holds still.
          </>
        ) : complete && missed ? (
          "The board is finished with a call that did not hold. The reasoning is below, and a fresh set follows it."
        ) : (
          "Compare each rule's base against 1, and call the rule by what that comparison forces."
        )}
      </p>
    </div>
  );
}
