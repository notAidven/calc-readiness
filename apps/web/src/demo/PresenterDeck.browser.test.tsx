import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { App } from "../App";

import "../styles.css";

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

for (const viewport of [
  { width: 1024, height: 580, name: "1024x580" },
  { width: 1024, height: 653, name: "1024x653" },
  { width: 390, height: 580, name: "390x580" },
]) {
  test(`deck preserves every whole slide and usable controls at ${viewport.name}`, async () => {
    await page.viewport(viewport.width, viewport.height);
    window.history.replaceState(null, "", "/demo?presenter=1&slides=1");
    const user = userEvent.setup();
    render(<App />);

    const deck = await screen.findByTestId("presenter-deck");
    const stage = screen.getByRole("region", {
      name: "Presentation slide 1",
    });
    const controls = screen.getByRole("navigation", { name: "Slide controls" });
    const slideImage = screen.getByRole<HTMLImageElement>("img");
    const stageBox = stage.getBoundingClientRect();
    const controlsBox = controls.getBoundingClientRect();
    expect(stageBox.bottom).toBeLessThanOrEqual(controlsBox.top);
    const imageStyle = getComputedStyle(slideImage);
    expect(imageStyle.objectFit).toBe("contain");
    expect(imageStyle.position).toBe("absolute");
    expect(getComputedStyle(stage).backgroundColor).toBe("rgb(58, 70, 116)");
    expect(imageStyle.backgroundColor).toBe("rgb(58, 70, 116)");
    expect(slideImage.getBoundingClientRect()).toEqual(stageBox);
    expect(getComputedStyle(deck).backgroundColor).toBe("rgb(242, 244, 251)");

    const containedWidth = Math.min(stageBox.width, (stageBox.height * 16) / 9);
    const containedHeight = containedWidth * (9 / 16);
    expect(containedWidth).toBeLessThanOrEqual(stageBox.width);
    expect(containedHeight).toBeLessThanOrEqual(stageBox.height);
    if (viewport.width === 1024) {
      expect(containedWidth).toBeGreaterThan(760);
      expect(containedHeight).toBeGreaterThan(425);
    } else {
      expect(containedWidth).toBeGreaterThan(350);
      expect(containedHeight).toBeGreaterThan(195);
    }

    for (const button of controls.querySelectorAll("button")) {
      const box = button.getBoundingClientRect();
      expect(box.width, button.textContent ?? "").toBeGreaterThanOrEqual(44);
      expect(box.height, button.textContent ?? "").toBeGreaterThanOrEqual(44);
    }

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("status")).toHaveTextContent("Slide 2 of 4");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/presenter-deck/slide-02.png");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("status")).toHaveTextContent("Slide 3 of 4: Our Solution");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/presenter-deck/slide-03.png");
    expect(screen.queryByRole("button", { name: "Enter live demo" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("status")).toHaveTextContent("Slide 4 of 4: Live Demo");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/presenter-deck/slide-04.png");
    const enter = screen.getByRole("button", { name: "Enter live demo" });
    const enterBox = enter.getBoundingClientRect();
    expect(enterBox.width).toBeGreaterThanOrEqual(44);
    expect(enterBox.height).toBeGreaterThanOrEqual(44);
    expect(enterBox.right).toBeLessThanOrEqual(viewport.width);
    expect(enterBox.bottom).toBeLessThanOrEqual(viewport.height);
  });
}
