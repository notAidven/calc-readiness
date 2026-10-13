import type { FrozenItem } from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import {
  createAdaptiveInterleavedScheduler,
  createInterleavedScheduler,
  MAX_ITEM_WEIGHT,
  MAX_SLOTS_PER_CYCLE,
  type NodeWeights,
} from "./infiniteScheduler";
import { slotsForTier, weightsFromStruggle } from "./struggleWeights";

/**
 * **THE DRILL LEANS ON THE SKILLS THE LEARNER IS FINDING HARD, WITHOUT STOPPING BEING A
 * MIX.**
 *
 * Two properties are in tension here and both have to hold. Weighting is the feature: a
 * skill someone keeps missing should come round more often than one they have. Interleaving
 * is what the Town Hall drill IS: if a hard skill can crowd the others out, the activity has
 * quietly turned into the node-scoped drill that already exists, and the learner stops
 * getting the thing interleaving teaches, which is telling one skill from another.
 *
 * So every test below that shows the tilt is paired with one that shows the mix survived it.
 */

function stubItem(nodeId: string, itemVersionId: string): FrozenItem {
  return {
    item_version_id: itemVersionId,
    node_id: nodeId,
    form: "A",
    // A DISTINCT shape per item, so the item-weight tests at the bottom of this file have
    // something to tell apart. Every test above reads `node_id` only and is unaffected.
    template_id: `shape-${itemVersionId}`,
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

const POOL = [
  stubItem("A", "a1"),
  stubItem("A", "a2"),
  stubItem("B", "b1"),
  stubItem("B", "b2"),
  stubItem("C", "c1"),
  stubItem("C", "c2"),
];

/**
 * A deterministic generator, for the item-weight cases at the bottom.
 *
 * They compare two RUNS rather than assert a count, so the two have to see the same numbers;
 * `sequenceRng` below cycles a short fixed list and is the wrong tool for a weighted draw,
 * which consumes rolls at a different rate depending on the weights.
 */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
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

function draw(scheduler: { next(): FrozenItem }, count: number): string[] {
  const nodes: string[] = [];
  for (let step = 0; step < count; step += 1) {
    nodes.push(scheduler.next().node_id);
  }
  return nodes;
}

function tally(nodes: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    counts.set(node, (counts.get(node) ?? 0) + 1);
  }
  return counts;
}

describe("uniform weights reproduce the plain interleave", () => {
  it("serves every node exactly once per cycle when nothing is weighted", () => {
    const scheduler = createAdaptiveInterleavedScheduler(POOL, new Map(), () =>
      Math.random(),
    );
    const cycle = draw(scheduler, 3);
    expect(new Set(cycle)).toEqual(new Set(["A", "B", "C"]));
    expect(cycle).toHaveLength(3);
  });

  it("holds an even split over many draws with no weights at all", () => {
    // The base scheduler's guarantee, restated as the property a caller relies on: with no
    // signal, this behaves as though the feature were not there. A drill that skewed on an
    // empty store would be tailoring itself to nothing.
    const scheduler = createAdaptiveInterleavedScheduler(POOL, new Map(), () =>
      Math.random(),
    );
    const counts = tally(draw(scheduler, 300));
    for (const node of ["A", "B", "C"]) {
      expect(counts.get(node), node).toBe(100);
    }
  });

  it("leaves the plain interleave alone, which its own callers depend on", () => {
    // `EraAdvanceCeremony` still uses `createInterleavedScheduler`, and its test asserts a
    // three-node cycle is three draws. That is a true statement about the plain interleave
    // and a false one about this file, which is why there are two functions rather than one
    // generalised one. Asserted here so a later "tidy-up" that merges them fails.
    const plain = createInterleavedScheduler(POOL, sequenceRng([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(draw(plain, 3)).toHaveLength(3);
    expect(new Set(draw(plain, 3))).toEqual(new Set(["A", "B", "C"]));
  });
});

describe("a struggling skill comes round more often", () => {
  const WEIGHTED: NodeWeights = new Map([["A", MAX_SLOTS_PER_CYCLE]]);

  it("outdraws the skills the learner has in hand", () => {
    const scheduler = createAdaptiveInterleavedScheduler(POOL, WEIGHTED, () =>
      Math.random(),
    );
    const counts = tally(draw(scheduler, 300));
    const hard = counts.get("A") ?? 0;
    expect(hard).toBeGreaterThan(counts.get("B") ?? 0);
    expect(hard).toBeGreaterThan(counts.get("C") ?? 0);
    // Pinned rather than merely ordered, so "more often" is a stated amount and a retune of
    // the table has to come here. TWO slots against one, not the table's three: a three-node
    // cycle that may not repeat across its own boundary has only two non-adjacent
    // non-opening positions. `trimToLayoutable` says why, and the four-node case below shows
    // the full weight arriving once there is room for it.
    expect(hard).toBe(150);
  });

  it("reaches the table's full weight once the mix is wide enough to hold it", () => {
    const wide = [...POOL, stubItem("D", "d1"), stubItem("D", "d2")];
    const scheduler = createAdaptiveInterleavedScheduler(wide, WEIGHTED, () =>
      Math.random(),
    );
    const counts = tally(draw(scheduler, 300));
    // Three slots in a six-slot cycle: half the drill is the skill they are stuck on.
    expect(counts.get("A")).toBe(150);
    for (const node of ["B", "C", "D"]) {
      expect(counts.get(node), node).toBe(50);
    }
  });

  it("still gives every other skill its slot in every cycle", () => {
    // The tilt may not become a takeover. Over any four consecutive draws — one cycle of
    // this weighting on a three-node pool — B and C each appear, so a learner weak on A is
    // not quietly moved onto a single-skill drill.
    const scheduler = createAdaptiveInterleavedScheduler(POOL, WEIGHTED, () =>
      Math.random(),
    );
    const nodes = draw(scheduler, 100);
    for (let start = 0; start + 4 <= nodes.length; start += 4) {
      const cycle = nodes.slice(start, start + 4);
      expect(new Set(cycle), `cycle at ${start}`).toEqual(new Set(["A", "B", "C"]));
    }
  });

  it("never serves the same skill twice in a row, weighted or not", () => {
    // The property that makes this an interleave. It is the one a naive weighted bag loses
    // first: three copies of A shuffled with a B and a C puts two As together most of the
    // time, and back-to-back A is exactly the node-scoped drill.
    for (const weights of [new Map(), WEIGHTED] as NodeWeights[]) {
      const scheduler = createAdaptiveInterleavedScheduler(POOL, weights, () =>
        Math.random(),
      );
      const nodes = draw(scheduler, 400);
      const repeats = nodes.filter((node, index) => index > 0 && node === nodes[index - 1]);
      expect(repeats, "a skill was served back-to-back").toEqual([]);
    }
  });

  it("gives back the tilt rather than the interleave when the two cannot both hold", () => {
    // A two-node era must strictly alternate, so there is no room to weight anything at
    // all. The trim resolves it in favour of the mix, and the resolution is asserted rather
    // than discovered: this is the case where the weighting is deliberately not honoured.
    const twoNodes = [stubItem("A", "a1"), stubItem("B", "b1")];
    const scheduler = createAdaptiveInterleavedScheduler(twoNodes, WEIGHTED, () =>
      Math.random(),
    );
    const nodes = draw(scheduler, 60);
    expect(nodes.filter((node, i) => i > 0 && node === nodes[i - 1])).toEqual([]);
    const counts = tally(nodes);
    expect(counts.get("A")).toBe(30);
    expect(counts.get("B")).toBe(30);
  });

  it("avoids repeating an item within a node when the node has alternatives", () => {
    // The weighting brings a skill round more often, which makes THIS the thing that stops
    // "more practice" turning into the same question three times a cycle. A degenerate
    // RNG makes the fallback, rather than luck across eight retries, carry the guarantee.
    const scheduler = createAdaptiveInterleavedScheduler(POOL, WEIGHTED, () => 0);
    const seen: string[] = [];
    for (let step = 0; step < 200; step += 1) {
      const item = scheduler.next();
      if (item.node_id === "A") {
        seen.push(item.item_version_id);
      }
    }
    expect(seen.length).toBeGreaterThan(50);
    expect(seen.filter((id, i) => i > 0 && id === seen[i - 1])).toEqual([]);
  });
});

describe("the weight table is what the tiers say it is", () => {
  it("gives a struggling skill more slots than a shaky one, and a shaky one more than solid", () => {
    expect(slotsForTier("struggling")).toBeGreaterThan(slotsForTier("shaky"));
    expect(slotsForTier("shaky")).toBeGreaterThan(slotsForTier("solid"));
    // Every tier keeps a slot, which is the clause that makes "every skill appears each
    // cycle" true by construction rather than by the layout happening to work out.
    expect(slotsForTier("solid")).toBe(1);
    expect(slotsForTier("struggling")).toBe(MAX_SLOTS_PER_CYCLE);
  });

  it("carries the tiers through to a bag the scheduler leans on", () => {
    // The seam between the store's reading and the drill's behaviour, driven end to end:
    // a tier map in, a measurably tilted draw out. Each half is tested above; this is that
    // they are wired to each other.
    const weights = weightsFromStruggle(
      new Map([
        ["A", { level: 0.9, tier: "struggling" as const }],
        ["B", { level: 0.05, tier: "solid" as const }],
        ["C", { level: 0.05, tier: "solid" as const }],
      ]),
    );
    const scheduler = createAdaptiveInterleavedScheduler(POOL, weights, () =>
      Math.random(),
    );
    // A whole number of cycles, so the two solid skills are compared over the same number
    // of them; a part-cycle tail would leave one of them a draw ahead by arithmetic.
    const counts = tally(draw(scheduler, 240));
    expect(counts.get("A") ?? 0).toBeGreaterThan(counts.get("B") ?? 0);
    expect(counts.get("A") ?? 0).toBeGreaterThan(counts.get("C") ?? 0);
    expect(counts.get("B") ?? 0).toBe(counts.get("C") ?? 0);
  });

  it("clamps a weight nobody should be able to pass in", () => {
    // Whatever a caller asks for, no skill takes more than the table's ceiling: a bug
    // upstream must not be able to turn the mix into one skill.
    const scheduler = createAdaptiveInterleavedScheduler(
      POOL,
      new Map([
        ["A", 99],
        ["B", Number.NaN],
        ["C", -4],
      ]),
      () => Math.random(),
    );
    const counts = tally(draw(scheduler, 240));
    expect((counts.get("A") ?? 0) / 240).toBeLessThanOrEqual(
      MAX_SLOTS_PER_CYCLE / (MAX_SLOTS_PER_CYCLE + 2),
    );
    // A weight of 99 buys exactly what a weight of 3 buys, and a NaN or a negative one is
    // read as the default rather than as zero: a skill must not be droppable by a bad number.
    expect(counts.get("A")).toBe(120);
    expect(counts.get("B")).toBe(60);
    expect(counts.get("C")).toBe(60);
  });

  it("throws on an empty pool rather than serving nothing", () => {
    expect(() => createAdaptiveInterleavedScheduler([])).toThrow(
      /no practice items available for infinite practice/,
    );
  });
});

describe("which SHAPE is served cannot disturb which SKILL is served", () => {
  /** Heavily favours one single item, which is the strongest a shape weight can get. */
  const FAVOUR_ONE_ITEM = (item: FrozenItem): number =>
    item.item_version_id === "a1" ? MAX_ITEM_WEIGHT : 1;

  /**
   * Node A gets FOUR shapes, because `POOL` gives each node two and two is a degenerate case
   * for this axis: the draw already refuses an immediate repeat, so with two shapes the pair
   * simply alternates and no weight can move anything. Which is correct behaviour, and would
   * have made the vacuity check below unable to tell a working weight from an ignored one.
   */
  const SHAPED_POOL = [
    ...POOL,
    stubItem("A", "a3"),
    stubItem("A", "a4"),
    stubItem("B", "b3"),
    stubItem("C", "c3"),
  ];

  it("leaves the cycle composition exactly as it was", () => {
    // **THE FENCE BETWEEN THE TWO AXES.** Node weights decide the interleave; item weights
    // decide which of a node's problems arrives once the interleave has chosen it. The second
    // must not be able to move the first, or "we only changed which problems are shown" stops
    // being true and the drill's mix starts drifting with the learner's shape history.
    const plain = tally(
      draw(createAdaptiveInterleavedScheduler(SHAPED_POOL, new Map(), lcg(7)), 300),
    );
    const shaped = tally(
      draw(
        createAdaptiveInterleavedScheduler(SHAPED_POOL, new Map(), lcg(7), FAVOUR_ONE_ITEM),
        300,
      ),
    );
    expect([...shaped.entries()].sort()).toEqual([...plain.entries()].sort());
    // The floor: the unweighted run really is an even three-way split, so an equality above
    // is a statement about the cycle rather than about two empty tallies.
    for (const node of ["A", "B", "C"]) {
      expect(plain.get(node), node).toBe(100);
    }
  });

  it("does change which of the node's items arrives, so the equality above is not vacuous", () => {
    // Without this the test above passes over an `itemWeight` that is never consulted at all.
    const ids = (weight?: (item: FrozenItem) => number): number => {
      const scheduler = createAdaptiveInterleavedScheduler(
        SHAPED_POOL,
        new Map(),
        lcg(7),
        weight,
      );
      let a1 = 0;
      for (let step = 0; step < 300; step += 1) {
        if (scheduler.next().item_version_id === "a1") {
          a1 += 1;
        }
      }
      return a1;
    };
    expect(ids(FAVOUR_ONE_ITEM)).toBeGreaterThan(ids());
  });

  it("keeps a shape in the pool however lightly it is weighted", () => {
    // A weight below the floor is clamped to 1 rather than honoured, because a zero would
    // remove the shape and the drill would stop being able to see it going stale.
    const scheduler = createAdaptiveInterleavedScheduler(
      SHAPED_POOL,
      new Map(),
      lcg(11),
      () => 0,
    );
    const seen = new Set<string>();
    for (let step = 0; step < 300; step += 1) {
      seen.add(scheduler.next().item_version_id);
    }
    expect([...seen].sort()).toEqual(
      SHAPED_POOL.map((item) => item.item_version_id).sort(),
    );
  });
});
