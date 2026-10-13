/**
 * THE THREE `.hw-shell` OVERRIDES OF THE SHARED ANSWER ROW, MEASURED AND NAMED.
 *
 * The ceremony's defect (#303) was a shared component present and unpainted: the row was
 * called `era-ceremony__row` while every rule that dresses an answer field hangs off
 * `lesson-player__row`. The crisis does not have that defect and this file is the evidence:
 * its row names `lesson-player__row`, so the shared rules reach it and the notation strip
 * inside it is byte-for-byte the ceremony's (which `ceremonyAnswerRow.browser.test.tsx`
 * asserts from the other side).
 *
 * What the crisis does have is `hard-winter.css` restyling that row inside `.hw-shell`.
 * Three rules, and this file records the ruling on each one so the next person does not have
 * to re-derive it:
 *
 *   1. `.hw-shell .lesson-player__row` (wrap + align + margin) — KEPT, and load-bearing. The
 *      shared row is `display: flex` with no wrap, and the crisis rail is the narrowest
 *      answer surface in the app. Without `flex-wrap` the field and its Check button cannot
 *      break onto two lines at 460px; without `align-items: flex-start` the button stretches
 *      to the height of the notation strip and preview beside it. Both are asserted below.
 *   2. `.hw-shell .lesson-player__row input[type="text"]` (2px border, 16px) — KEPT as
 *      declared prototype chrome, not endorsed as product. It is the difference
 *      `ceremonyAnswerRow.browser.test.tsx` pins in both directions, and the whole rail it
 *      sits in is hand-dressed in hardcoded hex (`.hw-panel`, `.hw-chip`,
 *      `.hw-shell .primary-action`), so tokenising the field alone would leave one
 *      token-dressed control inside a hand-dressed panel. It is one commit to delete when
 *      the prototype's chrome is designed, and §8 U8 of the art brief owns that.
 *   3. `.hw-shell .lesson-player__row button[type="submit"]` (`#1f6feb`) — KEPT for the same
 *      reason and one more: blue is this prototype's ACTIVE-CHOICE colour, carried by
 *      `.hw-prompt-line` and by every armed `.hw-chip`, so a green Check here would be the
 *      one control on the surface not speaking the surface's own language. The floor that
 *      matters is asserted instead: this blue must not collide with the correctness palette,
 *      because CIVIC green means right and BRICK red means wrong on the very next line.
 *
 * Every claim here is a computed style, never a class name. A class-name assertion would
 * have been green throughout the ceremony's defect.
 */

import { HARD_WINTER } from "@cr/game";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";
import { answerKeypad } from "../lessons/answerFormat";
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

/** Mount and stop on the first question of round one, with its answer row on screen. */
async function openAnswerRow(): Promise<HTMLElement> {
  h = mount(<HardWinterSurface readMasteredNodes={allPractised} />);
  await waitFor(() => document.querySelector(".hw-grid") !== null, "the island renders");
  const shell = query<HTMLElement>(".hw-shell");
  findButton(shell, /Light a fire/).click();
  await waitFor(
    () => document.querySelector('.hw-grid [data-cell="-2,-2"]')?.tagName === "BUTTON",
    "the board takes a fire",
  );
  query<HTMLElement>('.hw-grid [data-cell="-2,-2"]').click();
  await waitFor(() => !findButton(shell, /Commit and face/).disabled, "commit arms");
  findButton(shell, /Commit and face/).click();
  await waitFor(
    () => document.querySelector(".hw-panel .lesson-player__row input") !== null,
    "the answer row renders",
  );
  return query<HTMLElement>(".hw-panel .lesson-player__row");
}

function itemsFor(round: number): readonly string[] {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(batch.message);
  }
  return batch.prompts.map((prompt) => prompt.item_version_id);
}

function answerKeyFor(itemVersionId: string): string {
  const key = winterFrozenItem(itemVersionId)?.answer.answer_key;
  if (typeof key !== "string") {
    throw new Error(`no text answer key for ${itemVersionId}`);
  }
  return key;
}

function hasKeys(itemVersionId: string): boolean {
  const frozen = winterFrozenItem(itemVersionId);
  return (
    frozen !== undefined &&
    answerKeypad(
      frozen.answer.answer_spec,
      frozen.answer.allowed_symbols,
      frozen.answer.answer_key,
    ).length > 0
  );
}

