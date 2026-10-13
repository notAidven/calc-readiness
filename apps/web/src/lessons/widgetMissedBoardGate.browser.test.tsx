/**
 * A RECORDED MISS DOES NOT HOLD A FINISHED BOARD SHUT.
 *
 * Eight widgets in the tree lock a part on a wrong tap and then keep asking for the rest of
 * the board. Until now every one of them gated on `complete && !missed`: a learner who missed
 * one part, read the sentence it printed, and called every remaining part correctly was handed
 * a fresh board and made to answer the parts they had already got right in order to reach the
 * one they had not. The lock is there to stop a two-option row being brute-forced, which it
 * still does; it was never an argument for charging a whole board for one wrong call.
 *
 * So the gate now turns on every part being CALLED. This file is where that rule lives for the
 * family, rather than in each widget's own spec, because the widgets share no machinery — the
 * eight are eight separate implementations of the same shape, and a rule asserted once per
 * implementation is how five of them drift.
 *
 * ## The two properties are split on purpose
 *
 * Loosening `complete && !missed` to `complete` moves ONE term. Asserting only the new half
 * would leave `true` passing just as well, so `a part left unanswered still holds the gate
 * shut` is asserted beside it and is now the whole of the anti-brute-force property.
 *
 * ## Forgiving a miss is not hiding it
 *
 * The third property. A board that advanced the learner past a miss must still be SAYING there
 * was one, or "forgiving" would just be a way of deleting feedback. Asserted on the visible
 * text and on `data-state`, both of which survive with colour removed — and both of which are
 * outside any frozen region, so unlike an `aria-label` added under a reveal's `inert` stage
 * they are reachable at the moment they are claimed.
 *
 * ## Population
 *
 * The boards driven below, floored rather than counted so a widget joining the rule joins the
 * sweep without a number to bump. The floor is the whole of the coverage claim: it catches the
 * table being shrunk, which `test.each` over a literal cannot.
 *
 * Adopting a board is NOT the two-line change an earlier version of this note claimed. Grepping
 * `complete && !missed` does not find the defect: `BinaryRowSort` and `RationalizeExplore` both
 * still contain that expression, both are driven here, and both pass, because a board may read
 * its miss record to caption a CONCLUSION without letting it drive the gate — which is also what
 * `LinearLinePairClassify` does at the predicate a grep lands on, its gate turning on every pair
 * being called some thirty lines below. Gate use and caption use are indistinguishable by
 * pattern, so the only evidence that a board forgives a miss is playing it, and a driver needs
 * that board's row selector, its settling tell, and an option sequence that misses exactly once
 * read off its first instance. Widening therefore means authoring one driver per board against
 * real Chromium layout, and is tracked as that rather than as a list to extend.
 *
 * ### And the floor was one an era could not fail
 *
 * The two boards above are both RAD, floored at exactly two, so while the table was intact the
 * floor could not fail and the sweep's coverage claim was a claim about one era. D3 then shipped
 * eight boards gating on "every part CALLED" — `AbsCountClassify`, `BothPansBuilder`,
 * `FormulaIsolateBuilder`, `IntervalWriteBuilder`, `AbsBranchBuilder`, `AbsUnionBuilder`, and
 * both `BinaryRowSort` adopters — every one of them correct, and not one of them measured, so
 * the property held there by nobody's assertion.
 *
 * Two D3 drivers are added below and the floor is raised past them. The floor is size and not
 * shape, though, and a floor of four is met by four of anything, so beside it the sweep asserts
 * its COMPOSITION: the boards it drives are placed by more than one lesson domain, derived from
 * the registry rather than read off this table, which fails if the sweep drifts back to being
 * one era's.
 *
 * `abs-count-classify` is the one board here whose finished line does not carry the `wrong`
 * valence, so `missedState` is per board rather than a constant. That board reserves `solved`
 * for a clean run and prints the miss in words instead; the marks on the row it happened on —
 * the learner's cross and the standing tick — are swept by `chipPressedState.browser.test.tsx`
 * over a population derived from `allLessons`, so the second channel is measured, elsewhere.
 */

