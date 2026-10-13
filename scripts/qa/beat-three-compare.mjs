/**
 * THE PAIR EITHER SIDE OF A MISS, BEFORE AND AFTER THE FIX, ON ONE SHEET.
 *
 * Four crops of the hall's scaffold ring from `beat-three-only-gains.mjs`, at 2x so the rungs
 * are legible, with a difference map under each pair. The claim is *"the ring came down when
 * the learner missed"*, and the only way to settle a claim about a rendered frame is a rendered
 * frame somebody looked at.
 *
 *   node scripts/qa/beat-three-compare.mjs docs/design-refs/beat-three-only-gains
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const dir = process.argv[2] ?? "docs/design-refs/beat-three-only-gains";
const b64 = (path) => readFileSync(path).toString("base64");

const shots = {
  beforeA: b64(`${dir}/before/hall-03-beat-three-check-2-1024x580-crop.png`),
  beforeB: b64(`${dir}/before/hall-04-beat-three-after-a-miss-1024x580-crop.png`),
  afterA: b64(`${dir}/hall-03-beat-three-check-2-1024x580-crop.png`),
  afterB: b64(`${dir}/hall-04-beat-three-after-a-miss-1024x580-crop.png`),
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#10161e;
  font:13px/1.4 ui-monospace,Menlo,monospace;color:#e8eef4">
  <div id="sheet" style="padding:18px"></div>
  <script>window.__shots = ${JSON.stringify(shots)};</script>
</body></html>`);

const summary = await page.evaluate(async () => {
  const load = (data) =>
    new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = `data:image/png;base64,${data}`;
    });

  const SCALE = 2;
  const sheet = document.getElementById("sheet");
  const diffs = {};

  const row = (title, note, a, b, key) => {
    const wrap = document.createElement("div");
    wrap.style.marginBottom = "18px";
    const h = document.createElement("div");
    h.innerHTML =
      `<span style="font-weight:700;font-size:15px">${title}</span>` +
      `<span style="color:#9fb0c0"> — ${note}</span>`;
    h.style.marginBottom = "6px";
    wrap.append(h, a);
    sheet.append(wrap);
    diffs[key] = b;
  };

  const panel = async (label, image, tint) => {
    const box = document.createElement("figure");
    box.style.cssText = "margin:0;display:inline-block;vertical-align:top";
    const cap = document.createElement("figcaption");
    cap.textContent = label;
    cap.style.cssText = `color:${tint};font-weight:700;margin-bottom:4px`;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth * SCALE;
    canvas.height = image.naturalHeight * SCALE;
    canvas.style.cssText = `border:2px solid ${tint};display:block`;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    box.append(cap, canvas);
    return box;
  };

  const pixels = (image) => {
    const c = document.createElement("canvas");
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  };

  const differenceMap = (one, two, tint) => {
    const a = pixels(one);
    const b = pixels(two);
    const c = document.createElement("canvas");
    c.width = a.width;
    c.height = a.height;
    const ctx = c.getContext("2d");
    const out = ctx.createImageData(a.width, a.height);
    let moved = 0;
    for (let at = 0; at < a.data.length; at += 4) {
      const off =
        Math.abs(a.data[at] - b.data[at]) > 12 ||
        Math.abs(a.data[at + 1] - b.data[at + 1]) > 12 ||
        Math.abs(a.data[at + 2] - b.data[at + 2]) > 12;
      if (off) moved += 1;
      out.data[at] = off ? 255 : 16;
      out.data[at + 1] = off ? (tint === "warn" ? 60 : 220) : 22;
      out.data[at + 2] = off ? (tint === "warn" ? 60 : 60) : 30;
      out.data[at + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    const scaled = document.createElement("canvas");
    scaled.width = a.width * SCALE;
    scaled.height = a.height * SCALE;
    const sctx = scaled.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(c, 0, 0, scaled.width, scaled.height);
    scaled.style.cssText = "border:2px solid #4a5a6a;display:block";
    return { node: scaled, share: moved / (a.width * a.height) };
  };

  const build = async (title, note, aData, bData, tint, key) => {
    const [a, b] = await Promise.all([load(aData), load(bData)]);
    const strip = document.createElement("div");
    strip.style.cssText = "display:flex;gap:12px;align-items:flex-start";
    const diff = differenceMap(a, b, tint);
    const diffBox = document.createElement("figure");
    diffBox.style.cssText = "margin:0";
    const diffCap = document.createElement("figcaption");
    diffCap.textContent = `what moved (${(diff.share * 100).toFixed(2)}% of the crop)`;
    diffCap.style.cssText = "color:#9fb0c0;font-weight:700;margin-bottom:4px";
    diffBox.append(diffCap, diff.node);
    strip.append(
      await panel("two checks banked", a, "#7fd18a"),
      await panel(
        "after ONE wrong answer, same beat",
        b,
        tint === "warn" ? "#ff6b6b" : "#7fd18a",
      ),
      diffBox,
    );
    row(title, note, strip, null, key);
    return diff.share;
  };

  const beforeShare = await build(
    "BEFORE — beatProgress reads the live bank  (trunk 5b3bae73)",
    "the ring loses its rungs and the material stack empties: the hall un-builds",
    window.__shots.beforeA,
    window.__shots.beforeB,
    "warn",
    "before",
  );
  const afterShare = await build(
    "AFTER — beatProgress reads the beat's high-water mark",
    "the check still comes off (data-banked 2 -> 1) and the hall does not move",
    window.__shots.afterA,
    window.__shots.afterB,
    "ok",
    "after",
  );

  const foot = document.createElement("div");
  foot.style.cssText = "color:#9fb0c0;margin-top:6px";
  foot.textContent =
    "1024x580, reduced motion, live dev server. Crop is x400 y90 260x180 of the window, " +
    "drawn at 2x with smoothing off. The wrong answer is a real one through the shipped checker.";
  document.getElementById("sheet").append(foot);
  return { beforeShare, afterShare };
});

await page.waitForTimeout(300);
const sheet = await page.locator("#sheet").screenshot();
writeFileSync(`${dir}/00-the-pair-either-side-of-a-miss.png`, sheet);
console.log(
  `crop diff either side of the miss — before: ${(summary.beforeShare * 100).toFixed(2)}%, ` +
    `after: ${(summary.afterShare * 100).toFixed(2)}%`,
);
await browser.close();
