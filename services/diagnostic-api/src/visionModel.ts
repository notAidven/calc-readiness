/**
 * **THE PROVIDER SEAM.** One interface, and everything above it is provider-independent.
 *
 * `docs/Photo_Work_Upload_Scope.md` §3.5's AI-parse gate was lifted on 2026-08-05 (see that
 * section's banner for the ruling and its stated basis), and the ruling came with a
 * condition worth taking literally: *"if security becomes a concern later on we can touch on
 * that."* A decision that is expected to be revisited must not be spread through a codebase,
 * so this file exists to make the answer to "how hard is it to change providers" a fact
 * rather than a promise.
 *
 * The shape is the one `workUploadObjects.ts` already uses for S3: a port here, a thin
 * adapter per vendor beside it, and an injected client so the suite never opens a socket.
 *
 * ## Where the line is drawn, and why it is drawn there
 *
 * A `VisionModel` takes **an image and an instruction, and returns text and a token count**.
 * It knows nothing about students, uploads, mathematics, steps, JSON schemas, confidence, or
 * money. Everything downstream of the reply — the prompt, the schema the reply must satisfy,
 * what to do when it does not, the spend arithmetic — lives in `workUploadParse.ts` and is
 * shared by every provider, so a swap cannot quietly change what a learner is shown.
 *
 * Two adapters implement it today, which is what makes the swappability measurable rather
 * than asserted (`visionModel.test.ts` runs both through the same contract):
 *
 *  - **The default**, which is IAM-authenticated: there is no API key anywhere on the
 *    shipped path, and the image stays inside the AWS account the rest of this stack already
 *    runs in. `workUploadParseSeam.ts` names it; this file may not, and neither may any
 *    other — see `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts`, which licenses
 *    exactly two files to name a model vendor and holds the licence in both directions.
 *  - **A generic chat-completions HTTPS adapter** (`httpVisionModel.ts`) for a provider the
 *    default cannot reach, with its endpoint from configuration and its key read from
 *    Secrets Manager at cold start rather than from the environment. It names no vendor
 *    either, which is why it can be read here.
 *
 * Adding a third is one file and one entry in `WORK_UPLOAD_PARSERS`.
 */

/** What a model is asked to look at. Bytes, never a URL — see {@link VisionModelRequest}. */
export interface VisionImage {
  /**
   * The image itself, as bytes.
   *
   * Deliberately not a URL. A provider that fetches a URL needs a credential that reaches
   * the uploads bucket, and a credential that reaches that bucket is precisely what
   * `docs/Photo_Work_Upload_Scope.md` §6 exists to withhold — the model may see one photo
   * because we handed it over, not because it can go and get one.
   */
  readonly bytes: Uint8Array;
  /** `image/jpeg`, `image/png` or `image/webp` — the three the ingest path can verify. */
  readonly contentType: string;
}

export interface VisionModelRequest {
  /** Provider-independent instructions. Built once, in `workUploadParse.ts`. */
  readonly instructions: string;
  readonly image: VisionImage;
  /** A ceiling on the reply, so a runaway generation cannot become a runaway bill. */
  readonly maxOutputTokens: number;
  /**
   * The deadline, set by the caller and honoured by every adapter.
   *
   * It lives here rather than in each adapter's config because the deadline is a property of
   * the SURFACE, not of the vendor: `POST /api/work-upload/parse` is a synchronous request
   * behind API Gateway, whose integration timeout is 30 seconds unless somebody has asked
   * AWS to raise it. A model that has not answered by then produces a gateway error the
   * browser cannot interpret; aborting a little earlier produces this route's own graceful
   * "we couldn't read your work this time", which is the whole difference between failing
   * closed and failing visibly.
   */
  readonly signal?: AbortSignal;
}

/**
 * What the provider reported it used. Both fields feed the spend ledger, so an adapter that
 * cannot get them must say 0 rather than guess: a made-up token count would be a made-up
 * number in a budget check.
 */
export interface VisionModelUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface VisionModelReply {
  /** The model's text, exactly as returned. Nothing here interprets it. */
  readonly text: string;
  readonly usage: VisionModelUsage;
}

/**
 * A vision model, reduced to the one thing this feature needs from one.
 *
 * `invoke` may throw. It is called inside `workUploadParse.ts`'s degradation path, which
 * turns any failure into a learner-safe "we could not read this" rather than an error page —
 * a provider outage is not the learner's problem to see a stack trace about.
 */
export interface VisionModel {
  /** Stable provider id, recorded on every row for provenance (`parser_id`). */
  readonly id: string;
  /** The model identifier as the provider spells it, recorded as `model_id`. */
  readonly modelId: string;
  invoke(request: VisionModelRequest): Promise<VisionModelReply>;
}

/**
 * How much a provider charges, per million tokens, in USD.
 *
 * Configuration rather than a constant, and that is load-bearing: the cap in
 * `workUploadParse.ts` is a **dollar** ceiling computed from these numbers, so a price change
 * the code did not hear about would silently move the ceiling. Set them from the stack
 * (`WORK_UPLOAD_PARSE_INPUT_USD_PER_MTOK` / `..._OUTPUT_...`) next to the model id they price.
 */
export interface VisionModelPrices {
  readonly inputUsdPerMillionTokens: number;
  readonly outputUsdPerMillionTokens: number;
}

/**
 * What a call cost, in millionths of a USD, rounded UP.
 *
 * Up, because this number is compared against a budget: rounding a fraction of a
 * micro-dollar down is free once and unbounded across a month of calls, and the direction a
 * spend cap should err in is not the one that spends more. Integers throughout for the same
 * reason `cost_micro_usd` is an integer column — a budget check is not a place for
 * floating-point drift.
 */
export function costMicroUsd(usage: VisionModelUsage, prices: VisionModelPrices): number {
  const input = (usage.inputTokens * prices.inputUsdPerMillionTokens) / 1_000_000;
  const output = (usage.outputTokens * prices.outputUsdPerMillionTokens) / 1_000_000;
  return Math.ceil((input + output) * 1_000_000);
}

/**
 * The largest image an adapter will hand to a provider, in bytes.
 *
 * 3.5 MB, which is below the smallest per-image limit the two adapters have to live with
 * (the default provider's documented ceiling is 3.75 MB per image) with room for the base64
 * and JSON framing that sits around it. Enforced in `workUploadParse.ts` rather than in each
 * adapter, so
 * "this photo is too big to read" is one degradation path with one message instead of a
 * different vendor error per provider.
 *
 * It is DELIBERATELY smaller than the 10 MB an upload may be (`MAX_WORK_UPLOAD_BYTES`). A
 * photo between the two is stored, previewable and reviewable by a human exactly as v1
 * promised; it is only the model that cannot see it. Shrinking the photo to fit would mean
 * re-encoding a student's page server-side to make a 37.62%-accurate reading possible, which
 * is the wrong trade — the browser is where a smaller capture belongs.
 */
export const MAX_VISION_IMAGE_BYTES = 3_500_000;
