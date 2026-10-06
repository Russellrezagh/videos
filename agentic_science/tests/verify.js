#!/usr/bin/env node
/*
 * Verification run for Project QUARTET.
 *
 *   node tests/verify.js            run every check group, write results/verification.json
 *   node tests/verify.js --no-write run the checks only
 *
 * Exit code 0 means every group passed. The JSON file is the run manifest
 * that the page embeds and compares with its own live source hash.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const { QuartetKernel: K, quartetKernelFactory } = require('../src/js/kernel.js');
const { quartetLabFactory } = require('../src/js/lab.js');
const { CourseModel: C } = require('../src/js/course.js');
const L = quartetLabFactory(K);

const startedAt = new Date().toISOString();
const t0 = Date.now();
const groups = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function group(id, name, rung, fn) {
  const started = Date.now();
  let entry;
  try {
    const detail = fn();
    entry = { id, name, rung, pass: true, detail };
  } catch (err) {
    entry = { id, name, rung, pass: false, detail: String(err && err.message ? err.message : err) };
  }
  entry.ms = Date.now() - started;
  groups.push(entry);
  const mark = entry.pass ? 'PASS' : 'FAIL';
  process.stdout.write(`${mark}  ${id}  ${name.padEnd(46)} ${entry.detail}\n`);
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const SCENARIO_A = Object.freeze({ tLong: 1.0, tShort: 0.05, pInv: 0 });
const SCENARIO_B = Object.freeze({ tLong: 0.75, tShort: 0.05, pInv: 0.3 });

/* ---------- Unit level ---------- */

group('G01', 'Site-pattern classes', 1, () => {
  assert(K.CLASSES.length === 15, `expected 15 classes, got ${K.CLASSES.length}`);
  const fall = (k) => [1, 4, 12, 24, 24][k];
  for (const c of K.CLASSES) assert(c.multiplicity === fall(c.blocks), `class ${c.label}: multiplicity ${c.multiplicity}`);
  const total = K.CLASSES.reduce((s, c) => s + c.multiplicity, 0);
  assert(total === 256, `multiplicities sum to ${total}`);
  for (let code = 0; code < 256; code++) {
    const p = [(code >> 6) & 3, (code >> 4) & 3, (code >> 2) & 3, code & 3];
    assert(K.CLASS_OF_CODE[code] === K.classOf(p), `lookup mismatch at ${code}`);
  }
  return '15 classes; multiplicities equal 4!/(4-k)!; sum 256; lookup table agrees';
});

group('G02', 'SHA-256 against node:crypto', 2, () => {
  const inputs = ['', 'abc', 'QUARTET', 'Δ branch length ≥ 0', 'x'.repeat(1000), quartetKernelFactory.toString()];
  for (const s of inputs) {
    const ours = L.sha256(s);
    const ref = crypto.createHash('sha256').update(s, 'utf8').digest('hex');
    assert(ours === ref, `mismatch for input of length ${s.length}`);
  }
  return `${inputs.length} inputs, identical digests`;
});

group('G03', 'Seeded randomness', 1, () => {
  const a = L.mulberry32(42);
  const b = L.mulberry32(42);
  for (let i = 0; i < 1000; i++) assert(a() === b(), 'same seed gave different streams');
  const rng = L.mulberry32(7);
  const n = 200000;
  for (const lambda of [0.05, 1.0, 3.0]) {
    let s = 0;
    for (let i = 0; i < n; i++) s += L.poisson(lambda, rng);
    const mean = s / n;
    const se = Math.sqrt(lambda / n);
    assert(Math.abs(mean - lambda) <= 5 * se, `Poisson(${lambda}) mean ${mean}`);
  }
  return 'same seed, same stream; Poisson means within 5 SE (n = 200 000)';
});

group('G04', 'Chi-square tail probabilities', 3, () => {
  const table = [
    [3.841, 1, 0.05],
    [16.919, 9, 0.05],
    [20.09, 8, 0.01],
    [23.685, 14, 0.05],
  ];
  for (const [x, df, p] of table) {
    const got = L.chiSquareSurvival(x, df);
    assert(near(got, p, 2e-4), `chi2(${x}; ${df}) = ${got}, table ${p}`);
  }
  return '4 published quantiles reproduced within 2e-4';
});

