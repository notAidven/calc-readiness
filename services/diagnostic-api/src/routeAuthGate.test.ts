import type { DiagnosticServer } from "@cr/diagnostic-runtime";
import { describe, expect, it } from "vitest";

import { createDiagnosticApi } from "./app";
import { createApiProviders } from "./env";

/**
 * **EVERY PER-STUDENT ROUTE IS COGNITO-GATED, AND THE POPULATION IS THE APP'S OWN ROUTE
 * TABLE.**
 *
 * `POST /api/city` is the first route that WRITES a learner's state, so "is it gated" stops
 * being a question about reading somebody else's city and becomes one about overwriting it.
 * Answering it by naming the routes would answer it only for the routes somebody remembered:
 * the population here is `app.routes`, which Hono builds from the registrations themselves,
 * so a route added to `app.ts` tomorrow is inside this sweep whether or not anyone comes back
 * to this file.
 *
 * ## The exemptions are named, and they fail both ways
 *
 * Two routes genuinely do not owe a 401, and an unauthenticated route that does not owe one
 * looks exactly like one that forgot. So each is named with its reason and asserted in both
 * directions: an exemption whose route no longer exists fails (a stale exemption is
 * indistinguishable from coverage), and an exemption that starts answering 401 fails too (so
 * the list cannot go on excusing something it has stopped describing).
 *
 * ## Why the composition root is here too
 *
 * A write service that nothing injects is the same outage as no write service: the route is
 * simply absent, `POST /api/city` 404s, and every test in this file would still pass because
 * they construct the app themselves. `createApiProviders` is the only thing `lambda.ts` and
 * `node.ts` use, so it is what has to be asked.
 */

const ORIGIN = "https://app.example.com";

function stubServer(): DiagnosticServer {
  return { handle: async () => ({ status: 200, body: { ok: true } }) };
}

/** The app as production builds it: action server + reads + writes. */
function fullApp() {
  return createDiagnosticApi({
    allowedOrigins: ORIGIN,
    getServer: stubServer,
    getReads: () => ({
      city: async (token) =>
        token === "jwt"
          ? { status: 200, body: { city: true } }
          : { status: 401, body: { error: "unauthorized" } },
      measurement: async (token) =>
        token === "jwt"
          ? { status: 200, body: { measurement: true } }
          : { status: 401, body: { error: "unauthorized" } },
    }),
    getWrites: () => ({
      bootstrapCity: async (token) =>
        token === "jwt"
          ? { status: 200, body: { launch_initialized: true } }
          : { status: 401, body: { error: "unauthorized" } },
      saveCity: async (token) =>
        token === "jwt"
          ? { status: 200, body: { saved: true } }
          : { status: 401, body: { error: "unauthorized" } },
      resetIsland: async (token) =>
        token === "jwt"
          ? { status: 200, body: { reset: true } }
          : { status: 401, body: { error: "unauthorized" } },
    }),
    // The learning-record writer, in this population for the strongest version of the
    // reason the city write is: an ungated route here would let an unauthenticated caller
    // move somebody else's mastery, which is the one piece of state in the product that is
    // supposed to mean something about a person.
    getMastery: () => {
      const gate = async (token: string | null) =>
        token === "jwt"
          ? { status: 200, body: { ok: true } }
          : { status: 401, body: { error: "unauthorized" } };
      return {
        submitEvidence: (token: string | null) => gate(token),
        setLessonStage: (token: string | null) => gate(token),
      };
    },
    getSuccession: () => {
      const gate = async (token: string | null) =>
        token === "jwt"
          ? { status: 200, body: { battle: null } }
          : { status: 401, body: { error: "unauthorized" } };
      return {
        load: (token) => gate(token),
        command: (token) => gate(token),
      };
    },
    getPlague: () => {
      const gate = async (token: string | null) =>
        token === "jwt"
          ? { status: 200, body: { care_house: true } }
          : { status: 401, body: { error: "unauthorized" } };
      return {
        read: (token: string | null) => gate(token),
        act: (token: string | null) => gate(token),
      };
    },
    getEconomy: () => {
      const gate = async (token: string | null) =>
        token === "jwt"
          ? { status: 200, body: { ok: true } }
          : { status: 401, body: { error: "unauthorized" } };
      return {
        read: (token) => gate(token),
        act: (token) => gate(token),
      };
    },
    // The photo-of-work routes are in this population for the same reason the city write is:
    // they reach one learner's own artifact. A stub is enough here — whether the SERVICE
    // scopes to the verified `sub` is `workUpload.test.ts`'s subject; whether the ROUTE can
    // be reached without a token is this file's, and a service the app never asks for a
    // token on would answer 200 below.
    getWorkUploads: () => {
      const gate = async (token: string | null) =>
        token === "jwt"
          ? { status: 200, body: { ok: true } }
          : { status: 401, body: { error: "unauthorized" } };
      return {
        presign: (token) => gate(token),
        complete: (token) => gate(token),
        list: (token) => gate(token),
        remove: (token) => gate(token),
      };
    },
    // The v2 vision parse, in the same population and for a stronger version of the same
    // reason: an ungated parse route would not merely read somebody else's photograph, it
    // would SEND it to a model — and bill us for the privilege.
    getWorkUploadParse: () => ({
      parse: async (token) =>
        token === "jwt"
          ? { status: 200, body: { ok: true } }
          : { status: 401, body: { error: "unauthorized" } },
    }),
    getBugReports: () => ({
      submit: async (token) =>
        token === "jwt"
          ? { status: 200, body: { submitted: true } }
          : { status: 401, body: { error: "unauthorized" } },
    }),
    getBetaMetrics: () => ({
      read: async () => ({ status: 200, body: { registered_users: 12 } }),
    }),
  });
}

