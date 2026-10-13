import {
  bearerToken,
  type DiagnosticServer,
  type DiagnosticServerResponse,
  handleDiagnosticFetch,
} from "@cr/diagnostic-runtime";
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { BugReportService } from "./bugReports";
import type { BetaMetricsService } from "./betaMetrics";
import type { MasteryWriteService } from "./mastery";
import type { PlagueStateService } from "./plagueState";
import type { SuccessionCommandService } from "./succession";
import type { WorkUploadService } from "./workUpload";
import type { WorkUploadParseService } from "./workUploadParse";

/**
 * The deployable browser_auth HTTP surface. A thin, transport-portable wrapper
 * (Hono → Web `Request`/`Response`, which is exactly what `handleDiagnosticFetch`
 * consumes) around the Aurora (RDS Data API) + Cognito diagnostic server. Routes
 * are mounted under `/api` so a single CloudFront distribution can send `/api/*`
 * here and everything else to the static SPA (same origin → no CORS in the
 * deployed setup; the CORS middleware still covers split-origin / local-dev).
 *
 * `getServer`/`getReads` are injected and memoized by the caller (the composition
 * root builds them from env — Aurora cluster + Cognito pool), so this module is
 * pure and unit-testable with in-memory doubles.
 */

/** Cognito-verified, `sub`-scoped read endpoints (GET). Each returns `{status, body}`. */
export interface DiagnosticReadService {
  /** GET /api/city — the signed-in student's node + neighborhood state. */
  city(token: string | null): Promise<DiagnosticServerResponse>;
  /** GET /api/measurement — the signed-in student's pre/post gain (or `null`). */
  measurement(token: string | null): Promise<DiagnosticServerResponse>;
}

/**
 * Cognito-verified, `sub`-scoped write endpoints (POST). Same contract as the read
 * service: the token is verified inside the method, the student id comes from the verified
 * claim and never from the body, and an unverified caller gets 401 before the body is even
 * parsed. `services/diagnostic-api/src/routeAuthGate.test.ts` derives the whole route table
 * off the app below and holds every city/measurement route to that, so a route added here
 * without the check fails rather than shipping open.
 */
