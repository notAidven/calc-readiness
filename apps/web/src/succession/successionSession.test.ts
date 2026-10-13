import { expect, it } from "vitest";

import { successionFrozenItem } from "./successionItems";
import {
  createLocalSuccessionSession,
  type SuccessionLocalStorage,
} from "./successionSession";

function storage(): SuccessionLocalStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

it("restores the exact active question and reducer state from browser-local demo storage", async () => {
  const saved = storage();
  const first = createLocalSuccessionSession({ storage: saved });
  const started = await first.command({ type: "start" });
  expect(started.battle?.state.phase).toBe("ready");

  const asking = await first.command({ type: "start_batch" });
  const active =
    asking.battle?.active_batch?.status === "ready" ? asking.battle.active_batch : null;
  expect(active?.prompts).toHaveLength(3);
  const prompt = active?.prompts[0];
  const item = prompt ? successionFrozenItem(prompt.item_version_id) : undefined;
  expect(item?.answer.answer_key).toBeTypeOf("string");

  await first.command({
    type: "answer",
    item_version_id: prompt?.item_version_id ?? "",
    raw_answer: item?.answer.answer_key ?? "",
  });
  const before = await first.load();

  const reloaded = createLocalSuccessionSession({ storage: saved });
  expect(await reloaded.load()).toEqual(before);
  expect((await reloaded.load()).battle).toMatchObject({
    state: { phase: "answering", batch: 0 },
    verdicts: [true],
  });
});

it("does not bank an unreadable local answer", async () => {
  const session = createLocalSuccessionSession({ storage: storage() });
  await session.command({ type: "start" });
  const asking = await session.command({ type: "start_batch" });
  const prompt =
    asking.battle?.active_batch?.status === "ready"
      ? asking.battle.active_batch.prompts[0]
      : undefined;
  const before = await session.load();
  const result = await session.command({
    type: "answer",
    item_version_id: prompt?.item_version_id ?? "",
    raw_answer: "",
  });

  expect(result.verdict?.correct).toBeNull();
  expect(result.battle).toEqual(before.battle);
});
