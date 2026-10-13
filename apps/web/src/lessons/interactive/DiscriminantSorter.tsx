/**
 * POL.4 slide 4: sort equations by how many real solutions they have, before solving any of them.
 *
 * The discriminant's whole value is that it is read rather than solved, and a widget that asked
 * for its numeric value would test the arithmetic instead of the reading. So the bins are the
 * three outcomes, and the only way into a bin is to compute the sign and stop there.
 *
 * The three bin labels all answer the one question the prompt asks, which is how many real
 * solutions this equation has (R22), and none of them names the discriminant, so a learner who
 * sorted by the sign still has to know what the sign means.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { usePickup } from "./pickup";

interface Equation {
  id: string;
  a: number;
  b: number;
  c: number;
}

interface Board {
  equations: readonly Equation[];
  dealt: readonly number[];
}

/** Two of each outcome per board, so no bin can be reached by elimination. */
const BOARDS: readonly Board[] = [
  {
    equations: [
      { id: "e1", a: 1, b: 5, c: 6 },
      { id: "e2", a: 1, b: 4, c: 4 },
      { id: "e3", a: 1, b: 2, c: 5 },
      { id: "e4", a: 2, b: -7, c: 3 },
      { id: "e5", a: 1, b: -6, c: 9 },
      { id: "e6", a: 3, b: 1, c: 4 },
    ],
    dealt: [2, 5, 0, 4, 3, 1],
  },
  {
    equations: [
      { id: "f1", a: 1, b: -8, c: 16 },
      { id: "f2", a: 1, b: 3, c: -10 },
      { id: "f3", a: 2, b: 2, c: 5 },
      { id: "f4", a: 4, b: 4, c: 1 },
      { id: "f5", a: 1, b: 1, c: 7 },
      { id: "f6", a: 1, b: -1, c: -12 },
    ],
    dealt: [4, 1, 3, 0, 5, 2],
  },
];

const BINS = [
  { key: "two", label: "two real solutions", colour: SIGNAL },
  { key: "one", label: "one real solution", colour: CIVIC },
  { key: "none", label: "no real solution", colour: BRICK },
] as const;

type BinKey = (typeof BINS)[number]["key"];

function discriminant({ a, b, c }: Equation): number {
  return b * b - 4 * a * c;
}

function binOf(equation: Equation): BinKey {
  const d = discriminant(equation);
  return d > 0 ? "two" : d === 0 ? "one" : "none";
}

