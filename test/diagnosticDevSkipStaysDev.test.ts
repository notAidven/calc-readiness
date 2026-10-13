import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **NOTHING IN THE TREE MOUNTS THE DIAGNOSTIC'S DEV SKIP WITHOUT ITS GATE — AND THERE IS NO
 * LONGER A PROP THAT COULD.**
 *
 * Sibling of `winterDevSkipStaysDev.test.ts`, same defect and same shape. That file's
 * argument applies verbatim, so it is not restated at length: a behavioural test can only
 * ever drive the DEFAULT of an `enabled` prop, and a mount that passes the prop overrides
 * the environment gate while every such test stays green. The hole is closeable only at the
 * call sites, and the claim is an ABSENCE, which is the one shape a source sweep proves
 * outright.
 *
 * This control is worth its own sweep rather than a line in that one because what it can
 * leak is different in kind. The winter's skip resolves rounds of an unscored encounter.
 * This one ANSWERS A DIAGNOSTIC: shipped past its gate it would let a learner hand
 * themselves a full test-out, twenty buildings and a placement they never earned — through
 * the real scorer, so nothing downstream could tell.
 *
 * ## WHAT CHANGED, AND WHY THE SWEEP GOT STRONGER RATHER THAN SHORTER
 *
 * This file fired on the browser test that measures where the panel sits, which switched the
 * control on with the prop so it had something to measure. That is the defect the sweep is
 * for, in its most sympathetic form, and the fix is not a third exemption: **the prop is
 * gone.** `DiagnosticDevSkip` reads {@link isDevPersistenceEnabled} at render and takes no
 * argument that could say otherwise, on `IntrusionEntryChip`'s and `WinterEntryChip`'s
 * precedent — one definition of "dev" per feature, read at the one place that renders. Its
 * tests set `VITE_DIAGNOSTIC_API_URL` instead, which is what they should have been measuring
 * anyway.
 *
 * So `MAY_NAME_THE_OVERRIDE` is EMPTY, and that is the claim rather than an oversight: the
 * component's own source is inside the swept population now, so re-declaring the prop fails
 * here even before a mount passes it. Two assertions carry what an empty list cannot — the
 * declared props are read back and pinned, so a rename to `show` or `force` cannot route
 * round a sweep keyed to one token; and the offender detector is fired at an injected mount,
 * because a sweep that passes by finding nothing looks exactly like a sweep that has stopped
 * looking.
 *
 * ## THE POPULATION IS THE TRACKED TREE
 *
 * Every tracked `.ts`/`.tsx` under the four code lanes, test files included: a test that
 * passed `enabled` is harmless in itself and is exactly the shape a production mount gets
 * copied from — as the one that fired here was. Floored twice — over the whole tree, and over
 * the files that MENTION the component — because "we swept 900 files and found nothing" is
 * also what a broken sweep reports. `git ls-files` sees TRACKED files only, so the floors are
 * what catch a run over a tree that does not yet contain its own subject.
 */

const repoRoot = resolveRepoRoot();

/** The component whose mounts are being swept. */
const COMPONENT = "DiagnosticDevSkip";

/** The prop that overrides the environment gate. */
const OVERRIDE = "enabled";

function trackedSources(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--", "apps", "packages", "engines", "services"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  )
    .split("\0")
    .filter((path) => /\.(ts|tsx)$/.test(path));
}

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/**
 * Files allowed to name the override at all, each with the reason.
 *
 * **IT IS EMPTY, and the emptiness is the claim.** There is no prop to declare and no test
 * that needs one, so every tracked file mentioning the component — the component itself
 * included — is swept. Two entries stood here while the prop existed: the component, for
 * declaring it, and `diagnosticDevSkipIsGated.test.tsx`, for driving it to prove the ladder
 * renders. Neither excuses anything now: the component reads the environment at render and
 * that test sets `VITE_DIAGNOSTIC_API_URL` to get in, which is the door a developer's browser
 * uses.
 *
 * The shape is kept rather than deleted because it is the one an exemption would have to take
 * if a future control genuinely needed one — named, reasoned, and asserted in both directions
 * below. What stops the emptiness itself from going unnoticed is the length assertion, which
 * is what makes a re-added exemption a decision somebody writes down.
 */
