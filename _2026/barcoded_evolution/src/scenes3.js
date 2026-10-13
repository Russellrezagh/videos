// ───────────────────────────── chapters: evolving the pool → what lineage tracking revealed ─────────────────────────────

SCENES.evolve = {
  build(G) {
    const E1 = makeFlask({ cells: 420 }), E2 = makeFlask({ cells: 420 });
    E1.position.set(-1.35, -1.2, 0); E2.position.set(1.35, -1.2, 0); G.add(E1, E2);
    return { E1, E2 };
  },
  three(t, c, D, O) {
    const gen = 168 * prog(t, c(0) + 0.4, 9, ease.lin);
    const colour = seed => j => {
      const w = hash01(j, seed), rise = gen / 168;
      if (w < 0.06 * rise) return [PAL.yellow, PAL.violet, PAL.red][j % 3];
      return '#' + hslToHex((hash01(j, seed + 1) * 360) | 0, 35, 62);
    };
    fillFlask(O.E1, 400, t, colour(3), 0.034); fillFlask(O.E2, 400, t + 2, colour(9), 0.034);
    Stage.orbit(0, 0.2, 0, 12, -6 + t * 0.6, 9, 30, -440);
    O.gen = gen;
  },
  flat(t, c, D, O) {
    flaskOutline(O.E1); flaskOutline(O.E2);
    const [x1, y1] = Stage.projectObj(O.E1, 0, -0.3, 0), [x2, y2] = Stage.projectObj(O.E2, 0, -0.3, 0);
    text('E1', x1, y1 + 34, { size: 22, fam: 'mono', align: 'center' }); text('E2', x2, y2 + 34, { size: 22, fam: 'mono', align: 'center' });
    const a0 = vis(t, c(0), c(1), 0.6, 0.6), X = 1150;
    text(`generation ${Math.round(O.gen || 0)}`, X, 320, { size: 40, weight: 500, alpha: a0 });
    const k = Math.floor((O.gen || 0) / 8);
    for (let i = 0; i < 21; i++) rect(X + i * 30, 360, 22, 22, i < k ? PAL.ink : '#262626', a0);
    text('transfers every ~8 generations; each sample frozen', X, 420, { size: 20, color: PAL.dim, alpha: a0 });
    text('each colour is one barcode', X, 456, { size: 20, color: PAL.dim, alpha: a0 });
    const a1 = vis(t, c(1), c(2), 0.6, 0.6);
    if (a1 > 0) {
      const P = axes({ x: X, y: 280, w: 620, h: 380 }, [-90, 70], [0, 1.05], { xt: [[-90, '−90'], [-45, '−45'], [0, '0'], [40, '40']], xl: 'generation the mutation arose, relative to the start', yl: 'adaptive lineages (simulated)' });
      P.draw(a1);
      const mx = Math.max(...LT.tauHist), bw = P.X(-80) - P.X(-90);
      LT.tauHist.forEach((n, i) => { const x = P.X(-90 + i * 10), hh = (P.Y(0) - P.Y(n / mx)) * prog(t, c(1) + 0.3 + i * 0.05, 0.5); rect(x + 2, P.Y(0) - hh, bw - 4, hh, -90 + i * 10 < 0 ? PAL.yellow : '#7a7a7a', a1); });
      line(P.X(0), P.box.y, P.X(0), P.Y(0), PAL.ink, 1.5, a1, [5, 5]);
      text('already present at the start', P.X(-88), P.box.y + 24, { size: 20, color: PAL.yellow, alpha: a1 * prog(t, c(1) + 1.6, 0.6) });
    }
    const a2 = vis(t, c(2), 1e9, 0.6);
    if (a2 > 0) {
      for (let i = 0; i < 12; i++) { const x = X + i * 50; rect(x, 330, 26, 60, '#1c1c1c', a2); frame(x, 330, 26, 60, '#6a6a6a', 1.5, a2); rect(x, 318, 26, 12, [PAL.blue, PAL.yellow][i % 2], a2); }
      text('frozen samples, transfer by transfer', X, 430, { size: 20, color: PAL.dim, alpha: a2 });
      ['extract DNA', 'amplify barcodes', 'sequence and count'].forEach((s, i) => { arrow(X, 500 + i * 70, X + 50, 500 + i * 70, PAL.ink, { alpha: a2 * prog(t, c(2) + 0.5 + i * 0.4, 0.4) }); text(s, X + 70, 508 + i * 70, { size: 30, alpha: a2 * prog(t, c(2) + 0.5 + i * 0.4, 0.4) }); });
    }
  },
};

