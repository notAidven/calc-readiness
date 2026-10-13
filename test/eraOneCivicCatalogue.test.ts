import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type CapacityContribution, deriveCapacities, materialForEra } from "@cr/economy";
import {
  type CivicBuildingType,
  ERA_ONE_CIVIC_TYPES,
  ERA_ONE_FREE_CIVIC,
  type EraOneCivicTypeId,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * Era one's civic catalogue in code must be the catalogue era one's own document
 * authors. This is a whole-repository invariant rather than an engine unit test
 * because its subject is a spec FILE and a source table agreeing, and neither owns
 * the other: `docs/superpowers/specs/eras/era-01-prehistoric/civic-buildings.md`
 * section 3 is the authority, `engines/game/src/city-vitality-tuning.ts` is the
 * transcription, and either one can drift.
 *
 * ## What this file now carries that it did not, and why it is not a tidy-up
 *
 * It reads the **`Provides` column**, on all four axes. It used to check names,
 * footprints and costs only, which left the two capacity magnitudes — the numbers the
 * whole feature is about — unchecked in either direction. That gap became load-bearing
 * on 2026-07-29: #236 rebalanced era one by giving the Longhouse **5 happiness** to stop
 * the Smokehouse weakly dominating it, and a guard that reads no capacity column cannot
 * tell whether the code took the rebalance or ignored it.
 *
 * That matters beyond this file, because it is now the LINK IN A CHAIN. D-ERA24 is
 * asserted over the ten authored catalogues by `test/eraCivicCatalogueDominance.test.ts`,
 * which reads the markdown; this file is what binds era one's SHIPPED table to that same
 * markdown. Together they say "no shipped era-one row is weakly dominated". Separately,
 * his sweep could pass over a rebalanced document while our code still shipped the
 * dominated pair — which is exactly the state this guard was in before, and precisely the
 * job that `engines/game/src/livability-aggregation.test.ts` used to do by measuring era
 * one's dominance directly. That file is deleted, and this column is where its work went.
 *
 * ## Why the population is parsed rather than listed
 *
 * `Object.keys(ERA_ONE_CIVIC_TYPES)` would be the table checking itself: every row it
 * held would be a row it approved of, and a type quietly dropped from BOTH the sweep
 * and the catalogue would be invisible. The population is therefore the spec table's
 * own rows, and the assertion runs in both directions — a building in the document
 * with no price in the code fails, and a building in the code the document does not
 * name fails too.
 *
 * ## Why there is a floor under the parse, and why the floor EARNED its keep
 *
 * A regex against a Markdown table is exactly the kind of derivation that goes
 * silently empty: re-format the table, bold a different cell, swap the multiplication
 * sign, and the parse yields zero rows while every `for` loop below iterates nothing
 * and reports green. The floor is what makes that a failure.
 *
 * **It is not a hypothetical.** The previous regex ended `\|\s*(\d+) flint\s*\|`, and
 * #233 renamed era one's material to `stone` on the team lead's recognisability ruling.
 * The parse went to ZERO rows on the merge, and the floor is what caught it — the run
 * reported `expected 0 to be greater than or equal to 4` rather than passing over an
 * empty catalogue. So the material is no longer written down here at all: it is read
 * from `@cr/economy`'s `ERA_MATERIALS`, which is the thing #233 actually changed, and a
 * further rename now updates this parser by itself.
 *
 * The floor is a FLOOR and not an equality because O-12 leaves "whether four types is
 * the right number for era one" to Evan, so a fifth type must be able to land without
 * this file objecting.
 */

/**
 * REPO-ROOT-RELATIVE, NOT `../`-RELATIVE-TO-THIS-FILE, since 2026-07-30. `ciScopeFilter`
 * resolves every markdown a source names against the tree's own inventory so that CI can
 * tell which doc edits must run the code jobs, and a `../`-prefixed literal matches no
 * tracked path — so this file's read was invisible to the scope filter and the guard
 * failed on it at the merge. `join(repoRoot, …)` is the shape the other doc-reading tests
 * use and the shape that resolves.
 */
const ERA_ONE_SPEC = join(
  resolveRepoRoot(),
  "docs/superpowers/specs/eras/era-01-prehistoric/civic-buildings.md",
);

/** The four types era one authors today. The parse must never fall below this. */
const AUTHORED_TYPE_FLOOR = 4;

/**
 * Era one's material, from the module #233 renamed rather than from a literal here.
 * `materialForEraOrThrow` is not used: a null would mean era one's material had been
 * un-authored, which is a different failure and deserves its own message below.
 */
const ERA_ONE_MATERIAL = materialForEra("prehistoric");

interface SpecRow extends CapacityContribution {
  readonly name: string;
  readonly cells: number;
  readonly cost: number;
}

/**
 * `| **The Longhouse** | 2×2 (8×8u) | 20 livability + 5 happiness | 80 stone | ...`
 *
 * The material is INTERPOLATED from `ERA_MATERIALS` rather than spelled, so the shape
 * this file recognises tracks the shipped id. Capturing `(\w+)` instead and asserting it
 * afterwards was the alternative; it is weaker, because a row priced in the wrong
 * material would then parse successfully and be compared before anything objected.
 */
const CATALOGUE_ROW = new RegExp(
  String.raw`^\|\s*\*\*(The [^*]+)\*\*\s*\|\s*(\d+)\u00d7(\d+)[^|]*\|([^|]*)\|\s*([\d,]+) ` +
    `${ERA_ONE_MATERIAL?.id ?? "(?!)"}` +
    String.raw`\s*\|`,
);

/**
 * The `Provides` cell, pooled by the SHIPPED rule. Three term shapes, and an
 * unrecognised term throws rather than reading as a zero — a silent zero would make a
 * row look dominated, or make a magnitude mismatch look like agreement at 0 === 0.
 *
 * `food capacity for ~20` reads as LIVABILITY, and that mapping is the ruling itself:
 * under one pool a food row and a dwelling row are the same contribution
 * (`packages/economy/src/capacity.ts`).
 */
function amount(text: string | undefined, what: string, name: string): number {
  const value = text === undefined ? Number.NaN : Number(text.replace(/,/g, ""));
  if (!Number.isFinite(value)) {
    throw new Error(`era one/${name}: cannot read ${what} from "${text}"`);
  }
  return value;
}

function contributionOf(cell: string, name: string): CapacityContribution {
  const terms = cell.split("+").map((rawTerm): CapacityContribution => {
    const term = rawTerm.replace(/\*/g, "").trim();
    const food = term.match(/^food\b[^\d]*([\d,]+)/i);
    if (food) {
      return { livability: amount(food[1], "a food figure", name), happiness: 0 };
    }
    const livability = term.match(/^([\d,]+)\s+livability\b/i);
    if (livability) {
      return {
        livability: amount(livability[1], "a livability figure", name),
        happiness: 0,
      };
    }
    const happiness = term.match(/^([\d,]+)\s+happiness\b/i);
    if (happiness) {
      return { livability: 0, happiness: amount(happiness[1], "a happiness figure", name) };
    }
    throw new Error(
      `era one/${name}: cannot read the contribution "${term}". Known shapes are ` +
        `"food … for ~N", "N livability" and "N happiness". An unreadable term must ` +
        `fail rather than count as zero.`,
    );
  });
  // Pooled through the ruled function, so a blend row's two halves are added exactly as
  // the city adds them and this file holds no aggregation rule of its own.
  return deriveCapacities(terms);
}

function parseCatalogueRows(): SpecRow[] {
  const rows: SpecRow[] = [];
  for (const line of readFileSync(ERA_ONE_SPEC, "utf8").split("\n")) {
    const match = line.match(CATALOGUE_ROW);
    if (match) {
      const [, rawName, width, depth, provides, rawCost] = match;
      if (
        rawName === undefined ||
        width === undefined ||
        depth === undefined ||
        provides === undefined ||
        rawCost === undefined
      ) {
        throw new Error(
          `era one: the catalogue row "${line.trim()}" matched without all five of its ` +
            `cells, so it would otherwise be read with holes in it`,
        );
      }
      const name = rawName.trim();
      rows.push({
        name,
        cells: Number(width) * Number(depth),
        cost: amount(rawCost, "a cost", name),
        ...contributionOf(provides, name),
      });
    }
  }
  return rows;
}

const CIVIC_IDS = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];

