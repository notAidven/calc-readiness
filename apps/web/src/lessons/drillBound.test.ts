import { DRILL_PAID_SETS_PER_ERA } from "@cr/economy";
// TEMPORARY, and read only by the demonstration-pin exemption below.
import { DEMO_PINNED_TEMPLATE_IDS } from "@cr/item-bank";
import { PRACTICE_SET_SIZE } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { interleavedPoolItems, interleavedSkillIds } from "./interleavedPool";

/**
 * **WHERE THE DRILL'S CONTENT ACTUALLY RUNS OUT, MEASURED — and the bound checked
 * against it.**
 *
 * `DRILL_PAID_SETS_PER_ERA` is authored in `@cr/economy`, which cannot see the item
 * bank. Its docblock defends the number partly on a claim about CONTENT — that by the
 * time the bound bites, the learner has already been served every fresh problem shape
 * the era's mix holds — and a claim about content belongs where the content is. So the
 * measurement lives here, and the linkage is an assertion rather than a comment.
 *
 * ## What "runs out" means, in two readings, because they differ by a factor of seven
 *
 * A drill round serves one problem per unlocked skill, so an era's mix is exhausted at
 * the rate of its THINNEST node. That node's pool can be counted two ways and the answer
 * is very different:
 *
 *  - **Fresh SHAPES** — distinct `template_id`s. Five per node at the floor (seven for
 *    `NUM.3` and `NUM.S`, six for `EXP.1` and `RAD.2`). Past this the learner is seeing a
 *    problem they have solved before with the numbers swapped, which is practice rather
 *    than new content.
 *  - **Fresh ITEMS** — distinct generated instances. Thirty-five per node. Past this the
 *    learner is seeing a problem they have literally already been given.
 *
 * A shape is what a learner would call "a new problem", so the shapes reading is the one
 * the bound is checked against. The items reading is recorded beside it so nobody has to
 * re-derive which of the two a future edit moved.
 *
 * ## And the reviewer's own reading, which the tree moved out from under
 *
 * The bound was proposed as sitting near "where the pool's content runs out — measured
 * at four clean sets on D1 nodes and seven elsewhere". That figure is CLEAN FIVE-SLOT
 * SETS: how many graded practice sets a node's pool can fill without reusing an item,
 * against the 1×L1 / 2×L2 / 2×L3 mix. It reproduced exactly at `6db302f5` and is stale at
 * the tip: `cd13f968` (the D1 practice-diversity merge, which is what this work branched
 * from) added one L2 or L3 shape to every D1 node and took D1 from four to seven. **It is
 * seven everywhere now**, so the two-figure split the proposal turned on no longer
 * exists. Measured below rather than quoted, for exactly the reason it went stale.
 */

interface EraPoolMeasurement {
  readonly era: EraId;
  readonly drillableSkills: number;
  /** Rounds before the thinnest skill must repeat a problem SHAPE. */
  readonly freshShapeRounds: number;
  /** Rounds before the thinnest skill must repeat a generated ITEM. */
  readonly freshItemRounds: number;
  /** The reviewer's reading: clean five-slot graded sets the thinnest pool can fill. */
  readonly cleanFiveSlotSets: number;
}

/** A five-slot set is 1×L1 + 2×L2 + 2×L3, so a pool fills that many clean sets. */
function cleanSetsFrom(tiers: ReadonlyMap<number, number>): number {
  return Math.min(
    tiers.get(1) ?? 0,
    Math.floor((tiers.get(2) ?? 0) / 2),
    Math.floor((tiers.get(3) ?? 0) / 2),
  );
}

