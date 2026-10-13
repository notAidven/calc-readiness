import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { resetCityEra } from "../city/useCityEra";

const cityConstruction = vi.hoisted(() => vi.fn());

vi.mock("../city/citySession", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../city/citySession")>();
  return {
    ...actual,
    createCityDevSession: (...args: Parameters<typeof actual.createCityDevSession>) => {
      cityConstruction();
      return actual.createCityDevSession(...args);
    },
  };
});

afterEach(() => {
  cleanup();
  cityConstruction.mockClear();
  vi.unstubAllGlobals();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

it("mounts the canonical deck before any city, storage, or backend work", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  localStorage.setItem("ordinary", "untouched");
  window.history.replaceState(null, "", "/demo?presenter=1&slides=1");
  const { App } = await import("../App");
  render(<App />);

  expect(await screen.findByTestId("presenter-deck")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(document.querySelector(".city-surface")).toBeNull();
  expect(cityConstruction).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect({ ...localStorage }).toEqual({ ordinary: "untouched" });
});

it("enters the actual presenter city in-app with replaceState and focus transfer", async () => {
  window.history.replaceState(null, "", "/demo?presenter=1&slides=1");
  let unloaded = 0;
  window.addEventListener("beforeunload", () => {
    unloaded += 1;
  });
  const replace = vi.spyOn(window.history, "replaceState");
  const { App } = await import("../App");
  render(<App />);

  fireEvent.keyDown(window, { key: "End" });
  fireEvent.click(screen.getByRole("button", { name: "Enter live demo" }));

  expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
  expect(cityConstruction).toHaveBeenCalledTimes(1);
  expect(new URL(window.location.href).searchParams.get("presenter")).toBe("1");
  expect(new URL(window.location.href).searchParams.has("slides")).toBe(false);
  expect(replace).toHaveBeenCalled();
  expect(unloaded).toBe(0);
});

it("keeps slides isolated from ordinary demo, local, and account-looking URLs", async () => {
  const { App } = await import("../App");

  window.history.replaceState(null, "", "/demo?slides=1");
  const ordinary = render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Remedial Calculus" }),
  ).toBeInTheDocument();
  expect(screen.queryByTestId("presenter-deck")).toBeNull();
  ordinary.unmount();

  window.history.replaceState(null, "", "/demo?presenter=1");
  const presenter = render(<App />);
  expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
  expect(screen.queryByTestId("presenter-deck")).toBeNull();
  presenter.unmount();

  window.history.replaceState(null, "", "/?presenter=1&slides=1");
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Remedial Calculus" }),
  ).toBeInTheDocument();
  expect(screen.queryByTestId("presenter-deck")).toBeNull();
});

it("restarts at slide 1 from the presenter-only city Menu", async () => {
  window.history.replaceState(null, "", "/demo?presenter=1");
  const { App } = await import("../App");
  render(<App />);

  await screen.findByRole("button", { name: "Menu" });
  const city = document.querySelector(".city-surface");
  const constructionsBeforeSlides = cityConstruction.mock.calls.length;
  expect(city).not.toBeNull();
  expect(constructionsBeforeSlides).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Slides" }));

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Slide 1 of 4: Calculus-Readiness City-Builder",
  );
  expect(document.querySelector(".city-surface")).toBe(city);
  expect(new URL(window.location.href).searchParams.get("slides")).toBe("1");

  fireEvent.keyDown(window, { key: "End" });
  fireEvent.keyDown(window, { key: "Enter" });
  await waitFor(() =>
    expect(screen.queryByTestId("presenter-deck")).not.toBeInTheDocument(),
  );
  expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
  expect(document.querySelector(".city-surface")).toBe(city);
  expect(cityConstruction).toHaveBeenCalledTimes(constructionsBeforeSlides);
});
