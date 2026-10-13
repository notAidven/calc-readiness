/**
 * No tracked module path may be reachable by an ambiguous import specifier, and no two
 * tracked paths may differ only in the case of their letters.
 *
 * ## The bug this exists to prevent
 *
 * `apps/web/src/lessons/` once held `MathPreview.tsx` (a React component exporting
 * `MathPreview`) beside `mathPreview.ts` (a parser exporting `previewOf` and, as a
 * TYPE only, `MathPreview`). On the case-insensitive filesystem every developer here
 * uses, Vite resolved `MathAnswerColumn.tsx`'s `import { MathPreview } from
 * "./MathPreview"` to the parser. A type is erased at runtime, so the browser got
 *
 *   SyntaxError: The requested module '/src/lessons/MathPreview.ts'
 *   does not provide an export named 'MathPreview'
 *
 * at ES-module link time. A link error is not catchable by the importer, so it took
 * down the whole entry graph: the app served a white screen with nothing in `#root`.
 *
 * It reached this branch through a 181-commit forward-merge, from `integration`, where
 * it had already shipped green. That is the fact that makes this test the point of the
 * whole exercise rather than a footnote to a rename.
 *
 * ## Why CI could not have caught it, and why this test can
 *
 * `.github/workflows/invariants.yml` runs on `ubuntu-latest`. Linux filesystems are
 * case-sensitive, so on the runner `./MathPreview` resolves to `MathPreview.tsx` and
 * only ever to that: the app builds, the suite passes, the merge goes green. The defect
 * is invisible there BY CONSTRUCTION, and reproducible on every macOS checkout on the
 * team. No amount of test coverage of the app's behaviour closes that gap, because the
 * runner's filesystem is the thing that differs.
 *
 * So this test deliberately never asks the filesystem anything. Its inventory comes
 * from `git ls-files`, which reports the paths GIT records, and its comparison is
 * `toLowerCase()` in JS. Both are byte-identical on every platform, so the verdict is
 * the same on the runner as on a laptop, and a collision fails CI on Linux even though
 * Linux itself would happily run the app. Verified rather than argued: with its
 * inventory pointed at `git ls-tree -r origin/integration` -- git object data, no
 * working tree involved at all, which is precisely what the runner checks out -- the
 * first assertion below failed on `MathPreview.tsx` beside `mathPreview.ts`.
 *
 * Corollary worth knowing: a `git ls-files` inventory reports BOTH halves of a pair
 * that differs only in case even on a machine whose disk cannot hold both at once,
 * because it is reading the index and not the directory.
 *
 * ## Why the obvious version of this test would NOT have caught it
 *
 * Worth stating outright, because "no two files differ only by case" is the natural
 * way to describe the defect and it is the wrong assertion. `MathPreview.tsx` and
 * `mathPreview.ts` differ in their EXTENSION as well as their case, so they fold to
 * `mathpreview.tsx` and `mathpreview.ts` -- two different strings, and a case-only
 * check over whole paths passes happily. Verified, not assumed.
 *
 * What actually collided is the thing an import writes: the extensionless specifier
 * `./MathPreview`, which both files answer to once the resolver is free to append an
 * extension and ignore case. So the primary assertion here is over the case-folded
 * STEM within a directory, which is the real namespace an import addresses. It also
 * catches the same hazard without any casing involved (`foo.ts` beside `foo.tsx`),
 * where the winner is decided by resolver extension order and tsc's order and Vite's
 * are not the same list.
 *
 * ## Why `forceConsistentCasingInFileNames` is not a substitute
 *
 * `tsconfig.base.json` has set it since long before that collision and it is not
 * switched off anywhere. It DID fire on this instance (TS1261 and TS1149), so it is
 * not useless -- but it only fires when both spellings are pulled into one TypeScript
 * program by imports. Here that took the parser's own test importing `./mathPreview`
 * while `MathAnswerColumn.tsx` imported `./MathPreview`; with a single importer, TS
 * sees one consistent specifier, reports nothing, and `npm run typecheck` is green
 * while Vite is still free to hand the browser whichever file its resolver cached
 * first. It says nothing about a pair neither file imports yet, nothing about two
 * directory names, and nothing about the extension-order case above. Biome is no help
 * either: it lints one file at a time and never sees a sibling's name.
 *
 * ## Why `git ls-files` rather than walking the tree
 *
 * The inventory is the TRACKED set, so scratch files, screenshot output and
 * `node_modules` cannot make it flake or slow it down. It is also the set that
 * matters: a collision only reaches a teammate's checkout if git is carrying it.
 */

import { execFileSync } from "node:child_process";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * Extensions a resolver will append to an extensionless specifier. Vite's default
 * `resolve.extensions` plus the TypeScript-only members, so a file is counted here
 * exactly when `./stem` could land on it. `.json` is included because
 * `resolveJsonModule` is on and Vite lists it too.
 */
const RESOLVABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
]);

const repoRoot = resolveRepoRoot();

/** Every path git tracks, NUL-separated so odd names need no unquoting. */
function trackedPaths(): string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.length > 0);
}

