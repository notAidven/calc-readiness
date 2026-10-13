import { describe, expect, it } from "vitest";

import {
  forgetLaunchRecord,
  launchRecordKey,
  type LaunchStorage,
  readLaunchRecord,
  recordLaunchChoice,
} from "./launchRecord";

/**
 * **THE DEVICE NOTE THAT MAKES "ASK ONCE" A PROPERTY OF THE STORE.**
 *
 * The launch surface presses a button; the store decides whether that press is the first one.
 * Putting the decision here rather than in the component is what makes the idempotence survive a
 * re-mount, a StrictMode double-invoke and a double click — none of which the component can see.
 *
 * Three properties are load-bearing and each is read in both directions: it is write-once, it is
 * per-subject, and a note it cannot understand is treated as absent rather than obeyed.
 */

function memoryStorage(seed: Record<string, string> = {}): LaunchStorage & {
  readonly all: Map<string, string>;
} {
  const all = new Map(Object.entries(seed));
  return {
    all,
    getItem: (key) => all.get(key) ?? null,
    setItem: (key, value) => {
      all.set(key, value);
    },
    removeItem: (key) => {
      all.delete(key);
    },
  };
}

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

describe("the launch record", () => {
  it("writes once and never rewrites, whichever door is pressed second", () => {
    const storage = memoryStorage();

    const first = recordLaunchChoice(ALICE, "era-one", storage);
    expect(first.choice).toBe("era-one");
    expect(storage.all.size, "the first press wrote nothing").toBe(1);

    // The same door twice, and then the OTHER door. Neither may overwrite the first answer:
    // the record is what "initialise exactly once" hangs off, so a second press that rewrote
    // it would re-open the initialisation it exists to close.
    expect(recordLaunchChoice(ALICE, "era-one", storage)).toEqual(first);
    expect(recordLaunchChoice(ALICE, "diagnostic", storage)).toEqual(first);
    expect(readLaunchRecord(ALICE, storage)?.choice).toBe("era-one");
    expect(storage.all.size).toBe(1);
  });

  it("keeps one learner's answer off another learner's question", () => {
    const storage = memoryStorage();
    recordLaunchChoice(ALICE, "diagnostic", storage);

    expect(readLaunchRecord(BOB, storage)).toBeNull();
    recordLaunchChoice(BOB, "era-one", storage);
    expect(readLaunchRecord(ALICE, storage)?.choice).toBe("diagnostic");
    expect(readLaunchRecord(BOB, storage)?.choice).toBe("era-one");
    expect(storage.all.has(launchRecordKey(ALICE))).toBe(true);
    expect(storage.all.has(launchRecordKey(BOB))).toBe(true);
  });

  it("treats a note it cannot understand as no note at all", () => {
    // Each of these is a real way a key goes bad: hand-edited, truncated by a full quota, or
    // written by a version that meant something else by `choice`. Obeying any of them would
    // send a learner through a door nobody chose; reading them as absent costs one question.
    for (const bad of ["", "{", "null", '{"choice":"somewhere-else"}', '{"at":"now"}']) {
      const storage = memoryStorage({ [launchRecordKey(ALICE)]: bad });
      expect(readLaunchRecord(ALICE, storage), `"${bad}" was obeyed`).toBeNull();
    }
  });

  it("does not stop a learner entering their city when the store refuses to write", () => {
    const blocked: LaunchStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(recordLaunchChoice(ALICE, "era-one", blocked).choice).toBe("era-one");
    expect(() => forgetLaunchRecord(ALICE, blocked)).not.toThrow();
  });

  it("writes nothing at all without a subject to key it to", () => {
    const storage = memoryStorage();
    recordLaunchChoice("", "era-one", storage);
    expect(storage.all.size).toBe(0);
    expect(readLaunchRecord("", storage)).toBeNull();
  });

  it("can be forgotten, which puts the question back and takes nothing away", () => {
    const storage = memoryStorage();
    recordLaunchChoice(ALICE, "era-one", storage);
    forgetLaunchRecord(ALICE, storage);
    expect(readLaunchRecord(ALICE, storage)).toBeNull();
    expect(storage.all.size).toBe(0);
  });
});