export interface DiagnosticWriteService {
  /** POST /api/city/bootstrap — found Prehistoric exactly once for an untouched account. */
  bootstrapCity(token: string | null): Promise<DiagnosticServerResponse>;
  /** POST /api/city — store the signed-in student's whole city layout. */
  saveCity(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
  /** POST /api/city/reset — atomically clear one island and refill its wallet. */
  resetIsland(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
}

/** Cognito-scoped, server-authoritative material ledger. */
export interface EconomyService {
  read(token: string | null, era: string | null): Promise<DiagnosticServerResponse>;
  act(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
}

export interface DiagnosticApiOptions {
  /** Resolve the (cached) diagnostic action server (POST /api/diagnostic). */
  getServer: () => DiagnosticServer | Promise<DiagnosticServer>;
  /** Resolve the (cached) read service. Omit to expose only the action server. */
  getReads?: () => DiagnosticReadService | Promise<DiagnosticReadService>;
  /**
   * Resolve the (cached) write service. Omit to expose the city read-only, which is what
   * every deployment did before the write path existed. `createApiProviders` always
   * supplies it, and `app.test.ts` asserts that the composition root does — a writer with
   * no route is the same outage as no writer at all, and it would be invisible from here.
   */
  getWrites?: () => DiagnosticWriteService | Promise<DiagnosticWriteService>;
  /**
   * Resolve the (cached) learning-record writer — the only thing in this surface allowed to
   * move `mastery` or `lesson_stage`. Omit to expose the learning record read-only, which is
   * what every deployment before it existed did, and which is the shape whose visible
   * symptom was a building that never left Foundation for a signed-in learner.
   * `createApiProviders` always supplies it, and `routeAuthGate.test.ts` asserts that the
   * composition root does — the writer existing with no route mounted is the same outage as
   * no writer at all, and just as invisible from here.
   */
  getMastery?: () => MasteryWriteService | Promise<MasteryWriteService>;
  /** Server-authoritative Era 4 battle commands and exact-state reload. */
  getSuccession?: () => SuccessionCommandService | Promise<SuccessionCommandService>;
  /** Resolve the signed-in Care House state machine. Omit to expose no Plague route. */
  getPlague?: () => PlagueStateService | Promise<PlagueStateService>;
  /** Resolve the persisted economy service. Omit for the legacy in-memory economy. */
  getEconomy?: () => EconomyService | Promise<EconomyService>;
  /**
   * Resolve the (cached) photo-of-work upload service (`docs/Photo_Work_Upload_Scope.md`).
   * Omit to expose no upload routes at all, which is what every deployment before the
   * uploads bucket existed did — and is the honest shape for one where
   * `WORK_UPLOAD_BUCKET` is unset. `createApiProviders` always supplies it, and
   * `routeAuthGate.test.ts` asserts that the composition root does.
   */
  getWorkUploads?: () => WorkUploadService | Promise<WorkUploadService>;
  /**
   * Resolve the (cached) v2 vision parse (`docs/Photo_Work_Upload_Scope.md` §3.5, whose gate
   * was lifted 2026-08-05 — read that banner before touching this lane). Omit to expose no
   * parse route, which is the shape every deployment before the ruling had and the honest
   * one for a deployment that does not want to spend on a model at all: the four store-only
   * upload routes are unaffected by its absence. `createApiProviders` always supplies it,
   * and `routeAuthGate.test.ts` asserts that the composition root does.
   */
  getWorkUploadParse?: () => WorkUploadParseService | Promise<WorkUploadParseService>;
  /** Authenticated, privacy-minimized beta bug report intake. */
  getBugReports?: () => BugReportService | Promise<BugReportService>;
  /** Public aggregate beta telemetry. The service must never return student records. */
  getBetaMetrics?: () => BetaMetricsService | Promise<BetaMetricsService>;
  /** Allowed browser origin(s). Defaults to "*"; set to the SPA origin in prod. */
  allowedOrigins?: string | string[];
}

/** Serialize a `{status, body}` result to a JSON Response (Hono-typing-free). */
function jsonResponse({ status, body }: DiagnosticServerResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function createDiagnosticApi(options: DiagnosticApiOptions): Hono {
  const app = new Hono().basePath("/api");

  app.use(
    "*",
    cors({
      origin: options.allowedOrigins ?? "*",
      allowHeaders: ["authorization", "content-type"],
      // DELETE is here for the work-upload lane: §6 requires student-initiated deletion of
      // a photo, and a preflight the middleware refuses is a delete the browser never sends.
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      maxAge: 86400,
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));

  if (options.getBetaMetrics) {
    app.get("/metrics", async (c) => {
      const metrics = await options.getBetaMetrics?.();
      if (!metrics) {
        return c.json({ error: "metrics unavailable" }, 503);
      }
      const response = jsonResponse(await metrics.read());
      response.headers.set(
        "cache-control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
      );
      return response;
    });
  }

  app.post("/diagnostic", async (c) => {
    const server = await options.getServer();
    // Return a raw Response so we don't depend on Hono's StatusCode typing; the
    // CORS middleware still decorates it. Body is already a plain JSON value.
    return jsonResponse(await handleDiagnosticFetch(server, c.req.raw));
  });

  // THE PER-STUDENT BLOCK. Every route below reaches one student's own state, and every
  // one of them hands the bearer token to a service that verifies it and scopes the work to
  // the verified `sub` (see `reads.ts`'s `scoped` and `writes.ts`'s `saveCity`). Nothing
  // here trusts a path, a query or a body for identity, and `POST /city` is inside the
  // block for exactly that reason: a write is the direction where trusting the payload
  // would let one learner overwrite another's city.
  const {
    getReads,
    getWrites,
    getSuccession,
    getPlague,
    getEconomy,
    getWorkUploads,
    getWorkUploadParse,
    getMastery,
    getBugReports,
  } = options;
  if (getBugReports) {
    app.post("/bug-report", async (c) => {
      const reports = await getBugReports();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await reports.submit(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
  }
  if (getReads) {
    app.get("/city", async (c) => {
      const reads = await getReads();
      return jsonResponse(
        await reads.city(bearerToken(c.req.header("authorization") ?? null)),
      );
    });
    app.get("/measurement", async (c) => {
      const reads = await getReads();
      return jsonResponse(
        await reads.measurement(bearerToken(c.req.header("authorization") ?? null)),
      );
    });
  }
  if (getWrites) {
    app.post("/city/bootstrap", async (c) => {
      const writes = await getWrites();
      return jsonResponse(
        await writes.bootstrapCity(bearerToken(c.req.header("authorization") ?? null)),
      );
    });
    app.post("/city", async (c) => {
      const writes = await getWrites();
      // A malformed body is the service's 400 to give, not a Hono throw: the write service
      // names which field refused, and `c.req.json()` would answer with a parse error the
      // client author cannot act on.
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await writes.saveCity(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
    app.post("/city/reset", async (c) => {
      const writes = await getWrites();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await writes.resetIsland(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
  }
  if (getMastery) {
    // THE TWO WRITES `POST /city` REFUSES, mounted apart from it because they are a
    // different kind of claim. The city body is a layout the browser owns; these two carry
    // raw answers and a stage, and what they write is derived here (see `mastery.ts`).
    app.post("/mastery/evidence", async (c) => {
      const mastery = await getMastery();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await mastery.submitEvidence(
          bearerToken(c.req.header("authorization") ?? null),
          body,
        ),
      );
    });
    app.post("/lesson/stage", async (c) => {
      const mastery = await getMastery();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await mastery.setLessonStage(
          bearerToken(c.req.header("authorization") ?? null),
          body,
        ),
      );
    });
  }
  if (getEconomy) {
    app.get("/economy", async (c) => {
      const economy = await getEconomy();
      return jsonResponse(
        await economy.read(
          bearerToken(c.req.header("authorization") ?? null),
          c.req.query("era") ?? null,
        ),
      );
    });
    app.post("/economy", async (c) => {
      const economy = await getEconomy();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await economy.act(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
  }
  if (getPlague) {
    app.get("/plague", async (c) => {
      const plague = await getPlague();
      return jsonResponse(
        await plague.read(bearerToken(c.req.header("authorization") ?? null)),
      );
    });
    app.post("/plague", async (c) => {
      const plague = await getPlague();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await plague.act(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
  }
  if (getSuccession) {
    app.get("/succession", async (c) => {
      const succession = await getSuccession();
      return jsonResponse(
        await succession.load(bearerToken(c.req.header("authorization") ?? null)),
      );
    });
    app.post("/succession", async (c) => {
      const succession = await getSuccession();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await succession.command(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
  }
  if (getWorkUploads) {
    // THE PHOTO-OF-WORK ROUTES, all four inside the per-student block for the same reason
    // `POST /city` is: every one of them reaches an artifact that belongs to exactly one
    // learner. The service verifies the token itself and derives `student_id` from the
    // verified `sub`; nothing below reads an identity out of a query, a path or a body, and
    // the object key is never accepted from a caller at all (see `workUpload.ts`).
    app.post("/work-upload", async (c) => {
      const uploads = await getWorkUploads();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await uploads.presign(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
    app.post("/work-upload/complete", async (c) => {
      const uploads = await getWorkUploads();
      const body = await c.req.json().catch(() => null);
      return jsonResponse(
        await uploads.complete(bearerToken(c.req.header("authorization") ?? null), body),
      );
    });
    app.get("/work-upload", async (c) => {
      const uploads = await getWorkUploads();
      return jsonResponse(
        await uploads.list(
          bearerToken(c.req.header("authorization") ?? null),
          c.req.query("item") ?? null,
        ),
      );
    });
    app.delete("/work-upload", async (c) => {
      const uploads = await getWorkUploads();
      return jsonResponse(
        await uploads.remove(
          bearerToken(c.req.header("authorization") ?? null),
          c.req.query("id") ?? null,
        ),
      );
    });
  }
  if (getWorkUploadParse) {
    // THE v2 PARSE, mounted beside the four store-only routes and gated the same way. It is
    // its own registration rather than a branch inside `complete` on purpose: ingest never
    // calls a model, so uploading a photo is not consenting to have one read it, an upload
    // nobody looks at costs nothing, and the model call is a request somebody makes rather
    // than an `if` somebody deletes (`workUploadParse.ts` has the full reasoning).
    app.post("/work-upload/parse", async (c) => {
      const token = bearerToken(c.req.header("authorization") ?? null);
      if (token === null) {
        return jsonResponse({ status: 401, body: { error: "unauthorized" } });
      }
      let parses: WorkUploadParseService;
      try {
        parses = await getWorkUploadParse();
      } catch {
        // Configuration details belong in Lambda logs, never in a learner response.
        console.error("work-upload parse is not configured");
        return jsonResponse({
          status: 503,
          body: {
            error: "automated reading is not configured; the upload is still saved",
            code: "parse_unconfigured",
          },
        });
      }
      const body = await c.req.json().catch(() => null);
      return jsonResponse(await parses.parse(token, body));
    });
  }

  return app;
}
