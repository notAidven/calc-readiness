import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import {
  buildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
  type CitizenRoleId,
  type CityVitality,
  deriveCityVitality,
  ERA_ONE_CIVIC_TYPES,
  FOUNDING_POPULATION,
} from "@cr/game";
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **CITIZENS DO NOT LEAVE THIS CITY, AND NOTHING IN THE TREE MAY SAY OTHERWISE.**
 *
 * ## ⚑ THIS FILE ASSERTED THE OPPOSITE UNTIL 2026-08-05, AND THE SUBJECT IS WHAT CHANGED
 *
 * It shipped with #550
 * (`mergedAt` `2026-08-04T21:12:12Z`) and its central claim was *"a city that has nothing
 * for its people loses them"*: an unhappy era-one city derived through the shipped
 * `deriveCityVitality`, asserted to report `departures.leaving > 0` with
 * `remaining === population - leaving`. The team lead then withdrew the consequence half of
 * his own brief — *"maybe just remove the actual consequences just tell them their people are
 * unhappy?"* — and it was settled as a product decision: **citizens do not leave. Departures
 * are removed as a mechanic, entirely.**
 *
 * **The file is rewritten rather than deleted, and the reason is the whole of what a guard is
 * for.** `.cursor/rules/qa-verification.mdc`: *"Changing a guard owes the same evidence as a
 * fix."* A guard that merely stops checking is not a guard — the mechanic could come back one
 * pull request later and nothing would notice, which is exactly the state the departure rule
 * itself was built out of (a readiness grep that went on matching after the thing it checked
 * for had changed). So the subject moves to the new truth and the file keeps its name: three
 * documents, a work-log entry and two engine headers point a reader here by NAME, and a named
 * test that has been deleted fails loudly for them instead of quietly answering the wrong way.
 *
 * ## What each section claims, and why it is scoped the way it is
 *
 *  - **§1 is the behaviour, and it is the whole of the new signal.** A fixed era-one roster is
 *    taken from a city no amenity reaches to a city fully provided for, and every number the
 *    readout carries is checked for whether it moved. The numbers about the city's SIZE must
 *    not, and the set that does move is named entry by entry. No comment can satisfy it and no
 *    field name can slip past it: a `leaving`, a `remaining`, a `stayed` or a headcount folded
 *    into `population` all show up the same way, as a reading that fell when the provision
 *    fell and was not on the list.
 *  - **§2 is the copy**, over every production source a learner's words can come out of.
 *    Removing a consequence and leaving the sentence that promises it is the half-applied
 *    state this work exists to end, and it is the half that ships first because it is one
 *    string.
 *  - **§3 is the sound**, because a sample is a surface too. `citizens-depart.ogg` was a heavy
 *    door swung to for a city that had just lost people, and a door closing over a city that
 *    has lost nobody says the thing the panel has stopped saying.
 *
 * **§2 and §3 sweep populations defined by BEHAVIOUR rather than by implementation**, which is
 * the trap the same rule spends its longest section on. The departure mechanic reached the
 * engine, the panel, the aria-live sentence, the 3D crowd's placement, the sound catalogue and
 * an explainer's docblock, and only two of those imported a line of it. So §2 asks *"can a
 * learner read a sentence out of this file"* and not *"does this file import the rule".*
 *
 * Lives in `test/` because §2's and §3's subject is the tracked file list across two
 * workspaces, which the web lane's jsdom harness cannot read with `node:fs` — the same reason
 * `cityEventSfx.test.ts` and `hardWinterClockless.test.ts` do.
 */

const repoRoot = resolveRepoRoot();

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

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/* -------------------------------------------------------------------------- */
/* §1 The behaviour: a city that fails its people keeps every one of them       */
/* -------------------------------------------------------------------------- */

/**
 * Era one's six skill buildings and their roles, duplicated as DATA rather than imported,
 * following the reasoning `citizens-invariants.test.ts` and `city-provision.test.ts` both
 * give: the graph is Gabriel's, and an assertion about era one's own curve should fail loudly
 * if the graph moves under it rather than silently tracking it somewhere else.
 */
const NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;
const ROLE: Readonly<Record<string, CitizenRoleId>> = {
  "NUM.S": "civic",
  "NUM.F": "civic",
  "NUM.2": "residence",
  "NUM.3": "school",
  "NUM.4": "civic",
  "NUM.5": "civic",
};

