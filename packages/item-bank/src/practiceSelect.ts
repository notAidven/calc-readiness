import type { ItemDifficulty } from "./schema";
import type { FrozenItem } from "./template";

/**
 * Shared selection helpers for a randomized lesson-practice set.
 *
 * The thing these exist to prevent: a (node, difficulty) cell holds several problem
 * SHAPES, each frozen into several number-swapped instances, and drawing the cell's slots
 * uniformly at random from that flat list serves the same shape twice far more often than
 * it feels like it should. With two shapes at seven instances each, two slots collide on
 * one shape a little under half the time, so most five-slot sets repeat a shape somewhere.
 * Spreading across shapes first fixes that without touching any frozen item.
 *
 * The second thing, added 2026-07-26: the same ANSWER arriving twice in one served set
 * from two DIFFERENT cells. The pool freezers enforce a `varietyKey` per (node,
 * difficulty) cell, and this assembler walks the cells independently, so nothing was
 * watching across them. Measured over 2000 sets per node, that repeated an answer inside
 * one five-slot set on 9.1% of EXP.1 sets (`x^5` reachable from the L1 product shape, the
 * L2 net shape and the L3 build shape at once), 19.7% of NUM.5 and 25.1% of RAT.6. A
 * set-level seen-set now threads through every cell, and it is a PREFERENCE rather than a
 * constraint: a cell that cannot avoid a repeat still fills its slots.
 */

/** Fisher-Yates shuffle into a new array, using the supplied RNG (`rng() in [0, 1)`). */
export function shuffleWith<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * Stable JSON for an interactive spec: two templates can emit the same widget answer with
 * their object keys written in a different order, and `JSON.stringify` would call those
 * two different strings.
 */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
}

/**
 * What "the same answer" means for a served set. Deliberately SHAPE-FREE: a template's own
 * `varietyKey` is scoped to that template, so it cannot see `x^5` arriving from the
 * product shape and again from the net shape. Text items compare on `answer_key`, widget
 * items on their spec, and an item with neither falls back to its own id (never equal to
 * anything else, so it is never suppressed).
 */
export function answerVarietyKey(item: FrozenItem): string {
  const key = item.answer.answer_key;
  if (key !== undefined) {
    return `k:${String(key)}`;
  }
  const spec = item.answer.interactive_spec;
  return spec === undefined ? `u:${item.item_version_id}` : `w:${stableJson(spec)}`;
}

/**
 * Draw `count` distinct instances from one cell, taking one instance per problem SHAPE
 * before a second from any shape. Shapes and the instances inside them are both shuffled,
 * so which shapes a short cell serves still varies run to run. Returns fewer than `count`
 * only when the cell genuinely holds fewer instances.
 *
 * `seen` carries the answers already served EARLIER IN THE SAME SET, and is added to as
 * this cell draws. Within a shape, an instance whose answer is unseen is preferred; if
 * every remaining instance of that shape repeats an answer, the head is taken anyway, so
 * this can never cost a slot. Pass nothing for a standalone cell draw.
 */
export function drawSpreadByShape(
  candidates: readonly FrozenItem[],
  count: number,
  rng: () => number,
  seen: Set<string> = new Set(),
): FrozenItem[] {
  const byShape = new Map<string, FrozenItem[]>();
  for (const item of candidates) {
    const group = byShape.get(item.template_id) ?? [];
    group.push(item);
    byShape.set(item.template_id, group);
  }
  // Mutable queues: each pass takes at most one instance per shape, so "one per shape
  // before a second from any shape" still holds however the preference reorders a queue.
  const queues = shuffleWith([...byShape.values()], rng).map((group) =>
    shuffleWith(group, rng),
  );

  const picked: FrozenItem[] = [];
  while (picked.length < count) {
    let progressed = false;
    for (const queue of queues) {
      if (picked.length >= count) {
        break;
      }
      if (queue.length === 0) {
        continue;
      }
      const fresh = queue.findIndex((item) => !seen.has(answerVarietyKey(item)));
      const item = queue.splice(fresh === -1 ? 0 : fresh, 1)[0] as FrozenItem;
      picked.push(item);
      seen.add(answerVarietyKey(item));
      progressed = true;
    }
    if (!progressed) {
      break;
    }
  }
  return picked;
}

