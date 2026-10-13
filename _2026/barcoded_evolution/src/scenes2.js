// ───────────────────────────── chapters: bottleneck → installing barcodes ─────────────────────────────

SCENES.bottleneck = {
  build(G) {
    const pop = makeCells(1400, { seg: 10 }); G.add(pop);
    const prof = [[1.9, 1.0], [1.85, 0.95], [0.18, -0.6], [0.16, -1.3]].map(([r, y]) => new THREE.Vector2(r, y)).reverse();
    const funnel = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), M3.glass()); G.add(funnel);
    return { pop, funnel };
  },
  three(t, c, D, O) {
    const a = 1 - prog(t, c(1) - 0.2, 0.8);
    O.pop.material.opacity = a; O.funnel.visible = a > 0.01; O.pop.visible = a > 0.01;
    const period = 2.6, k = Math.floor(Math.max(0, t - 0.8) / period), ph = (Math.max(0, t - 0.8) % period) / period;
    let n = 0;
    for (let i = 0; i < 1400; i++) {
      const u = hash01(i, 1), v = hash01(i, 2), w = hash01(i, 3), rr = 1.55 * Math.cbrt(w), th = u * TAU, cy = 2 * v - 1;
      let x = rr * Math.sqrt(1 - cy * cy) * Math.cos(th), y = 2.6 + rr * 0.55 * cy, z = rr * Math.sqrt(1 - cy * cy) * Math.sin(th);
      const mutant = i < 3, chosen = t > 0.8 && (hash01(i, k + 11) < 0.006 || (mutant && hash01(k, 77) < 0.08));
      if (chosen) { const f = ease.in(clamp(ph * 1.5)); x = lerp(x, (hash01(i, 4) - 0.5) * 0.25, f); z = lerp(z, (hash01(i, 5) - 0.5) * 0.25, f); y = lerp(y, -2.0 - hash01(i, 6) * 0.4, f); }
      setCell(O.pop, n++, x, y, z, mutant ? 0.075 : 0.05, mutant ? PAL.yellow : chosen ? PAL.ink : 0x8a8a8a);
    }
    doneCells(O.pop, n);
    O.kept = Array.from({ length: k + 1 }, (_, j) => hash01(j, 77) < 0.08);
    Stage.orbit(2.6, 0.9, 0, 12.5, 20 + t * 2, 10);
  },
  flat(t, c, D, O) {
    const a0 = 1 - prog(t, c(1) - 0.2, 0.8);
    if (a0 > 0) {
      text('a transfer passes about 1 cell in 250', 1180, 320, { size: 26, alpha: a0 });
      text('three cells of a new beneficial mutant', 1180, 360, { size: 22, color: PAL.yellow, alpha: a0 });
      (O.kept || []).slice(0, 12).forEach((kept, j) => {
        const x = 1180 + j * 52, a = a0 * prog(t, 0.8 + j * 2.6 + 1.6, 0.4);
        dot(x + 10, 460, 9, kept ? PAL.yellow : '#3a3a3a', a);
        text(kept ? 'kept' : 'lost', x + 10, 498, { size: 15, fam: 'mono', color: kept ? PAL.yellow : PAL.dim, align: 'center', alpha: a });
      });
      text('draws', 1180, 540, { size: 17, fam: 'mono', color: PAL.dim, alpha: a0 });
    }
    const lA = vis(t, c(1), c(2) + 0.2, 0.6, 0.6);
    if (lA > 0) {
      const P = axes({ x: 240, y: 230, w: 1000, h: 520 }, [0, 160], [-0.4, 4.6], { xt: [[0, '0'], [40, '40'], [80, '80'], [120, '120'], [160, '160']], yt: [[0, '1'], [1, '10'], [2, '100'], [3, '1,000'], [4, '10⁴']], xl: 'generations after the mutation', yl: 'cells carrying it' });
      P.draw(lA);
      const up = 160 * prog(t, c(1) + 0.4, 5, ease.lin);
      let alive = 0;
      LOTTERY.forEach(y => {
        const surv = y[160] > 0; if (surv) alive++;
        const pts = [];
        for (let k = 0; k <= up; k++) { if (y[k] === 0) { pts.push([P.X(k), P.Y(-0.4)]); break; } pts.push([P.X(k), P.Y(Math.log10(y[k]))]); }
        poly(pts, surv ? PAL.yellow : '#6a6a6a', surv ? 2.5 : 1.3, lA);
      });
      line(P.X(0), P.Y(Math.log10(20)), P.X(160), P.Y(Math.log10(20)), PAL.ink, 1.5, lA, [8, 8]);
      text('1/s = 20 cells', P.X(160) + 12, P.Y(Math.log10(20)) + 6, { size: 20, fam: 'mono', alpha: lA });
      const kA = lA * prog(t, c(1) + 5.6, 0.8);
      math(`${alive} / 40`, 1400, 470, { size: 96, alpha: kA });
      text('new mutants with s = 5% survived', 1400, 520, { size: 22, color: PAL.dim, alpha: kA });
      text('theory: about 2s, one in ten', 1400, 556, { size: 20, fam: 'mono', color: PAL.dim, alpha: kA });
      note('simulated: branching process, 40 runs', 240, 820, lA);
    }
    const sA = vis(t, c(2), 1e9, 0.6);
    if (sA > 0) {
      math('N × μ', 240, 420, { size: 110, alpha: sA });
      math('4 × 10^7  ×  10^{−6}  ≈  40', 240, 560, { size: 60, color: PAL.yellow, alpha: sA * prog(t, c(2) + 1.5, 0.8) });
      text('cells per transfer × rate of mutations worth more than 5% (Levy et al. 2015)', 244, 620, { size: 22, color: PAL.dim, alpha: sA * prog(t, c(2) + 2, 0.8) });
      for (let g2 = 0; g2 < 6; g2++) {
        for (let k = 0; k < 40; k++) dot(1180 + k * 15, 330 + g2 * 60, 4.5, PAL.yellow, sA * prog(t, c(2) + 2.5 + g2 * 0.35 + k * 0.01, 0.3));
        text(`gen ${g2 + 1}`, 1160, 336 + g2 * 60, { size: 16, fam: 'mono', color: PAL.dim, align: 'right', alpha: sA * prog(t, c(2) + 2.5 + g2 * 0.35, 0.3) });
      }
    }
  },
};

