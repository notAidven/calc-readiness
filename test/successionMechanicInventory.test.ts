/**
 * **EVERY ROW OF THE MECHANIC INVENTORY IS ANSWERED FOR ERA FOUR, AND THE ROWS COME FROM
 * THE SPEC RATHER THAN FROM THE ANSWER SHEET.**
 *
 * `docs/superpowers/specs/crisis-reference-packs/README.md` §3 derives a mechanic inventory
 * from era one's built code and rules how a crisis must use it: *"a row for every mechanic
 * […] **A blank row fails; a row saying 'no analogue, because ...' passes.**"* §2 says why
 * it exists, and the sentence is the reason this is a test and not a review checklist:
 *
 * > Everything the player does is a property of the LOOP, and the loop has no axis list. So
 * > the interactive half is not argued away, it is never reached, **and an omission that is
 * > never reached is invisible in review**.
 *
 * ## The population is parsed out of the source table, in both directions
 *
 * The rows are read from §3's markdown table at run time, and asserted against
 * `SUCCESSION_MECHANICS` by SET EQUALITY. A row era four misses fails; a row era four
 * invents fails too. Neither direction is available to a guard that counts its own list —
 * which `.cursor/rules/qa-verification.mdc` records as the ordinary way a sweep here comes
 * to measure nothing.
 *
 * **The count is derived and is deliberately not written down anywhere**, because §3's own
 * prose disagrees with §3's own table: the paragraph above it says *"Twenty-two rows"* and
 * the paragraph below it says *"the same 24 rows"*, over a table that has twenty-four. The
 * table is the authority — it is the thing with the mechanics in it — so the parser counts
 * rows and the disagreement is recorded rather than resolved in favour of whichever number
 * this file happened to hold.
 *
 * Lives in `test/` because its subject spans `docs/` and `engines/`: it is a claim about a
 * specification and an engine agreeing, which belongs to neither workspace.
 */

