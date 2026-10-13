import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  type RDSDataClient,
  RollbackTransactionCommand,
  type SqlParameter,
} from "@aws-sdk/client-rds-data";
import { describe, expect, it, vi } from "vitest";

import { createDataApiClient, json, parseJsonColumn, type SqlValue } from "./data-api";

type CommandOutput = Record<string, unknown>;

/**
 * A minimal {@link RDSDataClient} double. `createDataApiClient` takes an injectable
 * client, so we hand it one whose `send` records every command and returns canned
 * output per command type — letting a test assert the exact Data API request the
 * wrapper built (SQL, marshalled parameters, transaction wiring) with no AWS calls.
 */
function fakeClient(
  onExecute: (command: ExecuteStatementCommand) => CommandOutput = () => ({}),
  onBegin: () => CommandOutput = () => ({ transactionId: "tx-1" }),
) {
  const sent: Array<
    | ExecuteStatementCommand
    | BeginTransactionCommand
    | CommitTransactionCommand
    | RollbackTransactionCommand
  > = [];
  const send = vi.fn(async (command: unknown) => {
    if (command instanceof ExecuteStatementCommand) {
      sent.push(command);
      return onExecute(command);
    }
    if (command instanceof BeginTransactionCommand) {
      sent.push(command);
      return onBegin();
    }
    if (command instanceof CommitTransactionCommand) {
      sent.push(command);
      return {};
    }
    if (command instanceof RollbackTransactionCommand) {
      sent.push(command);
      return {};
    }
    throw new Error(`unexpected command: ${String(command)}`);
  });
  return { client: { send } as unknown as RDSDataClient, sent, send };
}

const CONFIG = {
  resourceArn: "arn:aws:rds:us-east-1:1:cluster:db",
  secretArn: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
  database: "calc_readiness",
};

function paramByName(params: SqlParameter[] | undefined, name: string): SqlParameter {
  const found = params?.find((p) => p.name === name);
  if (!found) {
    throw new Error(`no parameter named "${name}"`);
  }
  return found;
}

describe("createDataApiClient.query", () => {
  it("marshals JS values to Data API parameters and forwards the base config", async () => {
    const { client, sent } = fakeClient(() => ({
      formattedRecords: JSON.stringify([{ a: 1 }]),
    }));
    const db = createDataApiClient({ ...CONFIG, client });

    const rows = await db.query("select 1", {
      s: "x^2",
      n: 3,
      f: 1.5,
      b: true,
      nothing: null,
      j: json({ k: 1 }),
    });

    expect(rows).toEqual([{ a: 1 }]);

    const command = sent[0] as ExecuteStatementCommand;
    expect(command.input.sql).toBe("select 1");
    expect(command.input.resourceArn).toBe(CONFIG.resourceArn);
    expect(command.input.secretArn).toBe(CONFIG.secretArn);
    expect(command.input.database).toBe(CONFIG.database);
    expect(command.input.formatRecordsAs).toBe("JSON");
    expect(command.input.transactionId).toBeUndefined();

    const params = command.input.parameters;
    expect(paramByName(params, "s").value).toEqual({ stringValue: "x^2" });
    expect(paramByName(params, "n").value).toEqual({ longValue: 3 });
    expect(paramByName(params, "f").value).toEqual({ doubleValue: 1.5 });
    expect(paramByName(params, "b").value).toEqual({ booleanValue: true });
    expect(paramByName(params, "nothing").value).toEqual({ isNull: true });
    const jsonParam = paramByName(params, "j");
    expect(jsonParam.value).toEqual({ stringValue: '{"k":1}' });
    expect(jsonParam.typeHint).toBe("JSON");
  });

  it("returns an empty array when the Data API omits formattedRecords", async () => {
    const { client } = fakeClient(() => ({}));
    const db = createDataApiClient({ ...CONFIG, client });
    expect(await db.query("select 1")).toEqual([]);
  });

  it("sends no parameters key when called without params", async () => {
    const { client, sent } = fakeClient(() => ({ formattedRecords: "[]" }));
    const db = createDataApiClient({ ...CONFIG, client });
    await db.query("select 1");
    expect((sent[0] as ExecuteStatementCommand).input.parameters).toBeUndefined();
  });

  it("treats json(null) as a SQL NULL bind", async () => {
    const { client, sent } = fakeClient(() => ({ formattedRecords: "[]" }));
    const db = createDataApiClient({ ...CONFIG, client });
    await db.query("select 1", { j: json(null) });
    expect(
      paramByName((sent[0] as ExecuteStatementCommand).input.parameters, "j").value,
    ).toEqual({ isNull: true });
  });

  it("rejects an unsupported parameter type", async () => {
    const { client } = fakeClient(() => ({ formattedRecords: "[]" }));
    const db = createDataApiClient({ ...CONFIG, client });
    await expect(db.query("select 1", { bad: 10n as unknown as SqlValue })).rejects.toThrow(
      /unsupported SQL parameter type for "bad"/,
    );
  });
});

