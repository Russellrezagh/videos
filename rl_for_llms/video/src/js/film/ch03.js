// Chapter 3 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch03(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // signed numbers with a real minus sign, for on-screen values
  const sgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '+') + Math.abs(x).toFixed(d);
  const num = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '') + Math.abs(x).toFixed(d);
  // the same numbers inside TeX
  const tsgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '-' : '+') + Math.abs(x).toFixed(d);
  // the bandit, recomputed for "what if" questions (kernel: src/js/rl.js)
  const piOf = (z) => RL.softmax(z);
  const Jof = (z) => RL.expectedReward(RL.softmax(z), BAND.r);
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  // a side note in the "because" style, for layouts with a picture on the left
  const side = (S, str, x, y, w = 760) => S.english(str, { size: 34, color: C.GREY_B, italic: true, width: w }).at(x, y);
  // words a narrator says for a two-decimal number
  const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const say2 = (x) => {
    const s = Math.abs(x).toFixed(2);
    const [a, b] = s.split('.');
    return `${x < 0 ? 'minus ' : ''}${DIG[+a]} point ${b.split('').map((d) => DIG[+d]).join(' ')}`;
  };

  /* =========================================================== CHAPTER 3 */
  video.chapter('ch3', 'The log-derivative trick');
  card(3, 'The log-derivative trick');

  /*
   * The bandit: one prompt, three answers, three logits. Builds the softmax
   * and the objective J from the numbers, then asks which way to move.
   */
  video.scene('bandit', 'Three answers', (S) => {
    const h = S.add(S.title('The smallest example'));
    const X = [-200, 180, 560]; // the three answer columns
    const LX = -440; // row labels end here
    const Y = { a: -275, r: -205, z: -135, e: -65, p: 5, J: 75 };
    const rowLab = (tex, y) => {
      const m = S.add(S.tex(tex, { size: 44 }));
      return m.at(LX - m.w / 2, y);
    };
    const cell = (str, i, y, color, size = 46) => S.add(S.txt(str, { size, color, font: 'mono' }).at(X[i], y));

    // 1. one prompt, three answers, three rewards
    const q = S.add(S.box('What is 17 × 3?', { w: 440, h: 76, color: C.GREY_B, size: 38 }).at(X[1], -365));
    const toy = S.add(S.toy(760, -365));
    const labA = rowLab('\\text{answer } \\aa', Y.a);
    const ans = BAND.labels.map((l, i) => S.add(S.txt(l, { size: 50 }).at(X[i], Y.a)));
    const labR = rowLab('\\text{reward } \\rr(\\aa)', Y.r);
    const rew = BAND.r.map((r, i) => cell(String(r), i, Y.r, S.color('rr')));
    S.beat('We need an example small enough to work by hand. One prompt: what is seventeen times three? Three answers: fifty-one is right, about fifty is close, forty-one is wrong. A judge gives them rewards of one, zero point three, and zero.',
      A.FadeIn(h), A.FadeIn(q, { dy: -16 }), A.FadeIn(toy), A.FadeIn(labA), lag(0.5, ans.map((m) => A.FadeIn(m, { dy: 12 }))), wait(0.6), A.FadeIn(labR), lag(0.5, rew.map((m) => A.FadeIn(m, { dy: 12 }))),
      { cap: 'We need an example small enough to work by hand. One prompt: what is 17 × 3? Three answers: 51 is right, about 50 is close, 41 is wrong. A judge gives them rewards of 1, 0.3 and 0.' });

    // 2. the model is three logits; in this toy they are all the weights
    const labZ = rowLab('\\text{logit } \\zz_\\aa', Y.z);
    const zc = BAND.z.map((z, i) => cell(num(z, 1), i, Y.z, S.color('zz')));
    const zcard = S.add(S.symcard('zz', { w: 1120, from: 'the network’s raw score for one answer; any number, even negative', why: 'in this toy the three logits are all the weights there are: θ is just the list of logits' }).at(X[1] - 60, 60));
    S.beat('Now the model. In chapter one, a network ended in one raw score per token: a logit. Here a whole answer is one choice, so the model is just three logits. In this toy, they are all the weights there are.',
      A.FadeIn(labZ), lag(0.4, zc.map((m) => A.FadeIn(m, { dy: 12 }))), A.FadeIn(zcard, { dy: 16 }),
      { cap: 'Now the model. In chapter 1, a network ended in one raw score per token: a logit. Here a whole answer is one choice, so the model is just three logits. In this toy, they are all the weights there are.' });

    // 3. exponentiate: always positive, order kept
    const ez = BAND.z.map(Math.exp);
    const tot = RL.sum(ez);
    const labE = rowLab('e^{\\zz_\\aa}', Y.e);
    const ec = ez.map((v, i) => cell(v.toFixed(2), i, Y.e, C.WHITE));
    const r3 = S.add(S.reason('because: e to any power is positive, and a bigger {logit|zz} gives a bigger number'));
    S.beat('A logit can be negative; a probability cannot. So the softmax first raises e to the power of each logit. That is always positive, and a bigger logit still gives a bigger number.',
      A.FadeOut(zcard), A.FadeIn(labE), lag(0.4, ec.map((m) => A.FadeIn(m, { dy: 12 }))), S.writeIn(r3, 1.6),
      { cap: 'A logit can be negative; a probability cannot. So the softmax first raises e to the power of each logit. That is always positive, and a bigger logit still gives a bigger number.' });

    // 4. divide by the total: they add up to one. The formula.
    const totL = S.add(S.txt(`total ${tot.toFixed(2)}`, { size: 34, color: C.GREY_B, italic: true }).at(800, Y.e));
    const labP = rowLab('\\text{probability } \\pt(\\aa)', Y.p);
    const pc = BAND.pi.map((v, i) => cell(v.toFixed(2), i, Y.p, S.color('pt')));
    const sm = S.add(S.tex('\\pt(\\aa) \\;=\\; \\frac{e^{\\zz_\\aa}}{\\sum_{c} e^{\\zz_c}}', { size: 70 }).at(X[1] - 60, 175));
    const r4 = S.add(S.reason(`because: probabilities must add up to one: ${BAND.pi.map((v) => v.toFixed(2)).join(' + ')} = 1`));
    S.beat(`Then it divides each by their total, so the three add up to one. Exponentiate, then divide by the total: that is the softmax. Our model gives fifty-one a probability of ${say2(BAND.pi[0])}.`,
      A.FadeOut(r3), A.FadeIn(totL), A.FadeIn(labP), lag(0.4, pc.map((m) => A.FadeIn(m, { dy: 12 }))), A.Write(sm, 1.6), S.writeIn(r4, 1.4),
      { cap: `Then it divides each by their total, so the three add up to one. Exponentiate, then divide by the total: that is the softmax. Our model gives 51 a probability of ${BAND.pi[0].toFixed(2)}.` });

    // 5. the objective: the average reward, with the numbers
    const labJ = rowLab('\\text{average reward } \\JJ', Y.J);
    const Jc = S.add(S.txt(f2(BAND.J), { size: 46, color: S.color('JJ'), font: 'mono' }).at(X[1], Y.J));
    const terms = BAND.pi.map((p, i) => `\\cPolicy{np}{${p.toFixed(2)}}\\cdot\\cReward{nr}{${BAND.r[i]}}`).join(' + ');
    const Jt = S.add(S.tex(`\\JJ(\\th) \\;=\\; \\sum_{\\aa} \\pt(\\aa)\\, \\rr(\\aa) \\;=\\; ${terms} \\;\\approx\\; \\cReward{nJ}{${f2(BAND.J)}}`, { size: 60 }).at(0, 185));
    const e5 = S.add(S.english('the {average reward|JJ}: each answer’s {reward|rr}, weighted by the {chance the model gives it|pt}, all added up', { size: 38 }).at(0, 300));
    S.beat(`What do we want? A high average reward: each answer’s reward, weighted by the chance the model gives it, all added up. Here, that comes to about ${say2(BAND.J)}.`,
      par(A.FadeOut(r4), A.FadeOut(sm), A.FadeOut(totL), A.FadeOut(labE), par(ec.map((m) => A.FadeOut(m)))),
      A.FadeIn(labJ), A.Write(Jt, 2.2), A.FadeIn(Jc), S.writeIn(e5, 2),
      { cap: `What do we want? A high average reward: each answer’s reward, weighted by the chance the model gives it, all added up. Here, that comes to about ${f2(BAND.J)}.` });

    // 6. what if: raise the logit of 51; then raise "about 50" instead
    const zA = [BAND.z[0] + 1, BAND.z[1], BAND.z[2]];
    const zB = [BAND.z[0], BAND.z[1] + 1, BAND.z[2]];
    const piA = piOf(zA);
    const piB = piOf(zB);
    const fz = (v) => num(v, 1);
    const ff = (v) => v.toFixed(2);
    const toPi = (from, to, dur = 1.4) => par(pc.map((m, i) => A.Count(m, from[i], to[i], ff, dur)));
    const e6 = S.add(S.english(`raise the {logit|zz} of 51 by one: {J|JJ} rises to ${f2(Jof(zA))}`, { size: 38 }).at(0, 190));
    const e7 = S.add(S.english(`raise the {logit|zz} of ‘about 50’ instead: {J|JJ} falls to ${f2(Jof(zB))}, although its {reward|rr} is positive`, { size: 38 }).at(0, 265));
    const say6 = `Now nudge the model. Raise the logit of fifty-one by one, and the average reward rises, to ${say2(Jof(zA))}. Raise about fifty instead, and it falls, to ${say2(Jof(zB))}, although that answer earns a positive reward.`;
    const first = seq(par(A.FadeOut(Jt), A.FadeOut(e5)), par(A.Count(zc[0], BAND.z[0], zA[0], fz, 1.4), toPi(BAND.pi, piA), A.Count(Jc, BAND.J, Jof(zA), ff, 1.4)), A.Indicate(Jc, { color: C.GREEN, scale: 1.25 }), S.writeIn(e6, 1.4));
    S.beat(say6,
      first, wait(Math.max(0, S.atWord(say6, 'Raise about') - MV.durOf(first))),
      par(A.Count(zc[0], zA[0], BAND.z[0], fz, 0.8), A.Count(zc[1], BAND.z[1], zB[1], fz, 1.2), toPi(piA, piB, 1.2), A.Count(Jc, Jof(zA), Jof(zB), ff, 1.2)), A.Indicate(Jc, { color: C.RED, scale: 1.25 }), S.writeIn(e7, 1.6),
      { cap: `Now nudge the model. Raise the logit of 51 by one, and the average reward rises, to ${f2(Jof(zA))}. Raise ‘about 50’ instead, and it falls, to ${f2(Jof(zB))}, although that answer earns a positive reward.` });

    // 8. the question: the gradient
    const dq = S.add(S.tex('\\frac{\\partial \\JJ}{\\partial \\zz_\\aa} \\;=\\; ?', { size: 80 }).at(0, 190));
    const e8 = S.add(S.english('a real model: billions of {weights|th}, and more possible answers than we could ever list', { size: 36, color: C.GREY_B }).at(0, 315));
    S.beat('So, which way should each logit move? With three, we could try every nudge. A real model has billions of weights, and countless possible answers. We need a formula for the uphill direction: the gradient.',
      par(A.FadeOut(e6), A.FadeOut(e7)), par(A.Count(zc[1], zB[1], BAND.z[1], fz, 1), toPi(piB, BAND.pi, 1), A.Count(Jc, Jof(zB), BAND.J, ff, 1)), A.Write(dq, 1.4), S.writeIn(e8, 1.8));
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

  /*
   * Inside the gradient of log pi: for a softmax, derive the score
   * d log pi(a) / d z_j = 1[a = j] - pi(j), then the exact gradient
   * dJ/dz_j = pi(j) (r(j) - J), and check both on the bandit's numbers.
   */
  video.scene('meaning', 'What the gradient says', (S) => {
    const h = S.add(S.title('Inside the gradient of a log-probability'));
    const POL = S.color('pt');
    const GRD = S.color('grad');
    // the formula a picture beat keeps at the top of the screen
    const TOP = (m, b) => par(A.MoveTo(m, 0, -322), A.ScaleTo(m, 0.62), A.MoveTo(b, 0, -322), A.ScaleTo(b, 0.62));

    // 1. why: the one ingredient not yet opened
    const est = S.add(S.tex('\\ghat \\;=\\; \\rr(\\aa)\\; \\grad\\lp(\\aa)', { size: 90 }).at(0, -60));
    const q1 = S.add(S.english('in our toy the {weights|th} are just three {logits|zz}, so {∇ log π(a)|grad} is three slopes: one along each {logit|zz}', { size: 40, width: 1500 }).at(0, 160));
    S.beat('One ingredient is still closed: the gradient of log pi. In our toy, the weights are the three logits, so it is just three slopes, one along each logit. Let us work them out.',
      A.FadeIn(h), A.Write(est, 1.4), A.Spot(est, ['grad', 'lp']), S.writeIn(q1, 2.2),
      { cap: 'One ingredient is still closed: ∇ log π. In our toy, the weights are the three logits, so it is just three slopes, one along each logit. Let us work them out.' });

    // 2. take the log of the softmax
    const L0 = S.add(S.tex('\\pt(\\aa) \\;=\\; \\frac{e^{\\zz_\\aa}}{\\sum_{c} e^{\\zz_c}}', { size: 84 }).at(0, -275).with({ s: 0.72 }));
    const L1 = S.add(S.tex('\\lp(\\aa) \\;=\\; \\log \\frac{e^{\\zz_\\aa}}{\\sum_{c} e^{\\zz_c}} \\;=\\; \\cData{t1}{\\zz_\\aa} \\;-\\; \\cData{t2}{\\log \\sum_{c} e^{\\zz_c}}', { size: 80 }).at(0, -60));
    const r2 = S.add(S.reason('because: the log of a fraction is log(top) − log(bottom), and the log of e to the z is just z'));
    S.beat('Take the log of the softmax. The log of a fraction is log of the top minus log of the bottom, and log of e to the z is z. So log pi of a is z a, minus the log of the sum.',
      par(A.Unspot(est), A.FadeOut(est), A.FadeOut(q1)), seq(A.FadeIn(L0), A.Set(L0, { o: 0.5 }, 0.4)), A.Write(L1, 2), S.writeIn(r2, 1.6),
      { cap: 'Take the log of the softmax. The log of a fraction is the log of the top minus the log of the bottom, and the log of e to the z is z. So log π(a) is z_a minus the log of the sum.' });

    // 3. the first piece: a logit moves with itself only
    const L2 = S.add(S.tex('\\frac{\\partial\\, \\zz_\\aa}{\\partial \\zz_j} \\;=\\; \\mathbf{1}[\\aa = j]', { size: 84 }).at(0, -60));
    const e3 = S.add(S.english('{1[a = j]|op}: one if {logit j|zz} is the logit of answer {a|aa}, zero for any other logit', { size: 40 }).at(0, 140));
    const r3 = S.add(S.reason('because: each logit is its own variable: it moves one-for-one with itself, and not at all with the others'));
    S.beat('Now wiggle one logit, z j. The first piece, z a, moves one for one if j is a, and not at all otherwise. We write that as a bold one with a bracket: one if a equals j, else zero.',
      par(A.FadeOut(r2), A.FadeOut(L0), UP(L1, -275, 0.9)), A.Spot(L1, 't1'), A.Write(L2, 1.6), S.writeIn(e3, 1.8), S.writeIn(r3, 1.6),
      { cap: 'Now wiggle one logit, z_j. The first piece, z_a, moves one-for-one if j is a, and not at all otherwise. We write that 1[a = j]: one if a = j, else zero.' });

    // 4. the second piece: chain rule through the log of the sum
    const L3 = S.add(S.tex('\\frac{\\partial}{\\partial \\zz_j}\\, \\log \\sum_{c} e^{\\zz_c} \\;=\\; \\frac{e^{\\zz_j}}{\\sum_{c} e^{\\zz_c}} \\;=\\; \\pt(j)', { size: 72 }).at(0, 140));
    const r4 = S.add(S.reason('because: the chain rule, (log u)′ = u′ / u; only the term c = j contains z_j, and e to the z is its own derivative'));
    S.beat('Next, a log of a sum. Chain rule: the slope of a log is the slope of the inside, over the inside. Only one term contains z j, and e to the z is its own slope. Result: pi of j.',
      par(A.FadeOut(r3), A.FadeOut(e3)), A.Spot(L1, 't2'), A.Write(L3, 2), S.writeIn(r4, 1.8),
      { cap: 'Next, a log of a sum. Chain rule: the slope of a log is the slope of the inside, over the inside. Only one term contains z_j, and eᶻ is its own slope. Result: π(j).' });

    // 5. the result: the softmax score, read as an instruction
    const L4 = S.add(S.tex('\\frac{\\partial\\, \\lp(\\aa)}{\\partial \\zz_j} \\;=\\; \\mathbf{1}[\\aa = j] \\;-\\; \\pt(j)', { size: 88 }).at(0, -70));
    const box4 = S.add(S.rect(L4.w + 90, L4.h + 50, { stroke: GRD, width: 4, rx: 12 }).at(0, -70));
    const nm4 = S.add(S.txt('the score of answer a', { size: 34, color: GRD, italic: true }).at(0, -70 + (L4.h + 50) / 2 + 34));
    const e5 = S.add(S.english('to make answer {a|aa} more likely: raise {its own logit|zz} by {1 − π(a)|pt}, and lower every other {logit j|zz} by {π(j)|pt}', { size: 40, width: 1500 }).at(0, 200));
    S.beat('Together: one if j is a, minus pi of j. This is the score of a. As an instruction: to make a likelier, raise its own logit by one minus pi of a, and lower each other logit by its probability.',
      par(A.FadeOut(r4), A.Unspot(L1), A.FadeOut(L1), A.FadeOut(L2), A.FadeOut(L3)), A.Write(L4, 1.8), A.Create(box4, 0.8), A.FadeIn(nm4), S.writeIn(e5, 2.4),
      { cap: 'Together: ∂ log π(a) / ∂z_j = 1[a = j] − π(j). This is the score of a. As an instruction: to make a likelier, raise its own logit by 1 − π(a), and lower each other logit by its probability.' });

    // 6. numbers: the score of a sampled 51, drawn on the bars
    const BX = -450;
    const BY = 250;
    const BH = 300;
    const barsAt = () => S.add(S.bars({ labels: BAND.labels, values: BAND.pi, color: POL, h: BH, w: 130, gap: 180, labelFont: 'serif', labelSize: 40 }).at(BX, BY));
    const bars = barsAt();
    // one push per logit: an arrow beside each bar, up or down, with its value
    const pushes = (bs, vec, k) => vec.map((g, i) => {
      const x = BX + bs.xs[i] + 95;
      const y = BY - BH * BAND.pi[i];
      const a = S.add(S.arrow(x, y, x, y - g * k, { color: GRD, width: 6 }));
      const l = S.add(S.txt(sgn(g, 2), { size: 34, color: GRD, font: 'mono', anchor: 'start' }).at(x + 22, y - g * k + (g > 0 ? 18 : -18)));
      return { a, l };
    });
    const sc51 = RL.score(BAND.pi, 0);
    const p6 = pushes(bars, sc51, 420);
    const v6 = S.add(S.tex(`\\aa = 51: \\quad \\big(1 - ${BAND.pi[0].toFixed(2)},\\; -${BAND.pi[1].toFixed(2)},\\; -${BAND.pi[2].toFixed(2)}\\big)`, { size: 54 }).at(470, -90));
    const s6 = S.add(S.tex(`${tsgn(sc51[0])} ${tsgn(sc51[1])} ${tsgn(sc51[2])} \\;=\\; 0`, { size: 54, color: GRD }).at(470, 20));
    const n6 = S.add(side(S, 'the pushes add to zero: raising every {logit|zz} by the same amount changes no {probability|pt}', 470, 140, 740));
    S.beat(`Sample fifty-one, and its logit is pushed up by ${say2(sc51[0])}; the other two down by ${say2(BAND.pi[1])} and ${say2(BAND.pi[2])}, in proportion to their probabilities. The pushes add to zero: shifting all logits together changes nothing.`,
      par(A.FadeOut(e5), A.FadeOut(nm4), TOP(L4, box4)),
      A.FadeIn(bars, { dy: 20 }), A.FadeIn(v6), lag(0.4, p6.map(({ a, l }) => par(A.Arrow(a, 0.6), A.FadeIn(l)))), A.FadeIn(s6), S.writeIn(n6, 1.6),
      { cap: `Sample 51, and its logit is pushed up by ${sc51[0].toFixed(2)}; the other two down by ${BAND.pi[1].toFixed(2)} and ${BAND.pi[2].toFixed(2)}, in proportion to their probabilities. The pushes add to zero: shifting all logits together changes nothing.` });

    // 7. the exact gradient: policy gradient, one logit at a time, score substituted
    const P0 = S.add(S.tex('\\grad\\JJ \\;=\\; \\sum_{\\aa} \\pt(\\aa)\\; \\rr(\\aa)\\; \\grad\\lp(\\aa)', { size: 80 }).at(0, -275).with({ s: 0.72 }));
    const E1 = S.add(S.tex('\\frac{\\partial \\JJ}{\\partial \\zz_j} \\;=\\; \\sum_{\\aa} \\pt(\\aa)\\, \\rr(\\aa)\\, \\Big(\\mathbf{1}[\\aa = j] - \\pt(j)\\Big)', { size: 80 }).at(0, -60));
    const r7 = S.add(S.reason('because: the policy gradient from the last scene, along one {logit|zz} at a time, with the {score|grad} put in'));
    S.beat('Since we can list every answer here, we can also get the exact gradient, and check our work. Take the policy gradient, one logit at a time, and put in the score.',
      par(par(p6.map(({ a, l }) => [A.FadeOut(a), A.FadeOut(l)])), A.FadeOut(bars), A.FadeOut(v6), A.FadeOut(s6), A.FadeOut(n6), A.FadeOut(L4), A.FadeOut(box4)),
      seq(A.FadeIn(P0), A.Set(P0, { o: 0.5 }, 0.4)), A.Write(E1, 2.2), S.writeIn(r7, 1.8));

    // 8. split the bracket
    const E2 = S.add(S.tex('\\;=\\; \\pt(j)\\, \\rr(j) \\;-\\; \\pt(j) \\cData{sJ}{\\sum_{\\aa} \\pt(\\aa)\\, \\rr(\\aa)}', { size: 80 }).at(0, 130));
    const r8 = S.add(S.reason('because: {1[a = j]|op} keeps only the term with a = j; and {π(j)|pt} does not change with a, so it comes out of the sum'));
    S.beat('Split the bracket. The bold one keeps a single term, where a is j: pi of j times r of j. In the other part, pi of j does not depend on a, so it comes out of the sum.',
      A.FadeOut(r7), A.Write(E2, 2), S.writeIn(r8, 1.8),
      { cap: 'Split the bracket. The 1[a = j] keeps a single term, where a is j: π(j) r(j). In the other part, π(j) does not depend on a, so it comes out of the sum.' });

    // 9. the sum that is left is J
    const E3 = S.add(S.tex('\\frac{\\partial \\JJ}{\\partial \\zz_j} \\;=\\; \\pt(j)\\, \\Big(\\rr(j) - \\JJ\\Big)', { size: 92 }).at(0, -40));
    const box9 = S.add(S.rect(E3.w + 90, E3.h + 50, { stroke: GRD, width: 4, rx: 12 }).at(0, -40));
    const r9 = S.add(S.reason('because: Σ π(a) r(a) is the average reward, {J|JJ}'));
    S.beat('What is left in that sum, pi times r over all answers, is J, the average reward. So the slope along logit j is pi of j, times r of j minus J.',
      par(A.FadeOut(r8), A.FadeOut(P0), A.FadeOut(E1)), A.Spot(E2, 'sJ'), wait(1), A.Unspot(E2, 0.4), UP(E2), A.Write(E3, 1.6), A.Create(box9, 0.8), S.writeIn(r9, 1.2),
      { cap: 'What is left in that sum, π times r over all answers, is J, the average reward. So the slope along logit j is π(j) (r(j) − J).' });

    // 10. read it in English
    const e10 = S.add(S.english('the slope along {logit j|zz} = {how often answer j comes up|pt} × {how far its reward is above the average|advantage}', { size: 42, width: 1500 }).at(0, 150));
    const e10b = S.add(S.english('better than average: pushed up. worse than average: pushed down, even if its {reward|rr} is positive', { size: 36, color: C.GREY_B }).at(0, 270));
    S.beat('As a sentence: the slope along a logit is how often its answer comes up, times how far its reward is above average. Better than average: pushed up. Worse than average: pushed down, even if its reward is positive.',
      par(A.FadeOut(r9), A.FadeOut(E2)), S.writeIn(e10, 2.2), S.writeIn(e10b, 2));

    // 11. numbers: the exact gradient, checked by nudging each logit
    const fd = BAND.z.map((_, j) => {
      const eps = 1e-5;
      const up = BAND.z.slice();
      const dn = BAND.z.slice();
      up[j] += eps;
      dn[j] -= eps;
      return (Jof(up) - Jof(dn)) / (2 * eps);
    });
    const bars2 = barsAt();
    const p11 = pushes(bars2, BAND.grad, 900);
    // three decimals in, three out, so the arithmetic on screen checks
    const rows = BAND.pi.map((p, j) => S.add(S.tex(`\\cPolicy{np}{${p.toFixed(3)}} \\times \\big(\\cReward{nr}{${BAND.r[j]}} - \\cReward{nJ}{${f3(BAND.J)}}\\big) \\;\\approx\\; \\cGrad{ng}{${tsgn(BAND.grad[j], 3)}}`, { size: 50 }).at(450, -150 + j * 95)));
    const chk = S.add(side(S, `nudging each logit by a hair and measuring {J|JJ}: ${fd.map((v) => sgn(v, 3)).join(', ')}`, 450, 155, 760));
    S.beat(`On our numbers: plus ${say2(BAND.grad[0])}, ${say2(BAND.grad[1])}, ${say2(BAND.grad[2])}. Nudging each logit by a hair gives the same. Puzzle solved: about fifty earns less than average, so raising it lowers J.`,
      par(A.FadeOut(e10), A.FadeOut(e10b), TOP(E3, box9)),
      A.FadeIn(bars2, { dy: 20 }), lag(0.5, rows.map((r, i) => seq(A.FadeIn(r, { dx: 20, dur: 0.6 }), par(A.Arrow(p11[i].a, 0.6), A.FadeIn(p11[i].l))))), S.writeIn(chk, 1.6), A.Indicate(bars2.labs[1], { color: C.RED, scale: 1.2 }),
      { cap: `On our numbers: ${BAND.grad.map((g) => sgn(g, 2)).join(', ')}. Nudging each logit by a hair gives the same. Puzzle solved: ‘about 50’ earns less than average, so raising it lowers J.` });
  });

  /*
   * Monte Carlo: the single-sample estimate is right on average (unbiased),
   * and the average of N samples closes in like 1/sqrt(N).
   */
  video.scene('mc', 'Does it work?', (S) => {
    const h = S.add(S.title('Averaging samples'));
    const GRD = S.color('grad');
    // the three estimates the sampler can produce
    const G = BAND.labels.map((_, a) => RL.reinforceSample(BAND.z, BAND.r, a));
    // fixed-width entries, so the columns of the three vectors line up
    const ent = (v) => (Math.abs(v) < 5e-3 ? ' 0.00' : sgn(v, 2));
    const vec = (g) => `(${g.map(ent).join(', ')})`;
    const COLS = [-700, -400, -150, 360];
    const HY = -300;
    const heads = [
      S.add(S.txt('sample a', { size: 34, color: C.GREY_B }).at(COLS[0], HY)),
      S.add(S.txt('how often', { size: 34, color: S.color('pt') }).at(COLS[1], HY)),
      S.add(S.txt('reward', { size: 34, color: S.color('rr') }).at(COLS[2], HY)),
      S.add(S.txt('estimate ĝ for the logits of (51, about 50, 41)', { size: 34, color: GRD }).at(COLS[3], HY)),
    ];
    const rule = S.add(S.line(-820, HY + 40, 820, HY + 40, { stroke: C.GREY, width: 3 }));
    const rowY = (a) => -210 + a * 95;
    const rows = BAND.labels.map((l, a) => S.add(S.group(
      new Text(l, { size: 44 }).at(COLS[0], 0),
      new Text(BAND.pi[a].toFixed(2), { size: 44, font: 'mono', color: S.color('pt') }).at(COLS[1], 0),
      new Text(String(BAND.r[a]), { size: 44, font: 'mono', color: S.color('rr') }).at(COLS[2], 0),
      new Text(vec(G[a]), { size: 44, font: 'mono', color: GRD }).at(COLS[3], 0)
    ).at(0, rowY(a))));
    const trueRow = S.add(S.group(
      new Text('true gradient', { size: 40, color: C.GREY_B }).at(COLS[1] - 60, 0),
      new Text(vec(BAND.grad), { size: 44, font: 'mono', color: GRD }).at(COLS[3], 0)
    ).at(0, rowY(3) + 20));
    S.beat('That exact gradient needed J, a sum over every answer, which no language model can compute. The sampled estimate needs one answer and its reward. It can take only these three values, and none is the true gradient.',
      A.FadeIn(h), lag(0.2, heads.map((m) => A.FadeIn(m))), A.Create(rule, 0.6), lag(0.5, rows.map((r) => A.FadeIn(r, { dx: 20 }))), wait(0.4), A.FadeIn(trueRow, { dy: 10 }));

    // the logit of 51: a probability-weighted average of the three values
    const CW = 44 * 0.6; // width of one monospace character
    const col0 = S.add(S.rect(6 * CW, 330, { stroke: GRD, width: 4, rx: 12 }).at(COLS[3] - (21 * CW) / 2 + 3.5 * CW, rowY(1)));
    const avg = S.add(S.tex(`${BAND.pi.map((p, a) => `\\cPolicy{np}{${p.toFixed(2)}} \\times (${Math.abs(G[a][0]) < 5e-3 ? '0' : tsgn(G[a][0], 2)})`).join(' + ')} \\;=\\; \\cGrad{ng}{${tsgn(BAND.grad[0], 2)}}`, { size: 54 }).at(0, 175));
    const r2 = S.add(S.reason('because: on average, over the answers the model samples, the estimate equals the gradient: it is unbiased'));
    S.beat(`Look at the push on fifty-one’s logit. Weight its three possible values by how often each happens, and the average is exactly the true slope, ${say2(BAND.grad[0])}. Statisticians call such an estimate unbiased.`,
      A.Create(col0, 0.8), A.Write(avg, 2.2), S.writeIn(r2, 1.6),
      { cap: `Look at the push on 51’s logit. Weight its three possible values by how often each happens, and the average is exactly the true slope, ${sgn(BAND.grad[0], 3)}. Statisticians call such an estimate unbiased.` });

    // the running average of many samples
    const exact = BAND.grad[0];
    // spread of one estimate of that slope, from the three values and their chances
    const m2 = RL.sum(BAND.pi.map((p, a) => p * G[a][0] ** 2));
    const sd = Math.sqrt(m2 - exact * exact);
    const AX = 110;
    const AY = 50;
    const ax = S.add(S.axes({ x0: 1, x1: 2000, y0: -0.2, y1: 0.6, w: 1120, h: 470, logx: true, xticks: [1, 10, 100, 1000], yticks: [-0.2, 0, 0.2, 0.4, 0.6], yfmt: (v) => v.toFixed(1), xlabel: 'number of samples N', ylabel: 'average estimate, logit of 51' }).at(AX, AY));
    const ex = ax.plot(() => exact, { color: GRD, width: 4, dash: '14 12', from: 1, to: 2000 });
    const exL = S.add(S.txt(`true slope ${sgn(exact, 3)}`, { size: 34, color: GRD }).at(AX + ax.fx(600), AY + ax.fy(exact) + 42));
    const run = ax.polyline(BAND.mc.filter((_, i) => i < 40 || i % 4 === 0), { color: S.color('pt'), width: 5 });
    const mean = S.add(S.tex('\\cGrad{gbar}{\\bar g_N} \\;=\\; \\frac{1}{N} \\sum_{i=1}^{N} \\ghat_i', { size: 60 }).at(-560, -345));
    S.beat('So average many. Sample, compute the estimate, keep a running mean. At first it jumps around; then it settles onto the true slope. That is the law of large numbers: averages of independent samples converge to the expected value.',
      par([...heads, rule, ...rows, trueRow, col0, avg, r2].map((m) => A.FadeOut(m, { dur: 0.6 }))), A.FadeIn(ax), A.Write(mean, 1.2), A.Create(ex, 0.8), A.FadeIn(exL), A.Create(run, 4.5));

    // how fast: the spread shrinks like 1 / sqrt(N)
    const hiC = ax.plot((n) => exact + sd / Math.sqrt(n), { color: C.GREY_B, width: 4, dash: '6 10', from: 1, to: 2000 });
    const loC = ax.plot((n) => exact - sd / Math.sqrt(n), { color: C.GREY_B, width: 4, dash: '6 10', from: 1, to: 2000 });
    const sp = S.add(S.tex('\\text{typical error} \\;\\approx\\; \\frac{\\sigma}{\\sqrt{N}}', { size: 56 }).at(460, -340));
    const sv = S.add(S.txt(`σ = ${sd.toFixed(2)}:   N = 100 → ${(sd / 10).toFixed(3)},   N = 10,000 → ${(sd / 100).toFixed(4)}`, { size: 32, color: C.GREY_B }).at(480, -255));
    S.beat(`How fast? One estimate is typically off by about ${say2(sd)}. Averaging N samples divides the variance by N, so the error shrinks like one over root N. Each extra digit of precision costs a hundred times more samples.`,
      A.Create(hiC, 1.2), A.Create(loC, 1.2), A.Write(sp, 1.2), A.FadeIn(sv),
      { cap: `How fast? One estimate is typically off by about ${sd.toFixed(2)} (its standard deviation σ). Averaging N independent samples divides the variance by N, so the error shrinks like σ/√N. Each extra digit of precision costs a hundred times more samples.` });

    // REINFORCE, and the paper
    const tag = S.add(S.txt(`after 2,000 samples: ${sgn(BAND.mc[1999][1], 3)}`, { size: 36, color: S.color('pt') }).at(AX + 260, AY - 150));
    S.paper('williams1992');
    S.beat('This estimator is called REINFORCE. Ronald Williams described it in nineteen ninety-two. It needs nothing from the judge except a number. The judge can be a person, a program, or a black box.',
      A.FadeOut(sv), A.FadeIn(tag),
      { cap: 'This estimator is called REINFORCE. Ronald Williams described it in 1992. It needs nothing from the judge except a number. The judge can be a person, a program, or a black box.' });
  });

  /*
   * REINFORCE for text: the log-probability of a response is a sum over its
   * tokens (chapter 1), so its gradient is a sum of token gradients.
   */
  video.scene('reinforce', 'REINFORCE for text', (S) => {
    const h = S.add(S.title('REINFORCE for language models'));
    const POL = S.color('pt');
    const GRD = S.color('grad');
    const TY = -268;

    // 1. why: a response is many tokens
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 48, gap: 92 }).at(0, TY));
    const q1 = S.add(S.english('we need {∇ log π(y)|grad} for a whole {response y|yy}, but the model gives its {probabilities|pt} one token at a time', { size: 40, width: 1500 }).at(0, 40));
    S.beat('So far each answer was one choice. A language model writes one token at a time, and gives probabilities one token at a time. For REINFORCE, we need the gradient of the log-probability of a whole response.',
      A.FadeIn(h), A.Show(toks), lag(0.25, toks.items.map((t) => A.FadeIn(t.item, { dy: 16, dur: 0.5 }))), S.writeIn(q1, 2.2));

    // 2. product of token probabilities, and its log: a sum
    const pr = ANSWER.p.map((p, i) => S.add(S.txt(p.toFixed(2), { size: 36, color: POL, font: 'mono' }).at(toks.items[i].x, TY + 80)));
    const lg = ANSWER.logp.map((l, i) => S.add(S.txt(num(l, 2), { size: 36, color: POL, font: 'mono' }).at(toks.items[i].x, TY + 135)));
    const prL = S.add(S.txt('probability', { size: 30, color: C.GREY_B, anchor: 'end' }).at(toks.items[0].x - 80, TY + 80));
    const lgL = S.add(S.txt('log', { size: 30, color: C.GREY_B, anchor: 'end' }).at(toks.items[0].x - 80, TY + 135));
    const P1 = S.add(S.tex('\\pt(\\yy \\mid \\xx) \\;=\\; \\prod_{t} \\pt\\big(\\yy_t \\mid \\xx,\\, \\yy_{<t}\\big)', { size: 68 }).at(0, -5));
    const P2 = S.add(S.tex('\\lp(\\yy \\mid \\xx) \\;=\\; \\sum_{t} \\lp\\big(\\yy_t \\mid \\xx,\\, \\yy_{<t}\\big)', { size: 68 }).at(0, 145));
    const r2 = S.add(S.reason(`because: the log of a product is the sum of the logs (here: ${num(ANSWER.total, 2)})`));
    S.beat('Chapter one showed the way. A response’s probability is a product: each token’s probability, given the prompt and the tokens before it. Take the log, and the product becomes a sum.',
      A.FadeOut(q1), A.FadeIn(prL), lag(0.2, pr.map((m) => A.FadeIn(m, { dur: 0.4 }))), A.Write(P1, 1.6), wait(0.3), A.FadeIn(lgL), lag(0.2, lg.map((m) => A.FadeIn(m, { dur: 0.4 }))), A.Write(P2, 1.6), S.writeIn(r2, 1.4));

    // 3. the gradient of a sum is a sum of gradients
    const P3 = S.add(S.tex('\\grad\\lp(\\yy \\mid \\xx) \\;=\\; \\sum_{t} \\grad\\lp\\big(\\yy_t \\mid \\xx,\\, \\yy_{<t}\\big)', { size: 72 }).at(0, 145));
    const r3 = S.add(S.reason('because: the gradient of a sum is the sum of the gradients'));
    S.beat('The gradient of a sum is the sum of the gradients. So the direction that makes the whole response likelier is the sum of the directions for each of its tokens. Back-propagation computes them all in one pass.',
      par(A.FadeOut(r2), A.FadeOut(P1), UP(P2, -25)), A.Write(P3, 1.8), S.writeIn(r3, 1.2));

    // 4. the estimator, and the reward of the whole response
    const est = S.add(S.tex('\\ghat \\;=\\; \\RR(\\xx, \\yy)\\; \\sum_{t} \\grad\\lp\\big(\\yy_t \\mid \\xx,\\, \\yy_{<t}\\big), \\qquad \\yy \\sim \\pt(\\cdot \\mid \\xx)', { size: 66 }).at(0, -40));
    const fr = S.add(S.rect(est.w + 80, est.h + 60, { stroke: GRD, width: 4, rx: 12 }).at(0, -40));
    const cR = S.add(S.symcard('RR', { w: 1100, from: 'the judge, once, at the end of the response', why: 'one number for the whole response: it multiplies every token’s push alike' }).at(0, 185));
    S.beat('Multiply by the reward, and we have REINFORCE for language models. Sample a response y to prompt x. The judge scores the finished response once: capital R, one number. Multiply it by the sum of token directions.',
      par(A.FadeOut(r3), par(lg.map((m) => A.FadeOut(m)), pr.map((m) => A.FadeOut(m)), A.FadeOut(prL), A.FadeOut(lgL)), A.FadeOut(P2), A.FadeOut(P3)),
      A.Write(est, 2), A.Create(fr, 0.8), A.Spot(est, 'RR'), A.FadeIn(cR, { dy: 16 }));

    // 5. intuition: every token of a rewarded answer gets the same push
    const R1 = S.add(S.txt('R = 1', { size: 44, color: S.color('RR') }).at(toks.items[toks.items.length - 1].x + 160, TY));
    const ups = toks.items.map((t) => S.add(S.arrow(t.x, TY - 46, t.x, TY - 104, { color: GRD, width: 6 })));
    const e5 = S.add(S.english('every {token|yy} of the sampled response gets the same push, × {R|RR}: if {R|RR} is zero, nothing moves', { size: 40, width: 1500 }).at(0, 175));
    S.beat('In English: every token of the sampled response gets the same push, scaled by the whole response’s reward. Even the, answer, and is, which did nothing to get it right. Which tokens earned the reward is the subject of chapter five.',
      par(A.Unspot(est), A.FadeOut(cR)), A.FadeIn(R1), lag(0.15, ups.map((u) => A.Arrow(u, 0.4))), S.writeIn(e5, 2),
      { cap: 'In English: every token of the sampled response gets the same push, scaled by the whole response’s reward. Even “The”, “answer” and “is”, which did nothing to get it right. Which tokens earned the reward is the subject of chapter 5.' });

    // 6. in code: a loss whose gradient is minus the estimate
    const Lx = S.add(S.tex('\\mathcal{L}(\\th) \\;=\\; -\\,\\RR(\\xx, \\yy)\\; \\sum_{t} \\lp\\big(\\yy_t \\mid \\xx,\\, \\yy_{<t}\\big)', { size: 70 }).at(0, 160));
    const r6 = S.add(S.reason('because: its gradient is −ĝ, so a step down this loss is a step up the estimated gradient; R is a plain number'));
    S.beat('In code, we write a loss: minus R, times the sum of the token log-probabilities, and let back-propagation do the rest. It is chapter two’s imitation loss, on the model’s own answer, weighted by its reward.',
      A.FadeOut(e5), A.Write(Lx, 2), S.writeIn(r6, 1.6));

    // 7. summary, and what is still missing
    const box = S.add(S.box('sample a response  →  score it once  →  push up every token, × score', { w: 1500, h: 110, color: GRD, size: 42 }).at(0, 160));
    const miss = S.add(S.english('right on average, but each estimate can be far off: chapter 4 tames the noise', { size: 38, color: C.GREY_B }).at(0, 290));
    S.beat('That is REINFORCE: sample, score once, and push up every token in proportion to the score. It is right on average. But one estimate can be far off, and taming that noise is the next chapter.',
      par(A.FadeOut(r6), A.FadeOut(Lx)), A.FadeIn(box, { from: 0.9 }), S.writeIn(miss, 1.8));
  });
});
