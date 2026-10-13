// ───────────────────────────── chapters: intro → serial transfer ─────────────────────────────
const IVORY = 0xe9e4d8;

// cell i of a growing ball: a random direction, and a radius that grows as the cube root of i,
// so later cells sit further out and the population stays round as it doubles
function shellPoint(i, spacing = 0.3) {
  const y = 1 - 2 * hash01(i, 71), th = TAU * hash01(i, 72), rr = Math.sqrt(1 - y * y);
  const r = spacing * Math.cbrt(i + 0.5) * (0.9 + 0.2 * hash01(i, 73));
  return [r * rr * Math.cos(th), r * y, r * rr * Math.sin(th)];
}

SCENES.intro = {
  textX: 120,
  build(G) { const cells = makeCells(720, { seg: 16 }); G.add(cells); return { cells }; },
  three(t, c, D, O) {
    const t1 = c(1), g1 = prog(t, t1 + 0.2, 4.2), rw = prog(t, t1 + 4.8, 1.3), g2 = prog(t, t1 + 6.3, 4.5);
    let k, take = 1;
    if (t < t1 + 4.8) k = g1 * 9.5; else if (t < t1 + 6.1) k = (1 - rw) * g1 * 9.5; else { k = g2 * 9.5; take = 2; }
    const n = Math.min(720, Math.floor(Math.pow(2, k)));
    const share1 = clamp((g1 - 0.45) / 0.55) * 0.8 * (t < t1 + 4.8 ? 1 : 1 - rw);
    const share2 = clamp((g2 - 0.45) / 0.55) * 0.75;
    const breathe = 1 + 0.03 * Math.sin(t * 1.6);
    if (n <= 1) {
      setCell(O.cells, 0, 0, 0, 0, 0.42 * breathe, IVORY);
      const bud = 0.1 + 0.08 * (0.5 + 0.5 * Math.sin(t * 0.9));
      setCell(O.cells, 1, 0.41, 0.22, 0.07, bud, IVORY);
      doneCells(O.cells, 2);
    } else {
      for (let i = 0; i < n; i++) {
        const [x, y, z] = shellPoint(i);
        let col = IVORY;
        if (take === 1 && hash01(i, 5) < share1) col = PAL.yellow;
        if (take === 2 && hash01(i, 6) < share2) col = PAL.blue;
        setCell(O.cells, i, x, y, z, 0.2 * clamp(k - Math.log2(i + 1) + 1, 0.2, 1), col);
      }
      doneCells(O.cells, n);
    }
    const pan = prog(t, c(2) + 1.5, 3) * 470;
    const dist = lerp(6, 13, prog(t, t1, 6)) + prog(t, c(2), 6) * 5;
    Stage.orbit(0, 0, 0, dist, 25 + t * 4, 14, 30, pan, -prog(t, c(2) + 1.5, 3) * 40);
  },
  flat(t, c, D) {
    // a quiet playhead: which take of history we are watching
    const t1 = c(1), a = vis(t, t1 + 0.4, c(2) + 1, 0.6, 0.8);
    if (a > 0) {
      const x0 = 1340, x1 = 1800, y = 150;
      let p, lab;
      if (t < t1 + 4.8) { p = prog(t, t1 + 0.2, 4.2, ease.lin); lab = 'take 1'; }
      else if (t < t1 + 6.1) { p = 1 - prog(t, t1 + 4.8, 1.3); lab = 'rewind'; }
      else { p = prog(t, t1 + 6.3, 4.5, ease.lin); lab = 'take 2'; }
      line(x0, y, x1, y, PAL.faint, 2, a);
      line(x0, y, lerp(x0, x1, p), y, PAL.ink, 2, a);
      dot(lerp(x0, x1, p), y, 5, PAL.ink, a);
      text(lab, x0, y - 18, { size: 18, fam: 'mono', color: lab === 'rewind' ? PAL.yellow : PAL.dim, alpha: a });
      text(`generation ${Math.round(p * 200)}`, x1, y - 18, { size: 18, fam: 'mono', color: PAL.dim, align: 'right', alpha: a });
    }
    const ta = vis(t, c(2) + 3, D - 0.4, 1.2, 0.8);
    text('Evolution,', 120, 420, { size: 104, weight: 500, alpha: ta, track: -2 });
    text('Barcoded', 120, 530, { size: 104, weight: 500, alpha: ta * prog(t, c(2) + 3.5, 1), track: -2 });
    text('the method of experimental evolution, from one clone to whole genomes', 124, 600, { size: 24, color: PAL.dim, alpha: ta * prog(t, c(2) + 4.2, 1) });
  },
};

