import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";
import { presenterUnbuiltNodeId } from "./presenterFixtures";

import "../styles.css";

function placementControls(): HTMLElement[] {
  return screen.queryAllByRole("group", { name: /^Placing / });
}

async function startPresenterPlacement(
  eraId: Parameters<typeof presenterUnbuiltNodeId>[0],
) {
  fireEvent.click(await screen.findByRole("button", { name: "Build" }));
  const shop = await screen.findByRole("dialog", { name: "Choose a skill to build" });
  const nodeId = presenterUnbuiltNodeId(eraId);
  const card = shop.querySelector<HTMLElement>(`.build-card[data-node-id="${nodeId}"]`);
  if (card === null) {
    throw new Error(`the ${eraId} Presenter target ${nodeId} has no Build card`);
  }
  expect(card).toHaveTextContent("Ready to build");
  const build = card.querySelector<HTMLButtonElement>("button");
  if (build === null) {
    throw new Error(`the ${eraId} Presenter target ${nodeId} has no Build action`);
  }
  fireEvent.click(build);
  await waitFor(() => expect(placementControls().length).toBeGreaterThan(0));
  expect(screen.getAllByRole("button", { name: "Build here" })[0]).toBeEnabled();
  return nodeId;
}

async function openPresenterBay(): Promise<void> {
  const presenterBar = screen.getByRole("navigation", { name: "Presenter actions" });
  fireEvent.click(within(presenterBar).getByRole("button", { name: "Bay" }));
  await screen.findByTestId("archipelago-overview", undefined, { timeout: 20_000 });
}

async function leaveBayFor(eraId: string): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /Choose island/i }));
  fireEvent.click(screen.getByTestId(`archipelago-select-${eraId}`));
  await waitFor(
    () =>
      expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
        "data-selected-era",
        eraId,
      ),
    { timeout: 20_000 },
  );
  fireEvent.click(screen.getByTestId("archipelago-primary-action"));
  await waitFor(
    () => {
      expect(screen.queryByTestId("archipelago-overview")).toBeNull();
      expect(new URL(window.location.href).searchParams.get("era")).toBe(eraId);
    },
    { timeout: 20_000 },
  );
}

function expectUsableCityWithoutForcedPlacement(): void {
  expect(placementControls()).toHaveLength(0);
  expect(screen.queryByRole("dialog", { name: /new buildings? unlocked/i })).toBeNull();
  expect(screen.getByRole("button", { name: "Build" })).toBeEnabled();
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

test("Presenter Bay never carries a pending build onto a founded era", {
  timeout: 90_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(null, "", "/demo?presenter=1");
  render(<App />);
  await screen.findByRole("button", { name: "Build" });

  // The live demo intentionally offers one real target. Begin that placement, then leave
  // through the same always-available Bay action a presenter uses on stage.
  expect(await startPresenterPlacement("neolithic")).toBe("RAD.3");
  await openPresenterBay();
  await leaveBayFor("prehistoric");

  // Regression: the Neolithic ghost and "Build here" bar used to survive this landfall,
  // become blocked against Prehistoric ground, and force the presenter to resolve it.
  expectUsableCityWithoutForcedPlacement();

  // Every Presenter fixture is already founded. Switching to another one and back must be
  // navigation only, including entering the standing island again as a route round-trip.
  await openPresenterBay();
  await leaveBayFor("industrial");
  expectUsableCityWithoutForcedPlacement();
  await openPresenterBay();
  await leaveBayFor("prehistoric");
  expectUsableCityWithoutForcedPlacement();
  await openPresenterBay();
  fireEvent.click(screen.getByTestId("archipelago-primary-action"));
  await waitFor(() => expect(screen.queryByTestId("archipelago-overview")).toBeNull());
  expectUsableCityWithoutForcedPlacement();

  // Forward travel does not auto-place anything. The destination's intentionally unbuilt
  // target remains a legitimate placement only after the presenter explicitly chooses Build.
  await openPresenterBay();
  await leaveBayFor("neolithic");
  expectUsableCityWithoutForcedPlacement();
  expect(await startPresenterPlacement("neolithic")).toBe("RAD.3");
});
