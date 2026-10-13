import { runtimeStorage } from "../storage/runtimeStorage";

/**
 * WHICH SKILLS THE LEARNER IS STRUGGLING ON, derived from work they have already done.
 *
 * Fed by two surfaces and only two: the graded practice set (`LessonPractice`) and the
 * interleaved drill (`InfiniteDrill`). It is read by the Town Hall drill to decide how
 * often to serve a skill, by the drill's own chip to say why a problem came up, and by
 * the economy to decide what a cleared round pays.
 *
 * ## Three things this must not become
 *
 * **It never selects a practice set.** A five-problem set is 1xL1 + 2xL2 + 2xL3 in
 * easy-to-hard order, drawn by `buildRandomizedSetByShape` in `@cr/item-bank`, and that
 * stays fixed whatever this file believes. The direction is one-way: a set produces
 * struggle data, struggle data never produces a set. `struggleNeverSelectsPractice.test.ts`
 * holds that from outside, because a single import is all it would take to lose it.
 *
 * **It never writes mastery.** Mastery comes from scored evidence through
 * `@cr/mastery-service`; this is a separate, softer signal that exists to shape practice
 * volume and reward size. Nothing here is an input to placement, completion, or the
 * pre/post metric.
 *
 * **It holds no clock.** Not one timestamp is stored, which is deliberate rather than
 * incidental: the economy reads a level off this store, and `@cr/economy` is required to
 * be clockless (`cap.ts`, `clockless.test.ts` -- "K practice sets pay the same total
 * however their instants are spread"). A stored instant here would be a clock the economy
 * could read at one remove. Recency is modelled as POSITION in a bounded ring, so
 * "recently" means "in the last {@link STRUGGLE_RING_SIZE} attempts", never "this week".
 *
 * ## Two grains, and what each one is for
 *
 * The NODE grain answers "how is this skill going", and it is what the drill's cycle slots
 * and the payout read. The SHAPE grain -- one bucket per `template_id` -- answers "which
 * KIND of problem on this skill", and it is read by one thing only: which item the drill
 * picks once the cycle has already chosen the node. Adding it moved no other decision.
 *
 * `template_id` is the grain rather than `concept` because `concept` is authored on 135 of
 * the bank's 343 templates, and a grain two thirds of the pool cannot report is not a
 * grain. It also carries the easy-hard axis for free: a template sits at exactly one
 * difficulty, so {@link difficultyStruggleLevelOf} pools the shapes at a difficulty rather
 * than needing a second set of buckets. And a word-problem shape is its own template
 * (`d3.lin1.balance-word.l2`), so it is tracked separately from its node's symbolic
 * shapes -- without this file knowing that "word problem" is a category, which it is not
 * in the bank today.
 */

import type { ItemDifficulty } from "@cr/item-bank";

/** The app-wide storage prefix, so `devServerReset` sweeps this with everything else. */
const STRUGGLE_KEY_PREFIX = "cr.struggle.v1.";

/**
 * How many recent attempts on a node decide its level.
 *
 * Small enough that a learner who has fixed a misconception stops being told they are bad
 * at it within one drill session, large enough that a single unlucky slip does not brand a
 * skill they know. Twelve is a little over two five-problem sets.
 */
export const STRUGGLE_RING_SIZE = 12;

/**
 * How many recent attempts on one SHAPE decide its level.
 *
 * Half the node's ring, because a node's attempts divide across its shapes: a learner who
 * has done two practice sets on a node has twelve attempts spread over five or more
 * templates, so a shape ring as long as the node's would almost never fill and the level
 * would be reading three attempts dressed up as twelve.
 */
export const STRUGGLE_SHAPE_RING_SIZE = 6;

/**
 * How many shapes one node keeps buckets for.
 *
 * Sized ABOVE the bank's real maximum templates-per-node rather than at it, so no node in
 * the tree evicts anything today and the eviction path is a guard against future authoring
 * rather than something a learner meets. `templateStruggle.test.ts` measures that maximum
 * from the bank itself and fails if this constant ever falls below it -- which is the only
 * way a figure like this stays true, since the number it is sized against lives in another
 * package and moves with every authoring run.
 */
export const STRUGGLE_SHAPE_CAP = 16;

/**
 * Clean attempts required before the reward taper treats a skill as understood.
 *
 * Four rather than one because the question the economy asks is "has this been
 * DEMONSTRATED", and a single first-try correct is as consistent with a lucky guess as
 * with command of the skill.
 */
export const SETTLED_ATTEMPTS = 4;

export type StruggleTier = "struggling" | "shaky" | "solid";

