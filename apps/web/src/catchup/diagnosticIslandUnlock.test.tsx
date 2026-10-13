import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { IslandFoundingAuthority } from "../city/islandUnlockAuthority";
import { CityCatchUp } from "./CityCatchUp";
import { eraPlacementFromSeed, seedPlacingAtEra } from "./eraPlacement";

describe("diagnostic island unlock catch-up", () => {
  it("auto-unlocks the derived skipped prefix and uses one simple founding reveal", async () => {
    const placedEra = ERA_SEQUENCE[1];
    expect(placedEra).toBeDefined();
    if (!placedEra) {
      return;
    }
    const placement = eraPlacementFromSeed(seedPlacingAtEra(placedEra.id));
    const unlock = vi.fn(
      async (_eraId: EraId, _authority?: IslandFoundingAuthority) => undefined,
    );
    render(
      <CityCatchUp
        placement={placement}
        occupants={[]}
        placedNodeIds={new Set()}
        onPlaceSkill={() => undefined}
        onUnlockIsland={unlock}
        onLanded={() => undefined}
        onClose={() => undefined}
      />,
    );

    await waitFor(() => expect(unlock).toHaveBeenCalledTimes(placement.unlocked.length));
    expect(unlock.mock.calls.map(([eraId]) => eraId)).toEqual(placement.unlocked);
    expect(
      unlock.mock.calls.every(([, authority]) => authority?.source === "diagnostic"),
    ).toBe(true);
    fireEvent.click(screen.getByTestId("catchup-choose-keep_going"));
    const placingDone = screen.queryByTestId("catchup-placing-done");
    if (placingDone) {
      fireEvent.click(placingDone);
    }

    const founding = screen.getByTestId("catchup-founding");
    expect(founding).toHaveAttribute("data-stage", "founded");
    expect(founding).toHaveTextContent("Town Hall foundation ready");
    expect(founding).toHaveTextContent("No unlock exam is required");
    expect(founding.querySelector(".catchup-founding__rail")).toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("retries a rejected partial prefix, coalesces rerenders, and lands exactly once", async () => {
    const placedEra = ERA_SEQUENCE[2];
    expect(placedEra).toBeDefined();
    if (!placedEra) {
      return;
    }
    const placement = eraPlacementFromSeed(seedPlacingAtEra(placedEra.id));
    const attempts = new Map<EraId, number>();
    const unlock = vi.fn(async (eraId: EraId) => {
      const count = (attempts.get(eraId) ?? 0) + 1;
      attempts.set(eraId, count);
      if (eraId === placement.skipped[1] && count === 1) {
        throw new Error("transient founding failure");
      }
    });
    const landed = vi.fn();
    const view = render(
      <CityCatchUp
        placement={placement}
        occupants={[]}
        placedNodeIds={new Set()}
        onPlaceSkill={() => undefined}
        onUnlockIsland={unlock}
        onLanded={landed}
        onClose={() => undefined}
        startAt={placement.skipped.length}
      />,
    );
    view.rerender(
      <CityCatchUp
        placement={placement}
        occupants={[]}
        placedNodeIds={new Set()}
        onPlaceSkill={() => undefined}
        onUnlockIsland={unlock}
        onLanded={landed}
        onClose={() => undefined}
        startAt={placement.skipped.length}
      />,
    );

    await waitFor(() => expect(landed).toHaveBeenCalledWith(placedEra.id));
    expect(landed).toHaveBeenCalledTimes(1);
    expect(attempts.get(placement.skipped[0] as EraId)).toBe(1);
    expect(attempts.get(placement.skipped[1] as EraId)).toBe(2);
    expect(attempts.get(placedEra.id)).toBe(1);
  });
});
