import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **NOTHING CAN FORCE THE ROUTE PANEL PAST ITS ENVIRONMENT POLICY.**
 *
 * Sibling of `ceremonyDevSkipStaysDev.test.ts` and `diagnosticDevSkipStaysDev.test.ts`, same
 * defect and the same shape, so their argument is not restated at length: a behavioural test can
 * only ever drive the DEFAULT of an override prop, and a mount that passes one supersedes the
 * environment gate while every such test stays green. The hole is closeable only at the call
 * sites, and the claim is an ABSENCE, which is the one shape a source sweep proves outright.
 *
 * ## THE POPULATION IS SCOPED BY THE BEHAVIOUR, NOT BY THE PROP
 *
 * Its two siblings sweep for one named token, because their components declare one optional flag
 * between them and a rename is the hazard. **This component declares no props interface at all**,
 * so there is no token to key on and a token sweep here would be a guard measuring nothing —
 * exactly the shape `.cursor/rules/qa-verification.mdc` records thirteen instances of. What
 * would have to be true for the defect to be possible is that a mount passes SOMETHING, so the
 * sweep is for any attribute on any mount, whatever it is called. A prop named `show`, `force`
 * or `visible` is caught by the same line as one named `enabled`.
 *
 * `tsc --build` would also reject an undeclared prop, and that is why this file asserts the
 * PROPLESSNESS rather than only the mounts: the type error is only a wall while the interface
 * stays absent, and re-adding an interface is one line in a pull request nobody reads twice.
 *
 * ## WHAT THIS CONTROL COULD LEAK, NAMED SO THE GUARD IS NOT OVERSOLD
 *
 * It grades nothing, writes nothing and holds no state but a fold. The explicit frontend-only
 * demo intentionally renders product-safe preview links; ordinary production still renders
 * nothing, and local development retains the presenter console. A passed prop could erase that
 * distinction, so the propless mount remains the behavior this guard protects.
 *
 * ## AND IT PINS THE STYLESHEET IT MUST NOT HAVE
 *
 * `DevEraSkip.tsx` records the trap and it is measured rather than theoretical: **Vite emits an
 * imported stylesheet as an asset whether or not the importing module survives tree-shaking**,
 * so a dev-only `.css` file ships to a learner's build even when the component that imports it
 * does not. This control's rules are inline styles for that reason, and "there is no CSS import"
 * is a source property, which is the kind this file is for.
 */

const repoRoot = resolveRepoRoot();

/** The component whose mounts are being swept. */
const COMPONENT = "DemoRoutePanel";

const COMPONENT_PATH = "apps/web/src/demo/DemoRoutePanel.tsx";
const MOUNT_PATH = "apps/web/src/TitleScreen.tsx";
const GATE_TEST_PATH = "apps/web/src/demo/demoRoutePanel.test.tsx";

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

/** Every tracked source that mentions the component by name. */
function mentions(): { readonly path: string; readonly source: string }[] {
  return trackedSources()
    .map((path) => ({ path, source: read(path) }))
    .filter((file) => file.source.includes(COMPONENT));
}

/**
 * The attributes on every `<DemoRoutePanel …>` in one source, mount by mount.
 *
 * Both spellings, because `<DemoRoutePanel />` and `<DemoRoutePanel>…</DemoRoutePanel>` are the
 * same mount and only the first is self-closing.
 *
 * **It matches on the NAMES rather than on `name=`**, and that is not a tidiness choice: the
 * first version of this function looked for `name=` and reported `<DemoRoutePanel enabled />` —
 * the shortest spelling of the exact defect, and the one a JSX author reaches for first — as
 * carrying no props at all. The values are stripped instead, so whatever is left is the names,
 * bare booleans included. A spread (`{...props}`) survives neither pass and is caught separately
 * below, because it is the one shape that passes props without naming one.
 */
function mountAttributes(source: string): string[][] {
  return [...source.matchAll(new RegExp(`<${COMPONENT}\\b([^>]*?)/?>`, "g"))].map(
    (mount) => {
      const names = (mount[1] ?? "")
        .replace(/=\s*\{[^}]*\}/g, " ")
        .replace(/=\s*"[^"]*"/g, " ")
        .replace(/=\s*'[^']*'/g, " ")
        .replace(/\{[^}]*\}/g, " ");
      return [...names.matchAll(/[A-Za-z_$][\w$]*/g)].map((attribute) => attribute[0]);
    },
  );
}