/** Above this level a skill reads as struggling; the drill favours it and it pays most. */
export const STRUGGLING_AT = 0.5;
/** Above this a skill is shaky: served a little more often, paid a little more. */
export const SHAKY_AT = 0.2;

/**
 * One resolved attempt, as the two feeding surfaces see it.
 *
 * `firstTry` and `revealed` are recorded even though the level below folds them into one
 * number, because the deferred reward tiers (high for an error turned into an independent
 * correct, none for guessing until the answer is exposed) are exactly these fields. Storing
 * them now is what lets those land later without a data migration.
 */
export interface StruggleAttempt {
  readonly nodeId: string;
  /**
   * Which SHAPE of problem this was, from the item's own `template_id`.
   *
   * Required rather than optional, so no call site can silently opt out of the grain and
   * leave the drill picking uniformly on a node it has shape history for. Every surface
   * that resolves an item has the item in hand when it reports, so none of them has to
   * look it up.
   */
  readonly templateId: string;
  /** The item's difficulty, stored so the easy-hard reading needs no lookup into the bank. */
  readonly difficulty: ItemDifficulty;
  /** Did the learner get it right in the end. */
  readonly correct: boolean;
  /** Was this their first answer on the item, with no earlier wrong answer on it. */
  readonly firstTry: boolean;
  /** Was the worked solution on screen before the attempt resolved. */
  readonly revealed: boolean;
  /** Hints taken on this item. The drill offers none, so it always reports 0. */
  readonly hintsUsed: number;
}

/**
 * One shape's history within a node.
 *
 * `attempts` is kept beside the ring even though the ring's length nearly says it, because
 * they diverge exactly where it matters: once the ring is full it stops counting, and the
 * eviction below needs to know which shape the learner has done LEAST, not which has the
 * shortest ring.
 */
export interface ShapeRecord {
  readonly templateId: string;
  readonly difficulty: ItemDifficulty;
  /** Costs in [0,1], oldest first, at most {@link STRUGGLE_SHAPE_RING_SIZE}. */
  readonly ring: readonly number[];
  /** Lifetime attempts on this shape, which the ring stops counting once it is full. */
  readonly attempts: number;
}

/** What is persisted per node. Counts are lifetime; the rings are recent. */
export interface StruggleRecord {
  readonly nodeId: string;
  /** Per-attempt costs in [0,1], oldest first, at most {@link STRUGGLE_RING_SIZE}. */
  readonly ring: readonly number[];
  readonly firstTryCorrect: number;
  readonly correctAfterError: number;
  readonly incorrect: number;
  readonly revealed: number;
  readonly hinted: number;
  /**
   * Per-shape history, at most {@link STRUGGLE_SHAPE_CAP} entries, least-attempted evicted.
   *
   * An ARRAY rather than an object keyed by template id, so the order eviction reads is a
   * property of the stored value rather than of whatever order a JSON parse happened to
   * produce.
   */
  readonly shapes: readonly ShapeRecord[];
}

/** A storage surface, so tests can drive this without touching a real browser. */
export interface StruggleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function struggleStorageKey(nodeId: string): string {
  return `${STRUGGLE_KEY_PREFIX}${nodeId}`;
}

function defaultStorage(): StruggleStorage | null {
  return runtimeStorage();
}

export function emptyStruggleRecord(nodeId: string): StruggleRecord {
  return {
    nodeId,
    ring: [],
    firstTryCorrect: 0,
    correctAfterError: 0,
    incorrect: 0,
    revealed: 0,
    hinted: 0,
    shapes: [],
  };
}

/**
 * What one attempt costs, in [0,1], where 0 is command and 1 is no independent progress.
 *
 * The ordering is the point rather than the exact figures: seeing the answer is worth more
 * evidence of struggle than getting it wrong unaided, which is worth more than getting it
 * right after a stumble, which is worth more than getting it right cold.
 */
export function attemptCost(attempt: StruggleAttempt): number {
  if (attempt.revealed) {
    return 1;
  }
  if (!attempt.correct) {
    return 0.8;
  }
  if (!attempt.firstTry || attempt.hintsUsed > 0) {
    return 0.5;
  }
  return 0;
}

function isDifficulty(value: unknown): value is ItemDifficulty {
  return value === 1 || value === 2 || value === 3;
}

/**
 * Read the shape buckets out of a stored blob, dropping anything unreadable.
 *
 * **A RECORD WRITTEN BEFORE THIS FIELD EXISTED HAS NO `shapes` AND MUST STILL READ**, which
 * is why an absent field is an empty list rather than a corrupt record. Every learner who
 * has practised has one of those, and treating it as corrupt would throw their node-level
 * history away to gain a shape-level history they do not have yet.
 */
