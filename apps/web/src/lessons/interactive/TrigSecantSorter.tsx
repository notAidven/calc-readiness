/**
 * TRG.6 interactive (slide 2): call each heading by whether secant has a value there.
 *
 * Secant is $\dfrac{1}{\cos\theta}$, so the whole question is whether the cosine underneath
 * it is zero, and the four rows are built so that reading the heading alone answers none of
 * them. Each board's two working rows include one whose cosine is negative, which is where a
 * learner who has learned "the awkward headings break" gets it wrong: a negative cosine
 * inverts perfectly well, and only a zero one does not.
 *
 * A wrong call locks the row, because with two options a nudge-and-retry is not a question.
 * The board still opens once every row has been CALLED, so a miss on the first row does not
 * send a learner back through the three they already knew.
 *
 * The two option labels are the words the node's practice items grade against, so the
 * vocabulary a learner meets here is the vocabulary the answer field will expect.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { BinaryRowSort } from "./kinds/BinaryRowSort";

interface Heading {
  degrees: number;
  /** The cosine there, as LaTeX. Zero exactly on the rows where secant breaks. */
  cos: string;
  /** How a screen reader says that cosine. */
  cosSpoken: string;
  /** The secant there, as LaTeX, or null where it has none. */
  sec: string | null;
}

const HEADINGS: Record<number, Heading> = {
  0: { degrees: 0, cos: "1", cosSpoken: "one", sec: "1" },
  60: { degrees: 60, cos: "\\dfrac{1}{2}", cosSpoken: "one half", sec: "2" },
  90: { degrees: 90, cos: "0", cosSpoken: "zero", sec: null },
  135: {
    degrees: 135,
    cos: "-\\dfrac{\\sqrt{2}}{2}",
    cosSpoken: "negative root two over two",
    sec: "-\\sqrt{2}",
  },
  180: { degrees: 180, cos: "-1", cosSpoken: "negative one", sec: "-1" },
  225: {
    degrees: 225,
    cos: "-\\dfrac{\\sqrt{2}}{2}",
    cosSpoken: "negative root two over two",
    sec: "-\\sqrt{2}",
  },
  270: { degrees: 270, cos: "0", cosSpoken: "zero", sec: null },
  330: {
    degrees: 330,
    cos: "\\dfrac{\\sqrt{3}}{2}",
    cosSpoken: "root three over two",
    sec: "\\dfrac{2\\sqrt{3}}{3}",
  },
};

/** Two boards, each with two headings that break and two that do not, in a different order. */
const BOARDS: readonly (readonly number[])[] = [
  [330, 90, 180, 270],
  [90, 60, 270, 135],
];

function rowOf(degrees: number) {
  const heading = HEADINGS[degrees] ?? (HEADINGS[0] as Heading);
  const works = heading.sec !== null;
  const label = `\\sec ${degrees}^{\\circ}`;
  return {
    id: `sec-${degrees}`,
    latex: label,
    spoken: `secant of ${degrees} degrees`,
    first: works,
    note: works
      ? `The cosine at this heading is ${heading.cosSpoken}, which is not zero, so turning it over gives an ordinary value.`
      : "The cosine at this heading is zero, and nothing divides into zero, so there is no value to report here.",
    why: works ? (
      <>
        Secant is <InlineMath latex="\dfrac{1}{\cos\theta}" />, and the cosine at{" "}
        <InlineMath latex={`${degrees}^{\\circ}`} /> is <InlineMath latex={heading.cos} />.
        A reading being negative or small does not stop it being turned over, so{" "}
        <InlineMath latex={`\\sec ${degrees}^{\\circ} = ${heading.sec as string}`} />.
      </>
    ) : (
      <>
        Secant is <InlineMath latex="\dfrac{1}{\cos\theta}" />, and the cosine at{" "}
        <InlineMath latex={`${degrees}^{\\circ}`} /> is exactly <InlineMath latex="0" />.
        There is no number that <InlineMath latex="0" /> divides into, so secant has no
        value at this heading and its graph runs away on both sides of it.
      </>
    ),
  };
}

export function TrigSecantSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as readonly number[]);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={
        <>
          Goal: decide for each heading whether secant reports a value there, by looking at
          the cosine underneath it rather than at the size of the heading.
        </>
      }
      options={["defined", "undefined"]}
      rows={board.map(rowOf)}
      prompt="Call each row with the two buttons under it. A row locks on its first call."
      conclusion={
        <>
          Only a cosine of exactly <InlineMath latex="0" /> stops secant reporting, and that
          happens at two headings in a turn rather than at the large ones. Everywhere else
          the reading turns over, sign and all, and the value it gives is never between{" "}
          <InlineMath latex="-1" /> and <InlineMath latex="1" />.
        </>
      }
      missedNote="A negative cosine turns over just as well as a positive one, so the sign is not what decides a row. Only a cosine of exactly zero stops secant reporting."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four new headings"
      missedRestartLabel="Try a fresh set of four"
    />
  );
}
