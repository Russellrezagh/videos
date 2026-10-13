// ───────────────────────────── domain model ─────────────────────────────
// The film is built on a small model of the experiments it describes.
//   Barcode            20 random nucleotides at a neutral landing pad; inherited, fitness-neutral
//   Lineage            every cell sharing one barcode; has a frequency trajectory
//   LineageTracking    the Levy et al. 2015 evolution: ~5e5 lineages, serial transfer, mean-fitness drag
//   MutantClass        Venkataram 2016 / Kinsler 2020 adaptive mutant types (diploid, IRA1, GPB2, ...)
//   Environment        one of 45 perturbations of the evolution condition (EC); subtle or strong
//   FitnessAtlas       mutant × environment fitness matrix generated from a latent phenotype model,
//                      then decomposed with SVD exactly as in Kinsler et al. 2020
// All numbers drawn in plots come from these simulations (illustrative); numbers spoken or printed
// as results are those reported in the papers.

const BASES = 'ACGT';
const Barcode = {
  LENGTH: 20,
  random(r) { let s = ''; for (let i = 0; i < 20; i++) s += BASES[(r() * 4) | 0]; return s; },
  hue(seq) { let h = 7; for (const ch of seq) h = (h * 31 + ch.charCodeAt(0)) % 3607; return (h * 47) % 360; },
  FLANK_L: 'GCTTCAGT', FLANK_R: 'ATCGGTAC',
};

/** Schematic 48 h glucose-limited batch culture (Kinsler et al.: ~8 generations per cycle). */
function batchCulture(h) {
  const logN0 = Math.log10(5e7), lag = 3, tDep = 18, logNdep = logN0 + 7 * Math.LOG10E * Math.LN2, logNend = Math.log10(1.25e10);
  let logN, phase;
  if (h < lag) { logN = logN0 + 0.02 * h; phase = 'lag'; }
  else if (h < tDep) { logN = logN0 + 0.06 + (logNdep - logN0 - 0.06) * ((h - lag) / (tDep - lag)); phase = 'fermentation'; }
  else { const u = (h - tDep) / (48 - tDep); logN = logNdep + (logNend - logNdep) * (1 - Math.exp(-3.2 * u)) / (1 - Math.exp(-3.2)); phase = h < tDep + 4 ? 'diauxic shift' : 'respiration'; }
  const cellsMade = Math.pow(10, Math.min(logN, logNdep)) - 5e7;
  const glucose = clamp(1 - cellsMade / (Math.pow(10, logNdep) - 5e7));
  return { logN, glucose, phase };
}

/** Beneficial fitness effects: mostly 2–5%, a flat tail, bumps near 7–8% and 10–11% (Levy et al. 2015). */
function sampleDFE(r) {
  const u = r();
  if (u < 0.97) return 0.02 + 0.03 * Math.pow(r(), 1.6);
  if (u < 0.982) return 0.05 + 0.08 * r();
  if (u < 0.991) return 0.07 + 0.01 * r();
  return 0.10 + 0.01 * r();
}

