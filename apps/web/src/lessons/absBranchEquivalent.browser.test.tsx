/**
 * $-(inside) = k$ IS A BRANCH OF $\lvert inside \rvert = k$, AND LIN.5's BUILDER SAID IT IS NOT.
 *
 * `AbsBranchBuilder` unpacks $\lvert w - 34 \rvert = 5$ into two ordinary equations and offers
 * five chips to build them from. One of the five is $-w + 34 = 5$, which is $-(w - 34) = 5$
 * written out: it is the branch where the quantity inside the bars is taken negative, and it
 * solves to $29$, which is the widget's own `lowSolution`. It was a distractor, and a learner
 * who wrote the standard second branch was marked wrong for it. Board two carries the same
 * chip, $-h - 12 = 7$ for $\lvert h + 12 \rvert = 7$, solving to the same board's $-19$.
 *
 * Worse than the mark was the reason given for it. The note under a missed branch said the
 * quantity inside the bars "keeps its own form in both branches and only the number on the
 * right changes sign", and the reveal repeated it: "What gets negated is the number on the
 * right, and $w - 34$ is written exactly as it stands." The first clause of that note is true —
 * what the bars leave free is the SIGN of $w - 34$ — and the rule drawn from it is not. Writing
 * the pair with the sign on the right is ONE way to write it; asserting it as what the bars
 * MEAN teaches a learner out of the standard statement of the rule, and out of the chip the
 * board was refusing them.
 *
 * ## What is asserted, and why the prose half is a literal
 *
 * The acceptance is a played board: place the chip, check the branch, read the verdict.
 *
 * The prose half is a DELETION, so it is asserted as one — the two sentences that stated the
 * false rule are named and must not be back — with the note's own presence and length under it,
 * so "the sentence is gone" cannot be satisfied by there being no note at all. Whether what
 * replaced them is any good is not a thing a test can settle, and this file does not claim to.
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

/** The two branch rows, by the slot they fill. */
function row(host: HTMLElement, slot: "positive" | "negative"): HTMLElement {
  const found = widget(host).querySelector<HTMLElement>(`[data-part-row="${slot}"]`);
  if (found === null) {
    throw new Error(`no "${slot}" branch on the board`);
  }
  return found;
}

/** A chip from the palette, named by the equation it carries rather than by its index. */
function chip(host: HTMLElement, latex: string): HTMLButtonElement {
  const found = Array.from(
    widget(host).querySelectorAll<HTMLButtonElement>(
      ".lesson-interactive__controls .lesson-interactive__chip",
    ),
  ).find((button) => button.querySelector(`[data-latex="${latex}"]`) !== null);
  if (found === undefined) {
    throw new Error(`no chip carrying "${latex}"`);
  }
  return found;
}

function verdictOf(host: HTMLElement, slot: "positive" | "negative"): string | null {
  return (
    row(host, slot).querySelector("[data-verdict]")?.getAttribute("data-verdict") ?? null
  );
}

