import { isDiagnosticServableShape } from "./answer-shape";
import { D1_ITEM_PACK, D1_PRACTICE_ITEMS, D1_WALK_ITEM_PACK } from "./d1";
import { D1_PRACTICE_TEMPLATES } from "./d1/practice";
import { D2_PRACTICE_ITEMS, D2_PRACTICE_TEMPLATES } from "./d2/practice";
import { D3_PRACTICE_ITEMS, D3_PRACTICE_TEMPLATES } from "./d3/practice";
import { D4_PRACTICE_ITEMS, D4_PRACTICE_TEMPLATES } from "./d4/practice";
import { D5_PRACTICE_ITEMS, D5_PRACTICE_TEMPLATES } from "./d5/practice";
import { D6_PRACTICE_ITEMS, D6_PRACTICE_TEMPLATES } from "./d6/practice";
import { D7_PRACTICE_ITEMS, D7_PRACTICE_TEMPLATES } from "./d7/practice";
import { D8_PRACTICE_ITEMS, D8_PRACTICE_TEMPLATES } from "./d8/practice";
import { D9_PRACTICE_ITEMS, D9_PRACTICE_TEMPLATES } from "./d9/practice";
import { D10_PRACTICE_ITEMS, D10_PRACTICE_TEMPLATES } from "./d10/practice";
import { INTERACTIVE_PRACTICE_ITEMS } from "./interactive/practice";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition, type ItemPackEntry } from "./schema";
import { type FrozenItem, freezeDeepParallelForms, type ItemTemplate } from "./template";

/**
 * WALK FORMS FOR THE NODES THE INSTRUMENT COULD NOT SERVE, FROZEN FROM THE LESSON-PRACTICE
 * TEMPLATES THAT WERE ALREADY THERE.
 *
 * The diagnostic administered 20 of the 62 in-product nodes. The other 42 were short of
 * ASSESSMENT items, not of lessons: 39 of them ship five lesson-practice templates each
 * (1xL1 / 2xL2 / 2xL3), every one a parameterized {@link ItemTemplate} whose key is computed
 * from its drawn params by real arithmetic and whose pool is already validated through the v2
 * product checker the walk composes. So the gap was a freezing job rather than an authoring
 * one, and this module is the freeze.
 *
 * ## Why this is safe by construction rather than by inspection
 *
 * Three properties, none assumed:
 *
 *  1. **The keys grade.** `practiceWalk.test.ts` re-grades every item frozen here through
 *     `createProductAnswerChecker` via `validateWalkPool`, so a template whose key stops
 *     grading fails at authoring time rather than mid-administration. The wedge that matters
 *     is not a wrong answer but `invalid_input`: `isScorable` refuses it, so the walk
 *     re-serves the identical item forever while the fault rate reads 0%.
 *  2. **The shapes are answerable.** Every shape here is a shape LESSON PRACTICE serves, and
 *     since #492 the diagnostic's answer row IS the practice dispatcher — see
 *     `answer-shape.ts` for the branch-by-branch account. A choose-one item is a text field
 *     whose options are in the prompt, which is how `FUN.9`'s parity question works.
 *  3. **The prompt is the neutral one and the ANSWER does not move.** `GenerateContext` lets
 *     a template theme its `practice` prompt while keeping the assessment forms neutral, and
 *     the contract is that *"math, params, and the answer key MUST NOT depend on it"*.
 *     Freezing at form `"A"`/`"B"` takes the neutral branch; the guard asserts the answer is
 *     identical across the two contexts rather than trusting the contract.
 *
 * ## What it deliberately does not do
 *
 * **It never freezes a node the shipped packs already serve**, which is what keeps the D1
 * path byte-identical: {@link ALREADY_SERVED} is derived from those packs, and D1's six and
 * the product spine's fourteen are inside it. Nothing here can add, move or re-seed an item
 * any existing administration was taken against.
 *
 * **It freezes L2 only** — the routing tier a difficulty-agnostic walk probes, the same
 * choice `PRODUCT_TEMPLATES` makes ("one template per node, at the routing tier"). An L1 item
 * would be served FIRST, because `createItemPackWalkSource` orders a served cell by
 * difficulty, so a node's opening probe would be easier than the product spine's and its pass
 * rate would not mean the same thing.
 *
 * ## THE THING THAT ACTUALLY BITES: a parameter space the practice pool has already spent
 *
 * A template's drawable space is small. Most produce between three and a few hundred distinct
 * items, and each one's own practice pool has already frozen up to seven of them (a canonical
 * slot plus six reveal-to-retry variants). What is left over is the budget this module has to
 * live inside, and nine of the seventy-seven candidate templates cannot fund a walk cell —
 * five of them have **nothing** left at all.
 *
 * That has to be handled rather than hoped about, because `freezeDeepParallelForms` bumps a
 * colliding seed up to 500 times and then **accepts the collision**. Measured on the first run
 * of this module: `TRG.2`, `TRG.6`, `TRG.8` and `TRG.9` each emitted one item into both Form A
 * and Form B, which `validateWalkPool` reports as `parallel_form_collision` and which live is
 * a learner meeting their pre item again at post. {@link THIN_TEMPLATES} is the ledger, and a
 * node whose surviving templates cannot fund a cell is EXCLUDED rather than served twice.
 *
 * ## The excluded set is empty now, and the ledger is not
 *
 * `EL.3`, `TRG.7` and `TRG.8` were the three nodes this module could not serve, and all three
 * were fixed the way the ledger implied rather than by loosening it: **more template variation,
 * not more items from the same template.** Nine entries below still record a spent space, and
 * two of them still measure zero; what changed is that their nodes have other shapes to draw
 * from. So {@link EXHAUSTED_TEMPLATE_NODES} is empty, which is the goal state and NOT a reason
 * to stop asserting it — `practiceWalk.test.ts` partitions the candidate nodes into served and
 * named with a floor on the population, so an empty exclusion list cannot be reached by a
 * derivation that considered nothing.
 */

