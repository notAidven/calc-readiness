import { describe, expect, it } from "vitest";

import {
  attemptCost,
  emptyStruggleRecord,
  hasDemonstratedCommand,
  readStruggleLevels,
  readStruggleRecord,
  recordStruggleAttempt,
  SETTLED_ATTEMPTS,
  STRUGGLE_RING_SIZE,
  type StruggleAttempt,
  type StruggleStorage,
  struggleLevelOf,
  struggleStorageKey,
  struggleTierOf,
} from "./struggleStore";

function fakeStorage(seed: Record<string, string> = {}): {
  storage: StruggleStorage;
  entries: Map<string, string>;
} {
  const entries = new Map(Object.entries(seed));
  return {
    entries,
    storage: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => {
        entries.set(key, value);
      },
    },
  };
}

function attempt(over: Partial<StruggleAttempt> = {}): StruggleAttempt {
  return {
    nodeId: "NUM.F",
    // The shape grain is exercised in `templateStruggle.test.ts`; these cases are about the
    // NODE level, so they all report one shape and the buckets stay out of the way.
    templateId: "d1.num-f.l1",
    difficulty: 1,
    correct: true,
    firstTry: true,
    revealed: false,
    hintsUsed: 0,
    ...over,
  };
}

const CLEAN = attempt();
const AFTER_A_MISS = attempt({ firstTry: false });
const MISSED = attempt({ correct: false, firstTry: false });
const GAVE_UP = attempt({ correct: false, firstTry: false, revealed: true });

describe("what one attempt is worth as evidence", () => {
  it("orders the four outcomes, which is the part the level depends on", () => {
    // The exact figures are tuning; the ORDER is the claim, so it is asserted as an order
    // rather than as four equalities that would all have to be edited to retune.
    expect(attemptCost(CLEAN)).toBeLessThan(attemptCost(AFTER_A_MISS));
    expect(attemptCost(AFTER_A_MISS)).toBeLessThan(attemptCost(MISSED));
    expect(attemptCost(MISSED)).toBeLessThan(attemptCost(GAVE_UP));
    // And the ends are pinned, because the payout scales on them.
    expect(attemptCost(CLEAN)).toBe(0);
    expect(attemptCost(GAVE_UP)).toBe(1);
  });

  it("counts a hinted correct as a stumble even when it was the first answer", () => {
    // A hint is help, and the outcome this store exists to tell apart from an independent
    // correct is "got there with help". `firstTry` alone cannot see that.
    expect(attemptCost(attempt({ hintsUsed: 1 }))).toBe(attemptCost(AFTER_A_MISS));
  });
});

