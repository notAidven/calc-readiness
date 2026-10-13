/**
 * Every widget's variant pool holds at least two entries, and no two of them draw the same
 * board.
 *
 * This is the PRECONDITION the reveal guard's power rests on, and nothing asserted it.
 *
 * `widgetRevealReAsk.browser.test.tsx` and `revealFirstInstance.browser.test.tsx` claim that
 * revealing an answer does not redraw the question underneath it, which is a real defect that
 * shipped: a correct explanation of one problem, sitting above a different one. They can only
 * see a redraw that MOVES THE BOARD, though, and how much of one they see depends entirely on
 * the parameter set the redraw lands on. Measured against a redraw forced to redeal the SAME
 * parameters, they catch 7 of 38 widgets, and fifteen of them — every label, order and
 * fill-table shape — see nothing at all, because the tray holds every chip at mount, progress
 * moves chips out of it, and a remount puts them all back: the redrawn board is a strict
 * SUPERSET of the one measured before it, so no containment check can fail.
 *
 * A same-parameter redraw is unreachable today, which is why that costs nothing. But it is
 * unreachable for one reason and one reason only: `useWidgetVariants`'s restart is a strict
 * `(index + 1) % count`, so the next parameter set is never the current one — PROVIDED the
 * pool has at least two entries and they are not copies of each other. Cut a pool to one
 * entry, or let a duplicate in, and every restart is a same-parameter redraw. The reveal
 * guard would then go on passing while guarding nothing, on fifteen widgets, with nothing on
 * screen or in the suite to say so.
 *
 * So the precondition is asserted here, directly, and a pool that breaks it fails HERE rather
 * than silently disarming a guard two files away.
 *
 * It is also the older half of the same claim: `widgetVariants.browser.test.tsx` drives three
 * widgets' "start over" by hand and checks the numbers moved. This is that property for every
 * variant-driven widget at once, which is what a pool edit needs, since a restart that deals
 * back the numbers the learner just answered asks them to retype an answer they already know.
 *
 * Read off the real hook rather than the sources. Pool literals are not all literals —
 * `sign-rules-table` builds its four boards with a `flatMap` — and what has to hold is about
 * the BOARDS the pool draws, not the text that spells them: two entries that differ in a field
 * the widget never renders would disarm the guard exactly as a duplicate does.
 *
 * ## Why this is NOT a `.browser.test.tsx`, and must not be turned back into one
 *
 * It was one until 2026-07-31, and for that whole time it measured NOTHING on any developer
 * machine. Vitest's BROWSER-mode module mocker is silently inert when the project root
 * contains a space: the mock registry is keyed by a URL-escaped id and the widgets resolve
 * the decoded one, so `vi.mock` registers, never matches, and reports no error. Every
 * widget then gets the real hook, `pool.seen` stays empty, and the per-widget cases below
 * take a "not variant-driven" branch and pass. That is `#193`: 174 green tests over an empty
 * population, with a single count assertion the only thing saying so. Six people bumped that
 * count — 37, 46, 66, 87, 116, 124 — from reading the sources, because none of them could
 * ever observe it.
 *
 * MEASURED rather than argued, and it is a one-variable experiment. The same commit
 * (`778e7eed`), the same `node_modules`, the same command, checked out twice:
 * `/tmp/vp-bisect` reports **175 passed**, and `/tmp/vp bisect with spaces` reports
 * `variantDriven` **0** against 124. Renaming the directory is the entire diff. A git bisect
 * over the 309 commits back to where 124 was pinned finds every one of them GOOD from a
 * space-free path, so there is no source regression to look for: the pool has always held
 * its 124.
 *
 * Under jsdom the same mock intercepts on the same spaced path, which is why the sweep lives
 * here. Nothing in it needs real Chromium — it reads `data-latex` and `aria-label` off the
 * DOM and cycles React state — and the sibling reveal guards this file is the precondition
 * for stay in Chromium, where their own claims are about paint. Rename this back and the
 * population empties again; the liveness assertion below is what will say so out loud.
 *
 * Recorded as `docs/Post_MVP_Backlog.md` Tier 2 item 13, which asked for exactly three
 * things: prove or kill the path-spelling hypothesis, make the mock resolution
 * path-independent, and give the per-widget cases a floor so they cannot pass vacuously.
 */

import { afterEach, expect, test, vi } from "vitest";

import { type Harness, mount, setInputValue, waitFor } from "./testHarness";
import type { LessonWidgetProps, WidgetVariantControl } from "./widgetMechanics";

