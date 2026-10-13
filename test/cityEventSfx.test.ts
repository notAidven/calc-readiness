import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **EVERY SAMPLE THE GAME SHIPS IS FIRED BY SOMETHING, AND EVERY CRISIS THAT ASKS THE
 * PLAYER TO COMMIT SAYS SO.**
 *
 * Two claims, and both are about a population the tree decides rather than a list written
 * down here. The behaviour first, before either population is derived:
 *
 *  1. *A sample in the catalogue that nothing plays is dead weight a learner downloads.*
 *  2. *A crisis that takes the player's decision without a sound is one crisis behaving
 *     differently from its three siblings, for no reason a player could discover.*
 *
 * ## Claim 1 is not hypothetical, it is the defect that was in the tree
 *
 * `purchase.ogg` sat in `soundEffects.ts`'s catalogue with no production call site from the
 * moment #498 deleted the cosmetic shop that fired it. Nothing failed. It was a 25 KB file
 * every learner who unmuted fetched on their first click, for a sound the game could no
 * longer make, and it was found by a person reading rather than by a run. This is the guard
 * that would have found it, and it fails in both directions: a sample nothing plays fails,
 * and a `playSfx` name that is not in the catalogue fails (the compiler catches that one
 * too, which is why the floor below matters more than the containment).
 *
 * ## Claim 2 is where the population had to be argued
 *
 * `.cursor/rules/qa-verification.mdc`: *"Define a guard's population by who exhibits the
 * behaviour, not by where the behaviour is implemented."*
 *
 * The sourcing sheet this work implements names two files for *"a crisis action is
 * committed"* — the winter's and the plague's — and both of them spell the transition
 * `type: "declare"`. A guard scoped to that spelling would have been green over an intrusion
 * and a succession that commit exactly the same way and call it `start_questions` and
 * `start_batch`. That is the narrow-filter failure the rule describes, and the filter would
 * have looked like one clean derivation over a real source the whole time.
 *
 * So the population is derived from the ENGINES instead, by the property that makes a
 * crisis a crisis: **a state machine with an `answering` phase** — the player commits, and
 * then the questions come. For each such engine this finds the one reducer case that moves
 * it into that phase, and then every app source that dispatches it. Four engines, four
 * commit events, three different names.
 *
 * Lives in `test/` for the reason `hardWinterClockless.test.ts` does: its subject is the
 * tracked file list across two workspaces, and the web lane's jsdom harness cannot read
 * source with `node:fs`.
 */

const repoRoot = resolveRepoRoot();

const ENGINE_DIRECTORY = "engines/game/src";
const APP_DIRECTORY = "apps/web/src";
const CATALOG_SOURCE = "apps/web/src/audio/soundEffects.ts";
const SFX_DIRECTORY = "apps/web/public/audio/sfx";

function tracked(...directories: readonly string[]): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", ...directories], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.length > 0)
    .sort();
}

function isSource(path: string): boolean {
  const base = posix.basename(path);
  return /\.(ts|tsx)$/.test(base) && !/\.test\.(ts|tsx)$/.test(base);
}

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/**
 * A source with its comments blanked, keeping the text otherwise intact.
 *
 * Every module in this population documents itself at length, and the documentation quotes
 * the very tokens being searched for — `phase: "answering"` appears in prose in three of
 * the four engines. Without this the derivation would find its population in the paragraphs
 * describing it. String literals are kept, which is the conservative direction here: the
 * things being matched ARE string literals.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (line, lead: string) => lead + " ".repeat(line.length - lead.length),
    );
}

/* -------------------------------------------------------------------------- */
/* The catalogue, and what plays it                                            */
/* -------------------------------------------------------------------------- */

