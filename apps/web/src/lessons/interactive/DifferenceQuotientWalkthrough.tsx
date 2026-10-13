/**
 * FUN.6 interactive (slide 1): what `f(x + h)` does to a squared term, drawn as an area.
 *
 * A square of side `x + h` is cut into four pieces, and Play or Step uncovers them one at a
 * time: `x` by `x`, `x` by `h`, `h` by `x`, `h` by `h`. TWO of them are the same size, which
 * is the whole reason the middle coefficient is doubled and the whole reason
 * `(x + h)^2 = x^2 + h^2` is wrong. The picture is what makes that a fact about the square
 * rather than a rule to remember.
 *
 * The animation then STOPS. It has laid the four pieces out and named each one, and the
 * learner types the three coefficients of the expansion, which means reading one piece off
 * the picture, ADDING the two middle pieces, and reading the last. Pressing Play alone
 * produces nothing.
 *
 * Three outer coefficients rotate on "start over". None is `1`, so the middle coefficient is
 * never just "the 2 everybody remembers": it has to be worked out from the two pieces.
 */

import { type ReactNode, useEffect, useState } from "react";

import { InlineMath, LABEL, LINE, SIGNAL, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
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
import { usePlayingSignal } from "./usePlayingSignal";

/** The outer coefficients the square is scaled by, one per variant. */
const SCALES: readonly number[] = [3, 5, 4];

const PLAY_MS = 800;
/** Four pieces, so four frames after the bare square. */
const FRAMES = 4;

/** The square, and where its two cuts fall. `x` is drawn longer than `h`. */
const LEFT = 128;
const TOP = 62;
const SIDE = 180;
const X_PART = 122;
const CUT_X = LEFT + X_PART;
const CUT_Y = TOP + X_PART;
const RIGHT = LEFT + SIDE;
const BOTTOM = TOP + SIDE;

/** A typed integer, or null when the entry is not one. */
function parseInteger(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "");
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : null;
}

