import { describe, expect, it } from "vitest";

import {
  createPlague,
  isPlagueState,
  PLAGUE,
  type PlagueAction,
  type PlagueEvent,
  type PlagueState,
  plagueAvailableActions,
  plaguePendingIntervention,
  plagueReducer,
} from "./plague";

const QUESTION_IDS = ["q1", "q2", "q3"] as const;

function answerPaths(): boolean[][] {
  return Array.from({ length: 2 ** (PLAGUE.rounds * PLAGUE.batch_size) }, (_, mask) =>
    Array.from(
      { length: PLAGUE.rounds * PLAGUE.batch_size },
      (__, index) => (mask & (1 << index)) !== 0,
    ),
  );
}

function preferredAction(state: PlagueState, kind: PlagueAction["kind"]): PlagueAction {
  const actions = plagueAvailableActions(state);
  const chosen = actions.find((action) => action.kind === kind) ?? actions[0];
  if (!chosen) {
    throw new Error("A live outbreak offered no containment action.");
  }
  return chosen;
}

function play(strategy: PlagueAction["kind"], answers: readonly boolean[]): PlagueState {
  let state = createPlague();
  let answerIndex = 0;
  while (state.phase !== "ended") {
    if (state.phase === "choosing") {
      state = plagueReducer(state, {
        type: "choose_action",
        action: preferredAction(state, strategy),
        question_ids: QUESTION_IDS.map((id) => `${id}-r${state.round}`),
        expected_revision: state.revision,
      });
      continue;
    }
    if (state.phase === "answering") {
      state = plagueReducer(state, {
        type: "answer",
        question_id: state.question_ids[state.answers.length] as string,
        correct: answers[answerIndex] ?? false,
        expected_revision: state.revision,
      });
      answerIndex += 1;
      continue;
    }
    state = plagueReducer(state, {
      type: "advance",
      expected_revision: state.revision,
    });
  }
  return state;
}

describe("the persisted Plague containment encounter", () => {
  it("reaches a valid ending through every answer path under both intervention strategies", () => {
    const paths = answerPaths();
    expect(paths).toHaveLength(2 ** (PLAGUE.rounds * PLAGUE.batch_size));

    let played = 0;
    for (const strategy of ["quarantine", "care"] as const) {
      for (const answers of paths) {
        const state = play(strategy, answers);
        expect(state.phase, `${strategy}/${answers}`).toBe("ended");
        expect(state.log.length, `${strategy}/${answers}`).toBeGreaterThan(0);
        expect(state.log.length, `${strategy}/${answers}`).toBeLessThanOrEqual(
          PLAGUE.rounds,
        );
        expect(isPlagueState(state), `${strategy}/${answers}`).toBe(true);
        expect(state.outcome?.affected).toBeGreaterThanOrEqual(1);
        played += 1;
      }
    }
    expect(played).toBe(1024);
  });

  it("keeps accuracy as intervention magnitude, never permission", () => {
    for (let correct = 0; correct <= PLAGUE.batch_size; correct += 1) {
      let state = createPlague();
      state = plagueReducer(state, {
        type: "choose_action",
        action: { kind: "quarantine", route_id: "market-care" },
        question_ids: QUESTION_IDS,
        expected_revision: state.revision,
      });
      for (let index = 0; index < PLAGUE.batch_size; index += 1) {
        state = plagueReducer(state, {
          type: "answer",
          question_id: state.question_ids[state.answers.length] as string,
          correct: index < correct,
          expected_revision: state.revision,
        });
      }
      expect(state.phase).toBe("resolved");
      expect(plaguePendingIntervention(state)?.strength).toBe(Math.max(1, correct));
    }
  });

  it("returns the same state for malformed, stale, unavailable, or out-of-phase input", () => {
    const opened = createPlague();
    const invalid: readonly PlagueEvent[] = [
      {
        type: "choose_action",
        action: { kind: "quarantine", route_id: "care-guildhall" },
        question_ids: QUESTION_IDS,
        expected_revision: opened.revision,
      },
      {
        type: "choose_action",
        action: { kind: "care", node_id: "market" },
        question_ids: QUESTION_IDS,
        expected_revision: opened.revision,
      },
      {
        type: "choose_action",
        action: { kind: "care", node_id: "care-house" },
        question_ids: ["only-one"],
        expected_revision: opened.revision,
      },
      {
        type: "answer",
        question_id: "q1",
        correct: true,
        expected_revision: opened.revision,
      },
      {
        type: "advance",
        expected_revision: opened.revision,
      },
      {
        type: "restart",
        expected_revision: opened.revision + 1,
      },
    ];
    for (const event of invalid) {
      expect(plagueReducer(opened, event), JSON.stringify(event)).toBe(opened);
    }

    const answering = plagueReducer(opened, {
      type: "choose_action",
      action: { kind: "care", node_id: "care-house" },
      question_ids: QUESTION_IDS,
      expected_revision: opened.revision,
    });
    expect(
      plagueReducer(answering, {
        type: "answer",
        question_id: "not-current",
        correct: true,
        expected_revision: answering.revision,
      }),
    ).toBe(answering);
  });

  it("round-trips an in-progress graph state exactly", () => {
    let state = createPlague();
    state = plagueReducer(state, {
      type: "choose_action",
      action: { kind: "quarantine", route_id: "market-care" },
      question_ids: QUESTION_IDS,
      expected_revision: state.revision,
    });
    state = plagueReducer(state, {
      type: "answer",
      question_id: "q1",
      correct: true,
      expected_revision: state.revision,
    });
    state = plagueReducer(state, {
      type: "answer",
      question_id: "q2",
      correct: false,
      expected_revision: state.revision,
    });

    const reloaded: unknown = JSON.parse(JSON.stringify(state));
    expect(isPlagueState(reloaded)).toBe(true);
    expect(reloaded).toEqual(state);
  });
});
