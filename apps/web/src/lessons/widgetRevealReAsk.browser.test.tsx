/**
 * "Reveal answer" teaches and then RE-ASKS, in every widget that offers it.
 *
 * The mechanic is shared, but the wiring is not: each widget lends the machine its own
 * redraw and its own gate. One widget that forgets to, or lends the wrong pair, goes back
 * to being a free pass through the slide, and nothing else on screen would say so. So this
 * runs the same five claims against EVERY registered visual whose widget offers a reveal,
 * rather than against one of them and a hope:
 *
 *   1. revealing prints the answer AND the reasoning behind it;
 *   2. it does not open the gate;
 *   3. it does not redraw either: the instance the passage explains stays put, frozen, and
 *      moves only on the learner's own click, which is then a different instance;
 *   4. revealing does not fire the success state, because nothing was answered;
 *   5. a SECOND reveal does open the gate, so the re-ask can never trap a learner.
 *
 * Getting the reveal on offer is the only per-widget part, and it is done by sweeping
 * rather than by scripting thirty-two solutions: the reveal appears after a wrong attempt,
 * a wrong attempt is available in every shape these widgets take, and the sweep stops the
 * moment one lands. The sweep never presses "start over" and never presses the reveal, and
 * the test fails loudly if a sweep ever finishes a widget instead of failing at it.
 */

import { afterEach, beforeEach, expect, test } from "vitest";
import { visualsMatching } from "./kindFamily";
import { playCorrectChime, setLessonSoundMuted } from "./lessonSound";
import {
  type AudioProbe,
  type Harness,
  hasText,
  installCountingAudio,
  mount,
  setInputValue,
  waitFor,
} from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

/**
 * The registered visuals whose widget renders `WidgetReveal` AND which this sweep runs a
 * contract against.
 *
 * Still hand-written, but no longer unguarded: the census at the bottom of this file derives
 * the whole reveal-offering population off the sources and requires this list, plus
 * `REVEAL_SWEEP_BLOCKED`, plus `NOT_YET_SWEPT`, to account for every one of them. A new
 * widget therefore cannot be quietly absent — it lands in the derived set, matches none of the
 * three, and fails the census.
 */
const REVEAL_VISUALS: readonly LessonVisualId[] = [
  // D1, where the mechanic was retrofitted onto the widgets that most needed it
  "identity-inverse-match",
  "unit-conversion-spot",
  "like-terms-classify",
  "fraction-divide-play",
  "signed-addition-walkthrough",
  "sign-rules-table",
  // And the five its 2026-08-04 authoring pass added, each a board that used to trap a learner
  // behind a free-text field with no option list to fall back on.
  "common-denominator-multiples",
  "distribute-builder",
  "like-terms-sorter",
  "percent-slider",
  "proportion-cross-play",
  // EXP.1 and EXP.2
  "power-parts-label",
  "exponent-laws-builder",
  "power-of-power-walkthrough",
  "power-of-power-match",
  "zero-exponent-table",
  "negative-exponent-estimate",
  "negative-exponent-play",
  "negative-exponent-order",
  "positive-exponent-solver",
  "unlike-base-spot",
  // RAD.1 and RAD.2
  "radical-parts-label",
  "perfect-root-classify",
  "perfect-square-factor-match",
  "radical-factor-builder",
  "simplify-radical-solver",
  "radical-quotient-sorter",
  "like-radicals-sorter",
  "unlike-sum-table",
  "combine-radicals-builder",
  "rationalize-solver",
  "rationalize-explore",
  // RAD.3
  "rational-exponent-play",
  "fraction-exponent-label",
  "fraction-exponent-undo-table",
  "radical-form-builder",
  "exponent-form-builder",
  "rational-power-solver",
  // RAD.4
  "magnitude-root-play",
  "sqrt-square-spot",
  "root-parity-builder",
  "variable-radicand-builder",
  "mixed-radicand-solver",
  // D5 and D7, which reach the mechanic through the shared interaction kinds
  "rational-simplify-order",
  "rational-numeric-twin-match",
  "rational-nested-flip-spot",
  "rational-end-behavior-table",
  "linear-slope-ratio-table",
  "linear-line-convert-order",
  "linear-model-claim-spot",
  // D7's six bespoke reveals, added by the authoring pass that wrote them. Five run the full
  // contract; the sixth is in `REVEAL_SWEEP_BLOCKED` below, with the failure it produces.
  "linear-slope-walkthrough",
  "linear-line-form-build",
  "linear-model-table-build",
  "linear-system-graph-explore",
  "linear-system-substitute-play",
  // D8 EL.1 and EL.3, whose eight widgets all offer a reveal
  "exp-growth-table",
  "exp-factor-slider",
  "exp-decay-classify",
  "exp-continuous-walkthrough",
  "log-question-explore",
  "log-form-match",
  "log-evaluate-stepper",
  "log-natural-spot",
  "exp-graph-play",
  "exp-shift-drag",
  "exp-transform-builder",
  "exp-feature-label",
  "log-mirror-explore",
  "log-domain-classify",
  "log-shift-slider",
  "log-domain-builder",
  "log-product-table",
  "log-expand-order",
  "log-condense-builder",
  "log-base-change-walkthrough",
  // D8 EL.6, whose four widgets all reach a reveal: the stepper and the walkthrough render one
  // in their own bodies, the match and the spot reach the kinds' reveals.
  "equation-same-base-stepper",
  "equation-take-log-walkthrough",
  "equation-gather-convert-match",
  "equation-extraneous-spot",
  // D6, forty-one of whose forty-four reveal-offering widgets run a contract here. The other
  // three are in `REVEAL_SWEEP_BLOCKED` below, each with the failure it currently produces.
  //
  // `rate-table` is the one that came back. It was excused as a limit of the sweep — a
  // deterministic option order that was correct all the way down the board — and the D9 pass
  // found four more tables reading the same way, which was enough to say the fault was in the
  // driver rather than in five boards. `poke` takes a one-slot tray from the far end now, and
  // this board fails nothing.
  "absvalue-evaluate-stepper",
  "absvalue-vee-build",
  "absvalue-vertex-slider",
  "absvalue-walkthrough",
  "rate-table",
  "rate-average-explore",
  "rate-interval-slider",
  "rate-walkthrough",
  "compose-build",
  "compose-evaluate-solver",
  "compose-order-spot",
  "compose-series-explore",
  "coordinate-distance-walkthrough",
  "coordinate-plot-stepper",
  "coordinate-intercept-builder",
  "coordinate-quadrant-classify",
  "quotient-build",
  "quotient-cancel-play",
  "quotient-order",
  "quotient-expand-walkthrough",
  "domain-intake-explore",
  "domain-restriction-classify",
  "domain-range-slider",
  "function-machine-solver",
  "function-notation-label",
  "function-vertical-line-slider",
  // Built on `BinaryRowSort`, so they take the REDUCED contract rather than the full one, and
  // they are listed HERE rather than excused: see `REVEAL_AFTER_COMPLETION`.
  "function-mapping-classify",
  "inverse-one-to-one-classify",
  "feature-extremum-spot",
  "feature-trace-walkthrough",
  "feature-interval-classify",
  "inverse-build",
  "inverse-reflect-explore",
  "inverse-reverse-play",
  "piecewise-boundary-play",
  "piecewise-graph-build",
  "piecewise-piece-classify",
  "transform-order",
  "transform-parity-classify",
  "transform-shift-slider",
  "transform-stretch-explore",
  // D9 (Trigonometry), all thirty-six. They were named by the census on the day the two lanes
  // merged and sat in `NOT_YET_SWEPT` for exactly one commit; this is the pass the census asked
  // for. Thirty-one are built on the shared interaction kinds, which already have a swept
  // non-Trig representative apiece, and five are bespoke.
  "trg-amplitude-slider",
  "trg-asymptote-table",
  "trg-bearing-table",
  "trg-cofunction-spot",
  "trg-combine-estimate",
  "trg-compose-sorter",
  "trg-convert-spot",
  "trg-coterminal-sorter",
  "trg-cycle-match",
  "trg-double-match",
  "trg-evenodd-sorter",
  "trg-feature-label",
  "trg-guywire-label",
  "trg-identity-spot",
  "trg-inverse-estimate",
  "trg-inverse-order",
  "trg-period-table",
  "trg-phase-drag",
  "trg-quadrant-sorter",
  "trg-radian-match",
  "trg-range-label",
  "trg-ratio-table",
  "trg-reciprocal-match",
  "trg-reference-order",
  "trg-reference-table",
  "trg-roster-spot",
  "trg-secant-sorter",
  "trg-shorten-order",
  "trg-six-table",
  "trg-solve-order",
  "trg-special-match",
  "trg-sum-table",
  "trg-sweep-play",
  "trg-tangent-explore",
  "trg-unitcircle-explore",
  "trg-window-sorter",
  // D4's Early Modern eight: POL.6's and POL.7's four each. All are thin wrappers over the
  // shared kinds, so the reveal, the success badge and the live `othersRemain` are the kinds'
  // and this sweep is running the archetypes' contract through each board's own content.
  "build-from-graph-order",
  "end-behavior-describe-order",
  "end-behavior-parity-sorter",
  "leading-term-dominance-table",
  "leading-term-match",
  "multiplicity-cross-sorter",
  "turning-points-estimate",
  "zeros-from-factors-table",
  // POL.5's four, from the Industrial era, on the same footing: thin wrappers over
  // `BinaryRowSort`, `FillTable`, `OrderSteps` and `MatchPairs`.
  "extreme-value-order",
  "intercept-route-match",
  "parabola-opening-sorter",
  "vertex-form-read-table",
];

