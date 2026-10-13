/**
 * BEAT THREE, PHOTOGRAPHED THROUGH, AT THE LEAD'S OWN WINDOW.
 *
 * The reversal is a claim about MOTION, so a still frame does not settle it on its own: this
 * walks beat three one check at a time with the hatch's new step control, photographs every
 * point, and then puts a real WRONG ANSWER into the middle of the beat and photographs again.
 * The pair either side of that miss is the whole evidence — pre-fix the scaffold ring drops
 * from four rungs to one and the material stack empties; post-fix the two frames are the same
 * island.
 *
 * Frames are the WHOLE WINDOW and there is a second capture per state with the ceremony layer
 * hidden, on `docs/design-refs/era-advance-beats/README.md`'s reasoning: a claim about what is
 * visible around a thing has to be framed to show the other thing, and a WebGL canvas
 * photographs stale under a full-screen overlay.
 *
 *   npm run dev
 *   node scripts/qa/beat-three-only-gains.mjs http://localhost:5173 docs/design-refs/beat-three-only-gains
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const outDir = process.argv[3] ?? "docs/design-refs/beat-three-only-gains";
const VIEW = { width: 1024, height: 580 };

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: VIEW });
await page.emulateMedia({ reducedMotion: "reduce" });
page.on("pageerror", (e) => console.error("pageerror:", e.message));

const t0 = Date.now();
const say = (m) =>
  console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s] ${m}`);

/* ------------------------------------------------- the demo path, as a presenter walks it */

await page.goto(`${base}/?reset`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Take Diagnostic" }).click();
// "All wrong" rather than "All right": acing the diagnostic now hands four ages over to the
// catch-up walk (#532), whose prompt card sits over the ceremony and is not this frame's
// subject. A ground-up placement stands the learner in era one with the ceremony's own door
// in the menu, which is the state the beats are watched from.
await page.locator('[data-testid="dgx-dev-skip-miss"]').click();
await page
  .locator('[data-testid="dgx-dev-skip"] .dgx-skip__note')
  .filter({ hasText: /questions asked/ })
  .waitFor({ timeout: 180000 });
// ⚑ MEASURED, THEN WORKED AROUND — a finding rather than housekeeping, and not this change's
// to fix. `.ob-replay` is `position: fixed; right: 10px; z-index: 65`, open by default, and on
// a 1024x580 window its CHIP sits over the diagnostic summary's "Back to city" button:
// Playwright refuses the click with *"<p class="ob-replay__eyebrow">Dev only, not on the
// learner build</p> ... intercepts pointer events"*, and folding does not help because the
// eyebrow is outside the folded region. Same dev-hatch collision class the ceremony's own
// panel was placed to avoid, live on the demo path, in another lane's file.
const collision = await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find(
    (node) => node.textContent?.trim() === "Back to city",
  );
  const replay = document.querySelector(".ob-replay");
  if (!button || !replay) {
    return null;
  }
  const b = button.getBoundingClientRect();
  const r = replay.getBoundingClientRect();
  const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return {
    button: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
    replay: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    atButtonCentre: at?.className || at?.tagName,
    reachable: button.contains(at) || button === at,
  };
});
console.log(`[ob-replay collision] ${JSON.stringify(collision)}`);
await page.addStyleTag({ content: ".ob-replay { display: none !important; }" });
await page.getByRole("button", { name: /^Back to city$/ }).click();
await page
  .getByRole("button", { name: /^Close$/ })
  .first()
  .click({ timeout: 8000 })
  .catch(() => undefined);
await page.locator(".city-viewport canvas").waitFor({ timeout: 60000 });
await page.waitForTimeout(6000);

// The intro sequence, skipped. A ground-up placement opens on it; it is another surface's
// modal and is not this frame's subject.
await page
  .locator('[data-testid="onboarding-advisor-skip"]')
  .click({ timeout: 20000 })
  .catch(() => undefined);
await page.waitForTimeout(800);

for (let attempt = 0; attempt < 6; attempt += 1) {
  const skipTips = page.locator('[data-testid="coach-mark-build-skip"]').first();
  if (await skipTips.isVisible().catch(() => false)) {
    await skipTips.click();
    await page.waitForTimeout(500);
  }
  if ((await page.locator(".coach-mark, [data-testid^='coach-mark']").count()) === 0) {
    break;
  }
  await page.waitForTimeout(800);
}

await page.locator('[aria-label="Menu"]').first().click();
await page.locator('[data-testid="menu-ceremony"]').click();
await page.locator('[data-testid="era-ceremony"]').waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);
say("ceremony open");

/* ----------------------------------------------------------------- settle and frame diff */

