import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  type CapacityContribution,
  type CivicCapacityProfile,
  capacityShortfall,
  deriveCapacities,
} from "@cr/economy";
import {
  buildingLedger,
  type CitizenNodeInput,
  type CitizenRoleId,
  deriveCityVitality,
  ERA_ONE_CIVIC_TYPES,
  ERA_ONE_FREE_CIVIC,
  type EraOneCivicTypeId,
  HUB_FOUNDING_LIVABILITY,
  pooledCapacities,
  pooledShortfall,
  residenceCapacity,
  roadHappinessCoverage,
  SKILL_HAPPINESS_BY_ROLE,
} from "@cr/game";
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

/**
 * **THE TWO CAPACITY MODELS IN THIS REPOSITORY ARE THE SAME MODEL, ASSERTED RATHER THAN
 * INTENDED.**
 *
 * ## Why there are two at all, which is a contract and not an oversight
 *
 * PR #236 ruled livability to be one pool (merged 2026-07-29T17:59:55Z) and the ruled
 * implementation is `packages/economy/src/capacity.ts`. The obvious reconciliation is for
 * `engines/game` to import `deriveCapacities` and delete its own arithmetic. **That was
 * tried first and a shipped invariant forbids it.**
 *
 * INV-COS-1 (`docs/Contracts_Amendment_Cosmetic_Economy.md`) says *"no economy field is
 * an input to any progression decision. Asserted structurally: the mastery service,
 * diagnostic engine, and isNeighborhoodReady() import NOTHING from the economy module."*
 * `packages/economy/src/one-way-invariant.test.ts` enforces exactly that, and its
 * population includes `engines/game/src` with the reason written in the list:
 * *"holds isNeighborhoodReady + the storm/checkpoint gates"*. The check is a regex over
 * the module specifier, so a `import type` fails it too.
 *
 * Adding the import turned that test red — `expected [] to deeply equal
 * ["engines/game/src/city-vitality-tuning.ts", "engines/game/src/city-vitality.test.ts",
 * "engines/game/src/city-vitality.ts"]`. **The right response to that red was not to widen
 * his population.** Loosening another lane's dependency invariant so that a HUD readout
 * can share a `+` is not a trade this lane may make, and `packages/economy` is Gabriel's:
 * a decision to let the game engine depend on the economy is his to take, in writing.
 *
 * **SO THE DUPLICATION STANDS AND NEEDS HIS SIGN-OFF, and this file is what makes it safe
 * to live with in the meantime.** `test/` is above both lanes and outside INV-COS-1's
 * scanned roots, so it may import both — which is also where
 * `eraCivicCatalogueDominance.test.ts` already imports `@cr/economy` from.
 *
 * ## Why a guard and not a promise
 *
 * Because the promise was already broken once, on the day this was written. For one day
 * `engines/game` held `aggregateLivability` with a `min` branch while `packages/economy`
 * held only the `+`. Neither module imported the other, so **git reported no conflict on
 * the forward-merge and not one test failed** — two contradicting capacity models sat in
 * one repository, invisible. That is the defect this file exists to catch, and it is a
 * measured event rather than a risk assessment.
 *
 * ## What is asserted, and how each part can fail
 *
 *  - **The row FIELDS still mirror his, checked by reading his source.** The obvious way
 *    to assert this is a type-position assignment, and **it would not work**: no tsconfig
 *    in this repository includes `test/`, so `tsc --build` never sees this file. Measured,
 *    not assumed — adding `const x: number = "not a number"` here leaves
 *    `npm run typecheck` exiting 0. A type-level assertion here is decoration, so the
 *    field names are parsed out of `packages/economy/src/capacity.ts` at runtime instead
 *    and asserted against the shipped rows, with a floor so an unparseable interface fails
 *    rather than exempting everything. (The assignment is kept below as documentation of
 *    intent, with no claim that anything enforces it.)
 *  - **The two derivations agree on every era-one city**, swept rather than sampled, with
 *    floors under the sweep and under the magnitudes so it cannot agree vacuously.
 *  - **The two mirrored FUNCTIONS agree with the ruled pair over a grid**, not only over
 *    the cities era one can produce. That distinction is load-bearing and was found the
 *    hard way: no era-one city is over its livability pool, so a wrong mirror of
 *    `happinessGap` agreed with the right one on every city, and the injection harness
 *    reported NOT CAUGHT until the grid was added.
 *  - **The agreement is falsifiable**, shown by feeding both functions an input on which a
 *    plausible wrong mirror (`min`, the reading that shipped for a day) would differ.
 *
 * ## Four more regions this file could not see, each found by an injection
 *
 * The grid closed the over-pool region and the file then read as solid, which is why the
 * question was asked again with a wider set of injections. Each of these passed 8/8
 * before the line that now catches it, and each is re-run in both directions:
 *
 *  - **ROADS.** Every city swept had `roadTileCount` unset, so `contributionsOf`'s road
 *    row was never built at all. Mis-routing road coverage from happiness into livability
 *    — a defect visible in the HUD, on a city era one really produces — passed. The sweep
 *    now carries a roaded half, and the floor asserts both halves and that the roads
 *    contribute something.
 *  - **FRACTIONAL contributions.** Every grid row was an integer, so a mirror that
 *    truncated each contribution agreed with one that did not.
 *  - **NEGATIVE contributions.** Every grid row was non-negative, so a mirror that clamped
 *    each row at zero agreed with one that summed them.
 *  - **ARITY 0 AND 1.** The pair sweep only ever compared two rows, so a mirror with an
 *    early return for an empty or a single-row list agreed everywhere it was asked.
 *
 * ## What is still NOT covered, recorded rather than left to be discovered
 *
 *  - **Road MAGNITUDE.** `roadHappinessCoverage` has no counterpart in the ruled model, so
 *    both sides of the roaded comparison read the same function. What is asserted is the
 *    routing — coverage reaches happiness and never livability — not the number.
 *  - **`tsc` STILL DOES NOT SEE THIS FILE**, so no claim here rests on a green build. That
 *    was re-measured rather than inherited: appending `const x: number = "not a number"`
 *    leaves `npm run typecheck` reporting the same errors it already had, none of them
 *    here. The file was instead checked under a throwaway project extending
 *    `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`) and is clean — and that
 *    project was itself proved to have the flag on, by watching an unguarded index error
 *    under it. The throwaway project is not committed, so this stays a one-off
 *    measurement and not a standing guarantee.
 */

