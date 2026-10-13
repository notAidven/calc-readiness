import { describe, expect, it } from "vitest";

import {
  buildEventId,
  interleavedEventId,
  lessonCompleteEventId,
  practiceCompleteEventId,
} from "./events";

describe("event id builders — deterministic + replay-safe (§6)", () => {
  it("builds the documented shapes", () => {
    expect(lessonCompleteEventId("NUM.F")).toBe("lesson_complete:NUM.F");
    expect(interleavedEventId("sess-42")).toBe("interleaved:sess-42");
    expect(practiceCompleteEventId("evidence-42")).toBe("practice_complete:evidence-42");
  });

  it("is a pure function of its inputs (same inputs ⇒ same id)", () => {
    expect(lessonCompleteEventId("NUM.4")).toBe(lessonCompleteEventId("NUM.4"));
    expect(interleavedEventId("sess-9")).toBe(interleavedEventId("sess-9"));
    expect(practiceCompleteEventId("evidence-9")).toBe(
      practiceCompleteEventId("evidence-9"),
    );
  });

  it("rejects colon-bearing and empty parts", () => {
    // The delimiter rule is the generic builder's, so it is asserted there rather than
    // through a caller: `starEventId` used to carry these cases and left with row 3.
    expect(() => buildEventId("build", ["a:b"])).toThrow();
    expect(() => buildEventId("", ["x"])).toThrow();
    expect(() => buildEventId("build", [""])).toThrow();
    expect(() => lessonCompleteEventId("NUM:F")).toThrow();
  });
});
