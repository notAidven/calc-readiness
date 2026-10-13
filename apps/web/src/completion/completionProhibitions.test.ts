import { describe, expect, it } from "vitest";

/**
 * NO SURFACE THAT RUNS A `post` RETAKE MAY SEED THE CITY OFF IT (D-END6).
 *
 * ## The defect this exists for, and why a comment would not have stopped it
 *
 * A retake cannot mutate the city as the code stands, and the guard that stops it
 * is at the WRITE boundary rather than in the shape of the value:
 * `PLACEMENT_WRITING_PURPOSES` is `{pre, placement}`, so a `post` administration
 * writes no `placement_estimate`. But `finalize()` still RETURNS
 * `placement_by_node` for a post, and the function the pretest hands that field to,
 * `session.seedFromPlacement`, is not a merge: it clears `nodeStates`, clears
 * `placements`, clears `roads`, zeroes the road gold, resets crisis damage, clears
 * `neighborhoodStates` and moves the Town Hall back to the island centre. Called
 * after ten eras it deletes the entire playthrough, and every existing gate reports
 * correct while it happens.
 *
 * So the landmine is not a missing check. It is that the obvious, reasonable thing
 * to write in an ending — read the completed administration, hand it to the city —
 * is the catastrophe. This file is the check that nobody writes it.
 *
 * The fourth token is the quiet one. `unlockedNodeIdsFromPlacement` derives the
 * "You've unlocked N buildings" celebration from the same field; after ten eras
 * there is nothing to unlock, and the number would be a lie about buildings the
 * learner earned.
 *
 * ## The population is scoped by BEHAVIOUR
 *
 * Not "the completion directory", which would guard only the file whose author was
 * already thinking about this, and not "files that import the diagnostic engine",
 * which is where the mechanic is implemented. The question the population has to
 * answer is *what would have to be true of a surface for this defect to be possible
 * there*, and the answer is: it opens a `post` administration. Two surfaces do that
 * today and they were built two months apart by different lanes, which is exactly
 * the shape of population that a directory-scoped sweep misses.
 *
 * The floor and the composition assertion below are both needed and they fail in
 * different directions: the floor catches a glob that resolves to nothing, and the
 * composition catches a derivation that narrows to this lane's own file. A
 * derivation can be one clean filter over a real source and still be the wrong set.
 */

