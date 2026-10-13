import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **AN ACHIEVEMENT'S COPY AND ITS CONDITION MAY NOT DRIFT, AND THE SET MAY NOT BECOME A
 * SCORE.**
 *
 * The team lead asked for the framework on 2026-08-03. It is an ADDITION to his 2026-08-01
 * amendment of SPOV 2, which permitted a short line acknowledging something the player had
 * just done and which shipped as two transient sentences on the crisis (#397). Points and
 * leaderboards were never in the amendment and are still refused. So this feature arrives
 * owing two things nothing else in the tree can check for it.
 *
 * ## ONE: THE COPY AND THE CONDITION ARE CHAINED, AND BOTH LINKS ARE MECHANICAL
 *
 * *"If the copy says 'your first era' and the predicate counts crises, nothing will ever
 * catch it."* Right, and a guard that read the copy for keywords would be a guard about
 * English. So the join is `AchievementAxis`, and this file measures both halves of it:
 *
 *  - **axis to predicate**, by DERIVING each predicate's real dependencies rather than
 *    reading them. Each field of the state is moved on its own, in both directions (up from
 *    an untouched island and down from a city that has done everything), and the fields
 *    whose movement changes the answer are the dependencies. Both directions are needed
 *    because a conjunction shows nothing when lifted from the floor and a disjunction shows
 *    nothing when lowered from the ceiling; the union catches either shape. The derived set
 *    must EQUAL the axis's declared `reads`.
 *  - **axis to copy**, by requiring every sentence to contain its axis's word, and by
 *    forbidding two axes that read nothing in common from borrowing each other's. Where two
 *    axes DO share a field the vocabulary check is dropped and the predicates hold them
 *    apart instead, which is the stronger check of the two anyway.
 *
 * Put the delegate's example in and it fails twice: an era row whose predicate counted
 * crises derives `crisesRecorded` against a declared `agesBehind`, and its sentence stops
 * naming what it reads.
 *
 * ## TWO: IT IS NOT THE CRISIS ACKNOWLEDGEMENTS AGAIN IN ANOTHER CORNER
 *
 * *"If a milestone already says 'you survived your first winter', an achievement saying the
 * same thing in a different corner is two features arguing."* The two shipped
 * acknowledgements speak on exactly two transitions, and this file runs BOTH of their real
 * predicates beside the achievements' and asserts the two layers never speak together:
 *
 *  - the first-crisis line and the crisis achievement are MUTUALLY EXCLUSIVE over the damage
 *    mint, which is not a coincidence to be maintained but the shape of the two conditions:
 *    the line asks whether the mint is still at its opening value and the achievement asks
 *    whether it has moved;
 *  - the recovery line's transition — the repair that takes the last scar off — earns
 *    nothing, which holds because the one achievement that reads a ruin needs a ruin
 *    STANDING and that repair is what removes the last one.
 *
 * And the crisis surfaces are asserted to be OUT of this feature's population, so no
 * achievement is rendered on the card where an acknowledgement already speaks.
 *
 * ## THREE: NOTHING IS COUNTED, TIERED, RANKED OR PRICED IN A THRESHOLD
 *
 * BUILD 2 is *"one unifying progress currency (mastery), no parallel point systems"*, and
 * §5.6 of the backlog argued that a shared surface turns sentences into *"a set with a SIZE,
 * and a set with a size has a completion percentage whether or not anybody renders one"*.
 * That argument is correct and this feature has the surface the acknowledgements refused,
 * because the lead asked for one. So the prohibitions move here rather than lapsing:
 *
 *  - no digit, percentage, tier, rarity or comparison word in any line of copy;
 *  - **no threshold above one**, which is *"ten buildings"* made impossible: every row must
 *    be earned by a witness whose every count is exactly one. That is the mechanical form of
 *    *"an achievement may name the first of something and never the tenth"*;
 *  - no stylesheet rule for a total, a progress bar or a tier badge, because a
 *    `.achievements-progress` is a score before the component that renders one exists.
 *
 * What the panel actually RENDERS is measured where it can be rendered:
 * `apps/web/src/city/achievementsSurface.test.tsx` reads the card's own text and fails on a
 * digit in it. A regex over a source cannot tell a rendered number from a loop bound, and
 * `CitySurface` is full of the second.
 *
 * ## THE POPULATION IS DERIVED, AND FLOORED AT BOTH ENDS
 *
 * Every tracked source that imports the module, names a declared id, or carries a declared
 * sentence — which is *"can this file put an achievement in front of a learner, or decide
 * one"* rather than *"is it in the achievements directory"*. Floored over the tree and over
 * the population, because *"we swept 900 files and found nothing"* is also exactly what a
 * broken sweep reports, and asserted by COMPOSITION as well as size, because a floor of six
 * is met by any six.
 */

const repoRoot = resolveRepoRoot();

/** The module that declares the table. Its path is part of the claim. */
const MODULE = "apps/web/src/city/achievements.ts";

/** The crisis acknowledgements this feature must not restate. */
const ACKNOWLEDGEMENTS = "apps/web/src/city/milestones.ts";

/** The dev control, which is asserted to carry no prop that could switch its gate off. */
const DEV_CONTROL = "apps/web/src/city/AchievementsDevPanel.tsx";

/** The stylesheet both surfaces share. */
const STYLESHEET = "apps/web/src/city/achievements.css";

/**
 * Every surface an achievement reaches, named so that one dropping out of the derivation
 * fails here rather than quietly shrinking the population every other assertion runs over.
 */
const SURFACES: readonly string[] = [
  // Derives the state, runs the earning pass, and mounts both surfaces.
  "apps/web/src/city/CitySurface.tsx",
  // The moment.
  "apps/web/src/city/AchievementNote.tsx",
  // The list, and the dev control it holds.
  "apps/web/src/city/AchievementsPanel.tsx",
  DEV_CONTROL,
];

/**
 * The crisis surfaces, which must stay OUT of this population.
 *
 * This is the non-duplication rule at the surface rather than at the predicate: the
 * conclusion card is where the first-crisis acknowledgement speaks, and an achievement
 * rendered on it would be the second feature in the same corner however different its
 * sentence. Each is read, so a renamed or deleted file fails rather than sitting here as an
 * absence over nothing.
 */
const ACKNOWLEDGEMENTS_OWN_THESE: readonly string[] = [
  "apps/web/src/winter/WinterConclusion.tsx",
  "apps/web/src/winter/HardWinterSurface.tsx",
  "apps/web/src/city/three/WinterInCity.tsx",
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

/**
 * Load an app source at runtime.
 *
 * Through a file URL, following `milestonesAreNotAPointSystem.test.ts`: a static import
 * would make the `test/` TypeScript project claim ownership of a source outside its
 * `rootDir`, and the whole point of this file is to run the real predicates rather than
 * copies of them.
 */
async function load(path: string): Promise<Record<string, unknown>> {
  const url = pathToFileURL(posix.join(repoRoot, path)).href;
  return (await import(/* @vite-ignore */ url)) as Record<string, unknown>;
}

/** One declaration, as this file needs to see it. */
interface Declared {
  readonly id: string;
  readonly axis: string;
  readonly earned: string;
  readonly toEarn: string;
  readonly isEarned: (state: Record<string, number>) => boolean;
}

interface AxisRule {
  readonly reads: readonly string[];
  readonly says: RegExp;
}

interface Table {
  readonly rows: readonly Declared[];
  readonly axes: Readonly<Record<string, AxisRule>>;
  readonly fields: readonly string[];
  readonly floor: Record<string, number>;
  readonly newlyEarned: (
    state: Record<string, number>,
    earned: ReadonlySet<string>,
  ) => readonly Declared[];
}

/** The table, its axes, and the state's own field names, all read from the module. */
async function table(): Promise<Table> {
  const module = await load(MODULE);
  const rows = module.ACHIEVEMENTS as readonly Declared[];
  const axes = module.ACHIEVEMENT_AXES as Readonly<Record<string, AxisRule>>;
  // THE FIELDS ARE DERIVED FROM THE MODULE'S OWN FLOOR STATE, never listed here: a fifth
  // signal added to `AchievementState` joins every sweep below with no edit, and one
  // removed cannot leave an axis pointing at a field that has gone.
  const floor = { ...(module.NEW_CITY_ACHIEVEMENT_STATE as Record<string, number>) };
  return {
    rows,
    axes,
    fields: Object.keys(floor),
    floor,
    newlyEarned: module.newlyEarnedAchievements as Table["newlyEarned"],
  };
}

/** A state with every count at one: a city that has done a bit of everything, once. */
function ceiling(fields: readonly string[]): Record<string, number> {
  return Object.fromEntries(fields.map((field) => [field, 1]));
}

/**
 * **THE FIELDS A PREDICATE REALLY READS**, derived rather than declared.
 *
 * Each field is moved alone, from the floor upward AND from the ceiling downward, and the
 * union of what changes the answer is the dependency set. See the header for why one
 * direction is not enough.
 */
function dependenciesOf(row: Declared, fields: readonly string[]): string[] {
  const floor = Object.fromEntries(fields.map((field) => [field, 0]));
  const high = ceiling(fields);
  const found = new Set<string>();
  for (const field of fields) {
    if (row.isEarned({ ...floor, [field]: 1 }) !== row.isEarned(floor)) {
      found.add(field);
    }
    if (row.isEarned({ ...high, [field]: 0 }) !== row.isEarned(high)) {
      found.add(field);
    }
  }
  return [...found].sort();
}

/**
 * The components this feature ships, derived from the tree rather than listed, so a fifth
 * one joins the sweep the day it lands.
 */
function componentNames(): string[] {
  return trackedSources()
    .filter((path) => /\/Achievement\w*\.tsx$/.test(path) && !/\.test\.tsx$/.test(path))
    .map((path) => posix.basename(path).replace(/\.tsx$/, "") as string);
}

/**
 * A source DECLARES OR PASSES an achievement value: a prop signature, a state binding, a
 * JSX attribute.
 *
 * This is the half of the derivation that catches a surface which renders an achievement
 * WITHOUT importing a line of the module, which is exactly what a crisis card handed a
 * sentence from above would look like. It is `milestonesAreNotAPointSystem`'s
 * `CARRIES_A_MILESTONE` one feature over, and it is why a bare search for the word is not
 * used instead: `milestones.ts` and its test both contain *"achievements"* in PROSE, quoting
 * the ruling this feature descends from, and a word sweep would pull the acknowledgements
 * module into a population this file then asserts it is outside of.
 */
const CARRIES_AN_ACHIEVEMENT = /\bachievement\w*\s*\??\s*[:=]/i;

/** Every source that can put an achievement in front of a learner, or decide one. */
function population(rows: readonly Declared[]): { path: string; source: string }[] {
  const ids = rows.map((row) => row.id);
  const lines = rows.flatMap((row) => [row.earned, row.toEarn]);
  const components = componentNames();
  return trackedSources()
    .map((path) => ({ path, source: read(path) }))
    .filter(
      (file) =>
        /from "[^"]*\/achievements"/.test(file.source) ||
        components.some(
          (name) =>
            file.source.includes(`<${name}`) ||
            file.source.includes(`export function ${name}(`),
        ) ||
        CARRIES_AN_ACHIEVEMENT.test(file.source) ||
        ids.some((id) => file.source.includes(`"${id}"`)) ||
        lines.some((line) => file.source.includes(line)),
    );
}

describe("an achievement is a sentence about this player, not a score", () => {
  it("declares a real table over a derived set of state fields", async () => {
    const { rows, axes, fields } = await table();

    // Four is the shipped set and the floor is under it rather than on it, so adding a row
    // is a row. An empty or one-row table would satisfy every absence assertion below.
    expect(
      rows.length,
      "the table has fewer rows than the shipped set",
    ).toBeGreaterThanOrEqual(4);
    expect(
      fields.length,
      "the state has no fields, so no predicate can read one",
    ).toBeGreaterThanOrEqual(4);
    expect(new Set(rows.map((row) => row.id)).size, "two rows share an id").toBe(
      rows.length,
    );

    for (const row of rows) {
      // Both sentences, both real prose, and they are not the same sentence: an invitation
      // that is the record with a word changed tells an unearned reader nothing.
      expect(row.earned.length, row.id).toBeGreaterThan(20);
      expect(row.toEarn.length, row.id).toBeGreaterThan(20);
      expect(row.toEarn, row.id).not.toBe(row.earned);
      expect(axes[row.axis], `${row.id} names an axis with no rule`).not.toBeUndefined();
    }

    // EVERY AXIS IS USED. An axis nobody is on is a rule that constrains nothing, and it is
    // where a stale `reads` list would sit unnoticed until somebody joined it.
    for (const axis of Object.keys(axes)) {
      expect(
        rows.some((row) => row.axis === axis),
        `the ${axis} axis has no rows, so its rule constrains nothing`,
      ).toBe(true);
    }
  });

  it("derives each predicate's dependencies and finds exactly its axis's fields", async () => {
    const { rows, axes, fields } = await table();

    for (const row of rows) {
      const rule = axes[row.axis] as AxisRule;
      // Every field an axis claims is a field the state actually has, so a renamed signal
      // cannot leave a rule pointing at nothing and passing.
      for (const field of rule.reads) {
        expect(
          fields,
          `the ${row.axis} axis reads ${field}, which the state has not got`,
        ).toContain(field);
      }
      expect(
        dependenciesOf(row, fields),
        `${row.id} is on the ${row.axis} axis but its condition reads different state`,
      ).toEqual([...rule.reads].sort());
    }

    /*
      AND THE DERIVATION IS DISCRIMINATING, which the equality above cannot show on its own:
      a `dependenciesOf` that had broken into returning the declared list would pass every
      row. So it is run against two predicates whose dependencies are known by construction.
     */
    const bothWay = (state: Record<string, number>) =>
      (state[fields[0] as string] ?? 0) >= 1 && (state[fields[1] as string] ?? 0) >= 1;
    const eitherWay = (state: Record<string, number>) =>
      (state[fields[0] as string] ?? 0) >= 1 || (state[fields[2] as string] ?? 0) >= 1;
    const asRow = (isEarned: (s: Record<string, number>) => boolean): Declared =>
      ({ id: "probe", axis: "probe", earned: "", toEarn: "", isEarned }) as Declared;

    expect(dependenciesOf(asRow(bothWay), fields)).toEqual(
      [fields[0], fields[1]].sort() as string[],
    );
    expect(dependenciesOf(asRow(eitherWay), fields)).toEqual(
      [fields[0], fields[2]].sort() as string[],
    );
    // A predicate that reads nothing derives nothing, so "found no dependencies" is a real
    // answer this function can give rather than its failure mode.
    expect(
      dependenciesOf(
        asRow(() => true),
        fields,
      ),
    ).toEqual([]);
  });

  it("makes every sentence name its own axis, and borrow no other axis's word", async () => {
    const { rows, axes } = await table();

    for (const row of rows) {
      const rule = axes[row.axis] as AxisRule;
      for (const line of [row.earned, row.toEarn]) {
        expect(
          rule.says.test(line),
          `${row.id} is on the ${row.axis} axis and "${line}" does not say so`,
        ).toBe(true);
      }
    }

    // AND NO AXIS BORROWS THE WORD OF AN AXIS IT SHARES NO STATE WITH. Two conditions that
    // read nothing in common describe two different things, so their copy must too.
    let compared = 0;
    for (const row of rows) {
      const mine = axes[row.axis] as AxisRule;
      for (const [axis, rule] of Object.entries(axes)) {
        if (axis === row.axis) {
          continue;
        }
        const shares = rule.reads.some((field) => mine.reads.includes(field));
        if (shares) {
          continue;
        }
        compared += 1;
        for (const line of [row.earned, row.toEarn]) {
          expect(
            rule.says.test(line),
            `${row.id} reads no ${axis} state and "${line}" talks like it does`,
          ).toBe(false);
        }
      }
    }
    // The floor: pairs really were compared, so the absence above is an absence.
    expect(
      compared,
      "no two axes were disjoint, so nothing was cross-checked",
    ).toBeGreaterThan(3);
  });

  it("counts nothing, ranks nothing, and puts no number in any line", async () => {
    const { rows } = await table();
    for (const row of rows) {
      for (const line of [row.earned, row.toEarn]) {
        expect(line, line).not.toMatch(/\d/);
        expect(line, line).not.toMatch(/%/);
        expect(line, line).not.toMatch(
          /\b(total|points?|score|tier|rank|rare|rarity|level|streak|xp|badge|trophy)\b/i,
        );
        // No other learner in the sentence, which is the leaderboards third of SPOV 2 and
        // was never in the amendment.
        expect(line, line).not.toMatch(
          /\b(than|others|everyone else|average|leaderboard|compared)\b/i,
        );
        // Colon or restructure. `cityCopyRegister` sweeps the same characters over the whole
        // lane; this is the rule stated where the copy is declared.
        expect(line, line).not.toMatch(/[\u2014\u2013]/);
      }
    }
  });

  /**
   * **NOTHING CAN BE EARNED BY SOMETHING GOING AWAY.**
   *
   * Every predicate rises with every field or ignores it, and never falls. Three things rest
   * on this and none of them is obvious from reading the four rows:
   *
   *  - *"earned once and permanently"* is coherent. A predicate that could go false would
   *    make the stored flag a lie rather than a record, and `markAchievementEarned` has no
   *    un-earn path to correct it with.
   *  - **the repair that clears the last scar can earn nothing**, which is the recovery
   *    acknowledgement's own moment. That is the concrete instance asserted below; this is
   *    the general reason, and it holds for a transition nobody has written yet.
   *  - **no row is a reward for a setback.** `crisesRecorded === 1` would be an achievement
   *    a second winter took away, and this is what refuses it.
   *
   * Checked over a small lattice rather than at one point, because a predicate can be
   * monotone from zero to one and fall at two, which is exactly what an equality does.
   */
  it("never falls as a city does more, so nothing is earned by a loss", async () => {
    const { rows, fields } = await table();
    const RUNGS = [0, 1, 2, 3];
    let compared = 0;
    for (const row of rows) {
      for (const field of fields) {
        // Over both a bare island and a city that has done everything once, so a term that
        // only matters in a conjunction is still exercised.
        for (const base of [0, 1]) {
          const at = (value: number): boolean =>
            row.isEarned({
              ...Object.fromEntries(fields.map((name) => [name, base])),
              [field]: value,
            });
          for (const [index, rung] of RUNGS.entries()) {
            for (const higher of RUNGS.slice(index + 1)) {
              compared += 1;
              expect(
                at(rung) && !at(higher),
                `${row.id} is earned at ${field}=${rung} and lost at ${field}=${higher}`,
              ).toBe(false);
            }
          }
        }
      }
    }
    // The floor: pairs really were compared, so the absence above is an absence.
    expect(compared, "no pairs were compared").toBeGreaterThan(50);
  });

  it("is earned by a witness whose every count is one, so no row is a threshold", async () => {
    const { rows, axes, fields } = await table();
    const floor = Object.fromEntries(fields.map((field) => [field, 0]));

    for (const row of rows) {
      const rule = axes[row.axis] as AxisRule;
      // The witness: exactly one of everything the row reads, nothing else at all. This is
      // what makes "ten buildings" impossible to declare — it would need a two.
      const witness = { ...floor };
      for (const field of rule.reads) {
        witness[field] = 1;
      }
      expect(
        row.isEarned(witness),
        `${row.id} is not earned by one of each thing it reads, so it is a threshold`,
      ).toBe(true);
      // And an untouched island has earned nothing, so the witness above is about the row.
      expect(row.isEarned(floor), `${row.id} is earned by a brand new city`).toBe(false);
    }
  });
});

describe("the achievements do not restate the crisis acknowledgements", () => {
  /** The two shipped lines, read from their own module rather than transcribed. */
  function acknowledgementLines(): readonly string[] {
    return [
      ...read(ACKNOWLEDGEMENTS).matchAll(/^export const MILESTONE_\w+ = "([^"]+)";$/gm),
    ].map((found) => found[1] ?? "");
  }

  /**
   * Down to words, so a restatement cannot hide behind punctuation.
   *
   * **THIS IS A CORRECTION WITH A DEMONSTRATED RED BEHIND IT.** The first version compared
   * the raw strings, and *"Your city is back on its feet, ruins and all."* passed it: the
   * acknowledgement's own sentence ends in a full stop, so a `toContain` over the literal
   * missed a line that restated it word for word with a comma instead. That is the shape
   * `.cursor/rules/qa-verification.mdc` catalogues as a prose rule whose one form could not
   * match the sentence it was written for, and `scripts/inject-achievement-defects.sh` case
   * 5 is where it was seen.
   */
  function words(line: string): string[] {
    return line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  /** How long a shared run of words counts as one sentence saying the other's thing. */
  const SHARED_RUN = 5;

  function runs(line: string, length: number): Set<string> {
    const found = new Set<string>();
    const parts = words(line);
    for (let start = 0; start + length <= parts.length; start += 1) {
      found.add(parts.slice(start, start + length).join(" "));
    }
    return found;
  }

  it("shares no sentence, and no run of words, with either of them", async () => {
    const { rows } = await table();
    const lines = acknowledgementLines();
    // The floor: both lines were found. A regex that stopped matching would make every
    // assertion below pass over nothing.
    expect(lines.length, "the acknowledgements module declares no lines").toBe(2);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(10);
      /*
        And each is long enough to HAVE a run of that length, so the overlap check compares
        something rather than trivially finding nothing. Greater-than-or-equal and not
        greater-than: *"You defeated your first crisis"* is exactly five words, so the
        stricter floor failed on the shipped acknowledgement itself and made every case in
        `scripts/inject-achievement-defects.sh` report this line instead of its own defect.
       */
      expect(words(line).length, line).toBeGreaterThanOrEqual(SHARED_RUN);
    }

    for (const row of rows) {
      for (const mine of [row.earned, row.toEarn]) {
        for (const theirs of lines) {
          const said = words(mine).join(" ");
          const already = words(theirs).join(" ");
          expect(said, `${row.id} restates an acknowledgement`).not.toBe(already);
          // CONTAINMENT BOTH WAYS, on the words rather than the characters: a line that
          // wraps an acknowledgement in extra clauses is still that acknowledgement.
          expect(said, `${row.id} contains an acknowledgement`).not.toContain(already);
          expect(already, `${row.id} is contained by an acknowledgement`).not.toContain(
            said,
          );
          // And no long shared run, which is what catches a line that says most of the
          // acknowledgement's sentence and then goes somewhere else.
          const shared = [...runs(mine, SHARED_RUN)].filter((run) =>
            runs(theirs, SHARED_RUN).has(run),
          );
          expect(shared, `${row.id} borrows an acknowledgement's own phrasing`).toEqual([]);
        }
      }
    }
  });

  /**
   * **THE FIRST-CRISIS LINE AND THE CRISIS ROW ARE MUTUALLY EXCLUSIVE OVER THE MINT.**
   *
   * Both real predicates, run over the same damage. This is the strongest form the
   * non-duplication claim takes, because it is not *"the sentences differ"* — it is that the
   * two conditions cannot both be true, on any city, ever.
   */
  it("never speaks at the same moment as the first-crisis line", async () => {
    const { rows, fields } = await table();
    const acknowledgements = await load(ACKNOWLEDGEMENTS);
    const game = await load("engines/game/src/crisis-damage.ts");
    const firstCrisis = acknowledgements.firstCrisisMilestone as (
      damage: unknown,
    ) => string | null;
    const fold = game.foldCrisisDamage as (damage: unknown, report: unknown) => unknown;
    const clearOne = game.clearRuinedBuilding as (damage: unknown, id: string) => unknown;
    const none = game.NO_CRISIS_DAMAGE as { next_damage_id: number };
    const achievements = await load(MODULE);
    const mintToCount = achievements.crisesRecordedFromMint as (mint: number) => number;

    const crisisRows = rows.filter((row) => row.axis === "crisis");
    expect(crisisRows.length, "there is no crisis row to compare").toBeGreaterThan(0);

    // A NEW ISLAND: the acknowledgement speaks, the achievement does not.
    const fresh = none;
    expect(
      firstCrisis(fresh),
      "the acknowledgement has stopped speaking here",
    ).not.toBeNull();
    for (const row of crisisRows) {
      const state = Object.fromEntries(fields.map((field) => [field, 0]));
      state.crisesRecorded = mintToCount(fresh.next_damage_id);
      expect(
        row.isEarned(state),
        `${row.id} is earned on the very card the acknowledgement is printed on`,
      ).toBe(false);
    }

    // AFTER ONE CARRY-BACK: the achievement is earned, the acknowledgement is silent.
    const carried = fold(fresh, { buildings: ["NUM.S"], cells: [] }) as {
      next_damage_id: number;
      ruined_buildings: readonly unknown[];
    };
    expect(carried.next_damage_id).toBeGreaterThan(fresh.next_damage_id);
    expect(
      firstCrisis(carried),
      "the acknowledgement still speaks after a carry-back",
    ).toBeNull();
    for (const row of crisisRows) {
      const state = Object.fromEntries(fields.map((field) => [field, 0]));
      state.crisesRecorded = mintToCount(carried.next_damage_id);
      expect(row.isEarned(state), `${row.id} is not earned by a carried-back crisis`).toBe(
        true,
      );
    }

    // AND THE RECOVERY LINE'S OWN TRANSITION EARNS NOTHING NEW. Its moment is the repair
    // that takes the last scar off; the only row that reads a ruin needs one standing, so
    // clearing the last one cannot be what earns it.
    const recovered = acknowledgements.cityRecoveredMilestone as (
      before: unknown,
      after: unknown,
    ) => string | null;
    const repaired = clearOne(carried, "NUM.S") as { next_damage_id: number };
    expect(
      recovered(carried, repaired),
      "the recovery acknowledgement no longer fires on this transition",
    ).not.toBeNull();

    const { newlyEarned } = await table();
    const before = Object.fromEntries(fields.map((field) => [field, 0]));
    before.crisesRecorded = mintToCount(carried.next_damage_id);
    before.standingRuins = carried.ruined_buildings.length;
    // Everything else the city has done is held at one, so this is the WORST case for the
    // claim: a fully-achieved city arriving at the repair.
    before.masteredSkills = 1;
    before.agesBehind = 1;
    const held = new Set(newlyEarned(before, new Set()).map((row) => row.id));
    // The floor: the city really had earned things before the repair.
    expect(
      held.size,
      "nothing was earned before the repair, so nothing could be new after",
    ).toBe(rows.length);

    const after = { ...before, standingRuins: 0 };
    expect(
      newlyEarned(after, held).map((row) => row.id),
      "the repair that clears the last scar earns an achievement, which is the acknowledgement's moment",
    ).toEqual([]);
  });

  it("reaches no surface the acknowledgements already speak on", async () => {
    const { rows } = await table();
    const swept = population(rows).map((file) => file.path);
    for (const path of ACKNOWLEDGEMENTS_OWN_THESE) {
      // Read, so a renamed or deleted crisis surface fails here rather than passing as an
      // absence over a file that is not there.
      expect(read(path).length, `${path} is empty`).toBeGreaterThan(500);
      expect(
        swept,
        `${path} is a crisis surface and an achievement now reaches it`,
      ).not.toContain(path);
    }
    // And the acknowledgements' own module is not in it either: the two layers share no
    // declaration.
    expect(swept, "the acknowledgements module now declares an achievement").not.toContain(
      ACKNOWLEDGEMENTS,
    );
  });
});

