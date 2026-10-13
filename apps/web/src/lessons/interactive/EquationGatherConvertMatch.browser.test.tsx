import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { WidgetFeedbackHost } from "../widgetFeedback";
import { EquationGatherConvertMatch } from "./EquationGatherConvertMatch";

/**
 * EL.6 slide 2, gathered before it is converted.
 *
 * Every equation on a board shares a base, a second number and a right-hand side, so the
 * board cannot be read off: the only thing telling the four apart is which rule gathers
 * them, and the four results are each other's distractors. Reading the coefficient of
 * $2\log_{3} x$ as a factor lands on $\log_{3} (5x)$, which is somebody else's answer, so
 * that miss costs two.
 *
 * It is mounted inside `WidgetFeedbackHost` rather than bare because three of the claims
 * below are the HOST's: the badge that pops per correct join, the passage a reveal prints,
 * and the control that hands a part-answered board back.
 */

/** Board 1, left spoken form against right, in the order the left column deals them. */
const BOARD_ONE: readonly (readonly [string, string])[] = [
  ["log base 3 of x plus log base 3 of 5 equals 2", "log base 3 of 5 x equals 2"],
  ["log base 3 of x minus log base 3 of 5 equals 2", "log base 3 of x over 5 equals 2"],
  ["2 times log base 3 of x equals 2", "log base 3 of x squared equals 2"],
  [
    "2 times log base 3 of x plus log base 3 of 5 equals 2",
    "log base 3 of 5 x squared equals 2",
  ],
];

/** And board 2, which the restart deals. Different base, different numbers, same four rules. */
const BOARD_TWO: readonly (readonly [string, string])[] = [
  ["log base 5 of x plus log base 5 of 6 equals 3", "log base 5 of 6 x equals 3"],
  ["log base 5 of x minus log base 5 of 6 equals 3", "log base 5 of x over 6 equals 3"],
  ["3 times log base 5 of x equals 3", "log base 5 of x cubed equals 3"],
  [
    "3 times log base 5 of x plus log base 5 of 6 equals 3",
    "log base 5 of 6 x cubed equals 3",
  ],
];

const BOARDS: readonly (readonly (readonly [string, string])[])[] = [BOARD_ONE, BOARD_TWO];

const RESTART = "Start over on a different set of equations";
const RESUME = "Keep going on this question";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

interface Mounted {
  host: HTMLElement;
  completed: () => number;
  reopened: () => number;
  /** How many times the success badge has been put on screen since the mount. */
  badges: () => number;
}

async function mountBoard(): Promise<Mounted> {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <WidgetFeedbackHost>
      <EquationGatherConvertMatch
        onComplete={() => {
          completed += 1;
        }}
        onReopen={() => {
          reopened += 1;
        }}
      />
    </WidgetFeedbackHost>,
  );
  const { host } = h;

  // The badge is transient (it clears itself after about a second) and it is keyed on the
  // success count, so each pop is a fresh element. Counting insertions is therefore the
  // only way to tell "one badge per correct join" from "a badge at some point".
  let badges = 0;
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (
          node instanceof HTMLElement &&
          node.classList.contains("lesson-feedback-badge")
        ) {
          badges += 1;
        }
      }
    }
  });
  observer.observe(host, { childList: true, subtree: true });

  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );
  return {
    host,
    completed: () => completed,
    reopened: () => reopened,
    badges: () => badges,
  };
}

function widget(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    throw new Error("no widget mounted");
  }
  return found;
}

function pickUp(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Pick up ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no unjoined left item: ${spoken}`);
  }
  return found;
}

function joinTo(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Join what you are holding to ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no unjoined right item: ${spoken}`);
  }
  return found;
}

function isJoined(host: HTMLElement, left: string, right: string): boolean {
  return (
    host.querySelector(`button[aria-label="${left} is joined to ${right}"]`) !== null &&
    host.querySelector(`button[aria-label="${right} is joined to ${left}"]`) !== null
  );
}

/** Tap a left item, then tap a right one: what `usePickup` accepts in place of a drag. */
async function join(host: HTMLElement, left: string, right: string): Promise<void> {
  pickUp(host, left).click();
  joinTo(host, right).click();
  await waitFor(() => isJoined(host, left, right), `${left} joins ${right}`);
}

