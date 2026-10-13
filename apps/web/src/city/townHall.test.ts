import { ERA_SEQUENCE } from "@cr/skill-graph";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as townHallModule from "./townHall";
import {
  DEFAULT_TOWN_HALL_DOMAIN,
  hasAuthoredEraTownHall,
  INTERLEAVED_PRACTICE_MIN_COMPLETED,
  isTownHall,
  resolveEraTownHall,
  resolveTownHallModel,
  TOWN_HALL_CENTER_TRANSFORM,
  TOWN_HALL_DESCRIPTORS,
  TOWN_HALL_FOOTPRINT,
  TOWN_HALL_ID,
  TOWN_HALL_STAGES,
  townHallModelUrls,
} from "./townHall";
import {
  DEFAULT_FOOTPRINT,
  footprintCells,
  footprintFor,
  transformCenter,
} from "./worldLayout";

const TOWN_HALL_COMPONENT_SOURCES = import.meta.glob("./three/TownHall.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const TOWN_HALL_PRELOAD_MODULES = import.meta.glob("./three/townHallPreload.ts", {
  eager: true,
}) as Record<
  string,
  {
    useTownHallPreload?: (
      modelUrl: string | null,
      preload: (url: string) => unknown,
    ) => void;
  }
>;

function scopedPreloadUrls(): (modelUrl: string | null) => string[] {
  const candidate = (
    townHallModule as typeof townHallModule & {
      townHallPreloadUrls?: (modelUrl: string | null) => string[];
    }
  ).townHallPreloadUrls;
  expect(candidate, "Town Hall exports its scoped preload decision").toBeTypeOf("function");
  return candidate as NonNullable<typeof candidate>;
}

function scopedPreloadHook(): (
  modelUrl: string | null,
  preload: (url: string) => unknown,
) => void {
  const modules = Object.values(TOWN_HALL_PRELOAD_MODULES);
  expect(modules, "one Town Hall preload lifecycle module").toHaveLength(1);
  const candidate = modules[0]?.useTownHallPreload;
  expect(
    candidate,
    "Town Hall exports its preload hook for lifecycle instrumentation",
  ).toBeTypeOf("function");
  return candidate as NonNullable<typeof candidate>;
}

describe("Town Hall — a non-skill hub, modelled as its own concept", () => {
  it("has a sentinel id that is NOT a NUM.* skill node", () => {
    expect(isTownHall(TOWN_HALL_ID)).toBe(true);
    expect(isTownHall("NUM.S")).toBe(false);
    expect(TOWN_HALL_ID.startsWith("NUM.")).toBe(false);
  });

  it("uses a REGISTERED 3×2 footprint (footprintFor resolves to it, not the default)", () => {
    // D-TH6 (updated 2026-07-26): a 3×2 footprint, wider than deep to match the model's
    // ~1.25 x:z aspect. It is REGISTERED in NODE_FOOTPRINTS under TOWN_HALL_ID (no longer
    // the generic DEFAULT_FOOTPRINT fallback), and the two definitions must stay equal —
    // this guards against worldLayout's entry and TOWN_HALL_FOOTPRINT drifting apart.
    expect(TOWN_HALL_FOOTPRINT).toEqual({ w: 3, d: 2 });
    expect(TOWN_HALL_FOOTPRINT).not.toEqual(DEFAULT_FOOTPRINT);
    expect(footprintFor(TOWN_HALL_ID)).toEqual(TOWN_HALL_FOOTPRINT);
    expect(footprintFor(TOWN_HALL_ID)).not.toEqual(DEFAULT_FOOTPRINT);
  });

  it("seats its 3×2 footprint as near the origin as the grid allows (Z centred, X leans +2u east)", () => {
    // The hall is pre-seeded (design 2026-07-26). snapToCell seats the 3×2 under the
    // origin at {col:-1,row:-1}. Even DEPTH centres on Z (z=0); the odd WIDTH cannot
    // centre on X, so the footprint centre lands at x=+2 (~2u east). It covers 6 cells.
    expect(TOWN_HALL_CENTER_TRANSFORM).toEqual({ col: -1, row: -1, rot: 0 });
    expect(transformCenter(TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_FOOTPRINT)).toEqual({
      x: 2,
      z: 0,
    });
    expect(
      new Set(footprintCells(TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_FOOTPRINT)),
    ).toEqual(new Set(["-1,-1", "0,-1", "1,-1", "-1,0", "0,0", "1,0"]));
  });

  it("offers interleaved practice at the 2-skill structural floor (D-TH3)", () => {
    expect(INTERLEAVED_PRACTICE_MIN_COMPLETED).toBe(2);
  });

  it("exports no domain-to-drill mapping, because the drill is era-scoped", () => {
    // `townHallDrillDomainId` lower-cased a `DomainId` into a `LESSON_DOMAINS` id while
    // the hub's drill was domain-scoped. The drill now pools over the ERA, and no
    // replacement mapping may exist: INV-ERA-5 forbids deriving an era from a domain,
    // and a domain can sit in three eras, so no such function could be correct.
    // `CitySurface` passes the era it already holds for D-ERA29's dressing subtitles.
    const exported = townHallModule as Record<string, unknown>;
    expect(Object.keys(exported)).not.toContain("townHallDrillDomainId");
    expect(
      Object.keys(exported).filter((name) => /drill/i.test(name)),
      "no export in townHall.ts resolves a drill scope",
    ).toEqual([]);
    // A floor: the census above is only meaningful over a module that exports things.
    expect(Object.keys(exported).length).toBeGreaterThanOrEqual(10);
  });
});

