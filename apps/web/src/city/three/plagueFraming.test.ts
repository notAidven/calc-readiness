import { describe, expect, it } from "vitest";

import { eraCityLayout } from "../islandLand";
import { cityFrameFor } from "./CityScene";
import { PLAGUE_PANEL_CAP, PLAGUE_PANEL_GUTTER, plaguePanelReach } from "./plagueFraming";

const VIEW = { width: 1024, height: 580 } as const;
const LAYOUT = eraCityLayout("renaissance");

describe("the Plague frames the live city beside its right rail", () => {
  it("mirrors the stylesheet's panel width at the short review viewport", () => {
    expect(plaguePanelReach(VIEW)).toBe(PLAGUE_PANEL_CAP + PLAGUE_PANEL_GUTTER);
    expect(plaguePanelReach({ width: 390, height: 580 })).toBe(390);
  });

  it("moves the city left by the right rail's half-width without changing its scale rule", () => {
    const right = cityFrameFor({
      view: VIEW,
      layout: LAYOUT,
      fov: 32,
      winter: false,
      winterFitRadius: 20,
      crisisPanel: { side: "right", reach: plaguePanelReach(VIEW) },
    });
    const left = cityFrameFor({
      view: VIEW,
      layout: LAYOUT,
      fov: 32,
      winter: false,
      winterFitRadius: 20,
      crisisPanel: { side: "left", reach: plaguePanelReach(VIEW) },
    });

    expect(right).not.toBeNull();
    expect(left).not.toBeNull();
    expect(right?.offsetX).toBeCloseTo(-plaguePanelReach(VIEW) / 2, 6);
    expect(left?.offsetX).toBeCloseTo(plaguePanelReach(VIEW) / 2, 6);
    expect(right?.zoom).toBe(left?.zoom);
    expect(right?.zoom).toBeLessThan(1.5);
  });

  it("does not invent an off-screen side strip at phone width", () => {
    const phone = { width: 390, height: 580 } as const;
    const framed = cityFrameFor({
      view: phone,
      layout: LAYOUT,
      fov: 32,
      winter: false,
      winterFitRadius: 20,
      crisisPanel: { side: "right", reach: plaguePanelReach(phone) },
    });
    const ordinary = cityFrameFor({
      view: phone,
      layout: LAYOUT,
      fov: 32,
      winter: false,
      winterFitRadius: 20,
    });
    expect(framed).toEqual(ordinary);
  });
});