/** What each mounted widget asked `useWidgetVariants` for, newest last. */
const pool = vi.hoisted(() => ({
  seen: [] as { count: number; control: WidgetVariantControl }[],
}));

// Wraps the real hook rather than replacing it, so the strict `(index + 1) % count` cycle
// under test is the one the app runs. Everything else in the module is passed straight
// through, including the contexts, whose identity `widgetFeedback` depends on.
vi.mock("./widgetMechanics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./widgetMechanics")>();
  return {
    ...actual,
    useWidgetVariants: (count: number, props: LessonWidgetProps): WidgetVariantControl => {
      const control = actual.useWidgetVariants(count, props);
      pool.seen.push({ count, control });
      return control;
    },
  };
});

import { allLessons } from "./domains";
import { visualsMatching } from "./kindFamily";
import { LessonVisual, type LessonVisualId } from "./visuals";

/**
 * Registered and reveal-offering, but placed by no authored lesson, so the sweep below cannot
 * reach it through the lesson packs.
 *
 * It is here rather than dropped because it is one of the fifteen shapes that see NOTHING of a
 * same-parameter redraw, so it is among the widgets this file exists to protect. Written down
 * as a named exception rather than folded into the list quietly: an unplaced widget is either
 * on its way into a lesson or on its way out, and both want to be visible.
 */
const REGISTERED_BUT_UNPLACED: readonly LessonVisualId[] = ["negative-exponent-order"];

/**
 * Every visual any authored lesson places, in first-seen order, plus the exceptions above.
 * Read from the all-domains registry rather than a written-down list, exactly as
 * `visualsMath.test.tsx` does, so a widget wired into a lesson tomorrow is swept without
 * anybody remembering to add it here.
 */
const LIVE_VISUAL_IDS = Array.from(
  new Set([
    ...allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id)),
    ...REGISTERED_BUT_UNPLACED,
  ]),
) as LessonVisualId[];

/**
 * D1's genuinely exempt board: one parameter set, and a second would ask the same question.
 *
 * Six of D1's eighteen no-pool visuals left this block on 2026-08-04 with pools of two authored
 * boards apiece — `percent-slider`, `proportion-cross-play`, `distribute-builder`,
 * `common-denominator-multiples`, `like-terms-sorter` and `subtract-as-add-play` — because each
 * asks the learner to PRODUCE a value, and a reset that deals it back asks them to retype an
 * answer they already have. These nine were classified the same way and came out the other
 * side of that line. Each is annotated with why.
 *
 * Split out from the rest of `SINGLE_BOARD` and paired with `POOL_OWED_IN_D1` below, because
 * a widget that owes nothing and a widget that FORGOT look identical from outside a single
 * list: both arrive with an empty `pool.seen`, and the census at the foot of this file is as
 * happy with one as the other. The two collections are asserted against the tree, against each
 * other, and each under a floor, by `D1's no-pool visuals are split into an exemption and a
 * debt` below.
 */
const D1_SINGLE_BOARD: readonly LessonVisualId[] = [
  // The whole is read off the line in front of the learner, so knowing where it was last time
  // saves nothing: the gate is a traversal rather than an answer.
  "absolute-value-explore",
  // The board IS the fact. "Numerator" and "denominator" are the answer whatever numbers the
  // fraction is written with, and the same is true of P-E-M-D-A-S and of the four tiers: a
  // second parameter set would deal a different picture of one unchanging answer.
  "fraction-parts-explore",
  "pemdas-key-explore",
  "pemdas-mnemonic-explore",
  // Transport rather than answering: the gate opens on having performed a swap and a regroup,
  // and the running total the widget holds steady is the demonstration, not a value to produce.
  "commutative-associative-play",
  // One rule, asked as a bounded choice, where the numbers are not what is being asked. Dealing
  // `5 + 2 \times 3` instead would put the same question ("which operation binds first") to a
  // learner who could answer it without reading the numbers at all, and the click-through
  // solvers below are the same shape one move at a time.
  "order-matters-play",
  "pemdas-solver-ltr",
  "pemdas-solver",
  "distribute-combine-play",
];

