import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **NO CRISIS'S DEV SKIP IS MOUNTED WITH ITS ENVIRONMENT GATE OVERRIDDEN.**
 *
 * `test/winterDevSkipStaysDev.test.ts` makes this claim about `WinterDevSkip`, by name, and its
 * reasoning is right: a component with an optional `enabled` prop can be rendered on a learner's
 * build by a call site that passes one, and every behavioural test of the DEFAULT stays green
 * while that happens, because it drives the default.
 *
 * **This guard exists because that population is the implementation and the claim is about a
 * behaviour.** `.cursor/rules/qa-verification.mdc` records the shape directly: *"define a guard's
 * population by who exhibits the behaviour, not by where the behaviour is implemented […] a
 * surface can carry a mechanic without importing a line of it."* Era nine's `IntrusionDevSkip`
 * is a separate component with its own copy of the same prop and the same gate, so it exhibits
 * the behaviour and falls outside a guard scoped to era one's name — measured rather than
 * argued: the winter's sweep passes over a tree in which era nine's control could be mounted
 * with `enabled` on every screen.
 *
 * Eras four and six are building their surfaces now and will have their own. **They are covered
 * by this the day they land, with no edit here**, which is the point of deriving the population.
 *
 * **AND THE POPULATION HAS ALREADY OUTGROWN THE WORD "CRISIS" IN THIS FILE'S NAME, which is the
 * derivation earning its keep a fourth time.** `city/onboarding/OnboardingDevReplay.tsx` is not a
 * crisis skip at all — it reopens the first-run advisor at a chosen moment — and it declares the
 * same prop defaulted to the same gate, so a call site could put it on a learner's screen in
 * exactly the way this guard exists to prevent. It was in the population the moment it landed and
 * the count below went red on it, with no edit to the filter. The file name is left alone because
 * renaming it would cost the history above; the population is the definition, not the name.
 *
 * ## THE POPULATION IS DERIVED, AND IT IS DERIVED FROM THE PROP RATHER THAN FROM THE NAME
 *
 * A component belongs here when it declares an `enabled` prop that defaults to a dev gate — not
 * when it is called `*DevSkip`. That is the behaviour: *"a control whose visibility a call site
 * can turn on."* Deriving from the name would be the narrower filter all over again, one era
 * later, and a crisis whose skip control is called `SuccessionShortcut` would be outside it while
 * doing exactly the same thing.
 *
 * The derivation is floored twice, over the tree and over the population, because *"we swept 900
 * files and found nothing"* is also exactly what a broken sweep reports.
 */

const repoRoot = resolveRepoRoot();

/** The gate a dev control's `enabled` prop defaults to. */
const GATE = "isDevPersistenceEnabled";

/** The prop that overrides it. */
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

const sources = trackedSources();

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

const textOf = new Map<string, string>(sources.map((path) => [path, read(path)]));

/**
 * **BY BEHAVIOUR: every component a call site could switch on.**
 *
 * A source qualifies when it declares an `enabled` prop AND defaults it to the repository's dev
 * gate. Both halves matter: a component with an `enabled` prop and no gate is an ordinary
 * control, and a file that merely mentions the gate is a consumer rather than a switchable one.
 */
const switchable = sources.filter((path) => {
  const text = textOf.get(path) ?? "";
  return (
    !/\.test\.(ts|tsx)$/.test(path) &&
    text.includes(`${OVERRIDE} = ${GATE}()`) &&
    /readonly\s+enabled\?:/.test(text)
  );
});

/** The component each qualifying source exports, taken from its own `export function`. */
function componentOf(path: string): string {
  const found = /export function (\w+)\(/.exec(textOf.get(path) ?? "");
  if (!found) {
    throw new Error(`${path} declares the prop but exports no component`);
  }
  return found[1] as string;
}

/**
 * One self-closing JSX mount of a component, props captured.
 *
 * **`[^<]` and not `[^>]`, which is the version this was written as and the version that
 * measured nothing.** A prop value can contain `>` — `onSkipped={() => {}}` does — so a props
 * class that stopped at the first `>` never reached the closing `/>` and the sweep matched no
 * mount at all. It reported a clean pass over a tree that contained an injected offender, which
 * is the exact shape `.cursor/rules/qa-verification.mdc` catalogues; the detector self-test
 * below is what caught it and is why one is here.
 */
function mountPattern(component: string): RegExp {
  return new RegExp(`<${component}\\b([^<]*?)/>`, "gs");
}

/**
 * Whether a mount's props hand the control its own visibility.
 *
 * **Both `enabled=` and `enabled:`**, because a spread is the same override by another route:
 * `{...(flag === undefined ? {} : { enabled: flag })}` is a conditional prop, and a sweep that
 * only knew the `=` form would have missed it. That form is not hypothetical — it is what era
 * nine's surface did until this guard was pointed at it.
 */
function overridden(props: string): boolean {
  return new RegExp(`\\b${OVERRIDE}\\s*[=:]`).test(props);
}

/**
 * **THE ONE PLACE EACH CONTROL'S OWN PROP MAY BE WRITTEN: its own declaration.**
 *
 * Named per component with a reason, and asserted in BOTH directions below, which is what makes
 * an exemption provable rather than assumed.
 */
const MAY_DECLARE_THE_PROP: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "apps/web/src/winter/WinterDevSkip.tsx",
    why:
      "the component that declares the prop and documents why it exists, mirroring " +
      "devSessionStore's option of the same name. Its mounts are swept below like any other.",
  },
  {
    path: "apps/web/src/succession/SuccessionDevSkip.tsx",
    why:
      "era four's own control, and the second arrival to fail this list on landing rather " +
      "than after someone remembered to widen it. Three of the four in-scope crises now " +
      "ship a skip, none of them importing another's, which is the case for deriving the " +
      "population from the prop instead of from the one era it started with.",
  },
  {
    path: "apps/web/src/city/onboarding/OnboardingDevReplay.tsx",
    why:
      "not a crisis skip at all: it reopens the first-run advisor at a chosen moment. It is " +
      "here because it declares the same prop defaulted to the same gate, so a call site " +
      "could put it on a learner's screen in the one way this guard exists to prevent — and " +
      "because it is the third arrival to fail this list on landing rather than after " +
      "somebody remembered, which is the case for a population derived from the behaviour " +
      "rather than from the word in this file's name.",
  },
];

