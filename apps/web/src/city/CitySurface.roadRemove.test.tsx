import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { materialWord } from "../economy/materialWord";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { DEFAULT_ERA_ID } from "./eraState";
import { openBuiltShelf } from "./test/openBuiltShelf";
import {
  ROAD_TILE_GOLD_COST,
  type RoadCell,
  roadCellKey,
  roadNeighborMask,
  roadTileShape,
} from "./roads";

/**
 * Click-to-remove a single road tile (selection → anchored popup → full refund).
 *
 * The picking itself lives in the R3F scene, which never mounts under jsdom, so the
 * canvas host is stubbed with a DOM stand-in that exposes the SAME two props the
 * real scene is wired to — `onSelectRoadTile` (what a click on a tile reports) and
 * `selectedRoadTile` (which tile the 3D layer frames in gold). Everything after that
 * — the selection state, the popup, the refund, the reload — is the real surface.
 * The gold frame itself is proven over the built scene graph in `three/Roads.test.ts`.
 */
vi.mock("./three/CityCanvasHost", () => ({
  CityCanvasHost: ({
    roads = [],
    selectedRoadTile = null,
    onSelectRoadTile,
    fallback,
  }: {
    roads?: readonly RoadCell[];
    selectedRoadTile?: RoadCell | null;
    onSelectRoadTile?: (col: number, row: number) => void;
    fallback: React.ReactNode;
  }) => (
    <div data-testid="scene-stub">
      {fallback}
      {roads.map((cell) => (
        <button
          key={roadCellKey(cell.col, cell.row)}
          type="button"
          data-testid={`scene-road-${roadCellKey(cell.col, cell.row)}`}
          data-selected={
            selectedRoadTile?.col === cell.col && selectedRoadTile?.row === cell.row
              ? "true"
              : "false"
          }
          onClick={() => onSelectRoadTile?.(cell.col, cell.row)}
        >
          {`road tile ${roadCellKey(cell.col, cell.row)}`}
        </button>
      ))}
    </div>
  ),
}));

/** A plus of road centred on (0,3), clear of the pre-seeded Town Hall hub. */
const CENTER: RoadCell = { col: 0, row: 3 };
const PLUS: RoadCell[] = [
  CENTER,
  { col: 0, row: 2 },
  { col: 1, row: 3 },
  { col: 0, row: 4 },
  { col: -1, row: 3 },
];

/** A city session with `cells` already paved (and charged for). */
async function pavedSession(cells: readonly RoadCell[] = PLUS) {
  const session = createCityDevSession();
  const laid = await session.layRoads(cells, 10_000);
  expect(laid.status).toBe("committed");
  return session;
}

/** The scene stub's button for one tile. */
function sceneTile(cell: RoadCell): HTMLElement {
  return screen.getByTestId(`scene-road-${roadCellKey(cell.col, cell.row)}`);
}

/** Wait for the city to finish loading (the always-present Buildings disclosure). */
function ready(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: "Build" });
}

describe("CitySurface — picking a road tile", () => {
  it("selects exactly the clicked tile and opens its removal popup", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    render(
      <CitySurface enableCanvas={false} loadCity={session.load} goldAvailable={100} />,
    );
    await ready();

    // Nothing is picked until a tile is clicked.
    expect(screen.queryByTestId("road-tile-popup")).toBeNull();
    for (const cell of PLUS) {
      expect(sceneTile(cell)).toHaveAttribute("data-selected", "false");
    }

    await user.click(sceneTile(CENTER));

    // Exactly one tile is highlighted, and it is the one that was clicked.
    await waitFor(() => expect(sceneTile(CENTER)).toHaveAttribute("data-selected", "true"));
    const highlighted = PLUS.filter(
      (cell) => sceneTile(cell).getAttribute("data-selected") === "true",
    );
    expect(highlighted).toEqual([CENTER]);
    expect(screen.getByTestId("road-tile-popup")).toBeInTheDocument();
  });

  it("shows the refund the tile will hand back, priced off the same constant", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    render(
      <CitySurface enableCanvas={false} loadCity={session.load} goldAvailable={100} />,
    );
    await ready();
    await user.click(sceneTile(CENTER));

    const popup = await screen.findByTestId("road-tile-popup");
    const remove = screen.getByTestId("road-tile-remove");
    expect(remove).toHaveTextContent("Remove");
    expect(remove).toHaveTextContent(
      `+${ROAD_TILE_GOLD_COST} ${materialWord(DEFAULT_ERA_ID)}`,
    );
    // A full refund, stated as such — never a removal fee.
    expect(popup).toHaveTextContent(/in full/i);
    // Learner-facing chrome only: no internal cell/node ids leak into the card.
    expect(popup).not.toHaveTextContent(/NUM\./);
  });

  it("moves the highlight when another tile is picked, never keeping two", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    render(
      <CitySurface enableCanvas={false} loadCity={session.load} goldAvailable={100} />,
    );
    await ready();

    await user.click(sceneTile(CENTER));
    await waitFor(() => expect(sceneTile(CENTER)).toHaveAttribute("data-selected", "true"));
    const other = PLUS[1] as RoadCell;
    await user.click(sceneTile(other));
    await waitFor(() => expect(sceneTile(other)).toHaveAttribute("data-selected", "true"));
    expect(sceneTile(CENTER)).toHaveAttribute("data-selected", "false");
  });

  it("closes the popup and drops the highlight on Escape", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    render(
      <CitySurface enableCanvas={false} loadCity={session.load} goldAvailable={100} />,
    );
    await ready();

    await user.click(sceneTile(CENTER));
    await screen.findByTestId("road-tile-popup");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("road-tile-popup")).toBeNull());
    expect(sceneTile(CENTER)).toHaveAttribute("data-selected", "false");
  });
});

