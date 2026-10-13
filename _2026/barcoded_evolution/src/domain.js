// ───────────────────────────── domain model ─────────────────────────────
// The film is built on a small model of the experiments it describes.
//   Barcode              20 random nucleotides at a neutral landing pad; inherited, fitness-neutral
//   batchCulture         one 48 h serial-transfer cycle: lag, fermentation, diauxic shift, stationary
//   LineageTracking      the Levy et al. 2015 evolution: ~5e5 lineages, serial transfer, mean-fitness drag
//   PROTOCOL             the method's steps, each with what is done and the ambiguity it removes
//   establishmentLottery a branching process of new beneficial mutants (drift until ~1/s cells)
//   RaceModel            two strains sharing one batch culture: lag time versus growth rate
//   DRUG_ENVS, DrugAtlas Schmidlin et al. 2024: 12 drug conditions, 774 lineages in 6 clusters + controls
//   Pileup               a toy whole-genome alignment around one variant
// Plots drawn from these simulations are labelled as simulated or schematic; numbers printed as
// results are those reported in the papers.

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

// ───────────────────────────── the method itself ─────────────────────────────
// The standard serial-transfer protocol, extended with barcoding. Each step records what is done
// and the ambiguity it removes; the film's step rail and closing recap are drawn from this list.
const PROTOCOL = [
  { key: 'clone',     label: 'clone',     what: 'Start from one clone',            so: 'any change is a new mutation' },
  { key: 'medium',    label: 'medium',    what: 'Define the environment',          so: 'the challenge is known and repeatable' },
  { key: 'transfer',  label: 'transfer',  what: 'Transfer, with a large bottleneck', so: 'evolution runs on and selection beats chance' },
  { key: 'freeze',    label: 'freeze',    what: 'Freeze every transfer',           so: 'the past can be revived and compared' },
  { key: 'replicate', label: 'replicate', what: 'Run replicate populations',       so: 'repeatable can be told from chance' },
  { key: 'compete',   label: 'compete',   what: 'Compete against the ancestor',    so: 'fitness means what selection means' },
  { key: 'barcode',   label: 'barcode',   what: 'Barcode every cell',              so: 'every lineage can be followed', ext: true },
  { key: 'count',     label: 'count',     what: 'Count barcodes, sequence winners', so: 'the race is measured and its causes found', ext: true },
];

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