/** Items the walk must be able to serve per (form, node): the 2-of-3 adjudication's floor. */
const WALK_ITEMS_PER_FORM = 3;

/**
 * The difficulty tier this module freezes. `createItemPackWalkSource` orders a served cell by
 * difficulty, so mixing tiers would decide which item a node's first probe is.
 */
export const PRACTICE_WALK_TIER = 2;

/**
 * TEMPLATES WHOSE DRAWABLE SPACE THE PRACTICE POOL HAS ALREADY SPENT, with what is left.
 *
 * A written-down list, and deliberately so: measuring it needs a few thousand `generate()`
 * calls per template, and this module is imported by `apps/web`'s diagnostic runtime, where
 * that would be seconds of work on the startup path for a number that only changes when
 * somebody edits a template. `practiceWalk.test.ts` does the measurement at full precision
 * and asserts this list in BOTH directions — a listed template that turns out to have room
 * fails, and an unlisted template that runs short fails — so it cannot drift off the bank
 * without a test going red.
 *
 * The number is FRESH distinct contents: instances no already-frozen item uses. A template
 * absent from this list has at least {@link RICH_TEMPLATE_BUDGET}.
 */
const THIN_TEMPLATES: Readonly<Record<string, number>> = {
  // Nothing left at all. Each of these draws between three and seven distinct items in
  // total, and its own practice pool plus retry variants has taken every one. Every one of
  // them is still listed and still spent: what changed is that their NODES are served anyway,
  // from authored shapes that vary something other than the value. TRG.7 gained a principal
  // value in degrees for the two inverses its L1 never evaluates and a signed exact-radian
  // answer, which nothing in the bank produced; TRG.8 gained a two-revolution window and a
  // window starting below zero, which is the general solution its own fourth slide teaches.
  // Those four measure 10, 8, 12 and 9 fresh draws, so none of them appears in this list.
  "d9.trg7.arccos-radian.l2": 0,
  "d9.trg7.range-interval.l2": 0,
  "d9.trg8.cosine-negative.l2": 0,
  "d9.trg8.tangent-basic.l2": 0,
  // One left, which cannot fund a cell in either form.
  "d9.trg2.special-exact.l2": 1,
  "d9.trg6.asymptote-degree.l2": 1,
  // Five, one short of a whole cell, and it arrived in this ledger by being DEMOTED rather
  // than by losing depth: it sorts a line into one of three identity families, and twelve
  // lines minus the seven its own pool and variants have already taken leaves five. It is here
  // because this module freezes tier 2 ({@link PRACTICE_WALK_TIER}), so a template moving from
  // L3 to L2 enters this population for the first time on the way down. TRG.4 is served
  // regardless, from `quotient-value.l2` beside it in the same cell.
  "d9.trg4.identity-name.l2": 5,
  // EL.3's original pair, still short: seven fresh draws between them, against the six a
  // lone template needs or the four each two sharing a cell need. The node is served anyway
  // because a THIRD L2 shape was authored for it — `d8.el3.reciprocal-base.l2`, a logarithm
  // whose argument sits below one at a written base — which measures fourteen and shares the
  // cell with the five-draw shape below. Both of these stay listed because both are still
  // short; what changed is that being short no longer costs the node its cell.
  "d8.el3.to-exponential.l2": 2,
  "d8.el3.evaluate-base.l2": 5,
};