async function diffFraction(a, b) {
  return page.evaluate(
    async ([left, right]) => {
      const load = (data) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("frame did not decode"));
          image.src = `data:image/png;base64,${data}`;
        });
      const [first, second] = await Promise.all([load(left), load(right)]);
      const sink = document.createElement("canvas");
      sink.width = first.naturalWidth;
      sink.height = first.naturalHeight;
      const ctx = sink.getContext("2d");
      ctx.drawImage(first, 0, 0);
      const one = ctx.getImageData(0, 0, sink.width, sink.height).data;
      ctx.clearRect(0, 0, sink.width, sink.height);
      ctx.drawImage(second, 0, 0);
      const two = ctx.getImageData(0, 0, sink.width, sink.height).data;
      let differing = 0;
      for (let at = 0; at < one.length; at += 4) {
        if (
          Math.abs(one[at] - two[at]) > 12 ||
          Math.abs(one[at + 1] - two[at + 1]) > 12 ||
          Math.abs(one[at + 2] - two[at + 2]) > 12
        ) {
          differing += 1;
        }
      }
      return differing / (sink.width * sink.height);
    },
    [a, b],
  );
}

const AT_REST = 0.0005;
async function settle(budgetMs = 12000) {
  const start = Date.now();
  let previous = (await page.screenshot({ animations: "allow" })).toString("base64");
  while (Date.now() - start < budgetMs) {
    await page.waitForTimeout(200);
    const shot = (await page.screenshot({ animations: "allow" })).toString("base64");
    const moved = await diffFraction(previous, shot);
    previous = shot;
    if (moved < AT_REST) {
      return Date.now() - start;
    }
  }
  return null;
}

const fold = page.locator('[data-testid="era-dev-skip-fold"]');
async function setFolded(folded) {
  const open = (await fold.getAttribute("aria-expanded")) === "true";
  if (open === folded) {
    await fold.click();
    await page.waitForTimeout(150);
  }
}

/** Hide the whole ceremony layer, capture the island alone, put it back. */
async function islandOnly(name) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "hide-ceremony";
    // The hatch is PORTALLED to document.body (see `CeremonyDevSkip`'s `HATCH_Z`), so it is
    // no longer a descendant of the stage and has to be named separately or it survives into
    // the island-only frame.
    style.textContent =
      '[data-testid="era-ceremony"], [data-testid="era-ceremony"] *,' +
      '[data-testid="era-dev-skip"], [data-testid="era-dev-skip"] * { visibility: hidden !important; }';
    document.head.append(style);
  });
  await page.waitForTimeout(900);
  const shot = await page.screenshot({ animations: "allow" });
  writeFileSync(`${outDir}/island-only-${name}-1024x580.png`, shot);
  await page.evaluate(() => document.querySelector("#hide-ceremony")?.remove());
  await page.waitForTimeout(300);
  return shot.toString("base64");
}

/** Where the hall and its scaffold ring sit in this frame, read off the committed captures. */
const HALL_CROP = { x: 400, y: 90, width: 260, height: 180 };

const report = [
  `# beat three, walked one check at a time — ${VIEW.width}x${VIEW.height}, reduced motion`,
  "",
];
const islands = {};

async function capture(name, shows) {
  await setFolded(true);
  await page.waitForTimeout(300);
  await settle();
  writeFileSync(
    `${outDir}/${name}-1024x580.png`,
    await page.screenshot({ animations: "allow" }),
  );
  islands[name] = await islandOnly(name);
  // AND THE RING, CLOSE UP. The full window is what an occlusion claim owes; the rungs
  // climbing a nine-unit ring round the hall are about twenty pixels at this lens, so the
  // crop is what makes the beat's own change legible to somebody reading the frames.
  writeFileSync(
    `${outDir}/hall-${name}-1024x580-crop.png`,
    await page.screenshot({ animations: "allow", clip: HALL_CROP }),
  );
  const rail = await page
    .locator('[data-testid="era-ceremony-rail"] li[data-state="current"]')
    .getAttribute("data-fill")
    .catch(() => null);
  const banked = await page
    .locator('[data-testid="era-ceremony"]')
    .getAttribute("data-banked");
  report.push(`${name}: ${shows}`, `  rail fill ${rail}, data-banked ${banked}`);
  say(`${name}  rail=${rail} banked=${banked}`);
}

/* --------------------------------------------------------- stand at beat three and walk it */

await setFolded(false);
await page.locator('[data-testid="era-dev-skip-expansion"]').click();
await settle();
await capture(
  "01-beat-three-check-0",
  "beat three opens: the ring stands, no rungs climbed",
);

await setFolded(false);
await page.locator('[data-testid="era-dev-skip-step"]').click();
await settle();
await capture("02-beat-three-check-1", "one check on");

await setFolded(false);
await page.locator('[data-testid="era-dev-skip-step"]').click();
await settle();
await capture(
  "03-beat-three-check-2",
  "two checks on: the ring is climbing, the stack is arriving",
);