SCENES.freeze = {
  build(G) {
    const rotor = new THREE.Group(); G.add(rotor);
    const conical = makeTube(0xf0f0f0, { r: 0.3, h: 1.6, content: 0x2f6fb3 }); conical.rotation.z = -0.45; conical.position.set(0.9, 0, 0); rotor.add(conical);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 24), M3.std(0x777777)); rotor.add(hub);
    const vials = [0, 1, 2].map(i => { const v = makeTube([PAL.blue, PAL.yellow, PAL.green][i], { r: 0.13, h: 0.55, content: 0xd9d2c0 }); G.add(v); return v; });
    const rack = new THREE.Group(); G.add(rack);
    const rackVials = [];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 10; k++) { const v = makeTube([PAL.blue, PAL.yellow, PAL.green, PAL.violet][r], { r: 0.11, h: 0.45 }); v.position.set(k * 0.34 - 1.55, 0, r * 0.34 - 0.5); rack.add(v); rackVials.push(v); }
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.06, 1.5), M3.std(0x1a1a1a)); base.position.y = -0.05; rack.add(base);
    const flasks = Array.from({ length: 6 }, () => { const f = makeFlask({ cells: 160 }); f.scale.setScalar(0.55); G.add(f); return f; });
    return { rotor, conical, vials, rack, rackVials, flasks };
  },
  three(t, c, D, O) {
    const t0 = c(0), spinning = t < t0 + 2.6;
    O.rotor.rotation.y = spinning ? (t - t0) * 18 * prog(t, t0, 0.8) : 0;
    O.rotor.position.set(-2.4, 0.2, 0);
    O.conical.rotation.z = spinning ? -0.45 : -0.45 * (1 - prog(t, t0 + 2.6, 0.6));
    const ct = O.conical.userData.content, pellet = prog(t, t0 + 1.2, 1.4), gly = prog(t, t0 + 3.2, 1);
    ct.scale.y = lerp(1, 0.18, pellet) + gly * 0.6; ct.position.y = O.conical.userData.h * 0.225 * ct.scale.y;
    ct.material.color.set(gly > 0.1 ? 0xd9d2c0 : pellet > 0.5 ? 0xe9e4d8 : 0x2f6fb3);
    const split = prog(t, t0 + 4.4, 1.2), store = prog(t, t0 + 6.2, 1.4);
    O.vials.forEach((v, i) => {
      v.visible = split > 0 && store < 0.99;
      const sx = -1.2 + i * 0.45, ex = -1.55 + i * 0.34 + 0.3;
      v.position.set(lerp(lerp(-2.4, sx, split), ex, store), lerp(lerp(-0.3, 0.6, split), -1.6 + 1.2, store) - store * 1.2, lerp(0, 0.52, store));
    });
    const rep = prog(t, c(2), 1.4);
    O.rack.position.set(0.3, -1.6, 0);
    O.rack.visible = rep < 0.98;
    const lift = prog(t, c(1) + 0.5, 1);
    O.rackVials.forEach((v, i) => { const r = Math.floor(i / 10), k = i % 10; v.position.y = (k === 0 || k === 9) && r === 0 ? lift * 1.1 : 0; v.visible = i < 37 + (store > 0.99 ? 3 : 0); });
    O.rotor.visible = t < t0 + 6.8;
    O.flasks.forEach((f, i) => { f.visible = rep > 0.01; f.position.set(-3.2 + i * 1.3, 0.95 + (1 - rep) * 2.5, 0); fillFlask(f, 120, t + i, j => (hash01(j, i) < 0.25 + 0.1 * i ? [PAL.blue, PAL.yellow, PAL.green, PAL.violet, PAL.orange, PAL.red][i] : IVORY), 0.05); });
    Stage.orbit(-0.1, lerp(-0.55 * prog(t, t0 + 5.6, 2), 0.2, rep), 0, 10.5 + rep * 1.5, -6 + t * 0.6, 14 + rep * 4);
  },
  flat(t, c, D, O) {
    const t0 = c(0);
    const [rx, ry] = Stage.projectObj(O.rotor, 0, 1.4, 0);
    const lab = (s, at, until) => text(s, rx, ry - 40, { size: 22, fam: 'mono', color: PAL.dim, align: 'center', alpha: vis(t, at, until, 0.4, 0.4) });
    lab('spin 3 min at 4,000 rpm', t0 + 0.3, t0 + 2.8); lab('pellet + 30% glycerol, 6 mL', t0 + 2.8, t0 + 4.6); lab('split into three 2 mL cryovials', t0 + 4.6, t0 + 6.6);
    const ra0 = vis(t, t0 + 6.4, c(2), 0.6, 0.4);
    const [kx, ky] = Stage.projectObj(O.rack, 1.95, 0.1, 0.6);
    text('−80 °C', kx + 30, ky, { size: 32, alpha: ra0 });
    text('one row per population, one vial per transfer', kx + 30, ky + 36, { size: 20, color: PAL.dim, alpha: ra0 });
    const ra = vis(t, c(1) + 1, c(2), 0.6, 0.4);
    const [ax, ay] = Stage.projectObj(O.rackVials[0], 0, 0.9, 0), [bx, by] = Stage.projectObj(O.rackVials[9], 0, 0.9, 0);
    callout(ax, ay, ax - 30, ay - 110, 'generation 0', { alpha: ra, size: 22 });
    callout(bx, by, bx + 30, by - 110, 'generation 72', { alpha: ra, size: 22 });
    text('thawed, mixed and raced in one flask', (ax + bx) / 2, ay - 170, { size: 24, align: 'center', alpha: ra * prog(t, c(1) + 2, 0.8) });
    const rep = prog(t, c(2), 1.4);
    if (rep > 0) O.flasks.forEach((f, i) => { flaskOutline(f, rep, '#cfcfcf', 1.5); const [x, y] = Stage.projectObj(f, 0, -0.4, 0); text(`pop ${i + 1}`, x, y + 24, { size: 17, fam: 'mono', color: PAL.dim, align: 'center', alpha: rep }); });
    const pa = vis(t, c(2) + 1.4, 1e9, 0.6);
    if (pa > 0) {
      const gx = 560, gy = 640, cw = 80, ch = 26;
      'ABCDEFGHIJ'.split('').forEach((gl, k) => text(`gene ${gl}`, gx + k * cw + cw / 2, gy - 12, { size: 16, fam: 'mono', color: PAL.dim, align: 'center', alpha: pa }));
      for (let p = 0; p < 6; p++) {
        text(`pop ${p + 1}`, gx - 14, gy + p * ch + 18, { size: 15, fam: 'mono', color: PAL.dim, align: 'right', alpha: pa });
        for (let k = 0; k < 10; k++) {
          const hit = k === 3 ? p !== 4 : k === 6 ? p % 2 === 0 : hash01(p, k, 4) < 0.07;
          rect(gx + k * cw + 2, gy + p * ch + 2, cw - 4, ch - 4, hit ? (k === 3 || k === 6 ? PAL.yellow : '#7a7a7a') : '#141414', pa * prog(t, c(2) + 1.6 + p * 0.15, 0.4));
        }
      }
      frame(gx + 3 * cw, gy, cw, 6 * ch, PAL.ink, 2, pa * prog(t, c(2) + 3.2, 0.6));
      text('gene D: hit in 5 of 6 populations', gx + 10 * cw + 30, gy + 70, { size: 24, color: PAL.yellow, alpha: pa * prog(t, c(2) + 3.2, 0.6) });
      note('schematic', gx, gy + 6 * ch + 26, pa);
    }
  },
};

