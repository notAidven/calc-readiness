import { ERA_SEQUENCE, type EraId, eraNumber, getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchipelagoOverview } from "./ArchipelagoOverview";
import { archipelagoCarouselView } from "./archipelagoCarouselView";
import { BARE_LAYOUT, foundingLayout, type IslandRecord } from "./islandState";

/**
 * Reproductions for the approved actual-renderer carousel.
 *
 * The population is every authored era and every product state the carousel can derive, not
 * every component that happens to share an implementation. The fixture floors below make the
 * state assertions fail if the relevant populations become empty.
 */

type CarouselProps = ComponentProps<typeof ArchipelagoOverview> & {
  readonly foundedIslands?: readonly IslandRecord[];
  readonly enableCanvas?: boolean;
  readonly onPreviewEra?: (eraId: EraId) => void;
  readonly onSettleIsland?: (eraId: EraId) => void;
};

const EMPTY_NODE_STATES: readonly StudentNodeState[] = [];

function passedEra(eraId: EraId): readonly StudentNodeState[] {
  return getEraOrThrow(eraId).nodes.map((nodeId) => ({
    student_id: "carousel-test",
    node_id: nodeId,
    placement_estimate: 2,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: null,
  }));
}

function passedEras(...indexes: readonly number[]): readonly StudentNodeState[] {
  return indexes.flatMap((index) => {
    const era = ERA_SEQUENCE[index];
    return era ? passedEra(era.id) : [];
  });
}

function island(eraId: EraId): IslandRecord {
  return { eraId, layout: eraId === "prehistoric" ? foundingLayout() : BARE_LAYOUT };
}

function mount(over: Partial<CarouselProps> = {}): ReturnType<typeof render> & {
  readonly onClose: ReturnType<typeof vi.fn>;
  readonly onEnterIsland: ReturnType<typeof vi.fn>;
  readonly onSailTo: ReturnType<typeof vi.fn>;
  readonly onPreviewEra: ReturnType<typeof vi.fn>;
  readonly onSettleIsland: ReturnType<typeof vi.fn>;
} {
  const onClose = vi.fn();
  const onEnterIsland = vi.fn();
  const onSailTo = vi.fn();
  const onPreviewEra = vi.fn();
  const onSettleIsland = vi.fn();
  const props = {
    nodeStates: EMPTY_NODE_STATES,
    liveEraId: "prehistoric" as EraId,
    foundedIslands: [island("prehistoric")],
    enableCanvas: false,
    onClose,
    onEnterIsland,
    onSailTo,
    onPreviewEra,
    onSettleIsland,
    reducedMotion: true,
    ...over,
  } as CarouselProps;
  return {
    ...render(<ArchipelagoOverview {...props} />),
    onClose,
    onEnterIsland,
    onSailTo,
    onPreviewEra,
    onSettleIsland,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the Bay projects the canonical diagnostic prefix", () => {
  const cases = [
    { name: "first era unmastered", evidence: passedEras(), prefixLength: 1 },
    { name: "first three mastered", evidence: passedEras(0, 1, 2), prefixLength: 4 },
    {
      name: "later non-monotonic mastery",
      evidence: passedEras(0, 1, 2, 7),
      prefixLength: 4,
    },
    {
      name: "all mastered",
      evidence: passedEras(...ERA_SEQUENCE.map((_, index) => index)),
      prefixLength: ERA_SEQUENCE.length,
    },
    {
      name: "incomplete first-era evidence",
      evidence: passedEra(ERA_SEQUENCE[0]?.id as EraId).slice(0, -1),
      prefixLength: 1,
    },
  ] as const;

  it.each(cases)("$name", ({ evidence, prefixLength }) => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    const view = archipelagoCarouselView({
      selectedEraId: ERA_SEQUENCE[0]?.id as EraId,
      standingEraId: ERA_SEQUENCE[0]?.id as EraId,
      foundedIslands: [island(ERA_SEQUENCE[0]?.id as EraId)],
      nodeStates: evidence,
    });
    const unlocked = view.islands
      .filter((candidate) => candidate.state !== "closed")
      .map((candidate) => candidate.eraId);
    const expected = ERA_SEQUENCE.slice(0, prefixLength).map((era) => era.id);

    expect(unlocked).toEqual(expected);
    expect(unlocked.length).toBeGreaterThanOrEqual(1);
    expect(
      view.islands.slice(prefixLength).every((candidate) => candidate.state === "closed"),
    ).toBe(true);
  });
});

