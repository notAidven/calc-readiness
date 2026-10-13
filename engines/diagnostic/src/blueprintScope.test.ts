import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { getNodesByScope } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

/**
 * THE WIDENING MUST BUMP `blueprint_version` (D-END4), and this is what makes that
 * checkable before the widening happens.
 *
 * ## The hazard, in one paragraph
 *
 * `scope` is not on the record. It is an ARGUMENT the reader supplies, so the
 * coverage denominator is a property of today's code and not of the administration
 * it is scoring. Measured in
 * `docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md` §4.4: the
 * same perfect entry diagnostic scores **1.000** over the six D1 nodes and **0.034**
 * over the 62 in-product nodes, because D1 carries 10 of the graph's 291 depth-weight.
 * So the day a reader widens without bumping `blueprint_version`, every baseline ever
 * collected is silently re-denominated, and a learner who has learned nothing since is
 * shown a gain of up to **+96.6 points** with the comparability gate reporting
 * `computed`. The gate cannot see it: it compares `blueprint_version`,
 * `scoring_model_version` and `form_id`, and the node set is part of none of them.
 *
 * `blueprint_version` is the field the gate already reads. Bumping it turns a silent
 * fabrication into an honest `not_comparable`, which is exactly what the field is for.
 * That is the whole of D-END4, and until this file existed nothing enforced it.
 *
 * ## Why this is not "if a widening exists, it must bump the version"
 *
 * That guard would have no inputs today, because the widening has not happened, and a
 * guard over an empty population passes while measuring nothing. `.cursor/rules/`
 * records `#193` as exactly that shape: a validator rule whose population had been
 * empty since a design change removed all 63 of its inputs, green throughout.
 *
 * So the trip wire is the RELATIONSHIP rather than the event. This file pins what the
 * instrument IS at the current `blueprint_version` — which nodes it measures, and
 * which files compose that set, with the expression each one uses — and fails when any
 * of it moves under a version that has not. It therefore has something to assert on a
 * tree where nothing has been widened: it is measuring the six-node instrument right
 * now, every run.
 *
 * ## Why the node set alone is not enough, and this is the part worth reading
 *
 * There are TWO ways to widen, and they fail different assertions:
 *
 * 1. **Flip `product_scope` in the registry.** `getNodesByScope("mvp")` starts
 *    returning more nodes and every call site follows at once. Caught by
 *    {@link MEASURED_NODE_IDS}.
 * 2. **Point the call sites at `inProductScope()` instead.** The registry does not
 *    move, `getNodesByScope("mvp")` still returns exactly six, and the instrument is
 *    nonetheless 62 nodes wide. **A guard that pinned only the resolved node set would
 *    stay green through this.** It is also the route the design record RECOMMENDS
 *    (§3.1: it touches no authored data and leaves the registry's other consumers
 *    alone), so it is the likely one. Caught by {@link COMPOSITION}, which pins which
 *    expression each composition point uses.
 *
 * ## What is already true, and is pinned here as fact
 *
 * The two shipped readers ALREADY disagree about the denominator, and that is not a
 * defect to fix in this file — it is the live state, and it is why the hazard is one
 * edit away rather than hypothetical. `reads.ts` passes the six explicitly, with a
 * comment saying why; `computeStudentReadiness` and `computeCoverageMeasurementFrom`
 * defaults are `inProductScope()`, 62 nodes. Both groups are pinned below, so neither
 * can drift into the other quietly.
 */

/* ─────────────────────────── the frozen record ─────────────────────────── */

/**
 * How a composition point names the node set it measures or denominates over.
 *
 * `diagnostic-content-derived` arrived with blueprint_version 3: the two walk
 * composition points and the authenticated measurement read now pass
 * `@cr/item-bank`'s `DIAGNOSTIC_WALK_SCOPE`, which is derived per node from the
 * authored content (in product, ≥3 servable walk items per form, a practice pool to
 * place into) rather than read off a `product_scope` flag. It is a THIRD widening
 * route and not a rename of either of the other two: the registry does not move (so
 * {@link MEASURED_NODE_IDS} cannot see it) and `inProductScope()` is not called (so
 * the old two-pattern list could not see it either) — which is exactly what happened
 * on the run that landed this, where the derivation dropped `browserRuntime.ts`
 * entirely and the "does count a scope expression that is real code" control below
 * was what said so.
 */
