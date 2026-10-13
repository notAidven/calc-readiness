/**
 * RAD.2 interactive (slide 3): predict whether two forms are the same value, then check the
 * decimals and see whether the prediction held.
 *
 * The prediction has to be committed BEFORE the evidence appears, which is the whole point:
 * a learner who has already said "same value" out loud reads the two decimals differently
 * from one who is shown them first. The previous version printed the decimals only on a
 * CORRECT call, so the learner who most needed to see them, the one who guessed wrong, was
 * told the answer instead of shown it. Now the check runs either way.
 *
 * Two pairs per board are genuine rationalizations and one is a wrong move that really does
 * change the value, so the learner cannot settle on "these are always equal". A wrong
 * prediction still resolves its row rather than reopening it, so a board of three cannot be
 * brute-forced. The gate opens once all three are CALLED, not once all three are called
 * correctly — the reasoning is in `kinds/BinaryRowSort`, which gates the same way: the lock
 * is there to make each row a question, not to charge the learner a whole fresh board for
 * one wrong prediction. A missed board still offers fresh pairs, a missed row still shows
 * its decimals and still offers a reveal that explains the algebra rather than restating
 * them, and the status line still reports the miss. Every correct prediction fires the
 * shared success state; a reveal does not.
 *
 * A reveal taken while pairs are still open does not spend the board either. Three pairs are
 * three answers, so the reveal that explains one of them says what is left (`othersRemain`)
 * and the shared layer offers the board BACK beside the fresh set. Without that a learner who
 * missed the first pair and read the algebra lost the two they had not yet called.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Pair {
  id: string;
  left: string;
  right: string;
  leftVal: number;
  rightVal: number;
  /** True when the two forms are the same value (a correct rationalization). */
  equal: boolean;
  /** Why, in algebra rather than decimals. Shown by the reveal on a missed row. */
  why: string;
}

/**
 * Two sets of three pairs. Asking for another set hands out the one the learner has not
 * just called, and closes the gate behind it, so a clean board has to be earned on numbers
 * that were not already resolved on screen.
 */
const POOLS: readonly (readonly Pair[])[] = [
  [
    {
      id: "b1p1",
      left: "\\tfrac{1}{\\sqrt{2}}",
      right: "\\tfrac{\\sqrt{2}}{2}",
      leftVal: 1 / Math.SQRT2,
      rightVal: Math.SQRT2 / 2,
      equal: true,
      why: "\\tfrac{1}{\\sqrt{2}} \\cdot \\tfrac{\\sqrt{2}}{\\sqrt{2}} = \\tfrac{\\sqrt{2}}{2}",
    },
    {
      id: "b1p2",
      left: "\\tfrac{3}{\\sqrt{3}}",
      right: "\\sqrt{3}",
      leftVal: 3 / Math.sqrt(3),
      rightVal: Math.sqrt(3),
      equal: true,
      why: "\\tfrac{3}{\\sqrt{3}} \\cdot \\tfrac{\\sqrt{3}}{\\sqrt{3}} = \\tfrac{3\\sqrt{3}}{3} = \\sqrt{3}",
    },
    {
      id: "b1p3",
      left: "\\tfrac{4}{\\sqrt{2}}",
      right: "\\tfrac{\\sqrt{2}}{4}",
      leftVal: 4 / Math.SQRT2,
      rightVal: Math.SQRT2 / 4,
      equal: false,
      why: "\\tfrac{4}{\\sqrt{2}} \\cdot \\tfrac{\\sqrt{2}}{\\sqrt{2}} = \\tfrac{4\\sqrt{2}}{2} = 2\\sqrt{2}",
    },
  ],
  [
    {
      id: "b2p1",
      left: "\\tfrac{6}{\\sqrt{2}}",
      right: "\\tfrac{6}{2}",
      leftVal: 6 / Math.SQRT2,
      rightVal: 3,
      equal: false,
      why: "\\tfrac{6}{\\sqrt{2}} \\cdot \\tfrac{\\sqrt{2}}{\\sqrt{2}} = \\tfrac{6\\sqrt{2}}{2} = 3\\sqrt{2}",
    },
    {
      id: "b2p2",
      left: "\\tfrac{1}{\\sqrt{5}}",
      right: "\\tfrac{\\sqrt{5}}{5}",
      leftVal: 1 / Math.sqrt(5),
      rightVal: Math.sqrt(5) / 5,
      equal: true,
      why: "\\tfrac{1}{\\sqrt{5}} \\cdot \\tfrac{\\sqrt{5}}{\\sqrt{5}} = \\tfrac{\\sqrt{5}}{5}",
    },
    {
      id: "b2p3",
      left: "\\tfrac{4}{\\sqrt{3}}",
      right: "\\tfrac{4\\sqrt{3}}{3}",
      leftVal: 4 / Math.sqrt(3),
      rightVal: (4 * Math.sqrt(3)) / 3,
      equal: true,
      why: "\\tfrac{4}{\\sqrt{3}} \\cdot \\tfrac{\\sqrt{3}}{\\sqrt{3}} = \\tfrac{4\\sqrt{3}}{3}",
    },
  ],
];