/**
 * D1 visuals that OWE a re-parameterising reset and have not got one: a DEBT, not an exemption.
 *
 * Each asks for a produced value a learner carries straight across a reset — the shaded block
 * that reads 8/15, the equivalent fraction built off 12/16, and the divisor that takes
 * 120 mi / 2 hr to a unit rate — so "Start over" deals back a board whose answer is already
 * known. That is the same R10 defect the six widgets above were fixed for; these three were not
 * reached on the 2026-08-04 authoring pass.
 *
 * Written down HERE rather than as a comment inside the exemption list, and floored at three,
 * so the debt cannot be discharged by relabelling: move one of these into `D1_SINGLE_BOARD` and
 * the union both lists feed is unchanged, the census stays green, and the only thing that
 * notices is the floor under this list. Paying a debt properly means giving the widget a pool,
 * which drops it out of the no-pool population and fails the census by name until it is deleted
 * from here.
 */
const POOL_OWED_IN_D1: readonly LessonVisualId[] = [
  "equivalent-fraction-play",
  "fraction-multiply-play",
  "unit-rate-play",
];

/**
 * Live visuals that genuinely deal ONE board, and so owe this file's property nothing: a
 * static diagram, or a single fixed parameter set with no "start over" to deal a second.
 *
 * Named rather than skipped, because from outside the sweep a widget that does not owe a
 * pool and a widget that has silently LOST one look identical — both arrive with an empty
 * `pool.seen` — and so does every widget in the tree when the mock stops intercepting at
 * all. Leaving that branch unnamed is what let this file report 174 passes over nothing.
 * Asserted in both directions by the census at the foot of the file: an entry here that
 * turns out to deal variants fails, and a widget that drops out of the pool without being
 * listed fails too, by name.
 *
 * This is the EXEMPTION half only. A widget that owes a pool and has not got one is a debt,
 * and it goes in its domain's owed list instead — see `POOL_OWED_IN_D1` — so that the two
 * cannot be told apart only by reading a comment. A widget that deals a second board WITHOUT
 * the hook is a third thing again, and it goes in `REIMPLEMENTED_CYCLE`: four entries sat
 * here for months under a stated reason that was false of every one of them.
 */
const SINGLE_BOARD: readonly LessonVisualId[] = [
  ...D1_SINGLE_BOARD,
  // The rational-expression chapter.
  "rational-forbidden-dose-explore",
  "rational-reduce-play",
  "rational-scale-cancel-play",
  "rational-scale-dose-explore",
  "rational-reciprocal-walkthrough",
  "rational-divide-dose-sorter",
  "rational-add-lcd-builder",
  "rational-add-walkthrough",
  "rational-subtract-sign-play",
  "rational-nested-bar-play",
  "rational-clear-lcd-builder",
  "rational-nested-dose-sorter",
  "rational-gauge-domain-explore",
  "rational-hole-asymptote-play",
  "rational-intercept-walkthrough",
  "rational-clear-measure-walkthrough",
  "rational-proving-run-solver",
  // The linear chapter. Nine of its twelve entries left this list when D7's authoring pass
  // gave each of them a second authored board; what is left is the two auto-play
  // walkthroughs, which have a Replay and no "start over" to deal anything with. The rate
  // explorer used to be excused here with the note that it "cycles two scenarios out of its
  // own state rather than a pool", which is a description of the thing this list says its
  // members do not do; it is in `REIMPLEMENTED_CYCLE` now, where that is checked.
  "linear-model-walkthrough",
  "linear-system-walkthrough",
];

/**
 * Live visuals that DO deal a second board and do not ask `useWidgetVariants` for it: they
 * hold their own array and advance an index into it on their own restart control.
 *
 * The gap this list closes was not in the assertions, which are strong, but one level under
 * them. What the sweep observes is whether a widget ASKS FOR A POOL. What this file's property
 * is about is whether A RESTART DEALS A DIFFERENT BOARD. Those come apart for a widget that
 * reimplements the cycle: it arrives with an empty `pool.seen`, is at that moment
 * indistinguishable from a static diagram, and lands in `SINGLE_BOARD` — whose stated reason,
 * "a single fixed parameter set with no 'start over' to deal a second", was untrue of four of
 * its members. `RationalExclusionClassify` is the clearest: `(index + 1) % BOARDS.length` is
 * the same strict cycle the docblock above says the whole guard rests on, hand-rolled.
 *
 * So they are swept, through the control they actually offer. Each entry's own restart button
 * is driven, and the boards it deals are walked to the point the cycle closes, which is the
 * property `useWidgetVariants` gives the other 204 for free: at least two boards, all of them
 * distinct on screen, and `count` the cycle's true period. Cut one of these arrays to one
 * entry, or make `boardAt` return `BOARDS[0]`, and every restart is a same-parameter redraw —
 * the defect this whole file exists to prevent, and it was reachable here in silence.
 *
 * The membership is NOT this list. It is `HAND_ROLLED_CYCLE_IDS`, read off the sources below,
 * and this list is the claim about it, asserted set-equal so a fifth widget cannot hand-roll a
 * cycle and settle into `SINGLE_BOARD` the way these four did.
 */
