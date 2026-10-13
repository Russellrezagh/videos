// ───────────────────────────── scenes, part 2: what the barcodes revealed ─────────────────────────────

SCENES.tracking = (t, c, D) => {
  const P = plotFrame({ x: 190, y: 190, w: 1110, h: 590 }, [0, 112], [-7.5, -0.5], {
    xt: [[0, '0'], [16, '16'], [32, '32'], [48, '48'], [64, '64'], [80, '80'], [96, '96'], [112, '112']],
    yt: [[-7, pow10(-7)], [-6, pow10(-6)], [-5, pow10(-5)], [-4, pow10(-4)], [-3, pow10(-3)], [-2, pow10(-2)], [-1, pow10(-1)]],
    xl: 'generations', yl: 'lineage frequency', ylOff: 104,
  });
  const a0 = env(t, 0.2, 1e9, 0.8);
  P.draw(a0);
  simBadge(P.box.x + P.box.w - 330, P.box.y - 50, a0);
  text('replicate E1', P.box.x + 20, P.box.y - 26, { size: 22, fam: 'mono', color: PAL.G, alpha: a0, track: 2 });
  const upto = 112 * prog(t, c(0) + 2, c(2) + 4 - c(0) - 2, ease.lin);
  const hl = prog(t, c(3) + 0.5, 1) * (1 - prog(t, c(4) + 1, 1));
  g.save(); g.globalAlpha = a0 * (1 - 0.6 * hl);
  drawLineages(P, upto, { colorMix: prog(t, c(2), 2), neutralA: 0.08 });
  g.restore();
  // inferring s and τ from one trajectory
  if (hl > 0) {
    const ex = LT.example;
    g.save(); g.globalAlpha = hl; g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath();
    ex.y.forEach((v, k) => { const p = [P.X(k * 4), P.Y(Math.max(-7.5, v))]; k ? g.lineTo(...p) : g.moveTo(...p); });
    g.stroke(); g.restore();
    // fitted deterministic growth back to establishment at 1/(s·N)
    const y0 = Math.log10(1 / (ex.s * LT.N)), tauV = ex.tau;
    const xa = Math.max(0, tauV), ya = y0 + (xa - tauV) * ex.s * Math.LOG10E;
    const xb = 112, yb = ex.y[ex.y.length - 1];
    line(P.X(xa), P.Y(ya), P.X(xb), P.Y(yb), PAL.G, 3, hl, [10, 8]);
    panel(P.X(8), P.Y(-1.7), 420, 120, hl);
    text(`s  ≈ ${(ex.s * 100).toFixed(1)}% per generation`, P.X(8) + 24, P.Y(-1.7) + 48, { size: 28, fam: 'mono', color: PAL.G, alpha: hl });
    text(`τ  ≈ ${Math.round(tauV)} generations`, P.X(8) + 24, P.Y(-1.7) + 92, { size: 28, fam: 'mono', color: PAL.G, alpha: hl });
  }
  // detectability line
  const da = env(t, c(8), 1e9, 0.6);
  if (da > 0) {
    line(P.box.x, P.Y(-2), P.box.x + P.box.w, P.Y(-2), PAL.T, 3, da, [12, 8]);
    pill('visible to bulk sequencing (> 1%): ≈ 15 lineages', P.box.x + 20, P.Y(-2) - 16, { size: 21, fam: 'mono', color: PAL.T, alpha: da });
  }
  // right column: mean fitness, headline numbers, distributions
  const RX = 1400, RW = 420;
  const mA = env(t, c(1) + 1, 1e9, 0.8);
  panel(RX, 190, RW, 220, mA);
  text('mean fitness s̄(t)', RX + 22, 228, { size: 20, fam: 'mono', color: PAL.dim, alpha: mA });
  if (mA > 0) {
    const M = plotFrame({ x: RX + 40, y: 250, w: RW - 70, h: 130 }, [0, 112], [0, 0.1], {});
    g.save(); g.globalAlpha = mA; g.strokeStyle = PAL.A; g.lineWidth = 3.5; g.beginPath();
    for (let x = 0; x <= upto; x++) { const p = [M.X(x), M.Y(LT.sbar[x])]; x ? g.lineTo(...p) : g.moveTo(...p); }
    g.stroke(); g.restore();
    line(M.box.x, M.box.y + M.box.h, M.box.x + M.box.w, M.box.y + M.box.h, PAL.faint, 1.5, mA);
    text('as s̄ rises, neutral lineages sink', RX + 22, 400, { size: 18, color: PAL.dim, alpha: mA * prog(t, c(1) + 3, 1) });
  }
  const sA = env(t, c(4), 1e9, 0.8);
  panel(RX, 430, RW, 210, sA);
  text('≈ 25,000', RX + 22, 500, { size: 60, fam: 'disp', alpha: sA });
  text('adaptive lineages, s > 2%  (E1)', RX + 22, 532, { size: 19, fam: 'mono', color: PAL.dim, alpha: sA });
  const s2 = sA * prog(t, c(5), 1);
  text('≈ 1 × 10⁻⁶', RX + 22, 592, { size: 44, fam: 'disp', alpha: s2 });
  text('per cell per generation, s > 5%', RX + 22, 622, { size: 19, fam: 'mono', color: PAL.dim, alpha: s2 });
  const hA = env(t, c(6), 1e9, 0.8);
  panel(RX, 660, RW, 240, hA);
  const dfeA = hA * (1 - prog(t, c(7), 0.8));
  if (dfeA > 0) {
    text('fitness effects (log count)', RX + 22, 694, { size: 18, fam: 'mono', color: PAL.dim, alpha: dfeA });
    const mx = Math.log10(Math.max(...LT.dfe) + 1), bw = (RW - 60) / LT.dfe.length;
    LT.dfe.forEach((n, i) => {
      const hgt = 150 * Math.log10(n + 1) / mx * prog(t, c(6) + 0.3 + i * 0.05, 0.6), s = 0.02 + i * 0.005;
      g.save(); g.globalAlpha = dfeA; g.fillStyle = hsl(sHue(s), 80, 60); g.fillRect(RX + 30 + i * bw, 870 - hgt, bw - 2, hgt); g.restore();
    });
    text('2%', RX + 30, 892, { size: 16, fam: 'mono', color: PAL.dim, alpha: dfeA });
    text('5%', RX + 30 + 6 * bw, 892, { size: 16, fam: 'mono', color: PAL.dim, alpha: dfeA });
    text('8%', RX + 30 + 12 * bw, 892, { size: 16, fam: 'mono', color: PAL.dim, alpha: dfeA });
    text('11%', RX + 30 + 18 * bw, 892, { size: 16, fam: 'mono', color: PAL.dim, alpha: dfeA });
  }
  const tA = hA * prog(t, c(7), 0.8);
  if (tA > 0) {
    text('when mutations arose (τ)', RX + 22, 694, { size: 18, fam: 'mono', color: PAL.dim, alpha: tA });
    const mx = Math.max(...LT.tauHist), bw = (RW - 60) / LT.tauHist.length;
    LT.tauHist.forEach((n, i) => {
      const before = i * 10 - 90 < 0, hgt = 150 * n / mx * prog(t, c(7) + 0.2 + i * 0.05, 0.6);
      g.save(); g.globalAlpha = tA; g.fillStyle = before ? PAL.G : '#5f7396'; g.fillRect(RX + 30 + i * bw, 870 - hgt, bw - 3, hgt); g.restore();
    });
    const zx = RX + 30 + 9 * bw;
    line(zx, 720, zx, 872, PAL.ink, 2, tA, [5, 5]);
    text('start', zx + 6, 740, { size: 16, fam: 'mono', color: PAL.ink, alpha: tA });
    text('before the start', RX + 30, 892, { size: 16, fam: 'mono', color: PAL.G, alpha: tA });
  }
};