/** The one civic row every era-one city is guaranteed (section 4's free Smokehouse). */
const FREE_SMOKEHOUSE = {
  livability: ERA_ONE_CIVIC_TYPES.smokehouse.livability,
  happiness: ERA_ONE_CIVIC_TYPES.smokehouse.happiness,
};

function island(mastered: number): CitizenNodeInput[] {
  return NODES.map((nodeId, index) => {
    const level: Mastery = index < mastered ? 2 : 0;
    return {
      node_id: nodeId,
      citizen_role: ROLE[nodeId] ?? "civic",
      placed: level > 0,
      mastery: level,
      lesson_stage: level > 0 ? ("done" as const) : ("not_started" as const),
      placement_estimate: 0 as const,
    };
  });
}

/**
 * A city of `mastered` finished skill buildings, its free Smokehouse, and `tiles` of paving.
 *
 * **PAVING IS THE LEVER, and that is what makes §1 surgical rather than suggestive.** Roads
 * feed happiness coverage and nothing else (D-CIT7 / D-CIT18): they are not an input to the
 * citizen roster, they add no livability and they cost no placement. So a sweep over `tiles`
 * holds the city's crowd, its homes and its buildings exactly fixed and changes only HOW MANY
 * OF ITS PEOPLE AN AMENITY REACHES — which is precisely the axis a departure rule keyed on.
 * Anything that moves across it moved because the city's provision moved.
 */
function cityAt(mastered: number, tiles: number): CityVitality {
  return deriveCityVitality({
    ledger: buildingLedger(island(mastered)),
    civic: [FREE_SMOKEHOUSE],
    roadTileCount: tiles,
  });
}

/** Every primitive the readout carries, by dotted path. */
function leavesOf(value: unknown, prefix = ""): Map<string, unknown> {
  if (value !== null && typeof value === "object") {
    const out = new Map<string, unknown>();
    for (const [key, inner] of Object.entries(value)) {
      for (const [path, leaf] of leavesOf(inner, prefix ? `${prefix}.${key}` : key)) {
        out.set(path, leaf);
      }
    }
    return out;
  }
  return new Map([[prefix, value]]);
}

/** How far the paving has to go to take a fully mastered island all the way to `content`. */
const ENOUGH_PAVING = 60;

/**
 * **THE READINGS THAT LEGITIMATELY MOVE WHEN THE CITY'S PROVISION MOVES**, each with the
 * reason it owes no invariance.
 *
 * A field that SHOULD move and a field that has started moving because somebody reconnected a
 * loss look identical from outside the sweep, so these are named rather than filtered, and the
 * list is asserted in **both** directions below:
 *
 *  - a path that moves and is not here fails, which is the departure mechanic coming back
 *    under any name at all;
 *  - a path here that stops moving, or that stops existing, fails — so an entry cannot sit in
 *    the list forever excusing nothing and hiding that it excuses nothing.
 *
 * The test for membership is not *"this number changes"* but **"this number is about what the
 * city PROVIDES, or about what it is short of."** Every one of the eleven is one of those two
 * things. Not one of them is a count of the people who live there.
 */
const MOVES_WITH_PROVISION: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "happiness.coverage",
    why: "the amenity CAPACITY itself, which is what the paving buys",
  },
  {
    path: "happiness.covered",
    why: "how many of the crowd that capacity reaches. It rises to the population and never past it, and the population is what it is measured against rather than what it changes",
  },
  {
    path: "happiness.uncovered",
    why: "the rest of the same crowd. `covered + uncovered` is the population at every step, which is the arithmetic that stops this being a second headcount",
  },
  {
    path: "happiness.level",
    why: "the percentage derived from the coverage, and the number the band and the alarm both read",
  },
  {
    path: "happiness.band",
    why: "the band the level falls in. A string, and the only non-numeric member of this list",
  },
  {
    path: "happiness.fromPaths",
    why: "how much of the coverage the paving supplied, which is the lever this sweep turns",
  },
  {
    path: "shortfalls.happiness",
    why: "the coverage still owed for the sustained crowd, straight from `capacityShortfall`",
  },
  {
    path: "shortfalls.none",
    why: "true only when all three shortfalls are zero, so it flips as the last of them closes",
  },
  {
    path: "provision.pressure",
    why: "how far under the band floor the city is, as a fraction of the floor. The one magnitude the reading has, and it scales a SENTENCE rather than a loss",
  },
  {
    path: "provision.cause",
    why: "which provision is the deeper shortfall, or null when there is none",
  },
  {
    path: "provision.unmet",
    why: "the one boolean a row reads to look alarmed. This is the whole of what unhappiness still does, and §1 is the assertion that it is all it does",
  },
];

