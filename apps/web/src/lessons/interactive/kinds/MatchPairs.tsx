/**
 * INTERACTION KIND: matching pairs.
 *
 * Two columns, one shuffled against the other, and the learner joins each left item to the
 * right one it equals. It fits any idea whose content is a CORRESPONDENCE rather than a
 * procedure, and unlike a set of separate questions it makes the distractors do work: a
 * wrong right-hand item is somebody else's correct answer, so guessing one wrong costs two.
 *
 * The gate opens only when every pair is joined. A wrong join is refused and named; after
 * one the learner may reveal that single pair with the reasoning behind it.
 *
 * Revealing one pair does not cost the board either. While any other pair is still unjoined
 * the passage explains the one and the board comes BACK with every join the learner has
 * already made: `othersRemain` below. On the last outstanding pair it is false, because there
 * would be nothing left to come back to and handing the board back would be handing over the
 * gate.
 *
 * A pair may also carry a `name`, which is what the correspondence is called. Where the
 * names are themselves the content ("additive identity" against "additive inverse"), a board
 * that only ever printed them in the reveal would teach them to the learner who guessed
 * wrong and to nobody else, so a named pair says its name as it lands and keeps it on the
 * joined item.
 *
 * ## R24: the task line, and why this kind was missing one
 *
 * R17 exempts this kind from a REQUIRED `objective`, on the ground that its prompt already
 * names what to find because finding it IS the interaction. That exemption is sound and it had
 * been quietly doubling as an exemption from R24, which is a different rule about WHERE the
 * task sits: the prompt was rendered only inside `.lesson-interactive__status`, the last child
 * of the board and the `aria-live` region, so a learner read eight controls before reading what
 * they were for and **the first wrong join erased the sentence**
 * (`feedback ?? namedNote ?? prompt`).
 *
 * So the task now leads the board through the shared {@link WidgetTask} slot, and `objective`
 * is OPTIONAL rather than required for the reason R17 gives. A board that supplies one reads
 * like every other kind: objective first, mechanic line in the status. A board that does not
 * has its `prompt` promoted into the slot instead, and the status line stops repeating it, so
 * the four instances authored before this change gain the ordering without an edit and without
 * two copies of one sentence (R8).
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, SIGNAL_DEEP, SOFT } from "../../svgKit";
import { WidgetReveal } from "../../widgetFeedback";
import {
  useRevealAnchor,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
} from "../../widgetMechanics";
import { WidgetTask } from "../../widgetTask";
import { usePickup } from "../pickup";

/** What a pair carries whichever way its two sides are given. */
interface MatchPairBase {
  id: string;
  /** Spoken forms, for the buttons' accessible names. */
  leftSpoken: string;
  rightSpoken: string;
  /** Why these two are the same thing. */
  why: ReactNode;
  /**
   * What this pair is CALLED, when the name is part of the lesson: "additive identity".
   * A board whose pairs have names says the name of each one as it is joined, so a learner
   * who matches all four correctly still learns which was which. Boards where the pairing
   * itself is the whole idea leave it unset and nothing is printed.
   */
  name?: string;
}

/**
 * A side is given EITHER as LaTeX or as prose, and the union is what makes "neither" impossible.
 *
 * PROSE IS NOT MATH, and typesetting a sentence as `\text{...}` is what painted LIN.3's four
 * questions outside the buttons drawn around them. KaTeX emits U+00A0 for every space inside
 * `\text{}`, so a sentence typeset that way is ONE unbreakable run: three progressively looser
 * `white-space` relaxations measured identical to the shipped `nowrap` to the tenth of a pixel,
 * and nowrap text too wide for its box is painted outside it rather than clipped. The same
 * sentence given as prose wraps at its spaces, two clean lines with nothing outside.
 * `matchItemFit.browser.test.tsx` holds both measurements and guards the result.
 *
 * A `ReactNode` rather than a string, because a sentence may still contain real math and each
 * part then keeps its own treatment: POL.8's "the 1x^{2} line's product" is prose around one
 * expression. It is not an escape hatch for math — an expression has no break opportunity in it
 * whatever it is rendered as, so giving one as prose buys nothing and loses the typesetting.
 */
type MatchLeft =
  | {
      /** The left-hand item, as LaTeX. */
      left: string;
      leftProse?: never;
    }
  | {
      left?: never;
      /** The left-hand item, as prose to be set as text. */
      leftProse: ReactNode;
    };

