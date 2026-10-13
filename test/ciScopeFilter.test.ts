/**
 * The CI scope filter must classify as CODE every markdown file a test reads, must go on
 * classifying prose as PROSE, and must not classify a push to a watched branch at all.
 *
 * ## Two questions, and only one of them has a scope
 *
 * A pull-request run asks "can THIS DIFF break the code?", and answering it from the
 * changed paths is the whole point of the filter. A push run on `main`/`integration` asks
 * "IS THIS BRANCH GREEN?", and that answer never depends on what the last merge touched:
 * a breakage produced by COMBINING two separately-green changes belongs to neither side's
 * paths. Scoping a push run does not skip a run that would have passed; it withholds the
 * only verdict the merged tree ever gets, and reports success instead.
 *
 * It did that three times on 2026-08-02, the last of them measurable from outside: run
 * `30762101646` on `f1149558` (#429, docs-only) reported SUCCESS with steps 5-20 skipped,
 * `typecheck` and `test:unit` among them, over an `integration` that `test:unit` already
 * failed on. So the event is now half the input here: every case below names the shape it
 * runs under, and `a push to a watched branch is never scoped` asserts the decision does
 * not move with the diff. The pre-fix script is reconstructed in-file and driven over the
 * same inputs, so the bug is measured rather than described.
 *
 * ## The hole this closes
 *
 * `.github/workflows/invariants.yml` skips every gate step when a change touches only
 * file types nothing reads. The gates now live in sibling JOBS rather than in one job's
 * step list, so what they carry is `if: needs.scope.outputs.code == 'true'` and the
 * decision reaches them as a job output; only this filter and the advisory work-log
 * reminder are ungated. (The count of gated steps used to be written here as "fifteen of
 * eighteen" and moved the day a step was added; read the `if:` conditions, not a tally.
 * `test/ciGateAggregation.test.ts` is what holds every gate step to that one condition,
 * and holds the gates to being skipped as STEPS rather than as jobs.) Markdown was in
 * that inert set outright, and markdown is not uniformly inert: five tests open a `.md`
 * with `node:fs` and parse it.
 *
 * Measured on merged history rather than argued. Driving the step's own script over the
 * last forty merges on `integration`, four of them classified prose under the old rule
 * and code under the new one, and every one of the four edited a file a parser reads:
 * **#264** rewrote all ten `civic-buildings.md` catalogues, **#267** and **#292** one
 * each, and **#295** edited the era design spec plus every style guide. #292's run
 * finished in 13 seconds with 15 of 19 steps skipped. Those were valid check contexts
 * and evidence of nothing.
 *
 * ## Why the workflow comment is not enough on its own
 *
 * A list of "the markdown that is a test input" written into a YAML comment is a copy,
 * and a copy is a second place to be wrong. The failure is silent in the direction that
 * matters: a new test starts parsing a doc, nobody widens the filter, and the gate that
 * would have caught the next edit to that doc never runs. So the population here is
 * DERIVED from the tree -- every markdown name written in executable code, across every
 * source -- and the rule is not retyped but EXTRACTED from the workflow and run.
 *
 * THAT SCENARIO HAS SINCE HAPPENED TWICE, which is the strongest thing anyone can say for
 * this file. `test/eraPaletteLadder.test.ts` began parsing `City_Art_Bible.md`, and #336
 * added `test/interactionSuffixAllowlistParity.test.ts` parsing
 * `.cursor/skills/author/reference.md` without widening the filter; the derived population
 * caught the second on the runner and named both the file and the reader.
 *
 * The two were authored independently against the same carve-out line and CONFLICTED on
 * merge. That is the point restated as a fact about the repository rather than an
 * argument: a list of test inputs kept in a comment is a copy, copies are edited in
 * parallel, and the population here has to be derived because of it. Note also where the
 * second was caught. The author's local run could not execute this file at all, so a
 * written-down list would have had nothing to disagree with and the doc would have gone
 * on taking the cheap path.
 *
 * ## What is derived, what is extracted, and what is named
 *
 *  - EXTRACTED: the scope step's shell script, verbatim out of the YAML, executed
 *    against a scratch git repository whose diff is the file list under test. So this
 *    tests the shipped regex under the shipped `grep`, not a TypeScript paraphrase of
 *    it, and the fail-open branches and `^0` peels are exercised too.
 *  - DERIVED: the markdown population, by sweeping every source in the tree for a `.md`
 *    or `.mdc` name written outside a comment. To read a file you must name it, so a
 *    reader cannot leave this population by being written differently. The inventory is
 *    `git ls-files --cached --others --exclude-standard` and the `--others` half is
 *    load-bearing -- see `repositoryPaths`, which records what a tracked-only inventory
 *    did to this very file.
 *  - NAMED: two sources that name a markdown file WITHOUT reading it (a message string,
 *    a metadata string), each with its reason, asserted in both directions -- a listed
 *    source that stops naming one fails, and an unlisted source that starts naming one
 *    fails too. That is what keeps an exemption from becoming permanent by neglect, and
 *    what stops this sweep quietly narrowing to the readers that already comply. Exactly
 *    one source is excluded wholesale, and it is this one; the escape hatch is asserted
 *    to be one file wide, against a path derived from `import.meta.url`.
 *
 * ## Both properties are guarded, because either one alone is trivial to satisfy
 *
 * "Every test input runs the suite" is satisfied by classifying all markdown as code,
 * which would throw away the saving the filter exists for. "The prose saving survives"
 * is satisfied by classifying none of it as code, which is the bug. So the census below
 * asserts both directions at once: the derived readers are code, a named sample of prose
 * is prose, and prose outnumbers code by a wide margin computed from the tree rather
 * than pinned to a tally.
 *
 * ## Non-vacuity is proven by injection, in-file
 *
 * Every assertion here passes by finding agreement, which is also how it would look with
 * the classifier broken into a constant. So `runScope` is driven twice over the same
 * input: once with the shipped script and once with `TEST_INPUT_MARKDOWN` mutated to a
 * pattern no path can match. The era catalogue must come back code under the first and
 * prose under the second, and the mutation is asserted to have changed the script text
 * -- a replace that silently matched nothing would make that proof vacuous.
 *
 * The push assertions are held to the same standard by the same means: the PRE-FIX
 * decision procedure is reconstructed from the shipped script -- event guard lifted out,
 * `github.event.before` resolution put back -- and driven over the same inputs, where it
 * must answer prose on a push and agree with the shipped script on every pull-request
 * case in the table. So the bug is measured, and the saving is measured to survive.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it, vi } from "vitest";

// This file executes the GitHub Actions step under `/bin/bash` by design. Windows has no
// equivalent shell contract to exercise; the Linux runner remains authoritative for it.
const describeOnBashHost = process.platform === "win32" ? describe.skip : describe;

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * A budget sized to what this file DOES, rather than to what a unit test usually does.
 *
 * Every assertion here runs the real shipped script, which means a real `git commit` into the
 * scratch repository and a real `bash` process over it: ~0.7s each solo, and the suite runs
 * this project beside the jsdom one, so under contention it is several times that. Three
 * separate tests were failing on TIME rather than on classification at the 5s default — the
 * carve-out injection at 6.2s (two `runScope` calls per carved-out branch, each reddened on
 * its own, all of them required), the owed-paths census, and the prose census at 2.5s solo but
 * over 5s in parallel. A timeout and a real classification failure look identical in a run log,
 * which is how those sat unowned long enough for three agents to read them as somebody else's
 * carve-out bug.
 *
 * Set for this FILE and not for the `repo-hygiene` project, so the hygiene tests that are pure
 * file reads keep the tight default and a hang in one of them still fails fast. Bounded rather
 * than removed for the same reason: 60s is far above the 8s the slowest test here has ever
 * measured, and far below never finishing.
 */
vi.setConfig({ testTimeout: 60_000 });

const WORKFLOW = ".github/workflows/invariants.yml";

const repoRoot = resolveRepoRoot();
const workflow = readFileSync(join(repoRoot, WORKFLOW), "utf8");

// ---------------------------------------------------------------------------------
// Extracting the step, and running it.
// ---------------------------------------------------------------------------------

/**
 * The `run:` script of the step with `id: scope`, dedented, exactly as the runner
 * receives it.
 *
 * Read out of the YAML textually because no YAML parser is a dependency of this
 * repository, and adding one to read a single block literal is a worse trade than
 * fifteen lines here. The extraction is anchored on the step id rather than on a line
 * number, and every caller asserts the result is a real script, so an extraction that
 * silently came back empty cannot pass as agreement.
 */