/**
 * The four readings the city's provision may never touch, named rather than left to the
 * subtraction — because *"everything not on the other list"* is also what an empty readout
 * would satisfy, and because these four ARE the claim.
 */
const NEVER_MOVES: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "population",
    why: "THE CLAIM. The headcount learning brought, and the one number the ruling is about: a city that fails its people is exactly as big as one that provides for them",
  },
  {
    path: "livability.sustains",
    why: "the other capacity, and paving adds none of it. Here so that a road quietly acquiring a livability term fails rather than passing as an amenity reading",
  },
  {
    path: "shortfalls.livability",
    why: "people beyond what livability sustains. Cannot move while neither the crowd nor the homes do, which is what makes it a control on the lever itself",
  },
  {
    path: "shortfalls.practice",
    why: "standing buildings nobody has practised, which is a fact about the LEARNER and cannot respond to paving at all",
  },
];

/** Which paths move at all, as the city goes from unreached to fully provided for. */
function pathsThatMove(): { moving: Set<string>; every: Set<string> } {
  const moving = new Set<string>();
  const every = new Set<string>();
  for (let mastered = 0; mastered <= NODES.length; mastered += 1) {
    const readings: Map<string, unknown>[] = [];
    for (let tiles = 0; tiles <= ENOUGH_PAVING; tiles += 1) {
      readings.push(leavesOf(cityAt(mastered, tiles)));
    }
    const first = readings[0] as Map<string, unknown>;
    for (const path of first.keys()) {
      every.add(path);
      if (readings.some((reading) => reading.get(path) !== first.get(path))) {
        moving.add(path);
      }
    }
  }
  return { moving, every };
}

