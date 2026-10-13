import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..", "..");
const RETIRED_FILES = [
  "apps/web/src/city/ceremonyCrowd.ts",
  "apps/web/src/city/nextIsland.ts",
  "apps/web/src/city/three/CeremonyLayer.tsx",
  "apps/web/src/city/three/NextIsland.tsx",
  "apps/web/src/city/three/ceremonyFraming.ts",
] as const;
const RETIRED_EXECUTABLE_TOKENS = [
  "CeremonyLayer",
  "NewGround",
  "CeremonyCrowd",
  "CeremonyWorks",
  "NextIslandLand",
  "ceremonyGather",
  "ceremonySurvey",
  "ceremonyRebuild",
  "ceremonyRetheme",
  "ceremonyLandRadius",
  "ceremonyUnlock",
  "ceremonyCrossing",
  "ceremonyRisenOverride",
] as const;

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("the retired four-beat renderer has no live source or call graph", () => {
  it("removes every old renderer root rather than retaining zero-default props", () => {
    const tracked = new Set(
      execFileSync("git", ["ls-files", "apps/web/src/city"], {
        cwd: ROOT,
        encoding: "utf8",
      })
        .split("\n")
        .filter(Boolean),
    );
    for (const path of RETIRED_FILES) {
      expect(tracked.has(path), `${path} is still tracked`).toBe(false);
    }
    expect(RETIRED_FILES.length).toBeGreaterThanOrEqual(5);
  });

  it("scans a real production population and finds no dormant beat prop or mount", () => {
    const paths = execFileSync("git", ["ls-files", "apps/web/src/city"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter((path) => /\.(?:ts|tsx)$/.test(path) && !/\.test\./.test(path));
    expect(paths.length).toBeGreaterThanOrEqual(100);
    expect(paths).toContain("apps/web/src/city/three/CityCanvasHost.tsx");
    expect(paths).toContain("apps/web/src/city/three/CityScene.tsx");

    const offenders: string[] = [];
    for (const path of paths) {
      const code = withoutComments(readFileSync(join(ROOT, path), "utf8"));
      for (const token of RETIRED_EXECUTABLE_TOKENS) {
        if (new RegExp(`\\b${token}\\b`).test(code)) {
          offenders.push(`${path}: ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
