/*
 * MV — a small Manim-style animation engine for the browser.
 *
 * Domain model
 *   Video   = ordered Chapters; each Chapter = ordered Scenes.
 *   Scene   = mobjects + Beats. A Beat is one narration line plus the
 *             animations that play while it is spoken.
 *   Mob     = a drawable object (Tex, Text, Shape, Creature, Group …)
 *             with plain numeric props (x, y, s, o, write, draw, …).
 *   Anim    = a function of progress alpha in [0, 1] that edits props.
 *
 * Rendering rule: a frame is a pure function of time. render(t) resets
 * every prop to its initial value, then re-applies every animation that
 * has started, in start order, with alpha = clamp((t - start) / dur).
 * So seeking, scrubbing and frame-exact export need no special cases.
 */
const MV = (() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  /*
   * Inks on paper. The film is a field notebook: ink and watercolour on
   * graph paper. No pure black or white anywhere. The names are colour
   * roles kept from the first cut, so every scene keeps working:
   *   WHITE  is now the main ink (the colour of plain text and lines)
   *   GREY_B is sepia (secondary text), GREY is pencil, GREY_D/E are washes.
   * Hues are riso-like inks chosen to read on paper at small sizes.
   */
  const INK = '#2A241E';
  const PAPER = '#F2E8D2';
  const C = Object.freeze({
    BLUE: '#2F4F96', TEAL: '#00777E', GREEN: '#3D7A35', YELLOW: '#A86B00', GOLD: '#C2571A',
    RED: '#C93A26', MAROON: '#93364F', PURPLE: '#62428A', PINK: '#D23C8A', ORANGE: '#D9651A',
    GREY: '#8A7F70', GREY_B: '#6A5D4E', GREY_D: '#D9CDB4', GREY_E: '#E6DCC6', WHITE: INK, BG: PAPER,
    INK, PAPER, SEPIA: '#6A5D4E', PENCIL: '#8A7F70', SHEET: '#FAF4E6',
  });
  const BASE_COLORS = Object.freeze({ A: C.GREEN, C: C.BLUE, G: C.YELLOW, T: C.RED });
  /*
   * Type roles (all OFL fonts, inlined by tools/build.mjs):
   *   serif  Fraunces            body labels, quotes        (default)
   *   hero   Instrument Serif    headlines and titles
   *   hand   Shantell Sans       marginalia, small coloured notes, bubbles
   *   script Caveat              real handwriting (Darwin, page numbers)
   *   mono   IBM Plex Mono       DNA, numbers, file names
   * KaTeX_Main stays in every stack as the fallback for Greek and maths signs.
   */
  const FONT_CM = "KaTeX_Main, 'Latin Modern Roman', Georgia, serif";
  const FONTS = Object.freeze({
    serif: "Fraunces, KaTeX_Main, Georgia, serif",
    hero: "'Instrument Serif', Fraunces, KaTeX_Main, Georgia, serif",
    hand: "'Shantell Sans', Fraunces, KaTeX_Main, sans-serif",
    script: "Caveat, 'Shantell Sans', KaTeX_Main, cursive",
    mono: "'IBM Plex Mono', KaTeX_Main, ui-monospace, monospace",
    tex: FONT_CM,
  });
  const FONT_MONO = FONTS.mono;

  /*
   * Design tokens, in 1080p units. The web player shows the 1920-wide frame
   * at roughly 1/2 (desktop) to 1/5 (phone) scale, so a 2 px line or a 22 px
   * label simply disappears. Every stroke and every text size passes through
   * these rules; tools/lint-layout.mjs measures the rendered frames against
   * the same numbers.
   *   stroke: fine structure (axes, frames, connectors) 4-5, marks people
   *           should follow (curves, branches, arrows) 6-7.
   *   type:   nothing below 30; labels 34, body 40, scene titles 54.
   *   safe:   60 px side margin; pictures end above the caption band.
   */
  const STYLE = Object.freeze({
    stroke: Object.freeze({ min: 4, fine: 4.5, line: 5.5, mark: 6.5 }),
    type: Object.freeze({ min: 30, label: 34, body: 40, title: 54, head: 76 }),
    space: Object.freeze({ s: 24, m: 48, l: 96 }),
    safe: Object.freeze({ x: 900, y: 500, captionTop: 385 }),
  });
  // the stroke scale: 2 -> 4, 3 -> 4.6, 4 -> 5.4, 5 -> 6.2, 6 -> 7
  const strokeOf = (w) => (w > 0 ? Math.max(STYLE.stroke.min, Math.round((2.2 + 0.8 * w) * 10) / 10) : w);
  const typeOf = (s) => Math.max(STYLE.type.min, s);

  /*
   * Line boil: like hand-drawn animation, the ink is redrawn 12 times a
   * second, cycling through 4 poses. Lines move their end points, curves and
   * creatures shift or tilt by about a pixel; text stays still to stay
   * legible. BOIL.f is the pose, set from the film clock in Video.render.
   */
  const BOIL = { f: 0, on: true };
  let boilIds = 0;
  function jit(id, c) {
    if (!BOIL.on) return 0;
    let h = Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(BOIL.f + 7, 0x85ebca6b) ^ Math.imul(c + 3, 0xc2b2ae35);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    return ((h >>> 0) / 4294967296) * 2 - 1;
  }

  /* ---------- small math ---------- */
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const linear = (t) => t;
  const thereAndBack = (t) => smooth(t < 0.5 ? 2 * t : 2 - 2 * t);
  const rushInto = (t) => 2 * smooth(t / 2);
  const rushFrom = (t) => 2 * smooth(t / 2 + 0.5) - 1;
  const RATES = { smooth, linear, thereAndBack, rushInto, rushFrom };

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const x = hexToRgb(a);
    const y = hexToRgb(b);
    return '#' + x.map((v, i) => Math.round(lerp(v, y[i], t)).toString(16).padStart(2, '0')).join('');
  }

  function el(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
    return n;
  }
  const f2 = (x) => (Math.round(x * 100) / 100).toString();

  /* =========================================================== Mobjects */
  class Mob {
    constructor() {
      this.el = el('g');
      this.init = { x: 0, y: 0, s: 1, r: 0, o: 1 };
      this.kids = [];
      this.last = {};
      this.p = Object.assign({}, this.init);
    }
    at(x, y) { this.init.x = x; this.init.y = y; return this; }
    scale(s) { this.init.s = s; return this; }
    rotate(r) { this.init.r = r; return this; }
    hidden() { this.init.o = 0; return this; }
    with(props) { Object.assign(this.init, props); return this; }
    add(...mobs) {
      for (const m of mobs.flat()) {
        this.kids.push(m);
        this.el.appendChild(m.el);
      }
      return this;
    }
    reset() {
      this.p = Object.assign({}, this.init);
      for (const k of this.kids) k.reset();
    }
    flush() {
      const p = this.p;
      let tr = `translate(${f2(p.x)},${f2(p.y)})`;
      if (p.r) tr += ` rotate(${f2(p.r)})`;
      if (p.s !== 1) tr += ` scale(${p.s.toFixed(4)})`;
      if (tr !== this.last.tr) {
        this.el.setAttribute('transform', tr);
        this.last.tr = tr;
      }
      const o = clamp01(p.o);
      if (o !== this.last.o) {
        this.el.setAttribute('opacity', o.toFixed(3));
        this.el.style.visibility = o < 0.002 ? 'hidden' : 'visible';
        this.last.o = o;
      }
      if (o >= 0.002 || this.last.drawnOnce !== true) {
        this.draw(p);
        this.last.drawnOnce = true;
        for (const k of this.kids) k.flush();
      }
    }
    draw() {}
  }

  class Group extends Mob {
    constructor(...mobs) {
      super();
      this.add(...mobs);
    }
  }

  /* ---------- Tex: MathJax SVG paths, written stroke by stroke ---------- */
  class Tex extends Mob {
    constructor(tex, { size = 56, color = C.WHITE, display = true } = {}) {
      super();
      const node = window.MathJax.tex2svg(tex, { display });
      const s = node.querySelector('svg');
      const vb = s.getAttribute('viewBox').split(/[\s,]+/).map(Number);
      const k = size / 1000;
      this.w = vb[2] * k;
      this.h = vb[3] * k;
      s.removeAttribute('style');
      s.setAttribute('width', this.w);
      s.setAttribute('height', this.h);
      s.setAttribute('x', -this.w / 2);
      s.setAttribute('y', -this.h / 2);
      s.setAttribute('overflow', 'visible');
      s.removeAttribute('role');
      s.removeAttribute('focusable');
      this.svg = s;
      this.el.appendChild(s);
      this.parts = [...s.querySelectorAll('path, rect')];
      this.parts.forEach((pt) => {
        pt.setAttribute('stroke-width', '22');
        pt.setAttribute('stroke-linecap', 'round');
        pt.setAttribute('stroke-linejoin', 'round');
        if (pt.tagName === 'path') pt.setAttribute('pathLength', '1');
      });
      this.frags = {};
      s.querySelectorAll('[class]').forEach((g) => {
        for (const c of g.getAttribute('class').split(/\s+/)) if (/^f-/.test(c)) this.frags[c.slice(2)] = g;
      });
      Object.assign(this.init, { write: 1, color, focus: '', dim: 0, fcolor: '' });
      this.k = k;
      this.vb = vb;
    }
    draw(p) {
      if (p.color !== this.last.color) {
        this.svg.setAttribute('color', p.color);
        this.last.color = p.color;
      }
      if (p.write !== this.last.write) {
        const N = this.parts.length;
        const win = Math.min(1, 5 / Math.max(N, 1) + 0.12);
        this.parts.forEach((pt, i) => {
          const start = N > 1 ? (i / (N - 1)) * (1 - win) : 0;
          const q = clamp01((p.write - start) / win);
          const drawn = clamp01(q / 0.6);
          const fill = clamp01((q - 0.45) / 0.55);
          if (pt.tagName === 'path') {
            pt.style.strokeDasharray = drawn >= 1 ? 'none' : `${drawn.toFixed(4)} 2`;
            pt.style.strokeOpacity = (q <= 0 ? 0 : 1 - fill).toFixed(3);
          } else {
            pt.style.strokeOpacity = '0';
          }
          pt.style.fillOpacity = fill.toFixed(3);
        });
        this.last.write = p.write;
      }
      const fk = `${p.focus}|${p.dim}|${p.fcolor}`;
      if (fk !== this.last.fk) {
        for (const [name, g] of Object.entries(this.frags)) {
          const on = name === p.focus;
          g.style.opacity = p.focus ? (on ? 1 : 1 - 0.78 * p.dim) : 1;
          g.style.color = on && p.fcolor ? mix(p.color, p.fcolor, p.dim) : '';
        }
        this.last.fk = fk;
      }
    }
    // Fragment bounding box in this mob's local coordinates (needs layout).
    fragBox(name) {
      this._fb = this._fb || {};
      if (this._fb[name]) return this._fb[name];
      const g = this.frags[name];
      if (!g) return { x: -this.w / 2, y: -this.h / 2, w: this.w, h: this.h, cx: 0, cy: 0 };
      const b = g.getBBox();
      const m = this.el.getScreenCTM().inverse().multiply(g.getScreenCTM());
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
      const xs = pts.map((q) => q.x);
      const ys = pts.map((q) => q.y);
      const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      box.cx = box.x + box.w / 2;
      box.cy = box.y + box.h / 2;
      if (box.w > 0) this._fb[name] = box;
      return box;
    }
  }

  /* ---------- Text: SVG text in one of the type roles ---------- */
  class Text extends Mob {
    constructor(str, { size = 44, color = C.WHITE, weight = 400, italic = false, anchor = 'middle', font = 'serif', spacing = 0 } = {}) {
      super();
      const role = FONTS[font] ? font : font === 'cm' ? 'serif' : 'serif';
      // A hairline of the same ink around each glyph reads as ink bleed on
      // paper; the display faces stay crisp.
      const bleed = role === 'hero' || role === 'script' ? 0 : Math.max(0.6, size / 70);
      this.t = el('text', {
        'text-anchor': anchor,
        'dominant-baseline': 'central',
        'font-size': typeOf(size),
        'font-family': FONTS[role],
        'font-weight': weight,
        'font-style': italic ? 'italic' : 'normal',
        'letter-spacing': spacing || null,
        'stroke-width': bleed || Math.max(1, size / 40),
        'paint-order': 'stroke',
      });
      // deliberate runs of spaces (aligned columns) are kept
      this.t.style.whiteSpace = 'pre';
      this.role = role;
      this.bleed = bleed;
      this.el.appendChild(this.t);
      this.size = typeOf(size);
      Object.assign(this.init, { write: 1, color, str });
    }
    build(str) {
      while (this.t.firstChild) this.t.removeChild(this.t.firstChild);
      this.spans = [...str].map((ch) => {
        const sp = el('tspan');
        sp.textContent = ch;
        this.t.appendChild(sp);
        return sp;
      });
      this.last.write = undefined;
    }
    draw(p) {
      if (p.str !== this.last.str) {
        this.build(String(p.str));
        this.last.str = p.str;
      }
      if (p.color !== this.last.color) {
        this.t.setAttribute('fill', p.color);
        this.t.setAttribute('stroke', p.color);
        this.last.color = p.color;
      }
      if (p.write !== this.last.write) {
        const N = this.spans.length;
        const win = Math.min(1, 4 / Math.max(N, 1) + 0.1);
        this.spans.forEach((sp, i) => {
          const start = N > 1 ? (i / (N - 1)) * (1 - win) : 0;
          const q = clamp01((p.write - start) / win);
          sp.setAttribute('fill-opacity', clamp01((q - 0.3) / 0.7).toFixed(3));
          const edge = q <= 0 ? 0 : q >= 1 ? (this.bleed ? 0.55 : 0) : Math.max(this.bleed ? 0.55 : 0, 0.9 * (1 - q));
          sp.setAttribute('stroke-opacity', edge.toFixed(3));
        });
        this.last.write = p.write;
      }
    }
    width() {
      try {
        return this.t.getComputedTextLength();
      } catch (e) {
        return String(this.p.str).length * this.size * 0.5;
      }
    }
  }

  /* ---------- Shapes with a draw (Create) parameter ---------- */
  class Shape extends Mob {
    constructor(tag, attrs, { stroke = C.WHITE, width = 4, fill = 'none', fillOpacity = 1, dash = null } = {}) {
      super();
      this.s = el(tag, Object.assign({ 'pathLength': 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, attrs));
      this.el.appendChild(this.s);
      this.dash = dash;
      this.bid = boilIds++;
      this.boil = tag !== 'line';
      Object.assign(this.init, { draw: 1, stroke, sw: strokeOf(width), fill, fo: fill === 'none' ? 0 : fillOpacity });
    }
    draw(p) {
      if (this.boil && BOIL.f !== this.last.bf) {
        this.last.bf = BOIL.f;
        this.s.setAttribute('transform', `translate(${f2(0.8 * jit(this.bid, 0))},${f2(0.8 * jit(this.bid, 1))})`);
      }
      const key = `${p.draw}|${p.stroke}|${p.sw}|${p.fill}|${p.fo}`;
      if (key === this.last.key) return;
      this.last.key = key;
      this.s.setAttribute('stroke', p.stroke);
      this.s.setAttribute('stroke-width', p.sw);
      this.s.setAttribute('fill', p.fill === 'none' ? 'none' : p.fill);
      this.s.setAttribute('fill-opacity', (p.fo * clamp01((p.draw - 0.6) / 0.4)).toFixed(3));
      if (this.dash && p.draw >= 1) this.s.style.strokeDasharray = this.dashes();
      else this.s.style.strokeDasharray = p.draw >= 1 ? 'none' : `${clamp01(p.draw).toFixed(4)} 2`;
      this.s.style.strokeOpacity = p.draw <= 0 ? 0 : 1;
    }
  }

  // pathLength is 1 (for the Create animation), so dash lengths are given
  // as fractions of the measured length
  Shape.prototype.dashes = function () {
    if (this.dashN) return this.dashN;
    let L = 0;
    try {
      L = this.s.getTotalLength();
    } catch (e) {
      L = 0;
    }
    if (!(L > 0)) return this.dash;
    this.dashN = this.dash.split(/[\s,]+/).map((v) => (Number(v) / L).toFixed(5)).join(' ');
    return this.dashN;
  };

  class Line extends Shape {
    constructor(x1, y1, x2, y2, opts) {
      super('line', {}, opts);
      Object.assign(this.init, { x1, y1, x2, y2 });
    }
    draw(p) {
      const k = `${p.x1},${p.y1},${p.x2},${p.y2},${BOIL.f}`;
      if (k !== this.last.geo) {
        const a = 1.1;
        this.s.setAttribute('x1', f2(p.x1 + a * jit(this.bid, 0)));
        this.s.setAttribute('y1', f2(p.y1 + a * jit(this.bid, 1)));
        this.s.setAttribute('x2', f2(p.x2 + a * jit(this.bid, 2)));
        this.s.setAttribute('y2', f2(p.y2 + a * jit(this.bid, 3)));
        this.last.geo = k;
      }
      super.draw(p);
    }
  }

  class Arrow extends Mob {
    constructor(x1, y1, x2, y2, { color = C.WHITE, width = 4, head = 18 } = {}) {
      super();
      this.line = new Line(x1, y1, x2, y2, { stroke: color, width });
      this.head = el('polygon', { fill: color });
      this.add(this.line);
      this.el.appendChild(this.head);
      this.hs = Math.max(head, strokeOf(width) * 3.6);
      Object.assign(this.init, { draw: 1, x1, y1, x2, y2, color });
    }
    draw(p) {
      const L = this.line.p;
      L.x1 = p.x1; L.y1 = p.y1; L.stroke = p.color;
      const dx = p.x2 - p.x1;
      const dy = p.y2 - p.y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const tipX = p.x1 + dx * p.draw;
      const tipY = p.y1 + dy * p.draw;
      L.x2 = tipX - ux * this.hs * 0.6;
      L.y2 = tipY - uy * this.hs * 0.6;
      L.draw = 1;
      const h = this.hs;
      const pts = [
        [tipX, tipY],
        [tipX - ux * h - uy * h * 0.45, tipY - uy * h + ux * h * 0.45],
        [tipX - ux * h + uy * h * 0.45, tipY - uy * h - ux * h * 0.45],
      ];
      this.head.setAttribute('points', pts.map((q) => q.map(f2).join(',')).join(' '));
      this.head.setAttribute('fill', p.color);
      this.head.setAttribute('opacity', p.draw > 0.05 ? 1 : 0);
    }
  }

  const circle = (r, opts) => new Shape('circle', { cx: 0, cy: 0, r }, opts);
  const rect = (w, h, opts = {}) => new Shape('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: opts.rx ?? 6 }, opts);
  const path = (d, opts) => new Shape('path', { d }, opts);
  const dot = (r = 8, color = C.WHITE) => new Shape('circle', { cx: 0, cy: 0, r }, { stroke: color, width: 0, fill: color });

  function polyPath(pts) {
    return pts.map((q, i) => `${i ? 'L' : 'M'}${f2(q[0])},${f2(q[1])}`).join(' ');
  }

  /* ---------- Creature: a small watercolour character, inked ---------- */
  const BODY = 'M -62 70 C -78 0 -62 -78 0 -80 C 62 -78 78 0 62 70 Q 0 84 -62 70 Z';
  class Creature extends Mob {
    constructor({ color = C.TEAL, kind = 'agent', size = 1 } = {}) {
      super();
      const line = mix(color, INK, 0.55);
      // outlines keep at least 4 px on screen at the size it is made with
      const lw = (w) => Math.max(w, 4.2 / size);
      // a pale wash, a misregistered second pass of pigment, then the ink line
      this.el.appendChild(el('path', { d: BODY, fill: color, 'fill-opacity': 0.22, transform: 'translate(5,4)' }));
      this.body = el('path', { d: BODY, fill: mix(PAPER, color, 0.58), stroke: line, 'stroke-width': lw(5.6), 'stroke-linejoin': 'round' });
      this.el.appendChild(this.body);
      this.el.appendChild(el('path', { d: 'M -46 52 Q 0 64 46 52', fill: 'none', stroke: color, 'stroke-opacity': 0.35, 'stroke-width': 9, 'stroke-linecap': 'round' }));
      if (kind === 'agent') {
        this.el.appendChild(el('line', { x1: 0, y1: -80, x2: 0, y2: -108, stroke: line, 'stroke-width': lw(5.6), 'stroke-linecap': 'round' }));
        this.el.appendChild(el('circle', { cx: 0, cy: -114, r: 9.5, fill: mix(PAPER, C.YELLOW, 0.6), stroke: line, 'stroke-width': 4.5 }));
      }
      this.eyes = [-24, 24].map((ex) => {
        const g = el('g', { transform: `translate(${ex},-26)` });
        g.appendChild(el('circle', { r: 17, fill: C.SHEET }));
        const pupil = el('circle', { r: 8, fill: INK });
        g.appendChild(pupil);
        this.el.appendChild(g);
        return { g, pupil, ex };
      });
      if (kind === 'scientist') {
        const gl = el('g', { fill: 'none', stroke: INK, 'stroke-width': lw(5.6) });
        gl.appendChild(el('circle', { cx: -24, cy: -26, r: 22 }));
        gl.appendChild(el('circle', { cx: 24, cy: -26, r: 22 }));
        gl.appendChild(el('line', { x1: -2, y1: -28, x2: 2, y2: -28 }));
        this.el.appendChild(gl);
      }
      this.mouth = el('path', { fill: 'none', stroke: INK, 'stroke-width': lw(6), 'stroke-linecap': 'round' });
      this.el.appendChild(this.mouth);
      this.bid = boilIds++;
      Object.assign(this.init, { s: size, lx: 0, ly: 0, blink: 0, mood: 0.5 });
    }
    draw(p) {
      if (BOIL.f !== this.last.bf) {
        this.last.bf = BOIL.f;
        this.body.setAttribute('transform', `rotate(${f2(0.9 * jit(this.bid, 0))}) translate(${f2(0.9 * jit(this.bid, 1))},${f2(0.6 * jit(this.bid, 2))})`);
      }
      const k = `${p.lx}|${p.ly}|${p.blink}|${p.mood}`;
      if (k === this.last.face) return;
      this.last.face = k;
      for (const e of this.eyes) {
        e.pupil.setAttribute('cx', f2(p.lx * 7));
        e.pupil.setAttribute('cy', f2(p.ly * 7));
        e.g.setAttribute('transform', `translate(${e.ex},-26) scale(1,${Math.max(0.08, 1 - p.blink).toFixed(3)})`);
      }
      const m = p.mood;
      this.mouth.setAttribute('d', `M -20 16 Q 0 ${f2(16 + m * 18)} 20 16`);
    }
  }

  /* ---------- Speech bubble: a paper slip, inked, in the hand face ---------- */
  class Bubble extends Mob {
    constructor(text, { size = 34, color = C.WHITE, side = 'left', width = null } = {}) {
      super();
      this.box = el('path', { fill: C.SHEET, stroke: INK, 'stroke-width': STYLE.stroke.fine, 'stroke-linejoin': 'round' });
      this.el.appendChild(this.box);
      this.text = new Text(text, { size, color, font: 'hand' });
      this.add(this.text);
      this.side = side;
      this.fixedW = width;
      this.size = size;
    }
    draw() {
      if (this.last.shaped) return;
      if (!this.text.spans) {
        this.text.build(String(this.text.init.str));
        this.text.last.str = this.text.init.str;
      }
      const w = (this.fixedW || this.text.width() || 200) + this.size * 1.4;
      const h = this.size * 2.1;
      const r = 18;
      const tail = this.side === 'left' ? `L ${-w / 2 + 40} ${h / 2} L ${-w / 2 + 10} ${h / 2 + 34} L ${-w / 2 + 70} ${h / 2}` : `L ${w / 2 - 70} ${h / 2} L ${w / 2 - 10} ${h / 2 + 34} L ${w / 2 - 40} ${h / 2}`;
      const d = `M ${-w / 2 + r} ${-h / 2} H ${w / 2 - r} Q ${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + r} V ${h / 2 - r} Q ${w / 2} ${h / 2} ${w / 2 - r} ${h / 2} ` +
        (this.side === 'left' ? `H ${-w / 2 + 70} ${tail} H ${-w / 2 + r}` : `H ${w / 2 - 40} ${tail} H ${-w / 2 + r}`) +
        ` Q ${-w / 2} ${h / 2} ${-w / 2} ${h / 2 - r} V ${-h / 2 + r} Q ${-w / 2} ${-h / 2} ${-w / 2 + r} ${-h / 2} Z`;
      this.box.setAttribute('d', d);
      if (this.text.width() > 0) this.last.shaped = true;
    }
  }

  /*
   * Rubber stamp: two passes of ink, the second misregistered, with ink
   * dropout from the #stamp-ink filter (index.html). A.Slam brings it down.
   */
  class Stamp extends Mob {
    constructor(label, { color = C.RED, ghost = C.PINK, size = 60, angle = -7, sub = null } = {}) {
      super();
      const chars = label.length;
      const w = chars * size * 0.66 + size * 1.3;
      const h = size * (sub ? 2.15 : 1.55);
      const pass = (col, dx, dy, op) => {
        const g = el('g', { transform: `translate(${dx},${dy})`, opacity: op });
        g.appendChild(el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 10, fill: 'none', stroke: col, 'stroke-width': 7 }));
        g.appendChild(el('rect', { x: -w / 2 + 11, y: -h / 2 + 11, width: w - 22, height: h - 22, rx: 5, fill: 'none', stroke: col, 'stroke-width': 4 }));
        const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': FONTS.mono, 'font-weight': 600, 'font-size': size, 'letter-spacing': size * 0.06, fill: col, y: sub ? -size * 0.28 : 0 });
        t.textContent = label;
        g.appendChild(t);
        if (sub) {
          const u = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': FONTS.mono, 'font-weight': 500, 'font-size': Math.max(30, size * 0.5), fill: col, y: size * 0.55 });
          u.textContent = sub;
          g.appendChild(u);
        }
        return g;
      };
      this.inner = el('g', { filter: 'url(#stamp-ink)', 'data-stamp': '' });
      this.inner.appendChild(pass(ghost, 4, 3, 0.3));
      this.inner.appendChild(pass(color, 0, 0, 0.92));
      this.el.appendChild(this.inner);
      this.w = w;
      this.h = h;
      Object.assign(this.init, { r: angle });
    }
  }

  /*
   * Hand lens: the iris used for every zoom. A paper wash covers the frame
   * outside a circle of radius r; the rim and handle are inked.
   */
  class Lens extends Mob {
    constructor({ r = 400 } = {}) {
      super();
      this.wash = el('path', { fill: PAPER, 'fill-rule': 'evenodd', 'fill-opacity': 0.9 });
      this.rim = el('circle', { cx: 0, cy: 0, fill: 'none', stroke: INK, 'stroke-width': 10 });
      this.rim2 = el('circle', { cx: 0, cy: 0, fill: 'none', stroke: C.SEPIA, 'stroke-width': 3 });
      this.handle = el('path', { fill: mix(PAPER, C.GOLD, 0.45), stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' });
      for (const n of [this.wash, this.handle, this.rim, this.rim2]) this.el.appendChild(n);
      Object.assign(this.init, { r, o: 0 });
    }
    draw(p) {
      if (p.r === this.last.r) return;
      this.last.r = p.r;
      const r = p.r;
      const R = f2(r);
      this.wash.setAttribute('d', `M -1000 -600 H 1000 V 600 H -1000 Z M ${R} 0 A ${R} ${R} 0 0 1 0 ${R} A ${R} ${R} 0 0 1 -${R} 0 A ${R} ${R} 0 0 1 0 -${R} A ${R} ${R} 0 0 1 ${R} 0 Z`);
      this.rim.setAttribute('r', f2(r));
      this.rim2.setAttribute('r', f2(Math.max(0, r - 14)));
      const a = Math.PI / 4;
      const x0 = Math.cos(a) * (r + 4);
      const y0 = Math.sin(a) * (r + 4);
      const L = 230;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const hw = 22;
      this.handle.setAttribute('d', `M ${f2(x0 - uy * hw)} ${f2(y0 + ux * hw)} L ${f2(x0 + ux * L - uy * hw)} ${f2(y0 + uy * L + ux * hw)} Q ${f2(x0 + ux * (L + 26))} ${f2(y0 + uy * (L + 26))} ${f2(x0 + ux * L + uy * hw)} ${f2(y0 + uy * L - ux * hw)} L ${f2(x0 + uy * hw)} ${f2(y0 - ux * hw)} Z`);
    }
  }

  /* =========================================================== Animations */
  // A leaf animation: { mob, dur, rate, apply(p, alpha) }.
  function anim(mob, dur, apply, rate = smooth) {
    return { kind: 'leaf', mob, dur, apply, rate: typeof rate === 'string' ? RATES[rate] : rate };
  }
  const seq = (...xs) => ({ kind: 'seq', items: xs.flat(Infinity).filter(Boolean) });
  const par = (...xs) => ({ kind: 'par', items: xs.flat(Infinity).filter(Boolean) });
  const lag = (ratio, ...xs) => ({ kind: 'lag', ratio, items: xs.flat(Infinity).filter(Boolean) });
  const wait = (d) => ({ kind: 'leaf', mob: null, dur: d, apply() {}, rate: linear });

  function durOf(a) {
    if (Array.isArray(a)) return Math.max(0, ...a.map(durOf));
    if (a.kind === 'leaf') return a.dur;
    if (a.kind === 'seq') return a.items.reduce((s, x) => s + durOf(x), 0);
    if (a.kind === 'par') return Math.max(0, ...a.items.map(durOf));
    if (a.kind === 'lag') {
      let end = 0;
      a.items.forEach((x, i) => (end = Math.max(end, i * a.ratio + durOf(x))));
      return end;
    }
    return 0;
  }

  function flatten(a, start, out) {
    if (!a) return;
    if (Array.isArray(a)) {
      a.forEach((x) => flatten(x, start, out));
      return;
    }
    if (a.kind === 'leaf') {
      if (a.mob) out.push({ start, dur: a.dur, apply: a.apply, rate: a.rate, mob: a.mob });
      return;
    }
    if (a.kind === 'seq') {
      let t = start;
      for (const x of a.items) {
        flatten(x, t, out);
        t += durOf(x);
      }
      return;
    }
    if (a.kind === 'par') a.items.forEach((x) => flatten(x, start, out));
    if (a.kind === 'lag') a.items.forEach((x, i) => flatten(x, start + i * a.ratio, out));
  }

  const A = {
    FadeIn: (m, { dur = 0.8, dx = 0, dy = 0, from = 1 } = {}) =>
      anim(m, dur, (p, a) => {
        p.o = a;
        p.x -= dx * (1 - a);
        p.y -= dy * (1 - a);
        if (from !== 1) p.s *= lerp(from, 1, a);
      }),
    FadeOut: (m, { dur = 0.6, dx = 0, dy = 0 } = {}) =>
      anim(m, dur, (p, a) => {
        p.o *= 1 - a;
        p.x += dx * a;
        p.y += dy * a;
      }),
    Write: (m, dur = 1.4) =>
      anim(m, dur, (p, a) => {
        p.o = 1;
        p.write = a;
      }, linear),
    Unwrite: (m, dur = 0.8) => anim(m, dur, (p, a) => (p.write = 1 - a), linear),
    Create: (m, dur = 1.2) =>
      anim(m, dur, (p, a) => {
        p.o = 1;
        p.draw = a;
      }),
    Uncreate: (m, dur = 0.8) => anim(m, dur, (p, a) => (p.draw = 1 - a)),
    Show: (m) => anim(m, 0, (p) => (p.o = 1)),
    Hide: (m) => anim(m, 0, (p) => (p.o = 0)),
    MoveTo: (m, x, y, dur = 1) =>
      anim(m, dur, (p, a) => {
        p.x = lerp(p.x, x, a);
        p.y = lerp(p.y, y, a);
      }),
    Shift: (m, dx, dy, dur = 1) =>
      anim(m, dur, (p, a) => {
        p.x += dx * a;
        p.y += dy * a;
      }),
    ScaleTo: (m, s, dur = 1) => anim(m, dur, (p, a) => (p.s = lerp(p.s, s, a))),
    Set: (m, props, dur = 0.8, rate = smooth) =>
      anim(m, dur, (p, a) => {
        for (const [k, v] of Object.entries(props)) {
          if (typeof v === 'number' && typeof p[k] === 'number') p[k] = lerp(p[k], v, a);
          else if (typeof v === 'string' && /^#/.test(v) && typeof p[k] === 'string' && /^#/.test(p[k])) p[k] = mix(p[k], v, a);
          else if (a > 0) p[k] = v;
        }
      }, rate),
    Indicate: (m, { dur = 1, color = C.YELLOW, scale = 1.15 } = {}) =>
      anim(m, dur, (p, a) => {
        const b = thereAndBack(a);
        p.s *= 1 + (scale - 1) * b;
        if (typeof p.color === 'string') p.color = mix(p.color, color, b);
        if (typeof p.stroke === 'string') p.stroke = mix(p.stroke, color, b);
      }, linear),
    Count: (m, from, to, fmt = (v) => Math.round(v).toString(), dur = 1.5) =>
      anim(m, dur, (p, a) => (p.str = fmt(lerp(from, to, a)))),
    Blink: (m, dur = 0.3) => anim(m, dur, (p, a) => (p.blink = thereAndBack(a)), linear),
    Look: (m, lx, ly, dur = 0.5) =>
      anim(m, dur, (p, a) => {
        p.lx = lerp(p.lx, lx, a);
        p.ly = lerp(p.ly, ly, a);
      }),
    Mood: (m, mood, dur = 0.5) => anim(m, dur, (p, a) => (p.mood = lerp(p.mood, mood, a))),
    Focus: (m, frag, { dur = 0.8, color = C.YELLOW } = {}) =>
      anim(m, dur, (p, a) => {
        p.focus = frag;
        p.fcolor = color;
        p.dim = a;
      }),
    Unfocus: (m, dur = 0.6) => anim(m, dur, (p, a) => (p.dim *= 1 - a)),
    Arrow: (m, dur = 1) =>
      anim(m, dur, (p, a) => {
        p.o = 1;
        p.draw = a;
      }),
    // A rubber stamp coming down: 3 frames from 118 % to full size, then a
    // short damped shake. Linear time, so the impact lands on its frame.
    Slam: (m, { dur = 0.6, from = 1.18 } = {}) =>
      anim(m, dur, (p, a) => {
        const T = a * dur;
        const k = Math.min(1, T / 0.1);
        p.o = T <= 0 ? 0 : 0.4 + 0.6 * k;
        p.s *= from + (1 - from) * k;
        if (T > 0.1) {
          const u = T - 0.1;
          const amp = Math.exp(-u * 11);
          p.x += 5 * amp * Math.sin(u * 95);
          p.y += 3 * amp * Math.sin(u * 77 + 1);
        }
      }, linear),
  };

  /* =========================================================== Scenes */
  const DRIFT = 0.012;
  class Camera {
    constructor() {
      this.init = { cx: 0, cy: 0, z: 1 };
      this.p = Object.assign({}, this.init);
      this.last = '';
    }
    reset() { this.p = Object.assign({}, this.init); }
  }

  class Scene {
    constructor(id, chapter, title, fn) {
      this.id = id;
      this.chapter = chapter;
      this.title = title;
      this.fn = fn;
      this.built = false;
      this.drift = DRIFT;
    }
    build(video) {
      this.world = el('g');
      this.hud = el('g');
      this.mobs = [];
      this.hudMobs = [];
      this.cam = new Camera();
      this.camMob = { p: this.cam.p };
      this.beats = [];
      this.leaves = [];
      const S = this;
      const api = {
        C, BASE_COLORS, A, seq, par, lag, wait,
        add: (...m) => { m.flat().forEach((x) => { S.mobs.push(x); S.world.appendChild(x.el); }); return m.length === 1 ? m[0] : m; },
        fixed: (...m) => { m.flat().forEach((x) => { S.hudMobs.push(x); S.hud.appendChild(x.el); }); return m.length === 1 ? m[0] : m; },
        beat: (say, ...rest) => {
          let opts = {};
          if (rest.length && rest[rest.length - 1] && !Array.isArray(rest[rest.length - 1]) && !rest[rest.length - 1].kind) opts = rest.pop();
          S.beats.push({ id: `${S.id}.${S.beats.length + 1}`, say: say || '', cap: opts.cap, anims: seq(...rest), hold: opts.hold ?? 0.35, min: opts.min ?? 0 });
        },
        silent: (...rest) => S.beats.push({ id: `${S.id}.${S.beats.length + 1}`, say: '', anims: seq(...rest), hold: 0.1, min: 0 }),
        cam: (cx, cy, z, dur = 1.6) => anim(S.camMob, dur, (p, a) => {
          p.cx = lerp(p.cx, cx, a);
          p.cy = lerp(p.cy, cy, a);
          p.z = lerp(p.z, z, a);
        }),
        camTarget: (fn, dur = 1.6) => anim(S.camMob, dur, (p, a) => {
          const g = fn();
          p.cx = lerp(p.cx, g.cx, a);
          p.cy = lerp(p.cy, g.cy, a);
          p.z = lerp(p.z, g.z, a);
        }),
        clearAll: (dur = 0.7) => par(S.mobs.map((m) => A.FadeOut(m, { dur }))),
        keep: () => (S.keepEnd = true),
        still: () => (S.drift = 0),
        // Seconds from a beat's start to where `word` is spoken. With word
        // timings (narration/words.json, from tools/words.py) this is the
        // measured onset; without them, the word's share of the characters.
        // The clip starts 0.15 s into the beat (tools/mix.py).
        atWord: (say, word, id) => {
          const i = say.indexOf(word);
          const id2 = id || `${S.id}.${S.beats.length + 1}`;
          const d = video.durations && video.durations[id2] != null ? video.durations[id2] : video.estimate(say);
          const est = i < 0 ? 0 : (i / say.length) * d;
          const ws = video.words && video.words[id2];
          if (ws && ws.length) {
            const norm = (x) => x.toLowerCase().replace(/[^a-z0-9']/g, '');
            const target = norm(word.split(/\s+/)[0]);
            let best = null;
            for (const [w, s0] of ws) if (norm(w) === target && (best === null || Math.abs(s0 - est) < Math.abs(best - est))) best = s0;
            if (best !== null) return 0.15 + best;
          }
          return 0.15 + est;
        },
      };
      Object.assign(api, video.kit(api));
      this.fn(api);
      this.built = true;
    }
    schedule(durations, est) {
      let t = 0;
      this.leaves = [];
      for (const b of this.beats) {
        const animDur = durOf(b.anims);
        const speech = b.say ? (durations && durations[b.id] != null ? durations[b.id] : est(b.say)) : 0;
        b.speech = speech;
        b.start = t;
        b.dur = Math.max(animDur + b.hold, b.say ? speech + 0.55 : 0, b.min, 0.3);
        flatten(b.anims, t, this.leaves);
        t += b.dur;
      }
      if (!this.keepEnd) {
        const fades = par([...this.mobs, ...this.hudMobs].map((m) => A.FadeOut(m, { dur: 0.7 })));
        const last = { id: `${this.id}.end`, say: '', anims: fades, start: t, dur: 0.9 };
        flatten(fades, t, this.leaves);
        this.beats.push(last);
        t += last.dur;
      }
      this.leaves.forEach((l, i) => (l.order = i));
      this.leaves.sort((a, b) => a.start - b.start || a.order - b.order);
      this.duration = t;
    }
    render(t) {
      this.cam.reset();
      this.camMob.p = this.cam.p;
      for (const m of this.mobs) m.reset();
      for (const m of this.hudMobs) m.reset();
      for (const l of this.leaves) {
        if (l.start > t) break;
        const a = l.dur <= 0 ? 1 : clamp01((t - l.start) / l.dur);
        l.apply(l.mob.p, l.rate(a));
      }
      const c = this.camMob.p;
      // a slow push-in across every scene keeps still pictures alive
      const z = c.z * (1 + this.drift * smooth(clamp01(t / (this.duration || 1))));
      const tr = `scale(${z.toFixed(4)}) translate(${f2(-c.cx)},${f2(-c.cy)})`;
      if (tr !== this.cam.last) {
        this.world.setAttribute('transform', tr);
        this.cam.last = tr;
      }
      for (const m of this.mobs) m.flush();
      for (const m of this.hudMobs) m.flush();
    }
  }

  /* =========================================================== Video */
  class Video {
    constructor(root, { kit = () => ({}), durations = null, words = null, wordsPerSecond = 2.6 } = {}) {
      this.root = root;
      this.kit = kit;
      this.durations = durations;
      this.words = words;
      this.wps = wordsPerSecond;
      this.chapters = [];
      this.scenes = [];
      this.current = null;
      this.overlays = [];
    }
    // An overlay is drawn over every scene from the film's own clock:
    // { el, render(t, video) }. The notebook's margin tree and page numbers.
    overlay(o) {
      this.overlays.push(o);
      if (this.root.over) this.root.over.appendChild(o.el);
      return this;
    }
    chapter(id, title) {
      this.chapters.push({ id, title, scenes: [] });
      return this;
    }
    scene(id, title, fn) {
      const ch = this.chapters[this.chapters.length - 1];
      const sc = new Scene(id, ch.id, title, fn);
      ch.scenes.push(sc);
      this.scenes.push(sc);
      return this;
    }
    estimate(text) {
      const words = text.trim().split(/\s+/).length;
      return words / this.wps + 0.25 * (text.match(/[.!?;:]/g) || []).length;
    }
    compile() {
      let t = 0;
      for (const sc of this.scenes) {
        if (!sc.built) sc.build(this);
        sc.schedule(this.durations, (s) => this.estimate(s));
        sc.start = t;
        t += sc.duration;
      }
      for (const ch of this.chapters) ch.start = ch.scenes[0].start;
      this.duration = t;
      this.beats = this.scenes.flatMap((sc) => sc.beats.map((b) => ({ id: b.id, say: b.say, cap: b.cap, start: sc.start + b.start, dur: b.dur, speech: b.speech || 0, scene: sc.id })));
      for (const fn of this.afterCompile || []) fn(this);
      return this;
    }
    // run once the timeline is known (for overlays keyed to beats)
    after(fn) {
      (this.afterCompile = this.afterCompile || []).push(fn);
      return this;
    }
    beat(id) {
      const b = this.beats.find((x) => x.id === id);
      if (!b) throw new Error(`unknown beat ${id}`);
      return b;
    }
    sceneAt(t) {
      let lo = 0;
      for (let i = 0; i < this.scenes.length; i++) if (this.scenes[i].start <= t) lo = i;
      return this.scenes[lo];
    }
    beatAt(t) {
      let found = null;
      for (const b of this.beats) {
        if (b.start <= t) found = b;
        else break;
      }
      return found && t < found.start + found.dur ? found : null;
    }
    chapterAt(t) {
      let found = this.chapters[0];
      for (const ch of this.chapters) if (ch.start <= t) found = ch;
      return found;
    }
    render(t) {
      t = Math.max(0, Math.min(this.duration - 1e-6, t));
      const sc = this.sceneAt(t);
      if (sc !== this.current) {
        if (this.current) {
          this.root.world.removeChild(this.current.world);
          this.root.hud.removeChild(this.current.hud);
        }
        this.root.world.appendChild(sc.world);
        this.root.hud.appendChild(sc.hud);
        this.current = sc;
      }
      BOIL.f = Math.floor(t * 12) % 4;
      sc.render(t - sc.start);
      for (const o of this.overlays) o.render(t, this);
    }
    sceneIndex(sc) {
      return this.scenes.indexOf(sc);
    }
  }

  return {
    C, BASE_COLORS, FONT_CM, FONTS, NS, BOIL, jit, el, mix, lerp, clamp01, smooth, RATES, STYLE, strokeOf, typeOf,
    Mob, Group, Tex, Text, Shape, Line, Arrow, Creature, Bubble, Stamp, Lens,
    circle, rect, path, dot, polyPath,
    anim, seq, par, lag, wait, A, durOf,
    Video,
  };
})();
if (typeof module === 'object' && module.exports) module.exports = MV;
if (typeof window === 'object') window.MV = MV;
