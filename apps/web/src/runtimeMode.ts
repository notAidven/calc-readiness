export type PlayRuntimeMode = "demo" | "local" | "account";

export interface RuntimeEnvironment {
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly MODE?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_ACCOUNT_APP_ENABLED?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_COGNITO_OAUTH_DOMAIN?: string;
  readonly VITE_AWS_REGION?: string;
  readonly VITE_DIAGNOSTIC_API_URL?: string;
}

export interface AccountRuntimeConfig {
  readonly userPoolId: string;
  readonly clientId: string;
  readonly oauthDomain?: string;
  readonly region: string;
  readonly diagnosticApiUrl: string;
}

export type RuntimeResolution =
  | { readonly mode: "demo" }
  | { readonly mode: "local" }
  | { readonly mode: "account"; readonly config: AccountRuntimeConfig }
  | {
      readonly mode: "unavailable";
      readonly reason: "rollout_disabled" | "invalid_configuration";
      readonly configurationErrors: readonly string[];
    };

/** Query strings do not change modes. `/demo/` is deliberately not the showcase. */
export function isExactDemoPath(pathname: string): boolean {
  return pathname === "/demo";
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function accountConfiguration(env: RuntimeEnvironment): {
  config: AccountRuntimeConfig | null;
  configurationErrors: string[];
} {
  const userPoolId = nonEmpty(env.VITE_COGNITO_USER_POOL_ID);
  const clientId = nonEmpty(env.VITE_COGNITO_CLIENT_ID);
  const oauthDomain = nonEmpty(env.VITE_COGNITO_OAUTH_DOMAIN);
  const region = nonEmpty(env.VITE_AWS_REGION);
  const diagnosticApiUrl = nonEmpty(env.VITE_DIAGNOSTIC_API_URL);
  const configurationErrors = [
    !userPoolId && "VITE_COGNITO_USER_POOL_ID",
    !clientId && "VITE_COGNITO_CLIENT_ID",
    !region && "VITE_AWS_REGION",
    !diagnosticApiUrl && "VITE_DIAGNOSTIC_API_URL",
  ].filter((name): name is string => Boolean(name));

  if (userPoolId && !/^[\w-]+_[A-Za-z0-9]+$/.test(userPoolId)) {
    configurationErrors.push("VITE_COGNITO_USER_POOL_ID");
  }
  if (clientId && !/^[A-Za-z0-9_-]+$/.test(clientId)) {
    configurationErrors.push("VITE_COGNITO_CLIENT_ID");
  }
  if (
    oauthDomain &&
    !/^[a-z0-9-]+\.auth\.[a-z0-9-]+\.amazoncognito\.com$/u.test(oauthDomain)
  ) {
    configurationErrors.push("VITE_COGNITO_OAUTH_DOMAIN");
  }
  if (region && !/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(region)) {
    configurationErrors.push("VITE_AWS_REGION");
  }
  if (diagnosticApiUrl) {
    try {
      const parsed = new URL(diagnosticApiUrl, "https://same-origin.invalid");
      const insecureAbsolute =
        env.PROD === true &&
        /^[a-z][a-z\d+.-]*:/i.test(diagnosticApiUrl) &&
        parsed.protocol !== "https:";
      if (insecureAbsolute || !/\/api\/diagnostic\/?$/.test(parsed.pathname)) {
        configurationErrors.push("VITE_DIAGNOSTIC_API_URL");
      }
    } catch {
      configurationErrors.push("VITE_DIAGNOSTIC_API_URL");
    }
  }

  if (configurationErrors.length > 0) {
    return { config: null, configurationErrors: [...new Set(configurationErrors)] };
  }
  return {
    config: {
      userPoolId: userPoolId as string,
      clientId: clientId as string,
      ...(oauthDomain ? { oauthDomain } : {}),
      region: region as string,
      diagnosticApiUrl: diagnosticApiUrl as string,
    },
    configurationErrors,
  };
}

/**
 * Resolve the browser's authority model once, before any auth or product module mounts.
 *
 * Production is fail-closed: only exact `/demo` may run locally. The account rollout flag
 * and all four public stack outputs are required everywhere else. A Vite dev build keeps the
 * zero-backend workflow, while setting the rollout flag exercises the real account boundary.
 */
export function resolveRuntimeMode(
  pathname: string,
  env: RuntimeEnvironment,
): RuntimeResolution {
  if (isExactDemoPath(pathname)) {
    return { mode: "demo" };
  }

  const accountEnabled = env.VITE_ACCOUNT_APP_ENABLED === "true";
  if (env.DEV === true && !accountEnabled) {
    return { mode: "local" };
  }

  if (!accountEnabled) {
    return {
      mode: "unavailable",
      reason: "rollout_disabled",
      configurationErrors: [],
    };
  }

  const { config, configurationErrors } = accountConfiguration(env);
  if (!config) {
    return {
      mode: "unavailable",
      reason: "invalid_configuration",
      configurationErrors,
    };
  }
  return { mode: "account", config };
}

export function currentRuntimeMode(): RuntimeResolution {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  return resolveRuntimeMode(pathname, import.meta.env);
}
