/**
 * **ERA FOUR'S ALLEGIANCE MODEL HAS NO TOPOLOGY AND NO CLOCK.**
 *
 * The behaviour, stated before the population is written down: *a source that decides which
 * claimant a district goes to.* Two defects are possible in exactly those sources and
 * nowhere else, which is why one sweep carries both.
 *
 * ## Defect one: importing era one's topology into a crisis that does not have one
 *
 * `docs/superpowers/specs/crisis-reference-packs/README.md` §4 rules the four propagation
 * crises apart as a fact about the picture rather than about the mechanics:
 *
 * > | 1 Hard Winter | Frost | **Tile adjacency.** A front, advancing inward from the rim |
 * > | 4 Succession | Allegiance | **Nothing spatial at all.** A district decides, on its
 * >   own, in favour of whoever is currently strongest |
 *
 * and it says *"nothing else in this pass may blur those four"*. The same document is
 * explicit that *"era four has no propagation"* would be a FALSE answer — a district
 * drifting to a claimant is propagation with an unusual topology, and the topology is the
 * design. So the claim here is not that nothing propagates. It is that era four's topology
 * is a GLOBAL COMPARISON and a TOTAL ORDER, and that neither of those is a neighbour
 * relation: a district has no position, no extent and no neighbours.
 *
 * **The failure mode this guards is a rewrite by analogy.** Era one's engine is right there,
 * it works, and the cheapest way to make a second crisis is to copy its shape and change
 * the nouns. A `col`, a `row`, a `rim_depth` or an `adjacent()` in the allegiance model is
 * that copy arriving, and it would be invisible in review because it would look exactly
 * like the crisis the reviewer already knows.
 *
 * ## Defect two: a cycle that turns on a clock
 *
 * D-CRISIS-16 rules it directly and calls it INV-CRISIS-1 applied to *"the one mechanism in
 * this amendment that invites a timer"*: **a cycle must advance on player actions and never
 * on elapsed time.** The reasons are the two D-CRISIS-3 already ruled on — a drift keyed to
 * elapsed time would be farmable by idling and untestable without a fake clock — and the
 * presentation brief adds a third at §2.6: era four has a cycle, *"and a cycle that appeared
 * to turn on its own would read as a timer"*. `test/hardWinterClockless.test.ts` is the same
 * guard for era one and the token list is deliberately identical, so the two crises cannot
 * come apart on what counts as a clock.
 *
 * ## Why the population is derived from a WORD and not from a directory
 *
 * `.cursor/rules/qa-verification.mdc` records that the ordinary way a guard here fails is a
 * population scoped by where a mechanic is IMPLEMENTED when the claim is about a BEHAVIOUR.
 * A directory list would scope this to `engines/game/src`, and the defect that actually
 * worries anybody is a surface that reimplements the decision rather than calling the
 * reducer — which would live in `apps/web` and would fall outside a directory filter while
 * exhibiting exactly the behaviour.
 *
 * So the population is **every tracked non-test `.ts`/`.tsx` source that names
 * `allegiance`**, wherever it lives, including a file nobody has written yet. That is the
 * model's central noun: a source that names it is a source that can decide one.
 *
 * **A second, independent derivation is asserted against the first.** The by-name set —
 * every tracked non-test source whose basename says `succession` — must equal the
 * by-behaviour set. Two derivations from the tree agreeing is a much stronger composition
 * claim than either alone and than any list written here, and when they come apart that is
 * a decision somebody has to make rather than a failure to route around: a succession
 * module that names no allegiance, or a module elsewhere that does.
 *
 * ## THE TWO DERIVATIONS HAVE COME APART ONCE, AND THIS IS THE DECISION THAT WAS MADE
 *
 * The shared crisis scene-asset framework (#414) put two files in this population that are
 * not era four's: `crisis/registry.ts` and `crisis/propagation.ts` name an allegiance
 * because they name all four crises. Between them they carry eighteen spatial hits, and
 * **every one is era ONE's shape being quoted** — the separation table's row for the Hard
 * Winter reads *"Tile adjacency, a front advancing inward from the rim"*, the framework's
 * topology union has to be able to express era one's `tile-adjacency` variant to express
 * era four's `unlinked` one, `row` is the variable a table lookup walks, and the one
 * `radius` is inside the sentence saying era four has no ground layer to draw one on. Era
 * four's own seam in the same directory, `crisis/succession.ts`, scores zero.
 *
 * **They are named in {@link DOCUMENTS_ALL_FOUR_CRISES} rather than filtered out**, and
 * the reason is this repository's own rule (`.cursor/rules/qa-verification.mdc`): a
 * population is scoped by who exhibits the behaviour, and narrowing a derivation until a
 * guard passes is how a reveal defect once reached eighteen boards with its guard green.
 * A file that legitimately does not owe the property and a file that forgot it look
 * identical from outside the guard, so the difference is written down with its reason and
 * asserted in both directions. See that list's own docblock for what each direction
 * catches.
 *
 * Lives in `test/` for the reason `hardWinterClockless.test.ts` does: its subject is the
 * tracked file list rather than one workspace, and the web lane's jsdom harness cannot read
 * source with `node:fs`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

/** The word the model turns on. A source that names it can decide one. */
const ALLEGIANCE = /allegiance/i;