function dec(n: number): string {
  return n.toFixed(3);
}

/** The two readings side by side, with the relation the decimals actually show. */
function decimalLatex(pair: Pair): string {
  return `${dec(pair.leftVal)} ${pair.equal ? "=" : "\\neq"} ${dec(pair.rightVal)}`;
}

export function RationalizeExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const pairs = POOLS[variant.index] ?? (POOLS[0] as readonly Pair[]);
  return (
    <RationalizeExploreBody
      key={variant.nonce}
      pairs={pairs}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RationalizeExploreBody({
  pairs,
  onSolved,
  onRestart,
}: {
  pairs: readonly Pair[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Pair id -> the learner's prediction, once committed. */
  const [predicted, setPredicted] = useState<Record<string, boolean>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const answeredCount = pairs.filter((p) => predicted[p.id] !== undefined).length;
  const complete = answeredCount === pairs.length;
  const missed = pairs.some(
    (p) => predicted[p.id] !== undefined && predicted[p.id] !== p.equal,
  );
  /**
   * Every pair called AND every prediction held. What the CONCLUSION is said about, and no
   * longer what the gate turns on: see `predict`.
   */
  const clean = complete && !missed;

  function predict(pair: Pair, guessEqual: boolean) {
    if (predicted[pair.id] !== undefined) {
      return;
    }
    const next = { ...predicted, [pair.id]: guessEqual };
    setPredicted(next);
    if (guessEqual === pair.equal) {
      success();
    }
    // CALLED, not called correctly, for the reason set out in `BinaryRowSort`: a prediction
    // that did not hold is a thing this widget exists to show the learner, not a reason to
    // make them predict the other two again. The decimals beside the row still report it and
    // the reveal still explains it.
    const answered = pairs.every((p) => next[p.id] !== undefined);
    if (answered && !done) {
      setDone(true);
      onSolved();
    }
  }

  const neutral = { color: LABEL, borderColor: LINE };
  /** The first row the learner got wrong and has not yet had explained. */
  const stuck =
    pairs.find((p) => predicted[p.id] !== undefined && predicted[p.id] !== p.equal) ?? null;
  const revealedPair = pairs.find((p) => p.id === revealedId) ?? null;

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      {/* The board, and the grid every row borrows its columns from: the comparison, the two
          calls, and the verdict glyph. Without it each row sized its own tracks, so the
          comparison column had to be a hardcoded fraction and the option columns hardcoded rem
          widths that were narrower than the words in them. */}
      <div className="lesson-classify">
        {pairs.map((pair) => {
          const call = predicted[pair.id];
          const checked = call !== undefined;
          const hit = checked && call === pair.equal;
          return (
            <div key={pair.id} className="lesson-classify__row">
              <span className="lesson-interactive__step-eq">
                <InlineMath latex={pair.left} color={LABEL} />
                <span style={{ color: SOFT }}> vs </span>
                <InlineMath latex={pair.right} color={LABEL} />
                {/* The check runs whether the prediction held or not: the learner who
                  guessed wrong is the one who most needs to see the two readings. */}
                {/* Its own line, so the pair being compared keeps theirs. */}
                {checked && (
                  <span className="lesson-classify__reading">
                    <InlineMath
                      latex={decimalLatex(pair)}
                      color={pair.equal ? CIVIC : BRICK}
                    />
                  </span>
                )}
              </span>
              {checked ? (
                <span
                  className="lesson-classify__outcome"
                  style={{ color: hit ? CIVIC : BRICK }}
                >
                  {hit
                    ? call
                      ? "You said same value, and it is"
                      : "You said different value, and it is"
                    : call
                      ? "You said same value; the decimals disagree"
                      : "You said different value; the decimals agree"}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="lesson-interactive__chip"
                    style={neutral}
                    onClick={() => predict(pair, true)}
                  >
                    Same value
                  </button>
                  <button
                    type="button"
                    className="lesson-interactive__chip"
                    style={neutral}
                    onClick={() => predict(pair, false)}
                  >
                    Different value
                  </button>
                </>
              )}
              <span
                className="lesson-classify__check"
                style={{ color: hit ? CIVIC : BRICK }}
              >
                {checked ? (hit ? "\u2713" : "\u2717") : ""}
              </span>
            </div>
          );
        })}
      </div>

      {complete && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {missed ? "Try a fresh set" : "New set of three pairs"}
        </button>
      )}

      <WidgetReveal
        available={stuck !== null && revealedPair === null}
        revealed={revealedPair !== null}
        // The row the learner is STUCK on, not the one already explained: the reveal is
        // read at the moment of the click, when that row is the one in question.
        answer={
          stuck === null ? null : (
            <>
              <InlineMath latex={stuck.left} /> and <InlineMath latex={stuck.right} /> are{" "}
              {stuck.equal ? "the same value" : "not the same value"}
            </>
          )
        }
        why={
          stuck === null ? null : (
            <>
              Rationalizing that fraction means multiplying it by{" "}
              <InlineMath latex="\tfrac{\sqrt{b}}{\sqrt{b}}" />, which is a number over
              itself and therefore <InlineMath latex="1" />, so the value cannot move. Doing
              it here gives <InlineMath latex={stuck.why} />.{" "}
              {stuck.equal
                ? "That is exactly the form on the right, which is why the two decimals agree."
                : "That is not the form on the right, so whatever produced the right-hand side was a different move, and it changed the value."}
            </>
          )
        }
        onReveal={() => setRevealedId(stuck?.id ?? null)}
        label="Show me the algebra"
        // Read off the board rather than passed as a constant. The row being explained is
        // always one the learner HAS called, so every pair still open is another answer, and
        // handing the board back cannot hand over the gate: that turns on every pair being
        // called and one of them is not. False on a fully called board, which is the right
        // answer there too — nothing is outstanding, and the open gate is what earns the
        // hand-back instead (`gateOpen` on `WidgetFeedbackHost`).
        othersRemain={pairs.some((p) => predicted[p.id] === undefined)}
      />

      <p
        className="lesson-interactive__status"
        data-state={clean ? "solved" : missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {/* What is true of the board, whatever a reveal has done to it. This used to render
            nothing at all while `revealedId` was set, and that flag does not clear inside a
            board: a reveal that RESOLVED took the line away for the rest of the board, on a
            board the learner can still work. The reveal's own passage belongs to the shared
            layer and is printed below this, so there is nothing here to step aside for. */}
        {clean ? (
          <>
            Rationalizing multiplies by <InlineMath latex="1" />, so the decimal reading
            never moves. A pair whose decimals disagree came from some other move, not from
            rationalizing.
          </>
        ) : complete && missed ? (
          // Says what is now true. What it replaced ("A clean set is all three predictions
          // holding. Let's go for a perfect one") aimed the learner at a fresh set because a
          // fresh set was the only way past; every called board now opens the gate, so it
          // would be sending them back for no reason. A prediction that did not hold is the
          // most useful thing on this board, so the line points at it rather than away.
          "That's all three called, so you're good to move on. Where a prediction did not hold, the decimals beside it show what that pair actually does."
        ) : (
          "Say what you expect for each pair before you look. The decimals are worked out for you, so you can see whether it held."
        )}
      </p>
    </div>
  );
}