function noteText(host: HTMLElement, slot: "positive" | "negative"): string {
  return (row(host, slot).querySelector(".lesson-interactive__row-note")?.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function check(host: HTMLElement, slot: "positive" | "negative") {
  const button = row(host, slot).querySelector<HTMLButtonElement>(
    ".lesson-interactive__check",
  );
  if (button === null) {
    throw new Error(`the "${slot}" branch has no check control`);
  }
  button.click();
}

/** Select a branch, then put an equation in it. */
async function place(host: HTMLElement, slot: "positive" | "negative", latex: string) {
  (row(host, slot).querySelector(".lesson-equation__slot") as HTMLButtonElement).click();
  await waitFor(
    () =>
      row(host, slot)
        .querySelector(".lesson-equation__slot")
        ?.getAttribute("aria-pressed") === "true",
    `the "${slot}" branch never went live`,
  );
  chip(host, latex).click();
  await waitFor(
    () => row(host, slot).querySelector(`[data-latex="${latex}"]`) !== null,
    `"${latex}" never landed in the "${slot}" branch`,
  );
}

async function board(): Promise<HTMLElement> {
  h = mount(
    <LessonVisual id="abs-branch-builder" onComplete={() => {}} onReopen={() => {}} />,
  );
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );
  // Board one, named so the equations below are read off the instance this test drives.
  // Matched on the attribute rather than through a selector: a CSS attribute selector eats the
  // backslashes, so `\lvert` there quietly becomes `lvert` and the precondition is about a
  // string nothing renders.
  const typeset = Array.from(widget(host).querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  expect(typeset, "board one is not the rule this test was written against").toContain(
    "\\lvert w - 34 \\rvert = 5",
  );
  return host;
}

test("abs-branch-builder: the branch that negates the whole left side is a correct branch", async () => {
  const host = await board();

  // $-(w - 34) = 5$, written out. It is the branch where the inside is taken negative.
  await place(host, "negative", "-w + 34 = 5");
  check(host, "negative");
  await waitFor(() => verdictOf(host, "negative") !== null, "branch two was never judged");
  expect(
    verdictOf(host, "negative"),
    "a correctly written negative branch is marked wrong",
  ).toBe("right");

  // And it finishes the board, on the widget's own arithmetic: the two branches it now holds
  // solve to 29 and 39, which is what the board says about itself when both are in.
  await place(host, "positive", "w - 34 = 5");
  check(host, "positive");
  await waitFor(
    () => verdictOf(host, "positive") === "right",
    "branch one was never judged",
  );
  const status = widget(host).querySelector(".lesson-interactive__status");
  expect(
    status?.getAttribute("data-state"),
    "the board did not settle on the pair it was given",
  ).toBe("solved");
  const solved = Array.from(status?.querySelectorAll("[data-latex]") ?? []).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  expect(solved, "the finished board does not name its low solution").toContain("29");
  expect(solved, "the finished board does not name its high solution").toContain("39");
});

test("abs-branch-builder: the branch that negates the SOLUTION is still refused", async () => {
  const host = await board();

  // The other side of the acceptance: widening it to the equivalent form must not widen it to
  // everything. $w + 34 = -5$ is not a branch of anything here.
  await place(host, "negative", "w + 34 = -5");
  check(host, "negative");
  await waitFor(() => verdictOf(host, "negative") !== null, "branch two was never judged");
  expect(verdictOf(host, "negative"), "a wrong branch is now accepted").toBe("wrong");
});

/** The two sentences that stated the false rule, as the learner read them. */
const FALSE_RULE = [
  "keeps its own form in both branches",
  "only the number on the right changes sign",
  "is written exactly as it stands",
];

test("abs-branch-builder: nothing on a missed branch asserts that only the right side may change sign", async () => {
  const host = await board();

  await place(host, "negative", "w + 34 = -5");
  check(host, "negative");
  await waitFor(
    () => noteText(host, "negative") !== "",
    "the missed branch printed no note",
  );

  // The floor under the deletion: there is a note, and it is a sentence rather than a stub, so
  // "the false rule is not in it" is a claim about prose somebody wrote.
  const note = noteText(host, "negative");
  expect(note.length, "the note is too short to be saying anything").toBeGreaterThan(60);
  for (const said of FALSE_RULE) {
    expect(note, `the note under a missed branch still says "${said}"`).not.toContain(said);
  }

  // And the reveal on the same branch, which repeated it at greater length.
  const reveal = host.querySelector<HTMLButtonElement>(
    ".lesson-interactive__reveal-button",
  );
  expect(reveal, "the missed branch offers no working to read").not.toBeNull();
  (reveal as HTMLButtonElement).click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    "the reveal passage opens",
  );
  const taught = (host.querySelector(".lesson-interactive__reveal")?.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
  expect(taught.length, "the passage taught nothing").toBeGreaterThan(100);
  for (const said of FALSE_RULE) {
    expect(taught, `the reveal on branch two still says "${said}"`).not.toContain(said);
  }
});
