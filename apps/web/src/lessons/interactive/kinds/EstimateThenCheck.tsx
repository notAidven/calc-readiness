/**
 * INTERACTION KIND: estimate on a continuous scale, commit, then check.
 *
 * The learner parks a marker where they think a value lands, presses Check, and only then
 * is the true value drawn on the same scale beside their guess. Committing first is the
 * whole point: a learner who has already put a stake in the ground reads the answer
 * differently from one who is shown it, and the size of the gap is itself the feedback.
 *
 * It is the right kind wherever the misconception is about MAGNITUDE rather than about a
 * procedure, because a number line shows "nowhere near" in a way that a verdict cannot.
 * The committed position is the produced value, so the gate turns on the answer and never
 * on having moved the slider.
 *
 * The marker prints its own reading, above itself on the line and again beside the slider.
 * Without it the learner was being asked to place a value by eye against ticks a centimeter
 * apart and then told they had missed, with no way of seeing what they had actually said.
 *
 * The committed value comes off a ref rather than out of state, for the reason set out in
 * `pickup.ts`: dragging and pressing Check inside one frame would otherwise commit the
 * position the marker held on the previous render.
 *
 * ## R24: the task line
 *
 * R17 exempts this kind from a REQUIRED `objective` for the same reason it exempts
 * `MatchPairs`: the prompt already names what to place, because placing it IS the interaction.
 * R24 is a separate claim about WHERE that sentence sits, and it was sitting only in
 * `.lesson-interactive__status` — the last child, and the region the first wrong commit
 * overwrites. The task now leads the board through {@link WidgetTask}, with `objective`
 * optional and the prompt promoted into the slot where a board supplies none.
 */

