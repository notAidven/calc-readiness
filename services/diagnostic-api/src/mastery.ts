import { type DataApiClient, type DataApiExecutor, json } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import {
  checkerVersionForPracticeItem,
  PRACTICE_AUTHORITY_ITEMS_BY_ID,
  practiceAuthorityChecker,
} from "@cr/item-bank";
import {
  createMasteryService,
  type EvidenceResponse,
  type MasteryStateStore,
  PRACTICE_SET_SIZE,
  type ResponseCorrectness,
  type StoredMastery,
  type SubmitAssessmentEvidenceInput,
  type SubmitAssessmentEvidenceResult,
} from "@cr/mastery-service";
import type { CompletionStatus, Mastery, UUID } from "@cr/state-schema";

import { describeWriteFailure } from "./writes";

/**
 * THE LEARNING-RECORD WRITER, and the reason `writes.ts` still refuses to be one.
 *
 * `student_node_state` had exactly one writer before this file — the diagnostic's placement
 * seed, which sets `placement_estimate` and nothing else. So a signed-in learner could
 * finish a lesson and a practice set and have neither recorded: `mastery` stayed 0,
 * `completion_status` is generated over it and so stayed `locked`, and `lesson_stage` stayed
 * `not_started`. The visible consequence was that the building never left Foundation, which
 * meant the "Continue construction" callout never appeared and the practice set could not be
 * reached at all in account mode.
 *
 * ## Why this is a separate file from `writes.ts` rather than two more fields on the city
 *
 * `POST /api/city` takes a whole-city snapshot produced by the browser, and it declines to
 * persist a learning record for a reason that has not changed: a body the browser composes
 * cannot be allowed to assert what a learner knows. Contracts §3 puts `mastery` behind the
 * mastery service and says it "is the ONLY mastery writer".
 *
 * This file is that writer, and it earns the title by never accepting a verdict. The wire
 * carries RAW ANSWERS — {@link EvidenceResponse} has no correctness field, by construction —
 * and correctness is recomputed here against the frozen bank before any mastery is derived
 * from it. A client that supplies its own grade is not trusted and not ignored either; it is
 * rejected, in {@link parseEvidenceSubmission}, so that a browser which starts sending one
 * finds out rather than silently having it dropped.
 *
 * `services/diagnostic-api/src/economy.ts` already grades this way for the interleaved
 * clear, and this file deliberately reuses its checker, its pool and its error shape rather
 * than inventing a second way to be authoritative in the same Lambda.
 *
 * ## What it may write, and where that permission comes from
 *
 * `0004_civilization_state.sql` Group A grants `app_service`
 * `update (mastery, mastery_updated_at, lesson_stage, last_practiced_at)` and nothing wider.
 * That grant has existed, unused, since the civilization-persistence wave: its own comment
 * says it is "the whole of the change needed to unfreeze mastery". This file is the writer
 * it was waiting for, so it needed no new grant on that table — only `0014_mastery_evidence`
 * for the idempotency row.
 *
 * `completion_status` is never written. It is `generated always as … stored` over `mastery`,
 * so it follows the mastery write on its own, and Postgres would reject the statement if it
 * were named. The store below therefore takes the service's `completion_status` and uses it
 * only for the evidence record.
 */

/**
 * Every statement this lane issues, in one object so `test/masteryWriteGrants.test.ts` can
 * read the columns out of them and hold them against the migrations. Kept in the shape
 * `CITY_WRITE_STATEMENTS` uses for the same reason: a grants test that reads a hand-copied
 * list of columns is a test of somebody's memory.
 */
