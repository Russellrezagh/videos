/*
 * PCR — the shared semantic model.
 *
 * Every view on the page (prose, equations, figures, the guided animation,
 * the interactives, the questions) reads its objects and its numbers from
 * here. Nothing in this file touches the DOM, a clock or a random number
 * generator except through an explicit seed, so tests/verify.mjs can check
 * all of it in Node.
 *
 *   OBJECTS   the things the lesson talks about, each with a semantic role
 *   ROLES     role -> colour token (the same in every view)
 *   census    the exact strand bookkeeping of an ideal reaction
 *   grow      copies per cycle with efficiency and a plateau
 *   qpcr      fluorescence curves, threshold cycles, standard curves
 *   primer    sequence tools and three melting-temperature estimates
 *   anneal    a two-state teaching model of primer binding and specificity
 *   dpcr      Poisson counting for digital PCR
 */
const PCR = (() => {
  'use strict';

  /* ------------------------------------------------------------ semantics */
  // Colour roles follow one rule: what the reaction starts with is blue,
  // what it makes is orange, what does the work is green, what you can set
  // is purple, what goes wrong is red, background is grey.
  const ROLES = Object.freeze({
    source: { token: '--c-source', meaning: 'input: the template you start with' },
    product: { token: '--c-product', meaning: 'output: what the reaction makes' },
    agent: { token: '--c-agent', meaning: 'operation: what does the copying' },
    param: { token: '--c-param', meaning: 'a quantity you set or measure' },
    fault: { token: '--c-fault', meaning: 'a way it goes wrong' },
    context: { token: '--c-context', meaning: 'context' },
  });

  const OBJECTS = Object.freeze({
    template: { name: 'template DNA', role: 'source', def: 'The double-stranded DNA that contains the target. It is only read, never consumed.' },
    target: { name: 'target region', role: 'source', def: 'The stretch between the two primer sites. Only this stretch is amplified.' },
    primer: { name: 'primers', role: 'agent', def: 'Two short single strands (about 18–25 bases) that bind the two ends of the target, one on each strand. They define what gets copied.' },
    polymerase: { name: 'DNA polymerase', role: 'agent', def: 'The enzyme that extends a primer, adding nucleotides to its 3′ end. PCR uses a heat-stable one, such as Taq.' },
    dntp: { name: 'dNTPs', role: 'agent', def: 'The four building blocks dATP, dCTP, dGTP and dTTP. They are used up as copies are made.' },
    mg: { name: 'Mg²⁺', role: 'param', def: 'The polymerase needs magnesium ions to work; their concentration also tunes how tightly primers bind.' },
    newstrand: { name: 'new strand', role: 'product', def: 'A strand made during the reaction. It starts at a primer.' },
    amplicon: { name: 'amplicon', role: 'product', def: 'The double-stranded product with exactly the target length, from one primer site to the other.' },
    temperature: { name: 'temperature', role: 'param', def: 'The only thing a thermal cycler changes: hot to separate, cooler to bind, warm to copy.' },
    cycle: { name: 'cycle n', role: 'param', def: 'One round of separate, bind, copy. A typical run has 25–40 cycles.' },
    efficiency: { name: 'efficiency E', role: 'param', def: 'The fraction of templates copied in one cycle. E = 1 means perfect doubling.' },
    threshold: { name: 'threshold', role: 'param', def: 'In real-time PCR, a fluorescence level set above the background noise.' },
    ct: { name: 'Ct', role: 'param', def: 'The (fractional) cycle at which a sample’s fluorescence crosses the threshold.' },
    dimer: { name: 'primer-dimer', role: 'fault', def: 'A short artefact made when two primers bind each other instead of the template.' },
    contamination: { name: 'contamination', role: 'fault', def: 'Stray template from earlier reactions. Exponential copying amplifies it too.' },
  });

  /* ----------------------------------------------------- strand bookkeeping */
  // An ideal reaction (E = 1) that starts from ONE double-stranded template.
  // Three kinds of strand exist:
  //   O  an original strand, longer than the target on both sides
  //   L  a long new strand: starts at a primer, runs past the far primer site
  //   S  a short new strand: exactly primer to primer (the target length)
  // In every cycle every strand is a template for exactly one new strand:
  //   O -> L,   L -> S,   S -> S.
  // At the end of cycle n each new strand is still paired with its template,
  // so the double-stranded molecules are O:L, L:S and S:S (the amplicons).
  function census(n) {
    let O = 2;
    let L = 0;
    let S = 0;
    const history = [{ n: 0, O, L, S, OL: 0, LS: 0, SS: 0 }];
    for (let k = 1; k <= n; k++) {
      const prev = { O, L, S };
      L = prev.L + prev.O;
      S = 2 * prev.S + prev.L;
      history.push({ n: k, O, L, S, OL: prev.O, LS: prev.L, SS: prev.S });
    }
    const last = history[history.length - 1];
    return { ...last, strands: O + L + S, duplexes: n === 0 ? 1 : last.OL + last.LS + last.SS, history };
  }
  // closed forms (tests/verify.mjs checks them against census)
  const closed = {
    longStrands: (n) => 2 * n,
    shortStrands: (n) => 2 ** (n + 1) - 2 * n - 2,
    amplicons: (n) => (n < 1 ? 0 : 2 ** n - 2 * n),
    duplexes: (n) => 2 ** n,
  };

  /* ------------------------------------------------------------- growth */
  // Expected copies after n cycles with per-cycle efficiency E (0..1):
  //   N_n = N0 (1 + E)^n
  const copies = (N0, E, n) => N0 * (1 + E) ** n;
  // cycles needed to go from N0 to N
  const cyclesTo = (N0, N, E) => Math.log(N / N0) / Math.log(1 + E);

  // With a finite supply of primers and dNTPs the per-cycle efficiency falls
  // as product accumulates. A simple discrete logistic captures the shape:
  //   N_{k+1} = N_k (1 + E (1 - N_k / K))
  // K is the plateau (copies the reaction can hold). This is a teaching
  // model of the plateau, not a kinetic model of a real tube.
  function grow(N0, E, cycles, K = 1e12) {
    const out = [N0];
    let N = N0;
    for (let k = 1; k <= cycles; k++) {
      N = N * (1 + E * Math.max(0, 1 - N / K));
      out.push(N);
    }
    return out;
  }

  /* --------------------------------------------------------------- qPCR */
  // Fluorescence = background + (signal per copy) × copies. The first cycle
  // where it crosses the threshold, interpolated on a log scale, is Ct.
  function fluorescence(N0, E, cycles, { K = 1e12, background = 0.05, perCopy = 1e-11 } = {}) {
    return grow(N0, E, cycles, K).map((N) => background + perCopy * N);
  }
  function thresholdCycle(curve, threshold) {
    for (let k = 1; k < curve.length; k++) {
      if (curve[k] >= threshold && curve[k - 1] < threshold) {
        const a = Math.log(curve[k - 1]);
        const b = Math.log(curve[k]);
        return k - 1 + (Math.log(threshold) - a) / (b - a);
      }
    }
    return null;
  }
  // Least-squares line Ct = m log10(N0) + b, and the efficiency it implies:
  //   one cycle multiplies by (1 + E), so a 10x dilution costs
  //   log(10)/log(1+E) cycles:  m = -1/log10(1+E)  ->  E = 10^(-1/m) - 1
  function standardCurve(points) {
    const xs = points.map((p) => Math.log10(p.N0));
    const ys = points.map((p) => p.ct);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my);
      sxx += (xs[i] - mx) ** 2;
      syy += (ys[i] - my) ** 2;
    }
    const m = sxy / sxx;
    const b = my - m * mx;
    const r2 = (sxy * sxy) / (sxx * syy);
    return { slope: m, intercept: b, r2, E: 10 ** (-1 / m) - 1, quantify: (ct) => 10 ** ((ct - b) / m) };
  }
  // Relative quantification (ΔΔCt): fold change = (1+E)^(-ΔΔCt); 2^(-ΔΔCt) when E = 1
  const foldChange = (ddct, E = 1) => (1 + E) ** -ddct;

  /* ------------------------------------------------------------- primers */
  const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const clean = (s) => String(s).toUpperCase().replace(/[^ACGT]/g, '');
  const revcomp = (s) => [...clean(s)].reverse().map((b) => COMP[b]).join('');
  const gcFraction = (s) => {
    const q = clean(s);
    return q.length ? (q.match(/[GC]/g) || []).length / q.length : 0;
  };
  // Wallace rule (short oligos): 2 °C per A·T, 4 °C per G·C
  const tmWallace = (s) => {
    const q = clean(s);
    const gc = (q.match(/[GC]/g) || []).length;
    return 2 * (q.length - gc) + 4 * gc;
  };
  // GC-content formula for longer oligos: 64.9 + 41 (G+C - 16.4) / N
  const tmBasic = (s) => {
    const q = clean(s);
    const gc = (q.match(/[GC]/g) || []).length;
    return 64.9 + (41 * (gc - 16.4)) / q.length;
  };
  // Nearest-neighbour estimate, SantaLucia (1998) unified parameters
  // (ΔH kcal/mol, ΔS cal/K/mol, 1 M NaCl), salt correction on ΔS,
  // primer in excess over template: Tm = ΔH / (ΔS + R ln C) - 273.15.
  const NN = {
    AA: [-7.9, -22.2], TT: [-7.9, -22.2], AT: [-7.2, -20.4], TA: [-7.2, -21.3],
    CA: [-8.5, -22.7], TG: [-8.5, -22.7], GT: [-8.4, -22.4], AC: [-8.4, -22.4],
    CT: [-7.8, -21.0], AG: [-7.8, -21.0], GA: [-8.2, -22.2], TC: [-8.2, -22.2],
    CG: [-10.6, -27.2], GC: [-9.8, -24.4], GG: [-8.0, -19.9], CC: [-8.0, -19.9],
  };
  const INIT = { GC: [0.1, -2.8], AT: [2.3, 4.1] };
  function tmNN(s, { na = 0.05, primer = 250e-9 } = {}) {
    const q = clean(s);
    if (q.length < 2) return NaN;
    let dH = 0;
    let dS = 0;
    for (const end of [q[0], q[q.length - 1]]) {
      const [h, e] = 'GC'.includes(end) ? INIT.GC : INIT.AT;
      dH += h;
      dS += e;
    }
    for (let i = 0; i < q.length - 1; i++) {
      const [h, e] = NN[q.slice(i, i + 2)];
      dH += h;
      dS += e;
    }
    dS += 0.368 * (q.length - 1) * Math.log(na);
    return (dH * 1000) / (dS + 1.987 * Math.log(primer)) - 273.15;
  }
  // Longest run where the primer's 3' end could pair with itself or with the
  // other primer (a crude primer-dimer check: 3' complementarity of >= 4 is risky)
  function threePrimeComplement(a, b = a) {
    const x = clean(a);
    const y = revcomp(b);
    let best = 0;
    for (let k = 3; k <= Math.min(10, x.length); k++) {
      const tail = x.slice(-k);
      if (y.includes(tail)) best = k;
    }
    return best;
  }
  function primerReport(fwd, rev) {
    const one = (s) => {
      const q = clean(s);
      const last2 = q.slice(-2);
      return {
        seq: q,
        length: q.length,
        gc: gcFraction(q),
        wallace: tmWallace(q),
        basic: tmBasic(q),
        nn: tmNN(q),
        clamp: (last2.match(/[GC]/g) || []).length,
        self3: threePrimeComplement(q),
      };
    };
    const f = one(fwd);
    const r = one(rev);
    const checks = [
      { id: 'len', ok: [f, r].every((p) => p.length >= 18 && p.length <= 25), text: 'length 18–25 bases' },
      { id: 'gc', ok: [f, r].every((p) => p.gc >= 0.4 && p.gc <= 0.6), text: 'GC content 40–60 %' },
      { id: 'tm', ok: [f, r].every((p) => p.nn >= 52 && p.nn <= 65), text: 'Tm 52–65 °C' },
      { id: 'pair', ok: Math.abs(f.nn - r.nn) <= 5, text: 'the two Tm within 5 °C' },
      { id: 'clamp', ok: [f, r].every((p) => p.clamp >= 1 && p.clamp <= 2), text: '3′ end: one or two G/C (a “clamp”)' },
      { id: 'dimer', ok: threePrimeComplement(f.seq, r.seq) < 4 && f.self3 < 4 && r.self3 < 4, text: 'no 3′ complementarity of 4 or more (primer-dimers)' },
    ];
    return { f, r, checks, cross3: threePrimeComplement(f.seq, r.seq) };
  }

  /* ------------------------------------------------- annealing (teaching model) */
  // Two-state binding: the fraction of primer bound at a site with melting
  // temperature Tm, at annealing temperature Ta, is a sigmoid of (Ta - Tm).
  // Off-target sites match imperfectly, so their Tm is lower by dTm; there
  // are many of them. Specificity = on-target share of all binding.
  // Width w and the numbers are illustrative, chosen to show the shape.
  const bound = (Ta, Tm, w = 1.8) => 1 / (1 + Math.exp((Ta - Tm) / w));
  function anneal({ Ta, Tm = 60, offsets = 9, offSites = 400, w = 1.8 }) {
    const on = bound(Ta, Tm, w);
    const off = bound(Ta, Tm - offsets, w);
    const specificity = on / (on + 1e-3 * offSites * off);
    return { on, off, specificity };
  }
  // extension: Taq is usually given about 1 min per 1000 bases at 72 °C
  const extensionComplete = (seconds, length, basesPerSecond = 1000 / 60) => Math.min(1, (seconds * basesPerSecond) / length);
  function cycleEfficiency({ Ta, Tm = 60, extSeconds = 30, length = 500 }) {
    const a = anneal({ Ta, Tm });
    return { ...a, ext: extensionComplete(extSeconds, length), E: Math.min(1, a.on * extensionComplete(extSeconds, length)) };
  }

  /* ---------------------------------------------------------- digital PCR */
  // Partition the sample into many droplets; a droplet lights up if it got
  // at least one copy. Copies per droplet follow a Poisson law with mean
  // lambda, so the fraction of empty droplets is e^-lambda:
  //   lambda = -ln(1 - p)   (p = fraction positive)
  const dpcrLambda = (positives, partitions) => -Math.log(1 - positives / partitions);
  const poissonZero = (lambda) => Math.exp(-lambda);

  /* ---------------------------------------------------------- small utils */
  // a seeded generator for the noise in simulated curves
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const sci = (x, d = 2) => {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(x)));
    if (e >= -2 && e < 5) return x.toLocaleString('en-US', { maximumFractionDigits: d });
    const m = x / 10 ** e;
    return `${m.toFixed(d)} × 10${String(e).replace('-', '⁻').replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c])}`;
  };

  return {
    ROLES, OBJECTS, census, closed, copies, cyclesTo, grow, fluorescence, thresholdCycle, standardCurve, foldChange,
    revcomp, gcFraction, tmWallace, tmBasic, tmNN, threePrimeComplement, primerReport,
    bound, anneal, extensionComplete, cycleEfficiency, dpcrLambda, poissonZero, mulberry32, sci, clean,
  };
})();
if (typeof module === 'object' && module.exports) module.exports = PCR;
