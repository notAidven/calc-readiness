import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const BODY = "#C7A48E";
const BRICK = "#B1775A";
const STONE = "#D8CDB3";
const ROOF = "#596675";
const SUPERSEDED_PINK = "#D29F9F";

const repoRoot = resolveRepoRoot();
const canonicalDir = "output/imagegen/era-06-early-modern-building-briefs";
const canonicalImages = "docs/design-refs/era-06-building-concepts";

const files = {
  styleGuide: "docs/superpowers/specs/eras/era-06-early-modern/style-guide.md",
  civicGuide: "docs/superpowers/specs/eras/era-06-early-modern/civic-buildings.md",
  eraIndex: "docs/superpowers/specs/eras/README.md",
  paletteSpec: "docs/superpowers/specs/2026-07-30-era-palette-ladder.md",
  buildingReadme: "output/imagegen/era-06-early-modern-building-briefs/README.md",
  concepts: `${canonicalDir}/era06-early-modern-concepts.jsonl`,
  advisorDress: "apps/web/src/city/advisorDress.ts",
  advisorReferenceReadme: "docs/design-refs/advisor-wardrobe/README.md",
  plagueTones: "apps/web/src/city/three/plague-tones.ts",
  plagueCss: "apps/web/src/plague/plague.css",
  plagueGenerator: "tools/generate-winter-crisis-references.ps1",
  plagueRunSheet: "output/imagegen/era-06-plague-crisis-scenes/imagegen-run-sheet.jsonl",
  plagueArtBrief: "docs/superpowers/specs/2026-08-01-plague-crisis-art-brief.md",
  plagueReferenceReadme: "docs/superpowers/specs/crisis-reference-packs/plague/README.md",
  plagueImagegenReadme: "output/imagegen/era-06-plague-crisis-scenes/README.md",
} as const;

function source(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

const liveRoleFiles = [
  files.styleGuide,
  files.civicGuide,
  files.eraIndex,
  files.buildingReadme,
  files.concepts,
  files.advisorDress,
  files.advisorReferenceReadme,
  files.plagueArtBrief,
  files.plagueReferenceReadme,
  files.plagueImagegenReadme,
] as const;

const executablePaletteFiles = [
  files.plagueTones,
  files.plagueCss,
  files.plagueGenerator,
  files.plagueRunSheet,
] as const;

describe("Early Modern uses one live Northern palette everywhere", () => {
  it("states the selected body and principal roof accent in every live palette source", () => {
    expect(liveRoleFiles.length).toBeGreaterThanOrEqual(9);
    for (const path of [...liveRoleFiles, ...executablePaletteFiles]) {
      const text = source(path).toUpperCase();
      expect(text, `${path} should state the Early Modern body`).toContain(BODY);
      expect(text, `${path} should state the Early Modern roof accent`).toContain(ROOF);
    }
  });

  it("pins the runtime table, prototype CSS and generator to the selected live values", () => {
    const tones = source(files.plagueTones);
    expect(tones).toContain("BODY_STUCCO: 0xc7a48e");
    expect(tones).toContain("LEAD: 0x596675");

    const css = source(files.plagueCss);
    expect(css).toContain("--care-stucco: #c7a48e");
    expect(css).toContain("--care-lead: #596675");

    const generator = source(files.plagueGenerator);
    const eraSix = generator.match(/\$ERA6 = @\{([\s\S]*?)\n\}/)?.[1];
    expect(eraSix, "the generator should still declare $ERA6").toBeDefined();
    expect(eraSix).toContain('Body  = "#c7a48e"');
    expect(eraSix).toContain('Lead  = "#596675"');

    const runSheet = source(files.plagueRunSheet).toUpperCase();
    expect(runSheet).toContain(BODY);
    expect(runSheet).toContain(ROOF);
    expect(runSheet).not.toContain(SUPERSEDED_PINK);
  });

  it("keeps the runtime advisor on the same body and roof roles as the buildings", () => {
    const text = source(files.advisorDress);
    const row = text.match(/renaissance:\s*\{([\s\S]*?)\n\s*\},/)?.[1];
    expect(row, "advisorDress.ts should still contain the renaissance row").toBeDefined();
    expect(row).toContain(`garment: "${BODY}"`);
    expect(row).toContain(`overColour: "${BODY}"`);
    expect(row).toContain(`trim: "${ROOF}"`);
    expect(row).toContain(`accent: "${ROOF}"`);
  });

  it("gives every canonical rerender prompt all four material roles", () => {
    const rows = source(files.concepts)
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { out: string; size: string; prompt: string });

    expect(rows).toHaveLength(11);
    expect(new Set(rows.map((row) => row.out)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.size, row.out).toBe("1024x1024");
      expect(row.prompt, `${row.out}: body`).toContain(BODY);
      expect(row.prompt, `${row.out}: localized brick`).toContain(BRICK);
      expect(row.prompt, `${row.out}: dressed-stone trim`).toContain(STONE);
      expect(row.prompt, `${row.out}: slate/lead roof`).toContain(ROOF);
      expect(row.prompt, `${row.out}: no pink wall field`).toMatch(
        /no (?:dominant )?pink, rose or magenta wall fields?/i,
      );
      expect(row.prompt, `${row.out}: no terracotta roof`).toMatch(/no terracotta roofs?/i);
    }

    const pngs = readdirSync(join(repoRoot, canonicalImages))
      .filter((name) => name.endsWith(".png"))
      .sort();
    expect(pngs).toHaveLength(11);
    expect(pngs).toEqual(rows.map((row) => row.out).sort());
  });

  it("contains no live use of the superseded dusty-pink body", () => {
    const offenders = liveRoleFiles.filter((path) =>
      source(path).toUpperCase().includes(SUPERSEDED_PINK),
    );
    expect(offenders).toEqual([]);

    const history = source(files.paletteSpec);
    expect(history).toContain(SUPERSEDED_PINK);
    expect(
      history.match(new RegExp(`superseded[^\\n]*${SUPERSEDED_PINK}`, "i")),
      "the retained old hex is allowed only in an explicit superseded-history statement",
    ).not.toBeNull();
  });
});
