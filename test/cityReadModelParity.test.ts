import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE CITY PAYLOAD CROSSES A BOUNDARY TYPESCRIPT CANNOT SEE, AND THIS IS THE ONLY
 * THING STANDING WHERE THE COMPILER WOULD BE.**
 *
 * `GET /api/city` is written by `CityRead` (`services/diagnostic-api`) and read as
 * `CityLoad` (`apps/web`). The two are never checked against each other: the fetch ends
 * in `apiGetJson<CityLoad>(…)`, an unchecked cast over whatever JSON arrived, and the
 * app's `tsconfig` does not reference the service (it cannot — a browser bundle must not
 * pull a Lambda in). So a field the server renames, or one the app adds and the server
 * never learns about, compiles clean on both sides and arrives as `undefined` at
 * runtime.
 *
 * That is not hypothetical. It is the whole shape of the defect Wave 1 exists to fix:
 * `CityLoad` declared `town_hall`, `placements`, `roads`, `road_gold_spent` and
 * `crisis_damage` for months while `CityRead` declared two fields, and nothing in the
 * tree failed. The severity was measured rather than argued — `CitySurface` computed
 * occupancy from a payload with no hall, so the first placement a signed-in learner made
 * was aimed at the hall's own cells and silently refused.
 *
 * ## Why source text and not types
 *
 * Because a type-level check is exactly the thing that is unavailable here. Reading the
 * two interfaces as text is crude, and it is also the only vantage point from which both
 * are visible at once — the same reason `buildingModelAttributes.test.ts` and
 * `ciScopeFilter.test.ts` live in this directory rather than beside their subjects.
 *
 * ## Why the exception list is named, and asserted in both directions
 *
 * A `CityLoad` field the server genuinely does not owe and one it simply forgot look
 * identical from here. Leaving the first out of the population quietly is how the second
 * ships, so each is named with its reason below and the list fails BOTH ways: an entry
 * that stops being a `CityLoad` field fails, and an entry the server starts carrying
 * fails too, so an exemption cannot outlive the thing it excuses.
 */

const ROOT = resolveRepoRoot();
const READS = posix.join(ROOT, "services/diagnostic-api/src/reads.ts");
const WRITES = posix.join(ROOT, "services/diagnostic-api/src/writes.ts");
const TYPES = posix.join(ROOT, "apps/web/src/city/types.ts");
const WORLD_LAYOUT = posix.join(ROOT, "apps/web/src/city/worldLayout.ts");
const ROADS = posix.join(ROOT, "apps/web/src/city/roads.ts");
const API_SESSION = posix.join(ROOT, "apps/web/src/city/apiCitySession.ts");

/**
 * The property names declared directly on `interface <name>` in `source`.
 *
 * Brace-walked rather than regexed to the closing `}`, so a nested object type inside a
 * field cannot end the interface early, and comment bodies are stripped first so a field
 * name mentioned in prose is not counted as a declaration.
 */
function fieldsOf(source: string, name: string): string[] {
  // `[^{}]*` covers an `extends` clause (`PlacedTransform extends Transform`) without
  // letting the match run past the brace of some later declaration.
  const declaration = new RegExp(`(?:export )?interface ${name}\\b[^{}]*\\{`).exec(source);
  if (declaration?.index === undefined) {
    throw new Error(`no \`interface ${name}\` in the source read`);
  }
  const open = declaration.index;
  let depth = 0;
  let end = -1;
  for (let i = source.indexOf("{", open); i < source.length; i += 1) {
    if (source[i] === "{") {
      depth += 1;
    } else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) {
    throw new Error(`\`interface ${name}\` is never closed`);
  }
  const body = source
    .slice(source.indexOf("{", open) + 1, end)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const fields: string[] = [];
  let nested = 0;
  for (const line of body.split("\n")) {
    if (nested === 0) {
      const match = /^\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\??\s*:/.exec(line);
      if (match?.[1]) {
        fields.push(match[1]);
      }
    }
    nested += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
  }
  return fields;
}

/**
 * `CityLoad` fields `CityRead` deliberately does not carry. Each needs a reason that is
 * about the FIELD, not about how far the work has got.
 */
const NOT_SERVED: ReadonlyMap<string, string> = new Map([
  [
    "authoring_complete",
    "a fact about which lesson content exists, identical for every student — it is " +
      "derived in the browser from the shipped packs and there is nothing per-student " +
      "to store, so no table could hold it and no read should carry it",
  ],
]);

const cityRead = fieldsOf(readFileSync(READS, "utf8"), "CityRead");
const cityLoad = fieldsOf(readFileSync(TYPES, "utf8"), "CityLoad");

