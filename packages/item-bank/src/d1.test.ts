import { describe, expect, it } from "vitest";

import { D1_EXTRA_PRACTICE_TEMPLATES } from "./d1/practice";
import {
  buildRandomizedD1PracticeSet,
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_MIX,
  D1_PRACTICE_NODES,
  D1_PRACTICE_ONLY_TEMPLATES,
  D1_PRACTICE_POOL,
  D1_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D1_PRACTICE_TEMPLATES,
  D1_PRACTICE_VARIANTS,
  D1_TEMPLATES,
  D1_WALK_TEMPLATES,
} from "./index";
import { hashItemDefinition } from "./schema";
import type { ItemTemplate } from "./template";

/**
 * The D1 (Number & Numeracy) practice grid, as a domain test in the shape of `d2` / `d5` /
 * `d7` / `d8`. D1 is the oldest domain and its coverage grew up scattered across the
 * generic suites, so this file deliberately does NOT re-assert what those already own:
 *
 *  - `practice.test.ts` owns `validatePracticePool` over the pool, `validateTemplates` at
 *    30 samples over the grid, the five-slot composition, `getD1PracticeSet`,
 *    `drawD1PracticeInstance`, and the randomized set's mix / order / gradability.
 *  - `template.test.ts` owns the assessment templates and the frozen A/B form pins.
 *  - `walk.test.ts` owns the walk pool, its depth, and its own hash pin.
 *  - Pool isolation is already asserted from both directions: outward in
 *    `practice.test.ts` and `walk.test.ts`, inward from `d2` / `d5` / `d7` / `product` /
 *    `interactive`, each of which excludes every D1 pool.
 *
 * What is left, and what this file is for, is the layer the sibling domain tests have and
 * D1 never got: the authoring conventions that make an id readable, the answer-type spread
 * per node, the pool's content pin, and three D1-specific facts that are easy to lose.
 *
 * D1 differs from its siblings in ways that make a copied D8 assertion wrong rather than
 * merely redundant, so each is pinned here instead of left to a reader to rediscover:
 *
 *  - **Practice templates carry no `varietyKey`.** All six D1 declarations sit on the
 *    `d1w.` WALK generators, where `freezeDeepParallelForms` requires them. D8's "declares
 *    a varietyKey on every template" sweep would fail outright here, and a per-cell variety
 *    guard would be measuring a field that does not exist. Cross-slot answer variety is
 *    instead enforced over the served set in `practiceSelect.test.ts`.
 *  - **A cell holds one to three shapes, not a flat five per node.** D8 pins 1/2/2 distinct
 *    shapes at L1/L2/L3; D1's grid is asymmetric. What it now guarantees is the part a
 *    learner can feel: every cell the mix gives TWO slots holds at least two shapes, so no
 *    practice set serves one shape twice. Until the six `l2b`/`l3b` shapes landed, six of the
 *    twelve two-slot cells held a single shape and were named here as exceptions, which meant
 *    every one of a learner's first six practice sets repeated a question shape
 *    deterministically. The exception list is empty and pinned empty below.
 *  - **`concept` is tagged on the diagnostic templates only.** `ItemTemplate` documents the
 *    tag as "expected for every practice template" and twenty-two practice-added shapes do
 *    not have one, which silently narrows the coverage-aware spreading in `practiceSelect`.
 */

/** The six masterable D1 nodes. There is no `NUM.1`. */
const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/** The answer types each node is allowed to serve. */
const NODE_ANSWER_TYPES: Readonly<Record<string, readonly string[]>> = {
  "NUM.S": ["numeric"],
  "NUM.F": ["numeric"],
  "NUM.2": ["numeric"],
  "NUM.3": ["numeric", "expression"],
  "NUM.4": ["expression"],
  "NUM.5": ["numeric"],
};

/** `NUM.S` -> `s`, `NUM.2` -> `2`: the slug a node's template ids are built from. */
function slugOf(nodeId: string): string {
  return nodeId.slice(4).toLowerCase();
}

const templatesForNode = (nodeId: string): readonly ItemTemplate[] =>
  D1_PRACTICE_TEMPLATES.filter((template) => template.node_id === nodeId);

