/**
 * POL.2 slide 2: step through the factor pairs of the constant until the sum lands on target.
 *
 * The two conditions on a trinomial's pair are stated in one breath and used one at a time, and
 * the learner who has just met them cannot yet feel that the first one narrows the search to a
 * short list. So the control walks the list itself: every position is a pair that already
 * multiplies to the constant, and the only thing changing is the sum. Turning the search into a
 * dial makes the second condition the thing being hunted, which is what it actually is.
 *
 * A tuned control needs a target the learner can read against, so the sum is printed beside the
 * middle coefficient at every step, and the gate turns on committing rather than on passing
 * over the right pair on the way somewhere else.
 */

import { useId, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The trinomial is $x^{2} + bx + c$ with $c$ positive and both factors positive. */
  p: number;
  q: number;
}

/** Neither trinomial is the slide's own $x^{2} + 11x + 24$. */
const BOARDS: readonly Board[] = [
  { p: 4, q: 9 },
  { p: 3, q: 12 },
];

/** Every ordered pair of positive whole numbers multiplying to `c`, smallest first. */
function factorPairs(c: number): readonly (readonly [number, number])[] {
  const pairs: [number, number][] = [];
  for (let low = 1; low * low <= c; low += 1) {
    if (c % low === 0) {
      pairs.push([low, c / low]);
    }
  }
  return pairs;
}

export function FactorPairStepper(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <FactorPairStepperBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function FactorPairStepperBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const constant = board.p * board.q;
  const middle = board.p + board.q;
  const pairs = factorPairs(constant);
  const target = pairs.findIndex(([low, high]) => low + high === middle);
  const sliderId = useId();

  const [index, setIndex] = useState(0);
  const [committed, setCommitted] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const shownIndex = fill.given ? target : index;
  const pair = pairs[shownIndex] ?? (pairs[0] as readonly [number, number]);
  const [low, high] = pair;
  const sum = low + high;
  const settled = committed !== null;
  const right = committed === target;

  function open() {
    if (!gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function check() {
    if (settled) {
      return;
    }
    setTried(true);
    if (index === target) {
      setCommitted(index);
      success();
      open();
      return;
    }
    setCommitted(index);
  }

  function reveal() {
    setRevealed(true);
    setIndex(target);
    setCommitted(target);
    open();
  }

  const [tp, tq] = pairs[target] ?? ([board.p, board.q] as const);

  return (
    <div className="lesson-interactive lesson-interactive--stepper">
      <WidgetTask>
        Goal: find the one pair of whole numbers that satisfies both conditions at once,
        rather than the many that satisfy the first.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={`x^{2} + ${middle}x + ${constant}`} color={LABEL} />
      </p>

      <p className="lesson-equation__naming">
        <InlineMath
          latex={`${low} \\times ${high} = ${constant}`}
          color={settled && right ? CIVIC : LABEL}
        />{" "}
        {/* The product and the sum are two separate conditions, so the space between them is
            what says so, and in text flow it has to be written down. The two literal spaces
            that used to sit here collapsed to one and only read as a separator while the row
            was a flex container with a gap. The spaces either side are the break opportunity a
            narrow column needs. */}
        <span style={{ display: "inline-block", inlineSize: "var(--space-sm)" }} />{" "}
        <InlineMath
          latex={`${low} + ${high} = ${sum}`}
          // Neutral until the pair is COMMITTED. This read `sum === middle ? CIVIC` before any
          // condition on `settled`, so the readout turned the answer colour the moment the dial
          // passed over the answering pair, with "Use this pair" still on offer: the board did the
          // comparison the task asks the learner to make, and finding the pair became dragging
          // until it went green. R26 puts the verdict on the learner's own pick, and a scrub is
          // not one. The other seventeen commit-bearing dials in the tree already wait for their
          // Check; `preCommitVerdictColour.browser.test.tsx` scrubs all twenty end to end.
          color={
            fill.given ? SIGNAL_DEEP : !settled ? LABEL : sum === middle ? CIVIC : BRICK
          }
        />
      </p>

      <div className="lesson-interactive__controls">
        <label className="lesson-interactive__field-label" htmlFor={sliderId}>
          Which pair
        </label>
        <input
          id={sliderId}
          className="lesson-interactive__input"
          type="range"
          min={0}
          max={pairs.length - 1}
          step={1}
          value={shownIndex}
          disabled={settled}
          aria-valuetext={
            fill.given
              ? `${low} times ${high}, which adds to ${sum}, the pair the answer was given as rather than answered`
              : `${low} times ${high}, which adds to ${sum}, against a target of ${middle}`
          }
          onChange={(event) => setIndex(Number(event.target.value))}
          // The shared entry, not a hand-rolled `readOnly`. The dial was already moved to the
          // answering pair, and read-only, and carried none of the amber dashing that says a
          // value was handed over: the control simply jumped to the right pair on its own,
          // which reads as the learner having found it.
          {...fill.entry(shownIndex)}
        />
        {settled ? null : (
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Use this pair
          </button>
        )}
      </div>

      {settled && right ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different trinomial
        </button>
      ) : null}

      <WidgetReveal
        available={tried && !right}
        revealed={revealed}
        answer={<InlineMath latex={`${tp} \\text{ and } ${tq}`} />}
        why={
          <>
            Every position on this control already multiplies to{" "}
            <InlineMath latex={`${constant}`} />, so the first condition never distinguishes
            them and the second one has to. Only <InlineMath latex={`${tp} + ${tq}`} />{" "}
            reaches <InlineMath latex={`${middle}`} />, which makes the sides{" "}
            <InlineMath latex={`(x + ${tp})(x + ${tq})`} />.
          </>
        }
        onReveal={reveal}
        label="Reveal the pair"
      />

      <p
        className="lesson-interactive__status"
        data-state={settled && right ? "solved" : settled ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : settled && right ? (
          <>
            <InlineMath
              latex={`x^{2} + ${middle}x + ${constant} = (x + ${tp})(x + ${tq})`}
              color={CIVIC}
            />
            . Multiplying those sides back out returns the trinomial, which is the check
            that makes the pair search safe to trust.
          </>
        ) : settled ? (
          <span style={{ color: BRICK }}>
            That pair multiplies to <InlineMath latex={`${constant}`} /> and adds to{" "}
            <InlineMath latex={`${sum}`} />, and the middle coefficient asks for{" "}
            <InlineMath latex={`${middle}`} />. Both conditions have to hold at once.
          </span>
        ) : (
          <span style={{ color: SOFT }}>
            Every position here already multiplies to the constant, so the sum is the only
            thing still to settle.
          </span>
        )}
      </p>
    </div>
  );
}
