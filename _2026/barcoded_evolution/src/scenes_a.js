// ───────────────────────────── scenes, part A: the philosophy and the standard method ─────────────────────────────
const SCENES = {};

/** a strip of film whose frames are snapshots of one population; each take is a replay of history */
function filmStrip(t, playhead, take, alpha) {
  if (alpha <= 0) return;
  const y = 470, fh = 200, fw = 240, gap = 18;
  g.save(); g.globalAlpha *= alpha;
  g.fillStyle = '#05080f'; g.fillRect(0, y - 26, W, fh + 52);
  for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(200,215,240,0.18)'; g.fillRect(((k * 48 - playhead * 0.0) % (W + 48)), y - 18, 22, 10); g.fillRect(((k * 48) % (W + 48)), y + fh + 8, 22, 10); }
  const hues = take === 1 ? [150] : [320, 45];
  for (let k = 0; k < 14; k++) {
    const x = 80 + k * (fw + gap) - playhead;
    if (x < -fw || x > W) continue;
    g.fillStyle = '#0d1830'; g.fillRect(x, y, fw, fh);
    const frac = clamp((k - 1) / 8);
    for (let j = 0; j < 46; j++) {
      const dx = 18 + hash01(j, 1) * (fw - 36), dy = 18 + hash01(j, 2) * (fh - 50);
      const u = hash01(j, 3);
      let col = 'rgba(160,172,200,0.85)';
      if (take === 1 && u < frac * 0.9) col = hsl(hues[0], 70, 58);
      if (take === 2) { if (u < frac * 0.7) col = hsl(hues[0], 70, 62); else if (u > 1 - frac * 0.2) col = hsl(hues[1], 80, 60); }
      g.fillStyle = col; g.beginPath(); g.arc(x + dx, y + dy, 6, 0, TAU); g.fill();
    }
    text(`gen ${k * 25}`, x + 12, y + fh - 12, { size: 16, fam: 'mono', color: PAL.dim });
  }
  g.restore();
}

