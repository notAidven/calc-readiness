import { islandUnlockTarget } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { practiceItemsById } from "../lessons/practiceChecker";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { IslandUnlockExam } from "./IslandUnlockExam";
import { clearIslandUnlockExam, saveIslandUnlockExam } from "./islandUnlockExamPersistence";

import "../styles.css";

const CURRENT = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
const DESTINATION = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];
const TARGET = islandUnlockTarget(CURRENT.nodes.length);
const RATIONAL = [...practiceItemsById.values()].find(
  (item) => item.answer.answer_spec.answer_type === "rational_answer",
);
if (!RATIONAL) {
  throw new Error("The item bank has no rational-answer control to measure.");
}
const RATIONAL_ERA = ERA_SEQUENCE.find((era) => era.nodes.includes(RATIONAL.node_id));
if (!RATIONAL_ERA) {
  throw new Error(
    `The rational-answer node ${RATIONAL.node_id} is outside the era sequence.`,
  );
}
const RATIONAL_POOL = [
  RATIONAL,
  ...RATIONAL_ERA.nodes
    .filter((nodeId) => nodeId !== RATIONAL.node_id)
    .map((nodeId) => {
      const item = [...practiceItemsById.values()].find(
        (candidate) => candidate.node_id === nodeId,
      );
      if (!item) {
        throw new Error(`The ${RATIONAL_ERA.name} browser pool is missing ${nodeId}.`);
      }
      return item;
    }),
];

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
  clearIslandUnlockExam(CURRENT.id);
  clearIslandUnlockExam(RATIONAL_ERA.id);
});

function callbacks(unlock: () => Promise<void> = async () => undefined) {
  return {
    unlock,
    sail: vi.fn(async () => undefined),
    keep: vi.fn(),
    exit: vi.fn(),
  };
}

function mountExam(options?: {
  readonly era?: typeof CURRENT;
  readonly poolSource?: typeof RATIONAL_POOL;
  readonly unlock?: () => Promise<void>;
}): void {
  const cb = callbacks(options?.unlock);
  harness = mount(
    <div className="city-shell">
      <IslandUnlockExam
        eraId={(options?.era ?? CURRENT).id}
        poolSource={options?.poolSource}
        rng={() => 0.999_999}
        enableCanvas={false}
        reducedMotion
        onUnlockIsland={cb.unlock}
        onSail={cb.sail}
        onKeepLearning={cb.keep}
        onExit={cb.exit}
      />
    </div>,
  );
}

function cleanupExam(): void {
  harness?.cleanup();
  harness = null;
}

function saveCurrent(
  phase: "exam" | "reveal",
  resolvedOutcome: "wrong" | null = null,
): void {
  saveIslandUnlockExam({
    version: 2,
    eraId: CURRENT.id,
    destinationEraId: DESTINATION.id,
    phase,
    score: phase === "exam" ? 0 : TARGET,
    target: TARGET,
    currentItemVersionId: null,
    scheduler: null,
    resolvedOutcome,
    sessionId: `mobile-${phase}`,
    responseCount: resolvedOutcome === null ? 0 : 1,
    pendingResponse: null,
  });
}

test("a 390px multi-field answer finishes before its full-width Check action", async () => {
  await page.viewport(390, 580);
  mountExam({ era: RATIONAL_ERA, poolSource: RATIONAL_POOL });
  await waitFor(
    () => document.querySelector(".cr-rational-answer") !== null,
    "the rational answer did not render",
  );

  const form = document.querySelector<HTMLElement>("form.lesson-player__row");
  const answer = document.querySelector<HTMLElement>(".cr-rational-answer");
  const check = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === "Check",
  );
  expect(form).not.toBeNull();
  expect(answer).not.toBeNull();
  expect(check).toBeDefined();
  if (!form || !answer || !check) {
    return;
  }

  const fields = [...answer.querySelectorAll<HTMLInputElement>("input")];
  expect(fields.length, "the multi-field population disappeared").toBeGreaterThanOrEqual(2);
  const formBox = form.getBoundingClientRect();
  const answerBox = answer.getBoundingClientRect();
  const checkBox = check.getBoundingClientRect();
  expect(checkBox.top).toBeGreaterThanOrEqual(answerBox.bottom - 1);
  expect(checkBox.width).toBeGreaterThanOrEqual(formBox.width - 1);
  expect(checkBox.right).toBeLessThanOrEqual(window.innerWidth);
  expect(checkBox.bottom).toBeLessThanOrEqual(window.innerHeight);

  const focusOrder = [...form.querySelectorAll<HTMLElement>("input, button")];
  expect(focusOrder.indexOf(check)).toBeGreaterThan(
    Math.max(...fields.map((field) => focusOrder.indexOf(field))),
  );
});

test("every exam Back, Check, Skip, Next, and Retry action is at least 44px", async () => {
  await page.viewport(390, 580);
  const required = [
    "Back to island · progress saved",
    "Check",
    "Next question",
    "Retry founding",
    "Skip (−1)",
  ] as const;
  const heights = new Map<string, number>();
  const collect = () => {
    for (const button of document.querySelectorAll<HTMLButtonElement>("button")) {
      const name = button.textContent?.trim() ?? "";
      if (required.includes(name as (typeof required)[number])) {
        heights.set(name, button.getBoundingClientRect().height);
      }
    }
  };

  mountExam();
  await waitFor(
    () => document.querySelector('[data-testid="island-unlock-exam"]') !== null,
    "the live exam did not render",
  );
  collect();
  cleanupExam();

  saveCurrent("exam", "wrong");
  mountExam();
  await waitFor(
    () =>
      Array.from(document.querySelectorAll("button")).some(
        (button) => button.textContent?.trim() === "Next question",
      ),
    "the resolved question did not render Next",
  );
  collect();
  cleanupExam();

  saveCurrent("reveal");
  mountExam({ unlock: async () => Promise.reject(new Error("shore connection lost")) });
  await waitFor(
    () =>
      Array.from(document.querySelectorAll("button")).some(
        (button) => button.textContent?.trim() === "Retry founding",
      ),
    "the failed founding did not render Retry",
  );
  collect();

  expect(heights.size, "the required action population narrowed").toBeGreaterThanOrEqual(5);
  expect([...heights.keys()].sort()).toEqual([...required].sort());
  for (const [name, height] of heights) {
    expect(height, `${name} touch target`).toBeGreaterThanOrEqual(44);
  }
});