const shapesInCell = (nodeId: string, difficulty: number): readonly ItemTemplate[] =>
  D1_PRACTICE_TEMPLATES.filter(
    (template) => template.node_id === nodeId && template.difficulty === difficulty,
  );

describe("D1 practice templates (Number & Numeracy)", () => {
  /**
   * An id is the only handle a log, a snapshot or a QA sweep has on a template, so a
   * `d1.num-4.l2` that is really an L3 on `NUM.5` would mislead every one of them. The node
   * and the level are both re-derived from the id and checked against the declared fields.
   */
  it("names every template `d1.num-<slug>.l<difficulty>` after the node and level it serves", () => {
    expect(D1_PRACTICE_TEMPLATES.length).toBeGreaterThanOrEqual(34);
    for (const template of D1_PRACTICE_TEMPLATES) {
      expect(D1_NODES, template.template_id).toContain(template.node_id);
      // A trailing letter marks an alternate shape sharing the cell (`l2b`, `l2c`).
      const match = /^d1\.num-(s|f|[2-5])\.l([123])[a-z]?$/.exec(template.template_id);
      expect(match, template.template_id).not.toBeNull();
      expect(match?.[1], template.template_id).toBe(slugOf(template.node_id));
      expect(Number(match?.[2]), template.template_id).toBe(template.difficulty);
    }
  });

  it("is exactly the diagnostic grid plus the practice-only fillers plus the extra shapes", () => {
    expect(D1_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(D1_PRACTICE_ONLY_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(D1_EXTRA_PRACTICE_TEMPLATES.length).toBeGreaterThanOrEqual(16);
    expect(D1_PRACTICE_TEMPLATES).toHaveLength(
      D1_TEMPLATES.length +
        D1_PRACTICE_ONLY_TEMPLATES.length +
        D1_EXTRA_PRACTICE_TEMPLATES.length,
    );
    // Every template id in the grid is unique, so a duplicated aggregate entry (which would
    // double a cell's shape list and skew the round-robin) fails here.
    expect(new Set(D1_PRACTICE_TEMPLATES.map((t) => t.template_id)).size).toBe(
      D1_PRACTICE_TEMPLATES.length,
    );
  });

  /**
   * The walk generators are a separate, tightened L2 set frozen into the v2 assessment
   * pool. A `d1w.` template that leaked into the practice grid would put an assessment item
   * in front of a learner as practice.
   */
  it("keeps the `d1w.` walk generators out of the practice grid", () => {
    expect(D1_WALK_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    for (const template of D1_WALK_TEMPLATES) {
      expect(template.template_id.startsWith("d1w."), template.template_id).toBe(true);
    }
    const practiceIds = new Set(D1_PRACTICE_TEMPLATES.map((t) => t.template_id));
    for (const template of D1_WALK_TEMPLATES) {
      expect(practiceIds.has(template.template_id), template.template_id).toBe(false);
    }
  });

  it("registers exactly the nodes that have templates, and no NUM.1", () => {
    expect([...D1_PRACTICE_NODES].sort()).toEqual([...D1_NODES].sort());
    expect([...D1_PRACTICE_NODES].sort()).toEqual(
      [...new Set(D1_PRACTICE_TEMPLATES.map((t) => t.node_id))].sort(),
    );
    for (const template of D1_PRACTICE_TEMPLATES) {
      expect(template.node_id, template.template_id).not.toBe("NUM.1");
    }
  });

  /**
   * Every node needs a full L1/L2/L3 ramp: `buildD1PracticePool` throws on an empty cell,
   * so a hole here would take the frozen pool down with it at import time.
   */
  it("fills all eighteen cells of the six-node by three-level grid", () => {
    let cells = 0;
    for (const node of D1_NODES) {
      for (const difficulty of [1, 2, 3] as const) {
        expect(
          shapesInCell(node, difficulty).length,
          `${node}:L${difficulty}`,
        ).toBeGreaterThan(0);
        cells += 1;
      }
    }
    expect(cells).toBe(18);
    for (const node of D1_NODES) {
      expect(templatesForNode(node).length, node).toBeGreaterThanOrEqual(4);
    }
  });
});

/**
 * `ItemTemplate.concept` is documented as "expected for every practice template", and it is
 * what coverage-aware selection spreads a served set across; an untagged template is only
 * spread by `template_id`. Twenty-two of the thirty-four shapes are untagged, so the tag is
 * currently a property of the DIAGNOSTIC grid rather than of the practice grid.
 *
 * That gap is pinned rather than asserted away, in both directions, so it stays visible: a
 * diagnostic template that loses its tag fails, and a practice-added shape that gains one
 * fails and asks for this list to shrink.
 */
describe("D1 concept tags (only the diagnostic grid carries one today)", () => {
  const tagged = D1_PRACTICE_TEMPLATES.filter((t) => t.concept !== undefined);
  const untagged = D1_PRACTICE_TEMPLATES.filter((t) => t.concept === undefined);

  it("tags every diagnostic template with a non-empty concept", () => {
    expect(tagged.length).toBeGreaterThanOrEqual(12);
    expect([...tagged].map((t) => t.template_id).sort()).toEqual(
      [...D1_TEMPLATES].map((t) => t.template_id).sort(),
    );
    for (const template of tagged) {
      expect((template.concept ?? "").length, template.template_id).toBeGreaterThan(0);
    }
  });

  it("leaves exactly the practice-added shapes untagged (a known spreading gap)", () => {
    const expected = [...D1_PRACTICE_ONLY_TEMPLATES, ...D1_EXTRA_PRACTICE_TEMPLATES];
    expect(untagged.length).toBeGreaterThanOrEqual(22);
    expect([...untagged].map((t) => t.template_id).sort()).toEqual(
      [...expected].map((t) => t.template_id).sort(),
    );
  });
});

describe("D1 answers stay in the types their questions call for", () => {
  it("serves each node only its allowed answer types", () => {
    for (const [nodeId, allowed] of Object.entries(NODE_ANSWER_TYPES)) {
      const items = D1_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      expect(items.length, nodeId).toBeGreaterThan(0);
      for (const item of items) {
        expect(allowed, item.item_version_id).toContain(
          item.answer.answer_spec.answer_type,
        );
      }
    }
  });

  /**
   * Reducing the result IS the skill at `NUM.F`, so every one of its answers asks for a
   * fraction and declares `reduced_fraction`. A spec that dropped the simplification would
   * accept `6/8` for `3/4` and stop testing the thing the node exists to test.
   */
  it("asks every NUM.F answer for a reduced fraction", () => {
    const items = D1_PRACTICE_ITEMS.filter((item) => item.node_id === "NUM.F");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const spec = item.answer.answer_spec;
      expect(spec.answer_type, item.item_version_id).toBe("numeric");
      expect(spec.representation, item.item_version_id).toBe("fraction");
      expect(spec.simplification, item.item_version_id).toBe("reduced_fraction");
    }
  });

  /**
   * `NUM.4` is "combine like terms", so an unsimplified but algebraically equal answer is
   * wrong by design. Without `combined_polynomial` the checker would accept `2x + 3x + 1`
   * for `5x + 1`.
   */
  it("requires a combined polynomial from every NUM.4 answer", () => {
    const items = D1_PRACTICE_ITEMS.filter((item) => item.node_id === "NUM.4");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const spec = item.answer.answer_spec;
      expect(spec.answer_type, item.item_version_id).toBe("expression");
      expect(spec.simplification, item.item_version_id).toBe("combined_polynomial");
    }
  });

  /**
   * An expression answer is graded symbolically against the symbols it declares, so a
   * template that forgot `allowed_symbols` would grade a correct `5x + 1` as a parse error
   * the moment a learner typed the variable.
   */
  it("declares allowed symbols on every expression answer", () => {
    const expressions = D1_PRACTICE_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "expression",
    );
    expect(expressions.length).toBeGreaterThan(0);
    for (const item of expressions) {
      expect(
        item.answer.allowed_symbols?.length ?? 0,
        item.item_version_id,
      ).toBeGreaterThan(0);
    }
  });
});

