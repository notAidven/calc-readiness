/**
 * GEO.1 interactive (slide 3): height by shadow, where the scale factor is the whole of the
 * work and the height is only what spending it produces.
 *
 * The dial names a candidate scale factor and the box holds the height that factor gives,
 * and the two are judged TOGETHER. A dial on its own could be swept through its positions
 * until the picture looked right, and a box on its own would let a learner who never found
 * the factor arrive at a height by some other route and never meet the idea the slide is
 * about.
 *
 * The tower is drawn dashed and at no particular height until the pair is committed, so
 * nothing on the board can be measured off instead of worked out. Only a correct pair
 * redraws it at the height the two triangles force, which is the moment the figures become
 * visibly the same shape.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { NUMERIC_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  /** The staff standing in the sun, and the shadow it throws, in meters. */
  staff: number;
  staffShadow: number;
  /** The tower's shadow at the same hour, in meters. Its height is the unknown. */
  towerShadow: number;
  /** What the taller thing is, for the accessible name and the field label. */
  what: string;
}

/**
 * Both boards have a whole-number scale factor inside the dial's range and a height that
 * comes out whole, so the arithmetic never distracts from the ratio. Neither matches the
 * dialogue's staff and tower, and neither is the CFU's foundation and model.
 */
const BOARDS: readonly Board[] = [
  { staff: 2, staffShadow: 3, towerShadow: 21, what: "bell tower" },
  { staff: 3, staffShadow: 4, towerShadow: 24, what: "watchtower" },
];

const DIAL_MIN = 2;
const DIAL_MAX = 10;

