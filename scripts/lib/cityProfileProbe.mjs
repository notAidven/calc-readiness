/**
 * The page-side probe for `profile-city-frames.mjs`, kept in its own file because it is
 * injected as source text and a template literal full of backticks is a trap.
 *
 * WHY IT HOOKS WEBGL AND NOT THREE. `renderer.info` counts geometries and textures, and a
 * count is not a byte: a 12-vertex marker and a 40k-vertex island are both "1". The
 * question asked was how many bytes the driver is holding, and the only place that is
 * exactly knowable is the API that allocated them. So `bufferData`, `texImage2D`,
 * `texStorage2D`, `compressedTexImage2D` and `renderbufferStorage` are wrapped to record
 * what they uploaded, and `deleteBuffer`/`deleteTexture`/`deleteRenderbuffer` to give it
 * back. Attribution needs the binding state, so `bindBuffer`, `bindTexture` and
 * `activeTexture` are tracked too — `bufferData` names a TARGET, not a buffer.
 *
 * The draw counters are on the same hook for the same reason: "does this scene redraw
 * while nobody is touching it" is answerable by counting `drawElements` against wall
 * time, and that needs no cooperation from the app at all.
 *
 * Everything here is additive and reversible: every wrapper calls through, nothing changes
 * an argument, and the app cannot tell it is being watched apart from the cost of the
 * indirection.
 */