describe("era one's civic catalogue matches the authored spec", () => {
  const rows = parseCatalogueRows();

  it("knows era one's material, so the parse is not looking for a renamed one", () => {
    // If this is null the regex above cannot match anything, and every assertion below
    // would fail on an empty parse without saying why. This says why.
    expect(
      ERA_ONE_MATERIAL,
      "era one's material is authored in @cr/economy",
    ).not.toBeNull();
    expect(ERA_ONE_MATERIAL?.id).toBeTruthy();
  });

  it("parses at least the four types era one authors (the floor)", () => {
    expect(rows.length).toBeGreaterThanOrEqual(AUTHORED_TYPE_FLOOR);
  });

  it("declares exactly the buildings the spec table declares, both ways", () => {
    const inSpec = [...rows.map((row) => row.name)].sort();
    const inCode = CIVIC_IDS.map((id) => ERA_ONE_CIVIC_TYPES[id].name).sort();
    expect(inCode).toEqual(inSpec);
  });

  it("prices, sizes AND provisions every one of them exactly as the spec does", () => {
    const byName = new Map<string, CivicBuildingType>(
      CIVIC_IDS.map((id) => [ERA_ONE_CIVIC_TYPES[id].name, ERA_ONE_CIVIC_TYPES[id]]),
    );
    expect(rows.length).toBeGreaterThanOrEqual(AUTHORED_TYPE_FLOOR);
    for (const row of rows) {
      const type = byName.get(row.name);
      expect(type, `${row.name} is priced in the code`).toBeDefined();
      if (!type) {
        continue;
      }
      expect(type.footprint[0] * type.footprint[1], `${row.name} footprint`).toBe(
        row.cells,
      );
      expect(type.cost, `${row.name} cost`).toBe(row.cost);
      // The two capacity magnitudes, which is what this file gained. Both directions of
      // the rebalance are covered: a code row that never took the Longhouse's 5
      // happiness fails here, and so does one that invented a magnitude the spec does
      // not authorise.
      expect(type.livability, `${row.name} livability`).toBe(row.livability);
      expect(type.happiness, `${row.name} happiness`).toBe(row.happiness);
    }
  });

  it("reads a real magnitude off every spec row, so no comparison is 0 === 0", () => {
    // The floor under the assertion above. Two rows that both parsed to nothing would
    // agree perfectly, so every parsed row must provide SOMETHING, and at least one must
    // carry each of the two capacities for the pair of assertions to have any grip.
    expect(rows.length).toBeGreaterThanOrEqual(AUTHORED_TYPE_FLOOR);
    for (const row of rows) {
      expect(
        row.livability + row.happiness,
        `${row.name} provides something`,
      ).toBeGreaterThan(0);
      expect(row.cost, `${row.name} costs something`).toBeGreaterThan(0);
      expect(row.cells, `${row.name} occupies ground`).toBeGreaterThan(0);
    }
    expect(rows.filter((row) => row.livability > 0).length).toBeGreaterThanOrEqual(2);
    expect(rows.filter((row) => row.happiness > 0).length).toBeGreaterThanOrEqual(2);
  });

  it("gives every type something to provide, so none is a decorative row", () => {
    expect(CIVIC_IDS.length).toBeGreaterThanOrEqual(AUTHORED_TYPE_FLOOR);
    for (const id of CIVIC_IDS) {
      const type = ERA_ONE_CIVIC_TYPES[id];
      expect(
        type.livability + type.happiness,
        `${type.name} provides something`,
      ).toBeGreaterThan(0);
    }
  });

  it("names a free starting building the catalogue contains, and it sustains", () => {
    // Era one section 4 corrects section 8.1's pre-agricultural "first farm": the free
    // building is the food row. Under one pool the test is that it contributes
    // LIVABILITY — a free amenity would leave the starting city unable to feed its
    // founders, which is what INV-ERA-4 forbids.
    expect(ERA_ONE_FREE_CIVIC.length).toBeGreaterThanOrEqual(1);
    for (const id of ERA_ONE_FREE_CIVIC) {
      expect(ERA_ONE_CIVIC_TYPES[id], id).toBeDefined();
      expect(ERA_ONE_CIVIC_TYPES[id].livability, id).toBeGreaterThan(0);
    }
  });
});
