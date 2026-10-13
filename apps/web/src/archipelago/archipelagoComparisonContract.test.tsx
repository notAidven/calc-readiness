import { islandUnlockMasteryRequirement, NEIGHBORHOOD_LABELS } from "@cr/game";
import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { Mastery, PlacementEstimate, StudentNodeState } from "@cr/state-schema";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TOWN_HALL_FOOTPRINT } from "../city/townHall";
import { ArchipelagoOverview, hallSiteGeometry } from "./ArchipelagoOverview";
import { BARE_LAYOUT, foundingLayout, type IslandRecord } from "./islandState";

function island(eraId: EraId): IslandRecord {
  return {
    eraId,
    layout: eraId === "prehistoric" ? foundingLayout() : BARE_LAYOUT,
  };
}

function states(
  eraId: EraId,
  placement: PlacementEstimate,
  mastered: number,
): readonly StudentNodeState[] {
  return getEraOrThrow(eraId).nodes.map((nodeId, index) => ({
    student_id: "comparison-contract",
    node_id: nodeId,
    placement_estimate: placement,
    mastery: (index < mastered ? 2 : 0) as Mastery,
    mastery_updated_at: null,
    completion_status: index < mastered ? "complete" : "in_progress",
    lesson_stage: index < mastered ? "done" : "not_started",
    last_practiced_at: null,
  }));
}

function mount(input: {
  readonly standing?: EraId;
  readonly nodeStates?: readonly StudentNodeState[];
  readonly founded?: readonly EraId[];
  readonly reducedMotion?: boolean;
  readonly onPreview?: (eraId: EraId) => void;
}) {
  return render(
    <ArchipelagoOverview
      nodeStates={input.nodeStates ?? []}
      liveEraId={input.standing ?? "neolithic"}
      foundedIslands={(input.founded ?? ["prehistoric", "neolithic"]).map(island)}
      onEnterIsland={() => undefined}
      onSailTo={() => undefined}
      onPreviewEra={input.onPreview}
      onSettleIsland={() => undefined}
      onClose={() => undefined}
      enableCanvas={false}
      reducedMotion={input.reducedMotion ?? true}
    />,
  );
}

afterEach(cleanup);

describe("the revised two-band composition", () => {
  it("keeps the hero's middle band free of the rejected centered banner", () => {
    mount({});
    expect(document.querySelector(".archipelago-banner")).toBeNull();
    expect(screen.getByTestId("archipelago-top-band")).toBeTruthy();
    expect(screen.getByTestId("archipelago-bottom-band")).toBeTruthy();
  });

  it("keeps all ten direct destinations behind one compact route control", () => {
    mount({});
    const trigger = screen.getByRole("button", { name: /Choose island/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    const route = screen.getByRole("listbox", { name: "Choose an island" });
    const options = Array.from(route.querySelectorAll('[role="option"]'));
    expect(options).toHaveLength(ERA_SEQUENCE.length);
    expect(
      options.filter((option) => option.getAttribute("aria-selected") === "true"),
    ).toHaveLength(1);
  });

  it("uses the product's corrected neighborhood topic", () => {
    mount({ standing: "prehistoric", founded: ["prehistoric"] });
    expect(screen.getByTestId("archipelago-topic")).toHaveTextContent(
      NEIGHBORHOOD_LABELS.D1,
    );
  });
});

describe("the closed landing is browseable and explicitly not enterable", () => {
  it("shows a classic lock, progress, and exactly one preview action", () => {
    const onPreview = vi.fn();
    mount({
      nodeStates: states("neolithic", 0, 3),
      onPreview,
    });
    fireEvent.click(screen.getByTestId("archipelago-select-bronze_age"));

    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-state",
      "closed",
    );
    expect(screen.getByTestId("archipelago-closed-landing")).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: /Locked island.*Entry is unavailable/i,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: /Neolithic mastery/ })).toHaveAttribute(
      "aria-valuenow",
      "3",
    );
    const neolithicSkills = getEraOrThrow("neolithic").nodes.length;
    const remaining = islandUnlockMasteryRequirement(neolithicSkills) - 3;
    expect(screen.getByText(new RegExp(`Master ${remaining} more skill`))).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Explore Bronze Age terrain, camera only",
      }),
    );
    expect(onPreview).toHaveBeenCalledWith("bronze_age");
    expect(screen.getAllByTestId("archipelago-primary-action")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Enter island/i })).toBeNull();
  });
});

describe("the diagnostic landmark and ceremony read real product geometry", () => {
  it("keeps the footprint derivation but replaces the empty stake ring with the hall", () => {
    expect(hallSiteGeometry({ w: 5, d: 4 })).not.toEqual(
      hallSiteGeometry(TOWN_HALL_FOOTPRINT),
    );
    expect(hallSiteGeometry({ w: 5, d: 4 }).label).toBe("Hall site · 5 x 4");
    mount({
      nodeStates: ERA_SEQUENCE.slice(0, 3).flatMap((era) => states(era.id, 2, 0)),
    });
    fireEvent.click(screen.getByTestId("archipelago-select-classical"));

    expect(screen.queryByTestId("archipelago-hall-site")).toBeNull();
    expect(
      screen
        .getByTestId("archipelago-island-fallback")
        .querySelector('[data-era-hall-glyph="classical"]'),
    ).toHaveAttribute("data-hall-art", "authored");
    expect(document.querySelector(".archipelago-landmark-caption")).toHaveTextContent(
      "Classical Era hall · diagnostic landmark",
    );
  });

  it("uses panel-clearing arcs and one fading wake at the founding peak", () => {
    render(
      <ArchipelagoOverview
        nodeStates={[]}
        liveEraId="neolithic"
        foundedIslands={[island("prehistoric"), island("neolithic")]}
        onEnterIsland={() => undefined}
        onClose={() => undefined}
        enableCanvas={false}
        reducedMotion={false}
        ceremony={{
          eraId: "bronze_age",
          foundingStage: "built",
          reveal: 1,
          ready: true,
          onContinue: () => undefined,
        }}
      />,
    );
    const reveal = screen.getByTestId("archipelago-ceremony-reveal");
    expect(reveal.querySelectorAll('[data-shore-arc="true"]')).toHaveLength(2);
    expect(reveal.querySelectorAll(".archipelago-ceremony-reveal__wake")).toHaveLength(1);
    expect(reveal.querySelectorAll("ellipse")).toHaveLength(0);
  });
});

describe("destination controls say where they go and own sequence ends", () => {
  it("names arrow destinations without repeating them in the visible chrome", () => {
    mount({});
    expect(screen.getByRole("button", { name: /Previous island/ })).toHaveAccessibleName(
      /Prehistoric/i,
    );
    expect(screen.getByRole("button", { name: /Next island/ })).toHaveAccessibleName(
      /Bronze Age/i,
    );
    expect(
      screen.getByRole("button", { name: /Previous island/ }).textContent?.trim(),
    ).toBe("");
    expect(screen.getByRole("button", { name: /Next island/ }).textContent?.trim()).toBe(
      "",
    );

    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "Home" });
    expect(screen.getByRole("button", { name: "No previous island" })).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "End" });
    expect(screen.getByRole("button", { name: "No next island" })).toBeDisabled();
  });
});