interface CycleBoard {
  id: LessonVisualId;
  /**
   * Answers the widget's typed beats accept, tried in order at a stalled entry box.
   *
   * Only for boards whose restart is gated behind a typed answer, which the generic driver
   * cannot produce. Hand-read, and re-derived rather than trusted: a wrong answer here does
   * not weaken an assertion, it fails the case at "never reached its own restart".
   */
  typed?: readonly string[];
}

const REIMPLEMENTED_CYCLE: readonly CycleBoard[] = [
  // Four doses to call, then "New problem" deals the second recipe.
  { id: "rational-exclusion-classify" },
  { id: "rational-cursed-root-classify" },
  // Bound, then the two rate chips, then the together time: `1/6 + 1/12` is `1/4`, so 4
  // hours on round one, and `1/3 + 1/5` is `8/15`, so `15/8` on round two.
  { id: "rational-combined-rate-build", typed: ["4", "15/8"] },
  // Tag the rate and the starting amount, then "Try another description".
  { id: "linear-model-rate-explore" },
];

/**
 * THE DERIVED POPULATION for the list above: every widget whose own source advances an index
 * modulo a collection's length.
 *
 * `(index + 1) % BOARDS.length` is not an idiom this tree uses for anything else — it is
 * `useWidgetVariants`'s cycle, copied — so it is a narrow filter, and a narrow filter is
 * exactly what a too-narrow population looks like. The protection against that is that it is
 * not the last word: it is checked SET-EQUAL to the hand-read list, so a widget that deals a
 * second board by some other means still has to be found by a human, and the four here are a
 * standing demonstration that they can be. What the derivation buys is the other direction —
 * a fifth copy of this exact cycle cannot be added without this file failing.
 */
const HAND_ROLLED_CYCLE_IDS = visualsMatching(
  /\(\s*[A-Za-z_$][\w$]*\s*\+\s*1\s*\)\s*%\s*[A-Za-z_$][\w$]*\.length/,
);

/**
 * Every live visual expected to arrive without a pool, for whichever of the three reasons: an
 * exemption that owes nothing, a debt that has been recorded and not yet paid, or a cycle the
 * widget runs itself.
 *
 * The census reads THIS, because from the sweep's side all three are the same observation.
 * What separates them is the collections it is built from, and the assertions each carries.
 */
const NO_POOL_EXPECTED: readonly LessonVisualId[] = [
  ...SINGLE_BOARD,
  ...REIMPLEMENTED_CYCLE.map((entry) => entry.id),
  ...POOL_OWED_IN_D1,
];

const noPool = new Set<string>(NO_POOL_EXPECTED);

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
  pool.seen.length = 0;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/**
 * What the learner can see of the parameter set in front of them: every piece of typeset math
 * and every accessible name. Two parameter sets that produce the same one of these are the
 * same question as far as anybody looking at the screen is concerned, which is the sense in
 * which a duplicate pool entry matters.
 */
function board(host: HTMLElement): string | null {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    return null;
  }
  const latex = all(found, "[data-latex]").map((n) => n.getAttribute("data-latex") ?? "");
  const names = all(found, "[aria-label]").map((n) => n.getAttribute("aria-label") ?? "");
  return [...latex, ...names].join("|");
}

/** How many of the live visuals turned out to be variant-driven, for the count guard below. */
const variantDriven: string[] = [];

/**
 * The control the NEWEST mount handed back, which is the one a restart has to be spent on: a
 * restart remounts the widget body, so the control captured before it belongs to a body that
 * no longer exists.
 */
function latestControl(): WidgetVariantControl {
  const last = pool.seen[pool.seen.length - 1];
  if (last === undefined) {
    throw new Error("no mounted widget has asked for a variant pool");
  }
  return last.control;
}

/**
 * Poll until `predicate` holds, and give up QUIETLY rather than throwing.
 *
 * Used to let a redraw commit before the board is read. It cannot be `waitFor`, and it cannot
 * be a fixed sleep either: a repeated pool entry never satisfies it, so expiring is a
 * legitimate outcome that the assertion below has to be the one to report — while a fixed
 * sleep would read the previous board on any machine slower than the sleep and report a
 * duplicate that is not there.
 */