export const MASTERY_WRITE_STATEMENTS = {
  /**
   * Materialize the row before either writer touches it.
   *
   * The insert grant from `0001` is `(student_id, node_id, placement_estimate)` and the
   * column is `not null` with no default, so a row cannot be created without naming it. `0`
   * is the value the read model already synthesizes for a node the diagnostic never placed,
   * and `do nothing` means this can never overwrite a placement that is already there — so
   * it states no placement, it only makes somewhere for a stage and a mastery to go.
   *
   * ORDERING NOTE: `aurora-placement-writer.ts` inserts placements with `do nothing` too, so
   * a placement written AFTER this row exists would be dropped. The diagnostic is onboarding
   * and runs before any lesson, so this does not arise in the product order; it is written
   * down because it would be silent if it ever did.
   */
  ensureRow: `insert into public.student_node_state (student_id, node_id, placement_estimate)
    values (:sid::uuid, :nid, 0)
    on conflict (student_id, node_id) do nothing`,
  readMastery: `select mastery, completion_status from public.student_node_state
    where student_id = :sid::uuid and node_id = :nid
    for update`,
  /**
   * ONE ATOMIC PRACTICE RECEIPT. The evidence row is inserted immediately before this
   * statement in the same transaction, so a reader sees all of the attempt or none of it:
   * monotonic mastery, its field-specific timestamp, a finished lesson, and the time the
   * learner last practised.
   *
   * `greatest` is the database's second opinion on monotonicity. The service already computes
   * max(existing, evidenced), but this clause keeps a stale or racing caller incapable of
   * lowering the record. `mastery_updated_at` moves only when mastery itself rises;
   * `last_practiced_at` moves for every NEW attempt, including a weaker revisit.
   */
  finalizePractice: `update public.student_node_state
    set mastery_updated_at =
          case when mastery < :mastery then now() else mastery_updated_at end,
        mastery = greatest(mastery, :mastery),
        lesson_stage = 'done'::public.lesson_stage,
        last_practiced_at = now()
    where student_id = :sid::uuid and node_id = :nid`,
  /**
   * Also monotonic, over the enum's declaration order
   * (`not_started` < `teaching` < `practice` < `done`), which is what Postgres compares. A
   * lesson revisited from the menu must not drag a built skill back to Construction.
   */
  writeStage: `update public.student_node_state
    set lesson_stage = :stage::public.lesson_stage, last_practiced_at = now()
    where student_id = :sid::uuid and node_id = :nid
      and lesson_stage < :stage::public.lesson_stage`,
  readEvidence: `select student_id, node_id, mastery, completion_status, changed
    from public.mastery_evidence
    where evidence_id = :eid`,
  /**
   * `do nothing` rather than an error, because two submissions racing on one `evidence_id`
   * is exactly the replay this table exists to absorb. The caller re-reads afterwards, so
   * the loser of the race returns the winner's verdict instead of its own.
   */
  writeEvidence: `insert into public.mastery_evidence
      (evidence_id, student_id, node_id, mastery, completion_status, changed)
    values (:eid, :sid::uuid, :nid, :mastery, :status::public.completion_status, :changed)
    on conflict (evidence_id) do nothing`,
  writeResponses: `insert into public.raw_response_log
      (response_id, student_id, evidence_id, slot_index, item_version_id, item_version,
       template_id, template_params, node_id, difficulty, raw_answer, context, attempt,
       hints_used, revealed, time_on_item_ms, misconception_tag, equivalence_checker_version)
    select r.response_id, :sid::uuid, :eid, r.slot_index, r.item_version_id, r.item_version,
           r.template_id, r.template_params, :nid, r.difficulty, r.raw_answer, r.context,
           r.attempt, r.hints_used, r.revealed, r.time_on_item_ms, null,
           r.equivalence_checker_version
      from jsonb_to_recordset(:rows::jsonb) as r(
        response_id uuid,
        slot_index smallint,
        item_version_id text,
        item_version integer,
        template_id text,
        template_params jsonb,
        difficulty smallint,
        raw_answer jsonb,
        context text,
        attempt integer,
        hints_used integer,
        revealed boolean,
        time_on_item_ms integer,
        equivalence_checker_version integer
      )`,
} as const;

/** The lesson lane's column, in the order Postgres declares it. */
const LESSON_STAGES = ["not_started", "teaching", "practice", "done"] as const;
type LessonStage = (typeof LESSON_STAGES)[number];

const EVIDENCE_CONTEXTS: ReadonlySet<string> = new Set<
  SubmitAssessmentEvidenceInput["context"]
>(["lesson", "diagnostic-practice"]);

/**
 * Field names that would let a browser tell the server what it scored.
 *
 * None of them is part of {@link EvidenceResponse}, so a body carrying one is either a
 * client that has grown a verdict or a client that thinks this endpoint takes one. Both are
 * worth a 400: silently dropping the field would leave the sender believing it had been
 * honoured, which is how a grade the server never checked ends up trusted by everybody
 * downstream of the sender.
 */
const VERDICT_FIELDS: readonly string[] = [
  "correct",
  "client_correct",
  "authoritative_correct",
  "is_correct",
  "mastery",
  "score",
  "correct_count",
];

class MasteryAuthorityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "MasteryAuthorityError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Authoritative correctness, recomputed from the raw answer against the frozen bank.
 *
 * This is the server-side original of the recompute `apps/web/src/lessons/practiceSession.ts`
 * has been standing in for; its comment there calls itself a "server-side stand-in", and this
 * is what it was standing in for.
 *
 * An unknown `item_id` throws rather than returning `false`. A false would be scored as a
 * wrong answer, which quietly turns "this submission references an item that does not exist"
 * into "the learner got it wrong" — a 403 says which of those actually happened.
 *
 * `status === "correct"` rather than `client_correct`, matching `economy.ts`: an application
 * fault or a malformed answer has its own status, and only a genuine correct answer should
 * earn credit.
 */
const recomputeCorrectness: ResponseCorrectness = (response) => {
  const item = PRACTICE_AUTHORITY_ITEMS_BY_ID.get(response.item_id);
  if (item === undefined) {
    throw new MasteryAuthorityError(403, "evidence_item_unknown");
  }
  return (
    practiceAuthorityChecker({
      raw_answer: response.raw_answer,
      item_version_id: item.item_version_id,
      equivalence_checker_version: checkerVersionForPracticeItem(item),
    }).status === "correct"
  );
};

/** Every response must be an item of the node the submission claims to be evidence for. */
function assertItemsBelongToNode(
  nodeId: string,
  responses: readonly EvidenceResponse[],
): void {
  for (const response of responses) {
    const item = PRACTICE_AUTHORITY_ITEMS_BY_ID.get(response.item_id);
    if (item === undefined) {
      throw new MasteryAuthorityError(403, "evidence_item_unknown");
    }
    // Without this, a set of five items from an easy node would evidence mastery of a hard
    // one: the recompute would pass every answer and nothing else looks at where they came
    // from. The node is the unit mastery is stored against, so it is the unit to check.
    if (item.node_id !== nodeId) {
      throw new MasteryAuthorityError(403, "evidence_node_mismatch");
    }
  }
}

interface EvidenceRow {
  student_id: UUID;
  node_id: string;
  mastery: number;
  completion_status: CompletionStatus;
  changed: boolean;
}

interface MasteryRow {
  mastery: number;
  completion_status: CompletionStatus;
}

/**
 * Read a stored receipt only when this authenticated student and node own it.
 *
 * `evidence_id` is globally unique by the frozen schema. A caller who reuses another
 * student's id, or re-labels one of their own attempts as another node, is not replaying the
 * attempt and must not receive its result.
 */
function receiptFor(
  row: EvidenceRow,
  studentId: UUID,
  nodeId: string,
): SubmitAssessmentEvidenceResult {
  if (row.student_id !== studentId) {
    throw new MasteryAuthorityError(409, "evidence_owner_mismatch");
  }
  if (row.node_id !== nodeId) {
    throw new MasteryAuthorityError(409, "evidence_node_conflict");
  }
  return {
    node_id: row.node_id,
    mastery: row.mastery as Mastery,
    changed: row.changed,
    completion_status: row.completion_status,
  };
}

interface AuroraMasteryRequestStore {
  readonly store: MasteryStateStore;
  /** A concurrent request won the evidence-id insert and owns the replay result. */
  replayedResult(): SubmitAssessmentEvidenceResult | null;
}

interface PracticeResponseLogRow {
  response_id: string;
  slot_index: number;
  item_version_id: string;
  item_version: number;
  template_id: string | null;
  template_params: Readonly<Record<string, unknown>> | null;
  difficulty: number;
  raw_answer: unknown;
  context: "lesson" | "diagnostic";
  attempt: number;
  hints_used: number;
  revealed: boolean;
  time_on_item_ms: number;
  equivalence_checker_version: number;
}