type ScopeExpression = "mvp-six" | "in-product-62" | "diagnostic-content-derived";

interface FrozenInstrument {
  /**
   * Every node the SIX-NODE expression resolves to, sorted. Sorted rather than in
   * registry order because this is a SET claim: a reordering of the registry is not a
   * different instrument, and a guard that failed on one would be re-pinned by the
   * next author without reading why it exists.
   *
   * Note this stays the `mvp` set at every version, because it is the registry's answer
   * and the registry has not moved. **Since blueprint_version 3 that is no longer the
   * set the walk administers**, and the two coming apart is the whole hazard: the walk's
   * scope is now `@cr/item-bank`'s content-derived `DIAGNOSTIC_WALK_SCOPE`, and the
   * per-version record of THAT set lives in
   * `services/diagnostic-runtime/src/walkInstrumentScope.test.ts` — a sibling rather than
   * a field here, because `@cr/item-bank` depends on this engine and importing it back
   * would invert the dependency (the same reason `liveBlueprintVersion` reads its
   * constant out of source). What this file can still see, and does, is the registry set
   * plus WHICH EXPRESSION each composition point names, which is what catches the widening
   * routes that leave the registry alone.
   */
  measured_node_ids: readonly string[];
  /**
   * Every file in the diagnostic lane that composes a scope, and which expressions it
   * uses. Paths are repo-relative and POSIX-separated; expressions are sorted.
   *
   * A LIST per file rather than one expression, because a file can legitimately name
   * two — `reads.ts` denominates the measurement over the instrument's scope while
   * still rendering the city's own six — and the single-value form recorded whichever
   * pattern matched first, so the second could change unobserved.
   */
  composition: Readonly<Record<string, readonly ScopeExpression[]>>;
}

/**
 * The instrument each `blueprint_version` denotes.
 *
 * **If you are here because you widened the diagnostic: this is the record you owe.**
 * Add an entry for the new version with the new node set and the new composition, and
 * LEAVE THE OLD ENTRY ALONE. The old entry is what says which instrument every
 * baseline already in the database was taken against; editing it in place is the
 * "re-denominating in place" that D-END4 forbids in as many words.
 *
 * Registering rather than merely bumping is deliberate. A bare bump with no record
 * would pass a version-changed check once and leave the NEXT widening free to ride the
 * new version unrecorded, which is the same hole one release later.
 */
