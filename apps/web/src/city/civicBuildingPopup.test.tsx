import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { civicTestPayment } from "./civicTestSupport";

/**
 * **CLICKING A BOUGHT CIVIC BUILDING OPENS A POPUP, AND WHAT THAT POPUP MAY SAY.**
 *
 * Clicking a SKILL building opens an anchored `role="dialog"` — its lesson entry points
 * plus a *"Move building"* control. Clicking a CIVIC building opened nothing at all:
 * `openLessonPopup` tested `placedNodeIds.has(nodeId)`, a civic building lives in
 * `load.civic` rather than `load.placements`, so every civic click fell through the
 * `!placed` guard and returned. The live region still announced the selection, so a
 * screen-reader user was told what the building gives the city and a sighted user was
 * told nothing.
 *
 * ## The two ways the fix goes wrong, and why both are asserted here
 *
 * **DRIFT.** The announcement already reports the two capacities
 * (`civicSelectionMessage`). A popup that computed them a second time would be a second
 * account of the same numbers, free to disagree the moment the catalogue is retuned. So
 * the figures are asserted to be the SAME on both surfaces, per type, against the
 * catalogue — which is the assertion a forked computation fails.
 *
 * **MASTERY-SHAPED MACHINERY.** A bought building has no mastery ladder, no prerequisite
 * chain and no lesson, and this exact defect class has shipped three times in a week: an
 * empty 0-of-3 star rack over a bought building, a false *"not built yet"* announcement,
 * and a *"Ready to build"* card offering to place a building already paid for. So the
 * popup is required NOT to carry a mastery row, a progress meter, a construction stage, or
 * a build offer — each named individually, because "looks right" is what shipped the other
 * three.
 *
 * ## The population, and its floor
 *
 * Every row of the era's bought catalogue exhibits the behaviour (standing in the city
 * without having been built through a lesson), so the population is `ERA_ONE_CIVIC_TYPES`,
 * derived rather than listed — a fifth row is covered the day it is authored. Each
 * building is bought through the real `placeCivic`, so the ids under test are the app's.
 *
 * A count floor alone would not be enough: every assertion below sits inside a loop over
 * the bought ids, so all of them hold vacuously over a city containing no civic buildings
 * — which is what a broken seat scan or an emptied catalogue produces. Hence the floor,
 * and hence the composition check that both dials are genuinely exercised: the Smokehouse
 * moves livability only and the Campfire happiness only, so a popup that silently rendered
 * one dial and dropped the other would pass a test that merely counted rows.
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

/** Era one's bought catalogue, derived rather than written down. */
const CIVIC_TYPE_IDS = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];

/** Buy one of `type` at the first seat the placement rule accepts. */
async function buy(session: CityDevSession, type: EraOneCivicTypeId): Promise<string> {
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

/** A city with one of every catalogue row bought and standing. */
async function cityWithEveryCivicType(): Promise<{
  session: CityDevSession;
  byType: Map<EraOneCivicTypeId, string>;
}> {
  const session = createCityDevSession();
  const byType = new Map<EraOneCivicTypeId, string>();
  for (const type of CIVIC_TYPE_IDS) {
    byType.set(type, await buy(session, type));
  }
  return { session, byType };
}

function ready(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: "Build" });
}

/**
 * The FIRST integer a rendered row carries, or 0 when it carries none — how a figure is
 * read off the panel. A row with no digits in it is a row reporting no capacity, which is
 * the same thing the omitted row means, so both collapse to 0 and the assertions compare
 * like with like.
 */
function figureIn(element: Element | null): number {
  const found = (element?.textContent ?? "").match(/\d+/);
  return found === null ? 0 : Number(found[0]);
}

