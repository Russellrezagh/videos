// ───────────────────────────── scenes, part B: the blind spot, barcodes, and what they measure ─────────────────────────────

SCENES.limit = (t, c, D) => {
  const P = plotFrame({ x: 220, y: 200, w: 1480, h: 610 }, [0, 112], [-7.5, 0], {
    xt: [[0, '0'], [16, '16'], [32, '32'], [48, '48'], [64, '64'], [80, '80'], [96, '96'], [112, '112 generations']],
    yt: [[-7, pow10(-7)], [-6, pow10(-6)], [-5, pow10(-5)], [-4, pow10(-4)], [-3, pow10(-3)], [-2, '1%'], [-1, '10%'], [0, '100%']], yl: 'lineage frequency', ylOff: 110,
  });
  const fade = env(t, 0, c(4) + 0.6, 0.6, 0.8);
  P.draw(fade);
  const upto = 112 * prog(t, 0.3, 6, ease.io);
  g.save(); g.globalAlpha = fade;
  drawLineages(P, upto, { colorMix: 1, neutralA: 0.09 });
  const fogA = 0.92 - 0.62 * prog(t, c(1) + 0.8, 3);
  g.fillStyle = `rgba(8,16,31,${fogA})`; g.fillRect(P.box.x + 2, P.Y(-2), P.box.w, P.Y(-7.5) - P.Y(-2));
  g.save(); g.beginPath(); g.rect(P.box.x, P.box.y - 10, P.box.w + 10, P.Y(-2) - P.box.y + 10); g.clip();
  drawLineages(P, upto, { colorMix: 1, neutralA: 0, adaptA: 1, width: 3 });
  g.restore(); g.restore();
  line(P.box.x, P.Y(-2), P.box.x + P.box.w, P.Y(-2), PAL.G, 2.5, fade, [12, 8]);
  text('detection limit of whole-population sequencing ≈ 1%', P.box.x + 20, P.Y(-2) - 14, { size: 22, fam: 'mono', color: PAL.G, alpha: fade * prog(t, 1, 1) });
  text('below the line, every lineage is invisible', P.box.x + 24, P.Y(-2) + 44, { size: 26, fam: 'disp', italic: true, color: PAL.dim, alpha: fade * env(t, 2, c(1) + 1.5, 1, 1) });
  simBadge(P.box.x + P.box.w - 330, P.box.y - 40, fade * 0.9);
  const fa = env(t, c(2), c(3) + 0.3, 0.7, 0.6);
  if (fa > 0) {
    const lost = LT.lines.find(l => l.kind === 'neutral' && l.y[14] > -7.6 && l.y[14] < -6.5 && l.y[22] < -8.9);
    const pf = LT.lines.filter(l => l.kind === 'adaptive').map(l => ({ l, pk: Math.max(...l.y), end: l.y[l.y.length - 1] })).filter(o => o.pk > -5.3).sort((a, b) => (b.pk - b.end) - (a.pk - a.end))[0];
    const hl = (l, col, lab, dx, dy) => {
      if (!l) return;
      g.save(); g.globalAlpha = fa; g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 16; g.beginPath();
      let last = null;
      for (let k = 0; k < l.y.length; k++) { if (l.y[k] < -8.5) { g.lineTo(P.X(k * 4), P.Y(-7.5)); last = [k * 4, -7.5]; break; } const p = [P.X(k * 4), P.Y(l.y[k])]; k ? g.lineTo(...p) : g.moveTo(...p); last = [k * 4, l.y[k]]; }
      g.stroke(); g.restore();
      text(lab, P.X(last[0]) + dx, P.Y(last[1]) + dy, { size: 26, weight: 600, color: col, alpha: fa });
    };
    hl(lost, '#ff8f9c', 'lost to chance (drift)', -120, 40);
    if (pf) hl(pf.l, '#7ef0c4', 'beneficial, but outcompeted', -390, 50);
  }
  const wA = env(t, c(3), c(4) + 0.3, 0.8, 0.6);
  if (wA > 0) {
    glowDot(960, 470, 520, 'rgba(5,10,22,0.92)', wA);
    text('we see the winners,', 960, 450, { size: 76, fam: 'disp', italic: true, align: 'center', alpha: wA });
    text('not the race', 960, 540, { size: 76, fam: 'disp', italic: true, color: PAL.G, align: 'center', alpha: wA * prog(t, c(3) + 1, 0.8) });
  }
  const na = env(t, c(4) + 0.4, 1e9, 0.9);
  if (na > 0) {
    for (let i = 0; i < 13; i++) {
      const x = 240 + i * 120, y = 560 + Math.sin(t * 1.4 + i) * 10, a = na * prog(t, c(4) + 0.6 + i * 0.12, 0.6), hue = (i * 137) % 360;
      yeast(x, y, 38, { hue, alpha: a, tag: prog(t, c(4) + 2 + i * 0.1, 0.5), glow: 0.4 });
      text(Barcode.random(rng(i + 40)).slice(0, 8), x, y + 78, { size: 15, fam: 'mono', color: hsl(hue, 70, 70), align: 'center', alpha: a * prog(t, c(4) + 2 + i * 0.1, 0.5) });
    }
    text('follow every lineage from its first cell', 960, 400, { size: 60, fam: 'disp', italic: true, align: 'center', alpha: na * prog(t, c(4) + 1.2, 1) });
  }
};