function measure(eraId: EraId): EraPoolMeasurement | null {
  const items = interleavedPoolItems(eraId, "all");
  const skills = interleavedSkillIds(eraId, "all");
  if (skills.length === 0) {
    return null;
  }
  const shapesByNode = new Map<string, Set<string>>();
  const itemsByNode = new Map<string, Set<string>>();
  const tiersByNode = new Map<string, Map<number, number>>();
  for (const item of items) {
    const shapes = shapesByNode.get(item.node_id) ?? new Set<string>();
    shapes.add(item.template_id ?? item.item_version_id);
    shapesByNode.set(item.node_id, shapes);

    const ids = itemsByNode.get(item.node_id) ?? new Set<string>();
    ids.add(item.item_version_id);
    itemsByNode.set(item.node_id, ids);

    const tiers = tiersByNode.get(item.node_id) ?? new Map<number, number>();
    tiers.set(item.difficulty, (tiers.get(item.difficulty) ?? 0) + 1);
    tiersByNode.set(item.node_id, tiers);
  }
  return {
    era: eraId,
    drillableSkills: skills.length,
    freshShapeRounds: Math.min(...[...shapesByNode.values()].map((set) => set.size)),
    freshItemRounds: Math.min(...[...itemsByNode.values()].map((set) => set.size)),
    cleanFiveSlotSets: Math.min(...[...tiersByNode.values()].map(cleanSetsFrom)),
  };
}

const MEASURED: readonly EraPoolMeasurement[] = ERA_SEQUENCE.map((era) =>
  measure(era.id),
).filter((row): row is EraPoolMeasurement => row !== null);

