import { type EraId, eraAtNumber, eraNumber, getEraOrThrow } from "@cr/skill-graph";

import { createSeededRng, mixSeed } from "./citizens-rng";
import { SUCCESSION_ERA } from "./succession";
import { SUCCESSION } from "./succession-tuning";

/**
 * **THE QUESTIONS ERA FOUR'S SUCCESSION ASKS** — D-CRISIS-14's three-era window, apportioned
 * over a batch, and the batch is the cycle (D-CRISIS-34).
 *
 * Without this the crisis has a state machine and nothing to answer: `successionReducer`
 * takes `resolve_batch` with a count of right answers and cannot be reached at all until
 * something composes the three questions that count came from. `composeHardWinterBatch` is
 * the model and this follows its shape closely, so a reader who knows era one's composer
 * finds the same seams here — a caller-supplied item pool, a caller-supplied RNG with no
 * fallback, a fail-loud refusal instead of a short batch, and a skill order that can reorder
 * the draw and can never shrink it.
 *
 * Framework-free and clockless, like the rest of era four's engine, and it names no
 * position: a question belongs to a SKILL and to an ERA, and neither of those is a place.
 * `test/successionPropagation.test.ts` sweeps this file for a neighbour relation and for a
 * clock read, along with every other source that can decide an allegiance.
 *
 * ## THE FOUR WAYS THIS DEPARTS FROM ERA ONE'S COMPOSER, each for a stated reason
 *
 *  1. **It takes the window's BUCKETS rather than one flat list of eligible nodes.** Era one
 *     takes `masteredNodeIds` because era one's window is one bucket by D-CRISIS-14's named
 *     exception. Era four's has three, and flattening them at the boundary would throw away
 *     the only thing that can tell a player which chapter a question came from — and the
 *     only thing the mix can be measured against.
 *  2. **The skill order is REQUIRED, with no shuffle fallback.** Era one's is optional
 *     because forgetting it costs a coverage guarantee. Era four's carries D-CRISIS-14's
 *     ruled MIX, and a composer that quietly fell back to a uniform shuffle would breach a
 *     ruling while looking like it worked: over era four's window that draw hands the
 *     current era 23% where the ruling gives it 40% (the table in `succession-tuning.ts`
 *     measures it). A silent 23% is worse than a loud missing argument.
 *  3. **There is no `size` option.** Era one's composer takes one; era four's must not,
 *     because D-CRISIS-34 makes the batch the cycle unit and `successionCycleClose` throws
 *     on any batch that is not `SUCCESSION.cycle.batch_size`. A `size` parameter would be a
 *     way to compose a batch the reducer is obliged to refuse, which is the shape
 *     `successionBoardFor` declines for the same reason it declines an RNG parameter: there
 *     is exactly one correct value and a parameter is an invitation to pass another.
 *  4. **The refusal's reason is the INVERSE of era one's.** Era one refuses a short batch
 *     because its action tier is a ratio of what was asked, so a two-question batch would
 *     widen every bonfire. Era four's earning ladder is absolute and could not be inflated
 *     that way — what a short batch would do here is make the crisis HARDER, because one
 *     district decides per cycle whatever the batch was, so two questions is one district
 *     lost against at most two counters earned. Same refusal, opposite defect, and both are
 *     worth having written down.
 *
 * ## Why the whole sequence is derived from `(encounter, cycle)` and never remembered
 *
 * The state machine is a pure fold with nowhere to keep a bag, exactly as era one's is, so
 * the bucket a question comes from and the skill inside that bucket are both functions of
 * the cycle. Two properties fall out that a remembered bag would not have for free:
 * INV-CRISIS-11's end-to-end replay still holds, and cycle five can be recomputed without
 * replaying the four before it — which is what lets a tuning pass compare two plans over
 * the same questions.
 */

/* -------------------------------------------------------------------------- */
/* The window                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One bucket of D-CRISIS-14's window: an era, its ruled share, and the nodes it can offer.
 *
 * There is no position on this type and there is not going to be one. A bucket is an era and
 * a share; `eras_back` is how far back the era is in the sequence, which is an ordering over
 * the game's chapters and not a place on any board.
 */
