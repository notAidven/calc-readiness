/**
 * TRG.8 interactive (slide 0): run the dish through one full turn and mark EVERY heading at
 * which the strength meter sits on the given value.
 *
 * One of the five bespoke widgets in D9, and bespoke because the thing being taught is not a
 * classification or an ordering: it is that a full revolution passes the same strength more
 * than once. No shared kind shows a quantity going up, coming back down and crossing a level
 * twice, and that crossing is the whole slide.
 *
 * ## The animation stops before the answer
 *
 * Sweeping produces nothing. The dish travels, the trail draws, the needle rises and falls
 * against a dashed mark, and NOTHING anywhere on the board says which headings matched: the
 * meter carries no numeric readout and no heading is highlighted. When the sweep closes, the
 * learner types the two headings they watched it cross at, one at a time, and only the second
 * entry latches the gate. Pressing Sweep on its own leaves the gate exactly where it was.
 *
 * The current heading IS printed while the dish moves, because that is transport rather than
 * an answer: without it the board would be asking a learner to estimate an angle off a picture,
 * which is a different skill and not this one.
 *
 * ## Why it passes `othersRemain`
 *
 * The board holds TWO answers at once. A reveal that spent the whole instance would take away
 * the heading the learner had already found and hand back a fresh sweep, which is the defect
 * that reached eighteen boards (`.cursor/rules/qa-verification.mdc`, `#219`). So the first
 * reveal says `othersRemain`, the shared layer offers the part-answered board back, and only
 * the reveal of the SECOND heading spends the instance, because that one is the gate.
 */

