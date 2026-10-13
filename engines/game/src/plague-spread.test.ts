import { describe, expect, it } from "vitest";

import {
  createPlague,
  PLAGUE,
  PLAGUE_GRAPH,
  type PlagueAction,
  type PlagueState,
  plagueAvailableActions,
  plagueDamage,
  plagueNodeViews,
  plaguePendingIntervention,
  plagueReducer,
  plagueRouteViews,
} from "./plague";

const QUESTIONS = ["q1", "q2", "q3"] as const;

function choose(state: PlagueState, action: PlagueAction): PlagueState {
  return plagueReducer(state, {
    type: "choose_action",
    action,
    question_ids: QUESTIONS,
    expected_revision: state.revision,
  });
}

function answer(state: PlagueState, correct: boolean): PlagueState {
  return plagueReducer(state, {
    type: "answer",
    question_id: state.question_ids[state.answers.length] as string,
    correct,
    expected_revision: state.revision,
  });
}

function finishBatch(state: PlagueState, correct: number): PlagueState {
  let next = state;
  for (let index = 0; index < PLAGUE.batch_size; index += 1) {
    next = answer(next, index < correct);
  }
  return next;
}

function advance(state: PlagueState): PlagueState {
  return plagueReducer(state, {
    type: "advance",
    expected_revision: state.revision,
  });
}

describe("the Plague moves through a bounded live-city network", () => {
  it("opens with one infected place, two exposed neighbours, and a complete authored graph", () => {
    const state = createPlague();
    const nodes = plagueNodeViews(state);
    const routes = plagueRouteViews(state);

    expect(PLAGUE_GRAPH.nodes).toHaveLength(5);
    expect(PLAGUE_GRAPH.routes).toHaveLength(5);
    expect(
      nodes.filter((node) => node.status === "infected").map((node) => node.id),
    ).toEqual(["market"]);
    expect(
      nodes.filter((node) => node.status === "exposed").map((node) => node.id),
    ).toEqual(["care-house", "printworks"]);
    expect(routes.filter((route) => route.at_risk).map((route) => route.id)).toEqual([
      "market-care",
      "market-printworks",
    ]);

    const actions = plagueAvailableActions(state);
    expect(actions.filter((action) => action.kind === "quarantine")).toHaveLength(2);
    expect(actions.filter((action) => action.kind === "care")).toHaveLength(2);
  });

  it("turns each answer into a countable pending mark, then commits a physical intervention", () => {
    let state = choose(createPlague(), {
      kind: "quarantine",
      route_id: "market-care",
    });
    expect(plaguePendingIntervention(state)).toMatchObject({
      kind: "quarantine",
      target_id: "market-care",
      answered: 0,
      correct: 0,
      strength: 1,
      committed: false,
    });

    state = answer(state, true);
    expect(plaguePendingIntervention(state)).toMatchObject({
      answered: 1,
      correct: 1,
      strength: 1,
      committed: false,
    });
    state = answer(state, false);
    expect(plaguePendingIntervention(state)).toMatchObject({
      answered: 2,
      correct: 1,
      strength: 1,
      committed: false,
    });
    state = answer(state, true);
    expect(state.phase).toBe("resolved");
    expect(plaguePendingIntervention(state)).toMatchObject({
      answered: 3,
      correct: 2,
      strength: 2,
      committed: true,
    });
    expect(
      plagueRouteViews(state).find((route) => route.id === "market-care"),
    ).toMatchObject({
      status: "quarantined",
      quarantine_rounds: 2,
    });
    expect(plagueNodeViews(state).find((node) => node.id === "printworks")?.status).toBe(
      "exposed",
    );
  });

  it("keeps spread batched behind the explicit night advance", () => {
    const resolved = finishBatch(
      choose(createPlague(), {
        kind: "quarantine",
        route_id: "market-care",
      }),
      1,
    );
    expect(resolved.phase).toBe("resolved");
    expect(plagueNodeViews(resolved).find((node) => node.id === "printworks")?.status).toBe(
      "exposed",
    );
    expect(resolved.log).toEqual([]);

    const next = advance(resolved);
    expect(next.phase).toBe("choosing");
    expect(next.round).toBe(2);
    expect(plagueNodeViews(next).find((node) => node.id === "printworks")?.status).toBe(
      "infected",
    );
    expect(next.log[0]).toMatchObject({
      spread_route_ids: ["market-printworks"],
      newly_infected: ["printworks"],
      protected_node_ids: [],
      expired_route_ids: ["market-care"],
    });
  });

  it("makes care visibly absorb the crossing instead of hiding a patient counter", () => {
    const resolved = finishBatch(
      choose(createPlague(), {
        kind: "care",
        node_id: "care-house",
      }),
      3,
    );
    expect(
      plagueNodeViews(resolved).find((node) => node.id === "care-house"),
    ).toMatchObject({
      status: "cared",
      care_strength: 3,
    });

    const next = advance(resolved);
    expect(plagueNodeViews(next).find((node) => node.id === "care-house")).toMatchObject({
      status: "cared",
      care_strength: 2,
    });
    expect(next.log[0]).toMatchObject({
      spread_route_ids: [],
      newly_infected: [],
      protected_node_ids: ["care-house"],
    });
  });

  it("reaches a decisive contained ending through strong, spatially correct closures", () => {
    let state = finishBatch(
      choose(createPlague(), {
        kind: "quarantine",
        route_id: "market-care",
      }),
      3,
    );
    state = advance(state);
    expect(state.round).toBe(2);
    expect(state.phase).toBe("choosing");

    state = finishBatch(
      choose(state, {
        kind: "quarantine",
        route_id: "printworks-chapel",
      }),
      3,
    );
    state = advance(state);

    expect(state.phase).toBe("ended");
    expect(state.outcome).toMatchObject({
      verdict: "contained",
      affected: 2,
      clear: 3,
      leaves_a_trace: false,
      writes_mastery: false,
      gates_progression: false,
    });
    expect(plagueRouteViews(state).filter((route) => route.at_risk)).toEqual([]);
    expect(plagueDamage(state)).toEqual({
      buildings: [],
      cells: [],
      suspended_civic: [],
    });
  });

  it("ends in a clear loss when the final round leaves live infection routes", () => {
    let state = finishBatch(
      choose(createPlague(), {
        kind: "quarantine",
        route_id: "market-care",
      }),
      0,
    );
    state = advance(state);
    state = finishBatch(
      choose(state, {
        kind: "quarantine",
        route_id: "printworks-chapel",
      }),
      0,
    );
    state = advance(state);
    expect(state.phase).toBe("choosing");
    expect(state.round).toBe(3);

    state = finishBatch(
      choose(state, {
        kind: "care",
        node_id: "chapel",
      }),
      0,
    );
    state = advance(state);

    expect(state.phase).toBe("ended");
    expect(state.outcome?.verdict).toBe("lost");
    expect(state.outcome?.leaves_a_trace).toBe(false);
    expect(plagueRouteViews(state).filter((route) => route.at_risk).length).toBeGreaterThan(
      0,
    );
    expect(plagueDamage(state)).toEqual({
      buildings: [],
      cells: [],
      suspended_civic: [],
    });
  });
});
