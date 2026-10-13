/**
 * TRG.2 slide 0: the three sides of a right triangle, and the name each one goes by from a
 * particular corner.
 *
 * `LabelParts` is the shape because this is a CORRESPONDENCE and not a procedure: nothing is
 * computed here, and the whole content of the slide is which length answers to which word.
 * That vocabulary is what the rest of the node runs on, and a learner who has the arithmetic
 * without it cannot begin, because every ratio on every later slide is stated in these three
 * words and in no other terms.
 *
 * **The two boards move the angle rather than the numbers**, and that is the point of having
 * two. The hypotenuse is fixed by the right angle and never moves, but "opposite" and
 * "adjacent" belong to the corner you are standing at, so the same mast is the opposite side
 * seen from the anchor pad and the adjacent one seen from the masthead. A pair of boards that
 * only redrew the lengths would let a learner answer the second from a picture memorised off
 * the first, which is exactly the reading this slide has to break: those two words describe a
 * RELATIONSHIP to an angle, not a position in a diagram.
 *
 * `labelPartsDeal` deals the names in a derangement, so no name is ever offered against the
 * slot it belongs to, and `LabelParts` passes its own live `othersRemain`, so being told one
 * name hands the figure back with the other two still to place.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type FigurePart, LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Board {
  /**
   * WHERE THE MARKED ANGLE STANDS, which is the whole difference between the two boards.
   *
   * It is prose above the figure rather than the figure's own `lead`, for a reason that is
   * measured rather than stylistic. A lead is LaTeX, and `\theta \text{ at the anchor pad:}`
   * came to 220.5px beside a 322.9px row of terms: 547.4px of the 434px a 460px card leaves,
   * so the statement broke between its lead and its terms and the corner was read a whole line
   * above the blanks it belonged to. Breaking there is the authored degradation for a phone,
   * not for a card with room to spare, and no width would have fixed it — three sides named in
   * words are already 322.9px, so any lead at all is over budget. The corner is a fact about
   * the scene rather than a term in an expression, so it reads as prose, where it can wrap.
   */
  objective: string;
  parts: readonly FigurePart[];
  /** The closing sentence, which names what the corner decided. */
  conclusion: string;
  ariaLabel: string;
}

/** The mast, the deck run and the wire, at the two corners a learner can stand at. */
const BOARDS: readonly Board[] = [
  {
    objective:
      "The angle is marked at the anchor pad. Goal: give each of the three lengths the name it goes by from that corner, so that a ratio naming two sides can be read straight off the triangle.",
    parts: [
      {
        id: "b0-mast",
        latex: "\\text{mast } 12",
        name: "opposite",
        spoken: "the mast, 12 meters",
        why: (
          <>
            Standing at the pad, the mast is the side you are not touching: it is right
            across the triangle from <InlineMath latex="\theta" />. A side across from an
            angle is that angle&apos;s opposite side.
          </>
        ),
      },
      {
        id: "b0-run",
        latex: "\\text{deck run } 16",
        name: "adjacent",
        before: ",",
        spoken: "the deck run, 16 meters",
        why: (
          <>
            The deck run is one of the two sides meeting at <InlineMath latex="\theta" />,
            and the other one is the wire. The wire is already spoken for as the hypotenuse,
            so the adjacent side is the one that is left: the deck run.
          </>
        ),
      },
      {
        id: "b0-wire",
        latex: "\\text{wire } 20",
        name: "hypotenuse",
        before: ",",
        spoken: "the wire, 20 meters",
        why: (
          <>
            The right angle is at the foot of the mast, and the wire is the side across from
            it. The side opposite the right angle is the hypotenuse, and it is the longest
            of the three: <InlineMath latex="20" /> against <InlineMath latex="16" /> and{" "}
            <InlineMath latex="12" />.
          </>
        ),
      },
    ],
    conclusion:
      "From the pad, the mast is across the triangle and the deck run is underfoot. The wire is the hypotenuse from either corner, because it is the right angle that fixes it.",
    ariaLabel:
      "A guy wire triangle with the angle theta at the anchor pad, whose mast, deck run and wire are to be named",
  },
  {
    objective:
      "The angle has moved to the masthead. Goal: give each of the three lengths the name it goes by from that corner, so that a ratio naming two sides can be read straight off the triangle.",
    parts: [
      {
        id: "b1-mast",
        latex: "\\text{mast } 12",
        name: "adjacent",
        spoken: "the mast, 12 meters",
        why: (
          <>
            The angle has moved to the top of the mast, so the mast is now one of the two
            sides meeting at <InlineMath latex="\theta" />. The other one is the wire, which
            is the hypotenuse, so the mast is the adjacent side. It was the opposite side
            from the pad, and nothing about the mast changed: the corner did.
          </>
        ),
      },
      {
        id: "b1-run",
        latex: "\\text{deck run } 16",
        name: "opposite",
        before: ",",
        spoken: "the deck run, 16 meters",
        why: (
          <>
            From the masthead the deck run is the side you are not touching, right across
            the triangle from <InlineMath latex="\theta" />. So it is the opposite side
            here, having been the adjacent one from the pad.
          </>
        ),
      },
      {
        id: "b1-wire",
        latex: "\\text{wire } 20",
        name: "hypotenuse",
        before: ",",
        spoken: "the wire, 20 meters",
        why: (
          <>
            The right angle is still at the foot of the mast and the wire is still across
            from it, so the wire is the hypotenuse from this corner too. It is the one name
            of the three that does not depend on which angle you stand at.
          </>
        ),
      },
    ],
    conclusion:
      "Two of the three names changed hands, and not one length did. Opposite and adjacent belong to the corner you are standing at, so naming the angle has to come before naming the sides.",
    ariaLabel:
      "The same guy wire triangle with the angle theta at the masthead, whose mast, deck run and wire are to be named",
  },
];

export function TrigGuyWireLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <LabelParts
      key={variant.nonce}
      parts={board.parts}
      dealt={labelPartsDeal(board.parts.length, variant.index)}
      objective={board.objective}
      prompt="Drag each name into the box above the length it belongs to, or tap a name and then tap its box."
      conclusion={board.conclusion}
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over from the other corner"
    />
  );
}
