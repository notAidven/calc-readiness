/**
 * **D-ERA24, stated so it cannot quietly stop being true: no civic building may be WEAKLY
 * DOMINATED by another in its own era's catalogue.** For any two rows of an era's table,
 * each must beat the other on at least one of four axes — footprint, cost, livability,
 * happiness. A row that beats its rival on nothing is a building nobody will ever place,
 * and D-ERA24's "several distinct civic types" has collapsed into a ladder with one right
 * answer at every rung.
 *
 * ## Why this exists at all, which is a ruling and not a tidy-up
 *
 * The era design says it in prose in ten places — *"No building may win on every axis, or
 * the catalogue collapses into one right answer"* (era one §2) — and prose cannot fail. On
 * 2026-07-29 the aggregation of livability was ruled: **one pool, housing and food not
 * tracked separately** (`packages/economy/src/capacity.ts`). Under that reading a food
 * building and a dwelling of the same magnitude are the same contribution, and **7 of the
 * 10 catalogues turned out to hold a weakly dominated building** — era one's Family Lodge
 * (2×2, 80, +20) beaten by its Smokehouse (2×1, 80, +20) on footprint with nothing to
 * show in return.
 * (That building was called `The Longhouse` then, and era one's blend `The Storage Pit`; both
 * were renamed on 2026-07-29. No assertion here reads a name.)
 *
 * That had been read as an argument for the limiting-factor aggregation, on the grounds
 * that `min` made the pair complements. It was a **pricing problem wearing an aggregation
 * problem's clothes**: a building that is worse on every axis with no compensating
 * property is not a design that needs a cleverer formula. So the catalogues were
 * differentiated instead, and the property they were differentiated to satisfy is asserted
 * here rather than in a paragraph — which is worth more than the rebalance, because it
 * catches the eleventh catalogue as well as the ten that exist.
 *
 * ## There are no exceptions, and there is no exceptions machinery
 *
 * This file carried one declared exception for an afternoon: era ten's Vertical Farm and
 * Capsule Homes were 1×1 for 10,240 each, so the cheaper row won on every axis and no
 * price alone could separate them. The team lead ruled *"differentiate these"*, and era ten
 * §2 now separates them on two axes — the Farm carries a quarter-magnitude happiness for
 * being the city's only fresh food, the Homes take the run's cheapest dwelling price for
 * being its least dignified housing. **So the exemption list, its two-way staleness
 * assertions and the skip path in the sweep are all gone.** Every enumerated pair is now
 * asserted, with no branch that can excuse one, and the floors below are what stop the
 * enumeration being empty. A future legitimate exception would have to bring that machinery
 * back deliberately, which is the right amount of friction for one.
 *
 * ## What it reads, and why nothing here is written down twice
 *
 * The authored catalogues ARE the ten `civic-buildings.md` files; there is no shipped
 * catalogue module to check instead (`CivicCapacityProfile` is deliberately a type, not a
 * catalogue). So the population is derived from the era folders on disk, and every part of
 * it is capable of failing:
 *
 *  - **An era folder with no parseable catalogue table throws**, rather than dropping
 *    quietly out of the population. That is the failure mode this file most needed to
 *    avoid: a sweep that parses nothing reports green.
 *  - **Every row must parse into all four axes.** A `Provides` cell in a shape this parser
 *    does not know is an error, not a zero.
 *  - **Floors on the era count, on each era's row count, and on the pair count**, so the
 *    population can neither shrink in total nor collapse inside one era.
 *  - **The livability axis is pooled by the shipped rule**, imported from `@cr/economy`
 *    rather than re-implemented, and one test asserts the pooling directly. If the
 *    aggregation is ever ruled back to two terms, that test fails here — which is correct,
 *    because this invariant's four axes are a consequence of the pooled reading and would
 *    have to be re-derived under any other.
 *
 * Names and materials are parsed, never hardcoded: three agents were renaming the buildings,
 * the per-era materials and the era folders while this was written, and a rename must not be
 * able to break or silently empty this sweep. With the declared exception gone **no assertion
 * in this file mentions a building by name** — the names below appear only in this comment, as
 * history — so a rename can change what a failure message says and never whether it fires.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { type CapacityContribution, deriveCapacities } from "@cr/economy";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ERAS_DIR = "docs/superpowers/specs/eras";
const CATALOGUE_FILE = "civic-buildings.md";

const repoRoot = resolveRepoRoot();

interface CivicRow {
  readonly era: string;
  readonly name: string;
  /** Grid cells occupied — the footprint axis, which is area rather than shape. */
  readonly cells: number;
  /** Cost in the era's material, whatever that material is now called. */
  readonly cost: number;
  readonly livability: number;
  readonly happiness: number;
}