// a random 3D tree; survivors reach the top layer, others stop early
const TREE3 = (() => {
  const r = rng(31), segs = [];
  (function grow(p, dir, d) {
    const len = 1.15 - d * 0.09, q = p.clone().add(dir.clone().multiplyScalar(len));
    const dies = d > 1 && r() < 0.3;
    segs.push({ p, q, d, dies, tip: dies || d === 6 });
    if (dies || d === 6) return;
    for (let k = 0; k < 2; k++) {
      const az = r() * TAU, tilt = 0.35 + r() * 0.25;
      const nd = dir.clone().applyAxisAngle(new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), tilt).normalize();
      grow(q, nd, d + 1);
    }
  })(new THREE.Vector3(0, -3.2, 0), new THREE.Vector3(0, 1, 0), 0);
  // a segment is "alive" if some descendant reaches the top layer
  const alive = new Set();
  segs.forEach((s, i) => { if (s.d === 6 && !s.dies) alive.add(i); });
  for (let pass = 0; pass < 8; pass++) segs.forEach((s, i) => { if (segs.some((u, j) => alive.has(j) && u.p.distanceTo(s.q) < 1e-6 && u.d === s.d + 1)) alive.add(i); });
  segs.forEach((s, i) => (s.alive = alive.has(i)));
  return segs;
})();

SCENES.why = {
  textX: 120,
  build(G) {
    const geo = new THREE.CylinderGeometry(0.035, 0.045, 1, 8);
    const live = new THREE.InstancedMesh(geo, M3.std(0xededed, { rough: 0.5 }), TREE3.length);
    const dead = new THREE.InstancedMesh(geo, M3.std(0x777777, { rough: 0.6, fade: true }), TREE3.length);
    const tips = makeCells(64, { seg: 14 });
    G.add(live, dead, tips);
    return { live, dead, tips };
  },
  three(t, c, D, O) {
    const depth = prog(t, 0.3, 4.5, ease.lin) * 7.2;
    let nl = 0, nd = 0, nt = 0;
    const up = new THREE.Vector3(0, 1, 0);
    for (const s of TREE3) {
      const f = clamp(depth - s.d);
      if (f <= 0) continue;
      const dir = s.q.clone().sub(s.p), len = dir.length() * f;
      _o.position.copy(s.p).add(dir.clone().multiplyScalar(f / 2));
      _o.quaternion.setFromUnitVectors(up, dir.normalize()); _o.scale.set(1, len, 1); _o.updateMatrix();
      if (s.alive) O.live.setMatrixAt(nl++, _o.matrix); else O.dead.setMatrixAt(nd++, _o.matrix);
      if (s.tip && f >= 1 && s.alive) setCell(O.tips, nt++, s.q.x, s.q.y, s.q.z, 0.16, PAL.yellow);
    }
    O.live.count = nl; O.dead.count = nd; O.live.instanceMatrix.needsUpdate = O.dead.instanceMatrix.needsUpdate = true; doneCells(O.tips, nt);
    O.dead.material.opacity = 1 - 0.85 * prog(t, 4.5, 2);
    const pan = prog(t, c(1), 2) * -460;
    Stage.orbit(0, 0.2, 0, 17, t * 9, 8, 30, pan, -40);
  },
  flat(t, c, D) {
    const a0 = vis(t, 4.5, c(1) + 0.4, 0.8, 0.6);
    text('survivors', 1500, 330, { size: 22, color: PAL.yellow, alpha: a0 });
    text('lineages that died out leave no trace', 1500, 362, { size: 22, color: PAL.dim, alpha: a0 * prog(t, 5.5, 0.8) });
    const ideas = [['Control', c(1)], ['Replication', c(2)], ['Time travel', c(3)], ['Scale', c(4)]];
    ideas.forEach(([w, at], i) => {
      const a = vis(t, at, 1e9, 0.6), cur = t >= at && (i === 3 || t < ideas[i + 1][1]);
      const y = 300 + i * 120, dx = (1 - ease.out(clamp((t - at) / 0.7))) * 20;
      text(String(i + 1), 1080 + dx, y, { size: 22, fam: 'mono', color: PAL.dim, alpha: a });
      text(w, 1130 + dx, y + 4, { size: 58, weight: 500, color: cur ? PAL.ink : '#6a6a6a', alpha: a, track: -1 });
    });
  },
};

