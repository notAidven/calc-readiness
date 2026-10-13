#!/usr/bin/env node
/**
 * Measure what a play session costs a browser, so a "the game is laggy and eats RAM"
 * report can be answered with a ranked list instead of a guess.
 *
 * WHAT IT SAMPLES, AND WHY EACH ONE IS HERE. The JS heap alone is the wrong number:
 * geometry uploaded to the GPU, a media element's buffered bytes and a parsed GLB all
 * cost a learner memory while sitting outside `usedJSHeapSize` entirely. So each
 * checkpoint records four independent views and the report keeps them apart:
 *
 *   - **Process RSS**, summed over the whole Chromium tree and split by `--type=`
 *     (browser / renderer / gpu). This is the number in the owner's activity monitor.
 *   - **CDP `Performance.getMetrics`** for `JSHeapUsedSize`, `Nodes`, `Documents`,
 *     `JSEventListeners` — the DOM-side leak shapes.
 *   - **`renderer.info`** off the live `WebGLRenderer`, reached through three's own
 *     `__THREE_DEVTOOLS__` hook so no app source has to be touched to observe it.
 *     `memory.geometries` and `memory.textures` are decremented on `dispose()`, so a
 *     count that only ever climbs across era changes IS the undisposed-scene defect.
 *   - **A page-side probe** counting `new Audio()` elements still reachable, every
 *     `decodeAudioData` call, and the bytes the network actually moved.
 *
 * `--snapshot` additionally takes a V8 heap snapshot at the last checkpoint and ranks
 * constructors by retained self size, which is what turns "the heap is 300MB" into
 * "the heap is 300MB and here is what is in it".
 *
 * Usage:
 *   node scripts/measure-client-memory.mjs --url http://127.0.0.1:5173 --label dev
 *   node scripts/measure-client-memory.mjs --url http://127.0.0.1:4173 --label prod --snapshot
 *
 * The session it drives is the one the complaint names: load, the title screen, the
 * city, then an era advance per era to the end of the sequence. Every checkpoint is
 * preceded by a forced GC and a settle, so a climbing number is retention rather than
 * garbage that has not been collected yet.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

/* ------------------------------------------------------------------ arguments */

function arg(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const next = process.argv[at + 1];
  return next === undefined || next.startsWith("--") ? true : next;
}

const URL_BASE = arg("url", "http://127.0.0.1:5173");
const LABEL = arg("label", "run");
const OUT_DIR = arg("out", "output/memory");
const WANT_SNAPSHOT = arg("snapshot", false) !== false;
const ERA_STEPS = Number(arg("eras", "9"));
const SETTLE_MS = Number(arg("settle", "2500"));
const VIEWPORT_WIDTH = Number(arg("width", "1024"));
const VIEWPORT_HEIGHT = Number(arg("height", "580"));
const CPU_RATE = Number(arg("cpu", "4"));
const APP_QUERY = String(arg("query", "mock"));
const TRACE_COMPILE = arg("compile-trace", false) !== false;
/** Stamped into the browser's argv so the process walk can find this run's tree. */
const TAG = `crmem-${process.pid}-${Date.now()}`;

/* ------------------------------------------------------- process-tree RSS (Linux) */

function procCmdline(pid) {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").join(" ");
  } catch {
    return null;
  }
}

function procRssKb(pid) {
  try {
    const status = readFileSync(`/proc/${pid}/status`, "utf8");
    const line = status.split("\n").find((l) => l.startsWith("VmRSS:"));
    return line ? Number(line.replace(/\D+/g, "")) : 0;
  } catch {
    return 0;
  }
}

function allPids() {
  return readdirSync("/proc")
    .filter((n) => /^\d+$/.test(n))
    .map(Number);
}

/**
 * Every Chromium process belonging to THIS run, found by the tag we planted in the
 * browser process's argv and then by walking children. Renderer and GPU processes do
 * not carry the tag (they are forked with their own argv), so the tag alone would
 * report the one process that matters least.
 */