import { useEffect, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { usePlayingSignal } from "./usePlayingSignal";

/** The sweep stops every 30 degrees, so twelve stops and a thirteenth back at the start. */
const STEP_DEG = 30;
const STOPS = 12;
const PLAY_MS = 520;

const CX = 112;
const CY = 126;
const R = 82;

const METER_X = 302;
const METER_ZERO_Y = 126;
/** User units per unit of strength, so the meter runs from +1 down to -1. */
const METER_UNIT = 78;

interface Board {
  id: string;
  fn: "sin" | "cos";
  /** The equation, as the board states it. */
  equationTex: string;
  /** The marked strength, as LaTeX beside the dashed line. */
  targetTex: string;
  /** The same value as a number, for placing the mark and the needle. */
  target: number;
  /** How a screen reader says the marked value. */
  targetSpoken: string;
  /** The two headings, ascending. Both lie on the 30 degree lattice the sweep stops at. */
  headings: readonly [number, number];
  /** The reference angle both headings share, measured from the horizontal. */
  referenceDeg: number;
  /** The two quadrants the headings land in, as the reveal names them. */
  quadrantWords: string;
}

/**
 * Two boards, neither of them the check's own $2\sin x + 1 = 0$ and neither of them a shape
 * the practice pool can deal. The first crosses a POSITIVE mark early in the turn and again
 * only just before it closes; the second crosses a NEGATIVE one, so a learner who has decided
 * the answer is always the pair either side of a peak is contradicted by the board rather
 * than by a sentence.
 *
 * Both are chosen against the item bank rather than for convenience. Every heading here has
 * to be a multiple of 30, because that is the lattice the sweep stops on, and that leaves
 * eight equations on the two functions. Six of the eight are dealt by `d9.trg8.sine-basic.l1`
 * or `d9.trg8.cosine-negative.l2`, and a seventh is the check, so a board sharing one of them
 * would hand a learner an answer to recall in practice instead of a value to derive. The
 * remaining two are a positive cosine and a negative sine, which are exactly these.
 */
const BOARDS: readonly Board[] = [
  {
    id: "cosine-half-up",
    fn: "cos",
    equationTex: "\\cos x = \\dfrac{1}{2}",
    targetTex: "\\dfrac{1}{2}",
    target: 0.5,
    targetSpoken: "one half",
    headings: [60, 300],
    referenceDeg: 60,
    quadrantWords: "the first and fourth quadrants",
  },
  {
    id: "sine-neg-root3",
    fn: "sin",
    equationTex: "\\sin x = -\\dfrac{\\sqrt{3}}{2}",
    targetTex: "-\\dfrac{\\sqrt{3}}{2}",
    target: -Math.sqrt(3) / 2,
    targetSpoken: "negative root 3 over 2",
    headings: [240, 300],
    referenceDeg: 60,
    quadrantWords: "the third and fourth quadrants",
  },
];

const FN_WORD: Record<Board["fn"], string> = { sin: "sine", cos: "cosine" };

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** The board's strength at a heading. */
function strength(board: Board, deg: number): number {
  return board.fn === "sin" ? Math.sin(rad(deg)) : Math.cos(rad(deg));
}

/** A point on the pad's rim at `deg`. */
function rim(deg: number, radius = R): { x: number; y: number } {
  return { x: CX + radius * Math.cos(rad(deg)), y: CY - radius * Math.sin(rad(deg)) };
}

/**
 * The arc already swept, sampled rather than drawn as an SVG arc.
 *
 * An `A` command needs a large-arc flag that flips at 180 degrees and degenerates at 360,
 * where the start and end points coincide and the whole arc silently disappears. Sampling has
 * neither problem and the trail is a fixed 82 units across, so the polyline is smooth.
 */
function trailPath(deg: number): string {
  const points: string[] = [];
  for (let a = 0; a <= deg; a += 3) {
    const p = rim(a);
    points.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return `M ${points.join(" L ")}`;
}

/** A typed whole number of degrees, or null when the entry is not one. */
function parseHeading(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u00b0/g, "")
    .replace(/\s+/g, "");
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function TrigSweepPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <TrigSweepPlayBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function TrigSweepPlayBody({
  board,
  onSolved,
  onRestart,
  onPlayingChange,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  /** 0 the first heading is owed, 1 the second, 2 both are in. */
  const [stage, setStage] = useState(0);
  const [entry, setEntry] = useState("");
  const [missed, setMissed] = useState(false);
  const [shown, setShown] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const heading = stepIdx * STEP_DEG;
  const swept = stepIdx >= STOPS;
  const solved = stage >= 2;
  const wanted = board.headings[stage === 0 ? 0 : 1];
  const other = board.headings[stage === 0 ? 1 : 0];

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (stepIdx >= STOPS) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(
      () => setStepIdx((prev) => Math.min(prev + 1, STOPS)),
      PLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [playing, stepIdx]);

  function land(next: number) {
    setStage(next);
    setEntry("");
    setMissed(false);
    setFeedback(null);
    if (next >= 2 && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    const typed = parseHeading(entry);
    if (typed === null) {
      setMissed(true);
      setFeedback("Type one whole number of degrees, with no degree sign after it.");
      return;
    }
    if (typed === wanted) {
      setShown(false);
      success();
      land(stage + 1);
      return;
    }
    setMissed(true);
    if (typed === other) {
      setFeedback(
        stage === 0
          ? `That heading is on the mark, but the sweep reaches the other one first. This box wants the first crossing.`
          : `You have that one already. The sweep leaves the mark and comes back to it once more before the turn closes.`,
      );
      return;
    }
    setFeedback(
      `At ${typed} degrees the needle is not level with the mark. Step round again and watch for the two stops where it sits exactly on the dashed line.`,
    );
  }

  /** The shared reveal explains whichever heading is open, and this is what settles it. */
  function resolveReveal() {
    setShown(true);
    land(stage + 1);
  }

  /* ------------------------------------------------------------------ the drawing */

  const tip = rim(heading);
  const ux = Math.cos(rad(heading));
  const uy = -Math.sin(rad(heading));
  const dishFace = `M ${tip.x - uy * 12} ${tip.y + ux * 12} Q ${tip.x + ux * 9} ${tip.y + uy * 9} ${tip.x + uy * 12} ${tip.y - ux * 12}`;

  const reading = strength(board, heading);
  const needleY = METER_ZERO_Y - reading * METER_UNIT;
  const markY = METER_ZERO_Y - board.target * METER_UNIT;
  const level = Math.abs(reading - board.target) < 1e-9;

  const stops = Array.from({ length: STOPS }, (_unused, i) => i * STEP_DEG);
  const found = board.headings.slice(0, stage);

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Run the dish through one full turn, then name both headings at which the strength
        meter sits on the marked value.
      </WidgetTask>

      <WidgetBeside
        figure={
          <svg
            viewBox="0 0 440 254"
            role="img"
            aria-label={`A dish sweeping one full turn. It is pointing at ${heading} degrees, and the strength meter reads ${level ? `level with the mark of ${board.targetSpoken}` : reading > board.target ? "above the mark" : "below the mark"}.`}
          >
            <title>One full sweep against a marked strength</title>

            <SvgMath
              latex={board.equationTex}
              x={220}
              y={18}
              fontSize={16}
              color={solved ? CIVIC : LABEL}
            />

            {/* the pad */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={LINE} strokeWidth={1.4} />
            <line
              x1={CX - R - 10}
              y1={CY}
              x2={CX + R + 10}
              y2={CY}
              stroke={LINE}
              strokeWidth={1}
            />
            <line
              x1={CX}
              y1={CY - R - 10}
              x2={CX}
              y2={CY + R + 10}
              stroke={LINE}
              strokeWidth={1}
            />
            {stops.map((deg) => {
              const p = rim(deg);
              return (
                <circle
                  key={deg}
                  cx={p.x}
                  cy={p.y}
                  r={2.6}
                  fill={deg <= heading && stepIdx > 0 ? SOFT : LINE}
                />
              );
            })}

            {stepIdx > 0 && (
              <path d={trailPath(heading)} fill="none" stroke={SIGNAL} strokeWidth={2.4} />
            )}

            {/* the dish, on its arm */}
            <line
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
              stroke={solved ? CIVIC : LABEL}
              strokeWidth={2}
            />
            <path
              d={dishFace}
              fill="none"
              stroke={solved ? CIVIC : LABEL}
              strokeWidth={3}
            />
            <circle cx={CX} cy={CY} r={3.4} fill={SOFT} />

            {/* the headings already produced, marked once the learner has produced them */}
            {found.map((deg) => {
              const p = rim(deg);
              const label = rim(deg, R + 24);
              return (
                <g key={`found-${deg}`}>
                  <circle cx={p.x} cy={p.y} r={5.5} fill={CIVIC} />
                  <SvgMath
                    latex={`${deg}^{\\circ}`}
                    x={label.x}
                    y={label.y}
                    fontSize={13}
                    color={CIVIC}
                    plate
                    w={56}
                  />
                </g>
              );
            })}

            <SvgMath
              latex={`x = ${heading}^{\\circ}`}
              x={CX}
              y={236}
              fontSize={15}
              color={LABEL}
              w={120}
            />

            {/* the strength meter */}
            <line
              x1={METER_X}
              y1={METER_ZERO_Y - METER_UNIT}
              x2={METER_X}
              y2={METER_ZERO_Y + METER_UNIT}
              stroke={LINE}
              strokeWidth={1.4}
            />
            {[1, 0, -1].map((tick) => (
              <g key={tick}>
                <line
                  x1={METER_X - 6}
                  y1={METER_ZERO_Y - tick * METER_UNIT}
                  x2={METER_X + 6}
                  y2={METER_ZERO_Y - tick * METER_UNIT}
                  stroke={LINE}
                  strokeWidth={1.2}
                />
                <SvgMath
                  latex={tick < 0 ? "-1" : `${tick}`}
                  x={METER_X - 24}
                  y={METER_ZERO_Y - tick * METER_UNIT}
                  fontSize={12}
                  color={SOFT}
                  w={38}
                />
              </g>
            ))}

            <line
              x1={METER_X - 44}
              y1={markY}
              x2={METER_X + 44}
              y2={markY}
              stroke={SIGNAL_DEEP}
              strokeWidth={1.6}
              strokeDasharray="6 4"
            />
            <SvgMath
              latex={board.targetTex}
              x={METER_X + 52}
              y={markY}
              anchor="start"
              fontSize={14}
              color={SIGNAL_DEEP}
              plate
              w={90}
            />

            <line
              x1={METER_X}
              y1={METER_ZERO_Y}
              x2={METER_X}
              y2={needleY}
              stroke={SIGNAL}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <circle cx={METER_X} cy={needleY} r={5} fill={SIGNAL} />
            <text x={METER_X} y={236} textAnchor="middle" fontSize={11} fill={SOFT}>
              strength
            </text>
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          {solved ? (
            <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
              Start over with a different sweep
            </button>
          ) : swept ? (
            <>
              <div className="lesson-interactive__field">
                <span className="lesson-interactive__field-label">
                  <InlineMath latex={stage === 0 ? "x_{1} =" : "x_{2} ="} />
                </span>
                <input
                  className="lesson-interactive__input"
                  type="text"
                  inputMode="numeric"
                  value={entry}
                  aria-label={
                    stage === 0
                      ? "the first heading in the sweep at which the meter sits on the mark, in degrees"
                      : "the next heading in the sweep at which the meter sits on the mark, in degrees"
                  }
                  onChange={(event) => setEntry(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      check();
                    }
                  }}
                />
              </div>
              <button type="button" className="lesson-interactive__check" onClick={check}>
                Check
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                onClick={() => {
                  setPlaying(false);
                  setStepIdx(0);
                }}
              >
                Sweep again
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? "Pause" : "Sweep"}
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                onClick={() => {
                  setPlaying(false);
                  setStepIdx((prev) => Math.min(prev + 1, STOPS));
                }}
                disabled={playing}
              >
                Step
              </button>
            </>
          )}
        </div>

        <WidgetReveal
          available={missed && !solved}
          revealed={shown}
          answer={<InlineMath latex={`${wanted}^{\\circ}`} />}
          why={
            stage === 0 ? (
              <>
                The needle first sits on <InlineMath latex={board.targetTex} /> at{" "}
                <InlineMath latex={`${board.headings[0]}^{\\circ}`} />, because the{" "}
                {FN_WORD[board.fn]} of that heading IS that value. The sweep does not stop
                there, though: it carries the dish on round, and there is a second heading
                in the same turn where the meter comes back to the same reading.
              </>
            ) : (
              <>
                After <InlineMath latex={`${board.headings[0]}^{\\circ}`} /> the needle
                moves off the mark and then returns to it at{" "}
                <InlineMath latex={`${board.headings[1]}^{\\circ}`} />, so one full turn
                answers the equation twice. Both headings have the same reference angle of{" "}
                <InlineMath latex={`${board.referenceDeg}^{\\circ}`} /> measured from the
                horizontal, and they sit in {board.quadrantWords}, which are the two where
                the {FN_WORD[board.fn]} carries that sign.
              </>
            )
          }
          onReveal={resolveReveal}
          label={stage === 0 ? "Reveal the first heading" : "Reveal the second heading"}
          // The first reveal leaves the second heading outstanding, so the board is handed
          // back rather than thrown away. The second IS the gate, so it spends the instance.
          othersRemain={stage === 0}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {feedback ? (
            <span style={{ color: BRICK }}>{feedback}</span>
          ) : solved ? (
            <>
              One turn, two answers:{" "}
              <InlineMath latex={`x = ${board.headings[0]}^{\\circ}`} color={CIVIC} /> and{" "}
              <InlineMath latex={`x = ${board.headings[1]}^{\\circ}`} color={CIVIC} />. That
              is why the answer to an equation like this one is a roster of headings and not
              a single heading.
            </>
          ) : swept ? (
            <>
              The turn is closed. Name the two headings at which the needle sat level with{" "}
              <InlineMath latex={board.targetTex} />, the earlier one first.
            </>
          ) : stepIdx === 0 ? (
            <>
              The dish starts at <InlineMath latex="0^{\circ}" /> and the meter is marked at{" "}
              <InlineMath latex={board.targetTex} />. Send it round and watch how often the
              needle reaches that mark.
            </>
          ) : (
            `Stop ${stepIdx} of ${STOPS}, at ${heading} degrees.`
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
