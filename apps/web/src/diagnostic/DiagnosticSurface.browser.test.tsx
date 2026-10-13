import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { LocalSessionProvider } from "../auth/LocalSessionProvider";
import { DiagnosticSurface } from "./DiagnosticSurface";

/**
 * Regression guard for the demo-critical "Survey" crash.
 *
 * The diagnostic surface is reached in the app via a LAZY dynamic import
 * (`App.tsx` → `SurfaceOverlay` → `DiagnosticSurface`) whose chunk statically
 * pulls in the auth session and, through it, `amazon-cognito-identity-js`. That
 * library references the Node-only global `global`, which the browser lacks — so
 * evaluating the chunk threw `ReferenceError: global is not defined` and emptied
 * `#root` (a blank-screen crash) the instant Survey was clicked.
 *
 * This test mounts the surface in REAL Chromium (jsdom defines `global`, so it can
 * never catch this) and asserts the intro renders. It fails hard — the module
 * throws on evaluation — unless the `global` shim in `apps/web/vite.config.ts`
 * (mirrored by this harness's config) is in place.
 */

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
});

async function waitForText(
  container: HTMLElement,
  pattern: RegExp,
  timeoutMs = 8000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pattern.test(container.textContent ?? "")) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Timed out waiting for ${pattern}; got: ${(container.textContent ?? "").slice(0, 200)}`,
  );
}

test("opening the diagnostic Survey surface renders its intro without crashing", async () => {
  const errors: string[] = [];
  const onError = (event: ErrorEvent) => errors.push(event.message);
  window.addEventListener("error", onError);

  try {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    // Dev mode (no Cognito env) drives straight to the intro CTA.
    root.render(
      <LocalSessionProvider>
        <DiagnosticSurface />
      </LocalSessionProvider>,
    );
    await waitForText(host, /start the diagnostic/i);
  } finally {
    window.removeEventListener("error", onError);
  }

  // No uncaught error reached the page while opening the surface.
  expect(errors, `uncaught errors while opening Survey: ${errors.join(" | ")}`).toEqual([]);
  // The real runner content mounted (the D1 scope figure), not a fallback/blank.
  expect(host.textContent ?? "").toMatch(/one question at a time/i);
});
