import { createBedrockVisionModel } from "./bedrockVisionModel";
import { createHttpVisionModel } from "./httpVisionModel";
import type { SecretResolver } from "./secrets";
import type { VisionModel } from "./visionModel";

/**
 * **THE v2 AI-PARSE SEAM — DEFINED, AND NOW WIRED. THE GATE WAS LIFTED ON 2026-08-05.**
 *
 * This file used to hold an empty registry and a paragraph explaining why it had to stay
 * empty. `docs/Photo_Work_Upload_Scope.md` §3.5 forbade sending a student's photograph to a
 * third-party model absent an education-compliant provider under a signed DPA, or
 * self-hosted OCR. On 2026-08-05 Gabe lifted that gate:
 *
 * > *"just assume FERPA isnt a problem as of now; because its not tied to any specific
 * > school system, we're comfortable just passing it into a frontier model and having it
 * > evaluate it. so just wire up that endpoint - if security becomes a concern later on we
 * > can touch on that."*
 *
 * The §3.5 and §6 banners carry the ruling, its stated basis — the product is not sold into
 * a school system, so FERPA's school-official framing does not bind it — and the fact that
 * he expects to revisit it. **No DPA is signed and no no-retention term has been negotiated;
 * that is a known, accepted position and not an oversight.**
 *
 * ## What did NOT change, and is not this file's to change
 *
 * The two properties the original seam was built around both survive, and neither was ever
 * part of the privacy gate:
 *
 *  1. **WHERE it attaches.** After the ingest hygiene sweep, never before it. A parse must
 *     only ever see STRIPPED bytes: a parse on ingest bytes would be reading a file that
 *     still carries a child's home coordinates, and the ruling was about a destination, not
 *     about the photograph being less sensitive than §6 says. `workUploadParse.ts` reads the
 *     STORED object, which is the post-sweep one by construction.
 *  2. **WHAT it may return.** {@link WorkUploadParse} carries no mark, no verdict, no mastery
 *     delta and no placement estimate. A parse *will* misread — 37.62% of real multi-step
 *     student pages, on the best frontier model measured
 *     (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4) — so its output is FEEDBACK-ONLY and
 *     provisional. The type is where that stops being a promise.
 *
 * ## This is the one file that chooses a provider, and that is on purpose
 *
 * The ruling came with *"if security becomes a concern later on we can touch on that"*, so
 * the provider has to be cheap to change. Everything about a vendor is confined to its own
 * adapter behind the `VisionModel` port (`visionModel.ts`), and this registry is the only
 * place the adapters are named. `workUploadParse.ts` — the route, the prompt, the reply
 * contract, the spend cap — names none of them and takes a `VisionModel`.
 *
 * `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts` holds that from outside: a model
 * vendor may be named in this file and in `bedrockVisionModel.ts`, by name, with a reason,
 * and nowhere else in the web app or this service. Adding a provider means one adapter file
 * and one entry here.
 */

/** How a reading turned out, on the wire. `0010` stores the first three plus `failed`. */
export type WorkUploadParseOutcome =
  /** Read, with a confidence at or above the threshold. */
  | "read"
  /** Read, but unsure: the transcript stands and the localization is dropped. */
  | "low_confidence"
  /** The model could not make out the page, or answered something we could not use. */
  | "unreadable"
  /** Our side did not manage a call at all. Stored as `failed`. */
  | "unavailable";

/** Safe failure categories for learner copy and deployment diagnosis. */
export type WorkUploadParseFailureReason =
  | "auth"
  | "model_id"
  | "access"
  | "malformed_output"
  | "upload"
  | "service";

/**
 * What a parse may hand back. Feedback only, and provisional by construction.
 *
 * Deliberately absent, and to be kept absent: any field naming a mark, a verdict, a mastery
 * value, a placement estimate, a credit or a point. An upload is never an input to mastery,
 * placement, or the pre/post metric, and neither is anything read out of one.
 */
/**
 * Why a reading showed no coaching.
 *
 * Diagnostic only, and deliberately coarse: enough to tell "the model offered nothing" from
 * "we refused what it offered", which are two very different problems that look identical on
 * a learner's screen — both of them a plain transcript, which is also what a page with no
 * slip on it looks like. That indistinguishability is not hypothetical: it is what let a
 * one-adverb screening bug read for a day as "the coaching layer was never built".
 *
 * Recorded on the row and never sent to the browser. `WorkUploadParseWire`'s key set is
 * pinned by `workUploadParse.test.ts`, so putting it on the wire fails there.
 */
export type CoachingWithheldReason =
  /** We hold no canonical solution for the item, so the model was never asked for coaching. */
  | "no_grounding"
  /** The model pointed at no line, so there is nothing for an explanation to be about. */
  | "no_suspect_line"
  /** Asked, and returned no explanation or no next steps. Half a pair counts as none. */
  | "none_offered"
  /** Offered coaching that grades the page rather than describing a line of it. */
  | "verdict_language"
  /** Offered coaching containing the item's own keyed answer. */
  | "answer_key_stated";