// Tests are excluded in the GLOB rather than only in the filter below. An eager glob
// resolves every match at transform time, so a test file that appears and disappears
// while another lane is working (a scratch probe, a rename mid-run) fails this file
// with an ENOENT before a single assertion runs. Observed, not hypothesised.
const SOURCES = import.meta.glob(["../**/*.ts", "../**/*.tsx", "!../**/*.test.*"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * Blank out comments, keeping every other character so line numbers survive.
 *
 * THE STRIPPER IS LOAD-BEARING and it is here reluctantly: this file's whole subject
 * is four identifiers, and the surfaces it sweeps have to be free to EXPLAIN why
 * they do not use them. `CompletionCeremony.tsx`'s header names all four, because a
 * prohibition nobody can read is a prohibition the next author re-derives the hard
 * way. Scanning raw source would fire on that header on day one and the sweep would
 * be deleted by whoever met it.
 *
 * Strip too much and this file reports green while measuring nothing, so the
 * over-stripping control is not optional. It is the "still excusing something" case
 * below: `DiagnosticRunner.tsx` uses all four as real code, so if the stripper ate
 * code that test fails, at that file, with a message saying the exemption excuses
 * nothing. The two directions are checked by two tests that cannot both be wrong in
 * the same direction.
 *
 * String and template literals are tracked so a `//` inside a URL cannot open a
 * comment and strip the rest of a file away. A quote only opens a literal when it
 * does not follow an identifier character, which is what keeps an apostrophe in JSX
 * prose from doing it.
 */
function stripComments(source: string): string {
  const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }
    if (two === "/*") {
      while (i < source.length && source.slice(i, i + 2) !== "*/") {
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      out += "  ";
      i += 2;
      continue;
    }
    const ch = source[i] as string;
    const opensString =
      ch === "`" ||
      ((ch === '"' || ch === "'") && !IDENTIFIER_CHAR.test(source[i - 1] ?? " "));
    if (opensString) {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          out += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += source[i];
        if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * The web lane's non-test sources, keyed by a path relative to `apps/web/src` and
 * with comments blanked out, so a file may document the prohibition it obeys.
 */
const APP_SOURCES = Object.entries(SOURCES)
  .filter(([path]) => !path.includes(".test."))
  .map(
    ([path, source]) =>
      [
        path.startsWith("./") ? `completion/${path.slice(2)}` : path.replace(/^\.\.\//, ""),
        stripComments(source),
      ] as const,
  );

/**
 * A surface OPENS A POST ADMINISTRATION when it names the purpose. Derived from the
 * source rather than from a written-down list, so a third retake surface is in the
 * population the day it lands and not the day somebody remembers this file.
 */
const RETAKE_PURPOSE = /\bbegin\(\s*(?:retake\s*\?\s*)?"post"|purpose:\s*"post"/;
const RETAKE_SURFACES = APP_SOURCES.filter(([, source]) => RETAKE_PURPOSE.test(source));

/** The four things D-END6 names, each a real path into the city's write side. */
const FORBIDDEN = [
  "seedFromPlacement",
  "onPretestComplete",
  "placement_by_node",
  "unlockedNodeIdsFromPlacement",
] as const;

/**
 * The one legitimate exception, and the reason it is legitimate.
 *
 * `DiagnosticRunner` is the ENTRY diagnostic's runner as well as the dev retake's,
 * so it necessarily holds the pretest hand-off. It is in the population because it
 * genuinely can run a post, and it may hold the forbidden tokens because it
 * withholds the hand-off on the retake branch. That structural property is asserted
 * below rather than taken on trust: an exemption that is not measured is an
 * exemption that has stopped working.
 *
 * A member that does not owe the property and a member that forgot it look
 * identical from outside a sweep, so this is a NAMED list rather than a quiet
 * omission, and it is asserted in both directions.
 */
const EXEMPT: ReadonlyMap<string, string> = new Map([
  [
    "diagnostic/DiagnosticRunner.tsx",
    "it is the ENTRY diagnostic's runner too, and withholds the hand-off on the retake branch",
  ],
]);

describe("no post-retake surface can seed the city (D-END6)", () => {
  it("the sweep found the web sources at all", () => {
    // A sweep over an empty glob passes, so the glob gets its own floor.
    expect(
      APP_SOURCES.length,
      "the source glob resolved to fewer web files than the tree is known to hold",
    ).toBeGreaterThanOrEqual(100);
  });

  it("the population is derived, and is wider than this lane's own file", () => {
    const paths = RETAKE_SURFACES.map(([path]) => path);
    // The composition assertion. A floor bounds size and not shape: "at least two"
    // is satisfied by this file plus anything, so the two surfaces that must be in
    // the population are named where their absence fails.
    expect(
      paths,
      "the completion ceremony opens a post administration and must be swept",
    ).toContain("completion/CompletionCeremony.tsx");
    expect(
      paths,
      "the shipped dev retake opens a post administration and must be swept; a sweep that has narrowed to the completion lane is measuring only the author who was already thinking about this",
    ).toContain("diagnostic/DiagnosticRunner.tsx");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("no unexempted retake surface names a city write path", () => {
    const offenders = RETAKE_SURFACES.filter(([path]) => !EXEMPT.has(path)).flatMap(
      ([path, source]) =>
        FORBIDDEN.filter((token) => source.includes(token)).map(
          (token) => `${path}: ${token}`,
        ),
    );
    expect(
      offenders,
      `a surface that runs a "post" retake reaches for the pretest's city hand-off. ` +
        `A post's finalize() still RETURNS placement_by_node, and seedFromPlacement is a ` +
        `destructive full reset of the city, so this is how ten eras get deleted:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("every exemption still exists, and still runs a post", () => {
    // Direction one: an entry that has stopped qualifying fails, so a renamed or
    // deleted member cannot sit in the list forever exempting nothing.
    const inPopulation = new Set(RETAKE_SURFACES.map(([path]) => path));
    for (const [path, reason] of EXEMPT) {
      expect(
        inPopulation.has(path),
        `${path} is a declared exception (${reason}) that no longer runs a post retake, so the exemption is describing a file that is not there`,
      ).toBe(true);
    }
  });

  it("every exemption is still excusing something", () => {
    // Direction two: a member that adopts the property without leaving the list
    // fails, so an exemption cannot become permanent by neglect.
    for (const [path, reason] of EXEMPT) {
      const source = RETAKE_SURFACES.find(([candidate]) => candidate === path)?.[1] ?? "";
      const held = FORBIDDEN.filter((token) => source.includes(token));
      expect(
        held,
        `${path} is exempted because ${reason}, and it no longer names any city write path at all. The exemption excuses nothing; delete it.`,
      ).not.toEqual([]);
    }
  });

  it("the exempted runner really does withhold the hand-off on the retake branch", () => {
    // The exemption's load-bearing property, measured rather than argued. Being on
    // the list is a claim about WHY the tokens are allowed there, and this is the
    // why: exactly one hand-off call, and it sits in the else of the retake test.
    //
    // The retake test is matched by SHAPE rather than by one literal spelling. It read
    // `if (isRetake) {` while the finalize path was inlined in `submitAnswer`; the runner
    // now shares one `finishRun` between the typed path and the dev skip — which is the
    // stronger arrangement for this very invariant, since there is one branch to check
    // instead of one per caller — and that function takes the flag as a parameter, so the
    // test reads `if (retake) {`. Both spellings are the same claim, and pinning the older
    // literal would have turned a refactor that made the invariant easier to hold into a
    // failure that says the invariant is gone.
    const source =
      RETAKE_SURFACES.find(([path]) => path === "diagnostic/DiagnosticRunner.tsx")?.[1] ??
      "";
    const callSites = source.split("onPretestComplete?.(").length - 1;
    expect(callSites, "the hand-off is called from more than one place").toBe(1);

    const retakeTest = /\bif \((?:isRetake|retake)\) \{/.exec(source);
    expect(
      retakeTest,
      "the retake branch guard is gone: no `if (retake)`/`if (isRetake)` test in the runner",
    ).not.toBeNull();
    const guard = retakeTest?.index ?? -1;
    const otherwise = source.indexOf("} else {", guard);
    const handOff = source.indexOf("onPretestComplete?.(");
    expect(
      otherwise,
      "the retake branch has no else to withhold the hand-off in",
    ).toBeGreaterThan(guard);
    expect(
      handOff,
      "the pretest hand-off is no longer inside the else of the retake test, so a retake now seeds the city",
    ).toBeGreaterThan(otherwise);
  });
});

/**
 * House style: no em dash in learner copy.
 *
 * The lesson lane runs this sweep over `lessons/**`, and its own header records that
 * the population is scoped by behaviour rather than by directory. The ceremony is
 * learner prose outside that directory, so it needs its own, rather than an edit to
 * a file in another lane.
 */
describe("the ceremony's copy follows house style", () => {
  const CEREMONY = APP_SOURCES.filter(([path]) => path.startsWith("completion/"));
  const EM_DASH = "\u2014";

  it("found the ceremony's sources", () => {
    expect(
      CEREMONY.map(([path]) => path),
      "the ceremony's own surface must be in its own prose sweep",
    ).toContain("completion/CompletionCeremony.tsx");
  });

  it("renders no em dash", () => {
    // Comments are exempt, as they are in the lesson lane's sweep, and for the same
    // reason: editorial em dashes in JSDoc do not reach a learner, and a sweep that
    // fired on them would be deleted by the next author who met it. `APP_SOURCES` is
    // already stripped.
    const offenders = CEREMONY.flatMap(([path, source]) =>
      source
        .split("\n")
        .map((line, index) => [index + 1, line] as const)
        .filter(([, line]) => line.includes(EM_DASH))
        .map(([line, text]) => `${path}:${line}: ${text.trim()}`),
    );
    expect(
      offenders,
      `em dash (U+2014) in ceremony copy. House style is no em dashes in learner copy; use a colon, a comma or a full stop:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the stripper keeps rendered prose, so the sweep above is measuring something", () => {
    // The over-stripping control for the prose sweep. If the stripper eats JSX text
    // the sweep goes green over nothing, and this is where that shows.
    const joined = CEREMONY.map(([, source]) => source).join("\n");
    expect(joined, "JSX text did not survive comment stripping").toContain(
      "Just what holds today.",
    );
    expect(joined, "a string literal did not survive comment stripping").toContain(
      "You sat down today with no lessons",
    );
  });
});
