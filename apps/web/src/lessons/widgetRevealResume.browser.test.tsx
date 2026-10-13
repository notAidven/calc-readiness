/**
 * A reveal on ONE answer of several hands the board back, and the gate still wants all of it.
 *
 * The defect this is written against, reported off EXP.1 slide 0: the learner dropped the
 * wrong name on the raised 4 of $7^{4}$, took the reveal that the miss put on offer, and the
 * whole widget ended there. Two names were still on the tray, one slot they had already
 * placed correctly was about to be thrown away, and the only control on screen was "Try again
 * with different numbers". A three-slot labelling task is three answers, so a reveal spent on
 * one of them may not spend the other two.
 *
 * Two claims, and they pull in opposite directions, which is why neither is asserted without
 * the other:
 *
 *  1. THE BOARD SURVIVES. After a wrong placement and the reveal that follows it, the learner
 *     keeps every name they had already placed, gets the explained slot back empty, and can
 *     finish the figure.
 *  2. THE GATE DOES NOT MOVE. Finishing is still the only thing that opens it. The explained
 *     slot comes back UNANSWERED, so `onComplete` does not fire until the learner has placed
 *     it themselves, and a reveal on the LAST outstanding answer is not resumable at all —
 *     there the instance is spent exactly as it always was, because handing it back there
 *     would be handing over the gate.
 *
 * `widgetRevealReAsk.browser.test.tsx` owns the other half of the mechanic and still passes
 * unchanged on all 37 reveal widgets, which is what says the way OUT is untouched: a learner
 * who takes the fresh instance and still cannot do it is let through on the next reveal. The
 * last test here is the one new path in that story — that resuming does not spend the way out.
 */

import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasText, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

const RESUME = "Keep going on this question";
const RE_ASK = "Try again with different numbers";

function widget(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    throw new Error("no widget mounted");
  }
  return found;
}

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

function resumeButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__resume-button");
}

function status(host: HTMLElement): string {
  return host.querySelector(".lesson-interactive__status")?.textContent ?? "";
}

/** The one element under `host` whose accessible name is exactly `name`. */
function named(host: HTMLElement, name: string): HTMLElement {
  const found = Array.from(host.querySelectorAll<HTMLElement>("[aria-label]")).filter(
    (node) => node.getAttribute("aria-label") === name,
  );
  if (found.length !== 1) {
    throw new Error(`expected one element named "${name}", found ${found.length}`);
  }
  return found[0] as HTMLElement;
}

function isNamed(host: HTMLElement, name: string): boolean {
  return Array.from(host.querySelectorAll("[aria-label]")).some(
    (node) => node.getAttribute("aria-label") === name,
  );
}

/** Tap a chip, then tap a target: what `usePickup` accepts in place of a drag. */
function carry(host: HTMLElement, chip: string, target: string): void {
  named(host, chip).click();
  named(host, target).click();
}

/* ------------------------------------------------------------------ EXP.1 slide 0 */

/**
 * The reported widget, on its opening board: $3^{5}$ written out as five copies of $3$, with
 * a slot under each of the three parts. Names as the tray offers them, targets as the slots
 * are called before anything is placed.
 */
const BASE_CHIP = "base";
const EXPONENT_CHIP = "exponent";
const PRODUCT_CHIP = "five copies of the base";
const BASE_SLOT = "Label for the 3 on the line";
const EXPONENT_SLOT = "Label for the raised 5";
const PRODUCT_SLOT = "Label for the written out product";

