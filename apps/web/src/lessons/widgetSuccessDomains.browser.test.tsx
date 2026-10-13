/**
 * One widget per domain, driven through `LessonVisual` in real Chromium, proving the
 * success badge actually reaches the screen for D1, D5 and D7.
 *
 * `widgetSuccessCoverage.test.ts` reads the sources and proves the call is THERE.
 * A call can be there and still be wired to the wrong branch, so these three drive the
 * widgets: a wrong move stays silent, each correct move pops the badge and plays one
 * tone, and a widget with two judged steps pops it twice rather than only at the end.
 */

import { afterEach, beforeEach, expect, test } from "vitest";
import { setLessonSoundMuted } from "./lessonSound";
import {
  type AudioProbe,
  findButton,
  type Harness,
  installCountingAudio,
  mount,
  waitFor,
} from "./testHarness";
import { LessonVisual } from "./visuals";

let h: Harness | null = null;
let audio: AudioProbe | null = null;

beforeEach(() => {
  audio = installCountingAudio();
  setLessonSoundMuted(false);
});

afterEach(() => {
  h?.cleanup();
  h = null;
  audio?.restore();
  audio = null;
  setLessonSoundMuted(true);
  setLessonSoundMuted(false);
});

/** The badge is transient, so it is caught by polling rather than read after the fact. */
async function badgeAppears(host: HTMLElement, why: string): Promise<void> {
  await waitFor(() => host.querySelector(".lesson-feedback-badge") !== null, why);
}

/** A button by its accessible name, for the in-diagram `foreignObject` targets. */
function byLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!found) {
    throw new Error(`no button labelled "${label}"`);
  }
  return found;
}

test("D1 order-matters-play: the wrong move is silent, the right one is confirmed", async () => {
  h = mount(<LessonVisual id="order-matters-play" />);
  const { host } = h;
  await waitFor(() => Boolean(findButton(host, "Multiply")), "the widget mounts");

  findButton(host, "Add").click();
  await waitFor(() => host.textContent?.includes("14") === true, "the wrong result shows");
  expect(host.querySelector(".lesson-feedback-badge")).toBeNull();
  expect(audio?.oscillators()).toBe(0);

  findButton(host, "Multiply").click();
  await badgeAppears(host, "the correct pick pops the badge");
  expect(audio?.oscillators()).toBe(2);
});

test("D5 rational-nested-bar-play: only the main bar earns the badge", async () => {
  h = mount(<LessonVisual id="rational-nested-bar-play" />);
  const { host } = h;
  await waitFor(
    () => host.querySelectorAll("button[aria-label^='pick ']").length === 3,
    "all three bars mount",
  );

  byLabel(host, "pick the short bar inside the top fraction").click();
  await waitFor(
    () => host.textContent?.includes("only divides inside") === true,
    "the short bar is refused",
  );
  expect(host.querySelector(".lesson-feedback-badge")).toBeNull();

  byLabel(host, "pick the long bar across the middle of the expression").click();
  await badgeAppears(host, "the main bar pops the badge");
  expect(audio?.oscillators()).toBe(2);
});

test("D7 linear-line-graph-play: both plotted points are confirmed, not just the last", async () => {
  h = mount(<LessonVisual id="linear-line-graph-play" />);
  const { host } = h;
  await waitFor(
    () => host.querySelectorAll("button[aria-label^='plot the point']").length > 0,
    "the lattice mounts",
  );

  // A point off the vertical axis, so it cannot be the intercept: no badge, no tone.
  byLabel(host, "plot the point negative 3 comma 0").click();
  await waitFor(
    () => host.textContent?.includes("sits on the vertical axis") === true,
    "it is refused",
  );
  expect(host.querySelector(".lesson-feedback-badge")).toBeNull();
  expect(audio?.oscillators()).toBe(0);

  byLabel(host, "plot the point 0 comma negative 3").click();
  await badgeAppears(host, "the intercept pops the badge");
  expect(audio?.oscillators()).toBe(2);

  byLabel(host, "plot the point 1 comma negative 1").click();
  // Two tones, so the second correct step was confirmed in its own right rather than
  // folded into the one that opens the gate.
  await waitFor(() => audio?.oscillators() === 4, "the slope step pops the badge too");
});