function scopeScript(): string {
  const lines = workflow.split("\n");
  const idAt = lines.findIndex((line) => /^\s*id: scope\s*$/.test(line));
  if (idAt < 0) {
    throw new Error(`${WORKFLOW}: no step carries \`id: scope\``);
  }

  let runAt = -1;
  let indent = "";
  for (let index = idAt; index < lines.length; index += 1) {
    const match = /^(\s*)run: \|\s*$/.exec(lines[index] ?? "");
    if (match) {
      runAt = index;
      indent = `${match[1] ?? ""}  `;
      break;
    }
  }
  if (runAt < 0) {
    throw new Error(`${WORKFLOW}: the \`id: scope\` step has no \`run: |\` block`);
  }

  const body: string[] = [];
  for (let index = runAt + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      body.push("");
      continue;
    }
    if (!line.startsWith(indent)) {
      break;
    }
    body.push(line.slice(indent.length));
  }
  return `${body.join("\n")}\n`;
}

const SCRIPT = scopeScript();

/** The line that carries the markdown carve-out, so the mutation below can find it. */
const CARVE_OUT_LINE = /^TEST_INPUT_MARKDOWN=.*$/m;

/** The guard that makes the whole filter a pull-request-only affair. */
const EVENT_GUARD =
  /^if \[ "\$\{GITHUB_EVENT_NAME:-\}" != "pull_request" \]; then\n[\s\S]*?\nfi\n/m;

/** The base/head resolution that guard made sufficient. */
const PR_PAYLOAD_RESOLUTION =
  /^BASE="\$\{PR_BASE_SHA:-\}"\nHEAD="\$\{PR_HEAD_SHA:-\$\{GITHUB_SHA:-HEAD\}\}"\n/m;

/** The head of the two-branch resolution, which is also how it is found in the file. */
const BEFORE_SHA_RESOLUTION_HEAD = /^(\s*)if \[ -n "\$\{GITHUB_BASE_REF:-\}" \]; then$/;

/**
 * What the PR-payload resolution replaced: the two-branch form, which reached for
 * `github.event.before` whenever `GITHUB_BASE_REF` was empty -- i.e. on exactly the push
 * runs this file now says must not be scoped.
 *
 * LIFTED OUT OF THE WORKFLOW, not retyped from memory. The work-log reminder further down
 * the same job still resolves base and head this way and must: it is advisory, it gates
 * nothing, and it runs on every event. So the pre-fix shape is still in the file and this
 * is it, extracted for the same reason the scope script itself is -- a paraphrase would
 * be a copy, and a copy of the thing under test proves whatever it was typed to prove.
 *
 * Exactly one occurrence is required, which is also the assertion that the scope step no
 * longer has one of its own: two matches and the reconstruction below could be lifting
 * the wrong block, and one match in the wrong step would be this change silently undone.
 */
function beforeShaResolution(): string {
  const lines = workflow.split("\n");

  const found = lines.filter((line) => BEFORE_SHA_RESOLUTION_HEAD.test(line));
  if (found.length !== 1) {
    throw new Error(
      `${WORKFLOW}: expected exactly one \`GITHUB_BASE_REF\` base/head resolution (the ` +
        `work-log reminder's), found ${found.length}`,
    );
  }

  const start = lines.findIndex((line) => BEFORE_SHA_RESOLUTION_HEAD.test(line));
  const indent = BEFORE_SHA_RESOLUTION_HEAD.exec(lines[start] as string)?.[1] ?? "";
  const body: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index] as string;
    body.push(line.slice(indent.length));
    if (line === `${indent}fi`) {
      return `${body.join("\n")}\n`;
    }
  }
  throw new Error(
    `${WORKFLOW}: the base/head resolution at line ${start + 1} has no \`fi\``,
  );
}

/**
 * The branches this workflow runs a push job for, read out of its own `on:` block rather
 * than typed here, so a branch added to the trigger joins every sweep below instead of
 * going unswept.
 *
 * Throws rather than returning nothing if the trigger is reformatted: a population that
 * silently came back empty would make every sweep over it read as unanimous compliance,
 * which is the failure this whole file exists to refuse.
 */
function pushBranches(): string[] {
  const lines = workflow.split("\n");
  const onAt = lines.findIndex((line) => /^on:\s*$/.test(line));
  if (onAt < 0) {
    throw new Error(`${WORKFLOW}: no top-level \`on:\` block`);
  }
  const pushAt = lines.findIndex(
    (line, index) => index > onAt && /^ {2}push:\s*$/.test(line),
  );
  if (pushAt < 0) {
    throw new Error(`${WORKFLOW}: the \`on:\` block declares no \`push:\` trigger`);
  }
  const declaration = lines[pushAt + 1] ?? "";

  const flow = /^ {4}branches: \[([^\]]+)\]\s*$/.exec(declaration);
  if (flow !== null) {
    return (flow[1] as string)
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
  }

  // The block-sequence spelling is the same declaration and a reformat away, so it is
  // read rather than rejected. What must never happen is reading it as nothing.
  if (/^ {4}branches:\s*$/.test(declaration)) {
    const block: string[] = [];
    for (let index = pushAt + 2; index < lines.length; index += 1) {
      const item = /^ {6}- (\S+)\s*$/.exec(lines[index] ?? "");
      if (item === null) {
        break;
      }
      block.push(item[1] as string);
    }
    if (block.length > 0) {
      return block;
    }
  }

  throw new Error(
    `${WORKFLOW}: expected \`push:\` to declare \`branches\`, got ` +
      JSON.stringify(declaration),
  );
}

/**
 * How GitHub invokes a `shell: bash` step, read off a real run's log rather than
 * guessed: `bash --noprofile --norc -e -o pipefail {0}`.
 *
 * `-e` and `-o pipefail` are the part that matters and the part that was nearly missed
 * here. The step sets only `set -u` itself, so running it under a plain `bash` -- as an
 * earlier version of this file did -- exercises DIFFERENT semantics from production:
 * under `pipefail` the prose branch's two `grep`s both exit 1 when nothing matches, the
 * pipeline inherits that, and without the `|| true` on the assignment `-e` would abort
 * the step on exactly the cheap path it exists to take. That path is the one this
 * change cannot demonstrate end to end, so it is the one that most needs its shell to
 * be the real one.
 *
 * The script is handed over as a FILE, not `bash -c`, because `{0}` is a file: `$0` and
 * the line numbers in any error match what a run would print.
 */
const RUNNER_BASH = ["--noprofile", "--norc", "-e", "-o", "pipefail"];

const GIT_IDENTITY = [
  "-c",
  "user.name=ci-scope-filter-test",
  "-c",
  "user.email=ci-scope-filter-test@example.invalid",
  "-c",
  "commit.gpgsign=false",
];

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...GIT_IDENTITY, ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * A scratch repository, so the classification is driven over a REAL commit range that
 * this test owns end to end. Driving it over this repository's own history instead
 * would tie the test to commits a rebase can move.
 */
const scratch = mkdtempSync(join(tmpdir(), "ci-scope-filter-"));
git(scratch, ["init", "-q", "-b", "base"]);
writeFileSync(join(scratch, ".gitkeep"), "");
git(scratch, ["add", "--", ".gitkeep"]);
git(scratch, ["commit", "-q", "-m", "base"]);
const BASE_SHA = git(scratch, ["rev-parse", "HEAD"]).trim();

