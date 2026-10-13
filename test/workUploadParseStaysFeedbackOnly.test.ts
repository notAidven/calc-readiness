import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **A MACHINE READING OF A STUDENT'S HANDWRITING CANNOT REACH THEIR PLACEMENT.**
 *
 * `docs/Photo_Work_Upload_Scope.md` §1, §3.5 and §7: an upload is never an input to mastery,
 * placement or the pre/post metric, and neither is anything read out of one. That invariant
 * was NOT part of the privacy gate Gabe lifted on 2026-08-05 (see the §3.5 banner), and it
 * did not move with it. What changed is how much it matters: the route that ruling opened
 * sends a photograph to a model whose measured page-level misread rate on real multi-step
 * student working is **37.62%** (`Photo_Work_Upload_v2_OCR_Feasibility.md` §2.4). Better than
 * three readings in eight have a mistake in them somewhere.
 *
 * So this is not a tidiness rule. **A parse that is wrong 37.62% of the time must not be able
 * to affect a learner's placement**, and "must not be able to" is the operative phrase: the
 * question is not whether anything currently does it, but whether there is a route by which
 * anything could.
 *
 * ## Written in `workUploadInvariant.test.ts`'s shape, and extended in the two ways it is short
 *
 * That guard is the browser half — `import.meta.glob("./*.{ts,tsx}")` over
 * `apps/web/src/work-upload`, asserting no import on the grading path. Its shape is right and
 * this file keeps it. Two things it structurally cannot see, both of which the parse
 * introduced:
 *
 *  1. **The parse is server-side.** Its population is one browser directory; the reading is
 *     produced in `services/diagnostic-api` and stored in Aurora, neither of which that glob
 *     reaches. The population here is derived across both lanes plus the migration.
 *  2. **An import is only one of the three ways in.** A module graph says nothing about a
 *     COLUMN a scorer could join to, or a FIELD on a wire type a client could read. So the
 *     three surfaces are checked separately and none of them is allowed to carry a scoring
 *     concept: the imports, the types, and the schema.
 *
 * ## Every assertion here has been driven to failure
 *
 * An assertion added without a demonstrated red may be asserting nothing. Each rule below
 * was injected against and watched fail before this file was committed; the PR records the
 * injections and their output.
 */

const ROOT = resolveRepoRoot();

const PARSE_SOURCES = [
  "services/diagnostic-api/src/workUploadParse.ts",
  "services/diagnostic-api/src/workUploadParseSeam.ts",
  "services/diagnostic-api/src/workUploadParseGrounding.ts",
  "services/diagnostic-api/src/visionModel.ts",
  "services/diagnostic-api/src/bedrockVisionModel.ts",
  "services/diagnostic-api/src/httpVisionModel.ts",
];

const MIGRATION = "db/migrations/0010_work_upload_parse.sql";

function read(path: string): string {
  return readFileSync(posix.join(ROOT, path), "utf8");
}

/**
 * Every migration that touches `work_upload_parse`, derived rather than listed.
 *
 * This file used to read `0010` alone, which was correct while `0010` was the only migration
 * that had ever named the table and silently wrong the moment a later one added a column: the
 * scoring-name scan below would have gone on measuring a `create table` that no longer
 * described the table. Derived from the directory, so `0012` cannot escape it by existing.
 */