export interface SuccessionWindowBucket {
  readonly era: EraId;
  /** How many eras behind the crisis's own era this bucket sits. `0` is the current era. */
  readonly eras_back: number;
  /**
   * D-CRISIS-14's share for this bucket, in percentage points and always a whole number.
   * The shares of a window's buckets sum to 100 whatever the collapse did.
   */
  readonly share: number;
  /**
   * The nodes this bucket can offer, in the era's own authored order.
   *
   * Filtered to what the learner has finished. For the two older buckets that filter is a
   * no-op on any learner who arrived legitimately — §5.15 is explicit that *"every node of a
   * previous era is mastered by construction"*, because the era trial only unlocks once
   * every node of the era holds mastery — and it is applied anyway, because a dev seed and a
   * fresh install are states the game routes players into on purpose. An empty bucket is a
   * real answer: the crisis then draws from the buckets that can serve rather than refusing
   * a cycle, which is INV-CRISIS-3.
   */
  readonly node_ids: readonly string[];
}

/**
 * **THE WINDOW FOR ONE ERA'S CRISIS, DERIVED FROM THE ERA SEQUENCE RATHER THAN WRITTEN
 * DOWN.**
 *
 * The current era plus `SUCCESSION.window.eras_back` behind it, each carrying its ruled
 * share, each filtered to the nodes the learner has finished.
 *
 * ## The collapse, and why it is a derivation rather than a second table
 *
 * A window that reaches past the start of the game folds the shares it cannot place into the
 * OLDEST era it did reach. That single rule reproduces both of D-CRISIS-14's named
 * exceptions: era two comes out at 40/60 and era one at 100, which are the two figures the
 * ruling writes down. `succession-questions.test.ts` asserts both, which is what turns
 * "reproduces the exceptions" into a measurement rather than a claim — and it is a check on
 * the derivation rather than a use of it, because **era four's window needs no exception at
 * all** and era one's crisis has its own composer and does not read this.
 *
 * The alternative considered and declined was renormalising the surviving shares in
 * proportion. It is the obvious move and it contradicts the ruling: era two renormalised is
 * 53/47, and the ruling says 40/60. The collapse is what the ruling's own words describe —
 * *"the two older buckets collapse into one and keep their combined weight"*.
 *
 * `mastered` is *"the nodes this learner has finished"* and what finishing means is
 * deliberately the CALLER's rule, exactly as era one's composer leaves it: `crisis` reads
 * `CRISIS_MASTERY_GATE` for the trigger and era one's surface uses its own completed-node
 * rule for the draw, and this module has no business picking between them.
 */
export function successionWindow(input: {
  readonly era?: EraId;
  readonly mastered: readonly string[];
}): readonly SuccessionWindowBucket[] {
  const era = input.era ?? SUCCESSION_ERA;
  const shares = SUCCESSION.window.shares_percent;
  const reach = SUCCESSION.window.eras_back;

  if (shares.length !== reach + 1) {
    throw new Error(
      `The window reaches ${reach} era(s) back and carries ${shares.length} share(s). ` +
        `One share per era in the window or the apportionment would place a question in ` +
        `a bucket with no weight, or weight a bucket with no questions.`,
    );
  }

  // Fails loud on an era the sequence does not have, following `midEraCrisisTrigger`: a
  // crisis silently defaulting to another era's window would draw a whole batch from the
  // wrong chapter and look exactly like a working one.
  const position = eraNumber(era);

  const reached: EraId[] = [];
  for (let back = 0; back <= reach; back += 1) {
    const found = eraAtNumber(position - back);
    if (found) {
      reached.push(found.id);
    }
  }

  const weights = shares.slice(0, reached.length);
  const unplaced = shares.slice(reached.length).reduce((total, share) => total + share, 0);
  const last = weights.length - 1;
  if (last < 0) {
    throw new Error(
      `Era "${era}" resolves to no era in the window, so its crisis has no questions ` +
        `to draw and nothing would ever be asked.`,
    );
  }
  weights[last] = (weights[last] as number) + unplaced;

  const finished = new Set(input.mastered);
  return reached.map((bucketEra, back) => ({
    era: bucketEra,
    eras_back: back,
    share: weights[back] as number,
    node_ids: getEraOrThrow(bucketEra).nodes.filter((nodeId) => finished.has(nodeId)),
  }));
}

