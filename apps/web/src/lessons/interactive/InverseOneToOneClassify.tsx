/**
 * FUN.8 interactive (slide 2): call each rule one to one or not.
 *
 * A rule can only be run backwards when every output came from exactly one input, so this
 * board is the condition itself rather than a procedure. Two of the four rules on each board
 * FAIL, and they fail for the reason the horizontal-line test draws a picture of: a squaring
 * or an absolute value folds the two sides of one value onto the same output, so a horizontal
 * line drawn across the graph would meet it twice.
 *
 * Built on `BinaryRowSort`, which owns the mechanic: the lock on a wrong tap, the marks on a
 * settled row, the sentence a missed row is answered with, and the board's one reveal. This
 * file is the content: which rules, which call is right, and the colliding pair that proves
 * it. A settled failing row writes that pair out, because the pair is the evidence and a
 * learner who guessed should still see it.
 *
 * None of these rules appears in the check or in the practice bank.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

interface Section {
  /** The rule, as LaTeX, without its `f(x) =` head. */
  rule: string;
  /** How a screen reader says it. */
  spoken: string;
  /** True when no two inputs can share an output. */
  oneToOne: boolean;
  /** For a failing rule, the two inputs that collide and the output they share. */
  clash?: { left: number; right: number; output: number };
  /** For a failing rule, the value the two inputs sit either side of. */
  fold?: string;
}

/**
 * Two boards of four. Either board keeps two passing rules and two failing ones, so the count
 * carries no information and a learner cannot call the last row from the ones before it.
 */
const POOLS: readonly (readonly Section[])[] = [
  [
    {
      rule: "4x - 7",
      spoken: "4 x minus 7",
      oneToOne: true,
    },
    {
      rule: "x^2",
      spoken: "x squared",
      oneToOne: false,
      clash: { left: -3, right: 3, output: 9 },
      fold: "0",
    },
    {
      rule: "x^3",
      spoken: "x cubed",
      oneToOne: true,
    },
    {
      rule: "\\lvert x \\rvert",
      spoken: "the absolute value of x",
      oneToOne: false,
      clash: { left: -5, right: 5, output: 5 },
      fold: "0",
    },
  ],
  [
    {
      rule: "9 - 2x",
      spoken: "9 minus 2 x",
      oneToOne: true,
    },
    {
      rule: "(x - 4)^2",
      spoken: "x minus 4, squared",
      oneToOne: false,
      clash: { left: 1, right: 7, output: 9 },
      fold: "4",
    },
    {
      rule: "\\dfrac{x}{2} + 1",
      spoken: "x over 2, plus 1",
      oneToOne: true,
    },
    {
      rule: "x^2 + 6",
      spoken: "x squared plus 6",
      oneToOne: false,
      clash: { left: -2, right: 2, output: 10 },
      fold: "0",
    },
  ],
];

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["One to one", "Not one to one"] as const;

/** A value as it appears inside a function call: a negative one keeps its parentheses. */
function arg(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

export function InverseOneToOneClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const sections = POOLS[variant.index] ?? (POOLS[0] as readonly Section[]);

  const rows: BinaryRow[] = sections.map((section) => {
    const clash = section.clash;
    return {
      id: section.rule,
      latex: `f(x) = ${section.rule}`,
      spoken: `f of x equals ${section.spoken}`,
      first: section.oneToOne,
      settledLatex:
        clash === undefined
          ? `f(x) = ${section.rule}`
          : [
              `f(x) = ${section.rule}`,
              `f(${arg(clash.left)}) = f(${arg(clash.right)}) = ${clash.output}`,
            ],
      note:
        clash === undefined
          ? "Every change in the input moves the output, so no two inputs can land together."
          : `Two inputs land on ${clash.output} together, so one reading cannot say which one it came from.`,
      why:
        clash === undefined ? (
          <>
            Every step up in the input moves the output the same way and never turns back,
            so two different inputs can never meet on one output. Drawn as a graph, no
            horizontal line meets it more than once, which is the picture of the same fact,
            and it means the rule can be run backwards.
          </>
        ) : (
          <>
            <InlineMath latex={`f(${arg(clash.left)}) = ${clash.output}`} /> and{" "}
            <InlineMath latex={`f(${arg(clash.right)}) = ${clash.output}`} />, because the
            two inputs sit the same distance either side of{" "}
            <InlineMath latex={section.fold ?? "0"} /> and the rule folds them together.
            Drawn as a graph, the horizontal line at{" "}
            <InlineMath latex={`y = ${clash.output}`} /> meets it twice, so a reading of{" "}
            <InlineMath latex={String(clash.output)} /> cannot say which input produced it
            and there is nothing for an inverse to hand back.
          </>
        ),
    };
  });

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective="Call each of these four rules one to one or not, which is the same as saying which of them could be run backwards."
      options={CALLS}
      rows={rows}
      prompt="Ask whether any two different inputs could give the same output, and make the call for that row."
      conclusion="A rule is one to one when every output comes from exactly one input. Only those rules have an inverse."
      missedNote="That's all four called, so you're good to move on. Each row you missed says why just underneath, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New board of four rules"
      // "Try a fresh set", as every other adopter of the kind says it: see the note on
      // `FunctionMappingClassify`'s own label.
      missedRestartLabel="Try a fresh set of four rules"
    />
  );
}
