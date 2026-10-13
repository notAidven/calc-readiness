/**
 * POL.1 slide 1: sort the terms of two combined orders into the kinds that can be added.
 *
 * The teaching is that only like terms combine, and the way a learner gets that wrong is by
 * looking at the coefficient instead of the variable part. So the board deals six terms whose
 * coefficients repeat across bins and whose variable parts do not, and it mixes the two orders
 * together, which is exactly the state a totalled contract arrives in.
 *
 * Sorting alone would stop one step short of the idea, so each bin is then totalled and judged
 * on its own (R28): a learner who groups correctly and then adds two coefficients wrong has
 * done the thing the slide teaches, and one verdict over the whole board would tell them
 * otherwise.
 *
 * Every bin label answers the same question the prompt asks -- which variable part is this
 * term counted in -- so the three read as one set (R22).
 *
 * The registered id is `stone-pieces-sorter` rather than `stone-order-sorter`, and the reason
 * is mechanical: the validator reads an interaction kind off the id's trailing suffix word and
 * allows a short variant after it, so `-order-sorter` classifies as the SEQUENCING kind with
 * `sorter` read as the variant. A board that sorts into bins would have been counted as a
 * chain of steps, in the one measurement R11 is taken from.
 */

import { type CSSProperties, type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";
import { usePickup } from "./pickup";

interface Chip {
  id: string;
  latex: string;
  name: string;
  /** Which bin the term is counted in. */
  bin: string;
  why: ReactNode;
}

interface Bin {
  key: string;
  latex: string;
  name: string;
  colour: string;
  /** The sum of the two terms in this bin. */
  total: number;
  /** How the total is written once the bin is settled. */
  totalLatex: string;
  parts: readonly [number, number];
}

interface Board {
  bins: readonly [Bin, Bin, Bin];
  chips: readonly Chip[];
  /** The order the terms are dealt in, so no two bin-mates arrive together. */
  dealt: readonly number[];
  /** The whole total, once every bin is settled. */
  result: string;
}

function board(
  square: readonly [number, number],
  strip: readonly [number, number],
  plain: readonly [number, number],
  dealt: readonly number[],
): Board {
  const sum = (pair: readonly [number, number]) => pair[0] + pair[1];
  const bins: readonly [Bin, Bin, Bin] = [
    {
      key: "sq",
      latex: "x^{2}",
      name: "x squared terms",
      colour: SIGNAL,
      total: sum(square),
      totalLatex: `${sum(square)}x^{2}`,
      parts: square,
    },
    {
      key: "lin",
      latex: "x",
      name: "x terms",
      colour: BRICK,
      total: sum(strip),
      totalLatex: `${sum(strip)}x`,
      parts: strip,
    },
    {
      key: "unit",
      latex: "1",
      name: "plain unit terms",
      colour: CIVIC,
      total: sum(plain),
      totalLatex: `${sum(plain)}`,
      parts: plain,
    },
  ];
  return {
    bins,
    chips: [
      chip("s1", `${square[0]}x^{2}`, `${square[0]} x squared`, "sq"),
      chip("s2", `${square[1]}x^{2}`, `${square[1]} x squared`, "sq"),
      chip("l1", `${strip[0]}x`, `${strip[0]} x`, "lin"),
      chip("l2", `${strip[1]}x`, `${strip[1]} x`, "lin"),
      chip("u1", `${plain[0]}`, `plain ${plain[0]}`, "unit"),
      chip("u2", `${plain[1]}`, `plain ${plain[1]}`, "unit"),
    ],
    dealt,
    result: `${sum(square)}x^{2} + ${sum(strip)}x + ${sum(plain)}`,
  };
}

function chip(id: string, latex: string, name: string, bin: string): Chip {
  return {
    id,
    latex,
    name,
    bin,
    why: (
      <>
        A term's bin is decided by its variable part and never by its coefficient, and{" "}
        <InlineMath latex={latex} /> is counted in{" "}
        <InlineMath latex={bin === "sq" ? "x^{2}" : bin === "lin" ? "x" : "1"} />. Two terms
        add only when that part is identical, so a coefficient matching some other term on
        the board means nothing at all.
      </>
    ),
  };
}

/**
 * Coefficients repeat ACROSS bins on both boards, so a learner reading the numbers rather
 * than the variable parts is wrong rather than lucky.
 */
const BOARDS: readonly Board[] = [
  board([3, 4], [4, 3], [8, 9], [4, 0, 3, 5, 2, 1]),
  board([2, 6], [6, 2], [5, 7], [5, 2, 4, 1, 3, 0]),
];

/** The outline that says a term was PARKED in a bin rather than placed there by the learner. */
const GIVEN_PLACEMENT: CSSProperties = {
  borderWidth: "1.5px",
  borderRadius: "8px",
  padding: "0 4px",
};

type Verdict = "right" | "wrong";

export function StoneOrderSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const current = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <StoneOrderSorterBody
      key={variant.nonce}
      board={current}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function StoneOrderSorterBody({
  board: current,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { bins, chips, dealt } = current;
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [missChipId, setMissChipId] = useState<string | null>(null);
  const [sortRevealed, setSortRevealed] = useState(false);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [settled, setSettled] = useState<Record<string, boolean>>({});
  const [revealedBin, setRevealedBin] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const sorted = Object.keys(placed).length === chips.length;
  const allSettled = bins.every((bin) => settled[bin.key] === true);
  const missChip = chips.find((c) => c.id === missChipId) ?? null;
  const openBin = bins.find((bin) => settled[bin.key] !== true) ?? null;
  const revealBin = bins.find((bin) => bin.key === revealedBin) ?? openBin;

  /** The chip a sorting passage has parked, and the bin a totalling passage has filled. */
  const givenChip = fill.given && !sorted ? missChip : null;
  const givenBin = fill.given && sorted ? revealBin : null;

  function maybeOpen(next: Record<string, boolean>) {
    if (bins.every((bin) => next[bin.key] === true) && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function place(binKey: string) {
    const id = pickup.take();
    const chip = chips.find((c) => c.id === id);
    if (!chip || placed[chip.id]) {
      return;
    }
    if (chip.bin === binKey) {
      setPlaced({ ...placed, [chip.id]: binKey });
      setMissChipId(null);
      setSortRevealed(false);
      success();
      return;
    }
    setMissChipId(chip.id);
    setSortRevealed(false);
  }

  function revealPlacement() {
    if (!missChip) {
      return;
    }
    setPlaced({ ...placed, [missChip.id]: missChip.bin });
    setSortRevealed(true);
  }

  function checkBin(bin: Bin) {
    if (settled[bin.key]) {
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss: the note under the row
    // says so rather than talking about which parts add, which would answer a question the
    // learner did not ask.
    const read = readNumericEntry(entries[bin.key] ?? "", "integer");
    if (read.ok && read.value === bin.total) {
      setVerdicts({ ...verdicts, [bin.key]: "right" });
      const next = { ...settled, [bin.key]: true };
      setSettled(next);
      success();
      maybeOpen(next);
      return;
    }
    setVerdicts({ ...verdicts, [bin.key]: "wrong" });
  }

  function revealBinTotal(bin: Bin) {
    setEntries({ ...entries, [bin.key]: String(bin.total) });
    setVerdicts({ ...verdicts, [bin.key]: "wrong" });
    const next = { ...settled, [bin.key]: true };
    setSettled(next);
    setRevealedBin(bin.key);
    maybeOpen(next);
  }

  const unplaced = dealt
    .map((i) => chips[i])
    .filter((c): c is Chip => Boolean(c))
    .filter((c) => !placed[c.id]);
  const tray = unplaced.filter((c) => c.id !== givenChip?.id);

  return (
    <div className="lesson-interactive lesson-interactive--sorter">
      <WidgetTask>
        Goal: separate the two orders into the kinds of piece that can actually be added,
        then say how many of each kind the contract comes to.
      </WidgetTask>

      <div className="lesson-sorter__tray">
        {sorted ? (
          <span className="lesson-sorter__tray-empty">All sorted</span>
        ) : (
          tray.map((c) => (
            <button
              key={c.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={c.name}
              aria-pressed={pickup.held === c.id}
              // A carried stone has been offered to nothing, so it takes the third hue rather
              // than the colour this board gives a piece it has judged right.
              style={{
                color: LABEL,
                borderColor: pickup.held === c.id ? SIGNAL_DEEP : SOFT,
              }}
              onDragStart={() => pickup.hold(c.id)}
              onDragEnd={() => pickup.clear()}
              onClick={() => pickup.toggle(c.id)}
            >
              <InlineMath latex={c.latex} />
            </button>
          ))
        )}
      </div>

      <div className="lesson-sorter__bins">
        {bins.map((bin) => {
          const inBin = chips.filter((c) => placed[c.id] === bin.key);
          const parked = givenChip !== null && givenChip.bin === bin.key ? givenChip : null;
          return (
            <button
              key={bin.key}
              type="button"
              className="lesson-sorter__bin"
              aria-label={
                parked === null
                  ? bin.name
                  : `${bin.name}: ${parked.name} was given, not answered`
              }
              style={{ borderColor: bin.colour }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => place(bin.key)}
              onClick={() => place(bin.key)}
            >
              <span className="lesson-sorter__bin-label" style={{ color: bin.colour }}>
                <InlineMath latex={bin.latex} />
              </span>
              <span className="lesson-sorter__bin-items">
                {inBin.map((c) => (
                  <span key={c.id} className="lesson-sorter__placed">
                    <InlineMath latex={c.latex} color={bin.colour} />
                  </span>
                ))}
                {parked !== null && (
                  <span
                    className="lesson-sorter__placed"
                    style={GIVEN_PLACEMENT}
                    {...fill.mark(true)}
                  >
                    <InlineMath latex={parked.latex} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {sorted && (
        <div className="lesson-equation">
          {bins.map((bin) => {
            const done = settled[bin.key] === true;
            const verdict = verdicts[bin.key] ?? null;
            return (
              <div key={bin.key} data-part-row={bin.name}>
                <div className="lesson-equation__row" data-state={done ? "done" : "open"}>
                  <span className="lesson-equation__stage lesson-equation__stage--math">
                    <InlineMath latex={bin.latex} color={bin.colour} />
                  </span>
                  <span className="lesson-equation__body">
                    <InlineMath
                      latex={`${bin.parts[0]} + ${bin.parts[1]} =`}
                      color={done ? CIVIC : LABEL}
                    />
                    <input
                      className="lesson-equation__slot"
                      {...numericEntryProps("integer")}
                      value={entries[bin.key] ?? ""}
                      readOnly={done}
                      aria-label={partName(`How many ${bin.name}`, verdict)}
                      onChange={(e) =>
                        setEntries({ ...entries, [bin.key]: e.target.value })
                      }
                      {...(givenBin?.key === bin.key ? fill.entry(bin.total) : {})}
                    />
                  </span>
                  <span className="lesson-equation__aside">
                    {verdict ? <WidgetPartVerdict verdict={verdict} /> : null}
                    {done ? null : (
                      <button
                        type="button"
                        className="lesson-interactive__check lesson-interactive__check--part"
                        onClick={() => checkBin(bin)}
                      >
                        Check
                      </button>
                    )}
                  </span>
                </div>
                {verdict === "wrong" && !fill.given ? (
                  <WidgetPartNote>
                    {readNumericEntry(entries[bin.key] ?? "", "integer").ok ? (
                      <>
                        Only the coefficients add here, and the variable part is carried
                        through untouched, so this row is asking for{" "}
                        <InlineMath latex={`${bin.parts[0]} + ${bin.parts[1]}`} /> and
                        nothing else.
                      </>
                    ) : (
                      WHOLE_NUMBER_MISS
                    )}
                  </WidgetPartNote>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {allSettled ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with two different orders
        </button>
      ) : null}

      {!sorted && missChip !== null && (
        <WidgetReveal
          available
          revealed={sortRevealed}
          answer={
            <InlineMath
              latex={missChip.bin === "sq" ? "x^{2}" : missChip.bin === "lin" ? "x" : "1"}
            />
          }
          why={missChip.why}
          onReveal={revealPlacement}
          label="Reveal where that term is counted"
          othersRemain={unplaced.length > 1}
        />
      )}

      {sorted && revealBin !== null && !allSettled && (
        <WidgetReveal
          available={
            verdicts[revealBin.key] !== undefined && settled[revealBin.key] !== true
          }
          revealed={revealedBin === revealBin.key}
          answer={<InlineMath latex={revealBin.totalLatex} />}
          why={
            <>
              Both terms in this bin carry <InlineMath latex={revealBin.latex} />, so they
              are like terms and their coefficients add:{" "}
              <InlineMath
                latex={`${revealBin.parts[0]} + ${revealBin.parts[1]} = ${revealBin.total}`}
              />
              . The variable part is not touched by the addition, which is why the answer is{" "}
              <InlineMath latex={revealBin.totalLatex} /> rather than a bigger power.
            </>
          }
          onReveal={() => revealBinTotal(revealBin)}
          label={`Reveal the ${revealBin.name} total`}
          othersRemain={bins.some(
            (b) => b.key !== revealBin.key && settled[b.key] !== true,
          )}
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={allSettled ? "solved" : missChip !== null ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : allSettled ? (
          <>
            The two orders total <InlineMath latex={current.result} color={CIVIC} />, and it
            stays three separate amounts because nothing turns one kind of piece into
            another. Any row you missed has a note under it.
          </>
        ) : missChip !== null ? (
          <span style={{ color: BRICK }}>
            That term is not counted in that variable part. Read the part after the
            coefficient rather than the coefficient itself.
          </span>
        ) : (
          <span style={{ color: SOFT }}>
            Drag a term into a bin, or tap the term and then the bin. Each bin is then
            totalled on its own.
          </span>
        )}
      </p>
    </div>
  );
}
