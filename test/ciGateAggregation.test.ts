/**
 * `code-quality` is the SOLE required status check on `integration`, and after the split
 * it runs no gate of its own. So the only thing standing between a broken tree and a
 * green required check is this job's arithmetic over its dependencies' results. This file
 * is the guard on that arithmetic.
 *
 * ## Why a skipped job is the dangerous case
 *
 * GitHub SKIPS a job whose dependency failed; it does not fail it. A skipped required
 * check can be read as neutral, so an aggregator written as a bare `needs:` reports
 * success over a run where every gate was skipped. That is not a hypothesis about this
 * repository: over 2026-08-01T21:12 to 2026-08-03T00:38 TWELVE push runs on
 * `integration` reported `success` with 15-16 steps skipped and not one gate run
 * (30718635388, 30720289053, 30721971289, 30729352402, 30729361653, 30759013785,
 * 30762101646, 30762455029, 30763848864, 30766437712, 30770927262, 30774957231), and
 * nineteen more were cancelled having allocated ZERO jobs. Both shapes are a badge over
 * unverified history, and both are the reason `skipped` and `cancelled` are failures in
 * the script this file drives.
 *
 * ## What is extracted, what is derived, and what is asserted both ways
 *
 *  - EXTRACTED: the aggregator's shell script, verbatim out of the YAML, and RUN under
 *    the runner's own `bash --noprofile --norc -e -o pipefail` against synthetic `needs`
 *    payloads. So the tests below measure the shipped script rather than a TypeScript
 *    paraphrase of its rules, and every claim about what turns the check red is a
 *    watched exit code.
 *  - DERIVED: the population of gate jobs, out of the workflow's own `jobs:` block. A
 *    hardcoded list of gate names would be a second copy, and the copy that goes stale
 *    is the one that stops covering the job somebody just added.
 *  - ASSERTED BOTH WAYS: the aggregator's `needs:` list against that derived population,
 *    and the script's own `EXPECTED_GATES` against both. A gate job added to the file
 *    without being wired into `needs:` fails here, and a name left in `EXPECTED_GATES`
 *    after its job is deleted fails here too. Neither direction is decorative: a gate
 *    outside `needs:` reports nothing to the required check, so its failure is invisible.
 *
 * ## Non-vacuity is proven by injection, in-file
 *
 * Every structural assertion below passes by finding agreement, which is exactly how it
 * would look if the parser had come back empty and swept nothing. So each of them is
 * also driven over a MUTATED copy of the workflow -- a gate dropped from `needs:`, a
 * job-level `if:` added, a suite narrowed to a shard, the `always()` deleted -- and
 * required to report the defect. The mutation is asserted to have changed the text,
 * because a replace that silently matched nothing would make the proof vacuous. The
 * shard rules go further and CONSTRUCT the sharded shape, because since T2 there is no
 * matrix in the file for a mutation to damage.
 *
 * ## What this file cannot check, and where that is checked instead
 *
 * That `code-quality` is the name branch protection requires is a fact about the
 * repository's settings and not about this tree, so it is verified out of band against
 * the API (`required_status_checks.contexts` is exactly `["code-quality"]`) and recorded
 * in the work-log entry for this change. What this file can do is refuse to let the name
 * drift, which is the half that lives in the tree.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

// The behavioral aggregator suite executes the workflow's `shell: bash` script with the
// runner's exact flags. Windows without a Bash host cannot exercise that contract.
const describeOnBashHost = process.platform === "win32" ? describe.skip : describe;

import { resolveRepoRoot } from "./support/repoRoot";

const WORKFLOW = ".github/workflows/invariants.yml";
const MANIFEST = "package.json";
const BROWSER_CONFIG = "vitest.browser.config.ts";

const repoRoot = resolveRepoRoot();
const workflow = readFileSync(join(repoRoot, WORKFLOW), "utf8");
const manifest = readFileSync(join(repoRoot, MANIFEST), "utf8");
const browserConfig = readFileSync(join(repoRoot, BROWSER_CONFIG), "utf8");

/** The job that branch protection requires by name. Renaming it blocks every open PR. */
const REQUIRED_CHECK = "code-quality";

/**
 * The one job every gate depends on, and the only one whose steps are ungated: it decides
 * whether the gates have anything to do.
 */
const DECISION_JOB = "scope";

/**
 * The gating expression, spelled exactly as every gate step must spell it.
 *
 * A TYPO IN THIS IS A FALSE GREEN AND NOT A CRASH, which is why it is asserted rather
 * than trusted. `needs.scope.outputs.cod == 'true'` is valid workflow syntax, evaluates
 * to false forever, and every step carrying it skips silently while its job still reports
 * success. So the sweep below requires this substring in every gate step's condition, and
 * a misspelling fails here instead of shipping a gate that never runs again.
 *
 * Brace-free on purpose: a step-level `if:` needs no `${{ }}`, so this can be a plain
 * string rather than a pattern dodging Biome's template-literal rule.
 */
const GATE_CONDITION = "needs.scope.outputs.code == 'true'";

/**
 * A workflow interpolation, assembled rather than typed.
 *
 * A literal `${{ ... }}` inside a JavaScript string reads to Biome as a template
 * placeholder someone forgot to make a template literal (`noTemplateCurlyInString`), and
 * this repository keeps that rule quiet rather than suppressing it -- `ciScopeFilter.test.ts`
 * matches the shell's `${...}` as patterns for the same reason. Regexes below can spell the
 * form directly because it is escaped there; only the injections, which build replacement
 * TEXT, need this.
 */
const DOLLAR = "$";
function interpolation(body: string): string {
  return `${DOLLAR}{{ ${body} }}`;
}

// ---------------------------------------------------------------------------------
// Reading the workflow. Textually, because no YAML parser is a dependency of this
// repository and adding one to read a handful of blocks is the worse trade --
// `test/ciScopeFilter.test.ts` makes the same call for the same reason.
// ---------------------------------------------------------------------------------

interface Job {
  readonly id: string;
  /** Every line of the job's block, comments included. */
  readonly body: string;
}

/** A job header is the only thing indented exactly two spaces that ends in a colon. */
const JOB_HEADER = /^ {2}([A-Za-z0-9_-]+):\s*$/;

/**
 * The jobs of a workflow, in file order.
 *
 * Callers that assert on CONTENT go through `code()` below rather than reading `body`
 * raw: a comment block sitting between two jobs is indented as part of the first one, so
 * the prose introducing `test-unit` is inside `typecheck`'s block and an assertion like
 * "typecheck runs no suite" would read that prose as a suite.
 */
function parseJobs(text: string): Job[] {
  const lines = text.split("\n");
  const jobsAt = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (jobsAt < 0) {
    throw new Error(`${WORKFLOW}: no top-level \`jobs:\` block`);
  }

  const jobs: Job[] = [];
  let current: { id: string; body: string[] } | null = null;
  for (const line of lines.slice(jobsAt + 1)) {
    const header = JOB_HEADER.exec(line);
    if (header !== null) {
      if (current !== null) {
        jobs.push({ id: current.id, body: current.body.join("\n") });
      }
      current = { id: header[1] as string, body: [] };
      continue;
    }
    current?.body.push(line);
  }
  if (current !== null) {
    jobs.push({ id: current.id, body: current.body.join("\n") });
  }
  return jobs;
}

