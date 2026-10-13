// ───────────────────────────── scene kit: shared data, plots and teaching devices ─────────────────────────────
// Each scene is draw(t, c, D): t = seconds into the scene, c(i) = when narration line i starts, D = scene length.
// Visual beats are keyed to narration cues, so re-timing the voice re-times the picture.

const LT = LineageTracking.run();
const SUP = { '-1': '⁻¹', '-2': '⁻²', '-3': '⁻³', '-4': '⁻⁴', '-5': '⁻⁵', '-6': '⁻⁶', '-7': '⁻⁷', '-8': '⁻⁸', '0': '⁰', '7': '⁷', '8': '⁸', '9': '⁹', '10': '¹⁰' };
const pow10 = e => e === 0 ? '1' : '10' + (SUP[String(e)] || '^' + e);
const sHue = s => lerp(178, 335, inv(0.02, 0.11, s));

function drawLineages(P, upto, o = {}) {
  const { neutralA = 0.07, adaptA = 0.8, colorMix = 1, highlightAbove = null, onlyAbove = false, width = 1.6 } = o;
  const kMax = upto / LT.STEP;
  g.save(); g.lineJoin = 'round';
  for (const pass of ['neutral', 'adaptive']) {
    for (const l of LT.lines) {
      if (l.kind !== pass) continue;
      const col = pass === 'neutral' ? 'rgba(125,143,184,1)' : mixHex('#7d8fb8', '#' + hslToHex(sHue(l.s), 85, 62), colorMix);
      g.strokeStyle = col; g.globalAlpha = pass === 'neutral' ? neutralA : adaptA * (0.12 + 0.88 * inv(-5.6, -2, l.y[l.y.length - 1]));
      g.lineWidth = pass === 'neutral' ? 1.2 : width;
      g.beginPath();
      let started = false;
      for (let k = 0; k <= Math.ceil(kMax) && k < l.y.length; k++) {
        let yv = l.y[k], xv = k * LT.STEP;
        if (k > kMax) { const f = kMax - (k - 1); yv = lerp(l.y[k - 1], l.y[k], f); xv = upto; }
        if (yv < -8.5) { if (started) { g.lineTo(P.X(xv), P.Y(-7.5)); } break; }
        const px = P.X(xv), py = P.Y(Math.max(-7.5, yv));
        started ? g.lineTo(px, py) : g.moveTo(px, py); started = true;
      }
      g.stroke();
    }
  }
  g.restore();
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** drifting rain of nucleotide letters — the film's ambient texture */
function letterRain(t, alpha) {
  if (alpha <= 0) return;
  for (let col = 0; col < 48; col++) {
    const x = 20 + col * 40, speed = 18 + hash01(col, 1) * 30, off = hash01(col, 2) * 1400;
    for (let j = 0; j < 9; j++) {
      const y = ((off + t * speed + j * 150) % 1300) - 110;
      const ch = BASES[(hash01(col, j, Math.floor(t * 0.7 + j)) * 4) | 0];
      text(ch, x, y, { size: 22, fam: 'mono', color: BASE_COL[ch], alpha: alpha * (0.05 + 0.1 * hash01(col, j)), align: 'center' });
    }
  }
}

const BC_SEQ = 'TCGAATGCACTAGTTGCAAC';

let MOSAIC = null;
function mosaic() {
  if (MOSAIC) return MOSAIC;
  const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 500;
  const x = cv.getContext('2d'), im = x.createImageData(1000, 500), r = rng(5);
  for (let i = 0; i < 500000; i++) {
    const hue = r() * 360, l = 0.45 + r() * 0.25, s = 0.55 + r() * 0.35;
    const k = n => (n + hue / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
    im.data[i * 4] = f(0); im.data[i * 4 + 1] = f(8); im.data[i * 4 + 2] = f(4); im.data[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return (MOSAIC = cv);
}

let HEAT = null;
function heatColor(v) {
  const z = '#141d35';
  if (v >= 0) return v < 1.2 ? mixHex(z, '#ff8a3d', v / 1.2) : mixHex('#ff8a3d', '#ffe08a', clamp((v - 1.2) / 0.6));
  return mixHex(z, '#58a6ff', clamp(-v / 1.4));
}
function heatmap() {
  if (HEAT) return HEAT;
  const A = FitnessAtlas, cv = document.createElement('canvas'), nR = A.rowOrder.length, nC = ENVIRONMENTS.length;
  cv.width = nC; cv.height = nR;
  const x = cv.getContext('2d');
  A.rowOrder.forEach((ri, r) => A.F[ri].forEach((v, j) => { x.fillStyle = heatColor(v); x.fillRect(j, r, 1, 1); }));
  return (HEAT = cv);
}
const CAT_COL = { EC: PAL.ink, Glucose: PAL.G, Flask: PAL.C, Transfer: PAL.A, Salt: '#7fe3f0', Drug: PAL.T, Carbon: PAL.violet };

function drawHeat(x, y, w, h, alpha, cols = null) {
  const nC = cols ? cols : ENVIRONMENTS.length;
  g.save(); g.globalAlpha = alpha; g.imageSmoothingEnabled = false;
  g.drawImage(heatmap(), 0, 0, nC, FitnessAtlas.rowOrder.length, x, y, w, h); g.restore();
  // class labels
  let r0 = 0;
  for (const cl of MUTANT_CLASSES) {
    const yy = y + (r0 / 292) * h, hh = cl.n / 292 * h;
    g.save(); g.globalAlpha = alpha; g.fillStyle = cl.col; g.fillRect(x - 12, yy + 1, 7, Math.max(1, hh - 2)); g.restore();
    if (hh > 12) text(cl.label, x - 22, yy + hh / 2 + 6, { size: 17, color: PAL.dim, align: 'right', alpha });
    r0 += cl.n;
  }
}
function classRows(key) { let r0 = 0; for (const cl of MUTANT_CLASSES) { if (cl.key === key) return [r0, cl.n]; r0 += cl.n; } }

const LOTTERY = establishmentLottery(40, 0.05, 160, 3);

// ── teaching devices ──
const ZONE = { what: ['WHAT WE DO', PAL.C], why: ['WHY', PAL.A], without: ['WITHOUT IT', PAL.T] };
/** small uppercase label that opens a zone of the frame */
function zone(kind, x, y, alpha = 1, w = 0) {
  if (alpha <= 0) return;
  const [lab, col] = ZONE[kind];
  text(lab, x, y, { size: 19, fam: 'mono', weight: 600, color: col, alpha, track: 3 });
  if (w) line(x, y + 14, x + w, y + 14, hexA(col, 0.4), 1.5, alpha);
}
/** a reason, set in the display face: the film's answer to "why?" */
function reason(str, x, y, o = {}) {
  const { alpha = 1, size = 36, maxW = 760, color = PAL.ink, mark = '' } = o;
  if (alpha <= 0) return 0;
  const dx = (1 - ease.out(clamp(alpha))) * 24;
  if (mark) text(mark, x + dx, y, { size: size * 0.8, fam: 'mono', color: o.markColor || PAL.A, alpha });
  return text(str, x + dx + (mark ? size * 0.9 : 0), y, { size, fam: 'disp', color, alpha, maxW, lh: 1.18 });
}
/** the protocol rail: where this chapter sits in the method */
function rail(active, alpha = 1, o = {}) {
  if (alpha <= 0) return;
  const { x0 = 1080, y = 78, sp = 106, big = false } = o;
  const show = o.count ?? PROTOCOL.length;
  g.save(); g.globalAlpha *= alpha;
  line(x0, y, x0 + (show - 1) * sp, y, 'rgba(120,140,190,0.35)', 2);
  PROTOCOL.slice(0, show).forEach((st, i) => {
    const x = x0 + i * sp, on = active.includes(i), done = i < Math.min(...active, 99);
    const r = big ? 34 : 15;
    g.beginPath(); g.arc(x, y, r, 0, TAU);
    g.fillStyle = on ? PAL.G : done ? '#2a3a62' : PAL.bg; g.fill();
    g.strokeStyle = on ? PAL.G : st.ext ? hexA(PAL.violet, 0.8) : '#4a5a80'; g.lineWidth = 2; if (st.ext && !on) g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]);
    text(String(i + 1), x, y + (big ? 13 : 6), { size: big ? 34 : 16, fam: big ? 'disp' : 'mono', weight: 600, color: on ? '#0b1020' : st.ext ? PAL.violet : PAL.dim, align: 'center' });
    text(st.label, x, y + (big ? 72 : 38), { size: big ? 22 : 14, fam: 'mono', color: on ? PAL.G : PAL.dim, align: 'center' });
  });
  g.restore();
}
/** petri dish */
function plate(cx, cy, R, alpha = 1, agar = 'rgba(255,214,140,0.09)') {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  g.fillStyle = agar; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(220,232,255,0.55)'; g.lineWidth = 4; g.stroke();
  g.strokeStyle = 'rgba(220,232,255,0.15)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - 10, 0, TAU); g.stroke();
  g.restore();
}
function colony(x, y, r, col, alpha = 1) {
  if (alpha <= 0 || r <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  gr.addColorStop(0, '#fff7e8'); gr.addColorStop(1, col);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
}
/** chemostat: a vessel with medium dripping in and culture flowing out at the same rate */
function chemostat(x, y, s, t, alpha = 1) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha;
  const w = 150 * s, h = 210 * s;
  rrect(x - w / 2, y - h, w, h, 18 * s); g.strokeStyle = 'rgba(200,220,255,0.75)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = hexA(PAL.C, 0.3); rrect(x - w / 2 + 4, y - h * 0.62, w - 8, h * 0.62 - 4, 14 * s); g.fill();
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(200,210,235,0.75)'; g.beginPath(); g.arc(x - w / 2 + 12 + hash01(i, 1) * (w - 24), y - h * 0.58 + hash01(i, 2) * h * 0.52 + Math.sin(t + i) * 3, 3 * s, 0, TAU); g.fill(); }
  // inflow
  line(x - 20 * s, y - h - 60 * s, x - 20 * s, y - h + 10 * s, 'rgba(200,220,255,0.7)', 3);
  const drop = (t * 1.5) % 1;
  g.fillStyle = PAL.G; g.beginPath(); g.arc(x - 20 * s, y - h + 10 * s + drop * h * 0.3, 5 * s, 0, TAU); g.fill();
  // outflow at the liquid surface
  line(x + w / 2, y - h * 0.62 + 6, x + w / 2 + 70 * s, y - h * 0.62 + 6, 'rgba(200,220,255,0.7)', 3);
  g.fillStyle = hexA(PAL.C, 0.8); g.beginPath(); g.arc(x + w / 2 + 40 * s + drop * 30 * s, y - h * 0.62 + 6, 4 * s, 0, TAU); g.fill();
  g.restore();
}
/** two-sided comparison card frame */
function card(x, y, w, h, alpha = 1, tone = null) {
  panel(x, y, w, h, alpha, tone ? { fill: hexA(tone, 0.07), stroke: hexA(tone, 0.45) } : {});
}
/** a large cross or tick verdict */
function verdict(ok, x, y, alpha = 1, size = 54) {
  text(ok ? '✓' : '✕', x, y, { size, weight: 700, color: ok ? PAL.A : PAL.T, align: 'center', alpha });
}