SCENES.compete = {
  build(G) {
    const flasks = [0, 1, 2, 3].map(i => { const f = makeFlask({ cells: 260 }); f.scale.setScalar(0.62); f.position.set(-3.3 + i * 2.2, -0.6, 0); G.add(f); return f; });
    return { flasks };
  },
  three(t, c, D, O) {
    const a = 1 - prog(t, c(1) - 0.3, 0.6);
    O.flasks.forEach((f, i) => {
      const share = [0.5, 0.6, 0.7, 0.78][i], on = prog(t, 0.4 + i * 0.6, 0.6) * a;
      f.visible = on > 0.02;
      fillFlask(f, 240, t + i, j => (hash01(j, 7) < share ? PAL.green : IVORY), 0.05);
    });
    Stage.orbit(0, 0.4, 0, 12.5, Math.sin(t * 0.2) * 4, 8);
  },
  flat(t, c, D, O) {
    const a = 1 - prog(t, c(1) - 0.3, 0.6);
    O.flasks.forEach((f, i) => {
      const on = prog(t, 0.4 + i * 0.6, 0.6) * a; flaskOutline(f, on);
      const [x, y] = Stage.projectObj(f, 0, -0.3, 0), share = [0.5, 0.6, 0.7, 0.78][i];
      text(`cycle ${i}`, x, y + 30, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: on });
      text(`${Math.round(share * 100)}% evolved`, x, y + 62, { size: 22, color: PAL.green, align: 'center', alpha: on });
    });
    const k = vis(t, 1, c(1) - 0.3, 0.6, 0.6);
    dot(1250, 242, 8, PAL.green, k); text('evolved', 1266, 250, { size: 24, alpha: k });
    dot(1410, 242, 8, '#e9e4d8', k); text('marked ancestor', 1426, 250, { size: 24, alpha: k });
    const rA = vis(t, c(1), c(2), 0.6, 0.6);
    if (rA > 0) {
      const P = axes({ x: 200, y: 260, w: 640, h: 440 }, [0, 16], [7.6, 10.3], { xt: [[0, '0 h'], [8, '8'], [16, '16 h']], yt: [[8, pow10(8)], [10, pow10(10)]], yl: 'each strain grown alone' });
      P.draw(rA);
      const up = 16 * prog(t, c(1) + 0.4, 3, ease.lin);
      curve(P, h => Math.min(10.3, RaceModel.logN(RaceModel.X, h)), 0, up, PAL.violet, 3, rA, 0.1);
      curve(P, h => Math.min(10.3, RaceModel.logN(RaceModel.Y, h)), 0, up, PAL.green, 3, rA, 0.1);
      text('X: steeper, but a 4 h lag', 210, 770, { size: 22, color: PAL.violet, alpha: rA });
      text('Y: slower, but a 1 h lag', 210, 805, { size: 22, color: PAL.green, alpha: rA });
      const dep = RaceModel.depletion(), sp = prog(t, c(1) + 3.6, 3, ease.lin) * dep;
      const share = h => { const x = Math.pow(10, RaceModel.logN(RaceModel.X, h)), y = Math.pow(10, RaceModel.logN(RaceModel.Y, h)); return x / (x + y); };
      const Q = axes({ x: 1060, y: 260, w: 680, h: 440 }, [0, dep], [0, 1], { xt: [[0, '0 h'], [dep, `${dep.toFixed(0)} h`]], yt: [[0, '0'], [0.5, '½'], [1, '1']], yl: 'share of one shared flask' });
      Q.draw(rA * prog(t, c(1) + 3.4, 0.6));
      curve(Q, h => share(h), 0, sp, PAL.violet, 3, rA, 0.05);
      curve(Q, h => 1 - share(h), 0, sp, PAL.green, 3, rA, 0.05);
      text('glucose gone', Q.X(dep), Q.box.y - 8, { size: 18, fam: 'mono', color: PAL.dim, align: 'right', alpha: rA * prog(t, c(1) + 6.6, 0.6) });
      text('Y ends the cycle ahead', 1070, 770, { size: 26, color: PAL.green, alpha: rA * prog(t, c(1) + 6.8, 0.6) });
    }
    const sA = vis(t, c(2), 1e9, 0.6);
    if (sA > 0) {
      math('df/dt = f (s − s̄)', 200, 360, { size: 64, alpha: sA });
      text('change in frequency = frequency × (own fitness − mean fitness)', 204, 410, { size: 20, color: PAL.dim, alpha: sA });
      math('s = Δ ln(f_{evo} / f_{anc}) / Δt', 200, 540, { size: 52, color: PAL.yellow, alpha: sA * prog(t, c(2) + 1.5, 0.8) });
      const P = axes({ x: 1100, y: 280, w: 640, h: 420 }, [0, 32], [-0.1, 1.8], { xt: [[0, '0'], [16, '16'], [32, '32 gen']], yt: [[0, '0'], [1, '1']], yl: 'ln(evolved / ancestor)' });
      P.draw(sA);
      const up = 32 * prog(t, c(2) + 0.8, 2.5, ease.lin);
      line(P.X(0), P.Y(0), P.X(up), P.Y(0.05 * up), PAL.yellow, 2.5, sA);
      for (let k = 0; k <= 4; k++) { const x = k * 8; if (x <= up) dot(P.X(x), P.Y(0.05 * x + (hash01(k, 3) - 0.5) * 0.06), 6, PAL.ink, sA); }
      text('slope = s = 0.05 per generation', P.X(32), P.Y(1.75), { size: 22, color: PAL.yellow, align: 'right', alpha: sA * prog(t, c(2) + 3, 0.6) });
    }
  },
};

