import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DECK = join(ROOT, "apps", "web", "public", "presenter-deck");
const DEMO_STYLES = join(ROOT, "apps", "web", "src", "demo");
const SOURCE_DECK = join(
  ROOT,
  "docs",
  "design-refs",
  "presenter-deck",
  "Color_scheme_lightened (2).pptx",
);
const OWNER_DECK_PALETTE = {
  surface: "#3A4674",
  ink: "#FFFFFF",
  support: "#CFD6EE",
  blue: "#46538A",
  mauve: "#675D83",
  orange: "#FF8A66",
  dataBlue: "#5C6899",
  demoMauve: "#5A5171",
} as const;
const LIGHTENED_PALETTE = {
  "--presentation-surface": "#F2F4FB",
  "--presentation-ink": "#1B2358",
  "--presentation-support": "#4A5387",
  "--presentation-emphasis": "#4B3FBF",
  "--presentation-accent-blue": "#DDE4F7",
  "--presentation-data-blue": "#CBD2EA",
  "--presentation-accent-mauve": "#DFD0DD",
  "--presentation-accent-blush": "#F1E0E4",
  "--presentation-detail": "#8E97C8",
} as const;
const manifest = JSON.parse(readFileSync(join(PUBLIC_DECK, "slides.json"), "utf8")) as {
  source: string;
  slideCount: number;
  width: number;
  height: number;
  slides: readonly {
    index: number;
    src: string;
    title: string;
    alt: string;
  }[];
};

function pngSize(path: string): { width: number; height: number } {
  const png = readFileSync(path);
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

function pngColors(path: string): Map<string, number> {
  const { data } = PNG.sync.read(readFileSync(path));
  const colors = new Map<string, number>();
  for (let offset = 0; offset < data.length; offset += 4) {
    const color = `#${Buffer.from(data.subarray(offset, offset + 3))
      .toString("hex")
      .toUpperCase()}`;
    colors.set(color, (colors.get(color) ?? 0) + 1);
  }
  return colors;
}

describe("owner presenter deck assets", () => {
  it("derives one exact four-slide population from metadata and disk", () => {
    const files = readdirSync(PUBLIC_DECK).sort();
    expect(files).toEqual([
      "slide-01.png",
      "slide-02.png",
      "slide-03.png",
      "slide-04.png",
      "slides.json",
    ]);
    expect(manifest.slideCount).toBe(4);
    expect(manifest.slides).toHaveLength(manifest.slideCount);
    expect(manifest.slides.map((slide) => slide.index)).toEqual([1, 2, 3, 4]);
    expect(
      manifest.slides.map((slide) => slide.src.replace("/presenter-deck/", "")),
    ).toEqual(files.filter((file) => file.endsWith(".png")));
  });

  it("keeps every browser export at the reference deck's exact 1600 by 900", () => {
    expect({ width: manifest.width, height: manifest.height }).toEqual({
      width: 1600,
      height: 900,
    });
    for (const slide of manifest.slides) {
      expect(
        pngSize(join(PUBLIC_DECK, slide.src.replace("/presenter-deck/", ""))),
        slide.src,
      ).toEqual({ width: manifest.width, height: manifest.height });
      expect(slide.title.length).toBeGreaterThan(0);
      expect(slide.alt.length).toBeGreaterThan(20);
    }
  });

  it("uses the owner deck's dominant surface and required visual roles on every slide", () => {
    const requiredRoles = [
      ["surface", "ink", "support", "blue", "mauve"],
      ["surface", "ink", "support", "orange", "dataBlue"],
      ["surface", "ink", "support", "blue", "orange"],
      ["surface", "ink", "support", "demoMauve"],
    ] as const;

    for (const [at, slide] of manifest.slides.entries()) {
      const colors = pngColors(
        join(PUBLIC_DECK, slide.src.replace("/presenter-deck/", "")),
      );
      expect(
        colors.get(OWNER_DECK_PALETTE.surface) ?? 0,
        `${slide.src} is not overwhelmingly the owner deck's surface`,
      ).toBeGreaterThan(manifest.width * manifest.height * 0.7);
      const roles = requiredRoles[at];
      expect(roles, `${slide.src} has no declared semantic role census`).toBeDefined();
      for (const role of roles ?? []) {
        expect(
          colors.get(OWNER_DECK_PALETTE[role]) ?? 0,
          `${slide.src} has no ${role}`,
        ).toBeGreaterThan(20);
      }
    }
  });

  it("keeps the named PowerPoint source and its four slide records", () => {
    expect(manifest.source).toBe("Color_scheme_lightened (2).pptx");
    const pptx = readFileSync(SOURCE_DECK);
    expect(pptx.subarray(0, 2).toString()).toBe("PK");
    const names = new Set(
      [...pptx.toString("latin1").matchAll(/ppt\/slides\/slide(\d+)\.xml/g)].map((match) =>
        Number(match[1]),
      ),
    );
    expect([...names].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("centralizes the exact palette and leaves no literal or gradient in presentation chrome", () => {
    const palettePath = join(DEMO_STYLES, "presenter-palette.css");
    expect(existsSync(palettePath), "the semantic presentation palette is missing").toBe(
      true,
    );
    if (!existsSync(palettePath)) {
      return;
    }
    const palette = readFileSync(palettePath, "utf8");
    for (const [token, color] of Object.entries(LIGHTENED_PALETTE)) {
      expect(palette.toUpperCase()).toContain(`${token}: ${color};`.toUpperCase());
    }

    for (const filename of ["presenter-deck.css", "presenter-shell.css"]) {
      const css = readFileSync(join(DEMO_STYLES, filename), "utf8");
      expect(css, filename).not.toMatch(/#[\da-f]{3,8}\b/i);
      expect(css, filename).not.toMatch(/linear-gradient/i);
    }
  });

  it("renders the exports directly rather than redrawing or delegating them", () => {
    const source = readFileSync(
      join(ROOT, "apps", "web", "src", "demo", "PresenterDeck.tsx"),
      "utf8",
    );
    const css = readFileSync(
      join(ROOT, "apps", "web", "src", "demo", "presenter-deck.css"),
      "utf8",
    );
    expect(source).toContain("src={slide.src}");
    expect(source).not.toMatch(/iframe|office\.com|powerpoint/i);
    expect(source).not.toMatch(/autoplay|setInterval|setTimeout/);
    expect(css).toContain("object-fit: contain");
    expect(css.match(/background: var\(--presentation-surface\);/g)).toHaveLength(2);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