test("label-parts: a wrong placement and its reveal leave the figure finishable", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual
      id="power-parts-label"
      onComplete={() => {
        completed += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the figure mounts",
  );

  // One name placed correctly. This is the work the reveal used to destroy.
  carry(host, BASE_CHIP, BASE_SLOT);
  await waitFor(
    () => isNamed(host, "the 3 on the line is labelled base"),
    "the base is labelled",
  );

  // And then the reported mistake: the written-out product's name, dropped on the exponent.
  carry(host, PRODUCT_CHIP, EXPONENT_SLOT);
  await waitFor(() => revealButton(host) !== null, "the miss puts the reveal on offer");
  expect(status(host), "the miss is named").toContain("does not belong on the raised 5");
  expect(completed, "a wrong placement opened the gate").toBe(0);

  // Take the reveal, which is where the round used to end.
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens");
  expect(hasText(passage(host) as HTMLElement, "Answer revealed."), "it teaches").toBe(
    true,
  );
  expect(stage(host).hasAttribute("inert"), "the board is held while it is read").toBe(
    true,
  );
  // The answer is filled into the slot it belongs to while the passage names it, and the slot
  // says out loud that it was given rather than answered.
  expect(
    isNamed(
      host,
      "the written out product was given the label five copies of the base, not answered",
    ),
    "the explained slot shows the answer it was handed",
  ).toBe(true);

  // TWO ways forward, where there used to be one. Losing the board is now the fallback.
  expect(resumeButton(host), "nothing offers the board back").not.toBeNull();
  expect(findButton(host, RE_ASK), "the fresh instance is still offered").not.toBeNull();
  // The control says in WORDS what it does, which is the only carrier this change adds: no
  // new mark goes on the board, so nothing here rests on telling two colours apart.
  expect(
    (resumeButton(host) as HTMLButtonElement).textContent,
    "the control does not name what it does",
  ).toBe(RESUME);

  (resumeButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the teaching is dismissed");
  expect(stage(host).hasAttribute("inert"), "the board is live again").toBe(false);
  // The name placed before the reveal is still placed: this is claim 1.
  expect(
    isNamed(host, "the 3 on the line is labelled base"),
    "the reveal threw away work the learner had got right",
  ).toBe(true);
  // And the explained slot is EMPTY again, not answered and not given: this is claim 2. The
  // fill lived on the same flag as the freeze, so it goes when the freeze goes.
  expect(isNamed(host, PRODUCT_SLOT), "the explained slot came back unanswered").toBe(true);
  expect(
    widget(host).querySelector('[data-reveal-given="on"]'),
    "the given mark outlived the passage",
  ).toBeNull();
  expect(completed, "resuming opened the gate").toBe(0);

  // Finish it. The second of three names, and the gate must stay shut: the part that was
  // explained is still outstanding, and being told an answer is not producing it.
  carry(host, EXPONENT_CHIP, EXPONENT_SLOT);
  await waitFor(
    () => isNamed(host, "the raised 5 is labelled exponent"),
    "the exponent lands",
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 60));
  expect(completed, "the gate opened with a slot still empty").toBe(0);

  // The third, which is the one the reveal explained. Now the figure is finished.
  carry(host, PRODUCT_CHIP, PRODUCT_SLOT);
  await waitFor(() => completed === 1, "the finished figure opens the gate");
  expect(
    hasText(widget(host), "Every part named"),
    "the tray reports the figure done",
  ).toBe(true);
});

/* --------------------------------------------------------------- the last answer */

/**
 * EXP.1 slide 4's ledger: two worked rows, then two blanks filled from the top down. The
 * boundary lives inside one widget here, which is why this is the table rather than a third
 * label: the FIRST blank has another row under it and is resumable, and the SECOND is the row
 * the gate turns on and is not.
 */