const LineageTracking = (() => {
  const N = 7e7;            // bottleneck size (Levy et al.: ~7×10^7)
  const L = 5e5;            // barcoded lineages
  const GEN = 112;          // generations shown
  const STEP = 4;           // stored every 4 generations (sampled every 8 in the experiment)
  const NS = GEN / STEP + 1;
  const NA = 25000;         // adaptive lineages with s > 2% (replicate E1)

  function run(seed = 11) {
    const r = rng(seed);
    const s = new Float64Array(NA), tau = new Float64Array(NA), m = new Float64Array(NA);
    for (let i = 0; i < NA; i++) {
      s[i] = sampleDFE(r);
      tau[i] = (s[i] < 0.05 && r() < 0.25) ? lerp(-45, -12, r()) : lerp(-12, 72, r());
    }
    let neutral = 1, integral = 0;
    const sbar = new Float64Array(GEN + 1), decline = new Float64Array(GEN + 1);
    const mS = new Float32Array(NA * NS);
    for (let t = -90; t <= GEN; t++) {
      let tot = neutral, sm = 0;
      for (let i = 0; i < NA; i++) { tot += m[i]; sm += s[i] * m[i]; }
      const sb = sm / tot;
      for (let i = 0; i < NA; i++) {
        if (m[i] > 0) m[i] *= Math.exp(s[i] - sb);
        else if (t >= tau[i]) m[i] = 1 / (s[i] * N);
      }
      neutral *= Math.exp(-sb);
      let tot2 = neutral; for (let i = 0; i < NA; i++) tot2 += m[i];
      neutral /= tot2; for (let i = 0; i < NA; i++) m[i] /= tot2;
      if (t >= 0) {
        sbar[t] = sb; integral += sb; decline[t] = integral;
        if (t % STEP === 0) { const k = t / STEP; for (let i = 0; i < NA; i++) mS[i * NS + k] = m[i]; }
      }
    }

    // neutral background of any lineage: initial size spread, mean-fitness drag, drift at each bottleneck
    function neutralPath(rr, x0) {
      const out = new Float64Array(NS);
      let x = x0; out[0] = x;
      for (let t = 1; t <= GEN; t++) {
        x *= Math.exp(-sbar[t]);
        if (t % 8 === 0 && x > 0) {
          x *= Math.exp(Math.sqrt(2.5 / (x * N)) * gauss(rr) - 1.25 / (x * N));
          if (x * N < 0.5) x = 0;
        }
        if (t % STEP === 0) out[t / STEP] = x;
      }
      return out;
    }
    const lr = rng(seed + 1);
    const lines = [];
    for (let j = 0; j < 1100; j++) {
      const p = neutralPath(lr, Math.exp(0.5 * gauss(lr)) / L);
      lines.push({ kind: 'neutral', s: 0, tau: 0, y: Array.from(p, v => v > 0 ? Math.log10(v) : -9) });
    }
    const finalM = i => mS[i * NS + NS - 1];
    const order = Array.from({ length: NA }, (_, i) => i).sort((a, b) => finalM(b) - finalM(a));
    const chosen = new Set(order.slice(0, 130));
    while (chosen.size < 360) chosen.add((lr() * NA) | 0);
    let above1pct = 0;
    for (const i of chosen) {
      const p = neutralPath(lr, Math.exp(0.5 * gauss(lr)) / L);
      const y = [];
      for (let k = 0; k < NS; k++) { const v = p[k] + mS[i * NS + k]; y.push(v > 0 ? Math.log10(v) : -9); }
      lines.push({ kind: 'adaptive', s: s[i], tau: tau[i], y });
    }
    for (let i = 0; i < NA; i++) if (finalM(i) > 0.01) above1pct++;
    // a well-behaved example lineage for the "infer s and τ" moment
    const example = lines.find(l => l.kind === 'adaptive' && l.s > 0.06 && l.s < 0.085 && l.tau > -20 && l.tau < 5 && l.y[NS - 1] > -3.6)
      || lines.find(l => l.kind === 'adaptive' && l.y[NS - 1] > -4);

    const dfe = new Array(22).fill(0);      // 0.5% bins from 2% to 13%
    for (let i = 0; i < NA; i++) dfe[Math.min(21, Math.floor((s[i] - 0.02) / 0.005))]++;
    const tauHist = new Array(16).fill(0);  // 10-generation bins from -90 to 70 (established lineages only)
    for (let i = 0; i < NA; i++) if (finalM(i) * N * s[i] > 1) tauHist[clamp(Math.floor((tau[i] + 90) / 10), 0, 15)]++;
    return { N, L, GEN, STEP, NS, lines, sbar, decline, dfe, tauHist, example, above1pct };
  }
  return { run, N, L };
})();

