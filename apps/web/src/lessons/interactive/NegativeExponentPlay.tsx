/**
 * EXP.1 interactive (slide 6): a negative exponent is a positive one run backwards.
 *
 * The slide it belongs to used to argue, from the product rule, that a negative exponent
 * COULD NOT be anything other than a reciprocal, and it used an ordering widget to build
 * that argument a line at a time. Both went, together, because they were the same problem:
 * the slide before it had already reached the values by dividing down a ledger, so this one
 * had no idea of its own and its prose had to spend itself defending numbers the learner had
 * already seen. The framing now is the symmetric other half of what EXP.1 opened with. A
 * positive exponent multiplies; a negative one divides; the fraction is where dividing puts
 * things. Nothing to derive, so nothing to defend.
 *
 * The interaction had to change with it or the two would disagree, and it must NOT be one
 * more column of values walked downwards: that shape teaches "the pattern continues", which
 * is the idea being replaced. So the board is a MIRROR. Five powers sit in a row with
 * $b^{0} = 1$ worked in the middle, and the learner fills the rest by deciding, one cell at
 * a time, whether that cell's exponent says multiply or divide. The cells are asked for
 * alternately, outwards on each side in turn, so the choice flips on every tap and the
 * opposition is the thing being handled rather than something said about the board.
 *
 * Neither side is labelled. Reading the SIGN as an instruction is the whole answer, so a
 * board captioned "divide" on the left would hand it over.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

/**
 * The bases the row is built on. Neither is the slide's own $2$, so the values cannot be
 * read off the prose, and "start over" hands out the one the learner has not just worked.
 */
const BASES: readonly number[] = [3, 5];

/** The exponents on the row, left to right. The middle one is given as the anchor. */
const EXPONENTS: readonly number[] = [-2, -1, 0, 1, 2];

/**
 * Which cell is asked for, in order: right of centre, then left, then right, then left.
 *
 * Alternating is the point. Both cells on one side and then both on the other lets the
 * learner tap the same button twice without rereading anything, which is exactly the
 * pattern-continuation habit this slide replaced.
 */
const ASK_ORDER: readonly number[] = [3, 1, 4, 0];

