import type { UUID } from "@cr/state-schema";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AccountRuntimeConfig } from "../runtimeMode";
import {
  type CognitoAuthService,
  CognitoOperationError,
  createCognitoAuthService,
} from "./cognitoClient";
import { DEV_STUDENT_KEY } from "./LocalSessionProvider";
import {
  type AuthActionResult,
  SESSION_EXPIRED_EVENT,
  SessionContext,
  type SessionStatus,
  type SessionValue,
  useSession,
} from "./session";

export { SessionProvider } from "./SessionProvider";
export type {
  AuthActionResult,
  SessionMode,
  SessionStatus,
  SessionValue,
} from "./session";
export { DEV_STUDENT_KEY, useSession };

const SIGN_OUT_STORAGE_KEY = "cr.account.signout";
const SIGN_OUT_CHANNEL = "cr-account-session";

function safeAuthError(error: unknown): string {
  const code = error instanceof CognitoOperationError ? error.code : "UnknownError";
  switch (code) {
    case "NotAuthorizedException":
    case "UserNotFoundException":
      return "The email or password is not correct.";
    case "UsernameExistsException":
      return "An account already exists for that email. Try signing in.";
    case "CodeMismatchException":
      return "That code is not correct. Check the email and try again.";
    case "ExpiredCodeException":
      return "That code has expired. Request a new one.";
    case "InvalidPasswordException":
      return "Choose a stronger password with at least 8 characters.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Wait a moment, then try again.";
    case "NetworkError":
      return "We could not reach the account service. Check your connection and retry.";
    default:
      return "The account service could not complete that request. Try again.";
  }
}

function isIrrecoverableSession(error: unknown): boolean {
  return (
    error instanceof CognitoOperationError &&
    [
      "NotAuthorizedException",
      "UserNotFoundException",
      "InvalidIdentity",
      "InvalidSession",
    ].includes(error.code)
  );
}

function useAccountService(
  config: AccountRuntimeConfig,
  injected: CognitoAuthService | undefined,
): CognitoAuthService {
  return useMemo(
    () =>
      injected ??
      createCognitoAuthService({
        userPoolId: config.userPoolId,
        clientId: config.clientId,
        oauthDomain: config.oauthDomain,
      }),
    [config.clientId, config.oauthDomain, config.userPoolId, injected],
  );
}

export function AccountSessionProvider({
  config,
  service: injectedService,
  children,
}: {
  readonly config: AccountRuntimeConfig;
  readonly service?: CognitoAuthService;
  readonly children: ReactNode;
}) {
  const service = useAccountService(config, injectedService);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [studentId, setStudentId] = useState<UUID | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const clearIdentity = useCallback((nextStatus: SessionStatus) => {
    setStudentId(null);
    setEmail(null);
    setStatus(nextStatus);
  }, []);

  const restoreSession = useCallback(async () => {
    setStatus("loading");
    try {
      const identity = await service.restoreIdentity();
      if (!identity) {
        clearIdentity("anonymous");
        return;
      }
      setStudentId(identity.studentId);
      setEmail(identity.email);
      setStatus("authenticated");
    } catch (error) {
      clearIdentity(isIrrecoverableSession(error) ? "expired" : "error");
    }
  }, [clearIdentity, service]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const remoteSignOut = () => {
      service.signOut();
      clearIdentity("anonymous");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === SIGN_OUT_STORAGE_KEY && event.newValue) {
        remoteSignOut();
      }
    };
    const onExpired = () => {
      service.signOut();
      clearIdentity("expired");
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(SIGN_OUT_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data === "sign-out") {
          remoteSignOut();
        }
      };
      channelRef.current = channel;
    }
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [clearIdentity, service]);

  const signInWithPassword = useCallback(
    async (nextEmail: string, password: string): Promise<AuthActionResult> => {
      try {
        const identity = await service.signIn(nextEmail, password);
        setStudentId(identity.studentId);
        setEmail(identity.email);
        setStatus("authenticated");
        return { ok: true };
      } catch (error) {
        return { ok: false, error: safeAuthError(error) };
      }
    },
    [service],
  );

  const startGoogleSignIn = useMemo(
    () =>
      service.startGoogleSignIn
        ? async (): Promise<AuthActionResult> => {
            try {
              await service.startGoogleSignIn?.();
              return { ok: true };
            } catch {
              return {
                ok: false,
                error: "Google sign-in could not be opened. Try email instead.",
              };
            }
          }
        : undefined,
    [service],
  );

  const signUp = useCallback(
    async (nextEmail: string, password: string): Promise<AuthActionResult> => {
      try {
        // The PreSignUp Lambda trigger (`infra/lib/calc-readiness-stack.ts`) auto-confirms
        // and auto-verifies every Cognito-native sign-up, so there is no confirmation code
        // step left to report back to the caller.
        await service.signUp(nextEmail, password);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: safeAuthError(error) };
      }
    },
    [service],
  );

  const forgotPassword = useCallback(
    async (nextEmail: string): Promise<AuthActionResult> => {
      try {
        await service.forgotPassword(nextEmail);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: safeAuthError(error) };
      }
    },
    [service],
  );

  const confirmForgotPassword = useCallback(
    async (
      nextEmail: string,
      code: string,
      password: string,
    ): Promise<AuthActionResult> => {
      try {
        await service.confirmForgotPassword(nextEmail, code, password);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: safeAuthError(error) };
      }
    },
    [service],
  );

  const signOut = useCallback(async () => {
    service.signOut();
    clearIdentity("anonymous");
    channelRef.current?.postMessage("sign-out");
    try {
      localStorage.setItem(SIGN_OUT_STORAGE_KEY, String(Date.now()));
    } catch {
      // BroadcastChannel is the primary signal. A blocked store affects this tab only.
    }
  }, [clearIdentity, service]);

  const getAccessToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      try {
        const token = await service.getAccessToken(forceRefresh);
        if (!token) {
          clearIdentity(forceRefresh ? "expired" : "anonymous");
        }
        return token;
      } catch (error) {
        if (isIrrecoverableSession(error)) {
          clearIdentity("expired");
          return null;
        }
        throw new Error("The account service is unavailable.");
      }
    },
    [clearIdentity, service],
  );

  const value = useMemo<SessionValue>(
    () => ({
      mode: "cognito",
      status,
      studentId,
      email,
      ...(startGoogleSignIn ? { startGoogleSignIn } : {}),
      signInWithPassword,
      signUp,
      forgotPassword,
      confirmForgotPassword,
      signOut,
      restoreSession,
      getAccessToken,
    }),
    [
      status,
      studentId,
      email,
      startGoogleSignIn,
      signInWithPassword,
      signUp,
      forgotPassword,
      confirmForgotPassword,
      signOut,
      restoreSession,
      getAccessToken,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
