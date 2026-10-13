/**
 * EL.2 interactive (slide 2): build the rule a described reflection produces.
 *
 * Two blanks, and they sit IN the equation rather than in a row of boxes under it: the
 * coefficient's blank stands where the coefficient goes and the exponent's blank stands up in
 * the exponent, so the learner is writing the rule rather than filling a form about it. That
 * is the whole reason this is a builder and not a chip tap. Two chips per blank would be a
 * pair of coin tosses, and there are only two candidate signs and two candidate exponents; a
 * typed blank has no shortlist to work through.
 *
 * The two blanks are the two reflections, which is what makes the board one question rather
 * than two: a mirror over the $x$-axis is a minus sign on the OUTPUT and a mirror over the
 * $y$-axis is a minus sign on the INPUT, and every board asks for both blanks at once so the
 * learner has to decide which of the two the sentence described. The third board asks for
 * both mirrors together, which is the case that cannot be answered by pattern-matching one
 * sign to one word.
 *
 * `Check` judges the blanks together and settles each one that is right, so a board can be
 * half finished. `useWidgetSuccess()` fires once for each blank that newly comes good, not
 * once at the end. The reveal explains the FIRST blank still outstanding and passes a live
 * `othersRemain`, so being told about one blank hands the board back with the other still to
 * write; on the last outstanding blank the instance is spent, exactly as it should be.
 */

import { type CSSProperties, type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The coefficient of the rule the learner starts from. */
  a: number;
  /** Its base. */
  b: number;
  /** What was done to the graph, in the words the learner reads. */
  move: string;
  /** Whether the described move mirrors over the x-axis (a minus on the whole rule). */
  flipOutput: boolean;
  /** Whether it mirrors over the y-axis (a minus on the exponent). */
  flipInput: boolean;
  /** Why the coefficient blank holds what it holds. */
  whyCoefficient: ReactNode;
  /** Why the exponent blank holds what it holds. */
  whyExponent: ReactNode;
}

/**
 * Three boards. None reuses the CFU's rule, and the three differ in the coefficient, the base
 * and the move, so a restart is a different question rather than the same one renumbered.
 *
 * None reuses the WORKED EXAMPLE's rule either, and that is a separate check the first board
 * used to fail: it was $y = 5 \cdot 3^{x}$ mirrored over the $x$-axis, which is the
 * coefficient, the base and the move of the example directly above it, so the coefficient
 * blank held the answer step one of that example prints. Checking a board against the CFU
 * says nothing about the slide it sits on.
 */
const BOARDS: readonly Board[] = [
  {
    a: 2,
    b: 7,
    move: "reflected over the $x$-axis",
    flipOutput: true,
    flipInput: false,
    whyCoefficient: (
      <>
        A mirror over the <InlineMath latex="x" />
        -axis turns every output into its opposite, and the output is the whole right-hand
        side, so the minus sign goes in front of the coefficient.
      </>
    ),
    whyExponent: (
      <>
        Nothing was done to the input, so the exponent is left exactly as it was. A minus
        sign there would mirror the graph the other way instead.
      </>
    ),
  },
  {
    a: 4,
    b: 2,
    move: "reflected over the $y$-axis",
    flipOutput: false,
    flipInput: true,
    whyCoefficient: (
      <>
        A mirror over the <InlineMath latex="y" />
        -axis leaves every output alone and swaps which input produced it, so the
        coefficient keeps its sign.
      </>
    ),
    whyExponent: (
      <>
        The value at <InlineMath latex="x" /> has to become the old value at{" "}
        <InlineMath latex="-x" />, so the minus sign belongs on the exponent's variable.
      </>
    ),
  },
  {
    a: 6,
    b: 5,
    move: "reflected over the $x$-axis and then over the $y$-axis",
    flipOutput: true,
    flipInput: true,
    whyCoefficient: (
      <>
        One of the two mirrors acts on the output, so the whole right-hand side is negated
        and the coefficient carries a minus sign.
      </>
    ),
    whyExponent: (
      <>
        The other mirror acts on the input, so the exponent's variable carries a minus sign
        of its own. The two signs are doing different jobs and neither cancels the other.
      </>
    ),
  },
];

/** Both blanks, normalised so spacing and an explicit `+` never decide a correct answer. */
function tidy(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/^\+/, "");
}

