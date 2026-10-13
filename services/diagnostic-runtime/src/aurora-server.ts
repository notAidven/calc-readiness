import { createD1AnswerChecker, createProductAnswerChecker } from "@cr/components";
import {
  type DataApiClient,
  type DataApiExecutor,
  lockAccountInitialization,
} from "@cr/db";
import {
  type CompletedDiagnostic,
  type CompletedWalkDiagnostic,
  createD1MultistageSpec,
  type FrontierWalkConfig,
  type MultistageSpec,
  type StageAdvance,
  type StageServe,
  type WalkAdvance,
  type WalkItemSource,
  type WalkServe,
} from "@cr/diagnostic";
import {
  createItemPackWalkSource,
  D1_ITEM_PACK,
  DIAGNOSTIC_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_SCOPE,
  type ItemPackEntry,
  toD1ItemVersions,
  toProductItemVersions,
} from "@cr/item-bank";
import { createAuthoritativeScorer } from "@cr/scorer";
import type { AssessmentItemSubmission, UUID } from "@cr/state-schema";
import { createAuroraPlacementWriter } from "./aurora-placement-writer";
import { createAuroraResponseRepository } from "./aurora-response-repository";
import { createAuroraDiagnosticStore } from "./aurora-store";
import { createAuroraWalkStore } from "./aurora-walk-store";
import {
  createDiagnosticRuntime,
  type DiagnosticRuntime,
  type DiagnosticRuntimeVersions,
} from "./runtime";
import {
  type DiagnosticAuthenticator,
  type DiagnosticServer,
  parseCommand,
} from "./server";
import {
  createWalkRuntime,
  type WalkRuntime,
  type WalkRuntimeVersions,
} from "./walk-runtime";
import { oneProbeSubmission, walkAdvanceToStage, walkServeToStage } from "./walk-stage";

export interface AuroraDiagnosticRuntimeDeps {
  /** Data API executor — the root client, or a transaction scope for atomic ops. */
  db: DataApiExecutor;
  spec?: MultistageSpec;
  itemPack?: readonly ItemPackEntry[];
  versions?: Partial<DiagnosticRuntimeVersions>;
}

/**
 * Compose the diagnostic runtime (engine + item bank + authoritative scorer +
 * placement) over the RDS Data API. The three persistence ports are Aurora-backed
 * and the scorer wraps the D1 checker over the response repository. Server
 * contexts only. Pass a transaction-scoped executor to make an operation atomic.
 */
export function createAuroraDiagnosticRuntime(
  deps: AuroraDiagnosticRuntimeDeps,
): DiagnosticRuntime {
  const itemPack = deps.itemPack ?? D1_ITEM_PACK;
  const checker = createD1AnswerChecker({ itemVersions: toD1ItemVersions(itemPack) });
  return createDiagnosticRuntime({
    store: createAuroraDiagnosticStore(deps.db),
    scorer: createAuthoritativeScorer(checker, createAuroraResponseRepository(deps.db)),
    placementWriter: createAuroraPlacementWriter(deps.db),
    spec: deps.spec,
    itemPack,
    versions: deps.versions,
  });
}

export interface AuroraWalkRuntimeDeps {
  /** Data API executor — the root client, or a transaction scope for atomic ops. */
  db: DataApiExecutor;
  /** In-scope nodes + entry tier for the prerequisite-gated walk. */
  config: FrontierWalkConfig;
  /**
   * Node-addressed item source (>= 3 parallel items per served cell for the 2-of-3
   * rule). Injected until the item bank exposes a pack-backed walk source (v2 §8).
   */
  itemSource: WalkItemSource;
  /** The walk checker's item pool (defaults to the content-derived diagnostic pack). */
  itemPack?: readonly ItemPackEntry[];
  blueprintVersion?: number;
  versions?: Partial<WalkRuntimeVersions>;
}

/**
 * Compose the v2 prerequisite-gated walk runtime over the RDS Data API. The two
 * v2-native ports are Aurora-backed — walk state persists to
 * `assessment_administration_walk` ({@link createAuroraWalkStore}) and responses
 * append to the shared immutable log (read back in served order for reproducible
 * coverage via {@link computeStudentCoverageMeasurement}). The administration store,
 * authoritative scorer, and placement writer are the SAME Aurora adapters v1 uses.
 * Server contexts only; pass a transaction-scoped executor to make a turn atomic.
 */
export function createAuroraWalkRuntime(deps: AuroraWalkRuntimeDeps): WalkRuntime {
  const itemPack = deps.itemPack ?? DIAGNOSTIC_WALK_ITEM_PACK;
  const checker = createProductAnswerChecker({
    itemVersions: toProductItemVersions(itemPack),
  });
  return createWalkRuntime({
    config: deps.config,
    itemSource: deps.itemSource,
    store: createAuroraDiagnosticStore(deps.db),
    walkStore: createAuroraWalkStore(deps.db),
    scorer: createAuthoritativeScorer(checker, createAuroraResponseRepository(deps.db)),
    placementWriter: createAuroraPlacementWriter(deps.db),
    blueprintVersion: deps.blueprintVersion,
    versions: deps.versions,
  });
}

