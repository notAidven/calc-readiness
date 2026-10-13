/**
 * RAD.4 interactive (slide 4): assemble a root holding both a number and a variable, one field
 * at a time.
 *
 * The number and the variable both have something to give up, so the learner fills three
 * slots in order and each locks only when it is right: the whole number that leaves the
 * root, the exponent on the variable that leaves with it, and the number that stays under
 * the root beside the single leftover variable. Each field has its OWN feedback line, so a
 * learner who nails the number but misses the power is told exactly that instead of being
 * marked wrong wholesale. Rounds are `sqrt(50t^7)` and `sqrt(75t^5)`; the paragraph above
 * works `sqrt(72x^5)`, so neither repeats it.
 *
 * Each slot scores on its own: every slot the learner lands fires the shared success signal
 * once. Each slot also has its OWN reveal, offered only on the slot the learner is stuck on
 * and only after a real attempt; a revealed slot fills in, unlocks the next one and counts
 * towards the gate, and its passage stays on screen while the later slots are filled.
 *
 * ## Which box is the box under the cursor
 *
 * The two templates hold three boxes between them, and the entry field used to carry a
 * FOURTH as a legend: the same glyph, standing beside the input to say what shape of thing
 * went in it. Four identical boxes and no binding between the input and any of them, with
 * the worst of the four being the one that could never be filled. So the legend is gone and
 * the live target is marked instead: the mark is on the board, where the learner is looking,
 * rather than restated beside the control.
 *
 * Four carriers, because they do four different jobs, and none of them is a hue. RAD.3's
 * builder next door spends colour on slot identity and the shared feedback layer spends
 * green, red and amber on correctness; a third meaning for the same palette makes all three
 * harder to read.
 *
 * - The entry row NAMES the slot, in the task line's own words, ending in the caption
 *   printed under the template that holds it. This is the only carrier that is a statement
 *   about one thing rather than a difference between two, so it is the one that reads at a
 *   glance and the one that survives a learner who is looking at the maths.
 * - The template that is NOT being filled is DIMMED. Removing the competition scales where
 *   emphasis does not, and it is what fixes the third slot: see `IDLE_OPACITY` below, where
 *   emphasis alone was not merely weak but pointing at the wrong box.
 * - The live template's outline is INK and heavier, where the idle one is the pale rule
 *   colour. Both neutrals, so this is contrast rather than palette.
 * - The live box itself is UNDERLINED. It is the only carrier at box granularity, and that
 *   is a job the other three cannot do: slots 1 and 2 are both inside the front template,
 *   so nothing template-level can tell them apart on the board.
 *
 * The field is plain text entry rather than `type="number"`. Every answer on both boards is
 * a single digit, so a spinner let a learner arrow to `5` without factoring anything, which
 * is the gate this slot exists to be.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Round {
  /** The whole constant under the root. */
  constant: number;
  /** The odd exponent on the variable. */
  power: number;
  /** The whole number that leaves the root (sqrt of the constant's square factor). */
  outNumber: number;
  /** The exponent on the variable that leaves the root. */
  outPower: number;
  /** The square-free number that stays under the root. */
  inNumber: number;
}

interface Board {
  symbol: string;
  rounds: readonly Round[];
}

/**
 * Two boards, each a variable and two mixed radicands, and neither works the paragraph's own
 * sqrt(72x^5). "Start over" hands out the board the learner has not just assembled.
 */
const POOLS: readonly Board[] = [
  {
    symbol: "t",
    rounds: [
      { constant: 50, power: 7, outNumber: 5, outPower: 3, inNumber: 2 },
      { constant: 75, power: 5, outNumber: 5, outPower: 2, inNumber: 3 },
    ],
  },
  {
    symbol: "s",
    rounds: [
      { constant: 98, power: 5, outNumber: 7, outPower: 2, inNumber: 2 },
      { constant: 45, power: 7, outNumber: 3, outPower: 3, inNumber: 5 },
    ],
  },
];

type Slot = "outNumber" | "outPower" | "inNumber";

const SLOT_ORDER: readonly Slot[] = ["outNumber", "outPower", "inNumber"];

/** Which of the two templates a slot belongs to. */
type Target = "front" | "under";

/**
 * The caption printed under each template, and the words the entry row borrows to say which
 * one it is filling. One source for both, so the row can never name a place the board does
 * not label: the caption under the live template IS a substring of the row's own line.
 */
const TARGET_CAPTION: Record<Target, string> = {
  front: "out in front",
  under: "left under the root",
};

/**
 * How the entry row names the slot it is about to fill, in the words the task line already
 * uses ("the whole number and the power that leave the root, and the number left under it")
 * and ending in the caption printed under the template that holds it.
 *
 * No variable letter appears here on purpose: `.lesson-interactive__step-label` uppercases
 * its text, and an uppercased `t` is the symbol `T`, which is not the one under the root.
 */
