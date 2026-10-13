import { describe, expect, it, vi } from "vitest";

import { createGoogleAuthorizeUrl, exchangeGoogleOAuthCallback } from "./googleOAuth";

const CONFIG = {
  clientId: "public-client",
  oauthDomain: "calc-readiness.auth.us-east-1.amazoncognito.com",
};

function runtime(pathname = "/", search = "") {
  const values = new Map<string, string>();
  return {
    values,
    runtime: {
      origin: "https://learn.example.test",
      pathname,
      search,
      storage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
      crypto: window.crypto,
      fetch: vi.fn(),
    },
  };
}

describe("Google OAuth PKCE", () => {
  it("creates a Google-first authorization-code request with state and S256 PKCE", async () => {
    const setup = runtime();
    const url = new URL(await createGoogleAuthorizeUrl(CONFIG, setup.runtime));

    expect(url.hostname).toBe(CONFIG.oauthDomain);
    expect(url.pathname).toBe("/oauth2/authorize");
    expect(url.searchParams.get("identity_provider")).toBe("Google");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://learn.example.test/auth/callback",
    );
    expect(setup.values.size).toBe(2);
  });

  it("rejects a callback whose state does not match", async () => {
    const setup = runtime("/auth/callback", "?code=code&state=wrong");
    await createGoogleAuthorizeUrl(CONFIG, setup.runtime);

    await expect(exchangeGoogleOAuthCallback(CONFIG, setup.runtime)).rejects.toMatchObject({
      code: "OAuthStateMismatch",
    });
    expect(setup.values.size).toBe(0);
  });
});