function browserTree() {
  const pids = allPids();
  const cmdlines = new Map();
  for (const pid of pids) {
    const cmd = procCmdline(pid);
    if (cmd !== null) cmdlines.set(pid, cmd);
  }
  const roots = [...cmdlines].filter(([, cmd]) => cmd.includes(TAG)).map(([pid]) => pid);
  if (roots.length === 0) return [];

  const parent = new Map();
  for (const pid of pids) {
    try {
      const status = readFileSync(`/proc/${pid}/status`, "utf8");
      const line = status.split("\n").find((l) => l.startsWith("PPid:"));
      if (line) parent.set(pid, Number(line.replace(/\D+/g, "")));
    } catch {
      /* the process exited between the listing and the read */
    }
  }
  const inTree = new Set(roots);
  // Repeat to a fixpoint: a renderer's parent may itself be a descendant we only
  // added on a later pass, and /proc gives no children index.
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
  return [...inTree].map((pid) => {
    const cmd = cmdlines.get(pid) ?? "";
    const type = /--type=([a-z-]+)/.exec(cmd)?.[1] ?? "browser";
    return { pid, type, rssKb: procRssKb(pid) };
  });
}

function rssSummary() {
  const tree = browserTree();
  const byType = {};
  let totalKb = 0;
  for (const p of tree) {
    byType[p.type] = (byType[p.type] ?? 0) + p.rssKb;
    totalKb += p.rssKb;
  }
  return {
    totalMb: +(totalKb / 1024).toFixed(1),
    processes: tree.length,
    byTypeMb: Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, +(v / 1024).toFixed(1)]),
    ),
  };
}

/* ------------------------------------------------------------- the page-side probe */

/**
 * Installed before any app code runs. Three's `WebGLRenderer` constructor dispatches an
 * `observe` event at whatever `__THREE_DEVTOOLS__` is, which is how a renderer can be
 * reached without the app exporting it.
 */
const PROBE = `
// The default resource-timing buffer is 250 entries, and a dev server blows through
// that on the title screen alone — so an unraised buffer reports the network as
// frozen for the rest of the session.
if (performance.setResourceTimingBufferSize) performance.setResourceTimingBufferSize(20000);
window.__probe = {
  rendererRefs: [],
  sceneRefs: new WeakMap(),
  renderersCreated: 0,
  renderTargets: [],
  renderedFrames: 0,
  drawCalls: 0,
  triangles: 0,
  rafIntervals: [],
  lastRaf: null,
  longTasks: [],
  interactions: [],
  reactCommits: [],
  audioRefs: [],
  audioCreated: 0,
  decodeCalls: 0,
  decodedBytes: 0,
  transferBytes: 0,
};
(() => {
  const tick = (now) => {
    const previous = window.__probe.lastRaf;
    if (previous !== null) window.__probe.rafIntervals.push(now - previous);
    window.__probe.lastRaf = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__probe.longTasks.push({
          start: entry.startTime,
          duration: entry.duration,
        });
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__probe.interactions.push({
          name: entry.name,
          duration: entry.duration,
          inputDelay: Math.max(0, entry.processingStart - entry.startTime),
          processing: Math.max(0, entry.processingEnd - entry.processingStart),
          interactionId: entry.interactionId || 0,
        });
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  } catch {}
  // A measurement hook, not DevTools: React calls this once per committed root. Keeping
  // it minimal avoids retaining fibers while still distinguishing a draw-loop problem
  // from React repeatedly rebuilding the surface.
  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    let rendererId = 0;
    const renderers = new Map();
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers,
      inject(renderer) {
        rendererId += 1;
        renderers.set(rendererId, renderer);
        return rendererId;
      },
      onCommitFiberRoot(_id, root) {
        const current = root && root.current;
        window.__probe.reactCommits.push({
          at: performance.now(),
          actualDuration:
            current && Number.isFinite(current.actualDuration) ? current.actualDuration : null,
        });
      },
      onCommitFiberUnmount() {},
      onScheduleFiberRoot() {},
    };
  }
})();
window.__THREE_DEVTOOLS__ = new EventTarget();
window.__THREE_DEVTOOLS__.addEventListener("observe", (event) => {
  const seen = event.detail;
  if (!seen || !seen.isWebGLRenderer) return;
  // WEAK, or the probe becomes the leak. A strong array of every renderer ever
  // constructed would keep each one — and its scene graph — alive for the whole
  // session, and the harness would then measure its own retention.
  window.__probe.renderersCreated += 1;
  window.__probe.rendererRefs.push(new WeakRef(seen));
  // THE SCENE IS NOT OTHERWISE REACHABLE, and it is the half that makes the geometry
  // count mean something: info.memory.geometries is everything the renderer still
  // holds, and the scene walk is everything still being drawn. The difference is the
  // set nothing will ever draw and nothing will ever free.
  const realRender = seen.render.bind(seen);
  seen.render = function (scene, camera) {
    if (scene && scene.isScene) window.__probe.sceneRefs.set(seen, new WeakRef(scene));
    const result = realRender(scene, camera);
    window.__probe.renderedFrames += 1;
    window.__probe.drawCalls += seen.info.render.calls || 0;
    window.__probe.triangles += seen.info.render.triangles || 0;
    return result;
  };
  const realSetRenderTarget = seen.setRenderTarget.bind(seen);
  seen.setRenderTarget = function (target, ...rest) {
    if (target && !window.__probe.renderTargets.some((ref) => ref.deref() === target)) {
      window.__probe.renderTargets.push(new WeakRef(target));
    }
    return realSetRenderTarget(target, ...rest);
  };
});
(() => {
  const RealAudio = window.Audio;
  if (typeof RealAudio === "function") {
    class ProbeAudio extends RealAudio {
      constructor(...args) {
        super(...args);
        window.__probe.audioCreated += 1;
        window.__probe.audioRefs.push(new WeakRef(this));
      }
    }
    window.Audio = ProbeAudio;
  }
  // Every route into Web Audio decoding, so "nothing decodes" is measured and not
  // inferred from a grep of our own source: a dependency could decode too.
  for (const Ctor of [window.AudioContext, window.OfflineAudioContext, window.webkitAudioContext]) {
    if (typeof Ctor !== "function" || !Ctor.prototype.decodeAudioData) continue;
    const real = Ctor.prototype.decodeAudioData;
    Ctor.prototype.decodeAudioData = function (buffer, ...rest) {
      window.__probe.decodeCalls += 1;
      window.__probe.decodedBytes += buffer && buffer.byteLength ? buffer.byteLength : 0;
      return real.call(this, buffer, ...rest);
    };
  }
})();
`;

