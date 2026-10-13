import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { LessonVisual } from "../visuals";
import { EquationExtraneousSpot } from "./EquationExtraneousSpot";

/**
 * The teaching is the domain check, not an arithmetic slip: every line of algebra on this
 * board is correct, and the last one is still not true of the equation that was asked. So the
 * lines the learner must be REFUSED on are lines that are right in the ordinary sense, and the
 * replacement they must be refused on is the set a learner reaches by testing the candidates
 * against the gathered quadratic instead of the original.
 */

const WRONG_LINE = "solution set 20 and negative 5";
const KEPT_BOTH = "the set containing 20 and negative 5";
const KEPT_THE_EXTRANEOUS = "the set whose only member is negative 5";
const KEPT_NEITHER = "the empty set";
const DOMAIN_CHECKED = "the set whose only member is 20";

function flag(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Flag the line ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no flaggable line: ${spoken}`);
  }
  return found;
}

function replaceWith(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Replace it with ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no replacement on offer: ${spoken}`);
  }
  return found;
}

function corrections(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>(".lesson-interactive__step"));
}

function badge(host: HTMLElement): Element | null {
  return host.querySelector(".lesson-feedback-badge");
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

function stage(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-feedback-host__stage");
  if (found === null) {
    throw new Error("no feedback stage mounted");
  }
  return found;
}

/** Solve the board in front of the learner: flag the last line, then keep the root that passes. */
async function solve(host: HTMLElement, line: string, set: string): Promise<void> {
  flag(host, line).click();
  await waitFor(() => corrections(host).length > 0, "the replacements come on offer");
  replaceWith(host, set).click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("EquationExtraneousSpot refuses the algebra, which is all correct", async () => {
  let completed = 0;
  h = mount(<EquationExtraneousSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  // The factoring is right, and saying so is the point: both numbers ARE roots of the
  // quadratic, which is exactly why the last line looks like it follows.
  flag(host, "x minus 20 times x plus 5 equals 0").click();
  await waitFor(
    () => hasText(host, "those factors multiply back to the quadratic above"),
    "a correct factorisation is refused with its reason",
  );
  expect(completed).toBe(0);
  expect(corrections(host).length, "a refused tap settled stage one").toBe(0);
  expect(
    host.querySelector(".lesson-interactive__reset"),
    "a refused tap finished the board",
  ).toBeNull();

  // And the gathering line is the one that WIDENS the equation, so its refusal has to say
  // that while still refusing it: the widening is legal, and the check at the end is what
  // pays for it.
  flag(host, "log of x times x minus 15 equals 2").click();
  await waitFor(
    () => hasText(host, "Gathering does widen what the equation will accept"),
    "the gathering step is refused, and named as where the surplus root comes from",
  );
  expect(completed).toBe(0);
  expect(corrections(host).length, "a refused tap settled stage one").toBe(0);
});

test("EquationExtraneousSpot gates on the domain-checked set", async () => {
  let completed = 0;
  h = mount(<EquationExtraneousSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  flag(host, WRONG_LINE).click();
  await waitFor(
    () => corrections(host).length > 0,
    "finding the line puts the replacements on offer",
  );
  expect(completed, "finding the line alone opened the gate").toBe(0);
  // Every replacement answers the same question, so none of them can be ruled out by shape.
  expect(corrections(host).length, "the sets on offer").toBe(4);

  // The misconception itself: both roots satisfy the quadratic that gathering produced.
  replaceWith(host, KEPT_BOTH).click();
  await waitFor(
    () => hasText(host, "the quadratic is the equation GATHERING produced"),
    "keeping both roots is refused",
  );
  expect(completed).toBe(0);

  // Checked the candidates and then kept the wrong one.
  replaceWith(host, KEPT_THE_EXTRANEOUS).click();
  await waitFor(
    () => hasText(host, "is the root that FAILS the check"),
    "keeping the extraneous root is refused",
  );
  expect(completed).toBe(0);

  // Read "extraneous" as "the gathering was invalid" and threw the whole thing away.
  replaceWith(host, KEPT_NEITHER).click();
  await waitFor(
    () => hasText(host, "with both arguments positive"),
    "discarding both roots is refused",
  );
  expect(completed).toBe(0);

  replaceWith(host, DOMAIN_CHECKED).click();
  await waitFor(() => completed === 1, "the domain-checked set opens the gate");
  expect(hasMath(host, "\\{20\\}"), "the settled line is not stated").toBe(true);
  expect(
    hasText(host, "A candidate is tested in the equation that was ASKED"),
    "the finished board does not say what the check was for",
  ).toBe(true);
});

test("EquationExtraneousSpot pops a badge on each correct step", async () => {
  let completed = 0;
  h = mount(<LessonVisual id="equation-extraneous-spot" onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");
  expect(badge(host), "a badge was up before anything was answered").toBeNull();

  flag(host, WRONG_LINE).click();
  await waitFor(() => badge(host) !== null, "finding the line is acknowledged");

  // The badge is transient, so the second one is only observable once the first has gone.
  await waitFor(() => badge(host) === null, "the first badge clears", 6000);

  replaceWith(host, DOMAIN_CHECKED).click();
  await waitFor(() => badge(host) !== null, "the replacement is acknowledged too");
  await waitFor(() => completed === 1, "the board opens the gate");
});

test("EquationExtraneousSpot hands the board back on stage one and spends it on stage two", async () => {
  let completed = 0;
  h = mount(<LessonVisual id="equation-extraneous-spot" onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  // A wrong flag is what puts the first reveal on offer, and the replacement is still owed
  // behind it, so this reveal is resumable.
  flag(host, "x squared minus 15 x minus 100 equals 0").click();
  await waitFor(() => revealButton(host) !== null, "the miss puts the reveal on offer");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal passage opens");
  expect(hasText(passage(host) as HTMLElement, "Answer revealed."), "it teaches").toBe(
    true,
  );
  expect(stage(host).hasAttribute("inert"), "the board is held while it is read").toBe(
    true,
  );
  expect(
    resumeButton(host),
    "the board was taken away with the replacement still outstanding",
  ).not.toBeNull();
  expect((resumeButton(host) as HTMLButtonElement).textContent).toBe(
    "Keep going on this question",
  );
  expect(completed, "the first reveal opened the gate").toBe(0);

  (resumeButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the teaching is dismissed");
  expect(stage(host).hasAttribute("inert"), "the board is live again").toBe(false);
  // Handed back UNANSWERED: being shown which line fails is not flagging it, so stage one is
  // still the learner's to produce and stage two has not opened behind it.
  expect(corrections(host).length, "the resumed board answered stage one itself").toBe(0);
  expect(flag(host, WRONG_LINE).disabled, "the resumed board is not tappable").toBe(false);

  flag(host, WRONG_LINE).click();
  await waitFor(() => corrections(host).length > 0, "the learner flags it themselves");
  expect(completed, "flagging the line after a reveal opened the gate").toBe(0);

  // Stage two is the last answer this board asks for, and the gate turns on it, so handing
  // the board back here would be handing the gate over. One way forward only.
  replaceWith(host, KEPT_BOTH).click();
  await waitFor(
    () => revealButton(host) !== null,
    "the wrong set offers stage two's reveal",
  );
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the second passage opens");
  expect(
    resumeButton(host),
    "the last answer was handed back with the gate riding on it",
  ).toBeNull();
  expect(
    host.querySelector(".lesson-interactive__reask-button"),
    "no way forward at all",
  ).not.toBeNull();
  expect(completed, "the reveal opened the gate").toBe(0);
});

test("EquationExtraneousSpot restarts onto a different equation and shuts the gate", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <EquationExtraneousSpot onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  await solve(host, WRONG_LINE, DOMAIN_CHECKED);
  await waitFor(() => completed === 1, "the first board opens the gate");

  const reset = host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
  expect(reset, "a finished board offers no way to start over").not.toBeNull();
  expect(reset?.textContent, "the button does not say what it deals").toBe(
    "Start over on a different equation",
  );
  (reset as HTMLButtonElement).click();

  // A different equation on a different base, not the same numbers dealt back.
  await waitFor(
    () => hasMath(host, "\\log_{3}\\left(x(x - 6)\\right) = 3"),
    "the restart dealt a second equation",
  );
  expect(
    hasMath(host, "\\log\\left(x(x - 15)\\right) = 2"),
    "the restart dealt the same numbers back",
  ).toBe(false);
  expect(reopened, "the restart left the gate latched open").toBe(1);
  expect(completed, "the restart re-opened a gate nobody had earned").toBe(1);

  // And the new board gates on its own answer, reached the same way.
  await solve(host, "solution set 9 and negative 3", "the set whose only member is 9");
  await waitFor(() => completed === 2, "the second board opens the gate on its own answer");
});

test("EquationExtraneousSpot typesets its work and names every control in words", async () => {
  h = mount(<EquationExtraneousSpot />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  // The imperative is the first thing in the widget, above the work it is about.
  const widget = host.querySelector(".lesson-interactive") as HTMLElement;
  expect(
    widget.firstElementChild?.className,
    "the task line is not the widget's first child",
  ).toBe("lesson-interactive__objective");

  // KaTeX, asserted on the source: the rendering duplicates every glyph into MathML, so
  // `textContent` cannot be read for maths.
  expect(hasMath(host, "\\log x + \\log(x - 15) = 2"), "the equation is typeset").toBe(
    true,
  );
  expect(hasMath(host, "(x - 20)(x + 5) = 0"), "the factorisation is typeset").toBe(true);
  expect(hasMath(host, "\\{20, -5\\}"), "the flagged set is typeset").toBe(true);

  // Every line is tappable and says what it holds in words, because the maths itself is
  // unreadable to a screen reader once KaTeX has it.
  const lines = Array.from(
    host.querySelectorAll<HTMLButtonElement>(".lesson-spot__line-button"),
  );
  expect(lines.length, "the board is not the five lines this file drives").toBe(5);
  for (const line of lines) {
    expect(
      line.getAttribute("aria-label") ?? "",
      `a line is unnamed: ${line.outerHTML}`,
    ).toMatch(/^Flag the line \w/);
  }

  flag(host, WRONG_LINE).click();
  await waitFor(() => corrections(host).length === 4, "the four sets come on offer");
  for (const set of corrections(host)) {
    expect(set.getAttribute("aria-label") ?? "", "a replacement is unnamed").toMatch(
      /^Replace it with the (set|empty set)/,
    );
    expect(hasMath(set, "\\{"), "a replacement is not typeset").toBe(true);
  }
});
