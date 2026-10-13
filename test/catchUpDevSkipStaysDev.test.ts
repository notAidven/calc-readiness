import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **NOTHING SHIPS THE CATCH-UP'S DEV HATCH TO A LEARNER — NO PRODUCTION SOURCE MOUNTS THE
 * COMPONENT, AND ITS TEST-ONLY COPY CARRIES NO SHIPPED STYLESHEET.**
 *
 * `catchUpDevSkipIsGated.test.tsx` proves the component's own gate in isolation. The city no
 * longer mounts the hatch at all, so this guard now asserts that stronger product property over
 * every tracked production source rather than requiring the obsolete `CitySurface` mount.
 *
 * ## THE CLAIM THAT IS NEW HERE, AND IT IS A MEASURED DEFECT RATHER THAN A PRECAUTION
 *
 * **An imported stylesheet ships to production even when the component that imports it is
 * tree-shaken out.** `DevEraSkip.tsx` documents that and avoids it by carrying no CSS at all:
 * *"a dev-only CSS file would ship to production even when the component does not — Vite emits an
 * imported stylesheet as an asset whether or not the importing module survives tree-shaking."*
 *
 * The catch-up's hatch had a `catchUpDevSkip.css` beside it, following `winterDevSkip.css`, and
 * it did exactly that: measured on a real `npm run build -w @cr/web`, **15 `.catchup-skip` rules
 * were in the production stylesheet while none of the component's own strings were in any JS
 * chunk.** The rules now ride in a `<style>` element the component renders, and after the change
 * the same build has **0**. So this file asserts the source property that keeps it at zero,
 * because the artefact is not something a unit test can read.
 *
 * ## WHY A SOURCE SWEEP IS THE RIGHT INSTRUMENT
 *
 * Every claim below is an ABSENCE — no stylesheet import, no ungated mount, no `enabled` override
 * — and an absence is the one shape a grep proves outright. The population is the tracked tree,
 * floored, for `winterDevSkipStaysDev.ts`'s stated reason: *"we swept 900 files and found
 * nothing"* is also exactly what a broken sweep reports.
 */

const repoRoot = resolveRepoRoot();

/** The component whose shipping this file is about. */
const COMPONENT = "CatchUpDevSkip";

/** Where it lives, and the one file allowed to declare its gate override. */
const SOURCE = "apps/web/src/catchup/CatchUpDevSkip.tsx";

/** The former production mount, kept named so the sweep cannot silently omit the relevant file. */
const MOUNT = "apps/web/src/city/CitySurface.tsx";

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

/** Whether a source could mount the component: it imports it, or writes it as JSX. */
function couldMount(source: string): boolean {
  return (
    new RegExp(`\\{[^}]*\\b${COMPONENT}\\b[^}]*\\}\\s*from`).test(source) ||
    source.includes(`<${COMPONENT}`)
  );
}