const MAY_NAME_THE_OVERRIDE: readonly { readonly path: string; readonly why: string }[] =
  [];

/** Every tracked source that mentions the component by name. */
function mentions(): { readonly path: string; readonly source: string }[] {
  return trackedSources()
    .map((path) => ({ path, source: read(path) }))
    .filter((file) => file.source.includes(COMPONENT));
}

describe("the diagnostic's dev skip cannot be mounted past its gate", () => {
  it("sweeps a real population", () => {
    const all = trackedSources();
    expect(all.length, "the source sweep found no files at all").toBeGreaterThan(200);

    const found = mentions().map((file) => file.path);
    /*
     * COMPOSITION AND NOT ONLY SIZE: a floor of four is met by any four files, and the set
     * the claim is about is a specific set — the component that reads the gate, the single
     * surface that mounts it, and **the two test files**, which are named here because the
     * offender this sweep actually caught was one of them. A test only falls inside the
     * population if it writes the component's NAME, so pinning both is what keeps the files
     * most likely to reintroduce the defect from drifting out of the set that is checked.
     */
    expect(found, "the sweep has lost the component, its mount or its tests").toEqual(
      expect.arrayContaining([
        "apps/web/src/diagnostic/DiagnosticDevSkip.tsx",
        "apps/web/src/diagnostic/DiagnosticRunner.tsx",
        "apps/web/src/diagnostic/diagnosticDevSkipIsGated.test.tsx",
        "apps/web/src/diagnostic/diagnosticDevSkipClearsTheExit.browser.test.tsx",
      ]),
    );
    expect(found.length, found.join(", ")).toBeGreaterThanOrEqual(4);
  });

  it("finds no mount that overrides the environment gate", () => {
    const exempt = new Set(MAY_NAME_THE_OVERRIDE.map((entry) => entry.path));
    const offenders = mentions()
      .filter((file) => !exempt.has(file.path))
      .filter((file) => new RegExp(`\\b${OVERRIDE}\\b`).test(file.source));

    expect(
      offenders.map((file) => file.path),
      `a mount of ${COMPONENT} names "${OVERRIDE}", which renders the control regardless of the environment`,
    ).toEqual([]);
  });

  /** The mount that ships, read rather than trusted. */
  it("mounts the control with the three props it needs and nothing else", () => {
    const runner = read("apps/web/src/diagnostic/DiagnosticRunner.tsx");
    const mount = /<DiagnosticDevSkip\b([\s\S]*?)\/>/.exec(runner);
    expect(
      mount,
      `${COMPONENT} is no longer mounted by the diagnostic runner`,
    ).not.toBeNull();

    const props = [...(mount?.[1] ?? "").matchAll(/(\w+)=/g)].map((match) => match[1]);
    expect(props.sort()).toEqual(["busy", "midRun", "onRun"]);
  });

  /**
   * **THERE IS NOTHING TO OVERRIDE**, which is the claim the sweep above cannot make.
   *
   * A token sweep is keyed to one word, so it is exactly as strong as the word: re-landing the
   * same affordance as `show`, `force` or `visible` would route round it while every line
   * above stayed green. So the declared props are read back and pinned. Three, all REQUIRED —
   * an optional prop is the shape of a defaulted gate, and the default is the whole hazard.
   *
   * Read from the props interface rather than from the destructure because `tsc --build` makes
   * the interface authoritative: a component cannot read a prop it has not declared.
   */
  it("declares three required props and nothing that could switch it on", () => {
    const source = read("apps/web/src/diagnostic/DiagnosticDevSkip.tsx");
    const block = /export interface DiagnosticDevSkipProps \{([\s\S]*?)\n\}/.exec(source);
    expect(
      block,
      `${COMPONENT} no longer declares a props interface to read`,
    ).not.toBeNull();

    const declared = [...(block?.[1] ?? "").matchAll(/readonly\s+(\w+)(\??)\s*:/g)];
    expect(
      declared.map((match) => match[1]).sort(),
      "the props are no longer the three the runner passes",
    ).toEqual(["busy", "midRun", "onRun"]);
    expect(
      declared.filter((match) => match[2] === "?").map((match) => match[1]),
      "an optional prop is a gate with a default, which is what a mount overrides",
    ).toEqual([]);

    // And the gate really is read where the control renders, so the absence above is an
    // absence of a way in rather than an absence of a gate.
    expect(source).toContain("if (!isDevPersistenceEnabled())");
  });

  /**
   * **THE DETECTOR, FIRED AT THE DEFECT.**
   *
   * The sweep passes by finding nothing, which is also exactly how it would look if it had
   * stopped looking — the ordinary way a guard in this tree goes wrong. So the expression it
   * uses is fired at every form the override has taken, plus the two shapes that must NOT trip
   * it. The last of those is what makes the empty exemption list possible at all: the gate's
   * own name contains the token in another case, and a matcher that saw it could never hold
   * the component's own file inside the population.
   *
   * **THE FIXTURES ARE WRITTEN OUT LITERALLY, AND THE FIRST VERSION OF THIS TEST WAS NOT.**
   * Composing them from `OVERRIDE` made the fixture and the matcher move together, so the one
   * defect a self-test is here for — the sweep keyed to the wrong token, looking for a prop
   * nothing declares — passed six green tests. Measured: with `OVERRIDE` set to `"enabledd"`
   * the templated version reported 6 passed, and the literals below fail.
   */
  it("detects an override when one is present, and is not fired by the gate's own name", () => {
    const names = (source: string): boolean => new RegExp(`\\b${OVERRIDE}\\b`).test(source);

    for (const source of [
      "<DiagnosticDevSkip enabled midRun={false} busy={false} onRun={run} />",
      "<DiagnosticDevSkip onRun={async () => null} enabled={true} />",
      "<DiagnosticDevSkip {...(flag === undefined ? {} : { enabled: flag })} />",
      ["<DiagnosticDevSkip", "  busy={busy}", "  enabled={true}", "/>"].join("\n"),
      "  readonly enabled?: boolean;",
      "  enabled = isDevPersistenceEnabled(),",
    ]) {
      expect(names(source), source).toBe(true);
    }

    for (const source of [
      "<DiagnosticDevSkip onRun={runScripted} midRun={midRun} busy={busy} />",
      "if (!isDevPersistenceEnabled()) {\n  return null;\n}",
    ]) {
      expect(names(source), source).toBe(false);
    }
  });

  /**
   * The exemption list, in both directions — and empty.
   *
   * The loop is vacuous today and is kept for the day it is not, so an exemption cannot be
   * added without the two directions coming with it. The length assertion is what the claim
   * actually rests on: it is the line that makes re-adding one a decision somebody writes
   * down, and it is asserted beside the fact that the component's own source is inside the
   * swept, non-exempt population — which is what an empty list buys and a two-entry list did
   * not.
   */
  it("keeps every exemption honest, and there are none", () => {
    const mentioning = new Set(mentions().map((file) => file.path));
    for (const entry of MAY_NAME_THE_OVERRIDE) {
      expect(
        mentioning.has(entry.path),
        `${entry.path} is a declared exception that no longer mentions ${COMPONENT}`,
      ).toBe(true);
      expect(
        new RegExp(`\\b${OVERRIDE}\\b`).test(read(entry.path)),
        `${entry.path} no longer names "${OVERRIDE}", so its exemption excuses nothing`,
      ).toBe(true);
      expect(entry.why.length, `${entry.path} has no reason recorded`).toBeGreaterThan(20);
    }
    expect(
      MAY_NAME_THE_OVERRIDE.length,
      "an exemption was re-added: the prop was removed so that none is needed",
    ).toBe(0);

    // The component and both of its tests are swept like anything else, so re-declaring the
    // prop fails the sweep above before any mount gets to pass it.
    const exempt = new Set<string>(MAY_NAME_THE_OVERRIDE.map((entry) => entry.path));
    for (const path of [
      "apps/web/src/diagnostic/DiagnosticDevSkip.tsx",
      "apps/web/src/diagnostic/diagnosticDevSkipIsGated.test.tsx",
      "apps/web/src/diagnostic/diagnosticDevSkipClearsTheExit.browser.test.tsx",
    ]) {
      expect(mentioning.has(path), `${path} has dropped out of the swept population`).toBe(
        true,
      );
      expect(exempt.has(path), `${path} is excused from the sweep`).toBe(false);
    }
  });
});
