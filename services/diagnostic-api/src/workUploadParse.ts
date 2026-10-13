import type { DataApiExecutor, SqlParams } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import type { UUID } from "@cr/state-schema";

import type {
  CoachingWithheldReason,
  WorkUploadParse,
  WorkUploadParseFailureReason,
  WorkUploadParseOutcome,
} from "./workUploadParseSeam";
import { WORK_UPLOAD_STATEMENTS } from "./workUpload";
import type { WorkUploadObjectStore } from "./workUploadObjects";
import { groundingForItem, type ItemGrounding } from "./workUploadParseGrounding";
import {
  costMicroUsd,
  MAX_VISION_IMAGE_BYTES,
  type VisionModel,
  type VisionModelPrices,
} from "./visionModel";
import { describeWriteFailure } from "./writes";

/**
 * **THE v2 VISION PARSE — `POST /api/work-upload/parse`.**
 *
 * A learner photographs the working they did on paper (v1, `workUpload.ts`). This route
 * hands that photograph to a frontier vision model and answers with the steps it read back,
 * its guess at where the working stopped following itself, and — when it can be grounded —
 * a few sentences saying what happened there. It is the Lambda step
 * `docs/Photo_Work_Upload_Scope.md` §3.5 planned and could not build.
 *
 * ## The coaching layer, and the four conditions it needs
 *
 * `docs/Photo_Work_Upload_AI_Feedback_Eval.md` §1 splits the output into **Read** and
 * **Coach** and records that Coach shipped as *"headline + caveat only (server-authored
 * framing)"* — two sentences from a fixed map, saying nothing about this learner's page.
 * `explanation` and `nextSteps` are the generated half, and they arrive on the SAME model
 * call as the transcript, because a second call would double the bill to re-read a
 * photograph the model has already looked at.
 *
 * They are absent unless four things hold at once: the page was read, the model was
 * confident, it pointed at a line, and `workUploadParseGrounding.ts` holds the item's
 * canonical solution. Then the reply still has to survive `sanitizeCoaching`, which refuses
 * anything containing the keyed answer or a verdict. Absent is the ordinary case and it costs
 * a learner nothing: what they see is the transcript this route already produced.
 *
 * ## Read the §3.5 and §6 banners before changing anything here
 *
 * This route was FORBIDDEN by the document that specifies it until 2026-08-05, when Gabe
 * lifted the gate — *"just assume FERPA isnt a problem as of now; because its not tied to
 * any specific school system, we're comfortable just passing it into a frontier model and
 * having it evaluate it. so just wire up that endpoint - if security becomes a concern later
 * on we can touch on that."* The two banners record the ruling in full, its stated basis, and
 * what did NOT move. Three things did not move, and each is a constraint on this file:
 *
 *  1. **FEEDBACK-ONLY.** A reading is never an input to mastery, placement or the pre/post
 *     metric. That was never part of the privacy gate and the ruling did not touch it. It is
 *     structural here, not a promise: {@link WorkUploadParse} has no field a scorer could
 *     read, `0010` has no such column and no grant to write one, nothing in this lane imports
 *     the grading path, and `test/workUploadParseStaysFeedbackOnly.test.ts` measures all
 *     three from outside.
 *  2. **PROVISIONAL, and not out of politeness.** On the only published benchmark of real
 *     student handwriting, the best frontier model behind an API misreads something on
 *     **37.62% of multi-step pages** (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4). Better
 *     than three in eight readings has a mistake in it somewhere. Every response this route
 *     produces carries `provisional: true` — a literal type, so there is no value it could
 *     take instead — and a headline that says so in words.
 *  3. **§6's other controls.** The parse reads the object back AFTER the ingest strip, so
 *     what leaves our boundary carries no EXIF and no home coordinates; the row cascades away
 *     with the photo when a student deletes it; and the caller may only ever parse their own
 *     upload, established the same way the read and delete paths establish it — by looking
 *     the row up `sub`-scoped, so a stranger's upload id simply does not exist.
 *
 * ## Why this is its own route and not a step in `complete`
 *
 * Ingest calls no model, and `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts` still holds
 * that. Three separate things follow from the separation, and all three would be lost by
 * moving the call into the upload path:
 *
 *  - **Uploading is not consenting to a model read.** §6 requires the feature to be opt-in;
 *    a parse that happened automatically would make the opt-in one step too early.
 *  - **An upload nobody looks at costs nothing.** The most effective cost control available
 *    is not making the call.
 *  - **It stays a deliberate act.** Switching the parse on is a request somebody makes, not
 *    an `if` somebody deletes.
 *
 * ## The spend path, which is the part to review if you review one part
 *
 * A model call is the first unbounded cost path in this product, and the owner is actively
 * cutting cloud spend. Four things bound it, in the order they run:
 *
 *  1. **A stored reading is reused.** One provider call per photograph, ever. Re-opening the
 *     same upload costs a `select`.
 *  2. **A per-learner count** over a rolling window — one student cannot spend the budget.
 *  3. **A rolling-window USD ceiling** over the whole account, summed from `cost_micro_usd`
 *     in the ledger before the call is made. This is the one that is a *cap* rather than a
 *     rate limit: it is denominated in money, so it stays true when a price changes or when
 *     someone points a bigger model at it.
 *  4. **A hard output-token ceiling** per call, so one runaway generation cannot be
 *     expensive on its own.
 *
 * The ceiling is checked BEFORE a call against spend ALREADY recorded, so the last call of a
 * window may cross it by one parse. That is deliberate — the alternative is holding a lock
 * across a network call to a model — and one parse is about 1.4 cents. See
 * `docs/Deployment.md` for the arithmetic and the defaults.
 */

