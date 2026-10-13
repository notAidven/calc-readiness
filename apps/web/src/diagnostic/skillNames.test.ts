/**
 * THE SKILL-NAME COVERAGE SWEEP.
 *
 * `skillNames.ts` shipped with **11 entries against a 62-node graph** and nothing
 * measured that, so fifty-one nodes sat unnamed in a lookup whose documented
 * fallback prints the raw registry id. The leak was visible in the product: era
 * three's build card read `"Assembly Hall" / "the Merchants' Hall" / "LIN.1"`.
 *
 * The one sweep that touched the module (`city/eraTwo.reachability.test.ts`) was
 * scoped to the eras whose ART has landed, which is a fact about the model files and
 * not about who renders a skill name. Scoped that way it was structurally incapable
 * of seeing D3..D10, and it passed every run while fifty-one nodes were missing.
 *
 * So the load-bearing part of this file is the POPULATION, and it is derived twice
 * from the registry — once by product scope, once by era membership — with the two
 * derivations asserted equal. Neither is a list written down here.
 */
import {
  ERA_SEQUENCE,
  getEraOrderedNodes,
  getNodesByScope,
  getProductNodes,
  type SkillNode,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { lessonByNode } from "../lessons/domains";
import {
  NAMED_SKILL_NODES,
  SKILL_SOURCE_TITLES,
  SKILL_SPINE_SOURCES,
  skillDisplayName,
} from "./skillNames";

/**
 * THE POPULATION: every node in the product, read off the registry. `getProductNodes`
 * is the same filter `eras.ts` partitions (INV-ERA-2) and the same one the diagnostic
 * walk widens into, so a node that becomes reachable joins this sweep by existing
 * rather than by anybody remembering to add it.
 */
const PRODUCT_NODES: readonly SkillNode[] = getProductNodes();
const PRODUCT_IDS: readonly string[] = PRODUCT_NODES.map((node) => node.id);

/** The second, independent derivation of the same set: era membership. */
const ERA_ORDERED_IDS: readonly string[] = getEraOrderedNodes();

/** Nodes deliberately outside the product — retired or cut ids that must stay unnamed. */
const EXCLUDED_NODES: readonly SkillNode[] = getNodesByScope("excluded");

/** A bare registry id, the string the fallback hands back. */
const RAW_ID = /^[A-Z]{2,3}\.[0-9A-Z]+$/;

/** The doc the spine-sourced names are quoted from, as the CI scope filter names it. */
const SPINE_DOC_PATH = "docs/Node_Spine_v4.md";

/**
 * THE SPINE DOC ITSELF, through Vite's `?raw` glob — the house idiom for a test that needs
 * a file's text under `apps/web`'s DOM-only `lib`, where `node:fs` is not declared
 * (`era2SkillModels.test.ts`, `revealReAsk.test.ts`, `workUploadInvariant.browser.test.ts`).
 *
 * Reading it is the whole point: without it the quotes in
 * `SKILL_SPINE_SOURCES` are recorded data that the doc can silently contradict. The first
 * version of this file left it out and said why — a source that names a markdown path in
 * executable code owes that path a code classification in the CI scope filter
 * (`test/ciScopeFilter.test.ts`), so that an edit to the doc runs the gates that read it,
 * and satisfying that meant editing the workflow. `docs/Node_Spine_v4.md` is now in that
 * step's `TEST_INPUT_MARKDOWN`, so the obligation is discharged rather than dodged, and
 * the guard that would have caught this reader is what put it there.
 */
const SPINE_DOC = import.meta.glob("../../../../docs/Node_Spine_v4.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const spineText: string = Object.values(SPINE_DOC).join("");

/**
 * The node tables, as `node id -> its `Skill` cell verbatim`.
 *
 * Read BY COLUMN and not by substring. `expect(doc).toContain(quote)` would pass on a
 * statement that appears anywhere in the file — in another node's Notes, in the change
 * log at the foot — so it could not tell a quote that is still that node's row from one
 * that has been moved onto a different node, which is the drift most likely to happen
 * when the curriculum is re-cut. The first cell must be a bare node id, which is what
 * keeps the prereq, tier and edge tables out of the map.
 */
function spineRows(markdown: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
      continue;
    }
    const cells = trimmed.slice(1, -1).split("|");
    const nodeId = cells[0]?.trim() ?? "";
    const skill = cells[1]?.trim();
    if (cells.length < 2 || skill === undefined || !RAW_ID.test(nodeId)) {
      continue;
    }
    if (!rows.has(nodeId)) {
      rows.set(nodeId, skill);
    }
  }
  return rows;
}