function eraFolders(): string[] {
  return readdirSync(join(repoRoot, ERAS_DIR), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^era-\d\d-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/** Markdown table cells, trimmed, with bold markers dropped. */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.replace(/\*\*/g, "").trim());
}

function isDelimiterRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

/**
 * The one table in an era's catalogue whose header carries all four of the columns this
 * invariant reads. Every era file holds other tables (the two-class contract, the open
 * questions), and the later eras' catalogue tables carry `Wins on` / `Loses on` where era
 * one carries three efficiency columns — so the table is found by its header and the
 * columns are read by name, never by position.
 */
function catalogueRows(era: string, markdown: string): string[][] {
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
      `${era}/${CATALOGUE_FILE}: expected exactly one table with columns ` +
        `${required.join(", ")}, found ${found.length}. The catalogue cannot be read, ` +
        `so this era would otherwise be swept as if it held no buildings.`,
    );
  }
  return table;
}

function columnIndex(header: string[], column: string, era: string): number {
  const index = header.findIndex((cell) => cell.toLowerCase().startsWith(column));
  if (index < 0) {
    throw new Error(`${era}: catalogue table has no ${column} column`);
  }
  return index;
}

function wholeNumber(text: string | undefined, what: string, era: string): number {
  const value = text === undefined ? Number.NaN : Number(text.replace(/,/g, ""));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${era}: cannot read ${what} from "${text}"`);
  }
  return value;
}

/**
 * The `Cost` cell, as an amount — and the cell's SHAPE is asserted rather than assumed.
 *
 * **THIS IS A MEASURED SILENT FAILURE, not a hypothetical one.** The read used to be
 * `cells[costColumn].split(/\s+/)[0]`, which takes the first whitespace-delimited token
 * and trusts it. That throws on `"about 3,680 gems"`, because `Number("about")` is `NaN` —
 * but it happily returns **6** for `"6 cells at 3,680 gems"`, and 6 is finite and positive,
 * so the `cost > 0` floor below passes it too. Injected at `e8ef7eb` into era six's Town
 * Square: this file reported **27 passed, 0 failed** while comparing that row at a cost of
 * 6 against its rivals' four-figure prices. Every pair still won an axis, so nothing looked
 * wrong; the sweep was simply measuring a different catalogue.
 *
 * `eraCivicCatalogueParity.test.ts` did catch it, by comparing against the shipped module.
 * That is the two-independent-readers property working — and it is also the thing this file
 * must not rely on, because it is the D-ERA24 guard in its own right and its whole argument
 * is that it reads the authored tables rather than a copy of them. A guard that is only
 * correct because a different guard exists is one guard.
 *
 * So the cell must be **exactly a number and a material word**, which is what all forty
 * authored cells are. Anything else throws by name rather than being parsed optimistically:
 * a cost column is data, and the one place in these documents where prose is not allowed.
 */
function costAmount(cell: string, era: string, name: string): number {
  const match = cell.match(/^([\d,]+)\s+([A-Za-z_]+)$/);
  if (match === null) {
    throw new Error(
      `${era}/${name}: the Cost cell must be exactly "<amount> <material>" and is ` +
        `"${cell}". Parsing the first token of a freer cell reads a number that is not ` +
        `the cost and reports green — see this function's docblock.`,
    );
  }
  return wholeNumber(match[1], "a cost", era);
}

/** `2×1 (8×4u)` and `2×2` both read as an area. The first pair is the grid footprint. */
function footprintCells(cell: string, era: string, name: string): number {
  const match = cell.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (!match) {
    throw new Error(`${era}/${name}: cannot read a footprint from "${cell}"`);
  }
  return Number(match[1]) * Number(match[2]);
}

/**
 * The `Provides` column, as contributions to the two capacities. Three term shapes, and an
 * unrecognised term is an error rather than a silent zero:
 *
 *  - `food capacity for ~20`, `food for ~1,280` → livability, because the pooled ruling
 *    puts food and housing in one pool. This mapping IS the flip; it is what makes a food
 *    row and a dwelling row comparable, and therefore what makes a dominated pair visible.
 *  - `20 livability` → livability.
 *  - `20 happiness coverage`, `320 happiness` → happiness.
 */
function contributions(cell: string, era: string, name: string): CapacityContribution[] {
  return cell.split("+").map((rawTerm) => {
    const term = rawTerm.replace(/\*/g, "").trim();
    const food = term.match(/^food\b[^\d]*([\d,]+)/i);
    if (food) {
      return { livability: wholeNumber(food[1], "a food figure", era), happiness: 0 };
    }
    const livability = term.match(/^([\d,]+)\s+livability\b/i);
    if (livability) {
      return {
        livability: wholeNumber(livability[1], "a livability figure", era),
        happiness: 0,
      };
    }
    const happiness = term.match(/^([\d,]+)\s+happiness\b/i);
    if (happiness) {
      return {
        livability: 0,
        happiness: wholeNumber(happiness[1], "a happiness figure", era),
      };
    }
    throw new Error(
      `${era}/${name}: cannot read the contribution "${term}". Known shapes are ` +
        `"food … for ~N", "N livability" and "N happiness".`,
    );
  });
}