/** Server-enriched, append-only response rows for this exact five-slot attempt. */
function responseLogRows(
  responses: readonly EvidenceResponse[],
  context: SubmitAssessmentEvidenceInput["context"],
): PracticeResponseLogRow[] {
  return responses.map((response, slot_index) => {
    const item = PRACTICE_AUTHORITY_ITEMS_BY_ID.get(response.item_id);
    if (item === undefined) {
      // The ownership/shape validation runs before this function. Keep this assertion here
      // because an audit row with guessed metadata is worse than rolling the transaction back.
      throw new MasteryAuthorityError(403, "evidence_item_unknown");
    }
    return {
      response_id: crypto.randomUUID(),
      slot_index,
      item_version_id: item.item_version_id,
      item_version: response.item_version,
      template_id: item.template_id ?? null,
      template_params: item.template_params ?? null,
      difficulty: item.difficulty,
      raw_answer: response.raw_answer,
      context: context === "lesson" ? "lesson" : "diagnostic",
      attempt: response.attempt,
      hints_used: response.hints_used,
      revealed: response.revealed,
      time_on_item_ms: response.time_on_item_ms,
      equivalence_checker_version: checkerVersionForPracticeItem(item),
    };
  });
}

/**
 * The Aurora {@link MasteryStateStore}, bound to one authenticated student and one locked
 * node row for the life of one transaction.
 *
 * `setMastery` intentionally buffers. The evidence insert happens FIRST in
 * `recordEvidenceResult`; only its winner may finalize the node state. That ordering makes a
 * duplicate id safe across concurrent requests: the loser returns the winner's receipt and
 * never touches mastery, timestamps, or lesson status.
 */
function createAuroraMasteryStore(
  tx: DataApiExecutor,
  studentId: UUID,
  nodeId: string,
  locked: StoredMastery,
  responseRows: readonly PracticeResponseLogRow[],
): AuroraMasteryRequestStore {
  const scope = { sid: studentId, nid: nodeId };
  let pendingMastery: Mastery | null = null;
  let replayed: SubmitAssessmentEvidenceResult | null = null;

  async function readEvidence(evidenceId: string): Promise<EvidenceRow | null> {
    const rows = await tx.query<EvidenceRow>(MASTERY_WRITE_STATEMENTS.readEvidence, {
      ...scope,
      eid: evidenceId,
    });
    return rows[0] ?? null;
  }

  return {
    replayedResult: () => replayed,
    store: {
      getMastery(node_id): StoredMastery | null {
        return node_id === nodeId ? locked : null;
      },
      setMastery(node_id, mastery): void {
        if (node_id !== nodeId) {
          throw new MasteryAuthorityError(403, "evidence_node_mismatch");
        }
        pendingMastery = mastery;
      },
      async getEvidenceResult(evidence_id): Promise<SubmitAssessmentEvidenceResult | null> {
        const row = await readEvidence(evidence_id);
        return row === null ? null : receiptFor(row, studentId, nodeId);
      },
      async recordEvidenceResult(evidence_id, result): Promise<void> {
        const inserted = await tx.execute(MASTERY_WRITE_STATEMENTS.writeEvidence, {
          ...scope,
          eid: evidence_id,
          mastery: result.mastery,
          status: result.completion_status,
          changed: result.changed,
        });
        if (inserted === 0) {
          // A unique conflict waits for the winning transaction in Postgres. Re-read its
          // committed receipt and return it as an idempotent replay instead of finalizing
          // this request's independently computed result.
          const winner = await readEvidence(evidence_id);
          if (winner === null) {
            throw new Error("evidence id conflicted without a stored receipt");
          }
          replayed = { ...receiptFor(winner, studentId, nodeId), changed: false };
          return;
        }

        // `pendingMastery` is non-null only when the service observed a raise. The result is
        // authoritative either way and is what finalizes a weaker revisit too.
        if (pendingMastery !== null && pendingMastery !== result.mastery) {
          throw new Error("buffered mastery disagrees with the evidence result");
        }
        await tx.execute(MASTERY_WRITE_STATEMENTS.writeResponses, {
          ...scope,
          eid: evidence_id,
          rows: json(responseRows),
        });
        await tx.execute(MASTERY_WRITE_STATEMENTS.finalizePractice, {
          ...scope,
          mastery: result.mastery,
        });
      },
    },
  };
}