group('G05', 'Fitch parsimony by hand', 3, () => {
  const len = (pattern, topo) => K.fitchLength(pattern, topo);
  assert(len([0, 0, 1, 1], 0) === 1 && len([0, 0, 1, 1], 1) === 2 && len([0, 0, 1, 1], 2) === 2, 'xxyy');
  assert(len([0, 1, 0, 1], 1) === 1 && len([0, 1, 0, 1], 0) === 2, 'xyxy');
  assert(len([0, 0, 0, 0], 0) === 0, 'constant');
  assert([0, 1, 2].every((t) => len([0, 1, 2, 3], t) === 3), 'xyzw');
  assert([0, 1, 2].every((t) => len([0, 0, 0, 1], t) === 1), 'singleton');
  return 'informative, constant and singleton patterns score as counted by hand';
});

/* ---------- The check suite and its own test ---------- */

const matrix = L.mutationMatrix();

group('G06', 'Reference kernel passes C1-C11', 3, () => {
  const ref = matrix.find((r) => r.variant === 'M0');
  const failed = ref.results.filter((r) => !r.pass).map((r) => r.id);
  assert(failed.length === 0, `failed: ${failed.join(', ')}`);
  return '11 of 11 checks pass';
});

group('G07', 'Every mutant is rejected, at the expected rung', 3, () => {
  const expect = { M1: ['C9', 'C10', 'C11'], M2: ['C5', 'C8'], M4: ['C8'] };
  for (const [id, kills] of Object.entries(expect)) {
    const row = matrix.find((r) => r.variant === id);
    assert(JSON.stringify(row.killedBy) === JSON.stringify(kills), `${id} killed by ${row.killedBy.join(',')}`);
  }
  const m3 = matrix.find((r) => r.variant === 'M3');
  assert(m3.killedBy.includes('C1') && m3.firstRung === 1, 'M3 must fail the zero-length limit');
  return 'M1 only by rung 3; M4 only by C8; M2 by C5 and C8; M3 at rung 1';
});

/* ---------- Independent routes to the same numbers ---------- */

group('G08', 'Simulator agrees with exact pattern frequencies', 2, () => {
  const out = [];
  for (const sc of [SCENARIO_A, SCENARIO_B]) {
    const tree = L.felsensteinTree(sc.tLong, sc.tShort);
    const n = 200000;
    const { counts } = L.simulateQuartet(tree, n, 20261006, sc.pInv);
    const exact = K.makeModel().classProbabilities(tree, sc.pInv);
    let G = 0;
    for (let c = 0; c < 15; c++) if (counts[c] > 0) G += 2 * counts[c] * Math.log(counts[c] / (n * exact[c]));
    const p = L.chiSquareSurvival(G, 14);
    assert(p > 1e-3, `G = ${G.toFixed(2)}, p = ${p}`);
    out.push(`pInv ${sc.pInv}: G = ${G.toFixed(2)}, df 14, p = ${p.toFixed(3)}`);
  }
  return out.join('; ');
});

const infA = L.infiniteData(SCENARIO_A);
const infB = L.infiniteData(SCENARIO_B);
const argmax = (a) => a.indexOf(Math.max(...a));

group('G09', 'Scenario A with infinite data', 3, () => {
  assert(argmax(infA.parsimony.share) === 1, 'parsimony should pick T2 (AC|BD)');
  assert(argmax(infA.ml.share) === 0, 'ML should pick T1 (AB|CD)');
  const truth = infA.truth.t;
  infA.ml.t[0].forEach((x, i) => assert(near(x, truth[i], 1e-6), `branch ${i}: ${x} vs ${truth[i]}`));
  return 'parsimony picks AC|BD; ML picks AB|CD and recovers all 5 branch lengths within 1e-6';
});

group('G10', 'Scenario B with infinite data', 4, () => {
  assert(argmax(infB.ml.share) === 1, 'JC69 ML should pick T2 under model misspecification');
  assert(argmax(infB.mlI.share) === 0, 'JC69+I ML should pick T1');
  assert(near(infB.mlI.pInv[0], SCENARIO_B.pInv, 1e-6), `pInv ${infB.mlI.pInv[0]}`);
  const truth = infB.truth.t;
  infB.mlI.t[0].forEach((x, i) => assert(near(x, truth[i], 1e-5), `branch ${i}: ${x} vs ${truth[i]}`));
  return 'JC69 picks AC|BD; JC69+I picks AB|CD, recovers pInv = 0.3 and branch lengths within 1e-5';
});

