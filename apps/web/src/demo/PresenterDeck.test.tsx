import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isPresenterDeckSearch,
  liveDemoHref,
  PRESENTER_SLIDES,
  PresenterDeck,
  slidesHref,
} from "./PresenterDeck";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the embedded presenter deck", () => {
  it("derives exactly four ordered slides and loads slide 1 first", () => {
    render(<PresenterDeck onEnterLiveDemo={vi.fn()} />);

    expect(PRESENTER_SLIDES.map((slide) => slide.index)).toEqual([1, 2, 3, 4]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Slide 1 of 4: Calculus-Readiness City-Builder",
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "/presenter-deck/slide-01.png");
    expect(document.activeElement).toBe(screen.getByTestId("presenter-deck"));
  });

  it("preloads all four byte-faithful exports without a timer", () => {
    const loaded: string[] = [];
    vi.stubGlobal(
      "Image",
      class {
        decoding = "";
        set src(value: string) {
          loaded.push(value);
        }
      },
    );
    render(<PresenterDeck onEnterLiveDemo={vi.fn()} />);
    expect(loaded).toEqual(PRESENTER_SLIDES.map((slide) => slide.src));
  });

  it("keeps visible controls ordered and exposes entry only on the real fourth slide", () => {
    render(<PresenterDeck onEnterLiveDemo={vi.fn()} />);
    const controls = screen.getByRole("navigation", { name: "Slide controls" });
    expect(
      within(controls)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Previous", "Next", expect.stringMatching(/fullscreen/i)]);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Enter live demo" })).toBeNull();

    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 4 of 4: Live Demo");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/presenter-deck/slide-04.png");
    expect(screen.getByRole("button", { name: "Enter live demo" })).toBeInTheDocument();
  });

  it("supports the complete key map and a further advance enters from slide 4", () => {
    const enter = vi.fn();
    render(<PresenterDeck onEnterLiveDemo={enter} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 2 of 4");
    fireEvent.keyDown(window, { key: "PageDown" });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 3 of 4");
    fireEvent.keyDown(window, { key: "PageDown" });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 4 of 4");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 3 of 4");
    fireEvent.keyDown(window, { key: "PageUp" });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 2 of 4");
    fireEvent.keyDown(window, { key: "End" });
    fireEvent.keyDown(window, { key: "Home" });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 1 of 4");
    fireEvent.keyDown(window, { key: "End" });
    fireEvent.keyDown(window, { key: " " });
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("does not steal slide shortcuts from an interactive typing target", () => {
    render(<PresenterDeck onEnterLiveDemo={vi.fn()} />);
    const input = document.createElement("input");
    screen.getByTestId("presenter-deck").append(input);
    input.focus();

    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: " " });
    expect(screen.getByRole("status")).toHaveTextContent("Slide 1 of 4");
  });

  it("leaves Escape to the browser and allows Enter only on slide 4", () => {
    const enter = vi.fn();
    render(<PresenterDeck onEnterLiveDemo={enter} />);
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(false);

    fireEvent.keyDown(window, { key: "Enter" });
    expect(enter).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "End" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("keeps a visible fullscreen control wired to the document", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    render(<PresenterDeck onEnterLiveDemo={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Fullscreen/i }));
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("navigation", { name: "Slide controls" })).toBeInTheDocument();
  });

  it("normalizes only the presenter slides query into the live demo", () => {
    expect(isPresenterDeckSearch("?presenter=1&slides=1")).toBe(true);
    expect(isPresenterDeckSearch("?presenter=1")).toBe(false);
    expect(liveDemoHref("https://example.test/demo?presenter=1&slides=1")).toBe(
      "https://example.test/demo?presenter=1",
    );
    expect(slidesHref("https://example.test/demo?presenter=1")).toBe(
      "https://example.test/demo?presenter=1&slides=1",
    );
  });
});
