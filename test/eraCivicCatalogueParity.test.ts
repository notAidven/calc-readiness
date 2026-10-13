/**
 * **THE SHIPPED CATALOGUE AND THE AUTHORED TABLES ARE THE SAME FORTY ROWS.**
 *
 * The forty civic buildings exist twice: as ten markdown tables under
 * `docs/superpowers/specs/eras/<era>/civic-buildings.md`, which is where they are
 * AUTHORED and argued for, and as `CIVIC_CATALOGUE` in `@cr/economy`, which is what
 * code reads. Two copies of a number is normally a defect; this file is the reason
 * it is not one here.
 *
 * ## Why two copies at all
 *
 * The markdown cannot be the copy code reads. `@cr/economy` is a ZERO-I/O package
 * imported by the browser app and, later, a Lambda — neither ships `docs/`, and
 * putting `node:fs` in it would end the property that makes it testable. Generating
 * the module from the markdown was the other candidate and was rejected: those files
 * are prose first, carrying struck-through rows, dated amendment blocks and
 * editorial columns no code will ever read, and three other agents edit them. A
 * build that breaks when someone reformats a table is a bad trade.
 *
 * So the markdown stays the authoring surface, the module stays the shipped copy,
 * and **the drift they would otherwise be free to develop is what this file
 * forbids.**
 *
 * ## It is a PARTITION, in both directions, not a checklist
 *
 * The failure mode a parity test invites is the one `.cursor/rules/qa-verification.mdc`
 * documents: a list of rows someone remembered to check, which passes forever while
 * the row nobody listed drifts. So nothing here is written down. The population is
 * the union of both sides' keys, and it is asserted as a partition:
 *
 *  - **Every markdown row has exactly one shipped row** — a row added to a table
 *    with no module entry fails.
 *  - **Every shipped row has exactly one markdown row** — an invented row fails.
 *  - **Matched pairs agree on every field this test can see**: footprint width AND
 *    depth (not merely area), cost, livability, happiness, and the era material the
 *    cost is denominated in.
 *  - **The derived role agrees with the authored one**, and each era's four roles
 *    are themselves a partition of the four. That is what makes O-4's teardown
 *    pricing resolvable, so it is asserted rather than assumed.
 *
 * With set equality in both directions there is no list to go stale, and the floors
 * below stop the whole thing passing over an empty population.
 *
 * ## Its parser is deliberately its own
 *
 * `eraCivicCatalogueDominance.test.ts` parses the same tables and keeps doing so,
 * unchanged — it is the D-ERA24 non-dominance guard, it has no skip path left, and
 * repointing it at the module would have made it a guard over a copy. This file does
 * not share its reader: it needs fields that one discards (footprint SHAPE rather
 * than area, the cost cell's material) and it must not fail for that one's reasons.
 * Two independent readers agreeing on forty rows is stronger evidence than one.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CIVIC_CATALOGUE,
  CIVIC_ROLES,
  type CivicBuildingDefinition,
  type CivicRole,
  ERA_MATERIALS,
} from "@cr/economy";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ERAS_DIR = "docs/superpowers/specs/eras";
const CATALOGUE_FILE = "civic-buildings.md";

const repoRoot = resolveRepoRoot();

/** A row exactly as the markdown states it, with nothing inferred. */
interface AuthoredRow {
  readonly eraFolder: string;
  readonly name: string;
  readonly width: number;
  readonly depth: number;
  readonly cost: number;
  /** The word after the number in the `Cost` cell — "80 **stone**". */
  readonly material: string;
  readonly livability: number;
  readonly happiness: number;
  /** True when the `Provides` cell names food, which only a food row's does. */
  readonly namesFood: boolean;
}

function eraFolders(): string[] {
  return readdirSync(join(repoRoot, ERAS_DIR), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^era-\d\d-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.replace(/\*\*/g, "").trim());
}