/** One response, with no verdict on it. */
function parseResponse(value: unknown, index: number): EvidenceResponse | string {
  if (typeof value !== "object" || value === null) {
    return `responses[${index}] must be an object`;
  }
  const body = value as Record<string, unknown>;
  const carried = VERDICT_FIELDS.filter((field) => field in body);
  if (carried.length > 0) {
    return `responses[${index}] must not carry a verdict (${carried.join(", ")}); this endpoint recomputes correctness`;
  }
  if (typeof body.item_id !== "string" || body.item_id === "") {
    return `responses[${index}].item_id must be an item-version id`;
  }
  if (
    typeof body.item_version !== "number" ||
    !Number.isInteger(body.item_version) ||
    body.item_version < 1
  ) {
    return `responses[${index}].item_version must be a positive integer`;
  }
  if (!("raw_answer" in body)) {
    return `responses[${index}].raw_answer is required (use null for a revealed slot)`;
  }
  if (typeof body.revealed !== "boolean") {
    return `responses[${index}].revealed must be a boolean`;
  }
  const hints = body.hints_used;
  const attempt = body.attempt;
  if (typeof hints !== "number" || !Number.isInteger(hints) || hints < 0) {
    return `responses[${index}].hints_used must be a non-negative integer`;
  }
  if (typeof attempt !== "number" || !Number.isInteger(attempt) || attempt < 1) {
    return `responses[${index}].attempt must be a positive integer`;
  }
  const time = body.time_on_item_ms;
  if (typeof time !== "number" || !Number.isSafeInteger(time) || time < 0) {
    return `responses[${index}].time_on_item_ms must be a non-negative integer`;
  }
  return {
    item_id: body.item_id,
    item_version: body.item_version,
    raw_answer: body.raw_answer,
    hints_used: hints,
    revealed: body.revealed,
    attempt,
    time_on_item_ms: time,
  };
}

export interface EvidenceSubmission {
  node_id: string;
  evidence_id: string;
  context: SubmitAssessmentEvidenceInput["context"];
  responses: EvidenceResponse[];
}

export function parseEvidenceSubmission(
  value: unknown,
): { submission: EvidenceSubmission } | { error: string } {
  if (typeof value !== "object" || value === null) {
    return { error: "the request body must be an evidence object" };
  }
  const body = value as Record<string, unknown>;
  if ("student_id" in body) {
    return { error: "student_id comes from authentication" };
  }
  if (typeof body.node_id !== "string" || body.node_id === "") {
    return { error: "node_id must be a skill id" };
  }
  if (typeof body.evidence_id !== "string" || body.evidence_id === "") {
    return { error: "evidence_id must be a non-empty id" };
  }
  if (typeof body.context !== "string" || !EVIDENCE_CONTEXTS.has(body.context)) {
    return { error: "context must be lesson or diagnostic-practice" };
  }
  // Rejected here rather than left to `masteryFromCorrectCount`, which throws on a set that
  // is not exactly five. That throw is right for a programming error and wrong as an HTTP
  // answer: it would leave the browser with a 500 for a request whose problem is its length.
  if (!Array.isArray(body.responses) || body.responses.length !== PRACTICE_SET_SIZE) {
    return { error: `responses must be exactly ${PRACTICE_SET_SIZE} resolved slots` };
  }
  const responses: EvidenceResponse[] = [];
  for (const [index, raw] of body.responses.entries()) {
    const parsed = parseResponse(raw, index);
    if (typeof parsed === "string") {
      return { error: parsed };
    }
    responses.push(parsed);
  }
  return {
    submission: {
      node_id: body.node_id,
      evidence_id: body.evidence_id,
      context: body.context as SubmitAssessmentEvidenceInput["context"],
      responses,
    },
  };
}

/** The five distinct authored slots and their locked 1×L1 / 2×L2 / 2×L3 composition. */
function assertEvidenceSetShape(responses: readonly EvidenceResponse[]): void {
  const ids = responses.map((response) => response.item_id);
  if (new Set(ids).size !== ids.length) {
    throw new MasteryAuthorityError(403, "evidence_slot_duplicate");
  }
  const difficulties = responses
    .map((response) => PRACTICE_AUTHORITY_ITEMS_BY_ID.get(response.item_id)?.difficulty)
    .sort();
  if (difficulties.join(",") !== "1,2,2,3,3") {
    throw new MasteryAuthorityError(403, "evidence_set_shape");
  }
}

export function parseLessonStageWrite(
  value: unknown,
): { node_id: string; stage: LessonStage } | { error: string } {
  if (typeof value !== "object" || value === null) {
    return { error: "the request body must be a lesson-stage object" };
  }
  const body = value as Record<string, unknown>;
  if (typeof body.node_id !== "string" || body.node_id === "") {
    return { error: "node_id must be a skill id" };
  }
  if (
    typeof body.lesson_stage !== "string" ||
    !LESSON_STAGES.includes(body.lesson_stage as LessonStage)
  ) {
    return { error: `lesson_stage must be one of ${LESSON_STAGES.join(", ")}` };
  }
  return { node_id: body.node_id, stage: body.lesson_stage as LessonStage };
}

