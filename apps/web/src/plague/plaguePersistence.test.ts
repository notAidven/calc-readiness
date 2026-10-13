import { createPlague, plagueReducer } from "@cr/game";
import { describe, expect, it, vi } from "vitest";

import {
  createApiPlagueSession,
  createLocalPlagueSession,
  type PlagueStorage,
} from "./plaguePersistence";

function memoryStorage(): PlagueStorage & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("browser-local Care House persistence", () => {
  it("resumes the exact mid-batch state under the same demo identity", async () => {
    const storage = memoryStorage();
    const first = createLocalPlagueSession({ storage, userKey: "learner-a" });
    let state = await first.start();
    state = await first.dispatch({
      type: "choose_action",
      action: { kind: "care", node_id: "care-house" },
      question_ids: ["a", "b", "c"],
      expected_revision: state.revision,
    });
    state = await first.dispatch({
      type: "answer",
      question_id: "a",
      correct: true,
      expected_revision: state.revision,
    });
    state = await first.dispatch({
      type: "answer",
      question_id: "b",
      correct: false,
      expected_revision: state.revision,
    });

    const reloaded = createLocalPlagueSession({ storage, userKey: "learner-a" });
    expect(await reloaded.load()).toEqual(state);
  });

  it("namespaces identities and discards an invalid payload instead of half-loading it", async () => {
    const storage = memoryStorage();
    const one = createLocalPlagueSession({ storage, userKey: "one" });
    await one.start();
    expect(await createLocalPlagueSession({ storage, userKey: "two" }).load()).toBeNull();

    storage.setItem(
      one.storageKey,
      JSON.stringify({ version: 1, state: { patients: -2 } }),
    );
    expect(await one.load()).toBeNull();
    expect(storage.values.has(one.storageKey)).toBe(false);
  });
});

describe("signed-in Care House persistence", () => {
  it("uses the server-returned state as authority instead of replaying the event in the client", async () => {
    const opened = createPlague();
    const locallyExpected = plagueReducer(opened, {
      type: "choose_action",
      action: { kind: "care", node_id: "care-house" },
      question_ids: ["a", "b", "c"],
      expected_revision: opened.revision,
    });
    const serverState = {
      ...locallyExpected,
      nodes: locallyExpected.nodes.map((node) =>
        node.id === "guildhall" ? { ...node, care_strength: 2 } : node,
      ),
    };
    const fetch = vi.fn(
      async (_url: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual({
          authorization: "Bearer signed-token",
          "content-type": "application/json",
        });
        return new Response(JSON.stringify(serverState), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );
    const session = createApiPlagueSession({
      url: "https://example.test/api/plague",
      getToken: async () => "signed-token",
      fetch,
    });

    const returned = await session.dispatch({
      type: "choose_action",
      action: { kind: "care", node_id: "care-house" },
      question_ids: ["a", "b", "c"],
      expected_revision: opened.revision,
    });
    expect(returned).toEqual(serverState);
    expect(returned).not.toEqual(locallyExpected);
  });
});
