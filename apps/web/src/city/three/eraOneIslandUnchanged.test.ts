import { createHash } from "node:crypto";
import { cityRosterNodeIds } from "@cr/game";
import { describe, expect, it } from "vitest";

import { ringLayout } from "../../catchup/ringLayout";
import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import {
  BUILDABLE_RADIUS,
  defaultPlacements,
  ISLAND_GRASS_RADIUS,
  type PlacedTransform,
  SEA_RADIUS,
  walkableRadiusFor,
} from "../worldLayout";
import { evanIslandGeometryStats } from "./evanIslandGeometry";
import { buildIslandGroup } from "./StarterIsland";

/**
 * The old integration guard pinned all 545 meshes of the stale procedural Era 1 island. It was
 * demonstrated red against the authored-pipeline requirement before being replaced. The
 * load-bearing invariants are the city seats and the island radii; the picture is now guarded by
 * authored-pipeline population/signature assertions and learner-mount screenshots.
 */

const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };

/** Era one's roster seated by both shipped layouts, as transforms. */
function cityTransforms(): readonly string[] {
  const roster = [...cityRosterNodeIds("prehistoric")];
  const greedy = defaultPlacements(roster, [HALL], BUILDABLE_RADIUS);
  const ring = ringLayout({
    nodeIds: roster,
    reserved: [HALL],
    buildableRadius: BUILDABLE_RADIUS,
  });
  return [...greedy, ...ring.placed].map(
    (seat) => `${seat.nodeId}@${seat.col},${seat.row},${seat.rot}`,
  );
}

function digest(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join(";")).digest("hex");
}

describe("era one's authored island preserves its product geometry contracts", () => {
  it("draws its restrained authored terrain and no longer builds the shoreline camp", () => {
    const island = buildIslandGroup(
      eraCityLayout("prehistoric"),
      islandGround("prehistoric"),
      eraLandRadius("prehistoric"),
    );
    const stats = evanIslandGeometryStats(island);
    // 2026-08-21: gravel-shelf, shore-boulder-clusters, scrub bushes, and reed banks were
    // deliberately removed ("take out any of the art thats not the trees" and then "retain the
    // trees and a few of the green patches; delete all the brown stuff... there should be like
    // 8 things total"), and the windblown-camp feature group (hearth, drying rack, midden,
    // flint scatter, hide boat, worn routes) was retired for the same reason. Era one now
    // authors only its 5 trees and 3 grazing patches, and `prehistoricCampProps` is gone.
    expect(stats.meshes).toBeGreaterThan(20);
    expect(stats.triangles).toBeGreaterThan(500);
    expect(stats.signatures).toEqual(["wind-cropped-trees"]);
    expect(island.userData.prehistoricCampProps).toBeUndefined();
  });

  it("seats the same city, building for building", () => {
    const transforms = cityTransforms();
    // Six buildings twice — the greedy layout the demo mock and the dev seeds use, and the ring
    // layout the catch-up walks. Both ship, so both are pinned.
    expect(transforms).toHaveLength(12);
    expect(digest(transforms)).toBe(
      "d8af9a895a8869a244d4cc1feb0f3922945df21cd1b6aa35da36f0631d4ef1bb",
    );
  });

  it("hands era one the same four radii it always had", () => {
    // The numbers the two digests are a consequence of, stated so a failure above says WHICH
    // one moved rather than only that something did.
    const layout = eraCityLayout("prehistoric");
    expect(layout.islandRadius).toBe(ISLAND_GRASS_RADIUS);
    expect(layout.seaRadius).toBe(SEA_RADIUS);
    expect(layout.buildableRadius).toBe(BUILDABLE_RADIUS);
    expect(walkableRadiusFor(layout.buildableRadius)).toBe(BUILDABLE_RADIUS + 3);
  });
});