/** A job's lines with whole-line comments dropped, shell comments included. */
function code(body: string): string {
  return body
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

function jobsOf(text: string): Map<string, string> {
  return new Map(parseJobs(text).map((job) => [job.id, job.body]));
}

function jobOrThrow(text: string, id: string): string {
  const body = jobsOf(text).get(id);
  if (body === undefined) {
    throw new Error(`${WORKFLOW}: no job \`${id}\``);
  }
  return body;
}

/**
 * The names in the aggregator's `needs:` list, which is written as a block sequence so
 * that adding a gate is a one-line diff.
 */
function aggregatorNeeds(text: string): string[] {
  const body = code(jobOrThrow(text, REQUIRED_CHECK));
  const lines = body.split("\n");
  const needsAt = lines.findIndex((line) => /^ {4}needs:\s*$/.test(line));
  if (needsAt < 0) {
    const inline = lines.find((line) => /^ {4}needs: \[/.test(line));
    if (inline !== undefined) {
      return (/\[([^\]]*)\]/.exec(inline)?.[1] ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
    }
    throw new Error(`${WORKFLOW}: \`${REQUIRED_CHECK}\` declares no \`needs:\``);
  }
  const names: string[] = [];
  for (const line of lines.slice(needsAt + 1)) {
    const item = /^ {6}- (\S+)\s*$/.exec(line);
    if (item === null) {
      break;
    }
    names.push(item[1] as string);
  }
  if (names.length === 0) {
    throw new Error(`${WORKFLOW}: \`${REQUIRED_CHECK}\`'s \`needs:\` block is empty`);
  }
  return names;
}

/** The gate names the aggregator's own script says it speaks for. */
function expectedGatesInScript(text: string): string[] {
  const match = /^\s*EXPECTED_GATES='([^']*)'\s*$/m.exec(jobOrThrow(text, REQUIRED_CHECK));
  if (match === null) {
    throw new Error(`${WORKFLOW}: the aggregator script declares no EXPECTED_GATES`);
  }
  return (match[1] as string).split(/\s+/).filter((name) => name.length > 0);
}

/** Every job that is neither the aggregator nor the decision job: the gates themselves. */
function gateJobIds(text: string): string[] {
  return parseJobs(text)
    .map((job) => job.id)
    .filter((id) => id !== REQUIRED_CHECK && id !== DECISION_JOB);
}

interface Step {
  readonly label: string;
  readonly lines: readonly string[];
}

/** The steps of a job, split on the `- ` that opens each one at six spaces. */
function stepsOf(body: string): Step[] {
  const lines = code(body).split("\n");
  const steps: Step[] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (/^ {6}- \S/.test(line)) {
      if (current !== null) {
        steps.push({ label: current[0]?.trim() ?? "", lines: current });
      }
      current = [line];
      continue;
    }
    if (current !== null && (line.trim() === "" || line.startsWith("        "))) {
      current.push(line);
      continue;
    }
    if (current !== null) {
      steps.push({ label: current[0]?.trim() ?? "", lines: current });
      current = null;
    }
  }
  if (current !== null) {
    steps.push({ label: current[0]?.trim() ?? "", lines: current });
  }
  return steps;
}

