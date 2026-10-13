/**
 * RAD.3 interactive (slide 1): find the number that gives the target when it is multiplied
 * by itself the right number of times, and read off what the fraction exponent is asking
 * for.
 *
 * The slide's job is to make a fraction exponent MEAN something before any rule is quoted
 * at it, so the widget is arithmetic the learner can do in their head. The board shows
 * $? \cdot ? \cdot ? = 27$ with the copies drawn out, they type the number that fills every
 * copy, and only then does the board write the two ways of asking for it, $\sqrt[3]{27}$
 * and $27^{1/3}$, side by side against the answer they just found.
 *
 * It replaces a slider that stepped a root index while the learner typed the power that
 * turned $x^{1/q}$ back into $x$. That was the algebra of the third slide, one slide early
 * and with nothing concrete under it, and QA read it as nonsensical. Nothing is dragged
 * here, nothing is estimated, and no rule is needed to answer it.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Round {
  /** The number the copies have to multiply to. */
  target: number;
  /** How many copies, which is the index of the root and the bottom of the fraction. */
  index: number;
  /** The number in every copy, which is the answer. */
  root: number;
}

/** What a root of this index is called, so no sentence has to say "3th root". */
const ROOT_NAME: Record<number, string> = {
  2: "square root",
  3: "cube root",
  4: "fourth root",
  5: "fifth root",
};

function rootName(index: number): string {
  return ROOT_NAME[index] ?? `root of index ${index}`;
}

/**
 * Two sets of two. Neither set uses the slide's own $8$, both mix a cube with a root of a
 * different index so the count of copies has to be read rather than assumed, and "start
 * over" hands out the set the learner has NOT just worked.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { target: 27, index: 3, root: 3 },
    { target: 16, index: 4, root: 2 },
  ],
  [
    { target: 64, index: 3, root: 4 },
    { target: 32, index: 5, root: 2 },
  ],
];

export function RationalExponentPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <RationalExponentPlayBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RationalExponentPlayBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [entry, setEntry] = useState("");
  const [found, setFound] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const lastIndex = rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;

  /**
   * The row of copies, with the learner's answer written into every one of them.
   *
   * An unfilled copy is `\mathord{?}`, not a bare `?`: KaTeX classes `?` as a CLOSE atom and
   * TeX demotes a binary operator standing before one to an ordinary atom, so the `\cdot`
   * joining the copies loses its space on both sides and the row sets as `?·?·? = 27`.
   */
  const copies = Array.from({ length: round.index }, () =>
    found ? round.root : "\\mathord{?}",
  );
  const productLatex = `${copies.join(" \\cdot ")} = ${round.target}`;

  /** Close this round out. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setFound(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (found) {
      return;
    }
    setAttempted(true);
    const read = readNumericEntry(entry, "integer");
    if (read.ok && read.value === round.root) {
      finish(true);
      return;
    }
    if (entry.trim() === "") {
      setFeedback("The box is empty. Enter the number that goes in every copy.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than reaching the
    // note below, which would multiply it out and print NaN back at the learner. The floor
    // the box's `min` used to carry is checked here too, now that the attribute has gone with
    // the spinner. The attempt above still stands, so the reveal stays on offer.
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    const typed = read.value;
    if (typed < 1) {
      setFeedback("The number that goes in every copy is 1 or more here.");
      return;
    }
    const got = typed ** round.index;
    setFeedback(
      `Not quite. ${round.index} copies of ${typed} multiply to ${got}, and the target is ${round.target}. Try a ${got > round.target ? "smaller" : "larger"} number.`,
    );
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setEntry("");
      setFound(false);
      setAttempted(false);
      setRevealed(false);
      setFeedback(null);
    }
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Work out the one number that every copy holds. That number is what a fraction
        exponent is asking for, before any rule about fraction exponents is quoted at you.
      </WidgetTask>

      <svg
        viewBox="0 0 440 158"
        role="img"
        aria-label={`${round.index} copies of the same number multiply to ${round.target}. Find the number.`}
      >
        <title>Find the number that the copies multiply to the target</title>

        <text x={220} y={20} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <text x={220} y={40} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`${round.index} copies of the same number`}
        </text>

        <rect
          x={40}
          y={50}
          width={360}
          height={44}
          rx={10}
          fill={found ? CIVIC : LINE}
          fillOpacity={found ? 0.14 : 0.1}
          stroke={found ? CIVIC : LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={productLatex}
          x={220}
          y={72}
          fontSize={22}
          color={found ? LABEL : SOFT}
          w={356}
        />

        {found && (
          <>
            <text x={220} y={112} textAnchor="middle" fontSize={12} fill={SOFT}>
              two ways of asking for that number
            </text>
            <SvgMath
              latex={`\\sqrt[${round.index}]{${round.target}} = ${round.root}`}
              x={130}
              y={138}
              fontSize={22}
              color={CIVIC}
              w={160}
              h={52}
            />
            <SvgMath
              latex={`${round.target}^{\\frac{1}{${round.index}}} = ${round.root}`}
              x={310}
              y={138}
              fontSize={22}
              color={BRICK}
              w={160}
              h={52}
            />
          </>
        )}
      </svg>

      {found ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on two new numbers
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a different number of copies
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              Every copy holds the number
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`The number that ${round.index} copies of multiply to ${round.target}`}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. One box per round, and `round.root` is the value `check`
              // grades it against, so the blank the passage explains is this one.
              {...fill.entry(round.root)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !found}
        revealed={revealed}
        answer={<InlineMath latex={`${round.root}`} />}
        why={
          <>
            <InlineMath latex={`${Array(round.index).fill(round.root).join(" \\cdot ")}`} />{" "}
            comes to <InlineMath latex={`${round.target}`} />, so{" "}
            <InlineMath latex={`${round.root}`} /> is the number every copy holds. Asking
            for it is what the {rootName(round.index)} of {round.target} means, and{" "}
            <InlineMath latex={`${round.target}^{\\frac{1}{${round.index}}}`} /> is the same
            request written with an exponent instead of a root sign.
          </>
        }
        onReveal={() => {
          setEntry(String(round.root));
          setRevealed(true);
          finish(false);
        }}
        // One number per round, so what is left after this one is explained is the rounds
        // after it. False on the last round, which is the one the gate turns on.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={found ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : found ? (
          <>
            <InlineMath latex={`${round.root}`} /> multiplied by itself {round.index} times
            gives {round.target}, which is exactly what the {rootName(round.index)} of{" "}
            {round.target} asks for. Written with an exponent that request is{" "}
            <InlineMath latex={`${round.target}^{\\frac{1}{${round.index}}}`} />, so the{" "}
            {round.index} on the bottom of the fraction is the count of copies.
          </>
        ) : (
          (feedback ??
          `Enter the number that ${round.index} copies of, multiplied together, come to ${round.target}.`)
        )}
      </p>
    </div>
  );
}