/** The parse's own statements. `work_upload` reads are reused from `workUpload.ts`. */
export const WORK_UPLOAD_PARSE_STATEMENTS = {
  /**
   * The most recent reading of one upload, if there is one — the caller's own, always.
   *
   * `student_id = :sid` is not redundant beside `upload_id`: `upload_id` came off the
   * request, and it is this condition that makes another learner's reading unreachable
   * rather than merely unlikely.
   */
  selectLatestParse: `select parse_id, upload_id, parser_id, model_id, outcome, confidence,
      steps, suspect_step_index, explanation, next_steps,
      extract(epoch from created_at) as created_at_epoch
    from public.work_upload_parse
    where upload_id = :upload_id::uuid and student_id = :sid::uuid
    order by created_at desc
    limit 1`,

  /** How many attempts this learner has made inside the window — the rate limit. */
  countRecentForStudent: `select count(*) as attempts
    from public.work_upload_parse
    where student_id = :sid::uuid and created_at >= to_timestamp(:since_epoch)`,

  /**
   * What the whole feature has spent inside the window — the budget cap.
   *
   * DELIBERATELY NOT `sub`-scoped, and it is the only statement in either work-upload group
   * that is not. The question is "what is the account's bill", which is not a question about
   * a learner; it reads one aggregate over a cost column and can return no `student_id`, no
   * `object_key` and no reading. Scoping it to the caller would produce a per-student budget
   * wearing a global budget's name, which is the same as having no global budget.
   */
  sumRecentSpend: `select coalesce(sum(cost_micro_usd), 0) as spent_micro_usd
    from public.work_upload_parse
    where created_at >= to_timestamp(:since_epoch)`,

  /** Append the attempt. Every attempt that reached this point is a row — see the header. */
  insertParse: `insert into public.work_upload_parse
      (parse_id, upload_id, student_id, parser_id, model_id, outcome, confidence, steps,
       suspect_step_index, explanation, next_steps, coaching_withheld_reason, input_tokens,
       output_tokens, cost_micro_usd)
    values (:parse_id::uuid, :upload_id::uuid, :sid::uuid, :parser_id, :model_id, :outcome,
            :confidence, :steps::jsonb, :suspect_step_index, :explanation,
            :next_steps::jsonb, :coaching_withheld_reason, :input_tokens, :output_tokens,
            :cost_micro_usd)`,
} as const;

/**
 * What the browser is handed. Feedback, framed as feedback.
 *
 * Deliberately absent, and to be kept absent: any field naming a verdict, a mark, a
 * mastery value, a placement estimate or a credit. There is no field a scorer could consume
 * even if somebody wired one up, which is the only version of the one-way invariant that
 * does not depend on everyone remembering it.
 */
export interface WorkUploadParseWire {
  readonly uploadId: string;
  readonly outcome: WorkUploadParseOutcome;
  /** The lines as they were read, in order, for a person to confirm or amend. */
  readonly steps: readonly string[];
  /** An index into {@link steps}: the line the reading stopped following. */
  readonly suspectStepIndex?: number;
  /**
   * Why the suspect line does not follow from the one above it, in words.
   *
   * The Coach layer `docs/Photo_Work_Upload_AI_Feedback_Eval.md` §1 plans, and it is
   * feedback in the strictest sense: it describes a step of the learner's own working
   * against the item's canonical path, and it says nothing about whether their answer is
   * right. Absent far more often than present — see {@link coachingFor} for the four
   * conditions it needs, all of which have to hold at once.
   */
  readonly explanation?: string;
  /** One to three things to try on paper. Absent whenever {@link explanation} is. */
  readonly nextSteps?: readonly string[];
  /** The reading's confidence in ITSELF, in [0,1]. Absent when the model gave none. */
  readonly confidence?: number;
  /**
   * ALWAYS true, as a literal type rather than a boolean — there is no value this can take
   * that would present a reading as settled. A surface that renders this record without the
   * hedge is doing so against the type.
   */
  readonly provisional: true;
  /** The sentence §3.5 asks for, so the framing travels with the data. */
  readonly headline: string;
  /** Why this particular reading should be trusted less, when it should. */
  readonly caveat: string;
  readonly parserId: string;
  readonly modelId: string;
  readonly createdAt: string;
  /** Safe category only; never a provider message or credential detail. */
  readonly failureReason?: WorkUploadParseFailureReason;
}

/** How the route is tuned. Every field has a default; the stack overrides from env. */
export interface WorkUploadParseLimits {
  /** The rolling window both limits are measured over. Default 24 hours. */
  readonly windowSeconds: number;
  /** How many attempts one learner may make inside the window. */
  readonly maxAttemptsPerStudent: number;
  /** The account-wide ceiling inside the window, in millionths of a USD. */
  readonly budgetMicroUsd: number;
  /** The per-call output ceiling handed to the provider. */
  readonly maxOutputTokens: number;
  /**
   * How long to give the provider before giving up, in milliseconds.
   *
   * 25 seconds, which is chosen against the EDGE and not against the model: API Gateway's
   * HTTP API integration timeout is 30 seconds unless somebody has asked AWS to raise it,
   * and the Lambda's own is 30. Aborting inside both means a slow model produces this
   * route's graceful "we couldn't read your work this time" instead of a gateway error the
   * browser cannot tell apart from an outage.
   */
  readonly modelTimeoutMs: number;
  /**
   * Below this, a reading is presented as a guess and its suspect-step index is DROPPED.
   *
   * Pointing at a line of a student's own handwriting and being wrong about it is the worst
   * thing this feature can do — worse than reading nothing, because it is confidently
   * misleading about work they know they did. So the localization is the first thing to go
   * when the model is unsure, and the transcription can stay: "here is roughly what we read"
   * is recoverable, "your mistake is on line 3" is not.
   */
  readonly lowConfidenceThreshold: number;
}

