/**
 * READING THE WORKING DOES NOT COST THE GATE THE LEARNER ALREADY EARNED.
 *
 * Two acts, and until now one control did both of them. A learner who has finished a board
 * has opened its gate by answering every part of it; the reveal beside that finished board is
 * an offer to explain the part they got wrong. Taking it used to freeze the instance and leave
 * exactly one way back to a live board — "Try again with different numbers" — which redraws,
 * and a redraw calls `onReopen`. So the price of reading an explanation was the "Next" the
 * learner had just earned, and the lesson taught them not to look.
 *
 * The instance may be handed BACK exactly when handing it back cannot hand over the gate. That
 * was already true of a board with answers still outstanding (`widgetRevealResume` owns that
 * case); it is equally true of a board whose gate is already open, because a gate that is open
 * cannot be opened by anything, and every answer it turned on was produced by the learner.
 *
 * ## What is NOT loosened, and where that is held open
 *
 * A reveal on a board whose gate is still SHUT is untouched: it teaches, it freezes, and the
 * only way back to a live board is a different question. That is the anti-frustration mechanism
 * and weakening it would let a learner reveal their way through a slide. Its guard is
 * `widgetRevealResume.browser.test.tsx`'s "the reveal on the last outstanding row is not
 * resumable", which fails the moment the hand-back is offered on a shut gate.
 *
 * ## Asking for a fresh question still costs the gate, and that is the point of the split
 *
 * The two acts are different, so both tests below end by taking the OTHER one: the fresh set
 * is still offered, and taking it still closes the gate. Choosing to do more work is not the
 * same as choosing to read.
 *
 * ## Population
 *
 * The boards this file can FINISH with a miss left on them, which is what puts a live reveal
 * beside an already-open gate. Two of them are the `REVEAL_AFTER_COMPLETION` names
 * `widgetRevealReAsk.browser.test.tsx` branches on, and the note there sets out why only one of
 * those reaches that state by construction: RAD.1's reveal is rendered inside a completion
 * branch, while RAD.2's is on offer from the first missed pair and is finished into this state by
 * `takes` below.
 *
 * ### It measured one era, and it measured it unfloored
 *
 * Those two are both RAD, and the table had no floor at all, so a board dropped while resolving
 * a conflict in this file would have taken its coverage with it and left every `test.each`
 * reporting green over what remained. Meanwhile D3 shipped boards finishing over a miss with a
 * reveal beside the open gate and not one of them was driven here.
 *
 * LIN.4's `compound-band-sorter` is added, and a floor and a COMPOSITION assertion under it: the
 * floor catches the table shrinking, and the composition catches it shrinking back to a single
 * lesson domain, which a floor of three cannot, since three of anything meets it.
 *
 * The one D3 board that cannot be driven here is `abs-count-classify`, and it is worth saying
 * why rather than leaving it looking overlooked: its reveal is offered on the first row still
 * OUTSTANDING, so a finished board has nothing for it to explain and the control is gone by the
 * time the gate opens. It has no reveal-beside-an-open-gate state to hold to this rule. Its
 * miss-forgiving gate is driven in `widgetMissedBoardGate.browser.test.tsx` instead, and the
 * credit its reveal must not take in `revealCredit.browser.test.tsx`.
 */

import { afterEach, expect, test } from "vitest";

