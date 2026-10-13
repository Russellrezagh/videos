// ───────────────────────────── scenes, part 1: the experiment and the barcode ─────────────────────────────
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

const SCENES = {};

SCENES.intro = (t, c, D) => {
  letterRain(t, env(t, 0, D - 1, 2, 1) * 0.9);
  const cx = 960, cy = 540;
  const grow = prog(t, c(1) + 0.3, 7, ease.io);
  const count = Math.pow(2, grow * 9);
  const spin = t * 0.04;
  // the galaxy of barcoded descendants
  for (let i = 0; i < 512; i++) {
    const a = clamp(count - i);
    if (a <= 0) break;
    const r = 30 * Math.sqrt(i + 0.5) * (0.6 + 0.4 * grow), th = i * 2.39996 + spin;
    const hue = i === 0 ? 200 : Math.floor(hash01(i, 9) * 360);
    yeast(cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.86, 12 * (1 - 0.3 * grow) + 2, { hue, alpha: a * env(t, 0, D - 0.3, 0.5, 1.2) * (1 - 0.6 * prog(t, c(1) + 5.5, 1.4)), sat: 72 * Math.min(1, grow * 3), tag: grow > 0.5 ? 1 : 0 });
  }
  // the lone ancestor before the bloom
  const lone = 1 - prog(t, c(1), 2.5);
  if (lone > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    yeast(cx, cy, 70, { hue: null, alpha: lone * env(t, 0.2, 1e9, 1.5), bud: 0.35 + 0.25 * pulse, budAng: -0.7, glow: 0.6 + 0.4 * pulse });
  }
  // title
  const ta = env(t, c(1) + 5.5, D - 0.6, 1.4, 1.2);
  if (ta > 0) {
    g.save(); g.globalAlpha = ta * 0.95;
    const vg = g.createRadialGradient(cx, 500, 50, cx, 500, 760);
    vg.addColorStop(0, 'rgba(6,10,22,0.92)'); vg.addColorStop(1, 'rgba(6,10,22,0)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore();
    text('a film about counting evolution', cx, 360, { size: 22, fam: 'mono', color: PAL.G, align: 'center', alpha: ta, track: 6 });
    text('Evolution, Barcoded', cx, 500, { size: 150, fam: 'disp', italic: true, color: PAL.ink, align: 'center', alpha: ta });
    text('What an evolution experiment is, how DNA barcodes track 500,000 yeast lineages at once,', cx, 590, { size: 28, color: PAL.dim, align: 'center', alpha: ta });
    text('and what they revealed about the hidden side effects of adaptation.', cx, 630, { size: 28, color: PAL.dim, align: 'center', alpha: ta });
    text('LEVY ET AL. · NATURE 2015      KINSLER, GEILER-SAMEROTTE & PETROV · ELIFE 2020', cx, 720, { size: 18, fam: 'mono', color: PAL.faint, align: 'center', alpha: ta, track: 2 });
  }
};

SCENES.experiment = (t, c, D) => {
  const cols = [80, 525, 970, 1415], pw = 425, py = 190, ph = 400;
  const cards = [
    { at: c(1), title: 'Ancestor', sub: 'one clone, identical genomes' },
    { at: c(2), title: 'Environment', sub: 'glucose runs out every cycle' },
    { at: c(3), title: 'Generations', sub: '≈ 8 every 48 hours' },
    { at: c(5), title: 'Frozen fossil record', sub: '−80 °C, revivable at any time' },
  ];
  const lowA = 1 - 0.55 * prog(t, c(4), 1) + 0.55 * prog(t, c(5), 1);
  cards.forEach((cd, i) => {
    const a = env(t, cd.at, 1e9, 0.8) * lowA;
    if (a <= 0) return;
    const x = cols[i], lt = t - cd.at, y = py + (1 - ease.out(clamp(lt / 0.9))) * 40;
    panel(x, y, pw, ph, a);
    text(String(i + 1).padStart(2, '0'), x + 26, y + 46, { size: 20, fam: 'mono', color: PAL.G, alpha: a, track: 2 });
    text(cd.title, x + 26, y + 92, { size: 40, fam: 'disp', alpha: a });
    text(cd.sub, x + 26, y + 126, { size: 20, color: PAL.dim, alpha: a });
    const mx = x + pw / 2, my = y + 270;
    g.save(); g.globalAlpha *= a;
    if (i === 0) { // clone grows from one cell
      const n = 1 + Math.floor(prog(lt, 0.5, 3.5, ease.lin) * 6.99);
      const spots = [[0, 0], [62, 0], [-62, 0], [31, -54], [-31, -54], [31, 54], [-31, 54]];
      spots.slice(0, n).forEach(([dx, dy], j) => yeast(mx + dx, my + dy, 28, { hue: 208, sat: 35, light: 64, alpha: clamp((prog(lt, 0.5, 3.5, ease.lin) * 6.99 - j + 1)), bud: j === n - 1 ? 0.4 : 0 }));
    } else if (i === 1) { // flask with glucose hexagons being eaten
      const cyc = (lt % 7) / 7;
      flask(mx, my + 95, 0.72, { level: 0.5, turb: cyc, t, cells: Math.floor(10 + cyc * 70), seed: 3, cellR: 3.5 });
      for (let j = 0; j < 14; j++) {
        if (hash01(j, 4) < cyc) continue;
        const hx = mx + (hash01(j, 5) - 0.5) * 150, hy = my + 30 + (hash01(j, 6) - 0.5) * 60 + Math.sin(t + j) * 5;
        g.strokeStyle = PAL.G; g.lineWidth = 2.5; g.beginPath();
        for (let k = 0; k <= 6; k++) { const an = k / 6 * TAU + t * 0.4; k ? g.lineTo(hx + 9 * Math.cos(an), hy + 9 * Math.sin(an)) : g.moveTo(hx + 9 * Math.cos(an), hy + 9 * Math.sin(an)); }
        g.stroke();
      }
      text('⬡ glucose', x + pw - 26, y + 46, { size: 18, fam: 'mono', color: PAL.G, align: 'right' });
    } else if (i === 2) { // generation counter + doubling tree
      const gen = Math.floor(prog(lt, 0.3, 9, ease.in) * 1000);
      text(fmtInt(gen), mx, my - 46, { size: 72, fam: 'disp', align: 'center' });
      text('generations', mx, my - 12, { size: 18, fam: 'mono', color: PAL.dim, align: 'center' });
      const depth = 1 + Math.min(4, Math.floor(lt * 1.2));
      for (let d = 0; d < depth; d++) for (let k = 0; k < (1 << d); k++) {
        const nx = mx + ((k + 0.5) / (1 << d) - 0.5) * 300, ny = my + 22 + d * 26;
        if (d > 0) { const px = mx + ((Math.floor(k / 2) + 0.5) / (1 << (d - 1)) - 0.5) * 300; line(px, ny - 26, nx, ny, 'rgba(150,170,210,0.4)', 1.5); }
        g.fillStyle = hsl(208, 40, 70); g.beginPath(); g.arc(nx, ny, 5, 0, TAU); g.fill();
      }
    } else { // cryo rack
      for (let j = 0; j < 7; j++) cryotube(mx - 150 + j * 50, my + 40, 1.05, [PAL.A, PAL.C, PAL.G, PAL.T][j % 4], { frost: 0.6 + 0.4 * Math.sin(t + j), alpha: clamp(lt * 2 - j * 0.25) });
      for (let j = 0; j < 22; j++) { const fx = mx + (hash01(j, 8) - 0.5) * 360, fy = my - 90 + ((t * 20 + hash01(j, 9) * 200) % 200); text('*', fx, fy, { size: 18, color: 'rgba(220,240,255,0.5)', align: 'center' }); }
    }
    g.restore();
  });
  // 1,000 generations: humans vs this yeast
  const ca = env(t, c(4), c(5) + 0.4, 0.8, 0.8);
  if (ca > 0) {
    const bx = 300, by = 660, bw = 1320;
    text('1,000 generations', bx, by - 6, { size: 30, fam: 'disp', alpha: ca });
    const hp = prog(t, c(4) + 0.4, 2.2);
    g.save(); g.globalAlpha = ca;
    g.fillStyle = hexA(PAL.C, 0.75); g.fillRect(bx, by + 20, bw * hp, 34);
    text('Humans  ≈ 25,000 years', bx + 14, by + 46, { size: 22, weight: 600, color: '#071021', alpha: clamp(hp * 3 - 1) });
    g.fillStyle = PAL.G; g.fillRect(bx, by + 84, 3, 34);
    const ma = prog(t, c(4) + 2.4, 1);
    g.globalAlpha = ca * ma;
    g.strokeStyle = PAL.G; g.lineWidth = 2.5; g.beginPath(); g.arc(bx + 2, by + 101, 34, 0, TAU); g.stroke();
    line(bx + 26, by + 125, bx + 64, by + 168, PAL.G, 5);
    text('Yeast  ≈ 250 days, about 8 months  (1/36,500 of the human bar)', bx + 60, by + 112, { size: 22, color: PAL.G });
    g.restore();
  }
  // replicates
  const ra = env(t, c(6), 1e9, 0.8);
  if (ra > 0) {
    flask(330, 860, 0.55, { alpha: ra, cells: 30, t, seed: 9, level: 0.5, turb: 0.3, label: 'ancestor' });
    for (let j = 0; j < 6; j++) {
      const p = prog(t, c(6) + 0.3 + j * 0.15, 1.2);
      const fx = 620 + j * 190;
      line(330, 718, 330, 690, 'rgba(150,170,210,0.4)', 2, ra);
      line(330, 690, lerp(330, fx, p), 690, 'rgba(150,170,210,0.4)', 2, ra);
      arrow(fx, 690, fx, 735, 'rgba(150,170,210,0.6)', { w: 2, p: p, alpha: ra, head: 10 });
      flask(fx, 860, 0.5, { alpha: ra * p, cells: 34, t, seed: 20 + j, level: 0.5, turb: 0.4, hues: i => hash01(i, j) < 0.25 + 0.12 * j ? 40 + j * 52 : null, label: `pop ${j + 1}` });
    }
    text('Same start, independent histories', 1810, 628, { size: 32, fam: 'disp', align: 'right', alpha: ra });
    text("The best-known example: Lenski's E. coli long-term evolution experiment, running since 1988.", 1810, 662, { size: 19, color: PAL.dim, align: 'right', alpha: ra });
  }
};

SCENES.transfer = (t, c, D) => {
  // phase 1: one 48 h cycle on a growth curve
  const h = 48 * prog(t, c(1) + 0.3, c(3) - c(1) - 0.6, ease.lin);
  const bc = batchCulture(h);
  const fA = env(t, 0.2, c(6), 0.8, 0.8);
  const growthT = inv(7.7, 10.1, bc.logN);
  const xfer = prog(t, c(3) + 0.3, 3.2, ease.lin);
  flask(330, 760, 1.25, { alpha: fA, t, level: 0.44, turb: growthT * (1 - 0.2 * xfer), cells: Math.floor(8 + growthT * 150), seed: 4, label: 'flask A · 100 mL' });
  if (t > c(3)) {
    const fbA = env(t, c(3), c(6), 0.6, 0.8);
    flask(700, 760, 0.85, { alpha: fbA, t, level: 0.44, turb: 0.05, cells: Math.floor(2 + 8 * prog(t, c(3) + 2.6, 1)), seed: 5, label: 'fresh medium' });
    // pipette path
    const px = xfer < 0.35 ? 330 : xfer < 0.7 ? lerp(330, 700, ease.io((xfer - 0.35) / 0.35)) : 700;
    const dip = xfer < 0.35 ? Math.sin(xfer / 0.35 * Math.PI) : xfer > 0.7 ? Math.sin((xfer - 0.7) / 0.3 * Math.PI) : 0;
    const py = 360 + dip * 120;
    const pa = env(t, c(3), c(3) + 4, 0.4, 0.5);
    g.save(); g.globalAlpha = pa;
    g.fillStyle = 'rgba(220,232,255,0.85)'; rrect(px - 9, py - 230, 18, 200, 8); g.fill();
    g.beginPath(); g.moveTo(px - 9, py - 32); g.lineTo(px, py + 30); g.lineTo(px + 9, py - 32); g.fill();
    if (xfer > 0.3 && xfer < 0.85) { g.fillStyle = hexA(PAL.C, 0.8); rrect(px - 6, py - 90, 12, 60, 5); g.fill(); }
    g.restore();
    text('400 µL of 100 mL  →  1 : 250', 515, 890, { size: 30, fam: 'mono', color: PAL.G, align: 'center', alpha: env(t, c(3) + 0.8, c(6), 0.6, 0.6) });
  }
  // growth curve
  const P = plotFrame({ x: 1000, y: 230, w: 800, h: 330 }, [0, 48], [7.5, 10.4], {
    xt: [[0, '0 h'], [12, '12'], [24, '24'], [36, '36'], [48, '48 h']], yt: [[8, pow10(8)], [9, pow10(9)], [10, pow10(10)]], yl: 'cells (log scale)', ylOff: 78,
  });
  const gA = env(t, c(1), c(4) + 0.3, 0.8, 0.8);
  if (gA > 0) {
    P.draw(gA);
    g.save(); g.globalAlpha = gA;
    const phases = [[0, 3, 'lag'], [3, 18, 'fermentation'], [18, 22, 'diauxic shift'], [22, 48, 'respiration']];
    phases.forEach(([a, b, lab], i) => {
      if (h < a) return;
      g.fillStyle = i % 2 ? 'rgba(88,166,255,0.06)' : 'rgba(255,191,71,0.05)';
      g.fillRect(P.X(a), P.box.y, P.X(Math.min(b, h)) - P.X(a), P.box.h);
      text(lab, (P.X(a) + P.X(b)) / 2, P.box.y - 12, { size: 17, fam: 'mono', color: PAL.dim, align: 'center', alpha: clamp((h - a) / 2) });
    });
    g.strokeStyle = PAL.G; g.lineWidth = 2.5; g.setLineDash([6, 6]); g.beginPath();
    for (let x = 0; x <= h; x += 0.25) { const v = batchCulture(x).glucose; const yy = P.Y(lerp(7.5, 10.4, v * 0.94)); x ? g.lineTo(P.X(x), yy) : g.moveTo(P.X(x), yy); }
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = PAL.C; g.lineWidth = 4; g.beginPath();
    for (let x = 0; x <= h; x += 0.25) { const yy = P.Y(batchCulture(x).logN); x ? g.lineTo(P.X(x), yy) : g.moveTo(P.X(x), yy); }
    g.stroke();
    glowDot(P.X(h), P.Y(bc.logN), 18, hexA(PAL.C, 0.9));
    text('— cells', P.box.x + P.box.w - 16, P.box.y + P.box.h - 46, { size: 19, fam: 'mono', color: PAL.C, align: 'right' });
    text('- - glucose', P.box.x + P.box.w - 16, P.box.y + P.box.h - 20, { size: 19, fam: 'mono', color: PAL.G, align: 'right' });
    g.restore();
  }
  // sawtooth over five cycles + the 2^8 identity
  const sA = env(t, c(4), c(6), 0.8, 0.8);
  if (sA > 0) {
    const S = plotFrame({ x: 1000, y: 230, w: 800, h: 330 }, [0, 10], [7.5, 10.4], {
      xt: [[0, 'day 0'], [2, '2'], [4, '4'], [6, '6'], [8, '8'], [10, '10']], yt: [[8, pow10(8)], [9, pow10(9)], [10, pow10(10)]], yl: 'cells (log scale)', ylOff: 78,
    });
    S.draw(sA);
    const until = 10 * prog(t, c(4) + 0.3, 4, ease.lin);
    g.save(); g.globalAlpha = sA; g.strokeStyle = PAL.C; g.lineWidth = 3.5; g.beginPath();
    for (let x = 0; x <= until; x += 0.02) { const yy = S.Y(batchCulture((x % 2) * 24).logN); x ? g.lineTo(S.X(x), yy) : g.moveTo(S.X(x), yy); }
    g.stroke(); g.restore();
    text('250 ≈ 2⁸   →   ≈ 8 generations per cycle', 1400, 680, { size: 38, fam: 'disp', align: 'center', alpha: sA * env(t, c(4) + 0.6, 1e9, 0.8) });
    const ta = env(t, c(5), 1e9, 0.6);
    for (let k = 0; k < 5; k++) {
      const at = c(5) + 0.4 + k * 0.45, drop = prog(t, at, 0.6, ease.out);
      cryotube(S.X(2 * k + 2), 790 + (1 - drop) * -50, 0.9, [PAL.A, PAL.C, PAL.G, PAL.T, PAL.violet][k], { alpha: sA * ta * drop, label: `T${k + 1}`, frost: 0.7 });
    }
    text('bottleneck ≈ 5–7 × 10⁷ cells', S.X(0), 760, { size: 20, fam: 'mono', color: PAL.dim, alpha: sA * ta });
  }
  // mutations
  const mA = env(t, c(6), c(7) + 0.2, 0.8, 0.6);
  if (mA > 0) {
    text('each division: a small chance of a copying error', 960, 260, { size: 34, fam: 'disp', align: 'center', alpha: mA });
    const kinds = [];
    for (let i = 0; i < 84; i++) { const u = hash01(i, 77); kinds.push(u < 0.07 ? 'ben' : u < 0.36 ? 'del' : 'neu'); }
    kinds.forEach((k, i) => {
      const x = 330 + (i % 21) * 60, y = 360 + Math.floor(i / 21) * 70;
      const a = mA * clamp(prog(t, c(6) + 0.4, 2.5, ease.lin) * 84 - i);
      const hue = k === 'ben' ? 150 : k === 'del' ? 350 : null;
      yeast(x, y, 20, { hue, sat: k === 'del' ? 40 : 75, light: k === 'del' ? 38 : 58, alpha: a, glow: k === 'ben' ? 0.6 + 0.4 * Math.sin(t * 3 + i) : 0 });
    });
    const la = mA * prog(t, c(6) + 3, 1);
    [['no effect (most)', null, 420], ['harmful', 350, 860], ['beneficial (rare)', 150, 1300]].forEach(([lab, hue, x]) => {
      yeast(x, 690, 14, { hue, sat: hue === 350 ? 40 : 75, light: hue === 350 ? 38 : 58, alpha: la });
      text(lab, x + 28, 698, { size: 24, color: PAL.dim, alpha: la });
    });
  }
  const xA = env(t, c(7), 1e9, 0.8);
  if (xA > 0) {
    const Q = plotFrame({ x: 330, y: 250, w: 1250, h: 420 }, [0, 500], [-6.3, 0.2], {
      xt: [[0, '0'], [100, '100'], [200, '200'], [300, '300'], [400, '400'], [500, '500 generations']], yt: [[-6, pow10(-6)], [-4, pow10(-4)], [-2, pow10(-2)], [0, '1']], yl: 'mutant frequency', ylOff: 80,
    });
    Q.draw(xA);
    const until = 500 * prog(t, c(7) + 0.4, 5, ease.io), x0 = 1e-6, s = 0.05;
    g.save(); g.globalAlpha = xA; g.strokeStyle = PAL.A; g.lineWidth = 5; g.beginPath();
    for (let x = 0; x <= until; x += 2) { const e = Math.exp(s * x), f = x0 * e / (1 - x0 + x0 * e); const yy = Q.Y(Math.log10(f)); x ? g.lineTo(Q.X(x), yy) : g.moveTo(Q.X(x), yy); }
    g.stroke(); g.restore();
    line(Q.X(0), Q.Y(Math.log10(0.5)), Q.X(500), Q.Y(Math.log10(0.5)), 'rgba(234,240,251,0.35)', 1.5, xA, [8, 8]);
    const t50 = Math.log((1 - x0) / x0) / s;
    const ma = xA * prog(t, c(7) + 3.2, 1);
    glowDot(Q.X(t50), Q.Y(Math.log10(0.5)), 26, hexA(PAL.A, 0.9), ma);
    text(`half the population after ≈ ${Math.round(t50 / 10) * 10} generations`, Q.X(t50) + 24, Q.Y(Math.log10(0.5)) + 44, { size: 24, color: PAL.ink, alpha: ma });
    text('s = 5% per generation, starting at 1 cell in a million', Q.X(10), Q.Y(-0.6), { size: 24, fam: 'mono', color: PAL.A, alpha: xA });
  }
};

SCENES.invisible = (t, c, D) => {
  const P = plotFrame({ x: 220, y: 200, w: 1480, h: 610 }, [0, 112], [-7.5, 0], {
    xt: [[0, '0'], [16, '16'], [32, '32'], [48, '48'], [64, '64'], [80, '80'], [96, '96'], [112, '112 generations']],
    yt: [[-7, pow10(-7)], [-6, pow10(-6)], [-5, pow10(-5)], [-4, pow10(-4)], [-3, pow10(-3)], [-2, '1%'], [-1, '10%'], [0, '100%']], yl: 'lineage frequency', ylOff: 110,
  });
  const fade = env(t, 0, c(3) + 0.6, 0.6, 0.8);
  P.draw(fade);
  const upto = 112 * prog(t, 0.3, 6, ease.io);
  g.save(); g.globalAlpha = fade;
  drawLineages(P, upto, { colorMix: 1, neutralA: 0.09 });
  // the fog of undetectability
  const fogA = 0.92 - 0.62 * prog(t, c(1) + 1, 3);
  g.fillStyle = `rgba(8,16,31,${fogA})`; g.fillRect(P.box.x + 2, P.Y(-2), P.box.w, P.Y(-7.5) - P.Y(-2));
  for (let i = 0; i < 40; i++) glowDot(P.box.x + hash01(i, 1) * P.box.w + Math.sin(t * 0.3 + i) * 30, P.Y(-2) + 40 + hash01(i, 2) * 520, 140, `rgba(30,44,74,${0.25 * fogA})`);
  g.save(); g.beginPath(); g.rect(P.box.x, P.box.y - 10, P.box.w + 10, P.Y(-2) - P.box.y + 10); g.clip();
  drawLineages(P, upto, { colorMix: 1, neutralA: 0, adaptA: 1, width: 3 });
  g.restore();
  g.restore();
  line(P.box.x, P.Y(-2), P.box.x + P.box.w, P.Y(-2), PAL.G, 2.5, fade, [12, 8]);
  text('detection limit of whole-population sequencing ≈ 1%', P.box.x + 20, P.Y(-2) - 14, { size: 22, fam: 'mono', color: PAL.G, align: 'left', alpha: fade * prog(t, 1, 1) });
  text('below the line, every lineage is invisible', P.box.x + 24, P.Y(-2) + 44, { size: 26, fam: 'disp', italic: true, color: PAL.dim, alpha: fade * env(t, 2, c(1) + 1.5, 1, 1) });
  simBadge(P.box.x + P.box.w - 330, P.box.y - 40, fade * 0.9);
  // two fates
  const fa = env(t, c(2), c(3), 0.7, 0.6);
  if (fa > 0) {
    const lost = LT.lines.find(l => l.kind === 'neutral' && l.y[14] > -7.6 && l.y[14] < -6.5 && l.y[22] < -8.9);
    const peakFall = LT.lines.filter(l => l.kind === 'adaptive').map(l => ({ l, pk: Math.max(...l.y), end: l.y[l.y.length - 1] })).filter(o => o.pk > -5.3).sort((a, b) => (b.pk - b.end) - (a.pk - a.end))[0];
    const hl = (l, col, lab, dx, dy) => {
      if (!l) return;
      g.save(); g.globalAlpha = fa; g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 16; g.beginPath();
      let last = null;
      for (let k = 0; k < l.y.length; k++) { if (l.y[k] < -8.5) { g.lineTo(P.X(k * 4), P.Y(-7.5)); last = [k * 4, -7.5]; break; } const p = [P.X(k * 4), P.Y(l.y[k])]; k ? g.lineTo(...p) : g.moveTo(...p); last = [k * 4, l.y[k]]; }
      g.stroke(); g.restore();
      text(lab, P.X(last[0]) + dx, P.Y(last[1]) + dy, { size: 26, weight: 600, color: col, alpha: fa });
    };
    hl(lost, '#ff8f9c', 'lost to chance (drift)', -120, 40);
    if (peakFall) hl(peakFall.l, '#7ef0c4', 'beneficial, but outcompeted', -390, 50);
  }
  // give every cell a name
  const na = env(t, c(3) + 0.4, 1e9, 0.9);
  if (na > 0) {
    for (let i = 0; i < 13; i++) {
      const x = 240 + i * 120, y = 520 + Math.sin(t * 1.4 + i) * 10, a = na * prog(t, c(3) + 0.6 + i * 0.12, 0.6);
      const hue = (i * 137) % 360;
      yeast(x, y, 38, { hue, alpha: a, tag: prog(t, c(3) + 2.5 + i * 0.1, 0.5), glow: 0.4 });
      text(Barcode.random(rng(i + 40)).slice(0, 8), x, y + 78, { size: 15, fam: 'mono', color: hsl(hue, 70, 70), align: 'center', alpha: a * prog(t, c(3) + 2.5 + i * 0.1, 0.5) });
    }
    text('…give every cell a name.', 960, 380, { size: 64, fam: 'disp', italic: true, align: 'center', alpha: na * prog(t, c(3) + 4, 1) });
  }
};

const BC_SEQ = 'TCGAATGCACTAGTTGCAAC';
SCENES.barcode = (t, c, D) => {
  // a supermarket barcode dissolves into DNA
  const sb = env(t, 0, c(1) + 0.8, 0.6, 1);
  if (sb > 0) {
    const morph = prog(t, c(0) + 1.6, 1.8);
    for (let i = 0; i < 40; i++) {
      const w = 4 + (hash01(i, 31) * 3 | 0) * 4, x = 700 + i * 13;
      const ch = BASES[(hash01(i, 32) * 4) | 0];
      g.save(); g.globalAlpha = sb;
      g.fillStyle = morph > 0 ? mixHex('#f2f5fb', BASE_COL[ch], morph) : '#f2f5fb';
      g.fillRect(x, 300 + morph * 40 * Math.sin(i), w * (1 - morph * 0.4), 180 - morph * 60);
      g.restore();
    }
    text('a barcode, but written in DNA', 960, 560, { size: 34, fam: 'disp', italic: true, align: 'center', alpha: sb * prog(t, c(0) + 1.6, 1) });
  }
  // helix with a highlighted 20-letter window
  const hxA = env(t, c(1) + 0.5, c(3) + 0.4, 0.9, 0.8) + env(t, c(5), 1e9, 0.8);
  const seq = Barcode.FLANK_L.repeat(4) + BC_SEQ + Barcode.FLANK_R.repeat(4);
  const win0 = 30;
  helix(80, 290, 1760, { phase: t * 0.6, seq: seq.slice(2), h0: win0, h1: win0 + 20, alpha: Math.min(1, hxA), step: 22, amp: 48, pitch: 300 });
  // letter tiles: flank · random 20 · flank
  const tilesA = env(t, c(1) + 1.2, c(3) + 0.4, 0.8, 0.8);
  if (tilesA > 0) {
    const sz = 52, sp = 60, x0 = 960 - (28 * sp) / 2 + sp / 2;
    for (let i = 0; i < 28; i++) {
      const x = x0 + i * sp, inBC = i >= 4 && i < 24;
      let ch;
      if (!inBC) ch = (i < 4 ? Barcode.FLANK_L.slice(-4) : Barcode.FLANK_R.slice(0, 4))[i < 4 ? i : i - 24];
      else {
        const j = i - 4, lockAt = c(1) + 2.2 + j * 0.13;
        ch = t >= lockAt ? BC_SEQ[j] : BASES[(hash01(j, Math.floor(t * 14)) * 4) | 0];
      }
      baseTile(ch, x, 470, sz, { alpha: tilesA, dim: !inBC, glow: inBC && Math.abs(t - (c(1) + 2.2 + (i - 4) * 0.13)) < 0.25 ? 1 : 0 });
    }
    const lab = (s, x, col) => text(s, x, 550, { size: 19, fam: 'mono', color: col, align: 'center', alpha: tilesA, track: 1 });
    lab('fixed flank', x0 + 1.5 * sp, PAL.dim); lab('20 random nucleotides', 960, PAL.G); lab('fixed flank', x0 + 25.5 * sp, PAL.dim);
    line(x0 + 3.5 * sp + 4, 522, x0 + 23.5 * sp - 4, 522, hexA(PAL.G, 0.6), 2, tilesA);
  }
  // 4^20
  const nA = env(t, c(2), c(3) + 0.4, 0.8, 0.8);
  if (nA > 0) {
    const p = prog(t, c(2) + 0.8, 4.5, ease.in);
    text('4 × 4 × 4 × … × 4  =  4²⁰  =', 960, 660, { size: 34, fam: 'mono', color: PAL.dim, align: 'center', alpha: nA });
    text(fmtInt(Math.pow(4, 20) * p), 960, 770, { size: 96, fam: 'disp', color: PAL.ink, align: 'center', alpha: nA });
    text('possible barcodes, for about half a million lineages', 960, 830, { size: 26, color: PAL.dim, align: 'center', alpha: nA * prog(t, c(2) + 4, 1) });
  }
  // inheritance: one barcoded cell → a lineage
  const trA = env(t, c(3) + 0.3, c(5) - 0.2, 0.9, 0.8);
  if (trA > 0) {
    const hue = 168, gens = 4, gp = prog(t, c(3) + 0.8, 5, ease.lin) * (gens + 0.99);
    const nodeXY = (d, k) => [560 + ((k + 0.5) / (1 << d) - 0.5) * 760, 230 + d * 135];
    for (let d = 0; d <= gens; d++) for (let k = 0; k < (1 << d); k++) {
      const a = clamp(gp - d) * trA * (1 - 0.7 * prog(t, c(4) + 0.5, 1.5));
      if (a <= 0) continue;
      const [x, y] = nodeXY(d, k);
      if (d > 0) { const [px, py] = nodeXY(d - 1, k >> 1); line(px, py + 26, x, y - 26, hsl(hue, 60, 60, 0.5), 2, a); }
      yeast(x, y, Math.max(18, 34 - d * 4), { hue, alpha: a, tag: 1, bud: d === Math.floor(gp) ? (gp % 1) * 0.6 : 0 });
    }
    text(BC_SEQ, 560, 175, { size: 26, fam: 'mono', color: hsl(hue, 70, 70), align: 'center', alpha: trA * (1 - 0.7 * prog(t, c(4) + 0.5, 1.5)) });
    const facts = [['copied at every division', c(3) + 1.5], ['fitness effect: none', c(3) + 3.5], ['every descendant shares it', c(4)]];
    facts.forEach(([s, at], i) => {
      const a = trA * prog(t, at, 0.8) * (1 - 0.7 * prog(t, c(4) + 0.5, 1.5));
      text('✓', 1080, 300 + i * 90, { size: 34, color: PAL.A, alpha: a });
      text(s, 1130, 300 + i * 90, { size: 34, fam: 'disp', alpha: a });
    });
    // many founders → many lineages
    const fA = trA * prog(t, c(4) + 0.8, 1.5);
    if (fA > 0) {
      for (let f = 0; f < 6; f++) {
        const hue2 = (f * 61 + 20) % 360, fx = 260 + f * 280, fy = 720;
        const n = Math.floor(1 + prog(t, c(4) + 1 + f * 0.2, 3, ease.lin) * 18);
        for (let i = 0; i < n; i++) { const r = 16 * Math.sqrt(i), th = i * 2.4; yeast(fx + Math.cos(th) * r * 1.5, fy + Math.sin(th) * r * 1.2, 13, { hue: hue2, alpha: fA, tag: 1 }); }
        text(Barcode.random(rng(f + 3)).slice(0, 10) + '…', fx, fy + 120, { size: 18, fam: 'mono', color: hsl(hue2, 70, 70), align: 'center', alpha: fA });
      }
      text('one barcode = one lineage', 960, 540, { size: 46, fam: 'disp', italic: true, align: 'center', alpha: fA });
    }
  }
  // reading them all: primers on the fixed flanks
  const rA = env(t, c(5) + 0.3, 1e9, 0.8);
  if (rA > 0) {
    const lx = 80 + 14 * 22, rx = 80 + 66 * 22;
    arrow(lx - 150, 200, lx + 20, 200, PAL.A, { w: 6, p: prog(t, c(5) + 0.6, 1), alpha: rA, head: 18 });
    arrow(rx + 150, 380, rx - 20, 380, PAL.A, { w: 6, p: prog(t, c(5) + 0.6, 1), alpha: rA, head: 18 });
    text('primer', lx - 150, 186, { size: 20, fam: 'mono', color: PAL.A, alpha: rA });
    text('primer', rx + 150, 410, { size: 20, fam: 'mono', color: PAL.A, alpha: rA, align: 'right' });
    const cyc = Math.floor(prog(t, c(5) + 1.6, 5, ease.lin) * 7);
    const n = 1 << cyc;
    for (let i = 0; i < Math.min(n, 64); i++) {
      const x = 360 + (i % 16) * 76, y = 520 + Math.floor(i / 16) * 52;
      g.save(); g.globalAlpha = rA;
      g.fillStyle = 'rgba(147,162,195,0.45)'; g.fillRect(x, y, 18, 12); g.fillRect(x + 50, y, 18, 12);
      for (let j = 0; j < 4; j++) { g.fillStyle = BASE_COL[BC_SEQ[(j * 5 + (i * 3)) % 20]]; g.fillRect(x + 18 + j * 8, y, 8, 12); }
      g.restore();
    }
    text(`PCR cycle ${cyc}: ${fmtInt(n)} copies${n > 64 ? ' (64 shown)' : ''}`, 960, 760, { size: 26, fam: 'mono', color: PAL.dim, align: 'center', alpha: rA });
    text('amplify  →  sequence  →  count', 960, 840, { size: 44, fam: 'disp', align: 'center', alpha: rA * prog(t, c(5) + 4, 1) });
  }
};

SCENES.crelox = (t, c, D) => {
  const CY = 640, segH = 46;
  const integ = prog(t, c(3) + 1.2, 3.2);
  const chromA = env(t, 0.3, 1e9, 0.8);
  // chromosome II
  g.save(); g.globalAlpha = chromA;
  rrect(60, CY - 22, 1800, 44, 22); g.fillStyle = '#16264a'; g.fill();
  for (let i = 0; i < 46; i++) { g.fillStyle = i % 3 ? 'rgba(120,140,190,0.12)' : 'rgba(120,140,190,0.25)'; g.fillRect(70 + i * 39, CY - 22, 18, 44); }
  g.restore();
  text('chromosome II', 80, CY + 64, { size: 20, fam: 'mono', color: PAL.dim, alpha: chromA });
  text('landing pad at the YBR209W locus', 1840, CY + 64, { size: 20, fam: 'mono', color: PAL.dim, align: 'right', alpha: chromA * prog(t, c(0) + 3, 1) });
  // segments, laid out left→right; the insert grows in as integration proceeds
  const lp = prog(t, c(1) + 0.3, 2.5, ease.lin);
  const insertW = integ;
  const segs = [
    { lab: 'GAL › Cre', w: 220, col: PAL.violet, show: clamp(lp * 4) },
    { lab: 'KanMX', w: 120, col: '#7aa2d6', show: clamp(lp * 4 - 1) },
    { lab: '½ URA3', w: 170, col: PAL.A, show: clamp(lp * 4 - 2) },
    { lab: integ > 0.5 ? 'loxP' : 'lox*', w: 92, col: PAL.G, show: clamp(lp * 4 - 3), lox: true },
    { lab: 'barcode', w: 200 * insertW, col: 'rainbow', show: insertW },
    { lab: '½ URA3', w: 170 * insertW, col: PAL.A, show: insertW },
    { lab: 'HygMX', w: 150 * insertW, col: '#7aa2d6', show: insertW },
    { lab: 'lox66/71', w: 120 * insertW, col: '#b98a3a', show: insertW, lox: true, dead: true },
  ];
  const totalW = segs.reduce((s, x) => s + x.w, 0);
  let x = 960 - totalW / 2;
  const pos = {};
  segs.forEach((sg, i) => {
    const a = sg.show * chromA;
    pos[i] = [x, sg.w];
    if (a > 0.01 && sg.w > 2) {
      g.save(); g.globalAlpha = a;
      if (sg.col === 'rainbow') {
        for (let k = 0; k < 20; k++) { g.fillStyle = BASE_COL[BC_SEQ[k]]; g.fillRect(x + k * sg.w / 20, CY - segH / 2, sg.w / 20 + 0.5, segH); }
      } else if (sg.lox) {
        g.fillStyle = sg.col; g.beginPath(); g.moveTo(x + 6, CY - segH / 2); g.lineTo(x + sg.w - 6, CY); g.lineTo(x + 6, CY + segH / 2); g.closePath(); g.fill();
      } else { rrect(x, CY - segH / 2, sg.w, segH, 8); g.fillStyle = hexA(sg.col, 0.85); g.fill(); }
      if (sg.w > 60) text(sg.lab, x + sg.w / 2, CY - 40, { size: 22, weight: 600, color: sg.col === 'rainbow' ? PAL.ink : sg.col, align: 'center' });
      g.restore();
    }
    x += sg.w;
  });
  // URA3 joined + artificial intron
  const ja = env(t, c(4) + 0.3, 1e9, 0.8);
  if (ja > 0 && integ > 0.99) {
    const [ux1, uw1] = pos[2], [ux2, uw2] = pos[5];
    glowDot(ux1 + uw1 / 2, CY, 120, hexA(PAL.A, 0.35), ja * (0.6 + 0.4 * Math.sin(t * 3)));
    glowDot(ux2 + uw2 / 2, CY, 120, hexA(PAL.A, 0.35), ja * (0.6 + 0.4 * Math.sin(t * 3)));
    const ix1 = pos[3][0], ix2 = pos[5][0];
    g.save(); g.globalAlpha = ja; g.strokeStyle = PAL.ink; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(ix1, CY + 30); g.lineTo(ix1, CY + 46); g.lineTo(ix2, CY + 46); g.lineTo(ix2, CY + 30); g.stroke(); g.restore();
    text('artificial intron', (ix1 + ix2) / 2, CY + 76, { size: 22, fam: 'mono', color: PAL.ink, align: 'center', alpha: ja });
    // mRNA after splicing
    const sp = prog(t, c(4) + 2.2, 2.5);
    const my = 840, mx1 = ux1, exon1 = uw1, exon2 = uw2;
    const gapW = (ix2 - ix1) * (1 - sp);
    g.save(); g.globalAlpha = ja * prog(t, c(4) + 1.5, 1);
    g.fillStyle = hexA(PAL.A, 0.85); rrect(mx1, my - 14, exon1, 28, 10); g.fill();
    rrect(mx1 + exon1 + gapW, my - 14, exon2, 28, 10); g.fill();
    if (gapW > 4) { g.strokeStyle = 'rgba(234,240,251,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx1 + exon1, my); g.quadraticCurveTo(mx1 + exon1 + gapW / 2, my - 90 * (1 - sp) - 10, mx1 + exon1 + gapW, my); g.stroke(); }
    g.restore();
    text(sp > 0.95 ? 'URA3 mRNA, intron spliced out: working gene ✓' : 'URA3 mRNA', mx1 + exon1 + gapW + exon2 + 30, my + 8, { size: 24, color: sp > 0.95 ? PAL.A : PAL.dim, alpha: ja * prog(t, c(4) + 1.5, 1) });
  }
  // plasmid library
  const plA = env(t, c(2), c(3) + 2.6, 0.8, 0.8);
  if (plA > 0) {
    const fly = prog(t, c(3) + 0.4, 2.2);
    const pxc = lerp(1320, pos[4][0] + 40, fly), pyc = lerp(330, CY, fly), pr = 120 * (1 - 0.75 * fly);
    for (let k = 3; k >= 1; k--) { // the library behind
      const ox = k * 70, oy = -k * 34, hue = (k * 97) % 360;
      g.save(); g.globalAlpha = plA * (1 - fly) * 0.16; g.strokeStyle = hsl(hue, 70, 60); g.lineWidth = 7; g.beginPath(); g.arc(1320 + ox, 330 + oy, 120, 0, TAU); g.stroke(); g.restore();
    }
    g.save(); g.globalAlpha = plA;
    const arcs = [[-1.75, -1.45, PAL.G], [-1.45, -0.25, 'bc'], [-0.25, 1.4, PAL.A], [1.4, 3.6, '#7aa2d6']];
    arcs.forEach(([a0, a1, col]) => {
      if (col === 'bc') { for (let k = 0; k < 20; k++) { g.strokeStyle = BASE_COL[BC_SEQ[k]]; g.lineWidth = 22 * (1 - 0.5 * fly); g.beginPath(); g.arc(pxc, pyc, pr, a0 + (a1 - a0) * k / 20, a0 + (a1 - a0) * (k + 1) / 20 + 0.01); g.stroke(); } }
      else { g.strokeStyle = col; g.lineWidth = 22 * (1 - 0.5 * fly); g.beginPath(); g.arc(pxc, pyc, pr, a0, a1); g.stroke(); }
    });
    g.restore();
    const la = plA * (1 - fly);
    text('lox*', pxc + Math.cos(-1.6) * 170, pyc + Math.sin(-1.6) * 160, { size: 21, fam: 'mono', color: PAL.G, align: 'center', alpha: la });
    text('barcode', pxc + Math.cos(-0.85) * 190, pyc + Math.sin(-0.85) * 175, { size: 21, fam: 'mono', color: PAL.ink, align: 'center', alpha: la });
    text('½ URA3', pxc + Math.cos(0.6) * 190, pyc + Math.sin(0.6) * 175, { size: 21, fam: 'mono', color: PAL.A, align: 'center', alpha: la });
    text('HygMX', pxc + Math.cos(2.5) * 185, pyc + Math.sin(2.5) * 170, { size: 21, fam: 'mono', color: '#7aa2d6', align: 'center', alpha: la });
    text('plasmid library: one random barcode per plasmid', 1320, 520, { size: 22, color: PAL.dim, align: 'center', alpha: la });
  }
  // Cre recombinase
  const crA = env(t, c(3), c(4), 0.6, 0.8);
  if (crA > 0) {
    const lx = pos[3][0] + 40;
    text('+ galactose → Cre made', 300, 330, { size: 28, fam: 'mono', color: PAL.violet, alpha: crA });
    for (let k = 0; k < 4; k++) {
      const an = k / 4 * TAU + t * 1.5, rr = 70 - 30 * integ;
      const qx = lx + Math.cos(an) * rr, qy = CY - 110 + Math.sin(an) * rr * 0.6;
      glowDot(qx, qy, 60, hexA(PAL.violet, 0.5), crA);
      g.save(); g.globalAlpha = crA; g.fillStyle = PAL.violet; g.beginPath(); g.arc(qx, qy, 26, 0, TAU); g.fill(); g.restore();
      text('Cre', qx, qy + 6, { size: 18, fam: 'mono', weight: 600, color: '#0b1020', align: 'center', alpha: crA });
    }
  }
  // selection on plates lacking uracil
  const sA = env(t, c(5), 1e9, 0.8);
  if (sA > 0) {
    const cx = 1480, cy = 270, R = 130;
    g.save(); g.globalAlpha = sA;
    g.fillStyle = 'rgba(255,214,140,0.10)'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(220,232,255,0.6)'; g.lineWidth = 4; g.stroke();
    for (let i = 0; i < 46; i++) {
      const rr = R * 0.85 * Math.sqrt(hash01(i, 1)), an = hash01(i, 2) * TAU, ok = hash01(i, 3) < 0.6;
      const gp = prog(t, c(5) + 0.8 + hash01(i, 4) * 1.5, 1.5);
      const size = ok ? 6 + 6 * gp : 6 * (1 - gp);
      g.fillStyle = ok ? hsl(hash01(i, 5) * 360, 75, 62) : 'rgba(150,160,180,0.6)';
      g.beginPath(); g.arc(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, Math.max(0, size), 0, TAU); g.fill();
    }
    g.restore();
    text('plate without uracil', cx, cy + R + 36, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: sA });
    text('only barcoded cells form colonies', cx, cy + R + 64, { size: 20, fam: 'mono', color: PAL.A, align: 'center', alpha: sA });
    const [dx, dw] = pos[7];
    const ba = sA * prog(t, c(5) + 3, 1);
    glowDot(dx + dw / 2, CY - 100, 40, hexA(PAL.violet, 0.7), ba * (0.5 + 0.5 * Math.sin(t * 4)));
    text('✕', dx + dw / 2, CY - 86, { size: 34, weight: 700, color: PAL.T, align: 'center', alpha: ba });
    text('lox66/71 double mutant: Cre barely binds,', dx + dw / 2, CY + 120, { size: 20, color: PAL.dim, align: 'center', alpha: ba });
    text('so the barcode stays put', dx + dw / 2, CY + 146, { size: 20, color: PAL.dim, align: 'center', alpha: ba });
    text('≈ 500,000', 330, 330, { size: 88, fam: 'disp', alpha: sA * prog(t, c(5) + 1.5, 1) });
    text('barcoded lineages', 330, 372, { size: 24, fam: 'mono', color: PAL.dim, alpha: sA * prog(t, c(5) + 1.5, 1) });
  }
};

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

SCENES.reading = (t, c, D) => {
  // pipeline stations
  const st = ['Freeze', 'Extract DNA', 'PCR + UMIs', 'Sequence', 'Count'];
  const act = t < c(1) ? -1 : t < c(1) + 3.5 ? 0 : t < c(1) + 6 ? 1 : t < c(3) ? 2 : t < c(4) ? 3 : t < c(5) ? 4 : 5;
  const pA = env(t, c(1) - 0.3, 1e9, 0.8);
  st.forEach((s, i) => {
    const x = 330 + i * 315, on = act === i || act === 5;
    if (i) arrow(x - 230, 222, x - 90, 222, 'rgba(147,162,195,0.45)', { w: 2.5, alpha: pA, head: 10 });
    g.save(); g.globalAlpha = pA;
    if (on) glowDot(x, 222, 90, hexA(PAL.G, 0.35));
    g.beginPath(); g.arc(x, 222, 46, 0, TAU); g.fillStyle = on ? hexA(PAL.G, 0.2) : 'rgba(20,32,60,0.9)'; g.fill();
    g.strokeStyle = on ? PAL.G : PAL.faint; g.lineWidth = 3; g.stroke(); g.restore();
    text(String(i + 1), x, 236, { size: 38, fam: 'disp', color: on ? PAL.G : PAL.dim, align: 'center', alpha: pA });
    text(s, x, 300, { size: 22, fam: 'mono', color: on ? PAL.ink : PAL.dim, align: 'center', alpha: pA });
  });
  // half a million pixels
  const mA = env(t, 0.2, c(1) + 0.2, 0.8, 0.8);
  if (mA > 0) {
    const rev = prog(t, 0.3, 4, ease.io);
    g.save(); g.globalAlpha = mA; g.imageSmoothingEnabled = false;
    g.beginPath(); g.rect(820, 200, 1000 * rev, 500); g.clip();
    g.drawImage(mosaic(), 820, 200); g.restore();
    g.save(); g.globalAlpha = mA; g.strokeStyle = 'rgba(220,232,255,0.4)'; g.strokeRect(820, 200, 1000, 500); g.restore();
    counter(500000 * rev, 120, 420, { size: 110, alpha: mA, color: PAL.ink });
    text('lineages, one pixel each', 124, 470, { size: 28, fam: 'mono', color: PAL.dim, alpha: mA });
    text('each starts as ≈ 1 / 500,000 of the population', 124, 520, { size: 24, color: PAL.dim, alpha: mA * prog(t, 2.5, 1) });
  }
  // freeze → extract → PCR doubling
  const fA = env(t, c(1), c(2), 0.6, 0.6);
  if (fA > 0) {
    for (let k = 0; k < 5; k++) cryotube(300 + k * 70, 560, 1.2, [PAL.A, PAL.C, PAL.G, PAL.T, PAL.violet][k], { alpha: fA * prog(t, c(1) + k * 0.15, 0.5), frost: 0.8, label: `T${k}` });
    const ex = prog(t, c(1) + 3, 1.5);
    helix(760, 560, 360, { phase: t, amp: 26, pitch: 160, step: 14, alpha: fA * ex });
    arrow(680, 560, 740, 560, PAL.dim, { alpha: fA * ex, w: 3 });
    const cyc = Math.floor(prog(t, c(1) + 5.5, 4, ease.lin) * 6);
    for (let i = 0; i < (1 << cyc); i++) {
      const x = 1240 + (i % 8) * 74, y = 420 + Math.floor(i / 8) * 40;
      g.save(); g.globalAlpha = fA; g.fillStyle = 'rgba(147,162,195,0.5)'; g.fillRect(x, y, 14, 14); g.fillRect(x + 46, y, 14, 14);
      g.fillStyle = hsl((i * 47) % 360, 70, 60); g.fillRect(x + 14, y, 32, 14); g.restore();
    }
    text(`PCR cycle ${cyc}  ·  ${1 << cyc} copies`, 1520, 380, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: fA * prog(t, c(1) + 5.5, 0.6) });
  }
  // UMIs
  const uA = env(t, c(2), c(3), 0.6, 0.6);
  if (uA > 0) {
    const mols = [{ hue: 150, umi: PAL.G, copies: 6 }, { hue: 210, umi: PAL.T, copies: 2 }, { hue: 150, umi: PAL.C, copies: 3 }];
    text('original molecules', 330, 400, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    mols.forEach((m, i) => {
      const y = 460 + i * 110;
      g.save(); g.globalAlpha = uA;
      g.fillStyle = m.umi; g.fillRect(230, y, 34, 24); g.fillStyle = hsl(m.hue, 70, 60); g.fillRect(264, y, 150, 24);
      g.restore();
      const cp = prog(t, c(2) + 1 + i * 0.4, 1.5);
      for (let k = 0; k < m.copies; k++) {
        const x = 640 + k * 120, a = uA * clamp(cp * m.copies - k);
        g.save(); g.globalAlpha = a; g.fillStyle = m.umi; g.fillRect(x, y, 20, 20); g.fillStyle = hsl(m.hue, 70, 60); g.fillRect(x + 20, y, 80, 20); g.restore();
      }
      const col = prog(t, c(2) + 4.2, 1);
      text(`→ ${m.copies} reads → 1 molecule`, 1440, y + 18, { size: 22, fam: 'mono', color: col > 0 ? PAL.ink : PAL.dim, alpha: uA * col });
    });
    text('UMI', 247, 446, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    text('barcode', 339, 446, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    text('PCR copies (with jackpots)', 900, 400, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    text('11 reads, 3 molecules: the UMI reveals which copies are duplicates', 960, 830, { size: 28, fam: 'disp', align: 'center', alpha: uA * prog(t, c(2) + 4.5, 1) });
  }
  // indices + sequencing
  const iA = env(t, c(3), c(4), 0.6, 0.6);
  if (iA > 0) {
    const samples = [['T0', PAL.A], ['T1', PAL.C], ['T2', PAL.G], ['T3', PAL.T], ['T4', PAL.violet]];
    const mg = prog(t, c(3) + 1, 2.5);
    samples.forEach(([lab, col], i) => {
      const y0 = 400 + i * 80, y = lerp(y0, 580, mg), x = lerp(360, 980, mg);
      for (let k = 0; k < 6; k++) {
        const kx = x + k * 30 * (1 - mg) + (hash01(i, k) - 0.5) * 140 * mg, ky = y + (hash01(k, i) - 0.5) * 160 * mg;
        g.save(); g.globalAlpha = iA; g.fillStyle = col; g.fillRect(kx, ky, 10, 12); g.fillStyle = 'rgba(200,210,235,0.7)'; g.fillRect(kx + 10, ky, 36, 12); g.restore();
      }
      text(lab, 300, y0 + 12, { size: 22, fam: 'mono', color: col, alpha: iA * (1 - mg) });
    });
    g.save(); g.globalAlpha = iA * mg; rrect(800, 440, 420, 290, 20); g.strokeStyle = PAL.dim; g.lineWidth = 2; g.stroke(); g.restore();
    text('one sequencing run', 1010, 770, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: iA * mg });
    text('index tags record which sample each read came from', 1300, 600, { size: 26, fam: 'disp', alpha: iA * prog(t, c(3) + 2.5, 1), maxW: 520 });
  }
  // reads → counts → frequencies
  const cA = env(t, c(4), c(5) + 0.2, 0.6, 0.6);
  if (cA > 0) {
    g.save(); g.beginPath(); g.rect(120, 380, 760, 470); g.clip();
    for (let i = 0; i < 16; i++) {
      const y = 400 + ((i * 30 + t * 60) % 480), id = Math.floor((i * 30 + t * 60) / 480) * 16 + i;
      const bc = Math.floor(hash01(id, 3) * 8);
      text('GCTTCAGT', 130, y, { size: 22, fam: 'mono', color: PAL.faint, alpha: cA });
      text(Barcode.random(rng(bc * 9 + 1)), 260, y, { size: 22, fam: 'mono', color: hsl(bc * 45, 70, 66), alpha: cA });
      text('ATCGGTAC', 590, y, { size: 22, fam: 'mono', color: PAL.faint, alpha: cA });
    }
    g.restore();
    const counts = [41, 12, 77, 25, 8, 55, 19, 33], tot = counts.reduce((a, b) => a + b);
    const gp = prog(t, c(4) + 1.2, 3);
    counts.forEach((n, i) => {
      const x = 1000 + i * 100, hgt = n * 5 * gp;
      g.save(); g.globalAlpha = cA; g.fillStyle = hsl(i * 45, 70, 62); g.fillRect(x, 800 - hgt, 66, hgt); g.restore();
      text(`${(n / tot * 100).toFixed(0)}%`, x + 33, 790 - hgt, { size: 20, fam: 'mono', color: PAL.ink, align: 'center', alpha: cA * gp });
    });
    line(990, 800, 1800, 800, PAL.faint, 2, cA);
    text('frequency = reads for one barcode ÷ all reads', 1400, 870, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: cA * gp });
  }
  // life story
  const lA = env(t, c(5), 1e9, 0.8);
  if (lA > 0) {
    const P = plotFrame({ x: 560, y: 400, w: 800, h: 360 }, [0, 112], [-6.5, -2], { xt: [[0, '0'], [56, '56'], [112, '112 gen']], yt: [[-6, pow10(-6)], [-4, pow10(-4)], [-2, pow10(-2)]] });
    P.draw(lA);
    const ex = LT.example, up = 112 * prog(t, c(5) + 0.4, 2.8);
    g.save(); g.globalAlpha = lA; g.strokeStyle = hsl(sHue(ex.s), 85, 62); g.lineWidth = 5; g.beginPath();
    for (let k = 0; k * 4 <= up; k++) { const p = [P.X(k * 4), P.Y(Math.max(-6.5, ex.y[k]))]; k ? g.lineTo(...p) : g.moveTo(...p); g.fillStyle = PAL.ink; }
    g.stroke(); g.restore();
    for (let k = 0; k * 8 <= up; k++) glowDot(P.X(k * 8), P.Y(Math.max(-6.5, ex.y[k * 2])), 14, 'rgba(234,240,251,0.9)', lA);
  }
};
