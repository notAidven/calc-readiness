// No `@types/node` in this tree, by the decision recorded at the head of `d6.test.ts`, which
// makes the same source-reading check. The call runs under vitest's node runtime.
// @ts-expect-error - no @types/node in this tree
import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEMO_PINNED_TEMPLATE_IDS, isDemoPinned } from "./demoPinnedTemplates";
import * as bank from "./index";
import { answerVarietyKey } from "./practiceSelect";
import type { ItemDifficulty } from "./schema";
import type { FrozenItem } from "./template";

/**
 * The reveal-to-retry answer repeat, swept across every domain that serves a retry.
 *
 * A reveal shows the learner the answer; the retry button then offers another go at the same
 * cell. Serving an instance carrying the answer just revealed makes that retry a coin flip
 * whose result the learner has already been handed, and in a two-answer cell the base rate is
 * 50%, which is worse than offering no retry at all.
 *
 * `drawRetryInstance` (`practiceSelect.ts`) is the fix: inside each tier that was already
 * going to be served it prefers an instance whose ANSWER is unseen. It shipped wired into D9
 * alone, and the other ten domains kept avoiding by item id, which is a fact about which
 * PROMPT the learner sees and says nothing about which answer. Measured over all 2265 served
 * instances at `5bac81f0`, before adoption: 73 repeats, 3.2% overall, ranging from 0.0%
 * (D9, D10, interactive) to 7.1% (D7), worst cells `d5.rat5.level.l2` and `d8.el1.classify.l2`
 * at 5 of 7 each. After adoption: 0 of 2265.
 *
 * ## Why the population is derived from the tree and not written down here
 *
 * `.cursor/rules/qa-verification.mdc` records a guard (`#219`) that reported green over a
 * defect on eighteen boards because its population was scoped to an abstraction rather than to
 * the behaviour. The same trap is available here: this defect is possible on any surface that
 * serves a retry out of a cell holding more instances than answers, whether or not it imports
 * the shared helper. So the population is every `export function draw*PracticeInstance` found
 * in the item-bank source, and {@link COHORT} is asserted EQUAL to it in both directions.
 * A domain added tomorrow with its own hand-rolled draw fails here until it is wired in.
 *
 * The floor below constrains size, not shape, so the composition is asserted separately: the
 * population has to be more than the single domain the helper originally shipped into, which
 * is the claim that this sweep is genuinely wider than that first adoption.
 *
 * ## No exemption list, and what would earn one
 *
 * Every cell in the tree serves at least two distinct answers, so the strict zero below is
 * reachable and an exemption list would be decoration. A cell whose instances genuinely carry
 * ONE answer between them cannot avoid a repeat — the helper is a preference, never a
 * constraint — and would owe a named entry here with its measured ceiling, asserted in both
 * directions like `d9.test.ts`'s `THIN_ANSWER_CELLS`. Until such a cell exists, zero is the
 * honest assertion.
 */

/** How one domain serves a retry: its registrable pool and its own draw function. */
type Domain = {
  readonly items: readonly FrozenItem[];
  readonly draw: (
    nodeId: string,
    difficulty: ItemDifficulty,
    opts: { avoid?: Iterable<string>; templateId?: string },
  ) => FrozenItem | undefined;
};

/**
 * The dispatch, keyed by the exported function name so the census below can be compared
 * against the tree by name rather than by count. `drawInteractivePracticeInstance` takes no
 * node because its whole pool sits under one synthetic node; the rest take the cell.
 */
const COHORT: Readonly<Record<string, Domain>> = {
  drawD1PracticeInstance: {
    items: bank.D1_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD1PracticeInstance(n as never, d, o),
  },
  drawD2PracticeInstance: {
    items: bank.D2_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD2PracticeInstance(n, d, o),
  },
  drawD3PracticeInstance: {
    items: bank.D3_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD3PracticeInstance(n, d, o),
  },
  drawD4PracticeInstance: {
    items: bank.D4_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD4PracticeInstance(n, d, o),
  },
  drawD5PracticeInstance: {
    items: bank.D5_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD5PracticeInstance(n, d, o),
  },
  drawD6PracticeInstance: {
    items: bank.D6_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD6PracticeInstance(n, d, o),
  },
  drawD7PracticeInstance: {
    items: bank.D7_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD7PracticeInstance(n, d, o),
  },
  drawD8PracticeInstance: {
    items: bank.D8_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD8PracticeInstance(n, d, o),
  },
  drawD9PracticeInstance: {
    items: bank.D9_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD9PracticeInstance(n, d, o),
  },
  drawD10PracticeInstance: {
    items: bank.D10_PRACTICE_ITEMS,
    draw: (n, d, o) => bank.drawD10PracticeInstance(n, d, o),
  },
  drawInteractivePracticeInstance: {
    items: bank.INTERACTIVE_PRACTICE_ITEMS,
    draw: (_n, d, o) => bank.drawInteractivePracticeInstance(d, o),
  },
};

/**
 * The one domain the helper shipped into. Named so the composition assertion can say the
 * population is wider than it, rather than only that it is large.
 */
const FIRST_ADOPTER = "drawD9PracticeInstance";

function sourceFilesUnder(dir: URL): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...sourceFilesUnder(new URL(`${entry.name}/`, dir)));
    } else if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) {
      out.push(readFileSync(new URL(entry.name, dir), "utf8"));
    }
  }
  return out;
}

