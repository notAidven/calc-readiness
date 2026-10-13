import { DIAGNOSTIC_WALK_ITEM_PACK, DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { getNodeOrThrow } from "@cr/skill-graph";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { SessionProvider } from "../auth/SessionContext";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { DiagnosticRunner } from "./DiagnosticRunner";
import { skillDisplayName } from "./skillNames";

import "../styles.css";
import "./diagnostic-demo.css";
import "./diagnostic-answer.css";
import "./diagnostic-dev-skip.css";

/**
 * **THE WIDENED INSTRUMENT, ON SCREEN, WITH ITS GEOMETRY IN IT.**
 *
 * The claim these frames carry is not spatial and not a count — `diagnostic-scope.test.ts`
 * owns the count. It is that the screens READ correctly at the scope the instrument now
 * administers: an intro that promises sixty-two skills across ten subject areas has to make
 * that promise without a roster, and a results table that places sixty-two skills is a long
 * scroll. Those are the two surfaces a reviewer should look at before believing the widening
 * is demoable, and 1024x580 is where a screen gets cut off.
 *
 * `GEO.1` and `GEO.2` are named in the assertions rather than left to chance, because D10 was
 * the gap this work exists to close and "geometry is in the instrument" is exactly the sort of
 * claim that is true in a derivation and invisible on the screen. Both are found on the
 * RESULTS table, which is where they were always the strongest evidence: that table is driven
 * through the real walk, so a name on it is a node the engine actually placed.
 *
 * Reduced motion is not a prop here: the runner has no animation to hold, and the frames are
 * of static lists. The viewport is the evidence.
 *
 * ## THE WRITE IS BEHIND `VITE_DIAGNOSTIC_SHOTS`, THE ASSERTIONS ARE NOT
 *
 * `docs/design-refs/` is tracked, and #495 rules that no test writes a tracked path unless a
 * shot flag says so. The frames stay committed; only the writing of them is gated.
 *
 * Everything measured here runs on every run, and it is the more valuable half: the intro's
 * list is compared to the live scope node for node, both geometry ids are found on the screen
 * by their display names, the scope is checked to span exactly ten domains, and the results
 * table is driven through the real walk and counted. Those are the assertions that fail if the
 * widening regresses, and a capture flag has no business switching them off.
 */

const SHORT_LAPTOP = { width: 1024, height: 580 };

/** Capture run, per #495. A tracked path is written only when this says so. */
const SHOTS = Boolean(import.meta.env.VITE_DIAGNOSTIC_SHOTS);

let harness: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

async function shoot(name: string, fullPage = false): Promise<void> {
  // Re-asserted per shot rather than once in `beforeAll`: a mount can settle after the
  // viewport call and the first pair of frames came out at the harness default, which makes a
  // frame taken "at 1024x580" a frame taken at whatever the runner felt like.
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
  await new Promise<void>((resolve) => setTimeout(resolve, 150));
  expect(window.innerWidth, "the viewport did not take").toBe(SHORT_LAPTOP.width);
  await document.fonts.ready;
  const host = document.querySelector<HTMLElement>(".shot-fold");
  if (host) {
    // CLIPPED IN THE DOM, and neither `fullPage: false` nor `clip` would do it. The tests run
    // inside an iframe that sizes itself to its content, so this document is 1933px tall and
    // the harness photographs all of it whatever those options say — a picture of a list
    // nobody can see at once, captioned 1024x580. The frame below is a real 1024x580 box with
    // `overflow: hidden`, so what it cuts off is what a learner's fold cuts off. The whole
    // list gets its own frame beside it, named so.
    host.style.overflow = fullPage ? "visible" : "hidden";
    host.style.height = fullPage ? "auto" : `${SHORT_LAPTOP.height}px`;
  }
  // The viewport and the fold above are asserted and applied on EVERY run, because they are the
  // harness fix; only the tracked write below is a capture-run thing (#495). The gate names the
  // flag POSITIVELY and wraps the write, which is the shape that guard reads: an early
  // `if (!SHOTS) return` is a gate held the wrong way round.
  if (SHOTS) {
    if (SHOTS) {
      expect(
        await page.screenshot({
          path: `../../../../docs/design-refs/widened-diagnostic/${name}.png`,
        }),
        `no frame for ${name}`,
      ).toBeTruthy();
    }
  }
}

/** A real 1024x580 box, so a clipped frame is clipped by layout rather than by an option. */
function Fold({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="shot-fold"
      style={{ width: SHORT_LAPTOP.width, height: SHORT_LAPTOP.height, overflow: "hidden" }}
    >
      {children}
    </div>
  );
}

/**
 * THE INTRO'S PROMISE, WHICH IS NO LONGER A ROSTER.
 *
 * This test used to read the skill list off the screen node by node and find `GEO.1` and
 * `GEO.2` in it by their display names. That list is gone — the product lead reported it as
 * *"this super intimidating laundry list of skills"* — so the geometry claim had to move
 * rather than be dropped, and it moved to where it was always stronger: the RESULTS table
 * below, which is driven through the real walk and still finds both nodes by name. "The
 * instrument administers geometry" was never a claim about the intro's markup.
 *
 * What is left here is what the intro can still be held to: it names the live scope and the
 * live domain count, from the same derivation the engine walks, so the promise cannot drift
 * from the instrument.
 */
test("the intro promises the scope the instrument administers, geometry included", async () => {
  harness = mount(
    <Fold>
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>
    </Fold>,
  );
  await waitFor(() => document.querySelector(".dgx-intro") !== null, "the intro", 20_000);

  expect(DIAGNOSTIC_WALK_SCOPE).toContain("GEO.1");
  expect(DIAGNOSTIC_WALK_SCOPE).toContain("GEO.2");
  const domains = new Set(DIAGNOSTIC_WALK_SCOPE.map((id) => getNodeOrThrow(id).domain));
  expect(domains.size, `only ${[...domains].sort().join(",")}`).toBe(10);

  // The screen states both, from the live derivation rather than from a literal.
  const text = (document.querySelector(".dgx-intro") as HTMLElement).textContent ?? "";
  expect(text, "the intro no longer states the scope it administers").toContain(
    `${DIAGNOSTIC_WALK_SCOPE.length} skills`,
  );
  expect(text, "the intro no longer states how many subject areas it spans").toContain(
    `${domains.size} subject areas`,
  );

  // And it does NOT name them one at a time, which is the report this screen answers.
  expect(
    DIAGNOSTIC_WALK_SCOPE.map(skillDisplayName).filter((name) => text.includes(name)),
    "the intro is naming individual skills again",
  ).toEqual([]);

  await shoot("intro-1024x580");
  await shoot("intro-whole-panel", true);
});

test("a geometry probe renders and can be answered", async () => {
  // The other half of "geometry is in the instrument": one of its items served into the real
  // answer row. `GEO.1`'s L2 walk items are `numeric` (a leg length, an angle), so the row is
  // a plain field — which is what the frame should show, rather than a widget the diagnostic
  // has no way to grade.
  const geoItems = DIAGNOSTIC_WALK_ITEM_PACK.filter((item) => item.node_id === "GEO.1");
  expect(geoItems.length, "no GEO.1 walk items exist to serve").toBeGreaterThanOrEqual(6);
  for (const item of geoItems) {
    expect(
      item.answer.answer_spec.answer_type,
      `${item.item_version_id} is not a plain text shape`,
    ).toBe("numeric");
    expect(item.answer.parts ?? []).toEqual([]);
  }

  harness = mount(
    <Fold>
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>
    </Fold>,
  );
  await waitFor(() => document.querySelector(".dgx-intro") !== null, "the intro", 20_000);
  findButton(document.body, /Start the diagnostic/).click();
  await waitFor(
    () => document.querySelector(".dgx-probe") !== null,
    "the first question",
    20_000,
  );
  await shoot("first-probe-1024x580");
});

test("a half-right walk reaches results over the whole administered scope", async () => {
  // Driven through the REAL walk and the REAL scorer by #492's dev rung, so the results table
  // below is a placement the engine produced rather than a fixture. The frame is what a
  // reviewer sees at the end of the widened instrument; the assertions are what the frame
  // cannot show — that every administered node got a row, geometry included.
  harness = mount(
    <Fold>
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>
    </Fold>,
  );
  await waitFor(() => document.querySelector(".dgx-intro") !== null, "the intro", 20_000);
  findButton(document.body, /Half right/).click();
  await waitFor(
    () => document.querySelector(".dgx-results") !== null,
    "the results screen",
    60_000,
  );

  // THE PER-SKILL DETAIL IS BEHIND A DISCLOSURE PER SUBJECT AREA now, so it is opened rather
  // than read off the page. `resultsDetailStaysReachable.browser.test.tsx` owns the
  // reachability claim over the whole administration; what this file needs is that the two
  // geometry skills the widening exists for still reach the screen.
  const toggles = [...document.querySelectorAll<HTMLButtonElement>(".dgx-area__toggle")];
  expect(toggles.length, "the results screen drew no subject areas").toBeGreaterThan(1);
  for (const toggle of toggles) {
    toggle.click();
  }
  // Awaited rather than read straight back: a bare `element.click()` in this runner does not
  // flush React's state update before the next synchronous statement, and reading the rows on
  // the same tick finds none of them.
  await waitFor(
    () => document.querySelectorAll(".dgx-finding").length === DIAGNOSTIC_WALK_SCOPE.length,
    "every area's skills to open",
  );
  const findings = [...document.querySelectorAll(".dgx-finding")];
  expect(findings.length, "the results detail does not cover the administered scope").toBe(
    DIAGNOSTIC_WALK_SCOPE.length,
  );
  // Geometry has a row with a real placement on it, which is the whole point of the widening:
  // before this, `GEO.1`/`GEO.2` could not appear on this screen at all.
  const names = findings.map((el) => el.textContent ?? "");
  for (const nodeId of ["GEO.1", "GEO.2"]) {
    expect(
      names.some((text) => text.includes(skillDisplayName(nodeId))),
      `${nodeId} has no row on the results table`,
    ).toBe(true);
  }
  // The three-figure tally is present and its denominators agree with the scope.
  const tally = document.querySelector(".dgx-tally")?.textContent ?? "";
  expect(tally).toContain(String(DIAGNOSTIC_WALK_SCOPE.length));

  await shoot("results-1024x580");
  await shoot("results-whole-table", true);
});
