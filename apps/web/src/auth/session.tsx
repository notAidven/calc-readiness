import type { UUID } from "@cr/state-schema";
import { createContext, useContext } from "react";

export type SessionMode = "dev" | "cognito";
export type SessionStatus = "loading" | "authenticated" | "anonymous" | "expired" | "error";

export interface AuthActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

export interface SessionValue {
  readonly mode: SessionMode;
  readonly status: SessionStatus;
  /** Cognito `sub` in account mode; a non-authoritative stand-in only in local mode. */
  readonly studentId: UUID | null;
  readonly email: string | null;
  startGoogleSignIn?: () => Promise<AuthActionResult>;
  signInWithPassword(email: string, password: string): Promise<AuthActionResult>;
  signUp(email: string, password: string): Promise<AuthActionResult>;
  forgotPassword(email: string): Promise<AuthActionResult>;
  confirmForgotPassword(
    email: string,
    code: string,
    password: string,
  ): Promise<AuthActionResult>;
  signOut(): Promise<void>;
  restoreSession(): Promise<void>;
  /**
   * Resolve a Cognito access token. `forceRefresh` is used exactly once after a 401.
   * Local/demo sessions always return null and can never authorize an API request.
   */
  getAccessToken(forceRefresh?: boolean): Promise<string | null>;
}

export const SESSION_EXPIRED_EVENT = "cr:account-session-expired";

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used within a session provider");
  }
  return value;
}

/** Persistence-only consumers may run in isolated component tests without an auth shell. */
export function useOptionalSession(): SessionValue | null {
  return useContext(SessionContext);
}
