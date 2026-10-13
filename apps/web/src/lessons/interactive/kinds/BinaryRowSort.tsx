/**
 * INTERACTION KIND: a two-way call, per row, locked on the first tap.
 *
 * Several rows, the same two calls on offer under each of them, and a wrong tap LOCKS that
 * row rather than letting the learner take the other button. With only two options a
 * nudge-and-retry is not a question at all, so the lock is what makes it one. Both options
 * render in the same neutral token until a row settles, so colour never marks the answer
 * before it is given.
 *
 * ## What the gate turns on, and what it does not
 *
 * EVERY ROW CALLED. Not every row called correctly.
 *
 * The lock is what makes each row a question; it is not a reason to make the learner answer
 * the board twice. A learner who misses row one, reads the sentence it prints, and then calls
 * the remaining three correctly has answered every question on the board, and a gate that
 * stayed shut would send them back through the three they already knew in order to get past
 * the one they did not. The board is still only complete when nothing on it is unanswered:
 * this loosens WHICH completed boards count, and nothing about what completing one takes.
 *
 * Letting the learner through is not the same as pretending the miss did not happen, and the
 * miss is reported in exactly the places it was before: the row keeps the `chosenWrong` mark
 * on the option the learner took and the `standing` mark on the one they did not, it keeps
 * the sentence underneath saying why, the board's status line switches to `missedNote` in the
 * wrong valence, and the reveal below is still offered. The only thing that changed is that
 * none of that holds the learner on the board.
 *
 * ## Why the row does not collapse
 *
 * It used to. A settled row replaced both buttons with a single verdict, "Actually stays a
 * radical", and that threw away the teaching. "sqrt(32) stays a radical" only instructs while
 * it sits beside "you said it comes out whole": a text verdict TELLS, two options with one
 * marked right and one marked as the learner's miss SHOW. Removing the buttons also made an
 * answered row structurally unlike every unanswered one, so a finished row read as broken
 * rather than as done.
 *
 * So a settled row keeps both buttons, disabled, and marks them.
 *
 * ## Why the expression does not change either
 *
 * It used to. A row carried an optional `settledLatex`, and on the first tap the first column
 * swapped from `\sec 90^\circ` to `\sec 90^\circ = \dfrac{1}{0}`: the question replaced by its
 * working. That is the collapse above in a second costume. The learner is looking at the row
 * to check the call they just made, and the thing they made it about is no longer on screen,
 * so a miss becomes unreviewable at exactly the moment it is worth reviewing.
 *
 * It also moved the board. The settled reading is the WIDER string wherever it says anything,
 * so the first track grew on a tap and, because `.lesson-classify` sizes its columns across
 * every row at once, the growth spread sideways through rows the learner had not touched.
 * A board that shifts under a press reads as broken however good the new string is.
 *
 * The reading itself was never the problem, and it has not been thrown away: it is in the
 * row's `note`, under the row, on a miss, and at greater length in the board's `why` behind
 * the reveal. Both were already there. So the first column is `row.latex` in every state, on
 * the parity `abs-count-classify` has always had, and `classifyNumericCallOrder.browser.test.tsx`
 * measures it over every adopter after a right call and after a wrong one. Do not add a
 * second string for the settled state: put the reading where the two that carry it already are.
 *
 * ## And it does not MOVE either, which was a second cause with the same symptom
 *
 * Deleting the swap fixed what a row says and left where it says it. The verdict glyph was
 * rendered only once an option was marked, so it joined the chip's content on the first tap,
 * and `--cols-3` sizes its call columns from their content: measured at the 460px cap, one
 * press took every expression 7.4px left and every second call 7.4px right, on rows nobody had
 * touched. The mark span is therefore rendered ALWAYS and left empty until it has a glyph, with
 * `.lesson-classify__mark:empty::after` holding the slot open with the hidden tick, which is
 * what `abs-count-classify` has always done and why that board never moved. The same guard
 * takes a layout reading beside the string one and asserts both after every call, at the
 * in-city column, the figure cap and a phone; frames of the widest adopter at all three are in
 * that file's `?dev` pass. Both halves are needed, and the string half alone is green over a
 * board that still moves.
 *
 * ## The three marks, and the palette rule they follow
 *
 * `CIVIC` and `BRICK` are the app's correctness channel and they report on the LEARNER'S
 * ACTION. That is the whole of what they may say, which is the rule `SpotTheError` was rebuilt
 * around after a correct pick came back boxed in the wrong colour.
 *
 *  - The learner picked it and was right: `CIVIC`, solid, filled. A verdict on the pick.
 *  - The learner picked it and was wrong: `BRICK`, solid, outline only. Also a verdict.
 *  - The call that was right on a row the learner MISSED: `SIGNAL_DEEP`, dashed. This one is
 *    not a verdict on anybody, because the learner did not pick it, so it leaves the
 *    correctness palette entirely rather than borrowing the success end of it.
 *
 * None of the three is carried by colour alone: each names itself in its accessible name and
 * in a glyph, and the learner's own pick is solid where the standing mark is dashed. The
 * classified expression itself stays INK in every state, because tinting it by the learner's
 * correctness put a third meaning on the same palette and made a perfectly good `sqrt(32)`
 * look like the thing that was wrong.
 *
 * ## Why there is no verdict mark outside the row
 *
 * There was one: a check column, `CIVIC` tick or `BRICK` cross, at the end of every settled
 * row. It made sense while a settled row COLLAPSED, because then the row itself said only
 * what the answer was and something had to say whether the learner got it. Marking both
 * options inline took that job over and the column became a second copy of it, so a row
 * answered correctly showed two ticks for one answer, and a missed row showed a cross inside
 * the wrong pick, a tick inside the right one, and a third mark outside in a fourth position:
 * three marks in two valences for one call. Its removal costs no channel — the marks carry
 * colour, fill, border style, glyph and an accessible name each — and it gives the row's
 * three columns the width the fourth track was holding.
 *
 * ## The explanation is on the row, in the wrong-valence colour, with nothing to open
 *
 * One short sentence, under the row, only on a miss. It used to be `--ink-soft`, which reads
 * as an aside rather than as the reason the pick above it is marked wrong, and the reasoning
 * proper sat behind a per-row disclosure ("Why that row") that put a full-width button between
 * two rows of a four-row grid. So the sentence now carries `BRICK`, the same way
 * `.lesson-interactive__status[data-state="wrong"]` already does, and it is the whole of what
 * a missed row says.
 *
 * Colour is not carrying that on its own. The sentence IS text, so its payload survives with
 * the hue removed; it is set heavier than the body it sits in; the valence is on the element
 * as `data-state` rather than only in a computed colour; and it is a `role="status"` region,
 * which is announced. That last channel is real here specifically because a settled row is
 * not a reveal: during a reveal the whole stage carries `inert` and nothing inside it is
 * exposed, so a name added there would be unreachable text that only looked like coverage.
 *
 * ## What the reveal still does, and where it went
 *
 * It explains, at greater length than the row's own sentence, and it writes the root out.
 * It is offered ONCE PER BOARD and only on a FINISHED board that has a miss on it, so it is
 * never a control on a row: the rows explain themselves, and the learner meets the offer at
 * the one moment they are choosing what to do next, beside the fresh deal.
 *
 * That is also the only moment at which its label is true. The shared layer appends ", then
 * try a new set" to the first reveal, which was a promise the per-row version did not keep
 * while three rows were still open; on a finished board the fresh set is exactly what comes
 * next. `othersRemain` is still read off the board rather than passed as a constant, and it is
 * false whenever the control is on screen, which is the right answer: a board with every row
 * called has nothing left to hand back.
 */

