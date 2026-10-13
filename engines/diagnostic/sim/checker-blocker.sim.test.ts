import { createD1AnswerChecker, D1_CHECKER_VERSION } from "@cr/components";
import { D1_WALK_ITEM_PACK, PRODUCT_ITEM_PACK, toD1ItemVersions } from "@cr/item-bank";
import { getProductNodes } from "@cr/skill-graph";
import { describe, it } from "vitest";

/**
 * THE v1 CHECKER BLOCKER, RE-MEASURED AT THE TIP — a measurement tool, NOT a CI test.
 *
 * Fourth sibling in this directory and excluded from CI identically: outside
 * `engines/diagnostic/src/` so no vitest project glob collects it, and outside the
 * package `tsconfig` so `tsc --build` never sees it.
 *
 * ## Why it exists
 *
 * `docs/Diagnostic_11_Node_Scope_Measurement.md` §2 recorded, at `c870c0b5`, that the live
 * v1 checker cannot grade the D2 walk items: **22 of 66 walk-servable items ungradable, 4
 * of the 5 D2 nodes wedging the walk.** That is a blocking finding for widening the
 * diagnostic, and widening is a prerequisite of everything in
 * `docs/superpowers/specs/2026-08-01-test-out-placement-experience.md` §5.
 *
 * `.cursor/rules/qa-verification.mdc`: a finding expires when the tree moves. The tree has
 * moved a long way since `c870c0b5`, so the blocker is re-measured here rather than
 * inherited, and the harness stays so the next reader can re-measure it again.
 *
 * ## Method
 *
 * Build the SHIPPED v1 checker over the D1 + D2 walk items exactly as the two live walk
 * composition points build it (`createD1AnswerChecker({ itemVersions: toD1ItemVersions(...) })`),
 * then hand every item its own `answer_key` — the canonical correct answer the item itself
 * declares. A checker that cannot return `correct` for an item's own key cannot grade that
 * item for anybody. `engines/diagnostic/src/scoring.ts` scores only `correct` and
 * `incorrect`, so anything else is unscorable and the walk cannot advance on it.
 *
 * ## Running it
 *
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     engines/diagnostic/sim/checker-blocker.sim.test.ts --disableConsoleIntercept
 */

const WALK_PACK = [...D1_WALK_ITEM_PACK, ...PRODUCT_ITEM_PACK];

const D1_D2_IDS = new Set(
  getProductNodes()
    .filter((n) => n.domain === "D1" || n.domain === "D2")
    .map((n) => n.id),
);

describe("the v1 checker blocker", () => {
  it("re-measures whether the shipped v1 checker can grade the D1+D2 walk items", () => {
    const inScope = WALK_PACK.filter((e) => D1_D2_IDS.has(e.node_id));
    const checker = createD1AnswerChecker({
      itemVersions: toD1ItemVersions(WALK_PACK),
    });

    console.log(`\n===== v1 CHECKER OVER THE D1+D2 WALK ITEMS =====`);
    console.log(
      `checker version = ${D1_CHECKER_VERSION}; ` +
        `items in scope = ${inScope.length} (of ${WALK_PACK.length} in both packs)`,
    );

    const byNode = new Map<string, { total: number; ok: number; bad: number }>();
    const reasons = new Map<string, number>();
    let noKey = 0;

    for (const entry of inScope) {
      const key = entry.answer.answer_key;
      const row = byNode.get(entry.node_id) ?? { total: 0, ok: 0, bad: 0 };
      row.total += 1;
      if (typeof key !== "string") {
        noKey += 1;
        row.bad += 1;
        reasons.set("no_answer_key", (reasons.get("no_answer_key") ?? 0) + 1);
        byNode.set(entry.node_id, row);
        continue;
      }
      const result = checker({
        raw_answer: key,
        item_version_id: entry.item_version_id,
        equivalence_checker_version: D1_CHECKER_VERSION,
      });
      const scorable = result.status === "correct" || result.status === "incorrect";
      if (scorable && result.status === "correct") {
        row.ok += 1;
      } else {
        row.bad += 1;
        const label = `${result.status}/${result.reason_code}`;
        reasons.set(label, (reasons.get(label) ?? 0) + 1);
      }
      byNode.set(entry.node_id, row);
    }

    console.log(
      `\n--- PER NODE (an item is BAD if its own answer_key is not graded correct) ---`,
    );
    let totalItems = 0;
    let totalBad = 0;
    let wedged = 0;
    for (const id of [...byNode.keys()].sort()) {
      const row = byNode.get(id) as { total: number; ok: number; bad: number };
      totalItems += row.total;
      totalBad += row.bad;
      const wedges = row.bad > 0;
      if (wedges) wedged += 1;
      console.log(
        `  ${id.padEnd(7)} items=${String(row.total).padStart(2)}  graded=${String(row.ok).padStart(2)}  ` +
          `ungradable=${String(row.bad).padStart(2)}${wedges ? "   <- WEDGES THE WALK" : ""}`,
      );
    }
    console.log(
      `\n  TOTAL: ${totalBad} of ${totalItems} items ungradable; ` +
        `${wedged} of ${byNode.size} nodes wedge.` +
        (noKey > 0 ? `  (${noKey} carried no answer_key)` : ""),
    );

    console.log(`\n--- REASONS ---`);
    for (const [label, count] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(3)}  ${label}`);
    }
  });
});