/**
 * Draw the reveal-to-retry replacement for one cell: a fresh instance the learner has not
 * been served, preferring one whose ANSWER they have not just been shown.
 *
 * The set-level preference in {@link drawSpreadByShape} stops at the set boundary, and this
 * is the other side of that boundary. Every domain's own `drawX PracticeInstance` avoided by
 * item ID alone and took the first survivor, so a cell holding more instances than answers
 * handed back the answer the reveal had just displayed. Measured over D9's 300 served
 * instances at `24493680`: 30 pairs, 10.0%, worst at `d9.trg6.secant-defined.l2` where 5 of
 * its 7 instances retried to the verdict just revealed — reveal `defined`, then *"Pointed at
 * $45^{\circ}$, is $\sec 45^{\circ}$ defined or undefined?"*. A two-answer cell becomes a coin
 * flip with a 50% base rate, which is worse than no retry at all.
 *
 * The precedence is unchanged, so this can only ever reorder within a tier that was already
 * going to be served: the slot's own SHAPE still outranks every other shape in the cell,
 * because a retry is meant to be another go at the same kind of problem, and the answer
 * preference applies inside each tier rather than across them. Like the set-level one it is a
 * PREFERENCE and never a constraint: a cell whose answers are genuinely exhausted still
 * fills the retry, so this cannot hide the button or cost a slot.
 *
 * `avoid` is the running set of ids already shown this session, so the revealed answer is
 * always inside `shownAnswers` and so is everything before it.
 */
export function drawRetryInstance(
  items: readonly FrozenItem[],
  cell: { nodeId: string; difficulty: ItemDifficulty },
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  const avoid = new Set(opts.avoid ?? []);
  const shownAnswers = new Set(
    items.filter((item) => avoid.has(item.item_version_id)).map(answerVarietyKey),
  );
  const inCell = (item: FrozenItem): boolean =>
    item.node_id === cell.nodeId &&
    item.difficulty === cell.difficulty &&
    !avoid.has(item.item_version_id);
  const unseenAnswer = (item: FrozenItem): boolean =>
    !shownAnswers.has(answerVarietyKey(item));

  const sameShape = opts.templateId
    ? items.filter((item) => item.template_id === opts.templateId && inCell(item))
    : [];
  return (
    sameShape.find(unseenAnswer) ??
    sameShape[0] ??
    items.find((item) => inCell(item) && unseenAnswer(item)) ??
    items.find(inCell)
  );
}

/**
 * Build a randomized practice set for one node: the locked mix in easy-to-hard slot
 * order, each cell drawn by {@link drawSpreadByShape}. `shortfall` names the cell that
 * cannot fill its slots, so a domain keeps its own error wording.
 *
 * The `seen` set spans the WHOLE set rather than one cell, which is the only place a
 * cross-cell answer repeat can be noticed: the pool freezers dedupe within a cell, and
 * before this the assembler walked the cells with nothing shared between them.
 */
export function buildRandomizedSetByShape(
  items: readonly FrozenItem[],
  nodeId: string,
  mix: readonly { difficulty: ItemDifficulty; count: number }[],
  rng: () => number,
  shortfall: (difficulty: ItemDifficulty, need: number, have: number) => string,
): FrozenItem[] {
  const set: FrozenItem[] = [];
  const seen = new Set<string>();
  for (const { difficulty, count } of mix) {
    const candidates = items.filter(
      (item) => item.node_id === nodeId && item.difficulty === difficulty,
    );
    if (candidates.length < count) {
      throw new Error(shortfall(difficulty, count, candidates.length));
    }
    set.push(...drawSpreadByShape(candidates, count, rng, seen));
  }
  return set;
}
