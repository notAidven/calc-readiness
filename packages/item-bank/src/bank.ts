import type { D1ItemVersion, D1NodeId, ProductItemVersion } from "@cr/components";
import type {
  DiagnosticItem,
  DiagnosticItemBank,
  DiagnosticStageSlot,
  WalkItemSource,
  WalkProbeItem,
} from "@cr/diagnostic";

import { hashItemDefinition, type ItemPackEntry } from "./schema";

function slotKey(form: string, nodeId: string, difficulty: number): string {
  return `${form}:${nodeId}:L${difficulty}`;
}

/**
 * A concrete `DiagnosticItemBank` over authored item packs. Serves the assessment
 * pools (`A`/`B`) only — `practice` items are never served by the diagnostic.
 * Selection is deterministic (first authored item per form/node/difficulty cell).
 */
export function createItemBank(entries: readonly ItemPackEntry[]): DiagnosticItemBank {
  const byCell = new Map<string, ItemPackEntry>();
  for (const entry of entries) {
    if (entry.form === "practice") {
      continue;
    }
    const key = slotKey(entry.form, entry.node_id, entry.difficulty);
    if (!byCell.has(key)) {
      byCell.set(key, entry);
    }
  }

  return {
    selectItem(slot: DiagnosticStageSlot, formId: string): DiagnosticItem {
      const entry = byCell.get(slotKey(formId, slot.node_id, slot.difficulty));
      if (!entry) {
        throw new Error(
          `item bank has no item for form ${formId} node ${slot.node_id} L${slot.difficulty}`,
        );
      }
      return {
        item_version_id: entry.item_version_id,
        node_id: entry.node_id,
        difficulty: entry.difficulty,
        item_definition_hash: hashItemDefinition(entry),
      };
    },
  };
}

/**
 * A NODE-addressed `WalkItemSource` over an authored pack — the v2 walk's analogue
 * of `createItemBank` (which is slot/difficulty-addressed for the v1 MST). The walk
 * probes a node and adjudicates 2-of-3, so it asks for the `attempt`-th (0-based)
 * parallel item for a (form, node); successive attempts within a node must return
 * distinct items (see `MAX_PROBE_ITEMS = 3`).
 *
 * The walk carries no difficulty (its adjudicator counts correctness only, and
 * placement is a fixed status→seed map), so each node is served from a single
 * consistent cell: entries are grouped by (form, node) and ordered by (difficulty,
 * id), so the routing-difficulty instances lead. Pair with `D1_WALK_ITEM_PACK`,
 * which authors exactly `D1_WALK_ITEMS_PER_CELL` L2 items per node per form. A pack
 * too thin for a requested attempt throws (surfacing the item-pool gap loudly
 * rather than silently repeating a probe).
 */
export function createItemPackWalkSource(
  entries: readonly ItemPackEntry[],
): WalkItemSource {
  const byNode = new Map<string, ItemPackEntry[]>();
  for (const entry of entries) {
    if (entry.form === "practice") {
      continue;
    }
    const key = `${entry.form}:${entry.node_id}`;
    const list = byNode.get(key) ?? [];
    list.push(entry);
    byNode.set(key, list);
  }
  for (const list of byNode.values()) {
    list.sort(
      (left, right) =>
        left.difficulty - right.difficulty ||
        left.item_version_id.localeCompare(right.item_version_id),
    );
  }

  return {
    selectProbeItem({ node_id, attempt, form_id }): WalkProbeItem {
      const entry = byNode.get(`${form_id}:${node_id}`)?.[attempt];
      if (!entry) {
        throw new Error(
          `walk item source has no attempt ${attempt} for form ${form_id} node ${node_id} (pool too thin for the 2-of-3 rule)`,
        );
      }
      return {
        item_version_id: entry.item_version_id,
        node_id: entry.node_id,
        item_definition_hash: hashItemDefinition(entry),
        difficulty: entry.difficulty,
      };
    },
  };
}

/**
 * Project the grading half of the item packs into the checker's registry, so the
 * authoritative scorer grades exactly the items the bank serves (one source of
 * truth). Pass the result to `createD1AnswerChecker({ itemVersions })`.
 */
export function toD1ItemVersions(entries: readonly ItemPackEntry[]): D1ItemVersion[] {
  return entries.map((entry) => ({
    item_version_id: entry.item_version_id,
    // `node_id` is item-version metadata only (the checker keys off item_version_id),
    // so widening `ItemPackEntry.node_id` to string is safe for the D1 projection.
    node_id: entry.node_id as D1NodeId,
    answer: entry.answer,
  }));
}

/**
 * Project the grading half of the item packs into the Phase-2 product (v2) checker's
 * registry (`createProductAnswerChecker({ itemVersions })`). Identical to
 * {@link toD1ItemVersions} but keeps `node_id` as `string`, since the v2 checker
 * grades the widened product node set (LIN.1, POL.1, ...) as well as the D1 nodes.
 */
export function toProductItemVersions(
  entries: readonly ItemPackEntry[],
): ProductItemVersion[] {
  return entries.map((entry) => ({
    item_version_id: entry.item_version_id,
    node_id: entry.node_id,
    answer: entry.answer,
  }));
}
