import { LEGACY_ERA_ONE_CIVIC_IDS } from "@cr/economy";
import { ERA_ONE_CIVIC_TYPES } from "@cr/game";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { D1_SKILL_IDS } from "./buildingAssets";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";

/**
 * **THE CIVIC TAB PREVIEWS ITS BUILDINGS, THROUGH THE LESSON TAB'S OWN MECHANISM.**
 *
 * The Civic tab shipped listing four priced rows with a generic house glyph where the
 * lesson rows carry a live 3D thumbnail of the building being sold, so the one tab in the
 * menu whose whole job is "here is a thing you can buy" was the one tab that never showed
 * the thing. This file is the guard on that, and on the two ways the fix could go wrong.
 *
 * ## Why the canvas is stubbed, and what is still really asserted
 *
 * jsdom has no WebGL, so `BuildingThumb`'s R3F canvas can never mount here — the visual
 * proof is a screenshot from the real app, not this file. What is stubbed is only the
 * canvas: the stub calls the REAL {@link thumbModelUrl}, so the url each row previews is
 * resolved by the shipped registry and a row pointing at nothing (or at the neutral
 * procedural stand-in a non-`built` stage hands back) fails here.
 *
 * ## The population, and why it is both tabs
 *
 * The claim is not "the civic rows have a preview" but "the two tabs preview through ONE
 * mechanism", since two mechanisms in one menu is how they drift apart. So the population
 * is every build-menu row that sells a building — four civic rows derived from
 * `ERA_ONE_CIVIC_TYPES` and six lesson rows derived from `D1_SKILL_IDS` — and each side
 * carries its own floor, so neither an emptied catalogue nor an emptied skill registry
 * can leave this passing over nothing. Both sides are counted through the SAME stub, so a
 * second preview component forked for civic fails the civic count rather than passing
 * quietly.
 */

/**
 * The canvas stub: one DOM node per preview, tagged with the subject it was handed and
 * the url the real resolver gives that subject. `importOriginal` keeps `thumbModelUrl`
 * genuine — the point of the test is that the wiring reaches a real bundled GLB.
 */
vi.mock("./three/BuildingThumb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./three/BuildingThumb")>();
  return {
    ...actual,
    default: (subject: { nodeId?: string; civicType?: string }) => (
      <span
        data-testid="build-thumb"
        data-thumb-subject={subject.civicType ?? subject.nodeId}
        data-thumb-kind={subject.civicType ? "civic" : "skill"}
        data-thumb-url={
          actual.thumbModelUrl(
            subject.civicType
              ? { civicType: subject.civicType }
              : { nodeId: subject.nodeId as string },
          ) ?? ""
        }
      />
    ),
  };
});

/** The 3D city itself never mounts under jsdom; only the build menu is under test. */
vi.mock("./three/CityCanvasHost", () => ({
  CityCanvasHost: ({ fallback }: { fallback: React.ReactNode }) => (
    <div data-testid="scene-stub">{fallback}</div>
  ),
}));

/** The civic ids, derived from the shipped catalogue rather than written out here. */
const CIVICS = Object.keys(ERA_ONE_CIVIC_TYPES).map((modelType) => ({
  modelType: modelType as keyof typeof ERA_ONE_CIVIC_TYPES,
  catalogueId: LEGACY_ERA_ONE_CIVIC_IDS[modelType as keyof typeof LEGACY_ERA_ONE_CIVIC_IDS],
}));

async function openTab(
  user: ReturnType<typeof userEvent.setup>,
  name: RegExp,
): Promise<HTMLElement> {
  await user.click(await screen.findByRole("button", { name: "Build" }));
  await user.click(await screen.findByRole("tab", { name }));
  return screen.getByRole("tabpanel");
}

/** The real surface, with thumbnails on (`enableCanvas` is what gates them). */
function renderCity() {
  render(
    <CitySurface
      loadCity={createCityDevSession().load}
      materialAvailable={600}
      materialLabel="stone"
    />,
  );
}

/**
 * The previews in a panel, awaited: `BuildingThumb` is lazy (code-split, so the R3F
 * chunk only loads when a menu actually shows a card), so the first paint of a tab is
 * the Suspense glyph and the preview arrives a microtask later. Awaiting here rather
 * than reading synchronously also keeps each test independent of whether an earlier one
 * already warmed the module.
 */
