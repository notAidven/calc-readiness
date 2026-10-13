import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { MOCK_CITY_LOAD, MOCK_NODE_STATES } from "./mockCity";
import { openBuiltShelf } from "./test/openBuiltShelf";

/**
 * A display preference has its own origin-local key. Keeping the literal here means changing
 * the implementation key cannot silently discard every existing browser preference.
 */
const BUILDING_LABELS_STORAGE_KEY = "cr.city.display.buildingLabels";

/**
 * jsdom has no WebGL, so expose the exact canvas-boundary prop as a semantic mirror.
 * `SkillLabels.test.ts` separately owns the real overlay layer.
 */
vi.mock("./three/CityCanvasHost", () => ({
  CityCanvasHost: ({
    showSkillLabels,
    placed = [],
    fallback,
  }: {
    showSkillLabels?: boolean;
    placed?: readonly { readonly nodeId: string; readonly mastery: number }[];
    fallback: ReactNode;
  }) => (
    <div data-testid="scene-stub" data-building-labels-visible={String(showSkillLabels)}>
      {fallback}
      <div data-testid="skill-label-layer" aria-hidden="true">
        {placed.map((building) => (
          <span
            key={building.nodeId}
            data-skill-label={building.nodeId}
            hidden={showSkillLabels !== true}
          >
            {building.nodeId}
          </span>
        ))}
      </div>
      <div data-testid="mastery-stars">
        {placed.map((building) => (
          <span key={building.nodeId} data-mastery-stars={building.nodeId}>
            {"★".repeat(building.mastery)}
          </span>
        ))}
      </div>
    </div>
  ),
}));

function seededSession() {
  return createCityDevSession(null, {
    nodeStates: MOCK_NODE_STATES,
    placements: MOCK_CITY_LOAD.placements,
    townHall: MOCK_CITY_LOAD.town_hall ?? undefined,
  });
}

async function ready(): Promise<void> {
  await screen.findByRole("button", { name: "Build" });
}

function labels(): HTMLElement {
  return screen.getByTestId("skill-label-layer");
}

function expectOrdinaryNamesHidden(hidden: boolean): void {
  const ordinary = Array.from(labels().querySelectorAll<HTMLElement>("[data-skill-label]"));
  expect(ordinary.length).toBeGreaterThan(0);
  for (const label of ordinary) {
    expect(label.hidden, label.dataset.skillLabel).toBe(hidden);
  }
}

function plotButton(nodeId: string): HTMLElement {
  const button = document.querySelector<HTMLElement>(
    `button.city-plot[data-node-id="${nodeId}"]`,
  );
  if (!button) throw new Error(`No roster button rendered for ${nodeId}`);
  return button;
}

beforeEach(() => {
  localStorage.removeItem(BUILDING_LABELS_STORAGE_KEY);
});

afterEach(() => {
  localStorage.removeItem(BUILDING_LABELS_STORAGE_KEY);
  vi.restoreAllMocks();
});