const SPINE_ROWS = spineRows(spineText);

describe("the population this sweep measures is derived from the registry", () => {
  it("agrees with the era partition, so neither derivation can drift alone", () => {
    // Deriving at all is not the same as deriving the RIGHT set. Two independent reads
    // of the registry — product scope and era membership — must name the same nodes, so
    // a node added to the graph but left out of an era (or the reverse) fails here
    // rather than quietly shrinking the population this file sweeps.
    expect([...PRODUCT_IDS].sort()).toEqual([...ERA_ORDERED_IDS].sort());
    expect(new Set(PRODUCT_IDS).size).toBe(PRODUCT_IDS.length);
  });

  it("has a floor and a composition, so it cannot shrink to the layer it used to stop at", () => {
    expect(PRODUCT_IDS.length).toBeGreaterThanOrEqual(62);

    // THE COMPOSITION CLAIM. A floor of 62 is satisfied by D1 and D2 plus fifty-one of
    // anything; the defect was precisely that the table held D1 and D2 and nothing else.
    // So assert that the population is genuinely wider than those two domains: the
    // eleven nodes that were already named owe fifty-one others.
    const beyondNamedLayer = PRODUCT_NODES.filter(
      (node) => node.domain !== "D1" && node.domain !== "D2",
    );
    expect(beyondNamedLayer.length).toBeGreaterThanOrEqual(51);

    // And that it spans the whole curriculum rather than one deep domain.
    expect(new Set(PRODUCT_NODES.map((node) => node.domain)).size).toBeGreaterThanOrEqual(
      10,
    );
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      expect(era.nodes.length, `${era.id} contributes no node`).toBeGreaterThan(0);
    }
  });
});

describe("every live skill node has a learner-facing name", () => {
  // The sweep the defect needed. Remove any one row from `SKILL_DISPLAY_NAMES` and the
  // case for that node fails with the id it would have printed.
  for (const nodeId of PRODUCT_IDS) {
    it(`${nodeId} names its skill in words, not its registry id`, () => {
      const shown = skillDisplayName(nodeId);
      expect(shown, `${nodeId} falls through to its raw registry id`).not.toBe(nodeId);
      expect(shown.trim().length, `${nodeId} resolves an empty name`).toBeGreaterThan(0);
      expect(shown, `${nodeId} resolves something id-shaped`).not.toMatch(RAW_ID);
    });
  }

  it("is TOTAL over the population, with no exempted nodes", () => {
    // There is no exception list here, and that is a claim rather than an omission: all
    // 62 nodes had a source to be named from, so nothing legitimately owes no name. If a
    // future node genuinely does, it needs a named both-ways exception list — not a
    // quiet narrowing of `PRODUCT_NODES` above.
    expect([...NAMED_SKILL_NODES].sort()).toEqual([...PRODUCT_IDS].sort());
  });

  it("names every node distinctly, so a roster row cannot label two buildings alike", () => {
    const shown = PRODUCT_IDS.map((nodeId) => skillDisplayName(nodeId));
    expect(new Set(shown).size).toBe(shown.length);
  });

  it("holds no name for a retired or cut id", () => {
    // The other direction on the table: a dead id must not survive here as a name.
    expect(EXCLUDED_NODES.length).toBeGreaterThanOrEqual(4);
    for (const node of EXCLUDED_NODES) {
      expect(["retired", "cut"]).toContain(node.status);
      expect(
        NAMED_SKILL_NODES,
        `${node.id} is ${node.status} but still named`,
      ).not.toContain(node.id);
    }
  });

  it("still hands back an id that is not a skill node at all", () => {
    // `announcements.ts` reaches this lookup with the ISLAND HUB sentinel, which is not a
    // skill node and owes no name. Degrading to the input is the documented behaviour
    // there, and the fix above must not have turned a graceful fallback into a throw.
    expect(skillDisplayName("town-hall")).toBe("town-hall");
    expect(skillDisplayName("")).toBe("");
  });
});

