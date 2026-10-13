import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { GeoPavingClassify } from "./GeoPavingClassify";

/**
 * Four orders on one court, three calls under each, and the gate needs a clean board.
 *
 * The first court is $14$ by $9$, so the numbers it finally reports are $126$ and $46$. A test
 * that only asserted "solved" would pass over a board that sorted the orders without ever
 * producing either measurement, which is the thing the slide is about.
 */
const JOBS = {
  slabs: "Slabs to pave the whole court",
  kerb: "Curb stone cut to run right round the rim",
  drain: "How far the drain is sunk below the paving",
  awning: "Cloth stretched over the court as an awning",
} as const;

function rows(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>(".lesson-classify__item"));
}

/**
 * A settled row spells the verdict into its own aria-label ("...: Area, your answer,
 * correct"), so the call has to be found on the prefix. Matching the whole label would
 * stop finding the button at exactly the moment the test wants to read it.
 */
function call(host: HTMLElement, job: string, label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(
    `button[aria-label^="${job}: ${label}"]`,
  );
  if (!button) {
    throw new Error(`no call "${label}" on the row "${job}"`);
  }
  return button;
}

/** Answer one order, and wait for the row to settle before the next one. */
async function answer(host: HTMLElement, job: string, label: string): Promise<void> {
  call(host, job, label).click();
  await waitFor(
    () => call(host, job, label).disabled,
    `the row "${job}" settled on ${label}`,
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("GeoPavingClassify gates on a clean board, exactly once", async () => {
  let completed = 0;
  h = mount(<GeoPavingClassify onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => rows(host).length === 4, "four orders mount");

  expect(hasMath(host, "14"), "the court's length is typeset").toBe(true);

  await answer(host, JOBS.slabs, "Area");
  await answer(host, JOBS.kerb, "Perimeter");
  await answer(host, JOBS.drain, "Neither");
  expect(completed, "three orders of four do not finish the board").toBe(0);

  await answer(host, JOBS.awning, "Area");
  await waitFor(() => completed === 1, "the gate opens on a clean board");
  expect(hasText(host, "Every order landed")).toBe(true);

  // The two measurements the slide is about are produced, not merely implied.
  expect(hasMath(host, "126"), "the area is named").toBe(true);
  expect(hasMath(host, "46"), "the perimeter is named").toBe(true);

  // A settled row keeps every call on screen, disabled, so the comparison survives.
  expect(call(host, JOBS.slabs, "Perimeter").disabled).toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("GeoPavingClassify locks a wrong call and holds the gate shut", async () => {
  let completed = 0;
  h = mount(<GeoPavingClassify onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => rows(host).length === 4, "four orders mount");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  await answer(host, JOBS.kerb, "Area");
  expect(
    call(host, JOBS.kerb, "Perimeter").disabled,
    "the missed row is locked rather than offered again",
  ).toBe(true);
  expect(hasText(host, "The curb follows the boundary"), "the miss is explained").toBe(
    true,
  );

  await answer(host, JOBS.slabs, "Area");
  await answer(host, JOBS.drain, "Neither");
  await answer(host, JOBS.awning, "Area");

  await waitFor(() => hasText(host, "did not hold"), "the finished board reports the miss");
  expect(completed, "a wrong call keeps the gate shut on a full board").toBe(0);
  expect(hasText(host, "Show the working"), "the reasoning is offered instead").toBe(true);
  expect(findButton(host, "Try a fresh set of orders")).toBeTruthy();
});

test("GeoPavingClassify deals a different court on restart", async () => {
  h = mount(<GeoPavingClassify />);
  const { host } = h;
  await waitFor(() => rows(host).length === 4, "four orders mount");

  await answer(host, JOBS.slabs, "Area");
  await answer(host, JOBS.kerb, "Perimeter");
  await answer(host, JOBS.drain, "Neither");
  await answer(host, JOBS.awning, "Area");
  await waitFor(() => hasText(host, "Every order landed"), "the first board finishes");

  findButton(host, "Start over on a different court").click();
  await waitFor(
    () => !hasText(host, JOBS.slabs),
    "none of the first court's orders is dealt again",
  );
  expect(hasMath(host, "11"), "the second board measures a different court").toBe(true);
});