/**
 * Files allowed to pass the component something, each with the reason.
 *
 * **IT IS EMPTY, and the emptiness is the claim.** The shape is kept rather than deleted because
 * it is the one an exemption would have to take if a future mount genuinely needed a prop —
 * named, reasoned, and asserted in both directions below. What stops the emptiness itself going
 * unnoticed is the length assertion, which makes a re-added exemption a decision somebody writes
 * down.
 */
const MAY_PASS_A_PROP: readonly { readonly path: string; readonly why: string }[] = [];

describe("the route panel cannot be mounted past its environment policy", () => {
  it("sweeps a real population", () => {
    expect(
      trackedSources().length,
      "the source sweep found no files at all",
    ).toBeGreaterThan(200);
    const found = mentions().map((file) => file.path);
    /*
     * COMPOSITION AND NOT ONLY SIZE: a floor of three is met by any three files, and the set the
     * claim is about is a specific set — the component that reads the gate, the single surface
     * that mounts it, and the test file, which is named because the offender the diagnostic's
     * sweep actually caught was a test. A test only falls inside this population if it writes
     * the component's NAME, so pinning it keeps the file most likely to reintroduce the defect
     * inside the set that is checked.
     */
    expect(found, "the sweep has lost the component, its mount or its test").toEqual(
      expect.arrayContaining([COMPONENT_PATH, MOUNT_PATH, GATE_TEST_PATH]),
    );
    expect(found.length, found.join(", ")).toBeGreaterThanOrEqual(3);
  });

  /** And the mounts really are found, so "no mount passes a prop" is not vacuous. */
  it("finds the mount it is sweeping", () => {
    const mounts = mentions().flatMap((file) => mountAttributes(file.source));
    expect(
      mounts.length,
      `no <${COMPONENT}> mount was found anywhere in the tree`,
    ).toBeGreaterThan(0);
    expect(
      mountAttributes(read(MOUNT_PATH)).length,
      `${MOUNT_PATH} no longer mounts it`,
    ).toBe(1);
  });

  it("finds no mount that passes it anything at all", () => {
    const exempt = new Set(MAY_PASS_A_PROP.map((entry) => entry.path));
    const offenders = mentions()
      .filter((file) => !exempt.has(file.path))
      .flatMap((file) =>
        mountAttributes(file.source)
          .filter((attributes) => attributes.length > 0)
          .map((attributes) => `${file.path}: ${attributes.join(", ")}`),
      );
    expect(
      offenders,
      `a mount of ${COMPONENT} passes a prop, which is how an environment gate gets overridden`,
    ).toEqual([]);
  });

  it("finds no mount that spreads an object into it", () => {
    const offenders = mentions()
      .filter((file) =>
        new RegExp(`<${COMPONENT}\\b[^>]*\\{\\s*\\.\\.\\.`).test(file.source),
      )
      .map((file) => file.path);
    expect(offenders, "a spread passes props without naming one").toEqual([]);
  });

  /**
   * **THERE IS NOTHING TO OVERRIDE**, which is the claim the mount sweep above cannot make. A
   * mount sweep is exactly as strong as today's mounts; the propless signature is what makes the
   * gate unroutable rather than merely unrouted.
   */
  it("declares no props at all, so there is nothing a mount could pass", () => {
    const source = read(COMPONENT_PATH);
    expect(
      new RegExp(`interface ${COMPONENT}Props`).test(source),
      `${COMPONENT} has grown a props interface; a prop is a gate with a default`,
    ).toBe(false);
    const signature = new RegExp(`export function ${COMPONENT}\\(([^)]*)\\)`).exec(source);
    expect(signature, `${COMPONENT} is no longer exported as a function`).not.toBeNull();
    expect(
      (signature?.[1] ?? "").trim(),
      "the component takes a parameter, which is a prop by another name",
    ).toBe("");
  });

  /** The gate itself, read out of the source rather than trusted. */
  it("reads its gate where it renders", () => {
    const source = read(COMPONENT_PATH);
    expect(source).toContain("const publicDemo = isDemoMode();");
    expect(source).toContain("if (!publicDemo && !isDevPersistenceEnabled())");
  });

  /**
   * **NO STYLESHEET, BECAUSE A DEV-ONLY ONE WOULD SHIP.** Asserted on the module's own imports
   * rather than on a build, so it fails in the pull request that adds the import rather than in
   * whichever one next runs a bundle.
   */
  it("imports no stylesheet of its own", () => {
    for (const path of [COMPONENT_PATH, "apps/web/src/demo/demoRoutes.ts"]) {
      const styleImports = [...read(path).matchAll(/^import\s+"([^"]*\.css)";$/gm)].map(
        (match) => match[1],
      );
      expect(
        styleImports,
        `${path}: a dev-only stylesheet is emitted as an asset even when its component is tree-shaken out`,
      ).toEqual([]);
    }
  });

  /**
   * **THE DETECTOR, FIRED AT THE DEFECT.**
   *
   * The sweep passes by finding nothing, which is also exactly how it would look if it had
   * stopped looking — the ordinary way a guard in this tree goes wrong. So the expression it
   * uses is fired at every form a passed prop can take, plus the two shapes that must NOT trip
   * it. The fixtures are written out literally, on the sibling sweep's hard-won lesson:
   * composing them from the matcher makes the two move together, so a sweep keyed to the wrong
   * shape passes every case.
   */
  it("detects a passed prop when one is present, and is not fired by a bare mount", () => {
    for (const source of [
      "<DemoRoutePanel enabled />",
      "<DemoRoutePanel enabled={true} />",
      "<DemoRoutePanel show={flag} />",
      "<DemoRoutePanel force />",
      ["<DemoRoutePanel", "  visible={true}", "/>"].join("\n"),
      "<DemoRoutePanel onJump={jump}></DemoRoutePanel>",
    ]) {
      expect(
        mountAttributes(source).some((attributes) => attributes.length > 0),
        source,
      ).toBe(true);
    }

    for (const source of [
      "<DemoRoutePanel />",
      "<DemoRoutePanel></DemoRoutePanel>",
      "import { DemoRoutePanel } from './demo/DemoRoutePanel';",
    ]) {
      expect(
        mountAttributes(source).some((attributes) => attributes.length > 0),
        source,
      ).toBe(false);
    }

    // The bare boolean is the shape that got away first, so what it resolves to is pinned
    // rather than left to `.some(length > 0)` — which would go on passing if the name came back
    // as the empty string.
    expect(mountAttributes("<DemoRoutePanel enabled />")).toEqual([["enabled"]]);
    expect(mountAttributes("<DemoRoutePanel />")).toEqual([[]]);
    expect(/<DemoRoutePanel\b[^>]*\{\s*\.\.\./.test("<DemoRoutePanel {...props} />")).toBe(
      true,
    );
    expect(/<DemoRoutePanel\b[^>]*\{\s*\.\.\./.test("<DemoRoutePanel />")).toBe(false);
  });

  /**
   * The exemption list, in both directions — and empty. The loop is vacuous today and is kept
   * for the day it is not, so an exemption cannot be added without the two directions coming
   * with it.
   */
  it("keeps every exemption honest, and there are none", () => {
    const mentioning = new Set(mentions().map((file) => file.path));
    for (const entry of MAY_PASS_A_PROP) {
      expect(
        mentioning.has(entry.path),
        `${entry.path} is a declared exception that no longer mentions ${COMPONENT}`,
      ).toBe(true);
      expect(
        mountAttributes(read(entry.path)).some((attributes) => attributes.length > 0),
        `${entry.path} passes nothing, so its exemption excuses nothing`,
      ).toBe(true);
      expect(entry.why.length, `${entry.path} has no reason recorded`).toBeGreaterThan(20);
    }
    expect(
      MAY_PASS_A_PROP.length,
      "an exemption was added: the props were declined so that none is needed",
    ).toBe(0);

    for (const path of [COMPONENT_PATH, MOUNT_PATH, GATE_TEST_PATH]) {
      expect(mentioning.has(path), `${path} has dropped out of the swept population`).toBe(
        true,
      );
      expect(
        new Set<string>(MAY_PASS_A_PROP.map((entry) => entry.path)).has(path),
        `${path} is excused from the sweep`,
      ).toBe(false);
    }
  });
});
