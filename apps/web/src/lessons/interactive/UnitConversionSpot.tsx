/**
 * NUM.5 interactive (slide 3): find the line where a conversion factor was written upside
 * down, so the unwanted unit never cancelled.
 *
 * An inverted factor is the whole of unit conversion's difficulty. It is not an arithmetic
 * slip and it does not announce itself: the multiplication is carried out correctly, the
 * digits are right, and the answer is off by a factor of $3600$ with a unit nobody would
 * write down on purpose. Told the rule, a learner still writes the factor whichever way the
 * pair came to mind. Meeting it inside finished work, with the leftover unit sitting in the
 * answer, is what makes the orientation feel like it matters.
 *
 * The corrections are the three ways the factor could be written, so the learner has to
 * choose an orientation rather than notice which option looks tidier.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The amount being converted, in the small unit. */
  amount: number;
  /** Small unit, the one being shed. */
  from: string;
  spokenFrom: string;
  /** Large unit, the one wanted. */
  to: string;
  spokenTo: string;
  /** How many `from` make one `to`. */
  per: number;
}

/** Neither board is the slide's own worked example, $72$ paces into cords of $8$ paces. */
const BOARDS: readonly Board[] = [
  { amount: 150, from: "min", to: "hr", spokenFrom: "minutes", spokenTo: "hours", per: 60 },
  {
    amount: 250,
    from: "cm",
    to: "m",
    spokenFrom: "centimeters",
    spokenTo: "meters",
    per: 100,
  },
];

export function UnitConversionSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { amount, from, to, per } = board;
  const inflated = amount * per;
  const right = amount / per;
  /** The factor as written, upside down: the unit being shed is on top. */
  const upsideDown = `\\dfrac{${per}\\ \\text{${from}}}{1\\ \\text{${to}}}`;
  const correct = `\\dfrac{1\\ \\text{${to}}}{${per}\\ \\text{${from}}}`;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Find the line that let <InlineMath latex={`\\text{${from}}`} /> survive into the
          answer instead of cancelling, then choose the factor that should have been
          multiplied in there.
        </>
      }
      heading={
        <>
          Somebody has converted <InlineMath latex={`${amount}\\ \\text{${from}}`} /> into{" "}
          <InlineMath latex={`\\text{${to}}`} /> and finished with an answer that is not in
          the unit they were asked for. One line is where it went wrong.
        </>
      }
      lines={[
        {
          id: "l1",
          latex: `${amount}\\ \\text{${from}} = ?\\ \\text{${to}}`,
          spoken: `${amount} ${board.spokenFrom} equals how many ${board.spokenTo}`,
          fine: "That is the question copied down, so there is nothing wrong with it yet.",
        },
        {
          id: "l2",
          latex: `${amount}\\ \\text{${from}} \\times ${upsideDown}`,
          spoken: `${amount} ${board.spokenFrom} times ${per} ${board.spokenFrom} per 1 ${board.spokenTo}`,
          wrong: true,
        },
        {
          id: "l3",
          latex: `= \\dfrac{${inflated}\\ \\text{${from}}^{2}}{\\text{${to}}}`,
          spoken: `equals ${inflated} square ${board.spokenFrom} per ${board.spokenTo}`,
          fine: (
            <>
              The multiplication on this line is carried out correctly:{" "}
              <InlineMath latex={`${amount} \\times ${per} = ${inflated}`} />, and the units
              really do pile up that way. The trouble is which factor was multiplied in on
              the line above.
            </>
          ),
        },
      ]}
      corrections={[
        {
          id: "flip",
          latex: correct,
          spoken: `1 ${board.spokenTo} over ${per} ${board.spokenFrom}`,
          correct: true,
        },
        {
          id: "divide-out",
          latex: `\\dfrac{1\\ \\text{${to}}}{${per}\\ \\text{${to}}}`,
          spoken: `1 ${board.spokenTo} over ${per} ${board.spokenTo}`,
          miss: (
            <>
              Both units here are <InlineMath latex={`\\text{${to}}`} />, so this factor is
              just <InlineMath latex={`\\tfrac{1}{${per}}`} /> with nothing to cancel
              against <InlineMath latex={`\\text{${from}}`} />. It gets the arithmetic right
              by accident and leaves the answer labelled{" "}
              <InlineMath latex={`\\text{${from}}`} /> still. A factor has to name both
              units to move between them.
            </>
          ),
        },
        {
          id: "same-way-up",
          latex: `\\dfrac{${per}\\ \\text{${to}}}{1\\ \\text{${from}}}`,
          spoken: `${per} ${board.spokenTo} over 1 ${board.spokenFrom}`,
          miss: (
            <>
              This one cancels the <InlineMath latex={`\\text{${from}}`} /> and does leave{" "}
              <InlineMath latex={`\\text{${to}}`} /> behind, but it is not a true statement:{" "}
              <InlineMath latex={`${per}\\ \\text{${to}}`} /> is not the same amount as{" "}
              <InlineMath latex={`1\\ \\text{${from}}`} />, so the fraction is not equal to{" "}
              <InlineMath latex="1" /> and multiplying by it changes how much there is. It
              would give <InlineMath latex={`${inflated}\\ \\text{${to}}`} />, larger than
              what you started with.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          The factor is upside down. Multiplying <InlineMath latex={`\\text{${from}}`} /> by
          a factor with <InlineMath latex={`\\text{${from}}`} /> on top gives{" "}
          <InlineMath latex={`\\text{${from}}^{2}`} /> per{" "}
          <InlineMath latex={`\\text{${to}}`} />, so the unit that was supposed to disappear
          is doubled instead. Nothing cancels, and the leftover units in the answer are the
          signal that the orientation was wrong.
        </>
      }
      remedy={
        <>
          A unit cancels only when it appears on the bottom of the factor, so the unit you
          are shedding goes underneath and the unit you want goes on top:{" "}
          <InlineMath latex={correct} />. That fraction is also equal to{" "}
          <InlineMath latex="1" />, since <InlineMath latex={`1\\ \\text{${to}}`} /> and{" "}
          <InlineMath latex={`${per}\\ \\text{${from}}`} /> are the same amount, which is
          why multiplying by it may change the unit without changing how much there is.
        </>
      }
      findPrompt="Tap the first line that does not follow."
      fixPrompt="Now pick the factor that should have been written there instead."
      conclusion={
        <>
          With the factor the right way up, the <InlineMath latex={`\\text{${from}}`} /> on
          top cancels the <InlineMath latex={`\\text{${from}}`} /> underneath and{" "}
          <InlineMath latex={`${amount} \\div ${per} = ${right}\\ \\text{${to}}`} /> is
          left. Which unit ends up in the answer is decided entirely by which way up the
          factor is written.
        </>
      }
      ariaLabel={`Three lines of work converting ${amount} ${board.spokenFrom} into ${board.spokenTo}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different conversion"
    />
  );
}
