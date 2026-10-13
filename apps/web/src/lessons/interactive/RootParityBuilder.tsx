/**
 * RAD.4 interactive (slide 1): TYPE the simplified form and decide the bars yourself.
 *
 * Three rounds over the same variable, chosen so the learner cannot settle on a rule that
 * only half works: the same radicand under an EVEN root and then an ODD root
 * (`sqrt(m^6)` needs bars, `cbrt(m^6)` does not), and finally an even root whose result
 * is an even power (`sqrt(m^8)`), which needs none either. So neither "even root means
 * bars" nor "roots never need bars" survives all three.
 *
 * The answer is free text, not a toggle, so there is nothing to guess at and the learner
 * rehearses the SAME notation the practice grader reads (`abs(m)` or `|m|`), shown in the
 * input's own placeholder and accessible name before the first attempt rather than after a
 * wrong verdict. A right power with the wrong bars is told apart from a wrong power, so the
 * feedback names which half is off. None of the three rounds is the paragraph's own example
 * (`cbrt(x^3) = x`).
 *
 * Each round that the learner lands fires the shared success signal once. Each round also
 * carries its own reveal, offered only after a real attempt; because the bars are the whole
 * point of the slide, that reveal explains the bars decision rather than just printing the
 * simplified form, and the same explanation is what a learner who answered correctly reads.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
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
  /** The rendered root, e.g. `\sqrt{m^{6}}`. */
  latex: string;
  /** Spoken description for the SVG label. */
  spoken: string;
  /** The exponent on the variable under the root. */
  radicandPower: number;
  /** The index of the root: 2 for a square root, 3 for a cube root. */
  index: number;
  /** `radicandPower / index`: the exponent that leaves the root. */
  resultPower: number;
  /** Normalized spellings that count as correct. */
  accepted: readonly string[];
  /** The canonical answer, revealed only after the round is solved. */
  solvedLatex: string;
  /** True when the simplified form needs absolute-value bars. */
  needsBars: boolean;
  /** Normalized spellings of "right power, wrong bars decision". */
  barsMiss: readonly string[];
}

interface Board {
  /** The variable under the root. */
  symbol: string;
  rounds: readonly Round[];
}

/**
 * Two boards of the same three shapes on different variables and powers: an even root whose
 * result is odd (bars), an odd root (no bars), and an even root whose result is even (no
 * bars). "Start over" hands out the board the learner has not just worked.
 */
