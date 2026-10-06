/*
 * QUARTET kernel
 * --------------
 * Pure functions for four-taxon phylogenetics under the Jukes-Cantor (JC69)
 * substitution model. No DOM, no randomness, no global state.
 *
 * Every number on the page that is labelled "computed" comes from this file
 * or from lab.js. The Node verification run (tests/verify.js) hashes the
 * source text of this factory, and the page hashes it again in the browser,
 * so a reader can see that the code that runs is the code that was tested.
 *
 * Conventions (mirrors CONVENTIONS.md; change both or neither):
 *   - States are integers 0..3 for A, C, G, T.
 *   - Taxa are integers 0..3 for A, B, C, D.
 *   - A tree is { topo, t }, where topo is 0, 1 or 2 (T1, T2, T3) and
 *     t = [tA, tB, tC, tD, tInternal].
 *   - Branch length is the expected number of substitutions per site.
 *     For JC69 this fixes the rate constant: mu = 4/3.
 */
function quartetKernelFactory() {
  'use strict';

  const CONVENTIONS = Object.freeze({
    alphabet: 'ACGT',
    taxa: Object.freeze(['A', 'B', 'C', 'D']),
    model: 'JC69',
    branchLengthUnit: 'expected substitutions per site',
    // P_same(t) = 1/4 + 3/4 exp(-mu t). Only mu = 4/3 makes t equal to the
    // expected number of substitutions per site.
    mu: 4 / 3,
    rootPrior: 0.25,
    tMax: 10,
  });

  // An unrooted quartet has three possible topologies. Each one is written
  // as two cherries: the pairs of taxa that join first.
  const TOPOLOGIES = Object.freeze([
    Object.freeze({ id: 'T1', split: 'AB|CD', cherries: Object.freeze([[0, 1], [2, 3]]) }),
    Object.freeze({ id: 'T2', split: 'AC|BD', cherries: Object.freeze([[0, 2], [1, 3]]) }),
    Object.freeze({ id: 'T3', split: 'AD|BC', cherries: Object.freeze([[0, 3], [1, 2]]) }),
  ]);

  // Kernel variants. M0 is the reference. M1..M4 are deliberate mutants that
  // the check suite must reject. Each mutant changes one thing only.
  const VARIANTS = Object.freeze([
    Object.freeze({ id: 'M0', name: 'Reference kernel', mu: 4 / 3, dropRootPrior: false, swapSameDiff: false, skipInternal: false }),
    Object.freeze({ id: 'M1', name: 'Rate-convention drift', mu: 4, dropRootPrior: false, swapSameDiff: false, skipInternal: false }),
    Object.freeze({ id: 'M2', name: 'Dropped root prior', mu: 4 / 3, dropRootPrior: true, swapSameDiff: false, skipInternal: false }),
    Object.freeze({ id: 'M3', name: 'Swapped same and different', mu: 4 / 3, dropRootPrior: false, swapSameDiff: true, skipInternal: false }),
    Object.freeze({ id: 'M4', name: 'Skipped internal branch', mu: 4 / 3, dropRootPrior: false, swapSameDiff: false, skipInternal: true }),
  ]);

  /* ---------- Site-pattern classes ----------
   * JC69 treats the four bases symmetrically, so a site pattern's likelihood
   * depends only on which taxa share a base. There are 15 such classes
   * (the set partitions of four taxa). Multiplicities are counted by
   * enumeration here, and checked against 4!/(4-k)! in the test suite.
   */
  function canonical(pattern) {
    const seen = new Map();
    return pattern.map((s) => {
      if (!seen.has(s)) seen.set(s, seen.size);
      return seen.get(s);
    });
  }

  const CLASSES = (() => {
    const byKey = new Map();
    for (let code = 0; code < 256; code++) {
      const p = [(code >> 6) & 3, (code >> 4) & 3, (code >> 2) & 3, code & 3];
      const rep = canonical(p);
      const key = rep.join('');
      if (!byKey.has(key)) byKey.set(key, { key, rep, multiplicity: 0 });
      byKey.get(key).multiplicity++;
    }
    return Object.freeze(
      [...byKey.values()]
        .sort((a, b) => (a.key < b.key ? -1 : 1))
        .map((c, index) =>
          Object.freeze({
            index,
            key: c.key,
            label: c.rep.map((k) => 'xyzw'[k]).join(''),
            rep: Object.freeze(c.rep.slice()),
            multiplicity: c.multiplicity,
            blocks: Math.max(...c.rep) + 1,
          })
        )
    );
  })();
  const CLASS_BY_KEY = new Map(CLASSES.map((c) => [c.key, c.index]));
  const CONSTANT_CLASS = CLASS_BY_KEY.get('0000');

  function classOf(pattern) {
    return CLASS_BY_KEY.get(canonical(pattern).join(''));
  }

  // Lookup table: pattern code (4 bases packed as base-4 digits) -> class.
  const CLASS_OF_CODE = Uint8Array.from({ length: 256 }, (_, code) =>
    classOf([(code >> 6) & 3, (code >> 4) & 3, (code >> 2) & 3, code & 3])
  );

  /* ---------- Small linear algebra for the brute-force route ---------- */
  function matMul(A, B) {
    const n = A.length;
    const C = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      for (let k = 0; k < n; k++) {
        const a = A[i][k];
        for (let j = 0; j < n; j++) row[j] += a * B[k][j];
      }
      C.push(row);
    }
    return C;
  }

  // Matrix exponential by scaling and squaring with a Taylor series.
  // It knows nothing about the JC69 closed form. That is the point.
  function expm(A) {
    const n = A.length;
    let norm = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += Math.abs(A[i][j]);
      norm = Math.max(norm, s);
    }
    let squarings = 0;
    while (norm / 2 ** squarings > 0.5) squarings++;
    const scale = 2 ** squarings;
    const X = A.map((row) => row.map((v) => v / scale));
    let term = X.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
    let sum = term.map((row) => row.slice());
    for (let k = 1; k <= 24; k++) {
      term = matMul(term, X).map((row) => row.map((v) => v / k));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) sum[i][j] += term[i][j];
    }
    for (let s = 0; s < squarings; s++) sum = matMul(sum, sum);
    return sum;
  }

  /* ---------- Concave one-dimensional maximiser ----------
   * For fixed other parameters, each site likelihood is affine in
   * z = exp(-mu t) for any single branch: L_c(z) = alpha_c + beta_c z.
   * F(z) = sum_c n_c ln(alpha_c + beta_c z) is therefore concave, and the
   * root of F'(z) found by bisection is the global maximum on [zMin, 1].
   */
  function maximizeAffineLogSum(alpha, beta, counts, zMin) {
    // F'(z) and F''(z); F'' < 0, so F' falls monotonically.
    const derivs = (z) => {
      let g = 0;
      let h = 0;
      for (let c = 0; c < counts.length; c++) {
        const n = counts[c];
        if (n === 0 || beta[c] === 0) continue;
        const L = alpha[c] + beta[c] * z;
        if (L <= 0) return [beta[c] > 0 ? Infinity : -Infinity, -Infinity];
        const r = beta[c] / L;
        g += n * r;
        h -= n * r * r;
      }
      return [g, h];
    };
    if (derivs(1)[0] >= 0) return 1;
    if (derivs(zMin)[0] <= 0) return zMin;
    // Safeguarded Newton inside the bracket [lo, hi].
    let lo = zMin;
    let hi = 1;
    let z = 0.5 * (lo + hi);
    for (let it = 0; it < 100; it++) {
      const [g, h] = derivs(z);
      if (g > 0) lo = z;
      else hi = z;
      let next = h < 0 && Number.isFinite(g) ? z - g / h : NaN;
      if (!(next > lo && next < hi)) next = 0.5 * (lo + hi);
      if (Math.abs(next - z) <= 1e-15 * Math.max(1, z) || hi - lo <= 1e-15) return next;
      z = next;
    }
    return z;
  }

  /* ---------- Fitch parsimony on a quartet ---------- */
  function fitchLength(pattern, topo) {
    const [[i, j], [k, l]] = TOPOLOGIES[topo].cherries;
    const join = (A, B) => ((A & B) !== 0 ? [A & B, 0] : [A | B, 1]);
    const [u, cu] = join(1 << pattern[i], 1 << pattern[j]);
    const [v, cv] = join(1 << pattern[k], 1 << pattern[l]);
    const cr = join(u, v)[1];
    return cu + cv + cr;
  }

  // FITCH[topo][class] is the parsimony length of the class on the topology.
  const FITCH = Object.freeze(
    TOPOLOGIES.map((_, topo) => Object.freeze(CLASSES.map((c) => fitchLength(c.rep, topo))))
  );

  function parsimonyScores(counts) {
    return TOPOLOGIES.map((_, topo) => {
      let s = 0;
      for (let c = 0; c < CLASSES.length; c++) s += counts[c] * FITCH[topo][c];
      return s;
    });
  }

  /* ---------- The model: one object per kernel variant ---------- */
  function makeModel(variant = VARIANTS[0]) {
    const mu = variant.mu;
    const prior = variant.dropRootPrior ? 1 : CONVENTIONS.rootPrior;
    const zMin = Math.exp(-mu * CONVENTIONS.tMax);

    // Closed form. Entries are affine in z = exp(-mu t).
    function p(t) {
      const z = Math.exp(-mu * t);
      const same = 0.25 + 0.75 * z;
      const diff = 0.25 - 0.25 * z;
      return variant.swapSameDiff ? { same: diff, diff: same } : { same, diff };
    }

    // The rate matrix that the convention mu implies.
    function rateMatrix() {
      return [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (i === j ? (-3 * mu) / 4 : mu / 4)));
    }

    // Brute-force route: numerical exponential of Q t.
    function pMatrix(t) {
      return expm(rateMatrix().map((row) => row.map((q) => q * t)));
    }

    // Transition probabilities for the five branches, computed once per tree.
    function branchP(t) {
      return [p(t[0]), p(t[1]), p(t[2]), p(t[3]), variant.skipInternal ? { same: 1, diff: 0 } : p(t[4])];
    }

    // Felsenstein pruning, specialised to the quartet and to JC69.
    // rootAt 'u' roots at the parent of the first cherry, 'v' at the second.
    // This is the only pruning code path: checks and fits both use it.
    const fu = new Float64Array(4);
    const fv = new Float64Array(4);
    function pruneWithP(pattern, topo, P, rootAt) {
      const cherries = TOPOLOGIES[topo].cherries;
      const [a, b] = rootAt === 'v' ? cherries[1] : cherries[0];
      const [c, d] = rootAt === 'v' ? cherries[0] : cherries[1];
      const Pa = P[a];
      const Pb = P[b];
      const Pc = P[c];
      const Pd = P[d];
      const Pe = P[4];
      let sv = 0;
      for (let x = 0; x < 4; x++) {
        fu[x] = (x === pattern[a] ? Pa.same : Pa.diff) * (x === pattern[b] ? Pb.same : Pb.diff);
        fv[x] = (x === pattern[c] ? Pc.same : Pc.diff) * (x === pattern[d] ? Pd.same : Pd.diff);
        sv += fv[x];
      }
      let L = 0;
      for (let x = 0; x < 4; x++) L += fu[x] * (Pe.diff * sv + (Pe.same - Pe.diff) * fv[x]);
      return prior * L;
    }

    function siteLikelihood(pattern, tree, rootAt = 'u') {
      return pruneWithP(pattern, tree.topo, branchP(tree.t), rootAt);
    }

    // Independent route: sum over all 16 internal-node states, using
    // numerically exponentiated matrices instead of the closed form.
    function siteLikelihoodBrute(pattern, tree) {
      const [[i, j], [k, l]] = TOPOLOGIES[tree.topo].cherries;
      const P = tree.t.map((t) => pMatrix(t));
      let L = 0;
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          L +=
            CONVENTIONS.rootPrior *
            P[4][x][y] *
            P[i][x][pattern[i]] *
            P[j][x][pattern[j]] *
            P[k][y][pattern[k]] *
            P[l][y][pattern[l]];
        }
      }
      return L;
    }

    /* The +I convention.
     * Branch lengths keep one unit everywhere: expected substitutions per
     * site, averaged over ALL sites. With a proportion pInv of invariant
     * sites, variable sites evolve at rate 1/(1 - pInv), so a variable site
     * sees the branch length t / (1 - pInv). The fit optimises in these
     * variable-site units and converts back before it reports.
     */
    const NC = CLASSES.length;
    const toVariable = (t, pInv) => t.map((x) => x / (1 - pInv));

    function classLikelihoodsVariable(topo, tVar, pInv, out) {
      const P = branchP(tVar);
      for (let c = 0; c < NC; c++) {
        out[c] = (1 - pInv) * pruneWithP(CLASSES[c].rep, topo, P, 'u') + (c === CONSTANT_CLASS ? pInv * prior : 0);
      }
      return out;
    }

    function sumLog(counts, L) {
      let ll = 0;
      for (let c = 0; c < NC; c++) {
        if (counts[c] === 0) continue;
        if (!(L[c] > 0)) return -Infinity;
        ll += counts[c] * Math.log(L[c]);
      }
      return ll;
    }

    // Per-pattern likelihood of each class representative.
    function classLikelihoods(tree, pInv = 0) {
      return classLikelihoodsVariable(tree.topo, toVariable(tree.t, pInv), pInv, new Float64Array(NC));
    }

    function logLikelihood(counts, tree, pInv = 0) {
      return sumLog(counts, classLikelihoods(tree, pInv));
    }

    // Expected class frequencies when this model generates the data.
    function classProbabilities(tree, pInv = 0) {
      const L = classLikelihoods(tree, pInv);
      for (let c = 0; c < NC; c++) L[c] *= CLASSES[c].multiplicity;
      return L;
    }

    /* Maximum likelihood for one topology by coordinate ascent.
     * Each coordinate step is an exact one-dimensional maximisation
     * (see maximizeAffineLogSum). Options:
     *   invariant: also fit pInv (the JC69+I model)
     *   init: starting branch lengths, in convention units
     *   pInvInit: starting proportion of invariant sites
     *   tol: stop when a full round gains less than tol * |logL|
     */
    function fit(counts, topo, options = {}) {
      const invariant = Boolean(options.invariant);
      let pInv = invariant ? (options.pInvInit ?? 0.2) : 0;
      const tv = toVariable(options.init || [0.1, 0.1, 0.1, 0.1, 0.1], pInv);
      const maxRounds = options.maxRounds || 500;
      const L0 = new Float64Array(NC);
      const L1 = new Float64Array(NC);
      const beta = new Float64Array(NC);
      let ll = sumLog(counts, classLikelihoodsVariable(topo, tv, pInv, L0));
      let rounds = 0;
      while (rounds < maxRounds) {
        rounds++;
        for (let b = 0; b < 5; b++) {
          if (b === 4 && variant.skipInternal) continue;
          tv[b] = Infinity; // z = 0
          classLikelihoodsVariable(topo, tv, pInv, L0);
          tv[b] = 0; // z = 1
          classLikelihoodsVariable(topo, tv, pInv, L1);
          for (let c = 0; c < NC; c++) beta[c] = L1[c] - L0[c];
          const z = maximizeAffineLogSum(L0, beta, counts, zMin);
          tv[b] = z <= zMin ? CONVENTIONS.tMax : -Math.log(z) / mu;
        }
        if (invariant) {
          // With tv fixed, L = Lv + pInv (I - Lv) is affine in pInv.
          classLikelihoodsVariable(topo, tv, 0, L0);
          for (let c = 0; c < NC; c++) beta[c] = (c === CONSTANT_CLASS ? prior : 0) - L0[c];
          pInv = Math.min(0.999, maximizeAffineLogSum(L0, beta, counts, 0));
        }
        const next = sumLog(counts, classLikelihoodsVariable(topo, tv, pInv, L0));
        const gain = next - ll;
        ll = next;
        if (Math.abs(gain) < (options.tol ?? 1e-12) * Math.max(1, Math.abs(ll))) break;
      }
      const t = tv.map((x) => x * (1 - pInv));
      return { topo, t, pInv, logL: ll, rounds };
    }

    return Object.freeze({
      variant,
      p,
      rateMatrix,
      pMatrix,
      siteLikelihood,
      siteLikelihoodBrute,
      classLikelihoods,
      logLikelihood,
      classProbabilities,
      fit,
    });
  }

  // Compare three numbers. Ties share the decision equally.
  function decide(values, better) {
    const best = values.reduce((b, v) => (better(v, b) ? v : b), values[0]);
    const tol = 1e-9 * Math.max(1, Math.abs(best));
    const winners = values.map((v) => Math.abs(v - best) <= tol);
    const k = winners.filter(Boolean).length;
    return winners.map((w) => (w ? 1 / k : 0));
  }

  function parsimonyChoice(counts) {
    return decide(parsimonyScores(counts), (a, b) => a < b);
  }

  // options.inits: optional per-topology starting points [{ t, pInv }].
  function mlChoice(counts, model, options = {}) {
    const fits = TOPOLOGIES.map((_, topo) => {
      const start = options.inits ? options.inits[topo] : null;
      const o = start ? Object.assign({}, options, { init: start.t, pInvInit: start.pInv }) : options;
      return model.fit(counts, topo, o);
    });
    return { share: decide(fits.map((f) => f.logL), (a, b) => a > b), fits };
  }

  return Object.freeze({
    CONVENTIONS,
    TOPOLOGIES,
    VARIANTS,
    CLASSES,
    CONSTANT_CLASS,
    CLASS_OF_CODE,
    FITCH,
    canonical,
    classOf,
    expm,
    matMul,
    maximizeAffineLogSum,
    fitchLength,
    parsimonyScores,
    parsimonyChoice,
    mlChoice,
    makeModel,
  });
}

const QuartetKernel = quartetKernelFactory();
if (typeof module === 'object' && module.exports) {
  module.exports = { QuartetKernel, quartetKernelFactory };
}