export const DEFAULT_WORK_UPLOAD_PARSE_LIMITS: WorkUploadParseLimits = {
  windowSeconds: 24 * 60 * 60,
  maxAttemptsPerStudent: 10,
  // $2.00 a day, i.e. about $60 a month at the ceiling — a little over the Aurora floor
  // (`docs/Deployment.md`), which is the right order of magnitude for a feedback surface
  // nobody has measured demand for yet. It is a stack parameter precisely so it can move
  // once there is a real number to move it to.
  budgetMicroUsd: 2_000_000,
  // 700 covered a transcript and an index. The coaching addendum asks for two or three
  // sentences and up to three actions in the same reply, which is another ~250 tokens of
  // prose, and a reply truncated mid-JSON is not a shorter reading — it is `malformed_output`
  // and a wasted call. The account-wide ceiling is unmoved and is denominated in dollars, so
  // it absorbs this: at the $2.66/MTok output price `infra/bin/infra.ts` configures, a full
  // 1000-token reply is $0.00266. The stack's own fallback is $15/MTok, which would make the
  // same reply 1.5 cents — quote the configured price, not the default, when costing this.
  maxOutputTokens: 1000,
  modelTimeoutMs: 25_000,
  lowConfidenceThreshold: 0.6,
};

export interface WorkUploadParseServiceDeps {
  db: DataApiExecutor;
  authenticate: DiagnosticAuthenticator;
  objects: WorkUploadObjectStore;
  /** The provider, behind the port. This module never names one. */
  model: VisionModel;
  /** What the configured model charges, so the cap is denominated in money. */
  prices: VisionModelPrices;
  limits?: Partial<WorkUploadParseLimits>;
  /** Injected in tests so an id is predictable; defaults to `crypto.randomUUID`. */
  newParseId?: () => string;
  /** Injected in tests so the rolling window is deterministic. */
  now?: () => Date;
}

