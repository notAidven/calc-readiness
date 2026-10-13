import { type CivicBuildingDefinition, civicCatalogueForEra } from "@cr/economy";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import * as civicModels from "./civicBuildings";
import {
  civicModelBasename,
  resolveCivicModel,
  resolveRestoredCivicModel,
} from "./civicBuildings";
import type { CityLoad } from "./types";

vi.mock("./three/CityCanvasHost", () => ({
  CityCanvasHost: ({
    placed = [],
    fallback,
  }: {
    placed?: readonly {
      readonly nodeId: string;
      readonly model: { readonly url: string | null } | null;
    }[];
    fallback: ReactNode;
  }) => (
    <div data-testid="scene-stub">
      {fallback}
      {placed.map((placement) => (
        <span
          key={placement.nodeId}
          data-testid={`scene-placement-${placement.nodeId}`}
          data-model-url={placement.model?.url ?? ""}
        />
      ))}
    </div>
  ),
}));

interface CivicOption {
  readonly row: CivicBuildingDefinition;
  readonly modelType: string;
  readonly builtModel: {
    readonly kind: string;
    readonly url: string | null;
  };
}

type CivicResolver = typeof resolveCivicModel;

function optionsForEra(): (
  eraId: EraId,
  resolver?: CivicResolver,
) => readonly CivicOption[] {
  const candidate = (
    civicModels as typeof civicModels & {
      civicOptionsForEra?: (
        eraId: EraId,
        resolver?: CivicResolver,
      ) => readonly CivicOption[];
    }
  ).civicOptionsForEra;
  expect(
    candidate,
    "the live catalogue exposes its capability-derived era adapter",
  ).toBeTypeOf("function");
  return candidate as NonNullable<typeof candidate>;
}

async function civicCardsFor(eraId: EraId): Promise<HTMLElement[]> {
  const user = userEvent.setup();
  const material = civicCatalogueForEra(eraId)[0]?.material ?? "material";
  render(
    <CitySurface
      enableCanvas={false}
      eraId={eraId}
      materialAvailable={100_000}
      materialLabel={material}
    />,
  );
  await user.click(await screen.findByRole("button", { name: "Build" }));
  await user.click(await screen.findByRole("tab", { name: /Civic/ }));
  const row = await screen.findByRole("list", { name: "Civic buildings to buy" });
  return within(row).getAllByRole("button");
}

describe("capability-derived current-era civic catalogue", () => {
  it("derives exactly the complete model-backed eras from sequence order", () => {
    const resolveOptions = optionsForEra();
    const backed = ERA_SEQUENCE.filter((era) => resolveOptions(era.id).length > 0);

    expect(backed.length).toBeGreaterThanOrEqual(4);
    expect(backed.map((era) => era.id)).toEqual([
      "prehistoric",
      "neolithic",
      "bronze_age",
      "classical",
      "medieval",
      "industrial",
      "atomic_age",
      "information_age",
      "cyberpunk",
    ]);
    expect(backed.filter((era) => era.id !== "prehistoric").length).toBeGreaterThanOrEqual(
      3,
    );

    for (const era of backed) {
      const options = resolveOptions(era.id);
      const catalogue = civicCatalogueForEra(era.id);
      expect(options, era.id).toHaveLength(4);
      expect(
        options.map((option) => option.row.id),
        era.id,
      ).toEqual(catalogue.map((row) => row.id));
      expect(new Set(options.map((option) => option.modelType)).size, era.id).toBe(4);
      expect(new Set(options.map((option) => option.builtModel.url)).size, era.id).toBe(4);
      expect(options.every((option) => option.builtModel.kind === "glb")).toBe(true);
      expect(options.every((option) => Boolean(option.builtModel.url))).toBe(true);
    }
  });

  it("fails a four-row era closed as a whole when one built model is unavailable", () => {
    const resolveOptions = optionsForEra();
    const missing = civicCatalogueForEra("bronze_age")[1] as CivicBuildingDefinition;
    const injected: CivicResolver = (typeId, stage) =>
      typeId === missing.id && (stage ?? "built") === "built"
        ? null
        : resolveCivicModel(typeId, stage);

    expect(resolveOptions("bronze_age", injected)).toEqual([]);
    expect(resolveOptions("bronze_age")).toHaveLength(4);
    expect(resolveRestoredCivicModel(missing.id, () => null)).toMatchObject({
      node_id: missing.id,
      kind: "built",
      url: null,
    });
  });
});

