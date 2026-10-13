/**
 * GEO.1 interactive (slide 0): the converse of the Pythagorean theorem, read off a knotted
 * cord that can be pulled into more than one triangle.
 *
 * A loop of equal knots can be pulled taut into several different triangles, and only one of
 * them has a square corner. That is a table rather than a single question, because the claim
 * the slide makes is a comparison: the settings that are NOT square have to be on screen
 * beside the one that is, or "the squares agree" is a fact about one triangle instead of the
 * test that separates it from its neighbours.
 *
 * The opening row is a setting whose squares miss, so the pattern the table hands over is the
 * move (square the two shorter sides and add them) and not the verdict. Neither board uses
 * the slide's own three, four, five: both are longer cords, so the learner applies the test
 * rather than recognising the triangle the dialogue already named.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  /** How many equal knots the cord carries, which is the perimeter of every setting. */
  knots: number;
  /** The setting whose squares do agree, for the closing line. */
  squareSetting: string;
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
}

/** `a, b, c` as a cord setting, spaced so the three lengths read as three lengths. */
function setting(a: number, b: number, c: number): string {
  return `${a},\\;${b},\\;${c}`;
}

/**
 * The two shorter sides squared and added, written out, then the longest side's square.
 *
 * This is where **legs** and **hypotenuse** get used, because it is the first place in the
 * table where either word is TRUE. The slide above bolds both, and this widget is the
 * exercise that follows it; naming the two roles only once the squares have agreed is what
 * makes the converse a test rather than a label.
 */
function why(a: number, b: number, c: number) {
  const sum = a * a + b * b;
  const square = c * c;
  return sum === square ? (
    <>
      <InlineMath latex={`${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${sum}`} />, and{" "}
      <InlineMath latex={`${c}^{2} = ${square}`} /> as well. The two agree, so this setting
      really does have a right angle: the corner between its legs is square, and the side of{" "}
      <InlineMath latex={`${c}`} /> lying opposite that corner is its hypotenuse.
    </>
  ) : (
    <>
      <InlineMath latex={`${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${sum}`} />, while{" "}
      <InlineMath latex={`${c}^{2} = ${square}`} />. The two disagree, so this setting has
      no right angle anywhere in it, and therefore no legs and no hypotenuse either.
    </>
  );
}

function row(a: number, b: number, c: number, blank: boolean): TableRow {
  return {
    id: `cord-${a}-${b}-${c}`,
    fixed: [setting(a, b, c), `${c * c}`],
    value: `${a * a + b * b}`,
    blank,
    spoken: `the setting ${a}, ${b}, ${c}`,
    why: why(a, b, c),
  };
}

/**
 * Two cords, and the three settings each can be pulled into. Every setting is a genuine
 * triangle whose sides sum to the knot count, so the board is the real choice a surveyor
 * has rather than an invented list, and exactly one setting per board is right-angled.
 */
const BOARDS: readonly Board[] = [
  {
    knots: 24,
    squareSetting: setting(6, 8, 10),
    rows: [row(4, 9, 11, false), row(7, 8, 9, true), row(6, 8, 10, true)],
    options: [
      { id: "a-100", latex: "100", spoken: "100" },
      { id: "a-113", latex: "113", spoken: "113" },
      { id: "a-81", latex: "81", spoken: "81" },
      { id: "a-121", latex: "121", spoken: "121" },
      { id: "a-145", latex: "145", spoken: "145" },
      { id: "a-164", latex: "164", spoken: "164" },
    ],
  },
  {
    knots: 30,
    squareSetting: setting(5, 12, 13),
    rows: [row(7, 11, 12, false), row(9, 10, 11, true), row(5, 12, 13, true)],
    options: [
      { id: "b-169", latex: "169", spoken: "169" },
      { id: "b-181", latex: "181", spoken: "181" },
      { id: "b-121", latex: "121", spoken: "121" },
      { id: "b-144", latex: "144", spoken: "144" },
      { id: "b-194", latex: "194", spoken: "194" },
      { id: "b-221", latex: "221", spoken: "221" },
    ],
  },
];

export function GeoCordTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      // "longest side" and not "hypotenuse", deliberately, and this is the one place in the
      // widget where the recipe is the right words. A heading spans every row, and two of the
      // three settings on each board have no right angle in them at all: a column headed
      // "hypotenuse squared" would be teaching that the longest side of ANY triangle is the
      // hypotenuse, which is both false and a common enough error that the converse is worth
      // testing at all. The two terms are used in `why` and in the conclusion instead, on the
      // row where the squares agree and the roles are real.
      headings={["cord setting", "longest side squared", "the two shorter squares added"]}
      rows={board.rows}
      options={board.options}
      objective={`Goal: finish the last column for each way the cord of ${board.knots} knots can be pulled taut, until the table shows which single setting carries a square corner.`}
      prompt="Square the two shorter lengths of a setting and add them, then bring that total over."
      conclusion={
        <>
          Only <InlineMath latex={board.squareSetting} /> makes the two columns agree, so
          that is the setting whose two shorter sides are the legs of a right angle and
          whose longest side is the hypotenuse opposite it. The other settings miss, and a
          corner they produce is not a right angle no matter how carefully the cord is
          pulled.
        </>
      }
      ariaLabel={`Three ways one cord of ${board.knots} equal knots can be pulled into a triangle, with the square of the longest side beside the squares of the two shorter sides added together`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different cord"
    />
  );
}
