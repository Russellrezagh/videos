// ───────────────────────────── chapters: bulk assays → whole genomes → closing ─────────────────────────────

SCENES.assay = {
  build(G) { const f = makeFlask({ cells: 700 }); f.position.set(0, -1.3, 0); f.scale.setScalar(1.1); G.add(f); return { f }; },
  three(t, c, D, O) {
    const mix = prog(t, c(1) + 0.4, 2);
    fillFlask(O.f, 700, t, j => {
      if (hash01(j, 3) < 0.9 * mix) return IVORY;
      if (hash01(j, 4) < 0.1 * mix) return 0x8a8a8a;
      return '#' + hslToHex((hash01(j, 5) * 360) | 0, 75, 60);
    }, 0.032);
    Stage.orbit(0, 0.1, 0, 10, -8 + t * 0.8, 8, 30, -480);
  },
  flat(t, c, D, O) {
    flaskOutline(O.f, 1);
    const X = 1060;
    const a0 = vis(t, c(0), c(2), 0.6, 0.6);
    if (a0 > 0) {
      const mix = prog(t, c(1) + 0.4, 2);
      const seg = [[0.9 * mix, IVORY, 'ancestor'], [0.01 * mix, '#8a8a8a', 'barcoded controls'], [1 - 0.91 * mix, PAL.yellow, 'barcoded mutants']];
      let x = X;
      seg.forEach(([f, col, lab]) => { rect(x, 330, 680 * f, 36, typeof col === 'number' ? '#e9e4d8' : col, a0); x += 680 * f; });
      text('the flask, by cell number', X, 310, { size: 18, fam: 'mono', color: PAL.dim, alpha: a0 });
      const la = a0 * prog(t, c(1) + 1.8, 0.6);
      text('90% ancestor', X, 410, { size: 26, alpha: la }); text('≈ 1% control strains', X, 448, { size: 22, color: PAL.dim, alpha: la }); text('the rest: hundreds of barcoded mutants', X, 482, { size: 22, color: PAL.yellow, alpha: la });
      text('each mutant meets mostly the ancestor;', X, 570, { size: 24, alpha: a0 * prog(t, c(1) + 3, 0.6) });
      text('mean fitness stays nearly constant', X, 604, { size: 24, alpha: a0 * prog(t, c(1) + 3, 0.6) });
    }
    // two ways to keep the ancestor out of the reads
    const a2 = vis(t, c(2), c(3), 0.6, 0.6);
    if (a2 > 0) {
      text('Kinsler et al. 2020', X, 300, { size: 24, weight: 500, alpha: a2 });
      text('ancestor barcode carries an ApaLI site (GTGCAC)', X, 334, { size: 20, color: PAL.dim, alpha: a2 });
      const cut = prog(t, c(2) + 1.4, 0.8);
      drawAmp(X, 390, [{ w: 160, col: '#8a8a8a' }, { w: 30, col: PAL.red }, { w: 160, col: '#8a8a8a' }].map((p, i) => ({ ...p, a: 1 })), a2, { labels: false });
      if (cut > 0) { rect(X + 158, 370, 34, 40, '#000', a2 * cut); text('cut', X + 175, 440, { size: 18, fam: 'mono', color: PAL.red, align: 'center', alpha: a2 * cut }); }
      text('digested, then removed by size selection', X, 480, { size: 20, color: PAL.dim, alpha: a2 * cut });
      text('Schmidlin et al. 2024', X, 570, { size: 24, weight: 500, alpha: a2 * prog(t, c(2) + 2.2, 0.6) });
      text('a barcodeless ancestor: no primer site, no amplicon', X, 604, { size: 20, color: PAL.dim, alpha: a2 * prog(t, c(2) + 2.2, 0.6) });
      drawAmp(X, 660, [{ w: 350, col: '#3a3a3a' }], a2 * prog(t, c(2) + 2.6, 0.6), { labels: false });
      arrow(X + 40, 620, X + 120, 620, PAL.red, { alpha: a2 * prog(t, c(2) + 3, 0.5) });
      text('primer finds nothing to bind', X + 140, 626, { size: 18, fam: 'mono', color: PAL.red, alpha: a2 * prog(t, c(2) + 3, 0.5) });
    }
    // controls anchor zero
    const a3 = vis(t, c(3), 1e9, 0.6);
    if (a3 > 0) {
      const P = axes({ x: X, y: 300, w: 660, h: 420 }, [0, 4], [-1.2, 2.6], { xt: [[0, 'T0'], [4, 'T4']], yt: [[0, '0']], yl: 'ln frequency' });
      P.draw(a3);
      const up = 4 * prog(t, c(3) + 0.3, 2.5, ease.lin), sb = 0.12;
      for (let i = 0; i < 12; i++) { const ctrl = i >= 8, s = ctrl ? 0 : 0.2 + hash01(i, 3) * 0.6; curve(P, x => (s - sb) * x + (ctrl ? (hash01(i, 5) - 0.5) * 0.08 * x : 0), 0, up, ctrl ? '#8a8a8a' : '#' + hslToHex((hash01(i, 4) * 360) | 0, 75, 60), ctrl ? 2 : 2.5, a3, 0.05, ctrl ? [6, 6] : null); }
      text('controls (dashed): their slope defines fitness = 0', X, 780, { size: 22, alpha: a3 * prog(t, c(3) + 2, 0.6) });
      note('schematic', X, 820, a3);
    }
  },
};

