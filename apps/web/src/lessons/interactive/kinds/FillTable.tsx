/**
 * INTERACTION KIND: filling in a table.
 *
 * Some rows of a table are already worked, the rest are blank, and the learner fills the
 * blanks one at a time from the top down. The rows that are already there are the pattern;
 * the rows that are missing are what the pattern forces. That is the right shape for any
 * idea whose argument is "the same move, applied again", because the table keeps the
 * previous line on screen next to the one being written, and a widget that showed one
 * question at a time would hide exactly the thing the learner has to notice.
 *
 * Each blank cell is answered by tapping one of the values on offer, and the values are
 * shared across the whole table, so a right answer has to be worked out rather than found
 * by elimination until the very end. The gate opens on the completed table.
 *
 * A reveal on a row with rows below it does not cost the table. It explains that row and
 * hands the table BACK with every row the learner has already filled still filled and the
 * explained row open again, which is `othersRemain` on the reveal. On the LAST blank it is
 * false: that row is the gate, so a table handed back there would be a table handed over.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, SIGNAL_DEEP, SOFT } from "../../svgKit";
import { WidgetReveal } from "../../widgetFeedback";
import {
  useRevealAnchor,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
} from "../../widgetMechanics";
import { WidgetTask } from "../../widgetTask";
import { usePickup } from "../pickup";

export interface TableRow {
  id: string;
  /** The row's fixed cells, left to right, as LaTeX. */
  fixed: readonly string[];
  /** The last cell's value, as LaTeX. */
  value: string;
  /** False on the opening rows, which are given as the pattern to read off. */
  blank: boolean;
  /** How a screen reader should say the row. */
  spoken: string;
  /** Why the blank takes that value. */
  why?: ReactNode;
}

export interface FillTableProps {
  /** Column headings, including the one the blanks live under. */
  headings: readonly string[];
  rows: readonly TableRow[];
  /** The values on offer, as LaTeX. Contains every answer plus at least one distractor. */
  options: readonly { id: string; latex: string; spoken: string }[];
  /**
   * WHAT the completed table will show, separate from how to fill it. Required, because
   * "take the value that belongs in the highlighted row and put it in the blank" describes
   * the control and leaves the pattern the table exists to expose entirely unnamed.
   */
  objective: ReactNode;
  /** HOW to operate the table. One short line. */
  prompt: string;
  conclusion: ReactNode;
  ariaLabel: string;
  onSolved: () => void;
  onRestart: () => void;
  restartLabel: string;
}

/**
 * How to SAY a cell value. The values are LaTeX, which cannot be read back out as words, so
 * the spoken form is borrowed from the tray option that carries the same value: every answer
 * is on offer there by construction, and the fallback is only reachable if that stops holding.
 */
function spokenValue(
  options: readonly { latex: string; spoken: string }[],
  latex: string,
): string {
  return options.find((option) => option.latex === latex)?.spoken ?? "the missing one";
}

/**
 * A row's fixed cells, each with a key of its own.
 *
 * Keyed by POSITION rather than by content, because a row may legitimately repeat a value
 * across its fixed cells (an $x$ by $x$ corner, a column holding what the dividend already
 * holds) and a content key silently collapses the two into one cell. The tuple is authored
 * once and never reordered or spliced, which is the condition a positional key needs; it is
 * computed here rather than inside the JSX so the key is a value the row carries rather than
 * an index read at render.
 */
function keyedCells(row: TableRow): readonly { key: string; latex: string }[] {
  return row.fixed.map((latex, column) => ({ key: `${row.id}-${column}`, latex }));
}

