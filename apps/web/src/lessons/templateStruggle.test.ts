import type { FrozenItem } from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { createAdaptiveInterleavedScheduler } from "./infiniteScheduler";
import { practiceItemsById } from "./practiceChecker";
import {
  difficultyStruggleLevelOf,
  readStruggleRecord,
  recordStruggleAttempt,
  STRUGGLE_SHAPE_CAP,
  STRUGGLE_SHAPE_RING_SIZE,
  type StruggleAttempt,
  type StruggleStorage,
  struggleLevelOf,
  struggleStorageKey,
  templateStruggleLevelOf,
} from "./struggleStore";
import { itemWeightsFromStruggle } from "./struggleWeights";

/**
 * **WHICH KIND OF PROBLEM ON A SKILL, WHICH IS A DIFFERENT QUESTION FROM WHICH SKILL.**
 *
 * The node grain answers "how is this skill going" and drives the cycle and the payout. This
 * file is about the second grain: one bucket per `template_id`, read by exactly one decision
 * — which of a node's problems the drill serves once the cycle has already chosen the node.
 *
 * Three claims, and they fail in different places on purpose:
 *
 * 1. **The tilt exists.** A shape the learner keeps missing outdraws its node's others.
 * 2. **It is a tilt and not a filter.** Every shape is still served, because a drill that
 *    stopped offering the shapes a learner can do could not notice them going stale, and
 *    would have turned an endless drill into a remedial one without anybody deciding to.
 * 3. **It costs bounded storage.** Both the per-shape ring and the number of shapes are
 *    capped, asserted on the STORED blob rather than the parsed record — the parse trims on
 *    read, so an unbounded write reads back at exactly the cap and a test on the record
 *    passes over an entry growing forever. That is not hypothetical: it is the defect the
 *    node ring's first bound assertion missed.
 */

function fakeStorage(seed: Record<string, string> = {}): {
  storage: StruggleStorage;
  entries: Map<string, string>;
} {
  const entries = new Map(Object.entries(seed));
  return {
    entries,
    storage: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => {
        entries.set(key, value);
      },
    },
  };
}

function miss(over: Partial<StruggleAttempt> = {}): StruggleAttempt {
  return {
    nodeId: "LIN.1",
    templateId: "d3.lin1.balance-word.l2",
    difficulty: 2,
    correct: false,
    firstTry: false,
    revealed: true,
    hintsUsed: 0,
    ...over,
  };
}

function clean(over: Partial<StruggleAttempt> = {}): StruggleAttempt {
  return miss({ correct: true, firstTry: true, revealed: false, ...over });
}

function stubItem(nodeId: string, templateId: string, itemVersionId: string): FrozenItem {
  return {
    item_version_id: itemVersionId,
    node_id: nodeId,
    form: "A",
    template_id: templateId,
    template_params: {},
    prompt: "stub",
    difficulty: 2,
    hints: [],
    worked_solution: [],
    answer: { answer_key: "1", answer_spec: { answer_type: "numeric" } },
  } as unknown as FrozenItem;
}

/**
 * A deterministic generator, so a distribution claim is a fact about the scheduler rather
 * than about the seed the run happened to get.
 */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** One node, four shapes, so the draw within a node is the only thing being measured. */
const SHAPES = ["shape-a", "shape-b", "shape-c", "shape-d"];
const ONE_NODE_POOL = SHAPES.map((shape, index) =>
  stubItem("LIN.1", shape, `lin1-${index}`),
);

function tallyShapes(
  count: number,
  weight?: (item: FrozenItem) => number,
): Map<string, number> {
  const scheduler = createAdaptiveInterleavedScheduler(
    ONE_NODE_POOL,
    new Map(),
    lcg(20260807),
    weight,
  );
  const counts = new Map<string, number>();
  for (let step = 0; step < count; step += 1) {
    const shape = scheduler.next().template_id;
    counts.set(shape, (counts.get(shape) ?? 0) + 1);
  }
  return counts;
}

