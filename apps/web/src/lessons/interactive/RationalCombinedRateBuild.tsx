/**
 * RAT.6 interactive: the combined-rate equation, built rather than read.
 *
 * The version this replaces printed the finished equation in its first frame and asked
 * only for three taps of "add an hour", so a learner could finish it without ever turning
 * a time into a rate. It also only worked because that round's together-time landed whole,
 * which the practice pool's `t = ab/(a + b)` usually does not.
 *
 * Three beats instead. First the bound: together has to beat the FASTER worker's solo
 * time, which rules out the add-the-times answer and the average in a single tap. Then the
 * equation itself, assembled from chips whose distractors are the two raw times and
 * `1/(a + b)`, so every wrong tap names one specific confusion between a time and a rate.
 * Last the solve, typed, and it takes a fraction because the second round's answer is one.
 *
 * Chips all carry the same neutral token, so colour is never a tell. Colour arrives only
 * once a rate is placed, and it ties each slot to its slice of the one-hour bar, which is
 * the picture of why the rates are what add.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import { useWidgetSuccess } from "../widgetMechanics";

interface Round {
  a: number;
  b: number;
}

/** Round one lands whole so the idea is clean; round two lands on `15/8`, as practice does. */
const ROUNDS: readonly Round[] = [
  { a: 6, b: 12 },
  { a: 3, b: 5 },
];

function roundAt(index: number): Round {
  return ROUNDS[index % ROUNDS.length] ?? (ROUNDS[0] as Round);
}

function gcd(x: number, y: number): number {
  let big = Math.abs(x);
  let small = Math.abs(y);
  while (small > 0) {
    const next = big % small;
    big = small;
    small = next;
  }
  return big || 1;
}

function lcm(x: number, y: number): number {
  return (x * y) / gcd(x, y);
}

function fracTex(n: number, d: number): string {
  return d === 1 ? `${n}` : `\\dfrac{${n}}{${d}}`;
}

/** The same value read aloud, for the aria-labels KaTeX makes textContent unfit for. */
function fracSpoken(n: number, d: number): string {
  return d === 1 ? `${n}` : `${n} over ${d}`;
}

/** A coefficient on `t`, with an implicit `1` left off. */
function coefTex(n: number): string {
  return n === 1 ? "t" : `${n}t`;
}

interface Board {
  a: number;
  b: number;
  fast: number;
  slow: number;
  /** The combined rate `1/a + 1/b`, reduced. */
  rateN: number;
  rateD: number;
  /** The together time `ab/(a + b)`, reduced. */
  timeN: number;
  timeD: number;
  timeValue: number;
  /** The numeric part of the LCD, so clearing gives `(L/a)t + (L/b)t = L`. */
  lcd: number;
}

function boardFor(round: Round): Board {
  const { a, b } = round;
  const g = gcd(a + b, a * b);
  return {
    a,
    b,
    fast: Math.min(a, b),
    slow: Math.max(a, b),
    rateN: (a + b) / g,
    rateD: (a * b) / g,
    timeN: (a * b) / g,
    timeD: (a + b) / g,
    timeValue: (a * b) / (a + b),
    lcd: lcm(a, b),
  };
}

/**
 * Read a typed together-time. Tolerates a leading `t =`, any spacing, a decimal, and a
 * slash fraction, because round two's answer is `15/8` and a learner may write either form.
 */
function parseTime(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/^t\s*=\s*/i, "")
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

type Bound = "more" | "between" | "less";
type ChipId = "timeA" | "rateA" | "timeB" | "rateB" | "sum";

/**
 * The bar starts at 92 so the "one hour" label clears it, and stops at 332 so the running
 * total sits beside the bar rather than inside it: a `\dfrac` is taller than the bar and
 * overhangs it at both edges when it is placed within.
 */
const BAR_X = 92;
const BAR_W = 240;
const BAR_Y = 46;
const BAR_H = 28;
const BAR_MID = BAR_Y + BAR_H / 2;
const BAR_TOTAL_X = BAR_X + BAR_W + 12;

const ROW_BOUND_Y = 100;
const ROW_RATES_Y = 134;
const ROW_CLEARED_Y = 168;
const ROW_TIME_Y = 202;

/** Both chips and both slots stay in one neutral token until a rate is actually placed. */
const NEUTRAL = { color: LABEL, borderColor: LINE };