describe("the surfaces and the dev control", () => {
  it("sweeps a population that contains every surface an achievement reaches", async () => {
    const { rows } = await table();
    // The tree, so a wrong cwd or an empty `git ls-files` reads as a failure rather than as
    // a clean sweep over nothing.
    expect(trackedSources().length, "the sweep found no sources at all").toBeGreaterThan(
      400,
    );

    const found = population(rows).map((file) => file.path);
    // COMPOSITION, not only size. A floor of six is met by any six; this is met by the
    // module, its own tests, and every surface.
    expect(found, "the sweep has lost a surface an achievement reaches").toEqual(
      expect.arrayContaining([MODULE, ...SURFACES]),
    );
    expect(found.length, found.join(", ")).toBeGreaterThanOrEqual(1 + SURFACES.length);
  });

  it("grows no chrome for a total, a bar or a tier", () => {
    const sheets = trackedStylesheets();
    expect(sheets.length, "no stylesheets were swept").toBeGreaterThan(3);
    // The feature's own sheet is really in the sweep and really has rules, so the absence
    // below is about a stylesheet rather than about a missing file.
    expect(sheets, `${STYLESHEET} is not tracked`).toContain(STYLESHEET);
    expect(read(STYLESHEET)).toMatch(/\.achievements-row/);

    /*
      COMMENTS STRIPPED FIRST, and this is a measured correction rather than tidiness: the
      sheet's own header NAMES the class names it refuses to grow, so the first version of
      this sweep failed on the sentence explaining the rule. A rule is a selector, not a
      paragraph, and the stripped corpus is floored below so a stripper that ate everything
      cannot pass.
     */
    const rules = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules(read(STYLESHEET)), "the stripper ate the stylesheet").toMatch(
      /\.achievements-row/,
    );
    expect(rules(read(STYLESHEET)), "the stripper kept the header").not.toMatch(
      /a set with a size/,
    );

    for (const path of sheets) {
      expect(
        rules(read(path)),
        `${path} styles a count, a bar or a tier of achievements`,
      ).not.toMatch(
        /achievements?[-_](count|total|progress|bar|meter|tier|rank|rarity|percent|score)/i,
      );
    }
  });

  /**
   * **THE DEV CONTROL CARRIES NO PROP THAT COULD SWITCH ITS GATE ON.**
   *
   * `test/crisisDevSkipOverride.test.ts` exists because an optional `enabled` prop is a
   * control whose visibility a call site can turn on while every behavioural test of the
   * default stays green, and #492 spent a cycle removing one. That guard derives its
   * population from the prop, so a control with no prop is outside it by construction —
   * which is the right answer and also means nothing would notice one being added here.
   * This is the assertion that notices.
   */
  it("hangs on the environment gate with no prop, at the declaration and at the mount", async () => {
    const control = read(DEV_CONTROL);
    // It really is gated, so the absences below are about a gated control.
    expect(control, `${DEV_CONTROL} no longer reads the dev gate`).toContain(
      "isDevPersistenceEnabled()",
    );
    // NO OVERRIDE FIRST, in either of the two shapes the older guard had to learn about: a
    // declared optional prop, and a default that reads the gate. Before the gate's own shape,
    // deliberately, so a control that grew a prop reports the prop rather than reporting that
    // its `if` moved, which is the consequence rather than the defect.
    expect(control, `${DEV_CONTROL} declares an enabled prop`).not.toMatch(
      /\benabled\s*\??\s*:/,
    );
    expect(control, `${DEV_CONTROL} defaults a prop to the gate`).not.toContain(
      "enabled = isDevPersistenceEnabled()",
    );
    expect(control, `${DEV_CONTROL} does not return null when the gate is closed`).toMatch(
      /if\s*\(!isDevPersistenceEnabled\(\)\)\s*\{\s*return null;/,
    );

    // And no mount anywhere passes one, which is the same claim from the call site's side.
    const { rows } = await table();
    for (const file of population(rows)) {
      for (const found of file.source.matchAll(/<AchievementsDevPanel\b([^<]*?)\/>/gs)) {
        expect(
          /\benabled\s*[=:]/.test(found[1] ?? ""),
          `${file.path} mounts the dev control with an enabled prop`,
        ).toBe(false);
      }
    }
    // The floor under that loop: the control really is mounted somewhere, so a sweep that
    // found no mounts fails rather than passing.
    const mounts = population(rows).filter((file) =>
      /<AchievementsDevPanel\b/.test(file.source),
    );
    expect(
      mounts.map((file) => file.path),
      "nothing mounts the dev control",
    ).toEqual(["apps/web/src/city/AchievementsPanel.tsx"]);
  });
});