SCENES.mutants = (t, c, D) => {
  // isolate and sequence clones
  const iA = env(t, 0.2, c(1) + 0.3, 0.8, 0.8);
  if (iA > 0) {
    const cx = 420, cy = 540, R = 250;
    g.save(); g.globalAlpha = iA;
    g.fillStyle = 'rgba(255,214,140,0.08)'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(220,232,255,0.5)'; g.lineWidth = 4; g.stroke();
    for (let i = 0; i < 90; i++) {
      const rr = R * 0.88 * Math.sqrt(hash01(i, 11)), an = hash01(i, 12) * TAU;
      g.fillStyle = hsl(hash01(i, 13) * 360, 70, 62); g.beginPath(); g.arc(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 9, 0, TAU); g.fill();
      if (i < 8 && t > c(0) + 1 + i * 0.3) { g.strokeStyle = PAL.ink; g.lineWidth = 2.5; g.beginPath(); g.arc(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 17, 0, TAU); g.stroke(); }
    }
    g.restore();
    text('barcoded clones from generation 88', cx, cy + R + 50, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: iA });
    const genes = ['IRA1', 'GPB2', 'PDE2', 'diploid', 'IRA2', 'IRA1', 'PDE2', 'TOR1'];
    genes.forEach((gn, i) => {
      const y = 290 + i * 62, a = iA * prog(t, c(0) + 2 + i * 0.35, 0.7);
      for (let k = 0; k < 16; k++) { g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(120,140,190,0.35)'; rrect(860 + k * 46, y - 12, 40, 24, 8); g.fill(); g.restore(); }
      if (gn === 'diploid') { g.save(); g.globalAlpha = a; g.strokeStyle = PAL.G; g.lineWidth = 2; g.strokeRect(856, y - 17, 16 * 46 + 2, 34); g.restore(); }
      else { const k = Math.floor(hash01(i, 21) * 16); line(860 + k * 46 + 20, y - 20, 860 + k * 46 + 20, y + 20, PAL.T, 5, a); }
      text(gn, 1620, y + 8, { size: 24, fam: 'mono', color: gn === 'diploid' ? PAL.G : PAL.T, alpha: a });
    });
    text('whole-genome sequencing', 1228, 250, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: iA * prog(t, c(0) + 2, 0.7) });
  }
  // haploid → diploid
  const dA = env(t, c(1), c(2), 0.7, 0.7);
  if (dA > 0) {
    const dup = prog(t, c(1) + 1.2, 2);
    yeast(620, 520, 150, { hue: 210, sat: 30, light: 40, alpha: dA * 0.9 });
    yeast(1300, 520, 150 * (1 + 0.25 * dup), { hue: 45, sat: 40, light: 42, alpha: dA * dup });
    const rods = (cx, cy, scale, a, n) => { for (let k = 0; k < n; k++) { const x = cx - 70 + (k % 8) * 20, y = cy - 30 + Math.floor(k / 8) * 50; g.save(); g.globalAlpha = a; g.fillStyle = [PAL.A, PAL.C, PAL.G, PAL.T][k % 4]; rrect(x, y - 18 * scale, 10, 36 * scale, 5); g.fill(); g.restore(); } };
    rods(620, 520, 1, dA, 8);
    rods(1300, 520, 1, dA * dup, 16);
    arrow(820, 520, 1080, 520, PAL.dim, { alpha: dA, p: dup, w: 4 });
    text('haploid · 1n', 620, 760, { size: 30, fam: 'disp', align: 'center', alpha: dA });
    text('diploid · 2n', 1300, 760, { size: 30, fam: 'disp', align: 'center', alpha: dA * dup });
    text('whole-genome duplication', 950, 480, { size: 22, fam: 'mono', color: PAL.G, align: 'center', alpha: dA * dup });
  }
  // nutrient-sensing pathways
  const pA = env(t, c(2), 1e9, 0.8) * (1 - prog(t, c(3) + 0.2, 1));
  if (pA > 0) {
    const hit = prog(t, c(2) + 1.5, 1.2), torHit = prog(t, c(2) + 4.2, 1);
    const pkaGlow = 0.3 + 0.7 * hit;
    text('glucose', 760, 230, { size: 26, fam: 'mono', color: PAL.G, align: 'center', alpha: pA });
    arrow(700, 245, 600, 325, PAL.dim, { alpha: pA, w: 3 }); arrow(820, 245, 920, 325, PAL.dim, { alpha: pA, w: 3 });
    node(560, 360, 210, 64, 'Gpr1 / Gpa2', PAL.C, { alpha: pA });
    node(960, 360, 170, 64, 'Ras', PAL.C, { alpha: pA });
    node(300, 360, 140, 64, 'Gpb2', PAL.T, { alpha: pA, glow: hit * 0.4 });
    node(1240, 360, 190, 64, 'Ira1 / Ira2', PAL.T, { alpha: pA, glow: hit * 0.4 });
    node(760, 490, 200, 64, 'Cyr1', PAL.C, { alpha: pA, sub: 'adenylate cyclase', size: 24 });
    node(760, 610, 150, 56, 'cAMP', PAL.C, { alpha: pA });
    node(1060, 610, 150, 64, 'Pde2', PAL.T, { alpha: pA, glow: hit * 0.4 });
    node(760, 730, 150, 64, 'PKA', PAL.A, { alpha: pA, glow: pkaGlow * (0.7 + 0.3 * Math.sin(t * 3)) });
    text('growth, fermentation, stress resistance ↓', 760, 820, { size: 21, fam: 'mono', color: PAL.dim, align: 'center', alpha: pA });
    arrow(560, 395, 700, 455, PAL.dim, { alpha: pA }); arrow(960, 395, 820, 455, PAL.dim, { alpha: pA });
    arrow(760, 524, 760, 578, PAL.dim, { alpha: pA }); arrow(760, 640, 760, 694, PAL.dim, { alpha: pA });
    brake(372, 360, 450, 360, PAL.T, { alpha: pA }); brake(1144, 360, 1050, 360, PAL.T, { alpha: pA }); brake(984, 610, 840, 610, PAL.T, { alpha: pA });
    text('Ras/PKA', 300, 520, { size: 40, fam: 'disp', italic: true, color: PAL.C, alpha: pA });
    // TOR/Sch9
    text('nutrients', 1560, 430, { size: 22, fam: 'mono', color: PAL.G, align: 'center', alpha: pA });
    arrow(1560, 445, 1560, 462, PAL.dim, { alpha: pA });
    node(1560, 500, 240, 64, 'TORC1', PAL.violet, { alpha: pA, sub: 'Tor1 · Kog1', size: 24 });
    node(1560, 620, 150, 56, 'Sch9', PAL.violet, { alpha: pA });
    arrow(1560, 533, 1560, 590, PAL.dim, { alpha: pA }); arrow(1560, 648, 1560, 700, PAL.dim, { alpha: pA });
    text('growth', 1560, 730, { size: 21, fam: 'mono', color: PAL.dim, align: 'center', alpha: pA });
    text('TOR/Sch9', 1700, 360, { size: 40, fam: 'disp', italic: true, color: PAL.violet, align: 'right', alpha: pA });
    // mutation strikes on the brakes
    [[300, 360], [1240, 360], [1060, 610]].forEach(([x, y], i) => {
      const a = pA * prog(t, c(2) + 1.5 + i * 0.5, 0.4);
      text('✕', x + 70, y - 22, { size: 40, weight: 700, color: PAL.G, alpha: a });
    });
    [[1560, 500], [1560, 620]].forEach(([x, y]) => text('✕', x + 110, y - 18, { size: 30, weight: 700, color: PAL.G, alpha: pA * torHit }));
    text('✕ = adaptive mutations, mostly breaking the brakes', 1810, 860, { size: 20, fam: 'mono', color: PAL.G, align: 'right', alpha: pA * hit });
  }
  // the funnel
  const fA = env(t, c(3) + 0.2, c(4) + 0.2, 0.8, 0.8);
  if (fA > 0) {
    const rows = [[1300, 'hundreds of distinct mutations', 0], [760, 'a handful of genes: IRA1 · IRA2 · GPB2 · PDE2 …', 0.8], [380, 'two pathways: Ras/PKA · TOR/Sch9', 1.6]];
    rows.forEach(([w, lab, d], i) => {
      const a = fA * prog(t, c(3) + 0.4 + d, 0.8), y = 330 + i * 170;
      panel(960 - w / 2, y, w, 110, a, { fill: hexA([PAL.T, PAL.G, PAL.A][i], 0.12), stroke: hexA([PAL.T, PAL.G, PAL.A][i], 0.6) });
      if (i === 0) for (let k = 0; k < 120; k++) { g.save(); g.globalAlpha = a * 0.6; g.fillStyle = PAL.T; g.beginPath(); g.arc(960 - w / 2 + 20 + hash01(k, 1) * (w - 40), y + 12 + hash01(k, 2) * 86, 3, 0, TAU); g.fill(); g.restore(); }
      text(lab, 960, y + 66, { size: 34, fam: 'disp', align: 'center', alpha: a, shadow: 8 });
    });
  }
  // the question
  const qA = env(t, c(4) + 0.2, 1e9, 1);
  if (qA > 0) {
    text('Same genes,', 960, 450, { size: 110, fam: 'disp', italic: true, align: 'center', alpha: qA });
    text('same traits?', 960, 570, { size: 110, fam: 'disp', italic: true, color: PAL.G, align: 'center', alpha: qA * prog(t, c(4) + 1, 1) });
    text('KINSLER, GEILER-SAMEROTTE & PETROV  ·  eLIFE 2020;9:e61271', 960, 670, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: qA * prog(t, c(4) + 4, 1), track: 2 });
  }
};