describe("CitySurface — the popup over a BOUGHT civic building", () => {
  it("opens on a click, and reports the same figures the announcement does", async () => {
    const user = userEvent.setup();
    const { session, byType } = await cityWithEveryCivicType();

    expect(byType.size, "one of every catalogue row is standing").toBe(
      CIVIC_TYPE_IDS.length,
    );
    expect(byType.size, "the catalogue is non-empty").toBeGreaterThanOrEqual(4);

    render(
      <CitySurface
        loadCity={session.load}
        goldAvailable={500}
        materialAvailable={100_000}
        materialLabel="stone"
      />,
    );
    await ready();

    // What each dial was seen to carry across the whole catalogue, so the composition
    // check below can prove both were really exercised.
    const livabilitySeen: number[] = [];
    const happinessSeen: number[] = [];

    for (const [type, id] of byType) {
      const row = ERA_ONE_CIVIC_TYPES[type];
      await user.click(screen.getByTestId(`scene-building-${id}`));

      // THE POPUP EXISTS. This is the assertion that was red: no dialog opened at all.
      const panel = await waitFor(() => screen.getByTestId("civic-panel"));
      expect(panel, type).toHaveAttribute("role", "dialog");

      // It is named for the building, in words, and never by its raw placement id.
      expect(panel, type).toHaveTextContent(row.name);
      expect(panel.textContent ?? "", type).not.toContain(id);
      expect(panel.textContent ?? "", type).not.toContain("civic:");

      // EVAN'S ASK: the Move building prompt a skill building's popup carries.
      const move = within(panel).getByRole("button", { name: /Move building/ });
      expect(move, type).toBeEnabled();

      // THE FIGURES, on the popup...
      const livabilityRow = within(panel).queryByTestId("civic-panel-livability");
      const happinessRow = within(panel).queryByTestId("civic-panel-happiness");
      const onPanel = {
        livability: figureIn(livabilityRow),
        happiness: figureIn(happinessRow),
      };

      // ...are the catalogue's...
      expect(onPanel, `${type} panel matches the catalogue`).toEqual({
        livability: row.livability,
        happiness: row.happiness,
      });

      // ...and are the ones the LIVE REGION is speaking at the same moment. Both
      // surfaces read one source, so this is the assertion a forked computation fails.
      const spoken = screen.getByTestId("city-live-polite").textContent ?? "";
      expect(spoken, type).toContain("a bought civic building, not a skill");
      if (row.livability > 0) {
        expect(spoken, type).toContain(`${row.livability} more people sustained`);
        expect(livabilityRow, `${type} shows its livability`).not.toBeNull();
      } else {
        // A dial that does not move is not reported as a zero on either surface: "0
        // people sustained" is the empty-meter defect written as text.
        expect(spoken, type).not.toContain("people sustained");
        expect(livabilityRow, `${type} has no livability row`).toBeNull();
      }
      if (row.happiness > 0) {
        expect(spoken, type).toContain(`${row.happiness} Happiness`);
        expect(happinessRow, `${type} shows its happiness`).not.toBeNull();
      } else {
        expect(spoken, type).not.toContain("Happiness");
        expect(happinessRow, `${type} has no happiness row`).toBeNull();
      }

      livabilitySeen.push(onPanel.livability);
      happinessSeen.push(onPanel.happiness);

      await user.click(within(panel).getByRole("button", { name: /Close/ }));
    }

    // THE COMPOSITION. A loop that rendered one dial and dropped the other would satisfy
    // every count above, so both are required to have really moved somewhere.
    expect(
      livabilitySeen.filter((n) => n > 0).length,
      "some row moves livability",
    ).toBeGreaterThanOrEqual(1);
    expect(
      happinessSeen.filter((n) => n > 0).length,
      "some row moves happiness",
    ).toBeGreaterThanOrEqual(1);
    // And at least one row moves ONLY one dial, which is the case that makes the
    // omit-a-zero rule above a real requirement rather than a decoration.
    expect(
      livabilitySeen.some((n, i) => n === 0 || happinessSeen[i] === 0),
      "some row moves a single dial",
    ).toBe(true);
  });

  it("carries none of the mastery machinery a bought building cannot have", async () => {
    const user = userEvent.setup();
    const { session, byType } = await cityWithEveryCivicType();
    expect(byType.size).toBeGreaterThanOrEqual(4);

    render(
      <CitySurface
        loadCity={session.load}
        goldAvailable={500}
        materialAvailable={100_000}
        materialLabel="stone"
      />,
    );
    await ready();

    for (const [type, id] of byType) {
      await user.click(screen.getByTestId(`scene-building-${id}`));
      const panel = await waitFor(() => screen.getByTestId("civic-panel"));
      const text = panel.textContent ?? "";

      // NO MASTERY LADDER. There is no `student_node_state` row behind this building, so
      // "Mastery 0 of 3" would be inventing a tier, and a star rack would be the bug that
      // already shipped once.
      expect(text, `${type}: no mastery row`).not.toMatch(/mastery/i);
      expect(text, `${type}: no X of 3`).not.toMatch(/\bof 3\b/);
      expect(panel.querySelector(".mastery-stars"), type).toBeNull();

      // NO PROGRESS METER. The hub's panel carries `.hud-meter` because an island really
      // is part-complete; a bought building can never be part-bought, so an empty meter
      // here is the star rack again in another shape.
      expect(panel.querySelector(".hud-meter"), `${type}: no progress meter`).toBeNull();
      expect(text, `${type}: no percentage`).not.toMatch(/\d+%/);

      // NO BUILD OFFER, and no claim that it is unbuilt — it is standing and paid for.
      expect(text, `${type}: no build offer`).not.toMatch(/ready to build/i);
      expect(text, `${type}: not called unbuilt`).not.toMatch(/not built yet/i);
      expect(within(panel).queryByRole("button", { name: /^Build/ }), type).toBeNull();

      // NO LESSON ENTRY POINTS. A civic building has no lesson, no CFU and no practice
      // set, so all three cards the skill popup leads with would be dead ends.
      expect(text, `${type}: no lesson`).not.toMatch(/lesson/i);
      expect(text, `${type}: no practice`).not.toMatch(/practice/i);
      expect(panel.querySelector(".lesson-menu-card"), type).toBeNull();

      // NO CONSTRUCTION STAGE. It renders at its finished mass from the moment it is
      // paid for, so "Foundation" / "Construction" are stages it never passes through.
      expect(text, `${type}: no stage`).not.toMatch(/foundation|construction/i);

      // AND THE SKILL POPUP IS NOT WHAT OPENED. Asserted positively, because every
      // check above would also pass over a popup that failed to open at all — and that
      // was the shipped state.
      expect(screen.queryByTestId("town-hall-panel"), type).toBeNull();
      expect(document.querySelectorAll('[role="dialog"]').length, type).toBe(1);

      await user.click(within(panel).getByRole("button", { name: /Close/ }));
    }
  });

  it("relocates the building it belongs to, and really moves it", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    const id = await buy(session, "campfire");

    render(
      <CitySurface
        loadCity={session.load}
        materialAvailable={100_000}
        materialLabel="stone"
        onMoveCivic={session.moveCivic}
        onPlaceCivic={(t, transform) =>
          session.placeCivic(t, transform, civicTestPayment(100_000))
        }
      />,
    );
    await ready();

    const before = (await session.load()).civic?.find((p) => p.nodeId === id);
    expect(before, "the building is standing before the move").toBeDefined();

    await user.click(screen.getByTestId(`scene-building-${id}`));
    const panel = await waitFor(() => screen.getByTestId("civic-panel"));
    await user.click(within(panel).getByRole("button", { name: /Move building/ }));

    // The SAME placement bar a skill move opens, naming this building.
    const bar = await screen.findByRole("group", { name: /Moving/ });
    expect(bar).toHaveTextContent(ERA_ONE_CIVIC_TYPES.campfire.name);

    // Step it one cell to a spot the rule accepts. The direction is DISCOVERED rather
    // than assumed: the seat scan puts the building near the island's edge, so a fixed
    // arrow would be a coin flip on whether the next cell is even on the island — and a
    // test that stepped somewhere invalid would be measuring the disabled Confirm button
    // rather than the move.
    const { fireEvent } = await import("@testing-library/react");
    const stepped = await (async () => {
      for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
        fireEvent.keyDown(bar, { key });
        const valid = await waitFor(() =>
          document.querySelector(".city-placement")?.getAttribute("data-valid"),
        );
        if (valid === "true") {
          return key;
        }
        // Undo and try another direction.
        fireEvent.keyDown(bar, {
          key: key === "ArrowRight" ? "ArrowLeft" : key === "ArrowDown" ? "ArrowUp" : key,
        });
      }
      return null;
    })();
    expect(stepped, "one neighbouring cell accepts the building").not.toBeNull();
    await user.click(within(bar).getByRole("button", { name: /Drop here/ }));

    // THE BUILDING REALLY MOVED, in the session — a Move control that opened a ghost and
    // then quietly dropped the result would satisfy every assertion above it.
    await waitFor(async () => {
      const after = (await session.load()).civic?.find((p) => p.nodeId === id);
      expect(after, "still exactly one building of that id").toBeDefined();
      expect(`${after?.col},${after?.row}`).not.toBe(`${before?.col},${before?.row}`);
    });
    // And it was a MOVE rather than a second purchase: still one building, nothing spent.
    const load = await session.load();
    expect(load.civic).toHaveLength(1);
    expect(load.civic_material_spent).toBe(0);
  });
});