describe.each([
  "neolithic",
  "bronze_age",
  "classical",
  "medieval",
  "industrial",
  "atomic_age",
  "information_age",
  "cyberpunk",
] as const)("%s Civic tab", (eraId) => {
  it("shows exactly that era's four rows, names, material prices, and no era rail", async () => {
    const cards = await civicCardsFor(eraId);
    const expected = civicCatalogueForEra(eraId);
    const expectedIds = expected.map((row) => row.id);

    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.dataset.nodeId)).toEqual(expectedIds);
    for (const row of expected) {
      const card = await screen.findByTestId(`civic-card-${row.id}`);
      expect(card).toHaveTextContent(row.name);
      expect(card).toHaveTextContent(`${row.cost} ${row.material}`);
      expect(card).toHaveTextContent(`${row.footprint.width}×${row.footprint.depth} plot`);
    }

    const otherEraIds = ERA_SEQUENCE.filter((era) => era.id !== eraId).flatMap((era) =>
      civicCatalogueForEra(era.id).map((row) => row.id),
    );
    for (const id of otherEraIds) {
      expect(screen.queryByTestId(`civic-card-${id}`), id).toBeNull();
    }
    expect(screen.queryByRole("tablist", { name: "Era" })).toBeNull();
  });
});

it("restores a Bronze civic into the scene with its own built GLB URL", async () => {
  const placementId = "civic:bronze_age_terraced_fields:7";
  const load: CityLoad = {
    node_states: [],
    neighborhood_state: null,
    placements: [],
    civic: [{ nodeId: placementId, col: 3, row: -4, rot: 1 }],
  };

  render(<CitySurface eraId="bronze_age" loadCity={() => Promise.resolve(load)} />);

  const rendered = await screen.findByTestId(`scene-placement-${placementId}`);
  expect(rendered.getAttribute("data-model-url")).toMatch(
    /civic-bronze-age-terraced-fields-built\.glb/,
  );
});

it("restores all four Medieval civics into the scene with their own built GLB URLs", async () => {
  const rows = civicCatalogueForEra("medieval");
  const placements = rows.map((row, index) => ({
    nodeId: `civic:${row.id}:${index + 9}`,
    col: 5 + index * 3,
    row: -6,
    rot: index % 2,
  }));
  const load: CityLoad = {
    node_states: [],
    neighborhood_state: null,
    placements: [],
    civic: placements,
  };

  render(<CitySurface eraId="medieval" loadCity={() => Promise.resolve(load)} />);

  for (const [index, row] of rows.entries()) {
    const rendered = await screen.findByTestId(
      `scene-placement-${placements[index]?.nodeId}`,
    );
    expect(rendered.getAttribute("data-model-url"), row.id).toContain(
      civicModelBasename(row.id, "built"),
    );
  }
});

it("restores all four Industrial civics into the scene with their authored built GLBs", async () => {
  const rows = civicCatalogueForEra("industrial");
  const placements = rows.map((row, index) => ({
    nodeId: `civic:${row.id}:${index + 30}`,
    col: -9 + index * 3,
    row: 7,
    rot: index % 4,
  }));
  const load: CityLoad = {
    node_states: [],
    neighborhood_state: null,
    placements: [],
    civic: placements,
  };

  render(<CitySurface eraId="industrial" loadCity={() => Promise.resolve(load)} />);

  for (const [index, row] of rows.entries()) {
    const rendered = await screen.findByTestId(
      `scene-placement-${placements[index]?.nodeId}`,
    );
    expect(rendered.getAttribute("data-model-url"), row.id).toContain(
      civicModelBasename(row.id, "built"),
    );
  }
});