describe("the record moves with the learner", () => {
  it("starts a node at solid rather than at unknown", () => {
    // An untouched node must not read as a weak one: the drill would then favour skills
    // nobody has any evidence about, which is the opposite of what this is for.
    const level = struggleLevelOf(emptyStruggleRecord("NUM.F"));
    expect(level).toBe(0);
    expect(struggleTierOf(level)).toBe("solid");
  });

  it("walks a node from solid to struggling and back on outcomes alone", () => {
    const { storage } = fakeStorage();
    for (let round = 0; round < 6; round += 1) {
      recordStruggleAttempt(GAVE_UP, storage);
    }
    expect(struggleTierOf(struggleLevelOf(readStruggleRecord("NUM.F", storage)))).toBe(
      "struggling",
    );

    // The ring is what makes recovery possible: enough clean attempts push the failures
    // out of the window, with no decay rule and no clock involved.
    for (let round = 0; round < STRUGGLE_RING_SIZE; round += 1) {
      recordStruggleAttempt(CLEAN, storage);
    }
    const recovered = readStruggleRecord("NUM.F", storage);
    expect(struggleLevelOf(recovered)).toBe(0);
    expect(struggleTierOf(struggleLevelOf(recovered))).toBe("solid");
  });

  it("passes through shaky rather than jumping between the two ends", () => {
    // A tier the data can never land in is a tier that does not exist, and the drill's
    // middle weight and the chip's quieter label both key on this one.
    const { storage } = fakeStorage();
    recordStruggleAttempt(GAVE_UP, storage);
    recordStruggleAttempt(CLEAN, storage);
    recordStruggleAttempt(CLEAN, storage);
    expect(struggleTierOf(struggleLevelOf(readStruggleRecord("NUM.F", storage)))).toBe(
      "shaky",
    );
  });

  it("bounds the ring, so an endless drill cannot grow the entry without limit", () => {
    const { storage, entries } = fakeStorage();
    for (let round = 0; round < STRUGGLE_RING_SIZE * 4; round += 1) {
      recordStruggleAttempt(round % 2 === 0 ? CLEAN : MISSED, storage);
    }
    const record = readStruggleRecord("NUM.F", storage);
    expect(record.ring).toHaveLength(STRUGGLE_RING_SIZE);
    // The lifetime counters are NOT bounded, and that is the point of keeping both: the
    // ring answers "how are they doing now", the counters answer "how much have they done".
    expect(record.firstTryCorrect + record.incorrect).toBe(STRUGGLE_RING_SIZE * 4);

    // **READ OFF THE STORED BLOB, NOT OFF THE PARSED RECORD**, and the difference is not
    // pedantry. The parse trims to the ring size too, so an unbounded WRITE reads back at
    // exactly twelve and the assertion above passes over an entry growing forever.
    // Measured: dropping the write-side clamp left this file green until this line existed.
    const stored = JSON.parse(entries.get(struggleStorageKey("NUM.F")) ?? "{}") as {
      ring?: unknown[];
    };
    expect(stored.ring).toHaveLength(STRUGGLE_RING_SIZE);
  });

  it("stores no instant, in any field, under any name", () => {
    // The economy scales a payout on this store's output and `@cr/economy` is required to
    // be clockless. A timestamp here would be a clock the economy reads at one remove, so
    // the persisted shape is asserted rather than left to review.
    const { storage, entries } = fakeStorage();
    recordStruggleAttempt(MISSED, storage);
    const raw = entries.get(struggleStorageKey("NUM.F")) ?? "";
    expect(raw.length).toBeGreaterThan(0);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // A CENSUS rather than an absence check. `not.toHaveProperty("recordedAt")` passes over
    // a field called `lastSeenMs` just as happily, and the whole prohibition is on the
    // SPECIES of field rather than on any one name for it.
    expect(Object.keys(parsed).sort()).toEqual([
      "correctAfterError",
      "firstTryCorrect",
      "hinted",
      "incorrect",
      "nodeId",
      "revealed",
      "ring",
      "shapes",
    ]);
    // The census has to reach INSIDE the shape buckets too. A nested object is exactly where
    // a "lastAttemptAt" would end up, and a census of the top level would not see it.
    const shapes = parsed.shapes as Record<string, unknown>[];
    expect(shapes).toHaveLength(1);
    expect(Object.keys(shapes[0] ?? {}).sort()).toEqual([
      "attempts",
      "difficulty",
      "ring",
      "templateId",
    ]);
    // And no epoch millisecond hiding inside a value, whatever its key is called.
    expect(raw).not.toMatch(/\b1[6-9]\d{11}\b/);
  });

  it("survives a corrupt entry instead of taking the lesson down with it", () => {
    const { storage } = fakeStorage({ [struggleStorageKey("NUM.F")]: "{not json" });
    expect(struggleLevelOf(readStruggleRecord("NUM.F", storage))).toBe(0);
    // And it recovers: the next attempt writes a clean record over the wreckage.
    recordStruggleAttempt(GAVE_UP, storage);
    expect(struggleLevelOf(readStruggleRecord("NUM.F", storage))).toBe(1);
  });

  it("keys one entry per node, so one hard skill does not brand the rest", () => {
    const { storage } = fakeStorage();
    for (let round = 0; round < 6; round += 1) {
      recordStruggleAttempt({ ...GAVE_UP, nodeId: "RAT.5" }, storage);
    }
    const levels = readStruggleLevels(["RAT.5", "NUM.F"], storage);
    expect(levels.get("RAT.5")).toBe(1);
    expect(levels.get("NUM.F")).toBe(0);
  });
});

describe("demonstrated command is stricter than the solid tier", () => {
  it("is not satisfied by one clean answer, which a tier already is", () => {
    const { storage } = fakeStorage();
    recordStruggleAttempt(CLEAN, storage);
    const record = readStruggleRecord("NUM.F", storage);
    // Both readings of the same record, which is the whole reason the second exists: the
    // reward taper turns on "has this been shown", and one right answer has not shown it.
    expect(struggleTierOf(struggleLevelOf(record))).toBe("solid");
    expect(hasDemonstratedCommand(record)).toBe(false);
  });

  it("is satisfied once the recent window is clean throughout", () => {
    const { storage } = fakeStorage();
    for (let round = 0; round < SETTLED_ATTEMPTS; round += 1) {
      recordStruggleAttempt(CLEAN, storage);
    }
    expect(hasDemonstratedCommand(readStruggleRecord("NUM.F", storage))).toBe(true);
  });

  it("is withdrawn by a single stumble, because it is a claim about the recent window", () => {
    const { storage } = fakeStorage();
    for (let round = 0; round < SETTLED_ATTEMPTS; round += 1) {
      recordStruggleAttempt(CLEAN, storage);
    }
    recordStruggleAttempt(AFTER_A_MISS, storage);
    expect(hasDemonstratedCommand(readStruggleRecord("NUM.F", storage))).toBe(false);
  });
});
