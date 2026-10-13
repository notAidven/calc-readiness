/**
 * NUM.4 interactive: sort terms into like-term bins, then combine each bin. The learner
 * drags each term chip (or taps a chip then a bin) into the matching bin (variable terms,
 * squared terms, constants); only a correct bin accepts a chip. Once every chip is sorted,
 * the learner TYPES each bin's combined term — only then is the full expression shown and
 * the lesson gate opened.
 *
 * QA-reconciled onto lesson-v3 (from PR #41): keeps v3's ungrouped tray, and adds (a) an
 * onDragEnd that clears a stale drag id when a chip is dropped OUTSIDE a bin (otherwise a
 * later bin click consumes the stale id and places the wrong chip), and (b) the
 * type-to-combine step so the learner produces the combined result instead of it
 * auto-revealing the moment sorting finishes.
 *
 * A board holds five sorts and three combines, so the reveal explains ONE of them — the
 * chip in hand, or the bin still open — and says that the rest are still the learner's.
 * The three combines settle independently for the same reason: getting two of them right
 * and one wrong used to hand back all three.
 */

import { type ReactNode, useRef, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SIGNAL, SIGNAL_DEEP, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

type BinKey = "var" | "sq" | "const";

const BIN_ORDER: readonly BinKey[] = ["var", "sq", "const"];
const COLOR: Record<BinKey, string> = { var: SIGNAL, sq: BRICK, const: CIVIC };

interface Chip {
  id: string;
  latex: string;
  name: string;
  bin: BinKey;
}

interface Board {
  /** The variable this board is written in, which also names two of its three bins. */
  sym: string;
  /**
   * The tray, IN THE ORDER IT IS DEALT, with no two neighbours sharing a bin.
   *
   * Authored rather than shuffled. A `Math.random()` shuffle also keeps like terms apart,
   * and it was what this widget used until it grew a variant pool, but it makes a mount
   * unreproducible: `widgetVariantPool.test.tsx` walks the pool and then asserts the cycle
   * comes back round to the board it opened on, and a re-shuffled tray never does. The
   * randomness was buying a property this order states outright.
   */
  chips: readonly Chip[];
  /**
   * What each bin combines to: the accepted typed forms, the sum shown beside the box, and
   * the typeset form of the answer. `display` is separate from `accepted[0]` because the
   * accepted forms are ASCII the learner can type and the display is LaTeX: `x2` and
   * `x^{2}` are the same term written for two different readers.
   */
  combine: Record<BinKey, { accepted: readonly string[]; prompt: string; display: string }>;
  /** The whole simplified expression, shown once every bin is in. */
  result: string;
}

/**
 * Two boards, neither of them slide 1's own $6a + 7 - 4a + 2$ nor the CFU's
 * $-2x + x^{2} + 7x$.
 *
 * They are a different question and not a relabelling. The first has a bare $x^{2}$, so its
 * squared bin combines to a coefficient of one that never appears in the terms; the second
 * is written in another letter entirely, carries a NEGATIVE variable term and a squared
 * coefficient of two, and its constants cross zero. A learner who combined the first by
 * copying coefficients across is stopped by the second.
 */
const BOARDS: readonly Board[] = [
  {
    sym: "x",
    chips: [
      { id: "3x", latex: "3x", name: "3x", bin: "var" },
      { id: "m2", latex: "-2", name: "negative 2", bin: "const" },
      { id: "x2", latex: "x^{2}", name: "x squared", bin: "sq" },
      { id: "4", latex: "4", name: "4", bin: "const" },
      { id: "5x", latex: "5x", name: "5x", bin: "var" },
    ],
    combine: {
      var: { accepted: ["8x"], prompt: "3x + 5x", display: "8x" },
      sq: { accepted: ["x2", "1x2"], prompt: "x^{2}", display: "x^{2}" },
      const: { accepted: ["2"], prompt: "-2 + 4", display: "2" },
    },
    result: "x^{2} + 8x + 2",
  },
  {
    sym: "y",
    chips: [
      { id: "4y", latex: "4y", name: "4y", bin: "var" },
      { id: "m3", latex: "-3", name: "negative 3", bin: "const" },
      { id: "2y2", latex: "2y^{2}", name: "2 y squared", bin: "sq" },
      { id: "8", latex: "8", name: "8", bin: "const" },
      { id: "my", latex: "-y", name: "negative y", bin: "var" },
    ],
    combine: {
      var: { accepted: ["3y"], prompt: "4y + (-y)", display: "3y" },
      sq: { accepted: ["2y2"], prompt: "2y^{2}", display: "2y^{2}" },
      const: { accepted: ["5"], prompt: "-3 + 8", display: "5" },
    },
    result: "2y^{2} + 3y + 5",
  },
];

/** Normalize a typed term so 8x/8*x, x^2/x²/x2, and unicode minus all compare equal. */
function normalizeTerm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u2212/g, "-")
    .replace(/\u00b2/g, "2")
    .replace(/[\s*·^]/g, "");
}

