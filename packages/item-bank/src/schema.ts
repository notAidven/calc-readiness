import type { D1AnswerDefinition } from "@cr/components";
import type { ItemDifficulty } from "@cr/diagnostic";

export type { ItemDifficulty };

/**
 * Which pool an item belongs to. `A`/`B` are the counterbalanced parallel
 * assessment forms (a student sees one at pre, the other at post); `practice`
 * feeds lesson/mastery sets and is NEVER served by the diagnostic. No authored
 * item is shared between practice and assessment pools (content/README).
 */
export type ItemForm = "A" | "B" | "practice";

/**
 * One authored item version. This is the single source of truth: it carries the
 * serving metadata the diagnostic needs (id, node, difficulty, form, prompt) AND
 * the answer definition the authoritative checker grades against. `toD1ItemVersions`
 * projects the grading half for the checker; `createItemBank` serves the rest.
 */
export interface ItemPackEntry {
  /** Immutable item-version id (Contracts §2). Never reused across pools. */
  item_version_id: string;
  /**
   * The skill node this item measures. Widened from `D1NodeId` to `string` so the
   * one authoring pipeline serves BOTH the locked D1 (v1) foundational pack and the
   * Phase-2 product (v2) expansion nodes (LIN.1, POL.1, ...). The D1 packs still
   * author `D1NodeId` literals, so they are unaffected.
   */
  node_id: string;
  difficulty: ItemDifficulty;
  form: ItemForm;
  /** Student-facing question text. */
  prompt: string;
  /** Answer spec + key; consumed verbatim by the D1 answer checker. */
  answer: D1AnswerDefinition;
}

/**
 * Deterministic content hash of an item version (Contracts §2 `item_definition_hash`).
 * FNV-1a/32; dependency-free and identical in Node and the browser. Not a
 * cryptographic hash — sufficient for versioning/integrity at MVP; swap for a
 * SHA when the item bank is published to the asset bucket.
 */
export function hashItemDefinition(entry: ItemPackEntry): string {
  const canonical = JSON.stringify({
    node_id: entry.node_id,
    prompt: entry.prompt,
    answer: entry.answer,
  });
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