describe("selected and standing islands remain independent", () => {
  it("opens on standing, steps one era without moving standing, clamps, and never wraps", () => {
    mount({
      liveEraId: "classical",
      foundedIslands: [
        island("prehistoric"),
        island("neolithic"),
        island("bronze_age"),
        island("classical"),
      ],
    });

    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      "classical",
    );
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-standing-era",
      "classical",
    );

    fireEvent.click(screen.getByRole("button", { name: /Previous island/ }));
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      "bronze_age",
    );
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-standing-era",
      "classical",
    );

    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "Home" });
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      ERA_SEQUENCE[0]?.id,
    );
    expect(screen.getByRole("button", { name: "No previous island" })).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "ArrowLeft" });
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      ERA_SEQUENCE[0]?.id,
    );

    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "End" });
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      ERA_SEQUENCE.at(-1)?.id,
    );
    expect(screen.getByRole("button", { name: "No next island" })).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "ArrowRight" });
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      ERA_SEQUENCE.at(-1)?.id,
    );
  });

  it("ignores repeated navigation keys and Escape closes back to standing without sailing", () => {
    const mounted = mount({ liveEraId: "bronze_age" });
    const dialog = screen.getByTestId("archipelago-overview");

    fireEvent.keyDown(dialog, { key: "ArrowRight", repeat: true });
    expect(dialog).toHaveAttribute("data-selected-era", "bronze_age");

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(dialog).toHaveAttribute("data-selected-era", "classical");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(mounted.onClose).toHaveBeenCalledTimes(1);
    expect(mounted.onSailTo).not.toHaveBeenCalled();
  });

  it("keeps one replaceable pending command during the ordinary sea veil", () => {
    vi.useFakeTimers();
    mount({ liveEraId: "prehistoric", reducedMotion: false });
    const next = screen.getByRole("button", { name: /Next island/ });

    fireEvent.click(next);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-transition",
      "cover",
    );

    act(() => vi.advanceTimersByTime(110));
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      "neolithic",
    );

    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-selected-era",
      "classical",
    );
  });

  it("activates the rendered island, never the requested island hidden behind the veil", () => {
    vi.useFakeTimers();
    const mounted = mount({
      liveEraId: "prehistoric",
      reducedMotion: false,
    });
    const dialog = screen.getByTestId("archipelago-overview");

    fireEvent.click(screen.getByRole("button", { name: /Next island/ }));
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(mounted.onEnterIsland).toHaveBeenCalledTimes(1);
    expect(mounted.onPreviewEra).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(110));
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(mounted.onPreviewEra).toHaveBeenCalledWith("neolithic");
    expect(mounted.onEnterIsland).toHaveBeenCalledTimes(1);
  });
});