/**
 * Routes that answer without a token, each with the reason it may. `OPTIONS` is not listed:
 * it is the CORS middleware's preflight and is registered as a wildcard `ALL` handler rather
 * than as a route of its own, so it never appears in the population below.
 */
const OPEN_ROUTES: ReadonlyMap<string, string> = new Map([
  [
    "GET /api/health",
    "a liveness probe reaches no student state at all and is called by the load balancer, " +
      "which holds no token and could not be given one",
  ],
  [
    "POST /api/diagnostic",
    "the action server verifies the bearer token ITSELF, inside `handleDiagnosticFetch`, " +
      "and answers a missing one with its own error envelope rather than a bare 401 — so " +
      "it is gated, just not by a status this sweep can read",
  ],
  [
    "GET /api/metrics",
    "a deliberately public beta snapshot returns aggregate counts only; it accepts no " +
      "student identifier and its service never returns Cognito profiles or student rows",
  ],
]);

/** `METHOD /path` for every route Hono registered, deduplicated and middleware removed. */
function routeTable(): string[] {
  const app = fullApp();
  const routes = new Set<string>();
  for (const route of app.routes) {
    // The CORS middleware registers `ALL /api/*`; a route is a concrete method and path.
    if (route.method === "ALL" || route.path.includes("*")) {
      continue;
    }
    routes.add(`${route.method} ${route.path}`);
  }
  return [...routes].sort();
}

const ROUTES = routeTable();
const GATED = ROUTES.filter((route) => !OPEN_ROUTES.has(route));