/**
 * Cognito-scoped writers for the learning record. Same contract as the other write services:
 * the token is verified inside the method, the student id is the verified `sub` and never a
 * field of the body, and an unverified caller is refused before the body is parsed.
 */
export interface MasteryWriteService {
  /** POST /api/mastery/evidence — score one practice set and persist the mastery it earns. */
  submitEvidence(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
  /** POST /api/lesson/stage — advance the lesson lane's own column, monotonically. */
  setLessonStage(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
}

export interface MasteryWriteServiceDeps {
  db: DataApiClient;
  authenticate: DiagnosticAuthenticator;
}

export function createAuroraMasteryService(
  deps: MasteryWriteServiceDeps,
): MasteryWriteService {
  const { db, authenticate } = deps;

  async function guarded(
    token: string | null,
    run: (studentId: UUID) => Promise<DiagnosticServerResponse>,
  ): Promise<DiagnosticServerResponse> {
    const identity = await authenticate(token);
    if (!identity) {
      return { status: 401, body: { error: "unauthorized" } };
    }
    try {
      return await run(identity.student_id);
    } catch (error) {
      if (error instanceof MasteryAuthorityError) {
        return { status: error.status, body: { error: error.code } };
      }
      return { status: 500, body: { error: describeWriteFailure(error) } };
    }
  }

  return {
    submitEvidence(token, body) {
      return guarded(token, async (studentId) => {
        const parsed = parseEvidenceSubmission(body);
        if ("error" in parsed) {
          return { status: 400, body: { error: parsed.error } };
        }
        const { submission } = parsed;
        assertItemsBelongToNode(submission.node_id, submission.responses);
        assertEvidenceSetShape(submission.responses);
        // One transaction over the read-then-write the monotonic max depends on, and over
        // the evidence row that makes a replay a no-op. Split, a retry could read the old
        // mastery, and a crash between them could raise mastery with nothing recording why.
        const result = await db.withTransaction(async (tx) => {
          // Materialize and lock the node before the service reads its max. Different
          // evidence ids for one node then serialize at the database row, so each `changed`
          // receipt is computed against the mastery the previous attempt actually left.
          await tx.execute(MASTERY_WRITE_STATEMENTS.ensureRow, {
            sid: studentId,
            nid: submission.node_id,
          });
          const rows = await tx.query<MasteryRow>(MASTERY_WRITE_STATEMENTS.readMastery, {
            sid: studentId,
            nid: submission.node_id,
          });
          const row = rows[0];
          if (row === undefined) {
            throw new Error("mastery row was not materialized");
          }
          const requestStore = createAuroraMasteryStore(
            tx,
            studentId,
            submission.node_id,
            {
              mastery: row.mastery as Mastery,
              completion_status: row.completion_status,
            },
            responseLogRows(submission.responses, submission.context),
          );
          const service = createMasteryService({
            store: requestStore.store,
            recomputeCorrectness,
          });
          const computed = await service.submitAssessmentEvidence({
            student_id: studentId,
            context: submission.context,
            node_id: submission.node_id,
            responses: submission.responses,
            evidence_id: submission.evidence_id,
          });
          return requestStore.replayedResult() ?? computed;
        });
        return { status: 200, body: result };
      });
    },

    setLessonStage(token, body) {
      return guarded(token, async (studentId) => {
        const parsed = parseLessonStageWrite(body);
        if ("error" in parsed) {
          return { status: 400, body: { error: parsed.error } };
        }
        const params = { sid: studentId, nid: parsed.node_id, stage: parsed.stage };
        await db.withTransaction(async (tx) => {
          await tx.execute(MASTERY_WRITE_STATEMENTS.ensureRow, params);
          await tx.execute(MASTERY_WRITE_STATEMENTS.writeStage, params);
        });
        // Not `{updated: n}`: the statement is monotonic, so a no-op is the correct outcome
        // for a revisit and telling the browser it "failed" would invite it to retry.
        return {
          status: 200,
          body: { node_id: parsed.node_id, lesson_stage: parsed.stage },
        };
      });
    },
  };
}