function parseMigrations(): string[] {
  return readdirSync(posix.join(ROOT, "db/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .map((name) => `db/migrations/${name}`)
    .filter((path) => read(path).includes("work_upload_parse"))
    .sort();
}

/**
 * The words that would make a reading into an assessment signal.
 *
 * `correct` is in the list and it is the one that needs saying out loud: the framing this
 * whole feature turns on is *"here's what we read — correct us if we got it wrong"*, so the
 * word appears constantly in PROSE and must never appear as a FIELD. That is exactly why the
 * type checks below parse property names rather than scanning raw text — a rule that scanned
 * text would have to choose between banning the framing and banning nothing.
 */
const SCORING_CONCEPTS: readonly string[] = [
  "mastery",
  "score",
  "correct",
  "placement",
  "theta",
  "credit",
  "points",
  "grade",
  "mark",
];

/**
 * Import specifiers that would give the parse a path into grading.
 *
 * `@cr/item-bank` was on this list until the coaching layer, and it is not any more. The
 * reasoning is in {@link ITEM_BANK_LICENSED}: reading an item and grading one are different
 * capabilities, and every entry that remains here is the second one. What used to be a
 * blanket ban on the bank is now a named licence plus this list, which is the rule the ban
 * was always standing in for.
 */
const GRADING_PATH: readonly RegExp[] = [
  /@cr\/mastery-service/,
  /@cr\/scorer/,
  /@cr\/lesson\b/,
  /@cr\/components/,
  /answer-?checker/i,
  /checker-core/i,
  /practiceChecker/,
  /cfuChecker/,
  /computeStudentReadiness/,
  // A SIBLING IN THE SAME DIRECTORY, which is the shape every other entry here misses.
  // The rest are package specifiers, and they were sufficient while the only graders were
  // packages. The mastery writer behind `POST /mastery/evidence` is not: it lands in
  // `services/diagnostic-api/src/` beside the parse itself, so the import that would reach
  // it is `./mastery`, which no `@cr/…` pattern can see. It is now the CLOSEST grading path
  // in the tree to this lane and was the only one the list could not have caught — measured
  // rather than argued: with `import … from "./mastery"` injected into `workUploadParse.ts`,
  // all 13 tests in this file went on passing until the line below existed.
  /(^|\/)mastery/i,
];

/**
 * THE ONE FILE ALLOWED TO NAME THE ITEM BANK, with the reason it is allowed to.
 *
 * A named exception in the shape `test/workUploadPhotoLeavesOnlyThroughTheSeam.test.ts` uses
 * for its vendor licence, and asserted in both directions for the same reason: a member that
 * does not owe the property and a member that forgot it look identical from outside the
 * guard, so the exception is named rather than quietly excluded.
 */
const ITEM_BANK_LICENSED: ReadonlyMap<string, string> = new Map([
  [
    "services/diagnostic-api/src/workUploadParseGrounding.ts",
    "The coaching layer needs the item's own canonical solution, because feedback with no " +
      "item-specific anchor is scored 0 by the eval spec (§3.3). This module takes an item " +
      "id and returns four read-only strings; it has no parameter a learner's work could " +
      "arrive through, so it cannot be asked to judge anything.",
  ],
]);

/**
 * An IMPORT of the bank, not a mention of it.
 *
 * Written as `includes("@cr/item-bank")` first, and that was wrong in both directions at
 * once: the licensed module's own docblock argues about `@cr/item-bank` at length, so the
 * backward check passed on prose and would have gone on passing after the import was
 * deleted — which is precisely the "licence excusing nothing" failure the check exists to
 * catch. The injection that found it is recorded in the work log.
 */
const IMPORTS_ITEM_BANK = /\bfrom\s+"@cr\/item-bank"/;

/** A function signature that would let a caller hand this lane a learner's answer. */
const LEARNER_ANSWER_ARGUMENT =
  /\b(rawAnswer|raw_answer|learnerAnswer|studentAnswer|submittedAnswer|response)\s*[?:]/;

/** Every module specifier in `import … from "x"` and `import("x")`. */
function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    if (match[1]) {
      specifiers.push(match[1]);
    }
  }
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    if (match[1]) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

/**
 * The property NAMES an exported interface declares, ignoring its docblocks.
 *
 * Name-level rather than text-level for the reason in {@link SCORING_CONCEPTS}: a text scan
 * over a type whose own comment has to explain what it is not would fail on the explanation.
 */
function propertyNames(source: string, typeName: string): string[] {
  const body = new RegExp(`export interface ${typeName} \\{([\\s\\S]*?)\\n\\}`).exec(
    source,
  )?.[1];
  if (body === undefined) {
    throw new Error(`${typeName} is not an exported interface any more`);
  }
  const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return [...withoutComments.matchAll(/^\s*(?:readonly\s+)?([A-Za-z_]\w*)\s*\??\s*:/gm)]
    .map((match) => match[1] ?? "")
    .filter((name) => name !== "");
}

const COLUMN_TYPES = "uuid|text|integer|real|jsonb|timestamptz";

/** The column names a `create table` statement declares. */
function createdColumns(sql: string, table: string): string[] {
  const body = new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`).exec(
    sql.replace(/--[^\n]*/g, ""),
  )?.[1];
  if (body === undefined) {
    throw new Error(`public.${table} is not created by this migration any more`);
  }
  return [...body.matchAll(new RegExp(`^\\s{2}(\\w+)\\s+(?:${COLUMN_TYPES})`, "gm"))]
    .map((match) => match[1] ?? "")
    .filter((name) => name !== "");
}

/**
 * EVERY column the table has, across every migration that touches it.
 *
 * The `create table` plus every later `add column`. Reading only the file that created the
 * table is how a scan goes on measuring a shape the table has since outgrown, and the
 * scoring-name rule below is only as wide as the census under it.
 */
function allColumns(table: string): string[] {
  const columns: string[] = [];
  for (const path of parseMigrations()) {
    const sql = read(path).replace(/--[^\n]*/g, "");
    if (new RegExp(`create table public\\.${table} \\(`).test(sql)) {
      columns.push(...createdColumns(sql, table));
    }
    for (const match of sql.matchAll(
      new RegExp(`add column(?:\\s+if not exists)?\\s+(\\w+)\\s+(?:${COLUMN_TYPES})`, "gi"),
    )) {
      if (match[1] !== undefined) {
        columns.push(match[1]);
      }
    }
  }
  return columns;
}

describe("the parse lane's population", () => {
  it("is every module that produces or carries a reading, and they all exist", () => {
    // A floor and a census. Every rule below is a "for each", so a walk that found nothing
    // would pass all of them; and a floor alone constrains size and not shape, so the
    // members are named. Derived from the tree as well, so a seventh parse module added
    // without being listed fails here rather than escaping the sweep.
    expect(PARSE_SOURCES.length).toBeGreaterThanOrEqual(6);
    for (const path of PARSE_SOURCES) {
      expect(
        () => read(path),
        `${path} is in the population and does not exist`,
      ).not.toThrow();
    }
    const onDisk = readdirSync(posix.join(ROOT, "services/diagnostic-api/src"))
      .filter((name) => /(parse|vision-?model)/i.test(name))
      .filter((name) => name.endsWith(".ts") && !name.includes(".test."))
      .map((name) => `services/diagnostic-api/src/${name}`)
      .sort();
    expect(
      onDisk,
      "a parse or vision module exists that this file does not sweep — add it, or the rules " +
        "below are about the modules somebody remembered rather than about the behaviour",
    ).toEqual([...PARSE_SOURCES].sort());
  });
});

describe("there is no import from the parse into grading", () => {
  // THE RULE THE ITEM-BANK BAN WAS STANDING IN FOR, and now the one carrying the invariant
  // on its own. Its population is derived from disk above, so the module licensed to read
  // the bank is swept by it without anybody having to remember to add it.
  it("imports nothing on the grading path, in any module in the lane", () => {
    const offenders: string[] = [];
    for (const path of PARSE_SOURCES) {
      for (const specifier of importSpecifiers(read(path))) {
        if (GRADING_PATH.some((pattern) => pattern.test(specifier))) {
          offenders.push(`${path} imports "${specifier}"`);
        }
      }
    }
    expect(
      offenders,
      "a reading that is wrong on 37.62% of real student pages must not be able to reach " +
        "mastery, placement or the pre/post metric, and the way it stays unable to is that " +
        "there is no import to make it possible",
    ).toEqual([]);
  });

  it("names the item bank in one licensed module and nowhere else", () => {
    // THE FORWARD DIRECTION. This rule used to be a blanket ban, and its comment said that
    // pulling in an item's canonical `worked_solution` "is a design change with this test as
    // the place to argue it". The argument was made and it is recorded in
    // `workUploadParseGrounding.ts`: the danger was never knowing what the problem was, it
    // was being able to take a learner's answer and return a verdict on it, and that is the
    // rule the sweep above now enforces directly.
    const offenders = PARSE_SOURCES.filter(
      (path) => !ITEM_BANK_LICENSED.has(path) && IMPORTS_ITEM_BANK.test(read(path)),
    );
    expect(
      offenders,
      "the canonical solution enters this lane through one named module so that widening " +
        "what the parse knows stays a decision somebody makes here, rather than an import " +
        "somebody adds",
    ).toEqual([]);
  });

  it("holds each item-bank licence to still being used and still being a reader", () => {
    // THE BACKWARD DIRECTION, which is what stops the licence becoming permanent by neglect.
    // A licensed file that stopped importing the bank would sit here forever excusing
    // nothing and hiding that it excuses nothing.
    for (const [path, reason] of ITEM_BANK_LICENSED) {
      const source = read(path);
      expect(
        IMPORTS_ITEM_BANK.test(source),
        `${path} is licensed to read the item bank and does not import it — delete the ` +
          "licence rather than leaving it to excuse whatever is added next",
      ).toBe(true);
      expect(
        LEARNER_ANSWER_ARGUMENT.test(source),
        `${path} is licensed as a READER and has grown a parameter that takes a learner's ` +
          "answer, which is the capability the licence does not cover",
      ).toBe(false);
      expect(reason.length).toBeGreaterThan(80);
    }
    expect(ITEM_BANK_LICENSED.size).toBe(1);
  });
});

