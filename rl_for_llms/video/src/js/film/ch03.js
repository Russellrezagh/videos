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
    // where each line of the derivation sits: the previous step above, dimmed
    const UP = (m) => par(A.MoveTo(m, 0, -275), A.ScaleTo(m, 0.72), A.Set(m, { o: 0.5 }));

    // 1. the question, in words and then in symbols
    const goal = S.add(S.english('Which way should we nudge the {weights|th} so that the {average reward|JJ} goes up?', { size: 46 }).at(0, -250));
    const g0 = S.add(S.tex('\\grad\\, \\JJ(\\th)', { size: 124 }).at(0, -40));
    S.beat('Here is the question this whole chapter answers. Which way should we nudge the weights, so that the average reward goes up? In symbols, that question has a name: the gradient of J, with respect to theta.',
      A.FadeIn(h), S.writeIn(goal, 2.2), A.Write(g0, 1.4));
    S.tour(g0, [
      { sym: 'grad', at: [0, 215], say: 'The upside-down triangle, nabla, means the gradient. For every single weight, it asks: if this weight moved a tiny bit, how much would the quantity change? Collected together, those answers form an arrow that points uphill.' },
      { sym: 'JJ', at: [0, 215], say: 'J is the objective: the average reward the model earns when we sample answers from it. It is one number, and training exists to push it up.' },
      { sym: 'th', at: [0, 215], say: 'And theta stands for every adjustable number inside the network. Training may change theta, and nothing else.',
        cap: 'And θ stands for every adjustable number inside the network. Training may change θ, and nothing else.' },
    ]);

    // 2. the average, written out
    const L1 = S.add(S.tex('\\JJ(\\th) \\;=\\; \\sum_{\\aa}\\, \\pt(\\aa)\\; \\rr(\\aa)', { size: 84 }).at(0, -60));
    const e1 = S.add(S.english('for every answer {a|aa}: the {chance the model gives it|pt}, times the {reward it earns|rr}, all added up', { size: 40 }).at(0, 160));
    S.beat('Start by writing the average out. For our three answers it is a short sum. For each answer: the chance the model gives it, times the reward it earns. Then add them up.',
      S.endTour(g0), A.FadeOut(goal), A.FadeOut(g0), A.Write(L1, 1.8), S.writeIn(e1, 2.4));

    // 3. differentiate: only the probabilities depend on the weights
    const L2 = S.add(S.tex('\\grad \\JJ \\;=\\; \\sum_{\\aa}\\, \\rr(\\aa)\\; \\grad \\pt(\\aa)', { size: 84 }).at(0, -60));
    const r2 = S.add(S.reason('because: an answer’s {reward|rr} does not depend on the {weights|th}; only its {probability|pt} does'));
    S.beat('Now take the gradient of both sides. The rewards do not depend on the weights. Fifty-one is worth one point, whatever the model believes. Only the probabilities move when theta moves. So the gradient lands on each probability, and the rewards come along as plain numbers.',
      A.FadeOut(e1), UP(L1), A.Write(L2, 1.8), S.writeIn(r2, 1.6), A.Spot(L2, ['grad', 'pt']),
      { cap: 'Now take the gradient of both sides. The rewards do not depend on the weights: 51 is worth one point, whatever the model believes. Only the probabilities move when θ moves. So the gradient lands on each probability, and the rewards come along as plain numbers.' });

    // 4. why that is not good enough
    const huge = S.add(S.english('a language model’s possible answers outnumber the atoms in the universe', { size: 40, color: C.GREY_B }).at(0, 160));
    S.beat('But look at what this formula asks for: a sum over every possible answer. For three answers, fine. For a language model, the possible answers outnumber the atoms in the universe. We will never add them all up. All we can ever do is sample a few.',
      A.Unspot(L2), A.FadeOut(r2), S.writeIn(huge, 2), A.Spot(L2, 'aa'));

    // 5. make a probability appear
    const L3 = S.add(S.tex('\\grad\\pt(\\aa) \\;=\\; \\pt(\\aa)\\; \\frac{\\grad \\pt(\\aa)}{\\pt(\\aa)}', { size: 84 }).at(0, -60));
    const r3 = S.add(S.reason('because: multiplying by {π|pt} and dividing by {π|pt} is multiplying by one'));
    S.beat('Sampling is an average weighted by probability, so we need a probability out in front. Here is the trick: multiply the gradient of pi by pi, and divide by pi. That is multiplying by one, so nothing has changed. Yet.',
      A.Unspot(L2), A.FadeOut(huge), A.FadeOut(L1), UP(L2), A.Write(L3, 1.8), S.writeIn(r3, 1.4), A.Spot(L3, 'pt'),
      { cap: 'Sampling is an average weighted by probability, so we need a probability out in front. Here is the trick: multiply the gradient of π by π, and divide by π. That is multiplying by one, so nothing has changed. Yet.' });

    // 6. the chain rule names the fraction
    const L4 = S.add(S.tex('\\frac{\\grad \\pt(\\aa)}{\\pt(\\aa)} \\;=\\; \\grad \\lp(\\aa)', { size: 84 }).at(0, 130));
    const r4 = S.add(S.reason('because: the chain rule, (log u)′ = u′ / u'));
    S.beat('Now the fraction. The gradient of pi, divided by pi itself. The chain rule says the derivative of the log of anything is its derivative divided by itself. So this fraction is simply the gradient of log pi.',
      A.Unspot(L3), A.FadeOut(r3), A.Write(L4, 1.6), S.writeIn(r4, 1.2), A.Spot(L4, ['grad', 'lp']),
      { cap: 'Now the fraction: the gradient of π, divided by π itself. The chain rule says the derivative of the log of anything is its derivative divided by itself. So this fraction is simply the gradient of log π.' });
    const e4 = S.add(S.english('{∇ log π(a)|grad}: the direction to move the {weights|th} that makes answer a more likely', { size: 40 }).at(0, 300));
    S.beat('It is worth pausing on what that object means. The gradient of log pi of an answer is the direction to move the weights that makes that particular answer more likely. Back-propagation computes it for us, like any other gradient.',
      A.FadeOut(r4), S.writeIn(e4, 2),
      { cap: 'It is worth pausing on what that means. ∇ log π(a) is the direction to move the weights that makes that particular answer more likely. Back-propagation computes it for us, like any other gradient.' });

    // 7. substitute: the probability is back, as a weight
    const L5 = S.add(S.tex('\\grad\\JJ \\;=\\; \\sum_{\\aa}\\, \\pt(\\aa)\\; \\rr(\\aa)\\; \\grad\\lp(\\aa)', { size: 80 }).at(0, -60));
    S.beat('Put both pieces back into the sum, and look at what has happened. The probability of each answer has reappeared, sitting in front of everything else, as a weight.',
      A.Unspot(L4), A.FadeOut(e4), A.FadeOut(L2), A.FadeOut(L4), UP(L3), A.Write(L5, 2), A.Spot(L5, 'pt'));

    // 8. a probability-weighted sum is an expectation
    const L6 = S.add(S.tex('\\grad\\JJ \\;=\\; \\EE_{\\aa\\sim\\pt}\\Big[\\, \\rr(\\aa)\\; \\grad\\lp(\\aa) \\,\\Big]', { size: 80 }).at(0, 130));
    const r6 = S.add(S.reason('because: a sum of {probabilities|pt} times anything is the average of that thing over samples'));
    S.paper('sutton2000');
    S.beat('And a sum over answers, weighted by their probabilities, is exactly what an average over samples means. That is the meaning of this E: an expectation, with answers drawn from the model itself.',
      A.Write(L6, 2), S.writeIn(r6, 1.6), A.Spot(L6, ['EE', 'pt']));
    const e6 = S.add(S.english('the slope of the {average reward|JJ} = the average, over answers the model really gives, of {reward|rr} × {the direction that makes that answer more likely|grad}', { size: 38, width: 1500 }).at(0, 300));
    S.beat('Read the whole line as a sentence. The slope of the average reward is itself an average: over answers the model really gives, of reward, times the direction that makes that answer more likely. This is the policy gradient theorem.',
      A.Unspot(L6), A.FadeOut(r6), A.FadeOut(L3), A.FadeOut(L5), A.MoveTo(L6, 0, -60), S.writeIn(e6, 2.6));

    // 9. one sample, one estimate
    const est = S.add(S.tex('\\ghat \\;=\\; \\rr(\\aa)\\; \\grad\\lp(\\aa), \\qquad \\aa \\sim \\pt', { size: 84 }).at(0, -40));
    const frame = S.add(S.rect(est.w + 90, 140, { stroke: C.YELLOW, width: 4, rx: 12 }).at(0, -40));
    S.beat('Any average can be estimated by sampling. So: draw one answer from the model, ask the judge for its reward, and multiply that reward by the gradient of the answer’s log-probability. That one product is an estimate of the gradient. Noisy, but right on average.',
      A.FadeOut(e6), A.FadeOut(L6), A.Write(est, 1.8), A.Create(frame, 0.8));
    S.tour(est, [
      { sym: 'ghat', at: [0, 215], say: 'We call it g-hat. The hat is the statistician’s mark for: estimated from data, rather than computed exactly.' },
      { sym: ['aa', 'pt'], card: 'aa', at: [0, 215], text: { why: 'it is drawn from the model itself, so common answers are tried often' },
        say: 'And the little tilde says where the answer comes from. a is sampled from pi-theta, the model we are training. Answers it likes get tried often. Answers it rarely gives are rarely tried.',
        cap: 'And the tilde says where the answer comes from: a is sampled from π_θ, the model we are training. Answers it likes get tried often; answers it rarely gives are rarely tried.' },
    ]);
    const lens = S.lens();
    S.beat('Notice what is gone. The gradient never passes through the judge. We only need the reward as a plain number, and the gradient of the model’s own log-probability, which back-propagation computes as usual.',
      S.endTour(est), par(S.cam(0, -40, 1.6, 1.6), A.Set(lens, { o: 1, r: 520 }, 1.6)), wait(1.4), par(S.pullBack(1.4), A.Set(lens, { o: 0, r: 1150 }, 1.4)));
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
