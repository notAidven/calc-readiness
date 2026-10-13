/**
 * TRG.6 interactive (slide 0): a dish on a mast, swung down toward the horizon, and the
 * correction running away as it goes.
 *
 * The picture IS the tangent. The dish sits one mast-height above the deck, the swing is
 * measured from the mast's own line, and the beam lands $\tan\theta$ mast-heights out from
 * the foot. So the drawn distance is not an illustration of the function, it is the
 * function's value, and the stepper walks it through $\tan 0^{\circ}$ up to $\tan 88^{\circ}$
 * while the landing point leaves the yard entirely.
 *
 * **The stepper stops before the answer.** Its last notch is $88^{\circ}$ and the readout is
 * in mast-heights rather than in meters, so neither of the three questions can be read off
 * the board: the first has to be converted through the height, and the other two ask for
 * headings the stepper never reaches. Stepping alone opens nothing, and the gate turns on
 * the three typed answers.
 *
 * Each part is judged on its own and fires its own success, so the last one is not the only
 * moment that counts. A reveal on a part with parts after it explains that part and hands
 * the board back; on the last part it does not, because that part is the gate.
 *
 * ## Why the PART's question is in the task slot and not the status line
 *
 * It used to be the other way around, and the sibling explore on TRG.3 describes this same
 * defect in the past tense while this board still had it. `WidgetTask` carried a standing goal
 * about the three headings, and `open.question` — the sentence saying which of the three is
 * being asked for, and carrying the height and the swing the arithmetic needs — rendered in
 * `.lesson-interactive__status` below the figure, the stepper and the box, as
 * `feedback ?? open?.question`. `setFeedback(null)` happens only in `advance()` and typing does
 * not clear it, so ONE wrong answer replaced the question and nothing put it back: a learner
 * who mistyped once was left an empty box, a Check button and a note about formatting, with
 * neither the 12 meters nor the 45 degrees anywhere on screen and the figure parked on whatever
 * swing the stepper was last left at. The only exit was the reveal, which costs them the part.
 *
 * So the question leads, and the status line keeps the one job it can keep across an overwrite:
 * the standing note about what the readout under the yard is and is not, which the same wrong
 * attempt is free to replace. Do not restate the question down there; two copies of a task is
 * the fix wearing the defect's clothes.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/**
 * The swings the stepper visits, in degrees.
 *
 * Bunched toward the end on purpose. The steps up to $75^{\circ}$ are thirty or fifteen
 * degrees wide and none of them adds more than two mast-heights to the run; the last two are
 * nine degrees and then four, and they add about six mast-heights and then about nineteen. The
 * run-away is the whole point of the slide and evenly spaced notches hide it.
 */
const NOTCHES = [0, 30, 45, 60, 75, 84, 88] as const;

/**
 * What the status line says while a part is being worked out. A strategy line and not the task:
 * the task is in the slot above the figure, where a wrong attempt cannot overwrite it, and this
 * is what the same wrong attempt is free to replace.
 */
const STEPPING =
  "The chip beside the stepper reads the run in mast-heights rather than in meters, and the last notch stops short of the horizon, so no part of this board can be answered by stepping until the readout matches it.";

interface Board {
  /** How high the dish hangs above the deck, in meters. */
  height: number;
  /** The heading the third question counts on from, in degrees. */
  from: number;
  /** The third question's answer, in degrees. */
  nextFail: number;
  /** True when the third question swings the mount the other way. */
  reversed: boolean;
}

/**
 * Two yards. The height changes what the first answer is, and the third question changes
 * which way the failures run: on one board it counts forward to the next one inside a turn,
 * and on the other it swings the mount the other way and asks for the negative heading. Both
 * are the same fact, that the breaks sit half a turn apart forever in both directions.
 */
const BOARDS: readonly Board[] = [
  { height: 12, from: 90, nextFail: 270, reversed: false },
  { height: 20, from: 0, nextFail: -90, reversed: true },
];

interface Part {
  key: string;
  question: ReactNode;
  answer: number;
  /** How the answer is said, for the reveal and the field's accessible name. */
  unit: "meters" | "degrees";
  why: ReactNode;
}

