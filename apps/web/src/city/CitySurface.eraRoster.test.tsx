import { cityRosterNodeIds } from "@cr/game";
import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { lessonByNode } from "../lessons/domains";
import { CitySurface } from "./CitySurface";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { BUILDABLE_RADIUS, defaultPlacements } from "./worldLayout";

/**
 * **THE LIFT, AT THE SURFACE.** `engines/game/src/city-roster.test.ts` proves the ROSTER
 * accumulates; this proves the surface asks for it.
 *
 * The two are separate failures and the second is the quieter one. `buildCityViewModel`
 * defaults `era_id` to era one, so a `CitySurface` that stopped passing the era would go
 * straight back to six buildings in every era with the engine guard still green — which is
 * exactly the shape of the original defect (the argument was never passed at all).
 *
 * The DOM roster is the semantic source of truth for the city (the canvas is `aria-hidden`
 * decoration), so counting its rows is counting what a learner can reach. `enableCanvas` is
 * off because jsdom has no WebGL and the roster does not need it.
 *
 * The population is every era in `ERA_SEQUENCE`, and each era's expected rows are derived
 * from `cityRosterNodeIds` rather than written down here.
 */

/**
 * The SKILL rows currently rendered, by node id — the surface's own stable hook. The hub is
 * dropped because it is not a skill node: it is pre-seeded, belongs to no era, and never
 * dilutes the roster count the mastery meter reads.
 */
function rosterNodeIds(): string[] {
  return [...document.querySelectorAll<HTMLElement>("button.city-plot[data-node-id]")]
    .map((button) => button.dataset.nodeId as string)
    .filter((nodeId) => nodeId !== TOWN_HALL_ID);
}

async function openRosterAt(eraId: EraId): Promise<void> {
  const user = userEvent.setup();
  render(<CitySurface enableCanvas={false} eraId={eraId} />);
  await openBuiltShelf(user);
}

describe("the city surface lists the era's whole roster, not era one's six", () => {
  it.each(ERA_SEQUENCE.map((era) => era.id))(
    "lists every node era %s has reached",
    async (eraId) => {
      await openRosterAt(eraId);
      const expected = cityRosterNodeIds(eraId);
      // Set equality rather than a count, so a roster that dropped one node and repeated
      // another cannot pass.
      expect(rosterNodeIds().sort()).toEqual([...expected].sort());
    },
  );

  it("grows the roster at every advance, and era one is still six", async () => {
    // The collapse assertion at the surface: era one is six, and every later era is
    // strictly bigger. The floor stops a shrunken population satisfying the loop.
    const eras = ERA_SEQUENCE.map((era) => era.id);
    expect(eras).toHaveLength(10);

    const sizes: number[] = [];
    for (const eraId of eras) {
      await openRosterAt(eraId);
      sizes.push(rosterNodeIds().length);
      document.body.innerHTML = "";
    }

    expect(sizes[0]).toBe(6);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(
        sizes[i] as number,
        `${eras[i]} collapsed to era one's roster`,
      ).toBeGreaterThan(sizes[0] as number);
    }
    expect(sizes).toEqual(ERA_SEQUENCE.map((era) => cityRosterNodeIds(era.id).length));
  });
});

/** Every roster node built and standing, so a click opens its lesson rather than "Build it". */
function builtCityAt(eraId: EraId): CityLoad {
  const roster = cityRosterNodeIds(eraId);
  const placed = defaultPlacements([TOWN_HALL_ID, ...roster], [], BUILDABLE_RADIUS);
  return {
    node_states: roster.map(
      (nodeId): StudentNodeState => ({
        student_id: "s",
        node_id: nodeId,
        placement_estimate: 0,
        mastery: 2,
        mastery_updated_at: "2026-07-01T12:00:00.000Z",
        completion_status: "complete",
        lesson_stage: "done",
        last_practiced_at: "2026-07-01T12:00:00.000Z",
      }),
    ),
    placements: placed.filter((p) => p.nodeId !== TOWN_HALL_ID),
    town_hall: placed.find((p) => p.nodeId === TOWN_HALL_ID) ?? null,
  };
}

describe("a building outside era one is one click from its own lesson", () => {
  it.each(getEraNodes("neolithic"))(
    "opens %s's lesson from the era two roster",
    async (nodeId) => {
      // THE DEFECT STATED AS A ROUTE: before the lift there was no path from the island to
      // any lesson outside era one, because no node outside era one could hold a plot. This
      // walks the path a learner walks — open the roster, click the building, read the
      // lesson menu — for each of era two's five.
      const user = userEvent.setup();
      render(
        <CitySurface
          enableCanvas={false}
          eraId="neolithic"
          loadCity={() => Promise.resolve(builtCityAt("neolithic"))}
        />,
      );
      await openBuiltShelf(user);

      const row = document.querySelector<HTMLElement>(
        `button.city-plot[data-node-id="${nodeId}"]`,
      );
      expect(row, `no roster row for ${nodeId}`).not.toBeNull();
      await user.click(row as HTMLElement);

      const dialog = await screen.findByRole("dialog");
      // The lesson title comes from the all-domains registry, which is what the
      // domain-agnostic lesson host opens. A row that offered "Build it" instead would mean
      // the building was not really standing, and a missing title would mean era two's
      // packs are not reachable from the city.
      const title = lessonByNode[nodeId]?.title;
      expect(title, `${nodeId} has no authored lesson`).toBeTruthy();
      expect(dialog).toHaveTextContent(title as string);
    },
  );
});