/**
 * Walk encounter one to its first question that gets notation keys, which is the only state in
 * which the column beside the Check button is taller than the button.
 *
 * SEARCHED ACROSS ROUNDS, not within round one. Under D-CRISIS-15 the crisis draws its skills
 * from a shuffled cycle over every eligible node, so era one's one fraction-keyed skill falls
 * in round two of encounter one. Derived from the shipped composer, so a reseed moves the
 * search rather than breaking it.
 */
async function openKeyedAnswerRow(): Promise<HTMLElement> {
  let target: { round: number; index: number } | null = null;
  for (let round = 1; round <= HARD_WINTER.rounds && target === null; round += 1) {
    const items = itemsFor(round);
    const index = items.findIndex(hasKeys);
    if (index > -1) {
      target = { round, index };
    }
  }
  expect(
    target,
    "no round of encounter one asks anything the notation dispatch gives keys to",
  ).not.toBeNull();
  if (target === null) {
    throw new Error("unreachable");
  }

  const row = await openAnswerRow();
  const shell = query<HTMLElement>(".hw-shell");
  for (let round = 1; round <= target.round; round += 1) {
    const items = itemsFor(round);
    if (round > 1) {
      // A fresh declaration for the new round, on the same cell.
      findButton(shell, /Light a fire/).click();
      await waitFor(
        () => document.querySelector('.hw-grid [data-cell="-2,-2"]')?.tagName === "BUTTON",
        "the board takes a fire",
      );
      query<HTMLElement>('.hw-grid [data-cell="-2,-2"]').click();
      await waitFor(() => !findButton(shell, /Commit and face/).disabled, "commit arms");
      findButton(shell, /Commit and face/).click();
    }
    const stopAt = round === target.round ? target.index : items.length;
    for (let index = 0; index < stopAt; index += 1) {
      await waitFor(
        () => document.querySelector(".hw-panel input") !== null,
        `round ${round} question ${index + 1} renders`,
      );
      setInputValue(
        query<HTMLInputElement>(".hw-panel input"),
        answerKeyFor(items[index] as string),
      );
      await waitFor(() => !findButton(shell, "Check").disabled, "Check arms");
      findButton(shell, "Check").click();
      await waitFor(() => document.querySelector(".hw-verdict") !== null, "it is graded");
      findButton(
        shell,
        index + 1 >= items.length ? /See what you earned/ : /Next question/,
      ).click();
    }
    if (round < target.round) {
      // The last answer resolves the round on its own; there is no commit press.
      await waitFor(
        () => document.querySelector(".hw-magnitude") !== null,
        "the round resolves",
      );
      findButton(shell, /Let the frost advance/).click();
      await waitFor(
        () => document.querySelector(".hw-actions") !== null,
        "the next round opens on the declare panel",
      );
    }
  }
  await waitFor(
    () => document.querySelector(".hw-panel .cr-math-answer") !== null,
    "the keyed question's notation column renders",
  );
  return target.round === 1 && target.index === 0
    ? row
    : query<HTMLElement>(".hw-panel .lesson-player__row");
}

/* ------------------------------------- 1. the shared rules really do reach this row */

