/**
 * LF.3 interactive (slide 2): build the model from a table, then test it on a row the
 * table kept back.
 *
 * Three beats in the order the skill is actually performed. The rate comes first, from
 * two rows whose inputs step by more than one, so dividing by the input gap is forced
 * rather than optional. The starting value comes second, walked back to the row the
 * table never contains. Only then does the model appear, and the third row's output,
 * hidden as a question mark until now, is predicted from it and revealed.
 *
 * Round two drains instead of filling, so the rate is negative and the "output falls"
 * sign check is a real one. Neither round is used by the CFU or the practice bank.
 *
 * All three beats are typed numbers, and nothing bounds a number field: a learner who has
 * divided by the wrong gap can retype forever without the board narrowing. So each beat
 * carries a reveal that teaches that beat. While beats are still owed the board is handed
 * back rather than spent, since a reveal on the rate must not cost the learner the two
 * beats they have not reached yet.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Round {
  /** The model the table was generated from. */
  m: number;
  b: number;
  /** The three inputs; the third row's output stays hidden until it is predicted. */
  xs: readonly [number, number, number];
  /** Column headers, as LaTeX (the unit words ride inside a `\text`). */
  xHeader: string;
  yHeader: string;
  /** The whole board read aloud, for the SVG's accessible description. */
  spoken: string;
  /** Whether the quantity grows or falls, for the sign correction. */
  rising: boolean;
}

const ROUNDS: readonly Round[] = [
  {
    m: 4,
    b: 7,
    xs: [3, 5, 8],
    xHeader: "x \\text{ (days)}",
    yHeader: "y \\text{ (dollars)}",
    spoken:
      "A table of rental cost by days: 3 days costs 19 dollars, 5 days costs 27 dollars, and 8 days is unknown",
    rising: true,
  },
  {
    m: -6,
    b: 50,
    xs: [2, 4, 7],
    xHeader: "x \\text{ (minutes)}",
    yHeader: "y \\text{ (liters)}",
    spoken:
      "A table of liters left by minutes: 2 minutes leaves 38 liters, 4 minutes leaves 26 liters, and 7 minutes is unknown",
    rising: false,
  },
];

function roundAt(index: number): Round {
  return ROUNDS[index % ROUNDS.length] ?? (ROUNDS[0] as Round);
}

/** Read a typed number, tolerating spaces, a decimal, a slash fraction, or a minus. */
function parseNumber(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/\u2212/g, "-");
  if (cleaned.length === 0) {
    return null;
  }
  const asFraction = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(cleaned);
  if (asFraction) {
    const top = Number(asFraction[1]);
    const bottom = Number(asFraction[2]);
    if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom === 0) {
      return null;
    }
    return top / bottom;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function near(x: number, y: number): boolean {
  return Math.abs(x - y) < 1e-6;
}

