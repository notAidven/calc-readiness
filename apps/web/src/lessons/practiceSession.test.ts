/**
 * The reveal→retry hard gate: a drawn replacement must differ in both id and prompt from
 * the problem the student just saw. Id-only avoid lives in the item-bank draw; this is
 * the UI post-condition that closes the same-problem hole.
 */

import type { FrozenItem } from "@cr/item-bank";
import type { PracticeItemInstance } from "@cr/lesson";
import { describe, expect, it } from "vitest";

import { practiceItemsById } from "./practiceChecker";
import { isDistinctRetry } from "./practiceSession";

function firstPracticeItem(): FrozenItem {
  const item = practiceItemsById.values().next().value;
  if (!item) {
    throw new Error("expected at least one registered practice item");
  }
  return item;
}

function asInstance(item: FrozenItem): PracticeItemInstance {
  return {
    item_id: item.item_version_id,
    item_version: 1,
    item_version_id: item.item_version_id,
    equivalence_checker_version: 1,
    template_id: item.template_id,
    template_params: item.template_params,
  };
}

describe("isDistinctRetry", () => {
  it("rejects the same item-version id", () => {
    const current = firstPracticeItem();
    expect(isDistinctRetry(current, asInstance(current))).toBe(false);
  });

  it("accepts a different id with a different prompt", () => {
    const current = firstPracticeItem();
    const other = [...practiceItemsById.values()].find(
      (item) =>
        item.item_version_id !== current.item_version_id && item.prompt !== current.prompt,
    );
    expect(other).toBeDefined();
    expect(isDistinctRetry(current, asInstance(other as FrozenItem))).toBe(true);
  });

  it("rejects a different id that somehow shares the same prompt", () => {
    const current = firstPracticeItem();
    const twin: PracticeItemInstance = {
      ...asInstance(current),
      item_version_id: `${current.item_version_id}__twin`,
      item_id: `${current.item_version_id}__twin`,
    };
    // Twin is not in practiceItemsById, so the prompt lookup fails closed.
    expect(isDistinctRetry(current, twin)).toBe(false);
  });
});
