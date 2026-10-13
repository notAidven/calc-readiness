import type { DataApiExecutor } from "@cr/db";
import {
  type CoverageMeasurementRecord,
  computeCoverageMeasurementFromRecords,
  inProductScope,
} from "@cr/diagnostic";
import type { UUID } from "@cr/state-schema";

import { ADMINISTRATION_COLUMNS, type AdministrationRow } from "./aurora-rows";
import { loadAdministrationRecord } from "./measurement-read";

export interface StudentCoverageOptions {
  /**
   * In-scope node set the coverage is computed over. Defaults to the 62 in-product
   * nodes ({@link inProductScope}); narrow it to gate the metric to a shipped
   * sub-scope while the item bank fills in (Amendment v2 §8).
   */
  scope?: readonly string[];
  invalidatedItemVersionIds?: ReadonlySet<string>;
}

/**
 * Load a student's most recent finalized `pre` + `post` v2 walk administrations
 * (with their responses **in served order**, via {@link loadAdministrationRecord}'s
 * `order by seq`) and compute the paired depth-weighted readiness-coverage gain.
 *
 * The gain is recomputed purely from the immutable records — the finalized
 * `routing_path` (probe node order) + the append-only response rows — never from
 * the ephemeral walk state (INV-DIAG-4). This is the coverage analogue of
 * `computeStudentMeasurement` (θ). Returns null until the student has BOTH a
 * finalized pre and post. Server-only.
 */
export async function computeStudentCoverageMeasurement(
  db: DataApiExecutor,
  studentId: UUID,
  options: StudentCoverageOptions = {},
): Promise<CoverageMeasurementRecord | null> {
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

  return computeCoverageMeasurementFromRecords({
    pre: preRecord,
    post: postRecord,
    scope: options.scope ?? inProductScope(),
    invalidatedItemVersionIds: options.invalidatedItemVersionIds,
  });
}