group('G11', '+I fit reports convention units (regression)', 3, () => {
  // During construction the first +I fit reported variable-site lengths,
  // t / (1 - pInv), instead of the convention unit. This group keeps it fixed.
  const M = K.makeModel();
  const tree = L.felsensteinTree(SCENARIO_B.tLong, SCENARIO_B.tShort);
  const freqs = M.classProbabilities(tree, SCENARIO_B.pInv);
  const fit = M.fit(freqs, 0, { invariant: true });
  const again = M.logLikelihood(freqs, { topo: 0, t: fit.t }, fit.pInv);
  assert(near(again, fit.logL, 1e-12 * Math.abs(fit.logL)), `logL ${fit.logL} vs recomputed ${again}`);
  assert(near(fit.t[0], SCENARIO_B.tLong, 1e-5), `long branch ${fit.t[0]} (variable-site units would be ${(SCENARIO_B.tLong / 0.7).toFixed(4)})`);
  return `reported long branch ${fit.t[0].toFixed(6)} (truth 0.75; the old bug gave 1.0714)`;
});

group('G12', 'ML optimum is a local maximum', 1, () => {
  const M = K.makeModel();
  const tree = L.felsensteinTree(SCENARIO_A.tLong, SCENARIO_A.tShort);
  const { counts } = L.simulateQuartet(tree, 3000, 99);
  const fit = M.fit(counts, 0);
  for (let b = 0; b < 5; b++) {
    for (const d of [-1e-4, 1e-4]) {
      const t = fit.t.slice();
      t[b] = Math.max(0, t[b] + d);
      assert(M.logLikelihood(counts, { topo: 0, t }) <= fit.logL + 1e-9, `branch ${b} step ${d} improves logL`);
    }
  }
  return 'no single-branch step of 1e-4 improves the fitted log-likelihood';
});

let adequacyRecord = null;
group('G13', 'Model adequacy (rung 4)', 4, () => {
  const tree = L.felsensteinTree(SCENARIO_A.tLong, SCENARIO_A.tShort);
  const jcData = L.simulateQuartet(tree, 5000, 11, 0).counts;
  const iData = L.simulateQuartet(L.felsensteinTree(SCENARIO_B.tLong, SCENARIO_B.tShort), 5000, 11, SCENARIO_B.pInv).counts;
  const a = L.adequacy(jcData);
  const b = L.adequacy(iData);
  const c = L.adequacy(iData, { invariant: true });
  assert(a.pass, `JC69 rejected on JC69 data (p = ${a.pValue})`);
  assert(!b.pass, `JC69 accepted on +I data (p = ${b.pValue})`);
  assert(c.pass, `JC69+I rejected on +I data (p = ${c.pValue})`);
  adequacyRecord = {
    jcOnJcData: { G: a.G, df: a.df, pValue: a.pValue },
    jcOnIData: { G: b.G, df: b.df, pValue: b.pValue },
    jciOnIData: { G: c.G, df: c.df, pValue: c.pValue },
  };
  return `JC69 on JC69 data p = ${a.pValue.toFixed(3)}; JC69 on +I data p = ${b.pValue.toExponential(1)}; JC69+I on +I data p = ${c.pValue.toFixed(3)}`;
});

group('G14', 'Course model integrity', 1, () => {
  const mechIds = new Set(C.MECHANISMS.map((m) => m.id));
  const codes = new Set(['', 'sep', 'rec', 'shr', 'lim']);
  for (const m of C.MECHANISMS) {
    for (const s of C.STATES) {
      const cell = m.cells[s.id];
      assert(Array.isArray(cell) && codes.has(cell[0]), `${m.id} has no valid cell for ${s.id}`);
    }
  }
  for (const s of C.SCENARIOS) {
    assert(s.options.includes(s.answer), `${s.id}: answer not in options`);
    s.options.forEach((o) => assert(mechIds.has(o), `${s.id}: unknown mechanism ${o}`));
  }
  const ids = new Set(C.TASKS.map((t) => t.id));
  C.TASKS.forEach((t) => t.deps.forEach((d) => assert(ids.has(d), `${t.id}: unknown dependency ${d}`)));
  const order = C.topoOrder();
  assert(order.length === C.TASKS.length, 'topological order is incomplete');
  const entityIds = new Set(C.ENTITIES.map((e) => e.id));
  C.RELATIONS.forEach(([a, b]) => assert(entityIds.has(a) && entityIds.has(b), `relation ${a}-${b}`));
  const evidence = new Set(C.EVIDENCE_IDS);
  C.CLAIMS.forEach((k) => k.evidence.forEach((e) => assert(evidence.has(e), `${k.id}: unknown evidence ${e}`)));
  C.CLAIMS.forEach((k) => assert(k.status !== 'supported' || k.evidence.length > 0, `${k.id}: supported without evidence`));
  C.WEEK.forEach((w) => w.mech.forEach((m) => assert(mechIds.has(m), `${w.day}: unknown mechanism ${m}`)));
  assert(C.downstream('T02').size === C.TASKS.length - 2, 'T02 should feed every task except T01 and itself');
  return `${C.MECHANISMS.length} mechanisms x ${C.STATES.length} states; ${C.SCENARIOS.length} scenarios; ${C.TASKS.length} tasks, acyclic; ${C.CLAIMS.length} claims cite real evidence`;
});