// helper: a random tangle of DNA as tubes
function dnaTangle(seed, n, len, rad, col) {
  const r = rng(seed), grp = new THREE.Group();
  for (let s = 0; s < n; s++) {
    const pts = []; let p = new THREE.Vector3((r() - 0.5) * rad, (r() - 0.5) * rad, (r() - 0.5) * rad);
    for (let k = 0; k < len; k++) { pts.push(p.clone()); p.add(new THREE.Vector3((r() - 0.5) * 0.5, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5)); p.clampLength(0, rad); }
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), len * 4, 0.014, 6), M3.std(col, { rough: 0.4, fade: true })));
  }
  return grp;
}

SCENES.extract = {
  build(G) {
    const cell = new THREE.Group(); cell.position.set(-3.2, 0.3, 0); G.add(cell);
    const wall = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), M3.std(0xc9b48a, { opacity: 0.35, rough: 0.8, depthWrite: false }));
    const mem = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 32), M3.std(0xe9e4d8, { opacity: 0.45, rough: 0.5, depthWrite: false }));
    const nuc = dnaTangle(5, 26, 24, 0.6, 0xffc845);
    cell.add(nuc, mem, wall);
    const col = new THREE.Group(); col.position.set(2.6, 0.2, 0); col.scale.setScalar(0.75); G.add(col);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 2.6, 48, 1, true), M3.glass()); tube.position.y = 0.4;
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 48), M3.std(0xf2f2f2, { rough: 0.9 })); disk.position.y = -0.2;
    const coll = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.62, 1.4, 48, 1, true), M3.glass()); coll.position.y = -1.6;
    const parts = makeCells(260, { seg: 8 });
    col.add(tube, disk, coll, parts);
    return { cell, wall, mem, nuc, col, parts };
  },
  three(t, c, D, O) {
    const dig = prog(t, c(0) + 0.6, 2), burst = prog(t, c(0) + 3, 1.5);
    O.wall.material.opacity = 0.35 * (1 - dig); O.wall.scale.setScalar(1 + dig * 0.15);
    O.mem.material.opacity = 0.45 * (1 - burst); O.mem.scale.setScalar(1 + burst * 0.4);
    O.nuc.scale.setScalar(1 + burst * 0.9); O.nuc.rotation.y = t * 0.2;
    // column: DNA binds, junk washes through; then a low-salt buffer releases the DNA
    const load = prog(t, c(1) + 0.4, 1.5), wash = prog(t, c(1) + 2.6, 2.2), elute = prog(t, c(2) + 0.8, 2);
    let k = 0;
    for (let i = 0; i < 260; i++) {
      const dna = i < 110, x0 = (hash01(i, 1) - 0.5) * 0.8, z0 = (hash01(i, 2) - 0.5) * 0.8, y0 = 1.5 + hash01(i, 3) * 0.6;
      let y;
      if (dna) y = elute > 0 ? lerp(-0.12, -2.0 + hash01(i, 4) * 0.4, ease.in(elute)) : lerp(y0, -0.12 + hash01(i, 5) * 0.05, ease.in(load));
      else y = lerp(lerp(y0, 0.1, ease.in(load)), -2.1 + hash01(i, 4) * 0.5, ease.in(wash));
      if (!dna && elute > 0.2) continue;
      setCell(O.parts, k++, x0, y, z0, dna ? 0.05 : 0.04, dna ? PAL.yellow : 0x7a7a7a, 1);
    }
    doneCells(O.parts, k);
    O.col.visible = t > c(1) - 0.5;
    const pan = prog(t, c(1) - 0.6, 1.6);
    O.cell.visible = pan < 0.6;
    Stage.orbit(lerp(-3.2, 2.6, pan), lerp(0.3, -0.2, pan), 0, lerp(7.5, 9.5, pan), -10 + t * 1.2, 10, 30, lerp(-200, 120, pan));
  },
  flat(t, c, D, O) {
    const [cx, cy] = Stage.projectObj(O.cell, 1.3, 0.6, 0);
    callout(cx, cy, cx + 160, cy - 90, 'cell wall: digested by zymolyase', { alpha: vis(t, c(0) + 0.6, c(1) - 0.4, 0.6, 0.4) });
    const [mx, my] = Stage.projectObj(O.cell, 0.9, -0.6, 0.5);
    callout(mx, my, mx + 200, my + 80, 'membrane: opened by detergent', { alpha: vis(t, c(0) + 3, c(1) - 0.4, 0.6, 0.4) });
    const lab = (s, at, until, ly, sub) => { const [x, y] = Stage.projectObj(O.col, 0.7, ly, 0); callout(x - 40, y, x + 120, y, s, { alpha: vis(t, at, until, 0.5, 0.4), sub }); };
    lab('silica membrane', c(1) + 0.4, c(2) + 4, -0.2, 'DNA binds in guanidine thiocyanate, pH ≈ 5');
    lab('washes: guanidine, then 80% ethanol', c(1) + 2.6, c(2), 1.2, 'proteins and salts flow through');
    lab('elution buffer: 10 mM Tris, pH 8.5', c(2) + 0.6, 1e9, 1.2, 'low salt releases the DNA');
    const a3 = vis(t, c(2) + 2.4, 1e9, 0.6);
    math('200 ng  ≈  10^7 genomes', 200, 380, { size: 54, alpha: a3 });
    text('so every barcode is present as many template copies,', 204, 430, { size: 22, color: PAL.dim, alpha: a3 });
    text('and a lineage’s count reflects its true frequency', 204, 462, { size: 22, color: PAL.dim, alpha: a3 });
  },
};

