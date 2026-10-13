import { civicBuildingOrThrow } from "@cr/economy";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { civicTestPayment } from "./civicTestSupport";

/**
 * **THE SHUTTERED BUILDING'S OWN CARD, which was telling the player a figure the city had
 * stopped counting.**
 *
 * `CivicBuildingPanel`'s docblock lists three defects that shipped in one week from one root:
 * the grammar that describes a building TYPE read onto an INSTANCE whose state contradicts it
 * — an empty star rack, a *"not built yet"* over a bought building, a *"Ready to build"* card
 * over one already standing. A crisis-shuttered building reporting *"20 more people
 * sustained"* is the fourth, and it is the worst-placed of them: this card is the one surface
 * where a player asks about THIS BUILDING rather than about the city, so it is where the
 * question *"why is my livability down"* gets its per-building answer.
 *
 * The scene is stubbed exactly as `civicBuildingPopup.test.tsx` stubs it, and for its reason:
 * the click that opens this card is a click on the island, the canvas is `aria-hidden`
 * decoration, and the subject here is the CARD.
 */
vi.mock("./three/CityCanvasHost", () => ({
  CityCanvasHost: ({
    placed = [],
    onSelect,
    fallback,
  }: {
    placed?: readonly { readonly nodeId: string }[];
    onSelect: (nodeId: string) => void;
    fallback: React.ReactNode;
  }) => (
    <div data-testid="scene-stub">
      {fallback}
      {placed.map((p) => (
        <button
          key={p.nodeId}
          type="button"
          data-testid={`scene-building-${p.nodeId}`}
          onClick={() => onSelect(p.nodeId)}
        >
          a building
        </button>
      ))}
    </div>
  ),
}));

const LODGE = civicBuildingOrThrow("prehistoric_longhouse");
const CAMPFIRE = civicBuildingOrThrow("prehistoric_campfire");

/** Buy one at the first seat the placement rule accepts. */
async function buy(session: CityDevSession, type: string): Promise<string> {
  for (let col = -6; col <= 6; col += 1) {
    for (let row = -6; row <= 6; row += 1) {
      const result = await session.placeCivic(
        type,
        { col, row, rot: 0 },
        civicTestPayment(100_000),
      );
      if (result.status === "built" && result.placementId !== null) {
        return result.placementId;
      }
    }
  }
  throw new Error(`no seat on the island for ${type}`);
}

async function aCityWithOneShuttered() {
  const session = createCityDevSession();
  const lodge = await buy(session, LODGE.id);
  const campfire = await buy(session, CAMPFIRE.id);
  await session.recordCrisisDamage({
    buildings: [],
    cells: [],
    suspended_civic: [lodge],
  });
  return { session, lodge, campfire };
}

describe("clicking a crisis-shuttered civic building", () => {
  it("says it is shut, and its unshuttered neighbour's card is the card it always was", async () => {
    const user = userEvent.setup();
    const { session, lodge, campfire } = await aCityWithOneShuttered();
    render(<CitySurface loadCity={session.load} materialAvailable={100_000} />);
    await screen.findByTestId("scene-stub");

    await user.click(await screen.findByTestId(`scene-building-${lodge}`));
    const shut = await screen.findByTestId("civic-panel");
    expect(within(shut).getByRole("heading").textContent).toBe(LODGE.name);
    expect(shut.querySelector(".civic-panel-body")?.getAttribute("data-suspended")).toBe(
      "true",
    );
    expect(shut.textContent).toMatch(/A crisis has this one shut/i);
    // THE FIGURES STAY. They are what reopening buys, so a card that dropped them would
    // leave a player deciding whether to pay with nothing to weigh.
    expect(shut.textContent).toContain(
      `${LODGE.provides.livability} more people sustained`,
    );

    await user.keyboard("{Escape}");
    await user.click(await screen.findByTestId(`scene-building-${campfire}`));
    const open = await screen.findByTestId("civic-panel");
    expect(within(open).getByRole("heading").textContent).toBe(CAMPFIRE.name);
    expect(open.querySelector(".civic-panel-body")?.getAttribute("data-suspended")).toBe(
      "false",
    );
    // Scoped to the buildings a crisis is actually about: the neighbour's card is unchanged.
    expect(open.textContent).toContain("What it gives the city, for as long as it stands.");
    expect(open.textContent).not.toMatch(/shut/i);
  });
});
