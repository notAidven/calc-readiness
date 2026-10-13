import type { FrozenItem } from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { createInterleavedScheduler, createRandomScheduler } from "./infiniteScheduler";

function stubItem(nodeId: string, itemVersionId: string): FrozenItem {
  return {
    item_version_id: itemVersionId,
    node_id: nodeId,
    form: "A",
    template_id: "stub",
    template_params: {},
    prompt: "stub",
    difficulty: 1,
    hints: [],
    worked_solution: [],
    answer: {
      answer_key: "1",
      answer_spec: { answer_type: "numeric" },
    },
  } as unknown as FrozenItem;
}

/** Deterministic rng from a fixed draw sequence. */
function sequenceRng(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

describe("createRandomScheduler", () => {
  it("throws when the pool is empty", () => {
    expect(() => createRandomScheduler([])).toThrow(
      /no practice items available for infinite practice/,
    );
  });

  it("avoids serving the same item back-to-back when the pool has more than one", () => {
    const pool = [stubItem("A", "a1"), stubItem("A", "a2"), stubItem("A", "a3")];
    const scheduler = createRandomScheduler(pool, sequenceRng([0, 0, 0.99, 0]));
    const first = scheduler.next();
    const second = scheduler.next();
    expect(second.item_version_id).not.toBe(first.item_version_id);
  });
});

describe("createInterleavedScheduler", () => {
  const pool = [
    stubItem("A", "a1"),
    stubItem("A", "a2"),
    stubItem("B", "b1"),
    stubItem("C", "c1"),
    stubItem("C", "c2"),
  ];

  it("throws when the pool is empty", () => {
    expect(() => createInterleavedScheduler([])).toThrow(
      /no practice items available for infinite practice/,
    );
  });

  it("serves every node exactly once per shuffled cycle", () => {
    const scheduler = createInterleavedScheduler(
      pool,
      sequenceRng([0.1, 0.2, 0.3, 0.4, 0.5]),
    );
    const cycle = [scheduler.next(), scheduler.next(), scheduler.next()].map(
      (item) => item.node_id,
    );
    expect(new Set(cycle)).toEqual(new Set(["A", "B", "C"]));
    expect(cycle).toHaveLength(3);
  });

  it("never serves the same node twice in a row across cycle boundaries", () => {
    const scheduler = createInterleavedScheduler(pool, () => Math.random());
    let previous: string | null = null;
    for (let draw = 0; draw < 60; draw += 1) {
      const nodeId = scheduler.next().node_id;
      if (previous !== null) {
        expect(nodeId).not.toBe(previous);
      }
      previous = nodeId;
    }
  });

  it("covers every node in the pool over several cycles", () => {
    const scheduler = createInterleavedScheduler(pool, () => Math.random());
    const seen = new Set<string>();
    for (let draw = 0; draw < 15; draw += 1) {
      seen.add(scheduler.next().node_id);
    }
    expect(seen).toEqual(new Set(["A", "B", "C"]));
  });

  it("avoids repeating the same item within a node when alternatives exist", () => {
    const scheduler = createInterleavedScheduler(
      [stubItem("A", "a1"), stubItem("A", "a2")],
      sequenceRng([0, 0, 0.99, 0]),
    );
    const first = scheduler.next();
    const second = scheduler.next();
    expect(first.node_id).toBe("A");
    expect(second.node_id).toBe("A");
    expect(second.item_version_id).not.toBe(first.item_version_id);
  });

  it("resumes the remaining shuffled cycle and repeat guards from a serializable snapshot", () => {
    const scheduler = createInterleavedScheduler(
      pool,
      sequenceRng([0.1, 0.2, 0.3, 0.4, 0.5]),
    );
    const first = scheduler.next();
    const second = scheduler.next();
    const snapshot = scheduler.snapshot();
    const uninterruptedNext = scheduler.next();

    const resumed = createInterleavedScheduler(pool, () => 0.99, snapshot);
    const resumedNext = resumed.next();

    expect(snapshot.version).toBe(1);
    expect(snapshot.remainingNodeIds).toHaveLength(1);
    expect(resumedNext.node_id).toBe(uninterruptedNext.node_id);
    expect(resumedNext.node_id).not.toBe(second.node_id);
    expect(new Set([first.node_id, second.node_id, resumedNext.node_id])).toEqual(
      new Set(["A", "B", "C"]),
    );
  });
});
