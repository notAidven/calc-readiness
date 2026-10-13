import { describe, expect, it, vi } from "vitest";

import { createHttpWorkParseClient } from "./parseClient";

const UPLOAD_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function client(response: Response, token: string | null = "jwt") {
  const fetchImpl = vi.fn(async () => response);
  return {
    fetchImpl,
    client: createHttpWorkParseClient({
      endpoint: "https://app.test/api/work-upload/parse",
      getToken: async () => token,
      fetchImpl: fetchImpl as typeof fetch,
    }),
  };
}

describe("the work-parse HTTP boundary", () => {
  it("distinguishes an expired sign-in without making an anonymous parse request", async () => {
    const bag = client(new Response("{}"), null);
    await expect(bag.client.read(UPLOAD_ID)).resolves.toMatchObject({
      outcome: "unavailable",
      reason: "auth",
    });
    expect(bag.fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [429, undefined, "paused"],
    [503, "parse_unconfigured", "config"],
    [503, "parse_model_id", "model_id"],
    [503, "parse_access", "access"],
    [404, "parse_upload", "upload"],
  ] as const)("maps HTTP %s / %s to %s", async (status, code, reason) => {
    const bag = client(
      new Response(JSON.stringify({ error: "safe", ...(code ? { code } : {}) }), {
        status,
      }),
    );
    await expect(bag.client.read(UPLOAD_ID)).resolves.toMatchObject({
      outcome: "unavailable",
      reason,
    });
  });

  it("refuses a success body that is not the provisional parse contract", async () => {
    for (const body of [
      "<!doctype html>",
      JSON.stringify({ parse: { outcome: "read", steps: [] } }),
      JSON.stringify({
        parse: {
          uploadId: UPLOAD_ID,
          outcome: "read",
          steps: ["x = 4"],
          provisional: false,
        },
      }),
    ]) {
      const bag = client(new Response(body, { status: 200 }));
      await expect(bag.client.read(UPLOAD_ID)).resolves.toMatchObject({
        outcome: "unavailable",
        reason: "malformed_output",
      });
    }
  });

  it("keeps handwriting-unreadable distinct from malformed output", async () => {
    const bag = client(
      new Response(
        JSON.stringify({
          parse: {
            uploadId: UPLOAD_ID,
            outcome: "unreadable",
            steps: [],
            provisional: true,
            headline: "We couldn't make out the working in this photo.",
            caveat: "A clearer photo usually helps.",
            parserId: "bedrock-converse",
            modelId: "qwen.qwen3-vl-235b-a22b",
            createdAt: "2026-08-06T12:00:00.000Z",
          },
        }),
      ),
    );
    await expect(bag.client.read(UPLOAD_ID)).resolves.toMatchObject({
      outcome: "unreadable",
      steps: [],
    });
  });

  it("refuses scripted fixture metadata on the ordinary account client", async () => {
    const bag = client(
      new Response(
        JSON.stringify({
          parse: {
            uploadId: UPLOAD_ID,
            outcome: "read",
            steps: ["P - l = w"],
            provisional: true,
            headline: "A fixed reading",
            caveat: "A fixed caveat",
            parserId: "scripted-demo",
            modelId: "scripted-demo",
            createdAt: "2026-08-12T00:00:00.000Z",
          },
        }),
      ),
    );

    await expect(bag.client.read(UPLOAD_ID)).resolves.toMatchObject({
      outcome: "unavailable",
      reason: "malformed_output",
    });
  });
});
