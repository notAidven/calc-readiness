/**
 * TRG.2 slide 2: the special angles, joined to the exact values they take.
 *
 * `MatchPairs` is the shape because this is a correspondence, and because on this content the
 * distractors do work no separate question could. Three of the four values on a board are the
 * three a learner mixes up (half, a root over two, and the OTHER root over two), and they are
 * the same three on both boards; only the tangent's value changes between them. Offering them
 * side by side means a wrong join costs two pairs rather than one, so the board cannot be
 * finished by recognising a single value.
 *
 * Every pair carries the name of the triangle it is read off, and the two boards are split on
 * exactly that line: the half-square gives the $45^{\circ}$ values and the half-equilateral
 * gives the $30^{\circ}$ and $60^{\circ}$ ones. Naming it as the join lands is what turns this
 * from a memory table into two pictures, which is the difference between a learner who has
 * forgotten one value and a learner who can rebuild it.
 *
 * **The second board is the first board's cofunction partners.** Every angle on board one is
 * replaced by its complement with the ratio switched, so `\sin 30^{\circ}` becomes
 * `\cos 60^{\circ}` and lands on the same value. A learner who meets both boards has met the
 * next slide's idea as a pattern in the values before it is stated as a rule, and a learner
 * who memorised board one by position is given nothing by it.
 *
 * Neither board offers `\tan 45^{\circ}`. Its value is a bare $1$, the one value on this node
 * with no form to get right, so it takes a slot on a four-pair board and teaches nothing the
 * other three do not.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  pairs: readonly MatchPair[];
  /** A derangement: no right item is dealt against the left item it belongs to. */
  rightOrder: readonly number[];
}

const HALF_SQUARE = "half-square triangle";
const HALF_EQUILATERAL = "half-equilateral triangle";

/** Counts said in words, so the closing line can name one without printing a numeral. */
const IN_WORDS = ["no", "one", "two", "three", "four", "five", "six"] as const;

/** How many DIFFERENT exact values a board serves, counted off the board rather than stated. */
function distinctValues(board: Board): string {
  const count = new Set(board.pairs.map((pair) => pair.right)).size;
  return IN_WORDS[count] ?? `${count}`;
}