SCENES.intro = (t, c, D) => {
  letterRain(t, env(t, 0, D - 1, 2, 1) * 0.7);
  // take 1 → rewind → take 2
  const rw0 = c(1) + 2.6, rw1 = rw0 + 1.6, speed = 95;
  const take1 = Math.max(0, t - 0.4) * speed;
  const end1 = Math.max(0, rw0 - 0.4) * speed;
  let ph, take;
  if (t < rw0) { ph = take1; take = 1; } else if (t < rw1) { ph = end1 * (1 - ease.io((t - rw0) / (rw1 - rw0))); take = 1; } else { ph = (t - rw1) * speed; take = 2; }
  const sA = env(t, 0.2, c(2) + 1.2, 0.8, 1);
  filmStrip(t, ph, take, sA);
  const lab = t < rw0 ? 'TAKE 1' : t < rw1 ? '◀◀  REWIND' : 'TAKE 2';
  text(lab, 80, 410, { size: 24, fam: 'mono', weight: 600, color: t >= rw0 && t < rw1 ? PAL.T : PAL.G, alpha: sA, track: 4 });
  text(take === 1 ? 'one history plays out' : 'same start, a different history', 1840, 410, { size: 24, fam: 'disp', italic: true, color: PAL.dim, align: 'right', alpha: sA * prog(t, 1, 1) });
  text('“Replaying life’s tape”: Stephen Jay Gould, Wonderful Life (1989)', 960, 790, { size: 22, color: PAL.dim, align: 'center', alpha: sA * env(t, c(1) + 1, 1e9, 1) });
  // the bloom and the title
  const cx = 960, cy = 540, grow = prog(t, c(2) + 1, 6, ease.io), count = Math.pow(2, grow * 9);
  const ta = env(t, c(2) + 5.5, D - 0.6, 1.4, 1.2);
  for (let i = 0; i < 512; i++) {
    const a = clamp(count - i);
    if (a <= 0 || grow <= 0) break;
    const r = 30 * Math.sqrt(i + 0.5) * (0.6 + 0.4 * grow), th = i * 2.39996 + t * 0.04;
    yeast(cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.86, 12 * (1 - 0.3 * grow) + 2, { hue: Math.floor(hash01(i, 9) * 360), alpha: a * (1 - 0.6 * ta), tag: grow > 0.5 ? 1 : 0 });
  }
  if (ta > 0) {
    g.save(); g.globalAlpha = ta * 0.95;
    const vg = g.createRadialGradient(cx, 500, 50, cx, 500, 760);
    vg.addColorStop(0, 'rgba(6,10,22,0.92)'); vg.addColorStop(1, 'rgba(6,10,22,0)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore();
    text('a film about the method of experimental evolution', cx, 360, { size: 22, fam: 'mono', color: PAL.G, align: 'center', alpha: ta, track: 4 });
    text('Evolution, Barcoded', cx, 500, { size: 150, fam: 'disp', italic: true, color: PAL.ink, align: 'center', alpha: ta });
    text('How an evolution experiment is done, why each step exists,', cx, 590, { size: 28, color: PAL.dim, align: 'center', alpha: ta });
    text('and how DNA barcodes let us count every lineage in the race.', cx, 630, { size: 28, color: PAL.dim, align: 'center', alpha: ta });
    text('LEVY ET AL. · NATURE 2015      KINSLER, GEILER-SAMEROTTE & PETROV · ELIFE 2020', cx, 720, { size: 18, fam: 'mono', color: PAL.faint, align: 'center', alpha: ta, track: 2 });
  }
};

// a fixed random tree: survivors reach the top, most branches end early
const TREE = (() => {
  const segs = [], r = rng(77);
  (function grow(x, y, ang, d, alive) {
    const len = 95 - d * 6, x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const dies = d > 1 && r() < 0.34;
    segs.push({ x1: x, y1: y, x2, y2, d, alive: !dies && alive, tip: d === 6 || dies });
    if (dies || d === 6) return;
    grow(x2, y2, ang - 0.32 - r() * 0.2, d + 1, alive);
    grow(x2, y2, ang + 0.32 + r() * 0.2, d + 1, alive);
  })(960, 860, -Math.PI / 2, 0, true);
  return segs;
})();

SCENES.why = (t, c, D) => {
  // what nature shows us: the tips of a tree whose other branches vanished
  const trA = env(t, 0.2, c(1) + 0.8, 0.8, 0.8);
  if (trA > 0) {
    const depthShown = prog(t, 0.4, 4, ease.lin) * 7;
    for (const s of TREE) {
      const a = clamp(depthShown - s.d) * trA;
      if (a <= 0) continue;
      const survivor = s.alive && s.d === 6;
      const hidden = !s.alive || (s.tip && !survivor);
      const k = prog(t, 3.5, 1.5);
      line(s.x1, s.y1, s.x2, s.y2, hidden ? 'rgba(150,165,200,0.6)' : '#d9e3f5', hidden ? 2 : 3.5, a * (hidden ? 1 - 0.75 * k : 1), hidden ? [6, 6] : null);
      if (survivor) yeast(s.x2, s.y2 - 10, 13, { hue: (s.x2 * 3) % 360, alpha: a });
      else if (s.tip) text('×', s.x2, s.y2 + 6, { size: 22, color: PAL.T, align: 'center', alpha: a * (1 - 0.6 * k) });
    }
    text('what we can observe: the survivors at the tips', 1840, 300, { size: 28, fam: 'disp', italic: true, align: 'right', alpha: trA * prog(t, 3, 1) });
    text('the losers, and every road not taken, are gone', 1840, 340, { size: 22, color: PAL.dim, align: 'right', alpha: trA * prog(t, 4.5, 1) });
  }
  // four ideas
  text('An evolution experiment rests on four ideas', 960, 240, { size: 40, fam: 'disp', align: 'center', alpha: env(t, c(1) + 0.4, 1e9, 0.8) });
  const ideas = [
    { at: c(2), title: 'Control', so: 'we know exactly what changed' },
    { at: c(3), title: 'Replication', so: 'repeatable vs. chance' },
    { at: c(4), title: 'Time travel', so: 'the past stays alive' },
    { at: c(5), title: 'Scale', so: 'billions of cells, fast generations' },
  ];
  ideas.forEach((it, i) => {
    const a = env(t, it.at, 1e9, 0.8), x = 80 + i * 445, y = 300 + (1 - ease.out(clamp((t - it.at) / 0.9))) * 30;
    if (a <= 0) return;
    card(x, y, 425, 470, a);
    text(String(i + 1).padStart(2, '0'), x + 26, y + 46, { size: 20, fam: 'mono', color: PAL.G, alpha: a });
    text(it.title, x + 26, y + 100, { size: 46, fam: 'disp', alpha: a });
    text('so that ' + it.so, x + 26, y + 140, { size: 21, color: PAL.dim, alpha: a, maxW: 380 });
    const mx = x + 212, my = y + 320, lt = t - it.at;
    g.save(); g.globalAlpha *= a;
    if (i === 0) {
      flask(mx - 70, my + 90, 0.55, { t, cells: 26, seed: 2, level: 0.5, turb: 0.3, hues: () => 205 });
      text('one known ancestor', mx + 30, my - 20, { size: 18, fam: 'mono', color: PAL.dim });
      text('one defined medium', mx + 30, my + 10, { size: 18, fam: 'mono', color: PAL.dim });
      text('✓', mx + 10, my - 20, { size: 20, color: PAL.A }); text('✓', mx + 10, my + 10, { size: 20, color: PAL.A });
    } else if (i === 1) {
      for (let k = 0; k < 6; k++) {
        const fx = mx - 150 + (k % 3) * 150, fy = my + (k < 3 ? 0 : 120);
        flask(fx, fy + 30, 0.32, { t, cells: 16, seed: 30 + k, level: 0.5, turb: 0.4, cellR: 5, hues: j => (hash01(j, k) < prog(lt, 0.5, 3) * 0.6 ? (k % 2 ? 150 : 150 + k * 40) : null) });
      }
    } else if (i === 2) {
      cryotube(mx - 80, my + 60, 1.6, PAL.C, { frost: 0.8, label: '−80 °C' });
      g.strokeStyle = PAL.G; g.lineWidth = 4; g.beginPath(); g.arc(mx + 40, my + 10, 70, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
      arrow(mx + 108, my + 20, mx + 110, my + 30, PAL.G, { w: 4, head: 16 });
      text('revive, compare, replay', mx + 40, my + 165, { size: 18, fam: 'mono', color: PAL.dim, align: 'center' });
    } else {
      text('≈ 10¹⁰', mx, my - 10, { size: 76, fam: 'disp', align: 'center' });
      text('cells in one 100 mL flask', mx, my + 26, { size: 18, fam: 'mono', color: PAL.dim, align: 'center' });
      text('≈ 8 generations / 48 h', mx, my + 90, { size: 26, fam: 'disp', align: 'center', color: PAL.G });
    }
    g.restore();
  });
  text("The best-known example: Lenski's E. coli long-term evolution experiment, running since 1988.", 960, 840, { size: 22, color: PAL.dim, align: 'center', alpha: env(t, c(5) + 2, 1e9, 1) });
};

SCENES.recipe = (t, c, D) => {
  const a0 = env(t, 0.2, 1e9, 0.8);
  text('each step removes one source of ambiguity', 960, 300, { size: 46, fam: 'disp', italic: true, align: 'center', alpha: a0 });
  const step = (c(2) - c(1)) / 6.2;
  const active = t < c(1) ? [] : t < c(2) ? [Math.min(5, Math.floor((t - c(1)) / step))] : [];
  const count = t < c(2) ? 6 : 6 + Math.round(2 * prog(t, c(2) + 1.5, 0.8));
  rail(active, a0, { x0: 260, y: 520, sp: 200, big: true, count });
  // what each step is
  PROTOCOL.slice(0, count).forEach((st, i) => {
    const on = active.includes(i), a = a0 * (t < c(1) ? prog(t, 0.6 + i * 0.25, 0.6) : 1) * (st.ext ? prog(t, c(2) + 1.5, 0.8) : 1);
    text(st.what, 260 + i * 200, 650, { size: 22, color: on ? PAL.ink : PAL.dim, align: 'center', alpha: a, maxW: 185 });
  });
  text('+ two more steps when the cells are barcoded', 1560, 740, { size: 22, fam: 'mono', color: PAL.violet, align: 'center', alpha: prog(t, c(2) + 2.2, 0.8) });
  text('what do we do, and why?', 960, 840, { size: 40, fam: 'disp', align: 'center', color: PAL.G, alpha: env(t, c(2) + 0.6, 1e9, 1) });
};

// ── Step 1 · one clone
const STREAK = (() => {
  // three passes of an inoculating loop: each pass drags fewer cells, so the last leaves isolated colonies
  const passes = [
    { pts: [], n: 70, spread: 16 }, { pts: [], n: 26, spread: 10 }, { pts: [], n: 8, spread: 6 },
  ];
  for (let i = 0; i <= 8; i++) passes[0].pts.push([300 + (i % 2) * 120, 390 + i * 14]);
  for (let i = 0; i <= 8; i++) passes[1].pts.push([420 + i * 26, 480 + (i % 2 ? 60 : -10) + i * 6]);
  for (let i = 0; i <= 6; i++) passes[2].pts.push([600 - i * 22 + (i % 2) * 70, 600 + i * 30]);
  const r = rng(12), colonies = [];
  passes.forEach((p, pi) => {
    for (let k = 0; k < p.n; k++) {
      const u = r() * (p.pts.length - 1), i = Math.floor(u), f = u - i;
      const [x1, y1] = p.pts[i], [x2, y2] = p.pts[Math.min(i + 1, p.pts.length - 1)];
      colonies.push({ x: lerp(x1, x2, f) + gauss(r) * p.spread, y: lerp(y1, y2, f) + gauss(r) * p.spread, r: pi === 2 ? 11 : 7 + r() * 3, pass: pi });
    }
  });
  return { passes, colonies };
})();

function genomeBar(x, y, w, alpha, o = {}) {
  if (alpha <= 0) return;
  const { mut = -1, mutCol = PAL.T, variants = [] } = o;
  g.save(); g.globalAlpha *= alpha;
  for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? 'rgba(150,170,215,0.7)' : 'rgba(150,170,215,0.45)'; g.fillRect(x + k * w / 16, y, w / 16 - 1, 12); }
  if (mut >= 0) { g.fillStyle = mutCol; g.fillRect(x + mut * w, y - 6, 4, 20); }
  for (const [pos, col] of variants) { g.fillStyle = col; g.fillRect(x + pos * w, y - 6, 4, 20); }
  g.restore();
}

SCENES.clone = (t, c, D) => {
  rail([0], env(t, 0.3, 1e9, 0.8));
  zone('what', 100, 215, env(t, 0.3, 1e9, 0.8), 780);
  // streak plate
  const pA = env(t, 0.4, 1e9, 0.8);
  plate(480, 580, 290, pA);
  const drawP = prog(t, c(0) + 0.5, 3.5, ease.lin) * 3;
  STREAK.passes.forEach((p, pi) => {
    const f = clamp(drawP - pi);
    if (f <= 0) return;
    g.save(); g.globalAlpha = pA * 0.55; g.strokeStyle = '#e8d9b8'; g.lineWidth = 3; g.beginPath();
    const n = Math.floor(f * (p.pts.length - 1));
    p.pts.slice(0, n + 1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (n < p.pts.length - 1) { const [x1, y1] = p.pts[n], [x2, y2] = p.pts[n + 1], ff = f * (p.pts.length - 1) - n; g.lineTo(lerp(x1, x2, ff), lerp(y1, y2, ff)); }
    g.stroke(); g.restore();
  });
  const grow = prog(t, c(0) + 4.2, 2);
  STREAK.colonies.forEach(cl => colony(cl.x, cl.y, cl.r * grow, '#d9b98a', pA));
  const pick = STREAK.colonies.filter(c2 => c2.pass === 2)[3];
  const pk = prog(t, c(0) + 6.2, 0.8);
  if (pk > 0) {
    g.save(); g.globalAlpha = pA * pk; g.strokeStyle = PAL.G; g.lineWidth = 3.5; g.beginPath(); g.arc(pick.x, pick.y, 26, 0, TAU); g.stroke(); g.restore();
    text('one colony = the descendants of one cell', pick.x + 40, pick.y + 70, { size: 24, fam: 'disp', italic: true, color: PAL.G, alpha: pA * pk });
  }
  text('streaking dilutes the cells until colonies stand alone', 480, 910, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: pA * prog(t, c(0) + 4.5, 1) });

  // why: identical genomes
  const wA = env(t, c(1), 1e9, 0.8);
  zone('why', 990, 215, wA, 850);
  const rowCells = (y, a, o = {}) => {
    for (let i = 0; i < 9; i++) {
      const x = 1040 + i * 92;
      const isMut = o.mutIdx === i && o.mut > 0;
      const variantHue = o.variants ? o.variants[i] : null;
      const grow2 = o.grow && variantHue === 45 ? o.grow : 0;
      yeast(x, y, 28 + grow2 * 8, { hue: isMut ? 150 : variantHue ?? null, alpha: a, glow: isMut ? o.mut : 0 });
      genomeBar(x - 34, y + 44, 68, a, { mut: isMut ? 0.62 : -1, mutCol: PAL.A, variants: variantHue != null ? [[(variantHue % 7) / 7 + 0.05, hsl(variantHue, 80, 60)]] : [] });
    }
  };
  const m = prog(t, c(2) + 0.4, 1);
  rowCells(330, wA * (1 - 0.6 * prog(t, c(4), 1)), { mutIdx: 5, mut: m });
  reason('every cell starts with the same genome', 1000, 450, { alpha: wA * prog(t, c(1) + 0.6, 1), size: 30 });
  reason('so a difference later = a new mutation', 1000, 494, { alpha: wA * m, size: 30, color: PAL.A });
  // without it: standing variation
  const nA = env(t, c(3), c(4) + 0.2, 0.8, 0.8);
  if (nA > 0) {
    zone('without', 990, 580, nA, 850);
    const variants = [null, 45, null, 280, null, null, 45, null, 200];
    rowCells(680, nA, { variants, grow: prog(t, c(3) + 1.5, 2) });
    text('?', 1840, 700, { size: 90, fam: 'disp', color: PAL.T, align: 'right', alpha: nA * prog(t, c(3) + 2.5, 0.8) });
    reason('a variant rises: new, or there all along?', 1000, 800, { alpha: nA * prog(t, c(3) + 2.5, 1), size: 30, color: PAL.T });
  }
  // the reference genome
  const rA = env(t, c(4), 1e9, 0.8);
  if (rA > 0) {
    zone('what', 990, 580, rA, 850);
    const ref = 'ATGGCTTCAGTAGCAATTGCCACGTTAGGCAAT', evo = ref.slice(0, 19) + 'T' + ref.slice(20);
    text('ancestor (reference)', 1000, 660, { size: 18, fam: 'mono', color: PAL.dim, alpha: rA });
    text('evolved clone', 1000, 740, { size: 18, fam: 'mono', color: PAL.dim, alpha: rA });
    for (let i = 0; i < 26; i++) {
      const x = 1010 + i * 31;
      baseTile(ref[i], x + 10, 690, 28, { alpha: rA * prog(t, c(4) + i * 0.03, 0.4), dim: true });
      const diff = evo[i] !== ref[i];
      baseTile(evo[i], x + 10, 770, 28, { alpha: rA * prog(t, c(4) + 0.8 + i * 0.03, 0.4), dim: !diff, glow: diff ? prog(t, c(4) + 2.2, 0.6) : 0 });
    }
    text('↑ the one difference: the mutation', 1010 + 19 * 31 + 10, 830, { size: 22, color: PAL.T, align: 'center', alpha: rA * prog(t, c(4) + 2.4, 0.8) });
  }
};

// ── Step 2 · the environment
const NUTRIENTS = [
  { name: 'glucose', note: '1.5%: the limiting resource', col: PAL.G, use: 1.0 },
  { name: 'ammonium sulfate', note: 'nitrogen, in excess', col: PAL.C, use: 0.45 },
  { name: 'potassium phosphate', note: 'phosphorus, in excess', col: PAL.C, use: 0.35 },
  { name: 'magnesium sulfate', note: 'in excess', col: PAL.C, use: 0.3 },
  { name: 'trace metals, vitamins', note: 'in excess', col: PAL.C, use: 0.25 },
];
SCENES.medium = (t, c, D) => {
  rail([1], env(t, 0.3, 1e9, 0.8));
  const a0 = env(t, 0.3, 1e9, 0.8);
  zone('what', 100, 215, a0, 760);
  card(100, 250, 760, 400, a0);
  text('M3: a defined, glucose-limited minimal medium', 130, 300, { size: 26, fam: 'disp', alpha: a0 });
  NUTRIENTS.forEach((n, i) => {
    const a = a0 * prog(t, 0.6 + i * 0.25, 0.6), y = 360 + i * 56;
    text(n.name, 130, y, { size: 24, weight: 600, color: n.col, alpha: a });
    text(n.note, 470, y, { size: 20, fam: 'mono', color: PAL.dim, alpha: a });
  });
  // depletion over one cycle
  const h = 48 * prog(t, c(0) + 1, 7, ease.lin);
  const bc = batchCulture(h), used = 1 - bc.glucose;
  const B = { x: 1000, y: 250, w: 820, h: 400 };
  card(B.x, B.y, B.w, B.h, a0);
  text(`nutrient left · hour ${Math.round(h)}`, B.x + 30, B.y + 48, { size: 20, fam: 'mono', color: PAL.dim, alpha: a0 });
  NUTRIENTS.forEach((n, i) => {
    const left = 1 - used * n.use, x = B.x + 60 + i * 150, bh = 260;
    g.save(); g.globalAlpha = a0;
    g.fillStyle = hexA(n.col, 0.15); g.fillRect(x, B.y + 80, 90, bh);
    g.fillStyle = n.col; g.fillRect(x, B.y + 80 + bh * (1 - left), 90, bh * left); g.restore();
    text(n.name.split(' ')[0], x + 45, B.y + 375, { size: 17, fam: 'mono', color: PAL.dim, align: 'center', alpha: a0 });
  });
  const outA = a0 * clamp((h - 17) / 3);
  text('glucose runs out first, so glucose limits growth', B.x + B.w / 2, B.y - 18, { size: 24, fam: 'disp', italic: true, color: PAL.G, align: 'center', alpha: outA });
  // why defined
  const dA = env(t, c(1), c(3), 0.8, 0.8);
  if (dA > 0) {
    zone('why', 100, 715, dA, 760);
    reason('every ingredient known and weighed: the same pressure in every flask, every week', 100, 775, { alpha: dA, size: 30, maxW: 760 });
    zone('without', 1000, 715, dA * prog(t, c(1) + 2, 0.8), 820);
    ['lot A', 'lot B', 'lot C'].forEach((lot, i) => {
      const a = dA * prog(t, c(1) + 2.2 + i * 0.3, 0.6), x = 1010 + i * 270;
      for (let k = 0; k < 4; k++) { const hh = 30 + 70 * hash01(i, k); g.save(); g.globalAlpha = a; g.fillStyle = [PAL.G, PAL.C, PAL.violet, PAL.A][k]; g.fillRect(x + k * 40, 880 - hh, 30, hh); g.restore(); }
      text(lot, x + 75, 905, { size: 17, fam: 'mono', color: PAL.dim, align: 'center', alpha: a });
    });
    text('rich medium (yeast extract): composition shifts from lot to lot', 1000, 765, { size: 20, color: PAL.T, alpha: dA * prog(t, c(1) + 2, 0.8) });
  }
  // why one limiting nutrient
  const gA = env(t, c(2), c(3), 0.6, 0.8);
  if (gA > 0) {
    glowDot(B.x + 105, B.y + 210, 140, hexA(PAL.G, 0.35), gA * (0.6 + 0.4 * Math.sin(t * 3)));
    pill('one limiting nutrient = a clear currency of competition', B.x + B.w - 20, B.y + 52, { size: 22, color: PAL.G, align: 'right', alpha: gA });
  }
  // everything else is part of the environment too
  const cA = env(t, c(3), c(4), 0.8, 0.8);
  const dials = [['30 °C', 'temperature'], ['223 rpm', 'shaking'], ['100 mL', 'in a 500 mL flask'], ['48 h', 'per cycle']];
  if (cA > 0) dials.forEach(([v, lab], i) => {
    const x = 220 + i * 450, y = 820, a = cA * prog(t, c(3) + 0.3 + i * 0.3, 0.6);
    g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(200,215,240,0.4)'; g.lineWidth = 8; g.beginPath(); g.arc(x, y, 58, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
    g.strokeStyle = PAL.A; g.beginPath(); g.arc(x, y, 58, Math.PI * 0.8, Math.PI * (0.8 + 0.9 + 0.1 * Math.sin(i))); g.stroke(); g.restore();
    text(v, x + 90, y, { size: 38, fam: 'disp', alpha: a });
    text(lab, x + 90, y + 32, { size: 18, fam: 'mono', color: PAL.dim, alpha: a });
    text('fixed', x, y + 8, { size: 16, fam: 'mono', color: PAL.A, align: 'center', alpha: a });
  });
  // change one, and "fitter" changes
  const kA = env(t, c(4), 1e9, 0.8);
  if (kA > 0) {
    const sw = prog(t, c(4) + 1.5, 1.5);
    text('flat flask', 300, 780, { size: 24, fam: 'mono', color: sw < 0.5 ? PAL.ink : PAL.dim, align: 'center', alpha: kA });
    text('→', 420, 780, { size: 24, color: PAL.dim, alpha: kA });
    text('baffled flask', 560, 780, { size: 24, fam: 'mono', color: sw >= 0.5 ? PAL.G : PAL.dim, align: 'center', alpha: kA });
    const mut = [['A', 150, [1.0, 0.4]], ['B', 210, [0.7, 1.0]], ['C', 30, [0.45, 0.7]]];
    mut.forEach(([nm, hue, f], i) => {
      const v = lerp(f[0], f[1], sw), y = 760 + i * 52;
      yeast(820, y - 8, 16, { hue, alpha: kA });
      g.save(); g.globalAlpha = kA; g.fillStyle = hsl(hue, 70, 58); g.fillRect(860, y - 22, 700 * v, 28); g.restore();
      text(`mutant ${nm}`, 870, y, { size: 18, fam: 'mono', weight: 600, color: '#0b1020', alpha: kA });
    });
    text('same mutants, a different ranking', 1600, 820, { size: 26, fam: 'disp', italic: true, color: PAL.G, alpha: kA * sw });
  }
};

// ── Step 3 · serial transfer
SCENES.transfer = (t, c, D) => {
  rail([2], env(t, 0.3, 1e9, 0.8));
  const h = 48 * prog(t, c(0) + 0.3, c(1) - c(0) - 0.4, ease.lin);
  const bc = batchCulture(h), growthT = inv(7.7, 10.1, bc.logN);
  const xfer = prog(t, c(1) + 0.3, 3.2, ease.lin);
  const fA = env(t, 0.2, c(5), 0.8, 0.8);
  flask(330, 760, 1.25, { alpha: fA, t, level: 0.44, turb: growthT, cells: Math.floor(8 + growthT * 150), seed: 4, label: 'flask · 100 mL' });
  if (t > c(1)) {
    const fbA = env(t, c(1), c(5), 0.6, 0.8);
    flask(700, 760, 0.85, { alpha: fbA, t, level: 0.44, turb: 0.05, cells: Math.floor(2 + 8 * prog(t, c(1) + 2.6, 1)), seed: 5, label: 'fresh medium' });
    const px = xfer < 0.35 ? 330 : xfer < 0.7 ? lerp(330, 700, ease.io((xfer - 0.35) / 0.35)) : 700;
    const dip = xfer < 0.35 ? Math.sin(xfer / 0.35 * Math.PI) : xfer > 0.7 ? Math.sin((xfer - 0.7) / 0.3 * Math.PI) : 0;
    const py = 360 + dip * 120, pa = env(t, c(1), c(1) + 4, 0.4, 0.5);
    g.save(); g.globalAlpha = pa; g.fillStyle = 'rgba(220,232,255,0.85)'; rrect(px - 9, py - 230, 18, 200, 8); g.fill();
    g.beginPath(); g.moveTo(px - 9, py - 32); g.lineTo(px, py + 30); g.lineTo(px + 9, py - 32); g.fill(); g.restore();
    text('400 µL of 100 mL  =  1 : 250', 515, 890, { size: 28, fam: 'mono', color: PAL.G, align: 'center', alpha: env(t, c(1) + 0.8, c(5), 0.6, 0.6) });
  }
  // the 48 h growth curve
  const gA = env(t, 0.3, c(2) + 0.3, 0.8, 0.8);
  const P = plotFrame({ x: 1000, y: 230, w: 800, h: 330 }, [0, 48], [7.5, 10.4], { xt: [[0, '0 h'], [12, '12'], [24, '24'], [36, '36'], [48, '48 h']], yt: [[8, pow10(8)], [9, pow10(9)], [10, pow10(10)]], yl: 'cells (log)', ylOff: 78 });
  if (gA > 0) {
    P.draw(gA);
    g.save(); g.globalAlpha = gA;
    [[0, 3, 'lag'], [3, 18, 'fermentation'], [18, 22, 'diauxic shift'], [22, 48, 'respiration → stationary']].forEach(([a, b, lab], i) => {
      if (h < a) return;
      g.fillStyle = i % 2 ? 'rgba(88,166,255,0.06)' : 'rgba(255,191,71,0.05)'; g.fillRect(P.X(a), P.box.y, P.X(Math.min(b, h)) - P.X(a), P.box.h);
      text(lab, (P.X(a) + P.X(b)) / 2, P.box.y - 12, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: clamp((h - a) / 2) });
    });
    g.strokeStyle = PAL.G; g.lineWidth = 2.5; g.setLineDash([6, 6]); g.beginPath();
    for (let x = 0; x <= h; x += 0.25) { const yy = P.Y(lerp(7.5, 10.4, batchCulture(x).glucose * 0.94)); x ? g.lineTo(P.X(x), yy) : g.moveTo(P.X(x), yy); }
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = PAL.C; g.lineWidth = 4; g.beginPath();
    for (let x = 0; x <= h; x += 0.25) { const yy = P.Y(batchCulture(x).logN); x ? g.lineTo(P.X(x), yy) : g.moveTo(P.X(x), yy); }
    g.stroke(); g.restore();
    text('— cells', P.box.x + P.box.w - 16, P.box.y + P.box.h - 46, { size: 18, fam: 'mono', color: PAL.C, align: 'right', alpha: gA });
    text('- - glucose', P.box.x + P.box.w - 16, P.box.y + P.box.h - 20, { size: 18, fam: 'mono', color: PAL.G, align: 'right', alpha: gA });
  }
  // why transfer: without it, growth stops
  const wA = env(t, c(2), c(3), 0.8, 0.8);
  if (wA > 0) {
    zone('why', 1000, 215, wA, 800);
    const S = plotFrame({ x: 1000, y: 260, w: 800, h: 300 }, [0, 10], [7.5, 10.4], { xt: [[0, 'day 0'], [2, '2'], [4, '4'], [6, '6'], [8, '8'], [10, '10']], yt: [[8, pow10(8)], [10, pow10(10)]] });
    S.draw(wA);
    const up = 10 * prog(t, c(2) + 0.4, 4, ease.lin);
    g.save(); g.globalAlpha = wA; g.strokeStyle = PAL.C; g.lineWidth = 3.5; g.beginPath();
    for (let x = 0; x <= up; x += 0.02) { const yy = S.Y(batchCulture((x % 2) * 24).logN); x ? g.lineTo(S.X(x), yy) : g.moveTo(S.X(x), yy); }
    g.stroke();
    g.strokeStyle = PAL.T; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath();
    for (let x = 2; x <= Math.max(2, up); x += 0.05) { const yy = S.Y(batchCulture(48).logN - 0.12 * (x - 2)); x > 2 ? g.lineTo(S.X(x), yy) : g.moveTo(S.X(x), yy); }
    g.stroke(); g.setLineDash([]); g.restore();
    text('with transfers: cycle after cycle', S.X(4.2), S.Y(8.1), { size: 20, fam: 'mono', color: PAL.C, alpha: wA });
    text('without: the flask stalls, evolution stops', S.X(10), S.Y(10.35) - 8, { size: 20, fam: 'mono', color: PAL.T, align: 'right', alpha: wA * prog(t, c(2) + 2, 0.8) });
  }
  // why 1:250 → eight doublings
  const dA = env(t, c(3), c(4), 0.8, 0.8);
  if (dA > 0) {
    zone('why', 1000, 215, dA, 800);
    text('1 : 250', 1000, 330, { size: 72, fam: 'disp', alpha: dA });
    text('≈ 1 : 2⁸', 1270, 330, { size: 72, fam: 'disp', color: PAL.G, alpha: dA * prog(t, c(3) + 1.5, 0.8) });
    const k = Math.floor(prog(t, c(3) + 1.8, 5, ease.lin) * 8.99);
    for (let d = 0; d <= 8; d++) {
      const a = dA * (d <= k ? 1 : 0.15), x = 1000 + d * 92;
      const n = 1 << d, hh = 18 + d * 26;
      g.save(); g.globalAlpha = a; g.fillStyle = d === 8 ? PAL.G : PAL.C; g.fillRect(x, 640 - hh, 64, hh); g.restore();
      text(String(n), x + 32, 668, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: a });
    }
    text('eight doublings refill the flask: ≈ 8 generations per cycle', 1000, 720, { size: 26, fam: 'disp', italic: true, alpha: dA * prog(t, c(3) + 5, 1) });
  }
  // feast and famine wheel
  const fwA = env(t, c(4), c(5), 0.8, 0.8);
  if (fwA > 0) {
    zone('why', 1000, 215, fwA, 800);
    const cx = 1400, cy = 520, R = 190;
    const segs = [['lag', 'wake up quickly', 3, PAL.violet], ['fermentation', 'grow fast', 15, PAL.C], ['diauxic shift', 'switch well', 4, PAL.G], ['respiration + stationary', 'survive famine', 26, PAL.A]];
    let a0 = -Math.PI / 2;
    segs.forEach(([lab, sel, hours, col], i) => {
      const a1 = a0 + hours / 48 * TAU, la = fwA * prog(t, c(4) + 0.3 + i * 0.4, 0.6);
      g.save(); g.globalAlpha = la; g.strokeStyle = col; g.lineWidth = 46; g.beginPath(); g.arc(cx, cy, R, a0 + 0.02, a1 - 0.02); g.stroke(); g.restore();
      const am = (a0 + a1) / 2, lx = cx + Math.cos(am) * (R + 70), ly = cy + Math.sin(am) * (R + 60);
      text(lab, lx, ly, { size: 18, fam: 'mono', color: col, align: Math.cos(am) > 0.2 ? 'left' : Math.cos(am) < -0.2 ? 'right' : 'center', alpha: la });
      text(sel, lx, ly + 26, { size: 22, fam: 'disp', italic: true, align: Math.cos(am) > 0.2 ? 'left' : Math.cos(am) < -0.2 ? 'right' : 'center', alpha: la });
      a0 = a1;
    });
    const hand = -Math.PI / 2 + ((t - c(4)) / 6 % 1) * TAU;
    line(cx, cy, cx + Math.cos(hand) * (R - 30), cy + Math.sin(hand) * (R - 30), PAL.ink, 4, fwA);
    text('48 h', cx, cy + 12, { size: 34, fam: 'disp', align: 'center', alpha: fwA });
  }
  // chemostat vs batch
  const chA = env(t, c(5), 1e9, 0.8);
  if (chA > 0) {
    flask(500, 700, 1.0, { alpha: chA, t, level: 0.44, turb: 0.5, cells: 80, seed: 4 });
    chemostat(1380, 700, 1.25, t, chA);
    text('batch transfer', 500, 330, { size: 40, fam: 'disp', align: 'center', alpha: chA });
    text('feast and famine, cycle after cycle', 500, 370, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: chA });
    text('chemostat', 1380, 330, { size: 40, fam: 'disp', align: 'center', alpha: chA });
    text('medium in, culture out, at one constant rate', 1380, 370, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: chA });
    const mini = (x0, flat) => {
      g.save(); g.globalAlpha = chA; g.strokeStyle = PAL.G; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 200; i++) { const x = x0 + i * 1.6, v = flat ? 0.25 : 1 - ((i / 50) % 1); i ? g.lineTo(x, 860 - v * 40) : g.moveTo(x, 860 - v * 40); }
      g.stroke(); g.restore();
      text('glucose over time', x0 + 160, 890, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: chA });
    };
    mini(340, false); mini(1220, true);
    text('vs', 940, 600, { size: 40, fam: 'disp', italic: true, color: PAL.dim, align: 'center', alpha: chA });
  }
};