// the lineage forest: every barcode's trajectory as a line in 3D (generation, frequency, lineage)
function buildForest(G) {
  const lines = LT.lines, ns = LT.NS, pos = [], col = [];
  const X = k => (k * LT.STEP) / 112 * 8 - 4, Y = v => (Math.max(-7.5, v) + 7.5) / 7.5 * 4 - 2;
  const cAd = new THREE.Color(), cN = new THREE.Color(0x5e5e5e);
  for (let k = 0; k < ns - 1; k++) {
    lines.forEach((l, i) => {
      if (l.y[k] < -8.5) return;
      const z = (hash01(i, 77) - 0.5) * 3.2, y1 = Y(l.y[k]), y2 = l.y[k + 1] < -8.5 ? -2 : Y(l.y[k + 1]);
      pos.push(X(k), y1, z, X(k + 1), y2, z);
      if (l.kind === 'adaptive') cAd.set('#' + hslToHex(sHue(l.s), 85, 62)); else cAd.copy(cN);
      col.push(cAd.r, cAd.g, cAd.b, cAd.r, cAd.g, cAd.b);
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const segs = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }));
  G.add(segs);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.6), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; plane.position.y = Y(-2); G.add(plane);
  return { segs, plane, X, Y, total: pos.length / 3 };
}
function forestDrawUpto(F, gen) { const v = Math.floor(F.total * clamp(gen / 112)); F.segs.geometry.setDrawRange(0, v - (v % 2)); }
function forestAxes(F, alpha, o = {}) {
  if (alpha <= 0.002) return;
  const P = (x, y, z) => Stage.project(x, y, z), z0 = 1.7;
  poly([P(-4, -2, z0), P(4, -2, z0)], PAL.line, 1.5, alpha);
  poly([P(-4, -2, z0), P(-4, 2, z0)], PAL.line, 1.5, alpha);
  [[0, '0'], [56, '56'], [112, '112 generations']].forEach(([gv, lab]) => { const [x, y] = P(gv / 112 * 8 - 4, -2, z0); text(lab, x, y + 30, { size: 18, fam: 'mono', color: PAL.dim, align: 'center', alpha }); });
  [[-7, pow10(-7)], [-5, pow10(-5)], [-3, pow10(-3)], [-1, pow10(-1)]].forEach(([v, lab]) => { const [x, y] = P(-4, F.Y(v), z0); text(lab, x - 12, y + 6, { size: 18, fam: 'mono', color: PAL.dim, align: 'right', alpha }); });
  const [lx, ly] = P(-4, 2, z0); text('lineage frequency', lx, ly - 18, { size: 19, color: PAL.dim, alpha });
}
function forestPlane(F, alpha, free = 0) {
  if (alpha <= 0.002) return;
  const P = (x, y, z) => Stage.project(x, y, z), yy = F.Y(-2);
  poly([P(-4, yy, -1.8), P(4, yy, -1.8), P(4, yy, 1.8), P(-4, yy, 1.8), P(-4, yy, -1.8)], PAL.yellow, 2, alpha);
  // label at the plane's near-left corner, where only rare lineages run below it
  // side view: the label sits on the line; once the camera turns it moves to a fixed corner
  const [tx, ty] = P(-4, yy, 1.8);
  text('1%: what whole-population sequencing can see', lerp(tx + 8, 200, free), lerp(ty - 14, 170, free), { size: 22, color: PAL.yellow, alpha });
}

