import type { StudentNodeState, UUID } from "@cr/state-schema";
import { describe, expect, it, vi } from "vitest";

import { createApiCitySession } from "./apiCitySession";
import type { CityLoad } from "./types";

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;

function city(mastery: 0 | 3): CityLoad {
  const state: StudentNodeState = {
    student_id: STUDENT,
    node_id: "NUM.S",
    placement_estimate: mastery,
    mastery,
    mastery_updated_at: mastery === 0 ? null : "2026-08-13T23:00:00.000Z",
    completion_status: mastery === 0 ? "in_progress" : "complete",
    lesson_stage: mastery === 0 ? "not_started" : "done",
    last_practiced_at: null,
  };
  return { node_states: [state], neighborhood_state: null };
}

describe("account city session canonical rehydrate", () => {
  it("retries its rejected hydration after the shared account reader is invalidated", async () => {
    let unavailable = true;
    const load = vi.fn(async () => {
      if (unavailable) {
        throw new Error("city unavailable");
      }
      return city(3);
    });
    const session = createApiCitySession({
      studentId: STUDENT,
      load,
      save: async () => undefined,
    });

    await expect(session.load()).rejects.toThrow("city unavailable");
    unavailable = false;

    const recovered = await session.load();
    expect(recovered.node_states.find((state) => state.node_id === "NUM.S")).toMatchObject({
      mastery: 3,
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("replaces the stale read model with the finalized learning row without writing it back", async () => {
    const save = vi.fn(async () => undefined);
    const session = createApiCitySession({
      studentId: STUDENT,
      load: async () => city(0),
      save,
    });

    expect((await session.load()).node_states[0]?.mastery).toBe(0);
    await session.rehydrate(city(3));

    const canonical = await session.load();
    expect(canonical.node_states[0]).toMatchObject({
      node_id: "NUM.S",
      placement_estimate: 3,
      mastery: 3,
      completion_status: "complete",
    });
    expect(save).not.toHaveBeenCalled();
  });
});
