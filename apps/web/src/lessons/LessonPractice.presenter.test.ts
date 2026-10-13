import { masteryFromCorrectCount } from "@cr/mastery-service";
import { expect, test, vi } from "vitest";

import { completePerfectPresenterPractice } from "./LessonPractice";
import { practiceSourceForNode } from "./domains";

test("Presenter completion submits a genuine perfect set without revealing a slot", async () => {
  const active = practiceSourceForNode("LIN.1").createSession().session;
  const submit = vi.spyOn(active, "submitAnswer");
  const submitPractice = vi.spyOn(active, "submitPractice");
  const reveal = vi.spyOn(active, "reveal");
  const skipRevealed = vi.spyOn(active, "skipRevealedSlot");

  const result = await completePerfectPresenterPractice(active, "presenter-set-1");

  expect(submit).toHaveBeenCalledTimes(5);
  expect(submitPractice).toHaveBeenCalledWith("presenter-set-1");
  expect(reveal).not.toHaveBeenCalled();
  expect(skipRevealed).not.toHaveBeenCalled();
  expect(result.mastery).toBe(3);
});

test("Presenter completion does not change the learner scoring boundaries", () => {
  expect(masteryFromCorrectCount(4)).toBe(2);
  expect(masteryFromCorrectCount(5)).toBe(3);
});
