import { getEraOrThrow } from "@cr/skill-graph";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { App } from "../App";
import { createApiCitySession } from "../city/apiCitySession";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { civicContributions, civicName } from "../city/civic";
import { TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEraForPreview } from "../city/useCityEra";
import { presenterFixtureFor, presenterUnbuiltNodeId } from "./presenterFixtures";

import "../styles.css";

vi.mock("../city/three/CityCanvasHost", () => ({
  CityCanvasHost: ({
    placed = [],
    townHall,
    onSelect,
    fallback,
  }: {
    placed?: readonly { readonly nodeId: string }[];
    townHall?: object | null;
    onSelect: (nodeId: string) => void;
    fallback: React.ReactNode;
  }) => (
    <div data-testid="presenter-building-scene">
      {fallback}
      {townHall && (
        <button
          type="button"
          data-testid="select-town-hall"
          onClick={() => onSelect(TOWN_HALL_ID)}
        >
          Select Town Hall
        </button>
      )}
      {placed.map((placement) => (
        <button
          key={placement.nodeId}
          type="button"
          data-testid={`select-${placement.nodeId}`}
          onClick={() => onSelect(placement.nodeId)}
        >
          Select placed building
        </button>
      ))}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

async function mountAtomicPresenter(): Promise<void> {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=bronze-city&surface=city&era=atomic_age",
  );
  render(<App />);
  await screen.findByRole("button", { name: "Build" });
}

async function civicConfirmation(): Promise<HTMLElement> {
  return waitFor(() => {
    const panel = screen.getByTestId("civic-panel");
    expect(panel).toHaveAttribute("data-confirming", "true");
    return panel;
  });
}

async function deleteSelected(nodeId: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByTestId(`select-${nodeId}`));
  const panel = await screen.findByRole("dialog");
  if (nodeId.startsWith("civic:")) {
    const action = `Delete ${civicName(nodeId)}`;
    await user.click(within(panel).getByRole("button", { name: action }));
    const confirmation = await civicConfirmation();
    expect(confirmation).toHaveTextContent(/spent .* will not be returned/i);
    expect(
      within(confirmation).getByRole("button", { name: "Keep building" }),
    ).toBeVisible();
    await user.click(within(confirmation).getByRole("button", { name: action }));
  } else {
    await user.click(within(panel).getByRole("button", { name: "Delete building" }));
  }
  await waitFor(() => expect(screen.queryByTestId(`select-${nodeId}`)).toBeNull());
}

test("Presenter deletes selected skill and civic buildings but the Town Hall refuses", async () => {
  await mountAtomicPresenter();
  const era = getEraOrThrow("atomic_age");
  const unbuiltNodeId = presenterUnbuiltNodeId(era.id);
  const skillNodeId = era.nodes.find(
    (nodeId) => nodeId !== "LF.1" && nodeId !== unbuiltNodeId,
  );
  if (!skillNodeId) {
    throw new Error("Atomic Age needs a non-focus skill for the deletion guard.");
  }
  await deleteSelected(skillNodeId);

  const civicButton = document.querySelector<HTMLButtonElement>(
    '[data-testid^="select-civic:"]',
  );
  expect(
    civicButton,
    "the progression-ready city retained no civic building",
  ).not.toBeNull();
  const civicId = civicButton?.dataset.testid?.replace(/^select-/, "");
  if (!civicId) {
    throw new Error("The selected Presenter civic had no placement id.");
  }
  await deleteSelected(civicId);
  expect(document.querySelector(".presenter-reward")).toBeNull();

  await userEvent.setup().click(screen.getByTestId("select-town-hall"));
  const hall = await screen.findByTestId("town-hall-panel");
  expect(within(hall).queryByRole("button", { name: "Delete building" })).toBeNull();
  expect(screen.getByTestId("select-town-hall")).toBeInTheDocument();
});

test("Presenter deletion survives slides and a real activity, then Reset restores it", async () => {
  await mountAtomicPresenter();
  const removedNodeId =
    getEraOrThrow("atomic_age").nodes.find(
      (nodeId) => nodeId !== "LF.1" && nodeId !== presenterUnbuiltNodeId("atomic_age"),
    ) ?? "";
  if (!removedNodeId) {
    throw new Error("Atomic Age needs a placed non-focus skill for the reset guard.");
  }
  await deleteSelected(removedNodeId);
  const civicButton = document.querySelector<HTMLButtonElement>(
    '[data-testid^="select-civic:"]',
  );
  expect(civicButton).not.toBeNull();
  const removedCivicId = civicButton?.dataset.testid?.replace(/^select-/, "") ?? "";
  await deleteSelected(removedCivicId);

  const presenterBar = screen.getByRole("navigation", { name: "Presenter actions" });
  fireEvent.click(within(presenterBar).getByRole("button", { name: "Slides" }));
  expect(await screen.findByTestId("presenter-deck")).toBeVisible();
  fireEvent.keyDown(window, { key: "End" });
  fireEvent.click(await screen.findByRole("button", { name: "Enter live demo" }));
  await screen.findByRole("button", { name: "Build" });
  expect(screen.queryByTestId(`select-${removedNodeId}`)).toBeNull();
  expect(screen.queryByTestId(`select-${removedCivicId}`)).toBeNull();

  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Lesson" },
    ),
  );
  expect(
    await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Complete lesson" }));
  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector(".world-scene")).toBeNull();
  });
  const lessonReceipt = await screen.findByRole("alertdialog");
  expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
  fireEvent.click(within(lessonReceipt).getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(screen.queryByTestId(`select-${removedNodeId}`)).toBeNull();
  expect(screen.queryByTestId(`select-${removedCivicId}`)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  fireEvent.click(
    within(await screen.findByTestId("presenter-era-menu")).getByRole("button", {
      name: "Reset presenter demo",
    }),
  );
  await waitFor(() =>
    expect(screen.getByTestId(`select-${removedNodeId}`)).toBeInTheDocument(),
  );
  expect(screen.getByTestId(`select-${removedCivicId}`)).toBeInTheDocument();
});

