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
import { ExpGraphPlay } from "./ExpGraphPlay";

/**
 * Two answers, one gate. The call about the gap is a three-way question and a learner can make
 * it correctly while still believing the gap grows by a fixed step, so the gate also needs the
 * gap itself: the first board opens on 200 dollars at factors 2 and 3 over two decades, which
 * puts the plans 200 apart at the first decade and 1000 apart at the last.
 *
 * Nothing is plotted before the call, which is what "predict, then check" means here, so the
 * opening board is asserted to carry no curve at all.
 */
function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("the gap question is not on screen");
  }
  return box;
}

/**
 * Every placed label whose ink leaves the plot it belongs to, plus how many were checked.
 *
 * `plotLayout.test.tsx` owns this claim for every REGISTERED visual, and this widget is not
 * registered yet (the visual registry is wired centrally), so the claim is made here in the
 * meantime and over both boards rather than only the opening one: the window is sized to each
 * board's own balances, so a label that fits one arrangement says nothing about the other.
 *
 * The count comes back with the findings on purpose. Containment holds trivially over an empty
 * collection, so a board with no labels on it would satisfy the assertion it was written to
 * make.
 */
function labelReport(host: HTMLElement): { escaped: string[]; checked: number } {
  const svg = host.querySelector("svg");
  const rect = svg?.querySelector("[data-plot-frame]");
  if (!svg || !rect) {
    throw new Error("no tagged plot frame");
  }
  const left = Number(rect.getAttribute("x"));
  const top = Number(rect.getAttribute("y"));
  const right = left + Number(rect.getAttribute("width"));
  const bottom = top + Number(rect.getAttribute("height"));
  const labels = Array.from(svg.querySelectorAll("[data-plot-label]"));
  const escaped = labels.flatMap((node) => {
    const latex = node.querySelector("[data-latex]")?.getAttribute("data-latex") ?? "?";
    const x = Number(node.getAttribute("data-ink-x"));
    const y = Number(node.getAttribute("data-ink-y"));
    const halfW = Number(node.getAttribute("data-ink-half-w"));
    const halfH = Number(node.getAttribute("data-ink-half-h"));
    const out: string[] = [];
    // One unit of slack, matching the shared guard: the ink extents are an estimate of what
    // KaTeX will draw, and a check that failed on rounding would only get widened.
    if (x - halfW < left - 1 || x + halfW > right + 1) {
      out.push(`"${latex}" runs off the plot horizontally`);
    }
    if (y - halfH < top - 1 || y + halfH > bottom + 1) {
      out.push(`"${latex}" runs off the plot vertically`);
    }
    return out;
  });
  return { escaped, checked: labels.length };
}

function chip(host: HTMLElement, label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(
    `button[aria-label^="The gap between the plans: ${label}"]`,
  );
  if (!button) {
    throw new Error(`no call chip for "${label}"`);
  }
  return button;
}

const CALL_PREFIX = "The gap between the plans: ";

/**
 * The three calls as the board draws them, in document order.
 *
 * Read off the accessible name rather than the visible text because a marked chip appends a
 * glyph to its label, so `textContent` stops matching the moment a call is taken; the
 * accessible name keeps the call itself as its opening clause and appends the verdict after a
 * comma, and no call contains one.
 */
function callOrder(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll("button[aria-label]"))
    .map((node) => node.getAttribute("aria-label") ?? "")
    .filter((name) => name.startsWith(CALL_PREFIX))
    .map((name) => (name.slice(CALL_PREFIX.length).split(", ")[0] ?? "").trim());
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpGraphPlay gates on the call and the gap together, exactly once", async () => {
  let completed = 0;
  h = mount(<ExpGraphPlay onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 3, "the calls mount");

  // Predict before any evidence: the curves are not drawn yet.
  expect(host.querySelectorAll("polyline").length, "no curve before the call").toBe(0);
  expect(host.querySelector("input.lesson-interactive__input")).toBeNull();

  chip(host, "Grows by more each decade").click();
  await waitFor(
    () => host.querySelectorAll("polyline").length === 2,
    "the curves are drawn once the call is in",
  );
  expect(completed, "the call on its own is not the answer").toBe(0);

  // 200 is the gap at the FIRST decade, which is the answer a learner gives by carrying a
  // fixed step forward. It is refused.
  setInputValue(entry(host), "200");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not yet."), "a fixed step is refused");
  expect(completed).toBe(0);

  setInputValue(entry(host), "1000");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the gate opens on the gap");

  // The board is spent, so there is nothing left that could latch it a second time.
  expect(
    host.querySelector("input.lesson-interactive__input"),
    "the question is gone",
  ).toBeNull();
  expect(hasMath(host, "1800"), "the last decade's balances are named").toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