// Mutant classes from Venkataram et al. 2016 as analysed by Kinsler et al. 2020.
// Counts are illustrative and sum to 292; phenotype signatures are invented to reproduce the
// qualitative patterns the paper reports (e.g. IRA1 nonsense and PDE2 suffer in salt, GPB2 does not).
const MUTANT_CLASSES = [
  { key: 'dip',   label: 'Diploid',               n: 110, col: '#9aa7c7', f: 0.85, sig: [-0.30, 0.05, 0.00, 0.05, 0.00, 0.00, 0.00], sd: 0.06 },
  { key: 'hdip',  label: 'High-fitness diploid',  n: 6,   col: '#e2e8f6', f: 1.15, sig: [-0.10, 0.10, 0.45, -0.35, 0.10, 0.00, 0.05], sd: 0.04 },
  { key: 'dipx',  label: 'Diploid + extra mutation', n: 20, col: '#c46bff', f: 1.05, sig: [-0.15, 0.15, 0.05, 0.20, -0.25, 0.10, 0.10], sd: 0.32 },
  { key: 'ira1n', label: 'IRA1 nonsense',         n: 22,  col: PAL.T,     f: 1.45, sig: [0.50, -0.20, 0.30, 0.30, 0.15, 1.00, 1.00], sd: 0.07 },
  { key: 'ira1m', label: 'IRA1 missense',         n: 30,  col: '#ff9eb0', f: 1.05, sig: [0.35, -0.05, 0.10, 0.10, 0.00, 0.35, 0.35], sd: 0.38 },
  { key: 'ira2',  label: 'IRA2',                  n: 8,   col: '#ff8a3d', f: 1.00, sig: [0.40, 0.10, -0.10, 0.25, -0.10, 0.25, 0.20], sd: 0.36 },
  { key: 'gpb2',  label: 'GPB2',                  n: 35,  col: PAL.C,     f: 1.00, sig: [0.45, 1.00, -0.30, -0.40, -0.10, -0.05, -0.20], sd: 0.08 },
  { key: 'pde2',  label: 'PDE2',                  n: 30,  col: PAL.A,     f: 1.00, sig: [0.45, -0.25, 0.80, -0.05, 0.35, 0.55, 0.15], sd: 0.08 },
  { key: 'tor',   label: 'TOR/Sch9 pathway',      n: 3,   col: PAL.G,     f: 0.80, sig: [0.10, 0.40, -0.40, 0.60, -0.30, 0.05, -0.10], sd: 0.15 },
  { key: 'ssk2',  label: 'SSK2 (HOG)',            n: 1,   col: '#ffe08a', f: 0.70, sig: [0.00, -0.30, 0.20, 0.50, 0.50, -0.30, 0.00], sd: 0.05 },
  { key: 'other', label: 'Other / unidentified',  n: 27,  col: '#5f7090', f: 0.65, sig: [0.10, 0.10, 0.00, 0.10, 0.00, 0.10, 0.10], sd: 0.25 },
];

