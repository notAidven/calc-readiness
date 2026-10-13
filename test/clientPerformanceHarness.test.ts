import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "scripts/measure-client-memory.mjs"),
  "utf8",
);

function assertCompleteDiagnosticExit(walk: string) {
  const crisis = walk.indexOf('checkpoint("06-crisis-open")');
  const entered = walk.indexOf('checkpoint("07-diagnostic-open")');
  const exitControl = walk.indexOf('domClick({ text: "Back to city" })');
  const exited = walk.indexOf('checkpoint("08-diagnostic-exit")');

  expect(crisis).toBeGreaterThan(0);
  expect(entered).toBeGreaterThan(crisis);
  expect(exitControl).toBeGreaterThan(entered);
  expect(exited).toBeGreaterThan(exitControl);
  expect(walk).toContain("the diagnostic opened but exposed no Back to city exit");
}

describe("the full client performance walk", () => {
  it("measures diagnostic entry and exit, after the crisis it was asked to cover", () => {
    assertCompleteDiagnosticExit(source);
  });

  it.each([
    [
      "the exit checkpoint is removed",
      source.replace('await checkpoint("08-diagnostic-exit");', ""),
    ],
    [
      "the exit control silently disappears",
      source.replace('domClick({ text: "Back to city" })', "Promise.resolve(true)"),
    ],
  ])("fails when %s", (_defect, injectedSource) => {
    expect(() => assertCompleteDiagnosticExit(injectedSource)).toThrow();
  });
});