const INSTRUMENT_BY_BLUEPRINT_VERSION: ReadonlyMap<number, FrozenInstrument> = new Map([
  [
    2,
    {
      measured_node_ids: ["NUM.2", "NUM.3", "NUM.4", "NUM.5", "NUM.F", "NUM.S"],
      composition: {
        // The browser walk's scope, and the scope its measurement is denominated over.
        "apps/web/src/diagnostic/browserRuntime.ts": ["mvp-six"],
        // The server walk's scope.
        "services/diagnostic-runtime/src/aurora-server.ts": ["mvp-six"],
        // The authenticated read's denominator, passed explicitly so a full pass reads
        // as 100% rather than as a fraction of the 62-node product scope.
        "services/diagnostic-api/src/reads.ts": ["mvp-six"],
        // `createMvpAssessmentBlueprint`, the retained v1 slot descriptor. Not the live
        // instrument (it declares `blueprint_version: 1`), and in the population
        // because a registry flip reaches it too.
        "engines/diagnostic/src/index.ts": ["mvp-six"],
        // The 62-node DEFAULTS. Reached only when a caller omits `scope`, which the
        // shipped authenticated read does not do. These are the other side of the
        // denominator disagreement and are pinned so it cannot widen by omission.
        "services/diagnostic-runtime/src/measurement-read.ts": ["in-product-62"],
        "services/diagnostic-runtime/src/coverage-read.ts": ["in-product-62"],
      },
    },
  ],
  [
    // THE WIDENING. The walk now administers every in-product node the authored content
    // supports — derived per node in `@cr/item-bank`'s `diagnostic-scope.ts`, twenty of
    // the sixty-two at the time of writing, spanning nine of the ten domains. The
    // shortfall to 62 is an ASSESSMENT-ITEM gap and not a lesson gap: 59 nodes have a
    // lesson pack and a practice pool, and the 42 outside this list have no walk items.
    //
    // The node set itself is recorded in `walkInstrumentScope.test.ts`, which can import
    // the item bank; `measured_node_ids` below is still the registry's six, because the
    // registry did not move and that is the point of keeping the two fields apart.
    3,
    {
      measured_node_ids: ["NUM.2", "NUM.3", "NUM.4", "NUM.5", "NUM.F", "NUM.S"],
      composition: {
        // Both walk composition points now pass the content-derived scope.
        "apps/web/src/diagnostic/browserRuntime.ts": ["diagnostic-content-derived"],
        "services/diagnostic-runtime/src/aurora-server.ts": ["diagnostic-content-derived"],
        // TWO expressions, and the pair is the point: `GET /api/measurement` denominates
        // over the instrument's own scope, while the CITY read beside it still renders the
        // registry's six. Recorded as a list so neither can change without this failing.
        "services/diagnostic-api/src/reads.ts": ["diagnostic-content-derived", "mvp-six"],
        // Unchanged from version 2: the retained v1 slot descriptor, and the two 62-node
        // reader defaults reached only when a caller omits `scope`.
        "engines/diagnostic/src/index.ts": ["mvp-six"],
        "services/diagnostic-runtime/src/measurement-read.ts": ["in-product-62"],
        "services/diagnostic-runtime/src/coverage-read.ts": ["in-product-62"],
      },
    },
  ],
  [
    // THE SECOND WIDENING, and the COMPOSITION IS UNCHANGED — which is exactly the shape this
    // file was written to be unable to see, and why `walkInstrumentScope.test.ts` exists
    // beside it. Both walk points still pass `diagnostic-content-derived`; what changed is
    // what that derivation returns, because `practice-walk.ts` froze walk forms from the
    // lesson-practice templates of 36 more nodes and `diagnostic-scope.ts` now cuts the result
    // at the placement horizon. Thirty-four nodes across all ten domains, against version 3's
    // twenty across nine.
    //
    // Recorded here anyway rather than skipped. A version with no entry fails the first
    // assertion below, and leaving 4 unregistered on the grounds that "nothing this file can
    // see moved" would put the NEXT widening back in the hole D-END4 closed: it could ride
    // version 4 unrecorded and the composition check would have nothing to compare against.
    4,
    {
      measured_node_ids: ["NUM.2", "NUM.3", "NUM.4", "NUM.5", "NUM.F", "NUM.S"],
      composition: {
        "apps/web/src/diagnostic/browserRuntime.ts": ["diagnostic-content-derived"],
        "services/diagnostic-runtime/src/aurora-server.ts": ["diagnostic-content-derived"],
        "services/diagnostic-api/src/reads.ts": ["diagnostic-content-derived", "mvp-six"],
        "engines/diagnostic/src/index.ts": ["mvp-six"],
        "services/diagnostic-runtime/src/measurement-read.ts": ["in-product-62"],
        "services/diagnostic-runtime/src/coverage-read.ts": ["in-product-62"],
      },
    },
  ],
  [
    // THE THIRD WIDENING, and again the COMPOSITION IS UNCHANGED for the same reason: both walk
    // points still pass `diagnostic-content-derived` and what moved is what that derivation
    // returns. Nothing in `diagnostic-scope.ts` was edited at all this time. `POL.6` and `POL.7`
    // were authored, the sixth era became fully servable, and `placementHorizon` advanced to the
    // seventh on its own, taking the instrument from thirty-four nodes to forty.
    //
    // That is the derivation working as designed, and it is also why the version has to be
    // recorded: an instrument can widen here with no diff in this package, so a version left
    // unregistered would let the next widening ride an existing version and the composition
    // check would have nothing to compare against.
    5,
    {
      measured_node_ids: ["NUM.2", "NUM.3", "NUM.4", "NUM.5", "NUM.F", "NUM.S"],
      composition: {
        "apps/web/src/diagnostic/browserRuntime.ts": ["diagnostic-content-derived"],
        "services/diagnostic-runtime/src/aurora-server.ts": ["diagnostic-content-derived"],
        "services/diagnostic-api/src/reads.ts": ["diagnostic-content-derived", "mvp-six"],
        "engines/diagnostic/src/index.ts": ["mvp-six"],
        "services/diagnostic-runtime/src/measurement-read.ts": ["in-product-62"],
        "services/diagnostic-runtime/src/coverage-read.ts": ["in-product-62"],
      },
    },
  ],
  [
    // THE FOURTH WIDENING, and the LAST ONE OF THIS KIND. `POL.5` was authored, which was the
    // final in-product node holding no content of any sort, so the seventh era became fully
    // servable and `placementHorizon` — which had nothing left to stop at — now admits the
    // whole product. Sixty-two nodes, up from forty.
    //
    // The composition is unchanged again, for the third version running: both walk points still
    // pass `diagnostic-content-derived` and nothing in `diagnostic-scope.ts` was edited. What is
    // worth noticing at this version rather than at the ones before it is that the two 62-node
    // reader DEFAULTS below have stopped disagreeing with the instrument. They were pinned as
    // "the other side of the denominator disagreement" at version 2, and they now denominate
    // over the same set the walk administers. They stay recorded as `in-product-62` because that
    // is still the expression those files name; the coincidence is a fact about today's content
    // and not a change of composition, and reading them as interchangeable is how a future
    // narrowing of the instrument would go unnoticed at the read layer.
    6,
    {
      measured_node_ids: ["NUM.2", "NUM.3", "NUM.4", "NUM.5", "NUM.F", "NUM.S"],
      composition: {
        "apps/web/src/diagnostic/browserRuntime.ts": ["diagnostic-content-derived"],
        "services/diagnostic-runtime/src/aurora-server.ts": ["diagnostic-content-derived"],
        "services/diagnostic-api/src/reads.ts": ["diagnostic-content-derived", "mvp-six"],
        "engines/diagnostic/src/index.ts": ["mvp-six"],
        "services/diagnostic-runtime/src/measurement-read.ts": ["in-product-62"],
        "services/diagnostic-runtime/src/coverage-read.ts": ["in-product-62"],
      },
    },
  ],
]);

