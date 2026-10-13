import type { DiagnosticAuthenticator } from "@cr/diagnostic-runtime";
import { PRACTICE_AUTHORITY_ITEMS } from "@cr/item-bank";
import { describe, expect, it, vi } from "vitest";

import { createDiagnosticApi } from "./app";
import { createFakeObjectStore } from "./test/fakeWorkUpload";
import {
  createFakeParseCluster,
  type FakeRow,
  readingReply,
  scriptedVisionModel,
} from "./test/fakeVisionModel";
import { MAX_VISION_IMAGE_BYTES, type VisionModelReply } from "./visionModel";
import { WORK_UPLOAD_KEY_PREFIX } from "./workUpload";
import {
  classifyVisionFailure,
  createWorkUploadParseService,
  DEFAULT_WORK_UPLOAD_PARSE_LIMITS,
  leaksAnswerKey,
  readModelReply,
  sanitizeCoaching,
  type WorkUploadParseWire,
} from "./workUploadParse";
import { groundingForItem } from "./workUploadParseGrounding";

/**
 * **`POST /api/work-upload/parse`, WITHOUT EVER CALLING A MODEL.**
 *
 * The seam every case here mocks at is `VisionModel` (`visionModel.ts`) — one interface
 * carrying an image in and text plus a token count out. Nothing below it is exercised: no
 * network, no credentials, no vendor SDK. What that leaves unverified is named in the PR
 * rather than implied away, and it is a short list, because everything that decides what a
 * learner is shown or what the account is billed lives above the seam.
 *
 * Three groups of claims, in the order they would hurt:
 *
 *  1. **A learner can only ever parse their own upload**, established the same way the read
 *     and delete paths establish it. Falsifiable: the DB double applies the WHERE clause it
 *     finds in the statement, so deleting `and student_id = :sid` makes these fail rather
 *     than passing over a double that was doing the scoping (`test/fakeVisionModel.ts`).
 *  2. **A wrong reading degrades into something honest**, never into nonsense on a learner's
 *     screen. The best frontier model behind an API misreads something on 37.62% of real
 *     multi-step student pages (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4), so this is
 *     the ordinary path and not the edge case.
 *  3. **The spend is bounded before the call**, by a per-learner count and an account-wide
 *     dollar ceiling. Same falsifiability: the window bound is read off the SQL.
 *
 * The one-way invariant — that none of this can reach mastery, placement or the pre/post
 * metric — is `test/workUploadParseStaysFeedbackOnly.test.ts`, which measures the module
 * graph and the types from outside rather than from in here.
 */

const STUDENT_A = "11111111-1111-4111-8111-111111111111";
const STUDENT_B = "22222222-2222-4222-8222-222222222222";
const UPLOAD_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const UPLOAD_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/** Tokens are `jwt:<sub>`; anything else is unverified, as a bad signature would be. */
const authenticate: DiagnosticAuthenticator = async (token) => {
  const sub = typeof token === "string" ? /^jwt:(.+)$/.exec(token)?.[1] : undefined;
  return sub === undefined ? null : { student_id: sub as never };
};

function objectKey(studentId: string, uploadId: string): string {
  return `${WORK_UPLOAD_KEY_PREFIX}${studentId}/lesson-practice/NUM.F/num-f.item.1/${uploadId}.jpg`;
}

/**
 * A stored upload, as `complete` would have left it — stripped, sniffed and indexed.
 *
 * `item_version_id` defaults to one the bank does not hold, so every case written before the
 * coaching layer keeps testing the UNGROUNDED path it was written against. The grounded cases
 * pass a real one.
 */
function uploadRow(studentId: string, uploadId: string, itemVersionId?: string): FakeRow {
  return {
    upload_id: uploadId,
    student_id: studentId,
    object_key: objectKey(studentId, uploadId),
    content_type: "image/jpeg",
    size_bytes: 4096,
    surface: "lesson-practice",
    node_id: "NUM.F",
    administration_id: null,
    item_version_id: itemVersionId ?? "num-f.item.1",
    template_id: null,
    attempt_id: null,
    created_at: 1_780_000_000,
  };
}

/** The stored bytes. Content is irrelevant to every case; identity is not. */
const STORED_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

const A_GOOD_READING = {
  readable: true,
  steps: ["3x + 5 = 20", "3x = 25", "x = 25/3"],
  firstQuestionableStep: 1,
  confidence: 0.86,
};

interface Harness {
  cluster: ReturnType<typeof createFakeParseCluster>;
  objects: ReturnType<typeof createFakeObjectStore>;
  model: ReturnType<typeof scriptedVisionModel>;
  service: ReturnType<typeof createWorkUploadParseService>;
}

function harness(
  options: {
    replies?: readonly (VisionModelReply | (() => VisionModelReply))[];
    parses?: readonly FakeRow[];
    uploads?: readonly FakeRow[];
    bytes?: Uint8Array;
    limits?: Parameters<typeof createWorkUploadParseService>[0]["limits"];
    /** Seconds since the epoch the service should believe it is. */
    nowEpoch?: number;
  } = {},
): Harness {
  const nowEpoch = options.nowEpoch ?? 1_780_100_000;
  const cluster = createFakeParseCluster({
    uploads: options.uploads ?? [uploadRow(STUDENT_A, UPLOAD_A)],
    parses: options.parses ?? [],
  });
  const objects = createFakeObjectStore({
    [objectKey(STUDENT_A, UPLOAD_A)]: {
      contentType: "image/jpeg",
      bytes: options.bytes ?? STORED_BYTES,
    },
    [objectKey(STUDENT_B, UPLOAD_B)]: {
      contentType: "image/jpeg",
      bytes: options.bytes ?? STORED_BYTES,
    },
  });
  const model = scriptedVisionModel(options.replies ?? [readingReply(A_GOOD_READING)], {
    id: "test-provider",
    modelId: "test-model",
  });
  let ids = 0;
  return {
    cluster,
    objects,
    model,
    service: createWorkUploadParseService({
      db: cluster.db,
      authenticate,
      objects,
      model,
      // $3 / $15 per million tokens, which is the published list rate for a current frontier
      // vision model on Bedrock. Pinned here so the cost arithmetic below is a real number.
      prices: { inputUsdPerMillionTokens: 3, outputUsdPerMillionTokens: 15 },
      ...(options.limits ? { limits: options.limits } : {}),
      newParseId: () => {
        ids += 1;
        return `cccccccc-cccc-4ccc-8ccc-${String(ids).padStart(12, "0")}`;
      },
      now: () => new Date(nowEpoch * 1000),
    }),
  };
}

