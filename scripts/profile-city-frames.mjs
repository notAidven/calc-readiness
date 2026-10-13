#!/usr/bin/env node
/**
 * Profile what the city costs a player: bytes on the driver, frames on the clock.
 *
 * `measure-client-memory.mjs` answered "where does the RAM go" and found one unbounded
 * leak. This answers the question after it — **what is the largest remaining thing a
 * player feels** — and it needs instruments the first harness did not have:
 *
 *  - **Real GPU bytes**, from `bufferData` and `texImage2D` rather than from
 *    `renderer.info`'s counts, because a count cannot tell an island from a marker.
 *  - **Frame cadence over a window**, not a point sample: p50/p95/p99, the longest
 *    frame, dropped percentage against the window's own median interval, and long tasks.
 *  - **Draw calls per second while nothing is happening**, which is the only way to
 *    settle whether an idle city is redrawing itself.
 *  - **React commits**, counted through a minimal `__REACT_DEVTOOLS_GLOBAL_HOOK__`
 *    installed before React loads, so no app source has to be touched to see them.
 *  - **Input to next paint**, measured as dispatch to the frame that shows the result.
 *
 * The viewport is 1024x580 and the CPU is throttled (`--cpu N`), because the complaint is
 * about a machine under load and a comfortable developer window measures a screen nobody
 * has. Read every RSS figure against the blank-page floor the run measures for itself:
 * this box has no GPU, so SwiftShader's software rasteriser is in every number here. That
 * inflates absolute frame times and moves some of what a real GPU would hold in VRAM into
 * system RAM. The COMPARISONS are still sound -- both sides of every before/after run on
 * the same rasteriser -- but do not read the absolutes as a player's.
 *
 * Usage:
 *   node scripts/profile-city-frames.mjs --url http://127.0.0.1:5173 --label dev --cpu 4
 *   node scripts/profile-city-frames.mjs --url http://127.0.0.1:4173 --label prod --cpu 4
 *   node scripts/profile-city-frames.mjs --url ... --shadows always # pre-freeze control
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

import { CITY_PROFILE_PROBE } from "./lib/cityProfileProbe.mjs";

function arg(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const next = process.argv[at + 1];
  return next === undefined || next.startsWith("--") ? true : next;
}

const URL_BASE = arg("url", "http://127.0.0.1:5173");
const LABEL = arg("label", "run");
const OUT_DIR = arg("out", "output/frames");
const CPU_THROTTLE = Number(arg("cpu", "4"));
const IDLE_WINDOW_MS = Number(arg("idle", "6000"));
const SHADOW_MODE = arg("shadows", "app");
const VIEWPORT = { width: 1024, height: 580 };
const TAG = `crframe-${process.pid}-${Date.now()}`;

if (SHADOW_MODE !== "app" && SHADOW_MODE !== "always") {
  throw new Error(`--shadows must be "app" or "always", got ${SHADOW_MODE}`);
}

/* ------------------------------------------------------- process-tree RSS (Linux) */

function readProc(pid, file) {
  try {
    return readFileSync(`/proc/${pid}/${file}`, "utf8");
  } catch {
    return null;
  }
}

function rssSummary() {
  const pids = readdirSync("/proc")
    .filter((n) => /^\d+$/.test(n))
    .map(Number);
  const cmdlines = new Map();
  for (const pid of pids) {
    const cmd = readProc(pid, "cmdline");
    if (cmd !== null) cmdlines.set(pid, cmd.split("\0").join(" "));
  }
  const roots = [...cmdlines].filter(([, cmd]) => cmd.includes(TAG)).map(([pid]) => pid);
  if (roots.length === 0) return { totalMb: 0, processes: 0, byTypeMb: {} };
  const parent = new Map();
  for (const pid of pids) {
    const status = readProc(pid, "status");
    const line = status?.split("\n").find((l) => l.startsWith("PPid:"));
    if (line) parent.set(pid, Number(line.replace(/\D+/g, "")));
  }
  const inTree = new Set(roots);
  for (let pass = 0; pass < 8; pass += 1) {
    let grew = false;
    for (const pid of pids) {
      if (inTree.has(pid)) continue;
      const pp = parent.get(pid);
      if (pp !== undefined && inTree.has(pp)) {
        inTree.add(pid);
        grew = true;
      }
    }
    if (!grew) break;
  }
  const byType = {};
  let totalKb = 0;
  for (const pid of inTree) {
    const status = readProc(pid, "status");
    const line = status?.split("\n").find((l) => l.startsWith("VmRSS:"));
    const kb = line ? Number(line.replace(/\D+/g, "")) : 0;
    const type = /--type=([a-z-]+)/.exec(cmdlines.get(pid) ?? "")?.[1] ?? "browser";
    byType[type] = (byType[type] ?? 0) + kb;
    totalKb += kb;
  }
  return {
    totalMb: +(totalKb / 1024).toFixed(1),
    processes: inTree.size,
    byTypeMb: Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, +(v / 1024).toFixed(1)]),
    ),
  };
}

