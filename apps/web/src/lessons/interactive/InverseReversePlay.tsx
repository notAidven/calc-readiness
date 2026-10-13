/**
 * FUN.8 interactive (slide 0): run a two-step machine backwards.
 *
 * The chain along the top is the machine as it runs forwards: a setting goes in, it is
 * multiplied, then a constant is added or subtracted, and a reading comes out. Only the
 * reading is given. The learner recovers the two values upstream of it, and the order they
 * are asked in IS the teaching: the LAST operation is undone FIRST, so the middle value comes
 * before the setting.
 *
 * Each stage is a question rather than a sum to copy. The row prints the value the arrow
 * lands on and the operation the arrow performs, and the blank sits where the value going IN
 * belongs, so nothing on screen is the arithmetic already worked out.
 *
 * Three machines rotate on restart, one of them subtracting and one with a negative setting,
 * so the sign work is not an accident of a single draw. None of their numbers appears in the
 * check or in the practice bank.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
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

interface Machine {
  /** The multiplier the setting meets first. */
  a: number;
  /** The constant added second, negative where the machine subtracts. */
  b: number;
  /** The setting that went in, which is what the second stage recovers. */
  input: number;
}

/** Three machines: one adding, one subtracting, one whose setting is negative. */
const MACHINES: readonly Machine[] = [
  { a: 3, b: 4, input: 6 },
  { a: 5, b: -7, input: 4 },
  { a: 2, b: 9, input: -3 },
];

function machineAt(index: number): Machine {
  return MACHINES[index] ?? MACHINES[0] ?? { a: 2, b: 1, input: 1 };
}

/** `+\,4` or `-\,7`, as the label on a forward arrow. */
function addTex(b: number): string {
  return `${b < 0 ? "-" : "+"}\\,${Math.abs(b)}`;
}

function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

function parseInteger(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "");
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : null;
}

/** One blank, in the position of the value it holds. Only the open stage is focusable. */
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
  /** Props from the shared reveal layer while it is showing this blank's answer. */
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

