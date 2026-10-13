/**
 * INTERACTION KIND: labelling the parts of a figure.
 *
 * The statement reads left to right as ordinary maths with a gap wherever a name is owed,
 * and directly under each gap sits the piece of the expression that gap is asking about.
 * The slot and the term it belongs to are drawn one above the other rather than off in a
 * separate list, which is the whole reason this kind was written: a target that is drawn
 * in one place and wired in another is a target nobody can find.
 *
 * THE BLANK IS ON THE STATEMENT'S OWN LINE, and the term is the annotation beneath it.
 * The two were the other way up until the swap: the maths ran across the top and the
 * boxes hung below it, so the row a learner read along was a row of terms and the row
 * they answered on was a separate thing underneath. Reading it the other way up, the line
 * they read IS the line they fill — "$\sqrt{49} = 7$ has ___, ___, ___" — and each term
 * is the caption saying which piece its blank is about.
 *
 * The term and the slot are two elements, not one. They used to be one — a single dashed
 * box held the glyph AND the words "drag a name here" — and that box was doing two
 * contradictory jobs at once: marking out which part of the expression is being talked
 * about, and marking out where to put something. QA could not read it, and the reason is
 * structural rather than cosmetic. So the dashed, receiving affordance belongs to the
 * slot alone and the term under it is plain maths with no box around it.
 *
 * Nothing tells the learner "drag a name here" either. That instruction is one
 * instruction, and printing it once per slot is R8 in miniature; it is also only half
 * true, since `usePickup` accepts a tap on a name followed by a tap on a slot just as
 * readily as a drag. The single accurate statement of the task lives in `prompt`, on the
 * status line, and the slots say what they are by being empty dashed boxes. What the
 * words used to carry for a screen reader — which term this slot belongs to — is carried
 * by the slot's `aria-label`, built from `spoken` so it never depends on scraping KaTeX.
 *
 * Gating needs a produced value, so the gate opens only when every part is named. A wrong
 * drop is refused and explained, and after a wrong drop the learner may reveal that one
 * part with the reasoning that names it.
 *
 * Revealing one part does not cost the figure. Naming three things is three answers, so
 * while any other slot is still empty the reveal explains the one part and hands the figure
 * BACK: every name already placed stays placed, and the part just explained goes back to
 * being empty for the learner to place themselves. That is `othersRemain` on the reveal, and
 * it is `unnamed.length > 1` rather than `true` because on the last outstanding part there
 * would be nothing left to hand back — the figure is then spent, and the shared layer's
 * fresh one is the only way on.
 *
 * ## Where the figure is allowed to break, which is not "wherever it runs out of room"
 *
 * These figures do not fit one line on a phone, and two of the three cannot be made to.
 * `CITY_PHONE.inside` is 304.8px; `radical-parts-label` needs 345.7 on one line and
 * `fraction-exponent-label` 363.8, and the excess is the MATHEMATICS — the leads that state
 * the expression being named. Slot sizing is not the lever it looks like: `3.5rem` is
 * already narrower than the widest name a slot has to hold ("exponent" is 64.5px on the
 * widest fallback font, "radicand" 61.0px), so those two slots are sized by their own words
 * and shrinking the minimum moves nothing but the empty box.
 *
 * So the figure reflows, and the point is WHERE. Left to a flat `flex-wrap`, it broke
 * wherever it ran out of room, and `radical-parts-label` broke after a comma: "$\sqrt{49} =
 * 7$ has $\surd$ ," on one line and "$49$ , $7$" on the next. That is not a wrapped
 * expression, it is two half-expressions.
 *
 * The break opportunities are therefore AUTHORED, at three levels of looseness, and the
 * DOM nesting is that ordering:
 *
 *   - A `lead` on a part opens a new STATEMENT — a reading complete in itself, like
 *     `fraction-exponent-label`'s second half ("$\sqrt[4]{x}$ has ..."). The figure breaks
 *     between statements first, and a statement lands on its own line whole.
 *   - Inside one statement, the lead and the row of terms are separate boxes, so a
 *     statement too wide for a line puts its lead above its terms. That is
 *     `radical-parts-label` on a phone: the expression on one line, the three named parts
 *     in a row beneath it.
 *   - A `before` — a comma, an equals sign — opens a new GROUP inside the terms row,
 *     carrying that connector with the term it introduces. A group never breaks, so a
 *     connector can never be left dangling at a line end, and a line may only divide the
 *     terms row where a connector says it may. `power-parts-label` is why this level
 *     exists: its `=` is the one place $3^5 = 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3$ may
 *     divide, and it must divide there rather than between the base and its exponent.
 *
 * That last level is not decoration. `power-parts-label` fits one line at 304.8px in the
 * font that ships and does NOT in the widest fallback a browser lands on, because in DejaVu
 * Sans the words "five copies of the base" measure 147.0px and the slot they sit in is then
 * wider than the term under it. A figure whose fit depends on which font the machine has
 * must degrade in a place somebody chose.
 */