/* ------------------------------------------------------------------- the point sample */

const SAMPLE = String.raw`(() => {
  const probe = window.__cityProbe;
  const live = probe.rendererRefs.map((r) => r.deref()).filter((r) => r && r.info);
  const attached = live.filter((r) => document.contains(r.domElement));

  /* What the scene still holds, walked from the graph the renderer was last handed, with
     BYTES this time: a geometry's attribute arrays plus its index are exactly what was
     uploaded, so this is the live half of the driver's own total. */
  let sceneGeometries = 0;
  let sceneGeometryBytes = 0;
  let sceneMaterials = 0;
  let sceneTextures = 0;
  let sceneTextureBytes = 0;
  let sceneMeshes = 0;
  let sceneVertices = 0;
  const seenGeo = new Set();
  const seenMat = new Set();
  const seenTex = new Set();
  for (const renderer of attached) {
    const ref = probe.sceneRefs.get(renderer);
    const scene = ref && ref.deref ? ref.deref() : null;
    if (!scene) continue;
    scene.traverse((node) => {
      const geo = node.geometry;
      if (geo && !seenGeo.has(geo)) {
        seenGeo.add(geo);
        sceneGeometries += 1;
        for (const name of Object.keys(geo.attributes ?? {})) {
          const a = geo.attributes[name];
          if (a && a.array) sceneGeometryBytes += a.array.byteLength;
          if (name === "position" && a) sceneVertices += a.count;
        }
        if (geo.index && geo.index.array) sceneGeometryBytes += geo.index.array.byteLength;
      }
      if (node.geometry) sceneMeshes += 1;
      const mats = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
      for (const mat of mats) {
        if (seenMat.has(mat)) continue;
        seenMat.add(mat);
        sceneMaterials += 1;
        for (const value of Object.values(mat)) {
          if (!value || typeof value !== "object" || !value.isTexture) continue;
          if (seenTex.has(value)) continue;
          seenTex.add(value);
          sceneTextures += 1;
          const img = value.image;
          const w = img && (img.width ?? img.videoWidth);
          const h = img && (img.height ?? img.videoHeight);
          if (w && h) sceneTextureBytes += w * h * 4 * (value.generateMipmaps === false ? 1 : 4 / 3);
        }
      }
    });
  }

  /* RANK THE SCENE BY WHAT IT COSTS TO DRAW, per top-level subtree.
     A draw call is issued per (mesh, material) that survives culling, so a subtree's mesh
     count IS its draw-call share for an opaque forward pass -- which is why the island's
     one-material-per-mesh construction is the thing to look at. Shadow casters are
     counted separately because each one is drawn a SECOND time into the shadow map. */
  const subtrees = [];
  for (const renderer of attached) {
    const ref = probe.sceneRefs.get(renderer);
    const scene = ref && ref.deref ? ref.deref() : null;
    if (!scene) continue;
    for (const child of scene.children) {
      let meshes = 0;
      let tris = 0;
      let casters = 0;
      const mats = new Set();
      child.traverse((node) => {
        const geo = node.geometry;
        if (!geo) return;
        meshes += 1;
        if (node.castShadow) casters += 1;
        const index = geo.index;
        const pos = geo.attributes && geo.attributes.position;
        const count = index ? index.count : pos ? pos.count : 0;
        tris += Math.floor(count / 3);
        const ms = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        for (const m of ms) mats.add(m);
      });
      if (meshes === 0) continue;
      subtrees.push({
        name: child.name || child.type,
        meshes,
        triangles: tris,
        materials: mats.size,
        shadowCasters: casters,
      });
    }
  }
  subtrees.sort((a, b) => b.meshes - a.meshes);

  const info = attached.reduce(
    (acc, r) => ({
      geometries: acc.geometries + r.info.memory.geometries,
      textures: acc.textures + r.info.memory.textures,
      programs: acc.programs + (r.info.programs ? r.info.programs.length : 0),
      calls: acc.calls + r.info.render.calls,
      triangles: acc.triangles + r.info.render.triangles,
      points: acc.points + r.info.render.points,
      lines: acc.lines + r.info.render.lines,
    }),
    { geometries: 0, textures: 0, programs: 0, calls: 0, triangles: 0, points: 0, lines: 0 },
  );

  const resources = performance.getEntriesByType("resource");
  let transferBytes = 0;
  const glbFiles = [];
  for (const entry of resources) {
    transferBytes += entry.transferSize || entry.encodedBodySize || 0;
    const glb = /(\/[^?]*\.glb)(\?|$)/.exec(entry.name);
    if (glb && !glbFiles.includes(glb[1])) glbFiles.push(glb[1]);
  }

  const nav = performance.getEntriesByType("navigation")[0];
  const totalBlocking = probe.longTasks.reduce((s, t) => s + Math.max(0, t.duration - 50), 0);

  return {
    gpu: {
      bufferMb: +(probe.gpu.bufferBytes / 1048576).toFixed(2),
      bufferCount: probe.gpu.bufferCount,
      bufferFreedMb: +(probe.gpu.bufferBytesFreed / 1048576).toFixed(2),
      textureMb: +(probe.gpu.textureBytes / 1048576).toFixed(2),
      textureCount: probe.gpu.textureCount,
      textureFreedMb: +(probe.gpu.textureBytesFreed / 1048576).toFixed(2),
      renderbufferMb: +(probe.gpu.renderbufferBytes / 1048576).toFixed(2),
      renderbufferCount: probe.gpu.renderbufferCount,
      liveTotalMb: +(
        (probe.gpu.bufferBytes + probe.gpu.textureBytes + probe.gpu.renderbufferBytes) /
        1048576
      ).toFixed(2),
      programsLinked: probe.gpu.programsLinked,
      shaderCompileMs: +probe.gpu.shaderCompileMs.toFixed(1),
      programLinkMs: +probe.gpu.programLinkMs.toFixed(1),
      unsizedUploads: probe.gpu.unsizedUploads,
    },
    scene: {
      geometries: sceneGeometries,
      geometryMb: +(sceneGeometryBytes / 1048576).toFixed(2),
      vertices: sceneVertices,
      meshes: sceneMeshes,
      materials: sceneMaterials,
      textures: sceneTextures,
      textureMb: +(sceneTextureBytes / 1048576).toFixed(2),
    },
    renderer: info,
    subtrees: subtrees.slice(0, 14),
    renderCallsCumulative: probe.renderCalls,
    /* Held by the renderer and drawn by nothing: the #661 measurement, kept. */
    undrawnGeometries: info.geometries - sceneGeometries,
    renderersCreated: probe.renderersCreated,
    renderersAttached: attached.length,
    drawCallsCumulative: probe.draw.calls,
    reactCommitsCumulative: probe.reactCommits,
    longTasksCumulative: probe.longTasks.length,
    longTasksOver50msCumulative: probe.longTasks.filter((t) => t.duration > 50).length,
    totalBlockingMs: +totalBlocking.toFixed(0),
    fcpMs: probe.paint.fcp ? +probe.paint.fcp.toFixed(0) : null,
    lcpMs: probe.paint.lcp ? +probe.paint.lcp.toFixed(0) : null,
    domContentLoadedMs: nav ? +nav.domContentLoadedEventEnd.toFixed(0) : null,
    canvases: document.querySelectorAll("canvas").length,
    domNodes: document.querySelectorAll("*").length,
    audioLive: probe.audioRefs.filter((r) => r.deref() !== undefined).length,
    audioCreated: probe.audioCreated,
    decodeAudioDataCalls: probe.decodeCalls,
    requests: resources.length,
    transferMb: +(transferBytes / 1048576).toFixed(2),
    glbCount: glbFiles.length,
    glbFiles,
    jsHeapUsedMb: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    jsHeapTotalMb: performance.memory ? +(performance.memory.totalJSHeapSize / 1048576).toFixed(1) : null,
  };
})()`;

