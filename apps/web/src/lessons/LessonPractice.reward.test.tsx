import { EARN } from "@cr/economy";
import { canonicalRawAnswer, D1_PRACTICE_ITEMS } from "@cr/item-bank";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { resetCityEra } from "../city/useCityEra";
import type { PracticeSetCompleteOutcome } from "../economy/economyClient";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { LessonPractice } from "./LessonPractice";
import { fixedSource } from "./practiceSurfaceFixture";

afterEach(resetCityEra);

test("an ordinary learner completion carries one durable set id into one economy transaction", async () => {
  const item = D1_PRACTICE_ITEMS.find(
    (candidate) =>
      candidate.answer.answer_spec.answer_type === "numeric" &&
      typeof canonicalRawAnswer(candidate.answer) === "string",
  );
  if (!item) {
    throw new Error("the ordinary-practice reward guard needs one numeric D1 item");
  }
  const answer = String(canonicalRawAnswer(item.answer));
  const economy = createInMemoryEconomyClient();
  const observed: { transaction?: PracticeSetCompleteOutcome } = {};

  render(
    <LessonPractice
      nodeId={item.node_id}
      source={fixedSource(item)}
      onComplete={async (mastery, evidenceId) => {
        observed.transaction = await economy.reportPracticeSetComplete({
          nodeId: item.node_id,
          mastery,
          evidenceId,
        });
      }}
    />,
  );

  for (let slot = 0; slot < 5; slot += 1) {
    fireEvent.change(screen.getByRole("textbox"), { target: { value: answer } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Correct! Nice work.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  }

  await waitFor(() => expect(observed.transaction).toBeDefined());
  const transaction = observed.transaction;
  if (!transaction) {
    throw new Error("the completed learner set produced no economy transaction");
  }
  expect(transaction).toMatchObject({
    applied: true,
    rewardKind: "repeat_practice",
    grantedMaterials: { stone: EARN.interleaved.material },
  });
  expect(transaction.eventId).toMatch(/^practice_complete:[^:]+$/);
  expect((await economy.getWallet()).spendable).toBe(EARN.interleaved.material);
  expect(economy.snapshot().entries).toHaveLength(1);
});
