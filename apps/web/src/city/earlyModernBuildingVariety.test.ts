import { getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { resolveBuildingModel, type ResolvedBuildingModel } from "./buildingAssets";
import { footprintFor } from "./worldLayout";

type VariantAwareModel = ResolvedBuildingModel & { readonly variantId?: string };

function renderedIdentity(nodeId: string): string {
  const model = resolveBuildingModel(nodeId, "built") as VariantAwareModel;
  const footprint = footprintFor(nodeId);
  return (
    model.url ??
    model.variantId ??
    `${model.kind}:shared-neutral:${footprint.w}x${footprint.d}`
  );
}

describe("Early Modern gameplay buildings keep distinct rendered identities", () => {
  it("derives the full Era 6 population and refuses shared neutral-shell collapse", () => {
    const nodes = getEraNodes("renaissance");
    expect(nodes).toEqual(["GEO.1", "GEO.2", "CG.1", "POL.6", "POL.7", "RAT.5"]);

    const identities = nodes.map((nodeId) => [nodeId, renderedIdentity(nodeId)] as const);
    expect(identities).toHaveLength(6);
    expect(
      new Set(identities.map(([, identity]) => identity)).size,
      `Era 6 resolved to ${JSON.stringify(identities)}`,
    ).toBe(6);
  });
});
