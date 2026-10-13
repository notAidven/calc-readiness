import { cityRosterNodeIds } from "@cr/game";
import {
  ERA_MIN_NODES,
  ERA_SEQUENCE,
  type EraId,
  eraNumber,
  getEraNodes,
} from "@cr/skill-graph";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { buildingDisplayName } from "./eraDressing";

/**
 * **THE BUILD MENU'S ERA AXIS.**
 *
 * Since the roster became cumulative the Lessons tab holds this era's buildings and every
 * earlier era's, appended after the ones the player already owns: eleven cards in era two,
 * sixteen in era three, sixty-two in era ten. Measured in Chromium on this branch before
 * the change, era ten's row was 13,760px wide inside a 694px scroller — twenty screen
 * widths between opening the menu and reaching the buildings the last advance gave you —
 * and 50 of its 62 live WebGL contexts had been force-lost by the browser, so most of the
 * cards previewed nothing at all.
 *
 * This file is the DOM half of the fix: the menu offers one chapter at a time, opening on
 * the chapter the city is standing in. `buildMenuEraAxis.browser.test.tsx` is the
 * geometric half — that the current era's cards need no scrolling to reach — because
 * jsdom has no layout and cannot answer that.
 *
 * ## Everything here is derived, and floored
 *
 * The era population is `ERA_SEQUENCE`, the expected cards are `getEraNodes`, and the
 * cumulative roster is `cityRosterNodeIds` — nothing is transcribed, so moving a node
 * between eras fails here rather than silently passing. The floors matter as much as the
 * assertions: "the current era's buildings are the ones on offer" is trivially true of a
 * menu showing nothing, so every era is also held to `ERA_MIN_NODES` cards and the ten
 * eras together to the full roster of every in-product node.
 */

/** The 3D city never mounts under jsdom; only the build menu is under test. */
vi.mock("./three/CityCanvasHost", () => ({
  CityCanvasHost: ({ fallback }: { fallback: React.ReactNode }) => (
    <div data-testid="scene-stub">{fallback}</div>
  ),
}));

/** The Lessons row's cards, by node id, in rendered order. */
function cardNodeIds(): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>(".build-tabpanel .build-card[data-node-id]"),
  ].map((card) => card.dataset.nodeId as string);
}

/** The era rail's pills, in rendered order, by the era each addresses. */
function railEraIds(): string[] {
  return [...document.querySelectorAll<HTMLElement>(".build-era-rail [role='tab']")].map(
    (pill) => pill.dataset.era as string,
  );
}

async function openMenuAt(eraId: EraId): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(<CitySurface enableCanvas={false} eraId={eraId} />);
  await user.click(await screen.findByRole("button", { name: "Build" }));
  await screen.findByRole("tabpanel");
  return user;
}

describe("the build menu opens on the era the city is standing in", () => {
  it.each(ERA_SEQUENCE.map((era) => era.id))(
    "offers %s's own buildings, not every era's",
    async (eraId) => {
      await openMenuAt(eraId);
      const expected = getEraNodes(eraId);
      // A floor under the population: an empty row would satisfy "no earlier era's cards
      // are in the way" without offering anybody anything.
      expect(expected.length).toBeGreaterThanOrEqual(ERA_MIN_NODES);
      expect(cardNodeIds().sort()).toEqual([...expected].sort());
    },
  );

  it("shows the current era's pill as selected, and never era one by default", async () => {
    for (const era of ERA_SEQUENCE) {
      await openMenuAt(era.id);
      const selected = document.querySelector<HTMLElement>(
        ".build-era-rail [role='tab'][aria-selected='true']",
      );
      expect(selected, `${era.id} has no selected era pill`).not.toBeNull();
      expect(selected?.dataset.era).toBe(era.id);
      document.body.innerHTML = "";
    }
  });

  it("collapses the row from the whole roster to one chapter, and the gap widens", async () => {
    // The defect, stated as the two numbers it is about. Without the era axis the row
    // holds `cityRosterNodeIds(era)`; with it, `getEraNodes(era)`. The two are equal in
    // era one and diverge for good afterwards, so the second assertion is what fails if
    // the axis is removed.
    const widths: { era: EraId; offered: number; roster: number }[] = [];
    for (const era of ERA_SEQUENCE) {
      await openMenuAt(era.id);
      widths.push({
        era: era.id,
        offered: cardNodeIds().length,
        roster: cityRosterNodeIds(era.id).length,
      });
      document.body.innerHTML = "";
    }

    expect(widths).toHaveLength(10);
    expect(widths[0]?.offered).toBe(widths[0]?.roster);
    for (const row of widths.slice(1)) {
      expect(row.offered, `${row.era} still offers the whole roster`).toBeLessThan(
        row.roster,
      );
      expect(row.offered).toBeGreaterThanOrEqual(ERA_MIN_NODES);
    }
    // The last era is the collapse at its widest: nine cards where the roster is 62.
    expect(widths[9]?.roster).toBe(cityRosterNodeIds("cyberpunk").length);
    expect(widths[9]?.offered).toBe(getEraNodes("cyberpunk").length);
  });
});

