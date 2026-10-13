import { getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { faceTheWinter } from "../test/faceTheWinter";
import { CitySurface } from "./CitySurface";
import { civicPlacementId } from "./civic";
import { forgetCrisisBriefingRead } from "./crisisCall";
import type { CityLoad } from "./types";

const STUDENT = "00000000-0000-4000-8000-000000000009" as UUID;
const INFORMATION_NODES = getEraOrThrow("information_age").nodes;
const RELAY = civicPlacementId("information_age_food_warehouse", 1);

function complete(node_id: string): StudentNodeState {
  return {
    student_id: STUDENT,
    node_id,
    placement_estimate: 3,
    mastery: 2,
    mastery_updated_at: null,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: "2026-08-09T00:00:00.000Z",
  };
}

const CITY: CityLoad = {
  node_states: INFORMATION_NODES.map(complete),
  neighborhood_state: null,
  placements: INFORMATION_NODES.map((nodeId, index) => ({
    nodeId,
    col: -6 + (index % 3) * 5,
    row: index < 3 ? -5 : 4,
    rot: 0,
  })),
  town_hall: { nodeId: "town-hall", col: 3, row: 0, rot: 0 },
  civic: [{ nodeId: RELAY, col: -1, row: 0, rot: 0 }],
  roads: [],
  road_gold_spent: 0,
};

beforeEach(() => {
  forgetCrisisBriefingRead();
});

function renderInformationCity(): void {
  render(
    <CitySurface
      enableCanvas={false}
      enableOnboardingDemo={false}
      eraId="information_age"
      loadCity={async () => CITY}
      onOpenSurface={() => undefined}
    />,
  );
}

async function otherPlaces(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
  return screen.getByRole("navigation", { name: "Other places" });
}

describe("the named crisis actions dispatch to the surface they name", () => {
  it("Hard Winter opens the Hard Winter advisor and live-city winter", async () => {
    const user = userEvent.setup();
    renderInformationCity();

    const places = await otherPlaces(user);
    await user.click(within(places).getByRole("button", { name: "Hard Winter" }));

    const advisor = await screen.findByTestId("crisis-call-advisor");
    expect(advisor).toHaveAccessibleName("The Hard Winter");
    expect(screen.queryByTestId("relay-surface")).toBeNull();

    await faceTheWinter(user);
    const winter = await screen.findByTestId("winter-in-city");
    expect(winter).toBeVisible();
    expect(await screen.findByText("Round 1 of 3")).toBeVisible();
    expect(winter).not.toHaveTextContent("nothing to fall on");
    expect(screen.queryByTestId("relay-surface")).toBeNull();
  });

  it("The Intrusion opens the Intrusion advisor and redesigned live-city relay", async () => {
    const user = userEvent.setup();
    renderInformationCity();

    const places = await otherPlaces(user);
    await user.click(within(places).getByRole("button", { name: "The Intrusion" }));

    const advisor = await screen.findByTestId("crisis-call-advisor");
    expect(advisor).toHaveAccessibleName("The Intrusion");
    expect(screen.queryByTestId("winter-in-city")).toBeNull();

    await faceTheWinter(user);
    expect(await screen.findByTestId("relay-surface")).toBeVisible();
    const evidence = await screen.findByTestId("relay-city-evidence");
    expect(evidence).toBeVisible();
    expect(evidence.querySelectorAll("li").length).toBeGreaterThan(1);
    expect(screen.queryByTestId("winter-in-city")).toBeNull();
  });

  it("keeps the standalone page behind an explicit fixture label", async () => {
    const user = userEvent.setup();
    renderInformationCity();

    const places = await otherPlaces(user);
    const fixture = within(places).getByRole("link", { name: "Intrusion fixture" });
    expect(
      new URL(fixture.getAttribute("href") ?? "", window.location.href).searchParams.has(
        "intrusion-fixture",
      ),
    ).toBe(true);
    expect(within(places).queryByRole("link", { name: "The Intrusion" })).toBeNull();
  });
});
