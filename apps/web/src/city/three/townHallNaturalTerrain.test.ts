import { ERA_SEQUENCE } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { resolveEraTownHall, TOWN_HALL_FOOTPRINT } from "../townHall";
import { buildEraTownHallFallback } from "./EraTownHallFallback";

const TOWN_HALL_SOURCE =
  (
    import.meta.glob("./TownHall.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>
  )["./TownHall.tsx"] ?? "";

const PLAZA_SOURCES = import.meta.glob(["./TownHallPlaza.ts", "./townHallPlaza.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const GROUND_NAME = /plaza|tile|background|ground|pad|apron|approach|paver|plinth/i;

function hallMountsGround(source: string): boolean {
  return (
    /\bTownHallPlaza\b|\bbuildTownHallPlaza\b/.test(source) ||
    /<primitive\s+object=\{(?:plaza|background|ground|tile)\}/.test(source)
  );
}

describe("Town Halls sit directly on natural terrain", () => {
  it("has no plaza implementation, import, or mounted background", () => {
    expect(TOWN_HALL_SOURCE.length, "TownHall renderer source floor").toBeGreaterThan(
      2_000,
    );
    expect(Object.keys(PLAZA_SOURCES), "retired Town Hall plaza sources").toEqual([]);
    expect(hallMountsGround(TOWN_HALL_SOURCE)).toBe(false);
  });

  it("keeps the integration 0.82 visual scale on the frozen 3x2 footprint", () => {
    expect(TOWN_HALL_FOOTPRINT).toEqual({ w: 3, d: 2 });
    expect(TOWN_HALL_SOURCE).toMatch(/export const TOWN_HALL_VISUAL_SCALE\s*=\s*0\.82\s*;/);
    expect(TOWN_HALL_SOURCE).toMatch(
      /group\.scale\.setScalar\(scale\s*\*\s*TOWN_HALL_VISUAL_SCALE\)/,
    );
  });

  it("keeps every procedural late-era Hall free of ground-treatment geometry", () => {
    const procedural = ERA_SEQUENCE.filter(
      (era) =>
        resolveEraTownHall(era.id, ERA_SEQUENCE[0]?.id ?? "prehistoric").model?.kind !==
        "glb",
    );
    expect(procedural.length, "procedural Hall fallback population").toBeGreaterThanOrEqual(
      1,
    );
    for (const era of procedural) {
      const fallback = buildEraTownHallFallback(era.id, TOWN_HALL_FOOTPRINT);
      const meshes: THREE.Mesh[] = [];
      fallback.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          meshes.push(object as THREE.Mesh);
        }
      });
      expect(meshes.length, `${era.id} Hall structure floor`).toBeGreaterThanOrEqual(3);
      expect(fallback.userData.nonCollidingGroundTreatment, era.id).toBeUndefined();
      for (const mesh of meshes) {
        expect(mesh.name, `${era.id} carries Hall background geometry`).not.toMatch(
          GROUND_NAME,
        );
        expect(mesh.userData.terrainSurface, `${era.id}/${mesh.name}`).not.toBe(true);
        expect(
          mesh.userData.nonCollidingGroundTreatment,
          `${era.id}/${mesh.name}`,
        ).not.toBe(true);
      }
      const bounds = new THREE.Box3().setFromObject(fallback);
      expect(bounds.min.y, `${era.id} Hall floats above natural terrain`).toBeCloseTo(0, 5);
    }
  });

  it("recognizes the plaza/background mutations it forbids", () => {
    expect(hallMountsGround('import { buildTownHallPlaza } from "./TownHallPlaza";')).toBe(
      true,
    );
    expect(hallMountsGround("<primitive object={plaza} />")).toBe(true);
    expect(GROUND_NAME.test("cyberpunk-hall-background")).toBe(true);
  });
});