function isSource(path: string): boolean {
  const base = posix.basename(path);
  return /\.(ts|tsx)$/.test(base) && !/\.test\.(ts|tsx)$/.test(base);
}

function trackedSources(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "*.ts", "*.tsx"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.length > 0)
    .filter(isSource);
}

/** By behaviour: every non-test source that names an allegiance. */
function allegianceSources(): string[] {
  return trackedSources()
    .filter((path) => ALLEGIANCE.test(readFileSync(posix.join(repoRoot, path), "utf8")))
    .sort();
}

/** By name: every non-test source whose basename says it belongs to this crisis. */
function successionNamedSources(): string[] {
  return trackedSources()
    .filter((path) => /succession/i.test(posix.basename(path)))
    .sort();
}

/**
 * **THE ONE MEMBER THAT LEGITIMATELY DOES NOT OWE THE TOPOLOGY PROPERTY**, with its reason.
 *
 * The mechanic inventory's whole job is to say what era four's instance of each of era
 * one's mechanics is, and for the propagation row that means saying what era four does NOT
 * have. *"There is no edge"*, *"nothing spatial at all"*, *"no ground changes hands"* and
 * *"tile adjacency"* are the sentences that make the contrast, and they are string
 * literals rather than comments because the inventory is data a test reads. A guard that
 * stripped comments and then failed on the file explaining the rule would be the rule
 * eating its own documentation.
 *
 * Asserted in BOTH directions below, which is what makes the exemption provable rather
 * than assumed:
 *
 *  - an entry that stops qualifying fails, so a renamed or deleted module cannot sit here
 *    exempting nothing;
 *  - **an entry that stops needing the exemption fails**, which is the direction that
 *    matters: if the inventory stops naming era one's topology it has stopped drawing the
 *    contrast the propagation row exists to draw, and the exemption is excusing a file that
 *    has quietly lost its argument.
 *
 * The clock sweep has no exceptions and takes none: no member has any business naming a
 * timer, in prose or otherwise, and the inventory does not.
 */
const MAY_NAME_A_TOPOLOGY: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "engines/game/src/succession-mechanics.ts",
    why:
      "The mechanic inventory answers era one's twenty-four rows for era four, and the " +
      "propagation, ruin and lost-ground rows are answered by naming what era one has " +
      "and era four does not. Those sentences are data rather than comments, so the " +
      "stripper cannot reach them, and a guard that failed here would be forbidding the " +
      "file whose job is to state the rule.",
  },
];