/** The spoken forms in the order each column is dealt, which is what the derangement is about. */
function dealt(host: HTMLElement): { lefts: string[]; rights: string[] } {
  const sides = Array.from(
    widget(host).querySelectorAll<HTMLElement>(".lesson-match__side"),
  );
  const [left, right] = sides;
  if (left === undefined || right === undefined) {
    throw new Error("the board is not two columns");
  }
  const names = (side: HTMLElement, prefix: string) =>
    Array.from(side.querySelectorAll<HTMLButtonElement>(".lesson-match__item")).map(
      (button) => (button.getAttribute("aria-label") ?? "").replace(prefix, ""),
    );
  return {
    lefts: names(left, "Pick up "),
    rights: names(right, "Join what you are holding to "),
  };
}

function passage(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".lesson-interactive__reveal");
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

function resumeButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__resume-button");
}

/** Long enough for a latch fired one commit late to have shown up. */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 60));
}

test("every pair joins, and the finished board opens the gate exactly once", async () => {
  const board = await mountBoard();
  const { host } = board;

  for (const [left, right] of BOARD_ONE.slice(0, 3)) {
    await join(host, left, right);
    expect(board.completed(), "the gate opened with pairs still unjoined").toBe(0);
  }

  const [left, right] = BOARD_ONE[3] as readonly [string, string];
  await join(host, left, right);
  await waitFor(() => board.completed() === 1, "the last pair opens the gate");
  expect(hasText(widget(host), "Gather first, then convert")).toBe(true);

  // Once, not once per render: the latch is idempotent and nothing here may re-fire it.
  await settle();
  expect(board.completed(), "the gate was opened more than once").toBe(1);
});

test("a coefficient read as a factor is refused, and nothing settles", async () => {
  const board = await mountBoard();
  const { host } = board;

  // $2\log_{3} x$ gathers to $\log_{3} x^{2}$, so joining it to $\log_{3} (5x)$ is the
  // coefficient read as a multiplier. That right item is another pair's answer, which is
  // what makes the miss cost two rather than being an empty slot.
  pickUp(host, "2 times log base 3 of x equals 2").click();
  joinTo(host, "log base 3 of 5 x equals 2").click();
  await waitFor(
    () => hasText(widget(host), "is not log base 3 of 5 x equals 2"),
    "the wrong join is refused and says which two it refused",
  );
  expect(
    hasText(widget(host), "2 times log base 3 of x equals 2 is not"),
    "the refusal does not name the item that was picked up",
  ).toBe(true);

  // Nothing settled: neither item joined, no badge, the gate shut.
  await settle();
  expect(board.completed(), "a refused join opened the gate").toBe(0);
  expect(board.badges(), "a refused join was confirmed as correct").toBe(0);
  expect(
    isJoined(host, "2 times log base 3 of x equals 2", "log base 3 of x squared equals 2"),
    "the refused join settled the pair anyway",
  ).toBe(false);
  expect(
    widget(host).querySelectorAll('.lesson-match__item[data-state="joined"]').length,
    "the refusal left something joined",
  ).toBe(0);

  // And the pair it belongs to is still there to be joined, so the miss cost only the join.
  await join(host, "2 times log base 3 of x equals 2", "log base 3 of x squared equals 2");
  await waitFor(
    () => board.badges() === 1,
    "the join that followed the refusal was not confirmed",
  );
});

test("each correct join pops its own badge, and a wrong one pops none", async () => {
  const board = await mountBoard();
  const { host } = board;

  const [firstLeft, firstRight] = BOARD_ONE[0] as readonly [string, string];
  await join(host, firstLeft, firstRight);
  await waitFor(() => board.badges() === 1, "the first correct join pops a badge");

  // A miss in the middle, so the count below cannot be a badge that simply never cleared.
  pickUp(host, "log base 3 of x minus log base 3 of 5 equals 2").click();
  joinTo(host, "log base 3 of 5 x squared equals 2").click();
  await waitFor(
    () => hasText(widget(host), "is not log base 3 of 5 x squared equals 2"),
    "the wrong join is refused",
  );
  await settle();
  expect(board.badges(), "a wrong join popped a badge").toBe(1);

  const [secondLeft, secondRight] = BOARD_ONE[1] as readonly [string, string];
  await join(host, secondLeft, secondRight);
  await waitFor(() => board.badges() === 2, "the second correct join pops its own badge");

  const [thirdLeft, thirdRight] = BOARD_ONE[2] as readonly [string, string];
  await join(host, thirdLeft, thirdRight);
  const [lastLeft, lastRight] = BOARD_ONE[3] as readonly [string, string];
  await join(host, lastLeft, lastRight);
  // Four judged joins, four badges: the one that opens the gate is not the only one.
  await waitFor(
    () => board.badges() === 4,
    "every correct join was confirmed in its own right",
  );
});