function isDelimiterRow(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

/**
 * The one table in an era's file whose header carries all four columns. Found by
 * header and read by column NAME, never by position: era one's table carries three
 * efficiency columns where the later nine carry `Wins on` / `Loses on`.
 *
 * Throws when it is not exactly one. An era whose table cannot be found must not
 * drop silently out of the population — that is the single failure that would make
 * every assertion below vacuous for that era.
 */
function catalogueTable(eraFolder: string, markdown: string): string[][] {
  const required = ["building", "footprint", "provides", "cost"];
  const lines = markdown.split("\n");
  const lineAt = (index: number): string => lines[index] ?? "";
  const found: string[][][] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lineAt(index).trim().startsWith("|")) {
      continue;
    }
    const block: string[][] = [];
    while (index < lines.length && lineAt(index).trim().startsWith("|")) {
      block.push(tableCells(lineAt(index)));
      index += 1;
    }
    const header = (block[0] ?? []).map((cell) => cell.toLowerCase());
    if (required.every((column) => header.some((cell) => cell.startsWith(column)))) {
      found.push(block);
    }
  }

  const table = found[0];
  if (found.length !== 1 || table === undefined) {
    throw new Error(
      `${eraFolder}/${CATALOGUE_FILE}: expected exactly one table with columns ` +
        `${required.join(", ")}, found ${found.length}. The catalogue cannot be ` +
        `read, so this era would otherwise be compared as if it held no rows.`,
    );
  }
  return table;
}

function columnIndex(header: readonly string[], column: string, era: string): number {
  const index = header.findIndex((cell) => cell.toLowerCase().startsWith(column));
  if (index < 0) {
    throw new Error(`${era}: catalogue table has no ${column} column`);
  }
  return index;
}

