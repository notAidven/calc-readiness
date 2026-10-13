/**
 * TRG.7 interactive (slide 2): call each composition on whether it hands its own heading back.
 *
 * A function and its inverse undo each other, and the restricted range is the qualification
 * that sentence needs: the composition returns the heading it was given only when that heading
 * was inside the stretch the inverse is allowed to answer on, and otherwise it returns the
 * other heading carrying the same reading. Both calls are on the board and half the rows go
 * each way, so a learner running on "they cancel" gets exactly half of them right, which is
 * the point of putting four side by side rather than asking about one.
 *
 * A wrong call locks the row, because with two options a nudge-and-retry is not a question.
 * The board still opens once every row has been CALLED, so a miss on the first row does not
 * send a learner back through the three they already knew.
 *
 * None of the eight headings here is a special angle, and that is deliberate: the exact value
 * of the reading in the middle is irrelevant to the call, and putting a familiar radical there
 * would invite a learner to evaluate the composition instead of reading off whether the
 * heading was inside the stretch. Every practice item on this node is built on the special
 * angles, so no row on this board is one of them either.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { BinaryRowSort } from "./kinds/BinaryRowSort";

type Fn = "sin" | "cos" | "tan";

const FUNCTIONS: Record<Fn, { inner: string; outer: string; word: string; band: string }> =
  {
    sin: {
      inner: "\\sin",
      outer: "\\arcsin",
      word: "arcsine",
      band: "[-90^{\\circ}, 90^{\\circ}]",
    },
    cos: {
      inner: "\\cos",
      outer: "\\arccos",
      word: "arccosine",
      band: "[0^{\\circ}, 180^{\\circ}]",
    },
    tan: {
      inner: "\\tan",
      outer: "\\arctan",
      word: "arctangent",
      band: "(-90^{\\circ}, 90^{\\circ})",
    },
  };

interface Row {
  fn: Fn;
  /** The heading handed to the inner function. */
  inner: number;
  /** What the composition actually returns. */
  out: number;
}

interface Board {
  rows: readonly [Row, Row, Row, Row];
}

/** Two rows each way per board, and the two kinds are interleaved rather than grouped. */
const BOARDS: readonly Board[] = [
  {
    rows: [
      { fn: "sin", inner: 40, out: 40 },
      { fn: "sin", inner: 160, out: 20 },
      { fn: "cos", inner: 100, out: 100 },
      { fn: "cos", inner: -40, out: 40 },
    ],
  },
  {
    rows: [
      { fn: "tan", inner: 70, out: 70 },
      { fn: "cos", inner: 200, out: 160 },
      { fn: "sin", inner: -50, out: -50 },
      { fn: "tan", inner: 160, out: -20 },
    ],
  },
];

/** A heading, parenthesized where a leading minus would run into the function name. */
function angleTex(deg: number): string {
  return deg < 0 ? `\\left(${deg}^{\\circ}\\right)` : `${deg}^{\\circ}`;
}

/** How a screen reader says a heading. */
function spokenAngle(deg: number): string {
  return deg < 0 ? `negative ${-deg} degrees` : `${deg} degrees`;
}

export function TrigComposeSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <BinaryRowSort
      key={variant.nonce}
      objective={
        <>
          Goal: decide for each of these four whether the inverse gives back the very
          heading that went in, by asking where that heading sits rather than by working out
          the reading in the middle.
        </>
      }
      options={["hands the heading back", "gives a different heading"]}
      rows={board.rows.map(({ fn, inner, out }) => {
        const spec = FUNCTIONS[fn];
        const back = inner === out;
        const composition = `${spec.outer}\\left(${spec.inner} ${angleTex(inner)}\\right)`;
        return {
          id: `${fn}${inner}`,
          latex: composition,
          spoken: `${spec.word} of the ${fn === "sin" ? "sine" : fn === "cos" ? "cosine" : "tangent"} of ${spokenAngle(inner)}`,
          first: back,
          note: back
            ? `${spokenAngle(inner)} is already inside the stretch ${spec.word} answers on, so the composition really does give it straight back.`
            : `${spokenAngle(inner)} is outside the stretch ${spec.word} answers on, so what comes back is ${spokenAngle(out)} instead.`,
          why: back ? (
            <>
              The reading goes in and comes straight back out because{" "}
              <InlineMath latex={angleTex(inner)} /> is inside{" "}
              <InlineMath latex={spec.band} />, which is the whole of what{" "}
              <InlineMath latex={spec.outer} /> is allowed to answer with. Undoing works
              here in the plain sense, and the restriction never bites.
            </>
          ) : (
            <>
              <InlineMath latex={spec.inner} /> turns <InlineMath latex={angleTex(inner)} />{" "}
              into a reading, and <InlineMath latex={spec.outer} /> may only answer inside{" "}
              <InlineMath latex={spec.band} />, which <InlineMath latex={angleTex(inner)} />{" "}
              is not in. So it hands back the other heading with that same reading,{" "}
              <InlineMath latex={`${out}^{\\circ}`} />, and the composition has changed the
              heading rather than left it alone.
            </>
          ),
        };
      })}
      prompt="Call each row, using the two buttons under it. A row locks on its first call."
      conclusion={
        <>
          An inverse undoes its function only on the stretch it was cut down to. Hand it a
          heading from anywhere else and it answers with the one inside that stretch sharing
          the reading, so the composition returns something other than what went in.
        </>
      }
      missedNote="Two rows on this board start from a heading outside the stretch its inverse answers on, so where the heading sits is the only thing that separates them."
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four new compositions"
      missedRestartLabel="Try a fresh set of four"
    />
  );
}