describe("no type in the parse lane carries a scoring concept", () => {
  const TYPED_SURFACES: readonly [string, string][] = [
    ["services/diagnostic-api/src/workUploadParseSeam.ts", "WorkUploadParse"],
    ["services/diagnostic-api/src/workUploadParse.ts", "WorkUploadParseWire"],
  ];

  it("declares real, non-empty types to measure", () => {
    // The floor. `propertyNames` throws on a missing type, but an interface that had lost
    // its fields would satisfy every "does not contain" below by containing nothing.
    for (const [path, typeName] of TYPED_SURFACES) {
      expect(propertyNames(read(path), typeName).length, typeName).toBeGreaterThanOrEqual(
        5,
      );
    }
    expect(TYPED_SURFACES.length).toBe(2);
  });

  it("names no field a scorer could read", () => {
    const offenders: string[] = [];
    for (const [path, typeName] of TYPED_SURFACES) {
      for (const field of propertyNames(read(path), typeName)) {
        for (const concept of SCORING_CONCEPTS) {
          if (field.toLowerCase().includes(concept)) {
            offenders.push(`${typeName}.${field} in ${path}`);
          }
        }
      }
    }
    expect(
      offenders,
      "there must be no field a scorer could consume even if somebody wired one up — that " +
        "is the only version of this invariant that does not depend on everyone remembering",
    ).toEqual([]);
  });

  it("keeps `suspectStepIndex` an index into the transcript and not a verdict", () => {
    // The one field that could be mistaken for a judgement, so its meaning is pinned. It
    // points at a line of the LEARNER'S OWN handwriting that the reading stopped following;
    // it says nothing about the answer, and the schema enforces that it points at a step
    // that exists (`work_upload_parse_suspect_step_is_in_range`).
    const seam = read("services/diagnostic-api/src/workUploadParseSeam.ts");
    expect(propertyNames(seam, "WorkUploadParse")).toContain("suspectStepIndex");
    expect(propertyNames(seam, "WorkUploadParse")).toContain("steps");
    expect(read(MIGRATION)).toContain("work_upload_parse_suspect_step_is_in_range");
  });

  it("presents every reading provisionally, as a type and not as a habit", () => {
    // `provisional: true` is a LITERAL type. There is no value it can take that would show a
    // reading as settled, so a surface rendering the record without a hedge is doing so
    // against the type rather than merely against a convention.
    const wire = read("services/diagnostic-api/src/workUploadParse.ts");
    expect(wire).toMatch(/readonly provisional:\s*true;/);
    expect(wire).not.toMatch(/readonly provisional\??:\s*boolean/);
    // And the framing the doc asks for travels with the data rather than living in a
    // component somebody could forget to render.
    for (const field of ["headline", "caveat"]) {
      expect(propertyNames(wire, "WorkUploadParseWire")).toContain(field);
    }
    expect(wire).toContain("Correct us if we got it wrong");
  });
});