function wholeNumber(text: string | undefined, what: string, where: string): number {
  const value = text === undefined ? Number.NaN : Number(text.replace(/,/g, ""));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${where}: cannot read ${what} from "${text}"`);
  }
  return value;
}

/**
 * The `Cost` cell as an amount and a material, with the cell's SHAPE asserted.
 *
 * This read the first two whitespace-delimited tokens and trusted them, which is fine on
 * the forty cells that exist and wrong the moment one gains a word: `"6 cells at 3,680
 * gems"` parses as an amount of **6** in a material called `cells`. Here that shows up as a
 * failed comparison against the module, which is the whole point of a census — but the
 * failure then reads as *the module disagrees about a price* rather than *the document is
 * unparseable*, which sends the next reader to the wrong file. Named separately in
 * `eraCivicCatalogueDominance.test.ts`, where the same hole reported 27 passed over a
 * mis-read row because that file has no second reader to catch it.
 *
 * All forty cells are exactly `<amount> <material>`. That is the contract now.
 */
function costCell(
  cell: string,
  where: string,
): { readonly amount: number; readonly material: string } {
  const match = cell.match(/^([\d,]+)\s+([A-Za-z_]+)$/);
  const material = match?.[2];
  if (match === null || material === undefined) {
    throw new Error(
      `${where}: the Cost cell must be exactly "<amount> <material>" and is "${cell}". ` +
        `A freer cell parses as a number that is not the cost, in a material that is not ` +
        `a material — see this function's docblock.`,
    );
  }
  return {
    amount: wholeNumber(match[1], "a cost", where),
    material: material.toLowerCase(),
  };
}

/** `2×1 (8×4u)` and `2×2` both read as width × depth. The FIRST pair is the grid. */
function footprint(cell: string, where: string): { width: number; depth: number } {
  const match = cell.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (match === null) {
    throw new Error(`${where}: cannot read a footprint from "${cell}"`);
  }
  return { width: Number(match[1]), depth: Number(match[2]) };
}

/**
 * The `Provides` cell as the two capacities plus whether it names food.
 *
 * An unrecognised term THROWS rather than reading as zero: a silent zero here would
 * make a row look like it contributes nothing, and this test would then cheerfully
 * report that the module disagrees with it about a number neither of them holds.
 */
function provided(
  cell: string,
  where: string,
): {
  livability: number;
  happiness: number;
  namesFood: boolean;
} {
  let livability = 0;
  let happiness = 0;
  let namesFood = false;

  for (const rawTerm of cell.split("+")) {
    const term = rawTerm.replace(/\*/g, "").trim();
    const food = term.match(/^food\b[^\d]*([\d,]+)/i);
    if (food) {
      // The pooled ruling: food and housing are one livability pool, so a food
      // figure IS a livability figure. This mapping is the flip.
      livability += wholeNumber(food[1], "a food figure", where);
      namesFood = true;
      continue;
    }
    const liv = term.match(/^([\d,]+)\s+livability\b/i);
    if (liv) {
      livability += wholeNumber(liv[1], "a livability figure", where);
      continue;
    }
    const hap = term.match(/^([\d,]+)\s+happiness\b/i);
    if (hap) {
      happiness += wholeNumber(hap[1], "a happiness figure", where);
      continue;
    }
    throw new Error(
      `${where}: cannot read the contribution "${term}". Known shapes are ` +
        `"food … for ~N", "N livability" and "N happiness".`,
    );
  }
  return { livability, happiness, namesFood };
}

function readAuthored(eraFolder: string): AuthoredRow[] {
  const markdown = readFileSync(
    join(repoRoot, ERAS_DIR, eraFolder, CATALOGUE_FILE),
    "utf8",
  );
  const table = catalogueTable(eraFolder, markdown);
  const header = table[0];
  if (header === undefined) {
    throw new Error(
      `${eraFolder}/${CATALOGUE_FILE}: the catalogue table has no header row`,
    );
  }
  const nameColumn = columnIndex(header, "building", eraFolder);
  const footprintColumn = columnIndex(header, "footprint", eraFolder);
  const providesColumn = columnIndex(header, "provides", eraFolder);
  const costColumn = columnIndex(header, "cost", eraFolder);

  return table
    .slice(1)
    .filter((cells) => !isDelimiterRow(cells))
    .map((cells) => {
      const cellAt = (column: number, what: string): string => {
        const value = cells[column];
        if (value === undefined) {
          throw new Error(
            `${eraFolder}: a catalogue row has no ${what} cell — "${cells.join(" | ")}"`,
          );
        }
        return value;
      };
      const name = cellAt(nameColumn, "Building");
      const where = `${eraFolder}/${name}`;
      const { width, depth } = footprint(cellAt(footprintColumn, "Footprint"), where);
      const capacity = provided(cellAt(providesColumn, "Provides"), where);
      // "1,280 coins" -> amount, material, with the cell's shape asserted.
      const cost = costCell(cellAt(costColumn, "Cost"), where);
      return {
        eraFolder,
        name,
        width,
        depth,
        cost: cost.amount,
        material: cost.material,
        livability: capacity.livability,
        happiness: capacity.happiness,
        namesFood: capacity.namesFood,
      };
    });
}

/**
 * The role a row's own numbers imply, independent of what the module authored.
 *
 * Derived so the authored `role` is CHECKED rather than trusted. The module authors
 * it deliberately — a shipped module should not classify buildings by heuristic —
 * and this is the other half of that bargain.
 */
function derivedRole(row: AuthoredRow): CivicRole {
  if (row.namesFood) {
    return "food";
  }
  if (row.livability === 0) {
    return "amenity";
  }
  if (row.happiness > 0 && row.livability === row.happiness) {
    return "blend";
  }
  return "dwelling";
}

/** `era-01-prehistoric` -> `prehistoric`, via the shipped sequence, never by slicing. */
function eraIdForFolder(eraFolder: string): EraId {
  const ordinal = Number(eraFolder.slice(4, 6));
  const era = ERA_SEQUENCE[ordinal - 1];
  if (era === undefined) {
    throw new Error(
      `${eraFolder}: no era at position ${ordinal} of ${ERA_SEQUENCE.length}`,
    );
  }
  return era.id;
}

/** The material id an era mints. Every era mints one; nine render defaulted words. */
function materialIdForEra(eraId: EraId): string {
  return ERA_MATERIALS[eraId].material.id;
}

/**
 * **`DOC_MATERIAL_LAG` — the declared, transient divergences between the word an era's
 * document prices its catalogue in and the id the module ships.**
 *
 * A named exception rather than a quietly narrowed population, per
 * `.cursor/rules/qa-verification.mdc`: an era that legitimately does not owe agreement
 * and an era that forgot to agree look identical from outside this file, so the first
 * is written down with its reason and the second must fail.
 *
 * ## Why an exception is the right shape HERE, where it is not for a NAME rename
 *
 * **THIS IS THE SEAM THAT COST A MERGE, so the reasoning is written down rather than
 * re-derived.** #244 renamed fifteen of the forty buildings while this census was
 * already on integration, which made the two PRs symmetric poison: whichever merged
 * first left the other side stale and integration red.
 *
 * Two things rule an exception out for that case and in for this one.
 *
 * **1. A rename breaks the JOIN KEY; a material divergence breaks a FIELD.** `material`
 * is compared on a matched pair, so a divergence is one failing assertion on a row that
 * still joins, and an exception has somewhere to attach. A display NAME is the key, so a
 * divergence shatters the population: set equality fails in both directions and every
 * field assertion on the row goes with it. There is no matched pair left to except.
 *
 * **2. A TWO-WAY PIN CANNOT BRIDGE TWO INDEPENDENT MERGES.** This is the load-bearing
 * finding, and it is about the mechanism rather than about names. A two-way pin is
 * DESIGNED to fail the day the other side catches up — that failure is what stops it
 * becoming permanent by neglect. It works when the same owner closes both halves, so the
 * failure is that owner's to-do list. It is exactly wrong when the other side is closed
 * by SOMEONE ELSE'S MERGE, because then the pin's intended failure lands on integration
 * rather than on the person who can fix it. Landing a rename behind a pin therefore
 * guarantees a red window; it does not avoid one.
 *
 * Era five's lag is the first case: nobody else's merge closes it, because #244 HOLDs
 * `coins` on instruction. The fifteen renames were the second, and they were resolved by
 * carrying both sides in one change instead — see this branch's merge commit.
 *
 * A third option, a one-way rename table accepting either spelling, would have been
 * order-independent and is rejected on the rule's own terms: it leaves 15 of 40 rows
 * uncovered with no forcing function to remove it, which is the "exception becoming
 * permanent by neglect" the rule names.
 *
 * ## Asserted in BOTH directions, which is what makes it deletable on sight
 *
 *  - **An entry that stops qualifying FAILS.** The day era five's document is edited to
 *    say `gold`, the divergence this excuses no longer exists and the census below
 *    reports it. So a listed era cannot sit here forever exempting nothing.
 *  - **An era that diverges without being listed FAILS.** The population is DERIVED
 *    from the two sources and compared to this list by set equality, so a new lag
 *    cannot slip in behind an existing entry.
 *
 * Both are the same assertion read in two directions, which is the only form that
 * cannot rot. It is also injectable in one line: add an era to this list that does not
 * diverge, or remove the one that does, and the census fails at that era by name.
 */
const DOC_MATERIAL_LAG: readonly {
  readonly era: EraId;
  /** The word the era's `civic-buildings.md` prices its four rows in. */
  readonly documented: string;
  /** The id `ERA_MATERIALS` ships. */
  readonly shipped: string;
  readonly why: string;
}[] = [
  {
    era: "medieval",
    documented: "coins",
    shipped: "gold",
    // The document is not merely stale here, it PREDICTED this state and named the
    // trigger: "the lead offered `gold` and it is UNAVAILABLE … era five takes `gold`
    // the day D-ERA13's gold-drop frees the word". That day is now, and the word is
    // free, so the module has moved. The document is another owner's file and #244 —
    // the naming pass over all ten era guides — holds era five's `coins` deliberately
    // on instruction, so it does not move in that pass either. This entry is what keeps
    // the census honest in between, and it comes out the day that HOLD is lifted.
    why: "#244 HOLDs era five's `coins` on instruction; the gold-drop has already taken the id",
  },
];

const materialLagByEra = new Map(DOC_MATERIAL_LAG.map((entry) => [entry.era, entry]));

/** The material word an era's document is EXPECTED to use, lag included. */
function documentedMaterialFor(eraId: EraId): string {
  return materialLagByEra.get(eraId)?.documented ?? materialIdForEra(eraId);
}

const folders = eraFolders();
const authored = folders.flatMap(readAuthored);
const authoredKey = (row: AuthoredRow): string =>
  `${eraIdForFolder(row.eraFolder)}/${row.name}`;
const shippedKey = (b: CivicBuildingDefinition): string => `${b.era}/${b.name}`;

const authoredByKey = new Map(authored.map((row) => [authoredKey(row), row]));
const shippedByKey = new Map(CIVIC_CATALOGUE.map((b) => [shippedKey(b), b]));

describe("both catalogues are read, in full, before anything is compared", () => {
  it("reads ten era folders of four rows each, and no key repeats", () => {
    expect(folders.length).toBeGreaterThanOrEqual(10);
    expect(authored.length).toBeGreaterThanOrEqual(40);
    expect(CIVIC_CATALOGUE.length).toBeGreaterThanOrEqual(40);
    for (const folder of folders) {
      expect(
        authored.filter((row) => row.eraFolder === folder).length,
        `${folder} lost rows`,
      ).toBeGreaterThanOrEqual(4);
    }
    // Keys must be unique on BOTH sides, or set equality below could hold while a
    // duplicate masked a missing row.
    expect(authoredByKey.size).toBe(authored.length);
    expect(shippedByKey.size).toBe(CIVIC_CATALOGUE.length);
  });

  it("gives every authored row all four axes, with nothing defaulted to zero", () => {
    for (const row of authored) {
      expect(row.width * row.depth, authoredKey(row)).toBeGreaterThan(0);
      expect(row.cost, authoredKey(row)).toBeGreaterThan(0);
      expect(row.livability + row.happiness, authoredKey(row)).toBeGreaterThan(0);
      expect(row.material, authoredKey(row)).not.toBe("");
    }
  });

  it("keeps every shipped id unique, so a placement can never be ambiguous", () => {
    const ids = CIVIC_CATALOGUE.map((building) => building.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the two catalogues are the SAME POPULATION (both directions)", () => {
  it("matches key for key, with nothing on either side unaccounted for", () => {
    // The partition, as one assertion. Sorted set equality rather than two
    // containment checks, because containment in one direction is satisfied by a
    // subset and would pass over a shipped row nobody authored.
    expect([...shippedByKey.keys()].sort()).toEqual([...authoredByKey.keys()].sort());
  });

  it("names what is missing rather than only that something is", () => {
    // The same claim, reported usefully. A bare set-equality failure on forty keys
    // is unreadable; this is what a human will actually act on.
    const onlyAuthored = [...authoredByKey.keys()].filter((k) => !shippedByKey.has(k));
    const onlyShipped = [...shippedByKey.keys()].filter((k) => !authoredByKey.has(k));
    expect(
      { onlyAuthored, onlyShipped },
      "a row exists on one side only. If this is a RENAME, change both sides " +
        "together; the shipped `id` is stable and must not change with a display name.",
    ).toEqual({ onlyAuthored: [], onlyShipped: [] });
  });
});

describe.each(CIVIC_CATALOGUE.map((b) => [shippedKey(b), b] as const))(
  "%s agrees with its authored row on every field",
  (key, building) => {
    it("has an authored row at all", () => {
      expect(authoredByKey.get(key)).toBeDefined();
    });

    it("agrees on footprint SHAPE, not merely on area", () => {
      const row = authoredByKey.get(key);
      // Shape rather than area on purpose: 1×2 and 2×1 occupy the same two cells and
      // are different buildings to place. Era three's Fields are 1×2 where era two's
      // Granary is 2×1, and an area-only check could not tell them apart.
      expect({
        width: building.footprint.width,
        depth: building.footprint.depth,
      }).toEqual({ width: row?.width, depth: row?.depth });
    });

    it("agrees on cost, and on the material that cost is denominated in", () => {
      const row = authoredByKey.get(key);
      expect(building.cost).toBe(row?.cost);
      // Ties the catalogue to `ERA_MATERIALS`, so a rename that lands in code but not
      // in the era docs (or the reverse) fails HERE rather than shipping a catalogue
      // priced in a material the era does not mint.
      //
      // The document side goes through {@link documentedMaterialFor}, which is the
      // module's id for nine eras and a DECLARED lag for the tenth. The module side is
      // never excused: a shipped row must always agree with `ERA_MATERIALS`.
      expect(row?.material).toBe(documentedMaterialFor(building.era));
      expect(building.material).toBe(materialIdForEra(building.era));
    });

    it("agrees on both capacity contributions", () => {
      const row = authoredByKey.get(key);
      expect(building.provides).toEqual({
        livability: row?.livability,
        happiness: row?.happiness,
      });
    });

    it("carries the role its own numbers imply", () => {
      const row = authoredByKey.get(key);
      expect(building.role).toBe(row === undefined ? null : derivedRole(row));
    });
  },
);

describe("DOC_MATERIAL_LAG is a two-way pin, so it cannot outlive what it excuses", () => {
  /** Every era whose document and module genuinely disagree, derived from both. */
  const diverging = ERA_SEQUENCE.map((era) => era.id).filter((eraId) => {
    const rows = authored.filter((row) => eraIdForFolder(row.eraFolder) === eraId);
    return rows.length > 0 && rows.every((row) => row.material !== materialIdForEra(eraId));
  });

  it("declares exactly the eras that diverge — no more, and no fewer", () => {
    // THE PIN, both directions in one assertion. Set equality rather than containment:
    // containment one way is satisfied by a subset and would pass over an undeclared
    // lag; containment the other way would pass over an entry excusing nothing.
    expect([...diverging].sort()).toEqual(
      [...DOC_MATERIAL_LAG.map((entry) => entry.era)].sort(),
    );
  });

  it("keeps every declared entry LOAD-BEARING, named row by row", () => {
    // The same claim reported usefully, plus the fields. A bare set-equality failure
    // says which era; this says which word on which side, which is what a human acts on.
    for (const entry of DOC_MATERIAL_LAG) {
      const rows = authored.filter((row) => eraIdForFolder(row.eraFolder) === entry.era);
      expect(rows.length, `${entry.era} is declared but has no authored rows`).toBe(4);
      for (const row of rows) {
        expect(
          row.material,
          `${entry.era}/${row.name}: DOC_MATERIAL_LAG says the document still prices in ` +
            `"${entry.documented}". If it has been updated, DELETE this entry.`,
        ).toBe(entry.documented);
      }
      expect(materialIdForEra(entry.era)).toBe(entry.shipped);
      // And it must actually BE a divergence: an entry whose two words agree is excusing
      // nothing and would make this whole block pass over a no-op.
      expect(entry.documented).not.toBe(entry.shipped);
      expect(entry.why).not.toBe("");
    }
  });

  it("cannot swallow the population it is an exception to", () => {
    // A floor with a SHAPE. Nine of the ten eras owe plain agreement, so the list may
    // never grow to cover the census — an exception list the size of its population is
    // a deleted census wearing a list's clothes.
    expect(DOC_MATERIAL_LAG.length).toBeLessThan(ERA_SEQUENCE.length);
    expect(
      ERA_SEQUENCE.filter((era) => !materialLagByEra.has(era.id)).length,
    ).toBeGreaterThanOrEqual(9);
    // Exactly one lag today, and the era it is: pinned so the count cannot creep.
    expect(DOC_MATERIAL_LAG.map((entry) => entry.era)).toEqual(["medieval"]);
  });

  it("excuses the MATERIAL only — a name divergence is never exempt", () => {
    // The scope statement, asserted rather than trusted. `material` is a compared field
    // of a matched pair; a display NAME is the join key, and the exception mechanism
    // does not reach it. So era five's four rows still have to match by name, and they
    // are checked here rather than only inside the sweep above.
    const medievalNames = authored
      .filter((row) => eraIdForFolder(row.eraFolder) === "medieval")
      .map((row) => `medieval/${row.name}`)
      .sort();
    expect(medievalNames).toHaveLength(4);
    for (const key of medievalNames) {
      expect(shippedByKey.has(key), `${key} is not matched by name`).toBe(true);
    }
  });
});

describe("each era holds exactly one of each role (what makes O-4 total)", () => {
  it.each(ERA_SEQUENCE.map((era) => era.id))("%s", (eraId) => {
    const roles = CIVIC_CATALOGUE.filter((b) => b.era === eraId).map((b) => b.role);
    // Set equality both ways AND a length check: the length is what rules out an era
    // holding two dwellings and no amenity, which a set comparison alone would miss
    // only if the missing role happened to be covered elsewhere.
    expect([...roles].sort()).toEqual([...CIVIC_ROLES].sort());
    expect(roles.length).toBe(CIVIC_ROLES.length);
  });

  it("covers every era in the shipped sequence, not just the ones with folders", () => {
    // A floor with a SHAPE, not just a size. The eras this partition covers must be
    // exactly the shipped sequence: an era added to the graph with no catalogue rows
    // fails here rather than being quietly excluded from the sweep above.
    const eras = [...new Set(CIVIC_CATALOGUE.map((b) => b.era))].sort();
    expect(eras).toEqual([...ERA_SEQUENCE.map((era) => era.id)].sort());
    expect(eras.length).toBeGreaterThanOrEqual(10);
  });
});