/**
 * Groups of module files in one directory that an extensionless specifier cannot tell
 * apart: same directory, same stem once case is folded.
 *
 * Only the FINAL extension is stripped, which is what keeps the house test-file
 * convention out of it -- `mathPreviewParser.test.ts` has the stem
 * `mathPreviewParser.test`, so it never merges with `mathPreviewParser.ts`, and
 * `./mathPreviewParser` genuinely cannot reach it.
 */
function ambiguousSpecifiers(paths: readonly string[]): string[][] {
  const byStem = new Map<string, Set<string>>();
  for (const path of paths) {
    const extension = posix.extname(path);
    if (!RESOLVABLE_EXTENSIONS.has(extension)) {
      continue;
    }
    const directory = posix.dirname(path);
    const stem = posix.basename(path, extension);
    const key = `${directory}/${stem}`.toLowerCase();
    const group = byStem.get(key);
    if (group === undefined) {
      byStem.set(key, new Set([path]));
    } else {
      group.add(path);
    }
  }
  return [...byStem.values()]
    .filter((group) => group.size > 1)
    .map((group) => [...group].sort());
}

/**
 * Each tracked file path AND every directory path above it. Directories are included
 * because `src/Lessons/a.ts` beside `src/lessons/b.ts` is the same defect one level up:
 * git tracks both and a case-insensitive checkout merges them into one directory.
 */
function pathsAndAncestors(files: readonly string[]): string[] {
  const all = new Set<string>();
  for (const file of files) {
    const segments = file.split("/");
    for (let depth = 1; depth <= segments.length; depth += 1) {
      all.add(segments.slice(0, depth).join("/"));
    }
  }
  return [...all];
}

/** Groups of 2+ distinct paths that collapse onto one another when case is ignored. */
function caseCollisions(paths: readonly string[]): string[][] {
  const byFolded = new Map<string, Set<string>>();
  for (const path of paths) {
    const folded = path.toLowerCase();
    const group = byFolded.get(folded);
    if (group === undefined) {
      byFolded.set(folded, new Set([path]));
    } else {
      group.add(path);
    }
  }
  return [...byFolded.values()]
    .filter((group) => group.size > 1)
    .map((group) => [...group].sort());
}

describe("tracked paths cannot be confused with one another", () => {
  it("has no directory where one specifier could mean two module files", () => {
    const files = trackedPaths();

    // The floor. Every assertion below passes trivially over an empty list, so an
    // inventory that came back empty -- git missing, a wrong cwd, a flag renamed
    // under us -- would otherwise read as a pass. Measured at 939 tracked files and
    // 705 resolvable module files when this was written; these floors leave room to
    // delete a great deal without anyone having to edit this test, and still cannot
    // be reached by a listing that silently failed.
    expect(files.length).toBeGreaterThan(500);

    const modules = files.filter((file) => RESOLVABLE_EXTENSIONS.has(posix.extname(file)));
    expect(modules.length).toBeGreaterThan(400);

    expect(ambiguousSpecifiers(files)).toEqual([]);
  });

  it("has no two tracked paths differing only in case", () => {
    const paths = pathsAndAncestors(trackedPaths());

    // Floor again, and a shape check: ancestors can only ADD to the file list, so a
    // count below the file count would mean the expansion silently dropped entries.
    expect(paths.length).toBeGreaterThan(500);

    expect(caseCollisions(paths)).toEqual([]);
  });

  it("detects both kinds of collision when one is present", () => {
    // The two checks above pass by finding nothing, which is also exactly how they
    // would look if either detector had been broken into always returning []. These
    // pin the detectors against the real shape of the bug.

    // The instance that broke the app, and the case a whole-path fold misses.
    expect(
      ambiguousSpecifiers([
        "apps/web/src/lessons/MathPreview.tsx",
        "apps/web/src/lessons/mathPreview.ts",
      ]),
    ).toEqual([
      ["apps/web/src/lessons/MathPreview.tsx", "apps/web/src/lessons/mathPreview.ts"],
    ]);
    expect(
      caseCollisions([
        "apps/web/src/lessons/MathPreview.tsx",
        "apps/web/src/lessons/mathPreview.ts",
      ]),
    ).toEqual([]);

    // The house test-file convention must NOT read as a collision.
    expect(
      ambiguousSpecifiers([
        "apps/web/src/lessons/mathPreviewParser.ts",
        "apps/web/src/lessons/mathPreviewParser.test.ts",
        "apps/web/src/lessons/MathPreview.tsx",
      ]),
    ).toEqual([]);

    // Same hazard with no casing involved: resolver extension order picks the winner.
    expect(ambiguousSpecifiers(["src/foo.ts", "src/foo.tsx"])).toEqual([
      ["src/foo.ts", "src/foo.tsx"],
    ]);

    // A directory-name collision, which only the whole-path fold sees.
    expect(
      caseCollisions(
        pathsAndAncestors(["apps/web/src/Lessons/a.ts", "apps/web/src/lessons/b.ts"]),
      ),
    ).toEqual([["apps/web/src/Lessons", "apps/web/src/lessons"]]);
  });
});