/** Every `SfxName` the catalogue holds, read out of the union the module declares. */
function catalogNames(): string[] {
  const source = codeOnly(read(CATALOG_SOURCE));
  const union = /export type SfxName =([\s\S]*?);/.exec(source);
  if (union === null) {
    throw new Error(`no SfxName union in ${CATALOG_SOURCE}`);
  }
  return [...(union[1] as string).matchAll(/"([a-z0-9-]+)"/g)]
    .map((match) => match[1] as string)
    .sort();
}

/**
 * Every sample name a production source can reach, and where from.
 *
 * ## Why this is not `playSfx\("(name)"\)`
 *
 * It was, and it reported two false orphans: the ceremony picks its beat's sound through a
 * `switch` and hands `playSfx` a variable, so a sweep anchored on the CALL sees a name it
 * cannot read while the literal sits three lines above it. That is a sweep measuring a
 * calling convention rather than the thing it is about.
 *
 * So the question asked is *"does a module that plays sounds name this sample"*, in two
 * parts: the module has to import the player, and the name has to appear as a string
 * literal in its code. Indirection through a helper, a table or a switch all survive it,
 * and the two halves together are what keep it meaningful — the names are distinctive
 * enough that a chance collision would have to be inside a file that already plays sounds.
 */
function playedNames(): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  const names = catalogNames();
  for (const path of tracked(APP_DIRECTORY).filter(isSource)) {
    if (path === CATALOG_SOURCE) {
      continue;
    }
    const source = codeOnly(read(path));
    if (!/from "[^"]*audio\/soundEffects"/.test(source)) {
      continue;
    }
    for (const name of names) {
      if (source.includes(`"${name}"`)) {
        byName.set(name, [...(byName.get(name) ?? []), path]);
      }
    }
    // The two material sounds ladder by era, so a source naming the base rung reaches the
    // late one through `eraMaterialSfx` without ever writing its name.
    for (const match of source.matchAll(/eraMaterialSfx\(\s*"([a-z0-9-]+)"/g)) {
      const late = `${match[1] as string}-late`;
      byName.set(late, [...(byName.get(late) ?? []), path]);
    }
  }
  return byName;
}

