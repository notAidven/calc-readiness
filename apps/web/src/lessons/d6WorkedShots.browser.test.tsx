/**
 * The FRAMES behind D6's worked figures, one per archetype, at a short realistic laptop.
 *
 * D6's fifty-five practice templates went from step cards to figures in one round, and every
 * measurement that round produced is a measurement about a box: label ink inside a plot rect,
 * two labels not overlapping, a delimiter not outgrowing its fraction. None of those can say
 * whether the reveal is LEGIBLE on a 580px-tall screen, and none of them can say whether the
 * figure leaves the card around it visible, because the element that changed is the one part of
 * the picture nobody doubted.
 *
 * So this photographs the whole surface: the reveal inside a 920px lesson column
 * (`CITY_DESKTOP`, the width a learner and a `?dev` reviewer are actually given, not the 460px
 * `FIGURE_CONTENT_CAP` the layout guards spot-check at), on `--paper`, at 1024x580. The viewport
 * is named in every filename for the reason the QA rule gives: a frame whose viewport is unstated
 * says nothing about anybody's screen, and `min(58vh, ...)` figures resolve differently on a tall
 * monitor than on a laptop.
 *
 * One per ARCHETYPE rather than one per template, because the archetype is what was authored.
 * Six of them cover the fifty-five:
 *
 *  1. reduction column  — 18 templates, `ExpressionReductionWorked`
 *  2. coordinate plane  — 20 templates, `D6Chart` (15 general + 5 vee)
 *  3. interval line     —  5 templates, `SolutionLineWorked`
 *  4. piecewise break   —  5 templates, `D6BreakLine`
 *  5. composition chain —  5 templates, `D6Chain`
 *  6. ledger table      —  2 templates, `D6Ledger`
 *
 * The instances are drawn from `everyDraw()` rather than written here, so each frame shows a
 * seed's real params and not a hand-picked flattering one. Which TEMPLATE stands for an
 * archetype is a choice, and it is made for the busiest branch each one has rather than the
 * tidiest: the reason is recorded beside every entry.
 *
 * Two archetypes are photographed more than once, and in both cases because ONE component
 * draws two pictures. The plane is shot with and without the vee. The break line is shot at
 * three widths, because unlike every other figure here it DERIVES its own window from the
 * content it is handed, so its three content regimes — every finite point on one coordinate,
 * two breaks a couple of units apart, and two loads up to sixteen apart — are three different
 * layouts out of one component, and a frame of the middle one says nothing about the ends.
 */

import { expect, test } from "vitest";
import { page } from "vitest/browser";