/** Every node the window can offer, current era first, with no repeats. */
export function successionEligibleNodes(
  buckets: readonly SuccessionWindowBucket[],
): readonly string[] {
  const seen = new Set<string>();
  for (const bucket of buckets) {
    for (const nodeId of bucket.node_ids) {
      seen.add(nodeId);
    }
  }
  return [...seen];
}

/* -------------------------------------------------------------------------- */
/* The apportionment                                                          */
/* -------------------------------------------------------------------------- */

/** One question's place in the draw: which bucket, and how many that bucket had already. */
interface QuestionSlot {
  /** Index into the servable buckets. */
  readonly bucket: number;
  /** How many questions this bucket had already been given, across the whole encounter. */
  readonly taken: number;
}

/**
 * **WHICH BUCKET EACH QUESTION OF AN ENCOUNTER BELONGS TO, apportioned rather than sampled.**
 *
 * The ruling gives shares and the batch gives three slots, and 40/35/25 does not divide into
 * three. Something has to decide how the shares become questions, and the two candidates are
 * genuinely different mechanisms rather than two spellings of one:
 *
 *  - **A weighted draw per slot**, which is what "sampled" reads like at first. Declined,
 *    and the reason is that era four's encounter is SHORT. A board settles in at most
 *    `districts + 1` cycles, so an encounter is 9 to 21 questions; at nine, an independent
 *    weighted draw leaves the oldest bucket empty `0.75^9` of the time, which is about one
 *    crisis in thirteen asking nothing at all from the era the ruling gives 25% to. §5.15's
 *    whole reason for bucket-first is that the weights should MEAN something, and a scheme
 *    that voids a bucket that often means less than the ruling intends.
 *  - **Apportionment**, which is what this does. The next question goes to whichever bucket
 *    is furthest behind its ruled share, so after `n` questions every bucket holds its share
 *    of `n` rounded to a whole question. It is deterministic, it is previewable, and it is
 *    the closest a whole number of questions can come to the ruled mix at EVERY prefix
 *    rather than only in the limit.
 *
 * The comparison is exact and deliberately so: `share * asked` against `taken * 100` over
 * whole numbers, so a tie is a tie rather than a rounding artefact, and ties go to the
 * earlier bucket — the chapter the player is standing in. `succession-tuning.ts` argues at
 * the shares why they are integers.
 *
 * **A bucket the learner cannot fill is dropped from the apportionment**, and that is a
 * default rather than a ruling: D-CRISIS-14 says nothing about a window whose older era the
 * learner never finished, and the two invariants that do reach it point one way. INV-CRISIS-9
 * refuses a short batch rather than serving one and INV-CRISIS-3 forbids an unplayable cycle,
 * so a bucket with no nodes must not be allocated a slot it would then have to hand back.
 * What that costs is the ruled mix on a learner who skipped an era, and what refusing would
 * cost is the crisis.
 */
function apportion(
  buckets: readonly SuccessionWindowBucket[],
  through: number,
): readonly QuestionSlot[] {
  const total = buckets.reduce((sum, bucket) => sum + bucket.share, 0);
  const taken = buckets.map(() => 0);
  const slots: QuestionSlot[] = [];

  for (let index = 0; index < through; index += 1) {
    const asked = index + 1;
    let best = 0;
    let bestDeficit = Number.NEGATIVE_INFINITY;
    for (const [position, bucket] of buckets.entries()) {
      // Integers throughout: `share * asked` is how many questions this bucket is owed by
      // now, scaled by 100, and `taken * total` is how many it has on the same scale.
      const deficit = bucket.share * asked - (taken[position] as number) * total;
      if (deficit > bestDeficit) {
        best = position;
        bestDeficit = deficit;
      }
    }
    slots.push({ bucket: best, taken: taken[best] as number });
    taken[best] = (taken[best] as number) + 1;
  }

  return slots;
}

/** The buckets that can actually serve a question, in window order. */
function servableBuckets(
  buckets: readonly SuccessionWindowBucket[],
): readonly SuccessionWindowBucket[] {
  return buckets.filter((bucket) => bucket.node_ids.length > 0);
}