/**
 * The reveal-offering visuals this sweep does NOT run a contract against, each with the
 * verbatim failure it produces when it is pointed at one.
 *
 * Being on this list is not an argument that the widget is fine. ALL THREE ARE DEFECTS, said
 * so in each entry rather than left to read alike, because an exemption that does not say
 * which it is will be read as the harmless one by whoever arrives next. This branch is an
 * accepted rough draft, so none of them is fixed here; they are findings for the pass that
 * owns these widgets.
 *
 * There used to be a fourth entry, `rate-table`, and it was the only one excused as a LIMIT OF
 * THE SWEEP rather than as a defect. D9 found four more boards reading the same way, which
 * turned one board's bad luck into a fault in the driver: `poke` now takes a one-slot tray
 * from the far end and that board runs the full contract with the rest. An exemption of that
 * kind is worth re-testing whenever a second instance of it turns up.
 *
 * The `fails` string is what makes the list provable rather than decorative. Each id is RUN
 * below, through the same contract every other id runs, and is required to still fail AT THAT
 * MESSAGE — so a widget that gets fixed fails this file until it is moved up into
 * `REVEAL_VISUALS`, and a widget that starts failing for a different reason cannot hide inside
 * an excuse written about the old one.
 */
const REVEAL_SWEEP_BLOCKED: Readonly<
  Record<string, { readonly why: string; readonly fails: string }>
