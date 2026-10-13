import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FullscreenMenuAction } from "./FullscreenMenuAction";

interface FullscreenMock {
  readonly request: ReturnType<typeof vi.fn>;
  readonly exit: ReturnType<typeof vi.fn>;
  setElement(element: Element | null): void;
}

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

function installFullscreen(options: { rejectRequest?: boolean } = {}): FullscreenMock {
  let fullscreenElement: Element | null = null;
  const request = options.rejectRequest
    ? vi.fn().mockRejectedValue(new DOMException("Permission denied", "NotAllowedError"))
    : vi.fn().mockImplementation(async () => {
        fullscreenElement = root;
        document.dispatchEvent(new Event("fullscreenchange"));
      });
  const exit = vi.fn().mockImplementation(async () => {
    fullscreenElement = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });

  Object.defineProperty(root, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exit,
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreenElement,
  });

  return {
    request,
    exit,
    setElement(element) {
      fullscreenElement = element;
      document.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}

afterEach(() => {
  cleanup();
  restoreProperty(root, "requestFullscreen", originalRequest);
  restoreProperty(document, "exitFullscreen", originalExit);
  restoreProperty(document, "fullscreenElement", originalElement);
  vi.restoreAllMocks();
});

describe("FullscreenMenuAction", () => {
  it("enters and exits full screen through the document API", async () => {
    const user = userEvent.setup();
    const api = installFullscreen();
    render(<FullscreenMenuAction />);

    const enter = screen.getByRole("button", { name: "Enter full screen" });
    expect(enter).toBeEnabled();
    expect(enter).toHaveAttribute("aria-pressed", "false");

    await user.click(enter);

    expect(api.request).toHaveBeenCalledOnce();
    expect(api.request.mock.instances[0]).toBe(root);
    const exit = await screen.findByRole("button", { name: "Exit full screen" });
    expect(exit).toHaveAttribute("aria-pressed", "true");

    await user.click(exit);

    expect(api.exit).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole("button", { name: "Enter full screen" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("tracks browser Escape and other external fullscreen changes", async () => {
    const api = installFullscreen();
    render(<FullscreenMenuAction />);

    expect(screen.getByRole("button", { name: "Enter full screen" })).toBeInTheDocument();

    api.setElement(root);
    expect(
      await screen.findByRole("button", { name: "Exit full screen" }),
    ).toBeInTheDocument();

    api.setElement(null);
    expect(
      await screen.findByRole("button", { name: "Enter full screen" }),
    ).toBeInTheDocument();
  });

  it("keeps the non-fullscreen state and reports a rejected request", async () => {
    const user = userEvent.setup();
    const api = installFullscreen({ rejectRequest: true });
    render(<FullscreenMenuAction />);

    await user.click(screen.getByRole("button", { name: "Enter full screen" }));

    expect(api.request).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Enter full screen" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Full screen was not allowed.",
    );
  });

  it("disables the action with an explanation when the API is unsupported", () => {
    render(<FullscreenMenuAction />);

    expect(screen.getByRole("button", { name: "Enter full screen" })).toBeDisabled();
    expect(
      screen.getByText("Full screen is unavailable in this browser."),
    ).toBeInTheDocument();
  });

  it("removes its fullscreenchange listener on unmount", async () => {
    installFullscreen();
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(<FullscreenMenuAction />);
    const registration = add.mock.calls.find(([event]) => event === "fullscreenchange");
    expect(registration).toBeDefined();

    unmount();

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith("fullscreenchange", registration?.[1]);
    });
  });
});
