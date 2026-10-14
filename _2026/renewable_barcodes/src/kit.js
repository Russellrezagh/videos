// ───────────────────────────── shared pieces: populations, the real-data plots, glyphs ─────────────────────────────
const SCENES = {};
const POPS = { YPD: Pop('YPD'), YPA: Pop('YPA') };

// the raw-trajectory pictures (every sublineage above 0.1%), injected at build time as data URIs
const RAW_SRC = /*@RAW@*/ {};
const RAW_IMG = {};
let rawReady = false;
function loadRaw() {
  const names = Object.keys(RAW_SRC);
  if (!names.length) { rawReady = true; return Promise.resolve(); }
  return Promise.all(names.map(n => new Promise(res => {
    const im = new Image(); im.onload = () => { RAW_IMG[n] = im; res(); }; im.onerror = () => res(); im.src = RAW_SRC[n];
  }))).then(() => { rawReady = true; });
}

// ── the Muller diagram, drawn from the called clones (as in the paper's Figure 2) ──
/** draw population `pop` into `box`, revealing up to display-x `upto`; stars mark establishments */
function mullerDiagram(pop, box, upto, o = {}) {
  const { alpha = 1, stars = true, grid = false } = o;
  if (alpha <= 0.002) return null;
  const maxX = displayX(pop.nT - 1);
  const P = axes(box, [0, maxX], [0, 1]);
  const clipX = P.X(clamp(upto, 0, maxX));
  // grey barcoding bands
  for (let e = 1; e < pop.epochs; e++) {
    const x0 = P.X(displayX(e * PER - 1)), x1 = P.X(displayX(e * PER));
    if (x0 < clipX) rect(x0, box.y, Math.min(x1, clipX) - x0, box.h, '#000', alpha * 0.08);
  }
  g.save();
  g.beginPath(); g.rect(box.x - 1, box.y - 2, clipX - box.x + 1, box.h + 4); g.clip();
  // stack clones; ancestor stays white (the page shows through)
  for (const c of pop.clones) {
    const pts = [], low = [];
    for (let i = c.s; i < pop.nT; i++) { const k = i - c.s; const x = P.X(displayX(i)); pts.push([x, P.Y(c.lo[k] + c.F[k])]); low.push([x, P.Y(c.lo[k])]); }
    const poly2 = pts.concat(low.reverse());
    fillPoly(poly2, c.col, alpha * (c.childless ? c.alpha * 0.85 : c.alpha));
    if (c.childless) poly(pts, mixHex(c.col, '#000', 0.25), 0.6, alpha * 0.4);
  }
  g.restore();
  if (stars) for (const c of pop.clones) {
    const pos = (c.depth - 1) * PER + 5, k = pos - c.s;
    if (k < 0 || k >= c.F.length) continue;
    const x = P.X(displayX(pos));
    if (x > clipX) continue;
    star(x, P.Y(c.lo[k] + c.F[k] / 2), 6.5, c.col, { alpha: alpha * 0.95, edge: '#2a2a2a', ew: 0.8 });
  }
  // axis on top
  const xt = [];
  for (let e = 0; e <= pop.epochs; e++) xt.push([displayX(e * PER), e % 2 === 0 || pop.epochs <= 9 ? `${e + 1}` : null]);
  P.draw(alpha);
  for (const [v] of [[displayX(0)], [displayX((pop.epochs) * PER - 1)]]) {}
  return P;
}

// ── the fitness distribution at one timepoint (travelling-wave chapter, after Figure 3) ──
function waveFrame(pop, box, idx, o = {}) {
  const { alpha = 1, xr = [-0.4, pop.name === 'YPD' ? 3.2 : 5.4], mean = true } = o;
  const P = axes(box, xr, [0, 1], { xt: xrange(xr), yt: [[0, '0'], [0.5, ''], [1, '1']], xl: 'fitness relative to ancestor (%)', yl: 'frequency', grid: true });
  P.draw(alpha);
  const bins = pop.waveAt(idx).sort((a, b) => a.xa - b.xa);
  const bw = (xr[1] - xr[0]) / 40;
  const col = {};
  for (const b of bins) { const key = Math.round((b.xa - xr[0]) / bw); (col[key] = col[key] || []).push(b); }
  const w = P.X(xr[0] + bw) - P.X(xr[0]) - 1.5;
  // the ancestor (unmutated majority) as a column at fitness 0 — it shrinks as the wave advances
  const anc = pop.ancestor[idx] || 0;
  if (anc > 0.001) { const h = P.Y(0) - P.Y(anc); rect(P.X(0) - w / 2, P.Y(0) - h, w, h, '#efeee9', alpha); frame(P.X(0) - w / 2, P.Y(0) - h, w, h, PAL.faint, 1.2, alpha); }
  // each clone as a bar at its fitness, stacked where several share a fitness column
  for (const key in col) {
    let base = 0;
    const x0 = P.X(xr[0] + key * bw);
    for (const b of col[key].sort((a, b2) => b2.f - a.f)) {
      const h = (P.Y(0) - P.Y(b.f));
      rect(x0 + 0.75, P.Y(base) - h, w, h, b.col, alpha * Math.max(0.55, b.alpha));
      base += b.f;
    }
  }
  if (mean) {
    const mx = P.X(pop.meanFitnessAt(idx));
    line(mx, box.y, mx, box.y + box.h, PAL.ink, 2, alpha);
    text('mean', mx + 6, box.y + 20, { size: 15, fam: 'mono', color: PAL.ink, alpha });
  }
  return P;
}
function xrange([a, b]) { const t = []; for (let v = Math.ceil(a); v <= b; v++) t.push([v, String(v)]); return t; }