> = {
  "domain-interval-build": {
    why:
      "WIDGET DEFECT. The board loses math across the reveal: the requirement `x - 5 \\ge 0` " +
      "the passage is explaining is gone from the board by the time the passage is on screen, " +
      "which is the redraw claim 3 exists to forbid. A learner reads an explanation of an " +
      "instance they can no longer see.",
    fails: "the reveal moved the numbers on its own",
  },
  "piecewise-evaluate-solver": {
    why:
      "WIDGET DEFECT, the same one: `x = 3` and both comparators leave the board when the " +
      "reveal opens, so the passage explains a piece the learner is no longer looking at.",
    fails: "the reveal moved the numbers on its own",
  },
  "feature-table": {
    why:
      "WIDGET DEFECT, and a different one. The board carries no typeset math at all at the " +
      "moment of the reveal, so claim 3 has nothing to measure and the sweep stops at its own " +
      "floor rather than at the widget. What is wrong is upstream of the reveal: a graph-" +
      "reading table whose features are untypeset is `lesson-katex`'s rule broken, and it is " +
      "why this one cannot be swept rather than a reason it need not be.",
    fails: "no math was measured, so the comparison below proves nothing",
  },
  "linear-slope-triangle-play": {
    why:
      "LIMIT OF THE SWEEP, not a widget defect, and the second instance of that kind since " +
      "`rate-table` — so it is owed a driver pass rather than a permanent excuse. The board's " +
      "only input is the DirectionPad, and `poke` presses chips, options, tray slots, typed " +
      "fields and `.lesson-interactive__check`, but never `.lesson-interactive__direction-key`. " +
      "It therefore cannot make the wrong attempt the reveal waits on, and stops at its own " +
      "floor. Teaching the driver those keys is a change to every domain's sweep — " +
      "`PiecewiseGraphBuild` and `CoordinateGridPlot` also mount them — so it does not belong " +
      "in a D7 authoring pass. The reveal itself is exercised by `revealReAsk.test.ts` and by " +
      "the variant-pool guard.",
    fails: "no wrong attempt put the reveal on offer",
  },
};

/**
 * The reveal-offering visuals from D3, D4 and D10 that no pass has swept yet.
 *
 * Not exemptions and not findings: they are the backlog this file's census would otherwise
 * hide. They are written down so that the census below can be an EQUALITY — the derived
 * population against everything this file has an opinion about — because a census that
 * subtracted an unnamed remainder would go on passing while the remainder grew.
 *
 * They are owed the same treatment D6 has just had: run them, and each one either joins
 * `REVEAL_VISUALS` or arrives in `REVEAL_SWEEP_BLOCKED` with its verbatim failure. Nobody has
 * done that, so nothing here is claimed to pass, and nothing here is claimed to fail.
 *
 * D9's thirty-six used to be here, and their whole stay is the census earning its keep. This
 * file was rewritten around a derived population in the D6 branch at the same time as D9's
 * thirty-six widgets landed on `integration`, so the two never touched the same line and the
 * merge was clean — a census that subtracted an unnamed remainder, or a floor on the swept
 * list, would both have been green. The equality named all thirty-six on the first run instead,
 * and they have since been swept and moved up into `REVEAL_VISUALS`.
 */
const NOT_YET_SWEPT: readonly LessonVisualId[] = [
  // D3
  "abs-band-table",
  "abs-branch-builder",
  "abs-branch-spot",
  "abs-count-classify",
  "abs-inequality-order",
  "abs-union-builder",
  "balance-beam-slider",
  "both-pans-builder",
  "compound-band-sorter",
  "formula-check-play",
  "formula-isolate-builder",
  "formula-parts-label",
  "formula-subject-table",
  "formula-target-match",
  "inequality-endpoint-drag",
  "interval-parts-label",
  "interval-write-builder",
  "negative-flip-play",
  "solve-slip-spot",
  "solve-steps-order",
  "tolerance-pass-sorter",
  // D4
  "area-model-table",
  "common-measure-classify",
  "complete-square-drag",
  "complete-square-solver",
  "complete-square-table",
  "difference-squares-drag",
  "discriminant-sorter",
  "divide-rebuild-builder",
  "division-check-table",
  "factor-pairs-match",
  "factor-pair-stepper",
  "grouping-order",
  "long-division-stepper",
  "lost-root-spot",
  "off-standard-stepper",
  "perfect-square-sorter",
  "polynomial-parts-label",
  "remainder-estimate",
  "solve-quadratic-order",
  "square-side-solver",
  "standard-form-builder",
  "stone-pieces-sorter",
  "subtract-sign-spot",
  "synthetic-long-match",
  "zero-product-play",
  // D10
  "geo-angle-explore",
  "geo-cistern-play",
  "geo-compose-builder",
  "geo-cord-table",
  "geo-diagonal-stepper",
  "geo-net-drag",
  "geo-paving-classify",
  "geo-shadow-slider",
];

/** Values no widget accepts, so filling a box with one is always a wrong attempt. */
const WRONG_NUMBER = "-9999";
const WRONG_TEXT = "zzz";

/**
 * A walkthrough's toggling transport. Pressing these gets no closer to the question the
 * widget ends on, and a sweep that kept pressing Play would spend every other move on the
 * Pause it turns into. "Step" is deliberately not here: it is how the question is reached.
 *
 * "Sweep" is `TrigSweepPlay`'s Play, and its own label says so — the button reads "Sweep"
 * stopped and "Pause" running, off one `playing` flag. Left out of this set it cost that board
 * the whole contract: the sweep pressed it, the animation locked the Step button for seconds
 * the driver does not wait, and every later move found nothing live to press.
 */
const TRANSPORT = new Set(["Play", "Pause", "Replay", "Sweep"]);

let h: Harness | null = null;
let audio: AudioProbe | null = null;

beforeEach(() => {
  audio = installCountingAudio();
  setLessonSoundMuted(false);
});

afterEach(() => {
  h?.cleanup();
  h = null;
  audio?.restore();
  audio = null;
  setLessonSoundMuted(false);
});

/**
 * The baseline a "revealing stayed silent" claim is measured against, with the audible path
 * PROVEN LIVE first. Returns the count standing once it has been.
 *
 * `expect(oscillators()).toBe(tonesBefore)` is satisfied by a counter that never moves at all,
 * and that is not a hypothetical: a muted preference, an unopened gesture gate or an absent
 * `AudioContext` each hold it at zero for the whole test, and the claim then passes while
 * distinguishing nothing. "The right number of tones played" and "no audio exists here" are the
 * same reading.
 *
 * The floor cannot be "the counter has already moved", which is what the post-completion branch
 * below uses: measured across this sweep, 39 of the 43 widgets read ZERO at their first reveal
 * and 36 read zero at their second, because the sweep reaches a reveal on wrong attempts alone
 * and a wrong attempt is exactly the thing that makes no sound. There is no tone in their
 * history to floor anything on.
 *
 * So the tone is fired DELIBERATELY, down the same `playCorrectChime` the success state uses,
 * and the counter has to move for it. That proves the whole audible path at the moment of the
 * claim - preference, gesture gate, context, counter - and it proves it for the path the widget
 * would have used, not for a stand-in. The baseline is read AFTER the probe, so what the reveal
 * is compared against is still the count standing when it was clicked.
 */
