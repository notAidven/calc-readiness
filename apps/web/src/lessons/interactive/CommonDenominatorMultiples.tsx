/**
 * NUM.F interactive (slide 2): find the least common denominator by tapping through the
 * multiples. Two rows of chips list the multiples of each denominator; the learner taps the
 * first value that appears in BOTH rows. Then the learner TYPES the two rewritten numerators;
 * only once that rewrite is produced is the sum shown and the lesson gate opened.
 *
 * Three answers per board, and they settle independently: the denominator, then a numerator
 * each. The reveal explains whichever one is still open and says so, so a learner who is
 * stuck on the second rewrite does not lose the first one to reading about it.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SIGNAL_DEEP, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Board {
  /** The first fraction. */
  an: number;
  ad: number;
  /** The second. */
  bn: number;
  bd: number;
  /** The multiples ladder each denominator is read down. */
  multsA: readonly number[];
  multsB: readonly number[];
}

/**
 * Two sums, neither of them the slide's own $\tfrac{3}{8} + \tfrac{5}{12}$.
 *
 * They ask genuinely different things of the ladder. On the first, both denominators divide
 * into a common multiple that is also their product, and the ladders share a second value
 * ($24$) so the "least" in "least common denominator" has something to be least OF. On the
 * second the rewrite is the harder half: $\tfrac{3}{5}$ scales by $4$, so a learner who has
 * been copying numerators across is stopped.
 */
const BOARDS: readonly Board[] = [
  {
    an: 1,
    ad: 3,
    bn: 1,
    bd: 4,
    multsA: [3, 6, 9, 12, 15, 18, 21, 24],
    multsB: [4, 8, 12, 16, 20, 24],
  },
  {
    an: 1,
    ad: 4,
    bn: 3,
    bd: 5,
    multsA: [4, 8, 12, 16, 20, 24, 28, 32],
    multsB: [5, 10, 15, 20, 25, 30],
  },
];

/** Display-style fraction for the diagram; \tfrac stays compact in the control rows. */
const frac = (n: number, d: number) => `\\dfrac{${n}}{${d}}`;
const tfrac = (n: number, d: number) => `\\tfrac{${n}}{${d}}`;

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** One fraction bar split into `parts`, with `filled` cells shaded. */
function Bar({
  x,
  y,
  w,
  parts,
  filled,
  color,
}: {
  x: number;
  y: number;
  w: number;
  parts: number;
  filled: number;
  color: string;
}) {
  const h = 26;
  const cell = w / parts;
  return (
    <g>
      {Array.from({ length: parts }, (_, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid of equal cells
          key={i}
          x={x + i * cell}
          y={y}
          width={cell}
          height={h}
          fill={i < filled ? color : "var(--paper)"}
          fillOpacity={i < filled ? 0.3 : 1}
          stroke={LINE}
          strokeWidth={1}
        />
      ))}
    </g>
  );
}

