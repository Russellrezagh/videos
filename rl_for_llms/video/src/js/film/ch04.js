// Chapter 4 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch04(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 4 */
  video.chapter('ch4', 'Taming the noise');
  card(4, 'Taming the noise: baselines');

  video.scene('offset', 'A generous judge', (S) => {
    const h = S.add(S.title('A generous judge'));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-300, 170));
    const rs = BAND.r.map((r, i) => S.add(S.txt(`reward ${r}`, { size: 38, color: C.GOLD }).at(-300 + bars.xs[i], 272)));
    S.beat('Simple, but noisy. Suppose the judge is generous: rewards of eleven, ten point three, and ten, instead of one, zero point three, and zero. Same ranking. Same differences. Only an offset of ten.',
      A.FadeIn(h), A.FadeIn(bars), lag(0.2, rs.map((r) => A.FadeIn(r))), wait(0.6), par(rs.map((r, i) => A.Count(r, BAND.r[i], R10[i], (v) => `reward ${(Math.round(v * 10) / 10).toFixed(R10[i] % 1 ? 1 : 0)}`, 1.4))), lag(0.2, rs.map((r) => A.Indicate(r, { color: C.GOLD, scale: 1.2 }))),
      { cap: 'Simple, but noisy. Suppose the judge is generous: rewards of 11, 10.3 and 10 instead of 1, 0.3 and 0. Same ranking. Same differences. Only an offset of 10.' });
    const ex = S.add(S.tex('\\nabla J \\text{ is unchanged}', { size: 56, color: C.GREEN }).at(560, -250));
    const big = S.add(S.arrow(-300 + bars.xs[2], 170 - 380 * BAND.pi[2] - 60, -300 + bars.xs[2], 170 - 380 * BAND.pi[2] - 330, { color: C.RED, width: 8 }));
    const bigL = S.add(S.txt('sampled 41: push up \u00d7 10', { size: 36, color: C.RED }).at(-300 + bars.xs[2], 170 - 380 * BAND.pi[2] - 370));
    S.beat('The exact gradient does not change at all, because adding the same constant to every reward cannot change which answer is better. But now every sample pushes its own answer up, hard. Even the wrong answer, forty-one, gets a big push up.',
      A.Write(ex, 1), wait(1.4), A.Arrow(big, 0.8), A.FadeIn(bigL));
    const v1 = S.add(S.tex(`\\operatorname{Var}\\,\\hat g = ${VAR.plain.toFixed(2)}`, { size: 60 }).at(560, -60));
    const v2 = S.add(S.tex(`\\operatorname{Var}\\,\\hat g = ${VAR.off.toFixed(1)}`, { size: 60, color: C.RED }).at(560, 60));
    const l1 = S.add(S.txt('rewards 1, 0.3, 0', { size: 32, color: C.GREY_B }).at(560, -10));
    const l2 = S.add(S.txt('rewards 11, 10.3, 10', { size: 32, color: C.GREY_B }).at(560, 110));
    S.beat(`The pushes only cancel out on average. One sample at a time, the estimate swings wildly. Its total variance, computed exactly, goes from about zero point one six to about ${Math.round(VAR.off)}.`,
      A.FadeIn(v1), A.FadeIn(l1), wait(0.8), A.FadeIn(v2, { from: 1.4 }), A.FadeIn(l2),
      { cap: `The pushes only cancel out on average. One sample at a time, the estimate swings wildly. Its total variance, computed exactly, goes from ${VAR.plain.toFixed(2)} to ${VAR.off.toFixed(1)}.` });
  });

  video.scene('baseline', 'Subtract a baseline', (S) => {
    const h = S.add(S.title('Subtract a baseline'));
    const est = S.add(S.tex('\\hat g \\;=\\; \\big(R(a) - \\class{f-b}{b}\\big)\\, \\nabla_\\theta \\log \\pi_\\theta(a)', { size: 78, color: C.YELLOW }).at(0, -260));
    S.beat('The fix is to subtract a baseline: a number b that does not depend on which answer was sampled. Use reward minus b in place of reward.',
      A.FadeIn(h), A.Write(est, 1.8), A.Focus(est, 'b', { color: C.TEAL }));
    const z = S.add(S.tex('\\mathbb{E}_{a \\sim \\pi}\\big[\\nabla \\log \\pi(a)\\big] \\;=\\; \\sum_a \\pi(a)\\, \\frac{\\nabla \\pi(a)}{\\pi(a)} \\;=\\; \\sum_a \\nabla \\pi(a)', { size: 60 }).at(0, -110));
    const z2 = S.add(S.tex('\\;=\\; \\nabla \\sum_a \\pi(a) \\;=\\; \\nabla\\, 1 \\;=\\; 0', { size: 60 }).at(140, 20));
    S.beat('Why is that allowed? Because the gradient of log pi averages to zero. Its expectation is a sum of pi times gradient log pi, which is the sum of the gradients of the probabilities, which is the gradient of their total. And the total is always one. The gradient of one is zero.',
      A.Unfocus(est), A.Write(z, 3), A.Write(z2, 2), { cap: 'Why is that allowed? Because ∇ log π averages to zero: E[∇ log π] = Σ π ∇π/π = Σ ∇π = ∇ Σ π = ∇1 = 0.' });
    const u = S.add(S.tex('\\mathbb{E}\\big[(R - b)\\, \\nabla \\log \\pi\\big] \\;=\\; \\mathbb{E}\\big[R\\, \\nabla \\log \\pi\\big] \\;-\\; b \\cdot 0', { size: 62, color: C.GREEN }).at(0, 150));
    const any = S.add(S.txt('unbiased for any b; the noise is what changes', { size: 40, color: C.GREY_B }).at(0, 270));
    S.beat('So subtracting b, times something whose average is zero, changes nothing on average. The estimate stays unbiased, for any b. But the noise can shrink enormously.',
      A.Write(u, 1.8), A.FadeIn(any, { dy: 10 }));
  });

  video.scene('variance', 'The best baseline', (S) => {
    const h = S.add(S.title('How much noise, for each baseline?'));
    const varAt = (b) => RL.estimatorStats(BAND.z, R10, b).variance;
    const ax = S.add(S.axes({ x0: 8, x1: 13, y0: 0, y1: 4, w: 1180, h: 480, xticks: [8, 9, 10, 11, 12, 13], yticks: [0, 1, 2, 3, 4], xlabel: 'baseline b', ylabel: 'variance of the estimate' }).at(40, 30));
    const cv = ax.plot(varAt, { color: C.BLUE, width: 6, samples: 120 });
    const mean = S.add(S.line(40 + ax.fx(J10), 30 + ax.fy(0), 40 + ax.fx(J10), 30 + ax.fy(3.2), { stroke: C.YELLOW, width: 3, dash: '10 10' }));
    const meanL = S.add(S.txt(`mean reward ${f2(J10)}`, { size: 34, color: C.YELLOW }).at(40 + ax.fx(J10) + 150, 30 + ax.fy(3.4)));
    const best = S.add(S.dot(12, C.GREEN).at(40 + ax.fx(VAR.bStar), 30 + ax.fy(varAt(VAR.bStar))));
    const bestL = S.add(S.txt(`minimum at b = ${f2(VAR.bStar)}: ${f3(varAt(VAR.bStar))}`, { size: 34, color: C.GREEN }).at(40 + ax.fx(VAR.bStar) + 330, 30 + ax.fy(0.9)));
    S.beat(`Here is the variance of the estimate as a function of b. It is smallest near the average reward. The exact minimum is close by, and there the variance is below zero point one, down from about ${Math.round(VAR.off)} with no baseline at all.`,
      A.FadeIn(h), A.FadeIn(ax), A.Create(cv, 1.6), A.FadeIn(mean), A.FadeIn(meanL), A.FadeIn(best, { from: 2 }), A.FadeIn(bestL),
      { cap: `Here is the variance of the estimate as a function of b. It is smallest near the average reward (${f2(J10)}). The exact minimum, at b = ${f2(VAR.bStar)}, is ${f3(varAt(VAR.bStar))}, down from ${VAR.off.toFixed(1)} with no baseline.` });
  });

  video.scene('advantage', 'The advantage', (S) => {
    const h = S.add(S.title('The advantage'));
    const A0 = S.add(S.tex('A(a) \\;=\\; R(a) - b \\;\\approx\\; R(a) - \\mathbb{E}[R]', { size: 72, color: C.YELLOW }).at(0, -270));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-120, 170));
    const adv = R10.map((r) => r - J10);
    const arrows = adv.map((a, i) => {
      const x = -120 + bars.xs[i] + 125;
      const y = 170 - 380 * BAND.pi[i];
      return S.add(S.arrow(x, y, x, y - a * 400, { color: a > 0 ? C.GREEN : C.RED, width: 6 }));
    });
    const al = adv.map((a, i) => S.add(S.txt(`A = ${a > 0 ? '+' : ''}${f2(a)}`, { size: 34, color: a > 0 ? C.GREEN : C.RED, font: 'mono', anchor: 'start' }).at(-120 + bars.xs[i] + 145, 170 - 380 * BAND.pi[i] - a * 400 + (a > 0 ? 0 : 10))));
    S.beat('Reward minus baseline has a name: the advantage. It asks, was this answer better or worse than expected? Better than expected: push it up. Worse than expected: push it down.',
      A.FadeIn(h), A.Write(A0, 1.6), A.FadeIn(bars), lag(0.4, arrows.map((a, i) => par(A.Arrow(a, 0.6), A.FadeIn(al[i])))));
  });

  video.scene('training', 'Training with and without', (S) => {
    const h = S.add(S.title('Five answers, four samples a step, twenty runs'));
    const ax = S.add(S.axes({ x0: 0, x1: 80, y0: 0, y1: 1, w: 1240, h: 520, xticks: [0, 20, 40, 60, 80], yticks: [0, 0.5, 1], xlabel: 'training step', ylabel: 'probability of the best answer' }).at(40, 30));
    const none = ax.polyline(TRAIN.none, { color: C.RED, width: 6 });
    const loo = ax.polyline(TRAIN.loo, { color: C.GREEN, width: 6 });
    const nl = S.add(S.txt('no baseline', { size: 38, color: C.RED }).at(40 + ax.fx(60), 30 + ax.fy(TRAIN.none[60][1]) + 50));
    const ll = S.add(S.txt('leave-one-out baseline', { size: 38, color: C.GREEN }).at(40 + ax.fx(34), 30 + ax.fy(TRAIN.loo[34][1]) - 80));
    S.beat('Here is training on a slightly bigger problem: five answers, generous rewards, four samples per step, averaged over twenty runs. With a baseline, the policy finds the best answer much faster.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(none, 2.4), A.FadeIn(nl), A.Create(loo, 2.4), A.FadeIn(ll));
  });

  // the 3D landscape (film/landscapes.js, drawn with space3.js)
  if (FILM.landscapes && FILM.landscapes.logits) FILM.landscapes.logits(ctx);

  video.scene('baselines', 'Baselines for language models', (S) => {
    const h = S.add(S.title('Three baselines for language models'));
    const cards = [
      ['a critic', 'a second network predicts the expected reward', 'PPO', C.BLUE],
      ['the others', 'mean reward of the other answers to the same prompt', 'RLOO', C.TEAL],
      ['the group', 'normalize rewards within the group of answers', 'GRPO', C.PINK],
    ].map(([a, b, c, col], i) => S.add(S.group(
      rect(540, 300, { stroke: col, width: 3, fill: mix(C.BG, col, 0.1), rx: 14 }),
      new Text(a, { size: 50, color: col }).at(0, -90),
      new Text(b.split(' ').slice(0, 4).join(' '), { size: 32 }).at(0, -10),
      new Text(b.split(' ').slice(4).join(' '), { size: 32 }).at(0, 34),
      new Text(c, { size: 42, font: 'mono', color: col }).at(0, 104)
    ).at(-600 + i * 600, -20)));
    S.paper('kool2019');
    S.beat('For language models, three baselines are popular. Train a second network, a critic, to predict the expected reward. Or sample several answers to the same prompt, and use the average reward of the others. Or normalize the rewards within that group. These are the choices behind P P O, R L O O, and G R P O.',
      A.FadeIn(h), lag(1.6, cards.map((c) => A.FadeIn(c, { dy: 30 }))), { cap: 'For language models, three baselines are popular: a critic network that predicts the expected reward; the average reward of the other answers to the same prompt; or rewards normalized within that group. These are the choices behind PPO, RLOO and GRPO.' });
    const loo = S.add(S.tex('A_i \\;=\\; r_i \\;-\\; \\frac{1}{k-1} \\sum_{j \\ne i} r_j', { size: 76, color: C.TEAL }).at(0, 290));
    S.paper('ahmadian2024');
    S.beat('The leave-one-out version is neat. For each answer, the baseline is the mean reward of the other answers to the same prompt. It never uses the answer\u2019s own reward, so it stays unbiased. Kool and colleagues proposed it in twenty nineteen, and in twenty twenty-four Ahmadian and colleagues found it outperformed P P O for learning from human feedback.',
      A.Indicate(cards[1], { color: C.TEAL, scale: 1.05 }), A.Write(loo, 1.6),
      { cap: 'The leave-one-out version: for each answer, the baseline is the mean reward of the other answers to the same prompt. It never uses the answer\u2019s own reward, so it stays unbiased. Kool et al. (2019) proposed it; Ahmadian et al. (2024) found it outperformed PPO for RLHF.' });
  });
});