async function settled(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
}

/**
 * THE FLOOR UNDER THE INSTRUMENT, and it runs first so a dead one is diagnosed once rather
 * than 124 times.
 *
 * Everything below reads the population through the `vi.mock` wrapper. A mocker that
 * registers and never matches produces no error and no output — it produces a sweep over
 * nothing, which is indistinguishable from a tree in which no widget deals variants. So the
 * wrapper is asked to prove it is live against one widget the census has independently
 * pinned as variant-driven, before any of its readings are trusted.
 */
test("the hook wrapper is actually intercepting", async () => {
  const canary = LIVE_VISUAL_IDS.find((id) => !noPool.has(id));
  expect(
    canary,
    "every live visual is declared single-board; the list has grown too far",
  ).not.toBeUndefined();

  h = mount(<LessonVisual id={canary as LessonVisualId} />);
  await waitFor(() => h?.host.firstElementChild !== null, `${canary} mounts`);
  expect(
    pool.seen.length,
    `${canary} mounted without \`useWidgetVariants\` being observed, so this whole file is ` +
      `measuring an empty population. Read the docblock: browser-mode \`vi.mock\` is ` +
      `silently inert when the checkout path contains a space, which is why this sweep is a ` +
      `jsdom test and must not be renamed back to \`.browser.test.tsx\`.`,
  ).toBeGreaterThan(0);
});

test.each(LIVE_VISUAL_IDS)("%s: its variant pool deals distinct boards", async (id) => {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  await waitFor(() => host.firstElementChild !== null, `${id} mounts`);

  const first = pool.seen[0];
  if (first === undefined) {
    // Not variant-driven. That is legitimate for a static diagram or a single fixed board,
    // and it is ALSO what a widget that has quietly lost its pool looks like, and what every
    // widget looks like when the wrapper above has stopped intercepting. So it has to be a
    // declared single-board visual rather than a silent exit: this branch used to be a bare
    // `return`, and a bare return is how 174 of these cases passed while asserting nothing.
    expect(
      noPool.has(id),
      `${id}: mounted without asking for a variant pool. Either it has lost one, or the ` +
        `hook wrapper is not intercepting — check the liveness test above before touching ` +
        `this widget. If it genuinely deals one board, declare it: an exemption goes in ` +
        `\`SINGLE_BOARD\`, an unpaid debt in its domain's owed list.`,
    ).toBe(true);
    return;
  }
  variantDriven.push(id);

  // HALF ONE: the pool is big enough for the cycle to move. A pool of one turns every
  // restart into a redraw onto the numbers already on screen.
  expect(
    first.count,
    `${id}: a variant pool of one cannot deal a different board`,
  ).toBeGreaterThanOrEqual(2);

  // HALF TWO: and the entries are distinct ON SCREEN. Walk the whole cycle, because that is
  // the only thing that can tell a pool of two real boards from a pool holding one twice.
  const boards: string[] = [];
  const opening = board(host);
  expect(opening, `${id}: no widget mounted to read a board off`).not.toBeNull();
  boards.push(opening as string);
  for (let step = 1; step < first.count; step += 1) {
    const previous = boards[boards.length - 1] as string;
    latestControl().restart();
    await settled(() => {
      const drawn = board(host);
      return drawn !== null && drawn !== previous;
    });
    await waitFor(() => board(host) !== null, `${id}: variant ${step} mounted`);
    boards.push(board(host) as string);
  }
  const repeated = boards.filter((drawn, at) => boards.indexOf(drawn) !== at);
  expect(repeated, `${id}: two of its ${first.count} variants draw the same board`).toEqual(
    [],
  );

  // And the cycle closes where it started, so `count` is the pool's true period rather than
  // a number that happens to be smaller than it. A pool longer than the count it was handed
  // has entries no restart ever reaches, which is the same hole from the other side.
  latestControl().restart();
  await waitFor(() => board(host) === boards[0], `${id}: the cycle came back round`);
});

/** What a button says, for telling one control from another without reading the DOM twice. */
function label(button: HTMLButtonElement): string {
  return `${button.getAttribute("aria-label") ?? ""}|${(button.textContent ?? "").trim()}`;
}

function restartControl(widget: HTMLElement): HTMLButtonElement | null {
  const found = widget.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
  return found === null || found.disabled ? null : found;
}

