import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";

// The diagnostic surface is browser-only (KaTeX / canvas widgets); stub it so this
// App-level phase-gating test can exercise the diagnostic ENTRY route in jsdom
// without pulling in the heavy diagnostic runtime.
vi.mock("./diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: ({
    onPretestComplete,
  }: {
    onPretestComplete?: (
      placement: Record<string, number>,
      unlocked: readonly string[],
    ) => void;
    onExit?: () => void;
  }) => (
    <div data-testid="diagnostic-stub">
      <button type="button" onClick={() => onPretestComplete?.({}, [])}>
        Finish diagnostic (stub)
      </button>
    </div>
  ),
}));

describe("App — title-screen phase gating", () => {
  it("shows the title screen first, with the two required actions", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Remedial Calculus" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start at Era 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take the diagnostic" })).toBeInTheDocument();
  });

  it("Start enters the city (title gone, city HUD shown)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start at Era 1" }));

    // The title screen is gone and the city HUD (Buildings disclosure) is up.
    expect(screen.queryByRole("heading", { name: "Remedial Calculus" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
  });

  it("Take Diagnostic enters the city with the diagnostic overlay open", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Take the diagnostic" }));

    // The diagnostic takeover overlay is open (its chrome + the stubbed surface),
    // and the title screen is gone (we're in the city phase behind the overlay).
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("button", { name: "Back to city" }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("diagnostic-stub")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Remedial Calculus" })).toBeNull();
  });

  it("keeps Sound in the city Menu and retains one compact control over lessons", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
    await screen.findByRole("button", { name: "Build" });

    expect(screen.queryByTestId("audio-settings")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const menu = document.querySelector<HTMLElement>(".city-menu-popover");
    expect(menu).not.toBeNull();
    expect(within(menu as HTMLElement).getByTestId("audio-settings")).toHaveAttribute(
      "data-placement",
      "menu",
    );

    await user.click(within(menu as HTMLElement).getByRole("button", { name: "Lessons" }));
    await screen.findByRole("dialog", { name: /Six skills, six lessons/i });

    expect(document.querySelector(".city-menu-popover")).toBeNull();
    expect(screen.getAllByTestId("audio-settings")).toHaveLength(1);
    expect(screen.getByTestId("audio-settings")).toHaveAttribute(
      "data-placement",
      "overlay",
    );
  });
});
