import { lessonMaterialAmountAfterFounding, materialForNode } from "@cr/economy";
import { getEraOrThrow } from "@cr/skill-graph";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DEV_STUDENT_KEY, LocalSessionProvider } from "../auth/LocalSessionProvider";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { resetCityEra, setCityEraForPreview } from "../city/useCityEra";
import { interleavedPoolItems } from "../lessons/interleavedPool";
import { readReviewMistakes } from "../lessons/mistakeStore";
import { practiceItemsById } from "../lessons/practiceChecker";
import { runtimeStorage } from "../storage/runtimeStorage";
import {
  PresenterMenuEraControl,
  PresenterShell,
  usePresenterRegistration,
} from "./PresenterShell";
import { presenterFixtureFor, presenterUnbuiltNodeId } from "./presenterFixtures";

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
  vi.unstubAllEnvs();
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

test("the primary presenter URL mounts the real city, not a standalone launcher", async () => {
  window.history.replaceState(null, "", "/demo?presenter=1");
  const { App } = await import("../App");
  render(<App />);

  expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const presenterMenu = await screen.findByTestId("presenter-era-menu");
  expect(presenterMenu).toBeVisible();
  expect(
    within(presenterMenu).getByRole("combobox", { name: "Presenter target era" }),
  ).toHaveValue("neolithic");
  expect(screen.queryByRole("heading", { name: "Presentation showcase" })).toBeNull();
  expect(document.querySelector(".showcase-navigator")).toBeNull();
  expect(screen.queryByRole("complementary", { name: "Demo storage" })).toBeNull();
});

test("legacy showcase URLs normalize into the real city presenter mode", async () => {
  window.history.replaceState(null, "", "/demo?showcase=v1&scenario=bronze-city");
  const { App } = await import("../App");
  render(<App />);

  expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  expect(await screen.findByTestId("presenter-era-menu")).toBeVisible();
  expect(new URL(window.location.href).searchParams.get("presenter")).toBe("1");
  expect(new URL(window.location.href).searchParams.has("showcase")).toBe(false);
});

test("ordinary demo remains ordinary and account/local lookalikes expose no presenter control", async () => {
  const { App } = await import("../App");

  window.history.replaceState(null, "", "/demo");
  const ordinary = render(<App />);
  expect(
    await screen.findByText(/Progress is stored only on this device/i),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Unlock & build era" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Review" })).toBeNull();
  expect(screen.queryByRole("navigation", { name: "Presenter actions" })).toBeNull();
  ordinary.unmount();

  window.history.replaceState(null, "", "/?presenter=1");
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Remedial Calculus" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Unlock & build era" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Review" })).toBeNull();
  expect(screen.queryByRole("navigation", { name: "Presenter actions" })).toBeNull();
});

test.each([
  { route: "/demo", expectedEra: "neolithic" },
  { route: "/demo?era=industrial", expectedEra: "industrial" },
])(
  "the ordinary demo Presenter entry targets $expectedEra from $route",
  async ({ route, expectedEra }) => {
    window.history.replaceState(null, "", route);
    const { App } = await import("../App");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start at Era 1" }));
    await screen.findByRole("button", { name: "Build" });
    const onboardingSkip = screen.queryByTestId("onboarding-advisor-skip");
    if (onboardingSkip) {
      fireEvent.click(onboardingSkip);
    }
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const entry = await screen.findByRole<HTMLAnchorElement>("link", {
      name: "Open Presenter mode",
    });
    expect(new URL(entry.href).searchParams.get("era")).toBe(expectedEra);
  },
);

test("the real city exposes six shortcuts while detailed presenter setup stays in Menu", async () => {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=city",
  );
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Presenter target era" })).toBeNull();
  const bar = screen.getByTestId("presenter-bottom-bar");
  expect(
    within(bar)
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual(["Slides", "Lesson", "Practice", "Review", "AI work", "Bay"]);
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const presenterMenu = await screen.findByTestId("presenter-era-menu");
  expect(
    within(presenterMenu).getByRole("combobox", { name: "Presenter target era" }),
  ).toHaveValue("neolithic");
  expect(
    within(presenterMenu).getByRole("button", { name: "Unlock & build era" }),
  ).toBeVisible();
});

