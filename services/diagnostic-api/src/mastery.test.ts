import type { DataApiExecutor } from "@cr/db";
import { type FrozenItem, PRACTICE_AUTHORITY_ITEMS_BY_ID } from "@cr/item-bank";
import { PRACTICE_SET_SIZE } from "@cr/mastery-service";
import { describe, expect, it } from "vitest";

import {
  createAuroraMasteryService,
  MASTERY_WRITE_STATEMENTS,
  parseEvidenceSubmission,
} from "./mastery";
import { loadCityFromAurora } from "./reads";
import { createFakeCluster } from "./test/fakeCluster";

/**
 * **THE CLAIM THIS LANE MAKES IS THAT THE BROWSER CANNOT SAY WHAT A LEARNER KNOWS**, and
 * this file is where that is measured rather than asserted in a docblock.
 *
 * `POST /api/city` refuses to persist a learning record because its body is composed by the
 * browser. These two routes accept a body composed by the browser and persist a learning
 * record anyway, so the difference has to be real: the body carries RAW ANSWERS, correctness
 * is recomputed here against the frozen bank, and every route by which a client could smuggle
 * a verdict past that recompute is closed below.
 *
 * The population is derived from the bank rather than written down: whichever node happens to
 * hold five practice items is the one these cases use, so a pool that is renumbered or
 * re-seeded does not quietly leave this file testing an empty set.
 */

const STUDENT = "11111111-1111-4111-8111-111111111111";
const OTHER_STUDENT = "22222222-2222-4222-8222-222222222222";

const BY_NODE = new Map<string, FrozenItem[]>();
for (const item of PRACTICE_AUTHORITY_ITEMS_BY_ID.values()) {
  const list = BY_NODE.get(item.node_id) ?? [];
  list.push(item);
  BY_NODE.set(item.node_id, list);
}

function balancedSet(items: readonly FrozenItem[]): FrozenItem[] {
  return [
    ...items.filter((item) => item.difficulty === 1).slice(0, 1),
    ...items.filter((item) => item.difficulty === 2).slice(0, 2),
    ...items.filter((item) => item.difficulty === 3).slice(0, 2),
  ];
}

const NODES = [...BY_NODE.entries()]
  .filter(([, items]) => balancedSet(items).length === PRACTICE_SET_SIZE)
  .sort(([a], [b]) => (a < b ? -1 : 1));

const first = NODES[0];
const second = NODES[1];
if (first === undefined || second === undefined) {
  throw new Error("the practice bank must hold two nodes with a full set to test against");
}
const [NODE_ID, NODE_ITEMS] = first;
const [OTHER_NODE_ID, OTHER_ITEMS] = second;
const SET = balancedSet(NODE_ITEMS);
const SAME_DIFFICULTY_SET = [1, 2, 3]
  .map((difficulty) =>
    NODE_ITEMS.filter((item) => item.difficulty === difficulty).slice(0, PRACTICE_SET_SIZE),
  )
  .find((items) => items.length === PRACTICE_SET_SIZE);
if (SAME_DIFFICULTY_SET === undefined) {
  throw new Error(
    "the practice bank must hold five same-difficulty items for an attack test",
  );
}

function response(item: FrozenItem, raw: unknown, over: Record<string, unknown> = {}) {
  return {
    item_id: item.item_version_id,
    item_version: 1,
    raw_answer: raw,
    hints_used: 0,
    revealed: false,
    attempt: 1,
    time_on_item_ms: 1_000,
    ...over,
  };
}

/** Five right answers, taken from each item's own authored key. */
function allCorrect(over: Record<string, unknown> = {}) {
  return SET.map((item) => response(item, item.answer.answer_key, over));
}

/** Five answers that are not the key, so the recompute has to score them wrong. */
function allWrong() {
  return SET.map((item) => response(item, "not the answer at all"));
}

function service(cluster = createFakeCluster()) {
  return {
    cluster,
    mastery: createAuroraMasteryService({
      db: cluster.db,
      authenticate: async (token) => (token === "jwt" ? { student_id: STUDENT } : null),
    }),
  };
}

