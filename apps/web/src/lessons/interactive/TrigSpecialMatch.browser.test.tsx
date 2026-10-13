import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigSpecialMatch } from "./TrigSpecialMatch";

/**
 * Four ratios, four exact values, one gate. The first board is
 * $\sin 30^{\circ}$, $\cos 30^{\circ}$, $\sin 45^{\circ}$ and $\tan 60^{\circ}$, whose values
 * are a half, root three over two, root two over two and root three.
 *
 * The widget delegates to `kinds/MatchPairs`, so the wiring is what is asserted: the gate opens
 * once and only on a fully joined board, a wrong join is refused without consuming either item,
 * and the reveal waits for a real attempt.
 *
 * **The wrong join in the second test is chosen rather than arbitrary.** Root three over two
 * against root two over two is the confusion this board exists to separate, and it is the one a
 * learner cannot catch by feel, because both values sit between a half and one. A board that
 * offered an obviously distant distractor would report the same green.
 *
 * The third test carries the widget's other claim: restarting deals the COMPLEMENTS, so the
 * same four values come back under four different names and the board cannot be finished from
 * a memory of where things sat.
 */
function byLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) {
    throw new Error(`no control labelled "${label}"`);
  }
  return button;
}

function has(host: HTMLElement, label: string): boolean {
  return host.querySelector(`button[aria-label="${label}"]`) !== null;
}

/** Pick up the left item and drop it on the right one, both named as a screen reader says. */
function join(host: HTMLElement, left: string, right: string): void {
  byLabel(host, `Pick up ${left}`).click();
  byLabel(host, `Join what you are holding to ${right}`).click();
}

function restart(host: HTMLElement): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!button) {
    throw new Error("no restart control on the finished board");
  }
  return button;
}

function joinedCount(host: HTMLElement): number {
  return host.querySelectorAll('button[data-state="joined"]').length;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigSpecialMatch gates on the whole board and names each triangle as it lands", async () => {
  let completed = 0;
  h = mount(<TrigSpecialMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  join(host, "sine of 30 degrees", "one half");
  // Two buttons per pair go to `joined`, so a settled pair is two of them.
  await waitFor(() => joinedCount(host) === 2, "the first pair joins");
  expect(completed, "one pair of four is not the board").toBe(0);
  // A named pair says which reference triangle it came off as it lands, so a learner who
  // joins all four correctly still learns the grouping.
  expect(hasText(host, "half-equilateral triangle")).toBe(true);

  join(host, "cosine of 30 degrees", "root 3 over 2");
  await waitFor(() => joinedCount(host) === 4, "the second pair joins");
  expect(completed).toBe(0);

  join(host, "sine of 45 degrees", "root 2 over 2");
  await waitFor(() => joinedCount(host) === 6, "the third pair joins");
  expect(hasText(host, "half-square triangle")).toBe(true);
  expect(completed, "three pairs of four is not the board either").toBe(0);

  join(host, "tangent of 60 degrees", "root 3");
  await waitFor(() => completed === 1, "the gate opens on a fully joined board");
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigSpecialMatch refuses the other root over two, consuming neither item", async () => {
  let completed = 0;
  h = mount(<TrigSpecialMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  join(host, "cosine of 30 degrees", "root 2 over 2");
  await waitFor(() => hasText(host, "Not quite."), "the wrong root is refused");
  expect(completed).toBe(0);
  expect(joinedCount(host), "a refused join settles nothing").toBe(0);
  // Refused rather than spent: both items are still on offer, so the miss costs an attempt
  // and not a pair.
  expect(has(host, "Pick up cosine of 30 degrees")).toBe(true);
  expect(has(host, "Join what you are holding to root 2 over 2")).toBe(true);

  join(host, "cosine of 30 degrees", "root 3 over 2");
  await waitFor(() => joinedCount(host) === 2, "the right value still lands afterwards");
});

test("TrigSpecialMatch deals the complementary angles on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigSpecialMatch onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  join(host, "sine of 30 degrees", "one half");
  await waitFor(() => joinedCount(host) === 2, "the first pair settles");
  join(host, "cosine of 30 degrees", "root 3 over 2");
  await waitFor(() => joinedCount(host) === 4, "the second pair settles");
  join(host, "sine of 45 degrees", "root 2 over 2");
  await waitFor(() => joinedCount(host) === 6, "the third pair settles");
  join(host, "tangent of 60 degrees", "root 3");
  await waitFor(() => completed === 1, "the first board closes");

  restart(host).click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(
    () => has(host, "Pick up cosine of 60 degrees"),
    "the second board is the complementary angles",
  );

  // Not one of the first board's four ratios survives, so nothing can be answered from a
  // memory of where it sat.
  expect(has(host, "Pick up sine of 30 degrees")).toBe(false);
  expect(has(host, "Pick up tangent of 60 degrees")).toBe(false);

  // The values do survive, and land under different names: the cofunction pattern, met as a
  // fact about the board before the next slide states it as a rule.
  join(host, "cosine of 60 degrees", "one half");
  await waitFor(() => joinedCount(host) === 2, "the complement takes the same value");
  expect(completed, "the second board has its own gate").toBe(1);
});

test("TrigSpecialMatch offers its reveal only after a wrong join", async () => {
  h = mount(<TrigSpecialMatch />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  join(host, "sine of 30 degrees", "root 3");
  await waitFor(
    () => hasText(host, "Reveal this pair"),
    "the reveal is offered after a wrong join",
  );
});
