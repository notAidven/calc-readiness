import { describe, expect, it, vi } from "vitest";

import { BUG_REPORT_INSERT, createBugReportService } from "./bugReports";

const STUDENT = "11111111-1111-4111-8111-111111111111";

function service() {
  const execute = vi.fn(async () => 1);
  return {
    execute,
    reports: createBugReportService({
      db: { execute, query: async () => [] },
      authenticate: async (token) => (token === "jwt" ? { student_id: STUDENT } : null),
      makeId: () => "22222222-2222-4222-8222-222222222222",
    }),
  };
}

describe("bug report intake", () => {
  it("derives ownership from the token and stores privacy-minimized context", async () => {
    const { execute, reports } = service();
    const response = await reports.submit("jwt", {
      description: "The build button stopped responding.",
      attempted_action: "I was placing the Store.",
      page_path: "/city",
      browser_name: "Chrome",
      viewport_width: 390,
      viewport_height: 844,
    });
    expect(response).toEqual({
      status: 201,
      body: { report_id: "22222222-2222-4222-8222-222222222222", submitted: true },
    });
    expect(execute).toHaveBeenCalledWith(
      BUG_REPORT_INSERT,
      expect.objectContaining({ studentId: STUDENT, pagePath: "/city" }),
    );
  });

  it("rejects anonymous, identifying URL, and empty reports", async () => {
    const { execute, reports } = service();
    expect((await reports.submit(null, {})).status).toBe(401);
    expect(
      (
        await reports.submit("jwt", {
          description: "Something went wrong here",
          page_path: "/city?email=student@example.test",
          browser_name: "Chrome",
          viewport_width: 390,
          viewport_height: 844,
        })
      ).status,
    ).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
});
