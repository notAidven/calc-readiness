import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as buildingAssets from "../buildingAssets";

const PRELOAD_MODULES = import.meta.glob("./placedBuildingPreload.ts", {
  eager: true,
}) as Record<
  string,
  {
    placedBuildingPreloadUrls?: (
      nodeId: string,
      stage: "site" | "construction" | "built" | "advanced",
      activeUrl: string | null,
    ) => readonly string[];
    usePlacedBuildingPreload?: (
      nodeId: string,
      stage: "site" | "construction" | "built" | "advanced",
      activeUrl: string | null,
      preload: (url: string) => unknown,
    ) => void;
  }
>;

const PLACED_SOURCE = import.meta.glob("./PlacedBuilding.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function basename(url: string): string {
  return (url.split("?")[0] ?? url).split("/").pop() as string;
}

function preloadApi() {
  const nodeModelPreloadUrls = (
    buildingAssets as typeof buildingAssets & {
      nodeModelPreloadUrls?: (
        nodeId: string,
        stage: "site" | "construction" | "built" | "advanced",
      ) => readonly string[];
    }
  ).nodeModelPreloadUrls;
  expect(
    nodeModelPreloadUrls,
    "the skill registry exposes its stage-aware preload set",
  ).toBeTypeOf("function");

  const modules = Object.values(PRELOAD_MODULES);
  expect(modules, "one placed-building preload lifecycle module exists").toHaveLength(1);
  const placedBuildingPreloadUrls = modules[0]?.placedBuildingPreloadUrls;
  const usePlacedBuildingPreload = modules[0]?.usePlacedBuildingPreload;
  expect(placedBuildingPreloadUrls).toBeTypeOf("function");
  expect(usePlacedBuildingPreload).toBeTypeOf("function");
  return {
    nodeModelPreloadUrls: nodeModelPreloadUrls as NonNullable<typeof nodeModelPreloadUrls>,
    placedBuildingPreloadUrls: placedBuildingPreloadUrls as NonNullable<
      typeof placedBuildingPreloadUrls
    >,
    usePlacedBuildingPreload: usePlacedBuildingPreload as NonNullable<
      typeof usePlacedBuildingPreload
    >,
  };
}

describe("stage-aware placed skill preload", () => {
  it("warms only reachable present/future stages for every build state", () => {
    const { nodeModelPreloadUrls } = preloadApi();
    expect(nodeModelPreloadUrls("FUN.1", "site").map(basename)).toEqual([
      "fun-1-site.glb",
      "fun-1-construction.glb",
      "fun-1-built.glb",
    ]);
    expect(nodeModelPreloadUrls("FUN.1", "construction").map(basename)).toEqual([
      "fun-1-construction.glb",
      "fun-1-built.glb",
    ]);
    expect(nodeModelPreloadUrls("FUN.1", "built").map(basename)).toEqual([
      "fun-1-built.glb",
    ]);
    expect(nodeModelPreloadUrls("FUN.1", "advanced").map(basename)).toEqual([
      "fun-1-built.glb",
    ]);

    expect(nodeModelPreloadUrls("TRG.9", "construction").map(basename)).toEqual([
      "trg-9-construction.glb",
      "trg-9-built.glb",
    ]);
  });

  it("uses one active URL for a civic and no invented URL for an unmapped placement", () => {
    const { placedBuildingPreloadUrls } = preloadApi();
    const civic = "/models/civic-industrial-library-built.glb";
    expect(placedBuildingPreloadUrls("civic:industrial_library:4", "built", civic)).toEqual(
      [civic],
    );
    expect(placedBuildingPreloadUrls("NO.SUCH.NODE", "built", null)).toEqual([]);
  });

  it("calls each URL once across stable rerenders and forward stage transitions", () => {
    const { usePlacedBuildingPreload } = preloadApi();
    const preload = vi.fn();
    const hook = renderHook(
      ({ stage }: { stage: "site" | "construction" | "built" | "advanced" }) =>
        usePlacedBuildingPreload("FUN.1", stage, `/active-${stage}.glb`, preload),
      {
        initialProps: {
          stage: "site",
        } as { stage: "site" | "construction" | "built" | "advanced" },
      },
    );
    expect(preload.mock.calls.map(([url]) => basename(url))).toEqual([
      "fun-1-site.glb",
      "fun-1-construction.glb",
      "fun-1-built.glb",
    ]);

    hook.rerender({ stage: "site" });
    hook.rerender({ stage: "construction" });
    hook.rerender({ stage: "built" });
    hook.rerender({ stage: "advanced" });
    expect(preload.mock.calls.map(([url]) => basename(url))).toEqual([
      "fun-1-site.glb",
      "fun-1-construction.glb",
      "fun-1-built.glb",
    ]);
  });

  it("a restored built skill never asks for obsolete site or construction binaries", () => {
    const { usePlacedBuildingPreload } = preloadApi();
    const preload = vi.fn();
    const hook = renderHook(
      ({ activeUrl }: { activeUrl: string }) =>
        usePlacedBuildingPreload("FUN.1", "built", activeUrl, preload),
      { initialProps: { activeUrl: "/first/fun-1-built.glb" } },
    );
    hook.rerender({ activeUrl: `${"/first/fun-1-built.glb"}` });
    expect(preload.mock.calls.map(([url]) => basename(url))).toEqual(["fun-1-built.glb"]);
  });

  it("PlacedBuilding delegates to the scoped lifecycle instead of the all-stage census", () => {
    expect(Object.keys(PLACED_SOURCE)).toHaveLength(1);
    const source = Object.values(PLACED_SOURCE)[0] as string;
    expect(source).toContain("usePlacedBuildingPreload(");
    expect(source).not.toContain("const urls = nodeModelUrls(nodeId)");
  });
});
