import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ARCHIPELAGO_SELECTION_INPUTS, ArchipelagoOverview } from "./ArchipelagoOverview";
import { foundingLayout } from "./islandState";

function mount(): void {
  render(
    <ArchipelagoOverview
      nodeStates={[]}
      liveEraId="classical"
      foundedIslands={[
        { eraId: "prehistoric", layout: foundingLayout() },
        { eraId: "neolithic", layout: foundingLayout() },
        { eraId: "bronze_age", layout: foundingLayout() },
        { eraId: "classical", layout: foundingLayout() },
      ]}
      onEnterIsland={() => undefined}
      onSailTo={() => undefined}
      onClose={() => undefined}
      enableCanvas={false}
      reducedMotion
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("one selected-island command path", () => {
  it("opens on standing without collapsing selected into a different location", () => {
    mount();
    const dialog = screen.getByTestId("archipelago-overview");
    expect(dialog).toHaveAttribute("data-selected-era", "classical");
    expect(dialog).toHaveAttribute("data-standing-era", "classical");
  });

  it("drives every behavior-scoped selection input through the same selected state", () => {
    const cases = [
      {
        id: "previous-arrow",
        expected: "bronze_age",
        drive: () =>
          fireEvent.click(screen.getByRole("button", { name: /Previous island/ })),
      },
      {
        id: "next-arrow",
        expected: "medieval",
        drive: () => fireEvent.click(screen.getByRole("button", { name: /Next island/ })),
      },
      {
        id: "left-key",
        expected: "bronze_age",
        drive: () =>
          fireEvent.keyDown(screen.getByTestId("archipelago-overview"), {
            key: "ArrowLeft",
          }),
      },
      {
        id: "right-key",
        expected: "medieval",
        drive: () =>
          fireEvent.keyDown(screen.getByTestId("archipelago-overview"), {
            key: "ArrowRight",
          }),
      },
      {
        id: "home-key",
        expected: "prehistoric",
        drive: () =>
          fireEvent.keyDown(screen.getByTestId("archipelago-overview"), {
            key: "Home",
          }),
      },
      {
        id: "end-key",
        expected: "cyberpunk",
        drive: () =>
          fireEvent.keyDown(screen.getByTestId("archipelago-overview"), {
            key: "End",
          }),
      },
      {
        id: "swipe",
        expected: "bronze_age",
        drive: () => {
          const stage = screen.getByTestId("archipelago-stage");
          const pointer = (type: "pointerdown" | "pointerup", x: number, at: number) => {
            const event = new Event(type, { bubbles: true });
            Object.defineProperties(event, {
              pointerId: { value: 7 },
              clientX: { value: x },
              clientY: { value: 260 },
              timeStamp: { value: at },
            });
            fireEvent(stage, event);
          };
          pointer("pointerdown", 400, 100);
          pointer("pointerup", 480, 240);
        },
      },
      {
        id: "direct-list",
        expected: "information_age",
        drive: () =>
          fireEvent.click(screen.getByTestId("archipelago-select-information_age")),
      },
    ] as const;

    expect(cases.map((entry) => entry.id)).toEqual(ARCHIPELAGO_SELECTION_INPUTS);
    expect(cases.length).toBeGreaterThanOrEqual(8);

    for (const entry of cases) {
      mount();
      entry.drive();
      const dialog = screen.getByTestId("archipelago-overview");
      expect(dialog, entry.id).toHaveAttribute("data-selected-era", entry.expected);
      expect(dialog, entry.id).toHaveAttribute("data-standing-era", "classical");
      cleanup();
    }
  });
});