// amplicon layouts, left → right
const AMP = {
  genome: w => [{ w: 220, col: '#3a3a3a', lab: 'genome' }, { w: 120, col: '#8a8a8a', lab: 'priming site' }, { w: 160, col: 'bc', lab: 'barcode' }, { w: 120, col: '#8a8a8a', lab: 'priming site' }, { w: 220, col: '#3a3a3a', lab: 'genome' }].map(p => ({ ...p, w: p.w * w })),
  step1: [{ w: 70, col: PAL.violet, lab: 'index' }, { w: 70, col: PAL.red, lab: 'UMI' }, { w: 80, col: '#c9c9c9', lab: 'handle' }, { w: 120, col: '#8a8a8a', lab: 'priming' }, { w: 160, col: 'bc', lab: 'barcode' }, { w: 120, col: '#8a8a8a', lab: 'priming' }, { w: 80, col: '#c9c9c9', lab: 'handle' }, { w: 70, col: PAL.red, lab: 'UMI' }, { w: 70, col: PAL.violet, lab: 'index' }],
};
function drawAmp(x, y, parts, alpha, o = {}) {
  let cx = x;
  for (const p of parts) {
    if (p.col === 'bc') { for (let k = 0; k < 16; k++) rect(cx + k * p.w / 16, y - 14, p.w / 16 - 1, 28, BASE_COL[BC_SEQ[k]], alpha * (p.a ?? 1)); }
    else rect(cx, y - 14, p.w, 28, p.col, alpha * (p.a ?? 1) * 0.92);
    if (o.labels !== false && p.lab) text(p.lab, cx + p.w / 2, y + 40, { size: 15, fam: 'mono', color: PAL.dim, align: 'center', alpha: alpha * (p.a ?? 1) });
    cx += p.w;
  }
  return cx;
}
function thermal(x, y, w, steps, cycles, alpha) {
  // a temperature trace: denature, anneal, extend, repeated
  const pts = [], T = v => y + 60 - (v - 40) / 60 * 60;
  let cx = x;
  pts.push([cx, T(25)]);
  for (let k = 0; k < Math.min(cycles, 3); k++) for (const [temp, dur] of steps) { pts.push([cx, T(temp)]); cx += dur * w; pts.push([cx, T(temp)]); }
  poly(pts, PAL.ink, 2, alpha);
  text(steps.map(([tp, d, lab]) => `${tp} °C ${lab}`).join(' · ') + `  × ${cycles}`, x, y + 92, { size: 17, fam: 'mono', color: PAL.dim, alpha });
}

