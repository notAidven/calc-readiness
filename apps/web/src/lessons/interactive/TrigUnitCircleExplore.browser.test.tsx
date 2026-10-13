import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigUnitCircleExplore } from "./TrigUnitCircleExplore";

/**
 * Three positions, one gate, and the reaches stay unwritten until a heading is locked in.
 *
 * The board is driven through the two step buttons rather than through a drag: a drag would
 * assert the pointer plumbing, and what is worth asserting here is that the arm reaches every
 * marked heading and that the gate waits for the third position. Progress is read off the
 * slot chips' `data-state`, because every answer is also math KaTeX has drawn on the pad.
 */
function slots(host: HTMLElement, state: string): number {
  return host.querySelectorAll(`[data-reach-slot][data-state="${state}"]`).length;
}

function headingNow(host: HTMLElement): number {
  const chip = host.querySelector<HTMLElement>("[data-heading]");
  if (!chip) {
    throw new Error("no heading readout");
  }
  return Number(chip.dataset.heading);
}

/**
 * One press of the counterclockwise button, waited out.
 *
 * The wait is not politeness: a run of presses fired without one reads the same stale heading
 * out of the render they were all dispatched against, so sixteen of them move the arm one stop.
 */
async function step(host: HTMLElement): Promise<void> {
  const before = headingNow(host);
  findButton(host, "Turn counterclockwise").click();
  await waitFor(() => headingNow(host) !== before, `the arm leaves ${before} degrees`);
}

/** Turn counterclockwise until the arm sits at `want`, then commit. */
async function aim(host: HTMLElement, want: number): Promise<void> {
  for (let turns = 0; turns < 16 && headingNow(host) !== want; turns++) {
    await step(host);
  }
  expect(headingNow(host)).toBe(want);
  findButton(host, "Lock in this heading").click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigUnitCircleExplore gates only once all three positions are aimed", async () => {
  let completed = 0;
  h = mount(<TrigUnitCircleExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-reach-slot]") !== null, "the pad mounts");

  expect(slots(host, "solved")).toBe(0);
  // The first board starts at 30 degrees, which answers none of its three tasks.
  expect(headingNow(host)).toBe(30);

  await aim(host, 90);
  await waitFor(() => slots(host, "solved") === 1, "the quarter turn lands");
  expect(completed, "one position of three is not the board").toBe(0);

  await aim(host, 180);
  await waitFor(() => slots(host, "solved") === 2, "the half turn lands");
  expect(completed).toBe(0);

  await aim(host, 225);
  await waitFor(() => completed === 1, "gates on the third position");
  expect(slots(host, "solved")).toBe(3);
  expect(hasText(host, "Start over with different positions")).toBe(true);
});

test("TrigUnitCircleExplore refuses a wrong heading and offers a reveal after the attempt", async () => {
  let completed = 0;
  h = mount(<TrigUnitCircleExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-reach-slot]") !== null, "the pad mounts");

  expect(hasText(host, "Reveal")).toBe(false);

  // 270 stands exactly as far from the horizontal axis as 90 does, on the other side of it:
  // the miss a learner makes by reading "as far ... as it can go" and skipping the "above"
  // that goes with it.
  await aim(host, 270);
  await waitFor(() => hasText(host, "Not that heading"), "the wrong heading is refused");
  expect(slots(host, "solved")).toBe(0);
  expect(completed).toBe(0);
  expect(hasText(host, "Reveal")).toBe(true);

  await aim(host, 90);
  await waitFor(
    () => slots(host, "solved") === 1,
    "the right heading still lands afterwards",
  );
  expect(completed).toBe(0);
});

/**
 * Anything the learner answers with. The reset button is excluded because it only exists on a
 * finished board, and the reveal because it is the way out rather than a way to answer.
 */
const CONTROLS = ".lesson-interactive__chip, .lesson-interactive__check";

function task(host: HTMLElement): string {
  const line = host.querySelector<HTMLElement>(".lesson-interactive__objective");
  if (!line) {
    throw new Error("no task line");
  }
  return (line.textContent ?? "").trim();
}

/**
 * The two round imperatives this file pins, quoted from the widget's own copy.
 *
 * Each is asserted PRESENT before it is ever asserted absent, in the same test and above the
 * `not.toContain` that uses it. That ordering is the floor: a `not.toContain` against a
 * sentence the widget no longer says passes over any board at all, so it would go on reporting
 * green through exactly the rewrite that broke it.
 *
 * Both name a DIRECTION and not only a size, which is what the board is asked to keep. Board A
 * opens on 90 degrees and 270 stands the same distance from the horizontal axis on the far
 * side, so "above" is the whole of the difference between the answer and the miss the second
 * test drives.
 */
const ROUND_ONE = "as far above the horizontal axis as it can go";
const ROUND_TWO = "as far left of the vertical axis";

/**
 * The round's OWN imperative leads the widget, and a miss cannot take it off the screen.
 *
 * The defect this is written for: `WidgetTask` carried a board-level goal ("aim the antenna at
 * the position each task describes") that never said what to do right now, while the per-round
 * imperative rendered in `.lesson-interactive__status` below the pad, the heading chips and the
 * controls, where the first wrong lock-in then overwrote it with feedback until the round
 * advanced. So a learner met an exploration-styled pad with nothing above the fold telling them
 * what to do, and after a miss with no statement of the task anywhere on the screen at all.
 *
 * Three separate claims, because the shipped build satisfied the first two: the line precedes
 * every control, it states THIS round rather than the board, and a refusal leaves it standing.
 * Only the second and third fail against a board-level goal, and only the third against a
 * per-round line put back in the status region.
 */