describe("createDataApiClient.execute", () => {
  it("returns the affected row count", async () => {
    const { client } = fakeClient(() => ({ numberOfRecordsUpdated: 2 }));
    const db = createDataApiClient({ ...CONFIG, client });
    expect(await db.execute("update t set x = 1")).toBe(2);
  });

  it("returns 0 when the Data API omits the count", async () => {
    const { client } = fakeClient(() => ({}));
    const db = createDataApiClient({ ...CONFIG, client });
    expect(await db.execute("update t set x = 1")).toBe(0);
  });
});

describe("createDataApiClient.withTransaction", () => {
  it("binds statements to the transaction id and commits on success", async () => {
    const { client, sent } = fakeClient(() => ({ formattedRecords: "[]" }));
    const db = createDataApiClient({ ...CONFIG, client });

    const result = await db.withTransaction(async (tx) => {
      await tx.execute("insert into t values (1)");
      return "ok";
    });

    expect(result).toBe("ok");
    expect(sent[0]).toBeInstanceOf(BeginTransactionCommand);
    const insert = sent[1] as ExecuteStatementCommand;
    expect(insert).toBeInstanceOf(ExecuteStatementCommand);
    expect(insert.input.transactionId).toBe("tx-1");
    expect(sent[2]).toBeInstanceOf(CommitTransactionCommand);
    expect((sent[2] as CommitTransactionCommand).input.transactionId).toBe("tx-1");
    expect(sent.some((c) => c instanceof RollbackTransactionCommand)).toBe(false);
  });

  it("rolls back and rethrows the original error when the body throws", async () => {
    const { client, sent } = fakeClient(() => ({ formattedRecords: "[]" }));
    const db = createDataApiClient({ ...CONFIG, client });

    await expect(
      db.withTransaction(async (tx) => {
        await tx.execute("insert into t values (1)");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(sent.some((c) => c instanceof RollbackTransactionCommand)).toBe(true);
    expect(sent.some((c) => c instanceof CommitTransactionCommand)).toBe(false);
  });

  it("throws when the Data API does not return a transaction id", async () => {
    const { client } = fakeClient(
      () => ({}),
      () => ({}),
    );
    const db = createDataApiClient({ ...CONFIG, client });
    await expect(db.withTransaction(async () => "never")).rejects.toThrow(
      /did not return a transactionId/,
    );
  });
});

describe("parseJsonColumn", () => {
  it("passes through an already-parsed value", () => {
    expect(parseJsonColumn<{ a: number }>({ a: 1 })).toEqual({ a: 1 });
    expect(parseJsonColumn<number>(5)).toBe(5);
  });

  it("parses JSON text returned as a string", () => {
    expect(parseJsonColumn<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("falls back to the raw string when it is not valid JSON", () => {
    expect(parseJsonColumn<string>("x^2")).toBe("x^2");
  });
});
