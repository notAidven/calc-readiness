import type { DataApiExecutor } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";

export interface BugReportService {
  submit(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
}

export const BUG_REPORT_INSERT = `insert into public.bug_report
    (report_id, student_id, description, attempted_action, page_path,
     browser_name, viewport_width, viewport_height)
  values
    (:reportId::uuid, :studentId::uuid, :description, :attemptedAction, :pagePath,
     :browserName, :viewportWidth, :viewportHeight)`;

interface BugReportInput {
  description: string;
  attempted_action: string | null;
  page_path: string;
  browser_name: string;
  viewport_width: number;
  viewport_height: number;
}

function cleanText(value: unknown, max: number, required: boolean): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\r\n?/g, "\n");
  if ((required && cleaned.length === 0) || cleaned.length > max) return null;
  return cleaned || null;
}

function parseBody(body: unknown): BugReportInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const description = cleanText(input.description, 2000, true);
  const attemptedAction = cleanText(input.attempted_action, 500, false);
  const pagePath = cleanText(input.page_path, 160, true);
  const browserName = cleanText(input.browser_name, 80, true);
  const width = input.viewport_width;
  const height = input.viewport_height;
  if (
    !description ||
    description.length < 10 ||
    !pagePath ||
    !pagePath.startsWith("/") ||
    pagePath.includes("?") ||
    pagePath.includes("#") ||
    !browserName ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    Number(width) < 240 ||
    Number(width) > 10000 ||
    Number(height) < 240 ||
    Number(height) > 10000
  ) {
    return null;
  }
  return {
    description,
    attempted_action: attemptedAction,
    page_path: pagePath,
    browser_name: browserName,
    viewport_width: Number(width),
    viewport_height: Number(height),
  };
}

export function createBugReportService(deps: {
  db: DataApiExecutor;
  authenticate: DiagnosticAuthenticator;
  makeId?: () => string;
}): BugReportService {
  return {
    async submit(token, body) {
      const identity = await deps.authenticate(token);
      if (!identity) return { status: 401, body: { error: "unauthorized" } };
      const input = parseBody(body);
      if (!input) {
        return {
          status: 400,
          body: { error: "invalid_bug_report", message: "Please describe what happened." },
        };
      }
      const reportId = (deps.makeId ?? (() => globalThis.crypto.randomUUID()))();
      await deps.db.execute(BUG_REPORT_INSERT, {
        reportId,
        studentId: identity.student_id,
        description: input.description,
        attemptedAction: input.attempted_action,
        pagePath: input.page_path,
        browserName: input.browser_name,
        viewportWidth: input.viewport_width,
        viewportHeight: input.viewport_height,
      });
      return { status: 201, body: { report_id: reportId, submitted: true } };
    },
  };
}
