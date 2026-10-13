/**
 * TRG.1 slide 0: where a sweep leaves the dish, measured from the rest heading.
 *
 * Standard position is a convention rather than a calculation, and a convention is learned by
 * applying it rather than by being told it. So the table asks for the heading a sweep produces
 * on every row after the worked one, all measured the same way: from the rest heading the dish
 * sits at, in the one direction headings are counted, to wherever the dish finishes. What the learner
 * takes off the finished table is that a full turn is $360^{\circ}$ and every other heading is
 * a piece of that, which is the fact slide 1 needs before a second unit can mean anything.
 *
 * The last row of each board is deliberately a whole turn or more. It costs nothing here and
 * it plants the observation slide 2 is about: a sweep can finish exactly where it started.
 *
 * Both boards stay in degrees, and that is on purpose rather than an oversight. The plan's
 * widget table glosses this one as filling a heading "in degrees and in radians", but the same
 * plan's vocabulary table earns **radian** on slide 1, and a column headed in a unit the
 * lesson has not defined yet is the second of those two rules losing to the first. The
 * conversion is the whole of the next slide's widget, so nothing is lost by waiting a slide.
 *
 * Built on `FillTable`, which owns the tray, the single open slot, the refusal and the reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Sweep {
  /** How the sweep is described, in words. */
  words: string;
  /** The fraction of a full turn it covers, as a numerator and denominator. */
  part: readonly [number, number];
  /** The heading it finishes at, in degrees. */
  degrees: number;
}

interface Board {
  sweeps: readonly Sweep[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

function degreeRow(sweep: Sweep, blank: boolean): TableRow {
  const [numerator, denominator] = sweep.part;
  return {
    id: `sweep-${numerator}-${denominator}`,
    fixed: [`\\text{${sweep.words}}`, `\\dfrac{${numerator}}{${denominator}}`],
    value: `${sweep.degrees}^{\\circ}`,
    blank,
    spoken: `the sweep of ${sweep.words}`,
    why: (
      <>
        A whole turn brings the dish back to the rest heading and measures{" "}
        <InlineMath latex="360^{\circ}" />, so this sweep is{" "}
        <InlineMath latex={`\\dfrac{${numerator}}{${denominator}}`} /> of that:{" "}
        <InlineMath
          latex={`\\dfrac{${numerator}}{${denominator}} \\times 360^{\\circ} = ${sweep.degrees}^{\\circ}`}
        />
        . The heading is counted from the rest heading round to where the dish finishes,
        never from wherever it happened to be pointing beforehand.
      </>
    ),
  };
}

/**
 * Two boards of four sweeps. The opening row of each is given as the pattern, so what the
 * learner is handed is the MOVE and not a verdict about any one sweep.
 *
 * Every distractor is a mistake somebody makes rather than a spare number: `120^{\circ}` is
 * two thirds of a turn read as one third, `40^{\circ}` is an eighth of a turn worked out as a
 * ninth, and `300^{\circ}` on the first board is five sixths, which the second board asks for
 * properly.
 */
const BOARDS: readonly Board[] = [
  {
    sweeps: [
      { words: "a quarter turn", part: [1, 4], degrees: 90 },
      { words: "half a turn", part: [1, 2], degrees: 180 },
      { words: "two thirds of a turn", part: [2, 3], degrees: 240 },
      { words: "one whole turn", part: [1, 1], degrees: 360 },
    ],
    options: [
      { id: "a-180", latex: "180^{\\circ}", spoken: "180 degrees" },
      { id: "a-240", latex: "240^{\\circ}", spoken: "240 degrees" },
      { id: "a-360", latex: "360^{\\circ}", spoken: "360 degrees" },
      { id: "a-120", latex: "120^{\\circ}", spoken: "120 degrees" },
      { id: "a-300", latex: "300^{\\circ}", spoken: "300 degrees" },
      { id: "a-90", latex: "90^{\\circ}", spoken: "90 degrees" },
    ],
  },
  {
    sweeps: [
      { words: "a sixth of a turn", part: [1, 6], degrees: 60 },
      { words: "an eighth of a turn", part: [1, 8], degrees: 45 },
      { words: "five sixths of a turn", part: [5, 6], degrees: 300 },
      { words: "a turn and a quarter", part: [5, 4], degrees: 450 },
    ],
    options: [
      { id: "b-45", latex: "45^{\\circ}", spoken: "45 degrees" },
      { id: "b-300", latex: "300^{\\circ}", spoken: "300 degrees" },
      { id: "b-450", latex: "450^{\\circ}", spoken: "450 degrees" },
      { id: "b-40", latex: "40^{\\circ}", spoken: "40 degrees" },
      { id: "b-90", latex: "90^{\\circ}", spoken: "90 degrees" },
      { id: "b-60", latex: "60^{\\circ}", spoken: "60 degrees" },
    ],
  },
];

export function TrigBearingTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const rows = board.sweeps.map((sweep, at) => degreeRow(sweep, at > 0));
  const last = board.sweeps[board.sweeps.length - 1] as Sweep;

  return (
    <FillTable
      key={variant.nonce}
      headings={["the sweep", "as a fraction of a full turn", "the heading in degrees"]}
      rows={rows}
      options={board.options}
      objective="Goal: finish the heading column, so the table shows what each sweep leaves the dish pointing at, all measured the same way from the rest heading."
      prompt="Take the fraction of a turn on that row and find that same fraction of a full turn."
      conclusion={
        <>
          Every heading in the column was counted from the same place: the dish at rest, its
          arm along the <strong>initial side</strong>, turning one way round to the{" "}
          <strong>terminal side</strong> where it finishes. An angle set out that way is in{" "}
          <strong>standard position</strong>, and it is why two people reading the same dish
          write down the same number. A full turn is <InlineMath latex="360^{\circ}" />, so{" "}
          <InlineMath latex={`\\text{${last.words}}`} /> comes to{" "}
          <InlineMath latex={`${last.degrees}^{\\circ}`} />.
        </>
      }
      ariaLabel="Four sweeps of a dish, each with the fraction of a full turn it covers beside the heading in degrees it finishes at"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different sweeps"
    />
  );
}
