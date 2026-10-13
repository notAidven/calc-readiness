/**
 * **NO BROWSER-MODE TEST MAY MOCK A MODULE, BECAUSE THE MOCK WILL NOT HAPPEN AND NOTHING
 * WILL SAY SO.**
 *
 * Vitest's browser-mode module mocker keys its registry on a URL-ESCAPED module id while
 * the module graph under test resolves the DECODED one. When the checkout sits at a path
 * containing a space -- `/Users/<you>/Remedial App - Calc`, which is every developer
 * machine on this project -- the two ids never match. `vi.mock` registers, matches nothing,
 * and returns. No error, no warning. The test then exercises the REAL module, takes
 * whatever branch that implies, and reports green.
 *
 * It fails OPEN, which is the whole reason this file exists. A mocker that threw would cost
 * an afternoon; one that silently declines costs however long it takes somebody to doubt a
 * green run.
 *
 * ## What it already cost, measured
 *
 * `fec121a6` is the case history and is worth reading before touching this sweep.
 * `widgetVariantPool.browser.test.tsx` swept for variant-driven lesson widgets and measured
 * **0 of 124** while its other 174 assertions passed. The expected count had been raised by
 * hand six times -- 37, 46, 66, 87, 116, 124 -- each time by reading the sources, because
 * nobody on the team could observe the real value. A bisect over all 309 commits back to
 * where the count was pinned found every one of them green from a space-free path. The fix
 * was to move that one file out of browser mode into jsdom, where the mocker works
 * perfectly well on this very path. **That fixed the file and left the mechanism entirely
 * intact**, so the next browser test to reach for `vi.mock` is inert in the same way. This
 * sweep is what stands in for the mechanism not being fixed.
 *
 * ## The remedy, when this sweep names your file
 *
 * In order of preference:
 *
 *  1. **Run the file in jsdom** -- drop `.browser` from the name, as `fec121a6` did. Almost
 *     everything that wants a module mock is asserting about logic, state or the DOM tree,
 *     and jsdom serves all three. Browser mode is for claims about PAINT: real layout, real
 *     fonts, real WebGL, screenshots.
 *  2. **Restructure so no module mock is needed** -- pass the collaborator in as a prop or
 *     an argument. A browser test that needs Chromium AND needs to replace a module is
 *     usually two tests.
 *
 * ## Which APIs are banned, and how that was decided
 *
 * Measured on this tree at Vitest 4.1.10, not assumed. The same six probe files were run
 * three ways: browser mode from this checkout (spaced), browser mode from
 * `/private/tmp/mockprobe/nospace` and `/private/tmp/mockprobe/with space` (identical
 * files, symlinked `node_modules`, the directory name the only variable), and jsdom from
 * this checkout. Banning something that works is a tax and missing something that breaks is
 * a hole, so each entry below is a result rather than a guess.
 *
 * | API | space-free path | this path | verdict |
 * |---|---|---|---|
 * | `vi.mock(id, factory)` | mock applies | returns the REAL module, silently | **BANNED** -- fails open |
 * | `vi.mock(id)` + `__mocks__/` | mock applies | returns the REAL module, silently | **BANNED** -- fails open |
 * | `vi.doMock(id, factory)` | mock applies | returns the REAL module, silently | **BANNED** -- fails open |
 * | `vi.importMock(id)` | resolves | throws `Failed to fetch dynamically imported module` | **BANNED** -- cannot pass here |
 * | `vi.importActual(id)` | resolves | throws `Cannot resolve "..." imported from ".../Remedial%20App%20-%20Calc/..."` | **BANNED** -- cannot pass here |
 *
 * The last two fail LOUDLY rather than open, so they cannot manufacture a false green. They
 * are banned anyway because they cannot pass on any machine here while passing on CI, which
 * is its own trap: a test that is red for everyone who wrote it and green in the only place
 * that gates. Note the second one prints the escaped path verbatim -- that `%20` is the
 * defect, visible.
 *
 * **Deliberately NOT banned**, each measured to work in browser mode on this path:
 *
 *  - `vi.fn()` -- a plain spy, no module registry involved. Fourteen uses across three
 *    browser tests today, all legitimate.
 *  - `vi.spyOn(plainObject, "method")` -- works. The MODULE-NAMESPACE form
 *    (`vi.spyOn(importedNamespace, "export")`) throws `Cannot spy on export ... Module
 *    namespace is not configurable in ESM`, but it throws identically from a space-free
 *    path, so it is a documented browser-mode limitation rather than this defect, and it
 *    fails closed.
 *  - `vi.mocked(x)` -- a runtime identity function for typing. Measured: `vi.mocked(spy)`
 *    is `spy`.
 *  - `vi.hoisted(fn)` -- runs, returns its value.
 *  - `vi.mockObject(obj)` -- replaces an object's methods in place, no module id to escape.
 *  - `vi.unmock` / `vi.doUnmock` -- the inverse of a banned call. Inert here like everything
 *    else on the registry, but inertly NOT-unmocking a mock that never applied cannot
 *    produce a wrong result, so banning them would be decorative.
 *
 * ## How the population is derived, and why it is not a list
 *
 * Per `.cursor/rules/qa-verification.mdc`, a sweep whose file list can go quietly empty
 * passes over nothing (`#191`), and a floor bounds a population's SIZE but not its SHAPE.
 * So:
 *
 *  - the population is whatever **Vitest itself** says it will run, obtained by executing
 *    `vitest list --filesOnly` against `vitest.browser.config.ts`. Not a glob written down
 *    here, and not a naming convention assumed here: if somebody adds a project or widens
 *    an `include`, this sweep widens with it on the next run and cannot be out of date;
 *  - that population is then reconciled **both ways** against the tracked-and-untracked
 *    tree, so a browser-named file no project collects fails (it would otherwise run
 *    nowhere at all, silently), and a collected file that is not a browser-named test fails;
 *  - it carries a floor, per-project floors, and a directory-spread assertion, so shrinking
 *    to one project or one folder fails even while the total stays plausible;
 *  - and the DETECTOR is verified against a real positive from the tree on every run, not a
 *    synthetic one, so a regex that has stopped matching anything fails instead of
 *    reporting a clean sweep.
 *
 * ## The exception, and why it is not decorative
 *
 * Exactly one browser test may call `vi.mock`:
 * `apps/web/src/test/browserMockerCanary.browser.test.tsx`. It mocks a module that exists
 * only to be mocked and asserts the BICONDITIONAL -- the mock takes effect exactly when the
 * checkout path has no space -- so it is green on a developer machine here (inert, as
 * claimed) and green on CI (working, as claimed), and it goes red the day Vitest fixes the
 * escaping. That is how this ban expires instead of outliving its reason. It is also the
 * positive control below: the detector is required to find its `vi.mock`, so an exemption
 * that stopped exempting anything fails, and a file that adopts a banned API without
 * joining the list fails.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * Sized to what this file DOES, following `ciScopeFilter.test.ts`. The population comes
 * from a real `vitest list` subprocess, which resolves the browser config (React plugin,
 * Playwright provider) before it can answer: ~1.1s solo, and this project runs beside the
 * jsdom one, so several times that under contention. The 5s default would turn contention
 * into a failure indistinguishable in a run log from a real offender.
 */
