import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

/**
 * Reading a secret value into the function, which nothing in this service has needed before.
 *
 * ## Why there was no pattern to follow, and what this changes
 *
 * The stack has used Secrets Manager since Wave 1, but never like this: the RDS Data API
 * resolves the database credentials **service-side** from an ARN, so the Lambda holds
 * `secretsmanager:GetSecretValue` and yet no secret material has ever been in its memory
 * (`env.ts`'s docblock says exactly that, and it stays true of the database). Cognito is the
 * same shape — a public app client and a JWKS fetch, no secret.
 *
 * A vendor API key has no service-side resolution. Somebody has to read the string. So the
 * rule this file exists to enforce is the next-best one: **the ARN is configuration and the
 * value is not.** `WORK_UPLOAD_PARSE_API_KEY_SECRET_ARN` names a secret; the value is
 * fetched at first use, held for the life of the execution environment, and never written to
 * an environment variable, a response, a log line or a file. A Lambda environment variable
 * is visible to anyone with `lambda:GetFunctionConfiguration` and shows up in the console;
 * an ARN there is a pointer, and a pointer is not a credential.
 *
 * **The default provider needs none of this.** It signs with the function's own execution
 * role, so on the shipped configuration there is no key to store, rotate or leak, and
 * nothing constructs this resolver at all. It exists for the other half of the port —
 * `httpVisionModel.ts`, for a provider the default cannot reach — so that choosing that
 * provider does not also mean inventing a way to hold its key in a hurry.
 *
 * ## Cached per execution environment, and that is a deliberate trade
 *
 * One `GetSecretValue` per cold start rather than one per request: Secrets Manager bills per
 * 10,000 API calls and rate-limits, and a per-request fetch on a route that already makes a
 * model call would add latency for nothing. The cost is that a rotated key is picked up when
 * the container recycles rather than immediately. For a key whose rotation is a manual
 * event, that is the right side of the trade; if it ever becomes automatic, the fix is a TTL
 * here and nothing else changes.
 *
 * A FAILED read is not cached. A throttle or a transient IAM failure at cold start would
 * otherwise poison the container for its whole life.
 */

/** Resolve a secret's string value. Injected in tests; never reads a real secret there. */
export type SecretResolver = (secretArn: string) => Promise<string>;

export interface SecretsManagerResolverConfig {
  /** Injected in tests; defaults to the ambient Lambda credentials + region. */
  readonly client?: SecretsManagerClient;
}

export function createSecretsManagerResolver(
  config: SecretsManagerResolverConfig = {},
): SecretResolver {
  const client = config.client ?? new SecretsManagerClient({});
  const cache = new Map<string, Promise<string>>();

  return (secretArn: string) => {
    const cached = cache.get(secretArn);
    if (cached !== undefined) {
      return cached;
    }
    const pending = (async () => {
      const response = await client.send(
        new GetSecretValueCommand({ SecretId: secretArn }),
      );
      const value = response.SecretString;
      if (value === undefined || value === "") {
        // A binary secret, or an empty one. Named rather than coerced, because the
        // alternative is sending an empty Authorization header and reading the provider's
        // 401 as a model failure.
        throw new Error(`the secret ${secretArn} holds no string value`);
      }
      return value;
    })();
    // Cache the PROMISE, so concurrent first requests share one API call — but drop it again
    // if it rejects, so a cold-start throttle is retried instead of remembered.
    cache.set(secretArn, pending);
    pending.catch(() => cache.delete(secretArn));
    return pending;
  };
}