SCENES.recipe = {
  flat(t, c, D) {
    const xs = i => 210 + i * 214, y = 470;
    const ext = prog(t, c(1) + 0.4, 1);
    line(xs(0), y - 70, xs(5), y - 70, PAL.faint, 2, prog(t, 0.6, 2));
    line(xs(5), y - 70, xs(7), y - 70, PAL.faint, 2, ext, [6, 6]);
    PROTOCOL.forEach((st, i) => {
      const a = st.ext ? ext : prog(t, 0.6 + i * 0.3, 0.6), x = xs(i);
      const col = st.ext ? PAL.yellow : PAL.ink;
      dot(x, y - 70, 6, col, a);
      math(String(i + 1), x, y + 10, { size: 64, color: col, alpha: a, align: 'center' });
      text(st.label, x, y + 62, { size: 24, weight: 500, color: col, alpha: a, align: 'center' });
      text(st.what, x, y + 100, { size: 18, color: PAL.dim, alpha: a, align: 'center', maxW: 190 });
    });
    text('the classic experiment', (xs(0) + xs(5)) / 2, y - 110, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: prog(t, 1, 1) });
    text('barcoding', (xs(6) + xs(7)) / 2, y - 110, { size: 20, fam: 'mono', color: PAL.yellow, align: 'center', alpha: ext });
  },
};

// ── Step 1 · one clone
const STREAK3 = (() => {
  const passes = [[], [], []];
  for (let i = 0; i <= 9; i++) passes[0].push([-1.35 + (i % 2) * 0.75, -1.25 + i * 0.09]);
  for (let i = 0; i <= 9; i++) passes[1].push([-0.55 + i * 0.13, -0.45 + (i % 2 ? 0.32 : -0.05) + i * 0.02]);
  for (let i = 0; i <= 7; i++) passes[2].push([0.75 - i * 0.05 + (i % 2) * 0.45, 0.0 + i * 0.19]);
  const r = rng(12), colonies = [];
  [[70, 0.07], [26, 0.05], [9, 0.04]].forEach(([n, spread], pi) => {
    const P = passes[pi];
    for (let k = 0; k < n; k++) {
      const u = r() * (P.length - 1), i = Math.floor(u), f = u - i, [x1, z1] = P[i], [x2, z2] = P[Math.min(i + 1, P.length - 1)];
      colonies.push({ x: lerp(x1, x2, f) + gauss(r) * spread, z: lerp(z1, z2, f) + gauss(r) * spread, r: pi === 2 ? 0.075 : 0.045 + r() * 0.02, pass: pi, u: u / (P.length - 1) });
    }
  });
  return { passes, colonies };
})();

function genomeRow(x, y, w, alpha, marks = []) {
  for (let k = 0; k < 20; k++) rect(x + k * w / 20, y, w / 20 - 3, 14, k % 2 ? '#5d5d5d' : '#484848', alpha);
  for (const [pos, col] of marks) rect(x + pos * w - 3, y - 7, 6, 28, col, alpha);
}