/** Read every counter the page can answer for. Runs after a forced GC. */
const SAMPLE = `(() => {
  const probe = window.__probe;
  const percentile = (values, q) => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(2);
  };
  const live = probe.rendererRefs.map((ref) => ref.deref()).filter((r) => r && r.info);
  const info = live.map((r) => {
    let contextLost = null;
    try { contextLost = r.getContext().isContextLost(); } catch (e) { contextLost = "unreadable"; }
    return {
      // A renderer still reachable whose canvas has left the document is the
      // undisposed-scene shape: nothing will ever draw it and nothing frees it.
      attached: typeof document !== "undefined" && document.contains(r.domElement),
      contextLost,
      geometries: r.info.memory.geometries,
      textures: r.info.memory.textures,
      programs: r.info.programs ? r.info.programs.length : 0,
      calls: r.info.render.calls,
      triangles: r.info.render.triangles,
    };
  });
  const attached = info.filter((r) => r.attached);
  const orphaned = info.filter((r) => !r.attached);

  // What is still IN the scene, walked from the graph the renderer was last handed.
  let inSceneGeometries = 0;
  let inSceneMaterials = 0;
  let inSceneMeshes = 0;
  let inSceneGeometryBytes = 0;
  let inSceneTextureBytes = 0;
  const allTextures = new Set();
  for (const r of live) {
    if (!document.contains(r.domElement)) continue;
    const scene = (probe.sceneRefs.get(r) || {}).deref
      ? probe.sceneRefs.get(r).deref()
      : null;
    if (!scene) continue;
    const geos = new Set();
    const mats = new Set();
    scene.traverse((node) => {
      if (node.geometry) {
        geos.add(node.geometry);
        inSceneMeshes += 1;
      }
      const m = node.material;
      if (m) {
        for (const one of Array.isArray(m) ? m : [m]) {
          mats.add(one);
          for (const value of Object.values(one)) {
            if (value && value.isTexture) allTextures.add(value);
          }
        }
      }
    });
    for (const geometry of geos) {
      const arrays = new Set();
      for (const attribute of Object.values(geometry.attributes || {})) {
        if (attribute && attribute.array) arrays.add(attribute.array);
      }
      if (geometry.index && geometry.index.array) arrays.add(geometry.index.array);
      for (const array of arrays) inSceneGeometryBytes += array.byteLength || 0;
    }
    inSceneGeometries += geos.size;
    inSceneMaterials += mats.size;
  }
  for (const texture of allTextures) {
    const source = texture.source && texture.source.data ? texture.source.data : texture.image;
    const mipmaps = texture.mipmaps || (source && source.mipmaps) || [];
    if (mipmaps.length > 0) {
      for (const mip of mipmaps) {
        inSceneTextureBytes += (mip.width || 0) * (mip.height || 0) * 4;
      }
    } else if (source && source.width && source.height) {
      // RGBA8-equivalent resident footprint. Compressed GPU formats are reported as an
      // upper bound because WebGL does not expose driver allocation bytes.
      inSceneTextureBytes += source.width * source.height * 4 * 4 / 3;
    }
  }
  let renderTargetBytes = 0;
  let renderTargetCount = 0;
  for (const ref of probe.renderTargets) {
    const target = ref.deref();
    if (!target) continue;
    renderTargetCount += 1;
    const samples = Math.max(1, target.samples || 1);
    const colorAttachments = Array.isArray(target.textures) ? target.textures.length : 1;
    const color = target.width * target.height * 4 * samples * colorAttachments;
    const depth = target.depthBuffer === false ? 0 : target.width * target.height * 4 * samples;
    renderTargetBytes += color + depth;
  }
  const heldByAttached = attached.reduce((n, r) => n + r.geometries, 0);
  const audioLive = probe.audioRefs.filter((ref) => ref.deref() !== undefined).length;
  let bufferedSeconds = 0;
  for (const ref of probe.audioRefs) {
    const el = ref.deref();
    if (!el || !el.buffered) continue;
    for (let i = 0; i < el.buffered.length; i += 1) {
      bufferedSeconds += el.buffered.end(i) - el.buffered.start(i);
    }
  }
  const resources = performance.getEntriesByType("resource");
  let transferBytes = 0;
  const byKind = {};
  // Which models the session actually pulled. Named rather than counted, so the
  // geometry a session still holds can be checked against the primitives in exactly
  // those files (scripts/count-glb-primitives.mjs) instead of assumed to be the cache.
  // The PATH and not the basename: models/townhall/, models/roads/ and
  // models/gridwork-modern/ reuse basenames, so matching on one would over-count the
  // set and quietly inflate the very total this is here to bound.
  const glbFiles = [];
  for (const entry of resources) {
    const glb = /(\\/[^?]*\\.glb)(\\?|$)/.exec(entry.name);
    if (glb && !glbFiles.includes(glb[1])) glbFiles.push(glb[1]);
  }
  for (const entry of resources) {
    const size = entry.transferSize || entry.encodedBodySize || 0;
    transferBytes += size;
    const kind = /\\.glb(\\?|$)/.test(entry.name)
      ? "glb"
      : /\\.(ogg|mp3|wav)(\\?|$)/.test(entry.name)
        ? "audio"
        : /\\.(png|jpg|jpeg|webp|svg)(\\?|$)/.test(entry.name)
          ? "image"
          : /\\.(js|mjs|ts|tsx|jsx)(\\?|$)/.test(entry.name)
            ? "script"
            : "other";
    byKind[kind] = (byKind[kind] ?? 0) + size;
  }
  const sum = (rows) =>
    rows.reduce(
      (acc, r) => ({
        geometries: acc.geometries + r.geometries,
        textures: acc.textures + r.textures,
        programs: acc.programs + r.programs,
      }),
      { geometries: 0, textures: 0, programs: 0 },
    );
  const raf = probe.rafIntervals.filter((value) => value > 0 && value < 1000);
  const longTasks = probe.longTasks;
  const interactions = probe.interactions;
  const reactDurations = probe.reactCommits
    .map((commit) => commit.actualDuration)
    .filter((duration) => Number.isFinite(duration));
  const timing = {
    rafSamples: raf.length,
    rafP50Ms: percentile(raf, 0.5),
    rafP95Ms: percentile(raf, 0.95),
    rafP99Ms: percentile(raf, 0.99),
    droppedFrames: raf.filter((value) => value > 25).length,
    longestFrameMs: raf.length === 0 ? null : +Math.max(...raf).toFixed(2),
    longTasks: longTasks.length,
    longTaskTotalMs: +longTasks.reduce((sum, task) => sum + task.duration, 0).toFixed(2),
    longestTaskMs:
      longTasks.length === 0 ? null : +Math.max(...longTasks.map((task) => task.duration)).toFixed(2),
    interactions: interactions.length,
    interactionP95Ms: percentile(interactions.map((entry) => entry.duration), 0.95),
    inputDelayP95Ms: percentile(interactions.map((entry) => entry.inputDelay), 0.95),
    reactCommits: probe.reactCommits.length,
    reactCommitP95Ms: percentile(reactDurations, 0.95),
    renderedFrames: probe.renderedFrames,
    drawCalls: probe.drawCalls,
    triangles: probe.triangles,
  };
  probe.rafIntervals = [];
  probe.longTasks = [];
  probe.interactions = [];
  probe.reactCommits = [];
  probe.renderedFrames = 0;
  probe.drawCalls = 0;
  probe.triangles = 0;
  return {
    renderersCreated: probe.renderersCreated,
    renderersReachable: info.length,
    renderersAttached: attached.length,
    renderersOrphaned: orphaned.length,
    renderers: info,
    inSceneGeometries,
    inSceneMaterials,
    inSceneMeshes,
    inSceneGeometryBytes,
    inSceneTextureBytes,
    renderTargetBytes,
    renderTargetCount,
    /** Held by a live renderer and in no scene: undisposed, undrawable, unfreeable. */
    orphanedGeometries: heldByAttached - inSceneGeometries,
    attachedTotals: sum(attached),
    orphanedTotals: sum(orphaned),
    rendererTotals: sum(info),
    canvases: document.querySelectorAll("canvas").length,
    audioCreated: probe.audioCreated,
    audioLive,
    audioBufferedSeconds: +bufferedSeconds.toFixed(1),
    decodeAudioDataCalls: probe.decodeCalls,
    decodeAudioDataBytes: probe.decodedBytes,
    requests: resources.length,
    glbFiles,
    transferBytes,
    transferByKind: byKind,
    jsHeapUsed: performance.memory ? performance.memory.usedJSHeapSize : null,
    jsHeapTotal: performance.memory ? performance.memory.totalJSHeapSize : null,
    timing,
  };
})()`;