export interface WorkUploadParseService {
  /** `POST /api/work-upload/parse` — read one of the caller's own uploads. */
  parse(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Ceilings on what a model may put on a learner's screen. See {@link sanitizeSteps}. */
const MAX_STEPS = 20;
const MAX_STEP_LENGTH = 240;

/**
 * The instruction, built once and shared by every provider so a swap cannot change what a
 * learner is shown (`visionModel.ts`).
 *
 * Three things it asks for and one it forbids:
 *
 *  - **Plain-text mathematics, not LaTeX.** The steps are rendered as text. Handing
 *    model-generated LaTeX to KaTeX means a malformed macro throws inside a learner's lesson,
 *    and the repo's typesetting conventions are for math WE authored.
 *  - **Say so when the page cannot be read**, rather than inventing a plausible page. At a
 *    37.62% page-level misread rate the failure to design for is not "no answer", it is a
 *    confident wrong one.
 *  - **A confidence in the READING**, so the surface can hedge harder when the model is
 *    unsure and drop the localization entirely below the threshold.
 *  - **No verdict on the answer.** Not because a model could smuggle one past the schema —
 *    it could not, there is no field for it — but because asking for one would change what
 *    the model looks at. This route localizes where working stopped following itself; it does
 *    not mark it.
 */
const PARSE_INSTRUCTIONS = [
  "You are reading a photograph of a student's handwritten mathematics working, done on",
  "paper. Transcribe the working line by line and identify the first line that does not",
  "follow from the line before it.",
  "",
  "Answer with a single JSON object and nothing else. No prose, no code fences.",
  "",
  '  {"readable": boolean, "steps": string[], "firstQuestionableStep": integer | null,',
  '   "confidence": number}',
  "",
  "  readable              false if you cannot make out the working well enough to",
  "                        transcribe it. Prefer this over guessing at a page you cannot",
  "                        read: an invented transcription is worse than none.",
  "  steps                 each written line, in order, as PLAIN TEXT mathematics",
  "                        (x^2, sqrt(5), (a+b)/c) — never LaTeX, never markdown.",
  "  firstQuestionableStep a 0-based index into steps: the first line that does not follow",
  "                        from the one before it. null if every line follows, or if you",
  "                        are not confident which one broke.",
  "  confidence            0 to 1: how sure you are that you READ THE PAGE correctly.",
  "                        This is about your transcription, not about the mathematics.",
  "",
  "Do not judge whether the final answer is right, do not mark the work, do not award or",
  "deduct anything, and do not add encouragement. Transcribe, and point at the line where",
  "the working stops following itself.",
].join("\n");

/**
 * THE COACHING ADDENDUM, appended only when we hold the item's canonical solution.
 *
 * Two things are worth stating about the shape rather than leaving them to be inferred:
 *
 *  - **The canonical steps go in. The answer is not LABELLED, and it is not withheld
 *    either.** There is no `Answer: x` line here, because naming one is an invitation to
 *    repeat it. But the reference path solves the problem, so its last line generally is the
 *    answer, and a model that can read a page of algebra could solve it without any of this.
 *    Prompt hygiene is therefore not what keeps the answer off the screen: `sanitizeCoaching`
 *    is, on the reply, by exact containment. Saying that plainly is the point — a comment
 *    claiming the model cannot see the answer would make the reply check look optional.
 *  - **The reference path is a reference, not the expected answer to the transcription.** A
 *    model handed a correct solution and asked to read a photograph will drift toward reading
 *    the solution back, which would make the transcript agree with the canonical path exactly
 *    when the learner's page does not — the one case the whole feature exists for. Hence the
 *    last line, and hence the ordering: transcribe first, compare second.
 */
function coachingAddendum(grounding: ItemGrounding): string {
  return [
    "",
    "This page is working on the problem below. Use it as REFERENCE ONLY.",
    "",
    `  Problem: ${grounding.prompt}`,
    "  One correct path through it:",
    ...grounding.workedSolution.map((step, index) => `    ${index + 1}. ${step}`),
    ...(grounding.hints.length === 0
      ? []
      : [
          "  Hints this student can already see:",
          ...grounding.hints.map((h) => `    - ${h}`),
        ]),
    "",
    "Also answer these two keys in the same JSON object:",
    "",
    '  {"explanation": string | null, "nextSteps": string[]}',
    "",
    "  explanation  two or three sentences, addressed to the student as 'you', saying what",
    "               happened at the line you flagged: name the specific slip you can see on",
    "               the page (a dropped sign, an untouched second side, a mis-multiplied",
    "               term). Refer to what they wrote, not to the reference path. null if you",
    "               cannot see a specific slip.",
    "  nextSteps    one or two short things to DO on paper from the flagged line onwards.",
    "               Each one an action, not a result.",
    "",
    "Never state the final answer, or any value equal to it, in either key. Do not say",
    "whether the student's answer is right or wrong, do not use the words correct, incorrect,",
    "score, grade or credit, and do not congratulate or reassure. Describe the step, and say",
    "what to try next.",
    "",
    "The transcription is the primary task and the reference path must not change it. If the",
    "page disagrees with the path above, transcribe the PAGE.",
  ].join("\n");
}

/** What the coaching layer may hand back once it has been checked. */
interface Coaching {
  readonly explanation: string;
  readonly nextSteps: readonly string[];
}

/** The coaching, or the reason there is none. Exactly one side is ever set. */
export type CoachingOutcome =
  | { readonly coaching: Coaching; readonly withheld?: undefined }
  | { readonly coaching?: undefined; readonly withheld: CoachingWithheldReason };

/** Ceilings on the coaching, matching `0011`'s check constraints. */
const MAX_EXPLANATION_LENGTH = 600;
const MAX_NEXT_STEPS = 3;

/**
 * The scoring vocabulary, matched as SUBSTRINGS, stems included.
 *
 * Not a stylistic preference and not negotiable down to whole words:
 * `workUploadParse.test.ts` scans the whole serialized response for exactly these stems, so a
 * model writing *"you scored two of the three lines"* would fail the suite on `score` inside
 * `scored`. The two rules have to agree, and the direction they agree in is this one —
 * encoding the stems here means the response cannot carry them by construction rather than by
 * the model's good manners.
 */
const SCORING_STEMS: readonly string[] = [
  "mastery",
  "score",
  "placement",
  "theta",
  "credit",
  "points",
  "client_correct",
];

/**
 * Verdict phrasings, matched as WHOLE WORDS, which is the difference that matters.
 *
 * These are the sentences the Feedback rubric scores 0 for — a judgement on the answer rather
 * than an account of a line. They were once in the list above and matched the same way, and
 * that cost the feature its whole output: `correct` matched inside `correctly`, so a model
 * opening *"You subtracted the numerators correctly, but you wrote 0 in the denominator"* had
 * both halves of its coaching thrown away over one adverb. Naming the step a learner got
 * right is how you point at the one they did not, so refusing it refuses the good case and
 * leaves the transcript looking like the whole feature.
 *
 * Whole-word matching keeps every verdict the suite pins — *"that line is incorrect"*,
 * *"your final answer is correct"* — and stops the rule reaching into unrelated words. It is
 * safe to narrow HERE and not above because nothing scans a response for these: they are
 * refused because of what they say, not because a scorer could parse them.
 */
const VERDICT_PHRASINGS: readonly string[] = [
  "correct",
  "incorrect",
  "wrong answer",
  "right answer",
  "the answer is",
  "you should have got",
];

/** `\b` around each phrasing, escaped, built once rather than per reply. */
const VERDICT_PATTERNS: readonly RegExp[] = VERDICT_PHRASINGS.map(
  (phrase) => new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
);

/** Does this text grade the page, rather than describe a line of it? */
function readsAsAVerdict(text: string): boolean {
  const lowered = text.toLowerCase();
  return (
    SCORING_STEMS.some((stem) => lowered.includes(stem)) ||
    VERDICT_PATTERNS.some((pattern) => pattern.test(text))
  );
}

/**
 * Normalize a string for the leakage comparison: case, spacing, and the two spellings of a
 * minus sign that KaTeX and a keyboard disagree about.
 */
function forComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[\s$\\{}]/g, "");
}

