import type {
  CompletedDiagnostic,
  DiagnosticAdministrationStore,
  StageAdvance,
  StageServe,
} from "@cr/diagnostic";
import type { AssessmentItemSubmission, AssessmentPurpose, UUID } from "@cr/state-schema";

import type { DiagnosticRuntime } from "./runtime";

/**
 * The transport-agnostic browser_auth server core. The browser holds the auth
 * session (identity) but the three authoritative operations — response INSERT,
 * finalize UPDATE, progress + placement writes — are server-only (Contracts §5,
 * Diagnostic-Persistence amendment). So the whole engine runs here, server-side;
 * identity is derived from the caller's verified JWT and NEVER trusted from the
 * payload, and each mutating call is checked against the administration's owner.
 *
 * `createDiagnosticServer(...).handle({ token, body })` is the port-injected core
 * (used by the in-memory dev path + tests); `handleDiagnosticFetch` adapts any
 * web-`Request`-style handler. The deployable AWS-native composition
 * (Aurora Data API + Cognito) is `createAuroraDiagnosticServer` on the server-only
 * `@cr/diagnostic-runtime/aurora` entry.
 */

/** Identity resolved from the caller's bearer token. */
export interface DiagnosticIdentity {
  student_id: UUID;
}

/** Verifies a bearer token and resolves the authenticated student, or null. */
export type DiagnosticAuthenticator = (
  token: string | null,
) => Promise<DiagnosticIdentity | null>;

/** Only `pre`/`post` are client-initiable; `placement` is reserved server-internal. */
const CLIENT_PURPOSES: ReadonlySet<string> = new Set<AssessmentPurpose>(["pre", "post"]);

export interface DiagnosticServerRequest {
  token: string | null;
  body: unknown;
}

export interface DiagnosticServerResponse {
  status: number;
  body: unknown;
}

export interface DiagnosticServer {
  handle(request: DiagnosticServerRequest): Promise<DiagnosticServerResponse>;
}

export interface DiagnosticServerDeps {
  runtime: DiagnosticRuntime;
  store: DiagnosticAdministrationStore;
  authenticate: DiagnosticAuthenticator;
}

type ParsedCommand =
  | { action: "start"; purpose: AssessmentPurpose; form_id?: string }
  | {
      action: "submitStage";
      administration_id: UUID;
      submissions: readonly AssessmentItemSubmission[];
    }
  | { action: "finalize"; administration_id: UUID };

type ParseResult = { ok: true; command: ParsedCommand } | { ok: false; error: string };

/** Validate + normalize a request body into a `ParsedCommand` (shared by every server). */
export function parseCommand(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "request body must be a JSON object" };
  }
  const record = body as Record<string, unknown>;
  switch (record.action) {
    case "start": {
      if (typeof record.purpose !== "string" || !CLIENT_PURPOSES.has(record.purpose)) {
        return { ok: false, error: "purpose must be 'pre' or 'post'" };
      }
      return {
        ok: true,
        command: {
          action: "start",
          purpose: record.purpose as AssessmentPurpose,
          form_id: typeof record.form_id === "string" ? record.form_id : undefined,
        },
      };
    }
    case "submitStage": {
      if (typeof record.administration_id !== "string") {
        return { ok: false, error: "administration_id is required" };
      }
      if (!Array.isArray(record.submissions)) {
        return { ok: false, error: "submissions must be an array" };
      }
      return {
        ok: true,
        command: {
          action: "submitStage",
          administration_id: record.administration_id as UUID,
          submissions: record.submissions as AssessmentItemSubmission[],
        },
      };
    }
    case "finalize": {
      if (typeof record.administration_id !== "string") {
        return { ok: false, error: "administration_id is required" };
      }
      return {
        ok: true,
        command: {
          action: "finalize",
          administration_id: record.administration_id as UUID,
        },
      };
    }
    default:
      return { ok: false, error: `unknown action: ${String(record.action)}` };
  }
}

export function createDiagnosticServer(deps: DiagnosticServerDeps): DiagnosticServer {
  const { runtime, store, authenticate } = deps;

  async function requireOwner(administrationId: UUID, studentId: UUID): Promise<boolean> {
    const administration = await store.getAdministration(administrationId);
    return administration.student_id === studentId;
  }

  return {
    async handle(request) {
      const identity = await authenticate(request.token);
      if (!identity) {
        return { status: 401, body: { error: "unauthorized" } };
      }

      const parsed = parseCommand(request.body);
      if (!parsed.ok) {
        return { status: 400, body: { error: parsed.error } };
      }
      const command = parsed.command;

      try {
        switch (command.action) {
          case "start": {
            const served: StageServe = await runtime.engine.start(
              runtime.newAdministration({
                student_id: identity.student_id,
                purpose: command.purpose,
                form_id: command.form_id,
              }),
            );
            return {
              status: 200,
              body: {
                administration_id: served.administration.administration_id,
                stage_id: served.stage_id,
                items: served.items,
              },
            };
          }
          case "submitStage": {
            if (!(await requireOwner(command.administration_id, identity.student_id))) {
              return { status: 403, body: { error: "forbidden" } };
            }
            // Force the server's administration id + checker version onto every
            // submission — never trust client-claimed ids; `authoritative_correct`
            // is recomputed server-side regardless of `client_correct`.
            const submissions: AssessmentItemSubmission[] = command.submissions.map(
              (submission) => ({
                ...submission,
                administration_id: command.administration_id,
                equivalence_checker_version: runtime.versions.equivalence_checker_version,
              }),
            );
            const advance: StageAdvance = await runtime.engine.submitStage(
              command.administration_id,
              submissions,
            );
            return { status: 200, body: advance };
          }
          case "finalize": {
            if (!(await requireOwner(command.administration_id, identity.student_id))) {
              return { status: 403, body: { error: "forbidden" } };
            }
            const completed: CompletedDiagnostic = await runtime.engine.finalize(
              command.administration_id,
            );
            return { status: 200, body: completed };
          }
        }
      } catch (error) {
        return {
          status: 500,
          body: { error: error instanceof Error ? error.message : "internal error" },
        };
      }
    },
  };
}

/** The subset of the web `Request` this handler needs (kept DOM-free for the lib). */
export interface FetchLikeRequest {
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

/** Parse a `Bearer <token>` Authorization header. */
export function bearerToken(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? null;
}

/**
 * Map a fetch-style request (web `Request`, API Gateway/Lambda, etc.) to the server.
 * The deploy shim wraps the result: `new Response(JSON.stringify(res.body),
 * { status: res.status, headers: { "content-type": "application/json" } })`.
 */
export async function handleDiagnosticFetch(
  server: DiagnosticServer,
  request: FetchLikeRequest,
): Promise<DiagnosticServerResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { error: "invalid JSON body" } };
  }
  const token = bearerToken(request.headers.get("authorization"));
  return server.handle({ token, body });
}