function partsOf(board: Board): readonly Part[] {
  return [
    {
      key: "reach",
      unit: "meters",
      question: (
        <>
          This dish hangs <InlineMath latex={`${board.height}`} /> meters above the deck.
          Swing the beam to <InlineMath latex="45^{\circ}" />: how many meters out from the
          foot of the mast does it land?
        </>
      ),
      answer: board.height,
      why: (
        <>
          At <InlineMath latex="45^{\circ}" /> the beam has swung exactly halfway between
          the mast and the horizon, so it drops as far as it runs out and{" "}
          <InlineMath latex="\tan 45^{\circ} = 1" />. One mast-height out from a dish
          hanging <InlineMath latex={`${board.height}`} /> meters up is{" "}
          <InlineMath latex={`${board.height}`} /> meters.
        </>
      ),
    },
    {
      key: "asymptote",
      unit: "degrees",
      question: (
        <>
          The stepper stops short of the horizon. Give the swing, in degrees, at which the
          beam has no landing point on the deck at all.
        </>
      ),
      answer: 90,
      why: (
        <>
          A swing of <InlineMath latex="90^{\circ}" /> aims the beam dead along the deck, so
          it never comes down and there is no landing point however far out you walk. That
          is the heading <InlineMath latex="\tan\theta" /> has no value at, and the reason
          the readout climbs without bound as the stepper approaches it.
        </>
      ),
    },
    {
      key: "next",
      unit: "degrees",
      question: board.reversed ? (
        <>
          The mount swings the other way as well, and a swing that way is counted as
          negative. Give the negative swing at which the beam again has no landing point.
        </>
      ) : (
        <>
          Keep swinging past the horizon. Counting on from{" "}
          <InlineMath latex={`${board.from}^{\\circ}`} />, give the next swing under a full
          turn with no landing point.
        </>
      ),
      answer: board.nextFail,
      why: board.reversed ? (
        <>
          Swung the other way the beam reaches the horizon after the same quarter turn, so
          the break sits at <InlineMath latex="-90^{\circ}" />. Tangent breaks every half
          turn in both directions, which is why its graph is a row of separate branches
          rather than one curve.
        </>
      ) : (
        <>
          Half a turn on from <InlineMath latex="90^{\circ}" /> the beam aims along the deck
          again, the opposite way, so it fails a second time at{" "}
          <InlineMath latex="270^{\circ}" />. The breaks are half a turn apart because a
          ratio of two lengths cannot tell one direction along a line from the other.
        </>
      ),
    },
  ];
}

/** The reach at a swing, in mast-heights, to two decimal places. */
function reachOf(degrees: number): number {
  return Math.round(Math.tan((degrees * Math.PI) / 180) * 100) / 100;
}

