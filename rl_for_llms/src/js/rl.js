/*
 * RL for language models: the mathematics, as a small pure kernel.
 *
 * Domain model
 *   Policy      a categorical distribution over actions given by logits z:
 *               pi = softmax(z). For a language model an action is a token
 *               (or, viewed as a bandit, a whole response).
 *   Reward      a number per action (or per response).
 *   Objective   J(z) = sum_a pi_a r_a, the expected reward.
 *   Estimator   a random vector whose mean is grad J (REINFORCE and friends);
 *               its mean and variance are computed exactly here by summing
 *               over actions, not by sampling.
 *   Preference  P(w beats l) = sigma(r_w - r_l)        (Bradley-Terry)
 *   Regularised J_beta(pi) = E_pi[r] - beta KL(pi || ref); its maximiser
 *               is ref * exp(r / beta) / Z                (the "tilt")
 *
 * Rules: no DOM, no clock, no unseeded randomness (rng(seed) only).
 * Every number the film shows comes from here; tests/verify.mjs checks the
 * identities the narration states.
 */
(function (root) {
  'use strict';

  /* ---------------------------------------------------------- numbers */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const sum = (v) => v.reduce((s, x) => s + x, 0);
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const sigmoid = (x) => (x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x)));
  const logSigmoid = (x) => (x >= 0 ? -Math.log1p(Math.exp(-x)) : x - Math.log1p(Math.exp(x)));

  /* ---------------------------------------------------------- distributions */
  function logSumExp(z) {
    const m = Math.max(...z);
    return m + Math.log(sum(z.map((x) => Math.exp(x - m))));
  }
  function softmax(z, temperature = 1) {
    const s = z.map((x) => x / temperature);
    const L = logSumExp(s);
    return s.map((x) => Math.exp(x - L));
  }
  function logSoftmax(z) {
    const L = logSumExp(z);
    return z.map((x) => x - L);
  }
  function entropy(p) {
    return -sum(p.map((x) => (x > 0 ? x * Math.log(x) : 0)));
  }
  // KL(p || q) = sum p log(p / q)
  function kl(p, q) {
    return sum(p.map((x, i) => (x > 0 ? x * Math.log(x / q[i]) : 0)));
  }
  function sampleIndex(p, u) {
    let acc = 0;
    for (let i = 0; i < p.length; i++) {
      acc += p[i];
      if (u < acc) return i;
    }
    return p.length - 1;
  }
  // a response's probability is the product of its tokens' probabilities
  function sequenceLogProb(tokenProbs) {
    return sum(tokenProbs.map(Math.log));
  }

  /* ---------------------------------------------------------- the bandit */
  const expectedReward = (pi, r) => dot(pi, r);

  // d log pi_a / d z_b = 1[a = b] - pi_b  (the softmax "score")
  function score(pi, a) {
    return pi.map((p, b) => (a === b ? 1 : 0) - p);
  }
  // exact gradient: dJ/dz_b = pi_b (r_b - J)
  function exactGradient(z, r) {
    const pi = softmax(z);
    const J = expectedReward(pi, r);
    return pi.map((p, b) => p * (r[b] - J));
  }
  // one REINFORCE sample: (r_a - b) * score(a)
  function reinforceSample(z, r, a, baseline = 0) {
    const pi = softmax(z);
    return score(pi, a).map((s) => (r[a] - baseline) * s);
  }
  // exact mean vector and total variance (trace of the covariance) of the
  // single-sample estimator with a constant baseline
  function estimatorStats(z, r, baseline = 0) {
    const pi = softmax(z);
    const K = pi.length;
    const mean = new Array(K).fill(0);
    let second = 0;
    for (let a = 0; a < K; a++) {
      const g = reinforceSample(z, r, a, baseline);
      for (let b = 0; b < K; b++) mean[b] += pi[a] * g[b];
      second += pi[a] * dot(g, g);
    }
    return { mean, variance: second - dot(mean, mean) };
  }
  // the baseline that minimises that variance: E[r |s|^2] / E[|s|^2]
  function optimalBaseline(z, r) {
    const pi = softmax(z);
    let num = 0;
    let den = 0;
    pi.forEach((p, a) => {
      const s = score(pi, a);
      const n2 = dot(s, s);
      num += p * r[a] * n2;
      den += p * n2;
    });
    return num / den;
  }
  // E_{a ~ pi}[score(a)] = 0: why a baseline adds no bias
  function expectedScore(z) {
    const pi = softmax(z);
    const out = new Array(pi.length).fill(0);
    pi.forEach((p, a) => score(pi, a).forEach((s, b) => (out[b] += p * s)));
    return out;
  }

  /*
   * Train a softmax bandit with sampled gradients.
   *   baseline: 'none' | 'mean' (running mean of rewards) | 'loo' (leave-one-out
   *   mean of the other samples in the batch, as in RLOO) | 'group' (batch mean
   *   and std, as in GRPO)
   *   noise: standard deviation of Gaussian noise added to each reward
   */
  function trainBandit({ z0, r, steps = 200, lr = 0.5, batch = 4, baseline = 'none', noise = 0, seed = 1 } = {}) {
    const rand = rng(seed);
    const gauss = () => {
      const u = Math.max(1e-12, rand());
      const v = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    let z = z0.slice();
    let running = 0;
    const history = [];
    for (let t = 0; t <= steps; t++) {
      const pi = softmax(z);
      history.push({ step: t, J: expectedReward(pi, r), pi });
      if (t === steps) break;
      const acts = [];
      const rews = [];
      for (let i = 0; i < batch; i++) {
        const a = sampleIndex(pi, rand());
        acts.push(a);
        rews.push(r[a] + noise * gauss());
      }
      const mean = sum(rews) / batch;
      const sd = Math.sqrt(sum(rews.map((x) => (x - mean) ** 2)) / batch) + 1e-6;
      const g = new Array(z.length).fill(0);
      acts.forEach((a, i) => {
        let adv = rews[i];
        if (baseline === 'mean') adv = rews[i] - running;
        if (baseline === 'loo') adv = batch > 1 ? rews[i] - (sum(rews) - rews[i]) / (batch - 1) : rews[i];
        if (baseline === 'group') adv = (rews[i] - mean) / sd;
        score(pi, a).forEach((s, b) => (g[b] += (adv * s) / batch));
      });
      running = t === 0 ? mean : 0.9 * running + 0.1 * mean;
      z = z.map((x, b) => x + lr * g[b]);
    }
    return history;
  }

  /* ---------------------------------------------------------- credit over tokens */
  function rewardToGo(rewards, gamma = 1) {
    const out = new Array(rewards.length).fill(0);
    let acc = 0;
    for (let t = rewards.length - 1; t >= 0; t--) {
      acc = rewards[t] + gamma * acc;
      out[t] = acc;
    }
    return out;
  }
  // values has one more entry than rewards (V of the state after the last token, 0 if terminal)
  function gae(rewards, values, gamma = 1, lambda = 0.95) {
    const T = rewards.length;
    const deltas = rewards.map((rw, t) => rw + gamma * values[t + 1] - values[t]);
    const adv = new Array(T).fill(0);
    let acc = 0;
    for (let t = T - 1; t >= 0; t--) {
      acc = deltas[t] + gamma * lambda * acc;
      adv[t] = acc;
    }
    return { deltas, adv };
  }

  /* ---------------------------------------------------------- PPO */
  const clip = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  function ppoClip(ratio, A, eps = 0.2) {
    return Math.min(ratio * A, clip(ratio, 1 - eps, 1 + eps) * A);
  }
  // derivative with respect to the ratio: A where the unclipped term is the
  // minimum, 0 where the clip has taken over
  function ppoClipSlope(ratio, A, eps = 0.2) {
    const unclipped = ratio * A;
    const clipped = clip(ratio, 1 - eps, 1 + eps) * A;
    if (unclipped <= clipped) return A;
    return ratio > 1 - eps && ratio < 1 + eps ? A : 0;
  }

  /* ---------------------------------------------------------- preferences */
  const bradleyTerry = (rw, rl) => sigmoid(rw - rl);
  const btLoss = (rw, rl) => -logSigmoid(rw - rl);

  // simulate n comparisons between random pairs of K responses whose true
  // rewards are rTrue; the preferred one is drawn with Bradley-Terry odds
  function simulatePreferences(rTrue, n, seed = 7) {
    const rand = rng(seed);
    const K = rTrue.length;
    const pairs = [];
    for (let i = 0; i < n; i++) {
      const a = Math.floor(rand() * K);
      let b = Math.floor(rand() * (K - 1));
      if (b >= a) b++;
      const aWins = rand() < bradleyTerry(rTrue[a], rTrue[b]);
      pairs.push(aWins ? [a, b] : [b, a]);
    }
    return pairs;
  }
  // fit a tabular reward model by gradient descent on the mean BT loss
  function fitRewardModel(pairs, K, { steps = 2000, lr = 0.5 } = {}) {
    let r = new Array(K).fill(0);
    const loss = [];
    for (let s = 0; s < steps; s++) {
      const g = new Array(K).fill(0);
      let L = 0;
      for (const [w, l] of pairs) {
        L += btLoss(r[w], r[l]);
        const d = sigmoid(r[w] - r[l]) - 1; // dL/dr_w
        g[w] += d;
        g[l] -= d;
      }
      r = r.map((x, i) => x - (lr * g[i]) / pairs.length);
      if (s % 50 === 0) loss.push(L / pairs.length);
    }
    const m = sum(r) / K;
    return { r: r.map((x) => x - m), loss };
  }

  /* ---------------------------------------------------------- the KL leash */
  // the maximiser of E_pi[r] - beta KL(pi || ref)
  function tilt(ref, r, beta) {
    return softmax(ref.map((p, i) => Math.log(p) + r[i] / beta));
  }
  function regularisedObjective(pi, ref, r, beta) {
    return expectedReward(pi, r) - beta * kl(pi, ref);
  }
  function frontier(ref, r, betas) {
    return betas.map((beta) => {
      const pi = tilt(ref, r, beta);
      return { beta, pi, reward: expectedReward(pi, r), kl: kl(pi, ref) };
    });
  }
  const logPartition = (ref, r, beta) => logSumExp(ref.map((p, i) => Math.log(p) + r[i] / beta));

  /* ---------------------------------------------------------- DPO */
  const implicitReward = (pi, ref, beta, y) => beta * Math.log(pi[y] / ref[y]);
  function dpoLoss(pi, ref, beta, w, l) {
    return -logSigmoid(implicitReward(pi, ref, beta, w) - implicitReward(pi, ref, beta, l));
  }
  /*
   * Tabular DPO with infinite Bradley-Terry data: the expected loss over every
   * ordered pair (y, y') of responses, with y preferred w.p. sigma(r_y - r_y').
   * Gradient descent on the logits of pi. Its minimiser is tilt(ref, r, beta).
   */
  function dpoTrain(ref, rTrue, beta, { steps = 4000, lr = 1, z0 = null } = {}) {
    const K = ref.length;
    let z = z0 ? z0.slice() : ref.map(Math.log);
    const trace = [];
    for (let s = 0; s <= steps; s++) {
      const pi = softmax(z);
      if (s % 100 === 0) trace.push({ step: s, pi, kl: kl(pi, tilt(ref, rTrue, beta)) });
      if (s === steps) break;
      // d loss / d log pi_y, then chain through the softmax
      const gLog = new Array(K).fill(0);
      let total = 0;
      for (let y = 0; y < K; y++) {
        for (let v = 0; v < K; v++) {
          if (y === v) continue;
          const pw = bradleyTerry(rTrue[y], rTrue[v]); // P(y beats v)
          const m = beta * (Math.log(pi[y] / ref[y]) - Math.log(pi[v] / ref[v]));
          const d = -(1 - sigmoid(m)) * beta; // d(-log sigma(m))/dm * dm/dlog pi_y
          gLog[y] += pw * d;
          gLog[v] -= pw * d;
          total += pw;
        }
      }
      // chain rule through log pi_y = z_y - logsumexp(z)
      const gl = gLog.map((x) => x / total);
      const S = sum(gl);
      z = z.map((x, b) => x - lr * (gl[b] - pi[b] * S));
    }
    return { pi: softmax(z), trace };
  }

  /* ---------------------------------------------------------- GRPO and friends */
  function groupAdvantages(rewards, { std = true, eps = 1e-6 } = {}) {
    const n = rewards.length;
    const mean = sum(rewards) / n;
    const sd = Math.sqrt(sum(rewards.map((x) => (x - mean) ** 2)) / n);
    return rewards.map((x) => (std ? (x - mean) / (sd + eps) : x - mean));
  }
  function looAdvantages(rewards) {
    const n = rewards.length;
    const S = sum(rewards);
    return rewards.map((x) => x - (S - x) / (n - 1));
  }
  // probability that a group of G answers is all-correct or all-wrong when
  // each answer is correct with probability p: those groups carry no signal
  const deadGroupProbability = (p, G) => p ** G + (1 - p) ** G;

  /*
   * Estimators of KL(q || p) from samples x ~ q, with ratio = p(x)/q(x)
   * (Schulman, "Approximating KL Divergence"): exact mean and variance.
   *   k1 = -log ratio      k2 = (log ratio)^2 / 2      k3 = (ratio - 1) - log ratio
   */
  function klEstimators(q, p) {
    const est = {
      k1: (rt) => -Math.log(rt),
      k2: (rt) => Math.log(rt) ** 2 / 2,
      k3: (rt) => rt - 1 - Math.log(rt),
    };
    const out = { truth: kl(q, p) };
    for (const [name, f] of Object.entries(est)) {
      let m = 0;
      let m2 = 0;
      q.forEach((qx, x) => {
        const v = f(p[x] / qx);
        m += qx * v;
        m2 += qx * v * v;
      });
      out[name] = { mean: m, sd: Math.sqrt(Math.max(0, m2 - m * m)), min: Math.min(...q.map((qx, x) => f(p[x] / qx))) };
    }
    return out;
  }

  /* ---------------------------------------------------------- evaluation */
  function binom(n, k) {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return r;
  }
  // unbiased pass@k from n samples with c correct (Chen et al. 2021)
  function passAtK(n, c, k) {
    if (n - c < k) return 1;
    let prod = 1;
    for (let i = n - c + 1; i <= n; i++) prod *= 1 - k / i;
    return 1 - prod;
  }
  // pass@k when every sample is correct with probability p
  const passAtKExact = (p, k) => 1 - (1 - p) ** k;

  const RL = {
    rng, sum, dot, sigmoid, logSigmoid, logSumExp, softmax, logSoftmax, entropy, kl, sampleIndex, sequenceLogProb,
    expectedReward, score, exactGradient, reinforceSample, estimatorStats, optimalBaseline, expectedScore, trainBandit,
    rewardToGo, gae, clip, ppoClip, ppoClipSlope,
    bradleyTerry, btLoss, simulatePreferences, fitRewardModel,
    tilt, regularisedObjective, frontier, logPartition,
    implicitReward, dpoLoss, dpoTrain,
    groupAdvantages, looAdvantages, deadGroupProbability, klEstimators,
    binom, passAtK, passAtKExact,
  };
  if (typeof module === 'object' && module.exports) module.exports = RL;
  else root.RL = RL;
})(typeof window === 'object' ? window : globalThis);