/**
 * WHICH ERA EACH QUESTION OF ONE CYCLE'S BATCH IS DRAWN FROM, in slot order.
 *
 * Exported because it is the only way to read D-CRISIS-14's mix without a pool: a test can
 * assert that the realised share tracks the ruled one at every prefix, and a tuning read-out
 * can print the encounter's mix before anybody authors an item. Empty when no bucket in the
 * window can serve anything, which is the state `composeSuccessionBatch` refuses.
 */
export function successionWindowSlots(input: {
  readonly buckets: readonly SuccessionWindowBucket[];
  /** 1-based, the same count `SuccessionState.cycle` carries. */
  readonly cycle: number;
}): readonly EraId[] {
  const servable = servableBuckets(input.buckets);
  if (servable.length === 0) {
    return [];
  }
  const size = SUCCESSION.cycle.batch_size;
  const cycle = requireCycle(input.cycle);
  const slots = apportion(servable, cycle * size);
  return slots
    .slice((cycle - 1) * size, cycle * size)
    .map((slot) => (servable[slot.bucket] as SuccessionWindowBucket).era);
}

function requireCycle(cycle: number): number {
  if (!Number.isInteger(cycle) || cycle < 1) {
    throw new Error(
      `A Succession cycle is a whole number from 1 (got ${cycle}), because the question ` +
        `sequence is derived from it rather than remembered and cycle zero is a batch ` +
        `nobody answered.`,
    );
  }
  return cycle;
}

/* -------------------------------------------------------------------------- */
/* The skill order                                                            */
/* -------------------------------------------------------------------------- */

/** In-place Fisher-Yates over a caller-supplied stream. No unseeded draw anywhere. */
function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const held = items[index] as T;
    items[index] = items[swap] as T;
    items[swap] = held;
  }
}

/**
 * A shuffled bag over `items`, long enough to read `length` entries out of, with the
 * boundary swap `createInterleavedScheduler` uses: a bag that would open on the entry the
 * last one closed with hands that slot to another entry, so nothing lands back to back
 * across a bag boundary.
 *
 * Every block of `items.length` therefore holds every item exactly once before any repeats,
 * which is D-CRISIS-15 — *"a crisis does not re-ask one skill while others in its window go
 * untouched"* — as a property of the sequence rather than as a promise about it.
 */
function shuffledBag(
  items: readonly string[],
  seed: number,
  length: number,
): readonly string[] {
  // THE BLOCK COUNT IS DERIVED RATHER THAN THE LOOP BEING RUN UNTIL IT IS LONG ENOUGH, and
  // that is a termination guarantee rather than a tidy-up. Written as
  // `while (sequence.length < length)` this spins forever on an empty bag — and a SYNCHRONOUS
  // spin is the one failure mode a test timeout cannot interrupt, so it costs a whole run
  // rather than reporting red. Found exactly that way: an injected defect that removed the
  // empty-bucket filter hung the harness instead of failing it. Counted, there is no bag size
  // this cannot answer for.
  const blocks = items.length === 0 ? 0 : Math.ceil(length / items.length);
  const sequence: string[] = [];
  let previous: string | null = null;
  for (let block = 0; block < blocks; block += 1) {
    const bag = [...items];
    shuffleInPlace(bag, createSeededRng(mixSeed(seed, block + 1)));
    if (bag.length > 1 && bag[0] === previous) {
      for (let index = 1; index < bag.length; index += 1) {
        if (bag[index] !== previous) {
          const held = bag[0] as string;
          bag[0] = bag[index] as string;
          bag[index] = held;
          break;
        }
      }
    }
    previous = bag[bag.length - 1] ?? null;
    sequence.push(...bag);
  }
  return sequence;
}