SCENES.clone = {
  build(G) {
    const dish = makeDish(2.0, { colonies: 140, agar: 0x8f8470 }); G.add(dish);
    const streaks = STREAK3.passes.map(P => {
      const curve = new THREE.CatmullRomCurve3(P.map(([x, z]) => new THREE.Vector3(x, 0.13, z)), false, 'catmullrom', 0.1);
      const geo = new THREE.TubeGeometry(curve, P.length * 16, 0.012, 6, false);
      const m = new THREE.Mesh(geo, M3.std(0xcfc6b0, { opacity: 0.6 })); dish.add(m); return m;
    });
    return { dish, streaks };
  },
  three(t, c, D, O) {
    const draw = prog(t, c(0) + 0.4, 3.6, ease.lin) * 3;
    O.streaks.forEach((m, i) => m.geometry.setDrawRange(0, Math.floor(clamp(draw - i) * m.geometry.index.count / 6) * 6));
    const grow = prog(t, c(0) + 4.2, 1.8);
    const pick = STREAK3.colonies.filter(cl => cl.pass === 2)[4];
    const lift = prog(t, c(0) + 6.6, 1.4);
    STREAK3.colonies.forEach((cl, i) => {
      const isPick = cl === pick, sz = cl.r * grow * (isPick ? 1 + 0.3 * lift : 1);
      setCell(O.dish.userData.colonies, i, cl.x, 0.12 + sz * 0.25 + (isPick ? lift * 0.6 : 0), cl.z, Math.max(0.001, sz), isPick && lift > 0 ? PAL.yellow : 0xe8dcc0, 0.4);
    });
    doneCells(O.dish.userData.colonies, STREAK3.colonies.length);
    Stage.orbit(0, 0, 0.1, 10, -18 + t * 1.2, 58, 30, -470);
    O.pick = pick;
  },
  flat(t, c, D, O) {
    dishOutline(O.dish, 0.9);
    const pk = O.pick ? Stage.projectObj(O.dish, O.pick.x, 0.2 + prog(t, c(0) + 6.6, 1.4) * 0.6, O.pick.z) : null;
    const pa = vis(t, c(0) + 6.8, c(1) + 1, 0.6, 0.8);
    if (pk) callout(pk[0], pk[1], pk[0] + 120, pk[1] - 90, 'one colony = one cell’s descendants', { alpha: pa, size: 22 });
    const X = 1080, Wd = 600;
    // identical genomes; then a new mutation
    const a1 = vis(t, c(1), c(3), 0.6, 0.6);
    text('8 cells from the picked colony', X, 270, { size: 20, fam: 'mono', color: PAL.dim, alpha: a1 });
    const mut = prog(t, c(1) + 2.8, 0.8);
    for (let i = 0; i < 8; i++) genomeRow(X, 300 + i * 34, Wd, a1, i === 5 && mut > 0 ? [[0.62, PAL.yellow]] : []);
    text('new mutation', X + Wd + 18, 300 + 5 * 34 + 13, { size: 18, color: PAL.yellow, alpha: a1 * mut });
    // the mixed start
    const a2 = vis(t, c(2), c(3), 0.6, 0.6);
    text('if the start were not one clone', X, 610, { size: 20, fam: 'mono', color: PAL.dim, alpha: a2 });
    const variants = [null, PAL.blue, null, PAL.violet, null, PAL.blue, PAL.orange, null];
    for (let i = 0; i < 8; i++) genomeRow(X, 640 + i * 34, Wd, a2, variants[i] ? [[[0.2, 0.47, 0.8][i % 3], variants[i]]] : []);
    text('variants already present', X + Wd + 18, 653, { size: 18, color: PAL.dim, alpha: a2 });
    // the reference genome
    const a3 = vis(t, c(3), 1e9, 0.6);
    if (a3 > 0) {
      const ref = 'ATGGCTTCAGTAGCAATTGCCACGTTAG', evo = ref.slice(0, 15) + 'T' + ref.slice(16);
      text('ancestor (reference)', X, 330, { size: 20, fam: 'mono', color: PAL.dim, alpha: a3 });
      text('evolved clone', X, 470, { size: 20, fam: 'mono', color: PAL.dim, alpha: a3 });
      for (let i = 0; i < ref.length; i++) {
        baseBox(ref[i], X + 14 + i * 24, 375, 21, { alpha: a3 * prog(t, c(3) + i * 0.02, 0.4), dim: true });
        const diff = evo[i] !== ref[i];
        baseBox(evo[i], X + 14 + i * 24, 515, 21, { alpha: a3 * prog(t, c(3) + 0.8 + i * 0.02, 0.4), dim: !diff, hi: diff });
      }
      const mx = X + 14 + 15 * 24;
      line(mx, 400, mx, 490, PAL.yellow, 2, a3 * prog(t, c(3) + 2, 0.6), [4, 4]);
      text('the only difference: the mutation', mx, 580, { size: 22, color: PAL.yellow, align: 'center', alpha: a3 * prog(t, c(3) + 2.2, 0.6) });
    }
  },
};