// ── why the bottleneck size matters
SCENES.bottleneck = (t, c, D) => {
  rail([2], env(t, 0.3, 1e9, 0.8));
  // a transfer as a random draw
  const fA = env(t, 0.3, c(2), 0.8, 0.8);
  if (fA > 0) {
    const fx = 480;
    g.save(); g.globalAlpha = fA; g.strokeStyle = 'rgba(200,220,255,0.6)'; g.lineWidth = 3; g.beginPath();
    g.moveTo(fx - 300, 440); g.lineTo(fx - 26, 600); g.lineTo(fx - 26, 660); g.moveTo(fx + 300, 440); g.lineTo(fx + 26, 600); g.lineTo(fx + 26, 660); g.stroke(); g.restore();
    const cyc = Math.floor(Math.max(0, t - c(1)) / 2.2), ph = (Math.max(0, t - c(1)) % 2.2) / 2.2;
    const keptMut = hash01(cyc, 5) < 0.2 && t > c(1);
    for (let i = 0; i < 260; i++) {
      const x = fx - 280 + hash01(i, 1) * 560, y = 230 + hash01(i, 2) * 190;
      const isMut = i === 77, chosen = hash01(i, cyc + 9) < 0.05 || (isMut && keptMut);
      let yy = y, xx = x;
      if (chosen && t > c(1)) { const f = ease.in(clamp(ph * 1.6)); xx = lerp(x, fx + (hash01(i, 3) - 0.5) * 40, f); yy = lerp(y, 720 + hash01(i, 4) * 120, f); }
      g.fillStyle = isMut ? PAL.A : 'rgba(160,172,200,0.8)';
      g.globalAlpha = fA * (chosen || t < c(1) ? 1 : 1 - 0.6 * clamp(ph * 2));
      g.beginPath(); g.arc(xx, yy, isMut ? 8 : 5, 0, TAU); g.fill();
      if (isMut) glowDot(xx, yy, 26, hexA(PAL.A, 0.7), fA);
    }
    g.globalAlpha = 1;
    text('one transfer = a random sample of about 1 cell in 250', fx, 200, { size: 24, fam: 'disp', italic: true, align: 'center', alpha: fA });
    text('● new beneficial mutant', fx - 280, 920, { size: 20, fam: 'mono', color: PAL.A, alpha: fA });
    // tally of draws
    if (t > c(1)) {
      zone('why', 1000, 215, fA, 800);
      reason('a mutant that is still rare can be left behind by luck, however good it is', 1000, 290, { alpha: fA, size: 32, maxW: 800 });
      for (let k = 0; k <= Math.min(cyc, 9); k++) {
        const kept = hash01(k, 5) < 0.2, x = 1040 + k * 78;
        text(kept ? 'kept' : 'lost', x, 500, { size: 18, fam: 'mono', color: kept ? PAL.A : PAL.T, align: 'center', alpha: fA });
        g.save(); g.globalAlpha = fA; g.fillStyle = kept ? PAL.A : 'rgba(255,95,114,0.3)'; g.beginPath(); g.arc(x, 455, 18, 0, TAU); g.fill(); g.restore();
      }
      text('transfers, each a new draw', 1040, 560, { size: 18, fam: 'mono', color: PAL.dim, alpha: fA });
    }
  }
  // the establishment lottery
  const lA = env(t, c(2), c(4), 0.8, 0.8);
  if (lA > 0) {
    const P = plotFrame({ x: 200, y: 230, w: 1050, h: 560 }, [0, 160], [-0.4, 4.6], { xt: [[0, '0'], [40, '40'], [80, '80'], [120, '120'], [160, '160 generations']], yt: [[0, '1 cell'], [1, '10'], [2, '100'], [3, '1,000'], [4, '10,000']], yl: 'mutant cells', ylOff: 110 });
    P.draw(lA);
    const up = 160 * prog(t, c(2) + 0.5, 6, ease.lin);
    let alive = 0;
    LOTTERY.forEach((y, i) => {
      const surv = y[160] > 0; if (surv) alive++;
      g.save(); g.globalAlpha = lA * (surv ? 0.95 : 0.55); g.strokeStyle = surv ? PAL.A : 'rgba(255,140,155,0.8)'; g.lineWidth = surv ? 3 : 1.6; g.beginPath();
      let last = null;
      for (let k = 0; k <= up; k++) {
        if (y[k] === 0) { g.lineTo(P.X(k), P.Y(-0.4)); last = [k, -0.4]; break; }
        const p = [P.X(k), P.Y(Math.log10(y[k]))]; k ? g.lineTo(...p) : g.moveTo(...p); last = [k, Math.log10(y[k])];
      }
      g.stroke(); g.restore();
      if (last && last[1] < -0.3) text('×', P.X(last[0]), P.Y(-0.4) + 6, { size: 18, color: PAL.T, align: 'center', alpha: lA * 0.8 });
    });
    line(P.X(0), P.Y(Math.log10(20)), P.X(160), P.Y(Math.log10(20)), PAL.G, 2.5, lA, [10, 8]);
    pill('≈ 1/s = 20 cells: past this, chance rarely wins', P.X(70), P.Y(Math.log10(20)) - 16, { size: 20, fam: 'mono', color: PAL.G, alpha: lA * prog(t, c(2) + 3, 1) });
    simBadge(P.box.x + P.box.w - 330, P.box.y - 46, lA);
    const kA = lA * prog(t, c(2) + 6.5, 1);
    text(`${alive} of 40`, 1300, 420, { size: 80, fam: 'disp', alpha: kA });
    text('new mutants with s = 5% survived', 1300, 460, { size: 20, fam: 'mono', color: PAL.dim, alpha: kA });
    text('(theory: about 2s, one in ten)', 1300, 490, { size: 20, fam: 'mono', color: PAL.dim, alpha: kA });
    // supply
    const sA = lA * prog(t, c(3), 1);
    if (sA > 0) {
      card(1300, 560, 540, 230, sA);
      text('mutation supply per generation', 1330, 605, { size: 20, fam: 'mono', color: PAL.dim, alpha: sA });
      text('N × μ', 1330, 680, { size: 64, fam: 'disp', alpha: sA });
      text('5 × 10⁷ cells × 10⁻⁶  ≈  50', 1330, 735, { size: 26, fam: 'mono', color: PAL.G, alpha: sA * prog(t, c(3) + 2, 1) });
      text('new mutants worth > 5%, every generation', 1330, 768, { size: 18, color: PAL.dim, alpha: sA * prog(t, c(3) + 2, 1) });
    }
  }
  // large vs tiny bottleneck
  const bA = env(t, c(4), 1e9, 0.8);
  if (bA > 0) {
    [['large bottleneck', '5 × 10⁷ cells', 60, true], ['tiny bottleneck', '500 cells', 4, false]].forEach(([title, n, births, big], i) => {
      const x = 120 + i * 880, y = 230;
      card(x, y, 800, 600, bA, big ? PAL.A : PAL.T);
      text(title, x + 30, y + 60, { size: 40, fam: 'disp', alpha: bA });
      text(n + ' per transfer', x + 30, y + 96, { size: 20, fam: 'mono', color: PAL.dim, alpha: bA });
      const up = prog(t, c(4) + 0.3, 4, ease.lin);
      line(x + 40, y + 520, x + 760, y + 520, PAL.faint, 2, bA);
      for (let k = 0; k < births; k++) {
        const bt = hash01(k, i + 3) * 0.95;
        if (bt > up) continue;
        const est = big ? hash01(k, 11) < 0.12 : false;
        const bx = x + 40 + bt * 720, len = est ? Math.min(up - bt, 0.5) * 720 : 8 + hash01(k, 12) * 20;
        const top = est ? (up - bt) * 900 : 0;
        g.save(); g.globalAlpha = bA; g.strokeStyle = est ? PAL.A : 'rgba(255,140,155,0.7)'; g.lineWidth = est ? 3 : 2; g.beginPath();
        g.moveTo(bx, y + 520); g.quadraticCurveTo(bx + len * 0.6, y + 520, bx + len, y + 520 - Math.min(330, top)); g.stroke(); g.restore();
        if (!est) text('×', bx + len, y + 512, { size: 14, color: PAL.T, align: 'center', alpha: bA });
      }
      text('time →', x + 760, y + 552, { size: 16, fam: 'mono', color: PAL.dim, align: 'right', alpha: bA });
      text(big ? 'many arise, some take hold: adaptation' : 'few arise, chance discards them: stagnation', x + 30, y + 160, { size: 26, fam: 'disp', italic: true, color: big ? PAL.A : PAL.T, alpha: bA * prog(t, c(4) + 4, 1), maxW: 740 });
    });
  }
};