import { Fragment, type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP } from "../../svgKit";
import { WidgetReveal } from "../../widgetFeedback";
import { useRevealReAsk, useWidgetSuccess } from "../../widgetMechanics";
import { WidgetTask } from "../../widgetTask";

/** What a marked option is saying, in every channel it says it in. */
const MARKS = {
  /** Their pick, and it was right. The one mark that gets a fill. */
  chosenRight: {
    colour: CIVIC,
    style: "solid",
    fill: `color-mix(in srgb, ${CIVIC} 15%, var(--paper))`,
    glyph: "\u2713",
    spoken: "your answer, correct",
  },
  /** Their pick, and it was wrong. Outline only, so a fill never means "wrong". */
  chosenWrong: {
    colour: BRICK,
    style: "solid",
    fill: undefined,
    glyph: "\u2717",
    spoken: "your answer, wrong",
  },
  /** Not their pick: the call that was right here. A standing mark, so not green. */
  standing: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    fill: undefined,
    glyph: "\u2713",
    spoken: "the right call here, which you did not pick",
  },
} as const;

type MarkName = keyof typeof MARKS;

/**
 * The thing in a row's first column, as LaTeX.
 *
 * An ARRAY IS A LINE THAT MAY BREAK, and that is the only reason the array form exists.
 * KaTeX sets `white-space: nowrap` on its own output, so a whole compound inequality typeset
 * as one span has a min-content width equal to its full painted width, and the board's first
 * track cannot go below it however narrow the card is. `.lesson-classify__row
 * .lesson-interactive__step-eq` has said `white-space: normal` since the column work landed,
 * and for a single span it does nothing at all: the browser is permitted to break the cell and
 * given nowhere to do it.
 *
 * Written as parts, each part is typeset separately and the gaps BETWEEN them are ordinary
 * spaces in the cell rather than glue inside a KaTeX box, so those are break opportunities and
 * the first track's floor drops to the widest single part. Measured on `compound-band-sorter`
 * at the 304.8px phone width: one span for `w \ge 15 \;\text{ and }\; w \le 15` held the track
 * at 148.1px and pushed the last option 48.0px off the card.
 *
 * A plain string still renders as exactly one span, so a row with nothing to break stays what
 * it was.
 */
