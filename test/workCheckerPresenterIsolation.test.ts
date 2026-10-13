import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => {
  const absolute = join(ROOT, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
};

const PRESENTER_SOURCES = [
  "apps/web/src/demo/PresenterShell.tsx",
  "apps/web/src/demo/PresenterWorkFixture.tsx",
];
const ORDINARY_SOURCES = [
  "apps/web/src/lessons/LessonPractice.tsx",
  "apps/web/src/work-upload/WorkChecker.tsx",
  "apps/web/src/work-upload/store.ts",
  "apps/web/src/work-upload/api.ts",
  "apps/web/src/work-upload/parseClient.ts",
];

describe("Presenter fixture and ordinary Work Checker isolation", () => {
  it("keeps the deterministic fixture entirely inside Presenter production sources", () => {
    const presenter = PRESENTER_SOURCES.map(read).join("\n");
    const fixture = read("apps/web/src/demo/PresenterWorkFixture.tsx");
    expect(presenter).toContain("DEMO_WORK_TRANSCRIPTION");
    expect(presenter).toContain("DEMO_WORK_CORRECTION");
    expect(presenter).toContain("DEMO_ANALYSIS_DELAY_MS = 2_000");
    expect(presenter).toContain('accept="image/*"');
    expect(presenter).toContain("URL.createObjectURL");
    for (const forbidden of [
      "createStubWorkParseClient",
      "createWorkParseClient",
      "createHttpWorkParseClient",
      "InMemoryWorkUploadStore",
      "WorkChecker",
      "work-upload/parse",
      "fetch(",
    ]) {
      expect(
        presenter,
        `${forbidden} joined the zero-network Presenter fixture`,
      ).not.toContain(forbidden);
    }
    for (const persisted of ["localStorage", "sessionStorage", "indexedDB"]) {
      expect(fixture, `${persisted} persisted the selected Presenter photo`).not.toContain(
        persisted,
      );
    }
  });

  it("keeps every fixed Presenter diagnosis out of the ordinary account path", () => {
    const ordinary = ORDINARY_SOURCES.map(read).join("\n");
    expect(ordinary).toContain("createPresignedWorkUploadStore");
    expect(ordinary).toContain("createHttpWorkParseClient");
    for (const forbidden of [
      "PresenterWorkFixture",
      "DEMO_WORK_TRANSCRIPTION",
      "DEMO_WORK_CORRECTION",
      "P - l = w",
      "58 - 18 = w = 40",
    ]) {
      expect(ordinary, `${forbidden} leaked into the ordinary Work Checker`).not.toContain(
        forbidden,
      );
    }
  });

  it("names both sides of the isolation boundary so neither population can disappear", () => {
    expect(PRESENTER_SOURCES).toHaveLength(2);
    expect(ORDINARY_SOURCES.length).toBeGreaterThanOrEqual(5);
    for (const path of [...PRESENTER_SOURCES, ...ORDINARY_SOURCES]) {
      expect(read(path).length, `${path} is empty`).toBeGreaterThan(100);
    }
  });
});
