import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **A MILESTONE MAY NEVER ACQUIRE A COUNT, A COLLECTION, OR A SURFACE OF ITS OWN.**
 *
 * The team lead overruled the badges third of SPOV 2 on 2026-08-01 for one narrow thing: a
 * short line acknowledging something the player just did. Points and leaderboards stayed
 * refused, and BUILD 2 of the ranked research is the constraint that makes the carve-out
 * hold — *"one unifying progress currency (mastery), no parallel point systems"*.
 *
 * **The way this feature goes wrong is not the copy.** It is somebody collecting the lines
 * onto one screen, because the moment milestones share a surface they are a set with a
 * SIZE, and a set with a size has a completion percentage whether or not anybody renders
 * one. §5.6 of `docs/superpowers/specs/2026-08-01-game-feel-mechanics-backlog.md` states
 * four prohibitions against exactly that, and §5.7 records that an earlier draft's own
 * recommendation to keep a record on the era timeline was struck for it. This file is those
 * prohibitions made mechanical, so the next person to add a milestone cannot reintroduce
 * the thing the ruling was careful to exclude.
 *
 * ## THE POPULATION IS SCOPED BY BEHAVIOUR, AND THE OBVIOUS DERIVATION IS THE WRONG ONE
 *
 * The tempting filter is *every source that says "milestone"*. Measured on this tree, that
 * set is dominated by an unrelated system: `palette.ts`, `buildingAssets.ts` and
 * `masteryVisuals.ts` call a building's construction stage a *"milestone stage"*.
 * `buildingAssets.test.ts` even declares `const MILESTONES: readonly BuildStage[]` — a
 * literal array called MILESTONES, which a naive count-and-collection sweep would report
 * as the defect on its first run while saying nothing about the feature it was written
 * for.
 *
 * **A THIRD STRANGER WAS LISTED HERE AND HAS BEEN REMOVED.** `economySession.ts` called a
 * prestige grant an *"XP milestone"*, and the 2026-08-03 sunset deleted prestige, XP and
 * the sentence. Keeping it in {@link STRANGERS} would have left the sweep asserting that
 * a file still *"mentions a milestone at all"* — satisfiable, as it happens, by the
 * docblock recording the deletion, which is a guard held up by prose about something that
 * is gone. Two strangers is still a real contrast; a stale third is not.
 *
 * So the population is *every source that can put one of these two SENTENCES in front of a
 * learner*: it imports the module, or it declares or passes a `milestone` value, or it
 * carries one of the lines verbatim. That is a question about the product, and it catches a
 * surface that renders a milestone without importing a line of the module — which is
 * exactly what the winter's conclusion card does, since the city hands it the sentence.
 *
 * ## AND THE EXEMPTIONS FAIL BOTH WAYS
 *
 * Two files legitimately name both lines: the module that declares them and the test that
 * asserts them. They are listed with reasons and checked in both directions, so a renamed
 * file cannot sit here exempting nothing and a file that stops naming two cannot go on
 * holding a licence to.
 */

const repoRoot = resolveRepoRoot();

/** The module that declares the two lines. Its path is part of the claim. */
const MODULE = "apps/web/src/city/milestones.ts";

/**
 * Every surface that can show a milestone. Named rather than derived, and then checked
 * against the derivation below, so a surface dropping out of the sweep fails here instead
 * of quietly shrinking the population every other assertion runs over.
 */
const SURFACES: readonly string[] = [
  // Decides both lines, renders the recovery one, hands the crisis one down.
  "apps/web/src/city/CitySurface.tsx",
  // The three the crisis line is threaded through to reach the concluding card.
  "apps/web/src/city/three/WinterInCity.tsx",
  "apps/web/src/winter/HardWinterSurface.tsx",
  "apps/web/src/winter/WinterConclusion.tsx",
];

/**
 * The files allowed to name more than one milestone line, each with its reason.
 *
 * There is deliberately no surface here. The whole claim is that no screen is handed two,
 * so a third entry would be the claim weakening rather than the list growing.
 */
const MAY_NAME_TWO: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: MODULE,
    why: "declares both lines and carries the argument for why there is no collection of them",
  },
  {
    path: "apps/web/src/city/milestones.test.ts",
    why: "asserts both predicates, so it necessarily names both lines it is asserting about",
  },
];

/**
 * The unrelated "milestone" system, which the derivation must NOT sweep. Read rather
 * than merely listed, so an entry that stops using the word fails instead of quietly
 * ceasing to be a contrast. `economySession.ts` was a third until the XP sunset deleted
 * the "XP milestone" it named.
 */
const STRANGERS: readonly string[] = [
  "apps/web/src/city/buildingAssets.test.ts",
  "apps/web/src/city/palette.ts",
];

/**
 * Sources whose persistence shape a milestone must never enter. Named because each is a
 * real write path, and each is read rather than assumed to exist: a path that stopped
 * resolving would turn this assertion into a pass over nothing.
 */