describe("the rail reaches every building the roster holds", () => {
  it.each(ERA_SEQUENCE.map((era) => era.id))(
    "walks %s's rail onto the whole cumulative roster, losing nothing",
    async (eraId) => {
      // The one thing an era filter can get catastrophically wrong is to HIDE a building
      // rather than group it. Walking every pill and unioning what each offers is the
      // check that grouping is a partition of the roster and not a subset of it.
      const user = await openMenuAt(eraId);
      const reached = new Set<string>();
      for (const railEra of railEraIds()) {
        await user.click(
          document.querySelector(
            `.build-era-rail [role='tab'][data-era='${railEra}']`,
          ) as HTMLElement,
        );
        for (const nodeId of cardNodeIds()) {
          reached.add(nodeId);
        }
      }
      const roster = cityRosterNodeIds(eraId);
      expect(roster.length).toBeGreaterThanOrEqual(ERA_MIN_NODES);
      expect([...reached].sort()).toEqual([...roster].sort());
    },
  );

  it("rails only the eras the player has reached, in play order", async () => {
    for (const era of ERA_SEQUENCE) {
      await openMenuAt(era.id);
      // Eras one..N inclusive and no further: a pill for an unplayed chapter would open
      // onto an empty panel, and eight of the ten are unauthored today.
      expect(railEraIds()).toEqual(
        ERA_SEQUENCE.slice(0, eraNumber(era.id)).map((reached) => reached.id),
      );
      document.body.innerHTML = "";
    }
  });
});