describe("no sample ships without something that plays it", () => {
  it("reads a real catalogue and a real set of call sites", () => {
    const names = catalogNames();
    const played = playedNames();

    // Floors, because every containment below holds trivially over an empty set. This is
    // the assertion that fails if the union stops parsing or the sweep loses its cwd.
    //
    // 21 until 2026-08-04, when the lead cut the Album and `album-open` went with it; 20
    // until 2026-08-05, when departures were removed as a mechanic and `citizens-depart`
    // went with them. **Both moves were this guard's doing rather than a consequence of it**
    // — the sweep below fails on a sample nothing plays, so deleting `departuresSfx.ts` and
    // leaving the sound behind was red rather than quiet, which is exactly what this file
    // was written for after `purchase.ogg` sat orphaned for a day.
    //
    // The floor tracks the catalogue DOWN by exactly one each time rather than being given
    // headroom: it is the vacuity guard for everything below, so slack in it is slack in the
    // only thing holding those assertions up. Measured rather than argued — dropping one
    // more name out of the union fails HERE, at 15 against 16, and orphaning a spec by
    // deleting its call site fails at the next test.
    expect(names.length).toBeGreaterThanOrEqual(16);
    // NOT MOVED, and that is deliberate rather than an oversight in the same edit. This one is
    // not a tight floor and never was: every name in the catalogue has a call site (the next
    // test is what says so), so `played.size` tracks `names.length` and sits at 16 against a
    // floor of 15. Taking it down with its neighbour would have been slack bought for nothing,
    // which is the failure the neighbour's own comment warns about.
    expect(played.size).toBeGreaterThanOrEqual(15);

    // Composition, not only size: the five original city effects would clear a floor of
    // sixteen on their own if eleven copies of anything joined them, and the claim is
    // that the CITY'S EVENTS are wired. So the names the sourcing sheet added are
    // asserted to be a real majority of the catalogue rather than a rounding error in it.
    //
    // A COMPOSITION floor is not interchangeable with the size floor beside it — sixteen
    // names could be the five originals plus eleven of anything, and this is the line that
    // says they are
    // not.
    const original = [
      "place-building",
      "road-lay",
      "road-remove",
      "mastery-star",
      "building-unlocked",
    ];
    const added = names.filter((name) => !original.includes(name));
    expect(added.length, `added: ${added.join(", ")}`).toBeGreaterThanOrEqual(11);
  });

  it("plays every sample in the catalogue from at least one production source", () => {
    const played = playedNames();
    const orphans = catalogNames().filter((name) => !played.has(name));

    expect(
      orphans,
      "a sample nothing can play is bytes a learner fetches for a sound the game cannot make",
    ).toEqual([]);
  });

  it("asks for no sample the catalogue does not hold", () => {
    const names = new Set(catalogNames());
    // Literal `playSfx("x")` arguments, which is the one shape a stale name can take
    // without the compiler catching it — a name typed into a call that no longer exists
    // in the union would not compile, but this is the sweep's own second opinion.
    const asked = new Set<string>();
    for (const path of tracked(APP_DIRECTORY).filter(isSource)) {
      for (const match of codeOnly(read(path)).matchAll(/playSfx\(\s*"([a-z0-9-]+)"/g)) {
        asked.add(match[1] as string);
      }
    }

    // 10 until 2026-08-04. `playSfx("album-open")` was one of the literal call sites and
    // it went with the Album, so this tracks the tree down by one rather than being given
    // headroom: the floor is what stops the containment below passing over an empty set,
    // and slack in it is slack in the only thing holding this assertion up.
    expect(asked.size).toBeGreaterThanOrEqual(9);
    expect(
      [...asked].filter((name) => !names.has(name)),
      "a play of a name with no spec is a silent no-op at runtime",
    ).toEqual([]);
  });

  it("ships a file on disk for every sample, and no file nothing names", () => {
    const source = codeOnly(read(CATALOG_SOURCE));
    const wanted = [...source.matchAll(/file:\s*"([^"]+)"/g)]
      .map((m) => m[1] as string)
      .sort();
    const onDisk = tracked(SFX_DIRECTORY)
      .map((path) => posix.basename(path))
      .filter((base) => base.endsWith(".ogg"))
      .sort();

    // 20 until 2026-08-05, and down by one for the same reason as the union's floor above:
    // `citizens-depart.ogg` was deleted from disk in the same commit as its spec, because
    // this test's own set equality fails on either half alone.
    expect(wanted.length).toBeGreaterThanOrEqual(16);
    // Set equality in both directions. A spec pointing at a file nobody added is a sound
    // that 404s in silence; a file no spec names is the `purchase.ogg` shape again, one
    // layer down.
    expect(wanted).toEqual(onDisk);
  });
});

/* -------------------------------------------------------------------------- */
/* Every crisis that asks the player to commit, sounds it                      */
/* -------------------------------------------------------------------------- */

interface CrisisEngine {
  readonly path: string;
  /** The reducer this engine exports, e.g. `hardWinterReducer`. */
  readonly reducer: string;
  /** The event that moves it into `answering`, e.g. `declare`. */
  readonly commitEvent: string;
}

/**
 * The crises, derived by the behaviour rather than by the word "crisis": an engine whose
 * state machine has an `answering` phase is one that takes a decision and then asks
 * questions about it, which is the beat this guard is about.
 */
function crisisEngines(): CrisisEngine[] {
  const engines: CrisisEngine[] = [];
  for (const path of tracked(ENGINE_DIRECTORY).filter(isSource)) {
    const source = codeOnly(read(path));
    if (!source.includes('phase: "answering"')) {
      continue;
    }
    const reducer = /export function (\w+Reducer)\s*\(/.exec(source)?.[1];
    if (reducer === undefined) {
      throw new Error(`${path} has an answering phase and no exported reducer`);
    }
    // The case that performs the transition. Split on `case "` and keep the block whose
    // body reaches `phase: "answering"` before the next case opens.
    const commit = source
      .split(/\bcase "/)
      .slice(1)
      .map((block) => ({
        name: /^([a-z_]+)"/.exec(block)?.[1],
        body: block,
      }))
      .find(
        (block) => block.name !== undefined && block.body.includes('phase: "answering"'),
      );
    if (commit?.name === undefined) {
      throw new Error(`${path} never transitions into its own answering phase`);
    }
    engines.push({ path, reducer, commitEvent: commit.name });
  }
  return engines;
}

/** Every app source that dispatches a crisis engine's commit event to that engine. */
function commitDispatchers(): Map<string, CrisisEngine> {
  const found = new Map<string, CrisisEngine>();
  const engines = crisisEngines();
  const eventCounts = new Map<string, number>();
  for (const engine of engines) {
    eventCounts.set(engine.commitEvent, (eventCounts.get(engine.commitEvent) ?? 0) + 1);
  }
  for (const path of tracked(APP_DIRECTORY).filter(isSource)) {
    const source = codeOnly(read(path));
    for (const engine of engines) {
      // BOTH, and in the same file: the event names collide across engines (the plague
      // and the succession both call theirs `start_batch`), so an event name alone would
      // attribute a succession press to the plague.
      if (
        (source.includes(`${engine.reducer}(`) ||
          (eventCounts.get(engine.commitEvent) === 1 && /\bdispatch\s*\(/.test(source))) &&
        source.includes(`type: "${engine.commitEvent}"`)
      ) {
        found.set(path, engine);
      }
    }
    // The signed-in Succession dispatches through a command session so the browser never
    // authors reducer state or a score. The press and its sound remain on the surface; the
    // authenticated adapter executes the event. Recognise that behavior without requiring a
    // duplicate reducer call in the component merely to satisfy this source scan.
    if (
      path === "apps/web/src/succession/SuccessionSurface.tsx" &&
      source.includes("SuccessionSession") &&
      source.includes('type: "start_batch"')
    ) {
      const succession = engines.find((engine) => engine.path.endsWith("/succession.ts"));
      if (succession) {
        found.set(path, succession);
      }
    }
  }
  return found;
}

/**
 * **THE MEMBERS THAT GENUINELY DO NOT OWE A SOUND**, each with the reason.
 *
 * A member that does not owe the property and a member that forgot it look identical from
 * outside the guard, so leaving these out of the derivation quietly is how the second one
 * ships. They are named instead, and the list is asserted in both directions below.
 *
 * All four drive a crisis engine past the commit rather than performing one: three are dev
 * skips, whose entire purpose is to go round the beat a player would play, and one builds a
 * board to open a scenario on. None is reachable by a press in a shipped build, and a dev
 * skip that thudded would be announcing a commitment nobody made.
 */
const NEVER_A_PLAYER_PRESS: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "apps/web/src/winter/devSkipTiers.ts",
    why: "dev skip: fabricates a round's tier",
  },
  {
    path: "apps/web/src/succession/successionSession.ts",
    why: "command adapter: executes the already-sounded press and grades without owning UI",
  },
  {
    path: "apps/web/src/succession/successionScenarios.ts",
    why: "scenario builder: composes an opening board, never a press",
  },
];

/** The mark a surface leaves when it sounds its commit. */
const COMMIT_SOUND = 'eraMaterialSfx("crisis-commit"';
const PLAYABLE_CRISIS_SURFACES = [
  "apps/web/src/winter/HardWinterSurface.tsx",
  "apps/web/src/plague/PlagueSurface.tsx",
  "apps/web/src/relay/RelaySurface.tsx",
  "apps/web/src/succession/SuccessionSurface.tsx",
] as const;

describe("every crisis that asks the player to commit says so", () => {
  it("derives its population from the engines' own answering phase", () => {
    const engines = crisisEngines();

    // Floor first: every assertion below passes over an empty list.
    expect(engines.length, engines.map((e) => e.path).join(", ")).toBeGreaterThanOrEqual(4);

    // AND THE DERIVATION REACHED PAST ONE SPELLING, which is the whole point of deriving
    // it. The sourcing sheet named two files and both say `declare`; if this ever narrows
    // back to that, the distinct-event count drops to one and this line fails.
    const events = new Set(engines.map((engine) => engine.commitEvent));
    expect(
      events.size,
      `commit events: ${[...events].sort().join(", ")}`,
    ).toBeGreaterThanOrEqual(3);

    // Each engine is a real, distinct module with its own reducer.
    expect(new Set(engines.map((engine) => engine.reducer)).size).toBe(engines.length);
  });

  it("finds every source that commits, and every one of them is a surface or a named exception", () => {
    const dispatchers = commitDispatchers();
    const excused = new Set(NEVER_A_PLAYER_PRESS.map((entry) => entry.path));

    const required = [
      ...NEVER_A_PLAYER_PRESS.map((entry) => entry.path),
      ...PLAYABLE_CRISIS_SURFACES,
    ];
    expect(new Set(required).size).toBe(required.length);
    for (const path of required) {
      expect(dispatchers.has(path), `${path} is missing from the commit population`).toBe(
        true,
      );
    }
    expect(dispatchers.size).toBeGreaterThanOrEqual(required.length);

    const owing = [...dispatchers.keys()].filter((path) => !excused.has(path)).sort();
    // A floor on the OWING half specifically. The list of exceptions could otherwise grow
    // until it had swallowed the population and this suite were asserting nothing.
    expect(owing.length, owing.join(", ")).toBeGreaterThanOrEqual(4);

    const silent = owing.filter((path) => !read(path).includes(COMMIT_SOUND));
    expect(
      silent,
      "a crisis that takes the player's decision in silence, while its siblings do not",
    ).toEqual([]);
  });

  it("keeps the exception list honest in both directions", () => {
    const dispatchers = commitDispatchers();

    for (const entry of NEVER_A_PLAYER_PRESS) {
      // An entry that stops qualifying fails, so a renamed or deleted skip cannot sit here
      // forever exempting nothing.
      expect(
        dispatchers.has(entry.path),
        `${entry.path} is excused (${entry.why}) but no longer commits anything`,
      ).toBe(true);

      // A listed source that adopts the sound fails, so the list cannot go on excusing
      // something it has stopped describing.
      expect(
        read(entry.path).includes(COMMIT_SOUND),
        `${entry.path} is excused (${entry.why}) and yet sounds a commit`,
      ).toBe(false);

      expect(entry.why.length).toBeGreaterThan(15);
    }

    // The four playable surfaces really are in the population, named, so a derivation that
    // quietly stopped finding them fails here rather than shrinking to the exceptions.
    for (const surface of PLAYABLE_CRISIS_SURFACES) {
      expect([...commitDispatchers().keys()]).toContain(surface);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Nothing makes a sound around the mute                                       */
/* -------------------------------------------------------------------------- */

/**
 * The three modules allowed to touch a media API directly. Everything else in the app
 * reaches sound through `playSfx` or through one of the two synthesized chimes, all of
 * which ask `audioPrefs` first.
 *
 * This is what makes "every new sound obeys the Sound control" a statement about the app
 * rather than about the fifteen call sites somebody remembered to check: a sound that
 * ignored the mute would have to construct its own audio, and there is nowhere left to do
 * that. `audioPrefs.test.ts` and `soundEffects.test.ts` own the other half — that these
 * three really do fall silent.
 */
const MAY_MAKE_A_SOUND: readonly string[] = [
  "apps/web/src/audio/audioPrefs.ts",
  "apps/web/src/audio/music.ts",
  "apps/web/src/audio/soundEffects.ts",
  "apps/web/src/city/chime.ts",
  "apps/web/src/lessons/lessonSound.ts",
];

/**
 * The ways a module can actually EMIT sound, as opposed to mention audio.
 *
 * It matters that these match production and not fakery. The first version of this matched
 * a bare `createOscillator(`, and it flagged `lessons/testHarness.ts` — which installs a
 * COUNTING AudioContext so that a test can assert a chime did or did not fire, and which
 * therefore contains the method NAME while producing no sound whatever. Flagging it would
 * have meant either a false exemption in a list meant to be load-bearing, or a guard that
 * cried wolf about the one module written to prove sounds stay silent.
 *
 * So each pattern is anchored on the shape that emits: constructing an element or a
 * context, or calling a node factory ON one. The controls below assert each of them
 * against a real sample and against the harness's own shape, in both directions.
 */
const EMITS_SOUND: readonly RegExp[] = [
  /\bnew Audio\(/,
  /\bnew (?:webkit)?AudioContext\b/,
  /\.createOscillator\(/,
  /\.createBufferSource\(/,
];

describe("no sound in the app is reachable around the mute", () => {
  it("emits sound from the audio layer and nowhere else", () => {
    const offenders: string[] = [];
    for (const path of tracked(APP_DIRECTORY).filter(isSource)) {
      if (MAY_MAKE_A_SOUND.includes(path)) {
        continue;
      }
      const source = codeOnly(read(path));
      if (EMITS_SOUND.some((pattern) => pattern.test(source))) {
        offenders.push(path);
      }
    }

    expect(
      offenders,
      "sound emitted outside the audio layer answers to no preference",
    ).toEqual([]);
  });

  it("keeps that allowance to modules that really do gate on the preference", () => {
    // Both directions: a listed module that stops reading the preference is a hole in the
    // allowance, and a listed path that no longer exists is an allowance excusing nothing.
    for (const path of MAY_MAKE_A_SOUND) {
      const source = read(path);
      expect(
        source.length,
        `${path} is allowed to make a sound and does not exist`,
      ).toBeGreaterThan(0);
      expect(
        /audioPrefs|prefs\.(effectGain|musicGain|muted)|options\.prefs/.test(
          codeOnly(source),
        ),
        `${path} may make a sound and never asks whether it is allowed to`,
      ).toBe(true);
    }
  });

  /**
   * The sweep above passes by finding nothing, which is also how it would look if the
   * detector had been broken into matching nothing. This pins it against the shapes it is
   * for, and against the shape that made it wrong.
   */
  it("detects emission when it is present, and only then", () => {
    for (const emitting of [
      "  const el = new Audio(src);",
      "  const ctx = new AudioContext();",
      "  const ctx = new webkitAudioContext();",
      "  const osc = ctx.createOscillator();",
      "  const src = context.createBufferSource();",
    ]) {
      expect(
        EMITS_SOUND.some((pattern) => pattern.test(emitting)),
        `missed: ${emitting}`,
      ).toBe(true);
    }

    for (const quiet of [
      // `testHarness.ts`'s shape: a class METHOD named for a factory, on a fake that
      // counts rather than plays. This is the line that made the detector wrong.
      "  createOscillator() {",
      "  scope.AudioContext = CountingAudioContext;",
      '  playSfx("crowd-gather");',
      "  interface AudioProbe { oscillators: () => number }",
    ]) {
      expect(
        EMITS_SOUND.some((pattern) => pattern.test(quiet)),
        `false positive: ${quiet}`,
      ).toBe(false);
    }

    // And the comment stripper does not blank the code it shares a line with, or the
    // sweep above would be reading empty files and reporting them clean.
    const stripped = codeOnly(
      "const a = new Audio(x); // never Date.now()\n/* new Audio(y) */",
    );
    expect(stripped).toContain("new Audio(x)");
    expect(stripped.split("\n")[1]).not.toContain("new Audio(y)");
  });
});
