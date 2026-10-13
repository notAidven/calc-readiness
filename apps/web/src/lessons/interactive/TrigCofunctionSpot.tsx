/**
 * TRG.2 slide 3: the cofunction relation, and the two ways the angle in it goes wrong.
 *
 * `SpotTheError` is the shape because both of these mistakes survive being told about them.
 * The rule is easy to state and easy to nod along to, and a learner will then write
 * $\sin 18^{\circ} = \cos 18^{\circ}$ anyway, because "a sine is a cosine" is what they
 * carried away from the sentence. Meeting the wrong move already made, in work whose earlier
 * lines are all correct, is the only way to reach a reading that a correct statement of the
 * rule does not disturb.
 *
 * The two boards are the two distinct failures rather than one failure twice:
 *
 *  - **Board one keeps the angle.** Every line of reasoning above it is right, and the last
 *    line drops the part that does the work. The ratio changed and the ANGLE did not.
 *  - **Board two moves the angle to the wrong partner**, taking the supplement instead of the
 *    complement. That one is not a slip: $180^{\circ}$ is the total a learner has been
 *    subtracting from since the angles of a triangle, and a right angle is the newer habit.
 *
 * Their corrections are chosen the same way. Every wrong replacement is a real half-learned
 * version of the rule rather than a shape nobody would write. Board one offers the angle moved
 * without the ratio, and the flagged claim written backwards; board two offers the complement
 * ADDED to the right angle instead of taken from it, and a partner reached for by doubling.
 *
 * Neither board uses $25^{\circ}$, which is the pair worked in the dialogue, and the practice
 * template excludes both of these pairs along with that one, so a learner never meets an
 * instance whose answer was on screen a moment earlier.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type Correction, SpotTheError, type WorkedLine } from "./kinds/SpotTheError";

interface Board {
  heading: ReactNode;
  lines: readonly WorkedLine[];
  corrections: readonly Correction[];
  diagnosis: ReactNode;
  remedy: ReactNode;
  conclusion: ReactNode;
  ariaLabel: string;
}

const BOARDS: readonly Board[] = [
  {
    heading: (
      <>
        Somebody was asked which cosine equals <InlineMath latex="\sin 18^{\circ}" /> and
        wrote this.
      </>
    ),
    lines: [
      {
        id: "b0-l0",
        latex: "\\text{The two acute angles are complementary}",
        spoken: "the two acute angles are complementary",
        fine: "That line is right: the right angle takes 90 degrees of the triangle's total, so the other two share what is left.",
      },
      {
        id: "b0-l1",
        latex: "\\text{Moving corner swaps opposite and adjacent}",
        spoken: "moving corner swaps opposite and adjacent",
        fine: "That line is right: the leg across from one acute angle is the leg beside the other one, so the two names trade places.",
      },
      {
        id: "b0-l2",
        latex: "\\text{So a sine reads as a cosine}",
        spoken: "so a sine reads as a cosine",
        fine: "That line is right: swapping opposite with adjacent is exactly the difference between the sine and the cosine, so the two ratios change places.",
      },
      {
        id: "b0-l3",
        latex: "\\sin 18^{\\circ} = \\cos 18^{\\circ}",
        spoken: "sine of 18 degrees equals cosine of 18 degrees",
        wrong: true,
      },
    ],
    corrections: [
      {
        id: "b0-c0",
        latex: "\\sin 18^{\\circ} = \\cos 72^{\\circ}",
        spoken: "sine of 18 degrees equals cosine of 72 degrees",
        correct: true,
      },
      {
        id: "b0-c1",
        latex: "\\sin 18^{\\circ} = \\sin 72^{\\circ}",
        spoken: "sine of 18 degrees equals sine of 72 degrees",
        miss: (
          <>
            The angle moved to the other corner, which is right, and the ratio stayed a
            sine, which is not. Both change together or neither does: standing at the other
            corner swaps which leg is opposite, so the ratio that was reading the opposite
            side is now reading the adjacent one.
          </>
        ),
      },
      {
        id: "b0-c2",
        latex: "\\cos 18^{\\circ} = \\sin 18^{\\circ}",
        spoken: "cosine of 18 degrees equals sine of 18 degrees",
        miss: (
          <>
            That is the same claim with the two sides of the equation exchanged, so it is
            wrong for the same reason. At <InlineMath latex="18^{\circ}" /> the opposite leg
            is much the shorter of the two, so its sine and its cosine are nowhere near each
            other.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The ratio was changed and the angle was left where it was. A sine does read as a
        cosine, but only once you have MOVED to the other corner, and the other corner is a
        different angle: <InlineMath latex="90^{\circ} - 18^{\circ}" />.
      </>
    ),
    remedy: (
      <>
        <InlineMath latex="\sin 18^{\circ} = \cos 72^{\circ}" />, because{" "}
        <InlineMath latex="18^{\circ}" /> and <InlineMath latex="72^{\circ}" /> are the two
        acute angles of one right triangle and the leg opposite the first is the leg beside
        the second. Both halves move together: the ratio and the angle.
      </>
    ),
    conclusion: (
      <>
        <InlineMath latex="\sin \theta = \cos(90^{\circ} - \theta)" />. The two ratios are
        called cofunctions because each one reads at an angle what the other reads at its
        complement, and the angles have to be complementary for that to hold. The two are
        equal only where the angle is its own complement, at{" "}
        <InlineMath latex="45^{\circ}" />.
      </>
    ),
    ariaLabel:
      "Four lines of work finding which cosine equals the sine of 18 degrees, one of which does not follow",
  },
  {
    heading: (
      <>
        Somebody was asked which sine equals <InlineMath latex="\cos 37^{\circ}" /> and
        wrote this.
      </>
    ),
    lines: [
      {
        id: "b1-l0",
        latex: "\\text{A cosine reads as a sine at the other corner}",
        spoken: "a cosine reads as a sine at the other corner",
        fine: "That line is right: moving to the other acute angle swaps the two legs, which is what turns a cosine into a sine.",
      },
      {
        id: "b1-l1",
        latex: "\\text{So the angle becomes } 180^{\\circ} - 37^{\\circ}",
        spoken: "so the angle becomes 180 degrees minus 37 degrees",
        wrong: true,
      },
      {
        id: "b1-l2",
        latex: "\\cos 37^{\\circ} = \\sin 143^{\\circ}",
        spoken: "cosine of 37 degrees equals sine of 143 degrees",
        fine: "That line follows correctly from the one above it, which is why it is not where the work first goes wrong.",
      },
    ],
    corrections: [
      {
        id: "b1-c0",
        latex: "\\text{So the angle becomes } 90^{\\circ} - 37^{\\circ}",
        spoken: "so the angle becomes 90 degrees minus 37 degrees",
        correct: true,
      },
      {
        id: "b1-c1",
        latex: "\\text{So the angle becomes } 90^{\\circ} + 37^{\\circ}",
        spoken: "so the angle becomes 90 degrees plus 37 degrees",
        miss: (
          <>
            That is <InlineMath latex="127^{\circ}" />, which is not acute and so cannot be
            a corner of a right triangle at all. The complement is what is LEFT of the right
            angle, so it is always smaller than <InlineMath latex="90^{\circ}" />.
          </>
        ),
      },
      {
        id: "b1-c2",
        latex: "\\text{So the angle becomes } 2 \\times 37^{\\circ}",
        spoken: "so the angle becomes 2 times 37 degrees",
        miss: (
          <>
            Doubling happens to land near the right answer here and misses it by{" "}
            <InlineMath latex="21^{\circ}" />, and at <InlineMath latex="\cos 20^{\circ}" />{" "}
            it would be out by <InlineMath latex="30^{\circ}" />. Two angles are
            complementary when they ADD to a right angle, which fixes the partner by
            subtraction and not by any multiple.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        Complementary angles fill a RIGHT angle, not a straight one. Two angles of a
        triangle add to <InlineMath latex="180^{\circ}" /> only when the third is counted
        too, and here the third is the right angle, which has already taken{" "}
        <InlineMath latex="90^{\circ}" /> of that total.
      </>
    ),
    remedy: (
      <>
        With <InlineMath latex="90^{\circ} - 37^{\circ}" /> the partner is{" "}
        <InlineMath latex="53^{\circ}" />, so{" "}
        <InlineMath latex="\cos 37^{\circ} = \sin 53^{\circ}" />. Both angles are acute, as
        the two corners of a right triangle have to be.
      </>
    ),
    conclusion: (
      <>
        <InlineMath latex="\cos \theta = \sin(90^{\circ} - \theta)" />. The complement is
        what is left of a right angle, so it is always between{" "}
        <InlineMath latex="0^{\circ}" /> and <InlineMath latex="90^{\circ}" />. An answer
        above <InlineMath latex="90^{\circ}" /> is a signal that the wrong total was
        subtracted from.
      </>
    ),
    ariaLabel:
      "Three lines of work finding which sine equals the cosine of 37 degrees, one of which does not follow",
  },
];

export function TrigCofunctionSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <SpotTheError
      key={variant.nonce}
      objective="Goal: find the first line of this work that does not follow from the one above it, then choose the line that belongs there instead."
      heading={board.heading}
      lines={board.lines}
      corrections={board.corrections}
      diagnosis={board.diagnosis}
      remedy={board.remedy}
      findPrompt="One line of this work does not follow. Tap the first one that fails."
      fixPrompt="Now choose what that line should say."
      conclusion={board.conclusion}
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different pair of angles"
    />
  );
}
