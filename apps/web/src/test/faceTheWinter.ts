import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { expect } from "vitest";

/**
 * **WALK THE CRISIS BRIEFING AND ANSWER THE CALL — the one place the gate is driven from.**
 *
 * The team lead ruled on 2026-08-02 that *"Face the winter"* is disabled until the learner has
 * been through all four walkthrough slides (`CRISIS_BRIEFING_SEEN_KEY` carries the ruling, and
 * `crisisCall.browser.test.tsx` is where the gate itself is measured). Eleven suites reach the
 * encounter through that card, and every one of them clicked the primary button directly.
 *
 * ## Why this walks the slides rather than pre-setting the flag
 *
 * `markCrisisBriefingRead()` in a `beforeEach` would be one line and would take every one of those
 * suites out of the gate's population: they would stop opening a card a learner has to get past,
 * and the day the gate breaks nothing but its own test would notice. Walking the slides costs a
 * handful of clicks and keeps the real path under every suite that uses the door.
 *
 * It also asserts the gate ON THE WAY THROUGH — the button is disabled before the last slide and
 * enabled after it — so a gate that silently stopped gating fails in eleven places rather than
 * one, which is the direction that matters for a control whose whole job is to be in the way.
 */
export async function faceTheWinter(user: UserEvent): Promise<void> {
  const face = await screen.findByTestId("crisis-call-face");
  if (!(face as HTMLButtonElement).disabled) {
    // Already read on a previous entry, or a briefing with no slides. Nothing to walk.
    await user.click(face);
    return;
  }

  const advisor = await screen.findByTestId("crisis-call-advisor");
  const next = within(advisor).getByTestId("crisis-call-next");
  // Bounded by the number of steps the card itself reports, so a fifth slide is walked without
  // this helper being touched and a card that never enables the button fails on the assertion
  // below rather than looping.
  const steps = Number(
    /of (\d+)/.exec(
      within(advisor).getByTestId("crisis-call-slide").textContent ?? "",
    )?.[1] ?? "0",
  );
  expect(steps, "the walkthrough does not say how many steps it has").toBeGreaterThan(1);
  for (let step = 1; step < steps; step += 1) {
    expect(
      (screen.getByTestId("crisis-call-face") as HTMLButtonElement).disabled,
      `Face the winter is already enabled on step ${step} of ${steps}`,
    ).toBe(true);
    await user.click(next);
  }

  const opened = screen.getByTestId("crisis-call-face") as HTMLButtonElement;
  expect(opened.disabled, "the gate did not open on the last slide").toBe(false);
  await user.click(opened);
}
