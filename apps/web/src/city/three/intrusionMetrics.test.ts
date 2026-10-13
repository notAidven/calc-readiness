import { describe, expect, it } from "vitest";

import {
  FRAMING_LENS,
  RELAY_GEOMETRY,
  relayPixels,
  REST_PX_PER_UNIT,
} from "./intrusionMetrics";

describe("the approved relay uses the shipped camera arithmetic", () => {
  it("keeps the independently measured framing lens and 6.590px rest scale", () => {
    expect(FRAMING_LENS).toBeCloseTo(1.4506, 4);
    expect(REST_PX_PER_UNIT).toBeCloseTo(6.59, 2);
  });

  it("derives the design package's panel and crest readings at every named dolly", () => {
    expect(relayPixels(RELAY_GEOMETRY.record.cellPitch, 0.5)).toBeCloseTo(9.9, 1);
    expect(relayPixels(RELAY_GEOMETRY.record.cellPitch)).toBeCloseTo(4.9, 1);
    expect(relayPixels(RELAY_GEOMETRY.record.cellPitch, 2.6)).toBeCloseTo(1.9, 1);
    expect(relayPixels(RELAY_GEOMETRY.crest.standingHeight, 2.6)).toBeCloseTo(3.8, 1);
  });

  it("keeps all A1-A5 dimensions positive and the panel inside an eight-unit frontage", () => {
    expect(RELAY_GEOMETRY.record.span).toBeLessThan(8);
    expect(RELAY_GEOMETRY.record.span).toBeGreaterThan(6);
    expect(
      RELAY_GEOMETRY.intake.baySpan * 3 + RELAY_GEOMETRY.intake.mullion * 2,
    ).toBeLessThan(RELAY_GEOMETRY.intake.span);
    expect(RELAY_GEOMETRY.copy.cartridgeSpan).toBeLessThan(RELAY_GEOMETRY.copy.baySpan);
  });
});