/** A parse row this student made `secondsAgo` seconds before the harness's `now`. */
function parseRow(
  studentId: string,
  uploadId: string,
  options: { secondsAgo: number; costMicroUsd?: number; outcome?: string } = {
    secondsAgo: 60,
  },
): FakeRow {
  return {
    parse_id: `dddddddd-dddd-4ddd-8ddd-${String(options.secondsAgo).padStart(12, "0")}`,
    upload_id: uploadId,
    student_id: studentId,
    parser_id: "test-provider",
    model_id: "test-model",
    outcome: options.outcome ?? "read",
    confidence: 0.9,
    steps: JSON.stringify(["a", "b"]),
    suspect_step_index: 1,
    input_tokens: 3100,
    output_tokens: 300,
    cost_micro_usd: options.costMicroUsd ?? 13_800,
    created_at: 1_780_100_000 - options.secondsAgo,
  };
}

function wireOf(response: { body: unknown }): WorkUploadParseWire {
  return (response.body as { parse: WorkUploadParseWire }).parse;
}

describe("only the owner's own upload can be parsed", () => {
  it("401s an unverified caller before touching anything", async () => {
    const bag = harness();
    const response = await bag.service.parse(null, { uploadId: UPLOAD_A });
    expect(response.status).toBe(401);
    expect(bag.model.calls).toHaveLength(0);
    expect(bag.cluster.issued).toHaveLength(0);
  });

  it("400s a body that names no upload", async () => {
    const bag = harness();
    for (const body of [null, {}, { uploadId: "not-a-uuid" }, { uploadId: 7 }]) {
      const response = await bag.service.parse(`jwt:${STUDENT_A}`, body);
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    expect(bag.model.calls).toHaveLength(0);
  });

  it("answers another student's upload id as if it did not exist, and calls no model", async () => {
    // THE LOAD-BEARING CASE. `UPLOAD_B` is real, stored, and somebody else's. A 403 would
    // tell the caller it exists; a model call would have already sent them the photo.
    const bag = harness({
      uploads: [uploadRow(STUDENT_A, UPLOAD_A), uploadRow(STUDENT_B, UPLOAD_B)],
    });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_B });
    // The model check FIRST, deliberately: it is the assertion whose failure is a privacy
    // incident rather than a wrong status code, and asserting the status first would report
    // the incident as `expected 500 to be 404`.
    expect(
      bag.model.calls,
      "another learner's photograph was sent to a model",
    ).toHaveLength(0);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "no upload of yours has that id" });
    expect(bag.objects.signed).toHaveLength(0);
    expect(bag.cluster.parses).toHaveLength(0);
  });

  it("scopes every statement it issues to the verified sub, except the account's own bill", async () => {
    const bag = harness();
    await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    const reads = bag.cluster.issued.filter((statement) =>
      /^\s*select\b/i.test(statement.sql),
    );
    const unscoped = reads.filter(
      (statement) => !/student_id\s*=\s*:sid/.test(statement.sql),
    );
    // Exactly one, named: the rolling spend sum. It is a question about the account's bill,
    // reads one aggregate over a cost column, and can return no student, no key and no
    // reading. Scoping it would make the account-wide cap a per-student cap wearing the
    // wrong name — see `WORK_UPLOAD_PARSE_STATEMENTS.sumRecentSpend`.
    expect(unscoped).toHaveLength(1);
    expect(unscoped[0]?.sql).toContain("sum(cost_micro_usd)");
    expect(unscoped[0]?.sql).not.toContain("object_key");
    expect(unscoped[0]?.sql).not.toContain("steps");
    // And a floor, so the assertion above is not holding over an empty list.
    expect(reads.length).toBeGreaterThanOrEqual(3);
    // The one WRITE, and its owning student is the verified sub rather than anything off
    // the request — the same rule as the reads, in the direction a filter cannot express.
    const writes = bag.cluster.issued.filter((statement) =>
      /^\s*insert\b/i.test(statement.sql),
    );
    expect(writes).toHaveLength(1);
    expect(writes[0]?.sql).toMatch(/student_id[\s\S]*values[\s\S]*:sid/);
    expect(writes[0]?.params?.sid).toBe(STUDENT_A);
  });

  it("hands the model the STORED bytes, which are the post-strip ones", async () => {
    // §6's ingest sweep runs in `complete`, and the parse reads the object back rather than
    // taking bytes from a request — so what leaves our boundary carries no EXIF and no home
    // coordinates. The identity check is the assertion: these are the bucket's bytes.
    const bag = harness();
    await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(bag.model.calls).toHaveLength(1);
    expect(bag.model.calls[0]?.image.bytes).toBe(STORED_BYTES);
    expect(bag.model.calls[0]?.image.contentType).toBe("image/jpeg");
    // And it is never a URL: a provider that fetches one needs a credential into the bucket.
    expect(JSON.stringify(bag.model.calls[0])).not.toContain("http");
  });
});

