import {
  type AnswerChecker,
  createD1AnswerChecker,
  createProductAnswerChecker,
  createVersionedAnswerChecker,
  D1_CHECKER_VERSION,
  PRODUCT_CHECKER_VERSION,
} from "@cr/components";

import { D1_PRACTICE_ITEMS } from "./d1";
import { D10_PRACTICE_ITEMS } from "./d10";
import { D2_PRACTICE_ITEMS } from "./d2";
import { D3_PRACTICE_ITEMS } from "./d3";
import { D4_PRACTICE_ITEMS } from "./d4";
import { D5_PRACTICE_ITEMS } from "./d5";
import { D6_PRACTICE_ITEMS } from "./d6";
import { D7_PRACTICE_ITEMS } from "./d7";
import { D8_PRACTICE_ITEMS } from "./d8";
import { D9_PRACTICE_ITEMS } from "./d9";
import { INTERACTIVE_PRACTICE_ITEMS } from "./interactive/practice";
import { toD1ItemVersions } from "./bank";
import type { FrozenItem } from "./template";

/**
 * The complete learner-practice population, shared by browser grading and server-side
 * interleaved-clear verification. Keeping the population here prevents an authenticated
 * clear from being graded against a hand-copied subset of what the drill can actually serve.
 */
const PRODUCT_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...INTERACTIVE_PRACTICE_ITEMS,
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
  ...D5_PRACTICE_ITEMS,
  ...D6_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D8_PRACTICE_ITEMS,
  ...D9_PRACTICE_ITEMS,
  ...D10_PRACTICE_ITEMS,
];

export const PRACTICE_AUTHORITY_ITEMS: readonly FrozenItem[] = [
  ...D1_PRACTICE_ITEMS,
  ...PRODUCT_PRACTICE_ITEMS,
];

export const PRACTICE_AUTHORITY_ITEMS_BY_ID: ReadonlyMap<string, FrozenItem> = new Map(
  PRACTICE_AUTHORITY_ITEMS.map((item) => [item.item_version_id, item]),
);

const PRODUCT_ITEM_IDS: ReadonlySet<string> = new Set(
  PRODUCT_PRACTICE_ITEMS.map((item) => item.item_version_id),
);

/** The checker version authored onto one immutable practice instance. */
export function checkerVersionForPracticeItem(item: FrozenItem): number {
  return PRODUCT_ITEM_IDS.has(item.item_version_id)
    ? PRODUCT_CHECKER_VERSION
    : D1_CHECKER_VERSION;
}

/**
 * The same versioned checker used in the browser, constructed without any browser state so
 * the authenticated API can recompute correctness from an item id and raw answer.
 */
export function createPracticeAuthorityChecker(): AnswerChecker {
  const d1 = createD1AnswerChecker({
    itemVersions: toD1ItemVersions(D1_PRACTICE_ITEMS),
  });
  const product = createProductAnswerChecker({
    itemVersions: PRODUCT_PRACTICE_ITEMS.map((item) => ({
      item_version_id: item.item_version_id,
      node_id: item.node_id,
      answer: item.answer,
    })),
  });
  return createVersionedAnswerChecker(
    new Map<number, AnswerChecker>([
      [D1_CHECKER_VERSION, d1],
      [PRODUCT_CHECKER_VERSION, product],
    ]),
  );
}

export const practiceAuthorityChecker: AnswerChecker = createPracticeAuthorityChecker();