import { Fragment, type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, SIGNAL_DEEP, SOFT } from "../../svgKit";
import { WidgetReveal } from "../../widgetFeedback";
import { useRevealFill, useRevealReAsk, useWidgetSuccess } from "../../widgetMechanics";
import { WidgetTask } from "../../widgetTask";
import { usePickup } from "../pickup";

export interface FigurePart {
  /** Stable id, also the drag payload. */
  id: string;
  /** The piece of the expression this slot wraps, as LaTeX. */
  latex: string;
  /** The name that belongs on it. */
  name: string;
  /**
   * How a screen reader should say the piece itself, e.g. "the raised 5".
   *
   * This is the only thing naming the slot to a screen reader, so it has to identify the
   * term on its own: the slot is empty until it is answered, and `latex` is KaTeX output
   * that cannot be read back out as words.
   */
  spoken: string;
  /** Why the name belongs to this piece. */
  why: ReactNode;
  /** Rendered raised, as an exponent is. */
  raised?: boolean;
  /**
   * A CONNECTOR drawn between the previous slot and this one, e.g. a comma or an equals
   * sign.
   *
   * It is carried in the same unbreakable group as the term it introduces, so it can never
   * be left dangling at a line end — and it is the finest of the figure's three break
   * opportunities, because a terms row too wide for its line may divide before it.
   */
  before?: string;
  /**
   * LaTeX opening a NEW STATEMENT at this part: a second reading, complete in itself.
   *
   * This is the figure's coarsest break opportunity, and the only place a narrow line is
   * allowed to divide two readings. Use it where the maths genuinely starts again
   * ("$\sqrt[4]{x}$ has ...") and `before` for anything that only joins two terms.
   */
  lead?: string;
}

export interface LabelPartsProps {
  /**
   * LaTeX opening the figure's FIRST statement, e.g. the expression whose parts are being
   * named. Empty where the terms themselves are the whole expression.
   */
  lead?: string;
  parts: readonly FigurePart[];
  /**
   * The order the NAMES are dealt in: indices into `parts`. Never the identity.
   *
   * The slots run left to right in `parts` order, so dealing the names in that order too
   * lays the answer out for the learner: take the first name, drop it on the first slot,
   * repeat, and the figure is finished without once reading what any of them says.
   * `labelPartsDeal` is what every caller uses, and it refuses an order that would do that.
   */
  dealt: readonly number[];
  /**
   * WHAT the finished figure will show, separate from how to build it. Required, because
   * "drag each name into the box it belongs to" is a description of the control: it leaves
   * the learner placing chips correctly with no idea what the labelled figure is for.
   */
  objective: ReactNode;
  /** HOW to operate the board. Lives here, never in the lesson prose. */
  prompt: string;
  /** The sentence the finished figure earns. */
  conclusion: ReactNode;
  /** Accessible name for the whole figure. */
  ariaLabel: string;
  onSolved: () => void;
  onRestart: () => void;
  /** Rendered once every part is named, so the learner can take a different figure. */
  restartLabel: string;
}

/**
 * The order to deal a figure's names in, given how many there are and which board this is.
 *
 * A rotation by `1 + (board mod (count - 1))` is a derangement of the slot order for any
 * count above one: every name moves, so no name is ever offered against the slot it
 * belongs to, and no board can be finished by taking the chips left to right. It is a
 * function of the board rather than of chance, so a figure deals the same way every time
 * it is opened and a failing screenshot can be reproduced.
 */
export function labelPartsDeal(count: number, board: number): readonly number[] {
  if (count < 2) {
    return Array.from({ length: count }, (_, i) => i);
  }
  const shift = 1 + (Math.abs(board) % (count - 1));
  return Array.from({ length: count }, (_, i) => (i + shift) % count);
}

