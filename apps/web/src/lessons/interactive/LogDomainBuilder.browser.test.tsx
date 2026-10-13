import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { LogDomainBuilder } from "./LogDomainBuilder";

/**
 * The first board is $y = \log(7 - x)$, so the domain is $\{x \mid x < 7\}$: the argument is
 * reflected, and isolating $x$ turns the inequality round. Two parts of one answer are judged
 * together, because a learner who moves $x$ across without turning the sign has the boundary
 * right and the direction wrong, and grading the number alone would call that correct.
 */
function sign(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(`button[aria-label="Use ${spoken}"]`);
  if (!found) {
    throw new Error(`no direction chip: ${spoken}`);
  }
  return found;
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-equation__slot");
  if (!box) {
    throw new Error("no boundary slot");
  }
  return box;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogDomainBuilder gates once, on the direction and the boundary together", async () => {
  let completed = 0;
  h = mount(<LogDomainBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-equation") !== null,
    "the set-builder row mounts",
  );

  // The figure states the RULE and never this instance's argument condition, so the step the
  // learner has to take is not printed for them.
  expect(hasMath(host, "\\text{argument} > 0")).toBe(true);
  expect(hasMath(host, "7 - x > 0")).toBe(false);

  // The right boundary behind the direction a learner gets by moving x without turning the
  // sign round is not the answer.
  sign(host, "greater than").click();
  setInputValue(entry(host), "7");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not yet"), "the wrong direction is refused");
  expect(completed).toBe(0);

  // And the right direction behind the wrong boundary is refused too.
  sign(host, "less than").click();
  await waitFor(() => !hasText(host, "Not yet"), "choosing a direction clears the nudge");
  setInputValue(entry(host), "0");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not yet"), "the wrong boundary is refused");
  expect(completed).toBe(0);

  setInputValue(entry(host), "7");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "both parts together open the gate");
  await waitFor(
    () => hasMath(host, "7 - x > 0"),
    "the working is stated once it is earned",
  );
  expect(hasMath(host, "\\{\\, x \\mid x < 7 \\,\\}")).toBe(true);
  // The Check button is gone with the answered round, so nothing can latch a second time.
  expect(host.querySelector("button.lesson-interactive__check")).toBeNull();
  expect(completed).toBe(1);
});

test("LogDomainBuilder refuses a half-made answer and offers its reveal after an attempt", async () => {
  let completed = 0;
  h = mount(<LogDomainBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-equation") !== null,
    "the set-builder row mounts",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  // A boundary with no direction chosen is not an answer.
  setInputValue(entry(host), "7");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "Choose a direction"),
    "a missing direction is refused",
  );
  expect(completed).toBe(0);
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
