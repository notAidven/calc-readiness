import { civicCatalogueForEra, LEGACY_ERA_ONE_CIVIC_IDS } from "@cr/economy";
import { ERA_ONE_CIVIC_TYPES, type EraOneCivicTypeId } from "@cr/game";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { civicModelBasename } from "./civicBuildings";
import { civicTestPayment } from "./civicTestSupport";
import type { PlacedTransform, Transform } from "./worldLayout";

/**
 * **THE PLACEMENT PREVIEW, WHILE A BOUGHT CIVIC BUILDING IS BEING POSITIONED.**
 *
 * Placing a SKILL building shows a translucent 3D ghost of the finished model, snapped to
 * the grid and tinted green or rose by the same rule the commit gates on. Placing a CIVIC
 * building showed no ghost at all: `CitySurface`'s `ghostModelUrl` resolved every id
 * through `resolveBuildingModel`, which knows `NUM.*` keys and the hub sentinel, and a
 * civic placement carries neither — it carries the synthetic `civic:<type>:preview` id
 * (`civic.ts`). So the memo answered `null`, `CityScene` renders the ghost only
 * `{placing && placement && ghostModelUrl && ...}`, and the learner dragged an invisible
 * building around the island.
 *
 * ## Why this is asserted on `ghostModelUrl` and `placement`
 *
 * The ghost itself is WebGL: `GhostBuilding` is a `<primitive>` inside a `<Canvas>`, and
 * the R3F scene never mounts under jsdom. What decides whether a ghost exists at all, and
 * which model it wears, is the pair of props the scene is handed — so those are what is
 * measured here, over a stub that records them. The rendered ghost, in both its valid and
 * its refused tint, is evidenced by screenshot instead; a unit test cannot see a colour in
 * a canvas.
 *
 * ## Why the population is the whole catalogue, and why it is derived
 *
 * The behaviour that makes the defect possible is BEING POSITIONED WITHOUT A GRAPH NODE
 * BEHIND THE ID. Every row of the era's bought catalogue exhibits that, so every row is
 * swept, read from `ERA_ONE_CIVIC_TYPES` rather than listed here — a fifth row is covered
 * the day it is authored.
 *
 * A floor on the population is not enough on its own, because four non-null urls are also
 * what one hardcoded url would produce. So the DISTINCTNESS of the four is asserted
 * beside the floor: the ghost must wear the model of the type being bought, not a model.
 */
vi.mock("./three/CityCanvasHost", () => ({
  CityCanvasHost: ({
    placing = false,
    placement = null,
    ghostModelUrl = null,
    fallback,
  }: {
    placing?: boolean;
    placement?: ScenePlacementProp | null;
    ghostModelUrl?: string | null;
    fallback: React.ReactNode;
  }) => {
    sceneProps = { placing, placement, ghostModelUrl };
    return <div data-testid="scene-stub">{fallback}</div>;
  },
}));

/**
 * Exactly what `CitySurface` projects onto the scene for the active placement — the id
 * (which the footprint and the ghost model are both derived from), the snapped cell, the
 * quarter-turn, and the validity flag `CityScene` copies into the ghost's `validRef`.
 */
interface ScenePlacementProp {
  readonly nodeId: string;
  readonly col: number;
  readonly row: number;
  readonly rot: number;
  readonly valid: boolean;
}

/**
 * The build menu's 3D thumbnails, stubbed to DOM. `BuildingThumb` mounts a raw R3F
 * `<Canvas>` with no WebGL feature-gate in front of it, so the lazy chunk throws on
 * jsdom's missing `ResizeObserver` the moment it resolves. Same stub the build-menu
 * preview test uses; the thumbnails are not what this file is about.
 */
vi.mock("./three/BuildingThumb", () => ({ default: () => <span data-testid="thumb" /> }));

/** The last props the scene was handed — what decides whether a ghost draws, and which. */
let sceneProps: {
  placing: boolean;
  placement: ScenePlacementProp | null;
  ghostModelUrl: string | null;
} = { placing: false, placement: null, ghostModelUrl: null };

beforeEach(() => {
  sceneProps = { placing: false, placement: null, ghostModelUrl: null };
});

/** Era one's bought catalogue, derived rather than written down. */
const CIVIC_TYPE_IDS = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];

/* -------------------------------------------------------------------------- */
/* The sealing ring — the reachability refusal, reproduced for the ghost.      */
/* -------------------------------------------------------------------------- */

/**
 * The ring arrangement `placementReachability.test.ts` measures the rule with, restated
 * here because that file is a test and exports nothing. `NUM.3` at the origin has walls on
 * three sides; the last gap at (0,1) is what a 2×2 closes.
 */