const DRUG_TINT = e => (e.key === 'ND' ? 0x2f6fb3 : e.key === 'DMSO' ? 0x4a5a70 : e.flu && e.rad ? 0x6a5ab0 : e.flu ? 0x2f8fb3 : 0x8a5ab3);
SCENES.design = {
  build(G) {
    const flasks = [];
    for (let rep = 0; rep < 2; rep++) DRUG_ENVS.forEach((e, i) => { const f = makeFlask({ cells: 60, liquid: DRUG_TINT(e), liquidOpacity: 0.28 + 0.06 * (e.flu + e.rad) }); f.scale.setScalar(0.42); G.add(f); flasks.push({ f, e, i, rep }); });
    return { flasks };
  },
  three(t, c, D, O) {
    const show12 = vis(t, c(0) + 0.3, c(2), 0.6, 0.6), show24 = vis(t, c(4), 1e9, 0.6);
    O.flasks.forEach(({ f, e, i, rep }) => {
      const a = rep === 0 ? Math.max(show12 * prog(t, c(0) + 0.3 + i * 0.12, 0.4), show24) : show24 * prog(t, c(4) + 0.5 + i * 0.06, 0.4);
      f.visible = a > 0.02;
      const col = i % 6, row = Math.floor(i / 6);
      if (show24 > 0) f.position.set(-2.625 + col * 1.05, 1.9 - row * 1.15 - rep * 2.5, 0);
      else f.position.set(-2.625 + col * 1.05, 0.55 - row * 1.6, 0);
      fillFlask(f, 50, t + i, () => IVORY, 0.05);
    });
    const late = t >= c(4);
    Stage.orbit(0, late ? 0.55 : 0, 0, late ? 15 : 12.5, -4 + t * 0.4, 8, 30, -400);
  },
  flat(t, c, D, O) {
    const s12 = vis(t, c(0) + 0.3, c(2), 0.6, 0.6), s24 = vis(t, c(4), 1e9, 0.6);
    O.flasks.forEach(({ f, e, i, rep }) => {
      const a = rep === 0 ? Math.max(s12 * prog(t, c(0) + 0.3 + i * 0.12, 0.4), s24) : s24 * prog(t, c(4) + 0.5 + i * 0.06, 0.4);
      if (a <= 0.02) return;
      flaskOutline(f, a, '#cfcfcf', 1.5);
      if (rep === 0 && s12 > 0.02) { const [x, y] = Stage.projectObj(f, 0, -0.35, 0); text(e.label, x, y + 22, { size: 17, fam: 'mono', color: PAL.dim, align: 'center', alpha: a * prog(t, c(1), 0.6) }); }
    });
    const X = 1240;
    const a1 = vis(t, c(1), c(2), 0.6, 0.6);
    [['fluconazole (FLU)', 'antifungal; low · medium · high'], ['radicicol (RAD)', 'Hsp90 inhibitor; low · medium · high'], ['4 combinations', 'low/high RAD × low/high FLU'], ['DMSO, no drug', 'controls (drugs are dissolved in DMSO)']].forEach(([h1, s1], i) => {
      text(h1, X, 330 + i * 92, { size: 26, alpha: a1 * prog(t, c(1) + 0.3 + i * 0.3, 0.5) });
      text(s1, X, 362 + i * 92, { size: 19, color: PAL.dim, alpha: a1 * prog(t, c(1) + 0.3 + i * 0.3, 0.5) });
    });
    // choosing doses from growth curves
    const a2 = vis(t, c(2), c(3), 0.6, 0.6);
    if (a2 > 0) {
      const P = axes({ x: 200, y: 290, w: 760, h: 440 }, [0, 48], [-2.2, 0.2], { xt: [[0, '0 h'], [24, '24'], [48, '48 h']], yt: [[-2, '0.01'], [0, '1']], xl: 'plate reader, 30 °C, OD every 30 min', yl: 'OD (log)' });
      P.draw(a2);
      const up = 48 * prog(t, c(2) + 0.3, 3, ease.lin), od = (h, r) => Math.min(0, -2 + r * Math.max(0, h - 4) * Math.LOG10E * 0.32);
      curve(P, h => od(h, 1), 0, up, PAL.ink, 3, a2, 0.25);
      curve(P, h => od(h, 1) + 0.01, 0, up, PAL.blue, 2, a2, 0.25, [7, 5]);
      curve(P, h => od(h, 0.85), 0, up, PAL.yellow, 3, a2, 0.25);
      text('no drug', P.X(16), P.Y(-0.2), { size: 19, alpha: a2 }); text('low dose: no effect', P.X(19), P.Y(-0.75), { size: 19, color: PAL.blue, alpha: a2 }); text('high dose: growth rate −15%', P.X(26), P.Y(-1.4), { size: 19, color: PAL.yellow, alpha: a2 });
      text('strong enough to select, gentle enough to keep', 1060, 420, { size: 26, alpha: a2 * prog(t, c(2) + 2, 0.6), maxW: 700 });
      text('hundreds of thousands of barcodes alive', 1060, 456, { size: 26, alpha: a2 * prog(t, c(2) + 2, 0.6), maxW: 700 });
      note('schematic curves', 200, 800, a2);
    }
    // sampling ~21,000 isolates
    const a3 = vis(t, c(3), c(4), 0.6, 0.6);
    if (a3 > 0) {
      for (let i = 0; i < 12; i++) {
        const x = 220 + (i % 6) * 150, y = 340 + Math.floor(i / 6) * 170, a = a3 * prog(t, c(3) + i * 0.08, 0.4);
        ring(x, y, 52, '#6a6a6a', 2, a);
        for (let k = 0; k < 26; k++) dot(x + (hash01(i, k) - 0.5) * 70, y + (hash01(k, i) - 0.5) * 70, 4, IVORY ? '#e8dcc0' : '#fff', a * (1 - prog(t, c(3) + 2.4, 1)));
        text(DRUG_ENVS[i].key, x, y + 80, { size: 15, fam: 'mono', color: PAL.dim, align: 'center', alpha: a });
      }
      arrow(1150, 430, 1270, 430, PAL.ink, { alpha: a3 * prog(t, c(3) + 2.4, 0.6) });
      math('≈ 21,000', 1300, 440, { size: 64, alpha: a3 * prog(t, c(3) + 2.8, 0.6) });
      text('isolates, scraped from the plates and pooled', 1304, 480, { size: 20, color: PAL.dim, alpha: a3 * prog(t, c(3) + 2.8, 0.6) });
      text('2,000 per condition (1,000 in high FLU)', 1304, 512, { size: 20, color: PAL.dim, alpha: a3 * prog(t, c(3) + 2.8, 0.6) });
    }
    const a4 = vis(t, c(4), 1e9, 0.6);
    if (a4 > 0) [0, 1].forEach(rep => { const [x, y] = Stage.project(3.4, 1.9 - 0.575 + 0.5 - rep * 2.5, 0); text(`replicate ${rep + 1}`, x, y, { size: 22, fam: 'mono', color: PAL.dim, alpha: a4 }); });
  },
};