/* ───────────────────────── deriving today's state ───────────────────────── */

/**
 * The node set each `blueprint_version` administers, read as TEXT out of
 * `services/diagnostic-runtime/src/walkInstrumentScope.test.ts`.
 *
 * That file owns the node-set half of the D-END4 record because it is downstream of the item
 * bank; this file cannot import it without inverting the dependency. But the two halves
 * together are what "the instrument" means, so the frozen-versions check has to see both, and
 * parsing the sibling's own map is the only way to do that from here. Same precedent as
 * `test/diagnosticSimScopeMirror.test.ts`, which reads a sim harness's list back the same way
 * rather than importing it.
 *
 * Returns an empty map on a parse failure, and the caller has a floor that fails on one, so a
 * refactor that renames the sibling's map cannot quietly reduce the fingerprint to one half.
 */
function administeredNodeSetsBySiblingRecord(): ReadonlyMap<number, string> {
  const path = join(
    repoRoot(),
    "services/diagnostic-runtime/src/walkInstrumentScope.test.ts",
  );
  const source = readFileSync(path, "utf8");
  const start = source.indexOf("ADMINISTERED_BY_BLUEPRINT_VERSION");
  if (start === -1) {
    return new Map();
  }
  const sets = new Map<number, string>();
  // Each entry is `[<version>, [ "ID", ... ]]`, possibly across lines. Matched by the version
  // number followed by the next bracketed run of quoted ids, which is the shape the sibling
  // uses for every entry and which a reformat cannot change without changing the ids.
  for (const match of source.slice(start).matchAll(/\[\s*(\d+)\s*,\s*\[([^\]]*)\]/g)) {
    const version = Number(match[1]);
    const ids = [...(match[2] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1] as string);
    if (ids.length > 0) {
      sets.set(version, JSON.stringify([...ids].sort()));
    }
  }
  return sets;
}

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 12; up += 1) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
        name?: string;
      };
      if (pkg.name === "calc-readiness") {
        return dir;
      }
    } catch {
      // Not this level; keep walking.
    }
    dir = dirname(dir);
  }
  throw new Error("could not find the repo root from this test file");
}

