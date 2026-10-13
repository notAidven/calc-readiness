/**
 * Stands in for `vitest/browser` while the browser suite is run under jsdom, for the
 * measurement in `docs/2026-08-05-browser-suite-classification.md`.
 *
 * ONE-OFF MEASUREMENT TOOL. Nothing in the shipped suites resolves this file; only
 * `scripts/jsdom-trial.vitest.config.mjs` aliases `vitest/browser` to it.
 *
 * WHY IT EXISTS. `import { page } from "vitest/browser"` throws
 * *"vitest/browser can be imported only inside the Browser Mode"* the moment a file is
 * collected by a node pool, so 99 of the 236 files — 79% of the suite's measured time —
 * failed at import and reported no per-test verdict at all. That is the very population the
 * measurement is about, so it has to be reached.
 *
 * THE SHIM IS DELIBERATELY UNEVEN, and the unevenness is the measurement. Each entry either
 * does the thing a migrated jsdom test could genuinely do for itself, or refuses outright:
 *
 *  - `page.viewport(w, h)` RESIZES THE JSDOM WINDOW. A jsdom test sets `window.innerWidth`
 *    and dispatches `resize` in three lines, so this is a real equivalent and a test built
 *    on it is not thereby a browser test.
 *  - `page.screenshot` and `cdp()` THROW. There is no jsdom equivalent to a rendered frame
 *    at any price, so a test that captures one must fail here — and it is meant to. Making
 *    these silently resolve would classify all 78 screenshot files as jsdom-capable, which
 *    is exactly the false green this whole exercise is about.
 *  - `commands.writeFile` is a NO-OP recorded on `__jsdomTrial`. Every one of its 78 call
 *    sites in this tree writes a screenshot, so it is unreachable behind the throw above;
 *    it is defined only so an import of it does not fail before the test runs.
 *  - `userEvent` THROWS. Its whole value is that Playwright routes real input through real
 *    hit-testing.
 *
 * Anything not listed here is left absent on purpose, so a file reaching for it fails
 * loudly rather than passing over a stub.
 */

const NO_EQUIVALENT = (what) => () => {
  throw new Error(
    `JSDOM-TRIAL: ${what} has no jsdom equivalent, so this assertion genuinely needs a browser.`,
  );
};

globalThis.__jsdomTrial ??= { viewports: [], writes: [] };

export const page = {
  /**
   * A real equivalent: resize the window and tell the page. jsdom computes no layout from
   * it, which is the point — if a test's claim depended on layout responding, the assertion
   * that follows fails on its own rather than on this call.
   */
  viewport(width, height) {
    globalThis.__jsdomTrial.viewports.push({ width, height });
    Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
    window.dispatchEvent(new Event("resize"));
    return Promise.resolve();
  },
  screenshot: NO_EQUIVALENT("page.screenshot"),
  elementLocator: NO_EQUIVALENT("page.elementLocator"),
};

export const commands = {
  writeFile(path, data, options) {
    globalThis.__jsdomTrial.writes.push({ path, bytes: data?.length ?? 0, options });
    return Promise.resolve();
  },
};

export const cdp = () => ({
  send: NO_EQUIVALENT("a CDP session (Page.captureScreenshot)"),
  on: () => {},
});

export const userEvent = {
  setup: NO_EQUIVALENT("userEvent (Playwright-routed real input)"),
};

export const server = { provider: "jsdom-trial", browser: "none", commands };
