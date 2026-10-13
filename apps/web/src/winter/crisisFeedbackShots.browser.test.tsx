/**
 * THE THREE PICTURES THIS PASS IS ASKING TO BE READ, at the game's own camera.
 *
 * The lead reads the prose himself, so the copy has to be photographed rather than quoted:
 * the solution after a miss, the same solution after a hit, and the round resolving on the
 * last answer where a button labelled "Resolve" used to stand.
 *
 * Gitignored, like every other `__screenshots__` shot in this tree. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/winter/crisisFeedbackShots.browser.test.tsx
 *
 * A pull-back is the declaration, because it needs no cell and because it is the one in the
 * report: the panel in the screenshot the lead filed was a pull-back's.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { HardWinterSurface } from "./HardWinterSurface";
import { WINTER_NODE_ORDER, winterBatchFor, winterFrozenItem } from "./hardWinterItems";

import "../styles.css";
import { wrongButReadable } from "../test/wrongButReadable";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * A learner who has practised every era-one skill, stated rather than assumed.
 *
 * The surface reads the learner's REAL practised set now, so a bare mount would draw from an
 * empty store and refuse the batch. These tests are about the mechanic and not about
 * progress, so each one says which learner it is playing as; the progress rule itself is
 * `crisisQuestionPool.test.ts`'s claim.
 */
const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

let h: Harness | null = null;
const DESKTOP = { width: 1440, height: 960 };
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({
        element: query<HTMLElement>(".hw-panel"),
        path: `__screenshots__/crisis/${name}.png`,
      }),
      `no screenshot for ${name}`,
    ).toBeTruthy();
  }
}

test("photographs the solution on both verdicts and the commit step", async () => {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round: 1,
  });
  if (batch.status !== "ready") {
    throw new Error(batch.message);
  }
  const ids = batch.prompts.map((prompt) => prompt.item_version_id);
  const keyOf = (id: string): string => {
    const key = winterFrozenItem(id)?.answer.answer_key;
    if (typeof key !== "string") {
      throw new Error(`no text answer key for ${id}`);
    }
    return key;
  };

  h = mount(<HardWinterSurface readMasteredNodes={allPractised} />);
  await waitFor(() => document.querySelector(".hw-grid") !== null, "the island renders");
  const shell = query<HTMLElement>(".hw-shell");
  // A shield rather than the pull-back this drove, which was ruled out on 2026-08-02.
  findButton(shell, /Reinforce a building/).click();
  // The cell has to become a control before it takes a click: the grid only renders a building's
  // cell as a `<button>` once the mode is armed, and clicking the `<div>` it was would arm nothing.
  await waitFor(
    () => document.querySelector(".hw-grid button[data-node]") !== null,
    "a building becomes a target",
  );
  query<HTMLElement>(".hw-grid button[data-node]").click();
  await waitFor(() => !findButton(shell, /Commit and face/).disabled, "commit arms");
  findButton(shell, /Commit and face/).click();

  // A miss, a hit, then a miss again, so the round resolves at 1 of 3 and the outcome has a
  // real tier under it rather than the trivial 0 or 3.
  const plan = [false, true, false] as const;
  for (const [index, right] of plan.entries()) {
    const id = ids[index] as string;
    await waitFor(
      () => document.querySelector(".hw-panel input") !== null,
      `question ${index + 1} renders`,
    );
    setInputValue(
      query<HTMLInputElement>(".hw-panel input"),
      right ? keyOf(id) : wrongButReadable(keyOf(id)),
    );
    await waitFor(() => !findButton(shell, "Check").disabled, "Check arms");
    findButton(shell, "Check").click();
    await waitFor(
      () => document.querySelector(".hw-solution") !== null,
      `the solution renders for question ${index + 1}`,
    );
    if (index === 0) {
      await shoot("solution-after-a-miss");
    }
    if (index === 1) {
      await shoot("solution-after-a-hit");
    }
    findButton(
      shell,
      index + 1 >= plan.length ? /See what you earned/ : /Next question/,
    ).click();
  }

  // The round resolved on that last answer, with nothing pressed after it: the commit button
  // this shot used to photograph is gone by the lead's ruling, and the outcome it used to
  // produce is what the panel is showing now.
  await waitFor(
    () => document.querySelector(".hw-magnitude") !== null,
    "the last answer resolves the round",
  );
  await shoot("round-resolved");
});