vi.setConfig({ testTimeout: 60_000 });

const BROWSER_CONFIG = "vitest.browser.config.ts";
const CANARY = "apps/web/src/test/browserMockerCanary.browser.test.tsx";

const repoRoot = resolveRepoRoot();

// ---------------------------------------------------------------------------------
// What counts as mocking a module.
// ---------------------------------------------------------------------------------

/**
 * The banned calls, each with the sentence a tripped author needs. Keyed by API name so a
 * report can name the exact call rather than "a mocking API".
 *
 * Matched as a CALL (`vi.mock(`), not as a bare mention, so the prose in this file and in
 * the canary's comments does not trip the sweep it documents. Two known limits, both
 * accepted: a call reached through an alias (`const { mock } = vi`) is invisible here, and
 * so is one built by string concatenation. Neither has ever been written in this tree, and
 * the canary covers the mechanism rather than the syntax for exactly this reason.
 *
 * The optional type-argument group is not decoration. `vi.importMock<typeof target>("./x")`
 * and `vi.importActual<T>("./x")` are the IDIOMATIC spellings of those two, since the type
 * argument is how the caller gets a typed result back. The first draft of this pattern went
 * straight from the method name to the open paren, and so read a probe file that called both
 * of them and reported it clean -- the exact shape of failure this whole file exists to stop,
 * reproduced inside the guard on its first run. `DETECTOR_MUST_MATCH` below exists because of
 * that, and pins every spelling.
 */
