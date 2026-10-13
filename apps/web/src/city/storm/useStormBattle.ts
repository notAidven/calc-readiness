import {
  createStormBattle,
  currentStormPrompt,
  gradeStorm,
  isStormBattleComplete,
  recordStormAnswer,
  type StormBattleState,
  type StormPrompt,
  type StormResult,
  stormBattleProgress,
  toStormSubmission,
} from "@cr/game";
import { useCallback, useState } from "react";

/**
 * React controller for a storm-battle round (SCAFFOLD). It drives the three UI
 * phases (entry -> battle -> result) over the pure engine round in `@cr/game`
 * (`storm-battle` + `gradeStorm`). The hook itself performs NO I/O and NO
 * persistence: on completion it only grades locally to DECIDE THE GAME CLEAR
 * (design section 7.3) — the persisted `neighborhood_checkpoint_cleared` write
 * stays server-authoritative via the game-owned `CheckpointWriter`.
 */
export type StormBattlePhase = "entry" | "battle" | "result";

/**
 * Decide whether a typed answer is correct. Injected because real grading is
 * Evan's lane: it runs the authoritative `@cr/components` answer checker (the
 * same one lessons use) against the item's answer key. The scaffold default NEVER
 * fabricates a clear — it returns `false`, so an unwired storm cannot be passed by
 * accident (fail-closed, design section 10).
 */
export type StormAnswerChecker = (prompt: StormPrompt, response: string) => boolean;

const failClosedChecker: StormAnswerChecker = () => false;

export interface UseStormBattleInput {
  readonly neighborhoodId: string;
  readonly prompts: readonly StormPrompt[];
  readonly timerBudgetMs?: number;
  /** Authoritative grading (see `StormAnswerChecker`); defaults to fail-closed. */
  readonly checkAnswer?: StormAnswerChecker;
  /** Clock injection (defaults to `Date.now`), so the soft timer stays testable. */
  readonly now?: () => number;
}

export interface UseStormBattle {
  readonly phase: StormBattlePhase;
  readonly current: StormPrompt | null;
  readonly progress: { readonly answered: number; readonly total: number };
  readonly result: StormResult | null;
  readonly begin: () => void;
  readonly submitAnswer: (response: string) => void;
  readonly retry: () => void;
}

export function useStormBattle(input: UseStormBattleInput): UseStormBattle {
  const { neighborhoodId, prompts, timerBudgetMs } = input;
  const now = input.now ?? Date.now;
  const checkAnswer = input.checkAnswer ?? failClosedChecker;

  const [phase, setPhase] = useState<StormBattlePhase>("entry");
  const [battle, setBattle] = useState<StormBattleState | null>(null);
  const [result, setResult] = useState<StormResult | null>(null);

  const begin = useCallback(() => {
    // Fail-closed: never start a zero-length round (it would be an invalid submission).
    if (prompts.length === 0) {
      return;
    }
    setResult(null);
    setBattle(
      createStormBattle({
        neighborhood_id: neighborhoodId,
        prompts,
        started_at_ms: now(),
        timer_budget_ms: timerBudgetMs,
      }),
    );
    setPhase("battle");
  }, [neighborhoodId, prompts, timerBudgetMs, now]);

  const submitAnswer = useCallback(
    (response: string) => {
      setBattle((prev) => {
        if (!prev) {
          return prev;
        }
        const prompt = currentStormPrompt(prev);
        if (!prompt) {
          return prev;
        }
        const next = recordStormAnswer(prev, checkAnswer(prompt, response));
        if (isStormBattleComplete(next)) {
          setResult(gradeStorm(toStormSubmission(next, now())));
          setPhase("result");
        }
        return next;
      });
    },
    [checkAnswer, now],
  );

  const retry = useCallback(() => {
    setResult(null);
    setBattle(null);
    setPhase("entry");
  }, []);

  const current = battle ? currentStormPrompt(battle) : null;
  const progress = battle
    ? {
        answered: stormBattleProgress(battle).answered,
        total: stormBattleProgress(battle).total,
      }
    : { answered: 0, total: prompts.length };

  return { phase, current, progress, result, begin, submitAnswer, retry };
}
