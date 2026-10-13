/**
 * LIN.3 slide 0: one rule, and the question decides which quantity has to end up alone.
 *
 * The slide's whole claim is that a formula is pointed at one quantity and a different question
 * needs it pointed somewhere else. Deciding WHICH quantity is the target is the step before any
 * algebra, and it is the step a learner skips: handed a rule and some numbers they start moving
 * symbols before asking what the answer is supposed to be.
 *
 * So the pairs run from a question the foundry is asked to the rearrangement that answers it,
 * and the right column carries whole rearranged rules rather than bare variable names. A column
 * of bare names would be matchable by counting how many quantities each question mentions.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  /** The rule every question on this board is asked about. */
  rule: string;
  spokenRule: string;
  pairs: readonly MatchPair[];
  rightOrder: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    rule: "C = np + f",
    spokenRule: "C equals n p plus f",
    pairs: [
      {
        id: "count",
        leftProse: "How many ingots did that bill cover?",
        right: "n = \\dfrac{C - f}{p}",
        leftSpoken: "how many ingots did that bill cover",
        rightSpoken: "n equals C minus f over p",
        name: "solved for the count",
        why: (
          <>
            The question asks for the number of ingots, so <InlineMath latex="n" /> is what
            has to stand alone. The fixed charge comes off the total first and the price per
            ingot is divided away second.
          </>
        ),
      },
      {
        id: "price",
        leftProse: "What was each ingot charged at?",
        right: "p = \\dfrac{C - f}{n}",
        leftSpoken: "what was each ingot charged at",
        rightSpoken: "p equals C minus f over n",
        name: "solved for the price",
        why: (
          <>
            A price per ingot is <InlineMath latex="p" />, so this is the same first move
            followed by dividing by the count instead of by the price. The two
            rearrangements differ only in which of the two the last division is by.
          </>
        ),
      },
      {
        id: "fixed",
        leftProse: "What was the fixed charge on top?",
        right: "f = C - np",
        leftSpoken: "what was the fixed charge on top",
        rightSpoken: "f equals C minus n p",
        name: "solved for the fixed charge",
        why: (
          <>
            The fixed charge is <InlineMath latex="f" />, and it is only ADDED in the rule,
            so one subtraction isolates it and no division is needed at all.
          </>
        ),
      },
      {
        id: "total",
        leftProse: "What does the whole bill come to?",
        right: "C = np + f",
        leftSpoken: "what does the whole bill come to",
        rightSpoken: "C equals n p plus f",
        name: "already pointed the right way",
        why: (
          <>
            This is the one question the rule already answers, so there is nothing to
            rearrange. Recognising that is part of the skill: a rule is only worth
            re-pointing when the quantity you want is not already alone.
          </>
        ),
      },
    ],
    rightOrder: [3, 0, 2, 1],
  },
  {
    // The melt rule this board used to carry, $B = c + t - m$, was the CFU's own rule, and its
    // tin pair printed $t = B - c + m$ — the rearrangement the learner is asked to produce four
    // slides later, on the same question in the same words. The day's charge is a different
    // shape as well as a different melt: the wanted quantity sits inside a bracket, so nothing
    // here is the CFU's "take the other charge off and put the loss back on".
    rule: "D = n(c + s)",
    spokenRule: "D equals n times, c plus s",
    pairs: [
      {
        id: "copper",
        leftProse: "How much copper goes into one crucible?",
        right: "c = \\dfrac{D}{n} - s",
        leftSpoken: "how much copper goes into one crucible",
        rightSpoken: "c equals D over n, minus s",
        name: "solved for the copper",
        why: (
          <>
            The day's charge shared over the crucibles is what ONE crucible takes, which is{" "}
            <InlineMath latex="\dfrac{D}{n}" />. The scrap is part of that charge, so taking
            it off leaves the copper.
          </>
        ),
      },
      {
        id: "scrap",
        leftProse: "How much scrap goes into one crucible?",
        right: "s = \\dfrac{D}{n} - c",
        leftSpoken: "how much scrap goes into one crucible",
        rightSpoken: "s equals D over n, minus c",
        name: "solved for the scrap",
        why: (
          <>
            Copper and scrap sit inside the bracket the same way, so isolating either one
            takes the same two moves with the other's name in them.
          </>
        ),
      },
      {
        id: "count",
        leftProse: "How many crucibles were charged that day?",
        right: "n = \\dfrac{D}{c + s}",
        leftSpoken: "how many crucibles were charged that day",
        rightSpoken: "n equals D over, c plus s",
        name: "solved for the count",
        why: (
          <>
            The bracket is one crucible's whole charge, so the day's charge divided by it
            counts the crucibles. Nothing is subtracted at all here, because{" "}
            <InlineMath latex="n" /> multiplies the whole of the other side rather than part
            of it.
          </>
        ),
      },
      {
        id: "day",
        leftProse: "What was charged into the crucibles that day?",
        right: "D = n(c + s)",
        leftSpoken: "what was charged into the crucibles that day",
        rightSpoken: "D equals n times, c plus s",
        name: "already pointed the right way",
        why: (
          <>
            The rule was written to answer exactly this, so it needs no work. Every other
            question on the board is the same rule turned to face a different quantity.
          </>
        ),
      },
    ],
    rightOrder: [1, 3, 0, 2],
  },
];

export function FormulaTargetMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs}
      rightOrder={board.rightOrder}
      prompt="Join each question to the version of the rule that answers it."
      conclusion={
        <>
          Four questions, one rule, four different quantities standing alone. Deciding which
          quantity the question wants is what settles the rearrangement, and{" "}
          <InlineMath latex={board.rule} /> answers only the last of the four as it stands.
        </>
      }
      ariaLabel={`Four questions about the rule ${board.spokenRule}, to be matched with four rearrangements of it`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Match a different rule's questions"
    />
  );
}
