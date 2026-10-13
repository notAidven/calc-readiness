import type { CityStormView, StormPrompt, StormResult } from "@cr/game";
import { type ReactNode, useEffect, useRef } from "react";

import { StormBattleRound } from "./StormBattleRound";
import { StormEntryScreen } from "./StormEntryScreen";
import { StormResultScreen } from "./StormResultScreen";
import { type StormAnswerChecker, useStormBattle } from "./useStormBattle";

export interface StormBattleScaffoldProps {
  readonly storm: CityStormView;
  readonly prompts: readonly StormPrompt[];
  readonly onExit: () => void;
  /** Fired once per graded round (cleared or not) so the host can refresh/persist. */
  readonly onResolved?: (result: StormResult) => void;
  /** Authoritative grading; omit to use the fail-closed scaffold stub. */
  readonly checkAnswer?: StormAnswerChecker;
  readonly timerBudgetMs?: number;
  readonly now?: () => number;
}

/**
 * The storm-battle SCAFFOLD: entry -> battle -> result over the pure engine round
 * (`@cr/game` `storm-battle` + `gradeStorm`). It is intentionally NOT wired into
 * `CitySurface` yet — that file is in the edit sets of PRs #37 and #31, so wiring
 * is left for Evan's reconcile. See the PR body for the documented wire-in points
 * (surface mount, prompt source, answer checker, and the `attemptStorm` seam).
 */
export function StormBattleScaffold(props: StormBattleScaffoldProps): ReactNode {
  const { storm, prompts, onExit, onResolved, checkAnswer, timerBudgetMs, now } = props;

  const battle = useStormBattle({
    neighborhoodId: storm.neighborhood_id,
    prompts,
    timerBudgetMs,
    checkAnswer,
    now,
  });

  const resolvedRef = useRef<StormResult | null>(null);
  useEffect(() => {
    if (battle.result && battle.result !== resolvedRef.current) {
      resolvedRef.current = battle.result;
      onResolved?.(battle.result);
    }
  }, [battle.result, onResolved]);

  if (battle.phase === "result" && battle.result) {
    return (
      <StormResultScreen result={battle.result} onRetry={battle.retry} onExit={onExit} />
    );
  }

  if (battle.phase === "battle" && battle.current) {
    return (
      <StormBattleRound
        prompt={battle.current}
        answered={battle.progress.answered}
        total={battle.progress.total}
        onSubmitAnswer={battle.submitAnswer}
        onExit={onExit}
        gradingWired={checkAnswer !== undefined}
      />
    );
  }

  return (
    <StormEntryScreen
      storm={storm}
      promptCount={prompts.length}
      onBegin={battle.begin}
      onExit={onExit}
    />
  );
}
