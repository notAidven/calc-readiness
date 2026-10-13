import type { FrozenItem } from "@cr/item-bank";
import { type EraId, getEraOfNode } from "@cr/skill-graph";

import { runtimeStorage } from "../storage/runtimeStorage";
import { practiceItemsById } from "./practiceChecker";

export const REVIEW_MISTAKE_CAP = 24;

export interface ReviewMistake {
  readonly itemVersionId: string;
  readonly nodeId: string;
  readonly templateId: string;
  readonly eraId: EraId;
}

interface MistakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function key(learnerId: string, eraId: EraId): string {
  return `cr.reviewMistakes.v1.${learnerId}.${eraId}`;
}

function seedKey(learnerId: string, eraId: EraId): string {
  return `cr.reviewMistakes.presenterSeed.v1.${learnerId}.${eraId}`;
}

function parse(raw: string | null, eraId: EraId): ReviewMistake[] {
  if (!raw) {
    return [];
  }
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter(
        (entry): entry is ReviewMistake =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as ReviewMistake).itemVersionId === "string" &&
          typeof (entry as ReviewMistake).nodeId === "string" &&
          typeof (entry as ReviewMistake).templateId === "string" &&
          (entry as ReviewMistake).eraId === eraId,
      )
      .filter((entry) => {
        const item = practiceItemsById.get(entry.itemVersionId);
        return item?.node_id === entry.nodeId && item.template_id === entry.templateId;
      })
      .slice(-REVIEW_MISTAKE_CAP);
  } catch {
    return [];
  }
}

export function readReviewMistakes(
  learnerId: string,
  eraId: EraId,
  storage: MistakeStorage | null = runtimeStorage(),
): readonly ReviewMistake[] {
  return parse(storage?.getItem(key(learnerId, eraId)) ?? null, eraId);
}

export function recordReviewMistake(
  learnerId: string,
  item: FrozenItem,
  storage: MistakeStorage | null = runtimeStorage(),
): readonly ReviewMistake[] {
  const era = getEraOfNode(item.node_id);
  if (!era || !storage) {
    return [];
  }
  const held = readReviewMistakes(learnerId, era.id, storage);
  const next: ReviewMistake = {
    itemVersionId: item.item_version_id,
    nodeId: item.node_id,
    templateId: item.template_id,
    eraId: era.id,
  };
  const deduped = [
    ...held.filter((entry) => entry.itemVersionId !== next.itemVersionId),
    next,
  ].slice(-REVIEW_MISTAKE_CAP);
  storage.setItem(key(learnerId, era.id), JSON.stringify(deduped));
  return deduped;
}

export function clearReviewMistake(
  learnerId: string,
  eraId: EraId,
  itemVersionId: string,
  storage: MistakeStorage | null = runtimeStorage(),
): readonly ReviewMistake[] {
  if (!storage) {
    return [];
  }
  const next = readReviewMistakes(learnerId, eraId, storage).filter(
    (entry) => entry.itemVersionId !== itemVersionId,
  );
  storage.setItem(key(learnerId, eraId), JSON.stringify(next));
  return next;
}

export function seedReviewMistakes(
  learnerId: string,
  eraId: EraId,
  items: readonly FrozenItem[],
  storage: MistakeStorage | null = runtimeStorage(),
): readonly ReviewMistake[] {
  if (!storage) {
    return [];
  }
  for (const item of items) {
    if (getEraOfNode(item.node_id)?.id === eraId) {
      recordReviewMistake(learnerId, item, storage);
    }
  }
  return readReviewMistakes(learnerId, eraId, storage);
}

/**
 * Initialize one disposable review queue without turning a legitimately cleared queue back
 * into missed work. The marker lives beside the existing mistake store in the caller's active
 * storage namespace; ordinary learner recording and clearing never read it.
 */
export function seedReviewMistakesOnce(
  learnerId: string,
  eraId: EraId,
  items: readonly FrozenItem[],
  storage: MistakeStorage | null = runtimeStorage(),
): readonly ReviewMistake[] {
  if (!storage) {
    return [];
  }
  if (storage.getItem(seedKey(learnerId, eraId)) === "seeded") {
    return readReviewMistakes(learnerId, eraId, storage);
  }
  const seeded = seedReviewMistakes(learnerId, eraId, items, storage);
  storage.setItem(seedKey(learnerId, eraId), "seeded");
  return seeded;
}