export function TrigTangentExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <TrigTangentExploreBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function TrigTangentExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const parts = partsOf(board);
  const [notch, setNotch] = useState(0);
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealedAt, setRevealedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = at >= parts.length;
  const open = parts[at] ?? null;
  const swing = NOTCHES[notch] ?? 0;
  const reach = reachOf(swing);
  const last = notch >= NOTCHES.length - 1;

  function advance(earned: boolean) {
    const next = at + 1;
    setAt(next);
    setTyped("");
    setAttempted(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= parts.length) {
      onSolved();
    }
  }

  function check() {
    if (open === null) {
      return;
    }
    setAttempted(true);
    // A fresh attempt steps the reveal aside, so it can be offered again for the part in
    // hand rather than staying spent on the one it already explained.
    setRevealedAt(null);
    const entered = typed.trim();
    if (entered === "") {
      setFeedback(
        open.unit === "meters"
          ? "Enter the distance as a plain number of meters."
          : "Enter the swing as a plain number of degrees.",
      );
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about tangents and mast-heights, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(entered, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === open.answer) {
      advance(true);
      return;
    }
    setFeedback(
      "Not that one. The reach is the swing's tangent counted in mast-heights, and it has no value at all once the beam is aimed along the deck.",
    );
  }

  // The mast stands on the left and the deck runs out to the right, so the drop from the
  // dish to the deck is one mast-height and the landing point is that many multiplied by
  // the tangent. The picture is the function rather than a drawing of it.
  const foot = { x: 74, y: 168 };
  const dish = { x: 74, y: 48 };
  const drop = foot.y - dish.y;
  const deckEnd = 424;
  const landing = foot.x + reach * drop;
  const offDeck = landing > deckEnd;
  const beamEnd = offDeck ? deckEnd : landing;
  // Off the deck the beam is drawn to the yard's edge at the slope it really has, so it
  // leaves the picture rather than bending down to a landing point that is not there.
  const beamY = offDeck ? dish.y + (deckEnd - foot.x) / (reach || 1) : foot.y;

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      {/* The question for the part in hand, not a board-level goal: what a learner has to work
          out right now is the first thing on the widget, and feedback cannot take it away. */}
      <WidgetTask>
        {solved ? (
          <>
            All three are in: the run the beam makes at a half-swing, and the two swings at
            which it has no landing point on the deck at all.
          </>
        ) : (
          <>
            Part {at + 1} of {parts.length}. {open?.question} Get all three and the board
            will hold the one run this mount can report and the two headings it cannot.
          </>
        )}
      </WidgetTask>

      {/* 360, not the default 460, and as on TRG.5 the figure is not what was over: the panel
        was the taller column at 274.8px against a 209.1px mast, 3.5px past the 350px band. The
        wider panel a narrower figure column buys is what rewraps the trailing note. */}
      <WidgetBeside
        figureWidth={360}
        figure={
          <svg
            viewBox="0 0 440 200"
            role="img"
            aria-label={`A dish on a mast one mast-height above the deck, its beam swung ${swing} degrees from the mast, landing ${reach} mast-heights out from the foot`}
          >
            <title>
              A dish swung down toward the horizon, and where its beam meets the deck
            </title>

            <line
              x1={40}
              y1={foot.y}
              x2={deckEnd}
              y2={foot.y}
              stroke={LINE}
              strokeWidth={1.6}
            />
            <line
              x1={foot.x}
              y1={foot.y}
              x2={dish.x}
              y2={dish.y}
              stroke={LABEL}
              strokeWidth={2.4}
            />
            <circle
              cx={dish.x}
              cy={dish.y}
              r={7}
              fill="none"
              stroke={LABEL}
              strokeWidth={2}
            />

            {/* The beam, at the slope its own swing gives it. */}
            <line
              x1={dish.x}
              y1={dish.y}
              x2={beamEnd}
              y2={beamY}
              stroke={SIGNAL}
              strokeWidth={2.4}
            />
            {offDeck ? null : (
              <circle cx={landing} cy={foot.y} r={5} fill={CIVIC} stroke="none" />
            )}

            {/* The run along the deck, from the foot out to where the beam comes down. */}
            {offDeck ? null : (
              <line
                x1={foot.x}
                y1={foot.y + 12}
                x2={landing}
                y2={foot.y + 12}
                stroke={CIVIC}
                strokeWidth={1.6}
              />
            )}

            <SvgMath
              latex={`\\theta = ${swing}^{\\circ}`}
              x={dish.x + 66}
              y={dish.y + 22}
              fontSize={14}
              color={LABEL}
              w={110}
            />
            <SvgMath
              latex={`\\tan ${swing}^{\\circ} = ${reach.toFixed(2)}`}
              x={264}
              y={foot.y + 22}
              fontSize={14}
              color={offDeck ? BRICK : CIVIC}
              w={200}
            />
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__chip"
            disabled={last}
            aria-label="Swing the beam further down toward the horizon"
            onClick={() => setNotch((n) => Math.min(n + 1, NOTCHES.length - 1))}
          >
            Swing further
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            disabled={notch === 0}
            aria-label="Bring the beam back to the mast line"
            onClick={() => setNotch(0)}
          >
            Back to upright
          </button>
          <span className="lesson-interactive__chip" data-state="waiting">
            <InlineMath
              latex={`${reach.toFixed(2)}\\;\\text{mast-heights out}`}
              color={offDeck ? BRICK : LABEL}
            />
          </span>
        </div>

        <div className="lesson-interactive__row">
          {parts.map((part, index) => (
            <span
              key={part.key}
              data-part-slot={part.key}
              data-state={index < at ? "solved" : "waiting"}
              data-open={index === at ? "yes" : "no"}
              className="lesson-interactive__chip"
            >
              <InlineMath
                latex={
                  index < at
                    ? `${part.answer}${part.unit === "degrees" ? "^{\\circ}" : "\\;\\text{m}"}`
                    : "\\mathord{?}"
                }
                color={index < at ? CIVIC : SOFT}
              />
            </span>
          ))}
        </div>

        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over in a different yard
          </button>
        ) : (
          <div className="lesson-interactive__controls">
            <div className="lesson-interactive__field">
              <span className="lesson-interactive__field-label">
                {open?.unit === "degrees" ? "Degrees" : "Meters"}
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={typed}
                aria-label={
                  open?.unit === "degrees"
                    ? "The swing, in degrees"
                    : "The distance out from the foot of the mast, in meters"
                }
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    check();
                  }
                }}
                {...fill.entry(open?.answer ?? 0)}
              />
            </div>
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          </div>
        )}

        <WidgetReveal
          available={attempted && !solved}
          revealed={revealedAt !== null}
          answer={
            open ? (
              <InlineMath
                latex={`${open.answer}${open.unit === "degrees" ? "^{\\circ}" : "\\;\\text{m}"}`}
              />
            ) : null
          }
          why={open?.why ?? null}
          onReveal={() => {
            setRevealedAt(at);
            advance(false);
          }}
          label="Reveal this heading"
          othersRemain={at + 1 < parts.length}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {revealedAt !== null && !solved ? null : solved ? (
            <>
              The landing point is <InlineMath latex="\tan\theta" /> mast-heights out, so it
              runs away without bound as the beam approaches the horizon and there is no
              value waiting for it at the end. That heading is a vertical asymptote, and the
              next one is always half a turn away.
            </>
          ) : (
            (feedback ?? STEPPING)
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
