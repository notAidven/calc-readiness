import type { DataApiExecutor } from "@cr/db";
import type { DiagnosticServerResponse } from "@cr/diagnostic-runtime";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type ListUsersCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

/** Aggregate-only beta telemetry. No Cognito profile or student row leaves the service. */
export interface BetaMetricsSnapshot {
  registered_users: number;
  students_with_progress: number;
  active_last_7_days: number;
  diagnostics_started: number;
  diagnostics_completed: number;
  mastery_evidence_recorded: number;
  generated_at: string;
}

export interface BetaMetricsService {
  read(): Promise<DiagnosticServerResponse>;
}

interface CognitoUserLister {
  send(command: ListUsersCommand): Promise<ListUsersCommandOutput>;
}

interface MetricsRow {
  students_with_progress: number | string;
  active_last_7_days: number | string;
  diagnostics_started: number | string;
  diagnostics_completed: number | string;
  mastery_evidence_recorded: number | string;
}

export const BETA_METRICS_SQL = `
select
  (select count(distinct student_id) from student_node_state) as students_with_progress,
  (select count(distinct student_id)
     from raw_response_log
    where created_at > now() - interval '7 days') as active_last_7_days,
  (select count(distinct student_id) from assessment_administration) as diagnostics_started,
  (select count(distinct student_id)
     from assessment_administration
    where submitted_at is not null) as diagnostics_completed,
  (select count(*) from mastery_evidence) as mastery_evidence_recorded
`;

const WARM_LAMBDA_CACHE_MS = 60_000;

/** Count every Cognito account without returning a user object to the metrics service. */
export async function countRegisteredUsers(
  userPoolId: string,
  client: CognitoUserLister = new CognitoIdentityProviderClient({}),
): Promise<number> {
  let paginationToken: string | undefined;
  let total = 0;
  do {
    const page = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 60,
        PaginationToken: paginationToken,
      }),
    );
    total += page.Users?.length ?? 0;
    paginationToken = page.PaginationToken;
  } while (paginationToken);
  return total;
}

function count(value: number | string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

/**
 * Build the public beta snapshot from two aggregate sources:
 * Cognito supplies account count; Aurora supplies product usage. The Cognito adapter returns
 * a number only, so this layer never receives an email, username, or profile attribute.
 */
export function createBetaMetricsService(options: {
  db: DataApiExecutor;
  registeredUserCount: () => Promise<number>;
  now?: () => Date;
}): BetaMetricsService {
  const now = options.now ?? (() => new Date());
  let cached: { expires_at: number; response: DiagnosticServerResponse } | undefined;
  return {
    async read() {
      const generatedAt = now();
      if (cached && generatedAt.valueOf() < cached.expires_at) {
        return cached.response;
      }
      const [registeredUsers, rows] = await Promise.all([
        options.registeredUserCount(),
        options.db.query<MetricsRow>(BETA_METRICS_SQL),
      ]);
      const row = rows[0];
      const body: BetaMetricsSnapshot = {
        registered_users: count(registeredUsers),
        students_with_progress: count(row?.students_with_progress),
        active_last_7_days: count(row?.active_last_7_days),
        diagnostics_started: count(row?.diagnostics_started),
        diagnostics_completed: count(row?.diagnostics_completed),
        mastery_evidence_recorded: count(row?.mastery_evidence_recorded),
        generated_at: generatedAt.toISOString(),
      };
      const response = { status: 200, body } satisfies DiagnosticServerResponse;
      cached = {
        expires_at: generatedAt.valueOf() + WARM_LAMBDA_CACHE_MS,
        response,
      };
      return response;
    },
  };
}
