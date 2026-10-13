/**
 * FRAMES OF THE ABBREVIATED FORM, and of the beats that used to be empty.
 *
 * Every frame is the WHOLE 1024x580 window rather than a crop of the surface that changed,
 * per `.cursor/rules/qa-verification.mdc`: cropped to the element that changed a screenshot
 * proves nothing about what is visible around it, and "does the shortened version still read
 * as a ceremony" is a question about the whole picture.
 *
 *   node scripts/qa/catchup-frames.mjs [--motion reduce|no-preference] [--port 5173]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : args[at + 1];
};

const PORT = Number(arg("port", 5173));
const BASE = `http://localhost:${PORT}`;
const MOTION = arg("motion", "reduce");
const PLACED = arg("placed", "renaissance");
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUFFIX = MOTION === "reduce" ? "reduced" : "motion";
const OUT = path.join(REPO, "docs", "design-refs", "catch-up-compression");
const MIRROR = path.join(REPO, "output");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1024, height: 580 },
  deviceScaleFactor: 1,
  reducedMotion: MOTION === "reduce" ? "reduce" : "no-preference",
});
const page = await context.newPage();
page.on("pageerror", (error) => console.error(`[page error] ${error.message}`));

async function shot(name) {
  const file = path.join(OUT, `${name}-${SUFFIX}.png`);
  const buffer = await page.screenshot({ type: "png" });
  writeFileSync(file, buffer);
  writeFileSync(path.join(MIRROR, `catch-up-compression-${name}-${SUFFIX}.png`), buffer);
  console.log(`  ${path.relative(REPO, file)}`);
}

/** Hold until the founding reaches this beat and this fraction through it. */
async function atBeat(index, within) {
  const deadline = Date.now() + 90_000;
  for (;;) {
    const state = await page.evaluate(() => {
      const node = document.querySelector("[data-testid=catchup-founding]");
      return node === null
        ? null
        : {
            index: Number(node.getAttribute("data-beat-index")),
            progress: Number(node.getAttribute("data-progress")),
            shape: node.getAttribute("data-shape"),
          };
    });
    if (state !== null) {
      const at = state.progress * 4 - state.index;
      if (state.index > index || (state.index === index && at >= within)) {
        return state;
      }
    }
    if (Date.now() > deadline) {
      throw new Error(`never reached beat ${index} at ${within}`);
    }
    await page.waitForTimeout(20);
  }
}

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Start", exact: true }).click();
await page.waitForSelector("[data-testid=catchup-dev-skip]", { timeout: 30000 });
await page.waitForTimeout(2500);

/**
 * Dismiss the first-run onboarding reel, which is not this branch's surface.
 *
 * It landed on `integration` in #504 and it opens over the city on a fresh session, so every
 * frame taken without dismissing it is a frame of the reel with a catch-up behind it. Worth
 * recording rather than quietly skipping: on a real learner's route the reel comes FIRST and
 * this stacking is a live demo-path question that belongs to whoever owns the ordering.
 */
for (const label of ["Skip", "Got it", "Start building"]) {
  const control = page.getByRole("button", { name: label, exact: true });
  if ((await control.count()) > 0) {
    await control
      .first()
      .click({ timeout: 2000 })
      .catch(() => undefined);
    await page.waitForTimeout(200);
  }
}
await page.waitForTimeout(500);
await page.click(`[data-testid=catchup-dev-skip-era-${PLACED}]`);
await page.click("[data-testid=catchup-dev-skip-at-0]");
await page.waitForSelector("[data-testid=catchup-prompt]");
await page.click("[data-testid=catchup-dev-skip-fold]");

console.log(`\n=== ${MOTION}, placed at ${PLACED}, 1024x580 ===`);

/* --- 1. THE PROMPT, which is the surface the lead called confusing ------- */
await shot("01-prompt-age-one");
await page.click("[data-testid=catchup-disclosure-toggle]");
await page.waitForTimeout(150);
await shot("02-prompt-disclosure-open");
await page.click("[data-testid=catchup-disclosure-toggle]");
await page.waitForTimeout(150);

/* --- 2. THE FULL FOUNDING, which is the one that must still land --------- */
await page.click("[data-testid=catchup-choose-keep_going]");
await page.waitForSelector("[data-testid=catchup-placing]");
await shot("03-first-age-placed-by-hand");
await page.click("[data-testid=catchup-placing-done]");

for (const [name, index, within] of [
  ["04-full-beat1-gathering", 0, 0.55],
  ["05-full-beat2-expansion", 1, 0.55],
  ["06-full-beat3-rebuild-early", 2, 0.2],
  ["07-full-beat3-rebuild-late", 2, 0.85],
  ["08-full-beat4-retheme-early", 3, 0.2],
  ["09-full-beat4-retheme-late", 3, 0.85],
]) {
  const state = await atBeat(index, within);
  console.log(`  (${state.shape}, beat ${state.index}, ${state.progress})`);
  await shot(name);
}

/* --- 3. THE RECAP, which is the whole question ---------------------------- */
await page.waitForSelector("[data-testid=catchup-prompt]", { timeout: 60000 });
await shot("10-prompt-age-two");
await page.click("[data-testid=catchup-choose-keep_going]");

for (const [name, index, within] of [
  ["11-recap-beat1-gathering", 0, 0.5],
  ["12-recap-beat2-expansion", 1, 0.5],
  ["13-recap-beat3-rebuild", 2, 0.6],
  ["14-recap-beat4-retheme", 3, 0.6],
]) {
  const state = await atBeat(index, within);
  console.log(`  (${state.shape}, beat ${state.index}, ${state.progress})`);
  await shot(name);
}

/* --- 4. A LATER RECAP, where the island is bigger and the walk was longest */
await page.waitForSelector("[data-testid=catchup-prompt]", { timeout: 60000 });
await page.click("[data-testid=catchup-choose-keep_going]");
await atBeat(1, 0.5);
await page.waitForSelector("[data-testid=catchup-prompt]", { timeout: 60000 });
await page.click("[data-testid=catchup-choose-keep_going]");
await atBeat(0, 0.4);
await shot("15-recap-age-four-gathering");
await atBeat(2, 0.7);
await shot("16-recap-age-four-rebuild");

await browser.close();
console.log("done");
