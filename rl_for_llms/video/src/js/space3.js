/*
 * MV3: 3D surfaces, paths, points, arrows and labels for the MV engine.
 * Loaded after engine.js; exposes window.MV3.
 *
 *   const sp = new MV3.Space3({ unit: 50, phi: 60, theta: -70, zoom: 1 }).at(-300, 0);
 *   const J  = new MV3.Surface3((u, v, p) => [u, v, p.h * f(u, v)], { u: [-7, 7], v: [-7, 7], res: [36, 36],
 *                color: (uc, vc, p, z) => ramp(z), props: { h: 0 } });
 *   sp.add(J, new MV3.Dot3([0.9, 0.5, 0]), new MV3.Label3('sure of 51', [5, -4, 1.2]));
 *   S.add(sp);  ...  A.Set(sp, { phi: 0, theta: -90, zoom: 2 }, 2), A.Set(J, { h: 1 }, 3)
 *
 * The space is an ordinary mobject: its camera lives in its props (phi, the
 * angle down from straight overhead; theta, the turn around the vertical;
 * zoom; the point looked at, cx cy cz; persp, a camera distance in world
 * units for a mild perspective, 0 for orthographic), so A.Set animates the
 * camera like any other prop, and x, y, s, o place and fade the whole picture.
 * The children are mobjects too: their props (a surface's morph h, a free
 * parameter such as beta, a path's draw, a dot's position) are animated the
 * same way.
 *
 * Drawing: every surface face of every surface in the space is projected and
 * sorted far-to-near (the painter's algorithm), into one pool of reused SVG
 * paths; then paths, arrows, dots and labels are drawn on top, in the order
 * they were added. Everything is a pure function of the props at render time,
 * so scrubbing and frame-exact export need no special cases. When neither
 * the camera nor any surface changed since the last frame, the faces are not
 * touched at all.
 *
 * World axes: x to the right, y away from the viewer, z up (right-handed).
 * phi = 0 looks straight down; theta = -90 puts x to the right on screen.
 */