// ── Steps 4 & 5 · freeze and replicate
SCENES.freeze = (t, c, D) => {
  rail([3, 4], env(t, 0.3, 1e9, 0.8));
  const tl = env(t, 0.3, c(3), 0.8, 0.8);
  const tubes = 10;
  if (tl > 0) {
    line(160, 260, 1760, 260, PAL.faint, 3, tl);
    text('transfers →', 1960 - 150, 300, { size: 18, fam: 'mono', color: PAL.dim, align: 'left', alpha: tl });
    // freezer box
    g.save(); g.globalAlpha = tl; rrect(140, 330, 1640, 210, 18); g.fillStyle = 'rgba(160,200,255,0.06)'; g.fill(); g.strokeStyle = 'rgba(180,215,255,0.45)'; g.lineWidth = 2; g.stroke(); g.restore();
    text('−80 °C  ·  in a cryoprotectant solution', 160, 570, { size: 20, fam: 'mono', color: '#a9d4ff', alpha: tl });
    for (let k = 0; k < tubes; k++) {
      const x = 240 + k * 160, at = c(0) + 0.4 + k * 0.35, drop = prog(t, at, 0.6, ease.out);
      line(x, 252, x, 268, PAL.dim, 2, tl);
      text(`T${k}`, x, 240, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: tl });
      const lifted = (k === 0 || k === 9) ? prog(t, c(1) + 0.4, 1) : 0;
      cryotube(x, lerp(300, 480, drop) - lifted * 0, 1.15, [PAL.A, PAL.C, PAL.G, PAL.T, PAL.violet][k % 5], { alpha: tl * drop, frost: 0.8, label: '' });
      if (lifted > 0) { g.save(); g.globalAlpha = tl * lifted; g.strokeStyle = PAL.G; g.lineWidth = 3; g.beginPath(); g.arc(x, 455, 50, 0, TAU); g.stroke(); g.restore(); }
    }
    // revive and compare
    const rv = env(t, c(1) + 0.4, c(2) + 0.2, 0.8, 0.6);
    if (rv > 0) {
      arrow(240, 520, 600, 690, PAL.G, { w: 3, alpha: rv, p: prog(t, c(1) + 0.6, 1) });
      arrow(1680, 520, 1320, 690, PAL.G, { w: 3, alpha: rv, p: prog(t, c(1) + 0.6, 1) });
      flask(700, 860, 0.6, { alpha: rv, t, cells: 40, seed: 3, level: 0.5, turb: 0.4, label: 'generation 0, revived' });
      flask(1220, 860, 0.6, { alpha: rv, t, cells: 40, seed: 6, level: 0.5, turb: 0.4, hues: i => (hash01(i, 2) < 0.8 ? 150 : null), label: 'generation 72' });
      text('ancestor and descendant, side by side, in the same conditions', 960, 640, { size: 30, fam: 'disp', italic: true, align: 'center', alpha: rv * prog(t, c(1) + 1.5, 1) });
    }
    // replay + insurance
    const rp = env(t, c(2), c(3), 0.8, 0.6);
    if (rp > 0) {
      const x4 = 240 + 4 * 160;
      g.save(); g.globalAlpha = rp; g.strokeStyle = PAL.violet; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(x4, 520); g.quadraticCurveTo(x4 + 60, 700, x4 + 400, 720); g.lineTo(1500, 720); g.stroke(); g.setLineDash([]); g.restore();
      text('replay from T4: does history repeat?', x4 + 420, 700, { size: 26, fam: 'disp', italic: true, color: PAL.violet, alpha: rp });
      text('backup if a flask is contaminated', 960, 830, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: rp * prog(t, c(2) + 2, 1) });
    }
  }
  // replicates
  const ra = env(t, c(3), 1e9, 0.8);
  if (ra > 0) {
    flask(250, 520, 0.55, { alpha: ra, cells: 30, t, seed: 9, level: 0.5, turb: 0.3, label: 'ancestor' });
    for (let j = 0; j < 6; j++) {
      const p = prog(t, c(3) + 0.3 + j * 0.15, 1.2), fx = 560 + j * 210;
      line(250, 384, 250, 350, 'rgba(150,170,210,0.4)', 2, ra);
      line(250, 350, lerp(250, fx, p), 350, 'rgba(150,170,210,0.4)', 2, ra);
      arrow(fx, 350, fx, 392, 'rgba(150,170,210,0.6)', { w: 2, p, alpha: ra, head: 10 });
      flask(fx, 520, 0.5, { alpha: ra * p, cells: 30, t, seed: 20 + j, level: 0.5, turb: 0.4, hues: i => (hash01(i, j) < 0.3 ? 40 + j * 52 : null), label: `pop ${j + 1}` });
    }
    text('same ancestor, same conditions, independent histories', 1810, 260, { size: 28, fam: 'disp', italic: true, align: 'right', alpha: ra });
  }
  // parallelism
  const pa = env(t, c(4), 1e9, 0.8);
  if (pa > 0) {
    const gx = 520, gy = 640, cw = 80, ch = 40;
    for (let gIdx = 0; gIdx < 10; gIdx++) text(`gene ${String.fromCharCode(65 + gIdx)}`, gx + gIdx * cw + cw / 2, gy - 12, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: pa });
    for (let p = 0; p < 6; p++) {
      text(`pop ${p + 1}`, gx - 16, gy + p * ch + 26, { size: 16, fam: 'mono', color: PAL.dim, align: 'right', alpha: pa });
      for (let gIdx = 0; gIdx < 10; gIdx++) {
        const hit = gIdx === 3 ? p !== 4 : gIdx === 6 ? p % 2 === 0 : hash01(p, gIdx, 4) < 0.08;
        const a = pa * prog(t, c(4) + 0.3 + p * 0.2, 0.5);
        g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(120,140,190,0.12)'; g.fillRect(gx + gIdx * cw + 2, gy + p * ch + 2, cw - 4, ch - 4);
        if (hit) { g.fillStyle = gIdx === 3 || gIdx === 6 ? PAL.G : PAL.T; g.fillRect(gx + gIdx * cw + 2, gy + p * ch + 2, cw - 4, ch - 4); }
        g.restore();
      }
    }
    const hl = pa * prog(t, c(4) + 2.5, 1);
    g.save(); g.globalAlpha = hl; g.strokeStyle = PAL.G; g.lineWidth = 3; g.strokeRect(gx + 3 * cw, gy, cw, 6 * ch); g.restore();
    text('hit in 5 of 6 populations: selection, not chance', gx + 10 * cw + 30, gy + 110, { size: 26, fam: 'disp', italic: true, color: PAL.G, alpha: hl, maxW: 420 });
    simBadge(gx, gy + 6 * ch + 20, pa, 'SCHEMATIC');
  }
};