/**
 * Fresh draws a template needs to fund a whole cell on its own — {@link WALK_ITEMS_PER_FORM}
 * in each of the two forms. A template with this much can serve a node alone.
 */
const RICH_TEMPLATE_BUDGET = WALK_ITEMS_PER_FORM * 2;

/**
 * Fresh draws a template needs when it SHARES a cell with another, at two instances per form.
 * Two such templates give four items a form, one more than the floor, from two problem
 * shapes — which is the better arrangement, because the walk serves a cell in
 * `item_version_id` order and three instances of one template would ask one question thrice.
 */
const SHARED_TEMPLATE_BUDGET = 2 * 2;

/** Every lesson-practice template in the bank, in domain order. */
const ALL_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...D1_PRACTICE_TEMPLATES,
  ...D2_PRACTICE_TEMPLATES,
  ...D3_PRACTICE_TEMPLATES,
  ...D4_PRACTICE_TEMPLATES,
  ...D5_PRACTICE_TEMPLATES,
  ...D6_PRACTICE_TEMPLATES,
  ...D7_PRACTICE_TEMPLATES,
  ...D8_PRACTICE_TEMPLATES,
  ...D9_PRACTICE_TEMPLATES,
  ...D10_PRACTICE_TEMPLATES,
];

/**
 * Every frozen item already in the bank — both walk packs, the v1 D1 forms, and every
 * domain's practice pool AND its retry variants.
 *
 * This is the `avoidHashes` set and it has to be complete rather than nearly complete.
 * `hashItemDefinition` reads `node_id`, `prompt` and `answer` and NOT the form, so an
 * assessment item frozen from the same template at the same params as a practice item hashes
 * identically to it. `validateItemBank` calls that `practice_assessment_reuse`; live it is a
 * learner meeting their diagnostic question again in the lesson it sent them to.
 */
const EXISTING_ITEMS: readonly ItemPackEntry[] = [
  ...D1_ITEM_PACK,
  ...D1_WALK_ITEM_PACK,
  ...PRODUCT_ITEM_PACK,
  ...D1_PRACTICE_ITEMS,
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
  ...D5_PRACTICE_ITEMS,
  ...D6_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D8_PRACTICE_ITEMS,
  ...D9_PRACTICE_ITEMS,
  ...D10_PRACTICE_ITEMS,
  ...INTERACTIVE_PRACTICE_ITEMS,
];

const TAKEN_HASHES: ReadonlySet<string> = new Set(EXISTING_ITEMS.map(hashItemDefinition));

/**
 * Nodes the SHIPPED walk packs already serve — at least {@link WALK_ITEMS_PER_FORM} items
 * whose shape the answer row can submit, in BOTH forms.
 *
 * Derived rather than listed, and the servability filter is the point: `TRG.2` has an authored
 * walk item and cannot be served by it, because that item is multipart. Keyed on "has an item"
 * this module would skip `TRG.2` and leave it unreachable forever; keyed on "is served" it
 * picks it up.
 */