export type RowLatex = string | readonly string[];

/**
 * One plain measure and nothing else: an optional sign, digits, an optional decimal part, and
 * optionally a degree sign.
 *
 * This is the whole of what makes a first column a NUMBER COLUMN, and see `numericColumn` below
 * for why the kind asks the question rather than the adopter. Deliberately strict: `\sec 90^\circ`
 * and `w = 5.02` are readings ABOUT numbers, `8 \le w \le 21` is a comparison between them, and
 * none of the three is a number, so none of them gains anything from being read down its right
 * edge. Nothing here matches an array either, because a row written as parts is a row that may
 * break across lines and the edge a broken line ends at is not the edge of a column.
 */
const PLAIN_MEASURE = /^-?\d+(?:\.\d+)?(?:\s*\^\{\\circ\})?$/;

function isPlainMeasure(latex: RowLatex): boolean {
  return typeof latex === "string" && PLAIN_MEASURE.test(latex.trim());
}

export interface BinaryRow {
  id: string;
  /**
   * The thing being classified, as LaTeX, and the whole of what the first column ever shows:
   * it does not change when the row settles. See `RowLatex` for when to write parts.
   */
  latex: RowLatex;
  /** How a screen reader says it. */
  spoken: string;
  /**
   * True when the FIRST of the two options is the right call for this row.
   *
   * ON THE OPENING BOARD, ROW 0 IS `true` AND ROW 1 IS `false`. That is a contract on the
   * adopter's content rather than a fact about this file, and it is not a style preference:
   * `binaryRowMarks.browser.test.tsx` names its rows by POSITION, because an adopter's
   * expressions are its own and a driver that looked for one board's `\sqrt{81}` failed on
   * the second adopter out of a helper instead of by name. Naming by position needs the two
   * cases to be findable, so the first two rows have to answer opposite ways and which way
   * round has to be fixed. The sweep asserts it as its own precondition, so an adopter that
   * opens the other way round fails there by name.
   *
   * Below row 1 nothing is fixed, and two adopters deliberately do not carry on alternating:
   * `trg-quadrant-sorter` reads its four headings out of order so the board cannot be worked
   * by tapping alternate columns, and `trg-evenodd-sorter` has four odd calls against two
   * even and could not alternate if it wanted to.
   */
  first: boolean;
  /**
   * ONE short sentence: why the call the learner made was the wrong one. It is the whole of
   * what a missed row says, so it has to stand on its own without the reveal below being
   * opened.
   *
   * A node rather than a string, like `why` below: the sentence usually restates the row's
   * arithmetic, and it has to be typeset where it is restated rather than printed as bare
   * digits beside the KaTeX row it is about.
   */
  note: ReactNode;
  /** The fuller reasoning, printed by the board's reveal when this row was missed. */
  why: ReactNode;
}

