import { D3_PRACTICE_ITEMS, D4_PRACTICE_ITEMS } from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import {
  clearReviewMistake,
  REVIEW_MISTAKE_CAP,
  readReviewMistakes,
  recordReviewMistake,
  seedReviewMistakes,
  seedReviewMistakesOnce,
} from "./mistakeStore";

function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("persisted review mistakes", () => {
  it("deduplicates real missed items and scopes them by learner and era", () => {
    const storage = memory();
    const bronze = D3_PRACTICE_ITEMS[0];
    const classical = D4_PRACTICE_ITEMS[0];
    expect(bronze).toBeDefined();
    expect(classical).toBeDefined();
    recordReviewMistake("learner-a", bronze!, storage);
    recordReviewMistake("learner-a", bronze!, storage);
    recordReviewMistake("learner-a", classical!, storage);

    expect(readReviewMistakes("learner-a", "bronze_age", storage)).toHaveLength(1);
    expect(readReviewMistakes("learner-a", "classical", storage)).toHaveLength(1);
    expect(readReviewMistakes("learner-b", "bronze_age", storage)).toEqual([]);
  });

  it("retires one item only after a correct review", () => {
    const storage = memory();
    const items = D3_PRACTICE_ITEMS.slice(0, 3);
    seedReviewMistakes("learner", "bronze_age", items, storage);
    expect(readReviewMistakes("learner", "bronze_age", storage)).toHaveLength(3);
    clearReviewMistake("learner", "bronze_age", items[0]!.item_version_id, storage);
    expect(
      readReviewMistakes("learner", "bronze_age", storage).map(
        (entry) => entry.itemVersionId,
      ),
    ).toEqual(items.slice(1).map((item) => item.item_version_id));
  });

  it("seeds a demonstrable real-item population with a bounded floor", () => {
    const storage = memory();
    const seeded = seedReviewMistakes(
      "presenter",
      "bronze_age",
      D3_PRACTICE_ITEMS.slice(0, 4),
      storage,
    );
    expect(seeded.length).toBeGreaterThanOrEqual(3);
    expect(seeded.length).toBeLessThanOrEqual(REVIEW_MISTAKE_CAP);
    expect(
      seeded.every((entry) =>
        D3_PRACTICE_ITEMS.some((item) => item.item_version_id === entry.itemVersionId),
      ),
    ).toBe(true);
  });

  it("seeds a disposable queue once and preserves its real empty state after clearing", () => {
    const storage = memory();
    const items = D3_PRACTICE_ITEMS.slice(0, 3);
    expect(seedReviewMistakesOnce("presenter", "bronze_age", items, storage)).toHaveLength(
      3,
    );
    for (const item of items) {
      clearReviewMistake("presenter", "bronze_age", item.item_version_id, storage);
    }
    expect(seedReviewMistakesOnce("presenter", "bronze_age", items, storage)).toEqual([]);
  });

  it("rejects an injected unrelated item even when its declared era matches", () => {
    const storage = memory();
    storage.setItem(
      "cr.reviewMistakes.v1.learner.bronze_age",
      JSON.stringify([
        {
          itemVersionId: "not-in-the-item-bank",
          nodeId: "LIN.1",
          templateId: "unrelated",
          eraId: "bronze_age",
        },
      ]),
    );
    expect(readReviewMistakes("learner", "bronze_age", storage)).toEqual([]);
  });
});