const ALREADY_SERVED: ReadonlySet<string> = (() => {
  const shipped = [...D1_WALK_ITEM_PACK, ...PRODUCT_ITEM_PACK];
  const perCell = new Map<string, Set<string>>();
  for (const entry of shipped) {
    if (entry.form === "practice" || !isDiagnosticServableShape(entry)) {
      continue;
    }
    const key = `${entry.form}:${entry.node_id}`;
    const hashes = perCell.get(key) ?? new Set<string>();
    hashes.add(hashItemDefinition(entry));
    perCell.set(key, hashes);
  }
  const served = new Set<string>();
  for (const entry of shipped) {
    const a = perCell.get(`A:${entry.node_id}`)?.size ?? 0;
    const b = perCell.get(`B:${entry.node_id}`)?.size ?? 0;
    if (a >= WALK_ITEMS_PER_FORM && b >= WALK_ITEMS_PER_FORM) {
      served.add(entry.node_id);
    }
  }
  return served;
})();

/** The fresh-draw budget this module credits a template with. */
export function templateBudget(templateId: string): number {
  return THIN_TEMPLATES[templateId] ?? RICH_TEMPLATE_BUDGET;
}

/** Every L2 template belonging to a node the shipped packs do not already serve. */
export const PRACTICE_WALK_CANDIDATES: readonly ItemTemplate[] =
  ALL_PRACTICE_TEMPLATES.filter(
    (template) =>
      template.difficulty === PRACTICE_WALK_TIER && !ALREADY_SERVED.has(template.node_id),
  );

/** How a node's cell is funded, or why it cannot be. */
interface NodePlan {
  readonly nodeId: string;
  /** The templates to freeze from, or empty when the node cannot be served. */
  readonly templates: readonly ItemTemplate[];
  /** Instances per template per form. */
  readonly instancesPerCell: number;
}

/**
 * Decide how to fund one node's cell from its L2 templates.
 *
 * Two arrangements, in preference order, because the first gives two problem shapes a cell
 * and the second gives one:
 *
 *  1. **Shared.** Two or more templates that can each afford
 *     {@link SHARED_TEMPLATE_BUDGET}: two instances each, so a cell holds four items across
 *     at least two shapes and the three the walk serves span at least two of them.
 *  2. **Alone.** One template that can afford {@link RICH_TEMPLATE_BUDGET}: three instances,
 *     exactly the cell's floor. All three ask one shape, which is the cost of the node being
 *     served at all.
 *
 * A node that can do neither is returned with no templates, and the derivation drops it.
 */
function planNode(nodeId: string, templates: readonly ItemTemplate[]): NodePlan {
  const shared = templates.filter(
    (template) => templateBudget(template.template_id) >= SHARED_TEMPLATE_BUDGET,
  );
  if (shared.length >= 2) {
    return { nodeId, templates: shared, instancesPerCell: 2 };
  }
  const rich = templates.filter(
    (template) => templateBudget(template.template_id) >= RICH_TEMPLATE_BUDGET,
  );
  const alone = rich[0];
  if (alone) {
    return { nodeId, templates: [alone], instancesPerCell: WALK_ITEMS_PER_FORM };
  }
  return { nodeId, templates: [], instancesPerCell: 0 };
}

/** Candidate nodes with their funding plan, in bank order. */
const PLANS: readonly NodePlan[] = (() => {
  const byNode = new Map<string, ItemTemplate[]>();
  for (const template of PRACTICE_WALK_CANDIDATES) {
    byNode.set(template.node_id, [...(byNode.get(template.node_id) ?? []), template]);
  }
  return [...byNode.entries()].map(([nodeId, templates]) => planNode(nodeId, templates));
})();

/**
 * Candidate nodes whose templates cannot fund a cell, with what they had.
 *
 * Named rather than left in a silent remainder: a node with no content and a node whose
 * content is spent look identical from outside this module — both simply fail to appear — and
 * the second is a fixable authoring gap of one template while the first is a whole lesson.
 */
