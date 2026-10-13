import { createD1AnswerChecker, D1_CHECKER_VERSION, D1_SPIKE_ITEMS } from "@cr/components";
import { describe, expect, it, vi } from "vitest";

import { createAuthoritativeScorer } from "./index";

const submission = {
  administration_id: "administration-1",
  item_version_id: "item-1:v1",
  node_id: "NUM.S",
  raw_answer: "1/2",
  item_definition_hash: "hash",
  equivalence_checker_version: 1,
  client_correct: true,
};

describe("authoritative scorer boundary", () => {
  it("recomputes a D1 response with the shared checker before appending", async () => {
    const append = vi.fn(async () => undefined);
    const scorer = createAuthoritativeScorer(
      createD1AnswerChecker({ itemVersions: D1_SPIKE_ITEMS }),
      { append },
    );

    const result = await scorer.scoreAndAppend({
      ...submission,
      item_version_id: "spike:num-f:reduced:v1",
      node_id: "NUM.F",
      raw_answer: "3/4",
      equivalence_checker_version: D1_CHECKER_VERSION,
      client_correct: false,
    });

    expect(result.authoritative_correct).toBe(true);
    expect(result.scoring_status).toBe("correct");
    expect(append).toHaveBeenCalledWith(result);
  });

  it("fails closed when checker versions diverge", async () => {
    const append = vi.fn(async () => undefined);
    const scorer = createAuthoritativeScorer(
      () => ({
        status: "correct",
        reason_code: "match",
        client_correct: true,
        checker_version: 2,
      }),
      { append },
    );

    const result = await scorer.scoreAndAppend(submission);

    expect(result.scoring_status).toBe("scoring_error");
    expect(result.reason_code).toBe("checker_version_mismatch");
    expect(result.authoritative_correct).toBe(false);
    expect(append).toHaveBeenCalledWith(result);
  });
});