describe("Town Hall model registry (D1 skin + per-era re-themes, separate from skills)", () => {
  /**
   * EIGHT: era one's `[site, construction, built]` plus eras two through five and seven's finished
   * re-themes. The glob makes this a real count, so a deleted/renamed GLB fails rather than
   * silently borrowing era one. Later hubs commit only `built`, because D-TH4 was reversed;
   * their source-authored early phases are digest-pinned by their exporters.
   */
  it("registers exactly eleven distinct, non-empty stage GLB urls", () => {
    const urls = townHallModelUrls();
    expect(urls).toHaveLength(11);
    expect(new Set(urls).size).toBe(11);
    for (const url of urls) {
      expect(url.length).toBeGreaterThan(0);
    }
  });

  it("resolves a GLB render descriptor for every construction stage on D1", () => {
    for (const stage of TOWN_HALL_STAGES) {
      const resolved = resolveTownHallModel(stage, DEFAULT_TOWN_HALL_DOMAIN);
      expect(resolved, stage).not.toBeNull();
      expect(resolved?.kind).toBe("glb");
      expect(resolved?.node_id).toBe(TOWN_HALL_ID);
      expect(resolved?.stage).toBe(stage);
      expect((resolved?.url ?? "").length).toBeGreaterThan(0);
    }
    // The three stages are distinct authored files.
    const urls = TOWN_HALL_STAGES.map(
      (stage) => resolveTownHallModel(stage, DEFAULT_TOWN_HALL_DOMAIN)?.url,
    );
    expect(new Set(urls).size).toBe(3);
  });

  it("has a D1 descriptor with three ordered stage models and a label", () => {
    const descriptor = TOWN_HALL_DESCRIPTORS.D1;
    expect(descriptor).toBeDefined();
    expect(descriptor?.stage_models).toHaveLength(3);
    expect(descriptor?.label.length).toBeGreaterThan(0);
  });

  it("returns null for an island with no authored Town Hall skin", () => {
    // D2–D10 are not authored yet (MVP is D1-only); an unknown island resolves to null.
    expect(resolveTownHallModel("built", "D2")).toBeNull();
  });

  it("preloads only the showing hall, except D1's real ceremony stage family", () => {
    const preloadUrls = scopedPreloadUrls();
    const d1Stages = TOWN_HALL_STAGES.map(
      (stage) => resolveTownHallModel(stage, DEFAULT_TOWN_HALL_DOMAIN)?.url,
    ).filter((url): url is string => Boolean(url));
    expect(d1Stages).toHaveLength(3);

    // After the eras 1/2 artwork swap (2026-08-20), `neolithic` is the era whose finished
    // hall basename is the plain `townhall-built.glb` — the D1 ceremony's own `built` file —
    // so it is `neolithic`, not `prehistoric`, that warms the whole three-file family.
    const neolithic = resolveEraTownHall("neolithic", "prehistoric").model;
    expect(preloadUrls(neolithic?.url ?? null)).toEqual(d1Stages);

    for (const eraId of [
      "prehistoric",
      "bronze_age",
      "classical",
      "medieval",
      "industrial",
      "atomic_age",
      "information_age",
      "cyberpunk",
    ] as const) {
      const model = resolveEraTownHall(eraId, "prehistoric").model;
      expect(model?.url, `${eraId} resolves a built hall`).toBeTruthy();
      expect(preloadUrls(model?.url ?? null), eraId).toEqual([model?.url]);
    }

    const senate = resolveEraTownHall("classical", "prehistoric").model?.url;
    expect(senate).toBeTruthy();
    for (const eraId of [
      "prehistoric",
      "neolithic",
      "bronze_age",
      "renaissance",
    ] as const) {
      const model = resolveEraTownHall(eraId, "prehistoric").model;
      expect(
        preloadUrls(model?.url ?? null),
        `${eraId} does not warm Classical`,
      ).not.toContain(senate);
    }
  });

  it("uses a distinct era-specific procedural hall when a later GLB is absent", () => {
    const fallbackEras = ERA_SEQUENCE.map((era) => era.id).filter(
      (eraId) => !hasAuthoredEraTownHall(eraId),
    );
    expect(fallbackEras).toEqual(["renaissance"]);
    for (const eraId of fallbackEras) {
      const resolved = resolveEraTownHall(eraId, "prehistoric");
      expect(resolved.art, eraId).not.toBe("authored");
      expect(resolved.showing_era, `${eraId} borrows another era's silhouette`).toBe(eraId);
      expect(
        resolved.model,
        `${eraId} has no intentional fallback treatment`,
      ).toMatchObject({
        node_id: TOWN_HALL_ID,
        kind: "built",
        url: null,
      });
    }
  });

  it("wires the renderer to the scoped preload decision, never the global URL census", () => {
    const paths = Object.keys(TOWN_HALL_COMPONENT_SOURCES);
    expect(paths).toHaveLength(1);
    const source = TOWN_HALL_COMPONENT_SOURCES[paths[0] as string] as string;
    expect(source).toContain("useTownHallPreload(model?.url ?? null, useGLTF.preload)");
    expect(source).not.toContain("townHallModelUrls()");
  });

  it("does not repeat preloads for fresh descriptors with the same URL", () => {
    const usePreload = scopedPreloadHook();
    const classical = resolveEraTownHall("classical", "prehistoric").model?.url ?? null;
    const bronze = resolveEraTownHall("bronze_age", "prehistoric").model?.url ?? null;
    expect(classical).toBeTruthy();
    expect(bronze).toBeTruthy();
    expect(bronze).not.toBe(classical);

    const preload = vi.fn();
    const hook = renderHook(({ url }: { url: string | null }) => usePreload(url, preload), {
      initialProps: { url: classical },
    });
    expect(preload.mock.calls.map(([url]) => url)).toEqual([classical]);

    // A new descriptor would still produce this same primitive URL.
    hook.rerender({ url: `${classical}` });
    hook.rerender({ url: classical });
    expect(preload).toHaveBeenCalledTimes(1);

    hook.rerender({ url: bronze });
    expect(preload.mock.calls.map(([url]) => url)).toEqual([classical, bronze]);

    hook.rerender({ url: null });
    expect(preload).toHaveBeenCalledTimes(2);
  });
});
