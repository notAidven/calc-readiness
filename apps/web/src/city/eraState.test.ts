import { ERA_SEQUENCE, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "./eraDressing";
import {
  clearEraId,
  DEFAULT_ERA_ID,
  ERA_STATE_STORAGE_KEY,
  type EraStateStorage,
  hasNextEra,
  isEraId,
  loadEraId,
  nextEraId,
  saveEraId,
} from "./eraState";

/** A storage double, so nothing here depends on a jsdom `localStorage`. */
function fakeStorage(seed: Record<string, string> = {}): EraStateStorage & {
  entries: Record<string, string>;
} {
  const entries: Record<string, string> = { ...seed };
  return {
    entries,
    getItem: (key) => entries[key] ?? null,
    setItem: (key, value) => {
      entries[key] = value;
    },
    removeItem: (key) => {
      delete entries[key];
    },
  };
}

describe("the era the city is standing in", () => {
  it("defaults to the FIRST era in the authored sequence, derived rather than written down", () => {
    expect(loadEraId(fakeStorage())).toBe(DEFAULT_ERA_ID);
    expect(DEFAULT_ERA_ID).toBe(CURRENT_ERA_ID);
    // The derivation, pinned to `ERA_SEQUENCE` order and nothing else (INV-ERA-5 fact 1).
    // A literal `"prehistoric"` here would still pass, so the sequence is the anchor.
    expect(DEFAULT_ERA_ID).toBe(ERA_SEQUENCE[0]?.id);
    expect(eraNumber(DEFAULT_ERA_ID)).toBe(1);
  });

  it("round-trips every era in the sequence, so no era is unreachable", () => {
    // A floor with SHAPE, not only size: the set stored and read back must be the whole
    // sequence, both directions, so a reader that quietly special-cased one era fails.
    const storage = fakeStorage();
    const readBack = ERA_SEQUENCE.map((era) => {
      saveEraId(era.id, storage);
      return loadEraId(storage);
    });
    expect(readBack).toEqual(ERA_SEQUENCE.map((era) => era.id));
    expect(readBack).toHaveLength(10);
  });

  it("reads a stored value that is no longer an era as the default rather than throwing", () => {
    // The case this is for: a persisted id from a build where the sequence differed. Era one
    // is not a plausible-looking default here, it is the real floor of the sequence, and the
    // alternative to reading it is a city that will not load. `eraState.ts` argues the
    // departure from `eraBuildableRadius`'s fail-loud rule in full.
    expect(loadEraId(fakeStorage({ [ERA_STATE_STORAGE_KEY]: "atlantis" }))).toBe(
      DEFAULT_ERA_ID,
    );
    expect(loadEraId(fakeStorage({ [ERA_STATE_STORAGE_KEY]: "" }))).toBe(DEFAULT_ERA_ID);
    // And a REAL era is not swallowed by that path, which is what stops the guard above
    // from being satisfied by a function that always returns era one.
    const real = ERA_SEQUENCE[4]?.id;
    expect(real).toBeDefined();
    expect(loadEraId(fakeStorage({ [ERA_STATE_STORAGE_KEY]: real as string }))).toBe(real);
  });

  it("degrades to the default with no storage at all, and never throws", () => {
    expect(loadEraId(null)).toBe(DEFAULT_ERA_ID);
    expect(() => saveEraId("neolithic", null)).not.toThrow();
    expect(() => clearEraId(null)).not.toThrow();
  });

  it("forgets a stored era on clear", () => {
    const storage = fakeStorage();
    saveEraId("bronze_age", storage);
    expect(loadEraId(storage)).toBe("bronze_age");
    clearEraId(storage);
    expect(loadEraId(storage)).toBe(DEFAULT_ERA_ID);
  });

  it("recognises exactly the authored era ids", () => {
    for (const era of ERA_SEQUENCE) {
      expect(isEraId(era.id), era.id).toBe(true);
    }
    for (const notAnEra of ["", "D1", "prehistoric ", "PREHISTORIC", "era1"]) {
      expect(isEraId(notAnEra), notAnEra).toBe(false);
    }
  });
});

describe("walking the sequence", () => {
  it("advances by ARRAY POSITION, one era at a time, to the end and no further", () => {
    const walked: string[] = [DEFAULT_ERA_ID];
    let cursor = nextEraId(DEFAULT_ERA_ID);
    while (cursor !== null) {
      walked.push(cursor);
      cursor = nextEraId(cursor);
    }

    // The whole authored order, reproduced by stepping — which is the property that would
    // break if `nextEraId` ever sorted, parsed an ordinal out of a slug, or skipped.
    expect(walked).toEqual(ERA_SEQUENCE.map((era) => era.id));
  });

  it("has no era after the last one, so era ten cannot advance into nothing", () => {
    const last = ERA_SEQUENCE[ERA_SEQUENCE.length - 1]?.id;
    expect(last).toBeDefined();
    expect(nextEraId(last as typeof DEFAULT_ERA_ID)).toBeNull();
    expect(hasNextEra(last as typeof DEFAULT_ERA_ID)).toBe(false);
    // And every other era does have one, so the assertion above is about the END of the
    // sequence rather than about `nextEraId` returning null in general.
    for (const era of ERA_SEQUENCE.slice(0, -1)) {
      expect(hasNextEra(era.id), era.id).toBe(true);
    }
  });

  it("fails loud on an era outside the sequence rather than reading as the end", () => {
    // `null` means "the sequence ended here", so a typo must not be able to say it.
    // @ts-expect-error — the point is the runtime guard.
    expect(() => nextEraId("atlantis")).toThrow(/Unknown era/);
  });
});