/**
 * How many problem SHAPES a cell holds decides whether its two slots can look different.
 * `D1_PRACTICE_MIX` gives L2 and L3 two slots each, so a two-slot cell with one shape shows
 * the learner the same shape twice, with only the numbers swapped.
 *
 * Six cells were in that position, one per node: `NUM.2:L2` plus L3 on all five other nodes.
 * Because each was a whole cell rather than a chance draw, the repeat was deterministic and
 * it landed in the first practice set anybody ever works. They were named here as declared
 * exceptions; the six `l2b`/`l3b` shapes closed them, so the list is empty and the sweep
 * below is the whole guard over all twelve cells.
 *
 * The both-ways honesty loop is kept for any future entry: a listed cell that gains a second
 * shape fails and asks to be removed, and an unlisted two-slot cell that drops to one shape
 * fails. What stops the list quietly refilling is that its emptiness is pinned, so the first
 * new exemption has to be a deliberate edit here.
 */
describe("D1 shape depth per cell (every two-slot cell holds two shapes)", () => {
  /** Two-slot cells (L2, L3) that hold a single shape, so both slots share it. */
  const SINGLE_SHAPE_TWO_SLOT_CELLS: readonly string[] = [];

  /** The cells the mix fills with two slots: every node at L2 and at L3. */
  const twoSlotCells = D1_PRACTICE_MIX.filter((slot) => slot.count > 1).flatMap((slot) =>
    D1_NODES.map((node) => ({
      key: `${node}:L${slot.difficulty}`,
      node,
      difficulty: slot.difficulty,
    })),
  );

  it("covers every two-slot cell in the grid", () => {
    expect(twoSlotCells.length).toBe(12);
    // The named list must not have grown to swallow the population it is an exception to.
    expect(SINGLE_SHAPE_TWO_SLOT_CELLS.length).toBeLessThan(twoSlotCells.length);
    // Nothing is exempt, so the sweep below is the whole population. Pinning the emptiness
    // makes the first exemption a deliberate edit here rather than a line that quietly turns
    // that sweep into a subset of the grid.
    expect(SINGLE_SHAPE_TWO_SLOT_CELLS).toEqual([]);
  });

  it("holds exactly one shape in each named cell (so a second shape fails)", () => {
    for (const key of SINGLE_SHAPE_TWO_SLOT_CELLS) {
      const cell = twoSlotCells.find((candidate) => candidate.key === key);
      expect(cell, `${key} is a declared exception that still exists`).toBeDefined();
      expect(shapesInCell(cell?.node ?? "", cell?.difficulty ?? 0).length, key).toBe(1);
    }
  });

  it("holds two or more shapes in every two-slot cell that is not named", () => {
    const named = new Set(SINGLE_SHAPE_TWO_SLOT_CELLS);
    const checked = twoSlotCells.filter((cell) => !named.has(cell.key));
    expect(checked.length).toBe(twoSlotCells.length - SINGLE_SHAPE_TWO_SLOT_CELLS.length);
    // A containment over an empty collection is free, and with the exception list empty this
    // number should be the whole grid. Asserted so the sweep cannot be narrowed by an
    // exemption without the count below moving too.
    expect(checked.length).toBe(12);
    for (const cell of checked) {
      expect(
        shapesInCell(cell.node, cell.difficulty).length,
        `${cell.key} fills two slots, so it owes two shapes`,
      ).toBeGreaterThanOrEqual(2);
    }
  });
});

