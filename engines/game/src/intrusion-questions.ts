import { type EraId, eraAtNumber, eraNumber, getEraOrThrow } from "@cr/skill-graph";

import { createSeededRng, mixSeed } from "./citizens-rng";
import { RELAY_ERA as INTRUSION_ERA, RELAY_SEED as INTRUSION_SEED } from "./relay";
import { RELAY } from "./relay-tuning";

/**
 * **THE QUESTIONS ERA NINE'S INTRUSION ASKS** — D-CRISIS-14's three-era window, apportioned
 * over one check's questions, where a check is the unit of everything era nine does.
 *
 * Without this the crisis has a state machine and nothing to answer: `intrusionReducer`
 * takes `resolve_questions` with a count of right answers and cannot be reached at all
 * until something composes the three questions that count came from. **Era four's lesson is
 * why this is in the same pass**: an engine without a composer cannot be played, and
 * finding that out cost a second round trip.
 *
 * Nothing here grades and nothing here decides whether a building is compromised: a
 * question belongs to a SKILL and to an ERA, correctness arrives as the authoritative
 * checker's verdict from the caller (INV-CRISIS-7), and the hidden status lives on the
 * state in `intrusion.ts` where exactly one function can read it.
 * `test/intrusionPropagation.test.ts` sweeps this file for a relation between two buildings
 * and for a clock read, along with every other source that can decide a compromised status.
 *
 * ## THE FOUR WAYS THIS DEPARTS FROM ERA FOUR'S COMPOSER, each for a stated reason
 *
 *  1. **The unit is a CHECK, not a cycle.** Era four's composer is keyed by `cycle`, and a
 *     cycle is D-CRISIS-34's answered batch — the thing that turns the board against the
 *     player whether they act or not. **Era nine has no cycle and nothing that turns**, so
 *     the sequence is keyed by the check index: the count of diagnostics the player has
 *     chosen to spend. The difference is not cosmetic. Era four's question sequence is a
 *     function of a clock the player cannot stop; era nine's advances only when the player
 *     pays for it, which is the same asymmetry the tuning is built on.
 *  2. **There is no `size` option**, for the reason era four declines one: the reducer
 *     throws on any check that is not `INTRUSION.check.batch_size`, so a `size` parameter
 *     would be a way to compose a batch the reducer is obliged to refuse.
 *  3. **The refusal's reason is era nine's own.** Era one refuses a short batch because its
 *     tier is a ratio of what was asked; era four because one district decides per cycle
 *     whatever the batch was. **Era nine refuses because a check costs a fixed price out of
 *     a finite purse**, so a short one would sell a cheaper rung of the ladder at the full
 *     price. Three crises, three defects, one refusal.
 *  4. **A bucket is narrowed by what the POOL can serve and not only by what the learner has
 *     finished**, which is the departure that matters most here and is new work rather than
 *     a rename — see {@link intrusionServableWindow}.
 *
 * ## WHY (4) IS OWED HERE AND WAS NOT OWED IN ERA FOUR
 *
 * Era four's window is three eras with three authored item pools, so its buckets are always
 * fillable and the difference between *"the learner has finished this era"* and *"the bank
 * has questions for this era"* never shows. **Era nine's window is three eras with one and
 * a half.** Measured at this tip and pinned both ways by `intrusion-play.test.ts`:
 *
 *   | bucket | era | nodes | nodes with authored items |
 *   |--------|-----|------:|--------------------------:|
 *   | current | 9 Information | 6 (`EL.1`..`EL.6`) | **6** |
 *   | previous | 8 Atomic | 9 | **4** (`LF.1`..`LF.4`; the five `FUN` nodes have none) |
 *   | two back | 7 Industrial | 6 | **0** |
 *
 * Era four's composer filters a bucket on `node_ids.length > 0`, which is a question about
 * MASTERY. Applied to era nine that leaves era seven's bucket in the apportionment with six
 * node ids and nothing behind any of them: the ruled 25% of every check would be allocated
 * to a bucket that hands the slot straight back, and the fallback order would quietly fill
 * it from whichever era had questions left. **The mix would be wrong and the composer would
 * look like it was working**, which is the shape of defect the whole crisis-window ruling
 * exists to prevent (§5.15's era-ten case).
 *
 * So the narrowing happens before the apportionment, and what era nine actually delivers is
 * about **53% current and 47% previous** over two buckets rather than 40/35/25 over three.
 * That is a content gap and not a mechanic one — era seven has no authored items and
 * authoring them is not this lane's — and the honest thing to do is deliver the ruled mix
 * over what exists and pin the shortfall where somebody will trip over it.
 *
 * ## Why the whole sequence is derived from `(encounter, check)` and never remembered
 *
 * The state machine is a pure fold with nowhere to keep a bag, exactly as era one's and era
 * four's are, so the bucket a question comes from and the skill inside that bucket are both
 * functions of the check index. Two properties fall out that a remembered bag would not
 * have for free: INV-CRISIS-11's end-to-end replay still holds, and check five can be
 * recomputed without replaying the four before it — which is what lets a tuning pass
 * compare two policies over the same questions.
 */