/* -------------------------------------------------------------------------- */
/* The field mirror, read out of his source because tsc does not see this file  */
/* -------------------------------------------------------------------------- */

/**
 * Documentation of intent, NOT a guard. Nothing typechecks `test/`, so this assignment
 * cannot fail; the enforcement is {@link ruledFieldNames} below.
 */
const AS_RULED_PROFILES: Readonly<Record<EraOneCivicTypeId, CivicCapacityProfile>> =
  ERA_ONE_CIVIC_TYPES;

const CAPACITY_SOURCE = fileURLToPath(
  new URL("../packages/economy/src/capacity.ts", import.meta.url),
);

/**
 * The `readonly <name>: number;` fields declared by a named interface in his source.
 *
 * Throws rather than returning an empty set when the interface cannot be found or holds no
 * fields, because a silently empty set would make the assertion below pass over any table
 * at all — which is the whole failure mode this file was written to distrust.
 */
function ruledFieldNames(interfaceName: string): string[] {
  const source = readFileSync(CAPACITY_SOURCE, "utf8");
  const declaration = new RegExp(
    `interface\\s+${interfaceName}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`,
  ).exec(source);
  if (!declaration) {
    throw new Error(
      `capacity.ts declares no interface ${interfaceName}. The ruled contract has been ` +
        `renamed or restructured, so era one's mirror of it is unverified.`,
    );
  }
  // Indexed reads are unwrapped explicitly rather than asserted, because nothing
  // typechecks `test/` and an assertion here would be checked by nobody. A capture group
  // that failed to match drops out and is caught by the zero-fields floor below.
  const body = declaration[1];
  if (body === undefined) {
    throw new Error(
      `capacity.ts's ${interfaceName} matched with no body, so this guard would hold ` +
        `over any table. Refusing to report green.`,
    );
  }
  const fields = [...body.matchAll(/readonly\s+(\w+)\s*:\s*number\s*;/g)].flatMap(
    (match) => (match[1] === undefined ? [] : [match[1]]),
  );
  if (fields.length === 0) {
    throw new Error(
      `capacity.ts's ${interfaceName} parsed to zero numeric fields, so this guard would ` +
        `hold over any table. Refusing to report green.`,
    );
  }
  return fields;
}