const BANNED: readonly { api: string; why: string }[] = [
  {
    api: "mock",
    why: "registers against a URL-escaped module id, matches nothing, and returns silently -- the test then runs the REAL module and reports green",
  },
  {
    api: "doMock",
    why: "registers against a URL-escaped module id, matches nothing, and returns silently -- the dynamic import that follows returns the REAL module",
  },
  {
    api: "importMock",
    why: 'throws "Failed to fetch dynamically imported module" here, so the test cannot pass on any machine on this project while passing on CI',
  },
  {
    api: "importActual",
    why: 'throws "Cannot resolve ... imported from .../Remedial%20App%20-%20Calc/..." here, so the test cannot pass on any machine on this project while passing on CI',
  },
];

const BANNED_PATTERN = new RegExp(
  `\\bvi\\s*\\.\\s*(${BANNED.map((entry) => entry.api).join("|")})\\s*(?:<[^()]*>\\s*)?\\(`,
  "g",
);

/**
 * Spellings the detector MUST catch. Every one of these is a call somebody could plausibly
 * write, and the generic forms are here because a pattern without them shipped in the first
 * draft of this file and reported a file calling two banned APIs as clean.
 */
const DETECTOR_MUST_MATCH: readonly string[] = [
  'vi.mock("./target", () => ({}));',
  'vi.mock("./target");',
  'vi.doMock("./target", () => ({}));',
  'const m = await vi.importMock<typeof target>("./target");',
  'const a = await vi.importActual<typeof target>("./target");',
  'const a = await vi.importActual<Record<string, string>>("./target");',
  'vi .mock ("./target");',
];

/**
 * Spellings the detector MUST NOT catch, which is the other half of the measurement. Each
 * was run in browser mode on this path and works, so flagging one would be a tax rather than
 * a guard -- and `vi.fn` in particular is used fourteen times across the lane today. The
 * prose entry keeps this file and the canary's own header from tripping the sweep.
 */
const DETECTOR_MUST_NOT_MATCH: readonly string[] = [
  "const spy = vi.fn();",
  "vi.mocked(spy).mockReturnValue(1);",
  'vi.spyOn(host, "method");',
  "const h = vi.hoisted(() => ({}));",
  "vi.mockObject(target);",
  'vi.unmock("./target");',
  "// `vi.mock` is banned in browser mode; see fec121a6.",
];

interface Offence {
  readonly file: string;
  readonly api: string;
  readonly line: number;
}

function offencesIn(file: string, source: string): Offence[] {
  const found: Offence[] = [];
  for (const match of source.matchAll(BANNED_PATTERN)) {
    const api = match[1] ?? "";
    const line = source.slice(0, match.index).split("\n").length;
    found.push({ file, api, line });
  }
  return found;
}

function describeOffence(offence: Offence): string {
  const why = BANNED.find((entry) => entry.api === offence.api)?.why ?? "";
  return `${offence.file}:${offence.line} calls vi.${offence.api}(), which ${why}`;
}