export interface BinaryRowSortProps {
  /** WHAT the learner is being asked to produce, above the rows. */
  objective: ReactNode;
  /** The two calls, in the order they are drawn. The same two under every row. */
  options: readonly [string, string];
  rows: readonly BinaryRow[];
  /** HOW to work the board. One short line, on the status line until a row is answered. */
  prompt: string;
  /** Said once every row is right. */
  conclusion: ReactNode;
  /** Said once the board is complete but a row was missed. */
  missedNote: string;
  onSolved: () => void;
  onRestart: () => void;
  restartLabel: string;
  /** The reset label after a missed board, which deals fresh rows rather than a clean pass. */
  missedRestartLabel: string;
}

/**
 * A row's expression, as one KaTeX span per part with a real space between them.
 *
 * The space is a text node in the CELL, outside every `.katex` box, which is what makes it a
 * break opportunity: inside one it would be glue KaTeX has already declared unbreakable.
 */
function RowMath({ latex, color }: { latex: RowLatex; color?: string }) {
  if (typeof latex === "string") {
    return <InlineMath latex={latex} color={color} />;
  }
  // Keyed by the part and by how many times that part has already appeared, so a rule that
  // repeats a piece of itself still gives every span a key of its own.
  const seen = new Map<string, number>();
  const parts = latex.map((part) => {
    const nth = (seen.get(part) ?? 0) + 1;
    seen.set(part, nth);
    return { part, key: `${part}#${nth}` };
  });
  return (
    <>
      {parts.map(({ part, key }, at) => (
        <Fragment key={key}>
          {at === 0 ? null : " "}
          <InlineMath latex={part} color={color} />
        </Fragment>
      ))}
    </>
  );
}

