#!/usr/bin/env node
/**
 * Name the shadow caster that will not hold still.
 *
 * "Something in a shadow-participating subtree changes every frame" is not an answer
 * anybody can act on. This drives the same sequence as the profiler and asks the probe
 * which nodes changed, including InstancedMesh buffer/count and material transitions rather
 * than only Object3D transforms. That coverage makes moving instanced props visible here.
 */

import { chromium } from "playwright";

import { CITY_PROFILE_PROBE } from "./lib/cityProfileProbe.mjs";

const URL_BASE = process.argv[2] ?? "http://127.0.0.1:5173";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--js-flags=--expose-gc"],
});
const context = await browser.newContext({ viewport: { width: 1024, height: 580 } });
await context.addInitScript(CITY_PROFILE_PROBE);
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));

await page.goto(`${URL_BASE}/?mock`, { waitUntil: "load" });
const start = page.getByRole("button", { name: "Start", exact: true });
if (await start.count()) await start.first().click();
await page.waitForSelector("canvas", { timeout: 90_000 }).catch(() => {});
await page.waitForTimeout(9_000);

async function report(label) {
  // Two calls: the first seeds the previous-frame map, the second reports differences.
  await page.evaluate(() => window.__cityProbe.movingCasters());
  await page.waitForTimeout(500);
  const moving = await page.evaluate(() => window.__cityProbe.movingCasters());
  const count = await page.evaluate(() => window.__cityProbe.lastCasterCount);
  console.log(`\n--- ${label} (${count} nodes in shadow-participating subtrees) ---`);
  if (moving.length === 0) {
    console.log("  nothing changed: the shadow map can stay frozen here");
    return;
  }
  for (const row of moving) {
    console.log(
      `  ${row.change.padEnd(11)} id=${String(row.id).padStart(6)}  ${row.what}` +
        (row.delta === undefined ? "" : `  delta=${row.delta}`),
    );
  }
}

await report("settled city, before any interaction");

await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.getAttribute("aria-label") === "Rotate view left",
  );
  btn?.click();
});
await page.waitForTimeout(4_000);
await report("after one toolbar rotate");

const box = await page.locator("canvas").first().boundingBox();
if (box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i < 12; i += 1) {
    await page.mouse.move(cx + i * 12, cy + i * 4);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}
await page.waitForTimeout(5_000);
await report("after a pointer orbit drag, settled again");

await browser.close();
