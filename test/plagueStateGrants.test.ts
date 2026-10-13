import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { PLAGUE_STATE_STATEMENTS } from "@cr/diagnostic-api/plagueState";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();
const migration = readFileSync(
  posix.join(repoRoot, "db/migrations/0013_plague_care_house_state.sql"),
  "utf8",
);

describe("Care House persistence grants match its event-only writer", () => {
  it("creates and grants exactly the state table the service reads and writes", () => {
    expect(migration).toMatch(/create table public\.plague_crisis_state/);
    expect(migration).toMatch(/grant select, insert on public\.plague_crisis_state/);
    expect(migration).toMatch(
      /grant update \(state, updated_at\) on public\.plague_crisis_state/,
    );
    for (const statement of Object.values(PLAGUE_STATE_STATEMENTS)) {
      expect(statement).toContain("public.plague_crisis_state");
    }
  });

  it("grants no learning or economy write through the crisis table", () => {
    expect(migration).not.toMatch(
      /student_node_state|mastery_evidence|resource_grant_ledger/,
    );
    expect(PLAGUE_STATE_STATEMENTS.write).not.toMatch(
      /student_node_state|mastery|price|resource_grant_ledger/,
    );
  });
});