/**
 * Retry depth. `buildD1PracticeVariants` walks away from a template after 200 consecutive
 * content-hash collisions, so a cell with a small parameter space under-delivers without
 * saying so: that is how a lesson quietly loses its reveal-to-retry replacements.
 *
 * `practice.test.ts` bounds the count at 1..6 per shape. Every one of the thirty-four
 * shapes currently delivers the full six, so the exact figure is pinned here — a range that
 * wide would let a shape fall to a single variant and still pass.
 */
describe("D1 retry depth (no silent shortfall)", () => {
  /**
   * Shapes whose parameter space genuinely cannot reach the full budget. Measured empty at
   * the time of writing: all thirty-four deliver six, the six newest shapes included. A future
   * entry is checked in both directions below, so it cannot become a dumping ground.
   */
  const SHALLOW_BY_DESIGN: readonly string[] = [];

  const depthOf = (templateId: string): number =>
    D1_PRACTICE_VARIANTS.filter((item) => item.template_id === templateId).length;

  it("delivers the full budget for every shape that is not declared shallow", () => {
    const shallow = new Set(SHALLOW_BY_DESIGN);
    const checked = D1_PRACTICE_TEMPLATES.filter((t) => !shallow.has(t.template_id));
    expect(checked.length).toBeGreaterThanOrEqual(34);
    for (const template of checked) {
      expect(depthOf(template.template_id), template.template_id).toBe(
        D1_PRACTICE_RETRY_VARIANTS_PER_CELL,
      );
    }
  });

  it("keeps the shallow list honest (each entry exists and really falls short)", () => {
    // Nothing is exempt today, so the loop below is empty and the sweep above is the whole
    // guard. Pinning the emptiness makes the first exemption a deliberate edit here rather
    // than a line that quietly turns the sweep above into a subset of the grid.
    expect(SHALLOW_BY_DESIGN).toEqual([]);

    const ids = new Set(D1_PRACTICE_TEMPLATES.map((t) => t.template_id));
    for (const templateId of SHALLOW_BY_DESIGN) {
      expect(
        ids.has(templateId),
        `${templateId} is a declared exception that still exists`,
      ).toBe(true);
      expect(
        depthOf(templateId),
        `${templateId} no longer needs its exception`,
      ).toBeLessThan(D1_PRACTICE_RETRY_VARIANTS_PER_CELL);
    }
  });

  it("totals one budget per shape across the variant pool", () => {
    expect(D1_PRACTICE_VARIANTS.length).toBe(
      D1_PRACTICE_TEMPLATES.length * D1_PRACTICE_RETRY_VARIANTS_PER_CELL -
        SHALLOW_BY_DESIGN.reduce(
          (short, id) => short + (D1_PRACTICE_RETRY_VARIANTS_PER_CELL - depthOf(id)),
          0,
        ),
    );
  });
});

