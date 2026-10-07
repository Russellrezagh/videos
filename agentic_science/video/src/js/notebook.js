/*
 * The notebook: the one world this film lives in.
 *
 * Domain model
 *   Paper    a seeded sheet of graph paper and a grain layer, painted once;
 *            the paper never moves, only the ink does
 *   Motif    a tree with one continuous parameter g = chapters told so far.
 *            It grows one branch per chapter (on the chapter cards) and the
 *            agent climbs to the newest tip. Drawn from the film clock by a
 *            keyframe track, so it can fly between the margin and the page.
 *   Darwin   the 1837 "I think" sketch (Notebook B, p. 36), redrawn: the
 *            same four letters A, B, C, D as our puzzle
 *   Margin   overlays from the film clock: page number, and the title of
 *            the paper behind the current beat (titles only; full
 *            references live on the page under the player)
 *
 * Everything here is a pure function of t, like the engine.
 */
window.Notebook = (function () {
  'use strict';
  const { C, el, mix, lerp, clamp01, smooth, Mob, Group, Text, Creature } = MV;

  /* ---------------------------------------------------------- Paper */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The sheet: warm base, mottle, fibres, flecks, a faint graph grid.
  function paintPaper(canvas, seed = 1837) {
    const W = canvas.width;
    const H = canvas.height;
    const k = W / 1920;
    const g = canvas.getContext('2d');
    const r = rng(seed);
    g.fillStyle = C.PAPER;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const x = r() * W;
      const y = r() * H;
      const rad = (50 + r() * 200) * k;
      const dark = r() < 0.5;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, dark ? `rgba(120,92,52,${0.008 + r() * 0.014})` : `rgba(255,252,242,${0.04 + r() * 0.05})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    }
    // graph grid: 40 px squares, every fifth line a little stronger
    const step = 40 * k;
    for (let i = 0; i * step <= W; i++) {
      g.fillStyle = i % 5 === 0 ? 'rgba(61,85,136,0.13)' : 'rgba(61,85,136,0.065)';
      g.fillRect(Math.round(i * step), 0, Math.max(1, k), H);
    }
    for (let j = 0; j * step <= H; j++) {
      g.fillStyle = j % 5 === 0 ? 'rgba(61,85,136,0.13)' : 'rgba(61,85,136,0.065)';
      g.fillRect(0, Math.round(j * step), W, Math.max(1, k));
    }
    fibres(g, r, W, H, k, 420, 0.1, 0.2);
    flecks(g, r, W, H, k, 2200, 0.1, 0.32);
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(105,80,45,0.10)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
  }

  // The grain: laid over the ink with multiply, so lines sit IN the paper.
  function paintGrain(canvas, seed = 1859) {
    const W = canvas.width;
    const H = canvas.height;
    const k = W / 1920;
    const g = canvas.getContext('2d');
    const r = rng(seed);
    const img = g.createImageData(W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 255 - Math.floor(r() * r() * 26);
      d[i] = v;
      d[i + 1] = v - 1;
      d[i + 2] = v - 4;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    fibres(g, r, W, H, k, 260, 0.06, 0.12);
    flecks(g, r, W, H, k, 900, 0.08, 0.2);
  }

  function fibres(g, r, W, H, k, n, a0, a1) {
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = r() * W;
      const y = r() * H;
      const len = (8 + r() * 34) * k;
      const ang = r() * Math.PI;
      const bend = (r() - 0.5) * 10 * k;
      g.strokeStyle = `rgba(112,88,58,${a0 + r() * (a1 - a0)})`;
      g.lineWidth = (0.5 + r() * 0.8) * k;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 - Math.sin(ang) * bend, y + Math.sin(ang) * len * 0.5 + Math.cos(ang) * bend, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.stroke();
    }
  }

  function flecks(g, r, W, H, k, n, a0, a1) {
    for (let i = 0; i < n; i++) {
      const big = r() < 0.04;
      g.fillStyle = `rgba(88,68,44,${a0 + r() * (a1 - a0)})`;
      g.beginPath();
      g.arc(r() * W, r() * H, (big ? 1.4 + r() * 1.2 : 0.35 + r() * 0.9) * k, 0, 2 * Math.PI);
      g.fill();
    }
  }

  /* ---------------------------------------------------------- Motif */
  /*
   * Branch i belongs to chapter i + 1 and grows while g goes from i to i + 1.
   * Each branch is a quadratic curve from a point on its parent to its tip;
   * a tip with a cross-bar is a living lineage, as in Darwin's sketch.
   */
  const ROOT = [0, 300];
  const BRANCHES = [
    { from: ROOT, c: [-14, 200], tip: [8, 118] }, // 1 the question (the trunk)
    { from: [8, 118], c: [92, 70], tip: [158, -18] }, // 2 the puzzle
    { from: [8, 118], c: [-70, 52], tip: [-132, -96] }, // 3 isolation
    { from: [158, -18], c: [214, -104], tip: [236, -206] }, // 4 evidence
    { from: [158, -18], c: [100, -130], tip: [84, -238] }, // 5 correct code, wrong science
    { from: [-132, -96], c: [-188, -196], tip: [-206, -290] }, // 6 together
    { from: [-132, -96], c: [-70, -230], tip: [-30, -356] }, // 7 the two sentences
  ];
  const qpt = (b, u) => [
    (1 - u) * (1 - u) * b.from[0] + 2 * (1 - u) * u * b.c[0] + u * u * b.tip[0],
    (1 - u) * (1 - u) * b.from[1] + 2 * (1 - u) * u * b.c[1] + u * u * b.tip[1],
  ];

  class Motif extends Mob {
    constructor() {
      super();
      // the whole tree is sketched in pencil first; ink follows the story
      const sketch = el('g', { opacity: 0.5 });
      this.el.appendChild(sketch);
      this.sketch = sketch;
      this.branches = BRANCHES.map((b, i) => {
        const d = `M ${b.from[0]} ${b.from[1]} Q ${b.c[0]} ${b.c[1]} ${b.tip[0]} ${b.tip[1]}`;
        // the cross-bar is perpendicular to the branch at its tip
        const [px, py] = qpt(b, 0.97);
        const dx = b.tip[0] - px;
        const dy = b.tip[1] - py;
        const L = Math.hypot(dx, dy) || 1;
        const nx = (-dy / L) * 15;
        const ny = (dx / L) * 15;
        const barD = `M ${b.tip[0] - nx} ${b.tip[1] - ny} L ${b.tip[0] + nx} ${b.tip[1] + ny}`;
        sketch.appendChild(el('path', { d: d + ' ' + barD, fill: 'none', stroke: C.PENCIL, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-dasharray': '9 7', 'vector-effect': 'non-scaling-stroke' }));
        const path = el('path', { d, pathLength: 1, fill: 'none', stroke: C.INK, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
        const bar = el('path', { d: barD, stroke: C.INK, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
        // the chapter number sits beside the tip, on the outer side, so the
        // agent standing on the tip never hides it
        const side = b.tip[0] >= 0 ? 1 : -1;
        const lab = el('text', { x: b.tip[0] + side * 40, y: b.tip[1] + 18, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': MV.FONTS.script, 'font-size': 54, fill: C.SEPIA });
        lab.textContent = String(i + 1);
        this.el.appendChild(path);
        this.el.appendChild(bar);
        this.el.appendChild(lab);
        return { path, bar, lab };
      });
      Object.assign(this.init, { g: 0, labels: 1 });
    }
    draw(p) {
      const key = `${p.g.toFixed(4)}|${p.s.toFixed(4)}|${p.labels.toFixed(3)}`;
      if (key === this.last.key) return;
      this.last.key = key;
      // lines stay at least 4 px on screen, 7 px when the tree is page-sized
      const sw = Math.max(4, Math.min(7, 3 + 4 * p.s));
      this.sketch.setAttribute('opacity', (0.32 + 0.2 * clamp01(p.s)).toFixed(3));
      this.branches.forEach((b, i) => {
        const f = clamp01(p.g - i);
        b.path.setAttribute('stroke-width', sw);
        b.path.style.strokeDasharray = f >= 1 ? 'none' : `${f.toFixed(4)} 2`;
        b.path.style.strokeOpacity = f <= 0 ? 0 : 1;
        const barOn = clamp01((f - 0.9) / 0.1);
        b.bar.setAttribute('stroke-width', sw);
        b.bar.setAttribute('opacity', barOn.toFixed(3));
        b.lab.setAttribute('opacity', (barOn * p.labels).toFixed(3));
      });
    }
    // a tip in this mob's local coordinates
    static tip(i) {
      return BRANCHES[Math.max(0, Math.min(BRANCHES.length - 1, i))].tip;
    }
  }

  /*
   * The motif track: where the tree is and how grown it is at time t.
   * Keys are { t, x, y, s, g, o, labels, ax, ay, as, ao } with the agent's
   * position, size and opacity; between keys every number moves on a
   * smooth curve, so the tree flies between margin and page.
   */
  const CORNER = { x: -846, y: -430, s: 0.17, labels: 0 };
  const AGENT_CORNER_SIZE = 0.2;

  function motifOverlay(video) {
    const g = el('g');
    const tree = new Motif();
    const agent = new Creature({ color: C.TEAL, kind: 'agent', size: 0.3 });
    g.appendChild(tree.el);
    g.appendChild(agent.el);
    let keys = [];
    const api = {
      el: g,
      tree,
      agent,
      setKeys(k) {
        keys = k.slice().sort((a, b) => a.t - b.t);
      },
      render(t) {
        tree.reset();
        agent.reset();
        if (!keys.length || t < keys[0].t) {
          tree.p.o = 0;
          agent.p.o = 0;
        } else {
          let i = 0;
          while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
          const a = keys[i];
          const b = keys[i + 1];
          const u = b ? smooth(clamp01((t - a.t) / Math.max(1e-6, b.t - a.t))) : 0;
          const v = (k) => (b ? lerp(a[k], b[k], u) : a[k]);
          Object.assign(tree.p, { x: v('x'), y: v('y'), s: v('s'), g: v('g'), o: v('o'), labels: v('labels') });
          // the agent hops between tips on a small arc
          const hop = b && a.ax !== b.ax ? Math.sin(Math.PI * u) * 60 * v('s') : 0;
          Object.assign(agent.p, { x: v('ax'), y: v('ay') - hop, s: v('as'), o: v('ao'), mood: 0.6 });
        }
        tree.flush();
        agent.flush();
      },
    };
    video.overlay(api);
    return api;
  }

  // the agent's feet on tip i of a tree placed at (x, y) with scale s
  function perch(i, x, y, s, size) {
    const [tx, ty] = Motif.tip(i);
    return { ax: x + tx * s, ay: y + ty * s - 76 * size, as: size };
  }

  // the margin state after chapter n has been told
  function cornerKey(t, n, o = 1) {
    return Object.assign({ t, g: n, o }, CORNER, perch(n - 1, CORNER.x, CORNER.y, CORNER.s, AGENT_CORNER_SIZE), { ao: o });
  }
  function pageKey(t, n, { x = -440, y = 20, s = 1, o = 1, size = 0.42, labels = 1 } = {}) {
    return Object.assign({ t, x, y, s, g: n, o, labels }, perch(Math.max(0, Math.ceil(n) - 1), x, y, s, size), { ao: o });
  }

  /* ---------------------------------------------------------- Darwin */
  /*
   * Notebook B, p. 36 (1837), redrawn as a fresh drawing with the sketch's
   * layout (Darwin Online, CUL-DAR121): "I think" top left; the root, a
   * circled 1, bottom left; D on the left about halfway up; B at the top
   * centre with C just right of it and a little lower; A at the end of a
   * long branch running right. Barred tips are the living forms.
   */
  const DARWIN = [
    // [from, control, to, bar?, label?, label side]
    [[-250, 230], [-252, 170], [-226, 120], 0],
    [[-226, 120], [-290, 84], [-318, 24], 0],
    [[-318, 24], [-360, 14], [-392, -6], 1, 'D', 'left'],
    [[-318, 24], [-322, -20], [-336, -64], 1],
    [[-226, 120], [-160, 72], [-102, 40], 0],
    [[-102, 40], [60, 54], [262, 100], 1, 'A', 'right'],
    [[40, 66], [66, 96], [80, 132], 1],
    [[150, 82], [168, 60], [174, 36], 0],
    [[-102, 40], [-96, -26], [-62, -82], 0],
    [[-62, -82], [-104, -104], [-142, -132], 1],
    [[-62, -82], [-10, -136], [20, -170], 0],
    [[20, -170], [26, -214], [36, -252], 1, 'B', 'up'],
    [[20, -170], [62, -192], [96, -222], 1, 'C', 'right'],
    [[20, -170], [-6, -198], [-30, -230], 0],
    [[-62, -82], [34, -96], [118, -112], 1],
  ];

  function darwin({ color = C.INK } = {}) {
    const g = new Group();
    const segs = [];
    const bars = [];
    const labels = [];
    for (const [a, c, b, bar, label, side] of DARWIN) {
      const p = MV.path(`M ${a[0]} ${a[1]} Q ${c[0]} ${c[1]} ${b[0]} ${b[1]}`, { stroke: color, width: 4 });
      p.init.draw = 0;
      g.add(p);
      segs.push(p);
      if (bar) {
        const dx = b[0] - c[0];
        const dy = b[1] - c[1];
        const L = Math.hypot(dx, dy) || 1;
        const nx = (-dy / L) * 15;
        const ny = (dx / L) * 15;
        const ln = new MV.Line(b[0] - nx, b[1] - ny, b[0] + nx, b[1] + ny, { stroke: color, width: 4 });
        ln.init.draw = 0;
        g.add(ln);
        bars.push(ln);
        if (label) {
          const off = { left: [-40, 4], right: [40, 4], up: [0, -42] }[side];
          const t = new Text(label, { size: 58, font: 'script', color }).at(b[0] + off[0], b[1] + off[1]);
          t.init.o = 0;
          g.add(t);
          labels.push(t);
        }
      }
    }
    // the root: a circled, underlined 1
    const one = new Group(new Text('1', { size: 50, font: 'script', color }), MV.path('M -2 -30 C 26 -30 28 22 0 24 C -26 24 -26 -26 4 -30', { stroke: color, width: 3 }), MV.path('M -26 34 L 30 32', { stroke: color, width: 3 })).at(-282, 252);
    one.init.o = 0;
    g.add(one);
    const think = new Text('I think', { size: 96, font: 'script', color }).at(-300, -250);
    think.init.write = 0;
    g.add(think);
    g.segs = segs;
    g.bars = bars;
    g.labels = labels;
    g.one = one;
    g.think = think;
    // draw it as a pen would: root first, then each lineage
    g.grow = (dur = 3) => MV.seq(
      MV.A.FadeIn(one, { dur: 0.3 }),
      MV.lag(dur / (segs.length + 2), segs.map((s) => MV.A.Create(s, 0.5))),
      MV.par(MV.lag(0.06, bars.map((b) => MV.A.Create(b, 0.2))), MV.lag(0.12, labels.map((l) => MV.A.FadeIn(l, { dur: 0.35, from: 1.3 }))))
    );
    g.done = () => {
      segs.concat(bars).forEach((s) => (s.init.draw = 1));
      labels.concat([one]).forEach((l) => (l.init.o = 1));
      think.init.write = 1;
      return g;
    };
    return g;
  }

  /* ---------------------------------------------------------- Margin */
  function wrap(str, max) {
    const lines = [];
    let cur = '';
    for (const w of str.split(' ')) {
      if (cur && (cur + ' ' + w).length > max) {
        lines.push(cur);
        cur = w;
      } else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // The paper behind a beat: its title only, small, bottom-left.
  function paperOverlay(video, inserts) {
    const g = el('g');
    const tags = inserts.map((ins) => {
      const tg = el('g', { opacity: 0 });
      const lines = wrap(ins.title, ins.wrap || 23);
      const lh = 36;
      const top = 486 - (lines.length - 1) * lh;
      // a small dog-eared page glyph
      tg.appendChild(el('path', { d: `M -892 ${top - 22} h 22 l 10 10 v 30 h -32 z`, fill: C.SHEET, stroke: C.SEPIA, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      lines.forEach((ln, i) => {
        const t = el('text', { x: -846, y: top + i * lh, 'dominant-baseline': 'central', 'font-family': MV.FONTS.serif, 'font-style': 'italic', 'font-size': 30, fill: C.SEPIA });
        t.textContent = ln;
        tg.appendChild(t);
      });
      g.appendChild(tg);
      return { ins, tg, last: -1 };
    });
    let spans = null;
    const api = {
      el: g,
      render(t) {
        if (!spans) {
          const at = (id) => video.beats.find((b) => b.id === id);
          spans = tags.map((x) => {
            const a = at(x.ins.from);
            const b = at(x.ins.to || x.ins.from);
            if (!a || !b) throw new Error(`paper insert: unknown beat ${x.ins.from}`);
            return { x, t0: a.start + (x.ins.delay ?? 0.4), t1: b.start + b.dur - 0.2 };
          });
        }
        for (const { x, t0, t1 } of spans) {
          const o = clamp01((t - t0) / 0.6) * clamp01((t1 - t) / 0.5);
          if (Math.abs(o - x.last) > 0.001) {
            x.tg.setAttribute('opacity', o.toFixed(3));
            x.last = o;
          }
        }
      },
    };
    video.overlay(api);
    return api;
  }

  // Page numbers, bottom right, in the hand of whoever keeps the notebook.
  function folioOverlay(video, { skip = () => false } = {}) {
    const t = el('text', { x: 884, y: 486, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-family': MV.FONTS.script, 'font-size': 44, fill: C.SEPIA, opacity: 0 });
    let last = '';
    const api = {
      el: t,
      render(time) {
        const sc = video.sceneAt(time);
        const hide = skip(sc);
        const n = hide ? '' : String(video.scenes.filter((s) => !skip(s)).indexOf(sc) + 1);
        if (n !== last) {
          t.textContent = n ? `p. ${n}` : '';
          t.setAttribute('opacity', n ? 0.9 : 0);
          last = n;
        }
      },
    };
    video.overlay(api);
    return api;
  }

  /* ---------------------------------------------------------- Page turn */
  /*
   * The transition into every chapter: the leaf lifts from the right edge
   * and sweeps across. The new page shows to the right of the fold (the
   * scene world is clipped to it); the turning leaf is a flap of sheet with
   * an inked edge and a little pencil hatching along the fold.
   */
  class PageTurn extends Mob {
    constructor(clipTarget) {
      super();
      const id = `turn-${Math.random().toString(36).slice(2, 8)}`;
      this.clip = el('clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
      this.clipPoly = el('polygon', { points: '-2000,-2000 2000,-2000 2000,2000 -2000,2000' });
      this.clip.appendChild(this.clipPoly);
      this.el.appendChild(this.clip);
      this.flap = el('path', { fill: '#E9DDC3', stroke: C.INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' });
      this.fold = el('path', { fill: 'none', stroke: C.SEPIA, 'stroke-width': 3 });
      this.hatch = el('path', { fill: 'none', stroke: C.PENCIL, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.6 });
      this.el.appendChild(this.flap);
      this.el.appendChild(this.hatch);
      this.el.appendChild(this.fold);
      this.target = clipTarget;
      Object.assign(this.init, { k: 1 });
    }
    draw(p) {
      if (p.k === this.last.k) return;
      this.last.k = p.k;
      const k = clamp01(p.k);
      if (k >= 1) {
        if (this.target) this.target.removeAttribute('clip-path');
        this.flap.setAttribute('d', '');
        this.fold.setAttribute('d', '');
        this.hatch.setAttribute('d', '');
        return;
      }
      if (this.target) this.target.setAttribute('clip-path', `url(#${this.clip.getAttribute('id')})`);
      // fold line: bottom leads, top trails
      const xc = 1040 - k * 2240;
      const xt = xc + 90;
      const xb = xc - 90;
      // world space of the target is the scene world (camera at rest on cards)
      this.clipPoly.setAttribute('points', `${xt},-600 2000,-600 2000,600 ${xb},600`);
      const cw = 190 * Math.sin(Math.PI * Math.min(1, k * 1.05)) + 24;
      const bulge = 46;
      const d = `M ${xt} -560 L ${xb} 560 L ${xb - cw} 560 Q ${xc - cw - bulge} 0 ${xt - cw * 0.6} -560 Z`;
      this.flap.setAttribute('d', d);
      this.fold.setAttribute('d', `M ${xt} -560 L ${xb} 560`);
      let h = '';
      for (let i = 1; i < 14; i++) {
        const u = i / 14;
        const x = lerp(xt, xb, u);
        const y = lerp(-560, 560, u);
        h += `M ${(x - 10).toFixed(1)} ${y.toFixed(1)} l ${(-22 - 10 * Math.sin(i)).toFixed(1)} 12 `;
      }
      this.hatch.setAttribute('d', h);
    }
  }

  return { paintPaper, paintGrain, Motif, motifOverlay, cornerKey, pageKey, perch, CORNER, darwin, paperOverlay, folioOverlay, PageTurn, wrap };
})();
