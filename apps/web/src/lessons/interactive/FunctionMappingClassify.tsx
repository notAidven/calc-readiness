/**
 * FUN.1 slide 3: deciding whether a list of pairs is a function, with no picture to read.
 *
 * Registered as `function-mapping-classify`, built on the `BinaryRowSort` kind, so a wrong
 * tap locks its row rather than letting the learner take the other option, both options
 * stay on screen with the miss marked, and the row explains itself underneath.
 *
 * ## What every board has to contain
 *
 * A repeated OUTPUT, and a repeated INPUT, on different rows. Those are the two rows that
 * separate the rule from the tell: a learner scanning for any number that appears twice
 * calls the first one wrong, and a learner who has understood that only a repeated INPUT
 * breaks a relation calls both correctly. Every board also holds a constant list, where one
 * output serves three inputs, which is the same point at its most extreme.
 *
 * Neither board reuses the check's log or the practice bank's draws.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type BinaryRow, BinaryRowSort } from "./kinds/BinaryRowSort";

/**
 * A list of pairs, as one KaTeX span PER PAIR.
 *
 * Written as parts rather than as one string so the row's first column has somewhere to
 * break on a narrow card: KaTeX sets `white-space: nowrap` on its own output, so a whole
 * list typeset as a single span holds the track at its full painted width.
 */
function setParts(pairs: readonly (readonly [number, number])[]): readonly string[] {
  return pairs.map(([input, output], index) => {
    const open = index === 0 ? "\\{" : "";
    const close = index === pairs.length - 1 ? "\\}" : ",";
    return `${open}(${input},\\, ${output})${close}`;
  });
}

/** The same list read out, so a screen reader hears the pairs rather than KaTeX's spans. */
function setSpoken(pairs: readonly (readonly [number, number])[]): string {
  return pairs.map(([input, output]) => `${input} paired with ${output}`).join(", ");
}

interface RowSeed {
  id: string;
  pairs: readonly (readonly [number, number])[];
  /** True when "A function" is the right call. */
  first: boolean;
  note: string;
  why: ReactNode;
}

function toRow(seed: RowSeed): BinaryRow {
  return {
    id: seed.id,
    latex: setParts(seed.pairs),
    spoken: `the list ${setSpoken(seed.pairs)}`,
    first: seed.first,
    note: seed.note,
    why: seed.why,
  };
}

const BOARDS: readonly (readonly RowSeed[])[] = [
  [
    {
      id: "a0",
      pairs: [
        [1, 4],
        [2, 4],
        [3, 9],
      ],
      first: true,
      note: "The repeated number here is an output, and two inputs are allowed to share one.",
      why: (
        <>
          <InlineMath latex="4" /> appears twice, but as an OUTPUT, against the two
          different inputs <InlineMath latex="1" /> and <InlineMath latex="2" />. Each input
          still carries exactly one output, so this is a function.
        </>
      ),
    },
    {
      id: "a1",
      pairs: [
        [2, 5],
        [6, 1],
        [2, 9],
      ],
      first: false,
      note: "The input 2 is listed twice, and the two outputs beside it disagree.",
      why: (
        <>
          <InlineMath latex="2" /> is paired with <InlineMath latex="5" /> and again with{" "}
          <InlineMath latex="9" />. One input with two different outputs is exactly what a
          function is not allowed to do.
        </>
      ),
    },
    {
      id: "a2",
      pairs: [
        [0, 3],
        [4, 3],
        [7, 3],
      ],
      first: true,
      note: "One output serving every input is still one output per input.",
      why: (
        <>
          Every input returns <InlineMath latex="3" />. The rule is dull, but it is still a
          rule: hand it any of these inputs and exactly one number comes back.
        </>
      ),
    },
    {
      id: "a3",
      pairs: [
        [-3, 7],
        [1, 7],
        [-3, 2],
      ],
      first: false,
      note: "The input negative 3 carries two different outputs.",
      why: (
        <>
          The repeated <InlineMath latex="7" /> is harmless, but <InlineMath latex="-3" />{" "}
          appears twice with <InlineMath latex="7" /> and <InlineMath latex="2" /> beside
          it, and that is the pairing that breaks it.
        </>
      ),
    },
  ],
  [
    {
      id: "b0",
      pairs: [
        [5, 8],
        [5, 2],
        [9, 8],
      ],
      first: false,
      note: "The input 5 is listed twice with two different outputs.",
      why: (
        <>
          <InlineMath latex="5" /> is paired with <InlineMath latex="8" /> and with{" "}
          <InlineMath latex="2" />, so asking this relation for the output at{" "}
          <InlineMath latex="5" /> has two answers and no single one.
        </>
      ),
    },
    {
      id: "b1",
      pairs: [
        [-2, 6],
        [3, 6],
        [8, 1],
      ],
      first: true,
      note: "Two inputs sharing one output breaks nothing.",
      why: (
        <>
          <InlineMath latex="6" /> is repeated, but on the OUTPUT side of two different
          inputs. Nothing here asks for the output at one input twice, so it is a function.
        </>
      ),
    },
    {
      id: "b2",
      pairs: [
        [4, 0],
        [4, 0],
        [7, 5],
      ],
      first: true,
      note: "The same pair written twice records the same output, not a second one.",
      why: (
        <>
          <InlineMath latex="4" /> is listed twice, and both times it returns{" "}
          <InlineMath latex="0" />. The rule is asked the same question twice and answers it
          the same way, so no input has two different outputs.
        </>
      ),
    },
    {
      id: "b3",
      pairs: [
        [1, 3],
        [6, 9],
        [1, 9],
      ],
      first: false,
      note: "The input 1 carries two different outputs.",
      why: (
        <>
          <InlineMath latex="9" /> repeating is fine, but <InlineMath latex="1" /> is paired
          with <InlineMath latex="3" /> and then with <InlineMath latex="9" />, so this
          relation cannot say what it returns at <InlineMath latex="1" />.
        </>
      ),
    },
  ],
];

export function FunctionMappingClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const seeds = BOARDS[variant.index] ?? (BOARDS[0] as readonly RowSeed[]);
  return (
    <BinaryRowSort
      key={variant.nonce}
      objective="Call every list, so the finished board separates the ones that give each input a single output from the ones that do not."
      options={["A function", "Not a function"]}
      rows={seeds.map(toRow)}
      prompt="Read the inputs first: only a repeated input with two different outputs breaks a relation."
      conclusion={
        <>
          Every call was right. A repeated output costs nothing, and one repeated input with
          two different outputs is enough on its own to rule a relation out.
        </>
      }
      missedNote="One of these turns on which side the repeat is: an input may appear only once, an output as often as it likes."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different set of lists"
      // "Try a fresh set", the same opening the kind's other adopters use, because what the
      // control offers after a miss is the kind's own contract rather than this board's copy:
      // `binaryRowMarks.browser.test.tsx` reads it off the finished board by that wording.
      missedRestartLabel="Try a fresh set of lists"
    />
  );
}
