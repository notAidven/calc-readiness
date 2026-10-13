/**
 * RAD.2 interactive (slide 0): sort radical terms by their radicand, then combine each bin.
 * Two things make this a real decision rather than string matching. Half the chips arrive
 * UNSIMPLIFIED (sqrt(8) belongs with 3*sqrt(2), sqrt(27) with 4*sqrt(3)), so the learner has
 * to simplify before they can sort; and a third bin holds the terms that combine with
 * NOTHING, so "these do not add" is a live option instead of an aside in the prose. That
 * bin's finishing move is the node's central misconception: sqrt(7) + sqrt(5) is not
 * sqrt(12). Each bin reports its own verdict and latches once it is right, so a learner who
 * gets two of three is told which one missed and keeps the two they earned. Every correct
 * placement and every correct bin fires the success signal on its own. A learner who has
 * misplaced a chip, or who has checked the bins and missed one, may reveal that one step
 * with the reasoning behind it; a revealed step counts for the gate but earns no success.
 * Gates once the board is sorted and all three bins are answered.
 *
 * "Start over" deals the OTHER board, not a reshuffle of the same six terms, and closes the
 * gate behind it. A reset that returns the numbers the learner has just answered asks them
 * to retype an answer they already know.
 *
 * All three bin labels answer the one question the prompt asks, which is "what is this
 * term's radicand". The third reads "neither" for that reason: it used to read "combines
 * with nothing", which named a BEHAVIOUR where its two siblings named a radicand, and which
 * is not even true as stated. sqrt(7) combines perfectly well with other sqrt(7) terms; what
 * is true is that nothing in THIS set of six shares its radicand, and a label that leaves
 * that out teaches that some radicals are uncombinable by nature.
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
import { usePickup } from "./pickup";

interface Chip {
  id: string;
  latex: string;
  name: string;
  /** Which bin it belongs in: the two combining bins by radicand, or "none". */
  bin: string;
  /** Why it sits there, read out when the learner reveals a placement. */
  why: ReactNode;
}

interface Bin {
  key: string;
  latex: string | null;
  name: string;
  color: string;
  /** The sum this bin comes to, or null for the bin that combines with nothing. */
  sum: { prompt: string; accepted: readonly string[] } | null;
  answer: ReactNode;
  why: ReactNode;
  revealLabel: string;
}

interface Board {
  bins: readonly Bin[];
  chips: readonly Chip[];
  /** The order the chips are dealt in, so like radicals are never presented grouped. */
  dealt: readonly number[];
  /** The whole finished answer, once every bin is settled. */
  result: string;
  /** The two radicands that do not combine, for the third bin's controls. */
  loneLatex: string;
  loneTrap: string;
}