const POOLS: readonly Board[] = [
  {
    symbol: "m",
    rounds: [
      {
        latex: "\\sqrt{m^{6}}",
        spoken: "the square root of m to the sixth",
        radicandPower: 6,
        index: 2,
        resultPower: 3,
        accepted: [
          "abs(m^3)",
          "|m^3|",
          "abs(m)^3",
          "|m|^3",
          "m^2abs(m)",
          "m^2*abs(m)",
          "m^2|m|",
          "m^2*|m|",
        ],
        solvedLatex: "\\left|m^{3}\\right|",
        needsBars: true,
        barsMiss: ["m^3"],
      },
      {
        latex: "\\sqrt[3]{m^{6}}",
        spoken: "the cube root of m to the sixth",
        radicandPower: 6,
        index: 3,
        resultPower: 2,
        accepted: ["m^2", "abs(m^2)", "|m^2|", "abs(m)^2", "|m|^2", "m*m", "mm"],
        solvedLatex: "m^{2}",
        needsBars: false,
        barsMiss: [],
      },
      {
        latex: "\\sqrt{m^{8}}",
        spoken: "the square root of m to the eighth",
        radicandPower: 8,
        index: 2,
        resultPower: 4,
        accepted: ["m^4", "abs(m^4)", "|m^4|", "abs(m)^4", "|m|^4"],
        solvedLatex: "m^{4}",
        needsBars: false,
        barsMiss: [],
      },
    ],
  },
  {
    symbol: "w",
    rounds: [
      {
        latex: "\\sqrt{w^{10}}",
        spoken: "the square root of w to the tenth",
        radicandPower: 10,
        index: 2,
        resultPower: 5,
        accepted: [
          "abs(w^5)",
          "|w^5|",
          "abs(w)^5",
          "|w|^5",
          "w^4abs(w)",
          "w^4*abs(w)",
          "w^4|w|",
          "w^4*|w|",
        ],
        solvedLatex: "\\left|w^{5}\\right|",
        needsBars: true,
        barsMiss: ["w^5"],
      },
      {
        latex: "\\sqrt[3]{w^{12}}",
        spoken: "the cube root of w to the twelfth",
        radicandPower: 12,
        index: 3,
        resultPower: 4,
        accepted: ["w^4", "abs(w^4)", "|w^4|", "abs(w)^4", "|w|^4"],
        solvedLatex: "w^{4}",
        needsBars: false,
        barsMiss: [],
      },
      {
        latex: "\\sqrt{w^{4}}",
        spoken: "the square root of w to the fourth",
        radicandPower: 4,
        index: 2,
        resultPower: 2,
        accepted: ["w^2", "abs(w^2)", "|w^2|", "abs(w)^2", "|w|^2", "w*w", "ww"],
        solvedLatex: "w^{2}",
        needsBars: false,
        barsMiss: [],
      },
    ],
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Why this round's answer does or does not carry absolute-value bars. One passage, read
 * both by the learner who answered it and by the learner who revealed it, so the two never
 * drift apart.
 */
function barsReason(round: Round, symbol: string) {
  if (round.index % 2 === 1) {
    return (
      <>
        The index is odd, and an odd root keeps the sign of whatever sits under it, so it is
        allowed to hand back a negative and the bars would have nothing to correct.
      </>
    );
  }
  if (round.resultPower % 2 === 1) {
    return (
      <>
        The index is even, so this root never hands back a negative, but{" "}
        <InlineMath latex={`${symbol}^{${round.resultPower}}`} /> is negative whenever{" "}
        <InlineMath latex={symbol} /> is negative. The absolute value bars are what keep the
        two sides equal.
      </>
    );
  }
  return (
    <>
      The index is even, so this root never hands back a negative, and{" "}
      <InlineMath latex={`${symbol}^{${round.resultPower}}`} /> is an even power, which is
      never negative on its own. There is nothing for bars to correct, so they are left off.
    </>
  );
}

export function RootParityBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const board = POOLS[variant.index] ?? (POOLS[0] as Board);
  return (
    <RootParityBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RootParityBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { symbol, rounds } = board;
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState("");
  const [solved, setSolved] = useState(false);
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[index] ?? (rounds[0] as Round);
  const lastIndex = rounds.length - 1;
  const isLast = index === lastIndex;

  /**
   * The answer in the SYNTAX THIS BOX TAKES, which is not the LaTeX the passage prints.
   *
   * One expression, spent by both the widget's own reveal and the fill above the re-ask, so
   * the value handed over cannot drift from the value written in. It is `accepted`'s first
   * spelling by construction: bars where the round needs them, the halved exponent either
   * way.
   */
  const answerAsTyped = round.needsBars
    ? `|${symbol}^${round.resultPower}|`
    : `${symbol}^${round.resultPower}`;

  /** Close this round out. `earned` is false when the learner revealed it instead. */
  function finishRound(earned: boolean) {
    setSolved(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLast && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    const typed = normalize(entry);
    if (typed === "") {
      setFeedback("The box is empty. Write the simplified form before you check it.");
      return;
    }
    if (round.accepted.includes(typed)) {
      finishRound(true);
      return;
    }
    setTried(true);
    if (round.barsMiss.includes(typed)) {
      setFeedback(
        `The power is right, but that expression is negative whenever ${symbol} is negative, and an even root never hands back a negative, so this one needs bars.`,
      );
      return;
    }
    if (!round.needsBars && (typed.includes("abs(") || typed.includes("|"))) {
      setFeedback(
        "The bars are not what is off here, so check the power instead. Divide the exponent under the root by the index of the root.",
      );
      return;
    }
    setFeedback(
      "Not quite. Divide the exponent under the root by the index of the root to get the power that leaves, then ask whether that power could come out negative.",
    );
  }

  function reveal() {
    setEntry(answerAsTyped);
    setRevealed(true);
    finishRound(false);
  }

  function nextRound() {
    if (index < lastIndex) {
      setIndex(index + 1);
      setEntry("");
      setSolved(false);
      setTried(false);
      setRevealed(false);
      setFeedback(null);
    }
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Simplify each of these roots, and settle for each one whether its answer needs
        absolute value bars.
      </WidgetTask>

      <svg
        viewBox="0 0 440 160"
        role="img"
        aria-label={`${round.spoken}, beside the box where its simplified form goes`}
      >
        <title>Simplify a root of a variable power</title>

        <text x={220} y={18} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${index + 1} of ${rounds.length}`}
        </text>

        <rect
          x={54}
          y={44}
          width={150}
          height={54}
          rx={10}
          fill={LINE}
          fillOpacity={0.12}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <SvgMath latex={round.latex} x={129} y={71} fontSize={24} color={LABEL} w={150} />

        <SvgMath latex="=" x={220} y={71} fontSize={20} color={SOFT} w={30} />

        <rect
          x={236}
          y={44}
          width={150}
          height={54}
          rx={10}
          fill={CIVIC}
          fillOpacity={solved ? 0.16 : 0.05}
          stroke={solved ? CIVIC : LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={solved ? round.solvedLatex : "?"}
          x={311}
          y={71}
          fontSize={24}
          color={solved ? LABEL : SOFT}
          w={150}
        />

        <text x={220} y={130} textAnchor="middle" fontSize={11} fill={SOFT}>
          {`${symbol} could be positive or negative`}
        </text>
      </svg>

      {solved ? (
        isLast ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different variable
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new root
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${round.latex} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              /* Wide enough for the placeholder below, which is the widget teaching its own
                 input syntax and so has to be readable in full. At 9rem Chromium gave the
                 text 126px of a needed 132px and clipped the closing bar, which reads as a
                 truncated string and teaches `|m`: an unbalanced entry the comparator
                 rejects with no explanation. Pinned by `widgetPlaceholderFit`, which
                 measures the two rather than trusting this number. */
              style={{ width: "10.5rem" }}
              type="text"
              value={entry}
              aria-label={`Simplified form of ${round.spoken}, with a power written as ${symbol}^2 and an absolute value written as abs(${symbol}) or |${symbol}|`}
              autoComplete="off"
              placeholder={`e.g. ${symbol}^2 or |${symbol}|`}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. One root to simplify per round, so this box is the blank.
              {...fill.entry(answerAsTyped)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Simplify it
          </button>
        </div>
      )}

      <WidgetReveal
        available={tried && !solved}
        revealed={revealed}
        answer={<InlineMath latex={round.solvedLatex} />}
        why={
          <>
            Dividing the exponent {round.radicandPower} under the root by the index{" "}
            {round.index} leaves <InlineMath latex={`${symbol}^{${round.resultPower}}`} />.{" "}
            {barsReason(round, symbol)}
          </>
        }
        onReveal={reveal}
        // One root to simplify per round, so what is left after this one is explained is the
        // rounds after it. False on the last round, which is the one the gate turns on.
        othersRemain={!isLast}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath latex={`${round.latex} = ${round.solvedLatex}`} />.{" "}
            {barsReason(round, symbol)}
          </>
        ) : feedback ? (
          feedback
        ) : (
          "Write the simplified form of this root, and decide as you go whether the answer needs absolute value bars."
        )}
      </p>
    </div>
  );
}
