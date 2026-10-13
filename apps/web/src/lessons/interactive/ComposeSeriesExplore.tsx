/**
 * FUN.7 interactive (slide 1): two automata coupled in a line, read off a table.
 *
 * The first thing a learner has to believe about a composition is that the second function
 * never meets the original input. A table is the right shape for that, because the handover
 * column stays on screen beside the column being filled: the number the outer machine is
 * given is visible, sitting one column to the left, and it is plainly not the input.
 *
 * The distractors are the values the pair would return if the two machines were swapped, so
 * a learner who reads the chain the wrong way round meets that answer here rather than three
 * slides later. Nothing else on either board carries those numbers, so a chip can never be
 * chosen by matching it against a cell that is already filled in.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  /** The first machine multiplies its setting by this. */
  scale: number;
  /** The second machine adds this to whatever it is handed. */
  shift: number;
  /** The two settings whose row is already worked. */
  worked: readonly [number, number];
  /** The two settings whose row the learner completes, in order. */
  blank: readonly [number, number];
}

/**
 * Two boards, and their numbers are chosen so that on each one the four tray values are
 * four numbers that appear nowhere else on the table. Board 1's second machine SUBTRACTS,
 * so a learner cannot settle the second board by remembering that the answer grew.
 */
const BOARDS: readonly Board[] = [
  { scale: 4, shift: 3, worked: [1, 2], blank: [5, 6] },
  { scale: 3, shift: -4, worked: [2, 4], blank: [7, 10] },
];

/** `+ 3` / `- 4`, the operator and magnitude that follow a term. */
function tail(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** "adds 3" / "subtracts 4", for the accessible name of the whole figure. */
function shiftSpoken(value: number): string {
  return value < 0 ? `subtracts ${-value}` : `adds ${value}`;
}

export function ComposeSeriesExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { scale, shift } = board;

  const inner = (x: number): number => scale * x;
  const paired = (x: number): number => inner(x) + shift;
  /** What the pair would return with the two machines swapped: `scale(x + shift)`. */
  const swapped = (x: number): number => scale * (x + shift);

  const gTex = `${scale}x`;
  const fTex = `x ${tail(shift)}`;

  const row = (x: number, blank: boolean): TableRow => ({
    id: `x-${x}`,
    fixed: [`${x}`, `${inner(x)}`],
    value: `${paired(x)}`,
    blank,
    spoken: `input ${x}, first machine's output ${inner(x)}`,
    why: (
      <>
        The setting <InlineMath latex={`${x}`} /> goes into the first machine, which returns{" "}
        <InlineMath latex={`${inner(x)}`} />. The second machine is given that{" "}
        <InlineMath latex={`${inner(x)}`} /> and nothing else, so it returns{" "}
        <InlineMath latex={`${inner(x)} ${tail(shift)}`} />.
      </>
    ),
  });

  const [w1, w2] = board.worked;
  const [b1, b2] = board.blank;

  return (
    <FillTable
      key={variant.nonce}
      headings={["input", "the first machine's output", "the pair's output"]}
      rows={[row(w1, false), row(w2, false), row(b1, true), row(b2, true)]}
      options={[
        {
          id: "swap-1",
          latex: `${swapped(b1)}`,
          spoken: `${swapped(b1)}`,
        },
        { id: "answer-1", latex: `${paired(b1)}`, spoken: `${paired(b1)}` },
        {
          id: "swap-2",
          latex: `${swapped(b2)}`,
          spoken: `${swapped(b2)}`,
        },
        { id: "answer-2", latex: `${paired(b2)}`, spoken: `${paired(b2)}` },
      ]}
      objective={
        <>
          Goal: finish the last column, until the table shows that the second machine is
          only ever given the middle column and never the input.
        </>
      }
      prompt="Take the number in the middle column of the open row and put the second machine's output in the blank."
      conclusion={
        <>
          Every row runs the same chain: the input goes into{" "}
          <InlineMath latex={`g(x) = ${gTex}`} />, and whatever comes out is the input to{" "}
          <InlineMath latex={`f(x) = ${fTex}`} />. So the last column is{" "}
          <InlineMath latex={`f(g(x)) = ${scale}x ${tail(shift)}`} />, and the input is
          never handed to the second machine at all.
        </>
      }
      ariaLabel={`A table of four inputs run through a machine that multiplies by ${scale} and then a machine that ${shiftSpoken(shift)}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different pair of machines"
    />
  );
}