let DRUG_HEAT = null;
function drugHeat() {
  if (DRUG_HEAT) return DRUG_HEAT;
  const cv = document.createElement('canvas'), rows = DrugAtlas.rows; cv.width = 12; cv.height = rows.length;
  const x = cv.getContext('2d');
  rows.forEach((r, i) => r.f.forEach((v, j) => { x.fillStyle = v >= 0 ? mixHex('#141414', '#ffc845', clamp(v / 1.4)) : mixHex('#141414', '#4ea8ff', clamp(-v / 0.8)); x.fillRect(j, i, 1, 1); }));
  return (DRUG_HEAT = cv);
}
SCENES.fingerprint = {
  build(G) { const pts = makeCells(DrugAtlas.rows.length, { seg: 10 }); G.add(pts); return { pts }; },
  three(t, c, D, O) {
    const on = vis(t, c(1), 1e9, 0.8), spread = prog(t, c(1), 2);
    O.pts.visible = on > 0.01;
    DrugAtlas.rows.forEach((r, i) => { const [a, b, z] = r.pc; setCell(O.pts, i, a * 0.55 * spread, b * 0.55 * spread, z * 0.55 * spread, 0.07, r.cl.col, 1); });
    doneCells(O.pts, DrugAtlas.rows.length);
    const left = prog(t, c(2), 1.4);
    Stage.orbit(0, 0, 0, lerp(12, 14, left), t * 7, 16, 30, lerp(-220, -500, left), -30);
  },
  flat(t, c, D) {
    const a0 = vis(t, c(0), c(1) + 0.4, 0.6, 0.6);
    if (a0 > 0) {
      g.save(); g.globalAlpha = a0; g.imageSmoothingEnabled = false; g.drawImage(drugHeat(), 760, 230, 400, 600); g.restore();
      DRUG_ENVS.forEach((e, j) => { g.save(); g.translate(760 + j * 33.3 + 20, 222); g.rotate(-Math.PI / 3); text(e.key, 0, 0, { size: 15, fam: 'mono', color: PAL.dim, alpha: a0 }); g.restore(); });
      text('774 lineages', 740, 520, { size: 22, color: PAL.dim, align: 'right', alpha: a0 }); text('× 12 conditions', 740, 552, { size: 22, color: PAL.dim, align: 'right', alpha: a0 });
      math('9,288', 1220, 520, { size: 72, alpha: a0 }); text('fitness values', 1224, 556, { size: 22, color: PAL.dim, alpha: a0 });
      note('simulated values', 760, 860, a0);
    }
    const a1 = vis(t, c(1) + 0.6, c(2), 0.6, 0.6);
    DRUG_CLUSTERS.forEach((cl, i) => { const y = 300 + i * 46; dot(1480, y - 7, 8, cl.col, a1); text(cl.id === 7 ? 'controls' : `cluster ${cl.id}`, 1500, y, { size: 22, alpha: a1 }); text(cl.genes, 1640, y, { size: 18, color: PAL.dim, alpha: a1 }); });
    text('embedding: PCA of simulated profiles, standing in for UMAP', 1480, 650, { size: 16, fam: 'mono', color: '#6f6f6f', alpha: a1, maxW: 380 });
    // the shape of each cluster's tradeoffs
    const a2 = vis(t, c(2), 1e9, 0.6);
    if (a2 > 0) {
      const sel = [0, 1, 2, 5];
      sel.forEach((ci, k) => {
        const cl = DRUG_CLUSTERS[ci], x = 1060 + (k % 2) * 400, y = 270 + Math.floor(k / 2) * 300;
        const P = axes({ x, y, w: 340, h: 180 }, [0, 11], [-0.4, 1.7], { yt: [[0, '0']] });
        P.draw(a2);
        curve(P, j => { const i0 = Math.floor(j), f = j - i0; return lerp(cl.prof[i0], cl.prof[Math.min(11, i0 + 1)], f); }, 0, 11 * prog(t, c(2) + 0.4 + k * 0.4, 1.2, ease.lin), cl.col, 3, a2, 0.05);
        text(`cluster ${cl.id}`, x, y - 12, { size: 20, color: cl.col, alpha: a2 }); text(cl.genes, x + 340, y - 12, { size: 17, color: PAL.dim, align: 'right', alpha: a2 });
        ['FLU', 'RAD', 'both', 'none'].forEach((lab, m) => text(lab, x + [1, 4, 7.5, 10.5][m] / 11 * 340, y + 206, { size: 14, fam: 'mono', color: PAL.dim, align: 'center', alpha: a2 }));
      });
      note('profile shapes follow the paper’s descriptions; values illustrative', 1060, 860, a2);
    }
  },
};

