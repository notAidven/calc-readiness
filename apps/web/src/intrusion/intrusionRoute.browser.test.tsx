import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import "../styles.css";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

test("a cold canonical Intrusion route opens the real populated Information Age city", {
  timeout: 45_000,
}, async () => {
  await page.viewport(1024, 580);
  vi.stubEnv("VITE_DEMO_MODE", "true");
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
  window.history.replaceState(null, "", "/demo?intrusion");

  const { App } = await import("../App");
  const firstMount = render(<App />);

  const relay = await screen.findByTestId("relay-surface", {}, { timeout: 20_000 });
  await waitFor(
    () => expect(document.querySelector(".city-viewport canvas")).not.toBeNull(),
    { timeout: 20_000 },
  );

  expect(relay).toHaveClass("relay-surface--embedded");
  expect(document.querySelector(".city-surface")).not.toBeNull();
  expect(screen.queryByTestId("demo-crisis-route-intrusion")).toBeNull();
  expect(screen.queryByTestId("onboarding-advisor")).toBeNull();
  expect(screen.queryByRole("complementary", { name: "Demo storage" })).toBeNull();
  expect(
    screen.getByTestId("relay-city-evidence").querySelectorAll("li").length,
  ).toBeGreaterThan(3);
  expect(screen.getByTestId("relay-city-evidence")).toHaveTextContent("Town Hall");
  expect(window.location.search).toContain("intrusion");

  document.querySelector<HTMLButtonElement>('[data-testid="relay-inspect"]')?.click();
  await waitFor(() => expect(document.querySelector('[data-action="cut"]')).not.toBeNull());
  document.querySelector<HTMLButtonElement>('[data-action="cut"]')?.click();
  await waitFor(() =>
    expect(document.querySelector('[data-testid="relay-armed"]')).not.toBeNull(),
  );
  firstMount.unmount();

  render(<App />);
  expect(await screen.findByTestId("relay-armed")).toBeVisible();
  expect(screen.getByTestId("relay-meter")).toHaveTextContent("4 of 9");
});

test("the standalone fixture flag is isolated from the production demo", async () => {
  vi.stubEnv("VITE_DEMO_MODE", "true");
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
  window.history.replaceState(null, "", "/demo?intrusion-fixture");

  const { App } = await import("../App");
  render(<App />);

  expect(await screen.findByRole("heading", { name: "Remedial Calculus" })).toBeVisible();
  expect(screen.queryByTestId("intrusion-fixture-route")).toBeNull();
  expect(screen.queryByTestId("relay-surface")).toBeNull();
});