// ── Step 2 · the medium
const NUTRIENTS = [['glucose', PAL.yellow, 1.0], ['ammonium sulfate', PAL.blue, 0.4], ['potassium phosphate', PAL.blue, 0.3], ['magnesium sulfate', PAL.blue, 0.25], ['trace metals, vitamins', PAL.blue, 0.2]];
SCENES.medium = {
  build(G) {
    const flask = makeFlask({ cells: 320 }); flask.position.set(0, -1.15, 0); G.add(flask);
    const mol = makeCells(220, { seg: 8 }); flask.add(mol);
    return { flask, mol };
  },
  three(t, c, D, O) {
    const h = 48 * prog(t, c(0) + 0.6, 7, ease.lin), bc = batchCulture(h), used = 1 - bc.glucose;
    const n = Math.floor(lerp(12, 320, inv(7.7, 10.1, bc.logN)));
    const shake = prog(t, c(3), 1) * 0.06;
    O.flask.position.x = Math.cos(t * 9) * shake; O.flask.position.z = Math.sin(t * 9) * shake;
    fillFlask(O.flask, n, t, () => IVORY, 0.034);
    let k = 0;
    for (let i = 0; i < 220; i++) {
      const isG = i < 60, gone = isG ? hash01(i, 8) < used : hash01(i, 9) < used * 0.25;
      if (gone) continue;
      const y = 0.08 + hash01(i, 2) * 0.8, r = (flaskRadiusAt(y) - 0.12) * Math.sqrt(hash01(i, 3)), th = hash01(i, 1) * TAU + t * 0.2;
      setCell(O.mol, k++, Math.cos(th) * r, y, Math.sin(th) * r, 0.025, isG ? PAL.yellow : PAL.blue, 1);
    }
    doneCells(O.mol, k);
    Stage.orbit(0, 0.1, 0, 8.6, -12 + t * 2, 10, 30, -470);
    O.h = h; O.used = used;
  },
  flat(t, c, D, O) {
    flaskOutline(O.flask, 1);
    // nutrients remaining over one 48 h cycle
    const a0 = vis(t, c(0) + 0.4, c(1), 0.6, 0.6), X = 1060;
    text(`hour ${Math.round(O.h || 0)} of 48 · nutrient remaining`, X, 280, { size: 20, fam: 'mono', color: PAL.dim, alpha: a0 });
    NUTRIENTS.forEach(([name, col, use], i) => {
      const y = 320 + i * 70, left = 1 - (O.used || 0) * use;
      rect(X, y, 600, 22, '#1d1d1d', a0); rect(X, y, 600 * left, 22, col, a0 * 0.9);
      text(name, X, y + 50, { size: 19, color: PAL.dim, alpha: a0 });
    });
    text('glucose runs out first: it limits growth', X, 700, { size: 24, color: PAL.yellow, alpha: a0 * clamp((O.h - 17) / 3) });
    // a defined recipe
    const a1 = vis(t, c(1), c(2), 0.6, 0.6);
    const recipe = [['glucose', '1.5%'], ['ammonium sulfate', 'nitrogen'], ['potassium phosphate', 'phosphorus'], ['magnesium sulfate', ''], ['trace metals', ''], ['vitamins', '']];
    text('M3, every ingredient weighed', X, 280, { size: 20, fam: 'mono', color: PAL.dim, alpha: a1 });
    recipe.forEach(([nm, note2], i) => { text(nm, X, 340 + i * 52, { size: 28, color: i === 0 ? PAL.yellow : PAL.ink, alpha: a1 * prog(t, c(1) + i * 0.15, 0.4) }); text(note2, X + 420, 340 + i * 52, { size: 20, fam: 'mono', color: PAL.dim, alpha: a1 * prog(t, c(1) + i * 0.15, 0.4) }); });
    // no uracil: only cells with the construct grow
    const a2 = vis(t, c(2), c(3), 0.6, 0.6);
    if (a2 > 0) {
      text('medium without uracil', X, 280, { size: 20, fam: 'mono', color: PAL.dim, alpha: a2 });
      const g2 = prog(t, c(2) + 1, 3);
      [[true, 'URA3 intact (barcode construct kept)'], [false, 'construct lost']].forEach(([ok, lab], i) => {
        const y = 380 + i * 200, n = ok ? Math.floor(1 + g2 * 15) : 1;
        for (let k = 0; k < n; k++) ring(X + 40 + (k % 8) * 34, y + Math.floor(k / 8) * 34, 13, ok ? PAL.ink : '#555', 2, a2);
        text(lab, X + 340, y + 8, { size: 22, color: ok ? PAL.ink : PAL.dim, alpha: a2 });
        text(ok ? 'grows' : 'cannot grow', X + 340, y + 40, { size: 20, fam: 'mono', color: ok ? PAL.green : PAL.red, alpha: a2 * g2 });
      });
    }
    // conditions are part of the environment
    const a3 = vis(t, c(3), 1e9, 0.6);
    if (a3 > 0) {
      const p = (lx, ly, lz) => Stage.projectObj(O.flask, lx, ly, lz);
      const [lx, ly] = p(0.9, 0.5, 0), [nx, ny] = p(0.33, 2.2, 0), [bx, by] = p(1.1, 0.05, 0);
      callout(lx, ly, X, 420, '100 mL M3 medium', { alpha: a3 * prog(t, c(3) + 0.2, 0.5), size: 26 });
      callout(nx, ny, X, 330, '500 mL flask', { alpha: a3 * prog(t, c(3) + 0.6, 0.5), size: 26 });
      callout(bx, by, X, 520, '30 °C, shaken at ~200 rpm', { alpha: a3 * prog(t, c(3) + 1.0, 0.5), size: 26 });
      text('48 h per cycle', X, 610, { size: 26, alpha: a3 * prog(t, c(3) + 1.4, 0.5) });
    }
  },
};

