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
  const C = Object.freeze({
    BLUE: '#58C4DD', TEAL: '#5CD0B3', GREEN: '#83C167', YELLOW: '#F7D96F', GOLD: '#F0AC5F',
    RED: '#FC6255', MAROON: '#C55F73', PURPLE: '#9A72AC', PINK: '#D147BD', ORANGE: '#FF862F',
    GREY: '#888888', GREY_B: '#BBBBBB', GREY_D: '#444444', GREY_E: '#222222', WHITE: '#ECECEC', BG: '#0E0F12',
  });
  const BASE_COLORS = Object.freeze({ A: C.GREEN, C: C.BLUE, G: C.YELLOW, T: C.RED });
  const FONT_CM = "KaTeX_Main, 'Latin Modern Roman', 'CMU Serif', Georgia, serif";
  const FONT_MONO = "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace";

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

  /* ---------- Text: Computer Modern glyphs as SVG text ---------- */
  class Text extends Mob {
    constructor(str, { size = 44, color = C.WHITE, weight = 400, italic = false, anchor = 'middle', font = 'cm', spacing = 0 } = {}) {
      super();
      this.t = el('text', {
        'text-anchor': anchor,
        'dominant-baseline': 'central',
        'font-size': size,
        'font-family': font === 'mono' ? FONT_MONO : FONT_CM,
        'font-weight': weight,
        'font-style': italic ? 'italic' : 'normal',
        'letter-spacing': spacing || null,
        'stroke-width': Math.max(1, size / 26),
        'paint-order': 'stroke',
      });
      this.el.appendChild(this.t);
      this.size = size;
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
          sp.setAttribute('stroke-opacity', (q <= 0 || q >= 1 ? 0 : 0.9 * (1 - q)).toFixed(3));
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
      Object.assign(this.init, { draw: 1, stroke, sw: width, fill, fo: fill === 'none' ? 0 : fillOpacity });
    }
    draw(p) {
      const key = `${p.draw}|${p.stroke}|${p.sw}|${p.fill}|${p.fo}`;
      if (key === this.last.key) return;
      this.last.key = key;
      this.s.setAttribute('stroke', p.stroke);
      this.s.setAttribute('stroke-width', p.sw);
      this.s.setAttribute('fill', p.fill === 'none' ? 'none' : p.fill);
      this.s.setAttribute('fill-opacity', (p.fo * clamp01((p.draw - 0.6) / 0.4)).toFixed(3));
      if (this.dash && p.draw >= 1) this.s.style.strokeDasharray = this.dash;
      else this.s.style.strokeDasharray = p.draw >= 1 ? 'none' : `${clamp01(p.draw).toFixed(4)} 2`;
      this.s.style.strokeOpacity = p.draw <= 0 ? 0 : 1;
    }
  }

  class Line extends Shape {
    constructor(x1, y1, x2, y2, opts) {
      super('line', {}, opts);
      Object.assign(this.init, { x1, y1, x2, y2 });
    }
    draw(p) {
      const k = `${p.x1},${p.y1},${p.x2},${p.y2}`;
      if (k !== this.last.geo) {
        this.s.setAttribute('x1', f2(p.x1));
        this.s.setAttribute('y1', f2(p.y1));
        this.s.setAttribute('x2', f2(p.x2));
        this.s.setAttribute('y2', f2(p.y2));
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
      this.hs = head;
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

  /* ---------- Creature: a friendly 3b1b-style character ---------- */
  class Creature extends Mob {
    constructor({ color = C.TEAL, kind = 'agent', size = 1 } = {}) {
      super();
      const dark = mix(color, '#000000', 0.45);
      this.body = el('path', { d: 'M -62 70 C -78 0 -62 -78 0 -80 C 62 -78 78 0 62 70 Q 0 84 -62 70 Z', fill: color, stroke: dark, 'stroke-width': 4 });
      this.el.appendChild(this.body);
      if (kind === 'agent') {
        this.el.appendChild(el('line', { x1: 0, y1: -80, x2: 0, y2: -108, stroke: dark, 'stroke-width': 5, 'stroke-linecap': 'round' }));
        this.el.appendChild(el('circle', { cx: 0, cy: -114, r: 9, fill: C.YELLOW, stroke: dark, 'stroke-width': 3 }));
      }
      this.eyes = [-24, 24].map((ex) => {
        const g = el('g', { transform: `translate(${ex},-26)` });
        g.appendChild(el('circle', { r: 17, fill: '#ffffff' }));
        const pupil = el('circle', { r: 8.5, fill: '#16181d' });
        g.appendChild(pupil);
        this.el.appendChild(g);
        return { g, pupil, ex };
      });
      if (kind === 'scientist') {
        const gl = el('g', { fill: 'none', stroke: '#16181d', 'stroke-width': 4 });
        gl.appendChild(el('circle', { cx: -24, cy: -26, r: 22 }));
        gl.appendChild(el('circle', { cx: 24, cy: -26, r: 22 }));
        gl.appendChild(el('line', { x1: -2, y1: -28, x2: 2, y2: -28 }));
        this.el.appendChild(gl);
      }
      this.mouth = el('path', { fill: 'none', stroke: '#16181d', 'stroke-width': 4.5, 'stroke-linecap': 'round' });
      this.el.appendChild(this.mouth);
      Object.assign(this.init, { s: size, lx: 0, ly: 0, blink: 0, mood: 0.5 });
    }
    draw(p) {
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

  /* ---------- Speech bubble ---------- */
  class Bubble extends Mob {
    constructor(text, { size = 34, color = C.WHITE, side = 'left', width = null } = {}) {
      super();
      this.box = el('path', { fill: '#1b1d23', stroke: C.GREY_B, 'stroke-width': 3 });
      this.el.appendChild(this.box);
      this.text = new Text(text, { size, color });
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
  };

  /* =========================================================== Scenes */
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
      const tr = `scale(${c.z.toFixed(4)}) translate(${f2(-c.cx)},${f2(-c.cy)})`;
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
    constructor(root, { kit = () => ({}), durations = null, wordsPerSecond = 2.6 } = {}) {
      this.root = root;
      this.kit = kit;
      this.durations = durations;
      this.wps = wordsPerSecond;
      this.chapters = [];
      this.scenes = [];
      this.current = null;
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
      return this;
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
      sc.render(t - sc.start);
    }
  }

  return {
    C, BASE_COLORS, FONT_CM, NS, el, mix, lerp, clamp01, smooth, RATES,
    Mob, Group, Tex, Text, Shape, Line, Arrow, Creature, Bubble,
    circle, rect, path, dot, polyPath,
    anim, seq, par, lag, wait, A, durOf,
    Video,
  };
})();
if (typeof module === 'object' && module.exports) module.exports = MV;
