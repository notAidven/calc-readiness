/**
 * FUN.2 slide 0: domain and range read off a machine that is given as a finite ledger.
 *
 * The slide's claim is that a rule keeps TWO lists and they are different lists. A widget that
 * only asked for the domain would never expose the confusion, because the settings column is
 * the one a learner reads first anyway. So the board asks for the RANGE, and the decoys are
 * values that appear in the settings column and nowhere else: picking one is exactly the slip
 * the paragraph names, and it is visible on the board rather than asserted in prose.
 *
 * Two phases, so the judgement is earned. Every ledger line has to be traced before the value
 * chips come alive, which is where the one-input-to-one-output reading gets rebuilt from the
 * previous node, and the tracing itself is never judged. The call that follows is: a wrong chip
 * LOCKS and spoils the round, so the gate needs a clean board and "try the other one" is not a
 * strategy. One reading is produced by two different settings on each board, so listing it
 * twice is available as a mistake and the round completes only when each distinct reading has
 * been named once.
 */

import { Fragment, type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** One ledger line: a setting and the reading it produces. */
  rows: readonly { setting: number; reading: number }[];
  /**
   * Every chip on offer, in the order they are dealt. Correctness is derived from `rows`
   * rather than stored, so a board cannot declare a chip right that its own ledger refuses.
   */
  chips: readonly number[];
}

/**
 * Two ledgers. Neither reuses the other's numbers, in both of them one reading is produced by
 * two settings, and in both at least one decoy chip is a value the settings column carries and
 * the readings column does not.
 */
const BOARDS: readonly Board[] = [
  {
    rows: [
      { setting: 1, reading: 7 },
      { setting: 2, reading: 4 },
      { setting: 3, reading: 9 },
      { setting: 4, reading: 4 },
      { setting: 5, reading: 2 },
    ],
    // 3 and 5 are settings and never readings: the whole point of the board.
    chips: [4, 3, 9, 7, 5, 2],
  },
  {
    rows: [
      { setting: 2, reading: 5 },
      { setting: 4, reading: 1 },
      { setting: 6, reading: 5 },
      { setting: 8, reading: 8 },
      { setting: 10, reading: 3 },
    ],
    // 8 is BOTH a setting and a reading, so "it is in the left column" is not a reason to
    // leave it out. 6 and 10 are settings only.
    chips: [8, 6, 3, 1, 10, 5],
  },
];

/** A value read aloud, since KaTeX makes `textContent` unusable for an accessible name. */
function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