function submission(responses: unknown[], over: Record<string, unknown> = {}) {
  return {
    node_id: NODE_ID,
    evidence_id: "evidence-1",
    context: "lesson",
    responses,
    ...over,
  };
}

describe("the mastery route scores the answers rather than believing the client", () => {
  it("derives a real population from the bank", () => {
    // A floor, because every case below draws from these and containment over an empty
    // set is the way this file would go green while measuring nothing.
    expect(SET).toHaveLength(PRACTICE_SET_SIZE);
    expect(OTHER_ITEMS.length).toBeGreaterThan(0);
    expect(OTHER_NODE_ID).not.toBe(NODE_ID);
    expect(SET.map((item) => item.difficulty)).toEqual([1, 2, 2, 3, 3]);
    expect(SAME_DIFFICULTY_SET).toHaveLength(PRACTICE_SET_SIZE);
    for (const item of SET) {
      expect(item.node_id).toBe(NODE_ID);
    }
  });

  it("records the mastery five right answers earn, and the evidence behind it", async () => {
    const { cluster, mastery } = service();

    const result = await mastery.submitEvidence("jwt", submission(allCorrect()));

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ node_id: NODE_ID, mastery: 3, changed: true });
    expect(cluster.tables.student_node_state).toHaveLength(1);
    expect(cluster.tables.student_node_state[0]).toMatchObject({
      student_id: STUDENT,
      node_id: NODE_ID,
      mastery: 3,
      // Generated over `mastery` by the database; the writer never names it.
      completion_status: "complete",
      lesson_stage: "done",
    });
    expect(cluster.tables.student_node_state[0]?.last_practiced_at).not.toBeNull();
    expect(cluster.tables.mastery_evidence).toHaveLength(1);
    expect(cluster.tables.mastery_evidence[0]).toMatchObject({
      evidence_id: "evidence-1",
      student_id: STUDENT,
      node_id: NODE_ID,
      mastery: 3,
      changed: true,
    });
    expect(cluster.tables.raw_response_log).toHaveLength(PRACTICE_SET_SIZE);
    expect(
      cluster.tables.raw_response_log.map((row) => ({
        student_id: row.student_id,
        evidence_id: row.evidence_id,
        node_id: row.node_id,
        difficulty: row.difficulty,
        context: row.context,
        revealed: row.revealed,
      })),
    ).toEqual(
      SET.map((item) => ({
        student_id: STUDENT,
        evidence_id: "evidence-1",
        node_id: NODE_ID,
        difficulty: item.difficulty,
        context: "lesson",
        revealed: false,
      })),
    );
    expect(
      new Set(cluster.tables.raw_response_log.map((row) => row.response_id)).size,
    ).toBe(PRACTICE_SET_SIZE);
  });

  it("returns persisted gold mastery and finished lesson state to a new city read", async () => {
    const { cluster, mastery } = service();
    await mastery.submitEvidence("jwt", submission(allCorrect()));

    const city = await loadCityFromAurora(cluster.db, STUDENT);
    const refreshed = city.node_states.find((state) => state.node_id === NODE_ID);

    expect(refreshed).toMatchObject({
      student_id: STUDENT,
      node_id: NODE_ID,
      mastery: 3,
      completion_status: "complete",
      lesson_stage: "done",
    });
    expect(refreshed?.mastery_updated_at).not.toBeNull();
    expect(refreshed?.last_practiced_at).not.toBeNull();
  });

  it("scores wrong answers as wrong, whatever the body would like", async () => {
    const { cluster, mastery } = service();

    const result = await mastery.submitEvidence("jwt", submission(allWrong()));

    expect(result.status).toBe(200);
    // The floor a resolved set leaves, not the bar: five wrong answers still evidence that
    // the learner worked the set, and nothing more.
    expect(result.body).toMatchObject({ mastery: 1 });
    expect(cluster.tables.student_node_state[0]).toMatchObject({
      mastery: 1,
      completion_status: "in_progress",
    });
  });

  it("persists mastery 2 for four server-verified answers out of five", async () => {
    const { cluster, mastery } = service();
    const fourCorrect = allCorrect();
    fourCorrect[4] = response(SET[4] as FrozenItem, "not the answer");

    const result = await mastery.submitEvidence("jwt", submission(fourCorrect));

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      node_id: NODE_ID,
      mastery: 2,
      changed: true,
      completion_status: "complete",
    });
    expect(cluster.tables.student_node_state[0]).toMatchObject({
      mastery: 2,
      lesson_stage: "done",
    });
  });

  it("rolls back the receipt, raw responses, and node row when finalization fails", async () => {
    const cluster = createFakeCluster();
    const db = {
      ...cluster.db,
      withTransaction: <T>(run: (tx: DataApiExecutor) => Promise<T>): Promise<T> =>
        cluster.db.withTransaction((tx) =>
          run({
            ...tx,
            execute: async (sql, params) => {
              if (sql === MASTERY_WRITE_STATEMENTS.finalizePractice) {
                throw new Error("injected finalization failure");
              }
              return tx.execute(sql, params);
            },
          }),
        ),
    };
    const mastery = createAuroraMasteryService({
      db,
      authenticate: async () => ({ student_id: STUDENT }),
    });

    const result = await mastery.submitEvidence("jwt", submission(allCorrect()));

    expect(result.status).toBe(500);
    expect(cluster.tables.mastery_evidence).toEqual([]);
    expect(cluster.tables.raw_response_log).toEqual([]);
    expect(cluster.tables.student_node_state).toEqual([]);
  });

  it("refuses a body that carries its own verdict instead of quietly dropping it", async () => {
    // Silently ignoring the field is the dangerous answer: the sender goes on believing a
    // grade it supplied was honoured, and everything downstream of the sender inherits a
    // number the server never checked.
    for (const field of ["correct", "client_correct", "mastery", "score"]) {
      const { cluster, mastery } = service();
      const tainted = allCorrect({ [field]: true });

      const result = await mastery.submitEvidence("jwt", submission(tainted));

      expect(result.status, `${field} on the wire`).toBe(400);
      expect(String((result.body as { error: string }).error)).toContain(field);
      expect(cluster.tables.student_node_state).toEqual([]);
      expect(cluster.tables.mastery_evidence).toEqual([]);
    }
  });

  it("refuses a body that tries to choose the authenticated student", async () => {
    const { cluster, mastery } = service();

    const result = await mastery.submitEvidence(
      "jwt",
      submission(allCorrect(), { student_id: OTHER_STUDENT }),
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: "student_id comes from authentication" });
    expect(cluster.tables.student_node_state).toEqual([]);
    expect(cluster.tables.mastery_evidence).toEqual([]);
  });

  it("never counts a revealed slot, however right the answer on it is", async () => {
    const { cluster, mastery } = service();

    const result = await mastery.submitEvidence(
      "jwt",
      submission(allCorrect({ revealed: true })),
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ mastery: 1 });
    expect(cluster.tables.raw_response_log).toHaveLength(PRACTICE_SET_SIZE);
    expect(cluster.tables.raw_response_log.every((row) => row.revealed === true)).toBe(
      true,
    );
  });

  it("refuses a set of items that belong to another node", async () => {
    // Without this the easiest node in the bank would evidence mastery of the hardest: the
    // recompute passes every answer, and nothing else looks at where the items came from.
    const { cluster, mastery } = service();
    const borrowed = [
      ...OTHER_ITEMS.slice(0, 1).map((item) => response(item, item.answer.answer_key)),
      ...allCorrect().slice(1),
    ];

    const result = await mastery.submitEvidence("jwt", submission(borrowed));

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "evidence_node_mismatch" });
    expect(cluster.tables.student_node_state).toEqual([]);
  });

  it("refuses duplicate slots instead of letting one easy item impersonate a set", async () => {
    const { cluster, mastery } = service();
    const repeated = Array.from({ length: PRACTICE_SET_SIZE }, () => allCorrect()[0]);

    const result = await mastery.submitEvidence("jwt", submission(repeated));

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "evidence_slot_duplicate" });
    expect(cluster.tables.student_node_state).toEqual([]);
  });

  it("refuses five unique items that do not have the authored difficulty mix", async () => {
    const { cluster, mastery } = service();
    const unbalanced = SAME_DIFFICULTY_SET.map((item) =>
      response(item, item.answer.answer_key),
    );

    const result = await mastery.submitEvidence("jwt", submission(unbalanced));

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "evidence_set_shape" });
    expect(cluster.tables.student_node_state).toEqual([]);
  });

  it("refuses an item the bank does not have, rather than scoring it wrong", async () => {
    const { mastery } = service();
    const invented = [
      { ...allCorrect()[0], item_id: "no-such-item:A:1" },
      ...allCorrect().slice(1),
    ];

    const result = await mastery.submitEvidence("jwt", submission(invented));

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "evidence_item_unknown" });
  });

  it("replays one evidence_id instead of scoring the same set twice", async () => {
    const { cluster, mastery } = service();

    const first = await mastery.submitEvidence("jwt", submission(allCorrect()));
    const replay = await mastery.submitEvidence("jwt", submission(allCorrect()));

    expect(first.body).toMatchObject({ mastery: 3, changed: true });
    // `changed: false` is the load-bearing half: it is what stops the city awarding a
    // second promotion for one practice set.
    expect(replay.body).toMatchObject({ mastery: 3, changed: false });
    expect(cluster.tables.mastery_evidence).toHaveLength(1);
    expect(cluster.tables.raw_response_log).toHaveLength(PRACTICE_SET_SIZE);
  });

  it("returns one changed receipt when the same evidence races itself", async () => {
    const { cluster, mastery } = service();

    const results = await Promise.all([
      mastery.submitEvidence("jwt", submission(allCorrect())),
      mastery.submitEvidence("jwt", submission(allCorrect())),
    ]);

    expect(
      results.map((result) => (result.body as { changed: boolean }).changed).sort(),
    ).toEqual([false, true]);
    expect(cluster.tables.mastery_evidence).toHaveLength(1);
    expect(cluster.tables.student_node_state).toHaveLength(1);
  });

  it("never lowers a mastery a learner has already evidenced", async () => {
    const { cluster, mastery } = service();

    await mastery.submitEvidence("jwt", submission(allCorrect()));
    const firstState = { ...cluster.tables.student_node_state[0] };
    const worse = await mastery.submitEvidence(
      "jwt",
      submission(allWrong(), { evidence_id: "evidence-2" }),
    );

    expect(worse.body).toMatchObject({ mastery: 3, changed: false });
    expect(cluster.tables.student_node_state[0]).toMatchObject({ mastery: 3 });
    expect(cluster.tables.student_node_state[0]?.mastery_updated_at).toBe(
      firstState.mastery_updated_at,
    );
    expect(Number(cluster.tables.student_node_state[0]?.last_practiced_at)).toBeGreaterThan(
      Number(firstState.last_practiced_at),
    );
    expect(cluster.tables.student_node_state[0]?.lesson_stage).toBe("done");
  });

  it("rejects another student reusing an owned evidence id without touching their state", async () => {
    const cluster = createFakeCluster();
    const mine = createAuroraMasteryService({
      db: cluster.db,
      authenticate: async () => ({ student_id: STUDENT }),
    });
    const theirs = createAuroraMasteryService({
      db: cluster.db,
      authenticate: async () => ({ student_id: OTHER_STUDENT }),
    });

    await mine.submitEvidence("jwt", submission(allCorrect()));
    const other = await theirs.submitEvidence("jwt", submission(allWrong()));

    expect(other.status).toBe(409);
    expect(other.body).toEqual({ error: "evidence_owner_mismatch" });
    expect(cluster.tables.student_node_state).toHaveLength(1);
    expect(cluster.tables.raw_response_log).toHaveLength(PRACTICE_SET_SIZE);
    expect(
      cluster.tables.student_node_state.find((row) => row.student_id === STUDENT),
    ).toMatchObject({ mastery: 3 });
  });

  it("rejects reusing an evidence id for another node without materializing that node", async () => {
    const { cluster, mastery } = service();
    await mastery.submitEvidence("jwt", submission(allCorrect()));
    const otherSet = balancedSet(OTHER_ITEMS);

    const result = await mastery.submitEvidence(
      "jwt",
      submission(
        otherSet.map((item) => response(item, item.answer.answer_key)),
        { node_id: OTHER_NODE_ID },
      ),
    );

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ error: "evidence_node_conflict" });
    expect(cluster.tables.student_node_state).toHaveLength(1);
    expect(cluster.tables.raw_response_log).toHaveLength(PRACTICE_SET_SIZE);
    expect(cluster.tables.student_node_state[0]?.node_id).toBe(NODE_ID);
  });

  it("401s an unverified caller before it looks at the body", async () => {
    const { cluster, mastery } = service();

    const result = await mastery.submitEvidence(null, submission(allCorrect()));

    expect(result.status).toBe(401);
    expect(cluster.issued).toEqual([]);
  });

  it("400s a set that is not exactly the practice-set size", async () => {
    const { mastery } = service();

    const short = await mastery.submitEvidence("jwt", submission(allCorrect().slice(0, 3)));

    // A 400 naming the length, not the 500 `masteryFromCorrectCount`'s throw would produce.
    expect(short.status).toBe(400);
    expect(String((short.body as { error: string }).error)).toContain(
      String(PRACTICE_SET_SIZE),
    );
  });
});