type MatchRight =
  | {
      /** The right-hand item it equals, as LaTeX. */
      right: string;
      rightProse?: never;
    }
  | {
      right?: never;
      /** The right-hand item it equals, as prose to be set as text. */
      rightProse: ReactNode;
    };

export type MatchPair = MatchPairBase & MatchLeft & MatchRight;

/** One side of a pair as the learner reads it: typeset when it is math, text when it is prose. */
function PairSide({
  latex,
  prose,
  color,
}: {
  latex: string | undefined;
  prose: ReactNode;
  color?: string;
}) {
  return latex === undefined ? (
    <span style={{ color }}>{prose}</span>
  ) : (
    <InlineMath latex={latex} color={color} />
  );
}

export interface MatchPairsProps {
  pairs: readonly MatchPair[];
  /** The order the right column is dealt in: indices into `pairs`. Never the identity. */
  rightOrder: readonly number[];
  /**
   * WHAT the correspondence is, and how the learner will know the board is done. Optional,
   * per R17: on this kind the prompt already names what to find. Where it is omitted the
   * prompt leads the board instead, so R24's ordering holds either way.
   *
   * The slot belongs HERE rather than to each wrapper. `integration` and EL.6 arrived at it
   * independently, and the EL.6 wrapper reached it the long way round: it first rendered its own
   * `WidgetTask` beside this component, which reads correctly on screen and lands OUTSIDE
   * `.lesson-interactive`, where `widgetTaskOrder.browser.test.tsx` scopes its query and so
   * cannot see it. A task line no sweep can see is the shape of the defect R24 was written for.
   */
  objective?: ReactNode;
  prompt: string;
  conclusion: ReactNode;
  ariaLabel: string;
  onSolved: () => void;
  onRestart: () => void;
  restartLabel: string;
}

