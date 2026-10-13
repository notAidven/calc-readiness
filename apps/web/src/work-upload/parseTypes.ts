/**
 * Photo-of-work upload — the v2 READING, as the browser sees it.
 *
 * Source of truth: `docs/Photo_Work_Upload_Scope.md` §3.5, whose third-party-model gate was
 * lifted by Gabe on 2026-08-05. Read that section's banner before working here: it carries
 * the ruling, its stated basis, and his explicit *"if security becomes a concern later on we
 * can touch on that."*
 *
 * ## Two invariants, and only one of them moved
 *
 * **STILL BINDING (§1, §3.5, §7):** a reading is NEVER an input to mastery, placement or the
 * pre/post metric. The ruling did not touch it, and made it matter more: the best frontier
 * model behind an API misreads something on **37.62% of real multi-step student pages**
 * (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4). It is enforced structurally, exactly as
 * `types.ts` enforces it for the upload itself — nothing in this type surface carries a mark,
 * a verdict or a mastery value, and `WorkParseClient` has one method that reads and none that
 * writes. `workUploadInvariant.test.ts` holds the module graph.
 *
 * **STILL BINDING (§3.5):** the reading is presented PROVISIONALLY. `provisional` is the
 * literal `true` rather than a boolean, so there is no value it can take that would show a
 * reading as settled, and `headline`/`caveat` arrive from the server so the hedge cannot be
 * lost by a surface that forgot to add one.
 */

/** How a reading turned out. Mirrors the server's `WorkUploadParseOutcome`. */
export type WorkParseOutcome =
  /** Read, and the model was confident enough to point at a line. */
  | "read"
  /** Read, but unsure: the transcript stands and the suspect line is withheld. */
  | "low_confidence"
  /** The model could not make out the page. */
  | "unreadable";

/** Safe operational categories. No provider message, credential, URL or model id travels here. */
export type WorkParseFailureReason =
  | "paused"
  | "auth"
  | "config"
  | "model_id"
  | "access"
  | "malformed_output"
  | "upload"
  | "service";

/**
 * A machine reading of one uploaded photo.
 *
 * Note what is ABSENT and must stay absent: no `mastery`, no `score`, no `correct`, no
 * `placement`. `suspectStepIndex` points at a line of the learner's own handwriting that the
 * reading stopped following; it is not a judgement on their answer and means nothing outside
 * this record.
 */
export interface WorkParse {
  readonly uploadId: string;
  readonly outcome: WorkParseOutcome;
  /** The lines as they were read, in order, for the learner to confirm or amend. */
  readonly steps: readonly string[];
  /** An index into {@link steps}. Absent whenever the reading is not confident. */
  readonly suspectStepIndex?: number;
  /**
   * A few sentences on what happened at {@link suspectStepIndex}, when the server could
   * ground them in the item's own canonical solution.
   *
   * Absent more often than present, and its absence is normal rather than a failure: it
   * needs a confident reading, a localized line, and an item whose solution we hold. Nothing
   * here is a verdict on the learner's answer, and the server refuses to send one that reads
   * like one. Render it beside the transcript, never instead of the hedge.
   */
  readonly explanation?: string;
  /** One to three things to try on paper. Absent whenever {@link explanation} is. */
  readonly nextSteps?: readonly string[];
  /** The reading's confidence in ITSELF, in [0,1]. Absent when the model gave none. */
  readonly confidence?: number;
  /** Always true, as a literal type. See the module docblock. */
  readonly provisional: true;
  /** The framing §3.5 asks for, authored server-side so it travels with the data. */
  readonly headline: string;
  /** Why this particular reading should be trusted less, when it should. */
  readonly caveat: string;
  readonly parserId: string;
  readonly modelId: string;
  readonly createdAt: string;
}

/**
 * The read seam. ONE method, and it is a read.
 *
 * Deliberately no `apply`, `accept`, `grade` or `submitCorrection`: the invariant above is a
 * property of this surface, in the same way `WorkUploadStore`'s `upload`/`remove`/`list` is.
 * A learner correcting a misread is a real and good feature — §3.5's *"correct us if we got
 * it wrong"* invites it — and it is deliberately NOT here, because a corrections channel is
 * the one shape that could plausibly grow a path into grading, and it should be designed with
 * that in view rather than arrive as a fourth method.
 */
export interface WorkParseClient {
  /**
   * Ask for a reading of one of the caller's own uploads. Resolves with the reading, or with
   * a {@link WorkParseUnavailable} describing why there is not one — never rejects for an
   * ordinary failure, because a feedback surface failing must cost a sentence and not a
   * broken lesson.
   */
  read(uploadId: string): Promise<WorkParse | WorkParseUnavailable>;
}

/** Why there is no reading, in a shape a surface can render without knowing about HTTP. */
export interface WorkParseUnavailable {
  readonly uploadId: string;
  readonly outcome: "unavailable";
  readonly provisional: true;
  readonly headline: string;
  readonly caveat: string;
  readonly reason: WorkParseFailureReason;
}

/** Narrow a result to a real reading. */
export function isWorkParse(result: WorkParse | WorkParseUnavailable): result is WorkParse {
  return "steps" in result;
}
