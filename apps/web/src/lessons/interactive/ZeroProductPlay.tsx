/**
 * POL.3 slide 1: pick the value that makes a product zero, and see why only zero works.
 *
 * A learner meeting the zero-product property usually accepts it and then applies it to a
 * product equal to something else, which is the error that survives the whole topic. So the
 * board runs the same question twice over: once against a target of zero, where exactly one of
 * the offered values works and it works because it empties one bracket, and once against a
 * target that is not zero, where the offered values all fail and the honest answer is that the
 * factored form says nothing.
 *
 * Both rounds are one board, and every tap is answered with the value the product actually
 * takes, so a wrong pick is refuted by arithmetic rather than by a verdict.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The product is $(x - p)(x + q)$. */
  p: number;
  q: number;
  /** The non-zero target the second round asks about. */
  target: number;
}

/** Neither board is the slide's own $(x - 4)(x + 7)$. */
const BOARDS: readonly Board[] = [
  { p: 5, q: 3, target: 12 },
  { p: 2, q: 8, target: 20 },
];

export function ZeroProductPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <ZeroProductPlayBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ZeroProductPlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { p, q, target } = board;
  const product = (x: number) => (x - p) * (x + q);
  const given = `(x - ${p})(x + ${q})`;

  /** Round one: which value empties a bracket. Round two: which value reaches the target. */
  const [round, setRound] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState<number[]>([]);
  const [calledNone, setCalledNone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  /** Two roots and two decoys; only `p` and `-q` empty a bracket. */
  const values: readonly number[] = [p, -q, p + 1, -q - 2];
  const dealt: readonly number[] = [
    values[2] ?? 0,
    values[1] ?? 0,
    values[3] ?? 0,
    values[0] ?? 0,
  ];

  const roundOneDone = round === 1 || calledNone;

  function open() {
    if (!gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function pick(value: number) {
    if (locked.includes(value)) {
      return;
    }
    if (round === 0) {
      setPicked(value);
      if (product(value) === 0) {
        success();
        setRound(1);
        setPicked(null);
        setLocked([]);
        return;
      }
      setLocked([...locked, value]);
      return;
    }
    // Round two: nothing on offer reaches the target, and saying so is the answer.
    setPicked(value);
    setLocked([...locked, value]);
  }

  function callNone() {
    if (round !== 1 || calledNone) {
      return;
    }
    setCalledNone(true);
    setPicked(null);
    success();
    open();
  }

  function reveal() {
    setRevealed(true);
    if (round === 0) {
      setRound(1);
      setPicked(null);
      setLocked([]);
      return;
    }
    setCalledNone(true);
    open();
  }

  const feedback: ReactNode =
    picked === null ? null : round === 0 ? (
      <>
        <InlineMath latex={`(${picked} - ${p})(${picked} + ${q}) = ${product(picked)}`} />,
        and the target is <InlineMath latex="0" />. Neither bracket came out empty at that
        value, so the product had two non-zero numbers to multiply.
      </>
    ) : (
      <>
        <InlineMath latex={`(${picked} - ${p})(${picked} + ${q}) = ${product(picked)}`} />,
        and the target is <InlineMath latex={`${target}`} />. Emptying a bracket is no use
        here, because a bracket of zero drags the whole product to zero rather than to{" "}
        <InlineMath latex={`${target}`} />.
      </>
    );

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Goal: work out which values a factored form actually hands over, first when the
        product is zero and then when it is not.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath
          latex={`${given} = ${round === 0 ? 0 : target}`}
          color={calledNone ? CIVIC : LABEL}
        />
      </p>

      <div className="lesson-interactive__controls">
        {dealt.map((value) => {
          const wrongPick = locked.includes(value);
          const standing = revealed && round === 0 && product(value) === 0;
          return (
            <button
              key={value}
              type="button"
              className="lesson-interactive__chip"
              disabled={wrongPick || calledNone}
              aria-label={
                wrongPick
                  ? `x equals ${value}, your answer, wrong`
                  : standing
                    ? `x equals ${value}, the right call here, which you did not pick`
                    : `x equals ${value}`
              }
              style={{
                color: LABEL,
                borderColor: wrongPick ? BRICK : standing ? SIGNAL_DEEP : SOFT,
                borderStyle: standing ? "dashed" : "solid",
              }}
              onClick={() => pick(value)}
            >
              <InlineMath latex={`x = ${value}`} />
              {wrongPick ? " \u2717" : null}
            </button>
          );
        })}
        {round === 1 && !calledNone ? (
          <button
            type="button"
            className="lesson-interactive__chip"
            aria-label="none of these reaches the target"
            style={{ color: LABEL, borderColor: SOFT }}
            onClick={callNone}
          >
            none of these
          </button>
        ) : null}
      </div>

      {calledNone ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different product
        </button>
      ) : null}

      <WidgetReveal
        available={picked !== null && !calledNone}
        revealed={revealed}
        answer={
          round === 0 ? (
            <InlineMath latex={`x = ${p} \\text{ or } x = ${-q}`} />
          ) : (
            <>none of them</>
          )
        }
        why={
          round === 0 ? (
            <>
              A product is zero exactly when one of its factors is, so the two conditions
              are <InlineMath latex={`x - ${p} = 0`} /> and{" "}
              <InlineMath latex={`x + ${q} = 0`} />. Solving each gives{" "}
              <InlineMath latex={`x = ${p}`} /> and <InlineMath latex={`x = ${-q}`} />, and
              nothing else on offer empties either bracket.
            </>
          ) : (
            <>
              A target of <InlineMath latex={`${target}`} /> splits into no conditions at
              all, because two numbers can multiply to <InlineMath latex={`${target}`} /> in
              unboundedly many ways and none of them is read off the brackets. The factored
              form is only useful against zero, which is why an equation is gathered at zero
              before it is factored.
            </>
          )
        }
        onReveal={reveal}
        label={round === 0 ? "Reveal the two conditions" : "Reveal what the target gives"}
        othersRemain={round === 0}
      />

      <p
        className="lesson-interactive__status"
        data-state={calledNone ? "solved" : picked !== null ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {calledNone ? (
          <>
            Against zero the factored form hands over{" "}
            <InlineMath latex={`x = ${p}`} color={CIVIC} /> and{" "}
            <InlineMath latex={`x = ${-q}`} color={CIVIC} /> directly. Against{" "}
            <InlineMath latex={`${target}`} /> it hands over nothing, which is the whole
            reason an equation is gathered at zero first.
          </>
        ) : feedback ? (
          <span style={{ color: BRICK }}>{feedback}</span>
        ) : (
          <span style={{ color: SOFT }}>
            {roundOneDone
              ? "The target has changed. Read the offers against the new one."
              : "Every value here can be substituted into the product and checked."}
          </span>
        )}
      </p>
    </div>
  );
}
