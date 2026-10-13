import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **NOTHING IN THE TREE MOUNTS THE WINTER'S DEV SKIP WITHOUT ITS GATE.**
 *
 * `winterDevSkipIsGated.test.tsx` proves the DEFAULT is off on a deployed build. That is the
 * behaviour, and it leaves one hole: `WinterDevSkip` takes an optional `enabled` prop, mirroring
 * `devSessionStore`'s option of the same name, so a mount that passed `enabled` would render the
 * control regardless of the environment and every assertion in that file would stay green — it
 * drives the default, and a call site that overrides the default is invisible to it.
 *
 * So this closes the hole at the only place it can be closed: the call sites. A source sweep is the
 * right instrument because the claim is an ABSENCE ("no mount overrides the gate"), which is the one
 * shape a grep proves outright.
 *
 * ## THE POPULATION IS THE TRACKED TREE, NOT A LIST OF LIKELY FILES
 *
 * Every tracked `.ts`/`.tsx` source, test files included. Tests are deliberately IN scope: a test
 * that passed `enabled` would be harmless in itself, but it would be the shape a production mount
 * gets copied from, and the exemption list below is what makes each such use say so out loud. The
 * population is floored twice — over the whole tree and over the files that MENTION the component —
 * because "we swept 900 files and found nothing" is also exactly what a broken sweep reports.
 *
 * ## ⚑ THE OFFENDER RULE IS SCOPED TO MOUNTS, AND IT WAS SCOPED TO MENTIONS
 *
 * It flagged any file that named the component ANYWHERE and the word `enabled` anywhere else in
 * it. That is a proxy for "mounts it with the override", and the proxy failed the first time
 * another dev control was written to this one's shape: `OnboardingDevReplay.tsx` and
 * `CitySurface.tsx` both cite `WinterDevSkip` in prose as the precedent they follow, and both name
 * `enabled` because that control has a gate override of its own. Two false positives, measured, on
 * a diff that mounted nothing.
 *
 * **TWO PREDICATES CAME OUT OF THAT, and they are kept apart because they are two claims.** Both
 * were written independently against the same false positives, and merging them by picking one
 * would have lost a claim:
 *
 *  - {@link couldMount} is the OFFENDER population — imports it, writes it as JSX, or declares it.
 *    It is the wider of the two inside a file, on purpose, because the escape from a JSX-only
 *    pattern is one line long: `const C = WinterDevSkip; <C enabled />` is caught by the import
 *    clause and would walk straight past a mount pattern. The injection test below runs all three
 *    shapes plus the prose-only file that started this;
 *  - {@link mountedIn} is the narrower CALL-SITE set, JSX or `createElement`, and it exists for a
 *    different assertion: the tree is pinned to exactly ONE mount as a set equality. That is a
 *    claim the mention-scoped version never made, and the one that actually stops a second mount
 *    existing — a second mount fails whether or not it names the override.
 *
 * So the narrowing is paid for rather than merely taken, and the rule reaches strictly further at
 * the level that matters while it stops reading docblocks.
 *
 * ONE THING TO KNOW ABOUT `git ls-files`: it sees TRACKED files only, so a brand-new source that has
 * not been staged is outside the population. That is not hypothetical here — the floors above caught
 * it on this file's first run, when the component itself was still untracked and the sweep reported
 * a clean pass over a tree that did not contain its own subject.
 *
 * ## AND IT FAILS BOTH WAYS
 *
 * The exemptions are named with reasons and asserted in both directions: an entry that stops
 * mentioning the component fails, so a renamed or deleted file cannot sit here exempting nothing;
 * and a file that starts overriding the gate without being listed fails. The two together are what
 * keep an exemption from becoming permanent by neglect.
 */

const repoRoot = resolveRepoRoot();

/** The component whose mounts are being swept. */
const COMPONENT = "WinterDevSkip";

/** The prop that overrides the environment gate. */
const OVERRIDE = "enabled";

/** The one surface that mounts it, and the whole of what this rule allows. */
const THE_ONE_MOUNT = "apps/web/src/winter/HardWinterSurface.tsx";

/**
 * RENDERS the component, in either form. Naming it in a comment is not mounting it, which is the
 * distinction this rule turns on; see the header for the two false positives that established it.
 */
const MOUNTS = new RegExp(`<${COMPONENT}\\b|createElement\\(\\s*${COMPONENT}\\b`);

function trackedSources(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--", "apps", "packages", "engines", "services"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    },
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
 * `WinterDevSkip.tsx` declares the prop and documents it; nothing else in the tree may so much as
 * mention it beside a mount of this component. There is deliberately no production entry here: the
 * one mount that ships passes `winter`, `pending` and `onSkipped` and nothing else, which is what
 * makes the gate unroutable rather than merely defaulted.
 */
const MAY_NAME_THE_OVERRIDE: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "apps/web/src/winter/WinterDevSkip.tsx",
    why: "declares the prop and carries the argument for why the default is the shipped gate",
  },
];

