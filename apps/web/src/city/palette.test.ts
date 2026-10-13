import type { ConstructionState } from "@cr/game";
import { describe, expect, it } from "vitest";

import {
  archetypeAccentColor,
  bodyHueFor,
  buildingFaces,
  buildPalette,
  buildStageFor,
  darken,
  districtHue,
  faceTones,
  hexString,
  lighten,
  mix,
  PALETTE_VARIANTS,
} from "./palette";

function luminance(hex: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const GOLD = 0xffb703;
const ALL_STATES: ConstructionState[] = [
  "preview",
  "not_started",
  "teaching",
  "practice",
  "unfinished",
  "complete",
  "gold",
];

describe("color math", () => {
  it("formats hex strings for the DOM", () => {
    expect(hexString(GOLD)).toBe("#ffb703");
    expect(hexString(0x14202e)).toBe("#14202e");
  });

  it("mixes, lightens, and darkens predictably", () => {
    expect(mix(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(luminance(lighten(0x808080, 0.4))).toBeGreaterThan(luminance(0x808080));
    expect(luminance(darken(0x808080, 0.4))).toBeLessThan(luminance(0x808080));
  });
});

describe("fixed 3-tone lighting model", () => {
  it("renders one hue as top light > left mid > right dark", () => {
    const tones = faceTones(0xc98a5e);
    expect(luminance(tones.top)).toBeGreaterThan(luminance(tones.left));
    expect(luminance(tones.left)).toBeGreaterThan(luminance(tones.right));
  });

  it("resolves a full 3-tone face set for a D1 building", () => {
    const faces = buildingFaces("D1", "complete", "day");
    expect(faces.top).not.toBe(faces.left);
    expect(faces.left).not.toBe(faces.right);
  });
});

describe("warm palette LUT variants", () => {
  it("exposes exactly day, night, and colorblind", () => {
    expect(PALETTE_VARIANTS).toEqual(["day", "night", "colorblind"]);
  });

  it("shifts the environment between day and night without touching the model", () => {
    const day = buildPalette("day");
    const night = buildPalette("night");
    expect(day.ground).not.toBe(night.ground);
    expect(day.skyTop).not.toBe(night.skyTop);
    // Night is a darker environment overall.
    expect(luminance(night.ground)).toBeLessThan(luminance(day.ground));
  });

  it("keeps a dark HUD anchor and reserved gold across variants", () => {
    for (const variant of PALETTE_VARIANTS) {
      const palette = buildPalette(variant);
      expect(palette.hudAnchor).toBe(0x14202e);
      expect(palette.gold).toBe(GOLD);
    }
  });
});

describe("district hue families", () => {
  it("gives each district its own low-saturation hue", () => {
    expect(districtHue("D1", "day")).not.toBe(districtHue("D6", "day"));
    expect(districtHue("D6", "day")).not.toBe(districtHue("D9", "day"));
  });

  it("maps archetype accent tokens to warm trims, with a fallback", () => {
    expect(archetypeAccentColor("azure", "day")).not.toBe(
      archetypeAccentColor("amber", "day"),
    );
    // Unknown tokens fall back to the generic slate accent deterministically.
    expect(archetypeAccentColor("mystery", "day")).toBe(
      archetypeAccentColor("slate", "day"),
    );
  });
});

describe("build stages (3-step progression; mastery is never a gold building)", () => {
  it("maps construction states to the 3-step milestone build stages", () => {
    // Foundation: freshly placed OR mid-teaching both render a site.
    expect(buildStageFor("not_started")).toBe("site");
    expect(buildStageFor("teaching")).toBe("site");
    expect(buildStageFor("preview")).toBe("site");
    // Construction: in the practice set.
    expect(buildStageFor("practice")).toBe("construction");
    // Complete: the built variants collapse into one finished stage.
    expect(buildStageFor("complete")).toBe("built");
    expect(buildStageFor("gold")).toBe("built");
    expect(buildStageFor("unfinished")).toBe("built");
  });

  it("never paints a building gold at any construction stage", () => {
    for (const state of ALL_STATES) {
      expect(bodyHueFor("D1", state, "day")).not.toBe(GOLD);
    }
  });
});