describe("the schema cannot hold a reading a scorer could join to", () => {
  it("sweeps every migration that touches the table, and there is more than one", () => {
    // The census under the three rules below. `0010` created the table and `0011` added the
    // coaching columns; reading only the first would have left the second unmeasured, which
    // is a population defect rather than an oversight about one file.
    const migrations = parseMigrations();
    expect(migrations).toContain(MIGRATION);
    expect(migrations.length).toBeGreaterThanOrEqual(2);
  });

  it("declares real columns to measure", () => {
    const columns = allColumns("work_upload_parse");
    expect(columns.length).toBeGreaterThanOrEqual(14);
    expect(columns).toContain("steps");
    expect(columns).toContain("cost_micro_usd");
    // The coaching columns, named so that losing them fails here rather than quietly
    // shrinking the population the scoring-name rule runs over.
    expect(columns).toContain("explanation");
    expect(columns).toContain("next_steps");
  });

  it("names no column a scorer could read", () => {
    const offenders: string[] = [];
    for (const column of allColumns("work_upload_parse")) {
      for (const concept of SCORING_CONCEPTS) {
        if (column.toLowerCase().includes(concept)) {
          offenders.push(`work_upload_parse.${column}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("holds no foreign key into the assessment record", () => {
    // A column is one way in; a join is the other. There is no reference from a reading to a
    // response or a node state, so no query can turn one into evidence about a learner.
    const references: string[] = [];
    for (const path of parseMigrations()) {
      const sql = read(path).replace(/--[^\n]*/g, "");
      for (const table of [
        "assessment_item_response",
        "student_node_state",
        "administration",
        "measurement",
      ]) {
        expect(sql, `${path} references public.${table}`).not.toContain(`public.${table}`);
      }
      references.push(
        ...[...sql.matchAll(/references\s+public\.(\w+)/g)].map((match) => match[1] ?? ""),
      );
    }
    // Exactly one reference, and it is to the photograph the reading is of.
    expect(references.length).toBeGreaterThanOrEqual(1);
    expect(new Set(references)).toEqual(new Set(["work_upload"]));
  });

  it("grants nothing that could write a reading into a scoring table", () => {
    // `app_service` is the only role this service runs as. Two privileges on one table, and
    // the absence of UPDATE is asserted in both directions in
    // `test/workUploadParseGrants.test.ts`; here the claim is narrower and about reach: no
    // migration touching this table hands out a privilege on anything but the table itself.
    const grants: string[] = [];
    for (const path of parseMigrations()) {
      grants.push(
        ...[
          ...read(path).matchAll(
            /grant\s+[\s\S]*?\s+on\s+public\.(\w+)\s+to\s+app_service/gi,
          ),
        ].map((match) => match[1] ?? ""),
      );
    }
    expect(grants.length).toBeGreaterThanOrEqual(1);
    expect(new Set(grants)).toEqual(new Set(["work_upload_parse"]));
  });
});