describe("a city that has nothing for its people keeps every one of them", () => {
  it("crosses the whole range this sweep is about, or it measures nothing", () => {
    // The floors, first and separately, because every claim below this is a statement about a
    // sweep and would hold over a sweep that never left the starting board.
    const worst = cityAt(NODES.length, 0);
    const best = cityAt(NODES.length, ENOUGH_PAVING);

    expect(worst.population, "the city has nobody to lose").toBeGreaterThan(
      FOUNDING_POPULATION,
    );
    expect(
      worst.happiness.band,
      "the unpaved city is not unhappy, so this sweep never enters the state it is about",
    ).toBe("restless");
    expect(worst.provision.unmet, "the unpaved city is not even alarmed").toBe(true);
    expect(
      best.happiness.band,
      "the paving never gets the city out of the restless band, so the sweep has no far end",
    ).toBe("content");
    expect(best.provision.unmet).toBe(false);
  });

  it("moves the amenity readings and NOT ONE reading about the city's size", () => {
    const { moving, every } = pathsThatMove();

    // A floor under the walk itself: a readout that had collapsed to nothing, or a walker
    // that stopped descending into the nested objects, would report a tiny leaf set and every
    // set operation below would pass over it.
    expect(
      every.size,
      `readout leaves: ${[...every].sort().join(", ")}`,
    ).toBeGreaterThanOrEqual(15);

    // ⚑ THE ASSERTION. Set equality, so it fails in both directions at once: a reading that
    // fell with the provision and is not declared, and a declared reading that has stopped
    // falling or stopped existing.
    expect(
      [...moving].sort(),
      "a reading fell when the city's provision fell, and it is not one of the amenity readings",
    ).toEqual(MOVES_WITH_PROVISION.map((entry) => entry.path).sort());

    // And the four the ruling is about, named, so the claim survives the list above being
    // edited: a `population` that started moving would fail here even if somebody had added
    // it to `MOVES_WITH_PROVISION` in the same commit.
    for (const entry of NEVER_MOVES) {
      expect(every.has(entry.path), `${entry.path} has left the readout`).toBe(true);
      expect(
        moving.has(entry.path),
        `${entry.path} moved with the city's provision, and it may not (${entry.why})`,
      ).toBe(false);
      expect(entry.why.length).toBeGreaterThan(20);
    }

    // The two lists are the whole readout between them, and they overlap nowhere. Without
    // this a field could be quietly absent from both and answer to neither.
    const declared = new Set([
      ...MOVES_WITH_PROVISION.map((entry) => entry.path),
      ...NEVER_MOVES.map((entry) => entry.path),
    ]);
    expect(declared.size).toBe(MOVES_WITH_PROVISION.length + NEVER_MOVES.length);
    expect(
      [...every].filter((path) => !declared.has(path)).sort(),
      "a reading in the city's readout that neither list accounts for",
    ).toEqual([]);
  });

  it("keeps every declared exception honest, so none of them excuses nothing", () => {
    const { moving, every } = pathsThatMove();

    // Floor: the list has not grown until it swallowed the readout. Eleven of fifteen is
    // already most of it, and it is allowed to be — the four that hold are the claim, and a
    // list that reached them would have to take one of them off `NEVER_MOVES` to do it, which
    // fails above.
    expect(MOVES_WITH_PROVISION.length).toBeGreaterThanOrEqual(11);

    for (const entry of MOVES_WITH_PROVISION) {
      // A path that has gone cannot sit here excusing something that does not exist.
      expect(
        every.has(entry.path),
        `${entry.path} is declared as moving with provision and is not in the readout`,
      ).toBe(true);
      // A path that has stopped moving cannot go on being excused for moving. This is the
      // direction that stops an exception becoming permanent by neglect.
      expect(
        moving.has(entry.path),
        `${entry.path} is excused for moving with provision (${entry.why}) and no longer does`,
      ).toBe(true);
      expect(entry.why.length).toBeGreaterThan(20);
    }
  });

  it("reports the headcount learning brought, over every era-one city and every paving", () => {
    // The same claim stated directly, and over a wider space than the census turns: the census
    // walks one lever on one civic set, so a reading that only APPEARS under other inputs
    // would never enter its leaf set at all. This closes that by asserting the readout's shape
    // over the crossing of the six-step path, the paving, and a bought amenity — and the shape
    // is what a re-introduction has to break, because there is nowhere to put a count without
    // adding a leaf.
    const declared = new Set([
      ...MOVES_WITH_PROVISION.map((entry) => entry.path),
      ...NEVER_MOVES.map((entry) => entry.path),
    ]);
    const campfire = {
      livability: ERA_ONE_CIVIC_TYPES.campfire.livability,
      happiness: ERA_ONE_CIVIC_TYPES.campfire.happiness,
    };

    let checked = 0;
    for (let mastered = 0; mastered <= NODES.length; mastered += 1) {
      const expected = citizenPopulation(buildingLedger(island(mastered)));
      for (const tiles of [0, 1, 7, 18, 40, ENOUGH_PAVING]) {
        for (const civic of [[FREE_SMOKEHOUSE], [FREE_SMOKEHOUSE, campfire, campfire]]) {
          const city = deriveCityVitality({
            ledger: buildingLedger(island(mastered)),
            civic,
            roadTileCount: tiles,
          });
          const where = `${mastered} mastered @ ${tiles} tiles, ${civic.length} civic`;
          expect(city.population, where).toBe(expected);
          expect(
            [...leavesOf(city).keys()].filter((path) => !declared.has(path)).sort(),
            `${where}: a reading neither list accounts for`,
          ).toEqual([]);
          checked += 1;
        }
      }
    }
    expect(checked).toBe((NODES.length + 1) * 6 * 2);
  });
});

/* -------------------------------------------------------------------------- */
/* §2 The copy: nothing tells a learner their people are going anywhere        */
/* -------------------------------------------------------------------------- */

/**
 * **THE SENTENCES THE RULING RETIRED, AS A DETECTOR RATHER THAN AS A LIST.**
 *
 * A list of exact strings would pass over the next paraphrase of them, and a rule with one
 * hand-written shape is the failure `.cursor/rules/qa-verification.mdc` records as `#187` — a
 * prose rule whose only shape could not match the sentence it was written for. So these are
 * shapes, and they are **grounded against the sentences actually removed**: the control below
 * feeds each retired source fragment through and fails if the detector does not see it.
 *
 * A person word, then the departure within the same clause. The window is bounded and stops at
 * sentence punctuation and at a newline, which is what keeps two unrelated sentences on one
 * line from combining into a match.
 */
const PERSON = String.raw`(?:people|persons?|citizens?|villagers?|residents?|everyone|somebody|nobody)`;
const SAME_CLAUSE = String.raw`[^.!?\n]{0,48}`;