// ── whole-genome sequencing I: from a colony to a library
SCENES.wgs1 = {
  build(G) {
    const N = 48, segs = [], ends = makeCells(120, { seg: 10 }), tns = makeCells(12, { seg: 14 });
    for (let i = 0; i < N; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), M3.std(0xe6e6e6, { rough: 0.45 })); G.add(m); segs.push(m); }
    G.add(ends, tns);
    return { segs, ends, tns, N };
  },
  three(t, c, D, O) {
    const on = vis(t, c(2) - 0.4, 1e9, 0.6);
    const cuts = [6, 13, 19, 27, 34, 41];
    const bind = prog(t, c(2) + 0.6, 1.6), cut = prog(t, c(2) + 2.6, 1.6), idx = prog(t, c(3) + 0.4, 1.2);
    const piece = i => cuts.filter(k => i >= k).length;
    // a wavy genome; each piece slides apart along x and drifts up or down once cut
    const P = Array.from({ length: O.N }, (_, i) => new THREE.Vector3((i - O.N / 2) * 0.16 + (piece(i) - 3) * 0.32 * cut, Math.sin(i * 0.35 + t * 0.6) * 0.22 + (piece(i) % 2 ? 0.22 : -0.22) * cut, Math.cos(i * 0.3) * 0.2));
    const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
    O.segs.forEach((m, i) => {
      m.visible = on > 0.02;
      const a = P[i > 0 && piece(i - 1) === piece(i) ? i - 1 : i], b = P[i < O.N - 1 && piece(i + 1) === piece(i) ? i + 1 : i];
      d.copy(b).sub(a); if (d.lengthSq() < 1e-9) d.set(1, 0, 0);
      m.position.copy(P[i]); m.quaternion.setFromUnitVectors(up, d.normalize()); m.scale.set(1, 1.1, 1);
    });
    let k = 0;
    cuts.forEach((ci, j) => {
      const a = O.segs[ci - 1].position, b = O.segs[ci].position;
      if (cut < 0.5) setCell(O.tns, j, (a.x + b.x) / 2, (a.y + b.y) / 2 + 0.2 * (1 - bind) + 0.0, (a.z + b.z) / 2, 0.16 * bind, 0xb28cff, 1);
      else setCell(O.tns, j, (a.x + b.x) / 2, (a.y + b.y) / 2 + 1.5 * (cut - 0.5), 0, 0.16 * (1.5 - cut), 0xb28cff, 1);
    });
    doneCells(O.tns, on > 0.02 && cut < 0.99 ? cuts.length : 0);
    // adapters on every new end, then index extensions
    const endsAt = [0, ...cuts.flatMap(ci => [ci - 1, ci]), O.N - 1];
    endsAt.forEach((ei, j) => {
      const p = O.segs[ei].position, dir = j % 2 === 0 ? -1 : 1;
      setCell(O.ends, k++, p.x + dir * 0.16, p.y, p.z, 0.09 * cut, j % 2 ? PAL.yellow : PAL.blue, 1);
      if (idx > 0) setCell(O.ends, k++, p.x + dir * 0.32, p.y, p.z, 0.08 * idx, PAL.orange, 1);
    });
    doneCells(O.ends, on > 0.02 && cut > 0.05 ? k : 0);
    const sel = prog(t, c(3) + 1.2, 1);
    Stage.orbit(0, 0.4, 0, 10 + prog(t, c(2), 3) * 1.5 + sel * 1.8, -6 + t * 0.8, 12, 30, 0, -150 * sel);
  },
  flat(t, c, D) {
    const a0 = vis(t, c(0), c(2) - 0.4, 0.6, 0.6);
    if (a0 > 0) {
      const steps = [['pooled sample', 'plated on agar'], ['single colony', 'one genotype'], ['grown in YPD', 'to saturation'], ['genomic DNA', 'column purified']];
      steps.forEach(([h1, s1], i) => {
        const x = 200 + i * 420, a = a0 * (t < c(1) ? (i === 0 ? 1 : 0.25) : prog(t, c(1) + i * 0.6, 0.5));
        if (i) arrow(x - 150, 470, x - 50, 470, PAL.ink, { alpha: a });
        if (i === 0) { ring(x + 60, 470, 70, '#8a8a8a', 2, a); for (let k = 0; k < 40; k++) dot(x + 60 + (hash01(k, 1) - 0.5) * 100, 470 + (hash01(k, 2) - 0.5) * 100, 5, '#e8dcc0', a); }
        if (i === 1) { ring(x + 60, 470, 70, '#8a8a8a', 2, a); dot(x + 60, 470, 14, PAL.yellow, a); }
        if (i === 2) { frame(x + 30, 400, 60, 140, '#8a8a8a', 2, a); rect(x + 33, 460, 54, 77, '#c8b48a', a * 0.7); }
        if (i === 3) { for (let k = 0; k < 6; k++) poly(Array.from({ length: 30 }, (_, j) => [x + 10 + j * 4, 440 + k * 12 + Math.sin(j * 0.6 + k) * 6]), PAL.ink, 1.5, a); }
        text(h1, x, 600, { size: 24, alpha: a }); text(s1, x, 632, { size: 19, color: PAL.dim, alpha: a });
      });
      text('122 colonies sequenced; 53 matched lineages with fitness data (Schmidlin et al. 2024)', 200, 780, { size: 20, color: PAL.dim, alpha: a0 * prog(t, c(1) + 3, 0.6) });
    }
    const a2 = vis(t, c(2), 1e9, 0.6);
    text('bead-linked transposomes', 200, 300, { size: 24, color: PAL.violet, alpha: vis(t, c(2) + 0.6, c(3), 0.5, 0.5) });
    text('cut + add adapters in one step: 55 °C, 15 min', 200, 336, { size: 20, color: PAL.dim, alpha: vis(t, c(2) + 1, c(3), 0.5, 0.5) });
    text('6–10 PCR cycles add unique dual indexes', 200, 300, { size: 24, color: PAL.orange, alpha: vis(t, c(3) + 0.4, 1e9, 0.5) });
    // double-sided size selection
    const a3 = vis(t, c(3) + 1.6, 1e9, 0.6);
    if (a3 > 0) {
      const P = axes({ x: 1120, y: 690, w: 640, h: 170 }, [100, 1200], [0, 1], { xt: [[200, '200'], [600, '600'], [1000, '1000 bp']], xl: 'fragment length' });
      P.draw(a3);
      const dist = x => Math.exp(-Math.pow(Math.log(x / 480) / 0.45, 2));
      for (let x = 110; x < 1200; x += 20) rect(P.X(x), P.Y(dist(x)), P.X(x + 18) - P.X(x), P.Y(0) - P.Y(dist(x)), x > 300 && x < 800 ? PAL.ink : '#4a4a4a', a3);
      line(P.X(300), P.box.y - 10, P.X(300), P.Y(0), PAL.yellow, 2, a3); line(P.X(800), P.box.y - 10, P.X(800), P.Y(0), PAL.yellow, 2, a3);
      text('beads remove the longest, then the shortest', P.X(550), P.box.y - 18, { size: 18, color: PAL.yellow, align: 'center', alpha: a3 });
    }
  },
};