test("TrigUnitCircleExplore states the round's own task above the controls, and a miss leaves it there", async () => {
  h = mount(<TrigUnitCircleExplore onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-reach-slot]") !== null, "the pad mounts");

  expect(task(host), "the task line does not name the position asked for").toContain(
    ROUND_ONE,
  );
  expect(task(host)).toContain("Position 1 of 3");

  // A floor, because "precedes everything in an empty set" is the pass that hides the defect.
  const controls = Array.from(host.querySelectorAll<HTMLElement>(CONTROLS));
  expect(
    controls.length,
    "no controls were found, so the ordering claim below is vacuous",
  ).toBeGreaterThan(3);
  const line = host.querySelector<HTMLElement>(
    ".lesson-interactive__objective",
  ) as HTMLElement;
  for (const control of controls) {
    expect(
      line.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING,
      `the control "${control.className}" comes before the task line`,
    ).toBeGreaterThan(0);
  }

  // And the task is stated ONCE. Two copies is the fix wearing the defect's clothes.
  const status = host.querySelector<HTMLElement>(".lesson-interactive__status");
  expect(
    status?.textContent ?? "",
    "the status line repeats the task instead of carrying the aiming prompt",
  ).not.toContain(ROUND_ONE);

  // A refused attempt overwrites the status line, and the task survives it.
  await aim(host, 270);
  await waitFor(() => hasText(host, "Not that heading"), "the wrong heading is refused");
  expect(task(host), "a miss took the statement of the task off the screen").toContain(
    ROUND_ONE,
  );

  // The slot tracks the ROUND: a board-level goal would still be reading the same here.
  await aim(host, 90);
  await waitFor(
    () => task(host).includes("Position 2 of 3"),
    "the task line advances to the second position",
  );
  expect(task(host)).toContain(ROUND_TWO);
  expect(
    task(host),
    "the task line is still stating a position already done",
  ).not.toContain(ROUND_ONE);
});

/**
 * A recorded pair is NAMED, not just drawn, because the chip's own content is an ordered pair.
 *
 * `Target.spoken` was declared, documented as how a screen reader says the pair, and set on all
 * six targets while being referenced nowhere in the JSX, so the documented behaviour was not
 * happening at all. What a screen-reader user got was KaTeX for `90^{\circ}: (0, 1)`: two
 * numbers, with nothing saying which of the two reaches either one of them is. This is the
 * assertion that keeps that doc comment honest, and deleting the `.visually-hidden` span fails
 * it at the count.
 */
test("TrigUnitCircleExplore names each recorded pair for a screen reader", async () => {
  h = mount(<TrigUnitCircleExplore onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-reach-slot]") !== null, "the pad mounts");

  const named = () =>
    Array.from(
      host.querySelectorAll<HTMLElement>(
        '[data-reach-slot][data-state="solved"] .visually-hidden',
      ),
    ).map((node) => (node.textContent ?? "").trim());

  // A floor, and the reason it is here: "every recorded chip is named" holds over no recorded
  // chips at all, which is exactly the state the board mounts in.
  expect(named(), "an unaimed board has a spoken pair on it already").toEqual([]);

  await aim(host, 90);
  await waitFor(() => slots(host, "solved") === 1, "the quarter turn lands");

  expect(named().length, "the recorded chip carries no spoken form at all").toBe(1);
  const spoken = named()[0] ?? "";
  expect(spoken).toContain("at 90 degrees");
  expect(spoken, "the pair is read out without naming which reach is which").toContain(
    "horizontal reach nothing, vertical reach one",
  );

  // Still one per recorded chip after a second position, so the naming tracks the board rather
  // than being a single label parked somewhere.
  await aim(host, 180);
  await waitFor(() => slots(host, "solved") === 2, "the half turn lands");
  expect(named().length).toBe(2);
  expect(named()[1]).toContain("horizontal reach negative one, vertical reach nothing");
});

test("TrigUnitCircleExplore writes no reach onto the pad before a heading is locked in", async () => {
  h = mount(<TrigUnitCircleExplore onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-reach-slot]") !== null, "the pad mounts");

  /** The values KaTeX has drawn INSIDE the pad, which is where a live readout would be. */
  const drawn = () =>
    Array.from(host.querySelectorAll("svg [data-latex]")).map(
      (node) => node.getAttribute("data-latex") ?? "",
    );

  // Turn the arm all the way onto the answer and stop short of committing: the two dashed
  // drops move, and nothing on the pad says how long they are.
  for (let turns = 0; turns < 16 && headingNow(host) !== 90; turns++) {
    await step(host);
  }
  expect(headingNow(host)).toBe(90);
  expect(drawn(), "the pad is unlabeled while the arm is being aimed").toEqual([]);

  findButton(host, "Lock in this heading").click();
  await waitFor(
    () => drawn().length === 2,
    "both reaches are written on once it is committed",
  );
  expect(drawn().sort()).toEqual(["0", "1"]);

  // Turning away from a settled heading takes the values back down, so the next task cannot
  // be answered by reading the last one off the pad.
  findButton(host, "Turn counterclockwise").click();
  await waitFor(() => drawn().length === 0, "the reaches come back off when the arm moves");
});