function armedToneCount(id: LessonVisualId, when: string): number {
  const before = audio?.oscillators() ?? 0;
  playCorrectChime();
  const armed = audio?.oscillators() ?? 0;
  expect(
    armed,
    `${id}: firing the chime by hand moved no counter, so the ${when} silence check proves nothing`,
  ).toBeGreaterThan(before);
  return armed;
}

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function live(root: ParentNode, selector: string): HTMLButtonElement[] {
  return all<HTMLButtonElement>(root, selector).filter((b) => !b.disabled);
}

function widget(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    throw new Error("no widget mounted");
  }
  return found;
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

function reAskButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button");
}

/** The wrapper the host freezes while a reveal is being read. */
function stage(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-feedback-host__stage");
  if (found === null) {
    throw new Error("no feedback stage mounted");
  }
  return found;
}

/**
 * What the learner can see of the instance in front of them: every piece of typeset math
 * and every accessible name. Two instances of the same widget on different numbers cannot
 * share one, which is what makes it the honest test of "this is a different question".
 */
function instance(host: HTMLElement): string {
  const board = widget(host);
  const latex = all(board, "[data-latex]").map((n) => n.getAttribute("data-latex") ?? "");
  const names = all(board, "[aria-label]").map((n) => n.getAttribute("aria-label") ?? "");
  return [...latex, ...names].join("|");
}

/**
 * Every piece of typeset math on the board, which is where the instance's NUMBERS live.
 *
 * This is what "the question did not move" is asserted on rather than the whole fingerprint
 * above, because a reveal now fills the blank in with the answer and says so in the blank's
 * accessible name. That is a real change to the board and it is the point: the old fingerprint
 * would have to be identical for the fill not to exist. What must still hold is that nothing
 * was REPLACED. A redraw deals a different parameter set, so the operands it was drawn on
 * disappear; a fill only adds the answer, or moves a chip from the tray into the slot.
 *
 * The ACCESSIBLE NAMES are the half that is given up, and the cost is real: name churn across
 * a reveal is unobserved here. It is given up rather than worked around because every way of
 * keeping it needs to know which blank the fill was about, and the fill only says that AFTER
 * the click that would have to have been measured before it. Measured, on all 38:
 *
 *  - Thirteen widgets lose a name to the fill. `data-reveal-given` marks the blanks the fill
 *    wrote into, so excluding marked elements sounds like the answer, but it cannot be: the
 *    exclusion has to apply to both measurements, and before the click nothing is marked, so
 *    the blank's OLD name is in the before-set with nothing to exclude it.
 *  - Keeping element identity fixes those thirteen and still fails five — the three label and
 *    two order shapes — because their fill takes the answer's chip OFF THE TRAY (`LabelParts`,
 *    the `tray` filter). The name that vanishes belongs to an element that no longer exists,
 *    so no attribute on it can excuse it.
 *  - And identity is the wrong instrument anyway: a redraw remounts the body on a new nonce
 *    and replaces every element, so any exclusion keyed on "the elements that survived" is
 *    vacuous against exactly the defect this file exists to catch.
 */
function boardMath(host: HTMLElement): string[] {
  return all(widget(host), "[data-latex]").map((n) => n.getAttribute("data-latex") ?? "");
}

/**
 * Which of `before`'s nodes the board can no longer account for. Empty is the pass.
 *
 * This is MULTISET containment, and it is deliberately not `expect.arrayContaining`, which
 * the comment above used to be asserted with. That matcher ignores multiplicity as well as
 * order and is satisfied by a SHORTER array than the one it is given, so a board could drop
 * one of two identical nodes, or shrink outright, and still be "containing" the set measured
 * before it. "Nothing was REPLACED" is this: every node counted before is still counted, as
 * many times as it was counted.
 *
 * Sound against the fill because the fill is purely ADDITIVE to this surface. Measured
 * across all 38 widgets: two of them, the fill-table pair, gain exactly one node (the value
 * written into the open row), and the other 36 gain nothing at all. No widget loses one.
 */
function nodesLost(after: readonly string[], before: readonly string[]): string[] {
  const remaining = [...after];
  const lost: string[] = [];
  for (const node of before) {
    const at = remaining.indexOf(node);
    if (at === -1) {
      lost.push(node);
    } else {
      remaining.splice(at, 1);
    }
  }
  return lost;
}

/**
 * One move, chosen from what the widget is currently showing. Answering boxes wrongly is
 * tried first because it is the only shape where a wrong move is certain; the rest sweep,
 * with `step` walking the choices.
 *
 * Three of the moves below were rewritten for D9's thirty-six, which caught the driver
 * ANSWERING nine boards correctly instead of failing at them. Each rewrite is a claim about
 * where a wrong move certainly is, not about where one probably is:
 *
 *  - A tray with ONE slot open is taken from the far end. That case has no combinations to
 *    cover, so the walk advanced a chip per move against a table advancing a row per correct
 *    drop, and a tray listing its answers in row order kept the two in lockstep the whole way
 *    down. Four D9 tables list them exactly that way.
 *  - A worked solution is flagged from the TOP, which is the only tap here that is certainly
 *    wrong: the first line is the problem as it was given, and the board asks whether each
 *    line follows from the one above it, so the line with nothing above it cannot be the flaw.
 *  - A board that collects a choice and then asks for it to be SUBMITTED gets its commit
 *    button pressed on every other move, because the choice alone leaves the widget nothing
 *    to reject.
 */
