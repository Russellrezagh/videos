// Chapter 7 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch07(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 7 */
  video.chapter('ch7', 'Rewards from preferences');
  card(7, 'Where rewards come from: preferences');

  video.scene('bt', 'Bradley and Terry', (S) => {
    const h = S.add(S.title('Comparisons, not scores'));
    const ca = S.add(S.box('answer A', { w: 360, h: 220, color: C.BLUE, size: 46 }).at(-300, -80));
    const cb = S.add(S.box('answer B', { w: 360, h: 220, color: C.BLUE, size: 46 }).at(300, -80));
    const who = S.add(S.creature({ color: C.GOLD, kind: 'scientist', size: 0.8 }).at(0, 200));
    const pick = S.add(S.tex('\\succ', { size: 90, color: C.GOLD }).at(0, -80));
    S.beat('Where does the reward come from? For open-ended tasks, like writing a helpful answer, there is no checker. But people can compare. Given two answers, which one is better?',
      A.FadeIn(h), A.FadeIn(ca, { dx: -30 }), A.FadeIn(cb, { dx: 30 }), A.FadeIn(who, { dy: 30 }), A.Look(who, -1, -0.5), wait(0.4), A.Look(who, 1, -0.5), A.FadeIn(pick, { from: 2 }), A.Indicate(ca, { color: C.GREEN }));
    const bt = S.add(S.tex('P(y_w \\succ y_l) \\;=\\; \\sigma\\big(r(x, y_w) - r(x, y_l)\\big), \\qquad \\sigma(t) = \\frac{1}{1 + e^{-t}}', { size: 64, color: C.YELLOW }).at(0, -280));
    S.paper('bradley1952');
    S.beat('To turn comparisons into numbers, we use a model from nineteen fifty-two, the Bradley-Terry model. Give each answer a hidden score, r. The chance that answer w beats answer l is the sigmoid of the difference of their scores.',
      par([ca, cb, who, pick].map((m) => A.FadeOut(m))), A.Write(bt, 2.2));
    const ax = S.add(S.axes({ x0: -6, x1: 6, y0: 0, y1: 1, w: 1000, h: 380, xticks: [-4, -2, 0, 2, 4], yticks: [0, 0.5, 1], xlabel: 'score difference', ylabel: 'probability the first one wins' }).at(40, 130));
    const sg = ax.plot((t) => RL.sigmoid(t), { color: C.BLUE, width: 7 });
    const p0 = S.add(S.dot(12, C.YELLOW).at(40 + ax.fx(0), 130 + ax.fy(0.5)));
    const p2 = S.add(S.dot(12, C.GREEN).at(40 + ax.fx(2), 130 + ax.fy(RL.sigmoid(2))));
    const t2 = S.add(S.txt(`difference 2: ${(RL.sigmoid(2) * 100).toFixed(0)}%`, { size: 36, color: C.GREEN, anchor: 'start' }).at(40 + ax.fx(2) + 30, 130 + ax.fy(RL.sigmoid(2)) + 40));
    S.beat('Only differences matter. Add the same constant to every score, and nothing changes. Equal scores give a coin flip. A difference of two gives about eighty-eight percent.',
      A.FadeIn(ax), A.Create(sg, 1.4), A.FadeIn(p0, { from: 2 }), A.FadeIn(p2, { from: 2 }), A.FadeIn(t2));
    const loss = S.add(S.tex('\\mathcal{L}_{\\text{RM}}(\\phi) \\;=\\; -\\,\\mathbb{E}\\Big[\\log \\sigma\\big(r_\\phi(x, y_w) - r_\\phi(x, y_l)\\big)\\Big]', { size: 70 }).at(0, 30));
    S.paper('christiano2017');
    S.beat('A reward model is a language model with a small head that outputs this score. It is trained on human comparisons by making the observed winners likely: the loss is minus log sigma, of the winner\u2019s score minus the loser\u2019s.',
      par([ax, p0, p2, t2].map((m) => A.FadeOut(m))), A.Write(loss, 2));
  });

  video.scene('rmfit', 'Fitting a reward model', (S) => {
    const h = S.add(S.title('Twenty thousand comparisons, five numbers'));
    const ax = S.add(S.axes({ x0: -0.5, x1: 4.5, y0: -1.5, y1: 1.5, w: 1000, h: 520, yticks: [-1, 0, 1], xlabel: '', ylabel: 'score' }).at(-60, 40));
    const xs = RM.labels.map((_, i) => -60 + ax.fx(i));
    const labs = RM.labels.map((l, i) => S.add(S.txt(l, { size: 44, font: 'mono' }).at(xs[i], 40 + 300)));
    const truth = RM.rTrue.map((r, i) => S.add(S.line(xs[i] - 70, 40 + ax.fy(r - RM.mean), xs[i] + 70, 40 + ax.fy(r - RM.mean), { stroke: C.GOLD, width: 6 })));
    const fit = RM.fit.r.map((r, i) => S.add(S.dot(16, C.BLUE).at(xs[i], 40 + ax.fy(r))));
    const leg = S.add(S.group(new Line(-40, 0, 40, 0, { stroke: C.GOLD, width: 6 }), new Text('true score (centred)', { size: 34, color: C.GOLD, anchor: 'start' }).at(60, 0), dot(14, C.BLUE).at(0, 60), new Text('fitted from comparisons', { size: 34, color: C.BLUE, anchor: 'start' }).at(60, 60)).at(420, -200));
    S.beat('Here is that loss at work, on a toy problem. Five answers with hidden true scores. We simulate twenty thousand noisy comparisons, and fit five numbers. The fitted scores land on the true ones, up to the shift that comparisons can never see.',
      A.FadeIn(h), A.FadeIn(ax), lag(0.1, labs.map((l) => A.FadeIn(l))), lag(0.15, truth.map((t) => A.Create(t, 0.4))), A.FadeIn(leg), lag(0.2, fit.map((f) => A.FadeIn(f, { from: 2.5 }))));
  });

  video.scene('instruct', 'InstructGPT', (S) => {
    const h = S.add(S.title('The RLHF recipe'));
    const steps = [['1  supervised fine-tuning', 'on demonstrations', C.TEAL], ['2  reward model', 'from rankings of the model\u2019s answers', C.GOLD], ['3  PPO', 'against it, with a KL penalty', C.YELLOW]];
    const boxes = steps.map(([a, b, col], i) => S.add(S.box(a, { w: 560, h: 150, color: col, size: 40, sub: b }).at(-600 + i * 600, -100)));
    const ar = [0, 1].map((i) => S.add(S.arrow(-600 + i * 600 + 290, -100, -600 + (i + 1) * 600 - 290, -100, { color: C.GREY_B, width: 5 })));
    S.paper('ouyang2022');
    S.beat('This is the recipe that turned G P T 3 into InstructGPT, published in twenty twenty-two. Step one: supervised fine-tuning on demonstrations. Step two: a reward model, trained on rankings of the model\u2019s own answers. Step three: P P O against that reward model, with a K L penalty that keeps it close to the supervised model.',
      A.FadeIn(h), lag(1.4, boxes.map((b, i) => seq(A.FadeIn(b, { dy: 20, dur: 0.6 }), i < 2 ? A.Arrow(ar[i], 0.5) : wait(0)))),
      { cap: 'This is the recipe that turned GPT-3 into InstructGPT (2022). Step 1: supervised fine-tuning on demonstrations. Step 2: a reward model trained on rankings of the model\u2019s own answers. Step 3: PPO against that reward model, with a KL penalty to the supervised model.' });
    const small = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.55 }).at(-260, 230));
    const large = S.add(S.creature({ color: C.GREY, kind: 'agent', size: 1.4 }).at(260, 180));
    const sl = S.add(S.txt('InstructGPT 1.3B', { size: 36, color: C.TEAL }).at(-260, 330));
    const ll = S.add(S.txt('GPT-3 175B', { size: 36, color: C.GREY_B }).at(260, 330));
    const pref = S.add(S.tex('\\succ', { size: 90, color: C.GOLD }).at(0, 200));
    S.beat('Labelers preferred the answers of the one point three billion parameter InstructGPT model to those of the one hundred seventy-five billion parameter G P T 3, a model more than a hundred times larger.',
      A.FadeIn(small, { dy: 20 }), A.FadeIn(sl), A.FadeIn(large, { dy: 20 }), A.FadeIn(ll), A.FadeIn(pref, { from: 2 }), A.Mood(small, 1),
      { cap: 'Labelers preferred the answers of the 1.3B-parameter InstructGPT model to those of the 175B-parameter GPT-3, a model more than 100 times larger.' });
  });

  video.scene('hacking', 'Reward hacking', (S) => {
    const h = S.add(S.title('Goodhart\u2019s law, measured'));
    const traits = ['too long', 'too flattering', 'confidently wrong'].map((t, i) => S.add(S.txt(t, { size: 48, color: C.RED }).at(-520 + i * 520, -150)));
    S.beat('But a reward model is only a model. Push hard enough on any proxy, and you find its mistakes. The policy learns answers the reward model loves and people do not: too long, too flattering, confidently wrong. This is called reward hacking.',
      A.FadeIn(h), lag(0.8, traits.map((t) => A.FadeIn(t, { dy: 20 }))));
    const gold = (d) => (d <= 0 ? 0 : d * (1 - 0.45 * Math.log(d)));
    const proxy = (d) => (d <= 0 ? 0 : d * (1 - 0.1 * Math.log(d)));
    const ax = S.add(S.axes({ x0: 0, x1: 8, y0: -0.5, y1: 5, w: 1100, h: 400, xticks: [0, 2, 4, 6, 8], yticks: [0, 2, 4], xlabel: 'distance from the start, \u221aKL', ylabel: 'reward' }).at(40, 90));
    const pc = ax.plot(proxy, { color: C.BLUE, width: 6, from: 0.001, to: 5 });
    const gc = ax.plot(gold, { color: C.GOLD, width: 6, from: 0.001, to: 8 });
    const pl = S.add(S.txt('proxy reward model', { size: 36, color: C.BLUE }).at(40 + ax.fx(4.2), 90 + ax.fy(proxy(4.2)) - 50));
    const gl = S.add(S.txt('gold reward', { size: 36, color: C.GOLD }).at(40 + ax.fx(6.2), 90 + ax.fy(gold(6.2)) - 50));
    const note = S.add(S.txt('shape from Gao et al. 2022: R(d) = d (\u03b1 \u2212 \u03b2 log d); constants illustrative', { size: 30, color: C.GREY, italic: true }).at(40, -360));
    S.paper('gao2023');
    S.beat('Gao, Schulman and Hilton measured this with a stand-in for people: a large gold reward model, and smaller proxy reward models trained on its labels. As the policy moves away from where it started, the proxy reward keeps climbing. The gold reward rises, peaks, and then falls.',
      par(traits.map((t) => A.FadeOut(t))), A.FadeIn(ax), A.Create(pc, 2), A.FadeIn(pl), A.Create(gc, 2.4), A.FadeIn(gl), A.FadeIn(note));
    const leash = S.add(S.txt('we need a leash', { size: 56, color: C.YELLOW }).at(-260, -250));
    S.beat('So we need a leash: something that keeps the policy close to where it started, where the reward model can still be trusted.', A.FadeIn(leash, { dy: -20 }));
  });
});