describe("a shape the learner keeps missing comes round more often", () => {
  it("outdraws its node's other shapes, and the others outdraw nothing", () => {
    const { storage } = fakeStorage();
    // Enough misses to fill the shape's ring, so its level is 1 rather than diluted.
    for (let attempt = 0; attempt < STRUGGLE_SHAPE_RING_SIZE; attempt += 1) {
      recordStruggleAttempt(miss({ templateId: "shape-a" }), storage);
    }
    const weight = itemWeightsFromStruggle(["LIN.1"], storage);

    const before = tallyShapes(2000);
    const after = tallyShapes(2000, weight);

    // The floor first: without weights the four shapes are served about evenly, so the
    // comparison below is against a real baseline and not against a scheduler that already
    // favoured `shape-a` for some unrelated reason.
    for (const shape of SHAPES) {
      expect(before.get(shape) ?? 0, `${shape} unweighted`).toBeGreaterThan(400);
      expect(before.get(shape) ?? 0, `${shape} unweighted`).toBeLessThan(600);
    }

    const tilted = after.get("shape-a") ?? 0;
    expect(tilted).toBeGreaterThan((before.get("shape-a") ?? 0) * 1.3);
    for (const shape of SHAPES.filter((entry) => entry !== "shape-a")) {
      expect(tilted, `${shape} vs the missed shape`).toBeGreaterThan(after.get(shape) ?? 0);
    }
  });

  it("still serves every shape, because the tilt is not a filter", () => {
    // THE PROPERTY THAT MAKES THIS SAFE TO SHIP. A weight of zero on a mastered shape would
    // read as "stop wasting their time", and it would also make the mastered shape's level
    // permanently frozen at whatever it was when the drill stopped asking.
    const { storage } = fakeStorage();
    for (let attempt = 0; attempt < STRUGGLE_SHAPE_RING_SIZE; attempt += 1) {
      recordStruggleAttempt(miss({ templateId: "shape-a" }), storage);
      recordStruggleAttempt(clean({ templateId: "shape-b" }), storage);
      recordStruggleAttempt(clean({ templateId: "shape-c" }), storage);
      recordStruggleAttempt(clean({ templateId: "shape-d" }), storage);
    }
    const counts = tallyShapes(1200, itemWeightsFromStruggle(["LIN.1"], storage));
    for (const shape of SHAPES) {
      expect(counts.get(shape) ?? 0, `${shape} was starved`).toBeGreaterThan(0);
    }
    expect([...counts.keys()].sort()).toEqual([...SHAPES].sort());
  });

  it("leaves the draw uniform for a node it has no shape history for", () => {
    const { storage } = fakeStorage();
    const weight = itemWeightsFromStruggle(["LIN.1"], storage);
    for (const item of ONE_NODE_POOL) {
      expect(weight(item), item.template_id).toBe(1);
    }
    // And a node the weights were never asked about reads the same, rather than throwing or
    // reading as maximally struggling.
    expect(weight(stubItem("POL.3", "shape-z", "pol3-1"))).toBe(1);
  });
});

describe("the easy-hard reading comes off the same buckets", () => {
  it("pools the shapes at one difficulty, and keeps the tiers apart", () => {
    const { storage } = fakeStorage();
    // Two hard shapes going badly, one easy shape going well.
    recordStruggleAttempt(miss({ templateId: "hard-a", difficulty: 3 }), storage);
    recordStruggleAttempt(miss({ templateId: "hard-b", difficulty: 3 }), storage);
    recordStruggleAttempt(clean({ templateId: "easy-a", difficulty: 1 }), storage);
    const record = readStruggleRecord("LIN.1", storage);

    expect(difficultyStruggleLevelOf(record, 3)).toBe(1);
    expect(difficultyStruggleLevelOf(record, 1)).toBe(0);
    // A tier with no attempts reads 0, matching an untouched skill: never met is not weak.
    expect(difficultyStruggleLevelOf(record, 2)).toBe(0);
  });

  it("weights the pool by attempts rather than by shape, which is why it pools", () => {
    // Four misses on one L3 shape and one clean answer on another. Averaging the two SHAPES
    // would read 0.5; pooling the attempts reads 0.8, which is what the learner's L3 record
    // actually looks like.
    const { storage } = fakeStorage();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      recordStruggleAttempt(
        miss({ templateId: "hard-a", difficulty: 3, revealed: true }),
        storage,
      );
    }
    recordStruggleAttempt(clean({ templateId: "hard-b", difficulty: 3 }), storage);
    const record = readStruggleRecord("LIN.1", storage);
    expect(difficultyStruggleLevelOf(record, 3)).toBeCloseTo(0.8, 10);
  });

  it("follows a template that is retagged to another difficulty", () => {
    const { storage } = fakeStorage();
    recordStruggleAttempt(miss({ templateId: "moved", difficulty: 2 }), storage);
    recordStruggleAttempt(miss({ templateId: "moved", difficulty: 3 }), storage);
    const record = readStruggleRecord("LIN.1", storage);
    // One bucket, at the difficulty the LAST attempt reported: an authoring change that
    // retags a template must not leave its history filed under the old tier forever.
    expect(record.shapes).toHaveLength(1);
    expect(difficultyStruggleLevelOf(record, 3)).toBe(1);
    expect(difficultyStruggleLevelOf(record, 2)).toBe(0);
  });
});

