import { apiBaseUrl } from "../api";
import type {
  WorkParse,
  WorkParseClient,
  WorkParseFailureReason,
  WorkParseUnavailable,
} from "./parseTypes";

/**
 * The client half of `POST /api/work-upload/parse`, and a dev implementation for the loop
 * that has no server.
 *
 * ## Why there is a dev implementation at all
 *
 * `apps/web/src/api.ts`'s `isServerBacked` is false in local dev and in CI: there is no
 * Lambda, no Aurora and no bucket, so nothing in this repo's test loop can produce a real
 * reading. Without a stub the provisional surface could not be rendered, reviewed or tested
 * at all — which is precisely how a hedge gets dropped in a redesign nobody could look at.
 * {@link createStubWorkParseClient} answers a fixed, obviously-synthetic reading so the card
 * can be seen; it calls nothing and costs nothing.
 *
 * ## Failure is a value here, not an exception
 *
 * `read` resolves with a {@link WorkParseUnavailable} for every ordinary failure — an
 * outage, a timeout, the daily spend cap, a 4xx. A machine reading of a learner's
 * handwriting is a nice-to-have on a lesson surface that must keep working without it, so
 * there is no failure of this feature that a caller has to catch. It rejects for nothing.
 */

/** The two sentences a surface shows when there is no reading. */
const UNAVAILABLE_COPY: Readonly<
  Record<WorkParseFailureReason, readonly [string, string]>
> = {
  paused: [
    "Automated reading is paused for today.",
    "We've read as many photos as we can today. Your upload is saved and a person can " +
      "still look at it.",
  ],
  auth: [
    "Your sign-in needs refreshing.",
    "Your photo is saved. Sign in again before asking the automated reader.",
  ],
  config: [
    "Automated reading isn't turned on.",
    "Your photo is still saved for review. You can keep practising without a reading.",
  ],
  model_id: [
    "The automated reader is being updated.",
    "The configured reader could not be reached. Your photo is saved for review.",
  ],
  access: [
    "The automated reader isn't available to this app.",
    "The app's model access needs attention. Your photo is still saved for review.",
  ],
  malformed_output: [
    "We couldn't safely show that automated reading.",
    "The reader answered in a format we could not verify. Your photo is saved; you can retry.",
  ],
  upload: [
    "That saved photo isn't available to the reader.",
    "Delete it and add a new photo if you still want an automated reading.",
  ],
  service: [
    "We couldn't read your work this time.",
    "Your photo is saved. The automated reader had a temporary problem; you can retry.",
  ],
};

function unavailable(
  uploadId: string,
  reason: WorkParseFailureReason,
): WorkParseUnavailable {
  const [headline, caveat] = UNAVAILABLE_COPY[reason];
  return { uploadId, outcome: "unavailable", provisional: true, headline, caveat, reason };
}

const FAILURE_REASONS = new Set<WorkParseFailureReason>(
  Object.keys(UNAVAILABLE_COPY) as WorkParseFailureReason[],
);

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeReason(value: unknown): WorkParseFailureReason {
  return typeof value === "string" && FAILURE_REASONS.has(value as WorkParseFailureReason)
    ? (value as WorkParseFailureReason)
    : "service";
}

function parseReading(
  value: unknown,
  uploadId: string,
): WorkParse | WorkParseUnavailable | null {
  const wire = object(value);
  if (!wire || wire.uploadId !== uploadId || wire.provisional !== true) {
    return null;
  }
  if (wire.outcome === "unavailable") {
    return unavailable(uploadId, safeReason(wire.failureReason));
  }
  if (
    wire.outcome !== "read" &&
    wire.outcome !== "low_confidence" &&
    wire.outcome !== "unreadable"
  ) {
    return null;
  }
  if (
    !Array.isArray(wire.steps) ||
    wire.steps.some((step) => typeof step !== "string") ||
    typeof wire.headline !== "string" ||
    wire.headline.trim() === "" ||
    typeof wire.caveat !== "string" ||
    wire.caveat.trim() === "" ||
    typeof wire.parserId !== "string" ||
    typeof wire.modelId !== "string" ||
    typeof wire.createdAt !== "string"
  ) {
    return null;
  }
  // A configured account client must never display a demonstration fixture as if a model
  // produced it. Presenter owns its deterministic result in a separate demo-only module;
  // seeing either marker on this authenticated wire means the service was misconfigured.
  //
  // The provider that produced this marker has been removed, so nothing should be able to send
  // it. Kept anyway: it costs one comparison, and the failure it refuses is a learner reading a
  // confident transcript no model produced, which is not a failure worth being clever about.
  if (wire.parserId === "scripted-demo" || wire.modelId === "scripted-demo") {
    return null;
  }
  const steps = wire.steps as string[];
  const suspect =
    typeof wire.suspectStepIndex === "number" &&
    Number.isInteger(wire.suspectStepIndex) &&
    wire.suspectStepIndex >= 0 &&
    wire.suspectStepIndex < steps.length
      ? wire.suspectStepIndex
      : undefined;
  const confidence =
    typeof wire.confidence === "number" &&
    Number.isFinite(wire.confidence) &&
    wire.confidence >= 0 &&
    wire.confidence <= 1
      ? wire.confidence
      : undefined;
  // The coaching pair travels together or not at all, and only over a localized reading.
  // The server already holds all three conditions; this repeats them because a client that
  // trusted the server's shape would render an explanation with no line to point at the
  // moment either side drifted, and that reads as a verdict on the whole page.
  const nextSteps =
    Array.isArray(wire.nextSteps) && wire.nextSteps.every((s) => typeof s === "string")
      ? (wire.nextSteps as string[])
      : [];
  const coached =
    suspect !== undefined &&
    typeof wire.explanation === "string" &&
    wire.explanation.trim() !== "" &&
    nextSteps.length > 0;
  return {
    uploadId,
    outcome: wire.outcome,
    steps,
    ...(suspect === undefined ? {} : { suspectStepIndex: suspect }),
    ...(coached ? { explanation: wire.explanation as string, nextSteps } : {}),
    ...(confidence === undefined ? {} : { confidence }),
    provisional: true,
    headline: wire.headline,
    caveat: wire.caveat,
    parserId: wire.parserId,
    modelId: wire.modelId,
    createdAt: wire.createdAt,
  };
}