export interface AuroraDiagnosticServerDeps {
  /** Aurora Data API client (service identity; the only DB caller). */
  db: DataApiClient;
  /** Verifies the bearer token → student_id (Cognito JWT verification). */
  authenticate: DiagnosticAuthenticator;
  spec?: MultistageSpec;
  itemPack?: readonly ItemPackEntry[];
  versions?: Partial<DiagnosticRuntimeVersions>;
}

/**
 * The AWS-native browser_auth server: the whole engine runs here on the Aurora
 * Data API behind Cognito JWT verification. Identity is derived from the verified
 * token and NEVER trusted from the payload, and each mutating call is checked
 * against the administration's owner. Every engine operation that writes runs in a
 * single Data API transaction (tx-scoped ports), so a failed `submitStage`/
 * `finalize` rolls back cleanly (Contracts §5, Diagnostic-Persistence amendment).
 */
export function createAuroraDiagnosticServer(
  deps: AuroraDiagnosticServerDeps,
): DiagnosticServer {
  const { db, authenticate } = deps;
  const spec = deps.spec ?? createD1MultistageSpec();
  const itemPack = deps.itemPack ?? D1_ITEM_PACK;
  const checker = createD1AnswerChecker({ itemVersions: toD1ItemVersions(itemPack) });

  const buildRuntime = (exec: DataApiExecutor): DiagnosticRuntime =>
    createDiagnosticRuntime({
      store: createAuroraDiagnosticStore(exec),
      scorer: createAuthoritativeScorer(checker, createAuroraResponseRepository(exec)),
      placementWriter: createAuroraPlacementWriter(exec),
      spec,
      itemPack,
      versions: deps.versions,
    });

  // Reusable, DB-touching-only-for-reads instances (built once).
  const template = buildRuntime(db);
  const readStore = createAuroraDiagnosticStore(db);

  async function requireOwner(administrationId: UUID, studentId: UUID): Promise<boolean> {
    const administration = await readStore.getAdministration(administrationId);
    return administration.student_id === studentId;
  }

  return {
    async handle(request) {
      const identity = await authenticate(request.token);
      if (!identity) {
        return { status: 401, body: { error: "unauthorized" } };
      }

      const parsed = parseCommand(request.body);
      if (!parsed.ok) {
        return { status: 400, body: { error: parsed.error } };
      }
      const command = parsed.command;

      try {
        switch (command.action) {
          case "start": {
            const newAdministration = template.newAdministration({
              student_id: identity.student_id,
              purpose: command.purpose,
              form_id: command.form_id,
            });
            const served: StageServe = await db.withTransaction(async (tx) => {
              await lockAccountInitialization(tx, identity.student_id);
              return buildRuntime(tx).engine.start(newAdministration);
            });
            return {
              status: 200,
              body: {
                administration_id: served.administration.administration_id,
                stage_id: served.stage_id,
                items: served.items,
              },
            };
          }
          case "submitStage": {
            if (!(await requireOwner(command.administration_id, identity.student_id))) {
              return { status: 403, body: { error: "forbidden" } };
            }
            // Force the server's administration id + checker version onto every
            // submission — never trust client-claimed ids; `authoritative_correct`
            // is recomputed server-side regardless of `client_correct`.
            const submissions: AssessmentItemSubmission[] = command.submissions.map(
              (submission) => ({
                ...submission,
                administration_id: command.administration_id,
                equivalence_checker_version: template.versions.equivalence_checker_version,
              }),
            );
            const advance: StageAdvance = await db.withTransaction((tx) =>
              buildRuntime(tx).engine.submitStage(command.administration_id, submissions),
            );
            return { status: 200, body: advance };
          }
          case "finalize": {
            if (!(await requireOwner(command.administration_id, identity.student_id))) {
              return { status: 403, body: { error: "forbidden" } };
            }
            const completed: CompletedDiagnostic = await db.withTransaction((tx) =>
              buildRuntime(tx).engine.finalize(command.administration_id),
            );
            return { status: 200, body: completed };
          }
        }
      } catch (error) {
        return {
          status: 500,
          body: { error: error instanceof Error ? error.message : "internal error" },
        };
      }
    },
  };
}

export interface AuroraWalkDiagnosticServerDeps {
  /** Aurora Data API client (service identity; the only DB caller). */
  db: DataApiClient;
  /** Verifies the bearer token → student_id (Cognito JWT verification). */
  authenticate: DiagnosticAuthenticator;
  /**
   * In-scope nodes + entry tier. Defaults to the CONTENT-DERIVED scope
   * (`DIAGNOSTIC_WALK_SCOPE`) at tier L2 — every in-product node with a practice pool
   * and ≥3 servable walk items per form — not the six D1 nodes it used to.
   */
  config?: FrontierWalkConfig;
  /** Node-addressed probe source (defaults to the diagnostic walk pack, ≥3 items/cell). */
  itemSource?: WalkItemSource;
  /** The checker's item pool (defaults to the diagnostic walk pack the source serves). */
  itemPack?: readonly ItemPackEntry[];
  blueprintVersion?: number;
  versions?: Partial<WalkRuntimeVersions>;
}