/**
 * Does this coaching state the answer it is supposed to be coaching towards?
 *
 * ## This is NOT the check the eval spec asks for, and the difference is a real gap
 *
 * `docs/Photo_Work_Upload_AI_Feedback_Eval.md` §3.3 specifies the leakage check as: *"Compare
 * coach text against `answer_key` and each `hints[]` entry using the product checker […] If
 * the coach text grades as equivalent to the answer, automatic 0"*. That is a check for
 * mathematical EQUIVALENCE, and it is a better check than this one. It is not the one here,
 * because running the product checker means importing `@cr/components` into the parse lane,
 * which is the grading path `test/workUploadParseStaysFeedbackOnly.test.ts` bans and which
 * `workUploadParseGrounding.ts` argues should stay banned.
 *
 * So this is normalized containment, and what it misses is exactly what you would expect: a
 * key of `5` is caught in *"you get 5"* and missed in *"you get 10/2"* or *"you get 5.0"*.
 * Naming the gap rather than implying the spec was satisfied — closing it needs either an
 * equivalence routine that is not the product checker, or a licence to reach one, and neither
 * is in this change.
 *
 * ## Deliberately over-eager in the other direction, and the asymmetry is the point
 *
 * A false positive costs a learner one paragraph of help on a problem whose solution they can
 * already reveal; a false negative hands them the answer to the problem they are mid-way
 * through. So a bare `4` in the prose is enough to refuse the whole thing on an item keyed
 * `4`, even though the four may well have been theirs. This is the same trade
 * `lowConfidenceThreshold` makes a few fields up, in the same direction, for the same reason.
 */
export function leaksAnswerKey(text: string, answerKey: string | undefined): boolean {
  if (answerKey === undefined) {
    return false;
  }
  const key = forComparison(answerKey);
  return key.length > 0 && forComparison(text).includes(key);
}

/**
 * A model's coaching → coaching it is safe to show, or nothing at all.
 *
 * There is no partial acceptance here: a reply that trips any check loses BOTH keys. Keeping
 * the next steps after refusing the explanation would leave a learner with instructions and
 * no account of why, which reads as a demand rather than as help.
 */
export function sanitizeCoaching(
  body: Record<string, unknown>,
  grounding: ItemGrounding | undefined,
): Coaching | undefined {
  return coachingOutcome(body, grounding).coaching;
}

/**
 * The same decision, carrying WHY when the answer is no.
 *
 * `sanitizeCoaching` above is this function with the reason dropped, rather than a second
 * copy of the rules — a duplicated screen is one edit away from two different answers about
 * what a learner may see.
 *
 * The reason exists because the refusal is otherwise invisible. Both halves go together and
 * nothing is shown in their place, so a learner and a reviewer both see a plain transcript,
 * which is also exactly what a page with no slip on it looks like. That indistinguishability
 * is what let a one-adverb bug (see {@link VERDICT_PHRASINGS}) read as "the coach was never
 * built" — it is recorded on the row from here on, and it is never sent to the browser.
 */
export function coachingOutcome(
  body: Record<string, unknown>,
  grounding: ItemGrounding | undefined,
): CoachingOutcome {
  if (grounding === undefined) {
    return { withheld: "no_grounding" };
  }
  const explanation = typeof body.explanation === "string" ? bounded(body.explanation) : "";
  const nextSteps = sanitizeSteps(body.nextSteps).slice(0, MAX_NEXT_STEPS);
  if (explanation === "" || nextSteps.length === 0) {
    return { withheld: "none_offered" };
  }
  const together = `${explanation} ${nextSteps.join(" ")}`;
  if (readsAsAVerdict(together)) {
    return { withheld: "verdict_language" };
  }
  if (leaksAnswerKey(together, grounding.answerKey)) {
    return { withheld: "answer_key_stated" };
  }
  return { coaching: { explanation, nextSteps } };
}

/**
 * The headline §3.5 asks for, per outcome. Never absent: the framing travels with the data
 * rather than living in a component that could forget to render it.
 *
 * §3.5 writes the first one with an em-dash — *"here's what we read — correct us if we got
 * it wrong"* — and this is a full stop instead. Not a softening: `test/cityCopyRegister.test.ts`
 * forbids em-dashes in learner-visible strings across this product, and it caught this one.
 * The words are the doc's.
 */
const HEADLINES: Readonly<Record<WorkUploadParseOutcome, string>> = {
  read: "Here's what we read. Correct us if we got it wrong.",
  low_confidence: "Here's our best guess at what you wrote, and we're not confident.",
  unreadable: "We couldn't make out the working in this photo.",
  unavailable: "We couldn't read your work this time.",
};

const CAVEATS: Readonly<Record<WorkUploadParseOutcome, string>> = {
  read:
    "This is a machine reading of your handwriting and it is often wrong. It doesn't " +
    "change your progress either way.",
  low_confidence:
    "We had trouble with this page, so we've left out which line we think went wrong. " +
    "Read it as a rough transcript, nothing more.",
  unreadable:
    "A clearer photo usually helps: a flatter page, more light, the working filling the " +
    "frame. Your upload is saved either way.",
  unavailable:
    "Your photo is saved, and nothing went wrong on your end. Try again in a little while.",
};

/** One `work_upload_parse` row as the Data API hands it back. */
interface ParseRow {
  parse_id: string;
  upload_id: string;
  parser_id: string;
  model_id: string;
  outcome: string;
  confidence: number | string | null;
  steps: unknown;
  suspect_step_index: number | string | null;
  explanation: string | null;
  next_steps: unknown;
  created_at_epoch: number | string | null;
}

/** One `work_upload` row, narrowed to what the parse needs off it. */
interface UploadRow {
  upload_id: string;
  object_key: string;
  content_type: string;
  /** The item the photo is of, which is how the coaching finds its canonical solution. */
  item_version_id: string;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function epochToIso(value: unknown): string {
  const epoch = toNumber(value);
  return new Date(
    Number.isFinite(epoch) ? Math.round(epoch * 1000) : Date.now(),
  ).toISOString();
}

/**
 * Model text → the object it was asked for, or null.
 *
 * Tolerant of exactly one deviation — a fenced code block — because that is the one every
 * model produces occasionally however the instruction is worded, and refusing it would turn
 * a perfectly good reading into a "we could not read this". Everything else is a null: a
 * reply we cannot parse is a reply we do not show.
 */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const withoutFences = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(withoutFences.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Model strings → strings it is safe to put in front of a learner.
 *
 * A model's reply is untrusted text that came from reading an untrusted photograph, and it
 * is about to be rendered. Control characters go (they can reorder a rendered line),
 * whitespace collapses, blanks are dropped, and both the count and the length are capped —
 * a page of working is a handful of short lines, so a reply with 400 of them is a failure
 * mode and not a long page.
 */
function sanitizeSteps(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const steps: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const cleaned = entry
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u202a-\u202e]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_STEP_LENGTH);
    if (cleaned !== "") {
      steps.push(cleaned);
    }
    if (steps.length === MAX_STEPS) {
      break;
    }
  }
  return steps;
}

