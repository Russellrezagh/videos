// Chapter 11 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch11(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 11 */
  video.chapter('ch11', 'What RL changes');
  card(11, 'What reinforcement learning changes');

  video.scene('passk', 'Sharpening', (S) => {
    const h = S.add(S.title('pass@k'));
    const pk = S.add(S.tex('\\text{pass@}k \\;=\\; \\mathbb{E}\\Bigg[\\,1 - \\frac{\\binom{n - c}{k}}{\\binom{n}{k}}\\,\\Bigg]', { size: 72, color: C.YELLOW }).at(0, -250));
    S.paper('chen2021');
    S.beat('What does this training actually change? Measure pass at k: the chance that at least one of k samples is correct. From n samples with c correct, the unbiased estimate is one minus a ratio of binomial coefficients.',
      A.FadeIn(h), A.Write(pk, 2.2), { cap: 'What does this training actually change? Measure pass@k: the chance that at least one of k samples is correct. From n samples with c correct, the unbiased estimate is 1 − C(n−c, k) / C(n, k).' });
    const ax = S.add(S.axes({ x0: 1, x1: 256, y0: 0, y1: 1, w: 1100, h: 400, logx: true, xticks: [1, 4, 16, 64, 256], yticks: [0, 0.5, 1], xlabel: 'k', ylabel: 'problems solved' }).at(40, 100));
    const cb = ax.polyline(PASS.base, { color: C.GREY_B, width: 6 });
    const cr = ax.polyline(PASS.rl, { color: C.GREEN, width: 6 });
    const lb = S.add(S.txt('base model', { size: 36, color: C.GREY_B }).at(40 + ax.fx(64), 100 + ax.fy(PASS.base[6][1]) - 40));
    const lr = S.add(S.txt('after RL', { size: 36, color: C.GREEN }).at(40 + ax.fx(4), 100 + ax.fy(PASS.rl[2][1]) - 40));
    const toy = S.add(S.toy(500, 380 - 70));
    S.paper('yue2025');
    S.beat('Reinforcement learning raises pass at one, a lot: the model puts more mass on answers it could already find. But Yue and colleagues found that with enough samples, base models often solve as many problems, or more. Much of the gain is sharpening, not new ability.',
      A.FadeOut(pk), A.FadeIn(ax), A.Create(cb, 1.6), A.FadeIn(lb), A.Create(cr, 1.6), A.FadeIn(lr), A.FadeIn(toy),
      { cap: 'Reinforcement learning raises pass@1 a lot: the model puts more mass on answers it could already find. But Yue et al. found that with enough samples, base models often solve as many problems, or more. Much of the gain is sharpening, not new ability.' });
    const ent = S.add(S.tex('H(\\pi) \\;=\\; -\\sum_a \\pi(a) \\log \\pi(a)', { size: 60, color: C.TEAL }).at(0, -290));
    S.beat('Sharpening has a cost: entropy falls, and with it, exploration. If the model never samples a correct answer, no gradient can reward it.', A.Write(ent, 1.6));
  });

  video.scene('unify', 'One equation', (S) => {
    const h = S.add(S.title('Every method, one shape'));
    const eq = S.add(S.tex('\\nabla_\\theta \\;\\approx\\; \\mathbb{E}\\Big[\\, \\class{f-w}{w(x, y)}\\; \\nabla_\\theta \\log \\pi_\\theta(y \\mid x) \\,\\Big]', { size: 84, color: C.YELLOW }).at(0, -300));
    S.beat('Step back. Every method in this film has the same shape: an average, over some answers, of a weight times the gradient of their log-probability. Only the weight changes.',
      A.FadeIn(h), A.Write(eq, 2), A.Focus(eq, 'w', { color: C.YELLOW }));
    const rows = [
      ['SFT', '1 \\text{ on demonstrations}', C.TEAL],
      ['REINFORCE', 'R(x, y)', C.BLUE],
      ['+ baseline', 'R - b = A', C.GREEN],
      ['PPO', 'A, \\text{ switched off by the clip}', C.YELLOW],
      ['DPO', '\\pm\\beta\\, \\sigma(\\hat r_l - \\hat r_w)', C.RED],
      ['GRPO', '(r_i - \\operatorname{mean}) / \\operatorname{std}', C.PINK],
    ];
    const rm = rows.map(([n, w, col], i) => S.add(S.group(new Text(n, { size: 44, color: col, anchor: 'end' }).at(-140, 0), new Tex(w, { size: 50, color: C.WHITE }).at(260, 0)).at(0, -150 + i * 82)));
    S.beat('For supervised fine-tuning, the weight is one, on the demonstrations. For REINFORCE, it is the reward. With a baseline, the advantage. For P P O, the advantage, switched off by the clip. For D P O, plus or minus beta, times a sigmoid of how wrong the implicit reward is. For G R P O, the group-normalized reward.',
      lag(1.3, rm.map((r) => A.FadeIn(r, { dx: -30 }))),
      { cap: 'For SFT the weight is 1, on the demonstrations. For REINFORCE, the reward. With a baseline, the advantage. For PPO, the advantage, switched off by the clip. For DPO, ±β times a sigmoid of how wrong the implicit reward is. For GRPO, the group-normalized reward.' });
    S.beat('The art is all in the weight: making it low in noise, honest enough, and hard to game, while keeping the policy close to what it already knows.', A.Unfocus(eq), lag(0.1, rm.map((r) => A.Indicate(r, { color: C.YELLOW, scale: 1.04, dur: 0.6 }))));
  });

  video.scene('recap', 'Recap', (S) => {
    const steps = ['a language model is a policy over tokens', 'the log-derivative trick turns a sampled reward into a gradient', 'baselines and critics tame the noise', 'PPO keeps each step small', 'Bradley–Terry turns preferences into rewards', 'the KL leash, and its exact solution, give DPO', 'verifiable rewards and group baselines give GRPO'];
    const sm = steps.map((t, i) => S.add(S.txt(t, { size: 40, color: [C.BLUE, C.YELLOW, C.GREEN, C.YELLOW, C.GOLD, C.RED, C.PINK][i] }).at(0, -330 + i * 80)));
    S.beat('Let us retrace the path. A language model is a policy over tokens. The log-derivative trick turns a reward we can only sample into a gradient we can estimate. Baselines and critics tame its noise. P P O keeps each step small.',
      lag(2.2, sm.slice(0, 4).map((m) => A.FadeIn(m, { dy: 20 }))),
      { cap: 'Let us retrace the path. A language model is a policy over tokens. The log-derivative trick turns a reward we can only sample into a gradient we can estimate. Baselines and critics tame its noise. PPO keeps each step small.' });
    S.beat('Preferences become rewards through Bradley-Terry. The K L leash keeps the policy near where it began, and its exact solution reveals D P O. And with verifiable rewards and group baselines, G R P O trains reasoning models without a critic.',
      lag(2.4, sm.slice(4).map((m) => A.FadeIn(m, { dy: 20 }))),
      { cap: 'Preferences become rewards through Bradley–Terry. The KL leash keeps the policy near where it began, and its exact solution reveals DPO. And with verifiable rewards and group baselines, GRPO trains reasoning models without a critic.' });
    const fin = S.add(S.tex('\\nabla_\\theta\\, \\mathbb{E}_{y \\sim \\pi_\\theta}\\big[R(y)\\big] \\;=\\; \\mathbb{E}_{y \\sim \\pi_\\theta}\\big[R(y)\\, \\nabla_\\theta \\log \\pi_\\theta(y)\\big]', { size: 84, color: C.YELLOW }).at(0, -40));
    const title = S.add(S.txt('The Gradient of Reward', { size: 54, color: C.GREY_B }).at(0, 140));
    S.beat('All of it rests on one line: the gradient of an expectation is the expectation of the reward, times the gradient of the log-probability. Thanks for watching.',
      par(sm.map((m) => A.FadeOut(m))), A.Write(fin, 2.4), A.FadeIn(title), { hold: 2.5 });
    S.keep();
  });
});