test("a reveal with pairs outstanding hands the board back and keeps the gate shut", async () => {
  const board = await mountBoard();
  const { host } = board;

  // One pair joined first. This is the work a reveal used to throw away.
  const [keptLeft, keptRight] = BOARD_ONE[0] as readonly [string, string];
  await join(host, keptLeft, keptRight);

  const [missedLeft, missedRight] = BOARD_ONE[2] as readonly [string, string];
  pickUp(host, missedLeft).click();
  joinTo(host, "log base 3 of 5 x squared equals 2").click();
  await waitFor(() => revealButton(host) !== null, "the miss puts the reveal on offer");

  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens");
  expect(
    hasText(passage(host) as HTMLElement, "goes INSIDE as an exponent"),
    "the passage states the answer without the reasoning behind it",
  ).toBe(true);
  expect(board.completed(), "the reveal opened the gate").toBe(0);

  // THE CLAIM: two pairs are still unjoined, so the board comes back rather than being spent.
  expect(
    resumeButton(host),
    "nothing offers the part-joined board back, so the unjoined pairs go with the miss",
  ).not.toBeNull();
  expect((resumeButton(host) as HTMLButtonElement).textContent).toBe(RESUME);
  expect(findButton(host, "Try again with different numbers")).not.toBeNull();

  (resumeButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the teaching is dismissed");
  expect(
    isJoined(host, keptLeft, keptRight),
    "the reveal threw away a pair the learner had already joined",
  ).toBe(true);
  // The explained pair came back UNANSWERED: it is pickable again and carries no given mark.
  expect(
    host.querySelector(`button[aria-label="Pick up ${missedLeft}"]`),
    "the explained pair did not come back as the learner's to produce",
  ).not.toBeNull();
  expect(
    widget(host).querySelector('[data-reveal-given="on"]'),
    "the handed answer outlived the passage",
  ).toBeNull();
  await settle();
  expect(board.completed(), "handing the board back handed the gate over with it").toBe(0);
  expect(board.reopened(), "handing the board back redrew it").toBe(0);

  // And the rest of the board is still the learner's to produce, the explained pair included.
  await join(host, missedLeft, missedRight);
  await settle();
  expect(board.completed(), "the gate opened with a pair still unjoined").toBe(0);
  await join(host, ...(BOARD_ONE[1] as readonly [string, string]));
  await settle();
  expect(board.completed(), "the gate opened with a pair still unjoined").toBe(0);
  await join(host, ...(BOARD_ONE[3] as readonly [string, string]));
  await waitFor(
    () => board.completed() === 1,
    "the board finished on the learner's own joins",
  );
});

test("the restart deals a different board and closes the gate behind it", async () => {
  const board = await mountBoard();
  const { host } = board;

  for (const [left, right] of BOARD_ONE) {
    await join(host, left, right);
  }
  await waitFor(() => board.completed() === 1, "the first board opens the gate");

  findButton(host, RESTART).click();
  await waitFor(
    () => host.querySelector(`button[aria-label="Pick up ${BOARD_TWO[0]?.[0]}"]`) !== null,
    "a different set of equations is dealt",
  );

  // Visibly different numbers, in both directions: the new base is on screen and the old
  // board's equations are gone, so this is a redraw rather than the same four re-shuffled.
  expect(hasMath(host, "\\log_{5} (6x)"), "the new board is not typeset").toBe(true);
  expect(hasMath(host, "\\log_{3} (5x)"), "the first board is still on screen").toBe(false);
  expect(
    host.querySelector(`button[aria-label="Pick up ${BOARD_ONE[0]?.[0]}"]`),
    "the first board's equations survived the restart",
  ).toBeNull();

  // And the gate is shut again, so the learner cannot walk past on the board they answered.
  expect(board.reopened(), "the restart left the gate latched").toBe(1);
  await settle();
  expect(board.completed(), "the fresh board opened the gate on its own").toBe(1);

  for (const [left, right] of BOARD_TWO) {
    await join(host, left, right);
  }
  await waitFor(
    () => board.completed() === 2,
    "the second board opens the gate in its turn",
  );
});

test("no right item is dealt against the left item it belongs to, on either board", async () => {
  const board = await mountBoard();
  const { host } = board;

  const seen: string[][] = [];
  for (let b = 0; b < BOARDS.length; b += 1) {
    const expected = BOARDS[b] as readonly (readonly [string, string])[];
    const key = new Map(expected.map(([left, right]) => [left, right] as const));
    await waitFor(() => dealt(host).lefts.length === 4, "the board deals four pairs");
    const { lefts, rights } = dealt(host);
    seen.push([...lefts]);

    expect(new Set(lefts), "the board dealt is not the one this key describes").toEqual(
      new Set(key.keys()),
    );
    expect(new Set(rights), "the right column is not this board's answers").toEqual(
      new Set(key.values()),
    );

    // THE DERANGEMENT. Position by position, so an option sitting opposite its own answer
    // fails at the position it sat in.
    for (let i = 0; i < lefts.length; i += 1) {
      const partner = key.get(lefts[i] as string);
      expect(partner, `no answer recorded for "${lefts[i]}"`).toBeDefined();
      expect(
        rights[i],
        `the answer to "${lefts[i]}" is dealt opposite it, at position ${i}`,
      ).not.toBe(partner);
    }
    // Stated on its own as well, because it is the one a learner meets first: the top
    // option is never the top answer.
    expect(rights[0], "the first option is the first answer").not.toBe(
      key.get(lefts[0] as string),
    );

    for (const [left, right] of expected) {
      await join(host, left, right);
    }
    findButton(host, RESTART).click();
    // Waited on the NEXT board's own equation, not merely on "something changed": the board
    // just solved has changed every one of its labels, so a difference proves nothing.
    const next = BOARDS[(b + 1) % BOARDS.length] as readonly (readonly [string, string])[];
    const opener = (next[0] as readonly [string, string])[0];
    await waitFor(
      () => host.querySelector(`button[aria-label="Pick up ${opener}"]`) !== null,
      "the restart did not deal the next board",
    );
  }

  // Both variants were actually visited, rather than the same board twice.
  expect(seen.length, "fewer than two variants were swept").toBe(2);
  const [first, second] = seen as [string[], string[]];
  expect(
    first.filter((left) => second.includes(left)).length,
    "the two variants share an equation, so they are not visibly different",
  ).toBe(0);
});

test("every equation and every option is typeset, and every control is named in words", async () => {
  const board = await mountBoard();
  const { host } = board;

  // The source, not the rendering: KaTeX's MathML duplicates every glyph, so `textContent`
  // reads a base 3 twice and a fraction not at all.
  expect(hasMath(host, "\\log_{3} x + \\log_{3} 5 = 2")).toBe(true);
  expect(hasMath(host, "\\log_{3} \\tfrac{x}{5} = 2")).toBe(true);
  expect(hasMath(host, "2\\log_{3} x = 2")).toBe(true);
  expect(hasMath(host, "\\log_{3} (5x^{2}) = 2")).toBe(true);

  const items = Array.from(
    widget(host).querySelectorAll<HTMLButtonElement>(".lesson-match__item"),
  );
  expect(items.length, "the board is not four pairs of controls").toBe(8);
  for (const item of items) {
    expect(
      item.querySelector("[data-latex]"),
      `an item is not typeset: ${item.getAttribute("aria-label")}`,
    ).not.toBeNull();
    // Every control spells its value out, because the glyphs cannot be read back.
    const name = item.getAttribute("aria-label") ?? "";
    expect(name.length, "a control carries no accessible name").toBeGreaterThan(20);
    expect(name, `a control's name is LaTeX rather than words: ${name}`).not.toContain(
      "\\",
    );
  }

  // The task line is the widget's first child, ahead of everything that answers it.
  const task = host.querySelector<HTMLElement>(".lesson-interactive__objective");
  expect(task, "no task line at all").not.toBeNull();
  for (const item of items) {
    expect(
      (task as HTMLElement).compareDocumentPosition(item) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      "a control comes before the task line",
    ).toBeGreaterThan(0);
  }
});