/** Every tracked source that mentions the component by name, prose included. */
function mentions(): { readonly path: string; readonly source: string }[] {
  return trackedSources()
    .map((path) => ({ path, source: read(path) }))
    .filter((file) => file.source.includes(COMPONENT));
}

/** Every tracked source that actually RENDERS it. The call sites, derived from the tree. */
function mountedIn(): string[] {
  return mentions()
    .filter((file) => MOUNTS.test(file.source))
    .map((file) => file.path);
}

/**
 * Whether a source could mount the component at all: it imports it, or it writes it as JSX, or
 * it declares it.
 *
 * ## ⚑ WHY THE OFFENDER SWEEP IS SCOPED TO THIS AND NOT TO {@link mentions}
 *
 * It was scoped to {@link mentions}, i.e. to any tracked source containing the STRING
 * `WinterDevSkip`, and that population is wider than the behaviour the guard is about. A file
 * that names this component in a docblock — *"`WinterDevSkip`'s shape, and the same request
 * behind it"* — cannot mount anything, and if that same file happens to have an `enabled` prop of
 * its own it was reported as *"a mount of WinterDevSkip [that] names enabled"*, which is a false
 * statement about a real file. That is what happened: `apps/web/src/catchup/` cites this control
 * as the precedent it was built on and has its own dev hatch with its own `enabled` prop, and
 * three of its files were named as offenders.
 *
 * **`.cursor/rules/qa-verification.mdc`'s rule is to scope a guard by the behaviour rather than
 * by the implementation, and this is the same mistake in the other direction: scoped by a string,
 * the population included files that cannot exhibit the defect.** The narrowing is one clean
 * predicate over the same tree — a source that neither imports nor writes the component cannot
 * mount it — and it is the kind of change the rule says owes a demonstrated failure, so the
 * injection below is what discharges that.
 *
 * The BREADTH inside the population is deliberately unchanged: within a file that can mount the
 * component, any occurrence of the override anywhere still counts, exactly as before. So a
 * pathological `const C = WinterDevSkip; <C enabled />` is caught by the import clause.
 */
function couldMount(source: string): boolean {
  return (
    new RegExp(`from\\s+["'][^"']*${COMPONENT}["']`).test(source) ||
    new RegExp(`\\{[^}]*\\b${COMPONENT}\\b[^}]*\\}\\s*from`).test(source) ||
    source.includes(`<${COMPONENT}`) ||
    new RegExp(`(function|const|class)\\s+${COMPONENT}\\b`).test(source)
  );
}