// ── whole-genome sequencing II: sequencing by synthesis on a flow cell
SCENES.wgs2 = {
  build(G) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 2.4), M3.std(0xffffff, { opacity: 0.08, rough: 0.1, depthWrite: false })); G.add(slab);
    const n = 700, cl = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.02, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    for (let i = 0; i < n; i++) cl.setColorAt(i, new THREE.Color(0x333333));
    G.add(cl);
    const seeds = Array.from({ length: n }, (_, i) => [(hash01(i, 1) - 0.5) * 4.7, (hash01(i, 2) - 0.5) * 2.1]);
    return { slab, cl, seeds, n };
  },
  three(t, c, D, O) {
    const grow = prog(t, c(0) + 0.4, 2.5), cyc = Math.max(0, t - c(1) - 0.6), k = Math.floor(cyc / 1.1), ph = (cyc % 1.1) / 1.1;
    const flash = t > c(1) + 0.6 ? Math.max(0, 1 - ph * 1.6) : 0;
    for (let i = 0; i < O.n; i++) {
      const [x, z] = O.seeds[i], s = 0.06 * clamp(grow * 1.6 - hash01(i, 3) * 0.6);
      _o.position.set(x, 0.07, z); _o.scale.set(Math.max(0.001, s), 1, Math.max(0.001, s)); _o.rotation.set(0, 0, 0); _o.updateMatrix(); O.cl.setMatrixAt(i, _o.matrix);
      const base = BASES[(hash01(i, k + 20) * 4) | 0];
      O.cl.setColorAt(i, _c.set(flash > 0 ? mixHex('#2a2a2a', BASE_COL[base], flash) : grow > 0.99 ? '#3a3a3a' : '#555555'));
    }
    O.cl.instanceMatrix.needsUpdate = true; O.cl.instanceColor.needsUpdate = true;
    O.k = k; O.flash = flash;
    Stage.orbit(0, 0, 0.2, 8.2, -10 + t * 0.6, 48, 30, -300);
  },
  flat(t, c, D, O) {
    // one cluster, magnified: copies made in place
    const a0 = vis(t, c(0), c(1) + 0.3, 0.6, 0.6);
    if (a0 > 0) {
      const cx = 1560, cy = 420, n = Math.floor(1 + prog(t, c(0) + 0.6, 3, ease.in) * 300);
      ring(cx, cy, 130, '#5a5a5a', 1.5, a0);
      for (let i = 0; i < n; i++) { const r = 110 * Math.sqrt(hash01(i, 7)), an = hash01(i, 8) * TAU; dot(cx + Math.cos(an) * r, cy + Math.sin(an) * r, 2.5, PAL.ink, a0); }
      text('one cluster: ~1,000 copies of one fragment', cx, cy + 170, { size: 20, color: PAL.dim, align: 'center', alpha: a0 });
    }
    // reads grow base by base
    const a1 = vis(t, c(1), 1e9, 0.6);
    if (a1 > 0) {
      const k = Math.min(O.k ?? 0, 30);
      [0, 1, 2].forEach(j => {
        const i = [11, 220, 431][j], y = 330 + j * 60;
        text(`cluster ${i}`, 1300, y, { size: 17, fam: 'mono', color: PAL.dim, alpha: a1 });
        for (let m = 0; m <= k; m++) { const b = BASES[(hash01(i, m + 20) * 4) | 0]; text(b, 1420 + m * 15, y, { size: 20, fam: 'mono', weight: 600, color: m === k && O.flash > 0 ? BASE_COL[b] : '#bdbdbd', alpha: a1 }); }
      });
      text(`cycle ${Math.min((O.k ?? 0) + 1, 150)} of 150`, 1300, 540, { size: 24, alpha: a1 });
      // the chemistry of one cycle
      const steps = ['add labelled, blocked bases', 'image: colour = base', 'cleave dye and block'];
      steps.forEach((s, m) => text(`${m + 1}  ${s}`, 1300, 610 + m * 34, { size: 20, color: Math.floor(((t - c(1)) % 1.1) / 0.37) === m ? PAL.ink : PAL.dim, alpha: a1 * prog(t, c(1) + 1, 0.6) }));
    }
    const a2 = vis(t, c(2), 1e9, 0.6);
    if (a2 > 0) {
      const X2 = 1300, Y2 = 800;
      drawAmp(X2, Y2, [{ w: 40, col: PAL.orange }, { w: 34, col: PAL.blue }, { w: 426, col: '#5a5a5a' }, { w: 34, col: PAL.yellow }, { w: 40, col: PAL.orange }], a2, { labels: false });
      arrow(X2 + 74, Y2 - 30, X2 + 274, Y2 - 30, PAL.ink, { alpha: a2 }); text('read 1 · 150 bases', X2 + 74, Y2 - 44, { size: 18, fam: 'mono', alpha: a2 });
      arrow(X2 + 500, Y2 + 30, X2 + 300, Y2 + 30, PAL.ink, { alpha: a2 }); text('read 2 · 150 bases', X2 + 500, Y2 + 60, { size: 18, fam: 'mono', align: 'right', alpha: a2 });
    }
  },
};

