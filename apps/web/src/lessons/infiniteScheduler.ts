import type { FrozenItem } from "@cr/item-bank";

export interface InfiniteScheduler {
  next(): FrozenItem;
}

export interface InterleavedSchedulerSnapshot {
  readonly version: 1;
  readonly remainingNodeIds: readonly string[];
  readonly lastNodeId: string | null;
  readonly lastItemByNode: readonly (readonly [string, string])[];
}

export interface InterleavedScheduler extends InfiniteScheduler {
  snapshot(): InterleavedSchedulerSnapshot;
}

const EMPTY_POOL = "no practice items available for infinite practice";

function requireNonEmpty(items: readonly FrozenItem[]): void {
  if (items.length === 0) {
    throw new Error(EMPTY_POOL);
  }
}

function shuffle<T>(array: readonly T[], rng: () => number): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

function drawFromPool(
  pool: readonly FrozenItem[],
  avoidId: string | null,
  rng: () => number,
): FrozenItem {
  let next = pool[Math.floor(rng() * pool.length)];
  for (
    let attempt = 0;
    attempt < 8 && pool.length > 1 && (!next || next.item_version_id === avoidId);
    attempt += 1
  ) {
    next = pool[Math.floor(rng() * pool.length)];
  }
  // Random retries keep the draw uniform in the ordinary case; the fallback turns
  // "avoid" into the guarantee callers and guards rely on even under a degenerate RNG.
  const chosen =
    next && next.item_version_id !== avoidId
      ? next
      : (pool.find((item) => item.item_version_id !== avoidId) ?? pool[0]);
  if (!chosen) {
    throw new Error(EMPTY_POOL);
  }
  return chosen;
}

/**
 * Uniform random draw across the whole pool, avoiding the immediately previous item
 * when the pool has more than one entry. Matches the original node-scoped drill.
 */
export function createRandomScheduler(
  items: readonly FrozenItem[],
  rng: () => number = Math.random,
): InfiniteScheduler {
  requireNonEmpty(items);
  const pool = [...items];
  let lastId: string | null = null;

  return {
    next() {
      const chosen = drawFromPool(pool, lastId, rng);
      lastId = chosen.item_version_id;
      return chosen;
    },
  };
}

/**
 * Interleaved draw: every node in the pool appears once per shuffled cycle before any
 * node repeats. The bag is reshuffled each cycle, and the first slot is swapped when
 * needed so the same skill never lands back-to-back across a cycle boundary.
 */
export function createInterleavedScheduler(
  items: readonly FrozenItem[],
  rng: () => number = Math.random,
  resumeFrom?: InterleavedSchedulerSnapshot,
): InterleavedScheduler {
  requireNonEmpty(items);

  const byNode = new Map<string, FrozenItem[]>();
  for (const item of items) {
    const list = byNode.get(item.node_id) ?? [];
    list.push(item);
    byNode.set(item.node_id, list);
  }

  const nodeIds = [...byNode.keys()];
  const knownNodes = new Set(nodeIds);
  const resumable =
    resumeFrom?.version === 1 &&
    (resumeFrom.lastNodeId === null || knownNodes.has(resumeFrom.lastNodeId)) &&
    new Set(resumeFrom.remainingNodeIds).size === resumeFrom.remainingNodeIds.length &&
    resumeFrom.remainingNodeIds.every((nodeId) => knownNodes.has(nodeId)) &&
    resumeFrom.lastItemByNode.every(([nodeId, itemId]) =>
      (byNode.get(nodeId) ?? []).some((item) => item.item_version_id === itemId),
    );
  let bag: string[] = resumable ? [...(resumeFrom?.remainingNodeIds ?? [])] : [];
  let lastNodeId: string | null = resumable ? (resumeFrom?.lastNodeId ?? null) : null;
  const lastItemByNode = new Map<string, string>(
    resumable ? (resumeFrom?.lastItemByNode ?? []) : [],
  );

  function refillBag() {
    bag = shuffle(nodeIds, rng);
    if (bag.length > 1 && bag[0] === lastNodeId) {
      for (let i = 1; i < bag.length; i += 1) {
        if (bag[i] !== lastNodeId) {
          const first = bag[0] as string;
          bag[0] = bag[i] as string;
          bag[i] = first;
          break;
        }
      }
    }
  }

  return {
    next() {
      if (bag.length === 0) {
        refillBag();
      }
      const nodeId = bag.shift();
      if (!nodeId) {
        throw new Error(EMPTY_POOL);
      }
      lastNodeId = nodeId;
      const pool = byNode.get(nodeId);
      if (!pool || pool.length === 0) {
        throw new Error(EMPTY_POOL);
      }
      const chosen = drawFromPool(pool, lastItemByNode.get(nodeId) ?? null, rng);
      lastItemByNode.set(nodeId, chosen.item_version_id);
      return chosen;
    },
    snapshot() {
      return {
        version: 1,
        remainingNodeIds: [...bag],
        lastNodeId,
        lastItemByNode: [...lastItemByNode.entries()],
      };
    },
  };
}

