/**
 * Storm-battle UI scaffold (Evan's lane; opened for his review on his verbal OK).
 *
 * New, self-contained surface under `apps/web/src/city/storm/` — the interactive
 * storm round the current one-click `StormEncounter` stands in for. Nothing here
 * is wired into `CitySurface` yet (that file, plus `citySession.ts`, are in the
 * edit sets of PRs #37 and #31). See the PR body for the wire-in points.
 */

export { StormBattleRound, type StormBattleRoundProps } from "./StormBattleRound";
export { StormBattleScaffold, type StormBattleScaffoldProps } from "./StormBattleScaffold";
export { StormEntryScreen, type StormEntryScreenProps } from "./StormEntryScreen";
export { StormResultScreen, type StormResultScreenProps } from "./StormResultScreen";
export {
  type StormAnswerChecker,
  type StormBattlePhase,
  type UseStormBattle,
  type UseStormBattleInput,
  useStormBattle,
} from "./useStormBattle";
