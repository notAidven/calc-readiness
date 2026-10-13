import { canonicalRawAnswer, type FrozenItem } from "@cr/item-bank";
import { createLessonEngine } from "@cr/lesson";
import type { MasteryService } from "@cr/mastery-service";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { type ApiMasteryServiceDeps, createApiMasteryService } from "./apiMasteryService";
import { LessonPractice } from "./LessonPractice";
import { checkerVersionForItem, practiceItemsById } from "./practiceChecker";
import type { PracticeSource } from "./practiceSession";

import "../styles.css";

function textItem(): FrozenItem {
  const item = [...practiceItemsById.values()].find(
    (candidate) =>
      candidate.answer.answer_spec.answer_type === "numeric" &&
      typeof canonicalRawAnswer(candidate.answer) === "string",
  );
  if (!item) {
    throw new Error("account persistence coverage needs one text-entry practice item");
  }
  return item;
}

function fixedSource(item: FrozenItem, mastery: MasteryService): PracticeSource {
  return {
    nodeId: item.node_id,
    createSession: () => {
      const instance = {
        item_id: item.item_version_id,
        item_version: 1,
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
        template_id: item.template_id,
        template_params: item.template_params,
      };
      const session = createLessonEngine(mastery).startLesson({
        node_id: item.node_id,
        items: [instance, instance, instance, instance, instance],
      });
      session.startTeaching();
      session.submitCheckForUnderstanding(true);
      session.startPractice();
      return { session, initialInstanceIds: [item.item_version_id] };
    },
    drawFresh: () => undefined,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("an account practice set keeps one attempt and offers a visible safe retry", async () => {
  const item = textItem();
  const bodies: Record<string, unknown>[] = [];
  const fetchSpy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return bodies.length === 1
      ? json({ error: "temporary outage" }, 503)
      : json({
          node_id: item.node_id,
          mastery: 3,
          changed: true,
          completion_status: "complete",
        });
  });
  vi.stubGlobal("fetch", fetchSpy);
  const fallback: MasteryService = {
    submitAssessmentEvidence: vi.fn(async () => ({
      node_id: item.node_id,
      mastery: 3 as const,
      changed: true,
      completion_status: "complete" as const,
    })),
  };
  const mastery = createApiMasteryService({
    baseUrl: "https://example.test/api",
    getToken: async () => "jwt",
    fallback,
  } as ApiMasteryServiceDeps);
  const onComplete = vi.fn();

  render(
    <LessonPractice
      nodeId={item.node_id}
      source={fixedSource(item, mastery)}
      onComplete={onComplete}
    />,
  );

  const answer = String(canonicalRawAnswer(item.answer));
  for (let slot = 1; slot <= 5; slot += 1) {
    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: answer } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
  }

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /could not save.*answers are still here/i,
  );
  expect(onComplete).not.toHaveBeenCalled();
  expect(fallback.submitAssessmentEvidence).not.toHaveBeenCalled();
  expect(fetchSpy).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: /retry saving/i }));

  expect(await screen.findByText(/Gold mastery: a perfect set/i)).toBeVisible();
  expect(onComplete).toHaveBeenCalledWith(3, expect.any(String));
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  expect(bodies[0]?.evidence_id).toBe(bodies[1]?.evidence_id);
  expect(bodies[0]).not.toHaveProperty("student_id");
  expect(bodies[1]).not.toHaveProperty("student_id");
});
