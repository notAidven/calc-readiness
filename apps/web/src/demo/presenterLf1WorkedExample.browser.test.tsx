import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";

import "../styles.css";

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

function renderedMath(root: ParentNode): string {
  return Array.from(root.querySelectorAll('annotation[encoding="application/x-tex"]'))
    .map((node) => node.textContent ?? "")
    .join("\n");
}

async function eventually<T>(
  read: () => T | null | undefined,
  message: string,
  timeoutMs = 10_000,
): Promise<T> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const value = read();
    if (value !== null && value !== undefined) {
      return value;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

test("Presenter Lesson shows the concrete LF.1 calculation before its graph", {
  timeout: 60_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=city&era=atomic_age",
  );
  render(<App />);

  const presenterActions = await screen.findByRole("navigation", {
    name: "Presenter actions",
  });
  within(presenterActions)
    .getByRole<HTMLButtonElement>("button", { name: "Lesson" })
    .click();

  await eventually(
    () =>
      document.querySelector<HTMLElement>(".world-scene-head h2")?.textContent ===
      "Slope as a constant rate of change"
        ? true
        : null,
    "the Presenter LF.1 heading did not render",
  );
  const firstLessonContent = await eventually(
    () => document.querySelector<HTMLElement>(".worked-solution, figure.lesson-visual"),
    "the Presenter LF.1 route rendered neither its example nor its graph",
  );
  if (firstLessonContent.matches("figure.lesson-visual")) {
    throw new Error("the rise-over-run graph rendered before the worked calculation");
  }
  const example = firstLessonContent;

  expect(example).toBeVisible();
  expect(example).toHaveTextContent("Worked example");

  const intro = example.querySelector<HTMLElement>(".worked-solution__intro");
  if (!intro) {
    throw new Error("the worked example does not visibly name both points");
  }
  expect(renderedMath(intro)).toContain("(1, 5)");
  expect(renderedMath(intro)).toContain("(4, -1)");

  const steps = Array.from(
    example.querySelectorAll<HTMLElement>("ol.worked-solution__steps > li"),
  );
  expect(steps, "the calculation must visibly sequence rise, run, then slope").toHaveLength(
    3,
  );
  expect(steps[0]).toHaveTextContent("Rise");
  expect(renderedMath(steps[0] as HTMLElement)).toContain("-1 - 5 = -6");
  expect(steps[1]).toHaveTextContent("Run");
  expect(renderedMath(steps[1] as HTMLElement)).toContain("4 - 1 = 3");
  expect(steps[2]).toHaveTextContent("Slope");
  expect(renderedMath(steps[2] as HTMLElement)).toContain(
    "m = \\dfrac{\\text{rise}}{\\text{run}} = \\dfrac{-6}{3} = -2",
  );

  const renderedSizes = Array.from(
    example.querySelectorAll<HTMLElement>(".katex"),
    (math) => Number.parseFloat(getComputedStyle(math).fontSize),
  );
  expect(
    renderedSizes.length,
    "the example contains no rendered KaTeX",
  ).toBeGreaterThanOrEqual(5);
  expect(Math.min(...renderedSizes)).toBeGreaterThanOrEqual(18);

  screen.getByRole<HTMLButtonElement>("button", { name: "Next" }).click();
  await eventually(
    () => document.querySelector<HTMLElement>("figure.lesson-visual"),
    "the graph did not follow the worked calculation",
  );
  expect(document.querySelector(".worked-solution")).toBeNull();
  expect(
    await screen.findByRole("img", { name: /with a run of .* and a rise of/i }),
  ).toBeVisible();
});
