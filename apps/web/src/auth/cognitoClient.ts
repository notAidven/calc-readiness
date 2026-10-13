import type { UUID } from "@cr/state-schema";
import {
  AuthenticationDetails,
  CognitoAccessToken,
  CognitoIdToken,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

import { createGoogleAuthorizeUrl, exchangeGoogleOAuthCallback } from "./googleOAuth";

export interface CognitoBrowserConfig {
  readonly userPoolId: string;
  readonly clientId: string;
  readonly oauthDomain?: string;
}

export interface CognitoIdentity {
  readonly studentId: UUID;
  readonly email: string | null;
}

export interface CognitoSignUpResult {
  readonly confirmationRequired: boolean;
}

export interface CognitoAuthService {
  restoreIdentity(): Promise<CognitoIdentity | null>;
  getAccessToken(forceRefresh?: boolean): Promise<string | null>;
  startGoogleSignIn?(): Promise<void>;
  signIn(email: string, password: string): Promise<CognitoIdentity>;
  signUp(email: string, password: string): Promise<CognitoSignUpResult>;
  forgotPassword(email: string): Promise<void>;
  confirmForgotPassword(email: string, code: string, password: string): Promise<void>;
  signOut(): void;
}

export class CognitoOperationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super("Cognito operation failed");
    this.name = "CognitoOperationError";
    this.code = code;
  }
}

let activeService: CognitoAuthService | null = null;

/** Compatibility seam for clients created below the root account provider. */
export function getAccessToken(forceRefresh = false): Promise<string | null> {
  return activeService?.getAccessToken(forceRefresh) ?? Promise.resolve(null);
}

function providerError(error: unknown): CognitoOperationError {
  if (error instanceof CognitoOperationError) {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; name?: unknown };
    const code =
      typeof candidate.code === "string"
        ? candidate.code
        : typeof candidate.name === "string"
          ? candidate.name
          : "UnknownError";
    return new CognitoOperationError(code);
  }
  return new CognitoOperationError("UnknownError");
}

function identityFromSession(session: CognitoUserSession): CognitoIdentity {
  const payload = session.getIdToken().payload;
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new CognitoOperationError("InvalidIdentity");
  }
  return {
    studentId: payload.sub as UUID,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

/**
 * Create the real public-SPA Cognito boundary. The caller has already validated the stack
 * outputs; unlike the old optional singleton, this constructor has no anonymous fallback.
 */
export function createCognitoAuthService(config: CognitoBrowserConfig): CognitoAuthService {
  const pool = new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
  });

  function currentUser(): CognitoUser | null {
    return pool.getCurrentUser();
  }

  function sessionFor(user: CognitoUser): Promise<CognitoUserSession> {
    return new Promise((resolve, reject) => {
      user.getSession((error: Error | null, session: CognitoUserSession | null) => {
        if (error || !session) {
          reject(providerError(error));
          return;
        }
        if (!session.isValid()) {
          reject(new CognitoOperationError("InvalidSession"));
          return;
        }
        resolve(session);
      });
    });
  }

  function refresh(
    user: CognitoUser,
    session: CognitoUserSession,
  ): Promise<CognitoUserSession> {
    return new Promise((resolve, reject) => {
      user.refreshSession(session.getRefreshToken(), (error, refreshed) => {
        if (error || !refreshed) {
          reject(providerError(error));
          return;
        }
        resolve(refreshed);
      });
    });
  }

  function establishOAuthSession(tokens: {
    readonly accessToken: string;
    readonly idToken: string;
    readonly refreshToken: string;
  }): CognitoIdentity {
    const accessToken = new CognitoAccessToken({ AccessToken: tokens.accessToken });
    const idToken = new CognitoIdToken({ IdToken: tokens.idToken });
    const refreshToken = new CognitoRefreshToken({ RefreshToken: tokens.refreshToken });
    const session = new CognitoUserSession({
      AccessToken: accessToken,
      IdToken: idToken,
      RefreshToken: refreshToken,
    });
    const username = idToken.payload["cognito:username"];
    if (typeof username !== "string" || username.length === 0 || !session.isValid()) {
      throw new CognitoOperationError("InvalidIdentity");
    }
    new CognitoUser({ Username: username, Pool: pool }).setSignInUserSession(session);
    return identityFromSession(session);
  }

  const service: CognitoAuthService = {
    async restoreIdentity() {
      if (config.oauthDomain) {
        const tokens = await exchangeGoogleOAuthCallback({
          clientId: config.clientId,
          oauthDomain: config.oauthDomain,
        });
        if (tokens) {
          const identity = establishOAuthSession(tokens);
          window.history.replaceState(null, "", "/");
          return identity;
        }
      }
      const user = currentUser();
      if (!user) {
        return null;
      }
      return identityFromSession(await sessionFor(user));
    },

    async getAccessToken(forceRefresh = false) {
      const user = currentUser();
      if (!user) {
        return null;
      }
      const restored = await sessionFor(user);
      const session = forceRefresh ? await refresh(user, restored) : restored;
      return session.getAccessToken().getJwtToken();
    },

    ...(config.oauthDomain
      ? {
          async startGoogleSignIn() {
            window.location.assign(
              await createGoogleAuthorizeUrl({
                clientId: config.clientId,
                oauthDomain: config.oauthDomain as string,
              }),
            );
          },
        }
      : {}),

    signIn(email, password) {
      return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: pool });
        user.authenticateUser(
          new AuthenticationDetails({
            Username: email,
            Password: password,
          }),
          {
            onSuccess: (session) => resolve(identityFromSession(session)),
            onFailure: (error) => reject(providerError(error)),
          },
        );
      });
    },

    signUp(email, password) {
      return new Promise((resolve, reject) => {
        const attributes = [new CognitoUserAttribute({ Name: "email", Value: email })];
        pool.signUp(email, password, attributes, [], (error, result) => {
          if (error) {
            reject(providerError(error));
            return;
          }
          resolve({ confirmationRequired: result?.userConfirmed === false });
        });
      });
    },

    forgotPassword(email) {
      return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: pool });
        user.forgotPassword({
          onSuccess: () => resolve(),
          onFailure: (error) => reject(providerError(error)),
          inputVerificationCode: () => resolve(),
        });
      });
    },

    confirmForgotPassword(email, code, password) {
      return new Promise((resolve, reject) => {
        const user = new CognitoUser({ Username: email, Pool: pool });
        user.confirmPassword(code, password, {
          onSuccess: () => resolve(),
          onFailure: (error) => reject(providerError(error)),
        });
      });
    },

    signOut() {
      currentUser()?.signOut();
    },
  };
  activeService = service;
  return service;
}
