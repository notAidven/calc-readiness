import { createDataApiClient, type DataApiClient } from "@cr/db";
import type { DiagnosticAuthenticator, DiagnosticServer } from "@cr/diagnostic-runtime";
import {
  createAuroraWalkDiagnosticServer,
  createCognitoAuthenticator,
} from "@cr/diagnostic-runtime/aurora";

import type { DiagnosticReadService, DiagnosticWriteService, EconomyService } from "./app";
import {
  countRegisteredUsers,
  createBetaMetricsService,
  type BetaMetricsService,
} from "./betaMetrics";
import { type BugReportService, createBugReportService } from "./bugReports";
import { createAuroraEconomyService } from "./economy";
import { createAuroraMasteryService, type MasteryWriteService } from "./mastery";
import { createAuroraPlagueStateService, type PlagueStateService } from "./plagueState";
import { createAuroraReadService } from "./reads";
import { createSecretsManagerResolver } from "./secrets";
import {
  createAuroraSuccessionCommandService,
  type SuccessionCommandService,
} from "./succession";
import type { VisionModelPrices } from "./visionModel";
import { createWorkUploadService, type WorkUploadService } from "./workUpload";
import { createS3WorkUploadObjectStore } from "./workUploadObjects";
import {
  createWorkUploadParseService,
  type WorkUploadParseService,
} from "./workUploadParse";
import { DEFAULT_WORK_UPLOAD_PARSER, selectVisionModel } from "./workUploadParseSeam";
import { createAuroraWriteService } from "./writes";

/** Raw env source (`process.env`), passed in so this stays free of Node globals. */
export type EnvSource = Record<string, string | undefined>;

