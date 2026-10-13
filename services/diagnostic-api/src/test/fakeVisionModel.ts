import type { DataApiExecutor, SqlParams, SqlValue } from "@cr/db";

import type { VisionModel, VisionModelReply, VisionModelRequest } from "../visionModel";

/**
 * Doubles for the two things the v2 parse route talks to that nothing in CI may reach: the
 * `work_upload_parse` ledger and a vision model.
 *
 * ## The DB double reads the statement, it does not reimplement it
 *
 * Same reasoning as `fakeWorkUpload.ts`, and it matters more here because three separate
 * security-and-money claims run through these statements:
 *
 *  - a learner can only parse THEIR OWN upload (`student_id = :sid`);
 *  - a learner gets N attempts per window (`created_at >= to_timestamp(:since_epoch)`);
 *  - the account gets $X per window (`sum(cost_micro_usd)` over the same bound).
 *
 * A double that filtered by parameter regardless of the SQL would make all three
 * unfalsifiable — delete the `student_id` condition, delete the window bound, and every test
 * would still pass because the double was doing the work. So this one parses the WHERE
 * clause it is handed, including comparison operators and `to_timestamp`, and applies exactly
 * what it finds. `workUploadParse.test.ts` names the injections that prove it.
 *
 * It also models `count(*)` and `coalesce(sum(col), 0)` for the same reason: a projection the
 * fake silently answered `undefined` for would make a cap read zero forever.
 *
 * ## The model double is scripted, never live
 *
 * `scriptedVisionModel` answers with whatever the test hands it, counts its calls, and
 * records what it was shown. No test in this repo may make a model call: the suite would
 * become nondeterministic, slow and billable, and CI has no credentials. What CANNOT be
 * exercised without a deployment is therefore named plainly in the PR rather than papered
 * over here — this file is the seam the tests mock at, and the seam is `VisionModel`.
 */

export type FakeRow = Record<string, SqlValue | undefined>;

export interface IssuedStatement {
  sql: string;
  params: SqlParams | undefined;
}

export interface FakeParseCluster {
  db: DataApiExecutor;
  /** `work_upload`, seeded by the test. Never written by the parse route. */
  uploads: FakeRow[];
  /** `work_upload_parse`, appended to by the route. */
  parses: FakeRow[];
  issued: IssuedStatement[];
}

const PARSE_OUTCOMES = ["read", "low_confidence", "unreadable", "failed"];