SCENES.idea = (t, c, D) => {
  rail([6], env(t, 0.3, 1e9, 0.8));
  // follow mutations (unpredictable) vs follow lineages (labelled in advance)
  const aA = env(t, 0.3, c(1), 0.8, 0.8);
  if (aA > 0) {
    [[false, 'follow mutations', 'where, when, which? unknown in advance'], [true, 'follow lineages', 'labelled before the race begins']].forEach(([ok, title, sub], i) => {
      const x = 120 + i * 860, y = 220, a = aA * prog(t, 0.4 + i * 1.6, 0.8);
      card(x, y, 820, 640, a, ok ? PAL.A : PAL.T);
      text(title, x + 40, y + 80, { size: 50, fam: 'disp', alpha: a });
      text(sub, x + 40, y + 122, { size: 22, color: PAL.dim, alpha: a });
      for (let k = 0; k < 6; k++) {
        const cy = y + 200 + k * 70, hue = ok ? (k * 61 + 20) % 360 : null;
        yeast(x + 80, cy, 24, { hue, alpha: a, tag: ok ? 1 : 0 });
        if (ok) { for (let j = 0; j < 10; j++) { g.save(); g.globalAlpha = a; g.fillStyle = BASE_COL[BASES[(hash01(k, j) * 4) | 0]]; g.fillRect(x + 130 + j * 18, cy - 9, 16, 18); g.restore(); } text('tag', x + 330, cy + 7, { size: 18, fam: 'mono', color: PAL.dim, alpha: a }); }
        else { genomeBar(x + 130, cy - 4, 560, a); text('?', x + 130 + hash01(k, 9) * 540, cy + 10, { size: 34, fam: 'disp', color: PAL.T, alpha: a * (0.5 + 0.5 * Math.sin(t * 2 + k)) }); }
      }
      verdict(ok, x + 740, y + 90, a);
    });
  }
  // the barcode: helix and twenty random letters
  const hxA = env(t, c(1), 1e9, 0.8);
  const seq = Barcode.FLANK_L.repeat(4) + BC_SEQ + Barcode.FLANK_R.repeat(4);
  helix(80, 270, 1760, { phase: t * 0.6, seq: seq.slice(2), h0: 30, h1: 50, alpha: hxA, step: 22, amp: 46, pitch: 300 });
  const tilesA = env(t, c(1) + 0.6, c(2) + 0.3, 0.8, 0.8);
  if (tilesA > 0) {
    const sz = 52, sp = 60, x0 = 960 - (28 * sp) / 2 + sp / 2;
    for (let i = 0; i < 28; i++) {
      const x = x0 + i * sp, inBC = i >= 4 && i < 24;
      let ch;
      if (!inBC) ch = (i < 4 ? Barcode.FLANK_L.slice(-4) : Barcode.FLANK_R.slice(0, 4))[i < 4 ? i : i - 24];
      else { const j = i - 4, lockAt = c(1) + 1.6 + j * 0.12; ch = t >= lockAt ? BC_SEQ[j] : BASES[(hash01(j, Math.floor(t * 14)) * 4) | 0]; }
      baseTile(ch, x, 450, sz, { alpha: tilesA, dim: !inBC, glow: inBC && Math.abs(t - (c(1) + 1.6 + (i - 4) * 0.12)) < 0.25 ? 1 : 0 });
    }
    text('fixed flank', x0 + 1.5 * sp, 530, { size: 19, fam: 'mono', color: PAL.dim, align: 'center', alpha: tilesA });
    text('≈ 20 random nucleotides', 960, 530, { size: 19, fam: 'mono', color: PAL.G, align: 'center', alpha: tilesA });
    text('fixed flank', x0 + 25.5 * sp, 530, { size: 19, fam: 'mono', color: PAL.dim, align: 'center', alpha: tilesA });
  }
  // detect the effect, not the mutation
  const eA = env(t, c(2), c(3), 0.8, 0.8);
  if (eA > 0) {
    const P = plotFrame({ x: 260, y: 400, w: 900, h: 420 }, [0, 10], [0, 6], { xt: [[0, 'start'], [10, 'later']], yt: [] , yl: 'barcode count', ylOff: 40 });
    P.draw(eA);
    const up = 10 * prog(t, c(2) + 0.4, 4, ease.lin);
    for (let k = 0; k < 8; k++) {
      const hue = (k * 61 + 20) % 360, mut = k === 5;
      g.save(); g.globalAlpha = eA; g.strokeStyle = hsl(hue, 70, 60); g.lineWidth = mut ? 5 : 2.5; g.beginPath();
      for (let x = 0; x <= up; x += 0.1) { const v = 1 + k * 0.12 + 0.15 * Math.sin(x * 1.3 + k) - 0.05 * x + (mut && x > 3 ? Math.pow(x - 3, 1.6) * 0.18 : 0); const p = [P.X(x), P.Y(v)]; x ? g.lineTo(...p) : g.moveTo(...p); }
      g.stroke(); g.restore();
    }
    if (up > 3) { glowDot(P.X(3), P.Y(1.6), 30, hexA(PAL.G, 0.8), eA); text('★ a beneficial mutation, somewhere in the genome', P.X(3) + 20, P.Y(0.35), { size: 20, fam: 'mono', color: PAL.G, alpha: eA }); }
    reason('the count rises: we see the mutation’s effect without knowing what it is', 1240, 520, { alpha: eA * prog(t, c(2) + 3, 1), size: 32, maxW: 600 });
  }
  // four properties, four reasons
  const props = [
    ['Random', 'a unique tag for each of ~500,000 lineages', c(3)],
    ['Neutral', 'the tag never changes fitness', c(4)],
    ['Stable, inherited', 'every descendant carries it', c(4) + 2.6],
    ['At one fixed spot', 'one PCR reads all of them', c(5)],
  ];
  const pA = env(t, c(3), 1e9, 0.8);
  if (pA > 0) {
    zone('why', 1100, 410, pA, 740);
    props.forEach(([name, why, at], i) => {
      const a = pA * prog(t, at, 0.8), y = 480 + i * 105, cur = t >= at && (i === 3 || t < props[i + 1][2]);
      text('✓', 1100, y, { size: 30, color: PAL.A, alpha: a });
      text(name, 1145, y, { size: 36, fam: 'disp', color: cur ? PAL.G : PAL.ink, alpha: a });
      text(why, 1145, y + 34, { size: 20, color: PAL.dim, alpha: a });
    });
    // left: an illustration of the current property
    const r1 = env(t, c(3) + 0.3, c(4), 0.6, 0.6);
    if (r1 > 0) {
      text('4²⁰ possible barcodes =', 180, 560, { size: 30, fam: 'mono', color: PAL.dim, alpha: r1 });
      text(fmtInt(Math.pow(4, 20) * prog(t, c(3) + 0.6, 3, ease.in)), 180, 660, { size: 84, fam: 'disp', alpha: r1 });
      text('for about 500,000 lineages: two cells almost never share a tag', 180, 720, { size: 24, color: PAL.dim, alpha: r1 * prog(t, c(3) + 3, 1), maxW: 820 });
    }
    const r2 = env(t, c(4) + 0.3, c(5), 0.6, 0.6);
    if (r2 > 0) {
      zone('without', 180, 520, r2, 800);
      const P = plotFrame({ x: 220, y: 560, w: 700, h: 260 }, [0, 10], [0, 4], {});
      line(P.box.x, P.box.y + P.box.h, P.box.x + P.box.w, P.box.y + P.box.h, PAL.faint, 2, r2);
      const up = 10 * prog(t, c(4) + 0.6, 3, ease.lin);
      g.save(); g.globalAlpha = r2; g.strokeStyle = PAL.T; g.lineWidth = 4; g.beginPath();
      for (let x = 0; x <= up; x += 0.1) { const p = [P.X(x), P.Y(0.6 + 0.3 * x)]; x ? g.lineTo(...p) : g.moveTo(...p); } g.stroke(); g.restore();
      text('a tag that helped growth would make its lineage rise for the wrong reason', 220, 860, { size: 22, color: PAL.T, alpha: r2 * prog(t, c(4) + 1.5, 1), maxW: 760 });
      text('false signal ✕', P.X(up) + 14, P.Y(0.6 + 0.3 * up) + 8, { size: 20, fam: 'mono', color: PAL.T, alpha: r2 });
    }
    const r3 = env(t, c(5) + 0.3, 1e9, 0.6);
    if (r3 > 0) {
      const lx = 80 + 14 * 22, rx = 80 + 66 * 22;
      arrow(lx - 150, 190, lx + 20, 190, PAL.A, { w: 6, p: prog(t, c(5) + 0.5, 1), alpha: r3, head: 18 });
      arrow(rx + 150, 360, rx - 20, 360, PAL.A, { w: 6, p: prog(t, c(5) + 0.5, 1), alpha: r3, head: 18 });
      text('primer', lx - 150, 176, { size: 20, fam: 'mono', color: PAL.A, alpha: r3 });
      text('primer', rx + 150, 392, { size: 20, fam: 'mono', color: PAL.A, alpha: r3, align: 'right' });
      const cyc = Math.floor(prog(t, c(5) + 1.4, 4, ease.lin) * 7), n = 1 << cyc;
      for (let i = 0; i < Math.min(n, 48); i++) {
        const x = 180 + (i % 12) * 74, y = 560 + Math.floor(i / 12) * 50;
        g.save(); g.globalAlpha = r3; g.fillStyle = 'rgba(147,162,195,0.45)'; g.fillRect(x, y, 14, 12); g.fillRect(x + 46, y, 14, 12);
        g.fillStyle = hsl((i * 47) % 360, 70, 60); g.fillRect(x + 14, y, 32, 12); g.restore();
      }
      text(`one reaction, every barcode: cycle ${cyc}, ${fmtInt(n)} copies`, 180, 800, { size: 22, fam: 'mono', color: PAL.dim, alpha: r3 });
    }
  }
};