describe("a reading comes back provisional, and localizes the step", () => {
  it("answers the steps, the suspect line and the framing §3.5 asks for", async () => {
    const bag = harness();
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(200);
    const parse = wireOf(response);
    expect(parse.outcome).toBe("read");
    expect(parse.steps).toEqual(["3x + 5 = 20", "3x = 25", "x = 25/3"]);
    expect(parse.suspectStepIndex).toBe(1);
    expect(parse.confidence).toBeCloseTo(0.86);
    expect(parse.provisional).toBe(true);
    // The doc's own words, so the hedge travels with the data rather than depending on a
    // surface remembering to add one.
    expect(parse.headline).toBe("Here's what we read. Correct us if we got it wrong.");
    expect(parse.caveat).toContain("often wrong");
    expect(parse.parserId).toBe("test-provider");
    expect(parse.modelId).toBe("test-model");
  });

  it("records the attempt in the ledger with its real cost", async () => {
    const bag = harness();
    await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(bag.cluster.parses).toHaveLength(1);
    const row = bag.cluster.parses[0];
    expect(row?.outcome).toBe("read");
    expect(row?.input_tokens).toBe(3100);
    expect(row?.output_tokens).toBe(300);
    // 3100 input at $3/M = $0.0093; 300 output at $15/M = $0.0045. 13,800 micro-dollars,
    // i.e. 1.38 cents a parse — the number the daily ceiling is denominated against.
    expect(row?.cost_micro_usd).toBe(13_800);
    expect(row?.student_id).toBe(STUDENT_A);
  });

  it("never carries a field a scorer could read", async () => {
    const bag = harness();
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    const serialized = JSON.stringify(response.body);
    for (const forbidden of [
      "mastery",
      "score",
      "client_correct",
      "placement",
      "theta",
      "credit",
      "points",
    ]) {
      expect(serialized, `the response carries "${forbidden}"`).not.toContain(forbidden);
    }
    expect(Object.keys(wireOf(response)).sort()).toEqual([
      "caveat",
      "confidence",
      "createdAt",
      "headline",
      "modelId",
      "outcome",
      "parserId",
      "provisional",
      "steps",
      "suspectStepIndex",
      "uploadId",
    ]);
  });
});

/**
 * **THE COACHING LAYER.** `docs/Photo_Work_Upload_AI_Feedback_Eval.md` §1 records that Coach
 * shipped as "headline + caveat only (server-authored framing)"; these are the cases for the
 * generated half.
 *
 * Every one of them turns on a REAL item out of the bank rather than a fixture, because the
 * whole claim is that the coaching is anchored in the problem the learner was actually set,
 * and a fixture would let that anchor be wrong in exactly the way §3.3 scores 0.
 */