/**
 * One untrusted string → one bounded line of prose.
 *
 * `sanitizeSteps` does this for transcript lines and caps them at a line of mathematics;
 * coaching is sentences, so it gets its own cap and the same character hygiene. Both strip
 * the control and bidi characters that can reorder a rendered line.
 */
function bounded(value: string): string {
  return (
    value
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u202a-\u202e]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_EXPLANATION_LENGTH)
  );
}

/** A number in [0,1], or undefined. A model may answer `"0.8"`, or 80, or nothing. */
function readConfidence(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  // A model that answered on a 0-100 scale meant 0.8, not "off the top of the scale".
  const normalized = numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
  return Math.min(1, Math.max(0, normalized));
}

/**
 * A model reply → a reading, or the reason there isn't one.
 *
 * Pure, and exported so the degradation cases can be driven directly rather than through a
 * fake provider: every branch here is a way a learner could be shown nonsense, and each one
 * is a test in `workUploadParse.test.ts`.
 */
export function readModelReply(
  text: string,
  parserId: string,
  modelId: string,
  lowConfidenceThreshold: number,
  grounding?: ItemGrounding,
): WorkUploadParse {
  const base = { parserId, modelId };
  const body = extractJsonObject(text);
  if (body === null) {
    return {
      ...base,
      outcome: "unavailable",
      steps: [],
      failureReason: "malformed_output",
    };
  }
  const steps = sanitizeSteps(body.steps);
  const confidence = readConfidence(body.confidence);
  if (body.readable === false) {
    // The model saying it could not read the page, which is the answer we asked it to prefer
    // over inventing one. Its confidence is not carried through: a confident "I cannot read
    // this" and an unsure one are the same outcome, and reporting a number beside it invites
    // a surface to draw a bar.
    return { ...base, outcome: "unreadable", steps: [] };
  }
  if (body.readable !== true || steps.length === 0) {
    return {
      ...base,
      outcome: "unavailable",
      steps: [],
      failureReason: "malformed_output",
    };
  }

  // NOT `Number(rawIndex)`. `null` is the value the instruction asks for when no line is
  // questionable, and `Number(null)` is 0 — so a coercion here would turn "every line
  // follows" into "your mistake is on the first line", which is the exact class of confident
  // nonsense this route exists not to show. A digit string is accepted because a model
  // answering `"2"` meant 2; nothing else is.
  const rawIndex = body.firstQuestionableStep;
  const index =
    typeof rawIndex === "number"
      ? rawIndex
      : typeof rawIndex === "string" && /^\d+$/.test(rawIndex.trim())
        ? Number(rawIndex)
        : Number.NaN;
  const suspectStepIndex =
    Number.isInteger(index) && index >= 0 && index < steps.length ? index : undefined;

  // THE LOW-CONFIDENCE DEGRADATION. Below the threshold the transcript survives and the
  // localization does not — see `lowConfidenceThreshold` for why that is the asymmetry to
  // pick. An unstated confidence counts as low: a model that did not answer the question is
  // not evidence that it was sure. The coaching goes with the localization, and for a
  // stronger version of the same reason: an explanation of a line we are not sure we read
  // is a paragraph of confident prose about handwriting that may not be there.
  if (confidence === undefined || confidence < lowConfidenceThreshold) {
    return {
      ...base,
      outcome: "low_confidence",
      steps,
      ...(confidence === undefined ? {} : { confidence }),
    };
  }
  // FOUR CONDITIONS, ALL OF THEM. The page was read, the model was confident, it pointed at
  // a line, and we hold the canonical solution for the item. Coaching that survives a
  // missing one of these is coaching about a line nobody identified or a problem nobody
  // knows — see `coachingOutcome` for what it then has to survive on its content.
  const outcome: CoachingOutcome =
    suspectStepIndex === undefined
      ? { withheld: "no_suspect_line" }
      : coachingOutcome(body, grounding);
  return {
    ...base,
    outcome: "read",
    steps,
    confidence,
    ...(suspectStepIndex === undefined ? {} : { suspectStepIndex }),
    ...(outcome.coaching === undefined
      ? { coachingWithheld: outcome.withheld }
      : {
          explanation: outcome.coaching.explanation,
          nextSteps: outcome.coaching.nextSteps,
        }),
  };
}

/**
 * A jsonb column as the Data API hands it back, which is a string on some paths and an array
 * on others. Malformed JSON reads as nothing rather than throwing: a re-open of a stored
 * reading must not 500 over a column it could survive without.
 */