SCENES.build = (t, c, D) => {
  rail([6], env(t, 0.3, 1e9, 0.8));
  const CY = 640, segH = 46;
  const integ = prog(t, c(2) + 4.2, 3.2);
  const chromA = env(t, 0.3, 1e9, 0.8);
  g.save(); g.globalAlpha = chromA;
  rrect(60, CY - 22, 1800, 44, 22); g.fillStyle = '#16264a'; g.fill();
  for (let i = 0; i < 46; i++) { g.fillStyle = i % 3 ? 'rgba(120,140,190,0.12)' : 'rgba(120,140,190,0.25)'; g.fillRect(70 + i * 39, CY - 22, 18, 44); }
  g.restore();
  text('chromosome II', 80, CY + 64, { size: 20, fam: 'mono', color: PAL.dim, alpha: chromA });
  text('landing pad at the YBR209W locus', 1840, CY + 64, { size: 20, fam: 'mono', color: PAL.dim, align: 'right', alpha: chromA * prog(t, c(1), 1) });
  // the problem: many insertions, one spot
  const pbA = env(t, 0.5, c(1) + 0.5, 0.8, 0.8);
  if (pbA > 0) {
    for (let k = 0; k < 18; k++) {
      const sx = 200 + hash01(k, 1) * 1520, sy = 230 + hash01(k, 2) * 220, f = ease.in(clamp(((t - 1.5 - hash01(k, 3) * 2) / 3) % 1.2));
      const x = lerp(sx, 960, f), y = lerp(sy, CY, f);
      g.save(); g.globalAlpha = pbA * (1 - f); g.strokeStyle = hsl(hash01(k, 4) * 360, 70, 60); g.lineWidth = 5; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.stroke(); g.restore();
    }
    glowDot(960, CY, 70, hexA(PAL.G, 0.7), pbA);
    text('≈ 500,000 independent insertions, all at exactly one spot', 960, 860, { size: 30, fam: 'disp', italic: true, align: 'center', alpha: pbA });
  }
  const lp = prog(t, c(1) + 0.3, 2.5, ease.lin);
  const segs = [
    { lab: 'GAL › Cre', w: 220, col: PAL.violet, show: clamp(lp * 4) },
    { lab: 'KanMX', w: 120, col: '#7aa2d6', show: clamp(lp * 4 - 1) },
    { lab: '½ URA3', w: 170, col: PAL.A, show: clamp(lp * 4 - 2) },
    { lab: integ > 0.5 ? 'loxP' : 'lox*', w: 92, col: PAL.G, show: clamp(lp * 4 - 3), lox: true },
    { lab: 'barcode', w: 200 * integ, col: 'rainbow', show: integ },
    { lab: '½ URA3', w: 170 * integ, col: PAL.A, show: integ },
    { lab: 'HygMX', w: 150 * integ, col: '#7aa2d6', show: integ },
    { lab: 'lox66/71', w: 120 * integ, col: '#b98a3a', show: integ, lox: true },
  ];
  const totalW = segs.reduce((s, x) => s + x.w, 0);
  let x = 960 - totalW / 2;
  const pos = {};
  segs.forEach((sg, i) => {
    const a = sg.show * chromA;
    pos[i] = [x, sg.w];
    if (a > 0.01 && sg.w > 2) {
      g.save(); g.globalAlpha = a;
      if (sg.col === 'rainbow') { for (let k = 0; k < 20; k++) { g.fillStyle = BASE_COL[BC_SEQ[k]]; g.fillRect(x + k * sg.w / 20, CY - segH / 2, sg.w / 20 + 0.5, segH); } }
      else if (sg.lox) { g.fillStyle = sg.col; g.beginPath(); g.moveTo(x + 6, CY - segH / 2); g.lineTo(x + sg.w - 6, CY); g.lineTo(x + 6, CY + segH / 2); g.closePath(); g.fill(); }
      else { rrect(x, CY - segH / 2, sg.w, segH, 8); g.fillStyle = hexA(sg.col, 0.85); g.fill(); }
      if (sg.w > 60) text(sg.lab, x + sg.w / 2, CY - 40, { size: 22, weight: 600, color: sg.col === 'rainbow' ? PAL.ink : sg.col, align: 'center' });
      g.restore();
    }
    x += sg.w;
  });
  // plasmid library flies in; Cre stitches it into place
  const plA = env(t, c(2), c(2) + 5.6, 0.8, 0.8);
  if (plA > 0) {
    const fly = prog(t, c(2) + 3.4, 2.2);
    const pxc = lerp(1320, pos[4][0] + 40, fly), pyc = lerp(330, CY, fly), pr = 120 * (1 - 0.75 * fly);
    for (let k = 3; k >= 1; k--) { g.save(); g.globalAlpha = plA * (1 - fly) * 0.16; g.strokeStyle = hsl((k * 97) % 360, 70, 60); g.lineWidth = 7; g.beginPath(); g.arc(1320 + k * 70, 330 - k * 34, 120, 0, TAU); g.stroke(); g.restore(); }
    g.save(); g.globalAlpha = plA;
    [[-1.75, -1.45, PAL.G], [-1.45, -0.25, 'bc'], [-0.25, 1.4, PAL.A], [1.4, 3.6, '#7aa2d6']].forEach(([a0, a1, col]) => {
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
  const crA = env(t, c(2) + 3, c(3), 0.6, 0.8);
  if (crA > 0) {
    const lx = pos[3][0] + 40;
    text('+ galactose → Cre made', 300, 330, { size: 28, fam: 'mono', color: PAL.violet, alpha: crA });
    for (let k = 0; k < 4; k++) {
      const an = k / 4 * TAU + t * 1.5, rr = 70 - 30 * integ, qx = lx + Math.cos(an) * rr, qy = CY - 110 + Math.sin(an) * rr * 0.6;
      glowDot(qx, qy, 60, hexA(PAL.violet, 0.5), crA);
      g.save(); g.globalAlpha = crA; g.fillStyle = PAL.violet; g.beginPath(); g.arc(qx, qy, 26, 0, TAU); g.fill(); g.restore();
      text('Cre', qx, qy + 6, { size: 18, fam: 'mono', weight: 600, color: '#0b1020', align: 'center', alpha: crA });
    }
  }
  // why split URA3: correctness → survival
  const ja = env(t, c(3), 1e9, 0.8);
  if (ja > 0 && integ > 0.99) {
    const [ux1, uw1] = pos[2], [ux2, uw2] = pos[5], ix1 = pos[3][0], ix2 = pos[5][0];
    glowDot(ux1 + uw1 / 2, CY, 120, hexA(PAL.A, 0.35), ja * (0.6 + 0.4 * Math.sin(t * 3)));
    glowDot(ux2 + uw2 / 2, CY, 120, hexA(PAL.A, 0.35), ja * (0.6 + 0.4 * Math.sin(t * 3)));
    g.save(); g.globalAlpha = ja; g.strokeStyle = PAL.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ix1, CY + 30); g.lineTo(ix1, CY + 46); g.lineTo(ix2, CY + 46); g.lineTo(ix2, CY + 30); g.stroke(); g.restore();
    text('artificial intron', (ix1 + ix2) / 2, CY + 76, { size: 22, fam: 'mono', color: PAL.ink, align: 'center', alpha: ja });
    const sp = prog(t, c(3) + 1.8, 2.5), my = 840, gapW = (ix2 - ix1) * (1 - sp);
    g.save(); g.globalAlpha = ja * prog(t, c(3) + 1.2, 1);
    g.fillStyle = hexA(PAL.A, 0.85); rrect(ux1, my - 14, uw1, 28, 10); g.fill(); rrect(ux1 + uw1 + gapW, my - 14, uw2, 28, 10); g.fill();
    if (gapW > 4) { g.strokeStyle = 'rgba(234,240,251,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(ux1 + uw1, my); g.quadraticCurveTo(ux1 + uw1 + gapW / 2, my - 90 * (1 - sp) - 10, ux1 + uw1 + gapW, my); g.stroke(); }
    g.restore();
    text(sp > 0.95 ? 'URA3 mRNA, barcode spliced out: working gene ✓' : 'URA3 mRNA', ux1 + uw1 + gapW + uw2 + 30, my + 8, { size: 24, color: sp > 0.95 ? PAL.A : PAL.dim, alpha: ja * prog(t, c(3) + 1.2, 1) });
    const rA = env(t, c(3) + 0.4, c(4), 0.8, 0.6);
    zone('why', 100, 250, rA, 640);
    reason('only a correct integration rebuilds a working URA3', 100, 315, { alpha: rA, size: 32, maxW: 640 });
    reason('so selection does the quality control', 100, 395, { alpha: rA * prog(t, c(3) + 3, 1), size: 32, color: PAL.A, maxW: 640 });
    // plate lacking uracil
    const sA = env(t, c(3) + 3.5, 1e9, 0.8), cx = 1480, cy = 270, R = 130;
    if (sA > 0) {
      plate(cx, cy, R, sA);
      for (let i = 0; i < 46; i++) {
        const rr = R * 0.85 * Math.sqrt(hash01(i, 1)), an = hash01(i, 2) * TAU, ok = hash01(i, 3) < 0.6, gp = prog(t, c(3) + 4 + hash01(i, 4) * 1.5, 1.5);
        colony(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, ok ? 6 + 6 * gp : 6 * (1 - gp), ok ? hsl(hash01(i, 5) * 360, 75, 62) : 'rgba(150,160,180,0.6)', sA);
      }
      text('plate without uracil', cx, cy + R + 36, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: sA });
      text('only correctly barcoded cells grow', cx, cy + R + 64, { size: 20, fam: 'mono', color: PAL.A, align: 'center', alpha: sA });
    }
  }
  // why galactose, why the crippled lox
  const gA = env(t, c(4), 1e9, 0.8);
  if (gA > 0) {
    zone('why', 100, 250, gA, 640);
    reason('Cre is made only on galactose: recombination happens when we choose', 100, 315, { alpha: gA, size: 30, maxW: 660 });
    reason('the leftover lox66/71 is barely recognised: integration is one-way', 100, 420, { alpha: gA * prog(t, c(4) + 3, 1), size: 30, color: PAL.A, maxW: 660 });
    const [gx, gw] = pos[0];
    glowDot(gx + gw / 2, CY, 130, hexA(PAL.violet, 0.4), gA * (0.6 + 0.4 * Math.sin(t * 3)));
    const [dx, dw] = pos[7], ba = gA * prog(t, c(4) + 3, 1);
    glowDot(dx + dw / 2, CY - 100, 40, hexA(PAL.violet, 0.7), ba * (0.5 + 0.5 * Math.sin(t * 4)));
    text('✕', dx + dw / 2, CY - 86, { size: 34, weight: 700, color: PAL.T, align: 'center', alpha: ba });
    text('the barcode stays put', dx + dw / 2, CY + 120, { size: 20, color: PAL.dim, align: 'center', alpha: ba });
  }
};

SCENES.census = (t, c, D) => {
  rail([7], env(t, 0.3, 1e9, 0.8));
  // half a million lineages, one pixel each
  const mA = env(t, 0.2, c(1) + 0.2, 0.8, 0.8);
  if (mA > 0) {
    const rev = prog(t, 0.3, 4, ease.io);
    g.save(); g.globalAlpha = mA; g.imageSmoothingEnabled = false; g.beginPath(); g.rect(820, 240, 1000 * rev, 500); g.clip(); g.drawImage(mosaic(), 820, 240); g.restore();
    g.save(); g.globalAlpha = mA; g.strokeStyle = 'rgba(220,232,255,0.4)'; g.strokeRect(820, 240, 1000, 500); g.restore();
    counter(500000 * rev, 120, 420, { size: 110, alpha: mA });
    text('lineages, one pixel each', 124, 470, { size: 28, fam: 'mono', color: PAL.dim, alpha: mA });
    text('2 replicate populations, E1 and E2', 124, 560, { size: 24, color: PAL.dim, alpha: mA * prog(t, 2, 1) });
    text('≈ 168 generations, sampled every ≈ 8', 124, 600, { size: 24, color: PAL.dim, alpha: mA * prog(t, 2.5, 1) });
  }
  // pipeline
  const st = ['Freeze', 'Extract DNA', 'PCR + UMIs', 'Index + sequence', 'Count'];
  const act = t < c(1) ? -1 : t < c(1) + 4 ? 0 : t < c(2) - 3 ? 1 : t < c(3) ? 2 : t < c(3) + 4 ? 3 : t < c(4) ? 4 : 5;
  const pA = env(t, c(1) - 0.3, c(4), 0.8, 0.6);
  st.forEach((s, i) => {
    const x = 330 + i * 315, on = act === i;
    if (i) arrow(x - 230, 222, x - 90, 222, 'rgba(147,162,195,0.45)', { w: 2.5, alpha: pA, head: 10 });
    g.save(); g.globalAlpha = pA; if (on) glowDot(x, 222, 90, hexA(PAL.G, 0.35));
    g.beginPath(); g.arc(x, 222, 46, 0, TAU); g.fillStyle = on ? hexA(PAL.G, 0.2) : 'rgba(20,32,60,0.9)'; g.fill(); g.strokeStyle = on ? PAL.G : PAL.faint; g.lineWidth = 3; g.stroke(); g.restore();
    text(String(i + 1), x, 236, { size: 38, fam: 'disp', color: on ? PAL.G : PAL.dim, align: 'center', alpha: pA });
    text(s, x, 300, { size: 22, fam: 'mono', color: on ? PAL.ink : PAL.dim, align: 'center', alpha: pA });
  });
  // freeze → extract → PCR, and why so many cells
  const fA = env(t, c(1), c(2), 0.6, 0.6);
  if (fA > 0) {
    for (let k = 0; k < 5; k++) cryotube(300 + k * 70, 520, 1.2, [PAL.A, PAL.C, PAL.G, PAL.T, PAL.violet][k], { alpha: fA * prog(t, c(1) + k * 0.15, 0.5), frost: 0.8, label: `T${k}` });
    const ex = prog(t, c(1) + 2.5, 1.5);
    helix(760, 520, 360, { phase: t, amp: 26, pitch: 160, step: 14, alpha: fA * ex });
    arrow(680, 520, 740, 520, PAL.dim, { alpha: fA * ex, w: 3 });
    const cyc = Math.floor(prog(t, c(1) + 5, 4, ease.lin) * 6);
    for (let i = 0; i < (1 << cyc); i++) {
      const x = 1240 + (i % 8) * 74, y = 400 + Math.floor(i / 8) * 40;
      g.save(); g.globalAlpha = fA; g.fillStyle = 'rgba(147,162,195,0.5)'; g.fillRect(x, y, 14, 14); g.fillRect(x + 46, y, 14, 14); g.fillStyle = hsl((i * 47) % 360, 70, 60); g.fillRect(x + 14, y, 32, 14); g.restore();
    }
    text(`PCR cycle ${cyc}  ·  ${1 << cyc} copies`, 1520, 380, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: fA * prog(t, c(1) + 5, 0.6) });
    zone('why', 120, 720, fA * prog(t, c(1) + 3, 0.8), 1680);
    reason('DNA from millions of cells: each lineage (~100 cells per transfer) is fairly represented', 120, 785, { alpha: fA * prog(t, c(1) + 3, 0.8), size: 30, maxW: 1680 });
  }
  // UMIs
  const uA = env(t, c(2), c(3), 0.6, 0.6);
  if (uA > 0) {
    const mols = [{ hue: 150, umi: PAL.G, copies: 6 }, { hue: 210, umi: PAL.T, copies: 2 }, { hue: 150, umi: PAL.C, copies: 3 }];
    text('original molecules', 330, 400, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    mols.forEach((m, i) => {
      const y = 460 + i * 110;
      g.save(); g.globalAlpha = uA; g.fillStyle = m.umi; g.fillRect(230, y, 34, 24); g.fillStyle = hsl(m.hue, 70, 60); g.fillRect(264, y, 150, 24); g.restore();
      const cp = prog(t, c(2) + 1 + i * 0.4, 1.5);
      for (let k = 0; k < m.copies; k++) { const x = 640 + k * 120, a = uA * clamp(cp * m.copies - k); g.save(); g.globalAlpha = a; g.fillStyle = m.umi; g.fillRect(x, y, 20, 20); g.fillStyle = hsl(m.hue, 70, 60); g.fillRect(x + 20, y, 80, 20); g.restore(); }
      const col = prog(t, c(2) + 4.2, 1);
      text(`→ ${m.copies} reads → 1 molecule`, 1440, y + 18, { size: 22, fam: 'mono', color: PAL.ink, alpha: uA * col });
    });
    text('UMI', 247, 446, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    text('barcode', 339, 446, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    text('PCR copies, uneven: jackpots', 900, 400, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: uA });
    zone('without', 120, 790, uA * prog(t, c(2) + 5, 0.8), 1680);
    text('without UMIs, the lineage with the PCR jackpot would look 3× more common than it is', 120, 850, { size: 26, color: PAL.T, alpha: uA * prog(t, c(2) + 5, 0.8) });
  }
  // indices, reads, counts
  const iA = env(t, c(3), c(4), 0.6, 0.6);
  if (iA > 0) {
    const samples = [['T0', PAL.A], ['T1', PAL.C], ['T2', PAL.G], ['T3', PAL.T], ['T4', PAL.violet]];
    const mg = prog(t, c(3) + 0.8, 2.2);
    samples.forEach(([lab, col], i) => {
      const y0 = 420 + i * 80, y = lerp(y0, 580, mg), x = lerp(260, 560, mg);
      for (let k = 0; k < 6; k++) { const kx = x + k * 26 * (1 - mg) + (hash01(i, k) - 0.5) * 140 * mg, ky = y + (hash01(k, i) - 0.5) * 160 * mg; g.save(); g.globalAlpha = iA; g.fillStyle = col; g.fillRect(kx, ky, 10, 12); g.fillStyle = 'rgba(200,210,235,0.7)'; g.fillRect(kx + 10, ky, 36, 12); g.restore(); }
      text(lab, 200, y0 + 12, { size: 22, fam: 'mono', color: col, alpha: iA * (1 - mg) });
    });
    g.save(); g.globalAlpha = iA * mg; rrect(420, 440, 340, 290, 20); g.strokeStyle = PAL.dim; g.lineWidth = 2; g.stroke(); g.restore();
    text('one run; the index says which sample', 590, 770, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: iA * mg });
    const counts = [41, 12, 77, 25, 8, 55, 19, 33], tot = counts.reduce((a, b) => a + b), gp = prog(t, c(3) + 2.5, 2.5);
    counts.forEach((n, i) => {
      const x = 1000 + i * 100, hh = n * 5 * gp;
      g.save(); g.globalAlpha = iA; g.fillStyle = hsl(i * 45, 70, 62); g.fillRect(x, 800 - hh, 66, hh); g.restore();
      text(`${(n / tot * 100).toFixed(0)}%`, x + 33, 790 - hh, { size: 20, fam: 'mono', color: PAL.ink, align: 'center', alpha: iA * gp });
    });
    line(990, 800, 1800, 800, PAL.faint, 2, iA);
    text('frequency = reads for one barcode ÷ all reads', 1400, 860, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: iA * gp });
  }
  // the noise floor, measured on neutral lineages
  const nA = env(t, c(4), 1e9, 0.8);
  if (nA > 0) {
    const P = plotFrame({ x: 220, y: 240, w: 980, h: 560 }, [0, 112], [-7.5, -4.6], { xt: [[0, '0'], [56, '56'], [112, '112 generations']], yt: [[-7, pow10(-7)], [-6, pow10(-6)], [-5, pow10(-5)]], yl: 'neutral lineage frequency', ylOff: 100 });
    P.draw(nA);
    const up = 112 * prog(t, c(4) + 0.4, 3.5, ease.lin);
    g.save(); g.globalAlpha = nA; drawLineages(P, up, { neutralA: 0.25, adaptA: 0 }); g.restore();
    simBadge(P.box.x + P.box.w - 330, P.box.y - 44, nA);
    zone('why', 1290, 300, nA * prog(t, c(4) + 1, 0.8), 540);
    reason('neutral lineages show pure noise: sampling plus drift', 1290, 370, { alpha: nA * prog(t, c(4) + 1, 0.8), size: 32, maxW: 540 });
    reason('a real rise must beat that spread', 1290, 500, { alpha: nA * prog(t, c(4) + 3.5, 0.8), size: 32, color: PAL.A, maxW: 540 });
  }
};

SCENES.revealed = (t, c, D) => {
  const P = plotFrame({ x: 190, y: 190, w: 1110, h: 590 }, [0, 112], [-7.5, -0.5], {
    xt: [[0, '0'], [16, '16'], [32, '32'], [48, '48'], [64, '64'], [80, '80'], [96, '96'], [112, '112']],
    yt: [[-7, pow10(-7)], [-6, pow10(-6)], [-5, pow10(-5)], [-4, pow10(-4)], [-3, pow10(-3)], [-2, pow10(-2)], [-1, pow10(-1)]], xl: 'generations', yl: 'lineage frequency', ylOff: 104,
  });
  const a0 = env(t, 0.2, 1e9, 0.8);
  P.draw(a0);
  simBadge(P.box.x + P.box.w - 330, P.box.y - 50, a0);
  text('replicate E1', P.box.x + 20, P.box.y - 26, { size: 22, fam: 'mono', color: PAL.G, alpha: a0, track: 2 });
  const upto = 112 * prog(t, 0.5, c(1) - 0.5, ease.lin);
  const hl = prog(t, c(1) + 0.5, 1) * (1 - prog(t, c(2) + 1, 1));
  g.save(); g.globalAlpha = a0 * (1 - 0.6 * hl); drawLineages(P, upto, { colorMix: prog(t, 3, 2), neutralA: 0.08 }); g.restore();
  if (hl > 0) {
    const ex = LT.example;
    g.save(); g.globalAlpha = hl; g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath();
    ex.y.forEach((v, k) => { const p = [P.X(k * 4), P.Y(Math.max(-7.5, v))]; k ? g.lineTo(...p) : g.moveTo(...p); }); g.stroke(); g.restore();
    const y0 = Math.log10(1 / (ex.s * LT.N)), xa = Math.max(0, ex.tau), ya = y0 + (xa - ex.tau) * ex.s * Math.LOG10E;
    line(P.X(xa), P.Y(ya), P.X(112), P.Y(ex.y[ex.y.length - 1]), PAL.G, 3, hl, [10, 8]);
    panel(P.X(8), P.Y(-1.7), 440, 120, hl);
    text(`s ≈ ${(ex.s * 100).toFixed(1)}%  how strong`, P.X(8) + 24, P.Y(-1.7) + 48, { size: 26, fam: 'mono', color: PAL.G, alpha: hl });
    text(`τ ≈ ${Math.round(ex.tau)}  when it arose`, P.X(8) + 24, P.Y(-1.7) + 92, { size: 26, fam: 'mono', color: PAL.G, alpha: hl });
  }
  const da = env(t, c(4), 1e9, 0.6);
  if (da > 0) {
    line(P.box.x, P.Y(-2), P.box.x + P.box.w, P.Y(-2), PAL.T, 3, da, [12, 8]);
    pill('visible to bulk sequencing (> 1%): ≈ 15 lineages', P.box.x + 20, P.Y(-2) - 16, { size: 21, fam: 'mono', color: PAL.T, alpha: da });
  }
  const RX = 1400, RW = 420;
  const mA = env(t, 1.5, 1e9, 0.8);
  panel(RX, 190, RW, 220, mA);
  text('mean fitness s̄(t)', RX + 22, 228, { size: 20, fam: 'mono', color: PAL.dim, alpha: mA });
  if (mA > 0) {
    const M = plotFrame({ x: RX + 40, y: 250, w: RW - 70, h: 130 }, [0, 112], [0, 0.1], {});
    g.save(); g.globalAlpha = mA; g.strokeStyle = PAL.A; g.lineWidth = 3.5; g.beginPath();
    for (let x = 0; x <= upto; x++) { const p = [M.X(x), M.Y(LT.sbar[x])]; x ? g.lineTo(...p) : g.moveTo(...p); } g.stroke(); g.restore();
    line(M.box.x, M.box.y + M.box.h, M.box.x + M.box.w, M.box.y + M.box.h, PAL.faint, 1.5, mA);
    text('as s̄ rises, neutral lineages sink', RX + 22, 400, { size: 18, color: PAL.dim, alpha: mA * prog(t, 4, 1) });
  }
  const sA = env(t, c(2), 1e9, 0.8);
  panel(RX, 430, RW, 210, sA);
  text('≈ 25,000', RX + 22, 500, { size: 60, fam: 'disp', alpha: sA });
  text('adaptive lineages, s > 2%  (E1)', RX + 22, 532, { size: 19, fam: 'mono', color: PAL.dim, alpha: sA });
  const s2 = sA * prog(t, c(2) + 3, 1);
  text('≈ 1 × 10⁻⁶', RX + 22, 592, { size: 44, fam: 'disp', alpha: s2 });
  text('per cell per generation, s > 5%', RX + 22, 622, { size: 19, fam: 'mono', color: PAL.dim, alpha: s2 });
  const hA = env(t, c(3), 1e9, 0.8);
  panel(RX, 660, RW, 240, hA);
  const dfeA = hA * (1 - prog(t, c(3) + 3, 0.8));
  if (dfeA > 0) {
    text('fitness effects (log count)', RX + 22, 694, { size: 18, fam: 'mono', color: PAL.dim, alpha: dfeA });
    const mx = Math.log10(Math.max(...LT.dfe) + 1), bw = (RW - 60) / LT.dfe.length;
    LT.dfe.forEach((n, i) => { const hh = 150 * Math.log10(n + 1) / mx * prog(t, c(3) + 0.3 + i * 0.05, 0.6); g.save(); g.globalAlpha = dfeA; g.fillStyle = hsl(sHue(0.02 + i * 0.005), 80, 60); g.fillRect(RX + 30 + i * bw, 870 - hh, bw - 2, hh); g.restore(); });
    [['2%', 0], ['5%', 6], ['8%', 12], ['11%', 18]].forEach(([l, i]) => text(l, RX + 30 + i * bw, 892, { size: 16, fam: 'mono', color: PAL.dim, alpha: dfeA }));
  }
  const tA = hA * prog(t, c(3) + 3, 0.8);
  if (tA > 0) {
    text('when mutations arose (τ)', RX + 22, 694, { size: 18, fam: 'mono', color: PAL.dim, alpha: tA });
    const mx = Math.max(...LT.tauHist), bw = (RW - 60) / LT.tauHist.length;
    LT.tauHist.forEach((n, i) => { const hh = 150 * n / mx * prog(t, c(3) + 3.2 + i * 0.05, 0.6); g.save(); g.globalAlpha = tA; g.fillStyle = i * 10 - 90 < 0 ? PAL.G : '#5f7396'; g.fillRect(RX + 30 + i * bw, 870 - hh, bw - 3, hh); g.restore(); });
    const zx = RX + 30 + 9 * bw;
    line(zx, 720, zx, 872, PAL.ink, 2, tA, [5, 5]);
    text('start', zx + 6, 740, { size: 16, fam: 'mono', color: PAL.ink, alpha: tA });
    text('before the start', RX + 30, 892, { size: 16, fam: 'mono', color: PAL.G, alpha: tA });
  }
  const pA = env(t, c(4) + 3, 1e9, 0.8);
  if (pA > 0) { glowDot(745, 480, 420, 'rgba(5,10,22,0.9)', pA); text('one history →', 745, 450, { size: 56, fam: 'disp', italic: true, align: 'center', alpha: pA }); text('the whole range of possibilities', 745, 530, { size: 56, fam: 'disp', italic: true, color: PAL.G, align: 'center', alpha: pA }); }
};

SCENES.instrument = (t, c, D) => {
  const poolA = env(t, 0.2, c(2), 0.8, 0.8), mix = prog(t, c(1) + 0.5, 2.5);
  if (poolA > 0) {
    for (let i = 0; i < 240; i++) {
      const r = 200 * Math.sqrt(hash01(i, 1)), an = hash01(i, 2) * TAU;
      const x0 = 480 + Math.cos(an) * r, y0 = 560 + Math.sin(an) * r * 0.85, x1 = 960 + Math.cos(an) * r * 0.45, y1 = 600 + Math.sin(an) * r * 0.3;
      g.save(); g.globalAlpha = poolA * clamp(prog(t, 0.3, 2, ease.lin) * 240 - i); g.fillStyle = hsl(hash01(i, 3) * 360, 78, 62); g.beginPath(); g.arc(lerp(x0, x1, mix), lerp(y0, y1, mix), 7, 0, TAU); g.fill(); g.restore();
    }
    text('adaptive clones, still barcoded', 480, 840, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: poolA * (1 - mix) });
  }
  const refA = env(t, c(1), c(2), 0.8, 0.8);
  if (refA > 0) {
    for (let i = 0; i < 900; i++) {
      const r = 230 * Math.sqrt(hash01(i, 5)), an = hash01(i, 6) * TAU;
      const x0 = 1440 + Math.cos(an) * r, y0 = 560 + Math.sin(an) * r * 0.85, x1 = 960 + Math.cos(an) * r * 0.95, y1 = 600 + Math.sin(an) * r * 0.62;
      g.save(); g.globalAlpha = refA * 0.8; g.fillStyle = '#8f9bb6'; g.beginPath(); g.arc(lerp(x0, x1, mix), lerp(y0, y1, mix), 5, 0, TAU); g.fill(); g.restore();
    }
    text('ancestral reference strain', 1440, 840, { size: 24, fam: 'mono', color: PAL.dim, align: 'center', alpha: refA * (1 - mix) });
    const da = refA * prog(t, c(1) + 2.8, 1);
    g.save(); g.globalAlpha = da; g.lineWidth = 34; g.strokeStyle = '#8f9bb6'; g.beginPath(); g.arc(1600, 330, 90, -Math.PI / 2, -Math.PI / 2 + TAU * 0.9); g.stroke();
    g.strokeStyle = PAL.G; g.beginPath(); g.arc(1600, 330, 90, -Math.PI / 2 + TAU * 0.9, Math.PI * 1.5); g.stroke(); g.restore();
    text('90%', 1600, 330, { size: 40, fam: 'disp', align: 'center', alpha: da });
    text('ancestor', 1600, 362, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: da });
    text('10% barcoded mutants', 1600, 470, { size: 20, fam: 'mono', color: PAL.G, align: 'center', alpha: da });
  }
  // why 90%: straight slopes vs bent slopes
  const wA = env(t, c(2), c(3), 0.8, 0.8);
  if (wA > 0) {
    [[true, 'with 90% ancestor', 'mean fitness stays flat: straight lines'], [false, 'mutants alone', 'mean fitness climbs: slopes bend and sink']].forEach(([ok, title, sub], i) => {
      const x = 120 + i * 880, y = 230;
      zone(ok ? 'what' : 'without', x, y, wA, 800);
      text(title, x, y + 60, { size: 36, fam: 'disp', alpha: wA });
      text(sub, x, y + 96, { size: 20, color: ok ? PAL.A : PAL.T, alpha: wA });
      const P = plotFrame({ x: x + 60, y: y + 140, w: 700, h: 420 }, [0, 4], [-1.5, 2.5], { xt: [[0, 'T0'], [4, 'T4']], yt: [[0, '0']], yl: 'ln frequency', ylOff: 40 });
      P.draw(wA);
      const up = 4 * prog(t, c(2) + 0.6 + i * 0.4, 3, ease.lin);
      for (let k = 0; k < 7; k++) {
        const s = 0.15 + k * 0.1, col = hsl((k * 51) % 360, 75, 62);
        g.save(); g.globalAlpha = wA; g.strokeStyle = col; g.lineWidth = 3; g.beginPath();
        for (let x2 = 0; x2 <= up; x2 += 0.05) { const sb = ok ? 0.05 : 0.18 * x2; const v = ok ? (s - 0.05) * x2 : s * x2 - 0.5 * sb * x2 - 0.06 * x2 * x2; const p = [P.X(x2), P.Y(v)]; x2 ? g.lineTo(...p) : g.moveTo(...p); }
        g.stroke(); g.restore();
      }
    });
    simBadge(120, 860, wA, 'SCHEMATIC');
  }
  // the ApaLI cut
  const cA = env(t, c(3), c(4), 0.8, 0.8);
  if (cA > 0) {
    const cut = prog(t, c(3) + 1.5, 1.2);
    for (let i = 0; i < 10; i++) {
      const y = 300 + i * 52, isRef = i % 5 !== 2, x = 260;
      g.save(); g.globalAlpha = cA * (isRef ? 1 - 0.75 * prog(t, c(3) + 3, 1.2) : 1);
      g.fillStyle = 'rgba(147,162,195,0.5)'; g.fillRect(x, y, 120, 20); g.fillRect(x + 440, y, 120, 20);
      if (isRef) { g.fillStyle = '#8f9bb6'; g.fillRect(x + 120, y, 150 - cut * 10, 20); g.fillRect(x + 290 + cut * 10, y, 150 - cut * 10, 20); g.fillStyle = PAL.T; g.fillRect(x + 270 - cut * 10, y, 20, 20); }
      else { for (let k = 0; k < 10; k++) { g.fillStyle = BASE_COL[BC_SEQ[(k * 3 + i) % 20]]; g.fillRect(x + 120 + k * 32, y, 32, 20); } }
      g.restore();
    }
    text('GTGCAC: the ApaLI site in the ancestor’s barcode', 540, 860, { size: 22, fam: 'mono', color: PAL.T, align: 'center', alpha: cA });
    text('✂', 540, 270, { size: 50, color: PAL.T, align: 'center', alpha: cA * (1 - cut) + cA * 0.3 });
    const ga = cA * prog(t, c(3) + 3, 1);
    g.save(); g.globalAlpha = ga; rrect(1120, 260, 360, 600, 16); g.fillStyle = 'rgba(10,18,36,0.9)'; g.fill(); g.strokeStyle = PAL.faint; g.lineWidth = 2; g.stroke();
    g.fillStyle = PAL.A; g.shadowColor = PAL.A; g.shadowBlur = 20; g.fillRect(1180, 420, 240, 16);
    g.fillStyle = 'rgba(143,155,182,0.7)'; g.shadowColor = '#8f9bb6'; g.fillRect(1180, 420 + 300 * prog(t, c(3) + 3.5, 2), 240, 12); g.restore();
    text('350 bp: mutant barcodes, kept', 1510, 434, { size: 20, fam: 'mono', color: PAL.A, alpha: ga });
    text('cut ancestor fragments: removed', 1510, 734, { size: 20, fam: 'mono', color: PAL.dim, alpha: ga * prog(t, c(3) + 4.5, 1) });
    pill('otherwise 9 reads in 10 would be the ancestor', 1300, 230, { size: 22, color: PAL.T, align: 'center', alpha: cA * prog(t, c(3) + 1, 1) });
  }
  // slopes, corrected by neutral lineages
  const fA = env(t, c(4), 1e9, 0.8);
  if (fA > 0) {
    const P = plotFrame({ x: 220, y: 230, w: 820, h: 520 }, [0, 4], [-1.6, 3.4], { xt: [[0, 'T0'], [1, 'T1'], [2, 'T2'], [3, 'T3'], [4, 'T4']], yt: [[-1, '−1'], [0, '0'], [1, '1'], [2, '2'], [3, '3']], yl: 'ln( frequency / initial )', ylOff: 70, xl: 'time point (48 h cycles)' });
    P.draw(fA);
    const up = 4 * prog(t, c(4) + 0.5, 3, ease.lin), sb = 0.08;
    for (let i = 0; i < 14; i++) {
      const neutral = i >= 10, s = neutral ? 0 : 0.25 + hash01(i, 3) * 0.6, col = neutral ? '#8f9bb6' : hsl(hash01(i, 4) * 360, 78, 62);
      const v = k => (s - sb) * k + 0.06 * (hash01(i, k) - 0.5) * k;
      g.save(); g.globalAlpha = fA; g.strokeStyle = col; g.lineWidth = neutral ? 2 : 3; if (neutral) g.setLineDash([6, 6]); g.beginPath();
      for (let k = 0; k <= Math.floor(up); k++) { const p = [P.X(k), P.Y(v(k))]; k ? g.lineTo(...p) : g.moveTo(...p); } g.stroke(); g.restore();
      for (let k = 0; k <= Math.floor(up); k++) glowDot(P.X(k), P.Y(v(k)), 10, col, fA);
    }
    text('neutral lineages (dashed) sink slowly: that is the mean fitness, s̄', 1130, 330, { size: 22, color: PAL.dim, alpha: fA * prog(t, c(4) + 1.5, 1), maxW: 660 });
    text('sᵢ ≈ Δ ln fᵢ / Δt + s̄(t)', 1130, 470, { size: 52, fam: 'disp', alpha: fA * prog(t, c(4) + 2, 1) });
    text('each slope, corrected for the mean', 1130, 520, { size: 22, color: PAL.dim, alpha: fA * prog(t, c(4) + 2.5, 1) });
    simBadge(1130, 600, fA);
  }
};

