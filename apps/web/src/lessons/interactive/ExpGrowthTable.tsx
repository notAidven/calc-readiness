/**
 * EL.1 interactive (slide 0): adding a fixed amount and multiplying by a fixed factor are
 * not the same rule, and the table is where they part company.
 *
 * Both columns of the board start on the SAME two values, which is the whole reason this
 * needs filling rather than announcing: a learner who reads only the first two steps has no
 * evidence to separate the two rules, and the third step is where the evidence arrives. The
 * adding rule keeps handing over the same increase while the multiplying rule hands over an
 * increase that grows with whatever it is applied to.
 *
 * The values on offer include the two the ADDING rule produces at the steps the multiplying
 * rule is being asked about, so reaching for a constant increase is available as a mistake
 * rather than being ruled out by the tray.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  /** The rule labels, as LaTeX, in the order the rows are laid out. */
  adds: string;
  times: string;
  /** What each rule reaches by the last step, for the closing line. */
  addEnd: string;
  timesEnd: string;
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

/**
 * Neither board is the slide's doubling culture, and neither is the CFU's falling sample.
 * Both open on a pair of steps the two rules agree about, so the disagreement is something
 * the learner writes down rather than something the board arrives already showing.
 */
const BOARDS: readonly Board[] = [
  {
    adds: "+6",
    times: "\\times 3",
    addEnd: "21",
    timesEnd: "81",
    rows: [
      {
        id: "b0-add-0",
        fixed: ["+6", "0"],
        value: "3",
        blank: false,
        spoken: "the adding rule, step 0",
      },
      {
        id: "b0-add-1",
        fixed: ["+6", "1"],
        value: "9",
        blank: false,
        spoken: "the adding rule, step 1",
      },
      {
        id: "b0-add-2",
        fixed: ["+6", "2"],
        value: "15",
        blank: true,
        spoken: "the adding rule, step 2",
        why: (
          <>
            This rule adds <InlineMath latex="6" /> whatever the amount happens to be, so{" "}
            <InlineMath latex="9 + 6 = 15" />. The increase is fixed in advance and the row
            above it has no say in it.
          </>
        ),
      },
      {
        id: "b0-add-3",
        fixed: ["+6", "3"],
        value: "21",
        blank: true,
        spoken: "the adding rule, step 3",
        why: (
          <>
            <InlineMath latex="15 + 6 = 21" />, and the jumps have run{" "}
            <InlineMath latex="6" />, <InlineMath latex="6" />, <InlineMath latex="6" />. A
            rule that adds the same amount every step climbs by the same amount every step.
          </>
        ),
      },
      {
        id: "b0-times-0",
        fixed: ["\\times 3", "0"],
        value: "3",
        blank: false,
        spoken: "the multiplying rule, step 0",
      },
      {
        id: "b0-times-1",
        fixed: ["\\times 3", "1"],
        value: "9",
        blank: false,
        spoken: "the multiplying rule, step 1",
      },
      {
        id: "b0-times-2",
        fixed: ["\\times 3", "2"],
        value: "27",
        blank: true,
        spoken: "the multiplying rule, step 2",
        why: (
          <>
            <InlineMath latex="9 \cdot 3 = 27" />, so this step adds{" "}
            <InlineMath latex="18" /> where the step before it added{" "}
            <InlineMath latex="6" />. The factor stayed at <InlineMath latex="3" /> and the
            increase moved, because the amount being tripled had grown.
          </>
        ),
      },
      {
        id: "b0-times-3",
        fixed: ["\\times 3", "3"],
        value: "81",
        blank: true,
        spoken: "the multiplying rule, step 3",
        why: (
          <>
            <InlineMath latex="27 \cdot 3 = 81" />, which is{" "}
            <InlineMath latex="3 \cdot 3^{3}" /> written out step by step. Three steps of
            tripling from <InlineMath latex="3" /> is the exponential{" "}
            <InlineMath latex="f(x) = 3 \cdot 3^{x}" /> at <InlineMath latex="x = 3" />.
          </>
        ),
      },
    ],
    options: [
      { id: "twentyseven", latex: "27", spoken: "27" },
      { id: "fifteen", latex: "15", spoken: "15" },
      { id: "eightyone", latex: "81", spoken: "81" },
      { id: "twelve", latex: "12", spoken: "12" },
      { id: "twentyone", latex: "21", spoken: "21" },
      { id: "twofortythree", latex: "243", spoken: "243" },
    ],
  },
  {
    adds: "+6",
    times: "\\times 4",
    addEnd: "20",
    timesEnd: "128",
    rows: [
      {
        id: "b1-add-0",
        fixed: ["+6", "0"],
        value: "2",
        blank: false,
        spoken: "the adding rule, step 0",
      },
      {
        id: "b1-add-1",
        fixed: ["+6", "1"],
        value: "8",
        blank: false,
        spoken: "the adding rule, step 1",
      },
      {
        id: "b1-add-2",
        fixed: ["+6", "2"],
        value: "14",
        blank: true,
        spoken: "the adding rule, step 2",
        why: (
          <>
            <InlineMath latex="8 + 6 = 14" />. The <InlineMath latex="6" /> is decided
            before the step is taken, so the amount already on the board cannot change it.
          </>
        ),
      },
      {
        id: "b1-add-3",
        fixed: ["+6", "3"],
        value: "20",
        blank: true,
        spoken: "the adding rule, step 3",
        why: (
          <>
            <InlineMath latex="14 + 6 = 20" />, a third jump of exactly{" "}
            <InlineMath latex="6" /> after two of the same size. Steady jumps are what
            adding a fixed amount produces.
          </>
        ),
      },
      {
        id: "b1-times-0",
        fixed: ["\\times 4", "0"],
        value: "2",
        blank: false,
        spoken: "the multiplying rule, step 0",
      },
      {
        id: "b1-times-1",
        fixed: ["\\times 4", "1"],
        value: "8",
        blank: false,
        spoken: "the multiplying rule, step 1",
      },
      {
        id: "b1-times-2",
        fixed: ["\\times 4", "2"],
        value: "32",
        blank: true,
        spoken: "the multiplying rule, step 2",
        why: (
          <>
            <InlineMath latex="8 \cdot 4 = 32" />, a jump of <InlineMath latex="24" /> where
            the previous step jumped <InlineMath latex="6" />. Multiplying by{" "}
            <InlineMath latex="4" /> asks what the amount IS before deciding how much to
            add.
          </>
        ),
      },
      {
        id: "b1-times-3",
        fixed: ["\\times 4", "3"],
        value: "128",
        blank: true,
        spoken: "the multiplying rule, step 3",
        why: (
          <>
            <InlineMath latex="32 \cdot 4 = 128" />, which is{" "}
            <InlineMath latex="2 \cdot 4^{3}" />. The starting amount is the{" "}
            <InlineMath latex="2" />, the factor is the base <InlineMath latex="4" />, and
            the step number is the exponent.
          </>
        ),
      },
    ],
    options: [
      { id: "thirtytwo", latex: "32", spoken: "32" },
      { id: "fourteen", latex: "14", spoken: "14" },
      { id: "onetwentyeight", latex: "128", spoken: "128" },
      { id: "ten", latex: "10", spoken: "10" },
      { id: "twenty", latex: "20", spoken: "20" },
      { id: "fivetwelve", latex: "512", spoken: "512" },
    ],
  },
];

export function ExpGrowthTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["rule", "step", "amount"]}
      rows={board.rows}
      options={board.options}
      objective="Goal: finish the amount column for both rules, until the board says which step is the first one where a fixed increase and a fixed factor stop agreeing."
      prompt="Apply the rule named at the left of each row to the amount in the row above it."
      conclusion={
        <>
          The two rules agree for two steps and then separate:{" "}
          <InlineMath latex={board.adds} /> reaches <InlineMath latex={board.addEnd} />{" "}
          while <InlineMath latex={board.times} /> reaches{" "}
          <InlineMath latex={board.timesEnd} />. The increase under a fixed factor grows
          because the amount it is applied to grows, which is what only the exponential rule
          does.
        </>
      }
      ariaLabel="Two rules applied step by step from the same starting amount, one adding a fixed amount and one multiplying by a fixed factor"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different pair of rules"
    />
  );
}