export function LikeTermsSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LikeTermsSorterBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LikeTermsSorterBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { sym, chips: CHIPS, combine: COMBINE, result } = board;
  const BINS: { key: BinKey; latex: string | null; name: string }[] = [
    { key: "var", latex: `${sym} \\text{ terms}`, name: `${sym} terms` },
    { key: "sq", latex: `${sym}^{2} \\text{ terms}`, name: `${sym} squared terms` },
    { key: "const", latex: null, name: "constants" },
  ];
  const binOf = (key: BinKey) =>
    BINS.find((b) => b.key === key) ?? (BINS[0] as (typeof BINS)[number]);

  const [placed, setPlaced] = useState<Record<string, BinKey>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [combos, setCombos] = useState<Record<BinKey, string>>({
    var: "",
    sq: "",
    const: "",
  });
  const [binDone, setBinDone] = useState<Record<BinKey, boolean>>({
    var: false,
    sq: false,
    const: false,
  });
  const [combineFeedback, setCombineFeedback] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  const dragId = useRef<string | null>(null);
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const sorted = Object.keys(placed).length === CHIPS.length;
  const combined = BIN_ORDER.every((key) => binDone[key]);
  const tray = CHIPS.filter((c) => !placed[c.id]);

  /**
   * What the reveal is about, and what is left behind it.
   *
   * Sorting comes first, so while any chip is in the tray the passage is about that chip;
   * afterwards it is about the first bin still open. `othersRemain` is live off both counts
   * at once, because the combining step is still outstanding all through the sorting one:
   * a reveal of the last chip does not leave the board with nothing to answer.
   */
  const openChip = tray[0] ?? null;
  const openBin = BIN_ORDER.find((key) => !binDone[key]) ?? null;
  const binsOpen = BIN_ORDER.filter((key) => !binDone[key]).length;
  const othersRemain = openChip !== null ? true : binsOpen > 1;

  /** Close the board out. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setPlaced(Object.fromEntries(CHIPS.map((c) => [c.id, c.bin])));
    setBinDone({ var: true, sq: true, const: true });
    setSelected(null);
    setFeedback(null);
    setCombineFeedback(null);
    if (earned) {
      success();
    }
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function place(bin: BinKey) {
    const id = dragId.current ?? selected;
    dragId.current = null;
    if (!id || placed[id]) {
      return;
    }
    const chip = CHIPS.find((c) => c.id === id);
    if (!chip) {
      return;
    }
    if (chip.bin === bin) {
      setPlaced({ ...placed, [id]: bin });
      setSelected(null);
      setFeedback(null);
      success();
    } else {
      setAttempted(true);
      setFeedback(
        "Not a match. Look at the variable part: same variable and power go together.",
      );
    }
  }

  function checkCombine() {
    if (combined) {
      return;
    }
    setAttempted(true);
    // Each bin is its own combination, so they settle separately: getting two right and one
    // wrong used to hand all three back.
    const next = { ...binDone };
    let landed = false;
    for (const key of BIN_ORDER) {
      if (!next[key] && COMBINE[key].accepted.includes(normalizeTerm(combos[key]))) {
        next[key] = true;
        landed = true;
      }
    }
    setBinDone(next);
    if (landed) {
      success();
    }
    if (BIN_ORDER.every((key) => next[key])) {
      setCombineFeedback(null);
      if (!done) {
        setDone(true);
        onSolved();
      }
      return;
    }
    setCombineFeedback(
      landed
        ? "That one is right. Combine the bins still open: add the coefficients and keep the variable part."
        : "Combine each bin: add the coefficients and keep the variable part.",
    );
  }

  function reveal() {
    setCombos({
      var: COMBINE.var.accepted[0] ?? "",
      sq: COMBINE.sq.accepted[0] ?? "",
      const: COMBINE.const.accepted[0] ?? "",
    });
    setRevealed(true);
    finish(false);
  }

  const combinedValue = (key: BinKey) =>
    binDone[key] ? (COMBINE[key].accepted[0] ?? "") : combos[key];

  /** The answer the passage is naming, and the reasoning behind it. */
  const teachingBin = openChip !== null ? openChip.bin : (openBin ?? "var");
  const revealAnswer =
    openChip !== null ? (
      <>the {binOf(openChip.bin).name} bin</>
    ) : (
      <InlineMath latex={COMBINE[teachingBin].display} />
    );
  const revealWhy =
    openChip !== null ? (
      <>
        A term's bin is decided by its VARIABLE PART alone: the letter it carries and the
        power that letter is raised to. The coefficient in front takes no part in the
        decision, which is why terms that look nothing like each other can still be like
        terms. Read <InlineMath latex={openChip.latex} /> that way and{" "}
        {openChip.bin === "const" ? (
          <>
            there is no variable part left to read: it is a plain number, so it goes with
            the other constants
          </>
        ) : (
          <>
            what is left is <InlineMath latex={binOf(openChip.bin).latex ?? sym} />, so that
            is the bin it belongs in
          </>
        )}
        .
      </>
    ) : (
      <>
        A bin already holds terms that are alike, so combining them adds the COEFFICIENTS
        and leaves the variable part exactly as it was:{" "}
        <InlineMath
          latex={`${COMBINE[teachingBin].prompt} = ${COMBINE[teachingBin].display}`}
        />
        . Adding never raises anything to a new power, which is why the three bins stay
        separate all the way to the end and are only written side by side at the last step.
      </>
    );

  return (
    <div className="lesson-interactive lesson-interactive--sorter">
      <div className="lesson-sorter__tray">
        {tray.length === 0 ? (
          <span className="lesson-sorter__tray-empty">All sorted</span>
        ) : (
          tray.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={chip.name}
              aria-pressed={selected === chip.id}
              style={{
                color: COLOR[chip.bin],
                borderColor:
                  fill.given && openChip?.id === chip.id ? SIGNAL_DEEP : COLOR[chip.bin],
                borderStyle: fill.given && openChip?.id === chip.id ? "dashed" : undefined,
              }}
              onDragStart={() => {
                dragId.current = chip.id;
              }}
              onDragEnd={() => {
                // Clear the drag id even when the drop lands outside a bin, so a later
                // bin CLICK can't consume this stale id and place the wrong chip.
                dragId.current = null;
              }}
              onClick={() => setSelected((s) => (s === chip.id ? null : chip.id))}
              // Marks the chip the passage is explaining, and only that one: the rest of the
              // tray is still the learner's to sort, which is what `othersRemain` promised.
              {...fill.mark(openChip?.id === chip.id)}
            >
              <InlineMath latex={chip.latex} />
            </button>
          ))
        )}
      </div>

      <div className="lesson-sorter__bins">
        {BINS.map((bin) => {
          const inBin = CHIPS.filter((c) => placed[c.id] === bin.key);
          const naming = fill.given && openChip !== null && openChip.bin === bin.key;
          return (
            <button
              key={bin.key}
              type="button"
              className="lesson-sorter__bin"
              aria-label={bin.name}
              style={{
                borderColor: naming ? SIGNAL_DEEP : COLOR[bin.key],
                borderStyle: naming ? "dashed" : undefined,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => place(bin.key)}
              onClick={() => place(bin.key)}
              {...fill.mark(naming)}
            >
              <span className="lesson-sorter__bin-label" style={{ color: COLOR[bin.key] }}>
                {bin.latex ? <InlineMath latex={bin.latex} /> : bin.name}
              </span>
              <span className="lesson-sorter__bin-items">
                {inBin.map((c) => (
                  <span key={c.id} className="lesson-sorter__placed">
                    <InlineMath latex={c.latex} color={COLOR[bin.key]} />
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {sorted && !combined && (
        <div className="lesson-interactive__controls">
          {BINS.map((bin) => (
            <div
              key={bin.key}
              className="lesson-interactive__field"
              style={{ color: COLOR[bin.key] }}
            >
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`${COMBINE[bin.key].prompt} =`} />
              </span>
              <input
                className="lesson-interactive__input"
                type="text"
                inputMode="text"
                value={combinedValue(bin.key)}
                disabled={binDone[bin.key]}
                aria-label={`${bin.name} combined`}
                onChange={(e) =>
                  setCombos((prev) => ({ ...prev, [bin.key]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    checkCombine();
                  }
                }}
                // Only the bin the passage is explaining is filled in. The other open bins
                // stay blank, which is the whole of what handing the board back is worth.
                {...(openChip === null && openBin === bin.key
                  ? fill.entry(COMBINE[bin.key].accepted[0] ?? "")
                  : {})}
              />
            </div>
          ))}
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
          Combine each bin: <InlineMath latex={result} color={CIVIC} />
        </p>
      )}

      <WidgetReveal
        available={attempted && !combined}
        revealed={revealed}
        othersRemain={othersRemain}
        answer={revealAnswer}
        why={revealWhy}
        onReveal={reveal}
      />

      {combined ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different expression
        </button>
      ) : (
        <p
          className="lesson-interactive__status"
          data-state={feedback || combineFeedback ? "wrong" : "prompt"}
          aria-live="polite"
          style={{ color: feedback || combineFeedback ? BRICK : SOFT }}
        >
          {sorted
            ? (combineFeedback ?? "Now type what each bin combines to, then press Check.")
            : (feedback ??
              "Drag and drop each term into its bin. You can also tap a term and then tap a bin.")}
        </p>
      )}
    </div>
  );
}