SCENES.assay = (t, c, D) => {
  // the barcoded pool
  const poolA = env(t, 0.2, c(3), 0.8, 0.8);
  const mix = prog(t, c(1) + 0.5, 2.5);
  if (poolA > 0) {
    for (let i = 0; i < 240; i++) {
      const r = 200 * Math.sqrt(hash01(i, 1)), an = hash01(i, 2) * TAU;
      const x0 = 480 + Math.cos(an) * r, y0 = 560 + Math.sin(an) * r * 0.85;
      const x1 = 960 + Math.cos(an) * r * 0.45, y1 = 600 + Math.sin(an) * r * 0.3;
      g.save(); g.globalAlpha = poolA * clamp(prog(t, 0.3, 2, ease.lin) * 240 - i);
      g.fillStyle = hsl(hash01(i, 3) * 360, 78, 62); g.beginPath(); g.arc(lerp(x0, x1, mix), lerp(y0, y1, mix), 7, 0, TAU); g.fill(); g.restore();
    }
    text('pool of barcoded mutants', 480, 840, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: poolA * (1 - mix) });
  }
  const refA = env(t, c(1), c(3), 0.8, 0.8);
  if (refA > 0) {
    for (let i = 0; i < 900; i++) {
      const r = 230 * Math.sqrt(hash01(i, 5)), an = hash01(i, 6) * TAU;
      const x0 = 1440 + Math.cos(an) * r, y0 = 560 + Math.sin(an) * r * 0.85;
      const x1 = 960 + Math.cos(an) * r * 0.95, y1 = 600 + Math.sin(an) * r * 0.62;
      g.save(); g.globalAlpha = refA * 0.8; g.fillStyle = '#8f9bb6'; g.beginPath(); g.arc(lerp(x0, x1, mix), lerp(y0, y1, mix), 5, 0, TAU); g.fill(); g.restore();
    }
    text('ancestral reference strain', 1440, 840, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: refA * (1 - mix) });
    // donut 90:10
    const da = refA * prog(t, c(1) + 2.8, 1);
    g.save(); g.globalAlpha = da; g.lineWidth = 34;
    g.strokeStyle = '#8f9bb6'; g.beginPath(); g.arc(1600, 330, 90, -Math.PI / 2, -Math.PI / 2 + TAU * 0.9); g.stroke();
    g.strokeStyle = PAL.G; g.beginPath(); g.arc(1600, 330, 90, -Math.PI / 2 + TAU * 0.9, Math.PI * 1.5); g.stroke(); g.restore();
    text('90%', 1600, 330, { size: 40, fam: 'disp', align: 'center', alpha: da });
    text('reference', 1600, 362, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: da });
    text('10% barcoded mutants', 1600, 470, { size: 20, fam: 'mono', color: PAL.G, align: 'center', alpha: da });
    const ka = refA * prog(t, c(2) + 0.3, 1);
    text('mutant vs ancestor, not mutant vs mutant', 640, 300, { size: 34, fam: 'disp', align: 'center', alpha: ka });
    text('mean fitness ≈ constant during the assay', 640, 345, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: ka });
  }
  // five time points
  const tpA = env(t, c(3), c(4), 0.8, 0.8);
  if (tpA > 0) {
    for (let k = 0; k < 5; k++) {
      const x = 260 + k * 350, a = tpA * prog(t, c(3) + k * 0.5, 0.7);
      flask(x, 650, 0.62, { alpha: a, t, cells: 60, seed: 50 + k, level: 0.45, turb: 0.5, hues: i => hash01(i, k) < 0.1 + k * 0.03 ? hash01(i, 7) * 360 : null, label: `T${k}` });
      cryotube(x, 830, 0.9, [PAL.A, PAL.C, PAL.G, PAL.T, PAL.violet][k], { alpha: a, frost: 0.7 });
      if (k < 4) { arrow(x + 90, 560, x + 260, 560, PAL.dim, { alpha: a, w: 3 }); text('48 h', x + 175, 540, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: a }); }
    }
    text('≈ 5 × 10⁷ cells carried over at each transfer', 960, 300, { size: 32, fam: 'disp', align: 'center', alpha: tpA });
  }
  // ApaLI removes the reference barcode
  const cA = env(t, c(4), c(5), 0.8, 0.8);
  if (cA > 0) {
    const cut = prog(t, c(4) + 1.5, 1.2);
    for (let i = 0; i < 10; i++) {
      const y = 300 + i * 52, isRef = i % 5 !== 2, x = 260;
      g.save(); g.globalAlpha = cA * (isRef ? 1 - 0.75 * prog(t, c(4) + 3, 1.2) : 1);
      g.fillStyle = 'rgba(147,162,195,0.5)'; g.fillRect(x, y, 120, 20); g.fillRect(x + 440, y, 120, 20);
      if (isRef) {
        g.fillStyle = '#8f9bb6'; g.fillRect(x + 120, y, 150 - cut * 10, 20); g.fillRect(x + 290 + cut * 10, y, 150 - cut * 10, 20);
        g.fillStyle = PAL.T; g.fillRect(x + 270 - cut * 10, y, 20 + cut * 20 > 20 ? 20 : 20, 20);
      } else {
        for (let k = 0; k < 10; k++) { g.fillStyle = BASE_COL[BC_SEQ[(k * 3 + i) % 20]]; g.fillRect(x + 120 + k * 32, y, 32, 20); }
      }
      g.restore();
    }
    text('GTGCAC  (ApaLI site in the reference barcode)', 500, 860, { size: 22, fam: 'mono', color: PAL.T, align: 'center', alpha: cA });
    text('✂', 540, 270, { size: 50, color: PAL.T, align: 'center', alpha: cA * (1 - cut) + cA * 0.3 });
    // gel
    const ga = cA * prog(t, c(4) + 3, 1);
    g.save(); g.globalAlpha = ga; rrect(1120, 260, 360, 600, 16); g.fillStyle = 'rgba(10,18,36,0.9)'; g.fill(); g.strokeStyle = PAL.faint; g.lineWidth = 2; g.stroke();
    g.fillStyle = PAL.A; g.shadowColor = PAL.A; g.shadowBlur = 20; g.fillRect(1180, 420, 240, 16);
    g.fillStyle = 'rgba(143,155,182,0.7)'; g.shadowColor = '#8f9bb6'; g.fillRect(1180, 420 + 300 * prog(t, c(4) + 3.5, 2), 240, 12);
    g.restore();
    text('350 bp: mutant barcodes, kept', 1510, 434, { size: 20, fam: 'mono', color: PAL.A, alpha: ga });
    text('cut reference fragments: removed', 1510, 734, { size: 20, fam: 'mono', color: PAL.dim, alpha: ga * prog(t, c(4) + 4.5, 1) });
  }
  // fitness = slope
  const fA = env(t, c(5), 1e9, 0.8);
  if (fA > 0) {
    const P = plotFrame({ x: 220, y: 230, w: 820, h: 520 }, [0, 4], [-1.6, 3.4], {
      xt: [[0, 'T0'], [1, 'T1'], [2, 'T2'], [3, 'T3'], [4, 'T4']], yt: [[-1, '−1'], [0, '0'], [1, '1'], [2, '2'], [3, '3']], yl: 'ln( frequency / initial )', ylOff: 70, xl: 'time point (48 h cycles)',
    });
    P.draw(fA);
    const up = 4 * prog(t, c(5) + 0.5, 3, ease.lin);
    const sb = 0.08;
    for (let i = 0; i < 14; i++) {
      const neutral = i >= 10, s = neutral ? 0 : 0.25 + hash01(i, 3) * 0.6;
      const col = neutral ? '#8f9bb6' : hsl(hash01(i, 4) * 360, 78, 62);
      g.save(); g.globalAlpha = fA; g.strokeStyle = col; g.lineWidth = neutral ? 2 : 3; if (neutral) g.setLineDash([6, 6]); g.beginPath();
      for (let k = 0; k <= Math.floor(up); k++) { const v = (s - sb) * k + 0.06 * (hash01(i, k) - 0.5) * k; const p = [P.X(k), P.Y(v)]; k ? g.lineTo(...p) : g.moveTo(...p); g.fillStyle = col; }
      g.stroke(); g.restore();
      for (let k = 0; k <= Math.floor(up); k++) { const v = (s - sb) * k + 0.06 * (hash01(i, k) - 0.5) * k; glowDot(P.X(k), P.Y(v), 10, col, fA); }
    }
    text('neutral lineages (dashed) drift down slowly: they track the mean fitness', 1130, 330, { size: 22, color: PAL.dim, alpha: fA * prog(t, c(5) + 4, 1), maxW: 640 });
    text('fitness of mutant i', 1130, 470, { size: 26, fam: 'mono', color: PAL.G, alpha: fA * prog(t, c(5) + 2, 1) });
    text('sᵢ ≈ Δ ln fᵢ / Δt + s̄(t)', 1130, 550, { size: 52, fam: 'disp', alpha: fA * prog(t, c(5) + 2, 1) });
    text('slope of the line, corrected for the mean fitness s̄', 1130, 600, { size: 22, color: PAL.dim, alpha: fA * prog(t, c(5) + 2.5, 1) });
    simBadge(1130, 680, fA * prog(t, c(5) + 3, 1));
  }
};

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