const RING_WITHOUT_LAST: readonly PlacedTransform[] = [
  { nodeId: "NUM.3", col: 0, row: 0, rot: 0 },
  { nodeId: "NUM.4", col: -1, row: -1, rot: 0 },
  { nodeId: "NUM.F", col: 0, row: -1, rot: 0 },
  { nodeId: "NUM.S", col: 1, row: 0, rot: 0 },
];
/** The sealing spot: a 2×2 over (-1,1) (0,1) (-1,2) (0,2) takes the last gap. */
const SEALING_MOVE: Transform = { col: -1, row: 1, rot: 0 };
/** Open ground far from the ring, where the same building is welcome. */
const HARMLESS_MOVE: Transform = { col: -4, row: -4, rot: 0 };
/** The hub, parked clear of the ring (its 3×2 covers the origin by default). */
const HUB_PARKED: Transform = { col: -5, row: -2, rot: 0 };

/** A city with the ring standing, so one more 2×2 would wall `NUM.3` in. */
async function sessionWithRing(): Promise<CityDevSession> {
  const session = createCityDevSession();
  await session.moveTownHall(HUB_PARKED);
  for (const placed of RING_WITHOUT_LAST) {
    await session.placeSkill(placed.nodeId, placed);
  }
  const load = await session.load();
  expect(load.placements, "the ring is standing").toHaveLength(RING_WITHOUT_LAST.length);
  return session;
}

/** Open the build menu's Civic tab and choose `type`'s card, which starts the ghost. */
async function startCivicPlacement(
  user: ReturnType<typeof userEvent.setup>,
  type: EraOneCivicTypeId,
): Promise<HTMLElement> {
  await user.click(await screen.findByRole("button", { name: "Build" }));
  await user.click(await screen.findByRole("tab", { name: /Civic/ }));
  await user.click(
    await screen.findByTestId(`civic-card-${LEGACY_ERA_ONE_CIVIC_IDS[type]}`),
  );
  return await screen.findByRole("group", { name: /Placing/ });
}

/** Arrow-key the ghost from wherever it seeded to an exact cell. */
async function nudgeTo(bar: HTMLElement, target: Transform): Promise<void> {
  for (let guard = 0; guard < 60; guard += 1) {
    const at = sceneProps.placement;
    if (at === null) {
      throw new Error("no placement is active to nudge");
    }
    const dcol = target.col - at.col;
    const drow = target.row - at.row;
    if (dcol === 0 && drow === 0) {
      return;
    }
    if (dcol !== 0) {
      fireEvent.keyDown(bar, { key: dcol > 0 ? "ArrowRight" : "ArrowLeft" });
    } else {
      fireEvent.keyDown(bar, { key: drow > 0 ? "ArrowDown" : "ArrowUp" });
    }
    await waitFor(() => {
      const now = sceneProps.placement;
      expect(`${now?.col},${now?.row}`).not.toBe(`${at.col},${at.row}`);
    });
  }
  throw new Error(`the ghost never reached ${target.col},${target.row}`);
}