// 45 environments: 9 EC batches, 16 subtle perturbations, 20 strong perturbations.
// Weight vectors e (8 phenotypes) say how much each latent phenotype matters to fitness there.
const ENVIRONMENTS = (() => {
  const r = rng(404), envs = [];
  const subtleSd = [0.07, 0.5, 0.2, 0.17, 0.17, 0.1, 0.05, 0.05];
  for (let b = 1; b <= 9; b++) envs.push({ name: `EC batch ${b}`, kind: 'EC', cat: 'EC', e: subtleSd.map((sd, k) => (k === 0 ? 1 : 0) + sd * gauss(r) * 0.9) });
  const subtleCats = ['Glucose', 'Glucose', 'Glucose', 'Flask', 'Flask', 'Drug', 'Drug', 'Drug', 'Drug', 'Drug', 'Transfer', 'Glucose', 'Drug', 'Flask', 'Drug', 'Drug'];
  subtleCats.forEach((cat, i) => envs.push({ name: `${cat} (subtle ${i + 1})`, kind: 'subtle', cat, e: subtleSd.map((sd, k) => (k === 0 ? 1 : 0) + sd * gauss(r) * 1.1) }));
  const S = (name, cat, w, label) => {
    const e = [0, 0, 0, 0, 0, 0, 0, 0].map((_, k) => (k === 0 ? 0.9 : 0) + 0.12 * gauss(r));
    for (const k in w) e[k] = w[k] + 0.05 * gauss(r);
    envs.push({ name, kind: 'strong', cat, e, label });
  };
  S('1 Day', 'Transfer', { 0: 0.85, 2: -1.3, 5: 0.5 }, '1 Day');
  S('3 Day', 'Transfer', { 0: 1.0, 1: 0.05, 3: 0.5 });
  S('5 Day', 'Transfer', { 0: 0.75, 7: -1.2 }, '5 Day');
  S('6 Day', 'Transfer', { 0: 0.55, 7: -2.0, 4: 0.4 }, '6 Day');
  S('7 Day', 'Transfer', { 0: 0.45, 7: -2.4 }, '7 Day');
  S('0.5 M NaCl', 'Salt', { 0: 0.1, 6: -2.3, 1: 0.5 }, '0.5 M NaCl');
  S('KCl', 'Salt', { 0: 0.4, 6: -1.4, 1: 0.3 }, 'KCl');
  S('Baffle, 1.8% Glucose', 'Flask', { 0: 1.3, 1: 0.55, 3: 0.4 });
  S('Baffle, 2.5% Glucose', 'Flask', { 0: 1.2, 1: 0.8 });
  S('Baffle, 0.4 µg/mL Benomyl', 'Drug', { 0: 0.6, 1: 1.5 });
  S('Baffle, 2 µg/mL Benomyl', 'Drug', { 0: 0.5, 1: 2.0 });
  S('8.5 µM GdA (B9)', 'Drug', { 0: 0.8, 3: 1.0 });
  S('Geldanamycin', 'Drug', { 0: 0.8, 3: 0.8, 4: 0.5 });
  S('Geldanamycin', 'Drug', { 0: 0.7, 2: 0.6, 4: 0.7 });
  S('Fluconazole', 'Drug', { 0: 0.9, 4: -0.9 });
  S('Fluconazole', 'Drug', { 0: 0.8, 2: 0.7, 5: -0.6 });
  S('Fluconazole', 'Drug', { 0: 0.95, 5: 0.9 });
  S('Carbon source', 'Carbon', { 0: 0.5, 1: -0.7, 3: -0.6 });
  S('Carbon source', 'Carbon', { 0: 0.6, 2: 0.8, 4: 0.6 });
  S('Glucose', 'Glucose', { 0: 1.25, 3: -0.6, 5: 0.5 });
  return envs;
})();

/** Symmetric eigen-decomposition by cyclic Jacobi rotations. Returns values (desc) and column vectors. */
function jacobiEigen(A) {
  const n = A.length, a = A.map(r => r.slice()), v = A.map((_, i) => A.map((_, j) => +(i === j)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-14) continue;
      const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; }
    }
  }
  const idx = a.map((_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
  return { values: idx.map(i => a[i][i]), vectors: idx.map(i => v.map(row => row[i])) };
}

/** Thin SVD of an m×n matrix (n small) via the eigenvectors of FᵀF. */
function svd(F) {
  const m = F.length, n = F[0].length;
  const G = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => { let s = 0; for (let r = 0; r < m; r++) s += F[r][i] * F[r][j]; return s; }));
  const { values, vectors } = jacobiEigen(G);
  const sing = values.map(v => Math.sqrt(Math.max(0, v)));
  const U = F.map(row => vectors.map((vec, k) => sing[k] > 1e-12 ? row.reduce((s, x, j) => s + x * vec[j], 0) / sing[k] : 0));
  return { S: sing, U, V: vectors };
}

