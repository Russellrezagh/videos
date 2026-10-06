/*
 * QUARTET lab
 * -----------
 * The harness around the kernel: seeded simulation, the check suite,
 * mutation testing, consistency studies, goodness of fit, run manifests,
 * and SHA-256 source identity. Pure functions; the page and the Node
 * verification run call the same code.
 */
function quartetLabFactory(K) {
  'use strict';

  /* ---------- Seeded randomness (integer arithmetic, same in every engine) ---------- */
  function splitmix32(x) {
    x = (x + 0x9e3779b9) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return (x ^ (x >>> 16)) >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function deriveSeed(base, ...parts) {
    let h = splitmix32(base >>> 0);
    for (const p of parts) h = splitmix32((h ^ (p >>> 0)) >>> 0);
    return h;
  }

  function poisson(lambda, rng) {
    const limit = Math.exp(-lambda);
    let k = 0;
    let prod = rng();
    while (prod > limit) {
      k++;
      prod *= rng();
    }
    return k;
  }

  /* ---------- The generative definition of the unit ----------
   * A substitution event replaces the base with one of the other three
   * bases, with equal probability. On a branch of length t the number of
   * events follows a Poisson law with mean t. This simulator does not use
   * the kernel's rate constant mu, so it is an independent route to the
   * meaning of "one expected substitution per site".
   */
  function evolve(state, length, rng) {
    let k = poisson(length, rng);
    while (k-- > 0) state = (state + 1 + Math.floor(rng() * 3)) & 3;
    return state;
  }

  function simulateQuartet(tree, n, seed, pInv = 0, keep = 0) {
    const rng = mulberry32(seed);
    const [[i, j], [k, l]] = K.TOPOLOGIES[tree.topo].cherries;
    const rate = 1 / (1 - pInv);
    const counts = new Float64Array(K.CLASSES.length);
    const seqs = keep > 0 ? [[], [], [], []] : null;
    const leaf = [0, 0, 0, 0];
    for (let s = 0; s < n; s++) {
      const u = Math.floor(rng() * 4);
      if (pInv > 0 && rng() < pInv) {
        leaf[0] = leaf[1] = leaf[2] = leaf[3] = u;
      } else {
        const v = evolve(u, tree.t[4] * rate, rng);
        leaf[i] = evolve(u, tree.t[i] * rate, rng);
        leaf[j] = evolve(u, tree.t[j] * rate, rng);
        leaf[k] = evolve(v, tree.t[k] * rate, rng);
        leaf[l] = evolve(v, tree.t[l] * rate, rng);
      }
      counts[K.CLASS_OF_CODE[(leaf[0] << 6) | (leaf[1] << 4) | (leaf[2] << 2) | leaf[3]]]++;
      if (seqs && s < keep) for (let x = 0; x < 4; x++) seqs[x].push(K.CONVENTIONS.alphabet[leaf[x]]);
    }
    return { counts, sequences: seqs ? seqs.map((a) => a.join('')) : null };
  }

  function simulatePair(t, n, seed) {
    const rng = mulberry32(seed);
    let differences = 0;
    for (let s = 0; s < n; s++) {
      const a = Math.floor(rng() * 4);
      if (evolve(a, t, rng) !== a) differences++;
    }
    return { n, differences };
  }

  /* ---------- Small statistics ---------- */
  function lnGamma(x) {
    const g = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
    x -= 1;
    let a = 0.99999999999980993;
    const t = x + 7.5;
    for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  // Upper regularised incomplete gamma Q(a, x).
  function gammaQ(a, x) {
    if (x <= 0) return 1;
    const lnPre = a * Math.log(x) - x - lnGamma(a);
    if (x < a + 1) {
      let sum = 1 / a;
      let term = sum;
      for (let n = 1; n < 500; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
      }
      return Math.max(0, 1 - sum * Math.exp(lnPre));
    }
    // Lentz continued fraction
    let b = x + 1 - a;
    let c = 1 / 1e-300;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return Math.exp(lnPre) * h;
  }

  function chiSquareSurvival(x, df) {
    return gammaQ(df / 2, x / 2);
  }

  // Wilson score interval for a proportion.
  function wilson(successes, n, z = 1.96) {
    if (n === 0) return [0, 1];
    const p = successes / n;
    const den = 1 + (z * z) / n;
    const centre = (p + (z * z) / (2 * n)) / den;
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
    return [Math.max(0, centre - half), Math.min(1, centre + half)];
  }

  /* ---------- Acceptance rule: |f - g| <= a + r |g| ---------- */
  function within(f, g, a, r) {
    return Number.isFinite(f) && Number.isFinite(g) && Math.abs(f - g) <= a + r * Math.abs(g);
  }

  /* ---------- Fixtures shared by the checks ---------- */
  const SAMPLE_TREES = Object.freeze([
    Object.freeze({ topo: 0, t: Object.freeze([1.0, 0.05, 1.0, 0.05, 0.05]) }),
    Object.freeze({ topo: 1, t: Object.freeze([0.3, 0.2, 0.1, 0.4, 0.25]) }),
    Object.freeze({ topo: 2, t: Object.freeze([0.01, 0.8, 0.02, 1.7, 0.6]) }),
  ]);
  const ALL_PATTERNS = Object.freeze(
    Array.from({ length: 256 }, (_, c) => Object.freeze([(c >> 6) & 3, (c >> 4) & 3, (c >> 2) & 3, c & 3]))
  );
  const PERMUTATIONS = (() => {
    const out = [];
    const rec = (prefix, rest) => {
      if (!rest.length) out.push(prefix);
      rest.forEach((x, i) => rec([...prefix, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
    };
    rec([], [0, 1, 2, 3]);
    return out;
  })();
  const T_GRID = Object.freeze([0, 0.01, 0.1, 0.3, 0.75, 1.5, 4]);
  const ROUND_TRIP = Object.freeze({ t: 0.6, n: 20000, seed: 20261006 });

  // The Jukes-Cantor distance as published (Jukes & Cantor 1969; see any
  // phylogenetics text). It is written here from the literature, not
  // derived from the kernel, so it is an external anchor.
  const jcDistance = (p) => -0.75 * Math.log(1 - (4 * p) / 3);

  /* ---------- The check suite ----------
   * rung 1: self-consistency (limits, sums, symmetries)
   * rung 2: an independent algorithm computes the same quantity
   * rung 3: an external anchor ties the code to the definition of the unit
   * rung 4: model adequacy (data-level; see adequacy())
   */
  const CHECKS = Object.freeze([
    {
      id: 'C1',
      rung: 1,
      name: 'Zero-length limit',
      claim: 'P(0) is the identity matrix.',
      run(M) {
        const { same, diff } = M.p(0);
        const worst = Math.max(Math.abs(same - 1), Math.abs(diff));
        return { pass: worst <= 1e-12, worst, detail: `P_same(0) = ${fmt(same)}, P_diff(0) = ${fmt(diff)}` };
      },
    },
    {
      id: 'C2',
      rung: 1,
      name: 'Saturation limit',
      claim: 'Every entry of P(t) goes to 1/4 for a very long branch.',
      run(M) {
        const { same, diff } = M.p(60);
        const worst = Math.max(Math.abs(same - 0.25), Math.abs(diff - 0.25));
        return { pass: worst <= 1e-12, worst, detail: `P_same(60) = ${fmt(same)}, P_diff(60) = ${fmt(diff)}` };
      },
    },
    {
      id: 'C3',
      rung: 1,
      name: 'Rows sum to one',
      claim: 'P_same(t) + 3 P_diff(t) = 1 for every t.',
      run(M) {
        let worst = 0;
        for (const t of T_GRID) {
          const { same, diff } = M.p(t);
          worst = Math.max(worst, Math.abs(same + 3 * diff - 1));
        }
        return { pass: worst <= 1e-12, worst, detail: `max |row sum - 1| over ${T_GRID.length} lengths = ${fmt(worst)}` };
      },
    },
    {
      id: 'C4',
      rung: 1,
      name: 'Chapman-Kolmogorov',
      claim: 'P(s + t) = P(s) P(t): two short branches equal one long branch.',
      run(M) {
        let worst = 0;
        for (const s of T_GRID) {
          for (const t of T_GRID) {
            const a = M.p(s);
            const b = M.p(t);
            const ab = M.p(s + t);
            const same = a.same * b.same + 3 * a.diff * b.diff;
            const diff = a.same * b.diff + a.diff * b.same + 2 * a.diff * b.diff;
            worst = Math.max(worst, Math.abs(ab.same - same), Math.abs(ab.diff - diff));
          }
        }
        return { pass: worst <= 1e-12, worst, detail: `max deviation over ${T_GRID.length ** 2} pairs = ${fmt(worst)}` };
      },
    },
    {
      id: 'C5',
      rung: 1,
      name: 'Pattern probabilities sum to one',
      claim: 'The likelihoods of all 256 site patterns add up to 1.',
      run(M) {
        let worst = 0;
        let lastSum = 0;
        for (const tree of SAMPLE_TREES) {
          let sum = 0;
          for (const pat of ALL_PATTERNS) sum += M.siteLikelihood(pat, tree);
          worst = Math.max(worst, Math.abs(sum - 1));
          lastSum = sum;
        }
        return { pass: worst <= 1e-12, worst, detail: `sum over patterns = ${fmt(lastSum)} (worst |sum - 1| = ${fmt(worst)})` };
      },
    },
    {
      id: 'C6',
      rung: 1,
      name: 'Root-position invariance',
      claim: 'Rooting at either internal node gives the same likelihood.',
      run(M) {
        let worst = 0;
        for (const tree of SAMPLE_TREES) {
          for (const pat of ALL_PATTERNS) {
            worst = Math.max(worst, Math.abs(M.siteLikelihood(pat, tree, 'u') - M.siteLikelihood(pat, tree, 'v')));
          }
        }
        return { pass: worst <= 1e-14, worst, detail: `max |L_u - L_v| over 768 cases = ${fmt(worst)}` };
      },
    },
    {
      id: 'C7',
      rung: 1,
      name: 'Base-relabel invariance',
      claim: 'Renaming the four bases does not change any likelihood.',
      run(M) {
        let worst = 0;
        for (const tree of SAMPLE_TREES) {
          for (let c = 0; c < 256; c += 3) {
            const pat = ALL_PATTERNS[c];
            const ref = M.siteLikelihood(pat, tree);
            for (const sigma of PERMUTATIONS) {
              worst = Math.max(worst, Math.abs(M.siteLikelihood(pat.map((s) => sigma[s]), tree) - ref));
            }
          }
        }
        return { pass: worst <= 1e-14, worst, detail: `max deviation over 24 relabelings = ${fmt(worst)}` };
      },
    },
    {
      id: 'C8',
      rung: 2,
      name: 'Independent algorithm agrees',
      claim: 'Pruning with the closed form equals brute-force summation with a numerical matrix exponential.',
      run(M) {
        let worst = 0;
        let ok = true;
        for (const tree of SAMPLE_TREES) {
          for (const pat of ALL_PATTERNS) {
            const a = M.siteLikelihood(pat, tree);
            const b = M.siteLikelihoodBrute(pat, tree);
            worst = Math.max(worst, Math.abs(a - b));
            if (!within(a, b, 1e-15, 1e-10)) ok = false;
          }
        }
        return { pass: ok, worst, detail: `max |pruning - brute force| over 768 cases = ${fmt(worst)}` };
      },
    },
    {
      id: 'C9',
      rung: 3,
      name: 'Unit anchor',
      claim: 'A branch of length t carries t expected substitutions per site.',
      run(M) {
        const Q = M.rateMatrix();
        let rate = 0;
        for (let i = 0; i < 4; i++) rate -= K.CONVENTIONS.rootPrior * Q[i][i];
        const h = 1e-7;
        const slope = (1 - M.p(h).same) / h;
        const worst = Math.max(Math.abs(rate - 1), Math.abs(slope - 1));
        return {
          pass: Math.abs(rate - 1) <= 1e-12 && Math.abs(slope - 1) <= 1e-5,
          worst,
          detail: `substitutions per unit length: from Q = ${fmt(rate)}, from P'(0) = ${fmt(slope)}`,
        };
      },
    },
    {
      id: 'C10',
      rung: 3,
      name: 'Literature anchor',
      claim: 'The published Jukes-Cantor distance d = -3/4 ln(1 - 4p/3) gives back t.',
      run(M) {
        let worst = 0;
        const shown = [];
        for (const t of [0.05, 0.3, 1.0]) {
          const p = 1 - M.p(t).same;
          const d = jcDistance(p);
          worst = Number.isFinite(d) ? Math.max(worst, Math.abs(d - t)) : Infinity;
          shown.push(`d(${t}) = ${fmt(d)}`);
        }
        return { pass: worst <= 1e-9, worst, detail: shown.join(', ') };
      },
    },
    {
      id: 'C11',
      rung: 3,
      name: 'Generative round trip',
      claim: 'A fit to sequences simulated from the definition of the unit recovers the true length (within 4 standard errors).',
      run(M) {
        const { t, n, seed } = ROUND_TRIP;
        const { differences } = simulatePair(t, n, seed);
        const p0 = M.p(Infinity);
        const p1 = M.p(0);
        const alpha = [p0.same, p0.diff];
        const beta = [p1.same - p0.same, p1.diff - p0.diff];
        const z = K.maximizeAffineLogSum(alpha, beta, [n - differences, differences], 1e-300);
        const tHat = -Math.log(z) / M.variant.mu;
        const ph = differences / n;
        const se = Math.sqrt((ph * (1 - ph)) / n) / (1 - (4 * ph) / 3);
        const err = Math.abs(tHat - t);
        return {
          pass: Number.isFinite(tHat) && err <= 4 * se,
          worst: err,
          detail: `true t = ${t}, fitted t = ${fmt(tHat)}, 4 SE = ${fmt(4 * se)} (n = ${n}, seed ${seed})`,
        };
      },
    },
  ]);

  function fmt(x) {
    if (!Number.isFinite(x)) return String(x);
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a < 1e-4 || a >= 1e5) return x.toExponential(2);
    return Number(x.toPrecision(6)).toString();
  }

  function runChecks(model) {
    return CHECKS.map((c) => {
      const r = c.run(model);
      return { id: c.id, rung: c.rung, name: c.name, pass: r.pass, worst: r.worst, detail: r.detail };
    });
  }

  function mutationMatrix() {
    return K.VARIANTS.map((variant) => {
      const results = runChecks(K.makeModel(variant));
      const failed = results.filter((r) => !r.pass);
      return {
        variant: variant.id,
        name: variant.name,
        results,
        killedBy: failed.map((r) => r.id),
        firstRung: failed.length ? Math.min(...failed.map((r) => r.rung)) : null,
      };
    });
  }

  /* ---------- Trees for the study ---------- */
  function felsensteinTree(tLong, tShort) {
    // True topology T1 = AB|CD. Taxa A and C sit on long branches.
    return { topo: 0, t: [tLong, tShort, tLong, tShort, tShort] };
  }

  /* ---------- Rung 4: model adequacy (G-test of the best JC fit) ---------- */
  function adequacy(counts, options = {}) {
    const M = K.makeModel();
    const { share, fits } = K.mlChoice(counts, M, options);
    const best = fits.reduce((a, b) => (b.logL > a.logL ? b : a));
    const n = counts.reduce((a, b) => a + b, 0);
    const probs = M.classProbabilities({ topo: best.topo, t: best.t }, best.pInv);
    let G = 0;
    for (let c = 0; c < counts.length; c++) {
      if (counts[c] > 0) G += 2 * counts[c] * Math.log(counts[c] / (n * probs[c]));
    }
    const df = K.CLASSES.length - 1 - 5 - (options.invariant ? 1 : 0);
    const pValue = chiSquareSurvival(G, df);
    return { G, df, pValue, pass: pValue >= 1e-3, best, share };
  }

  /* ---------- Infinite-data analysis (exact expected frequencies) ---------- */
  function infiniteData({ tLong, tShort, pInv = 0 }) {
    const M = K.makeModel();
    const truth = felsensteinTree(tLong, tShort);
    const freqs = M.classProbabilities(truth, pInv);
    const parsimony = K.parsimonyScores(freqs);
    const ml = K.mlChoice(freqs, M);
    const mlI = K.mlChoice(freqs, M, { invariant: true });
    return {
      truth,
      pInv,
      freqs: Array.from(freqs),
      parsimony: { scores: parsimony, share: K.parsimonyChoice(freqs) },
      ml: { share: ml.share, logL: ml.fits.map((f) => f.logL), t: ml.fits.map((f) => f.t) },
      mlI: { share: mlI.share, logL: mlI.fits.map((f) => f.logL), t: mlI.fits.map((f) => f.t), pInv: mlI.fits.map((f) => f.pInv) },
    };
  }

  /* ---------- Consistency study: many replicates at several lengths ---------- */
  function studyJobs(params) {
    const jobs = [];
    for (const n of params.ns) {
      for (let r = 0; r < params.replicates; r++) jobs.push({ n, r, seed: deriveSeed(params.seed, n, r) });
    }
    return jobs;
  }

  function runJob(job, params) {
    const M = K.makeModel();
    const { counts } = simulateQuartet(felsensteinTree(params.tLong, params.tShort), job.n, job.seed, params.pInv);
    const out = { n: job.n, r: job.r, pars: K.parsimonyChoice(counts) };
    const tol = 1e-10;
    let jc = null;
    if (params.methods.includes('ml') || params.methods.includes('mlI')) jc = K.mlChoice(counts, M, { tol });
    if (params.methods.includes('ml')) out.ml = jc.share;
    if (params.methods.includes('mlI')) {
      // Start each +I fit from the plain JC fit of the same topology.
      const inits = jc.fits.map((f) => ({ t: f.t, pInv: 0.05 }));
      out.mlI = K.mlChoice(counts, M, { invariant: true, tol, inits }).share;
    }
    return out;
  }

  function summarize(results, params) {
    return params.ns.map((n) => {
      const rows = results.filter((x) => x.n === n);
      const row = { n, replicates: rows.length };
      for (const m of ['pars', ...params.methods]) {
        const share = [0, 1, 2].map((k) => rows.reduce((s, x) => s + x[m][k], 0));
        row[m] = { share: share.map((s) => s / rows.length), ci: wilson(share[0], rows.length) };
      }
      return row;
    });
  }

  /* ---------- SHA-256 (FIPS 180-4), for source identity ---------- */
  const K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  function sha256(text) {
    const msg = new TextEncoder().encode(text);
    const bitLen = msg.length * 8;
    const total = Math.ceil((msg.length + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(msg);
    buf[msg.length] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(total - 8, Math.floor(bitLen / 2 ** 32));
    view.setUint32(total - 4, bitLen >>> 0);
    const H = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + 4 * i);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K256[i] + W[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }
      H[0] += a;
      H[1] += b;
      H[2] += c;
      H[3] += d;
      H[4] += e;
      H[5] += f;
      H[6] += g;
      H[7] += h;
    }
    return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
  }

  // Source identity: the hash of the exact source text of the given
  // functions. Function.prototype.toString returns the source slice, so
  // Node and the browser hash the same bytes.
  function sourceIdentity(fns) {
    return sha256(fns.map((f) => f.toString()).join('\n'));
  }

  /* ---------- Run records ---------- */
  function runId(startedAt, payload) {
    const stamp = startedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    return `${stamp}_${sha256(payload).slice(0, 8)}`;
  }

  function makeManifest(record) {
    const payload = JSON.stringify({
      kind: record.kind,
      params: record.params,
      sourceHash: record.sourceHash,
      startedAt: record.startedAt,
    });
    return Object.assign({ runId: runId(record.startedAt, payload) }, record);
  }

  return Object.freeze({
    splitmix32,
    mulberry32,
    deriveSeed,
    poisson,
    simulateQuartet,
    simulatePair,
    lnGamma,
    chiSquareSurvival,
    wilson,
    within,
    jcDistance,
    CHECKS,
    SAMPLE_TREES,
    ROUND_TRIP,
    runChecks,
    mutationMatrix,
    felsensteinTree,
    adequacy,
    infiniteData,
    studyJobs,
    runJob,
    summarize,
    sha256,
    sourceIdentity,
    makeManifest,
    fmt,
  });
}

if (typeof module === 'object' && module.exports) {
  module.exports = { quartetLabFactory };
}
