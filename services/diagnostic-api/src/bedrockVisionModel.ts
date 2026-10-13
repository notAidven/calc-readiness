import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ImageFormat as BedrockImageFormat,
} from "@aws-sdk/client-bedrock-runtime";

import {
  type VisionModel,
  type VisionModelReply,
  type VisionModelRequest,
} from "./visionModel";

/**
 * **THE DEFAULT ADAPTER: a frontier vision model on Amazon Bedrock, over the Converse API.**
 *
 * One of two implementations of the `VisionModel` port (`visionModel.ts`), and the one the
 * stack wires by default. Everything provider-specific about the parse is in this file: the
 * SDK import, the request shape, where the token counts live in the reply. Nothing above it
 * knows which vendor answered.
 *
 * ## Why Bedrock is the default, given the ruling that made this possible
 *
 * `docs/Photo_Work_Upload_Scope.md` §3.5's gate was lifted on 2026-08-05 with the owner's
 * explicit *"if security becomes a concern later on we can touch on that."* Two properties
 * follow from that sentence, and Bedrock has both where a direct vendor API has neither:
 *
 *  1. **There is no API key.** The call is signed with the Lambda's own execution role, the
 *     same credentials that already reach Aurora and S3. Nothing to store, nothing to
 *     rotate, nothing to leak, and no path by which a key ends up in an environment
 *     variable, a log line or a commit.
 *  2. **The image does not leave the AWS account.** It goes to a regional Bedrock endpoint
 *     under the same agreement that already covers the bucket the photo is sitting in. The
 *     ruling permits a frontier model; it does not require adding a subprocessor, and the
 *     cheapest version of "we can touch on that later" is the one with the fewest parties
 *     to unwind. (`Photo_Work_Upload_v2_OCR_Feasibility.md` §8 makes the same observation
 *     from the other direction, and is careful — rightly — that whether this counts as *no
 *     third-party sharing* is a legal reading nobody here is making. It is not load-bearing
 *     now: the owner has ruled on the destination. It is why, given the ruling, this is the
 *     destination to pick.)
 *
 * Third: `docs/Deployment.md` already prices everything else in this stack from the AWS
 * bill, and a spend the owner is watching is easier to watch on one invoice.
 *
 * **This is not a lock-in.** `httpVisionModel.ts` sits beside it implementing the same
 * interface against an arbitrary vendor endpoint, and `WORK_UPLOAD_PARSE_PROVIDER` chooses
 * between them at deploy time. Swapping providers is a stack parameter, not a code change.
 *
 * ## Converse rather than InvokeModel
 *
 * `InvokeModel` takes the vendor's own JSON body, so the request shape would change with the
 * model and this file would grow a per-vendor branch — which is exactly the thing the port
 * exists to prevent. `Converse` is Bedrock's model-independent shape, so changing
 * `WORK_UPLOAD_PARSE_MODEL` from one frontier model to another is a string, and the usage
 * block it answers with is where the spend ledger's token counts come from.
 */

export interface BedrockVisionModelConfig {
  /**
   * The Bedrock model id or inference-profile ARN, e.g. a cross-region profile id. Passed
   * through untouched and recorded on every ledger row, so "which model read this" is
   * answerable months later.
   */
  readonly modelId: string;
  /** Injected in tests; defaults to the ambient Lambda credentials + region. */
  readonly client?: BedrockRuntimeClient;
  /**
   * Sampling temperature. 0 by default: this is a transcription-and-localization task with
   * a single right reading of the page, and creativity in it is indistinguishable from a
   * misread. It is also what makes a re-parse of the same photo roughly reproducible, which
   * matters when somebody is trying to work out why a learner was shown what they were.
   */
  readonly temperature?: number;
}

/** Converse names the container; our three content types map one-to-one. */
const IMAGE_FORMATS: Readonly<Record<string, BedrockImageFormat>> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export function createBedrockVisionModel(config: BedrockVisionModelConfig): VisionModel {
  const client = config.client ?? new BedrockRuntimeClient({});
  const temperature = config.temperature ?? 0;

  return {
    id: "bedrock-converse",
    modelId: config.modelId,

    async invoke(request: VisionModelRequest): Promise<VisionModelReply> {
      const format = IMAGE_FORMATS[request.image.contentType];
      if (format === undefined) {
        // Unreachable through the parse route, which only ever reads back an object the
        // ingest path already sniffed as one of these three. Thrown rather than defaulted
        // because a guess here would send the provider a mislabelled container and get a
        // confident misreading of nothing.
        throw new Error(`no vision format for content type ${request.image.contentType}`);
      }
      const reply = await client.send(
        new ConverseCommand({
          modelId: config.modelId,
          // The instruction goes in the SYSTEM block, not beside the image, so the page a
          // learner photographed cannot be read as further instructions. A photo of paper
          // is untrusted input, and it is untrusted input we are handing to a model with an
          // output contract; keeping the contract out of the user turn is the cheap half of
          // not having that contract argued with.
          system: [{ text: request.instructions }],
          messages: [
            {
              role: "user",
              content: [
                {
                  image: {
                    format,
                    // A copy, because the SDK takes ownership of the buffer it is handed
                    // and the caller's bytes are the object we may still want to re-read.
                    source: { bytes: Uint8Array.from(request.image.bytes) },
                  },
                },
              ],
            },
          ],
          inferenceConfig: { maxTokens: request.maxOutputTokens, temperature },
        }),
        // The caller's deadline, honoured by the SDK's own request handler rather than
        // raced against — an aborted request stops costing us bandwidth and stops holding
        // the invocation open.
        { abortSignal: request.signal },
      );

      const text = (reply.output?.message?.content ?? [])
        .map((block) => block.text ?? "")
        .join("")
        .trim();

      return {
        text,
        usage: {
          // Reported by Bedrock, not estimated here. An adapter that could not get these
          // would have to answer 0 (`visionModel.ts`), because a guessed token count is a
          // guessed number in a budget check.
          inputTokens: reply.usage?.inputTokens ?? 0,
          outputTokens: reply.usage?.outputTokens ?? 0,
        },
      };
    },
  };
}
