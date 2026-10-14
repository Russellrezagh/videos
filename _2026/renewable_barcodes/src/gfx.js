// ───────────────────────────── 2D drawing: type, thin lines, plots ─────────────────────────────
// Everything is drawn in 1920×1080 film coordinates on a light page. Plot areas sit in white panels,
// the way a figure sits on a journal page.
let g; // active 2D context

function font(size, fam = 'sans', weight = 400, italic = false) { return `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT[fam]}`; }
function text(str, x, y, o = {}) {
  const { size = 30, fam = 'sans', weight = 400, italic = false, color = PAL.ink, align = 'left', base = 'alphabetic', alpha = 1, maxW = 0, lh = 1.3, track = 0 } = o;
  if (alpha <= 0.002 || str === '' || str == null) return 0;
  g.save(); g.globalAlpha *= clamp(alpha);
  g.font = font(size, fam, weight, italic); g.fillStyle = color; g.textAlign = align; g.textBaseline = base;
  if (track) g.letterSpacing = `${track}px`;
  let lines = [String(str)];
  if (maxW) {
    lines = [];
    for (const para of String(str).split('\n')) {
      let cur = '';
      for (const w of para.split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; }
      lines.push(cur);
    }
  }
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lh));
  g.restore();
  return lines.length * size * lh;
}
function measure(str, size, fam = 'sans', weight = 400, italic = false) { g.save(); g.font = font(size, fam, weight, italic); const w = g.measureText(str).width; g.restore(); return w; }
function wrapCount(str, size, maxW, fam = 'sans') {
  g.save(); g.font = font(size, fam); let n = 1, cur = '';
  for (const w of String(str).split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > maxW && cur) { n++; cur = w; } else cur = t2; }
  g.restore(); return n;
}
/** typeset a formula: Latin letters italic, everything else upright; _x and ^x make sub/superscripts */
function math(str, x, y, o = {}) {
  const { size = 44, color = PAL.ink, alpha = 1, align = 'left' } = o;
  if (alpha <= 0.002) return 0;
  const toks = [];
  for (let i = 0; i < str.length; i++) {
    const word = (str.slice(i).match(/^(ln|exp|log|max|FDR)/) || [])[0];
    if (word) { toks.push({ s: word, mode: 'base', upright: true }); i += word.length - 1; continue; }
    const ch = str[i];
    if ((ch === '_' || ch === '^') && i + 1 < str.length) {
      let j = i + 1, s = '';
      if (str[j] === '{') { j++; while (j < str.length && str[j] !== '}') s += str[j++]; } else s = str[j];
      toks.push({ s, mode: ch === '_' ? 'sub' : 'sup' }); i = j; continue;
    }
    toks.push({ s: ch, mode: 'base' });
  }
  const piece = tk => {
    const sz = tk.mode === 'base' ? size : size * 0.62;
    const italic = /^[a-zA-Z]$/.test(tk.s) && !tk.upright;
    return { ...tk, sz, italic, w: 0 };
  };
  g.save(); g.globalAlpha *= clamp(alpha); g.fillStyle = color; g.textBaseline = 'alphabetic';
  const ps = toks.map(piece);
  let total = 0;
  for (const p of ps) { g.font = font(p.sz, 'math', 400, p.italic && p.s.length === 1); p.w = g.measureText(p.s).width + (p.italic ? p.sz * 0.04 : 0); total += p.w; }
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const p of ps) {
    g.font = font(p.sz, 'math', 400, p.italic && p.s.length === 1);
    const dy = p.mode === 'sub' ? size * 0.22 : p.mode === 'sup' ? -size * 0.42 : 0;
    g.fillText(p.s, cx, y + dy); cx += p.w;
  }
  g.restore();
  return total;
}
function line(x1, y1, x2, y2, col = PAL.ink, w = 2, alpha = 1, dash) {
  if (alpha <= 0.002) return;
  g.save(); g.globalAlpha *= clamp(alpha); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'butt';
  if (dash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
function poly(pts, col = PAL.ink, w = 2, alpha = 1, dash) {
  if (alpha <= 0.002 || pts.length < 2) return;
  g.save(); g.globalAlpha *= clamp(alpha); g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round';
  if (dash) g.setLineDash(dash);
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
}
function fillPoly(pts, col, alpha = 1) {
  if (alpha <= 0.002 || pts.length < 3) return;
  g.save(); g.globalAlpha *= clamp(alpha); g.fillStyle = col; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
}
function arrow(x1, y1, x2, y2, col = PAL.ink, o = {}) {
  const { w = 2, p = 1, head = 11, alpha = 1, curve: cv = 0 } = o;
  if (p <= 0 || alpha <= 0.002) return;
  const x = lerp(x1, x2, p), y = lerp(y1, y2, p), a = Math.atan2(y2 - y1, x2 - x1);
  if (cv) {
    const mx = (x1 + x) / 2 - (y - y1) * cv, my = (y1 + y) / 2 + (x - x1) * cv;
    g.save(); g.globalAlpha *= clamp(alpha); g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x, y); g.stroke(); g.restore();
  } else line(x1, y1, x, y, col, w, alpha);
  g.save(); g.globalAlpha *= clamp(alpha); g.fillStyle = col; g.beginPath();
  g.moveTo(x, y); g.lineTo(x - head * Math.cos(a - 0.38), y - head * Math.sin(a - 0.38)); g.lineTo(x - head * Math.cos(a + 0.38), y - head * Math.sin(a + 0.38)); g.closePath(); g.fill(); g.restore();
}
function rect(x, y, w, h, col, alpha = 1) { if (alpha <= 0.002) return; g.save(); g.globalAlpha *= clamp(alpha); g.fillStyle = col; g.fillRect(x, y, w, h); g.restore(); }
function frame(x, y, w, h, col = PAL.line, lw = 1.5, alpha = 1) { if (alpha <= 0.002) return; g.save(); g.globalAlpha *= clamp(alpha); g.strokeStyle = col; g.lineWidth = lw; g.strokeRect(x, y, w, h); g.restore(); }
function dot(x, y, r, col, alpha = 1) { if (alpha <= 0.002) return; g.save(); g.globalAlpha *= clamp(alpha); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }
function ring(x, y, r, col, w = 2, alpha = 1) { if (alpha <= 0.002) return; g.save(); g.globalAlpha *= clamp(alpha); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.restore(); }
/** a star marker, as in the paper's Muller diagrams */
function star(x, y, r, col, o = {}) {
  const { alpha = 1, edge = '#333', ew = 1 } = o;
  if (alpha <= 0.002) return;
  g.save(); g.globalAlpha *= clamp(alpha); g.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.44 : r, a = -Math.PI / 2 + i * Math.PI / 5; const px = x + rr * Math.cos(a), py = y + rr * Math.sin(a); i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fillStyle = col; g.fill(); if (ew) { g.lineWidth = ew; g.strokeStyle = edge; g.stroke(); } g.restore();
}
/** a white plot panel with a thin frame, like a figure placed on the page */
function panel(x, y, w, h, o = {}) {
  const { alpha = 1, fill = PAL.panel, edge = PAL.line } = o;
  if (alpha <= 0.002) return;
  rect(x, y, w, h, fill, alpha);
  if (edge) frame(x, y, w, h, edge, 1.5, alpha);
}
/** a label joined to the thing it names by a thin leader */
function callout(px, py, lx, ly, label, o = {}) {
  const { alpha = 1, color = PAL.ink, size = 22, sub = '', align = lx < px ? 'right' : 'left', fam = 'sans', dotCol } = o;
  if (alpha <= 0.002) return;
  const elbow = lx + (align === 'right' ? 10 : -10);
  poly([[px, py], [elbow, ly - 7], [lx + (align === 'right' ? 4 : -4), ly - 7]], PAL.faint, 1.5, alpha);
  dot(px, py, 3.5, dotCol || color, alpha);
  text(label, lx + (align === 'right' ? -6 : 6), ly, { size, color, align, alpha, fam });
  if (sub) text(sub, lx + (align === 'right' ? -6 : 6), ly + size * 1.08, { size: size * 0.8, color: PAL.dim, align, alpha, fam: 'sans' });
}
/** axes with light ticks; set o.grid for faint gridlines */
function axes(box, xr, yr, o = {}) {
  const { x, y, w, h } = box;
  const X = v => x + (v - xr[0]) / (xr[1] - xr[0]) * w;
  const Y = v => y + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  const draw = (alpha = 1) => {
    if (alpha <= 0.002) return;
    if (o.grid) { for (const [v] of o.yt || []) line(x, Y(v), x + w, Y(v), PAL.grid, 1, alpha); for (const [v] of o.xt || []) if (v !== xr[0]) line(X(v), y, X(v), y + h, PAL.grid, 1, alpha); }
    line(x, y + h, x + w, y + h, PAL.line, 1.6, alpha);
    line(x, y, x, y + h, PAL.line, 1.6, alpha);
    for (const [v, lab] of o.xt || []) { line(X(v), y + h, X(v), y + h + 7, PAL.line, 1.5, alpha); if (lab != null) text(lab, X(v), y + h + 28, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha }); }
    for (const [v, lab] of o.yt || []) { line(x - 7, Y(v), x, Y(v), PAL.line, 1.5, alpha); if (lab != null) text(lab, x - 13, Y(v) + 6, { size: 18, fam: 'mono', color: PAL.dim, align: 'right', alpha }); }
    if (o.xl) text(o.xl, x + w / 2, y + h + 62, { size: 21, color: PAL.dim, align: 'center', alpha });
    if (o.yl) text(o.yl, 0, 0, { size: 21, color: PAL.dim, alpha, _rot: true }) || rotText(o.yl, x - 56, y + h / 2, { size: 21, color: PAL.dim, alpha });
  };
  return { X, Y, draw, box, xr, yr };
}
function rotText(str, x, y, o = {}) {
  g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); text(str, 0, 0, { ...o, align: 'center', base: 'alphabetic' }); g.restore();
}
function curve(P, f, x0, x1, col, w = 3, alpha = 1, step, dash) {
  const pts = [], n = 200, dx = step || (x1 - x0) / n;
  for (let xv = x0; xv <= x1 + 1e-9; xv += dx) pts.push([P.X(xv), P.Y(f(xv))]);
  poly(pts, col, w, alpha, dash);
}
/** a short note in grey, used to flag simulated or schematic data */
function note(str, x, y, alpha = 1, align = 'left') { text(str, x, y, { size: 16, fam: 'mono', color: '#8a8780', alpha, align }); }
/** a DNA base in a square cell */
function baseBox(ch, x, y, s, o = {}) {
  const { alpha = 1, dim = false, hi = false, fill = false } = o;
  if (alpha <= 0.002) return;
  const col = dim ? PAL.faint : BASE_COL[ch] || PAL.dim;
  g.save(); g.globalAlpha *= clamp(alpha);
  if (fill) { g.fillStyle = col; g.globalAlpha *= hi ? 0.9 : 0.16; g.fillRect(x - s / 2, y - s / 2, s, s); g.globalAlpha = clamp(alpha); }
  g.strokeStyle = col; g.lineWidth = hi ? 2.6 : 1.5; g.strokeRect(x - s / 2, y - s / 2, s, s);
  g.restore();
  text(ch, x, y + s * 0.02, { size: s * 0.6, fam: 'mono', weight: 600, color: fill && hi ? '#fff' : (dim ? PAL.dim : col), align: 'center', base: 'middle', alpha });
}
/** a horizontal molecule drawn as coloured blocks with labels underneath */
function construct(x, y, parts, o = {}) {
  const { h = 30, alpha = 1, labels = true, size = 17 } = o;
  let cx = x;
  for (const p of parts) {
    const a = alpha * (p.alpha ?? 1);
    if (p.w > 0 && a > 0.002) {
      if (p.fill !== 0) rect(cx, y - h / 2, p.w, h, p.col, a * (p.fill ?? 0.9));
      if (p.edge) frame(cx, y - h / 2, p.w, h, p.col, 1.4, a);
      if (p.txt) text(p.txt, cx + p.w / 2, y + 1, { size: p.ts || size * 0.8, fam: 'mono', weight: 600, color: p.txtCol || '#fff', align: 'center', base: 'middle', alpha: a });
      if (labels && p.lab) text(p.lab, cx + p.w / 2, y + h / 2 + 24, { size, fam: 'mono', color: p.labCol || PAL.dim, align: 'center', alpha: a });
    }
    cx += p.w;
  }
  return cx;
}
/** a triangle (lox site), pointing right (+1) or left (-1), optionally with an "inactive" slash */
function triangle(x, y, s, dir, col, o = {}) {
  const { alpha = 1, dead = false, lw = 1.6 } = o;
  if (alpha <= 0.002) return;
  g.save(); g.globalAlpha *= clamp(alpha);
  g.beginPath();
  if (dir > 0) { g.moveTo(x - s / 2, y - s / 2); g.lineTo(x + s / 2, y); g.lineTo(x - s / 2, y + s / 2); }
  else { g.moveTo(x + s / 2, y - s / 2); g.lineTo(x - s / 2, y); g.lineTo(x + s / 2, y + s / 2); }
  g.closePath(); g.fillStyle = col; g.globalAlpha *= dead ? 0.28 : 1; g.fill();
  g.restore();
  if (dead) { line(x - s * 0.5, y + s * 0.5, x + s * 0.5, y - s * 0.5, PAL.ink, 2, alpha * 0.8); }
}
