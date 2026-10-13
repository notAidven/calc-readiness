import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { practiceSourceForNode } from "./domains";
import { practiceItemsById } from "./practiceChecker";
import {
  readStruggleRecord,
  recordStruggleAttempt,
  struggleLevelOf,
  templateStruggleLevelOf,
} from "./struggleStore";

/**
 * **THE PRACTICE SET IS SET IN STONE, AND KNOWING THE LEARNER IS WEAK DOES NOT MOVE IT.**
 *
 * A node's five-problem set is `1xL1 + 2xL2 + 2xL3` in easy-to-hard order, drawn by
 * `buildRandomizedSetByShape` and the per-domain builders around it. Struggle data reads
 * OUT of that set and must never read back into it: the whole reason the set can be scored
 * into mastery is that its composition is a property of the node rather than of the
 * learner's history, and a set quietly re-weighted towards what someone has been getting
 * wrong is no longer the same measurement from one attempt to the next.
 *
 * The drill is where the tailoring goes, and `adaptiveScheduler.test.ts` is where it is
 * checked. This file is the fence between the two.
 *
 * ## Two guards, because a source sweep and a behaviour test fail differently
 *
 * The sweep is what a NEW selection module cannot slip past: a builder that starts reading
 * the store fails here whether or not it changes any set today. The driven test is what
 * says the modules already in the tree do not act on the signal, which a sweep can never
 * show — a source can import a store and ignore it, and it can also reach the store through
 * three hops the sweep does not follow.
 *
 * ## Why the population is not "everything under `lessons/`"
 *
 * A source can only exhibit this defect if it has a hand in DECIDING which items a set
 * holds, so the filter is the call that does the deciding, taken over the enumerated
 * builders and draws this app has. `.cursor/rules/qa-verification.mdc` records what the
 * other kind of filter costs: a population scoped to where a mechanic is IMPLEMENTED left
 * nineteen surfaces that reimplemented it uncovered, green over eighteen broken boards.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function trackedWebSources(): string[] {
  const out = execFileSync("git", ["ls-files", "apps/web/src"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter((path) => /\.tsx?$/.test(path))
    .filter((path) => !/\.test\.tsx?$/.test(path));
}

function sourceOf(repoPath: string): string {
  return readFileSync(join(REPO_ROOT, repoPath), "utf8");
}

/**
 * Docblocks are stripped before the mechanic is looked for. Several modules here explain
 * the boundary at length, and a file that says "this must never read the struggle store"
 * would otherwise be flagged for saying exactly the right thing.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * The behaviour: this source decides, or asks something to decide, which items a practice
 * set or a retry draw contains.
 *
 * Enumerated over the real builders rather than pattern-matched on "practice", because
 * every surface in this lane has the word in its name and a filter that catches all of
 * them catches nothing.
 */