const BOARDS: readonly Board[] = [
  {
    pairs: [
      {
        id: "b0-p0",
        left: "\\sin 30^{\\circ}",
        right: "\\dfrac{1}{2}",
        leftSpoken: "sine of 30 degrees",
        rightSpoken: "one half",
        name: HALF_EQUILATERAL,
        why: (
          <>
            Cut an equilateral triangle of side <InlineMath latex="2" /> down the middle and
            the short leg is <InlineMath latex="1" />, sitting opposite the{" "}
            <InlineMath latex="30^{\circ}" />, with the hypotenuse still{" "}
            <InlineMath latex="2" />. Opposite over hypotenuse is{" "}
            <InlineMath latex="\dfrac{1}{2}" />, and it is the one special value with no
            root in it at all.
          </>
        ),
      },
      {
        id: "b0-p1",
        left: "\\cos 30^{\\circ}",
        right: "\\dfrac{\\sqrt{3}}{2}",
        leftSpoken: "cosine of 30 degrees",
        rightSpoken: "root 3 over 2",
        name: HALF_EQUILATERAL,
        why: (
          <>
            The same half-equilateral triangle. The leg beside the{" "}
            <InlineMath latex="30^{\circ}" /> is the long one, and the Pythagorean theorem
            gives it as <InlineMath latex="\sqrt{2^{2} - 1^{2}} = \sqrt{3}" />. Over the
            hypotenuse that is <InlineMath latex="\dfrac{\sqrt{3}}{2}" />, which is close to{" "}
            <InlineMath latex="1" /> because a small angle leans its wire almost flat.
          </>
        ),
      },
      {
        id: "b0-p2",
        left: "\\sin 45^{\\circ}",
        right: "\\dfrac{\\sqrt{2}}{2}",
        leftSpoken: "sine of 45 degrees",
        rightSpoken: "root 2 over 2",
        name: HALF_SQUARE,
        why: (
          <>
            Half a square along its diagonal gives two equal legs, so take each as{" "}
            <InlineMath latex="1" /> and the hypotenuse is <InlineMath latex="\sqrt{2}" />.
            That reads <InlineMath latex="\dfrac{1}{\sqrt{2}}" />, and a root is not left
            underneath: multiplying above and below by <InlineMath latex="\sqrt{2}" /> gives{" "}
            <InlineMath latex="\dfrac{\sqrt{2}}{2}" />.
          </>
        ),
      },
      {
        id: "b0-p3",
        left: "\\tan 60^{\\circ}",
        right: "\\sqrt{3}",
        leftSpoken: "tangent of 60 degrees",
        rightSpoken: "root 3",
        name: HALF_EQUILATERAL,
        why: (
          <>
            A tangent leaves the hypotenuse out, so this is the long leg over the short one:{" "}
            <InlineMath latex="\dfrac{\sqrt{3}}{1}" />, which is just{" "}
            <InlineMath latex="\sqrt{3}" />. It is the only value on the board above{" "}
            <InlineMath latex="1" />, and it has to be, because at{" "}
            <InlineMath latex="60^{\circ}" /> the mast is taller than the deck run is long.
          </>
        ),
      },
    ],
    rightOrder: [2, 3, 1, 0],
  },
  {
    pairs: [
      {
        id: "b1-p0",
        left: "\\cos 60^{\\circ}",
        right: "\\dfrac{1}{2}",
        leftSpoken: "cosine of 60 degrees",
        rightSpoken: "one half",
        name: HALF_EQUILATERAL,
        why: (
          <>
            Read the half-equilateral triangle from its other corner. The leg beside the{" "}
            <InlineMath latex="60^{\circ}" /> is the short one, <InlineMath latex="1" />,
            over a hypotenuse of <InlineMath latex="2" />. It lands on the same{" "}
            <InlineMath latex="\dfrac{1}{2}" /> that <InlineMath latex="\sin 30^{\circ}" />{" "}
            gave, and the two angles add to <InlineMath latex="90^{\circ}" />.
          </>
        ),
      },
      {
        id: "b1-p1",
        left: "\\sin 60^{\\circ}",
        right: "\\dfrac{\\sqrt{3}}{2}",
        leftSpoken: "sine of 60 degrees",
        rightSpoken: "root 3 over 2",
        name: HALF_EQUILATERAL,
        why: (
          <>
            From the <InlineMath latex="60^{\circ}" /> corner the long leg is the opposite
            one, so this is <InlineMath latex="\dfrac{\sqrt{3}}{2}" />. The two legs traded
            places when the corner moved, which is why this is a sine here and was a cosine
            at <InlineMath latex="30^{\circ}" />.
          </>
        ),
      },
      {
        id: "b1-p2",
        left: "\\cos 45^{\\circ}",
        right: "\\dfrac{\\sqrt{2}}{2}",
        leftSpoken: "cosine of 45 degrees",
        rightSpoken: "root 2 over 2",
        name: HALF_SQUARE,
        why: (
          <>
            The half-square has two equal legs, so it makes no difference which of them is
            opposite and which is adjacent: the sine and the cosine of{" "}
            <InlineMath latex="45^{\circ}" /> are the same number. That is the one angle
            that is its own complement.
          </>
        ),
      },
      {
        id: "b1-p3",
        left: "\\tan 30^{\\circ}",
        right: "\\dfrac{\\sqrt{3}}{3}",
        leftSpoken: "tangent of 30 degrees",
        rightSpoken: "root 3 over 3",
        name: HALF_EQUILATERAL,
        why: (
          <>
            Opposite over adjacent from the <InlineMath latex="30^{\circ}" /> corner is{" "}
            <InlineMath latex="\dfrac{1}{\sqrt{3}}" />, which leaves a root underneath.
            Multiplying above and below by <InlineMath latex="\sqrt{3}" /> gives{" "}
            <InlineMath latex="\dfrac{\sqrt{3}}{3}" />. The value is well below{" "}
            <InlineMath latex="1" />, the reciprocal of{" "}
            <InlineMath latex="\tan 60^{\circ}" />.
          </>
        ),
      },
    ],
    rightOrder: [1, 2, 3, 0],
  },
];

export function TrigSpecialMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs}
      rightOrder={board.rightOrder}
      objective="Goal: join each special angle to its exact value, and read off which of the two reference triangles each one comes from."
      prompt="Pick up a ratio on the left and join it to the exact value it takes. Rebuild the reference triangle rather than reaching for a remembered list."
      conclusion={
        <>
          Every pair joined, and {distinctValues(board)} different values did the whole
          board. Two triangles produce all of them: half a square gives the{" "}
          <InlineMath latex="45^{\circ}" /> values, and half an equilateral triangle gives
          the <InlineMath latex="30^{\circ}" /> and <InlineMath latex="60^{\circ}" /> ones.
          A special angle is one you can draw from memory, which is what makes its value
          exact rather than a reading off a calculator.
        </>
      }
      ariaLabel="Four special-angle ratios on the left, to be joined to the exact values on the right"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on the complementary angles"
    />
  );
}
