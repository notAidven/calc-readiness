import { afterEach, expect, test } from "vitest";

import { AdvisorLesson } from "./AdvisorLesson";
import { findButton, type Harness, hasText, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

/** A lesson whose first paragraph carries a gating widget the test never completes. */
const CONTENT: LessonContent = {
  node_id: "TEST",
  title: "Escape hatch fixture",
  mini_lesson: ["ALPHA paragraph one", "BETA paragraph two"],
  visuals: [{ after: 0, id: "pemdas-solver", gates: true }],
  cfu: {
    prompt: "What is $1 + 1$?",
    accepted: ["2"],
    hint: "Add them.",
    check: { answer_type: "numeric", answer_key: "2" },
  },
};

function hasButton(host: HTMLElement, text: string): boolean {
  return Array.from(host.querySelectorAll("button")).some((b) =>
    (b.textContent ?? "").includes(text),
  );
}

/**
 * Walk forward to the slide's ACTIVITY section, where the widget is.
 *
 * Driven by what is on screen rather than by a click count: how many sections a slide has
 * depends on whether the pack authored a worked example for it (`teachingSections.ts`).
 */
async function reachTheWidget(host: HTMLElement): Promise<void> {
  for (let step = 0; step < 6; step += 1) {
    if (host.querySelector("figure.lesson-visual") !== null) {
      return;
    }
    findButton(host, "Next").click();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("the advisor never reached the gating widget");
}

test("an incomplete gating widget hard-blocks Next with no escape hatch", async () => {
  h = mount(<AdvisorLesson content={CONTENT} />);
  const { host } = h;
  await waitFor(() => hasText(host, "ALPHA paragraph one"), "first paragraph shows");

  // The widget lives in the slide's last section, so the gate cannot bite until the
  // learner is standing in front of the thing it is gating on.
  await reachTheWidget(host);

  // Gate is active and unfinished: neither "Next" nor any reveal-to-continue
  // escape hatch is offered, so the lesson stays on paragraph one.
  expect(hasButton(host, "Next")).toBe(false);
  expect(hasButton(host, "Reveal answer")).toBe(false);
  expect(hasText(host, "ALPHA paragraph one")).toBe(true);
  expect(hasText(host, "BETA paragraph two")).toBe(false);
});

/**
 * The other half of the same gate, and the half the three-section walk introduced.
 *
 * A gate holds back the section that RENDERS its widget and no earlier one: in the lecture
 * there is nothing on screen to finish, so withholding Next there would strand the learner
 * on a page whose only instruction is to complete a widget they have not been shown. The
 * sibling above proves the gate still bites; this proves it does not bite early.
 */
test("the same unfinished gate does not withhold Next in the lecture section", async () => {
  h = mount(<AdvisorLesson content={CONTENT} />);
  const { host } = h;
  await waitFor(() => hasText(host, "ALPHA paragraph one"), "first paragraph shows");

  // Nothing under the bubble yet, so nothing to complete and nothing held back.
  expect(host.querySelector("figure.lesson-visual")).toBeNull();
  expect(hasButton(host, "Next")).toBe(true);

  // And the gate really is unmet, rather than this being a lesson without one: the same
  // widget, one section on, takes Next away again.
  await reachTheWidget(host);
  expect(hasButton(host, "Next")).toBe(false);
});
