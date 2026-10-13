import { describe, expect, it } from "vitest";

import { getLessonShells, getNodesByScope, getProductNodes } from "./index";

describe("skill graph accessors", () => {
  it("reads the six-node, three-shell MVP from the registry", () => {
    expect(getNodesByScope("mvp")).toHaveLength(6);
    expect(getLessonShells("mvp")).toEqual(["L1", "L2", "L3"]);
  });

  it("reads the product scope without transcribing it", () => {
    // 2026-07-24 coverage expansion: 61 product nodes (6 mvp + 55 target) after
    // promoting 9 extended nodes, flipping TRG.6, and appending POL.8/TRG.9/
    // GEO.1/GEO.2. Was 48/31 before the expansion. The 2026-07-25 D2 QA pass
    // appended RAD.4 (variable radicands / sqrt(x^2)=|x| / even-root domain) on
    // its own shell L45, taking it to 62/45. Counts derive from the registry,
    // never transcribed.
    expect(getProductNodes()).toHaveLength(62);
    expect(getLessonShells("product")).toHaveLength(45);
  });
});