export function ExpTransformBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <ExpTransformBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ExpTransformBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [coefficient, setCoefficient] = useState("");
  const [exponent, setExponent] = useState("");
  const [coefficientDone, setCoefficientDone] = useState(false);
  const [exponentDone, setExponentDone] = useState(false);
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const coefficientKey = board.flipOutput ? `-${board.a}` : `${board.a}`;
  const exponentKey = board.flipInput ? "-x" : "x";
  const solved = coefficientDone && exponentDone;

  /** The blank a reveal would explain: the first one still outstanding. */
  const outstanding: "coefficient" | "exponent" | null = !coefficientDone
    ? "coefficient"
    : !exponentDone
      ? "exponent"
      : null;
  const openCount = (coefficientDone ? 0 : 1) + (exponentDone ? 0 : 1);

  function settle(nextCoefficient: boolean, nextExponent: boolean) {
    if (nextCoefficient && nextExponent && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setTried(true);
    const coefficientOk = coefficientDone || tidy(coefficient) === tidy(coefficientKey);
    const exponentOk = exponentDone || tidy(exponent) === tidy(exponentKey);
    if (!coefficientDone && coefficientOk) {
      setCoefficientDone(true);
      success();
    }
    if (!exponentDone && exponentOk) {
      setExponentDone(true);
      success();
    }
    settle(coefficientOk, exponentOk);
    if (coefficientOk && exponentOk) {
      setFeedback(null);
      return;
    }
    setFeedback(
      !coefficientOk && !exponentOk
        ? "Neither blank is right yet. Decide which of the two a mirror acts on: the output, which is the whole right-hand side, or the input, which is the exponent."
        : !coefficientOk
          ? "The exponent is right. The coefficient is not: check whether the described mirror acts on the output as well."
          : "The coefficient is right. The exponent is not: check whether the described mirror acts on the input as well.",
    );
  }

  function reveal() {
    if (outstanding === null) {
      return;
    }
    setRevealed(true);
    setFeedback(null);
    if (outstanding === "coefficient") {
      setCoefficient(coefficientKey);
      setCoefficientDone(true);
      settle(true, exponentDone);
      return;
    }
    setExponent(exponentKey);
    setExponentDone(true);
    settle(coefficientDone, true);
  }

  /** A settled blank is read-only and shows what the learner wrote in it. */
  const slotStyle = (settled: boolean): CSSProperties => ({
    width: "4.25rem",
    textAlign: "center",
    color: settled ? CIVIC : LABEL,
    borderColor: settled ? CIVIC : undefined,
  });

  let status: ReactNode;
  if (revealed && !solved) {
    status = null;
  } else if (solved) {
    status = (
      <>
        A minus sign in front negates the output and hangs the curve below its asymptote; a
        minus sign on the exponent swaps the two sides of the graph. Neither one moves the
        asymptote off <InlineMath latex="y = 0" />.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else {
    status =
      "One blank holds the coefficient with whatever sign it now carries, and the other holds the exponent.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: finish the rule so it is the one whose graph is the described mirror image,
        with the coefficient and the exponent each carrying the sign the mirror gave it.
      </WidgetTask>

      <p className="lesson-interactive__step-label lesson-interactive__step-label--mixed">
        The graph of <InlineMath latex={`y = ${board.a} \\cdot ${board.b}^{x}`} /> is{" "}
        <MoveWords move={board.move} />.
      </p>

      {/* The equation, with the two blanks standing where their values go. */}
      <div className="lesson-interactive__field" style={{ color: SOFT }}>
        <InlineMath latex="y =" color={LABEL} />
        <input
          className="lesson-interactive__input"
          type="text"
          value={coefficient}
          readOnly={coefficientDone}
          aria-label="The coefficient in front of the power, with its sign"
          style={slotStyle(coefficientDone)}
          onChange={(event) => setCoefficient(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              check();
            }
          }}
          {...(outstanding === "coefficient" ? fill.entry(coefficientKey) : {})}
        />
        {/* The left operand is the input beside this, not part of the expression, so KaTeX would
            read a leading `\cdot` as an ordinary atom and set it flush against the base. The empty
            group gives it something to be binary against, which is what buys its own spacing. */}
        <InlineMath latex={`{}\\cdot ${board.b}`} color={LABEL} />
        <span style={{ display: "inline-flex", alignSelf: "flex-start" }}>
          <input
            className="lesson-interactive__input"
            type="text"
            value={exponent}
            readOnly={exponentDone}
            aria-label="The exponent, with its sign"
            style={{ ...slotStyle(exponentDone), width: "3.5rem", fontSize: "0.85rem" }}
            onChange={(event) => setExponent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                check();
              }
            }}
            {...(outstanding === "exponent" ? fill.entry(exponentKey) : {})}
          />
        </span>
      </div>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different mirror
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      {solved && (
        <p
          className="lesson-interactive__step-label lesson-interactive__step-label--mixed"
          style={{ color: CIVIC }}
        >
          <InlineMath
            latex={`y = ${coefficientKey} \\cdot ${board.b}^{${exponentKey}}`}
            color={CIVIC}
          />
        </p>
      )}

      <WidgetReveal
        available={tried && !solved}
        revealed={revealed}
        answer={
          outstanding === "coefficient" ? (
            <InlineMath latex={coefficientKey} />
          ) : (
            <InlineMath latex={exponentKey} />
          )
        }
        why={outstanding === "coefficient" ? board.whyCoefficient : board.whyExponent}
        onReveal={reveal}
        label={
          outstanding === "coefficient" ? "Reveal the coefficient" : "Reveal the exponent"
        }
        // One blank explained while the other is still open leaves something to finish, so the
        // board can be handed back; on the last one it cannot, or the reveal hands over the gate.
        othersRemain={openCount > 1}
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

/**
 * The move sentence, whose `$...$` spans are typeset rather than printed.
 *
 * The board's `move` carries axis names, and an axis name is math, so it cannot go through as
 * plain text. Splitting on the delimiters keeps the wording in one string beside the board it
 * belongs to instead of scattering it across a `ReactNode`.
 */
function MoveWords({ move }: { move: string }) {
  return (
    <>
      {move.split("$").map((part, index) =>
        index % 2 === 1 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the split is positional by nature
          <InlineMath key={`m${index}`} latex={part} />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: the split is positional by nature
          <span key={`w${index}`}>{part}</span>
        ),
      )}
    </>
  );
}