/** One reading: the LaTeX that opens it, and the groups of terms named inside it. */
interface Statement {
  readonly lead: string | undefined;
  readonly groups: readonly (readonly FigurePart[])[];
}

/**
 * Cut the parts into statements at every `lead`, and each statement into groups at every
 * `before`. Those two cuts ARE the figure's break policy; nothing else may divide it.
 *
 * The figure-level `lead` opens the first statement. A figure with no leads at all is a
 * single statement, which is `power-parts-label`: one equation, in two groups either side
 * of its `=`.
 */
function statementsOf(lead: string | undefined, parts: readonly FigurePart[]): Statement[] {
  const open: { lead: string | undefined; groups: FigurePart[][] }[] = [
    { lead, groups: [] },
  ];
  for (const part of parts) {
    if (part.lead !== undefined) {
      open.push({ lead: part.lead, groups: [[part]] });
      continue;
    }
    const statement = open[open.length - 1];
    if (statement === undefined) {
      continue;
    }
    const group = statement.groups[statement.groups.length - 1];
    if (part.before !== undefined || group === undefined) {
      statement.groups.push([part]);
    } else {
      group.push(part);
    }
  }
  // A figure whose very first part opens a statement leaves an empty one in front of it.
  return open.filter((statement) => statement.groups.length > 0);
}