export const CITY_PROFILE_PROBE = `
(() => {
  if (window.__cityProbe) return;

  const probe = {
    /* ---- GPU allocation, in bytes, from the API that allocated it ---- */
    gpu: {
      bufferBytes: 0,
      bufferCount: 0,
      bufferBytesFreed: 0,
      textureBytes: 0,
      textureCount: 0,
      textureBytesFreed: 0,
      renderbufferBytes: 0,
      renderbufferCount: 0,
      programsLinked: 0,
      shaderCompileMs: 0,
      programLinkMs: 0,
      /* Uploads that could not be sized. Reported so a total is never quietly short. */
      unsizedUploads: 0,
    },
    /* ---- per-frame draw work, cumulative ---- */
    draw: { calls: 0, elements: 0, arrays: 0, instanced: 0, onscreen: 0, offscreen: 0 },
    /* ---- WebGLRenderer.render() invocations, cumulative ---- */
    renderCalls: 0,
    /* ---- subtrees an ablation has hidden, restored by "baseline" ---- */
    hidden: [],
    /* ---- frame cadence, recorded only inside a named window ---- */
    window: null,
    windows: [],
    /* ---- long tasks ---- */
    longTasks: [],
    /* ---- React commits, by root ---- */
    reactCommits: 0,
    /* ---- audio, kept from the earlier harness so the zero stays checked ---- */
    audioRefs: [],
    audioCreated: 0,
    decodeCalls: 0,
    /* ---- three renderers, weakly ---- */
    rendererRefs: [],
    renderersCreated: 0,
    sceneRefs: new WeakMap(),
  };
  window.__cityProbe = probe;

  if (performance.setResourceTimingBufferSize) performance.setResourceTimingBufferSize(20000);

  /* ------------------------------------------------------------ WebGL byte counting */

  const BYTES_PER_TYPE = {
    5121: 1, // UNSIGNED_BYTE
    5123: 2, // UNSIGNED_SHORT
    5125: 4, // UNSIGNED_INT
    5126: 4, // FLOAT
    32819: 2, // UNSIGNED_SHORT_4_4_4_4
    32820: 2, // UNSIGNED_SHORT_5_5_5_1
    33635: 2, // UNSIGNED_SHORT_5_6_5
    5131: 2, // HALF_FLOAT
    36193: 2, // HALF_FLOAT_OES
    34042: 4, // UNSIGNED_INT_24_8
  };
  const CHANNELS_PER_FORMAT = {
    6406: 1, // ALPHA
    6409: 1, // LUMINANCE
    6410: 2, // LUMINANCE_ALPHA
    6407: 3, // RGB
    6408: 4, // RGBA
    6402: 1, // DEPTH_COMPONENT
    34041: 2, // DEPTH_STENCIL
    33319: 2, // RG
    33326: 1, // R32F
    33328: 2, // RG32F
  };

  function texelBytes(format, type) {
    const channels = CHANNELS_PER_FORMAT[format];
    const per = BYTES_PER_TYPE[type];
    if (channels === undefined || per === undefined) return null;
    return channels * per;
  }

  function instrument(proto, label) {
    if (!proto || proto.__cityProbeWrapped) return;
    proto.__cityProbeWrapped = true;
    const g = probe.gpu;

    /* Binding state, so an upload naming a target can be charged to an object. */
    const boundBuffer = new Map();
    const boundTexture = new Map();
    let activeUnit = 0;
    const bufferBytes = new WeakMap();
    const textureBytes = new WeakMap();
    const renderbufferBytes = new WeakMap();

    const realBindBuffer = proto.bindBuffer;
    proto.bindBuffer = function (target, buffer) {
      boundBuffer.set(target, buffer);
      return realBindBuffer.call(this, target, buffer);
    };
    const realActiveTexture = proto.activeTexture;
    proto.activeTexture = function (unit) {
      activeUnit = unit;
      return realActiveTexture.call(this, unit);
    };
    const realBindTexture = proto.bindTexture;
    proto.bindTexture = function (target, texture) {
      boundTexture.set(target + ":" + activeUnit, texture);
      return realBindTexture.call(this, target, texture);
    };

    function chargeBuffer(target, bytes) {
      const buffer = boundBuffer.get(target);
      if (!buffer) { g.unsizedUploads += 1; return; }
      const had = bufferBytes.get(buffer) ?? 0;
      if (had === 0) g.bufferCount += 1;
      // A re-upload REPLACES the allocation rather than adding to it.
      g.bufferBytes += bytes - had;
      bufferBytes.set(buffer, bytes);
    }

    const realBufferData = proto.bufferData;
    proto.bufferData = function (target, data, usage, offset, length) {
      const bytes =
        typeof data === "number"
          ? data
          : data && typeof data.byteLength === "number"
            ? data.byteLength
            : null;
      if (bytes === null) g.unsizedUploads += 1;
      else chargeBuffer(target, bytes);
      return realBufferData.call(this, target, data, usage, offset, length);
    };

    const realDeleteBuffer = proto.deleteBuffer;
    proto.deleteBuffer = function (buffer) {
      const had = bufferBytes.get(buffer) ?? 0;
      if (had > 0) {
        g.bufferBytes -= had;
        g.bufferBytesFreed += had;
        g.bufferCount -= 1;
        bufferBytes.delete(buffer);
      }
      return realDeleteBuffer.call(this, buffer);
    };

    /**
     * Charge a texture, PER (face, level), so a re-upload of the same level replaces its
     * old allocation instead of adding a second one.
     *
     * This matters and was wrong first time round: three reallocates a shadow map when
     * the light's frustum is resized, and a plain accumulator counted the 16MB map twice
     * and reported 34MB where the driver holds 17MB. Cube faces and mip levels genuinely
     * DO add, which is why the key is the slot rather than the object.
     */
    function chargeTexture(target, level, bytes) {
      const face = target >= 34069 && target <= 34074 ? target : target;
      const cubeRoot = target >= 34069 && target <= 34074 ? 34067 : target;
      const texture =
        boundTexture.get(cubeRoot + ":" + activeUnit) ??
        boundTexture.get(target + ":" + activeUnit);
      if (!texture) { g.unsizedUploads += 1; return; }
      let slots = textureBytes.get(texture);
      if (slots === undefined) {
        slots = new Map();
        textureBytes.set(texture, slots);
        g.textureCount += 1;
      }
      const key = face + ":" + level;
      const had = slots.get(key) ?? 0;
      g.textureBytes += bytes - had;
      slots.set(key, bytes);
    }

    const totalOf = (slots) => {
      let sum = 0;
      if (slots) for (const value of slots.values()) sum += value;
      return sum;
    };

    const realTexImage2D = proto.texImage2D;
    proto.texImage2D = function (...args) {
      // Two overloads: (target, level, internalformat, width, height, border, format,
      // type, pixels) and (target, level, internalformat, format, type, source).
      let width = null;
      let height = null;
      let format;
      let type;
      if (args.length >= 8) {
        width = args[3]; height = args[4]; format = args[6]; type = args[7];
      } else {
        format = args[3]; type = args[4];
        const source = args[5];
        if (source) {
          width = source.width ?? source.videoWidth ?? null;
          height = source.height ?? source.videoHeight ?? null;
        }
      }
      const per = texelBytes(format, type);
      if (width && height && per) chargeTexture(args[0], args[1], width * height * per);
      else g.unsizedUploads += 1;
      return realTexImage2D.apply(this, args);
    };

    if (proto.texStorage2D) {
      const realTexStorage2D = proto.texStorage2D;
      proto.texStorage2D = function (target, levels, internalformat, width, height) {
        // Sized internal formats are not in the small table above, so this assumes 4
        // bytes per texel -- the common RGBA8 case -- and the whole mip chain.
        const base = width * height * 4;
        const chain = levels > 1 ? base * (4 / 3) : base;
        chargeTexture(target, 0, chain);
        return realTexStorage2D.call(this, target, levels, internalformat, width, height);
      };
    }

    if (proto.compressedTexImage2D) {
      const realCompressed = proto.compressedTexImage2D;
      proto.compressedTexImage2D = function (...args) {
        const data = args[6];
        if (data && typeof data.byteLength === "number")
          chargeTexture(args[0], args[1], data.byteLength);
        else g.unsizedUploads += 1;
        return realCompressed.apply(this, args);
      };
    }

    const realGenerateMipmap = proto.generateMipmap;
    proto.generateMipmap = function (target) {
      // A generated chain is a third again on top of level zero.
      const texture = boundTexture.get(target + ":" + activeUnit);
      if (texture) {
        const slots = textureBytes.get(texture);
        const had = totalOf(slots);
        // The generated chain is a third again on level zero, charged to a slot of its
        // own so a second generateMipmap does not charge for it twice.
        if (slots && had > 0) {
          const extra = had / 3;
          const already = slots.get("mipchain") ?? 0;
          g.textureBytes += extra - already;
          slots.set("mipchain", extra);
        }
      }
      return realGenerateMipmap.call(this, target);
    };

    const realDeleteTexture = proto.deleteTexture;
    proto.deleteTexture = function (texture) {
      const had = totalOf(textureBytes.get(texture));
      if (had > 0) {
        g.textureBytes -= had;
        g.textureBytesFreed += had;
        g.textureCount -= 1;
        textureBytes.delete(texture);
      }
      return realDeleteTexture.call(this, texture);
    };

    const chargeRenderbuffer = (bytes, rb) => {
      g.renderbufferBytes += bytes;
      g.renderbufferCount += 1;
      if (rb) renderbufferBytes.set(rb, bytes);
    };
    const realRenderbufferStorage = proto.renderbufferStorage;
    proto.renderbufferStorage = function (target, internalformat, width, height) {
      chargeRenderbuffer(width * height * 4, null);
      return realRenderbufferStorage.call(this, target, internalformat, width, height);
    };
    if (proto.renderbufferStorageMultisample) {
      const realMultisample = proto.renderbufferStorageMultisample;
      proto.renderbufferStorageMultisample = function (target, samples, fmt, width, height) {
        chargeRenderbuffer(width * height * 4 * Math.max(1, samples), null);
        return realMultisample.call(this, target, samples, fmt, width, height);
      };
    }

    /* ---- draw calls, split by the pass that issued them ----
       A shadow pass renders into a framebuffer object; the picture the player sees goes
       to the default framebuffer (null). bindFramebuffer says which is current, so the
       split needs no cooperation from three and answers "did the shadow map redraw this
       frame" directly instead of by subtracting two totals. */
    let boundFbo = null;
    const realBindFramebuffer = proto.bindFramebuffer;
    proto.bindFramebuffer = function (target, fbo) {
      boundFbo = fbo;
      return realBindFramebuffer.call(this, target, fbo);
    };
    const countDraw = () => {
      probe.draw.calls += 1;
      const offscreen = boundFbo !== null;
      if (offscreen) probe.draw.offscreen += 1;
      else probe.draw.onscreen += 1;
      if (probe.window) {
        probe.window.drawCalls += 1;
        if (offscreen) probe.window.offscreenDraws += 1;
        else probe.window.onscreenDraws += 1;
      }
    };
    const realDrawElements = proto.drawElements;
    proto.drawElements = function (mode, count, type, offset) {
      countDraw();
      probe.draw.elements += 1;
      return realDrawElements.call(this, mode, count, type, offset);
    };
    const realDrawArrays = proto.drawArrays;
    proto.drawArrays = function (mode, first, count) {
      countDraw();
      probe.draw.arrays += 1;
      return realDrawArrays.call(this, mode, first, count);
    };
    if (proto.drawElementsInstanced) {
      const realInstanced = proto.drawElementsInstanced;
      proto.drawElementsInstanced = function (mode, count, type, offset, primcount) {
        countDraw();
        probe.draw.instanced += 1;
        return realInstanced.call(this, mode, count, type, offset, primcount);
      };
    }
    if (proto.drawArraysInstanced) {
      const realArraysInstanced = proto.drawArraysInstanced;
      proto.drawArraysInstanced = function (mode, first, count, primcount) {
        countDraw();
        probe.draw.instanced += 1;
        return realArraysInstanced.call(this, mode, first, count, primcount);
      };
    }

    /* ---- shader cost, which is the other thing a first frame pays for ---- */
    const realCompileShader = proto.compileShader;
    proto.compileShader = function (shader) {
      const t0 = performance.now();
      const out = realCompileShader.call(this, shader);
      g.shaderCompileMs += performance.now() - t0;
      return out;
    };
    const realLinkProgram = proto.linkProgram;
    proto.linkProgram = function (program) {
      const t0 = performance.now();
      const out = realLinkProgram.call(this, program);
      g.programLinkMs += performance.now() - t0;
      g.programsLinked += 1;
      return out;
    };
    probe.gpu[label + "Instrumented"] = true;
  }

  instrument(window.WebGLRenderingContext && WebGLRenderingContext.prototype, "webgl1");
  instrument(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, "webgl2");

  /* ---------------------------------------------------- React commits, without a fork */

  // React calls into this hook on every committed root when it exists, so installing a
  // minimal one BEFORE React loads counts commits with no change to any app source.
  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map(),
      supportsFiber: true,
      inject: () => 1,
      onScheduleFiberRoot: () => {},
      onCommitFiberRoot: () => {
        probe.reactCommits += 1;
        if (probe.window) probe.window.reactCommits += 1;
      },
      onCommitFiberUnmount: () => {},
      onPostCommitFiberRoot: () => {},
      checkDCE: () => {},
    };
  }

  /* -------------------------------------------------------------- three, weakly held */

  window.__THREE_DEVTOOLS__ = new EventTarget();
  window.__THREE_DEVTOOLS__.addEventListener("observe", (event) => {
    const seen = event.detail;
    if (!seen || !seen.isWebGLRenderer) return;
    probe.renderersCreated += 1;
    probe.rendererRefs.push(new WeakRef(seen));
    const realRender = seen.render.bind(seen);
    seen.render = function (scene, camera) {
      if (scene && scene.isScene) probe.sceneRefs.set(seen, new WeakRef(scene));
      // HOW MANY TIMES THE SCENE IS SUBMITTED PER FRAME, which is the question
      // renderer.info cannot answer: info.reset() runs at the top of every render(), so
      // a second submission in the same frame overwrites the first one's counts and the
      // reported figure is the LAST pass rather than the frame's total.
      probe.renderCalls += 1;
      if (probe.window) probe.window.renderCalls += 1;
      return realRender(scene, camera);
    };
  });

  /* ------------------------------------------------------------------------- audio */

  const RealAudio = window.Audio;
  if (typeof RealAudio === "function") {
    class ProbeAudio extends RealAudio {
      constructor(...args) {
        super(...args);
        probe.audioCreated += 1;
        probe.audioRefs.push(new WeakRef(this));
      }
    }
    window.Audio = ProbeAudio;
  }
  for (const Ctor of [window.AudioContext, window.OfflineAudioContext, window.webkitAudioContext]) {
    if (typeof Ctor !== "function" || !Ctor.prototype.decodeAudioData) continue;
    const real = Ctor.prototype.decodeAudioData;
    Ctor.prototype.decodeAudioData = function (buffer, ...rest) {
      probe.decodeCalls += 1;
      return real.call(this, buffer, ...rest);
    };
  }

  /* ------------------------------------------------- long tasks, paint and frame windows */

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        probe.longTasks.push({ start: entry.startTime, duration: entry.duration });
        if (probe.window && entry.duration > 50) probe.window.longTasks.push(entry.duration);
      }
    }).observe({ entryTypes: ["longtask"] });
  } catch (e) { /* not every build ships the observer */ }

  probe.paint = {};
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") probe.paint.fcp = entry.startTime;
      }
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) probe.paint.lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) { /* same */ }

  /**
   * A frame window. Timestamps come from the rAF callback argument rather than
   * performance.now(), so what is measured is the interval the compositor actually
   * delivered rather than when this callback happened to be scheduled inside it.
   */
  probe.beginWindow = (label) => {
    probe.window = {
      label,
      startedAt: performance.now(),
      frames: [],
      drawCalls: 0,
      onscreenDraws: 0,
      offscreenDraws: 0,
      renderCalls: 0,
      reactCommits: 0,
      longTasks: [],
      last: null,
    };
    const tick = (now) => {
      const w = probe.window;
      if (!w || w.label !== label) return;
      if (w.last !== null) w.frames.push(now - w.last);
      w.last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  probe.endWindow = () => {
    const w = probe.window;
    probe.window = null;
    if (!w) return null;
    const elapsedMs = performance.now() - w.startedAt;
    const sorted = [...w.frames].sort((a, b) => a - b);
    const at = (q) => (sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]);
    // A frame is "dropped" when its interval exceeds one and a half display intervals,
    // taking the display interval as this window's own median rather than assuming 60Hz.
    const median = at(0.5);
    const budget = median > 0 ? median * 1.5 : 25;
    const dropped = sorted.filter((d) => d > budget).length;
    const row = {
      label: w.label,
      elapsedMs: Math.round(elapsedMs),
      frames: sorted.length,
      fps: sorted.length === 0 ? 0 : +(sorted.length / (elapsedMs / 1000)).toFixed(1),
      p50: +at(0.5).toFixed(2),
      p95: +at(0.95).toFixed(2),
      p99: +at(0.99).toFixed(2),
      longestFrameMs: +(sorted[sorted.length - 1] ?? 0).toFixed(2),
      droppedPct: sorted.length === 0 ? 0 : +((dropped / sorted.length) * 100).toFixed(1),
      drawCalls: w.drawCalls,
      drawCallsPerFrame: sorted.length === 0 ? 0 : +(w.drawCalls / sorted.length).toFixed(1),
      drawCallsPerSecond: +(w.drawCalls / (elapsedMs / 1000)).toFixed(0),
      /*
       * SUBMISSIONS PER SECOND, deliberately not per "frame".
       *
       * The rAF callback in this file is NOT the render rate and must not be used as a
       * denominator: measured on the idle city, r3f submitted the scene 27.2 times a
       * second while this recorder's own rAF was called 4.4 times a second, so a
       * renders-per-frame ratio read 6.2 and meant nothing. Wall time is the only
       * denominator both sides agree on.
       */
      renderCalls: w.renderCalls,
      rendersPerSecond: +(w.renderCalls / (elapsedMs / 1000)).toFixed(1),
      drawCallsPerRender: w.renderCalls === 0 ? 0 : +(w.drawCalls / w.renderCalls).toFixed(1),
      /* The shadow pass, isolated: offscreen draws are the depth target, onscreen are the
         picture. A frozen shadow map shows onscreen holding steady while offscreen falls
         to near zero, which is a different claim from a smaller total. */
      onscreenDrawsPerRender:
        w.renderCalls === 0 ? 0 : +(w.onscreenDraws / w.renderCalls).toFixed(1),
      offscreenDrawsPerRender:
        w.renderCalls === 0 ? 0 : +(w.offscreenDraws / w.renderCalls).toFixed(1),
      reactCommits: w.reactCommits,
      longTasksOver50ms: w.longTasks.length,
      longTaskMsTotal: +w.longTasks.reduce((s, d) => s + d, 0).toFixed(1),
      /*
       * THE HONEST "IS THE MACHINE PEGGED" NUMBER, and the one to lead with on a box
       * with no GPU. Frame times here are SwiftShader's and are not a player's, but "the
       * main thread spent 98% of wall time inside tasks longer than 50ms" is a statement
       * about the work the page asks for, and it is what leaves nothing for input,
       * React, or anything else the player is trying to do.
       */
      busyPct: +(
        (w.longTasks.reduce((s, d) => s + d, 0) / Math.max(1, elapsedMs)) *
        100
      ).toFixed(1),
    };
    probe.windows.push(row);
    return row;
  };

  /**
   * WHICH SHADOW PARTICIPANT IS MOVING, named.
   *
   * "Something changed in a participating subtree" is not an answer anybody can act on.
   * This mirrors the app's cast/receive population and includes instance-buffer/count,
   * geometry and material versions beside ordinary transforms. That last part is
   * load-bearing: the audit defect moved an InstancedMesh buffer while every Object3D
   * transform held still, and the old diagnostic reported nothing.
   */
  probe.movingCasters = () => {
    const live = probe.rendererRefs
      .map((r) => r.deref())
      .filter((r) => r && document.contains(r.domElement));
    const out = [];
    for (const renderer of live) {
      const ref = probe.sceneRefs.get(renderer);
      const scene = ref && ref.deref ? ref.deref() : null;
      if (!scene) continue;
      const current = new Map();
      const describe = (node) => {
        const parts = [];
        let at = node;
        for (let depth = 0; at && depth < 4; depth += 1) {
          parts.unshift(at.name || at.type);
          at = at.parent;
        }
        return parts.join("/");
      };
      const fold = (node) => {
        let participates = node.castShadow === true || node.receiveShadow === true;
        for (const child of node.children) {
          if (fold(child)) participates = true;
        }
        const castingLight = node.isLight && node.castShadow && node.shadow;
        if (!participates && !castingLight) return false;
        const p = node.position;
        const q = node.quaternion;
        const s = node.scale;
        const materials = Array.isArray(node.material)
          ? node.material
          : node.material
            ? [node.material]
            : [];
        const materialHash = materials.reduce(
          (sum, material, index) =>
            sum +
            (index + 1) *
              (material.id +
                3 * material.version +
                5 * Number(material.visible) +
                7 * (material.alphaTest || 0) +
                11 * material.side),
          0,
        );
        current.set(node.id, {
          hash:
            p.x +
            2 * p.y +
            3 * p.z +
            4 * q.x +
            5 * q.y +
            6 * q.z +
            7 * q.w +
            8 * s.x +
            9 * s.y +
            10 * s.z +
            13 * (node.instanceMatrix?.version ?? 0) +
            17 * (node.isInstancedMesh ? node.count : 0) +
            19 * (node.geometry?.attributes?.position?.version ?? 0) +
            23 * materialHash,
          visible: node.visible,
          what: describe(node),
        });
        return participates || castingLight;
      };
      fold(scene);
      const previous = probe.lastCasterHashes;
      if (previous) {
        for (const [id, row] of current) {
          const was = previous.get(id);
          if (was === undefined) {
            out.push({ id, what: row.what, change: "added" });
          } else if (was.hash !== row.hash) {
            out.push({ id, what: row.what, change: "moved", delta: row.hash - was.hash });
          } else if (was.visible !== row.visible) {
            out.push({ id, what: row.what, change: "visibility" });
          }
        }
        for (const [id, row] of previous) {
          if (!current.has(id)) out.push({ id, what: row.what, change: "removed" });
        }
      }
      probe.lastCasterHashes = current;
      probe.lastCasterCount = current.size;
    }
    return out.slice(0, 12);
  };

  /**
   * ABLATION, applied live to the running renderer.
   *
   * The point is to price each candidate on the real scene BEFORE anything is changed in
   * source, and without changing anything a reviewer would have to approve: shadows and
   * pixel ratio are both runtime properties of the renderer, so turning one off for four
   * seconds and reading the frame time back is a measurement rather than an edit. Every
   * knob is restored by "baseline".
   */
  probe.ablate = (knob) => {
    const live = probe.rendererRefs
      .map((r) => r.deref())
      .filter((r) => r && document.contains(r.domElement));
    for (const renderer of live) {
      if (knob === "baseline") {
        renderer.shadowMap.enabled = true;
        // autoUpdate MUST be restored here. Leaving it out made the first ablation run's
        // "baseline" row a second frozen-shadows row, so the restore is asserted by the
        // driver rather than assumed.
        renderer.shadowMap.autoUpdate = true;
        renderer.shadowMap.needsUpdate = true;
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        for (const ref of probe.hidden) {
          const node = ref.deref();
          if (node) node.visible = true;
        }
        probe.hidden = [];
        for (const [nodeRef, matRef] of probe.sharedSwaps || []) {
          const node = nodeRef.deref();
          const mat = matRef.deref();
          if (node && mat) node.material = mat;
        }
        probe.sharedSwaps = [];
        // Matrices too, or the knob after this one silently inherits the freeze and its
        // row is a measurement of two changes wearing one name.
        for (const ref of probe.frozenMatrices || []) {
          const node = ref.deref();
          if (node) {
            node.matrixAutoUpdate = true;
            node.matrixWorldAutoUpdate = true;
          }
        }
        probe.frozenMatrices = [];
      } else if (knob === "no-shadows") {
        renderer.shadowMap.enabled = false;
      } else if (knob === "frozen-shadows") {
        // The shadow map is rendered ONCE and then held, which is what a static light
        // over static ground would need. Anything that moves keeps its stale shadow, so
        // this prices the pass rather than proposing it.
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.needsUpdate = true;
        renderer.shadowMap.autoUpdate = false;
      } else if (knob === "dpr-1") {
        renderer.setPixelRatio(1);
      } else if (knob === "static-island-matrices") {
        /*
         * PRICING THE PER-RENDER TRAVERSAL, which is separate from the draw calls.
         *
         * Three walks the whole graph twice per render -- updateMatrixWorld, then
         * projectObject for the camera and again for the shadow camera. The island never
         * moves, so its matrices are constant, and matrixAutoUpdate = false is the supported
         * way to say so. The count is derived from the current runtime subtree: #671 batched
         * the old hundreds-of-objects graph, so no historical object count belongs here.
         */
        const ref = probe.sceneRefs.get(renderer);
        const scene = ref && ref.deref ? ref.deref() : null;
        if (!scene) continue;
        const ranked = scene.children
          .map((child) => {
            let meshes = 0;
            child.traverse((n) => {
              if (n.geometry) meshes += 1;
            });
            return { child, meshes };
          })
          .sort((a, b) => b.meshes - a.meshes);
        const island = ranked[0] && ranked[0].child;
        if (!island) continue;
        let frozen = 0;
        island.updateMatrixWorld(true);
        probe.frozenMatrices = probe.frozenMatrices || [];
        island.traverse((node) => {
          node.matrixAutoUpdate = false;
          node.matrixWorldAutoUpdate = false;
          probe.frozenMatrices.push(new WeakRef(node));
          frozen += 1;
        });
        probe.lastStaticStats = { frozenObjects: frozen };
      } else if (knob === "share-island-materials") {
        /*
         * PRICING MATERIAL SHARING WITHOUT MERGING GEOMETRY. Collapsing current runtime
         * materials to one instance per identical signature cannot change a pixel and
         * cannot change the draw COUNT either, so this isolates per-draw material/program
         * rebinding from draw-call overhead. On the post-#671 graph only four meshes are
         * repointed; the old 545-material source graph is no longer the rendered graph.
         */
        const ref = probe.sceneRefs.get(renderer);
        const scene = ref && ref.deref ? ref.deref() : null;
        if (!scene) continue;
        const ranked = scene.children
          .map((child) => {
            let meshes = 0;
            child.traverse((n) => {
              if (n.geometry) meshes += 1;
            });
            return { child, meshes };
          })
          .sort((a, b) => b.meshes - a.meshes);
        const island = ranked[0] && ranked[0].child;
        if (!island) continue;
        const canonical = new Map();
        probe.sharedSwaps = probe.sharedSwaps || [];
        island.traverse((node) => {
          const mat = node.material;
          if (!mat || Array.isArray(mat)) return;
          const sig = [
            mat.type,
            mat.color && mat.color.getHex(),
            mat.roughness,
            mat.metalness,
            mat.flatShading,
            mat.side,
            mat.transparent,
            mat.opacity,
            mat.polygonOffset,
            mat.polygonOffsetFactor,
            mat.polygonOffsetUnits,
            mat.depthWrite,
            mat.vertexColors,
          ].join("|");
          const first = canonical.get(sig);
          if (first === undefined) {
            canonical.set(sig, mat);
            return;
          }
          probe.sharedSwaps.push([new WeakRef(node), new WeakRef(mat)]);
          node.material = first;
        });
        probe.lastShareStats = {
          distinctSignatures: canonical.size,
          swapped: probe.sharedSwaps.length,
        };
      } else if (knob === "hide-biggest-subtree" || knob === "hide-two-biggest") {
        // PRICING A SUBTREE BY REMOVING IT. Hiding is the CEILING on what any amount of
        // merging or instancing could win back, because nothing beats not drawing it --
        // so a cheap hide answers "is a batching rewrite worth its risk" before anybody
        // writes one.
        const ref = probe.sceneRefs.get(renderer);
        const scene = ref && ref.deref ? ref.deref() : null;
        if (!scene) continue;
        const ranked = scene.children
          .map((child) => {
            let meshes = 0;
            child.traverse((n) => {
              if (n.geometry) meshes += 1;
            });
            return { child, meshes };
          })
          .filter((row) => row.meshes > 0)
          .sort((a, b) => b.meshes - a.meshes);
        const take = knob === "hide-two-biggest" ? 2 : 1;
        for (const row of ranked.slice(0, take)) {
          row.child.visible = false;
          probe.hidden.push(new WeakRef(row.child));
        }
      }
    }
    return live.length;
  };

  /**
   * Input to next paint, measured the way a player feels it: dispatch the event, then
   * wait for the frame that actually shows its result. Two rAFs, because the first fires
   * before the paint that the handler's work goes into.
   */
  probe.timeToNextPaint = (dispatch) =>
    new Promise((resolve) => {
      const t0 = performance.now();
      dispatch();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve(+(performance.now() - t0).toFixed(2)));
      });
    });
})();
`;
