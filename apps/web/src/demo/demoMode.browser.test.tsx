import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { CitySurface } from "../city/CitySurface";
import { ERA_STATE_STORAGE_KEY } from "../city/eraState";
import { resetCityEra } from "../city/useCityEra";
import { DemoModeNotice } from "./DemoModeNotice";
import { DEMO_CRISES } from "./demoRoutes";

import "../styles.css";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
  resetCityEra();
});

test("the device-only notice is visible and its reset control is operable", async () => {
  const reset = vi.fn();
  render(<DemoModeNotice onReset={reset} />);

  expect(screen.getByText(/Progress is stored only on this device/i)).toBeVisible();
  await userEvent.setup().click(screen.getByRole("button", { name: "Reset demo" }));
  expect(reset).toHaveBeenCalledTimes(1);
});

test("the device-only notice leaves the phone Build control reachable", {
  timeout: 60_000,
}, async () => {
  await page.viewport(390, 580);
  render(
    <div className="city-shell">
      <CitySurface enableCanvas={false} enableOnboardingDemo={false} />
      <DemoModeNotice onReset={() => undefined} />
    </div>,
  );

  const build = await screen.findByRole("button", { name: "Build" });
  const notice = screen.getByRole("complementary", { name: "Demo storage" });
  const noticeBox = notice.getBoundingClientRect();

  for (const control of [build]) {
    const box = control.getBoundingClientRect();
    const overlapWidth = Math.max(
      0,
      Math.min(box.right, noticeBox.right) - Math.max(box.left, noticeBox.left),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(box.bottom, noticeBox.bottom) - Math.max(box.top, noticeBox.top),
    );
    expect(
      overlapWidth * overlapHeight,
      `${control.textContent} is covered by the demo notice`,
    ).toBe(0);
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    expect(hit !== null && control.contains(hit)).toBe(true);
  }
});

for (const viewport of [
  { width: 390, height: 580, name: "phone" },
  { width: 1024, height: 580, name: "short desktop" },
  { width: 1440, height: 900, name: "desktop" },
] as const) {
  test.runIf(import.meta.env.VITE_DEMO_MODE === "true")(
    `plain /demo exposes an unobscured Presenter Menu entry at ${viewport.name}`,
    async () => {
      await page.viewport(viewport.width, viewport.height);
      vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
      vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
      vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
      window.history.replaceState(null, "", "/demo");
      const { App } = await import("../App");
      render(<App />);
      const user = userEvent.setup();

      expect(screen.queryByTestId("presenter-mode-menu-entry")).toBeNull();
      await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
      await screen.findByRole("button", { name: "Build" });
      await user.click(await screen.findByTestId("onboarding-advisor-skip"));
      expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
      expect(screen.queryByRole("navigation", { name: "Presenter actions" })).toBeNull();
      await user.click(screen.getByRole("button", { name: "Menu" }));
      const launcher = await screen.findByRole<HTMLAnchorElement>("link", {
        name: "Open Presenter mode",
      });
      const notice = screen.getByRole("complementary", { name: "Demo storage" });
      expect(launcher).toBeVisible();
      expect(launcher).toHaveTextContent("Presenter mode");

      const launcherBox = launcher.getBoundingClientRect();
      const noticeBox = notice.getBoundingClientRect();
      const achievementBox = document
        .querySelector<HTMLElement>(".achievement-note")
        ?.getBoundingClientRect();
      if (achievementBox) {
        expect(
          Math.max(
            0,
            Math.min(launcherBox.right, achievementBox.right) -
              Math.max(launcherBox.left, achievementBox.left),
          ) *
            Math.max(
              0,
              Math.min(launcherBox.bottom, achievementBox.bottom) -
                Math.max(launcherBox.top, achievementBox.top),
            ),
          "an achievement moment covers the Presenter Menu entry",
        ).toBe(0);
      }
      expect(launcherBox.width).toBeGreaterThanOrEqual(44);
      expect(launcherBox.height).toBeGreaterThanOrEqual(44);
      expect(
        Math.max(
          0,
          Math.min(launcherBox.right, noticeBox.right) -
            Math.max(launcherBox.left, noticeBox.left),
        ) *
          Math.max(
            0,
            Math.min(launcherBox.bottom, noticeBox.bottom) -
              Math.max(launcherBox.top, noticeBox.top),
          ),
        "the Demo mode notice covers the Presenter launcher",
      ).toBe(0);
      expect(
        launcher.contains(
          document.elementFromPoint(
            launcherBox.left + launcherBox.width / 2,
            launcherBox.top + launcherBox.height / 2,
          ),
        ),
        "another layer owns the Presenter launcher's click point",
      ).toBe(true);

      const target = new URL(launcher.href);
      expect(target.pathname).toBe("/demo");
      expect(target.searchParams.get("presenter")).toBe("1");
      expect(target.searchParams.get("slides")).toBe("1");
    },
  );
}

