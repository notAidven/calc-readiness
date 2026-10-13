// ================= ERA III–VII · the themed islands =================
// Blank slates: land, shore, and what grows on it. Nothing built.
// Same house method as the era kits and era2-island.js — one global, canvas-generated flat-toon
// materials (MeshToonMaterial + a 3-step gradientMap), no shadows, no specular, no gradients.
//
// Every island shares one landform so a plot laid out on one fits all of them: a 13-sided plateau
// (flat, TOP = 0, radius RP) on a battered keel, one step down to a shore rim, one more to the
// beach. Era character lives in the SURFACE (ground colour, patches), the FLORA, the SHORE, and
// one signature LANDFORM worked into the rim band — never on the buildable plateau.
(function () {
  const TAU = Math.PI * 2;

  class IslandBase {
    get D() {
      if (!this._D) this._D = { N: 13, RP: 27.0, RS: 29.0, RK: 21.6, TOP: 0, RIM: -0.55, BEV: -1.42, WY: -1.15, ROT: Math.PI / 7 };
      return this._D;
    }

    // ---------------- toon plumbing ----------------
    grad(T) {
      if (this._gm) return this._gm;
      const c = document.createElement('canvas'); c.width = 3; c.height = 1;
      const x = c.getContext('2d');
      x.fillStyle = '#bcbcbc'; x.fillRect(0, 0, 1, 1);
      x.fillStyle = '#e0e0e0'; x.fillRect(1, 0, 1, 1);
      x.fillStyle = '#ffffff'; x.fillRect(2, 0, 1, 1);
      const t = new T.CanvasTexture(c); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false;
      this._gm = t; return t;
    }
    mat(T, col) {
      if (!this._mc) this._mc = new Map();
      if (this._mc.has(col)) return this._mc.get(col);
      const m = new T.MeshToonMaterial({ color: new T.Color(col).convertSRGBToLinear(), gradientMap: this.grad(T) });
      this._mc.set(col, m); return m;
    }
    rand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
    pick(a, rnd) { return a[((rnd ? rnd() : Math.random()) * a.length) | 0]; }

    // ---------------- primitives ----------------
    box(g, T, w, h, d, mat, x, y, z, ry) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m;
    }
    cyl(g, T, rt, rb, h, mat, x, y, z, seg) {
      const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 12), mat); m.position.set(x, y, z); g.add(m); return m;
    }
    cone(g, T, r, h, mat, x, y, z, seg) {
      const m = new T.Mesh(new T.ConeGeometry(r, h, seg || 8), mat); m.position.set(x, y + h / 2, z); g.add(m); return m;
    }
    pole(g, T, r, h, x, y, z, col) { return this.cyl(g, T, r * 0.94, r, h, this.mat(T, col || this.P.trunk), x, y + h / 2, z, 7); }
    // a flat lens of ground colour laid onto the terrain: patches, crusts, spoil, water
    disc(g, T, r, h, col, x, y, z, seg, sqz, ry) {
      const m = this.cyl(g, T, r, r * 0.94, h, this.mat(T, col), x, y + h / 2, z, seg || 9);
      if (sqz) m.scale.set(1, 1, sqz); if (ry !== undefined) m.rotation.y = ry; return m;
    }
    stone(g, T, s, x, y, z, col, rnd) {
      const c = col !== undefined ? col : this.pick(this.P.stone, rnd);
      const m = new T.Mesh(new T.DodecahedronGeometry(s, 0), this.mat(T, c));
      m.position.set(x, y + s * 0.4, z); m.scale.set(1, 0.62, 0.9);
      m.rotation.set(0.1, (rnd ? rnd() : Math.random()) * TAU, 0.08); g.add(m); return m;
    }
    // an angular slab of bedrock — reads as cut/bedded rock where stone() reads as a boulder
    slab(g, T, w, h, d, col, x, y, z, ry, tilt) {
      const m = this.box(g, T, w, h, d, this.mat(T, col), x, y + h / 2, z, ry || 0);
      if (tilt) m.rotation.z = tilt; return m;
    }

    // ---------------- engineered vocabulary (eras VIII–X) ----------------
    // unlit surfaces for lamps, markings and neon — they read as light without lighting anything
    emat(T, col, op) {
      const key = col + '|' + (op || 1);
      if (!this._ec) this._ec = new Map();
      if (this._ec.has(key)) return this._ec.get(key);
      const m = new T.MeshBasicMaterial({ color: new T.Color(col).convertSRGBToLinear() });
      if (op !== undefined && op < 1) { m.transparent = true; m.opacity = op; }
      this._ec.set(key, m); return m;
    }
    // a straight run of paving between two world points — road, kerb, line, cable trench
    strip(g, T, x0, z0, x1, z1, w, col, y, h, glow) {
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0), hh = h || 0.12;
      const m = new T.Mesh(new T.BoxGeometry(L, hh, w), glow ? this.emat(T, col) : this.mat(T, col));
      m.position.set(mx, (y === undefined ? this.D.TOP : y) + hh / 2, mz);
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(m); return m;
    }
    pstrip(g, T, a0, r0, a1, r1, w, col, y, h, glow) {
      const p = this.pt(a0, r0), q = this.pt(a1, r1);
      return this.strip(g, T, p[0], p[1], q[0], q[1], w, col, y, h, glow);
    }
    // flat pad: plot, apron, lawn, plaza
    pad(g, T, w, d, col, x, z, ry, y, h, glow) {
      const hh = h || 0.12;
      const m = new T.Mesh(new T.BoxGeometry(w, hh, d), glow ? this.emat(T, col) : this.mat(T, col));
      m.position.set(x, (y === undefined ? this.D.TOP : y) + hh / 2, z); m.rotation.y = ry || 0; g.add(m); return m;
    }
    // concentric band built from tangential segments — ring road, kerb, deck edge
    ringBand(g, T, rr, w, col, n, y, h, glow) {
      n = n || 44; const step = TAU / n, L = 2 * rr * Math.tan(step / 2) + 0.06, hh = h || 0.12;
      for (let i = 0; i < n; i++) {
        const a = i * step, p = this.pt(a, rr);
        const m = new T.Mesh(new T.BoxGeometry(L, hh, w), glow ? this.emat(T, col) : this.mat(T, col));
        m.position.set(p[0], (y === undefined ? this.D.TOP : y) + hh / 2, p[1]);
        m.rotation.y = -(a + Math.PI / 2); g.add(m);
      }
    }
    // a wall standing along an arc, buttressed inboard every few bays
    arcWall(g, T, rr, a0, a1, h, t, col, colB, every, yBase) {
      const n = Math.max(2, Math.round(Math.abs(a1 - a0) * rr / 1.7));
      for (let i = 0; i < n; i++) {
        const a = a0 + (a1 - a0) * ((i + 0.5) / n), p = this.pt(a, rr);
        const L = Math.abs(a1 - a0) * rr / n + 0.08;
        const y = yBase === undefined ? this.terrY(p[0], p[1]) : yBase;
        this.box(g, T, L, h, t, this.mat(T, col), p[0], y + h / 2, p[1], -(a + Math.PI / 2));
        if (every && i % every === 0) {
          const q = this.pt(a, rr - t * 1.1);
          this.box(g, T, 0.66, h * 0.8, t * 2.0, this.mat(T, colB || col), q[0], y + h * 0.4, q[1], -(a + Math.PI / 2));
        }
      }
    }
    // lamp standard / marker post, optional glowing head
    post(g, T, x, y, z, h, r, col, head, headW) {
      this.cyl(g, T, r * 0.86, r, h, this.mat(T, col), x, y + h / 2, z, 6);
      if (head !== undefined) {
        const m = new T.Mesh(new T.BoxGeometry(headW || 0.46, 0.2, headW || 0.46), this.emat(T, head));
        m.position.set(x, y + h + 0.08, z); g.add(m);
      }
    }
    // clipped street tree — the planted, maintained counterpart to broadleaf()
    topiary(g, T, x, z, s, leaf, trunk) {
      this.pole(g, T, 0.15 * s, 1.6 * s, x, 0, z, trunk || this.P.trunk);
      const m = new T.Mesh(new T.IcosahedronGeometry(0.92 * s, 1), this.mat(T, this.pick(leaf || this.P.leaf)));
      m.position.set(x, 2.4 * s, z); m.scale.set(1, 0.94, 1); g.add(m);
    }

    terrY(x, z) { const D = this.D, r = Math.hypot(x, z); return r < D.RP - 0.3 ? D.TOP : (r < D.RS ? D.RIM : D.BEV); }
    on(g, T, x, z, fn) { const s = new T.Group(); s.position.set(x, this.terrY(x, z), z); fn(s); g.add(s); return s; }
    pt(a, r) { return [Math.cos(a) * r, Math.sin(a) * r]; }

    land(g, T) {
      const D = this.D, P = this.P;
      const deck = (rt, rb, h, c, yTop) => { const m = this.cyl(g, T, rt, rb, h, this.mat(T, c), 0, yTop - h / 2, 0, D.N); m.rotation.y = D.ROT; return m; };
      deck(D.RK + 6.8, D.RK, 9.6, P.keel, D.BEV + 0.1);
      deck(D.RS, D.RK + 6.75, 1.0, P.shore, D.RIM + 0.1);
      deck(D.RP, D.RP + 0.5, 0.68, P.ground, D.TOP);
      const sea = new T.Mesh(new T.CylinderGeometry(1, 0.94, 5.2, 72, 1), new T.MeshStandardMaterial({ color: P.sea, roughness: 0.24, metalness: 0.06 }));
      sea.scale.set(46, 1, 46); sea.position.y = D.WY - 2.6; g.add(sea);
    }

    // ---------------- flora vocabulary ----------------
    // broad round canopy — oak, elm, generic hardwood
    broadleaf(g, T, x, z, s, leaf, trunk) {
      this.pole(g, T, 0.3 * s, 2.2 * s, x, 0, z, trunk || this.P.trunk);
      for (const [bx, by, bz, br] of [[0, 2.8, 0, 1.4], [1.0, 2.35, 0.35, 0.95], [-0.8, 2.5, -0.55, 0.9], [0.25, 3.45, -0.65, 0.78]]) {
        const m = new T.Mesh(new T.IcosahedronGeometry(br * s, 0), this.mat(T, this.pick(leaf || this.P.leaf)));
        m.position.set(x + bx * s, by * s, z + bz * s); m.scale.set(1.15, 0.86, 1.0);
        m.rotation.set(Math.random(), Math.random() * TAU, Math.random()); g.add(m);
      }
    }
    // gnarled short trunk, wide silvery head split in two — olive, carob
    olive(g, T, x, z, s, leaf) {
      const t = this.pole(g, T, 0.34 * s, 1.15 * s, x, 0, z, this.P.trunk);
      t.rotation.z = 0.1;
      for (const [bx, by, bz, br, sq] of [[-0.55, 1.7, 0.1, 1.15, 0.62], [0.6, 1.9, -0.2, 1.0, 0.6], [0.05, 2.25, 0.45, 0.8, 0.58]]) {
        const m = new T.Mesh(new T.IcosahedronGeometry(br * s, 0), this.mat(T, this.pick(leaf || this.P.leaf)));
        m.position.set(x + bx * s, by * s, z + bz * s); m.scale.set(1.3, sq, 1.2);
        m.rotation.set(0.2, Math.random() * TAU, 0.15); g.add(m);
      }
    }
    // tall narrow spire — cypress, poplar
    spire(g, T, x, z, s, leaf) {
      this.pole(g, T, 0.16 * s, 0.9 * s, x, 0, z, this.P.trunk);
      const c = this.pick(leaf || this.P.leaf);
      this.cone(g, T, 0.72 * s, 4.6 * s, this.mat(T, c), x, 0.5 * s, z, 7);
      this.cone(g, T, 0.5 * s, 2.4 * s, this.mat(T, c), x, 3.1 * s, z, 7);
    }
    // low multi-stem clump cut back to the stool — coppice, hazel
    coppice(g, T, x, z, s, leaf) {
      const rnd = Math.random;
      for (let i = 0; i < 5; i++) {
        const a = rnd() * TAU, r = 0.3 * s;
        const p = this.pole(g, T, 0.1 * s, (1.5 + rnd() * 0.9) * s, x + Math.cos(a) * r, 0, z + Math.sin(a) * r, this.P.trunk);
        p.rotation.z = (rnd() - 0.5) * 0.4; p.rotation.x = (rnd() - 0.5) * 0.4;
      }
      const m = new T.Mesh(new T.IcosahedronGeometry(1.15 * s, 0), this.mat(T, this.pick(leaf || this.P.leaf)));
      m.position.set(x, 2.1 * s, z); m.scale.set(1.2, 0.74, 1.1); m.rotation.y = rnd() * TAU; g.add(m);
    }
    // bare pollarded / burnt stump — no leaf
    deadTree(g, T, x, z, s, col) {
      const c = col || this.P.trunk;
      this.pole(g, T, 0.3 * s, 2.4 * s, x, 0, z, c);
      for (const [bx, by, bz, l, rz] of [[0.5, 2.2, 0.1, 1.5, 0.8], [-0.45, 2.5, -0.3, 1.2, -0.9], [0.1, 2.8, 0.5, 1.0, 0.4]]) {
        const b = this.cyl(g, T, 0.06 * s, 0.13 * s, l * s, this.mat(T, c), x + bx * s, by * s, z + bz * s, 5);
        b.rotation.z = rz; b.rotation.x = (Math.random() - 0.5) * 0.7;
      }
    }
    scrub(g, T, x, z, r, leaf) {
      const m = new T.Mesh(new T.IcosahedronGeometry(r, 0), this.mat(T, this.pick(leaf || this.P.leaf)));
      m.position.set(x, r * 0.55, z); m.scale.set(1.12, 0.7, 1);
      m.rotation.set(Math.random(), Math.random() * TAU, Math.random()); g.add(m); return m;
    }
    tuft(g, T, x, z, s, grass) {
      for (let i = 0; i < 5; i++) {
        const m = new T.Mesh(new T.ConeGeometry(0.08 * s, (0.55 + Math.random() * 0.45) * s, 4), this.mat(T, this.pick(grass || this.P.grass)));
        m.position.set(x + (Math.random() - 0.5) * 0.66 * s, 0.24 * s, z + (Math.random() - 0.5) * 0.66 * s);
        m.rotation.z = (Math.random() - 0.5) * 0.65; m.rotation.x = (Math.random() - 0.5) * 0.55; g.add(m);
      }
    }
    reeds(g, T, x, y, z, r, n, col) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, rr = Math.random() * r, h = 1.3 + Math.random() * 1.1;
        const m = this.cyl(g, T, 0.035, 0.055, h, this.mat(T, col || this.pick(this.P.reed)),
          x + Math.cos(a) * rr, y + h / 2 - 0.25, z + Math.sin(a) * rr, 4);
        m.rotation.z = (Math.random() - 0.5) * 0.5; m.rotation.x = (Math.random() - 0.5) * 0.4;
      }
    }
    // a run of bushes set out along a chord — hedge, thicket, windbreak
    hedgerow(g, T, a0, r0, a1, r1, n, r, leaf) {
      const [x0, z0] = this.pt(a0, r0), [x1, z1] = this.pt(a1, r1);
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        this.on(g, T, x, z, (s) => this.scrub(s, T, 0, 0, r * (0.82 + Math.random() * 0.4), leaf));
      }
    }

    // patches of drier and greener ground, laid flat. Without them the plateau is one unbroken
    // plate at diorama distance, because the tufts on it are too small to read.
    patches(g, T) {
      const D = this.D, rnd = this.rand(20260805);
      for (const [a, k, rr, c] of this.patchDefs) {
        const p = this.pt(a, D.RP * k);
        const m = this.disc(g, T, rr, 0.14, c, p[0], D.TOP + 0.02, p[1], 7 + ((rnd() * 3) | 0), 0.7 + rnd() * 0.5, rnd() * TAU);
        m.position.y = D.TOP + 0.09;
      }
    }

    shore(g, T) {
      const D = this.D, rnd = this.rand(551213), o = this.shoreOpts || {};
      for (let i = 0; i < 150; i++) {
        const p = this.pt(rnd() * TAU, D.RP - 0.5 + rnd() * (D.RS - D.RP + 0.9));
        const r = Math.hypot(p[0], p[1]);
        this.stone(g, T, 0.1 + rnd() * 0.17, p[0], (r > D.RS - 0.2 ? D.BEV + 0.2 : D.RIM) - 0.04, p[1], undefined, rnd);
      }
      for (const [a, n] of (o.boulders || [[0.75, 4], [2.4, 5], [3.2, 4], [4.0, 5], [4.8, 4], [5.6, 5]]))
        for (let k = 0; k < n; k++) {
          const p = this.pt(a + (rnd() - 0.5) * 0.26, D.RP + 0.3 + rnd() * 2.0);
          this.stone(g, T, 0.5 + rnd() * 0.7, p[0], D.RIM + 0.1, p[1], undefined, rnd);
        }
      for (const [a, n] of (o.reedBanks || [[1.15, 22], [2.75, 18], [3.6, 20], [5.1, 16], [6.0, 14]])) {
        const p = this.pt(a, D.RS + 0.7);
        this.reeds(g, T, p[0], D.WY - 0.15, p[1], 2.1, n);
      }
    }

    // scatter of tufts and small stones over the whole plateau
    ground(g, T, n, seed) {
      const D = this.D, rnd = this.rand(seed || 31337);
      for (let i = 0; i < (n || 430); i++) {
        const p = this.pt(rnd() * TAU, D.RP * Math.sqrt(0.03 + rnd() * 0.93) * 0.96);
        this.on(g, T, p[0], p[1], (s) => {
          if (rnd() < (this.tuftRatio === undefined ? 0.84 : this.tuftRatio)) this.tuft(s, T, 0, 0, 1.0 + rnd() * 0.7);
          else this.stone(s, T, 0.14 + rnd() * 0.24, 0, 0, 0, undefined, rnd);
        });
      }
    }

    flora(g, T) {}
    feature(g, T) {}

    build(T) {
      const g = new T.Group();
      this.land(g, T);
      this.patches(g, T);
      this.feature(g, T);
      this.flora(g, T);
      this.ground(g, T);
      this.shore(g, T);
      return g;
    }
  }

  // ============================================================================
  // ERA III · BRONZE — a dry headland. Sun-bleached earth, olive and thorn, a worked
  // dry-stone terrace cut into one flank, a copper-stained outcrop, a salt pan on the rim.
  // ============================================================================
  class Era3Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x7A6B52, shore: 0xD8CDB2, ground: 0xC0B190, sea: 0x4E7A76, trunk: 0x8E8271,
        leaf: [0x7C8967, 0x6E7C5A, 0x8B9673],
        grass: [0xC2AE78, 0xB39F68, 0xCEBA85],
        reed: [0xA79A62, 0xB6A972, 0x968A52],
        stone: [0xB6B9B3, 0xC7CAC4, 0x9DA19B],
        thorn: [0x8A8B5E, 0x767A50],
        ore: 0x6E9E8C, oreDk: 0x4F7A6C, salt: 0xE9E4D2, brine: 0x8FA79E, dust: 0xCFC4A6,
      };
      return this._P;
    }
    get patchDefs() {
      return [[1.60, 0.42, 7.4, 0xB6A582], [4.35, 0.55, 8.6, 0xCBBC98], [2.85, 0.72, 6.2, 0xAFA07C],
        [5.55, 0.48, 7.0, 0xC7B693], [0.62, 0.68, 6.6, 0xB9AA86], [3.55, 0.30, 5.4, 0xC9BA96],
        [0.05, 0.86, 5.0, 0xAB9C79], [2.20, 0.88, 5.6, 0xC3B48F]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 12], [3.6, 10]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(30301);
      // dry-stone terracing stepping down the south-east flank: two retaining lips of laid stone
      for (const [rr, span, a0] of [[D.RP * 0.74, 1.18, 4.98], [D.RP * 0.86, 1.05, 5.05], [D.RP * 0.95, 0.86, 5.12]]) {
        const n = Math.round(span * rr / 0.72);
        for (let i = 0; i <= n; i++) {
          const a = a0 - span / 2 + (span * i) / n, p = this.pt(a, rr + (rnd() - 0.5) * 0.3);
          const b = this.box(g, T, 0.62 + rnd() * 0.2, 0.34 + rnd() * 0.14, 0.5, this.mat(T, this.pick(P.stone, rnd)), p[0], this.terrY(p[0], p[1]) + 0.17, p[1], -a);
          if (rnd() < 0.5) b.position.y += 0.26;
        }
      }
      // the strip between the lips reads as a worked bed of turned soil
      for (const [a, rr, r] of [[5.05, D.RP * 0.905, 3.0], [4.78, D.RP * 0.89, 2.7], [5.34, D.RP * 0.90, 2.7],
        [4.95, D.RP * 0.80, 3.2], [5.22, D.RP * 0.795, 2.8], [4.68, D.RP * 0.79, 2.5]]) {
        const p = this.pt(a, rr);
        this.disc(g, T, r, 0.14, 0xA88C5C, p[0], D.TOP + 0.08, p[1], 8, 0.40, -a);
      }
      // copper-stained outcrop: the reason anyone bothers with this rock
      const oc = this.pt(2.05, D.RP * 0.88);
      for (let i = 0; i < 24; i++) {
        const a = rnd() * TAU, r = rnd() * 3.4, s = 0.45 + rnd() * 1.0;
        this.stone(g, T, s, oc[0] + Math.cos(a) * r, D.TOP - 0.05, oc[1] + Math.sin(a) * r,
          rnd() < 0.34 ? (rnd() < 0.5 ? P.ore : P.oreDk) : this.pick(P.stone, rnd), rnd);
      }
      this.slab(g, T, 4.2, 1.7, 2.8, P.stone[2], oc[0], D.TOP, oc[1], 0.5, 0.06);
      this.slab(g, T, 3.0, 0.7, 1.9, P.ore, oc[0] + 0.7, D.TOP + 1.5, oc[1] - 0.4, 0.72, -0.06);
      this.slab(g, T, 1.9, 0.9, 1.3, P.oreDk, oc[0] + 1.6, D.TOP + 2.1, oc[1] - 0.9, 1.05, -0.1);
      // salt pan on the rim: a crust ring round a shallow brine sheet
      const sp = this.pt(3.55, D.RP * 0.99);
      this.disc(g, T, 4.3, 0.1, P.salt, sp[0], D.RIM + 0.02, sp[1], 11, 0.68, 0.4);
      this.disc(g, T, 3.0, 0.08, P.brine, sp[0], D.RIM + 0.06, sp[1], 11, 0.66, 0.4);
      for (let i = 0; i < 22; i++) {
        const a = rnd() * TAU, r = 3.2 + rnd() * 1.4;
        this.stone(g, T, 0.14 + rnd() * 0.2, sp[0] + Math.cos(a) * r, D.RIM, sp[1] + Math.sin(a) * r * 0.68, P.salt, rnd);
      }
    }
    flora(g, T) {
      const D = this.D, rnd = this.rand(30302);
      for (const [a, k, s] of [[2.62, 0.80, 1.0], [3.05, 0.86, 0.85], [1.05, 0.88, 0.95], [0.42, 0.83, 0.9],
        [1.78, 0.76, 1.05], [4.62, 0.84, 0.88], [5.85, 0.86, 0.95], [0.95, 0.62, 0.8], [4.10, 0.70, 0.92],
        [3.42, 0.62, 0.9], [0.20, 0.58, 0.85], [1.42, 0.50, 0.95], [2.30, 0.55, 0.8], [5.30, 0.62, 0.9],
        [4.85, 0.46, 0.85], [6.05, 0.50, 0.95], [2.95, 0.44, 0.8]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s2) => this.olive(s2, T, 0, 0, s));
      }
      for (let i = 0; i < 78; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.32 + rnd() * 0.62));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.34 + rnd() * 0.34, this.P.thorn));
      }
    }
  }

  // ============================================================================
  // ERA IV · CLASSICAL — a limestone promontory. Bedrock shelves break the turf, cypress
  // stands mark the high ground, and a gravel cove notches the shore.
  // ============================================================================
  class Era4Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x9A927C, shore: 0xE0D8C0, ground: 0xC6BA9A, sea: 0x4E7C7A, trunk: 0x7A6247,
        leaf: [0x5E7B3C, 0x46602C, 0x6B8845],
        cyp: [0x3E5A32, 0x466428, 0x37502B],
        grass: [0xA8A868, 0x97975B, 0xB8B478],
        reed: [0x8E9A5A, 0x9EA968, 0x7E8A4E],
        stone: [0x9DA09A, 0xAEB1AB, 0x84877F],
        rock: 0xB7B4A6, rockLt: 0xC8C5B6, rockDk: 0x9B9889, grav: 0xCFC7B2,
      };
      return this._P;
    }
    get patchDefs() {
      return [[1.60, 0.42, 7.4, 0xB4AC8A], [4.35, 0.55, 8.6, 0xC2BA98], [2.85, 0.72, 6.2, 0xA9A57F],
        [5.55, 0.48, 7.0, 0xBCB593], [0.62, 0.68, 6.6, 0xB0A98A], [3.55, 0.30, 5.4, 0xC4BC9C],
        [0.05, 0.86, 5.0, 0xA6A17C], [2.20, 0.88, 5.6, 0xBEB694]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 14], [5.1, 12]], boulders: [[0.75, 5], [2.4, 6], [3.2, 5], [4.8, 5], [5.6, 4]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(40401);
      // bedrock breaking through the turf in flat beds — the ground everything here gets founded on
      for (const [a, k, w, d, h, ry] of [[0.30, 0.80, 7.0, 5.0, 0.42, 0.3], [0.30, 0.80, 5.2, 3.6, 0.4, -0.15],
        [2.30, 0.86, 6.2, 4.4, 0.4, 0.9], [2.30, 0.86, 4.2, 3.0, 0.38, 1.25],
        [4.25, 0.82, 5.6, 4.0, 0.4, 2.1]]) {
        const p = this.pt(a, D.RP * k);
        this.slab(g, T, w, h, d, rnd() < 0.5 ? P.rock : P.rockLt, p[0], this.terrY(p[0], p[1]) + (h > 0.41 ? 0 : 0.4), p[1], ry);
      }
      // a low shelf knoll at the rim: three receding beds, the classic acropolis seat
      const kn = this.pt(0.30, D.RP * 0.80);
      for (const [i, [r, h, c]] of [[5.4, 0.46, P.rockDk], [4.0, 0.42, P.rock], [2.6, 0.38, P.rockLt]].entries()) {
        this.disc(g, T, r, h, c, kn[0], D.TOP + 0.1 + i * 0.4, kn[1], 9, 0.78, 0.4 + i * 0.3);
      }
      for (let i = 0; i < 16; i++) {
        const a = rnd() * TAU, r = 2.8 + rnd() * 3.4;
        this.stone(g, T, 0.2 + rnd() * 0.5, kn[0] + Math.cos(a) * r, D.TOP, kn[1] + Math.sin(a) * r * 0.8, undefined, rnd);
      }
      // the cove: a pale gravel strand with rock steps down to the water
      const cv = this.pt(5.35, D.RS - 0.4);
      this.disc(g, T, 5.0, 0.1, P.grav, cv[0], D.RIM + 0.02, cv[1], 11, 0.55, 5.35);
      this.disc(g, T, 3.2, 0.1, 0xDCD5C2, cv[0] * 1.05, D.BEV + 0.12, cv[1] * 1.05, 9, 0.5, 5.35);
      for (let i = 0; i < 4; i++) {
        const p = this.pt(5.35 + (i - 1.5) * 0.055, D.RP - 0.4 + i * 0.55);
        this.slab(g, T, 3.6 - i * 0.5, 0.3, 1.0, P.rockDk, p[0], D.RIM - 0.12 * i, p[1], -5.35);
      }
      for (let i = 0; i < 26; i++) {
        const a = 5.35 + (rnd() - 0.5) * 0.5, r = D.RP + rnd() * 2.6;
        const p = this.pt(a, r);
        this.stone(g, T, 0.12 + rnd() * 0.26, p[0], (r > D.RS - 0.2 ? D.BEV + 0.2 : D.RIM), p[1], P.grav, rnd);
      }
    }
    flora(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(40402);
      // cypresses read as a stand, not a scatter — three tight groups on the high ground
      for (const [a, k] of [[0.30, 0.62], [2.30, 0.68], [4.25, 0.64]]) {
        for (let i = 0; i < 5; i++) {
          const p = this.pt(a + (rnd() - 0.5) * 0.34, D.RP * k + (rnd() - 0.5) * 4.2);
          this.on(g, T, p[0], p[1], (s) => this.spire(s, T, 0, 0, 0.72 + rnd() * 0.3, P.cyp));
        }
      }
      for (const [a, k, s] of [[1.35, 0.84, 1.0], [1.72, 0.80, 0.85], [3.20, 0.86, 0.95], [3.62, 0.82, 0.9],
        [5.05, 0.86, 1.0], [4.75, 0.78, 0.82], [2.75, 0.90, 0.9], [0.85, 0.88, 0.95]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s2) => this.olive(s2, T, 0, 0, s));
      }
      for (let i = 0; i < 30; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.6 + rnd() * 0.35));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.4 + rnd() * 0.3));
      }
    }
  }

  // ============================================================================
  // ERA V · MEDIEVAL — a northern river island. Green pasture broken by hedgerows, oak
  // woodland on the wind side, a chalk bluff, and a willow marsh at the stream mouth.
  // ============================================================================
  class Era5Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x6B5F4C, shore: 0xB0A88F, ground: 0x6E7A46, sea: 0x4E6A64, trunk: 0x6B5641,
        leaf: [0x53703A, 0x3D5629, 0x62804A],
        hedge: [0x415A2C, 0x364C25, 0x4B6633],
        grass: [0x77854A, 0x6A7742, 0x869457],
        reed: [0x8A8A50, 0x9A9A5E, 0x7A7A46],
        stone: [0x8F8C7E, 0xA5A192, 0x6F6D62],
        chalk: 0xD8D2BE, chalkLt: 0xE6E1D0, chalkDk: 0xBCB6A2,
        mud: 0x6E5F46, water: 0x455F58, bracken: [0x8A6E3C, 0x9C7F46],
      };
      return this._P;
    }
    get patchDefs() {
      return [[1.60, 0.42, 7.4, 0x77864A], [4.35, 0.55, 8.6, 0x64703F], [2.85, 0.72, 6.2, 0x7C8B4E],
        [5.55, 0.48, 7.0, 0x687545], [0.62, 0.68, 6.6, 0x808E52], [3.55, 0.30, 5.4, 0x6B7843],
        [0.05, 0.86, 5.0, 0x74824A], [2.20, 0.88, 5.6, 0x616D3C]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 26], [2.75, 22], [3.6, 24], [5.1, 20], [6.0, 18]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(50501);
      // chalk bluff: the island's one hard edge, two beds and a rubble skirt
      const bf = this.pt(1.05, D.RP * 0.93);
      this.disc(g, T, 5.6, 0.9, P.chalkDk, bf[0], D.TOP - 0.1, bf[1], 9, 0.6, 1.0);
      this.disc(g, T, 4.0, 0.8, P.chalk, bf[0] + 0.4, D.TOP + 0.78, bf[1] + 0.2, 8, 0.58, 1.3);
      this.disc(g, T, 2.3, 0.6, P.chalkLt, bf[0] + 0.9, D.TOP + 1.5, bf[1] + 0.1, 7, 0.6, 0.8);
      for (let i = 0; i < 24; i++) {
        const a = rnd() * TAU, r = 3.4 + rnd() * 3.0;
        this.stone(g, T, 0.16 + rnd() * 0.34, bf[0] + Math.cos(a) * r, this.terrY(bf[0] + Math.cos(a) * r, bf[1] + Math.sin(a) * r * 0.6), bf[1] + Math.sin(a) * r * 0.6, rnd() < 0.6 ? P.chalk : P.chalkDk, rnd);
      }
      // stream mouth: dark water cutting into the rim, mud banks, willows leaning over it
      const sm = this.pt(3.95, D.RP * 0.97);
      this.disc(g, T, 4.6, 0.14, P.mud, sm[0], D.TOP - 0.06, sm[1], 10, 0.5, 3.95);
      this.disc(g, T, 3.4, 0.1, P.water, sm[0], D.TOP - 0.02, sm[1], 10, 0.42, 3.95);
      this.reeds(g, T, sm[0] - 1.6, D.TOP + 0.05, sm[1] + 1.0, 1.8, 22);
      this.reeds(g, T, sm[0] + 1.8, D.TOP + 0.05, sm[1] - 0.9, 1.6, 18);
      for (const [dx, dz, s] of [[-3.6, 1.9, 0.9], [3.4, -2.0, 1.0], [0.4, 2.6, 0.8]]) {
        const x = sm[0] + dx, z = sm[1] + dz;
        this.on(g, T, x, z, (sub) => this.broadleaf(sub, T, 0, 0, s, [0x6E8A46, 0x5E7A3C]));
      }
      // hedgerows dividing the outer grazing, laid along the field lines
      this.hedgerow(g, T, 2.30, D.RP * 0.42, 2.30, D.RP * 0.95, 14, 0.72, P.hedge);
      this.hedgerow(g, T, 5.10, D.RP * 0.46, 5.35, D.RP * 0.94, 13, 0.7, P.hedge);
      this.hedgerow(g, T, 0.15, D.RP * 0.58, 0.62, D.RP * 0.92, 10, 0.66, P.hedge);
      // bracken and thistle on the poorer ground
      for (let i = 0; i < 26; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.66 + rnd() * 0.28));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.32 + rnd() * 0.22, P.bracken));
      }
    }
    flora(g, T) {
      const D = this.D, rnd = this.rand(50502);
      // an oak wood banked up on the wind side rather than trees dotted evenly round
      for (let i = 0; i < 16; i++) {
        const p = this.pt(2.95 + (rnd() - 0.5) * 1.5, D.RP * (0.72 + rnd() * 0.24));
        this.on(g, T, p[0], p[1], (s) => this.broadleaf(s, T, 0, 0, 0.85 + rnd() * 0.45));
      }
      for (const [a, k, s] of [[0.45, 0.86, 1.1], [1.85, 0.80, 0.95], [4.70, 0.88, 1.05], [5.75, 0.84, 0.9], [4.25, 0.62, 1.0]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s2) => this.broadleaf(s2, T, 0, 0, s));
      }
      for (let i = 0; i < 22; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.5 + rnd() * 0.42));
        this.on(g, T, p[0], p[1], (s) => this.coppice(s, T, 0, 0, 0.5 + rnd() * 0.25));
      }
    }
  }

  // ============================================================================
  // ERA VI · EARLY MODERN — an estuary island under improvement. Hedged strips, ridge and
  // furrow, a cut drain with raised banks, a sandstone ridge, tidal mud at the water's edge.
  // ============================================================================
  class Era6Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x6E6151, shore: 0xA89A80, ground: 0x76824C, sea: 0x5C7F80, trunk: 0x5A4630,
        leaf: [0x5E6E3C, 0x4C5B30, 0x6C7C48],
        hedge: [0x44532C, 0x3A4826, 0x4E5E33],
        grass: [0x7F8A50, 0x717C46, 0x8D975C],
        reed: [0x8E9058, 0x9EA066, 0x7E8048],
        stone: [0xB4A98F, 0xC5BAA0, 0xA0957C],
        sand: 0xC0A784, sandLt: 0xD1B995, sandDk: 0xA48D6C,
        furrow: 0x8A8E52, mud: 0x8A7C62, mudDk: 0x736648, water: 0x53736F,
      };
      return this._P;
    }
    get patchDefs() {
      return [[1.60, 0.42, 7.4, 0x7F8B52], [4.35, 0.55, 8.6, 0x6E7A47], [2.85, 0.72, 6.2, 0x86924F],
        [5.55, 0.48, 7.0, 0x74804A], [0.62, 0.68, 6.6, 0x8A9656], [3.55, 0.30, 5.4, 0x717D48],
        [0.05, 0.86, 5.0, 0x7C8850], [2.20, 0.88, 5.6, 0x6A7644]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 20], [2.75, 16], [5.1, 18]], boulders: [[0.75, 3], [3.2, 4], [4.8, 3]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(60601);
      // ridge and furrow: the land visibly worked, laid in parallel runs across one quarter
      const a0 = 1.95, [cx, cz] = this.pt(a0, D.RP * 0.72);
      const ux = Math.cos(a0 + Math.PI / 2), uz = Math.sin(a0 + Math.PI / 2);
      for (let i = -6; i <= 6; i++) {
        const off = i * 1.15, x = cx + ux * off, z = cz + uz * off;
        const len = 15.5 * Math.sqrt(Math.max(0.08, 1 - (off / 8.4) ** 2));
        const m = this.box(g, T, 0.78, 0.2, len, this.mat(T, i % 2 ? P.furrow : 0x7A8648), x, D.TOP + 0.1, z, -a0 + Math.PI / 2);
        m.rotation.y = -(a0 - Math.PI / 2);
      }
      // the cut: a straight drain with spoil thrown up either side, running out to the estuary
      const b0 = 4.55;
      const [dx0, dz0] = this.pt(b0, D.RP * 0.30), [dx1, dz1] = this.pt(b0, D.RS - 0.6);
      const mx = (dx0 + dx1) / 2, mz = (dz0 + dz1) / 2, dl = Math.hypot(dx1 - dx0, dz1 - dz0);
      const ang = -Math.atan2(dz1 - dz0, dx1 - dx0);
      this.box(g, T, dl, 0.16, 2.5, this.mat(T, P.mudDk), mx, D.TOP - 0.03, mz, ang);
      this.box(g, T, dl, 0.12, 1.5, this.mat(T, P.water), mx, D.TOP + 0.02, mz, ang);
      for (const s of [-1, 1]) {
        const nx = Math.cos(b0 + Math.PI / 2) * 1.9 * s, nz = Math.sin(b0 + Math.PI / 2) * 1.9 * s;
        this.box(g, T, dl * 0.94, 0.5, 1.1, this.mat(T, P.mud), mx + nx, D.TOP + 0.25, mz + nz, ang);
      }
      this.reeds(g, T, dx1 - (dx1 - dx0) * 0.06, D.TOP + 0.05, dz1 - (dz1 - dz0) * 0.06, 1.9, 20);
      // sandstone ridge: bedded, quarriable, the building stone of the era
      const rg = this.pt(0.10, D.RP * 0.90);
      for (const [i, [w, d, h, c]] of [[9.0, 3.4, 0.5, P.sandDk], [7.2, 2.6, 0.44, P.sand], [5.0, 1.8, 0.4, P.sandLt]].entries()) {
        this.slab(g, T, w, h, d, c, rg[0], D.TOP + i * 0.44, rg[1], 0.1 - i * 0.08);
      }
      for (let i = 0; i < 18; i++) {
        const a = rnd() * TAU, r = 3.0 + rnd() * 3.2;
        this.stone(g, T, 0.18 + rnd() * 0.4, rg[0] + Math.cos(a) * r, D.TOP, rg[1] + Math.sin(a) * r * 0.7, rnd() < 0.6 ? P.sand : P.sandDk, rnd);
      }
      // hedged strips: the enclosure grid, only on the outer ground
      this.hedgerow(g, T, 1.30, D.RP * 0.50, 1.30, D.RP * 0.96, 12, 0.6, P.hedge);
      this.hedgerow(g, T, 2.62, D.RP * 0.50, 2.62, D.RP * 0.96, 12, 0.6, P.hedge);
      this.hedgerow(g, T, 3.40, D.RP * 0.55, 3.72, D.RP * 0.94, 11, 0.58, P.hedge);
      this.hedgerow(g, T, 5.60, D.RP * 0.52, 5.90, D.RP * 0.93, 11, 0.58, P.hedge);
      // tidal mud outside the shore rim on the sheltered side
      for (const [a, r, sq] of [[4.55, 6.0, 0.5], [5.15, 4.4, 0.55], [3.95, 4.0, 0.5]]) {
        const p = this.pt(a, D.RS + 1.4);
        this.disc(g, T, r, 0.1, P.mud, p[0], D.WY - 0.2, p[1], 10, sq, -a);
      }
    }
    flora(g, T) {
      const D = this.D, rnd = this.rand(60602);
      // hedgerow elms — tall, in lines along the field edges, not scattered
      for (const [a, ks] of [[1.30, [0.56, 0.72, 0.88]], [2.62, [0.60, 0.84]], [5.60, [0.58, 0.80]], [3.55, [0.62, 0.86]]]) {
        for (const k of ks) {
          const p = this.pt(a + (rnd() - 0.5) * 0.06, D.RP * k);
          this.on(g, T, p[0], p[1], (s) => this.broadleaf(s, T, 0, 0, 0.95 + rnd() * 0.3));
        }
      }
      for (let i = 0; i < 14; i++) {
        const p = this.pt(3.15 + (rnd() - 0.5) * 1.0, D.RP * (0.74 + rnd() * 0.2));
        this.on(g, T, p[0], p[1], (s) => this.coppice(s, T, 0, 0, 0.55 + rnd() * 0.3));
      }
      for (let i = 0; i < 22; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.6 + rnd() * 0.34));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.34 + rnd() * 0.24));
      }
    }
  }

  // ============================================================================
  // ERA VII · INDUSTRIAL — a coalfield island. Sooty turf, an exposed coal seam and its
  // spoil, a quarried sandstone face, a silted channel, and trees pollarded or dead.
  // ============================================================================
  class Era7Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x5A5148, shore: 0x8E8578, ground: 0x66654B, sea: 0x53625E, trunk: 0x4A4034,
        leaf: [0x55603A, 0x47512F, 0x616B44],
        grass: [0x6E7052, 0x636349, 0x7A7A5C],
        reed: [0x7E7E4E, 0x8C8C5A, 0x6E6E42],
        stone: [0x9A9689, 0xAFAB9E, 0x7A786E],
        coal: 0x1B1B1E, coalLt: 0x2C2C31, shale: 0x3E3E42, ash: 0x8C8478, ashDk: 0x736C61,
        sand: 0xA8A08E, sandLt: 0xBAB2A0, sandDk: 0x8A8271,
        silt: 0x5E5648, water: 0x3E4A47, rust: 0x6E4A34, soot: 0x54332C, burnt: 0x38302A,
      };
      return this._P;
    }
    get tuftRatio() { return 0.72; }
    get patchDefs() {
      return [[1.60, 0.42, 7.4, 0x676650], [4.35, 0.55, 8.6, 0x72705A], [2.85, 0.72, 6.2, 0x5C5C44],
        [5.55, 0.48, 7.0, 0x6C6A52], [0.62, 0.68, 6.6, 0x615F49], [3.55, 0.30, 5.4, 0x757360],
        [0.05, 0.86, 5.0, 0x585843], [2.20, 0.88, 5.6, 0x6E6C54]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 18], [3.6, 16], [5.1, 14]], boulders: [[0.75, 4], [2.4, 5], [4.8, 4]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(70701);
      // the coal seam, cut open at the rim: ash cap over shale over a black band
      const cs = this.pt(2.45, D.RP * 0.92);
      const inx = Math.cos(2.45), inz = Math.sin(2.45), tx = Math.cos(2.45 + Math.PI / 2), tz = Math.sin(2.45 + Math.PI / 2);
      // beds stacked back into the slope: ash cap on top, shale, then the black band at the bottom
      for (const [i, [w, d, h, c]] of [[13.0, 2.2, 0.42, P.coal], [12.0, 2.4, 0.4, P.shale],
        [10.4, 2.6, 0.4, P.ashDk], [8.6, 2.8, 0.45, 0x60604A]].entries()) {
        const k = -i * 1.5;
        this.slab(g, T, w, h, d, c, cs[0] + inx * k, D.TOP - 0.15 + i * 0.4, cs[1] + inz * k, -2.45);
      }
      // spalled blocks fallen out of the face
      for (let i = 0; i < 12; i++) {
        const t = (rnd() - 0.5) * 12, o = 1.4 + rnd() * 2.4;
        const x = cs[0] + tx * t + inx * o, z = cs[1] + tz * t + inz * o;
        this.box(g, T, 0.5 + rnd() * 0.6, 0.3 + rnd() * 0.3, 0.4 + rnd() * 0.5,
          this.mat(T, rnd() < 0.6 ? P.coal : P.shale), x, this.terrY(x, z) + 0.18, z, rnd() * TAU);
      }
      for (let i = 0; i < 26; i++) {
        const a = rnd() * TAU, r = 3.2 + rnd() * 3.4;
        const x = cs[0] + Math.cos(a) * r, z = cs[1] + Math.sin(a) * r * 0.62;
        this.stone(g, T, 0.14 + rnd() * 0.34, x, this.terrY(x, z), z, rnd() < 0.5 ? P.coal : (rnd() < 0.5 ? P.shale : P.ashDk), rnd);
      }
      // spoil: two black cones tipped out beside the cut, the first thing anyone notices
      for (const [dx, dz, r, h] of [[-5.0, -4.2, 3.2, 2.1], [-2.6, -6.6, 2.2, 1.5]]) {
        const x = cs[0] + inx * dx + tx * dz, z = cs[1] + inz * dx + tz * dz;
        this.disc(g, T, r * 1.3, 0.12, P.coalLt, x, D.TOP + 0.02, z, 9);
        this.cone(g, T, r, h, this.mat(T, P.coal), x, D.TOP + 0.1, z, 7);
      }
      // quarried sandstone face: benched, with squared rubble below it
      const qf = this.pt(5.45, D.RP * 0.88);
      const qx = Math.cos(5.45), qz = Math.sin(5.45);
      const qtx = Math.cos(5.45 + Math.PI / 2), qtz = Math.sin(5.45 + Math.PI / 2);
      for (const [i, [w, d, h, c]] of [[13.0, 2.6, 0.38, P.sandDk], [11.4, 2.4, 0.36, P.sand], [9.4, 2.2, 0.34, P.sandLt]].entries()) {
        const k = -i * 1.6;
        this.slab(g, T, w, h, d, c, qf[0] + qx * k, D.TOP - 0.1 + i * 0.34, qf[1] + qz * k, -5.45);
      }
      // the floor of the working: bare stone dust, and squared blocks left where they fell
      this.disc(g, T, 5.4, 0.1, 0xA39B89, qf[0] + qx * 3.4, D.TOP + 0.04, qf[1] + qz * 3.4, 9, 0.62, 5.45);
      for (let i = 0; i < 22; i++) {
        const t = (rnd() - 0.5) * 13, o = 1.6 + rnd() * 3.6;
        const x = qf[0] + qtx * t + qx * o, z = qf[1] + qtz * t + qz * o;
        this.box(g, T, 0.55 + rnd() * 0.6, 0.3 + rnd() * 0.3, 0.5 + rnd() * 0.45,
          this.mat(T, rnd() < 0.5 ? P.sand : P.sandDk), x, this.terrY(x, z) + 0.2, z, rnd() * TAU);
      }
      // silted channel: dull water in a wide mud trough, running out to the river
      const c0 = 0.55;
      const [wx0, wz0] = this.pt(c0, D.RP * 0.34), [wx1, wz1] = this.pt(c0 - 0.16, D.RS - 0.5);
      const mx = (wx0 + wx1) / 2, mz = (wz0 + wz1) / 2, dl = Math.hypot(wx1 - wx0, wz1 - wz0);
      const ang = -Math.atan2(wz1 - wz0, wx1 - wx0);
      this.box(g, T, dl, 0.3, 3.6, this.mat(T, P.silt), mx, D.TOP + 0.07, mz, ang);
      this.box(g, T, dl, 0.16, 2.1, this.mat(T, P.water), mx, D.TOP + 0.22, mz, ang);
      for (const sd of [-1, 1]) {
        const nx = Math.cos(c0 + Math.PI / 2) * 2.5 * sd, nz = Math.sin(c0 + Math.PI / 2) * 2.5 * sd;
        this.box(g, T, dl * 0.92, 0.44, 1.5, this.mat(T, P.ashDk), mx + nx, D.TOP + 0.2, mz + nz, ang);
      }
      this.reeds(g, T, mx + 1.5, D.TOP + 0.05, mz + 1.8, 2.0, 18);
      this.reeds(g, T, mx - 2.0, D.TOP + 0.05, mz - 1.6, 1.8, 14);
      // sooty ground: ash-stained flats where nothing has come back
      for (const [a, k, r] of [[2.45, 0.62, 4.6], [1.85, 0.48, 3.2], [3.10, 0.55, 3.6], [0.95, 0.70, 2.8]]) {
        const p = this.pt(a, D.RP * k);
        this.disc(g, T, r, 0.1, P.ashDk, p[0], D.TOP + 0.06, p[1], 9, 0.66, a);
      }
    }
    flora(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(70702);
      // what survives here is thin: a few live trees downwind, dead stumps near the seam
      for (const [a, k, s] of [[4.10, 0.78, 0.95], [4.55, 0.68, 0.85], [3.80, 0.86, 0.9],
        [5.95, 0.80, 1.0], [0.20, 0.84, 0.9], [4.90, 0.90, 0.85]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s2) => this.broadleaf(s2, T, 0, 0, s));
      }
      for (const [a, k, s] of [[2.10, 0.72, 0.85], [2.80, 0.78, 0.95], [1.60, 0.66, 0.8], [3.05, 0.62, 0.75], [1.30, 0.82, 0.9]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s2) => this.deadTree(s2, T, 0, 0, s, P.burnt));
      }
      for (let i = 0; i < 24; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.5 + rnd() * 0.44));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.3 + rnd() * 0.28));
      }
    }
  }

  // ============================================================================
  // ERA VIII · ATOMIC — a graded shelf. Trimmed turf over pale hardstanding, a cut lawn
  // terrace stepping down one flank, a concrete-lipped basin at the rim, clipped trees in groves.
  // ============================================================================
  class Era8Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x8B8471, shore: 0xCFC7B0, ground: 0xA9AE96, sea: 0x4E8480, trunk: 0x8A7C66,
        leaf: [0x6F8F76, 0x628069, 0x7C9A82],
        grass: [0x93AB93, 0x86A087, 0xA2B79E],
        reed: [0x9AA97E, 0x8A9970],
        stone: [0xC6C0AE, 0xD5CFBD, 0xB2AC9A],
        conc: 0xC9C2AE, concLt: 0xDCD5C0, concDk: 0xA9A290,
        lawn: 0x7FA089, lawnDk: 0x6C8D77, hard: 0xC4BDA8,
        water: 0x5C9A94, waterDk: 0x477E79, orange: 0xE08234,
      };
      return this._P;
    }
    get patchDefs() {
      return [[1.60, 0.42, 7.8, 0x86A78E], [4.35, 0.55, 8.8, 0xB8B7A0], [2.85, 0.72, 6.4, 0x7C9E86],
        [5.55, 0.48, 7.2, 0xAFB29B], [0.62, 0.68, 6.8, 0x8AAE93], [3.55, 0.30, 5.6, 0xC0BCA6],
        [0.05, 0.86, 5.2, 0x9FA98F], [2.20, 0.88, 5.8, 0xB5B49D]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 10], [3.6, 8]], boulders: [[0.75, 3], [2.4, 4], [4.8, 3]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(80801);
      // a graded terrace cut into one flank: two low concrete lips with clipped turf between
      for (const [rr, span, a0] of [[D.RP * 0.74, 1.0, 5.02], [D.RP * 0.88, 0.86, 5.02]]) {
        const n = Math.round(span * rr / 1.6);
        for (let i = 0; i < n; i++) {
          const a = a0 - span / 2 + (span * (i + 0.5)) / n, p = this.pt(a, rr);
          const L = span * rr / n + 0.1;
          this.box(g, T, L, 0.46, 0.7, this.mat(T, i % 3 ? P.conc : P.concLt), p[0], D.TOP + 0.23, p[1], -(a + Math.PI / 2));
        }
      }
      for (const [a, k, r] of [[5.02, 0.81, 5.0], [5.02, 0.64, 4.2]]) {
        const p = this.pt(a, D.RP * k);
        this.disc(g, T, r, 0.14, P.lawn, p[0], D.TOP + 0.04, p[1], 10, 0.44, -a);
      }
      // pale hardstanding worn through the turf where the ground was levelled
      for (const [a, k, r, sq] of [[1.35, 0.52, 6.6, 0.72], [0.35, 0.40, 4.6, 0.7]]) {
        const p = this.pt(a, D.RP * k);
        this.disc(g, T, r, 0.12, P.hard, p[0], D.TOP + 0.03, p[1], 11, sq, a);
      }
      // engineered basin at the rim: a concrete lip round a still sheet of water
      const b = this.pt(1.92, D.RP * 0.99);
      this.disc(g, T, 5.4, 0.16, P.concLt, b[0], D.RIM + 0.02, b[1], 12, 0.62, 1.92);
      this.disc(g, T, 4.4, 0.1, P.waterDk, b[0], D.RIM + 0.1, b[1], 12, 0.6, 1.92);
      this.disc(g, T, 3.4, 0.08, P.water, b[0], D.RIM + 0.14, b[1], 12, 0.58, 1.92);
      for (let i = -2; i <= 2; i++) {
        const p = this.pt(1.92 + i * 0.075, D.RP - 0.9);
        this.box(g, T, 1.5, 0.34, 0.7, this.mat(T, P.conc), p[0], D.TOP + 0.17, p[1], -(1.92 + Math.PI / 2));
      }
      // low kerb markers, the one place the era's orange shows
      for (const [a, k] of [[1.55, 0.99], [2.30, 0.99]]) {
        const p = this.pt(a, D.RP * k);
        this.post(g, T, p[0], this.terrY(p[0], p[1]), p[1], 0.66, 0.1, P.concLt, P.orange, 0.26);
      }
      // pale stone ledges breaking the turf on the high side
      for (const [a, k, w, d, ry] of [[3.30, 0.80, 6.4, 3.6, 1.5], [3.30, 0.80, 4.0, 2.4, 1.1]]) {
        const p = this.pt(a, D.RP * k);
        this.slab(g, T, w, 0.34, d, rnd() < 0.5 ? P.stone[0] : P.stone[1], p[0], D.TOP, p[1], ry);
      }
    }

    flora(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(80802);
      // three loose groves on the better ground, and a few standing on their own
      for (const [a, k, n, sp] of [[0.55, 0.72, 5, 3.4], [2.85, 0.62, 4, 3.0], [4.35, 0.78, 4, 3.2]]) {
        const c = this.pt(a, D.RP * k);
        for (let i = 0; i < n; i++) {
          const t = rnd() * TAU, r = rnd() * sp;
          this.on(g, T, c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r * 0.9,
            (s) => this.topiary(s, T, 0, 0, 0.78 + rnd() * 0.28));
        }
      }
      for (const [a, k] of [[1.35, 0.86], [3.55, 0.88], [5.60, 0.66], [1.95, 0.44]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s) => this.topiary(s, T, 0, 0, 0.86));
      }
      for (let i = 0; i < 12; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.4 + rnd() * 0.52));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.34 + rnd() * 0.24, P.leaf));
      }
    }

    ground(g, T) { super.ground(g, T, 210, 80803); }
  }

  // ============================================================================
  // ERA IX · INFORMATION — a levelled shelf of cool gray stone. Cropped turf, graded stone
  // beds, a squared retention basin at the rim, riprap edging, precisely spaced planting.
  // ============================================================================
  class Era9Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x5F666C, shore: 0x8E959B, ground: 0x7E8880, sea: 0x39585F, trunk: 0x5C5F5E,
        leaf: [0x4C6B58, 0x42604F, 0x577561],
        grass: [0x74887A, 0x6A7E71, 0x82958A],
        reed: [0x71856A, 0x63775E],
        stone: [0x9AA0A5, 0xAAB0B4, 0x848A8F],
        pad: 0x8E969A, padLt: 0xA2AAAE, padDk: 0x6E7679,
        steel: 0x6E767E, water: 0x2F6E72, waterLt: 0x3E8A88, grav: 0x9BA2A6,
      };
      return this._P;
    }
    get tuftRatio() { return 0.78; }
    get patchDefs() {
      return [[1.60, 0.42, 7.6, 0x74857C], [4.35, 0.55, 8.6, 0x8A9490], [2.85, 0.72, 6.2, 0x6C7D74],
        [5.55, 0.48, 7.0, 0x869089], [0.62, 0.68, 6.6, 0x788A80], [3.55, 0.30, 5.4, 0x929A94],
        [0.05, 0.86, 5.0, 0x707F77], [2.20, 0.88, 5.6, 0x8C9691]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 8]], boulders: [[0.75, 5], [2.4, 6], [3.2, 5], [4.0, 6], [4.8, 5], [5.6, 6]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(90901);
      // graded stone beds: the ground cut to level in three squared steps
      for (const [i, [w, d, h, c]] of [[13.0, 7.0, 0.34, P.padDk], [10.4, 5.4, 0.32, P.pad], [7.4, 3.8, 0.3, P.padLt]].entries()) {
        const p = this.pt(0.42, D.RP * 0.76);
        this.slab(g, T, w, h, d, c, p[0], D.TOP + i * 0.3, p[1], 0.42 + i * 0.05);
      }
      for (let i = 0; i < 9; i++) {
        const a = rnd() * TAU, r = 4.4 + rnd() * 3.0, p = this.pt(0.42, D.RP * 0.76);
        const x = p[0] + Math.cos(a) * r, z = p[1] + Math.sin(a) * r * 0.7;
        this.stone(g, T, 0.2 + rnd() * 0.34, x, this.terrY(x, z), z, this.pick(P.stone, rnd), rnd);
      }
      // gravel flats: bare compacted ground where the turf never took
      for (const [a, k, r, sq] of [[2.35, 0.52, 6.6, 0.66], [5.05, 0.46, 4.8, 0.7]]) {
        const p = this.pt(a, D.RP * k);
        this.disc(g, T, r, 0.12, P.grav, p[0], D.TOP + 0.03, p[1], 12, sq, a);
      }
      // retention basin at the rim: a squared cut with a stone lip and a still sheet
      const b = this.pt(4.62, D.RP * 0.97);
      this.pad(g, T, 12.0, 7.4, P.stone[2], b[0], b[1], -4.62, D.RIM + 0.02, 0.2);
      this.pad(g, T, 10.2, 5.8, P.water, b[0], b[1], -4.62, D.RIM + 0.1, 0.1);
      this.pad(g, T, 7.0, 3.4, P.waterLt, b[0], b[1], -4.62, D.RIM + 0.14, 0.08);
      // a straight cut drain feeding it, banked in stone
      this.pstrip(g, T, 4.62, D.RP * 0.34, 4.62, D.RP * 0.90, 2.4, P.stone[2], D.TOP - 0.02, 0.14);
      this.pstrip(g, T, 4.62, D.RP * 0.34, 4.62, D.RP * 0.90, 1.2, P.water, D.TOP + 0.06, 0.06);
      // riprap banked along one arc of the rim
      for (let i = 0; i < 34; i++) {
        const a = 1.9 + rnd() * 2.0, r = D.RP + 0.3 + rnd() * 2.2, p = this.pt(a, r);
        const m = this.box(g, T, 0.5 + rnd() * 0.45, 0.4 + rnd() * 0.35, 0.5 + rnd() * 0.45,
          this.mat(T, this.pick(P.stone, rnd)), p[0], D.RIM + 0.2, p[1], rnd() * TAU);
        m.rotation.z = (rnd() - 0.5) * 0.35;
      }
    }

    flora(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(90902);
      // clipped stock, but grouped: two stands of spires and a few loose clumps of round heads
      for (const [a, k, n] of [[1.78, 0.66, 5], [4.90, 0.72, 4]]) {
        const c = this.pt(a, D.RP * k);
        for (let i = 0; i < n; i++) {
          const t = rnd() * TAU, r = rnd() * 3.0;
          this.on(g, T, c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r * 0.85,
            (s) => this.spire(s, T, 0, 0, 0.48 + rnd() * 0.14, P.leaf));
        }
      }
      for (const [a, k, n] of [[3.30, 0.60, 4], [0.30, 0.86, 3], [5.90, 0.48, 3]]) {
        const c = this.pt(a, D.RP * k);
        for (let i = 0; i < n; i++) {
          const t = rnd() * TAU, r = rnd() * 2.8;
          this.on(g, T, c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r * 0.9,
            (s) => this.topiary(s, T, 0, 0, 0.7 + rnd() * 0.2));
        }
      }
      for (let i = 0; i < 14; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.42 + rnd() * 0.5));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.3 + rnd() * 0.22, P.leaf));
      }
    }

    ground(g, T) { super.ground(g, T, 200, 90903); }
  }

  // ============================================================================
  // ERA X · CYBERPUNK — reclaimed ground at night. Dark fill, standing water slicked with
  // colour, a broken block revetment at the rim, steam breaking out of a fissure.
  // ============================================================================
  class Era10Island extends IslandBase {
    get P() {
      if (!this._P) this._P = {
        keel: 0x24282E, shore: 0x333941, ground: 0x2E333B, sea: 0x141B24, trunk: 0x3A4048,
        leaf: [0x2F4A3E, 0x274038, 0x35544A],
        grass: [0x39474A, 0x31404200, 0x35474A],
        reed: [0x35474A, 0x2D3D40],
        stone: [0x3E444C, 0x4A515A, 0x343A41],
        conc: 0x3E454E, concDk: 0x2A2F37, metal: 0x565E69, metalDk: 0x424951,
        wet: 0x27303B, water: 0x1E3242, rust: 0x5A3A2E,
        cyan: 0x3AE6DC, mag: 0xE8479C, viol: 0x8A5CE8, amber: 0xE8A33C,
      };
      this._P.grass = [0x39474A, 0x314042, 0x35474A];
      return this._P;
    }
    get tuftRatio() { return 0.55; }
    get patchDefs() {
      return [[1.60, 0.42, 7.6, 0x333942], [4.35, 0.55, 8.6, 0x2A3038], [2.85, 0.72, 6.2, 0x363D46],
        [5.55, 0.48, 7.0, 0x2C323B], [0.62, 0.68, 6.6, 0x323944], [3.55, 0.30, 5.4, 0x272D35],
        [0.05, 0.86, 5.0, 0x353C45], [2.20, 0.88, 5.6, 0x2A3039]];
    }
    get shoreOpts() { return { reedBanks: [[1.15, 8], [3.6, 6]], boulders: [[0.75, 4], [2.4, 5], [4.0, 4], [5.6, 5]] }; }

    feature(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(101001);
      // standing water on the fill, with colour lying across it
      for (let i = 0; i < 10; i++) {
        const a = rnd() * TAU, r = D.RP * (0.22 + rnd() * 0.72), p = this.pt(a, r);
        this.disc(g, T, 2.2 + rnd() * 3.4, 0.1, P.wet, p[0], D.TOP + 0.02, p[1], 9, 0.55 + rnd() * 0.45, rnd() * TAU);
        if (rnd() < 0.75) {
          const c = this.pick([P.cyan, P.mag, P.viol, P.amber], rnd);
          const m = new T.Mesh(new T.BoxGeometry(0.4, 0.04, 2.4 + rnd() * 2.6), this.emat(T, c, 0.5));
          m.position.set(p[0], D.TOP + 0.14, p[1]); m.rotation.y = rnd() * TAU; g.add(m);
        }
      }
      // reclaimed ground: slabs of old concrete fill breaking the surface
      for (let i = 0; i < 13; i++) {
        const a = rnd() * TAU, r = D.RP * (0.28 + rnd() * 0.66), p = this.pt(a, r);
        const m = this.slab(g, T, 2.0 + rnd() * 3.0, 0.22 + rnd() * 0.2, 1.6 + rnd() * 2.2,
          rnd() < 0.5 ? P.conc : P.concDk, p[0], D.TOP, p[1], rnd() * TAU);
        m.rotation.z = (rnd() - 0.5) * 0.05;
      }
      // steam fissure: a dark crack in the fill with plumes coming off it
      const f = this.pt(2.68, D.RP * 0.60);
      this.disc(g, T, 5.6, 0.12, P.concDk, f[0], D.TOP + 0.02, f[1], 9, 0.34, 2.68);
      this.disc(g, T, 3.6, 0.1, 0x1B2028, f[0], D.TOP + 0.08, f[1], 9, 0.26, 2.68);
      for (const [d, s] of [[-2.4, 0.8], [2.2, 0.95]]) {
        const x = f[0] + Math.cos(2.68 + Math.PI / 2) * d, z = f[1] + Math.sin(2.68 + Math.PI / 2) * d;
        this.steam(g, T, x, D.TOP + 0.2, z, s);
      }
      const gl = new T.Mesh(new T.BoxGeometry(6.2, 0.04, 0.7), this.emat(T, P.amber, 0.4));
      gl.position.set(f[0], D.TOP + 0.14, f[1]); gl.rotation.y = -2.68; g.add(gl);
      // block revetment: broken concrete armour tipped along two arcs of the rim
      for (const [a0, a1] of [[0.30, 2.05], [3.45, 5.30]]) {
        const n = Math.round((a1 - a0) * D.RP / 2.6);
        for (let i = 0; i < n; i++) {
          const a = a0 + (a1 - a0) * ((i + 0.5) / n), p = this.pt(a, D.RP - 0.4 + (rnd() - 0.5) * 0.5);
          const b = this.box(g, T, 1.5 + rnd() * 0.4, 0.8 + rnd() * 0.3, 1.1, this.mat(T, rnd() < 0.5 ? P.conc : P.stone[2]),
            p[0], D.TOP + 0.36, p[1], -(a + Math.PI / 2) + (rnd() - 0.5) * 0.2);
          b.rotation.z = (rnd() - 0.5) * 0.14;
          if (i % 4 === 0) {
            const m = new T.Mesh(new T.BoxGeometry(0.34, 0.14, 0.34), this.emat(T, i % 12 ? P.amber : P.cyan));
            m.position.set(p[0], D.TOP + 0.82, p[1]); g.add(m);
          }
        }
      }
      // rusted debris on the fill
      for (let i = 0; i < 9; i++) {
        const a = rnd() * TAU, r = D.RP * (0.35 + rnd() * 0.58), p = this.pt(a, r);
        const b = this.box(g, T, 0.7 + rnd() * 0.7, 0.4 + rnd() * 0.3, 0.6 + rnd() * 0.5,
          this.mat(T, rnd() < 0.35 ? P.rust : P.metalDk), p[0], D.TOP + 0.22, p[1], rnd() * TAU);
        b.rotation.z = (rnd() - 0.5) * 0.3;
      }
    }

    steam(g, T, x, y, z, s) {
      const mtl = this.emat(T, 0xC6DDE4, 0.19);
      for (const [dx, dy, dz, r] of [[0, 0.5, 0, 0.85], [0.35, 1.5, 0.2, 1.2], [-0.3, 2.7, -0.25, 1.5], [0.25, 4.0, 0.3, 1.05]]) {
        const m = new T.Mesh(new T.IcosahedronGeometry(r * s, 1), mtl);
        m.position.set(x + dx * s, y + dy * s, z + dz * s); m.scale.set(1, 0.82, 1); g.add(m);
      }
    }

    ground(g, T) { super.ground(g, T, 190, 101003); }

    flora(g, T) {
      const D = this.D, P = this.P, rnd = this.rand(101002);
      for (let i = 0; i < 16; i++) {
        const p = this.pt(rnd() * TAU, D.RP * (0.3 + rnd() * 0.64));
        this.on(g, T, p[0], p[1], (s) => this.scrub(s, T, 0, 0, 0.32 + rnd() * 0.3, P.leaf));
      }
      for (const [a, k, s] of [[1.20, 0.72, 0.9], [3.90, 0.66, 0.85], [5.35, 0.80, 0.95], [0.55, 0.58, 0.8]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s2) => this.deadTree(s2, T, 0, 0, s, P.metalDk));
      }
      for (const [a, k] of [[2.20, 0.86], [4.60, 0.84], [0.15, 0.90]]) {
        const p = this.pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (s) => this.coppice(s, T, 0, 0, 0.5, P.leaf));
      }
    }
  }

  window.EraIslands = {
    3: Era3Island, 4: Era4Island, 5: Era5Island, 6: Era6Island, 7: Era7Island,
    8: Era8Island, 9: Era9Island, 10: Era10Island,
    meta: {
      2: { era: 'ERA II · NEOLITHIC', name: 'The Island', accent: '#9A4826', sky: ['#F6EDD8', '#EEE1C4', '#E0CFAB'],
        blurb: 'A blank slate. Open ground of packed earth and dry grass, a pale gravel shore, scrub and wind-cropped trees round the margins, reeds in the shallows.' },
      3: { era: 'ERA III · BRONZE', name: 'The Dry Headland', accent: '#8A5E31', sky: ['#F7EFD9', '#EFE3C2', '#DFCDA4'],
        blurb: 'Sun-bleached earth under olive and thorn. Dry-stone terracing steps down one flank, a copper-stained outcrop breaks the rock on another, and a salt pan crusts the rim.' },
      4: { era: 'ERA IV · CLASSICAL', name: 'The Promontory', accent: '#8E4123', sky: ['#F6F1E1', '#EDE6D0', '#DCD3B8'],
        blurb: 'Limestone beds break through thin turf and rise into a shelved knoll at the head. Cypress stands mark the high ground; a gravel cove notches the shore below.' },
      5: { era: 'ERA V · MEDIEVAL', name: 'The River Island', accent: '#7A4A2E', sky: ['#EFEEDC', '#E2E2CB', '#CFD1B4'],
        blurb: 'Green pasture divided by hedgerows, an oak wood banked on the wind side, a chalk bluff at the head, and a willow marsh where the stream comes out.' },
      6: { era: 'ERA VI · EARLY MODERN', name: 'The Estuary Island', accent: '#7E4433', sky: ['#F2F0E2', '#E6E4D2', '#D3D2BB'],
        blurb: 'Land under improvement: hedged strips, ridge and furrow turned across one quarter, a cut drain banked out to the water, a bedded sandstone ridge, tidal mud at the edge.' },
      7: { era: 'ERA VII · INDUSTRIAL', name: 'The Coalfield', accent: '#8C4033', sky: ['#EDEBE4', '#DEDDD5', '#C9C8C0'],
        blurb: 'Sooty turf over a coal seam cut open at the rim, spoil tipped beside it, a benched sandstone quarry face, a silted channel, and trees pollarded or dead.' },
      8: { era: 'ERA VIII · ATOMIC', name: 'The Graded Shelf', accent: '#C2662B', sky: ['#F4F1E4', '#E6EADF', '#CFDACE'],
        blurb: 'Trimmed turf over pale hardstanding, a cut terrace stepping down one flank, a concrete-lipped basin at the rim, and clipped trees standing in loose groves.' },
      9: { era: 'ERA IX · INFORMATION', name: 'The Levelled Shelf', accent: '#2E6E7A', sky: ['#EAEEF0', '#D7DEE3', '#BFCAD1'],
        blurb: 'Cool gray ground cut to level in squared stone beds, gravel flats where the turf never took, a squared retention basin fed by a straight drain, riprap along the rim.' },
      10: { era: 'ERA X · CYBERPUNK', name: 'The Reclaim', accent: '#C6398C', sky: ['#2C2536', '#1D1B28', '#101018'],
        blurb: 'Dark fill at night: standing water slicked with colour, old concrete broken through the surface, steam breaking out of a fissure, block armour tipped along the rim.' },
    },
  };
})();
