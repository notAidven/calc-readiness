/**
 * TRG.1 slide 3: find the line where the conversion factor was written upside down.
 *
 * An inverted factor is the whole difficulty of converting between the two units, and it is
 * not an arithmetic slip. The multiplication is carried out correctly, every digit is right,
 * and the answer comes out thousands of times too big or carrying a $\pi^{2}$ nobody would
 * write on purpose. Told the rule, a learner still writes the factor whichever way up the pair
 * came to mind; meeting it inside finished work, with the absurd answer sitting at the bottom,
 * is what makes the orientation feel like it matters.
 *
 * The two boards run the conversion in opposite directions, because "the one with $\pi$ on top"
 * is a rule that works for exactly one of them and this widget is where a learner finds that
 * out. What decides the orientation on both is the same question: which unit is supposed to
 * disappear, and a unit only disappears from the bottom of the factor.
 *
 * The three corrections are three orientations of the same two numbers rather than one right
 * answer among filler, so choosing is a decision about the factor and not about which option
 * looks tidiest.
 *
 * Built on `SpotTheError`, which owns the two stages, the refusal at each and their reveals.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

/** Which way the work on a board is converting. */
type Direction = "toRadians" | "toDegrees";

interface Board {
  direction: Direction;
  /** The heading being converted: degrees, or a radian measure as `top` over `bottom`. */
  degrees: number;
  top: number;
  bottom: number;
}

/**
 * Each board holds one heading written both ways: its `degrees` and its `top` over `bottom`
 * name the same direction, so the measure the work should have reached is already on the board
 * and the conclusion prints the pair. The two straddle the half turn and run in opposite
 * directions, so neither board can be walked from the other and "the one with $\pi$ on top" is
 * right on exactly one of them.
 *
 * Neither heading is exclusive to this widget. Both are multiples of 15 strictly inside a turn,
 * which is the set TRG.1's two conversion templates draw from, and slide 2 parks a dish at
 * $150^{\circ}$. What is new here is the inverted factor, which is the whole of what these
 * boards ask about.
 */
const BOARDS: readonly Board[] = [
  { direction: "toRadians", degrees: 150, top: 5, bottom: 6 },
  { direction: "toDegrees", degrees: 210, top: 7, bottom: 6 },
];