export function InverseReversePlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(MACHINES.length, props);
  return (
    <InverseReversePlayBody
      key={variant.nonce}
      machine={machineAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function InverseReversePlayBody({
  machine,
  onSolved,
  onRestart,
}: {
  machine: Machine;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { a, b, input } = machine;
  const mid = a * input;
  const out = mid + b;

  /** 0 recover the middle value, 1 recover the setting, 2 done. */
  const [stage, setStage] = useState(0);
  const [midEntry, setMidEntry] = useState("");
  const [inputEntry, setInputEntry] = useState("");
  const [missed, setMissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = stage >= 2;
  const wanted = stage === 0 ? mid : input;

  function advance(earned: boolean) {
    const next = stage + 1;
    setStage(next);
    setMissed(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= 2) {
      onSolved();
    }
  }

  function checkMid() {
    if (parseInteger(midEntry) === mid) {
      setRevealed(false);
      advance(true);
      return;
    }
    setRevealed(false);
    setMissed(true);
    setFeedback(
      <>
        Not yet. The arrow you are undoing is the one that came LAST, so ask what value the{" "}
        <InlineMath latex={addTex(b)} /> arrow was handed to leave{" "}
        <InlineMath latex={String(out)} /> behind it.
      </>,
    );
  }

  function checkInput() {
    if (parseInteger(inputEntry) === input) {
      setRevealed(false);
      advance(true);
      return;
    }
    setRevealed(false);
    setMissed(true);
    setFeedback(
      <>
        Not yet. One arrow is left, and it multiplies by <InlineMath latex={String(a)} />,
        so the setting is what that arrow turned into <InlineMath latex={String(mid)} />.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    advance(false);
  }

  /** Which of the two blanks the learner is being asked for right now. */
  function slotState(which: 0 | 1): "locked" | "open" | "done" {
    if (stage > which) {
      return "done";
    }
    return stage === which ? "open" : "locked";
  }

  // Chain geometry: three value chips, two forward arrows between them.
  const chipW = 92;
  const chipH = 42;
  const chipY = 56;
  const settingX = 66;
  const midX = 220;
  const outX = 374;

  const chips = [
    {
      key: "setting",
      x: settingX,
      caption: "setting",
      latex: stage >= 2 ? String(input) : "\\mathord{?}",
      filled: stage >= 2,
    },
    {
      key: "mid",
      x: midX,
      caption: "part way",
      latex: stage >= 1 ? String(mid) : "\\mathord{?}",
      filled: stage >= 1,
    },
    { key: "out", x: outX, caption: "reading", latex: String(out), filled: true },
  ];

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        That is the machine run backwards. The <InlineMath latex={addTex(b)} /> went on
        last, so it came off first, and the <InlineMath latex={`\\times ${a}`} /> came off
        after it.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 0) {
    status = (
      <>
        Work from the reading end. Two arrows separate the setting from{" "}
        <InlineMath latex={String(out)} />, and only the nearer one can be undone yet.
      </>
    );
  } else {
    status = (
      <>
        One arrow to go. Undo the <InlineMath latex={`\\times ${a}`} /> to get back to the
        setting itself.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Recover the two values upstream of the reading, so the whole chain reads back to the
        setting that produced it.
      </WidgetTask>

      <svg
        viewBox="0 0 440 130"
        role="img"
        aria-label={`A machine chain: a setting is multiplied by ${spoken(a)}, then ${b < 0 ? "reduced by" : "increased by"} ${Math.abs(b)}, and the reading is ${spoken(out)}`}
      >
        <title>A two-step machine, with the reading given</title>

        {chips.map((chip) => (
          <g key={chip.key}>
            <rect
              x={chip.x - chipW / 2}
              y={chipY - chipH / 2}
              width={chipW}
              height={chipH}
              rx={8}
              fill={chip.filled ? CIVIC : "var(--paper)"}
              fillOpacity={chip.filled ? 0.16 : 1}
              stroke={chip.filled ? CIVIC : LINE}
              strokeWidth={1.5}
            />
            <SvgMath
              latex={chip.latex}
              x={chip.x}
              y={chipY}
              fontSize={20}
              color={chip.filled ? LABEL : SOFT}
              w={chipW}
            />
            <text x={chip.x} y={chipY + 42} textAnchor="middle" fontSize={11} fill={SOFT}>
              {chip.caption}
            </text>
          </g>
        ))}

        {[
          { key: "mul", from: settingX, to: midX, latex: `\\times ${a}` },
          { key: "add", from: midX, to: outX, latex: addTex(b) },
        ].map((arrow) => (
          <g key={arrow.key}>
            <line
              x1={arrow.from + chipW / 2 + 6}
              y1={chipY}
              x2={arrow.to - chipW / 2 - 10}
              y2={chipY}
              stroke={SIGNAL}
              strokeWidth={2}
            />
            <path
              d={`M ${arrow.to - chipW / 2 - 10} ${chipY} l -8 -5 l 0 10 z`}
              fill={SIGNAL}
            />
            <SvgMath
              latex={arrow.latex}
              x={(arrow.from + arrow.to) / 2}
              y={chipY - 26}
              fontSize={16}
              color={SIGNAL}
              w={90}
            />
          </g>
        ))}
      </svg>

      <div className="lesson-equation">
        <div className="lesson-equation__row" data-state={slotState(0)}>
          <span className="lesson-equation__stage">undo last</span>
          <span className="lesson-equation__body">
            <Slot
              state={slotState(0)}
              value={midEntry}
              settled={String(mid)}
              aria="the value the last arrow was handed"
              color={CIVIC}
              given={stage === 0 ? fill.entry(mid) : {}}
              onChange={setMidEntry}
              onEnter={checkMid}
            />
            <InlineMath latex={`\\xrightarrow{\\;${addTex(b)}\\;}`} />
            <InlineMath latex={String(out)} />
          </span>
          {slotState(0) === "open" ? (
            <button type="button" className="lesson-interactive__check" onClick={checkMid}>
              Check
            </button>
          ) : null}
        </div>

        <div className="lesson-equation__row" data-state={slotState(1)}>
          <span className="lesson-equation__stage">undo first</span>
          <span className="lesson-equation__body">
            <Slot
              state={slotState(1)}
              value={inputEntry}
              settled={String(input)}
              aria="the setting that went into the machine"
              color={CIVIC}
              given={stage === 1 ? fill.entry(input) : {}}
              onChange={setInputEntry}
              onEnter={checkInput}
            />
            <InlineMath latex={`\\xrightarrow{\\;\\times ${a}\\;}`} />
            <InlineMath latex={stage >= 1 ? String(mid) : "\\mathord{?}"} />
          </span>
          {slotState(1) === "open" ? (
            <button
              type="button"
              className="lesson-interactive__check"
              onClick={checkInput}
            >
              Check
            </button>
          ) : null}
        </div>
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different machine
        </button>
      )}

      <WidgetReveal
        available={missed && !solved}
        revealed={revealed && !solved}
        answer={<InlineMath latex={String(wanted)} />}
        why={
          stage === 0 ? (
            <>
              The <InlineMath latex={addTex(b)} /> arrow is the last thing the machine did,
              so it is the first thing to take off. Whatever it was handed became{" "}
              <InlineMath latex={String(out)} />, so undoing it means{" "}
              <InlineMath latex={`${out} ${b < 0 ? "+" : "-"} ${Math.abs(b)}`} />.
            </>
          ) : (
            <>
              Only the multiplying arrow is left. It turned the setting into{" "}
              <InlineMath latex={String(mid)} />, and undoing a multiplication is a
              division, so the setting is <InlineMath latex={`${mid} \\div ${a}`} />.
            </>
          )
        }
        onReveal={reveal}
        label={stage === 0 ? "Reveal this value" : "Reveal the setting"}
        othersRemain={stage === 0}
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
