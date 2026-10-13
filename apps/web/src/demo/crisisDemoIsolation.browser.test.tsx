import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";
import { CRISIS_PREVIEW_ROUTES } from "../crisisPreviewRoutes";
import { demoCrisisHref } from "./demoRoutes";

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/demo");
  vi.restoreAllMocks();
});

test.each(CRISIS_PREVIEW_ROUTES)(
  "exact demo fixture remains isolated for $label",
  { timeout: 60_000 },
  async (crisis) => {
    localStorage.clear();
    resetCityEra();
    window.history.replaceState(
      null,
      "",
      demoCrisisHref(`${window.location.origin}/demo`, crisis.param),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<App />);

    if (crisis.param === "succession") {
      expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
      expect(screen.getByRole("button", { name: /Face the succession/i })).toBeVisible();
    } else if (crisis.param === "plague") {
      expect(
        await screen.findByTestId("plague-in-city", {}, { timeout: 15_000 }),
      ).toBeVisible();
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
