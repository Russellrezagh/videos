// Chapter 3 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch03(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 3 */
  video.chapter('ch3', 'The log-derivative trick');
  card(3, 'The log-derivative trick');

  video.scene('bandit', 'Three answers', (S) => {
    const h = S.add(S.title('The smallest example'));
    const q = S.add(S.box('What is 17 × 3?', { w: 520, h: 96, color: C.GREY_B, size: 44 }).at(0, -330));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-80, 170));
    const rs = BAND.r.map((r, i) => S.add(S.txt(`reward ${r}`, { size: 38, color: C.GOLD }).at(-80 + bars.xs[i], 272)));
    S.beat('Strip everything away. One prompt, and just three possible answers: fifty-one, which is right; about fifty, which is close; and forty-one, which is wrong. Give them rewards one, zero point three, and zero.',
      A.FadeIn(h), A.FadeIn(q), A.FadeIn(bars, { dy: 30 }), lag(0.5, rs.map((r) => A.FadeIn(r, { dy: 10 }))),
      { cap: 'Strip everything away. One prompt, and just three possible answers: 51, which is right; about 50, which is close; and 41, which is wrong. Give them rewards 1, 0.3 and 0.' });
    const zs = BAND.z.map((z, i) => S.add(S.txt(`z = ${z.toFixed(1)}`, { size: 34, color: C.YELLOW, font: 'mono' }).at(-80 + bars.xs[i], 326)));
    const sm = S.add(S.tex('\\pi = \\operatorname{softmax}(z)', { size: 56, color: C.TEAL }).at(620, -150));
    S.beat('The model is now just three logits and a softmax. This setting, one choice and one reward, is called a bandit, after a row of slot machines.',
      lag(0.3, zs.map((z) => A.FadeIn(z))), A.Write(sm, 1));
    const Jt = S.add(S.tex(`J \\;=\\; \\sum_a \\pi_a\\, r_a \\;=\\; ${f2(BAND.pi[0])}\\cdot 1 + ${f2(BAND.pi[1])}\\cdot 0.3 + ${f2(BAND.pi[2])}\\cdot 0 \\;=\\; ${f2(BAND.J)}`, { size: 56 }).at(0, -280));
    S.beat(`The expected reward is a weighted average of the three rewards, weighted by the probabilities. Right now it is about zero point ${Math.round(BAND.J * 100)}.`,
      A.FadeOut(sm), A.FadeOut(q), A.Write(Jt, 2), { cap: `The expected reward is a weighted average of the three rewards, weighted by the probabilities. Right now it is about ${f2(BAND.J)}.` });
    const gArrows = BAND.grad.map((g, i) => {
      const [x, y] = [-80 + bars.xs[i] + 125, 170 - 380 * BAND.pi[i]];
      return S.add(S.arrow(x, y, x, y - g * 520, { color: g > 0 ? C.GREEN : C.RED, width: 6 }));
    });
    const gl = BAND.grad.map((g, i) => S.add(S.txt((g > 0 ? '+' : '') + f3(g), { size: 34, color: g > 0 ? C.GREEN : C.RED, font: 'mono', anchor: 'start' }).at(-80 + bars.xs[i] + 145, 170 - 380 * BAND.pi[i] - g * 520 + (g > 0 ? 10 : -10))));
    const ge = S.add(S.tex('\\frac{\\partial J}{\\partial z_b} \\;=\\; \\pi_b\\,(r_b - J)', { size: 60, color: C.WHITE }).at(620, -40));
    S.beat('Changing a logit changes the weights of that average. Here is the gradient, computed exactly: raise the logit of fifty-one, and lower the other two.',
      A.Write(ge, 1.2), lag(0.3, gArrows.map((a, i) => par(A.Arrow(a, 0.7), A.FadeIn(gl[i])))));
    const huge = S.add(S.txt('possible answers: more than atoms in the universe', { size: 44, color: C.RED }).at(0, -330));
    S.beat('But with a real model we cannot sum over every possible answer. There are more possible answers than atoms in the universe. We can only sample a few. So we need to write the gradient as an average over samples.',
      A.FadeOut(Jt), A.FadeIn(huge, { dy: -20 }));
  });

  video.scene('trick', 'Deriving the policy gradient', (S) => {
    const h = S.add(S.title('The log-derivative trick'));
    const l1 = S.add(S.tex('\\nabla_\\theta J \\;=\\; \\nabla_\\theta \\sum_a \\pi_\\theta(a)\\, r(a) \\;=\\; \\sum_a r(a)\\, \\class{f-g}{\\nabla_\\theta \\pi_\\theta(a)}', { size: 62 }).at(0, -270));
    S.beat('Here is the trick. Start from the gradient of the sum: the rewards, times the gradient of each probability.', A.FadeIn(h), A.Write(l1, 2));
    const l2 = S.add(S.tex('\\nabla_\\theta \\pi_\\theta(a) \\;=\\; \\pi_\\theta(a)\\, \\frac{\\nabla_\\theta \\pi_\\theta(a)}{\\pi_\\theta(a)} \\;=\\; \\pi_\\theta(a)\\, \\class{f-l}{\\nabla_\\theta \\log \\pi_\\theta(a)}', { size: 62 }).at(0, -105));
    S.beat('Now multiply and divide by the probability itself. The gradient of pi, divided by pi, is the gradient of log pi. That is just the chain rule for the logarithm.',
      A.Focus(l1, 'g', { color: C.YELLOW }), A.Write(l2, 2), A.Focus(l2, 'l', { color: C.TEAL }),
      { cap: 'Now multiply and divide by the probability itself. The gradient of π, divided by π, is the gradient of log π. That is just the chain rule for the logarithm.' });
    const l3 = S.add(S.tex('\\nabla_\\theta J \\;=\\; \\sum_a \\class{f-w}{\\pi_\\theta(a)}\\, r(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a) \\;=\\; \\class{f-e}{\\mathbb{E}_{a \\sim \\pi_\\theta}}\\big[\\, r(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a) \\,\\big]', { size: 58 }).at(0, 65));
    S.paper('sutton2000');
    S.beat('Substitute, and the probabilities reappear as weights. A sum weighted by probabilities is an expectation. So the gradient of the expected reward is the expected value of reward, times the gradient of log pi.',
      A.Unfocus(l1), A.Unfocus(l2), A.Write(l3, 2.2), A.Focus(l3, 'w', { color: C.YELLOW }), wait(0.8), A.Focus(l3, 'e', { color: C.YELLOW }),
      { cap: 'Substitute, and the probabilities reappear as weights. A sum weighted by probabilities is an expectation. So the gradient of the expected reward is the expected value of reward times the gradient of log π.' });
    const est = S.add(S.tex('\\hat g \\;=\\; R(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a), \\qquad a \\sim \\pi_\\theta', { size: 76, color: C.YELLOW }).at(0, 260));
    const frame = S.add(S.rect(est.w + 90, 130, { stroke: C.YELLOW, width: 4, rx: 12 }).at(0, 260));
    S.beat('That is the policy gradient. And we can estimate it with samples: draw an answer from the model, score it, and multiply the score by the gradient of its log-probability.',
      A.Unfocus(l3), A.Write(est, 1.6), A.Create(frame, 0.8));
    const lens = S.lens();
    S.beat('Notice what is gone. The gradient never passes through the judge. We only need the reward as a plain number, and the gradient of the model’s own log-probability, which back-propagation computes as usual.',
      par(S.cam(0, 260, 1.7, 1.6), A.Set(lens, { o: 1, r: 520 }, 1.6)), wait(1.4), par(S.pullBack(1.4), A.Set(lens, { o: 0, r: 1150 }, 1.4)));
  });

  video.scene('meaning', 'What the gradient says', (S) => {
    const h = S.add(S.title('Reading the policy gradient'));
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, colors: [C.GREEN, C.YELLOW, C.RED], h: 380, w: 170, gap: 170, labelFont: 'serif', labelSize: 44 }).at(-300, 250));
    const est = S.add(S.tex('\\hat g = R(a)\\, \\nabla_\\theta \\log \\pi_\\theta(a)', { size: 60, color: C.YELLOW }).at(520, -300));
    const pushes = BAND.r.map((r, i) => {
      const x = -300 + bars.xs[i];
      const y = 250 - 380 * BAND.pi[i] - 50;
      return S.add(S.arrow(x, y, x, y - 40 - 180 * r, { color: [C.GREEN, C.YELLOW, C.RED][i], width: 6 }));
    });
    const lab = BAND.r.map((r, i) => S.add(S.txt(`sampled: push × ${r}`, { size: 34, color: C.GREY_B }).at(-300 + bars.xs[i], 250 - 380 * BAND.pi[i] - 300 - 180 * r * 0.2)));
    S.beat('Read what it says. The gradient of log pi of an answer is the direction that makes that answer more likely. Each sample pushes its own probability up, by an amount proportional to its reward.',
      A.FadeIn(h), A.FadeIn(bars), A.FadeIn(est), lag(1.1, pushes.map((p, i) => par(A.Arrow(p, 0.6), A.FadeIn(lab[i]))) ),
      { cap: 'Read what it says. ∇ log π of an answer is the direction that makes that answer more likely. Each sample pushes its own probability up, by an amount proportional to its reward.' });
    const sc = S.add(S.tex('\\frac{\\partial \\log \\pi_a}{\\partial z_b} \\;=\\; \\mathbf{1}[a = b] \\;-\\; \\pi_b', { size: 60 }).at(470, -150));
    const sv = S.add(S.tex(`\\text{sample } 51:\\quad (1 - ${f2(BAND.pi[0])},\\; -${f2(BAND.pi[1])},\\; -${f2(BAND.pi[2])})`, { size: 42, color: C.TEAL }).at(470, -30));
    S.beat('For a softmax, that direction is beautifully simple. The gradient of log pi of a, with respect to the logits, is one for the chosen answer, minus the probability vector. Push up the chosen logit, and push every other logit down in proportion to how likely it was.',
      par(pushes.map((p) => A.FadeOut(p)), lab.map((l) => A.FadeOut(l))), A.Write(sc, 1.6), A.FadeIn(sv, { dy: 10 }),
      { cap: 'For a softmax that direction is simple: ∂ log π_a / ∂z_b = 1[a = b] − π_b. Push up the chosen logit, and push every other logit down in proportion to how likely it was.' });
  });

  video.scene('mc', 'Does it work?', (S) => {
    const h = S.add(S.title('Averaging samples'));
    const exact = BAND.grad[0];
    const ax = S.add(S.axes({ x0: 1, x1: 2000, y0: -0.2, y1: 0.6, w: 1240, h: 520, logx: true, xticks: [1, 10, 100, 1000], yticks: [-0.2, 0, 0.2, 0.4, 0.6], yfmt: (v) => v.toFixed(1), xlabel: 'samples', ylabel: 'estimate of ∂J/∂z for “51”' }).at(40, 30));
    const ex = ax.plot(() => exact, { color: C.YELLOW, width: 4, dash: '14 12', from: 1, to: 2000 });
    const run = ax.polyline(BAND.mc.filter((_, i) => i < 30 || i % 4 === 0), { color: C.BLUE, width: 5 });
    const exL = S.add(S.txt(`exact: ${f3(exact)}`, { size: 36, color: C.YELLOW }).at(560, 30 + ax.fy(exact) - 40));
    S.beat('Does it work? Here are samples, one at a time. Each single estimate points somewhere different. But their running average closes in on the exact gradient.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(ex, 0.8), A.FadeIn(exL), A.Create(run, 4));
    const tag = S.add(S.txt(`after 2,000 samples: ${f3(BAND.mc[1999][1])}`, { size: 36, color: C.BLUE }).at(-300, -230));
    S.paper('williams1992');
    S.beat('This estimator is called REINFORCE. Ronald Williams described it in nineteen ninety-two. It needs nothing from the judge except a number. The judge can be a person, a program, or a black box.',
      A.FadeIn(tag), { cap: 'This estimator is called REINFORCE. Ronald Williams described it in 1992. It needs nothing from the judge except a number. The judge can be a person, a program, or a black box.' });
  });

  video.scene('reinforce', 'REINFORCE for text', (S) => {
    const h = S.add(S.title('REINFORCE for language models'));
    const eq = S.add(S.tex('\\nabla_\\theta \\log \\pi_\\theta(y \\mid x) \\;=\\; \\sum_t \\nabla_\\theta \\log \\pi_\\theta\\big(y_t \\mid x,\\, y_{<t}\\big)', { size: 72 }).at(0, -230));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 52 }).at(0, 60));
    const R = S.add(S.txt('reward R = 1', { size: 44, color: C.GOLD }).at(0, 300));
    const ups = toks.items.map((t) => S.add(S.arrow(t.x, 10, t.x, -70, { color: C.GREEN, width: 5 })));
    S.beat('For a language model, the answer is a sequence, and its log-probability is a sum over tokens. So the gradient of the log-probability is a sum too: every token in a sampled answer gets the same push, scaled by the answer’s reward.',
      A.FadeIn(h), A.Write(eq, 2), A.Show(toks), lag(0.15, toks.items.map((t) => A.FadeIn(t.item, { dur: 0.4 }))), A.FadeIn(R), lag(0.12, ups.map((u) => A.Arrow(u, 0.4))));
    const box = S.add(S.box('sample a response  →  score it  →  push up every token, × score', { w: 1500, h: 110, color: C.YELLOW, size: 42 }).at(0, -60));
    S.beat('That is REINFORCE for language models: sample a response, score it, and nudge up every token in it, in proportion to the score. Everything else in this film is about making this simple idea work well.',
      par(A.FadeOut(toks), ups.map((u) => A.FadeOut(u)), A.FadeOut(R)), A.FadeIn(box, { from: 0.85 }));
  });

  /* =========================================================== CHAPTERS 4 to 7 */
});
