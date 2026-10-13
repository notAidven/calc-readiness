export interface GoogleOAuthConfig {
  readonly clientId: string;
  readonly oauthDomain: string;
}

export interface GoogleOAuthTokens {
  readonly accessToken: string;
  readonly idToken: string;
  readonly refreshToken: string;
}

export class GoogleOAuthError extends Error {
  readonly code: string;

  constructor(code: string) {
    super("Google OAuth operation failed");
    this.name = "GoogleOAuthError";
    this.code = code;
  }
}

interface OAuthRuntime {
  readonly origin: string;
  readonly pathname: string;
  readonly search: string;
  readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  readonly crypto: Pick<Crypto, "getRandomValues" | "subtle">;
  readonly fetch: typeof fetch;
}

const CALLBACK_PATH = "/auth/callback";

function browserRuntime(): OAuthRuntime {
  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
    storage: window.sessionStorage,
    crypto: window.crypto,
    fetch: window.fetch.bind(window),
  };
}

function storageKey(clientId: string, value: "state" | "verifier"): string {
  return `cr.oauth.${clientId}.${value}`;
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function randomValue(crypto: OAuthRuntime["crypto"]): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function callbackUrl(origin: string): string {
  return `${origin}${CALLBACK_PATH}`;
}

export async function createGoogleAuthorizeUrl(
  config: GoogleOAuthConfig,
  runtime: OAuthRuntime = browserRuntime(),
): Promise<string> {
  const state = randomValue(runtime.crypto);
  const verifier = randomValue(runtime.crypto);
  const challenge = base64Url(
    new Uint8Array(
      await runtime.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  runtime.storage.setItem(storageKey(config.clientId, "state"), state);
  runtime.storage.setItem(storageKey(config.clientId, "verifier"), verifier);

  const url = new URL(`https://${config.oauthDomain}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: callbackUrl(runtime.origin),
    identity_provider: "Google",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

export async function exchangeGoogleOAuthCallback(
  config: GoogleOAuthConfig,
  runtime: OAuthRuntime = browserRuntime(),
): Promise<GoogleOAuthTokens | null> {
  if (runtime.pathname !== CALLBACK_PATH) {
    return null;
  }

  const params = new URLSearchParams(runtime.search);
  if (params.get("error")) {
    throw new GoogleOAuthError("OAuthProviderError");
  }
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = runtime.storage.getItem(storageKey(config.clientId, "state"));
  const verifier = runtime.storage.getItem(storageKey(config.clientId, "verifier"));
  runtime.storage.removeItem(storageKey(config.clientId, "state"));
  runtime.storage.removeItem(storageKey(config.clientId, "verifier"));
  if (!code || !state || !expectedState || !verifier || state !== expectedState) {
    throw new GoogleOAuthError("OAuthStateMismatch");
  }

  const response = await runtime.fetch(`https://${config.oauthDomain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      code,
      redirect_uri: callbackUrl(runtime.origin),
      code_verifier: verifier,
    }),
  });
  if (!response.ok) {
    throw new GoogleOAuthError("OAuthTokenExchangeFailed");
  }
  const payload = (await response.json()) as Record<string, unknown>;
  if (
    typeof payload.access_token !== "string" ||
    typeof payload.id_token !== "string" ||
    typeof payload.refresh_token !== "string"
  ) {
    throw new GoogleOAuthError("OAuthInvalidTokenResponse");
  }
  return {
    accessToken: payload.access_token,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
  };
}
