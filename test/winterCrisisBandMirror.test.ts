import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE CRISIS CAMERA MIRRORS THE CRISIS PANEL'S WIDTH, AND THE MIRROR IS CHECKED.**
 *
 * While the Hard Winter is running, the city camera slides its frame sideways so the settlement
 * sits in the strip the side panel leaves free (`apps/web/src/city/three/winterFraming.ts`). To do
 * that it has to know how wide the panel is, and it cannot ask: the scene has no way to observe a
 * sibling DOM element, and reading one would make the camera depend on a layout pass. So
 * `crisisPanelReach` RE-STATES the widths `winter-in-city.css` sets.
 *
 * That duplication is the risk the design takes, and the failure it invites is silent: a width
 * retuned in the stylesheet and not in the camera leaves the framing sized for a panel that no
 * longer exists, so the island goes back behind the panel with every test still green. This file is
 * the tripwire. It reads both files as TEXT and requires each number to appear in both, which is
 * the whole of the coupling.
 *
 * It lives here rather than beside the camera because `apps/web` has no node types, so a test in
 * that project cannot open a file — and the alternatives measured worse: the stylesheet imported
 * with vite's `?raw` resolves to an EMPTY STRING under that project's `css: false`, which would
 * have made every assertion over it pass vacuously.
 *
 * ## AND THE WIDTH ITSELF HAS A THIRD READER NOW, WHICH IS NOT THIS FILE'S CLAIM
 *
 * `470px` is not a chosen number: it is the declare step's own content measured, plus the panel's
 * chrome (`winter-in-city.css` carries the derivation). What checks THAT is
 * `apps/web/src/city/three/crisisPanelFitsItsContent.browser.test.tsx`, which re-measures the
 * content in real Chromium and fails if the shipped width stops clearing it.
 *
 * The two files are deliberately not merged, because they catch different things and only one of
 * them can run here: this one fails when the stylesheet and the CAMERA disagree, and would still
 * pass if both were retuned to a width the content does not fit; that one fails when the width
 * and the CONTENT disagree, and would still pass if the camera were left behind. A retune needs
 * both to stay green.
 */

const repoRoot = resolveRepoRoot();

function source(path: string): string {
  const text = readFileSync(posix.join(repoRoot, path), "utf8");
  // A floor, because an empty read makes `toContain` assertions meaningless.
  expect(text.length, `${path} read empty`).toBeGreaterThan(2000);
  return text;
}

const CSS = "apps/web/src/city/three/winter-in-city.css";
const CAMERA = "apps/web/src/city/three/winterFraming.ts";

/**
 * Each number the two files have to agree about: the declaration in the stylesheet, and the
 * DECLARATION the camera reckons with. Named as a list rather than swept, because what is being
 * checked is a SHARED VALUE and a sweep over numbers would match any coincidence.
 *
 * ## THE CAMERA SIDE IS THE WHOLE DECLARATION, AND THAT IS A FIX FOR A MEASURED HOLE
 *
 * It used to be the bare number — `"620"`, `"0.5"` — on the reading that a number appearing in
 * both files is the whole of the coupling. It is not, and the gap is not theoretical: with the
 * stylesheet at `min(470px, 50vw)` and `PANEL_CAP` retuned to `430`, this file reported **11
 * passed**, because the string `470` still occurred in a COMMENT in the camera describing the
 * change. That is the exact silent failure the file exists to catch, passing.
 *
 * A prose mention is the likeliest thing to be in a file like that one, which documents its own
 * history at length; the declaration is not. So the camera side names `PANEL_CAP = 470` rather
 * than `470`, and a rename is a failure on purpose — the mirror is worth re-reading when the
 * thing being mirrored moves.
 */
const MIRRORED: readonly (readonly [what: string, css: string, camera: string])[] = [
  [
    "the panel's share of the viewport's width",
    "--hw-side: min(470px, 50vw)",
    "PANEL_SHARE = 0.5",
  ],
  ["the panel's widest", "--hw-side: min(470px, 50vw)", "PANEL_CAP = 470"],
  ["the gap the panel leaves at the edge", "--hw-gutter: 14px", "PANEL_GUTTER = 14"],
  ["where phone width starts", "@media (max-width: 560px)", "PHONE_WIDTH = 560"],
];

/**
 * AND WHAT THE CAMERA MUST NOT STILL BE READING.
 *
 * The band's ceilings were mirrored here for as long as the panel was a band, and a stale mirror
 * is exactly the failure this file exists to catch — a camera fitting the settlement into a strip
 * left by a band that is not on screen any more would look, from inside the camera, like a working
 * mirror. Named as strings rather than left to a reviewer's eye, and asserted against BOTH files
 * so neither can keep a ceiling the other has dropped.
 */
const RETIRED: readonly (readonly [what: string, literal: string])[] = [
  ["the band's share of a roomy viewport", "58vh"],
  ["the band's share of a short viewport", "min(50vh, 420px)"],
  ["the aiming ceiling", "46vh"],
  ["the outcome band's ceiling", "62vh"],
  ["the centred answering sheet's share", "82vh"],
];

describe("the winter camera's idea of the crisis band matches the stylesheet's", () => {
  const css = source(CSS);
  const camera = source(CAMERA);

  it.each(MIRRORED)("agrees about %s", (_what, cssRule, cameraLiteral) => {
    expect(css, `${CSS} no longer sets this`).toContain(cssRule);
    expect(camera, `${CAMERA} no longer reckons with this`).toContain(cameraLiteral);
  });

  it.each(RETIRED)("has dropped %s from both files", (_what, literal) => {
    expect(css, `${CSS} still sets the band's ${literal}`).not.toContain(`: ${literal}`);
    expect(camera, `${CAMERA} still reckons with the band's ${literal}`).not.toContain(
      literal,
    );
  });

  /** A floor, because `it.each` over an empty list is a suite that passes by having no tests. */
  it("checks a real list in both directions", () => {
    expect(MIRRORED.length).toBeGreaterThanOrEqual(4);
    expect(RETIRED.length).toBeGreaterThanOrEqual(5);
  });

  /**
   * AND THE CAMERA POINTS AT THE STYLESHEET, so whoever retunes the CSS is told there is a second
   * reader. A comment is not a mechanism, but an unnamed dependency is worse than a named one, and
   * this is the assertion that keeps the name there.
   */
  it("names the stylesheet it is mirroring, and the stylesheet names it back", () => {
    expect(camera).toContain("winter-in-city.css");
    expect(css, "the stylesheet does not mention the camera that depends on it").toContain(
      "winterFraming",
    );
  });
});
