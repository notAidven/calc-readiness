import { createD1AnswerChecker, D1_CHECKER_VERSION } from "@cr/components";
import type { CompletedDiagnostic, DiagnosticItem, StageAdvance } from "@cr/diagnostic";
import { D1_ITEM_PACK, toD1ItemVersions } from "@cr/item-bank";
import { createAuthoritativeScorer } from "@cr/scorer";
import type { AssessmentItemSubmission, AssessmentPurpose } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  bearerToken,
  createDiagnosticRuntime,
  createDiagnosticServer,
  createInMemoryDiagnosticStore,
  createInMemoryPlacementWriter,
  createInMemoryResponseRepository,
  type DiagnosticAuthenticator,
  type DiagnosticServer,
  handleDiagnosticFetch,
} from "./index";

const KEY_BY_ID = new Map(
  D1_ITEM_PACK.map((entry) => [entry.item_version_id, entry.answer.answer_key] as const),
);

/** Fake authenticator: `alice`/`bob` map to fixed students; anything else fails. */
const authenticate: DiagnosticAuthenticator = async (token) => {
  if (token === "alice") {
    return { student_id: "stu-alice" };
  }
  if (token === "bob") {
    return { student_id: "stu-bob" };
  }
  return null;
};

function buildServer(): DiagnosticServer {
  const store = createInMemoryDiagnosticStore();
  const scorer = createAuthoritativeScorer(
    createD1AnswerChecker({ itemVersions: toD1ItemVersions(D1_ITEM_PACK) }),
    createInMemoryResponseRepository(),
  );
  const runtime = createDiagnosticRuntime({
    store,
    scorer,
    placementWriter: createInMemoryPlacementWriter(),
  });
  return createDiagnosticServer({ runtime, store, authenticate });
}

function aceSubmissions(
  administrationId: string,
  items: readonly DiagnosticItem[],
): AssessmentItemSubmission[] {
  return items.map((item) => ({
    administration_id: administrationId,
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    raw_answer: KEY_BY_ID.get(item.item_version_id),
    item_definition_hash: item.item_definition_hash,
    equivalence_checker_version: D1_CHECKER_VERSION,
    client_correct: false,
  }));
}

async function aceAdministration(
  server: DiagnosticServer,
  token: string,
  purpose: AssessmentPurpose,
): Promise<{ administrationId: string; completed: CompletedDiagnostic }> {
  const start = await server.handle({ token, body: { action: "start", purpose } });
  expect(start.status).toBe(200);
  const startBody = start.body as { administration_id: string; items: DiagnosticItem[] };
  const administrationId = startBody.administration_id;

  let items: readonly DiagnosticItem[] = startBody.items;
  for (;;) {
    const response = await server.handle({
      token,
      body: {
        action: "submitStage",
        administration_id: administrationId,
        submissions: aceSubmissions(administrationId, items),
      },
    });
    expect(response.status).toBe(200);
    const advance = response.body as StageAdvance;
    if (advance.complete) {
      break;
    }
    items = advance.items;
  }

  const finalized = await server.handle({
    token,
    body: { action: "finalize", administration_id: administrationId },
  });
  expect(finalized.status).toBe(200);
  return { administrationId, completed: finalized.body as CompletedDiagnostic };
}

describe("bearerToken", () => {
  it("parses a Bearer header case-insensitively and rejects others", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer xyz")).toBe("xyz");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("createDiagnosticServer", () => {
  it("rejects an unauthenticated caller with 401", async () => {
    const server = buildServer();
    const response = await server.handle({
      token: null,
      body: { action: "start", purpose: "pre" },
    });
    expect(response.status).toBe(401);
  });

  it("rejects a malformed body with 400", async () => {
    const server = buildServer();
    expect((await server.handle({ token: "alice", body: null })).status).toBe(400);
    expect((await server.handle({ token: "alice", body: { action: "nope" } })).status).toBe(
      400,
    );
    expect(
      (
        await server.handle({
          token: "alice",
          body: { action: "start", purpose: "sideways" },
        })
      ).status,
    ).toBe(400);
  });

  it("runs a full authenticated pretest to a finalized ability score", async () => {
    const server = buildServer();
    const { completed } = await aceAdministration(server, "alice", "pre");
    expect(completed.administration.student_id).toBe("stu-alice");
    expect(completed.administration.purpose).toBe("pre");
    expect(completed.administration.submitted_at).not.toBeNull();
    // Acing the real items routes up to the frontier -> theta = 3.
    expect(completed.ability_score).toBeCloseTo(3, 5);
    // The pretest doubles as placement: all six D1 nodes seeded.
    expect(Object.keys(completed.placement_by_node)).toHaveLength(6);
  });

  it("derives student_id from the token, never the payload", async () => {
    const server = buildServer();
    // Even if a caller tried to smuggle a student id in the body, `start` only
    // reads the authenticated identity, so the record belongs to the token owner.
    const start = await server.handle({
      token: "alice",
      body: { action: "start", purpose: "pre", student_id: "stu-bob" },
    });
    const body = start.body as { administration_id: string };
    // Ownership is enforced on the next call using the authenticated identity.
    const forbidden = await server.handle({
      token: "bob",
      body: {
        action: "finalize",
        administration_id: body.administration_id,
      },
    });
    expect(forbidden.status).toBe(403);
  });

  it("forbids acting on another student's administration", async () => {
    const server = buildServer();
    const start = await server.handle({
      token: "alice",
      body: { action: "start", purpose: "pre" },
    });
    const startBody = start.body as { administration_id: string; items: DiagnosticItem[] };

    const submit = await server.handle({
      token: "bob",
      body: {
        action: "submitStage",
        administration_id: startBody.administration_id,
        submissions: aceSubmissions(startBody.administration_id, startBody.items),
      },
    });
    expect(submit.status).toBe(403);

    const finalize = await server.handle({
      token: "bob",
      body: { action: "finalize", administration_id: startBody.administration_id },
    });
    expect(finalize.status).toBe(403);
  });
});

describe("handleDiagnosticFetch", () => {
  it("maps a fetch-style request (Bearer header + JSON body) to the server", async () => {
    const server = buildServer();
    const response = await handleDiagnosticFetch(server, {
      headers: {
        get: (name) => (name.toLowerCase() === "authorization" ? "Bearer alice" : null),
      },
      json: async () => ({ action: "start", purpose: "pre" }),
    });
    expect(response.status).toBe(200);
    expect((response.body as { administration_id: string }).administration_id).toBeTruthy();
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const server = buildServer();
    const response = await handleDiagnosticFetch(server, {
      headers: { get: () => "Bearer alice" },
      json: async () => {
        throw new Error("Unexpected token");
      },
    });
    expect(response.status).toBe(400);
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const server = buildServer();
    const response = await handleDiagnosticFetch(server, {
      headers: { get: () => null },
      json: async () => ({ action: "start", purpose: "pre" }),
    });
    expect(response.status).toBe(401);
  });
});