describe("every name is sourced from authored copy, both ways", () => {
  /**
   * The pack-backed nodes and the spine-backed nodes, split by what EXISTS rather than
   * by a written list: a node is pack-backed the moment `content/lessons/**` carries a
   * title for it.
   */
  const packBacked = PRODUCT_IDS.filter((id) => lessonByNode[id]?.title !== undefined);
  const spineBacked = PRODUCT_IDS.filter((id) => lessonByNode[id]?.title === undefined);

  it("quotes or records its pack title for every node that has a pack", () => {
    let verbatim = 0;
    let edited = 0;
    for (const nodeId of packBacked) {
      const title = lessonByNode[nodeId]?.title;
      const shown = skillDisplayName(nodeId);
      if (shown === title) {
        verbatim += 1;
        continue;
      }
      expect(
        SKILL_SOURCE_TITLES[nodeId],
        `${nodeId}'s display name "${shown}" is an edit of no recorded title`,
      ).toBe(title);
      edited += 1;
    }
    // Floors under BOTH arms, so neither the verbatim rule nor the edit rule can go
    // unmeasured while the other carries the count.
    expect(verbatim).toBeGreaterThanOrEqual(14);
    expect(edited).toBeGreaterThanOrEqual(45);
  });

  it("keeps every recorded pack title honest against the pack it claims to quote", () => {
    // The reverse direction: a provenance entry cannot drift off its source, and cannot
    // sit here for a node whose pack has gone away.
    for (const [nodeId, recorded] of Object.entries(SKILL_SOURCE_TITLES)) {
      expect(lessonByNode[nodeId]?.title, `${nodeId} records a title it cannot quote`).toBe(
        recorded,
      );
    }
    expect(Object.keys(SKILL_SOURCE_TITLES).length).toBeGreaterThanOrEqual(48);
  });

  /**
   * THE ONE NAMED EXCEPTION, and it fails both ways.
   *
   * Three nodes (POL.5..POL.7, D4's graphing trio) have no lesson pack at all, so they
   * cannot owe a pack title. They are exempted from the rule above by NAME, with each
   * one's source quoted from `docs/Node_Spine_v4.md`:
   *
   *  - a node with no pack and no entry here fails (it is unsourced copy);
   *  - an entry whose node has GAINED a pack fails, so the exemption cannot outlive the
   *    reason for it;
   *  - an entry for a node that has left the graph fails;
   *  - an entry with an empty or id-shaped quote fails, so the exemption cannot be
   *    satisfied by a placeholder.
   *
   * The second of those has now fired in anger, which is the evidence that this list is
   * load-bearing rather than decorative. The exemption stood at FOURTEEN until D6's
   * eleven lesson packs landed; CG.1 and FUN.1..FUN.10 gained packs, this guard went red
   * on all eleven, and their names were re-sourced from the pack titles — two verbatim
   * (FUN.2, FUN.5) and nine recorded in `SKILL_SOURCE_TITLES` as deliberate edits. The
   * floors below were then RE-DERIVED by measurement rather than decremented by eleven.
   * POL.5..POL.7 are exempt only until D4's graphing lessons are authored, at which
   * point they owe the same reconciliation.
   */
  it("exempts only the nodes that have no pack, and names each one", () => {
    for (const nodeId of spineBacked) {
      expect(
        SKILL_SPINE_SOURCES[nodeId],
        `${nodeId} has no lesson pack and no recorded spine source: its name is unsourced`,
      ).toBeDefined();
    }
    for (const [nodeId, quote] of Object.entries(SKILL_SPINE_SOURCES)) {
      expect(PRODUCT_IDS, `${nodeId} is exempted but is not a live node`).toContain(nodeId);
      expect(
        lessonByNode[nodeId],
        `${nodeId} has gained a lesson pack: re-source its name from the pack title`,
      ).toBeUndefined();
      expect(quote.trim().length, `${nodeId} records an empty spine row`).toBeGreaterThan(
        15,
      );
      expect(quote, `${nodeId} records an id instead of a row`).not.toMatch(RAW_ID);
    }
  });

  it("has not let the exemption swallow the population", () => {
    // Disjointness, then floors on the SIZE and the COMPOSITION of both sides.
    expect(packBacked.filter((id) => spineBacked.includes(id))).toEqual([]);
    expect(packBacked.length + spineBacked.length).toBe(PRODUCT_IDS.length);
    // Shrank as packs landed, and is now empty: three until POL.6 and POL.7 were authored, one
    // until POL.5 was. Asserted as empty rather than floored at zero, which would say nothing,
    // and the pack-backed floor is raised to the whole product in the same breath so the two
    // cannot both drift.
    expect(spineBacked).toEqual([]);
    expect(packBacked.length).toBe(PRODUCT_IDS.length);
    expect(packBacked.length).toBeGreaterThanOrEqual(62);

    // The pack-backed side is the one the exemption could erode, and a floor of 59 is
    // satisfied by D1 and D2's eleven plus forty-eight of anything. So assert the
    // composition: the packs reach well past the two domains that were already named.
    const packBackedBeyondNamedLayer = packBacked.filter((id) => {
      const domain = PRODUCT_NODES.find((node) => node.id === id)?.domain;
      return domain !== "D1" && domain !== "D2";
    });
    expect(packBackedBeyondNamedLayer.length).toBeGreaterThanOrEqual(48);

    // D9, then D6, are the cohorts that moved from the named exception into authored
    // packs. Derive each one's members from the registry and assert the composition, so
    // the size floors cannot be satisfied by gaining that many unrelated packs while a
    // trigonometry or functions name silently falls back to its old spine quote.
    const d9ProductIds = PRODUCT_NODES.filter((node) => node.domain === "D9").map(
      (node) => node.id,
    );
    expect(d9ProductIds.length).toBeGreaterThanOrEqual(9);
    expect(d9ProductIds.filter((id) => packBacked.includes(id))).toEqual(d9ProductIds);

    const d6ProductIds = PRODUCT_NODES.filter((node) => node.domain === "D6").map(
      (node) => node.id,
    );
    expect(d6ProductIds.length).toBeGreaterThanOrEqual(11);
    expect(d6ProductIds.filter((id) => packBacked.includes(id))).toEqual(d6ProductIds);
  });
});