SCENES.environments = (t, c, D) => {
  const nA = env(t, 0.2, c(1) + 0.3, 0.8, 0.8);
  if (nA > 0) {
    text('292', 700, 560, { size: 220, fam: 'disp', align: 'center', alpha: nA });
    text('adaptive mutants', 700, 620, { size: 26, fam: 'mono', color: PAL.dim, align: 'center', alpha: nA });
    text('×', 960, 540, { size: 120, fam: 'disp', color: PAL.G, align: 'center', alpha: nA * prog(t, 1.2, 0.6) });
    text('45', 1220, 560, { size: 220, fam: 'disp', align: 'center', alpha: nA * prog(t, 1.6, 0.8) });
    text('environments', 1220, 620, { size: 26, fam: 'mono', color: PAL.dim, align: 'center', alpha: nA * prog(t, 1.6, 0.8) });
  }
  // the 45 environments as chips
  const chA = env(t, c(1), c(2) + 0.4, 0.8, 0.8);
  if (chA > 0) {
    ENVIRONMENTS.forEach((e, j) => {
      const col = j % 9, row = Math.floor(j / 9), x = 140 + col * 190, y = 240 + row * 112;
      const a = chA * prog(t, c(1) + 0.2 + j * 0.06, 0.5);
      panel(x, y, 176, 88, a, { r: 12, fill: hexA(CAT_COL[e.cat], e.kind === 'EC' ? 0.22 : 0.09), stroke: hexA(CAT_COL[e.cat], e.kind === 'EC' ? 0.9 : 0.45) });
      const lab = e.kind === 'EC' ? `EC · batch ${j + 1}` : e.label || e.cat;
      text(lab, x + 14, y + 38, { size: 18, weight: 600, color: CAT_COL[e.cat], alpha: a, maxW: 156, lh: 1.1 });
      if (e.kind === 'EC') text('1.5% glucose · 48 h', x + 14, y + 70, { size: 14, fam: 'mono', color: PAL.dim, alpha: a });
    });
    const cats = ['EC', 'Glucose', 'Flask', 'Transfer', 'Salt', 'Drug', 'Carbon'];
    const names = { EC: 'evolution condition', Glucose: 'glucose', Flask: 'flask shape', Transfer: 'transfer time', Salt: 'salt', Drug: 'drugs', Carbon: 'carbon source' };
    cats.forEach((k, i) => { const x = 140 + i * 245; g.save(); g.globalAlpha = chA; g.fillStyle = CAT_COL[k]; g.fillRect(x, 830, 18, 18); g.restore(); text(names[k], x + 28, 846, { size: 20, color: PAL.dim, alpha: chA }); });
  }
  // the yardstick: Z scores against batch-to-batch variation
  const zA = env(t, c(2), c(4), 0.8, 0.8);
  if (zA > 0) {
    const zx = z => 200 + (Math.sign(z) * Math.log10(1 + Math.abs(z))) / Math.log10(1 + 120) * 1500 + 150;
    const y = 520;
    line(zx(-2), y, zx(150), y, PAL.faint, 2, zA);
    [[-1, '−1'], [0, '0'], [2, '2'], [5, '5'], [20, '20'], [100, '100']].forEach(([v, l]) => { line(zx(v), y - 8, zx(v), y + 8, PAL.faint, 2, zA); text(l, zx(v), y + 40, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: zA }); });
    text('Z = how strongly mutant fitnesses shift, relative to the spread between repeats of the evolution condition', 960, 640, { size: 22, color: PAL.dim, align: 'center', alpha: zA, maxW: 1300 });
    const band = zA * prog(t, c(2) + 1.5, 1);
    g.save(); g.globalAlpha = band * 0.18; g.fillStyle = PAL.G; g.fillRect(zx(-2), y - 120, zx(2) - zx(-2), 220); g.restore();
    line(zx(2), y - 140, zx(2), y + 100, PAL.G, 3, band, [10, 6]);
    text('Z = 2', zx(2), y - 150, { size: 22, fam: 'mono', color: PAL.G, align: 'center', alpha: band });
    const split = prog(t, c(3) + 0.3, 1.5);
    ENVIRONMENTS.forEach((e, j) => {
      const z = clamp(FitnessAtlas.z[j], -1.8, 150), strong = e.kind === 'strong';
      const dy = (hash01(j, 9) - 0.5) * 120 + (strong ? -1 : 1) * split * 0;
      const a = zA * prog(t, c(2) + 0.5 + j * 0.03, 0.4);
      glowDot(zx(z), y + dy * 0.6, 22, hexA(CAT_COL[e.cat], 0.5), a);
      g.save(); g.globalAlpha = a; g.fillStyle = CAT_COL[e.cat]; g.beginPath(); g.arc(zx(z), y + dy * 0.6, 8, 0, TAU); g.fill(); g.restore();
    });
    text('25 subtle', (zx(-2) + zx(2)) / 2, y - 200, { size: 46, fam: 'disp', align: 'center', alpha: zA * split });
    text('20 strong', zx(30), y - 200, { size: 46, fam: 'disp', align: 'center', color: PAL.T, alpha: zA * split });
  }
  // the fitness matrix
  const hA = env(t, c(4), 1e9, 0.8);
  if (hA > 0) {
    const x = 560, y = 210, w = 45 * 24, h = 640;
    drawHeat(x, y, w, h, hA);
    const sx = x + 25 * 24;
    line(sx, y - 40, sx, y + h + 10, PAL.ink, 2.5, hA);
    text('subtle (25)', x + 12.5 * 24, y - 16, { size: 22, fam: 'mono', color: PAL.ink, align: 'center', alpha: hA });
    text('strong (20)', sx + 10 * 24, y - 16, { size: 22, fam: 'mono', color: PAL.T, align: 'center', alpha: hA });
    text('columns: environments · rows: mutants', x, y + h + 40, { size: 20, fam: 'mono', color: PAL.dim, alpha: hA });
    simBadge(x + w - 340, y + h + 18, hA);
    // legend
    for (let i = 0; i < 100; i++) { g.save(); g.globalAlpha = hA; g.fillStyle = heatColor(lerp(-1.5, 1.8, i / 99)); g.fillRect(1680, y + 300 - i * 2.4, 26, 3); g.restore(); }
    text('fitter', 1716, y + 70, { size: 17, fam: 'mono', color: PAL.dim, alpha: hA });
    text('than the', 1716, y + 92, { size: 17, fam: 'mono', color: PAL.dim, alpha: hA });
    text('ancestor', 1716, y + 114, { size: 17, fam: 'mono', color: PAL.dim, alpha: hA });
    text('worse', 1716, y + 300, { size: 17, fam: 'mono', color: PAL.dim, alpha: hA });
    // near home: IRA1 nonsense on top
    const [r0, n] = classRows('ira1n'), ry = y + r0 / 292 * h, rh = n / 292 * h;
    const o1 = hA * env(t, c(4) + 0.6, c(5) + 0.3, 0.8, 0.6);
    g.save(); g.globalAlpha = o1; g.strokeStyle = PAL.G; g.lineWidth = 3; g.strokeRect(x - 2, ry - 2, 25 * 24 + 4, rh + 4); g.restore();
    pill('IRA1 nonsense: highest fitness across the subtle environments', x + 30, ry - 12, { size: 21, color: PAL.G, alpha: o1 });
    // far from home
    const o2 = hA * prog(t, c(5) + 0.2, 0.8);
    if (o2 > 0) {
      const hiCols = ['0.5 M NaCl', 'KCl', '1 Day', '5 Day', '6 Day', '7 Day'];
      ENVIRONMENTS.forEach((e, j) => {
        if (!hiCols.includes(e.label)) return;
        g.save(); g.globalAlpha = o2; g.strokeStyle = CAT_COL[e.cat]; g.lineWidth = 2; g.strokeRect(x + j * 24, y - 2, 24, h + 4); g.restore();
      });
      const grp = (labels, lab, col, up = 0) => {
        const js = ENVIRONMENTS.map((e, j) => labels.includes(e.label) ? j : -1).filter(j => j >= 0);
        const x0 = x + js[0] * 24, x1 = x + (js[js.length - 1] + 1) * 24;
        g.save(); g.globalAlpha = o2; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y - 40 - up); g.lineTo(x0, y - 48 - up); g.lineTo(x1, y - 48 - up); g.lineTo(x1, y - 40 - up); g.stroke(); g.restore();
        text(lab, (x0 + x1) / 2, y - 58 - up, { size: 18, fam: 'mono', color: col, align: 'center', alpha: o2 });
      };
      grp(['1 Day', '5 Day', '6 Day', '7 Day'], 'transfer 1–7 days', CAT_COL.Transfer);
      grp(['0.5 M NaCl', 'KCl'], 'salt', CAT_COL.Salt, 34);
      g.save(); g.globalAlpha = o2; g.strokeStyle = PAL.T; g.lineWidth = 3; g.strokeRect(sx, ry - 2, 20 * 24, rh + 4); g.restore();
      const [g0, gn] = classRows('gpb2');
      pill('IRA1 nonsense: deleterious in salt and long transfers', x + 45 * 24, ry + rh + 34, { size: 20, color: PAL.T, alpha: o2 * prog(t, c(5) + 1.5, 1), align: 'right' });
      pill('GPB2: fine in salt, hurt by 1-day transfers', x + 45 * 24, y + (g0 + gn) / 292 * h + 34, { size: 20, color: PAL.C, alpha: o2 * prog(t, c(5) + 3.5, 1), align: 'right' });
    }
  }
};