import { everyDraw } from "./practiceSweep";
import { CITY_DESKTOP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { WorkedSolution } from "./WorkedSolution";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

let h: Harness | null = null;

/** The archetype roster, and the template each frame is taken from. */
const SHOTS: readonly {
  archetype: string;
  file: string;
  templateId: string;
  why: string;
}[] = [
  {
    archetype: "reduction column",
    file: "reduction-column-fun6-point-full",
    templateId: "d6.fun6.point-full.l3",
    why: "the tallest of the eighteen: a difference quotient reduces over five rows",
  },
  {
    archetype: "coordinate plane",
    file: "plane-cg1-distance",
    templateId: "d6.cg1.distance.l3",
    why: "a plane with a right-triangle overlay, two dots and three placed labels",
  },
  {
    archetype: "coordinate plane, vee",
    file: "vee-fun10-reach",
    templateId: "d6.fun10.reach.l2",
    why: "the absolute-value specialisation, with a level line cutting both arms",
  },
  {
    archetype: "interval line",
    file: "interval-fun2-root-over-linear",
    templateId: "d6.fun2.root-over-linear.l3",
    why: "the union branch, where two pieces share an endpoint and one is a hole",
  },
  {
    archetype: "piecewise break",
    file: "break-fun3-three-piece",
    templateId: "d6.fun3.three-piece-eval.l2",
    why: "three stretches and two breaks, the busiest legend the archetype draws",
  },
  {
    archetype: "piecewise break, one coordinate",
    file: "break-fun3-boundary",
    templateId: "d6.fun3.boundary-eval.l2",
    why: "the degenerate window: break and marked input are the same number, so the padding is the whole scale",
  },
  {
    archetype: "piecewise break, wide",
    file: "break-fun3-across-pieces",
    templateId: "d6.fun3.across-pieces-sum.l3",
    why: "the only break draw whose content can be sixteen units wide, and the only one marking two inputs",
  },
  {
    archetype: "composition chain",
    file: "chain-fun7-square-inner",
    templateId: "d6.fun7.square-inner.l3",
    why: "two stacked stages carrying a squared value between them",
  },
  {
    archetype: "ledger table",
    file: "ledger-fun8-table-swap",
    templateId: "d6.fun8.table-swap.l1",
    why: "a table with a highlighted target row, the archetype's only tone branch",
  },
];

/**
 * A floor under the roster, so this file cannot photograph an empty list and report green.
 * Nine frames over six archetypes: the plane is shot twice because the vee is a different
 * picture even though it is the same component, and the break line three times because it is
 * the one figure here that derives its own window from its content.
 *
 * INJECTED RED BY: renaming the `d6.fun2.root-over-linear.l3` key in `worked/d6FUN2.tsx`, which
 * fails at *"d6.fun2.root-over-linear.l3 has no registered figure, so its frame would photograph
 * a step card"* and takes the interval-line frame down with it (*"waitFor timed out: the reveal
 * mounts"*, there being no `svg` in a step card to wait for). That is the failure mode a
 * screenshot file has and a measurement does not: a photograph of the wrong thing is still a
 * photograph, and it looks fine.
 *
 * INJECTED RED ON THE COUNT ITSELF BY: deleting the `break-fun3-boundary` entry, which fails at
 * *"the frame roster collapsed"* — the floor is not decoration over a list nobody shortens.
 */
test("the frame roster covers every D6 archetype, and every entry has a figure to shoot", () => {
  expect(SHOTS.length, "the frame roster collapsed").toBeGreaterThanOrEqual(9);
  expect(
    new Set(SHOTS.map((shot) => shot.archetype)).size,
    "two roster entries name the same archetype, so an archetype is unphotographed",
  ).toBeGreaterThanOrEqual(9);
  for (const shot of SHOTS) {
    expect(
      getWorkedSolutionVisual(shot.templateId),
      `${shot.templateId} has no registered figure, so its frame would photograph a step card`,
    ).toBeDefined();
  }
});

/**
 * Whether the MOUNT below is fit to photograph, which is not a thing a screenshot can say
 * about itself.
 *
 * `.cursor/rules/qa-verification.mdc` warns that the panel tokens — `--glass-fill-strong` and
 * its neighbours — are declared on `.city-shell` rather than at `:root`, so a component mounted
 * straight onto `document.body` resolves them to nothing and every panel painted with one comes
 * out TRANSPARENT. A frame taken there shows content sliding through boxes that are opaque for
 * every learner, and the reverse trap is worse, because a genuinely transparent overlay would
 * look identical.
 *
 * This mount is bare on purpose: `.city-shell` is `position: fixed` over a blue sky gradient and
 * no learner is ever shown a worked reveal on it. So what is owed instead is the claim that
 * nothing in THIS subtree wants a `.city-shell` token, and that is asserted rather than argued.
 * The host is confirmed to be outside `.city-shell` (so the warning genuinely applies to it),
 * and the one surface the reveal paints on is confirmed to resolve its token and come out
 * OPAQUE anyway.
 */
test("the bare mount resolves this surface's own tokens, so its frames are not lying", async () => {
  await page.viewport(1024, 580);
  const shot = SHOTS[0];
  if (!shot) {
    throw new Error("the frame roster is empty");
  }
  const item = everyDraw().find((draw) => draw.template_id === shot.templateId);
  if (!item) {
    throw new Error(`no draw of ${shot.templateId}`);
  }
  h = mount(
    <div style={{ width: `${CITY_DESKTOP.column}px`, background: "var(--paper)" }}>
      <WorkedSolution
        templateId={item.template_id}
        params={item.template_params}
        steps={[]}
      />
    </div>,
  );
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-visual") !== null, "the reveal mounts");

  const hostStyle = getComputedStyle(host);
  expect(
    hostStyle.getPropertyValue("--glass-fill-strong").trim(),
    "the host resolves a .city-shell panel token, so this test is no longer describing a bare mount",
  ).toBe("");
  expect(
    hostStyle.getPropertyValue("--paper-deep").trim(),
    "the surface's own token is missing at the host, so every frame here is painting on nothing",
  ).not.toBe("");

  const figure = host.querySelector(".lesson-visual");
  if (!figure) {
    throw new Error("no .lesson-visual to measure");
  }
  const fill = getComputedStyle(figure).backgroundColor;
  expect(
    fill,
    "the figure panel is transparent in this mount, so its frames show the page through it",
  ).not.toMatch(/rgba\([^)]*,\s*0\)$/);
  expect(fill, "the figure panel paints no colour at all").not.toBe("");

  h.cleanup();
  h = null;
  await page.viewport(1440, 900);
});

test.each(SHOTS.map((shot) => [shot.archetype, shot] as const))(
  "%s photographs at 1024x580 in a 920px lesson column",
  { timeout: 120_000 },
  async (_archetype, shot) => {
    const draws = everyDraw().filter((item) => item.template_id === shot.templateId);
    expect(draws.length, `no draw of ${shot.templateId} to photograph`).toBeGreaterThan(0);
    const item = draws[0];
    if (!item) {
      return;
    }

    await page.viewport(1024, 580);
    h = mount(
      <div
        style={{
          padding: "24px",
          width: `${CITY_DESKTOP.column}px`,
          background: "var(--paper)",
        }}
      >
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={[]}
        />
      </div>,
    );
    const host = h.host;
    await waitFor(() => host.querySelector("svg") !== null, "the reveal mounts", 30_000);
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      "the reveal typesets",
      30_000,
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 250));

    if (CAPTURE_EVIDENCE) {
      const path = await page.screenshot({
        path: `__screenshots__/d6-worked/${shot.file}-1024x580.png`,
      });
      expect(path, "no screenshot was written").toBeTruthy();
    }

    h.cleanup();
    h = null;
    await page.viewport(1440, 900);
  },
);
