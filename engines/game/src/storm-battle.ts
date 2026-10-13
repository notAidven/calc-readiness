import {
  DEFAULT_STORM_ITEM_COUNT,
  DEFAULT_STORM_TIMER_BUDGET_MS,
  type StormSubmission,
} from "./storm";

/**
 * The storm BATTLE round — the interactive layer on top of the pure storm state
 * machine (`storm.ts`), still pure and framework-free.
 *
 * `storm.ts` already owns the storm *lifecycle*: unlock gating
 * (`isStormUnlocked`), grading (`gradeStorm`), and the ready -> in_progress ->
 * cleared/failed reducer (`stormReducer`). What it does NOT model is the round the
 * student actually plays: which mixed-retention prompts are drawn, in what order,
 * and how their answers accumulate into the `StormSubmission` that `gradeStorm`
 * consumes. This module is that missing middle.
 *
 * SCAFFOLD STATUS: the shapes and the pure transitions are here, but the real
 * prompt CONTENT and the real answer CHECKING are deliberately left as injection
 * points (see the TODOs). Both belong to Evan's game lane and depend on the
 * authored item bank (`@cr/item-bank`) and the authoritative answer checker
 * (`@cr/components`), so this pure module does not hard-couple to either.
 *
 * Invariants carried from the design (D1 slice spec section 7, Mastery_Scoring
 * section 5): the storm is a retention SAMPLE, not per-node coverage; it is NEVER
 * a mastery-evidence source. Nothing here calls `submitAssessmentEvidence`, reads
 * or writes `mastery`/`placement_estimate`, or fabricates a clear — a clear is
 * decided only by `gradeStorm` over real recorded answers.
 */

/**
 * A candidate prompt the storm may draw. Structurally a subset of the item
 * bank's `ItemPackEntry`/`FrozenItem`, so a caller can pass authored items (e.g.
 * `D1_ITEM_PACK` filtered to mastered nodes) directly without this pure module
 * importing the item-bank package.
 */
export interface StormPromptCandidate {
  readonly item_version_id: string;
  readonly node_id: string;
  readonly prompt: string;
}

/**
 * A prompt selected into a storm round. Deliberately carries NO answer key: the
 * scaffold never grades client-side against a bundled key; correctness comes from
 * the authoritative checker at answer time.
 */
export interface StormPrompt {
  readonly item_version_id: string;
  readonly node_id: string;
  readonly prompt: string;
}

export interface SelectStormPromptsOptions {
  /** The nodes eligible to be sampled — the neighborhood's mastered nodes. */
  readonly masteredNodeIds: readonly string[];
  /** Round size (default `DEFAULT_STORM_ITEM_COUNT` = 5); the 80% clear rule is fixed. */
  readonly itemCount?: number;
  /** Deterministic RNG in [0, 1) (defaults to `Math.random`); inject for tests. */
  readonly rng?: () => number;
}

/** In-place Fisher-Yates using the supplied RNG (`rng() in [0, 1)`). */
function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
}

/**
 * Draw a short, mixed-retention set of prompts sampled ACROSS the mastered nodes
 * (design section 7.2). Deterministic given `rng`. Balanced: it round-robins the
 * mastered nodes (in the given order) drawing one unused prompt per node per
 * pass, so the sample spreads across skills rather than clustering on one. Returns
 * up to `itemCount`, or fewer if the eligible pool is thin (the UI decides how to
 * treat a short draw; it must not start a zero-length round).
 *
 * TODO(evan): this is a uniform spread. The real storm should weight by retention
 * (recency / prior slips) and honor a difficulty mix, and should draw from the
 * authored bank pools rather than an arbitrary candidate list. Decide, too,
 * whether every mastered node must appear at least once when itemCount < nodes.
 */