SCENES.svd = (t, c, D) => {
  const A = FitnessAtlas, dec = A.dec;
  // F: the subtle block
  const fA = env(t, 0.2, c(3), 0.8, 0.8);
  if (fA > 0) {
    drawHeat(370, 230, 25 * 14, 580, fA, 25);
    text('F', 370 + 175, 200, { size: 48, fam: 'disp', italic: true, align: 'center', alpha: fA });
    text('292 mutants × 25 subtle environments', 370 + 175, 860, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: fA });
  }
  // F ≈ P · E
  const eqA = env(t, c(1), c(3), 0.8, 0.8);
  if (eqA > 0) {
    const sp = prog(t, c(1) + 0.5, 1.6);
    text('≈', 790, 540, { size: 80, fam: 'disp', align: 'center', alpha: eqA });
    // P: 292 × 8 from U·S, rows in display order
    const px = 860, py = 230, pw = 8 * 18 * sp + 4, ph = 580;
    g.save(); g.globalAlpha = eqA;
    const uMax = [0, 1, 2, 3, 4, 5, 6, 7].map(k => Math.max(...A.mutants.map((_, i) => Math.abs(dec.U[i][k]))));
    const sgn0 = dec.U[0][0] < 0 ? -1 : 1;
    A.rowOrder.forEach((ri, r) => { for (let k = 0; k < 8; k++) { const v = dec.U[ri][k] / uMax[k] * (k ? 1.6 : sgn0 * 1.6); g.fillStyle = heatColor(clamp(v, -1.5, 1.8)); g.fillRect(px + k * 18 * sp, py + r / 292 * ph, 18 * sp + 0.5, ph / 292 + 0.6); } });
    g.restore();
    text('P', px + pw / 2, 200, { size: 48, fam: 'disp', italic: true, align: 'center', alpha: eqA });
    text('phenotypes', px + pw / 2, 860, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: eqA * sp });
    text('×', 1060, 540, { size: 60, fam: 'disp', align: 'center', alpha: eqA * sp });
    const ex = 1110, ey = 470;
    g.save(); g.globalAlpha = eqA * sp;
    for (let k = 0; k < 8; k++) { const vMax = Math.max(...dec.V[k].map(Math.abs)); for (let j = 0; j < 25; j++) { g.fillStyle = heatColor(clamp(dec.V[k][j] / vMax * (k ? 1.6 : sgn0 * 1.6), -1.5, 1.8)); g.fillRect(ex + j * 14, ey + k * 18, 14.5, 18.5); } }
    g.restore();
    text('E', ex + 175, ey - 30, { size: 48, fam: 'disp', italic: true, align: 'center', alpha: eqA * sp });
    text('weight of each phenotype in each environment', ex + 175, ey + 190, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: eqA * sp });
    const fa2 = eqA * prog(t, c(1) + 2.5, 1) * (1 - prog(t, c(2) + 0.2, 1));
    text('fᵢⱼ  =  Σₖ  pᵢₖ · eₖⱼ', 1290, 290, { size: 54, fam: 'disp', align: 'center', alpha: fa2 });
    text('fitness of mutant i in environment j', 1290, 340, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: fa2 });
  }
  // phenotype space (computed live: SVD of the simulated fitness matrix)
  const scA = env(t, c(2), c(3), 0.8, 0.8);
  if (scA > 0) {
    const bx = 1500, by = 250, bw = 340, bh = 340;
    panel(bx - 20, by - 60, bw + 40, bh + 110, scA);
    text('phenotype space (components 2 & 3)', bx, by - 26, { size: 17, fam: 'mono', color: PAL.dim, alpha: scA });
    const xs = A.mutants.map((_, i) => dec.U[i][1] * dec.S[1]), ys = A.mutants.map((_, i) => dec.U[i][2] * dec.S[2]);
    const q90 = a => a.map(Math.abs).sort((p, q) => p - q)[Math.floor(a.length * 0.9)] * 1.6;
    const sx = q90(xs), sy = q90(ys);
    A.mutants.forEach((m, i) => {
      const a = scA * clamp(prog(t, c(2) + 0.5, 3, ease.lin) * 292 - i);
      g.save(); g.globalAlpha = a; g.fillStyle = m.cls.col; g.beginPath(); g.arc(bx + bw / 2 + clamp(xs[i] / sx, -1, 1) * bw * 0.46, by + bh / 2 - clamp(ys[i] / sy, -1, 1) * bh * 0.46, 4.5, 0, TAU); g.fill(); g.restore();
    });
    text('mutants of the same gene cluster together', bx, by + bh + 34, { size: 17, color: PAL.dim, alpha: scA * prog(t, c(2) + 3.5, 1) });
  }
  // variance explained
  const vA = env(t, c(3), c(5), 0.8, 0.8);
  if (vA > 0) {
    const vals = [95, 3.39, 0.415, 0.28, 0.265, 0.07, 0.05, 0.04, 0.022, 0.018, 0.015];
    const box = { x: 220, y: 230, w: 880, h: 560 };
    const Y = v => box.y + box.h - (Math.log10(v) + 2) / 4 * box.h;
    [[100, '100%'], [10, '10%'], [1, '1%'], [0.1, '0.1%'], [0.01, '0.01%']].forEach(([v, l]) => { line(box.x, Y(v), box.x + box.w, Y(v), 'rgba(120,140,190,0.13)', 1, vA); text(l, box.x - 14, Y(v) + 7, { size: 19, fam: 'mono', color: PAL.dim, align: 'right', alpha: vA }); });
    const noise = 0.03;
    g.save(); g.globalAlpha = vA * 0.25; g.fillStyle = '#8f9bb6'; g.fillRect(box.x, Y(noise), box.w, box.y + box.h - Y(noise)); g.restore();
    text('noise', box.x - 14, Y(noise) + 7, { size: 19, fam: 'mono', color: PAL.G, align: 'right', alpha: vA });
    vals.forEach((v, i) => {
      const bw = box.w / vals.length, x = box.x + i * bw + 10, gp = prog(t, c(3) + 0.4 + i * 0.15, 0.8), top = lerp(box.y + box.h, Y(v), gp);
      g.save(); g.globalAlpha = vA; g.fillStyle = i < 8 ? (i === 0 ? PAL.G : PAL.C) : '#5f7396'; g.fillRect(x, top, bw - 20, box.y + box.h - top); g.restore();
      text(String(i + 1), x + (bw - 20) / 2, box.y + box.h + 30, { size: 19, fam: 'mono', color: PAL.dim, align: 'center', alpha: vA });
    });
    text('95%', box.x + 10 + (box.w / vals.length - 20) / 2, Y(95) + 40, { size: 30, fam: 'disp', color: '#071021', align: 'center', alpha: vA * prog(t, c(3) + 1, 1) });
    text('8 components above noise', box.x + 3 * box.w / 11, Y(3.4) - 20, { size: 30, fam: 'disp', color: PAL.C, alpha: vA * prog(t, c(3) + 2.5, 1) });
    text('variance explained across the 25 subtle environments, per component', box.x, box.y - 40, { size: 20, fam: 'mono', color: PAL.dim, alpha: vA });
    simBadge(box.x, box.y + box.h + 56, vA, 'VALUES AS REPORTED · SCHEMATIC');
  }
  // cross-validation
  const cvA = env(t, c(4), c(5), 0.8, 0.8);
  if (cvA > 0) {
    const bx = 1220;
    panel(bx, 200, 620, 640, cvA);
    text('bi-cross-validation', bx + 30, 248, { size: 22, fam: 'mono', color: PAL.dim, alpha: cvA });
    for (let i = 0; i < 292; i++) {
      const train = i < 60, x = bx + 40 + (i % 26) * 21.5, y = 290 + Math.floor(i / 26) * 21;
      const col = MUTANT_CLASSES[Math.floor(hash01(i, 3) * 8)].col;
      g.save(); g.globalAlpha = cvA * clamp(prog(t, c(4) + 0.3, 1.5, ease.lin) * 292 - i);
      g.beginPath(); g.arc(x, y, 7, 0, TAU); if (train) { g.fillStyle = PAL.G; g.fill(); } else { g.strokeStyle = col; g.lineWidth = 2; g.stroke(); } g.restore();
    }
    text('● 60 training mutants   ○ 232 test mutants', bx + 30, 560, { size: 20, fam: 'mono', color: PAL.ink, alpha: cvA });
    [['1 component', 85], ['5 components', 95.1], ['8 components', 96.2]].forEach(([lab, v], i) => {
      const y = 620 + i * 64, gp = prog(t, c(4) + 2 + i * 0.6, 1);
      text(lab, bx + 30, y + 22, { size: 20, fam: 'mono', color: PAL.dim, alpha: cvA });
      g.save(); g.globalAlpha = cvA; g.fillStyle = hexA(PAL.C, 0.25); g.fillRect(bx + 200, y, 360, 30); g.fillStyle = PAL.C; g.fillRect(bx + 200, y, 360 * v / 100 * gp, 30); g.restore();
      text(`${v}%`, bx + 200 + 360 * v / 100 * gp - 8, y + 23, { size: 20, fam: 'mono', weight: 600, color: '#071021', align: 'right', alpha: cvA * gp });
    });
    text('held-out mutants in held-out subtle environments', bx + 30, 820, { size: 17, color: PAL.dim, alpha: cvA });
  }
  // strong environments
  const sA = env(t, c(5), 1e9, 0.8);
  if (sA > 0) {
    text('predicting the 20 strong environments from a model built only on subtle ones', 960, 230, { size: 34, fam: 'disp', align: 'center', alpha: sA });
    const ax = v => 360 + (v + 20) / 120 * 1300;
    line(ax(-20), 360, ax(100), 360, PAL.faint, 2, sA);
    [[-20, ''], [0, '0%'], [25, '25%'], [50, '50%'], [75, '75%'], [100, '100%']].forEach(([v, l]) => { line(ax(v), 352, ax(v), 368, PAL.faint, 2, sA); text(l, ax(v), 398, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: sA }); });
    const rp = prog(t, c(5) + 1, 1.5);
    g.save(); g.globalAlpha = sA * 0.8; g.fillStyle = hexA(PAL.C, 0.35); g.fillRect(ax(29), 340, (ax(95) - ax(29)) * rp, 40); g.restore();
    text('8-component model: 29 – 95% of variance explained', ax(62), 326, { size: 24, color: PAL.C, align: 'center', alpha: sA * rp });
    const rows = [['Baffle, 1.8% glucose', 51, 95], ['0.5 M NaCl (high salt)', -15, 72]];
    rows.forEach(([lab, one, eight], i) => {
      const y = 520 + i * 170, a = sA * prog(t, c(5) + 2.5 + i * 2.2, 0.8);
      const hl = i === 1 ? 0.6 + 0.4 * prog(t, c(6), 1) : 1;
      text(lab, ax(-20), y - 18, { size: 28, fam: 'disp', alpha: a * hl });
      const g1 = prog(t, c(5) + 3 + i * 2.2, 1), g8 = prog(t, c(5) + 3.5 + i * 2.2, 1);
      g.save(); g.globalAlpha = a * hl;
      g.fillStyle = '#8f9bb6'; const x0 = ax(0); g.fillRect(Math.min(x0, ax(one * g1)), y, Math.abs(ax(one * g1) - x0), 34);
      g.fillStyle = PAL.G; g.fillRect(x0, y + 46, ax(eight * g8) - x0, 34); g.restore();
      line(x0, y - 6, x0, y + 86, PAL.ink, 2, a);
      text(one < 0 ? '1 component: below zero, worse than predicting the average' : `1 component: ${one}%`, one < 0 ? ax(0) + 14 : ax(one) + 14, y + 25, { size: 20, fam: 'mono', color: one < 0 ? PAL.T : PAL.dim, alpha: a * g1 * hl });
      text(`8 components: ${eight}%`, ax(eight) + 14, y + 71, { size: 20, fam: 'mono', color: PAL.G, alpha: a * g8 * hl });
    });
  }
};