/**
 * **THE FILES WHOSE SUBJECT IS ALL FOUR CRISES, so era one's shapes are their content.**
 *
 * A second list rather than two more rows in {@link MAY_NAME_A_TOPOLOGY}, because it is a
 * different claim and it excuses a different thing. `succession-mechanics.ts` IS era four's
 * — it is in the by-name derivation and belongs there — and it is excused from the spatial
 * sweep alone. These two are not era four's at all: they are the shared framework, they name
 * an allegiance only in the course of naming all four crises, and what they are excused from
 * is both the spatial sweep AND the by-name agreement. Collapsing the two lists would blur
 * exactly the distinction that makes the second exemption defensible.
 *
 * Each entry is asserted THREE ways below, and each direction catches a different way the
 * list could go stale:
 *
 *  - **it is still in the population**, so a renamed or deleted module cannot sit here
 *    exempting nothing;
 *  - **it is still not era four's own**, by name, so a file that becomes a succession module
 *    has to leave rather than keep a licence it was given as an outsider;
 *  - **it still names a topology**, so a file that stops quoting era one's shapes has stopped
 *    needing the spatial half of this exemption and somebody has to look — which is the
 *    direction that keeps an exemption from becoming permanent by neglect.
 *
 * Forcing any one of the three false fails at the member it was excusing, which is the only
 * way to tell a load-bearing exemption from a decorative one.
 */
const DOCUMENTS_ALL_FOUR_CRISES: readonly {
  readonly path: string;
  readonly why: string;
}[] = [
  {
    path: "apps/web/src/city/three/crisis/registry.ts",
    why:
      "The registry holds §4 of the reference-pack README as data for all four crises, so " +
      "era one's row says 'Tile adjacency, a front advancing inward from the rim' and its " +
      "topology literal says 'tile-adjacency' and 'cell-boundary'. The rest is era one's " +
      "own mechanic answers quoting its frost front, its burn rounds and its cells, plus " +
      "the one sentence explaining that era four lays no ground layer and so has no radius " +
      "to paint with. `row` is the variable a lookup over the table walks. Naming era " +
      "one's topology is how this file draws the contrast era four is defined by.",
  },
  {
    path: "apps/web/src/city/three/crisis/propagation.ts",
    why:
      "The propagation module declares one topology variant per crisis and asserts they " +
      "share the discriminant and nothing else, which is the separation itself expressed " +
      "as types. It cannot say era four is 'unlinked' without also being able to say era " +
      "one is 'tile-adjacency' with a 'cell-boundary' front: the disjointness is the " +
      "design, and a union with one arm missing would not express it. Era four's own arm " +
      "carries no spatial field at all, which is the property this sweep is about.",
  },
];

/** The declared framework paths, for the two places they are subtracted. */
const FRAMEWORK_PATHS: ReadonlySet<string> = new Set(
  DOCUMENTS_ALL_FOUR_CRISES.map((entry) => entry.path),
);

/**
 * Tokens that would mean a neighbour relation had arrived in the allegiance model. Each
 * carries why it is banned, so a future reader can tell a real violation from a false
 * positive rather than reaching for the exemption list.
 */
const TOPOLOGY_TOKENS: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  // No leading word boundary on the first two: `isAdjacent` and `hasNeighbour` are exactly
  // the shapes this is looking for, and `\b` would let a camel-cased helper through.
  { pattern: /neighbou?r/i, why: "era four's districts have no neighbours" },
  { pattern: /adjacen/i, why: "adjacency is era one's topology, and it is the frost's" },
  { pattern: /\bcol\b/, why: "a column is a position, and a district has none" },
  { pattern: /\brow\b/, why: "a row is a position, and a district has none" },
  { pattern: /\bcell/i, why: "the board is not a grid; there are no cells to walk" },
  { pattern: /\brim_depth\b/, why: "rim depth is the frost's distance from the shore" },
  { pattern: /\bradius\b/i, why: "nothing here covers an area, so nothing has a radius" },
  { pattern: /\bdistance\b/i, why: "there is no metric between two districts" },
  { pattern: /\bcoord/i, why: "a coordinate is the position the model refuses to have" },
  { pattern: /\bperimeter\b/i, why: "a district has no extent, so it has no perimeter" },
];

/** The same tokens `test/hardWinterClockless.test.ts` bans, and for the same reasons. */
const CLOCK_TOKENS: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  {
    pattern: /\bsetInterval\b/,
    why: "a repeating timer advances the world while nobody plays",
  },
  {
    pattern: /\bsetTimeout\b/,
    why: "a delayed callback is a cycle that advanced on its own",
  },
  {
    pattern: /\bDate\.now\b/,
    why: "elapsed wall-clock time is banned outright by INV-ERA-3",
  },
  { pattern: /\bnew Date\b/, why: "same, by another route" },
  { pattern: /\bperformance\.now\b/, why: "a high-resolution clock is still a clock" },
  {
    pattern: /\brequestAnimationFrame\b/,
    why: "frame-driven progression is elapsed time measured in frames",
  },
  {
    pattern: /\bMath\.random\b/,
    why: "an unseeded draw makes a cycle unreproducible, and the obvious seed is the clock",
  },
];

