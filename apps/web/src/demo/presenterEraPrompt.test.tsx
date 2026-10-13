import { ERA_SEQUENCE } from "@cr/skill-graph";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { App } from "../App";
import { lessonEyebrow } from "../city/d1LessonHost";
import { buildingSubtitle } from "../city/eraDressing";
import { resetCityEra } from "../city/useCityEra";

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

/**
 * Read the prompt from the public Presenter lesson surface itself. The fixture and the
 * lesson host are both in the population: a helper-only assertion would stay green if the
 * rendered route kept using its old Era 3 fallback.
 */
async function freshPresenterPrompt(eraId: (typeof ERA_SEQUENCE)[number]["id"]) {
  window.history.replaceState(
    null,
    "",
    `/demo?presenter=1&preset=bronze-city&surface=lesson&era=${eraId}`,
  );
  const mounted = render(<App />);
  const prompt = await waitFor(() => {
    const label = document.querySelector<HTMLElement>(".world-scene .micro-label");
    if (!label?.textContent) {
      throw new Error(`the ${eraId} Presenter lesson did not render its build prompt`);
    }
    return label.textContent;
  });
  expect(new URL(window.location.href).searchParams.get("era")).toBe(eraId);
  mounted.unmount();
  cleanup();
  resetCityEra();
  return prompt;
}

test("every target era opens LF.1 without replacing that target", {
  timeout: 30_000,
}, async () => {
  expect(ERA_SEQUENCE.length, "the all-era sweep has lost part of the era registry").toBe(
    10,
  );

  const prompts = new Map<string, string>();
  for (const era of ERA_SEQUENCE) {
    prompts.set(era.id, await freshPresenterPrompt(era.id));
  }

  const lf1Prompt = `${buildingSubtitle("LF.1", "atomic_age")} · mini-lesson`;
  const expected = new Map(ERA_SEQUENCE.map((era) => [era.id, lf1Prompt]));
  expect(Object.fromEntries(prompts)).toEqual(Object.fromEntries(expected));
  expect(prompts.get("atomic_age")).toBe(lf1Prompt);
});

test("ordinary learner lesson chrome keeps the stable building handle", () => {
  expect(lessonEyebrow("NUM.S", null)).toBe("Assembly Hall · mini-lesson");
});
