/**
 * NUM.S interactive (slide 1): hop one signed sum out along the number line.
 *
 * Play auto-advances on a timer and Step advances one hop (keyboard fallback), but the
 * animation lays out the JOURNEY without ever announcing the destination: the marker
 * travels and every hop draws its arrow, while the running readout and the sum both stay
 * a question mark. The learner reads where the marker came to rest and types it, and only
 * that entry prints the sum and latches the gate, so pressing Play alone produces nothing.
 *
 * The slide this replaces said "watch one sum play out", and watching is exactly what a
 * gate cannot be opened by.
 */

import { useEffect, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";
import { usePlayingSignal } from "./usePlayingSignal";

interface Sum {
  a: number;
  b: number;
}

/**
 * Two sums, neither of them the CFU's $-8 + 6$. The first crosses zero going left and the
 * second crosses it going right, so a learner who has decided that "signed addition means
 * the answer is negative" is contradicted by the board rather than by a sentence.
 */
const SUMS: readonly Sum[] = [
  { a: 4, b: -7 },
  { a: -6, b: 9 },
];

const PLAY_MS = 650;

const LEFT = 30;
const RIGHT = 410;
const AXIS_Y = 100;

export function SignedAdditionWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(SUMS.length, props);
  const sum = SUMS[variant.index] ?? (SUMS[0] as Sum);
  return (
    <SignedAdditionWalkthroughBody
      key={variant.nonce}
      sum={sum}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function SignedAdditionWalkthroughBody({
  sum: { a: A, b: B },
  onSolved,
  onRestart,
  onPlayingChange,
}: {
  sum: Sum;
  onSolved: () => void;
  onRestart: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  const [entry, setEntry] = useState("");
  const [entryDone, setEntryDone] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const total = A + B;
  const dir = B < 0 ? -1 : 1;
  const hops = Math.abs(B);
  const dirWord = B < 0 ? "left" : "right";
  const hopColor = B < 0 ? BRICK : CIVIC;
  const sumLatex = `${A} + (${B})`;

  // Step 1 plots the first addend, then one step per hop. Nothing auto-advances past the
  // last hop: the value the marker has arrived at is the learner's to produce.
  const steps = 1 + hops;
  const landed = stepIdx >= steps;
  const solved = entryDone;

  // Two ticks of air on each side, so the marker never sits on the edge of the axis.
  const min = Math.min(0, A, total) - 2;
  const max = Math.max(0, A, total) + 2;
  const unit = (RIGHT - LEFT) / (max - min);
  const X = (v: number) => LEFT + (v - min) * unit;

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (stepIdx >= steps) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStepIdx((prev) => Math.min(prev + 1, steps));
    }, PLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, stepIdx, steps]);

  function step() {
    setPlaying(false);
    setStepIdx((prev) => Math.min(prev + 1, steps));
  }

  function replay() {
    setPlaying(false);
    setStepIdx(0);
  }

  /** Close the sum out. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setEntryDone(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (entryDone) {
      return;
    }
    setAttempted(true);
    const read = readNumericEntry(entry, "integer");
    if (read.ok && read.value === total) {
      finish(true);
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about counting single units, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    setFeedback(
      entry.trim() === ""
        ? "Enter the number the marker landed on."
        : read.ok
          ? `Not quite. Start at ${A} and count ${hops} single units to the ${dirWord}, crossing zero if you get there.`
          : WHOLE_NUMBER_MISS,
    );
  }

  function reveal() {
    setEntry(String(total));
    setRevealed(true);
    finish(false);
  }

  const ticks: number[] = [];
  for (let v = min; v <= max; v++) {
    ticks.push(v);
  }

  const hopsTaken = Math.max(0, stepIdx - 1);
  const pos = stepIdx <= 0 ? null : A + dir * hopsTaken;

  // One arrow per completed hop, curving above the axis toward its destination.
  const hopArrows = [];
  for (let k = 1; k <= hopsTaken; k++) {
    const x1 = X(A + dir * (k - 1));
    const x2 = X(A + dir * k);
    const mx = (x1 + x2) / 2;
    const tipX = x2;
    const tipY = AXIS_Y - 6;
    const apex = tipY - 26;
    // Orient the head along the curve tangent at the landing point, not a flat ±x
    // offset — the old triangle sat to the left of where the arc actually ends.
    const dx = tipX - mx;
    const dy = tipY - apex;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const size = 8;
    const bx = tipX - ux * size;
    const by = tipY - uy * size;
    const px = -uy * (size * 0.55);
    const py = ux * (size * 0.55);
    hopArrows.push(
      <g key={`hop-${k}`}>
        <path
          d={`M ${x1} ${tipY} Q ${mx} ${apex} ${tipX} ${tipY}`}
          fill="none"
          stroke={hopColor}
          strokeWidth={2}
        />
        <path
          d={`M ${tipX} ${tipY} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`}
          fill={hopColor}
        />
      </g>,
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <svg
        viewBox="0 0 440 150"
        role="img"
        aria-label={`Number line adding ${A} plus ${B}, hopping ${hops} units ${dirWord}`}
      >
        <title>Signed addition walkthrough on a number line</title>
        <SvgMath
          latex={solved ? `${sumLatex} = ${total}` : `${sumLatex} = \\;?`}
          x={220}
          y={17}
          fontSize={15}
          color={solved ? CIVIC : LABEL}
        />

        {/* axis */}
        <line x1={LEFT} y1={AXIS_Y} x2={RIGHT} y2={AXIS_Y} stroke={LINE} strokeWidth={2} />
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={X(v)}
              y1={AXIS_Y - 5}
              x2={X(v)}
              y2={AXIS_Y + 5}
              stroke={LINE}
              strokeWidth={1.5}
            />
            <text
              x={X(v)}
              y={AXIS_Y + 22}
              textAnchor="middle"
              fontSize={12}
              fill={v === 0 ? LABEL : SOFT}
              fontWeight={v === 0 ? 700 : 400}
            >
              {v}
            </text>
          </g>
        ))}

        {/* faint start marker once plotted */}
        {stepIdx >= 1 && (
          <>
            <circle cx={X(A)} cy={AXIS_Y} r={4.5} fill={SOFT} />
            <text x={X(A)} y={AXIS_Y - 30} textAnchor="middle" fontSize={11} fill={SOFT}>
              start {A}
            </text>
          </>
        )}

        {hopArrows}

        {/* The live marker. Its readout stays a question mark until the learner says where
            it is: printing the running position is printing the answer one hop early. */}
        {pos !== null && (
          <>
            <circle
              cx={X(pos)}
              cy={AXIS_Y}
              r={10}
              fill={solved ? CIVIC : SIGNAL}
              stroke="var(--paper)"
              strokeWidth={2}
            />
            <text
              x={X(pos)}
              y={AXIS_Y - 16}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fill={solved ? CIVIC : LABEL}
            >
              {solved ? pos : "?"}
            </text>
          </>
        )}
      </svg>

      <div className="lesson-interactive__controls">
        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different sum
          </button>
        ) : landed ? (
          <>
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`${sumLatex} =`} />
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={entry}
                aria-label="The number the marker landed on"
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    check();
                  }
                }}
                // Last, so the answer overrides whatever the learner typed for as long as
                // the reveal is up. Stepping the marker along is transport rather than
                // answering, so the sum in this box is the whole of what the round asks.
                {...fill.entry(total)}
              />
            </div>
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
            <button type="button" className="lesson-interactive__step" onClick={replay}>
              Replay
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="lesson-interactive__step"
              onClick={step}
              disabled={playing}
            >
              Step
            </button>
          </>
        )}
      </div>

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={String(total)} />}
        why={
          <>
            Adding <InlineMath latex={`(${B})`} /> means {hops} single hops to the {dirWord}
            , because {B < 0 ? "a negative" : "a positive"} addend points that way. Starting
            at <InlineMath latex={String(A)} /> and taking all {hops} of them lands on{" "}
            <InlineMath latex={String(total)} />, so{" "}
            <InlineMath latex={`${sumLatex} = ${total}`} />. The two addends point in
            opposite directions, so the hops walk back through zero and come out the other
            side rather than piling up.
          </>
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            Landed on <InlineMath latex={String(total)} />. Adding{" "}
            <InlineMath latex={`(${B})`} /> moved {hops} to the {dirWord}, so{" "}
            <InlineMath latex={`${sumLatex} = ${total}`} />.
          </>
        ) : feedback ? (
          feedback
        ) : stepIdx === 0 ? (
          <>
            First plot <InlineMath latex={String(A)} />, then add{" "}
            <InlineMath latex={`(${B})`} />. Press Play or Step to begin.
          </>
        ) : landed ? (
          `All ${hops} hops are drawn. Read where the marker came to rest and enter it.`
        ) : stepIdx === 1 ? (
          <>
            Start at <InlineMath latex={String(A)} />.
          </>
        ) : (
          `${B < 0 ? "Adding a negative" : "Adding a positive"} moves ${dirWord}: hop ${hopsTaken} of ${hops}.`
        )}
      </p>
    </div>
  );
}