export function LabelParts({
  lead,
  parts,
  dealt,
  objective,
  prompt,
  conclusion,
  ariaLabel,
  onSolved,
  onRestart,
  restartLabel,
}: LabelPartsProps) {
  /** Part id -> true once its name is sitting on it. */
  const [named, setNamed] = useState<Record<string, boolean>>({});
  const [missed, setMissed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  /**
   * The slot a name is being dragged over. Held explicitly because `:hover` does not fire
   * during a native HTML5 drag, so without this the drag path has no target feedback at
   * all — and with the words gone, target feedback is the only thing left saying "here".
   */
  const [over, setOver] = useState<string | null>(null);
  const pickup = usePickup<string>();
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const unnamed = dealt
    .map((i) => parts[i])
    .filter((p): p is FigurePart => Boolean(p))
    .filter((p) => named[p.id] !== true);
  // Off `unnamed` and NOT off `tray`, so a fill that empties the tray cannot close the board
  // out: nothing was answered, and the figure is still one name short.
  const solved = unnamed.length === 0;
  // A GIVEN name comes off the tray exactly as a correctly placed one does. Leaving it there
  // would put the board in a state it cannot reach by itself: a slot showing a name with
  // that same name still on offer beside it.
  const tray = unnamed.filter((p) => !(fill.given && p.id === missed));

  function settle(id: string) {
    const next = { ...named, [id]: true };
    setNamed(next);
    if (parts.every((p) => next[p.id] === true)) {
      onSolved();
    }
  }

  function dropOn(part: FigurePart) {
    setOver(null);
    const carried = pickup.take();
    if (carried === null || named[part.id] === true) {
      return;
    }
    if (carried !== part.id) {
      const wrong = parts.find((p) => p.id === carried);
      setMissed(carried);
      setFeedback(
        `Not quite. ${wrong ? `"${wrong.name}"` : "That name"} does not belong on ${part.spoken}.`,
      );
      return;
    }
    setMissed(null);
    setRevealed(null);
    setFeedback(null);
    success();
    settle(part.id);
  }

  function reveal() {
    if (missed === null) {
      return;
    }
    setRevealed(missed);
    setMissed(null);
    setFeedback(null);
    settle(missed);
  }

  const revealedPart = parts.find((p) => p.id === revealed) ?? null;
  /** The part the reveal is speaking about: the one whose name was just misdropped. */
  const missedPart = parts.find((p) => p.id === missed) ?? null;

  return (
    <div className="lesson-interactive lesson-interactive--label">
      {/* The goal, above the figure and outside the status line, which is spent on feedback. */}
      <WidgetTask>{objective}</WidgetTask>

      <fieldset className="lesson-label__figure">
        <legend className="visually-hidden">{ariaLabel}</legend>
        {/* Statement, then terms, then group. The nesting IS the break policy, coarsest
            outermost: a line too narrow for the figure divides between statements, then
            between a statement's lead and its terms, then between two groups of terms —
            and never inside a group, which is what keeps a connector with its term. */}
        {statementsOf(lead, parts).map((statement) => (
          <span
            className="lesson-label__statement"
            key={statement.groups
              .flat()
              .map((p) => p.id)
              .join("+")}
          >
            {statement.lead ? (
              <span className="lesson-label__lead">
                <InlineMath latex={statement.lead} />
              </span>
            ) : null}
            <span className="lesson-label__terms">
              {statement.groups.map((group) => (
                <span
                  className="lesson-label__group"
                  key={group.map((p) => p.id).join("+")}
                >
                  {group.map((part) => {
                    const done = named[part.id] === true;
                    /** The slot the passage on screen is naming, so it shows that name. */
                    const given = fill.given && part.id === missed;
                    return (
                      <Fragment key={part.id}>
                        {part.before ? (
                          <span className="lesson-label__lead">
                            <InlineMath latex={part.before} />
                          </span>
                        ) : null}
                        <span
                          className="lesson-label__part"
                          data-raised={part.raised ? "yes" : "no"}
                        >
                          {/* The slot FIRST, in the DOM as on screen: it shares the line
                              the statement is read on, and the term it names sits under it.
                              Ordered here rather than with `column-reverse`, so what a
                              screen reader walks is what a sighted learner scans.

                              This is also the only receiving affordance in the figure.
                              Empty means unanswered; the dashed border and min size say so. */}
                          <button
                            type="button"
                            className="lesson-label__slot"
                            data-named={done ? "yes" : "no"}
                            data-over={over === part.id ? "yes" : "no"}
                            disabled={done}
                            aria-label={
                              given
                                ? `${part.spoken} was given the label ${part.name}, not answered`
                                : done
                                  ? `${part.spoken} is labelled ${part.name}`
                                  : `Label for ${part.spoken}`
                            }
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnter={() => setOver(part.id)}
                            onDragLeave={() =>
                              setOver((id) => (id === part.id ? null : id))
                            }
                            onDrop={() => dropOn(part)}
                            onClick={() => dropOn(part)}
                            {...fill.mark(given)}
                          >
                            {done || given ? part.name : null}
                          </button>
                          {/* The term, under the blank that names it. Plain maths, no
                              border: it is what is being named, not a place to put
                              anything, and must not look like one. */}
                          <span className="lesson-label__glyph">
                            <InlineMath latex={part.latex} color={done ? CIVIC : LABEL} />
                          </span>
                        </span>
                      </Fragment>
                    );
                  })}
                </span>
              ))}
            </span>
          </span>
        ))}
      </fieldset>

      <div className="lesson-sorter__tray">
        {/* Keyed on `solved`, not on an empty tray: a fill can take the last chip off it
            while the figure is still one name short of finished. */}
        {solved ? (
          <span className="lesson-sorter__tray-empty">Every part named</span>
        ) : (
          tray.map((part) => (
            <button
              key={part.id}
              type="button"
              className="lesson-sorter__chip"
              draggable
              aria-label={part.name}
              aria-pressed={pickup.held === part.id}
              // A CARRIED NAME IS NOT A PLACED ONE. `CIVIC` is what the term under a slot
              // turns once its name has been judged right, so a chip that goes green the
              // instant it is lifted says that about a name sitting on nothing.
              // `SIGNAL_DEEP` is the third hue `svgKit` reserves for a state off the
              // correctness channel.
              style={{
                color: LABEL,
                borderColor: pickup.held === part.id ? SIGNAL_DEEP : SOFT,
              }}
              onDragStart={() => pickup.hold(part.id)}
              onDragEnd={() => pickup.clear()}
              onClick={() => pickup.toggle(part.id)}
            >
              {part.name}
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
        available={missed !== null}
        revealed={revealedPart !== null}
        answer={missedPart === null ? null : `the ${missedPart.name}`}
        why={missedPart === null ? null : missedPart.why}
        onReveal={reveal}
        label="Reveal this part"
        // The missed part is one of the unnamed ones, so more than one of them means there
        // is another slot to fill after this one is explained.
        othersRemain={unnamed.length > 1}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealedPart !== null ? null : solved ? conclusion : (feedback ?? prompt)}
      </p>
    </div>
  );
}
