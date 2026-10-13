/**
 * `repoRoot.ts` must rewrite an MSYS drive prefix, must rewrite nothing else, and must be
 * the only place under `test/` that any of this happens.
 *
 * ## Why this file cannot be a green suite
 *
 * The defect it guards is invisible on the platform CI runs. A Linux box's git already
 * answers with a native path, so the fix and the bug produce byte-identical output there
 * and a passing `test:unit` is worth nothing as evidence either way. The only honest proof
 * available off Windows is to drive the transform directly with both input forms, which is
 * why `toNativeRepoPath` takes its platform as an argument: the `win32` branch is
 * unreachable here otherwise, and an untested branch is how the fix would have shipped
 * broken in the other direction.
 *
 * ## The boundary
 *
 * `/c/workspace/x` reads two ways. On Windows it is MSYS for `C:\workspace\x`. On Linux it
 * is a directory called `c` at the filesystem root, and rewriting it would break a checkout
 * that lives there. The string carries nothing that separates the two, so the platform
 * decides and the regex is left as narrow as the shape allows. Both readings are asserted
 * below, against the same input, so the ambiguity is pinned rather than argued.
 *
 * ## Why the reach sweep is here too
 *
 * A correct helper nothing calls fixes nothing. The sweep at the bottom derives the set of
 * files under `test/` that hold a repository root -- by the BEHAVIOUR, counting both the way
 * that is now correct (importing this module) and the way that used to be wrong (asking a
 * git subprocess for a path), so a future file that reintroduces the bug lands in the
 * population rather than escaping it -- and requires every member to get its root from here
 * and from nowhere else.
 *
 * ## Every assertion below has been forced red
 *
 * A test written green may be asserting nothing, so each was mutated before being trusted:
 * the platform gate removed (the boundary case fails, which is the Linux breakage the gate
 * exists to prevent), the pattern widened to `[a-z]+`, unanchored, made case-insensitive,
 * its trailing slash dropped, its replacement's slash dropped, each of the three detectors
 * broken into a constant, the population narrowed until it emptied itself, a second copy of
 * the pattern planted in another file, and each of the five call sites reverted in turn to
 * the raw git call -- all five naming themselves in the failure message.
 *
 * That exercise earned its keep: the unanchored mutation passed. Every case in the file
 * either matched at position 0 or had no single-letter segment at all, so nothing was
 * holding the anchor, and `/mnt/c/x` -> `/mntc:/x` would have shipped. The two cases that
 * now cover it are in "rewrites the leading segment once".
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MSYS_DRIVE_PREFIX, resolveRepoRoot, toNativeRepoPath } from "./repoRoot";

const repoRoot = resolveRepoRoot();

describe("toNativeRepoPath rewrites an MSYS drive prefix", () => {
  it("turns the form an MSYS git answers with into one Windows can open", () => {
    expect(toNativeRepoPath("/c/workspace/calc-readiness", "win32")).toBe(
      "c:/workspace/calc-readiness",
    );
    expect(toNativeRepoPath("/d/repos/x", "win32")).toBe("d:/repos/x");
    expect(toNativeRepoPath("/c/", "win32")).toBe("c:/");
  });

  it("rewrites the leading segment once, and never one further in", () => {
    // Two separate properties, and they are bought by two different things. That the
    // rewrite happens once -- `c:/d/e`, not `c:/d:/e` -- is the non-global regex. That it
    // happens at the START is the anchor, and without the anchor a single-letter segment
    // anywhere would be eaten: `/mnt/c/workspace/x` would come back `/mntc:/workspace/x`,
    // which is how a WSL path would get mangled by a Windows-side normaliser.
    expect(toNativeRepoPath("/c/d/e", "win32")).toBe("c:/d/e");
    expect(toNativeRepoPath("/mnt/c/workspace/x", "win32")).toBe("/mnt/c/workspace/x");
    expect(toNativeRepoPath("/home/a/b", "win32")).toBe("/home/a/b");
  });

  it("leaves a path Windows can already open exactly as it found it", () => {
    // Git for Windows -- as opposed to the MSYS2 build -- answers in this second form
    // already, so the common Windows setup must pass through untouched.
    expect(toNativeRepoPath("C:/workspace/x", "win32")).toBe("C:/workspace/x");
    expect(toNativeRepoPath("C:\\workspace\\x", "win32")).toBe("C:\\workspace\\x");
    expect(toNativeRepoPath("\\\\server\\share\\x", "win32")).toBe("\\\\server\\share\\x");
  });

  it("is not looser than one letter between two slashes", () => {
    // Each of these is a way a sloppier pattern could eat a path that is not a drive.
    expect(toNativeRepoPath("/usr/local/x", "win32")).toBe("/usr/local/x");
    expect(toNativeRepoPath("/cc/x", "win32")).toBe("/cc/x");
    expect(toNativeRepoPath("/1/x", "win32")).toBe("/1/x");
    expect(toNativeRepoPath("/c", "win32")).toBe("/c");
    expect(toNativeRepoPath("", "win32")).toBe("");
    // Upper case is deliberately out of scope: MSYS spells its mount points in lower
    // case, so `/C/x` is a shape nothing produces, and widening the class would only
    // enlarge the surface the platform gate has to protect.
    expect(toNativeRepoPath("/C/workspace/x", "win32")).toBe("/C/workspace/x");
  });

  it("leaves a genuine POSIX path alone even when it looks exactly like a drive", () => {
    // THE BOUNDARY. Same string as the first case in this file, opposite verdict, and the
    // platform is the entire difference. A Linux checkout at `/c/workspace` must survive.
    expect(toNativeRepoPath("/c/workspace/calc-readiness", "linux")).toBe(
      "/c/workspace/calc-readiness",
    );
    expect(toNativeRepoPath("/c/workspace/calc-readiness", "darwin")).toBe(
      "/c/workspace/calc-readiness",
    );
    // The ordinary Linux and WSL answers, which were never at risk but pin the pass-through.
    expect(toNativeRepoPath("/home/user/x", "linux")).toBe("/home/user/x");
    expect(toNativeRepoPath("/mnt/c/workspace/x", "linux")).toBe("/mnt/c/workspace/x");
  });

  it("defaults to the platform it is running on", () => {
    // The default argument is what every call site relies on, so it is asserted rather
    // than assumed. On this runner it is the pass-through branch; the expectation is
    // written for both so the file means the same thing on a Windows box.
    const expected = process.platform === "win32" ? "c:/workspace/x" : "/c/workspace/x";
    expect(toNativeRepoPath("/c/workspace/x")).toBe(expected);
  });
});

describe("resolveRepoRoot hands back a root this platform can open", () => {
  it("names a directory node:fs can read, and it is this repository", () => {
    // The end-to-end property, and the one the five invariants actually depend on. Under
    // the bug this call is where they died -- three at `scandir`, two at `spawnSync`.
    const entries = readdirSync(repoRoot);
    expect(entries).toContain("package.json");
    expect(entries.length).toBeGreaterThan(10);

    const manifest = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(manifest.name).toBe("calc-readiness");
  });
});

/**
 * Sources under `test/`, keyed by their path relative to that directory.
 *
 * Read off the FILESYSTEM rather than out of `git ls-files`, unlike the other invariants
 * here: a new test file is subject to this sweep from the moment it is saved, and a sweep
 * that only saw tracked files would be blind to exactly the change it is meant to review.
 */
