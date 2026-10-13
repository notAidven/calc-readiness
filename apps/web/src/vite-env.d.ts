/// <reference types="vite/client" />

declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_COGNITO_OAUTH_DOMAIN?: string;
  /** Amplify frontend-only artifact marker; runtime demo authority is exact `/demo`. */
  readonly VITE_DEMO_MODE?: string;
  /** Production account-app rollout. Only literal `true`; ignored by exact `/demo`. */
  readonly VITE_ACCOUNT_APP_ENABLED?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_AWS_REGION?: string;
  /** The deployed browser_auth diagnostic server function endpoint (…/api/diagnostic). */
  readonly VITE_DIAGNOSTIC_API_URL?: string;
  /** Exact `enabled` restores crisis gameplay for ordinary account users; otherwise off. */
  readonly VITE_CRISIS_CAPABILITY?: string;
  /** `bay` enables the production archipelago; `single-island` is the rollback. */
  readonly VITE_ARCHIPELAGO_MODE?: "bay" | "single-island";
  /** Explicit fallback opt-in for browser evidence writers that have no suite-specific flag. */
  readonly VITE_CAPTURE_EVIDENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