const NEVER_PERSISTED: readonly string[] = [
  "apps/web/src/city/citySession.ts",
  "apps/web/src/devPersistence/devSession.ts",
  "packages/shared-state-schema/src/index.ts",
];

function trackedSources(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--", "apps", "packages", "engines", "services"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  )
    .split("\0")
    .filter((path) => /\.(ts|tsx)$/.test(path));
}

function trackedStylesheets(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "apps"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  })
    .split("\0")
    .filter((path) => path.endsWith(".css"));
}

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/** The two lines, read out of the module's source rather than transcribed here. */
function declaredLines(): readonly string[] {
  const source = read(MODULE);
  return [...source.matchAll(/^export const MILESTONE_\w+ = "([^"]+)";$/gm)].map(
    (match) => match[1] ?? "",
  );
}

/** The constants' NAMES, same reason: a rename must move this sweep with it. */
function declaredNames(): readonly string[] {
  const source = read(MODULE);
  return [...source.matchAll(/^export const (MILESTONE_\w+) = "/gm)].map(
    (match) => match[1] ?? "",
  );
}

/**
 * A source declares or passes a milestone VALUE: a prop signature (`milestone?: ...`), a
 * destructure default (`milestone = null`), or a JSX attribute (`milestone={...}`).
 *
 * Case-sensitive and word-bounded on the singular, which is what keeps the two unrelated
 * "milestone stage" systems and `const MILESTONES` out of the population. See the header.
 */
const CARRIES_A_MILESTONE = /\bmilestone\s*\??\s*[:=]/;

/** Every tracked source that can put one of these lines in front of a learner. */
function population(): { readonly path: string; readonly source: string }[] {
  const lines = declaredLines();
  const names = declaredNames();
  return trackedSources()
    .map((path) => ({ path, source: read(path) }))
    .filter(
      (file) =>
        /from "(\.|\.\.|\.\.\/\.\.)\/(city\/)?milestones"/.test(file.source) ||
        CARRIES_A_MILESTONE.test(file.source) ||
        names.some((name) => file.source.includes(name)) ||
        lines.some((line) => file.source.includes(line)),
    );
}

/** How many distinct milestone lines one file names, by text or by constant. */
function linesNamedBy(source: string): number {
  const lines = declaredLines();
  const names = declaredNames();
  let count = 0;
  for (const [index, line] of lines.entries()) {
    const name = names[index] ?? "\u0000";
    if (source.includes(line) || source.includes(name)) {
      count += 1;
    }
  }
  return count;
}

describe("a milestone is a sentence, not a score", () => {
  it("sweeps a population that contains every surface a milestone can reach", () => {
    // The floor on the tree, so a wrong cwd or an empty `git ls-files` reads as a failure
    // rather than as a clean sweep over nothing.
    expect(trackedSources().length, "the sweep found no sources at all").toBeGreaterThan(
      200,
    );

    const found = population().map((file) => file.path);
    // COMPOSITION, not only size: the module, its test, and every surface that can show a
    // line. A floor of six is met by any six files; this is met by the right six.
    expect(found, "the sweep has lost a surface a milestone reaches").toEqual(
      expect.arrayContaining([MODULE, "apps/web/src/city/milestones.test.ts", ...SURFACES]),
    );
    expect(found.length, found.join(", ")).toBeGreaterThanOrEqual(2 + SURFACES.length);

    // AND THE UNRELATED "milestone" SYSTEM IS OUT OF IT, which is the derivation being
    // right rather than merely being a derivation. A population that swallowed the
    // building stages would flag `const MILESTONES: readonly BuildStage[]` as this
    // feature's collection. Each stranger is READ, so an entry that stopped saying
    // "milestone" fails here rather than sitting in the list excusing nothing.
    for (const stranger of STRANGERS) {
      expect(read(stranger), `${stranger} no longer mentions a milestone at all`).toMatch(
        /milestone/i,
      );
      expect(
        found,
        `${stranger} is a different "milestone" and is not this sweep's`,
      ).not.toContain(stranger);
    }
    expect(STRANGERS.length, "the contrast has no members left").toBeGreaterThanOrEqual(2);
  });

  it("declares exactly two lines, and no collection of them", async () => {
    const names = declaredNames();
    expect(names.length, "the module declares no milestone lines").toBe(2);
    for (const line of declaredLines()) {
      expect(line.length, line).toBeGreaterThan(10);
    }

    // THE RUNTIME SHAPE. Every export is a string or a function: an array, a Set, a Map or
    // a record of milestones is a collection, and a collection invites a screen to show it.
    // Resolve through a runtime URL so this repository-level source reader does not make the
    // `test/` TypeScript project claim ownership of an app source outside its rootDir.
    const moduleUrl = pathToFileURL(posix.join(repoRoot, MODULE)).href;
    const module: Record<string, unknown> = await import(/* @vite-ignore */ moduleUrl);
    const exports = Object.entries(module);
    expect(exports.length, "the module exports nothing").toBeGreaterThanOrEqual(4);
    for (const [name, value] of exports) {
      expect(
        typeof value === "string" || typeof value === "function",
        `${name} is a ${Array.isArray(value) ? "list" : typeof value}, which is a collection of milestones`,
      ).toBe(true);
    }
  });

  it("puts no number, count or fraction in any milestone line", () => {
    for (const line of declaredLines()) {
      // Nothing is counted: no total, no "2 of 4", no tier, no percentage.
      expect(line, line).not.toMatch(/\d/);
      expect(line, line).not.toMatch(/%/);
      expect(line, line).not.toMatch(
        /\b(total|points?|score|tier|rank|rare|rarity|level|streak|unlocked|complete|completion)\b/i,
      );
      // No em-dash or en-dash: colon or restructure.
      expect(line, line).not.toMatch(/[\u2014\u2013]/);
      // And no other learner in the sentence, which is the leaderboards third of SPOV 2.
      expect(line, line).not.toMatch(/\b(than|others|everyone else|average|rank)\b/i);
    }
  });

  it("hands no surface more than one milestone line", () => {
    const exempt = new Set(MAY_NAME_TWO.map((entry) => entry.path));
    const offenders = population()
      .filter((file) => !exempt.has(file.path))
      .filter((file) => linesNamedBy(file.source) > 1)
      .map((file) => file.path);
    expect(
      offenders,
      "a surface names two milestone lines, which collects them onto one screen",
    ).toEqual([]);

    // AND NO SURFACE TAKES A LIST OF THEM, which is the shape an aggregate view arrives
    // in before anybody has written the screen. The prop is `string | null` everywhere.
    for (const file of population()) {
      if (exempt.has(file.path)) {
        continue;
      }
      expect(file.source, `${file.path} takes milestones as a list`).not.toMatch(
        /\bmilestones?\s*\??\s*:\s*(readonly\s+)?[\w.]+\[\]|\bmilestones?\s*\??\s*:\s*(Readonly)?Array</,
      );
    }
  });

  it("counts them nowhere", () => {
    for (const file of population()) {
      // A count is the parallel score, whether it is rendered or not.
      expect(file.source, `${file.path} counts milestones`).not.toMatch(
        /\bmilestones?\w*\s*\.\s*(length|size)\b|\b(count|total|tally|earned|unlocked)\w*milestone/i,
      );
      expect(file.source, `${file.path} names a milestone count`).not.toMatch(
        /\bmilestone\w*(Count|Total|Tally|Earned|Unlocked)\b/,
      );
    }
    // And no stylesheet grows the chrome a collection would need. A `.milestone-list` is a
    // screen before anyone has written the component for it.
    const sheets = trackedStylesheets();
    expect(sheets.length, "no stylesheets were swept").toBeGreaterThan(3);
    for (const path of sheets) {
      expect(read(path), `${path} styles a collection of milestones`).not.toMatch(
        /milestones?[-_](list|panel|drawer|grid|tray|board|count|total)/i,
      );
    }
  });

  it("persists none of them, and reads no instant to decide one", () => {
    for (const path of NEVER_PERSISTED) {
      const source = read(path);
      // The floor: the write path really is here, so the absence below means something.
      expect(source.length, `${path} is empty`).toBeGreaterThan(500);
      expect(source, `${path} persists a milestone`).not.toMatch(/milestone/i);
    }
    // Every migration too, since a column is the most durable form of the same defect.
    const migrations = execFileSync("git", ["ls-files", "-z", "--", "db/migrations"], {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .split("\0")
      .filter((path) => path.endsWith(".sql"));
    expect(migrations.length, "no migrations were swept").toBeGreaterThan(0);
    for (const path of migrations) {
      expect(read(path), `${path} stores a milestone`).not.toMatch(/milestone/i);
    }

    // AND THE ONCE-ONLY CHECK IS `hasEvent`-SHAPED RATHER THAN A TIMESTAMP, so INV-ERA-3
    // holds structurally. The module reads the damage mint and nothing that ticks.
    const source = read(MODULE);
    expect(source, "the module has stopped reading the damage mint").toContain(
      "next_damage_id",
    );
    expect(source, "the module reads an instant").not.toMatch(
      /\bDate\b|Date\.now|performance\.|setTimeout|setInterval|created_at|_at\b/,
    );
  });

  it("keeps both exemptions honest, in both directions", () => {
    const bySource = new Map(population().map((file) => [file.path, file.source]));
    for (const entry of MAY_NAME_TWO) {
      const source = bySource.get(entry.path);
      // An entry that has dropped out of the population is exempting nothing.
      expect(
        source,
        `${entry.path} is a declared exception the sweep no longer sees`,
      ).not.toBeUndefined();
      // And it really does name two, so a file that stopped cannot hold the licence.
      expect(
        linesNamedBy(source ?? ""),
        `${entry.path} names fewer than two lines, so its exemption excuses nothing`,
      ).toBeGreaterThan(1);
      expect(entry.why.length, `${entry.path} has no reason recorded`).toBeGreaterThan(20);
    }
    expect(MAY_NAME_TWO.length, "the exemption list has grown a surface").toBe(2);
  });
});