function sourcesUnderTest(): Map<string, string> {
  const testDirectory = join(repoRoot, "test");
  const found = new Map<string, string>();
  for (const entry of readdirSync(testDirectory, { recursive: true })) {
    const relative = String(entry).split(/[\\/]/).join("/");
    if (!/\.tsx?$/.test(relative)) {
      continue;
    }
    found.set(relative, readFileSync(join(testDirectory, relative), "utf8"));
  }
  return found;
}

/**
 * `rev-parse` flags whose answer is a filesystem path, and so is spelled in MSYS form by an
 * MSYS git. Every one of them carries the defect, not just the one that happened to bite,
 * which is why the sweep looks for the whole family rather than for the single flag the
 * five invariants used.
 */
const GIT_PATH_FLAGS = [
  "--show-toplevel",
  "--show-cdup",
  "--git-dir",
  "--git-common-dir",
  "--show-superproject-working-tree",
];

/** True when the source asks a git subprocess for a filesystem path of its own. */
function derivesRootFromGit(source: string): boolean {
  return GIT_PATH_FLAGS.some((flag) => source.includes(flag));
}

/** True when the source imports the shared helper AND calls it. */
function reachesTheHelper(source: string): boolean {
  return (
    /\bfrom\s+["'][^"']*\brepoRoot["']/.test(source) && source.includes("resolveRepoRoot(")
  );
}

/**
 * A file needs the repository root if it holds one, by any means. The disjunction is the
 * point: were the population defined only as "imports the helper" it would be satisfied by
 * every compliant file and empty of every non-compliant one, which is a guard that cannot
 * fail. A file that goes back to asking git directly is caught by the first clause and a
 * file that names a root at all by the third, so neither can leave the population by
 * misbehaving.
 */
function needsRepositoryRoot(source: string): boolean {
  return (
    derivesRootFromGit(source) || reachesTheHelper(source) || /\brepoRoot\b/.test(source)
  );
}

/**
 * The two files allowed to name a git path flag, each with the reason it may. Asserted in
 * both directions below, so neither can rot into an exemption that excuses nothing and
 * neither can go on excusing a file that has stopped needing it.
 */
const MAY_NAME_A_GIT_PATH_FLAG: ReadonlyMap<string, string> = new Map([
  ["support/repoRoot.ts", "it is the one place the root is read, and what it normalises"],
  ["support/repoRoot.test.ts", "it lists the flags in order to sweep for them"],
]);