const ROOT = repoRoot();

/** Lanes a diagnostic scope could be composed in. `db/`, `docs/` and `output/` cannot. */
const SEARCH_ROOTS = ["apps", "engines", "services", "packages"];

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "__screenshots__",
  ".vite",
  "sim",
]);

function sources(dir: string, found: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    // A directory that vanished mid-run. Two other lanes are editing this tree
    // concurrently and a scratch file appearing and disappearing must not fail a
    // guard about the diagnostic's scope.
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let isDirectory: boolean;
    try {
      isDirectory = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDirectory) {
      if (!SKIP_DIR.has(entry)) {
        sources(full, found);
      }
      continue;
    }
    if (!/\.tsx?$/.test(entry) || entry.includes(".test.")) {
      continue;
    }
    found.push(full);
  }
  return found;
}

/**
 * Drop whole-line comments, keeping line count so a failure can still be located.
 *
 * Deliberately line-level rather than a full tokenizer, and the two controls below are
 * what make that honest. The population is a handful of files whose scope expressions
 * each sit on their own line of code, and the one comment that would otherwise be
 * counted is a real docblock in `walk-engine.ts` naming BOTH expressions as the
 * sanctioned arguments. A stripper is load-bearing wherever it appears — strip too
 * much and this file goes green over nothing, strip too little and it fires on prose
 * until somebody deletes it — so both directions are asserted against the real tree.
 */
function codeLines(source: string): string[] {
  return source.split("\n").map((line) => (/^\s*(\*|\/\/|\/\*)/.test(line) ? "" : line));
}

/** The symbols that make a file part of the diagnostic's composition, not just a reader of the graph. */
const COMPOSITION_SYMBOLS = [
  "FrontierWalkConfig",
  "createWalkRuntime",
  "createFrontierWalkEngine",
  "computeCoverageMeasurementFromRecords",
  "computeStudentReadiness",
  "AssessmentBlueprint",
];