interface Violation {
  readonly path: string;
  readonly token: string;
  readonly line: number;
  readonly text: string;
}

/**
 * Blank out comments, line by line, keeping line numbers intact.
 *
 * A sweep that read comments could not survive its own documentation: every module in this
 * population explains at length that it has no adjacency and no clock, which means every
 * module names the tokens. STRING LITERALS ARE KEPT, which is the conservative direction
 * and is the same choice `hardWinterClockless.test.ts` makes — a token inside a string is
 * usually prose and harmless to flag, whereas stripping strings could hide a real read.
 * Quotes are tracked only so a `//` inside a string does not truncate the rest of a line.
 */
function codeOnly(source: string): string[] {
  let inBlock = false;
  return source.split("\n").map((line) => {
    let out = "";
    let quote: string | null = null;
    let index = 0;

    while (index < line.length) {
      const char = line[index] as string;
      if (inBlock) {
        const end = line.indexOf("*/", index);
        if (end === -1) {
          break;
        }
        inBlock = false;
        index = end + 2;
        continue;
      }
      if (quote !== null) {
        out += char;
        if (char === "\\") {
          out += line[index + 1] ?? "";
          index += 2;
          continue;
        }
        if (char === quote) {
          quote = null;
        }
        index += 1;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        out += char;
        index += 1;
        continue;
      }
      if (line.startsWith("//", index)) {
        break;
      }
      if (line.startsWith("/*", index)) {
        inBlock = true;
        index += 2;
        continue;
      }
      out += char;
      index += 1;
    }

    return out;
  });
}

function sweep(
  paths: readonly string[],
  tokens: readonly { readonly pattern: RegExp; readonly why: string }[],
): Violation[] {
  const found: Violation[] = [];
  for (const path of paths) {
    const lines = codeOnly(readFileSync(posix.join(repoRoot, path), "utf8"));
    for (const { pattern } of tokens) {
      lines.forEach((text, index) => {
        if (pattern.test(text)) {
          found.push({ path, token: pattern.source, line: index + 1, text: text.trim() });
        }
      });
    }
  }
  return found;
}