// ── whole-genome sequencing III: alignment and variant calling
SCENES.wgs3 = {
  flat(t, c, D) {
    const { ref, site, alt, reads } = Pileup, X = 200, cw = 21, Y0 = 290;
    const shown = vis(t, c(0), c(2), 0.6, 0.6);
    if (shown > 0) {
      text('reference (sacCer3)', X, Y0 - 34, { size: 17, fam: 'mono', color: PAL.dim, alpha: shown });
      for (let i = 0; i < ref.length; i++) text(ref[i], X + i * cw, Y0, { size: 22, fam: 'mono', weight: 600, color: PAL.ink, alpha: shown });
      const hi = prog(t, c(1) + 0.4, 0.8);
      reads.forEach((r, j) => {
        const a = shown * prog(t, c(0) + 0.4 + j * 0.08, 0.4), y = Y0 + 34 + j * 20;
        for (let k = 0; k < r.s.length; k++) {
          const p = r.start + k, ch = r.s[k];
          if (ch === ' ' || p < 0 || p >= ref.length) continue;
          const mism = ch !== ref[p], isSite = p === site;
          text(mism ? ch : '·', X + p * cw + 4, y, { size: mism ? 17 : 15, fam: 'mono', weight: mism ? 600 : 400, color: mism ? (isSite ? mixHex('#8a8a8a', BASE_COL[ch], hi) : PAL.dim) : '#4d4d4d', alpha: a });
        }
      });
      const cov = Array.from({ length: ref.length }, (_, p) => reads.filter(r => p >= r.start && p < r.start + 28).length);
      cov.forEach((n, p) => rect(X + p * cw, 880 - n * 3, cw - 2, n * 3, '#3a3a3a', shown));
      text('coverage', X + ref.length * cw + 14, 876, { size: 16, fam: 'mono', color: PAL.dim, alpha: shown });
      if (hi > 0) {
        frame(X + site * cw - 3, Y0 - 24, cw + 2, 34 + reads.length * 20, PAL.yellow, 2, hi);
        const n = reads.filter(r => site >= r.start && site < r.start + 28).length;
        text(`${ref[site]} → ${alt}`, X + ref.length * cw + 30, Y0 + 60, { size: 40, fam: 'mono', color: PAL.yellow, alpha: hi });
        text(`${n} of ${n} reads (haploid clone)`, X + ref.length * cw + 30, Y0 + 100, { size: 20, color: PAL.dim, alpha: hi });
        text('GATK: variant called', X + ref.length * cw + 30, Y0 + 140, { size: 20, color: PAL.dim, alpha: hi * prog(t, c(1) + 1.6, 0.6) });
        text('a lone mismatch elsewhere is a sequencing error', X + ref.length * cw + 30, Y0 + 220, { size: 18, color: PAL.dim, alpha: hi * prog(t, c(1) + 2.4, 0.6), maxW: 300 });
      }
    }
    // filter background variants
    const a2 = vis(t, c(2), c(3), 0.6, 0.6);
    if (a2 > 0) {
      const rows = [['SRD1  Glu97Lys', 'in many unrelated lineages'], ['RSC30  Gly571Asp', 'in many unrelated lineages'], ['OPT1  Val143Ile', 'in many unrelated lineages'], ['LYS20  Thr29Met', 'in many unrelated lineages'], ['(variant)', 'also in the ancestor'], ['PDR1  missense', 'unique to this lineage']];
      text('variants called in one evolved clone', X, 300, { size: 18, fam: 'mono', color: PAL.dim, alpha: a2 });
      rows.forEach(([v, why], i) => {
        const y = 360 + i * 58, a = a2 * prog(t, c(2) + 0.3 + i * 0.2, 0.4), keep = i === 5, strike = prog(t, c(2) + 2 + i * 0.25, 0.4);
        text(v, X, y, { size: 30, fam: 'mono', color: keep ? PAL.yellow : PAL.ink, alpha: a * (keep ? 1 : 1 - 0.6 * strike) });
        text(why, X + 460, y, { size: 20, color: PAL.dim, alpha: a });
        if (!keep) line(X, y - 10, X + measure(v, 30, 'mono'), y - 10, PAL.ink, 2, a * strike);
      });
      text('background mutations reported by Schmidlin et al.; the PDR1 row is an illustration', X, 740, { size: 18, color: PAL.dim, alpha: a2 * prog(t, c(2) + 3.4, 0.6) });
      text('SnpEff annotates the gene and the protein change', X, 790, { size: 24, alpha: a2 * prog(t, c(2) + 3.6, 0.6) });
    }
    // what turned up, and ploidy
    const a3 = vis(t, c(3), 1e9, 0.6);
    if (a3 > 0) {
      const genes = [['PDR1, PDR3', 'drug-efflux regulators · fluconazole'], ['SUR1, UPC2', 'membrane lipids and sterols · low fluconazole'], ['HDA1, HSC82', 'radicicol (HSC82 is its target)'], ['IRA1, IRA2, GPB2', 'Ras/PKA brakes · glucose limitation']];
      genes.forEach(([gname, why], i) => { const a = a3 * prog(t, c(3) + i * 0.3, 0.4); text(gname, X, 340 + i * 74, { size: 32, fam: 'mono', alpha: a }); text(why, X, 370 + i * 74, { size: 19, color: PAL.dim, alpha: a }); });
      const P = axes({ x: 1100, y: 330, w: 640, h: 330 }, [0, 5], [0, 1.05], { xt: [[1, '1C'], [2, '2C'], [4, '4C']], xl: 'DNA content (SYTOX Green)', yl: 'cells' });
      P.draw(a3 * prog(t, c(3) + 1.4, 0.6));
      const pk = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
      curve(P, x => 0.9 * pk(x, 1, 0.12) + 0.6 * pk(x, 2, 0.16), 0.3, 4.8, PAL.ink, 2.5, a3 * prog(t, c(3) + 1.8, 0.6), 0.02);
      curve(P, x => 0.8 * pk(x, 2, 0.16) + 0.55 * pk(x, 4, 0.25), 0.3, 4.8, PAL.yellow, 2.5, a3 * prog(t, c(3) + 2.4, 0.6), 0.02);
      text('haploid', P.X(1), P.Y(0.95), { size: 19, align: 'center', alpha: a3 * prog(t, c(3) + 1.8, 0.6) });
      text('diploid', P.X(4), P.Y(0.62), { size: 19, color: PAL.yellow, align: 'center', alpha: a3 * prog(t, c(3) + 2.4, 0.6) });
      text('ploidy is invisible to variant calling, so it is measured by flow cytometry', 1100, 800, { size: 20, color: PAL.dim, alpha: a3 * prog(t, c(3) + 2.8, 0.6), maxW: 640 });
    }
  },
};