describe("the winter's dev skip cannot be mounted past its gate", () => {
  it("sweeps a real population", () => {
    const all = trackedSources();
    // A floor on the tree, so a wrong cwd or an empty `git ls-files` reads as a failure.
    expect(all.length, "the source sweep found no files at all").toBeGreaterThan(200);

    const found = mentions().map((file) => file.path);
    /*
     * COMPOSITION AND NOT ONLY SIZE. Both files the claim is about are named, because a floor of
     * two is satisfied by any two files and the pair that matters is a specific pair: the component
     * that declares the prop, and the single surface that mounts it. If the sweep ever stops seeing
     * either one, every assertion after this becomes a pass over the wrong set.
     *
     * The floor is 2 rather than higher on purpose. The test files driving this control import the
     * lowercase MODULE and press test ids, so they never write the component's name — which is
     * correct, and means a floor written for "and its tests" would have been a floor nothing meets.
     */
    expect(found, "the sweep has lost the component or its mount").toEqual(
      expect.arrayContaining([
        "apps/web/src/winter/WinterDevSkip.tsx",
        "apps/web/src/winter/HardWinterSurface.tsx",
      ]),
    );
    expect(found.length, found.join(", ")).toBeGreaterThanOrEqual(2);
  });

  /**
   * ONE CALL SITE IN THE WHOLE TREE, asserted as a set.
   *
   * This is what pays for scoping the offender rule below to mounts, and it is a claim the
   * mention-scoped version never made: a SECOND mount fails here whether or not it names the
   * override, so "no mount overrides the gate" can no longer be satisfied by a mount the sweep
   * had not thought to look at. The floor is under the set equality because an empty derived set
   * would otherwise satisfy a `toEqual` against nothing.
   */
  it("is mounted in exactly one place", () => {
    const mounts = mountedIn();
    expect(mounts.length, "nothing in the tree mounts the control at all").toBeGreaterThan(
      0,
    );
    expect(
      mounts,
      `${COMPONENT} has gained a call site: every mount has to be argued, not just the gate`,
    ).toEqual([THE_ONE_MOUNT]);
  });

  it("finds no mount that overrides the environment gate", () => {
    const exempt = new Set(MAY_NAME_THE_OVERRIDE.map((entry) => entry.path));
    const canMount = mentions().filter((file) => couldMount(file.source));
    /*
     * A FLOOR ON THE NARROWED POPULATION, and it is the assertion that makes the narrowing safe
     * rather than merely smaller. Scoped to files that can mount the component, the population
     * has to still contain the two that matter — the declaration and the one shipping mount —
     * or the sweep below is a pass over the wrong set, which is exactly what a too-narrow filter
     * looks like from outside.
     */
    expect(canMount.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "apps/web/src/winter/WinterDevSkip.tsx",
        "apps/web/src/winter/HardWinterSurface.tsx",
      ]),
    );

    const offenders = canMount
      .filter((file) => !exempt.has(file.path))
      .filter((file) => new RegExp(`\\b${OVERRIDE}\\b`).test(file.source));

    // A FLOOR ON WHAT WAS ACTUALLY EXAMINED, because "no mount overrides the gate" is trivially
    // true of no mounts, and the filter above is now narrow enough that a typo in it would
    // silently examine nothing.
    expect(
      mountedIn().length,
      "the sweep examined no mounts, so its absence proves nothing",
    ).toBeGreaterThan(0);
    expect(
      offenders.map((file) => file.path),
      `a mount of ${COMPONENT} names "${OVERRIDE}", which renders the control regardless of the environment`,
    ).toEqual([]);
  });

  /**
   * THE NARROWING, INJECTED. `.cursor/rules/qa-verification.mdc`: *"loosening an assertion to
   * make a feature possible may well leave it catching the defect it was written for, but that is
   * an argument, and an assertion exists so that nobody has to take the argument on trust."*
   *
   * So the defect is injected as source text and {@link couldMount} plus the override regex are
   * run over it exactly as the sweep runs them. Three shapes have to be caught and one has to be
   * let through, and it is the last one that is the point: the prose-only file is the case the
   * old population got wrong.
   */
  it("still catches every shape of mount that could override the gate", () => {
    const caught = (source: string): boolean =>
      couldMount(source) && new RegExp(`\\b${OVERRIDE}\\b`).test(source);

    // 1. The ordinary mount, which is the defect the guard was written for.
    expect(
      caught(
        `import { ${COMPONENT} } from "./${COMPONENT}";\n` +
          `export const S = () => <${COMPONENT} winter={w} enabled />;`,
      ),
    ).toBe(true);
    // 2. A default-style import path, so the clause is not pinned to one import shape.
    expect(
      caught(
        `import ${COMPONENT} from "../winter/${COMPONENT}";\nconst x = { enabled: true };`,
      ),
    ).toBe(true);
    // 3. The pathological alias, which is why the import clause exists as well as the JSX one.
    expect(
      caught(
        `import { ${COMPONENT} } from "./${COMPONENT}";\n` +
          `const C = ${COMPONENT};\nexport const S = () => <C enabled />;`,
      ),
    ).toBe(true);
    // 4. AND THE CASE THE OLD POPULATION GOT WRONG: prose naming the component, beside an
    //    unrelated `enabled` prop of the file's own. Nothing here can mount anything.
    expect(
      caught(
        `/** ${COMPONENT}'s shape, and the same request behind it. */\n` +
          `export function Other({ enabled = gate() }) { return enabled ? <p /> : null; }`,
      ),
    ).toBe(false);
  });

  /**
   * THE MOUNT THAT SHIPS, read rather than trusted. The props it passes are enumerated, so adding a
   * fourth is a decision somebody has to make here as well as there.
   */
  it("mounts the control with the three props it needs and nothing else", () => {
    const surface = read("apps/web/src/winter/HardWinterSurface.tsx");
    const mount = /<WinterDevSkip\b([^>]*)\/>/.exec(surface);
    expect(
      mount,
      `${COMPONENT} is no longer mounted by the winter's surface`,
    ).not.toBeNull();

    const props = [...(mount?.[1] ?? "").matchAll(/(\w+)=/g)].map((match) => match[1]);
    expect(props.sort()).toEqual(["onSkipped", "pending", "winter"]);
  });

  /** The exemption list, in both directions. */
  it("keeps every exemption honest", () => {
    const mentioning = new Set(mentions().map((file) => file.path));
    for (const entry of MAY_NAME_THE_OVERRIDE) {
      // An entry that has stopped being about this component is exempting nothing.
      expect(
        mentioning.has(entry.path),
        `${entry.path} is a declared exception that no longer mentions ${COMPONENT}`,
      ).toBe(true);
      // And it really does name the thing it is excused for, so a file that stopped declaring the
      // prop cannot go on holding a licence to.
      expect(
        new RegExp(`\\b${OVERRIDE}\\b`).test(read(entry.path)),
        `${entry.path} no longer names "${OVERRIDE}", so its exemption excuses nothing`,
      ).toBe(true);
      expect(entry.why.length, `${entry.path} has no reason recorded`).toBeGreaterThan(20);
    }
    // The list stays SHORT on purpose: the whole claim is that one file declares the prop and no
    // other file mentions it. A list that grew would be the claim quietly weakening.
    expect(MAY_NAME_THE_OVERRIDE.length).toBe(1);
  });
});