function poke(host: HTMLElement, step: number): void {
  const board = widget(host);
  const checks = () => live(board, ".lesson-interactive__check");

  const boxes = all<HTMLInputElement>(board, "input:not([type='range'])").filter(
    (box) => !box.disabled,
  );
  if (boxes.length > 0) {
    for (const box of boxes) {
      // A numeric box asks for the wrong NUMBER rather than the wrong alphabet, so what the
      // board rejects is the answer and not the entry. The lesson boxes are all plain text
      // now that the spinner arrows have gone, so `inputMode` is what still names them.
      const numeric = box.inputMode === "numeric" || box.inputMode === "decimal";
      setInputValue(box, numeric ? WRONG_NUMBER : WRONG_TEXT);
    }
    const check = checks()[0];
    if (check) {
      check.click();
      return;
    }
  }

  // A dial parked at one end of its scale. The commit button often appears only once the
  // dial has been moved, so it is looked for again afterwards.
  const dials = all<HTMLInputElement>(board, "input[type='range']").filter(
    (dial) => !dial.disabled,
  );
  const dial = dials[0];
  if (dial) {
    setInputValue(dial, step % 2 === 0 ? dial.min : dial.max);
    const check = checks()[0];
    if (check) {
      check.click();
      return;
    }
  }

  // One-tap calls: a wrong one is always among them, because every one of these widgets
  // offers the misconception it exists to correct.
  const options = live(
    board,
    ".lesson-interactive__step, .lesson-interactive__chip, .lesson-spot__line-button",
  ).filter((button) => !TRANSPORT.has((button.textContent ?? "").trim()));
  if (options.length > 0) {
    // The answer is a chip AND a dragged position on `TrigPhaseDrag` and
    // `TrigUnitCircleExplore`. The drag is beyond this sweep, but the press of Check is not,
    // and without it neither widget was ever handed an attempt it could turn down: the sweep
    // spent forty moves toggling between two direction chips on a board that had asked a
    // question and been given no answer.
    const commit = checks()[0];
    if (commit && step % 2 === 1) {
      commit.click();
      return;
    }
    // The lines of a worked solution, taken from the top. Taken from the end, the tap FINDS
    // the flaw on the four boards that put it last, and the wrong move then has to come from
    // the corrections — where `TrigIdentitySpot` and `TrigRosterSpot` between them keep the
    // right correction at all three positions, so no walk over that list is wrong on every
    // board. Flagging the first line is wrong on every board there is.
    const lines = options.filter((tap) =>
      tap.classList.contains("lesson-spot__line-button"),
    );
    if (lines[0]) {
      lines[0].click();
      return;
    }
    // Counted in PICKS rather than in moves, so a board that spends every other move on its
    // commit button still walks its choices one at a time instead of every second one.
    const taken = commit ? Math.floor(step / 2) : step;
    const pick = options.length - 1 - (taken % options.length);
    (options[pick] as HTMLButtonElement).click();
    return;
  }

  // Two columns to join. The right column is dealt in an order that is never the left
  // one's, so the first live item on each side must disagree before the board runs out,
  // and that disagreement is the wrong join.
  const sides = all<HTMLElement>(board, ".lesson-match__side");
  if (sides.length === 2) {
    live(sides[0] as HTMLElement, "button")[0]?.click();
    live(sides[1] as HTMLElement, "button")[0]?.click();
    return;
  }

  // Carry something to a target that is not its own. Which pairs are wrong is not
  // knowable from the DOM, so `step` walks every combination of the two rows; at most one
  // target per source is the right one, so a wrong drop lands within the first few.
  //
  // That reasoning needs two targets to bite. A fill table opens ONE slot at a time, so the
  // only freedom left is which chip, and the walk then advanced a chip per move against a
  // table advancing a row per correct drop — the lockstep the docstring above describes. Such
  // a tray is taken from the far end instead, which is where a board that lists its answers
  // in row order parks the values that answer no row at all.
  const sources = live(board, ".lesson-sorter__chip");
  const targets = live(
    board,
    ".lesson-sorter__bin, .lesson-table__slot, .lesson-label__slot, [data-drop-slot]",
  );
  const width = Math.max(targets.length, 1);
  const reach = Math.floor(step / width) % Math.max(sources.length, 1);
  const source = sources[targets.length === 1 ? sources.length - 1 - reach : reach];
  if (source) {
    source.click();
    targets[step % width]?.click();
    return;
  }

  // Nothing left to answer on this round: take the widget on to the next one.
  checks()[0]?.click();
}

/** Sweep until the reveal is on offer. Throws rather than silently proving nothing. */
async function untilRevealOffered(
  host: HTMLElement,
  id: LessonVisualId,
  gateOpened: () => boolean,
): Promise<HTMLButtonElement> {
  for (let step = 0; step < 40; step += 1) {
    const button = revealButton(host);
    if (button !== null) {
      return button;
    }
    if (gateOpened()) {
      throw new Error(`${id}: the sweep finished the widget instead of failing at it`);
    }
    poke(host, step);
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`${id}: no wrong attempt put the reveal on offer`);
}

