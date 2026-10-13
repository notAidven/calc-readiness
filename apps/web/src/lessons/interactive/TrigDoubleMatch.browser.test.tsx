import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigDoubleMatch } from "./TrigDoubleMatch";

/**
 * The gate is the first claim: four pairs, and the widget may only let the learner past once every
 * one of them is joined. Three of the four collapse to a cosine and one to a sine, so a gate that
 * opened early could open without the learner ever deciding which function a form produces, which
 * is the whole board.
 *
 * The second test is the misconception, and it is why this is a matching rather than four separate
 * questions. $1 - 2\sin^{2} 5\theta$ is written in the sine and equals a COSINE, so a learner who
 * reaches for the one sine on the right is not merely wrong: they have taken the answer belonging
 * to $2\sin 3\theta\cos 3\theta$, and the board has to refuse it rather than absorb it.
 *
 * Buttons are taken by their exact `aria-label`, because "cosine 6 t" is a prefix of nothing here
 * but "sine 6 theta" sits beside "sine 12 t" on the other board.
 */
function labelled(host: HTMLElement, spoken: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === spoken,
  );
  if (!match) {
    throw new Error(`no button labelled ${spoken}`);
  }
  return match;
}

function joined(host: HTMLElement): number {
  return host.querySelectorAll('.lesson-match__item[data-state="joined"]').length;
}

function join(host: HTMLElement, left: string, right: string): void {
  labelled(host, `Pick up ${left}`).click();
  labelled(host, `Join what you are holding to ${right}`).click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigDoubleMatch gates only once all four forms are joined", async () => {
  let completed = 0;
  h = mount(<TrigDoubleMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board draws",
  );

  join(host, "2 sine 3 theta cosine 3 theta", "sine 6 theta");
  // Two elements settle per pair, the left item and the right one.
  await waitFor(() => joined(host) === 2, "the one sine form lands");
  expect(completed, "one pair is not the board").toBe(0);
  // On the math rather than only on the accessible name, because the angle DOUBLING is the
  // claim and a right column written at the original angle would read the same aloud.
  expect(hasMath(host, "\\sin 6\\theta"), "the angle it joins is the doubled one").toBe(
    true,
  );

  join(host, "cosine squared 4 theta minus sine squared 4 theta", "cosine 8 theta");
  await waitFor(() => joined(host) === 4, "the difference of squares lands");
  join(host, "1 minus 2 sine squared 5 theta", "cosine 10 theta");
  await waitFor(() => joined(host) === 6, "the form written in the sine alone lands");
  expect(completed).toBe(0);

  join(host, "2 cosine squared theta minus 1", "cosine 2 theta");
  await waitFor(() => completed === 1, "gates on the completed board");
});

test("TrigDoubleMatch refuses a sine answer for a form written in the sine", async () => {
  let completed = 0;
  h = mount(<TrigDoubleMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board draws",
  );

  // The expression holds a sine and equals a cosine, and the sine on the right belongs to
  // another pair, so this join costs two of them.
  join(host, "1 minus 2 sine squared 5 theta", "sine 6 theta");
  await waitFor(() => hasText(host, "Not quite"), "the wrong function is refused");
  expect(joined(host)).toBe(0);
  expect(completed).toBe(0);

  join(host, "1 minus 2 sine squared 5 theta", "cosine 10 theta");
  await waitFor(() => joined(host) === 2, "the right join still lands afterwards");
  expect(completed).toBe(0);
});

test("TrigDoubleMatch deals four different angles on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(<TrigDoubleMatch onComplete={() => completed++} onReopen={() => reopened++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board draws",
  );

  join(host, "2 sine 3 theta cosine 3 theta", "sine 6 theta");
  await waitFor(() => joined(host) === 2, "the first pair lands");
  join(host, "cosine squared 4 theta minus sine squared 4 theta", "cosine 8 theta");
  await waitFor(() => joined(host) === 4, "the second pair lands");
  join(host, "1 minus 2 sine squared 5 theta", "cosine 10 theta");
  await waitFor(() => joined(host) === 6, "the third pair lands");
  join(host, "2 cosine squared theta minus 1", "cosine 2 theta");
  await waitFor(() => completed === 1, "the first board closes");

  const restart = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!restart) {
    throw new Error("no restart on the finished board");
  }
  restart.click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(() => hasMath(host, "\\sin 12t"), "a fresh set of angles is dealt");
  expect(hasMath(host, "\\sin 6\\theta"), "not the first board's collapsed sine").toBe(
    false,
  );
});