/**
 * Answer the board until it offers its own restart, and hand that control back.
 *
 * Generic on purpose: these widgets share no archetype — that is the whole reason they are
 * here — so there is nothing to drive them through but the affordances they render. Press
 * every live control once, in the order they appear, skipping anything already pressed and
 * the restart itself; when nothing new is left to press, the board is waiting on a typed
 * answer, so try the next one the entry declares.
 *
 * A press that CHANGES the board forgets everything pressed before it, and that is not
 * tidiness. `LinearModelRateExplore` asks for the rate and then the starting value out of the
 * same chip row, with the same labels, unlocking on the way through — so the chip that answers
 * the second question is often one a first-question miss has already spent. Without the reset
 * the driver runs out of unpressed controls one answer short of the restart.
 *
 * Returns `null` rather than throwing, so the caller names the widget in the failure.
 */
async function driveToRestart(
  widget: HTMLElement,
  typed: readonly string[],
): Promise<HTMLButtonElement | null> {
  const pressed = new Set<string>();
  const answers = [...typed];
  const shape = () => widget.innerHTML;
  for (let step = 0; step < 60; step += 1) {
    const restart = restartControl(widget);
    if (restart !== null) {
      return restart;
    }
    const live = all<HTMLButtonElement>(widget, "button").filter(
      (button) =>
        !button.disabled && !button.classList.contains("lesson-interactive__reset"),
    );
    const next = live.find((button) => !pressed.has(label(button)));
    if (next !== undefined) {
      const before = shape();
      const spent = label(next);
      pressed.add(spent);
      next.click();
      await settled(() => restartControl(widget) !== null, 40);
      if (shape() !== before) {
        pressed.clear();
        pressed.add(spent);
      }
      continue;
    }
    const answer = answers.shift();
    const entry = widget.querySelector<HTMLInputElement>(".lesson-interactive__input");
    if (answer === undefined || entry === null) {
      return null;
    }
    setInputValue(entry, answer);
    widget.querySelector<HTMLButtonElement>(".lesson-interactive__check")?.click();
    // A new beat renders new controls, and some of them reuse a label from the last one.
    pressed.clear();
    await settled(() => restartControl(widget) !== null, 40);
  }
  return null;
}

/**
 * The same property the pool sweep asserts, driven through a restart the widget owns.
 *
 * The period is DISCOVERED rather than declared: walk until the board comes back round, so
 * there is no per-widget count to pin, and a cycle that has been cut to one entry fails at
 * the first step instead of quietly satisfying a number somebody wrote down.
 */
test.each(REIMPLEMENTED_CYCLE)(
  "$id: its own restart deals a different board",
  async (entry) => {
    const id = entry.id;
    h = mount(<LessonVisual id={id} />);
    const host = h.host;
    await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
    const widget = host.querySelector(".lesson-interactive") as HTMLElement;

    const opening = board(host);
    expect(opening, `${id}: no widget mounted to read a board off`).not.toBeNull();
    const boards: string[] = [opening as string];

    const PERIOD_CAP = 6;
    let closed = false;
    for (let turn = 0; turn < PERIOD_CAP && !closed; turn += 1) {
      const restart = await driveToRestart(widget, entry.typed ?? []);
      expect(
        restart,
        `${id}: never reached its own restart, so nothing below was measured. Either the ` +
          `board can no longer be answered by pressing what it renders, or a typed answer ` +
          `declared for it is wrong`,
      ).not.toBeNull();
      const previous = boards[boards.length - 1] as string;
      (restart as HTMLButtonElement).click();
      await settled(() => {
        const drawn = board(host);
        return drawn !== null && drawn !== previous;
      });
      const drawn = board(host);
      expect(drawn, `${id}: the restart left nothing on screen`).not.toBeNull();
      if (drawn === boards[0]) {
        closed = true;
        break;
      }
      boards.push(drawn as string);
    }

    // HALF ONE, and the one Stream D's injection lands on: the restart moved the board at
    // all. `boardAt` returning `BOARDS[0]` unconditionally makes this the first failure.
    expect(
      boards.length,
      `${id}: its restart dealt the board already on screen, so every "new problem" asks the ` +
        `learner the question they just answered`,
    ).toBeGreaterThanOrEqual(2);

    // HALF TWO: the boards it deals are distinct ON SCREEN, which is the only thing that
    // separates a cycle of two real boards from one holding the same board twice.
    const repeated = boards.filter((drawn, at) => boards.indexOf(drawn) !== at);
    expect(repeated, `${id}: two of the boards it cycles draw the same thing`).toEqual([]);

    // And the cycle closes, so the array's length is its true period rather than a number
    // with entries after it that no restart ever reaches.
    expect(
      closed,
      `${id}: ${PERIOD_CAP} restarts never came back to the opening board, so its cycle is ` +
        `longer than anything this sweep can walk or it does not close at all`,
    ).toBe(true);
  },
);