const PROMISES_A_DEPARTURE: readonly { readonly what: string; readonly shape: RegExp }[] = [
  {
    what: "people leaving",
    shape: new RegExp(`${PERSON}${SAME_CLAUSE}\\bleav(?:e|es|ing)\\b`, "i"),
  },
  {
    what: "people who have left",
    shape: new RegExp(
      `${PERSON}${SAME_CLAUSE}\\b(?:has|have)\\b${SAME_CLAUSE}\\bleft\\b`,
      "i",
    ),
  },
  {
    what: "citizens departing",
    shape: new RegExp(`${PERSON}${SAME_CLAUSE}\\bdepart(?:s|ed|ing|ure|ures)?\\b`, "i"),
  },
];

/**
 * A source with its comments blanked, keeping the text otherwise intact.
 *
 * Borrowed from `cityEventSfx.test.ts`, and here it is load-bearing rather than tidy: **the
 * ruling is deliberately recorded in prose all over this tree.** Six modules now carry a
 * paragraph explaining what the departure mechanic was and why it went, and every one of them
 * quotes the sentence it retired. Sweeping comments would make the record of the decision the
 * violation, which is the shape that makes a guard something people work around.
 *
 * String literals are kept, which is the conservative direction: a learner's words are string
 * literals, and they are the whole subject of §2.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (line, lead: string) => lead + " ".repeat(line.length - lead.length),
    );
}

/**
 * Every source a learner's words can come out of.
 *
 * **`apps/web/src` and `engines/game/src`, and the population is the behaviour rather than the
 * mechanic's old import graph.** The departure mechanic put words on screen from the panel
 * (two warnings and a population row), from an `aria-live` sentence, and — nearly — from a
 * hover explainer whose docblock held a standing instruction to add the clause when the rule
 * landed. Only the panel imported the rule. The engine is in scope because that is where the
 * model's own vocabulary lives and where a future re-introduction would start.
 *
 * `.ts`/`.tsx` only, and tests excluded: markdown under `docs/` and `work-log/` is inert to CI
 * by a deliberate ruling and `ciScopeFilter.test.ts` fails any test that reads a file the
 * scope filter would skip, while a test file's own fixtures and assertion messages have to be
 * able to name the thing they forbid — this file could not otherwise describe its own subject.
 */
function learnerFacingSources(): string[] {
  return tracked("apps/web/src", "engines/game/src").filter(
    (path) => /\.tsx?$/.test(path) && !/\.(test|browser\.test)\.tsx?$/.test(path),
  );
}