describe("CityRead and CityLoad describe the same payload", () => {
  it("reads a real population off both sides", () => {
    // A floor under the derivation. Both extractions are one filter over a source file,
    // and a filter that has silently stopped matching returns an empty set that every
    // containment check below would pass.
    expect(cityRead.length).toBeGreaterThanOrEqual(7);
    expect(cityLoad.length).toBeGreaterThanOrEqual(8);
    expect(new Set(cityRead).size).toBe(cityRead.length);
    expect(new Set(cityLoad).size).toBe(cityLoad.length);
  });

  it("carries the whole city, not the two fields it shipped with", () => {
    // Named rather than derived, because this is the CLAIM and not a restatement of the
    // source. The five beyond node state are what a signed-in learner's island is made
    // of, and every one of them was `undefined` before Wave 1.
    for (const field of [
      "node_states",
      "neighborhood_state",
      "town_hall",
      "placements",
      "civic",
      "roads",
      "road_gold_spent",
      "crisis_damage",
    ]) {
      expect(cityRead, `CityRead must carry ${field}`).toContain(field);
    }
  });

  it("declares nothing the browser cannot read", () => {
    for (const field of cityRead) {
      expect(
        cityLoad,
        `\`CityRead.${field}\` has no \`CityLoad\` field to land in, so it arrives as ` +
          `an unread property on the parsed JSON`,
      ).toContain(field);
    }
  });

  it("serves every CityLoad field except the ones named as exceptions", () => {
    const unserved = cityLoad.filter((field) => !cityRead.includes(field));
    expect(new Set(unserved)).toEqual(new Set(NOT_SERVED.keys()));
  });

  it("keeps each exception honest in both directions", () => {
    for (const [field, why] of NOT_SERVED) {
      expect(why.length).toBeGreaterThan(40);
      // Forwards: a listed field that has been renamed or deleted stops exempting
      // anything, and would otherwise sit here forever looking like coverage.
      expect(
        cityLoad,
        `\`${field}\` is exempted but is no longer a CityLoad field`,
      ).toContain(field);
      // Backwards: a listed field the server has started serving is no longer an
      // exception, and leaving it here would excuse the next one silently.
      expect(
        cityRead,
        `\`${field}\` is served now — take it off the exception list`,
      ).not.toContain(field);
    }
  });
});

describe("the shapes inside the payload line up too", () => {
  it("spells a placement the way the browser destructures one", () => {
    // `nodeId` is camel-cased on both sides while every sibling is snake_cased, which is
    // exactly the kind of asymmetry a re-implementation gets wrong. The server builds
    // this by hand from `subject_id`/`grid_col`/`grid_row`, so nothing but this holds it
    // to `PlacedTransform`.
    const server = fieldsOf(readFileSync(READS, "utf8"), "CityPlacementRead");
    const layout = readFileSync(WORLD_LAYOUT, "utf8");
    const browser = [
      ...fieldsOf(layout, "PlacedTransform"),
      ...fieldsOf(layout, "Transform"),
    ];
    expect(new Set(server)).toEqual(new Set(["nodeId", "col", "row", "rot"]));
    expect(new Set(server)).toEqual(new Set(browser));
  });

  it("spells a road cell the way the browser reads one", () => {
    const server = fieldsOf(readFileSync(READS, "utf8"), "CityRoadRead");
    const browser = fieldsOf(readFileSync(ROADS, "utf8"), "RoadCell");
    expect(new Set(server)).toEqual(new Set(browser));
    expect(server.length).toBe(2);
  });
});

/**
 * **THE WRITE MODEL IS HELD TO THE READ MODEL, WHICH IS WHERE A FIELD GOES MISSING.**
 *
 * `CityRead` and `CityWrite` cross no compiler boundary either: the read is assembled from
 * rows and the write is parsed out of untrusted JSON, so a sixth thing a city is made of
 * could be added to the read, served forever as an empty array, and nothing in the tree
 * would say that no writer fills it. That is not hypothetical — it is what the four layout
 * fields Wave 1 added did for a day, and what `road_gold_spent` would still be doing if the
 * writer had forgotten it.
 *
 * The exception lists are the point. A read field the writer genuinely must not store, and
 * one it forgot, look identical from here, so each is named with a reason ABOUT THE FIELD
 * and asserted in both directions.
 */

const cityWrite = fieldsOf(readFileSync(WRITES, "utf8"), "CityWrite");
const writePayload = fieldsOf(readFileSync(API_SESSION, "utf8"), "CityWritePayload");

