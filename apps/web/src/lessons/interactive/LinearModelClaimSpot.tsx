/**
 * LF.3 interactive (slide 2): find where a model put the two numbers the wrong way round.
 *
 * Swapping the rate and the starting value is the misreading this node exists to prevent, and
 * it is not caught by being told which is which: both numbers are in the description, both are
 * in the model, and the model looks finished either way. What exposes it is a prediction. Met
 * inside somebody else's work, with a value substituted and an answer that is plainly too
 * large, the swap is visible before anybody names it.
 *
 * The replacements are the three models a learner actually writes from a description like this
 * one: the two numbers in their proper places, the two added into a single rate, and the
 * one-off amount charged as though it were taken away.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The one-off amount, and the amount charged again for each unit of input. */
  fee: number;
  rate: number;
  /** The input, singular and plural, and how many of them the prediction uses. */
  unit: string;
  units: string;
  at: number;
  /** The description, as the work's first line, and how a screen reader says it. */
  description: string;
  spokenDescription: string;
  /** What the output is, e.g. "the bill in dollars". */
  output: string;
}

const BOARDS: readonly Board[] = [
  {
    fee: 45,
    rate: 12,
    unit: "hour",
    units: "hours",
    at: 3,
    description:
      "\\text{A repair shop charges } \\$45 \\text{ to come out, then } \\$12 \\text{ per hour of labor.}",
    spokenDescription:
      "A repair shop charges 45 dollars to come out, then 12 dollars per hour of labor",
    output: "the bill in dollars",
  },
  {
    fee: 30,
    rate: 18,
    unit: "month",
    units: "months",
    at: 4,
    description:
      "\\text{A gym charges } \\$30 \\text{ to join, then } \\$18 \\text{ each month.}",
    spokenDescription: "A gym charges 30 dollars to join, then 18 dollars each month",
    output: "the total paid in dollars",
  },
];

export function LinearModelClaimSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { fee, rate, at, unit, units } = board;
  const swapped = `y = ${fee}x + ${rate}`;
  const right = `y = ${rate}x + ${fee}`;
  const theirTotal = fee * at + rate;
  const trueTotal = rate * at + fee;
  const rolled = fee + rate;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Find the line that stops saying what the situation at the top says, then choose
          the model that would have said it.
        </>
      }
      heading={
        <>
          Somebody has modelled this situation and used their model to work out{" "}
          <InlineMath latex={`${at}`} /> {units}. Their answer,{" "}
          <InlineMath latex={`\\$${theirTotal}`} />, is far more than the situation allows.
          One line is where it went wrong.
        </>
      }
      lines={[
        {
          id: "l1",
          latex: board.description,
          spoken: board.spokenDescription,
          fine: "That is the situation as described, so there is nothing wrong with it yet.",
        },
        {
          id: "l2",
          latex: swapped,
          spoken: `y equals ${fee}x plus ${rate}`,
          wrong: true,
        },
        {
          id: "l3",
          latex: `y = ${fee}(${at}) + ${rate} = ${theirTotal}`,
          spoken: `y equals ${fee} times ${at} plus ${rate}, which is ${theirTotal}`,
          fine: (
            <>
              The substitution and the arithmetic on this line are both done correctly:{" "}
              <InlineMath latex={`${fee} \\times ${at} = ${fee * at}`} />. The trouble is
              the model it was substituted into.
            </>
          ),
        },
      ]}
      corrections={[
        {
          id: "unswapped",
          latex: right,
          spoken: `y equals ${rate}x plus ${fee}`,
          correct: true,
        },
        {
          id: "rolled",
          latex: `y = ${rolled}x`,
          spoken: `y equals ${rolled}x`,
          miss: (
            <>
              Adding the two numbers together makes the one-off amount repeat as well. This
              model charges <InlineMath latex={`\\$${rolled}`} /> for every {unit}, so by{" "}
              <InlineMath latex={`${at}`} /> {units} it has collected the{" "}
              <InlineMath latex={`\\$${fee}`} /> <InlineMath latex={`${at}`} /> times over.
              Only one of the two numbers belongs on <InlineMath latex="x" />.
            </>
          ),
        },
        {
          id: "subtracted",
          latex: `y = ${rate}x - ${fee}`,
          spoken: `y equals ${rate}x minus ${fee}`,
          miss: (
            <>
              The rate is in the right place, but the sign is not. Nothing here is being
              taken away: the <InlineMath latex={`\\$${fee}`} /> is charged before any{" "}
              {units} are counted, so it is what the total already is at{" "}
              <InlineMath latex="x = 0" />. As written, this model owes money at the start.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          The two numbers are the wrong way round. Whichever number multiplies{" "}
          <InlineMath latex="x" /> is charged again for every {unit}, and that is the{" "}
          <InlineMath latex={`\\$${rate}`} />, not the <InlineMath latex={`\\$${fee}`} />.
          The swap makes the one-off amount repeat and the repeating amount happen once.
        </>
      }
      remedy={
        <>
          <InlineMath latex={right} />, where <InlineMath latex={`${rate}`} /> is measured
          in dollars per {unit} and <InlineMath latex={`${fee}`} /> in dollars alone. Those
          units are what tell the two apart: a rate is always an output unit PER input unit,
          and a starting value is the output when the input is zero.
        </>
      }
      findPrompt="Tap the first line that does not follow."
      fixPrompt="Now pick the model that should have been written there instead."
      conclusion={
        <>
          At <InlineMath latex={`${at}`} /> {units} the correct model gives{" "}
          <InlineMath latex={`${rate}(${at}) + ${fee} = ${trueTotal}`} />, not{" "}
          <InlineMath latex={`${theirTotal}`} />. Reading a model back in words, with its
          units attached, is what catches the swap before a prediction is made from it.
        </>
      }
      ariaLabel={`Three lines of work modelling a situation where ${board.output} starts at ${fee} dollars and rises by ${rate} dollars per ${unit}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different situation"
    />
  );
}
