import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { islandManifest } from "./islandManifest";

const ROOT = process.cwd();
const CONSUMER = readFileSync(
  join(ROOT, "apps/web/src/archipelago/IslandFromManifest.tsx"),
  "utf8",
);
const MANIFEST = readFileSync(
  join(ROOT, "apps/web/src/archipelago/islandManifest.ts"),
  "utf8",
);
const ARCHIPELAGO_SOURCES = readdirSync(join(ROOT, "apps/web/src/archipelago"))
  .filter((file) => /\.[jt]sx?$/.test(file) && !file.includes(".test."))
  .map((file) => readFileSync(join(ROOT, "apps/web/src/archipelago", file), "utf8"))
  .join("\n");

/**
 * A URL registry may be eager; model BYTES may not. Vite's `?url` glob emits short
 * hashed strings, while `useGLTF(url)` is the network/decode boundary. The population
 * is every era manifest row (floored at ten), and the one consumer must request only
 * the era it was handed.
 */
describe("island model bytes load on demand", () => {
  it("keeps all era rows as URL strings and has exactly one selected-era loader", () => {
    expect(islandManifest().length).toBeGreaterThanOrEqual(10);
    expect(MANIFEST).toContain('query: "?url"');
    expect(MANIFEST).toContain('import: "default"');

    expect(CONSUMER.match(/useGLTF\(url\)/g)).toHaveLength(1);
    expect(CONSUMER).toContain("islandVisual(eraId)");
    expect(CONSUMER).not.toContain("useGLTF.preload");
    expect(CONSUMER).not.toMatch(/islandManifest\(\)\.(map|forEach)/);
  });

  it("does not hide an eager all-island preload in another archipelago module", () => {
    expect(ARCHIPELAGO_SOURCES).not.toMatch(/useGLTF\.preload\s*\(/);
    expect(ARCHIPELAGO_SOURCES.match(/useGLTF\(url\)/g)).toHaveLength(1);
  });
});