export function BinaryRowSort({
  objective,
  options,
  rows,
  prompt,
  conclusion,
  missedNote,
  onSolved,
  onRestart,
  restartLabel,
  missedRestartLabel,
}: BinaryRowSortProps) {
  const [calls, setCalls] = useState<Record<string, boolean>>({});
  const [walked, setWalked] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const complete = Object.keys(calls).length === rows.length;
  const missed = Object.values(calls).some((hit) => !hit);
  /**
   * Every row called AND every call right. This is what the CONCLUSION is said about, and it
   * is no longer what the gate turns on: see `answer`.
   */
  const clean = complete && !missed;
  /** The rows a wrong tap settled, in board order: what the board's reveal is about. */
  const missedRows = rows.filter((row) => calls[row.id] === false);

  function answer(row: BinaryRow, tookFirst: boolean) {
    if (calls[row.id] !== undefined) {
      return;
    }
    const hit = tookFirst === row.first;
    const next = { ...calls, [row.id]: hit };
    setCalls(next);
    if (hit) {
      success();
    }
    // CALLED, not called correctly. A learner who misses one row and then reads the board
    // and gets the rest right has answered every question on it, and holding the gate shut
    // makes them redo the three they knew to get past the one they did not. The miss is not
    // erased by letting them through: the row keeps its `chosenWrong` mark and its sentence,
    // the board's status line reports it, and the reveal is still on offer below.
    if (Object.keys(next).length === rows.length && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** Both options render in the SAME neutral token until the row settles. */
  const neutral = { color: LABEL, borderColor: LINE };

  /**
   * A COLUMN OF PLAIN NUMBERS, WHICH IS READ DOWN ITS RIGHT EDGE.
   *
   * Reported on TRG.1: `-320^\circ` sat under `400^\circ` with its minus sign in the hundreds
   * column, and read down the column the four measures were four strings that happened to be
   * numbers rather than four numbers. Aligned from the start of the track, a signed measure puts
   * every digit one character right of the digits above it and every degree sign wherever its own
   * string ends; aligned from the right, the units line up under the units and the board can be
   * scanned. Measured at the 920px in-city column, that ragged right edge was 13.1px on
   * `trg-coterminal-sorter` and 21.5px on `trg-window-sorter`.
   *
   * ## The kind asks, because the adopter is not the one who knows
   *
   * Not a prop and not a list of board ids. Both would put the decision on twelve adopters one at
   * a time, and it is not theirs to make: what makes a column a number column is that everything
   * in it is a number, which is a fact about the rows the kind was handed and is visible right
   * here. So the thirteenth adopter whose rows are plain measures is aligned correctly without
   * anybody remembering to ask, and an adopter that changes its rows from measures to expressions
   * stops being aligned as a number column in the same edit that stops it being one.
   *
   * `every` over the rows and not `some`, because a column is only a number column if the whole
   * of it is: one `\sec 90^\circ` among four measures is a column of mixed strings, and right-
   * aligning those would align the ends of unrelated things.
   *
   * `classifyNumericCallOrder.browser.test.tsx` measures which boards this lands on, in both
   * directions: exactly the two whose rows are plain measures come out right-aligned, and the
   * other ten are floored as still aligned from the start, so a predicate that has widened to
   * everything and one that has narrowed to nothing both fail.
   */
  const numericColumn = rows.length > 0 && rows.every((row) => isPlainMeasure(row.latex));

  /**
   * The call that was right on each row the learner missed, named beside the row it belongs
   * to. Several rows can be missed on one board, so the answer the passage states has to say
   * WHICH row each call is for; "Stays a radical and Comes out whole" on its own leaves the
   * learner matching two calls to two roots by guesswork.
   */
  const missedCalls = (
    <>
      {missedRows.map((row, at) => (
        <Fragment key={row.id}>
          {at === 0 ? null : at === missedRows.length - 1 ? " and " : ", "}
          <RowMath latex={row.latex} />
          {`: ${row.first ? options[0] : options[1]}`}
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>{objective}</WidgetTask>

      {/* The board, and the grid every row borrows its columns from. Without this element each
          row was a grid of its own and the only thing aligning them was a hardcoded track
          width, which is what kept clipping the labels. Three columns here: both options are
          marked inline, so there is no verdict column. */}
      <div
        className={`lesson-classify lesson-classify--cols-3${
          numericColumn ? " lesson-classify--numeric" : ""
        }`}
      >
        {rows.map((row) => {
          const call = calls[row.id];
          const locked = call !== undefined;
          /** Which mark, if any, belongs on the option at this side of the row. */
          const markOf = (isFirst: boolean): MarkName | null => {
            if (!locked) {
              return null;
            }
            const right = isFirst === row.first;
            const picked = isFirst === (call ? row.first : !row.first);
            if (picked) {
              return right ? "chosenRight" : "chosenWrong";
            }
            return right ? "standing" : null;
          };
          return (
            <div
              key={row.id}
              className="lesson-classify__item"
              // The row's settled-ness, as an attribute rather than only as whatever the marks
              // happen to look like. It is what a test can wait on without reading the options,
              // which is the property the check column used to provide: waiting on the buttons
              // instead would make an implementation that REMOVED them time out in a helper
              // rather than fail by name.
              data-settled={locked ? "true" : undefined}
            >
              <div className="lesson-classify__row">
                {/* Ink in every state, and the SAME STRING in every state. The verdict is on
                  the two options; tinting the expression by the learner's own correctness made
                  the expression itself look like the thing that was wrong, and swapping it for
                  its worked reading took the question away from the learner checking their own
                  call. The reading lives in `note` and in the reveal's `why`. */}
                <span className="lesson-interactive__step-eq">
                  <RowMath latex={row.latex} color={LABEL} />
                </span>
                {options.map((label, at) => {
                  const isFirst = at === 0;
                  const name = markOf(isFirst);
                  const mark = name === null ? null : MARKS[name];
                  return (
                    <button
                      key={label}
                      type="button"
                      className="lesson-interactive__chip"
                      data-mark={name ?? undefined}
                      disabled={locked}
                      aria-label={
                        mark === null
                          ? `${row.spoken}: ${label}`
                          : `${row.spoken}: ${label}, ${mark.spoken}`
                      }
                      style={
                        mark === null
                          ? neutral
                          : {
                              color: mark.colour,
                              borderColor: mark.colour,
                              borderStyle: mark.style,
                              background: mark.fill,
                            }
                      }
                      onClick={() => answer(row, isFirst)}
                    >
                      {label}
                      {/* ALWAYS PRESENT, AND EMPTY UNTIL THIS OPTION IS MARKED. The slot is
                          the other half of "the board does not move when you answer it", and
                          it is the half the expression swap was hiding.

                          Rendered only on a call, the glyph joins the chip's `max-content` on
                          the first tap, and `--cols-3` sizes its call columns from their
                          content, so answering ONE row re-laid out every row on the board:
                          measured at the 460px cap, one press on `trg-window-sorter` took
                          every expression 7.4px left and every second call 7.4px right,
                          including on rows the learner had not touched.

                          Present and empty, `.lesson-classify__mark:empty::after` fills it
                          with the real glyph, hidden, so the column is the width of the thing
                          that will land in it from first paint. This is exactly what
                          `abs-count-classify` does, and it is why that board never moved.
                          Pseudo-element content is not in `textContent`, so the mark guards
                          still read an unmarked option as saying nothing. */}
                      <span aria-hidden="true" className="lesson-classify__mark">
                        {mark === null ? "" : mark.glyph}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* The whole of what a missed row says, under the row it is about rather than in
                the widget's status line where the next row's tap would overwrite it. Only on a
                miss: a correct call needs no argument made to it, and printing one under every
                row would bury the two that do.

                `data-state` carries the valence, so the red below is derived from something in
                the DOM rather than being the only place the state lives, and `role="status"`
                announces it. Both channels are reachable here because a settled row is not a
                reveal: the stage is only `inert` while a passage is up. */}
              {locked && !call ? (
                <p className="lesson-classify__note" data-state="wrong" role="status">
                  {row.note}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {complete && (
        <div className="lesson-interactive__controls">
          {/* One reveal for the board, and only on a finished board with a miss on it, so no
              row carries a control: each explains itself in the sentence under it. Here the
              shared layer's ", then try a new set" is also true, which it was not while three
              rows were still open. */}
          <WidgetReveal
            available={missed}
            revealed={walked}
            answer={missedCalls}
            why={missedRows.map((row) => <Fragment key={row.id}>{row.why} </Fragment>)}
            onReveal={() => setWalked(true)}
            // Names what pressing it does. "Why that row" put a question on the board beside
            // the sentence that already answers it, and it read as the place the reason lived.
            label="Show the working"
            // Read off the board rather than passed as a constant. False whenever this control
            // is on screen, which is the right answer: every row has been called, so there is
            // nothing to hand back and the way on is the fresh deal beside it.
            othersRemain={rows.some((r) => calls[r.id] === undefined)}
          />
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            {missed ? missedRestartLabel : restartLabel}
          </button>
        </div>
      )}

      {/* The board-level line, and only that: a miss is reported under the row it happened
          on, so this stays on the task while rows are still open. `data-state` follows the
          CONTENT rather than the miss, or a mid-board miss would turn the standing task red
          and say nothing about which row. */}
      <p
        className="lesson-interactive__status"
        data-state={clean ? "solved" : complete && missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {clean ? conclusion : complete && missed ? missedNote : prompt}
      </p>
    </div>
  );
}
