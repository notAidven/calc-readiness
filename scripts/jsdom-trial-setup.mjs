/**
 * The one thing the jsdom trial shims beyond `vitest/browser`, for the measurement in
 * `docs/2026-08-05-browser-suite-classification.md`.
 *
 * ONE-OFF MEASUREMENT TOOL, loaded only by `scripts/jsdom-trial.vitest.config.mjs`.
 *
 * `await document.fonts.ready` appears in 71 of the 236 browser test files and is a
 * settle-before-measuring idiom, not an assertion: a migrated test deletes the line, because
 * in jsdom there is nothing to wait for. Leaving `document.fonts` absent would fail those 71
 * files at a `TypeError` that says nothing about whether their claims need a browser, and
 * would hide whatever the next line was going to measure.
 *
 * `ready` AND NOTHING ELSE. A test that asks the face set for its size, status or members is
 * making a claim about real loaded fonts, which is a browser claim, and it still fails here.
 */

if (typeof document !== "undefined" && !("fonts" in document)) {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
}
