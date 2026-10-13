/**
 * GEO.2 interactive (slide 3): the net of a box, sorted into the faces the job covers.
 *
 * Surface area goes wrong in two different places, and this board is built to separate them.
 * The first is thinking a solid needs a new formula; the net answers that by laying all six
 * faces flat, where the total is plainly the sum of six rectangles. The second is assuming
 * all six are wanted, and no formula can answer that: which faces are covered is decided by
 * the job, so the board states a job and asks the learner to say, face by face, whether it is
 * covered or bare. The running total then builds out of the faces they actually claimed.
 *
 * A face is picked up from the net and put into a pile, which is a drag, and also a tap on
 * the face followed by a tap on the pile (`usePickup`), so the board is finishable from the
 * keyboard. A face lands where it is put and STAYS there: a board that let a wrong face be
 * dragged straight back out would be answerable by trying both piles.
 *
 * Neither job is the check's cistern. The first covers everything except the floor the chest
 * stands on, and the second leaves two faces bare, so "one face missing" is never the rule.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { usePickup } from "./pickup";

/** Pixels per meter in the unfolded net. */
const UNIT = 18;
/** The two piles a face can go into. `true` is the sheeted one. */
const PILES = [
  { id: "covered", label: "covered by the job", sheeted: true },
  { id: "bare", label: "left bare", sheeted: false },
] as const;

const CELLS = ["far", "left", "floor", "right", "near", "lid"] as const;
type CellKey = (typeof CELLS)[number];

interface FaceSpec {
  /** What the job calls this face. */
  name: string;
  /** Whether the job covers it. */
  sheeted: boolean;
}

interface Board {
  id: string;
  /** The work, in one sentence, since the work is what decides the answer. */
  job: string;
  length: number;
  width: number;
  height: number;
  faces: Record<CellKey, FaceSpec>;
  /** Why the bare faces of THIS job are bare. */
  why: string;
}

const BOARDS: readonly Board[] = [
  {
    id: "chest",
    job: "A chest is to be faced in lead everywhere the weather reaches it. It stands flat on the floor of the store, so its underside is never faced.",
    length: 6,
    width: 4,
    height: 3,
    faces: {
      floor: { name: "underside", sheeted: false },
      lid: { name: "top", sheeted: true },
      far: { name: "back", sheeted: true },
      near: { name: "front", sheeted: true },
      left: { name: "left end", sheeted: true },
      right: { name: "right end", sheeted: true },
    },
    why: "The underside is pressed against the store floor, so nothing is laid on it.",
  },
  {
    id: "trough",
    job: "A watering trough is lined with lead inside. It has no lid, and its back runs along a wall it is built against, so neither of those is lined.",
    length: 7,
    width: 3,
    height: 2,
    faces: {
      floor: { name: "base", sheeted: true },
      lid: { name: "open top", sheeted: false },
      far: { name: "back, against the wall", sheeted: false },
      near: { name: "front", sheeted: true },
      left: { name: "left end", sheeted: true },
      right: { name: "right end", sheeted: true },
    },
    why: "A trough open at the top has no face there to line, and the back is walled in behind the stonework.",
  },
];

/** One cell of the unfolded net: where it sits, and the rectangle it is. */
interface Cell {
  key: CellKey;
  /** meters from the net's top left. */
  x: number;
  y: number;
  /** The two sides of the face, in meters. */
  across: number;
  down: number;
}

function cellsOf(board: Board): readonly Cell[] {
  const { length: l, width: w, height: h } = board;
  return [
    { key: "far", x: h, y: 0, across: l, down: h },
    { key: "left", x: 0, y: h, across: h, down: w },
    { key: "floor", x: h, y: h, across: l, down: w },
    { key: "right", x: h + l, y: h, across: h, down: w },
    { key: "near", x: h, y: h + w, across: l, down: h },
    { key: "lid", x: h, y: h + w + h, across: l, down: w },
  ];
}