SCENES.limit = {
  build(G) { return buildForest(G); },
  three(t, c, D, F) {
    forestDrawUpto(F, 112 * prog(t, 0.4, 6, ease.io));
    const turn = prog(t, c(1) - 0.5, 4), top = prog(t, c(2), 2.5);
    F.plane.material.opacity = 0.93 * top;
    Stage.orbit(0, 0.1 + top * 0.4, 0, 14.5 + turn * 1.5 + top * 2.5, lerp(0, -38, turn), lerp(2, 18, turn) + top * 26, 30, 0, -50 - turn * 30 - top * 40);
  },
  flat(t, c, D, F) { forestAxes(F, prog(t, 0.6, 0.8) * (1 - prog(t, c(1) - 0.6, 0.8))); forestPlane(F, prog(t, 1.2, 1), prog(t, c(1) - 0.5, 2)); note('simulated lineages', 1600, 900, prog(t, 1, 1)); },
};

SCENES.barcode = {
  build(G) {
    const seq = 'GCTTCAGTACGT' + BC_SEQ + 'ATCGGTACGCTA';
    const hx = makeHelix(seq, { h0: 12, h1: 32, rise: 0.26 }); hx.position.y = 0.9; G.add(hx);
    return { hx, seq };
  },
  three(t, c, D, O) {
    O.hx.rotation.x = t * 0.35;
    const lower = prog(t, c(2) - 0.4, 1.2);
    O.hx.position.y = 0.9 + lower * 0.9; O.hx.scale.setScalar(1 - lower * 0.25);
    Stage.orbit(0, 0.5, 0, 17 - prog(t, 0, 4) * 2, -14 + t * 0.8, 6);
  },
  flat(t, c, D, O) {
    const { hx, seq } = O, n = seq.length, xAt = i => (i - n / 2) * hx.userData.rise;
    const a1 = vis(t, c(1), c(2), 0.6, 0.5);
    // anchors fixed in world space just under the spinning helix
    const sc = hx.scale.x, under = i => Stage.project(xAt(i) * sc, hx.position.y - 1.15 * sc, 0);
    const [l0x, l0y] = under(5), [bx, by] = under(22), [r0x, r0y] = under(38);
    callout(l0x, l0y, l0x - 40, l0y + 90, 'fixed flank', { alpha: a1, color: PAL.dim });
    callout(bx, by, bx + 30, by + 90, '≈ 20 random bases: the barcode', { alpha: a1, color: PAL.yellow });
    callout(r0x, r0y, r0x + 40, r0y + 90, 'fixed flank', { alpha: a1, color: PAL.dim });
    if (a1 > 0) { const [ax, ay] = under(12), [zx] = under(31.6); line(ax, ay + 18, zx, ay + 18, PAL.yellow, 2, a1); }
    const a2 = vis(t, c(1) + 2.5, c(2), 0.6, 0.5);
    const y = 860, x0 = 960 - 430;
    construct(x0, y, [{ w: 300, col: '#5a5a5a', lab: 'URA3 exon' }, { w: 60, col: PAL.yellow, lab: 'loxP', fill: 0.6 }, { w: 200, col: '#000', lab: 'barcode', fill: 0 }, { w: 300, col: '#5a5a5a', lab: 'URA3 exon' }], { alpha: a2 });
    for (let k = 0; k < 20; k++) rect(x0 + 360 + k * 10, y - 15, 9, 30, BASE_COL[BC_SEQ[k]], a2);
    line(x0 + 300, y - 30, x0 + 560, y - 30, PAL.ink, 1.5, a2);
    text('artificial intron: spliced out of the URA3 mRNA', x0 + 430, y - 44, { size: 20, align: 'center', alpha: a2 });
    const a3 = vis(t, c(2), c(3), 0.6, 0.5);
    [['Random', '4²⁰ ≈ 1.1 × 10¹² possible tags'], ['Neutral', 'spliced out, never translated'], ['Inherited', 'copied at every division']].forEach(([h1, s1], i) => {
      const x = 200 + i * 560, a = a3 * prog(t, c(2) + i * 0.6, 0.6);
      text(h1, x, 690, { size: 44, weight: 500, alpha: a });
      text(s1, x, 730, { size: 22, color: PAL.dim, alpha: a });
    });
    const a4 = vis(t, c(3), 1e9, 0.6);
    if (a4 > 0) {
      const P = axes({ x: 260, y: 560, w: 900, h: 260 }, [0, 10], [0, 6], { xt: [[0, 'start'], [10, 'later']], yl: 'barcode count' });
      P.draw(a4);
      const up = 10 * prog(t, c(3) + 0.3, 4, ease.lin);
      for (let k = 0; k < 8; k++) { const mut = k === 5; curve(P, x => 1 + k * 0.12 + 0.15 * Math.sin(x * 1.3 + k) - 0.05 * x + (mut && x > 3 ? Math.pow(x - 3, 1.6) * 0.18 : 0), 0, up, mut ? PAL.yellow : '#8a8a8a', mut ? 3 : 1.5, a4, 0.05); }
      if (up > 3.2) text('a beneficial mutation somewhere in this lineage', P.X(3.3), P.Y(4.6), { size: 22, color: PAL.yellow, alpha: a4 });
    }
  },
};