const FitnessAtlas = (() => {
  const r = rng(2020);
  const mutants = [];
  for (const c of MUTANT_CLASSES) for (let i = 0; i < c.n; i++) {
    const p = [c.f + 0.08 * gauss(r), ...c.sig.map(v => v + c.sd * gauss(r) * (0.6 + Math.abs(v)))];
    mutants.push({ cls: c, p });
  }
  const F = mutants.map(mu => ENVIRONMENTS.map(env => env.e.reduce((s, w, k) => s + w * mu.p[k], 0) + 0.05 * gauss(r)));
  // rows grouped by class, each sorted by fitness in the evolution condition
  const ecIdx = ENVIRONMENTS.map((e, j) => j).filter(j => ENVIRONMENTS[j].kind === 'EC');
  const ecFit = F.map(row => ecIdx.reduce((s, j) => s + row[j], 0) / ecIdx.length);
  const rowOrder = mutants.map((_, i) => i).sort((a, b) =>
    MUTANT_CLASSES.indexOf(mutants[a].cls) - MUTANT_CLASSES.indexOf(mutants[b].cls) || ecFit[b] - ecFit[a]);
  // strength of each perturbation, relative to the batch-to-batch spread of the EC repeats
  const dev = j => F.reduce((s, row, i) => s + (row[j] - ecFit[i]) ** 2, 0) / F.length;
  const ecDev = ecIdx.map(dev), mu = ecDev.reduce((a, b) => a + b) / ecDev.length;
  const sd = Math.sqrt(ecDev.reduce((a, b) => a + (b - mu) ** 2, 0) / (ecDev.length - 1));
  const z = ENVIRONMENTS.map((_, j) => (dev(j) - mu) / sd);
  const subtleCols = ENVIRONMENTS.map((e, j) => j).filter(j => ENVIRONMENTS[j].kind !== 'strong');
  const Fs = F.map(row => subtleCols.map(j => row[j]));
  const dec = svd(Fs);
  const tot = dec.S.reduce((s, x) => s + x * x, 0);
  const varFrac = dec.S.map(x => x * x / tot);
  return { mutants, F, ecFit, rowOrder, z, subtleCols, dec, varFrac };
})();

// ───────────────────────────── the method itself ─────────────────────────────
// The standard serial-transfer protocol, extended with barcoding. Each step records what is done
// and the ambiguity it removes; the film's step rail and closing recap are drawn from this list.
const PROTOCOL = [
  { key: 'clone',     label: 'clone',     what: 'Start from one clone',            so: 'any change is a new mutation' },
  { key: 'medium',    label: 'medium',    what: 'Define the environment',          so: 'the challenge is known and repeatable' },
  { key: 'transfer',  label: 'transfer',  what: 'Transfer with a large bottleneck', so: 'evolution runs on, and selection beats chance' },
  { key: 'freeze',    label: 'freeze',    what: 'Freeze every transfer',           so: 'the past can be revived and compared' },
  { key: 'replicate', label: 'replicate', what: 'Run replicate populations',       so: 'repeatable can be told from chance' },
  { key: 'compete',   label: 'compete',   what: 'Compete against the ancestor',    so: 'fitness means what selection means' },
  { key: 'barcode',   label: 'barcode',   what: 'Barcode every cell',              so: 'every lineage can be followed', ext: true },
  { key: 'count',     label: 'count',     what: 'Count barcodes by sequencing',    so: 'the whole race becomes measurable', ext: true },
];
/** which protocol steps each chapter is about */
const SCENE_STEPS = { clone: [0], medium: [1], transfer: [2], bottleneck: [2], freeze: [3, 4], compete: [5], limit: [5], idea: [6], build: [6], census: [7] };

function poisson(r, lam) {
  if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
  let L = Math.exp(-lam), k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}
/** The establishment lottery: new mutants start as one cell; each generation every cell leaves
 *  Poisson(1 + s) offspring. Most lineages die out by chance; those that reach ~1/s cells grow on
 *  almost deterministically. Returns cell counts per generation. */
function establishmentLottery(n = 40, s = 0.05, gens = 160, seed = 8) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    let x = 1; const y = [1];
    for (let t = 1; t <= gens; t++) { x = x > 3000 ? x * (1 + s) : x > 0 ? poisson(r, x * (1 + s)) : 0; y.push(x); }
    out.push(y);
  }
  return out;
}
/** Two strains sharing one batch culture: growth rate alone can mislead, the shared cycle decides. */
const RaceModel = {
  X: { r: 0.50, lag: 4.0, label: 'faster growth, long lag' },
  Y: { r: 0.42, lag: 1.0, label: 'slower growth, short lag' },
  logN(st, h) { return Math.log10(5e7) + Math.max(0, h - st.lag) * st.r * Math.LOG10E; },
  /** glucose runs out when the shared culture reaches ~1.25e10 cells */
  depletion() {
    for (let h = 0; h < 48; h += 0.01) {
      const tot = 0.5 * Math.pow(10, this.logN(this.X, h)) + 0.5 * Math.pow(10, this.logN(this.Y, h));
      if (tot > 1.25e10) return h;
    }
    return 48;
  },
};
