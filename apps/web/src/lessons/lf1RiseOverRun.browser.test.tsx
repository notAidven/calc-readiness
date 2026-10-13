/**
 * LF.1 slide 2 is a three-part teaching sequence: the advisor explains rise over run, a
 * read-only example computes one slope, and only then does the learner reach the graph.
 *
 * This uses the shipped pack and the real player. `initialTeachingStep` is the player's
 * reviewer seam, so the test can begin on the relevant slide without solving slide 1's gate.
 */

import { afterEach, expect, test } from "vitest";

import { AdvisorLesson } from "./AdvisorLesson";
import { d7LessonByNode } from "./d7";
import { findButton, type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

const LF1 = d7LessonByNode["LF.1"];
if (!LF1) {
  throw new Error("LF.1 is not registered in D7");
}

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function workedExample(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".worked-solution");
}

function graphVisual(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>("figure.lesson-visual");
}

function renderedMath(root: ParentNode): string {
  return Array.from(root.querySelectorAll('annotation[encoding="application/x-tex"]'))
    .map((node) => node.textContent ?? "")
    .join("\n");
}

async function pressNext(host: HTMLElement): Promise<void> {
  findButton(host, "Next").click();
  await new Promise<void>((resolve) => setTimeout(resolve, 20));
}

test("LF.1 works rise, run, and slope after the explanation and before the graph", async () => {
  h = mount(
    <div className="city-shell">
      <AdvisorLesson content={LF1} initialTeachingStep={{ index: 1, section: "lecture" }} />
    </div>,
  );
  const host = h.host;

  await waitFor(
    () =>
      Boolean(
        host.querySelector(".advisor-npc__bubble")?.textContent?.includes("On a graph"),
      ),
    "the Rise over run advisor explanation",
  );
  expect(host.querySelector(".lesson-slide-heading")?.textContent).toContain(
    "Rise over run",
  );
  expect(
    workedExample(host),
    "the example appeared before the explanation finished",
  ).toBeNull();
  expect(graphVisual(host), "the graph appeared during the advisor explanation").toBeNull();

  await pressNext(host);
  await waitFor(() => workedExample(host) !== null, "the rise-over-run worked example");

  const example = workedExample(host);
  if (!example) {
    throw new Error("the rise-over-run worked example did not render");
  }
  expect(
    host.querySelector(".advisor-npc__bubble")?.textContent,
    "the worked example is no longer aligned with the Rise over run explanation",
  ).toContain("On a graph");
  expect(
    graphVisual(host),
    "the graph arrived before the worked example was read",
  ).toBeNull();

  const intro = example.querySelector<HTMLElement>(".worked-solution__intro");
  expect(intro, "the worked example does not name its pair of points").not.toBeNull();
  expect(renderedMath(intro as HTMLElement)).toContain("(1, 5)");
  expect(renderedMath(intro as HTMLElement)).toContain("(4, -1)");

  const steps = Array.from(
    example.querySelectorAll<HTMLElement>("ol.worked-solution__steps > li"),
  );
  expect(steps.length, "the example should show rise, run, then slope").toBe(3);
  expect(steps[0]?.textContent, "the first move does not compute the rise").toContain(
    "Rise",
  );
  expect(renderedMath(steps[0] as HTMLElement)).toContain("-1 - 5 = -6");
  expect(steps[1]?.textContent, "the second move does not compute the run").toContain(
    "Run",
  );
  expect(renderedMath(steps[1] as HTMLElement)).toContain("4 - 1 = 3");
  expect(
    steps[2]?.textContent,
    "the final move does not name the slope calculation",
  ).toContain("Slope: Divide rise by run");
  expect(renderedMath(steps[2] as HTMLElement)).toContain(
    "m = \\dfrac{\\text{rise}}{\\text{run}} = \\dfrac{-6}{3} = -2",
  );

  await pressNext(host);
  await waitFor(() => graphVisual(host) !== null, "the interactive slope graph");

  expect(workedExample(host), "the read-only example remained beside the graph").toBeNull();
  expect(graphVisual(host)?.querySelector("title")?.textContent).toBe(
    "Build a slope from a rise and a run",
  );
  expect(
    Array.from(host.querySelectorAll("button")).some(
      (button) => (button.textContent ?? "").trim() === "Next",
    ),
    "the graph interaction no longer gates the next section",
  ).toBe(false);
});
