import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ROOT = resolveRepoRoot();
const CORE = readFileSync(
  posix.join(ROOT, "db/migrations/0001_core_contracts.sql"),
  "utf8",
);
const INTEGRITY = readFileSync(
  posix.join(ROOT, "db/migrations/0019_mastery_attempt_integrity.sql"),
  "utf8",
);
const SQL = INTEGRITY.replace(/--[^\n]*/g, "");

describe("mastery attempt storage integrity", () => {
  it("keeps the attempt id globally unique for retry and tampering conflicts", () => {
    expect(CORE).toMatch(
      /create\s+table\s+public\.mastery_evidence\s*\(\s*evidence_id\s+text\s+primary\s+key/i,
    );
  });

  it("binds every receipt to the exact authenticated student/node record", () => {
    expect(SQL).toMatch(
      /foreign\s+key\s*\(\s*student_id\s*,\s*node_id\s*\)[\s\S]*references\s+public\.student_node_state\s*\(\s*student_id\s*,\s*node_id\s*\)/i,
    );
    expect(SQL).toMatch(/on\s+update\s+restrict[\s\S]*on\s+delete\s+restrict/i);
  });

  it("grants only the append the response log was missing and accepts no blank ids", () => {
    expect(SQL).toMatch(
      /grant\s+insert\s*\([\s\S]*evidence_id[\s\S]*revealed[\s\S]*\)\s+on\s+public\.raw_response_log\s+to\s+app_service/i,
    );
    expect(SQL).not.toMatch(/grant\s+(?:update|delete)/i);
    expect(SQL).toMatch(/check\s*\(\s*btrim\s*\(\s*evidence_id\s*\)\s*<>\s*''\s*\)/i);
    expect(SQL).toMatch(/check\s*\(\s*btrim\s*\(\s*node_id\s*\)\s*<>\s*''\s*\)/i);
  });

  it("makes the five response slots append-only children of one attempt", () => {
    expect(SQL).toMatch(
      /foreign\s+key\s*\(\s*evidence_id\s*\)[\s\S]*references\s+public\.mastery_evidence\s*\(\s*evidence_id\s*\)/i,
    );
    expect(SQL).toMatch(/unique\s*\(\s*evidence_id\s*,\s*slot_index\s*\)/i);
    expect(SQL).toMatch(/revealed\s+boolean\s+not\s+null/i);
  });
});
