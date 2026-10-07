// Chapter 10 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch10(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 10 */
  video.chapter('ch10', 'Verifiable rewards and GRPO');
  card(10, 'Rewards you can check: GRPO');

  video.scene('rlvr', 'Verifiable rewards', (S) => {
    const h = S.add(S.title('A judge that cannot be flattered'));
    const v = S.add(S.tex('v(x, y) \\;=\\; \\begin{cases} \\alpha & \\text{if the answer is correct} \\\\ 0 & \\text{otherwise} \\end{cases}', { size: 70, color: C.GREEN }).at(0, -150));
    const ex = [['final number matches', C.GREEN], ['unit tests pass', C.GREEN], ['format is right', C.TEAL]].map(([t, col], i) => S.add(S.group(S.check(40, col).with({ o: 1 }), new Text(t, { size: 40, anchor: 'start' }).at(44, 0)).at(-520 + i * 520, 120)));
    S.paper('lambert2024');
    S.beat('For math and code, there is a better judge than any reward model: check the answer. Does the final number match? Do the unit tests pass? The Tooloo three team called this reinforcement learning with verifiable rewards.',
      A.FadeIn(h), A.Write(v, 2), lag(0.6, ex.map((e) => A.FadeIn(e, { dy: 20 }))),
      { cap: 'For math and code there is a better judge than any reward model: check the answer. Does the final number match? Do the unit tests pass? The Tülu 3 team called this reinforcement learning with verifiable rewards (RLVR).' });
    const w = S.add(S.txt('the only thing left to exploit is the check itself', { size: 42, color: C.YELLOW }).at(0, 290));
    S.beat('A verifier cannot be flattered. The only thing left to exploit is the check itself, so it must be written carefully.', A.FadeIn(w, { dy: 20 }));
  });

  video.scene('grpo', 'Group relative policy optimization', (S) => {
    const h = S.add(S.title('Group relative policy optimization'));
    const q = S.add(S.box('one question', { w: 380, h: 90, color: C.GREY_B, size: 42 }).at(0, -330));
    const xs = GROUP.r.map((_, i) => -735 + i * 210);
    const chips = GROUP.r.map((r, i) => S.add(S.box(`answer ${i + 1}`, { w: 180, h: 80, color: C.BLUE, size: 32 }).at(xs[i], -170)));
    const lines = xs.map((x) => S.add(S.line(0, -285, x, -210, { stroke: C.GREY, width: 3 }).with({ draw: 0 })));
    S.paper('shao2024');
    S.beat('The method most associated with verifiable rewards is G R P O, group relative policy optimization, introduced with DeepSeekMath in twenty twenty-four. For each question, sample a group of answers. Here, eight.',
      A.FadeIn(h), A.FadeIn(q), lag(0.1, lines.map((l) => A.Create(l, 0.4))), lag(0.12, chips.map((c) => A.FadeIn(c, { dy: 20, dur: 0.4 }))),
      { cap: 'The method most associated with verifiable rewards is GRPO, group relative policy optimization, introduced with DeepSeekMath in 2024. For each question, sample a group of answers. Here, eight.' });
    const marks = GROUP.r.map((r, i) => S.add((r ? S.check(44) : S.cross(38)).at(xs[i], -80)));
    const rl = GROUP.r.map((r, i) => S.add(S.txt(`r = ${r}`, { size: 32, color: C.GOLD, font: 'mono' }).at(xs[i], -20)));
    const adv = S.add(S.tex('\\hat A_i \\;=\\; \\frac{r_i - \\operatorname{mean}(r)}{\\operatorname{std}(r)}', { size: 66, color: C.YELLOW }).at(-460, 180));
    const al = GROUP.adv.map((a, i) => S.add(S.txt(`${a > 0 ? '+' : ''}${f2(a)}`, { size: 34, color: a > 0 ? C.GREEN : C.RED, font: 'mono' }).at(xs[i], 40)));
    const stats = S.add(S.txt(`mean ${f3(RL.sum(GROUP.r) / 8)}, std ${f3(Math.sqrt(RL.sum(GROUP.r.map((x) => (x - 0.375) ** 2)) / 8))}`, { size: 34, color: C.GREY_B }).at(360, 180));
    S.beat('Score each one: one for correct, zero for wrong. Each answer’s advantage is its reward minus the group mean, divided by the group’s standard deviation.',
      lag(0.1, marks.map((m) => A.Create(m, 0.3))), lag(0.05, rl.map((r) => A.FadeIn(r))), A.Write(adv, 1.6), A.FadeIn(stats), lag(0.06, al.map((a) => A.FadeIn(a))));
    S.beat('Correct answers get a positive advantage, wrong ones a negative advantage, and the group’s own average plays the role of the baseline. No critic network. Every token in an answer shares that answer’s advantage.',
      lag(0.06, al.map((a, i) => A.Indicate(a, { color: GROUP.adv[i] > 0 ? C.GREEN : C.RED, scale: 1.25 }))));
    const obj = S.add(S.tex('\\mathcal{J}_{\\text{GRPO}} = \\mathbb{E}\\Big[\\frac{1}{G}\\sum_{i=1}^{G} \\frac{1}{|o_i|} \\sum_{t=1}^{|o_i|} \\Big\\{ \\min\\big(r_{i,t}\\hat A_{i},\\; \\operatorname{clip}(r_{i,t}, 1-\\epsilon, 1+\\epsilon)\\hat A_{i}\\big) - \\beta\\, \\mathbb{D}_{\\text{KL}}\\big[\\pi_\\theta \\,\\|\\, \\pi_{\\text{ref}}\\big] \\Big\\}\\Big]', { size: 46, color: C.WHITE }).at(0, 310));
    S.beat('The update is P P O’s: per-token clipped ratios, times these advantages, plus a K L penalty to the reference model, added straight to the loss.',
      A.FadeOut(stats), A.FadeOut(adv), A.Write(obj, 3), { cap: 'The update is PPO’s: per-token clipped ratios, times these advantages, plus a KL penalty to the reference model, added straight to the loss (DeepSeekMath, Eq. 3).' });
    const k3 = S.add(S.tex('\\mathbb{D}_{\\text{KL}} \\approx \\frac{\\pi_{\\text{ref}}}{\\pi_\\theta} - \\log \\frac{\\pi_{\\text{ref}}}{\\pi_\\theta} - 1', { size: 62, color: C.TEAL }).at(-460, 180));
    const kn = S.add(S.txt(`toy example: spread ${GROUP.kl.k1.sd.toFixed(3)} (log ratio) vs ${GROUP.kl.k3.sd.toFixed(4)} (this one)`, { size: 32, color: C.GREY_B }).at(360, 180));
    S.paper('schulman2020kl');
    S.beat(`That K L term is estimated per token with a formula from John Schulman: the ratio, minus the log of the ratio, minus one. On average it equals the K L divergence. Unlike the plain log ratio, it is never negative, and when the two policies are close it is far less noisy. In a small example, its spread is ${Math.round(GROUP.kl.k1.sd / GROUP.kl.k3.sd)} times smaller.`,
      A.Write(k3, 1.8), A.FadeIn(kn),
      { cap: `That KL term is estimated per token with a formula from John Schulman: ratio − log(ratio) − 1. On average it equals the KL divergence; unlike the plain log ratio it is never negative, and when the policies are close it is far less noisy (here ${Math.round(GROUP.kl.k1.sd / GROUP.kl.k3.sd)}× smaller spread).` });
  });

  video.scene('dead', 'Groups that teach nothing', (S) => {
    const h = S.add(S.title('When the whole group agrees'));
    const ax = S.add(S.axes({ x0: 0, x1: 1, y0: 0, y1: 1, w: 1000, h: 420, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1], xlabel: 'chance the model solves the question', ylabel: 'groups of 8 with no signal' }).at(40, 90));
    const cv = ax.plot((p) => RL.deadGroupProbability(p, 8), { color: C.RED, width: 6 });
    const mid = S.add(S.dot(12, C.YELLOW).at(40 + ax.fx(0.5), 90 + ax.fy(RL.deadGroupProbability(0.5, 8))));
    const midL = S.add(S.txt('2 in 256', { size: 36, color: C.YELLOW }).at(40 + ax.fx(0.5), 90 + ax.fy(0) - 60));
    S.beat('Now a subtle problem. If all eight answers are correct, or all eight are wrong, every advantage is zero, and the question teaches nothing. For a question the model solves half the time, that happens in only two groups out of two hundred fifty-six. But for questions that are very easy or very hard, it is almost every group.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(cv, 2), A.FadeIn(mid, { from: 2 }), A.FadeIn(midL),
      { cap: 'Now a subtle problem. If all eight answers are correct, or all eight are wrong, every advantage is zero and the question teaches nothing. For a question solved half the time that happens in 2 groups out of 256; for very easy or very hard questions it is almost every group.' });
    const dapo = [['dynamic sampling', 'skip all-right / all-wrong groups'], ['clip-higher', 'ε low 0.2, ε high 0.28'], ['token-level loss', 'average over all batch tokens']].map(([a, b], i) => S.add(S.box(a, { w: 560, h: 130, color: C.TEAL, size: 40, sub: b }).at(-600 + i * 600, -230)));
    S.paper('yu2025dapo');
    S.beat('DAPO, from ByteDance Seed and Chinghwa University, filters those groups out and samples more, which they call dynamic sampling. It also raises the upper clip limit, from zero point two to zero point two eight, so that rare but good tokens can grow faster. And it averages the loss over all tokens in the batch, rather than answer by answer.',
      par(A.FadeOut(ax), A.FadeOut(mid), A.FadeOut(midL)), lag(1.6, dapo.map((d) => A.FadeIn(d, { dy: 20 }))),
      { cap: 'DAPO (ByteDance Seed, Tsinghua) filters those groups out and samples more: dynamic sampling. It raises the upper clip limit from 0.2 to 0.28 so that rare good tokens can grow faster, and it averages the loss over all tokens in the batch rather than answer by answer.' });
    const shortT = S.add(S.tokens(['wrong', 'answer'], { size: 36, colors: [C.RED, C.RED] }).at(-420, 60));
    const longT = S.add(S.tokens(['a', 'very', 'long', 'and', 'rambling', 'wrong', 'answer'], { size: 36, colors: Array(7).fill(C.RED) }).at(300, 60));
    const sp = S.add(S.txt('per token: −A / 2', { size: 38, color: C.RED, font: 'mono' }).at(-420, 160));
    const lp = S.add(S.txt('per token: −A / 7', { size: 38, color: C.RED, font: 'mono' }).at(300, 160));
    const bias = S.add(S.txt('dividing by length: rambling when wrong is punished less per token', { size: 38, color: C.YELLOW }).at(0, 270));
    S.paper('liu2025drgrpo');
    S.beat('That last change matters. G R P O divides each answer’s loss by its length. A long wrong answer is then penalized less per token than a short wrong one, which quietly rewards rambling when wrong. The Dr. G R P O paper calls this a response-level length bias, and removes both the length division and the standard deviation scaling.',
      A.FadeIn(shortT), A.FadeIn(longT), A.FadeIn(sp), A.FadeIn(lp), A.FadeIn(bias, { dy: 10 }),
      { cap: 'That last change matters. GRPO divides each answer’s loss by its length, so a long wrong answer is penalized less per token than a short wrong one, which quietly rewards rambling when wrong. The Dr. GRPO paper calls this a response-level length bias, and removes both the length division and the std scaling.' });
    const gs = S.add(S.tex('s_i(\\theta) \\;=\\; \\Big(\\frac{\\pi_\\theta(y_i \\mid x)}{\\pi_{\\text{old}}(y_i \\mid x)}\\Big)^{1/|y_i|}', { size: 64, color: C.PINK }).at(0, 120));
    S.paper('zheng2025gspo');
    S.beat('Other variants change the ratio itself. Kwen’s G S P O uses one ratio for the whole answer, the geometric mean of its token ratios, which proved steadier for large mixture-of-experts models.',
      par([shortT, longT, sp, lp, bias, ...dapo].map((m) => A.FadeOut(m))), A.Write(gs, 2),
      { cap: 'Other variants change the ratio itself. Qwen’s GSPO uses one ratio for the whole answer, the geometric mean of its token ratios, which proved steadier for large mixture-of-experts models.' });
  });

  video.scene('r1', 'R1-Zero', (S) => {
    const h = S.add(S.title('DeepSeek-R1-Zero'));
    const base = 300;
    const b0 = S.add(S.bar(-260, base, 15.6 * 6, C.GREY, 160));
    const b1 = S.add(S.bar(260, base, 77.9 * 6, C.GREEN, 160));
    const l0 = S.add(S.txt('before RL: 15.6%', { size: 40, color: C.GREY_B }).at(-260, base - 15.6 * 6 - 40));
    const l1 = S.add(S.txt('after RL: 77.9%', { size: 40, color: C.GREEN }).at(260, base - 77.9 * 6 - 40));
    const ax = S.add(S.line(-480, base, 480, base, { stroke: C.GREY_B, width: 3 }));
    const lab = S.add(S.txt('AIME 2024, pass@1', { size: 36, color: C.GREY_B }).at(0, base + 44));
    S.paper('deepseek2025');
    S.beat('Applied straight to a base model, with no supervised step, and rewards only for correctness and format, this recipe produced DeepSeek R1 Zero. On the Aim twenty twenty-four math competition, its pass at one rose from fifteen point six percent to seventy-seven point nine percent.',
      A.FadeIn(h), A.FadeIn(ax), A.FadeIn(lab), A.Create(b0, 0.8), A.FadeIn(l0), A.Create(b1, 2), A.FadeIn(l1),
      { cap: 'Applied straight to a base model, with no supervised step and rewards only for correctness and format, this recipe produced DeepSeek-R1-Zero. On AIME 2024, its pass@1 rose from 15.6% to 77.9% (Nature version; 71.0% in the first arXiv version).' });
    const q = S.add(S.quote('Wait, wait. Wait. That’s an aha moment I can flag here.', 'DeepSeek-R1-Zero, in the middle of a solution', { size: 46, y: -40 }));
    S.beat('Its answers grew longer as training went on, and it began to re-check its own work. The authors showed one such moment, which the model itself called an aha moment. Later analysis found that base models already show some of this behavior; reinforcement learning made it frequent.',
      par([b0, b1, l0, l1, ax, lab].map((m) => A.FadeOut(m))), A.FadeIn(q, { dy: 20 }));
  });
});
