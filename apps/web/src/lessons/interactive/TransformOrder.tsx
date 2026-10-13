/**
 * FUN.9 slide 3: the four moves that turn a logged reading into a transformed one, in the only
 * order they can happen in.
 *
 * Sequencing is the interaction this concept wants, because the mistake it exists for is an
 * ORDER mistake rather than an arithmetic one: the multiplier outside the brackets reaches
 * $f$'s value before the constant on the end does, and a learner who adds first has built a
 * different function. An animation of the same four moves would show that order without ever
 * asking for it.
 *
 * The chain's values do follow on from each other, and that is the dependency being recognized
 * rather than a leak: the point of the board is that the constant on the end has nothing to be
 * applied to until the multiplier has produced something, which is exactly why its line names a
 * value no earlier line has yet reached. Each step's `why` says what it rests on, and the
 * conclusion carries out the wrong order and prints the different value it gives, so "order
 * matters" is a computed fact on the board rather than a rule to be taken on trust.
 *
 * Three logged readings are offered and only one is the one needed, so settling the bracket is
 * load-bearing rather than ceremonial. `OrderSteps` owns the tray, the refusal, the reveal and
 * the restart; this file supplies the two boards.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The multiplier and the constant outside the brackets, and the constant inside them. */
  gain: number;
  shift: number;
  inside: number;
  /** The input the board asks about, and the three logged readings of the parent. */
  at: number;
  log: readonly (readonly [number, number])[];
  /** The order the four lines are dealt in. Never the identity. */
  dealt: readonly number[];
}

/**
 * Two boards. One turns the trace over and lifts it, the other doubles it and drops it, so the
 * signs cannot be carried across; the readings, the inputs and both final values differ. Neither
 * is the check's rule.
 */
const BOARDS: readonly Board[] = [
  {
    gain: -3,
    shift: 1,
    inside: -2,
    at: 5,
    log: [
      [1, -2],
      [3, 4],
      [5, 6],
    ],
    dealt: [2, 0, 3, 1],
  },
  {
    gain: 2,
    shift: -4,
    inside: 4,
    at: -3,
    log: [
      [-2, 7],
      [1, -3],
      [4, 2],
    ],
    dealt: [1, 3, 0, 2],
  },
];

/** `+ 3` / `- 4`: the operator and magnitude of a signed constant, spaced for KaTeX. */
function signTerm(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** A signed value standing on its own inside an expression, bracketed when negative. */
function operand(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A signed number read aloud, for the accessible names. */
function spoken(value: number): string {
  return value < 0 ? `negative ${Math.abs(value)}` : `${value}`;
}

export function TransformOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { gain, shift, inside, at } = board;

  const inner = at + inside;
  const reading =
    board.log.find(([input]) => input === inner)?.[1] ?? (board.log[0]?.[1] as number);
  const stretched = gain * reading;
  const value = stretched + shift;
  const wrongOrder = gain * (reading + shift);
  const rule = `g(x) = ${gain}f(x ${signTerm(inside)}) ${signTerm(shift)}`;

  const steps: readonly OrderedStep[] = [
    {
      id: "bracket",
      latex: `${at} ${signTerm(inside)} = ${inner}`,
      spoken: `${spoken(at)} ${inside < 0 ? "minus" : "plus"} ${Math.abs(inside)} equals ${spoken(inner)}`,
      why: (
        <>
          The bracket has to be settled first, because until it is there is no input to look
          up. The constant inside is applied to the input before <InlineMath latex="f" /> is
          consulted at all, so <InlineMath latex={`g(${at})`} /> is a question about{" "}
          <InlineMath latex={`f(${inner})`} /> and not about{" "}
          <InlineMath latex={`f(${at})`} />.
        </>
      ),
    },
    {
      id: "read",
      latex: `f(${inner}) = ${reading}`,
      spoken: `f of ${spoken(inner)} equals ${spoken(reading)}`,
      why: (
        <>
          Now the log can be read, and only now: three readings are recorded and the bracket
          is what says which of them the question needs. Nothing outside the brackets can
          act until there is a value of <InlineMath latex="f" /> for it to act on.
        </>
      ),
    },
    {
      id: "gain",
      latex: `${gain} \\times ${operand(reading)} = ${stretched}`,
      spoken: `${spoken(gain)} times ${spoken(reading)} equals ${spoken(stretched)}`,
      why: (
        <>
          The multiplier sits directly in front of <InlineMath latex="f" />, so it reaches{" "}
          <InlineMath latex="f" />
          's value before anything else outside does. Its sign travels with it, so this is
          the line where the trace is turned over or left the way up it was.
        </>
      ),
    },
    {
      id: "shift",
      latex: `${stretched} ${signTerm(shift)} = ${value}`,
      spoken: `${spoken(stretched)} ${shift < 0 ? "minus" : "plus"} ${Math.abs(shift)} equals ${spoken(value)}`,
      why: (
        <>
          The constant on the end is applied to whatever the multiplier produced, so it
          comes last. Taken first it would build{" "}
          <InlineMath latex={`${gain}(${reading} ${signTerm(shift)}) = ${wrongOrder}`} />{" "}
          instead, which is a different function and not the one on the board.
        </>
      ),
    },
  ];

  return (
    <OrderSteps
      key={variant.nonce}
      steps={steps}
      dealt={board.dealt}
      objective={
        <>
          Goal: build the chain that turns the log into <InlineMath latex={`g(${at})`} />{" "}
          for <InlineMath latex={rule} />, reading from the three recorded values in the
          table, in an order where every line uses only what the lines before it have
          produced.
        </>
      }
      prompt="Tap the line that comes next in working this reading out."
      conclusion={
        <>
          Bracket, then the log, then the multiplier, then the constant. The last two do not
          commute:{" "}
          <InlineMath latex={`${gain} \\times ${operand(reading)} ${signTerm(shift)}`} /> is{" "}
          <InlineMath latex={String(value)} />, while{" "}
          <InlineMath latex={`${gain}(${reading} ${signTerm(shift)})`} /> is{" "}
          <InlineMath latex={String(wrongOrder)} />.
        </>
      }
      ariaLabel={`Four lines of work evaluating g at ${spoken(at)}, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different rule"
    />
  );
}