function jsonArray(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

/** A stored row → the wire shape, so a re-open answers exactly what the first read did. */
function rowToWire(row: ParseRow): WorkUploadParseWire {
  const outcome = row.outcome as WorkUploadParseOutcome;
  const steps = sanitizeSteps(jsonArray(row.steps));
  const confidence = row.confidence === null ? undefined : toNumber(row.confidence);
  const suspect =
    row.suspect_step_index === null ? undefined : toNumber(row.suspect_step_index);
  const localized =
    suspect !== undefined && Number.isInteger(suspect) && suspect < steps.length;
  // Coaching travels with the line it is about. A row whose suspect index no longer points
  // at a step (a shorter transcript after re-sanitization) has nothing for the explanation
  // to refer to, and an explanation with no marked line reads as a verdict on the page.
  const explanation = localized && row.explanation ? bounded(row.explanation) : "";
  const nextSteps = explanation === "" ? [] : sanitizeSteps(jsonArray(row.next_steps));
  return {
    uploadId: row.upload_id,
    outcome,
    steps,
    ...(localized ? { suspectStepIndex: suspect } : {}),
    ...(explanation !== "" && nextSteps.length > 0 ? { explanation, nextSteps } : {}),
    ...(confidence !== undefined && Number.isFinite(confidence) ? { confidence } : {}),
    provisional: true,
    headline: HEADLINES[outcome] ?? HEADLINES.unavailable,
    caveat: CAVEATS[outcome] ?? CAVEATS.unavailable,
    parserId: row.parser_id,
    modelId: row.model_id,
    createdAt: epochToIso(row.created_at_epoch),
  };
}

/** A fresh reading → the wire shape. The one place a headline is attached to a new parse. */
function parseToWire(
  uploadId: string,
  parse: WorkUploadParse,
  createdAt: Date,
): WorkUploadParseWire {
  return {
    uploadId,
    outcome: parse.outcome,
    steps: parse.steps,
    ...(parse.suspectStepIndex === undefined
      ? {}
      : { suspectStepIndex: parse.suspectStepIndex }),
    ...(parse.explanation === undefined || parse.nextSteps === undefined
      ? {}
      : { explanation: parse.explanation, nextSteps: parse.nextSteps }),
    ...(parse.confidence === undefined ? {} : { confidence: parse.confidence }),
    provisional: true,
    headline: HEADLINES[parse.outcome],
    caveat: CAVEATS[parse.outcome],
    parserId: parse.parserId,
    modelId: parse.modelId,
    createdAt: createdAt.toISOString(),
    ...(parse.failureReason === undefined ? {} : { failureReason: parse.failureReason }),
  };
}

function errorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error) {
    return String((error as { name: unknown }).name);
  }
  return "Error";
}

/** Provider exceptions -> safe learner/ops categories. The exception message never leaves. */
export function classifyVisionFailure(error: unknown): WorkUploadParseFailureReason {
  const name = errorName(error);
  if (
    [
      "CredentialsProviderError",
      "ExpiredTokenException",
      "InvalidClientTokenId",
      "InvalidSignatureException",
      "UnrecognizedClientException",
    ].includes(name)
  ) {
    return "auth";
  }
  if (name === "AccessDeniedException") {
    return "access";
  }
  if (["ResourceNotFoundException", "ModelNotReadyException"].includes(name)) {
    return "model_id";
  }
  if (name === "ValidationException") {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
    if (
      /model.?id|inference profile|on-demand throughput|temperature|not supported/i.test(
        message,
      )
    ) {
      return "model_id";
    }
  }
  return "service";
}