/**
 * `CityRead` fields `CityWrite` deliberately does not carry, because another lane owns the
 * table they come from.
 */
const NOT_WRITTEN: ReadonlyMap<string, string> = new Map([
  [
    "launch_initialized",
    "a server-derived first-use marker. It is written only by the authenticated bootstrap or " +
      "inferred from canonical rows; accepting it in the browser-authored whole-city payload " +
      "would let local state claim that an untouched account had already been initialized",
  ],
  [
    "node_states",
    "`student_node_state` is a LEARNING RECORD and Contracts §3 makes the mastery service " +
      "its only writer. This body arrives from a browser POST, so accepting mastery here " +
      "would make the browser authoritative over a learning record — which is exactly what " +
      "`0004`'s column-scoped grant on those four columns exists to keep out",
  ],
  [
    "neighborhood_state",
    "`checkpoint_cleared` is written only by the game-owned `CheckpointWriter` in " +
      "`engines/game`, fail-closed on readiness. A POST that could set it would be a way to " +
      "clear a checkpoint without clearing the storm",
  ],
  [
    "archipelago_version",
    "a server capability marker derived from the response shape. It is not learner state " +
      "and accepting it from a browser write would let a client claim support the server lacks",
  ],
  [
    "islands",
    "the read-side collection assembled from individually written island rows. A city POST " +
      "carries exactly one island, so accepting the aggregate would create two write formats",
  ],
]);

/**
 * `CityWrite` fields that are not `CityRead` fields. Exactly one, and the schema is what
 * forces it.
 */
const WRITE_ONLY: ReadonlyMap<string, string> = new Map([
  [
    "era_id",
    "`city_state.era_id` is `not null` with no default and `road_gold_spent` lives on that " +
      "same row, so a writer that persists roads MUST supply an era. The READ deliberately " +
      "does not carry it back: the stored era travels with the persisted ledger (design " +
      "record §3.5), and adopting a server era at load would let a lost POST demote a " +
      "learner out of an era whose ceremony they had completed",
  ],
  [
    "island_era",
    "the partition key for the one island this POST carries. CityRead exposes the same fact " +
      "inside each islands entry rather than as a top-level field on the current projection",
  ],
]);

describe("CityWrite stores what CityRead serves", () => {
  it("reads a real population off both sides", () => {
    expect(cityWrite.length).toBeGreaterThanOrEqual(6);
    expect(new Set(cityWrite).size).toBe(cityWrite.length);
    // The exceptions must not have grown until they swallowed the population: at least four
    // fields are genuinely round-tripped.
    const roundTripped = cityWrite.filter((field) => !WRITE_ONLY.has(field));
    expect(roundTripped.length).toBeGreaterThanOrEqual(5);
  });

  it("stores every CityRead field except the ones named as exceptions", () => {
    const unwritten = cityRead.filter((field) => !cityWrite.includes(field));
    expect(new Set(unwritten)).toEqual(new Set(NOT_WRITTEN.keys()));
  });

  it("carries nothing the read does not serve except the ones named", () => {
    const extra = cityWrite.filter((field) => !cityRead.includes(field));
    expect(new Set(extra)).toEqual(new Set(WRITE_ONLY.keys()));
  });

  it("keeps each exception honest in both directions", () => {
    for (const [field, why] of NOT_WRITTEN) {
      expect(why.length).toBeGreaterThan(40);
      // Forwards: an exemption for a field the read no longer serves exempts nothing.
      expect(
        cityRead,
        `\`${field}\` is exempted but is no longer a CityRead field`,
      ).toContain(field);
      // Backwards: an exemption for a field the writer HAS started storing is stale, and
      // leaving it would excuse the next lane boundary somebody crosses.
      expect(cityWrite, `\`${field}\` is written now — take it off the list`).not.toContain(
        field,
      );
    }
    for (const [field, why] of WRITE_ONLY) {
      expect(why.length).toBeGreaterThan(40);
      expect(
        cityWrite,
        `\`${field}\` is exempted but is no longer a CityWrite field`,
      ).toContain(field);
      expect(cityRead, `\`${field}\` is served now — take it off the list`).not.toContain(
        field,
      );
    }
  });

  it("is spelled the same way in the browser body that fills it", () => {
    // `CityWritePayload` (apps/web) is the client's declaration of the same JSON, and it
    // crosses the same unchecked boundary in the other direction — `apiPostJson` casts. A
    // field renamed on either side would be silently dropped by the service's parser and
    // answered with a 400 the learner never sees.
    expect(writePayload.length).toBeGreaterThanOrEqual(6);
    expect(new Set(writePayload)).toEqual(new Set(cityWrite));
  });
});