SCENES.pcr = {
  build(G) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, 1.9, 48, 1, true), M3.glass()); tube.position.set(2.2, 0, 0);
    const beads = makeCells(420, { seg: 8 }); beads.position.set(2.2, 0, 0);
    const magnet = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 0.8), M3.std(0x7a7a7a, { rough: 0.35 })); magnet.position.set(3.6, 0, 0);
    G.add(tube, beads, magnet);
    return { tube, beads, magnet };
  },
  three(t, c, D, O) {
    const on = vis(t, c(2), c(3), 0.6, 0.6);
    O.tube.visible = O.beads.visible = O.magnet.visible = on > 0.01;
    const pull = prog(t, c(2) + 1.6, 2.2), rem = prog(t, c(2) + 4.2, 1.5);
    O.magnet.position.x = lerp(5.5, 2.88, prog(t, c(2) + 0.8, 0.8));
    let k = 0;
    for (let i = 0; i < 420; i++) {
      const type = i < 200 ? 'bead' : i < 330 ? 'dna' : 'primer';
      if (type === 'primer' && rem > 0.95) continue;
      let x = (hash01(i, 1) - 0.5) * 0.62, y = -0.75 + hash01(i, 2) * 1.25, z = (hash01(i, 3) - 0.5) * 0.62;
      x += Math.sin(t * 0.8 + i) * 0.03;
      if (type !== 'primer') { x = lerp(x, 0.36, ease.io(pull)); z = lerp(z, (hash01(i, 4) - 0.5) * 0.45, pull); y = lerp(y, -0.2 + (hash01(i, 5) - 0.5) * 0.7, pull); }
      else y = lerp(y, y - 3, ease.in(rem));
      setCell(O.beads, k++, x, y, z, type === 'bead' ? 0.045 : type === 'dna' ? 0.028 : 0.02, type === 'bead' ? 0x8a5a2e : type === 'dna' ? PAL.yellow : 0x9a9a9a, 1);
    }
    doneCells(O.beads, k);
    Stage.orbit(2.2, 0, 0, 11, -10 + t, 10, 30, 420);
  },
  flat(t, c, D, O) {
    const a0 = vis(t, c(0), c(2), 0.6, 0.6), X = 200;
    if (a0 > 0) {
      text('genomic DNA around the barcode', X, 300, { size: 20, fam: 'mono', color: PAL.dim, alpha: a0 * (1 - prog(t, c(0) + 3, 0.6)) });
      drawAmp(X + 220, 350, AMP.genome(1), a0 * (1 - prog(t, c(0) + 3, 0.6)));
      const p1 = prog(t, c(0) + 1.4, 1.2);
      arrow(X + 220, 300, X + 220 + 340 * p1, 300, PAL.red, { alpha: a0 * (1 - prog(t, c(0) + 3, 0.6)) * (p1 > 0 ? 1 : 0) });
      arrow(X + 1060, 400, X + 1060 - 340 * p1, 400, PAL.red, { alpha: a0 * (1 - prog(t, c(0) + 3, 0.6)) * (p1 > 0 ? 1 : 0) });
      text('step 1 primers', X + 220, 284, { size: 17, fam: 'mono', color: PAL.red, alpha: a0 * p1 * (1 - prog(t, c(0) + 3, 0.6)) });
      const p2 = prog(t, c(0) + 3, 0.8);
      text('step 1 product (3 cycles)', X, 300, { size: 20, fam: 'mono', color: PAL.dim, alpha: a0 * p2 });
      drawAmp(X + 100, 350, AMP.step1, a0 * p2);
      thermal(X + 100, 470, 2.2, [[98, 10, 'melt'], [50, 10, 'anneal'], [72, 30, 'extend']], 3, a0 * p2);
      text('UMI: 8 random bases on each primer', X + 100 + 840 + 30, 357, { size: 22, color: PAL.red, alpha: a0 * p2 * (t < c(1) ? 1 : 0) });
    }
    // UMIs mark original molecules
    const a1 = vis(t, c(1), c(2), 0.6, 0.6);
    if (a1 > 0) {
      const mols = [[PAL.red, 5], [PAL.blue, 2], [PAL.green, 3]];
      text('original molecules', X, 600, { size: 18, fam: 'mono', color: PAL.dim, alpha: a1 });
      text('after more cycles', X + 520, 600, { size: 18, fam: 'mono', color: PAL.dim, alpha: a1 });
      text('counted as', X + 1260, 600, { size: 18, fam: 'mono', color: PAL.dim, alpha: a1 });
      mols.forEach(([col, copies], i) => {
        const y = 640 + i * 52;
        rect(X, y, 20, 22, col, a1); rect(X + 20, y, 200, 22, '#bdbdbd', a1); rect(X + 220, y, 20, 22, col, a1);
        for (let k = 0; k < copies; k++) { const a = a1 * prog(t, c(1) + 0.8 + k * 0.2, 0.3); rect(X + 520 + k * 130, y, 12, 22, col, a); rect(X + 532, y, 0, 0, col, 0); rect(X + 532 + k * 130, y, 90, 22, '#bdbdbd', a); rect(X + 622 + k * 130, y, 12, 22, col, a); }
        text('1', X + 1290, y + 18, { size: 24, fam: 'mono', alpha: a1 * prog(t, c(1) + 2.6, 0.5) });
      });
    }
    // SPRI beads
    const a2 = vis(t, c(2), c(3), 0.6, 0.6);
    if (a2 > 0) {
      const [tx, ty] = Stage.project(2.2, 1.4, 0);
      text('PEG and salt push DNA onto carboxyl beads; a magnet holds them', tx, ty - 30, { size: 20, color: PAL.dim, align: 'center', alpha: a2 });
      const P = axes({ x: 200, y: 300, w: 640, h: 380 }, [50, 500], [0, 1], { xt: [[100, '100'], [300, '300'], [500, '500 bp']], yt: [[0, '0'], [1, '1']], xl: 'fragment length', yl: 'fraction kept on the beads' });
      P.draw(a2);
      const sig = (x, mid) => 1 / (1 + Math.exp(-(x - mid) / 18));
      curve(P, x => sig(x, 110), 50, 500, PAL.blue, 3, a2 * prog(t, c(2) + 0.6, 0.6), 4);
      curve(P, x => sig(x, 230), 50, 500, PAL.yellow, 3, a2 * prog(t, c(2) + 1.2, 0.6), 4);
      text('1.25× beads', P.X(124), P.Y(0.5) + 6, { size: 19, color: PAL.blue, alpha: a2 * prog(t, c(2) + 0.6, 0.6) });
      text('0.8× beads', P.X(244), P.Y(0.5) + 6, { size: 19, color: PAL.yellow, alpha: a2 * prog(t, c(2) + 1.2, 0.6) });
      // where each species sits on the length axis; labels inside the box, along its floor
      [[80, 'primers', '#555', PAL.dim], [150, 'dimers', '#555', PAL.dim], [290, 'library', PAL.ink, PAL.ink]].forEach(([bp, lab, lc, tc]) => {
        line(P.X(bp), P.box.y + P.box.h, P.X(bp), P.box.y, lc, 1.5, a2, [4, 4]);
        text(lab, P.X(bp) + 6, P.box.y + P.box.h - 12, { size: 15, fam: 'mono', color: tc, alpha: a2 });
      });
      note('illustrative curves', 200, 760, a2);
    }
    // step two and the gel
    const a3 = vis(t, c(3), 1e9, 0.6);
    if (a3 > 0) {
      const p5 = [{ w: 90, col: '#4a4a4a', lab: 'P5' }, { w: 60, col: PAL.orange, lab: 'i5' }], p7 = [{ w: 60, col: PAL.orange, lab: 'i7' }, { w: 90, col: '#4a4a4a', lab: 'P7' }];
      text('step 2 adds the flow-cell adapters and indexes', X, 300, { size: 20, fam: 'mono', color: PAL.dim, alpha: a3 });
      const g2 = prog(t, c(3) + 0.6, 1);
      drawAmp(X, 350, [...p5.map(p => ({ ...p, a: g2 })), ...AMP.step1, ...p7.map(p => ({ ...p, a: g2 }))], a3);
      thermal(X + 100, 470, 2.2, [[98, 10, 'melt'], [62, 10, 'anneal'], [72, 30, 'extend']], 35, a3 * g2);
      text('Chochinov & Nguyen Ba: 35 cycles · Schmidlin et al.: 23 cycles', X + 100, 600, { size: 17, fam: 'mono', color: PAL.dim, alpha: a3 * g2 });
      // gel lane
      const gx = 1520, gy = 280, gw = 260, gh = 520;
      frame(gx, gy, gw, gh, '#3a3a3a', 1.5, a3);
      [[1000, 0.18], [500, 0.4], [300, 0.58], [200, 0.72], [100, 0.9]].forEach(([bp, f]) => { rect(gx + 20, gy + gh * f, 80, 6, '#9a9a9a', a3); text(`${bp}`, gx - 10, gy + gh * f + 8, { size: 15, fam: 'mono', color: PAL.dim, align: 'right', alpha: a3 }); });
      rect(gx + 150, gy + gh * 0.6, 90, 9, PAL.ink, a3 * prog(t, c(3) + 2.4, 0.8));
      text('≈ 290 bp', gx + gw + 14, gy + gh * 0.6 + 10, { size: 20, fam: 'mono', alpha: a3 * prog(t, c(3) + 2.4, 0.8) });
      text('ladder', gx + 60, gy + gh + 30, { size: 15, fam: 'mono', color: PAL.dim, align: 'center', alpha: a3 });
      text('library', gx + 195, gy + gh + 30, { size: 15, fam: 'mono', color: PAL.dim, align: 'center', alpha: a3 });
    }
  },
};

