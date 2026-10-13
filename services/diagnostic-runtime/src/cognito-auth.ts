import type { UUID } from "@cr/state-schema";
import { CognitoJwtVerifier } from "aws-jwt-verify";

import type { DiagnosticAuthenticator } from "./server";

export interface CognitoAuthenticatorConfig {
  userPoolId: string;
  clientId: string;
  /** Which token to trust. Access tokens carry `sub` + `client_id`; default. */
  tokenUse?: "access" | "id";
}

/**
 * The one subject mapping later account/persistence slices consume. Its input is the claim set
 * returned only after Cognito JWT verification; caller bodies and path parameters never enter it.
 */
export function identityFromVerifiedCognitoClaims(payload: { readonly sub: string }): {
  readonly student_id: UUID;
} {
  return { student_id: payload.sub as UUID };
}

/**
 * Resolve `student_id` from a verified Amazon Cognito JWT — the AWS-native
 * replacement for the previous hosted auth. The verifier fetches + caches the user pool's
 * JWKS and checks signature, expiry, issuer, `token_use`, and `client_id`/`aud`;
 * only the cryptographically-verified `sub` becomes the student id (never the
 * request payload). Returns null on any verification failure (→ 401).
 */
export function createCognitoAuthenticator(
  config: CognitoAuthenticatorConfig,
): DiagnosticAuthenticator {
  const verifier = CognitoJwtVerifier.create({
    userPoolId: config.userPoolId,
    tokenUse: config.tokenUse ?? "access",
    clientId: config.clientId,
  });

  return async (token) => {
    if (!token) {
      return null;
    }
    try {
      const payload = await verifier.verify(token);
      return identityFromVerifiedCognitoClaims(payload);
    } catch {
      return null;
    }
  };
}
