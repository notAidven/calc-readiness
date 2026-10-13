import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ROOT = resolveRepoRoot();
const LEGACY = readFileSync(join(ROOT, "db/migrations/0012_economy_authority.sql"), "utf8");
const HARDENING = readFileSync(
  join(ROOT, "db/migrations/0017_interleaved_evidence_constraints.sql"),
  "utf8",
);
const STUDENT = "00000000-0000-4000-8000-0000000000aa";

let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await db.exec("create role app_service");
  await db.exec(
    "create type public.city_era as enum ('prehistoric', 'neolithic', 'bronze_age', 'classical', 'medieval', 'renaissance', 'industrial', 'atomic_age', 'information_age', 'cyberpunk')",
  );
  await db.exec(LEGACY);
});

afterEach(async () => {
  await db.close();
});

function insert(session: string, items: string, nodes: string, count: number): string {
  return `insert into public.interleaved_practice_clear
    (student_id, session_id, era_id, item_version_ids, node_ids, response_count)
    values ('${STUDENT}', '${session}', 'prehistoric', '${items}'::jsonb,
            '${nodes}'::jsonb, ${count})`;
}

describe("forward-only interleaved evidence hardening", () => {
  it("quarantines pre-existing invalid rows explicitly and preserves valid evidence", async () => {
    const legacyRows = [
      insert("empty", "[]", "[]", 2),
      insert("number", "[7]", '["NUM.S", "NUM.F"]', 2),
      insert(
        "boolean",
        '["d1.num-s.l1:practice:5000", "d1.num-f.l1:practice:5005"]',
        '[false, "NUM.F"]',
        2,
      ),
      insert(
        "length",
        '["d1.num-s.l1:practice:5000", "d1.num-f.l1:practice:5005"]',
        '["NUM.S"]',
        2,
      ),
    ];
    for (const sql of legacyRows) {
      await db.exec(sql);
    }
    await db.exec(
      insert(
        "valid",
        '["d1.num-s.l1:practice:5000", "d1.num-f.l1:practice:5005"]',
        '["NUM.S", "NUM.F"]',
        2,
      ),
    );

    await db.exec(HARDENING);

    const active = await db.query<{ session_id: string }>(
      "select session_id from public.interleaved_practice_clear order by session_id",
    );
    const invalid = await db.query<{ session_id: string; quarantine_reason: string }>(
      "select session_id, quarantine_reason from public.interleaved_practice_clear_invalid order by session_id",
    );
    expect(active.rows).toEqual([{ session_id: "valid" }]);
    expect(invalid.rows).toEqual([
      { session_id: "boolean", quarantine_reason: "invalid_node_ids" },
      { session_id: "empty", quarantine_reason: "invalid_item_version_ids" },
      { session_id: "length", quarantine_reason: "response_count_mismatch" },
      { session_id: "number", quarantine_reason: "invalid_item_version_ids" },
    ]);
  });

  it("rejects empty, wrong-member, and length-mismatched evidence", async () => {
    await db.exec(HARDENING);
    const invalid = [
      insert("empty", "[]", "[]", 2),
      insert("number", "[7, 8]", '["NUM.S", "NUM.F"]', 2),
      insert(
        "boolean",
        '["d1.num-s.l1:practice:5000", "d1.num-f.l1:practice:5005"]',
        '[false, "NUM.F"]',
        2,
      ),
      insert(
        "length",
        '["d1.num-s.l1:practice:5000", "d1.num-f.l1:practice:5005"]',
        '["NUM.S"]',
        2,
      ),
      insert("blank", '["", "d1.num-f.l1:practice:5005"]', '["NUM.S", "NUM.F"]', 2),
      insert(
        "shape",
        '["not allowed!", "d1.num-f.l1:practice:5005"]',
        '["num-s", "NUM.F"]',
        2,
      ),
    ];
    expect(invalid).toHaveLength(6);
    for (const sql of invalid) {
      await expect(db.exec(sql)).rejects.toThrow();
    }
    await expect(
      db.exec(
        insert(
          "valid",
          '["d1.num-s.l1:practice:5000", "d1.num-f.l1:practice:5005"]',
          '["NUM.S", "NUM.F"]',
          2,
        ),
      ),
    ).resolves.toBeDefined();
  });
});