/* --------------------------------------------------------------- heap snapshot rank */

/**
 * Rank the JS heap by constructor. V8's snapshot gives every node a `self_size`, so
 * summing by name says which kind of object the heap is actually made of. Retained
 * size would be nicer and is quadratic to compute; self size is enough to rank, and
 * the typed-array and ArrayBuffer rows carry the geometry and audio payloads.
 */
function rankSnapshot(snapshot) {
  const { meta } = snapshot.snapshot;
  const fields = meta.node_fields;
  const nameAt = fields.indexOf("name");
  const typeAt = fields.indexOf("type");
  const sizeAt = fields.indexOf("self_size");
  const stride = fields.length;
  const types = meta.node_types[typeAt];
  const nodes = snapshot.nodes;
  const strings = snapshot.strings;

  const bySize = new Map();
  let total = 0;
  for (let at = 0; at < nodes.length; at += stride) {
    const size = nodes[at + sizeAt];
    total += size;
    const type = types[nodes[at + typeAt]];
    const name = strings[nodes[at + nameAt]];
    const key = type === "object" || type === "closure" ? name : `(${type})`;
    const row = bySize.get(key) ?? { bytes: 0, count: 0 };
    row.bytes += size;
    row.count += 1;
    bySize.set(key, row);
  }
  const ranked = [...bySize]
    .map(([name, row]) => ({
      name,
      mb: +(row.bytes / 1048576).toFixed(2),
      count: row.count,
    }))
    .sort((a, b) => b.mb - a.mb)
    .slice(0, 30);
  return { totalMb: +(total / 1048576).toFixed(1), ranked };
}

