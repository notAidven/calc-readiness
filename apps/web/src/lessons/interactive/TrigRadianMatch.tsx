/**
 * TRG.1 slide 1: join each heading in degrees to the same heading in radians.
 *
 * Matching is the right shape here because the claim of the slide is a CORRESPONDENCE: not
 * "here is how to convert" but "these two columns are the same four headings written twice".
 * A learner who has only converted one measure has an arithmetic move; a learner who has
 * paired four has the idea that the two units name one set of directions.
 *
 * The distractors are the other pairs, and they are the misconception rather than filler. A
 * learner who reads the bar as a size rather than as a share of the half turn joins
 * $30^{\circ}$ to $\dfrac{\pi}{4}$ and finds a chip waiting for them. The cost lands twice,
 * once on the wrong join and again when the board runs out of partners.
 *
 * Built on `MatchPairs`, which owns the pick-up, the refusal, the reveal and the gate.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Heading {
  degrees: number;
  /** The radian measure as a numerator and denominator over pi. */
  top: number;
  bottom: number;
}

interface Board {
  headings: readonly Heading[];
  /** How the right column is dealt: indices into `headings`. Never in order. */
  dealt: readonly number[];
}

/** The radian measure as LaTeX, printing a bare multiple when the bottom is one. */
function radTex({ top, bottom }: Heading): string {
  const numerator = top === 1 ? "\\pi" : `${top}\\pi`;
  return bottom === 1 ? numerator : `\\dfrac{${numerator}}{${bottom}}`;
}

/** The same measure read aloud, for the button's accessible name. */
function radSpoken({ top, bottom }: Heading): string {
  const numerator = top === 1 ? "pi" : `${top} pi`;
  return bottom === 1 ? numerator : `${numerator} over ${bottom}`;
}

/**
 * Two boards of four headings, sharing none between them.
 *
 * Each board carries a numerator above one, so neither can be walked by taking "a radian
 * measure is one over something" as the pattern, and each carries a pair where the BIGGER
 * number underneath belongs to the BIGGER sweep, so a learner who ranks the headings by the
 * bar alone is contradicted by the board they are looking at. `denominatorCounterexample`
 * finds that pair rather than trusting this comment, and the closing line names it. The first
 * board stays inside a half turn; the second goes past it and puts the half turn itself on
 * screen as a bare $\pi$.
 */
const BOARDS: readonly Board[] = [
  {
    headings: [
      { degrees: 30, top: 1, bottom: 6 },
      { degrees: 45, top: 1, bottom: 4 },
      { degrees: 90, top: 1, bottom: 2 },
      { degrees: 120, top: 2, bottom: 3 },
    ],
    dealt: [2, 0, 3, 1],
  },
  {
    headings: [
      { degrees: 60, top: 1, bottom: 3 },
      { degrees: 135, top: 3, bottom: 4 },
      { degrees: 180, top: 1, bottom: 1 },
      { degrees: 270, top: 3, bottom: 2 },
    ],
    dealt: [3, 1, 0, 2],
  },
];

/**
 * Two headings on a board where the one with the bigger denominator is the bigger sweep.
 *
 * "A bigger number underneath is a smaller sweep" holds only while the numerator is fixed, and
 * every board here serves a numerator above one, so the closing line has to point at the pair
 * that breaks it instead of stating the rule.
 */
function denominatorCounterexample(
  headings: readonly Heading[],
): readonly [Heading, Heading] | null {
  for (const smaller of headings) {
    for (const bigger of headings) {
      if (bigger.bottom > smaller.bottom && bigger.degrees > smaller.degrees) {
        return [smaller, bigger];
      }
    }
  }
  return null;
}

export function TrigRadianMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const breaksTheBar = denominatorCounterexample(board.headings);

  const pairs: MatchPair[] = board.headings.map((heading) => ({
    id: `deg-${heading.degrees}`,
    left: `${heading.degrees}^{\\circ}`,
    right: radTex(heading),
    leftSpoken: `${heading.degrees} degrees`,
    rightSpoken: radSpoken(heading),
    why: (
      <>
        A half turn is <InlineMath latex="180^{\circ}" /> and it is also{" "}
        <InlineMath latex="\pi" /> radians, so{" "}
        <InlineMath latex="\dfrac{\pi}{180^{\circ}}" /> is worth one and multiplying by it
        changes the unit and nothing else:{" "}
        <InlineMath
          latex={`${heading.degrees}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = \\dfrac{${heading.degrees}\\pi}{180} = ${radTex(heading)}`}
        />
        .
      </>
    ),
  }));

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={pairs}
      rightOrder={board.dealt}
      objective="Goal: join all four headings to the same four headings written the other way, so the two columns end up as one set of directions rather than two."
      prompt="Tap a heading in degrees on the left, then tap the same heading in radians on the right. You can also drag and drop one onto the other."
      conclusion={
        <>
          The two columns were never two sets of headings. A <strong>radian</strong> is the
          second way of measuring the same turn, fixed by one agreement: a half turn is{" "}
          <InlineMath latex="180^{\circ}" /> and it is <InlineMath latex="\pi" /> radians.
          So a whole turn is <InlineMath latex="2\pi" />, and every heading on the board
          sits somewhere inside that. Read a measure as a share of that half turn: the
          number underneath cuts it into pieces and the number on top counts them. It is the
          VALUE of the whole measure that ranks the sweeps, never the number underneath on
          its own
          {breaksTheBar === null ? null : (
            <>
              : on this board the bigger number underneath belongs to the BIGGER sweep,
              since{" "}
              <InlineMath
                latex={`${radTex(breaksTheBar[1])} > ${radTex(breaksTheBar[0])}`}
              />
            </>
          )}
          .
        </>
      }
      ariaLabel="Four headings written in degrees, to be joined to the same four headings written in radians"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four new headings"
    />
  );
}