test("the crisis answer row is painted by the shared rules, not left as browser default", async () => {
  const row = await openAnswerRow();
  const field = query<HTMLInputElement>(".hw-panel .lesson-player__row input");
  const style = getComputedStyle(field);

  // The ceremony's defect was a field wearing browser defaults. A default text input has a
  // 2px inset border and no radius; a dressed one has a radius and real padding. The radius
  // comes from the SHARED rule (`hard-winter.css` restates 8px, `styles.css` sets 8px too),
  // and the padding is the crisis's.
  expect(style.borderTopStyle, "the field is wearing the browser's inset border").toBe(
    "solid",
  );
  expect(Number.parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(0);
  expect(Number.parseFloat(style.paddingLeft)).toBeGreaterThan(4);

  // `flex: 1` is only on the shared rule, never restated by `hard-winter.css`, so a field
  // that grows is proof the shared rules are reaching this row rather than being shadowed.
  expect(style.flexGrow, "the shared .lesson-player__row input rule is not applying").toBe(
    "1",
  );
  expect(field.getBoundingClientRect().width).toBeGreaterThan(120);

  // And the row itself is a flex row rather than two stacked blocks.
  expect(getComputedStyle(row).display).toBe("flex");
});

/* --------------------------------- 2. override 1 is load-bearing, at the narrow width */

test("the row's wrap and top-alignment are load-bearing, not decoration", async () => {
  await page.viewport(460, 900);
  try {
    const row = await openKeyedAnswerRow();
    const rowStyle = getComputedStyle(row);

    // KEPT, reason 1: without wrapping, the field and Check cannot break onto two lines in
    // the narrowest rail in the app. The shared rule sets no wrap at all.
    expect(rowStyle.flexWrap, "the crisis row would not wrap at 460px").toBe("wrap");

    // KEPT, reason 2: the notation column beside the button is taller than the button, and
    // `stretch` would drag the button down its whole height. Measured rather than argued.
    expect(rowStyle.alignItems).toBe("flex-start");

    const column = query<HTMLElement>(".hw-panel .cr-math-answer");
    const submit = row.querySelector<HTMLElement>('button[type="submit"]');
    expect(submit, "no Check button in the row").not.toBeNull();
    if (submit) {
      const columnBox = column.getBoundingClientRect();
      const submitBox = submit.getBoundingClientRect();
      // The floor first: the column really is taller, so "the button is not stretched" is a
      // claim about a row where stretching would be visible.
      expect(
        columnBox.height,
        "the notation column is not taller than the button, so alignment cannot be tested",
      ).toBeGreaterThan(submitBox.height + 8);
      expect(
        submitBox.top - columnBox.top,
        "the Check button is not aligned to the top of the row",
      ).toBeLessThan(8);
    }

    // And nothing runs off the edge at the narrow width.
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(461);
  } finally {
    await page.viewport(DESKTOP.width, DESKTOP.height);
  }
});

/* ---------------------- 3. overrides 2 and 3 are declared, and clear of the palette */

/**
 * The two chrome overrides are recorded here as the values they are, in both directions,
 * so neither can change or vanish without somebody reading this ruling.
 *
 * `ceremonyAnswerRow.browser.test.tsx` pins the field's 2px from the ceremony's side. This
 * adds the button, and adds the constraint that actually matters about it: the crisis prints
 * a verdict in CIVIC green and BRICK red one line below this control, so whatever the Check
 * button is, it must not be either of them.
 */
test("the field and the Check button are the prototype's declared chrome, clear of the correctness palette", async () => {
  const row = await openAnswerRow();
  const field = query<HTMLInputElement>(".hw-panel .lesson-player__row input");
  const submit = row.querySelector<HTMLElement>('button[type="submit"]');
  expect(submit, "no Check button in the row").not.toBeNull();
  if (!submit) {
    return;
  }

  // Override 2, as declared. Both directions: a drop back to the product's 1px fails, and so
  // does a widening.
  expect(
    getComputedStyle(field).borderTopWidth,
    "the winter's declared 2px field border changed",
  ).toBe("2px");

  // Override 3, as declared.
  const checkFill = getComputedStyle(submit).backgroundColor;
  expect(checkFill, "the winter's declared Check fill changed").toBe("rgb(31, 111, 235)");

  // THE CONSTRAINT THAT MATTERS. Grade the question and read the correctness hue off the
  // surface itself rather than off a token name, then assert the Check button is not it.
  setInputValue(field, answerKeyFor(itemsFor(1)[0] as string));
  await waitFor(() => !findButton(query(".hw-shell"), "Check").disabled, "Check arms");
  findButton(query<HTMLElement>(".hw-shell"), "Check").click();
  await waitFor(() => document.querySelector(".hw-verdict") !== null, "it is graded");
  const rightHue = getComputedStyle(query<HTMLElement>(".hw-verdict p")).color;

  expect(rightHue).toMatch(/\S/);
  expect(
    checkFill,
    "the Check button wears the hue that means a correct answer on this surface",
  ).not.toBe(rightHue);
  // Blue really is this prototype's active-choice colour, so the Check button is speaking
  // the surface's own language rather than inventing a fourth meaning.
  expect(
    getComputedStyle(query<HTMLElement>(".hw-prompt-line, .hw-chip[aria-pressed='true']"))
      .color,
  ).toMatch(/\S/);
});