export function createWorkUploadParseService(
  deps: WorkUploadParseServiceDeps,
): WorkUploadParseService {
  const { db, authenticate, objects, model, prices } = deps;
  const limits: WorkUploadParseLimits = {
    ...DEFAULT_WORK_UPLOAD_PARSE_LIMITS,
    ...deps.limits,
  };
  const newParseId = deps.newParseId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());

  /** Verify the bearer token → 401, else run the body scoped to the verified sub. */
  async function scoped(
    token: string | null,
    run: (studentId: UUID, sid: SqlParams) => Promise<DiagnosticServerResponse>,
  ): Promise<DiagnosticServerResponse> {
    const identity = await authenticate(token);
    if (!identity || !isUuid(identity.student_id)) {
      return { status: 401, body: { error: "unauthorized" } };
    }
    try {
      return await run(identity.student_id, { sid: identity.student_id });
    } catch (error) {
      // Shared with the city and upload paths, so an unapplied `0010` answers with the
      // command that applies it rather than looking like a broken service.
      return { status: 500, body: { error: describeWriteFailure(error) } };
    }
  }

  return {
    parse: (token, body) =>
      scoped(token, async (_studentId, sid) => {
        const request = (typeof body === "object" && body !== null ? body : {}) as Record<
          string,
          unknown
        >;
        if (!isUuid(request.uploadId)) {
          return {
            status: 400,
            body: { error: "uploadId must be the id of one of your uploads" },
          };
        }
        const uploadId = request.uploadId;

        // OWNERSHIP, established exactly as the read and delete paths establish it: a
        // `sub`-scoped select. Another learner's upload does not 403, it does not exist, so
        // no answer of ours distinguishes a stranger's id from an invented one.
        const uploads = await db.query<UploadRow>(WORK_UPLOAD_STATEMENTS.selectOwnUpload, {
          ...sid,
          upload_id: uploadId,
        });
        const upload = uploads[0];
        if (!upload) {
          return { status: 404, body: { error: "no upload of yours has that id" } };
        }

        // 1. A READING WE ALREADY PAID FOR. `unreadable` and `unavailable` are not reused —
        //    the first may have been a bad photo the learner has since re-taken, the second
        //    was our outage — so only a reading with something in it short-circuits.
        const existing = await db.query<ParseRow>(
          WORK_UPLOAD_PARSE_STATEMENTS.selectLatestParse,
          { ...sid, upload_id: uploadId },
        );
        const previous = existing[0];
        if (
          previous &&
          (previous.outcome === "read" || previous.outcome === "low_confidence")
        ) {
          return { status: 200, body: { parse: rowToWire(previous), cached: true } };
        }

        const at = now();
        const sinceEpoch = Math.floor(at.getTime() / 1000) - limits.windowSeconds;

        // 2. THE PER-LEARNER RATE LIMIT.
        const attempts = await db.query<{ attempts: number | string }>(
          WORK_UPLOAD_PARSE_STATEMENTS.countRecentForStudent,
          { ...sid, since_epoch: sinceEpoch },
        );
        if (toNumber(attempts[0]?.attempts ?? 0) >= limits.maxAttemptsPerStudent) {
          return {
            status: 429,
            body: {
              error:
                `you've had ${limits.maxAttemptsPerStudent} photos read today, which is ` +
                "the limit. Your uploads are all still saved.",
            },
          };
        }

        // 3. THE ACCOUNT-WIDE SPEND CEILING. Checked before the call, against spend already
        //    recorded — see the header for why the last call of a window may cross it.
        const spend = await db.query<{ spent_micro_usd: number | string }>(
          WORK_UPLOAD_PARSE_STATEMENTS.sumRecentSpend,
          { since_epoch: sinceEpoch },
        );
        if (toNumber(spend[0]?.spent_micro_usd ?? 0) >= limits.budgetMicroUsd) {
          return {
            status: 429,
            body: {
              error:
                "reading photos of work is paused for today. Your upload is saved and a " +
                "person can still look at it.",
            },
          };
        }

        const bytes = await objects.getObject(upload.object_key);
        if (bytes === null) {
          return {
            status: 404,
            body: { error: "that photo is no longer stored, so there is nothing to read" },
          };
        }

        // The attempt is a row from here on, whatever happens — including the two failures
        // below, which cost nothing but must still consume a slot so a client that cannot
        // succeed cannot retry forever.
        let parse: WorkUploadParse;
        let inputTokens = 0;
        let outputTokens = 0;
        let cost = 0;
        if (bytes.length > MAX_VISION_IMAGE_BYTES) {
          // Refused before the provider sees it. The photo is fine, stored and reviewable;
          // it is only too large for the model's per-image limit (`visionModel.ts` explains
          // why we do not re-encode a student's page to make it fit).
          parse = {
            outcome: "unavailable",
            steps: [],
            parserId: model.id,
            modelId: model.modelId,
            failureReason: "upload",
          };
        } else {
          // THE ITEM THIS PAGE IS WORKING ON, if we hold it. `item_version_id` came off the
          // row rather than off the request, so a caller cannot point the coaching at a
          // different problem than the one they photographed. A miss is ordinary — a CFU
          // upload, a post-diagnostic one, a hand-authored item — and costs the transcript
          // nothing.
          const grounding = groundingForItem(upload.item_version_id);
          const deadline = new AbortController();
          const timer = setTimeout(() => deadline.abort(), limits.modelTimeoutMs);
          try {
            const reply = await model.invoke({
              instructions:
                grounding === undefined
                  ? PARSE_INSTRUCTIONS
                  : PARSE_INSTRUCTIONS + coachingAddendum(grounding),
              image: { bytes, contentType: upload.content_type },
              maxOutputTokens: limits.maxOutputTokens,
              signal: deadline.signal,
            });
            inputTokens = Math.max(0, Math.round(reply.usage.inputTokens));
            outputTokens = Math.max(0, Math.round(reply.usage.outputTokens));
            cost = costMicroUsd({ inputTokens, outputTokens }, prices);
            parse = readModelReply(
              reply.text,
              model.id,
              model.modelId,
              limits.lowConfidenceThreshold,
              grounding,
            );
          } catch (error) {
            // THE DEGRADATION PATH. Anything at all: a throttle, a timeout, a refusal, a
            // malformed reply, a provider that has gone away. A learner sees a sentence
            // saying we could not read it this time, never a stack trace and never a 500 —
            // this is a feedback surface, and its failing closed must cost nothing.
            //
            // The row is still written, with zero cost. We do not know whether the provider
            // billed for a call that errored, so the honest ledger entry is the attempt.
            const failureReason = classifyVisionFailure(error);
            // Operationally useful and deliberately content-free: no exception message,
            // upload id, student id, object key, image bytes, token, or credential.
            console.error("work-upload parse provider failure", {
              failureReason,
              exception: errorName(error),
            });
            parse = {
              outcome: "unavailable",
              steps: [],
              parserId: model.id,
              modelId: model.modelId,
              failureReason,
            };
          } finally {
            clearTimeout(timer);
          }
        }

        await db.execute(WORK_UPLOAD_PARSE_STATEMENTS.insertParse, {
          ...sid,
          parse_id: newParseId(),
          upload_id: uploadId,
          parser_id: parse.parserId,
          model_id: parse.modelId,
          // `unavailable` is our word for the wire and has no row: the ledger's four
          // outcomes are the DB's (`0010`), and a call that never produced a reading is a
          // `failed` attempt there.
          outcome: parse.outcome === "unavailable" ? "failed" : parse.outcome,
          confidence: parse.confidence ?? null,
          steps: JSON.stringify(parse.steps),
          suspect_step_index: parse.suspectStepIndex ?? null,
          explanation: parse.explanation ?? null,
          next_steps: JSON.stringify(parse.nextSteps ?? []),
          coaching_withheld_reason: parse.coachingWithheld ?? null,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_micro_usd: cost,
        });

        return {
          status: 200,
          body: { parse: parseToWire(uploadId, parse, at), cached: false },
        };
      }),
  };
}