SCENES.count = {
  flat(t, c, D) {
    const X = 200;
    // pooling with dual indexes
    const a0 = vis(t, c(0), c(1), 0.6, 0.6);
    if (a0 > 0) {
      for (let i = 0; i < 6; i++) {
        const x = X + i * 90, a = a0 * prog(t, c(0) + i * 0.15, 0.4), merge = prog(t, c(0) + 1.6, 1.4);
        const xx = lerp(x, X + 760, merge), yy = lerp(330, 380, merge);
        rect(xx, yy, 34, 70, '#1c1c1c', a); frame(xx, yy, 34, 70, '#6a6a6a', 1.5, a); rect(xx, yy - 12, 34, 12, [PAL.blue, PAL.yellow, PAL.green, PAL.violet, PAL.red, PAL.orange][i], a);
        text(`T${i}`, x + 17, 440, { size: 15, fam: 'mono', color: PAL.dim, align: 'center', alpha: a * (1 - merge) });
      }
      text('quantified, pooled in equal amounts', X + 760, 490, { size: 20, color: PAL.dim, alpha: a0 * prog(t, c(0) + 2.8, 0.6) });
      text('every read carries an index at both ends', X, 620, { size: 26, alpha: a0 * prog(t, c(0) + 3.2, 0.6) });
      drawAmp(X, 690, [{ w: 60, col: PAL.orange, lab: 'i5' }, { w: 500, col: '#555', lab: 'barcode amplicon' }, { w: 60, col: PAL.orange, lab: 'i7' }], a0 * prog(t, c(0) + 3.2, 0.6));
      text('a read is kept only if both indexes agree on the sample', X + 680, 700, { size: 20, color: PAL.dim, alpha: a0 * prog(t, c(0) + 3.8, 0.6) });
    }
    // parsing a read
    const a1 = vis(t, c(1), c(2), 0.6, 0.6);
    if (a1 > 0) {
      const umi = 'GTACCATG', idx = 'ACGTCA', prime = 'TTGCAGCATCGATCGGTAC', bc = 'TCGAATGCACTAGTTG', down = 'ATCGGTACGCTA';
      const read = umi + idx + prime.slice(0, 7) + 'A' + prime.slice(8) + bc + down;
      const segs = [[umi, PAL.red, 'UMI'], [idx, PAL.violet, 'index'], [prime, '#9a9a9a', 'priming site (≤ 3 errors allowed)'], [bc, 'bc', 'barcode'], [down, '#5a5a5a', '']];
      text('one read from the sequencer', X, 300, { size: 18, fam: 'mono', color: PAL.dim, alpha: a1 });
      let pos = 0;
      segs.forEach(([s, col, lab], si) => {
        const a = a1 * prog(t, c(1) + 0.4 + si * 0.5, 0.4);
        for (let k = 0; k < s.length; k++) {
          const ch = read[pos + k], err = si === 2 && k === 7;
          text(ch, X + (pos + k) * 22, 360, { size: 26, fam: 'mono', color: col === 'bc' ? BASE_COL[ch] : err ? PAL.yellow : col, alpha: a1 });
        }
        if (lab) { line(X + pos * 22, 380, X + (pos + s.length) * 22 - 4, 380, col === 'bc' ? PAL.ink : col, 2, a); text(lab, X + pos * 22, 410, { size: 17, fam: 'mono', color: PAL.dim, alpha: a }); }
        pos += s.length;
      });
      text('↑ a sequencing error, tolerated', X + 30 * 22, 448, { size: 17, color: PAL.yellow, alpha: a1 * prog(t, c(1) + 2.4, 0.5) });
      // dictionary matching
      const dict = ['TCGAATGCACTAGTAG', 'TCGTATGCACTAGTTG', 'GACCTTAGCATGGTCA', 'CTTAGCAATCGAGGTA'];
      text('nearest known barcode', X, 560, { size: 18, fam: 'mono', color: PAL.dim, alpha: a1 * prog(t, c(1) + 3, 0.5) });
      dict.forEach((d, i) => {
        const dist = [...d].reduce((s2, ch, k) => s2 + (ch !== bc[k] ? 1 : 0), 0), best = dist === 1, a = a1 * prog(t, c(1) + 3.2 + i * 0.2, 0.4);
        text(d, X, 610 + i * 40, { size: 24, fam: 'mono', color: best ? PAL.ink : '#6a6a6a', alpha: a });
        text(`${dist} edit${dist === 1 ? '' : 's'}`, X + 420, 610 + i * 40, { size: 20, fam: 'mono', color: best ? PAL.yellow : PAL.dim, alpha: a });
      });
      text('matched within 2 edits', X + 560, 650, { size: 22, color: PAL.yellow, alpha: a1 * prog(t, c(1) + 4.2, 0.5) });
    }
    // UMI collapse → counts → frequencies
    const a2 = vis(t, c(2), c(3), 0.6, 0.6);
    if (a2 > 0) {
      const rows = [['GTACCATG·TTCAGGCA', 'A'], ['GTACCATG·TTCAGGCA', 'A'], ['GTACCATG·TTCAGGCA', 'A'], ['CCATGATA·AGGTTCAT', 'A'], ['TTAGCCGA·CATGTCAA', 'B'], ['TTAGCCGA·CATGTCAA', 'B'], ['AGCTTAGC·GGATCCAT', 'C']];
      text('UMI pair', X, 300, { size: 18, fam: 'mono', color: PAL.dim, alpha: a2 }); text('barcode', X + 420, 300, { size: 18, fam: 'mono', color: PAL.dim, alpha: a2 });
      const col = prog(t, c(2) + 1.6, 0.8);
      const seen = new Set();
      rows.forEach(([u, b], i) => {
        const dup = seen.has(u + b); seen.add(u + b);
        const a = a2 * prog(t, c(2) + 0.2 + i * 0.1, 0.3) * (dup ? 1 - 0.8 * col : 1);
        text(u, X, 350 + i * 44, { size: 22, fam: 'mono', alpha: a });
        text(b, X + 420, 350 + i * 44, { size: 22, fam: 'mono', color: { A: PAL.yellow, B: PAL.blue, C: PAL.green }[b], alpha: a });
        if (dup) line(X, 343 + i * 44, X + 450, 343 + i * 44, PAL.dim, 1.5, a2 * col);
      });
      const counts = { A: 2, B: 1, C: 1 }, tot = 4, fa = a2 * prog(t, c(2) + 2.6, 0.8);
      Object.entries(counts).forEach(([b, n], i) => {
        const y = 360 + i * 90, col2 = { A: PAL.yellow, B: PAL.blue, C: PAL.green }[b];
        text(`barcode ${b}`, 1000, y + 22, { size: 22, fam: 'mono', color: col2, alpha: fa });
        rect(1180, y, 400 * n / tot, 30, col2, fa);
        text(`${n} / ${tot} = ${(n / tot).toFixed(2)}`, 1180 + 400 * n / tot + 16, y + 23, { size: 22, fam: 'mono', alpha: fa });
      });
      text('count ÷ total = frequency', 1000, 680, { size: 26, alpha: fa });
    }
    // rules of thumb
    const a3 = vis(t, c(3), 1e9, 0.6);
    if (a3 > 0) [['≥ 100', 'cells passed per barcode at each transfer', 'drift sets the error; 1,000 is better'], ['≥ 100', 'reads per barcode per time point', 'sampling error of the counts'], ['< 50', 'generations in a fitness assay', 'so new mutations do not creep in']].forEach(([n, l1, l2], i) => {
      const x = 200 + i * 540, a = a3 * prog(t, c(3) + i * 0.5, 0.6);
      math(n, x, 470, { size: 96, alpha: a });
      text(l1, x, 530, { size: 24, alpha: a, maxW: 470 });
      text(l2, x, 600, { size: 20, color: PAL.dim, alpha: a, maxW: 470 });
    });
  },
};