/**
 * **THE BATCH'S SKILL ORDER: D-CRISIS-14's buckets crossed with D-CRISIS-15's no-repeat bag.**
 *
 * One node id per slot of this cycle's batch, in slot order, followed by every other
 * eligible node.
 *
 * The tail is what keeps this A PREFERENCE AND NEVER A CONSTRAINT, which D-CRISIS-15
 * requires in those words: a preferred skill whose items the pool has run out of costs a
 * reorder rather than a refused cycle. INV-CRISIS-9 refuses a short batch and INV-CRISIS-3
 * forbids an unplayable one, so a rule strict enough to exhaust a thin bucket mid-crisis
 * would produce no batch at all.
 *
 * **Each bucket keeps its own bag, seeded on its position in the window**, and that is the
 * part worth stating: one bag over the flattened window would let a bucket's skills be
 * spent early and leave the bucket unable to honour its later slots, which is the coverage
 * guarantee going out through the same door the mix came in by. A bucket's bag is read at
 * the position the apportionment has already given it, so the two rules compose rather than
 * competing — the mix decides WHICH ERA and the bag decides WHICH SKILL inside it.
 */
export function successionSkillOrder(input: {
  readonly buckets: readonly SuccessionWindowBucket[];
  /** Stable across the cycles of ONE encounter, and different between encounters. */
  readonly encounterSeed: number;
  /** 1-based, the same count `SuccessionState.cycle` carries. */
  readonly cycle: number;
}): readonly string[] {
  const servable = servableBuckets(input.buckets);
  const eligible = successionEligibleNodes(input.buckets);
  if (servable.length === 0) {
    return eligible;
  }

  const size = SUCCESSION.cycle.batch_size;
  const cycle = requireCycle(input.cycle);
  const through = cycle * size;
  const slots = apportion(servable, through);

  // How deep into each bucket's bag this cycle reaches, so a bag is generated once per
  // bucket rather than once per question.
  const depth = servable.map(() => 0);
  for (const slot of slots) {
    depth[slot.bucket] = Math.max(depth[slot.bucket] as number, slot.taken + 1);
  }
  const bags = servable.map((bucket, position) =>
    shuffledBag(
      bucket.node_ids,
      mixSeed(input.encounterSeed, position + 1),
      depth[position] as number,
    ),
  );

  const preferred: string[] = [];
  for (const slot of slots.slice((cycle - 1) * size, through)) {
    const skill = (bags[slot.bucket] as readonly string[])[slot.taken];
    // A slot with no skill behind it contributes no PREFERENCE, which is the same mechanism
    // an exhausted pool goes through rather than a second one: the fallback tail below fills
    // it. So there is no state in which this order names something that does not exist.
    if (skill !== undefined) {
      preferred.push(skill);
    }
  }

  const named = new Set(preferred);
  return [...preferred, ...eligible.filter((nodeId) => !named.has(nodeId))];
}

/* -------------------------------------------------------------------------- */
/* The batch                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * An item the batch may draw. Structurally a subset of the item bank's `FrozenItem`, so a
 * caller passes authored items straight in and this module never imports `@cr/item-bank` —
 * the same deliberate decoupling `hard-winter.ts`, `era-trial.ts` and `storm-battle.ts`
 * keep. Which pool an era draws from is a content decision and belongs to the caller.
 *
 * **There is no answer on this type and there is not going to be one** (INV-CRISIS-7:
 * correctness arrives as the authoritative checker's verdict, supplied by the caller). One
 * consequence of that reaches whoever assembles the pool, and era four is the first crisis
 * where it bites: **a caller owes a pool of questions its own answer surface can take.** Era
 * four's window includes era two's, which holds widget-scored items with no typed answer key
 * at all, where era one's pool holds none — so a caller that hands over the whole domain
 * unfiltered can draw a question its answer field has no control for.
 * `succession-play.test.ts` measures the census per node and filters on exactly that
 * property, and the numbers are there rather than here because they are facts about content.
 */
export interface SuccessionQuestionCandidate {
  readonly item_version_id: string;
  readonly node_id: string;
  readonly prompt: string;
}

/** A drawn question. Carries no answer key: nothing here grades (INV-CRISIS-7). */
export interface SuccessionBatchPrompt {
  readonly index: number;
  readonly node_id: string;
  readonly item_version_id: string;
  readonly prompt: string;
  /**
   * Which era of the window this question came from.
   *
   * Carried per prompt rather than left for a caller to look up, because it is the only
   * thing that makes the ruled mix visible: §9.4's question panel can say which chapter the
   * question is from, and a measurement can count the realised shares without re-deriving
   * which era owns which node.
   */
  readonly era: EraId;
}

