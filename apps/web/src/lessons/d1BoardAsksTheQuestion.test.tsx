/**
 * The two D1 boards that were handing an answer over, each pinned by the defect it had.
 *
 * Both were found by the QA round of 2026-08-04 (`docs/qa-d1-round-4.md`, F-2 and F-1) and
 * both are the same failure wearing two costumes: a board that opens on a CLICK rather than
 * on an answer. They are asserted here rather than in the widgets' own files because what is
 * being claimed is behavioural — what the learner can get out of the board without answering
 * it — and neither claim is visible to a source sweep.
 *
 * jsdom rather than Chromium, deliberately. Nothing below is about paint: one reads the
 * typeset math the board emits and the other counts gate openings, and the browser suite is
 * long enough without two more contracts that do not need a browser.
 */

import { afterEach, expect, test } from "vitest";

import { PercentSlider } from "./interactive/PercentSlider";
import { SubtractAsAddPlay } from "./interactive/SubtractAsAddPlay";
import {
  findButton,
  type Harness,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "./testHarness";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Every piece of typeset math the board is currently showing. */
function math(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll("[data-latex]")).map(
    (n) => n.getAttribute("data-latex") ?? "",
  );
}

/**
 * A choice by its ACCESSIBLE NAME rather than its rendered text, because these options are
 * typeset and KaTeX emits every glyph twice — `textContent` reads "44" for a single 4, and a
 * substring search over it cannot tell 4 from 14 from -14.
 */
function option(host: HTMLElement, label: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (found === null) {
    throw new Error(`no option named ${label}`);
  }
  return found;
}

function hasOption(host: HTMLElement, label: string): boolean {
  return host.querySelector(`button[aria-label="${label}"]`) !== null;
}

/**
 * F-2. `PercentSlider` used to read "the learner has committed a guess" off a flag set at the
 * TOP of `check()`, before any verdict had been reached. An empty field is not a guess, so two
 * clicks handed the number over: drag the slider to the target, press Check, and read the
 * answer off the bar and off the `0.25 \times 60 = 15` line underneath it.
 *
 * The board's first pool entry is 25% of 60, so the number that must not appear is 15. It is
 * looked for as a whole `data-latex` node and inside one, because the amount reaches the
 * screen two ways: alone above the bar, and as the right-hand side of the rewrite line.
 */
test("percent slider: pressing Check with an empty field paints no amount", async () => {
  h = mount(<PercentSlider />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, "it mounts");

  const dial = host.querySelector<HTMLInputElement>("input[type='range']");
  expect(dial, "the board has a slider").not.toBeNull();
  // Park it exactly on the asked-for share, which is the whole of the old two-click leak.
  setInputValue(dial as HTMLInputElement, "25");
  // Read back off the control rather than off the prose: the label names the TARGET share as
  // well as the current one, so "25%" is in the text at mount and waiting on it waits on
  // nothing.
  await waitFor(() => (dial as HTMLInputElement).value === "25", "the slider takes 25%");

  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Type the amount"), "the empty field is refused");

  const shown = math(host);
  expect(shown.length, "no math was measured, so this proves nothing").toBeGreaterThan(0);
  expect(
    shown.filter((latex) => latex === "15" || latex.includes("= 15")),
    "the amount is on screen without the learner having produced it",
  ).toEqual([]);
});

/**
 * F-1. `SubtractAsAddPlay`'s second half used to be a worked example wearing an interaction's
 * clothes: both buttons called the same `advance()`, so any click moved the board on and the
 * gate opened on having clicked rather than on having understood. There was no wrong answer to
 * give, which is why nothing could ever have caught it from inside the widget.
 *
 * The claim here is the one the old board could not have passed: a wrong pick moves nothing
 * and opens nothing, and the gate arrives only after both steps are called correctly.
 */
test("subtract as add: a wrong rewrite neither advances the board nor opens the gate", async () => {
  let completed = 0;
  h = mount(
    <SubtractAsAddPlay
      onComplete={() => {
        completed += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, "it mounts");

  // The first pool entry is 5 - 9, whose rewrite is 5 + (-9) and whose sum is -4. "5 + 9" is
  // the misconception this slide exists to correct: the minus became a plus and the 9 was
  // left alone.
  option(host, "5 plus 9").click();
  await waitFor(
    () => hasText(host, "Subtracting is adding the OPPOSITE"),
    "the wrong rewrite is named rather than accepted",
  );
  expect(completed, "a wrong pick opened the gate").toBe(0);
  expect(
    hasOption(host, "5 plus negative 9"),
    "the board advanced past the rewrite the learner never gave",
  ).toBe(true);

  option(host, "5 plus negative 9").click();
  await waitFor(() => hasText(host, "Now add"), "the correct rewrite is taken");
  expect(completed, "rewriting alone opened the gate").toBe(0);

  // And the sum is asked for too, with the sign error on the board beside the answer.
  option(host, "4").click();
  expect(completed, "a wrong sum opened the gate").toBe(0);
  option(host, "-4").click();
  await waitFor(() => completed === 1, "answering both steps opens the gate");
});
