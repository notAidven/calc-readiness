/**
 * LIN.4 slide 3: does this rule leave one band or two?
 *
 * The slide says the joining word decides the shape of the answer. That is a claim about a whole
 * class of rules, so the board is a set of them: four stated rules, and for each one the call is
 * whether the weights satisfying it form a single stretch of the scale or two separated ones.
 * Making the call four times is what turns "and gives one, or gives two" from a sentence into
 * something the learner can apply to a rule they have not seen.
 *
 * Two of the four rules are stated in words and two in symbols, so the call cannot be made by
 * looking for the word "and". One of them is an OR whose two stretches OVERLAP, which is the case
 * the slogan gets wrong: an or can still be one band when the two conditions meet.
 *
 * Built on `BinaryRowSort`, which owns the mechanic, the marks on a settled row and the board's
 * one reveal. Read that file for why a settled row keeps both of its options.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["One band", "Two separated bands"] as const;

/**
 * Every rule on this board is TWO comparisons with a joining word. Written as parts rather than
 * as one LaTeX string, each of those joins is a place the browser may end a line, which is what
 * lets the first column narrow on a phone: see `RowLatex` in `BinaryRowSort` for why a single
 * KaTeX span cannot.
 *
 * The join stays typeset — `\text{and}` rather than the word in prose — so nothing about how a
 * rule reads changes. Only where it is allowed to wrap does.
 */
const BOARDS: readonly (readonly BinaryRow[])[] = [
  [
    {
      id: "and-charcoal",
      latex: "8 \\le w \\le 21",
      spoken: "w is at least 8 and at most 21",
      first: true,
      note: "Both limits have to hold at once, so only the weights between them qualify.",
      why: (
        <>
          A weight has to clear <InlineMath latex="8" /> AND stay under{" "}
          <InlineMath latex="21" />, so the qualifying weights are exactly the ones in the
          overlap. One stretch, written <InlineMath latex="[8, 21]" />.
        </>
      ),
    },
    {
      id: "or-split",
      latex: ["w < 6", "\\text{or}", "w > 19"],
      spoken: "w is less than 6 or greater than 19",
      first: false,
      note: "Nothing between 6 and 19 satisfies either half, so the two stretches do not touch.",
      why: (
        <>
          A weight qualifies by being under <InlineMath latex="6" /> or over{" "}
          <InlineMath latex="19" />, and everything in between fails both halves. The gap is
          what makes this two bands rather than one, and the union symbol is what joins
          them: <InlineMath latex="(-\infty, 6) \cup (19, \infty)" />.
        </>
      ),
    },
    {
      id: "or-overlap",
      latex: ["w > 4", "\\text{or}", "w > 12"],
      spoken: "w is greater than 4 or greater than 12",
      first: true,
      note: "Everything over 12 is already over 4, so the second half adds nothing.",
      why: (
        <>
          These two stretches are not separated, they are nested: every weight over{" "}
          <InlineMath latex="12" /> is already over <InlineMath latex="4" />, so the pair of
          them covers exactly <InlineMath latex="(4, \infty)" />. An OR gives two bands only
          when its two stretches fail to meet, which is why the word alone does not settle
          the shape.
        </>
      ),
    },
    {
      id: "and-store",
      latex: ["w \\ge 15", "\\text{and}", "w \\le 15"],
      spoken: "w is at least 15 and at most 15",
      first: true,
      note: "Both limits meet at one weight, so the band has shrunk to a single value.",
      why: (
        <>
          The two limits leave exactly one weight satisfying both, which is still a single
          stretch of the scale rather than two: the band <InlineMath latex="[15, 15]" /> has
          simply closed up on <InlineMath latex="15" />. An AND can narrow to a point and it
          can empty out altogether, and neither of those makes it two bands.
        </>
      ),
    },
  ],
  [
    {
      id: "or-gate",
      latex: ["w \\le 9", "\\text{or}", "w \\ge 26"],
      spoken: "w is at most 9 or at least 26",
      first: false,
      note: "The weights from 10 to 25 satisfy neither half, so the two stretches are separated.",
      why: (
        <>
          Everything from <InlineMath latex="10" /> to <InlineMath latex="25" /> fails both
          halves, so there is a genuine gap in the middle and no one interval covers the
          answer: <InlineMath latex="(-\infty, 9] \cup [26, \infty)" />. Both ends are
          closed here, which changes the brackets and not the shape.
        </>
      ),
    },
    {
      id: "and-bay",
      latex: "12 < w < 30",
      spoken: "w is greater than 12 and less than 30",
      first: true,
      note: "The two limits hold at once, so the answer is the stretch between them.",
      why: (
        <>
          Written on one line like this the rule is two conditions joined by AND, and the
          weights meeting both are the ones strictly between the limits:{" "}
          <InlineMath latex="(12, 30)" />. One band, with both ends left out.
        </>
      ),
    },
    {
      id: "or-touch",
      latex: ["w < 14", "\\text{or}", "w \\ge 14"],
      spoken: "w is less than 14 or at least 14",
      first: true,
      note: "Every weight satisfies one half or the other, so nothing is left out.",
      why: (
        <>
          The two stretches meet exactly at <InlineMath latex="14" />, which the second half
          takes in, so between them they cover the whole scale with no gap. That is one
          band, <InlineMath latex="(-\infty, \infty)" />, and it happens to be all of it.
        </>
      ),
    },
    {
      id: "and-narrow",
      latex: ["w \\ge 7", "\\text{and}", "w \\le 22"],
      spoken: "w is at least 7 and at most 22",
      first: true,
      note: "Both limits have to hold, so the answer is the overlap and nothing outside it.",
      why: (
        <>
          Two limits, both of which have to hold, so the qualifying weights are the overlap:{" "}
          <InlineMath latex="[7, 22]" />. Both ends are taken in, because both signs are the
          at-least and at-most kind.
        </>
      ),
    },
  ],
];

export function CompoundBandSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const rows = BOARDS[variant.index] ?? (BOARDS[0] as readonly BinaryRow[]);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective="Decide for each of these four rules whether the weights satisfying it form one stretch of the scale or two separated ones."
      options={CALLS}
      rows={rows}
      prompt="Work out which weights satisfy each rule, then say whether they sit in one stretch or in two with a gap between them."
      conclusion="An and asks for both conditions at once, so it leaves the overlap: one band. An or accepts either, so it leaves two bands whenever the two stretches fail to meet, and one band whenever they do."
      missedNote="That is all four called, so you are good to carry on. Every row you missed says why just underneath it, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New set of four rules"
      missedRestartLabel="Try a fresh set"
    />
  );
}