SCENES.infer = {
  flat(t, c, D) {
    const a0 = vis(t, c(0), 1e9, 0.6);
    math('df_i / dt  =  f_i (s_i − s̄)', 200, 300, { size: 58, alpha: a0 });
    math('s̄  =  Σ f_i s_i', 1100, 300, { size: 46, color: PAL.dim, alpha: a0 * prog(t, c(0) + 1.5, 0.6) });
    const a1 = vis(t, c(1), 1e9, 0.6);
    math('ln( f_i / f_{ref} )  =  const  +  s_i t', 200, 390, { size: 46, color: PAL.yellow, alpha: a1 });
    // straight lines vs a flat reference
    const pA = vis(t, c(1), c(2), 0.6, 0.6);
    if (pA > 0) {
      const P = axes({ x: 200, y: 470, w: 760, h: 330 }, [0, 4], [-0.8, 2.2], { xt: [[0, 'T0'], [1, 'T1'], [2, 'T2'], [3, 'T3'], [4, 'T4']], yt: [[0, '0']], yl: 'ln(fᵢ / f_ref)' });
      P.draw(pA);
      const up = 4 * prog(t, c(1) + 0.4, 2.5, ease.lin);
      [[0.5, PAL.yellow], [0.3, PAL.blue], [0.12, PAL.green], [-0.15, PAL.red], [0, '#9a9a9a']].forEach(([s, col]) => { curve(P, x => s * x, 0, up, col, 2.5, pA, 0.05); text(s === 0 ? 'reference' : `s = ${s}`, P.X(4) + 12, P.Y(s * 4) + 6, { size: 18, fam: 'mono', color: col, alpha: pA * clamp(up - 3.6) }); });
    }
    // weighting by reads
    const wA = vis(t, c(2), c(3), 0.6, 0.6);
    if (wA > 0) {
      math('L  =  C ∏ f_i(t)^{n_i(t)}', 1100, 390, { size: 40, color: PAL.dim, alpha: wA });
      const P = axes({ x: 200, y: 470, w: 760, h: 330 }, [0, 4], [-0.8, 2.2], { xt: [[0, 'T0'], [1, 'T1'], [2, 'T2'], [3, 'T3'], [4, 'T4']], yt: [[0, '0']], yl: 'ln(fᵢ / f_ref), one lineage' });
      P.draw(wA);
      const reads = [900, 640, 380, 60, 25], vals = [0, 0.42, 0.85, 1.6, 0.9];
      vals.forEach((v, k) => { const e = 1.2 / Math.sqrt(reads[k]) * 4; line(P.X(k), P.Y(v - e), P.X(k), P.Y(v + e), '#8a8a8a', 2, wA); dot(P.X(k), P.Y(v), 4 + Math.sqrt(reads[k]) / 4, PAL.ink, wA); text(`${reads[k]} reads`, P.X(k), P.Y(v - e) + 24, { size: 15, fam: 'mono', color: PAL.dim, align: 'center', alpha: wA }); });
      const f2 = prog(t, c(2) + 1.6, 0.8);
      curve(P, x => 0.43 * x, 0, 4, PAL.yellow, 3, wA * f2, 0.05);
      curve(P, x => 0.33 * x, 0, 4, '#666', 2, wA * f2, 0.05, [6, 6]);
      text('weighted fit', P.X(4) + 12, P.Y(1.72) + 6, { size: 18, color: PAL.yellow, alpha: wA * f2 });
      text('unweighted', P.X(4) + 12, P.Y(1.32) + 6, { size: 18, color: '#888', alpha: wA * f2 });
      text('low-count points are noisy, so they count less', 1100, 560, { size: 24, alpha: wA * prog(t, c(2) + 2.4, 0.6), maxW: 640 });
    }
    // the noise floor from neutral lineages
    const nA = vis(t, c(3), 1e9, 0.6);
    if (nA > 0) {
      const P = axes({ x: 200, y: 470, w: 760, h: 330 }, [0, 112], [-7.4, -4.6], { xt: [[0, '0'], [112, '112 gen']], yt: [[-7, pow10(-7)], [-5, pow10(-5)]], yl: 'neutral barcodes' });
      P.draw(nA);
      const up = 112 * prog(t, c(3) + 0.3, 3, ease.lin);
      g.save(); g.globalAlpha = nA; drawLineages(P, up, { neutralA: 0.22, adaptA: 0 }); g.restore();
      text('the spread of neutral lineages is the noise a real signal must beat', 1100, 560, { size: 24, alpha: nA * prog(t, c(3) + 1.5, 0.6), maxW: 640 });
      note('simulated', 200, 860, nA);
    }
  },
};