export const EXHAUSTED_TEMPLATE_NODES: readonly {
  node_id: string;
  budgets: readonly { template_id: string; fresh: number }[];
}[] = PLANS.filter((plan) => plan.templates.length === 0).map((plan) => ({
  node_id: plan.nodeId,
  budgets: PRACTICE_WALK_CANDIDATES.filter(
    (template) => template.node_id === plan.nodeId,
  ).map((template) => ({
    template_id: template.template_id,
    fresh: templateBudget(template.template_id),
  })),
}));

// Seed bases clear of every pool in the bank by an order of magnitude. The highest in use is
// the product spine's Form B at 200_000, running to about 245_000 (D6 and D9 both sit at
// 140_000; their template ids differ, so their frozen ids do not collide). Each node gets its
// own NODE_SEED_STRIDE-wide window, which is an order of magnitude more than the widest plan
// here can span, so a node's window cannot reach its neighbour's however many seeds a
// collision bump walks through.
const FORM_A_SEED_BASE = 1_000_000;
const FORM_B_SEED_BASE = 2_000_000;
const NODE_SEED_STRIDE = 100_000;

/**
 * Strip the practice apparatus off an assessment item.
 *
 * A practice template authors progressive hints and a worked solution, and the diagnostic
 * shows neither: it asks one probe, takes one answer and moves on. Carried through they would
 * be dead weight in the pack and an invitation to a future reader to believe the diagnostic
 * offers hints. Dropping them cannot disturb anything frozen, because `hashItemDefinition`
 * reads only `node_id`, `prompt` and `answer`.
 */
function asAssessmentItem(item: FrozenItem): FrozenItem {
  return { ...item, hints: [], worked_solution: [] };
}

/**
 * Freeze every planned node, one `freezeDeepParallelForms` call each.
 *
 * Per node rather than once over a flat list, because `instancesPerCell` is a per-node
 * decision (see {@link planNode}) and the shipped freezer takes one value for the whole call.
 * Each node's seed window is a function of its position, so the pack is deterministic, and
 * `avoidHashes` accumulates across nodes so a later node can never re-draw an earlier one's
 * content.
 */
const frozen = (() => {
  const avoid = new Set<string>(TAKEN_HASHES);
  const formA: FrozenItem[] = [];
  const formB: FrozenItem[] = [];
  PLANS.forEach((plan, index) => {
    if (plan.templates.length === 0) {
      return;
    }
    const forms = freezeDeepParallelForms(plan.templates, {
      instancesPerCell: plan.instancesPerCell,
      seedBaseA: FORM_A_SEED_BASE + index * NODE_SEED_STRIDE,
      seedBaseB: FORM_B_SEED_BASE + index * NODE_SEED_STRIDE,
      avoidHashes: avoid,
    });
    for (const item of [...forms.formA, ...forms.formB]) {
      avoid.add(hashItemDefinition(item));
    }
    formA.push(...forms.formA.map(asAssessmentItem));
    formB.push(...forms.formB.map(asAssessmentItem));
  });
  return { formA, formB };
})();

/** The templates this module actually froze from. */
export const PRACTICE_WALK_TEMPLATES: readonly ItemTemplate[] = PLANS.flatMap(
  (plan) => plan.templates,
);

/** The nodes this pack serves, in bank order. */
export const PRACTICE_WALK_NODES: readonly string[] = PLANS.filter(
  (plan) => plan.templates.length > 0,
).map((plan) => plan.nodeId);

/** Frozen Form A (pre pool) for the nodes the shipped packs could not serve. */
export const PRACTICE_WALK_FORM_A: readonly FrozenItem[] = frozen.formA;
/** Frozen Form B (post pool), item for item distinct from Form A. */
export const PRACTICE_WALK_FORM_B: readonly FrozenItem[] = frozen.formB;

/** Both forms — the pack `diagnostic-scope.ts` unions into the instrument's pool. */
export const PRACTICE_WALK_ITEM_PACK: readonly FrozenItem[] = [
  ...PRACTICE_WALK_FORM_A,
  ...PRACTICE_WALK_FORM_B,
];