import { readFileSync } from "node:fs";
import { posix } from "node:path";
import * as game from "@cr/game";
import {
  createSuccession,
  SUCCESSION_MECHANICS,
  type SuccessionMechanic,
  successionDamage,
  successionReducer,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();
const INVENTORY_DOC = "docs/superpowers/specs/crisis-reference-packs/README.md";

/** One row of §3's table, as the specification writes it. */
interface SourceRow {
  readonly id: string;
  readonly mechanic: string;
}

/**
 * Parse §3's rows out of the markdown.
 *
 * The shape is `| **M1** | <mechanic> | <era one's instance> | <where it lives> |`, and only
 * the first two cells are read: the other two are facts about era one and are not era
 * four's to answer. Bold markers are stripped so the answer sheet can hold plain prose.
 */
function sourceRows(): SourceRow[] {
  const markdown = readFileSync(posix.join(repoRoot, INVENTORY_DOC), "utf8");
  const rows: SourceRow[] = [];
  const pattern = /^\|\s*\*\*(M\d+)\*\*\s*\|\s*(.+?)\s*\|/gm;
  let match = pattern.exec(markdown);
  while (match !== null) {
    rows.push({
      id: match[1] as string,
      mechanic: (match[2] as string).replace(/\*\*/g, "").trim(),
    });
    match = pattern.exec(markdown);
  }
  return rows;
}

function answered(id: string): SuccessionMechanic {
  const row = SUCCESSION_MECHANICS.find((entry) => entry.id === id);
  if (!row) {
    throw new Error(`era four does not answer ${id}`);
  }
  return row;
}

describe("era four answers every row of the mechanic inventory", () => {
  it("covers exactly the rows the specification derives, in both directions", () => {
    const source = sourceRows();

    // A floor, because set equality against a table nobody parsed is equality between two
    // empty lists. Twenty is a floor and not a pin: a mechanic added to §3 joins the
    // population and fails the equality below rather than failing here.
    expect(
      source.length,
      `only ${source.length} rows parsed out of ${INVENTORY_DOC}`,
    ).toBeGreaterThanOrEqual(20);
    // And the parser really did read the table rather than one stray row.
    expect(new Set(source.map((row) => row.id)).size).toBe(source.length);

    expect(SUCCESSION_MECHANICS.map((row) => row.id).sort()).toEqual(
      source.map((row) => row.id).sort(),
    );
    for (const row of source) {
      expect(answered(row.id).mechanic, row.id).toBe(row.mechanic);
    }
  });

  /**
   * §3's rule, enforced on the literal shape it names. A blank row fails; a row saying "no
   * analogue, because ..." passes. The length floor is what makes "blank" mean something
   * more than an empty string: a row of six words is a blank row with a sentence in front
   * of it, and the whole point of the inventory is that the ANSWER is the deliverable.
   */
  it("gives every row a substantial answer, and never a blank one", () => {
    for (const row of SUCCESSION_MECHANICS) {
      expect(row.instance.length, `${row.id} is too thin to be an answer`).toBeGreaterThan(
        180,
      );
      // The mechanic title is pinned against the source table above, so this only guards
      // the parser returning empties. The floor is deliberately low: the shortest row the
      // specification actually has is `M18`, "The ruin", at eight characters.
      expect(row.mechanic.length, row.id).toBeGreaterThan(3);
    }
  });

  it("says 'because' on every row that claims an absence, and points at no code", () => {
    const absences = SUCCESSION_MECHANICS.filter((row) => row.answer === "no_analogue");

    // A floor: "every absence is argued" holds trivially of a sheet with no absences on it.
    expect(absences.length).toBeGreaterThanOrEqual(6);
    for (const row of absences) {
      expect(row.instance, `${row.id} claims an absence without arguing it`).toMatch(
        /because/i,
      );
      // A row claiming there is nothing to point at may not point at something.
      expect(row.engine_symbols, row.id).toEqual([]);
      expect(row.next, row.id).toBeNull();
    }
  });

  it("says what is still owed on every row it defers, and by which lane", () => {
    const deferred = SUCCESSION_MECHANICS.filter((row) => row.answer === "deferred");

    expect(deferred.length).toBeGreaterThanOrEqual(3);
    for (const row of deferred) {
      // "Not built yet" with no successor is the blank row under another name.
      expect(row.next, `${row.id} defers without saying to what`).not.toBeNull();
      expect((row.next as string).length, row.id).toBeGreaterThan(60);
    }
  });

  /**
   * The claim a `built` row makes is checkable, so it is checked. Every symbol it names has
   * to be exported from `@cr/game` — the surface a web-lane consumer would import — so a
   * rename fails here rather than leaving the inventory describing a function nobody can
   * find. That is the difference between an answer sheet and a set of assertions.
   */
  it("names real exports on every row it claims to have built", () => {
    const built = SUCCESSION_MECHANICS.filter((row) => row.answer === "built");

    expect(built.length).toBeGreaterThanOrEqual(8);
    const exported = new Set(Object.keys(game));
    let named = 0;
    for (const row of built) {
      expect(
        row.engine_symbols.length,
        `${row.id} claims built and names nothing`,
      ).toBeGreaterThanOrEqual(1);
      for (const symbol of row.engine_symbols) {
        named += 1;
        expect(
          exported,
          `${row.id} names ${symbol}, which @cr/game does not export`,
        ).toContain(symbol);
      }
    }
    // A floor on the symbols themselves, because "every named symbol exists" is trivially
    // true of a sheet that names none.
    expect(named).toBeGreaterThanOrEqual(15);
  });

  /**
   * The three answers must PARTITION the twenty-four. A row with a fourth answer, or with
   * none, would sit outside every rule above and be excused by all of them at once.
   */
  it("partitions every row into exactly one of the three answers", () => {
    const kinds = ["built", "no_analogue", "deferred"] as const;
    const counted = kinds.reduce(
      (total, kind) =>
        total + SUCCESSION_MECHANICS.filter((row) => row.answer === kind).length,
      0,
    );

    expect(counted).toBe(SUCCESSION_MECHANICS.length);
  });

  /**
   * **COMPOSITION, NOT ONLY SIZE.** The floors above constrain how many rows gave each
   * answer and never WHICH: twenty-four rows reading "no analogue" would clear every floor
   * in this file and mean era four's crisis had not been designed. So the rows whose answer
   * is load-bearing are named with the answer they owe.
   */
  it("gives the load-bearing rows the answer the design requires", () => {
    // The row the whole crisis turns on. §3 is explicit that "era four has no propagation"
    // would be a FALSE answer, so this row may never read `no_analogue`.
    expect(answered("M9").answer).toBe("built");
    expect(answered("M9").instance).toMatch(/nothing spatial/i);
    expect(answered("M9").instance).toMatch(/before the decision lands/i);

    // The object the brief stakes the crisis's fairness on.
    expect(answered("M16").answer).toBe("built");
    // The counter-mechanic and its preview: the two things era one's brief never reached,
    // which is the omission the whole inventory exists to make visible.
    expect(answered("M10").answer).toBe("built");
    expect(answered("M13").answer).toBe("built");
    // The conclusion with a derived verdict.
    expect(answered("M24").answer).toBe("built");

    // The failure floor. These two are absences because D-CRISIS-7 requires them to be,
    // and the two assertions below check the code agrees rather than the sentence.
    expect(answered("M18").answer).toBe("no_analogue");
    expect(answered("M19").answer).toBe("no_analogue");

    // Presentation, which this pass does not own.
    expect(answered("M4").answer).toBe("deferred");
  });

  /**
   * And the two absences that D-CRISIS-7 turns on are checked against the ENGINE rather
   * than taken from the answer sheet. A "no analogue, because nothing is ruined" that the
   * code contradicted would be the worst row on the sheet: a floor breach wearing a
   * justification.
   */
  it("keeps the two floor rows true of the code, not just of the sentence", () => {
    let state = createSuccession();
    while (state.phase !== "settled") {
      state = successionReducer(state, { type: "start_batch" });
      state = successionReducer(state, { type: "resolve_batch", correct: 1, asked: 3 });
      state = successionReducer(state, { type: "finish_response" });
    }
    const damage = successionDamage(state);

    // M18: nothing is ruined. M19: no ground is lost.
    expect(damage.buildings).toEqual([]);
    expect(damage.cells).toEqual([]);
    // A floor, because two empty lists are also what a crisis that did nothing reports.
    // This play drifted the whole board, so it is the WORST ending era four can reach.
    expect(state.outcome?.rival_controlled).toBeGreaterThanOrEqual(1);
    expect(damage.suspended_civic?.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});