afterAll(() => {
  /*
   * `maxRetries`, because this teardown took `integration` red at `e6b8c0a0`:
   * `ENOTEMPTY, Directory not empty: /tmp/ci-scope-filter-otngHq`, thrown by the `rm`
   * itself with all 33 assertions passed. Node retries a recursive `rm` on exactly
   * `EBUSY`, `EMFILE`, `ENFILE`, `ENOTEMPTY` and `EPERM`, with a linear backoff, so the
   * error that was seen is the error this option exists for.
   *
   * **WHAT IS STILL WRITING IS NOT ESTABLISHED, and the obvious answer is measured wrong.**
   * The first guess was `git gc --auto` forked by the commits below and outliving them, and
   * that cannot be it: forty commits of this shape leave 81 loose objects against git's
   * default `gc.auto` threshold of 6700, so auto-gc is never eligible here. Recorded rather
   * than left as a plausible-sounding cause for the next person to inherit. This is
   * therefore robustness against a writer that has been OBSERVED but not identified, not a
   * fix for a diagnosed one, and if it recurs the thing to find out is who holds the
   * directory — `lsof` on the scratch path at teardown would say.
   *
   * A teardown is not an assertion. Waiting here makes the suite slower in the worst case
   * and does not make it say anything weaker; all 33 assertions have already run.
   */
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

interface Verdict {
  /** What the step wrote to `$GITHUB_OUTPUT`, which is what gates the expensive steps. */
  readonly code: boolean;
  /** The non-inert files it printed, i.e. WHY it decided that. */
  readonly remainder: readonly string[];
  /** Every `::notice::` it emitted, which is the other way it explains itself. */
  readonly notices: readonly string[];
  /** Whether it got as far as listing the diff, or answered before looking. */
  readonly inspectedPaths: boolean;
}

const REMAINDER_HEADER = "Non-inert files, so the full gate set runs:";
const CHANGED_HEADER = "Changed files in this change:";

/**
 * Which run the step is being asked about, because that is now half of its input: a
 * branch name for a push, or the pull-request shape.
 */
type EventShape = "pull_request" | { readonly pushTo: string };

/**
 * Runs `script` over a commit whose diff against the base is exactly `changed`, as `event`
 * presents it.
 *
 * Adding a file and editing one are indistinguishable to `git diff --name-only`, which
 * is the step's only input, so every case is expressed as an add.
 */
function runScope(
  script: string,
  changed: readonly string[],
  event: EventShape = "pull_request",
): Verdict {
  if (changed.length === 0) {
    throw new Error("runScope needs at least one changed path");
  }

  git(scratch, ["checkout", "-q", "-B", "case", BASE_SHA]);
  for (const path of changed) {
    const full = join(scratch, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, `content of ${path}\n`);
  }
  git(scratch, ["add", "--", ...changed]);
  git(scratch, ["commit", "-q", "-m", "case"]);
  const head = git(scratch, ["rev-parse", "HEAD"]).trim();

  // EVERY variable the step can read is set here, for both shapes, and none is left to
  // the ambient environment. On a runner this file is itself inside a run, so
  // GITHUB_EVENT_NAME, GITHUB_REF_NAME and GITHUB_BASE_REF all carry real values --
  // and since the step's answer now turns on the first of those, inheriting them would
  // make this suite answer a different question on a push run than on a pull-request
  // run, and go green either way.
  const shape =
    event === "pull_request"
      ? {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_REF_NAME: "437/merge",
          GITHUB_BASE_REF: "integration",
          PR_BASE_SHA: BASE_SHA,
          PR_HEAD_SHA: head,
          // A push's before-sha, present and resolvable even here. The step must not
          // reach for it on a PR either: the payload shas are the authority.
          GITHUB_EVENT_BEFORE: BASE_SHA,
        }
      : {
          GITHUB_EVENT_NAME: "push",
          GITHUB_REF_NAME: event.pushTo,
          GITHUB_BASE_REF: "",
          PR_BASE_SHA: "",
          PR_HEAD_SHA: "",
          // DELIBERATELY A REAL SHA, and the adversarial half of this shape. A push run
          // genuinely carries one, so leaving it empty would let a script that still
          // diffs on push pass by failing open for the wrong reason. With it set, the
          // only way to answer code=true is to decline to scope the run at all.
          GITHUB_EVENT_BEFORE: BASE_SHA,
        };

  const outputFile = join(scratch, "github-output");
  writeFileSync(outputFile, "");
  const scriptFile = join(scratch, "scope-step.sh");
  writeFileSync(scriptFile, script);
  const stdout = execFileSync("bash", [...RUNNER_BASH, scriptFile], {
    cwd: scratch,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      GITHUB_OUTPUT: outputFile,
      GITHUB_SHA: head,
      ...shape,
    },
  });

  const written = [...readFileSync(outputFile, "utf8").matchAll(/^code=(true|false)$/gm)];
  if (written.length !== 1) {
    throw new Error(
      `the scope step wrote ${written.length} code= lines to $GITHUB_OUTPUT; expected 1`,
    );
  }
  const code = written[0]?.[1] === "true";

  const lines = stdout.split("\n");
  const header = lines.indexOf(REMAINDER_HEADER);
  const remainder: string[] = [];
  if (header >= 0) {
    for (let index = header + 1; index < lines.length; index += 1) {
      const match = /^ {2}(\S.*)$/.exec(lines[index] ?? "");
      if (match === null) {
        break;
      }
      remainder.push(match[1] as string);
    }
  }

  const notices = [...stdout.matchAll(/^::notice::(.*)$/gm)].map(
    (match) => match[1] as string,
  );
  const inspectedPaths = lines.includes(CHANGED_HEADER);

  // Self-check, so a stdout format this test can no longer read fails loudly instead
  // of quietly reporting an empty remainder that agrees with everything. Two shapes are
  // legitimate: the step looked at the paths and its verdict agrees with the list it
  // printed, or it answered before looking and said in a notice why.
  if (inspectedPaths && code !== remainder.length > 0) {
    throw new Error(
      `could not read the step's reasoning: code=${code} but parsed ` +
        `${remainder.length} non-inert path(s) from its output:\n${stdout}`,
    );
  }
  if (!inspectedPaths && (remainder.length > 0 || notices.length === 0)) {
    throw new Error(
      `the step answered without listing the diff and without explaining itself:\n${stdout}`,
    );
  }

  return { code, remainder, notices, inspectedPaths };
}

function classify(changed: readonly string[], event: EventShape = "pull_request"): boolean {
  return runScope(SCRIPT, changed, event).code;
}

// ---------------------------------------------------------------------------------
// The population: every markdown name written in executable code.
// ---------------------------------------------------------------------------------

const JS_SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SCRIPT_SOURCE = /\.(py|sh)$/;
const MARKDOWN = /\.mdc?$/;

/**
 * Every path git would carry: tracked, plus untracked files the ignore rules do not
 * exclude.
 *
 * `--others --exclude-standard` is load-bearing and was added after this file taught
 * itself the lesson. Under a `git ls-files` inventory alone, a source is invisible to
 * this sweep until somebody stages it -- so the run that reviews a new markdown reader
 * is exactly the run that cannot see it. This file was written, run green seven times
 * locally, and failed on the runner the moment `git add` brought it into its own
 * population. `test/support/repoRoot.test.ts` makes the same choice for the same
 * reason, in the same words: a sweep that only saw tracked files "would be blind to
 * exactly the change it is meant to review."
 *
 * The cost is that a scratch file in the working tree joins the sweep. That is the
 * intended direction of the trade: it fails loudly and names the file, where the
 * alternative fails silently and names nothing.
 */
function repositoryPaths(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  )
    .split("\0")
    .filter((entry) => entry.length > 0);
}

/**
 * A JavaScript/TypeScript source with `//` and block comments removed and string
 * literals kept. Almost every `.md` in this tree is named in a docblock citing a design
 * record; only the ones that survive this are candidates for being paths.
 */
