/**
 * "Start over" has to hand the learner a DIFFERENT question and take the gate back off the
 * latch. Both halves matter and both were missing: a reset that deals the same numbers asks
 * the learner to retype an answer they already know, and one that leaves the gate open lets
 * them walk past it without answering the new instance at all.
 *
 * These run in real Chromium against the widgets the lesson mounts, not against the hook in
 * isolation, because the defect being guarded is a wiring defect.
 */

import { expect, test } from "vitest";

import { findButton, type Harness, hasMath, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

let h: Harness | null = null;

function chip(root: HTMLElement, label: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.getAttribute("aria-label") === label,
  );
  if (!found) {
    throw new Error(`no control labelled "${label}"`);
  }
  return found;
}

function cleanup() {
  h?.cleanup();
  h = null;
}

/* ------------------------------------------------------- filling a table (EXP.1 s4) */

test("zero-exponent-table: start over deals a new base and re-closes the gate", async () => {
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
  await waitFor(() => host.querySelectorAll("button").length > 0, "mounted");

  // Board one runs on base 3, so the given rows are 27 and 9.
  expect(hasMath(host, "3^{3}")).toBe(true);
  expect(hasMath(host, "5^{3}")).toBe(false);

  // Two blanks, filled top down: 3^1 is 3, then 3^0 is 1.
  const fill = async (value: string) => {
    chip(host, value).click();
    await waitFor(
      () => Boolean(host.querySelector(".lesson-table__slot")),
      `slot open for ${value}`,
    );
    (host.querySelector(".lesson-table__slot") as HTMLButtonElement).click();
  };
  await fill("3");
  await waitFor(() => host.querySelectorAll(".lesson-table__slot").length === 1, "row two");
  await fill("one");

  await waitFor(() => completed === 1, "gate opened");
  expect(reopened).toBe(0);

  // Start over: a different base, the gate closed behind it, and no second latch.
  findButton(host, "Start over with a different base").click();
  await waitFor(() => reopened === 1, "gate closed again");
  await waitFor(() => hasMath(host, "5^{3}"), "second board is base 5");
  expect(hasMath(host, "3^{3}")).toBe(false);
  expect(completed).toBe(1);

  // And the new board really is unanswered: its blanks are back.
  expect(host.querySelectorAll(".lesson-table__slot").length).toBe(1);
  cleanup();
});

/* ------------------------------------------- labelling parts of a figure (EXP.1 s0) */

test("power-parts-label: start over deals a new power and re-closes the gate", async () => {
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
  await waitFor(() => host.querySelectorAll("button").length > 0, "mounted");
  expect(hasMath(host, "3")).toBe(true);

  const place = async (name: string, target: string) => {
    chip(host, name).click();
    chip(host, target).click();
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("button")).every(
          (b) => b.getAttribute("aria-label") !== name,
        ),
      `${name} placed`,
    );
  };
  await place("base", "Label for the 3 on the line");
  await place("exponent", "Label for the raised 5");
  await place("five copies of the base", "Label for the written out product");

  await waitFor(() => completed === 1, "gate opened");

  findButton(host, "Start over with a different power").click();
  await waitFor(() => reopened === 1, "gate closed again");
  await waitFor(() => hasMath(host, "7"), "second figure is 7 to the 4");
  expect(completed).toBe(1);
  cleanup();
});

/* ------------------------------------------------ a typed-answer widget (EXP.1 s1) */

test("exponent-laws-builder: start over deals new exponents and re-closes the gate", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <LessonVisual
      id="exponent-laws-builder"
      onComplete={() => {
        completed += 1;
      }}
      onReopen={() => {
        reopened += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(() => host.querySelectorAll("input").length > 0, "mounted");

  // Board one opens on x^3 * x^4.
  expect(hasMath(host, "x^{3} \\cdot x^{4}")).toBe(true);

  const answer = async (value: string, next?: string) => {
    const input = host.querySelector("input") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    findButton(host, "Check").click();
    if (next) {
      await waitFor(() => Boolean(findButton(host, next)), `round advanced past ${value}`);
      findButton(host, next).click();
      await waitFor(() => host.querySelectorAll("input").length > 0, "next round ready");
    }
  };
  await answer("7", "Next: a negative exponent");
  await answer("-4", "Next: a division");
  await answer("4");

  await waitFor(() => completed === 1, "gate opened");

  findButton(host, "Start over on new exponents").click();
  await waitFor(() => reopened === 1, "gate closed again");
  await waitFor(() => hasMath(host, "x^{6} \\cdot x^{2}"), "second board is 6 and 2");
  expect(hasMath(host, "x^{3} \\cdot x^{4}")).toBe(false);
  expect(completed).toBe(1);
  cleanup();
});

/* -------------------------------------------- the replacement for the number line */

test("negative-exponent-estimate: the gate turns on a committed value, not on sliding", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual
      id="negative-exponent-estimate"
      onComplete={() => {
        completed += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(() => host.querySelectorAll("input[type=range]").length > 0, "mounted");
  const slider = host.querySelector("input[type=range]") as HTMLInputElement;

  const slideTo = (value: string) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(slider, value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // Moving the marker settles nothing on its own.
  slideTo("1.5");
  expect(completed).toBe(0);

  // A negative guess is refused and told which way to go, rather than being accepted.
  findButton(host, "Check this spot").click();
  await waitFor(
    () =>
      (host.querySelector(".lesson-interactive__status")?.textContent ?? "").includes(
        "Not there",
      ),
    "wrong commit refused",
  );
  expect(completed).toBe(0);

  // 4^-1 is 0.25 and 4^-2 is 0.0625, both above zero. The second is placed at the nearest
  // stop the 0.05 step allows, which is inside the board's own 0.06 tolerance.
  slideTo("0.25");
  findButton(host, "Check this spot").click();
  await waitFor(() => Boolean(findButton(host, "Next: another one to place")), "round two");
  findButton(host, "Next: another one to place").click();
  await waitFor(() => Boolean(findButton(host, "Check this spot")), "second slider ready");
  const second = host.querySelector("input[type=range]") as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(second, "0.05");
  second.dispatchEvent(new Event("input", { bubbles: true }));
  findButton(host, "Check this spot").click();

  await waitFor(() => completed === 1, "gate opened on the second committed value");
  cleanup();
});

/* ------------------------------------------------------------- the pickup defect */

test("a value tapped and a target tapped in the same frame still lands", async () => {
  // The number-line widget this replaces read the held chip out of ordinary state, so a
  // learner who tapped a value and a target without pausing between them got nothing at
  // all: no landing, no correction, no feedback. Two clicks with no flush between them is
  // the reproduction, so it is the test.
  h = mount(<LessonVisual id="power-parts-label" />);
  const host = h.host;
  await waitFor(() => host.querySelectorAll("button").length > 0, "mounted");

  chip(host, "base").click();
  chip(host, "Label for the 3 on the line").click();

  await waitFor(
    () =>
      Array.from(host.querySelectorAll("button")).every(
        (b) => b.getAttribute("aria-label") !== "base",
      ),
    "the name landed without a pause between the two taps",
  );
  cleanup();
});
