/**
 * Rasterise the crisis reference plates where `System.Drawing` cannot run.
 *
 * `tools/generate-winter-crisis-references.ps1` draws every plate and rasterises it through
 * `System.Drawing`, which is Windows-only from .NET 6. On Linux and macOS that pass warns and
 * skips, and this is what it names: the repository's own Playwright Chromium, which is already
 * a devDependency and already installed for the browser test suite, so this adds nothing to
 * install.
 *
 * ## THE TWO RASTERISERS DISAGREE, AND IT IS WORTH KNOWING WHERE
 *
 * SVG closes a `<polygon>`'s outline; `Graphics.DrawLines` does not. So a polygon carrying a
 * stroke renders as a closed shape here and as an open ribbon there. Era one's smoke column is
 * the measured instance and it is the only one in the tree: `05-fire-smoke-column.svg` is a
 * closed leaf-shaped column in a browser and an open zigzag in the committed PNG beside it.
 * `index.html` loads the SVG, so the browser reading is the one a reviewer sees.
 *
 * Everything added for eras four, six and nine is a FILLED polygon, so the two agree on all of
 * it. Keep it that way: reach for a filled shape rather than a stroke.
 *
 * Usage: node tools/rasterise-crisis-references.mjs [pack ...]
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = join(repoRoot, "docs/superpowers/specs/crisis-reference-packs");

const requested = process.argv.slice(2);
const packs =
  requested.length > 0
    ? requested
    : readdirSync(packRoot).filter((entry) =>
        statSync(join(packRoot, entry)).isDirectory(),
      );

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 1,
});

let written = 0;
for (const pack of packs) {
  const dir = join(packRoot, pack);
  const plates = readdirSync(dir)
    .filter((name) => name.endsWith(".svg"))
    .sort();
  for (const plate of plates) {
    const svg = readFileSync(join(dir, plate), "utf8");
    await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`, {
      waitUntil: "load",
    });
    await page.screenshot({ path: join(dir, plate.replace(/\.svg$/, ".png")) });
    written += 1;
  }
  console.log(`rasterised ${plates.length} plates in ${pack}`);
}

await browser.close();
console.log(`wrote ${written} PNGs`);