export function CommonDenominatorMultiples(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <CommonDenominatorBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CommonDenominatorBody({
  board: { an, ad, bn, bd, multsA, multsB },
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [aVal, setAVal] = useState("");
  const [bVal, setBVal] = useState("");
  const [aDone, setADone] = useState(false);
  const [bDone, setBDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const LCD = (ad * bd) / gcd(ad, bd);
  const A_NUM = (LCD / ad) * an;
  const B_NUM = (LCD / bd) * bn;
  const SUM_NUM = A_NUM + B_NUM;
  const isCommon = (v: number) => v % ad === 0 && v % bd === 0;

  /** The full rewrite chain, shown in the diagram and echoed in the status line. */
  const SUM_LATEX = `${frac(an, ad)} + ${frac(bn, bd)} = ${frac(A_NUM, LCD)} + ${frac(
    B_NUM,
    LCD,
  )} = ${frac(SUM_NUM, LCD)}`;

  const lcdPicked = picked === LCD;
  const solved = aDone && bDone;

  /**
   * What the reveal is about, and whether anything else is still outstanding.
   *
   * Both read live. The board asks three things in order, so `othersRemain` is false only on
   * the reveal that explains the LAST of them: at that point the answer being explained is
   * the gate, and handing the board back would be handing the gate over with it.
   */
  const explaining: "lcd" | "a" | "b" = !lcdPicked ? "lcd" : aDone ? "b" : "a";
  const othersRemain = explaining === "lcd" || (explaining === "a" && !bDone);

  /** Close the board out. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setPicked(LCD);
    setADone(true);
    setBDone(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function tap(v: number) {
    if (solved) {
      return;
    }
    setPicked(v);
    setFeedback(null);
    if (v !== LCD) {
      setAttempted(true);
      // A different denominator is a different rewrite, so no settled numerator survives it.
      setAVal("");
      setBVal("");
      setADone(false);
      setBDone(false);
      return;
    }
    if (!lcdPicked) {
      success();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    if (!lcdPicked) {
      setFeedback("First tap the least common denominator above.");
      return;
    }
    // The two numerators are separate rewrites, so they settle separately: getting one right
    // and the other wrong keeps the one that landed.
    const nextA = aDone || Number(aVal.trim()) === A_NUM;
    const nextB = bDone || Number(bVal.trim()) === B_NUM;
    setADone(nextA);
    setBDone(nextB);
    // One badge per numerator that just landed, so checking a second time is silent.
    if ((nextA && !aDone) || (nextB && !bDone)) {
      success();
    }
    if (nextA && nextB) {
      setFeedback(null);
      if (!done) {
        setDone(true);
        onSolved();
      }
      return;
    }
    const open = nextA ? { n: bn, d: bd } : { n: an, d: ad };
    setFeedback(
      nextA || nextB ? (
        <>
          That numerator is right. Now, how many <InlineMath latex={String(LCD)} />
          ths equal <InlineMath latex={tfrac(open.n, open.d)} />?
        </>
      ) : (
        <>
          Rewrite each fraction over <InlineMath latex={String(LCD)} />: how many{" "}
          <InlineMath latex={String(LCD)} />
          ths equal <InlineMath latex={tfrac(an, ad)} />? How many equal{" "}
          <InlineMath latex={tfrac(bn, bd)} />?
        </>
      ),
    );
  }

  function reveal() {
    setAVal(String(A_NUM));
    setBVal(String(B_NUM));
    setRevealed(true);
    finish(false);
  }

  function chipState(v: number): "solved" | "wrong" | undefined {
    if (picked !== v) {
      return undefined;
    }
    return v === LCD ? "solved" : "wrong";
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Yes: <InlineMath latex={SUM_LATEX} />.
      </>
    );
  } else if (lcdPicked) {
    status = feedback ?? (
      <>
        Good. <InlineMath latex={String(LCD)} /> is the least common denominator. Now
        rewrite each fraction over <InlineMath latex={String(LCD)} /> and type the
        numerators.
      </>
    );
  } else if (picked === null) {
    status = (
      <>
        Tap the first number that appears in BOTH rows: the least common denominator of{" "}
        <InlineMath latex={String(ad)} /> and <InlineMath latex={String(bd)} />.
      </>
    );
  } else if (isCommon(picked)) {
    status = (
      <>
        <InlineMath latex={String(picked)} /> works, but a smaller shared multiple keeps the
        numbers small. Find the first one in both rows.
      </>
    );
  } else {
    status = (
      <>
        <InlineMath latex={String(picked)} /> is not in both rows. Look for a value that is
        a multiple of both <InlineMath latex={String(ad)} /> and{" "}
        <InlineMath latex={String(bd)} />.
      </>
    );
  }

  const statusState = solved
    ? "solved"
    : feedback || (picked !== null && !lcdPicked)
      ? "wrong"
      : "prompt";

  /**
   * A multiples row, with the LCD chip dashed while the reveal is naming it.
   *
   * ONE NEUTRAL TOKEN ON BOTH LADDERS. The rows used to be tinted to match their bars,
   * `--signal` for the first and `--civic` for the second, and the second is the correctness
   * colour: every multiple of the lower denominator arrived green before the learner had
   * tapped anything (R26). On this board that is not merely spending the channel, it is
   * pointing — the answer they are hunting is the first value that appears in BOTH ladders,
   * so it is one of the green ones by construction. Which row a chip belongs to is said in
   * words by the label beside it, and the verdict on a tap is still `data-state`, which the
   * stylesheet paints and an inline colour here must not pre-empt.
   */
  function chips(values: readonly number[], denominator: number) {
    return (
      <div className="lesson-interactive__controls">
        <span className="lesson-interactive__select-label">
          Multiples of <InlineMath latex={String(denominator)} />
        </span>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            className="lesson-interactive__chip"
            style={{
              color: LABEL,
              borderColor: v === LCD && fill.given ? SIGNAL_DEEP : undefined,
              borderStyle: v === LCD && fill.given ? "dashed" : undefined,
            }}
            data-state={chipState(v)}
            aria-label={String(v)}
            aria-pressed={picked === v}
            onClick={() => tap(v)}
            {...fill.mark(v === LCD)}
          >
            <InlineMath latex={String(v)} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--multiples">
      {/* 10 units taller than the flat-text version: the stacked \dfrac rewrite chain
          needs the extra room under the two bars. */}
      <svg
        viewBox="0 0 440 160"
        role="img"
        aria-label={`Add ${an} over ${ad} and ${bn} over ${bd}`}
      >
        <title>
          Least common denominator for {an}/{ad} + {bn}/{bd}
        </title>
        {solved ? (
          <>
            <Bar x={40} y={26} w={150} parts={LCD} filled={A_NUM} color={SIGNAL} />
            <SvgMath
              latex={frac(A_NUM, LCD)}
              x={210}
              y={39}
              anchor="start"
              fontSize={16}
              color={LABEL}
              w={120}
            />
            <Bar x={40} y={70} w={150} parts={LCD} filled={B_NUM} color={CIVIC} />
            <SvgMath
              latex={frac(B_NUM, LCD)}
              x={210}
              y={83}
              anchor="start"
              fontSize={16}
              color={LABEL}
              w={120}
            />
            <SvgMath latex={SUM_LATEX} x={220} y={132} fontSize={18} color={CIVIC} />
          </>
        ) : (
          <SvgMath
            latex={`${frac(an, ad)} + ${frac(bn, bd)}`}
            x={220}
            y={80}
            fontSize={24}
            color={LABEL}
          />
        )}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different sum
        </button>
      ) : lcdPicked ? (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: SIGNAL }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${tfrac(an, ad)} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              value={aDone ? String(A_NUM) : aVal}
              disabled={aDone}
              aria-label={`numerator of ${an}/${ad} rewritten over ${LCD}`}
              onChange={(e) => setAVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              // Only the rewrite the passage is explaining is filled in; the other one is
              // still the learner's to produce, which is what `othersRemain` promised them.
              {...(explaining === "a" ? fill.entry(A_NUM) : {})}
            />
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`/ ${LCD}`} />
            </span>
          </div>
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${tfrac(bn, bd)} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              value={bDone ? String(B_NUM) : bVal}
              disabled={bDone}
              aria-label={`numerator of ${bn}/${bd} rewritten over ${LCD}`}
              onChange={(e) => setBVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
              {...(explaining === "b" ? fill.entry(B_NUM) : {})}
            />
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`/ ${LCD}`} />
            </span>
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      ) : (
        <>
          {chips(multsA, ad)}
          {chips(multsB, bd)}
        </>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        othersRemain={othersRemain}
        answer={
          explaining === "lcd" ? (
            <InlineMath latex={String(LCD)} />
          ) : explaining === "a" ? (
            <InlineMath latex={frac(A_NUM, LCD)} />
          ) : (
            <InlineMath latex={frac(B_NUM, LCD)} />
          )
        }
        why={
          explaining === "lcd" ? (
            <>
              Read the two ladders together and stop at the first value that appears in
              both: the multiples of <InlineMath latex={String(ad)} /> reach{" "}
              <InlineMath latex={String(LCD)} /> and so do the multiples of{" "}
              <InlineMath latex={String(bd)} />. Any later shared value would work as a
              denominator too, but it counts the whole in smaller pieces than it has to, and
              the numbers get bigger for nothing.
            </>
          ) : (
            <>
              Rewriting over <InlineMath latex={String(LCD)} /> means scaling the fraction,
              not just its bottom: {explaining === "a" ? ad : bd} goes into {LCD}{" "}
              <InlineMath latex={String(explaining === "a" ? LCD / ad : LCD / bd)} /> times,
              so the numerator is scaled by the same amount.{" "}
              <InlineMath
                latex={
                  explaining === "a"
                    ? `${frac(an, ad)} = \\dfrac{${an} \\times ${LCD / ad}}{${ad} \\times ${LCD / ad}} = ${frac(A_NUM, LCD)}`
                    : `${frac(bn, bd)} = \\dfrac{${bn} \\times ${LCD / bd}}{${bd} \\times ${LCD / bd}} = ${frac(B_NUM, LCD)}`
                }
              />
              . Multiplying top and bottom by the same number leaves the value alone.
            </>
          )
        }
        onReveal={reveal}
      />

      <p className="lesson-interactive__status" data-state={statusState} aria-live="polite">
        {revealed ? null : status}
      </p>
    </div>
  );
}
