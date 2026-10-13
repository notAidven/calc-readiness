import type { SecretResolver } from "./secrets";
import type { VisionModel, VisionModelReply, VisionModelRequest } from "./visionModel";

/**
 * **THE SECOND ADAPTER: any vision model behind a chat-completions HTTPS endpoint.**
 *
 * The other implementation of the `VisionModel` port (`visionModel.ts`), and the reason
 * "the provider is swappable" is a measurable claim in this repo rather than an intention.
 * The registry's default adapter is default because it needs no key and keeps the image
 * inside the account; this exists so that a decision the owner has said out loud he may
 * revisit — *"if security becomes a concern later on we can touch on that"* — can be
 * revisited by changing three environment variables.
 *
 * ## It names no vendor, and that is the design rather than an oversight
 *
 * There is no provider name in this file and no URL in it. The endpoint, the model id and
 * the secret holding the key are all **required configuration**, because the request shape
 * below is not one company's: the `messages` / `image_url` data-URI body and the
 * `usage.prompt_tokens` reply are the de-facto interchange format that the major hosted
 * APIs, the aggregating gateways and the self-hosted servers all speak. Writing it against
 * the shape instead of against a brand means the same adapter reaches a frontier API today
 * and a model on our own hardware later, which is the second door
 * `docs/Photo_Work_Upload_Scope.md` §3.5 named and did not close.
 *
 * It also keeps a rule intact that is worth keeping intact:
 * `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts` forbids an absolute-URL literal
 * anywhere in this lane. Under the old posture that rule meant "no photo may be posted
 * anywhere"; it now means something narrower and still useful — **a destination for a
 * student's photograph is a deployment decision with a name on it, and cannot be a string
 * somebody typed into a source file.**
 *
 * ## The key is never in the environment
 *
 * `apiKeySecretArn` points at a Secrets Manager secret and `secrets.ts` reads it at first
 * use. See that file for why the ARN may live in the function's configuration and the value
 * may not.
 */

export interface HttpVisionModelConfig {
  /**
   * The full chat-completions URL, from configuration. Required, and validated as `https:`
   * at construction — a student's photograph does not travel over plaintext, and an
   * unparseable endpoint should fail at deploy rather than on a learner's request.
   */
  readonly endpoint: string;
  /** The model identifier as the provider spells it. Recorded on every ledger row. */
  readonly modelId: string;
  /** Secrets Manager ARN of the API key. The value is never read from the environment. */
  readonly apiKeySecretArn: string;
  readonly resolveSecret: SecretResolver;
  /**
   * How the key is presented. `bearer` covers nearly everything; `x-api-key` covers the
   * rest. A free-form header name would be a place to accidentally send a credential
   * somewhere it was not meant to go, so the choice is closed.
   */
  readonly authScheme?: "bearer" | "x-api-key";
  /**
   * Sampling temperature, 0 by default. This is a transcription-and-localization task with
   * one right reading of the page, and creativity in it is indistinguishable from a misread.
   */
  readonly temperature?: number;
  /** Injected in tests. Defaults to the runtime's own `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /**
   * How long to wait before giving up, in milliseconds.
   *
   * A model call is the only outbound request this service makes, and it is the only one
   * that can hold a Lambda invocation open long enough to matter. The parse route degrades
   * gracefully on a throw, so a timeout costs a learner a "we could not read this" and costs
   * us nothing further.
   */
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 45_000;

/** `data:image/jpeg;base64,…`, which is how this request shape carries an inline image. */
function dataUri(contentType: string, bytes: Uint8Array): string {
  let binary = "";
  // Chunked, because spreading a 3.5 MB array into `String.fromCharCode` blows the argument
  // limit on every runtime that has one.
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

interface ChatCompletionsReply {
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function createHttpVisionModel(config: HttpVisionModelConfig): VisionModel {
  const url = new URL(config.endpoint);
  if (url.protocol !== "https:") {
    throw new Error(
      `the vision endpoint must be https (got ${url.protocol}) — a student's photograph ` +
        "is not sent over plaintext",
    );
  }
  const fetchImpl = config.fetchImpl ?? fetch;
  const authScheme = config.authScheme ?? "bearer";
  const temperature = config.temperature ?? 0;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    id: "http-chat-completions",
    modelId: config.modelId,

    async invoke(request: VisionModelRequest): Promise<VisionModelReply> {
      const apiKey = await config.resolveSecret(config.apiKeySecretArn);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      // The caller's deadline as well as our own, whichever fires first. Chained by hand
      // rather than with `AbortSignal.any`, which is newer than this runtime's floor.
      const abortWithCaller = () => controller.abort();
      request.signal?.addEventListener("abort", abortWithCaller, { once: true });
      if (request.signal?.aborted) {
        controller.abort();
      }
      let response: Response;
      try {
        response = await fetchImpl(url.toString(), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(authScheme === "bearer"
              ? { authorization: `Bearer ${apiKey}` }
              : { "x-api-key": apiKey }),
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.modelId,
            temperature,
            max_tokens: request.maxOutputTokens,
            messages: [
              // Same split as the other adapter: the contract goes in the system turn, so
              // the photographed page cannot be read as further instructions.
              { role: "system", content: request.instructions },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: dataUri(request.image.contentType, request.image.bytes),
                    },
                  },
                ],
              },
            ],
          }),
        });
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener("abort", abortWithCaller);
      }

      if (!response.ok) {
        // The STATUS only. A provider error body can quote the request back, and this
        // message reaches a log; a photograph's data URI in CloudWatch would undo the whole
        // point of the private bucket.
        throw new Error(`the vision endpoint answered ${response.status}`);
      }
      const body = (await response.json()) as ChatCompletionsReply;
      return {
        text: (body.choices?.[0]?.message?.content ?? "").trim(),
        usage: {
          inputTokens: body.usage?.prompt_tokens ?? 0,
          outputTokens: body.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
