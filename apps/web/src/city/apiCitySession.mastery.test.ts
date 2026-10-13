import { describe, expect, it, vi } from "vitest";
import { createApiCitySession } from "./apiCitySession";
import { MOCK_CITY_LOAD } from "./mockCity";

describe("the signed-in city mirrors a confirmed mastery receipt without a second stage write", () => {
  it("posts the CFU stage, then treats practice completion as already atomic server-side", async () => {
    const saveLessonStage = vi.fn(async () => true);
    const save = vi.fn(async () => undefined);
    const session = createApiCitySession({
      studentId: "11111111-1111-4111-8111-111111111111",
      load: async () => MOCK_CITY_LOAD,
      save,
      saveLessonStage,
      debounceMs: 60_000,
    });

    await session.markLessonTaught("NUM.F");
    expect(saveLessonStage).toHaveBeenCalledWith("NUM.F", "practice");

    saveLessonStage.mockClear();
    await session.advanceMasteryDev("NUM.F", 3);

    expect(saveLessonStage).not.toHaveBeenCalled();
    expect(
      (await session.load()).node_states.find((state) => state.node_id === "NUM.F"),
    ).toMatchObject({ mastery: 3, lesson_stage: "done" });

    await session.flush();
  });
});