SCENES.meaning = (t, c, D) => {
  // the three minor components: tiny near home…
  const sA = env(t, 0.2, c(2), 0.8, 0.8);
  if (sA > 0) {
    text('variance explained by the 3 smallest components', 200, 250, { size: 22, fam: 'mono', color: PAL.dim, alpha: sA });
    text('near the evolution condition', 200, 330, { size: 30, fam: 'disp', alpha: sA });
    g.save(); g.globalAlpha = sA; g.fillStyle = hexA(PAL.C, 0.18); g.fillRect(200, 350, 1500, 40);
    g.fillStyle = PAL.G; g.fillRect(200, 350, 1500 * 0.011 * prog(t, 1, 1), 40); g.restore();
    text('1.1%', 200 + 1500 * 0.011 + 16, 380, { size: 26, fam: 'mono', color: PAL.G, alpha: sA * prog(t, 1, 1) });
    // …large far away
    const fa = sA * prog(t, c(1), 0.8);
    const rows = [['6-day transfers', 25, 46, 45], ['1-day transfers', 60, 73, 17]];
    rows.forEach(([lab, five, eight, share], i) => {
      const y = 520 + i * 150, a = fa * prog(t, c(1) + i * 1.2, 0.8), gp = prog(t, c(1) + 0.6 + i * 1.2, 1.5);
      text(lab, 200, y - 14, { size: 30, fam: 'disp', alpha: a });
      g.save(); g.globalAlpha = a;
      g.fillStyle = hexA(PAL.C, 0.18); g.fillRect(200, y, 1500, 44);
      g.fillStyle = PAL.C; g.fillRect(200, y, 1500 * five / 100, 44);
      g.fillStyle = PAL.G; g.fillRect(200 + 1500 * five / 100, y, 1500 * (eight - five) / 100 * gp, 44); g.restore();
      text(`5 components: ${five}%`, 214, y + 30, { size: 20, fam: 'mono', weight: 600, color: '#071021', alpha: a });
      text(`all 8 components: ${eight}%. The 3 smallest supply ${share}% of what the model explains.`, 200, y + 76, { size: 22, fam: 'mono', color: PAL.G, alpha: a * gp });
    });
  }
  // iceberg
  const iA = env(t, c(2), c(4) + 0.2, 0.8, 0.8);
  if (iA > 0) {
    const drop = prog(t, c(3) + 0.3, 3);
    const water = 430 + drop * 260;
    const berg = [[960, 250], [1060, 360], [1120, 430], [1260, 560], [1300, 700], [1180, 820], [960, 880], [720, 820], [620, 690], [700, 520], [840, 400]];
    g.save(); g.globalAlpha = iA;
    g.beginPath(); berg.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    const bg = g.createLinearGradient(0, 250, 0, 880); bg.addColorStop(0, '#e9f3ff'); bg.addColorStop(1, '#5b7fb8'); g.fillStyle = bg; g.fill();
    // facets: hidden phenotypes
    g.strokeStyle = 'rgba(20,40,80,0.45)'; g.lineWidth = 2;
    for (let i = 0; i < berg.length; i++) { const [x, y] = berg[i]; g.beginPath(); g.moveTo(960, 560); g.lineTo(x, y); g.stroke(); }
    g.fillStyle = 'rgba(8,24,52,0.62)'; g.fillRect(0, water, W, 940 - water);
    g.restore();
    line(0, water, W, water, 'rgba(160,200,255,0.8)', 3, iA);
    text('phenotypes that matter where the mutation evolved', 200, 300, { size: 26, color: PAL.ink, alpha: iA, maxW: 360 });
    text('side effects that only matter elsewhere', 1420, water + 80, { size: 26, color: '#a9c6f2', alpha: iA * (1 - drop * 0.6), maxW: 360 });
    text('locally modular', 200, 520, { size: 64, fam: 'disp', italic: true, color: PAL.ink, alpha: iA });
    text('globally pleiotropic', 1340, 260, { size: 64, fam: 'disp', italic: true, color: PAL.G, alpha: iA * prog(t, c(3), 1) });
    text('a new environment lowers the waterline', 1340, 300, { size: 22, fam: 'mono', color: PAL.dim, alpha: iA * prog(t, c(3) + 1, 1) });
  }
  // look-alike mutants, different futures
  const lA = env(t, c(4) + 0.2, c(5), 0.8, 0.8);
  if (lA > 0) {
    [[640, 'GPB2', PAL.C], [1280, 'PDE2', PAL.A]].forEach(([x, gn, col], i) => {
      yeast(x, 400, 90, { hue: 210, sat: 35, light: 62, alpha: lA, glow: 0.4 });
      text(`${gn} mutant`, x, 540, { size: 28, fam: 'mono', color: col, align: 'center', alpha: lA });
      text('similar fitness at home', x, 580, { size: 20, color: PAL.dim, align: 'center', alpha: lA });
      const fut = prog(t, c(4) + 1.5, 1.5);
      const lab = i === 0 ? 'robust in high salt' : 'hurt by high salt';
      text(lab, x, 660, { size: 34, fam: 'disp', italic: true, color: i ? PAL.T : PAL.A, align: 'center', alpha: lA * fut });
    });
    ['cancer', 'infections', 'predicting evolution'].forEach((w, i) => {
      const a = lA * prog(t, c(4) + 4 + i * 0.6, 0.8), x = 560 + i * 400;
      panel(x - 150, 760, 300, 70, a, { r: 35, fill: hexA(PAL.G, 0.1), stroke: hexA(PAL.G, 0.6) });
      text(w, x, 805, { size: 28, fam: 'disp', align: 'center', alpha: a });
    });
  }
  // coda: twenty letters
  const cA = env(t, c(5), 1e9, 1);
  if (cA > 0) {
    const sp = prog(t, c(5) + 3, 4, ease.in);
    for (let i = 0; i < 20; i++) {
      const hx = 960 + (i - 9.5) * 72, hy = 480;
      const an = i * 2.39996 + t * 0.1, r = 24 * Math.sqrt(i * 20 + 5);
      const x = lerp(hx, 960 + Math.cos(an) * r, sp), y = lerp(hy, 520 + Math.sin(an) * r * 0.8, sp);
      baseTile(BC_SEQ[i], x, y, 62 * (1 - 0.5 * sp), { alpha: cA * prog(t, c(5) + i * 0.08, 0.5) });
    }
    for (let i = 20; i < 400; i++) {
      const a = cA * clamp(sp * 400 / 20 - i / 20) * sp;
      const an = i * 2.39996 + t * 0.1, r = 22 * Math.sqrt(i);
      yeast(960 + Math.cos(an) * r, 520 + Math.sin(an) * r * 0.8, 9, { hue: Math.floor(hash01(i, 9) * 360), alpha: a });
    }
    const ea = cA * prog(t, c(5) + 5, 1.5);
    glowDot(960, 520, 420, 'rgba(5,10,22,0.95)', ea);
    text('count evolution as it happens', 960, 540, { size: 64, fam: 'disp', italic: true, align: 'center', alpha: ea, shadow: 18 });
  }
};