/* ------------------------------------------------------------------------- the run */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-precise-memory-info",
      "--js-flags=--expose-gc",
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
      `--crframe-tag=${TAG}`,
    ],
  });
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript(CITY_PROFILE_PROBE);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.enable");
  if (CPU_THROTTLE > 1) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
  }

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));

  const checkpoints = [];
  const frameWindows = [];
  const latencies = [];

  /**
   * Reproduce the pre-freeze renderer on this exact source tree.
   *
   * Applied after `CityLighting`'s mount effect, so `always` is Three's original behavior
   * (the same scene and signature traversal, but a depth pass every submission) without
   * commenting source and rebuilding a second tree. Re-applied before each scenario window
   * because the title and city own different renderers. Ablation windows opt out below:
   * each of those deliberately owns the renderer knob it is pricing.
   */
  async function applyShadowMode() {
    if (SHADOW_MODE !== "always") return;
    await page.evaluate(() => {
      for (const reference of window.__cityProbe.rendererRefs) {
        const renderer = reference.deref();
        if (!renderer || !document.contains(renderer.domElement)) continue;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.autoUpdate = true;
        renderer.shadowMap.needsUpdate = true;
      }
    });
  }

  async function checkpoint(name) {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(1200);
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(400);
    const metrics = await cdp.send("Performance.getMetrics");
    const m = Object.fromEntries(metrics.metrics.map((x) => [x.name, x.value]));
    const sample = await page.evaluate(SAMPLE);
    const row = {
      checkpoint: name,
      rss: rssSummary(),
      jsHeapMb: +(m.JSHeapUsedSize / 1048576).toFixed(1),
      jsHeapTotalMb: +(m.JSHeapTotalSize / 1048576).toFixed(1),
      domNodes: m.Nodes,
      documents: m.Documents,
      listeners: m.JSEventListeners,
      ...sample,
    };
    checkpoints.push(row);
    console.log(
      `${name.padEnd(24)} rss=${String(row.rss.totalMb).padStart(7)}MB ` +
        `heap=${String(row.jsHeapMb).padStart(6)}MB ` +
        `gpu=${String(row.gpu.liveTotalMb).padStart(7)}MB(buf ${row.gpu.bufferMb}/tex ${row.gpu.textureMb}) ` +
        `geo=${String(row.renderer.geometries).padStart(5)} drawn=${String(row.scene.geometries).padStart(5)} ` +
        `undrawn=${String(row.undrawnGeometries).padStart(5)} ` +
        `tri=${row.renderer.triangles} prog=${row.renderer.programs} ` +
        `dom=${row.domNodes} lst=${row.listeners} commits=${row.reactCommitsCumulative}`,
    );
    return row;
  }

  /** Measure frame cadence over a window while `during` runs (or while nothing does). */
  async function frameWindow(label, ms, during = null) {
    if (!label.startsWith("ablate-")) await applyShadowMode();
    await page.evaluate((l) => window.__cityProbe.beginWindow(l), label);
    if (during) await during();
    await page.waitForTimeout(ms);
    const row = await page.evaluate(() => window.__cityProbe.endWindow());
    if (row) {
      frameWindows.push(row);
      console.log(
        `  [frame] ${row.label.padEnd(22)} fps=${String(row.fps).padStart(5)} ` +
          `p50=${String(row.p50).padStart(6)}ms p95=${String(row.p95).padStart(7)}ms ` +
          `p99=${String(row.p99).padStart(7)}ms max=${String(row.longestFrameMs).padStart(7)}ms ` +
          `dropped=${String(row.droppedPct).padStart(5)}% ` +
          `draws/s=${String(row.drawCallsPerSecond).padStart(6)} ` +
          `draws/frame=${String(row.drawCallsPerFrame).padStart(6)} ` +
          `renders/s=${String(row.rendersPerSecond).padStart(5)} ` +
          `draws/render=${String(row.drawCallsPerRender).padStart(6)} ` +
          `(screen ${String(row.onscreenDrawsPerRender).padStart(6)} / shadow ${String(row.offscreenDrawsPerRender).padStart(6)}) ` +
          `longtasks=${row.longTasksOver50ms} commits=${row.reactCommits}`,
      );
    }
    return row;
  }

  /**
   * Click by DOM. The city keeps a full-bleed overlay over the island, so a pointer
   * click at a HUD button's centre lands on the overlay and silently does nothing.
   */
  async function domClick(match) {
    return page.evaluate((m) => {
      const all = [...document.querySelectorAll("button, a")];
      const found = all.find(
        (el) =>
          (m.label !== undefined && el.getAttribute("aria-label") === m.label) ||
          (m.testid !== undefined && el.getAttribute("data-testid") === m.testid) ||
          (m.text !== undefined && el.textContent?.trim() === m.text),
      );
      if (!found) return false;
      found.click();
      return true;
    }, match);
  }

  /** Input to next paint for one control, averaged over a few presses. */
  async function latency(name, match, presses = 5) {
    const samples = [];
    for (let i = 0; i < presses; i += 1) {
      const ms = await page.evaluate(
        async (m) =>
          window.__cityProbe.timeToNextPaint(() => {
            const all = [...document.querySelectorAll("button, a")];
            const found = all.find(
              (el) =>
                (m.label !== undefined && el.getAttribute("aria-label") === m.label) ||
                (m.testid !== undefined && el.getAttribute("data-testid") === m.testid),
            );
            found?.click();
          }),
        match,
      );
      samples.push(ms);
      await page.waitForTimeout(250);
    }
    samples.sort((a, b) => a - b);
    const row = {
      control: name,
      presses,
      p50Ms: samples[Math.floor(samples.length / 2)] ?? 0,
      worstMs: samples[samples.length - 1] ?? 0,
      samples,
    };
    latencies.push(row);
    console.log(`  [input] ${name.padEnd(22)} p50=${row.p50Ms}ms worst=${row.worstMs}ms`);
    return row;
  }

  console.log(
    `\n### ${LABEL} — ${URL_BASE} @ ${VIEWPORT.width}x${VIEWPORT.height}, cpu/${CPU_THROTTLE}\n`,
  );

  await page.goto("about:blank", { waitUntil: "load" });
  await checkpoint("00-blank-floor");

  await page.goto(`${URL_BASE}/?mock`, { waitUntil: "load" });
  await applyShadowMode();
  await checkpoint("01-title");
  // A control with exactly ONE renderer ever constructed, so a doubled submission count
  // in the city cannot be blamed on the title's renderer still being in the loop.
  await frameWindow("idle-title", 4_000);

  const start = page.getByRole("button", { name: "Start", exact: true });
  if (await start.count()) await start.first().click();
  await page.waitForSelector("canvas", { timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(6_000);
  await applyShadowMode();
  await checkpoint("02-city-settled");

  // THE HEADLINE WINDOW: nobody is touching anything. Draw calls per second here is the
  // whole of the continuous-rendering question.
  await frameWindow("idle-city", IDLE_WINDOW_MS);

  // ABLATION, on the settled city: what does each candidate actually cost? Every knob is
  // a runtime renderer property, so this prices them without changing a line of source
  // and without asking anybody to approve a look.
  await latency("zoom-in-button", { label: "Zoom in" });
  await latency("rotate-left-button", { label: "Rotate view left" });

  await frameWindow("toolbar-orbit", 4_000, async () => {
    for (let i = 0; i < 6; i += 1) {
      await domClick({ label: "Rotate view left" });
      await page.waitForTimeout(120);
    }
  });

  await frameWindow("pointer-orbit-drag", 4_000, async () => {
    const box = await page.locator("canvas").first().boundingBox();
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 0; i < 24; i += 1) {
      await page.mouse.move(cx + Math.sin(i / 3) * 160, cy + Math.cos(i / 4) * 60);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
  });

  await checkpoint("03-after-camera");

  async function openMenu() {
    if (await page.locator('[data-testid="dev-era-skip-advance"]').count()) return true;
    if (!(await domClick({ label: "Menu" }))) return false;
    await page.waitForTimeout(600);
    return (await page.locator('[data-testid="dev-era-skip-advance"]').count()) > 0;
  }

  // The era walk, with a frame window over the transition itself so the rebuild's cost
  // lands somewhere it can be read rather than being averaged into an idle minute.
  for (let era = 1; era <= 9; era += 1) {
    if (!(await openMenu())) {
      console.log(`  (no dev era control; stopping era walk at ${era - 1})`);
      break;
    }
    const advance = page.locator('[data-testid="dev-era-skip-advance"]');
    if ((await advance.first().getAttribute("aria-disabled")) === "true") break;
    await frameWindow(`era-advance-${String(era).padStart(2, "0")}`, 2_500, async () => {
      await domClick({ testid: "dev-era-skip-advance" });
    });
    if (era === 4 || era === 9)
      await checkpoint(`04-era-advance-${String(era).padStart(2, "0")}`);
  }

  if (await openMenu()) {
    await frameWindow("back-to-era-one", 2_500, async () => {
      await domClick({ testid: "dev-era-skip-reset" });
    });
    await checkpoint("05-back-to-era-one");
    await frameWindow("idle-city-after-walk", IDLE_WINDOW_MS);
  }

  if (await openMenu()) {
    if (await domClick({ text: "❄ Hard Winter" })) {
      await page.waitForTimeout(4_000);
      await checkpoint("06-crisis-open");
      await frameWindow("idle-crisis", 4_000);
    }
  }

  // The lesson/diagnostic seam: a full-screen React surface over the live canvas, in and
  // out again, which is where a retained root or a listener pile-up would show.
  if (await openMenu()) {
    if (await domClick({ text: "Diagnostic" })) {
      await page.waitForTimeout(5_000);
      await checkpoint("07-diagnostic-open");
      await frameWindow("idle-diagnostic", 4_000);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(3_000);
      await checkpoint("08-diagnostic-closed");
    }
  }

  /*
   * THE ABLATION BLOCK RUNS LAST, and that placement is a correction rather than a tidy.
   *
   * It used to sit right after the idle-city window, and its "baseline" restore sets
   * `shadowMap.autoUpdate = true` -- which is three's default and the right thing for an
   * ablation to restore, but it is NOT what the app configures. The app sets autoUpdate
   * false once, in an effect, so once the ablation had put it back nothing ever turned it
   * off again and every window after that point measured a city with the shadow freeze
   * disabled. That produced a completely convincing false finding -- "the freeze stops
   * holding after the first camera move", with the offscreen draws to prove it -- and the
   * cause was this harness. Run these after everything a scenario claim depends on.
   */
  for (const knob of [
    "baseline",
    "no-shadows",
    "frozen-shadows",
    "dpr-1",
    "share-island-materials",
    "static-island-matrices",
    "hide-biggest-subtree",
    "hide-two-biggest",
  ]) {
    if (knob !== "baseline") {
      await page.evaluate(() => window.__cityProbe.ablate("baseline"));
      await page.waitForTimeout(800);
    }
    await page.evaluate((k) => window.__cityProbe.ablate(k), knob);
    await page.waitForTimeout(1_200);
    const row = await frameWindow(`ablate-${knob}`, 5_000);
    if (knob === "share-island-materials") {
      const stats = await page.evaluate(() => window.__cityProbe.lastShareStats ?? null);
      if (stats) {
        console.log(
          `          (island materials: ${stats.distinctSignatures} distinct signatures, ` +
            `${stats.swapped} meshes repointed)`,
        );
        if (row) row.materialShare = stats;
      }
    }
  }

  const report = {
    label: LABEL,
    url: URL_BASE,
    takenAt: new Date().toISOString(),
    viewport: VIEWPORT,
    cpuThrottleRate: CPU_THROTTLE,
    shadowMode: SHADOW_MODE,
    checkpoints,
    frameWindows,
    latencies,
    pageErrors: errors.slice(0, 20),
  };
  const path = join(OUT_DIR, `${LABEL}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\nwrote ${path}`);
  if (errors.length)
    console.log(`page errors (${errors.length}): ${errors.slice(0, 3).join(" | ")}`);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