// ---------------------------------------------------------------------------------
// The population: whatever Vitest says it will run in a browser.
// ---------------------------------------------------------------------------------

/**
 * Ask Vitest, rather than re-deriving its globs here.
 *
 * `vitest list --filesOnly` prints one `[project (browser)] path` line per collected file
 * and resolves the config exactly as a real run would, so this cannot drift from
 * `vitest.browser.config.ts` the way a copy of its `include` arrays would. It is also the
 * only derivation that stays correct if a project is added, since a new project's files
 * appear here without anybody remembering this file exists.
 */
function collectedBrowserFiles(): { file: string; project: string }[] {
  const require = createRequire(import.meta.url);
  const vitestCli = join(dirname(require.resolve("vitest/package.json")), "vitest.mjs");

  const stdout = execFileSync(
    process.execPath,
    [vitestCli, "list", "--config", BROWSER_CONFIG, "--filesOnly"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    },
  );

  const collected: { file: string; project: string }[] = [];
  for (const line of stdout.split("\n")) {
    const match = /^\[([^\]]+)\]\s+(\S.*?)\s*$/.exec(line);
    if (match) {
      collected.push({ project: match[1] ?? "", file: match[2] ?? "" });
    }
  }
  return collected;
}

/**
 * Every browser-NAMED test file in the working tree, tracked or merely written.
 *
 * `--others --exclude-standard` for the same reason `ciScopeFilter.test.ts` keeps it: a
 * tracked-only inventory is blind to exactly the file under review, which is the file
 * somebody is most likely to be putting a `vi.mock` into right now.
 */
function browserNamedFilesInTree(): string[] {
  const stdout = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return stdout
    .split("\n")
    .filter((path) => /\.browser\.test\.tsx?$/.test(path))
    .sort();
}

const collected = collectedBrowserFiles();
const collectedFiles = [...new Set(collected.map((entry) => entry.file))].sort();
const namedInTree = browserNamedFilesInTree();

const sources = new Map(
  collectedFiles.map((file) => [file, readFileSync(join(repoRoot, file), "utf8")]),
);

const offences = collectedFiles.flatMap((file) =>
  offencesIn(file, sources.get(file) ?? ""),
);

/**
 * The floor under everything below. 121 files across 14 directories were collected the day
 * this was written (115 `web`, 6 `packages`, the 121st being the canary this file adds);
 * the floor is well beneath that and is not a census, because the number is meant to grow.
 * What it is FOR is the derivation returning nothing -- a renamed config, a `vitest list`
 * that changed its output shape, a parse that stopped matching -- where a sweep over an
 * empty population reports a clean bill of health. Measured: break the line parser and five
 * of the assertions below go red, including this one.
 */
const MIN_BROWSER_FILES = 90;

/** Per project, so the population cannot lose a whole project and stay above the floor. */
const MIN_PER_PROJECT: readonly { match: RegExp; floor: number; label: string }[] = [
  {
    match: /^web\b/,
    floor: 80,
    label: "web (the apps/web + shared-components React lane)",
  },
  { match: /^packages\b/, floor: 4, label: "packages (the pure package checkers)" },
];

/**
 * The browser tests allowed to call a banned API, each with the reason it is allowed.
 *
 * Asserted in BOTH directions below, per `.cursor/rules/qa-verification.mdc`: an entry that
 * stops qualifying fails, so a renamed or deleted canary cannot sit here exempting nothing,
 * and a file that adopts a banned API without joining this list fails. Keep it at one
 * entry unless a second file can show its own measurement.
 */
const ALLOWED_TO_MOCK: readonly { file: string; reason: string }[] = [
  {
    file: CANARY,
    reason:
      "it exists to measure whether the mocker is still broken, and asserts the mock takes effect exactly when the checkout path has no space -- so it is green here (inert) and green on CI (working), and red the day Vitest fixes the escaping",
  },
];