// ───────────────────────────── Schmidlin et al. 2024: drug-resistance design ─────────────────────────────
// Twelve evolution / competition environments (Table 1 of the paper).
const DRUG_ENVS = [
  { key: 'LF', label: 'Low FLU', flu: 1, rad: 0 }, { key: 'MF', label: 'Med FLU', flu: 2, rad: 0 }, { key: 'HF', label: 'High FLU', flu: 3, rad: 0 },
  { key: 'LR', label: 'Low RAD', flu: 0, rad: 1 }, { key: 'MR', label: 'Med RAD', flu: 0, rad: 2 }, { key: 'HR', label: 'High RAD', flu: 0, rad: 3 },
  { key: 'LRLF', label: 'LR + LF', flu: 1, rad: 1 }, { key: 'LRHF', label: 'LR + HF', flu: 3, rad: 1 }, { key: 'HRLF', label: 'HR + LF', flu: 1, rad: 3 },
  { key: 'HRHF', label: 'HR + HF', flu: 3, rad: 3 }, { key: 'DMSO', label: 'DMSO', flu: 0, rad: 0 }, { key: 'ND', label: 'No drug', flu: 0, rad: 0 },
];
// Six clusters of adaptive mutants plus controls. Mean fitness profiles are illustrative shapes that follow
// the qualitative descriptions in the paper (e.g. cluster 1 best in low FLU, clusters 2–3 best in high FLU
// and cross-resistant to RAD, cluster 6 best without drug).
const DRUG_CLUSTERS = [
  { id: 1, genes: 'SUR1, UPC2', col: PAL.violet, n: 70,  prof: [0.9, 0.5, -0.1, 0.0, 0.05, 0.1, 0.6, -0.1, 0.4, -0.1, 0.0, 0.0] },
  { id: 2, genes: 'PDR1, PDR3', col: PAL.blue,   n: 210, prof: [0.4, 0.8, 1.3, 0.3, 0.4, 0.5, 0.6, 1.2, 0.7, 1.1, 0.0, 0.05] },
  { id: 3, genes: 'PDR1, PDR3', col: PAL.orange, n: 150, prof: [0.5, 1.0, 1.6, 0.5, 0.8, 1.0, 0.8, 1.5, 1.0, 1.5, -0.1, -0.1] },
  { id: 4, genes: 'RAD-resistant', col: PAL.green, n: 110, prof: [0.1, 0.0, -0.2, 0.6, 0.9, 1.1, 0.4, -0.1, 0.4, 0.0, 0.3, 0.3] },
  { id: 5, genes: 'RAD-resistant', col: PAL.yellow, n: 90, prof: [0.3, 0.1, -0.2, 0.7, 1.0, 1.3, 0.0, -0.2, 0.0, -0.2, 0.2, 0.2] },
  { id: 6, genes: 'IRA1, IRA2, GPB2', col: PAL.red, n: 144, prof: [0.2, 0.1, -0.1, 0.4, 0.4, 0.5, 0.3, 0.0, 0.3, 0.0, 0.8, 0.8] },
  { id: 7, genes: 'control strains', col: '#9a9a9a', n: 40, prof: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];
const DrugAtlas = (() => {
  const r = rng(2024), rows = [];
  for (const cl of DRUG_CLUSTERS) for (let i = 0; i < cl.n; i++) {
    const amp = cl.id === 7 ? 0 : 0.75 + 0.5 * r();
    rows.push({ cl, f: cl.prof.map(v => v * amp + 0.12 * gauss(r)) });
  }
  // standardise each environment (mean 0, sd 1), as the paper did before embedding
  const nE = 12, mean = Array(nE).fill(0), sd = Array(nE).fill(0);
  rows.forEach(rw => rw.f.forEach((v, j) => (mean[j] += v / rows.length)));
  rows.forEach(rw => rw.f.forEach((v, j) => (sd[j] += (v - mean[j]) ** 2 / rows.length)));
  rows.forEach(rw => (rw.z = rw.f.map((v, j) => (v - mean[j]) / Math.sqrt(sd[j]))));
  // a linear embedding (PCA) stands in for UMAP in the film
  const C = Array.from({ length: nE }, (_, a) => Array.from({ length: nE }, (_, b) => rows.reduce((s, rw) => s + rw.z[a] * rw.z[b], 0) / rows.length));
  const { vectors } = jacobiEigen(C);
  rows.forEach(rw => (rw.pc = [0, 1, 2].map(k => rw.z.reduce((s, v, j) => s + v * vectors[k][j], 0))));
  return { rows };
})();

// ───────────────────────────── whole-genome sequencing: a toy pileup ─────────────────────────────
const Pileup = (() => {
  const r = rng(99), ref = Array.from({ length: 64 }, () => BASES[(r() * 4) | 0]).join('');
  const site = 37, alt = ref[site] === 'C' ? 'T' : 'C';
  const reads = [];
  for (let i = 0; i < 26; i++) {
    const start = Math.floor(r() * 44) - 8, len = 28;
    let s = '';
    for (let k = 0; k < len; k++) {
      const p = start + k;
      if (p < 0 || p >= ref.length) { s += ' '; continue; }
      let b = p === site ? alt : ref[p];
      if (r() < 0.006) b = BASES[(r() * 4) | 0];   // sequencing error
      s += b;
    }
    reads.push({ start, s });
  }
  return { ref, site, alt, reads };
})();
