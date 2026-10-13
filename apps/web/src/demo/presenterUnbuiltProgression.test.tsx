import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";
import { presenterUnbuiltNodeId } from "./presenterFixtures";
import { PRESENTER_PRESETS, type PresenterPreset } from "./presenterMode";

type PresenterPreparation =
  | {
      readonly kind: "direct-preset";
      readonly eraId: EraId;
      readonly preset: PresenterPreset;
    }
  | {
      readonly kind: "unlock-and-build";
      readonly eraId: EraId;
    };

const PREPARATIONS: readonly PresenterPreparation[] = [
  ...ERA_SEQUENCE.flatMap((era) =>
    PRESENTER_PRESETS.map((preset) => ({
      kind: "direct-preset" as const,
      eraId: era.id,
      preset,
    })),
  ),
  ...ERA_SEQUENCE.map((era) => ({
    kind: "unlock-and-build" as const,
    eraId: era.id,
  })),
];

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

function dismissCompletionReward(): void {
  const dialog = screen.queryByRole("alertdialog");
  if (dialog) {
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
  }
}

async function openBuildMenu() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    dismissCompletionReward();
    fireEvent.click(await screen.findByRole("button", { name: "Build" }));
    try {
      return await screen.findByRole(
        "dialog",
        { name: "Choose a skill to build" },
        { timeout: 1_000 },
      );
    } catch {
      // A seed's completion receipt can arrive just after the first paint and take the
      // surface between finding Build and opening it. Clear that real modal and retry.
      dismissCompletionReward();
    }
  }
  throw new Error("the real Presenter city never opened its Build menu");
}

async function prepareThroughRealPresenter(preparation: PresenterPreparation) {
  if (preparation.kind === "direct-preset") {
    window.history.replaceState(
      null,
      "",
      `/demo?presenter=1&preset=${preparation.preset}&surface=city&era=${preparation.eraId}`,
    );
    return render(<App />);
  }

  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=bronze-city&surface=city&era=bronze_age",
  );
  const mounted = render(<App />);
  await screen.findByRole("button", { name: "Build" });
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const menu = await screen.findByTestId("presenter-era-menu");
  fireEvent.change(within(menu).getByRole("combobox", { name: "Presenter target era" }), {
    target: { value: preparation.eraId },
  });
  fireEvent.click(within(menu).getByRole("button", { name: "Unlock & build era" }));
  await waitFor(() =>
    expect(new URL(window.location.href).searchParams.get("era")).toBe(preparation.eraId),
  );
  dismissCompletionReward();
  return mounted;
}

/**
 * This guard is scoped to the behavior, not to either seed implementation: every way the
 * Presenter can prepare an era must leave a real skill building absent from the island and
 * offered by the live Build menu. The population is the canonical era sequence crossed with
 * the route's canonical presets, plus the independent Unlock & build transaction.
 */
test("every Presenter-prepared era offers one genuinely unbuilt skill through the real city UI", {
  timeout: 180_000,
}, async () => {
  expect(
    ERA_SEQUENCE.length,
    "the Presenter behavior sweep lost the canonical era population",
  ).toBeGreaterThanOrEqual(10);
  expect(
    PRESENTER_PRESETS.length,
    "the direct-preset side of the behavior sweep became empty or partial",
  ).toBeGreaterThanOrEqual(5);
  expect(new Set(PREPARATIONS.map((entry) => entry.kind))).toEqual(
    new Set(["direct-preset", "unlock-and-build"]),
  );
  expect(PREPARATIONS.filter((entry) => entry.kind === "direct-preset")).toHaveLength(
    ERA_SEQUENCE.length * PRESENTER_PRESETS.length,
  );
  expect(PREPARATIONS.filter((entry) => entry.kind === "unlock-and-build")).toHaveLength(
    ERA_SEQUENCE.length,
  );

  const checked = new Set<string>();
  for (const preparation of PREPARATIONS) {
    const caseId =
      preparation.kind === "direct-preset"
        ? `${preparation.kind}:${preparation.eraId}:${preparation.preset}`
        : `${preparation.kind}:${preparation.eraId}`;
    const unbuiltNodeId = presenterUnbuiltNodeId(preparation.eraId);
    const mounted = await prepareThroughRealPresenter(preparation);
    try {
      const shop = await openBuildMenu();
      expect(within(shop).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      fireEvent.click(within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ }));
      const roster = within(shop).getByRole("group", { name: "Built" });
      const islandRow = roster.querySelector<HTMLElement>(
        `[data-node-id="${unbuiltNodeId}"]`,
      );
      expect(islandRow, `${caseId} omitted its target from the real roster`).not.toBeNull();
      expect(islandRow, `${caseId} placed its supposed unbuilt target`).toHaveAttribute(
        "data-empty",
        "true",
      );
      expect(islandRow).toHaveAttribute("data-state", "empty");
      expect(islandRow).toHaveTextContent("Not built");
      expect(islandRow).toHaveTextContent("Ready to build");

      const card = shop.querySelector<HTMLElement>(
        `.build-card[data-node-id="${unbuiltNodeId}"]`,
      );
      expect(card, `${caseId} has no live Build-menu card`).not.toBeNull();
      expect(card, `${caseId} presents the target as already built`).not.toHaveAttribute(
        "data-built",
      );
      expect(
        card,
        `${caseId} left the unbuilt target prerequisite-locked`,
      ).not.toHaveAttribute("data-locked");
      expect(card).toHaveTextContent("Ready to build");

      const build = card?.querySelector<HTMLButtonElement>("button");
      if (!build) {
        throw new Error(`${caseId} has no Build-menu action for ${unbuiltNodeId}`);
      }
      fireEvent.click(build);
      expect(
        await screen.findByRole("button", { name: /Build here/ }),
        `${caseId} advertised availability but did not enter real placement`,
      ).toBeEnabled();
      checked.add(caseId);
    } finally {
      mounted.unmount();
      cleanup();
      localStorage.clear();
      resetCityEra();
      window.history.replaceState(null, "", "/");
    }
  }

  expect(checked.size).toBe(PREPARATIONS.length);
});