describe("the lesson-stage route advances the lesson lane's own column", () => {
  it("advances a node with no row yet, which is every learner who skipped the diagnostic", async () => {
    // The exact starting state that produced the outage: `student_node_state` empty, so an
    // UPDATE alone would have written nothing and reported success.
    const { cluster, mastery } = service();

    const result = await mastery.setLessonStage("jwt", {
      node_id: NODE_ID,
      lesson_stage: "practice",
    });

    expect(result.status).toBe(200);
    expect(cluster.tables.student_node_state).toHaveLength(1);
    expect(cluster.tables.student_node_state[0]).toMatchObject({
      student_id: STUDENT,
      node_id: NODE_ID,
      lesson_stage: "practice",
      // Untouched: the stage write is the lesson lane's and says nothing about mastery.
      mastery: 0,
    });
  });

  it("never drags a built skill backwards when its lesson is revisited", async () => {
    const { cluster, mastery } = service();

    await mastery.setLessonStage("jwt", { node_id: NODE_ID, lesson_stage: "done" });
    const revisit = await mastery.setLessonStage("jwt", {
      node_id: NODE_ID,
      lesson_stage: "teaching",
    });

    expect(revisit.status).toBe(200);
    expect(cluster.tables.student_node_state[0]).toMatchObject({ lesson_stage: "done" });
  });

  it("400s a stage outside the enum and 401s an unverified caller", async () => {
    const { cluster, mastery } = service();

    expect(
      (await mastery.setLessonStage("jwt", { node_id: NODE_ID, lesson_stage: "built" }))
        .status,
    ).toBe(400);
    expect(
      (await mastery.setLessonStage(null, { node_id: NODE_ID, lesson_stage: "done" }))
        .status,
    ).toBe(401);
    expect(cluster.tables.student_node_state).toEqual([]);
  });
});

describe("the body parser is the same gate the route uses", () => {
  it("names the verdict field it refused", () => {
    const parsed = parseEvidenceSubmission(submission(allCorrect({ correct: true })));
    expect("error" in parsed && parsed.error).toContain("correct");
  });

  it("accepts a well-formed body", () => {
    const parsed = parseEvidenceSubmission(submission(allCorrect()));
    expect("submission" in parsed).toBe(true);
  });
});
