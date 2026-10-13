import { ERA_SEQUENCE } from "@cr/skill-graph";
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import { eraIslandDesign } from "../islandDesign";
import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import { buildEvanIslandGroup, EVAN_ISLAND_SOURCE } from "./evanIslandGeometry";
import { buildIslandGroup } from "./StarterIsland";

/**
 * Authored-graph CPU ceiling after the restraint pass samples repeated secondary families.
 * Every named landform survives, while no source graph may rebuild the former 2,600-mesh
 * Medieval clutter. The render adapter later batches these meshes further. This is not a draw-call
 * proxy: `evanIslandRendererBudget.browser.test.tsx` separately holds real submitted calls to
 * 120 and triangles to 75,000.
 */
const MESH_CEILING = 700;

/** Every mesh `StarterIsland` draws for an era, off the same builder the scene calls. */
function islandMeshes(eraId: (typeof ERA_SEQUENCE)[number]["id"]): number {
  let meshes = 0;
  buildIslandGroup(
    eraCityLayout(eraId),
    islandGround(eraId),
    eraLandRadius(eraId),
  ).traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      meshes += 1;
    }
  });
  return meshes;
}

/** Evan's source-equivalent graph, before live settlement clearings remove generic clutter. */
function authoredMeshes(eraId: (typeof ERA_SEQUENCE)[number]["id"]): number {
  const design = eraIslandDesign(eraId);
  if (design === null) {
    return islandMeshes(eraId);
  }
  let meshes = 0;
  buildEvanIslandGroup(design, {
    grassRadius: EVAN_ISLAND_SOURCE.plateauRadius,
    seaRadius: 46,
    protectedRadius: 0,
  }).traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      meshes += 1;
    }
  });
  return meshes;
}

describe("the island fits its mesh budget at every era", () => {
  it("stays inside the ceiling, and is not passing over an island that stopped drawing", () => {
    // POPULATION: every era, derived. FLOOR: even the large-surface designs still draw dozens of
    // meshes, so the ceiling cannot be satisfied by a builder that returned an empty group.
    expect(ERA_SEQUENCE).toHaveLength(10);
    const drawn = ERA_SEQUENCE.map((era) => [era.id, authoredMeshes(era.id)] as const);
    for (const [eraId, meshes] of drawn) {
      expect(meshes, `${eraId} draws ${meshes} meshes`).toBeLessThanOrEqual(MESH_CEILING);
    }
    // 2026-08-21: prehistoric's gravel-shelf, shore-boulder-clusters, and ground-scatter props
    // were deliberately removed, dropping its authored population from the shared >400 floor to
    // 64. It no longer shares that floor with the other nine eras' dense procedural population —
    // it keeps its own much lower "did not stop drawing entirely" floor instead.
    const [firstEraId, prehistoricMeshes] = drawn[0] ?? ["", 0];
    expect(firstEraId).toBe("prehistoric");
    expect(prehistoricMeshes, "prehistoric stopped drawing").toBeGreaterThan(0);
    const rest = drawn.slice(1).map(([, meshes]) => meshes);
    expect(Math.min(...rest)).toBeGreaterThan(400);
  });

  it("states the preserved Evan source/live counts and bounds the authored Prehistoric delta", () => {
    expect(ERA_SEQUENCE.slice(1).map((era) => [era.id, authoredMeshes(era.id)])).toEqual([
      ["neolithic", 486],
      ["bronze_age", 570],
      ["classical", 559],
      ["medieval", 639],
      ["renaissance", 636],
      ["industrial", 555],
      ["atomic_age", 532],
      ["information_age", 520],
      ["cyberpunk", 465],
    ]);
    expect(ERA_SEQUENCE.slice(1).map((era) => [era.id, islandMeshes(era.id)])).toEqual([
      ["neolithic", 411],
      ["bronze_age", 518],
      ["classical", 518],
      ["medieval", 556],
      ["renaissance", 579],
      ["industrial", 494],
      ["atomic_age", 457],
      ["information_age", 468],
      ["cyberpunk", 411],
    ]);
    const dearest = Math.max(...ERA_SEQUENCE.map((era) => authoredMeshes(era.id)));
    expect(dearest).toBe(639);
    expect(MESH_CEILING - dearest).toBe(61);
    const prehistoricSource = authoredMeshes("prehistoric");
    const prehistoricLive = islandMeshes("prehistoric");
    // 2026-08-21: prehistoric's gravel-shelf, shore-boulder-clusters, ground-scatter, scrub
    // bushes, and reed banks were deliberately removed in two passes ("take out any of the art
    // thats not the trees" and then "retain the trees and a few of the green patches; delete
    // all the brown stuff... there should be like 8 things total"), dropping its authored
    // source population from >400 to 37. The windblown-camp feature group (hearth, drying
    // rack, midden, flint scatter, hide boat, worn routes) was retired the same day, so the
    // live city graph -- which used to add that camp on top of the authored source -- now adds
    // only roads and other city-specific meshes, narrowing the live/source gap instead.
    expect(prehistoricSource).toBe(37);
    expect(prehistoricLive).toBe(38);
    expect(prehistoricLive).toBeGreaterThan(prehistoricSource);
    expect(prehistoricLive - prehistoricSource).toBe(1);
  });

  it("keeps the Prehistoric authored and live graphs inside the shared ceiling", () => {
    expect(authoredMeshes("prehistoric")).toBeLessThanOrEqual(MESH_CEILING);
    expect(islandMeshes("prehistoric")).toBeLessThanOrEqual(MESH_CEILING);
  });
});
