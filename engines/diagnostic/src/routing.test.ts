import { describe, expect, it } from "vitest";

import { createD1MultistageSpec, getStage } from "./routing";

describe("createD1MultistageSpec", () => {
  it("derives stage node sets from the prereq graph", () => {
    const spec = createD1MultistageSpec();

    const routing = getStage(spec, spec.first_stage);
    expect(routing.role).toBe("routing");
    // routing stage samples every D1 node at medium difficulty
    expect(routing.slots).toHaveLength(6);
    expect(routing.slots.every((slot) => slot.difficulty === 2)).toBe(true);

    const up = getStage(spec, "H");
    expect(up.role).toBe("up");
    expect(up.slots.every((slot) => slot.difficulty === 3)).toBe(true);
    // higher-tier nodes are exactly the D1 nodes that have prerequisites
    expect(new Set(up.slots.map((slot) => slot.node_id))).toEqual(
      new Set(["NUM.2", "NUM.4", "NUM.5"]),
    );

    const down = getStage(spec, "E");
    expect(down.role).toBe("down");
    expect(down.slots.every((slot) => slot.difficulty === 1)).toBe(true);
    // root nodes are exactly the D1 nodes with no prerequisites
    expect(new Set(down.slots.map((slot) => slot.node_id))).toEqual(
      new Set(["NUM.S", "NUM.F", "NUM.3"]),
    );
  });

  it("routes up at/above the bar and down below it, then terminates", () => {
    const spec = createD1MultistageSpec(0.7);

    expect(spec.route("R", 0.7)).toBe("H");
    expect(spec.route("R", 1)).toBe("H");
    expect(spec.route("R", 0.69)).toBe("E");
    expect(spec.route("R", 0)).toBe("E");

    // second stage always terminates
    expect(spec.route("H", 1)).toBeNull();
    expect(spec.route("E", 0)).toBeNull();
  });

  it("throws on an unknown stage", () => {
    const spec = createD1MultistageSpec();
    expect(() => getStage(spec, "ZZZ")).toThrow(/unknown diagnostic stage/);
  });
});
