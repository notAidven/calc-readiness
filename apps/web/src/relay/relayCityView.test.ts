import { createRelay, type RelayState, relayReducer } from "@cr/game";
import { describe, expect, it } from "vitest";

import { relayCityView } from "./relayCityView";

const TARGETS = ["relay", "library", "hall", "market"] as const;

function commit(state: RelayState, action: "cut" | "restore", correct: number): RelayState {
  const armed = relayReducer(state, { type: "arm", action });
  const answering = relayReducer(armed, { type: "start_questions" });
  return relayReducer(answering, { type: "resolve_round", correct, asked: 3 });
}

describe("the Intrusion projected onto the learner's city", () => {
  it("opens on one real building with the rest explicitly unread", () => {
    const view = relayCityView(createRelay(), TARGETS);

    expect(view.activeTargetId).toBe("relay");
    expect(view.targets).toHaveLength(TARGETS.length);
    expect(view.targets.map((target) => target.evidence)).toEqual([
      "current",
      "unread",
      "unread",
      "unread",
    ]);
    expect(view.staleCount).toBe(0);
    expect(view.coveredCount).toBe(0);
  });

  it("keeps a fully covered probe pinned and advances a breached probe one city hop", () => {
    const pinned = relayCityView(commit(createRelay(), "cut", 3), TARGETS);
    expect(pinned.activeTargetId).toBe("relay");
    expect(pinned.coveredCount).toBe(3);
    expect(pinned.staleCount).toBe(0);

    const breached = relayCityView(commit(createRelay(), "cut", 0), TARGETS);
    expect(breached.activeTargetId).toBe("library");
    expect(breached.targets.map((target) => target.evidence)).toEqual([
      "stale",
      "current",
      "unread",
      "unread",
    ]);
    expect(breached.staleCount).toBe(1);
  });

  it("leaves an isolation on the building where it landed when the probe moves", () => {
    const breached = relayCityView(commit(createRelay(), "cut", 1), TARGETS);

    expect(breached.activeTargetId).toBe("library");
    expect(breached.targets[0]).toMatchObject({
      nodeId: "relay",
      cover: "closed",
      coverStrength: 1,
    });
    expect(breached.targets[1]).toMatchObject({
      nodeId: "library",
      active: true,
      cover: "open",
      coverStrength: 0,
    });
  });

  it("maps an armed action and each checked answer to physical preview locks", () => {
    const armed = relayReducer(createRelay(), { type: "arm", action: "cut" });
    const view = relayCityView(armed, TARGETS, {
      answered: 2,
      verdicts: [true, false],
    });

    expect(view.proposal).toBe("cover");
    expect(view.targets.filter((target) => target.cover === "proposed")).toHaveLength(1);
    expect(view.targets[0]).toMatchObject({ cover: "proposed", coverStrength: 0 });
    expect(view.answerLocks).toEqual(["held", "gap", "open"]);
  });

  it("turns a whole ending into containment and a partial ending into a visible scar", () => {
    const whole = commit(commit(commit(createRelay(), "cut", 3), "restore", 3), "cut", 3);
    const partial = commit(commit(commit(createRelay(), "restore", 3), "cut", 3), "cut", 3);

    expect(relayCityView(whole, TARGETS).ending).toBe("contained");
    expect(relayCityView(partial, TARGETS).ending).toBe("scarred");
    expect(relayCityView(partial, TARGETS).darkBands).toBeGreaterThan(0);
  });
});