/**
 * The AWS-native browser_auth server for the **v2 prerequisite-gated walk** — the
 * default onboarding instrument after the `scoring_model_version` flip (Amendment
 * v2 §9 step 7). Same deployed shape as {@link createAuroraDiagnosticServer}: the
 * whole engine runs here on the Aurora Data API behind Cognito JWT verification,
 * identity comes from the verified token (never the payload), each mutating call is
 * owner-checked, and every write runs in one Data API transaction. It differs only
 * in the instrument — one adaptive probe per turn, presented over the SAME stage
 * command protocol via {@link walkServeToStage}/{@link walkAdvanceToStage} (a probe
 * is a one-item section) — and the finalized metric: depth-weighted readiness
 * coverage ({@link CompletedWalkDiagnostic}) instead of the ability frontier. The
 * paired gain is read back through `GET /api/measurement` → `computeStudentReadiness`.
 */
export function createAuroraWalkDiagnosticServer(
  deps: AuroraWalkDiagnosticServerDeps,
): DiagnosticServer {
  const { db, authenticate } = deps;
  const config = deps.config ?? {
    scope: DIAGNOSTIC_WALK_SCOPE,
    entryTier: 2,
  };
  const itemPack = deps.itemPack ?? DIAGNOSTIC_WALK_ITEM_PACK;
  const itemSource = deps.itemSource ?? createItemPackWalkSource(itemPack);
  // The PRODUCT (v2) checker, matching `DEFAULT_WALK_VERSIONS.equivalence_checker_version`.
  // Both must move together: each fails closed on a version mismatch, so a half-migration
  // returns `scoring_error` on every item, D1's included.
  const checker = createProductAnswerChecker({
    itemVersions: toProductItemVersions(itemPack),
  });

  const buildRuntime = (exec: DataApiExecutor): WalkRuntime =>
    createWalkRuntime({
      config,
      itemSource,
      store: createAuroraDiagnosticStore(exec),
      walkStore: createAuroraWalkStore(exec),
      scorer: createAuthoritativeScorer(checker, createAuroraResponseRepository(exec)),
      placementWriter: createAuroraPlacementWriter(exec),
      blueprintVersion: deps.blueprintVersion,
      versions: deps.versions,
    });

  // Pure-builder instance (versions/newAdministration) + a read store for ownership.
  const template = buildRuntime(db);
  const readStore = createAuroraDiagnosticStore(db);

  async function requireOwner(administrationId: UUID, studentId: UUID): Promise<boolean> {
    const administration = await readStore.getAdministration(administrationId);
    return administration.student_id === studentId;
  }

  return {
    async handle(request) {
      const identity = await authenticate(request.token);
      if (!identity) {
        return { status: 401, body: { error: "unauthorized" } };
      }

      const parsed = parseCommand(request.body);
      if (!parsed.ok) {
        return { status: 400, body: { error: parsed.error } };
      }
      const command = parsed.command;

      try {
        switch (command.action) {
          case "start": {
            const newAdministration = template.newAdministration({
              student_id: identity.student_id,
              purpose: command.purpose,
              form_id: command.form_id,
            });
            const served: WalkServe = await db.withTransaction(async (tx) => {
              await lockAccountInitialization(tx, identity.student_id);
              return buildRuntime(tx).engine.start(newAdministration);
            });
            const stage = walkServeToStage(served);
            return {
              status: 200,
              body: {
                administration_id: served.administration.administration_id,
                stage_id: stage.stage_id,
                items: stage.items,
              },
            };
          }
          case "submitStage": {
            if (!(await requireOwner(command.administration_id, identity.student_id))) {
              return { status: 403, body: { error: "forbidden" } };
            }
            // The walk serves one probe per section: take the single submission and
            // force the server's administration id + checker version onto it (never
            // trust client-claimed ids; correctness is recomputed server-side).
            const submission: AssessmentItemSubmission = {
              ...oneProbeSubmission(command.submissions),
              administration_id: command.administration_id,
              equivalence_checker_version: template.versions.equivalence_checker_version,
            };
            const advance: WalkAdvance = await db.withTransaction((tx) =>
              buildRuntime(tx).engine.submitProbe(command.administration_id, submission),
            );
            return { status: 200, body: walkAdvanceToStage(advance) };
          }
          case "finalize": {
            if (!(await requireOwner(command.administration_id, identity.student_id))) {
              return { status: 403, body: { error: "forbidden" } };
            }
            const completed: CompletedWalkDiagnostic = await db.withTransaction((tx) =>
              buildRuntime(tx).engine.finalize(command.administration_id),
            );
            return { status: 200, body: completed };
          }
        }
      } catch (error) {
        return {
          status: 500,
          body: { error: error instanceof Error ? error.message : "internal error" },
        };
      }
    },
  };
}
