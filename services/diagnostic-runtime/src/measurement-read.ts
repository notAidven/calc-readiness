import type { DataApiExecutor } from "@cr/db";
import {
  type AdministrationRecord,
  computeCoverageMeasurementFromRecords,
  computeMeasurement,
  createD1MultistageSpec,
  inProductScope,
  isCoverageScoringModelVersion,
  type MeasurementRecord,
  type MultistageSpec,
  type ReadinessMeasurement,
} from "@cr/diagnostic";
import type { UUID } from "@cr/state-schema";

export type { ReadinessMeasurement };

import {
  ADMINISTRATION_COLUMNS,
  type AdministrationRow,
  type ResponseRow,
  toAdministration,
  toResponse,
} from "./aurora-rows";

/**
 * Load one finalized administration + its append-only responses **in served
 * order** (`order by seq`, the 0002 amendment) over the RDS Data API. This is the
 * DB-backed shape the pure measurement pipeline consumes (Assessment_Scoring_Spec
 * §9). Server-only — the browser reads the paired result through `GET /api/measurement`.
 */
export async function loadAdministrationRecord(
  db: DataApiExecutor,
  administrationId: UUID,
): Promise<AdministrationRecord> {
  const administrations = await db.query<AdministrationRow>(
    `select ${ADMINISTRATION_COLUMNS} from public.assessment_administration
       where administration_id = :id::uuid`,
    { id: administrationId },
  );
  const administration = administrations[0];
  if (!administration) {
    throw new Error(`unknown administration ${administrationId}: not found`);
  }

  const responses = await db.query<ResponseRow>(
    `select * from public.assessment_item_response
       where administration_id = :id::uuid
       order by seq asc`,
    { id: administrationId },
  );

  return {
    administration: toAdministration(administration),
    responses: responses.map(toResponse),
  };
}

export interface StudentMeasurementOptions {
  spec?: MultistageSpec;
  invalidatedItemVersionIds?: ReadonlySet<string>;
}

/**
 * Load a student's most recent finalized `pre` + `post` administrations (with
 * their responses in served order) and compute the paired pre/post measurement.
 * Returns null when the student does not yet have both a finalized pre and post.
 */
export async function computeStudentMeasurement(
  db: DataApiExecutor,
  studentId: UUID,
  options: StudentMeasurementOptions = {},
): Promise<MeasurementRecord | null> {
  const administrations = await db.query<AdministrationRow>(
    `select ${ADMINISTRATION_COLUMNS} from public.assessment_administration
       where student_id = :sid::uuid
         and purpose in ('pre', 'post')
         and submitted_at is not null
       order by started_at desc`,
    { sid: studentId },
  );

  const pre = administrations.find((administration) => administration.purpose === "pre");
  const post = administrations.find((administration) => administration.purpose === "post");
  if (!pre || !post) {
    return null;
  }

  const [preRecord, postRecord] = await Promise.all([
    loadAdministrationRecord(db, pre.administration_id),
    loadAdministrationRecord(db, post.administration_id),
  ]);

  return computeMeasurement({
    pre: preRecord,
    post: postRecord,
    spec: options.spec ?? createD1MultistageSpec(),
    invalidatedItemVersionIds: options.invalidatedItemVersionIds,
  });
}

export interface StudentReadinessOptions {
  /** v1 (θ) recompute spec. Default `createD1MultistageSpec()`. */
  spec?: MultistageSpec;
  /** v2 (coverage) in-scope node set. Default the 62 in-product nodes. */
  scope?: readonly string[];
  invalidatedItemVersionIds?: ReadonlySet<string>;
}

/**
 * Unified measurement read (§9 step 5b): load a student's latest finalized
 * `pre` + `post` (responses in served order) and recompute the gain under **the
 * metric the administrations were scored with**, dispatched by the post's
 * `scoring_model_version` — coverage for v2, θ for v1. Records are loaded once and
 * fed to the SAME pure recompute the live engine used (INV-DIAG-4). A cross-model
 * pair (a v1 pre against a v2 post mid-migration) is caught by the chosen metric's
 * comparability gate (`scoring_model_version` mismatch → `not_comparable`), so no
 * θ/coverage numbers are ever silently compared. Returns null until BOTH exist.
 *
 * The shipped `GET /api/measurement` still calls `computeStudentMeasurement` (θ)
 * directly; this is wired in when the default instrument flips to the walk (the
 * item-pool-gated step 8), so the v1 endpoint + UI are untouched for now.
 */
export async function computeStudentReadiness(
  db: DataApiExecutor,
  studentId: UUID,
  options: StudentReadinessOptions = {},
): Promise<ReadinessMeasurement | null> {
  const administrations = await db.query<AdministrationRow>(
    `select ${ADMINISTRATION_COLUMNS} from public.assessment_administration
       where student_id = :sid::uuid
         and purpose in ('pre', 'post')
         and submitted_at is not null
       order by started_at desc`,
    { sid: studentId },
  );

  const pre = administrations.find((administration) => administration.purpose === "pre");
  const post = administrations.find((administration) => administration.purpose === "post");
  if (!pre || !post) {
    return null;
  }

  const [preRecord, postRecord] = await Promise.all([
    loadAdministrationRecord(db, pre.administration_id),
    loadAdministrationRecord(db, post.administration_id),
  ]);

  // Dispatch on the post (the student's current instrument): it defines the
  // reported metric; a lagging pre of a different model falls out as not_comparable.
  //
  // "Is this ANY coverage version", not "is this the current one". A post stamped
  // with a superseded coverage version is still a walk record and still recomputes
  // as coverage — under its own rules — where an equality check would route it to
  // the θ path and throw on a stage it does not have.
  if (isCoverageScoringModelVersion(post.scoring_model_version)) {
    return {
      model: "coverage",
      measurement: computeCoverageMeasurementFromRecords({
        pre: preRecord,
        post: postRecord,
        scope: options.scope ?? inProductScope(),
        invalidatedItemVersionIds: options.invalidatedItemVersionIds,
      }),
    };
  }

  return {
    model: "ability",
    measurement: computeMeasurement({
      pre: preRecord,
      post: postRecord,
      spec: options.spec ?? createD1MultistageSpec(),
      invalidatedItemVersionIds: options.invalidatedItemVersionIds,
    }),
  };
}
