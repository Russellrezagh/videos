#!/usr/bin/env node
/*
 * Checks every identity the film states, on the kernel that draws it.
 * usage: node tests/verify.mjs      (exit code 1 on any failure)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const RL = require('../src/js/rl.js');

let pass = 0;
let fail = 0;
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * (1 + Math.abs(b));
function check(name, ok, detail = '') {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
}
const vecClose = (a, b, tol) => a.every((x, i) => close(x, b[i], tol));

// the film's running bandit: three answers to one prompt
const Z = [0.6, 0.2, -0.3];
const R = [1.0, 0.3, 0.0];

/* distributions */
const pi = RL.softmax(Z);
check('softmax sums to 1', close(RL.sum(pi), 1, 1e-12));
check('log-softmax matches log of softmax', vecClose(RL.logSoftmax(Z), pi.map(Math.log), 1e-12));
check('a response log-probability is the sum of its token log-probabilities', close(RL.sequenceLogProb([0.9, 0.5, 0.8]), Math.log(0.9 * 0.5 * 0.8), 1e-12));
check('KL is zero only against itself', close(RL.kl(pi, pi), 0, 1e-12) && RL.kl(pi, [1 / 3, 1 / 3, 1 / 3]) > 0);

/* the policy gradient */
const J = (z) => RL.expectedReward(RL.softmax(z), R);
const h = 1e-6;
const numeric = Z.map((_, b) => {
  const up = Z.slice();
  const dn = Z.slice();
  up[b] += h;
  dn[b] -= h;
  return (J(up) - J(dn)) / (2 * h);
});
check('exact gradient pi_b (r_b - J) matches finite differences', vecClose(RL.exactGradient(Z, R), numeric, 1e-6));
check('the score has mean zero: E[grad log pi] = 0', RL.expectedScore(Z).every((x) => close(x, 0, 1e-12)));
for (const b of [0, 0.5, -3, 10]) {
  const st = RL.estimatorStats(Z, R, b);
  check(`REINFORCE with baseline ${b} is unbiased`, vecClose(st.mean, RL.exactGradient(Z, R), 1e-12));
}
const bStar = RL.optimalBaseline(Z, R);
const vStar = RL.estimatorStats(Z, R, bStar).variance;
check('the optimal baseline minimises the variance', [-0.05, 0.05].every((d) => RL.estimatorStats(Z, R, bStar + d).variance > vStar));
check('a mean-reward baseline beats no baseline when all rewards are positive', RL.estimatorStats(Z, [11, 10.3, 10], RL.expectedReward(pi, [11, 10.3, 10])).variance < RL.estimatorStats(Z, [11, 10.3, 10], 0).variance);
{
  const rand = RL.rng(3);
  const N = 200000;
  const acc = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    const a = RL.sampleIndex(pi, rand());
    RL.reinforceSample(Z, R, a).forEach((g, b) => (acc[b] += g / N));
  }
  check('the average of sampled REINFORCE gradients approaches the exact gradient', vecClose(acc, RL.exactGradient(Z, R), 2e-2), acc.map((x) => x.toFixed(4)).join(' '));
}
{
  const final = (baseline) => {
    let s = 0;
    for (let seed = 1; seed <= 20; seed++) s += RL.trainBandit({ z0: [0, 0, 0, 0, 0], r: [1, 0.8, 0.6, 0.4, 0.2].map((x) => x + 5), steps: 60, lr: 0.3, batch: 4, baseline, seed }).at(-1).J;
    return s / 20;
  };
  const none = final('none');
  const loo = final('loo');
  check('with rewards near 5, a leave-one-out baseline learns faster than none', loo > none, `J: none ${none.toFixed(3)}, loo ${loo.toFixed(3)}`);
}

/* credit assignment */
check('reward-to-go', vecClose(RL.rewardToGo([0, 0, 1], 1), [1, 1, 1], 1e-12) && vecClose(RL.rewardToGo([1, 0, 2], 0.5), [1.5, 1, 2], 1e-12));
{
  const rw = [0, 0, 0, 1];
  const V = [0.4, 0.5, 0.3, 0.8, 0];
  const g1 = RL.gae(rw, V, 1, 1);
  const g0 = RL.gae(rw, V, 1, 0);
  check('GAE with lambda = 1 is the return minus the value', vecClose(g1.adv, RL.rewardToGo(rw).map((x, t) => x - V[t]), 1e-12));
  check('GAE with lambda = 0 is the one-step TD error', vecClose(g0.adv, g0.deltas, 1e-12));
}

/* PPO */
check('PPO clip: inside the range it is ratio * A', close(RL.ppoClip(1.1, 2), 2.2, 1e-12) && close(RL.ppoClip(0.9, -1), -0.9, 1e-12));
check('PPO clip: A > 0 stops paying above 1 + eps', close(RL.ppoClip(1.5, 1), 1.2, 1e-12) && RL.ppoClipSlope(1.5, 1) === 0 && RL.ppoClipSlope(0.5, 1) === 1);
check('PPO clip: A < 0 stops paying below 1 - eps', close(RL.ppoClip(0.5, -1), -0.8, 1e-12) && RL.ppoClipSlope(0.5, -1) === 0 && RL.ppoClipSlope(1.5, -1) === -1);

