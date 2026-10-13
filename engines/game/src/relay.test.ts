import { describe, expect, it } from "vitest";

import {
  createRelay,
  isRelayState,
  type RelayAction,
  type RelayState,
  relayActionRefusal,
  relayReducer,
} from "./relay";
import { RELAY } from "./relay-tuning";

function commit(state: RelayState, action: RelayAction, correct: number): RelayState {
  const armed = relayReducer(state, { type: "arm", action });
  const answering = relayReducer(armed, { type: "start_questions" });
  return relayReducer(answering, {
    type: "resolve_round",
    correct,
    asked: RELAY.questions_per_round,
  });
}

describe("approved P2+reopen-all relay arithmetic", () => {
  it("Restore resolves with current shutter protection, then reopens all shutters", () => {
    const afterCut = commit(createRelay(), "cut", 2);
    expect(afterCut.dark).toBe(5);
    expect(afterCut.shutters_closed).toBe(2);
    expect(afterCut.isolations).toEqual([{ probe_index: 0, strength: 2 }]);

    const restored = commit(afterCut, "restore", 2);
    expect(restored.rounds.at(-1)).toMatchObject({
      action: "restore",
      dark_before: 5,
      shutters_before: 2,
      bands_written: 3,
      bands_through: 1,
      dark_after: 3,
      shutters_after: 0,
    });
    expect(restored.copy).toBe("spent");
    expect(restored.shutters_closed).toBe(0);
    expect(restored.isolations).toEqual([]);
  });

  it("exhaustively enumerates all 256 legal state/action paths for P2+reopen-all", () => {
    const endings = new Map<number, number>();
    const readyDecisions = new Set<string>();
    let paths = 0;

    function walk(state: RelayState): void {
      expect(state.dark).toBeGreaterThanOrEqual(0);
      expect(state.dark).toBeLessThanOrEqual(RELAY.bands);
      if (state.phase === "settled") {
        paths += 1;
        endings.set(state.dark, (endings.get(state.dark) ?? 0) + 1);
        return;
      }

      if (state.copy === "ready") {
        readyDecisions.add(`${state.round}|${state.dark}|${state.shutters_closed}`);
        expect(relayActionRefusal(state, "cut")).toBeNull();
        expect(relayActionRefusal(state, "restore")).toBeNull();
      }

      for (let correct = 0; correct <= RELAY.questions_per_round; correct += 1) {
        walk(commit(state, "cut", correct));
        if (state.copy === "ready") {
          walk(commit(state, "restore", correct));
        }
      }
    }

    walk(createRelay());

    expect(paths).toBe(256);
    expect(readyDecisions.size).toBe(15);
    expect([...endings.entries()].sort(([a], [b]) => a - b)).toEqual([
      [0, 5],
      [1, 9],
      [2, 13],
      [3, 21],
      [4, 38],
      [5, 36],
      [6, 36],
      [7, 30],
      [8, 25],
      [9, 43],
    ]);
  });

  it("lets perfect play reach the best ending through consequential Cut-Restore-Cut rounds", () => {
    const first = commit(createRelay(), "cut", 3);
    expect(first).toMatchObject({ dark: 4, shutters_closed: 3, round: 2 });

    const second = commit(first, "restore", 3);
    expect(second).toMatchObject({
      dark: 0,
      shutters_closed: 0,
      copy: "spent",
      round: 3,
    });

    const third = commit(second, "cut", 3);
    expect(third.phase).toBe("settled");
    expect(third.outcome).toMatchObject({
      dark: 0,
      verdict: "whole",
      writes_mastery: false,
      gates_progression: false,
    });
    expect(third.rounds.map((round) => round.action)).toEqual(["cut", "restore", "cut"]);
  });

  it("bounds the crisis at exactly three rounds even when every band is overwritten", () => {
    let state = createRelay();
    state = commit(state, "cut", 0);
    state = commit(state, "cut", 0);
    expect(state.dark).toBe(RELAY.bands);
    expect(state.phase).toBe("deciding");
    state = commit(state, "cut", 0);
    expect(state.phase).toBe("settled");
    expect(state.rounds).toHaveLength(3);
  });

  it("makes a wrong answer immediately visible without preventing either declared action", () => {
    const cut = commit(createRelay(), "cut", 0);
    expect(cut.rounds[0]).toMatchObject({
      bands_through: 3,
      bands_written: 0,
      dark_after: 7,
    });

    const restore = commit(createRelay(), "restore", 0);
    expect(restore.rounds[0]).toMatchObject({
      bands_through: 3,
      bands_written: 1,
      dark_after: 6,
    });
  });

  it("moves the city probe and ages evidence exactly when the counterfeit feed gets through", () => {
    const opening = createRelay();
    expect(opening).toMatchObject({ probe_index: 0, evidence_epoch: 0 });

    const pinned = commit(opening, "cut", 3);
    expect(pinned).toMatchObject({ probe_index: 0, evidence_epoch: 0 });
    expect(pinned.rounds[0]).toMatchObject({
      probe_before: 0,
      probe_after: 0,
      evidence_epoch_before: 0,
      evidence_epoch_after: 0,
      bands_through: 0,
    });

    const breached = commit(createRelay(), "cut", 0);
    expect(breached).toMatchObject({ probe_index: 1, evidence_epoch: 1 });
    expect(breached.rounds[0]).toMatchObject({
      probe_before: 0,
      probe_after: 1,
      evidence_epoch_before: 0,
      evidence_epoch_after: 1,
      bands_through: 3,
    });

    const partlyClosed = commit(createRelay(), "cut", 1);
    expect(partlyClosed).toMatchObject({ probe_index: 1, evidence_epoch: 1 });
    expect(partlyClosed.isolations).toEqual([{ probe_index: 0, strength: 1 }]);

    const breachedAgain = commit(breached, "restore", 2);
    expect(breachedAgain).toMatchObject({ probe_index: 2, evidence_epoch: 2 });
    expect(breachedAgain.rounds.at(-1)).toMatchObject({
      probe_before: 1,
      probe_after: 2,
      evidence_epoch_before: 1,
      evidence_epoch_after: 2,
      bands_through: 3,
    });
  });

  it("keeps unreadable input inert by identity", () => {
    const armed = relayReducer(createRelay(), { type: "arm", action: "restore" });
    const answering = relayReducer(armed, { type: "start_questions" });
    const unreadable = relayReducer(answering, {
      type: "resolve_round",
      correct: null,
      asked: RELAY.questions_per_round,
    });
    expect(unreadable).toBe(answering);
    expect(unreadable.copy).toBe("ready");
    expect(unreadable.rounds).toHaveLength(0);
  });

  it("spends the copy exactly once and refuses a second Restore by identity", () => {
    const spent = commit(createRelay(), "restore", 2);
    expect(relayActionRefusal(spent, "restore")).toContain("round 1");
    const refused = relayReducer(spent, { type: "arm", action: "restore" });
    expect(refused).toBe(spent);
    expect(relayActionRefusal(spent, "cut")).toBeNull();
  });

  it("throws on a short round and on an impossible score", () => {
    const answering = relayReducer(
      relayReducer(createRelay(), { type: "arm", action: "cut" }),
      { type: "start_questions" },
    );
    expect(() =>
      relayReducer(answering, { type: "resolve_round", correct: 2, asked: 2 }),
    ).toThrow(/three questions/i);
    expect(() =>
      relayReducer(answering, { type: "resolve_round", correct: 4, asked: 3 }),
    ).toThrow(/cannot score/i);
  });

  it("returns the same object for every out-of-phase event", () => {
    const state = createRelay();
    expect(relayReducer(state, { type: "disarm" })).toBe(state);
    expect(relayReducer(state, { type: "start_questions" })).toBe(state);
    expect(relayReducer(state, { type: "resolve_round", correct: 3, asked: 3 })).toBe(
      state,
    );
  });

  it("validates complete serializable states and refuses a partial answering snapshot", () => {
    expect(isRelayState(createRelay())).toBe(true);
    expect(
      isRelayState({
        ...createRelay(),
        phase: "answering",
        armed: null,
      }),
    ).toBe(false);
    expect(isRelayState({ phase: "deciding", dark: 4 })).toBe(false);
  });
});