/**
 * The reimplemented-cycle list against the tree, in both directions, plus the assertion the
 * whole finding turns on: nothing in `SINGLE_BOARD` may hand-roll a cycle.
 *
 * Placed after the sweeps so `variantDriven` is filled: a widget that hand-rolls a secondary
 * cycle AND asks for a pool is already covered by the pool sweep and does not belong here.
 */
test("the widgets that cycle their own boards are declared, and none of them is excused as single-board", () => {
  // The floor under the instrument. `visualsMatching` reads the sources through a glob and a
  // registry lookup, and both can resolve to nothing. Deliberately just "not empty" rather
  // than today's four: the SIZE is carried by the set equality below, which fails on a
  // derivation of three as loudly as on one of zero, and a floor pinned to the current count
  // would take that failure away from the assertion that can say which widget moved.
  expect(
    HAND_ROLLED_CYCLE_IDS.length,
    "no widget source matches the hand-rolled cycle at all, so the derivation has broken " +
      "rather than the tree having stopped doing this",
  ).toBeGreaterThan(0);

  // THE FINDING, as an assertion, and FIRST because it is the one that names the defect
  // rather than the bookkeeping around it. `SINGLE_BOARD` says its members deal ONE board;
  // four of them cycled two, for months, behind an empty `pool.seen` that looked exactly like
  // a static diagram's.
  expect(
    SINGLE_BOARD.filter((id) => HAND_ROLLED_CYCLE_IDS.includes(id)),
    "declared to deal ONE board with no start-over to deal a second, and its own source " +
      "advances an index modulo a collection length. That is a variant pool spelled by hand: " +
      "move it to REIMPLEMENTED_CYCLE, where its restart is driven, or give it a real pool",
  ).toEqual([]);

  const declared = REIMPLEMENTED_CYCLE.map((entry) => entry.id).sort();

  // COMPOSITION, both directions at once, and it is the membership claim rather than a size
  // one: a fifth widget that copies the cycle and is not declared fails here, and a declared
  // entry that stops copying it, gains a pool, or leaves the authored lessons fails here too.
  const derived = HAND_ROLLED_CYCLE_IDS.filter(
    (id) => LIVE_VISUAL_IDS.includes(id) && !variantDriven.includes(id),
  ).sort();
  expect(
    derived,
    "the widgets that run their own board cycle are not the ones declared to. An id in the " +
      "derivation and not the list is a widget dealing boards that nothing drives; an id in " +
      "the list and not the derivation has stopped qualifying and its entry excuses nothing",
  ).toEqual(declared);

  // Nothing may be claimed under two headings, or neither claim can be checked.
  expect(
    declared.filter((id) => SINGLE_BOARD.includes(id) || POOL_OWED_IN_D1.includes(id)),
    "declared as running its own cycle AND as exempt or owing, so the two claims cannot both " +
      "be read",
  ).toEqual([]);
});

/**
 * D1's two no-pool collections, held apart from each other and each held to the tree.
 *
 * The census below already asserts the UNION in both directions, and that is not enough. An
 * exemption and an unpaid debt are the same observation from outside the sweep — both widgets
 * mount without asking for a pool — so a single list with a comment beside three of its entries
 * records the difference somewhere no run can read. This is that difference moved into two
 * collections and four assertions.
 *
 * The floor under the debt is the one doing work the census cannot: both lists feed
 * `NO_POOL_EXPECTED`, so moving `unit-rate-play` from the debt into the exemption changes
 * nothing the census can see, and the run stays green over a debt that has been quietly
 * forgiven. It fails here instead.
 */
