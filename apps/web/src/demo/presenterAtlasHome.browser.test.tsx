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
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { resetCityEra } from "../city/useCityEra";

import "../styles.css";

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const ERA_TWO = "neolithic";

function overlaps(a: Box, b: Box): boolean {
  return !(
    a.right <= b.left ||
    b.right <= a.left ||
    a.bottom <= b.top ||
    b.bottom <= a.top
  );
}

async function expectFocusedBay(eraId: string): Promise<HTMLElement> {
  const overview = await screen.findByTestId("archipelago-overview", undefined, {
    timeout: 20_000,
  });
  await waitFor(() => {
    expect(overview).toHaveAttribute("data-view", "focus");
    expect(overview).toHaveAttribute("data-selected-era", eraId);
    expect(overview).toHaveAttribute("data-standing-era", eraId);
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("bay");
    expect(new URL(window.location.href).searchParams.get("era")).toBe(eraId);
  });
  return overview;
}

async function openPresenterBay(): Promise<HTMLElement> {
  within(screen.getByRole("navigation", { name: "Presenter actions" }))
    .getByRole<HTMLButtonElement>("button", { name: "Bay" })
    .click();
  return expectFocusedBay(ERA_TWO);
}

function expectHomeActionFits(viewport: {
  readonly width: number;
  readonly height: number;
}): HTMLButtonElement {
  const action = screen.getByRole<HTMLButtonElement>("button", {
    name: /Return to Era 2/i,
  });
  const actionBox = action.getBoundingClientRect();
  const barBox = screen
    .getByRole("navigation", { name: "Presenter actions" })
    .getBoundingClientRect();

  expect(action).toBeVisible();
  expect(actionBox.width).toBeGreaterThanOrEqual(44);
  expect(actionBox.height).toBeGreaterThanOrEqual(44);
  expect(actionBox.left).toBeGreaterThanOrEqual(0);
  expect(actionBox.top).toBeGreaterThanOrEqual(0);
  expect(actionBox.right).toBeLessThanOrEqual(viewport.width);
  expect(actionBox.bottom).toBeLessThanOrEqual(viewport.height);
  expect(overlaps(actionBox, barBox), "Era 2 action overlaps the Presenter bar").toBe(
    false,
  );
  return action;
}

async function expectRenderedEraTwoCity(): Promise<void> {
  await screen.findByRole("button", { name: "Build" });
  await waitFor(() => {
    const url = new URL(window.location.href);
    expect(url.searchParams.get("surface")).toBe("city");
    expect(url.searchParams.get("era")).toBe(ERA_TWO);
  });
  expect(screen.queryByTestId("archipelago-overview")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Build" }));
  const shop = await screen.findByRole("dialog", { name: "Choose a skill to build" });
  expect(within(shop).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(within(shop).getByRole("tab", { name: /Neolithic Era/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const row = within(shop).getByRole("list", {
    name: /Neolithic Era skill buildings to place/i,
  });
  expect(row.querySelector(":scope > .build-card")).toHaveAttribute(
    "data-node-id",
    "RAD.3",
  );
  expect(row.querySelector(":scope > .build-card")).toHaveTextContent("Meeting House");
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

for (const viewport of [
  { width: 1024, height: 580, name: "1024x580" },
  { width: 390, height: 580, name: "390x580" },
] as const) {
  test(`Presenter Bay opens the focused Era 2 carousel at ${viewport.name}`, {
    timeout: 60_000,
  }, async () => {
    await page.viewport(viewport.width, viewport.height);
    window.history.replaceState(
      null,
      "",
      "/demo?presenter=1&preset=progress-foundation&surface=city",
    );
    render(<App />);
    await screen.findByRole("button", { name: "Build" });

    const overview = await openPresenterBay();
    expect(overview).toHaveAttribute("data-selected-era", ERA_TWO);
    expect(screen.getByRole("heading", { name: "Neolithic Era" })).toBeVisible();
    const home = expectHomeActionFits(viewport);
    expect(home).toBeDisabled();
    expect(home).toHaveAccessibleName(/already (?:on|at) Era 2/i);
  });

  test(`Presenter focused island returns directly to the rendered Era 2 city at ${viewport.name}`, {
    timeout: 90_000,
  }, async () => {
    await page.viewport(viewport.width, viewport.height);
    window.history.replaceState(
      null,
      "",
      "/demo?presenter=1&preset=progress-foundation&surface=bay&era=industrial",
    );
    render(<App />);

    await expectFocusedBay("industrial");
    const home = expectHomeActionFits(viewport);
    expect(home).toBeEnabled();
    fireEvent.click(home);
    await expectRenderedEraTwoCity();
  });
}

test("ordinary learner focused Bay has no Presenter Era 2 shortcut", {
  timeout: 30_000,
}, async () => {
  await page.viewport(1024, 580);
  const session = createCityDevSession();
  render(
    <div className="city-shell">
      <CitySurface
        bayAvailable
        enableCanvas={false}
        initialEntry={{ kind: "bay" }}
        loadCity={session.load}
        reducedMotion
      />
    </div>,
  );
  const overview = await screen.findByTestId("archipelago-overview", undefined, {
    timeout: 20_000,
  });
  expect(overview).toHaveAttribute("data-view", "focus");
  expect(screen.queryByRole("button", { name: /Return to Era 2/i })).toBeNull();
});