describe("the drill bound sits past the pool's fresh content, measured", () => {
  it("measures every era that has anything to drill, and floors the population", () => {
    // Eight of the ten eras have a drillable mix today; the Industrial and Cyberpunk
    // pools are unauthored, which is the era model reporting the content that exists
    // rather than a defect. The floor sits under eight so an era landing its packs does
    // not fail here, while a sweep that suddenly measures one era does.
    expect(MEASURED.length).toBeGreaterThanOrEqual(6);
    expect(MEASURED.length).toBeLessThanOrEqual(ERA_SEQUENCE.length);
    for (const row of MEASURED) {
      expect(row.drillableSkills, `${row.era} has no drillable skills`).toBeGreaterThan(0);
      expect(row.freshShapeRounds, `${row.era} serves no shapes`).toBeGreaterThan(0);
    }
  });

  it("keeps every node's pool thick enough to fill a five-slot set at all", () => {
    // The collapse guard, and the floor the whole feature rests on: a node whose pool
    // cannot fill one clean set cannot be practised, so it could never be left below the
    // bar and could never be drilled either.
    for (const row of MEASURED) {
      expect(
        row.cleanFiveSlotSets,
        `${row.era} cannot fill a clean set`,
      ).toBeGreaterThanOrEqual(1);
      expect(row.freshItemRounds, `${row.era} is thin on items`).toBeGreaterThanOrEqual(
        PRACTICE_SET_SIZE,
      );
    }
  });

  it("NEVER stops paying while fresh problem shapes remain in the mix", () => {
    // **THE LINKAGE, AND THE ONE ASSERTION THAT CAN FAIL ON A CONTENT EDIT.** The bound's
    // copy tells the learner the era's drill is spent. That is honest only while the
    // bound sits at or past the point where the mix stops offering new shapes — if a pool
    // grew to twelve shapes a node and the bound stayed at ten, the learner would be cut
    // off with fresh problems still on the shelf, which is the reviewer's stated
    // objection to bounding short of the content.
    //
    // Measured over the WORST era rather than the average: the claim is about every
    // learner, and a learner sits in one era at a time.
    const deepest = Math.max(...MEASURED.map((row) => row.freshShapeRounds));
    expect(deepest).toBeGreaterThan(0);
    expect(
      DRILL_PAID_SETS_PER_ERA,
      `an era offers ${deepest} rounds of fresh shapes but only ${DRILL_PAID_SETS_PER_ERA} pay`,
    ).toBeGreaterThanOrEqual(deepest);

    // The reviewer's own reading, checked the same way. Seven everywhere at the tip; the
    // bound clears it with three sets to spare.
    const deepestCleanSets = Math.max(...MEASURED.map((row) => row.cleanFiveSlotSets));
    expect(DRILL_PAID_SETS_PER_ERA).toBeGreaterThanOrEqual(deepestCleanSets);

    // AND THE DIRECTION THAT MAKES THIS EXPIRE RATHER THAN DRIFT. The bound must not run
    // so far past the content that it is bounding nothing a learner would notice: at more
    // than four times the fresh-shape depth, "the drill is spent" would be a claim about
    // a pool the learner exhausted long ago and the bound would be doing no product work.
    expect(DRILL_PAID_SETS_PER_ERA).toBeLessThanOrEqual(deepest * 4);
  });

  it("records the two readings per era, so a content edit shows up in the diff", () => {
    // Not pinned to exact figures: this is a record of a measurement whose whole point is
    // that it moves when content lands, and a `toEqual` here would fail every
    // practice-authoring pull request for no product reason. The assertions that BITE are
    // the floors above and the linkage below them; this makes the numbers readable.
    const table = MEASURED.map((row) => ({
      era: row.era,
      skills: row.drillableSkills,
      shapes: row.freshShapeRounds,
      items: row.freshItemRounds,
      cleanSets: row.cleanFiveSlotSets,
    }));
    // Every era but one measures the same clean-set depth, which is the fact that killed
    // the "four on D1, seven elsewhere" split the bound was originally proposed against.
    //
    // **Cyberpunk is the first era to break that uniformity, and it is content, not a bug.**
    // D9's answer spaces are finite in a way the other eras' are not — only three sines are
    // exact and positive, and headings live on a 30-degree lattice — so seven of its
    // templates cannot reach the six-variant retry depth and are named with their measured
    // ceilings in `d9.test.ts`'s `THIN_CELLS`. That shows up here as 3 clean sets against 7.
    // The bound still clears it (the linkage above measures the DEEPEST era), so a learner
    // is never cut off with fresh problems left; the cyberpunk drill simply runs out sooner.
    //
    // Named rather than dropped, and asserted in BOTH directions: an era that degrades
    // without being listed fails the first assertion, and a listed era that recovers its
    // depth fails the second, so the exemption cannot outlive the thin cells that earned it.
    //
    // That contract has already collected once. `bronze_age` was listed while
    // `d3.lin3.kerb-width.l1` was pinned to one instance for the scripted work-checker
    // demonstration, which collapsed that era's LIN.3 L1 cell to a single question. Reverting the
    // pin took the era back to MODAL_DEPTH and the "listed as shallow but is not" branch failed,
    // which is what removed the entry. Nothing had to remember to do it.
    const SHALLOW_ERAS = new Set(["cyberpunk"]);
    const MODAL_DEPTH = 7;
    for (const row of table) {
      if (SHALLOW_ERAS.has(row.era)) {
        expect(row.cleanSets, `${row.era} is listed as shallow but is not`).toBeLessThan(
          MODAL_DEPTH,
        );
      } else {
        expect(row.cleanSets, `${row.era} lost depth without being named`).toBe(
          MODAL_DEPTH,
        );
      }
    }
    // ...and the shallow era is still worth drilling rather than empty. Derived from the pin list
    // rather than fixed, so a demonstration pin that guts an era's depth lowers this deliberately
    // and it climbs back to 3 on its own when the list empties, instead of staying where the
    // demonstration left it. The list is empty, so this is 3.
    const drillFloor = DEMO_PINNED_TEMPLATE_IDS.length > 0 ? 1 : 3;
    expect(Math.min(...table.map((row) => row.cleanSets))).toBeGreaterThanOrEqual(
      drillFloor,
    );
    expect(table.every((row) => row.items >= row.shapes)).toBe(true);
    expect(table.length).toBeGreaterThanOrEqual(6);
  });
});
