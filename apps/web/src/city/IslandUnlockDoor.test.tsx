import { MASTERY_BAR } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IslandUnlockDoor } from "./IslandUnlockDoor";

function states(eraId: EraId, mastered: number): StudentNodeState[] {
  const era = ERA_SEQUENCE.find((entry) => entry.id === eraId);
  if (!era) {
    throw new Error(`Unknown era ${eraId}`);
  }
  return era.nodes.map((nodeId, index) => ({
    student_id: "door-test",
    node_id: nodeId,
    placement_estimate: 0,
    mastery: index < mastered ? MASTERY_BAR : 1,
    mastery_updated_at: null,
    completion_status: index < mastered ? "complete" : "in_progress",
    lesson_stage: index < mastered ? "done" : "practice",
    last_practiced_at: null,
  }));
}

describe("island unlock door", () => {
  it("shows X of Y, the 80% requirement, and the 2N net target", () => {
    const era = ERA_SEQUENCE.find((entry) => entry.nodes.length === 5);
    expect(era).toBeDefined();
    if (!era) {
      return;
    }
    render(
      <IslandUnlockDoor eraId={era.id} nodeStates={states(era.id, 4)} onOpen={vi.fn()} />,
    );

    expect(screen.getByTestId("island-unlock-mastery")).toHaveTextContent("4 of 5");
    expect(screen.getByTestId("island-unlock-requirement")).toHaveTextContent(
      "4 required (80%)",
    );
    expect(screen.getByTestId("island-unlock-requirement")).toHaveTextContent(
      "Exam target 10 net points",
    );
    expect(screen.getByTestId("menu-island-unlock")).toHaveAttribute("data-ready", "true");
  });

  it("does not open at 79% but opens at the 80% boundary", () => {
    const era = ERA_SEQUENCE.find((entry) => entry.nodes.length === 5);
    expect(era).toBeDefined();
    if (!era) {
      return;
    }
    const open = vi.fn();
    const view = render(
      <IslandUnlockDoor eraId={era.id} nodeStates={states(era.id, 3)} onOpen={open} />,
    );
    fireEvent.click(screen.getByTestId("menu-island-unlock"));
    expect(open).not.toHaveBeenCalled();

    view.rerender(
      <IslandUnlockDoor eraId={era.id} nodeStates={states(era.id, 4)} onOpen={open} />,
    );
    fireEvent.click(screen.getByTestId("menu-island-unlock"));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("names persisted in-progress score as a resumable exam", () => {
    const era = ERA_SEQUENCE.find((entry) => entry.nodes.length === 6);
    expect(era).toBeDefined();
    if (!era) {
      return;
    }
    render(
      <IslandUnlockDoor
        eraId={era.id}
        nodeStates={states(era.id, 5)}
        inProgressScore={1}
        onOpen={vi.fn()}
      />,
    );

    const door = screen.getByTestId("menu-island-unlock");
    expect(door).toHaveTextContent("Resume unlock exam · 1/12");
    expect(door).toHaveAccessibleName(/Resume unlock exam · 1\/12/);
  });

  it("offers no next-island exam or Sail path in era ten and gates the completion reward at 100%", () => {
    const final = ERA_SEQUENCE.at(-1);
    expect(final).toBeDefined();
    if (!final) {
      return;
    }
    const open = vi.fn();
    const view = render(
      <IslandUnlockDoor
        eraId={final.id}
        nodeStates={states(final.id, final.nodes.length - 1)}
        onOpen={open}
      />,
    );
    expect(screen.getByTestId("menu-island-unlock")).toHaveTextContent(
      "Master every skill to complete",
    );
    expect(screen.queryByText(/sail/i)).toBeNull();
    fireEvent.click(screen.getByTestId("menu-island-unlock"));
    expect(open).not.toHaveBeenCalled();

    view.rerender(
      <IslandUnlockDoor
        eraId={final.id}
        nodeStates={states(final.id, final.nodes.length)}
        onOpen={open}
      />,
    );
    expect(screen.getByTestId("menu-island-unlock")).toHaveTextContent(
      "Celebrate completion",
    );
    fireEvent.click(screen.getByTestId("menu-island-unlock"));
    expect(open).toHaveBeenCalledTimes(1);
  });
});
