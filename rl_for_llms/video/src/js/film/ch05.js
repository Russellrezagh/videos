// Chapter 5 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch05(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // signed numbers with a real minus sign, for on-screen values
  const sgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '+') + Math.abs(x).toFixed(d);
  // words a narrator says for a two-decimal number
  const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const say2 = (x) => {
    const s = Math.abs(x).toFixed(2);
    const [a, b] = s.split('.');
    const tail = b.replace(/0+$/, '');
    return `${x < 0 ? 'minus ' : ''}${DIG[+a]}${tail ? ` point ${tail.split('').map((d) => DIG[+d]).join(' ')}` : ''}`;
  };
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  const fade = (...ms) => par(ms.flat().filter(Boolean).map((m) => A.FadeOut(m, { dur: 0.6 })));
  const must = (ok, what) => {
    if (!ok) throw new Error(`ch05: ${what}`);
  };

  /* ---------------------------------------------------------- the worked example */
  // CREDIT (setup.js): one solved problem, token by token, with a toy critic.
  // Labels: x is written ×, and the second line of working is written out.
  const TOK = CREDIT.tokens.map((t, i) => (i === 2 ? '(10+7)x3' : t).replace(/x/g, '×'));
  const T = TOK.length;
  const RW = CREDIT.rewards; // one reward per token: 0, ..., 0, then the judge's 1
  // CREDIT.V[i] is the critic's value once token i is written. GAE needs
  // V(s_t), the value of the state in which token t is chosen, and V = 0
  // after the last token (nothing is left to earn). So shift by one; the
  // prompt alone is valued like its restatement, the first token.
  const VS = [CREDIT.V[0]].concat(CREDIT.V.slice(0, T - 1));
  const GAE = (lambda) => RL.gae(RW, VS.concat([0]), 1, lambda);
  const G1 = RL.rewardToGo(RW, 1);
  const G9 = RL.rewardToGo(RW, 0.9);
  const DEL = GAE(0).deltas;
  const ADV1 = GAE(1).adv;
  const LAMS = [0, 0.5, 0.95, 1];
  const ADVS = LAMS.map((l) => GAE(l).adv);
  must(ADV1.every((a, t) => Math.abs(a - (G1[t] - VS[t])) < 1e-12), 'GAE(1) is the return minus the value');
  must(GAE(0).adv.every((a, t) => Math.abs(a - DEL[t]) < 1e-12), 'GAE(0) is the TD error');
  must(Math.abs(RL.sum(DEL) - (G1[0] - VS[0])) < 1e-12, 'the surprises add up to the return minus the value');
  const I10 = TOK.indexOf('10×3'); // the step that earns the most credit

  // the table: one column per token, numbers under each
  const TX = 170; // the table's centre
  const LX = -530; // row labels end here
  const COLW = TOK.map((t) => Math.max(92, [...t].length * 18 + 22));
  const ROWW = RL.sum(COLW) + 6 * (T - 1);
  const XS = [];
  COLW.reduce((x, w) => {
    XS.push(x + w / 2);
    return x + w + 6;
  }, TX - ROWW / 2);
  const RY = { tok: -330, r: -258, G: -186, V: -114, A: -42 };
  const tokenRow = (S, y, dx = 0) => {
    const items = TOK.map((t, i) => {
      const tx = new Text(t, { size: 30, font: 'mono' });
      const it = new Group(rect(COLW[i], 54, { stroke: C.GREY, width: 3, fill: C.GREY_E, rx: 8 }), tx).at(XS[i] + dx, 0).hidden();
      it.text = tx;
      return it;
    });
    const g = S.add(new Group(...items).at(0, y));
    g.items = items;
    return g;
  };
  const numRow = (S, vals, y, color, fmt = (v) => v.toFixed(2), dx = 0) => vals.map((v, i) => S.add(S.txt(fmt(v), { size: 32, color, font: 'mono' }).at(XS[i] + dx, y)));
  const showAll = (ms, r = 0.05) => lag(r, ms.map((m) => A.FadeIn(m, { dur: 0.4 })));
  const rowLab = (S, tex, y) => {
    const m = S.add(S.tex(tex, { size: 38 }));
    return m.at(LX - m.w / 2, y);
  };
  const countRow = (ms, from, to, dur = 1.4) => par(ms.map((m, i) => A.Count(m, from[i], to[i], (v) => v.toFixed(2), dur)));

  /* =========================================================== CHAPTER 5 */
  video.chapter('ch5', 'Credit assignment');
  card(5, 'Which token deserves the credit?');

  /*
   * From one reward per response to one reward per token, causality, the
   * return G_t, the value V(s_t) and the advantage A_t = G_t - V(s_t).
   */
  video.scene('credit', 'Credit over tokens', (S) => {
    const h = S.add(S.title('One reward, many tokens'));
    const GRD = S.color('grad');
    const DX = -170; // the row sits in the middle while there is no table
    const px = S.add(S.txt('prompt: What is 17 × 3?', { size: 36, color: C.GREY_B, italic: true }).at(0, -345));
    const row = tokenRow(S, -250, DX);
    const ups = XS.map((x) => S.add(S.arrow(x + DX, -140, x + DX, -200, { color: GRD, width: 6 })));
    const R1 = S.add(S.tex('\\RR = 1', { size: 54 }).at(XS[T - 1] + DX + 135, -250));
    const e1 = S.add(S.english('REINFORCE: every {token|yy} gets the same push, × the {reward of the whole response|RR}', { size: 40, width: 1500 }).at(0, -10));
    const e1b = S.add(S.english('which {tokens|yy} earned it?', { size: 44 }).at(0, 90));
    S.beat('Chapter three left a problem. REINFORCE pushes every token of a response by the same amount: the whole response’s reward. Here the model solved seventeen times three, step by step. Which tokens earned it?',
      A.FadeIn(h), par(A.FadeIn(px), showAll(row.items), A.FadeIn(R1)), lag(0.05, ups.map((u) => A.Arrow(u, 0.4))), S.writeIn(e1, 2), S.writeIn(e1b, 1.2),
      { cap: 'Chapter 3 left a problem. REINFORCE pushes every token of a response by the same amount: the whole response’s reward. Here the model solved 17 × 3, step by step. Which tokens earned it?' });

    // 2. a solution that goes wrong in one line: every token blamed alike
    const i21 = TOK.indexOf('21');
    const e2 = S.add(S.english('one wrong line, and (with a {baseline|bb}) every {token|yy} is pushed down: the correct steps too', { size: 40, width: 1500 }).at(0, 60));
    const e3 = S.add(S.english('we want each {token|yy} judged by what it caused', { size: 44 }).at(0, 160));
    S.beat('Suppose it slips once, writing twenty-four for twenty-one. Now the answer is wrong; with a baseline, every token is pushed down, correct steps included. We want each token judged by what it caused.',
      par(A.FadeOut(e1), A.FadeOut(e1b)), par(A.Set(row.items[i21].text, { str: '24', color: C.RED }, 0.5), A.Set(row.items[T - 1].text, { str: '54', color: C.RED }, 0.5), A.Set(R1, { o: 0.4 }, 0.4)),
      par(ups.map((u) => A.Set(u, { y1: -200, y2: -140 }, 1))), S.writeIn(e2, 1.8), S.writeIn(e3, 1.4),
      { cap: 'Suppose it slips once, writing 24 for 21. Now the answer is wrong; with a baseline, every token is pushed down, correct steps included. We want each token judged by what it caused.' });

    // 3. one reward per token
    const rrow = numRow(S, RW, -170, S.color('rr'), (v) => String(v), DX);
    const rl = S.add(S.tex('\\rr_t', { size: 46 }).at(XS[0] + DX - 110, -170));
    const F0 = S.add(S.tex('\\RR \\;=\\; \\sum_{t} \\rr_t \\;=\\; 0 + 0 + \\cdots + 0 + 1', { size: 72 }).at(0, -45));
    const c3 = S.add(S.symcard('rr', { name: 'the reward at step t', from: 'the judge’s score on the last token; zero elsewhere, for now', why: 'later every token pays a small price too, so we keep one per token', w: 1300 }).at(0, 175));
    S.beat('First, bookkeeping: give each token its own reward, r t. The judge scores only the finished response, so the last token gets the score, and the rest get zero, for now. Capital R is their sum.',
      par(A.FadeOut(e2), A.FadeOut(e3), A.Set(row.items[i21].text, { str: '21', color: C.WHITE }, 0.5), A.Set(row.items[T - 1].text, { str: '51', color: C.WHITE }, 0.5), A.Set(R1, { o: 1 }, 0.4), par(ups.map((u) => A.FadeOut(u)))),
      A.FadeIn(rl), showAll(rrow), A.Write(F0, 1.8), A.Spot(F0, 'rr'), A.FadeIn(c3, { dy: 16 }),
      { cap: 'First, bookkeeping: give each token its own reward, r_t. The judge scores only the finished response, so the last token gets the score, and the rest get 0, for now. R is their sum.' });

    // 4. the estimate, token by token, and the state
    const F1 = S.add(S.tex('\\ghat \\;=\\; \\sum_{t}\\, \\RR\\; \\grad \\lp(\\yy_t \\mid \\ss_t)', { size: 84 }).at(0, -60));
    const r4 = S.add(S.reason('because: a response’s {log-probability|lp} is the sum of its tokens’ (chapter 1)', { y: -200 }));
    const c4 = S.add(S.symcard('ss', { w: 1300, name: 'the state', from: 'the prompt x plus the tokens y<t written so far', why: 'it is everything the model sees when it chooses token t' }).at(0, 170));
    S.beat('Write chapter three’s estimate token by token: for each token, R times the direction that makes that token more likely in its state, s t: the prompt plus the tokens before it.',
      par(fade(c3, rl, rrow, row.items, R1, px), A.Unspot(F0), A.FadeOut(F0)), A.Write(F1, 1.8), S.writeIn(r4, 1.4), A.Spot(F1, ['ss', 'yy']), A.FadeIn(c4, { dy: 16 }),
      { cap: 'Write chapter 3’s estimate token by token: for each token, R times the direction that makes that token more likely in its state s_t: the prompt plus the tokens before it.' });

    // 5. R is a sum: split it at token t
    const F2 = S.add(S.tex("\\ghat \\;=\\; \\sum_{t}\\, \\Big(\\cReward{c5past}{\\textstyle\\sum_{t'<t} \\rr_{t'}} \\;+\\; \\cReward{c5fut}{\\textstyle\\sum_{t'\\ge t} \\rr_{t'}}\\Big)\\, \\grad \\lp(\\yy_t \\mid \\ss_t)", { size: 78 }).at(0, -60));
    const r5 = S.add(S.reason('because: {R|RR} is the sum of all the {token rewards|rr}: split it into those before token t, and those from t on'));
    S.beat('Now split R, the sum of all the token rewards, into two parts: the rewards before token t, and the rewards from t on. Nothing has changed; we have only regrouped.',
      par(A.Unspot(F1), A.FadeOut(c4), A.FadeOut(r4), UP(F1)), A.Write(F2, 2), S.writeIn(r5, 1.6));

    // 6. the past is a baseline: it averages to zero against the score
    const F3 = S.add(S.tex("\\EE\\Big[\\cReward{c5past}{\\textstyle\\sum_{t'<t} \\rr_{t'}}\\;\\, \\grad \\lp(\\yy_t \\mid \\ss_t)\\Big] \\;=\\; 0", { size: 72 }).at(0, 130));
    const r6 = S.add(S.reason('because: once the {state|ss} is known, those rewards are a fixed number, like a {baseline|bb} in chapter 4; and the {score|grad} averages to zero'));
    S.beat('The first part was paid before token t was chosen. Given the state, it is a fixed number: a baseline, as in chapter four. And a baseline times the score averages to zero.',
      A.FadeOut(r5), A.Spot(F2, 'c5past'), A.Write(F3, 2), S.writeIn(r6, 1.8));

    // 7. so drop it: each token answers for what came after it
    const F4 = S.add(S.tex("\\ghat \\;=\\; \\sum_{t}\\, \\Big(\\cReward{c5fut}{\\textstyle\\sum_{t'\\ge t} \\rr_{t'}}\\Big)\\, \\grad \\lp(\\yy_t \\mid \\ss_t)", { size: 80 }).at(0, -60));
    const r7 = S.add(S.reason('because: removing a term whose average is zero leaves the average unchanged: still unbiased'));
    S.beat('So drop it. The estimate stays right on average, and usually less noisy: each token now answers only for the rewards after it. A token cannot change the past.',
      par(fade(r6, F3, F1), A.Unspot(F2), UP(F2)), A.Write(F4, 1.8), A.Spot(F4, 'c5fut'), S.writeIn(r7, 1.6));

    // 8. the return
    const F5 = S.add(S.tex("\\GG_t \\;=\\; \\sum_{t'\\ge t} \\rr_{t'}", { size: 96 }).at(0, -60));
    const c8 = S.add(S.symcard('GG', { w: 1300, name: 'the return (the reward to go)', from: 'the rewards from token t to the end of the response', why: 'a token can only affect what comes after it' }).at(0, 170));
    S.beat('The rewards from token t on are called the return, G t, or the reward to go. The estimate becomes: each token’s return, times the direction that makes it more likely.',
      par(fade(r7, F2), A.Unspot(F4), UP(F4)), A.Write(F5, 1.4), A.Spot(F5, 'GG'), A.FadeIn(c8, { dy: 16 }),
      { cap: 'The rewards from token t on are called the return, G_t, or the reward to go. The estimate becomes: each token’s return, times the direction that makes it more likely.' });

    // 9. the discount, and the return in words
    const F6 = S.add(S.tex("\\GG_t \\;=\\; \\sum_{t'\\ge t} \\gam^{\\,t'-t}\\; \\rr_{t'}", { size: 96 }).at(0, -60));
    const c9 = S.add(S.symcard('gam', { name: 'the discount', from: 'a number we choose, between 0 and 1', why: 'a reward k tokens later counts γᵏ: far-off rewards are less tied to this token, and noisier', w: 1300 }).at(0, 170));
    const e9 = S.add(S.english('the {return|GG}: all the {reward|rr} still to come, from token t to the end; a reward k tokens later counts {γᵏ|gam}', { size: 40, width: 1500 }).at(0, 160));
    const say9 = 'Often the return is discounted by gamma, between zero and one: a reward k tokens later counts gamma to the k. That trades a little bias for less noise. For language models, gamma is usually one.';
    const in9 = par(A.Unspot(F5), A.FadeOut(c8), A.FadeOut(F5), A.Write(F6, 1.6), A.Spot(F6, 'gam'), A.FadeIn(c9, { dy: 16 }));
    S.beat(say9,
      in9, wait(Math.max(0.5, S.atWord(say9, 'That trades') - MV.durOf(in9))), par(A.Unspot(F6), A.FadeOut(c9)), S.writeIn(e9, 1.8),
      { cap: 'Often the return is discounted by γ, between 0 and 1: a reward k tokens later counts γᵏ. That trades a little bias for less noise. For language models, γ is usually 1.' });

    // 10. numbers: with one reward at the end, every return is the same
    const row2 = tokenRow(S, RY.tok);
    const lT = rowLab(S, '\\text{token } \\yy_t', RY.tok);
    const lR = rowLab(S, '\\text{reward } \\rr_t', RY.r);
    const lG = rowLab(S, '\\text{return } \\GG_t', RY.G);
    const rr2 = numRow(S, RW, RY.r, S.color('rr'), (v) => String(v));
    const gg = numRow(S, G1, RY.G, S.color('GG'));
    const gl = S.add(S.txt('γ = 1', { size: 46, color: S.color('gam') }).at(-700, 60));
    const toy = S.add(S.toy(760, -400));
    const e10 = S.add(S.english('less for early {tokens|yy}, but only because they are early', { size: 38, color: C.GREY_B }).at(0, 190));
    const say10 = 'On our solution, with gamma one, every return is one: the only reward comes at the end. With gamma zero point nine, early tokens get less, just for being early. Neither finds the step that mattered.';
    const in10 = seq(par(fade(e9, F4), A.MoveTo(F6, 0, 60), A.ScaleTo(F6, 0.7)), par(A.FadeIn(lT), showAll(row2.items), A.FadeIn(lR), showAll(rr2)), par(A.FadeIn(lG), showAll(gg), A.FadeIn(gl), A.FadeIn(toy)));
    S.beat(say10,
      in10, wait(Math.max(0.5, S.atWord(say10, 'With gamma zero') - MV.durOf(in10))), A.Set(gl, { str: 'γ = 0.9' }, 0.01), countRow(gg, G1, G9, 1.6), S.writeIn(e10, 1.6),
      { cap: 'On our solution, with γ = 1, every return is 1: the only reward comes at the end. With γ = 0.9, early tokens get less, just for being early. Neither finds the step that mattered.' });

    // 11. the value: what we expected from here
    const F7 = S.add(S.tex('\\VV(\\ss_t) \\;=\\; \\EE\\big[\\, \\GG_t \\mid \\ss_t \\,\\big]', { size: 76 }).at(0, 10));
    const c11 = S.add(S.symcard('VV', { name: 'the value of a state', from: 'a critic network that predicts the return from the text so far', why: 'it depends only on the state, so it is a baseline: no bias', w: 1300 }).at(0, 200));
    const lV = rowLab(S, '\\text{value } \\VV(\\ss_t)', RY.V);
    const vv = numRow(S, VS, RY.V, S.color('VV'));
    const say11 = `We need a reference point. The value, V of s t, is the return we expect from this state on; chapter four’s critic learns it. Our toy critic starts at ${say2(VS[0])} and grows more confident.`;
    const in11 = seq(par(fade(e10, F6, gl), countRow(gg, G9, G1, 1)), A.Write(F7, 1.6), A.Spot(F7, 'VV'), A.FadeIn(c11, { dy: 16 }));
    S.beat(say11,
      in11, wait(Math.max(0.3, S.atWord(say11, 'Our toy') - MV.durOf(in11))), A.FadeIn(lV), showAll(vv, 0.12),
      { cap: `We need a reference point. The value, V(s_t), is the return we expect from this state on; chapter 4’s critic learns it. Our toy critic starts at ${VS[0].toFixed(2)} and grows more confident.` });

    // 12. the advantage: return minus value
    const F8 = S.add(S.tex('\\AA_t \\;=\\; \\GG_t \\;-\\; \\VV(\\ss_t), \\qquad \\ghat \\;=\\; \\sum_{t}\\, \\AA_t\\; \\grad \\lp(\\yy_t \\mid \\ss_t)', { size: 64 }).at(0, 95));
    const lA = rowLab(S, '\\text{advantage } \\AA_t', RY.A);
    const aa = numRow(S, ADV1, RY.A, S.color('AA'));
    const e12 = S.add(S.english('the {advantage|AA}: how much better things went from here than the {critic expected|VV}', { size: 40, width: 1500 }).at(0, 220));
    S.beat(`Subtract, and each token gets an advantage: return minus value, how much better things went than expected. It takes the return’s place in the estimate. The first token gets ${say2(ADV1[0])}, the last only ${say2(ADV1[T - 1])}.`,
      par(A.Unspot(F7), A.FadeOut(c11), A.FadeOut(F7)), A.Write(F8, 1.4), A.FadeIn(lA), showAll(aa, 0.1), S.writeIn(e12, 2),
      { cap: `Subtract, and each token gets an advantage: return minus value, how much better things went than expected. It takes the return’s place in the estimate. The first token gets ${ADV1[0].toFixed(2)}, the last only ${ADV1[T - 1].toFixed(2)}.` });

    // 13. what is still missing
    const hl = S.add(S.rect(COLW[0] + 20, 360, { stroke: C.YELLOW, width: 4, rx: 12 }).at(XS[0], (RY.tok + RY.A) / 2));
    const e13 = S.add(S.english(`but the first {token|yy} only restated the question: its ${ADV1[0].toFixed(2)} is the work of later tokens`, { size: 40, width: 1500 }).at(0, 230));
    S.beat(`But the first token only restated the question. Its ${say2(ADV1[0])} is the work of later tokens. Can we credit each token for the change it made itself?`,
      A.FadeOut(e12), A.Create(hl, 0.8), S.writeIn(e13, 2),
      { cap: `But the first token only restated the question. Its ${ADV1[0].toFixed(2)} is the work of later tokens. Can we credit each token for the change it made itself?` });
  });

  /*
   * The TD error as a one-step surprise; the telescoping sum that links it to
   * G_t - V(s_t); GAE as the dial between them; process supervision.
   */
  video.scene('gae', 'Generalized advantage estimation', (S) => {
    const h = S.add(S.title('One surprise at a time'));
    const GRN = S.color('dd');
    const VC = S.color('VV');

    // 1. why: the critic's jumps measure what a token did
    const row = tokenRow(S, RY.tok);
    const lT = rowLab(S, '\\text{token } \\yy_t', RY.tok);
    const lV = rowLab(S, '\\text{value } \\VV(\\ss_t)', RY.r);
    const vv = numRow(S, VS, RY.r, VC);
    const toy = S.add(S.toy(760, -400));
    const ring = (i, y) => S.add(S.rect(COLW[i] + 6, 50, { stroke: C.YELLOW, width: 4, rx: 10 }).at(XS[i], y));
    const h1 = [ring(I10, RY.r), ring(I10 + 1, RY.r)];
    const e1 = S.add(S.english(`before {10×3|yy}: {${VS[I10].toFixed(2)}|VV}  →  once it is written: {${VS[I10 + 1].toFixed(2)}|VV}`, { size: 40 }).at(0, -120));
    const e1b = S.add(S.english('a {token|yy} helped if the {value|VV} went up when it was written', { size: 40 }).at(0, -30));
    S.beat(`Watch the critic along the solution. It mostly sits still, and jumps at a few tokens. Before ten times three, it says ${say2(VS[I10])}; once that is written, ${say2(VS[I10 + 1])}. The jump measures what the token did.`,
      A.FadeIn(h), par(A.FadeIn(lT), showAll(row.items), A.FadeIn(toy)), A.FadeIn(lV), showAll(vv, 0.08), par(h1.map((m) => A.Create(m, 0.6))), S.writeIn(e1, 1.6), S.writeIn(e1b, 1.6),
      { cap: `Watch the critic along the solution. It mostly sits still, and jumps at a few tokens. Before 10×3, it says ${VS[I10].toFixed(2)}; once that is written, ${VS[I10 + 1].toFixed(2)}. The jump measures what the token did.` });

    // 2. before and after one token
    const B1 = S.add(S.tex('\\text{expected before token } t\\text{:} \\qquad \\VV(\\ss_t)', { size: 54 }).at(0, -170));
    const B2 = S.add(S.tex('\\text{expected once it is written:} \\qquad \\rr_t \\;+\\; \\gam\\, \\VV(\\ss_{t+1})', { size: 54 }).at(0, -95));
    const r2 = S.add(S.reason('because: once token t is written we hold its {reward|rr} for sure, and expect the {value of the next state|VV}, one step later, so discounted once by {γ|gam}'));
    S.beat('Make that precise. Before token t, we expect V of s t. Once it is written, we hold its reward, r t, and expect V of the next state, discounted once by gamma.',
      fade(e1, e1b, h1), A.Write(B1, 1.4), A.Write(B2, 1.8), S.writeIn(r2, 1.8),
      { cap: 'Make that precise. Before token t, we expect V(s_t). Once it is written, we hold its reward r_t, and expect V(s_{t+1}), discounted once by γ.' });

    // 3. the difference is the TD error
    const F1 = S.add(S.tex('\\dd_t \\;=\\; \\rr_t \\;+\\; \\gam\\, \\VV(\\ss_{t+1}) \\;-\\; \\VV(\\ss_t)', { size: 76 }).at(0, 10));
    const c3 = S.add(S.symcard('dd', { name: 'the TD error (temporal difference)', from: 'two predictions of the critic, one token apart', why: 'a one-step surprise: did this token make things look better or worse?', w: 1300 }).at(0, 190));
    S.beat('After minus before is the surprise: delta t, the temporal difference error. Positive: the token made things look better than expected. Negative: worse.',
      A.FadeOut(r2), A.Write(F1, 1.8), A.Spot(F1, 'dd'), A.FadeIn(c3, { dy: 16 }),
      { cap: 'After minus before is the surprise: δ_t, the temporal-difference (TD) error. Positive: the token made things look better than expected. Negative: worse.' });

    // 4. why a surprise: a perfect critic makes it zero on average
    const F2 = S.add(S.tex('\\GG_t = \\rr_t + \\gam\\, \\GG_{t+1} \\quad\\Longrightarrow\\quad \\VV(\\ss_t) = \\EE\\big[\\, \\rr_t + \\gam\\, \\VV(\\ss_{t+1}) \\mid \\ss_t \\big]', { size: 56 }).at(0, 140));
    const r4 = S.add(S.reason('because: the return is this reward plus the discounted return after it; average both sides, given the {state|ss}'));
    S.beat('Why a surprise? The return is this reward plus gamma times the next return. Averaging both sides, a perfect critic satisfies: value now equals reward plus gamma times value next. So delta averages to zero.',
      par(A.Unspot(F1), A.FadeOut(c3)), A.Write(F2, 2.2), S.writeIn(r4, 1.6),
      { cap: 'Why a surprise? The return is this reward plus γ times the next return. Averaging both sides, a perfect critic satisfies: value now = reward + γ × value next. So δ averages to zero.' });

    // 5. numbers: credit lands on the steps that did the work
    const lD = rowLab(S, '\\text{surprise } \\dd_t', RY.G);
    const dd = numRow(S, DEL, RY.G, GRN, (v) => (Math.abs(v) < 5e-3 ? '0' : v.toFixed(2)));
    const BASE = 60;
    const K = 650;
    const bars = DEL.map((d, i) => S.add(S.bar(XS[i], BASE, d * K, GRN, 44)));
    const axis = S.add(S.line(XS[0] - 60, BASE, XS[T - 1] + 60, BASE, { stroke: C.GREY_B, width: 3 }));
    const e5 = S.add(S.english('credit lands where the work was done', { size: 40 }).at(0, 170));
    const order = DEL.map((d, i) => [d, i]).sort((a, b) => b[0] - a[0]);
    must(order[0][1] === I10, 'the largest surprise is at 10×3');
    S.beat(`On our solution, restating the question earns nothing. Ten times three earns ${say2(DEL[I10])}, seven times three ${say2(DEL[TOK.indexOf('7×3')])}, the final answer ${say2(DEL[T - 1])}. Credit lands where the work was done.`,
      par(fade(B1, B2, F2, r4), A.MoveTo(F1, 0, 280), A.ScaleTo(F1, 0.75)), A.FadeIn(lD), showAll(dd, 0.08), A.FadeIn(axis), lag(0.08, bars.map((b) => A.Create(b, 0.4))), S.writeIn(e5, 1.4),
      { cap: `On our solution, restating the question earns nothing. 10×3 earns ${DEL[I10].toFixed(2)}, 7×3 ${DEL[TOK.indexOf('7×3')].toFixed(2)}, the final answer ${DEL[T - 1].toFixed(2)}. Credit lands where the work was done.` });

    // 6. the catch: delta trusts the critic
    const pane = (x, title, good, bad, color) => S.add(S.group(
      rect(820, 230, { stroke: color, width: 3, fill: mix(C.BG, color, 0.1), rx: 14 }),
      new Tex(title, { size: 50 }).at(0, -62),
      new Text(good, { size: 34, color: C.GREY_B }).at(0, 10),
      new Text(bad, { size: 34, color: C.GREY_B }).at(0, 62)
    ).at(x, 150));
    const pL = pane(-430, '\\dd_t', 'one real step, then trust the critic', 'steady, but biased if the critic is wrong', GRN);
    const pR = pane(430, '\\GG_t - \\VV(\\ss_t)', 'only real rewards: unbiased for any critic', 'but it carries all the later luck', S.color('GG'));
    S.beat('But delta trusts the critic: if the critic is wrong, so is delta, and averaging cannot fix it. Return minus value uses real rewards: unbiased for any critic, but it carries all the later luck.',
      fade(e5, bars, axis, F1), A.FadeIn(pL, { dy: 20 }), wait(1.5), A.FadeIn(pR, { dy: 20 }),
      { cap: 'But δ trusts the critic: if the critic is wrong, so is δ, and averaging cannot fix it. Return minus value uses real rewards: unbiased for any critic, but it carries all the later luck.' });

    // 7. telescoping: two deltas
    const F3 = S.add(S.tex('\\dd_t + \\gam\\, \\dd_{t+1} \\;=\\; \\rr_t + \\class{s-c5c}{\\gam\\, \\VV(\\ss_{t+1})} - \\VV(\\ss_t) \\;+\\; \\gam\\, \\rr_{t+1} + \\gam^2\\, \\VV(\\ss_{t+2}) \\class{s-c5c}{\\,- \\gam\\, \\VV(\\ss_{t+1})}', { size: 50 }).at(0, -60));
    const r7 = S.add(S.reason('because: write out both surprises, and multiply the second one through by {γ|gam}'));
    S.beat('Are the two so different? Add two surprises: delta t, plus gamma times the next one. Write both out, and look at V of s t plus one.',
      fade(pL, pR, row.items, vv, dd, lT, lV, lD, toy), A.Write(F3, 2.6), S.writeIn(r7, 1.4),
      { cap: 'Are the two so different? Add two surprises: δ_t + γ δ_{t+1}. Write both out, and look at V(s_{t+1}).' });
    const F4 = S.add(S.tex('\\dd_t + \\gam\\, \\dd_{t+1} \\;=\\; \\rr_t + \\gam\\, \\rr_{t+1} \\;+\\; \\gam^2\\, \\VV(\\ss_{t+2}) \\;-\\; \\VV(\\ss_t)', { size: 66 }).at(0, 130));
    const r7b = S.add(S.reason('because: the critic’s guess for the {state in between|ss} is added once and taken away once'));
    S.beat('It is added once and taken away once, so it cancels. Left: two real rewards, then the critic’s guess two steps on, minus the guess we started from.',
      A.FadeOut(r7), A.Spot(F3, 'c5c'), wait(1.2), A.Write(F4, 2), S.writeIn(r7b, 1.4));

    // 8. all the way to the end: the return minus the value
    const F5 = S.add(S.tex('\\sum_{l \\ge 0} \\gam^{\\,l}\\, \\dd_{t+l} \\;=\\; \\sum_{l \\ge 0} \\gam^{\\,l}\\, \\rr_{t+l} \\;-\\; \\VV(\\ss_t) \\;=\\; \\GG_t - \\VV(\\ss_t)', { size: 68 }).at(0, 80));
    const r8 = S.add(S.reason('because: every middle value cancels the same way, and after the last token V = 0: nothing is left to earn'));
    const chk = S.add(S.english(`first token: ${DEL.map((d) => (Math.abs(d) < 5e-3 ? '0' : d.toFixed(2))).join(' + ')} = ${RL.sum(DEL).toFixed(2)} = 1 − ${VS[0].toFixed(2)}`, { size: 32, color: C.GREY_B }).at(0, 195));
    S.beat(`Go on to the end. Every middle value cancels, and after the last token the value is zero. So the discounted surprises add up to return minus value. Here: ${say2(RL.sum(DEL))}, both ways.`,
      par(fade(r7b, F3), A.Unspot(F3), UP(F4)), A.Write(F5, 2.2), S.writeIn(r8, 1.6), A.FadeIn(chk),
      { cap: `Go on to the end. Every middle value cancels, and after the last token the value is zero. So the discounted surprises add up to return minus value. Here: ${RL.sum(DEL).toFixed(2)}, both ways.` });

    // 9. GAE: a dial between the two ends
    const F6 = S.add(S.tex('\\Ahat_t \\;=\\; \\sum_{l \\ge 0} \\big(\\gam\\, \\lam\\big)^{l}\\, \\dd_{t+l}', { size: 96 }).at(0, -60));
    const c9a = S.add(S.symcard('Ahat', { name: 'the estimated advantage', from: 'the critic’s surprises from token t on, added up', why: 'the true advantage is unknown: the hat marks an estimate', w: 1300 }).at(0, 175));
    const c9 = S.add(S.symcard('lam', { name: 'the GAE mix', from: 'a number we choose, between 0 and 1', why: 'each step further away multiplies a surprise by λ once more: it slides between the one-step surprise and return minus value', w: 1300 }).at(0, 175));
    S.paper('schulman2016gae');
    S.beat('So one surprise and all the surprises are two ends of one sum. Generalized advantage estimation, G A E, builds its estimate in between. The hat on A says: estimated from the critic’s surprises, not known exactly.',
      fade(F4, F5, r8, chk), A.Write(F6, 1.8), A.Spot(F6, 'Ahat'), A.FadeIn(c9a, { dy: 16 }),
      { cap: 'So one surprise and all the surprises are two ends of one sum. Generalized advantage estimation (GAE) builds its estimate in between. The hat on Â says: estimated from the critic’s surprises, not known exactly.' });
    S.beat('The dial is lambda, a number we choose between zero and one. Each step further from token t shrinks a surprise by one more factor of gamma times lambda.',
      A.Spot(F6, 'lam'), A.FadeOut(c9a, { dur: 0.4 }), A.FadeIn(c9, { dy: 16 }),
      { cap: 'The dial is λ, a number we choose between 0 and 1. Each step further from token t shrinks a surprise by one more factor of γλ.' });

    // 10. the two ends, and the sum in words
    const E0 = S.add(S.tex('\\lam = 0: \\qquad \\Ahat_t = \\dd_t', { size: 60 }).at(-430, 110));
    const E1 = S.add(S.tex('\\lam = 1: \\qquad \\Ahat_t = \\GG_t - \\VV(\\ss_t)', { size: 60 }).at(430, 110));
    const e10 = S.add(S.english('{GAE|Ahat}: add up the {surprises|dd} from token t on, shrinking each one by {γλ|lam} per step', { size: 38, width: 1500 }).at(0, 215));
    const r10 = S.add(S.reason('because: 0 to the power 0 is 1, and every later power of 0 is 0; at λ = 1 it is the telescoping sum'));
    S.beat('Check the ends. Lambda zero keeps only the first term, the one-step surprise. Lambda one gives return minus value. In words: add up the surprises from here on, each shrunk by gamma lambda per step.',
      par(A.Unspot(F6), A.FadeOut(c9)), A.Write(E0, 1.4), A.Write(E1, 1.6), S.writeIn(r10, 1.4), S.writeIn(e10, 2),
      { cap: 'Check the ends. λ = 0 keeps only the first term (0⁰ = 1), the one-step surprise. λ = 1 gives return minus value. In words: add up the surprises from here on, each shrunk by γλ per step.' });

    // 11. numbers: credit spreads back as lambda grows
    const BY = 150;
    const KB = 480;
    const row2 = tokenRow(S, 210);
    const ax2 = S.add(S.line(XS[0] - 60, BY, XS[T - 1] + 60, BY, { stroke: C.GREY_B, width: 3 }));
    const gb = ADVS[0].map((a, i) => S.add(S.bar(XS[i], BY, a * KB, S.color('Ahat'), 44)));
    const lamT = S.add(S.txt('λ = 0', { size: 46, color: S.color('lam') }).at(-720, 20));
    const v0 = S.add(S.txt(ADVS[0][0].toFixed(2), { size: 34, color: S.color('Ahat'), font: 'mono' }).at(XS[0], BY - 40));
    const top0 = (l) => BY - ADVS[l][0] * KB - 30;
    const stepTo = (l, dur = 1.4) => par(
      gb.map((b, i) => A.Set(b, { y2: BY - ADVS[l][i] * KB }, dur)),
      A.Count(v0, ADVS[l - 1][0], ADVS[l][0], (v) => v.toFixed(2), dur), A.MoveTo(v0, XS[0], top0(l), dur),
      A.Set(lamT, { str: `λ = ${LAMS[l]}` }, 0.01)
    );
    const say11 = `Watch the advantages as lambda grows. At zero, each token gets its own surprise. At zero point five, credit spreads back. At zero point nine five, the first token already gets ${say2(ADVS[2][0])}; at one, ${say2(ADVS[3][0])}.`;
    const set11 = par(fade(E0, E1, e10, r10), A.MoveTo(F6, 0, -300), A.ScaleTo(F6, 0.72), showAll(row2.items), A.FadeIn(ax2), lag(0.05, gb.map((b) => A.Create(b, 0.4))), A.FadeIn(lamT), A.FadeIn(v0));
    const at5 = S.atWord(say11, 'At zero point five');
    const at9 = S.atWord(say11, 'At zero point nine');
    const at1 = S.atWord(say11, 'at one');
    S.beat(say11,
      set11, wait(Math.max(0, at5 - MV.durOf(set11))), stepTo(1), wait(Math.max(0.6, at9 - at5 - 1.4)), stepTo(2), wait(Math.max(0.6, at1 - at9 - 1.4)), stepTo(3),
      { cap: `Watch the advantages as λ grows. At 0, each token gets its own surprise. At 0.5, credit spreads back. At 0.95, the first token already gets ${ADVS[2][0].toFixed(2)}; at 1, ${ADVS[3][0].toFixed(2)}.` });

    // 12. the trade-off
    const tl = S.add(S.line(-600, -130, 600, -130, { stroke: C.GREY_B, width: 4 }));
    const tk = [-600, 600].map((x) => S.add(S.line(x, -145, x, -115, { stroke: C.GREY_B, width: 4 })));
    const tL = [S.add(S.tex('\\lam = 0', { size: 46 }).at(-600, -185)), S.add(S.tex('\\lam = 1', { size: 46 }).at(600, -185))];
    const sL = S.add(S.english('trust the {critic|VV}: steady, but only as right as the critic', { size: 34, width: 700 }).at(-470, -40));
    const sR = S.add(S.english('trust the {rewards|rr}: unbiased, but noisy', { size: 34, width: 700 }).at(470, -40));
    const e12 = S.add(S.english('if restating the question changed nothing, its credit averages to zero over many samples: here it is luck', { size: 36, color: C.GREY_B, width: 1500 }).at(0, 80));
    S.beat('Is that fair? If restating the question changed nothing, that credit would average out over many samples. Large lambda: unbiased, but noisy. Small lambda: steady, but only as right as the critic. Values just below one are common.',
      fade(gb, ax2, row2.items, v0, lamT, F6), S.writeIn(e12, 1.8), A.Create(tl, 0.8), par(tk.map((m) => A.FadeIn(m)), tL.map((m) => A.FadeIn(m))), S.writeIn(sL, 1.4), S.writeIn(sR, 1.4),
      { cap: 'Is that fair? If restating the question changed nothing, that credit would average out over many samples. Large λ: unbiased, but noisy. Small λ: steady, but only as right as the critic. Values just below 1 are common.' });

    // 13. another route: grade every step
    const prm = S.add(S.box('process supervision: a judge that grades every step', { w: 1200, h: 110, color: S.color('rr'), size: 40 }).at(0, -120));
    const prmN = S.add(S.english('800K step-level labels; best of 1,860 samples on a MATH subset: {78.2%|rr} with a process reward model, {72.4%|rr} with an outcome model', { size: 36, color: C.GREY_B, width: 1400 }).at(0, 60));
    S.paper('lightman2023');
    S.beat('Another route to finer credit: a judge that grades every step. In Let’s Verify Step by Step, Open A I collected eight hundred thousand step labels, and a process reward model picked correct solutions more often than an outcome model.',
      fade(tl, tk, tL, sL, sR, e12), A.FadeIn(prm, { dy: -20 }), S.writeIn(prmN, 2),
      { cap: 'Another route to finer credit: a judge that grades every step. In Let’s Verify Step by Step, OpenAI collected 800K step labels, and a process reward model picked correct solutions more often than an outcome model (78.2% vs 72.4%, best-of-1860, on a MATH subset).' });
  });
});
