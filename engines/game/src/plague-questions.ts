import { type EraId, eraAtNumber, eraNumber, getEraOrThrow } from "@cr/skill-graph";

import { createSeededRng, mixSeed } from "./citizens-rng";
import { PLAGUE_ERA, PLAGUE_SEED } from "./plague";
import { PLAGUE } from "./plague-tuning";

/**
 * **THE QUESTIONS ERA SIX'S PLAGUE ASKS** — D-CRISIS-14's three-era window, apportioned over a
 * batch, and the batch is what sizes a closure's duration.
 *
 * Without this the crisis has a state machine and nothing to answer: `plagueReducer` takes
 * `resolve_batch` with a count of right answers and cannot be reached at all until something
 * composes the three questions that count came from. `composeHardWinterBatch` is the model and
 * `composeSuccessionBatch` is the nearer relative; this follows their shape closely, so a
 * reader who knows either finds the same seams — a caller-supplied item pool, a
 * caller-supplied RNG with no fallback, a fail-loud refusal instead of a short batch, and a
 * skill order that can reorder the draw and can never shrink it.
 *
 * Framework-free and clockless, like the rest of era six's engine, and it names no place: a
 * question belongs to a SKILL and to an ERA, and neither of those is a position.
 * `test/plagueTopology.test.ts` sweeps this file for a spatial token and for a clock read,
 * along with every other source that can decide an infection.
 *
 * ## THE ONE WAY THIS DEPARTS FROM ERA FOUR'S COMPOSER, and it is a consequence of era six's
 * cycle unit
 *
 * Era four's cycle IS an answered batch (D-CRISIS-34), so its cycle index and its batch count
 * are the same number. **Era six's cycle is the advance** (§5.1: *"the batched resolution
 * means 'I have finished acting' is a decision"*), and a cycle may hold NO batch at all — a
 * player who lets the day pass without shutting anything answers nothing. So the sequence here
 * is keyed to the CYCLE rather than to how many batches have been answered, which has one
 * visible consequence worth stating: a player who skips a cycle skips that cycle's questions
 * rather than deferring them. That is deliberate. Keying to the batch count would make the
 * question sequence depend on the player's closure decisions, so two players on the same board
 * at the same accuracy could not be compared, and INV-CRISIS-11's replay would need the whole
 * event list rather than `(encounter, cycle)`.
 *
 * Everything else is era four's, including the four departures from era one's composer that
 * era four argued: buckets rather than a flat eligible list, a REQUIRED skill order with no
 * shuffle fallback, no `size` option, and a fail-loud refusal. Era six's reason for the last
 * one is its own and is at `plagueCommit`: a short batch would put the top rung of the hold
 * ladder out of reach rather than rescaling the reward.
 *
 * ## Why the window derivation is a second copy, and how the copies are held together
 *
 * `successionWindow` computes the same collapse over era four's shares. It is not imported,
 * because it reads `SUCCESSION.window` and INV-CRISIS-14 puts every magnitude a crisis reads
 * in that crisis's own table — importing it would make a retune of era four's shares silently
 * retune era six. The duplication is paid for rather than waved at:
 * `plague-questions.test.ts` asserts the two functions agree bucket for bucket over every era
 * of the sequence and over three mastery sets, so the copies cannot drift without a test going
 * red. **If a third crisis needs this, the arithmetic belongs in `mid-era-crisis.ts` beside
 * D-CRISIS-9's trigger**, which is where the other game-level entry rule already lives; two
 * copies with a pinned equivalence is cheaper than moving a shipped crisis's code, and three
 * would not be.
 */

/* -------------------------------------------------------------------------- */
/* The window                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One bucket of D-CRISIS-14's window: an era, its ruled share, and the nodes it can offer.
 *
 * There is no place on this type and there is not going to be one. A bucket is an era and a
 * share; `eras_back` is how far back the era sits in the sequence, which is an ordering over
 * the game's chapters and not a position on any board.
 */
export interface PlagueWindowBucket {
  readonly era: EraId;
  /** How many eras behind the crisis's own era this bucket sits. `0` is the current era. */
  readonly eras_back: number;
  /**
   * D-CRISIS-14's share for this bucket, in percentage points and always a whole number. The
   * shares of a window's buckets sum to 100 whatever the collapse did.
   */
  readonly share: number;
  /**
   * The nodes this bucket can offer, in the era's own authored order.
   *
   * Filtered to what the learner has finished. For the two older buckets that filter is a
   * no-op on any learner who arrived legitimately — §5.15 is explicit that *"every node of a
   * previous era is mastered by construction"* — and it is applied anyway, because a dev seed
   * and a fresh install are states the game routes players into on purpose. An empty bucket is
   * a real answer: the crisis draws from the buckets that can serve rather than refusing a
   * cycle, which is INV-CRISIS-3.
   */
  readonly node_ids: readonly string[];
}