SCENES.environments = (t, c, D) => {
  const A = FitnessAtlas;
  // one number per mutant: how fit, not why
  const oA = env(t, 0.2, c(1), 0.8, 0.8);
  if (oA > 0) {
    const picks = [3, 40, 120, 140, 160, 175, 190, 205, 225, 250];
    picks.forEach((ri, i) => {
      const r = A.rowOrder[ri], m = A.mutants[r], v = A.ecFit[r], y = 260 + i * 52, a = oA * prog(t, 0.4 + i * 0.1, 0.5);
      text(m.cls.label, 560, y + 20, { size: 20, fam: 'mono', color: m.cls.col, align: 'right', alpha: a });
      g.save(); g.globalAlpha = a; g.fillStyle = m.cls.col; g.fillRect(580, y, 500 * v / 1.6, 28); g.restore();
    });
    text('fitness at home: how fit,', 1240, 420, { size: 44, fam: 'disp', alpha: oA });
    text('but not why', 1240, 480, { size: 44, fam: 'disp', italic: true, color: PAL.G, alpha: oA * prog(t, 2, 1) });
    text('292 mutants × 45 environments', 1240, 600, { size: 30, fam: 'mono', color: PAL.ink, alpha: oA * prog(t, c(0) + 4, 1) });
  }
  // subtle vs strong, by the yardstick of repeat-to-repeat variation
  const zA = env(t, c(1), c(2), 0.8, 0.8);
  if (zA > 0) {
    const zx = z => 200 + (Math.sign(z) * Math.log10(1 + Math.abs(z))) / Math.log10(1 + 120) * 1500 + 150, y = 520;
    line(zx(-2), y, zx(150), y, PAL.faint, 2, zA);
    [[-1, '−1'], [0, '0'], [2, '2'], [5, '5'], [20, '20'], [100, '100']].forEach(([v, l]) => { line(zx(v), y - 8, zx(v), y + 8, PAL.faint, 2, zA); text(l, zx(v), y + 40, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: zA }); });
    text('Z = how far mutant fitnesses shift, in units of the spread between repeats of the original condition', 960, 640, { size: 22, color: PAL.dim, align: 'center', alpha: zA, maxW: 1400 });
    const band = zA * prog(t, c(1) + 1, 1);
    g.save(); g.globalAlpha = band * 0.18; g.fillStyle = PAL.G; g.fillRect(zx(-2), y - 120, zx(2) - zx(-2), 220); g.restore();
    line(zx(2), y - 140, zx(2), y + 100, PAL.G, 3, band, [10, 6]);
    ENVIRONMENTS.forEach((e, j) => {
      const z = clamp(A.z[j], -1.8, 150), dy = (hash01(j, 9) - 0.5) * 72, a = zA * prog(t, c(1) + 0.3 + j * 0.03, 0.4);
      glowDot(zx(z), y + dy, 22, hexA(CAT_COL[e.cat], 0.5), a);
      g.save(); g.globalAlpha = a; g.fillStyle = CAT_COL[e.cat]; g.beginPath(); g.arc(zx(z), y + dy, 8, 0, TAU); g.fill(); g.restore();
    });
    const sp = zA * prog(t, c(1) + 3, 1);
    text('25 subtle', (zx(-2) + zx(2)) / 2, y - 200, { size: 46, fam: 'disp', align: 'center', alpha: sp });
    text('nudges: a bit more glucose, another flask', (zx(-2) + zx(2)) / 2, y - 160, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: sp });
    text('20 strong', zx(30), y - 200, { size: 46, fam: 'disp', color: PAL.T, align: 'center', alpha: sp });
    text('salt, drugs, longer transfers', zx(30), y - 160, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha: sp });
  }
  // the fingerprints
  const fA = env(t, c(2), c(3), 0.8, 0.8);
  const typical = key => { const [r0, n] = classRows(key); return A.rowOrder[r0 + Math.floor(n / 2)]; };
  if (fA > 0) {
    drawHeat(300, 230, 45 * 15, 600, fA);
    line(300 + 25 * 15, 200, 300 + 25 * 15, 840, PAL.ink, 2, fA);
    text('subtle', 300 + 12.5 * 15, 215, { size: 18, fam: 'mono', color: PAL.ink, align: 'center', alpha: fA });
    text('strong', 300 + 35 * 15, 215, { size: 18, fam: 'mono', color: PAL.T, align: 'center', alpha: fA });
    const P = plotFrame({ x: 1080, y: 260, w: 760, h: 420 }, [0, 44], [-2, 2.4], { xt: [[0, 'EC'], [25, 'strong →'], [44, '']], yt: [[0, '0'], [2, '2']], yl: 'fitness', ylOff: 50 });
    P.draw(fA);
    const up = 44 * prog(t, c(2) + 0.6, 4, ease.lin);
    [['gpb2', PAL.C], ['pde2', PAL.A]].forEach(([key, col]) => {
      const r = typical(key);
      g.save(); g.globalAlpha = fA; g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath();
      for (let j = 0; j <= up; j++) { const p = [P.X(j), P.Y(A.F[r][j])]; j ? g.lineTo(...p) : g.moveTo(...p); } g.stroke(); g.restore();
    });
    text('GPB2', 1640, 250, { size: 22, fam: 'mono', weight: 600, color: PAL.C, alpha: fA }); text('PDE2', 1740, 250, { size: 22, fam: 'mono', weight: 600, color: PAL.A, alpha: fA });
    text('a fitness profile is a fingerprint of phenotype', 1080, 790, { size: 30, fam: 'disp', italic: true, alpha: fA * prog(t, c(2) + 3, 1) });
    simBadge(1080, 820, fA);
  }
  // eight hidden traits near home
  const vA = env(t, c(3), c(4), 0.8, 0.8);
  if (vA > 0) {
    const vals = [95, 3.39, 0.415, 0.28, 0.265, 0.07, 0.05, 0.04, 0.022, 0.018, 0.015];
    const box = { x: 240, y: 260, w: 880, h: 540 }, Y = v => box.y + box.h - (Math.log10(v) + 2) / 4 * box.h;
    [[100, '100%'], [10, '10%'], [1, '1%'], [0.1, '0.1%'], [0.01, '0.01%']].forEach(([v, l]) => { line(box.x, Y(v), box.x + box.w, Y(v), 'rgba(120,140,190,0.13)', 1, vA); text(l, box.x - 14, Y(v) + 7, { size: 19, fam: 'mono', color: PAL.dim, align: 'right', alpha: vA }); });
    g.save(); g.globalAlpha = vA * 0.25; g.fillStyle = '#8f9bb6'; g.fillRect(box.x, Y(0.03), box.w, box.y + box.h - Y(0.03)); g.restore();
    text('noise', box.x - 14, Y(0.03) + 7, { size: 19, fam: 'mono', color: PAL.G, align: 'right', alpha: vA });
    vals.forEach((v, i) => {
      const bw = box.w / vals.length, x = box.x + i * bw + 10, top = lerp(box.y + box.h, Y(v), prog(t, c(3) + 0.4 + i * 0.15, 0.8));
      g.save(); g.globalAlpha = vA; g.fillStyle = i < 8 ? (i === 0 ? PAL.G : PAL.C) : '#5f7396'; g.fillRect(x, top, bw - 20, box.y + box.h - top); g.restore();
      text(String(i + 1), x + (bw - 20) / 2, box.y + box.h + 30, { size: 19, fam: 'mono', color: PAL.dim, align: 'center', alpha: vA });
    });
    text('95%', box.x + 10 + (box.w / vals.length - 20) / 2, Y(95) + 40, { size: 30, fam: 'disp', color: '#071021', align: 'center', alpha: vA });
    text('hidden traits (components) near home, by variance explained', box.x, box.y - 30, { size: 20, fam: 'mono', color: PAL.dim, alpha: vA });
    simBadge(box.x, box.y + box.h + 50, vA, 'VALUES AS REPORTED · SCHEMATIC');
    reason('near home, a few traits explain nearly everything', 1240, 420, { alpha: vA * prog(t, c(3) + 1.5, 1), size: 40, maxW: 600 });
    reason('locally modular', 1240, 560, { alpha: vA * prog(t, c(3) + 3, 1), size: 44, color: PAL.G, maxW: 600 });
  }
  // far from home
  const sA = env(t, c(4), 1e9, 0.8);
  if (sA > 0) {
    text('far from home, the small traits take over', 960, 250, { size: 40, fam: 'disp', align: 'center', alpha: sA });
    const ax = v => 520 + v / 100 * 1100;
    [['3 smallest components, near home', 1.1, PAL.C], ['their share in 6-day transfers', 45, PAL.G]].forEach(([lab, v, col], i) => {
      const y = 360 + i * 90, gp = prog(t, c(4) + 0.5 + i * 1, 1);
      text(lab, 500, y + 26, { size: 22, fam: 'mono', color: PAL.dim, align: 'right', alpha: sA });
      g.save(); g.globalAlpha = sA; g.fillStyle = hexA(col, 0.15); g.fillRect(ax(0), y, ax(100) - ax(0), 36); g.fillStyle = col; g.fillRect(ax(0), y, (ax(v) - ax(0)) * gp, 36); g.restore();
      text(`${v}%`, ax(v * gp) + 14, y + 27, { size: 24, fam: 'mono', color: col, alpha: sA * gp });
    });
    const P = plotFrame({ x: 520, y: 600, w: 1100, h: 230 }, [0, 44], [-2.4, 2.4], { yt: [[0, '0']] });
    line(P.box.x, P.Y(0), P.box.x + P.box.w, P.Y(0), PAL.faint, 1.5, sA);
    const salt = ENVIRONMENTS.findIndex(e => e.label === '0.5 M NaCl');
    [['gpb2', PAL.C], ['pde2', PAL.A], ['ira1n', PAL.T]].forEach(([key, col], k) => {
      const r = typical(key), v = A.F[r][salt], gp = prog(t, c(4) + 3 + k * 0.4, 1);
      g.save(); g.globalAlpha = sA; g.fillStyle = col; const x = 700 + k * 300; g.fillRect(x, Math.min(P.Y(0), P.Y(v * gp)), 120, Math.abs(P.Y(v * gp) - P.Y(0))); g.restore();
      text(MUTANT_CLASSES.find(cl => cl.key === key).label, 760 + k * 300, 880, { size: 20, fam: 'mono', color: col, align: 'center', alpha: sA });
    });
    text('fitness in 0.5 M NaCl', 520, 620, { size: 20, fam: 'mono', color: PAL.dim, alpha: sA });
    simBadge(1300, 620, sA);
  }
};

