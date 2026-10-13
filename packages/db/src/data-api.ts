import type { SqlParameter } from "@aws-sdk/client-rds-data";
import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RDSDataClient,
  RollbackTransactionCommand,
} from "@aws-sdk/client-rds-data";

/**
 * Config for an Aurora Serverless v2 cluster reached over the RDS Data API. The
 * Data API is HTTP (IAM-authed) so the caller (our Lambda) never opens a socket
 * to the DB and stays out of the VPC. `client` is injectable so unit tests can
 * pass an RDSDataClient double.
 */
export interface DataApiConfig {
  resourceArn: string;
  secretArn: string;
  database: string;
  client?: RDSDataClient;
}

/**
 * Branded `jsonb` parameter. The Data API sends bare strings as `text`, so a raw
 * string bound to a `jsonb` column (e.g. `raw_answer` = `"x^2"`) fails; wrapping
 * a value in `json(...)` forces JSON-encoding + the `JSON` type hint regardless of
 * the JS type. Use it for every `jsonb` bind (raw_answer, served, outcomes,
 * routing_path).
 */
export interface JsonParam {
  readonly __crJson: true;
  readonly value: unknown;
}

export function json(value: unknown): JsonParam {
  return { __crJson: true, value };
}

function isJsonParam(value: unknown): value is JsonParam {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __crJson?: unknown }).__crJson === true
  );
}

/** A JS value bindable to a SQL parameter. Objects/arrays must be wrapped in `json()`. */
export type SqlValue = string | number | boolean | null | undefined | JsonParam;
export type SqlParams = Record<string, SqlValue>;

function toSqlParameter(name: string, value: SqlValue): SqlParameter {
  if (isJsonParam(value)) {
    if (value.value === null || value.value === undefined) {
      return { name, value: { isNull: true } };
    }
    return {
      name,
      value: { stringValue: JSON.stringify(value.value) },
      typeHint: "JSON",
    };
  }
  if (value === null || value === undefined) {
    return { name, value: { isNull: true } };
  }
  switch (typeof value) {
    case "string":
      return { name, value: { stringValue: value } };
    case "boolean":
      return { name, value: { booleanValue: value } };
    case "number":
      return Number.isInteger(value)
        ? { name, value: { longValue: value } }
        : { name, value: { doubleValue: value } };
    default:
      throw new Error(`unsupported SQL parameter type for "${name}": ${typeof value}`);
  }
}

function toParameters(params: SqlParams): SqlParameter[] {
  return Object.entries(params).map(([name, value]) => toSqlParameter(name, value));
}

/**
 * Read a `jsonb` column from a `formatRecordsAs: "JSON"` result. The Data API's
 * JSON formatting returns jsonb either as an already-parsed value or as its JSON
 * text (a string), depending on driver/version — so parse a string defensively
 * and fall back to the raw string if it is not valid JSON (e.g. a bare scalar
 * answer). This is lossless for the object/array columns we actually rely on
 * (served, outcomes, routing_path) under both behaviours.
 */
export function parseJsonColumn<T>(value: unknown): T {
  if (typeof value !== "string") {
    return value as T;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

/** Query/execute surface shared by the root client and a transaction scope. */
export interface DataApiExecutor {
  /** Run a statement and map its result set (SELECT or `RETURNING`) to typed rows. */
  query<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T[]>;
  /** Run a write and return the number of affected rows. */
  execute(sql: string, params?: SqlParams): Promise<number>;
}

export interface DataApiClient extends DataApiExecutor {
  /**
   * Run `fn` inside a Data API transaction (begin → commit, or rollback on throw).
   * The executor passed to `fn` binds every statement to the transaction id, so
   * multi-statement operations (submitStage, finalize) are atomic.
   */
  withTransaction<T>(fn: (tx: DataApiExecutor) => Promise<T>): Promise<T>;
}

export function createDataApiClient(config: DataApiConfig): DataApiClient {
  const client = config.client ?? new RDSDataClient({});
  const base = {
    resourceArn: config.resourceArn,
    secretArn: config.secretArn,
    database: config.database,
  };

  async function send(sql: string, params: SqlParams | undefined, transactionId?: string) {
    return client.send(
      new ExecuteStatementCommand({
        ...base,
        sql,
        parameters: params ? toParameters(params) : undefined,
        formatRecordsAs: "JSON",
        ...(transactionId ? { transactionId } : {}),
      }),
    );
  }

  function executor(transactionId?: string): DataApiExecutor {
    return {
      async query<T>(sql: string, params?: SqlParams): Promise<T[]> {
        const result = await send(sql, params, transactionId);
        return result.formattedRecords ? (JSON.parse(result.formattedRecords) as T[]) : [];
      },
      async execute(sql: string, params?: SqlParams): Promise<number> {
        const result = await send(sql, params, transactionId);
        return result.numberOfRecordsUpdated ?? 0;
      },
    };
  }

  const root = executor();
  return {
    query: root.query,
    execute: root.execute,
    async withTransaction<T>(fn: (tx: DataApiExecutor) => Promise<T>): Promise<T> {
      const begun = await client.send(new BeginTransactionCommand(base));
      const transactionId = begun.transactionId;
      if (!transactionId) {
        throw new Error("RDS Data API did not return a transactionId");
      }
      try {
        const out = await fn(executor(transactionId));
        await client.send(new CommitTransactionCommand({ ...base, transactionId }));
        return out;
      } catch (error) {
        try {
          await client.send(new RollbackTransactionCommand({ ...base, transactionId }));
        } catch {
          // Prefer surfacing the original failure over a rollback error.
        }
        throw error;
      }
    },
  };
}
