// Chapter 1 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch01(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* =========================================================== CHAPTER 1 */
  video.chapter('ch1', 'A language model is a policy');
  card(1, 'A language model is a policy');

  video.scene('tokens', 'Tokens, logits, softmax', (S) => {
    const h = S.add(S.head('What does a language model compute?'));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 56 }).at(0, 30));
    S.beat('First, what does a language model actually compute? It reads text as tokens: words, pieces of words, numbers, punctuation.',
      A.Write(h, 1.4), S.toTitle(h), A.Show(toks), lag(0.2, toks.items.map((t) => A.FadeIn(t.item, { dy: 20, dur: 0.5 }))));
    const ctx = S.add(S.tokens(['The', 'answer', 'is'], { size: 44 }).at(-560, -60));
    const net = S.add(S.box('network', { w: 300, h: 160, color: C.TEAL, size: 46, sub: 'weights θ' }).at(-560, 170));
    const a0 = S.add(S.arrow(-560, -10, -560, 80, { color: C.GREY_B, width: 4 }));
    const logitRows = NEXT.labels.map((lab, i) => S.add(S.group(new Text(lab, { size: 40, font: 'mono' }).at(-120, 0), new Text(NEXT.z[i].toFixed(2), { size: 40, font: 'mono', color: C.YELLOW, anchor: 'end' }).at(120, 0)).at(120, -200 + i * 80)));
    const lhead = S.add(S.txt('logits', { size: 40, color: C.YELLOW }).at(120, -290));
    const a1 = S.add(S.arrow(-400, 170, -60, 0, { color: C.GREY_B, width: 4 }));
    const vocab = S.add(S.txt('one per token in the vocabulary: often more than 100,000', { size: 34, color: C.GREY_B }).at(120, 230));
    S.beat('Given the tokens so far, it outputs one number for every token in its vocabulary, often more than a hundred thousand of them. These numbers are called logits.',
      A.FadeOut(toks), A.FadeIn(ctx, { dy: -20 }), A.Arrow(a0, 0.4), A.FadeIn(net), A.Arrow(a1, 0.5), A.FadeIn(lhead), lag(0.15, logitRows.map((r) => A.FadeIn(r, { dx: -20, dur: 0.4 }))), A.FadeIn(vocab));
    const sm = S.add(S.tex('\\pi_\\theta(a \\mid \\text{context}) \\;=\\; \\frac{\\class{f-num}{e^{z_a}}}{\\class{f-den}{\\sum_{b} e^{z_b}}}', { size: 80 }).at(0, -250));
    const bars = S.add(S.bars({ labels: NEXT.labels, values: NEXT.p, h: 400, w: 120, gap: 80, colors: [C.GREEN, C.RED, C.RED, C.YELLOW, C.GREY] }).at(0, 300));
    S.beat('The softmax turns logits into probabilities: exponentiate each one, then divide by the total. Big logits get most of the mass, and everything adds up to one.',
      par([ctx, net, a0, a1, ...logitRows, lhead, vocab].map((m) => A.FadeOut(m))), A.Write(sm, 1.6), A.Focus(sm, 'num', { color: C.YELLOW }), wait(0.6), A.Focus(sm, 'den', { color: C.TEAL }), A.Unfocus(sm), A.FadeIn(bars, { dy: 30 }));
    const ctx2 = S.add(S.txt('after “The answer is”', { size: 38, color: C.GREY_B, italic: true }).at(-560, -120));
    const toyL = S.add(S.toy(640, -120));
    S.beat('Here is the distribution for the next token after the words, the answer is. Fifty-one gets about half the mass. Forty-one, fifty-four, and the rest share the remainder.',
      A.FadeIn(ctx2), A.FadeIn(toyL), A.Indicate(bars.bars[0], { color: C.GREEN, scale: 1.04 }), A.Indicate(bars.vals[0], { color: C.GREEN, scale: 1.3 }),
      { cap: `Here is the distribution for the next token after the words “The answer is”. 51 gets about half the mass (${f2(NEXT.p[0])}). 41, 54 and the rest share the remainder.` });
  });

  video.scene('sequence', 'A sentence is a product', (S) => {
    const h = S.add(S.title('From tokens to answers'));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 52, gap: 56 }).at(0, -170));
    const probs = ANSWER.p.map((p, i) => S.add(S.txt(p.toFixed(2), { size: 40, color: C.YELLOW, font: 'mono' }).at(toks.items[i].x, -70)));
    const eq = S.add(S.tex('\\pi_\\theta(y \\mid x) \\;=\\; \\prod_{t} \\pi_\\theta\\big(y_t \\mid x,\\, y_{<t}\\big)', { size: 76 }).at(0, 100));
    const prod = S.add(S.txt(`${ANSWER.p.map((p) => p.toFixed(2)).join(' × ')} = ${ANSWER.p.reduce((a, b) => a * b, 1).toFixed(3)}`, { size: 40, font: 'mono', color: C.YELLOW }).at(0, 260));
    S.beat('To write a whole answer, the model samples one token, appends it, and repeats. So the probability of a complete answer is a product: the probability of each token, given everything before it.',
      A.FadeIn(h), A.Show(toks), lag(0.35, toks.items.map((t, i) => par(A.FadeIn(t.item, { dur: 0.4, dx: -20 }), A.FadeIn(probs[i], { dur: 0.4 })))), A.Write(eq, 1.6), A.FadeIn(prod));
    const leq = S.add(S.tex('\\log \\pi_\\theta(y \\mid x) \\;=\\; \\sum_{t} \\log \\pi_\\theta\\big(y_t \\mid x,\\, y_{<t}\\big)', { size: 76, color: C.WHITE }).at(0, 100));
    const logs = ANSWER.logp.map((l, i) => S.add(S.txt(l.toFixed(2), { size: 40, color: C.TEAL, font: 'mono' }).at(toks.items[i].x, -70)));
    const lsum = S.add(S.txt(`sum = ${ANSWER.total.toFixed(2)}`, { size: 44, font: 'mono', color: C.TEAL }).at(0, 260));
    const flow = S.add(S.txt('every gradient in this film flows through this sum', { size: 36, color: C.GREY_B, italic: true }).at(0, 340));
    S.beat('Products of many small numbers are awkward, so we take logarithms. The log-probability of an answer is the sum of the log-probabilities of its tokens. Remember this sum. It is where every gradient in this film will flow.',
      par(A.FadeOut(eq), A.FadeOut(prod)), A.Write(leq, 1.6), par(probs.map((p) => A.FadeOut(p, { dur: 0.4 }))), lag(0.15, logs.map((l) => A.FadeIn(l, { dur: 0.4 }))), A.FadeIn(lsum), A.FadeIn(flow, { dy: 10 }));
  });

  video.scene('mdp', 'States, actions, rewards', (S) => {
    const h = S.add(S.title('The language of reinforcement learning'));
    const agent = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.9 }).at(-560, 60));
    const world = S.add(S.box('world', { w: 300, h: 140, color: C.GREY_B, size: 46 }).at(500, 60));
    const act = S.add(S.arrow(-440, 0, 330, 0, { color: C.YELLOW, width: 5 }));
    const obs = S.add(S.arrow(330, 120, -440, 120, { color: C.BLUE, width: 5 }));
    const actL = S.add(S.txt('action', { size: 40, color: C.YELLOW }).at(-60, -40));
    const obsL = S.add(S.txt('new state, reward', { size: 40, color: C.BLUE }).at(-60, 165));
    S.beat('Now some vocabulary from reinforcement learning. An agent observes a state, chooses an action, and the world responds with a new state.',
      A.FadeIn(h), A.FadeIn(agent, { dx: -30 }), A.FadeIn(world, { dx: 30 }), A.Arrow(act, 0.8), A.FadeIn(actL), A.Arrow(obs, 0.8), A.FadeIn(obsL));
    const rows = [
      ['state', 'the prompt plus the text so far'],
      ['action', 'the next token'],
      ['transition', 'append the token (no randomness)'],
      ['policy πθ', 'the model’s next-token probabilities'],
      ['episode', 'one complete answer'],
      ['reward', 'a score for the finished answer'],
    ].map(([a, b], i) => S.add(S.group(new Text(a, { size: 42, color: [C.BLUE, C.YELLOW, C.GREY_B, C.TEAL, C.GREEN, C.GOLD][i], anchor: 'end' }).at(-120, 0), new Text(b, { size: 40, anchor: 'start' }).at(-80, 0)).at(0, -280 + i * 92)));
    S.beat('For a language model, the state is the prompt plus the text written so far. The action is the next token. And the world is very simple: it just appends that token.',
      par([agent, world, act, obs, actL, obsL].map((m) => A.FadeOut(m))), lag(0.9, rows.slice(0, 3).map((r) => A.FadeIn(r, { dx: -30 }))));
    S.beat('The model’s probabilities, as a rule for picking actions, are called a policy, written pi theta, where theta stands for all the weights. One finished answer is an episode.',
      lag(0.9, rows.slice(3, 5).map((r) => A.FadeIn(r, { dx: -30 }))), { cap: 'The model’s probabilities, as a rule for picking actions, are called a policy, written πθ, where θ stands for all the weights. One finished answer is an episode.' });
    const judges = [['a person', C.GOLD], ['a reward model', C.ORANGE], ['a program that checks', C.GREEN]].map(([t, col], i) => S.add(S.box(t, { w: 420, h: 90, color: col, size: 36 }).at(-470 + i * 470, 330)));
    S.beat('At the end of the episode, a judge hands out a reward: one number saying how good the answer was. It might come from a person, from a learned reward model, or from a program that checks the answer.',
      A.FadeIn(rows[5], { dx: -30 }), lag(0.4, judges.map((j) => A.FadeIn(j, { dy: 20 }))));
  });

  video.scene('objective', 'The objective', (S) => {
    const h = S.add(S.title('What we want'));
    const J = S.add(S.tex('J(\\theta) \\;=\\; \\class{f-x}{\\mathbb{E}_{x \\sim \\mathcal{D}}}\\; \\class{f-y}{\\mathbb{E}_{y \\sim \\pi_\\theta(\\cdot \\mid x)}}\\, \\big[\\, \\class{f-r}{R(x, y)} \\,\\big]', { size: 92 }).at(0, -60));
    S.beat('Our goal is to choose the weights that make the expected reward as large as possible: the average reward over prompts, and over answers sampled from the model.',
      A.FadeIn(h), A.Write(J, 2));
    const nR = S.add(S.note('the judge’s score', { color: C.GOLD }).at(470, 120));
    const nY = S.add(S.note('answers sampled from the model itself', { color: C.TEAL }).at(60, 200));
    const nX = S.add(S.note('prompts from a dataset', { color: C.BLUE }).at(-420, 120));
    const say = 'Read it from the inside out. R of x and y is the judge’s score. The answer y is drawn from the model itself, so changing theta changes which answers we see. And the prompt x is drawn from a set of prompts.';
    S.beat(say,
      seq(A.Focus(J, 'r', { color: C.GOLD }), A.FadeIn(nR)),
      seq(wait(Math.max(0, S.atWord(say, 'drawn') - 1.6)), A.Focus(J, 'y', { color: C.TEAL }), A.FadeIn(nY)),
      seq(wait(Math.max(0, S.atWord(say, 'prompt') - S.atWord(say, 'drawn') - 1.0)), A.Focus(J, 'x', { color: C.BLUE }), A.FadeIn(nX)),
      A.Unfocus(J), { cap: 'Read it from the inside out. R(x, y) is the judge’s score. The answer y is drawn from the model itself, so changing θ changes which answers we see. And the prompt x is drawn from a set of prompts.' });
  });
});