function required(env: EnvSource, key: string): string {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

/**
 * A tuning knob read from the environment, or its default.
 *
 * Refuses garbage rather than coercing it, and the reason is narrow but real: two of these
 * knobs are the spend cap (`docs/Photo_Work_Upload_Scope.md` §4, `workUploadParse.ts`). A
 * typo'd `WORK_UPLOAD_PARSE_DAILY_USD` that silently became `NaN` would compare false against
 * every ceiling and turn the cap off, which is the one failure mode a budget must not have.
 * A negative one would do the same. So a bad value is a deploy that fails loudly.
 */
function numeric(env: EnvSource, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a non-negative number (got ${JSON.stringify(raw)})`);
  }
  return value;
}

/** The memoized providers `createDiagnosticApi` injects. */
export interface ApiProviders {
  getServer: () => DiagnosticServer;
  getReads: () => DiagnosticReadService;
  getWrites: () => DiagnosticWriteService;
  getMastery: () => MasteryWriteService;
  getSuccession: () => SuccessionCommandService;
  getPlague: () => PlagueStateService;
  getEconomy: () => EconomyService;
  getWorkUploads: () => WorkUploadService;
  getWorkUploadParse: () => WorkUploadParseService;
  getBugReports: () => BugReportService;
  getBetaMetrics: () => BetaMetricsService;
}

/**
 * Build the AWS-native API providers. The RDS Data API resolves the DB credentials
 * secret service-side (the Lambda only needs `rds-data` + `secretsmanager:GetSecretValue`
 * IAM) and Cognito JWTs are verified against the pool's JWKS — so no secret material
 * is ever read into the function. The DB client + authenticator are built once and
 * shared by the action server and the read service.
 *
 * Env:
 *   DB_CLUSTER_ARN         Aurora cluster ARN (resourceArn)
 *   DB_SECRET_ARN          least-privilege app_service credentials secret
 *   DB_NAME                database name
 *   COGNITO_USER_POOL_ID   e.g. us-east-1_xxxxxxxxx
 *   COGNITO_CLIENT_ID      the public SPA app-client id
 *   WORK_UPLOAD_BUCKET     the private photo-of-work uploads bucket
 *
 * And, for the v2 vision parse (`docs/Photo_Work_Upload_Scope.md` §3.5, gate lifted
 * 2026-08-05 — see that section's banner). Only the model id is required, and only by the
 * parse route:
 *
 *   WORK_UPLOAD_PARSE_MODEL      REQUIRED. The model identifier as the provider spells it.
 *                                No default, deliberately: a wrong id fails on a learner's
 *                                request and degrades to "we couldn't read this", which is
 *                                silent. Unset, the route answers 500 naming this variable,
 *                                which is not. `docs/Deployment.md` has the command that
 *                                lists the valid ones for your account and region.
 *   WORK_UPLOAD_PARSE_PROVIDER   a key of `WORK_UPLOAD_PARSERS`. Defaults to
 *                                `DEFAULT_WORK_UPLOAD_PARSER`, which is the keyless one;
 *                                the registry is the only file that names either by vendor.
 *   WORK_UPLOAD_PARSE_ENDPOINT   http-chat-completions only: the full endpoint URL.
 *   WORK_UPLOAD_PARSE_API_KEY_SECRET_ARN
 *                                http-chat-completions only: the Secrets Manager secret
 *                                holding the key. The ARN is configuration; the value is
 *                                read at first use and never enters the environment.
 *   WORK_UPLOAD_PARSE_INPUT_USD_PER_MTOK, WORK_UPLOAD_PARSE_OUTPUT_USD_PER_MTOK
 *                                what the configured model charges per million tokens. The
 *                                cap below is denominated in dollars, so it is only as true
 *                                as these are — set them when you set the model.
 *   WORK_UPLOAD_PARSE_DAILY_USD  the rolling-24h account-wide ceiling. Default 2.
 *   WORK_UPLOAD_PARSE_MAX_PER_STUDENT_PER_DAY
 *                                per-learner attempts in the same window. Default 10.
 *
 * Every one of those is read LAZILY, on first use of the provider that needs it, which is
 * what lets a deployment that predates the uploads bucket keep serving the city and the
 * diagnostic: a missing `WORK_UPLOAD_BUCKET` affects the four work-upload routes and nothing
 * else. The app wrapper converts missing parse configuration to a safe store-only response;
 * its absence takes nothing else down with it.
 */
export function createApiProviders(env: EnvSource): ApiProviders {
  let shared: { db: DataApiClient; authenticate: DiagnosticAuthenticator } | undefined;
  function deps() {
    if (!shared) {
      shared = {
        db: createDataApiClient({
          resourceArn: required(env, "DB_CLUSTER_ARN"),
          secretArn: required(env, "DB_SECRET_ARN"),
          database: required(env, "DB_NAME"),
        }),
        authenticate: createCognitoAuthenticator({
          userPoolId: required(env, "COGNITO_USER_POOL_ID"),
          clientId: required(env, "COGNITO_CLIENT_ID"),
        }),
      };
    }
    return shared;
  }

  let server: DiagnosticServer | undefined;
  let reads: DiagnosticReadService | undefined;
  let writes: DiagnosticWriteService | undefined;
  let mastery: MasteryWriteService | undefined;
  let succession: SuccessionCommandService | undefined;
  let plague: PlagueStateService | undefined;
  let economy: EconomyService | undefined;
  let workUploads: WorkUploadService | undefined;
  let workUploadParse: WorkUploadParseService | undefined;
  let bugReports: BugReportService | undefined;
  let betaMetrics: BetaMetricsService | undefined;
  /** Built once per container, and only if a provider that needs a key is configured. */
  let resolveSecret: ReturnType<typeof createSecretsManagerResolver> | undefined;
  function secretResolver() {
    resolveSecret ??= createSecretsManagerResolver();
    return resolveSecret;
  }
  return {
    getBetaMetrics: () => {
      betaMetrics ??= createBetaMetricsService({
        db: deps().db,
        registeredUserCount: () =>
          countRegisteredUsers(required(env, "COGNITO_USER_POOL_ID")),
      });
      return betaMetrics;
    },
    getBugReports: () => {
      bugReports ??= createBugReportService(deps());
      return bugReports;
    },
    getServer: () => {
      // v2 default instrument: the prerequisite-gated walk (Amendment v2 §9 step 7
      // flip). The MST server (`createAuroraDiagnosticServer`) stays available for a
      // rollback but is no longer the shipped onboarding path.
      server ??= createAuroraWalkDiagnosticServer(deps());
      return server;
    },
    getReads: () => {
      reads ??= createAuroraReadService(deps());
      return reads;
    },
    // Shares `deps()` with the reads, so the writer runs on the same `DataApiClient` — and
    // it is that client, not the bare executor the reads take, because a city has to be
    // saved in one transaction (`saveCityToAurora`).
    getWrites: () => {
      writes ??= createAuroraWriteService(deps());
      return writes;
    },
    // Same `DataApiClient` and Cognito verifier as the city writer, for the same reason it
    // is a client and not a bare executor: a submission reads the stored mastery and then
    // raises it, and those two have to be one transaction or a retry can read a value that
    // the write it races has already moved.
    getMastery: () => {
      mastery ??= createAuroraMasteryService(deps());
      return mastery;
    },
    getSuccession: () => {
      succession ??= createAuroraSuccessionCommandService(deps());
      return succession;
    },
    getPlague: () => {
      plague ??= createAuroraPlagueStateService(deps());
      return plague;
    },
    getEconomy: () => {
      economy ??= createAuroraEconomyService(deps());
      return economy;
    },
    // Shares the same `DataApiClient` + Cognito verifier as everything else. The S3 client
    // is built here and only here: `createS3WorkUploadObjectStore` resolves the ambient
    // Lambda credentials, and the bucket name comes from the stack (never from a request).
    getWorkUploads: () => {
      workUploads ??= createWorkUploadService({
        ...deps(),
        objects: createS3WorkUploadObjectStore({
          bucket: required(env, "WORK_UPLOAD_BUCKET"),
        }),
      });
      return workUploads;
    },
    /**
     * The v2 vision parse. THE ONLY PLACE A PROVIDER IS CHOSEN, and it chooses one by id
     * from `WORK_UPLOAD_PARSERS` rather than by naming an adapter — which is why this file
     * contains no vendor's name and the swap is a deploy-time string.
     */
    getWorkUploadParse: () => {
      workUploadParse ??= createWorkUploadParseService({
        ...deps(),
        objects: createS3WorkUploadObjectStore({
          bucket: required(env, "WORK_UPLOAD_BUCKET"),
        }),
        model: selectVisionModel(
          env.WORK_UPLOAD_PARSE_PROVIDER || DEFAULT_WORK_UPLOAD_PARSER,
          {
            modelId: required(env, "WORK_UPLOAD_PARSE_MODEL"),
            ...(env.WORK_UPLOAD_PARSE_ENDPOINT
              ? { endpoint: env.WORK_UPLOAD_PARSE_ENDPOINT }
              : {}),
            ...(env.WORK_UPLOAD_PARSE_API_KEY_SECRET_ARN
              ? {
                  apiKeySecretArn: env.WORK_UPLOAD_PARSE_API_KEY_SECRET_ARN,
                  resolveSecret: secretResolver(),
                }
              : {}),
          },
        ),
        prices: readVisionModelPrices(env),
        limits: {
          budgetMicroUsd: Math.round(
            numeric(env, "WORK_UPLOAD_PARSE_DAILY_USD", 2) * 1_000_000,
          ),
          maxAttemptsPerStudent: Math.round(
            numeric(env, "WORK_UPLOAD_PARSE_MAX_PER_STUDENT_PER_DAY", 10),
          ),
        },
      });
      return workUploadParse;
    },
  };
}

/**
 * What the configured model charges, per million tokens.
 *
 * The defaults are the published list rate for a current frontier vision model on the default
 * provider at the time of writing ($3 input / $15 output per million tokens, us-east-1, read
 * 2026-08-05). They are a FLOOR ON HONESTY rather than a fact about your deployment: the cap in
 * `workUploadParse.ts` is denominated in dollars and computed from these, so pointing
 * `WORK_UPLOAD_PARSE_MODEL` at something dearer without moving these would leave the ceiling
 * reading low and the bill reading high. Set both when you set the model.
 */
function readVisionModelPrices(env: EnvSource): VisionModelPrices {
  return {
    inputUsdPerMillionTokens: numeric(env, "WORK_UPLOAD_PARSE_INPUT_USD_PER_MTOK", 3),
    outputUsdPerMillionTokens: numeric(env, "WORK_UPLOAD_PARSE_OUTPUT_USD_PER_MTOK", 15),
  };
}

/** Read `process.env` without depending on `@types/node` (repo convention). */
export function nodeEnv(): EnvSource {
  return (globalThis as unknown as { process?: { env?: EnvSource } }).process?.env ?? {};
}
