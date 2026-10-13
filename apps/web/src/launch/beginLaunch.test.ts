import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";
import { describe, expect, it, vi } from "vitest";

import type { CityLoad } from "../city/types";
import { beginDiagnostic, beginEraOne } from "./beginLaunch";
import { type LaunchStorage, readLaunchRecord } from "./launchRecord";

/**
 * **"EXACTLY ONCE", MEASURED.**
 *
 * The claim the ordinary launch path makes about Era 1 is that its initialisation runs once per
 * account and never again — not on the second press, not after a re-mount, and above all not for
 * a learner whose progress lives on another device. That is a claim about a call count, so it is
 * read with a spy on the one thing initialisation does rather than inferred from a screen.
 *
 * The guard is a conjunction (no note on this device AND no progression on the account) and each
 * half is exercised on its own, because either alone would let a real defect through: the note
 * alone cannot see the learner's other laptop, and the canonical read alone cannot see a press
 * that grants nothing.
 */

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;
const FIRST_ERA = ERA_SEQUENCE[0]?.id;
const LATER_ERA = ERA_SEQUENCE[3]?.id;

function memoryStorage(): LaunchStorage {
  const all = new Map<string, string>();
  return {
    getItem: (key) => all.get(key) ?? null,
    setItem: (key, value) => {
      all.set(key, value);
    },
    removeItem: (key) => {
      all.delete(key);
    },
  };
}

function node(over: Partial<StudentNodeState> = {}): StudentNodeState {
  return {
    student_id: STUDENT,
    node_id: "NUM.1",
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "in_progress",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

const EMPTY: CityLoad = { node_states: [node()], placements: [], roads: [], civic: [] };

describe("beginning at Era 1", () => {
  it("initialises the canonical first era on the first press and on no later one", () => {
    const storage = memoryStorage();
    const setEra = vi.fn();

    const first = beginEraOne({ subject: STUDENT, city: EMPTY, setEra, storage });
    expect(first.first).toBe(true);
    expect(first.initialisedEra).toBe(true);
    expect(setEra).toHaveBeenCalledTimes(1);
    expect(setEra).toHaveBeenCalledWith(FIRST_ERA);

    for (let press = 0; press < 4; press += 1) {
      const again = beginEraOne({ subject: STUDENT, city: EMPTY, setEra, storage });
      expect(again.first).toBe(false);
      expect(again.initialisedEra).toBe(false);
    }
    expect(
      setEra,
      "a later press re-ran the initialisation the first press already did",
    ).toHaveBeenCalledTimes(1);
    expect(readLaunchRecord(STUDENT, storage)).toEqual(first.record);
  });

  /**
   * The half the device note cannot cover. This device has never seen the learner, so its note
   * is absent and says nothing; the account's own city says they are four eras in. Writing era
   * one here is precisely the "signing in on my laptop reset my progress" defect.
   */
  it("initialises nothing for a learner whose account has already begun elsewhere", () => {
    const storage = memoryStorage();
    const setEra = vi.fn();
    const started: CityLoad = { ...EMPTY, current_island: LATER_ERA };

    const outcome = beginEraOne({ subject: STUDENT, city: started, setEra, storage });

    expect(
      outcome.first,
      "this device genuinely had no note, so the other half is what ran",
    ).toBe(true);
    expect(outcome.initialisedEra).toBe(false);
    expect(
      setEra,
      "Era 1 was written over an account standing in a later era",
    ).not.toHaveBeenCalled();
    // The door is still recorded, so this device stops asking. Recording is not initialising.
    expect(readLaunchRecord(STUDENT, storage)?.choice).toBe("era-one");
  });

  it("initialises nothing for an account with the faintest progress on it", () => {
    for (const city of [
      { ...EMPTY, node_states: [node({ mastery: 1 })] },
      { ...EMPTY, node_states: [node({ placement_estimate: 3 })] },
      { ...EMPTY, placements: [{ nodeId: "NUM.1", col: 3, row: 3, rot: 0 }] },
    ] satisfies CityLoad[]) {
      const setEra = vi.fn();
      beginEraOne({ subject: STUDENT, city, setEra, storage: memoryStorage() });
      expect(
        setEra,
        `progress on ${JSON.stringify(city).slice(0, 60)} was overwritten`,
      ).not.toHaveBeenCalled();
    }
  });

  it("keeps one learner's press off another learner's account", () => {
    const storage = memoryStorage();
    const setEra = vi.fn();
    beginEraOne({ subject: STUDENT, city: EMPTY, setEra, storage });
    const other = beginEraOne({
      subject: "22222222-2222-4222-8222-222222222222",
      city: EMPTY,
      setEra,
      storage,
    });
    expect(other.first).toBe(true);
    expect(other.initialisedEra).toBe(true);
    expect(setEra).toHaveBeenCalledTimes(2);
  });
});

describe("beginning with the diagnostic", () => {
  it("records the door and moves no era", () => {
    const storage = memoryStorage();
    const outcome = beginDiagnostic({ subject: STUDENT, storage });

    expect(outcome.first).toBe(true);
    expect(outcome.initialisedEra).toBe(false);
    expect(readLaunchRecord(STUDENT, storage)?.choice).toBe("diagnostic");
  });

  /**
   * The doors are mutually exclusive by the record's write-once rule, and this is the direction
   * that matters: a learner who took the diagnostic and later reaches the Era 1 path must not
   * have era one written under a placement the diagnostic is about to produce.
   */
  it("cannot be overtaken by a later Era 1 press", () => {
    const storage = memoryStorage();
    const setEra = vi.fn();
    beginDiagnostic({ subject: STUDENT, storage });

    const later = beginEraOne({ subject: STUDENT, city: EMPTY, setEra, storage });
    expect(later.first).toBe(false);
    expect(later.initialisedEra).toBe(false);
    expect(setEra).not.toHaveBeenCalled();
    expect(readLaunchRecord(STUDENT, storage)?.choice).toBe("diagnostic");
  });
});