export interface WorkUploadParse {
  readonly outcome: WorkUploadParseOutcome;
  /** The lines as they were read, in order, for a person to confirm or amend. */
  readonly steps: readonly string[];
  /** An index into {@link steps}: the line the reading stopped following. */
  readonly suspectStepIndex?: number;
  /**
   * Why the suspect line does not follow from the one before it, in words.
   *
   * Absent unless the reading is confident, localized, and grounded in an item whose
   * canonical solution we hold. It describes the learner's own working; it is not a verdict
   * on their answer, and `workUploadParse.ts` refuses to store one that reads like one.
   */
  readonly explanation?: string;
  /** One to three things to try on paper. Absent whenever {@link explanation} is. */
  readonly nextSteps?: readonly string[];
  /**
   * Why {@link explanation} is absent. Set whenever it is, and never alongside it.
   *
   * Stored, not served. See {@link CoachingWithheldReason} for why a silent refusal is not
   * good enough here.
   */
  readonly coachingWithheld?: CoachingWithheldReason;
  /** The reading's confidence in ITSELF, so the surface can hedge harder when it is low. */
  readonly confidence?: number;
  /** Which implementation produced this, for provenance in a review surface. */
  readonly parserId: string;
  /** Which model it named, so "the readings got worse in March" is answerable. */
  readonly modelId: string;
  /** Present only when `outcome` is unavailable. Never carries a provider message. */
  readonly failureReason?: WorkUploadParseFailureReason;
}

/** Everything a registry entry may need. Fields it does not use are ignored. */
export interface VisionModelSelection {
  /** The model identifier as the provider spells it. Required for every provider. */
  readonly modelId: string;
  /** `http-chat-completions` only: the full endpoint URL, from configuration. */
  readonly endpoint?: string;
  /** `http-chat-completions` only: the Secrets Manager ARN holding the API key. */
  readonly apiKeySecretArn?: string;
  /** `http-chat-completions` only: how to read that secret. */
  readonly resolveSecret?: SecretResolver;
}

export type VisionModelFactory = (selection: VisionModelSelection) => VisionModel;

/**
 * THE REGISTRY. Two entries, which is one more than the feature needs and exactly as many as
 * "the provider is swappable" needs to be a measurable claim rather than an intention.
 *
 *  - **`bedrock-converse` — the default.** IAM-authenticated, so there is no API key
 *    anywhere in this system, and the image stays inside the AWS account that already holds
 *    the bucket it came from. Given a ruling that permits a frontier model without requiring
 *    a new subprocessor, this is the version with the fewest parties to unwind later.
 *  - **`http-chat-completions`** — any vision model behind the common chat-completions
 *    shape, named by configuration, with its key in Secrets Manager. This is the door to a
 *    vendor that is not on Bedrock, and equally to a model on our own hardware, which is the
 *    second option §3.5 named and did not close.
 *
 * EVERY ENTRY HERE REACHES A REAL MODEL, and that is a property worth keeping. A third entry,
 * `scripted-demo`, briefly answered one known problem from a table so the feature could be shown
 * without a twenty-second wait; it was removed with the demonstration it was built for. A canned
 * reading in this registry is one configuration mistake away from putting a confident transcript
 * that no model produced under a learner's photograph, which is why the guard in
 * `infra/test/workUploadParse.test.ts` outlived it.
 */
export const WORK_UPLOAD_PARSERS: Readonly<Record<string, VisionModelFactory>> = {
  "bedrock-converse": (selection) =>
    createBedrockVisionModel({ modelId: selection.modelId }),
  "http-chat-completions": (selection) => {
    if (!selection.endpoint || !selection.apiKeySecretArn || !selection.resolveSecret) {
      throw new Error(
        "the http-chat-completions parser needs WORK_UPLOAD_PARSE_ENDPOINT and " +
          "WORK_UPLOAD_PARSE_API_KEY_SECRET_ARN — it names no vendor of its own, so the " +
          "destination has to be configured",
      );
    }
    return createHttpVisionModel({
      endpoint: selection.endpoint,
      modelId: selection.modelId,
      apiKeySecretArn: selection.apiKeySecretArn,
      resolveSecret: selection.resolveSecret,
    });
  },
};

/** The provider used when the stack names none. See the registry above for why. */
export const DEFAULT_WORK_UPLOAD_PARSER = "bedrock-converse";

/** Build the configured provider, or say which ids exist. */
export function selectVisionModel(
  parserId: string,
  selection: VisionModelSelection,
): VisionModel {
  const factory = WORK_UPLOAD_PARSERS[parserId];
  if (factory === undefined) {
    throw new Error(
      `WORK_UPLOAD_PARSE_PROVIDER "${parserId}" is not a known parser — the registry holds ` +
        `${Object.keys(WORK_UPLOAD_PARSERS).join(", ")}`,
    );
  }
  return factory(selection);
}
