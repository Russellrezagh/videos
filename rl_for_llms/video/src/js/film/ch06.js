// Chapter 6 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch06(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 6 */
  video.chapter('ch6', 'Small steps: PPO');
  card(6, 'Small steps: trust regions and PPO');

  video.scene('steps', 'How far to step', (S) => {
    const h = S.add(S.title('How far should we step?'));
    const bars = S.add(S.bars({ labels: NEXT.labels, values: NEXT.p, h: 420, w: 130, gap: 90, colors: [C.GREEN, C.RED, C.RED, C.YELLOW, C.GREY] }).at(0, 230));
    S.beat('Now we can estimate a direction. But how far should we step? A gradient describes the policy only nearby. Step too far, and the policy can collapse: probability piles onto a few strange answers, and the samples that guided the step no longer describe the new policy.',
      A.FadeIn(h), A.FadeIn(bars), wait(2.5), bars.to([0.05, 0.02, 0.01, 0.02, 0.9], 1.4), A.Indicate(bars.bars[4], { color: C.RED, scale: 1.02 }));
    const reuse = S.add(S.txt('reuse each batch for several updates?', { size: 44, color: C.YELLOW }).at(0, -250));
    S.beat('Sampling is also expensive. We would like to reuse each batch of answers for several updates. But after the first update, those samples come from an older policy.',
      bars.to(NEXT.p, 1), A.FadeIn(reuse, { dy: -20 }));
  });

  video.scene('ratio', 'Importance ratios', (S) => {
    const h = S.add(S.title('Importance sampling'));
    const is = S.add(S.tex('\\mathbb{E}_{a \\sim \\pi_\\theta}\\big[A(a)\\big] \\;=\\; \\mathbb{E}_{a \\sim \\pi_{\\text{old}}}\\Big[\\, \\class{f-r}{\\frac{\\pi_\\theta(a)}{\\pi_{\\text{old}}(a)}}\\, A(a) \\Big]', { size: 72 }).at(0, -250));
    const rr = S.add(S.tex('r(\\theta) \\;=\\; \\frac{\\pi_\\theta(a)}{\\pi_{\\text{old}}(a)}', { size: 66, color: C.YELLOW }).at(0, -60));
    S.beat('Importance sampling fixes the bookkeeping. To average something under the new policy, using samples from the old one, weight each sample by the ratio of the two probabilities: new over old.',
      A.FadeIn(h), A.Write(is, 2), A.Focus(is, 'r', { color: C.YELLOW }), A.Write(rr, 1));
    const sur = S.add(S.tex('L(\\theta) = \\mathbb{E}_{\\text{old}}\\big[\\, r(\\theta)\\, A \\,\\big], \\qquad \\nabla L\\,\\big|_{\\theta = \\theta_{\\text{old}}} = \\mathbb{E}\\big[A\\, \\nabla \\log \\pi_\\theta\\big]', { size: 58 }).at(0, 120));
    S.beat('The surrogate objective, ratio times advantage, has exactly the policy gradient as its gradient at the start, where the ratio is one. But the further the ratio drifts, the less we should trust the old samples.',
      A.Unfocus(is), A.Write(sur, 2));
    const trpo = S.add(S.tex('\\max_\\theta\\; \\mathbb{E}\\big[r(\\theta)\\, A\\big] \\quad \\text{subject to} \\quad \\mathbb{E}\\big[\\mathrm{KL}(\\pi_{\\text{old}} \\,\\|\\, \\pi_\\theta)\\big] \\le \\delta', { size: 58, color: C.TEAL }).at(0, 280));
    S.paper('schulman2015trpo');
    S.beat('Trust region policy optimization, T R P O, adds a constraint: maximize the surrogate, but keep the average K L divergence between the old and new policies below a small number, delta.',
      A.Write(trpo, 2), { cap: 'Trust region policy optimization (TRPO) adds a constraint: maximize the surrogate, but keep the average KL divergence between the old and new policies below a small number δ.' });
  });

  video.scene('clip', 'The clip', (S) => {
    const h = S.add(S.title('Proximal policy optimization'));
    const L = S.add(S.tex('L^{\\text{CLIP}} = \\mathbb{E}\\Big[\\min\\big(r\\,A,\\;\\; \\operatorname{clip}(r,\\, 1-\\epsilon,\\, 1+\\epsilon)\\, A\\big)\\Big]', { size: 70, color: C.YELLOW }).at(0, -280));
    S.paper('schulman2017ppo');
    S.beat('Proximal policy optimization, P P O, gets a similar effect with a simpler trick. Clip the ratio to a band around one, from one minus epsilon to one plus epsilon, and take the smaller of the clipped and unclipped objectives. The paper suggests epsilon equal to zero point two.',
      A.FadeIn(h), A.Write(L, 2.4), { cap: 'Proximal policy optimization (PPO) gets a similar effect with a simpler trick: clip the ratio to [1 − ε, 1 + ε] and take the smaller of the clipped and unclipped objectives. The paper suggests ε = 0.2.' });
    const mk = (x, A0, col, label) => {
      const band = S.add(S.rect(128, 400, { stroke: 'none', width: 0, fill: mix(C.BG, C.GREY_B, 0.1), rx: 0 }).at(x, 110));
      const ax = S.add(S.axes({ x0: 0, x1: 2, y0: -1.6, y1: 1.6, w: 640, h: 400, xticks: [0, 0.8, 1, 1.2, 2], yticks: [-1, 0, 1], xfmt: (v) => String(v), size: 28, xlabel: 'ratio r' }).at(x, 110));
      const cur = ax.plot((r) => RL.ppoClip(r, A0), { color: col, width: 7, samples: 200 });
      const ghost = ax.plot((r) => r * A0, { color: C.GREY, width: 3, dash: '10 10' });
      const t = S.add(S.tex(label, { size: 50, color: col }).at(x, -150));
      return { ax, band, cur, ghost, t };
    };
    const pos = mk(-460, 0.7, C.GREEN, 'A > 0');
    S.beat('Look at it as a function of the ratio. When the advantage is positive, the objective rises with the ratio until one plus epsilon. Then it goes flat. There is nothing to gain from making a good answer more than twenty percent more likely in one round.',
      A.FadeIn(pos.ax), A.FadeIn(pos.band), A.FadeIn(pos.t), A.Create(pos.ghost, 1), A.Create(pos.cur, 1.6));
    const neg = mk(460, -0.7, C.RED, 'A < 0');
    S.beat('When the advantage is negative, it is the mirror image: flat below one minus epsilon. And where the objective is flat, its gradient is zero. Those samples simply stop pulling.',
      A.FadeIn(neg.ax), A.FadeIn(neg.band), A.FadeIn(neg.t), A.Create(neg.ghost, 1), A.Create(neg.cur, 1.6));
    const hl = S.add(S.circle(46, { stroke: C.YELLOW, width: 5 }).at(460 + neg.ax.fx(1.75), 110 + neg.ax.fy(-0.7 * 1.75)));
    S.beat('The minimum also keeps the pessimistic side. If a bad answer has become more likely, the unclipped term is the smaller one, and the full penalty stays.',
      A.Create(hl, 0.8), A.Indicate(hl, { scale: 1.2 }));
  });

  // the 3D landscape (film/landscapes.js, drawn with space3.js)
  if (FILM.landscapes && FILM.landscapes.clip) FILM.landscapes.clip(ctx);

  video.scene('ppoloop', 'PPO for language models', (S) => {
    const h = S.add(S.title('PPO for language models'));
    const tok = S.add(S.tex('r_t(\\theta) = \\frac{\\pi_\\theta(y_t \\mid x, y_{<t})}{\\pi_{\\text{old}}(y_t \\mid x, y_{<t})}', { size: 66 }).at(0, -260));
    S.beat('For a language model, all of this happens per token. Each token gets its own ratio and its own advantage, and the losses are averaged over tokens.', A.FadeIn(h), A.Write(tok, 1.8));
    const steps = [['sample answers', C.TEAL], ['score them', C.GOLD], ['advantages: critic + GAE', C.BLUE], ['clipped updates, a few epochs', C.YELLOW]];
    const pos = [[-500, -20], [500, -20], [500, 250], [-500, 250]];
    const boxes = steps.map(([t, col], i) => S.add(S.box(t, { w: 640, h: 110, color: col, size: 40 }).at(...pos[i])));
    const arrows = [[[-170, -20], [170, -20]], [[500, 40], [500, 190]], [[170, 250], [-170, 250]], [[-500, 190], [-500, 40]]].map(([a, b]) => S.add(S.arrow(a[0], a[1], b[0], b[1], { color: C.GREY_B, width: 5 })));
    S.beat('Put it together and you have the classic P P O loop for language models. Sample answers. Score them. Compute advantages with the critic and G A E. Then run a few epochs of clipped updates on minibatches, and repeat.',
      A.Shift(tok, 0, -10), lag(1.2, boxes.map((b, i) => seq(A.FadeIn(b, { dur: 0.5 }), A.Arrow(arrows[i], 0.5)))),
      { cap: 'Put it together and you have the classic PPO loop for language models. Sample answers. Score them. Compute advantages with the critic and GAE. Then run a few epochs of clipped updates on minibatches, and repeat.' });
  });
});