/**
 * Reshuffling. `practice.test.ts` covers the mix, the slot order and in-set distinctness;
 * what it does not cover is SHAPE spreading, which is the reason a cell holds more than one
 * template at all. A regression that filled both L2 slots from one shape would leave every
 * assertion there green while showing the learner the same problem twice.
 */
describe("D1 practice set (reshuffle without repeating a shape)", () => {
  const seededRng = () => {
    let seed = 1;
    return () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
  };

  it("never serves one problem shape twice in a cell that has more than one", () => {
    const rng = seededRng();
    let multiShapeCellsChecked = 0;
    for (const node of D1_PRACTICE_NODES) {
      for (let run = 0; run < 30; run += 1) {
        const set = buildRandomizedD1PracticeSet(node, rng);
        for (const { difficulty } of D1_PRACTICE_MIX) {
          const slots = set.filter((item) => item.difficulty === difficulty);
          const shapesAvailable = shapesInCell(node, difficulty).length;
          const shapesServed = new Set(slots.map((item) => item.template_id)).size;
          expect(shapesServed, `${node} L${difficulty}`).toBe(
            Math.min(slots.length, shapesAvailable),
          );
          if (slots.length > 1 && shapesAvailable > 1) {
            multiShapeCellsChecked += 1;
          }
        }
      }
    }
    // `Math.min` is what makes the assertion above satisfiable by a single shape wherever a
    // cell only has one, so without a floor this sweep would pass having never once required
    // two DIFFERENT shapes in one cell. It used to read `30 * 6`, because six of the twelve
    // two-slot cells held one shape. All twelve hold two now, so every node contributes both
    // its L2 and its L3 cell on all 30 runs, and this is the line that would catch a cell
    // regressing to a single shape even if the depth guard above were somehow satisfied.
    expect(multiShapeCellsChecked).toBe(30 * 12);
  });
});

describe("D1 pool content pin (a template edit that changes the pool must be explicit)", () => {
  it("pins the frozen D1 practice pool ids + content hashes", () => {
    const snapshot = D1_PRACTICE_POOL.map((item) => ({
      id: item.item_version_id,
      node: item.node_id,
      difficulty: item.difficulty,
      hash: hashItemDefinition(item),
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
