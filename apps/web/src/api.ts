import { resolveDemoApiBaseUrl } from "./demo/demoMode";
import { SESSION_EXPIRED_EVENT } from "./auth/session";

/**
 * The deployed API base (…/api), derived from `VITE_DIAGNOSTIC_API_URL`
 * (…/api/diagnostic). Null when unset — the default local/CI setup, where the app
 * runs on the in-memory client + dev city with no server function.
 */
export function apiBaseUrl(): string | null {
  return resolveDemoApiBaseUrl(import.meta.env);
}

/**
 * Whether the session is server-backed: diagnostic records persist to the
 * student's account and the city reads real state from the API. Requires BOTH a
 * signed-in Cognito user AND a configured server endpoint (`VITE_DIAGNOSTIC_API_URL`,
 * via {@link apiBaseUrl}). When false the app runs the in-memory diagnostic client
 * and the dev city, so a pretest's placement has to be seeded into the local
 * session by hand. This is the single gate `createDiagnosticClient` and the pretest
 * handoff both read, so client persistence and the city seed can never disagree.
 */
export function isServerBacked(hasCognitoAuth: boolean): boolean {
  return hasCognitoAuth && apiBaseUrl() !== null;
}

/** An HTTP/edge failure with safe structured fields for feature-specific copy. */
export class ApiResponseError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.code = code;
  }
}

export type AccessTokenGetter = (forceRefresh?: boolean) => Promise<string | null>;

export interface ApiRequestOptions {
  /** Caller-owned cancellation. No shared default deadline: uploads and model work may run long. */
  readonly signal?: AbortSignal;
  /**
   * Defaults to true. A retryable launch mutation sets false so a post-refresh 401 stays on its
   * own Retry surface instead of navigating away before the learner can repeat it.
   */
  readonly dispatchSessionExpired?: boolean;
}

function sessionExpired(): ApiResponseError {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return new ApiResponseError(
    "Your session has expired. Sign in again to continue.",
    401,
    "session_expired",
  );
}

async function authenticatedFetch(
  url: string,
  init: RequestInit,
  getToken: AccessTokenGetter,
  options: ApiRequestOptions = {},
): Promise<Response> {
  async function send(token: string): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }

  const firstToken = await getToken(false);
  if (!firstToken) {
    throw sessionExpired();
  }
  const first = await send(firstToken);
  if (first.status !== 401) {
    return first;
  }

  const refreshedToken = await getToken(true);
  if (!refreshedToken) {
    throw sessionExpired();
  }
  const retried = await send(refreshedToken);
  if (retried.status === 401) {
    if (options.dispatchSessionExpired === false) {
      return retried;
    }
    throw sessionExpired();
  }
  return retried;
}

/** Authenticated GET with one forced Cognito refresh/retry after a 401. */
export async function apiGetJsonAuthenticated<T>(
  url: string,
  getToken: AccessTokenGetter,
  options: ApiRequestOptions = {},
): Promise<T> {
  return unwrapJson<T>(
    await authenticatedFetch(url, { signal: options.signal }, getToken, options),
  );
}

/** Authenticated POST with one forced Cognito refresh/retry after a 401. */
export async function apiPostJsonAuthenticated<T>(
  url: string,
  getToken: AccessTokenGetter,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return unwrapJson<T>(
    await authenticatedFetch(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: options.signal,
      },
      getToken,
      options,
    ),
  );
}

/** GET a sub-scoped JSON resource with the Cognito bearer token. */
export async function apiGetJson<T>(url: string, token: string | null): Promise<T> {
  const response = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return unwrapJson<T>(response);
}

/**
 * POST a sub-scoped JSON body with the Cognito bearer token.
 *
 * The server derives `student_id` from the verified token and never from the body, so
 * nothing here identifies the learner — see `services/diagnostic-api/src/writes.ts`.
 */
export async function apiPostJson<T>(
  url: string,
  token: string | null,
  body: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return unwrapJson<T>(response);
}

/**
 * The parsed body, or a throw carrying the service's own `error` string.
 *
 * Preferring the service's message matters more than it looks now that the city has a write
 * path: the API answers an unapplied migration with the command that fixes it
 * (`missingSchemaHint`), and a generic "The service failed (500)" would throw exactly that
 * sentence away.
 *
 * ## A 200 THAT IS NOT JSON IS A FAILURE, and it used to be a silent success
 *
 * This function read `await response.json().catch(() => null)` and then returned that
 * `null` as the result whenever the status was ok. That single fallback is the link that
 * turned an outage into data loss. `POST /api/city` 404'd at API Gateway; CloudFront's
 * distribution-wide error rewrite turned the 404 into `200 OK` carrying `index.html`;
 * `response.ok` was true, the HTML did not parse, and this handed the caller `null` as a
 * successful save. `apiCitySession` then ran its success branch and dropped the queued
 * city. Nothing logged, nothing alarmed, and the learner was told the opposite of the
 * truth.
 *
 * The rewrite is fixed at the edge (`infra/lib/calc-readiness-stack.ts`), but the edge is
 * not the only way to be handed HTML on a 200 — a proxy, a captive portal, a login
 * interstitial and a misconfigured CDN all do it. So the client refuses to guess: a body
 * that does not parse is an error whatever the status says, and the message carries the
 * content type and the first characters of what actually arrived, because "invalid JSON"
 * on its own does not tell you that you were served a web page.
 *
 * A JSON `null` is NOT that case and still succeeds. `GET /api/measurement` legitimately
 * answers `null` for a learner with no paired measurement, and `null` parses — the old
 * code could not tell that apart from a body it failed to read, which is precisely the
 * conflation being removed.
 */
export async function unwrapJson<T>(response: Response, subject = "service"): Promise<T> {
  // `text()` rather than `json()`, so a body that does not parse can be QUOTED back. The
  // difference between "the API said no" and "something else answered instead" is visible
  // in the first twenty characters and invisible in a thrown SyntaxError.
  const raw = await response.text();
  let payload: unknown = null;
  let parsed = false;
  try {
    payload = JSON.parse(raw) as unknown;
    parsed = true;
  } catch {
    parsed = false;
  }

  if (!response.ok) {
    const error = payload as { error?: unknown; code?: unknown } | null;
    const message =
      typeof error?.error === "string"
        ? error.error
        : `The ${subject} failed (${response.status}).`;
    throw new ApiResponseError(
      message,
      response.status,
      typeof error?.code === "string" ? error.code : undefined,
    );
  }
  if (!parsed) {
    throw new ApiResponseError(
      `The ${subject} answered ${response.status} with a body that is not JSON ` +
        `(${describeBody(response, raw)}). The request did not reach the API.`,
      response.status,
    );
  }
  return payload as T;
}

/** `content-type, starting "<!doctype html>"` — what arrived instead of the JSON. */
function describeBody(response: Response, raw: string): string {
  const contentType = response.headers.get("content-type") ?? "no content-type";
  const opening = raw.trim().replace(/\s+/g, " ").slice(0, 40);
  return opening === ""
    ? `${contentType}, empty`
    : `${contentType}, starting ${JSON.stringify(opening)}`;
}
