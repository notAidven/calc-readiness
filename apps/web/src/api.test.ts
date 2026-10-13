import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiGetJson,
  apiGetJsonAuthenticated,
  apiPostJson,
  apiPostJsonAuthenticated,
  ApiResponseError,
} from "./api";
import { SESSION_EXPIRED_EVENT } from "./auth/session";

/**
 * **A 200 THAT IS NOT JSON IS THE OUTAGE, NOT THE RESULT.**
 *
 * The body every case below serves is not invented. `POST /api/city` was never declared in
 * the CDK route table, so API Gateway 404'd it; CloudFront's custom error responses are
 * distribution-wide and mapped 403/404 to `200 /index.html`, so the SPA's own HTML came
 * back with a `200 OK`. `unwrapJson`'s predecessor did `await response.json().catch(() =>
 * null)` and returned that `null` as a SUCCESS, and `apiCitySession` ran its success branch
 * and dropped the learner's city.
 *
 * The edge is fixed, and these cases are about the client refusing to be fooled anyway: a
 * proxy, a captive portal and a login interstitial all answer a request with HTML and a
 * 200, and none of them is a save.
 */

/** What CloudFront actually returned: the SPA's index.html under a 200. */
const SPA_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8" />' +
  '<title>calc-readiness</title></head><body><div id="root"></div></body></html>';

function serve(body: string, status = 200, contentType = "text/html"): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(body, { status, headers: { "content-type": contentType } }),
      ),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a successful response that is not JSON", () => {
  it("throws on a POST rather than resolving to null", async () => {
    serve(SPA_HTML);

    await expect(
      apiPostJson("https://app.example/api/city", "jwt", { placements: [] }),
    ).rejects.toThrow(/not JSON/);
  });

  it("names what arrived, because 'invalid JSON' does not say 'a web page'", async () => {
    serve(SPA_HTML);

    // The three facts a developer needs at 2am: the status the client was given, the type
    // it was given, and what the first characters actually were.
    const error = await apiGetJson("https://app.example/api/city", "jwt").catch(
      (thrown: Error) => thrown,
    );
    expect(String(error)).toContain("200");
    expect(String(error)).toContain("text/html");
    expect(String(error)).toContain("<!doctype html>");
  });

  it("throws on an empty 200 body", async () => {
    // No endpoint this client reaches answers with an empty body — every one of them goes
    // through the service's `jsonResponse`, which always stringifies a value. So an empty
    // body is something other than the service answering.
    serve("", 200, "text/plain");

    await expect(apiGetJson("https://app.example/api/city", "jwt")).rejects.toThrow(
      /not JSON/,
    );
  });
});

describe("what must keep working", () => {
  it("returns a JSON null as a successful null", async () => {
    // `GET /api/measurement` answers `null` for a learner with no paired measurement, and
    // `serverRuntime` types it as `ReadinessMeasurement | null`. This is the case the old
    // `.catch(() => null)` could not tell apart from a body it failed to read — which is
    // exactly why it could not be made strict without reading the text.
    serve("null", 200, "application/json");

    await expect(
      apiGetJson<unknown>("https://app.example/api/measurement", "jwt"),
    ).resolves.toBeNull();
  });

  it("returns a parsed object", async () => {
    serve(JSON.stringify({ saved: true }), 200, "application/json");

    await expect(
      apiPostJson<{ saved: boolean }>("https://app.example/api/city", "jwt", {}),
    ).resolves.toEqual({ saved: true });
  });

  it("still prefers the service's own error string on a failure", async () => {
    // The service answers an unapplied migration with the command that fixes it. A generic
    // status message would throw that sentence away.
    serve(
      JSON.stringify({ error: 'relation "public.city_placement" does not exist' }),
      500,
      "application/json",
    );

    await expect(apiGetJson("https://app.example/api/city", "jwt")).rejects.toThrow(
      /does not exist/,
    );
  });

  it("falls back to the status when a FAILURE has no readable body either", async () => {
    // A 502 from a proxy carries HTML, not the service's envelope. That must stay the
    // status message it always was rather than becoming the not-JSON message: the status
    // is the informative half, and the caller already knows something went wrong.
    serve(SPA_HTML, 502);

    await expect(apiGetJson("https://app.example/api/city", "jwt")).rejects.toThrow(
      /The service failed \(502\)\./,
    );
  });
});

describe("authenticated refresh and expiry", () => {
  it("forces one refresh and retries once after a 401", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ city: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchSpy);
    const getToken = vi
      .fn<(forceRefresh?: boolean) => Promise<string | null>>()
      .mockResolvedValueOnce("old-token")
      .mockResolvedValueOnce("refreshed-token");

    await expect(
      apiGetJsonAuthenticated("https://app.example/api/city", getToken),
    ).resolves.toEqual({ city: true });
    expect(getToken.mock.calls).toEqual([[false], [true]]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchSpy.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer old-token",
    );
    expect(new Headers(fetchSpy.mock.calls[1]?.[1]?.headers).get("authorization")).toBe(
      "Bearer refreshed-token",
    );
  });

  it("expires the account after the single retry also returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const getToken = vi.fn(async (forceRefresh?: boolean) =>
      forceRefresh ? "refreshed-token" : "old-token",
    );
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired, { once: true });

    const error = await apiGetJsonAuthenticated(
      "https://app.example/api/city",
      getToken,
    ).catch((thrown: Error) => thrown);

    expect(error).toBeInstanceOf(ApiResponseError);
    expect(error).toMatchObject({ status: 401, code: "session_expired" });
    expect(getToken.mock.calls).toEqual([[false], [true]]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("surfaces a network failure without inventing a local result or retry storm", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new TypeError("network unavailable");
    });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      apiGetJsonAuthenticated("https://app.example/api/city", async () => "token"),
    ).rejects.toThrow("network unavailable");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not impose the city-launch deadline on authenticated POST work", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(
      (_url: string, _init?: RequestInit) => new Promise<Response>(() => undefined),
    );
    vi.stubGlobal("fetch", fetchSpy);

    void apiPostJsonAuthenticated(
      "https://app.example/api/diagnostic/finalize",
      async () => "token",
      { complete: true },
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
