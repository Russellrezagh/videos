#!/usr/bin/env node
/*
 * Checks of the PCR semantic model (src/model.js). Every number the page
 * shows comes from these functions, so they are tested here first.
 * usage: node tests/verify.mjs   (exit 1 on any failure)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../src/model.js');

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// 1. strand bookkeeping against the closed forms, cycle 0..30
{
  let ok = true;
  let why = '';
  for (let n = 0; n <= 30; n++) {
    const c = P.census(n);
    const conds = [
      [c.strands === 2 ** (n + 1), 'strands = 2^(n+1)'],
      [c.L === P.closed.longStrands(n), 'long = 2n'],
      [c.S === P.closed.shortStrands(n), 'short = 2^(n+1) - 2n - 2'],
      [n === 0 || c.duplexes === P.closed.duplexes(n), 'duplexes = 2^n'],
      [n === 0 || c.SS === P.closed.amplicons(n), 'amplicons = 2^n - 2n'],
      [c.O === 2, 'two originals forever'],
    ];
    for (const [k, w] of conds) if (!k) { ok = false; why = `n=${n}: ${w}`; }
  }
  check('census matches closed forms for n = 0..30', ok, why);
  const c3 = P.census(3);
  check('first amplicons appear in cycle 3 (2 of 8 duplexes)', P.census(2).SS === 0 && c3.SS === 2 && c3.duplexes === 8, JSON.stringify({ OL: c3.OL, LS: c3.LS, SS: c3.SS }));
  check('after 30 cycles amplicons are > 99.99999 % of duplexes', P.census(30).SS / 2 ** 30 > 0.9999999);
}

// 2. growth and its inverse
{
  const N = P.copies(100, 0.9, 28.7);
  check('cyclesTo inverts copies', close(P.cyclesTo(100, N, 0.9), 28.7, 1e-12));
  check('worked example: 100 copies to 1e10 at E = 0.9 takes 28.7 cycles', Math.abs(P.cyclesTo(100, 1e10, 0.9) - 28.7) < 0.05, P.cyclesTo(100, 1e10, 0.9).toFixed(3));
  const g = P.grow(1e3, 1, 60, 1e12);
  check('plateau: the logistic never exceeds K', Math.max(...g) <= 1e12 * (1 + 1e-9));
  check('early cycles are exponential (within 0.1 %)', Math.abs(g[10] / P.copies(1e3, 1, 10) - 1) < 1e-3);
}

// 3. qPCR: Ct and the standard curve recover the efficiency they were made with
{
  for (const E of [0.8, 0.9, 1.0]) {
    const pts = [1e7, 1e6, 1e5, 1e4, 1e3].map((N0) => ({ N0, ct: P.thresholdCycle(P.fluorescence(N0, E, 50, { K: 1e14 }), 0.25) }));
    const sc = P.standardCurve(pts);
    check(`standard curve recovers E = ${E}`, Math.abs(sc.E - E) < 0.01, `E = ${sc.E.toFixed(4)}, slope ${sc.slope.toFixed(3)}, R² ${sc.r2.toFixed(5)}`);
  }
  const sc1 = P.standardCurve([{ N0: 10, ct: 30 }, { N0: 100, ct: 30 - Math.log(10) / Math.log(2) }]);
  check('slope -3.32 per decade means E = 100 %', Math.abs(sc1.slope + 3.3219) < 1e-3 && Math.abs(sc1.E - 1) < 1e-9);
  check('ΔΔCt = 1 at E = 1 halves the expression', close(P.foldChange(1), 0.5));
  // quantify the unknown of the worked example on the page
  const std = [[1e6, 15.1], [1e5, 18.4], [1e4, 21.8], [1e3, 25.1]].map(([N0, ct]) => ({ N0, ct }));
  const s = P.standardCurve(std);
  check('worked example standard curve is well behaved', s.r2 > 0.999 && s.E > 0.95 && s.E < 1.05, `slope ${s.slope.toFixed(3)}, E ${(100 * s.E).toFixed(1)} %, unknown(Ct 20) = ${s.quantify(20).toFixed(0)}`);
}

// 4. primers
{
  check('reverse complement is an involution', P.revcomp(P.revcomp('ATGCCGTAAGT')) === 'ATGCCGTAAGT');
  check('reverse complement of ATGC is GCAT', P.revcomp('ATGC') === 'GCAT');
  check('Wallace: AAAAATTTTTGGGGGCCCCC = 60 °C', P.tmWallace('AAAAATTTTTGGGGGCCCCC') === 60);
  const p = 'AGCGTCAGTTCCAGTACCTG';
  const tm = P.tmNN(p);
  check('nearest-neighbour Tm of a 20-mer with 55 % GC lies in 55-65 °C', tm > 55 && tm < 65, tm.toFixed(2));
  check('NN Tm rises with GC content', P.tmNN('GCGCGGCCGCGGCGCCGCGG') > P.tmNN('ATATTAATTATAATATTAAT') + 30);
  check('3′ self-complementarity found in a palindromic tail', P.threePrimeComplement('ACGTAGCTAGCATGCATG') >= 6);
}

// 5. annealing teaching model is monotone in the right directions
{
  const lo = P.anneal({ Ta: 50 });
  const mid = P.anneal({ Ta: 57 });
  const hi = P.anneal({ Ta: 66 });
  check('binding falls as annealing temperature rises', lo.on > mid.on && mid.on > hi.on);
  check('specificity rises as annealing temperature rises', lo.specificity < mid.specificity && mid.specificity < hi.specificity);
  check('extension shorter than needed lowers efficiency', P.cycleEfficiency({ Ta: 56, extSeconds: 10, length: 1000 }).E < 0.2);
}

// 6. digital PCR
{
  const lam = 1.3;
  const p = 1 - P.poissonZero(lam);
  check('dPCR: lambda from the positive fraction inverts Poisson', close(P.dpcrLambda(p * 20000, 20000), lam, 1e-12));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
