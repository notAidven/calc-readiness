import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { ExpDecayClassify } from "./ExpDecayClassify";

/**
 * Three calls per rule rather than two, which is the whole point of the board: a base of
 * exactly $1$ is neither growth nor decay, and a two-way sort would have to lie about it. The
 * gate opens only on a board where every rule is called correctly, so a single wrong call has
 * to hold it shut even after all four rows are settled.
 */
const GROWS = 0;
const DECAYS = 1;
const FLAT = 2;

function rows(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>(".lesson-classify__item"));
}

/** The option buttons of one rule's row. */
function option(host: HTMLElement, row: number, at: number): HTMLButtonElement {
  const item = rows(host)[row];
  if (!item) {
    throw new Error(`no rule at row ${row}`);
  }
  const button = item.querySelectorAll("button")[at];
  if (!button) {
    throw new Error(`no option ${at} on row ${row}`);
  }
  return button as HTMLButtonElement;
}

/** Call one rule, and wait for the row to settle before the next one. */
async function call(host: HTMLElement, row: number, at: number): Promise<void> {
  option(host, row, at).click();
  await waitFor(
    () => rows(host)[row]?.dataset.settled === "true",
    `row ${row} settled on option ${at}`,
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpDecayClassify gates once every base has been called against 1", async () => {
  let completed = 0;
  h = mount(<ExpDecayClassify onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => rows(host).length === 4, "four rules mount");

  // The first board: bases 3, one fifth, 1 and 0.8. Only the third is the dividing case.
  await call(host, 0, GROWS);
  await call(host, 1, DECAYS);
  await call(host, 2, FLAT);
  expect(completed, "three of four calls do not finish the board").toBe(0);

  await call(host, 3, DECAYS);
  await waitFor(() => completed === 1, "gates on a clean board");
  expect(hasText(host, "Every call landed")).toBe(true);
});

/**
 * Two rows called inside one task must both keep their verdict.
 *
 * React batches clicks dispatched in the same task into a single render, so a handler that
 * derives the next map from the `calls` it closed over reads a value one commit stale: the
 * second row's update is built on a map that does not contain the first, and overwrites it.
 * The learner-visible cost is a row that was answered going blank, and then a board that can
 * never complete. A learner is unlikely to out-race a render, but nothing here promises they
 * cannot, and the row of state is the widget's record of their work either way.
 */
test("ExpDecayClassify keeps both verdicts when two rows are called in one task", async () => {
  h = mount(<ExpDecayClassify />);
  const { host } = h;
  await waitFor(() => rows(host).length === 4, "four rules mount");

  option(host, 0, GROWS).click();
  option(host, 1, DECAYS).click();

  await waitFor(() => rows(host)[1]?.dataset.settled === "true", "the second row settles");
  expect(rows(host)[0]?.dataset.settled, "the first row kept its call").toBe("true");
});

test("ExpDecayClassify holds the gate on a board finished with a wrong call", async () => {
  let completed = 0;
  h = mount(<ExpDecayClassify onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => rows(host).length === 4, "four rules mount");

  // 0.8 is under 1 even though it does not look small, which is the mistake this row exists
  // to catch. Calling it growth settles the row and costs the board.
  await call(host, 0, GROWS);
  await call(host, 1, DECAYS);
  await call(host, 2, FLAT);
  await call(host, 3, GROWS);

  await waitFor(() => hasText(host, "did not hold"), "the finished board reports the miss");
  expect(completed, "a wrong call keeps the gate shut on a full board").toBe(0);
  // The reasoning for the missed row is offered rather than the answer alone.
  expect(hasText(host, "Show the working")).toBe(true);
});