/** Board 1 turns on root 2 against root 3; board 2 on root 5 against root 6. */
const POOLS: readonly Board[] = [
  {
    bins: [
      {
        key: "r2",
        latex: "\\sqrt{2} \\text{ terms}",
        name: "root 2 terms",
        color: SIGNAL,
        sum: { prompt: "\\sqrt{8} + 3\\sqrt{2}", accepted: ["5\u221a2"] },
        answer: <InlineMath latex="5\sqrt{2}" />,
        why: (
          <>
            This bin holds <InlineMath latex="\sqrt{8} + 3\sqrt{2}" />, and{" "}
            <InlineMath latex="\sqrt{8} = 2\sqrt{2}" /> because{" "}
            <InlineMath latex="8 = 4 \cdot 2" /> and 4 is a perfect square. Both terms then
            carry the radicand 2, so they are like radicals: the radical stays exactly as it
            is and only the coefficients add, <InlineMath latex="2 + 3 = 5" />.
          </>
        ),
        revealLabel: "Reveal the root 2 terms bin",
      },
      {
        key: "r3",
        latex: "\\sqrt{3} \\text{ terms}",
        name: "root 3 terms",
        color: BRICK,
        sum: { prompt: "\\sqrt{27} + 4\\sqrt{3}", accepted: ["7\u221a3"] },
        answer: <InlineMath latex="7\sqrt{3}" />,
        why: (
          <>
            This bin holds <InlineMath latex="\sqrt{27} + 4\sqrt{3}" />, and{" "}
            <InlineMath latex="\sqrt{27} = 3\sqrt{3}" /> because{" "}
            <InlineMath latex="27 = 9 \cdot 3" /> and 9 is a perfect square. The two terms
            now share the radicand 3, so the coefficients add,{" "}
            <InlineMath latex="3 + 4 = 7" />.
          </>
        ),
        revealLabel: "Reveal the root 3 terms bin",
      },
      {
        key: "none",
        latex: null,
        name: "neither",
        color: CIVIC,
        sum: null,
        answer: (
          <>
            <InlineMath latex="\sqrt{7} + \sqrt{5}" />, which does not combine
          </>
        ),
        why: (
          <>
            Like radicals have to share a radicand, and 7 and 5 are different, so there is
            no coefficient to add and no single term to reach. Adding the radicands would
            give <InlineMath latex="\sqrt{12}" />, but{" "}
            <InlineMath latex="\sqrt{12} \approx 3.46" /> while{" "}
            <InlineMath latex="\sqrt{7} + \sqrt{5} \approx 4.88" />, so those two are not
            the same number.
          </>
        ),
        revealLabel: "Reveal the third bin",
      },
    ],
    chips: [
      {
        id: "r8",
        latex: "\\sqrt{8}",
        name: "root 8",
        bin: "r2",
        why: (
          <>
            This term does not arrive simplified. Since <InlineMath latex="8 = 4 \cdot 2" />{" "}
            and 4 is a perfect square, <InlineMath latex="\sqrt{8} = 2\sqrt{2}" />. The
            radicand it is left with is 2, and the radicand is what decides the bin.
          </>
        ),
      },
      {
        id: "3r2",
        latex: "3\\sqrt{2}",
        name: "3 root 2",
        bin: "r2",
        why: (
          <>
            This term is already simplified, and its radicand is 2. The coefficient 3 sits
            outside the radical, so it has no say in which bin the term belongs to.
          </>
        ),
      },
      {
        id: "r27",
        latex: "\\sqrt{27}",
        name: "root 27",
        bin: "r3",
        why: (
          <>
            Since <InlineMath latex="27 = 9 \cdot 3" /> and 9 is a perfect square,{" "}
            <InlineMath latex="\sqrt{27} = 3\sqrt{3}" />. That leaves a radicand of 3, which
            is what puts it with the other root 3 terms.
          </>
        ),
      },
      {
        id: "4r3",
        latex: "4\\sqrt{3}",
        name: "4 root 3",
        bin: "r3",
        why: (
          <>
            This term is already simplified, and its radicand is 3. The coefficient 4 out
            front does not change which bin it belongs to.
          </>
        ),
      },
      {
        id: "r7",
        latex: "\\sqrt{7}",
        name: "root 7",
        bin: "none",
        why: (
          <>
            7 has no perfect square factor other than 1, so <InlineMath latex="\sqrt{7}" />{" "}
            cannot be simplified any further. No other term on the board carries a radicand
            of 7, so it has no like radical to join.
          </>
        ),
      },
      {
        id: "r5",
        latex: "\\sqrt{5}",
        name: "root 5",
        bin: "none",
        why: (
          <>
            5 has no perfect square factor other than 1, so <InlineMath latex="\sqrt{5}" />{" "}
            is already in simplest form. Nothing else on the board carries a radicand of 5,
            so it has no like radical to join.
          </>
        ),
      },
    ],
    dealt: [4, 0, 3, 5, 1, 2],
    result: "5\\sqrt{2} + 7\\sqrt{3} + \\sqrt{7} + \\sqrt{5}",
    loneLatex: "\\sqrt{7} + \\sqrt{5} =",
    loneTrap: "\\sqrt{12}",
  },
  {
    bins: [
      {
        key: "r5",
        latex: "\\sqrt{5} \\text{ terms}",
        name: "root 5 terms",
        color: SIGNAL,
        sum: { prompt: "\\sqrt{20} + 3\\sqrt{5}", accepted: ["5\u221a5"] },
        answer: <InlineMath latex="5\sqrt{5}" />,
        why: (
          <>
            This bin holds <InlineMath latex="\sqrt{20} + 3\sqrt{5}" />, and{" "}
            <InlineMath latex="\sqrt{20} = 2\sqrt{5}" /> because{" "}
            <InlineMath latex="20 = 4 \cdot 5" /> and 4 is a perfect square. Both terms then
            carry the radicand 5, so only the coefficients add,{" "}
            <InlineMath latex="2 + 3 = 5" />.
          </>
        ),
        revealLabel: "Reveal the root 5 terms bin",
      },
      {
        key: "r6",
        latex: "\\sqrt{6} \\text{ terms}",
        name: "root 6 terms",
        color: BRICK,
        sum: { prompt: "\\sqrt{24} + 5\\sqrt{6}", accepted: ["7\u221a6"] },
        answer: <InlineMath latex="7\sqrt{6}" />,
        why: (
          <>
            This bin holds <InlineMath latex="\sqrt{24} + 5\sqrt{6}" />, and{" "}
            <InlineMath latex="\sqrt{24} = 2\sqrt{6}" /> because{" "}
            <InlineMath latex="24 = 4 \cdot 6" /> and 4 is a perfect square. The two terms
            now share the radicand 6, so the coefficients add,{" "}
            <InlineMath latex="2 + 5 = 7" />.
          </>
        ),
        revealLabel: "Reveal the root 6 terms bin",
      },
      {
        key: "none",
        latex: null,
        name: "neither",
        color: CIVIC,
        sum: null,
        answer: (
          <>
            <InlineMath latex="\sqrt{11} + \sqrt{13}" />, which does not combine
          </>
        ),
        why: (
          <>
            Like radicals have to share a radicand, and 11 and 13 are different, so there is
            no coefficient to add and no single term to reach. Adding the radicands would
            give <InlineMath latex="\sqrt{24}" />, but{" "}
            <InlineMath latex="\sqrt{24} \approx 4.90" /> while{" "}
            <InlineMath latex="\sqrt{11} + \sqrt{13} \approx 6.92" />, so those two are not
            the same number.
          </>
        ),
        revealLabel: "Reveal the third bin",
      },
    ],
    chips: [
      {
        id: "r20",
        latex: "\\sqrt{20}",
        name: "root 20",
        bin: "r5",
        why: (
          <>
            This term does not arrive simplified. Since{" "}
            <InlineMath latex="20 = 4 \cdot 5" /> and 4 is a perfect square,{" "}
            <InlineMath latex="\sqrt{20} = 2\sqrt{5}" />. The radicand it is left with is 5,
            and the radicand is what decides the bin.
          </>
        ),
      },
      {
        id: "3r5",
        latex: "3\\sqrt{5}",
        name: "3 root 5",
        bin: "r5",
        why: (
          <>
            This term is already simplified, and its radicand is 5. The coefficient 3 sits
            outside the radical, so it has no say in which bin the term belongs to.
          </>
        ),
      },
      {
        id: "r24",
        latex: "\\sqrt{24}",
        name: "root 24",
        bin: "r6",
        why: (
          <>
            Since <InlineMath latex="24 = 4 \cdot 6" /> and 4 is a perfect square,{" "}
            <InlineMath latex="\sqrt{24} = 2\sqrt{6}" />. That leaves a radicand of 6, which
            is what puts it with the other root 6 terms.
          </>
        ),
      },
      {
        id: "5r6",
        latex: "5\\sqrt{6}",
        name: "5 root 6",
        bin: "r6",
        why: (
          <>
            This term is already simplified, and its radicand is 6. The coefficient 5 out
            front does not change which bin it belongs to.
          </>
        ),
      },
      {
        id: "r11",
        latex: "\\sqrt{11}",
        name: "root 11",
        bin: "none",
        why: (
          <>
            11 has no perfect square factor other than 1, so{" "}
            <InlineMath latex="\sqrt{11}" /> cannot be simplified any further. No other term
            on the board carries a radicand of 11, so it has no like radical to join.
          </>
        ),
      },
      {
        id: "r13",
        latex: "\\sqrt{13}",
        name: "root 13",
        bin: "none",
        why: (
          <>
            13 has no perfect square factor other than 1, so{" "}
            <InlineMath latex="\sqrt{13}" /> is already in simplest form. Nothing else on
            the board carries a radicand of 13, so it has no like radical to join.
          </>
        ),
      },
    ],
    dealt: [5, 1, 2, 4, 0, 3],
    result: "5\\sqrt{5} + 7\\sqrt{6} + \\sqrt{11} + \\sqrt{13}",
    loneLatex: "\\sqrt{11} + \\sqrt{13} =",
    loneTrap: "\\sqrt{24}",
  },
];