test("D1's no-pool visuals are split into an exemption and a debt, and both are load-bearing", () => {
  // The floor under the instrument. Everything below reads `variantDriven`, which the sweep
  // above fills; over an empty one, every "none of these have a pool" holds vacuously.
  expect(
    variantDriven.length,
    "the sweep found no variant-driven widgets, so nothing below is measuring anything",
  ).toBeGreaterThanOrEqual(204);

  // Nothing may be claimed as exempt and as owing at the same time.
  const claimedTwice = D1_SINGLE_BOARD.filter((id) => POOL_OWED_IN_D1.includes(id));
  expect(
    claimedTwice,
    "declared both genuinely single-board and owing a pool, so neither claim can be checked",
  ).toEqual([]);

  // Floors, so neither collection can be emptied into the other.
  expect(
    D1_SINGLE_BOARD.length,
    "D1's exemption list has shrunk; an exemption that is deleted rather than paid off is a " +
      "widget nobody is checking",
  ).toBeGreaterThanOrEqual(9);
  expect(
    POOL_OWED_IN_D1.length,
    "D1's recorded pool debt has shrunk. Deleting an entry is only correct once the widget " +
      "HAS a pool, and then the census below fails until it is deleted — so a shrinking debt " +
      "with a green census means one was relabelled as exempt instead of being paid",
  ).toBeGreaterThanOrEqual(3);

  // DIRECTION ONE, both lists: an entry that stops qualifying fails. A listed id no lesson
  // places any more is an exemption excusing nothing, or a debt against a widget that has gone.
  for (const id of [...D1_SINGLE_BOARD, ...POOL_OWED_IN_D1]) {
    expect(
      LIVE_VISUAL_IDS,
      `${id}: declared by one of D1's no-pool lists, but no authored lesson places it`,
    ).toContain(id);
  }

  // DIRECTION TWO, both lists: a member that adopts the property without leaving its list
  // fails. Read off the census the sweep measured, so it is what the widget DOES that decides
  // and not what its annotation says.
  expect(
    D1_SINGLE_BOARD.filter((id) => variantDriven.includes(id)),
    "declared genuinely single-board in D1, but it deals a variant pool: it is not an " +
      "exemption any more, so delete the entry",
  ).toEqual([]);
  expect(
    POOL_OWED_IN_D1.filter((id) => variantDriven.includes(id)),
    "recorded as owing a pool in D1, but it has one now: the debt is paid, so delete the entry",
  ).toEqual([]);
});

test("the sweep found the variant-driven widgets", () => {
  // Not a spot check: every widget any lesson places is mounted above, so this is a census of
  // which of them run on a pool. It used to be one exact number, `toBe(124)`, which had moved
  // five times — 37, 46, 66, 87, 116 — and which says nothing about SHAPE: one widget losing
  // its pool while another gained one leaves it green. Worse, a count is what an empty
  // population argues with, and arguing with it is what invited five bumps that were really
  // five readings of the sources.
  //
  // So: floors for size, and set equality for composition.
  //
  // The floors moved once more when D6 (Functions & their Graphs) merged: its forty-four
  // widgets all run on a pool, as D9's thirty-six do. Both numbers are MEASURED on the merged
  // tree rather than added up, and the arithmetic would have been wrong: 174 + 44 predicts 218
  // live visuals and the tree holds 254, because the two lanes' registries overlap in ways no
  // sum can see. Read them off a run, never off this comment.
  //
  // A floor rather than an exact count, so a new widget passes freely and only a SHRINKING
  // population fails. That is the case the composition equality below cannot catch: a widget
  // that vanishes from the registry is absent from both sides of it and leaves it green, so
  // the floor is the only thing standing between a whole domain silently dropping out and a
  // passing run.
  expect(LIVE_VISUAL_IDS.length).toBeGreaterThanOrEqual(254);
  expect(variantDriven.length).toBeGreaterThanOrEqual(204);

  // COMPOSITION, both directions at once. The visuals that arrived without a pool must be
  // exactly the ones declared to have none: a widget that drops out of the pool fails here by
  // name, and a declared entry that starts dealing variants fails here too, so neither list
  // can go on excusing something it has stopped describing.
  const arrivedWithoutAPool = LIVE_VISUAL_IDS.filter((id) => !variantDriven.includes(id));
  expect([...arrivedWithoutAPool].sort()).toEqual([...NO_POOL_EXPECTED].sort());

  // Every live visual is accounted for as one or the other, so nothing can sit outside both
  // and be swept by neither.
  expect(variantDriven.length + NO_POOL_EXPECTED.length).toBe(LIVE_VISUAL_IDS.length);

  // And the exception list may not grow until it has swallowed the population — the failure
  // mode a floor alone cannot see, since a floor constrains size and not shape.
  expect(variantDriven.length).toBeGreaterThan(NO_POOL_EXPECTED.length * 2);
});
