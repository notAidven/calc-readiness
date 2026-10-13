/**
 * FUN.8 interactive (slide 1): build the inverse rule by swapping and solving.
 *
 * Three rows, one open at a time, and each blank sits in the position of the value it holds
 * rather than in a row of boxes under the working. The swap is the first blank on purpose:
 * writing $y$ where $x$ stood is the whole move, and a learner who watches it happen has not
 * been asked the question.
 *
 * The last blank takes the constant WITH ITS SIGN, so the sign flip is the thing being
 * judged. Printing the operator and asking only for the digit would have left nothing to
 * decide, since the digit is already on screen in the rule above.
 *
 * The diagram carries the notation caution, because this is the slide where a learner first
 * meets the superscript: $f^{-1}$ is not a reciprocal, and the two are set side by side so
 * the difference is on screen while the rule is being built.
 *
 * Three rules rotate on restart, one of them subtracting inside the numerator, so the sign
 * flip runs both ways. None of their numbers appears in the check or in the practice bank.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  type RevealFilledEntry,
  type RevealFillProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Rule {
  /** The denominator the whole numerator sits over. */
  a: number;
  /** The size of the constant inside the numerator. */
  c: number;
  /** True when the numerator ADDS that constant, so the inverse subtracts it. */
  adds: boolean;
}

const RULES: readonly Rule[] = [
  { a: 2, c: 6, adds: true },
  { a: 3, c: 8, adds: false },
  { a: 5, c: 9, adds: true },
];

function ruleAt(index: number): Rule {
  return RULES[index] ?? RULES[0] ?? { a: 2, c: 1, adds: true };
}

function parseInteger(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "")
    .replace(/^\+/, "");
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : null;
}

/** `- 6` or `+ 8`, the constant term of the inverse as it reads in the finished rule. */
function signedTermTex(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/**
 * The numerator's `+ 6`, as a term CONTINUING an expression rather than a signed number.
 *
 * KaTeX discards the literal space and then reads an operator with nothing to its left as a SIGN,
 * so `+ 6` typesets as the number "+6" with no gap at all and the sign hugs the digit. Here the
 * thing to its left is the swap blank, which is an `<input>` and so cannot be inside the math, and
 * that is exactly the case the leading `{}` is for: an empty group gives the operator a left
 * operand, KaTeX classes it as a binary operator, and the medium space either side of it comes
 * back. Fixed in the LaTeX rather than with a JSX gap or a margin, because the gap wanted is
 * KaTeX's own operator spacing at whatever size the row is set in.
 *
 * `signedTermTex` above deliberately does NOT do this: every one of its uses IS a signed number —
 * the constant a learner types, the answer a reveal prints back, the `2x - 6` where the `2x` in
 * front already makes the operator binary — and a space there would be wrong.
 */
function continuingTermTex(adds: boolean, size: number): string {
  return `{}${adds ? "+" : "-"} ${size}`;
}

/** One blank, in the position of the value it holds. Only the open row is focusable. */
function Slot({
  state,
  value,
  settled,
  aria,
  color,
  given,
  onChange,
  onEnter,
}: {
  state: "locked" | "open" | "done";
  value: string;
  settled: string;
  aria: string;
  color: string;
  given: RevealFilledEntry | RevealFillProps;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (state === "done") {
    return (
      <span className="lesson-equation__slot lesson-equation__slot--done" style={{ color }}>
        <InlineMath latex={settled} />
      </span>
    );
  }
  if (state === "locked") {
    return <span className="lesson-equation__slot lesson-equation__slot--locked" />;
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color }}
      type="text"
      inputMode="text"
      value={value}
      aria-label={aria}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
      {...given}
    />
  );
}

/** A fraction whose numerator is a row of slots and math. */
function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="lesson-equation__frac">
      <span className="lesson-equation__part">{top}</span>
      <span className="lesson-equation__bar" />
      <span className="lesson-equation__part">{bottom}</span>
    </span>
  );
}

