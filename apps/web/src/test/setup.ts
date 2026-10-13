import "@testing-library/jest-dom/vitest";

// jsdom ships no WebGL. Stub canvas.getContext to return null so the R3F city's
// feature-detect fails CLEANLY to its DOM mirror (fail-closed) without the noisy
// jsdom "Not implemented: getContext" logs. No unit test needs a real context —
// the 3D canvas rendering is exercised in the browser, not here.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// jsdom implements no element-level scroll methods; the WorldScene scrolls its
// frame to the top on open (`frameRef.scrollTo`). Stub it to a no-op so that
// effect doesn't throw under the jsdom harness (browsers keep the real method).
if (typeof HTMLElement.prototype.scrollTo !== "function") {
  HTMLElement.prototype.scrollTo = (() => {}) as typeof HTMLElement.prototype.scrollTo;
}

// jsdom implements no media PLAYBACK: `HTMLMediaElement.play`/`pause` report
// "Not implemented" through jsdom's virtual console, which prints a stack trace that
// the caller cannot catch — `not-implemented.js` raises it on the console rather than
// throwing to the call site. The audio layer (`src/audio/**`) is best-effort and
// silent by design, and any test that clicks something opens its autoplay gate, so
// without these stubs a mounted city would print a trace per effect. Stub them to
// no-ops, matching how `getContext` above fails the 3D city cleanly to its DOM mirror.
// Real playback is exercised in a browser, never here.
HTMLMediaElement.prototype.play = (() =>
  Promise.resolve()) as typeof HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.pause = (() => {}) as typeof HTMLMediaElement.prototype.pause;
HTMLMediaElement.prototype.load = (() => {}) as typeof HTMLMediaElement.prototype.load;