SCENES.closing = {
  build(G) { const hx = makeHelix('GCTTCAGTACGT' + BC_SEQ + 'ATCGGTACGCTA', { h0: 12, h1: 32 }); G.add(hx); return { hx }; },
  three(t, c, D, O) {
    const a = vis(t, c(1) - 0.2, 1e9, 1);
    setOpacity(O.hx, a); O.hx.rotation.x = t * 0.3;
    Stage.orbit(0, 0.3, 0, 16, -10 + t * 1.5, 8);
  },
  flat(t, c, D) {
    const a0 = vis(t, c(0), c(1), 0.6, 0.6);
    PROTOCOL.forEach((st, i) => {
      const y = 230 + i * 64, a = a0 * prog(t, c(0) + 1.2 + i * 1.3, 0.6);
      math(String(i + 1), 220, y, { size: 36, color: st.ext ? PAL.yellow : PAL.ink, alpha: a, align: 'right' });
      text(st.what, 260, y, { size: 30, alpha: a });
      text('so ' + st.so, 900, y, { size: 28, color: st.ext ? PAL.yellow : PAL.dim, alpha: a });
    });
  },
};

SCENES.credits = {
  flat(t, c, D) {
    const a = vis(t, 0.3, D - 0.3, 1, 1);
    text('Sources', 200, 180, { size: 48, weight: 500, alpha: a });
    const refs = [
      ['Levy SF, Blundell JR, Venkataram S, Petrov DA, Fisher DS, Sherlock G.', 'Quantitative evolutionary dynamics using high-resolution lineage tracking. Nature 519, 181–186 (2015).'],
      ['Venkataram S, Dunn B, Li Y, et al.', 'Development of a comprehensive genotype-to-fitness map of adaptation-driven evolution in yeast. Cell (2016).'],
      ['Kinsler G, Geiler-Samerotte K, Petrov DA.', 'Fitness variation across subtle environmental perturbations reveals local modularity and global pleiotropy of adaptation. eLife 9:e61271 (2020).'],
      ['Chochinov CA, Nguyen Ba AN.', 'Bulk-fitness measurements using barcode sequencing analysis in yeast. Methods in Molecular Biology 2477, 399–415 (2022).'],
      ['Schmidlin K, Apodaca S, Newell D, Sastokas A, Kinsler G, Geiler-Samerotte K.', 'Distinguishing mutants that resist drugs via different mechanisms by examining fitness tradeoffs. eLife (2024), doi:10.7554/eLife.94144.'],
      ['Gould SJ.', 'Wonderful Life: The Burgess Shale and the Nature of History (1989).'],
    ];
    refs.forEach(([au, ti], i) => { const y = 250 + i * 92, ra = a * prog(t, 0.6 + i * 0.25, 0.6); text(au, 200, y, { size: 22, weight: 500, alpha: ra }); text(ti, 200, y + 30, { size: 20, color: PAL.dim, alpha: ra, maxW: 1500 }); });
    const na = a * prog(t, 2.4, 1);
    text('Lineage trajectories, fitness matrices, clusters, lottery runs and pileups are simulated to illustrate the methods. Quoted figures come from the papers above.', 200, 860, { size: 19, color: PAL.yellow, alpha: na, maxW: 1500 });
    text('Made in one HTML file with three.js and Canvas 2D.', 200, 930, { size: 19, fam: 'mono', color: PAL.dim, alpha: na });
  },
};
