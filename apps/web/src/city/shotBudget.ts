/**
 * **WHAT A SCREENSHOT COSTS ON THE RUNNER, AND THE TWO BUDGETS THAT FOLLOW FROM IT.**
 *
 * Every browser test that mounts a canvas and photographs it has two clocks running: the
 * waits INSIDE it, each with a message naming what stalled, and vitest's own budget for the
 * test AROUND them. `islandEra.browser.test.tsx` states the rule these must obey and is the
 * reason this module exists — read its header for the history. In one line: **the inner
 * waits have to be reachable inside the outer budget**, or a slow canvas can never produce
 * its own diagnostic and every failure arrives as an anonymous "Test timed out in 15000ms".
 *
 * That is not a hypothetical. On `0ae4913f`, attempt 1 and attempt 2 of run 30706860187 —
 * the same commit, twice — failed on a different pair of files each time, and every one of
 * them was a budget with no headroom rather than a broken frame:
 *
 *   - `eraAdvanceShots` died at `Test timed out in 15000ms` on a test that ran **15378ms**,
 *     and passed the other attempt at **14599ms**. A margin of 401ms.
 *   - `eraTwoField` ran **66395ms** against a declared 60000, twice.
 *   - `unmappedBuildingRenders` passed at **4233ms** and failed at **11909ms**.
 *
 * A 2.8x spread on one commit is the runner's hardware lottery, measured again in #208, and
 * nothing about it is a fault to be fixed: the runner has two cores, two Chromium workers and
 * software rasterisation, so a frame costs what it costs. What was wrong was declaring a box
 * smaller than the measured contents and letting the lottery decide which file fell out of it.
 *
 * **THE SCREENSHOT TIMEOUTS IN THOSE LOGS ARE A SYMPTOM AND NOT A SETTING.** `locator.
 * screenshot: Timeout 1150.0979999999981ms exceeded` reads like a screenshot budget somebody
 * chose, and there is no such number anywhere in this tree. Vitest derives it: with no
 * explicit `timeout`, `page.screenshot()` is handed `(taskStartTime + taskTimeout) - now -
 * 100` — the test's REMAINING time. So those varying fractional figures are the crumb of the
 * outer budget left when the last shot started, and raising a screenshot timeout would have
 * fixed nothing. Sizing the outer budget is the fix; the screenshots then inherit it.
 */

/**
 * How long to wait for ONE WebGL canvas to reach a given state — created, populated, drawn.
 *
 * `islandEra.browser.test.tsx` pins the same 10s independently, after the anonymous 15000ms
 * failure hit three lanes at once on 2026-07-31. It is deliberately NOT imported from here:
 * that file's budgets are contested ground in another lane, where two independently authored
 * fixes for this same defect already collided on merge at `6daf15c0`, and a tidying import
 * would be a third edit to a file that is currently green.
 *
 * The number wants to stay well under {@link framedTestBudget}, not close to it. Its whole
 * job is to fail FIRST, with a message that names which canvas stalled.
 */
export const CANVAS_WAIT_MS = 10_000;

/**
 * Outer budget for a test that mounts `frames` separate canvases and photographs each.
 *
 * 30s a frame is `islandEra`'s own allowance (60000 for its two frames), and the measured
 * cost is 8.3s: `eraTwoField` got through 7 frames in 66.4s on the runner, and `islandEra`'s
 * own two-frame tests take 13.4s and 16.3s. Against #208's measured 2.6x lottery that worst
 * case is ~21.6s, so 30s is headroom over the bad draw rather than over the good one.
 *
 * DERIVED FROM THE FRAME COUNT ON PURPOSE. `eraTwoField` was pinned at a flat 60000 while
 * quietly growing to eight frames, which is how it came to declare a box 6s smaller than its
 * own contents. Taking the count from the arrays that produce the frames means a fifth
 * azimuth raises the budget with it instead of silently re-creating this bug.
 */
export function framedTestBudget(frames: number): number {
  return frames * 30_000;
}

/**
 * Outer budget for a test that takes `shots` DOM screenshots with no canvas in them.
 *
 * Cheaper than a frame and bounded by different work — a mount, a settle for the transition
 * to land, and the read-back — but not cheap: `eraAdvanceShots` measured ~1.9s for a shot
 * that remounts the whole `CitySurface`, and its fifteen-shot test measured 14.6s and 15.4s.
 * 8s a shot is roughly four times the bad-draw cost of the heaviest one.
 *
 * The floor is what keeps a one-shot test honest. Derived alone it would hand a single
 * screenshot 8s, and the end-of-attempt test already measures 3.5s of that on a good run.
 */
export function shotTestBudget(shots: number): number {
  return Math.max(30_000, shots * 8_000);
}
