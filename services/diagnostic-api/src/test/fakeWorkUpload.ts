import type { DataApiExecutor, SqlParams, SqlValue } from "@cr/db";

import type { PresignedUrl, WorkUploadObjectStore } from "../workUploadObjects";

/**
 * Doubles for the two things the photo-of-work routes talk to: the `work_upload` table and
 * the private uploads bucket.
 *
 * ## The one property that makes this worth writing rather than stubbing
 *
 * The security claim under test is "a student can read only their own uploads", and a double
 * that filtered rows by the `:sid` parameter regardless of the SQL would make that claim
 * UNFALSIFIABLE: delete `and student_id = :sid` from the statement and the test would still
 * pass, because the double, not the query, was doing the scoping. So this reads the
 * statement's own WHERE clause and applies exactly the conditions it finds. Remove the
 * scoping from `WORK_UPLOAD_STATEMENTS` and the fake dutifully returns the other student's
 * row, which is what turns `workUpload.test.ts`'s ownership cases from assertions into
 * measurements.
 *
 * ## It also enforces `0009`'s constraints
 *
 * Every check in `db/migrations/0009_work_upload.sql` is reproduced here, including
 * `work_upload_key_is_student_scoped` — so a service change that recorded a row pointing at
 * another learner's object fails in this suite the way it would fail in Aurora. Those
 * constraints were driven to failure against a real Postgres 16 before being modelled here,
 * so this is a copy of measured behaviour rather than of an assumption.
 *
 * What it CANNOT prove is that the SQL means what this file believes it means. Two guards
 * outside it cover what a double structurally cannot: `test/workUploadGrants.test.ts` holds
 * the DML to the grants `0009` issues (a `permission denied` is production-only), and the
 * migration itself was applied to a real cluster-equivalent.
 */

export type FakeRow = Record<string, SqlValue | undefined>;

export interface IssuedStatement {
  sql: string;
  params: SqlParams | undefined;
}

export interface FakeWorkUploadCluster {
  db: DataApiExecutor;
  rows: FakeRow[];
  issued: IssuedStatement[];
}

const CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SURFACES = ["lesson-practice", "lesson-cfu", "diagnostic-review"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** `where a = :x::uuid and b = :y` → `[["a", "x"], ["b", "y"]]`. */
function whereConditions(sql: string): [string, string][] {
  const clause = /\bwhere\b([\s\S]*?)(?:\border\s+by\b|$)/i.exec(sql)?.[1] ?? "";
  const conditions: [string, string][] = [];
  for (const match of clause.matchAll(/(\w+)\s*=\s*:(\w+)/g)) {
    const [, column, bind] = match;
    if (column !== undefined && bind !== undefined) {
      conditions.push([column, bind]);
    }
  }
  return conditions;
}

/** `order by created_at desc, upload_id` → `[["created_at", -1], ["upload_id", 1]]`. */
function orderBy(sql: string): [string, number][] {
  const clause = /\border\s+by\s+([\s\S]+?)\s*$/i.exec(sql)?.[1];
  if (clause === undefined) {
    return [];
  }
  return clause.split(",").map((part) => {
    const [column = "", direction = ""] = part.trim().split(/\s+/);
    return [column, /desc/i.test(direction) ? -1 : 1] as [string, number];
  });
}

/**
 * The select list, by output name. `extract(epoch from created_at) as created_at_epoch` is
 * the one expression the reads use, and it is resolved off the row's stored epoch rather
 * than being treated as a column, so a statement that stopped aliasing it would project
 * `undefined` here exactly as Postgres would fail there.
 */
function projection(sql: string): [string, string][] {
  const list = /^\s*select\s+([\s\S]+?)\s+from\s/i.exec(sql)?.[1];
  if (list === undefined || list.includes("*")) {
    throw new Error(`the fake needs an explicit select list: ${sql}`);
  }
  return list.split(",").map((entry) => {
    const trimmed = entry.trim().replace(/\s+/g, " ");
    const aliased = /^(.*?)\s+as\s+(\w+)$/i.exec(trimmed);
    if (aliased?.[1] !== undefined && aliased[2] !== undefined) {
      return [aliased[2], aliased[1]];
    }
    return [trimmed, trimmed];
  });
}

/** `insert into public.work_upload (a, b) values (:a::uuid, :b)` → `[["a","a"],["b","b"]]`. */
function insertBindings(sql: string): [string, string][] {
  const columns = /insert\s+into\s+public\.work_upload\s*\(([\s\S]*?)\)/i.exec(sql)?.[1];
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

/** Every `0009` check constraint, so a bad row fails here the way it does in Aurora. */
function enforceConstraints(row: FakeRow): void {
  const studentId = String(row.student_id ?? "");
  const objectKey = String(row.object_key ?? "");
  if (!objectKey.startsWith(`work-uploads/${studentId}/`)) {
    throw new Error(
      'new row for relation "work_upload" violates check constraint ' +
        `"work_upload_key_is_student_scoped": ${objectKey} is not under student ${studentId}`,
    );
  }
  if (!CONTENT_TYPES.includes(String(row.content_type))) {
    throw new Error(
      'new row for relation "work_upload" violates check constraint ' +
        '"work_upload_content_type_is_a_strippable_image"',
    );
  }
  const size = Number(row.size_bytes);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE_BYTES) {
    throw new Error(
      'new row for relation "work_upload" violates check constraint "work_upload_size_within_cap"',
    );
  }
  if (!SURFACES.includes(String(row.surface))) {
    throw new Error(
      'new row for relation "work_upload" violates check constraint "work_upload_surface_is_known"',
    );
  }
  const isReview = row.surface === "diagnostic-review";
  const hasAdministration =
    row.administration_id !== null && row.administration_id !== undefined;
  const hasNode = row.node_id !== null && row.node_id !== undefined;
  if (isReview ? !hasAdministration || hasNode : hasAdministration || !hasNode) {
    throw new Error(
      'new row for relation "work_upload" violates check constraint ' +
        '"work_upload_association_matches_surface"',
    );
  }
}

/** Build an in-memory `work_upload`. `seed` pre-loads rows, including other students'. */
export function createFakeWorkUploadCluster(
  seed: readonly FakeRow[] = [],
): FakeWorkUploadCluster {
  const rows: FakeRow[] = seed.map((row) => ({ ...row }));
  const issued: IssuedStatement[] = [];
  // Stands in for `created_at default now()`, monotone so insertion order is a total order.
  let clock = 1_780_000_000;

  function matching(sql: string, params: SqlParams | undefined): FakeRow[] {
    const conditions = whereConditions(sql);
    return rows.filter((row) =>
      conditions.every(([column, bind]) => String(row[column]) === String(params?.[bind])),
    );
  }

  const db: DataApiExecutor = {
    async query<T>(sql: string, params?: SqlParams): Promise<T[]> {
      issued.push({ sql, params });
      if (!/^\s*select\b/i.test(sql)) {
        throw new Error(`query() was handed a write: ${sql}`);
      }
      if (!sql.includes("public.work_upload")) {
        throw new Error(`the fake was asked for a table it does not have: ${sql}`);
      }
      let found = matching(sql, params);
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
      return found.map((row) =>
        Object.fromEntries(
          projection(sql).map(([alias, expression]) => [
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
      if (!sql.includes("public.work_upload")) {
        throw new Error(`the fake was asked for a table it does not have: ${sql}`);
      }
      if (/^\s*insert\b/i.test(sql)) {
        const row: FakeRow = {};
        for (const [column, bind] of insertBindings(sql)) {
          row[column] = params?.[bind] ?? null;
        }
        clock += 1;
        row.created_at = clock;
        const duplicateId = rows.some((existing) => existing.upload_id === row.upload_id);
        if (duplicateId) {
          if (/on\s+conflict\s*\(\s*upload_id\s*\)\s*do\s+nothing/i.test(sql)) {
            return 0;
          }
          throw new Error(
            'duplicate key value violates unique constraint "work_upload_pkey"',
          );
        }
        if (rows.some((existing) => existing.object_key === row.object_key)) {
          throw new Error(
            'duplicate key value violates unique constraint "work_upload_object_key_key"',
          );
        }
        enforceConstraints(row);
        rows.push(row);
        return 1;
      }
      if (/^\s*delete\b/i.test(sql)) {
        const doomed = new Set(matching(sql, params));
        const before = rows.length;
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          const row = rows[index];
          if (row !== undefined && doomed.has(row)) {
            rows.splice(index, 1);
          }
        }
        return before - rows.length;
      }
      throw new Error(`the fake does not model this statement: ${sql}`);
    },
  };

  return { db, rows, issued };
}

/** One presign the service asked for, so a test can assert which keys were ever signed. */
export interface SignedRequest {
  method: "PUT" | "GET";
  objectKey: string;
  expiresInSeconds: number;
}

export interface FakeObjectStore extends WorkUploadObjectStore {
  /** What is stored, by key. */
  readonly objects: Map<string, { contentType: string; bytes: Uint8Array }>;
  /** Every presigned URL minted, in order. */
  readonly signed: SignedRequest[];
  readonly deleted: string[];
}

/**
 * An in-memory uploads bucket. Presigning is modelled rather than real (the real signer is
 * exercised separately, offline, in `workUpload.test.ts`) — but WHICH key was signed is
 * recorded, because that is the assertion that matters: a URL is the only thing that can
 * reach an object, so "no URL was ever minted for another student's key" is the property.
 */
export function createFakeObjectStore(
  seed: Readonly<Record<string, { contentType: string; bytes: Uint8Array }>> = {},
): FakeObjectStore {
  const objects = new Map(Object.entries(seed).map(([key, value]) => [key, { ...value }]));
  const signed: SignedRequest[] = [];
  const deleted: string[] = [];
  const mint = (method: "PUT" | "GET", objectKey: string): PresignedUrl => {
    const expiresInSeconds = 300;
    signed.push({ method, objectKey, expiresInSeconds });
    return {
      url: `https://uploads.test/${objectKey}?X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=fake`,
      expiresInSeconds,
    };
  };
  return {
    objects,
    signed,
    deleted,
    async presignPut(objectKey) {
      return mint("PUT", objectKey);
    },
    async presignGet(objectKey) {
      return mint("GET", objectKey);
    },
    async getObject(objectKey) {
      return objects.get(objectKey)?.bytes ?? null;
    },
    async putObject(objectKey, contentType, bytes) {
      objects.set(objectKey, { contentType, bytes });
    },
    async deleteObject(objectKey) {
      deleted.push(objectKey);
      objects.delete(objectKey);
    },
  };
}