function previews(panel: HTMLElement): Promise<HTMLElement[]> {
  // THE WAIT BUDGET IS RAISED, AND NOTHING ELSE IS. Measured 2026-07-30: this file
  // passes 3/3 alone and passes again when `src/city` runs with `--no-file-parallelism`
  // (73 files, 1084 tests, 0 failed), but fails on the SAME file set under Vitest's
  // default parallel workers. What it waits for is a dynamic `import()` of the R3F/three
  // chunk behind `BuildingThumb`'s `lazy`, and that chunk's transform competes with every
  // other worker — so the arrival time is a property of machine load, not of the
  // component. Testing Library's default budget is 1000ms, which is under the loaded
  // cost and over the unloaded one, which is exactly why this failed by directory and
  // never alone. The assertions this feeds are untouched: the caller still pins the
  // count to the catalogue's own length and still floors it, so a menu that renders no
  // previews, or the wrong number, fails here as loudly as it ever did.
  return within(panel).findAllByTestId("build-thumb", undefined, { timeout: 20_000 });
}

describe("the build menu previews what it sells, on both tabs, through one component", () => {
  it("shows every civic building's own model, one preview per catalogue row", async () => {
    const user = userEvent.setup();
    renderCity();
    const panel = await openTab(user, /Civic/);

    // A floor on the catalogue, so an emptied one cannot make the loop below vacuous.
    expect(CIVICS.length).toBeGreaterThanOrEqual(4);
    const rendered = await previews(panel);
    expect(rendered).toHaveLength(CIVICS.length);
    expect(rendered.length).toBeGreaterThanOrEqual(4);

    for (const { modelType, catalogueId } of CIVICS) {
      const card = panel.querySelector(`.build-card[data-node-id="${catalogueId}"]`);
      expect(card, `${catalogueId} has a card`).not.toBeNull();
      const thumb = within(card as HTMLElement).getByTestId("build-thumb");
      expect(thumb.getAttribute("data-thumb-kind"), catalogueId).toBe("civic");
      expect(thumb.getAttribute("data-thumb-subject"), catalogueId).toBe(modelType);
      // A REAL bundled `built` GLB. An empty url is what a missing file or a mistakenly
      // requested `site`/`construction` stage would leave here — the grey stand-in.
      expect(
        (thumb.getAttribute("data-thumb-url") ?? "").length,
        `${catalogueId} url`,
      ).toBeGreaterThan(0);
    }
  });

  it("previews the lesson rows through the same component, so the two cannot drift", async () => {
    const user = userEvent.setup();
    renderCity();
    const panel = await openTab(user, /Lessons/);

    expect(D1_SKILL_IDS.length).toBeGreaterThanOrEqual(6);
    const rendered = await previews(panel);
    expect(rendered.length).toBeGreaterThanOrEqual(6);
    for (const thumb of rendered) {
      expect(thumb.getAttribute("data-thumb-kind")).toBe("skill");
      expect((thumb.getAttribute("data-thumb-url") ?? "").length).toBeGreaterThan(0);
    }
  });

  it("keeps the civic preview decorative and mastery-free", async () => {
    const user = userEvent.setup();
    renderCity();
    const panel = await openTab(user, /Civic/);
    expect(await previews(panel)).toHaveLength(CIVICS.length);

    for (const { modelType, catalogueId } of CIVICS) {
      const card = panel.querySelector(
        `.build-card[data-node-id="${catalogueId}"]`,
      ) as HTMLElement;
      // Decorative: the preview sits inside the `aria-hidden` thumb box, so it adds
      // nothing to the row's accessible name — the words still carry the sale.
      const thumbBox = card.querySelector(".build-card-thumb");
      expect(thumbBox?.getAttribute("aria-hidden")).toBe("true");
      expect(thumbBox?.contains(within(card).getByTestId("build-thumb"))).toBe(true);
      const cta = within(card).getByTestId(`civic-card-${catalogueId}`);
      expect(cta.textContent).toContain(ERA_ONE_CIVIC_TYPES[modelType].name);
      expect(cta.textContent).toContain(`${ERA_ONE_CIVIC_TYPES[modelType].cost} stone`);

      // A bought building has no lesson, no prerequisite chain and no mastery ladder, so
      // none of the lesson card's overlays may ride along with the preview. Twice today
      // mastery machinery has misdescribed a bought building; this is where a third try
      // fails.
      expect(card.querySelector(".build-card-built-badge")).toBeNull();
      expect(card.querySelector(".build-card-lock")).toBeNull();
      expect(card.querySelector(".build-card-tag--built")).toBeNull();
      expect(card.textContent).not.toContain("Ready to build");
      expect(card.textContent).not.toContain("Not built");
    }
  });
});
