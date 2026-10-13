/**
 * RAD.1 interactive (slide 3): sort six roots-over-fractions by what their BOTTOM does.
 *
 * This replaces a slider that scrubbed through denominators one at a time. QA could not
 * tell what that widget was asking: the slider had nothing to do with the mathematics
 * (nothing about this idea is continuous), and the question it wanted answered was buried
 * two controls below the diagram. The idea itself is a two-way classification, so the
 * interaction is now a two-way sort, and the whole task fits in one sentence.
 *
 * The split is never hidden. Every chip prints as sqrt(a/b) in the tray and, once it lands
 * in a bin, as its split form: sqrt(a)/n in the clearing bin and sqrt(a)/sqrt(b) in the
 * other. So the learner watches sqrt(a/b) = sqrt(a)/sqrt(b) apply six times while deciding
 * the one thing that actually varies, which is whether the bottom is a perfect square.
 *
 * A wrong drop is corrected and the chip returns to the tray rather than locking, because
 * a sort with six chips and two bins is not brute-forceable in the way a single row is.
 * Gates once all six are in the right bin. Every correct placement fires the shared
 * success state; a revealed chip is placed for the learner and explained, and does not.
 */

import { type CSSProperties, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { usePickup } from "./pickup";

type BinKey = "whole" | "root";

interface Chip {
  /** Numerator radicand. Square-free, so the top never distracts from the bottom. */
  top: number;
  /** Denominator radicand: the only thing the sort turns on. */
  bottom: number;
  /** sqrt(bottom) when the bottom is a perfect square, else 0. */
  rootOfBottom: number;
}

/**
 * Two trays of six. Each holds three bottoms that clear and three that do not, interleaved
 * so the tray order is never itself the answer, and a chip is keyed by its bottom, so the
 * six bottoms within a tray have to be distinct. "Start over" hands out the tray the
 * learner has NOT just sorted.
 */
const POOLS: readonly (readonly Chip[])[] = [
  [
    { top: 5, bottom: 4, rootOfBottom: 2 },
    { top: 7, bottom: 6, rootOfBottom: 0 },
    { top: 3, bottom: 25, rootOfBottom: 5 },
    { top: 5, bottom: 2, rootOfBottom: 0 },
    { top: 7, bottom: 9, rootOfBottom: 3 },
    { top: 2, bottom: 3, rootOfBottom: 0 },
  ],
  [
    { top: 3, bottom: 16, rootOfBottom: 4 },
    { top: 5, bottom: 10, rootOfBottom: 0 },
    { top: 2, bottom: 49, rootOfBottom: 7 },
    { top: 7, bottom: 5, rootOfBottom: 0 },
    { top: 11, bottom: 36, rootOfBottom: 6 },
    { top: 3, bottom: 7, rootOfBottom: 0 },
  ],
];

const BINS: readonly { key: BinKey; label: string; color: string }[] = [
  { key: "whole", label: "bottom comes out whole", color: CIVIC },
  { key: "root", label: "a root stays on the bottom", color: BRICK },
];

function binFor(chip: Chip): BinKey {
  return chip.rootOfBottom > 0 ? "whole" : "root";
}

/** The chip before it is sorted: the root still sitting over the whole fraction. */
function unsplitLatex(chip: Chip): string {
  return `\\sqrt{\\tfrac{${chip.top}}{${chip.bottom}}}`;
}

/** The chip after it is sorted: the split, with the bottom resolved as far as it goes. */
function splitLatex(chip: Chip): string {
  const bottom = chip.rootOfBottom > 0 ? `${chip.rootOfBottom}` : `\\sqrt{${chip.bottom}}`;
  return `\\tfrac{\\sqrt{${chip.top}}}{${bottom}}`;
}

function spoken(chip: Chip): string {
  return `the square root of ${chip.top} over ${chip.bottom}`;
}

/**
 * The outline that says a chip was PARKED in a bin rather than placed there by the learner.
 *
 * A placed chip carries no border at all, so an outline is what tells the two apart without
 * spending a hue: `data-reveal-given` supplies the amber and the dashing, and a border needs
 * a width before either of them can be seen.
 */
const GIVEN_PLACEMENT: CSSProperties = {
  borderWidth: "1.5px",
  borderRadius: "8px",
  padding: "0 4px",
};

export function RadicalQuotientSorter(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const chips = POOLS[variant.index] ?? (POOLS[0] as readonly Chip[]);
  return (
    <RadicalQuotientSorterBody
      key={variant.nonce}
      chips={chips}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RadicalQuotientSorterBody({
  chips,
  onSolved,
  onRestart,
}: {
  chips: readonly Chip[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [placed, setPlaced] = useState<Record<number, BinKey>>({});
  const [missedBottom, setMissedBottom] = useState<number | null>(null);
  const [revealedBottom, setRevealedBottom] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pickup = usePickup<number>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const missedChip = chips.find((c) => c.bottom === missedBottom) ?? null;
  const revealedChip = chips.find((c) => c.bottom === revealedBottom) ?? null;

  /**
   * The chip the passage on screen is placing, parked in its bin for as long as it is up.
   *
   * The blank on a sort board is the PLACEMENT, so a reveal that named the bin in words and
   * left the chip on the tray asked the learner to carry the pairing across to a board
   * showing nothing of it. What is parked is the chip that was just MISPLACED, which is the
   * one the passage is about.
   *
   * It keeps the form it had on the tray. The split form a placed chip prints is what the
   * placement earns, and printing it here would take the unsplit root off the board and put
   * a different expression on it: a reveal answers the question that was asked, and this one
   * asked which bin, not what the split comes to. The passage above works the split out in
   * full, which is where that belongs.
   */
  const givenChip = fill.given ? missedChip : null;

  const unplaced = chips.filter((c) => placed[c.bottom] === undefined);
  // Off `unplaced` and NOT off the tray below, so a fill that empties the tray cannot close
  // the board out: nothing was answered, and the parked chip is still the learner's to place.
  const solved = unplaced.length === 0;
  // A GIVEN chip comes off the tray exactly as a placed one does. Leaving it there would put
  // the board in a state it cannot reach by itself: a bin holding a chip that is still on
  // offer beside it.
  const tray = unplaced.filter((c) => c.bottom !== givenChip?.bottom);

  /** The chip the diagram illustrates: whatever was placed last, else whatever is picked. */
  const shownBottom = revealedBottom ?? missedBottom ?? pickup.held ?? null;
  const shown = chips.find((c) => c.bottom === shownBottom) ?? null;

  function settle(chip: Chip, bin: BinKey) {
    const next = { ...placed, [chip.bottom]: bin };
    setPlaced(next);
    if (Object.keys(next).length === chips.length && !done) {
      setDone(true);
      onSolved();
    }
  }

  function place(bin: BinKey) {
    const heldBottom = pickup.take();
    const chip = chips.find((c) => c.bottom === heldBottom);
    if (!chip || placed[chip.bottom] !== undefined) {
      return;
    }
    if (binFor(chip) !== bin) {
      setMissedBottom(chip.bottom);
      setFeedback(
        bin === "whole"
          ? `Not quite. No whole number times itself gives ${chip.bottom}, so its root cannot come out whole and it stays on the bottom.`
          : `Not quite. ${chip.bottom} is a perfect square, so its root is a whole number and the bottom clears.`,
      );
      return;
    }
    setMissedBottom(null);
    setRevealedBottom(null);
    setFeedback(null);
    success();
    settle(chip, bin);
  }

  function reveal() {
    const chip = chips.find((c) => c.bottom === missedBottom);
    if (!chip) {
      return;
    }
    setRevealedBottom(chip.bottom);
    setMissedBottom(null);
    setFeedback(null);
    settle(chip, binFor(chip));
  }

  return (
    <div className="lesson-interactive lesson-interactive--sorter">
      <svg
        viewBox="0 0 440 96"
        role="img"
        aria-label={
          shown
            ? `${spoken(shown)}, split into the root of the top over the root of the bottom`
            : "A square root over a fraction splits into the root of the top over the root of the bottom"
        }
      >
        <title>Splitting a square root over a fraction</title>
        <SvgMath
          latex={
            shown
              ? `\\sqrt{\\tfrac{${shown.top}}{${shown.bottom}}} = \\tfrac{\\sqrt{${shown.top}}}{\\sqrt{${shown.bottom}}} = ${splitLatex(shown)}`
              : "\\sqrt{\\tfrac{a}{b}} = \\tfrac{\\sqrt{a}}{\\sqrt{b}}"
          }
          x={220}
          y={44}
          fontSize={22}
          color={shown ? (shown.rootOfBottom > 0 ? CIVIC : BRICK) : LABEL}
          h={84}
        />
        <text x={220} y={88} textAnchor="middle" fontSize={12} fill={SOFT}>
          {shown ? "the split, with the bottom taken as far as it goes" : "the split"}
        </text>
      </svg>

      <div className="lesson-sorter__tray">
        {/* Keyed on `solved`, not on an empty tray: a fill can take the last chip off it
            without anything having been sorted. */}
        {solved ? (
          <span className="lesson-sorter__tray-empty">All sorted</span>
        ) : (
          tray.map((chip) => (
            <button
              key={chip.bottom}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={spoken(chip)}
              aria-pressed={pickup.held === chip.bottom}
              style={{ color: LABEL, borderColor: SOFT }}
              onDragStart={() => pickup.hold(chip.bottom)}
              onDragEnd={() => pickup.clear()}
              onClick={() => pickup.toggle(chip.bottom)}
            >
              <InlineMath latex={unsplitLatex(chip)} />
            </button>
          ))
        )}
      </div>

      <div className="lesson-sorter__bins lesson-sorter__bins--pair">
        {BINS.map((bin) => {
          const parked =
            givenChip !== null && binFor(givenChip) === bin.key ? givenChip : null;
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
                  ? bin.label
                  : `${bin.label}: ${spoken(parked)} was given, not answered`
              }
              style={{ borderColor: bin.color }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => place(bin.key)}
              onClick={() => place(bin.key)}
            >
              <span className="lesson-sorter__bin-label" style={{ color: bin.color }}>
                {bin.label}
              </span>
              <span className="lesson-sorter__bin-items">
                {chips
                  .filter((c) => placed[c.bottom] === bin.key)
                  .map((c) => (
                    <span key={c.bottom} className="lesson-sorter__placed">
                      <InlineMath latex={splitLatex(c)} color={bin.color} />
                    </span>
                  ))}
                {parked !== null && (
                  <span
                    className="lesson-sorter__placed"
                    style={GIVEN_PLACEMENT}
                    {...fill.mark(true)}
                  >
                    {/* No colour of its own, so the amber the given rule sets carries. */}
                    <InlineMath latex={unsplitLatex(parked)} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with six new roots
        </button>
      )}

      <WidgetReveal
        available={missedChip !== null}
        revealed={revealedChip !== null}
        // The chip just MISPLACED, not the one already revealed: the reveal is read at
        // the moment of the click, when that is the chip still in question.
        answer={
          missedChip ? (
            <>
              <InlineMath latex={unsplitLatex(missedChip)} /> belongs in{" "}
              {missedChip.rootOfBottom > 0
                ? "the bin where the bottom comes out whole"
                : "the bin where a root stays on the bottom"}
            </>
          ) : null
        }
        why={
          missedChip ? (
            missedChip.rootOfBottom > 0 ? (
              <>
                The root splits over the fraction first, giving{" "}
                <InlineMath
                  latex={`\\tfrac{\\sqrt{${missedChip.top}}}{\\sqrt{${missedChip.bottom}}}`}
                />
                . Now look only at the bottom:{" "}
                <InlineMath
                  latex={`${missedChip.rootOfBottom} \\times ${missedChip.rootOfBottom} = ${missedChip.bottom}`}
                />
                , so <InlineMath latex={`${missedChip.bottom}`} /> is a perfect square and
                its root is the whole number{" "}
                <InlineMath latex={`${missedChip.rootOfBottom}`} />. That leaves{" "}
                <InlineMath latex={splitLatex(missedChip)} />, with no radical downstairs.
              </>
            ) : (
              <>
                The root splits over the fraction first, giving{" "}
                <InlineMath latex={splitLatex(missedChip)} />. Now look only at the bottom.
                Nothing whole times itself gives{" "}
                <InlineMath latex={`${missedChip.bottom}`} />, so it is not a perfect square
                and its root cannot become a whole number. The radical has to stay on the
                bottom, and the value written that way is correct; getting the root off the
                bottom is a separate tidying move on top of this one.
              </>
            )
          ) : null
        }
        onReveal={reveal}
        label="Reveal this one"
        // A wrong drop leaves its chip on the tray, so the misplaced one is among those still
        // to sort: more than one there means another chip is outstanding after this is
        // explained. False on the last chip, which is the one the gate turns on. Read off
        // `unplaced` rather than the tray, which the fill can shorten.
        othersRemain={unplaced.length > 1}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealedChip ? null : solved ? (
          <>
            The root always splits over the fraction:{" "}
            <InlineMath latex="\sqrt{\tfrac{a}{b}} = \tfrac{\sqrt{a}}{\sqrt{b}}" />. After
            that, only one thing decides what happens downstairs: whether the bottom is a
            perfect square.
          </>
        ) : (
          (feedback ??
          "Drag and drop each root into the bin for what its bottom number does. You can also tap a root and then tap a bin.")
        )}
      </p>
    </div>
  );
}
