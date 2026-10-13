// ───────────────────────────── drawing toolkit ─────────────────────────────
let g; // the active 2D context, always in 1920×1080 film coordinates

function font(size, fam = 'body', weight = 400, italic = false) {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT[fam]}`;
}
/** text with optional wrapping; returns the height used */
function text(str, x, y, o = {}) {
  const { size = 32, fam = 'body', weight = 400, italic = false, color = PAL.ink, align = 'left',
    base = 'alphabetic', alpha = 1, maxW = 0, lh = 1.3, track = 0, shadow = 0 } = o;
  if (alpha <= 0) return 0;
  g.save();
  g.globalAlpha *= alpha;
  g.font = font(size, fam, weight, italic);
  g.fillStyle = color; g.textAlign = align; g.textBaseline = base;
  if (track) g.letterSpacing = `${track}px`;
  if (shadow) { g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = shadow; }
  let lines = [str];
  if (maxW) {
    lines = [];
    for (const para of String(str).split('\n')) {
      let cur = '';
      for (const w of para.split(' ')) {
        const tryS = cur ? cur + ' ' + w : w;
        if (g.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS;
      }
      lines.push(cur);
    }
  }
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lh));
  g.restore();
  return lines.length * size * lh;
}
function measure(str, size, fam = 'body', weight = 400) { g.save(); g.font = font(size, fam, weight); const w = g.measureText(str).width; g.restore(); return w; }

function rrect(x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function panel(x, y, w, h, alpha = 1, o = {}) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  rrect(x, y, w, h, o.r ?? 18);
  g.fillStyle = o.fill ?? PAL.panel; g.fill();
  g.strokeStyle = o.stroke ?? hexA('#6f86b8', 0.22); g.lineWidth = 1.5; g.stroke();
  g.restore();
}
function line(x1, y1, x2, y2, col, w = 2, alpha = 1, dash) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  if (dash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
function arrow(x1, y1, x2, y2, col, o = {}) {
  const { w = 3, p = 1, head = 14, alpha = 1, dash } = o;
  if (p <= 0 || alpha <= 0) return;
  const x = lerp(x1, x2, p), y = lerp(y1, y2, p), a = Math.atan2(y2 - y1, x2 - x1);
  line(x1, y1, x, y, col, w, alpha, dash);
  g.save(); g.globalAlpha *= alpha; g.fillStyle = col; g.beginPath();
  g.moveTo(x, y); g.lineTo(x - head * Math.cos(a - 0.45), y - head * Math.sin(a - 0.45));
  g.lineTo(x - head * Math.cos(a + 0.45), y - head * Math.sin(a + 0.45)); g.closePath(); g.fill(); g.restore();
}
/** inhibition edge (⊣), used in signalling diagrams */
function brake(x1, y1, x2, y2, col, o = {}) {
  const { w = 3, alpha = 1 } = o, a = Math.atan2(y2 - y1, x2 - x1), n = 14;
  line(x1, y1, x2, y2, col, w, alpha);
  line(x2 - n * Math.sin(a), y2 + n * Math.cos(a), x2 + n * Math.sin(a), y2 - n * Math.cos(a), col, w + 1, alpha);
}
function glowDot(x, y, r, col, alpha = 1) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
}

/** a budding yeast cell. `hue` null → ancestral grey. */
function yeast(x, y, r, o = {}) {
  const { hue = null, alpha = 1, bud = 0, budAng = -0.6, glow = 0, sat = 70, light = 58, tag = 0, ring = 0 } = o;
  if (alpha <= 0 || r <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  const body = hue === null ? '#8f9bb6' : hsl(hue, sat, light);
  const deep = hue === null ? '#3e4864' : hsl(hue, sat, light * 0.42);
  if (glow) glowDot(x, y, r * 2.6, hue === null ? 'rgba(170,185,215,0.5)' : hsl(hue, 90, 60, 0.55), glow);
  const blob = (cx, cy, rr) => {
    const gr = g.createRadialGradient(cx - rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
    gr.addColorStop(0, hue === null ? '#d6dcea' : hsl(hue, sat, Math.min(92, light + 26)));
    gr.addColorStop(0.65, body); gr.addColorStop(1, deep);
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.92, 0.3, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = Math.max(1, rr * 0.06); g.stroke();
  };
  if (bud > 0) blob(x + Math.cos(budAng) * r * (0.75 + 0.55 * bud), y + Math.sin(budAng) * r * (0.75 + 0.55 * bud), r * 0.62 * bud);
  blob(x, y, r);
  if (r > 9) { // vacuole
    g.fillStyle = 'rgba(10,16,30,0.28)'; g.beginPath(); g.ellipse(x + r * 0.18, y + r * 0.12, r * 0.34, r * 0.3, 0, 0, TAU); g.fill();
  }
  if (ring) { g.strokeStyle = hexA(PAL.G, ring); g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * 1.35, 0, TAU); g.stroke(); }
  if (tag && r > 6) { // barcode tag: a tiny stack of coloured bars
    const bw = r * 0.95, bh = r * 0.42, bx = x - bw / 2, by = y - r * 0.12;
    g.globalAlpha *= tag;
    for (let i = 0; i < 6; i++) { g.fillStyle = [PAL.A, PAL.C, PAL.G, PAL.T][(hue * 7 + i * 3 + ((hue >> 2) % 5) * i) % 4]; g.fillRect(bx + i * bw / 6, by, bw / 6 - 1, bh); }
  }
  g.restore();
}

/** Erlenmeyer flask; returns the liquid polygon clip helper. */
function flaskPath(x, y, s, baffled = false) {
  const nw = 34 * s, bw = 150 * s, h = 230 * s, nh = 70 * s;
  g.beginPath();
  g.moveTo(x - nw, y - h); g.lineTo(x - nw, y - h + nh);
  g.lineTo(x - bw, y - 14 * s); g.quadraticCurveTo(x - bw - 4 * s, y, x - bw + 18 * s, y);
  if (baffled) { g.lineTo(x - 40 * s, y); g.lineTo(x - 30 * s, y - 12 * s); g.lineTo(x - 20 * s, y); g.lineTo(x + 20 * s, y); g.lineTo(x + 30 * s, y - 12 * s); g.lineTo(x + 40 * s, y); }
  g.lineTo(x + bw - 18 * s, y); g.quadraticCurveTo(x + bw + 4 * s, y, x + bw, y - 14 * s);
  g.lineTo(x + nw, y - h + nh); g.lineTo(x + nw, y - h);
}
function flask(x, y, s, o = {}) {
  const { level = 0.42, turb = 0.3, alpha = 1, t = 0, cells = 0, hues = null, label = '', tint = PAL.C, baffled = false, seed = 1, cellR = 4 } = o;
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  const h = 230 * s;
  // liquid
  g.save(); flaskPath(x, y, s, baffled); g.clip();
  const ly = y - h * level;
  const lg = g.createLinearGradient(0, ly, 0, y);
  lg.addColorStop(0, hexA(tint, 0.18 + turb * 0.25)); lg.addColorStop(1, hexA(tint, 0.32 + turb * 0.4));
  g.fillStyle = lg; g.beginPath(); g.moveTo(x - 200 * s, ly + Math.sin(t * 2) * 3 * s);
  for (let i = 0; i <= 20; i++) g.lineTo(x - 200 * s + i * 20 * s, ly + Math.sin(t * 2 + i * 0.7) * 3 * s);
  g.lineTo(x + 200 * s, y + 10); g.lineTo(x - 200 * s, y + 10); g.fill();
  // suspended cells
  const r = rng(seed);
  for (let i = 0; i < cells; i++) {
    const fx = r(), fy = r(), ph = r() * TAU;
    const yy = lerp(ly + 10 * s, y - 8 * s, fy) + Math.sin(t * 0.8 + ph) * 5 * s;
    const half = lerp(34, 140, (yy - (y - h + 70 * s)) / (h - 70 * s)) * s;
    const xx = x + (fx * 2 - 1) * half * 0.92 + Math.cos(t * 0.6 + ph) * 6 * s;
    const hue = hues ? hues(i) : null;
    g.fillStyle = hue === null ? 'rgba(200,210,235,0.75)' : (typeof hue === 'string' ? hue : hsl(hue, 80, 62, 0.95));
    g.beginPath(); g.arc(xx, yy, cellR * s * (0.8 + 0.4 * r()), 0, TAU); g.fill();
  }
  g.restore();
  // glass
  flaskPath(x, y, s, baffled);
  g.strokeStyle = 'rgba(200,220,255,0.75)'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 10; g.stroke();
  line(x - 46 * s, y - h, x + 46 * s, y - h, 'rgba(200,220,255,0.8)', 5);
  // highlight
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 6 * s; g.beginPath();
  g.moveTo(x - 20 * s, y - h + 90 * s); g.lineTo(x - 95 * s, y - 40 * s); g.stroke();
  if (label) text(label, x, y + 44 * s + 8, { size: Math.max(18, 22 * s), fam: 'mono', color: PAL.dim, align: 'center' });
  g.restore();
}

/** cryovial for the frozen fossil record */
function cryotube(x, y, s, col, o = {}) {
  const { alpha = 1, label = '', frost = 0 } = o;
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  g.fillStyle = col; rrect(x - 13 * s, y - 70 * s, 26 * s, 18 * s, 4 * s); g.fill();
  rrect(x - 11 * s, y - 52 * s, 22 * s, 58 * s, 9 * s);
  g.fillStyle = 'rgba(220,235,255,0.14)'; g.fill(); g.strokeStyle = 'rgba(220,235,255,0.7)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = hexA(col, 0.6); rrect(x - 9 * s, y - 20 * s, 18 * s, 24 * s, 7 * s); g.fill();
  if (frost) { g.fillStyle = `rgba(230,245,255,${0.35 * frost})`; rrect(x - 11 * s, y - 52 * s, 22 * s, 58 * s, 9 * s); g.fill(); }
  if (label) text(label, x, y + 30 * s, { size: 16 * s + 4, fam: 'mono', color: PAL.dim, align: 'center' });
  g.restore();
}

/** a nucleotide letter tile */
function baseTile(ch, x, y, size, o = {}) {
  const { alpha = 1, dim = false, glow = 0 } = o;
  if (alpha <= 0) return;
  const col = BASE_COL[ch] || PAL.dim;
  g.save(); g.globalAlpha *= alpha;
  if (glow) glowDot(x, y, size * 1.2, hexA(col, 0.6), glow);
  rrect(x - size * 0.42, y - size * 0.55, size * 0.84, size * 1.1, size * 0.14);
  g.fillStyle = dim ? 'rgba(40,52,80,0.6)' : hexA(col, 0.16); g.fill();
  g.strokeStyle = dim ? 'rgba(120,135,170,0.35)' : hexA(col, 0.75); g.lineWidth = 2; g.stroke();
  text(ch, x, y + size * 0.03, { size: size * 0.78, fam: 'mono', weight: 600, color: dim ? PAL.dim : col, align: 'center', base: 'middle' });
  g.restore();
}

/** a double helix seen from the side; bases coloured; optional highlighted window [h0,h1) */
function helix(x0, y, len, o = {}) {
  const { phase = 0, amp = 46, pitch = 260, seq = '', h0 = -1, h1 = -1, alpha = 1, step = 22, dimOut = 0.35 } = o;
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  const n = Math.floor(len / step);
  for (let i = 0; i < n; i++) { // rungs
    const x = x0 + i * step, a = (x - x0) / pitch * TAU + phase;
    const y1 = y + Math.sin(a) * amp, y2 = y - Math.sin(a) * amp;
    const ch = seq ? seq[i % seq.length] : BASES[(hash01(i, 3) * 4) | 0];
    const pair = { A: 'T', T: 'A', C: 'G', G: 'C' }[ch];
    const inWin = i >= h0 && i < h1;
    const k = h0 >= 0 && !inWin ? dimOut : 1;
    const depth = 0.55 + 0.45 * Math.abs(Math.cos(a));
    g.globalAlpha = alpha * k * depth;
    line(x, y1, x, (y1 + y2) / 2, BASE_COL[ch], 6);
    line(x, (y1 + y2) / 2, x, y2, BASE_COL[pair], 6);
  }
  for (const sgn of [1, -1]) { // backbones
    g.globalAlpha = alpha;
    g.strokeStyle = sgn > 0 ? 'rgba(220,230,255,0.9)' : 'rgba(150,170,215,0.75)'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath();
    for (let x = x0; x <= x0 + n * step; x += 4) { const a = (x - x0) / pitch * TAU + phase; const yy = y + sgn * Math.sin(a) * amp; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
    g.stroke();
  }
  g.restore();
}

/** a plot frame mapping data → pixels */
function plotFrame(box, xr, yr, o = {}) {
  const { x, y, w, h } = box;
  const X = v => x + (v - xr[0]) / (xr[1] - xr[0]) * w;
  const Y = v => y + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  const draw = (alpha = 1) => {
    if (alpha <= 0) return;
    g.save(); g.globalAlpha *= alpha;
    for (const [v, lab] of (o.yt || [])) {
      line(x, Y(v), x + w, Y(v), 'rgba(120,140,190,0.13)', 1);
      text(lab, x - 14, Y(v) + 7, { size: 20, fam: 'mono', color: PAL.dim, align: 'right' });
    }
    for (const [v, lab] of (o.xt || [])) {
      line(X(v), y + h, X(v), y + h + 8, PAL.faint, 2);
      text(lab, X(v), y + h + 34, { size: 20, fam: 'mono', color: PAL.dim, align: 'center' });
    }
    line(x, y + h, x + w, y + h, PAL.faint, 2);
    line(x, y, x, y + h, PAL.faint, 2);
    if (o.xl) text(o.xl, x + w / 2, y + h + 72, { size: 22, color: PAL.dim, align: 'center' });
    if (o.yl) { g.save(); g.translate(x - (o.ylOff ?? 92), y + h / 2); g.rotate(-Math.PI / 2); text(o.yl, 0, 0, { size: 22, color: PAL.dim, align: 'center' }); g.restore(); }
    g.restore();
  };
  return { X, Y, draw, box };
}
/** small label marking that a chart shows simulated data */
function simBadge(x, y, alpha = 1, msg = 'SIMULATED DATA · ILLUSTRATIVE') {
  if (alpha <= 0) return;
  const w = measure(msg, 15, 'mono') + 26;
  g.save(); g.globalAlpha *= alpha;
  rrect(x, y, w, 30, 15); g.fillStyle = 'rgba(255,191,71,0.1)'; g.fill(); g.strokeStyle = hexA(PAL.G, 0.45); g.lineWidth = 1.5; g.stroke();
  text(msg, x + 13, y + 20, { size: 15, fam: 'mono', color: PAL.G, track: 1 });
  g.restore();
}
/** labelled box node for diagrams */
function node(x, y, w, h, label, col, o = {}) {
  const { alpha = 1, glow = 0, sub = '', size = 26, fill = 0.14 } = o;
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  if (glow) glowDot(x, y, Math.max(w, h) * 0.9, hexA(col, 0.5), glow);
  rrect(x - w / 2, y - h / 2, w, h, 14); g.fillStyle = hexA(col, fill); g.fill();
  g.strokeStyle = hexA(col, 0.85); g.lineWidth = 2.5; g.stroke();
  text(label, x, y + (sub ? -4 : size * 0.35), { size, weight: 600, color: PAL.ink, align: 'center' });
  if (sub) text(sub, x, y + 22, { size: 17, fam: 'mono', color: PAL.dim, align: 'center' });
  g.restore();
}
function heading(t, num, title, alpha = 1) {
  if (!title || alpha <= 0) return;
  const a = alpha * env(t, 0.1, 1e9, 0.9);
  const dx = (1 - ease.out(clamp(t / 1.2))) * -30;
  text(num, 80 + dx, 74, { size: 20, fam: 'mono', color: PAL.G, alpha: a, track: 3 });
  text(title, 80 + dx, 128, { size: 54, fam: 'disp', color: PAL.ink, alpha: a });
}
/** text on a dark rounded backing, for labels laid over busy imagery */
function pill(str, x, y, o = {}) {
  const { size = 20, color = PAL.ink, alpha = 1, fam = 'body', align = 'left' } = o;
  if (alpha <= 0) return;
  const w = measure(str, size, fam) + 24, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.save(); g.globalAlpha *= alpha; rrect(x0, y - size - 6, w, size + 18, 10); g.fillStyle = 'rgba(5,10,22,0.86)'; g.fill(); g.restore();
  text(str, x0 + 12, y, { size, color, alpha, fam });
}
/** big number counter text */
function counter(v, x, y, o = {}) { text(o.fmt ? o.fmt(v) : fmtInt(v), x, y, { size: 64, fam: 'disp', color: PAL.ink, ...o }); }