/**
 * The outline that says a chip was PARKED in a bin rather than placed there by the learner.
 *
 * A placed chip carries no border at all, so an outline is what tells the two apart without
 * spending a hue: `data-reveal-given` supplies the amber and the dashing, and a border needs
 * a width before either of them can be seen. The bins themselves are dashed at rest, so the
 * mark cannot go there.
 */
const GIVEN_PLACEMENT: CSSProperties = {
  borderWidth: "1.5px",
  borderRadius: "8px",
  padding: "0 4px",
};

/** Normalize a typed radical so 5√2 / 5sqrt(2) / 5*sqrt2 all compare equal. */
function normalizeTerm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/sqrt/g, "\u221a")
    .replace(/[\s*\u00b7()]/g, "");
}

export function LikeRadicalsSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const board = POOLS[variant.index] ?? (POOLS[0] as Board);
  return (
    <LikeRadicalsSorterBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LikeRadicalsSorterBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { bins, chips, dealt } = board;
  const summing = bins.filter((bin) => bin.sum !== null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sortMiss, setSortMiss] = useState<string | null>(null);
  const [sortRevealed, setSortRevealed] = useState(false);
  const [combos, setCombos] = useState<Record<string, string>>({});
  const [noneCall, setNoneCall] = useState<"combines" | "does-not" | null>(null);
  const [misses, setMisses] = useState<string[]>([]);
  const [binDone, setBinDone] = useState<Record<string, boolean>>({});
  const [revealedBin, setRevealedBin] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const sorted = Object.keys(placed).length === chips.length;
  const combined = bins.every((bin) => binDone[bin.key] === true);
  const missChip = chips.find((c) => c.id === sortMiss) ?? null;

  /** The bin the reveal is speaking about: the one just revealed, else the one still missed. */
  const revealBinKey = revealedBin ?? (combined ? null : (misses[0] ?? null));
  const revealBin = bins.find((bin) => bin.key === revealBinKey) ?? null;

  /**
   * The chip the sorting passage is placing, parked in its bin for as long as it is up.
   *
   * The blank on a sort board is the PLACEMENT, so a reveal that named the bin in words and
   * left the chip on the tray asked the learner to carry the pairing across to a board
   * showing nothing of it. What is parked is the chip that was just misdropped, which is the
   * one the passage is about.
   */
  const givenChip = fill.given && !sorted ? missChip : null;

  /**
   * And the bin the COMBINING passage is answering, once the board is sorted.
   *
   * The two stages cannot both be filled: the sorting reveal is the only one on offer while
   * chips are still unplaced (`misses` is empty until a check, so `revealBin` is null), and
   * once they are all placed the sorting reveal has stood down. `sorted` is that split.
   */
  const givenBin = fill.given && sorted ? revealBin : null;

  function binNamed(key: string): string {
    return bins.find((bin) => bin.key === key)?.name ?? key;
  }

  function binColor(key: string): string {
    return bins.find((bin) => bin.key === key)?.color ?? LABEL;
  }

  function place(binKey: string) {
    const id = pickup.take();
    if (!id || placed[id]) {
      return;
    }
    const chip = chips.find((c) => c.id === id);
    if (!chip) {
      return;
    }
    if (chip.bin === binKey) {
      setPlaced({ ...placed, [id]: binKey });
      setFeedback(null);
      setSortMiss(null);
      setSortRevealed(false);
      success();
      return;
    }
    setSortMiss(chip.id);
    setSortRevealed(false);
    setFeedback(
      "Not quite. Simplify that term first, then read off the radicand it is left with, because the radicand is what decides its bin.",
    );
  }

  /** Drop the chip the learner could not place into its bin. Teaches, so it earns nothing. */
  function revealPlacement() {
    if (!missChip) {
      return;
    }
    setPlaced({ ...placed, [missChip.id]: missChip.bin });
    setFeedback(null);
    setSortRevealed(true);
  }

  function checkCombine() {
    if (combined) {
      return;
    }
    // The board is behind them now, so a placement passage stops sharing the space.
    setSortMiss(null);
    setSortRevealed(false);
    const next = { ...binDone };
    const wrong: string[] = [];
    let earned = 0;
    for (const bin of bins) {
      if (next[bin.key]) {
        continue;
      }
      const right =
        bin.sum === null
          ? noneCall === "does-not"
          : bin.sum.accepted.includes(normalizeTerm(combos[bin.key] ?? ""));
      if (right) {
        next[bin.key] = true;
        earned += 1;
      } else {
        wrong.push(bin.key);
      }
    }
    setBinDone(next);
    setMisses(wrong);
    for (let i = 0; i < earned; i += 1) {
      success();
    }
    if (wrong.length > 0) {
      // A fresh attempt: the reveal steps aside so it can be offered for the new miss.
      setRevealedBin(null);
      return;
    }
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  /** Fill one bin in for a learner who is stuck. Counts for the gate, earns no success. */
  function revealBinAnswer(bin: Bin) {
    if (bin.sum === null) {
      setNoneCall("does-not");
    } else {
      const filled = bin.sum.accepted[0] ?? "";
      setCombos((prev) => ({ ...prev, [bin.key]: filled }));
    }
    const next = { ...binDone, [bin.key]: true };
    setBinDone(next);
    setRevealedBin(bin.key);
    setMisses((prev) => prev.filter((k) => k !== bin.key));
    if (bins.every((b) => next[b.key]) && !done) {
      setDone(true);
      onSolved();
    }
  }

  const unplaced = dealt
    .map((i) => chips[i])
    .filter((c): c is Chip => Boolean(c))
    .filter((c) => !placed[c.id]);
  // A GIVEN chip comes off the tray exactly as a placed one does. Leaving it there would put
  // the board in a state it cannot reach by itself: a bin holding a chip that is still on
  // offer beside it. `sorted` above is read off `placed` rather than off this, so a fill that
  // empties the tray cannot carry the board into its second stage.
  const tray = unplaced.filter((c) => c.id !== givenChip?.id);

  /** Which bins missed, named for the status line. */
  function missNames(): string {
    const names = misses.map((key) => binNamed(key));
    if (names.length === 1) {
      return `the "${names[0]}" bin`;
    }
    return `${names
      .slice(0, -1)
      .map((n) => `the "${n}" bin`)
      .join(", ")} and the "${names[names.length - 1]}" bin`;
  }

  return (
    <div className="lesson-interactive lesson-interactive--sorter">
      <div className="lesson-sorter__tray">
        {/* Keyed on `sorted`, not on an empty tray: a fill can take the last chip off it
            without anything having been sorted. */}
        {sorted ? (
          <span className="lesson-sorter__tray-empty">All sorted</span>
        ) : (
          tray.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={chip.name}
              aria-pressed={pickup.held === chip.id}
              // A carried radical has been offered to nothing, so it takes the third hue
              // rather than the colour this board gives one it has judged right.
              style={{
                color: LABEL,
                borderColor: pickup.held === chip.id ? SIGNAL_DEEP : SOFT,
              }}
              onDragStart={() => pickup.hold(chip.id)}
              onDragEnd={() => pickup.clear()}
              onClick={() => pickup.toggle(chip.id)}
            >
              <InlineMath latex={chip.latex} />
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
              // A bin is dashed at rest, so the amber dashing on the parked chip is the only
              // thing distinguishing it from a placement. The name is what says so in words,
              // in the same shape the shared kinds use for a filled slot.
              aria-label={
                parked === null
                  ? bin.name
                  : `${bin.name}: ${parked.name} was given, not answered`
              }
              style={{ borderColor: bin.color }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => place(bin.key)}
              onClick={() => place(bin.key)}
            >
              <span className="lesson-sorter__bin-label" style={{ color: bin.color }}>
                {bin.latex ? <InlineMath latex={bin.latex} /> : bin.name}
              </span>
              <span className="lesson-sorter__bin-items">
                {inBin.map((c) => (
                  <span key={c.id} className="lesson-sorter__placed">
                    <InlineMath latex={c.latex} color={bin.color} />
                  </span>
                ))}
                {parked !== null && (
                  <span
                    className="lesson-sorter__placed"
                    style={GIVEN_PLACEMENT}
                    {...fill.mark(true)}
                  >
                    {/* No colour of its own, so the amber the given rule sets carries. */}
                    <InlineMath latex={parked.latex} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {sorted && !combined && (
        <div className="lesson-interactive__controls">
          {summing.map((bin) => (
            <div
              key={bin.key}
              className="lesson-interactive__field"
              style={{ color: bin.color }}
            >
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`${bin.sum?.prompt ?? ""} =`} />
              </span>
              <input
                className="lesson-interactive__input"
                type="text"
                inputMode="text"
                value={combos[bin.key] ?? ""}
                disabled={binDone[bin.key] === true}
                aria-label={`${bin.name} combined`}
                onChange={(e) =>
                  setCombos((prev) => ({ ...prev, [bin.key]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    checkCombine();
                  }
                }}
                // Last, so the answer overrides whatever the learner typed for as long as the
                // reveal is up, and only on the bin the passage is about: every bin is its own
                // answer and this reveal explains the first one that missed. The value is the
                // spelling the widget's own reveal writes here, `accepted[0]`, so the two
                // cannot drift.
                {...(givenBin?.key === bin.key
                  ? fill.entry(bin.sum?.accepted[0] ?? "")
                  : {})}
              />
            </div>
          ))}
          <div className="lesson-interactive__field" style={{ color: binColor("none") }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={board.loneLatex} />
            </span>
            <button
              type="button"
              className="lesson-interactive__chip"
              aria-pressed={noneCall === "combines"}
              disabled={binDone.none === true}
              style={{ color: LABEL, borderColor: SOFT }}
              onClick={() => setNoneCall("combines")}
            >
              <InlineMath latex={board.loneTrap} />
            </button>
            {/* The third bin's answer is a CALL rather than a term, so the fill dashes the
                call `checkCombine` accepts. Both chips carry the same neutral token, so
                colour never marks it. */}
            <button
              type="button"
              className="lesson-interactive__chip"
              aria-pressed={noneCall === "does-not"}
              disabled={binDone.none === true}
              style={{
                color: LABEL,
                borderColor: givenBin?.key === "none" ? SIGNAL_DEEP : SOFT,
                borderStyle: givenBin?.key === "none" ? "dashed" : "solid",
              }}
              onClick={() => setNoneCall("does-not")}
              {...fill.mark(givenBin?.key === "none")}
            >
              does not combine
            </button>
          </div>
          <button
            type="button"
            className="lesson-interactive__check"
            onClick={checkCombine}
          >
            Check
          </button>
        </div>
      )}

      {combined && (
        <p className="lesson-sorter__result" style={{ color: LABEL }}>
          Like radicals combine into one term, and unlike radicals stay as they are:{" "}
          <InlineMath latex={board.result} color={CIVIC} />
        </p>
      )}

      {(!sorted || sortRevealed) && missChip && (
        <WidgetReveal
          available
          revealed={sortRevealed}
          answer={`the "${binNamed(missChip.bin)}" bin`}
          why={missChip.why}
          onReveal={revealPlacement}
          label="Reveal the right bin"
          // A wrong drop leaves its chip on the tray, and the three bins are a second stage
          // that has not been reached yet, so naming one chip's bin never spends the board.
          // Read off `unplaced` rather than the tray, which the fill can shorten.
          othersRemain={unplaced.length > 1 || !combined}
        />
      )}

      {sorted && revealBin !== null && (
        <WidgetReveal
          available
          revealed={revealedBin === revealBin.key}
          answer={revealBin.answer}
          why={revealBin.why}
          onReveal={() => revealBinAnswer(revealBin)}
          label={revealBin.revealLabel}
          // Every bin is its own answer, so what is left after this one is explained is the
          // bins beside it that are still open. False on the last one, which is the gate.
          othersRemain={bins.some(
            (b) => b.key !== revealBin.key && binDone[b.key] !== true,
          )}
        />
      )}

      {combined ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with six new terms
        </button>
      ) : (
        <p
          className="lesson-interactive__status"
          data-state={feedback || misses.length > 0 ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {!sorted && sortRevealed
            ? null
            : sorted
              ? misses.length > 0
                ? `Not quite in ${missNames()}. Two terms add only when they already carry the same radicand, and even then it is the coefficients that add, never the radicand.`
                : "All six terms are sorted. Now answer all three bins: add the two bins whose terms share a radicand, and decide what happens in the third."
              : (feedback ??
                "Simplify each term first, then drag and drop it into the bin for its radicand. You can also tap a term and then tap a bin.")}
        </p>
      )}
    </div>
  );
}