/**
 * How many slots a node gets per cycle. Absent or unreadable means one, so a caller with
 * no opinion gets the plain interleave.
 */
export type NodeWeights = ReadonlyMap<string, number>;

/**
 * How much to favour one ITEM over its node's others, once the cycle has chosen the node.
 *
 * A separate axis from {@link NodeWeights} and deliberately so: that one decides how often
 * a SKILL comes round, which is the interleave, and this one decides which KIND of problem
 * on that skill the learner meets, which is not. Nothing here can change a cycle's
 * composition, so no reading of an item can disturb the mix.
 */
export type ItemWeight = (item: FrozenItem) => number;

/** The most a shape can outdraw its node's others. */
export const MAX_ITEM_WEIGHT = 4;

/**
 * Clamp a caller's item weight into `[1, MAX_ITEM_WEIGHT]`.
 *
 * **THE FLOOR IS 1, NOT 0**, which is what stops the tailoring becoming a filter: a shape
 * the learner has in hand is drawn LESS OFTEN than one they are missing, and never removed
 * from the pool. A drill that stopped serving a learner the shapes they can do would be
 * unable to notice they had stopped being able to do them, and it would also have quietly
 * turned an endless drill into a remedial one.
 */
function itemWeightOf(weight: ItemWeight | undefined, item: FrozenItem): number {
  if (!weight) {
    return 1;
  }
  const raw = weight(item);
  if (!Number.isFinite(raw)) {
    return 1;
  }
  return Math.min(MAX_ITEM_WEIGHT, Math.max(1, raw));
}

/**
 * Draw one item from a node's pool, favouring the shapes the caller weights highest and
 * avoiding an immediate repeat exactly as {@link drawFromPool} does.
 *
 * The avoid is applied by REMOVING the previous item from the weighted draw rather than by
 * re-rolling, because a re-roll against weights is biased: the heavier an item is, the more
 * often the re-roll lands on it again, so the item most likely to repeat is the one the
 * weighting has just made most likely to be drawn. `drawFromPool`'s eight-attempt re-roll is
 * correct for a uniform draw and would leak the repeat back in here.
 */
function drawWeightedFromPool(
  pool: readonly FrozenItem[],
  avoidId: string | null,
  weight: ItemWeight | undefined,
  rng: () => number,
): FrozenItem {
  const eligible =
    pool.length > 1 ? pool.filter((item) => item.item_version_id !== avoidId) : pool;
  const candidates = eligible.length > 0 ? eligible : pool;
  let total = 0;
  const weights: number[] = [];
  for (const item of candidates) {
    const value = itemWeightOf(weight, item);
    weights.push(value);
    total += value;
  }
  let roll = rng() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i] as number;
    if (roll < 0) {
      return candidates[i] as FrozenItem;
    }
  }
  const last = candidates[candidates.length - 1];
  if (!last) {
    throw new Error(EMPTY_POOL);
  }
  return last;
}

/** Nothing gets so many slots that a cycle stops feeling like a mix. */
export const MAX_SLOTS_PER_CYCLE = 3;

function slotsFor(weights: NodeWeights, nodeId: string): number {
  const raw = weights.get(nodeId);
  if (raw === undefined || !Number.isFinite(raw)) {
    return 1;
  }
  return Math.min(MAX_SLOTS_PER_CYCLE, Math.max(1, Math.round(raw)));
}

/**
 * Reduce the heaviest node until the cycle can be laid out with no node adjacent to itself
 * AND without opening on the node the previous cycle closed with.
 *
 * The bound is `floor(total / 2)`, not `ceil`. A cycle of `n` slots that may not start with
 * `x` leaves `x` only the `floor(n / 2)` positions `1, 3, 5, …`, so `ceil` is right for a
 * cycle read in isolation and wrong for one in a sequence. That off-by-one is not a
 * rounding detail: it is the difference between `A B A` (fine on its own, and forced into
 * `B A A` the moment the cycle before it ended on `A`) and the interleave holding across
 * every boundary. A three-node era therefore gives a struggling skill two slots rather than
 * three, and the full {@link MAX_SLOTS_PER_CYCLE} needs four skills in the mix.
 *
 * Trimming resolves the tension in favour of the MIX. The weighting exists to bring a hard
 * skill round more often, and a drill that serves it twice in a row has stopped being the
 * activity the learner opened.
 *
 * Never trims below one slot, so the smallest pools degrade to the plain interleave instead
 * of to nothing: a single-node pool has no interleave to protect and repeats regardless,
 * exactly as `createInterleavedScheduler` does.
 */
