/**
 * **NOTHING THAT ADVANCES THE HARD WINTER MAY READ A CLOCK.**
 *
 * The behaviour, stated before the population is written down: *a source that moves the
 * winter from one round to the next.* The repo has ruled against time-based mechanics
 * twice — INV-ERA-3 (`2026-07-27-era-progression-design.md` §8) forbids anything keyed
 * to elapsed wall-clock time outright, and the resource design's §5.5 forbids passive
 * accrual — on two grounds that both apply here: a mechanic that advances on a wall
 * clock is farmable by idling, and it cannot be tested without a fake clock.
 *
 * ## Why the population is not "the engine module"
 *
 * Because the tempting place to put a timer is not the engine. The engine is a reducer
 * over an event list and has no natural seam for one; the React surface has three, and a
 * `setInterval` that ticked the frost while the learner read a question would be exactly
 * the defect — farmable by leaving the tab open, and invisible to any test that does not
 * install a fake clock. So the population is derived as **every non-test source in the
 * winter engine AND every non-test source in the winter's playable surface**, from the
 * tree rather than from a list written here, and the composition is asserted so the sweep
 * cannot silently collapse to one side of it.
 *
 * ## And why it is not "the files whose names say winter" either
 *
 * A NAME FILTER SCOPES BY IMPLEMENTATION WHERE THE CLAIM IS ABOUT BEHAVIOUR. What owes
 * this property is not "a file called `hard-winter-something`", it is "a module that can
 * decide what the winter does" — and the engine reaches outside its own name to do that.
 * `hard-winter.ts` draws its layout cycle through `citizens-rng.ts`, which is named for a
 * different feature entirely and which a name filter therefore misses; a `Date.now()` seed
 * in there would make a tuning session unreproducible with every winter-named file clean.
 *
 * So the engine side is closed under its own RELATIVE imports: start from the winter's
 * modules and pull in every `engines/game/src` file they reach, transitively. That is
 * sound rather than merely wider, because the engine is pure and framework-free by
 * contract, so its whole import closure already owes exactly this property. It stops at
 * package specifiers (`@cr/skill-graph`, `@cr/item-bank`) and it deliberately does NOT
 * close over the SURFACE's relative imports: `PracticeAnswer` and the lesson prose
 * renderer are legitimately allowed a `setTimeout` to debounce a keystroke, and none of
 * them can move a round. The composition assertion below pins that the closure really did
 * reach past the name filter, so the derivation cannot quietly narrow back to it.
 *
 * `hard-winter-invariants.test.ts` owns the complementary half: it spies on `Date.now`,
 * `performance.now` and `Math.random` and folds a whole winter twice with the clock moved
 * a day between, which proves the engine reads nothing at RUNTIME. That is a stronger
 * statement about the paths a test happens to exercise, and this is a stronger statement
 * about the paths it does not. Neither subsumes the other, which is why both exist.
 *
 * ## Why a token sweep, and what it deliberately does not claim
 *
 * A grep proves an absence, which is exactly the shape of this claim: the tokens are not
 * there. It cannot prove that some exotic construction is clock-free, and it does not try
 * to. What it does buy is that the ordinary way this defect arrives — someone reaches for
 * `setInterval` to animate the frost, or for `Date.now()` to seed a draw — fails in CI at
 * the moment it is written rather than after it has shipped.
 *
 * `Math.random` is in the list for a related but distinct reason: the surface's item draw
 * has to come from somewhere, and seeding it off the clock would be a clock read wearing
 * a randomness costume. Seeding it off the round number instead makes a tuning session
 * reproducible, which is worth having on its own.
 *
 * Lives in `test/` (the root `repo-hygiene` project) because its subject spans two
 * workspaces: an engine-lane test reaching into `apps/web` would invert the dependency
 * direction, and the web lane's jsdom harness cannot read source with `node:fs`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

/**
 * Where the winter's two halves live. Directories, not file lists: a new module in
 * either one joins the population without anybody editing this test, which is the whole
 * point of deriving it.
 */
