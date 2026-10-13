import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasText, mount, waitFor } from "../testHarness";
import { ExpShiftDrag } from "./ExpShiftDrag";

/**
 * Three rules, three lines, one gate. The first board's rules are `3 * 2^x + 4`, `3 * 2^x - 2`
 * and `3 * 2^(x - 3)`, whose asymptotes are 4, -2 and 0: two of them differ only in the sign of
 * the constant, and the third moves sideways and so keeps `y = 0`. The gate needs all three
 * placed, and a wrong drop is refused and hands the rule back rather than locking it, because
 * three cards is three answers.
 *
 * `usePickup` accepts a tap on a rule followed by a tap on a slot, which is the path these
 * tests drive; the drag path shares the same handler.
 */
function byLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) {
    throw new Error(`no control labelled "${label}"`);
  }
  return button;
}

/** The tray chip for each of the first board's three rules. */
const RULES = {
  up: "3 times 2 to the x, plus 4",
  down: "3 times 2 to the x, minus 2",
  side: "3 times 2 to the x minus 3",
} as const;

/** The empty slot on each candidate line. */
function slot(host: HTMLElement, height: number): HTMLButtonElement {
  return byLabel(host, `Drop slot for the line y equals ${height}`);
}

function place(host: HTMLElement, rule: string, height: number): void {
  byLabel(host, rule).click();
  slot(host, height).click();
}

/**
 * Every placed line label whose ink leaves the plot, plus how many were checked.
 *
 * `plotLayout.test.tsx` owns this claim for every REGISTERED visual, and this widget is not
 * registered yet, so the claim is made here in the meantime and over both boards: the window is
 * sized to each board's own three constants, so a label that fits one arrangement says nothing
 * about the other. The count comes back with the findings because containment over an empty
 * collection would satisfy the assertion it was written to make.
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

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpShiftDrag refuses a wrong line and gates on all three, exactly once", async () => {
  let completed = 0;
  h = mount(<ExpShiftDrag onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 6, "the board mounts");

  // No curve is drawn before a rule lands: the lines are the only evidence on offer.
  expect(host.querySelectorAll("polyline").length, "no curve before a placement").toBe(0);

  // The sideways-shifted rule keeps `y = 0`, so the line at 4 is not its home.
  place(host, RULES.side, 4);
  await waitFor(
    () => hasText(host, "levels off somewhere else"),
    "a wrong line is refused",
  );
  expect(completed).toBe(0);
  // Refused, not locked: the rule is back on offer and the slot is still empty.
  expect(byLabel(host, RULES.side)).toBeTruthy();
  expect(slot(host, 4).disabled).toBe(false);

  place(host, RULES.side, 0);
  await waitFor(
    () => host.querySelectorAll("polyline").length === 1,
    "a correct placement draws that rule's curve",
  );
  expect(completed, "one rule of three is not the answer").toBe(0);

  place(host, RULES.up, 4);
  expect(completed).toBe(0);

  place(host, RULES.down, -2);
  await waitFor(() => completed === 1, "the gate opens on a full board");
  await waitFor(() => hasText(host, "Every rule placed"), "the tray empties");
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("ExpShiftDrag offers its reveal only after a wrong drop", async () => {
  h = mount(<ExpShiftDrag />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 6, "the board mounts");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  place(host, RULES.up, 0);
  await waitFor(
    () => hasText(host, "Reveal this rule's line"),
    "the reveal is offered after a wrong drop",
  );
});

test("ExpShiftDrag keeps every line label inside the plot, on both boards", async () => {
  h = mount(<ExpShiftDrag />);
  const { host } = h;
  await waitFor(() => labelReport(host).checked === 3, "the first board names its lines");
  expect(labelReport(host).escaped, "board one").toEqual([]);

  // Finish the board so the restart is offered, then check the OTHER set of constants: 6, 0
  // and -5 rather than 4, 0 and -2, which is a taller window and three different heights.
  place(host, RULES.side, 0);
  place(host, RULES.up, 4);
  place(host, RULES.down, -2);
  await waitFor(() => hasText(host, "Every rule placed"), "the first board finishes");

  findButton(host, "Start over").click();
  await waitFor(
    () =>
      host.querySelector('button[aria-label="Drop slot for the line y equals 6"]') !== null,
    "the second board arrives",
  );
  expect(labelReport(host).checked, "the second board names three lines").toBe(3);
  expect(labelReport(host).escaped, "board two").toEqual([]);
});