export function GeoShadowSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GeoShadowSliderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GeoShadowSliderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [dial, setDial] = useState(DIAL_MIN);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const factor = board.towerShadow / board.staffShadow;
  const height = board.staff * factor;

  function finish(earned: boolean) {
    setSolved(true);
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
    if (solved) {
      return;
    }
    setAttempted(true);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Set the scale factor, and enter the height it gives the tower.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about dividing the shadows, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "decimal");
    if (!read.ok) {
      setFeedback(NUMERIC_MISS);
      return;
    }
    if (dial === factor && read.value === height) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. Divide the tower's shadow by the staff's shadow to get the factor that carries the small triangle onto the large one, then apply that same factor to the staff.",
    );
  }

  function reveal() {
    setDial(factor);
    setEntry(String(height));
    setRevealed(true);
    finish(false);
  }

  const ground = 172;
  // Each triangle is drawn to its own scale, so both shadows fit the board. That is honest
  // about similarity rather than against it: the shape of each triangle is what the ratio of
  // its own two sides fixes, and neither shape depends on how big it is drawn.
  const smallUnit = 62 / board.staffShadow;
  const largeUnit = 190 / board.towerShadow;
  const staffFoot = { x: 40, y: ground };
  const staffTop = { x: 40, y: ground - board.staff * smallUnit };
  const staffTip = { x: 40 + 62, y: ground };
  const towerFoot = { x: 214, y: ground };
  const towerTip = { x: 214 + 190, y: ground };
  const towerPx = solved ? height * largeUnit : 104;
  const towerTop = { x: 214, y: ground - towerPx };

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: name the one factor that carries the staff's triangle onto the tower's, and
        the height that factor gives the tower.
      </WidgetTask>

      <svg
        viewBox="0 0 440 208"
        role="img"
        aria-label={`A staff of ${board.staff} meters throwing a shadow of ${board.staffShadow} meters, and a ${board.what} throwing a shadow of ${board.towerShadow} meters at the same hour`}
      >
        <title>Two shadows cast at the same hour, and the triangles they make</title>

        <line x1={20} y1={ground} x2={420} y2={ground} stroke={LINE} strokeWidth={1.4} />

        {/* The staff: upright, shadow, and the ray from its top to the shadow's tip. */}
        <line
          x1={staffFoot.x}
          y1={staffFoot.y}
          x2={staffTop.x}
          y2={staffTop.y}
          stroke={LABEL}
          strokeWidth={2.2}
        />
        <line
          x1={staffTop.x}
          y1={staffTop.y}
          x2={staffTip.x}
          y2={staffTip.y}
          stroke={SOFT}
          strokeWidth={1.4}
        />
        <SvgMath
          latex={`${board.staff}`}
          x={22}
          y={(staffFoot.y + staffTop.y) / 2}
          fontSize={14}
          color={LABEL}
          w={40}
        />
        <SvgMath
          latex={`${board.staffShadow}`}
          x={(staffFoot.x + staffTip.x) / 2}
          y={ground + 20}
          fontSize={14}
          color={LABEL}
          w={52}
        />
        <text
          x={staffFoot.x + 31}
          y={ground + 42}
          textAnchor="middle"
          fontSize={10}
          fill={SOFT}
        >
          staff and shadow
        </text>

        {/* The tower: its height is unknown, so it is dashed and at no stated size until the
            pair is committed. Redrawing it only on a correct answer keeps the picture from
            being a second copy of the answer. */}
        <line
          x1={towerFoot.x}
          y1={towerFoot.y}
          x2={towerTop.x}
          y2={towerTop.y}
          stroke={solved ? CIVIC : BRICK}
          strokeWidth={2.2}
          strokeDasharray={solved ? undefined : "5 4"}
        />
        <line
          x1={towerTop.x}
          y1={towerTop.y}
          x2={towerTip.x}
          y2={towerTip.y}
          stroke={SOFT}
          strokeWidth={1.4}
          strokeDasharray={solved ? undefined : "5 4"}
        />
        <SvgMath
          latex={solved ? `${height}` : "?"}
          x={196}
          y={(towerFoot.y + towerTop.y) / 2}
          fontSize={15}
          color={solved ? CIVIC : BRICK}
          w={44}
        />
        <SvgMath
          latex={`${board.towerShadow}`}
          x={(towerFoot.x + towerTip.x) / 2}
          y={ground + 20}
          fontSize={14}
          color={LABEL}
          w={60}
        />
        <text
          x={(towerFoot.x + towerTip.x) / 2}
          y={ground + 42}
          textAnchor="middle"
          fontSize={10}
          fill={SOFT}
        >
          {`${board.what} and shadow`}
        </text>
      </svg>

      <label
        className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
        htmlFor="geo1-shadow-factor"
      >
        Scale factor <InlineMath latex={`k = ${dial}`} />
      </label>
      <input
        id="geo1-shadow-factor"
        className="lesson-interactive__range"
        type="range"
        min={DIAL_MIN}
        max={DIAL_MAX}
        step={1}
        value={dial}
        disabled={solved}
        aria-valuetext={`scale factor ${dial}`}
        onChange={(e) => {
          setDial(Number(e.target.value));
          setFeedback(null);
        }}
      />

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different pair of shadows
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${board.staff} \\cdot k =`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("decimal")}
              value={entry}
              aria-label="The height of the tower in meters"
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={
          <>
            <InlineMath latex={`k = ${factor}`} />, and the tower stands{" "}
            <InlineMath latex={`${height}`} /> meters
          </>
        }
        why={
          <>
            The sun is at one angle at one hour, so the staff's triangle and the tower's
            triangle have equal angles and are similar. Their shadows are corresponding
            sides, so the scale factor is{" "}
            <InlineMath
              latex={`\\tfrac{${board.towerShadow}}{${board.staffShadow}} = ${factor}`}
            />
            . The uprights are corresponding sides too and take the same factor:{" "}
            <InlineMath latex={`${board.staff} \\cdot ${factor} = ${height}`} />. Adding the
            shadows instead would give a length no triangle on the board has.
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
            The shadows stand in the ratio <InlineMath latex={`${factor}`} />, so every
            corresponding length does, and the upright of{" "}
            <InlineMath latex={`${board.staff}`} /> meters becomes{" "}
            <InlineMath latex={`${height}`} /> meters.
          </>
        ) : (
          (feedback ??
          "The two shadows fall at the same hour, so the triangles are similar. Set the dial to the factor between them, and enter the height it gives.")
        )}
      </p>
    </div>
  );
}