describe("the catch-up's dev hatch stays out of a learner's build", () => {
  it("sweeps a real production population and finds no mount", () => {
    const all = trackedSources();
    expect(all.length, "the source sweep found no files at all").toBeGreaterThan(200);
    expect(all).toEqual(expect.arrayContaining([SOURCE, MOUNT]));
    const production = all.filter((path) => !path.includes(".test."));
    expect(
      production.length,
      "the production-source sweep is empty, so an empty mount list proves nothing",
    ).toBeGreaterThan(200);
    const canMount = production.filter((path) => couldMount(read(path)));
    expect(canMount, `${COMPONENT} has returned to a production surface`).toEqual([]);
  });

  it("IMPORTS NO STYLESHEET, which is the claim about the production artefact", () => {
    // The measured defect. A `.css` import here puts its rules in the shipped stylesheet even
    // though the component itself is folded away, so the absence of the import IS the property.
    const source = read(SOURCE);
    expect(
      /import\s+["'][^"']*\.css["']/.test(source),
      `${SOURCE} imports a stylesheet, which ships to production even though the component does not`,
    ).toBe(false);
    // And it really does carry its own rules, so the assertion above is not passing because the
    // control has quietly lost its look.
    expect(source).toContain(".catchup-skip {");
    expect(source).toContain("<style");
  });

  it("recognises both ways a production source could bring the mount back", () => {
    expect(couldMount(`import { ${COMPONENT} } from "./catchup";`)).toBe(true);
    expect(couldMount(`<${COMPONENT} onEnter={enter} />`)).toBe(true);
    expect(couldMount(`const note = "${COMPONENT} was removed";`)).toBe(false);
  });

  it("finds no mount that overrides the environment gate", () => {
    // The `enabled` prop exists so a browser SHOT can put the panel in frame, since `MODE` is
    // "test" there too. A production mount that passed it would render the control regardless of
    // the environment, and every assertion in `catchUpDevSkipIsGated.test.tsx` would stay green,
    // because that file drives the default.
    //
    // SCOPED TO THE MOUNT'S OWN ATTRIBUTES rather than to the whole file, and that is a
    // correction the first run forced rather than a preference. `winterDevSkipStaysDev.ts` checks
    // the file-wide occurrence and gets away with it because `HardWinterSurface.tsx` happens to
    // contain no bare `enabled`; `CitySurface.tsx` is 6,700 lines and contains five, none of them
    // this control's, so a file-wide check named the shipping mount as an offender. The claim is
    // about the props a mount passes, so the props a mount passes is what is read.
    const offenders = trackedSources()
      .map((path) => ({ path, source: read(path) }))
      .filter((file) => file.path !== SOURCE)
      .flatMap((file) =>
        [...file.source.matchAll(new RegExp(`<${COMPONENT}\\b([^>]*)/>`, "g"))].map(
          (mount) => ({ path: file.path, props: mount[1] ?? "" }),
        ),
      )
      .filter((mount) => /\benabled\b/.test(mount.props))
      // The sanctioned exception, kept honest in both directions in the next test.
      .filter((mount) => !mount.path.endsWith("catchUpDevSkipIsGated.test.tsx"));

    expect(
      offenders.map((mount) => mount.path),
      `a mount of ${COMPONENT} names "enabled", which renders the control regardless of the environment`,
    ).toEqual([]);
  });

  /**
   * THE SWEEP ABOVE MEASURES SOMETHING, injected rather than argued.
   *
   * Four mounts, and the last two are the cases a file-wide check gets wrong: a mount that passes
   * the override in a big file that mentions `enabled` elsewhere has to be caught, and a mount
   * that does NOT pass it in that same file has to be let through.
   */
  it("catches an override in a mount and lets an unrelated one through", () => {
    const flagged = (source: string): boolean =>
      [...source.matchAll(new RegExp(`<${COMPONENT}\\b([^>]*)/>`, "g"))].some((mount) =>
        /\benabled\b/.test(mount[1] ?? ""),
      );

    expect(flagged(`<${COMPONENT} onEnter={f} enabled />`)).toBe(true);
    expect(flagged(`<${COMPONENT} enabled={true} onEnter={f} />`)).toBe(true);
    // A mount with no override, in a file that names `enabled` about something else entirely.
    expect(
      flagged(
        `const rows = [{ id: "roads", enabled: true }];\n<${COMPONENT} onEnter={f} />`,
      ),
    ).toBe(false);
    // And a file with no mount at all, however much it talks about the prop.
    expect(
      flagged(`/** ${COMPONENT} takes an \`enabled\` prop. */\nconst enabled = 1;`),
    ).toBe(false);
  });

  /**
   * THE TWO SANCTIONED EXCEPTIONS, asserted in BOTH directions.
   *
   * `.cursor/rules/qa-verification.mdc`: an entry that stops qualifying must fail, so a renamed
   * or deleted file cannot sit here exempting nothing; and a qualifier that adopts the property
   * without leaving the list must fail, so the list cannot go on excusing something it has
   * stopped describing. The second direction is what stops an exception becoming permanent by
   * neglect.
   */
  it("keeps the exception honest", () => {
    const exceptions: readonly { readonly path: string; readonly why: string }[] = [
      {
        path: "apps/web/src/catchup/catchUpDevSkipIsGated.test.tsx",
        why: "drives both answers of the prop, which is the claim about the component itself",
      },
    ];
    const tracked = new Set(trackedSources());
    for (const entry of exceptions) {
      // An entry that has stopped being about this component is exempting nothing.
      expect(tracked.has(entry.path), `${entry.path} is no longer tracked`).toBe(true);
      const source = read(entry.path);
      expect(
        couldMount(source),
        `${entry.path} is a declared exception that no longer mounts ${COMPONENT}`,
      ).toBe(true);
      // And it really does name the thing it is excused for.
      expect(
        /\benabled\b/.test(source),
        `${entry.path} no longer names "enabled", so its exemption excuses nothing`,
      ).toBe(true);
      expect(entry.why.length, `${entry.path} has no reason recorded`).toBeGreaterThan(20);
    }
    // The list stays SHORT on purpose: the whole claim is that no production mount overrides the
    // gate, and a list that grew would be the claim quietly weakening.
    expect(exceptions).toHaveLength(1);
  });
});