describe("every crisis dev skip is behind the environment gate at every mount", () => {
  it("derives a population from the behaviour, with floors under both ends", () => {
    // The tree, so a wrong cwd or an empty `git ls-files` reads as a failure rather than as a
    // clean sweep. `git ls-files` sees TRACKED files only, which is how a sweep comes to pass
    // over a tree that does not contain its own subject.
    expect(sources.length).toBeGreaterThan(400);
    // And the population, so a filter that broke into matching nothing fails here.
    expect(switchable.length).toBeGreaterThanOrEqual(2);
    expect(switchable).toContain("apps/web/src/winter/WinterDevSkip.tsx");
    // COMPOSITION, not only size: the sweep is genuinely wider than the one era it started
    // from, so a population that drifted back to era one's alone fails rather than passing on
    // a count two copies of the winter would clear.
    expect(
      switchable.filter((path) => !path.includes("/winter/")).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("finds no mount that passes the override", () => {
    const declared = new Set(MAY_DECLARE_THE_PROP.map((entry) => entry.path));
    const violations: string[] = [];

    for (const control of switchable) {
      const component = componentOf(control);
      // Every JSX mount of the component, anywhere in the tree, tests included. A test that
      // passed the override would be harmless in itself and would be the shape a production
      // mount gets copied from.
      for (const path of sources) {
        if (declared.has(path)) {
          continue;
        }
        for (const found of (textOf.get(path) ?? "").matchAll(mountPattern(component))) {
          if (overridden(found[1] ?? "")) {
            violations.push(`${path} mounts <${component}> with ${OVERRIDE}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("detects an override when one is present, so the sweep above is discriminating", () => {
    // The sweep passes by finding nothing, which is also exactly how it would look if the
    // matcher had been broken — and it HAD been. This pins it against the shape of the defect
    // in every form the defect has taken, including the two that got past the first version:
    // a prop value containing `>`, and a conditional spread that writes `enabled:`.
    const props = (source: string): string =>
      [...source.matchAll(mountPattern("IntrusionDevSkip"))]
        .map((found) => found[1] ?? "")
        .join("");

    const plain = "<IntrusionDevSkip crisis={crisis} onSkipped={take} enabled={true} />";
    const withArrow =
      "<IntrusionDevSkip crisis={crisis} onSkipped={() => {}} enabled={true} />";
    const spread =
      "<IntrusionDevSkip crisis={crisis} {...(flag === undefined ? {} : { enabled: flag })} />";
    const clean = "<IntrusionDevSkip crisis={crisis} onSkipped={() => {}} />";
    const multiline = [
      "<IntrusionDevSkip",
      "  crisis={crisis}",
      "  onSkipped={takeSkipped}",
      "  enabled={true}",
      "/>",
    ].join("\n");

    for (const source of [plain, withArrow, spread, multiline]) {
      expect(props(source), source).not.toBe("");
      expect(overridden(props(source)), source).toBe(true);
    }
    expect(props(clean)).not.toBe("");
    expect(overridden(props(clean))).toBe(false);
  });

  it("keeps every exemption a real file that still needs excusing", () => {
    // Direction one: a renamed or deleted control cannot sit here exempting nothing.
    // Direction two: a file that stops declaring the prop has stopped needing the exemption.
    expect(MAY_DECLARE_THE_PROP.length).toBe(switchable.length);
    for (const entry of MAY_DECLARE_THE_PROP) {
      expect(switchable, `${entry.path} no longer declares a gated enabled prop`).toContain(
        entry.path,
      );
      expect(entry.why.length).toBeGreaterThan(80);
    }
  });
});