export function DomainIntakeExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <DomainIntakeExploreBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function DomainIntakeExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [traced, setTraced] = useState<readonly number[]>([]);
  const [called, setCalled] = useState<readonly number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const readings = board.rows.map((row) => row.reading);
  /** The range: each reading once, in the order the ledger first produces it. */
  const range = readings.filter((value, at) => readings.indexOf(value) === at);
  const isReading = (value: number): boolean => readings.includes(value);

  const allTraced = traced.length === board.rows.length;
  const missed = called.filter((value) => !isReading(value));
  const spoiled = missed.length > 0;
  const found = range.filter((value) => called.includes(value));
  const outstanding = range.filter((value) => !called.includes(value));
  const complete = outstanding.length === 0;

  function trace(setting: number) {
    setTraced((prev) => (prev.includes(setting) ? prev : [...prev, setting]));
  }

  function call(value: number) {
    if (!allTraced || called.includes(value)) {
      return;
    }
    const next = [...called, value];
    setCalled(next);
    if (!isReading(value)) {
      return;
    }
    success();
    const clean = next.every(isReading);
    const whole = range.every((candidate) => next.includes(candidate));
    if (clean && whole && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** The reveal names the range, which is the answer the board is asking for. */
  const rangeAnswer: ReactNode = (
    <>
      {range.map((value, at) => (
        <Fragment key={value}>
          {at === 0 ? null : at === range.length - 1 ? " and " : ", "}
          <InlineMath latex={String(value)} />
        </Fragment>
      ))}
    </>
  );

  /** Fill the unnamed readings in and close the board out, keeping the misses on screen. */
  function reveal() {
    setRevealed(true);
    setCalled((prev) => [...prev, ...range.filter((value) => !prev.includes(value))]);
  }

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <WidgetTask>
        Goal: name every value this machine can hand back, and nothing else. Those values
        together are its range.
      </WidgetTask>

      {/* The ledger. Each line is a control rather than a printed row, so the pairing is
          something the learner walks rather than something they are shown. Tracing is never
          judged: it is the reading of the machine that the naming below rests on. */}
      <div className="lesson-interactive__controls">
        {board.rows.map((row) => {
          const shown = traced.includes(row.setting);
          return (
            <button
              key={row.setting}
              type="button"
              className="lesson-interactive__chip"
              style={{ color: LABEL, borderColor: shown ? SOFT : LINE }}
              aria-label={
                shown
                  ? `setting ${spoken(row.setting)} gives the reading ${spoken(row.reading)}`
                  : `run setting ${spoken(row.setting)} through the machine`
              }
              onClick={() => trace(row.setting)}
            >
              <InlineMath
                latex={
                  shown
                    ? `f(${row.setting}) = ${row.reading}`
                    : `f(${row.setting}) = \\square`
                }
              />
            </button>
          );
        })}
      </div>

      {/* Every chip renders in the same neutral token until its own call settles, so no
          colour on the board answers the question before the learner does. */}
      <div className="lesson-interactive__controls">
        {board.chips.map((value) => {
          const settled = called.includes(value);
          const right = isReading(value);
          const tone = right ? CIVIC : BRICK;
          return (
            <button
              key={value}
              type="button"
              className="lesson-interactive__chip"
              disabled={!allTraced || settled}
              style={{
                color: settled ? tone : LABEL,
                borderColor: settled ? tone : LINE,
              }}
              aria-label={
                settled
                  ? `${spoken(value)}, ${right ? "in the range" : "not in the range, it is only a setting"}`
                  : `${spoken(value)}, is it in the range`
              }
              onClick={() => call(value)}
            >
              <InlineMath latex={String(value)} />
              {settled ? (
                <span aria-hidden="true" className="lesson-classify__mark">
                  {right ? "\u2713" : "\u2717"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {complete || spoiled ? (
        <div className="lesson-interactive__controls">
          <WidgetReveal
            available={spoiled}
            revealed={revealed}
            answer={rangeAnswer}
            why={
              <>
                The range is the right-hand side of the ledger, with each value listed once
                however many settings produce it. A value that appears only on the left is a
                setting the machine accepts, which puts it in the domain and says nothing at
                all about what the machine can hand back.
              </>
            }
            onReveal={reveal}
            label="Show the range"
            // Live: on the reveal that explains the last outstanding value this is false, so
            // the board is spent rather than handed back with the gate still on it.
            othersRemain={outstanding.length > 0}
          />
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {spoiled ? "Try a different machine" : "Start over on the other machine"}
          </button>
        </div>
      ) : null}

      <p
        className="lesson-interactive__status"
        data-state={spoiled ? "wrong" : complete ? "solved" : "prompt"}
        aria-live="polite"
      >
        {spoiled ? (
          <>
            <InlineMath latex={String(missed[0] ?? 0)} /> is a setting this machine accepts
            rather than a value it hands back, so it belongs to the domain and not to the
            range.
          </>
        ) : complete ? (
          <>
            That is the whole range. Two settings share a reading here, and a reading earns
            its place in the range once however many settings produce it.
          </>
        ) : allTraced ? (
          <>
            {found.length} of {range.length} named. Read down the right-hand side of the
            ledger, and count a repeated value only once.
          </>
        ) : (
          <>
            Run each setting through first. Every setting gives one reading, and the
            readings are what the range is made of.
          </>
        )}
      </p>
    </div>
  );
}