/* preferences */
check('Bradley-Terry: equal rewards give 1/2, and only differences matter', close(RL.bradleyTerry(2, 2), 0.5, 1e-12) && close(RL.bradleyTerry(3, 1), RL.bradleyTerry(103, 101), 1e-12));
{
  const rTrue = [1.2, 0.4, 0, -0.6, -1];
  const pairs = RL.simulatePreferences(rTrue, 20000, 11);
  const fit = RL.fitRewardModel(pairs, 5, { steps: 3000, lr: 2 });
  const m = RL.sum(rTrue) / 5;
  check('a reward model fitted to 20,000 comparisons recovers the rewards (up to a shift)', vecClose(fit.r, rTrue.map((x) => x - m), 0.06), fit.r.map((x) => x.toFixed(2)).join(' '));
}

/* the KL leash */
const REF = [0.5, 0.3, 0.15, 0.05];
const RW = [0.2, 1.0, 0.0, 1.5];
for (const beta of [0.1, 0.5, 2]) {
  const star = RL.tilt(REF, RW, beta);
  const best = RL.regularisedObjective(star, REF, RW, beta);
  const rand = RL.rng(5);
  let beaten = false;
  for (let i = 0; i < 2000; i++) {
    const q = RL.softmax(star.map((p) => Math.log(p) + (rand() - 0.5) * 0.6));
    if (RL.regularisedObjective(q, REF, RW, beta) > best + 1e-12) beaten = true;
  }
  check(`beta = ${beta}: ref * exp(r / beta) / Z beats 2,000 nearby policies`, !beaten);
  check(`beta = ${beta}: the optimum's value is beta log Z`, close(best, beta * RL.logPartition(REF, RW, beta), 1e-9));
}
check('beta -> infinity stays at the reference', vecClose(RL.tilt(REF, RW, 1e6), REF, 1e-5));
check('beta -> 0 puts all mass on the best response', RL.tilt(REF, RW, 1e-3)[3] > 0.999);

/* DPO */
{
  const beta = 0.5;
  const star = RL.tilt(REF, RW, beta);
  const d01 = RL.implicitReward(star, REF, beta, 1) - RL.implicitReward(star, REF, beta, 0);
  check('at the optimum, implicit reward differences equal true reward differences', close(d01, RW[1] - RW[0], 1e-9));
  const run = RL.dpoTrain(REF, RW, beta, { steps: 6000, lr: 2 });
  check('DPO on infinite preference data converges to the RLHF optimum', RL.kl(run.pi, star) < 1e-8, `KL ${RL.kl(run.pi, star).toExponential(2)}`);
}

/* groups */
{
  const a = RL.groupAdvantages([1, 0, 0, 1, 1, 0, 0, 0]);
  const m = RL.sum(a) / a.length;
  const sd = Math.sqrt(RL.sum(a.map((x) => (x - m) ** 2)) / a.length);
  check('group advantages have mean 0 and standard deviation 1', close(m, 0, 1e-9) && close(sd, 1, 1e-5));
  check('an all-correct group has no signal', RL.groupAdvantages([1, 1, 1, 1]).every((x) => x === 0));
  const rws = [1, 0, 0, 1, 1];
  const loo = RL.looAdvantages(rws);
  const mean = RL.sum(rws) / rws.length;
  check('leave-one-out advantage = n/(n-1) times (r - mean)', vecClose(loo, rws.map((x) => (5 / 4) * (x - mean)), 1e-12));
  check('dead groups: p = 0.5, G = 8 gives 2 / 256', close(RL.deadGroupProbability(0.5, 8), 2 / 256, 1e-12));
}
{
  const q = [0.4, 0.3, 0.2, 0.1];
  const p = [0.35, 0.33, 0.2, 0.12];
  const e = RL.klEstimators(q, p);
  check('k1 is unbiased for KL(q || p)', close(e.k1.mean, e.truth, 1e-12));
  check('k3 is unbiased for KL(q || p)', close(e.k3.mean, e.truth, 1e-12));
  check('k3 is never negative; k1 can be', e.k3.min >= 0 && e.k1.min < 0);
  check('k3 has lower spread than k1 when p is close to q', e.k3.sd < e.k1.sd, `sd k1 ${e.k1.sd.toFixed(4)}, k3 ${e.k3.sd.toFixed(4)}`);
}

/* pass@k */
check('pass@1 from n samples with c correct is c / n', close(RL.passAtK(10, 3, 1), 0.3, 1e-12));
{
  // brute force: probability that a random k-subset of n contains a correct one
  const n = 8;
  const c = 3;
  const k = 3;
  let hit = 0;
  let all = 0;
  for (let m = 0; m < 1 << n; m++) {
    let bits = 0;
    for (let i = 0; i < n; i++) if (m & (1 << i)) bits++;
    if (bits !== k) continue;
    all++;
    if (m & 0b111) hit++;
  }
  check('pass@k estimator matches brute-force subsets', close(RL.passAtK(n, c, k), hit / all, 1e-12));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