function Stage({
  name,
  state,
  onCheck,
  children,
}: {
  name: string;
  state: "locked" | "open" | "done";
  onCheck: () => void;
  children: ReactNode;
}) {
  return (
    <div className="lesson-equation__row" data-state={state}>
      <span className="lesson-equation__stage">{name}</span>
      <span className="lesson-equation__body">{children}</span>
      {state === "open" ? (
        <button type="button" className="lesson-interactive__check" onClick={onCheck}>
          Check
        </button>
      ) : null}
    </div>
  );
}

export function InverseBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(RULES.length, props);
  return (
    <InverseBuildBody
      key={variant.nonce}
      rule={ruleAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function InverseBuildBody({
  rule,
  onSolved,
  onRestart,
}: {
  rule: Rule;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { a, c, adds } = rule;
  const insideTex = `x ${adds ? "+" : "-"} ${c}`;
  const swappedTex = `y ${adds ? "+" : "-"} ${c}`;
  const forwardTex = `\\dfrac{${insideTex}}{${a}}`;
  /** The inverse's constant term: the numerator's constant, with its sign turned over. */
  const constant = adds ? -c : c;

  /** 0 swap, 1 clear the bar, 2 isolate, 3 done. */
  const [stage, setStage] = useState(0);
  const [swapEntry, setSwapEntry] = useState("");
  const [clearEntry, setClearEntry] = useState("");
  const [isolateEntry, setIsolateEntry] = useState("");
  const [missed, setMissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = stage >= 3;

  function stageState(which: number): "locked" | "open" | "done" {
    if (stage > which) {
      return "done";
    }
    return stage === which ? "open" : "locked";
  }

  function advance(earned: boolean) {
    const next = stage + 1;
    setStage(next);
    setMissed(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= 3) {
      onSolved();
    }
  }

  function miss(note: ReactNode) {
    setRevealed(false);
    setMissed(true);
    setFeedback(note);
  }

  function checkSwap() {
    if (swapEntry.trim().toLowerCase() === "y") {
      setRevealed(false);
      advance(true);
      return;
    }
    miss(
      <>
        Not yet. Swapping means every <InlineMath latex="x" /> in the rule becomes a{" "}
        <InlineMath latex="y" /> and every <InlineMath latex="y" /> becomes an{" "}
        <InlineMath latex="x" />, so the numerator holds the other variable now.
      </>,
    );
  }

  function checkClear() {
    if (parseInteger(clearEntry) === a) {
      setRevealed(false);
      advance(true);
      return;
    }
    miss(
      <>
        Not yet. The bar divides the whole numerator, so undo it by multiplying BOTH sides
        by the denominator <InlineMath latex={String(a)} />.
      </>,
    );
  }

  function checkIsolate() {
    const typed = parseInteger(isolateEntry);
    if (typed === constant) {
      setRevealed(false);
      advance(true);
      return;
    }
    if (typed === -constant) {
      miss(
        <>
          Right size, wrong sign. The numerator {adds ? "added" : "subtracted"} it, so
          getting <InlineMath latex="y" /> on its own {adds ? "subtracts" : "adds"} it back.
        </>,
      );
      return;
    }
    miss(
      <>
        Not yet. Type the constant term of the inverse with its sign, for example{" "}
        <InlineMath latex="-4" /> or <InlineMath latex="+4" />.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    advance(false);
  }

  const revealAnswer =
    stage === 0 ? (
      <InlineMath latex="y" />
    ) : stage === 1 ? (
      <InlineMath latex={String(a)} />
    ) : (
      <InlineMath latex={signedTermTex(constant)} />
    );

  const revealWhy =
    stage === 0 ? (
      <>
        The inverse reads the same pairing the other way round, and swapping the two
        variables is how that is written down. Every <InlineMath latex="x" /> becomes a{" "}
        <InlineMath latex="y" />, so the numerator now holds{" "}
        <InlineMath latex={swappedTex} />.
      </>
    ) : stage === 1 ? (
      <>
        The whole numerator sits over <InlineMath latex={String(a)} />, so multiplying both
        sides by <InlineMath latex={String(a)} /> clears the bar in one move and leaves{" "}
        <InlineMath latex={`${a}x = ${swappedTex}`} />.
      </>
    ) : (
      <>
        The numerator {adds ? "added" : "subtracted"} <InlineMath latex={String(c)} />, so
        the step that leaves <InlineMath latex="y" /> alone {adds ? "subtracts" : "adds"} it
        on both sides. That turns the sign over, which is why the inverse ends{" "}
        <InlineMath latex={signedTermTex(constant)} />.
      </>
    );

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Built: <InlineMath latex={`f^{-1}(x) = ${a}x ${signedTermTex(constant)}`} />. Swap,
        then solve for <InlineMath latex="y" />, and the undo steps fall out in order.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 0) {
    status = (
      <>
        Start with <InlineMath latex={`y = ${forwardTex}`} /> and trade the two variables.
      </>
    );
  } else if (stage === 1) {
    status = <>Now get rid of the bar, so nothing is divided any more.</>;
  } else {
    status = (
      <>
        Last step: leave <InlineMath latex="y" /> on its own, and type the constant term
        with its sign.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Turn this rule into its inverse, one line at a time, and finish with a rule for{" "}
        <InlineMath latex="f^{-1}(x)" />.
      </WidgetTask>

      <svg
        viewBox="0 0 440 108"
        role="img"
        aria-label={`The rule f of x equals x ${adds ? "plus" : "minus"} ${c}, all over ${a}, beside a reminder that f inverse is not one over f`}
      >
        <title>The rule, and the notation caution</title>
        <SvgMath
          latex={`f(x) = ${forwardTex}`}
          x={220}
          y={34}
          fontSize={22}
          color={LABEL}
          h={72}
        />
        <SvgMath
          latex="f^{-1}(x) \ne \dfrac{1}{f(x)}"
          x={220}
          y={84}
          fontSize={16}
          color={BRICK}
          h={56}
        />
      </svg>

      <div className="lesson-equation">
        <Stage name="swap" state={stageState(0)} onCheck={checkSwap}>
          <InlineMath latex="x =" />
          <Frac
            top={
              <>
                <Slot
                  state={stageState(0)}
                  value={swapEntry}
                  settled="y"
                  aria="the variable that takes the place of x in the numerator"
                  color={SIGNAL}
                  given={stage === 0 ? fill.entry("y") : {}}
                  onChange={setSwapEntry}
                  onEnter={checkSwap}
                />
                <InlineMath latex={continuingTermTex(adds, c)} />
              </>
            }
            bottom={<InlineMath latex={String(a)} />}
          />
        </Stage>

        <Stage name="clear the bar" state={stageState(1)} onCheck={checkClear}>
          <Slot
            state={stageState(1)}
            value={clearEntry}
            settled={String(a)}
            aria="the number both sides are multiplied by"
            color={CIVIC}
            given={stage === 1 ? fill.entry(a) : {}}
            onChange={setClearEntry}
            onEnter={checkClear}
          />
          <InlineMath latex={`x = ${swappedTex}`} />
        </Stage>

        <Stage name="isolate" state={stageState(2)} onCheck={checkIsolate}>
          <InlineMath latex={`f^{-1}(x) = ${a}x`} />
          <Slot
            state={stageState(2)}
            value={isolateEntry}
            settled={signedTermTex(constant)}
            aria="the constant term of the inverse, with its sign"
            color={CIVIC}
            given={stage === 2 ? fill.entry(constant) : {}}
            onChange={setIsolateEntry}
            onEnter={checkIsolate}
          />
        </Stage>
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different rule
        </button>
      )}

      <WidgetReveal
        available={missed && !solved}
        revealed={revealed && !solved}
        answer={revealAnswer}
        why={revealWhy}
        onReveal={reveal}
        label="Reveal this line"
        othersRemain={stage < 2}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