describe("CitySurface — the ghost preview for a BOUGHT civic building", () => {
  it("shows a ghost wearing that type's own built model, for every catalogue row", async () => {
    const user = userEvent.setup();
    const seen = new Map<EraOneCivicTypeId, string>();

    for (const type of CIVIC_TYPE_IDS) {
      const session = createCityDevSession();
      const view = render(
        <CitySurface
          loadCity={session.load}
          materialAvailable={10_000}
          materialLabel="stone"
          onPlaceCivic={(t, transform) =>
            session.placeCivic(t, transform, civicTestPayment(10_000))
          }
        />,
      );
      await startCivicPlacement(user, type);

      // The scene is in placement mode and knows WHICH civic row it is positioning. The
      // surface projects only `{nodeId, col, row, rot, valid}` onto the scene — the
      // footprint and the ghost are both derived from the id — so the id is what carries
      // the type across, in `civic.ts`'s `civic:<type>:preview` form.
      expect(sceneProps.placing, type).toBe(true);
      expect(sceneProps.placement?.nodeId, type).toBe(
        `civic:${LEGACY_ERA_ONE_CIVIC_IDS[type]}:${Number.MAX_SAFE_INTEGER}`,
      );

      // ...and it has a model to draw the ghost from. This is the assertion that was
      // red: `null` here is precisely an invisible ghost, because `CityScene` renders
      // `GhostBuilding` only when `ghostModelUrl` is truthy.
      const url = sceneProps.ghostModelUrl;
      expect(url, `${type} has a ghost model`).not.toBeNull();
      expect(url, `${type}'s ghost is a real bundled model`).toMatch(/\.glb($|\?)/);
      seen.set(type, url as string);

      view.unmount();
    }

    // THE FLOOR. Every assertion above is inside the loop, so all of them hold
    // vacuously over an empty catalogue — which is what an emptied `ERA_ONE_CIVIC_TYPES`
    // or a renamed card testid would produce.
    expect(seen.size, "every catalogue row was positioned").toBe(CIVIC_TYPE_IDS.length);
    expect(seen.size, "the catalogue is non-empty").toBeGreaterThanOrEqual(4);

    // THE COMPOSITION, which the floor cannot constrain: four non-null urls is also what
    // one hardcoded url would give. The ghost must wear the model of the type being
    // bought, so the four are distinct.
    expect(new Set(seen.values()).size, "one model per type").toBe(seen.size);
  });

  it("shows each current Industrial civic ghost with its own authored built GLB", async () => {
    const user = userEvent.setup();
    const rows = civicCatalogueForEra("industrial");
    const seen = new Set<string>();
    expect(rows).toHaveLength(4);

    for (const row of rows) {
      const session = createCityDevSession();
      const view = render(
        <CitySurface
          eraId="industrial"
          loadCity={session.load}
          materialAvailable={100_000}
          materialLabel="coal"
          onPlaceCivic={(typeId, transform) =>
            session.placeCivic(typeId, transform, civicTestPayment(100_000))
          }
        />,
      );
      await user.click(await screen.findByRole("button", { name: /^Build$|All built/ }));
      await user.click(await screen.findByRole("tab", { name: /Civic/ }));
      await user.click(await screen.findByTestId(`civic-card-${row.id}`));
      await screen.findByRole("group", { name: /Placing/ });

      expect(sceneProps.placing, row.id).toBe(true);
      expect(sceneProps.placement?.nodeId, row.id).toBe(
        `civic:${row.id}:${Number.MAX_SAFE_INTEGER}`,
      );
      expect(sceneProps.ghostModelUrl, row.id).toContain(
        civicModelBasename(row.id, "built"),
      );
      seen.add(sceneProps.ghostModelUrl as string);
      view.unmount();
    }
    expect(seen.size).toBe(rows.length);
  });

  it("turns the ghost rose and says why, when the spot would wall a building in", async () => {
    const user = userEvent.setup();
    const session = await sessionWithRing();
    render(
      <CitySurface
        loadCity={session.load}
        materialAvailable={10_000}
        materialLabel="stone"
        onPlaceCivic={(t, transform) =>
          session.placeCivic(t, transform, civicTestPayment(10_000))
        }
      />,
    );

    // The Campfire, because the seal is a FOOTPRINT fact: `SEALING_MOVE` is the spot a
    // 2×2 closes the ring from. Asserted rather than assumed, so a re-authored catalogue
    // fails here instead of testing a hole that no longer seals.
    expect(ERA_ONE_CIVIC_TYPES.campfire.footprint).toEqual([2, 2]);
    const bar = await startCivicPlacement(user, "campfire");

    // A VALID SPOT FIRST, so the refusal below is a refusal of the SPOT and not the
    // ghost's permanent state — and so this test would fail if nothing ever validated.
    await nudgeTo(bar, HARMLESS_MOVE);
    await waitFor(() => {
      expect(document.querySelector(".city-placement")).toHaveAttribute(
        "data-valid",
        "true",
      );
    });
    // `placement.valid` is what `CityScene` copies into the ghost's `validRef` — the
    // green tint's actual input.
    expect(sceneProps.placement?.valid).toBe(true);
    expect(within(bar).getByRole("button", { name: /Build here/ })).toBeEnabled();

    // NOW THE SEALING SPOT.
    await nudgeTo(bar, SEALING_MOVE);
    await waitFor(() => {
      expect(document.querySelector(".city-placement")).toHaveAttribute(
        "data-valid",
        "false",
      );
    });

    // The ghost goes rose: same flag, flipped.
    expect(sceneProps.placement?.valid).toBe(false);

    // AND THE REASON REACHES THE DOM. The canvas is `aria-hidden`, so a rose ghost tells
    // a screen-reader user nothing at all; the refusal has to be readable as words.
    // Reachability's own sentence, not the generic overlap one.
    expect(bar).toHaveTextContent(/would wall a building in/);
    expect(bar).toHaveTextContent(/Leave a gap so every building can be reached/);
    expect(bar).not.toHaveTextContent(/off the island or overlapping/);

    // And the commit is shut, so the ghost is not offering a drop the session refuses.
    expect(within(bar).getByRole("button", { name: /Build here/ })).toBeDisabled();
  });
});