const SCOPE_PATTERN: ReadonlyArray<readonly [ScopeExpression, RegExp]> = [
  ["mvp-six", /getNodesByScope\(\s*"mvp"\s*\)/],
  ["in-product-62", /inProductScope\(/],
  ["diagnostic-content-derived", /DIAGNOSTIC_WALK_SCOPE/],
];

/**
 * Today's composition, derived: every non-test source in the four lanes that both
 * takes part in diagnostic composition AND names a scope expression in CODE.
 *
 * Scoped by BEHAVIOUR rather than by directory. "Decides what the instrument measures"
 * is a fact about a file's role, and the six that qualify are spread over three
 * workspaces written months apart; a sweep of `engines/diagnostic/` would have found
 * one of them.
 *
 * EVERY expression a file names is collected, not the first one that matches. The
 * single-value form short-circuited on the first pattern in list order, so a file
 * naming two — which `reads.ts` now does — recorded only the earlier one and the other
 * could be changed with nothing watching.
 */
function deriveComposition(): Record<string, readonly ScopeExpression[]> {
  const found: Record<string, readonly ScopeExpression[]> = {};
  for (const root of SEARCH_ROOTS) {
    for (const file of sources(join(ROOT, root))) {
      let raw: string;
      try {
        raw = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (!COMPOSITION_SYMBOLS.some((symbol) => raw.includes(symbol))) {
        continue;
      }
      const code = codeLines(raw).join("\n");
      const expressions = SCOPE_PATTERN.filter(([, pattern]) => pattern.test(code))
        .map(([expression]) => expression)
        .sort();
      if (expressions.length > 0) {
        found[relative(ROOT, file).split(sep).join("/")] = expressions;
      }
    }
  }
  return found;
}

/**
 * The live walk's blueprint version, read off the shipped constant's source.
 *
 * Read rather than imported: `services/diagnostic-runtime` depends on this engine, so
 * importing it back would invert the dependency. Fails loudly when the declaration
 * cannot be found, because a regex that silently misses would hand every assertion
 * below a `NaN` to compare against.
 */
function liveBlueprintVersion(): number {
  const path = "services/diagnostic-runtime/src/walk-runtime.ts";
  const source = readFileSync(join(ROOT, path), "utf8");
  const match = /export const DEFAULT_WALK_BLUEPRINT_VERSION\s*=\s*(\d+)/.exec(source);
  if (!match) {
    throw new Error(
      `${path} no longer declares DEFAULT_WALK_BLUEPRINT_VERSION as a literal. ` +
        `This guard reads it from source; teach it the new shape rather than deleting it.`,
    );
  }
  return Number(match[1]);
}

/* ──────────────────────────────── the guard ─────────────────────────────── */

const VERSION = liveBlueprintVersion();
const COMPOSITION = deriveComposition();
const MEASURED_NODE_IDS = getNodesByScope("mvp")
  .map((node) => node.id)
  .sort();

const REGISTER_HINT =
  `Widening the instrument is legitimate and this is the record it owes (D-END4). ` +
  `Add an entry to INSTRUMENT_BY_BLUEPRINT_VERSION for the new version with the new ` +
  `node set and composition, and leave the old entry untouched: it is what says which ` +
  `instrument the baselines already in the database were taken against.`;

describe("the instrument recorded at this blueprint_version (D-END4)", () => {
  it("derived a composition to check, so the sweep is not passing over nothing", () => {
    // The #193 floor. Every assertion below is a comparison against a derived set, and
    // a derivation that quietly returns nothing satisfies most of them.
    expect(
      Object.keys(COMPOSITION).length,
      "no file in apps/, engines/, services/ or packages/ was found composing a diagnostic scope, which cannot be true while the diagnostic runs",
    ).toBeGreaterThanOrEqual(4);
    expect(
      MEASURED_NODE_IDS.length,
      "the measured scope resolved to nothing",
    ).toBeGreaterThanOrEqual(6);
  });

  it("found every expression class, so none can go empty and pass", () => {
    // A floor on SIZE would be satisfied by six files of any one kind. The hazard is one
    // class swallowing the others, so each is floored on its own. Every class in
    // `ScopeExpression` must still be named somewhere in the tree: the day one is not,
    // either that reader has been re-pointed or the pattern for it has stopped matching,
    // and both are things this file exists to notice. The counts are minimums and stay
    // deliberately loose — the file-by-file equality below is the exact claim.
    const counts = new Map<ScopeExpression, number>();
    for (const expressions of Object.values(COMPOSITION)) {
      for (const expression of expressions) {
        counts.set(expression, (counts.get(expression) ?? 0) + 1);
      }
    }
    expect(
      counts.get("diagnostic-content-derived") ?? 0,
      "nothing composes the content-derived instrument, which is either a revert to the six-node scope or a broken pattern",
    ).toBeGreaterThanOrEqual(2);
    expect(
      counts.get("mvp-six") ?? 0,
      "the registry's six-node expression has vanished from the derivation; the v1 slot descriptor and the city read both still name it",
    ).toBeGreaterThanOrEqual(2);
    expect(
      counts.get("in-product-62") ?? 0,
      "the 62-node reader defaults have vanished from the derivation",
    ).toBeGreaterThanOrEqual(1);
  });

  it("the live blueprint_version has a recorded instrument", () => {
    expect(
      INSTRUMENT_BY_BLUEPRINT_VERSION.has(VERSION),
      `blueprint_version is ${VERSION} and no instrument is recorded for it. ${REGISTER_HINT}`,
    ).toBe(true);
  });

  it("measures exactly the node set recorded for this version", () => {
    // Catches widening route 1: a `product_scope` flip in the registry, which every
    // call site follows at once.
    const frozen = INSTRUMENT_BY_BLUEPRINT_VERSION.get(VERSION);
    expect(
      MEASURED_NODE_IDS,
      `the diagnostic measures a different node set than blueprint_version ${VERSION} ` +
        `records, so every baseline stamped with ${VERSION} would be re-denominated ` +
        `against an instrument it was not taken on, and the comparability gate would ` +
        `report "computed" while doing it. ${REGISTER_HINT}`,
    ).toEqual([...(frozen?.measured_node_ids ?? [])]);
  });

  it("composes that node set at exactly the files recorded, with the recorded expression", () => {
    // Catches widening route 2: the call sites re-pointed at `inProductScope()`. The
    // registry does not move and the assertion above stays green, which is why this
    // one exists. It also catches a NEW composition point appearing, and an existing
    // one being deleted, because it is an equality and not a containment.
    const frozen = INSTRUMENT_BY_BLUEPRINT_VERSION.get(VERSION);
    expect(
      COMPOSITION,
      `the diagnostic's scope is composed differently than blueprint_version ${VERSION} ` +
        `records. A call site re-pointed from getNodesByScope("mvp") to inProductScope() ` +
        `widens the instrument to 62 nodes without touching the registry, so the node-set ` +
        `assertion cannot see it. ${REGISTER_HINT}`,
    ).toEqual(frozen?.composition);
  });

  it("keeps the frozen versions frozen: an older instrument is a historical fact", () => {
    // Re-denominating in place is the alternative D-END4 forbids. An entry for a
    // superseded version describes records that already exist and cannot be re-taken,
    // so it may only ever be added to this map, never edited. The check that can be
    // made mechanically is that a superseded version is not silently the live one's
    // twin: if two versions record the same instrument, one of the bumps bought
    // nothing and the pair is worth a second look.
    //
    // **THE FINGERPRINT SPANS BOTH HALVES OF THE RECORD, and it has to.** The instrument is
    // this file's registry-and-composition view PLUS the node set the sibling records, and
    // versions 3 and 4 are genuinely identical on this side: both walk points pass
    // `diagnostic-content-derived` and the registry never moved, while what that derivation
    // RETURNS went from twenty nodes to thirty-four. Fingerprinting on this side alone would
    // have reported that bump as buying nothing, which is false, and the only way to fix it
    // without weakening the claim is to include the half this file defers to. It is read as
    // TEXT for the same reason the node set is not a field here: `@cr/item-bank` depends on
    // this engine, so importing it would invert the edge.
    const recorded = [...INSTRUMENT_BY_BLUEPRINT_VERSION.entries()];
    const administered = administeredNodeSetsBySiblingRecord();
    expect(
      administered.size,
      "the sibling record could not be read, so this check has half a fingerprint",
    ).toBeGreaterThanOrEqual(recorded.length);
    const fingerprints = recorded.map(([version, instrument]) =>
      JSON.stringify([
        instrument.measured_node_ids,
        instrument.composition,
        administered.get(version) ?? `UNRECORDED:${version}`,
      ]),
    );
    expect(
      new Set(fingerprints).size,
      `two blueprint_versions record the identical instrument, so at least one bump ` +
        `did not correspond to a change of instrument. Either the bump was unnecessary ` +
        `or the new entry was copied and not edited.`,
    ).toBe(recorded.length);
  });
});

describe("the comment filter this guard depends on", () => {
  // Both directions, against the real tree rather than fixtures, because a filter that
  // is wrong in either direction makes every assertion above meaningless.

  it("does not count a scope expression that only appears in prose", () => {
    // `walk-engine.ts` names BOTH expressions in `FrontierWalkConfig.scope`'s docblock
    // as the two sanctioned arguments, and composes neither. Under-filtering would put
    // it in the population and the composition equality would fail on a comment.
    const path = "engines/diagnostic/src/walk-engine.ts";
    const raw = readFileSync(join(ROOT, path), "utf8");
    expect(raw, "the docblock this control is written for has gone").toMatch(
      /inProductScope\(\)/,
    );
    expect(
      Object.keys(COMPOSITION),
      "a docblock mention was counted as a composition point",
    ).not.toContain(path);
  });

  it("does count a scope expression that is real code", () => {
    // Over-filtering is the dangerous direction: it empties the population silently.
    // These three are live composition, on their own lines, in three workspaces.
    for (const path of [
      "apps/web/src/diagnostic/browserRuntime.ts",
      "services/diagnostic-api/src/reads.ts",
      "services/diagnostic-runtime/src/aurora-server.ts",
    ]) {
      expect(
        Object.keys(COMPOSITION),
        `${path} composes a diagnostic scope in code and the filter dropped it`,
      ).toContain(path);
    }
  });
});