export function NegativeExponentPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BASES.length, props);
  const base = BASES[variant.index] ?? (BASES[0] as number);
  return (
    <NegativeExponentPlayBody
      key={variant.nonce}
      base={base}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function NegativeExponentPlayBody({
  base,
  onSolved,
  onRestart,
}: {
  base: number;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [filled, setFilled] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = filled >= ASK_ORDER.length;
  const openCell = solved ? null : (ASK_ORDER[filled] ?? null);
  const openExponent = openCell === null ? null : (EXPONENTS[openCell] ?? null);
  /** The open cell sits outward of the middle on the right, so its step multiplies. */
  const wantsMultiply = openExponent !== null && openExponent > 0;

  /** What each power is worth: a whole number going right, a fraction going left. */
  function valueLatex(exponent: number): string {
    return exponent >= 0 ? String(base ** exponent) : `\\tfrac{1}{${base ** -exponent}}`;
  }

  function powerLatex(exponent: number): string {
    return `${base}^{${exponent}}`;
  }

  function spokenPower(exponent: number): string {
    return exponent < 0
      ? `${base} to the minus ${-exponent}`
      : `${base} to the ${exponent}`;
  }

  /** Close this cell out. `earned` is false when the learner revealed it instead. */
  function advance(earned: boolean) {
    const next = filled + 1;
    setFilled(next);
    setAttempted(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= ASK_ORDER.length) {
      onSolved();
    }
  }

  function choose(multiply: boolean) {
    if (solved || openExponent === null) {
      return;
    }
    if (multiply === wantsMultiply) {
      setRevealed(false);
      advance(true);
      return;
    }
    setAttempted(true);
    setRevealed(false);
    setFeedback(
      wantsMultiply
        ? `Not that one. That cell's exponent is one HIGHER than the cell beside it, and an exponent counts copies of ${base} multiplied together, so one more copy means multiplying.`
        : `Not that one. That cell's exponent is one LOWER than the cell beside it. Going up multiplies, so going down has to be the opposite of that.`,
    );
  }

  /** Cell geometry: five boxes across, the middle one under the centre of the figure. */
  const CELL_W = 76;
  const CELL_H = 40;
  const CELL_Y = 56;
  const VALUE_Y = 124;
  const cx = (index: number) => 48 + index * 86;

  return (
    <div className="lesson-interactive lesson-interactive--exp-builder">
      {/* The goal, above the figure. It says what the finished row shows and stops short of
          saying which operation either side takes, which is the answer four times over. */}
      <p className="lesson-interactive__objective">
        Goal: find what every power on this row is worth, using nothing but the sign and the
        size of its own exponent.
      </p>

      <svg
        viewBox="0 0 440 152"
        role="img"
        aria-label={`A row of five powers of ${base}, from ${spokenPower(-2)} up to ${spokenPower(2)}, with ${spokenPower(0)} worked in the middle`}
      >
        <title>{`Powers of ${base} either side of the zero power`}</title>

        <text x={220} y={24} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`${filled} of ${ASK_ORDER.length} worked out`}
        </text>

        {EXPONENTS.map((exponent, index) => {
          const anchor = exponent === 0;
          const done = anchor || ASK_ORDER.indexOf(index) < filled;
          const open = index === openCell;
          return (
            <g key={exponent}>
              <rect
                x={cx(index) - CELL_W / 2}
                y={CELL_Y}
                width={CELL_W}
                height={CELL_H}
                rx={8}
                // Neutral, not amber: amber is reserved for a blank a reveal handed over,
                // and the anchor is part of the axis rather than anything the learner was given.
                fill={anchor ? LINE : "none"}
                fillOpacity={anchor ? 0.35 : 1}
                stroke={open ? CIVIC : LINE}
                strokeWidth={open ? 2 : 1.5}
                strokeDasharray={open ? "5 4" : undefined}
              />
              <SvgMath
                latex={powerLatex(exponent)}
                x={cx(index)}
                y={CELL_Y + CELL_H / 2}
                fontSize={17}
                // The powers are the AXIS and are known from the start; only the VALUES are
                // answers. Greying an unworked power made its minus sign near-invisible.
                color={LABEL}
                w={CELL_W}
                h={CELL_H}
              />
              {done ? (
                <SvgMath
                  latex={`= ${valueLatex(exponent)}`}
                  x={cx(index)}
                  y={VALUE_Y}
                  fontSize={16}
                  color={anchor ? LABEL : CIVIC}
                  w={CELL_W}
                  h={40}
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different base
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          {/* Both options in the same neutral token, so colour never marks the answer. The
              fill marks whichever one a reveal has just handed over. */}
          <button
            type="button"
            className="lesson-interactive__step"
            style={{
              color: LABEL,
              borderColor: wantsMultiply && fill.given ? SIGNAL_DEEP : LINE,
              borderStyle: wantsMultiply && fill.given ? "dashed" : "solid",
            }}
            aria-label={`Multiply by ${base}`}
            onClick={() => choose(true)}
            {...fill.mark(wantsMultiply)}
          >
            <InlineMath latex={`\\times ${base}`} />
          </button>
          <button
            type="button"
            className="lesson-interactive__step"
            style={{
              color: LABEL,
              borderColor: !wantsMultiply && fill.given ? SIGNAL_DEEP : LINE,
              borderStyle: !wantsMultiply && fill.given ? "dashed" : "solid",
            }}
            aria-label={`Divide by ${base}`}
            onClick={() => choose(false)}
            {...fill.mark(!wantsMultiply)}
          >
            <InlineMath latex={`\\div ${base}`} />
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={wantsMultiply ? `\\times ${base}` : `\\div ${base}`} />}
        why={
          wantsMultiply ? (
            <>
              An exponent counts how many copies of the base are multiplied together, so a
              cell one step to the right has one more copy in it than its neighbour:{" "}
              <InlineMath
                latex={`${powerLatex((openExponent ?? 1) - 1)} \\cdot ${base} = ${powerLatex(openExponent ?? 1)}`}
              />
              . Going outwards on this side multiplies, every time.
            </>
          ) : (
            <>
              Going up the row multiplies by <InlineMath latex={`${base}`} />, so going down
              it does the opposite and divides:{" "}
              <InlineMath
                latex={`${powerLatex((openExponent ?? -1) + 1)} \\div ${base} = ${powerLatex(openExponent ?? -1)}`}
              />
              . Dividing is also what puts the answer under a <InlineMath latex="1" />,
              which is where the fraction comes from.
            </>
          )
        }
        onReveal={() => {
          setRevealed(true);
          advance(false);
        }}
        label="Reveal what this cell takes"
        // The ladder is filled one cell at a time, so what is left after the open one is
        // explained is every cell past it, and the cells already built stay built. False on
        // the last cell, which is the one the gate turns on.
        othersRemain={filled + 1 < ASK_ORDER.length}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : solved ? (
          <>
            Out from the middle, one side multiplied and the other divided, the same number
            of steps each way. That is all a minus sign in an exponent does: it turns the
            multiplying round. And dividing is what left the answers underneath a{" "}
            <InlineMath latex="1" />, so the fractions were never a separate rule:{" "}
            <InlineMath latex={`${base}^{-k} = \\tfrac{1}{${base}^{k}}`} />.
          </>
        ) : (
          (feedback ??
          "The dashed cell is next. Compare its exponent with the cell beside it and choose what that step does.")
        )}
      </p>
    </div>
  );
}