test("the presenter bottom bar exposes exactly the six audience-safe actions", async () => {
  window.history.replaceState(null, "", "/demo?presenter=1&surface=city");
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  const bar = screen.getByRole("navigation", { name: "Presenter actions" });
  expect(
    within(bar)
      .getAllByRole("button")
      .map((button) => button.textContent),
  ).toEqual(["Slides", "Lesson", "Practice", "Review", "AI work", "Bay"]);
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(within(bar).queryByRole("button", { name: /Reset|Unlock|Target/i })).toBeNull();
});

test("the explicit Review route opens a deterministic canonical missed-item queue", async () => {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=review&era=bronze_age",
  );
  const { App } = await import("../App");
  render(<App />);

  expect(await screen.findByText("Review mistake · 3 remaining")).toBeInTheDocument();
  expect(new URL(window.location.href).searchParams.get("surface")).toBe("review");
  const storage = runtimeStorage();
  const learnerId = storage?.getItem(DEV_STUDENT_KEY);
  expect(learnerId).toBeTruthy();
  expect(
    readReviewMistakes(learnerId as string, "bronze_age", storage).map(
      (entry) => entry.itemVersionId,
    ),
  ).toEqual(
    interleavedPoolItems("bronze_age", "all")
      .slice(0, 3)
      .map((item) => item.item_version_id),
  );
});

test("correct answers clear the Presenter queue through the real empty Review state", async () => {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=review&era=bronze_age",
  );
  const { App } = await import("../App");
  render(<App />);

  await screen.findByText("Review mistake · 3 remaining");
  const storage = runtimeStorage();
  const learnerId = storage?.getItem(DEV_STUDENT_KEY);
  if (!storage || !learnerId) {
    throw new Error("the Presenter review test has no disposable learner storage");
  }

  for (const remaining of [2, 1, 0]) {
    const current = readReviewMistakes(learnerId, "bronze_age", storage)[0];
    const item = current ? practiceItemsById.get(current.itemVersionId) : undefined;
    if (!item || typeof item.answer.answer_key !== "string") {
      throw new Error("the seeded Presenter review item has no canonical text answer");
    }
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: item.answer.answer_key },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    if (remaining > 0) {
      expect(
        await screen.findByText(`Review mistake · ${remaining} remaining`),
      ).toBeInTheDocument();
    }
  }

  expect(await screen.findByTestId("review-mistakes-empty")).toHaveTextContent(
    "No mistakes to review yet",
  );
  expect(readReviewMistakes(learnerId, "bronze_age", storage)).toEqual([]);
});