import { afterEach, expect, test } from "vitest";

import { LESSON_DOMAINS } from "./domains";
import { findButton, type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

interface Board {
  id: LessonVisualId;
  /** The answerable parts of the board, in the order they are drawn. */
  rows: string;
  /**
   * Which option to take on each row so exactly ONE row is missed and every other row is
   * called correctly. Read off the widget's own first board.
   */
  takes: readonly number[];
  /** True once this row will not accept another answer. */
  settled: (row: HTMLElement) => boolean;
  /** Part of the sentence the board prints once it is finished with a miss on it. */
  missedNote: string;
  /**
   * The `data-state` the board's own line carries once it is finished with a miss on it.
   *
   * Per board rather than a constant, because the family does not agree on whether a finished
   * board with a miss on it is a third valence or simply not the solved one. See the header.
   */
  missedState: string;
}

/**
 * Which lesson domain places each visual, read off the registry.
 *
 * This is what the composition assertion below is derived from: writing the domains down here
 * would be the same mistake as writing the population down, one level up.
 */
const DOMAIN_OF_VISUAL = new Map<string, string>(
  LESSON_DOMAINS.flatMap((domain) =>
    domain.lessons.flatMap((lesson) =>
      (lesson.visuals ?? []).map((visual) => [visual.id, domain.id] as [string, string]),
    ),
  ),
);

/**
 * The deliberate miss is always ROW 0 and every later row is called correctly, so each board
 * is exercised as "got one wrong, then carried on and finished the rest" — the case the gate
 * used to throw away, rather than a board that simply failed.
 */
const BOARDS: readonly Board[] = [
  {
    // RAD.1, on the shared `BinaryRowSort` kind. Board 1 is 81, 24, 64, 45 — perfect, not,
    // perfect, not — so taking option 1 on row 0 misses a perfect square.
    id: "perfect-root-classify",
    rows: ".lesson-classify__item",
    takes: [1, 1, 0, 1],
    settled: (row) => row.dataset.settled === "true",
    missedNote: "you're good to move on",
    missedState: "wrong",
  },
  {
    // RAD.2, bespoke. Board 1 is equal, equal, not-equal, and the options are
    // "Same value" then "Different value", so taking option 1 on row 0 misses.
    id: "rationalize-explore",
    rows: ".lesson-classify__row",
    takes: [1, 0, 1],
    settled: (row) => row.querySelector(".lesson-classify__outcome") !== null,
    missedNote: "you're good to move on",
    missedState: "wrong",
  },
  {
    // D3 LIN.4, on the same `BinaryRowSort` kind as RAD.1 but on its own content. Board 1 is
    // one band, two bands, one band, one band, and the options are "One band" then "Two
    // separated bands", so taking option 1 on row 0 misses.
    id: "compound-band-sorter",
    rows: ".lesson-classify__item",
    takes: [1, 1, 0, 0],
    settled: (row) => row.dataset.settled === "true",
    missedNote: "you are good to carry on",
    missedState: "wrong",
  },
  {
    // D3 LIN.5, bespoke. Board 1 asks how many solutions each of four rules has, and the calls
    // are drawn 0, 1, 2 in that order: the answers are two, none, one, none, so taking option 0
    // on row 0 calls a two-solution rule as having none.
    //
    // This board's own line reserves `solved` for a clean run rather than carrying a third
    // valence, which is why `missedState` exists; the header sets out where its other channel
    // is measured.
    id: "abs-count-classify",
    rows: ".lesson-classify__item",
    takes: [0, 0, 1, 0],
    settled: (row) => row.dataset.settled === "true",
    missedNote: "you are good to carry on",
    missedState: "prompt",
  },
];

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function rowsOf(widget: HTMLElement, board: Board): HTMLElement[] {
  return Array.from(widget.querySelectorAll<HTMLElement>(board.rows));
}

/**
 * Answer the board a row at a time.
 *
 * `leaveOpen` stops that many rows short of the end. Options are re-queried per row because a
 * settled row replaces or disables its own, and a stale handle would click nothing and leave
 * the failure looking like a gate that never opened.
 */
async function play(
  board: Board,
  onComplete: () => void,
  { leaveOpen = 0 }: { leaveOpen?: number } = {},
): Promise<HTMLElement> {
  h = mount(<LessonVisual id={board.id} onComplete={onComplete} />);
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    `${board.id} mounts`,
  );
  const widget = host.querySelector(".lesson-interactive") as HTMLElement;
  expect(
    rowsOf(widget, board).length,
    `${board.id}: the board is not the shape this sweep drives`,
  ).toBe(board.takes.length);

  for (const [at, take] of board.takes.entries()) {
    if (at >= board.takes.length - leaveOpen) {
      break;
    }
    const row = rowsOf(widget, board)[at] as HTMLElement;
    const options = Array.from(
      row.querySelectorAll<HTMLButtonElement>(".lesson-interactive__chip"),
    );
    expect(options.length, `${board.id}: row ${at} has no options to take`).toBeGreaterThan(
      1,
    );
    options[take]?.click();
    await waitFor(
      () => board.settled(rowsOf(widget, board)[at] as HTMLElement),
      `${board.id}: row ${at} never settled`,
    );
  }
  return widget;
}

