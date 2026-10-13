import { cityRosterNodeIds } from "@cr/game";
import { ERA_MIN_NODES, ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";

import "../styles.css";

/**
 * **THE ASK, MEASURED: a newly-advanced era's buildings are reachable without scrolling.**
 *
 * `buildMenuEraAxis.test.tsx` proves the menu OFFERS one chapter at a time. That is a
 * claim about a DOM population, and the thing Evan actually asked for is spatial — "so
 * when the user advances to a new era, they don't have to scroll all the way to see new
 * buildings". jsdom has no layout, so it cannot tell a row of five cards from a row of
 * sixty-two; only a real browser can say where the cards are.
 *
 * So this file measures, in Chromium, with the row AT REST:
 *
 *  1. the first card in the row belongs to the era the city is standing in, so the
 *     distance from opening the menu to the newest building is zero;
 *  2. at least one of that era's cards is wholly inside the scroller unscrolled;
 *  3. the row's scrollable width is the ERA's, not the roster's, so the walk to the last
 *     new building is bounded by the chapter rather than by everything before it.
 *
 * **The floors.** Each of those is trivially true of an empty row, so each is paired with
 * a count: the era's own node set is at least `ERA_MIN_NODES`, and the row holds exactly
 * that set. Every number is derived — `ERA_SEQUENCE` for the eras, `getEraNodes` for the
 * chapter, `cityRosterNodeIds` for the cumulative roster it is being cut out of.
 *
 * **The viewport is 1024x580**, a short realistic laptop window rather than a comfortable
 * developer one, because the panel is `max-height: 82vh` and a spatial claim measured on a
 * tall monitor says nothing about anybody's screen.
 */

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
  document.body.innerHTML = "";
});

/** Measured at a short, realistic window rather than a developer-sized one. */
const VIEWPORT = { width: 1024, height: 580 };

interface RowShape {
  readonly cardIds: readonly string[];
  readonly firstCardId: string | null;
  readonly whollyVisibleIds: readonly string[];
  readonly scrollLeft: number;
  readonly scrollWidth: number;
  readonly clientWidth: number;
}

function readRow(): RowShape {
  const row = document.querySelector<HTMLElement>(".build-tabpanel .build-card-row");
  if (!row) {
    throw new Error("the build menu has no card row");
  }
  const cards = [...row.querySelectorAll<HTMLElement>(".build-card[data-node-id]")];
  const rowBox = row.getBoundingClientRect();
  const whollyVisible = cards.filter((card) => {
    const box = card.getBoundingClientRect();
    return box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1;
  });
  return {
    cardIds: cards.map((card) => card.dataset.nodeId as string),
    firstCardId: cards[0]?.dataset.nodeId ?? null,
    whollyVisibleIds: whollyVisible.map((card) => card.dataset.nodeId as string),
    scrollLeft: row.scrollLeft,
    scrollWidth: row.scrollWidth,
    clientWidth: row.clientWidth,
  };
}

async function openMenuAt(eraId: EraId): Promise<RowShape> {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
  h = mount(
    <div className="city-shell">
      <CitySurface enableCanvas={false} eraId={eraId} />
    </div>,
  );
  await waitFor(
    () =>
      [...document.querySelectorAll("button")].some((button) =>
        /^(Build|All built)$/.test((button.textContent ?? "").trim()),
      ),
    `the ${eraId} city becomes ready`,
    20_000,
  );
  const build = [...document.querySelectorAll("button")].find((button) =>
    /^(Build|All built)$/.test((button.textContent ?? "").trim()),
  ) as HTMLButtonElement;
  build.click();
  await waitFor(
    () => document.querySelector(".build-tabpanel .build-card-row") !== null,
    "the build menu's card row mounts",
  );
  // One frame, so the row has been laid out before anything is measured off it.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return readRow();
}

/**
 * Era two onward — the eras where the roster is cumulative and the defect exists. Era one
 * is excluded on purpose: its chapter IS the whole roster, so it can neither exhibit the
 * defect nor witness the fix, and including it would let a menu that had reverted to the
 * cumulative row pass one case.
 */
const CUMULATIVE_ERAS = ERA_SEQUENCE.slice(1).map((era) => era.id);

test("era two onward is genuinely cumulative, so there is something to fix", () => {
  // The premise the rest of the file rests on, asserted rather than assumed.
  expect(CUMULATIVE_ERAS).toHaveLength(9);
  for (const eraId of CUMULATIVE_ERAS) {
    expect(cityRosterNodeIds(eraId).length).toBeGreaterThan(getEraNodes(eraId).length);
  }
});

test.each(CUMULATIVE_ERAS)(
  "%s opens on its own buildings with the row unscrolled",
  async (eraId) => {
    const row = await openMenuAt(eraId);
    const chapter = getEraNodes(eraId);

    // FLOOR. Everything below is trivially true of an empty row.
    expect(chapter.length).toBeGreaterThanOrEqual(ERA_MIN_NODES);
    expect([...row.cardIds].sort()).toEqual([...chapter].sort());

    // 1. Nothing the player already owned sits in front of the new buildings.
    expect(row.scrollLeft).toBe(0);
    expect(chapter).toContain(row.firstCardId as string);

    // 2. At least one of the era's cards is wholly on screen without scrolling.
    expect(row.whollyVisibleIds.length).toBeGreaterThan(0);
    for (const nodeId of row.whollyVisibleIds) {
      expect(chapter, `${nodeId} is not one of ${eraId}'s buildings`).toContain(nodeId);
    }
  },
);

test.each(CUMULATIVE_ERAS)(
  "%s's row is the chapter's width, not the roster's",
  async (eraId) => {
    const row = await openMenuAt(eraId);
    const chapter = getEraNodes(eraId);
    const roster = cityRosterNodeIds(eraId);
    expect(chapter.length).toBeGreaterThanOrEqual(ERA_MIN_NODES);
    expect(roster.length).toBeGreaterThan(chapter.length);

    // The per-card width, taken from the row itself rather than from the stylesheet, so
    // this measures what shipped and not what a `clamp()` was meant to produce.
    const perCard = row.scrollWidth / chapter.length;
    expect(perCard).toBeGreaterThan(0);

    // A cumulative row would be this wide. Era ten's is 13,760px in a ~700px scroller —
    // twenty screen widths — which is the number this whole change exists to remove.
    const cumulativeWidth = perCard * roster.length;
    expect(row.scrollWidth).toBeLessThan(cumulativeWidth);
    // And the walk is bounded by the chapter: never more than a chapter's worth of
    // scroller widths, whatever the roster has grown to behind it.
    expect(row.scrollWidth / row.clientWidth).toBeLessThanOrEqual(
      Math.ceil(chapter.length / 2),
    );
  },
);
