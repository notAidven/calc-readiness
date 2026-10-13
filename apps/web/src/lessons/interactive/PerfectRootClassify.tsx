/**
 * RAD.1 interactive (slide 0): call each square root one that comes out a whole number or one
 * that stays under the radical. The numbers are NOT the ones worked in the paragraph above
 * (36, 49, 20), so the learner cannot read the answers off the prose.
 *
 * Built on `BinaryRowSort`, which owns the mechanic: the lock on a wrong tap, the marks on a
 * settled row, the sentence a missed row is answered with, and the board's one reveal. Read
 * that file's header for why a settled row keeps both of its buttons, which of the three marks
 * each one gets, and why nothing on a row is a control to open.
 *
 * This file is the content: two boards of four roots, which call is right for each, the one
 * sentence a missed row is answered with, and the reasoning the reveal prints.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

interface Section {
  radicand: number;
  /** The whole-number root when the radicand is a perfect square, else 0. */
  root: number;
}

/**
 * Two sets of four roots. Either button under a finished board rotates to the other set
 * and re-closes the gate, so neither a clean set nor a missed one can be replayed on the
 * numbers just answered.
 */
const POOLS: readonly (readonly Section[])[] = [
  [
    { radicand: 81, root: 9 },
    { radicand: 24, root: 0 },
    { radicand: 64, root: 8 },
    { radicand: 45, root: 0 },
  ],
  [
    { radicand: 32, root: 0 },
    { radicand: 121, root: 11 },
    { radicand: 27, root: 0 },
    { radicand: 144, root: 12 },
  ],
];

/** The two perfect squares a non-square radicand sits between, which is why it has no root. */
function neighbours(radicand: number): { lo: number; hi: number } {
  const lo = Math.floor(Math.sqrt(radicand));
  return { lo, hi: lo + 1 };
}

/** The two calls on offer under every row, in the order they are drawn. */
const CALLS = ["Comes out whole", "Stays a radical"] as const;

export function PerfectRootClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const sections = POOLS[variant.index] ?? (POOLS[0] as readonly Section[]);

  const rows: BinaryRow[] = sections.map((section) => {
    const perfect = section.root > 0;
    const { lo, hi } = neighbours(section.radicand);
    return {
      id: String(section.radicand),
      latex: `\\sqrt{${section.radicand}}`,
      spoken: `the square root of ${section.radicand}`,
      first: perfect,
      note: perfect
        ? `${section.root} times itself is ${section.radicand}.`
        : `Nothing whole times itself gives ${section.radicand}.`,
      why: perfect ? (
        <>
          <InlineMath
            latex={`${section.root} \\cdot ${section.root} = ${section.radicand}`}
          />
          , so {section.radicand} is a perfect square: a whole number times itself lands
          exactly on it. That makes the root the whole number {section.root}, with nothing
          left under the radical.
        </>
      ) : (
        <>
          No whole number times itself gives {section.radicand}. It sits between{" "}
          <InlineMath latex={`${lo} \\cdot ${lo} = ${lo * lo}`} /> and{" "}
          <InlineMath latex={`${hi} \\cdot ${hi} = ${hi * hi}`} />, with no whole number in
          between to try, so the root stays under the radical.
        </>
      ),
    };
  });

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective="Decide for each of these four roots whether it comes out a whole number or stays under the radical."
      options={CALLS}
      rows={rows}
      prompt="Work out whether some whole number times itself lands exactly on the number inside each radical, then make the call for that row."
      conclusion="A perfect square has a whole-number root. Every other root stays under the radical until you simplify it."
      // Says what is now true. What it replaced ("A clean set is all four calls right. Let's
      // go for a perfect one") named a clean set as the thing to aim for BECAUSE only a clean
      // set opened the gate; with every called board opening it, that sentence sends the
      // learner back for a fresh four when nothing is asking them to. It still names the miss
      // and still points at the row that explains it — the rows are where the teaching is —
      // but it does that on the way past rather than in place of the way past.
      missedNote="That's all four called, so you're good to move on. Each row you missed says why just underneath, and the working is there if you want it."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="New set of four roots"
      missedRestartLabel="Try a fresh set"
    />
  );
}