function Slot({
  open,
  value,
  settled,
  aria,
  color,
  given,
  onChange,
  onEnter,
}: {
  open: boolean;
  value: string;
  settled: string;
  aria: string;
  color: string;
  given: RevealFilledEntry | RevealFillProps;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (!open) {
    return (
      <span className="lesson-equation__slot lesson-equation__slot--done" style={{ color }}>
        <InlineMath latex={settled} />
      </span>
    );
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color }}
      type="text"
      inputMode="numeric"
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

export function DifferenceQuotientWalkthrough(props: LessonWidgetProps) {
  const variant = useWidgetVariants(SCALES.length, props);
  return (
    <DifferenceQuotientWalkthroughBody
      key={variant.nonce}
      scale={SCALES[variant.index] ?? 3}
      onSolved={variant.latch}
      onRestart={variant.restart}
      onPlayingChange={props.onPlayingChange}
    />
  );
}

function DifferenceQuotientWalkthroughBody({
  scale,
  onSolved,
  onRestart,
  onPlayingChange,
}: {
  scale: number;
  onSolved: () => void;
  onRestart: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  usePlayingSignal(playing, onPlayingChange);
  const [entry, setEntry] = useState({ square: "", cross: "", step: "" });
  const [done, setDone] = useState({ square: false, cross: false, step: false });
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [latched, setLatched] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const laid = frame >= FRAMES;
  const solved = done.square && done.cross && done.step;
  const middle = 2 * scale;
  const headline = `${scale}(x + h)^{2}`;

  // Auto-advance timer: re-scheduled per frame, self-stops at the last piece, cleaned up on
  // unmount. Nothing advances past the four pieces, because the coefficients are the
  // learner's to produce.
  useEffect(() => {
    if (!playing) {
      return;
    }
    if (frame >= FRAMES) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setFrame((prev) => Math.min(prev + 1, FRAMES)), PLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, frame]);

  function step() {
    setPlaying(false);
    setFrame((prev) => Math.min(prev + 1, FRAMES));
  }

  function replay() {
    setPlaying(false);
    setFrame(0);
  }

  /** Latch the gate the first time all three coefficients are in. */
  function settle(next: typeof done) {
    setDone(next);
    if (next.square && next.cross && next.step && !latched) {
      setLatched(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    const next = {
      square: done.square || parseInteger(entry.square) === scale,
      cross: done.cross || parseInteger(entry.cross) === middle,
      step: done.step || parseInteger(entry.step) === scale,
    };
    const landed =
      (next.square && !done.square) ||
      (next.cross && !done.cross) ||
      (next.step && !done.step);
    settle(next);
    if (landed) {
      success();
    }
    if (next.square && next.cross && next.step) {
      setFeedback(null);
      return;
    }
    setFeedback(
      next.square && next.step && !next.cross ? (
        <>
          The two outer coefficients are right. Look again at the middle: TWO of the four
          pieces measure <InlineMath latex="x" /> by <InlineMath latex="h" />, and both of
          them are in the total.
        </>
      ) : (
        <>
          Not yet. Read each coefficient off the pieces above: the whole square is
          multiplied by <InlineMath latex={String(scale)} />, and pieces of the same size
          add together.
        </>
      ),
    );
  }

  function reveal() {
    setEntry((prev) => ({ ...prev, cross: String(middle) }));
    setRevealed(true);
    settle({ ...done, cross: true });
    setFeedback(null);
  }

  /**
   * The four pieces, in the order they are uncovered.
   *
   * The two equal pieces share `SIGNAL_DEEP` because they are the thing the slide is about,
   * and neither green nor red is available for that: those two are the correctness channel and
   * they report on the learner's own action (R26). A standing mark that is not a verdict takes
   * the amber.
   */
  const pieces = [
    {
      id: "square",
      shown: frame >= 1,
      x: LEFT,
      y: TOP,
      w: X_PART,
      h: X_PART,
      latex: `${scale}x^{2}`,
      color: LABEL,
    },
    {
      id: "cross-top",
      shown: frame >= 2,
      x: CUT_X,
      y: TOP,
      w: RIGHT - CUT_X,
      h: X_PART,
      latex: `${scale}xh`,
      color: SIGNAL_DEEP,
    },
    {
      id: "cross-side",
      shown: frame >= 3,
      x: LEFT,
      y: CUT_Y,
      w: X_PART,
      h: BOTTOM - CUT_Y,
      latex: `${scale}hx`,
      color: SIGNAL_DEEP,
    },
    {
      id: "step",
      shown: frame >= 4,
      x: CUT_X,
      y: CUT_Y,
      w: RIGHT - CUT_X,
      h: BOTTOM - CUT_Y,
      latex: `${scale}h^{2}`,
      color: SIGNAL,
    },
  ];

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Two of the four pieces are the same size, which is why the middle coefficient is{" "}
        <InlineMath latex={`${middle}`} /> and not <InlineMath latex={`${scale}`} />:{" "}
        <InlineMath latex={`${headline} = ${scale}x^{2} + ${middle}xh + ${scale}h^{2}`} />.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (frame === 0) {
    status = (
      <>
        A square of side <InlineMath latex="x + h" />, waiting to be cut into pieces.
      </>
    );
  } else if (!laid) {
    status = (
      <>
        Piece <InlineMath latex={String(frame)} /> of <InlineMath latex={String(FRAMES)} />{" "}
        uncovered.
      </>
    );
  } else {
    status = (
      <>All four pieces are named. Two of them are the same size, so their areas add.</>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Fill in the three coefficients of <InlineMath latex={headline} />, reading them off
        the pieces of the square.
      </WidgetTask>

      <svg
        viewBox="0 0 440 270"
        role="img"
        aria-label={`A square of side x plus h cut into four pieces, each area multiplied by ${scale}`}
      >
        <title>The square of x plus h, as four pieces</title>

        <SvgMath latex={headline} x={220} y={20} fontSize={19} color={LABEL} />

        <SvgMath
          latex="x"
          x={LEFT + X_PART / 2}
          y={TOP - 14}
          fontSize={15}
          color={SOFT}
          w={80}
        />
        <SvgMath
          latex="h"
          x={(CUT_X + RIGHT) / 2}
          y={TOP - 14}
          fontSize={15}
          color={SOFT}
          w={60}
        />
        <SvgMath
          latex="x"
          x={LEFT - 20}
          y={TOP + X_PART / 2}
          fontSize={15}
          color={SOFT}
          w={60}
        />
        <SvgMath
          latex="h"
          x={LEFT - 20}
          y={(CUT_Y + BOTTOM) / 2}
          fontSize={15}
          color={SOFT}
          w={60}
        />

        <rect
          x={LEFT}
          y={TOP}
          width={SIDE}
          height={SIDE}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1.5}
          rx={4}
        />
        {pieces.map((piece) => (
          <g key={piece.id}>
            <rect
              x={piece.x}
              y={piece.y}
              width={piece.w}
              height={piece.h}
              fill="var(--paper)"
              stroke={piece.shown ? piece.color : LINE}
              strokeWidth={piece.shown ? 1.75 : 0.75}
              strokeDasharray={piece.shown ? undefined : "3 4"}
            />
            {piece.shown && (
              <SvgMath
                latex={piece.latex}
                x={piece.x + piece.w / 2}
                y={piece.y + piece.h / 2}
                fontSize={piece.w < 80 ? 13 : 18}
                color={piece.color}
                w={Math.max(piece.w, 70)}
              />
            )}
          </g>
        ))}
      </svg>

      <div className="lesson-interactive__controls">
        {laid ? (
          <button type="button" className="lesson-interactive__step" onClick={replay}>
            Replay
          </button>
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

      {laid && (
        <div className="lesson-equation">
          <div className="lesson-equation__row" data-state={solved ? "done" : "open"}>
            <span className="lesson-equation__stage">expand</span>
            <span className="lesson-equation__body">
              <InlineMath latex={`${headline} =`} />
              <Slot
                open={!done.square}
                value={entry.square}
                settled={String(scale)}
                aria="the coefficient of x squared"
                color={LABEL}
                // Only the middle blank is filled by a reveal, because the middle
                // coefficient is the only one the passage explains.
                given={{}}
                onChange={(next) => setEntry((prev) => ({ ...prev, square: next }))}
                onEnter={check}
              />
              <InlineMath latex="x^{2} +" />
              <Slot
                open={!done.cross}
                value={entry.cross}
                settled={String(middle)}
                aria="the coefficient of x h"
                color={SIGNAL_DEEP}
                given={fill.entry(middle)}
                onChange={(next) => setEntry((prev) => ({ ...prev, cross: next }))}
                onEnter={check}
              />
              <InlineMath latex="xh +" />
              <Slot
                open={!done.step}
                value={entry.step}
                settled={String(scale)}
                aria="the coefficient of h squared"
                color={SIGNAL}
                given={{}}
                onChange={(next) => setEntry((prev) => ({ ...prev, step: next }))}
                onEnter={check}
              />
              <InlineMath latex="h^{2}" />
            </span>
            {solved ? null : (
              <button type="button" className="lesson-interactive__check" onClick={check}>
                Check
              </button>
            )}
          </div>
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different coefficient
        </button>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={String(middle)} />}
        why={
          <>
            Two of the four pieces measure <InlineMath latex="x" /> by{" "}
            <InlineMath latex="h" />, so the area they contribute is{" "}
            <InlineMath latex={`${scale}xh + ${scale}hx = ${middle}xh`} />. That doubled
            middle term is exactly what is lost by writing{" "}
            <InlineMath latex={`${scale}x^{2} + ${scale}h^{2}`} /> instead.
          </>
        }
        onReveal={reveal}
        // The two outer coefficients are separate answers, so while either is outstanding the
        // board is worth having back with this one explained.
        othersRemain={!(done.square && done.step)}
        label="Reveal the middle coefficient"
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : status}
      </p>
    </div>
  );
}