// ── Step 3 · serial transfer
SCENES.transfer = {
  build(G) {
    const A = makeFlask({ cells: 420 }); A.position.set(-1.35, -1.2, 0);
    const B = makeFlask({ cells: 420 }); B.position.set(1.35, -1.2, 0);
    const pip = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 16), M3.std(0xdedede, { rough: 0.3 })); body.position.y = 1.3;
    const tipM = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 16), M3.std(0xdedede, { rough: 0.3 })); tipM.rotation.x = Math.PI; tipM.position.y = 0;
    const load = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 12), M3.std(0x2f6fb3, { opacity: 0.8 })); load.position.y = 0.45;
    pip.add(body, tipM, load); G.add(A, B, pip);
    return { A, B, pip, load };
  },
  three(t, c, D, O) {
    const h = 48 * prog(t, c(0) + 0.3, Math.max(3, c(1) - c(0) - 0.5), ease.lin), bc = batchCulture(h);
    const nA = Math.floor(lerp(14, 420, inv(7.7, 10.1, bc.logN)));
    fillFlask(O.A, nA, t, () => IVORY, 0.032);
    const x = prog(t, c(1) + 0.3, 3.4, ease.lin);
    const px = x < 0.35 ? -1.35 : x < 0.7 ? lerp(-1.35, 1.35, ease.io((x - 0.35) / 0.35)) : 1.35;
    const dip = x < 0.35 ? Math.sin(x / 0.35 * Math.PI) : x > 0.7 ? Math.sin((x - 0.7) / 0.3 * Math.PI) : 0;
    O.pip.position.set(px, 2.2 - dip * 2.1, 0);
    O.pip.visible = t > c(1) && t < c(1) + 4.2;
    O.load.visible = x > 0.3 && x < 0.85;
    const dbl = prog(t, c(2) + 1.2, 5, ease.lin) * 8;
    const nB = t < c(1) + 3 ? 0 : Math.min(420, Math.floor(3 * Math.pow(2, dbl) / 1.6));
    O.B.visible = t > c(1) - 0.2;
    fillFlask(O.B, Math.max(nB, t > c(1) + 3 ? 3 : 0), t, () => IVORY, 0.032);
    Stage.orbit(0, 0.2, 0, 12, -8 + t * 0.8, 9, 30, -440);
    O.h = h; O.dbl = dbl;
  },
  flat(t, c, D, O) {
    flaskOutline(O.A, 1);
    if (t > c(1) - 0.2) flaskOutline(O.B, prog(t, c(1) - 0.2, 0.5));
    const [ax, ay] = Stage.projectObj(O.A, 0, -0.25, 0), [bx, by] = Stage.projectObj(O.B, 0, -0.25, 0);
    text('100 mL culture', ax, ay + 40, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: prog(t, 0.6, 0.6) });
    text('fresh medium', bx, by + 40, { size: 20, fam: 'mono', color: PAL.dim, align: 'center', alpha: prog(t, c(1), 0.6) });
    const P = axes({ x: 1150, y: 300, w: 640, h: 340 }, [0, 48], [7.5, 10.4], { xt: [[0, '0 h'], [24, '24'], [48, '48 h']], yt: [[8, pow10(8)], [9, pow10(9)], [10, pow10(10)]], yl: 'cells per flask' });
    const gA = vis(t, 0.4, c(2), 0.6, 0.6);
    if (gA > 0) {
      P.draw(gA);
      const h = O.h || 0;
      // growth phases, labelled under the axis so they never meet the curves
      [[3, 'fermentation'], [18, 'shift'], [22, 'respiration · stationary']].forEach(([a, lab], i) => {
        if (h < a) return;
        line(P.X(a), P.box.y + P.box.h, P.X(a), P.box.y, '#262626', 1.5, gA);
        text(lab, P.X(a) + 6, P.box.y + P.box.h - 12 - (i === 1 ? 24 : 0), { size: 16, fam: 'mono', color: '#7a7a7a', alpha: gA * clamp((h - a) / 2) });
      });
      curve(P, x => lerp(7.5, 10.4, batchCulture(x).glucose * 0.94), 0, h, PAL.yellow, 2, gA, 0.25, [6, 6]);
      curve(P, x => batchCulture(x).logN, 0, h, PAL.ink, 3, gA, 0.25);
      text('cells', P.X(48) - 90, P.box.y - 18, { size: 18, color: PAL.ink, align: 'right', alpha: gA });
      text('glucose', P.X(48), P.box.y - 18, { size: 18, color: PAL.yellow, align: 'right', alpha: gA });
    }
    const dA = vis(t, c(1) + 0.8, c(2), 0.5, 0.6);
    text('400 µL of 100 mL  =  1 : 250', (ax + bx) / 2, 230, { size: 34, align: 'center', alpha: dA });
    // eight doublings
    const qA = vis(t, c(2), c(3), 0.6, 0.6);
    if (qA > 0) {
      math('250 ≈ 2^8', 1150, 300, { size: 54, alpha: qA });
      const k = Math.floor(O.dbl || 0);
      for (let d = 0; d <= 8; d++) {
        const n = 1 << d, cols = Math.ceil(Math.sqrt(n)), cs = 7, x0 = 1150 + d * 72;
        const a = qA * (d <= k ? 1 : 0.18);
        for (let i = 0; i < n; i++) rect(x0 + (i % cols) * cs, 560 - Math.floor(i / cols) * cs, cs - 2, cs - 2, d === 8 ? PAL.yellow : PAL.ink, a);
        text(String(n), x0 + 4, 600, { size: 16, fam: 'mono', color: PAL.dim, alpha: a });
      }
      text('doublings to refill the flask', 1150, 650, { size: 20, color: PAL.dim, alpha: qA });
    }
    // feast and famine, cycle after cycle
    const sA = vis(t, c(3), 1e9, 0.6);
    if (sA > 0) {
      const S = axes({ x: 1150, y: 300, w: 640, h: 340 }, [0, 10], [7.5, 10.4], { xt: [[0, 'day 0'], [4, '4'], [8, '8'], [10, '10']], yt: [[8, pow10(8)], [10, pow10(10)]], yl: 'cells per flask' });
      S.draw(sA);
      const up = 10 * prog(t, c(3) + 0.3, 4, ease.lin);
      for (let k2 = 0; k2 < 5; k2++) { const x0 = 2 * k2; if (x0 > up) break; rect(S.X(x0), S.box.y, S.X(x0 + 0.75) - S.X(x0), S.box.h, PAL.yellow, sA * 0.08); }
      curve(S, x => batchCulture((x % 2) * 24).logN, 0, up, PAL.ink, 2.5, sA, 0.02);
      text('feast', S.X(0.1), S.box.y + 22, { size: 17, fam: 'mono', color: PAL.yellow, alpha: sA });
      text('famine', S.X(1.0), S.box.y + 22, { size: 17, fam: 'mono', color: PAL.dim, alpha: sA });
    }
  },
};