function trimToLayoutable(counts: Map<string, number>): void {
  for (;;) {
    let total = 0;
    let heaviestId: string | null = null;
    let heaviest = 0;
    for (const [nodeId, count] of counts) {
      total += count;
      if (count > heaviest) {
        heaviest = count;
        heaviestId = nodeId;
      }
    }
    if (heaviestId === null || heaviest <= 1 || heaviest <= Math.floor(total / 2)) {
      return;
    }
    counts.set(heaviestId, heaviest - 1);
  }
}

/**
 * Lay a cycle out by always taking the node with the most slots left that is not the one
 * just served, breaking ties at random.
 *
 * With every count at 1 this is a uniform shuffle, which is why uniform weights reproduce
 * the plain interleave. With one node heavier it spaces that node's slots out instead of
 * clumping them, which is the whole reason the layout is not just a shuffle of the bag.
 */
function layOutCycle(
  counts: ReadonlyMap<string, number>,
  avoidFirst: string | null,
  rng: () => number,
): string[] {
  const remaining = new Map(counts);
  const order: string[] = [];
  let previous = avoidFirst;
  let left = [...counts.values()].reduce((sum, count) => sum + count, 0);

  while (left > 0) {
    const available = [...remaining].filter(([, count]) => count > 0);
    const eligible = available.filter(([nodeId]) => nodeId !== previous);
    // Falls back to the repeat only when the node just served is all that is left, which
    // `trimToLayoutable` rules out for every cycle after the first; the first can still
    // hit it because the previous cycle's tail is not something a trim can see.
    const pool = eligible.length > 0 ? eligible : available;
    let best = 0;
    for (const [, count] of pool) {
      best = Math.max(best, count);
    }
    const heaviest = pool.filter(([, count]) => count === best);
    const picked = heaviest[Math.floor(rng() * heaviest.length)] ?? heaviest[0];
    if (!picked) {
      throw new Error(EMPTY_POOL);
    }
    const [nodeId] = picked;
    order.push(nodeId);
    remaining.set(nodeId, best - 1);
    previous = nodeId;
    left -= 1;
  }
  return order;
}

/**
 * The interleaved draw, tilted towards the skills the learner is struggling with.
 *
 * Every node still gets at least one slot in every cycle, so weighting changes how OFTEN a
 * skill comes round and never whether it comes round at all. A learner who is weak on one
 * thing still gets the mix; they just meet the weak thing up to
 * {@link MAX_SLOTS_PER_CYCLE} times in the time it takes the rest to come round once.
 *
 * **`createInterleavedScheduler` is left exactly as it was** rather than being generalised
 * into this. `EraAdvanceCeremony` uses it, and its own test asserts a three-node cycle is
 * three draws long, which is a true statement about a plain interleave and a false one
 * here. Two functions is the honest way to hold both.
 *
 * Within a node, `itemWeight` decides WHICH of that node's problems is served: the shapes a
 * learner keeps missing come up more often than the ones they have in hand, floored so that
 * none is ever dropped. That is a second, independent axis — it moves no cycle and cannot,
 * because the cycle is laid out from `counts` before any item is looked at. Omit it and the
 * within-node draw is uniform, which is what it was before shape history existed.
 */
export function createAdaptiveInterleavedScheduler(
  items: readonly FrozenItem[],
  weights: NodeWeights = new Map(),
  rng: () => number = Math.random,
  itemWeight?: ItemWeight,
): InfiniteScheduler {
  requireNonEmpty(items);

  const byNode = new Map<string, FrozenItem[]>();
  for (const item of items) {
    const list = byNode.get(item.node_id) ?? [];
    list.push(item);
    byNode.set(item.node_id, list);
  }

  const counts = new Map<string, number>();
  for (const nodeId of byNode.keys()) {
    counts.set(nodeId, slotsFor(weights, nodeId));
  }
  trimToLayoutable(counts);

  let cycle: string[] = [];
  let lastNodeId: string | null = null;
  const lastItemByNode = new Map<string, string>();

  return {
    next() {
      if (cycle.length === 0) {
        cycle = layOutCycle(counts, lastNodeId, rng);
      }
      const nodeId = cycle.shift();
      if (!nodeId) {
        throw new Error(EMPTY_POOL);
      }
      lastNodeId = nodeId;
      const pool = byNode.get(nodeId);
      if (!pool || pool.length === 0) {
        throw new Error(EMPTY_POOL);
      }
      const chosen = drawWeightedFromPool(
        pool,
        lastItemByNode.get(nodeId) ?? null,
        itemWeight,
        rng,
      );
      lastItemByNode.set(nodeId, chosen.item_version_id);
      return chosen;
    },
  };
}
