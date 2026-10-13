/**
 * Server-only entry (`@cr/diagnostic-runtime/aurora`). Everything here reaches AWS
 * — the RDS Data API (`@cr/db` → `@aws-sdk/client-rds-data`) and Cognito JWT
 * verification (`aws-jwt-verify`) — so it MUST NOT be imported by the browser
 * bundle. The transport-agnostic core (engine runtime, in-memory doubles, the
 * `DiagnosticServer` shell + types) stays on the main entry (`@cr/diagnostic-runtime`).
 */
export { createAuroraPlacementWriter } from "./aurora-placement-writer";
export { createAuroraResponseRepository } from "./aurora-response-repository";
export {
  ADMINISTRATION_COLUMNS,
  type AdministrationRow,
  type NeighborhoodStateRow,
  type ResponseRow,
  STUDENT_NODE_STATE_COLUMNS,
  type StudentNodeStateRow,
  toAdministration,
  toNeighborhood,
  toNodeState,
  toResponse,
} from "./aurora-rows";
export {
  type AuroraDiagnosticRuntimeDeps,
  type AuroraDiagnosticServerDeps,
  type AuroraWalkDiagnosticServerDeps,
  type AuroraWalkRuntimeDeps,
  createAuroraDiagnosticRuntime,
  createAuroraDiagnosticServer,
  createAuroraWalkDiagnosticServer,
  createAuroraWalkRuntime,
} from "./aurora-server";
export { createAuroraDiagnosticStore } from "./aurora-store";
export { createAuroraWalkStore } from "./aurora-walk-store";
export {
  type CognitoAuthenticatorConfig,
  createCognitoAuthenticator,
} from "./cognito-auth";
export {
  computeStudentCoverageMeasurement,
  type StudentCoverageOptions,
} from "./coverage-read";
export {
  computeStudentMeasurement,
  computeStudentReadiness,
  loadAdministrationRecord,
  type ReadinessMeasurement,
  type StudentMeasurementOptions,
  type StudentReadinessOptions,
} from "./measurement-read";