export function RationalCombinedRateBuild({ onComplete }: { onComplete?: () => void }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [boundPassed, setBoundPassed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [boundMisses, setBoundMisses] = useState<readonly Bound[]>([]);
  const [chipMisses, setChipMisses] = useState<readonly ChipId[]>([]);
  const [slots, setSlots] = useState<readonly ChipId[]>([]);
  const [entry, setEntry] = useState("");
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [fired, setFired] = useState(false);
  const success = useWidgetSuccess();

  const board = boardFor(roundAt(roundIndex));
  const share = 1 / board.a + 1 / board.b;

  /**
   * Which beat is live is a function of what the learner has done, not its own state. Two
   * rate chips tapped in one tick would otherwise both read the same stale slot list and
   * the second would overwrite the first instead of completing the pair.
   */
  const beat = solved ? 3 : !boundPassed ? 0 : slots.length < 2 ? 1 : 2;

  function callBound(choice: Bound) {
    if (beat !== 0 || boundMisses.includes(choice)) {
      return;
    }
    if (choice === "less") {
      setFeedback(null);
      setBoundPassed(true);
      success();
      return;
    }
    setBoundMisses((current) => [...current, choice]);
    setFeedback(
      choice === "more" ? (
        <>
          More than <InlineMath latex={`${board.slow}`} /> hours is slower than the worker
          who needs <InlineMath latex={`${board.slow}`} /> hours alone. A second worker
          cannot make the job take longer.
        </>
      ) : (
        <>
          Still slower than the worker who finishes in{" "}
          <InlineMath latex={`${board.fast}`} /> hours alone, and the other one is helping
          the whole time.
        </>
      ),
    );
  }

  function placeChip(id: ChipId) {
    if (beat !== 1 || chipMisses.includes(id) || slots.includes(id)) {
      return;
    }
    if (id === "timeA" || id === "timeB") {
      const time = id === "timeA" ? board.a : board.b;
      setChipMisses((current) => [...current, id]);
      setFeedback(
        <>
          <InlineMath latex={`${time}`} /> is a time, not a rate. That worker finishes{" "}
          <InlineMath latex={fracTex(1, time)} /> of the job in one hour, so the rate is{" "}
          <InlineMath latex={fracTex(1, time)} /> per hour.
        </>,
      );
      return;
    }
    if (id === "sum") {
      setChipMisses((current) => [...current, id]);
      setFeedback(
        <>
          That is <InlineMath latex="1" /> over the two times added. The times are exactly
          what do not add here, the rates do.
        </>,
      );
      return;
    }
    setSlots((current) => (current.length >= 2 ? current : [...current, id]));
    setFeedback(null);
    success();
  }

  function checkTime() {
    if (beat !== 2) {
      return;
    }
    const value = parseTime(entry);
    if (value === null) {
      setFeedback("Type a whole number, a decimal, or a fraction such as 15/8.");
      return;
    }
    if (near(value, board.timeValue)) {
      setFeedback(null);
      setSolved(true);
      success();
      if (!fired) {
        setFired(true);
        onComplete?.();
      }
      return;
    }
    if (near(value, board.a + board.b)) {
      setFeedback(
        <>
          That is the two times added, which the bound already ruled out: it is slower than
          either worker alone.
        </>,
      );
      return;
    }
    if (near(value, (board.a + board.b) / 2)) {
      setFeedback(
        <>
          That is the average of the two times, and it is still slower than{" "}
          <InlineMath latex={`${board.fast}`} /> hours.
        </>,
      );
      return;
    }
    if (near(value, share)) {
      setFeedback(
        <>
          That is the combined rate, the share of the job finished in one hour, not the
          time. It is <InlineMath latex="\dfrac{1}{t}" /> that equals the rate, so{" "}
          <InlineMath latex="t" /> is its reciprocal. Flip that fraction over.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not that. Collect the two <InlineMath latex="t" /> terms into{" "}
        <InlineMath
          latex={`${coefTex(board.lcd / board.a + board.lcd / board.b)} = ${board.lcd}`}
        />
        , then divide.
      </>,
    );
  }

  function nextRound() {
    setRoundIndex((index) => (index + 1) % ROUNDS.length);
    setBoundPassed(false);
    setSolved(false);
    setBoundMisses([]);
    setChipMisses([]);
    setSlots([]);
    setEntry("");
    setFeedback(null);
  }

  const chips: readonly { id: ChipId; latex: string; spoken: string }[] = [
    { id: "timeA", latex: `${board.a}`, spoken: `${board.a}` },
    { id: "rateA", latex: fracTex(1, board.a), spoken: fracSpoken(1, board.a) },
    { id: "timeB", latex: `${board.b}`, spoken: `${board.b}` },
    { id: "rateB", latex: fracTex(1, board.b), spoken: fracSpoken(1, board.b) },
    {
      id: "sum",
      latex: fracTex(1, board.a + board.b),
      spoken: fracSpoken(1, board.a + board.b),
    },
  ];

  function slotToken(index: number) {
    const filled = slots[index];
    if (!filled) {
      return { text: "\\square", color: SOFT };
    }
    const value = filled === "rateA" ? board.a : board.b;
    return {
      text: fracTex(1, value),
      color: filled === "rateA" ? SIGNAL : CIVIC,
    };
  }

  const clearedLatex = `${coefTex(board.lcd / board.a)} + ${coefTex(board.lcd / board.b)} = ${board.lcd}`;

  const spokenParts = [`worker A alone ${board.a} hours, worker B alone ${board.b} hours`];
  if (beat >= 1) {
    spokenParts.push(`together takes less than ${board.fast} hours`);
  }
  if (beat >= 2) {
    spokenParts.push(
      `${fracSpoken(1, board.a)} plus ${fracSpoken(1, board.b)} equals 1 over t, which clears to ${board.lcd / board.a} t plus ${board.lcd / board.b} t equals ${board.lcd}`,
    );
  }
  if (solved) {
    spokenParts.push(`t equals ${fracSpoken(board.timeN, board.timeD)}`);
  }

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        The rates add:{" "}
        <InlineMath latex={`${fracTex(1, board.a)} + ${fracTex(1, board.b)}`} /> is{" "}
        <InlineMath latex={fracTex(board.rateN, board.rateD)} /> of the job per hour, so{" "}
        <InlineMath latex={`\\dfrac{1}{t} = ${fracTex(board.rateN, board.rateD)}`} /> and{" "}
        <InlineMath latex={`t = ${fracTex(board.timeN, board.timeD)}`} /> hours,{" "}
        {board.timeD === 1 ? (
          <>
            comfortably under <InlineMath latex={`${board.fast}`} /> hours. This one came
            out whole. In general{" "}
          </>
        ) : (
          <>
            still under <InlineMath latex={`${board.fast}`} /> hours. In general{" "}
          </>
        )}
        <InlineMath latex="t = \dfrac{ab}{a + b}" />, which usually is not a whole number.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (beat === 0) {
    status = (
      <>
        One worker finishes the job alone in <InlineMath latex={`${board.a}`} /> hours, the
        other in <InlineMath latex={`${board.b}`} />. Before any algebra, how long can the
        two of them together possibly take?
      </>
    );
  } else if (beat === 1) {
    status = (
      <>
        Together they beat <InlineMath latex={`${board.fast}`} /> hours. Now build the
        equation: tap the two rates that add to the combined rate{" "}
        <InlineMath latex="\dfrac{1}{t}" />.
      </>
    );
  } else {
    status = (
      <>
        Multiply every term by the LCD <InlineMath latex={`${board.lcd}t`} /> and the
        fractions clear. Solve for <InlineMath latex="t" />, as a fraction if it does not
        come out whole.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg viewBox="0 0 440 224" role="img" aria-label={spokenParts.join("; ")}>
        <title>Building the combined-rate equation for two workers on one job</title>
        <SvgMath
          latex={`\\text{A alone: } ${board.a} \\text{ h} \\qquad \\text{B alone: } ${board.b} \\text{ h}`}
          x={220}
          y={22}
          fontSize={16}
          color={LABEL}
          w={420}
        />

        {/* The bar is up from the first frame: two slices that already cover more of the
            job than A's alone is the whole argument for the bound beat 1 asks for. */}
        <text x={8} y={BAR_MID + 4} fontSize={12} fill={SOFT}>
          one hour
        </text>
        <rect
          x={BAR_X}
          y={BAR_Y}
          width={BAR_W}
          height={BAR_H}
          rx={7}
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />
        <rect
          x={BAR_X}
          y={BAR_Y}
          width={BAR_W / board.a}
          height={BAR_H}
          rx={7}
          fill={SIGNAL}
          fillOpacity={0.3}
        />
        <rect
          x={BAR_X + BAR_W / board.a}
          y={BAR_Y}
          width={BAR_W / board.b}
          height={BAR_H}
          rx={7}
          fill={CIVIC}
          fillOpacity={0.3}
        />
        <text
          x={BAR_X + BAR_W / (2 * board.a)}
          y={BAR_MID + 4}
          fontSize={11}
          fill={SOFT}
          textAnchor="middle"
        >
          A
        </text>
        <text
          x={BAR_X + BAR_W / board.a + BAR_W / (2 * board.b)}
          y={BAR_MID + 4}
          fontSize={11}
          fill={SOFT}
          textAnchor="middle"
        >
          B
        </text>
        {beat >= 2 && (
          <SvgMath
            latex={`= ${fracTex(board.rateN, board.rateD)}`}
            x={BAR_TOTAL_X}
            y={BAR_MID}
            anchor="start"
            fontSize={15}
            color={LABEL}
            w={96}
          />
        )}

        <text x={8} y={ROW_BOUND_Y + 4} fontSize={12} fill={SOFT}>
          together
        </text>
        <SvgMath
          latex={beat >= 1 ? `t < ${board.fast}` : "?"}
          x={254}
          y={ROW_BOUND_Y}
          fontSize={17}
          color={beat >= 1 ? LABEL : SOFT}
          w={330}
        />

        {beat >= 1 && (
          <>
            <text x={8} y={ROW_RATES_Y + 4} fontSize={12} fill={SOFT}>
              rates
            </text>
            <EquationRow
              tokens={[
                slotToken(0),
                { text: "+", color: LABEL },
                slotToken(1),
                { text: "=", color: LABEL },
                { text: "\\dfrac{1}{t}", color: LABEL },
              ]}
              cx={254}
              y={ROW_RATES_Y}
              fontSize={18}
              w={330}
            />
          </>
        )}

        {beat >= 2 && (
          <>
            <text x={8} y={ROW_CLEARED_Y + 4} fontSize={12} fill={SOFT}>
              cleared
            </text>
            <SvgMath
              latex={clearedLatex}
              x={254}
              y={ROW_CLEARED_Y}
              fontSize={17}
              color={LABEL}
              w={330}
            />
          </>
        )}

        {solved && (
          <>
            <text x={8} y={ROW_TIME_Y + 4} fontSize={12} fill={SOFT}>
              time
            </text>
            <SvgMath
              latex={`t = ${fracTex(board.timeN, board.timeD)}`}
              x={254}
              y={ROW_TIME_Y}
              fontSize={18}
              color={CIVIC}
              w={330}
            />
          </>
        )}
      </svg>

      {beat === 0 && (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__chip"
            style={NEUTRAL}
            disabled={boundMisses.includes("more")}
            aria-label={`more than ${board.slow} hours`}
            onClick={() => callBound("more")}
          >
            More than <InlineMath latex={`${board.slow}`} /> hours
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            style={NEUTRAL}
            disabled={boundMisses.includes("between")}
            aria-label={`between ${board.fast} and ${board.slow} hours`}
            onClick={() => callBound("between")}
          >
            Between <InlineMath latex={`${board.fast}`} /> and{" "}
            <InlineMath latex={`${board.slow}`} /> hours
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            style={NEUTRAL}
            disabled={boundMisses.includes("less")}
            aria-label={`less than ${board.fast} hours`}
            onClick={() => callBound("less")}
          >
            Less than <InlineMath latex={`${board.fast}`} /> hours
          </button>
        </div>
      )}

      {beat === 1 && (
        <div className="lesson-interactive__controls">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-interactive__chip"
              style={NEUTRAL}
              disabled={chipMisses.includes(chip.id) || slots.includes(chip.id)}
              aria-label={`place ${chip.spoken}`}
              onClick={() => placeChip(chip.id)}
            >
              <InlineMath latex={chip.latex} />
            </button>
          ))}
        </div>
      )}

      {beat === 2 && (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex="t =" />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="text"
              value={entry}
              aria-label="the together time in hours"
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkTime();
                }
              }}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkTime}>
            Check
          </button>
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={nextRound}>
          Try another
        </button>
      )}

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