export type SuccessionBatchUnavailableReason = "nothing_mastered" | "pool_too_thin";

export type SuccessionBatchComposition =
  | {
      readonly status: "ready";
      readonly size: number;
      readonly prompts: readonly SuccessionBatchPrompt[];
    }
  | {
      readonly status: "unavailable";
      readonly reason: SuccessionBatchUnavailableReason;
      readonly wanted: number;
      readonly available: number;
      readonly message: string;
    };

export interface ComposeSuccessionBatchOptions {
  /**
   * RNG in [0, 1). REQUIRED, with no fallback, exactly as era one's composer requires one
   * and for the same two reasons: an unseeded draw is the one path in the encounter nobody
   * could replay, and it is the natural place for somebody to reach for a timestamp as a
   * seed. `test/successionPropagation.test.ts` sweeps this file for a clock read and can
   * mean it because there is no unseeded path here at all.
   */
  readonly rng: () => number;
  /**
   * WHICH SKILL EACH SLOT PREFERS, in slot order, followed by the fallbacks.
   * `successionSkillOrder` computes it.
   *
   * **Required, unlike era one's**, because it is where D-CRISIS-14's ruled mix lives. A
   * default shuffle would draw uniformly across the window, which hands era four's own
   * chapter 23% of the crisis where the ruling gives it 40%, and would do it silently.
   */
  readonly skill_order: readonly string[];
}

/**
 * Draw one cycle's batch, or REFUSE. There is no third outcome.
 *
 * **WHY A SHORT DRAW IS REFUSED, and it is the inverse of era one's reason.** Era one's
 * action tier is a ratio of what was asked, so a two-item batch there would resolve `strong`
 * at two correct and quietly widen every bonfire. Era four's earning ladder is absolute —
 * counters are the count of right answers — so nothing here could be inflated that way. What
 * a short batch would do instead is make the crisis HARDER: `districts_per_cycle` is 1
 * whatever the batch was, so two questions is one district lost against at most two counters
 * earned, and the drift rate is calibrated against what a FULL batch mints.
 * `successionCycleClose` refuses the same size at the other end of the wire, so a short batch
 * is refused twice and served never.
 *
 * Round-robins the preference order, each node's items shuffled, so a batch spreads across
 * skills rather than clustering on one — the shape `selectStormPrompts` and
 * `composeHardWinterBatch` both use, for the same reason.
 */
