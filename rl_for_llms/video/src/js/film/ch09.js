// Chapter 9 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch09(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 9 */
  video.chapter('ch9', 'DPO');
  card(9, 'DPO: the reward model was inside the policy');

  video.scene('dpo', 'Direct preference optimization', (S) => {
    const h = S.add(S.title('Solve for the reward'));
    const inv = S.add(S.tex('r(x, y) \\;=\\; \\beta \\log \\frac{\\pi^*(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)} \\;+\\; \\beta \\log Z(x)', { size: 74, color: C.YELLOW }).at(0, -280));
    S.paper('rafailov2023');
    S.beat('In twenty twenty-three, Rafailov and colleagues at Stanford noticed something. If the optimal policy is determined by the reward, then the reward is determined by the optimal policy. Just solve for r.',
      A.FadeIn(h), A.Write(inv, 2.2));
    const bt = S.add(S.tex('P(y_w \\succ y_l) = \\sigma\\Big(\\beta \\log \\frac{\\pi^*(y_w)}{\\pi_{\\text{ref}}(y_w)} \\class{f-z1}{+ \\beta \\log Z} - \\beta \\log \\frac{\\pi^*(y_l)}{\\pi_{\\text{ref}}(y_l)} \\class{f-z2}{- \\beta \\log Z}\\Big)', { size: 56 }).at(0, -100));
    S.beat('Now put that into the Bradley-Terry model. Bradley-Terry only looks at differences of rewards, and the awkward term, beta log Z, is the same for both answers to the same prompt. It cancels.',
      A.Write(bt, 2.4), A.Focus(bt, 'z1', { color: C.RED }), wait(0.5), A.Focus(bt, 'z2', { color: C.RED }), A.Unfocus(bt));
    const loss = S.add(S.tex('\\mathcal{L}_{\\text{DPO}}(\\theta) = -\\,\\mathbb{E}\\Big[\\log \\sigma\\Big(\\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} - \\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)}\\Big)\\Big]', { size: 58, color: C.YELLOW }).at(0, 80));
    S.beat('So we can train the policy directly on preference pairs, with the same loss as the reward model, but with the policy’s own log ratios as the scores. This is Direct Preference Optimization, D P O.',
      A.Write(loss, 2.6), { cap: 'So we can train the policy directly on preference pairs, with the same loss as the reward model, but with the policy’s own log ratios as the scores. This is Direct Preference Optimization (DPO).' });
    const imp = S.add(S.tex('\\hat r_\\theta(x, y) \\;=\\; \\beta \\log \\frac{\\pi_\\theta(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)}', { size: 62, color: C.TEAL }).at(0, 250));
    S.beat('Beta times the log ratio acts as an implicit reward. In the words of the paper’s title: your language model is secretly a reward model.', A.Write(imp, 1.8));
  });

  video.scene('dpograd', 'What DPO pushes', (S) => {
    const h = S.add(S.title('The DPO gradient'));
    const g = S.add(S.tex('\\nabla_\\theta \\mathcal{L}_{\\text{DPO}} = -\\beta\\, \\mathbb{E}\\Big[\\class{f-w}{\\sigma\\big(\\hat r_\\theta(x, y_l) - \\hat r_\\theta(x, y_w)\\big)}\\, \\big(\\nabla \\log \\pi(y_w \\mid x) - \\nabla \\log \\pi(y_l \\mid x)\\big)\\Big]', { size: 54, color: C.YELLOW }).at(0, -260));
    const up = S.add(S.box('winner: pushed up', { w: 560, h: 100, color: C.GREEN, size: 40 }).at(-400, -60));
    const dn = S.add(S.box('loser: pushed down', { w: 560, h: 100, color: C.RED, size: 40 }).at(400, -60));
    const wt = S.add(S.txt('weight: large when the implicit reward ranks them the wrong way round', { size: 38, color: C.YELLOW }).at(0, 80));
    S.beat('Its gradient is easy to read. Push up the winner’s log-probability, push down the loser’s, weighted by how wrong the implicit reward currently is: the sigmoid of the loser’s implicit reward minus the winner’s.',
      A.FadeIn(h), A.Write(g, 2.6), A.FadeIn(up, { dx: -20 }), A.FadeIn(dn, { dx: 20 }), A.Focus(g, 'w', { color: C.YELLOW }), A.FadeIn(wt));
  });

  video.scene('dpoconv', 'Same destination', (S) => {
    const h = S.add(S.title('Does DPO land where RLHF lands?'));
    const bars = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 420, w: 140, gap: 90, colors: [C.GREY_B, C.GREEN, C.RED, C.PINK], labelFont: 'serif', labelSize: 40 }).at(-430, 220));
    const ticks = DPO.star.map((p, i) => S.add(S.line(-430 + bars.xs[i] - 90, 220 - 420 * p, -430 + bars.xs[i] + 90, 220 - 420 * p, { stroke: C.YELLOW, width: 5, dash: '12 8' })));
    const tl = S.add(S.group(new Line(-40, 0, 40, 0, { stroke: C.YELLOW, width: 5, dash: '12 8' }), new Text('RLHF optimum, β = 0.5', { size: 34, color: C.YELLOW, anchor: 'start' }).at(60, 0)).at(200, -220));
    const kl = S.add(S.txt('', { size: 38, color: C.TEAL, font: 'mono', anchor: 'start' }).at(160, -140));
    const snaps = [0, 1, 3, 10, 60].map((i) => DPO.run.trace[Math.min(i, DPO.run.trace.length - 1)]);
    const steps = snaps.slice(1).map((sn, i) => seq(par(bars.to(sn.pi, 1.2), A.Set(kl, { str: `step ${sn.step}: KL ${sn.kl < 1e-9 ? '< 1e-9' : sn.kl.toExponential(1)}` }, 0.01)), wait(0.4)));
    S.beat('Does it really land in the same place as R L H F? On our toy problem, yes. Train D P O on every pair, with unlimited comparisons drawn from the true rewards, and the policy converges to the exact tilted distribution.',
      A.FadeIn(h), A.FadeIn(bars), lag(0.1, ticks.map((t) => A.Create(t, 0.4))), A.FadeIn(tl), A.Set(kl, { o: 1, str: `step 0: KL ${snaps[0].kl.toFixed(3)}` }, 0.01), seq(steps),
      { cap: 'Does it land in the same place as RLHF? On our toy problem, yes: trained on every pair, with unlimited comparisons drawn from the true rewards, DPO converges to the exact tilted distribution.' });
    const pros = S.add(S.txt('no reward model · no sampling · no critic', { size: 44, color: C.GREEN }).at(0, -380));
    S.beat('No reward model, no sampling, no critic. Just a classification loss on pairs. That is why D P O spread so quickly.', A.FadeIn(pros, { dy: -20 }),
      { cap: 'No reward model, no sampling, no critic: just a classification loss on pairs. That is why DPO spread so quickly.' });
    const cons = ['unlimited data', 'a model that can represent the optimum', 'pairs that cover what the policy produces'].map((t, i) => S.add(S.txt(t, { size: 36, color: C.RED, anchor: 'start' }).at(160, -120 + i * 64)));
    const assume = S.add(S.txt('the equivalence assumes', { size: 36, color: C.GREY_B, anchor: 'start' }).at(160, -190));
    S.beat('But the equivalence assumes a lot: unlimited data, a model that can represent the optimum, and comparisons that cover the answers the policy will actually produce. In practice, D P O learns from a fixed set of pairs, and it can even lower the probability of the preferred answer, as long as the rejected one falls faster.',
      A.FadeOut(kl), A.FadeOut(tl), A.FadeIn(assume), lag(0.6, cons.map((c) => A.FadeIn(c, { dx: -20 }))),
      { cap: 'But the equivalence assumes a lot: unlimited data, a model that can represent the optimum, and comparisons that cover what the policy will produce. In practice DPO learns from a fixed set of pairs, and it can even lower the probability of the preferred answer, as long as the rejected one falls faster.' });
  });
});