export function MatchPairs({
  pairs,
  rightOrder,
  objective,
  prompt,
  conclusion,
  ariaLabel,
  onSolved,
  onRestart,
  restartLabel,
}: MatchPairsProps) {
  /** Pair id -> joined. */
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [missed, setMissed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  /** The pair the status line is naming, once a named pair has just been joined. */
  const [named, setNamed] = useState<string | null>(null);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const anchor = useRevealAnchor();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = pairs.every((p) => joined[p.id] === true);
  /** Still to be joined. The misjoined pair is one of these, which is what the count is for. */
  const open = pairs.filter((p) => joined[p.id] !== true);
  const rights = rightOrder.map((i) => pairs[i]).filter((p): p is MatchPair => Boolean(p));

  function settle(id: string) {
    const next = { ...joined, [id]: true };
    setJoined(next);
    if (pairs.every((p) => next[p.id] === true)) {
      onSolved();
    }
  }

  function joinTo(right: MatchPair) {
    const leftId = pickup.take();
    if (leftId === null || joined[right.id] === true) {
      return;
    }
    if (leftId !== right.id) {
      const left = pairs.find((p) => p.id === leftId);
      setMissed(leftId);
      setNamed(null);
      setFeedback(
        `Not quite. ${left ? left.leftSpoken : "That one"} is not ${right.rightSpoken}. Work it out on its own before you join it.`,
      );
      return;
    }
    setMissed(null);
    setRevealed(null);
    setFeedback(null);
    setNamed(right.name === undefined ? null : right.id);
    success();
    settle(right.id);
  }

  function reveal() {
    if (missed === null) {
      return;
    }
    setRevealed(missed);
    setMissed(null);
    setFeedback(null);
    setNamed(null);
    settle(missed);
  }

  const revealedPair = pairs.find((p) => p.id === revealed) ?? null;
  /** The pair the reveal is speaking about: the left item that was just misjoined. */
  const missedPair = pairs.find((p) => p.id === missed) ?? null;
  const namedPair = pairs.find((p) => p.id === named) ?? null;
  const namedNote =
    namedPair === null || namedPair.name === undefined ? null : (
      <>
        Joined. <PairSide latex={namedPair.left} prose={namedPair.leftProse} /> ={" "}
        <PairSide latex={namedPair.right} prose={namedPair.rightProse} />, the{" "}
        <strong>{namedPair.name}</strong>.
      </>
    );

  /**
   * Which pair the passage on screen is about, over both reveal windows. The first reveal
   * leaves the miss standing, so it is `missed`; the second one settles the pair and moves
   * it to `revealed`. Only the shared layer decides whether this is drawn.
   */
  const explaining = missed ?? revealed;

  /**
   * The pair the passage has JOINED for the learner. On this kind the blank is the join
   * itself, so a reveal that named the pair and left both columns unjoined asked the learner
   * to hold the correspondence in their head while looking at a board that denied it.
   */
  const handed = fill.given ? missed : null;

  return (
    <div className="lesson-interactive lesson-interactive--match">
      <WidgetTask>{objective ?? prompt}</WidgetTask>

      <fieldset className="lesson-match__grid">
        <legend className="visually-hidden">{ariaLabel}</legend>
        <div className="lesson-match__side">
          {pairs.map((pair) => {
            const done = joined[pair.id] === true;
            const holding = pickup.held === pair.id;
            return (
              <button
                key={`l-${pair.id}`}
                type="button"
                className="lesson-match__item"
                {...anchor(pair.id === explaining)}
                data-state={
                  done ? "joined" : pair.id === handed ? "given" : holding ? "held" : "open"
                }
                disabled={done}
                draggable={!done}
                aria-pressed={holding}
                aria-label={
                  pair.id === handed
                    ? `${pair.leftSpoken} was given as joining ${pair.rightSpoken}, not answered`
                    : done
                      ? `${pair.leftSpoken} is joined to ${pair.rightSpoken}${
                          pair.name === undefined ? "" : `, the ${pair.name}`
                        }`
                      : `Pick up ${pair.leftSpoken}`
                }
                {...fill.mark(pair.id === handed)}
                // HELD IS NOT A VERDICT. `CIVIC` and `BRICK` are the correctness channel and
                // belong to the learner's own pick once it has been judged; an item the
                // learner is merely carrying has been judged by nothing. `SIGNAL_DEEP` is the
                // third hue `svgKit` reserves for exactly that, and it is what `GeoNetDrag`
                // already paints a held face in. Leaving the held item `SOFT` would move it
                // off the channel by deleting the state: this kind has no
                // `[aria-pressed="true"]` rule behind it, so the border and the tint below
                // are the whole of what says which item is in hand.
                style={{
                  borderColor:
                    pair.id === handed
                      ? SIGNAL_DEEP
                      : done
                        ? CIVIC
                        : holding
                          ? SIGNAL_DEEP
                          : SOFT,
                  borderStyle: pair.id === handed ? "dashed" : "solid",
                }}
                onDragStart={() => pickup.hold(pair.id)}
                onDragEnd={() => pickup.clear()}
                onClick={() => pickup.toggle(pair.id)}
              >
                <PairSide
                  latex={pair.left}
                  prose={pair.leftProse}
                  color={done ? CIVIC : LABEL}
                />
                {done && pair.name !== undefined && (
                  <span className="lesson-match__name">{pair.name}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="lesson-match__side">
          {rights.map((pair) => {
            const done = joined[pair.id] === true;
            return (
              <button
                key={`r-${pair.id}`}
                type="button"
                className="lesson-match__item"
                {...anchor(pair.id === explaining)}
                data-state={done ? "joined" : pair.id === handed ? "given" : "open"}
                disabled={done}
                aria-label={
                  pair.id === handed
                    ? `${pair.rightSpoken} was given as joining ${pair.leftSpoken}, not answered`
                    : done
                      ? `${pair.rightSpoken} is joined to ${pair.leftSpoken}`
                      : `Join what you are holding to ${pair.rightSpoken}`
                }
                {...fill.mark(pair.id === handed)}
                style={{
                  borderColor: pair.id === handed ? SIGNAL_DEEP : done ? CIVIC : SOFT,
                  borderStyle: pair.id === handed ? "dashed" : "solid",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => joinTo(pair)}
                onClick={() => joinTo(pair)}
              >
                <PairSide
                  latex={pair.right}
                  prose={pair.rightProse}
                  color={done ? CIVIC : LABEL}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {restartLabel}
        </button>
      )}

      <WidgetReveal
        available={missed !== null}
        revealed={revealedPair !== null}
        answer={
          missedPair === null ? null : (
            <>
              <PairSide latex={missedPair.left} prose={missedPair.leftProse} /> joins{" "}
              <PairSide latex={missedPair.right} prose={missedPair.rightProse} />
            </>
          )
        }
        why={missedPair === null ? null : missedPair.why}
        onReveal={reveal}
        label="Reveal this pair"
        othersRemain={open.length > 1}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealedPair !== null
          ? null
          : solved
            ? conclusion
            : // The prompt is only a fallback here when it is NOT already the task line
              // above, or the board would carry the same sentence twice (R8).
              (feedback ?? namedNote ?? (objective === undefined ? null : prompt))}
      </p>
    </div>
  );
}