import { LESSON_DOMAINS } from "./domains";
import { type Harness, hasText, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

/**
 * Which lesson domain places each visual, read off the registry rather than written down, so
 * the composition assertion below cannot be satisfied by a table of stale labels.
 */
const DOMAIN_OF_VISUAL = new Map<string, string>(
  LESSON_DOMAINS.flatMap((domain) =>
    domain.lessons.flatMap((lesson) =>
      (lesson.visuals ?? []).map((visual) => [visual.id, domain.id] as [string, string]),
    ),
  ),
);

interface Board {
  id: LessonVisualId;
  /** The answerable parts of the board, in the order they are drawn. */
  rows: string;
  /**
   * Which option to take on each row so exactly ONE row is missed and every other row is
   * called correctly: the board is FINISHED, so its gate is open, and it has something left
   * for a reveal to explain.
   */
  takes: readonly number[];
  /** True once this row will not accept another answer. */
  settled: (row: HTMLElement) => boolean;
  /** The label the widget's own fresh-deal control carries on a missed board. */
  freshLabel: string;
  /**
   * One piece of math the FINISHED board carries, which a fresh deal has to move off it.
   *
   * Read from the row as it is STATED, not as it settles. `perfect-root-classify` was pinned
   * here at `\sqrt{81} = 9`, a string that only ever existed because `BinaryRowSort` swapped a
   * settled row's expression for its worked reading; that swap has gone, on the rule that the
   * question a learner is checking their own call against does not leave the screen. So the
   * value has to be one the board carries in every state, which is what the row asks about.
   */
  math: string;
}

const BOARDS: readonly Board[] = [
  {
    // RAD.1, on the shared `BinaryRowSort` kind. Board 1 is 81, 24, 64, 45 — perfect, not,
    // perfect, not — so taking option 1 on row 0 misses a perfect square.
    id: "perfect-root-classify",
    rows: ".lesson-classify__item",
    takes: [1, 1, 0, 1],
    settled: (row) => row.dataset.settled === "true",
    freshLabel: "Try a fresh set",
    // Board 1 only: the second pool is 32, 121, 27, 144, so a fresh deal genuinely moves this
    // off the board and the second half of the assertion below stays load-bearing.
    math: "\\sqrt{81}",
  },
  {
    // RAD.2, bespoke. Board 1 is equal, equal, not-equal, and the options are "Same value"
    // then "Different value", so taking option 1 on row 0 misses.
    //
    // The bare row class, because the `--compare` modifier this used to name was a hardcoded set
    // of grid tracks and the board now owns its columns outright. The count check in
    // `finishWithAMiss` is what keeps the looser selector honest: a row it picks up that this
    // sweep was not written for fails there rather than being driven blind. Measured, at a stray
    // fourth row: `expected 4 to be 3`.
    id: "rationalize-explore",
    rows: ".lesson-classify__row",
    takes: [1, 0, 1],
    settled: (row) => row.querySelector(".lesson-classify__outcome") !== null,
    freshLabel: "Try a fresh set",
    math: "\\tfrac{1}{\\sqrt{2}}",
  },
  {
    // D3 LIN.4, on the same `BinaryRowSort` kind as RAD.1 but on its own content and its own
    // copy. Board 1 is one band, two bands, one band, one band, and the options are "One band"
    // then "Two separated bands", so taking option 1 on row 0 misses.
    //
    // Board 1 row 0's rule AS STATED, for the reason given on `math` above, and this entry is
    // why that reason is worth restating. It was pinned at `[8, 21]`, the interval the row used
    // to rewrite itself into once it settled, and it was correct when it was written: this
    // board carried a `settledLatex` on every row. #456 then removed that field from all eight
    // rows, on the same rule that re-pinned `perfect-root-classify` here, and moved the
    // intervals it printed into the reveal prose instead.
    //
    // Neither side of that was wrong and git merged them without a word, because the two
    // changes touch different files: the pin below lived only on this branch, so #456 could not
    // have re-pinned it, and this board was not in the table #456 was reading. What is left is
    // an assertion for a rewrite the widget no longer performs.
    id: "compound-band-sorter",
    rows: ".lesson-classify__item",
    takes: [1, 1, 0, 0],
    settled: (row) => row.dataset.settled === "true",
    freshLabel: "Try a fresh set",
    // Board 1 only: board 2 opens on `w \le 9 or w \ge 26` and never states this rule, so the
    // fresh-deal half of the assertion below stays load-bearing rather than passing on a string
    // that was never going to move.
    math: "8 \\le w \\le 21",
  },
];

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function widget(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    throw new Error("no widget mounted");
  }
  return found;
}