test("fill-table: the reveal on the last outstanding row is not resumable", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual
      id="zero-exponent-table"
      onComplete={() => {
        completed += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-table__slot") !== null,
    "the table mounts",
  );

  const slot = () => {
    const found = widget(host).querySelector<HTMLButtonElement>(".lesson-table__slot");
    if (found === null) {
      throw new Error("no open row");
    }
    return found;
  };

  // Row one of two, missed with the value this slide exists to displace.
  named(host, "zero").click();
  slot().click();
  await waitFor(() => revealButton(host) !== null, "the miss puts the reveal on offer");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens");
  expect(resumeButton(host), "a row with rows under it is not resumable").not.toBeNull();

  (resumeButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the teaching is dismissed");
  expect(completed, "resuming opened the gate").toBe(0);

  // The learner fills that row themselves, which is what the resume left them to do.
  named(host, "3").click();
  slot().click();
  await waitFor(
    () => (slot().getAttribute("aria-label") ?? "").includes("3 to the 0"),
    "the table moves on to the last row",
  );
  expect(completed, "one row short and the gate is open").toBe(0);

  // The last row IS the gate, so a reveal here spends the instance exactly as it always did:
  // one way forward, and it is a different question.
  named(host, "zero").click();
  slot().click();
  await waitFor(() => revealButton(host) !== null, "the last row's miss offers the reveal");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens again");
  expect(
    resumeButton(host),
    "the last answer was handed back with the gate on it",
  ).toBeNull();
  expect(findButton(host, RE_ASK), "the fresh instance is offered").not.toBeNull();
  expect(completed, "the reveal opened the gate").toBe(0);
});

/* -------------------------------------------------------------- RAD.2 slide 3 */

/**
 * The same defect, on a BESPOKE widget, found by widening the source guard rather than by
 * looking.
 *
 * `RationalizeExplore` asks for three predictions and passed no `othersRemain` at all, so a
 * learner who missed the first pair and read the algebra was offered nothing but a fresh set:
 * the two pairs they had not yet called went with the one they got wrong. It survived `#184`
 * and `#214` because `revealReAsk.test.ts` asked for the flag only from the seven `kinds/`
 * archetypes, and this widget owns its own board.
 *
 * The board is worth the third case rather than a third row in a table: a wrong prediction
 * here RESOLVES its pair instead of reopening it, so what the hand-back has to preserve is not
 * the explained answer but the two answers that were never given.
 *
 * The bare row class, because the `--compare` modifier this used to name was a hardcoded set of
 * grid tracks and the board now owns its columns outright. The `.toBe(3)` below is what keeps
 * the looser selector honest: a row it picks up that this test was not written for fails the
 * count rather than being driven blind. Measured, at a stray fourth row: `expected 4 to be 3`.
 */
const RATIONALIZE_ROWS = ".lesson-classify__row";

/** The chips under one pair of `rationalize-explore`, in the order they are drawn. */
function pairOptions(host: HTMLElement, at: number): HTMLButtonElement[] {
  const row = Array.from(widget(host).querySelectorAll<HTMLElement>(RATIONALIZE_ROWS))[at];
  if (row === undefined) {
    throw new Error(`no pair at ${at}`);
  }
  return Array.from(row.querySelectorAll<HTMLButtonElement>(".lesson-interactive__chip"));
}

/** How many pairs have been called, i.e. carry the verdict a settled row prints. */
function pairsCalled(host: HTMLElement): number {
  return Array.from(widget(host).querySelectorAll<HTMLElement>(RATIONALIZE_ROWS)).filter(
    (row) => row.querySelector(".lesson-classify__outcome") !== null,
  ).length;
}

test("rationalize-explore: a reveal on pair 1 of 3 leaves the other two to answer", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <LessonVisual
      id="rationalize-explore"
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
    "the compare board mounts",
  );
  expect(
    Array.from(widget(host).querySelectorAll(RATIONALIZE_ROWS)).length,
    "the board is not the three pairs this test drives",
  ).toBe(3);

  // Board 1 is equal, equal, not-equal, and the chips read "Same value" then "Different
  // value", so the second chip on pair 1 is the miss.
  expect(pairOptions(host, 0).length, "pair 1 has no options to take").toBe(2);
  (pairOptions(host, 0)[1] as HTMLButtonElement).click();
  await waitFor(() => revealButton(host) !== null, "the miss puts the reveal on offer");

  // The precondition the whole claim rests on: two pairs are still unanswered, and the gate is
  // shut. Without this the test would be about a finished board, where `#214`'s earned-gate
  // hand-back already applies and this widget's own flag would prove nothing.
  expect(pairsCalled(host), "more than the missed pair has been called").toBe(1);
  expect(completed, "the gate opened before the reveal").toBe(0);

  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens");
  expect(hasText(passage(host) as HTMLElement, "Answer revealed."), "it teaches").toBe(
    true,
  );
  expect(stage(host).hasAttribute("inert"), "the board is held while it is read").toBe(
    true,
  );

  // THE CLAIM. Two ways forward, and the one that keeps the board says the numbers stay.
  expect(
    resumeButton(host),
    "nothing offers the part-answered board back, so the two pairs never called are discarded",
  ).not.toBeNull();
  expect(findButton(host, RE_ASK), "the fresh set is still offered").not.toBeNull();
  expect(
    (resumeButton(host) as HTMLButtonElement).textContent,
    "the control does not name what it does",
  ).toBe(RESUME);

  (resumeButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the teaching is dismissed");
  expect(stage(host).hasAttribute("inert"), "the board is live again").toBe(false);
  expect(pairsCalled(host), "the resumed board lost or gained a called pair").toBe(1);
  expect(completed, "resuming opened the gate").toBe(0);
  expect(reopened, "resuming closed a gate that was never open").toBe(0);

  // And the two pairs are still the learner's to call, which is what the reveal used to spend.
  // The gate turns on all three being CALLED, so it may not open until they have been.
  (pairOptions(host, 1)[0] as HTMLButtonElement).click();
  await waitFor(() => pairsCalled(host) === 2, "the second pair never settled");
  await new Promise<void>((resolve) => setTimeout(resolve, 60));
  expect(completed, "the gate opened with a pair still uncalled").toBe(0);

  (pairOptions(host, 2)[1] as HTMLButtonElement).click();
  await waitFor(() => completed === 1, "the board finished on the learner's own calls");
  expect(
    status(host),
    "the finished board stopped saying the learner may carry on",
  ).toContain("you're good to move on");
});

