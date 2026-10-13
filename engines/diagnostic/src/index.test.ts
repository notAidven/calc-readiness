import { describe, expect, it } from "vitest";

import { createMvpAssessmentBlueprint } from "./index";

describe("MVP assessment blueprint", () => {
  it("creates two fixed slots for each D1 MVP node", () => {
    const blueprint = createMvpAssessmentBlueprint();

    expect(blueprint.slots).toHaveLength(12);
    expect(new Set(blueprint.slots.map((slot) => slot.node_id))).toHaveLength(6);
    expect(blueprint.slots.filter((slot) => slot.difficulty === 2)).toHaveLength(6);
    expect(blueprint.slots.filter((slot) => slot.difficulty === 3)).toHaveLength(6);
  });
});