export function GeoNetDrag(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GeoNetDragBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GeoNetDragBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** Face key -> the pile the learner put it in, as a `sheeted` flag. */
  const [placed, setPlaced] = useState<Partial<Record<CellKey, boolean>>>({});
  const [walked, setWalked] = useState(false);
  const [done, setDone] = useState(false);
  const [over, setOver] = useState<string | null>(null);
  const pickup = usePickup<CellKey>();
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const cells = cellsOf(board);
  const area = (cell: Cell) => cell.across * cell.down;

  const wrongKeys = CELLS.filter(
    (key) => placed[key] !== undefined && placed[key] !== board.faces[key].sheeted,
  );
  const unplaced = CELLS.filter((key) => placed[key] === undefined);
  const complete = unplaced.length === 0;
  const missed = wrongKeys.length > 0;
  const solved = complete && !missed;

  /** The faces correctly claimed as covered, in the order the net lays them out. */
  const claimed = cells.filter(
    (cell) => placed[cell.key] === true && board.faces[cell.key].sheeted,
  );
  const running = claimed.reduce((sum, cell) => sum + area(cell), 0);
  /** The whole job, for the status line once the board is clean. */
  const total = cells
    .filter((cell) => board.faces[cell.key].sheeted)
    .reduce((sum, cell) => sum + area(cell), 0);

  function drop(sheeted: boolean) {
    const key = pickup.take();
    setOver(null);
    if (key === null || placed[key] !== undefined) {
      return;
    }
    const next = { ...placed, [key]: sheeted };
    setPlaced(next);
    if (sheeted !== board.faces[key].sheeted) {
      return;
    }
    success();
    const clean = CELLS.every((cell) => next[cell] === board.faces[cell].sheeted);
    if (clean && !done) {
      setDone(true);
      onSolved();
    }
  }

  const netW = (board.length + 2 * board.height) * UNIT;
  const netH = (2 * board.height + 2 * board.width) * UNIT;
  const originX = (440 - netW) / 2;
  const originY = 16;

  /** The face a reveal is about: the first one put in the wrong pile. */
  const explained = wrongKeys[0] ?? null;

  return (
    <div className="lesson-interactive lesson-interactive--sorter">
      <WidgetTask>
        Goal: put every face of this net into the pile it belongs to for the job below, so
        that what is left in the covered pile adds up to the sheet the work actually takes.
      </WidgetTask>

      <p className="lesson-classify__reading">{board.job}</p>

      <svg
        viewBox={`0 0 440 ${Math.max(300, netH + 40)}`}
        role="img"
        aria-label={`The net of a box ${board.length} meters by ${board.width} meters by ${board.height} meters, laid out flat as six faces`}
      >
        <title>The six faces of the box, unfolded</title>
        {cells.map((cell) => {
          const spec = board.faces[cell.key];
          const call = placed[cell.key];
          const right = call === undefined ? null : call === spec.sheeted;
          const edge = right === null ? LINE : right ? CIVIC : BRICK;
          return (
            <foreignObject
              key={cell.key}
              x={originX + cell.x * UNIT}
              y={originY + cell.y * UNIT}
              width={cell.across * UNIT}
              height={cell.down * UNIT}
              style={{ overflow: "visible" }}
            >
              <button
                type="button"
                data-drop-slot=""
                data-face={cell.key}
                disabled={call !== undefined}
                aria-pressed={pickup.held === cell.key}
                aria-label={
                  call === undefined
                    ? `${spec.name}, ${cell.across} meters by ${cell.down} meters`
                    : `${spec.name}, ${cell.across} meters by ${cell.down} meters, put in the ${
                        call ? "covered" : "bare"
                      } pile, ${right ? "correct" : "wrong"}`
                }
                draggable={call === undefined}
                onDragStart={() => pickup.hold(cell.key)}
                onDragEnd={() => pickup.clear()}
                onClick={() => pickup.toggle(cell.key)}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  padding: 2,
                  border: `${pickup.held === cell.key ? 2.5 : 1.5}px solid ${
                    pickup.held === cell.key ? SIGNAL_DEEP : edge
                  }`,
                  borderRadius: 6,
                  background:
                    right === true
                      ? `color-mix(in srgb, ${CIVIC} 12%, var(--paper))`
                      : "var(--paper)",
                  color: right === null ? LABEL : right ? CIVIC : BRICK,
                  cursor: call === undefined ? "grab" : "default",
                  fontSize: 10,
                  lineHeight: 1.1,
                }}
              >
                <span>{spec.name}</span>
                <InlineMath latex={`${cell.across} \\times ${cell.down}`} />
              </button>
            </foreignObject>
          );
        })}
      </svg>

      <div className="lesson-sorter__bins lesson-sorter__bins--pair">
        {PILES.map((pile) => (
          <div
            key={pile.id}
            className="lesson-sorter__bin"
            style={{ color: over === pile.id ? SIGNAL_DEEP : SOFT }}
          >
            {/* The pile's drop handlers sit on the button rather than on the bin around it,
                which is how `MatchPairs` and `LabelParts` take a drop too: a bare div holding
                a pointer handler is not reachable by keyboard, and the button already carries
                the name and the click path that a dragless learner uses. */}
            <button
              type="button"
              className="lesson-sorter__bin-label"
              aria-label={`Put the face you are holding in the pile ${pile.label}`}
              style={{
                border: "none",
                background: "none",
                color: "inherit",
                cursor: "pointer",
                display: "block",
                width: "100%",
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => setOver(pile.id)}
              onDragLeave={() => setOver((held) => (held === pile.id ? null : held))}
              onDrop={() => drop(pile.sheeted)}
              onClick={() => drop(pile.sheeted)}
            >
              {pile.label}
            </button>
            <span className="lesson-sorter__bin-items">
              {cells
                .filter((cell) => placed[cell.key] === pile.sheeted)
                .map((cell) => (
                  <span
                    key={cell.key}
                    className="lesson-sorter__placed"
                    style={{
                      color: board.faces[cell.key].sheeted === pile.sheeted ? CIVIC : BRICK,
                    }}
                  >
                    <InlineMath
                      latex={`${cell.across} \\times ${cell.down}`}
                      color={board.faces[cell.key].sheeted === pile.sheeted ? CIVIC : BRICK}
                    />
                  </span>
                ))}
            </span>
          </div>
        ))}
      </div>

      {claimed.length > 0 && (
        <p className="lesson-sorter__result">
          <InlineMath
            latex={`${claimed.map((cell) => area(cell)).join(" + ")} = ${running}`}
          />{" "}
          square meters claimed so far.
        </p>
      )}

      {complete && (
        <div className="lesson-interactive__controls">
          <WidgetReveal
            available={missed}
            revealed={walked}
            answer={
              explained === null
                ? null
                : board.faces[explained].sheeted
                  ? "covered by the job"
                  : "left bare"
            }
            why={
              explained === null ? null : (
                <>
                  {board.why} Which faces are counted is settled by the work rather than by
                  the solid: the same box lined all over would take{" "}
                  <InlineMath
                    latex={`${cells.map((cell) => area(cell)).reduce((sum, value) => sum + value, 0)}`}
                  />{" "}
                  square meters, and this job takes <InlineMath latex={`${total}`} />.
                </>
              )
            }
            onReveal={() => setWalked(true)}
            label="Show the working"
            // Every face has been placed by the time this control exists.
            othersRemain={unplaced.length > 0}
          />
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {missed ? "Try a fresh job" : "Start over on a different job"}
          </button>
        </div>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : complete && missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            The job takes <InlineMath latex={`${total}`} /> square meters of sheet. Six
            rectangles laid flat, and only the ones the work covers are added.
          </>
        ) : complete && missed ? (
          "Every face is placed, and one of them went into the wrong pile. The reasoning is below, and a fresh job follows it."
        ) : (
          "Take each face in turn and ask whether this job actually reaches it. A face nobody covers is still a face of the box, and it still does not go into the total."
        )}
      </p>
    </div>
  );
}