/**
 * The boards on which THIS SWEEP reaches a reveal only after every part has been called.
 *
 * On both of them the gate is open by the time the sweep can take a reveal, and it was opened
 * by the learner ANSWERING every part — see `widgetMissedBoardGate.browser.test.tsx`, which is
 * where that rule lives. So claims 2, 3 and 5 have no gate left to be about: there is nothing
 * for a reveal to be a shortcut past, and nothing that could trap a learner on the slide.
 *
 * WHY that is so differs between the two, and the difference matters because only one of them
 * is a property of the widget:
 *
 *  - `perfect-root-classify` (RAD.1) is structural. `BinaryRowSort` renders `WidgetReveal`
 *    inside `{complete && …}`, so there is no state in which its reveal exists beside an
 *    unanswered row. Nothing a sweep does can reach one.
 *  - `rationalize-explore` (RAD.2) is NOT. Its reveal is `available={stuck !== null && …}`, so
 *    it comes on offer the moment ANY pair is missed, with the other two still open — a
 *    learner who misses the first pair meets the ordinary shut-gate reveal, which is
 *    `widgetRevealResume.browser.test.tsx`'s third case. What lands it after completion HERE is
 *    `poke`'s deterministic option order: it takes the last chip of the live list each time, so
 *    on board 1 it calls pair 3 correctly, then pair 2 correctly, and misses pair 1 last.
 *
 * The list is still the right mechanism for both, because what it selects is which claims this
 * file can make about the run it actually performs. It is keyed off an explicit list rather
 * than off "did the gate happen to be open", which would silently absolve any widget that
 * regressed into opening it. But it is a fact about the SWEEP for RAD.2 rather than about the
 * widget, so a change to `poke` could move that board out of this branch and would then have to
 * be met by the full contract rather than by the reduced one.
 *
 * They are NOT dropped from the sweep. `revealAfterTheGate` below runs the claims that still
 * mean something here — the passage teaches, it stays silent, and the gate it did not open was
 * open before it.
 *
 * D6's two `BinaryRowSort` boards join on the FIRST of those two grounds, which is the
 * structural one: they inherit the very `{complete && …}` this note describes, so no sweep and
 * no learner can reach a reveal beside an unanswered row on them either. They are here rather
 * than in `REVEAL_SWEEP_BLOCKED` because that distinction is the whole point of that list —
 * "the full contract is not a thing this shape can exhibit" is a different claim from "this
 * widget owes the contract and fails it", and a shared kind already carrying a member here is
 * the clearest case of the first there is.
 *
 * D9's six `BinaryRowSort` boards join on that same structural ground, and on nothing weaker:
 * the `{complete && …}` is one line in the kind they all render, so the reveal cannot exist
 * beside an unanswered row on any of the nine boards built on it. Every one of the six failed
 * the full contract at `the gate opened before the reveal was used`, which is that line
 * speaking, and none of them failed at a claim about the reveal itself.
 */
const REVEAL_AFTER_COMPLETION: ReadonlySet<LessonVisualId> = new Set([
  "perfect-root-classify",
  "rationalize-explore",
  "function-mapping-classify",
  "inverse-one-to-one-classify",
  // D9's six, all `BinaryRowSort`.
  "trg-compose-sorter",
  "trg-coterminal-sorter",
  "trg-evenodd-sorter",
  "trg-quadrant-sorter",
  "trg-secant-sorter",
  "trg-window-sorter",
  // D4's Early Modern pair and POL.5's board, also `BinaryRowSort`. The kind decides this rather
  // than the board: it offers its one reveal once every row has been called, so the gate is the
  // learner's clean board and never the reveal.
  "end-behavior-parity-sorter",
  "multiplicity-cross-sorter",
  "parabola-opening-sorter",
]);

/**
 * The reduced contract for a post-completion reveal: it teaches, it is silent, and the gate
 * it is offered beside was opened by the learner rather than by it.
 */
async function revealAfterTheGate(
  host: HTMLElement,
  id: LessonVisualId,
  offer: HTMLButtonElement,
  completedNow: () => number,
): Promise<void> {
  expect(
    completedNow(),
    `${id}: this board's reveal is meant to be offered only after every part is called, so the gate should already be open`,
  ).toBe(1);

  // The floor under the silence claim below. "The count did not move" is satisfied by a
  // counter that never moves at all, which is what a muted probe or an unarmed audio context
  // would produce; getting here took three correct calls, so the counter has to have moved
  // already for the comparison across the click to be measuring anything.
  //
  // This branch PREFERS an observed count to the probe `armedToneCount` fires, because it
  // claims more: tones the widget itself played say the success path this reveal must stay off
  // actually works on this board.
  //
  // It cannot REQUIRE one. Reaching a post-completion reveal takes a wrong call, and on
  // `trg-quadrant-sorter` the sweep's walk gets every row wrong, which is a better sweep and
  // an empty tone counter at once — nothing correct was ever called, so the widget had no
  // reason to make a sound. Where that happens the floor falls back to the armed probe, which
  // is the same floor the other 140 contracts in this file stand on: it fires the chime down
  // the widget's own `playCorrectChime` and fails unless the counter moves, so a muted
  // preference, a shut gesture gate or an absent context still cannot pass the silence check
  // below by keeping the counter at zero.
  const sounded = audio?.oscillators() ?? 0;
  const tonesBefore =
    sounded > 0 ? sounded : armedToneCount(id, "post-completion reveal's");
  offer.click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    `${id}: the reveal passage opens`,
  );
  const passage = host.querySelector(".lesson-interactive__reveal") as HTMLElement;
  expect(hasText(passage, "Answer revealed."), `${id}: the answer is stated`).toBe(true);
  expect(hasText(passage, "The answer is"), `${id}: the answer is named in words`).toBe(
    true,
  );
  expect(passage.textContent?.length ?? 0, `${id}: the reasoning is there`).toBeGreaterThan(
    100,
  );
  // Revealing is not answering, here least of all: the learner has already been let through,
  // so a success tone would be celebrating the one part they got wrong.
  expect(audio?.oscillators(), `${id}: revealing stayed silent`).toBe(tonesBefore);
  expect(completedNow(), `${id}: the reveal opened the gate a second time`).toBe(1);
}

/**
 * The five claims, as one callable.
 *
 * It is a function rather than a test body so that the widgets which FAIL it can be run
 * through exactly this code instead of through a description of it. An excuse checked against
 * a paraphrase of the sweep is an excuse that stops tracking the sweep the first time the
 * sweep changes, and would then be excusing a failure nothing produces any more.
 */