import { type ReactNode, useId, useRef, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../../svgKit";
import { WidgetReveal } from "../../widgetFeedback";
import { useRevealFill, useRevealReAsk, useWidgetSuccess } from "../../widgetMechanics";
import { WidgetTask } from "../../widgetTask";

export interface EstimateRound {
  id: string;
  /** The quantity being placed, as LaTeX. */
  quantity: string;
  spoken: string;
  /** Its true value. */
  value: number;
  /** How close counts. */
  tolerance: number;
  /** Why it lands there. */
  why: ReactNode;
  /** A tick to draw as a landmark, with its label. */
  landmark?: { at: number; latex: string };
}

export interface EstimateThenCheckProps {
  rounds: readonly EstimateRound[];
  /** The scale the marker runs over. */
  min: number;
  max: number;
  step: number;
  /** Ticks drawn under the axis. */
  ticks: readonly number[];
  /**
   * WHAT is being placed, and how the learner will know the board is done. Optional, per
   * R17: on this kind the prompt already names what to place. Where it is omitted the prompt
   * leads the board instead, so R24's ordering holds either way.
   */
  objective?: ReactNode;
  prompt: string;
  conclusion: ReactNode;
  ariaLabel: string;
  onSolved: () => void;
  onRestart: () => void;
  restartLabel: string;
}

const LEFT = 44;
const RIGHT = 396;
const AXIS_Y = 74;

/**
 * THREE LANES ABOVE THE AXIS, and the reason they are lanes rather than offsets.
 *
 * The marker prints its reading above itself and a landmark prints its label above itself, and
 * for as long as both sat in one band the two collided wherever the marker met the landmark.
 * That is not a corner: two of the four boards on this kind opened ON it, because the marker
 * starts at the midpoint of the scale and their landmarks are the midpoint (TRG.7 is `45` on a
 * `0..90` scale, POL.8 is `0` on a `-12..12` one), so the first thing either board ever showed
 * was two numbers painted four units apart at the same `x`. The other two reach it by dragging.
 *
 * The marker MOVES, so nothing conditional on where it is right now can settle this: any
 * threshold is a promise about the positions somebody thought to check. What settles it is
 * giving the static label and the moving readout disjoint horizontal bands, after which no
 * marker position can put them on top of each other. The lanes are named here, measured off the
 * rendered ink rather than guessed at, and the frame is opened at the top to hold them:
 *
 *   quantity    ink about -15 .. 8    (23 units tall, the `\dfrac` boards being the tallest)
 *   landmark    ink about 12 .. 28
 *   readout     ink about 32 .. 49    (rides the marker, so it owns the band nearest the axis)
 *
 * The landmark's dashes now run from under its label all the way to the axis, which is what
 * keeps a label a lane away from its tick attached to it.
 */
const FRAME_TOP = -20;
const QUANTITY_Y = -3;
const LANDMARK_LABEL_Y = AXIS_Y - 54;
const LANDMARK_DASH_TOP = AXIS_Y - 44;

/**
 * The furthest a true value is ever stated. Three, because that is what the boards whose
 * values are irrational were authored against, and past three a bearing or a cosine stops
 * being something a learner reads off a scale and starts being a printout.
 */
const MAX_STATED_DECIMALS = 3;

/** How many decimals `value` needs before it is being written exactly, up to `cap`. */
function decimalsNeeded(value: number, cap: number): number {
  for (let places = 0; places < cap; places += 1) {
    if (Math.abs(Number(value.toFixed(places)) - value) < 1e-9) {
      return places;
    }
  }
  return cap;
}

/**
 * How many decimals this kind states a round's TRUE value at, on a scale stepping in `step`.
 *
 * Both were `toFixed(3)`, which is a constant and therefore a reading of nothing. A turning
 * point count of four came back as `4.000` on a scale that steps in ones, beside a marker
 * printing `4`: three digits of precision the board does not have, on a quantity that cannot
 * have them, contradicting its own readout in the same frame.
 *
 * The floor is what the SCALE steps in, because the whole feedback on this kind is the GAP
 * between the learner's mark and the truth and a gap cannot be read off two numbers quoted
 * differently. The ceiling is what the VALUE needs, so the boards whose answers are genuinely
 * irrational keep every digit they had: `\arctan \frac{8}{15}` still states `28.072` on a
 * scale of whole degrees, because rounding it to `28` would be the same defect pointing the
 * other way.
 *
 * Exported because two boards name their own rounding in the quantity they ask about, and a
 * caption promising three decimals over a value stated at two is that drift again.
 */
export function estimateStatedDecimals(value: number, step: number): number {
  return Math.max(scaleDecimals(step), decimalsNeeded(value, MAX_STATED_DECIMALS));
}

/** The precision the scale itself steps in, which is what the marker's readout is quoted at. */
function scaleDecimals(step: number): number {
  return step < 1 ? 2 : 0;
}

export function EstimateThenCheck({
  rounds,
  min,
  max,
  step,
  ticks,
  objective,
  prompt,
  conclusion,
  ariaLabel,
  onSolved,
  onRestart,
  restartLabel,
}: EstimateThenCheckProps) {
  const sliderId = useId();
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState((min + max) / 2);
  // Where the marker is RIGHT NOW, readable in the tick it was moved in.
  const marker = useRef((min + max) / 2);
  const [committed, setCommitted] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const revealFill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[index] ?? (rounds[0] as EstimateRound);
  const isLast = index === rounds.length - 1;
  const settled = committed !== null;
  const solved = settled && isLast;

  /**
   * Where the marker sits. Normally the learner's own position; while a reveal is up it is
   * the true value, because on this kind the DIAL is the blank and leaving it parked at a
   * guess the passage has just called wrong is the same defect as a stale answer in a box.
   */
  const markerAt = revealFill.given ? round.value : settled ? (committed as number) : guess;
  const markerColour = revealFill.given ? SIGNAL_DEEP : settled ? SOFT : BRICK;

  const x = (v: number) => LEFT + ((v - min) / (max - min)) * (RIGHT - LEFT);

  /** The reading, at the precision the scale actually steps in. */
  const read = (v: number) => (step < 1 ? v.toFixed(2) : String(Math.round(v)));

  /**
   * The TRUE value, once the round is over. Never coarser than {@link read}, so the two marks
   * can be compared, and never padded past what the value has. See
   * {@link estimateStatedDecimals}.
   */
  const stated = (v: number) => v.toFixed(estimateStatedDecimals(v, step));

  function move(next: number) {
    marker.current = next;
    setGuess(next);
    setFeedback(null);
  }

  function close(at: number, earned: boolean) {
    setCommitted(at);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLast) {
      onSolved();
    }
  }

  function check() {
    if (settled) {
      return;
    }
    const at = marker.current;
    if (Math.abs(at - round.value) <= round.tolerance) {
      setRevealed(false);
      close(at, true);
      return;
    }
    setTried(true);
    setRevealed(false);
    setFeedback(
      at > round.value
        ? `Not there. ${read(at)} is too far right, so bring the marker down the line and check again.`
        : `Not there. ${read(at)} is too far left, so bring the marker up the line and check again.`,
    );
  }

  function nextRound() {
    setIndex(index + 1);
    marker.current = (min + max) / 2;
    setGuess((min + max) / 2);
    setCommitted(null);
    setTried(false);
    setRevealed(false);
    setFeedback(null);
  }

  return (
    <div className="lesson-interactive lesson-interactive--estimate">
      <WidgetTask>{objective ?? prompt}</WidgetTask>

      <svg
        viewBox={`0 ${FRAME_TOP} 440 ${132 - FRAME_TOP}`}
        role="img"
        aria-label={ariaLabel}
      >
        <title>Place a value on the number line, then check it</title>

        {/* `data-estimate-lane` names the three bands for `estimateLanes.browser.test.tsx`,
            which measures their ink apart. Nothing else reads them. */}
        <g data-estimate-lane="quantity">
          <SvgMath
            latex={round.quantity}
            x={220}
            y={QUANTITY_Y}
            fontSize={20}
            color={LABEL}
            h={44}
          />
        </g>

        <line x1={LEFT} y1={AXIS_Y} x2={RIGHT} y2={AXIS_Y} stroke={LINE} strokeWidth={2} />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              y1={AXIS_Y - 5}
              x2={x(t)}
              y2={AXIS_Y + 5}
              stroke={LINE}
              strokeWidth={1.5}
            />
            <text x={x(t)} y={AXIS_Y + 20} textAnchor="middle" fontSize={11} fill={SOFT}>
              {t}
            </text>
          </g>
        ))}

        {round.landmark ? (
          <g data-estimate-lane="landmark" data-estimate-at={round.landmark.at}>
            <line
              x1={x(round.landmark.at)}
              y1={LANDMARK_DASH_TOP}
              x2={x(round.landmark.at)}
              y2={AXIS_Y + 5}
              stroke={SOFT}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <SvgMath
              latex={round.landmark.latex}
              x={x(round.landmark.at)}
              y={LANDMARK_LABEL_Y}
              fontSize={13}
              color={SOFT}
              w={90}
              h={28}
            />
          </g>
        ) : null}

        {/* The learner's marker, live while they drag and kept in place once committed,
            with its own reading printed above it so the position is never guesswork. Amber
            while a reveal holds it, because then the position is one it was handed. */}
        <polygon
          points={`${x(markerAt)},${AXIS_Y - 8} ${x(markerAt) - 7},${AXIS_Y - 22} ${x(markerAt) + 7},${AXIS_Y - 22}`}
          fill={markerColour}
        />
        <text
          data-estimate-lane="reading"
          x={x(markerAt)}
          y={AXIS_Y - 28}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill={markerColour}
        >
          {read(markerAt)}
        </text>

        {settled ? (
          <>
            <line
              x1={x(round.value)}
              y1={AXIS_Y - 26}
              x2={x(round.value)}
              y2={AXIS_Y + 8}
              stroke={CIVIC}
              strokeWidth={2.5}
            />
            <SvgMath
              latex={`${round.quantity} = ${stated(round.value)}`}
              x={220}
              y={112}
              fontSize={16}
              color={CIVIC}
              h={34}
            />
          </>
        ) : null}
      </svg>

      <label className="lesson-interactive__slider-label" htmlFor={sliderId}>
        Drag the marker along the line. It is at <strong>{read(markerAt)}</strong>.
      </label>
      <input
        id={sliderId}
        className="lesson-interactive__range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={markerAt}
        disabled={settled}
        aria-valuetext={
          revealFill.given
            ? `${read(markerAt)} on a scale from ${min} to ${max}, given rather than answered`
            : `${read(markerAt)} on a scale from ${min} to ${max}`
        }
        onChange={(event) => move(Number(event.target.value))}
        {...revealFill.entry(markerAt)}
      />

      {!settled && (
        <button type="button" className="lesson-interactive__check" onClick={check}>
          Check this spot
        </button>
      )}

      {settled && !isLast && (
        <button type="button" className="lesson-interactive__check" onClick={nextRound}>
          Next: another one to place
        </button>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {restartLabel}
        </button>
      )}

      <WidgetReveal
        available={tried && !settled}
        revealed={revealed}
        // There are rounds after this one, so explaining where this value lands does not cost
        // the ones already placed: the scale comes back with the marker where the learner left
        // it and this round still theirs to commit. On the last round it is the gate, so false.
        othersRemain={!isLast}
        answer={<InlineMath latex={`${round.quantity} \\approx ${stated(round.value)}`} />}
        why={round.why}
        onReveal={() => {
          setRevealed(true);
          setGuess(round.value);
          setCommitted(round.value);
          setFeedback(null);
          if (isLast) {
            onSolved();
          }
        }}
        label="Reveal where it lands"
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed
          ? null
          : solved
            ? conclusion
            : settled
              ? round.why
              : // Only a fallback when the prompt is not already the task line above (R8).
                (feedback ?? (objective === undefined ? null : prompt))}
      </p>
    </div>
  );
}
