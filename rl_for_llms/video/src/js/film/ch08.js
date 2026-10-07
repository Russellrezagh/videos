// Chapter 8 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch08(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 8 */
  video.chapter('ch8', 'The KL leash');
  card(8, 'The leash: KL, and an exact answer');

  video.scene('kl', 'Kullback and Leibler', (S) => {
    const h = S.add(S.title('Measuring distance between policies'));
    const def = S.add(S.tex('\\mathrm{KL}(\\pi \\,\\|\\, \\pi_{\\text{ref}}) \\;=\\; \\mathbb{E}_{y \\sim \\pi}\\Big[\\log \\frac{\\pi(y)}{\\pi_{\\text{ref}}(y)}\\Big] \\;=\\; \\sum_y \\pi(y)\\, \\log \\frac{\\pi(y)}{\\pi_{\\text{ref}}(y)}', { size: 64 }).at(0, -280));
    const ref = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 380, w: 110, gap: 60, color: C.GREY, labelFont: 'serif', labelSize: 32, valueSize: 28 }).at(-480, 230));
    const pol = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 380, w: 110, gap: 60, color: C.BLUE, labelFont: 'serif', labelSize: 32, valueSize: 28 }).at(480, 230));
    const rl = S.add(S.tex('\\pi_{\\text{ref}}', { size: 54, color: C.GREY_B }).at(-480, -120));
    const pl = S.add(S.tex('\\pi', { size: 60, color: C.BLUE }).at(480, -120));
    S.beat('The standard leash is the Kullback-Leibler divergence. It measures how different one distribution is from another: the average, under pi, of the log of pi over pi ref.',
      A.FadeIn(h), A.Write(def, 2.4), A.FadeIn(ref), A.FadeIn(rl), A.FadeIn(pol), A.FadeIn(pl),
      { cap: 'The standard leash is the Kullback–Leibler divergence. It measures how different one distribution is from another: the average, under π, of log π / π_ref.' });
    const target = LEASH.at(0.2);
    const klv = S.add(S.txt('KL = 0.00', { size: 44, color: C.YELLOW, font: 'mono' }).at(0, -90));
    S.beat('It is zero only when the two distributions are equal, and it grows as pi moves its mass to where the reference puts little.',
      A.FadeIn(klv), wait(0.6), par(pol.to(target, 2.2), A.Count(klv, 0, RL.kl(target, LEASH.ref), (v) => `KL = ${v.toFixed(2)}`, 2.2)));
    const obj = S.add(S.tex('\\max_{\\theta}\\;\\; \\mathbb{E}_{x,\\; y \\sim \\pi_\\theta}\\big[\\,r(x, y)\\,\\big] \\;-\\; \\beta\\, \\mathrm{KL}\\big(\\pi_\\theta(\\cdot \\mid x) \\,\\|\\, \\pi_{\\text{ref}}(\\cdot \\mid x)\\big)', { size: 64, color: C.YELLOW }).at(0, -80));
    S.beat('The objective for language models subtracts it. Maximize the expected reward, minus beta times the K L divergence from a reference model, which is usually the supervised model we started from.',
      par([ref, pol, rl, pl, klv].map((m) => A.FadeOut(m))), A.Write(obj, 2.4));
    const tok = S.add(S.tex('r_t \\;=\\; -\\,\\beta\\, \\log \\frac{\\pi_\\theta(y_t \\mid s_t)}{\\pi_{\\text{ref}}(y_t \\mid s_t)} \\;\\; \\big(+\\; r(x, y) \\text{ at the last token}\\big)', { size: 58 }).at(0, 120));
    const ig = S.add(S.txt('InstructGPT: β = 0.02, per token', { size: 36, color: C.GREY_B }).at(0, 250));
    S.paper('ziegler2019');
    S.beat('For a sequence, the log ratio is a sum over tokens, so the penalty can be paid token by token: each token’s reward includes minus beta times the log ratio of the new probability to the reference probability. InstructGPT used this, with beta equal to zero point zero two.',
      A.Write(tok, 2.2), A.FadeIn(ig), { cap: 'For a sequence, the log ratio is a sum over tokens, so the penalty can be paid token by token: each token’s reward includes −β log(π_θ / π_ref). InstructGPT used this with β = 0.02.' });
  });

  video.scene('tilt', 'The exact optimum', (S) => {
    const h = S.add(S.title('The exact solution'));
    const star = S.add(S.tex('\\pi^*(y \\mid x) \\;=\\; \\frac{1}{Z(x)}\\; \\class{f-ref}{\\pi_{\\text{ref}}(y \\mid x)}\\; \\class{f-exp}{\\exp\\!\\big(r(x, y) / \\beta\\big)}', { size: 78, color: C.YELLOW }).at(0, -280));
    const zdef = S.add(S.tex('Z(x) = \\sum_y \\pi_{\\text{ref}}(y \\mid x)\\, e^{\\,r(x, y)/\\beta}', { size: 50, color: C.GREY_B }).at(0, -125));
    S.beat('Here is the beautiful part. This objective has an exact solution. Among all distributions, the best one is the reference distribution, tilted by the exponential of reward over beta, and renormalized.',
      A.FadeIn(h), A.Write(star, 2.4), A.FadeIn(zdef));
    const d1 = S.add(S.tex('\\mathbb{E}_\\pi[r] - \\beta\\, \\mathrm{KL}(\\pi \\| \\pi_{\\text{ref}}) \\;=\\; -\\beta\\, \\mathbb{E}_\\pi\\Big[\\log \\frac{\\pi(y)}{\\pi_{\\text{ref}}(y)\\, e^{r(y)/\\beta}}\\Big]', { size: 56 }).at(0, -20));
    const d2 = S.add(S.tex('\\;=\\; -\\beta\\, \\mathbb{E}_\\pi\\Big[\\log \\frac{\\pi(y)}{\\pi^*(y)}\\Big] + \\beta \\log Z \\;=\\; \\class{f-k}{-\\beta\\, \\mathrm{KL}(\\pi \\,\\|\\, \\pi^*)} + \\beta \\log Z', { size: 56 }).at(60, 120));
    const zero = S.add(S.txt('largest when this is zero: π = π*', { size: 40, color: C.GREEN }).at(220, 250));
    S.beat('Why? Rewrite the objective. It equals minus beta, times the K L divergence from pi to that tilted distribution, plus beta log Z, which does not depend on pi. And a K L divergence is smallest, zero, exactly when the two distributions are equal.',
      A.FadeOut(zdef), A.Write(d1, 2.4), A.Write(d2, 2.4), A.Focus(d2, 'k', { color: C.GREEN }), A.FadeIn(zero),
      { cap: 'Why? Rewrite the objective: it equals −β KL(π ‖ π*) + β log Z, and β log Z does not depend on π. A KL divergence is smallest, zero, exactly when the two distributions are equal.' });
  });

  video.scene('beta', 'Turning the knob', (S) => {
    const h = S.add(S.title('Turning the knob'));
    const star = S.add(S.tex('\\pi^* \\;\\propto\\; \\pi_{\\text{ref}}\\; e^{\\,r/\\beta}', { size: 66, color: C.YELLOW }).at(-520, -300));
    const rews = LEASH.r.map((r, i) => r);
    const bars = S.add(S.bars({ labels: LEASH.labels, values: LEASH.at(8), h: 420, w: 150, gap: 110, colors: [C.GREY_B, C.GREEN, C.RED, C.PINK], labelFont: 'serif', labelSize: 40 }).at(80, 190));
    const rl = rews.map((r, i) => S.add(S.txt(`reward ${r}`, { size: 32, color: C.GOLD }).at(80 + bars.xs[i], 290)));
    const betas = [8, 1, 0.5, 0.2, 0.05];
    // one beta label per value, swapped by fading
    const bl = betas.map((b, i) => S.add(S.tex(`\\beta = ${b}`, { size: 64, color: C.TEAL }).at(-520, -190)));
    const shows = [];
    for (let i = 1; i < betas.length; i++) shows.push(seq(par(A.FadeOut(bl[i - 1], { dur: 0.3 }), A.FadeIn(bl[i], { dur: 0.3 })), bars.to(LEASH.at(betas[i]), 1.4), wait(0.8)));
    S.beat('Watch beta. With a large beta, the leash is tight, and the policy stays at the reference. As beta shrinks, mass flows toward high-reward answers. Near zero, everything piles onto the single answer the reward model rates highest. Here, that is the flattering one.',
      A.FadeIn(h), A.FadeIn(star), A.FadeIn(bars), lag(0.1, rl.map((r) => A.FadeIn(r))), A.FadeIn(bl[0]), wait(0.8), seq(shows), A.Indicate(bars.labs[3], { color: C.RED, scale: 1.3 }));
    const ax = S.add(S.axes({ x0: 0, x1: 3.2, y0: 0, y1: 1.6, w: 1000, h: 420, xticks: [0, 1, 2, 3], yticks: [0, 0.5, 1, 1.5], xlabel: 'KL from the reference', ylabel: 'expected reward' }).at(40, 120));
    const fr = ax.polyline(LEASH.frontier.map((f) => [f.kl, f.reward]), { color: C.YELLOW, width: 6 });
    const marks = [8, 1, 0.2].map((b) => {
      const pi = LEASH.at(b);
      return S.add(S.group(dot(12, C.TEAL), new Text(`β = ${b}`, { size: 32, color: C.TEAL, anchor: 'start' }).at(20, -26)).at(40 + ax.fx(RL.kl(pi, LEASH.ref)), 120 + ax.fy(RL.expectedReward(pi, LEASH.r))));
    });
    S.beat('Each beta buys some reward at some K L cost. Trace them all, and you get a frontier: the most reward any policy can get, for a given distance from the reference.',
      par([star, bars, ...rl, ...bl].map((m) => A.FadeOut(m))), A.FadeIn(ax), A.Create(fr, 2), lag(0.4, marks.map((m) => A.FadeIn(m, { from: 1.6 }))));
    const bayes = S.add(S.tex('\\underbrace{\\pi^*(y)}_{\\text{posterior}} \\;\\propto\\; \\underbrace{\\pi_{\\text{ref}}(y)}_{\\text{prior}}\\; \\underbrace{e^{\\,r(y)/\\beta}}_{\\text{likelihood}}', { size: 76, color: C.YELLOW }).at(0, -40));
    S.paper('korbak2022');
    S.beat('There is a second way to read the solution. The reference model is a prior. The exponentiated reward is a likelihood. And the optimal policy is the posterior. Korbak, Perez and Buckley argued that R L with K L penalties is best viewed as Bayesian inference.',
      par([ax, ...marks].map((m) => A.FadeOut(m))), A.Write(bayes, 2.4),
      { cap: 'There is a second way to read the solution. The reference model is a prior, the exponentiated reward a likelihood, and the optimal policy the posterior. Korbak, Perez and Buckley argued that RL with KL penalties is best viewed as Bayesian inference.' });
    const zz = S.add(S.txt('but Z(x) sums over every possible answer', { size: 44, color: C.RED }).at(0, 200));
    S.beat('We cannot compute this posterior directly, because Z sums over every possible answer. That is why we train with P P O. Or is it?',
      A.FadeIn(zz, { dy: 20 }), { cap: 'We cannot compute this posterior directly, because Z sums over every possible answer. That is why we train with PPO. Or is it?' });
  });
});