/** And each row is a valid `CapacityContribution`, which is what the aggregator eats. */
function asContribution(id: EraOneCivicTypeId): CapacityContribution {
  const row: CapacityContribution = ERA_ONE_CIVIC_TYPES[id];
  return row;
}

/* -------------------------------------------------------------------------- */
/* Fixtures — the same D1 order the engine's own tests use                      */
/* -------------------------------------------------------------------------- */

const D1_ORDER: readonly { node_id: string; citizen_role: CitizenRoleId }[] = [
  { node_id: "NUM.S", citizen_role: "civic" },
  { node_id: "NUM.F", citizen_role: "civic" },
  { node_id: "NUM.2", citizen_role: "residence" },
  { node_id: "NUM.3", citizen_role: "school" },
  { node_id: "NUM.4", citizen_role: "civic" },
  { node_id: "NUM.5", citizen_role: "civic" },
];

function nodesAt(mastery: Readonly<Record<string, Mastery>>): CitizenNodeInput[] {
  return D1_ORDER.map((entry) => ({
    ...entry,
    placed: true,
    mastery: mastery[entry.node_id] ?? 0,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  }));
}

const ALL_MASTERED: Readonly<Record<string, Mastery>> = Object.fromEntries(
  D1_ORDER.map((entry) => [entry.node_id, 2 as Mastery]),
);

const CIVIC_IDS = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];

/**
 * The contribution rows for a city, built HERE from the tuning table and the ledger, so
 * that what is fed to `deriveCapacities` is assembled independently of the engine's own
 * `contributionsOf`. If the engine started dropping a source, this would still include it
 * and the totals would disagree.
 */
function rowsFor(
  ledger: readonly ReturnType<typeof buildingLedger>[number][],
  civic: readonly EraOneCivicTypeId[],
  roadTileCount: number,
): CapacityContribution[] {
  const rows: CapacityContribution[] = [
    { livability: HUB_FOUNDING_LIVABILITY, happiness: 0 },
    { livability: residenceCapacity(ledger), happiness: 0 },
    ...civic.map(asContribution),
    ...ledger
      .filter((entry) => entry.complete)
      .map((entry) => ({
        livability: 0,
        happiness: SKILL_HAPPINESS_BY_ROLE[entry.role],
      })),
  ];
  // Roads are era one's one contribution with no counterpart in the ruled model, so what
  // is asserted is the ROUTING and not the magnitude: coverage bought by a road network
  // lands on happiness and never on livability. The magnitude comes from
  // `roadHappinessCoverage` rather than a number written here, because a tuning change is
  // not the defect this is watching for and would only make the sweep brittle.
  const fromPaths = roadHappinessCoverage(roadTileCount);
  if (fromPaths > 0) {
    rows.push({ livability: 0, happiness: fromPaths });
  }
  return rows;
}

/**
 * Road states swept. `0` is every city this file used to have; the roaded state exists
 * because its absence was a hole — see the composition floor in the first test below.
 */
const ROAD_TILE_COUNTS: readonly number[] = [0, 7];

/**
 * Every era-one city worth sweeping: three ledgers x a spread of civic lists x road
 * states.
 */
const CITIES: readonly {
  readonly label: string;
  readonly ledger: ReturnType<typeof buildingLedger>;
  readonly civic: readonly EraOneCivicTypeId[];
  readonly roadTileCount: number;
}[] = (() => {
  const ledgers = [
    { label: "bare island", ledger: buildingLedger([]) },
    { label: "placed, unmastered", ledger: buildingLedger(nodesAt({})) },
    { label: "fully mastered", ledger: buildingLedger(nodesAt(ALL_MASTERED)) },
  ];
  const civicSets: { label: string; civic: readonly EraOneCivicTypeId[] }[] = [
    { label: "no civic", civic: [] },
    { label: "free civic", civic: ERA_ONE_FREE_CIVIC },
    { label: "one of each", civic: CIVIC_IDS },
    ...CIVIC_IDS.map((id) => ({
      label: `four ${id}`,
      civic: new Array<EraOneCivicTypeId>(4).fill(id),
    })),
  ];
  return ledgers.flatMap(({ label, ledger }) =>
    civicSets.flatMap((set) =>
      ROAD_TILE_COUNTS.map((roadTileCount) => ({
        label: `${label} / ${set.label} / ${roadTileCount} road tiles`,
        ledger,
        civic: set.civic,
        roadTileCount,
      })),
    ),
  );
})();

