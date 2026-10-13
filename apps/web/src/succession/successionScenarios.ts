import {
  createSuccession,
  type SuccessionActionKind,
  type SuccessionState,
  successionActionOffers,
  successionReducer,
} from "@cr/game";

export type SuccessionScenarioId =
  | "announcement"
  | "rally-choice"
  | "reopen-choice"
  | "correct-consequence"
  | "incorrect-consequence"
  | "best-ending"
  | "partial-ending"
  /** Compatibility names used by renderer geometry guards from the replaced mechanic. */
  | "neutral"
  | "warned"
  | "planned"
  | "drifted"
  | "secured"
  | "suspended"
  | "favourable"
  | "mixed"
  | "divided";

export interface SuccessionScenario {
  readonly id: SuccessionScenarioId;
  readonly label: string;
  readonly build: () => SuccessionState;
}

export function closeSuccessionBatch(
  state: SuccessionState,
  correct: number,
): SuccessionState {
  let next = state;
  if (next.phase === "response") {
    next = successionReducer(next, { type: "finish_response" });
  }
  if (next.phase === "ready") {
    next = successionReducer(next, { type: "start_batch" });
  }
  if (next.phase !== "answering") {
    return next;
  }
  return successionReducer(next, { type: "resolve_batch", correct, asked: 3 });
}

export function commitSuccessionAction(
  state: SuccessionState,
  kind: SuccessionActionKind,
): SuccessionState {
  const proposed = successionReducer(state, { type: "propose_action", kind });
  return successionReducer(proposed, { type: "commit_action" });
}

function play(correct: number, policy: "both" | "rally"): SuccessionState {
  let state = createSuccession();
  for (let guard = 0; guard < 8 && state.phase !== "settled"; guard += 1) {
    state = closeSuccessionBatch(state, correct);
    if (state.phase !== "response") {
      continue;
    }
    const order: readonly SuccessionActionKind[] =
      policy === "both" ? ["rally", "reopen"] : ["rally"];
    for (const kind of order) {
      if (successionActionOffers(state).some((offer) => offer.kind === kind)) {
        state = commitSuccessionAction(state, kind);
      }
    }
    state = successionReducer(state, { type: "finish_response" });
  }
  return state;
}

const afterPerfect = (): SuccessionState => closeSuccessionBatch(createSuccession(), 3);

export const SUCCESSION_SCENARIOS: readonly SuccessionScenario[] = [
  { id: "announcement", label: "Announcement", build: createSuccession },
  {
    id: "rally-choice",
    label: "Rally proposed",
    build: () =>
      successionReducer(afterPerfect(), { type: "propose_action", kind: "rally" }),
  },
  {
    id: "reopen-choice",
    label: "Reopen proposed",
    build: () =>
      successionReducer(afterPerfect(), { type: "propose_action", kind: "reopen" }),
  },
  {
    id: "correct-consequence",
    label: "Correct batch consequence",
    build: afterPerfect,
  },
  {
    id: "incorrect-consequence",
    label: "Incorrect batch consequence",
    build: () => closeSuccessionBatch(createSuccession(), 0),
  },
  {
    id: "best-ending",
    label: "Best ending",
    build: () => play(3, "both"),
  },
  {
    id: "partial-ending",
    label: "Partial ending",
    build: () => play(2, "rally"),
  },
  { id: "neutral", label: "Legacy opening", build: createSuccession },
  { id: "warned", label: "Legacy warning", build: createSuccession },
  {
    id: "planned",
    label: "Legacy proposal",
    build: () =>
      successionReducer(afterPerfect(), { type: "propose_action", kind: "rally" }),
  },
  { id: "drifted", label: "Legacy rival action", build: afterPerfect },
  {
    id: "secured",
    label: "Legacy reopened civic",
    build: () => commitSuccessionAction(afterPerfect(), "reopen"),
  },
  {
    id: "suspended",
    label: "Legacy closed civics",
    build: () => play(2, "rally"),
  },
  { id: "favourable", label: "Legacy best ending", build: () => play(3, "both") },
  { id: "mixed", label: "Legacy partial ending", build: () => play(2, "rally") },
  { id: "divided", label: "Legacy divided city", build: () => play(2, "rally") },
];

const BY_ID = new Map(SUCCESSION_SCENARIOS.map((scenario) => [scenario.id, scenario]));

export function successionScenario(id: SuccessionScenarioId): SuccessionScenario {
  const aliases: Readonly<Record<string, SuccessionScenarioId>> = {
    neutral: "announcement",
    warned: "announcement",
    planned: "rally-choice",
    drifted: "correct-consequence",
    secured: "correct-consequence",
    suspended: "incorrect-consequence",
    favourable: "best-ending",
    mixed: "partial-ending",
    divided: "partial-ending",
  };
  const scenario = BY_ID.get(aliases[id] ?? id);
  if (!scenario) {
    throw new Error(`There is no Succession scenario "${id}".`);
  }
  return scenario;
}