const WINTER_SOURCE_DIRECTORIES = ["engines/game/src", "apps/web/src/winter"] as const;

/** The engine tree, which is closed under its own relative imports. */
const ENGINE_DIRECTORY = "engines/game/src";

function isSource(path: string): boolean {
  const base = posix.basename(path);
  return /\.(ts|tsx)$/.test(base) && !/\.test\.(ts|tsx)$/.test(base);
}

/** A source is a SEED of the winter if it is in one of those trees and names the feature. */
function isWinterSource(path: string): boolean {
  if (!WINTER_SOURCE_DIRECTORIES.some((dir) => path.startsWith(`${dir}/`))) {
    return false;
  }
  if (!isSource(path)) {
    return false;
  }
  // `engines/game/src` holds twenty other systems; only the winter's own modules seed
  // this. `apps/web/src/winter` is the winter's surface entire, so everything in it does.
  return (
    path.startsWith("apps/web/src/winter/") ||
    /hard-winter/.test(base(path)) ||
    /winter/i.test(base(path))
  );
}

function base(path: string): string {
  return posix.basename(path);
}

function trackedSources(directories: readonly string[]): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", ...directories], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.length > 0);
}

/** Relative import specifiers in a source, as they are written. */
function relativeImports(source: string): string[] {
  const found: string[] = [];
  const pattern = /\bfrom\s+["'](\.[^"']*)["']/g;
  let match = pattern.exec(source);
  while (match !== null) {
    found.push(match[1] as string);
    match = pattern.exec(source);
  }
  return found;
}

/**
 * The seeds, plus every `engines/game/src` module the ENGINE seeds reach transitively.
 *
 * The surface's seeds are not closed over — see the header for why. What this buys is that
 * a new engine dependency of the winter joins the sweep without anybody editing this file,
 * which is the difference between a population and a list.
 */
function trackedWinterSources(): string[] {
  const engineFiles = new Set(
    trackedSources([ENGINE_DIRECTORY]).filter((path) => isSource(path)),
  );
  const population = new Set(
    trackedSources(WINTER_SOURCE_DIRECTORIES).filter(isWinterSource),
  );

  const queue = [...population].filter((path) => path.startsWith(`${ENGINE_DIRECTORY}/`));
  for (let head = 0; head < queue.length; head += 1) {
    const path = queue[head] as string;
    const source = readFileSync(posix.join(repoRoot, path), "utf8");
    for (const specifier of relativeImports(source)) {
      const resolved = posix.normalize(posix.join(posix.dirname(path), specifier));
      for (const candidate of [
        `${resolved}.ts`,
        `${resolved}.tsx`,
        `${resolved}/index.ts`,
      ]) {
        if (engineFiles.has(candidate) && !population.has(candidate)) {
          population.add(candidate);
          queue.push(candidate);
        }
      }
    }
  }

  return [...population].sort();
}

/**
 * The tokens. Each is a way the round loop could come to depend on something other than
 * a player action, with the reason it is banned, so a future reader can tell a real
 * violation from a false positive.
 */