SCENES.build = {
  textW: 1500,
  build(G) {
    const chrom = new THREE.Group(); G.add(chrom);
    const seg = (w, col) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, w, 32), M3.std(col, { rough: 0.5 })); m.rotation.z = Math.PI / 2; chrom.add(m); return m; };
    const armL = seg(4, 0x3a3a3a), armR = seg(4, 0x3a3a3a);
    const pad = [['GAL › Cre', 1.3, 0x8f6fe0], ['KanMX', 0.7, 0x6f8fb0], ['½ URA3', 1.0, 0x2fb383], ['lox', 0.35, 0xffc845]].map(([lab, w, col]) => ({ lab, w, m: seg(w, col) }));
    const ins = [['barcode', 1.0, null], ['½ URA3', 1.0, 0x2fb383], ['HygMX', 0.85, 0x6f8fb0], ['lox66/71', 0.35, 0xff9b40]].map(([lab, w, col]) => {
      if (!col) { const grp = new THREE.Group(); for (let k = 0; k < 20; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 24), M3.std(BASE_COL[BC_SEQ[k]])); m.rotation.z = Math.PI / 2; grp.add(m); } chrom.add(grp); return { lab, w, m: grp, bar: true }; }
      return { lab, w, m: seg(w, col) };
    });
    const plasmid = new THREE.Group(); G.add(plasmid);
    [[0, 0.25, 0xffc845], [0.25, 1.25, 'bc'], [1.25, 3.0, 0x2fb383], [3.0, 5.0, 0x6f8fb0], [5.0, TAU, 0x555555]].forEach(([a0, a1, col]) => {
      if (col === 'bc') { for (let k = 0; k < 20; k++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 12, 8, (a1 - a0) / 20), M3.std(BASE_COL[BC_SEQ[k]])); m.rotation.z = a0 + k * (a1 - a0) / 20; plasmid.add(m); } return; }
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 12, 48, a1 - a0), M3.std(col)); m.rotation.z = a0; plasmid.add(m);
    });
    const cre = makeCells(4, { seg: 16 }); G.add(cre);
    const dish = makeDish(1.3, { colonies: 60, agar: 0x8f8470 }); dish.position.set(3.7, 1.75, -1); G.add(dish);
    return { chrom, armL, armR, pad, ins, plasmid, cre, dish };
  },
  three(t, c, D, O) {
    const integ = prog(t, c(1) + 6.2, 2.4), padIn = prog(t, c(0) + 0.5, 2.5, ease.lin);
    const parts = [...O.pad.map((p, i) => ({ ...p, s: clamp(padIn * 4 - i) })), ...O.ins.map(p => ({ ...p, s: integ }))];
    const total = parts.reduce((s, p) => s + p.w * p.s, 0);
    let x = -total / 2;
    O.armL.position.x = x - 2;
    parts.forEach(p => {
      const w = p.w * p.s; p.m.visible = p.s > 0.01;
      if (p.bar) p.m.children.forEach((m, k) => { m.position.set(x + (k + 0.5) * w / 20, 0, 0); m.scale.set(1, Math.max(0.01, p.s), 1); });
      else { p.m.position.set(x + w / 2, 0, 0); p.m.scale.set(1, Math.max(0.001, p.s), 1); }
      p.x = x; x += w;
    });
    O.armR.position.x = x + 2;
    O.parts = parts;
    const pl = prog(t, c(1), 1), fly = prog(t, c(1) + 4.2, 2);
    O.plasmid.visible = pl > 0 && integ < 0.98;
    O.plasmid.position.set(lerp(3.2, O.pad[3].m.position.x + 0.3, fly), lerp(2.4, 0, fly), 0);
    O.plasmid.scale.setScalar(Math.max(0.001, lerp(1, 0.15, fly) * pl)); O.plasmid.rotation.set(0.4 + t * 0.3, t * 0.4, 0);
    const cr = vis(t, c(1) + 3, c(2) + 0.5, 0.6, 0.6);
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + t * 1.8, rr = 0.55 - 0.25 * integ; setCell(O.cre, k, O.pad[3].m.position.x + Math.cos(an) * rr, 0.55 + Math.sin(an) * rr * 0.4, Math.sin(an) * rr, 0.16, 0xb28cff, 1); }
    doneCells(O.cre, cr > 0.05 ? 4 : 0);
    const dp = vis(t, c(2) + 0.6, c(3), 0.8, 0.6), gr = prog(t, c(2) + 1.2, 2);
    O.dish.visible = dp > 0.01;
    for (let i = 0; i < 60; i++) { const r = 1.15 * Math.sqrt(hash01(i, 1)), an = hash01(i, 2) * TAU, ok = hash01(i, 3) < 0.6; setColony(O.dish, i, Math.cos(an) * r, Math.sin(an) * r, (ok ? 0.06 + 0.05 * gr : 0.06 * (1 - gr)) + 0.001, ok ? 0xe8dcc0 : 0x6a6a6a); }
    doneCells(O.dish.userData.colonies, 60);
    const away = prog(t, c(3) - 0.2, 1);
    O.chrom.visible = away < 0.99; O.dish.visible = O.dish.visible && away < 0.99;
    Stage.orbit(0.6, 0.3, 0, 12.5, -4 + t * 0.4, 12);
  },
  flat(t, c, D, O) {
    const away = 1 - prog(t, c(3) - 0.2, 1);
    if (O.parts && away > 0.01) {
      O.parts.forEach((p, i) => {
        if (p.s < 0.5 || p.w * p.s < 0.3) return;
        const [x, y] = Stage.project(p.x + p.w * p.s / 2, 0.42, 0);
        text(p.lab, x, y - 10 - (i % 2) * 26, { size: 19, fam: 'mono', align: 'center', alpha: away * clamp(p.s * 2 - 1) });
      });
      const [, ly] = Stage.project(0, -0.5, 0);
      text('chromosome II, landing pad at YBR209W', 200, ly + 40, { size: 20, color: PAL.dim, alpha: away * prog(t, 1, 1) });
      const [px, py] = Stage.projectObj(O.plasmid, 0, 1.3, 0);
      text('pBar3: barcode + other half of URA3', px, py - 20, { size: 20, color: PAL.dim, align: 'center', alpha: away * vis(t, c(1) + 0.6, c(1) + 4.2, 0.6, 0.6) });
      text('+ galactose: Cre is made', 200, 300, { size: 26, color: PAL.violet, alpha: vis(t, c(1) + 3, c(2), 0.6, 0.6) });
      dishOutline(O.dish, vis(t, c(2) + 0.6, c(3), 0.8, 0.6) * away);
      const [dx, dy] = Stage.projectObj(O.dish, 0, 0, 1.5);
      text('plate without uracil', dx, dy + 40, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: vis(t, c(2) + 0.6, c(3), 0.8, 0.6) });
      text('one-way: Cre barely recognises lox66/71', 200, 300, { size: 26, color: PAL.orange, alpha: vis(t, c(2) + 3, c(3), 0.6, 0.6) });
    }
    const tA = vis(t, c(3), 1e9, 0.6);
    if (tA > 0) {
      const monster = k => [1, 4, 6, 9, 11, 13, 16, 18, 20, 23].includes(k);
      text('barcode frequencies within each of 24 transformations, ranked', 220, 260, { size: 20, fam: 'mono', color: PAL.dim, alpha: tA });
      for (let k = 0; k < 24; k++) {
        const col = k % 8, row = Math.floor(k / 8), x = 220 + col * 190, y = 290 + row * 150, a = tA * prog(t, c(3) + 0.3 + k * 0.05, 0.4);
        const bad = monster(k), drop = bad ? prog(t, c(4), 0.8) : 0;
        const pts = [];
        for (let i = 0; i <= 40; i++) pts.push([x + i * 3.6, y + 90 - 70 * Math.exp(-i / (6 + 3 * hash01(k, 1))) * (0.6 + 0.4 * hash01(k, 2))]);
        poly(pts, '#9a9a9a', 1.5, a * (1 - 0.75 * drop));
        if (bad) { line(x + 1, y + 2, x + 1, y + 90, PAL.red, 3, a); text('> 1%', x + 8, y + 14, { size: 15, fam: 'mono', color: PAL.red, alpha: a }); }
        line(x, y + 90, x + 150, y + 90, PAL.faint, 1, a);
        text(`T${k + 1}`, x, y + 114, { size: 15, fam: 'mono', color: bad ? PAL.red : PAL.dim, alpha: a * (1 - 0.6 * drop) });
      }
      text('14 kept and pooled: ≈ 300,000 barcodes', 1760, 790, { size: 30, align: 'right', alpha: tA * prog(t, c(4) + 1, 0.8) });
      note('schematic', 220, 800, tA);
    }
  },
};