/** The wrapper the host freezes while a reveal is being read. */
function stage(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-feedback-host__stage");
  if (found === null) {
    throw new Error("no feedback stage mounted");
  }
  return found;
}

function passage(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".lesson-interactive__reveal");
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

function keepButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__resume-button");
}

function reAskButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button");
}

/** The widget's OWN fresh deal, the one that sits beside the reveal on a finished board. */
function freshButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
}

function boardMath(host: HTMLElement): string[] {
  return Array.from(widget(host).querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
}

interface Played {
  host: HTMLElement;
  completed: () => number;
  reopened: () => number;
}

/**
 * Finish the board with one row missed, and stop with the reveal on offer beside an open gate.
 *
 * The reveal is not pressed here: which of the two acts follows is what each test is about.
 * `onComplete` and `onReopen` are both passed, because a lesson slide passes both together
 * (`AdvisorLesson` keys them off the same `v.gates`) and the gate this file is about is the
 * one they define.
 */
async function finishWithAMiss(board: Board): Promise<Played> {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <LessonVisual
      id={board.id}
      onComplete={() => {
        completed += 1;
      }}
      onReopen={() => {
        reopened += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    `${board.id} mounts`,
  );

  const rowsNow = () => Array.from(widget(host).querySelectorAll<HTMLElement>(board.rows));
  expect(rowsNow().length, `${board.id}: the board is not the shape this test drives`).toBe(
    board.takes.length,
  );

  for (const [at, take] of board.takes.entries()) {
    const options = Array.from(
      (rowsNow()[at] as HTMLElement).querySelectorAll<HTMLButtonElement>(
        ".lesson-interactive__chip",
      ),
    );
    expect(options.length, `${board.id}: row ${at} has no options to take`).toBeGreaterThan(
      1,
    );
    options[take]?.click();
    await waitFor(
      () => board.settled(rowsNow()[at] as HTMLElement),
      `${board.id}: row ${at} never settled`,
    );
  }

  // The precondition every claim below rests on: the learner ANSWERED their way to an open
  // gate, and the reveal is offered on the board that opened it. Without this the tests would
  // be about a shut gate and would prove the opposite of what they look like.
  await waitFor(() => completed === 1, `${board.id}: the finished board opened the gate`);
  expect(reopened, `${board.id}: something closed the gate before the reveal`).toBe(0);
  await waitFor(
    () => revealButton(host) !== null,
    `${board.id}: the finished board offers the working`,
  );
  return { host, completed: () => completed, reopened: () => reopened };
}

/**
 * The floor and the shape of the population, which `test.each` over a literal table asserts
 * nothing about. Every property below would keep reporting green on one board, or on none.
 */
test("the sweep drives every board it claims to", () => {
  expect(BOARDS.length, "the driven population shrank").toBeGreaterThanOrEqual(3);
  expect(new Set(BOARDS.map((board) => board.id)).size, "a board is driven twice").toBe(
    BOARDS.length,
  );
  for (const board of BOARDS) {
    expect(
      board.takes.length,
      `${board.id}: a board needs at least two parts for one of them to be a miss`,
    ).toBeGreaterThan(1);
    // A dead id contributes no domain, which would shrink the composition claim silently.
    expect(
      DOMAIN_OF_VISUAL.get(board.id),
      `${board.id}: no lesson places this board, so the sweep is driving a dead id`,
    ).toBeDefined();
  }

  const domains = new Set(BOARDS.map((board) => DOMAIN_OF_VISUAL.get(board.id)));
  expect(
    domains.size,
    `every board driven here is placed by the same lesson domain (${[...domains].join(", ")}), so this is the single-era sweep again`,
  ).toBeGreaterThanOrEqual(2);
});

test.each(BOARDS)(
  "$id: reading the working on a finished board keeps the gate the learner earned",
  async (board) => {
    const { host, completed, reopened } = await finishWithAMiss(board);

    // The button may not promise a fresh set here, because it is not about to deal one. The
    // promise is the deterrent in words: "Show the working, then try a new set" tells a
    // learner who has just finished the board that reading it will cost them the board.
    expect(
      revealButton(host)?.textContent ?? "",
      `${board.id}: the reveal still threatens to take the set`,
    ).not.toContain("then try a new set");

    (revealButton(host) as HTMLButtonElement).click();
    await waitFor(() => passage(host) !== null, `${board.id}: the reveal passage opens`);
    const taught = passage(host) as HTMLElement;
    expect(hasText(taught, "Answer revealed."), `${board.id}: it teaches`).toBe(true);
    expect(
      taught.textContent?.length ?? 0,
      `${board.id}: the reasoning is there`,
    ).toBeGreaterThan(100);
    // Frozen while it is read, exactly as on a shut gate: one thing at a time, and the
    // board's own controls are behind the passage until the learner chooses.
    expect(stage(host).hasAttribute("inert"), `${board.id}: the board is held`).toBe(true);

    // THE CLAIM. Two ways back to a live board, not one, and the one that keeps it says so.
    expect(
      keepButton(host),
      `${board.id}: nothing offers the finished board back, so the only way on is a redraw`,
    ).not.toBeNull();
    expect(
      reAskButton(host),
      `${board.id}: the fresh set stopped being offered`,
    ).not.toBeNull();
    expect(
      keepButton(host)?.textContent ?? "",
      `${board.id}: the control does not say the numbers stay put`,
    ).toBe("Keep this question as it is");

    (keepButton(host) as HTMLButtonElement).click();
    await waitFor(() => passage(host) === null, `${board.id}: the teaching is dismissed`);
    expect(stage(host).hasAttribute("inert"), `${board.id}: the board is live again`).toBe(
      false,
    );
    // Focus follows the board back rather than falling to the document. It cannot land on
    // "whatever they answer with" here, because a finished board has every one of those
    // disabled, so the landing has to be the one live control the board still has.
    await waitFor(
      () => widget(host).contains(document.activeElement),
      `${board.id}: dismissing the teaching dropped focus off the board`,
    );
    // Give a stray `onReopen` a commit to land in before reading the counter, so this cannot
    // pass by measuring too early.
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    expect(
      reopened(),
      `${board.id}: reading the working closed the gate the learner had earned`,
    ).toBe(0);
    // And it was not re-earned to get there either: nothing re-latched, so the count that
    // matters is still the learner's own single pass.
    expect(completed(), `${board.id}: the gate was opened a second time`).toBe(1);

    // The other act is still one click away, and it still costs what it always did.
    const fresh = freshButton(host);
    expect(fresh, `${board.id}: the board's own fresh deal is gone`).not.toBeNull();
    expect(
      fresh?.textContent ?? "",
      `${board.id}: the fresh deal is not the missed-board one`,
    ).toContain(board.freshLabel);
    (fresh as HTMLButtonElement).click();
    await waitFor(
      () => reopened() === 1,
      `${board.id}: asking for a fresh set left the gate latched`,
    );
  },
);

/* ------------------------------------------------- the gate that was given back */

/**
 * A gate that was earned and then handed back for a fresh instance does not go on excusing
 * the reveal.
 *
 * This is the other side of the same wiring, and it is where getting it wrong would be
 * DANGEROUS rather than merely mean: if the surface reported an open gate that the learner had
 * already surrendered to a redraw, the reveal on the last outstanding answer of the new
 * instance would hand that instance back, and typing the revealed answer into it would open a
 * gate on a question nobody worked. So the flag has to come back down, and the way to see that
 * it did is a reveal that must still refuse to hand the board back.
 *
 * It runs on the fill-table rather than on the two boards above, because those two offer no
 * reveal until every part is called and a called board opens its gate again: on them the flag
 * going back up is honest, so they cannot tell a stuck flag from a correct one. This widget
 * has two blank rows, so it can be finished, restarted, and then brought to a reveal on its
 * LAST outstanding row with the gate genuinely shut.
 */
test("fill-table: a gate given back for a fresh instance stops excusing the reveal", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <LessonVisual
      id="zero-exponent-table"
      onComplete={() => {
        completed += 1;
      }}
      onReopen={() => {
        reopened += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-table__slot") !== null,
    "the table mounts",
  );

  const openRow = () => {
    const found = widget(host).querySelector<HTMLButtonElement>(".lesson-table__slot");
    if (found === null) {
      throw new Error("no open row");
    }
    return found;
  };
  const chip = (spoken: string) => {
    const found = Array.from(
      widget(host).querySelectorAll<HTMLElement>("[aria-label]"),
    ).find((node) => node.getAttribute("aria-label") === spoken);
    if (found === undefined) {
      throw new Error(`no chip named "${spoken}"`);
    }
    return found;
  };
  const fill = (spoken: string) => {
    chip(spoken).click();
    openRow().click();
  };

  // Board one is base 3: earn the gate outright, both rows right.
  fill("3");
  await waitFor(
    () => (openRow().getAttribute("aria-label") ?? "").includes("3 to the 0"),
    "the table moves on to the last row",
  );
  fill("one");
  await waitFor(() => completed === 1, "the finished table opened the gate");

  // Then give it back for a fresh instance, which is the act that legitimately costs it.
  Array.from(host.querySelectorAll("button"))
    .find((b) => (b.textContent ?? "").includes("Start over with a different base"))
    ?.click();
  await waitFor(() => reopened === 1, "the fresh base closed the gate again");
  await waitFor(
    () => (openRow().getAttribute("aria-label") ?? "").includes("5 to the 1"),
    "board two is base 5",
  );

  // Now bring the NEW instance to a reveal on its last outstanding row, with the gate shut.
  fill("5");
  await waitFor(
    () => (openRow().getAttribute("aria-label") ?? "").includes("5 to the 0"),
    "the new table moves on to its last row",
  );
  fill("zero");
  await waitFor(() => revealButton(host) !== null, "the miss puts the reveal on offer");
  // The warning is back on the label, because a fresh set really is what this reveal costs.
  expect(
    revealButton(host)?.textContent ?? "",
    "the reveal stopped saying it would cost the set",
  ).toContain("then try a new set");

  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens");
  expect(
    keepButton(host),
    "the last answer of a shut-gate instance was handed back on the strength of a gate the learner had already given up",
  ).toBeNull();
  expect(reAskButton(host), "the fresh instance is offered").not.toBeNull();
  expect(completed, "the reveal opened the gate").toBe(1);
});

test.each(BOARDS)(
  "$id: from inside the reveal, asking for a fresh set still closes the gate",
  async (board) => {
    const { host, reopened } = await finishWithAMiss(board);
    const before = boardMath(host);
    expect(before, `${board.id}: no math was measured on the finished board`).toContain(
      board.math,
    );

    (revealButton(host) as HTMLButtonElement).click();
    await waitFor(() => passage(host) !== null, `${board.id}: the reveal passage opens`);
    (reAskButton(host) as HTMLButtonElement).click();

    // Choosing to do more work reopens the gate: this is the half that must NOT be loosened.
    await waitFor(
      () => reopened() === 1,
      `${board.id}: the fresh set left the gate latched`,
    );
    await waitFor(
      () => !boardMath(host).includes(board.math),
      `${board.id}: the fresh set dealt the same numbers`,
    );
    expect(
      passage(host),
      `${board.id}: the teaching outlived the board it explained`,
    ).toBeNull();
  },
);
