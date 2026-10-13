/**
 * FUN.7 interactive (slide 4): build $(f \circ g)(x)$ as a formula, with no number to
 * evaluate at.
 *
 * Two beats, because the slide has two separable failures. First the substitution itself:
 * the WHOLE inner function goes wherever the outer one writes its input, and the three chips
 * are the three lines a learner writes there, so the choice cannot be settled by looking at
 * which one is longest. Only after the substitution is called do the boxes open, and then
 * the multiplying out and the collecting are what the two numbers measure.
 *
 * A wrong chip is locked rather than merely refused. With three options and nothing locked,
 * the second guess is worth more than the reasoning, and a widget that can be finished by
 * tapping is not asking a question.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Round {
  /** Outer function `f(x) = fa*x + fb`. */
  fa: number;
  fb: number;
  /** Inner function `g(x) = ga*x + gb`. */
  ga: number;
  gb: number;
}

/**
 * Two pools of two rounds. Every round's collected constant differs in sign from its
 * neighbour's, so a learner cannot settle the second box by remembering the first.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { fa: 3, fb: 2, ga: 5, gb: -1 },
    { fa: 2, fb: -7, ga: 3, gb: 4 },
  ],
  [
    { fa: 4, fb: -3, ga: 2, gb: 5 },
    { fa: 5, fb: 1, ga: 4, gb: -2 },
  ],
];

/** `+ 5` / `- 3`, the operator and magnitude that follow a term. */
function tail(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** A linear body such as `3x + 2` or `5x - 1`. */
function linear(slope: number, constant: number): string {
  return `${slope}x ${tail(constant)}`;
}

/** The three chips, in a fixed order per round, with the correct one never first. */
type ChipId = "partial" | "correct" | "swap";

export function ComposeBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <ComposeBuildBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ComposeBuildBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [called, setCalled] = useState(false);
  const [locked, setLocked] = useState<readonly ChipId[]>([]);
  const [coeffVal, setCoeffVal] = useState("");
  const [constVal, setConstVal] = useState("");
  const [coeffDone, setCoeffDone] = useState(false);
  const [constDone, setConstDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const { fa, fb, ga, gb } = round;
  const isLastRound = roundIndex === lastIndex;

  const fTex = linear(fa, fb);
  const gTex = linear(ga, gb);
  const coefficient = fa * ga;
  const constant = fa * gb + fb;
  const solved = called && coeffDone && constDone;

  /**
   * The chips. `partial` substitutes only the inner function's variable term and leaves its
   * constant behind; `swap` composes the other way round. Both are lines learners write, and
   * neither is distinguishable from the right one by length or by shape.
   */
  const dealt: readonly { id: ChipId; latex: string; spoken: string }[] = [
    {
      id: "partial",
      latex: `${fa}(${ga}x) ${tail(fb)}`,
      spoken: `${fa} times ${ga} x, ${fb < 0 ? "minus" : "plus"} ${Math.abs(fb)}`,
    },
    {
      id: "correct",
      latex: `${fa}(${gTex}) ${tail(fb)}`,
      spoken: `${fa} times the bracket ${ga} x ${gb < 0 ? "minus" : "plus"} ${Math.abs(gb)}, ${fb < 0 ? "minus" : "plus"} ${Math.abs(fb)}`,
    },
    {
      id: "swap",
      latex: `${ga}(${fTex}) ${tail(gb)}`,
      spoken: `${ga} times the bracket ${fa} x ${fb < 0 ? "minus" : "plus"} ${Math.abs(fb)}, ${gb < 0 ? "minus" : "plus"} ${Math.abs(gb)}`,
    },
  ];

  /**
   * The right answer never sits first, and never sits in the same place two rounds running:
   * a fixed position is a rule a learner can find without reading any of the three.
   */
  const chips =
    roundIndex % 2 === 0
      ? dealt
      : [dealt[0], dealt[2], dealt[1]].filter((chip) => chip !== undefined);

  function closeRound() {
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function callChip(id: ChipId) {
    if (called || locked.includes(id)) {
      return;
    }
    setAttempted(true);
    if (id === "correct") {
      setCalled(true);
      setFeedback(null);
      success();
      return;
    }
    setLocked((current) => [...current, id]);
    setFeedback(
      id === "partial" ? (
        <>
          That substitutes only part of <InlineMath latex="g" />. The outer function's input
          is the WHOLE of <InlineMath latex={`${gTex}`} />, constant included, so the
          bracket has to carry both of its terms.
        </>
      ) : (
        <>
          That is <InlineMath latex="(g \circ f)(x)" />, the other order. It puts{" "}
          <InlineMath latex={`${fTex}`} /> inside <InlineMath latex="g" />, and the question
          asks for <InlineMath latex={`${gTex}`} /> inside <InlineMath latex="f" />.
        </>
      ),
    );
  }

  function check() {
    setAttempted(true);
    const nextCoeff =
      coeffDone || (coeffVal.trim() !== "" && Number(coeffVal.trim()) === coefficient);
    const nextConst =
      constDone || (constVal.trim() !== "" && Number(constVal.trim()) === constant);
    if (nextCoeff && !coeffDone) {
      success();
    }
    if (nextConst && !constDone) {
      success();
    }
    setCoeffDone(nextCoeff);
    setConstDone(nextConst);
    if (nextCoeff && nextConst) {
      setFeedback(null);
      closeRound();
      return;
    }
    setFeedback(
      !nextCoeff && Number(coeffVal.trim()) === ga ? (
        <>
          The bracket is multiplied by <InlineMath latex={`${fa}`} />, so the term in{" "}
          <InlineMath latex="x" /> is <InlineMath latex={`${fa}`} /> lots of{" "}
          <InlineMath latex={`${ga}x`} />, not <InlineMath latex={`${ga}x`} /> on its own.
        </>
      ) : !nextConst && Number(constVal.trim()) === fb ? (
        <>
          There are two plain numbers to gather: the one the bracket produces when it is
          multiplied out, and the <InlineMath latex={`${fb}`} /> that was already outside
          it.
        </>
      ) : (
        <>
          Not yet. Multiply <InlineMath latex={`${fa}`} /> into both terms of the bracket,
          then gather the plain numbers.
        </>
      ),
    );
  }

  function reveal() {
    setCalled(true);
    setCoeffDone(true);
    setConstDone(true);
    setRevealed(true);
    setFeedback(null);
    closeRound();
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setCalled(false);
      setLocked([]);
      setCoeffVal("");
      setConstVal("");
      setCoeffDone(false);
      setConstDone(false);
      setAttempted(false);
      setRevealed(false);
      setFeedback(null);
    }
  }

  // `\mathord{?}` rather than a bare `?`: KaTeX classes `?` as a CLOSE atom, which demotes
  // the `+` in front of it to an ordinary symbol and takes the spacing out on both sides.
  const builtLatex = `${coeffDone ? coefficient : "\\mathord{?}"}x ${
    constDone ? tail(constant) : "+ \\mathord{?}"
  }`;
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Turn the two functions into one formula for <InlineMath latex="(f \circ g)(x)" />:
        choose the substitution it starts from, then give the single term in{" "}
        <InlineMath latex="x" /> and the single constant it collects into.
      </WidgetTask>

      <svg
        viewBox="0 0 440 156"
        role="img"
        aria-label={`Composing f of x equals ${fTex} with g of x equals ${gTex} into one formula`}
      >
        <title>Building the formula for f composed with g</title>

        <text x={220} y={18} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`f(x) = ${fTex} \\qquad g(x) = ${gTex}`}
          x={220}
          y={46}
          fontSize={16}
          color={LABEL}
          w={420}
        />

        <SvgMath
          latex={`(f \\circ g)(x) = f(${gTex})`}
          x={220}
          y={84}
          fontSize={18}
          color={LABEL}
          w={420}
        />

        <SvgMath
          latex={called ? `= ${fa}(${gTex}) ${tail(fb)} = ${builtLatex}` : "= \\;?"}
          x={220}
          y={124}
          fontSize={18}
          color={solved ? CIVIC : SOFT}
          w={420}
        />
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different pair of functions
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a different pair
          </button>
        )
      ) : !called ? (
        <div className="lesson-interactive__controls">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-interactive__step"
              style={{
                ...neutral,
                // Amber and dashed, never green: the reveal named this chip rather than the
                // learner finding it, so the success colour would credit a call nobody made.
                borderColor: chip.id === "correct" && fill.given ? SIGNAL_DEEP : LINE,
                borderStyle: chip.id === "correct" && fill.given ? "dashed" : "solid",
              }}
              disabled={locked.includes(chip.id)}
              aria-label={`substitute to give ${chip.spoken}`}
              onClick={() => callChip(chip.id)}
              {...fill.mark(chip.id === "correct")}
            >
              <InlineMath latex={chip.latex} />
            </button>
          ))}
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: LABEL }}>
            <span className="lesson-interactive__field-label">
              coefficient of <InlineMath latex="x" /> =
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={coeffDone ? `${coefficient}` : coeffVal}
              disabled={coeffDone}
              aria-label="the coefficient of x in the composed formula"
              onChange={(event) => setCoeffVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
              {...fill.entry(coefficient)}
            />
          </div>
          <div className="lesson-interactive__field" style={{ color: LABEL }}>
            <span className="lesson-interactive__field-label">constant term =</span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={constDone ? `${constant}` : constVal}
              disabled={constDone}
              aria-label="the constant term in the composed formula"
              onChange={(event) => setConstVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
              {...fill.entry(constant)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Build the formula
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={
          <InlineMath latex={`(f \\circ g)(x) = ${coefficient}x ${tail(constant)}`} />
        }
        why={
          <>
            Composing is substitution: everywhere <InlineMath latex="f" /> writes its input,
            the whole of <InlineMath latex={`${gTex}`} /> goes in, brackets and all, giving{" "}
            <InlineMath latex={`${fa}(${gTex}) ${tail(fb)}`} />. Multiplying{" "}
            <InlineMath latex={`${fa}`} /> into both terms gives{" "}
            <InlineMath latex={`${coefficient}x ${tail(fa * gb)}`} />, and gathering that
            with the <InlineMath latex={`${fb}`} /> already outside the bracket leaves{" "}
            <InlineMath latex={`${coefficient}x ${tail(constant)}`} />.
          </>
        }
        onReveal={reveal}
        label="Reveal the composed formula"
        // The reveal explains the whole round, the substitution and both numbers, so what
        // remains is the rounds after it. False on the last, where the board is the gate.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath latex={`(f \\circ g)(x) = ${coefficient}x ${tail(constant)}`} />,
            one function in its own right. Composing the same two the other way round would
            give <InlineMath latex={`${ga * fa}x ${tail(ga * fb + gb)}`} />, which shares
            the term in <InlineMath latex="x" /> and nothing else.
          </>
        ) : (
          (feedback ??
          (called ? (
            <>
              Now multiply out and collect. The finished formula has one term in{" "}
              <InlineMath latex="x" /> and one constant.
            </>
          ) : (
            <>
              All three of these put one function inside the other. Only one of them puts
              the whole of <InlineMath latex="g" /> inside <InlineMath latex="f" />.
            </>
          )))
        )}
      </p>
    </div>
  );
}