SCENES.credits = (t, c, D) => {
  const a = env(t, 0.3, D - 0.2, 1, 1.6);
  text('Sources', 200, 200, { size: 64, fam: 'disp', alpha: a });
  const refs = [
    ['Levy SF, Blundell JR, Venkataram S, Petrov DA, Fisher DS, Sherlock G.', 'Quantitative evolutionary dynamics using high-resolution lineage tracking. Nature 519, 181–186 (2015).'],
    ['Venkataram S, Dunn B, Li Y, et al.', 'Development of a comprehensive genotype-to-fitness map of adaptation-driven evolution in yeast. Cell (2016).'],
    ['Li Y, Venkataram S, Agarwala A, et al.', 'Hidden complexity of yeast adaptation under simple evolutionary conditions. Current Biology (2018).'],
    ['Kinsler G, Geiler-Samerotte K, Petrov DA.', 'Fitness variation across subtle environmental perturbations reveals local modularity and global pleiotropy of adaptation. eLife 9:e61271 (2020).'],
  ];
  refs.forEach(([au, ti], i) => {
    const y = 290 + i * 118, ra = a * prog(t, 0.6 + i * 0.3, 0.8);
    text(au, 200, y, { size: 24, weight: 600, alpha: ra });
    text(ti, 200, y + 36, { size: 22, color: PAL.dim, alpha: ra, maxW: 1500 });
  });
  const na = a * prog(t, 2.2, 1);
  text('Trajectories, fitness matrices and phenotype spaces shown are simulated to illustrate the methods. Quoted figures come from the papers above.', 200, 790, { size: 21, color: PAL.G, alpha: na, maxW: 1500 });
  text('Made in a single HTML file: JavaScript, Canvas 2D, Web Audio. Narration voice synthesized with Piper TTS.', 200, 860, { size: 21, fam: 'mono', color: PAL.dim, alpha: na, maxW: 1500 });
};
