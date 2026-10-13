// ================= ERA II · the Neolithic Island =================
// The blank slate the era gets placed onto: land, shore, and what grows on it. Nothing built.
// Same house method as the era kits — one global class, canvas-free flat-toon materials
// (MeshToonMaterial + a 3-step gradientMap), no shadows, no specular, no gradients.
(function () {
  class Era2Island {
    // 13-sided plateau on a battered keel, a gravel rim, and a flat sea. RP is the plateau edge,
    // RS the shore rim, RK the keel. Every feature is set out in polar coords off these.
    get D() {
      if (!this._D) this._D = { N: 13, RP: 27.0, RS: 29.0, RK: 21.6, TOP: 0, RIM: -0.55, BEV: -1.42, WY: -1.15, ROT: Math.PI / 7 };
      return this._D;
    }
    get P() {
      if (!this._P) this._P = {
        keel: 0x6E5638, sand: 0xD9C79C, ground: 0xA88B57, sea: 0x5E8A88,
        timberDk: 0x5E4429,
        leaf: [0x66743E, 0x5A6A38, 0x74804A],
        grass: [0x94914F, 0x86844A, 0xA09A5C],
        reed: [0x8E8A55, 0x9E9A62, 0x7C7A4A],
        stone: [0x8E887C, 0x9F998C, 0x756F64],
      };
      return this._P;
    }

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

    box(g, T, w, h, d, mat, x, y, z, ry) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m;
    }
    cyl(g, T, rt, rb, h, mat, x, y, z, seg) {
      const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 12), mat); m.position.set(x, y, z); g.add(m); return m;
    }
    pole(g, T, r, h, x, y, z, col) { return this.cyl(g, T, r * 0.94, r, h, this.mat(T, col || this.P.timberDk), x, y + h / 2, z, 7); }
    stone(g, T, s, x, y, z) {
      const c = this.P.stone[(Math.random() * 3) | 0];
      const m = new T.Mesh(new T.DodecahedronGeometry(s, 0), this.mat(T, c));
      m.position.set(x, y + s * 0.4, z); m.scale.set(1, 0.62, 0.9);
      m.rotation.set(0.1, Math.random() * 6.28, 0.08); g.add(m); return m;
    }

    // the plateau is flat, the rim one step down, the beach one step below that — so anything
    // standing on the island only needs to know which of the three it is on
    terrY(x, z) { const D = this.D, r = Math.hypot(x, z); return r < D.RP - 0.3 ? D.TOP : (r < D.RS ? D.RIM : D.BEV); }
    on(g, T, x, z, fn) { const s = new T.Group(); s.position.set(x, this.terrY(x, z), z); fn(s); g.add(s); return s; }
    pt(a, r) { return [Math.cos(a) * r, Math.sin(a) * r]; }

    land(g, T) {
      const D = this.D, P = this.P;
      const deck = (rt, rb, h, c, yTop) => { const m = this.cyl(g, T, rt, rb, h, this.mat(T, c), 0, yTop - h / 2, 0, D.N); m.rotation.y = D.ROT; return m; };
      deck(D.RK + 6.8, D.RK, 9.6, P.keel, D.BEV + 0.1);
      deck(D.RS, D.RK + 6.75, 1.0, P.sand, D.RIM + 0.1);
      deck(D.RP, D.RP + 0.5, 0.68, P.ground, D.TOP);
      const sea = new T.Mesh(new T.CylinderGeometry(1, 0.94, 5.2, 72, 1), new T.MeshStandardMaterial({ color: P.sea, roughness: 0.24, metalness: 0.06 }));
      sea.scale.set(46, 1, 46); sea.position.y = D.WY - 2.6; g.add(sea);
    }

    tree(g, T, x, z, s) {
      this.pole(g, T, 0.26 * s, 2.0 * s, x, 0, z, this.P.timberDk);
      for (const [bx, by, bz, br] of [[0, 2.5, 0, 1.25], [0.9, 2.1, 0.3, 0.85], [-0.7, 2.2, -0.5, 0.8], [0.2, 3.05, -0.6, 0.7]]) {
        const m = new T.Mesh(new T.IcosahedronGeometry(br * s, 0), this.mat(T, this.P.leaf[(Math.random() * 3) | 0]));
        m.position.set(x + bx * s, by * s, z + bz * s); m.scale.set(1.15, 0.78, 1.0);
        m.rotation.set(Math.random(), Math.random() * 6.28, Math.random()); g.add(m);
      }
    }
    scrub(g, T, x, z, r) {
      const m = new T.Mesh(new T.IcosahedronGeometry(r, 0), this.mat(T, this.P.leaf[(Math.random() * 3) | 0]));
      m.position.set(x, r * 0.55, z); m.scale.set(1.12, 0.7, 1);
      m.rotation.set(Math.random(), Math.random() * 6.28, Math.random()); g.add(m); return m;
    }
    tuft(g, T, x, z, s) {
      for (let i = 0; i < 5; i++) {
        const m = new T.Mesh(new T.ConeGeometry(0.08 * s, (0.55 + Math.random() * 0.45) * s, 4), this.mat(T, this.P.grass[(Math.random() * 3) | 0]));
        m.position.set(x + (Math.random() - 0.5) * 0.66 * s, 0.24 * s, z + (Math.random() - 0.5) * 0.66 * s);
        m.rotation.z = (Math.random() - 0.5) * 0.65; m.rotation.x = (Math.random() - 0.5) * 0.55; g.add(m);
      }
    }
    reeds(g, T, x, y, z, r, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, rr = Math.random() * r, h = 1.3 + Math.random() * 1.1;
        const m = this.cyl(g, T, 0.035, 0.055, h, this.mat(T, this.P.reed[(Math.random() * 3) | 0]),
          x + Math.cos(a) * rr, y + h / 2 - 0.25, z + Math.sin(a) * rr, 4);
        m.rotation.z = (Math.random() - 0.5) * 0.5; m.rotation.x = (Math.random() - 0.5) * 0.4;
      }
    }

    shore(g, T) {
      const D = this.D, rnd = this.rand(551213);
      for (let i = 0; i < 150; i++) {
        const p = this.pt(rnd() * 6.283, D.RP - 0.5 + rnd() * (D.RS - D.RP + 0.9));
        const r = Math.hypot(p[0], p[1]);
        this.stone(g, T, 0.1 + rnd() * 0.17, p[0], (r > D.RS - 0.2 ? D.BEV + 0.2 : D.RIM) - 0.04, p[1]);
      }
      for (const [a, n] of [[0.75, 4], [2.4, 5], [3.2, 4], [4.0, 5], [4.8, 4], [5.6, 5]])
        for (let k = 0; k < n; k++) {
          const p = this.pt(a + (rnd() - 0.5) * 0.26, D.RP + 0.3 + rnd() * 2.0);
          this.stone(g, T, 0.5 + rnd() * 0.7, p[0], D.RIM + 0.1, p[1]);
        }
      for (const [a, n] of [[1.15, 22], [2.75, 18], [3.6, 20], [5.1, 16], [6.0, 14]]) {
        const p = this.pt(a, D.RS + 0.7);
        this.reeds(g, T, p[0], D.WY - 0.15, p[1], 2.1, n);
      }
    }

    // patches of drier and greener grazing, laid flat into the ground. Without them the plateau is
    // one unbroken brown plate at diorama distance, because the tufts on it are too small to read.
    patches(g, T) {
      const D = this.D, rnd = this.rand(20260804);
      for (const [a, k, rr, c] of [
        [1.60, 0.42, 7.4, 0x9C8250], [4.35, 0.55, 8.6, 0xB39463], [2.85, 0.72, 6.2, 0x93894E],
        [5.55, 0.48, 7.0, 0xB1935F], [0.62, 0.68, 6.6, 0x9A8A52], [3.55, 0.30, 5.4, 0xB0955F],
        [0.05, 0.86, 5.0, 0x8F8449], [2.20, 0.88, 5.6, 0xAE9260],
      ]) {
        const p = this.pt(a, D.RP * k);
        const m = this.cyl(g, T, rr, rr * (0.86 + rnd() * 0.2), 0.14, this.mat(T, c), p[0], D.TOP + 0.02, p[1], 7 + ((rnd() * 3) | 0));
        m.rotation.y = rnd() * 6.283; m.scale.set(1, 1, 0.7 + rnd() * 0.5);
      }
    }

    build(T) {
      const g = new T.Group(), D = this.D, pt = (a, r) => this.pt(a, r), rnd = this.rand(31337);
      this.land(g, T);
      this.patches(g, T);
      for (const [a, k, s] of [[2.62, 0.90, 1.05], [3.05, 0.93, 0.9], [3.52, 0.90, 1.15], [4.30, 0.92, 0.95],
        [2.20, 0.94, 0.85], [1.05, 0.94, 0.9], [4.55, 0.86, 0.8], [5.60, 0.91, 1.0],
        [0.42, 0.93, 0.88], [1.78, 0.88, 1.1], [3.85, 0.94, 0.82]]) {
        const p = pt(a, D.RP * k);
        this.on(g, T, p[0], p[1], (sub) => this.tree(sub, T, 0, 0, s));
      }
      for (let i = 0; i < 26; i++) {
        const p = pt(rnd() * 6.283, D.RP * (0.72 + rnd() * 0.22));
        this.on(g, T, p[0], p[1], (sub) => this.scrub(sub, T, 0, 0, 0.5 + rnd() * 0.35));
      }
      for (let i = 0; i < 430; i++) {
        const p = pt(rnd() * 6.283, D.RP * Math.sqrt(0.03 + rnd() * 0.93) * 0.96);
        this.on(g, T, p[0], p[1], (sub) => { if (rnd() < 0.84) this.tuft(sub, T, 0, 0, 1.0 + rnd() * 0.7); else this.stone(sub, T, 0.14 + rnd() * 0.24, 0, 0, 0); });
      }
      this.shore(g, T);
      return g;
    }
  }
  window.Era2Island = Era2Island;
})();