function stepCondition(step: Step): string | null {
  for (const line of step.lines) {
    const match = /^ {8}if: (.+)$/.exec(line);
    if (match !== null) {
      return (match[1] as string).trim();
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------
// The findings. Each is a function of the workflow TEXT so the injections at the foot
// of this file can drive the same code over a mutated copy: an assertion that only ever
// sees the shipped file cannot be shown to fail.
// ---------------------------------------------------------------------------------

/** Gate jobs the required check does not depend on, and dependencies with no job. */
function dependencyMismatches(text: string): string[] {
  const needs = new Set(aggregatorNeeds(text));
  const declared = new Set(expectedGatesInScript(text));
  const jobs = new Set(
    parseJobs(text)
      .map((job) => job.id)
      .filter((id) => id !== REQUIRED_CHECK),
  );
  const findings: string[] = [];

  for (const id of jobs) {
    if (!needs.has(id)) {
      findings.push(
        `job \`${id}\` is not in \`${REQUIRED_CHECK}\`'s needs:, so its result is never inspected`,
      );
    }
    if (!declared.has(id)) {
      findings.push(`job \`${id}\` is missing from the script's EXPECTED_GATES`);
    }
  }
  for (const id of needs) {
    if (!jobs.has(id)) {
      findings.push(
        `\`${REQUIRED_CHECK}\` needs \`${id}\`, which is not a job in this file`,
      );
    }
  }
  for (const id of declared) {
    if (!jobs.has(id)) {
      findings.push(`EXPECTED_GATES names \`${id}\`, which is not a job in this file`);
    }
  }
  return findings;
}

/**
 * Gate jobs carrying a JOB-level `if:`.
 *
 * This is the one that would look like a tidy-up and would break the repository. A
 * job-level condition reports `skipped`, the aggregator treats `skipped` as a failure --
 * it must, because that is how a failed dependency looks -- so gating the JOBS on the
 * scope verdict would turn every prose-only pull request red and leave the required
 * check unpassable. The gates are skipped as STEPS for exactly that reason.
 */
function jobLevelConditions(text: string): string[] {
  const findings: string[] = [];
  for (const id of gateJobIds(text)) {
    for (const line of code(jobOrThrow(text, id)).split("\n")) {
      if (/^ {4}if:/.test(line)) {
        findings.push(
          `job \`${id}\` has a job-level \`if:\`, which reports skipped: ${line.trim()}`,
        );
      }
    }
  }
  return findings;
}

/** Steps of a gate job that would run on a prose-only change, or misspell the gate. */
function ungatedGateSteps(text: string): string[] {
  const findings: string[] = [];
  for (const id of gateJobIds(text)) {
    const steps = stepsOf(jobOrThrow(text, id));
    if (steps.length === 0) {
      findings.push(`job \`${id}\` has no steps at all`);
      continue;
    }
    for (const step of steps) {
      const condition = stepCondition(step);
      if (condition === null) {
        findings.push(`\`${id}\` step \`${step.label}\` carries no \`if:\``);
        continue;
      }
      if (!condition.includes(GATE_CONDITION)) {
        findings.push(
          `\`${id}\` step \`${step.label}\` is conditioned on \`${condition}\`, which is not the gate`,
        );
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------------
// Does CI still run every gate at all?
//
// This arrived with T1 on 2026-08-04, when `content-gates`, `lint`, `typecheck`,
// `infra` and `build` stopped being five jobs and became five STEPS of `light-gates`.
// While they were jobs, deleting one broke the aggregator's `needs:` list and
// `dependencyMismatches` below reported it. As steps they are invisible to that
// arithmetic: delete the `npm run lint` line and every structural assertion in this
// file still passes, `code-quality` still goes green, and nothing lints again.
//
// That is #436's shape exactly -- a gate folded away, its name gone from the list the
// required check reads, the badge green over work nobody runs -- so the fold owes a
// replacement for the thing it removed, and this is it.
//
// THE POPULATION IS THE REPOSITORY'S OWN DEFINITION OF "RUN EVERYTHING", expanded
// transitively rather than transcribed: package.json's `check` script is
// `format:check && lint && typecheck && test`, and `test` is the two suites plus the
// three `check:*` gates. `build` is the second root because the web build is the one
// gate `check` does not reach, and CI ships the bundle. Both roots are asserted to
// exist, so a rename cannot empty the population silently.
//
// Deriving it from package.json rather than from the workflow is the load-bearing
// half: a population read out of the file under test would lose a gate at the same
// moment somebody deleted it, and pass over the absence.
// ---------------------------------------------------------------------------------

/** The two scripts that between them define what a full local check is. */
const GATE_ROOTS = ["check", "build"] as const;

interface GateLeaf {
  /** The command that actually runs, e.g. `biome lint .`. */
  readonly command: string;
  /** The script names that reach it, root first: `check -> test -> test:unit`. */
  readonly via: readonly string[];
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The gates this repository defines, as the leaves of `npm run check` and
 * `npm run build`.
 *
 * A segment that is a bare `npm run <script>` of this same manifest recurses; anything
 * else is a leaf, which is what makes `npm run build -w @cr/web` a leaf (it delegates to
 * another package's script) rather than an infinite loop back into `build`.
 */
function gateLeaves(packageManifest: string): GateLeaf[] {
  const scripts =
    (JSON.parse(packageManifest) as { scripts?: Record<string, string> }).scripts ?? {};
  const leaves: GateLeaf[] = [];
  const seen = new Set<string>();

  const walk = (name: string, via: readonly string[]): void => {
    if (seen.has(name)) {
      return;
    }
    seen.add(name);
    const body = scripts[name];
    if (body === undefined) {
      throw new Error(
        `${MANIFEST}: no \`${name}\` script, so the gate roots no longer describe this repository`,
      );
    }
    for (const raw of body.split("&&")) {
      const segment = raw.trim().replace(/^npm test$/, "npm run test");
      if (segment.length === 0) {
        continue;
      }
      const call = /^npm run ([\w:.-]+)$/.exec(segment);
      const target = call?.[1];
      if (target !== undefined && scripts[target] !== undefined) {
        walk(target, [...via, name]);
        continue;
      }
      leaves.push({ command: segment, via: [...via, name] });
    }
  };

  for (const root of GATE_ROOTS) {
    walk(root, []);
  }
  return leaves;
}

/** Every command a GATED step runs, across the gate jobs. */
function gatedCommands(text: string): string[] {
  const commands: string[] = [];
  for (const id of gateJobIds(text)) {
    for (const step of stepsOf(jobOrThrow(text, id))) {
      const condition = stepCondition(step);
      if (condition === null || !condition.includes(GATE_CONDITION)) {
        continue;
      }
      for (const line of step.lines) {
        const match = /^\s*(?:- )?run: (.+)$/.exec(line);
        if (match !== null) {
          commands.push((match[1] as string).trim());
        }
      }
    }
  }
  return commands;
}

/**
 * Whether a `run:` line invokes a gate: either the literal command, or `npm run
 * <script>` for any script on the path to it -- so invoking `npm run check` would
 * legitimately cover everything under it.
 */
function invokes(command: string, leaf: GateLeaf): boolean {
  if (command.includes(leaf.command)) {
    return true;
  }
  return leaf.via.some((name) =>
    new RegExp(`npm run ${escapeForRegExp(name)}(?![\\w:.-])`).test(command),
  );
}

/** Gates package.json defines that no gated step in the workflow runs. */
function uncoveredGates(text: string, packageManifest: string): string[] {
  const commands = gatedCommands(text);
  const findings: string[] = [];
  for (const leaf of gateLeaves(packageManifest)) {
    const covered = commands.some((command) => invokes(command, leaf));
    if (!covered) {
      findings.push(
        `no gated step runs \`${leaf.command}\` (reached from ${MANIFEST} as ${leaf.via.join(" -> ")}), so that gate is defined and never run`,
      );
    }
  }
  return findings;
}

/**
 * The job that folds several gates into steps, if there is one, and the ids of the gate
 * steps inside it.
 *
 * Derived by asking which gate job runs more than one of the gate commands above, rather
 * than by naming `light-gates`: the property that matters is "some job holds several
 * gates as steps", and the name it goes under is not the subject.
 */
function foldedGateSteps(
  text: string,
  packageManifest: string,
): {
  readonly job: string | null;
  readonly ids: string[];
} {
  const leaves = gateLeaves(packageManifest);
  for (const id of gateJobIds(text)) {
    const steps = stepsOf(jobOrThrow(text, id));
    const gateSteps: string[] = [];
    for (const step of steps) {
      const runs = step.lines.some((line) => {
        const match = /^\s*(?:- )?run: (.+)$/.exec(line);
        if (match === null) {
          return false;
        }
        const command = (match[1] as string).trim();
        return leaves.some((leaf) => invokes(command, leaf));
      });
      if (!runs) {
        continue;
      }
      const stepId = step.lines
        .map((line) => /^ {8}id: (\S+)\s*$/.exec(line)?.[1])
        .find((found) => found !== undefined);
      gateSteps.push(stepId ?? `<no id: ${step.label}>`);
    }
    if (gateSteps.length > 1) {
      return { job: id, ids: gateSteps };
    }
  }
  return { job: null, ids: [] };
}

/** The step ids the roll-call reports on. */
function rollCallIds(text: string, job: string): string[] {
  const body = jobOrThrow(text, job);
  return [...body.matchAll(/steps\.([A-Za-z0-9_-]+)\.outcome/g)].map(
    (match) => match[1] as string,
  );
}

// ---------------------------------------------------------------------------------
// `continue-on-error`, which is a one-word false green now that gates are steps.
//
// A step carrying it FAILS and the job still reports success, so the aggregator sees a
// green dependency over a red gate. While the gates were jobs this needed a job-level
// `continue-on-error` and a reviewer would have seen it; inside a folded job it is one
// indented line among eleven.
//
// One step legitimately carries it, so it is NAMED rather than quietly excluded, and
// asserted in both directions: an exemption whose step has gone stops exempting
// anything, and a step that stops carrying it stops needing the exemption. Force
// either false and the sweep fails at the entry it was excusing.
// ---------------------------------------------------------------------------------

interface AdvisoryStep {
  readonly job: string;
  readonly label: RegExp;
  readonly why: string;
}

const ADVISORY_STEPS: readonly AdvisoryStep[] = [
  {
    job: DECISION_JOB,
    label: /Work-log reminder/,
    why: "advisory per Definition of Done -- it WARNS about a missing work-log entry, and every gate depends on the job it lives in, so a reminder that could fail would take the required check red over a work-log entry nobody wrote",
  },
];

function continueOnErrorDefects(text: string): string[] {
  const findings: string[] = [];
  const carriers = new Map<string, Set<string>>();

  for (const job of parseJobs(text)) {
    for (const step of stepsOf(job.body)) {
      if (step.lines.some((line) => /^ {8}continue-on-error: true\s*$/.test(line))) {
        const labels = carriers.get(job.id) ?? new Set<string>();
        labels.add(step.label);
        carriers.set(job.id, labels);
      }
    }
  }

  for (const [job, labels] of carriers) {
    for (const label of labels) {
      const excused = ADVISORY_STEPS.some(
        (advisory) => advisory.job === job && advisory.label.test(label),
      );
      if (!excused) {
        findings.push(
          `\`${job}\` step \`${label}\` carries continue-on-error, so it can fail while its job still reports success -- which is a green required check over a red gate`,
        );
      }
    }
  }

  for (const advisory of ADVISORY_STEPS) {
    const labels = [...(carriers.get(advisory.job) ?? [])];
    if (!labels.some((label) => advisory.label.test(label))) {
      const jobExists = jobsOf(text).has(advisory.job);
      findings.push(
        jobExists
          ? `the declared exception ${String(advisory.label)} in \`${advisory.job}\` matches no step carrying continue-on-error, so it is excusing nothing (${advisory.why})`
          : `the declared exception ${String(advisory.label)} names job \`${advisory.job}\`, which is not in this file`,
      );
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------------
// Does CI run the WHOLE of every suite?
//
// This replaced a shard-completeness rule on 2026-08-04, when the two suites went from
// three matrix shards each to one job each (T2 of
// `docs/2026-08-04-ci-cost-measurement.md`). The old rule DERIVED its population from
// the jobs that pass `--shard=`, and after that change there are none -- so it would
// have gone on passing over an empty set, which is `.cursor/rules/qa-verification.mdc`'s
// canonical way for a guard to report green while measuring nothing.
//
// So the population is scoped by the BEHAVIOUR rather than by the mechanism: the thing
// that must be true is "CI runs all of every suite this repository defines", and
// sharding is one implementation of that, not the subject. The population is therefore
// package.json's `test:*` scripts, and it is read from the manifest rather than from the
// workflow on purpose -- a population derived from the file under test would lose a
// suite at the same moment the suite was deleted from CI, and pass over its absence.
// ---------------------------------------------------------------------------------

/** Every suite this repository defines. Derived, never written down here. */
function suiteScripts(packageManifest: string): string[] {
  const scripts =
    (JSON.parse(packageManifest) as { scripts?: Record<string, string> }).scripts ?? {};
  return Object.keys(scripts)
    .filter((name) => name.startsWith("test:"))
    .sort();
}

/** Browser project names, derived from the config the suite command actually loads. */
function configuredBrowserProjects(config: string): string[] {
  return Array.from(config.matchAll(/^\s*name:\s*"([^"]+)",?\s*$/gm), (match) =>
    String(match[1]),
  ).sort();
}

const BROWSER_PROJECTS = configuredBrowserProjects(browserConfig);

/** The matrix argument shape allowed for suites that shard across separate jobs. */
const SHARD_ARGS = `-- --shard=${interpolation("matrix.shard")}/${interpolation("strategy.job-total")}`;

interface SuiteInvocation {
  readonly job: string;
  readonly script: string;
  /** Everything after `npm run <script>` on that `run:` line. */
  readonly args: string;
}

function suiteInvocations(text: string, script: string): SuiteInvocation[] {
  const found: SuiteInvocation[] = [];
  // `(?![\w:.-])` so `test:unit` cannot match the head of a `test:unit-only` script.
  const pattern = new RegExp(`npm run ${script}(?![\\w:.-])(.*)$`);
  for (const job of parseJobs(text)) {
    for (const line of code(job.body).split("\n")) {
      const match = pattern.exec(line);
      if (match !== null) {
        found.push({ job: job.id, script, args: (match[1] ?? "").trim() });
      }
    }
  }
  return found;
}

/**
 * Defects in the browser suite's sequential project partition.
 *
 * A complete project may run once, or may be split into every shard from 1 through one common
 * divisor. The configured project set is asserted in both directions: an invocation for no
 * project in the config fails, and a configured project with no invocation fails. This is what
 * lets the hosted job restart Chromium without turning `--project` into a coverage hole.
 */
function sequentialBrowserPartitionDefects(
  invocations: readonly SuiteInvocation[],
  configuredProjects: readonly string[],
): string[] {
  const findings: string[] = [];
  const configured = new Set(configuredProjects);
  const byProject = new Map<
    string,
    Array<{
      readonly job: string;
      readonly shard: number | null;
      readonly divisor: number | null;
    }>
  >();
  const pattern = /^-- --project ([\w-]+)(?: --shard=(\d+)\/(\d+))?$/;

  if (configuredProjects.length < 2 || configured.size !== configuredProjects.length) {
    findings.push(
      `${BROWSER_CONFIG} yielded ${configuredProjects.length} browser projects (${configuredProjects.join(", ")}), so the partition population is empty or duplicated`,
    );
  }

  for (const invocation of invocations) {
    const match = pattern.exec(invocation.args);
    if (match === null) {
      findings.push(
        `job \`${invocation.job}\` runs \`${invocation.script}\` with \`${invocation.args}\`, which is neither one complete configured project nor one numbered shard of it`,
      );
      continue;
    }
    const project = String(match[1]);
    if (!configured.has(project)) {
      findings.push(
        `job \`${invocation.job}\` runs unknown browser project \`${project}\`; configured projects are [${configuredProjects.join(", ")}]`,
      );
    }
    const entries = byProject.get(project) ?? [];
    entries.push({
      job: invocation.job,
      shard: match[2] === undefined ? null : Number(match[2]),
      divisor: match[3] === undefined ? null : Number(match[3]),
    });
    byProject.set(project, entries);
  }

  for (const project of configuredProjects) {
    const entries = byProject.get(project) ?? [];
    if (entries.length === 0) {
      findings.push(
        `configured browser project \`${project}\` has no suite invocation, so all of its files are uncovered`,
      );
      continue;
    }
    const jobs = new Set(entries.map((entry) => entry.job));
    if (jobs.size !== 1) {
      findings.push(
        `browser project \`${project}\` is split across jobs [${[...jobs].sort().join(", ")}], so no one job owns its complete verdict`,
      );
    }
    const whole = entries.filter((entry) => entry.shard === null);
    const shards = entries.filter((entry) => entry.shard !== null);
    if (whole.length > 0) {
      if (whole.length !== 1 || shards.length > 0) {
        findings.push(
          `browser project \`${project}\` runs whole ${whole.length} time(s) and in ${shards.length} shard(s), so its partition overlaps`,
        );
      }
      continue;
    }

    const divisors = new Set(shards.map((entry) => entry.divisor));
    const divisor = divisors.size === 1 ? [...divisors][0] : undefined;
    if (
      divisor === undefined ||
      divisor === null ||
      !Number.isInteger(divisor) ||
      divisor < 2 ||
      shards.length !== divisor
    ) {
      findings.push(
        `browser project \`${project}\` has ${shards.length} shards with divisors [${[...divisors].sort().join(", ")}], so they do not define one complete partition`,
      );
      continue;
    }
    const observed = shards.map((entry) => entry.shard as number).sort((a, b) => a - b);
    const expected = Array.from({ length: divisor }, (_, index) => index + 1);
    if (observed.join(",") !== expected.join(",")) {
      findings.push(
        `browser project \`${project}\` has shard indices [${observed.join(", ")}], not 1..${divisor}`,
      );
    }
  }

  return findings;
}

/**
 * Suites CI does not run in full, and the shapes that would quietly narrow one.
 *
 * A suite that silently stops running is a FALSE GREEN of the worst kind, and every way
 * it happens is an ARGUMENT: `--shard=1/3` runs a third, `-t name` runs one test, a path
 * runs one file. So the rule is that a suite is invoked with NO arguments at all, with two
 * checked exceptions: a complete shard matrix whose divisor comes from `strategy.job-total`,
 * and the browser suite's derived project partition checked above in both directions.
 */
function suiteRunDefects(text: string, packageManifest: string): string[] {
  const findings: string[] = [];
  const jobs = jobsOf(text);
  const shardedJobs = new Set<string>();

  for (const script of suiteScripts(packageManifest)) {
    const invocations = suiteInvocations(text, script);
    if (invocations.length === 0) {
      findings.push(
        `no job runs \`npm run ${script}\`, so that suite is not a gate on anything`,
      );
      continue;
    }
    if (
      script === "test:browser" &&
      invocations.some(({ args }) => /--project\b/.test(args))
    ) {
      const partitionFindings = sequentialBrowserPartitionDefects(
        invocations,
        BROWSER_PROJECTS,
      );
      findings.push(...partitionFindings);
      if (partitionFindings.length === 0) {
        for (const { job } of invocations) {
          shardedJobs.add(job);
        }
      }
      continue;
    }
    for (const { job, args } of invocations) {
      const body = code(jobs.get(job) ?? "");
      if (args === "") {
        if (/^ {4}strategy:\s*$/m.test(body)) {
          findings.push(
            `job \`${job}\` runs \`${script}\` with no shard argument but declares a \`strategy:\`, so every matrix leg runs the whole suite and the legs' names say otherwise`,
          );
        }
        continue;
      }
      if (args !== SHARD_ARGS) {
        findings.push(
          `job \`${job}\` runs \`${script}\` with \`${args}\`, which can narrow what the suite runs. The only accepted argument is \`${SHARD_ARGS}\`, whose divisor is the matrix's own length rather than a second copy of it.`,
        );
        continue;
      }
      shardedJobs.add(job);
      const list = /^ {8}shard: \[([^\]]*)\]\s*$/m.exec(body);
      if (list === null) {
        findings.push(`job \`${job}\` shards \`${script}\` without a \`shard:\` matrix`);
        continue;
      }
      const shards = (list[1] as string)
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      const contiguous = shards.map((_, index) => String(index + 1));
      if (shards.join(",") !== contiguous.join(",")) {
        findings.push(
          `job \`${job}\` has shards [${shards.join(", ")}], which is not 1..${shards.length}: a shard outside the divisor's range never runs`,
        );
      }
      if (shards.length < 2) {
        findings.push(
          `job \`${job}\` declares a shard matrix of ${shards.length}, which is a whole suite written as a partition`,
        );
      }
      if (!/^ {6}fail-fast: false\s*$/m.test(body)) {
        findings.push(
          `job \`${job}\` leaves fail-fast on, so one failing shard cancels the others and hides their failures`,
        );
      }
    }
  }

  // The other door: a suite partitioned by something other than an `npm run test:*`
  // line -- `npx vitest run --shard=...` -- would pass every check above by not being
  // seen at all.
  for (const job of parseJobs(text)) {
    if (/--shard=/.test(code(job.body)) && !shardedJobs.has(job.id)) {
      findings.push(
        `job \`${job.id}\` passes \`--shard=\` outside a checked suite invocation, so nothing here knows what it runs`,
      );
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------------
// Extracting the aggregator's script, and running it.
// ---------------------------------------------------------------------------------

/**
 * The `run:` script of the aggregator step, dedented, exactly as the runner receives it.
 *
 * Anchored on the step id rather than on a line number, and every caller asserts the
 * result is a real script, so an extraction that silently came back empty cannot pass as
 * agreement: `bash -c ""` exits 0 and writes nothing, which is indistinguishable from a
 * verdict of "everything passed".
 */
function aggregatorScript(text: string): string {
  const lines = jobOrThrow(text, REQUIRED_CHECK).split("\n");
  const idAt = lines.findIndex((line) => /^\s*id: aggregate\s*$/.test(line));
  if (idAt < 0) {
    throw new Error(`${WORKFLOW}: no aggregator step carries \`id: aggregate\``);
  }
  let runAt = -1;
  let indent = "";
  for (let index = idAt; index < lines.length; index += 1) {
    const match = /^(\s*)run: \|\s*$/.exec(lines[index] ?? "");
    if (match !== null) {
      runAt = index;
      indent = `${match[1] ?? ""}  `;
      break;
    }
  }
  if (runAt < 0) {
    throw new Error(`${WORKFLOW}: the aggregator step has no \`run: |\` block`);
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

const SCRIPT = aggregatorScript(workflow);

/**
 * How GitHub invokes a `shell: bash` step, read off a real run's log rather than guessed.
 * `-e` and `-o pipefail` are the part that matters: the script sets only `-uo pipefail`
 * itself, so running it under a plain `bash` would exercise different semantics from
 * production -- an empty `needs` payload has to reach the explicit error rather than
 * dying in a pipeline, and malformed JSON has to die.
 */
const RUNNER_BASH = ["--noprofile", "--norc", "-e", "-o", "pipefail"];

const scratch = mkdtempSync(join(tmpdir(), "ci-gate-aggregation-"));
const scriptFile = join(scratch, "aggregate.sh");
writeFileSync(scriptFile, SCRIPT);

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

interface Outcome {
  readonly status: number;
  readonly output: string;
}

/** Runs the extracted script over a `needs` payload, as `event` presents it. */
function aggregate(
  results: Readonly<Record<string, string>> | string,
  options: { readonly scope?: string; readonly event?: string } = {},
): Outcome {
  const payload =
    typeof results === "string"
      ? results
      : JSON.stringify(
          Object.fromEntries(
            Object.entries(results).map(([job, result]) => [job, { result }]),
          ),
        );
  try {
    const output = execFileSync("bash", [...RUNNER_BASH, scriptFile], {
      cwd: scratch,
      encoding: "utf8",
      env: {
        ...process.env,
        GATE_RESULTS: payload,
        SCOPE_VERDICT: options.scope ?? "true",
        GITHUB_EVENT_NAME: options.event ?? "pull_request",
      },
    });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? -1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

/** Every gate green, which is the only input that may exit 0. */
function allGreen(): Record<string, string> {
  return Object.fromEntries(
    expectedGatesInScript(workflow).map((gate) => [gate, "success"]),
  );
}

// ---------------------------------------------------------------------------------

describe("the required check survives the split", () => {
  it("keeps a job named exactly `code-quality`", () => {
    // The one thing this change could not get wrong. `code-quality` is the sole context
    // in `integration`'s branch protection, contexts match BY NAME, and a required check
    // that never reports blocks every open pull request until an admin edits the
    // settings. So the name is asserted, and asserted to be a JOB rather than a step.
    expect(jobsOf(workflow).has(REQUIRED_CHECK)).toBe(true);
  });

  it("runs no gate of its own", () => {
    // A pure aggregator. If it checked out the tree or installed anything, its own
    // duration would be back on the critical path, and a failure in its setup would be
    // indistinguishable from a gate failing.
    const body = code(jobOrThrow(workflow, REQUIRED_CHECK));
    expect(body).not.toMatch(/uses: actions\/checkout/);
    expect(body).not.toMatch(/uses: actions\/setup-node/);
    expect(body).not.toMatch(/npm (ci|run)/);
  });

  it("inspects its dependencies even when they failed", () => {
    // Without `always()` the aggregator is itself skipped the moment a gate fails, and a
    // skipped required check is the false green this whole shape exists to refuse.
    expect(code(jobOrThrow(workflow, REQUIRED_CHECK))).toMatch(/^ {4}if: always\(\)$/m);
  });

  it("depends on every gate in the file, and speaks for exactly those", () => {
    // Three lists -- the jobs in this file, the aggregator's `needs:`, and the script's
    // own EXPECTED_GATES -- held to one another in both directions. The floor is what
    // stops a parser that came back empty from reading as unanimous agreement, and it
    // is four because that is the irreducible shape: the decision job, the folded light
    // gates, and the two suites. It was eight before T1 folded five jobs into one, and
    // the coverage those five names used to carry now lives in the `uncoveredGates`
    // sweep below -- which is where to look if this floor seems thin.
    const gates = parseJobs(workflow)
      .map((job) => job.id)
      .filter((id) => id !== REQUIRED_CHECK);
    expect(gates.length).toBeGreaterThanOrEqual(4);
    expect(dependencyMismatches(workflow)).toEqual([]);
    expect([...aggregatorNeeds(workflow)].sort()).toEqual([...gates].sort());
    expect([...expectedGatesInScript(workflow)].sort()).toEqual([...gates].sort());
  });

  it("runs every gate package.json defines, folded or not", () => {
    // The replacement for what the `needs:` list stopped watching at T1. Derived from
    // the manifest, with a floor, and every leaf named in the failure message.
    const leaves = gateLeaves(manifest);
    expect(leaves.length).toBeGreaterThanOrEqual(8);
    expect(uncoveredGates(workflow, manifest)).toEqual([]);
  });

  it("lets no gate step fail quietly, and names the one step that may", () => {
    expect(continueOnErrorDefects(workflow)).toEqual([]);
  });

  it("rolls call on every gate that is a step rather than a job", () => {
    // What the fold takes away is the RUN PAGE: `code-quality` prints its `needs:`, and
    // a step is not in anyone's `needs:`. The roll-call inside the folded job is where a
    // reader sees the folded gates account for themselves, so it has to name all of
    // them -- set equality, both directions, so a gate added as a step without being
    // added to the roll-call fails here rather than going unreported there.
    const folded = foldedGateSteps(workflow, manifest);
    expect(folded.job, "no job folds several gates into steps").not.toBeNull();
    expect(folded.ids.length).toBeGreaterThanOrEqual(5);
    for (const id of folded.ids) {
      expect(id, `a folded gate step carries no id, so nothing can report it`).not.toMatch(
        /^<no id/,
      );
    }
    expect([...rollCallIds(workflow, folded.job as string)].sort()).toEqual(
      [...folded.ids].sort(),
    );
  });

  it("caps every job well below the 50 minutes the combined job needed", () => {
    // The combined job was capped at 50 against an observed ~24m. These are minutes, not
    // a copied constant: a cap inside the noise band loses on billing as well as signal,
    // because a killed run bills its full cap and returns nothing.
    const caps = new Map<string, number>();
    for (const job of parseJobs(workflow)) {
      const match = /^ {4}timeout-minutes: (\d+)\s*$/m.exec(code(job.body));
      expect(match, `job \`${job.id}\` declares no timeout-minutes`).not.toBeNull();
      caps.set(job.id, Number(match?.[1]));
    }
    expect(caps.size).toBeGreaterThanOrEqual(5);
    for (const [id, cap] of caps) {
      expect(cap, `job \`${id}\` is capped at ${cap}`).toBeGreaterThan(0);
      expect(
        cap,
        `job \`${id}\` is capped at ${cap}, the old combined cap or worse`,
      ).toBeLessThan(50);
    }
  });
});

describe("the gates are skipped as steps and never as jobs", () => {
  it("gives the decision job an output and leaves its own steps ungated", () => {
    const scope = jobOrThrow(workflow, DECISION_JOB);
    // Written as a pattern rather than a string literal so the workflow's `${{ }}` does
    // not read as a missed JavaScript template to the linter.
    expect(code(scope)).toMatch(/^ {6}code: \$\{\{ steps\.scope\.outputs\.code \}\}$/m);
    // The decision itself must never be gated on its own answer, and neither must the
    // advisory reminder beside it: its owner regexes match `.github/` and four tracked
    // READMEs, so a prose-only change can be an owner-area change.
    for (const step of stepsOf(scope)) {
      expect(
        stepCondition(step),
        `the ${DECISION_JOB} job's \`${step.label}\` is gated`,
      ).toBeNull();
    }
  });

  it("gates every gate step, and no gate job", () => {
    expect(gateJobIds(workflow).length).toBeGreaterThanOrEqual(3);
    expect(jobLevelConditions(workflow)).toEqual([]);
    expect(ungatedGateSteps(workflow)).toEqual([]);
  });

  it("runs every suite this repository defines, in full", () => {
    // The floor is what stops a manifest that parsed to nothing reading as unanimous
    // agreement, and it is a floor on the DERIVED population rather than on the
    // workflow's own job list, so a suite deleted from CI cannot shrink it.
    expect(suiteScripts(manifest).length).toBeGreaterThanOrEqual(2);
    expect(BROWSER_PROJECTS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(BROWSER_PROJECTS).size).toBe(BROWSER_PROJECTS.length);
    expect(suiteRunDefects(workflow, manifest)).toEqual([]);
  });

  it("keeps a suite script for every vitest config, and a config for every script", () => {
    // The population above is `test:*` scripts, which is a naming convention, so this is
    // the check that the convention still spans the suites: a third vitest config with
    // no script would be a suite outside the population, invisible to the rule above.
    // Set equality, so it fails in both directions.
    const configs = readdirSync(repoRoot).filter((name) =>
      /^vitest\..*config\.[cm]?[jt]sx?$/.test(name),
    );
    expect(configs.length).toBeGreaterThanOrEqual(2);

    const scripts =
      (JSON.parse(manifest) as { scripts?: Record<string, string> }).scripts ?? {};
    const named = new Set<string>();
    for (const suite of suiteScripts(manifest)) {
      const explicit = /--config[= ]+(\S+)/.exec(scripts[suite] ?? "");
      named.add(explicit === null ? "vitest.config.ts" : (explicit[1] as string));
    }
    expect([...named].sort()).toEqual([...configs].sort());
  });
});

describeOnBashHost("the aggregator's verdict, driven over the shipped script", () => {
  it("extracted a real script rather than nothing", () => {
    // The floor under every behavioural test below: an empty script exits 0 and writes
    // nothing, which is indistinguishable from "every gate passed".
    expect(SCRIPT.split("\n").length).toBeGreaterThan(30);
    expect(SCRIPT).toContain("EXPECTED_GATES");
    expect(SCRIPT).toContain("GATE_RESULTS");
  });

  it("passes only when every gate succeeded", () => {
    const outcome = aggregate(allGreen());
    expect(outcome.status).toBe(0);
    expect(outcome.output).toContain("Every gate reported success");
  });

  it("goes red for a FAILED gate, whichever gate it is", () => {
    // Quantified over the derived population rather than spot-checked on one gate: the
    // defect worth catching is a single dependency whose result nothing reads.
    const gates = expectedGatesInScript(workflow);
    expect(gates.length).toBeGreaterThanOrEqual(4);
    for (const gate of gates) {
      const outcome = aggregate({ ...allGreen(), [gate]: "failure" });
      expect(outcome.status, `a failed \`${gate}\` did not turn the check red`).not.toBe(0);
      expect(outcome.output).toContain(gate);
    }
  });

  it("goes red for a SKIPPED gate, which is the whole point", () => {
    // A job whose dependency failed is skipped, not failed. Treating that as neutral is
    // what put twelve green badges on `integration` over gates that never ran.
    for (const gate of expectedGatesInScript(workflow)) {
      const outcome = aggregate({ ...allGreen(), [gate]: "skipped" });
      expect(outcome.status, `a skipped \`${gate}\` did not turn the check red`).not.toBe(
        0,
      );
      expect(outcome.output).toContain("SKIPPED");
    }
  });

  it("goes red for a CANCELLED gate, which reached no verdict at all", () => {
    for (const gate of expectedGatesInScript(workflow)) {
      const outcome = aggregate({ ...allGreen(), [gate]: "cancelled" });
      expect(outcome.status, `a cancelled \`${gate}\` did not turn the check red`).not.toBe(
        0,
      );
      expect(outcome.output).toContain("CANCELLED");
    }
  });

  it("goes red when EVERY gate was skipped, which is yesterday's run shape", () => {
    const skipped = Object.fromEntries(
      expectedGatesInScript(workflow).map((gate) => [gate, "skipped"]),
    );
    expect(aggregate(skipped).status).not.toBe(0);
  });

  it("refuses to pass over an empty dependency set", () => {
    // NON-VACUITY, at runtime. `toJSON(needs)` coming back `{}` would leave the
    // per-gate loop with nothing to iterate, and a loop over nothing reports no
    // failures. The name check in the script is what catches it, so this is the
    // assertion that the check is load-bearing.
    const outcome = aggregate("{}");
    expect(outcome.status).not.toBe(0);
    expect(outcome.output).toContain("not watching the gates it claims to");
  });

  it("refuses to pass when a gate is missing from its dependencies", () => {
    for (const gate of expectedGatesInScript(workflow)) {
      const short = { ...allGreen() };
      delete short[gate];
      const outcome = aggregate(short);
      expect(outcome.status, `losing \`${gate}\` from needs: still passed`).not.toBe(0);
    }
  });

  it("refuses to pass when it depends on something it does not speak for", () => {
    // The other direction. A dependency the script has no rule for is a dependency whose
    // result is not inspected, so it must fail rather than be tolerated.
    const outcome = aggregate({ ...allGreen(), "a-new-gate": "success" });
    expect(outcome.status).not.toBe(0);
  });

  it("refuses to pass when the scope verdict never resolved", () => {
    // The one new false-green path this split introduces: every gate job gates its steps
    // on the scope output, so an empty output means all of them skipped their own work
    // and reported success over a tree nothing read.
    for (const scope of ["", "maybe", "TRUE"]) {
      const outcome = aggregate(allGreen(), { scope });
      expect(outcome.status, `a scope verdict of "${scope}" was accepted`).not.toBe(0);
      expect(outcome.output).toContain("no verdict");
    }
  });

  it("lets a pull request take the prose-only path, and never a push", () => {
    // #436 kept structural. A prose-only pull request legitimately skips the gates, so it
    // must pass; a push run asks whether the branch is green, and "we did not look" is
    // not an answer to that.
    expect(aggregate(allGreen(), { scope: "false", event: "pull_request" }).status).toBe(0);
    expect(aggregate(allGreen(), { scope: "true", event: "push" }).status).toBe(0);

    for (const event of ["push", "workflow_dispatch", "merge_group"]) {
      const outcome = aggregate(allGreen(), { scope: "false", event });
      expect(outcome.status, `a '${event}' run was allowed to skip every gate`).not.toBe(0);
      expect(outcome.output).toContain("#436");
    }
  });

  it("dies rather than guesses when the payload is not JSON", () => {
    expect(aggregate("{not json").status).not.toBe(0);
  });
});

describe("the structural sweeps are non-vacuous", () => {
  /** Mutates the workflow text, refusing to return a copy the replacement did not change. */
  function mutate(from: string | RegExp, to: string): string {
    const mutant = workflow.replace(from, () => to);
    expect(
      mutant,
      `the mutation ${String(from)} matched nothing, so it proves nothing`,
    ).not.toBe(workflow);
    return mutant;
  }

  it("catches a gate dropped from the required check's dependencies", () => {
    // The defect that would matter most and show least: `test-browser` still runs, still
    // goes red on its own tab, and the required check no longer reads its result.
    const mutant = mutate(/^ {6}- test-browser$/m, "");
    expect(dependencyMismatches(mutant).join("\n")).toContain("test-browser");
  });

  it("catches a folded gate deleted from the job that now holds it", () => {
    // THE DEFECT T1 MADE POSSIBLE, and the reason this sweep exists. While `lint` was a
    // job, deleting it broke the aggregator's `needs:` list. As a step it breaks
    // nothing structural: every other assertion in this file still passes over the
    // mutant, `code-quality` still goes green, and nothing lints again.
    const mutant = mutate(/^ {8}run: npm run lint$/m, "        run: echo skipped");
    expect(dependencyMismatches(mutant)).toEqual([]);
    expect(uncoveredGates(mutant, manifest).join("\n")).toContain("biome lint .");
  });

  it("catches each folded gate deleted, one at a time", () => {
    // Quantified over the whole folded set rather than spot-checked on `lint`, because
    // the gate that gets forgotten is precisely the one nobody wrote a case for.
    const folded = [
      "npm run format:check",
      "npm run typecheck",
      "npm run build -w @cr/web",
      "python3 packages/skill-graph/test/graph_invariants.py packages/skill-graph/src/skill_graph.json",
      "bash scripts/check-lesson-packs.sh",
    ];
    for (const command of folded) {
      const mutant = mutate(
        new RegExp(`^ {8}run: ${escapeForRegExp(command)}$`, "m"),
        "        run: echo skipped",
      );
      expect(
        uncoveredGates(mutant, manifest).length,
        `deleting \`${command}\` was not reported`,
      ).toBeGreaterThan(0);
    }
  });

  it("catches a gate added to package.json and never wired into CI", () => {
    const parsed = JSON.parse(manifest) as { scripts: Record<string, string> };
    parsed.scripts["check:copy"] = "node scripts/check-copy.mjs";
    parsed.scripts.check = `${parsed.scripts.check} && npm run check:copy`;
    expect(uncoveredGates(workflow, JSON.stringify(parsed)).join("\n")).toContain(
      "node scripts/check-copy.mjs",
    );
  });

  it("catches a gate step made unable to fail its job", () => {
    // One indented line, inside a job of eleven steps, and the required check goes green
    // over a red gate.
    const mutant = mutate(
      /^ {6}- name: Lint \(biome\)$/m,
      "      - name: Lint (biome)\n        continue-on-error: true",
    );
    expect(continueOnErrorDefects(mutant).join("\n")).toContain("Lint (biome)");
  });

  it("catches a declared continue-on-error exception that has stopped excusing anything", () => {
    // The other direction, which is what stops an exemption becoming permanent by
    // neglect: the work-log reminder is allowed to swallow its own failures, and the
    // moment it stops doing so the list has to say so rather than sit there.
    const mutant = mutate(/^ {8}continue-on-error: true$/m, "        # was advisory");
    expect(continueOnErrorDefects(mutant).join("\n")).toContain("excusing nothing");
  });

  it("catches a gate job added without being wired in", () => {
    const mutant = mutate(
      /^ {2}light-gates:$/m,
      "  a-new-gate:\n    needs: scope\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - run: echo unwired\n  light-gates:",
    );
    expect(dependencyMismatches(mutant).join("\n")).toContain("a-new-gate");
  });

  it("catches a job-level `if:` on a gate", () => {
    // Which is how a prose-only pull request would become unmergeable: the job reports
    // skipped, and the aggregator treats skipped as a failure.
    const mutant = mutate(
      /^ {2}light-gates:\n {4}needs: scope$/m,
      "  light-gates:\n    needs: scope\n    if: needs.scope.outputs.code == 'true'",
    );
    expect(jobLevelConditions(mutant).join("\n")).toContain("light-gates");
  });

  it("catches a gate step whose condition is misspelled", () => {
    // A typo here is a gate that never runs again while its job still reports success.
    // Note it also survives `uncoveredGates`: the command is still there, so only the
    // condition sweep sees this one.
    const mutant = mutate(
      /^ {8}if: \$\{\{ !cancelled\(\) && needs\.scope\.outputs\.code == 'true' \}\}\n {8}run: npm run typecheck$/m,
      `        if: ${interpolation("!cancelled() && needs.scope.outputs.cod == 'true'")}\n        run: npm run typecheck`,
    );
    expect(ungatedGateSteps(mutant).join("\n")).toContain("Typecheck");
  });

  it("catches a gate step with no condition at all", () => {
    const mutant = mutate(
      /^ {8}if: \$\{\{ !cancelled\(\) && needs\.scope\.outputs\.code == 'true' \}\}\n {8}run: npm run lint$/m,
      "        run: npm run lint",
    );
    expect(ungatedGateSteps(mutant).join("\n")).toContain("carries no");
  });

  /**
   * Re-shards a suite job, so the shard rules can be shown to fire.
   *
   * The shipped file has no matrix at all since T2, so every shard rule below is an
   * assertion about a shape that is not in the tree. An assertion nobody can make fail
   * is not an assertion, so the sharded shape is CONSTRUCTED here and the rules are
   * driven over it -- which is also the proof that re-sharding later would still be
   * checked rather than merely allowed.
   */
  function shardify(
    job: string,
    script: string,
    options: {
      readonly list: string;
      readonly divisor?: string;
      readonly failFast?: string;
    },
  ): string {
    const withMatrix = mutate(
      new RegExp(`^ {2}${job}:\\n {4}needs: scope$`, "m"),
      `  ${job}:\n    needs: scope\n    strategy:\n      fail-fast: ${
        options.failFast ?? "false"
      }\n      matrix:\n        shard: [${options.list}]`,
    );
    const divisor = options.divisor ?? interpolation("strategy.job-total");
    const sharded = withMatrix.replace(
      new RegExp(`^ {8}run: npm run ${script}$`, "m"),
      `        run: npm run ${script} -- --shard=${interpolation("matrix.shard")}/${divisor}`,
    );
    expect(sharded, "the shard argument matched nothing, so it proves nothing").not.toBe(
      withMatrix,
    );
    return sharded;
  }

  it("catches a suite run narrowed to a shard with no matrix behind it", () => {
    // The defect T2 made possible: one job, and somebody hands it a third of the files.
    const mutant = mutate(
      /^ {8}run: npm run test:unit$/m,
      "        run: npm run test:unit -- --shard=1/3",
    );
    expect(suiteRunDefects(mutant, manifest).join("\n")).toContain("can narrow");
  });

  it("catches a suite filtered down to a name or a path", () => {
    for (const narrowing of ['-- -t "the one I am debugging"', "-- apps/web/src"]) {
      const mutant = mutate(
        /^ {8}run: npm run test:browser -- --project packages$/m,
        `        run: npm run test:browser -- --project packages ${narrowing}`,
      );
      expect(suiteRunDefects(mutant, manifest).join("\n")).toContain(
        "neither one complete configured project",
      );
    }
  });

  it("catches a suite no job runs at all", () => {
    const mutant = mutate(
      /^ {8}run: npm run test:browser -- --project .*$/gm,
      "        run: echo later",
    );
    expect(suiteRunDefects(mutant, manifest).join("\n")).toContain(
      "no job runs `npm run test:browser`",
    );
  });

  it("catches either direction of browser-project drift", () => {
    const invocations = suiteInvocations(workflow, "test:browser");

    const configAdded = sequentialBrowserPartitionDefects(
      invocations,
      [...BROWSER_PROJECTS, "new-browser-project"].sort(),
    );
    expect(configAdded.join("\n")).toContain(
      "configured browser project `new-browser-project` has no suite invocation",
    );

    const configRemoved = sequentialBrowserPartitionDefects(
      invocations,
      BROWSER_PROJECTS.filter((project) => project !== "packages"),
    );
    expect(configRemoved.join("\n")).toContain("unknown browser project `packages`");
  });

  it("catches a missing or duplicate sequential browser shard", () => {
    const missing = mutate(
      /^ {8}run: npm run test:browser -- --project web --shard=4\/4$/m,
      "        run: echo missing-fourth-quarter",
    );
    expect(suiteRunDefects(missing, manifest).join("\n")).toContain(
      "has 3 shards with divisors [4]",
    );

    const duplicate = mutate(
      /^ {8}run: npm run test:browser -- --project web --shard=4\/4$/m,
      "        run: npm run test:browser -- --project web --shard=1/4",
    );
    expect(suiteRunDefects(duplicate, manifest).join("\n")).toContain(
      "has shard indices [1, 1, 2, 3], not 1..4",
    );
  });

  it("catches a project run both whole and sharded", () => {
    const mutant = mutate(
      /^ {8}run: npm run test:browser -- --project packages$/m,
      "        run: npm run test:browser -- --project web",
    );
    const defects = suiteRunDefects(mutant, manifest).join("\n");
    expect(defects).toContain(
      "configured browser project `packages` has no suite invocation",
    );
    expect(defects).toContain(
      "browser project `web` runs whole 1 time(s) and in 4 shard(s)",
    );
  });

  it("catches a suite added to package.json and never wired into CI", () => {
    // The direction the old rule could not see at all: its population came from the
    // workflow, so a suite that was never in the workflow was never in the population.
    const parsed = JSON.parse(manifest) as { scripts: Record<string, string> };
    parsed.scripts["test:contract"] = "vitest run --config vitest.contract.config.ts";
    expect(suiteRunDefects(workflow, JSON.stringify(parsed)).join("\n")).toContain(
      "test:contract",
    );
  });

  it("catches a shard list that no longer covers its divisor", () => {
    // `[1, 3]` over `strategy.job-total` of 2 runs shards 1/2 and 3/2 -- the second of
    // which vitest treats as out of range -- so a third of the suite silently vanishes
    // and the check still goes green.
    const mutant = shardify("test-unit", "test:unit", { list: "1, 3" });
    expect(suiteRunDefects(mutant, manifest).join("\n")).toContain("not 1..2");
  });

  it("catches a hand-typed shard divisor", () => {
    const mutant = shardify("test-unit", "test:unit", { list: "1, 2, 3", divisor: "3" });
    expect(suiteRunDefects(mutant, manifest).join("\n")).toContain("can narrow");
  });

  it("catches fail-fast being left on a sharded suite", () => {
    const mutant = shardify("test-unit", "test:unit", {
      list: "1, 2, 3",
      failFast: "true",
    });
    expect(suiteRunDefects(mutant, manifest).join("\n")).toContain("fail-fast");
  });

  it("accepts a suite that is re-sharded correctly, so the rules above are not a ban", () => {
    // The counterpart to the five injections above: they would all pass if the rule
    // simply refused every matrix, and a rule that refuses everything catches nothing.
    const mutant = shardify("test-unit", "test:unit", { list: "1, 2, 3" });
    expect(suiteRunDefects(mutant, manifest)).toEqual([]);
  });

  it("catches `always()` being dropped from the aggregator", () => {
    const mutant = mutate(/^ {4}if: always\(\)$/m, "");
    expect(code(jobOrThrow(mutant, REQUIRED_CHECK))).not.toMatch(/^ {4}if: always\(\)$/m);
  });

  it("catches the required check being renamed", () => {
    const mutant = mutate(/^ {2}code-quality:$/m, "  gates:");
    expect(jobsOf(mutant).has(REQUIRED_CHECK)).toBe(false);
  });
});
