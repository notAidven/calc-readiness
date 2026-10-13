/**
 * **DOES VITEST'S BROWSER-MODE MODULE MOCKER STILL BREAK ON A PATH WITH A SPACE?**
 *
 * `fec121a6` proved that it does, and `test/browserModeModuleMocker.test.ts` bans `vi.mock`
 * in browser-mode tests because of it. This file is the one browser test allowed to call
 * `vi.mock`, and it is what keeps that ban honest.
 *
 * ## What it asserts
 *
 * A biconditional, not a fact about mocking: **the mock takes effect exactly when the path
 * this checkout sits at has no space in it.** Both halves are live somewhere, which is what
 * makes it a canary rather than a test that only ever runs one branch:
 *
 *  - **on a developer machine here**, the checkout is `/Users/<you>/Remedial App - Calc`,
 *    the mocker is inert, and this file asserts it is inert;
 *  - **on CI**, the checkout is `/home/runner/work/...` with no space, the mocker works, and
 *    this file asserts it works.
 *
 * So the ban's justification is measured on every run in both environments, rather than
 * argued once in a commit message.
 *
 * ## Why a canary at all, when the ban is a static sweep
 *
 * The sweep bans a LIST OF API NAMES, and a list of names is only ever as current as the
 * day it was written. This file tests the MECHANISM, so it keeps reporting if Vitest adds a
 * mocking entry point nobody has thought to add to the list. More importantly it is how the
 * ban EXPIRES: the day Vitest fixes the escaping, this file fails on every machine here
 * saying so, and the ban can be deleted instead of outliving its reason by years.
 *
 * A failure in the "mock unexpectedly worked" direction is good news, not a defect. The
 * message says so.
 *
 * ## How it can see the path from inside Chromium
 *
 * `import.meta.url` in browser mode is the absolute path of this file, served and so
 * URL-escaped: `http://localhost:PORT/Users/<user>/Remedial%20App%20-%20Calc/apps/...`.
 * That `%20` is not incidental to the defect, it IS the defect -- the mocker keys its
 * registry on the escaped id while the module graph resolves the decoded one -- so decoding
 * the pathname and looking for a space reads the very property that breaks it.
 */

import { expect, test, vi } from "vitest";

import { BROWSER_MOCKER_CANARY_MARKER } from "./browserMockerCanaryTarget";

vi.mock("./browserMockerCanaryTarget", () => ({
  BROWSER_MOCKER_CANARY_MARKER: "mocked",
}));

/** The absolute path this file is served from, with `%20` and friends turned back into text. */
const servedPath = decodeURIComponent(new URL(import.meta.url).pathname);

const pathHasSpace = servedPath.includes(" ");
const mockTookEffect = BROWSER_MOCKER_CANARY_MARKER === "mocked";

test("the browser module mocker works exactly when the checkout path has no space", () => {
  expect(
    mockTookEffect,
    pathHasSpace
      ? [
          `GOOD NEWS, PROBABLY: this checkout sits at a path containing a space (${servedPath}),`,
          "and Vitest's browser-mode module mocker used to be silently inert on such a path --",
          "but the mock just took effect. Either Vitest fixed the escaping (see `fec121a6` for",
          "the mechanism) or the mechanism changed. Re-run the measurement, and if the mocker is",
          "genuinely fixed, delete the ban in `test/browserModeModuleMocker.test.ts` along with",
          "this canary and its target module.",
        ].join(" ")
      : [
          `this checkout sits at a path with no space in it (${servedPath}), so Vitest's`,
          "browser-mode module mocker is expected to work here and it did not. That is a new",
          "failure mode: the ban in `test/browserModeModuleMocker.test.ts` is written for the",
          "space-in-the-path defect that `fec121a6` measured, and something else is now breaking",
          "the mocker. Do not widen the ban until you know which.",
        ].join(" "),
  ).toBe(!pathHasSpace);
});
