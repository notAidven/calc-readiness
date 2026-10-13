import { describe, expect, it } from "vitest";

import {
  createSuccession,
  parseSuccessionState,
  serializeSuccessionState,
  SUCCESSION,
  type SuccessionActionKind,
  type SuccessionEvent,
  type SuccessionState,
  successionActionOffers,
  successionMeaningfulChoice,
  successionReducer,
  successionThreat,
} from "./succession";

/**
 * The approved civil-war redesign, proved as a finite state graph.
 *
 * These tests intentionally name the replacement contract instead of adapting the old
 * sway/secure/cancel planner. The learner gets one threatened district, two paid actions,
 * and a three-question batch. The rival moves only when that batch resolves.
 */

interface Reachable {
  readonly state: SuccessionState;
  readonly trace: readonly SuccessionEvent[];
}

const BATCH_SIZE = 3;

function stateKey(state: SuccessionState): string {
  /*
   * Batch/action logs are persistence evidence, not transition inputs. Quotient them out so
   * two histories that arrive at the same playable battle are one graph vertex. Every log
   * shape still gets exercised by the save/reload cases through the witness retained here.
   */
  const {
    batch_log: _batchLog,
    action_log: _actionLog,
    last_batch: _lastBatch,
    last_action: _lastAction,
    ...playable
  } = state;
  return JSON.stringify(playable);
}

function validEvents(
  state: SuccessionState,
  fixedCorrect: number | null = null,
): readonly SuccessionEvent[] {
  switch (state.phase) {
    case "ready":
      return [{ type: "start_batch" }];
    case "answering":
      return (fixedCorrect === null ? [0, 1, 2, 3] : [fixedCorrect]).map((correct) => ({
        type: "resolve_batch" as const,
        correct,
        asked: BATCH_SIZE,
      }));
    case "response":
      if (state.proposal !== null) {
        return [{ type: "cancel_proposal" }, { type: "commit_action" }];
      }
      return [
        ...successionActionOffers(state).map((offer) => ({
          type: "propose_action" as const,
          kind: offer.kind,
        })),
        { type: "finish_response" as const },
      ];
    case "settled":
      return [];
  }
}

function enumerate(fixedCorrect: number | null = null): readonly Reachable[] {
  const opened: Reachable = { state: createSuccession(), trace: [] };
  const queue: Reachable[] = [opened];
  const reached = new Map<string, Reachable>([[stateKey(opened.state), opened]]);

  while (queue.length > 0) {
    const current = queue.shift() as Reachable;
    for (const event of validEvents(current.state, fixedCorrect)) {
      const next = successionReducer(current.state, event);
      expect(
        next,
        `valid event was refused after ${JSON.stringify(current.trace)}`,
      ).not.toBe(current.state);
      const reachedNext: Reachable = {
        state: next,
        trace: [...current.trace, event],
      };
      const key = stateKey(next);
      if (!reached.has(key)) {
        reached.set(key, reachedNext);
        queue.push(reachedNext);
      }
    }
  }

  return [...reached.values()];
}

function settledAt(correct: number): readonly SuccessionState[] {
  return enumerate(correct)
    .map(({ state }) => state)
    .filter((state) => state.phase === "settled");
}

function commit(state: SuccessionState, kind: SuccessionActionKind): SuccessionState {
  const proposed = successionReducer(state, { type: "propose_action", kind });
  expect(proposed).not.toBe(state);
  const committed = successionReducer(proposed, { type: "commit_action" });
  expect(committed).not.toBe(proposed);
  return committed;
}