describe("no source promises a learner that their people are leaving", () => {
  it("reads a real population of sources, or it is sweeping nothing", () => {
    const sources = learnerFacingSources();
    // Floors, because "no source says it" is also what a sweep that lost its cwd reports.
    // Both directories are asserted, and by CONTENT rather than by count: the panel is where
    // the sentences were, so a sweep that has stopped reaching it is a sweep with no subject.
    expect(sources.length).toBeGreaterThanOrEqual(200);
    expect(sources).toContain("apps/web/src/city/CityVitalityPanel.tsx");
    expect(sources).toContain("apps/web/src/city/cityLifeExplainers.ts");
    expect(sources).toContain("engines/game/src/city-provision.ts");
    expect(
      sources.filter((path) => path.startsWith("engines/game/src/")).length,
    ).toBeGreaterThanOrEqual(20);
  });

  it("finds the promise nowhere in the code a learner reads", () => {
    const offenders: string[] = [];
    for (const path of learnerFacingSources()) {
      const code = codeOnly(read(path));
      for (const pattern of PROMISES_A_DEPARTURE) {
        const hit = pattern.shape.exec(code);
        if (hit !== null) {
          offenders.push(`${path}: ${pattern.what} — ${JSON.stringify(hit[0].trim())}`);
        }
      }
    }
    expect(
      offenders,
      "a surface telling a learner their people are going somewhere, which they are not",
    ).toEqual([]);
  });

  /**
   * **THE CONTROL, AND IT IS WHAT MAKES THE SWEEP ABOVE MEAN ANYTHING.**
   *
   * A sweep that passes by finding nothing looks identical to one whose shapes cannot match
   * anything. So the detector is run against the three sentences this ruling actually deleted,
   * **quoted from the diff that removed them**, and against prose that must survive.
   */
  it("detects the sentences that were removed, and leaves ordinary prose alone", () => {
    const retired: readonly string[] = [
      // `CityVitalityPanel.tsx`'s happiness row, the lead's own words until 2026-08-05.
      'export const UNHAPPY_WARNING = "The people are unhappy, and will start leaving soon!";',
      // Its livability row.
      '  "The city cannot sustain everyone living here, and people are leaving.";',
      // The population row's alarmed terms line, as a built string.
      '{` ${leaving} ${leaving === 1 ? "person has" : "people have"} left`}',
      // And the shape a re-introduction would most likely take on the explainer, which was
      // written down as an instruction in `cityLifeExplainers.ts` and never as copy.
      '"...and people leave when it drops below that line."',
    ];
    for (const sentence of retired) {
      expect(
        PROMISES_A_DEPARTURE.some((pattern) => pattern.shape.test(sentence)),
        `the detector cannot see: ${sentence}`,
      ).toBe(true);
    }

    // ...and it is not simply matching everything. These are real shapes from this tree's own
    // lanes: the second is the sentence that SURVIVES on the happiness row, and a detector
    // that flagged it would have to be loosened until it caught nothing.
    for (const innocent of [
      '"Livability is how many people the city can sustain, and the crowd arrives whether or not there is room."',
      'export const UNHAPPY_WARNING = "Your people are unhappy and need things to do!";',
      '  "The city cannot sustain everyone living here, and wants more homes for them.";',
      '"Dividing leaves a remainder of 3."',
      "const left = box.getBoundingClientRect().left;",
      '"Nobody is left out of the count."',
    ]) {
      const hit = PROMISES_A_DEPARTURE.find((pattern) => pattern.shape.test(innocent));
      expect(hit?.what, `false positive on: ${innocent}`).toBeUndefined();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* §3 The sound: no sample marks a departure, because there is none to mark    */
/* -------------------------------------------------------------------------- */

const CATALOG_SOURCE = "apps/web/src/audio/soundEffects.ts";
const SFX_DIRECTORY = "apps/web/public/audio/sfx";

/** Every `SfxName` the catalogue holds, read out of the union the module declares. */
function catalogNames(): string[] {
  const union = /export type SfxName =([\s\S]*?);/.exec(codeOnly(read(CATALOG_SOURCE)));
  if (union === null) {
    throw new Error(`no SfxName union in ${CATALOG_SOURCE}`);
  }
  return [...(union[1] as string).matchAll(/"([a-z0-9-]+)"/g)]
    .map((match) => match[1] as string)
    .sort();
}

/** The vocabulary a sample for this event would have to use. */
const SOUNDS_LIKE_A_DEPARTURE = /depart|leaving|exodus|farewell/i;

describe("nothing in the game sounds a departure", () => {
  it("holds no sample for it, and ships no file for one", () => {
    const names = catalogNames();
    const files = tracked(SFX_DIRECTORY)
      .map((path) => posix.basename(path))
      .filter((base) => base.endsWith(".ogg"));

    // Floors first. `cityEventSfx.test.ts` owns the catalogue's own census and its floor moved
    // The catalogue is 16 after the retired ceremony effects left with their call sites;
    // these two are only here so that a parse that returned
    // nothing cannot report the catalogue clean.
    expect(names.length, names.join(", ")).toBeGreaterThanOrEqual(16);
    expect(files.length).toBeGreaterThanOrEqual(16);

    expect(
      names.filter((name) => SOUNDS_LIKE_A_DEPARTURE.test(name)),
      "a sample name for an event the game no longer has",
    ).toEqual([]);
    expect(
      files.filter((base) => SOUNDS_LIKE_A_DEPARTURE.test(base)),
      "a file on disk for an event the game no longer has",
    ).toEqual([]);
  });

  it("detects such a sample when there is one", () => {
    // The sweep above passes by finding nothing, which is also how a broken pattern looks.
    // `citizens-depart` is the name that was in the union until this ruling, so the detector
    // is pinned against the exact thing it exists to keep out.
    expect(SOUNDS_LIKE_A_DEPARTURE.test("citizens-depart")).toBe(true);
    expect(SOUNDS_LIKE_A_DEPARTURE.test("citizens-depart.ogg")).toBe(true);
    // And not against the samples that stayed.
    for (const kept of ["crowd-gather", "place-building", "thaw", "answer-missed"]) {
      expect(SOUNDS_LIKE_A_DEPARTURE.test(kept), kept).toBe(false);
    }
  });
});