export function selectStormPrompts(
  pool: readonly StormPromptCandidate[],
  options: SelectStormPromptsOptions,
): StormPrompt[] {
  const itemCount = options.itemCount ?? DEFAULT_STORM_ITEM_COUNT;
  const rng = options.rng ?? Math.random;
  const mastered = new Set(options.masteredNodeIds);

  const byNode = new Map<string, StormPromptCandidate[]>();
  for (const candidate of pool) {
    if (!mastered.has(candidate.node_id)) {
      continue;
    }
    const group = byNode.get(candidate.node_id);
    if (group) {
      group.push(candidate);
    } else {
      byNode.set(candidate.node_id, [candidate]);
    }
  }

  // Stable node order (the mastered order the caller supplied), each group shuffled.
  const nodeOrder = options.masteredNodeIds.filter((id) => byNode.has(id));
  for (const id of nodeOrder) {
    shuffleInPlace(byNode.get(id) as StormPromptCandidate[], rng);
  }

  const selected: StormPrompt[] = [];
  let drewThisPass = true;
  while (selected.length < itemCount && drewThisPass) {
    drewThisPass = false;
    for (const id of nodeOrder) {
      if (selected.length >= itemCount) {
        break;
      }
      const next = (byNode.get(id) as StormPromptCandidate[]).pop();
      if (next) {
        drewThisPass = true;
        selected.push({
          item_version_id: next.item_version_id,
          node_id: next.node_id,
          prompt: next.prompt,
        });
      }
    }
  }

  return selected;
}

/**
 * One recorded answer. `correct` is the authoritative checker's verdict, supplied
 * by the caller — the scaffold never infers it (fail-closed, design section 10).
 */
export interface StormAnswer {
  readonly item_version_id: string;
  readonly correct: boolean;
}

/**
 * The in-progress battle round (pure data). Time is carried as data
 * (`started_at_ms`), never read from a clock inside this module.
 */
export interface StormBattleState {
  readonly neighborhood_id: string;
  readonly prompts: readonly StormPrompt[];
  readonly answers: readonly StormAnswer[];
  /** Index of the prompt awaiting an answer (equals `answers.length` until done). */
  readonly cursor: number;
  readonly started_at_ms: number;
  /** Soft-timer budget; drives the bonus only, never pass/fail (design section 7.4). */
  readonly timer_budget_ms: number;
}

export interface CreateStormBattleInput {
  readonly neighborhood_id: string;
  readonly prompts: readonly StormPrompt[];
  readonly started_at_ms: number;
  readonly timer_budget_ms?: number;
}

export function createStormBattle(input: CreateStormBattleInput): StormBattleState {
  return {
    neighborhood_id: input.neighborhood_id,
    prompts: input.prompts,
    answers: [],
    cursor: 0,
    started_at_ms: input.started_at_ms,
    timer_budget_ms: input.timer_budget_ms ?? DEFAULT_STORM_TIMER_BUDGET_MS,
  };
}

/** The prompt currently awaiting an answer, or `null` once the round is done. */
export function currentStormPrompt(state: StormBattleState): StormPrompt | null {
  return state.prompts[state.cursor] ?? null;
}

/**
 * Record the verdict for the current prompt and advance the cursor. A verdict
 * past the end is ignored (idempotent tail). `correct` MUST come from the
 * authoritative checker.
 */
export function recordStormAnswer(
  state: StormBattleState,
  correct: boolean,
): StormBattleState {
  const prompt = state.prompts[state.cursor];
  if (!prompt) {
    return state;
  }
  return {
    ...state,
    answers: [...state.answers, { item_version_id: prompt.item_version_id, correct }],
    cursor: state.cursor + 1,
  };
}

/** True once every prompt has been answered (a non-empty round is finished). */
export function isStormBattleComplete(state: StormBattleState): boolean {
  return state.prompts.length > 0 && state.cursor >= state.prompts.length;
}

export interface StormBattleProgress {
  readonly answered: number;
  readonly total: number;
  readonly correct: number;
}

export function stormBattleProgress(state: StormBattleState): StormBattleProgress {
  return {
    answered: state.answers.length,
    total: state.prompts.length,
    correct: state.answers.filter((answer) => answer.correct).length,
  };
}

/**
 * Fold the finished round into the `StormSubmission` that `gradeStorm` consumes.
 * `nowMs` is passed in (time as data). Remaining time clamps at 0 — an expired
 * timer forfeits the speed bonus but never fails the storm (design section 7.4).
 * This does NOT grade; it only shapes the submission, keeping grading in the one
 * place (`gradeStorm`).
 */
export function toStormSubmission(state: StormBattleState, nowMs: number): StormSubmission {
  const elapsed = Math.max(0, nowMs - state.started_at_ms);
  const timeRemaining = Math.max(0, state.timer_budget_ms - elapsed);
  return {
    neighborhood_id: state.neighborhood_id,
    item_count: state.prompts.length,
    correct_count: state.answers.filter((answer) => answer.correct).length,
    time_remaining_ms: timeRemaining,
  };
}
