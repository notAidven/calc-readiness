import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalSessionProvider } from "../auth/LocalSessionProvider";
import { PresenterShell, usePresenterRegistration } from "./PresenterShell";

const root = document.documentElement;
const originalRequest = Object.getOwnPropertyDescriptor(root, "requestFullscreen");
const originalExit = Object.getOwnPropertyDescriptor(document, "exitFullscreen");
const originalElement = Object.getOwnPropertyDescriptor(document, "fullscreenElement");

function restoreProperty(
  target: object,
  name: string,
  descriptor?: PropertyDescriptor,
): void {
  if (descriptor) {
    Object.defineProperty(target, name, descriptor);
  } else {
    Reflect.deleteProperty(target, name);
  }
}

function installFullscreen(options: { rejectRequest?: boolean } = {}) {
  let fullscreenElement: Element | null = root;
  const request = options.rejectRequest
    ? vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"))
    : vi.fn().mockImplementation(async () => {
        fullscreenElement = root;
        document.dispatchEvent(new Event("fullscreenchange"));
      });

  Object.defineProperty(root, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreenElement,
  });

  return {
    request,
    simulatePickerExit() {
      fullscreenElement = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}

function CurrentSurface() {
  const presenter = usePresenterRegistration();
  return <p data-testid="current-presenter-surface">{presenter.request?.surface}</p>;
}

function renderFromReview() {
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=review&era=bronze_age",
  );
  render(
    <LocalSessionProvider>
      <PresenterShell
        request={{
          enabled: true,
          legacy: false,
          preset: "progress-construction",
          surface: "review",
          eraId: "bronze_age",
        }}
      >
        <CurrentSurface />
      </PresenterShell>
    </LocalSessionProvider>,
  );
}

afterEach(() => {
  cleanup();
  restoreProperty(root, "requestFullscreen", originalRequest);
  restoreProperty(document, "exitFullscreen", originalExit);
  restoreProperty(document, "fullscreenElement", originalElement);
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("Presenter AI Work Checker fullscreen restoration", () => {
  it("requests fullscreen from the checker exit click and returns to the previous surface", async () => {
    const fullscreen = installFullscreen();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:presenter-photo");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    renderFromReview();

    const presenterBar = screen.getByRole("navigation", { name: "Presenter actions" });
    fireEvent.click(within(presenterBar).getByRole("button", { name: "AI work" }));
    fireEvent.change(await screen.findByLabelText("Choose a photo of your work"), {
      target: {
        files: [new File(["photo"], "solution.jpg", { type: "image/jpeg" })],
      },
    });
    expect(await screen.findByRole("status", { name: "Checking your work" })).toBeVisible();

    fullscreen.simulatePickerExit();
    expect(document.fullscreenElement).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to city" }));

    expect(fullscreen.request).toHaveBeenCalledOnce();
    expect(fullscreen.request.mock.instances[0]).toBe(root);
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Photo work feedback" })).toBeNull();
      expect(screen.getByTestId("current-presenter-surface")).toHaveTextContent("review");
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("review");
      expect(document.fullscreenElement).toBe(root);
    });
  });

  it("still exits to the previous surface when fullscreen restoration is rejected", async () => {
    const fullscreen = installFullscreen({ rejectRequest: true });
    renderFromReview();
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
        "button",
        { name: "AI work" },
      ),
    );
    fullscreen.simulatePickerExit();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(fullscreen.request).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Photo work feedback" })).toBeNull();
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("review");
    });
  });
});