test("city and Slides round trips retain the partly cleared Presenter review queue", async () => {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=review&era=bronze_age",
  );
  const { App } = await import("../App");
  render(<App />);

  await screen.findByText("Review mistake · 3 remaining");
  const storage = runtimeStorage();
  const learnerId = storage?.getItem(DEV_STUDENT_KEY);
  const current = learnerId
    ? readReviewMistakes(learnerId, "bronze_age", storage)[0]
    : undefined;
  const item = current ? practiceItemsById.get(current.itemVersionId) : undefined;
  if (!item || typeof item.answer.answer_key !== "string") {
    throw new Error("the seeded Presenter review item has no canonical text answer");
  }
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: item.answer.answer_key },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(await screen.findByText("Review mistake · 2 remaining")).toBeInTheDocument();

  const back = screen.getAllByRole("button", { name: "Back to city" })[0];
  if (!back) {
    throw new Error("Presenter Review exposed no Back to city action");
  }
  fireEvent.click(back);
  await screen.findByRole("button", { name: "Build" });
  const bar = screen.getByRole("navigation", { name: "Presenter actions" });
  fireEvent.click(within(bar).getByRole("button", { name: "Review" }));
  expect(await screen.findByText("Review mistake · 2 remaining")).toBeInTheDocument();

  fireEvent.click(within(bar).getByRole("button", { name: "Slides" }));
  await screen.findByTestId("presenter-deck");
  fireEvent.keyDown(window, { key: "End" });
  fireEvent.click(await screen.findByRole("button", { name: "Enter live demo" }));
  await waitFor(() => expect(screen.queryByTestId("presenter-deck")).toBeNull());
  expect(await screen.findByText("Review mistake · 2 remaining")).toBeInTheDocument();
  expect(new URL(window.location.href).searchParams.get("surface")).toBe("review");
});
test.each(["lesson", "practice"] as const)(
  "Presenter %s keeps completion controls off the navigation bar",
  async (surface) => {
    const request = {
      enabled: true,
      legacy: false,
      preset: "progress-foundation",
      surface,
      eraId: "classical",
    } as const;
    window.history.replaceState(
      null,
      "",
      `/demo?presenter=1&preset=progress-foundation&surface=${surface}&era=classical`,
    );

    function SurfaceHarness() {
      return <p data-testid="failed-completion-surface">{surface} remains open</p>;
    }

    render(
      <LocalSessionProvider>
        <PresenterShell request={request}>
          <SurfaceHarness />
        </PresenterShell>
      </LocalSessionProvider>,
    );
    expect(screen.getByTestId("failed-completion-surface")).toBeVisible();
    expect(
      within(screen.getByRole("navigation", { name: "Presenter actions" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Slides", "Lesson", "Practice", "Review", "AI work", "Bay"]);
    expect(
      screen.queryByRole("button", { name: /Complete lesson|Complete practice/ }),
    ).toBeNull();
    expect(new URL(window.location.href).searchParams.get("surface")).toBe(surface);
  },
);

test("the presenter Bay action opens the focused carousel on Era 2", async () => {
  window.history.replaceState(null, "", "/demo?presenter=1&surface=city");
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Bay" },
    ),
  );

  await waitFor(() => expect(screen.getByTestId("archipelago-overview")).toBeVisible(), {
    timeout: 15_000,
  });
  const bay = screen.getByTestId("archipelago-overview");
  expect(bay).toHaveAttribute("data-view", "focus");
  expect(bay).toHaveAttribute("data-selected-era", "neolithic");
  expect(new URL(window.location.href).searchParams.get("surface")).toBe("bay");
  expect(
    screen.getByRole("button", { name: /Return to Era 2, already (?:on|at) Era 2/i }),
  ).toBeDisabled();
});

test.each([
  { source: "bronze_age", destination: "prehistoric" },
  { source: "industrial", destination: "classical" },
] as const)(
  "Lesson and Practice return to $destination after backward sailing from $source",
  async ({ source, destination }) => {
    window.history.replaceState(
      null,
      "",
      `/demo?presenter=1&preset=progress-construction&surface=city&era=${source}`,
    );
    const { App } = await import("../App");
    render(<App />);

    await screen.findByRole("button", { name: "Build" });
    const city = document.querySelector(".city-surface");
    const sourcePlots = [
      ...document.querySelectorAll<HTMLElement>(".city-backdrop-node"),
    ].map((node) => node.textContent);
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
        "button",
        { name: "Bay" },
      ),
    );
    await screen.findByTestId("archipelago-overview");
    fireEvent.click(
      screen.getByRole("button", {
        name: /Choose island/i,
      }),
    );
    fireEvent.click(screen.getByTestId(`archipelago-select-${destination}`));
    const sailBack = await screen.findByTestId("archipelago-primary-action");
    await waitFor(() =>
      expect(sailBack).toHaveTextContent(
        `Sail to ${getEraOrThrow(destination).name.replace(/ Era$/, "")}`,
      ),
    );
    fireEvent.click(sailBack);

    await waitFor(() => {
      expect(screen.queryByTestId("archipelago-overview")).toBeNull();
      expect(new URL(window.location.href).searchParams.get("era")).toBe(destination);
    });
    const destinationPlots = [
      ...document.querySelectorAll<HTMLElement>(".city-backdrop-node"),
    ].map((node) => node.textContent);
    expect(destinationPlots.length).toBeGreaterThanOrEqual(4);

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
        "button",
        { name: "Lesson" },
      ),
    );
    expect(
      await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Rise over run")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete lesson" }));
    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
      expect(new URL(window.location.href).searchParams.get("era")).toBe(destination);
    });
    const lessonReceipt = await screen.findByRole("alertdialog");
    expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
    dismissCompletionReward();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
        "button",
        { name: "Practice" },
      ),
    );
    const practice = await waitFor(() => {
      const mounted = document.querySelector<HTMLElement>(
        '.lesson-practice[data-node-id="LF.1"]',
      );
      expect(mounted).not.toBeNull();
      return mounted as HTMLElement;
    });
    expect(practice.dataset.templateId).toMatch(/^d7\.lf1\./);
    fireEvent.click(screen.getByRole("button", { name: "Complete practice" }));

    await waitFor(() => {
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
      expect(new URL(window.location.href).searchParams.get("era")).toBe(destination);
    });
    const receipt = await screen.findByRole("alertdialog");
    expect(receipt).toHaveTextContent("Practice complete");
    fireEvent.click(within(receipt).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(document.querySelector(".city-surface")).toBe(city);
    expect(
      [...document.querySelectorAll<HTMLElement>(".city-backdrop-node")].map(
        (node) => node.textContent,
      ),
    ).toEqual(destinationPlots);

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
        "button",
        { name: "Bay" },
      ),
    );
    await screen.findByTestId("archipelago-overview");
    fireEvent.click(
      screen.getByRole("button", {
        name: /Choose island/i,
      }),
    );
    fireEvent.click(screen.getByTestId(`archipelago-select-${source}`));
    const sailForward = await screen.findByTestId("archipelago-primary-action");
    await waitFor(() =>
      expect(sailForward).toHaveTextContent(
        `Sail to ${getEraOrThrow(source).name.replace(/ Era$/, "")}`,
      ),
    );
    fireEvent.click(sailForward);
    await waitFor(() =>
      expect(new URL(window.location.href).searchParams.get("era")).toBe(source),
    );
    expect(document.querySelector(".city-surface")).toBe(city);
    expect(
      [...document.querySelectorAll<HTMLElement>(".city-backdrop-node")].map(
        (node) => node.textContent,
      ),
    ).toEqual(sourcePlots);
  },
);