/** `where a = :x::uuid and b >= to_timestamp(:y)` → `[["a","=", "x"], ["b",">=", "y"]]`. */
function whereConditions(sql: string): [string, string, string][] {
  const clause = /\bwhere\b([\s\S]*?)(?:\border\s+by\b|\blimit\b|$)/i.exec(sql)?.[1] ?? "";
  const conditions: [string, string, string][] = [];
  for (const match of clause.matchAll(
    /(\w+)\s*(>=|<=|>|<|=)\s*(?:to_timestamp\(\s*)?:(\w+)/g,
  )) {
    const [, column, operator, bind] = match;
    if (column !== undefined && operator !== undefined && bind !== undefined) {
      conditions.push([column, operator, bind]);
    }
  }
  return conditions;
}

function compare(left: unknown, operator: string, right: unknown): boolean {
  const numericLeft = Number(left);
  const numericRight = Number(right);
  const bothNumeric = Number.isFinite(numericLeft) && Number.isFinite(numericRight);
  switch (operator) {
    case "=":
      return String(left) === String(right);
    case ">=":
      return bothNumeric ? numericLeft >= numericRight : String(left) >= String(right);
    case ">":
      return bothNumeric ? numericLeft > numericRight : String(left) > String(right);
    case "<=":
      return bothNumeric ? numericLeft <= numericRight : String(left) <= String(right);
    case "<":
      return bothNumeric ? numericLeft < numericRight : String(left) < String(right);
    default:
      throw new Error(`the fake does not model the operator ${operator}`);
  }
}

/** `order by created_at desc, x` → `[["created_at", -1], ["x", 1]]`. */
function orderBy(sql: string): [string, number][] {
  const clause = /\border\s+by\s+([\s\S]+?)(?:\s*\blimit\b[\s\S]*)?$/i.exec(sql)?.[1];
  if (clause === undefined) {
    return [];
  }
  return clause.split(",").map((part) => {
    const [column = "", direction = ""] = part.trim().split(/\s+/);
    return [column, /desc/i.test(direction) ? -1 : 1] as [string, number];
  });
}

/** The select list by output name, with the expression each alias came from. */
function projection(sql: string): [string, string][] {
  const list = /^\s*select\s+([\s\S]+?)\s+from\s/i.exec(sql)?.[1];
  if (list === undefined || list.includes("*") === true) {
    // `count(*)` is the one legal star, and it always arrives aliased.
    if (list === undefined || !/count\(\s*\*\s*\)/i.test(list)) {
      throw new Error(`the fake needs an explicit select list: ${sql}`);
    }
  }
  // Split on top-level commas only: `coalesce(sum(x), 0) as y` has one inside a call.
  const entries: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of list ?? "") {
    if (character === "(") {
      depth += 1;
    }
    if (character === ")") {
      depth -= 1;
    }
    if (character === "," && depth === 0) {
      entries.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  entries.push(current);
  return entries.map((entry) => {
    const trimmed = entry.trim().replace(/\s+/g, " ");
    const aliased = /^(.*?)\s+as\s+(\w+)$/i.exec(trimmed);
    if (aliased?.[1] !== undefined && aliased[2] !== undefined) {
      return [aliased[2], aliased[1]];
    }
    return [trimmed, trimmed];
  });
}

/** `insert into public.t (a, b) values (:a::uuid, :b)` → `[["a","a"],["b","b"]]`. */
function insertBindings(sql: string): [string, string][] {
  const columns = /insert\s+into\s+public\.\w+\s*\(([\s\S]*?)\)/i.exec(sql)?.[1];
  const values = /\bvalues\s*\(([\s\S]*?)\)\s*(?:on\s+conflict|$)/i.exec(sql)?.[1];
  if (columns === undefined || values === undefined) {
    throw new Error(`the fake cannot read this insert: ${sql}`);
  }
  const columnNames = columns.split(",").map((name) => name.trim());
  const bindNames = values.split(",").map((value) => {
    const bind = /:(\w+)/.exec(value.trim())?.[1];
    if (bind === undefined) {
      throw new Error(`every inserted value must be a bind parameter: ${value}`);
    }
    return bind;
  });
  if (columnNames.length !== bindNames.length) {
    throw new Error(
      `the insert names ${columnNames.length} columns and ${bindNames.length} values`,
    );
  }
  return columnNames.map((name, index) => [name, bindNames[index] ?? ""]);
}

/**
 * The table's check constraints, so a bad row fails here the way it does in Aurora.
 *
 * `0010`'s were each driven to failure BY NAME against PostgreSQL 18.3 before being modelled
 * — see the migration's header — so those are a copy of measured behaviour.
 *
 * **`0011`'s three are not, and the difference is worth keeping visible.** No cluster was
 * reachable when the coaching columns were written, so they are transcribed from the SQL
 * rather than observed. They may therefore differ from Aurora in their exact message, and
 * the risk they cover is the direction that matters here: a route that tried to store
 * coaching with no transcript under it would pass a fake that did not model the constraint
 * and fail on the first real insert. Drive them red against a cluster when one is up.
 */
function enforceParseConstraints(row: FakeRow, uploads: readonly FakeRow[]): void {
  if (!PARSE_OUTCOMES.includes(String(row.outcome))) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_outcome_is_known"',
    );
  }
  const confidence = row.confidence;
  if (confidence !== null && confidence !== undefined) {
    const value = Number(confidence);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(
        'new row for relation "work_upload_parse" violates check constraint ' +
          '"work_upload_parse_confidence_is_a_fraction"',
      );
    }
  }
  const steps: unknown = JSON.parse(String(row.steps ?? "[]"));
  if (!Array.isArray(steps)) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_steps_is_an_array"',
    );
  }
  const suspect = row.suspect_step_index;
  if (suspect !== null && suspect !== undefined) {
    const index = Number(suspect);
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
      throw new Error(
        'new row for relation "work_upload_parse" violates check constraint ' +
          '"work_upload_parse_suspect_step_is_in_range"',
      );
    }
  }
  // `0011`. Transcribed, not measured: see this function's header.
  const nextSteps: unknown = JSON.parse(String(row.next_steps ?? "[]"));
  if (!Array.isArray(nextSteps)) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_next_steps_is_an_array"',
    );
  }
  const explanation = row.explanation ?? null;
  if (explanation !== null && String(explanation).length > 600) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_explanation_within_cap"',
    );
  }
  if (nextSteps.length > 3) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_next_steps_within_cap"',
    );
  }
  if (
    !(explanation === null && nextSteps.length === 0) &&
    !(Array.isArray(steps) && steps.length > 0)
  ) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_coaching_needs_steps"',
    );
  }
  // `0015`. Transcribed from the migration for the same reason as the block above.
  const withheld = row.coaching_withheld_reason ?? null;
  if (
    withheld !== null &&
    ![
      "no_grounding",
      "no_suspect_line",
      "none_offered",
      "verdict_language",
      "answer_key_stated",
    ].includes(String(withheld))
  ) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_withheld_reason_is_known"',
    );
  }
  if (withheld !== null && explanation !== null) {
    throw new Error(
      'new row for relation "work_upload_parse" violates check constraint ' +
        '"work_upload_parse_withheld_excludes_coaching"',
    );
  }
  for (const column of ["input_tokens", "output_tokens", "cost_micro_usd"]) {
    if (Number(row[column] ?? 0) < 0) {
      throw new Error(
        'new row for relation "work_upload_parse" violates check constraint ' +
          '"work_upload_parse_spend_is_not_negative"',
      );
    }
  }
  // The composite foreign key: a reading may only be attributed to the student who owns the
  // upload it names. The route establishes that by looking the upload up `sub`-scoped; this
  // is the copy that holds if a future writer forgets to.
  const owned = uploads.some(
    (upload) =>
      String(upload.upload_id) === String(row.upload_id) &&
      String(upload.student_id) === String(row.student_id),
  );
  if (!owned) {
    throw new Error(
      'insert or update on table "work_upload_parse" violates foreign key constraint ' +
        '"work_upload_parse_belongs_to_its_uploads_owner"',
    );
  }
}