const SLOT_CAPTION: Record<Slot, string> = {
  outNumber: `the whole number ${TARGET_CAPTION.front}`,
  outPower: `the exponent ${TARGET_CAPTION.front}`,
  inNumber: `the number ${TARGET_CAPTION.under}`,
};

export function MixedRadicandSolver(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const board = POOLS[variant.index] ?? (POOLS[0] as Board);
  return (
    <MixedRadicandSolverBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function MixedRadicandSolverBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { symbol: SYMBOL, rounds } = board;
  const [index, setIndex] = useState(0);
  const [filled, setFilled] = useState(0);
  const [entry, setEntry] = useState("");
  const [tried, setTried] = useState(false);
  const [revealedSlots, setRevealedSlots] = useState<readonly Slot[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[index] ?? (rounds[0] as Round);
  const lastIndex = rounds.length - 1;
  const isLast = index === lastIndex;
  const slot = SLOT_ORDER[filled];
  const solved = filled >= SLOT_ORDER.length;
  /** The perfect square the constant reduces to, the part that leaves the root. */
  const square = round.outNumber * round.outNumber;
  /** The even part of the variable's exponent, the part that leaves the root. */
  const evenPart = round.outPower * 2;

  const ariaLabels: Record<Slot, string> = {
    outNumber: `Whole number that comes out of the square root of ${round.constant}`,
    outPower: `Exponent on ${SYMBOL} that comes out of the root`,
    inNumber: "Number that stays under the root",
  };

  /**
   * How the diagram's own description names the live slot. The underlined box is a visual
   * mark on a `role="img"` subtree, so this is the channel that carries it to anyone who
   * cannot see it.
   */
  const slotNames: Record<Slot, string> = {
    outNumber: "whole number in front of the root",
    outPower: `exponent on ${SYMBOL} in front of the root`,
    inNumber: "number left under the root",
  };

  function missNote(current: Slot, typed: number): string {
    if (current === "outNumber") {
      return typed * typed > round.constant
        ? `Squaring ${typed} gives more than ${round.constant}, so that perfect square is too large to divide it.`
        : `Keep taking perfect squares out of ${round.constant} until none are left, and multiply each one's root into the number in front.`;
    }
    if (current === "outPower") {
      return typed === round.power
        ? `That is the exponent that starts under the root. A square root pairs those copies up and sends one copy of each pair outside, so the exponent in front is smaller.`
        : `Split ${SYMBOL} to the ${round.power} into an even power times one leftover copy, then halve the even power.`;
    }
    return `Whatever the perfect square did not use is still under the root. Divide ${round.constant} by the perfect square you pulled out.`;
  }

  /** Lock the current slot and open the next. `earned` is false when it was revealed. */
  function advance(earned: boolean) {
    const next = filled + 1;
    setFilled(next);
    setEntry("");
    setTried(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= SLOT_ORDER.length && isLast && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (solved || !slot) {
      return;
    }
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("The box is empty. Enter a number before you set the slot.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to a note about perfect squares that would be answering a question the
    // learner did not ask. It still counts as an attempt, so the reveal comes on offer.
    if (!/^-?\d+$/.test(typed)) {
      setTried(true);
      setFeedback("Every slot here takes a whole number. Enter one and set the slot.");
      return;
    }
    if (Number(typed) === round[slot]) {
      advance(true);
      return;
    }
    setTried(true);
    setFeedback(missNote(slot, Number(typed)));
  }

  function revealSlot() {
    if (solved || !slot) {
      return;
    }
    setRevealedSlots([...revealedSlots, slot]);
    advance(false);
  }

  function nextRound() {
    if (index < lastIndex) {
      setIndex(index + 1);
      setFilled(0);
      setEntry("");
      setTried(false);
      setRevealedSlots([]);
      setFeedback(null);
    }
  }

  /** What a revealed slot fills in: the number the learner would have typed there. */
  function slotAnswerLatex(current: Slot): string {
    if (current === "outNumber") {
      return `${round.outNumber}`;
    }
    if (current === "outPower") {
      return `${round.outPower}`;
    }
    return `${round.inNumber}`;
  }

  /** The reasoning that produces that slot's value. */
  function slotWhy(current: Slot) {
    if (current === "outNumber") {
      return (
        <>
          Every perfect square inside {round.constant} multiplies up to {square}, because{" "}
          <InlineMath latex={`${round.constant} = ${square} \\cdot ${round.inNumber}`} />.
          The square root of {square} is {round.outNumber}, so {round.outNumber} is the
          whole number that leaves the root.
        </>
      );
    }
    if (current === "outPower") {
      return (
        <>
          <InlineMath latex={`${SYMBOL}^{${round.power}}`} /> splits into{" "}
          <InlineMath latex={`${SYMBOL}^{${evenPart}} \\cdot ${SYMBOL}`} />, and a square
          root pairs those {evenPart} copies up and sends one copy of each pair outside.
          Half of {evenPart} is {round.outPower}, so{" "}
          <InlineMath latex={`${SYMBOL}^{${round.outPower}}`} /> comes out in front and one{" "}
          <InlineMath latex={SYMBOL} /> stays behind.
        </>
      );
    }
    return (
      <>
        <InlineMath latex={`${round.constant} = ${square} \\cdot ${round.inNumber}`} />, so
        the perfect square {square} is the part that came out and {round.inNumber} is the
        part left behind. It has no perfect square factor of its own, so it cannot come out
        of the root, and it sits there beside the single leftover{" "}
        <InlineMath latex={SYMBOL} />.
      </>
    );
  }

  /**
   * One empty box, underlined when it is the one the entry field is about to fill.
   *
   * The rule is the mark: no hue, so it cannot be confused with the green a finished
   * template turns or with the correctness colours the shared layer owns, and a palette
   * edit cannot take it away. It is a couple of pixels of rule at this size, which is why
   * it is no longer the whole signal, but it is the only one that resolves to a single BOX
   * rather than to a template, and slots 1 and 2 share a template.
   */
  const box = (live: boolean) => (live ? "\\underline{\\square}" : "\\square");
  const outNumberTex = filled > 0 ? `${round.outNumber}` : box(slot === "outNumber");
  const outPowerTex =
    filled > 1
      ? `${SYMBOL}^{${round.outPower}}`
      : `${SYMBOL}^{${box(slot === "outPower")}}`;
  // `{}` terminates the control word: the unfilled slot is composed straight against the
  // variable, and `\square` + `t` would otherwise concatenate into the undefined command
  // `\squaret`, which KaTeX renders as red error text inside the diagram.
  const inNumberTex = filled > 2 ? `${round.inNumber}` : `${box(slot === "inNumber")}{}`;
  /** Which template the live slot sits in, and so which one carries the mark. */
  const frontLive = slot === "outNumber" || slot === "outPower";
  const underLive = slot === "inNumber";
  /** The outline weights, so the live/idle pair is one decision rather than two literals. */
  const LIVE_STROKE = 2.75;
  const IDLE_STROKE = 1.5;
  /**
   * How far back the template that is NOT being filled is pushed.
   *
   * This is the carrier that does the work, and it is a statement about the OTHER template
   * rather than about the live one, which is why it was needed. Weight alone was comparative
   * — the learner had to notice that one of two adjacent rectangles was 1.25px fatter — and
   * on the third slot it was worse than comparative, it was INVERTED: the finished front
   * template is stroked in `CIVIC` at `oklch(0.42 ...)` while the live one is stroked in
   * `LINE` at `oklch(0.78 ...)`, so the idle box was the high-contrast one on the board and
   * the extra 1.25px on the live one could not begin to answer that.
   *
   * A finished board dims neither: nothing is live there, and fading the assembled answer
   * would take the reward away at the one moment the board has something to show.
   */
  const IDLE_OPACITY = 0.42;
  const opacityFor = (live: boolean) => (solved || live ? 1 : IDLE_OPACITY);
  /**
   * The live template's outline is drawn in ink rather than the pale rule colour, which is
   * the difference between "slightly fatter than its neighbour" and "the crisp box on the
   * board". Both are neutrals off the same ramp, so this stays outside the palette that
   * `CIVIC`, `BRICK` and `SIGNAL_DEEP` spend on correctness.
   */
  const strokeFor = (live: boolean, filledThrough: boolean, done: string) =>
    filledThrough ? done : live ? LABEL : LINE;

  return (
    <div className="lesson-interactive lesson-interactive--solver">
      <WidgetTask>
        Write this root in simplified form: the whole number and the power that leave the
        root, and the number left under it beside the single leftover variable.
      </WidgetTask>

      <svg
        viewBox="0 0 440 176"
        role="img"
        aria-label={`The square root of ${round.constant} times ${SYMBOL} to the ${round.power}, splitting into a part in front of the root and a part left under it${
          slot ? `. The slot being filled now is the ${slotNames[slot]}` : ""
        }`}
      >
        <title>Assemble a simplified mixed radical</title>

        <text x={220} y={18} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${index + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`\\sqrt{${round.constant}${SYMBOL}^{${round.power}}}`}
          x={220}
          y={50}
          fontSize={24}
          color={LABEL}
        />

        <path d="M 220 68 L 220 84" fill="none" stroke={LINE} strokeWidth={1.5} />

        {/* Each template is one group, so the mark on the live one is a property of the
            template rather than of whichever shape happens to be drawn last. */}
        <g data-target="front" opacity={opacityFor(frontLive)}>
          <rect
            x={44}
            y={92}
            width={166}
            height={44}
            rx={9}
            fill={CIVIC}
            fillOpacity={filled > 1 ? 0.16 : 0.05}
            stroke={strokeFor(frontLive, filled > 1, CIVIC)}
            strokeWidth={frontLive ? LIVE_STROKE : IDLE_STROKE}
          />
          <SvgMath
            latex={`${outNumberTex}\\,${outPowerTex}`}
            x={127}
            y={114}
            fontSize={20}
            color={LABEL}
            w={166}
          />
          <text x={127} y={154} textAnchor="middle" fontSize={11} fill={SOFT}>
            {TARGET_CAPTION.front}
          </text>
        </g>

        <g data-target="under" opacity={opacityFor(underLive)}>
          <rect
            x={230}
            y={92}
            width={166}
            height={44}
            rx={9}
            fill={SIGNAL}
            fillOpacity={filled > 2 ? 0.16 : 0.05}
            stroke={strokeFor(underLive, filled > 2, SIGNAL)}
            strokeWidth={underLive ? LIVE_STROKE : IDLE_STROKE}
          />
          <SvgMath
            latex={`\\sqrt{${inNumberTex}${SYMBOL}}`}
            x={313}
            y={114}
            fontSize={20}
            color={LABEL}
            w={166}
          />
          <text x={313} y={154} textAnchor="middle" fontSize={11} fill={SOFT}>
            {TARGET_CAPTION.under}
          </text>
        </g>
      </svg>

      {solved ? (
        isLast ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different variable
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new root
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          {/* The row SAYS which slot it fills. No glyph: the thing that used to stand here
              was a fourth `\square`, a legend for a slot rather than a slot, and replacing
              one ambiguous box with another would not have been the fix. Words instead,
              ending in the caption printed under the live template, so the row points at
              something the learner can already read on the board.

              This is the one carrier that is not comparative. An underline and a stroke
              weight both ask the learner to notice a DIFFERENCE between two boxes; a line
              of words is a statement about one, it survives any font size, it is not a hue,
              and it puts on screen what the field's accessible name already said. */}
          {slot ? (
            <span className="lesson-interactive__step-label">
              {`now filling: ${SLOT_CAPTION[slot]}`}
            </span>
          ) : null}
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={entry}
              aria-label={slot ? ariaLabels[slot] : "Answer"}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. One box serves all three slots in turn and `slot` is which one
              // it is filling, so `round[slot]` is the value `check` grades this press
              // against and the reveal on offer is the one at `filled === position`.
              {...(slot ? fill.entry(round[slot]) : {})}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Set it
          </button>
        </div>
      )}

      {SLOT_ORDER.map((current, position) => (
        <WidgetReveal
          key={current}
          available={!solved && tried && filled === position}
          revealed={revealedSlots.includes(current)}
          answer={<InlineMath latex={slotAnswerLatex(current)} />}
          why={slotWhy(current)}
          onReveal={revealSlot}
          label="Reveal this slot"
          // The slots are set in a fixed order, so what is left after the open one is every
          // slot past it, plus the rounds after this one. False only on the last slot of the
          // last round, which is the gate.
          othersRemain={filled + 1 < SLOT_ORDER.length || !isLast}
        />
      ))}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealedSlots.includes("inNumber") ? null : solved ? (
          <>
            <InlineMath
              latex={`\\sqrt{${round.constant}${SYMBOL}^{${round.power}}} = ${round.outNumber}${SYMBOL}^{${round.outPower}}\\sqrt{${round.inNumber}${SYMBOL}}`}
            />
            . The number and the variable each gave up what they could, and what was left
            over stayed under the root.
          </>
        ) : feedback ? (
          feedback
        ) : slot === "outNumber" ? (
          <>
            Start with the number: what whole number comes out of{" "}
            <InlineMath latex={`\\sqrt{${round.constant}}`} />?
          </>
        ) : slot === "outPower" ? (
          <>
            Now the variable: what exponent on <InlineMath latex={SYMBOL} /> comes out of{" "}
            <InlineMath latex={`\\sqrt{${SYMBOL}^{${round.power}}}`} />?
          </>
        ) : (
          <>
            One slot left: which number is still stuck under the root, beside the single
            leftover <InlineMath latex={SYMBOL} />?
          </>
        )}
      </p>
    </div>
  );
}
