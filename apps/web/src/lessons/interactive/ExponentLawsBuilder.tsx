/**
 * EXP.1 interactive (slide 0): build the product and quotient rules on one base.
 * Three rounds, three shapes: a plain product (x^3 * x^4, exponents ADD), a product whose
 * second exponent is negative (x^2 * x^-6, still added, and the total lands below zero),
 * and a quotient (x^7 / x^3, exponents SUBTRACT). The learner types the single combined
 * exponent each time and nothing is revealed until they do. Gates once all three rounds are
 * built. None of the three instances is the EXP.1 CFU, which is a power of a power times a
 * negative power. Themed to Boomtown Square; the math is unchanged.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

type Op = "product" | "quotient";

interface Round {
  a: number;
  b: number;
  op: Op;
  /** The sign of the second exponent for a product: +1 or -1. Ignored for a quotient. */
  sign: 1 | -1;
  /** The action label on the "next round" button. */
  next: string;
}

/**
 * Two sets of the same three shapes, on different exponents. "Start over" hands out the
 * set the learner has NOT just answered, so a second pass is worked rather than recalled.
 *
 * No round shares an ANSWER with the round it replaces, which is a stronger requirement
 * than differing exponents and the reason the second set opens on $6$ and $2$. It used to
 * open on $5$ and $2$, and $5 + 2$ and $3 + 4$ are both $7$: a learner who revealed round
 * one could type the number they had just been handed straight into the round meant to
 * make them work it out, and the re-ask asked nothing.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { a: 3, b: 4, op: "product", sign: 1, next: "Next: a negative exponent" },
    { a: 2, b: 6, op: "product", sign: -1, next: "Next: a division" },
    { a: 7, b: 3, op: "quotient", sign: 1, next: "" },
  ],
  [
    { a: 6, b: 2, op: "product", sign: 1, next: "Next: a negative exponent" },
    { a: 4, b: 9, op: "product", sign: -1, next: "Next: a division" },
    { a: 8, b: 3, op: "quotient", sign: 1, next: "" },
  ],
];

/** The combined exponent this round's law produces. */
function combinedExponent(round: Round): number {
  return round.op === "quotient" ? round.a - round.b : round.a + round.sign * round.b;
}

/** LaTeX for the expression the learner is combining. */
function expressionLatex(round: Round): string {
  const second = round.sign === -1 ? `-${round.b}` : `${round.b}`;
  return round.op === "quotient"
    ? `\\dfrac{x^{${round.a}}}{x^{${round.b}}}`
    : `x^{${round.a}} \\cdot x^{${second}}`;
}

/** A spoken description of the expression, for the diagram's accessible name. */
function expressionSpoken(round: Round): string {
  const second = round.sign === -1 ? `negative ${round.b}` : `${round.b}`;
  return round.op === "quotient"
    ? `x to the ${round.a} divided by x to the ${round.b}`
    : `x to the ${round.a} times x to the ${second}`;
}

export function ExponentLawsBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <ExponentLawsBuilderBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ExponentLawsBuilderBody({
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
  const [entryDone, setEntryDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const combined = combinedExponent(round);
  const isLastRound = roundIndex === lastIndex;
  const solved = entryDone;
  const isQuotient = round.op === "quotient";

  /** Close this round out. `earned` is false when the learner revealed it instead. */
  function finishRound(earned: boolean) {
    setEntryDone(true);
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
    if (entryDone) {
      return;
    }
    setAttempted(true);
    const read = readNumericEntry(entry, "integer");
    if (read.ok && read.value === combined) {
      finishRound(true);
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to a note about which way the exponents combine, which would answer a question
    // the learner did not ask. The attempt above still stands, so the reveal stays on offer.
    setFeedback(
      entry.trim() === ""
        ? "Enter the single combined exponent."
        : !read.ok
          ? WHOLE_NUMBER_MISS
          : isQuotient
            ? "Not quite. Dividing powers with the same base subtracts the exponents, top minus bottom."
            : "Not quite. Keep the base as it is and add the two exponents, sign included.",
    );
  }

  function reveal() {
    setEntry(String(combined));
    setRevealed(true);
    finishRound(false);
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setEntry("");
      setEntryDone(false);
      setAttempted(false);
      setRevealed(false);
      setFeedback(null);
    }
  }

  const panelFill = round.sign === -1 ? BRICK : SIGNAL;
  // The brackets are there to keep `2 + (-6)` readable, so they go on only where there is
  // a sign to hold apart from the plus. Applied unconditionally they printed `3 + (4)`,
  // which is a template seam showing through rather than anything mathematics asks for.
  const secondTerm = round.sign === -1 ? `(-${round.b})` : `${round.b}`;
  const workedLatex = isQuotient
    ? `${round.a} - ${round.b} = ${combined}`
    : `${round.a} + ${secondTerm} = ${combined}`;

  return (
    <div className="lesson-interactive lesson-interactive--exp-builder">
      <svg
        viewBox="0 0 440 176"
        role="img"
        aria-label={`Combine ${expressionSpoken(round)} into one power: enter the combined exponent`}
      >
        <title>Combine two powers that share a base</title>

        <text x={220} y={22} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <rect
          x={90}
          y={34}
          width={260}
          height={62}
          rx={10}
          fill={panelFill}
          fillOpacity={0.12}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={expressionLatex(round)}
          x={220}
          y={65}
          fontSize={24}
          color={LABEL}
          w={260}
        />

        <path d="M 220 100 L 220 122" fill="none" stroke={LINE} strokeWidth={1.5} />

        <SvgMath
          latex={solved ? `x^{${combined}}` : "x^{?}"}
          x={220}
          y={148}
          fontSize={26}
          color={solved ? CIVIC : SOFT}
        />
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on new exponents
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            {round.next}
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${expressionLatex(round)} = x^{?},`} /> exponent =
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label="Combined exponent"
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. Nothing to undo afterwards: see `useRevealFill`.
              {...fill.entry(combined)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={`x^{${combined}}`} />}
        why={
          <>
            {isQuotient
              ? "Both powers are built on the same base, so the division subtracts their exponents, top first: "
              : round.sign === -1
                ? "Both powers are built on the same base, so their exponents add, sign and all: "
                : "Both powers are built on the same base, so their exponents add: "}
            <InlineMath latex={workedLatex} />.{" "}
            {isQuotient
              ? "Every copy of the base on the bottom cancels one on the top, and the exponent left over is what survives."
              : round.sign === -1
                ? "A negative second exponent pulls the total down rather than pushing it up, but it is still an ordinary sum."
                : `Written out, that is the base multiplied by itself ${round.a} times and then ${round.b} more, which is ${combined} copies in a row.`}
            {combined < 0
              ? " A total below zero is still a real exponent. Slide four is where it moves to the bottom of a fraction."
              : ""}
          </>
        }
        onReveal={reveal}
        // One box per round, so what is left after this one is explained is the rounds after
        // it: a learner two rounds in keeps them instead of paying for the explanation with
        // the whole set. False on the last round, which is the one the gate turns on.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            {isQuotient
              ? "They have the same base, so dividing subtracts their exponents: "
              : "They have the same base, so their exponents add: "}
            <InlineMath latex={workedLatex} />
            {combined < 0
              ? ". A total below zero is still a real exponent. Slide four moves it to the bottom of a fraction."
              : "."}
          </>
        ) : (
          (feedback ??
          (isQuotient
            ? "This one is a division, so the exponents subtract. Enter the combined exponent."
            : "These two powers have the same base, so we can add their exponents. Enter the combined exponent."))
        )}
      </p>
    </div>
  );
}