export function composeSuccessionBatch(
  buckets: readonly SuccessionWindowBucket[],
  pool: readonly SuccessionQuestionCandidate[],
  options: ComposeSuccessionBatchOptions,
): SuccessionBatchComposition {
  const size = SUCCESSION.cycle.batch_size;
  const rng = options.rng;
  const eligible = successionEligibleNodes(buckets);

  if (eligible.length === 0) {
    return {
      status: "unavailable",
      reason: "nothing_mastered",
      wanted: size,
      available: 0,
      message:
        "The Succession draws from era four's own nodes and the two eras behind it, and " +
        "this learner has finished none of them. There is nothing to ask, so there is no " +
        "crisis to run yet.",
    };
  }

  const eraOf = new Map<string, EraId>();
  for (const bucket of buckets) {
    for (const nodeId of bucket.node_ids) {
      if (!eraOf.has(nodeId)) {
        eraOf.set(nodeId, bucket.era);
      }
    }
  }

  const byNode = new Map<string, SuccessionQuestionCandidate[]>();
  const inWindow = new Set(eligible);
  for (const candidate of pool) {
    if (!inWindow.has(candidate.node_id)) {
      continue;
    }
    const group = byNode.get(candidate.node_id);
    if (group) {
      group.push(candidate);
    } else {
      byNode.set(candidate.node_id, [candidate]);
    }
  }

  // The preference order, clipped to the nodes the pool can actually serve. An id in the
  // order that is not in the window is dropped; a node the order does not name is appended.
  // So the order can reorder the draw and can never shrink it.
  const servable = eligible.filter((nodeId) => byNode.has(nodeId));
  const serves = new Set(servable);
  const preferred = options.skill_order.filter((nodeId) => serves.has(nodeId));
  const named = new Set(preferred);
  const order = [...preferred, ...servable.filter((nodeId) => !named.has(nodeId))];
  for (const nodeId of order) {
    shuffleInPlace(byNode.get(nodeId) as SuccessionQuestionCandidate[], rng);
  }

  const drawn: SuccessionQuestionCandidate[] = [];
  let drewThisPass = true;
  while (drawn.length < size && drewThisPass) {
    drewThisPass = false;
    for (const nodeId of order) {
      if (drawn.length >= size) {
        break;
      }
      const next = (byNode.get(nodeId) as SuccessionQuestionCandidate[]).pop();
      if (next) {
        drewThisPass = true;
        drawn.push(next);
      }
    }
  }

  if (drawn.length < size) {
    return {
      status: "unavailable",
      reason: "pool_too_thin",
      wanted: size,
      available: drawn.length,
      message:
        `A Succession cycle asks ${size} distinct questions and the pool can furnish ` +
        `${drawn.length} across ${order.length} node(s) of the window. Serving fewer ` +
        `would not shorten the cycle, it would make the crisis harder: one district ` +
        `decides per cycle whatever the batch was.`,
    };
  }

  return {
    status: "ready",
    size,
    prompts: drawn.map((candidate, index) => ({
      index,
      node_id: candidate.node_id,
      item_version_id: candidate.item_version_id,
      prompt: candidate.prompt,
      era: eraOf.get(candidate.node_id) as EraId,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* The one call a surface needs                                               */
/* -------------------------------------------------------------------------- */

/**
 * The salt era four's seeds are mixed with, so the crisis's own streams cannot line up with
 * another feature's off a shared encounter index. `successionBoardFor` uses the same one,
 * which is deliberate: the board a crisis is fought over and the questions it asks are two
 * reads of one encounter and should be reproducible together.
 */
const SUCCESSION_SEED = 0x5ecce55;

/**
 * The seed that is stable across one encounter's cycles and different between encounters.
 * Exported so a caller can seed a preview off the same axis rather than inventing one.
 */
export function successionEncounterSeed(encounter: number): number {
  if (!Number.isInteger(encounter) || encounter < 1) {
    throw new Error(
      `An encounter index must be a whole number from 1 (got ${encounter}), because it ` +
        `is the seed the question sequence is derived from.`,
    );
  }
  return mixSeed(encounter, SUCCESSION_SEED);
}

/**
 * **DRAW THE BATCH FOR ONE CYCLE — the call that makes the Succession playable.**
 *
 * Deterministic in `(encounter, cycle)`, so cycle three of encounter two always asks the
 * same three questions and a retune can be compared against the same play. The whole window
 * is derived here from the era sequence, so a caller supplies the item pool and the learner's
 * progress and nothing else: era one's equivalent lives in the web lane only because the item
 * pool does, and era four's window is a fact about the era table rather than about the app.
 *
 * The two seed axes are separate on purpose, following era one's split. The skill order is
 * seeded on the ENCOUNTER alone, because a rule about the sequence of cycles cannot be
 * expressed by a per-cycle seed; the item drawn inside each skill is seeded per cycle, so two
 * cycles that ask the same skill still ask different questions.
 */
export function successionBatchFor(input: {
  readonly era?: EraId;
  /** The nodes this learner has finished. What "finished" means is the caller's rule. */
  readonly mastered: readonly string[];
  readonly pool: readonly SuccessionQuestionCandidate[];
  /** 1-based encounter index, the same one `successionBoardFor` deals a board from. */
  readonly encounter: number;
  /** 1-based, straight off `SuccessionState.cycle`. */
  readonly cycle: number;
}): SuccessionBatchComposition {
  const encounterSeed = successionEncounterSeed(input.encounter);
  const cycle = requireCycle(input.cycle);
  const buckets = successionWindow({ era: input.era, mastered: input.mastered });

  return composeSuccessionBatch(buckets, input.pool, {
    rng: createSeededRng(mixSeed(encounterSeed, cycle)),
    skill_order: successionSkillOrder({ buckets, encounterSeed, cycle }),
  });
}
