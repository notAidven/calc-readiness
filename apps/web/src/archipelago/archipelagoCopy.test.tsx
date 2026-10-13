import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ArchipelagoOverview } from "./ArchipelagoOverview";
import { foundingLayout, type IslandRecord } from "./islandState";

const REPROACHES = [
  /wallet\s+resets?/i,
  /\bunspent\b/i,
  /did\s+not\s+spend/i,
  /\bleftover\b/i,
  /\bwasted\b/i,
];

function island(eraId: EraId): IslandRecord {
  return { eraId, layout: foundingLayout() };
}

function mount() {
  return render(
    <ArchipelagoOverview
      nodeStates={[]}
      liveEraId="classical"
      foundedIslands={[
        island("prehistoric"),
        island("neolithic"),
        island("bronze_age"),
        island("classical"),
      ]}
      materials={{ stone: 80 }}
      onEnterIsland={() => undefined}
      onSailTo={() => undefined}
      onClose={() => undefined}
      enableCanvas={false}
      reducedMotion
    />,
  );
}

afterEach(cleanup);

describe("the carousel states its consequence without reproach or denial", () => {
  it("sweeps every selected era and keeps the forbidden framing out of rendered copy", () => {
    mount();
    let selected = 0;
    for (const era of ERA_SEQUENCE) {
      fireEvent.click(screen.getByTestId(`archipelago-select-${era.id}`));
      const text = screen.getByTestId("archipelago-overview").textContent ?? "";
      for (const reproach of REPROACHES) {
        expect(reproach.test(text), `${era.id} renders ${reproach}`).toBe(false);
      }
      selected += 1;
    }
    expect(selected).toBe(ERA_SEQUENCE.length);
  });

  it("names stores as something still present on a settled island", () => {
    mount();
    fireEvent.click(screen.getByTestId("archipelago-select-prehistoric"));
    expect(screen.getByTestId("archipelago-overview")).toHaveTextContent("80 stone here");
    expect(screen.getByTestId("archipelago-primary-action")).toHaveTextContent(
      "Sail to Prehistoric",
    );
  });

  it("makes a closed landing positive, explicit, and camera-explorable", () => {
    mount();
    fireEvent.click(screen.getByTestId("archipelago-select-medieval"));
    expect(screen.getByTestId("archipelago-overview")).toHaveTextContent("LANDING CLOSED");
    expect(screen.getByTestId("archipelago-overview")).toHaveTextContent(
      "The landing opens after island 04",
    );
    expect(
      screen.getByRole("button", {
        name: "Explore Medieval terrain, camera only",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: /Locked island.*Entry is unavailable/i,
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Enter island/i })).toBeNull();
  });
});