describe("CitySurface — removing a picked road tile refunds it in full", () => {
  it("credits the wallet by exactly the tile's cost and frees the cell", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    const spentBefore = session.roadGoldSpent();
    expect(spentBefore).toBe(PLUS.length * ROAD_TILE_GOLD_COST);

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        goldAvailable={100}
        onRemoveRoads={session.removeRoads}
      />,
    );
    await ready();
    await user.click(sceneTile(CENTER));
    await user.click(await screen.findByTestId("road-tile-remove"));

    // The wallet nets out the road spend, so a refund is that total coming back
    // down — by exactly one tile's price, no more and no less.
    await waitFor(() =>
      expect(session.roadGoldSpent()).toBe(spentBefore - ROAD_TILE_GOLD_COST),
    );
    expect(screen.getByTestId("city-live-polite")).toHaveTextContent(
      `Road tile removed. ${ROAD_TILE_GOLD_COST} ${materialWord(DEFAULT_ERA_ID)} refunded.`,
    );

    // The tile is gone from the city, the popup closed with it, and the cell is
    // free again — it can be paved (or built on) exactly like untouched ground.
    await waitFor(() => expect(screen.queryByTestId("road-tile-popup")).toBeNull());
    const load = await session.load();
    expect(load.roads).toHaveLength(PLUS.length - 1);
    expect(load.roads?.some((c) => c.col === CENTER.col && c.row === CENTER.row)).toBe(
      false,
    );
    const relaid = await session.layRoads([CENTER], 10_000);
    expect(relaid.status).toBe("committed");
  });

  it("re-tiles the surviving neighbours around the hole", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    const roadsOf = async (): Promise<Set<string>> =>
      new Set(((await session.load()).roads ?? []).map((c) => roadCellKey(c.col, c.row)));

    // The centre of the plus starts as a crossroads; its north arm is a dead-end
    // pointing back at it.
    expect(roadTileShape(roadNeighborMask(0, 3, await roadsOf())).shape).toBe("cross");
    expect(roadTileShape(roadNeighborMask(0, 2, await roadsOf())).shape).toBe("end");

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        goldAvailable={100}
        onRemoveRoads={session.removeRoads}
      />,
    );
    await ready();
    await user.click(sceneTile({ col: 0, row: 2 }));
    await user.click(await screen.findByTestId("road-tile-remove"));
    await waitFor(() => expect(screen.queryByTestId("road-tile-popup")).toBeNull());

    // Lifting that arm turns the crossroads into a T, and the arms it still holds
    // keep their dead-end caps — the network re-joins itself around the gap.
    const after = await roadsOf();
    expect(roadTileShape(roadNeighborMask(0, 3, after)).shape).toBe("tee");
    expect(roadTileShape(roadNeighborMask(1, 3, after)).shape).toBe("end");
    expect(roadTileShape(roadNeighborMask(0, 4, after)).shape).toBe("end");
  });

  it("refunds once, not twice, on a double-click", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    const spentBefore = session.roadGoldSpent();
    const removeRoads = vi.fn(session.removeRoads);

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        goldAvailable={100}
        onRemoveRoads={removeRoads}
      />,
    );
    await ready();
    await user.click(sceneTile(CENTER));
    await user.dblClick(await screen.findByTestId("road-tile-remove"));

    await waitFor(() =>
      expect(session.roadGoldSpent()).toBe(spentBefore - ROAD_TILE_GOLD_COST),
    );
    // The selection is consumed by the first click, so the second has nothing to
    // remove — one call, one tile, one refund.
    expect(removeRoads).toHaveBeenCalledTimes(1);
    expect(removeRoads).toHaveBeenCalledWith([CENTER]);
    expect(session.roadGoldSpent()).toBe(spentBefore - ROAD_TILE_GOLD_COST);
  });

  it("cannot pick anything that is not a laid road", async () => {
    const user = userEvent.setup();
    const session = await pavedSession([CENTER]);
    const removeRoads = vi.fn(session.removeRoads);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        goldAvailable={100}
        onRemoveRoads={removeRoads}
      />,
    );
    await ready();

    // The scene only offers laid tiles, and the surface re-checks anyway: a click
    // reported for bare ground (or a building's cell) selects nothing at all.
    expect(screen.queryByTestId("scene-road-5,5")).toBeNull();
    await user.click(sceneTile(CENTER));
    await screen.findByTestId("road-tile-popup");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("road-tile-popup")).toBeNull());
    expect(removeRoads).not.toHaveBeenCalled();
  });

  it("drops the picked tile when a building placement starts", async () => {
    const user = userEvent.setup();
    const session = await pavedSession();
    render(
      <CitySurface enableCanvas={false} loadCity={session.load} goldAvailable={100} />,
    );
    await ready();

    await user.click(sceneTile(CENTER));
    await screen.findByTestId("road-tile-popup");

    // Starting a placement (an unbuilt skill from the Buildings roster) drops the
    // road selection, so the two anchored surfaces are never up at once — and the
    // road layer goes inert under the placement drag.
    await openBuiltShelf(user);
    const plot = document.querySelector<HTMLElement>("button.city-plot[data-node-id]");
    expect(plot).not.toBeNull();
    await user.click(plot as HTMLElement);
    await waitFor(() => expect(screen.queryByTestId("road-tile-popup")).toBeNull());
    expect(sceneTile(CENTER)).toHaveAttribute("data-selected", "false");
  });
});