function parseShapes(value: unknown): readonly ShapeRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const shapes: ShapeRecord[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const candidate = entry as Partial<Record<keyof ShapeRecord, unknown>>;
    if (typeof candidate.templateId !== "string" || candidate.templateId.length === 0) {
      continue;
    }
    if (!isDifficulty(candidate.difficulty)) {
      continue;
    }
    const ring = Array.isArray(candidate.ring)
      ? candidate.ring
          .filter((cost): cost is number => typeof cost === "number" && cost >= 0)
          .slice(-STRUGGLE_SHAPE_RING_SIZE)
      : [];
    const attempts =
      typeof candidate.attempts === "number" &&
      Number.isFinite(candidate.attempts) &&
      candidate.attempts >= 0
        ? candidate.attempts
        : ring.length;
    shapes.push({
      templateId: candidate.templateId,
      difficulty: candidate.difficulty,
      ring,
      attempts,
    });
  }
  return shapes.slice(0, STRUGGLE_SHAPE_CAP);
}

function parseRecord(nodeId: string, raw: string | null): StruggleRecord {
  if (raw === null) {
    return emptyStruggleRecord(nodeId);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return emptyStruggleRecord(nodeId);
    }
    const shape = parsed as Partial<Record<keyof StruggleRecord, unknown>>;
    const ring = Array.isArray(shape.ring)
      ? shape.ring
          .filter((entry): entry is number => typeof entry === "number" && entry >= 0)
          .slice(-STRUGGLE_RING_SIZE)
      : [];
    const count = (value: unknown): number =>
      typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
    return {
      nodeId,
      ring,
      firstTryCorrect: count(shape.firstTryCorrect),
      correctAfterError: count(shape.correctAfterError),
      incorrect: count(shape.incorrect),
      revealed: count(shape.revealed),
      hinted: count(shape.hinted),
      shapes: parseShapes(shape.shapes),
    };
  } catch {
    // A corrupt entry is treated as no entry. The alternative is a lesson surface that
    // throws on mount because a decorative counter failed to parse.
    return emptyStruggleRecord(nodeId);
  }
}

export function readStruggleRecord(
  nodeId: string,
  storage: StruggleStorage | null = defaultStorage(),
): StruggleRecord {
  if (!storage) {
    return emptyStruggleRecord(nodeId);
  }
  return parseRecord(nodeId, storage.getItem(struggleStorageKey(nodeId)));
}

/**
 * Fold one attempt into a node's record and persist it.
 *
 * Returns the new record so a caller that has just written can read the consequence
 * without a second parse.
 */
/**
 * Fold one attempt into the shape buckets, adding, updating, or evicting as needed.
 *
 * Eviction takes the LEAST-ATTEMPTED bucket, ties going to the oldest position. Least
 * attempted rather than oldest outright because the point of the cap is to keep the buckets
 * the drill can act on, and a shape with one attempt behind it is the one whose level is
 * worth least. No node in the bank reaches the cap today (`templateStruggle.test.ts`
 * measures that), so this path exists for the authoring run that adds a ninth shape to a
 * node, not for a learner.
 */
function foldShape(
  shapes: readonly ShapeRecord[],
  attempt: StruggleAttempt,
  cost: number,
): readonly ShapeRecord[] {
  const existing = shapes.findIndex((shape) => shape.templateId === attempt.templateId);
  if (existing >= 0) {
    const shape = shapes[existing] as ShapeRecord;
    const updated: ShapeRecord = {
      templateId: shape.templateId,
      // Taken from the ATTEMPT, so a template that is retagged to another difficulty
      // corrects itself on the next attempt instead of reading at its old tier forever.
      difficulty: attempt.difficulty,
      ring: [...shape.ring, cost].slice(-STRUGGLE_SHAPE_RING_SIZE),
      attempts: shape.attempts + 1,
    };
    const next = [...shapes];
    next[existing] = updated;
    return next;
  }
  const fresh: ShapeRecord = {
    templateId: attempt.templateId,
    difficulty: attempt.difficulty,
    ring: [cost],
    attempts: 1,
  };
  if (shapes.length < STRUGGLE_SHAPE_CAP) {
    return [...shapes, fresh];
  }
  let weakest = 0;
  for (let i = 1; i < shapes.length; i += 1) {
    if ((shapes[i] as ShapeRecord).attempts < (shapes[weakest] as ShapeRecord).attempts) {
      weakest = i;
    }
  }
  const next = [...shapes];
  next.splice(weakest, 1);
  return [...next, fresh];
}