/* ---------- Recorded consistency studies ---------- */

function study(label, scenario, methods) {
  const params = Object.assign({}, scenario, { ns: [100, 300, 1000, 3000, 10000], replicates: 40, seed: 20261006, methods });
  const started = Date.now();
  const results = L.studyJobs(params).map((job) => L.runJob(job, params));
  return { label, params, summary: L.summarize(results, params), ms: Date.now() - started };
}

const studies = {};

group('G15', 'Study A: parsimony is consistently wrong', 3, () => {
  studies.A = study('A', SCENARIO_A, ['ml']);
  const last = studies.A.summary[studies.A.summary.length - 1];
  assert(last.pars.share[0] === 0, `parsimony picked the true tree in ${last.pars.share[0]}`);
  assert(last.ml.share[0] >= 0.95, `ML picked the true tree in only ${last.ml.share[0]}`);
  return studies.A.summary.map((r) => `n=${r.n}: pars ${r.pars.share[0].toFixed(2)}, ML ${r.ml.share[0].toFixed(2)}`).join('; ');
});

group('G16', 'Study B: the wrong model is consistently wrong', 4, () => {
  studies.B = study('B', SCENARIO_B, ['ml', 'mlI']);
  const last = studies.B.summary[studies.B.summary.length - 1];
  assert(last.ml.share[0] <= 0.05, `JC69 ML picked the true tree in ${last.ml.share[0]}`);
  assert(last.mlI.share[0] >= 0.95, `JC69+I picked the true tree in only ${last.mlI.share[0]}`);
  return studies.B.summary.map((r) => `n=${r.n}: JC ${r.ml.share[0].toFixed(2)}, JC+I ${r.mlI.share[0].toFixed(2)}`).join('; ');
});

/* ---------- Manifest ---------- */

const finishedAt = new Date().toISOString();
const passed = groups.filter((g) => g.pass).length;
const fileHash = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');

const manifest = L.makeManifest({
  kind: 'verification',
  command: 'node tests/verify.js',
  startedAt,
  finishedAt,
  durationMs: Date.now() - t0,
  sourceHash: L.sourceIdentity([quartetKernelFactory, quartetLabFactory]),
  sourceHashCovers: 'Function source of quartetKernelFactory and quartetLabFactory',
  fileHashes: {
    'src/js/kernel.js': fileHash('src/js/kernel.js'),
    'src/js/lab.js': fileHash('src/js/lab.js'),
    'src/js/course.js': fileHash('src/js/course.js'),
    'tests/verify.js': fileHash('tests/verify.js'),
  },
  environment: {
    runtime: `Node ${process.version}`,
    v8: process.versions.v8,
    platform: `${os.platform()} ${os.arch()}`,
  },
  params: { scenarioA: SCENARIO_A, scenarioB: SCENARIO_B, seed: 20261006 },
  summary: { groups: groups.length, passed, failed: groups.length - passed },
  groups,
  mutationMatrix: matrix.map((r) => ({
    variant: r.variant,
    name: r.name,
    killedBy: r.killedBy,
    firstRung: r.firstRung,
    results: r.results.map((x) => ({ id: x.id, rung: x.rung, pass: x.pass, detail: x.detail })),
  })),
  infiniteData: {
    A: { parsimony: infA.parsimony, mlShare: infA.ml.share, mlLogL: infA.ml.logL, mlT1: infA.ml.t[0] },
    B: { parsimony: infB.parsimony, mlShare: infB.ml.share, mlIShare: infB.mlI.share, mlIpInv: infB.mlI.pInv[0], mlIT1: infB.mlI.t[0] },
  },
  adequacy: adequacyRecord,
  studies,
  limitations: [
    'All sequence data are simulated. No real organism was analysed.',
    'Four taxa only. JC69 and JC69+I only. No gamma rates, no compositional bias.',
    'The check groups share some assumptions. They are not 16 independent proofs.',
  ],
});

if (!process.argv.includes('--no-write')) {
  const out = path.join(ROOT, 'results', 'verification.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
  process.stdout.write(`\nWrote ${path.relative(ROOT, out)}\n`);
}
process.stdout.write(`Run ${manifest.runId}: ${passed}/${groups.length} groups passed in ${manifest.durationMs} ms\n`);
process.stdout.write(`Source hash ${manifest.sourceHash}\n`);
process.exit(passed === groups.length ? 0 : 1);