describe("the replacement mechanic", () => {
  it("has one threat, exactly two paid actions, and batches of exactly three", () => {
    expect(SUCCESSION.batch_size).toBe(BATCH_SIZE);
    expect(SUCCESSION.influence_by_correct).toEqual([0, 1, 2, 3]);
    expect(Object.keys(SUCCESSION.actions).sort()).toEqual(["rally", "reopen"]);

    const opened = createSuccession();
    expect(successionThreat(opened)).not.toBeNull();
    expect(
      opened.districts.filter((district) => district.control === "undecided"),
    ).toHaveLength(opened.districts.length);
    expect(opened.districts.every((district) => district.civic_state === "open")).toBe(
      true,
    );
  });

  it("lets only a resolved three-question batch move the rival", () => {
    const opened = createSuccession();
    const threat = successionThreat(opened);
    const answering = successionReducer(opened, { type: "start_batch" });

    expect(answering.batch).toBe(opened.batch);
    expect(answering.districts).toBe(opened.districts);

    const resolved = successionReducer(answering, {
      type: "resolve_batch",
      correct: 2,
      asked: BATCH_SIZE,
    });
    expect(resolved.batch).toBe(opened.batch + 1);
    expect(resolved.influence).toBe(2);
    expect(resolved.last_batch).toMatchObject({
      correct: 2,
      asked: BATCH_SIZE,
      influence_earned: 2,
      rival_claimed: threat?.district_id,
    });
    expect(
      resolved.districts.find((district) => district.id === threat?.district_id),
    ).toMatchObject({ control: "rival", civic_state: "closed" });
  });

  it("closes the civic response after one committed choice", () => {
    const answering = successionReducer(createSuccession(), { type: "start_batch" });
    const response = successionReducer(answering, {
      type: "resolve_batch",
      correct: 3,
      asked: BATCH_SIZE,
    });
    expect(successionMeaningfulChoice(response)).toHaveLength(2);

    const rallied = commit(response, "rally");
    expect(
      successionActionOffers(rallied),
      "one batch currently buys both actions, so the two-button treatment is not a tradeoff",
    ).toEqual([]);
    expect(successionReducer(rallied, { type: "finish_response" })).not.toBe(rallied);
  });
});

describe("the complete state/action graph", () => {
  const graph = enumerate();

  it("is finite, non-empty, and every branch reaches an ending", () => {
    expect(graph.length).toBeGreaterThan(100);
    expect(graph.length).toBeLessThan(20_000);

    const settled = graph.filter(({ state }) => state.phase === "settled");
    expect(settled.length).toBeGreaterThan(10);

    const canReachSettle = new Set(settled.map(({ state }) => stateKey(state)));
    let changed = true;
    while (changed) {
      changed = false;
      for (const { state } of graph) {
        const key = stateKey(state);
        if (canReachSettle.has(key)) {
          continue;
        }
        if (
          validEvents(state).some((event) =>
            canReachSettle.has(stateKey(successionReducer(state, event))),
          )
        ) {
          canReachSettle.add(key);
          changed = true;
        }
      }
    }

    expect(canReachSettle.size).toBe(graph.length);
  }, 30_000);

  it("never labels a dead or forced move as a choice", () => {
    let choices = 0;
    for (const { state, trace } of graph) {
      const choice = successionMeaningfulChoice(state);
      expect(
        choice.length === 0 || choice.length === 2,
        `masquerading choice after ${JSON.stringify(trace)}`,
      ).toBe(true);
      if (choice.length === 0) {
        continue;
      }
      choices += 1;
      expect(new Set(choice.map((offer) => offer.kind))).toEqual(
        new Set<SuccessionActionKind>(["rally", "reopen"]),
      );
    }
    expect(choices).toBeGreaterThan(10);
  });

  it("makes both actions immediately different and useful wherever both are presented", () => {
    let compared = 0;
    for (const { state, trace } of graph) {
      const choice = successionMeaningfulChoice(state);
      if (choice.length !== 2) {
        continue;
      }
      compared += 1;
      const beforeBatch = state.batch;
      const beforeInfluence = state.influence;
      const rally = commit(state, "rally");
      const reopen = commit(state, "reopen");

      expect(rally.batch, `rally advanced the rival after ${JSON.stringify(trace)}`).toBe(
        beforeBatch,
      );
      expect(reopen.batch, `reopen advanced the rival after ${JSON.stringify(trace)}`).toBe(
        beforeBatch,
      );
      expect(rally.influence).toBe(beforeInfluence - SUCCESSION.actions.rally.cost);
      expect(reopen.influence).toBe(beforeInfluence - SUCCESSION.actions.reopen.cost);
      expect(
        rally.districts.filter((district) => district.control === "player").length,
      ).toBeGreaterThan(
        state.districts.filter((district) => district.control === "player").length,
      );
      expect(
        reopen.districts.filter((district) => district.civic_state === "closed").length,
      ).toBeLessThan(
        state.districts.filter((district) => district.civic_state === "closed").length,
      );
      expect(rally.districts).not.toEqual(reopen.districts);
    }
    expect(compared).toBeGreaterThan(10);
  });

  it("keeps proposals inert and commits their exact advertised target and cost", () => {
    let proposals = 0;
    for (const { state } of graph) {
      if (state.phase !== "response" || state.proposal !== null) {
        continue;
      }
      for (const offer of successionActionOffers(state)) {
        proposals += 1;
        const proposed = successionReducer(state, {
          type: "propose_action",
          kind: offer.kind,
        });
        expect(proposed.influence).toBe(state.influence);
        expect(proposed.districts).toBe(state.districts);
        expect(proposed.batch).toBe(state.batch);
        expect(proposed.proposal).toEqual(offer);

        const committed = successionReducer(proposed, { type: "commit_action" });
        expect(committed.influence).toBe(state.influence - offer.cost);
        expect(committed.last_action).toMatchObject({
          kind: offer.kind,
          district_id: offer.district_id,
          cost: offer.cost,
          committed_after_batch: state.batch,
        });
      }
    }
    expect(proposals).toBeGreaterThan(20);
  });
});