// ── the raw-trajectory picture in a framed white panel ──
function rawPanel(pop, box, o = {}) {
  const { alpha = 1, barcodeAt = -1 } = o;
  panel(box.x, box.y, box.w, box.h, { alpha });
  const im = RAW_IMG[pop.name];
  if (im) { g.save(); g.globalAlpha *= clamp(alpha); g.imageSmoothingEnabled = true; g.drawImage(im, box.x + 1, box.y + 1, box.w - 2, box.h - 2); g.restore(); }
  // generation axis underneath
  const P = axes(box, [0, displayX(pop.nT - 1)], [0, 1]);
  for (let e = 0; e <= pop.epochs; e += (pop.epochs > 9 ? 2 : 1)) line(P.X(displayX(e * PER)), box.y + box.h, P.X(displayX(e * PER)), box.y + box.h + 6, PAL.line, 1.4, alpha);
  text('generations →', box.x + box.w, box.y + box.h + 30, { size: 17, color: PAL.dim, align: 'right', alpha });
  text('frequency', box.x - 14, box.y + box.h / 2, { size: 17, color: PAL.dim, align: 'right', alpha });
  return box;
}

// ── glyphs ──
/** a yeast cell: an ellipse, optionally with a small bud */
function cell(x, y, r, o = {}) {
  const { alpha = 1, col = PAL.ink, fill = '#fff', bud = 0, lw = 2, mark = null } = o;
  if (alpha <= 0.002) return;
  g.save(); g.globalAlpha *= clamp(alpha);
  g.beginPath(); g.ellipse(x, y, r, r * 0.92, 0, 0, TAU); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = col; g.stroke();
  if (bud > 0) { g.beginPath(); g.ellipse(x + r * 0.86, y - r * 0.6, r * bud, r * bud * 0.92, 0, 0, TAU); g.fillStyle = fill; g.fill(); g.stroke(); }
  g.restore();
  if (mark) dot(x, y, r * 0.3, mark, alpha);
}
/** a string of coloured barcode blocks (a lineage's label) */
function barcodeStrip(x, y, cols, o = {}) {
  const { alpha = 1, bw = 26, h = 34, gap = 4, lox = true } = o;
  let cx = x;
  cols.forEach((c, i) => {
    if (lox && i > 0) { triangle(cx, y, h * 0.5, i % 2 ? -1 : 1, PAL.faint, { alpha: alpha * 0.8 }); cx += h * 0.5 + gap; }
    rect(cx, y - h / 2, bw, h, c, alpha * 0.92); frame(cx, y - h / 2, bw, h, mixHex(c, '#000', 0.2), 1, alpha);
    cx += bw + gap;
  });
  return cx;
}
/** a short DNA double helix, drawn as two sine strands with rungs */
function helix(x, y, w, o = {}) {
  const { alpha = 1, turns = 3, amp = 20, col = PAL.ink } = o;
  if (alpha <= 0.002) return;
  const n = 120, s1 = [], s2 = [];
  for (let i = 0; i <= n; i++) { const u = i / n, px = x + u * w, ph = u * turns * TAU; s1.push([px, y + Math.sin(ph) * amp]); s2.push([px, y + Math.sin(ph + Math.PI) * amp]); }
  poly(s1, col, 2, alpha); poly(s2, col, 2, alpha);
  for (let i = 4; i < n; i += 8) line(s1[i][0], s1[i][1], s2[i][0], s2[i][1], PAL.faint, 1.4, alpha * 0.8);
}