SCENES.closing = (t, c, D) => {
  // iceberg
  const iA = env(t, 0.2, c(1), 0.8, 0.8);
  if (iA > 0) {
    const water = 430 + prog(t, 2.5, 3) * 260;
    const berg = [[960, 250], [1060, 360], [1120, 430], [1260, 560], [1300, 700], [1180, 820], [960, 880], [720, 820], [620, 690], [700, 520], [840, 400]];
    g.save(); g.globalAlpha = iA; g.beginPath(); berg.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    const bg = g.createLinearGradient(0, 250, 0, 880); bg.addColorStop(0, '#e9f3ff'); bg.addColorStop(1, '#5b7fb8'); g.fillStyle = bg; g.fill();
    g.strokeStyle = 'rgba(20,40,80,0.45)'; g.lineWidth = 2; for (const [x, y] of berg) { g.beginPath(); g.moveTo(960, 560); g.lineTo(x, y); g.stroke(); }
    g.fillStyle = 'rgba(8,24,52,0.62)'; g.fillRect(0, water, W, 940 - water); g.restore();
    line(0, water, W, water, 'rgba(160,200,255,0.8)', 3, iA);
    text('locally modular', 200, 400, { size: 64, fam: 'disp', italic: true, alpha: iA });
    text('few traits matter where it evolved', 200, 440, { size: 22, fam: 'mono', color: PAL.dim, alpha: iA });
    text('globally pleiotropic', 1300, 300, { size: 64, fam: 'disp', italic: true, color: PAL.G, alpha: iA * prog(t, 2.5, 1) });
    text('hidden effects surface elsewhere', 1300, 340, { size: 22, fam: 'mono', color: PAL.dim, alpha: iA * prog(t, 3, 1) });
  }
  // the chain of reasoning
  const rA = env(t, c(1), c(4) + 0.3, 0.8, 0.8);
  if (rA > 0) {
    text('each step, and the ambiguity it removes', 960, 210, { size: 26, fam: 'mono', color: PAL.G, align: 'center', alpha: rA, track: 2 });
    const at = [c(1) + 2.6, c(1) + 5.6, c(1) + 8.8, c(2) + 0.3, c(2) + 1.3, c(2) + 4.2, c(3) + 0.5, c(3) + 1.6];
    PROTOCOL.forEach((st, i) => {
      const a = rA * prog(t, at[i], 0.7), y = 280 + i * 76;
      g.save(); g.globalAlpha = a; g.beginPath(); g.arc(250, y - 10, 24, 0, TAU); g.fillStyle = st.ext ? PAL.violet : PAL.G; g.fill(); g.restore();
      text(String(i + 1), 250, y, { size: 26, fam: 'disp', color: '#0b1020', align: 'center', alpha: a });
      text(st.what, 300, y, { size: 32, fam: 'disp', alpha: a });
      text('so ' + st.so, 1000, y, { size: 30, fam: 'disp', italic: true, color: st.ext ? PAL.violet : PAL.G, alpha: a });
    });
  }
  // coda
  const cA = env(t, c(4), 1e9, 1);
  if (cA > 0) {
    const sp = prog(t, c(4) + 2.5, 3.5, ease.in);
    for (let i = 0; i < 20; i++) {
      const an = i * 2.39996 + t * 0.1, r = 24 * Math.sqrt(i * 20 + 5);
      baseTile(BC_SEQ[i], lerp(960 + (i - 9.5) * 72, 960 + Math.cos(an) * r, sp), lerp(480, 520 + Math.sin(an) * r * 0.8, sp), 62 * (1 - 0.5 * sp), { alpha: cA * prog(t, c(4) + i * 0.08, 0.5) });
    }
    for (let i = 20; i < 400; i++) {
      const a = cA * clamp(sp * 20 - i / 20) * sp, an = i * 2.39996 + t * 0.1, r = 22 * Math.sqrt(i);
      yeast(960 + Math.cos(an) * r, 520 + Math.sin(an) * r * 0.8, 9, { hue: Math.floor(hash01(i, 9) * 360), alpha: a });
    }
    const ea = cA * prog(t, c(4) + 4.5, 1.5);
    glowDot(960, 520, 420, 'rgba(5,10,22,0.95)', ea);
    text('count evolution as it happens', 960, 540, { size: 64, fam: 'disp', italic: true, align: 'center', alpha: ea, shadow: 18 });
  }
};