/**
 * A missed call is scored, not fatal.
 *
 * This replaces a test that asserted the opposite, and the swap is the fix rather than a
 * loosening of it: `checkGap` used to return unless the call had been right, so the only thing
 * on offer after a wrong one was a restart, and the restart dealt the other board with its
 * right call in the same slot. The learner was shut out of the step the gate is spent on and
 * handed the answer to the step that shut them out.
 *
 * What is NOT loosened, and is asserted here in the same walk: the call is still taken once and
 * the row still stands afterwards, so the three options cannot be worked through; and the gate
 * still refuses everything short of a produced gap. The old file proved the second of those by
 * proving the board was dead, which is a much stronger claim than the gate ever needed.
 */
test("ExpGraphPlay coaches a missed call and still makes the learner produce the gap", async () => {
  let completed = 0;
  h = mount(<ExpGraphPlay onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 3, "the calls mount");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  chip(host, "Grows by the same amount each decade").click();
  await waitFor(() => hasText(host, "widens"), "a missed call is marked and explained");
  expect(completed, "the call is not the gate").toBe(0);

  // The row is settled: one call per board, so the other two cannot be tried in turn.
  for (const label of callOrder(host)) {
    expect(chip(host, label).disabled, `"${label}" is still takeable`).toBe(true);
  }
  expect(
    chip(host, "Grows by more each decade").getAttribute("aria-label"),
    "the call the plans bear out is not announced as standing",
  ).toContain("which you did not pick");

  // The step the gate is actually spent on is still in front of the learner.
  const gap = entry(host);
  expect(gap, "the gap question was withheld after a missed call").not.toBeNull();
  expect(hasText(host, "Reveal"), "the reveal precedes any attempt at the gap").toBe(false);

  setInputValue(gap, "200");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not yet."), "a fixed step is still refused");
  expect(completed, "a missed call does not open the gate by itself").toBe(0);
  await waitFor(() => hasText(host, "Reveal"), "the reveal follows the attempt");

  setInputValue(entry(host), "1000");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the gate opens on the produced gap");
  expect(completed, "the gate opens exactly once").toBe(1);
});

/**
 * The right call is not in the same slot on both boards.
 *
 * A restart is only a fresh question if its answer has to be read. With one module-level
 * `RIGHT_CALL` index the three chips were drawn in a fixed order on both boards, so a learner
 * who had just been shown the answer on board one could take board two's call by counting to
 * the same position without reading a word of it.
 *
 * Both rows are asserted to hold all three calls before their positions are compared, because
 * "the position moved" is satisfied by a row that lost a chip.
 */
test("ExpGraphPlay deals the calls in a different order on the second board", async () => {
  h = mount(<ExpGraphPlay />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 3, "the calls mount");

  const RIGHT = "Grows by more each decade";
  const first = callOrder(host);

  // Reach the second board the way a learner does, by finishing the first.
  chip(host, RIGHT).click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the gap opens",
  );
  setInputValue(entry(host), "1000");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Start over"), "board one is spent");
  findButton(host, "Start over").click();
  await waitFor(
    () => host.querySelectorAll("polyline").length === 0,
    "the fresh board arrives unanswered",
  );

  const second = callOrder(host);
  for (const [where, row] of [
    ["board one", first],
    ["board two", second],
  ] as const) {
    expect(row.length, `${where} did not draw three calls`).toBe(3);
    expect(new Set(row).size, `${where} drew a call twice`).toBe(3);
    expect(row, `${where} is missing the call the plans bear out`).toContain(RIGHT);
  }
  expect(
    second.indexOf(RIGHT),
    `both boards put "${RIGHT}" at position ${first.indexOf(RIGHT)}, so the second board's call can be counted to rather than read`,
  ).not.toBe(first.indexOf(RIGHT));
});

test("ExpGraphPlay keeps every plotted balance inside the plot, on both boards", async () => {
  h = mount(<ExpGraphPlay />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 3, "the calls mount");

  /** Work a board through to its payoff, checking the labels at both stages. */
  async function walk(gap: string, where: string): Promise<void> {
    chip(host, "Grows by more each decade").click();
    await waitFor(
      () => labelReport(host).checked === 2,
      `${where} labels the first decade`,
    );
    expect(labelReport(host).escaped, `${where}, first decade`).toEqual([]);

    setInputValue(entry(host), gap);
    findButton(host, "Check").click();
    await waitFor(() => labelReport(host).checked === 4, `${where} labels the last decade`);
    expect(labelReport(host).escaped, `${where}, all four balances`).toEqual([]);
  }

  await walk("1000", "board one");

  // A restart deals the OTHER board, whose factors are 3 and 5 rather than 2 and 3, so its
  // balances land at different heights against a differently sized window.
  findButton(host, "Start over").click();
  await waitFor(
    () => host.querySelectorAll("[data-plot-label]").length === 0,
    "the fresh board arrives unanswered",
  );
  await walk("1600", "board two");
});
