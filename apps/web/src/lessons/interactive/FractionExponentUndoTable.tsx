/**
 * RAD.3 interactive (slide 2): raise each power to the bottom number of its own exponent
 * and watch its base come straight back.
 *
 * This is the derivation slide, and its argument is "the same move, applied again": take
 * $x^{1/q}$, raise it to the $q$, and the power-of-a-power rule multiplies the exponents to
 * $1$, so the base returns. A number that gives back $x$ when raised to the $q$ is exactly
 * what $\sqrt[q]{x}$ names, which is the whole of why a fraction in an exponent means a root.
 * `FillTable` is the shape for that argument, because the rows already worked stay on screen
 * beside the row being written, and a widget showing one question at a time would hide the
 * pattern the learner has to notice.
 *
 * ## Why this replaced an ordering task
 *
 * The slide used to carry `radical-form-order`, which shuffled the four lines of the
 * derivation and asked the learner to tap the one that comes next. QA's objection was that the
 * interaction repeats one used earlier rather than that the derivation was wrong, and the
 * derivation is not in the widget's gift anyway: the prose owns it, and it is the only place
 * $x^{p/q}$ is derived and the only place "radical form" is defined. So the prose is untouched
 * and the interaction is a different shape.
 *
 * Two distractors, and both are misconceptions rather than filler: the value of the power
 * ITSELF (the fourth root of 16 is 2, which is answering a question the table is not asking)
 * and the base divided by the index (16 over 4 is 4, which is the "a fraction exponent means
 * divide" reading the first slide exists to displace). The first value on offer is never the
 * first blank's answer, so working down the tray left to right cannot fill the table.
 *
 * Neither board uses the paragraph's own $8^{1/3}$ or the node's CFU ($25^{3/2}$).
 *
 * ## The heading row, and the word for the thing in it
 *
 * A column heading names the kind of thing in the column, so the first two headings were both
 * wrong in the same way the third was. "gives back" is now "result", the word RAD.1's
 * labelling widget settled on when a slot its own goal line called a name held "what the
 * symbol hands back" — the same word again, deliberately, because two headings for one idea is
 * worse than either. "raise the candidate" is now "power, raised": every other `FillTable` in
 * the tree opens on a bare noun (`power`, `expression`, `function`, `table`) and this was the
 * only one opening on an imperative. "exponents multiply" is left alone, because a column of
 * working is what `worked out` and `one step down` already name that way.
 *
 * And the thing itself is a POWER, not a "candidate". A candidate for what was never said,
 * and it could not be: the answer is that it is a candidate for being $\sqrt[q]{x}$, which is
 * the whole argument the table is building. "power" is EXP.1's own word for a base carrying an
 * exponent, so it arrives already defined and needs no gloss.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Power {
  /** The base under the fraction exponent. */
  base: number;
  /** The bottom of the exponent, which is the power this one is raised to. */
  index: number;
}

interface Board {
  /** The row given as the pattern to read off. */
  worked: Power;
  /** The rows the learner fills, in order. */
  blanks: readonly Power[];
  /**
   * The values on offer, in the order the tray deals them. Holds every blank's answer plus
   * two distractors, and never opens with the first blank's answer.
   */
  offered: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    worked: { base: 4, index: 2 },
    blanks: [
      { base: 27, index: 3 },
      { base: 16, index: 4 },
      { base: 32, index: 5 },
    ],
    offered: [4, 16, 2, 32, 27],
  },
  {
    worked: { base: 9, index: 2 },
    blanks: [
      { base: 125, index: 3 },
      { base: 81, index: 4 },
      { base: 243, index: 5 },
    ],
    offered: [3, 81, 9, 243, 125],
  },
];

/** The power raised to the bottom number of its own exponent. */
function raised({ base, index }: Power): string {
  return `\\left(${base}^{\\frac{1}{${index}}}\\right)^{${index}}`;
}

/** The multiplication that makes the exponent land on one. */
function product({ index }: Power): string {
  return `\\tfrac{1}{${index}} \\cdot ${index} = 1`;
}

function spoken({ base, index }: Power): string {
  return `${base} to the one over ${index}, all raised to the ${index}`;
}

export function FractionExponentUndoTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["power, raised", "exponents multiply", "result"]}
      rows={[
        {
          id: `worked-${board.worked.base}`,
          fixed: [raised(board.worked), product(board.worked)],
          value: `${board.worked.base}`,
          blank: false,
          spoken: spoken(board.worked),
        },
        ...board.blanks.map((power) => ({
          id: `blank-${power.base}`,
          fixed: [raised(power), product(power)],
          value: `${power.base}`,
          blank: true,
          spoken: spoken(power),
          why: (
            <>
              A power raised to another power multiplies the exponents, and{" "}
              <InlineMath latex={product(power)} />, so{" "}
              <InlineMath latex={`${raised(power)} = ${power.base}^{1}`} />. An exponent of{" "}
              <InlineMath latex="1" /> is the base itself, so what comes back is{" "}
              <InlineMath latex={`${power.base}`} /> and not the value of{" "}
              <InlineMath latex={`${power.base}^{\\frac{1}{${power.index}}}`} /> on its own.
            </>
          ),
        })),
      ]}
      options={board.offered.map((value) => ({
        id: `v${value}`,
        latex: `${value}`,
        spoken: `${value}`,
      }))}
      // The open question, not the result: every row lands on its own base, and saying so
      // here would fill the table in for the learner.
      objective="Goal: fill in what each power turns into once it is raised to the bottom number of its own exponent, and see what every row has in common."
      prompt="The middle column does the working for you. Put the missing value in the highlighted row, then do the next one."
      conclusion={
        <>
          Every row handed its own base straight back, because raising{" "}
          <InlineMath latex="x^{\frac{1}{q}}" /> to the <InlineMath latex="q" /> multiplies
          the exponents to <InlineMath latex="1" />. A number that gives back{" "}
          <InlineMath latex="x" /> when it is raised to the <InlineMath latex="q" /> is
          exactly what <InlineMath latex="\sqrt[q]{x}" /> names, so{" "}
          <InlineMath latex="x^{\frac{1}{q}} = \sqrt[q]{x}" /> and a fraction in an exponent
          really does mean a root.
        </>
      }
      ariaLabel="A table raising each fraction-exponent power to the bottom number of its own exponent"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different set of powers"
    />
  );
}