/** The five invariants the fix was measured against. Named so the population cannot lose them. */
const THE_FIVE_CALL_SITES = [
  "eraCivicCatalogueDominance.test.ts",
  "eraCivicCatalogueParity.test.ts",
  "eraDecisionCount.test.ts",
  "hardWinterClockless.test.ts",
  "repoFileCasing.test.ts",
];

describe("every test that needs a repository root reaches the shared helper", () => {
  const sources = sourcesUnderTest();
  const population = [...sources].filter(
    ([path, source]) => !MAY_NAME_A_GIT_PATH_FLAG.has(path) && needsRepositoryRoot(source),
  );

  it("finds the sources at all", () => {
    // The floor under every sweep below. All of them quantify over `sources`, so a walk
    // that came back empty would read as unanimous compliance. Six is the five invariants
    // plus the helper; this sweep itself is necessarily present, since it is running.
    expect(sources.size).toBeGreaterThanOrEqual(6);
    expect([...sources.keys()]).toContain("support/repoRoot.ts");
  });

  it("has all five of the invariants that carried the bug in its population", () => {
    // Composition, not merely size: a floor of five is met by five of anything, and a
    // population that is the right size and the wrong set is the failure this repo keeps
    // hitting. Over-inclusion is not the hazard here -- anything the detector sweeps in
    // simply has to satisfy the property below -- so the claim is containment plus a
    // floor rather than equality, and a sixth file that needs a root needs no edit here.
    const found = population.map(([path]) => path);
    expect(found.length).toBeGreaterThanOrEqual(5);
    for (const site of THE_FIVE_CALL_SITES) {
      expect(
        found,
        `${site} dropped out of the population this sweep quantifies over`,
      ).toContain(site);
    }
  });

  it("routes every member of that population through the helper", () => {
    expect(population.length).toBeGreaterThanOrEqual(5);

    for (const [path, source] of population) {
      expect(
        reachesTheHelper(source),
        `${path} holds a repository root but never imports and calls resolveRepoRoot`,
      ).toBe(true);
      expect(
        derivesRootFromGit(source),
        `${path} asks git for a path itself; that answer is MSYS-form on Windows`,
      ).toBe(false);
    }
  });

  it("keeps the normalisation itself in exactly one file", () => {
    // Derived from the helper's own pattern rather than retyped, so the census cannot
    // drift away from the thing it is counting. Five copies of a regex is how one of them
    // is later fixed alone.
    const carriers = [...sources]
      .filter(([, source]) => source.includes(MSYS_DRIVE_PREFIX.source))
      .map(([path]) => path);
    expect(carriers).toEqual(["support/repoRoot.ts"]);
  });

  it("keeps both flag-naming exemptions load-bearing, and lets no third file join them", () => {
    // Direction one: a listed file that no longer names a flag is excusing nothing, and
    // would sit in the list forever hiding that fact.
    for (const [path, why] of MAY_NAME_A_GIT_PATH_FLAG) {
      const source = sources.get(path);
      expect(source, `${path} is a declared exemption that no longer exists`).toBeDefined();
      expect(
        derivesRootFromGit(source ?? ""),
        `${path} is exempted because ${why}, but it names no git path flag any more`,
      ).toBe(true);
    }

    // Direction two: nothing else may name one.
    const namers = [...sources]
      .filter(([, source]) => derivesRootFromGit(source))
      .map(([path]) => path)
      .sort();
    expect(namers).toEqual([...MAY_NAME_A_GIT_PATH_FLAG.keys()].sort());
  });

  it("detects the compliant and the non-compliant shapes apart", () => {
    // Pins the three detectors. Each sweep above passes by finding nothing wrong, which
    // is also precisely how they would look with a detector broken into a constant.
    const fixed =
      'import { resolveRepoRoot } from "./support/repoRoot";\nconst repoRoot = resolveRepoRoot();';
    const broken =
      'const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"]).trim();';
    const unrelated = 'import { describe } from "vitest";\nconst answer = 41 + 1;';

    expect(reachesTheHelper(fixed)).toBe(true);
    expect(reachesTheHelper(broken)).toBe(false);
    expect(reachesTheHelper(unrelated)).toBe(false);

    expect(derivesRootFromGit(broken)).toBe(true);
    expect(derivesRootFromGit(fixed)).toBe(false);
    expect(derivesRootFromGit(unrelated)).toBe(false);

    // The disjunction, which is what stops the population emptying itself: a file that
    // reintroduces the bug is IN, and so is one that merely names a root by hand.
    expect(needsRepositoryRoot(broken)).toBe(true);
    expect(needsRepositoryRoot(fixed)).toBe(true);
    expect(needsRepositoryRoot("const repoRoot = somewhereElse();")).toBe(true);
    expect(needsRepositoryRoot(unrelated)).toBe(false);

    // An import without a call is not reach.
    expect(reachesTheHelper('import { resolveRepoRoot } from "./support/repoRoot";')).toBe(
      false,
    );
  });
});