describe("coaching arrives grounded, or it does not arrive", () => {
  /**
   * Coaching that could not leak any plausible answer key: no digits, no variables, no
   * operators. Held apart so the item chosen below can be chosen BY the property that this
   * text is safe over it, rather than pinned to an id that a bank edit could invalidate.
   */
  const SAFE_EXPLANATION =
    "You took the same term away from the left side only, so the two sides stopped " +
    "balancing from that line onwards.";
  const SAFE_NEXT_STEPS = ["Rewrite that line, taking the term off both sides."];

  /**
   * The item the grounded cases run over: the first served item this repo holds a canonical
   * solution AND a keyed answer for, over which the safe coaching above does not read as a
   * leak. Derived, so a bank edit cannot leave this suite pointing at an id that no longer
   * exists, and floored below so it cannot quietly derive nothing.
   */
  const GROUNDED = PRACTICE_AUTHORITY_ITEMS.find((item) => {
    const grounding = groundingForItem(item.item_version_id);
    return (
      grounding?.answerKey !== undefined &&
      !leaksAnswerKey(
        `${SAFE_EXPLANATION} ${SAFE_NEXT_STEPS.join(" ")}`,
        grounding.answerKey,
      )
    );
  });

  /** The bank's own answer to the item above. Never sent to a model; used to check replies. */
  function answerKey(): string {
    const key = groundingForItem(GROUNDED?.item_version_id ?? "")?.answerKey;
    if (key === undefined) {
      throw new Error("the grounded item lost its answer key between two lines of setup");
    }
    return key;
  }

  function groundedHarness(
    coaching: Record<string, unknown>,
    reading: Record<string, unknown> = A_GOOD_READING,
  ): Harness {
    return harness({
      uploads: [uploadRow(STUDENT_A, UPLOAD_A, GROUNDED?.item_version_id)],
      replies: [readingReply({ ...reading, ...coaching })],
    });
  }

  const COACHED = { explanation: SAFE_EXPLANATION, nextSteps: SAFE_NEXT_STEPS };

  it("has a real served item to ground against", () => {
    // The floor. Every case below is conditioned on this item resolving, so a derivation
    // that found nothing would leave them all passing over an ungrounded upload — which is
    // to say, passing while measuring the behaviour this describe block was written to
    // replace.
    expect(
      GROUNDED,
      "no served item has both a worked solution and an answer key",
    ).toBeDefined();
    const grounding = groundingForItem(GROUNDED?.item_version_id ?? "");
    expect(grounding?.workedSolution.length).toBeGreaterThan(0);
    expect(grounding?.prompt.length).toBeGreaterThan(0);
  });

  it("sends the problem and its canonical path, and labels no value as the answer", async () => {
    const bag = groundedHarness(COACHED);
    await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    const instructions = bag.model.calls[0]?.instructions ?? "";
    const grounding = groundingForItem(GROUNDED?.item_version_id ?? "");
    // The anchor. Without these two the coaching is the generic filler §3.3 scores 0.
    expect(instructions).toContain(grounding?.prompt);
    expect(instructions).toContain(grounding?.workedSolution[0]);
    // Nothing is LABELLED as the answer. Scoped to a labelling — a line whose own key is
    // "answer" — rather than to the word, because the item's prompt and its hints are the
    // learner's own text and may say "answer" for perfectly good reasons of their own.
    expect(instructions).not.toMatch(/^\s*answer(?:\s*key)?\s*[:=]/im);
    expect(instructions).toContain("Never state the final answer");
    // AND THE HONEST HALF, asserted rather than left as a caveat somebody could miss: the
    // reference path solves the problem, so on this item it states the answer outright. This
    // case exists to stop a future reader treating the prompt as the control. It is not one.
    // The reply check is, and "DROPS coaching that states the item's own answer" measures it.
    expect(
      grounding?.workedSolution.some((step) => leaksAnswerKey(step, answerKey())),
      "the canonical path no longer reaches the answer, which is a change worth noticing " +
        "because this suite's leakage claim rests on the reply check and not on this",
    ).toBe(true);
  });

  it("asks nothing of the model when there is no canonical solution to ask against", () => {
    // The ungrounded path, which is every CFU upload and every hand-authored item. The
    // reading is unchanged and the addendum is absent: a model with no reference invents one.
    const bag = harness({ replies: [readingReply({ ...A_GOOD_READING, ...COACHED })] });
    return bag.service
      .parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A })
      .then((response) => {
        expect(bag.model.calls[0]?.instructions).not.toContain("REFERENCE ONLY");
        const parse = wireOf(response);
        // The transcript still lands. Missing grounding costs a learner nothing they had.
        expect(parse.outcome).toBe("read");
        expect(parse.steps).toHaveLength(3);
        expect(parse.suspectStepIndex).toBe(1);
        // And the coaching is refused even though the model volunteered it, because there was
        // nothing to check it against.
        expect(parse.explanation).toBeUndefined();
        expect(parse.nextSteps).toBeUndefined();
        expect(bag.cluster.parses[0]?.explanation).toBeNull();
      });
  });

  it("answers, stores and re-serves coaching over a grounded confident reading", async () => {
    const bag = groundedHarness(COACHED);
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    const parse = wireOf(response);
    expect(parse.explanation).toBe(SAFE_EXPLANATION);
    expect(parse.nextSteps).toEqual(SAFE_NEXT_STEPS);
    // Still a closed set: the two new keys and not a third.
    expect(Object.keys(parse).sort()).toEqual([
      "caveat",
      "confidence",
      "createdAt",
      "explanation",
      "headline",
      "modelId",
      "nextSteps",
      "outcome",
      "parserId",
      "provisional",
      "steps",
      "suspectStepIndex",
      "uploadId",
    ]);
    // Nothing a scorer could read, over prose a model wrote. This is the check the verdict
    // list in `sanitizeCoaching` exists to keep true rather than to hope for.
    const serialized = JSON.stringify(response.body);
    for (const forbidden of [
      "mastery",
      "score",
      "placement",
      "theta",
      "credit",
      "points",
    ]) {
      expect(serialized, `the response carries "${forbidden}"`).not.toContain(forbidden);
    }
    // Stored, and served back from the ledger without a second call to anybody.
    expect(bag.cluster.parses[0]?.explanation).toBe(SAFE_EXPLANATION);
    expect(bag.cluster.parses[0]?.next_steps).toBe(JSON.stringify(SAFE_NEXT_STEPS));
    const cached = harness({
      uploads: [uploadRow(STUDENT_A, UPLOAD_A, GROUNDED?.item_version_id)],
      parses: [bag.cluster.parses[0] as FakeRow],
    });
    const reopened = await cached.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect((reopened.body as { cached: boolean }).cached).toBe(true);
    expect(wireOf(reopened).explanation).toBe(SAFE_EXPLANATION);
    expect(cached.model.calls).toHaveLength(0);
  });

  it("DROPS coaching that states the item's own answer", async () => {
    // The failure this whole design is arranged around. The model is never told the key, so
    // reaching it means the model solved the problem itself — which it can, and which is
    // why the check is on the reply rather than on the prompt.
    const bag = groundedHarness({
      explanation: `Your last line does not follow. Working it through gives ${answerKey()}.`,
      nextSteps: SAFE_NEXT_STEPS,
    });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.explanation).toBeUndefined();
    // BOTH halves go. Next steps surviving an explanation we refused to show would leave a
    // learner with instructions and no account of why they were given.
    expect(parse.nextSteps).toBeUndefined();
    // And the reading itself is untouched: the transcript is not the thing that misbehaved.
    expect(parse.outcome).toBe("read");
    expect(parse.steps).toHaveLength(3);
    expect(bag.cluster.parses[0]?.explanation).toBeNull();
  });

  it("DROPS coaching that leaks the answer through the next steps", async () => {
    // Both fields are checked together, so a model cannot get the answer past the guard by
    // putting it in the quieter of the two.
    const bag = groundedHarness({
      explanation: SAFE_EXPLANATION,
      nextSteps: [`Check your last line against ${answerKey()}.`],
    });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.explanation).toBeUndefined();
    expect(parse.nextSteps).toBeUndefined();
  });

  it("DROPS coaching that delivers a verdict", async () => {
    for (const verdict of [
      "That line is incorrect, so the rest follows from a bad start.",
      "This will not affect your score in any way.",
      "You lose no credit for this line.",
      "The answer is not what you have written on the last line.",
      // The scoring names stay SUBSTRING-matched, which these two are here to hold: a
      // word-boundary rule would let "scored" and "credited" through, and
      // `never carries a field a scorer could read` scans the serialized body for the bare
      // stems. The two rules have to agree or one of them is decorative.
      "You scored two of the three lines here.",
      "No marks are credited for the last line.",
      // And the standalone verdict words, which is what survives narrowing the rest.
      "Your final answer is correct.",
    ]) {
      const bag = groundedHarness({ explanation: verdict, nextSteps: SAFE_NEXT_STEPS });
      const parse = wireOf(
        await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
      );
      expect(parse.explanation, verdict).toBeUndefined();
      expect(parse.nextSteps, verdict).toBeUndefined();
    }
  });

  it("SHOWS coaching that says an earlier step was done correctly", async () => {
    // THE DEFECT THIS WAS WRITTEN FOR, and it is not hypothetical. What is now split into
    // `SCORING_STEMS` and `VERDICT_PHRASINGS` was one list called `VERDICT_MARKERS`, and it was
    // tested with a bare `includes`, so the marker "correct" matched inside the ADVERB
    // "correctly" and one word threw away a whole reading's coaching — silently, since the
    // pair goes together and nothing recorded the refusal.
    //
    // Measured on the shipped thing: a photograph of `2/3 - 1/3 = 1/0` uploaded against
    // `d1.num-f.l1:practice:7006` came back with *"You subtracted the numerators correctly to
    // get 1, but you wrote 0 in the denominator..."*, which is the feature working. The
    // learner was shown a transcript and nothing else.
    //
    // Naming the step a learner got right is how you point at the one they did not, so this
    // sentence is the coaching layer doing its job rather than grading a page.
    const explanation = `${SAFE_EXPLANATION} You had balanced the earlier lines correctly.`;
    const bag = groundedHarness({ explanation, nextSteps: SAFE_NEXT_STEPS });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.explanation).toBe(explanation);
    expect(parse.nextSteps).toEqual(SAFE_NEXT_STEPS);
    // The response still carries nothing a scorer could read, over prose containing the word.
    const serialized = JSON.stringify(bag.cluster.parses[0]);
    for (const forbidden of [
      "mastery",
      "score",
      "placement",
      "theta",
      "credit",
      "points",
    ]) {
      expect(serialized, `the row carries "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it("DROPS coaching when the reading is unsure, alongside the line it is about", async () => {
    // The same asymmetry the transcript already makes, one step further along. A wrongly
    // localized line costs a learner a glance; three sentences explaining a slip on a line
    // we are not sure we read is a confident account of handwriting that may not be there.
    const bag = groundedHarness(COACHED, {
      readable: true,
      steps: ["3x + 5 = 20", "3x = 25", "x = 25/3"],
      firstQuestionableStep: 1,
      confidence: 0.31,
    });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.outcome).toBe("low_confidence");
    expect(parse.suspectStepIndex).toBeUndefined();
    expect(parse.explanation).toBeUndefined();
    expect(parse.nextSteps).toBeUndefined();
    expect(bag.cluster.parses[0]?.explanation).toBeNull();
  });

  it("DROPS coaching when no line was flagged, so it has nothing to point at", async () => {
    const bag = groundedHarness(COACHED, {
      readable: true,
      steps: ["3x + 5 = 20", "3x = 15"],
      firstQuestionableStep: null,
      confidence: 0.92,
    });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.outcome).toBe("read");
    expect(parse.suspectStepIndex).toBeUndefined();
    expect(parse.explanation).toBeUndefined();
  });

  it("DROPS half a pair, in both directions", () => {
    // An explanation with no actions, and actions with no explanation. Neither is shown: the
    // first tells a learner what went wrong and abandons them there, the second is an
    // instruction from something that appears to have just marked their page.
    const grounding = groundingForItem(GROUNDED?.item_version_id ?? "");
    for (const half of [
      { explanation: SAFE_EXPLANATION },
      { nextSteps: SAFE_NEXT_STEPS },
      { explanation: "   ", nextSteps: SAFE_NEXT_STEPS },
      { explanation: SAFE_EXPLANATION, nextSteps: [] },
    ]) {
      expect(sanitizeCoaching(half, grounding), JSON.stringify(half)).toBeUndefined();
    }
    // And the pair together does survive, so the four above are not passing over a
    // sanitizer that refuses everything.
    expect(sanitizeCoaching(COACHED, grounding)).toEqual({
      explanation: SAFE_EXPLANATION,
      nextSteps: SAFE_NEXT_STEPS,
    });
  });

  it("records WHY it withheld coaching, distinctly per cause", async () => {
    // The three states that were one state before `0015`. A refusal and an empty reply both
    // stored `explanation = null, next_steps = []`, which is also what a page with nothing
    // to coach stores, so "the model gave us nothing" and "we threw away what it gave us"
    // were indistinguishable on the row — see the migration for the day that cost.
    const cases: readonly [string, Record<string, unknown>][] = [
      ["none_offered", { explanation: "", nextSteps: [] }],
      [
        "verdict_language",
        { explanation: "Your final answer is correct.", nextSteps: SAFE_NEXT_STEPS },
      ],
      [
        "answer_key_stated",
        {
          explanation: `Working it through gives ${answerKey()}.`,
          nextSteps: SAFE_NEXT_STEPS,
        },
      ],
    ];
    for (const [reason, coaching] of cases) {
      const bag = groundedHarness(coaching);
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
      expect(bag.cluster.parses[0]?.coaching_withheld_reason, reason).toBe(reason);
      expect(bag.cluster.parses[0]?.explanation, reason).toBeNull();
    }
    // A DISTINCT reason per cause, not one label three times. Without this the column could
    // be hardcoded to a single string and every assertion above would still read green.
    expect(new Set(cases.map(([reason]) => reason)).size).toBe(3);

    // Ungrounded: the model was never asked, which is a different thing from being refused.
    const ungrounded = harness({
      uploads: [uploadRow(STUDENT_A, UPLOAD_A, "d1.no-such-item:practice:0")],
      replies: [readingReply({ ...A_GOOD_READING, ...COACHED })],
    });
    await ungrounded.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(ungrounded.cluster.parses[0]?.coaching_withheld_reason).toBe("no_grounding");

    // And a reading that DID coach records no reason, so the column is not simply always set.
    const shown = groundedHarness(COACHED);
    await shown.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(shown.cluster.parses[0]?.coaching_withheld_reason).toBeNull();
    expect(shown.cluster.parses[0]?.explanation).toBe(SAFE_EXPLANATION);
  });

  it("keeps the reason off the wire, where it would read as censorship", async () => {
    const bag = groundedHarness({
      explanation: "Your final answer is correct.",
      nextSteps: SAFE_NEXT_STEPS,
    });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(JSON.stringify(response.body)).not.toContain("verdict_language");
    expect(Object.keys(wireOf(response))).not.toContain("coachingWithheld");
  });

  it("caps what one reply may put on the screen, to the same numbers 0011 checks", () => {
    const grounding = groundingForItem(GROUNDED?.item_version_id ?? "");
    const coaching = sanitizeCoaching(
      {
        explanation: "ok ".repeat(600),
        nextSteps: ["one", "two", "three", "four", "five"],
      },
      grounding,
    );
    expect(coaching?.explanation).toHaveLength(600);
    expect(coaching?.nextSteps).toHaveLength(3);
  });
});

describe("a wrong or missing reading degrades into something honest", () => {
  it("answers 'we could not read this' when the provider throws, and never a 500", async () => {
    // A throttle, a timeout, a refusal, a provider that has gone away. This is a feedback
    // surface: its failing must cost the learner a sentence, not an error page.
    const bag = harness({
      replies: [
        () => {
          throw new Error("upstream exploded");
        },
      ],
    });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(200);
    const parse = wireOf(response);
    expect(parse.outcome).toBe("unavailable");
    expect(parse.failureReason).toBe("service");
    expect(parse.steps).toEqual([]);
    expect(parse.suspectStepIndex).toBeUndefined();
    expect(parse.headline).toBe("We couldn't read your work this time.");
    expect(parse.caveat).toContain("Your photo is saved");
    // Nothing of the underlying failure reaches the learner.
    expect(JSON.stringify(response.body)).not.toContain("exploded");
    // The attempt is still a row, at zero cost: we do not know whether the provider billed
    // for a call that errored, and a provider erroring in a loop is when a ceiling matters.
    expect(bag.cluster.parses).toHaveLength(1);
    expect(bag.cluster.parses[0]?.outcome).toBe("failed");
    expect(bag.cluster.parses[0]?.cost_micro_usd).toBe(0);
  });

  it("answers 'we couldn't make this out' when the model says it cannot read the page", async () => {
    const bag = harness({
      replies: [readingReply({ readable: false, steps: [], confidence: 0.9 })],
    });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.outcome).toBe("unreadable");
    expect(parse.steps).toEqual([]);
    expect(parse.headline).toBe("We couldn't make out the working in this photo.");
    expect(parse.caveat).toContain("clearer photo");
    // A confident "I cannot read this" and an unsure one are the same outcome; reporting a
    // number beside it would invite a surface to draw a bar over nothing.
    expect(parse.confidence).toBeUndefined();
  });

  it("distinguishes malformed model output from unreadable handwriting", async () => {
    for (const text of [
      "I'm sorry, I can't help with that.",
      "",
      "{ not json",
      "[1,2,3]",
      '{"steps": "3x = 25"}',
    ]) {
      const bag = harness({
        replies: [{ text, usage: { inputTokens: 10, outputTokens: 2 } }],
      });
      const parse = wireOf(
        await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
      );
      expect(parse.outcome, JSON.stringify(text)).toBe("unavailable");
      expect(parse.failureReason, JSON.stringify(text)).toBe("malformed_output");
      expect(parse.steps).toEqual([]);
    }
  });

  it("classifies model-id, access and AWS-auth failures without leaking their messages", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const cases = [
      [
        Object.assign(new Error("model qwen.secret-id is not supported"), {
          name: "ValidationException",
        }),
        "model_id",
      ],
      [
        Object.assign(new Error("role arn:aws:iam::123:role/secret denied"), {
          name: "AccessDeniedException",
        }),
        "access",
      ],
      [
        Object.assign(new Error("credential AKIA-DO-NOT-LEAK"), {
          name: "InvalidSignatureException",
        }),
        "auth",
      ],
    ] as const;
    for (const [failure, expected] of cases) {
      const bag = harness({
        replies: [
          () => {
            throw failure;
          },
        ],
      });
      const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
      const parse = wireOf(response);
      expect(parse.failureReason, failure.name).toBe(expected);
      expect(JSON.stringify(response.body), failure.name).not.toContain(failure.message);
      expect(classifyVisionFailure(failure), failure.name).toBe(expected);
    }
    const logText = JSON.stringify(logged.mock.calls);
    for (const [failure] of cases) {
      expect(logText, failure.name).not.toContain(failure.message);
    }
    expect(logText).toContain("failureReason");
    logged.mockRestore();
  });

  it("KEEPS the transcript and DROPS the localization when the model is unsure", async () => {
    // The asymmetry this route is built around. "Here is roughly what we read" is
    // recoverable; "your mistake is on line 3", said wrongly about a learner's own
    // handwriting, is not. So the pointer is the first thing to go.
    const bag = harness({
      replies: [
        readingReply({
          readable: true,
          steps: ["3x + 5 = 20", "3x = 25", "x = 25/3"],
          firstQuestionableStep: 1,
          confidence: 0.31,
        }),
      ],
    });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.outcome).toBe("low_confidence");
    expect(parse.steps).toHaveLength(3);
    expect(parse.suspectStepIndex).toBeUndefined();
    expect(parse.headline).toBe(
      "Here's our best guess at what you wrote, and we're not confident.",
    );
    expect(parse.caveat).toContain("left out which line");
    // The stored row agrees, so a re-open shows the same hedge rather than the raw reading.
    expect(bag.cluster.parses[0]?.outcome).toBe("low_confidence");
    expect(bag.cluster.parses[0]?.suspect_step_index).toBeNull();
  });

  it("treats an unstated confidence as an unsure one", async () => {
    // A model that did not answer the question is not evidence that it was sure.
    const bag = harness({
      replies: [
        readingReply({ readable: true, steps: ["x = 4"], firstQuestionableStep: 0 }),
      ],
    });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.outcome).toBe("low_confidence");
    expect(parse.suspectStepIndex).toBeUndefined();
  });

  it("refuses a photo the provider could not accept, without spending anything", async () => {
    const bag = harness({ bytes: new Uint8Array(MAX_VISION_IMAGE_BYTES + 1) });
    const parse = wireOf(
      await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A }),
    );
    expect(parse.outcome).toBe("unavailable");
    expect(parse.failureReason).toBe("upload");
    expect(bag.model.calls).toHaveLength(0);
    expect(bag.cluster.parses[0]?.cost_micro_usd).toBe(0);
  });

  it("404s when the row is there and the object is gone", async () => {
    const bag = harness();
    bag.objects.objects.delete(objectKey(STUDENT_A, UPLOAD_A));
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(404);
    expect(bag.model.calls).toHaveLength(0);
  });
});

describe("what a model may put on a learner's screen is bounded", () => {
  const threshold = DEFAULT_WORK_UPLOAD_PARSE_LIMITS.lowConfidenceThreshold;

  it("strips control characters and bidi overrides out of every step", () => {
    const parse = readModelReply(
      JSON.stringify({
        readable: true,
        steps: ["3x\u0000 = \u202e25\u202c", "  x  =  25/3  "],
        confidence: 0.9,
      }),
      "p",
      "m",
      threshold,
    );
    expect(parse.steps).toEqual(["3x = 25", "x = 25/3"]);
  });

  it("caps the count and the length, because a page of working is neither long nor 400 lines", () => {
    const parse = readModelReply(
      JSON.stringify({
        readable: true,
        steps: [
          "x".repeat(1000),
          ...Array.from({ length: 400 }, (_, index) => `step ${index}`),
        ],
        confidence: 0.9,
      }),
      "p",
      "m",
      threshold,
    );
    expect(parse.steps).toHaveLength(20);
    expect(parse.steps[0]).toHaveLength(240);
  });

  it("drops a suspect index that does not point at a step", () => {
    for (const firstQuestionableStep of [5, -1, 1.5, "two", null]) {
      const parse = readModelReply(
        JSON.stringify({
          readable: true,
          steps: ["a", "b"],
          firstQuestionableStep,
          confidence: 0.9,
        }),
        "p",
        "m",
        threshold,
      );
      expect(parse.outcome, String(firstQuestionableStep)).toBe("read");
      expect(parse.suspectStepIndex, String(firstQuestionableStep)).toBeUndefined();
    }
  });

  it("reads a fenced reply, which is the one deviation worth tolerating", () => {
    const parse = readModelReply(
      '```json\n{"readable":true,"steps":["x = 4"],"confidence":0.95}\n```',
      "p",
      "m",
      threshold,
    );
    expect(parse.outcome).toBe("read");
    expect(parse.steps).toEqual(["x = 4"]);
  });

  it("reads a confidence on a 0-100 scale as the fraction the model meant", () => {
    const parse = readModelReply(
      JSON.stringify({ readable: true, steps: ["x = 4"], confidence: 88 }),
      "p",
      "m",
      threshold,
    );
    expect(parse.outcome).toBe("read");
    expect(parse.confidence).toBeCloseTo(0.88);
  });
});

describe("the spend is bounded before the call, not counted after it", () => {
  it("reuses a stored reading instead of paying to read the same photo twice", async () => {
    const bag = harness({ parses: [parseRow(STUDENT_A, UPLOAD_A, { secondsAgo: 30 })] });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(200);
    expect((response.body as { cached: boolean }).cached).toBe(true);
    expect(wireOf(response).steps).toEqual(["a", "b"]);
    expect(wireOf(response).provisional).toBe(true);
    // The whole point: no call, no row, no money.
    expect(bag.model.calls).toHaveLength(0);
    expect(bag.cluster.parses).toHaveLength(1);
  });

  it("does not reuse a failure, so a bad photo can be re-taken and a blip retried", async () => {
    for (const outcome of ["unreadable", "failed"]) {
      const bag = harness({
        parses: [parseRow(STUDENT_A, UPLOAD_A, { secondsAgo: 30, outcome })],
      });
      const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
      expect((response.body as { cached: boolean }).cached, outcome).toBe(false);
      expect(bag.model.calls, outcome).toHaveLength(1);
    }
  });

  it("stops one learner at their daily count, without calling the model", async () => {
    const bag = harness({
      limits: { maxAttemptsPerStudent: 3 },
      parses: [
        parseRow(STUDENT_A, UPLOAD_B, { secondsAgo: 100, outcome: "failed" }),
        parseRow(STUDENT_A, UPLOAD_B, { secondsAgo: 200, outcome: "failed" }),
        parseRow(STUDENT_A, UPLOAD_B, { secondsAgo: 300, outcome: "failed" }),
      ],
      uploads: [uploadRow(STUDENT_A, UPLOAD_A), uploadRow(STUDENT_A, UPLOAD_B)],
    });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(429);
    expect(String((response.body as { error: string }).error)).toContain("3 photos");
    expect(bag.model.calls).toHaveLength(0);
  });

  it("counts only attempts inside the window, so the limit is a rate and not a total", async () => {
    // Three attempts, all older than the window. The learner is not blocked.
    const bag = harness({
      limits: { maxAttemptsPerStudent: 3, windowSeconds: 3600 },
      parses: [
        parseRow(STUDENT_A, UPLOAD_B, { secondsAgo: 4000, outcome: "failed" }),
        parseRow(STUDENT_A, UPLOAD_B, { secondsAgo: 5000, outcome: "failed" }),
        parseRow(STUDENT_A, UPLOAD_B, { secondsAgo: 6000, outcome: "failed" }),
      ],
      uploads: [uploadRow(STUDENT_A, UPLOAD_A), uploadRow(STUDENT_A, UPLOAD_B)],
    });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(200);
    expect(bag.model.calls).toHaveLength(1);
  });

  it("does not let one learner's attempts count against another's limit", async () => {
    const bag = harness({
      limits: { maxAttemptsPerStudent: 1 },
      parses: [parseRow(STUDENT_B, UPLOAD_B, { secondsAgo: 100, outcome: "failed" })],
      uploads: [uploadRow(STUDENT_A, UPLOAD_A), uploadRow(STUDENT_B, UPLOAD_B)],
    });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(200);
  });

  it("stops the whole feature at the account's daily dollar ceiling", async () => {
    // THE CAP THE OWNER ASKED FOR, and it is a cap rather than a rate limit because it is
    // denominated in money: two learners spending it between them is the same stop.
    const bag = harness({
      limits: { budgetMicroUsd: 20_000 },
      parses: [
        parseRow(STUDENT_B, UPLOAD_B, { secondsAgo: 100, costMicroUsd: 13_800 }),
        parseRow(STUDENT_B, UPLOAD_B, { secondsAgo: 200, costMicroUsd: 6_300 }),
      ],
      uploads: [uploadRow(STUDENT_A, UPLOAD_A), uploadRow(STUDENT_B, UPLOAD_B)],
    });
    const response = await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(429);
    expect(String((response.body as { error: string }).error)).toContain(
      "paused for today",
    );
    expect(bag.model.calls).toHaveLength(0);
    // And the learner is told their photo is still safe, because it is.
    expect(String((response.body as { error: string }).error)).toContain("saved");
  });

  it("lets a call through while the ceiling has room, so the stop above is the cap", async () => {
    // Without this, a budget of zero would make the case above pass for the wrong reason.
    const bag = harness({
      limits: { budgetMicroUsd: 20_001 },
      parses: [
        parseRow(STUDENT_B, UPLOAD_B, { secondsAgo: 100, costMicroUsd: 13_800 }),
        parseRow(STUDENT_B, UPLOAD_B, { secondsAgo: 200, costMicroUsd: 6_200 }),
      ],
      uploads: [uploadRow(STUDENT_A, UPLOAD_A), uploadRow(STUDENT_B, UPLOAD_B)],
    });
    expect(
      (await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A })).status,
    ).toBe(200);
  });

  it("forgets spend that has fallen out of the window", async () => {
    const bag = harness({
      limits: { budgetMicroUsd: 1, windowSeconds: 3600 },
      parses: [parseRow(STUDENT_B, UPLOAD_B, { secondsAgo: 7200, costMicroUsd: 999_999 })],
      uploads: [uploadRow(STUDENT_A, UPLOAD_A), uploadRow(STUDENT_B, UPLOAD_B)],
    });
    expect(
      (await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A })).status,
    ).toBe(200);
  });

  it("caps the output tokens it will pay for on every call", async () => {
    const bag = harness();
    await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(bag.model.calls[0]?.maxOutputTokens).toBe(
      DEFAULT_WORK_UPLOAD_PARSE_LIMITS.maxOutputTokens,
    );
    expect(DEFAULT_WORK_UPLOAD_PARSE_LIMITS.maxOutputTokens).toBeLessThanOrEqual(2000);
  });

  it("gives the provider a deadline inside the edge's own", async () => {
    // API Gateway's HTTP API integration timeout is 30s; ours has to be under it or a slow
    // model becomes a gateway error the browser cannot tell from an outage.
    const bag = harness();
    await bag.service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(bag.model.calls[0]?.signal).toBeDefined();
    expect(bag.model.calls[0]?.signal?.aborted).toBe(false);
    expect(DEFAULT_WORK_UPLOAD_PARSE_LIMITS.modelTimeoutMs).toBeLessThan(30_000);
  });

  it("ships defaults that bound the monthly bill at a number somebody chose", () => {
    // The defaults are the cap, on any deployment that does not override them. $2/day is
    // about $60/month at the ceiling — stated here so a change to it is a change to a test.
    expect(DEFAULT_WORK_UPLOAD_PARSE_LIMITS.budgetMicroUsd).toBe(2_000_000);
    expect(DEFAULT_WORK_UPLOAD_PARSE_LIMITS.maxAttemptsPerStudent).toBe(10);
    expect(DEFAULT_WORK_UPLOAD_PARSE_LIMITS.windowSeconds).toBe(86_400);
  });
});

describe("the route is mounted and gated", () => {
  it("serves POST /api/work-upload/parse and 401s it without a token", async () => {
    const bag = harness();
    const app = createDiagnosticApi({
      getServer: () => ({ handle: async () => ({ status: 200, body: {} }) }),
      getWorkUploadParse: () => bag.service,
    });
    const table = app.routes
      .filter((route) => route.method !== "ALL" && route.path.includes("work-upload"))
      .map((route) => `${route.method} ${route.path}`)
      .sort();
    expect(table).toEqual(["POST /api/work-upload/parse"]);

    const anonymous = await app.request("/api/work-upload/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uploadId: UPLOAD_A }),
    });
    expect(anonymous.status).toBe(401);

    const verified = await app.request("/api/work-upload/parse", {
      method: "POST",
      headers: {
        authorization: `Bearer jwt:${STUDENT_A}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ uploadId: UPLOAD_A }),
    });
    expect(verified.status).toBe(200);
    expect((await verified.json()).parse.provisional).toBe(true);
  });

  it("answers an unapplied 0010 with the command that applies it", async () => {
    const bag = harness();
    const exploding = {
      ...bag.cluster.db,
      query: async (sql: string) => {
        if (sql.includes("work_upload_parse")) {
          throw new Error('relation "public.work_upload_parse" does not exist');
        }
        return [uploadRow(STUDENT_A, UPLOAD_A)] as never;
      },
    };
    const service = createWorkUploadParseService({
      db: exploding,
      authenticate,
      objects: bag.objects,
      model: bag.model,
      prices: { inputUsdPerMillionTokens: 3, outputUsdPerMillionTokens: 15 },
    });
    const response = await service.parse(`jwt:${STUDENT_A}`, { uploadId: UPLOAD_A });
    expect(response.status).toBe(500);
    expect(String((response.body as { error: string }).error)).toContain(
      "node db/apply.mjs",
    );
  });
});