function codeOnly(source: string): string {
  let inBlock = false;
  return source
    .split("\n")
    .map((line) => {
      let out = "";
      let quote: string | null = null;
      let index = 0;

      while (index < line.length) {
        const char = line[index] as string;
        if (inBlock) {
          const end = line.indexOf("*/", index);
          if (end === -1) {
            return out;
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
        if (char === "/" && line[index + 1] === "/") {
          return out;
        }
        if (char === "/" && line[index + 1] === "*") {
          inBlock = true;
          index += 2;
          continue;
        }
        out += char;
        index += 1;
      }
      return out;
    })
    .join("\n");
}

/**
 * A Python or shell source with whole-line `#` comments and Python triple-quoted blocks
 * removed. Deliberately conservative -- a trailing `# ...` on a code line is kept -- so
 * the sweep errs toward finding a mention it then has to account for, which fails
 * loudly, rather than dropping one, which would not.
 */
function scriptCodeOnly(source: string): string {
  const kept: string[] = [];
  let fence: string | null = null;

  for (const line of source.split("\n")) {
    if (fence === null && /^\s*#/.test(line)) {
      continue;
    }
    let out = "";
    let index = 0;
    while (index < line.length) {
      if (fence !== null) {
        if (line.startsWith(fence, index)) {
          fence = null;
          index += 3;
          continue;
        }
        index += 1;
        continue;
      }
      if (line.startsWith('"""', index) || line.startsWith("'''", index)) {
        fence = line.slice(index, index + 3);
        index += 3;
        continue;
      }
      out += line[index] as string;
      index += 1;
    }
    kept.push(out);
  }
  return kept.join("\n");
}

interface Mention {
  readonly source: string;
  /** The markdown name as the source writes it: a bare basename or a partial path. */
  readonly name: string;
}

/**
 * Every markdown name in `code`, with the leading `/` of an INTERPOLATED path stripped.
 *
 * A name is not always written whole. `output/era-distinctness/derive-lab-ladder.mjs` opens
 * `` `docs/superpowers/specs/eras/${folder}/style-guide.md` ``, and the pattern below can
 * only see from the interpolation onwards, so it comes back as `/style-guide.md`. Left as
 * that, `resolve` looked for a path ending `//style-guide.md`, found none, and reported the
 * file as naming markdown that does not exist -- a derivation artefact wearing the costume
 * of a real finding, and one that fired for every agent locally while CI, which never sees
 * an untracked scratch file, stayed green.
 *
 * A repository-relative markdown path never starts with `/`, so a leading one can only mean
 * the head of the name was interpolated away. Dropping it turns the fragment into the SUFFIX
 * it really is, which is the honest reading: the source could be opening any markdown whose
 * path ends that way, and `resolve` already matches on exactly that. The sweep therefore
 * gets wider here rather than quieter -- all ten era style guides now owe the gate, where
 * before the mention resolved to nothing and the test died naming the wrong problem. An
 * absolute path or a genuinely missing file still resolves to nothing and still fails.
 *
 * A leading `../` run is the SAME fragment for the same reason, and is dropped by the same
 * argument. `apps/web/src/diagnostic/skillNames.test.ts` globs
 * `../../../../docs/Node_Spine_v4.md`, which is a real path written from the importing file
 * rather than from the root; no repository-relative path begins `../`, so the run can only
 * be that. Left in place the mention resolved to nothing and the census failed saying the
 * doc did not exist -- again the derivation artefact rather than the finding. This is a
 * WIDENING and not an escape hatch: stripping it makes the mention resolve, and a mention
 * that resolves is one the filter then has to classify as code or fail. Injected rather
 * than argued, at the tip: point the same glob at `../../../../docs/Contracts.md`, which is
 * prose, and the census fails at that path with "the filter calls them inert".
 */
function markdownNames(code: string): string[] {
  return [
    ...new Set(
      [...code.matchAll(/[\w./-]*\.mdc?\b/g)].map((match) =>
        (match[0] as string).replace(/^(?:\.\.\/)+/, "").replace(/^\/+/, ""),
      ),
    ),
  ];
}

function markdownMentions(paths: readonly string[]): Mention[] {
  const mentions: Mention[] = [];
  for (const path of paths) {
    const isJs = JS_SOURCE.test(path);
    if (!isJs && !SCRIPT_SOURCE.test(path)) {
      continue;
    }
    const raw = readFileSync(join(repoRoot, path), "utf8");
    const code = isJs ? codeOnly(raw) : scriptCodeOnly(raw);
    for (const name of markdownNames(code)) {
      mentions.push({ source: path, name });
    }
  }
  return mentions;
}

/** Markdown a mention could be naming: the same path, or one ending in it. */
function resolve(name: string, markdown: readonly string[]): string[] {
  return markdown.filter((path) => path === name || path.endsWith(`/${name}`));
}

/** This file's own path, derived rather than typed, for the exclusion below. */
const SELF = relative(repoRoot, fileURLToPath(import.meta.url))
  .split(sep)
  .join("/");

/**
 * Sources whose markdown names are DATA rather than paths they open, each with its
 * reason. Every mention from one of these is skipped, so the entry is an escape hatch
 * and is held to exactly one file below.
 *
 * This file found its own way onto it, twice, and both are worth recording because they
 * are what the category is FOR. The sweep first read `.mdc` out of this file's own
 * `MARKDOWN` pattern -- an extension resolves to no path, so it failed, correctly. Then
 * it read `era-11-solar/style-guide.md`, a fixture for an era that deliberately does not
 * exist. Had it got past that it would have reached `docs/Contracts.md`, which this file
 * asserts stays CHEAP, and demanded it be classified as code: the guard contradicting
 * its own case table. A classifier's fixtures are markdown names by necessity, and none
 * of them is a file it opens.
 */
const NAMES_MARKDOWN_AS_DATA: readonly {
  readonly source: string;
  readonly why: string;
}[] = [
  {
    source: SELF,
    why:
      "it is this guard: every markdown name in it is a fixture handed to the " +
      "classifier, including paths that do not exist and prose paths it asserts stay " +
      "cheap, and the only files it opens are the workflow and the sources it sweeps",
  },
];

/**
 * Sources that read markdown **BY EXTENSION over a whole tree**, rather than by naming
 * paths. This is the third category, and it was added because the sweep had no answer
 * for one: `test/cosmeticShopAndXpAreSunset.test.ts` opens every tracked `.md` under
 * `apps/ packages/ engines/ services/`, so the name it writes is the bare extension,
 * which resolves to no path and failed — correctly, with the message *"if it matches by
 * extension it could be reading any of it"*.
 *
 * That message is the specification for this list. The obligation such a reader owes is
 * not that a path list is classified as code, it is that **the whole tree is**, so each
 * entry declares the tree and every markdown in it is folded into the owed set below.
 * Both directions are asserted: an entry whose source no longer names the extension is
 * excusing nothing, and an entry whose tree holds no markdown is a reservation over
 * nothing.
 */
const READS_MARKDOWN_BY_EXTENSION: readonly {
  readonly source: string;
  /** The extension literal the source writes, which is what fails to resolve. */
  readonly name: string;
  /** Every markdown under this pattern is a file the source opens. */
  readonly tree: RegExp;
  readonly why: string;
}[] = [
  {
    source: "test/cosmeticShopAndXpAreSunset.test.ts",
    name: ".md",
    tree: /^(apps|packages|engines|services)\/.*\.md$/,
    why:
      "it sweeps the markdown beside the code for exports the 2026-08-03 shop-and-XP " +
      "sunset deleted, so a README in any of those trees is one of its inputs",
  },
];

/**
 * Sources that write a markdown NAME in executable code without ever opening it, each
 * with the reason. Asserted in both directions below.
 *
 * `apps/web/src/city/eraFootprints.test.ts` belongs to none of these lists and needs no
 * entry: it names three era style guides inside exemption prose, and those paths are
 * classified as code anyway, so there is nothing about it left to prove.
 */
const NAMES_MARKDOWN_WITHOUT_READING_IT: readonly {
  readonly source: string;
  readonly name: string;
  readonly why: string;
}[] = [
  {
    source: ".cursor/skills/author/scripts/validate-lesson-pack.mjs",
    name: "SKILL.md",
    why:
      "it cites the skill doc inside a warning message; its file inputs are the .json " +
      "packs, skill_graph.json and the visuals registry, none of them markdown",
  },
  {
    source: "scripts/apply_scope_and_lessons.py",
    name: "Lesson_Cluster_Sketch.md",
    why:
      "it names the sketch inside the provenance note it writes into skill_graph.json; " +
      "the only file it opens is that json",
  },
  {
    source: "test/cityCopyRegister.test.ts",
    name: "eras/README.md",
    why:
      "it asserts that `islandGround.ts` still NAMES the table it transcribes, which is " +
      "why that file's em-dashes are excused there; the name is the needle in a " +
      "`toContain` over the transcript, and the only files that guard opens are the " +
      "TypeScript sources it sweeps",
  },
  {
    source: "test/cityCopyRegister.test.ts",
    name: "OWNERS.md",
    why:
      "it CITES the ownership table as the authority for which lanes its sweep covers " +
      "and which one is another owner's, inside the reason strings a reader of that list " +
      "needs; classifying the table as code would run the whole suite on every ownership " +
      "edit, and the same guard's own docblock records that cost as the reason it " +
      "declines to open the era ladder either",
  },
  {
    source: "apps/web/src/archipelago/islandManifest.ts",
    name: "docs/Island_Asset_Handoff.md",
    why:
      "it points at the handoff page from two VALIDATION MESSAGES — the one for a row " +
      "naming a file that did not ship, and the one for a row naming a format this build " +
      "has no loader for — because the person reading either has just tried to drop an " +
      "island and needs the page. It opens no file: its only input is `import.meta.glob` " +
      "over `art/islands/*.glb`. The exemption is the point rather than a concession — " +
      "that page is Evan's to edit, and classifying it as code would run a 40-minute " +
      "browser suite on every wording change to a document no code reads",
  },
  {
    source: "apps/web/src/archipelago/islandManifest.test.ts",
    name: "docs/Island_Asset_Handoff.md",
    why:
      "it asserts that the format refusal above still CITES the handoff page, so the one " +
      "sentence pointing a stuck reader at the instructions cannot quietly go missing; " +
      "the name is a needle in a `toContain` over the returned problem strings, and the " +
      "only thing that guard reads is the manifest's own two globs",
  },
];

/**
 * The readers, named so the derivation cannot quietly lose one of them.
 *
 * Deliberately NOT named for its own length. This was `THE_THREE_READERS` until #336 added
 * a fourth, and a constant whose name carries a count is one edit away from being a false
 * statement about itself -- which is the whole class of drift this file exists to catch.
 */
const THE_MARKDOWN_READERS: readonly {
  readonly source: string;
  readonly name: string;
}[] = [
  { source: "test/eraCivicCatalogueDominance.test.ts", name: "civic-buildings.md" },
  { source: "test/eraCivicCatalogueParity.test.ts", name: "civic-buildings.md" },
  {
    source: "test/eraDecisionCount.test.ts",
    name: "docs/superpowers/specs/2026-07-27-era-progression-design.md",
  },
  {
    source: "test/eraPaletteLadder.test.ts",
    name: "docs/superpowers/specs/City_Art_Bible.md",
  },
  {
    source: "test/interactionSuffixAllowlistParity.test.ts",
    name: ".cursor/skills/author/reference.md",
  },
  {
    source: "apps/web/src/diagnostic/skillNames.test.ts",
    name: "docs/Node_Spine_v4.md",
  },
  {
    source: "test/eraTransitionTrackLedger.test.ts",
    name: "docs/superpowers/specs/2026-08-04-music-pipeline.md",
  },
  {
    source: "apps/web/src/audio/musicSlots.test.ts",
    name: "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md",
  },
  {
    source: "test/musicAssetsAreRegistered.test.ts",
    name: "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md",
  },
  {
    source: "test/musicAssetsAreRegistered.test.ts",
    name: "apps/web/public/audio/CREDITS.md",
  },
  {
    source: "test/eraSixBodyHue.test.ts",
    name: "output/imagegen/era-06-plague-crisis-scenes/README.md",
  },
  {
    source: "test/eraSixBodyHue.test.ts",
    name: "output/imagegen/era-06-early-modern-building-briefs/README.md",
  },
  {
    source: "test/eraSixBodyHue.test.ts",
    name: "docs/superpowers/specs/crisis-reference-packs/plague/README.md",
  },
  {
    source: "test/eraSixBodyHue.test.ts",
    name: "docs/superpowers/specs/eras/era-06-early-modern/style-guide.md",
  },
  {
    source: "test/eraSixPaletteConsistency.test.ts",
    name: "docs/superpowers/specs/eras/README.md",
  },
  {
    source: "test/eraSixPaletteConsistency.test.ts",
    name: "docs/superpowers/specs/2026-07-30-era-palette-ladder.md",
  },
  {
    source: "test/eraSixPaletteConsistency.test.ts",
    name: "docs/design-refs/advisor-wardrobe/README.md",
  },
  {
    source: "test/eraSixPaletteConsistency.test.ts",
    name: "docs/superpowers/specs/2026-08-01-plague-crisis-art-brief.md",
  },
];

/**
 * Markdown that nothing parses, one per shape the filter has to keep cheap. Each is
 * asserted to exist, so the sample cannot rot into naming files that were deleted --
 * a deleted path would classify as prose for the wrong reason and prove nothing.
 */
const PROSE_SAMPLE: readonly string[] = [
  "ONBOARDING.md",
  "docs/Contracts.md",
  "docs/superpowers/specs/2026-07-29-era-trial-contract.md",
  "docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md",
  ".cursor/rules/qa-verification.mdc",
  "README.md",
  "OWNERS.md",
];

// ---------------------------------------------------------------------------------

describeOnBashHost("the scope step is extracted, not paraphrased", () => {
  it("finds a real script behind `id: scope`", () => {
    // The floor under everything below: every assertion in this file runs SCRIPT, so
    // an extraction that came back empty or truncated would make them agree about
    // nothing. `bash -c ""` exits 0 and writes no output, which is indistinguishable
    // from a pass without this.
    expect(SCRIPT.split("\n").length).toBeGreaterThan(50);
    expect(SCRIPT).toContain("changed-files.txt");
    expect(SCRIPT).toContain("$GITHUB_OUTPUT");
    expect(SCRIPT).toMatch(CARVE_OUT_LINE);

    // The step must still be a `shell: bash` step, because that declaration is what
    // ties RUNNER_BASH's flags to reality. Switched to `sh` or to a `shell:` with
    // different defaults, this file would go on running the script under semantics the
    // runner no longer uses, and keep reporting green about it.
    const step = workflow.slice(workflow.indexOf("id: scope"));
    expect(step.slice(0, step.indexOf("run: |"))).toContain("shell: bash");
  });

  it("runs the prose branch under the runner's own `-e -o pipefail`", () => {
    // The cheap path is the one this change cannot demonstrate end to end, and it is
    // the one those two flags could break: both greps exit 1 when a diff is prose-only,
    // `pipefail` propagates that, and `-e` would abort the step there but for the
    // `|| true` on the assignment. Pinned by asserting the flags are actually in use
    // AND that the branch still completes and answers under them -- the assertion
    // above is about the string, this one is about the behaviour.
    expect(RUNNER_BASH).toEqual(["--noprofile", "--norc", "-e", "-o", "pipefail"]);
    expect(classify(["work-log/gabe/2026-07-30-ci-scope-reads-markdown.md"])).toBe(false);
  });

  it("peels revisions with `^0` and never with the brace form", () => {
    // Git for Windows brace-expands `<sha>^{commit}` out of its own argv, so the guard
    // rejects a good commit and the script fails open on a hand-replay. `^0` is the
    // same peel and cannot be re-parsed. Checked over the whole file with its
    // whole-line `#` comments dropped -- the workflow explains the choice in prose and
    // has to be free to spell the rejected form there -- so this covers the work-log
    // reminder's two peels as well as the scope step's.
    const executable = workflow
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
    expect(executable).toContain("^0");
    expect(executable).not.toContain("^{commit}");
    // Matched as patterns rather than as string literals so the shell's `${...}` does
    // not read as an unterminated JavaScript template to the linter.
    expect(SCRIPT).toMatch(/"\$\{BASE\}\^0"/);
    expect(SCRIPT).toMatch(/"\$\{HEAD\}\^0"/);
  });
});

/**
 * The case table, at module scope because two describes quantify over it: the one below
 * asserts each verdict on a PULL REQUEST, and `a push to a watched branch is never
 * scoped` asserts that a push answers `code` for every one of them, prose entries
 * included. Deriving the push sweep's inputs from here rather than retyping a list of
 * docs paths is what keeps that sweep a claim about the DECISION: the inputs are the
 * ones a pull request is on record as splitting down the middle.
 */
const CASES: readonly {
  readonly what: string;
  readonly changed: readonly string[];
  /** On a pull request. A push run does not classify at all. */
  readonly code: boolean;
}[] = [
  {
    what: "an era catalogue, which both parity and dominance parse",
    changed: ["docs/superpowers/specs/eras/era-06-early-modern/civic-buildings.md"],
    code: true,
  },
  {
    what: "an era style guide, which can bring a new era folder into the population",
    changed: ["docs/superpowers/specs/eras/era-11-solar/style-guide.md"],
    code: true,
  },
  {
    what: "the era design spec, which eraDecisionCount parses for D-ERA ids",
    changed: ["docs/superpowers/specs/2026-07-27-era-progression-design.md"],
    code: true,
  },
  {
    what: "the Art Bible, which eraPaletteLadder parses for §2's face model",
    changed: ["docs/superpowers/specs/City_Art_Bible.md"],
    code: true,
  },
  {
    what: "the era trial contract beside it, which is prose nothing parses",
    // The Art Bible's branch is a single named file rather than the
    // `docs/superpowers/specs/` prefix, and this is the case that holds it to that.
    // PROSE_SAMPLE already asserts this path stays cheap in the census; pinning it
    // here too means the case table alone shows the branch is not a prefix.
    changed: ["docs/superpowers/specs/2026-07-29-era-trial-contract.md"],
    code: false,
  },
  {
    what: "the author reference, which the suffix-allowlist parity test parses",
    changed: [".cursor/skills/author/reference.md"],
    code: true,
  },
  {
    what: "the author SKILL beside it, which is prose nothing parses",
    // The other half of the claim, and the one that keeps the branch honest: the
    // carve-out is anchored to the one file a parser opens, so its own siblings must
    // still take the cheap path. Without this, `^\.cursor/skills/author/` would pass
    // the case above just as well while quietly billing the full gate set for editing
    // a paragraph of authoring guidance.
    changed: [".cursor/skills/author/SKILL.md"],
    code: false,
  },
  {
    what: "the node spine, whose tables skillNames.test.ts quotes 23 skill names from",
    changed: ["docs/Node_Spine_v4.md"],
    code: true,
  },
  {
    what: "the music generation prompts, whose fourteen slot ids musicSlots.test.ts reads",
    changed: [
      "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md",
    ],
    code: true,
  },
  {
    what: "the music runbook, whose STILL TO GENERATE marker the transition ledger reads",
    changed: ["docs/superpowers/specs/2026-08-04-music-pipeline.md"],
    code: true,
  },
  {
    what: "the music picks sheet beside it, which is prose nothing parses",
    // The other half of that claim, in the same directory and with the same date
    // prefix: the branch is one named file, so a sibling spec must still be cheap.
    changed: ["docs/superpowers/specs/2026-08-03-music-picks-per-slot.md"],
    code: false,
  },
  {
    what: "a work-log entry",
    changed: ["work-log/gabe/2026-07-30-ci-scope-reads-markdown.md"],
    code: false,
  },
  {
    what: "a design spec nothing parses",
    // Also the other half of the spine's claim, and in the same directory: the
    // branch above is one named file, so `docs/` at large must still be prose. A
    // `^docs/` prefix would pass the case above and quietly bill the full gate set
    // for every design record in the repository.
    changed: ["docs/Contracts.md"],
    code: false,
  },
  {
    what: "the eras README, which the Era 6 consistency guard reads directly",
    changed: ["docs/superpowers/specs/eras/README.md"],
    code: true,
  },
  {
    what: "the palette ladder, which the Era 6 consistency guard reads directly",
    changed: ["docs/superpowers/specs/2026-07-30-era-palette-ladder.md"],
    code: true,
  },
  {
    what: "the plague art brief, which the Era 6 consistency guard reads directly",
    changed: ["docs/superpowers/specs/2026-08-01-plague-crisis-art-brief.md"],
    code: true,
  },
  {
    what: "the advisor wardrobe index, which marks Era 6's old frame as historical",
    changed: ["docs/design-refs/advisor-wardrobe/README.md"],
    code: true,
  },
  {
    what: "a Cursor rule file",
    changed: [".cursor/rules/qa-verification.mdc"],
    code: false,
  },
  {
    what: "design refs, diagrams and the PRD export",
    changed: [
      "docs/design-refs/city-day.png",
      "docs/diagrams/01_component.svg",
      "docs/diagrams/01_component.dot",
      "docs/PRD_Full.docx",
    ],
    code: false,
  },
  {
    what: "a lesson pack, deliberately not inert because the web app loads it",
    changed: ["content/lessons/d1/NUM.1.json"],
    code: true,
  },
  {
    what: "a mixed diff: the filter subtracts rather than selects",
    changed: [
      "work-log/gabe/2026-07-30-ci-scope-reads-markdown.md",
      "docs/design-refs/city-day.png",
      "apps/web/src/city/palette.ts",
    ],
    code: true,
  },
  {
    what: "#292's old shape, now with both Era 6 palette records guarded",
    changed: [
      "docs/superpowers/specs/eras/README.md",
      "docs/superpowers/specs/eras/era-06-early-modern/civic-buildings.md",
      "output/imagegen/era-06-early-modern-building-briefs/README.md",
    ],
    code: true,
  },
];

describeOnBashHost("the filter classifies a change by whether a gate reads it", () => {
  for (const { what, changed, code } of CASES) {
    it(`${code ? "runs the gates for" : "skips the gates for"} ${what}`, () => {
      expect(classify(changed)).toBe(code);
    });
  }

  it("names the markdown that forced the gates to run, not just that they ran", () => {
    // A verdict is one bit and could be right for the wrong reason. This pins WHICH
    // file the step blamed, which is also what a human reads off a run.
    const verdict = runScope(SCRIPT, [
      "docs/superpowers/specs/eras/README.md",
      "docs/superpowers/specs/eras/era-06-early-modern/civic-buildings.md",
    ]);
    expect(verdict.code).toBe(true);
    expect(verdict.remainder).toEqual([
      "docs/superpowers/specs/eras/README.md",
      "docs/superpowers/specs/eras/era-06-early-modern/civic-buildings.md",
    ]);
  });

  // The heaviest test in the file, and the reason for the file-level budget at the top: ten
  // `runScope` calls, every one of them required, because the mutation removes all four
  // branches at a stroke and each has to be reddened on its own.
  it("would have classified #292 as prose without the carve-out line", () => {
    // THE INJECTION. Every case above passes by agreeing with the classifier, which is
    // exactly how they would look if the classifier answered a constant. Mutating the
    // carve-out to a pattern no path can match must flip the catalogue back to prose --
    // and that mutated verdict is also the measured statement of the bug being fixed.
    // Replaced through a function, never a string: `$'` in a replacement string is
    // String.replace's "everything after the match" escape, so the literal form of
    // this quotes half the script back into itself and bash dies on it.
    const mutant = SCRIPT.replace(
      CARVE_OUT_LINE,
      () => "TEST_INPUT_MARKDOWN='^zzz-no-path-can-match-this-zzz$'",
    );
    expect(mutant, "the mutation matched nothing, so it proves nothing").not.toBe(SCRIPT);

    const catalogue = [
      "docs/superpowers/specs/eras/era-06-early-modern/civic-buildings.md",
    ];
    expect(runScope(SCRIPT, catalogue).code).toBe(true);
    expect(runScope(mutant, catalogue).code).toBe(false);

    // Per branch, not once for the line. The mutation removes every branch at a
    // stroke, so the catalogue flipping proves only that SOME branch was load-bearing;
    // a branch added later could be dead and this would still be green. Two branches
    // were in fact added independently and crossed on merge, so each is reddened here
    // on its own.
    for (const branch of [
      "docs/superpowers/specs/2026-07-27-era-progression-design.md",
      "docs/superpowers/specs/City_Art_Bible.md",
      ".cursor/skills/author/reference.md",
      "docs/Node_Spine_v4.md",
      "docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md",
      "docs/superpowers/specs/2026-08-04-music-pipeline.md",
    ]) {
      expect(runScope(SCRIPT, [branch]).code, `${branch} is not classified as code`).toBe(
        true,
      );
      expect(
        runScope(mutant, [branch]).code,
        `${branch} still classifies as code with the carve-out neutered, so its branch is dead`,
      ).toBe(false);
    }

    // And the mutation must not have broken the script into classifying nothing: a
    // .ts file still runs the gates under it.
    expect(runScope(mutant, ["apps/web/src/city/palette.ts"]).code).toBe(true);
  });
});

describeOnBashHost("a push to a watched branch is never scoped", () => {
  const WATCHED = pushBranches();
  const PROSE_ON_A_PULL_REQUEST = CASES.filter((entry) => !entry.code);

  /**
   * The pre-fix script, reconstructed from the shipped one: the event guard lifted out,
   * and the base/head resolution put back to the two-branch form that read
   * `github.event.before` whenever `GITHUB_BASE_REF` was empty. Both halves are needed --
   * with only the guard gone a push has no base sha to diff from and fails open, which is
   * the second guarantee asserted at the bottom of this block.
   *
   * Built inside its own test rather than here, so that a workflow this cannot be
   * reconstructed FROM reddens one named assertion instead of failing the file's
   * collection and taking the other thirty-one down with it. That distinction is not
   * hypothetical: reverting the workflow is how this block's non-vacuity was measured,
   * and a collection error would have said nothing about which claim caught it.
   *
   * Replaced through functions, never strings: `$'` in a replacement string is
   * String.replace's "everything after the match" escape, and these replacements are
   * nothing but shell `${...}`.
   */
  function preFixScript(): string {
    // BOTH halves, or nothing. Measured, not feared: with the two-branch resolution put
    // back into the scope step by hand, the second replacement stopped matching, so
    // `beforeShaResolution` was never called, its one-occurrence check never ran, and the
    // reconstruction still came out behaving like the pre-fix script -- passing by
    // accident while proving half of what it claims to.
    if (!EVENT_GUARD.test(SCRIPT) || !PR_PAYLOAD_RESOLUTION.test(SCRIPT)) {
      throw new Error(
        "the shipped scope script no longer has both halves this reconstruction " +
          `removes: event guard ${EVENT_GUARD.test(SCRIPT)}, PR-payload resolution ` +
          `${PR_PAYLOAD_RESOLUTION.test(SCRIPT)}`,
      );
    }
    return SCRIPT.replace(EVENT_GUARD, () => "").replace(PR_PAYLOAD_RESOLUTION, () =>
      beforeShaResolution(),
    );
  }

  it("reads the watched branches off the workflow's own `on:` block", () => {
    // Derived rather than typed, so a branch added to the trigger joins the sweeps below
    // instead of going unswept. The floors are what stop a parse that came back empty
    // from reading as unanimous compliance, and `integration` is named because it is the
    // branch every one of these pull requests merges into: losing it from the push
    // trigger is itself the defect this file is about, arriving by another door.
    expect(WATCHED.length).toBeGreaterThan(0);
    expect(WATCHED).toContain("integration");

    // And the other half of the distinction has to exist, or the saving the census at
    // the bottom of this file defends would have nowhere left to happen.
    expect(workflow).toMatch(/^ {2}pull_request:\s*$/m);
  });

  it("runs the gates for every diff a pull request would have skipped", () => {
    // The population is the case table's own prose entries, so this cannot drift into a
    // second hardcoded list of docs paths that agrees with nothing. The floor keeps it
    // non-vacuous: if the table ever held no prose case at all, "they all flip" would be
    // true of an empty set.
    expect(PROSE_ON_A_PULL_REQUEST.length).toBeGreaterThanOrEqual(5);

    for (const { what, changed } of PROSE_ON_A_PULL_REQUEST) {
      expect(classify(changed, "pull_request"), `${what} is no longer prose`).toBe(false);
      for (const branch of WATCHED) {
        expect(
          classify(changed, { pushTo: branch }),
          `${what} skips the gates on a push to ${branch}, so that push reports a ` +
            `verdict it never took`,
        ).toBe(true);
      }
    }
  });

  it("answers the same whatever the diff, because the diff is not the question", () => {
    // The decision, stated as a property rather than as a path list. A pull request
    // splits this table down the middle; a push run's answers over the SAME inputs
    // collapse to one value, which is what "a push is not scoped" means. Asserting the
    // pull-request side too is what keeps it a distinction and not a filter switched off.
    const onAPush = new Set(
      CASES.map((entry) => classify(entry.changed, { pushTo: "integration" })),
    );
    expect(onAPush).toEqual(new Set([true]));
    expect(new Set(CASES.map((entry) => entry.code))).toEqual(new Set([true, false]));
  });

  it("blames the event and the ref, and never a file", () => {
    // WHY it decided, not just what. A push verdict that arrived with a remainder would
    // be the right answer reached by reading the paths, which is the reasoning this
    // change exists to remove: on the next combined-tree breakage it would go back to
    // being wrong.
    const docsOnly = PROSE_ON_A_PULL_REQUEST[0]?.changed as readonly string[];
    const verdict = runScope(SCRIPT, docsOnly, { pushTo: "integration" });

    expect(verdict.code).toBe(true);
    expect(verdict.remainder).toEqual([]);
    expect(verdict.inspectedPaths).toBe(false);
    expect(verdict.notices.join("\n")).toContain("'push' run on integration");
  });

  it("would have skipped them all before this guard, which is the bug measured", () => {
    // THE INJECTION. Every assertion above passes by finding agreement, which is also
    // how they would look against a filter that had never been changed. So the pre-fix
    // decision procedure is reconstructed and driven over the same inputs: it must
    // answer prose on a push, and the shipped one must not.
    expect(SCRIPT, "the event guard is not where this expected it").toMatch(EVENT_GUARD);
    const PRE_FIX = preFixScript();
    expect(PRE_FIX, "the mutation matched nothing, so it proves nothing").not.toBe(SCRIPT);
    expect(PRE_FIX).not.toMatch(EVENT_GUARD);
    expect(PRE_FIX).not.toMatch(PR_PAYLOAD_RESOLUTION);
    // Pattern, not a string literal, for the reason the `^0` assertions give above.
    expect(PRE_FIX).toMatch(/BASE="\$\{GITHUB_EVENT_BEFORE:-\}"/);

    for (const { what, changed } of PROSE_ON_A_PULL_REQUEST) {
      expect(
        runScope(PRE_FIX, changed, { pushTo: "integration" }).code,
        `${what} would have run the gates on a push even before the guard, so this ` +
          `reconstruction is not the pre-fix script`,
      ).toBe(false);
      expect(classify(changed, { pushTo: "integration" }), what).toBe(true);
    }

    // And the pull-request saving is untouched, proven rather than asserted: the pre-fix
    // script and the shipped one agree on every case in the table under a pull request,
    // so the only behaviour this change moved is the push answer.
    for (const { what, changed, code } of CASES) {
      expect(
        runScope(PRE_FIX, changed, "pull_request").code,
        `${what} classifies differently on a pull request than it did before the guard`,
      ).toBe(code);
    }
  });

  it("still runs everything on a push if the guard alone is deleted", () => {
    // The SECOND guarantee, and the reason the push branch of the base/head resolution
    // was removed rather than kept for symmetry with the work-log reminder. Delete the
    // guard and nothing else, and a push run has no PR payload to diff from, so the
    // fail-open test answers code=true anyway.
    //
    // The push shape hands the script a REAL, resolvable `GITHUB_EVENT_BEFORE`, so this
    // is not a run that fails open because the environment was starved: the sha is right
    // there and the script declines to reach for it.
    const guardRemoved = SCRIPT.replace(EVENT_GUARD, () => "");
    expect(guardRemoved).not.toBe(SCRIPT);

    const verdict = runScope(guardRemoved, PROSE_ON_A_PULL_REQUEST[0]?.changed ?? [], {
      pushTo: "integration",
    });
    expect(verdict.code).toBe(true);
    expect(verdict.notices.join("\n")).toContain("No reliable base ref");

    // A pull request is unaffected by that deletion, which is what makes the two
    // guarantees independent rather than one guarantee counted twice.
    expect(runScope(guardRemoved, PROSE_ON_A_PULL_REQUEST[0]?.changed ?? []).code).toBe(
      false,
    );
  });
});

describeOnBashHost("every markdown a source names is accounted for", () => {
  const paths = repositoryPaths();
  const markdown = paths.filter((path) => MARKDOWN.test(path));
  const mentions = markdownMentions(paths);

  it("swept a real tree, and swept ITSELF", () => {
    // Floors. Every sweep below quantifies over these, so an inventory that came back
    // empty -- git missing, a wrong cwd, a comment stripper that ate everything --
    // would otherwise read as unanimous compliance. Measured at 954 sources and 190
    // markdown files when this was written.
    const sources = paths.filter(
      (path) => JS_SOURCE.test(path) || SCRIPT_SOURCE.test(path),
    );
    expect(sources.length).toBeGreaterThan(700);
    expect(markdown.length).toBeGreaterThan(120);
    expect(mentions.length).toBeGreaterThanOrEqual(THE_MARKDOWN_READERS.length);

    // The self-inclusion is asserted, not assumed. Under a tracked-only inventory this
    // file was absent from its own population until it was staged, so it ran green
    // locally seven times and failed on the runner. A sweep that cannot see the file
    // being reviewed is the one shape of blindness this guard must not have.
    expect(sources).toContain("test/ciScopeFilter.test.ts");
  });

  it("still finds every reader, and the paths they resolve to", () => {
    // Composition, not size. A sweep that found the right NUMBER of mentions over the
    // wrong files would clear the floor above and measure nothing.
    for (const reader of THE_MARKDOWN_READERS) {
      expect(
        mentions,
        `${reader.source} no longer names ${reader.name} in executable code`,
      ).toContainEqual(reader);
    }
    expect(resolve("civic-buildings.md", markdown).length).toBeGreaterThanOrEqual(10);
    expect(
      resolve("docs/superpowers/specs/2026-07-27-era-progression-design.md", markdown),
    ).toHaveLength(1);
  });

  it("classifies as code every markdown a source could be opening", () => {
    const exempt = new Set(
      NAMES_MARKDOWN_WITHOUT_READING_IT.map((entry) => `${entry.source}|${entry.name}`),
    );
    const dataOnly = new Set(NAMES_MARKDOWN_AS_DATA.map((entry) => entry.source));
    // A by-extension reader's mention is skipped HERE and paid for BELOW: the extension
    // resolves to no path, and what it owes is the whole tree rather than a path list.
    const byExtension = new Set(
      READS_MARKDOWN_BY_EXTENSION.map((entry) => `${entry.source}|${entry.name}`),
    );
    const owed = new Map<string, string[]>();

    for (const entry of READS_MARKDOWN_BY_EXTENSION) {
      const tree = markdown.filter((path) => entry.tree.test(path));
      // A reservation over nothing would let a stale entry sit here excusing a reader
      // that has stopped reading anything.
      expect(
        tree.length,
        `${entry.source} claims to sweep ${entry.tree}, which holds no markdown`,
      ).toBeGreaterThan(0);
      for (const path of tree) {
        const sources = owed.get(path) ?? [];
        sources.push(entry.source);
        owed.set(path, sources);
      }
    }

    for (const mention of mentions) {
      if (
        dataOnly.has(mention.source) ||
        exempt.has(`${mention.source}|${mention.name}`) ||
        byExtension.has(`${mention.source}|${mention.name}`)
      ) {
        continue;
      }
      const resolved = resolve(mention.name, markdown);
      // A name that resolves to nothing means either that the derivation has stopped
      // working -- the stripper broke, a path moved -- or that the source matches
      // markdown BY EXTENSION, in which case it could be reading any of it and owes a
      // wider answer than a path list. Both must fail rather than pass by finding
      // nothing to check.
      expect(
        resolved.length,
        `${mention.source} names "${mention.name}", which matches no markdown in the ` +
          `tree; if it matches by extension it could be reading any of it`,
      ).toBeGreaterThan(0);
      for (const path of resolved) {
        const sources = owed.get(path) ?? [];
        sources.push(mention.source);
        owed.set(path, sources);
      }
    }

    expect(owed.size).toBeGreaterThanOrEqual(11);

    // ONE commit carrying every owed path, not one commit per path. Each `runScope` is a
    // real git commit plus a real bash process, ~1.3s of it, so a path-at-a-time loop cost
    // this test more than the suite's whole per-test budget and it failed on TIME -- which
    // reads exactly like a classification failure and is not one. The batch is sound for the
    // same reason the census at the foot of this file is: the step SUBTRACTS inert files from
    // the changed list rather than selecting from it (the case table above pins that), and it
    // prints the survivors one per line, so a path in the remainder is a path that would have
    // forced the gates on its own. It also reports every offender instead of dying at the
    // first.
    const verdict = runScope(SCRIPT, [...owed.keys()]);
    expect(verdict.code).toBe(true);
    const classifiedAsCode = new Set(verdict.remainder);
    const skipped = [...owed]
      .filter(([path]) => !classifiedAsCode.has(path))
      .map(
        ([path, sources]) => `${path} (named in executable code by ${sources.join(", ")})`,
      );
    expect(
      skipped,
      "these are named in executable code, so a change to them must run the gates, and " +
        "the filter calls them inert",
    ).toEqual([]);
  });

  it("keeps every exemption load-bearing, and lets no reader hide behind one", () => {
    // Direction one: a listed source that no longer names that markdown is excusing
    // nothing, and would sit here forever hiding that fact.
    for (const entry of NAMES_MARKDOWN_WITHOUT_READING_IT) {
      expect(
        mentions,
        `${entry.source} is exempted because ${entry.why}, but it no longer names ` +
          `${entry.name} at all`,
      ).toContainEqual({ source: entry.source, name: entry.name });
    }
    for (const entry of NAMES_MARKDOWN_AS_DATA) {
      expect(
        mentions.some((mention) => mention.source === entry.source),
        `${entry.source} is excluded because ${entry.why}, but it names no markdown ` +
          `at all any more`,
      ).toBe(true);
    }
    for (const entry of READS_MARKDOWN_BY_EXTENSION) {
      expect(
        mentions,
        `${entry.source} is exempted because ${entry.why}, but it no longer names ` +
          `${entry.name} at all`,
      ).toContainEqual({ source: entry.source, name: entry.name });
    }

    // Direction two. The per-name exemptions are already pinned by the assertion above,
    // which requires every UNLISTED mention to resolve to code-classified paths, so a
    // source that named a prose doc fails there rather than being quietly tolerated.
    // What is left is the whole-source exclusion, which is the wide one: it is held to
    // exactly one file, and that file is this guard, derived from `import.meta.url`
    // rather than typed. Nothing else can ever be excused by it.
    expect(NAMES_MARKDOWN_AS_DATA.map((entry) => entry.source)).toEqual([SELF]);
    expect(SELF).toBe("test/ciScopeFilter.test.ts");

    // And no list may grow to swallow a reader.
    const excused = new Set([
      ...NAMES_MARKDOWN_WITHOUT_READING_IT.map((entry) => entry.source),
      ...NAMES_MARKDOWN_AS_DATA.map((entry) => entry.source),
      // NOT the by-extension readers: theirs is not an excuse, it is a wider bill, and
      // the assertion above already requires their whole tree to classify as code.
    ]);
    for (const reader of THE_MARKDOWN_READERS) {
      expect(excused.has(reader.source)).toBe(false);
    }
  });
});

describeOnBashHost("the prose saving survives", () => {
  const markdown = repositoryPaths().filter((path) => MARKDOWN.test(path));

  it("still calls the great majority of markdown inert", () => {
    // ONE commit carrying every markdown file in the tree, so this is a census and not a
    // sample: the step prints the ones it calls non-inert, and everything else took
    // the cheap path. The margin is computed from the tree rather than pinned, so
    // adding docs or catalogues cannot make it stale -- what it fails on is the rule
    // widening until markdown stops being cheap, which is the trade this fix must not
    // make.
    const verdict = runScope(SCRIPT, markdown);
    expect(verdict.code).toBe(true);

    const code = new Set(verdict.remainder);
    const prose = markdown.filter((path) => !code.has(path));

    expect(code.size).toBeGreaterThanOrEqual(11);
    expect(prose.length).toBeGreaterThan(code.size * 4);

    // The catalogues are the point of the exercise; all ten must be in the code half.
    const catalogues = resolve("civic-buildings.md", markdown);
    expect(catalogues.length).toBeGreaterThanOrEqual(10);
    for (const path of catalogues) {
      expect(code.has(path), `${path} is parsed by two tests and is being skipped`).toBe(
        true,
      );
    }

    // And the sample stays cheap. Asserted against the same census, so this cannot
    // disagree with the run above.
    for (const path of PROSE_SAMPLE) {
      expect(markdown, `${path} is no longer tracked; the sample is stale`).toContain(path);
      expect(
        code.has(path),
        `${path} is prose nothing parses, and the filter now bills the full gate set ` +
          `for it`,
      ).toBe(false);
    }
  });

  it("spends none of it on a push, over that same whole-tree commit", () => {
    // The widest input this file can build, on the other side of the distinction. The
    // census above is the largest prose-heavy diff in the repository and a pull request
    // takes the cheap path over most of it; a push must classify the whole thing as code
    // without listing a single file. Quantified over every markdown in the tree rather
    // than a sample, so no docs-only merge of any size is cheap on a watched branch.
    const verdict = runScope(SCRIPT, markdown, { pushTo: "integration" });
    expect(verdict.code).toBe(true);
    expect(verdict.remainder).toEqual([]);
    expect(verdict.inspectedPaths).toBe(false);
  });
});