describe("CitySurface building-label display preference", () => {
  it("shows placed-building labels by default", async () => {
    render(<CitySurface enableCanvas={false} />);
    await ready();

    const button = screen.getByRole("button", { name: "Hide building labels" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(labels()).not.toHaveAttribute("hidden");
    expectOrdinaryNamesHidden(false);
    expect(localStorage.getItem(BUILDING_LABELS_STORAGE_KEY)).toBeNull();
  });

  it("hides labels in one click, updates accessibility, and persists without remounting", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await ready();
    const scene = screen.getByTestId("scene-stub");

    await user.click(screen.getByRole("button", { name: "Hide building labels" }));

    expect(screen.getByRole("button", { name: "Show building labels" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(labels()).not.toHaveAttribute("hidden");
    expectOrdinaryNamesHidden(true);
    expect(localStorage.getItem(BUILDING_LABELS_STORAGE_KEY)).toBe("hidden");
    expect(screen.getByTestId("scene-stub")).toBe(scene);
  });

  it("restores labels on the next click", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await ready();

    await user.click(screen.getByRole("button", { name: "Hide building labels" }));
    await user.click(screen.getByRole("button", { name: "Show building labels" }));

    expect(screen.getByRole("button", { name: "Hide building labels" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(labels()).not.toHaveAttribute("hidden");
    expectOrdinaryNamesHidden(false);
    expect(localStorage.getItem(BUILDING_LABELS_STORAGE_KEY)).toBe("visible");
  });

  it("does not call city mutators or change placement and mastery bytes", async () => {
    const user = userEvent.setup();
    const session = seededSession();
    const before = JSON.stringify(await session.load());
    const moveTownHall = vi.fn();
    const placeSkill = vi.fn();
    const moveSkill = vi.fn();
    const advanceMastery = vi.fn();
    const markLessonTaught = vi.fn();
    const setStage = vi.fn();

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onMoveTownHall={moveTownHall}
        onPlaceSkill={placeSkill}
        onMoveSkill={moveSkill}
        onDevAdvanceMastery={advanceMastery}
        onDevLessonTaught={markLessonTaught}
        onDevSetStage={setStage}
      />,
    );
    await ready();

    await user.click(screen.getByRole("button", { name: "Hide building labels" }));

    expect(JSON.stringify(await session.load())).toBe(before);
    for (const mutator of [
      moveTownHall,
      placeSkill,
      moveSkill,
      advanceMastery,
      markLessonTaught,
      setStage,
    ]) {
      expect(mutator).not.toHaveBeenCalled();
    }
  });

  it("restores a persisted hidden preference without changing city data", async () => {
    localStorage.setItem(BUILDING_LABELS_STORAGE_KEY, "hidden");
    const session = seededSession();
    const before = JSON.stringify(await session.load());

    render(<CitySurface enableCanvas={false} loadCity={session.load} />);
    await ready();

    expect(screen.getByRole("button", { name: "Show building labels" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(labels()).not.toHaveAttribute("hidden");
    expectOrdinaryNamesHidden(true);
    expect(JSON.stringify(await session.load())).toBe(before);
  });

  it("treats a corrupt stored value as the visible default", async () => {
    localStorage.setItem(BUILDING_LABELS_STORAGE_KEY, "{not-a-display-preference");
    render(<CitySurface enableCanvas={false} />);
    await ready();

    expect(screen.getByRole("button", { name: "Hide building labels" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(labels()).not.toHaveAttribute("hidden");
    expectOrdinaryNamesHidden(false);
  });

  it("keeps the toggle usable when preference storage throws", async () => {
    const user = userEvent.setup();
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(function getItem(
      this: Storage,
      key,
    ) {
      if (key === BUILDING_LABELS_STORAGE_KEY) throw new Error("blocked");
      return nativeGet.call(this, key);
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function setItem(
      this: Storage,
      key,
      value,
    ) {
      if (key === BUILDING_LABELS_STORAGE_KEY) throw new Error("blocked");
      return nativeSet.call(this, key, value);
    });

    render(<CitySurface enableCanvas={false} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Hide building labels" }));

    expect(screen.getByRole("button", { name: "Show building labels" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(labels()).not.toHaveAttribute("hidden");
    expectOrdinaryNamesHidden(true);
  });

  it("leaves mastery stars and an open selection callout mounted while labels hide", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await ready();
    const stars = screen.getByTestId("mastery-stars");

    await openBuiltShelf(user);
    await user.click(plotButton("NUM.S"));
    const callout = await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Hide building labels" }));

    expect(labels()).not.toHaveAttribute("hidden");
    expectOrdinaryNamesHidden(true);
    expect(screen.getByTestId("mastery-stars")).toBe(stars);
    expect(stars.querySelectorAll("[data-mastery-stars]").length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog")).toBe(callout);
  });
});