function reasonForHttp(status: number, code: unknown): WorkParseFailureReason {
  if (status === 401 || status === 403) {
    return "auth";
  }
  if (status === 404) {
    return "upload";
  }
  if (status === 429) {
    return "paused";
  }
  switch (code) {
    case "parse_unconfigured":
      return "config";
    case "parse_model_id":
      return "model_id";
    case "parse_access":
      return "access";
    case "parse_malformed_output":
      return "malformed_output";
    case "parse_upload":
      return "upload";
    default:
      return status === 500 ? "config" : "service";
  }
}

export interface HttpWorkParseClientOptions {
  /** Where `POST /api/work-upload/parse` lives. */
  readonly endpoint: string;
  /** Resolve the current Cognito access token (`getAccessToken` from the auth client). */
  readonly getToken: () => Promise<string | null>;
  /** Injected in tests. Defaults to the browser's own `fetch`. */
  readonly fetchImpl?: typeof fetch;
}

/**
 * The real client. Server-derived `student_id` throughout: it sends an upload id and a
 * bearer token, and nothing else — the route establishes ownership from the verified `sub`,
 * so there is no field here a caller could set to reach somebody else's photograph.
 */
export function createHttpWorkParseClient(
  options: HttpWorkParseClientOptions,
): WorkParseClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async read(uploadId) {
      try {
        const token = await options.getToken();
        if (!token) {
          return unavailable(uploadId, "auth");
        }
        const response = await fetchImpl(options.endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uploadId }),
        });
        const raw = await response.text();
        let body: unknown;
        try {
          body = JSON.parse(raw) as unknown;
        } catch {
          return unavailable(uploadId, "malformed_output");
        }
        if (!response.ok) {
          return unavailable(uploadId, reasonForHttp(response.status, object(body)?.code));
        }
        const parse = parseReading(object(body)?.parse, uploadId);
        if (!parse) {
          return unavailable(uploadId, "malformed_output");
        }
        return parse;
      } catch {
        return unavailable(uploadId, "service");
      }
    },
  };
}

function isCognitoConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_COGNITO_USER_POOL_ID && import.meta.env.VITE_COGNITO_CLIENT_ID,
  );
}

/** Pick the real authenticated client in production and the no-network stub in dev/CI. */
export function createWorkParseClient(): WorkParseClient {
  const base = apiBaseUrl();
  if (base === null || !isCognitoConfigured()) {
    return createStubWorkParseClient();
  }
  return createHttpWorkParseClient({
    endpoint: `${base}/work-upload/parse`,
    getToken: async () => {
      const { getAccessToken } = await import("../auth/cognitoClient");
      return getAccessToken();
    },
  });
}

let singleton: WorkParseClient | null = null;

export function getWorkParseClient(): WorkParseClient {
  singleton ??= createWorkParseClient();
  return singleton;
}

/**
 * The dev/CI stub. Answers one fixed reading so the card renders in a loop with no server.
 *
 * The transcript is deliberately a little wrong — the third line does not follow from the
 * second — because that is what a real reading of a real page looks like 37.62% of the time,
 * and a stub that always agreed with itself would make the provisional framing look like
 * decoration to whoever reviews the surface.
 */
export function createStubWorkParseClient(
  overrides: Partial<WorkParse> = {},
): WorkParseClient {
  return {
    async read(uploadId) {
      return {
        uploadId,
        outcome: "read",
        steps: ["3x + 5 = 20", "3x = 15", "x = 3"],
        suspectStepIndex: 2,
        // Coaching about the line the transcript flags, and it states no answer, so the
        // surface can be reviewed under the constraint the server enforces rather than
        // under a friendlier one. See the note above on why the stub disagrees with itself.
        explanation:
          "On the last line you divided both sides by 3, and the left side came out as if " +
          "the 3 had simply moved across. Work through 15 divided by 3 on its own and " +
          "compare it with the value you wrote.",
        nextSteps: [
          "Redo the division on the last line, writing 15 / 3 out in full.",
          "Put your value back into 3x + 5 and see whether it reaches 20.",
        ],
        confidence: 0.74,
        provisional: true,
        headline: "Here's what we read. Correct us if we got it wrong.",
        caveat:
          "This is a machine reading of your handwriting and it is often wrong. It " +
          "doesn't change your progress either way.",
        parserId: "dev-stub",
        modelId: "dev-stub",
        createdAt: new Date(0).toISOString(),
        ...overrides,
      };
    },
  };
}