/**
 * **THE WINDOW FOR ERA SIX'S CRISIS, DERIVED FROM THE ERA SEQUENCE RATHER THAN WRITTEN DOWN.**
 *
 * The current era plus `PLAGUE.window.eras_back` behind it, each carrying its ruled share,
 * each filtered to the nodes the learner has finished. For era six that is renaissance,
 * medieval and classical at 40 / 35 / 25, and **era six needs no exception**: all three are
 * real eras with authored node sets, so the collapse never fires for the crisis that ships it.
 *
 * ## The collapse, and why it is a derivation rather than a second table
 *
 * A window that reaches past the start of the game folds the shares it cannot place into the
 * OLDEST era it did reach. That single rule reproduces both of D-CRISIS-14's named exceptions:
 * era two comes out at 40/60 and era one at 100, which are the two figures the ruling writes
 * down. `plague-questions.test.ts` asserts both, which is what turns *"reproduces the
 * exceptions"* into a measurement rather than a claim — and it is a check on the derivation
 * rather than a use of it, because era six's own window needs neither.
 *
 * The alternative considered and declined was renormalising the surviving shares in
 * proportion. It is the obvious move and it contradicts the ruling: era two renormalised is
 * 53/47, and the ruling says 40/60.
 *
 * `mastered` is *"the nodes this learner has finished"* and what finishing means is
 * deliberately the CALLER's rule, exactly as era one's and era four's composers leave it.
 */
/**
 * The window's reach in eras, refusing a table whose reach and share list disagree.
 *
 * **Exported, and taking both numbers rather than reading them, so the refusal is REACHABLE.**
 * Called only with the tuning table's own values this function can never throw, which would
 * make the guard a dead branch with a passing test beside it — and a dead branch is exactly
 * what `.cursor/rules/qa-verification.mdc` warns a green run can be hiding. This pass's
 * injection harness found it: disabling the check changed no assertion's colour. Taking the
 * pair as arguments lets `plague-questions.test.ts` drive it at a mismatch, which is the only
 * way to show the guard has teeth.
 *
 * The defect it refuses is a silent wrong answer rather than a crash: with a reach of three
 * over three shares, the fourth bucket's weight is read off the end of the list and a bucket
 * ships with no share at all.
 */
export function plagueWindowReach(erasBack: number, shares: number): number {
  if (shares !== erasBack + 1) {
    throw new Error(
      `The window reaches ${erasBack} era(s) back and carries ${shares} share(s). One share ` +
        `per era in the window or the apportionment would place a question in a bucket with ` +
        `no weight, or weight a bucket with no questions.`,
    );
  }
  return erasBack;
}