describe("engines/game and @cr/economy hold ONE capacity model", () => {
  it("sweeps a real population of cities, so nothing below agrees vacuously", () => {
    // 3 ledgers x (3 + 4 civic sets) x 2 road states = 42 cities when written. Floors on
    // the sweep itself, and on the catalogue it is built from, because an empty catalogue
    // would collapse every civic list to `[]` and reduce 42 cities to 6.
    expect(CITIES.length).toBeGreaterThanOrEqual(36);
    expect(CIVIC_IDS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(CITIES.map((city) => city.label)).size).toBe(CITIES.length);

    // A FLOOR CONSTRAINS SIZE, NOT SHAPE, and here the shape is the claim. Every city
    // this file swept had no roads, so the road contribution was never exercised at all:
    // mis-routing it from happiness into livability left the whole file reporting
    // 8 passed. That is measured, not feared. So the roaded half is asserted to exist,
    // the roadless half with it, and the roads are asserted to actually contribute —
    // a tuning change to zero per tile would otherwise make the roaded half
    // indistinguishable from the roadless one while every count above still held.
    const roaded = CITIES.filter((city) => city.roadTileCount > 0);
    expect(roaded.length, "roaded cities are swept").toBeGreaterThanOrEqual(18);
    expect(
      CITIES.length - roaded.length,
      "roadless cities are swept too",
    ).toBeGreaterThanOrEqual(18);
    expect(
      roaded.filter((city) => roadHappinessCoverage(city.roadTileCount) > 0).length,
      "a roaded city must actually carry a road contribution",
    ).toBe(roaded.length);
  });

  it("agrees with deriveCapacities on BOTH capacities, for every city", () => {
    let sawLivability = 0;
    let sawHappiness = 0;
    const distinctTotals = new Set<string>();

    for (const { label, ledger, civic, roadTileCount } of CITIES) {
      const ours = deriveCityVitality({
        ledger,
        civic: civic.map(asContribution),
        roadTileCount,
      });
      const ruled = deriveCapacities(rowsFor(ledger, civic, roadTileCount));

      expect(ours.livability.sustains, `${label} livability`).toBe(ruled.livability);
      expect(ours.happiness.coverage, `${label} happiness`).toBe(ruled.happiness);

      if (ruled.livability > 0) {
        sawLivability += 1;
      }
      if (ruled.happiness > 0) {
        sawHappiness += 1;
      }
      distinctTotals.add(`${ruled.livability}/${ruled.happiness}`);
    }

    // Floors under the magnitudes: an agreement at 0 === 0 across the board would satisfy
    // the loop above, and so would an agreement on one constant repeated 21 times.
    expect(sawLivability).toBe(CITIES.length);
    expect(sawHappiness).toBeGreaterThanOrEqual(12);
    expect(distinctTotals.size).toBeGreaterThanOrEqual(10);
  });

  it("agrees with capacityShortfall on both numbers, for every city", () => {
    let sawAGap = 0;
    for (const { label, ledger, civic, roadTileCount } of CITIES) {
      const ours = deriveCityVitality({
        ledger,
        civic: civic.map(asContribution),
        roadTileCount,
      });
      const ruled = capacityShortfall(
        deriveCapacities(rowsFor(ledger, civic, roadTileCount)),
        ours.population,
      );
      expect(ours.shortfalls.livability, `${label} unsustained`).toBe(ruled.unsustained);
      expect(ours.shortfalls.happiness, `${label} happinessGap`).toBe(ruled.happinessGap);
      if (ruled.happinessGap > 0) {
        sawAGap += 1;
      }
    }
    // The shortfall agreement was tested on cities that actually HAD a shortfall.
    expect(sawAGap).toBeGreaterThanOrEqual(8);
  });

  it("is falsifiable: the reading that shipped for a day would disagree here", () => {
    // What makes the sweep above evidence rather than decoration. A food row and a
    // dwelling row, which under #218's limiting-factor reading came to `min(20, 20) = 20`
    // and under the ruling come to 40. If the mirror in `engines/game` ever reverted to
    // `min`, the sweep would fail — and this is the pair on which it would fail first.
    const foodRow: CapacityContribution = asContribution("smokehouse");
    const dwellingRow: CapacityContribution = asContribution("longhouse");
    expect(foodRow.livability).toBe(20);
    expect(dwellingRow.livability).toBe(20);
    expect(deriveCapacities([foodRow, dwellingRow]).livability).toBe(40);
    expect(deriveCapacities([foodRow, dwellingRow]).livability).not.toBe(
      Math.min(foodRow.livability, dwellingRow.livability),
    );

    // And the same pair through OUR derivation, on a real city, so the falsifiability is
    // a property of the shipped path and not only of his function.
    const ledger = buildingLedger([]);
    const pooled = deriveCityVitality({
      ledger,
      civic: [asContribution("smokehouse"), asContribution("longhouse")],
    }).livability.sustains;
    const bare = deriveCityVitality({ ledger, civic: [] }).livability.sustains;
    expect(pooled - bare).toBe(40);
  });

  /**
   * THIS BLOCK EXISTS BECAUSE ITS FIRST VERSION WAS DECORATIVE, and the injection harness
   * said so rather than a reviewer noticing.
   *
   * The first version asserted `capacityShortfall({livability: 30, happiness: 9}, 44)` ===
   * `{14, 21}` — HIS function only. It pinned his semantics and said nothing about whether
   * ours mirrored them, so `output/capacity-reconcile-injections.mjs` could change our
   * `sustained - happiness` to `people - happiness` and the whole file still reported
   * green: **NOT CAUGHT**. The reason is the finding above — no era-one city is over its
   * livability pool, so every city routed through `deriveCityVitality` has
   * `sustained === people` and the wrong mirror is indistinguishable from the right one.
   *
   * So the two mirrors are exported and swept against the ruled pair over a GRID that
   * includes the region era one cannot reach. Same injection now fails here.
   */
  const GRID: readonly CapacityContribution[] = [
    { livability: 0, happiness: 0 },
    { livability: 5, happiness: 9 },
    { livability: 30, happiness: 9 },
    { livability: 30, happiness: 44 },
    { livability: 44, happiness: 9 },
    { livability: 52, happiness: 9 },
    { livability: 72, happiness: 49 },
    { livability: 100, happiness: 100 },
    // Two rows era one's catalogue cannot author, which is the entire point of a grid.
    // Both were added after an injection went uncaught over the eight above: with no
    // FRACTIONAL row a mirror that truncates each contribution agrees with one that does
    // not, and with no NEGATIVE row a mirror that clamps each row at zero agrees with one
    // that sums them. Halves are used rather than thirds so the two sides are compared on
    // exactly representable arithmetic and a disagreement means a disagreement.
    { livability: 2.5, happiness: 1.5 },
    { livability: -6, happiness: -4 },
  ];
  const POPULATIONS: readonly number[] = [0, 1, 8, 20, 44, 120];

  it("mirrors capacityShortfall over inputs era one cannot reach, including over-pool", () => {
    let overPool = 0;
    let gapBelowUncovered = 0;

    for (const capacities of GRID) {
      for (const population of POPULATIONS) {
        const ours = pooledShortfall(capacities, population);
        const ruled = capacityShortfall(capacities, population);
        const where = `livability ${capacities.livability}, happiness ${capacities.happiness}, pop ${population}`;
        expect(ours.unsustained, `${where}: unsustained`).toBe(ruled.unsustained);
        expect(ours.happinessGap, `${where}: happinessGap`).toBe(ruled.happinessGap);

        if (ruled.unsustained > 0) {
          overPool += 1;
        }
        // The cases that DISTINGUISH the two candidate mirrors: measuring against the
        // whole population would give a bigger number here.
        const naive = Math.max(0, population - capacities.happiness);
        if (naive > ruled.happinessGap) {
          gapBelowUncovered += 1;
        }
      }
    }

    // Floors. Without the third, the grid could drift to inputs on which both candidate
    // mirrors agree, and this test would go quietly decorative again.
    expect(GRID.length * POPULATIONS.length).toBeGreaterThanOrEqual(40);
    expect(overPool).toBeGreaterThanOrEqual(15);
    expect(
      gapBelowUncovered,
      "the grid must contain cases where the naive mirror would differ",
    ).toBeGreaterThanOrEqual(10);
  });

  it("mirrors deriveCapacities over the same grid, at every arity", () => {
    // The other half of the pair, swept the same way so neither mirror is checked only
    // through the cities era one happens to produce.
    //
    // ARITIES 0 AND 1 ARE SWEPT because a pair sweep never reaches them, and an
    // aggregation is exactly the kind of function whose empty and singleton cases get
    // their own branch. Measured: a mirror returning a sentinel for a 0-row or a 1-row
    // list passed this file 8/8 while only pairs were compared.
    const rowLists: CapacityContribution[][] = [[]];
    GRID.forEach((first, i) => {
      rowLists.push([first]);
      for (const second of GRID.slice(i)) {
        rowLists.push([first, second]);
      }
    });

    let nonTrivial = 0;
    const arities = new Set<number>();
    for (const rows of rowLists) {
      const ours = pooledCapacities(rows);
      const ruled = deriveCapacities(rows);
      const where =
        rows.map((row) => `${row.livability}/${row.happiness}`).join(" + ") || "no rows";
      expect(ours.livability, `${where} livability`).toBe(ruled.livability);
      expect(ours.happiness, `${where} happiness`).toBe(ruled.happiness);
      arities.add(rows.length);

      // A `min` mirror would differ from a `+` on any pair of distinct positives.
      const [first, second] = rows;
      if (
        first &&
        second &&
        first.livability > 0 &&
        second.livability > 0 &&
        ruled.livability !== Math.min(first.livability, second.livability)
      ) {
        nonTrivial += 1;
      }
    }

    expect(nonTrivial).toBeGreaterThanOrEqual(20);
    expect([...arities].sort(), "0 and 1 rows are aggregations too").toEqual([0, 1, 2]);

    // Composition floors on the grid itself. A size floor would survive the grid drifting
    // back to the all-non-negative-integer rows on which a truncating or a clamping
    // mirror cannot be told apart from the right one.
    expect(
      GRID.some(
        (row) => !Number.isInteger(row.livability) || !Number.isInteger(row.happiness),
      ),
      "the grid must contain a fractional row",
    ).toBe(true);
    expect(
      GRID.some((row) => row.livability < 0 || row.happiness < 0),
      "the grid must contain a negative row",
    ).toBe(true);
  });

  it("carries every field the ruled contract declares, read from his source", () => {
    // The population is HIS interface's fields, parsed out of `capacity.ts`, not a list
    // written here — so a field he adds to the contract fails this test in era one's table
    // instead of being quietly absent from a hardcoded triple.
    const contribution = ruledFieldNames("CapacityContribution");
    const profile = ruledFieldNames("CivicCapacityProfile");
    const required = [...new Set([...contribution, ...profile])];

    // Floors: the parse found a real interface with real fields. Without these, a
    // refactor that renamed either interface would empty `required` and every loop below
    // would iterate nothing.
    expect(contribution).toEqual(expect.arrayContaining(["livability", "happiness"]));
    expect(profile).toContain("cost");
    expect(required.length).toBeGreaterThanOrEqual(3);

    const ids = Object.keys(AS_RULED_PROFILES) as EraOneCivicTypeId[];
    expect(ids.length).toBeGreaterThanOrEqual(4);
    for (const id of ids) {
      const row = ERA_ONE_CIVIC_TYPES[id] as unknown as Record<string, unknown>;
      for (const field of required) {
        expect(typeof row[field], `${id}.${field} mirrors the ruled contract`).toBe(
          "number",
        );
      }
      expect(ERA_ONE_CIVIC_TYPES[id].cost, id).toBeGreaterThan(0);
      expect(
        ERA_ONE_CIVIC_TYPES[id].livability + ERA_ONE_CIVIC_TYPES[id].happiness,
        id,
      ).toBeGreaterThan(0);
    }
  });

  it("declares no housing or food field, which is the deletion #236 made", () => {
    // The other direction. The ruled contract dropped the two sub-fields; a row here that
    // still carried one would be the old model wearing the new one's field names.
    for (const id of CIVIC_IDS) {
      const row = ERA_ONE_CIVIC_TYPES[id] as unknown as Record<string, unknown>;
      expect(Object.keys(row), id).not.toContain("housing");
      expect(Object.keys(row), id).not.toContain("food");
      expect(Object.keys(row), id).not.toContain("cost_flint");
    }
    // Floor, since "does not contain" holds over an empty table.
    expect(CIVIC_IDS.length).toBeGreaterThanOrEqual(4);
  });
});