test("ordinary local and account-backed surfaces delete civics but never skills or Hall", async () => {
  setCityEraForPreview("atomic_age");
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId: "atomic_age",
  });
  const local = createCityDevSession(null, fixture.city.seed);
  const account = createApiCitySession({
    studentId: "signed-in-deletion-guard",
    load: local.load,
    save: vi.fn(async () => undefined),
    eraId: () => "atomic_age",
  });

  for (const [label, citySession] of [
    ["ordinary local", local],
    ["signed-in account", account],
  ] as const) {
    const mounted = render(
      <CitySurface
        loadCity={citySession.load}
        onRemoveCivic={citySession.removeCivic}
        enableOnboardingDemo={false}
        eraId="atomic_age"
        materialLabel="electricity"
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    await userEvent.setup().click(screen.getByTestId("select-LF.1"));
    const panel = await screen.findByRole("dialog");
    expect(
      within(panel).queryByRole("button", { name: "Delete building" }),
      label,
    ).toBeNull();

    await userEvent.setup().click(within(panel).getByRole("button", { name: "Close" }));
    const civicButton = document.querySelector<HTMLButtonElement>(
      '[data-testid^="select-civic:"]',
    );
    expect(civicButton, `${label} has no civic population`).not.toBeNull();
    const civicId = civicButton?.dataset.testid?.replace(/^select-/, "") ?? "";
    await userEvent.setup().click(civicButton as HTMLButtonElement);
    const civicPanel = await screen.findByTestId("civic-panel");
    const action = `Delete ${civicName(civicId)}`;
    await userEvent.setup().click(within(civicPanel).getByRole("button", { name: action }));
    const confirmation = await civicConfirmation();
    expect(confirmation).toHaveTextContent(civicName(civicId));
    expect(confirmation).toHaveTextContent(/will not be returned/i);
    expect(within(confirmation).getByRole("button", { name: action })).toBeVisible();
    expect(
      within(confirmation).getByRole("button", { name: "Keep building" }),
    ).toBeVisible();
    await userEvent
      .setup()
      .click(within(confirmation).getByRole("button", { name: "Keep building" }));
    expect(screen.getByTestId(`select-${civicId}`)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByTestId("select-town-hall"));
    const hall = await screen.findByTestId("town-hall-panel");
    expect(within(hall).queryByRole("button", { name: /Delete/ })).toBeNull();
    mounted.unmount();
    cleanup();
  }
});