const allowed = new Set(ALLOWED_TO_MOCK.map((entry) => entry.file));

// ---------------------------------------------------------------------------------

describe("browser-mode tests cannot mock modules, because the mocker is silently inert here", () => {
  it("collected a real population out of the browser config", () => {
    expect(
      collectedFiles.length,
      `\`vitest list --config ${BROWSER_CONFIG} --filesOnly\` returned ${collectedFiles.length} files, fewer than the floor of ${MIN_BROWSER_FILES}. Every assertion below sweeps that list, so this sweep is currently measuring nothing. Check that the config still exists and that \`vitest list\` still prints \`[project] path\` lines.`,
    ).toBeGreaterThanOrEqual(MIN_BROWSER_FILES);

    for (const project of MIN_PER_PROJECT) {
      const count = new Set(
        collected.filter((e) => project.match.test(e.project)).map((e) => e.file),
      ).size;
      expect(
        count,
        `only ${count} browser test files were collected for project ${project.label}, under its floor of ${project.floor}. A population that loses a whole project can stay above the total floor while covering half of what it claims.`,
      ).toBeGreaterThanOrEqual(project.floor);
    }
  });

  it("the population spans the tree rather than one corner of it", () => {
    // Composition, not size. A total floor is satisfied by any 90 files; this fails if the
    // population collapses into a single lane while staying large.
    const directories = new Set(collectedFiles.map((file) => dirname(file)));
    expect(
      directories.size,
      `the collected browser tests live in only ${directories.size} directories, which is too few for a population this size to be the whole browser lane`,
    ).toBeGreaterThanOrEqual(8);

    for (const root of ["apps/web/src/", "packages/shared-components/src/"]) {
      expect(
        collectedFiles.some((file) => file.startsWith(root)),
        `no collected browser test lives under ${root}, so the population has stopped covering a lane that this sweep is supposed to cover`,
      ).toBe(true);
    }
  });

  it("every browser-named test file in the tree is actually collected by a browser project", () => {
    // The orphan hole, and the reason this is a two-way census rather than a scan of the
    // collected list alone. `vitest.browser.config.ts` collects `apps/web/src/**/*.browser
    // .test.TSX` only, while `apps/web/vitest.config.ts` EXCLUDES `src/**/*.browser.test.
    // {ts,tsx}` from jsdom. So an `apps/web/src/foo.browser.test.TS` is collected by no
    // project at all and runs nowhere, silently -- and this sweep would never see it either.
    const uncollected = namedInTree.filter((file) => !collectedFiles.includes(file));
    expect(
      uncollected,
      `these files are named like browser tests but no project in ${BROWSER_CONFIG} collects them, so they run NOWHERE and no sweep can see them: ${uncollected.join(", ")}`,
    ).toEqual([]);
  });

  it("every collected browser file is a browser-named test file in the tree", () => {
    const unexpected = collectedFiles.filter((file) => !namedInTree.includes(file));
    expect(
      unexpected,
      `${BROWSER_CONFIG} collects these, but they are not browser-named files in the working tree, so the naming convention this sweep reasons about no longer holds: ${unexpected.join(", ")}`,
    ).toEqual([]);
  });

  it("the detector catches every spelling of a banned call, and nothing that works", () => {
    const missed = DETECTOR_MUST_MATCH.filter(
      (sample) => offencesIn("sample", sample).length === 0,
    );
    expect(
      missed,
      `the detector does not catch these calls, so a browser test written this way would sweep clean while its mocks silently did not happen: ${missed.join(" | ")}`,
    ).toEqual([]);

    const overreached = DETECTOR_MUST_NOT_MATCH.filter(
      (sample) => offencesIn("sample", sample).length > 0,
    );
    expect(
      overreached,
      `the detector flags these, but each was measured to work in browser mode on this path, so flagging it is a tax rather than a guard: ${overreached.join(" | ")}`,
    ).toEqual([]);
  });

  it("the detector still finds a real banned call, so a clean sweep means something", () => {
    // The positive control, taken from the tree rather than from a synthetic string. Without
    // it a regex that has stopped matching anything reports every file clean -- green over a
    // population it is no longer reading.
    const canarySource = sources.get(CANARY);
    expect(
      canarySource,
      `${CANARY} is not in the collected population, so the positive control for this sweep's detector is gone. It is also the exemption that keeps the ban honest: see the exception assertions below.`,
    ).toBeDefined();

    const canaryOffences = offencesIn(CANARY, canarySource ?? "");
    expect(
      canaryOffences.map((offence) => offence.api),
      `the detector found no banned call in ${CANARY}, which does call vi.mock(). The pattern has stopped matching, so every "clean" result below is measuring nothing.`,
    ).toContain("mock");

    expect(
      offences.length,
      "the detector reported no banned call anywhere, including in the canary, which is impossible while the canary exists",
    ).toBeGreaterThan(0);
  });

  it("no browser-mode test mocks a module", () => {
    const live = offences.filter((offence) => !allowed.has(offence.file));
    expect(
      live,
      [
        "These browser-mode tests call a module-mocking API that is SILENTLY INERT on this checkout,",
        "because Vitest's browser mocker keys its registry on a URL-escaped module id and this path",
        "contains a space. The mock does not happen, nothing warns, the real module runs, and the test",
        "reports green -- it fails OPEN. `fec121a6` has the measurement: a sweep that reported 0 of 124",
        "for six pinned revisions of a hand-raised number.",
        "",
        "Remedy: run the file in jsdom by dropping `.browser` from its name (which is what `fec121a6`",
        "did, and the mocker works fine there on this very path), or restructure so no module mock is",
        "needed. Browser mode is for claims about paint.",
        "",
        ...live.map((offence) => `  - ${describeOffence(offence)}`),
      ].join("\n"),
    ).toEqual([]);
  });

  it("every declared exception still exists and still needs its exemption", () => {
    // Direction one. An exemption that has stopped excusing anything is worse than no
    // exemption: it reads as a reviewed decision while covering a file that has moved on.
    for (const entry of ALLOWED_TO_MOCK) {
      expect(
        collectedFiles,
        `${entry.file} is listed as allowed to mock, but no browser project collects it any more. Delete the entry, or repoint it at wherever the file went.`,
      ).toContain(entry.file);

      const used = offences.filter((offence) => offence.file === entry.file);
      expect(
        used.map((offence) => `vi.${offence.api}`),
        `${entry.file} is listed as allowed to mock -- ${entry.reason} -- but it no longer calls any banned API. The exemption has stopped describing it, so delete the entry.`,
      ).not.toEqual([]);
    }
  });

  it("the exception list has not swallowed the population", () => {
    // Direction two's floor. Containment over a list that has grown to cover everything is
    // green and worthless; this fails long before that.
    expect(
      ALLOWED_TO_MOCK.length,
      `${ALLOWED_TO_MOCK.length} browser tests are exempted from the mocking ban. Each one is a test whose module mocks do not happen on any machine here. If a second file genuinely needs this, it owes its own measurement in its own header, the way the canary does.`,
    ).toBeLessThanOrEqual(2);
  });

  it("the browser config declares no setup files, which this sweep does not read", () => {
    // A blind spot, closed by forbidding the thing that would open it. A `vi.mock` in a
    // browser setup file would apply to every browser test and appear in none of their
    // sources, so this sweep would report clean over a whole lane of inert mocks.
    const config = readFileSync(join(repoRoot, BROWSER_CONFIG), "utf8");
    expect(
      /setupFiles/.test(config),
      `${BROWSER_CONFIG} now declares setupFiles. This sweep only reads the test files themselves, so a module mock in a setup file would be invisible to it and inert in every browser test at once. Extend the population above to include the setup files before adding one.`,
    ).toBe(false);
  });
});