/** Every retry-draw entry point in the item-bank source, found by reading the tree. */
function declaredDrawFunctions(): Set<string> {
  const found = new Set<string>();
  for (const source of sourceFilesUnder(new URL("./", import.meta.url))) {
    for (const match of source.matchAll(
      /export function (draw[A-Za-z0-9]*PracticeInstance)\b/g,
    )) {
      found.add(match[1] as string);
    }
  }
  return found;
}

describe("reveal-to-retry answer variety, across every domain that serves a retry", () => {
  /**
   * The population, asserted before anything is measured with it. A census that has drifted
   * off the tree can report green over a domain it never walked, so the drift is what fails
   * here rather than being discovered later as a coverage gap.
   */
  it("sweeps every draw function the source declares, and only those", () => {
    const declared = declaredDrawFunctions();
    const swept = new Set(Object.keys(COHORT));

    // Both directions: a new domain that is not wired in fails, and a wired-in name that
    // no longer exists in the source fails too, so this table cannot outlive its dispatch.
    expect(
      [...declared].filter((name) => !swept.has(name)).sort(),
      "every declared retry draw is swept here",
    ).toEqual([]);
    expect(
      [...swept].filter((name) => !declared.has(name)).sort(),
      "every swept name is still declared in the source",
    ).toEqual([]);

    // A floor, so the regex silently matching nothing cannot pass the equality above by
    // making both sets empty.
    expect(
      declared.size,
      "the source declares a retry draw per domain",
    ).toBeGreaterThanOrEqual(11);

    // A floor constrains size, not shape. This is the shape claim: the sweep reaches past the
    // single domain `drawRetryInstance` first shipped into, so the population cannot drift back
    // to that one member (plus ten of anything) while still clearing the floor above.
    expect(declared.has(FIRST_ADOPTER), `${FIRST_ADOPTER} is in the population`).toBe(true);
    expect(
      [...declared].filter((name) => name !== FIRST_ADOPTER).length,
      "the sweep is wider than the one domain the helper shipped into",
    ).toBeGreaterThanOrEqual(10);

    // And the dispatch is the barrel's, not a local reimplementation that could diverge.
    for (const name of declared) {
      expect(typeof (bank as Record<string, unknown>)[name], `${name} is exported`).toBe(
        "function",
      );
    }
  });

  /**
   * The defect itself, walked through the draw the product performs: reveal one served
   * instance, then ask that domain's own draw for the retry with exactly the arguments
   * `practiceSession.ts` passes (the revealed id in `avoid`, the slot's shape in
   * `templateId`).
   *
   * Compared on {@link answerVarietyKey} rather than on `answer_key`, because a widget item
   * has no answer key and two of them compared as `"" === ""` would read as a repeat on every
   * pair. That key compares an interactive item on its spec and falls back to the item's own
   * id, which is never equal to anything else.
   */
  it.each(Object.keys(COHORT))(
    "%s never retries into the answer it just revealed",
    (name) => {
      const { items, draw } = COHORT[name] as Domain;
      let pairs = 0;
      for (const revealed of items) {
        // TEMPORARY. A template pinned to one instance for the demonstration has no second
        // instance to retry INTO, so it is skipped here rather than counted as a domain that
        // stopped offering retries. The exemption is proved still earned in `d3.test.ts`'s
        // `describe("the demonstration pin")`, which fails the moment the pin is reverted.
        if (isDemoPinned(revealed.template_id)) {
          continue;
        }
        const fresh = draw(revealed.node_id, revealed.difficulty, {
          avoid: [revealed.item_version_id],
          templateId: revealed.template_id,
        });
        if (!fresh) {
          continue;
        }
        pairs += 1;
        expect(
          answerVarietyKey(fresh),
          `${name}: retrying ${revealed.template_id} instance ${revealed.item_version_id} served ${fresh.item_version_id}, whose answer is the one just revealed`,
        ).not.toBe(answerVarietyKey(revealed));
      }
      // Without this a domain that stopped offering retries would pass by serving none. Derived
      // from the pool rather than pinned, and exact: every registrable instance owes a retry.
      // The subtrahend is the demonstration pin's own instances and nothing else, so a domain
      // that quietly stopped serving retries still fails here.
      const owed = items.filter((item) => !isDemoPinned(item.template_id)).length;
      expect(pairs, `${name}: every served instance offers a retry`).toBe(owed);
    },
  );

  /**
   * A per-domain floor is not enough on its own: eleven domains each passing over three items
   * would satisfy every assertion above. This is the total, so the sweep cannot shrink to
   * something that no longer means anything. 2265 at `5bac81f0`; a pool that grows raises it.
   */
  it("walks enough pairs to mean something", () => {
    const pairs = Object.values(COHORT).reduce(
      (total, domain) => total + domain.items.length,
      0,
    );
    // TEMPORARY, and self-restoring. A pinned template contributes its canonical instance and
    // NO variants, so the registrable total drops by exactly the retry depth per pinned
    // template. Derived from the pin list rather than written down as a smaller number, so the
    // floor climbs back to 2265 on its own when the list empties and cannot be left lowered.
    const lostToThePin =
      DEMO_PINNED_TEMPLATE_IDS.length * bank.D3_PRACTICE_RETRY_VARIANTS_PER_CELL;
    expect(pairs, "served instances swept").toBeGreaterThanOrEqual(2265 - lostToThePin);
  });
});