export function recordStruggleAttempt(
  attempt: StruggleAttempt,
  storage: StruggleStorage | null = defaultStorage(),
): StruggleRecord {
  const previous = readStruggleRecord(attempt.nodeId, storage);
  const cost = attemptCost(attempt);
  const ring = [...previous.ring, cost].slice(-STRUGGLE_RING_SIZE);
  const next: StruggleRecord = {
    nodeId: attempt.nodeId,
    ring,
    shapes: foldShape(previous.shapes, attempt, cost),
    firstTryCorrect:
      previous.firstTryCorrect +
      (attempt.correct && attempt.firstTry && !attempt.revealed && attempt.hintsUsed === 0
        ? 1
        : 0),
    correctAfterError:
      previous.correctAfterError +
      (attempt.correct && !attempt.revealed && (!attempt.firstTry || attempt.hintsUsed > 0)
        ? 1
        : 0),
    incorrect: previous.incorrect + (!attempt.correct && !attempt.revealed ? 1 : 0),
    revealed: previous.revealed + (attempt.revealed ? 1 : 0),
    hinted: previous.hinted + (attempt.hintsUsed > 0 ? 1 : 0),
  };
  if (storage) {
    try {
      storage.setItem(struggleStorageKey(attempt.nodeId), JSON.stringify(next));
    } catch {
      // A full or blocked quota loses the signal, which costs a better-tuned drill and
      // nothing else. It must not cost the learner their answer.
    }
  }
  return next;
}

/**
 * The node's struggle level in [0,1]: the mean cost of its recent attempts.
 *
 * A node with no attempts reads 0 rather than some "unknown" middle value, so an untouched
 * skill is never treated as a weak one. The drill only serves practised skills anyway, so
 * an empty ring here means the learner practised before this store existed.
 */
export function struggleLevelOf(record: StruggleRecord): number {
  return meanCost(record.ring);
}

/** The mean of a list of costs, or 0 when there is nothing to average. */
function meanCost(costs: readonly number[]): number {
  if (costs.length === 0) {
    return 0;
  }
  return costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
}

/**
 * How hard the learner is finding ONE SHAPE of problem on this node, in [0,1].
 *
 * A shape with no history reads 0, matching {@link struggleLevelOf}: a problem type the
 * learner has never met is not one they are weak at, and the drill must not favour a shape
 * on the strength of never having served it.
 */
export function templateStruggleLevelOf(
  record: StruggleRecord,
  templateId: string,
): number {
  const shape = record.shapes.find((entry) => entry.templateId === templateId);
  return shape ? meanCost(shape.ring) : 0;
}

/**
 * How hard the learner is finding this node's problems AT ONE DIFFICULTY, in [0,1].
 *
 * The easy-hard reading, and it needs no buckets of its own: a template sits at exactly one
 * difficulty, so pooling the rings of every shape at that tier is the same measurement a
 * per-difficulty ring would have taken. Pooled rather than averaged over shapes, so a tier
 * the learner has attempted twelve times at one shape and once at another is weighted the
 * way the attempts actually fell.
 */
export function difficultyStruggleLevelOf(
  record: StruggleRecord,
  difficulty: ItemDifficulty,
): number {
  const costs: number[] = [];
  for (const shape of record.shapes) {
    if (shape.difficulty === difficulty) {
      costs.push(...shape.ring);
    }
  }
  return meanCost(costs);
}

export function struggleTierOf(level: number): StruggleTier {
  if (level >= STRUGGLING_AT) {
    return "struggling";
  }
  if (level >= SHAKY_AT) {
    return "shaky";
  }
  return "solid";
}

/**
 * Has the learner shown they have this skill, in the sense the reward taper needs.
 *
 * Deliberately stricter than `tier === "solid"`: it demands {@link SETTLED_ATTEMPTS} recent
 * attempts and that every one of them was clean. "Decrease the reward once they have
 * demonstrated they understand it" is a claim about demonstration, and a tier can read
 * solid off two attempts.
 */
export function hasDemonstratedCommand(record: StruggleRecord): boolean {
  const recent = record.ring.slice(-SETTLED_ATTEMPTS);
  return recent.length >= SETTLED_ATTEMPTS && recent.every((cost) => cost === 0);
}

/** Levels for a set of nodes in one pass, for the scheduler and the chip. */
export function readStruggleLevels(
  nodeIds: readonly string[],
  storage: StruggleStorage | null = defaultStorage(),
): Map<string, number> {
  const levels = new Map<string, number>();
  for (const nodeId of nodeIds) {
    levels.set(nodeId, struggleLevelOf(readStruggleRecord(nodeId, storage)));
  }
  return levels;
}