// ── Step 6 · competition
SCENES.compete = (t, c, D) => {
  rail([5], env(t, 0.3, 1e9, 0.8));
  const a0 = env(t, 0.3, c(2), 0.8, 0.8);
  if (a0 > 0) {
    yeast(420, 400, 70, { hue: 150, alpha: a0, glow: 0.5 });
    yeast(700, 400, 70, { hue: null, alpha: a0, ring: 0.9 });
    text('evolved', 420, 520, { size: 26, fam: 'mono', color: PAL.A, align: 'center', alpha: a0 });
    text('ancestor, with a marker', 700, 520, { size: 26, fam: 'mono', color: PAL.dim, align: 'center', alpha: a0 });
    text('fitness is always relative to a reference', 560, 260, { size: 34, fam: 'disp', italic: true, align: 'center', alpha: a0 });
    const mA = env(t, c(1), c(2), 0.8, 0.8);
    for (let k = 0; k < 4; k++) {
      const x = 1000 + k * 220, a = mA * prog(t, c(1) + 0.4 + k * 0.5, 0.6), share = [0.5, 0.6, 0.7, 0.78][k];
      flask(x, 520, 0.5, { alpha: a, t, cells: 50, seed: 40 + k, level: 0.5, turb: 0.4, hues: i => (hash01(i, 7) < share ? 150 : null) });
      g.save(); g.globalAlpha = a; g.fillStyle = PAL.A; g.fillRect(x - 70, 600, 140 * share, 22); g.fillStyle = '#8f9bb6'; g.fillRect(x - 70 + 140 * share, 600, 140 * (1 - share), 22); g.restore();
      text(`cycle ${k}`, x, 660, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: a });
      if (k < 3) arrow(x + 70, 440, x + 150, 440, PAL.dim, { alpha: a, w: 2 });
    }
    text('one flask, both strains: the ratio is tracked by counting', 1330, 740, { size: 24, color: PAL.dim, align: 'center', alpha: mA * prog(t, c(1) + 2.5, 1) });
  }
  // growth rate vs the whole cycle
  const rA = env(t, c(2), c(3), 0.8, 0.8);
  if (rA > 0) {
    zone('without', 100, 215, rA, 800);
    const P = plotFrame({ x: 180, y: 290, w: 680, h: 420 }, [0, 16], [7.6, 10.3], { xt: [[0, '0 h'], [4, '4'], [8, '8'], [12, '12'], [16, '16 h']], yt: [[8, pow10(8)], [9, pow10(9)], [10, pow10(10)]], yl: 'cells, each grown alone', ylOff: 80 });
    P.draw(rA);
    const up = 16 * prog(t, c(2) + 0.5, 3, ease.lin);
    for (const [st, col] of [[RaceModel.X, PAL.violet], [RaceModel.Y, PAL.A]]) {
      g.save(); g.globalAlpha = rA; g.strokeStyle = col; g.lineWidth = 4; g.beginPath();
      for (let h = 0; h <= up; h += 0.1) { const p = [P.X(h), P.Y(Math.min(10.3, RaceModel.logN(st, h)))]; h ? g.lineTo(...p) : g.moveTo(...p); }
      g.stroke(); g.restore();
    }
    text('X: faster growth rate, but a long lag', 200, 790, { size: 20, fam: 'mono', color: PAL.violet, alpha: rA });
    text('Y: slower, but starts early', 200, 820, { size: 20, fam: 'mono', color: PAL.A, alpha: rA });
    text('growth rate says X is fitter', 200, 870, { size: 24, fam: 'disp', italic: true, color: PAL.T, alpha: rA * prog(t, c(2) + 3, 1) });
    zone('why', 1000, 215, rA * prog(t, c(2) + 4, 0.8), 820);
    const dep = RaceModel.depletion();
    const sp = prog(t, c(2) + 4.2, 3, ease.lin) * dep;
    const share = h => { const x = Math.pow(10, RaceModel.logN(RaceModel.X, h)), y = Math.pow(10, RaceModel.logN(RaceModel.Y, h)); return x / (x + y); };
    for (let k = 0; k <= 12; k++) {
      const h = k / 12 * dep; if (h > sp) break;
      const sx = share(h), x = 1020 + k * 62;
      g.save(); g.globalAlpha = rA; g.fillStyle = PAL.violet; g.fillRect(x, 300, 46, 380 * sx); g.fillStyle = PAL.A; g.fillRect(x, 300 + 380 * sx, 46, 380 * (1 - sx)); g.restore();
      if (k % 3 === 0) text(`${h.toFixed(0)} h`, x + 23, 712, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: rA });
    }
    text('sharing one flask until the glucose runs out', 1020, 285, { size: 18, fam: 'mono', color: PAL.dim, alpha: rA * prog(t, c(2) + 4.2, 1) });
    reason('in the same flask, Y ends the cycle ahead', 1020, 790, { alpha: rA * prog(t, c(2) + 7, 1), size: 32, color: PAL.A });
    reason('lag, growth, the switch and survival all count', 1020, 836, { alpha: rA * prog(t, c(2) + 8, 1), size: 28, color: PAL.ink });
  }
  // log ratio → slope = s
  const sA = env(t, c(3), 1e9, 0.8);
  if (sA > 0) {
    const P = plotFrame({ x: 220, y: 240, w: 900, h: 520 }, [0, 32], [-0.2, 1.8], { xt: [[0, '0'], [8, '8'], [16, '16'], [24, '24'], [32, '32 generations']], yt: [[0, '0'], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5']], yl: 'ln( evolved / ancestor )', ylOff: 80 });
    P.draw(sA);
    const up = 32 * prog(t, c(3) + 0.4, 3, ease.lin);
    line(P.X(0), P.Y(0), P.X(up), P.Y(0.05 * up), PAL.G, 3, sA, [10, 6]);
    for (let k = 0; k <= 4; k++) { const x = k * 8; if (x > up) break; const v = 0.05 * x + (hash01(k, 3) - 0.5) * 0.06; glowDot(P.X(x), P.Y(v), 16, 'rgba(234,240,251,0.95)', sA); }
    text('s = Δ ln( evolved / ancestor ) / Δt', 1200, 420, { size: 44, fam: 'disp', alpha: sA * prog(t, c(3) + 1.5, 1) });
    text('exponential growth → a straight line in log', 1200, 470, { size: 22, color: PAL.dim, alpha: sA * prog(t, c(3) + 2, 1) });
    text('here, s ≈ 0.05: 5% per generation', 1200, 520, { size: 26, fam: 'mono', color: PAL.G, alpha: sA * prog(t, c(3) + 3, 1) });
    const bA = env(t, c(4), 1e9, 0.8);
    pill('the core measurement of the field, with a blind spot →', 1200, 650, { size: 24, color: PAL.T, alpha: bA });
  }
};