const CLOCK_TOKENS: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  {
    pattern: /\bsetInterval\b/,
    why: "a repeating timer advances the world while nobody plays",
  },
  {
    pattern: /\bsetTimeout\b/,
    why: "a delayed callback is a round that advanced on its own",
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
    why: "an unseeded draw makes a round unreproducible, and the obvious seed is the clock",
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
 * A sweep that reads comments cannot survive its own documentation: every module here
 * explains at length that it does not read a clock, which means every module here names
 * the tokens. Without this the guard fires on the paragraph that promises the property.
 *
 * STRING LITERALS ARE KEPT, which is the conservative direction: a token inside a string
 * is almost certainly prose and harmless to flag, whereas stripping strings could hide a
 * real read. Quotes are tracked only so a `//` inside a string (a URL, most likely) does
 * not truncate the rest of a line and hide a token after it.
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

function clockReads(paths: readonly string[]): Violation[] {
  const found: Violation[] = [];
  for (const path of paths) {
    const lines = codeOnly(readFileSync(posix.join(repoRoot, path), "utf8"));
    for (const { pattern } of CLOCK_TOKENS) {
      lines.forEach((text, index) => {
        if (pattern.test(text)) {
          found.push({ path, token: pattern.source, line: index + 1, text: text.trim() });
        }
      });
    }
  }
  return found;
}

describe("nothing that advances the hard winter reads a clock", () => {
  it("sweeps a real population that spans both the engine and the playable surface", () => {
    const population = trackedWinterSources();

    // Floors, because every assertion below passes trivially over an empty list. A wrong
    // cwd, a renamed directory or a deleted feature must read as a failure and not a pass.
    expect(population.length).toBeGreaterThanOrEqual(4);

    // Composition, not just size. A floor constrains how many files were swept, never
    // WHICH: eight engine modules would clear a floor of four while the surface — the
    // half where a timer is actually tempting — went unswept.
    const engineSide = population.filter((path) => path.startsWith("engines/game/src/"));
    const surfaceSide = population.filter((path) =>
      path.startsWith("apps/web/src/winter/"),
    );
    expect(
      engineSide.length,
      `engine side: ${engineSide.join(", ")}`,
    ).toBeGreaterThanOrEqual(2);
    expect(
      surfaceSide.length,
      `surface side: ${surfaceSide.join(", ")}`,
    ).toBeGreaterThanOrEqual(2);

    // The engine's own two modules are named, so a rename that took them out of the
    // population fails here rather than shrinking the sweep quietly.
    expect(engineSide).toContain("engines/game/src/hard-winter.ts");
    expect(engineSide).toContain("engines/game/src/hard-winter-tuning.ts");

    // AND THE CLOSURE REACHED PAST THE NAME FILTER. `citizens-rng.ts` is named for another
    // feature and is where the winter's layout cycle and its batch draw get their
    // randomness, so it can decide what the winter does and owes this property. If the
    // derivation ever narrows back to "files called winter", this is the line that fails.
    expect(engineSide).toContain("engines/game/src/citizens-rng.ts");
    const named = engineSide.filter((path) => /winter/i.test(path));
    expect(
      engineSide.length - named.length,
      `the closure added nothing beyond the winter-named files: ${engineSide.join(", ")}`,
    ).toBeGreaterThanOrEqual(1);
  });

  it("finds no clock read in any of them", () => {
    const population = trackedWinterSources();
    const violations = clockReads(population);

    expect(
      violations.map((v) => `${v.path}:${v.line} ${v.token} — ${v.text}`),
      "the hard winter advances on player actions and on nothing else",
    ).toEqual([]);
  });

  /**
   * The two assertions above pass by finding nothing, which is also exactly how they
   * would look if the detector had been broken into always returning `[]`. This pins the
   * detector against the shape of the bug, in both directions.
   */
  it("detects a clock read when one is present, and only then", () => {
    const winterSource = "apps/web/src/winter/HardWinterSurface.tsx";
    const engineSource = "engines/game/src/hard-winter.ts";

    // The SEED rule really does admit both halves...
    expect(isWinterSource(winterSource)).toBe(true);
    expect(isWinterSource(engineSource)).toBe(true);
    // ...and really does exclude a neighbour that owes nothing here, and every test file.
    expect(isWinterSource("engines/game/src/citizens.ts")).toBe(false);
    expect(isWinterSource("engines/game/src/hard-winter.test.ts")).toBe(false);
    expect(isWinterSource("apps/web/src/winter/hardWinter.browser.test.tsx")).toBe(false);
    expect(isWinterSource("apps/web/src/App.tsx")).toBe(false);
    // A file the closure pulls in is NOT a seed, which is what makes the closure the thing
    // doing the work rather than a wider name filter in disguise.
    expect(isWinterSource("engines/game/src/citizens-rng.ts")).toBe(false);
    expect(trackedWinterSources()).toContain("engines/game/src/citizens-rng.ts");

    // The import scanner reads what a real import looks like, and nothing else.
    expect(relativeImports('import { a } from "./citizens-rng";')).toEqual([
      "./citizens-rng",
    ]);
    expect(relativeImports("import type { B } from '../x/y';")).toEqual(["../x/y"]);
    expect(relativeImports('import { c } from "@cr/skill-graph";')).toEqual([]);
    // Naive on purpose, and naive in the conservative direction: a specifier named in a
    // comment widens the population rather than narrowing it, and a module swept for no
    // reason costs nothing while a module missed is the whole defect.
    expect(relativeImports("// from './citizens-rng'")).toEqual(["./citizens-rng"]);

    // And every banned token is genuinely matched by the detector's own patterns.
    const samples = [
      "  const id = setInterval(tick, 1000);",
      "  setTimeout(() => advance(), 500);",
      "  const seed = Date.now();",
      "  const stamp = new Date().toISOString();",
      "  const t = performance.now();",
      "  requestAnimationFrame(step);",
      "  const roll = Math.random();",
    ];
    expect(samples.length).toBe(CLOCK_TOKENS.length);
    for (const [index, sample] of samples.entries()) {
      const token = CLOCK_TOKENS[index];
      if (!token) {
        throw new Error(`no token for sample ${index}`);
      }
      expect(token.pattern.test(sample), `${token.pattern.source} vs ${sample}`).toBe(true);
      expect(token.why.length).toBeGreaterThan(20);
    }

    // Clean lines are not flagged, so a green run means something.
    for (const clean of [
      "  const next = hardWinterReducer(state, { type: 'end_round' });",
      "  const rng = createSeededRng(mixSeed(encounter, round));",
    ]) {
      expect(CLOCK_TOKENS.some((token) => token.pattern.test(clean))).toBe(false);
    }
  });

  /**
   * The comment stripper is the part of this guard most able to break it silently — a
   * stripper that blanked whole lines would turn every assertion above into a pass over
   * nothing. It is asserted in both directions, and the fixture is the exact shape that
   * made it necessary: every module in this population documents at length that it does
   * not read a clock, which means every module names the tokens in prose.
   */
  it("reads code and not prose, in both directions", () => {
    const fixture = [
      "/**",
      " * Not `Date.now`, not `performance.now`, not `Math.random`.",
      " */",
      "const a = 1; // seeded, never Date.now()",
      "const url = 'https://example.test'; const id = setInterval(tick, 10);",
      "const seed = mixSeed(round, 0);",
      "/* setTimeout */ const b = 2;",
    ].join("\n");

    const stripped = codeOnly(fixture);
    expect(stripped.length, "line numbers are preserved").toBe(7);

    // Prose that names the tokens is not a violation...
    for (const line of [stripped[1], stripped[3], stripped[6]] as string[]) {
      expect(
        CLOCK_TOKENS.some((token) => token.pattern.test(line)),
        `prose flagged: ${line}`,
      ).toBe(false);
    }
    // ...and the code on the same lines survives, so nothing is blanked wholesale.
    expect(stripped[3]).toContain("const a = 1;");
    expect(stripped[6]).toContain("const b = 2;");

    // A real read after a URL is still caught: a `//` inside a string must not truncate
    // the line and swallow what follows it.
    expect(stripped[4]).toContain("setInterval");
    expect(CLOCK_TOKENS.some((token) => token.pattern.test(stripped[4] as string))).toBe(
      true,
    );

    // And the honest line is still honest.
    expect(CLOCK_TOKENS.some((token) => token.pattern.test(stripped[5] as string))).toBe(
      false,
    );
  });
});