test("a rejected account save keeps the civic visible and the specific retry operable", async () => {
  setCityEraForPreview("atomic_age");
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId: "atomic_age",
  });
  const source = createCityDevSession(null, fixture.city.seed);
  const save = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error("account save unavailable"))
    .mockResolvedValueOnce(undefined);
  const account = createApiCitySession({
    studentId: "signed-in-civic-rollback",
    load: source.load,
    save,
    eraId: () => "atomic_age",
  });
  render(
    <CitySurface
      loadCity={account.load}
      onRemoveCivic={account.removeCivic}
      materialLabel="electricity"
      eraId="atomic_age"
    />,
  );
  await screen.findByRole("button", { name: "Build" });
  const civicButton = document.querySelector<HTMLButtonElement>(
    '[data-testid^="select-civic:"]',
  );
  expect(civicButton).not.toBeNull();
  const civicId = civicButton?.dataset.testid?.replace(/^select-/, "") ?? "";
  const action = `Delete ${civicName(civicId)}`;

  await userEvent.setup().click(civicButton as HTMLButtonElement);
  await userEvent.setup().click(
    within(await screen.findByTestId("civic-panel")).getByRole("button", {
      name: action,
    }),
  );
  let confirmation = await civicConfirmation();
  await userEvent.setup().click(within(confirmation).getByRole("button", { name: action }));

  expect(await within(confirmation).findByRole("alert")).toHaveTextContent(
    /still standing.*try again/i,
  );
  expect(screen.getByTestId(`select-${civicId}`)).toBeInTheDocument();
  expect(await account.load()).toMatchObject({
    civic: expect.arrayContaining([expect.objectContaining({ nodeId: civicId })]),
  });

  confirmation = await civicConfirmation();
  await userEvent.setup().click(within(confirmation).getByRole("button", { name: action }));
  await waitFor(() => expect(screen.queryByTestId(`select-${civicId}`)).toBeNull());
  expect(save).toHaveBeenCalledTimes(2);
});

test("ordinary civic deletion immediately recomputes both city-life capacities", async () => {
  setCityEraForPreview("prehistoric");
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId: "prehistoric",
  });
  const civic = fixture.city.seed.civic?.find((placement) =>
    placement.nodeId.includes("prehistoric_longhouse"),
  );
  if (!civic) {
    throw new Error("The prehistoric fixture has no Longhouse for the vitality guard.");
  }
  const session = createCityDevSession(null, {
    ...fixture.city.seed,
    civic: [civic],
  });
  const contribution = civicContributions(civic.nodeId);
  expect(contribution).not.toBeNull();
  render(
    <CitySurface
      loadCity={session.load}
      onRemoveCivic={session.removeCivic}
      materialLabel="stone"
      eraId="prehistoric"
    />,
  );
  await screen.findByRole("button", { name: "Build" });
  const figure = (testId: string) =>
    Number(screen.getByTestId(testId).textContent?.match(/\d+/)?.[0] ?? Number.NaN);
  const livabilityBefore = figure("vitality-livability");
  const happinessBefore = figure("vitality-happiness");

  await userEvent.setup().click(screen.getByTestId(`select-${civic.nodeId}`));
  const action = `Delete ${civicName(civic.nodeId)}`;
  await userEvent.setup().click(
    within(await screen.findByTestId("civic-panel")).getByRole("button", {
      name: action,
    }),
  );
  await userEvent.setup().click(
    within(await civicConfirmation()).getByRole("button", {
      name: action,
    }),
  );

  await waitFor(() => {
    expect(figure("vitality-livability")).toBe(
      livabilityBefore - (contribution?.livability ?? 0),
    );
    expect(figure("vitality-happiness")).toBe(
      happinessBefore - (contribution?.happiness ?? 0),
    );
  });
  expect((await session.load()).civic).toEqual([]);
});