describe("era four's allegiance model has no topology and no clock", () => {
  it("sweeps a population derived two independent ways that agree", () => {
    const byBehaviour = allegianceSources();
    const byName = successionNamedSources();
    const eraFours = byBehaviour.filter((path) => !FRAMEWORK_PATHS.has(path));

    // A floor, because every assertion below passes trivially over an empty list — and it
    // is on the ERA-FOUR half, so adding framework files to the exemption list can never
    // be what satisfies it.
    expect(
      eraFours.length,
      `only ${eraFours.length} era-four sources name an allegiance`,
    ).toBeGreaterThanOrEqual(3);

    // Composition, not only size. A floor constrains how many sources were swept, never
    // WHICH: three copies of the tuning table would clear it while the reducer — the one
    // module that actually decides an allegiance — went unswept.
    expect(byBehaviour).toContain("engines/game/src/succession.ts");
    expect(byBehaviour).toContain("engines/game/src/succession-tuning.ts");

    // Scope the guard by the behaviour. Presentation, persistence and copy modules may carry
    // "succession" in their basename without deciding an allegiance; forcing those into this
    // population would turn a filename into a product claim. The reverse direction remains
    // load-bearing: every source that DOES name allegiance must belong to this crisis (or to
    // the declared shared framework), so an implementation elsewhere cannot escape the sweep.
    expect(byName.length).toBeGreaterThanOrEqual(20);
    for (const path of eraFours) {
      expect(byName, `${path} names allegiance outside a Succession module`).toContain(
        path,
      );
    }
    expect(
      byName.filter((path) => !eraFours.includes(path)).length,
      "the by-name derivation no longer proves that non-deciding Succession modules exist",
    ).toBeGreaterThanOrEqual(5);
  });

  it("finds no neighbour relation in any of them", () => {
    const exempt = new Set([
      ...MAY_NAME_A_TOPOLOGY.map((entry) => entry.path),
      ...FRAMEWORK_PATHS,
    ]);
    const population = allegianceSources().filter((path) => !exempt.has(path));

    // THE EXEMPTIONS MUST NOT SWALLOW THE POPULATION THEY ARE AN EXCEPTION TO. A floor
    // constrains size and not shape, though, so the composition is asserted beside it:
    // the reducer that decides an allegiance, and era four's own web-lane seam — which
    // sits in the same directory as both exempted files and is emphatically not exempt.
    expect(
      population.length,
      `only ${population.length} sources left after ${exempt.size} exemptions`,
    ).toBeGreaterThanOrEqual(4);
    expect(population).toContain("engines/game/src/succession.ts");
    expect(population).toContain("apps/web/src/city/three/crisis/succession.ts");

    const violations = sweep(population, TOPOLOGY_TOKENS);
    expect(
      violations.map((v) => `${v.path}:${v.line} ${v.token} — ${v.text}`),
      "era four's districts have no positions, no neighbours and no front",
    ).toEqual([]);
  });

  it("finds no clock read in any of them", () => {
    const violations = sweep(allegianceSources(), CLOCK_TOKENS);

    expect(
      violations.map((v) => `${v.path}:${v.line} ${v.token} — ${v.text}`),
      "a Succession cycle advances on an answered batch and on nothing else",
    ).toEqual([]);
  });

  /**
   * The exemption, asserted in both directions. Forcing either false fails at the member it
   * was excusing, which is the only way to tell a load-bearing exemption from a decorative
   * one.
   */
  it("every topology exemption still exists and still needs excusing", () => {
    const population = allegianceSources();

    expect(MAY_NAME_A_TOPOLOGY.length).toBeGreaterThanOrEqual(1);
    for (const entry of MAY_NAME_A_TOPOLOGY) {
      // Direction one: it is still in the population it is an exception to.
      expect(population, `${entry.path} no longer names an allegiance`).toContain(
        entry.path,
      );
      expect(entry.why.length).toBeGreaterThan(80);

      // Direction two, and it is the one that matters: it still NEEDS the exemption. A
      // mechanic inventory that no longer names era one's topology has stopped drawing the
      // contrast its propagation row exists to draw.
      const wouldFail = sweep([entry.path], TOPOLOGY_TOKENS);
      expect(
        wouldFail.length,
        `${entry.path} names no topology any more, so this exemption excuses nothing`,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * The framework exemption, asserted three ways. See {@link DOCUMENTS_ALL_FOUR_CRISES}
   * for what each direction catches; forcing any one of them false fails at the member it
   * was excusing.
   */
  it("every framework exemption still exists, is still framework, and still needs it", () => {
    const population = allegianceSources();

    expect(DOCUMENTS_ALL_FOUR_CRISES.length).toBeGreaterThanOrEqual(2);
    // Nothing is claimed as both kinds of exception, which are two different claims about
    // two different things and would mean opposite reasons if one file carried both.
    for (const entry of MAY_NAME_A_TOPOLOGY) {
      expect(FRAMEWORK_PATHS, `${entry.path} is claimed as both`).not.toContain(entry.path);
    }

    for (const entry of DOCUMENTS_ALL_FOUR_CRISES) {
      // One: still in the population it is an exception to. A renamed or deleted module
      // fails here rather than sitting in this list forever exempting nothing.
      expect(population, `${entry.path} no longer names an allegiance`).toContain(
        entry.path,
      );
      expect(entry.why.length).toBeGreaterThan(80);

      // Two: still NOT era four's own. This list exists because these files belong to the
      // shared framework; one that becomes a succession module by name has joined the
      // by-name derivation and has to be argued for there, not excused from it here.
      expect(
        /succession/i.test(posix.basename(entry.path)),
        `${entry.path} is a succession module now, so it cannot be excused as framework`,
      ).toBe(false);

      // Three, and it is the direction that stops this going permanent by neglect: it
      // still NEEDS the spatial half. A framework file that has stopped quoting era one's
      // shapes is being excused from a sweep it would pass, which is a decorative
      // exemption and hides the next file that forgets.
      const wouldFail = sweep([entry.path], TOPOLOGY_TOKENS);
      expect(
        wouldFail.length,
        `${entry.path} names no topology any more, so this exemption excuses nothing`,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * Both sweeps above pass by finding nothing, which is also exactly how they would look if
   * the detector had been broken into returning `[]`. This pins the detector against the
   * shape of each defect, in both directions, and it pins the comment stripper too — which
   * is the part most able to break the guard silently.
   */
  it("detects a topology and a clock when one is present, and only then", () => {
    // Every banned token is genuinely matched by its own pattern...
    const topologySamples = [
      "  const near = neighbourOf(district);",
      "  if (isAdjacent(a, b)) {",
      "  const { col } = plan;",
      "  const row = plan.row;",
      "  const key = cellKey(0, 0);",
      "  const depth = island.rim_depth.get(key);",
      "  const radius = 2;",
      "  const d = distance(a, b);",
      "  const coords = [1, 2];",
      "  const p = perimeter(district);",
    ];
    expect(topologySamples.length).toBe(TOPOLOGY_TOKENS.length);
    for (const [index, sample] of topologySamples.entries()) {
      const token = TOPOLOGY_TOKENS[index];
      if (!token) {
        throw new Error(`no token for sample ${index}`);
      }
      expect(token.pattern.test(sample), `${token.pattern.source} vs ${sample}`).toBe(true);
      expect(token.why.length).toBeGreaterThan(20);
    }

    const clockSamples = [
      "  const id = setInterval(tick, 1000);",
      "  setTimeout(() => advance(), 500);",
      "  const seed = Date.now();",
      "  const stamp = new Date().toISOString();",
      "  const t = performance.now();",
      "  requestAnimationFrame(step);",
      "  const roll = Math.random();",
    ];
    expect(clockSamples.length).toBe(CLOCK_TOKENS.length);
    for (const [index, sample] of clockSamples.entries()) {
      const token = CLOCK_TOKENS[index];
      if (!token) {
        throw new Error(`no token for sample ${index}`);
      }
      expect(token.pattern.test(sample), `${token.pattern.source} vs ${sample}`).toBe(true);
    }

    // ...and the model's own vocabulary is not flagged, so a green run means something.
    // Every line below is quoted from `succession.ts`.
    for (const clean of [
      "  const to = strongestClaimant(districts);",
      "  .sort((first, second) => first.exposure - second.exposure);",
      "  return { ...state, phase: 'answering' };",
      "  strength[district.allegiance] += 1;",
      "  const warned = successionNextToWarn(districts).map((d) => d.id);",
    ]) {
      expect(
        [...TOPOLOGY_TOKENS, ...CLOCK_TOKENS].some((token) => token.pattern.test(clean)),
        `flagged clean line: ${clean}`,
      ).toBe(false);
    }
  });

  it("reads code and not prose, in both directions", () => {
    const fixture = [
      "/**",
      " * Not tile adjacency, no rim_depth, no Date.now.",
      " */",
      "const a = 1; // never adjacent, never Date.now()",
      "const url = 'https://example.test'; const id = setInterval(tick, 10);",
      "const to = strongestClaimant(districts);",
      "/* neighbour */ const b = 2;",
    ].join("\n");

    const stripped = codeOnly(fixture);
    expect(stripped.length, "line numbers are preserved").toBe(7);

    const all = [...TOPOLOGY_TOKENS, ...CLOCK_TOKENS];
    // Prose that names the tokens is not a violation...
    for (const line of [stripped[1], stripped[3], stripped[6]] as string[]) {
      expect(
        all.some((token) => token.pattern.test(line)),
        `prose flagged: ${line}`,
      ).toBe(false);
    }
    // ...and the code on the same lines survives, so nothing is blanked wholesale.
    expect(stripped[3]).toContain("const a = 1;");
    expect(stripped[6]).toContain("const b = 2;");

    // A real read after a URL is still caught: a `//` inside a string must not truncate
    // the line and swallow what follows it.
    expect(stripped[4]).toContain("setInterval");
    expect(all.some((token) => token.pattern.test(stripped[4] as string))).toBe(true);

    // And the honest line is still honest.
    expect(all.some((token) => token.pattern.test(stripped[5] as string))).toBe(false);
  });
});