export function plagueWindow(input: {
  readonly era?: EraId;
  readonly mastered: readonly string[];
}): readonly PlagueWindowBucket[] {
  const era = input.era ?? PLAGUE_ERA;
  const shares = PLAGUE.window.shares_percent;
  const reach = plagueWindowReach(PLAGUE.window.eras_back, shares.length);

  // Fails loud on an era the sequence does not have, following `midEraCrisisTrigger`: a
  // crisis silently defaulting to another era's window would draw a whole batch from the
  // wrong chapter and look exactly like a working one.
  const standing = eraNumber(getEraOrThrow(era).id);

  const reached: EraId[] = [];
  for (let back = 0; back <= reach; back += 1) {
    const found = eraAtNumber(standing - back);
    if (found) {
      reached.push(found.id);
    }
  }

  const weights = shares.slice(0, reached.length);
  const unplaced = shares.slice(reached.length).reduce((total, share) => total + share, 0);
  const last = weights.length - 1;
  if (last < 0) {
    throw new Error(
      `Era "${era}" resolves to no era in the window, so its crisis has no questions to ` +
        `draw and nothing would ever be asked.`,
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
export function plagueEligibleNodes(
  buckets: readonly PlagueWindowBucket[],
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
 * three. Era four's composer argues the two candidate mechanisms at length and the argument
 * holds here with one number changed and it is worth restating with era six's number in it:
 *
 *  - **A weighted draw per slot** is what *"sampled"* reads like at first, and it is declined
 *    because era six's encounter is SHORT. The crisis ends in at most one cycle per clean
 *    building, so an encounter on the authored boards is three to twenty-one questions; at the
 *    bottom of that range an independent weighted draw leaves the oldest bucket empty
 *    `0.75^3` of the time, which is more than two crises in five asking nothing at all from
 *    the era the ruling gives a quarter to.
 *  - **Apportionment** is what this does: the next question goes to whichever bucket is
 *    furthest behind its ruled share, so after `n` questions every bucket holds its share of
 *    `n` rounded to a whole question. Deterministic, previewable, and the closest a whole
 *    number of questions can come to the ruled mix at EVERY prefix rather than only in the
 *    limit — which matters more for era six than for era four precisely because era six's
 *    encounters can be very short.
 *
 * The comparison is exact and deliberately so: `share * asked` against `taken * 100` over
 * whole numbers, so a tie is a tie rather than a rounding artefact, and ties go to the earlier
 * bucket — the chapter the player is standing in. `plague-tuning.ts` argues at the shares why
 * they are integers.
 *
 * **A bucket the learner cannot fill is dropped from the apportionment**, which is era four's
 * default and its reasoning: D-CRISIS-14 says nothing about a window whose older era the
 * learner never finished, INV-CRISIS-9 refuses a short batch rather than serving one, and
 * INV-CRISIS-3 forbids an unplayable cycle, so a bucket with no nodes must not be allocated a
 * slot it would then have to hand back.
 */
function apportion(
  buckets: readonly PlagueWindowBucket[],
  through: number,
): readonly QuestionSlot[] {
  const total = buckets.reduce((sum, bucket) => sum + bucket.share, 0);
  const taken = buckets.map(() => 0);
  const slots: QuestionSlot[] = [];

  for (let index = 0; index < through; index += 1) {
    const asked = index + 1;
    let best = 0;
    let bestDeficit = Number.NEGATIVE_INFINITY;
    for (const [slot, bucket] of buckets.entries()) {
      const deficit = bucket.share * asked - (taken[slot] as number) * total;
      if (deficit > bestDeficit) {
        best = slot;
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
  buckets: readonly PlagueWindowBucket[],
): readonly PlagueWindowBucket[] {
  return buckets.filter((bucket) => bucket.node_ids.length > 0);
}

/**
 * WHICH ERA EACH QUESTION OF ONE CYCLE'S BATCH IS DRAWN FROM, in slot order.
 *
 * Exported because it is the only way to read D-CRISIS-14's mix without a pool: a test can
 * assert that the realised share tracks the ruled one at every prefix, and a tuning read-out
 * can print the encounter's mix before anybody authors an item for era six — which nobody has,
 * since era one is still the only era with authored items. Empty when no bucket in the window
 * can serve anything, which is the state `composePlagueBatch` refuses.
 */
export function plagueWindowSlots(input: {
  readonly buckets: readonly PlagueWindowBucket[];
  /** 1-based, the same count `PlagueState.cycle` carries. */
  readonly cycle: number;
}): readonly EraId[] {
  const servable = servableBuckets(input.buckets);
  if (servable.length === 0) {
    return [];
  }
  const size = PLAGUE.cycle.batch_size;
  const cycle = requireCycle(input.cycle);
  const slots = apportion(servable, cycle * size);
  return slots
    .slice((cycle - 1) * size, cycle * size)
    .map((slot) => (servable[slot.bucket] as PlagueWindowBucket).era);
}

function requireCycle(cycle: number): number {
  if (!Number.isInteger(cycle) || cycle < 1) {
    throw new Error(
      `A Plague cycle is a whole number from 1 (got ${cycle}), because the question ` +
        `sequence is derived from it rather than remembered and cycle zero is a day nobody ` +
        `lived through.`,
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
 * A shuffled bag over `items`, long enough to read `length` entries out of, with the boundary
 * swap `createInterleavedScheduler` uses: a bag that would open on the entry the last one
 * closed with hands that slot to another entry, so nothing lands back to back across a bag
 * boundary.
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
 * **THE BATCH'S SKILL ORDER: D-CRISIS-14's buckets crossed with D-CRISIS-15's no-repeat bag.**
 *
 * One node id per slot of this cycle's batch, in slot order, followed by every other eligible
 * node. The tail is what keeps this A PREFERENCE AND NEVER A CONSTRAINT, which D-CRISIS-15
 * requires in those words: a preferred skill whose items the pool has run out of costs a
 * reorder rather than a refused cycle.
 *
 * **Each bucket keeps its own bag, seeded on its place in the window.** One bag over the
 * flattened window would let a bucket's skills be spent early and leave it unable to honour
 * its later slots, which is the coverage guarantee going out through the same door the mix
 * came in by. A bucket's bag is read at the slot the apportionment has already given it, so
 * the two rules compose rather than competing — the mix decides WHICH ERA and the bag decides
 * WHICH SKILL inside it.
 */
export function plagueSkillOrder(input: {
  readonly buckets: readonly PlagueWindowBucket[];
  /** Stable across the cycles of ONE encounter, and different between encounters. */
  readonly encounterSeed: number;
  /** 1-based, the same count `PlagueState.cycle` carries. */
  readonly cycle: number;
}): readonly string[] {
  const servable = servableBuckets(input.buckets);
  const eligible = plagueEligibleNodes(input.buckets);
  if (servable.length === 0) {
    return eligible;
  }

  const size = PLAGUE.cycle.batch_size;
  const cycle = requireCycle(input.cycle);
  const through = cycle * size;
  const slots = apportion(servable, through);

  // How deep into each bucket's bag this cycle reaches, so a bag is generated once per bucket
  // rather than once per question.
  const depth = servable.map(() => 0);
  for (const slot of slots) {
    depth[slot.bucket] = Math.max(depth[slot.bucket] as number, slot.taken + 1);
  }
  const bags = servable.map((bucket, slot) =>
    shuffledBag(
      bucket.node_ids,
      mixSeed(input.encounterSeed, slot + 1),
      depth[slot] as number,
    ),
  );

  const preferred: string[] = [];
  for (const slot of slots.slice((cycle - 1) * size, through)) {
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
 * An item the batch may draw. Structurally a subset of the item bank's `FrozenItem`, so a
 * caller passes authored items straight in and this module never imports the item bank — the
 * same deliberate decoupling `hard-winter.ts`, `succession-questions.ts`, `era-trial.ts` and
 * `storm-battle.ts` keep. Which pool an era draws from is a content decision and belongs to
 * the caller.
 *
 * **There is no answer on this type and there is not going to be one** (INV-CRISIS-7:
 * correctness arrives as the authoritative checker's verdict, supplied by the caller). The
 * consequence era four found reaches era six harder: **a caller owes a pool of questions its
 * own answer surface can take.** Era six's window is renaissance, medieval and classical, and
 * none of the three has an authored item pool at this tip — era one is still the only era that
 * does — so a caller wiring this today supplies the pool and takes responsibility for what is
 * in it.
 */
export interface PlagueQuestionCandidate {
  readonly item_version_id: string;
  readonly node_id: string;
  readonly prompt: string;
}

/** A drawn question. Carries no answer key: nothing here grades (INV-CRISIS-7). */
export interface PlagueBatchPrompt {
  readonly index: number;
  readonly node_id: string;
  readonly item_version_id: string;
  readonly prompt: string;
  /**
   * Which era of the window this question came from.
   *
   * Carried per prompt rather than left for a caller to look up, because it is the only thing
   * that makes the ruled mix visible: §9.4's question panel can say which chapter a question
   * is from, and a measurement can count the realised shares without re-deriving which era
   * owns which node.
   */
  readonly era: EraId;
}

export type PlagueBatchUnavailableReason = "nothing_mastered" | "pool_too_thin";

export type PlagueBatchComposition =
  | {
      readonly status: "ready";
      readonly size: number;
      readonly prompts: readonly PlagueBatchPrompt[];
    }
  | {
      readonly status: "unavailable";
      readonly reason: PlagueBatchUnavailableReason;
      readonly wanted: number;
      readonly available: number;
      readonly message: string;
    };

export interface ComposePlagueBatchOptions {
  /**
   * RNG in [0, 1). REQUIRED, with no fallback, exactly as eras one and four require one and
   * for the same two reasons: an unseeded draw is the one path in the encounter nobody could
   * replay, and it is the natural place for somebody to reach for a timestamp as a seed.
   * `test/plagueTopology.test.ts` sweeps this file for a clock read and can mean it because
   * there is no unseeded path here at all.
   */
  readonly rng: () => number;
  /**
   * WHICH SKILL EACH SLOT PREFERS, in slot order, followed by the fallbacks.
   * `plagueSkillOrder` computes it.
   *
   * **Required, unlike era one's**, because it is where D-CRISIS-14's ruled mix lives. A
   * default shuffle would draw uniformly across the window, which hands era six's own chapter
   * a share the ruling did not give it, and would do it silently.
   */
  readonly skill_order: readonly string[];
}

/**
 * Draw one cycle's batch, or REFUSE. There is no third outcome.
 *
 * **WHY A SHORT DRAW IS REFUSED, and era six's reason is its own.** Era one's tier is a ratio
 * of what was asked, so a two-item batch there would resolve `strong` at two correct and
 * quietly widen every bonfire. Era four's earning ladder is absolute, so what a short batch
 * would do there is make the crisis harder. **Era six's hold ladder has one rung per possible
 * score, so a short batch would put the top rung — the only one that lets closures accumulate
 * — out of reach entirely**, and the crisis would become unwinnable on any board needing three
 * simultaneous closures. `plagueCommit` refuses the same size at the other end of the wire, so
 * a short batch is refused twice and served never.
 *
 * Round-robins the preference order, each node's items shuffled, so a batch spreads across
 * skills rather than clustering on one — the shape `selectStormPrompts`,
 * `composeHardWinterBatch` and `composeSuccessionBatch` all use, for the same reason.
 */
export function composePlagueBatch(
  buckets: readonly PlagueWindowBucket[],
  pool: readonly PlagueQuestionCandidate[],
  options: ComposePlagueBatchOptions,
): PlagueBatchComposition {
  const size = PLAGUE.cycle.batch_size;
  const rng = options.rng;
  const eligible = plagueEligibleNodes(buckets);

  if (eligible.length === 0) {
    return {
      status: "unavailable",
      reason: "nothing_mastered",
      wanted: size,
      available: 0,
      message:
        "The Plague draws from era six's own nodes and the two eras behind it, and this " +
        "learner has finished none of them. There is nothing to ask, so there is no crisis " +
        "to run yet.",
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

  const byNode = new Map<string, PlagueQuestionCandidate[]>();
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

  // The preference order, clipped to the nodes the pool can actually serve. An id in the order
  // that is not in the window is dropped; a node the order does not name is appended. So the
  // order can reorder the draw and can never shrink it.
  const servable = eligible.filter((nodeId) => byNode.has(nodeId));
  const serves = new Set(servable);
  const preferred = options.skill_order.filter((nodeId) => serves.has(nodeId));
  const named = new Set(preferred);
  const order = [...preferred, ...servable.filter((nodeId) => !named.has(nodeId))];
  for (const nodeId of order) {
    shuffleInPlace(byNode.get(nodeId) as PlagueQuestionCandidate[], rng);
  }

  const drawn: PlagueQuestionCandidate[] = [];
  let drewThisPass = true;
  while (drawn.length < size && drewThisPass) {
    drewThisPass = false;
    for (const nodeId of order) {
      if (drawn.length >= size) {
        break;
      }
      const next = (byNode.get(nodeId) as PlagueQuestionCandidate[]).pop();
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
        `A Plague cycle asks ${size} distinct questions and the pool can furnish ` +
        `${drawn.length} across ${order.length} node(s) of the window. Serving fewer would ` +
        `not shorten the cycle, it would put the top rung of the hold ladder out of reach.`,
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
 * The seed that is stable across one encounter's cycles and different between encounters.
 * Exported so a caller can seed a preview off the same axis rather than inventing one.
 */
export function plagueEncounterSeed(encounter: number): number {
  if (!Number.isInteger(encounter) || encounter < 1) {
    throw new Error(
      `An encounter index must be a whole number from 1 (got ${encounter}), because it is ` +
        `the seed the question sequence is derived from.`,
    );
  }
  return mixSeed(encounter, PLAGUE_SEED);
}

/**
 * **DRAW THE BATCH FOR ONE CYCLE — the call that makes the Plague playable.**
 *
 * Deterministic in `(encounter, cycle)`, so cycle three of encounter two always asks the same
 * three questions and a retune can be compared against the same play. The whole window is
 * derived here from the era sequence, so a caller supplies the item pool and the learner's
 * progress and nothing else.
 *
 * The two seed axes are separate on purpose, following era one's split. The skill order is
 * seeded on the ENCOUNTER alone, because a rule about the sequence of cycles cannot be
 * expressed by a per-cycle seed; the item drawn inside each skill is seeded per cycle, so two
 * cycles that ask the same skill still ask different questions.
 */
export function plagueBatchFor(input: {
  readonly era?: EraId;
  /** The nodes this learner has finished. What "finished" means is the caller's rule. */
  readonly mastered: readonly string[];
  readonly pool: readonly PlagueQuestionCandidate[];
  /** 1-based encounter index, the same one the persisted Care House state carries. */
  readonly encounter: number;
  /** 1-based, straight off `PlagueState.cycle`. */
  readonly cycle: number;
}): PlagueBatchComposition {
  const encounterSeed = plagueEncounterSeed(input.encounter);
  const cycle = requireCycle(input.cycle);
  const buckets = plagueWindow({ era: input.era, mastered: input.mastered });

  return composePlagueBatch(buckets, input.pool, {
    rng: createSeededRng(mixSeed(encounterSeed, cycle)),
    skill_order: plagueSkillOrder({ buckets, encounterSeed, cycle }),
  });
}