test("the target-era action builds the selected city and URL in-app", async () => {
  let unloaded = 0;
  window.addEventListener("beforeunload", () => {
    unloaded += 1;
  });
  window.history.replaceState(null, "", "/demo?presenter=1");
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const presenterMenu = await screen.findByTestId("presenter-era-menu");
  fireEvent.change(
    within(presenterMenu).getByRole("combobox", { name: "Presenter target era" }),
    {
      target: { value: "classical" },
    },
  );
  fireEvent.click(
    within(presenterMenu).getByRole("button", { name: "Unlock & build era" }),
  );

  await waitFor(() =>
    expect(new URL(window.location.href).searchParams.get("era")).toBe("classical"),
  );
  dismissCompletionReward();
  expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
  expect(unloaded).toBe(0);
});

test("a locked target becomes progression-ready and survives the slide round-trip", async () => {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=bronze-city&surface=city&era=bronze_age",
  );
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const presenterMenu = await screen.findByTestId("presenter-era-menu");
  const target = within(presenterMenu).getByRole<HTMLSelectElement>("combobox", {
    name: "Presenter target era",
  });
  fireEvent.change(target, { target: { value: "cyberpunk" } });
  const unlock = within(presenterMenu).getByRole("button", { name: "Unlock & build era" });
  fireEvent.click(unlock);

  await waitFor(() =>
    expect(new URL(window.location.href).searchParams.get("era")).toBe("cyberpunk"),
  );
  expect(await screen.findByText(/Cyberpunk.*ready/i)).toBeVisible();
  expect(screen.queryByText(/new buildings unlocked/i)).toBeNull();
  const era = getEraOrThrow("cyberpunk");
  dismissCompletionReward();
  const unbuiltNodeId = presenterUnbuiltNodeId(era.id);
  fireEvent.click(await screen.findByRole("button", { name: "Build" }));
  const shop = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  expect(within(shop).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  fireEvent.click(within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ }));
  const built = within(shop).getByRole("group", { name: "Built" });
  for (const nodeId of era.nodes) {
    const row = built.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`);
    expect(row, `${nodeId} is absent from the ready target roster`).not.toBeNull();
    if (nodeId === unbuiltNodeId) {
      expect(row).toHaveAttribute("data-empty", "true");
    } else {
      expect(row).not.toHaveAttribute("data-empty");
    }
    expect(row).toHaveTextContent(
      nodeId === unbuiltNodeId
        ? /Not built|Ready to build/i
        : /Complete|Mastered|Not started|Foundation/i,
    );
  }
  fireEvent.click(within(shop).getByRole("button", { name: "Close build menu" }));

  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Slides" },
    ),
  );
  expect(await screen.findByTestId("presenter-deck")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "End" });
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Enter live demo",
    }),
  );
  await waitFor(() => expect(screen.queryByTestId("presenter-deck")).toBeNull());
  expect(new URL(window.location.href).searchParams.get("era")).toBe("cyberpunk");
  fireEvent.click(await screen.findByRole("button", { name: "Build" }));
  const returnedShop = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  expect(within(returnedShop).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  fireEvent.click(
    within(returnedShop).getByRole("button", {
      name: /^Built \d+\/\d+$/,
    }),
  );
  const returnedBuilt = within(returnedShop).getByRole("group", { name: "Built" });
  for (const nodeId of era.nodes) {
    const row = returnedBuilt.querySelector(`[data-node-id="${nodeId}"]`);
    expect(row, `${nodeId} disappeared after returning from slides`).not.toBeNull();
    if (nodeId === unbuiltNodeId) {
      expect(row).toHaveAttribute("data-empty", "true");
    } else {
      expect(row).not.toHaveAttribute("data-empty");
    }
  }
});

test("real LF.1 Presenter practice advances the target, returns, then shows its receipt", async () => {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=practice&era=atomic_age",
  );
  const { App } = await import("../App");
  render(<App />);

  expect(
    await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
  ).toBeInTheDocument();
  const practice = await waitFor(() => {
    const mounted = document.querySelector<HTMLElement>(
      '.lesson-practice[data-node-id="LF.1"]',
    );
    expect(mounted).not.toBeNull();
    return mounted as HTMLElement;
  });
  expect(practice.dataset.templateId).toMatch(/^d7\.lf1\./);
  fireEvent.click(screen.getByRole("button", { name: "Complete practice" }));
  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector("[data-testid='presenter-lesson-demo']")).toBeNull();
    expect(document.querySelector(".lesson-practice__result")).toBeNull();
    expect(document.querySelector(".city-surface")).not.toBeNull();
  });

  const receipt = await screen.findByRole("alertdialog");
  expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
  expect(within(receipt).getByText("Practice complete")).toBeInTheDocument();
  expect(receipt).not.toHaveTextContent("Skill building complete");
  const material = materialForNode("LF.1");
  if (material === null) {
    throw new Error("LF.1 has no canonical era material");
  }
  expect(
    within(receipt).getByRole("heading", {
      name: `+${lessonMaterialAmountAfterFounding("LF.1")} ${material.display_name}`,
    }),
  ).toBeInTheDocument();

  fireEvent.click(within(receipt).getByRole("button", { name: "Continue" }));
  fireEvent.click(await screen.findByRole("button", { name: "Build" }));
  const buildDialog = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  expect(within(buildDialog).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(within(buildDialog).getByRole("tab", { name: "Civic" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
  expect(
    within(buildDialog).getByRole("heading", { name: "Choose a skill to build" }),
  ).toBeInTheDocument();
  fireEvent.click(within(buildDialog).getByRole("button", { name: /^Built \d+\/\d+$/ }));
  await waitFor(() =>
    expect(buildDialog.querySelector('button[data-node-id="LF.1"]')).toHaveTextContent(
      /Complete|Mastered/i,
    ),
  );
});

test("LF.1 completion returns to the Atomic city before contextual practice", async () => {
  window.history.replaceState(null, "", "/demo?presenter=1&era=atomic_age");
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Lesson" },
    ),
  );
  await screen.findByRole("navigation", { name: "Presenter actions" });
  await screen.findByRole("button", { name: "Complete lesson" });
  fireEvent.click(screen.getByRole("button", { name: "Complete lesson" }));
  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector(".world-scene")).toBeNull();
  });
  const lessonReceipt = await screen.findByRole("alertdialog");
  expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
  expect(
    within(lessonReceipt).getByRole("heading", { name: "Lesson complete!" }),
  ).toBeInTheDocument();
  dismissCompletionReward();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Lesson" },
    ),
  ).toBeInTheDocument();

  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Practice" },
    ),
  );
  await screen.findByRole("navigation", { name: "Presenter actions" });
  await screen.findByRole("button", { name: "Complete practice" });
  fireEvent.click(screen.getByRole("button", { name: "Complete practice" }));
  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector("[data-testid='presenter-lesson-demo']")).toBeNull();
    expect(document.querySelector(".lesson-practice__result")).toBeNull();
  });
  const receipt = await screen.findByRole("alertdialog");
  expect(receipt).toHaveTextContent("Practice complete");
  expect(receipt).not.toHaveTextContent("Skill building complete");
});

test("the lesson opens on LF.1's worked calculation before its interaction", async () => {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=lesson&era=atomic_age",
  );
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("navigation", { name: "Presenter actions" });
  await screen.findByRole("button", { name: "Complete lesson" });
  expect(
    await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Rise over run")).toBeInTheDocument();
  expect(await screen.findByText("Worked example")).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /with a run of .* and a rise of/i })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(
    await screen.findByRole("img", { name: /with a run of .* and a rise of/i }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  expect(document.querySelector(".city-surface")).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Complete lesson" }));
  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector(".world-scene")).toBeNull();
  });
  const lessonReceipt = await screen.findByRole("alertdialog");
  expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
  dismissCompletionReward();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Lesson" },
    ),
  ).toBeInTheDocument();
});

test("the work destination locally stages a photo before the deterministic result", async () => {
  const fetchSpy = vi.fn(async () => {
    throw new Error("the presenter fixture must not call the network");
  });
  vi.stubGlobal("fetch", fetchSpy);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=work",
  );
  const { App } = await import("../App");
  render(<App />);

  expect(
    await screen.findByRole("heading", { name: "Photo work feedback" }),
  ).toBeInTheDocument();
  expect(document.querySelector(".city-surface")).not.toBeNull();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(screen.queryByLabelText("Add a photo of your work")).toBeNull();
  const input = screen.getByLabelText("Choose a photo of your work");
  expect(input).toHaveAttribute("accept", "image/*");
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();
  fireEvent.change(input, {
    target: {
      files: [
        new File([new Uint8Array([1, 2, 3])], "solution.jpg", { type: "image/jpeg" }),
      ],
    },
  });
  expect(await screen.findByRole("status", { name: "Checking your work" })).toBeVisible();
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();

  expect(
    await screen.findByTestId("presenter-work-result", {}, { timeout: 3_000 }),
  ).toBeInTheDocument();
  expect(screen.getByText("Last correct line")).toBeInTheDocument();
  expect(screen.getByText("First incorrect line")).toBeInTheDocument();
  expect(screen.getByText("Correct transformation")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "That's not what I wrote" }));
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();
  expect(screen.getByTestId("presenter-work-upload")).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("AI work clears an open Town Hall popover and opens only the checker", async () => {
  const request = {
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId: "bronze_age",
  } as const;
  const fixture = presenterFixtureFor(request);
  setCityEraForPreview("bronze_age");
  const citySession = createCityDevSession(null, fixture.city.seed);
  function Harness() {
    const presenter = usePresenterRegistration();
    return (
      <CitySurface
        enableCanvas={false}
        loadCity={citySession.load}
        activityToken={presenter.navigationToken}
        presenterMenuTools={(closeMenu) => <PresenterMenuEraControl onClose={closeMenu} />}
      />
    );
  }
  render(
    <LocalSessionProvider>
      <PresenterShell request={request}>
        <Harness />
      </PresenterShell>
    </LocalSessionProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Build" }));
  const buildDialog = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  fireEvent.click(within(buildDialog).getByRole("button", { name: /^Built \d+\/\d+$/ }));
  fireEvent.click(await screen.findByTestId("town-hall-roster-entry"));
  expect(await screen.findByTestId("town-hall-panel")).toBeInTheDocument();

  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "AI work" },
    ),
  );

  expect(
    await screen.findByRole("heading", { name: "Photo work feedback" }),
  ).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByTestId("town-hall-panel")).toBeNull());
});