test.runIf(import.meta.env.VITE_DEMO_MODE === "true")(
  "a production demo exposes learner features without debug controls or a backend request",
  async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
    window.history.replaceState(null, "", "/demo");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { App } = await import("../App");
    render(<App />);
    const user = userEvent.setup();

    expect(
      await screen.findByText(/Progress is stored only on this device/i),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(await screen.findByTestId("onboarding-advisor")).toBeVisible();
    await user.click(screen.getByTestId("onboarding-advisor-skip"));

    await user.click(screen.getByRole("button", { name: "Menu" }));
    const presenterEntry = await screen.findByRole<HTMLAnchorElement>("link", {
      name: "Open Presenter mode",
    });
    expect(new URL(presenterEntry.href).searchParams.get("presenter")).toBe("1");
    expect(screen.queryByTestId("presenter-era-menu")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Presenter target era" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Unlock & build era" })).toBeNull();
    expect(await screen.findByTestId("menu-bay")).toBeVisible();
    expect(screen.queryByTestId("era-dev-skip")).toBeNull();
    expect(screen.queryByText(/Demo routes/i)).toBeNull();
    expect(screen.queryByTestId("dev-seed-crisis")).toBeNull();
    const backendCalls = fetchSpy.mock.calls
      .map(([input]) => (input instanceof Request ? input.url : String(input)))
      .filter((url) => {
        const target = new URL(url, window.location.href);
        return (
          target.pathname.startsWith("/api/") ||
          /cognito|amazonaws\.com/i.test(target.hostname)
        );
      });
    expect(backendCalls).toEqual([]);
  },
);

test.runIf(import.meta.env.VITE_DEMO_MODE === "true")(
  "an era preview is labelled, reachable, and does not advance the saved city",
  async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
    window.history.replaceState(null, "", "/demo?era=classical");
    const { App } = await import("../App");
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText(/Queued preview: era 4/i)).toBeVisible();
    expect(screen.getByTestId("demo-route-note")).toHaveTextContent(
      /outside normal progression/i,
    );
    await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
    await screen.findByRole("button", { name: "Build" });
    await user.click(screen.getByTestId("onboarding-advisor-skip"));
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText(/Classical Era/)).toBeVisible();
    expect(localStorage.getItem(ERA_STATE_STORAGE_KEY)).toBeNull();
  },
);

test.runIf(import.meta.env.VITE_DEMO_MODE === "true")(
  "every integrated crisis route launches in production demo, including Hard Winter",
  async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { App } = await import("../App");

    expect(DEMO_CRISES.length).toBeGreaterThanOrEqual(4);
    for (const crisis of DEMO_CRISES) {
      window.history.replaceState(null, "", `/demo?${crisis.param}`);
      const mounted = render(<App />);
      if (crisis.destination === "city") {
        expect(await screen.findByTestId("city-viewport")).toBeVisible();
        if (crisis.param === "succession") {
          expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
          expect(
            screen.getByRole("button", { name: /Face the succession/i }),
          ).toBeInTheDocument();
        }
      } else if (crisis.param === "plague") {
        expect(await screen.findByTestId("plague-in-city")).toBeVisible();
      } else {
        expect(
          await screen.findByTestId(`demo-crisis-route-${crisis.param}`),
        ).toHaveAccessibleName(`${crisis.label} preview`);
        await waitFor(
          () => expect(screen.queryByTestId("demo-crisis-route-loading")).toBeNull(),
          { timeout: 15_000 },
        );
      }
      expect(screen.queryByRole("heading", { name: "Remedial Calculus" })).toBeNull();

      if (crisis.param === "winter") {
        expect(
          await screen.findByText(
            "The Hard Winter",
            { selector: "h1" },
            { timeout: 15_000 },
          ),
        ).toBeVisible();
        expect(document.querySelector(".hw-shell")).not.toBeNull();
        expect(screen.getByTestId("crisis-call-advisor")).toBeVisible();
        expect(screen.queryByTestId("hw-dev-skip")).toBeNull();
      }
      if (crisis.param === "intrusion") {
        expect(await screen.findByTestId("relay-surface")).toHaveClass(
          "relay-surface--embedded",
        );
        expect(screen.getByTestId("relay-city-evidence")).toBeVisible();
      }
      mounted.unmount();
    }
    const backendCalls = fetchSpy.mock.calls
      .map(([input]) => (input instanceof Request ? input.url : String(input)))
      .filter((url) => {
        const target = new URL(url, window.location.href);
        return (
          target.pathname.startsWith("/api/") ||
          /cognito|amazonaws\.com/i.test(target.hostname)
        );
      });
    expect(backendCalls).toEqual([]);
  },
);
