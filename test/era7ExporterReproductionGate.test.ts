import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ROOT = resolveRepoRoot();
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  readonly scripts: Readonly<Record<string, string>>;
};
const WORKFLOW = readFileSync(join(ROOT, ".github/workflows/invariants.yml"), "utf8");
const COMMAND = "npm run check:era7-models";
const SCRIPT = "node scripts/export-era7-building-models.mjs --check";
const SAFETY_COMMAND = "npm run test:era7-exporter";
const SAFETY_SCRIPT = "vitest run --config vitest.era7-exporter.config.ts";
const SAFETY_TEST = "apps/web/src/city/era7ExporterSafety.test.ts";

function testBrowserJob(workflow: string): string {
  const start = workflow.indexOf("\n  test-browser:");
  const end = workflow.indexOf("\n  code-quality:", start);
  expect(start, "test-browser job exists").toBeGreaterThanOrEqual(0);
  expect(end, "test-browser job has a following boundary").toBeGreaterThan(start);
  return workflow.slice(start, end);
}

describe("the permanent Era 7 seeded-production reproduction gate", () => {
  it("is one named package gate and belongs to the full local check", () => {
    expect(MANIFEST.scripts["check:era7-models"]).toBe(SCRIPT);
    expect(MANIFEST.scripts.check).toContain("npm run check:era7-models");
  });

  it("runs exactly once in CI, serialized beside the browser installation it needs", () => {
    expect(
      WORKFLOW.match(new RegExp(COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
    ).toHaveLength(1);
    const job = testBrowserJob(WORKFLOW);
    expect(job).toContain(COMMAND);
    expect(job.indexOf(COMMAND)).toBeGreaterThan(job.indexOf("Install Chromium"));
    expect(job.indexOf(COMMAND)).toBeLessThan(job.indexOf("npm run test:browser"));
    expect(job).not.toContain("strategy:");
    expect(job).not.toContain("matrix:");
  });

  it("keeps the full browser suite running even when reproduction is red", () => {
    const job = testBrowserJob(WORKFLOW);
    const browserSteps = job
      .split(/\n(?= {6}- name:)/)
      .filter((step) => step.includes("npm run test:browser"));
    expect(browserSteps.length).toBeGreaterThanOrEqual(2);
    expect(browserSteps).toHaveLength(job.match(/npm run test:browser/g)?.length ?? 0);
    for (const step of browserSteps) {
      expect(step).toContain("!cancelled()");
    }
  });

  it("runs exporter safety once beside Chromium rather than inside the parallel unit pool", () => {
    expect(MANIFEST.scripts["test:era7-exporter"]).toBe(SAFETY_SCRIPT);
    expect(
      WORKFLOW.match(
        new RegExp(SAFETY_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      ),
    ).toHaveLength(1);
    const job = testBrowserJob(WORKFLOW);
    expect(job.indexOf(SAFETY_COMMAND)).toBeGreaterThan(job.indexOf("Install Chromium"));
    expect(job.indexOf(SAFETY_COMMAND)).toBeLessThan(job.indexOf("npm run test:browser"));

    const unitConfig = readFileSync(join(ROOT, "apps/web/vitest.config.ts"), "utf8");
    expect(unitConfig).toContain('"src/city/era7ExporterSafety.test.ts"');
    const safetyConfig = readFileSync(join(ROOT, "vitest.era7-exporter.config.ts"), "utf8");
    expect(safetyConfig).toContain(`"${SAFETY_TEST}"`);
    expect(safetyConfig).toContain('environment: "node"');
    expect(safetyConfig).toContain("maxWorkers: 1");
  });

  it("does not hide the expensive command inside a parallel unit test", () => {
    const unitJobStart = WORKFLOW.indexOf("\n  test-unit:");
    const unitJobEnd = WORKFLOW.indexOf("\n  test-browser:", unitJobStart);
    const unitJob = WORKFLOW.slice(unitJobStart, unitJobEnd);
    expect(unitJob).not.toContain(COMMAND);
    expect(unitJob).not.toContain(SCRIPT);
    expect(unitJob).not.toContain(SAFETY_COMMAND);
  });
});
