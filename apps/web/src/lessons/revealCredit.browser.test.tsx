/**
 * A REVEAL HANDS OVER THE EXPLANATION. IT MAY NOT HAND OVER THE CREDIT, OR THE GATE.
 *
 * Two boards, two halves of the same rule, and both were reachable on LIN.5.
 *
 * ## The credit
 *
 * `AbsCountClassify`'s reveal wrote the row's TRUE count into the record of what the LEARNER
 * had called, so the row came back painted `chosenRight`, ticked, and announced as
 * "…, your answer, correct" — an answer the learner never gave, credited to them in the same
 * three channels their own answers are. And because the board's miss count only counts calls
 * that DISAGREE with the truth, a board with a row handed over still read as a clean run in
 * `data-state`. Every other bespoke D3 board writes a wrong verdict in its reveal for exactly
 * this reason (`BothPansBuilder`, `FormulaIsolateBuilder`, `AbsUnionBuilder`,
 * `AbsBranchBuilder`, `FormulaCheckPlay`), so this one was the outlier.
 *
 * The mark the revealed row owes is the one the family already has a name for: `standing`,
 * "the right call here, which you did not pick". It is a statement about the board rather than
 * a verdict on anybody, which is exactly what a row nobody answered needs.
 *
 * ## The gate
 *
 * `OffStandardStepper`'s reveal states BOTH weights unconditionally, and it passed
 * `othersRemain={found.size === 1}`: on the reveal taken with one weight already found — the
 * reveal that has just named the only outstanding answer — the board was offered BACK. Taking
 * it back does not run `resolve`, so the gate was still shut, and the learner could step to the
 * value they had just been told and open it on an answer they were given.
 * `widgetMechanics.ts` states the rule: on the reveal that explains the LAST outstanding
 * answer the flag is false, "and then handing the instance back would be handing over the
 * gate".
 *
 * `revealReAsk.test.ts` cannot see either of these. It refuses a literal `true` and reads the
 * `answer` expression's source; both boards satisfied it while doing this.
 *
 * ## Both claims are about a played board, not about a source
 *
 * Which is why they are here rather than in a source sweep: the credit is a rendered mark and
 * an accessible name, and the hand-back is a control that either is or is not on screen at one
 * particular moment of one particular sequence.
 */

import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

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

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

function passage(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".lesson-interactive__reveal");
}

/** The control that hands the instance back, which is the one at stake in the second test. */
function keepButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__resume-button");
}

function reAskButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button");
}

/* ------------------------------------------------------------------------- the credit */

/**
 * Board one is $\lvert x - 7 \rvert = 3$, $\lvert x + 5 \rvert = -8$, $\lvert 4x - 6 \rvert = 0$,
 * $\lvert x - 2 \rvert + 9 = 4$; board two is $\lvert 2x + 5 \rvert = 0$,
 * $\lvert 5 - x \rvert = 11$, $3\lvert x + 1 \rvert = 12$, $\lvert 6x - 1 \rvert = -2$. The
 * calls are drawn `0, 1, 2` in that order, so these are the right options on board two, read
 * off its own first instance.
 */
const BOARD_TWO_RIGHT = [1, 2, 2, 0] as const;