function readCatalogue(era: string): CivicRow[] {
  const markdown = readFileSync(join(repoRoot, ERAS_DIR, era, CATALOGUE_FILE), "utf8");
  const table = catalogueRows(era, markdown);
  const header = table[0];
  if (header === undefined) {
    throw new Error(`${era}/${CATALOGUE_FILE}: the catalogue table has no header row`);
  }
  const nameColumn = columnIndex(header, "building", era);
  const footprintColumn = columnIndex(header, "footprint", era);
  const providesColumn = columnIndex(header, "provides", era);
  const costColumn = columnIndex(header, "cost", era);

  return table
    .slice(1)
    .filter((cells) => !isDelimiterRow(cells))
    .map((cells) => {
      const cellAt = (column: number, what: string): string => {
        const value = cells[column];
        if (value === undefined) {
          throw new Error(
            `${era}: a catalogue row has no ${what} cell — "${cells.join(" | ")}"`,
          );
        }
        return value;
      };
      const name = cellAt(nameColumn, "Building");
      // `min` is not in play here: this pools one row's own terms through the shipped
      // rule, so a blend row's two halves are added exactly as the city adds them.
      const provided = deriveCapacities(
        contributions(cellAt(providesColumn, "Provides"), era, name),
      );
      return {
        era,
        name,
        cells: footprintCells(cellAt(footprintColumn, "Footprint"), era, name),
        cost: costAmount(cellAt(costColumn, "Cost"), era, name),
        livability: provided.livability,
        happiness: provided.happiness,
      };
    });
}

const AXES: readonly {
  readonly axis: string;
  readonly beats: (a: CivicRow, b: CivicRow) => boolean;
  readonly show: (row: CivicRow) => string;
}[] = [
  {
    axis: "footprint",
    beats: (a, b) => a.cells < b.cells,
    show: (row) => `${row.cells} cells`,
  },
  { axis: "cost", beats: (a, b) => a.cost < b.cost, show: (row) => `${row.cost} cost` },
  {
    axis: "livability",
    beats: (a, b) => a.livability > b.livability,
    show: (row) => `${row.livability} livability`,
  },
  {
    axis: "happiness",
    beats: (a, b) => a.happiness > b.happiness,
    show: (row) => `${row.happiness} happiness`,
  },
];

function axesWon(row: CivicRow, rival: CivicRow): string[] {
  return AXES.filter(({ beats }) => beats(row, rival)).map(({ axis }) => axis);
}

function describeRow(row: CivicRow): string {
  return `${row.name} (${AXES.map(({ show }) => show(row)).join(", ")})`;
}

/** Every unordered pair of an era's rows, in authored order. */
function pairs(rows: readonly CivicRow[]): [CivicRow, CivicRow][] {
  const out: [CivicRow, CivicRow][] = [];
  for (const [index, row] of rows.entries()) {
    for (const rival of rows.slice(index + 1)) {
      out.push([row, rival]);
    }
  }
  return out;
}

const eras = eraFolders();
const catalogues = new Map(eras.map((era) => [era, readCatalogue(era)]));
const allRows = [...catalogues.values()].flat();

describe("the ten authored civic catalogues are read, in full", () => {
  it("finds every era folder's catalogue and every row in it", () => {
    // Floors under the whole sweep. Ten eras of four rows each when this was written; the
    // floors are the authored numbers, because a catalogue LOSING a row is exactly the
    // kind of quiet shrinkage that would make every assertion below vacuous.
    expect(eras.length).toBeGreaterThanOrEqual(10);
    expect(allRows.length).toBeGreaterThanOrEqual(40);
    for (const era of eras) {
      expect(catalogues.get(era)?.length ?? 0, `${era} lost rows`).toBeGreaterThanOrEqual(
        4,
      );
    }
  });

  it("compares at least sixty pairs, none of them excusable", () => {
    // The floor that used to sit under the exceptions list, kept now that the list is gone:
    // ten catalogues of four rows are 60 unordered pairs, each checked in both directions.
    // There is no skip path left in the sweep, so this count IS the number asserted.
    const checkedPairs = eras.reduce(
      (total, era) => total + pairs(catalogues.get(era) ?? []).length,
      0,
    );
    expect(checkedPairs).toBeGreaterThanOrEqual(60);
  });

  it("reads all four axes off every row, with nothing defaulted to zero", () => {
    for (const row of allRows) {
      expect(row.cells, describeRow(row)).toBeGreaterThan(0);
      expect(row.cost, describeRow(row)).toBeGreaterThan(0);
      // A row provides SOMETHING. A parse that quietly produced 0 and 0 would make that
      // row dominated by everything, so this fails first and says why.
      expect(row.livability + row.happiness, describeRow(row)).toBeGreaterThan(0);
    }
  });

  it("pools livability by the SHIPPED aggregation, not by a rule of its own", () => {
    // The premise of the four axes. Under the limiting-factor reading a food row and a
    // dwelling row could not be compared on one livability number at all, so this
    // invariant would have to be re-derived rather than merely re-run.
    const foodRow: CapacityContribution = { livability: 20, happiness: 0 };
    const dwellingRow: CapacityContribution = { livability: 20, happiness: 0 };
    expect(deriveCapacities([foodRow]).livability).toBe(20);
    expect(deriveCapacities([foodRow, dwellingRow]).livability).toBe(40);
  });
});

