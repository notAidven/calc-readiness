/**
 * LIN.1 slide 3: the check is what finds the slip, so the slip is what the board holds.
 *
 * The slide's claim is that substituting a value back is cheap and catches mistakes. A board
 * that simply asked the learner to substitute would prove the arithmetic and not the claim, so
 * this hands over a finished piece of work whose answer fails its own check, and the learner
 * has to find the line where it went wrong.
 *
 * Both boards fail in the way the slide names rather than in a novel way: the first divides
 * before the added number has come off, and the second takes a number off one pan only. The
 * replacements on offer include one that repeats that same shape of mistake somewhere else and
 * one that moves the number the wrong way, so recognising the shape of the error is not enough
 * on its own.
 *
 * THE CLAIMED ANSWER IS THE BOARD'S OWN, NOT THE EQUATION'S. `claimed` heads the work with the
 * value the corrupted chain actually reaches, which is the value that fails when it is
 * substituted back; `answer` is what the repaired work reaches, and the two must not be
 * confused. Board one runs to `x = -2` against a true solution of `6`, and board two to
 * `x = 4` against `7`.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type Correction, SpotTheError, type WorkedLine } from "./kinds/SpotTheError";

interface Board {
  given: string;
  spokenGiven: string;
  lines: readonly WorkedLine[];
  corrections: readonly Correction[];
  diagnosis: React.ReactNode;
  remedy: React.ReactNode;
  answer: string;
  claimed: string;
}

const BOARDS: readonly Board[] = [
  {
    given: "5x + 10 = 40",
    spokenGiven: "5 x plus 10 equals 40",
    answer: "6",
    claimed: "-2",
    lines: [
      { id: "a0", latex: "5x + 10 = 40", spoken: "5 x plus 10 equals 40" },
      {
        id: "a1",
        latex: "x + 10 = 8",
        spoken: "x plus 10 equals 8",
        wrong: true,
      },
      { id: "a2", latex: "x = -2", spoken: "x equals negative 2" },
    ],
    corrections: [
      {
        id: "a-fix",
        latex: "5x = 30",
        spoken: "5 x equals 30",
        correct: true,
      },
      {
        id: "a-half",
        latex: "x + 2 = 8",
        spoken: "x plus 2 equals 8",
        miss: (
          <>
            This one divides every term by <InlineMath latex="5" />, including the{" "}
            <InlineMath latex="10" />, which is at least consistent. It is still the wrong
            move, because the <InlineMath latex="10" /> is not part of the pile being split:
            it went on after the multiplying and has to come off before it.
          </>
        ),
      },
      {
        id: "a-swap",
        latex: "5x = 50",
        spoken: "5 x equals 50",
        miss: (
          <>
            The <InlineMath latex="10" /> has been added to the right pan rather than taken
            off it. Undoing an addition on the left means subtracting on both pans, so the
            right pan goes down to <InlineMath latex="30" /> and not up to{" "}
            <InlineMath latex="50" />.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The second line divides the left pan by <InlineMath latex="5" /> while leaving the{" "}
        <InlineMath latex="10" /> untouched, and it divides the right pan by{" "}
        <InlineMath latex="5" /> as well. Two different things happened to the two pans, so
        the beam no longer describes the same weighing.
      </>
    ),
    remedy: (
      <>
        Taking <InlineMath latex="10" /> off both pans first leaves{" "}
        <InlineMath latex="5x = 30" />, where the whole of the left pan really is five equal
        ingots, and dividing that by <InlineMath latex="5" /> is honest.
      </>
    ),
  },
  {
    given: "4x - 6 = 2x + 8",
    spokenGiven: "4 x minus 6 equals 2 x plus 8",
    answer: "7",
    claimed: "4",
    lines: [
      { id: "b0", latex: "4x - 6 = 2x + 8", spoken: "4 x minus 6 equals 2 x plus 8" },
      {
        id: "b1",
        latex: "4x = 2x + 8",
        spoken: "4 x equals 2 x plus 8",
        wrong: true,
      },
      { id: "b2", latex: "2x = 8", spoken: "2 x equals 8" },
      { id: "b3", latex: "x = 4", spoken: "x equals 4" },
    ],
    corrections: [
      {
        id: "b-fix",
        latex: "4x = 2x + 14",
        spoken: "4 x equals 2 x plus 14",
        correct: true,
      },
      {
        id: "b-swap",
        latex: "4x = 2x + 2",
        spoken: "4 x equals 2 x plus 2",
        miss: (
          <>
            The <InlineMath latex="6" /> has been taken off the right pan as well as off the
            left. The left pan was six SHORT, so putting it right means adding six there,
            and the beam only stays level if six goes on to the right pan too:{" "}
            <InlineMath latex="8 + 6" /> is <InlineMath latex="14" />, not{" "}
            <InlineMath latex="2" />.
          </>
        ),
      },
      {
        id: "b-loose",
        latex: "4x - 6 = 2x + 14",
        spoken: "4 x minus 6 equals 2 x plus 14",
        miss: (
          <>
            Here the six went on to the right pan and the left pan was left alone, so it is
            the same one-pan move as the line it is replacing, made on the other side. Six
            has to go on to BOTH pans, and the <InlineMath latex="-6" /> on the left is what
            it cancels.
          </>
        ),
      },
    ],
    diagnosis: (
      <>
        The second line clears the <InlineMath latex="-6" /> from the left pan and does
        nothing to the right, so six minas have simply left the weighing. Every later line
        inherits that, which is why the finished value fails its own check.
      </>
    ),
    remedy: (
      <>
        Adding <InlineMath latex="6" /> to BOTH pans keeps the beam level and gives{" "}
        <InlineMath latex="4x = 2x + 14" />. Lifting <InlineMath latex="2x" /> off both pans
        from there leaves <InlineMath latex="2x = 14" />, so one ingot weighs{" "}
        <InlineMath latex="7" />.
      </>
    ),
  },
];

export function SolveSlipSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Goal: find the first line that does not follow from the one above it, and put the
          line that should have been written there in its place.
        </>
      }
      heading={
        <>
          Somebody solved <InlineMath latex={board.given} /> and reached{" "}
          <InlineMath latex={`x = ${board.claimed}`} />, which fails when it is put back in.
        </>
      }
      lines={board.lines}
      corrections={board.corrections}
      diagnosis={board.diagnosis}
      remedy={board.remedy}
      findPrompt="Tap the first line that does not follow from the line above it."
      fixPrompt="Tap the line that should have been written instead."
      conclusion={
        <>
          With that line repaired the work reaches{" "}
          <InlineMath latex={`x = ${board.answer}`} />, and substituting it back into{" "}
          <InlineMath latex={board.given} /> now balances. A check costs one line and it
          found this in one.
        </>
      }
      ariaLabel={`A worked solution to ${board.spokenGiven} with one line that does not follow`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Try a different piece of work"
    />
  );
}