function tex({ a, b, c }: Equation): string {
  const sign = (n: number) => (n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`);
  return `${a === 1 ? "" : a}x^{2} ${sign(b)}x ${sign(c)} = 0`;
}

export function DiscriminantSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <DiscriminantSorterBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DiscriminantSorterBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [placed, setPlaced] = useState<Record<string, BinKey>>({});
  const [missed, setMissed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const sorted = Object.keys(placed).length === board.equations.length;
  const missEquation = board.equations.find((each) => each.id === missed) ?? null;
  const givenEquation = fill.given ? missEquation : null;

  function place(bin: BinKey) {
    const id = pickup.take();
    const equation = board.equations.find((each) => each.id === id);
    if (!equation || placed[equation.id]) {
      return;
    }
    if (binOf(equation) === bin) {
      const next = { ...placed, [equation.id]: bin };
      setPlaced(next);
      setMissed(null);
      setRevealed(false);
      success();
      if (Object.keys(next).length === board.equations.length && !gateOpen) {
        setGateOpen(true);
        onSolved();
      }
      return;
    }
    setMissed(equation.id);
    setRevealed(false);
  }

  function reveal() {
    if (!missEquation) {
      return;
    }
    const next = { ...placed, [missEquation.id]: binOf(missEquation) };
    setPlaced(next);
    setRevealed(true);
    if (Object.keys(next).length === board.equations.length && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  const unplaced = board.dealt
    .map((index) => board.equations[index])
    .filter((equation): equation is Equation => Boolean(equation))
    .filter((equation) => !placed[equation.id]);
  const tray = unplaced.filter((equation) => equation.id !== givenEquation?.id);

  const missNote: ReactNode = missEquation ? (
    <>
      For <InlineMath latex={tex(missEquation)} /> the quantity under the root is{" "}
      <InlineMath
        latex={`${missEquation.b}^{2} - 4(${missEquation.a})(${missEquation.c}) = ${discriminant(missEquation)}`}
      />
      , and only its sign is being asked about here.
    </>
  ) : null;

  return (
    <div className="lesson-interactive lesson-interactive--sorter">
      <WidgetTask>
        Goal: say how many real solutions each of these has without solving any of them,
        using only the quantity under the root.
      </WidgetTask>

      <div className="lesson-sorter__tray">
        {sorted ? (
          <span className="lesson-sorter__tray-empty">All sorted</span>
        ) : (
          tray.map((equation) => (
            <button
              key={equation.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={`the equation ${tex(equation)}`}
              aria-pressed={pickup.held === equation.id}
              // BRICK on a missed equation is a verdict on one the learner DID sort. Carrying
              // one is not an offer, so the held chip takes the third hue instead of the
              // colour this board gives a correctly sorted equation.
              style={{
                color: LABEL,
                borderColor:
                  missed === equation.id
                    ? BRICK
                    : pickup.held === equation.id
                      ? SIGNAL_DEEP
                      : SOFT,
              }}
              onDragStart={() => pickup.hold(equation.id)}
              onDragEnd={() => pickup.clear()}
              onClick={() => pickup.toggle(equation.id)}
            >
              <InlineMath latex={tex(equation)} />
            </button>
          ))
        )}
      </div>

      <div className="lesson-sorter__bins">
        {BINS.map((bin) => {
          const inBin = board.equations.filter((each) => placed[each.id] === bin.key);
          const parked =
            givenEquation !== null && binOf(givenEquation) === bin.key
              ? givenEquation
              : null;
          return (
            <button
              key={bin.key}
              type="button"
              className="lesson-sorter__bin"
              aria-label={
                parked === null
                  ? bin.label
                  : `${bin.label}: an equation was given, not answered`
              }
              style={{ borderColor: bin.colour }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => place(bin.key)}
              onClick={() => place(bin.key)}
            >
              <span className="lesson-sorter__bin-label" style={{ color: bin.colour }}>
                {bin.label}
              </span>
              <span className="lesson-sorter__bin-items">
                {inBin.map((each) => (
                  <span key={each.id} className="lesson-sorter__placed">
                    <InlineMath latex={tex(each)} color={bin.colour} />
                  </span>
                ))}
                {parked !== null && (
                  <span className="lesson-sorter__placed" {...fill.mark(true)}>
                    <InlineMath latex={tex(parked)} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {sorted ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with six different equations
        </button>
      ) : null}

      {missEquation !== null && !sorted && (
        <WidgetReveal
          available
          revealed={revealed}
          answer={BINS.find((bin) => bin.key === binOf(missEquation))?.label ?? ""}
          why={
            <>
              <InlineMath
                latex={`b^{2} - 4ac = ${missEquation.b}^{2} - 4(${missEquation.a})(${missEquation.c}) = ${discriminant(missEquation)}`}
              />
              .{" "}
              {discriminant(missEquation) > 0
                ? "A positive quantity has a real square root to add and to subtract, so the formula produces two different values."
                : discriminant(missEquation) === 0
                  ? "A quantity of zero leaves nothing to add or subtract, so the two values the formula would produce coincide into one."
                  : "A negative quantity has no real square root, so the formula produces no real value at all and the equation cannot be satisfied by any real number."}
            </>
          }
          onReveal={reveal}
          label="Reveal where that one goes"
          othersRemain={unplaced.length > 1}
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={sorted ? "solved" : missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : sorted ? (
          <>
            Every one of those was settled by a sign rather than by a solution. A positive
            discriminant gives two, a zero discriminant gives one, and a negative
            discriminant gives none, and none of the six had to be solved to find out.
          </>
        ) : missNote ? (
          <span style={{ color: BRICK }}>{missNote}</span>
        ) : (
          <span style={{ color: SOFT }}>
            Each bin holds two of the six, so a bin filling up is not a reason to stop
            computing.
          </span>
        )}
      </p>
    </div>
  );
}