describe.each(eras)("%s — no row is weakly dominated (D-ERA24)", (era) => {
  const rows = catalogues.get(era) ?? [];

  it("enumerates every unordered pair of the era's rows", () => {
    const expected = (rows.length * (rows.length - 1)) / 2;
    expect(pairs(rows).length).toBe(expected);
    expect(expected).toBeGreaterThanOrEqual(6);
  });

  it("gives every row at least one axis it wins", () => {
    const offences: string[] = [];
    for (const [left, right] of pairs(rows)) {
      for (const [row, rival] of [
        [left, right],
        [right, left],
      ] as const) {
        if (axesWon(row, rival).length > 0) {
          continue;
        }
        offences.push(
          `${describeRow(row)} is weakly dominated by ${describeRow(rival)} — it beats ` +
            `it on nothing, and the rival wins on ` +
            `${axesWon(rival, row).join(" and ") || "nothing either: they are identical"}`,
        );
      }
    }
    expect(offences, `${era}\n  ${offences.join("\n  ")}`).toEqual([]);
  });
});

describe("era ten, the pair that needed two axes", () => {
  /**
   * The one pair this sweep ever excused, asserted directly rather than only through the
   * era-ten sweep above, because it is the case the exceptions machinery was built for and
   * then deleted for. Both rows are 1×1 and both carry the era's full magnitude, so the
   * separation has to come from the two axes left: the food tower's happiness and the
   * dwelling's price. Named here by ROLE, found by shape rather than by name, so a rename
   * cannot make this test vacuous — it fails with "no era-ten row provides happiness beside
   * its livability" instead of quietly matching nothing.
   */
  const rows = catalogues.get("era-10-cyberpunk") ?? [];
  const oneCell = rows.filter((row) => row.cells === 1);

  /**
   * The pair, narrowed. The count is asserted directly in the first case below; this
   * throws by name so that a catalogue that has lost one of the two fails saying so
   * rather than reading `undefined.happiness` three cases later.
   */
  const theOneCellPair = (): readonly [CivicRow, CivicRow] => {
    const [first, second] = oneCell;
    if (first === undefined || second === undefined) {
      throw new Error(
        `era-10-cyberpunk: expected two 1×1 rows and found ${oneCell.length}; the pair ` +
          `this block is about is not in the catalogue`,
      );
    }
    return [first, second];
  };

  it("has two 1×1 rows of equal magnitude, which is why one axis was never enough", () => {
    expect(oneCell.length).toBe(2);
    const [first, second] = theOneCellPair();
    expect(first.livability).toBe(second.livability);
    expect(first.cells).toBe(second.cells);
  });

  it("separates them on BOTH cost and happiness, so neither dominates", () => {
    const [first, second] = theOneCellPair();
    const dearer = first.cost > second.cost ? first : second;
    const cheaper = dearer === first ? second : first;
    // The dearer row is the one carrying the happiness: that is the trade, in the only
    // direction that works. Reversed, the cheap row would win cost AND happiness.
    expect(dearer.happiness, `${describeRow(dearer)}`).toBeGreaterThan(0);
    expect(cheaper.happiness, `${describeRow(cheaper)}`).toBe(0);
    expect(axesWon(dearer, cheaper)).toEqual(["happiness"]);
    expect(axesWon(cheaper, dearer)).toEqual(["cost"]);
  });

  it("keeps the secondary below the blend row's, per the quarter-magnitude rule", () => {
    const [first, second] = theOneCellPair();
    const secondary = Math.max(first.happiness, second.happiness);
    const blends = rows.filter((row) => row.livability > 0 && row.happiness > 0);
    // The 1x1 food tower is itself a blend now, so the row this compares against is the
    // OTHER one: era ten's 2x2 blend, at half and half.
    const evenBlend = blends.filter((row) => row.livability === row.happiness);
    expect(evenBlend.length).toBeGreaterThanOrEqual(1);
    for (const row of evenBlend) {
      expect(row.happiness, describeRow(row)).toBeGreaterThan(secondary);
    }
  });
});