const CHOOSES_PRACTICE_ITEMS =
  /buildRandomized[A-Za-z0-9]*PracticeSet\(|buildRandomizedSetByShape\(|draw[A-Za-z0-9]*PracticeInstance\(|drawFreshInstance\(|startPracticeSession\(|createWebPracticeSession\(|\.createSession\(|\.drawFresh\(/;

/**
 * Any reach for the struggle signal, by module or by exported symbol.
 *
 * Deliberately the WORD rather than a list of the symbols that exist today. The narrower
 * version of this pattern named four suffixes (`Level`, `Record`, `Attempt`, `Tier`), and it
 * would have gone on passing over `itemWeightsFromStruggle` and `STRUGGLE_SHAPE_CAP` when the
 * shape grain added them — a fence that silently stops covering the thing it guards as the
 * module it guards grows. Comments are stripped before this runs, so prose about struggle
 * cannot trip it, and the census below derives the store's real exports and requires each one
 * to be caught.
 */
const READS_STRUGGLE = /struggle/i;

/** The two modules the fence exists to keep out of a selection path. */
const STRUGGLE_MODULES: readonly string[] = [
  "apps/web/src/lessons/struggleStore.ts",
  "apps/web/src/lessons/struggleWeights.ts",
];

const SELECTORS: readonly string[] = trackedWebSources().filter((path) =>
  CHOOSES_PRACTICE_ITEMS.test(stripComments(sourceOf(path))),
);

/**
 * SELECTION SOURCES THAT LEGITIMATELY TOUCH THE STRUGGLE STORE, each with its reason.
 *
 * Named rather than filtered out of the population, because a module that may touch it and
 * a module that has quietly started selecting on it look identical from outside the guard.
 * Both directions are asserted below, and the forward direction is the one that matters:
 * an entry has to keep proving it is only RECORDING.
 */
const RECORDS_BUT_DOES_NOT_SELECT: readonly {
  readonly path: string;
  readonly why: string;
}[] = [
  {
    path: "apps/web/src/lessons/LessonPractice.tsx",
    why: "It is the one surface that both draws a set and reports how the learner did on it, so it is the only place the two can meet at all. Its reach for the store is `recordStruggleAttempt` and nothing else, called from `handleSubmit` and `handleReveal` — after the instance in hand has resolved, and after the whole set was drawn at mount. The forward assertion below reads its actual call sites rather than taking that on trust.",
  },
];

const EXCUSED = new Set(RECORDS_BUT_DOES_NOT_SELECT.map((entry) => entry.path));

describe("struggle data never chooses a practice item", () => {
  it("sweeps a real population, derived from the builders rather than written down", () => {
    expect(
      trackedWebSources().length,
      "the tracked web sources resolved to nothing",
    ).toBeGreaterThan(300);
    expect(
      SELECTORS.length,
      "nothing in the app selects a practice item, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(2);
    // A floor with a shape: the shared source layer and the component that mounts a set
    // are both in it, so the population is not one incidental file.
    expect(SELECTORS).toContain("apps/web/src/lessons/practiceSession.ts");
    expect(SELECTORS).toContain("apps/web/src/lessons/LessonPractice.tsx");
    // **AND THE POPULATION IS SMALL BY CONSTRUCTION, WHICH IS SAID RATHER THAN HIDDEN.**
    // Two is not a thin sweep here, it is the whole of the app-side path: every other
    // selection decision is made inside `@cr/item-bank`, which the package assertion below
    // covers wholesale rather than file by file. A guard whose floor implies a broad sweep
    // it does not have is the failure this note exists to avoid.
  });

  it("watches the only door there is, which is the import path", () => {
    /*
     * **THE FENCE'S OWN COVERAGE, ARGUED RATHER THAN ASSUMED.**
     *
     * A selection source can reach this signal in exactly two ways: import it, or reimplement
     * it. The second no text pattern can see, and it is what the storage-key assertion at the
     * bottom of this file is for. The first always names a module path, so the paths are the
     * complete fence — PROVIDED nothing re-exports them, since a barrel would let a selector
     * import the same symbols under a path with no "struggle" in it.
     *
     * That is why this is not a census of the modules' symbol names. Requiring every export to
     * carry the word would fail on `attemptCost` and `slotsForTier`, and renaming those to
     * satisfy a regex would be the tail wagging the dog: they are unreachable without the
     * path, so the path is what to assert.
     */
    for (const path of STRUGGLE_MODULES) {
      const source = sourceOf(path);
      expect(source.length, `${path} could not be read`).toBeGreaterThan(0);
      const specifier = `./${path.split("/").pop()?.replace(/\.ts$/, "")}`;
      expect(
        READS_STRUGGLE.test(specifier),
        `an import of ${specifier} would not be noticed by this fence`,
      ).toBe(true);
    }

    const reExporters = trackedWebSources().filter((path) => {
      if (STRUGGLE_MODULES.includes(path)) {
        return false;
      }
      return /export\s[^;]*\bfrom\s+["'][^"']*struggle(Store|Weights)["']/i.test(
        stripComments(sourceOf(path)),
      );
    });
    expect(
      reExporters,
      "these re-export the struggle modules, so a selection source could reach them under a path this fence does not watch",
    ).toEqual([]);

    // Non-vacuity: real importers exist and every one of them names the path, so the claim
    // above is about a door that is actually used rather than one nobody has opened.
    const importers = trackedWebSources().filter((path) =>
      /from\s+["']\.\/struggle(Store|Weights)["']/.test(stripComments(sourceOf(path))),
    );
    expect(importers.length, "nothing imports the struggle modules").toBeGreaterThanOrEqual(
      3,
    );
    for (const path of importers) {
      expect(READS_STRUGGLE.test(stripComments(sourceOf(path))), path).toBe(true);
    }
  });

  it("no selection source reads the struggle store", () => {
    const selectors = SELECTORS.filter((path) => !EXCUSED.has(path));
    expect(
      selectors.length,
      "every selection source is excused, so nothing is being required of anything",
    ).toBeGreaterThanOrEqual(1);

    const leaking = selectors.filter((path) =>
      READS_STRUGGLE.test(stripComments(sourceOf(path))),
    );
    expect(
      leaking,
      "these sources decide which practice items a learner gets AND read how much they have been struggling, which is the one direction the signal may not flow",
    ).toEqual([]);
  });

  it("keeps every exception honest, in both directions", () => {
    for (const entry of RECORDS_BUT_DOES_NOT_SELECT) {
      // BACKWARD: an entry that has stopped selecting is excusing nothing, and a renamed
      // or deleted file cannot sit here forever exempting a path that no longer exists.
      expect(
        SELECTORS,
        `${entry.path} is a declared exception that no longer selects practice items at all`,
      ).toContain(entry.path);
      expect(entry.why.length, `${entry.path} has no reason`).toBeGreaterThan(120);

      // FORWARD, and this is the load-bearing half: the excused file may RECORD and may not
      // SELECT. Every struggle mention it carries has to be a `recordStruggleAttempt` call
      // or the import that brings one in.
      const body = stripComments(sourceOf(entry.path));
      const mentions = body.match(/[A-Za-z]*[Ss]truggle[A-Za-z]*/g) ?? [];
      expect(
        mentions.length,
        `${entry.path} is excused for recording struggle and does not mention it`,
      ).toBeGreaterThan(0);
      expect(
        [...new Set(mentions)].filter(
          (symbol) => symbol !== "recordStruggleAttempt" && symbol !== "struggleStore",
        ),
        `${entry.path} reaches for struggle data beyond recording an attempt, so it can no longer be excused as a recorder`,
      ).toEqual([]);

      // And no selection call on that page takes the signal as an argument.
      for (const call of body.match(/\.(createSession|drawFresh)\([^)]*\)/g) ?? []) {
        expect(call, `${entry.path} feeds struggle data into a draw`).not.toMatch(
          READS_STRUGGLE,
        );
      }
    }

    // The census: the two halves partition the population exactly.
    const selectors = SELECTORS.filter((path) => !EXCUSED.has(path));
    expect(new Set([...selectors, ...EXCUSED]).size).toBe(SELECTORS.length);
    for (const path of EXCUSED) {
      expect(SELECTORS, `${path} is excused but not in the population`).toContain(path);
    }
  });

  it("no package below the app can reach the store, only the number", () => {
    // The packages sit below `apps/web` and could not import upward, so what this is
    // really watching for is the answer to that: a copy of the store pushed DOWN into a
    // package, where the item bank could read it without ever importing from the app.
    //
    // `struggleLevel` is deliberately not swept for. It is the scalar the economy is handed
    // (`interleavedGrant`), and INV-COS-1 is satisfied precisely because that is all the
    // economy gets: a number, with no way back to the node it came from. The store's own
    // symbols are the thing no package may have.
    const storeSymbols = grepPackages(
      "struggleStore\\|struggleWeights\\|readStruggleRecord\\|recordStruggleAttempt\\|struggleTierOf\\|StruggleRecord\\|templateStruggleLevelOf\\|difficultyStruggleLevelOf\\|itemWeightsFromStruggle",
    );
    expect(
      storeSymbols,
      "a package below the app reaches the struggle store, which is either a copy of it or an import that should not resolve",
    ).toEqual([]);

    // The exemption made provable rather than assumed: the economy DOES take the scalar,
    // so the sweep above is not passing because nothing down there knows about any of this.
    const scalarReaders = grepPackages("struggleLevel");
    expect(
      scalarReaders,
      "no package reads the struggle scalar, so the assertion above is vacuous",
    ).toContain("packages/economy/src/earn.ts");
    // And every package that reads it is the economy. A second one appearing is worth a
    // look, because the item bank taking a "level" is the defect this whole file is about.
    expect(
      scalarReaders.filter((path) => !path.startsWith("packages/economy/")),
      "a package outside the economy has started reading a struggle level",
    ).toEqual([]);
  });
});

/** `git grep -l`, with its exit-1-on-no-match treated as the empty result it is. */
function grepPackages(pattern: string): readonly string[] {
  try {
    return execFileSync("git", ["grep", "-l", pattern, "--", "packages/", "engines/"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      .map((path) => path.trim());
  } catch {
    return [];
  }
}

/**
 * The behaviour, driven: the same seed draws the same five problems whether the learner has
 * never missed one or has missed every one.
 *
 * The sweep above proves REACH and this proves EFFECT, and neither implies the other. A
 * builder could read the store through three hops the regex does not follow, and it would
 * still have to change a set to matter, which is what shows up here.
 */
describe("a struggling learner is served the same practice set", () => {
  const NODE = "NUM.F";

  beforeEach(() => {
    localStorage.clear();
  });

  /** A fixed draw sequence, so any difference between the two runs is the store's doing. */
  function withFixedRandom<T>(run: () => T): T {
    const real = Math.random;
    let tick = 0;
    Math.random = () => {
      tick += 1;
      return (tick * 0.6180339887) % 1;
    };
    try {
      return run();
    } finally {
      Math.random = real;
    }
  }

  function setIds(): readonly string[] {
    const source = practiceSourceForNode(NODE);
    const created = source.createSession();
    return created.initialInstanceIds;
  }

  it("draws an identical set before and after a run of failures on the node", () => {
    const clean = withFixedRandom(setIds);
    // A floor: a set really was drawn, or "identical" holds over two empty lists.
    expect(clean.length).toBeGreaterThan(0);

    // Loaded at BOTH grains, because they reach different readers and a set could in
    // principle move on either. The shapes named here are the node's real ones, so the
    // buckets a builder would find are populated rather than filed under a stub id.
    const shapes = [
      ...new Set(
        [...practiceItemsById.values()]
          .filter((item) => item.node_id === NODE)
          .map((item) => item.template_id),
      ),
    ];
    expect(shapes.length, "no shapes found for the node under test").toBeGreaterThan(1);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      recordStruggleAttempt({
        nodeId: NODE,
        templateId: shapes[attempt % shapes.length] as string,
        difficulty: 3,
        correct: false,
        firstTry: false,
        revealed: true,
        hintsUsed: 3,
      });
    }
    // The store really is loaded, at both grains, or the comparison below is between two
    // identical no-signal states and says nothing at all.
    const record = readStruggleRecord(NODE);
    expect(struggleLevelOf(record)).toBe(1);
    expect(record.shapes.length).toBeGreaterThan(1);
    for (const shape of shapes) {
      expect(templateStruggleLevelOf(record, shape), shape).toBe(1);
    }

    const struggling = withFixedRandom(setIds);
    expect(struggling).toEqual(clean);
  });
});