/**
 * The floor the header promises. `test.each` over a literal table asserts nothing about the
 * table's size, so every property below would keep passing on a single board, or on none, and a
 * board quietly dropped while resolving a conflict in this file is the way that happens. Each
 * driven board must also still resolve to a mounted widget, or the sweep would be driving an id
 * the registry no longer renders.
 */
test("the sweep drives every board it claims to", () => {
  expect(BOARDS.length, "the driven population shrank").toBeGreaterThanOrEqual(4);
  expect(new Set(BOARDS.map((board) => board.id)).size, "a board is driven twice").toBe(
    BOARDS.length,
  );
  for (const board of BOARDS) {
    expect(
      board.takes.length,
      `${board.id}: a board needs at least two parts for one of them to be a miss`,
    ).toBeGreaterThan(1);
    // Each driven id is one a lesson actually places, which is also what makes the domains
    // below readable: an id the registry cannot resolve would contribute no domain and shrink
    // the composition claim silently.
    expect(
      DOMAIN_OF_VISUAL.get(board.id),
      `${board.id}: no lesson places this board, so the sweep is driving a dead id`,
    ).toBeDefined();
  }

  // COMPOSITION, not just size. A floor of four is met by four RAD boards, and one era is what
  // this sweep used to be: for six months it drove two boards from the two lessons a past QA
  // pass had open while eight boards in another era carried the same property unmeasured.
  const domains = new Set(BOARDS.map((board) => DOMAIN_OF_VISUAL.get(board.id)));
  expect(
    domains.size,
    `every board driven here is placed by the same lesson domain (${[...domains].join(", ")}), so this is the single-era sweep again`,
  ).toBeGreaterThanOrEqual(2);
});

test.each(BOARDS)(
  "$id: a miss does not hold the gate shut once every part is called",
  async (board) => {
    let completed = 0;
    await play(board, () => {
      completed += 1;
    });
    expect(
      completed,
      `${board.id}: every part was called with one miss among them and the gate stayed shut`,
    ).toBe(1);
  },
);

test.each(BOARDS)(
  "$id: a part left unanswered still holds the gate shut",
  async (board) => {
    let completed = 0;
    await play(
      board,
      () => {
        completed += 1;
      },
      { leaveOpen: 1 },
    );
    expect(completed, `${board.id}: the gate opened with a part still unanswered`).toBe(0);
  },
);

