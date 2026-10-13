import { canonicalRawAnswer } from "@cr/item-bank";
import type { AssessmentItemSubmission, UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { DIAGNOSTIC_CHECKER_VERSION, itemForVersion } from "./browserRuntime";
import {
  createBrowserLocalDiagnosticClient,
  demoDiagnosticStorageKey,
} from "./diagnosticPersistence";

const STUDENT = "00000000-0000-4000-8000-0000000000dd" as UUID;

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("browser-local diagnostic persistence", () => {
  it("restores a finalized pretest and its placement after a fresh client", async () => {
    const saved = storage();
    const first = createBrowserLocalDiagnosticClient(STUDENT, saved);
    const run = first.begin("pre");
    let served = await run.start();

    for (let asked = 0; asked < 100; asked += 1) {
      const item = served.items[0];
      if (!item) {
        throw new Error("the walk served no item");
      }
      const authored = itemForVersion(item.item_version_id);
      if (!authored) {
        throw new Error(`no authored item ${item.item_version_id}`);
      }
      const submission: AssessmentItemSubmission = {
        administration_id: served.administrationId,
        item_version_id: item.item_version_id,
        node_id: item.node_id,
        raw_answer: canonicalRawAnswer(authored.answer),
        item_definition_hash: item.item_definition_hash,
        equivalence_checker_version: DIAGNOSTIC_CHECKER_VERSION,
        client_correct: true,
      };
      const advance = await run.submitStage([submission]);
      if (advance.complete) {
        break;
      }
      served = {
        administrationId: served.administrationId,
        stageId: advance.stage_id,
        items: advance.items,
      };
    }
    const completed = await run.finalize();
    expect(completed.placement_by_node).not.toEqual({});
    expect(saved.values.has(demoDiagnosticStorageKey(STUDENT))).toBe(true);

    const restored = createBrowserLocalDiagnosticClient(STUDENT, saved);
    expect(restored.mode).toBe("browser-local");
    const runs = await restored.completedRuns?.();
    expect(runs?.pre?.placement_by_node).toEqual(completed.placement_by_node);
    expect(runs?.post).toBeNull();
  });
});