const MV3 = (() => {
  'use strict';
  const { Mob, Text, Tex, el, mix, clamp01, C, strokeOf } = MV;
  const RAD = Math.PI / 180;
  const f1 = (x) => (Math.round(x * 10) / 10).toString();

  /* ---------- colour: hex <-> rgb, ramps, shading ---------- */
  const rgbCache = new Map();
  function rgbOf(hex) {
    let c = rgbCache.get(hex);
    if (!c) {
      const h = hex.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
      c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      rgbCache.set(hex, c);
    }
    return c;
  }
  const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  const toHex = (r, g, b) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  /*
   * A colour ramp: ramp([c0, c1, c2 ...], lo, hi)(value) -> hex, piecewise
   * linear between equally spaced stops, clamped at both ends.
   */
  function ramp(stops, lo = 0, hi = 1) {
    const rgb = stops.map(rgbOf);
    const n = rgb.length - 1;
    return (v) => {
      const t = clamp01((v - lo) / (hi - lo || 1)) * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      const a = rgb[i];
      const b = rgb[i + 1];
      return toHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    };
  }
  function shadeHex(hex, k) {
    const [r, g, b] = rgbOf(hex);
    return toHex(r * k, g * k, b * k);
  }

  /* ---------- the camera ---------- */
  // returns project(x, y, z) -> [screen x, screen y, depth (larger = nearer)]
  function camera(p, unit) {
    const ph = p.phi * RAD;
    const th = p.theta * RAD;
    const sp = Math.sin(ph);
    const cp = Math.cos(ph);
    const st = Math.sin(th);
    const ct = Math.cos(th);
    const k = unit * p.zoom;
    const D = p.persp > 0 ? p.persp : 0;
    const { cx, cy, cz } = p;
    // right = (-st, ct, 0); up = (-cp ct, -cp st, sp); toward the eye = (sp ct, sp st, cp)
    return (x, y, z) => {
      const X = x - cx;
      const Y = y - cy;
      const Z = z - cz;
      const rx = -st * X + ct * Y;
      const uy = -cp * ct * X - cp * st * Y + sp * Z;
      const d = sp * ct * X + sp * st * Y + cp * Z;
      const f = D ? D / Math.max(D * 0.2, D - d) : 1;
      return [k * f * rx, -k * f * uy, d];
    };
  }

  /* =========================================================== Space3 */
  let clipIds = 0;
  class Space3 extends Mob {
    /*
     * window: [w, h] in screen px, centred on the space's origin. While the
     * prop `win` is 1, everything in the space is clipped to that rounded
     * rectangle (a map seen through a frame, when the camera zooms in).
     */
    constructor({ unit = 60, phi = 60, theta = -70, zoom = 1, cx = 0, cy = 0, cz = 0, persp = 0, light = [-0.35, -0.55, 1], window: win = null } = {}) {
      super();
      this.unit = unit;
      this.inner = el('g');
      this.underG = el('g');
      this.faceG = el('g');
      this.topG = el('g');
      this.el.appendChild(this.inner);
      this.inner.appendChild(this.underG);
      this.inner.appendChild(this.faceG);
      this.inner.appendChild(this.topG);
      if (win) {
        this.clipId = `mv3clip${clipIds++}`;
        this.win = win;
        const cp = el('clipPath', { id: this.clipId });
        this.clipRect = el('rect', { x: -win[0] / 2, y: -win[1] / 2, width: win[0], height: win[1], rx: 18 });
        cp.appendChild(this.clipRect);
        this.el.appendChild(cp);
      }
      this.pool = [];
      this.surfaces = [];
      const n = Math.hypot(...light) || 1;
      this.light = light.map((x) => x / n);
      Object.assign(this.init, { phi, theta, zoom, cx, cy, cz, persp, win: 0 });
      this.proj = camera(this.init, unit);
    }
    // a world point -> [x, y] on the stage, with the camera and placement of the current frame
    screen(x, y, z) {
      const q = this.proj(x, y, z);
      const p = this.p;
      return [p.x + p.s * q[0], p.y + p.s * q[1]];
    }
    // children: Surface3 faces go to the shared, depth-sorted pool; the rest
    // draw on top of every face, except those marked `under` (a floor grid)
    add(...mobs) {
      for (const m of mobs.flat()) {
        this.kids.push(m);
        m.space = this;
        if (m instanceof Surface3) this.surfaces.push(m);
        else (m.under ? this.underG : this.topG).appendChild(m.el);
      }
      return this;
    }
    // project a world point with the camera of the current frame
    project(x, y, z) {
      return this.proj(x, y, z);
    }
    draw(p) {
      this.proj = camera(p, this.unit);
      if (this.clipId) {
        // win 0: no clip; win 1: the window; in between, a frame closing in from far outside
        const k = clamp01(p.win);
        const wk = k > 0.001 ? k.toFixed(3) : '';
        if (wk !== this.last.win) {
          if (wk) {
            const [w, h] = this.win;
            const W = w + (4000 - w) * (1 - k) * (1 - k);
            const Hh = h + (3000 - h) * (1 - k) * (1 - k);
            const r = this.clipRect;
            r.setAttribute('x', f1(-W / 2));
            r.setAttribute('y', f1(-Hh / 2));
            r.setAttribute('width', f1(W));
            r.setAttribute('height', f1(Hh));
            this.inner.setAttribute('clip-path', `url(#${this.clipId})`);
          } else this.inner.removeAttribute('clip-path');
          this.last.win = wk;
        }
      }
      const camKey = `${p.phi}|${p.theta}|${p.zoom}|${p.cx}|${p.cy}|${p.cz}|${p.persp}`;
      let key = camKey;
      for (const s of this.surfaces) key += `#${s.key()}`;
      if (key === this.last.faces) return;
      this.last.faces = key;
      this.drawFaces();
    }
    drawFaces() {
      // gather every visible face of every surface, with its depth
      const items = [];
      for (const s of this.surfaces) {
        const sp = s.p;
        const op = clamp01(sp.o) * sp.fo;
        if (op < 0.002) continue;
        const g = s.geometry();
        const nv = g.nv;
        const pts = new Float64Array(g.xyz.length);
        for (let i = 0; i < g.xyz.length; i += 3) {
          const q = this.proj(g.xyz[i], g.xyz[i + 1], g.xyz[i + 2]);
          pts[i] = q[0];
          pts[i + 1] = q[1];
          pts[i + 2] = q[2];
        }
        for (let f = 0; f < g.faces.length; f++) {
          const fc = g.faces[f];
          if (!fc.fill) continue;
          const i = fc.i;
          const j = fc.j;
          const a = (i * (nv + 1) + j) * 3;
          const b = ((i + 1) * (nv + 1) + j) * 3;
          const c = ((i + 1) * (nv + 1) + j + 1) * 3;
          const d = (i * (nv + 1) + j + 1) * 3;
          const depth = (pts[a + 2] + pts[b + 2] + pts[c + 2] + pts[d + 2]) / 4 + s.bias;
          items.push({
            depth,
            d: `M${f1(pts[a])} ${f1(pts[a + 1])}L${f1(pts[b])} ${f1(pts[b + 1])}L${f1(pts[c])} ${f1(pts[c + 1])}L${f1(pts[d])} ${f1(pts[d + 1])}Z`,
            fill: fc.fill,
            op: op * (fc.op ?? 1),
            stroke: s.opts.stroke,
            so: s.opts.strokeOpacity * clamp01(sp.o) * Math.min(1, sp.fo / 0.6),
          });
        }
      }
      items.sort((x, y) => x.depth - y.depth);
      while (this.pool.length < items.length) {
        const e = el('path', { 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-width': 1 });
        e._c = {};
        this.faceG.appendChild(e);
        this.pool.push(e);
      }
      for (let k = 0; k < this.pool.length; k++) {
        const e = this.pool[k];
        const c = e._c;
        const it = items[k];
        if (!it) {
          if (c.d !== '') {
            e.setAttribute('d', '');
            c.d = '';
          }
          continue;
        }
        if (c.d !== it.d) e.setAttribute('d', (c.d = it.d));
        if (c.fill !== it.fill) e.setAttribute('fill', (c.fill = it.fill));
        const o = it.op.toFixed(3);
        if (c.o !== o) e.setAttribute('fill-opacity', (c.o = o));
        if (c.stroke !== it.stroke) e.setAttribute('stroke', (c.stroke = it.stroke));
        // the mesh is faint texture, not a mark to follow (kept under half opacity)
        const so = Math.min(0.45, it.so).toFixed(3);
        if (c.so !== so) {
          e.style.strokeOpacity = so;
          c.so = so;
        }
      }
    }
  }

  /* =========================================================== Surface3 */
  /*
   * A parametric surface f(u, v, p) -> [x, y, z] over u in [u0, u1], v in
   * [v0, v1], cut into res[0] x res[1] faces. p holds the surface's props
   * (o, fo = fill opacity, h, and any you pass in `props`), so animating them
   * re-shapes the surface. Each face gets the colour color(uc, vc, p, zc) of
   * its parameter centre (zc: the height of its centre), shaded by a fixed
   * light; return null to leave a face out, or [colour, opacity] to make one
   * face fainter than the rest.
   */
  class Surface3 extends Mob {
    constructor(f, { u = [0, 1], v = [0, 1], res = [24, 24], color = () => C.BLUE, opacity = 0.9, stroke = C.BG, strokeOpacity = 0.35, shade = 0.3, bias = 0, props = {} } = {}) {
      super();
      this.f = f;
      this.ur = u;
      this.vr = v;
      this.nu = res[0];
      this.nv = res[1];
      this.color = color;
      this.shade = shade;
      this.bias = bias;
      this.opts = { stroke, strokeOpacity };
      Object.assign(this.init, { fo: opacity, h: 1 }, props);
      this.geoKey = null;
      this.geo = null;
    }
    // everything but the screen placement shapes the faces
    key() {
      const p = this.p;
      let k = '';
      for (const name in p) if (name !== 'x' && name !== 'y' && name !== 's' && name !== 'r') k += `${p[name]},`;
      return k;
    }
    geometry() {
      const p = this.p;
      let k = '';
      for (const name in p) if (name !== 'x' && name !== 'y' && name !== 's' && name !== 'r' && name !== 'o' && name !== 'fo') k += `${p[name]},`;
      if (k === this.geoKey) return this.geo;
      const { nu, nv } = this;
      const [u0, u1] = this.ur;
      const [v0, v1] = this.vr;
      const xyz = new Float64Array((nu + 1) * (nv + 1) * 3);
      for (let i = 0; i <= nu; i++) {
        const u = u0 + ((u1 - u0) * i) / nu;
        for (let j = 0; j <= nv; j++) {
          const v = v0 + ((v1 - v0) * j) / nv;
          const q = this.f(u, v, p);
          const o = (i * (nv + 1) + j) * 3;
          xyz[o] = q[0];
          xyz[o + 1] = q[1];
          xyz[o + 2] = q[2];
        }
      }
      const L = this.space ? this.space.light : [0, 0, 1];
      const faces = [];
      for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
          const a = (i * (nv + 1) + j) * 3;
          const b = ((i + 1) * (nv + 1) + j) * 3;
          const c = ((i + 1) * (nv + 1) + j + 1) * 3;
          const d = (i * (nv + 1) + j + 1) * 3;
          const zc = (xyz[a + 2] + xyz[b + 2] + xyz[c + 2] + xyz[d + 2]) / 4;
          const uc = u0 + ((u1 - u0) * (i + 0.5)) / nu;
          const vc = v0 + ((v1 - v0) * (j + 0.5)) / nv;
          let col = this.color(uc, vc, p, zc);
          // a colour, or [colour, opacity] for a face that is fainter than the rest
          let fop = 1;
          if (Array.isArray(col)) {
            fop = col[1];
            col = col[0];
          }
          if (col && this.shade > 0) {
            // normal from the diagonals; two-sided Lambert light
            const e1 = [xyz[c] - xyz[a], xyz[c + 1] - xyz[a + 1], xyz[c + 2] - xyz[a + 2]];
            const e2 = [xyz[d] - xyz[b], xyz[d + 1] - xyz[b + 1], xyz[d + 2] - xyz[b + 2]];
            const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
            const len = Math.hypot(n[0], n[1], n[2]);
            const lam = len > 1e-12 ? Math.abs(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len : 1;
            col = shadeHex(col, 1 - this.shade + this.shade * lam);
          }
          faces.push({ i, j, fill: col, op: fop });
        }
      }
      this.geo = { xyz, faces, nv };
      this.geoKey = k;
      return this.geo;
    }
  }

  /* =========================================================== Path3 */
  /*
   * A polyline through 3D points: a fixed array [[x, y, z], ...] or a
   * function of the path's props, pts(p). Props: draw (0..1, for A.Create),
   * stroke, sw, and anything in `props`.
   */
  class Path3 extends Mob {
    constructor(pts, { color = C.WHITE, width = 5, dash = null, closed = false, fill = 'none', fillOpacity = 0.2, opacity = 1, under = false, props = {} } = {}) {
      super();
      this.under = under;
      this.pts = pts;
      this.sop = opacity;
      this.closed = closed;
      this.dash = dash;
      this.s = el('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', pathLength: 1 });
      this.el.appendChild(this.s);
      Object.assign(this.init, { draw: 1, stroke: color, sw: strokeOf(width), fill, ffo: fill === 'none' ? 0 : fillOpacity }, props);
    }
    draw(p) {
      if (!this.space) return;
      const pts = typeof this.pts === 'function' ? this.pts(p) : this.pts;
      let d = '';
      let L = 0;
      let prev = null;
      for (let i = 0; i < pts.length; i++) {
        const q = this.space.project(pts[i][0], pts[i][1], pts[i][2]);
        d += `${i ? 'L' : 'M'}${f1(q[0])} ${f1(q[1])}`;
        if (prev) L += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        prev = q;
      }
      if (this.closed && pts.length) d += 'Z';
      const s = this.s;
      if (d !== this.last.d) {
        s.setAttribute('d', d || 'M0 0');
        this.last.d = d;
      }
      const key = `${p.draw}|${p.stroke}|${p.sw}|${p.fill}|${p.ffo}|${Math.round(L)}`;
      if (key === this.last.key) return;
      this.last.key = key;
      s.setAttribute('stroke', p.stroke);
      s.setAttribute('stroke-width', p.sw);
      s.setAttribute('fill', p.fill === 'none' ? 'none' : p.fill);
      s.setAttribute('fill-opacity', (p.ffo * clamp01((p.draw - 0.6) / 0.4)).toFixed(3));
      if (this.dash && p.draw >= 1 && L > 0) s.style.strokeDasharray = this.dash.split(/[\s,]+/).map((x) => (Number(x) / L).toFixed(5)).join(' ');
      else s.style.strokeDasharray = p.draw >= 1 ? 'none' : `${clamp01(p.draw).toFixed(4)} 2`;
      s.style.strokeOpacity = p.draw <= 0 ? 0 : this.sop;
    }
  }

  /* =========================================================== Dot3 */
  // a dot at a 3D point: [x, y, z], or at(p) -> [x, y, z]; props px py pz r color
  class Dot3 extends Mob {
    constructor(at, { r = 10, color = C.WHITE, ring = null, props = {} } = {}) {
      super();
      this.at3 = typeof at === 'function' ? at : null;
      const [px, py, pz] = typeof at === 'function' ? [0, 0, 0] : at;
      this.c = el('circle', { cx: 0, cy: 0 });
      this.el.appendChild(this.c);
      this.ring = ring;
      if (ring) this.c.setAttribute('stroke', ring);
      Object.assign(this.init, { px, py, pz, rad: r, color }, props);
    }
    where(p) {
      return this.at3 ? this.at3(p) : [p.px, p.py, p.pz];
    }
    draw(p) {
      if (!this.space) return;
      const w = this.where(p);
      const q = this.space.project(w[0], w[1], w[2]);
      const key = `${f1(q[0])}|${f1(q[1])}|${p.rad}|${p.color}`;
      if (key === this.last.k3) return;
      this.last.k3 = key;
      this.c.setAttribute('cx', f1(q[0]));
      this.c.setAttribute('cy', f1(q[1]));
      this.c.setAttribute('r', f1(p.rad));
      this.c.setAttribute('fill', p.color);
      if (this.ring) this.c.setAttribute('stroke-width', 4);
    }
  }

  /* =========================================================== Arrow3 */
  /*
   * An arrow from a to b in 3D, drawn flat on the screen after projection.
   * a, b: [x, y, z], or ends(p) -> [[ax, ay, az], [bx, by, bz]]. Props: ax ay
   * az bx by bz (when fixed), draw (0..1, for A.Arrow), color, sw.
   */
  class Arrow3 extends Mob {
    constructor(a, b, { color = C.WHITE, width = 6, head = 22, props = {} } = {}) {
      super();
      this.ends = typeof a === 'function' ? a : null;
      const A0 = this.ends ? [0, 0, 0] : a;
      const B0 = this.ends ? [0, 0, 0] : b;
      this.line = el('line', { 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
      this.head = el('polygon', {});
      this.el.appendChild(this.line);
      this.el.appendChild(this.head);
      this.hs = Math.max(head, strokeOf(width) * 3.4);
      Object.assign(this.init, { ax: A0[0], ay: A0[1], az: A0[2], bx: B0[0], by: B0[1], bz: B0[2], draw: 1, color, sw: strokeOf(width) }, props);
    }
    draw(p) {
      if (!this.space) return;
      const [a, b] = this.ends ? this.ends(p) : [[p.ax, p.ay, p.az], [p.bx, p.by, p.bz]];
      const A1 = this.space.project(a[0], a[1], a[2]);
      const B1 = this.space.project(b[0], b[1], b[2]);
      const dx = B1[0] - A1[0];
      const dy = B1[1] - A1[1];
      const len = Math.hypot(dx, dy);
      const show = len > 2 && p.draw > 0.02;
      const key = `${f1(A1[0])},${f1(A1[1])},${f1(B1[0])},${f1(B1[1])},${p.draw},${p.color},${p.sw}`;
      if (key === this.last.k3) return;
      this.last.k3 = key;
      if (!show) {
        this.line.setAttribute('stroke-opacity', 0);
        this.head.setAttribute('opacity', 0);
        return;
      }
      const ux = dx / len;
      const uy = dy / len;
      const L = len * clamp01(p.draw);
      const tipX = A1[0] + ux * L;
      const tipY = A1[1] + uy * L;
      // a short arrow gets a smaller head, so it never overshoots its start
      const h = Math.min(this.hs, len * 0.45);
      this.line.setAttribute('x1', f1(A1[0]));
      this.line.setAttribute('y1', f1(A1[1]));
      this.line.setAttribute('x2', f1(tipX - ux * h * 0.6));
      this.line.setAttribute('y2', f1(tipY - uy * h * 0.6));
      this.line.setAttribute('stroke', p.color);
      this.line.setAttribute('stroke-width', p.sw);
      this.line.setAttribute('stroke-opacity', L > h * 0.7 ? 1 : 0);
      const pts = [
        [tipX, tipY],
        [tipX - ux * h - uy * h * 0.45, tipY - uy * h + ux * h * 0.45],
        [tipX - ux * h + uy * h * 0.45, tipY - uy * h - ux * h * 0.45],
      ];
      this.head.setAttribute('points', pts.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' '));
      this.head.setAttribute('fill', p.color);
      this.head.setAttribute('opacity', 1);
    }
  }

  /* =========================================================== Label3 */
  /*
   * Text or TeX pinned to a 3D point and drawn upright, facing the viewer.
   *   new Label3('sure of 51', [5, -4, 1.2], { size: 34, color })
   *   new Label3(texMob, [x, y, z])          any mobject works as the content
   *   new Label3('β', (p) => [x, y, z])      a point that moves with the props
   * Props: px py pz (the point), dx dy (a screen offset in px). bg: a dark
   * card behind the content, so it stays readable over a surface.
   */
  class Label3 extends Mob {
    constructor(content, at, { size = 34, color = C.WHITE, tex = false, bg = 0.72, anchor = 'middle', italic = false, props = {} } = {}) {
      super();
      this.at3 = typeof at === 'function' ? at : null;
      const [px, py, pz] = typeof at === 'function' ? [0, 0, 0] : at;
      this.mob = typeof content === 'string' ? (tex ? new Tex(content, { size, color }) : new Text(content, { size, color, anchor, italic })) : content;
      this.anchor = anchor;
      this.card = bg ? el('rect', { fill: C.BG, 'fill-opacity': bg, rx: 8 }) : null;
      if (this.card) this.el.appendChild(this.card);
      this.add(this.mob);
      Object.assign(this.init, { px, py, pz, dx: 0, dy: 0 }, props);
    }
    where(p) {
      return this.at3 ? this.at3(p) : [p.px, p.py, p.pz];
    }
    draw(p) {
      if (!this.space) return;
      const w = this.where(p);
      const q = this.space.project(w[0], w[1], w[2]);
      this.mob.p.x = this.mob.init.x + q[0] + p.dx;
      this.mob.p.y = this.mob.init.y + q[1] + p.dy;
      if (this.card) {
        if (!this.box) {
          // measured once the content is laid out
          let w0 = this.mob.w;
          let h0 = this.mob.h;
          if (w0 === undefined && this.mob.t) {
            if (!this.mob.spans) {
              this.mob.build(String(this.mob.init.str));
              this.mob.last.str = this.mob.init.str;
            }
            w0 = this.mob.width();
            h0 = this.mob.size * 1.1;
          }
          if (w0 > 0) this.box = { w: w0 + 22, h: h0 + 12 };
        }
        if (this.box) {
          const sh = this.anchor === 'start' ? this.box.w / 2 - 11 : this.anchor === 'end' ? -this.box.w / 2 + 11 : 0;
          const k = `${f1(this.mob.p.x)},${f1(this.mob.p.y)}`;
          if (k !== this.last.ck) {
            this.card.setAttribute('x', f1(this.mob.p.x + sh - this.box.w / 2));
            this.card.setAttribute('y', f1(this.mob.p.y - this.box.h / 2));
            this.card.setAttribute('width', f1(this.box.w));
            this.card.setAttribute('height', f1(this.box.h));
            this.last.ck = k;
          }
        }
      }
    }
  }

  /* =========================================================== helpers */
  // a flat grid of lines on the plane z = z0 (faint texture, drawn under the faces), as Path3s
  function grid({ x = [-1, 1], y = [-1, 1], step = 1, z = 0, color = C.GREY, width = 2, opacity = 0.3 } = {}) {
    const out = [];
    const xs = [];
    const ys = [];
    for (let v = x[0]; v <= x[1] + 1e-9; v += step) xs.push(v);
    for (let v = y[0]; v <= y[1] + 1e-9; v += step) ys.push(v);
    for (const v of xs) out.push(new Path3([[v, y[0], z], [v, y[1], z]], { color, width, opacity }));
    for (const v of ys) out.push(new Path3([[x[0], v, z], [x[1], v, z]], { color, width, opacity }));
    out.forEach((pth) => (pth.under = true));
    return out;
  }

  return { Space3, Surface3, Path3, Dot3, Arrow3, Label3, camera, ramp, shadeHex, rgbOf, grid };
})();
if (typeof window === 'object') window.MV3 = MV3;