test.each(BOARDS)(
  "$id: a board that advanced past a miss still reports it",
  async (board) => {
    const widget = await play(board, () => {});
    const status = widget.querySelector(".lesson-interactive__status");

    // The valence lives in the DOM rather than only in a computed colour, so the verdict
    // survives the hue being removed. Per board: the family does not agree on whether a
    // finished board with a miss on it takes a third state or simply withholds the solved one,
    // and either way what must not happen is a board reporting a clean run over a miss.
    expect(
      status?.getAttribute("data-state"),
      `${board.id}: the finished board stopped reporting the miss`,
    ).toBe(board.missedState);
    expect(
      status?.getAttribute("data-state"),
      `${board.id}: a board with a miss on it reports the state it keeps for a clean run`,
    ).not.toBe("solved");
    // And it is carried in words, which is the channel that does not depend on seeing the red
    // at all. Asserted on the replacement copy: the old sentences told the learner the board
    // did not count, which the gate no longer does.
    expect(
      (status?.textContent ?? "").toLowerCase(),
      `${board.id}: the board's line does not say the learner may carry on`,
    ).toContain(board.missedNote);
  },
);

/* ------------------------------------------- the same line, after a reveal has resolved */

/**
 * And it still reports it once a reveal has RESOLVED on the board, which is the one path that
 * used to silence it.
 *
 * RAD.2 only, and not a third row in the table above, because the suppression was this
 * widget's own: it rendered its status line as `null` for as long as `revealedId` was set, and
 * that flag does not clear inside a board. RAD.1 has the same latch and never read it here.
 *
 * The path is the length it is because a reveal only resolves on a REDRAWN instance — the first
 * one teaches and holds — so getting there means taking the reveal, taking the fresh set, and
 * taking the reveal again. Everything after that is a board the learner can still work, and
 * "you're good to move on" is the sentence that tells them so.
 */
test("rationalize-explore: a resolved reveal does not silence the board's own line", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual
      id="rationalize-explore"
      onComplete={() => {
        completed += 1;
      }}
      onReopen={() => {}}
    />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the compare board mounts",
  );
  // Re-queried rather than held: the fresh set remounts the body on a new key, so a handle
  // taken before it points at an element the board no longer contains.
  const board = () => host.querySelector(".lesson-interactive") as HTMLElement;
  const rows = () =>
    Array.from(board().querySelectorAll<HTMLElement>(".lesson-classify__row"));
  const called = () =>
    rows().filter((row) => row.querySelector(".lesson-classify__outcome") !== null).length;
  const take = (at: number, option: number) => {
    const chips = Array.from(
      (rows()[at] as HTMLElement).querySelectorAll<HTMLButtonElement>(
        ".lesson-interactive__chip",
      ),
    );
    expect(chips.length, `pair ${at} has no options to take`).toBe(2);
    (chips[option] as HTMLButtonElement).click();
  };
  const reveal = () =>
    host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");

  // Board 1 is equal, equal, not-equal: the second chip on pair 1 misses.
  take(0, 1);
  await waitFor(() => reveal() !== null, "the miss puts the reveal on offer");
  (reveal() as HTMLButtonElement).click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    "the first reveal opens",
  );

  // The fresh set, which is what makes the NEXT reveal the one that resolves.
  findButton(host, "Try again with different numbers").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") === null,
    "the teaching is dismissed",
  );
  await waitFor(() => called() === 0, "a fresh board is dealt");

  // Board 2 is not-equal, equal, equal: the first chip on pair 1 misses.
  take(0, 0);
  await waitFor(() => reveal() !== null, "the new miss offers the reveal");
  (reveal() as HTMLButtonElement).click();
  await waitFor(() => completed === 1, "the reveal after a redraw lets the learner past");

  // The board is still live and still has two pairs on it, so the line still has something
  // true to say. Both remaining pairs are genuine rationalizations on board 2.
  take(1, 0);
  await waitFor(() => called() === 2, "the second pair never settled");
  take(2, 0);
  await waitFor(() => called() === 3, "the third pair never settled");
  await new Promise<void>((resolve) => setTimeout(resolve, 60));

  const status = board().querySelector(".lesson-interactive__status");
  expect(
    status?.getAttribute("data-state"),
    "the finished board stopped reporting the miss",
  ).toBe("wrong");
  expect(
    (status?.textContent ?? "").toLowerCase(),
    "a resolved reveal took the board's line away for the rest of the board",
  ).toContain("you're good to move on");
});