export function TrigConvertSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { degrees, top, bottom } = board;
  const toRadians = board.direction === "toRadians";

  const radTex = `\\dfrac{${top}\\pi}{${bottom}}`;
  const radSpoken = `${top} pi over ${bottom}`;
  /** The factor as the work wrote it: the wrong way up for this direction. */
  const inverted = toRadians ? "\\dfrac{180}{\\pi}" : "\\dfrac{\\pi}{180}";
  const correct = toRadians ? "\\dfrac{\\pi}{180}" : "\\dfrac{180}{\\pi}";
  const correctSpoken = toRadians ? "pi over 180" : "180 over pi";

  /** What the inverted factor actually produces, which is the line that follows correctly. */
  const wrongResult = toRadians
    ? `\\dfrac{${degrees * 180}}{\\pi}`
    : `\\dfrac{${top}\\pi^{2}}{${bottom * 180}}`;
  const wrongSpoken = toRadians
    ? `${degrees * 180} over pi`
    : `${top} pi squared over ${bottom * 180}`;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Find the line that left the answer in the wrong unit, then choose the factor that
          should have been multiplied in there instead.
        </>
      }
      heading={
        <>
          Somebody has converted{" "}
          <InlineMath
            latex={toRadians ? `${degrees}^{\\circ}` : `${radTex}\\ \\text{radians}`}
          />{" "}
          into {toRadians ? "radians" : "degrees"} and finished with something that cannot
          be a heading at all. One line is where it went wrong.
        </>
      }
      lines={[
        {
          id: "l1",
          latex: toRadians
            ? `${degrees}^{\\circ} = ?\\ \\text{radians}`
            : `${radTex}\\ \\text{radians} = ?^{\\circ}`,
          spoken: toRadians
            ? `${degrees} degrees equals how many radians`
            : `${radSpoken} radians equals how many degrees`,
          fine: "That is the question copied down, so there is nothing wrong with it yet.",
        },
        {
          id: "l2",
          latex: toRadians
            ? `${degrees} \\times ${inverted}`
            : `${radTex} \\times ${inverted}`,
          spoken: toRadians
            ? `${degrees} times 180 over pi`
            : `${radSpoken} times pi over 180`,
          wrong: true,
        },
        {
          id: "l3",
          latex: `= ${wrongResult}`,
          spoken: `equals ${wrongSpoken}`,
          fine: toRadians ? (
            <>
              The multiplication on this line is carried out correctly:{" "}
              <InlineMath latex={`${degrees} \\times 180 = ${degrees * 180}`} />. The
              trouble is which factor was multiplied in on the line above.
            </>
          ) : (
            `The multiplication on this line is carried out correctly: the two tops multiply and the two bottoms multiply, exactly as they should. The trouble is which factor was multiplied in on the line above.`
          ),
        },
      ]}
      // The right answer is second, so a learner who taps the first option cannot be right by
      // habit. All three are orientations of the same two numbers rather than one answer among
      // filler, so choosing is a decision about the factor.
      corrections={[
        {
          id: "full-turn",
          latex: toRadians ? "\\dfrac{\\pi}{360}" : "\\dfrac{360}{\\pi}",
          spoken: toRadians ? "pi over 360" : "360 over pi",
          miss: (
            <>
              This one is the right way up and built on the wrong agreement. A full turn is{" "}
              <InlineMath latex="360^{\circ}" /> and it is <InlineMath latex="2\pi" />{" "}
              radians, not <InlineMath latex="\pi" />, so <InlineMath latex="\pi" /> over{" "}
              <InlineMath latex="360" /> is worth a half rather than a one and multiplying
              by it {toRadians ? "halves" : "doubles"} the heading. Pair a half turn with a
              half turn, or a whole with a whole, and never one of each.
            </>
          ),
        },
        {
          id: "flip",
          latex: correct,
          spoken: correctSpoken,
          correct: true,
        },
        {
          id: "no-pi",
          latex: toRadians ? "\\dfrac{1}{180}" : "180",
          spoken: toRadians ? "1 over 180" : "180 with no pi",
          miss: toRadians ? (
            <>
              Dividing by <InlineMath latex="180" /> shrinks the number to the right size
              and leaves no <InlineMath latex="\pi" /> anywhere in it, so what comes out is
              a plain fraction rather than a radian measure. The <InlineMath latex="\pi" />{" "}
              is not decoration: it is the half turn the whole agreement is about.
            </>
          ) : (
            <>
              Multiplying by <InlineMath latex="180" /> alone leaves the{" "}
              <InlineMath latex="\pi" /> standing in the answer, and a heading in degrees is
              a plain number. The <InlineMath latex="\pi" /> has to be cancelled by a{" "}
              <InlineMath latex="\pi" /> underneath, which is the whole job of the factor.
            </>
          ),
        },
      ]}
      diagnosis={
        toRadians ? (
          <>
            The factor is upside down. A heading of{" "}
            <InlineMath latex={`${degrees}^{\\circ}`} /> is less than a full turn, so in
            radians it has to be smaller than <InlineMath latex="2\pi" />, which is about
            six. Multiplying by <InlineMath latex="\dfrac{180}{\pi}" /> made it bigger by a
            factor of <InlineMath latex="180" /> instead of smaller, and the size of the
            answer is the signal that the orientation was wrong.
          </>
        ) : (
          <>
            The factor is upside down. Multiplying a measure that already carries{" "}
            <InlineMath latex="\pi" /> by another <InlineMath latex="\pi" /> on top gives{" "}
            <InlineMath latex="\pi^{2}" />, and no heading in degrees has a{" "}
            <InlineMath latex="\pi" /> in it at all. The <InlineMath latex="\pi" /> was
            supposed to cancel, and a leftover one in the answer is the signal that the
            orientation was wrong.
          </>
        )
      }
      remedy={
        <>
          One agreement drives both directions: a half turn is{" "}
          <InlineMath latex="180^{\circ}" /> and it is <InlineMath latex="\pi" /> radians.
          So <InlineMath latex="\dfrac{\pi}{180^{\circ}}" /> and{" "}
          <InlineMath latex="\dfrac{180^{\circ}}{\pi}" /> are both worth one, and which of
          them to use is decided by which unit has to disappear: it goes on the BOTTOM, so
          it cancels the unit you started with. Here that is <InlineMath latex={correct} />.
        </>
      }
      findPrompt="Tap the first line that does not follow."
      fixPrompt="Now pick the factor that should have been written there instead."
      conclusion={
        <>
          With the factor the right way up, the conversion comes out as{" "}
          <InlineMath
            latex={
              toRadians
                ? `${degrees}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = ${radTex}`
                : `${radTex} \\times \\dfrac{180^{\\circ}}{\\pi} = ${degrees}^{\\circ}`
            }
          />
          . Both factors are worth one, so neither of them moves the dish. All that changes
          is the unit the heading is written in, and which unit you end up with is decided
          entirely by which way up the factor is written.
        </>
      }
      ariaLabel={`Three lines of work converting ${toRadians ? `${degrees} degrees into radians` : `${radSpoken} radians into degrees`}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a conversion the other way"
    />
  );
}