test("abs-count-classify: the row a reveal explains is not marked as the learner's own answer", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual
      id="abs-count-classify"
      onComplete={() => {
        completed += 1;
      }}
      onReopen={() => {}}
    />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );

  const rows = () =>
    Array.from(widget(host).querySelectorAll<HTMLElement>(".lesson-classify__item"));
  const chipsIn = (at: number) =>
    Array.from(
      (rows()[at] as HTMLElement).querySelectorAll<HTMLButtonElement>(
        ".lesson-interactive__chip",
      ),
    );
  const settled = (at: number) => (rows()[at] as HTMLElement).dataset.settled === "true";
  const call = (at: number, option: number) => {
    (chipsIn(at)[option] as HTMLButtonElement).click();
  };

  expect(rows().length, "the board is not the four-row shape this test drives").toBe(4);
  expect(chipsIn(0).length, "a row has no calls under it").toBe(3);

  // The first instance exists only to spend the first reveal, which teaches and re-asks by
  // contract. Only a reveal on a REDRAWN instance runs the widget's own `reveal`, which is the
  // code under test.
  call(0, 0);
  await waitFor(() => settled(0), "the first call never settled");
  await waitFor(() => revealButton(host) !== null, "the called board offers the working");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the first reveal opens");
  (reAskButton(host) as HTMLButtonElement).click();
  await waitFor(
    () => rows().every((row) => row.dataset.settled !== "true"),
    "a fresh board is dealt",
  );

  // Two rows the learner really does answer, and answers correctly. They are also the floor
  // under the claim below: `chosenRight` has to be a mark this board still paints somewhere,
  // or "the revealed row does not carry it" would hold over a renamed attribute.
  call(0, BOARD_TWO_RIGHT[0]);
  await waitFor(() => settled(0), "the first call on the fresh board never settled");
  call(1, BOARD_TWO_RIGHT[1]);
  await waitFor(() => settled(1), "the second call on the fresh board never settled");
  expect(
    widget(host).querySelectorAll('[data-mark="chosenRight"]').length,
    "the learner's own two correct calls are not marked, so the claim below proves nothing",
  ).toBe(2);

  // The reveal that RESOLVES: the instance has been redrawn, so this one runs the widget's
  // `reveal` and lets the learner past.
  await waitFor(
    () => revealButton(host) !== null,
    "the part-called board offers the working",
  );
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the second reveal opens");
  await waitFor(
    () => reAskButton(host) === null,
    "the reveal on the redrawn instance is still holding the board",
  );
  await waitFor(() => settled(2), "the row the reveal explained never settled");

  // THE CLAIM. The row was handed over, so nothing on it is the learner's answer.
  const revealed = rows()[2] as HTMLElement;
  expect(
    revealed.querySelectorAll('[data-mark="chosenRight"]').length,
    "the row the reveal explained is marked as the learner's own correct answer",
  ).toBe(0);
  const spoken = Array.from(
    revealed.querySelectorAll<HTMLButtonElement>(".lesson-interactive__chip"),
  ).map((chip) => chip.getAttribute("aria-label") ?? "");
  expect(spoken.length, "the revealed row has no options to read").toBe(3);
  expect(
    spoken.join(" | "),
    "a call the learner never made is announced as their answer",
  ).not.toContain("your answer");
  // And it still SAYS what the right call was, in the mark the family keeps for a call nobody
  // made. Withholding the credit is not the same as withholding the teaching.
  expect(
    revealed.querySelectorAll('[data-mark="standing"]').length,
    "the revealed row does not name the call that was right here",
  ).toBe(1);

  // Finish the board the learner's own way, and read what it then claims about the run.
  call(3, BOARD_TWO_RIGHT[3]);
  await waitFor(() => settled(3), "the last row never settled");
  expect(completed, "the gate never opened on a board with every row settled").toBe(1);
  const status = widget(host).querySelector(".lesson-interactive__status");
  expect(
    status,
    "the board prints no status line, so the state below is not being read",
  ).not.toBeNull();
  expect(
    status?.getAttribute("data-state"),
    "the board reports a clean run over a row it handed the learner",
  ).not.toBe("solved");
});

/* --------------------------------------------------------------------------- the gate */

/**
 * Board one is a standard of 40 with an error of 3, so the two weights are 37 and 43 and the
 * scale runs 34 to 46. Stepping down three times lands on 37 and leaves 43 outstanding, which
 * is the state where the reveal explains the LAST answer the board is asking for.
 */
test("off-standard-stepper: the reveal that names the last weight does not hand the board back", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual
      id="off-standard-stepper"
      onComplete={() => {
        completed += 1;
      }}
      onReopen={() => {}}
    />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );

  const lighter = () => {
    const found = Array.from(
      widget(host).querySelectorAll<HTMLButtonElement>("button"),
    ).find((b) => b.getAttribute("aria-label") === "Take the weight one mina lighter");
    if (found === undefined) {
      throw new Error("no step-down control on the board");
    }
    return found;
  };
  /** The standing marks: one dashed ring per weight the learner has landed on. */
  const found = () => widget(host).querySelectorAll("circle[stroke-dasharray]").length;

  for (let step = 0; step < 3; step += 1) {
    lighter().click();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  await waitFor(() => found() === 1, "the weight never landed on the first target");
  expect(completed, "the board opened its gate on one weight").toBe(0);

  await waitFor(() => revealButton(host) !== null, "the walked board offers the working");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal opens");

  // The premise, measured rather than assumed: the passage names BOTH weights, so by the time
  // it is on screen there is nothing left on this board that the learner has not been told.
  const taught = passage(host) as HTMLElement;
  const answer = Array.from(taught.querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  expect(
    answer.join(" "),
    "the passage does not state both weights, so this is not the case the claim is about",
  ).toContain("w = 37 \\;\\text{ and }\\; w = 43");

  // THE CLAIM. Nothing is outstanding that the passage has not just given away, and the gate
  // is still shut, so the board may not be handed back: taking it back does not resolve, and
  // the learner would step to a value they were told and latch the gate on it.
  expect(
    completed,
    "the gate opened before the claim, so the hand-back would be the earned kind",
  ).toBe(0);
  expect(
    keepButton(host),
    "the board is offered back on the reveal that named the only weight still outstanding",
  ).toBeNull();
  expect(
    reAskButton(host),
    "the fresh set is not offered either, so the learner is stranded",
  ).not.toBeNull();
});
