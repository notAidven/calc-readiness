import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { civicTestPayment } from "./civicTestSupport";
import { openBuiltShelf } from "./test/openBuiltShelf";

/**
 * CLICKING A BOUGHT CIVIC BUILDING IN THE CITY.
 *
 * Two surfaces answer that click, and on 2026-07-29 both answered it with copy written
 * for a building that is EARNED through mastery rather than BOUGHT: the live region said
 * *"Selected The Smokehouse — not built yet. Choose Build to place it on the island."*
 * and the HUD raised a **Ready to build** card headed with the raw placement id
 * `civic:smokehouse:0`, over a building the learner had just paid 80 stone for. Both were
 * read out of the DOM of the running app before either was touched
 * (`output/civic/announce/before-live-region.log`).
 *
 * ## Why the population is the whole catalogue, and why it is derived
 *
 * The behaviour that makes the defect possible is not "has a `civic:` id"; it is BEING
 * STANDING IN THE CITY WITHOUT HAVING BEEN BUILT THROUGH A LESSON. Every row of the era's
 * bought catalogue exhibits that, so every row is swept, read from `ERA_ONE_CIVIC_TYPES`
 * rather than listed here — a fifth row is covered the day it is authored. Each is bought
 * through the real `placeCivic`, so the ids under test are the ids the app holds.
 *
 * ## Why the positive half is in the same test
 *
 * Both defects would be "fixed" by never saying *not built yet* and never raising the
 * card. That is the same defect pointed the other way, and it is the one an unplaced
 * skill building would then suffer, so the last third of this test selects one and
 * requires exactly the prompt the civic buildings must not get.
 *
 * The R3F scene never mounts under jsdom, so the canvas host is stubbed with a DOM
 * stand-in over the SAME two props the real scene is wired to — `placed` (what is
 * standing) and `onSelect` (what a click on one reports). Everything after the click is
 * the real surface.
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
          // The id is the TESTID and never the label: this test asserts that no raw
          // placement id is on screen, and a stub that printed one would answer its own
          // question with its own markup.
          data-testid={`scene-building-${p.nodeId}`}
          onClick={() => onSelect(p.nodeId)}
        >
          a building
        </button>
      ))}
    </div>
  ),
}));

/** Era one's bought catalogue, derived rather than written down. */
const CIVIC_TYPE_IDS = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];

/**
 * Buy one of `type` at the first seat the placement rule accepts. A first-fit scan
 * rather than authored cells, so the test survives a change to the island's layout,
 * the hub's footprint, or a catalogue footprint — none of which it is about.
 */
async function buy(session: CityDevSession, type: EraOneCivicTypeId): Promise<string> {
  for (let col = -6; col <= 6; col += 1) {
    for (let row = -6; row <= 6; row += 1) {
      const result = await session.placeCivic(
        type,
        { col, row, rot: 0 },
        civicTestPayment(10_000),
      );
      if (result.status === "built" && result.placementId !== null) {
        return result.placementId;
      }
    }
  }
  throw new Error(`no seat on the island for ${type}`);
}

/** A city with one of every catalogue row bought and standing, and nothing else placed. */
async function cityWithEveryCivicType(): Promise<{
  session: CityDevSession;
  ids: string[];
}> {
  const session = createCityDevSession();
  const ids: string[] = [];
  for (const type of CIVIC_TYPE_IDS) {
    ids.push(await buy(session, type));
  }
  return { session, ids };
}

/** Wait for the city to finish loading (the always-present Buildings disclosure). */
function ready(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: "Build" });
}

describe("CitySurface — selecting a BOUGHT civic building", () => {
  it("never describes it as unbuilt, and never offers to build it again", async () => {
    const user = userEvent.setup();
    const { session, ids } = await cityWithEveryCivicType();

    // THE FLOOR. Every assertion below is over `ids`, and every one of them holds
    // vacuously over an empty city — which is exactly the city a broken seat scan, an
    // emptied catalogue, or a `placeCivic` that quietly stopped placing would produce.
    expect(ids.length, "one of every catalogue row is standing").toBe(
      CIVIC_TYPE_IDS.length,
    );
    expect(ids.length, "the catalogue is non-empty").toBeGreaterThanOrEqual(4);

    render(
      <CitySurface enableCanvas={false} loadCity={session.load} goldAvailable={500} />,
    );
    await ready();

    for (const id of ids) {
      await user.click(screen.getByTestId(`scene-building-${id}`));

      // What a screen reader hears. It says what the building IS and what the purchase
      // bought, and it does not say the building is missing.
      const live = screen.getByTestId("city-live-polite");
      await waitFor(() =>
        expect(live).toHaveTextContent(/a bought civic building, not a skill/),
      );
      expect(live, id).not.toHaveTextContent(/not built yet/i);
      expect(live, id).not.toHaveTextContent(/choose build/i);

      // The VISIBLE twin of the same sentence: the "Ready to build" card, which carried
      // its own "Not built yet" line and a Build it button over a paid-for building.
      expect(document.querySelector(".hud-detail"), id).toBeNull();
      expect(screen.queryByText(/Ready to build/i)).toBeNull();

      // And no raw placement id anywhere on screen — the card headed itself with one.
      expect(document.body.textContent ?? "", id).not.toContain(id);
      expect(document.body.textContent ?? "").not.toContain("civic:");
    }

    // THE POSITIVE HALF. A skill building that genuinely is not on the island must still
    // be described as ready and offered the build, or the two fixes above would have been
    // "stop saying it" and this file would be certifying a worse app than it started with.
    await openBuiltShelf(user);
    const plots = Array.from(
      // The hub's row carries a `data-node-id` too and is not a skill, so it is
      // excluded here rather than relied on to sort itself out.
      document.querySelectorAll<HTMLElement>('button.city-plot[data-node-id^="NUM."]'),
    );
    expect(
      plots.length,
      "the island's skills are all still unplaced",
    ).toBeGreaterThanOrEqual(6);
    // Arrow-key the roster, which SELECTS without placing (clicking an unplaced row
    // starts a placement, and a placement in progress hides this card by design).
    (plots[0] as HTMLElement).focus();
    expect(document.activeElement).toBe(plots[0]);
    fireEvent.keyDown(plots[0] as HTMLElement, { key: "ArrowDown" });

    const card = await waitFor(() => {
      const found = document.querySelector(".hud-detail");
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    expect(card).toHaveTextContent(/Ready to build/i);
    expect(card).toHaveTextContent(/Not built yet/i);
    expect(screen.getByTestId("city-live-polite")).toHaveTextContent(/ready to build/i);
  });
});