describe("accuracy and endings", () => {
  it("lets perfect play reach the unique best ending", () => {
    const perfect = settledAt(3);
    const best = perfect.filter((state) => state.outcome?.verdict === "best");

    expect(perfect.length).toBeGreaterThan(1);
    expect(best.length).toBeGreaterThan(0);
    for (const state of best) {
      expect(state.outcome).toMatchObject({
        player_controlled: 3,
        rival_controlled: 3,
        civic_buildings_open: 3,
        civic_buildings_closed: 3,
        score: 9,
      });
    }
  });

  it("strictly raises the best reachable result at every accuracy rung", () => {
    const rows = [0, 1, 2, 3].map((correct) => {
      const outcomes = settledAt(correct).map((state) => state.outcome);
      expect(outcomes.length, `${correct}/3 reached no ending`).toBeGreaterThan(0);
      return Math.max(...outcomes.map((outcome) => outcome?.score ?? -1));
    });

    expect(rows).toEqual([0, 6, 8, 9]);
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index]).toBeGreaterThan(rows[index - 1] as number);
    }
  });

  it("changes influence only when accuracy changes", () => {
    const opened = createSuccession();
    const answering = successionReducer(opened, { type: "start_batch" });
    const resolved = [0, 1, 2, 3].map((correct) =>
      successionReducer(answering, {
        type: "resolve_batch",
        correct,
        asked: BATCH_SIZE,
      }),
    );

    expect(resolved.map((state) => state.influence)).toEqual([0, 1, 2, 3]);
    expect(
      resolved.map((state) =>
        state.districts.map(({ id, control, civic }) => ({ id, control, civic })),
      ),
    ).toEqual(
      resolved.map(() =>
        resolved[0]?.districts.map(({ id, control, civic }) => ({
          id,
          control,
          civic,
        })),
      ),
    );
  });
});

describe("invalid input and persistence", () => {
  it("banks nothing and causes nothing for every malformed or out-of-phase event", () => {
    const graph = enumerate();
    const malformed: readonly SuccessionEvent[] = [
      { type: "resolve_batch", correct: -1, asked: BATCH_SIZE },
      { type: "resolve_batch", correct: 4, asked: BATCH_SIZE },
      { type: "resolve_batch", correct: 2, asked: 2 },
      { type: "propose_action", kind: "rally" },
      { type: "propose_action", kind: "reopen" },
      { type: "cancel_proposal" },
      { type: "commit_action" },
      { type: "finish_response" },
    ];

    let refusals = 0;
    for (const { state } of graph) {
      for (const event of malformed) {
        const isValid = validEvents(state).some(
          (candidate) => JSON.stringify(candidate) === JSON.stringify(event),
        );
        if (isValid) {
          continue;
        }
        refusals += 1;
        expect(successionReducer(state, event)).toBe(state);
      }
    }
    expect(refusals).toBeGreaterThan(500);
  });

  it("round-trips every reachable battle byte-for-byte through the saved format", () => {
    const graph = enumerate();
    expect(graph.length).toBeGreaterThan(100);
    for (const { state, trace } of graph) {
      const saved = serializeSuccessionState(state);
      expect(
        parseSuccessionState(saved),
        `save/reload changed the battle after ${JSON.stringify(trace)}`,
      ).toEqual(state);
    }
  }, 30_000);

  it("refuses a client-forged or stale saved battle", () => {
    const state = createSuccession();
    const saved = JSON.parse(serializeSuccessionState(state)) as Record<string, unknown>;

    expect(
      parseSuccessionState(JSON.stringify({ ...saved, battle_version: 999 })),
    ).toBeNull();
    expect(
      parseSuccessionState(JSON.stringify({ ...saved, influence: 999_999 })),
    ).toBeNull();
    expect(parseSuccessionState("{not json")).toBeNull();
  });
});
