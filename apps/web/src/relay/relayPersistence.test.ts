import { createRelay, relayReducer } from "@cr/game";
import { describe, expect, it } from "vitest";

import { createLocalRelaySession, type RelayStorage } from "./relayPersistence";

function memoryStorage(): RelayStorage & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("versioned Intrusion resume", () => {
  it("restores the authoritative unresolved state without replaying a reducer event", () => {
    const storage = memoryStorage();
    const first = createLocalRelaySession({ storage, userKey: "learner-a" });
    const armed = relayReducer(first.start(), { type: "arm", action: "cut" });
    const interrupted = relayReducer(armed, { type: "start_questions" });
    first.save(interrupted);

    const resumed = createLocalRelaySession({ storage, userKey: "learner-a" }).load();
    expect(resumed).toEqual(interrupted);
    expect(resumed?.rounds).toHaveLength(0);
    expect(resumed?.dark).toBe(createRelay().dark);
  });

  it("namespaces learners and clears a malformed partial state", () => {
    const storage = memoryStorage();
    const one = createLocalRelaySession({ storage, userKey: "one" });
    one.start();
    expect(createLocalRelaySession({ storage, userKey: "two" }).load()).toBeNull();

    storage.setItem(
      one.storageKey,
      JSON.stringify({ version: 1, state: { phase: "answering", dark: -3 } }),
    );
    expect(one.load()).toBeNull();
    expect(storage.values.has(one.storageKey)).toBe(false);
  });
});