describe("the rail is reachable without a mouse and without sight", () => {
  it("never disables a pill, because a disabled button drops focus", async () => {
    await openMenuAt("cyberpunk");
    const pills = [
      ...document.querySelectorAll<HTMLButtonElement>(".build-era-rail [role='tab']"),
    ];
    expect(pills.length).toBe(ERA_SEQUENCE.length);
    for (const pill of pills) {
      expect(pill.disabled, `${pill.dataset.era} is a disabled button`).toBe(false);
      expect(pill.hasAttribute("disabled")).toBe(false);
    }
  });

  it("is one tab stop with a roving tabindex, like the category strip", async () => {
    await openMenuAt("bronze_age");
    const pills = [
      ...document.querySelectorAll<HTMLButtonElement>(".build-era-rail [role='tab']"),
    ];
    const tabbable = pills.filter((pill) => pill.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]?.dataset.era).toBe("bronze_age");
  });

  it("names the panel and the row by era, so the grouping is spoken", async () => {
    await openMenuAt("neolithic");
    const panel = screen.getByRole("tabpanel");
    // Both strips name the panel, so it announces as "Lessons, Neolithic Era" rather
    // than as "Lessons" over a row whose contents silently changed.
    expect(panel.getAttribute("aria-labelledby")).toBe(
      "build-tab-lessons build-era-tab-neolithic",
    );
    expect(
      within(panel).getByRole("list", {
        name: /Neolithic Era skill buildings to place/,
      }),
    ).toBeTruthy();
  });

  it("keeps every card's own accessible name, price-free rows included", async () => {
    // The era axis must not cost a row its name: the canvas is `aria-hidden`, so the
    // button's text is the whole of what a screen-reader user has.
    await openMenuAt("neolithic");
    const buttons = [
      ...document.querySelectorAll<HTMLElement>(".build-tabpanel .build-card-cta"),
    ];
    expect(buttons).toHaveLength(getEraNodes("neolithic").length);
    for (const button of buttons) {
      expect((button.textContent ?? "").trim().length).toBeGreaterThan(0);
    }
  });

  it("puts each ratified Classical subtitle in its build-card name", async () => {
    await openMenuAt("classical");
    const nodes = getEraNodes("classical");
    expect(nodes).toHaveLength(5);
    for (const nodeId of nodes) {
      const card = document.querySelector<HTMLElement>(
        `.build-tabpanel .build-card[data-node-id='${nodeId}']`,
      );
      expect(card, nodeId).not.toBeNull();
      const name = card?.querySelector<HTMLElement>(".build-card-name");
      expect(name?.textContent, nodeId).toBe(buildingDisplayName(nodeId, "classical"));
    }
  });

  it("puts each ratified Medieval subtitle in its build-card name", async () => {
    await openMenuAt("medieval");
    const nodes = getEraNodes("medieval");
    expect(nodes).toHaveLength(5);
    for (const nodeId of nodes) {
      const card = document.querySelector<HTMLElement>(
        `.build-tabpanel .build-card[data-node-id='${nodeId}']`,
      );
      expect(card, nodeId).not.toBeNull();
      const name = card?.querySelector<HTMLElement>(".build-card-name");
      expect(name?.textContent, nodeId).toBe(buildingDisplayName(nodeId, "medieval"));
    }
  });

  it("puts the six ratified Industrial names on the live skill cards", async () => {
    await openMenuAt("industrial");
    const expected = {
      "FUN.1": "Assembly Hall, the Spinning Mill",
      "FUN.2": "Store, the Cotton Warehouse",
      "FUN.3": "Workshop, the Locomotive Shop",
      "FUN.7": "Assembly Hall, the Exhibition Hall",
      "FUN.8": "Workshop, the Cannon Factory",
      "POL.5": "Tower, the Water Tower",
    } as const;
    expect(getEraNodes("industrial")).toEqual(Object.keys(expected));

    for (const [nodeId, displayName] of Object.entries(expected)) {
      const card = document.querySelector<HTMLElement>(
        `.build-tabpanel .build-card[data-node-id='${nodeId}']`,
      );
      expect(card, nodeId).not.toBeNull();
      expect(
        card?.querySelector<HTMLElement>(".build-card-name")?.textContent,
        nodeId,
      ).toBe(displayName);
      expect(buildingDisplayName(nodeId, "industrial"), nodeId).toBe(displayName);
    }
  });

  it("says on each pill how many of that era's buildings are still to build", async () => {
    // Leaving era one behind is only safe if the player can see, from the era they are
    // standing in, that an earlier one still owes them something. Asserted on the
    // ACCESSIBLE NAME rather than on the text, because the visible form is a bare numeral
    // pip that is `aria-hidden` — and checked against the era's OWN row rather than
    // against a written-down number, so a pill that printed a constant would fail.
    const user = await openMenuAt("bronze_age");
    const rail = screen.getByRole("tablist", { name: "Era" });
    const pills = within(rail).getAllByRole("tab");
    expect(pills).toHaveLength(3);

    for (const pill of pills) {
      const name = pill.getAttribute("aria-label") ?? "";
      await user.click(pill);
      const unbuilt = [
        ...document.querySelectorAll<HTMLElement>(".build-tabpanel .build-card"),
      ].filter((card) => card.dataset.built !== "true").length;
      expect(name, `${pill.dataset.era} says nothing about what it owes`).toBe(
        unbuilt > 0
          ? `${pill.textContent?.replace(/\d+$/, "")}, ${unbuilt} still to build`
          : `${pill.textContent}, all built`,
      );
    }
  });
});