/* -------------------------------------------------------------------------- */
/* The window                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One bucket of D-CRISIS-14's window: an era, its ruled share, and the nodes it can offer.
 *
 * There is no position on this type and no field naming a building. A bucket is an era and
 * a share; `eras_back` is how far back the era is in the sequence, which is an ordering over
 * the game's chapters and not a place and not a relation.
 */
export interface IntrusionWindowBucket {
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
   * no-op on any learner who arrived legitimately — §5.15 is explicit that *"every node of
   * a previous era is mastered by construction"* — and it is applied anyway, because a dev
   * seed and a fresh install are states the game routes players into on purpose.
   *
   * **It is not filtered by what the item bank can serve**, and that is deliberate: this is
   * the RULED window, and narrowing it here would hide the shortfall rather than report it.
   * {@link intrusionServableWindow} is the narrowing, and it is a separate call so a
   * read-out can show both and a test can measure the gap between them.
   */
  readonly node_ids: readonly string[];
}

/**
 * **THE WINDOW FOR ONE ERA'S CRISIS, DERIVED FROM THE ERA SEQUENCE RATHER THAN WRITTEN
 * DOWN.**
 *
 * The current era plus `INTRUSION.window.eras_back` behind it, each carrying its ruled
 * share, each filtered to the nodes the learner has finished.
 *
 * ## The collapse, and why it is a derivation rather than a second table
 *
 * A window that reaches past the start of the game folds the shares it cannot place into
 * the OLDEST era it did reach. That single rule reproduces both of D-CRISIS-14's named
 * exceptions: era two comes out at 40/60 and era one at 100, which are the two figures the
 * ruling writes down. `intrusion-questions.test.ts` asserts both, which turns *"reproduces
 * the exceptions"* into a measurement — and it is a check on the derivation rather than a
 * use of it, because **era nine sits ninth and its window needs no exception at all.**
 *
 * The alternative considered and declined was renormalising the surviving shares in
 * proportion. It is the obvious move and it contradicts the ruling: era two renormalised is
 * 53/47, and the ruling says 40/60.
 *
 * `mastered` is *"the nodes this learner has finished"* and what finishing means is
 * deliberately the CALLER's rule, exactly as era one's and era four's composers leave it.
 */
