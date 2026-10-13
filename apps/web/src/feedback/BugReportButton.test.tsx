import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BugReportButton } from "./BugReportButton";

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("../api", () => ({
  apiBaseUrl: () => "/api",
  apiPostJsonAuthenticated: api.post,
}));

beforeEach(() => {
  window.history.replaceState(null, "", "/city?private=value#answer");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("student bug report", () => {
  it("explains privacy, validates the report, and sends path-only context", async () => {
    api.post.mockResolvedValue({ submitted: true });
    const getAccessToken = vi.fn(async () => "jwt");
    const user = userEvent.setup();
    render(
      <BugReportButton
        account={{
          studentId: "11111111-1111-4111-8111-111111111111",
          getAccessToken,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Report a bug" }));
    expect(screen.getByRole("dialog", { name: "Report a bug" })).toBeVisible();
    expect(screen.getByText(/does not include your answers/i)).toBeVisible();
    const send = screen.getByRole("button", { name: "Send report" });
    expect(send).toBeDisabled();
    await user.type(
      screen.getByLabelText("What happened?"),
      "The Build menu did not open.",
    );
    await user.type(screen.getByLabelText(/What were you trying to do/), "Place the Store");
    await user.click(send);

    expect(api.post).toHaveBeenCalledWith(
      "/api/bug-report",
      getAccessToken,
      expect.objectContaining({
        description: "The Build menu did not open.",
        attempted_action: "Place the Store",
        page_path: "/city",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Report received" })).toBeVisible();
  });

  it("closes on Escape without submitting", async () => {
    const user = userEvent.setup();
    render(
      <BugReportButton
        account={{
          studentId: "11111111-1111-4111-8111-111111111111",
          getAccessToken: async () => "jwt",
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Report a bug" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