async function revealContract(id: LessonVisualId): Promise<void> {
  let completed = 0;
  h = mount(
    <LessonVisual
      id={id}
      onComplete={() => {
        completed += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  const first = instance(host);

  if (REVEAL_AFTER_COMPLETION.has(id)) {
    const late = await untilRevealOffered(host, id, () => false);
    await revealAfterTheGate(host, id, late, () => completed);
    return;
  }

  const offer = await untilRevealOffered(host, id, () => completed > 0);
  expect(completed, `${id}: the gate opened before the reveal was used`).toBe(0);

  // Revealing is not answering, so nothing about it may sound like an answer. The counter is
  // armed first, because on 39 of these 43 boards nothing has made a sound yet and a silence
  // claim measured against a dead counter is no claim at all.
  const tonesBefore = armedToneCount(id, "first reveal's");
  // Read the board as it stands at the moment of the click, not as it stood at mount:
  // the sweep's own wrong attempts have moved it since, and comparing against the mount
  // would let a redraw hide inside the learner's own progress.
  const beforeReveal = instance(host);
  const mathBefore = boardMath(host);
  offer.click();

  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    `${id}: the reveal passage opens`,
  );
  const passage = host.querySelector(".lesson-interactive__reveal") as HTMLElement;
  expect(hasText(passage, "Answer revealed."), `${id}: the answer is stated`).toBe(true);
  // The answer is SAID as well as filled into the blank below. The fill is a visual
  // signal and nothing else, so dropping this sentence would leave a learner who cannot
  // perceive it with a passage of reasoning about an answer it never names.
  expect(hasText(passage, "The answer is"), `${id}: the answer is named in words`).toBe(
    true,
  );
  // What is owed is said by the control, once. The passage used to end "Ready for one
  // like it?" immediately above a button that says the same thing.
  expect(
    hasText(passage, "Ready for one like it?"),
    `${id}: the passage narrates the button below it`,
  ).toBe(false);
  // An answer with no reasoning behind it is a failed reveal, and a `why` that came
  // through empty is exactly what a short passage looks like.
  expect(passage.textContent?.length ?? 0, `${id}: the reasoning is there`).toBeGreaterThan(
    100,
  );

  expect(audio?.oscillators(), `${id}: revealing stayed silent`).toBe(tonesBefore);
  expect(
    host.querySelector(".lesson-feedback-announce")?.textContent,
    `${id}: revealing did not announce a correct answer`,
  ).toContain("Answer revealed");

  // The gate stays shut, and so do the numbers: the passage is an explanation of the
  // instance still on screen, and a redraw here is what used to put a correct
  // explanation of one problem above a different one.
  expect(completed, `${id}: the first reveal opened the gate`).toBe(0);
  // An empty measurement contains nothing and so is contained by anything, which is a
  // pass that proves the opposite of what it looks like: it is what a widget that stopped
  // emitting `data-latex`, or a selector that drifted off the board, would produce. The
  // floor is 1 because one is real: `rational-exponent-play` shows a single expression at
  // this point, and the widest boards in the sweep show dozens.
  expect(
    mathBefore.length,
    `${id}: no math was measured, so the comparison below proves nothing`,
  ).toBeGreaterThan(0);
  expect(
    nodesLost(boardMath(host), mathBefore),
    `${id}: the reveal moved the numbers on its own`,
  ).toEqual([]);

  // The spent instance is frozen rather than merely stale. Left live it would take the
  // revealed answer typed back into it, and on a widget's last round that latches the
  // gate: the re-ask would be offered rather than required.
  expect(stage(host).hasAttribute("inert"), `${id}: the spent instance is frozen`).toBe(
    true,
  );
  // And the reveal stands down, so the second reveal cannot be spent on this instance.
  expect(revealButton(host), `${id}: a second reveal is still on offer`).toBeNull();
  // Focus is on the teaching, which is the only thing there is to do next.
  expect(document.activeElement, `${id}: focus landed on the teaching`).toBe(passage);

  // Only the learner's own click moves the numbers, and then it is a different question.
  const reAsk = reAskButton(host);
  expect(reAsk, `${id}: no control offers the re-ask that is owed`).not.toBeNull();
  (reAsk as HTMLButtonElement).click();
  // WAIT FOR THE PASSAGE TO GO before reading the board, and read it once when it has.
  //
  // Reading it any earlier does not measure the re-ask at all. `instance()` fingerprints
  // every `data-latex` AND every `aria-label`, and the reveal's fill has already written
  // the answer into the blank and renamed it, so on the boards that carry a fill both
  // inequalities below already hold the moment the reveal paints. `waitFor` then returns on
  // its first poll, having confirmed nothing about what the click did. Measured at
  // `3638629` rather than argued, by two runs of the sweep exactly as it shipped:
  //
  //  - evaluating the predicate immediately BEFORE this click finds it already true on 28
  //    of the 63 boards that run this contract;
  //  - injecting the defect it exists to catch -- a re-ask that dismisses the passage and
  //    deals the SAME question, i.e. `takeTheReAsk` without its `binding.reAsk()` -- leaves
  //    exactly those 28 GREEN (35 failed, 31 passed, the other 3 being the two
  //    `REVEAL_AFTER_COMPLETION` boards and the count test below).
  //
  // The wait is taken on EVERY board and not just the ones measured hollow, because what
  // makes a board hollow is carrying a reveal-fill, which is a fact about the board rather
  // than about where its fill is implemented. 26 of those 28 are built on a shared `kinds/`
  // archetype and the other two, `exp-shift-drag` and `log-condense-builder`, are bespoke
  // widgets with their own copy of the mechanic. Narrowing this to the shared layer would
  // therefore have missed two boards on the day it was written, and would go on missing the
  // next bespoke widget to grow a fill.
  //
  // The passage is what separates the two readings, because it is not merely a signal that
  // the click landed: `takeTheReAsk` clears the passage, and the fill and the freeze both
  // hang off that same state, so React commits the passage removal, the fill clear and the
  // widget's redraw together. Once `.lesson-interactive__reveal` is gone the fill is gone
  // with it, and a board that was NOT redrawn has therefore gone back to reading exactly
  // `beforeReveal` -- which is the whole point, since that is the reading that fails.
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") === null,
    `${id}: taking the re-ask clears the passage`,
  );
  await waitFor(() => {
    // Once, into a local: the predicate used to call `instance()` twice, so its two halves
    // could be answered by two different renders.
    const dealt = instance(host);
    return dealt !== beforeReveal && dealt !== first;
  }, `${id}: the click dealt a fresh instance`);
  expect(
    stage(host).hasAttribute("inert"),
    `${id}: the fresh instance is still frozen`,
  ).toBe(false);
  expect(completed, `${id}: taking the re-ask opened the gate`).toBe(0);

  // Focus follows the redraw, so a learner who cannot see it is not left nowhere.
  expect(
    widget(host).contains(document.activeElement),
    `${id}: focus landed on the fresh instance`,
  ).toBe(true);

  // Still stuck. The second reveal has to let them through, whatever the widget: a
  // learner sent round twice is a learner trapped on the slide.
  const second = await untilRevealOffered(host, id, () => completed > 0);
  const tonesBeforeSecond = armedToneCount(id, "second reveal's");
  second.click();

  await waitFor(() => completed === 1, `${id}: the second reveal opens the gate`);
  expect(audio?.oscillators(), `${id}: the second reveal stayed silent too`).toBe(
    tonesBeforeSecond,
  );
  const passed = host.querySelector(".lesson-interactive__reveal") as HTMLElement;
  expect(hasText(passed, "Answer revealed."), `${id}: the answer is stated again`).toBe(
    true,
  );
  expect(
    hasText(passed, "The answer is"),
    `${id}: the second reveal names the answer too`,
  ).toBe(true);
  // What separates the two reveals is no longer anything in the PASSAGE, which now reads
  // the same either way: it is the controls and the freeze, asserted just below.
  // Nothing is owed, so nothing is frozen and no re-ask control is left behind.
  expect(reAskButton(host), `${id}: the gate opened with a re-ask still owed`).toBeNull();
  expect(
    stage(host).hasAttribute("inert"),
    `${id}: the widget is frozen with the gate open`,
  ).toBe(false);
}

test.each(REVEAL_VISUALS)(
  "%s: the reveal teaches, re-asks, and only lets the learner past the second time",
  async (id) => {
    await revealContract(id);
  },
);

/**
 * The other direction on `REVEAL_SWEEP_BLOCKED`, and what makes it an exemption rather than an
 * omission with a comment over it.
 *
 * A widget that gets fixed stops throwing and fails HERE, so it cannot sit in the list being
 * excused for a defect it no longer has; and one that breaks somewhere else stops matching its
 * recorded message, so a stale excuse cannot go on covering a new failure. Both are the same
 * assertion, which is why it is written against the message and not against the fact of a
 * throw.
 */
test.each(Object.entries(REVEAL_SWEEP_BLOCKED))(
  "%s is excused from the contract, and still fails at the message it is excused by",
  async (id, { fails }) => {
    await expect(revealContract(id as LessonVisualId)).rejects.toThrow(fails);
  },
);

/**
 * The census: every reveal-offering visual in the tree is one this file has an opinion about.
 *
 * This replaces a count that counted the list against itself. `expect(REVEAL_VISUALS.length)
 * .toBe(69)` was green on a list missing ninety-eight ids, because the number and the thing it
 * described were the same object — the shape of `#191`, where three widgets joined a kind and
 * the guard went on asserting two. The comment above it correctly said the count proved
 * nothing about completeness and named `kindFamily.ts` as the derivation it was waiting on.
 * That file is here now, and `visualsMatching` is the second step it said was missing, so the
 * wait is over rather than still being recorded.
 *
 * `visualsMatching(/<WidgetReveal/)` is one filter over the widget sources, resolved through
 * the registry, and it covers both shapes the population takes: a widget rendering the
 * component in its own body, and a widget built on one of the `kinds/` archetypes that render
 * it. `widgetsMatching` pulls a matching kind's whole family in, which is why the second shape
 * needs no separate step here.
 *
 * An equality and not a subset. A subset would let the derived set grow past the three lists
 * without complaint, which is the exact failure being fixed; the equality means the next
 * domain to land fails this test on the day it lands, with the unaccounted ids named.
 */
test("every reveal-offering visual is swept, declared, or named as backlog", () => {
  const derived = visualsMatching(/<WidgetReveal/);
  // The floor. `import.meta.glob` resolving to nothing, or the registry regex drifting off the
  // entry shape, would hand back an empty population — and an equality between two empty sets
  // is the greenest possible way to measure nothing at all.
  expect(derived.length, "no reveal-offering widget was derived at all").toBeGreaterThan(
    100,
  );

  // Distinctness first, and on each list: a duplicated id would run one widget twice and read
  // as two widgets covered, and the set arithmetic below would not notice.
  expect(new Set(derived).size, "the derivation returned a duplicate id").toBe(
    derived.length,
  );
  expect(new Set(REVEAL_VISUALS).size).toBe(REVEAL_VISUALS.length);
  expect(new Set(NOT_YET_SWEPT).size).toBe(NOT_YET_SWEPT.length);

  const blocked = Object.keys(REVEAL_SWEEP_BLOCKED);
  const claimed = [...REVEAL_VISUALS, ...blocked, ...NOT_YET_SWEPT];
  // Nothing is claimed twice. Without this the equality below could be satisfied by an id
  // sitting in two lists while another is missing entirely.
  expect(new Set(claimed).size, "an id is claimed by two lists at once").toBe(
    claimed.length,
  );

  const derivedSet = new Set<string>(derived);
  expect(
    claimed.filter((id) => !derivedSet.has(id)).sort(),
    "these ids are listed here but no longer offer a reveal, so they must leave",
  ).toEqual([]);
  const claimedSet = new Set<string>(claimed);
  expect(
    derived.filter((id) => !claimedSet.has(id)).sort(),
    "these widgets offer a reveal and this file says nothing about them",
  ).toEqual([]);

  // Floors under the two lists that are NOT the swept one, so neither can grow until it has
  // swallowed the population while the equality above still holds. The swept list needs no
  // such floor: it is what everything else is measured against, and it has the sweep itself.
  expect(blocked.length, "the excused list has outgrown a handful").toBeLessThan(10);
  expect(
    REVEAL_VISUALS.length,
    "most of the population is no longer actually swept",
  ).toBeGreaterThan(derived.length / 2);
});
