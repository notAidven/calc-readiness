import { islandUnlockMasteryRequirement } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchipelagoOverview, OVERVIEW_FRAME } from "./ArchipelagoOverview";
import { foundingLayout, type IslandRecord } from "./islandState";

function founded(...eraIds: readonly EraId[]): readonly IslandRecord[] {
  return eraIds.map((eraId) => ({ eraId, layout: foundingLayout() }));
}

function mount(input: {
  readonly standing?: EraId;
  readonly foundedIslands?: readonly IslandRecord[];
  readonly onClose?: () => void;
  readonly onEnter?: () => void;
  readonly onSail?: (eraId: EraId) => void;
  readonly onPreview?: (eraId: EraId) => void;
}) {
  return render(
    <ArchipelagoOverview
      nodeStates={[]}
      liveEraId={input.standing ?? "prehistoric"}
      foundedIslands={input.foundedIslands}
      onEnterIsland={input.onEnter ?? (() => undefined)}
      onSailTo={input.onSail}
      onPreviewEra={input.onPreview}
      onClose={input.onClose ?? (() => undefined)}
      enableCanvas={false}
      reducedMotion
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the approved selected-island surface", () => {
  it("renders one hero and a ten-item semantic sequence", () => {
    mount({ standing: "classical" });
    expect(screen.getAllByTestId("archipelago-hero-renderer")).toHaveLength(1);
    expect(screen.getByTestId("archipelago-hero-renderer")).toHaveAttribute(
      "data-era",
      "classical",
    );
    expect(document.querySelectorAll(".archipelago-route-option")).toHaveLength(
      ERA_SEQUENCE.length,
    );
    expect(screen.getByRole("button", { name: /Choose island/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(`${OVERVIEW_FRAME.width}x${OVERVIEW_FRAME.height}`).toBe("1024x580");
  });

  it("labels the dialog from the selected real island and updates it on selection", () => {
    mount({ standing: "neolithic" });
    const dialog = screen.getByRole("dialog", { name: "Neolithic Era" });
    fireEvent.click(screen.getByTestId("archipelago-select-classical"));
    expect(dialog).toHaveAttribute("data-selected-era", "classical");
    expect(screen.getByRole("dialog", { name: "Classical Era" })).toBe(dialog);
  });

  it("puts initial focus on the close control", () => {
    mount({});
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close archipelago" }),
    );
  });

  it("keeps focus on the initiating arrow when the hero changes", async () => {
    const user = userEvent.setup();
    mount({ standing: "neolithic" });
    const next = screen.getByRole("button", { name: /Next island/ });
    next.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      "bronze_age",
    );
    expect(document.activeElement).toBe(next);
  });

  it("activates the selected island's one action from the dialog Enter command", () => {
    const onEnter = vi.fn();
    mount({ standing: "prehistoric", onEnter });
    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "Enter" });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it("swipes one step after the approved horizontal threshold", () => {
    mount({ standing: "neolithic" });
    const stage = screen.getByTestId("archipelago-stage");
    const pointer = (
      type: "pointerdown" | "pointerup",
      x: number,
      y: number,
      at: number,
    ) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        clientX: { value: x },
        clientY: { value: y },
        timeStamp: { value: at },
      });
      fireEvent(stage, event);
    };
    pointer("pointerdown", 700, 260, 100);
    pointer("pointerup", 620, 264, 220);
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      "bronze_age",
    );
  });

  it("sails only from a durable founded record", () => {
    const onSail = vi.fn();
    mount({
      standing: "neolithic",
      foundedIslands: founded("prehistoric", "neolithic"),
      onSail,
    });
    fireEvent.click(screen.getByTestId("archipelago-select-prehistoric"));
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-state",
      "settled",
    );
    fireEvent.click(screen.getByTestId("archipelago-primary-action"));
    expect(onSail).toHaveBeenCalledWith("prehistoric");

    fireEvent.click(screen.getByTestId("archipelago-select-bronze_age"));
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-state",
      "closed",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Explore Bronze Age terrain, camera only",
      }),
    );
    expect(onSail).toHaveBeenCalledTimes(1);
  });

  it("replaces the lock with a reversible camera-only preview", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    mount({
      standing: "neolithic",
      foundedIslands: founded("prehistoric", "neolithic"),
      onPreview,
    });
    await user.click(screen.getByTestId("archipelago-select-bronze_age"));

    const dialog = screen.getByTestId("archipelago-overview");
    expect(dialog).toHaveAttribute("data-previewing", "false");
    expect(screen.getByTestId("archipelago-closed-landing")).toBeInTheDocument();
    expect(screen.getByTestId("archipelago-classic-lock")).toBeInTheDocument();
    const standingSkills =
      ERA_SEQUENCE.find((era) => era.id === "neolithic")?.nodes.length ?? 0;
    expect(screen.getByTestId("archipelago-state-card")).toHaveTextContent(
      `Master ${islandUnlockMasteryRequirement(standingSkills)} more skills`,
    );

    const preview = screen.getByRole("button", {
      name: "Explore Bronze Age terrain, camera only",
    });
    await user.click(preview);

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith("bronze_age");
    expect(dialog).toHaveAttribute("data-previewing", "true");
    expect(screen.queryByTestId("archipelago-closed-landing")).toBeNull();
    expect(screen.queryByTestId("archipelago-classic-lock")).toBeNull();
    expect(screen.getByTestId("archipelago-state-card")).toHaveTextContent(
      "Camera only · No unlocking, building, settling, sailing, or saving",
    );
    const end = screen.getByRole("button", {
      name: "End preview, return to locked shore",
    });
    expect(end).toHaveFocus();

    await user.click(end);

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("data-previewing", "false");
    expect(screen.getByTestId("archipelago-classic-lock")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Explore Bronze Age terrain, camera only",
      }),
    ).toHaveFocus();
  });
});

describe("the ceremony endpoint reuses the selected real-island frame", () => {
  it("uses a static shore under reduced motion, no wake, and one continuation action", () => {
    const onContinue = vi.fn();
    render(
      <ArchipelagoOverview
        nodeStates={[]}
        liveEraId="prehistoric"
        onEnterIsland={() => undefined}
        onClose={() => undefined}
        enableCanvas={false}
        reducedMotion
        ceremony={{
          eraId: "neolithic",
          foundingStage: "built",
          reveal: 1,
          ready: true,
          onContinue,
        }}
      />,
    );

    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-state",
      "ceremony",
    );
    expect(screen.getByTestId("archipelago-hero-renderer")).toHaveAttribute(
      "data-mode",
      "ceremony",
    );
    expect(screen.getByTestId("archipelago-ceremony-reveal")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    expect(document.querySelector(".archipelago-ceremony-reveal__wake")).toBeNull();
    fireEvent.click(screen.getByTestId("archipelago-primary-action"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