describe("the shape buckets cost bounded storage", () => {
  it("bounds each shape's ring in the WRITTEN entry, not just on the way back out", () => {
    const { storage, entries } = fakeStorage();
    for (let attempt = 0; attempt < STRUGGLE_SHAPE_RING_SIZE * 5; attempt += 1) {
      recordStruggleAttempt(miss({ templateId: "shape-a" }), storage);
    }
    const stored = JSON.parse(entries.get(struggleStorageKey("LIN.1")) ?? "{}") as {
      shapes?: { ring?: unknown[]; attempts?: number }[];
    };
    expect(stored.shapes).toHaveLength(1);
    expect(stored.shapes?.[0]?.ring).toHaveLength(STRUGGLE_SHAPE_RING_SIZE);
    // The lifetime count is NOT bounded, and keeping both is the point: the ring says how
    // they are doing now, the count says how much they have done.
    expect(stored.shapes?.[0]?.attempts).toBe(STRUGGLE_SHAPE_RING_SIZE * 5);
  });

  it("bounds how many shapes a node keeps, evicting the least attempted", () => {
    const { storage, entries } = fakeStorage();
    // The first shape gets plenty of history; the rest get one attempt each, and then one
    // more shape arrives than the cap allows.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordStruggleAttempt(miss({ templateId: "well-known" }), storage);
    }
    for (let index = 0; index < STRUGGLE_SHAPE_CAP; index += 1) {
      recordStruggleAttempt(miss({ templateId: `filler-${index}` }), storage);
    }
    const stored = JSON.parse(entries.get(struggleStorageKey("LIN.1")) ?? "{}") as {
      shapes?: { templateId?: string }[];
    };
    expect(stored.shapes).toHaveLength(STRUGGLE_SHAPE_CAP);
    const kept = (stored.shapes ?? []).map((shape) => shape.templateId);
    // The shape with real history survives; a one-attempt filler is what went.
    expect(kept).toContain("well-known");
    expect(kept).toContain(`filler-${STRUGGLE_SHAPE_CAP - 1}`);
    expect(kept).not.toContain("filler-0");
  });

  it("holds a cap above what the bank actually authors, measured from the bank", () => {
    // **DERIVED, NOT WRITTEN DOWN.** The number this cap has to clear lives in another
    // package and moves with every authoring run, so a figure copied into a comment here
    // would be wrong within weeks. If an authoring pass ever takes a node past the cap, this
    // fails and the constant gets raised — rather than a learner silently losing a bucket.
    const shapesByNode = new Map<string, Set<string>>();
    for (const item of practiceItemsById.values()) {
      const shapes = shapesByNode.get(item.node_id) ?? new Set<string>();
      shapes.add(item.template_id);
      shapesByNode.set(item.node_id, shapes);
    }
    expect(shapesByNode.size, "the bank resolved to no nodes").toBeGreaterThan(30);
    const busiest = Math.max(...[...shapesByNode.values()].map((shapes) => shapes.size));
    expect(busiest, "a node with no shapes means this measured nothing").toBeGreaterThan(1);
    expect(
      busiest,
      `a node authors ${busiest} shapes, which is more than STRUGGLE_SHAPE_CAP`,
    ).toBeLessThanOrEqual(STRUGGLE_SHAPE_CAP);
  });

  it("reads a record written before shapes existed, keeping its node history", () => {
    // Every learner who has practised has one of these. Treating a missing field as corrupt
    // would throw away the node-level history they DO have to gain a shape-level history
    // they do not, which is a strictly worse trade than reading it as empty.
    const legacy = JSON.stringify({
      nodeId: "LIN.1",
      ring: [1, 1, 0.8, 0.8],
      firstTryCorrect: 0,
      correctAfterError: 0,
      incorrect: 2,
      revealed: 2,
      hinted: 0,
    });
    const { storage } = fakeStorage({ [struggleStorageKey("LIN.1")]: legacy });
    const record = readStruggleRecord("LIN.1", storage);
    expect(record.shapes).toEqual([]);
    expect(struggleLevelOf(record)).toBeCloseTo(0.9, 10);
    expect(templateStruggleLevelOf(record, "anything")).toBe(0);

    // And the next attempt starts the shape history without disturbing the node ring.
    const next = recordStruggleAttempt(miss({ templateId: "shape-a" }), storage);
    expect(next.shapes).toHaveLength(1);
    expect(next.ring).toHaveLength(5);
  });

  it("drops an unreadable shape entry rather than failing the whole record", () => {
    const corrupt = JSON.stringify({
      nodeId: "LIN.1",
      ring: [0],
      shapes: [
        { templateId: "good", difficulty: 2, ring: [1], attempts: 1 },
        { templateId: "no-difficulty", ring: [1], attempts: 1 },
        { difficulty: 2, ring: [1], attempts: 1 },
        "not an object",
      ],
    });
    const { storage } = fakeStorage({ [struggleStorageKey("LIN.1")]: corrupt });
    const record = readStruggleRecord("LIN.1", storage);
    expect(record.shapes.map((shape) => shape.templateId)).toEqual(["good"]);
    expect(templateStruggleLevelOf(record, "good")).toBe(1);
  });
});