/* ---------------------------------------------------------------- and now a WRONG ANSWER */

const field = page
  .locator('[data-testid="era-ceremony"] input, [data-testid="era-ceremony"] textarea')
  .first();
await field.fill("-987654");
await page.locator('[data-testid="era-ceremony-check"]').click();
await page.waitForTimeout(600);
const paused = await page
  .locator('[data-testid="era-ceremony"]')
  .getAttribute("data-paused");
say(`answered wrong; data-paused=${paused}`);
await capture(
  "04-beat-three-after-a-miss",
  `a real wrong answer inside beat three (paused=${paused})`,
);

const moved = await diffFraction(
  islands["03-beat-three-check-2"],
  islands["04-beat-three-after-a-miss"],
);
report.push(
  "",
  `THE PAIR THE REPORT IS ABOUT — island either side of the miss: ${(moved * 100).toFixed(3)}% of the frame differs`,
  "",
);
say(`island either side of the miss: ${(moved * 100).toFixed(3)}% of the frame differs`);

/* ------------------------------------------------ carry on, finish the beat, and the panel */

const carryOn = page.locator('[data-testid="era-ceremony-resume"]');
if (await carryOn.isVisible().catch(() => false)) {
  await carryOn.click();
  await page.waitForTimeout(400);
}
// Step until the beat actually closes: the miss cost a check, so this is one more press than
// a clean walk needs, which is D-ET11 still charging for it.
for (let press = 0; press < 4; press += 1) {
  await setFolded(false);
  await page.locator('[data-testid="era-dev-skip-step"]').click();
  await settle();
  const beat = await page.locator('[data-testid="era-ceremony"]').getAttribute("data-beat");
  if (beat !== "rebuild") {
    break;
  }
}
await capture(
  "05-beat-three-done",
  "the last check: beat three closes and beat four opens",
);

/* --------------------------------------- the hatch itself, open, so its footprint is visible */

await setFolded(false);
await page.waitForTimeout(400);
await settle();
writeFileSync(
  `${outDir}/06-hatch-open-1024x580.png`,
  await page.screenshot({ animations: "allow" }),
);

const box = await page.locator('[data-testid="era-dev-skip"]').boundingBox();
const covered = await page.evaluate(() => {
  const panel = document.querySelector('[data-testid="era-dev-skip"]');
  const rect = panel.getBoundingClientRect();
  const hits = new Set();
  for (let y = rect.top + 4; y < rect.bottom - 4; y += 12) {
    for (let x = rect.left + 4; x < rect.right - 4; x += 12) {
      for (const node of document.elementsFromPoint(x, y)) {
        if (panel.contains(node)) {
          continue;
        }
        const testid = node.getAttribute?.("data-testid");
        const cls = typeof node.className === "string" ? node.className : "";
        if (testid) {
          hits.add(`[data-testid=${testid}]`);
        } else if (cls) {
          hits.add(`.${cls.split(/\s+/)[0]}`);
        }
      }
    }
  }
  return [...hits];
});

/** Is every control the ceremony ships reachable with the hatch open? */
const reach = await page.evaluate(() => {
  const wanted = [
    "era-ceremony-check",
    "era-dev-skip-next",
    "era-dev-skip-step",
    "era-dev-skip-top",
    "era-dev-skip-gathering",
    "era-dev-skip-expansion",
    "era-dev-skip-rebuild",
    "era-dev-skip-retheme",
    "era-dev-skip-fold",
  ];
  return wanted.map((id) => {
    const node = document.querySelector(`[data-testid="${id}"]`);
    if (!node) {
      return { id, state: "absent" };
    }
    const rect = node.getBoundingClientRect();
    const top = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return { id, state: node.contains(top) || node === top ? "reachable" : "covered" };
  });
});

report.push(
  "",
  `the hatch, open: ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}` +
    ` — ${(((box.width * box.height) / (VIEW.width * VIEW.height)) * 100).toFixed(1)}% of a ${VIEW.width}x${VIEW.height} window`,
  `  what is behind it: ${covered.join(", ") || "(nothing but the page)"}`,
  "",
  "every control, hit-tested at its own centre with the hatch open:",
  ...reach.map((entry) => `  ${entry.state.padEnd(10)} ${entry.id}`),
  "",
);
say(
  `hatch ${Math.round(box.width)}x${Math.round(box.height)} at ${Math.round(box.x)},${Math.round(box.y)}; ` +
    `${reach.filter((r) => r.state === "reachable").length} of ${reach.length} controls reachable`,
);
say(`behind it: ${covered.join(", ") || "nothing"}`);

writeFileSync(`${outDir}/measured-1024x580.txt`, report.join("\n"));
await browser.close();