export function intrusionWindow(input: {
  readonly era?: EraId;
  readonly mastered: readonly string[];
}): readonly IntrusionWindowBucket[] {
  const era = input.era ?? INTRUSION_ERA;
  const shares = RELAY.window.shares_percent;
  const reach = RELAY.window.eras_back;

  if (shares.length !== reach + 1) {
    throw new Error(
      `The window reaches ${reach} era(s) back and carries ${shares.length} share(s). ` +
        `One share per era in the window or the apportionment would place a question in ` +
        `a bucket with no weight, or weight a bucket with no questions.`,
    );
  }

  // Fails loud on an era the sequence does not have, following `midEraCrisisTrigger`: a
  // crisis silently defaulting to another era's window would draw a whole check from the
  // wrong chapter and look exactly like a working one.
  const position = eraNumber(getEraOrThrow(era).id);

  const reached: EraId[] = [];
  for (let back = 0; back <= reach; back += 1) {
    const found = eraAtNumber(position - back);
    if (found) {
      reached.push(found.id);
    }
  }

  const weights: number[] = shares.slice(0, reached.length);
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

/**
 * **THE WINDOW NARROWED TO WHAT THE POOL CAN ACTUALLY SERVE — era nine's own departure.**
 *
 * Each bucket keeps only the nodes the supplied pool has questions for, and a bucket left
 * with none is dropped entirely. The header argues why this is owed here and was not owed
 * in era four; the short version is that era nine's oldest bucket has **six mastered nodes
 * and zero authored items**, so a mastery-only filter allocates it a quarter of every check
 * and it hands every slot back.
 *
 * ## The alternative, and what it costs
 *
 * Allocating the slot anyway and letting the fallback order fill it is what era four's
 * composer does, and it produces a full check every time — which is exactly the problem.
 * The mix is silently wrong and nothing fails, and D-CRISIS-14 exists because a silently
 * wrong mix is the defect that made §5.15's era-ten case worth a ruling. **Dropping the
 * bucket makes the shortfall visible**: the realised shares are then the ruled shares over
 * the buckets that exist, which is a number a test can pin and a reader can compare against
 * the ruling.
 *
 * What it does NOT do is refuse the crisis. INV-CRISIS-3 forbids an unplayable encounter
 * and INV-CRISIS-9 refuses a short batch rather than serving one, so a window that can
 * serve two buckets serves two buckets.
 */
export function intrusionServableWindow(
  buckets: readonly IntrusionWindowBucket[],
  pool: readonly IntrusionQuestionCandidate[],
): readonly IntrusionWindowBucket[] {
  const served = new Set(pool.map((candidate) => candidate.node_id));
  return buckets
    .map((bucket) => ({
      ...bucket,
      node_ids: bucket.node_ids.filter((nodeId) => served.has(nodeId)),
    }))
    .filter((bucket) => bucket.node_ids.length > 0);
}

/** Every node the window can offer, current era first, with no repeats. */
export function intrusionEligibleNodes(
  buckets: readonly IntrusionWindowBucket[],
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
  /** Index into the buckets handed in. */
  readonly bucket: number;
  /** How many questions this bucket had already been given, across the whole encounter. */
  readonly taken: number;
}

/**
 * **WHICH BUCKET EACH QUESTION OF AN ENCOUNTER BELONGS TO, apportioned rather than sampled.**
 *
 * The ruling gives shares and a check gives three slots, and no set of shares divides into
 * three. Something has to decide how the shares become questions, and the two candidates
 * are genuinely different mechanisms rather than two spellings of one:
 *
 *  - **A weighted draw per slot**, which is what "sampled" reads like at first. Declined,
 *    because era nine's encounter is SHORT and it is the shortest of the three: the purse
 *    is `buildings + 1` actions, so a whole encounter is 6 to 21 questions, and at the
 *    short board's six an independent weighted draw leaves a bucket empty often enough that
 *    the weights stop meaning anything.
 *  - **Apportionment**, which is what this does. The next question goes to whichever bucket
 *    is furthest behind its ruled share, so after `n` questions every bucket holds its
 *    share of `n` rounded to a whole question. It is deterministic, it is previewable, and
 *    it is the closest a whole number of questions can come to the ruled mix at EVERY
 *    prefix rather than only in the limit.
 *
 * The comparison is exact and deliberately so: `share * asked` against `taken * total` over
 * whole numbers, so a tie is a tie rather than a rounding artefact, and ties go to the
 * earlier bucket — the chapter the player is standing in.
 */
function apportion(
  buckets: readonly IntrusionWindowBucket[],
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

/**
 * WHICH ERA EACH QUESTION OF ONE CHECK IS DRAWN FROM, in slot order.
 *
 * Exported because it is the only way to read D-CRISIS-14's mix without a pool: a test can
 * assert that the realised share tracks the ruled one at every prefix, and a tuning read-out
 * can print an encounter's mix before anybody authors an item. Empty when no bucket handed
 * in can serve anything, which is the state `composeIntrusionBatch` refuses.
 *
 * **Hand it the SERVABLE window** ({@link intrusionServableWindow}) if you want the mix a
 * player will actually meet; hand it the ruled window if you want the mix D-CRISIS-14 asks
 * for. The gap between those two answers is era nine's content shortfall, measured.
 */
export function intrusionWindowSlots(input: {
  readonly buckets: readonly IntrusionWindowBucket[];
  /** 1-based, the count of checks including the one being composed. */
  readonly check: number;
}): readonly EraId[] {
  const servable = input.buckets.filter((bucket) => bucket.node_ids.length > 0);
  if (servable.length === 0) {
    return [];
  }
  const size = RELAY.questions_per_round;
  const check = requireCheck(input.check);
  const slots = apportion(servable, check * size);
  return slots
    .slice((check - 1) * size, check * size)
    .map((slot) => (servable[slot.bucket] as IntrusionWindowBucket).era);
}

function requireCheck(check: number): number {
  throwIfNotACheck(check);
  return check;
}

function throwIfNotACheck(check: number): void {
  if (!Number.isInteger(check) || check < 1) {
    throw new Error(
      `An Intrusion check index is a whole number from 1 (got ${check}), because the ` +
        `question sequence is derived from it rather than remembered and check zero is a ` +
        `diagnostic nobody paid for.`,
    );
  }
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
  const sequence: string[] = [];
  let previous: string | null = null;
  for (let block = 0; sequence.length < length; block += 1) {
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
 * **ONE CHECK'S SKILL ORDER: D-CRISIS-14's buckets crossed with D-CRISIS-15's no-repeat bag.**
 *
 * One node id per slot of this check, in slot order, followed by every other eligible node.
 *
 * The tail is what keeps this A PREFERENCE AND NEVER A CONSTRAINT, which D-CRISIS-15
 * requires in those words: a preferred skill whose items the pool has run out of costs a
 * reorder rather than a refused check. INV-CRISIS-9 refuses a short batch and INV-CRISIS-3
 * forbids an unplayable one, so a rule strict enough to exhaust a thin bucket mid-crisis
 * would produce no check at all — and in era nine that would strand a player mid-purse,
 * which is worse than in either crisis before it.
 *
 * **Each bucket keeps its own bag, seeded on its position in the window.** One bag over the
 * flattened window would let a bucket's skills be spent early and leave the bucket unable
 * to honour its later slots, which is the coverage guarantee going out through the same
 * door the mix came in by.
 */
export function intrusionSkillOrder(input: {
  readonly buckets: readonly IntrusionWindowBucket[];
  /** Stable across the checks of ONE encounter, and different between encounters. */
  readonly encounterSeed: number;
  /** 1-based, the count of checks including the one being composed. */
  readonly check: number;
}): readonly string[] {
  const servable = input.buckets.filter((bucket) => bucket.node_ids.length > 0);
  const eligible = intrusionEligibleNodes(input.buckets);
  if (servable.length === 0) {
    return eligible;
  }

  const size = RELAY.questions_per_round;
  const check = requireCheck(input.check);
  const through = check * size;
  const slots = apportion(servable, through);

  // How deep into each bucket's bag this check reaches, so a bag is generated once per
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
  for (const slot of slots.slice((check - 1) * size, through)) {
    const bag = bags[slot.bucket] as readonly string[];
    preferred.push(bag[slot.taken] as string);
  }

  const named = new Set(preferred);
  return [...preferred, ...eligible.filter((nodeId) => !named.has(nodeId))];
}

/* -------------------------------------------------------------------------- */
/* The batch                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * An item a check may draw. Structurally a subset of the item bank's `FrozenItem`, so a
 * caller passes authored items straight in and this module never imports `@cr/item-bank` —
 * the same deliberate decoupling `hard-winter.ts`, `succession-questions.ts`, `era-trial.ts`
 * and `storm-battle.ts` all keep. Which pool an era draws from is a content decision and
 * belongs to the caller.
 *
 * **There is no answer on this type and there is not going to be one** (INV-CRISIS-7:
 * correctness arrives as the authoritative checker's verdict, supplied by the caller).
 *
 * One consequence of that reaches whoever assembles the pool, and era four found it first:
 * **a caller owes a pool of questions its own answer surface can take.** Era two's items
 * include 42 that are widget-scored with no typed answer key at all, and a crisis window
 * containing one would hand §9.4's question panel — an answer field and a solution block —
 * a question it has no control for. **Era nine's window does not reach era two**, and
 * `intrusion-play.test.ts` measures its exposure rather than assuming it: era nine's window
 * is eras 9, 8 and 7, and every authored item behind all three carries a typed key. The
 * filter is applied anyway, and the census is pinned in both directions so the day era
 * nine's pool gains a widget-scored item this is where it is caught.
 */
export interface IntrusionQuestionCandidate {
  readonly item_version_id: string;
  readonly node_id: string;
  readonly prompt: string;
}

/** A drawn question. Carries no answer key: nothing here grades (INV-CRISIS-7). */
export interface IntrusionCheckPrompt {
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

export type IntrusionBatchUnavailableReason = "nothing_mastered" | "pool_too_thin";

export type IntrusionBatchComposition =
  | {
      readonly status: "ready";
      readonly size: number;
      readonly prompts: readonly IntrusionCheckPrompt[];
    }
  | {
      readonly status: "unavailable";
      readonly reason: IntrusionBatchUnavailableReason;
      readonly wanted: number;
      readonly available: number;
      readonly message: string;
    };

export interface ComposeIntrusionBatchOptions {
  /**
   * RNG in [0, 1). REQUIRED, with no fallback, exactly as era one's and era four's
   * composers require one and for the same two reasons: an unseeded draw is the one path in
   * the encounter nobody could replay, and it is the natural place for somebody to reach for
   * a timestamp as a seed. `test/intrusionPropagation.test.ts` sweeps this file for a clock
   * read and can mean it, because there is no unseeded path here at all.
   */
  readonly rng: () => number;
  /**
   * WHICH SKILL EACH SLOT PREFERS, in slot order, followed by the fallbacks.
   * {@link intrusionSkillOrder} computes it.
   *
   * **Required**, for era four's reason: it is where D-CRISIS-14's ruled mix lives, and a
   * default shuffle would draw uniformly across the window and do it silently.
   */
  readonly skill_order: readonly string[];
}

/**
 * Draw one check's questions, or REFUSE. There is no third outcome.
 *
 * **WHY A SHORT DRAW IS REFUSED, and era nine's reason is its own.** A check costs
 * `INTRUSION.budget.diagnostic_cost` out of a purse of `buildings + 1` whatever it asked,
 * so serving two questions would sell the player a cheaper rung of the ladder at the full
 * price: the ladder is indexed by right answers out of `batch_size`, and a two-question
 * check can reach at most the middle rung. `intrusionReducer` refuses the same size at the
 * other end of the wire, so a short check is refused twice and served never.
 *
 * Round-robins the preference order, each node's items shuffled, so a check spreads across
 * skills rather than clustering on one — the shape `selectStormPrompts`,
 * `composeHardWinterBatch` and `composeSuccessionBatch` all use, for the same reason.
 */
export function composeIntrusionBatch(
  buckets: readonly IntrusionWindowBucket[],
  pool: readonly IntrusionQuestionCandidate[],
  options: ComposeIntrusionBatchOptions,
): IntrusionBatchComposition {
  const size = RELAY.questions_per_round;
  const rng = options.rng;
  const eligible = intrusionEligibleNodes(buckets);

  if (eligible.length === 0) {
    return {
      status: "unavailable",
      reason: "nothing_mastered",
      wanted: size,
      available: 0,
      message:
        "The Intrusion draws from era nine's own nodes and the two eras behind it, and " +
        "this learner has finished none of them. There is nothing to ask, so there is " +
        "no crisis to run yet.",
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

  const byNode = new Map<string, IntrusionQuestionCandidate[]>();
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
    shuffleInPlace(byNode.get(nodeId) as IntrusionQuestionCandidate[], rng);
  }

  // The loop terminates on `drewThisPass` and never on the count alone, so a pool that
  // cannot fill the check falls out of it rather than spinning. A draw that can loop over
  // an empty bucket is a HANG, and a hang is the one failure mode a test timeout cannot
  // interrupt: the suite stops instead of failing and reports nothing at all.
  const drawn: IntrusionQuestionCandidate[] = [];
  let drewThisPass = true;
  while (drawn.length < size && drewThisPass) {
    drewThisPass = false;
    for (const nodeId of order) {
      if (drawn.length >= size) {
        break;
      }
      const next = (byNode.get(nodeId) as IntrusionQuestionCandidate[]).pop();
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
        `An Intrusion check asks ${size} distinct questions and the pool can furnish ` +
        `${drawn.length} across ${order.length} node(s) of the window. Serving fewer ` +
        `would not make the check cheaper: it costs the same diagnostic whatever it ` +
        `asked, so a short one sells a cheaper rung of the ladder at the full price.`,
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
 * The seed that is stable across one encounter's checks and different between encounters.
 * Exported so a caller can seed a preview off the same axis rather than inventing one, and
 * it is mixed with the same salt `intrusionBoardFor` and the source draw use, because the
 * board, the source and the questions are three reads of one encounter.
 */
export function intrusionEncounterSeed(encounter: number): number {
  if (!Number.isInteger(encounter) || encounter < 1) {
    throw new Error(
      `An encounter index must be a whole number from 1 (got ${encounter}), because it ` +
        `is the seed the question sequence is derived from.`,
    );
  }
  return mixSeed(encounter, INTRUSION_SEED);
}

/**
 * **DRAW ONE CHECK'S QUESTIONS — the call that makes the Intrusion playable.**
 *
 * Deterministic in `(encounter, check)`, so the third check of the second encounter always
 * asks the same three questions and a retune can be compared against the same play. The
 * whole window is derived here from the era sequence and then narrowed to what the pool can
 * serve, so a caller supplies the item pool and the learner's progress and nothing else.
 *
 * The two seed axes are separate on purpose, following era one's and era four's split. The
 * skill order is seeded on the ENCOUNTER alone, because a rule about the sequence of checks
 * cannot be expressed by a per-check seed; the item drawn inside each skill is seeded per
 * check, so two checks that ask the same skill still ask different questions.
 *
 * **`check` is the index of the check being composed, which is `state.checks_run + 1`.**
 * Era four's equivalent reads `state.cycle` straight off the state; era nine's does not,
 * and the difference is worth a sentence: era four's cycle is incremented by the same event
 * that closes it, so the state already holds the next one, while era nine's `checks_run` is
 * a count of what has been PAID FOR. A caller composing the questions for a check that has
 * not been paid for yet has to say so.
 */
export function intrusionBatchFor(input: {
  readonly era?: EraId;
  /** The nodes this learner has finished. What "finished" means is the caller's rule. */
  readonly mastered: readonly string[];
  readonly pool: readonly IntrusionQuestionCandidate[];
  /** 1-based encounter index, the same one `intrusionBoardFor` deals a board from. */
  readonly encounter: number;
  /** 1-based; `state.checks_run + 1` for the check about to be armed. */
  readonly check: number;
}): IntrusionBatchComposition {
  const encounterSeed = intrusionEncounterSeed(input.encounter);
  const check = requireCheck(input.check);
  const ruled = intrusionWindow({ era: input.era, mastered: input.mastered });
  const buckets = intrusionServableWindow(ruled, input.pool);

  return composeIntrusionBatch(buckets.length > 0 ? buckets : ruled, input.pool, {
    rng: createSeededRng(mixSeed(encounterSeed, check)),
    skill_order: intrusionSkillOrder({
      buckets: buckets.length > 0 ? buckets : ruled,
      encounterSeed,
      check,
    }),
  });
}