describe("the per-student routes are gated", () => {
  it("derives a real route table", () => {
    // Floors on BOTH halves. A `routes` shape Hono changed under us would leave this empty
    // and every 401 assertion below would hold over nothing; and the gated half needs its
    // own floor, because two exemptions over a two-route table would also be "green".
    expect(ROUTES.length).toBeGreaterThanOrEqual(9);
    expect(GATED.length).toBeGreaterThanOrEqual(8);
    expect(GATED).toContain("POST /api/city");
    expect(GATED).toContain("POST /api/city/bootstrap");
    expect(GATED).toContain("POST /api/city/reset");
    expect(GATED).toContain("GET /api/city");
    // Named rather than left to the floor, because these two are the only routes that can
    // move a learning record and a floor of eight is satisfied without them.
    expect(GATED).toContain("POST /api/mastery/evidence");
    expect(GATED).toContain("POST /api/lesson/stage");
    expect(GATED).toContain("GET /api/economy");
    expect(GATED).toContain("POST /api/economy");
    expect(GATED).toContain("GET /api/measurement");
    expect(GATED).toContain("GET /api/succession");
    expect(GATED).toContain("POST /api/succession");
    expect(GATED).toContain("GET /api/plague");
    expect(GATED).toContain("POST /api/plague");
    // A floor constrains size, not shape: each of these is in the population only while its
    // service is injected, so name them rather than trusting the count. All four reach a
    // student's own uploaded photograph.
    expect(GATED).toContain("POST /api/work-upload");
    expect(GATED).toContain("POST /api/work-upload/complete");
    expect(GATED).toContain("GET /api/work-upload");
    expect(GATED).toContain("DELETE /api/work-upload");
    expect(GATED).toContain("POST /api/work-upload/parse");
    expect(GATED).toContain("POST /api/bug-report");
    expect(ROUTES).toContain("GET /api/metrics");
  });

  it("answers 401 on every gated route when the request carries no token", async () => {
    const app = fullApp();
    for (const route of GATED) {
      const [method, path] = route.split(" ");
      const response = await app.request(String(path), {
        method,
        headers: { "content-type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({}) } : {}),
      });
      expect(response.status, `${route} without a token`).toBe(401);
    }
  });

  it("answers 401 on every gated route when the token is not a bearer token", async () => {
    // `bearerToken` returns null for a header that is not `Bearer …`, which is the shape a
    // caller who pasted a raw JWT into `authorization` produces.
    const app = fullApp();
    for (const route of GATED) {
      const [method, path] = route.split(" ");
      const response = await app.request(String(path), {
        method,
        headers: { authorization: "jwt", "content-type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({}) } : {}),
      });
      expect(response.status, `${route} with a malformed authorization header`).toBe(401);
    }
  });

  it("lets a verified caller through, so the 401s above are the gate and not a 404", async () => {
    // Without this, deleting a route entirely would turn every assertion above green.
    const app = fullApp();
    for (const route of GATED) {
      const [method, path] = route.split(" ");
      const response = await app.request(String(path), {
        method,
        headers: { authorization: "Bearer jwt", "content-type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({}) } : {}),
      });
      expect(response.status, `${route} with a verified token`).toBe(200);
    }
  });

  it("keeps each open route honest in both directions", async () => {
    const app = fullApp();
    for (const [route, why] of OPEN_ROUTES) {
      expect(why.length).toBeGreaterThan(40);
      // Forwards: an exemption for a route that no longer exists exempts nothing, and would
      // sit here looking like coverage.
      expect(ROUTES, `${route} is exempted but is no longer a route`).toContain(route);
      // Backwards: an exemption for a route that has started answering 401 is stale, and
      // leaving it would excuse the next route somebody adds beside it.
      const [method, path] = route.split(" ");
      const response = await app.request(String(path), {
        method,
        headers: { "content-type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({ action: "start" }) } : {}),
      });
      expect(response.status, `${route} is gated now — take it off the open list`).not.toBe(
        401,
      );
    }
  });
});

describe("the composition root wires both directions", () => {
  it("supplies a write service, not just a read service", () => {
    // Env values only; nothing here opens a socket (`CognitoJwtVerifier.create` is lazy and
    // `RDSDataClient` resolves credentials on first send).
    const providers = createApiProviders({
      DB_CLUSTER_ARN: "arn:aws:rds:us-east-1:1:cluster:cr",
      DB_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
      DB_NAME: "calc",
      COGNITO_USER_POOL_ID: "us-east-1_test",
      COGNITO_CLIENT_ID: "client",
    });

    expect(typeof providers.getWrites).toBe("function");
    const writes = providers.getWrites();
    expect(typeof writes.bootstrapCity).toBe("function");
    expect(typeof writes.saveCity).toBe("function");
    expect(typeof providers.getSuccession).toBe("function");
    expect(typeof providers.getSuccession().command).toBe("function");
    expect(typeof writes.resetIsland).toBe("function");
    expect(typeof providers.getEconomy().read).toBe("function");
    expect(typeof providers.getEconomy().act).toBe("function");
    // Memoized, like the others: a fresh service per request would build a fresh JWKS
    // verifier per request.
    expect(providers.getWrites()).toBe(writes);
    expect(providers.getSuccession()).toBe(providers.getSuccession());
    expect(providers.getReads()).toBe(providers.getReads());
    expect(typeof providers.getPlague().act).toBe("function");
    expect(providers.getPlague()).toBe(providers.getPlague());
    expect(typeof providers.getBugReports().submit).toBe("function");
    expect(providers.getBugReports()).toBe(providers.getBugReports());
    expect(typeof providers.getBetaMetrics().read).toBe("function");
    expect(providers.getBetaMetrics()).toBe(providers.getBetaMetrics());
  });

  it("supplies the mastery service, so the learning record is not silently read-only", () => {
    // The exact outage this lane was built to end, and it would be invisible from `app.ts`:
    // with no provider the two routes are simply not mounted, every call 404s, the browser's
    // stage write fails quietly, and every test in this file still passes because they all
    // inject their own stub. That is how the learning record came to have no writer at all.
    const providers = createApiProviders({
      DB_CLUSTER_ARN: "arn:aws:rds:us-east-1:1:cluster:cr",
      DB_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
      DB_NAME: "calc",
      COGNITO_USER_POOL_ID: "us-east-1_test",
      COGNITO_CLIENT_ID: "client",
    });

    expect(typeof providers.getMastery).toBe("function");
    const mastery = providers.getMastery();
    expect(typeof mastery.submitEvidence).toBe("function");
    expect(typeof mastery.setLessonStage).toBe("function");
    expect(providers.getMastery()).toBe(mastery);
  });

  it("supplies the work-upload service, so its four routes are not silently absent", () => {
    // Same failure mode as a missing write service, and just as invisible from the app: the
    // routes simply would not exist, every request would 404, and every test in this file
    // would still pass because they inject their own stub.
    const providers = createApiProviders({
      DB_CLUSTER_ARN: "arn:aws:rds:us-east-1:1:cluster:cr",
      DB_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
      DB_NAME: "calc",
      COGNITO_USER_POOL_ID: "us-east-1_test",
      COGNITO_CLIENT_ID: "client",
      WORK_UPLOAD_BUCKET: "cr-work-uploads",
    });

    const uploads = providers.getWorkUploads();
    for (const method of ["presign", "complete", "list", "remove"] as const) {
      expect(typeof uploads[method]).toBe("function");
    }
    expect(providers.getWorkUploads()).toBe(uploads);
  });

  it("supplies the parse service, and only when a model is configured", async () => {
    const base = {
      DB_CLUSTER_ARN: "arn:aws:rds:us-east-1:1:cluster:cr",
      DB_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
      DB_NAME: "calc",
      COGNITO_USER_POOL_ID: "us-east-1_test",
      COGNITO_CLIENT_ID: "client",
      WORK_UPLOAD_BUCKET: "cr-work-uploads",
    };
    const configured = createApiProviders({
      ...base,
      WORK_UPLOAD_PARSE_MODEL: "a-vision-model",
    });
    const parse = configured.getWorkUploadParse();
    expect(typeof parse.parse).toBe("function");
    // Memoized like the others: a fresh service per request would build a fresh model
    // client, and — on the key-bearing provider — a fresh Secrets Manager read per request.
    expect(configured.getWorkUploadParse()).toBe(parse);

    // No model id, no parse. The failure names the variable, which is the whole reason
    // there is no default: a WRONG model id fails on a learner's request and degrades
    // silently to "we couldn't read your work this time".
    expect(() => createApiProviders(base).getWorkUploadParse()).toThrow(
      /WORK_UPLOAD_PARSE_MODEL/,
    );
    // And nothing else goes down with it.
    expect(typeof createApiProviders(base).getWorkUploads().presign).toBe("function");
  });

  it("returns a safe store-only response when parse configuration is absent", async () => {
    const providers = createApiProviders({
      DB_CLUSTER_ARN: "arn:aws:rds:us-east-1:1:cluster:cr",
      DB_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
      DB_NAME: "calc",
      COGNITO_USER_POOL_ID: "us-east-1_test",
      COGNITO_CLIENT_ID: "client",
      WORK_UPLOAD_BUCKET: "cr-work-uploads",
    });
    const app = createDiagnosticApi({
      getServer: stubServer,
      getWorkUploadParse: providers.getWorkUploadParse,
    });

    const anonymous = await app.request("/api/work-upload/parse", { method: "POST" });
    expect(anonymous.status).toBe(401);

    const configuredOff = await app.request("/api/work-upload/parse", {
      method: "POST",
      headers: {
        authorization: "Bearer any-present-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ uploadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    });
    expect(configuredOff.status).toBe(503);
    expect(await configuredOff.json()).toEqual({
      error: "automated reading is not configured; the upload is still saved",
      code: "parse_unconfigured",
    });
  });

  it("refuses a spend cap it cannot read, rather than treating it as no cap", () => {
    // A budget that silently became `NaN` would compare false against every ceiling and turn
    // the cap off — the one failure mode a spend limit must not have. So a typo is a boot
    // failure on this provider, not a quiet unbounded month.
    for (const bad of ["two dollars", "-1", "NaN"]) {
      expect(() =>
        createApiProviders({
          DB_CLUSTER_ARN: "arn:aws:rds:us-east-1:1:cluster:cr",
          DB_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
          DB_NAME: "calc",
          COGNITO_USER_POOL_ID: "us-east-1_test",
          COGNITO_CLIENT_ID: "client",
          WORK_UPLOAD_BUCKET: "cr-work-uploads",
          WORK_UPLOAD_PARSE_MODEL: "a-vision-model",
          WORK_UPLOAD_PARSE_DAILY_USD: bad,
        }).getWorkUploadParse(),
      ).toThrow(/WORK_UPLOAD_PARSE_DAILY_USD/);
    }
  });

  it("answers the upload routes with the missing variable when the bucket is unconfigured", async () => {
    // A deployment that predates the uploads bucket must keep serving the city and the
    // diagnostic. `WORK_UPLOAD_BUCKET` is read lazily, so its absence is a 500 naming the
    // variable on these four routes and nothing else — not a Lambda that fails to boot.
    const providers = createApiProviders({
      DB_CLUSTER_ARN: "arn:aws:rds:us-east-1:1:cluster:cr",
      DB_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:1:secret:cr",
      DB_NAME: "calc",
      COGNITO_USER_POOL_ID: "us-east-1_test",
      COGNITO_CLIENT_ID: "client",
    });
    expect(() => providers.getWorkUploads()).toThrow(/WORK_UPLOAD_BUCKET/);
    // The rest of the composition root is unaffected by that.
    expect(typeof providers.getReads().city).toBe("function");
    expect(typeof providers.getWrites().saveCity).toBe("function");
  });

  it("mounts POST /api/city only when a write service is injected", async () => {
    // The pre-write-path deployment shape, and the one every existing `app.test.ts` case
    // uses: reads without writes must still be a legal app rather than a crash.
    const readOnly = createDiagnosticApi({
      getServer: stubServer,
      getReads: () => ({
        city: async () => ({ status: 200, body: {} }),
        measurement: async () => ({ status: 200, body: {} }),
      }),
    });
    const response = await readOnly.request("/api/city", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(404);
  });
});