/** A signed value with negatives parenthesized, for a product like `38 - (-6)(2)`. */
function sp(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** A coefficient on `x`, e.g. `4x` or `-6x`. */
function rateTermTex(m: number): string {
  return m === 1 ? "x" : m === -1 ? "-x" : `${m}x`;
}

const TABLE_X = 28;
const TABLE_Y = 16;
const TABLE_RIGHT = 218;
const TABLE_BOTTOM = 152;
const DIVIDER_X = 122;
const HEADER_UNDERLINE_Y = 52;
const COL_X_CENTER = 74;
const COL_Y_CENTER = 170;
const HEADER_Y = 34;
const ROW_YS = [76, 104, 132] as const;
const RIGHT_CX = 332;
const RIGHT_W = 208;

export function LinearModelTableBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(ROUNDS.length, props);
  return (
    <LinearModelTableBuildBody
      key={variant.nonce}
      round={roundAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearModelTableBuildBody({
  round,
  onSolved,
  onRestart,
}: {
  round: Round;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [beat, setBeat] = useState(0);
  const [entry, setEntry] = useState("");
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [revealed, setRevealed] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const { m, b, xs } = round;
  const [x1, x2, x3] = xs;
  const y1 = m * x1 + b;
  const y2 = m * x2 + b;
  const y3 = m * x3 + b;
  const dy = y2 - y1;
  const dx = x2 - x1;
  const solved = beat >= 3;

  // Only the two correct beats reach here, so the badge belongs with the advance itself.
  function advance() {
    setBeat((current) => current + 1);
    setEntry("");
    setFeedback(null);
    success();
  }

  function checkRate(value: number) {
    if (near(value, m)) {
      advance();
      return;
    }
    if (near(value, dy)) {
      setFeedback(
        <>
          That is the change in the output on its own. Divide it by the change in the input,
          which is not <InlineMath latex="1" /> here.
        </>,
      );
      return;
    }
    if (near(value, -m)) {
      setFeedback(
        round.rising ? (
          <>The output grows as the input grows, so the rate is positive.</>
        ) : (
          <>The output falls as the input grows, so the rate is negative.</>
        ),
      );
      return;
    }
    if (near(value, dx / dy)) {
      setFeedback(
        <>
          That division is upside down. The rate is the change in the output over the change
          in the input.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not that. Subtract one row's output from the other's, subtract the inputs the same
        way round, then divide.
      </>,
    );
  }

  function checkStart(value: number) {
    if (near(value, b)) {
      advance();
      return;
    }
    if (near(value, y1) || near(value, y2)) {
      setFeedback(
        <>
          That is an output the table already lists, at an input that is not{" "}
          <InlineMath latex="0" />. Step all the way back to <InlineMath latex="x = 0" />.
        </>,
      );
      return;
    }
    if (near(value, y1 + m * x1)) {
      setFeedback(
        <>
          You stepped the wrong way. Going back toward <InlineMath latex="x = 0" /> means
          subtracting the rate once for every unit of input you drop.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Take a row you know and subtract the rate times that row's input from its output.
      </>,
    );
  }

  function checkPrediction(value: number) {
    if (near(value, y3)) {
      setBeat(3);
      setEntry("");
      setFeedback(null);
      success();
      onSolved();
      return;
    }
    if (near(value, m * x3)) {
      setFeedback(
        <>That is only the rate term. The starting value is still waiting to be added.</>,
      );
      return;
    }
    setFeedback(
      <>
        Substitute the input into your model: multiply the rate by it first, then add the
        starting value.
      </>,
    );
  }

  function check() {
    if (solved) {
      return;
    }
    const value = parseNumber(entry);
    if (value === null) {
      setFeedback(
        <>
          Type a number, such as <InlineMath latex="12" /> or <InlineMath latex="-5" />.
        </>,
      );
      return;
    }
    if (beat === 0) {
      checkRate(value);
    } else if (beat === 1) {
      checkStart(value);
    } else {
      checkPrediction(value);
    }
  }

  /**
   * The reveal's own resolution: settle the beat it just explained and open the next one.
   *
   * Only the reveal that lets the learner past runs this. The one that re-asks hands the
   * table back with this beat still theirs to type, which is why it may not fill anything in.
   */
  function fillIn() {
    setRevealed(true);
    setEntry("");
    setFeedback(null);
    setBeat((current) => current + 1);
  }

  const fieldLabel = beat === 0 ? "m =" : beat === 1 ? "b =" : "y =";
  const fieldAria =
    beat === 0
      ? "the rate"
      : beat === 1
        ? "the output when the input is zero"
        : `the predicted output at input ${x3}`;

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        The model predicted <InlineMath latex={`${y3}`} /> and the table recorded{" "}
        <InlineMath latex={`${y3}`} />, so it holds on a row it was never built from. That
        third row is the test: two rows can fit any line, a third one can break it.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (beat === 0) {
    status = (
      <>
        Find the rate from the first two rows. The inputs step by more than{" "}
        <InlineMath latex="1" />, so divide by the gap you actually get.
      </>
    );
  } else if (beat === 1) {
    status = (
      <>
        Now the starting value, the output at <InlineMath latex="x = 0" />. The table has no
        such row, so walk back to it from a row it does have.
      </>
    );
  } else {
    status = (
      <>
        Model built. Use it to predict the output at <InlineMath latex={`x = ${x3}`} />, the
        row the table kept hidden.
      </>
    );
  }

  const rateLatex =
    beat >= 1
      ? `m = \\dfrac{${y2} - ${y1}}{${x2} - ${x1}} = ${m}`
      : "m = \\dfrac{\\Delta y}{\\Delta x}";
  const startLatex = beat >= 2 ? `b = ${y1} - ${sp(m)}(${x1}) = ${b}` : "b = y - mx";
  const modelLatex =
    beat >= 2 ? `y = ${rateTermTex(m)} + ${b}` : "y = \\square x + \\square";

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg viewBox="0 0 440 208" role="img" aria-label={round.spoken}>
        <title>Building a linear model from a data table</title>

        <rect
          x={TABLE_X}
          y={TABLE_Y}
          width={TABLE_RIGHT - TABLE_X}
          height={TABLE_BOTTOM - TABLE_Y}
          rx={8}
          fill="none"
          stroke={LINE}
          strokeWidth={1.5}
        />
        <line
          x1={TABLE_X}
          y1={HEADER_UNDERLINE_Y}
          x2={TABLE_RIGHT}
          y2={HEADER_UNDERLINE_Y}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <line
          x1={DIVIDER_X}
          y1={TABLE_Y}
          x2={DIVIDER_X}
          y2={TABLE_BOTTOM}
          stroke={LINE}
          strokeWidth={1}
        />
        <SvgMath
          latex={round.xHeader}
          x={COL_X_CENTER}
          y={HEADER_Y}
          fontSize={13}
          color={SOFT}
          w={92}
        />
        <SvgMath
          latex={round.yHeader}
          x={COL_Y_CENTER}
          y={HEADER_Y}
          fontSize={13}
          color={SOFT}
          w={92}
        />

        {xs.map((x, row) => {
          const rowY = ROW_YS[row] ?? 0;
          const hidden = row === 2 && beat < 3;
          const output = row === 0 ? y1 : row === 1 ? y2 : y3;
          return (
            <g key={x}>
              <SvgMath
                latex={`${x}`}
                x={COL_X_CENTER}
                y={rowY}
                fontSize={17}
                color={LABEL}
                w={80}
              />
              <SvgMath
                latex={hidden ? "?" : `${output}`}
                x={COL_Y_CENTER}
                y={rowY}
                fontSize={17}
                color={hidden ? SOFT : row === 2 ? CIVIC : LABEL}
                w={80}
              />
            </g>
          );
        })}

        <SvgMath
          latex={rateLatex}
          x={RIGHT_CX}
          y={44}
          fontSize={15}
          color={beat >= 1 ? SIGNAL : SOFT}
          w={RIGHT_W}
        />
        <SvgMath
          latex={startLatex}
          x={RIGHT_CX}
          y={94}
          fontSize={15}
          color={beat >= 2 ? BRICK : SOFT}
          w={RIGHT_W}
        />
        <SvgMath
          latex={modelLatex}
          x={RIGHT_CX}
          y={136}
          fontSize={18}
          color={beat >= 2 ? CIVIC : SOFT}
          w={RIGHT_W}
        />

        {solved && (
          <>
            <SvgMath
              latex={`${sp(m)}(${x3}) + ${b} = ${y3}`}
              x={220}
              y={176}
              fontSize={16}
              color={CIVIC}
              w={430}
            />
            <text x={220} y={198} textAnchor="middle" fontSize={11} fill={SOFT}>
              the model agrees with the row it never saw
            </text>
          </>
        )}
      </svg>

      {!solved && (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex={fieldLabel} />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={entry}
              aria-label={fieldAria}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  check();
                }
              }}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Try another table
        </button>
      )}

      <WidgetReveal
        available={feedback !== null && !solved}
        revealed={revealed}
        answer={
          beat === 0 ? (
            <InlineMath latex={`m = ${m}`} />
          ) : beat === 1 ? (
            <InlineMath latex={`b = ${b}`} />
          ) : (
            <InlineMath latex={`y = ${y3}`} />
          )
        }
        why={
          beat === 0 ? (
            <>
              A rate is per ONE unit of input, and these rows are{" "}
              <InlineMath latex={`${dx}`} /> units apart, so the output change has to be
              shared out over that gap:{" "}
              <InlineMath latex={`\\dfrac{${y2} - ${y1}}{${x2} - ${x1}}`} />. Subtracting
              the rows the same way round on the top and the bottom is what keeps the sign
              telling the truth about whether the quantity grows or falls.
            </>
          ) : beat === 1 ? (
            <>
              The starting value is the output at <InlineMath latex="x = 0" />, and the
              table never lists that row, so it is walked back to: from{" "}
              <InlineMath latex={`x = ${x1}`} /> drop the rate once for every unit of input
              you give up, which is <InlineMath latex={`${y1} - ${sp(m)}(${x1})`} />. Any
              row of the table walks back to the same place, which is the check that the
              model fits them all.
            </>
          ) : (
            <>
              Predicting is just substituting: the model says multiply the input by the rate
              first and then add the starting value, so{" "}
              <InlineMath latex={`${sp(m)}(${x3}) + ${b}`} />. The rate term on its own is
              not the output, because the quantity did not start at <InlineMath latex="0" />
              .
            </>
          )
        }
        onReveal={fillIn}
        label={
          beat === 0
            ? "Reveal how the rate is found"
            : beat === 1
              ? "Reveal how to walk back to x = 0"
              : "Reveal how the model predicts"
        }
        othersRemain={beat < 2}
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