async function takeSnapshot(cdp) {
  const chunks = [];
  const onChunk = ({ chunk }) => chunks.push(chunk);
  cdp.on("HeapProfiler.addHeapSnapshotChunk", onChunk);
  await cdp.send("HeapProfiler.takeHeapSnapshot", {
    reportProgress: false,
    treatGlobalObjectsAsRoots: true,
  });
  cdp.off("HeapProfiler.addHeapSnapshotChunk", onChunk);
  return JSON.parse(chunks.join(""));
}

/* ------------------------------------------------------------------------ the run */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: [
      `--enable-precise-memory-info`,
      `--js-flags=--expose-gc`,
      // Software GL, so a headless box renders the scene for real rather than
      // failing the context and measuring an empty canvas.
      `--use-gl=swiftshader`,
      `--enable-unsafe-swiftshader`,
      // Inert to Chromium; this run's process tree is found by it.
      `--crmem-tag=${TAG}`,
    ],
  });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });
  await context.addInitScript(PROBE);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.enable");
  if (CPU_RATE > 1) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });
  }

  const checkpoints = [];
  const compileEvents = [];
  let compileTrace = null;
  if (TRACE_COMPILE) {
    cdp.on("Tracing.dataCollected", ({ value }) => compileEvents.push(...value));
  }
  async function checkpoint(name) {
    // Collect first, then settle, then collect again: one pass leaves the objects a
    // finaliser or a pending microtask is still holding.
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(SETTLE_MS);
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(400);
    const metrics = await cdp.send("Performance.getMetrics");
    const asMap = Object.fromEntries(metrics.metrics.map((m) => [m.name, m.value]));
    const pageSample = await page.evaluate(SAMPLE);
    const row = {
      checkpoint: name,
      rss: rssSummary(),
      jsHeapMb: +(asMap.JSHeapUsedSize / 1048576).toFixed(1),
      jsHeapTotalMb: +(asMap.JSHeapTotalSize / 1048576).toFixed(1),
      domNodes: asMap.Nodes,
      documents: asMap.Documents,
      listeners: asMap.JSEventListeners,
      scriptDurationMs: +(asMap.ScriptDuration * 1000).toFixed(1),
      taskDurationMs: +(asMap.TaskDuration * 1000).toFixed(1),
      layoutDurationMs: +(asMap.LayoutDuration * 1000).toFixed(1),
      recalcStyleDurationMs: +(asMap.RecalcStyleDuration * 1000).toFixed(1),
      ...pageSample,
      transferMb: +(pageSample.transferBytes / 1048576).toFixed(1),
    };
    delete row.transferBytes;
    row.transferByKindMb = Object.fromEntries(
      Object.entries(pageSample.transferByKind).map(([k, v]) => [
        k,
        +(v / 1048576).toFixed(2),
      ]),
    );
    delete row.transferByKind;
    checkpoints.push(row);
    const t = row.rendererTotals;
    console.log(
      `${name.padEnd(22)} rss=${String(row.rss.totalMb).padStart(7)}MB  ` +
        `heap=${String(row.jsHeapMb).padStart(6)}MB  ` +
        `rend=${row.renderersAttached}+${row.renderersOrphaned}/${row.renderersCreated}  ` +
        `geo=${String(t.geometries).padStart(5)}  inScene=${String(row.inSceneGeometries).padStart(5)}  ` +
        `orphanGeo=${String(row.orphanedGeometries).padStart(5)}  ` +
        `tex=${String(t.textures).padStart(4)}  prog=${String(t.programs).padStart(3)}  ` +
        `raf95=${String(row.timing.rafP95Ms).padStart(6)}ms  drops=${row.timing.droppedFrames}  ` +
        `draw=${row.timing.drawCalls}  long=${row.timing.longTasks}  ` +
        `audio=${row.audioLive}/${row.audioCreated}  decode=${row.decodeAudioDataCalls}  ` +
        `net=${row.transferMb}MB  dom=${row.domNodes}`,
    );
    return row;
  }

  /**
   * Click by DOM, not by pointer. The city keeps a full-bleed overlay over the island,
   * so a pointer click at a HUD button's centre lands on the overlay and does nothing
   * at all — silently, which is how a whole era walk can report "no control on screen".
   */
  async function domClick(match) {
    return page.evaluate(({ label, testid, text }) => {
      const all = [...document.querySelectorAll("button, a")];
      const found = all.find(
        (el) =>
          (label !== undefined && el.getAttribute("aria-label") === label) ||
          (testid !== undefined && el.getAttribute("data-testid") === testid) ||
          (text !== undefined && el.textContent?.trim() === text),
      );
      if (!found) return false;
      found.click();
      return true;
    }, match);
  }

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  console.log(`\n### ${LABEL} — ${URL_BASE}\n`);

  // THE FLOOR, and every later number is only meaningful against it. A headless
  // Chromium with a software GL stack costs several hundred megabytes before a single
  // byte of the app is parsed, so an unsubtracted RSS reads as an app problem when
  // most of it is the harness.
  await page.goto("about:blank", { waitUntil: "load" });
  await checkpoint("00-blank-floor");

  if (TRACE_COMPILE) {
    await cdp.send("Tracing.start", {
      categories: "v8,devtools.timeline,disabled-by-default-v8.compile",
      options: "sampling-frequency=10000",
      transferMode: "ReportEvents",
    });
  }
  await page.goto(`${URL_BASE}/?${APP_QUERY}`, { waitUntil: "load" });
  await checkpoint("01-title");

  // A real gesture, because the audio gate opens on one and nothing fetches a track
  // until it does. A pointer click here (the title screen has no overlay) so the
  // gesture is one the autoplay policy accepts.
  const start = page.getByRole("button", { name: "Start", exact: true });
  if (await start.count()) {
    await start.first().click();
  }
  await page.waitForSelector("canvas", { timeout: 60_000 }).catch(() => {});
  await checkpoint("02-city-loaded");
  if (TRACE_COMPILE) {
    const complete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
    await cdp.send("Tracing.end");
    await complete;
    const timed = compileEvents.filter(
      (event) =>
        Number.isFinite(event.dur) &&
        typeof event.name === "string" &&
        /(parse|compile)/i.test(event.name),
    );
    const duration = (pattern) =>
      +(
        timed
          .filter((event) => pattern.test(event.name))
          .reduce((sum, event) => sum + event.dur, 0) / 1000
      ).toFixed(2);
    compileTrace = {
      events: timed.length,
      parseMs: duration(/parse/i),
      compileMs: duration(/compile/i),
      longest: timed
        .map((event) => ({ name: event.name, ms: +(event.dur / 1000).toFixed(2) }))
        .sort((left, right) => right.ms - left.ms)
        .slice(0, 20),
    };
  }

  // Let the island settle: models stream in behind Suspense, so an immediate sample
  // measures a city that is still arriving.
  await page.waitForTimeout(5_000);
  await checkpoint("03-city-settled");

  // CAMERA INPUT. Toolbar and keyboard both reach `applyCameraAction`; drive one of
  // each so interaction latency and render cost are sampled under an actual camera move.
  if (await domClick({ label: "Zoom in" })) {
    await page.waitForTimeout(700);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(700);
    await checkpoint("03a-camera-input");
  }

  // PLACEMENT. On a fresh session choose the first ready, unbuilt card; on a fully-built
  // `?mock` city the menu itself is still sampled and the script records that no ghost
  // was available rather than manufacturing one.
  if ((await domClick({ text: "Build" })) || (await domClick({ text: "All built" }))) {
    await page.waitForTimeout(700);
    const beganPlacement = await page.evaluate(() => {
      const card = document.querySelector(
        ".build-card:not([data-built='true']):not([data-locked='true']) .build-card-cta",
      );
      card?.click();
      return card !== null;
    });
    await page.waitForTimeout(700);
    await checkpoint(beganPlacement ? "03b-placement-active" : "03b-build-menu");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // BAY PAN OUT / SELECT / PAN IN. This remains absent in production by design, where
  // `import.meta.env.DEV` compiles the `?bay` feature away.
  if (APP_QUERY.split("&").includes("bay") && (await openMenu())) {
    if (await domClick({ testid: "menu-bay" })) {
      await page
        .waitForSelector('[data-testid="archipelago-camera"]', { timeout: 30_000 })
        .catch(() => {});
      await page.waitForTimeout(700);
      await checkpoint("03c-bay-overview");
      await domClick({ testid: "archipelago-island-neolithic" });
      await page.waitForTimeout(700);
      await checkpoint("03d-bay-selected");
      await page.evaluate(() => {
        document.querySelector(".island-card button[aria-label='Close']")?.click();
      });
      await page.waitForTimeout(700);
      await domClick({ testid: "archipelago-island-prehistoric" });
      await page.waitForTimeout(800);
      await checkpoint("03e-bay-landed");
    }
  }

  // The era control lives in the ☰ Menu, which is the only in-session route between
  // eras: the title screen's demo panel is a set of links, and following one is a
  // navigation, which resets exactly the retention this is measuring.
  async function openMenu() {
    const advance = page.locator('[data-testid="dev-era-skip-advance"]');
    if (await advance.count()) return true;
    if (!(await domClick({ label: "Menu" }))) return false;
    await page.waitForTimeout(600);
    return (await advance.count()) > 0;
  }

  for (let era = 1; era <= ERA_STEPS; era += 1) {
    const advance = page.locator('[data-testid="dev-era-skip-advance"]');
    if (!(await openMenu())) {
      console.log(`  (no dev era control on screen; stopping era walk at ${era - 1})`);
      break;
    }
    if ((await advance.first().getAttribute("aria-disabled")) === "true") {
      console.log(`  (era sequence exhausted at step ${era})`);
      break;
    }
    await domClick({ testid: "dev-era-skip-advance" });
    await page.waitForTimeout(3_000);
    await checkpoint(`04-era-advance-${String(era).padStart(2, "0")}`);
  }

  // THE ROUND TRIP, and it is the whole reproduction. Advancing adds eras' worth of
  // buildings, so a rising geometry count on the way out is ambiguous — more content
  // legitimately costs more geometry. Coming BACK to era one restores exactly the
  // city that was measured at `03-city-settled`, so any geometry still resident above
  // that number is retention and nothing else.
  if (await openMenu()) {
    await domClick({ testid: "dev-era-skip-reset" });
    await page.waitForTimeout(4_000);
    await checkpoint("05-back-to-era-one");
  }

  // A crisis, which is the other mount the complaint names: a whole second scene over
  // the island, entered and left.
  if (await openMenu()) {
    if (await domClick({ text: "❄ Hard Winter" })) {
      await page.waitForTimeout(4_000);
      await checkpoint("06-crisis-open");
    }
  }

  // DIAGNOSTIC. A fresh title entry is intentional: the diagnostic is a takeover of a
  // newly entered city, not a panel reachable from an already-running crisis.
  await page.goto(`${URL_BASE}/?reset`, { waitUntil: "load" });
  if (await domClick({ text: "Take the diagnostic" })) {
    await page.waitForTimeout(4_000);
    await checkpoint("07-diagnostic-open");
    if (!(await domClick({ text: "Back to city" }))) {
      throw new Error("the diagnostic opened but exposed no Back to city exit");
    }
    await page.waitForTimeout(1_500);
    await checkpoint("08-diagnostic-exit");
  }

  let snapshot = null;
  if (WANT_SNAPSHOT) {
    console.log("\ntaking heap snapshot…");
    await cdp.send("HeapProfiler.collectGarbage");
    const raw = await takeSnapshot(cdp);
    snapshot = rankSnapshot(raw);
    console.log(`heap snapshot total: ${snapshot.totalMb}MB`);
    for (const row of snapshot.ranked.slice(0, 15)) {
      console.log(
        `  ${String(row.mb).padStart(8)}MB  ${String(row.count).padStart(8)}  ${row.name}`,
      );
    }
  }

  const report = {
    label: LABEL,
    url: URL_BASE,
    takenAt: new Date().toISOString(),
    settleMs: SETTLE_MS,
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    cpuThrottlingRate: CPU_RATE,
    appQuery: APP_QUERY,
    compileTrace,
    checkpoints,
    snapshot,
    pageErrors: errors.slice(0, 20),
  };
  const path = join(OUT_DIR, `${LABEL}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\nwrote ${path}`);
  if (errors.length > 0) {
    console.log(`page errors (${errors.length}): ${errors.slice(0, 3).join(" | ")}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