SCENES.credits = (t, c, D) => {
  const a = env(t, 0.3, D - 0.2, 1, 1.6);
  text('Sources', 200, 180, { size: 64, fam: 'disp', alpha: a });
  const refs = [
    ['Levy SF, Blundell JR, Venkataram S, Petrov DA, Fisher DS, Sherlock G.', 'Quantitative evolutionary dynamics using high-resolution lineage tracking. Nature 519, 181–186 (2015).'],
    ['Venkataram S, Dunn B, Li Y, et al.', 'Development of a comprehensive genotype-to-fitness map of adaptation-driven evolution in yeast. Cell (2016).'],
    ['Li Y, Venkataram S, Agarwala A, et al.', 'Hidden complexity of yeast adaptation under simple evolutionary conditions. Current Biology (2018).'],
    ['Kinsler G, Geiler-Samerotte K, Petrov DA.', 'Fitness variation across subtle environmental perturbations reveals local modularity and global pleiotropy of adaptation. eLife 9:e61271 (2020).'],
    ['Gould SJ.', 'Wonderful Life: The Burgess Shale and the Nature of History (1989).'],
  ];
  refs.forEach(([au, ti], i) => {
    const y = 260 + i * 104, ra = a * prog(t, 0.6 + i * 0.3, 0.8);
    text(au, 200, y, { size: 24, weight: 600, alpha: ra });
    text(ti, 200, y + 34, { size: 22, color: PAL.dim, alpha: ra, maxW: 1500 });
  });
  const na = a * prog(t, 2.4, 1);
  text('Trajectories, fitness matrices, lottery runs and phenotype spaces are simulated to illustrate the methods. Quoted figures come from the papers above.', 200, 830, { size: 21, color: PAL.G, alpha: na, maxW: 1500 });
  text('Made in a single HTML file: JavaScript, Canvas 2D, Web Audio. Narration voice synthesized with Piper TTS.', 200, 900, { size: 21, fam: 'mono', color: PAL.dim, alpha: na, maxW: 1500 });
};
