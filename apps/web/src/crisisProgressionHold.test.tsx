import { midEraCrisisCall, midEraCrisisNodeIds, NO_CRISIS_DAMAGE } from "@cr/game";
import { getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CitySurface } from "./city/CitySurface";
import { civicPlacementId } from "./city/civic";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./city/townHall";
import type { CityLoad } from "./city/types";
import { CRISIS_PREVIEW_ROUTES } from "./crisisPreviewRoutes";

function state(nodeId: string, mastered: boolean): StudentNodeState {
  return {
    student_id: "crisis-hold-progression",
    node_id: nodeId,
    placement_estimate: mastered ? 2 : 0,
    mastery: mastered ? 2 : 0,
    mastery_updated_at: null,
    completion_status: mastered ? "complete" : "locked",
    lesson_stage: mastered ? "done" : "not_started",
    last_practiced_at: mastered ? "2026-08-13T00:00:00.000Z" : null,
  };
}

function loadAt(
  eraId: (typeof CRISIS_PREVIEW_ROUTES)[number]["eraId"],
  mastered: number,
): CityLoad {
  const era = getEraOrThrow(eraId);
  const masteredIds = new Set(era.nodes.slice(0, mastered));
  return {
    node_states: era.nodes.map((nodeId) => state(nodeId, masteredIds.has(nodeId))),
    neighborhood_state: null,
    placements: [],
    town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
    civic:
      eraId === "information_age"
        ? [
            {
              nodeId: civicPlacementId("information_age_food_warehouse", 0),
              col: -5,
              row: 0,
              rot: 0,
            },
          ]
        : [],
    crisis_damage: NO_CRISIS_DAMAGE,
  };
}

afterEach(cleanup);

describe("progression crosses every implemented trigger without starting a held crisis", () => {
  expect(CRISIS_PREVIEW_ROUTES.length).toBeGreaterThanOrEqual(4);

  for (const route of CRISIS_PREVIEW_ROUTES) {
    it(`keeps ${route.label} inert across its ${route.eraId} threshold`, async () => {
      const triggerNodes = midEraCrisisNodeIds(route.eraId);
      expect(triggerNodes.length).toBeGreaterThanOrEqual(3);

      let current = loadAt(route.eraId, triggerNodes.length - 1);
      const loadCity = vi.fn(async () => current);
      const view = render(
        <CitySurface
          enableCanvas={false}
          enableOnboardingDemo={false}
          eraId={route.eraId}
          loadCity={loadCity}
          refreshToken={0}
          crisisCapabilityEnabled={false}
          onOpenSurface={() => undefined}
        />,
      );
      await screen.findByRole("button", { name: "Build" });

      current = loadAt(route.eraId, triggerNodes.length);
      expect(midEraCrisisCall(route.eraId, current.node_states).standing).toBe(true);
      view.rerender(
        <CitySurface
          enableCanvas={false}
          enableOnboardingDemo={false}
          eraId={route.eraId}
          loadCity={loadCity}
          refreshToken={1}
          crisisCapabilityEnabled={false}
          onOpenSurface={() => undefined}
        />,
      );
      await waitFor(() => expect(loadCity.mock.calls.length).toBeGreaterThanOrEqual(2));

      const unlock = document.querySelector<HTMLElement>(".building-unlocked");
      if (unlock) {
        await userEvent
          .setup()
          .click(within(unlock).getByRole("button", { name: "Close" }));
      }
      await userEvent.setup().click(screen.getByRole("button", { name: "Menu" }));
      await userEvent.setup().keyboard("{Escape}");

      expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
      expect(screen.queryByTestId("crisis-call-notice")).toBeNull();
      expect(screen.getByTestId("city-live-assertive")).not.toHaveTextContent(route.label);
    });
  }
});