SCENES.revealed = {
  build(G) { return buildForest(G); },
  three(t, c, D, F) {
    forestDrawUpto(F, 112 * prog(t, 0.3, 4, ease.io));
    F.plane.material.opacity = 0.0;
    const turn = prog(t, 0, 10, ease.sine);
    Stage.orbit(0, 0.1, 0, 17.5, lerp(-20, -48, turn), lerp(10, 22, turn), 30, -330, -70);
  },
  flat(t, c, D, F) {
    forestPlane(F, vis(t, c(2), 1e9, 0.8), 1);
    const X = 1340;
    const a0 = vis(t, c(0) + 0.5, 1e9, 0.6);
    math('≈ 25,000', X, 300, { size: 72, alpha: a0 });
    text('of ~500,000 lineages carried', X, 342, { size: 21, color: PAL.dim, alpha: a0 });
    text('beneficial mutations (E1)', X, 370, { size: 21, color: PAL.dim, alpha: a0 });
    const a1 = vis(t, c(1), 1e9, 0.6);
    math('≈ 10^{−6}', X, 470, { size: 60, alpha: a1 });
    text('per cell per generation, s > 5%', X, 508, { size: 21, color: PAL.dim, alpha: a1 });
    if (a1 > 0) {
      const mx = Math.log10(Math.max(...LT.dfe) + 1), bw = 20;
      LT.dfe.forEach((n, i) => { const hh = 120 * Math.log10(n + 1) / mx * prog(t, c(1) + 0.5 + i * 0.04, 0.5); rect(X + i * bw, 680 - hh, bw - 3, hh, '#' + hslToHex(sHue(0.02 + i * 0.005), 80, 60), a1); });
      text('2%', X, 704, { size: 15, fam: 'mono', color: PAL.dim, alpha: a1 }); text('13%', X + 21 * bw, 704, { size: 15, fam: 'mono', color: PAL.dim, alpha: a1 });
      text('fitness effects (log count)', X, 536 + 18, { size: 16, fam: 'mono', color: PAL.dim, alpha: a1 });
    }
    const a2 = vis(t, c(2), 1e9, 0.6);
    math('≈ 15', X, 790, { size: 60, color: PAL.yellow, alpha: a2 });
    text('visible to bulk sequencing', X, 826, { size: 21, color: PAL.dim, alpha: a2 });
    note('lines: simulated lineages', 120, 860, prog(t, 1, 1));
  },
};