/**
 * THE ROT CHECK. A quote that nothing compares against the source is not a quote, it is a
 * sentence in this repository that happens to have been copied once.
 *
 * `ef1f80a6` transcribed these by hand, and they are the provenance of
 * names the learner reads out of the city — the roster's third span, the rooftop label,
 * the completion roll. Nothing measured them against the doc, so the doc could be
 * rewritten and every one of them go on claiming a source it no longer has. The first run
 * of this sweep found exactly that already latent: TRG.8 recorded the first clause of its
 * row rather than the row.
 */
describe(`every spine quote still reads that way in ${SPINE_DOC_PATH}`, () => {
  it("read the doc, and found the node tables in it", () => {
    // The floor under the whole block. Every case below passes by finding agreement,
    // which is also how they would look over an empty read: a glob that matched nothing
    // gives `spineText` of "", `SPINE_ROWS` of size 0, and `.get()` of undefined for
    // every entry — so the per-node cases would fail, but the population claim would
    // not, and this is the assertion that says which.
    expect(Object.keys(SPINE_DOC), `${SPINE_DOC_PATH} was not globbed`).toHaveLength(1);
    expect(spineText.length).toBeGreaterThan(10_000);
    expect(SPINE_ROWS.size, "the node tables parsed to nothing").toBeGreaterThanOrEqual(62);
    // And the parse reads the SKILL column rather than some other cell: a prereq list or
    // a section reference would be short and id-shaped.
    for (const [nodeId, skill] of SPINE_ROWS) {
      expect(skill.length, `${nodeId}'s row parsed to "${skill}"`).toBeGreaterThan(15);
    }
  });

  /**
   * THE MAP IS EMPTY, and that is asserted rather than left to a floor that would have to be
   * lowered to zero.
   *
   * This block used to floor `SKILL_SPINE_SOURCES` at one, so its per-entry loop below could not
   * pass by describing nothing, and its own comment said what would end it: *"when the last
   * unauthored node gains a pack this assertion goes red, and that is the outcome to want."*
   * `POL.5` gained a pack. A floor of zero asserts nothing at all, so the floor is replaced by
   * the fact it was standing in for, in both directions:
   *
   *  - **no node needs an exemption**, because every in-product node is pack-backed. Derived
   *    from the packs on disk rather than from the map, so it fails on a node losing its lesson
   *    even though the map is where the fix would go;
   *  - **and no exemption is present**, so an entry cannot reappear for a node that has a pack
   *    and quietly outrank its own title.
   */
  it("exempts nothing, because every in-product node is pack-backed", () => {
    const withoutPack = PRODUCT_IDS.filter((id) => lessonByNode[id]?.title === undefined);
    expect(
      withoutPack,
      "these nodes have no lesson pack, so each needs a quoted spine row in SKILL_SPINE_SOURCES",
    ).toEqual([]);
    expect(Object.keys(SKILL_SPINE_SOURCES)).toEqual([]);
    expect(PRODUCT_IDS.length).toBeGreaterThanOrEqual(62);
  });

  /**
   * The rot check itself, kept exercised over the WHOLE spine rather than retired with its last
   * consumer.
   *
   * The per-entry loop that used to live here ran over `SKILL_SPINE_SOURCES` and now has nothing
   * to iterate. Deleting the block with it would take the doc-reading machinery out of CI, and
   * that machinery is what the exemption branch depends on: the day a node is added to the
   * registry ahead of its lesson, `skillNames.ts` owes a quoted row and this is the only thing
   * that would notice the row had been reworded since. So the population widens from the
   * exemptions to every in-product node, and the claim is that each one's Skill cell is
   * READABLE — present, and a sentence rather than an id or a prereq list.
   *
   * That is weaker per node than comparing a quote against its row, and it is the strongest
   * claim available with no quotes left to compare: a name that is not sourced from the spine
   * cannot be checked against it. The quote comparison returns automatically with the first
   * entry, because the loop is derived from the map.
   */
  it("still parses a readable Skill cell for every in-product node", () => {
    const unreadable: string[] = [];
    for (const nodeId of PRODUCT_IDS) {
      const row = SPINE_ROWS.get(nodeId);
      if (row === undefined || row.trim().length <= 15 || RAW_ID.test(row)) {
        unreadable.push(`${nodeId}: ${row ?? "(no row)"}`);
      }
    }
    expect(
      unreadable.join("\n"),
      `these nodes have no readable Skill cell in ${SPINE_DOC_PATH}, so an exemption quoted ` +
        `from one could not be checked`,
    ).toBe("");
    expect(PRODUCT_IDS.length).toBeGreaterThanOrEqual(62);
  });

  for (const [nodeId, quote] of Object.entries(SKILL_SPINE_SOURCES)) {
    it(`${nodeId}`, () => {
      const row = SPINE_ROWS.get(nodeId);
      expect(
        row,
        `${nodeId} has no node-table row in ${SPINE_DOC_PATH} any more, so the name ` +
          `skillNames.ts shows for it is sourced from nothing`,
      ).toBeDefined();
      expect(
        row,
        `${nodeId}'s row in ${SPINE_DOC_PATH} no longer reads as skillNames.ts quotes ` +
          `it. Re-source the name from the row as it stands now, or restore the row.`,
      ).toBe(quote);
    });
  }
});