export function FillTable({
  headings,
  rows,
  options,
  objective,
  prompt,
  conclusion,
  ariaLabel,
  onSolved,
  onRestart,
  restartLabel,
}: FillTableProps) {
  const blanks = rows.filter((r) => r.blank);
  const [filled, setFilled] = useState(0);
  const [missed, setMissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  /** True while a value is dragged over the open slot; `:hover` does not fire mid-drag. */
  const [over, setOver] = useState(false);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const anchor = useRevealAnchor();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = filled >= blanks.length;
  const openRow = blanks[filled] ?? null;

  function advance(earned: boolean) {
    const next = filled + 1;
    setFilled(next);
    setMissed(false);
    setFeedback(null);
    setOver(false);
    pickup.clear();
    if (earned) {
      success();
    }
    if (next >= blanks.length) {
      onSolved();
    }
  }

  function place(optionLatex: string) {
    if (solved || openRow === null) {
      return;
    }
    if (optionLatex === openRow.value) {
      setRevealed(false);
      advance(true);
      return;
    }
    // A fresh attempt: the reveal steps aside so it can be offered for the row in hand.
    setRevealed(false);
    setMissed(true);
    setFeedback(
      "Not that one. Take the line above and do to it exactly what every line before it did.",
    );
  }

  const revealedRow = revealed ? (blanks[filled - 1] ?? null) : null;
  const openIndex = openRow === null ? -1 : rows.indexOf(openRow);

  /**
   * Which row the passage on screen is about, over both reveal windows. The first reveal
   * leaves the row open, so it is `openRow`; the second one fills it in and steps past, which
   * is when `revealedRow` becomes the row just explained.
   */
  const explainedRow = revealedRow ?? openRow;

  return (
    <div className="lesson-interactive lesson-interactive--table">
      {/* The goal, above the table and outside the status line, which is spent on feedback. */}
      <WidgetTask>{objective}</WidgetTask>

      <table className="lesson-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {headings.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const blankIndex = blanks.indexOf(row);
            const done = !row.blank || blankIndex < filled;
            const open = rowIndex === openIndex;
            return (
              <tr
                key={row.id}
                {...anchor(row === explainedRow)}
                data-state={open ? "open" : done ? "done" : "waiting"}
              >
                {keyedCells(row).map(({ key, latex }) => (
                  <td key={key}>
                    <InlineMath latex={latex} color={done ? LABEL : SOFT} />
                  </td>
                ))}
                <td>
                  {!row.blank ? (
                    <InlineMath latex={row.value} color={LABEL} />
                  ) : done ? (
                    <InlineMath latex={row.value} color={CIVIC} />
                  ) : open ? (
                    // Empty and dashed, with no words in it. "drag a value here" was one
                    // instruction restating `prompt` (R8), and it named only half of what
                    // `usePickup` accepts. The slot's `aria-label` keeps the part a screen
                    // reader needs: which row is waiting on a value.
                    //
                    // While a reveal is up the slot is not empty: it holds the value the
                    // passage just named, amber and dashed rather than in the success
                    // colour, because it was given rather than worked out.
                    <button
                      type="button"
                      className="lesson-table__slot"
                      data-over={over ? "yes" : "no"}
                      data-state={missed ? "wrong" : "open"}
                      aria-label={
                        fill.given
                          ? `Row ${row.spoken}: the value ${spokenValue(options, row.value)} was given, not answered`
                          : `Value for the row ${row.spoken}`
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnter={() => setOver(true)}
                      onDragLeave={() => setOver(false)}
                      onDrop={() => {
                        setOver(false);
                        const carried = pickup.take();
                        if (carried !== null) {
                          place(carried);
                        }
                      }}
                      onClick={() => {
                        const carried = pickup.take();
                        if (carried !== null) {
                          place(carried);
                        }
                      }}
                      {...fill.mark(true)}
                    >
                      {fill.given ? <InlineMath latex={row.value} /> : null}
                    </button>
                  ) : (
                    <span style={{ color: SOFT }}>&#183;&#183;&#183;</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="lesson-sorter__tray">
        {solved ? (
          <span className="lesson-sorter__tray-empty">Table complete</span>
        ) : (
          options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={option.spoken}
              aria-pressed={pickup.held === option.latex}
              // A CARRIED CHIP IS NOT A CORRECT ONE. `CIVIC` is the colour the filled row
              // takes once its value has been judged right; painting it on a chip the moment
              // it is picked up says the same thing about a value nobody has placed yet.
              // `SIGNAL_DEEP` is the hue `svgKit` reserves for a state the board has to mark
              // for a reason of its own.
              style={{
                color: LABEL,
                borderColor: pickup.held === option.latex ? SIGNAL_DEEP : SOFT,
              }}
              onDragStart={() => pickup.hold(option.latex)}
              onDragEnd={() => pickup.clear()}
              onClick={() => pickup.toggle(option.latex)}
            >
              <InlineMath latex={option.latex} />
            </button>
          ))
        )}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          {restartLabel}
        </button>
      )}

      <WidgetReveal
        available={missed && !solved}
        revealed={revealedRow !== null}
        // The row still OPEN, not the one already revealed: the reveal is read at the
        // moment of the click, when the answer being asked for is this row's.
        answer={openRow ? <InlineMath latex={openRow.value} /> : null}
        why={openRow?.why ?? null}
        onReveal={() => {
          setRevealed(true);
          advance(false);
        }}
        label="Reveal this row"
        // Rows are filled from the top down, so what is left after the open one is every
        // blank past it.
        othersRemain={filled + 1 < blanks.length}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealedRow !== null && !solved
          ? null
          : solved
            ? conclusion
            : (feedback ?? prompt)}
      </p>
    </div>
  );
}
