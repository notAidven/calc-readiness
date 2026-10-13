import { afterEach, expect, test } from "vitest";
import { d8LessonByNode } from "../d8";
import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { LogQuestionExplore } from "./LogQuestionExplore";

/**
 * The question is only worth asking once the pattern is on the board, and its answer is
 * deliberately NOT on the board: 32 is missing from the first strip, so the count cannot be
 * read off an opened multiple.
 *
 * The multiples are labelled with typeset math, so they are reached by accessible name: their
 * text content is KaTeX's doubled output and "4" is a substring of "64".
 */
function multiple(host: HTMLElement, value: number): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Open ${value} to see its factors"]`,
  );
  if (!found) {
    throw new Error(`no unopened multiple ${value}`);
  }
  return found;
}

/**
 * The multiples currently on the strip, read off the rendered chips rather than the authored
 * array, so the assertion is about the board a learner is shown.
 */
function stripValues(host: HTMLElement): number[] {
  return Array.from(
    host.querySelectorAll<HTMLButtonElement>(".lesson-interactive__chip"),
  ).map((chip) => Number(/\d+/.exec(chip.getAttribute("aria-label") ?? "")?.[0]));
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("the question has not been put yet");
  }
  return box;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogQuestionExplore withholds its question until the multiples have been opened", async () => {
  let completed = 0;
  h = mount(<LogQuestionExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the strip mounts",
  );

  // Nothing to answer yet, so there is nothing to gate on either.
  expect(host.querySelector("input.lesson-interactive__input")).toBeNull();
  expect(hasText(host, "Open at least 2")).toBe(true);

  // One opened multiple is one data point, which is not a pattern.
  multiple(host, 4).click();
  await waitFor(
    () => hasMath(host, "4 = 2 \\cdot 2"),
    "the opened multiple shows its factors",
  );
  expect(host.querySelector("input.lesson-interactive__input")).toBeNull();

  multiple(host, 16).click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the question opens",
  );
  expect(hasMath(host, "16 = 2 \\cdot 2 \\cdot 2 \\cdot 2")).toBe(true);
  // The target is absent from the strip, so its reading cannot be opened at all.
  expect(hasMath(host, "32 = 2 \\cdot 2")).toBe(false);
  expect(completed).toBe(0);
});

/**
 * Two multiples opened inside one task must both stay open.
 *
 * React batches clicks dispatched in the same task into a single render, so a handler that
 * spreads the `opened` array it closed over reads a value one commit stale and drops the
 * earlier entry. Here that loses a reading the learner asked for AND holds the question shut,
 * because the count of opened multiples is what puts it: the widget would look like it had
 * ignored the tap.
 */
test("LogQuestionExplore keeps both readings when two multiples are opened in one task", async () => {
  h = mount(<LogQuestionExplore />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the strip mounts",
  );

  multiple(host, 4).click();
  multiple(host, 16).click();

  await waitFor(
    () => hasMath(host, "16 = 2 \\cdot 2 \\cdot 2 \\cdot 2"),
    "the second reading appears",
  );
  expect(hasMath(host, "4 = 2 \\cdot 2"), "the first reading survived").toBe(true);
  expect(
    host.querySelector("input.lesson-interactive__input"),
    "two opened multiples put the question",
  ).not.toBeNull();
});

test("LogQuestionExplore gates on the count of factors, not the multiple itself", async () => {
  let completed = 0;
  h = mount(<LogQuestionExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the strip mounts",
  );

  multiple(host, 4).click();
  await waitFor(() => hasMath(host, "4 = 2 \\cdot 2"), "one multiple opens");
  multiple(host, 16).click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the question opens",
  );

  // 16 in the answer box is the misconception the strip is built to provoke: the learner
  // reaches for a multiple that is on the board rather than for a count of factors.
  setInputValue(entry(host), "16");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not that many"), "a multiple is refused as the count");
  expect(completed).toBe(0);

  setInputValue(entry(host), "5");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the count of factors opens the gate");
  expect(hasText(host, "That count is an exponent")).toBe(true);
});

test("LogQuestionExplore offers its reveal only after a real attempt", async () => {
  h = mount(<LogQuestionExplore />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the strip mounts",
  );

  multiple(host, 4).click();
  await waitFor(() => hasMath(host, "4 = 2 \\cdot 2"), "one multiple opens");
  multiple(host, 16).click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the question opens",
  );

  // Opening multiples is exploration, not an attempt, so it earns no reveal.
  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "9");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});

/**
 * The strip is exploration material, and every sibling widget's header says a reading on it is
 * neither the widget's own target nor the CFU's. Board 2 offered 243, which opens as
 * `243 = 3 \cdot 3 \cdot 3 \cdot 3 \cdot 3`, while EL.3's CFU asks how many passes of tripling
 * reach 243: a learner who opened that rung was shown the CFU's answer, counted out, one slide
 * before being asked for it.
 *
 * The numbers to keep off the strip are derived from the pack's own CFU rather than written
 * down here, so a reworded CFU moves them. A derivation can derive the wrong set, so both ends
 * carry a floor: an empty forbidden set and an empty strip would each satisfy the containment
 * check while measuring nothing.
 */
test("LogQuestionExplore never puts the EL.3 CFU's own multiple on the strip", async () => {
  const prompt = d8LessonByNode["EL.3"]?.cfu?.prompt ?? "";
  const cfuNumbers = (prompt.match(/\d+/g) ?? []).map(Number);
  expect(
    cfuNumbers.length,
    "the CFU prompt names at least one number the strip has to stay off",
  ).toBeGreaterThan(0);

  h = mount(<LogQuestionExplore />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the strip mounts",
  );

  const boards: number[][] = [stripValues(host)];

  // Board 2 is reached the way a learner reaches it, by finishing board 1 and starting over.
  multiple(host, 4).click();
  multiple(host, 16).click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the question opens",
  );
  setInputValue(entry(host), "5");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "That count is an exponent"), "board 1 is finished");
  findButton(host, "Start over on a different pair of numbers").click();
  await waitFor(
    () => stripValues(host).join(",") !== boards[0]?.join(","),
    "the second board mounts",
  );
  boards.push(stripValues(host));

  expect(boards.length, "both authored boards were inspected").toBe(2);
  for (const strip of boards) {
    expect(
      strip.length,
      "an empty strip would satisfy the check below without holding anything",
    ).toBeGreaterThan(2);
    expect(
      strip.filter((value) => cfuNumbers.includes(value)),
      `the strip ${strip.join(", ")} holds a number the CFU asks about`,
    ).toEqual([]);
  }
});