describe("every selected product state has one honest action", () => {
  it("derives standing, settled, future, and diagnostic from durable islands and evidence", () => {
    const mounted = mount({
      liveEraId: "neolithic",
      foundedIslands: [island("prehistoric"), island("neolithic")],
      nodeStates: passedEras(0, 1),
    });
    const dialog = screen.getByTestId("archipelago-overview");

    const expected = [
      ["prehistoric", "settled", "Sail to Prehistoric"],
      ["neolithic", "standing", "Enter island"],
      ["bronze_age", "diagnostic", "Settle this island"],
      ["classical", "closed", "Explore Classical terrain"],
    ] as const;
    expect(expected).toHaveLength(4);
    let lockedTerrainCases = 0;
    let unlockedHallCases = 0;

    for (const [eraId, state, label] of expected) {
      fireEvent.click(screen.getByTestId(`archipelago-select-${eraId}`));
      expect(dialog).toHaveAttribute("data-state", state);
      const hall = screen
        .getByTestId("archipelago-island-fallback")
        .querySelector(`[data-era-hall-glyph="${eraId}"]`);
      if (state === "closed") {
        expect(hall, `${eraId} locked terrain has no Hall`).toBeNull();
        lockedTerrainCases += 1;
      } else {
        expect(hall, `${eraId} unlocked terrain retains its Hall`).not.toBeNull();
        unlockedHallCases += 1;
      }
      if (state === "closed" || state === "diagnostic") {
        expect(document.querySelector(".archipelago-landmark-caption")).toHaveTextContent(
          state === "closed"
            ? `${getEraOrThrow(eraId).name} terrain · locked shore`
            : `${getEraOrThrow(eraId).name} hall · diagnostic landmark`,
        );
      }
      if (state === "diagnostic") {
        expect(screen.queryByTestId("archipelago-hall-site")).toBeNull();
        expect(screen.getByTestId("archipelago-state-card")).toHaveTextContent(
          /The hall stands, and nothing is placed/,
        );
      }
      if (state === "closed") {
        expect(
          screen.getByRole("button", {
            name: "Explore Classical terrain, camera only",
          }),
        ).toHaveTextContent(label);
        expect(screen.getAllByTestId("archipelago-primary-action")).toHaveLength(1);
        expect(screen.queryByRole("button", { name: /Enter island/i })).toBeNull();
      } else {
        const actions = screen.getAllByTestId("archipelago-primary-action");
        expect(actions, `${eraId} must expose exactly one primary action`).toHaveLength(1);
        expect(actions[0]).toHaveTextContent(label);
      }
    }
    expect(
      lockedTerrainCases,
      "locked focused-preview population floor",
    ).toBeGreaterThanOrEqual(1);
    expect(
      unlockedHallCases,
      "unlocked focused Hall population floor",
    ).toBeGreaterThanOrEqual(3);

    fireEvent.click(screen.getByTestId("archipelago-select-prehistoric"));
    fireEvent.click(screen.getByTestId("archipelago-primary-action"));
    expect(mounted.onSailTo).toHaveBeenLastCalledWith("prehistoric");

    fireEvent.click(screen.getByTestId("archipelago-select-bronze_age"));
    fireEvent.click(screen.getByTestId("archipelago-primary-action"));
    expect(mounted.onSettleIsland).toHaveBeenLastCalledWith("bronze_age");

    fireEvent.click(screen.getByTestId("archipelago-select-classical"));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Explore Classical terrain, camera only",
      }),
    );
    expect(mounted.onPreviewEra).toHaveBeenLastCalledWith("classical");
    expect(mounted.onEnterIsland).not.toHaveBeenCalled();
    expect(mounted.onSailTo).toHaveBeenCalledTimes(1);
  });

  it("does not treat empty future terrain as founded and does not write on preview", () => {
    const stateBytes = JSON.stringify([island("prehistoric")]);
    const mounted = mount({ foundedIslands: [island("prehistoric")] });

    fireEvent.click(screen.getByTestId("archipelago-select-classical"));
    expect(screen.getByTestId("archipelago-hero-renderer")).toHaveAttribute(
      "data-mode",
      "future",
    );
    expect(
      screen
        .getByTestId("archipelago-island-fallback")
        .querySelector('[data-era-hall-glyph="classical"]'),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Explore Classical terrain, camera only",
      }),
    );

    expect(mounted.onPreviewEra).toHaveBeenCalledWith("classical");
    expect(mounted.onSailTo).not.toHaveBeenCalled();
    expect(mounted.onEnterIsland).not.toHaveBeenCalled();
    expect(JSON.stringify([island("prehistoric")])).toBe(stateBytes);
    expect(
      screen
        .getByTestId("archipelago-island-fallback")
        .querySelector('[data-era-hall-glyph="classical"]'),
    ).toBeNull();
  });

  it("says whose fallback hall is standing and never prints the note on authored art", () => {
    const fallback = mount({
      liveEraId: "renaissance",
      foundedIslands: [island("renaissance")],
    });
    expect(screen.getByTestId("archipelago-state-card")).toHaveTextContent(
      "This age has no finished Hall model of its own yet, so its era-specific civic landmark is standing in.",
    );
    fallback.unmount();

    mount({
      liveEraId: "classical",
      foundedIslands: [island("classical")],
    });
    expect(screen.getByTestId("archipelago-state-card")).not.toHaveTextContent(
      /no hall of its own|model is not in the build/,
    );
  });
});

describe("the whole sequence stays operable without ten visible miniature islands", () => {
  it("exposes ten direct destinations through one route control and keeps prominent arrows", () => {
    mount({ liveEraId: "medieval" });

    const route = screen.getByRole("button", { name: /Choose island/ });
    expect(route).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(route);
    expect(screen.getByRole("listbox", { name: "Choose an island" })).toBeTruthy();
    expect(document.querySelectorAll(".archipelago-route-option")).toHaveLength(
      ERA_SEQUENCE.length,
    );
    for (const era of ERA_SEQUENCE) {
      const option = screen.getByTestId(`archipelago-select-${era.id}`);
      const state = option.getAttribute("data-state");
      expect(state).toMatch(/^(standing|settled|closed|diagnostic|ceremony)$/);
      expect(option).toHaveAccessibleName(
        `Island ${String(eraNumber(era.id)).padStart(2, "0")}, ${era.name}, ${state}`,
      );
      expect(option.querySelector(`[data-era-hall-glyph="${era.id}"]`)).not.toBeNull();
      expect(option.querySelectorAll('[role="img"]')).toHaveLength(0);
    }

    expect(screen.getByTestId("archipelago-title")).toHaveTextContent("Medieval Era");
    expect(screen.getByTestId("archipelago-era-line")).toHaveTextContent("Island 05 / 10");
    expect(screen.getByRole("button", { name: /Previous island/ })).toHaveClass(
      "archipelago-arrow",
    );
    expect(screen.getByRole("button", { name: /Next island/ })).toHaveClass(
      "archipelago-arrow",
    );
  });
});
