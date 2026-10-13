import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { GeoNetDrag } from "./GeoNetDrag";

/**
 * The first job is a chest $6$ by $4$ by $3$, faced everywhere except the underside it
 * stands on, so the sheet it takes is $18 + 12 + 12 + 18 + 24 = 84$ square meters. A test
 * that only sorted the faces would pass over a board that never added them up, and the sum
 * is the half of the slide the net exists for.
 */
const FACES = {
  top: "top, 6 meters by 4 meters",
  back: "back, 6 meters by 3 meters",
  front: "front, 6 meters by 3 meters",
  left: "left end, 3 meters by 4 meters",
  right: "right end, 3 meters by 4 meters",
  under: "underside, 6 meters by 4 meters",
} as const;

const COVERED = "Put the face you are holding in the pile covered by the job";
const BARE = "Put the face you are holding in the pile left bare";

/** A placed face spells its verdict into its own label, so faces match on the prefix. */
function face(host: HTMLElement, aria: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label^="${aria}"]`);
  if (!button) {
    throw new Error(`no face labelled "${aria}"`);
  }
  return button;
}

function pile(host: HTMLElement, aria: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${aria}"]`);
  if (!button) {
    throw new Error(`no pile labelled "${aria}"`);
  }
  return button;
}

/** Tap a face, then tap a pile: what `usePickup` accepts in place of a drag. */
async function put(host: HTMLElement, aria: string, into: string): Promise<void> {
  face(host, aria).click();
  await waitFor(
    () => face(host, aria).getAttribute("aria-pressed") === "true",
    `"${aria}" is picked up`,
  );
  pile(host, into).click();
  await waitFor(() => face(host, aria).disabled, `"${aria}" lands in its pile`);
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("GeoNetDrag gates on every face sorted by the job, exactly once", async () => {
  let completed = 0;
  h = mount(<GeoNetDrag onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelectorAll("button[data-face]").length === 6,
    "net mounts",
  );

  expect(hasText(host, "its underside is never faced"), "the job is stated").toBe(true);

  await put(host, FACES.top, COVERED);
  await put(host, FACES.back, COVERED);
  await put(host, FACES.front, COVERED);
  await put(host, FACES.left, COVERED);
  await put(host, FACES.right, COVERED);
  expect(completed, "five faces of six do not finish the net").toBe(0);
  // The running total is the sum of the faces claimed, in the order the net lays them out,
  // rather than a number that appears at the end.
  expect(hasMath(host, "18 + 12 + 12 + 18 + 24 = 84"), "the sum builds as it goes").toBe(
    true,
  );

  await put(host, FACES.under, BARE);
  await waitFor(() => completed === 1, "the gate opens on a clean sort");
  expect(hasText(host, "square meters of sheet")).toBe(true);
  expect(hasMath(host, "84"), "the job's total is named").toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("GeoNetDrag locks a face put in the wrong pile and holds the gate shut", async () => {
  let completed = 0;
  h = mount(<GeoNetDrag onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelectorAll("button[data-face]").length === 6,
    "net mounts",
  );

  // The whole-solid assumption: every face counted, including the one nobody covers.
  await put(host, FACES.under, COVERED);
  expect(
    face(host, FACES.under).disabled,
    "the wrong pile is not offered a second guess",
  ).toBe(true);

  await put(host, FACES.top, COVERED);
  await put(host, FACES.back, COVERED);
  await put(host, FACES.front, COVERED);
  await put(host, FACES.left, COVERED);
  await put(host, FACES.right, COVERED);

  await waitFor(() => hasText(host, "wrong pile"), "the finished net reports the miss");
  expect(completed, "a face in the wrong pile keeps the gate shut").toBe(0);
  expect(hasText(host, "Show the working"), "the reasoning is offered instead").toBe(true);
  expect(findButton(host, "Try a fresh job")).toBeTruthy();
});

test("GeoNetDrag deals a different job on restart", async () => {
  h = mount(<GeoNetDrag />);
  const { host } = h;
  await waitFor(
    () => host.querySelectorAll("button[data-face]").length === 6,
    "net mounts",
  );

  await put(host, FACES.top, COVERED);
  await put(host, FACES.back, COVERED);
  await put(host, FACES.front, COVERED);
  await put(host, FACES.left, COVERED);
  await put(host, FACES.right, COVERED);
  await put(host, FACES.under, BARE);
  await waitFor(() => hasText(host, "square meters of sheet"), "the first job finishes");

  findButton(host, "Start over on a different job").click();
  await waitFor(
    () => hasText(host, "watering trough"),
    "the second job leaves two faces bare rather than one",
  );
  expect(
    host.querySelector(`button[aria-label^="${FACES.under}"]`),
    "the chest's faces are gone with the job",
  ).toBeNull();
});
