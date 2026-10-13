/**
 * FUN.6 interactive (slide 2): the premature cancellation, met as somebody else's work.
 *
 * The defect is not arithmetic, it is SCOPE. There is an `h` on the top and an `h` on the
 * bottom, so they get struck out against each other, while terms with no `h` in them at all
 * are still sitting in the numerator. A learner asked to simplify a quotient themselves
 * usually reproduces that rather than noticing it, so the work arrives with the error already
 * made and the question is which line stops following.
 *
 * The three replacements are all statements about WHEN the `h` may go, rather than three
 * values: collect first and divide the whole sum, divide part of the sum, or divide the sum
 * and keep the denominator too (R22).
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** `f(x) = a x^2 + b x`. No constant term: it would cancel and prove nothing here. */
  a: number;
  b: number;
}

/**
 * Two boards. The first keeps a unit leading coefficient, so the doubled middle term is bare
 * `2xh` and the cancellation looks most tempting; the second scales everything, so a learner
 * who memorized the shape of the first has to read the second.
 */
const BOARDS: readonly Board[] = [
  { a: 1, b: 5 },
  { a: 3, b: 2 },
];

/** A coefficient as it is written in front of a term: `1` is not written at all. */
function coef(n: number): string {
  return n === 1 ? "" : String(n);
}

export function DifferenceQuotientCancelPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { a, b } = board;

  const ruleTex = `${coef(a)}x^{2} + ${b}x`;
  /** The definition with the rule substituted, before anything is multiplied out. */
  const substituted = `${coef(a)}(x + h)^{2} + ${b}(x + h) - (${ruleTex})`;
  /** The same numerator with the square multiplied out and the minus distributed. */
  const expanded = `${coef(a)}x^{2} + ${coef(2 * a)}xh + ${coef(a)}h^{2} + ${b}x + ${b}h - ${coef(a)}x^{2} - ${b}x`;
  /** The wrong line: the `h` in the doubled term struck out against the one underneath. */
  const struck = `${coef(a)}x^{2} + ${coef(2 * a)}x + ${coef(a)}h^{2} + ${b}x + ${b}h - ${coef(a)}x^{2} - ${b}x`;
  /** What that wrong line collects to, which is where the work ends up. */
  const collectedFromStruck = `${coef(2 * a)}x + ${coef(a)}h^{2} + ${b}h`;
  /** The line that should have been written: collect first, and every term carries an `h`. */
  const collected = `${coef(2 * a)}xh + ${coef(a)}h^{2} + ${b}h`;
  /** The answer the whole simplification comes to. */
  const answer = `${coef(2 * a)}x + ${coef(a)}h + ${b}`;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Goal: find the first line of this simplification that does not follow from the one
          above it, then choose the line that should have been written there.
        </>
      }
      heading={
        <>
          Somebody has simplified the difference quotient of{" "}
          <InlineMath latex={`f(x) = ${ruleTex}`} /> and reached an answer.
        </>
      }
      lines={[
        {
          id: "substitute",
          latex: `\\dfrac{${substituted}}{h}`,
          complex: { numerator: substituted, denominator: "h" },
          spoken: "the rule substituted into the definition",
          fine: "This is only the definition with the rule written into it, so there is nothing here that could fail to follow.",
        },
        {
          id: "expand",
          latex: `\\dfrac{${expanded}}{h}`,
          complex: { numerator: expanded, denominator: "h" },
          spoken: "the square multiplied out",
          fine: "The square is multiplied out in full and the minus has reached both terms it was taking away, so this line follows.",
        },
        {
          id: "cancel",
          latex: struck,
          wrong: true,
          spoken: "the h cancelled",
          fine: "",
        },
        {
          id: "collect",
          latex: collectedFromStruck,
          spoken: "the terms collected",
          fine: "The collecting on this line is faithful to the line above it, so if that line were right this one would be too. The error is earlier.",
        },
      ]}
      corrections={[
        {
          id: "collect-first",
          latex: `\\dfrac{${collected}}{h}`,
          spoken: "collect first, keeping the h underneath",
          correct: true,
        },
        {
          id: "keep-one",
          latex: `\\dfrac{${struck}}{1}`,
          spoken: "the same cancellation with a one left underneath",
          miss: (
            <>
              This is the same cancellation with a <InlineMath latex="1" /> written
              underneath. One <InlineMath latex="h" /> on the bottom cannot be struck out
              against one term of a sum, whatever is left in the denominator afterwards.
            </>
          ),
        },
        {
          id: "divide-twice",
          latex: `\\dfrac{${answer}}{h}`,
          spoken: "every term divided by h and the h kept underneath",
          miss: (
            <>
              Every term has been divided by <InlineMath latex="h" /> here AND the{" "}
              <InlineMath latex="h" /> is still underneath, so the division has been done
              twice. It also skips the collecting, which is what makes the division legal in
              the first place.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          The <InlineMath latex="h" /> underneath was struck out against the{" "}
          <InlineMath latex="h" /> in one term of the numerator. Dividing by{" "}
          <InlineMath latex="h" /> reaches every term of a sum or none of it, and the{" "}
          <InlineMath latex={`${coef(a)}x^{2}`} /> terms sitting there have no{" "}
          <InlineMath latex="h" /> in them at all.
        </>
      }
      remedy={
        <>
          Collecting first removes the <InlineMath latex={`${coef(a)}x^{2}`} /> and{" "}
          <InlineMath latex={`${b}x`} /> terms, which leaves{" "}
          <InlineMath latex={collected} />. Now every term carries a factor of{" "}
          <InlineMath latex="h" />, so dividing by <InlineMath latex="h" /> reaches all of
          them at once.
        </>
      }
      findPrompt="Tap the first line that does not follow from the one above it."
      fixPrompt="Now choose the line that should have been written in its place."
      conclusion={
        <>
          <InlineMath latex={`\\dfrac{f(x + h) - f(x)}{h} = ${answer}`} />. The{" "}
          <InlineMath latex="h" /> underneath can only go once every term above it carries
          one.
        </>
      }
      ariaLabel="Four lines of a difference-quotient simplification, one of which does not follow"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different rule"
    />
  );
}
