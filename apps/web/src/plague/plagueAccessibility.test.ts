import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = process.cwd().endsWith(join("apps", "web"))
  ? process.cwd()
  : join(process.cwd(), "apps", "web");
const CSS = readFileSync(join(WEB_ROOT, "src", "plague", "plague.css"), "utf8");

describe("the Plague DOM remains the complete accessible surface", () => {
  it("keeps every action at the shared 44px target floor", () => {
    expect(CSS).toMatch(
      /\.pl-care-return,[\s\S]*?\.pl-care-actions button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/,
    );
  });

  it("poses the same facts under system and in-game reduced motion", () => {
    expect(CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(CSS).toContain('.city-surface[data-reduced-motion="true"] .pl-care-shell');
    const reduced = CSS.match(/animation:\s*none;/g) ?? [];
    const transitions = CSS.match(/transition:\s*none;/g) ?? [];
    expect(reduced).toHaveLength(2);
    expect(transitions).toHaveLength(2);
  });

  it("defines non-color shape changes for every live node and route status", () => {
    for (const selector of [
      '[data-status="infected"] .pl-network__mark',
      '[data-status="exposed"] .pl-network__mark',
      '[data-status="cared"] .pl-network__mark',
      '[data-status="quarantined"] .pl-route-line',
      '[data-status="carried"] .pl-route-line',
    ]) {
      expect(CSS, selector).toContain(selector);
    }
    expect(CSS).toContain("transform: rotate(45deg)");
    expect(CSS).toContain("border-style: dashed");
    expect(CSS).toContain("border-bottom:");
  });
});