/* ------------------------------------------------------------------- the way out */

/**
 * The reveal exists so that a learner who cannot do it is not stuck, and resuming must not
 * cost them that. Two resumed reveals in a row still open no gate, and the fresh instance is
 * still one click away with the same reveal waiting on the other side of it.
 */
test("label-parts: resuming does not spend the way out", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <LessonVisual
      id="power-parts-label"
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
    "the figure mounts",
  );

  const missAndReveal = async () => {
    carry(host, PRODUCT_CHIP, EXPONENT_SLOT);
    await waitFor(() => revealButton(host) !== null, "the miss puts the reveal on offer");
    (revealButton(host) as HTMLButtonElement).click();
    await waitFor(() => passage(host) !== null, "the reveal passage opens");
  };

  await missAndReveal();
  (resumeButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the first teaching is dismissed");

  // A resumed reveal is not a spent one, so the offer comes back; and it still teaches
  // rather than releasing, because the learner has not been given a different question yet.
  await missAndReveal();
  expect(resumeButton(host), "the board is offered back a second time").not.toBeNull();
  expect(completed, "a second resumed reveal opened the gate").toBe(0);

  // The way out, taken from inside the resumed round: a different power, and the reveal that
  // lands on it is the one that lets a stuck learner past.
  findButton(host, RE_ASK).click();
  await waitFor(
    () => isNamed(host, "Label for the raised 4"),
    "a different power is dealt",
  );
  expect(reopened, "the fresh instance left the gate latched").toBe(0);

  named(host, "four copies of the base").click();
  named(host, "Label for the raised 4").click();
  await waitFor(
    () => revealButton(host) !== null,
    "the reveal is offered on the new power",
  );
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => completed === 1, "the reveal after a redraw lets the learner past");
});