/** Build an in-memory `work_upload` + `work_upload_parse`. */
export function createFakeParseCluster(
  seed: { uploads?: readonly FakeRow[]; parses?: readonly FakeRow[] } = {},
): FakeParseCluster {
  const uploads: FakeRow[] = (seed.uploads ?? []).map((row) => ({ ...row }));
  const parses: FakeRow[] = (seed.parses ?? []).map((row) => ({ ...row }));
  const issued: IssuedStatement[] = [];
  let clock = 1_780_000_000;

  function tableFor(sql: string): FakeRow[] {
    if (sql.includes("public.work_upload_parse")) {
      return parses;
    }
    if (sql.includes("public.work_upload")) {
      return uploads;
    }
    throw new Error(`the fake was asked for a table it does not have: ${sql}`);
  }

  const db: DataApiExecutor = {
    async query<T>(sql: string, params?: SqlParams): Promise<T[]> {
      issued.push({ sql, params });
      if (!/^\s*select\b/i.test(sql)) {
        throw new Error(`query() was handed a write: ${sql}`);
      }
      const rows = tableFor(sql);
      const conditions = whereConditions(sql);
      let found = rows.filter((row) =>
        conditions.every(([column, operator, bind]) =>
          compare(row[column], operator, params?.[bind]),
        ),
      );
      const order = orderBy(sql);
      if (order.length > 0) {
        found = [...found].sort((a, b) => {
          for (const [column, direction] of order) {
            const left = a[column];
            const right = b[column];
            if (typeof left === "number" && typeof right === "number" && left !== right) {
              return (left - right) * direction;
            }
            if (typeof left === "string" && typeof right === "string" && left !== right) {
              return (left < right ? -1 : 1) * direction;
            }
          }
          return 0;
        });
      }
      const limit = /\blimit\s+(\d+)/i.exec(sql)?.[1];
      if (limit !== undefined) {
        found = found.slice(0, Number(limit));
      }

      const columns = projection(sql);
      // An AGGREGATE select collapses to one row, whatever the filter matched — including
      // when it matched nothing, which is exactly the case a cap has to get right.
      if (columns.some(([, expression]) => /\b(count|sum)\s*\(/i.test(expression))) {
        const aggregate: Record<string, SqlValue> = {};
        for (const [alias, expression] of columns) {
          if (/count\s*\(/i.test(expression)) {
            aggregate[alias] = found.length;
            continue;
          }
          const summed = /sum\s*\(\s*(\w+)\s*\)/i.exec(expression)?.[1];
          if (summed === undefined) {
            throw new Error(`the fake does not model the expression ${expression}`);
          }
          aggregate[alias] = found.reduce(
            (total, row) => total + Number(row[summed] ?? 0),
            0,
          );
        }
        return [aggregate] as T[];
      }

      return found.map((row) =>
        Object.fromEntries(
          columns.map(([alias, expression]) => [
            alias,
            /extract\(\s*epoch\s+from\s+created_at\s*\)/i.test(expression)
              ? (row.created_at ?? null)
              : (row[expression] ?? null),
          ]),
        ),
      ) as T[];
    },

    async execute(sql: string, params?: SqlParams): Promise<number> {
      issued.push({ sql, params });
      const rows = tableFor(sql);
      if (!/^\s*insert\b/i.test(sql)) {
        throw new Error(`the fake does not model this statement: ${sql}`);
      }
      const row: FakeRow = {};
      for (const [column, bind] of insertBindings(sql)) {
        row[column] = params?.[bind] ?? null;
      }
      clock += 1;
      row.created_at = clock;
      if (rows === parses) {
        enforceParseConstraints(row, uploads);
      }
      rows.push(row);
      return 1;
    },
  };

  return { db, uploads, parses, issued };
}

/** What the model was shown, so a test can assert the bytes and the instruction. */
export interface ScriptedVisionModel extends VisionModel {
  readonly calls: VisionModelRequest[];
}

/**
 * A vision model that answers from a script.
 *
 * `replies` is consumed in order; a function may throw, which is how the provider-outage
 * degradation path is driven. Running past the end is an error rather than a repeat: a test
 * that called the model more often than it meant to is a test whose caching or cap claim is
 * wrong, and silently repeating the last reply would hide that.
 */
export function scriptedVisionModel(
  replies: readonly (VisionModelReply | (() => VisionModelReply))[],
  options: { id?: string; modelId?: string } = {},
): ScriptedVisionModel {
  const calls: VisionModelRequest[] = [];
  let next = 0;
  return {
    id: options.id ?? "scripted",
    modelId: options.modelId ?? "scripted-model",
    calls,
    async invoke(request) {
      calls.push(request);
      const reply = replies[next];
      next += 1;
      if (reply === undefined) {
        throw new Error(
          `the model was called ${next} times and the script has ${replies.length} replies`,
        );
      }
      return typeof reply === "function" ? reply() : reply;
    },
  };
}

/** A reply carrying a well-formed reading, with the usage a real call would report. */
export function readingReply(
  body: Record<string, unknown>,
  usage: { inputTokens: number; outputTokens: number } = {
    inputTokens: 3100,
    outputTokens: 300,
  },
): VisionModelReply {
  return { text: JSON.stringify(body), usage };
}
