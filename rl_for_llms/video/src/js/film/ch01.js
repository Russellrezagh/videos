// Chapter 1 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch01(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // numbers with a real minus sign, for on-screen values
  const num = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '') + Math.abs(x).toFixed(d);
  // words a narrator says for a two-decimal number
  const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const say2 = (x) => {
    const [a, b] = Math.abs(x).toFixed(2).split('.');
    return `${x < 0 ? 'minus ' : ''}${DIG[+a]} point ${b.split('').map((d) => DIG[+d]).join(' ')}`;
  };
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  const fade = (...ms) => par(ms.flat().filter(Boolean).map((m) => A.FadeOut(m, { dur: 0.5 })));

  // symbols this chapter introduces that are not in the glossary
  FILM.addSymbol('c1ylt', 'data', 'y_{<t}', 'the tokens so far', 'every token of the answer before position t', 'the model writes left to right: it picks token t after seeing exactly these');
  FILM.addSymbol('c1prod', 'data', '\\prod', 'multiply', 'a capital pi: the product over every position t', 'each token must be picked, so the chances multiply');
  FILM.addSymbol('c1D', 'data', '\\mathcal{D}', 'the prompt dataset', 'the questions we train on, collected in advance', 'it says which prompts we average over; training does not change it');

  // the running numbers (kernel: src/js/rl.js)
  const EZ = NEXT.z.map(Math.exp);
  const ETOT = RL.sum(EZ);
  const SHIFT = 2;
  const EZ2 = NEXT.z.map((z) => Math.exp(z + SHIFT));
  const ETOT2 = RL.sum(EZ2);
  const ZSUM = RL.sum(NEXT.z);
  const PH = RL.softmax(NEXT.z, 0.5);
  const P2 = RL.softmax(NEXT.z, 2);
  if (Math.max(...RL.softmax(NEXT.z.map((z) => z + SHIFT)).map((p, i) => Math.abs(p - NEXT.p[i]))) > 1e-12) throw new Error('ch01: softmax should ignore a shift');

  /* =========================================================== CHAPTER 1 */
  video.chapter('ch1', 'A language model is a policy');
  card(1, 'A language model is a policy');

  /*
   * From logits to probabilities: why exponentiate (positive, order kept),
   * why divide (they must add up to one), the softmax as a formula, what a
   * common shift does (nothing: only differences matter) and temperature.
   * Numbers: NEXT, the next token after "The answer is" (toy logits).
   */
  video.scene('tokens', 'Tokens, logits, softmax', (S) => {
    const POL = S.color('pt');
    const PAR = S.color('zz');
    // the table the derivation fills in: one row per token, one column per step
    const X = { tok: -720, z: -520, e: -320, p: -120 };
    const HY = -300;
    const RY = [-230, -165, -100, -35, 30];
    const TY = 112;

    // 1. text is tokens
    const h = S.add(S.head('What does a language model compute?'));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 56 }).at(0, -60));
    const e1 = S.add(S.english('text is read and written in small pieces called {tokens|data}: words, pieces of words, digits, punctuation', { size: 40, width: 1400 }).at(0, 130));
    S.beat('What does a language model actually compute? It reads and writes text in small pieces called tokens: words, pieces of words, digits, punctuation.',
      A.Write(h, 1.4), S.toTitle(h), A.Show(toks), lag(0.2, toks.items.map((t) => A.FadeIn(t.item, { dy: 20, dur: 0.5 }))), S.writeIn(e1, 2));

    // 2. one score per token: the logits
    const ctxT = S.add(S.tokens(['The', 'answer', 'is'], { size: 44 }).at(-560, -290));
    const a0 = S.add(S.arrow(-560, -240, -560, -172, { color: C.GREY_B, width: 4 }));
    const net = S.add(S.box('network', { w: 320, h: 150, color: PAR, size: 46, sub: 'weights θ' }).at(-560, -90));
    const a1 = S.add(S.arrow(-390, -90, 90, -100, { color: C.GREY_B, width: 4 }));
    const zVals = NEXT.z.map((z) => new Text(num(z), { size: 40, font: 'mono', color: PAR }).at(100, 0));
    const rows = NEXT.labels.map((lab, i) => S.add(S.group(new Text(lab, { size: 40, font: 'mono' }).at(-100, 0), zVals[i]).at(230, RY[i])));
    const hdrZ = S.add(S.tex('\\zz', { size: 60 }).at(330, HY));
    const hdrW = S.add(S.txt('logits', { size: 40, color: PAR }).at(190, HY));
    const note = S.add(S.txt('a real vocabulary: often 100,000 tokens or more', { size: 34, color: C.GREY_B, italic: true }).at(230, 92));
    const toy = S.add(S.toy(760, -390));
    S.beat('Given the text so far, a network computes one score for every token in its vocabulary, often a hundred thousand of them or more. Here are five, with everything else lumped together.',
      fade(toks, e1), A.FadeIn(ctxT, { dy: -20 }), A.Arrow(a0, 0.4), A.FadeIn(net), A.Arrow(a1, 0.6), A.FadeIn(hdrW), A.FadeIn(hdrZ), lag(0.25, rows.map((r) => A.FadeIn(r, { dx: -20, dur: 0.45 }))), A.FadeIn(note), A.FadeIn(toy));

    // 3. symbol cards: z and theta
    const cz = S.add(S.symcard('zz', { w: 860, from: 'the raw score for one token', why: 'any number; bigger = more favoured' }).at(-460, 250));
    const ct = S.add(S.symcard('th', { w: 860, from: 'all the network’s adjustable numbers', why: 'training changes θ, and so the logits' }).at(460, 250));
    const say3 = 'These scores are called logits, written z: the network’s raw opinion of each token, any number, positive or negative. The weights that produce them are called theta. Training changes theta, and through it, the logits.';
    S.beat(say3,
      A.Indicate(hdrZ, { color: PAR, scale: 1.3 }), A.FadeIn(cz, { dy: 16 }), wait(Math.max(0, S.atWord(say3, 'The weights') - 2)), A.Indicate(net, { color: PAR, scale: 1.06 }), A.FadeIn(ct, { dy: 16 }),
      { cap: 'These scores are called logits, written z: the network’s raw opinion of each token, any number, positive or negative. The weights that produce them are called θ. Training changes θ, and through it, the logits.' });

    // 4. why we need probabilities
    const hdrT = S.add(S.txt('token', { size: 36, color: C.GREY_B }).at(X.tok, HY));
    const rule = S.add(S.line(X.tok - 90, 72, X.p + 80, 72, { stroke: C.GREY, width: 4 }).with({ draw: 0 }));
    const totL = S.add(S.txt('total', { size: 34, color: C.GREY_B, italic: true }).at(X.tok, TY));
    const zSum = S.add(S.txt(num(ZSUM), { size: 40, font: 'mono', color: C.GREY_B }).at(X.z, TY));
    const need = S.add(S.english('a {probability|pt} can never be negative, and all of them must add up to exactly 1', { size: 40, width: 760 }).at(470, -170));
    const fail = S.add(S.english('the {logits|zz} fail both tests', { size: 40, width: 760 }).at(470, -40));
    S.beat(`To pick a token at random, we need probabilities: never negative, and adding up to exactly one. The logits fail both tests. Three are negative, and together they add up to ${say2(ZSUM)}.`,
      fade(ctxT, a0, net, a1, note, cz, ct, hdrW), par(rows.map((r, i) => A.MoveTo(r, X.tok + 100, RY[i]))), A.MoveTo(hdrZ, X.z, HY), A.FadeIn(hdrT),
      S.writeIn(need, 1.8), A.Create(rule, 0.6), A.FadeIn(totL), A.FadeIn(zSum), S.writeIn(fail, 1),
      lag(0.3, [2, 3, 4].map((i) => A.Indicate(zVals[i], { color: C.RED, scale: 1.3 }))), A.Indicate(zSum, { color: C.RED, scale: 1.3 }),
      { cap: `To pick a token at random, we need probabilities: never negative, and adding up to exactly one. The logits fail both tests. Three are negative, and together they add up to ${num(ZSUM)}.` });

    // 5. step one: exponentiate
    const hdrE = S.add(S.tex('e^{\\zz}', { size: 60 }).at(X.e, HY - 6));
    const eVals = EZ.map((v, i) => S.add(S.txt(v.toFixed(2), { size: 40, font: 'mono' }).at(X.e, RY[i])));
    const AXX = 480;
    const AXY = -110;
    const ax = S.add(S.axes({ x0: -2, x1: 2, y0: 0, y1: 4, w: 560, h: 380, xticks: [-2, -1, 0, 1, 2], yticks: [0, 1, 2, 3, 4], xlabel: '', xfmt: (v) => num(v, 0) }).at(AXX, AXY));
    const curve = ax.plot(Math.exp, { color: C.WHITE, width: 5, from: -2, to: Math.log(4) });
    const sq = ax.plot((v) => v * v, { color: C.GREY, width: 4, from: -2, to: 2, dash: '10 10' });
    const curL = S.add(S.tex('e^{\\zz}', { size: 50 }).at(AXX + ax.fx(1.05) - 60, AXY + ax.fy(3.4)));
    const sqL = S.add(S.txt('squaring', { size: 32, color: C.GREY_B, italic: true }).at(AXX + ax.fx(1.6) + 70, AXY + ax.fy(2.1)));
    const zL = S.add(S.tex('\\zz', { size: 44 }).at(AXX + 300, AXY + 190));
    const dots = NEXT.z.map((z) => S.add(S.dot(11, PAR).at(AXX + ax.fx(z), AXY + ax.fy(Math.exp(z)))));
    const r5 = S.add(S.reason('because: {e to any power|zz} is above zero, and the curve always rises, so a bigger logit still gives a bigger number'));
    S.beat('Step one: make every score positive, and keep their order. Raise e to the power of each logit. That is always above zero, and it always rises. Squaring would also remove the minus signs, but it would rank minus two above one.',
      fade(need, fail), A.FadeIn(ax), A.Create(curve, 1.2), A.FadeIn(curL), A.FadeIn(zL), lag(0.2, dots.map((d) => A.FadeIn(d, { from: 2, dur: 0.4 }))),
      A.FadeIn(hdrE), lag(0.3, eVals.map((m) => A.FadeIn(m, { dx: -16, dur: 0.4 }))), S.writeIn(r5, 1.6), wait(0.6), A.Create(sq, 1.2), A.FadeIn(sqL));

    // 6. step two: divide by the total
    const hdrP = S.add(S.tex('\\pt', { size: 60 }).at(X.p, HY));
    const pVals = NEXT.p.map((v, i) => S.add(S.txt(v.toFixed(2), { size: 40, font: 'mono', color: POL }).at(X.p, RY[i])));
    const eSum = S.add(S.txt(ETOT.toFixed(2), { size: 40, font: 'mono', color: C.GREY_B }).at(X.e, TY));
    const pSum = S.add(S.txt('1.00', { size: 40, font: 'mono', color: POL }).at(X.p, TY));
    const r6 = S.add(S.reason('because: dividing every number by the same total keeps their proportions, and makes them add up to 1'));
    S.beat(`Step two: make them add up to one. Divide each by their total, ${say2(ETOT)}. Dividing everything by the same number keeps the proportions, and now they add up to exactly one.`,
      fade(ax, curL, sqL, zL, dots, r5), A.FadeIn(eSum), A.Indicate(eSum, { color: C.YELLOW, scale: 1.3 }), A.FadeIn(hdrP), lag(0.3, pVals.map((m) => A.FadeIn(m, { dx: -16, dur: 0.4 }))), A.FadeIn(pSum), S.writeIn(r6, 1.6),
      { cap: `Step two: make them add up to one. Divide each by their total, ${ETOT.toFixed(2)}. Dividing everything by the same number keeps the proportions, and now they add up to exactly one.` });

    // 7. the two steps as one formula: the softmax
    const FX = 480;
    const FY = -130;
    const SM = S.add(S.tex('\\pt(\\aa \\mid \\text{context}) \\;=\\; \\frac{\\cData{c1num}{e^{\\zz_\\aa}}}{\\cData{c1den}{\\sum_{\\aa\'} e^{\\zz_{\\aa\'}}}}', { size: 72 }).at(FX, FY));
    const say7 = 'Written once, for any token a, these two steps are the softmax. On top: e to the logit of a. Underneath: the same, summed over every token. That is the total.';
    const w7 = par(A.FadeOut(r6), A.Write(SM, 2));
    const s7 = seq(A.Spot(SM, 'c1num'), lag(0.12, eVals.map((m) => A.Indicate(m, { color: PAR, scale: 1.2 }))));
    const t7a = Math.max(MV.durOf(w7), S.atWord(say7, 'On top'));
    S.beat(say7,
      w7, wait(t7a - MV.durOf(w7)), s7,
      wait(Math.max(0, S.atWord(say7, 'Underneath') - t7a - MV.durOf(s7))), A.Spot(SM, 'c1den'), A.Indicate(eSum, { color: PAR, scale: 1.3 }),
      { cap: 'Written once, for any token a, these two steps are the softmax. On top: e to the logit of a. Underneath: the same, summed over every token. That is the total.' });

    // 8. the policy, named; then read in English
    S.tour(SM, [
      { sym: 'pt', at: [FX, 150], text: { from: 'the softmax of the logits', why: 'it is the model’s chance for each next token; θ marks that it depends on the weights' },
        say: 'The result is pi theta of a, given the context: the chance the model gives token a as its next token. Reinforcement learning calls it the policy. The theta marks that it depends on the weights.',
        cap: 'The result is π_θ(a | context): the chance the model gives token a as its next token. Reinforcement learning calls it the policy. The θ marks that it depends on the weights.' },
    ]);
    const e8 = S.add(S.english('the {chance of token a|pt}, given the text so far = {e to its logit|zz}, as a share of {that total over every token|zz}', { size: 40, width: 1600 }).at(0, 265));
    S.beat('As a sentence: the chance of token a, given the text so far, is e to its logit, as a share of the total over every token.',
      S.endTour(SM), S.writeIn(e8, 2.4));

    // 9. what if every logit rises by the same amount?
    const SH = S.add(S.tex('\\frac{e^{\\zz_\\aa + c}}{\\sum_{\\aa\'} e^{\\zz_{\\aa\'} + c}} \\;=\\; \\frac{e^{c}\\; e^{\\zz_\\aa}}{e^{c} \\sum_{\\aa\'} e^{\\zz_{\\aa\'}}} \\;=\\; \\pt(\\aa \\mid \\text{context})', { size: 56 }).at(0, 222));
    const r9 = S.add(S.reason('because: adding c multiplies every exponential by the same factor, {e to the c|zz}, on top and underneath, so it cancels', { y: 340 }));
    const add2 = S.add(S.english(`add {${SHIFT}|zz} to every {logit|zz}:`, { size: 40, width: 700 }).at(FX, 50));
    const f2v = (v) => v.toFixed(2);
    const say9 = 'What if the network added the same number, say two, to every logit? Each exponential is multiplied by e squared, on top and underneath, so the factor cancels. The probabilities do not move at all.';
    S.beat(say9,
      A.FadeOut(e8), S.writeIn(add2, 1),
      par(zVals.map((m, i) => A.Count(m, NEXT.z[i], NEXT.z[i] + SHIFT, (v) => num(v), 1.6)), eVals.map((m, i) => A.Count(m, EZ[i], EZ2[i], f2v, 1.6)), A.Count(eSum, ETOT, ETOT2, f2v, 1.6), A.Count(zSum, ZSUM, ZSUM + 5 * SHIFT, (v) => num(v), 1.6)),
      A.Write(SH, 2.2), S.writeIn(r9, 1.4), lag(0.12, pVals.map((m) => A.Indicate(m, { color: POL, scale: 1.25 }))),
      { cap: 'What if the network added the same number, say 2, to every logit? Each exponential is multiplied by e², on top and underneath, so the factor cancels. The probabilities do not move at all.' });

    // 10. so only differences matter
    const RT = S.add(S.tex('\\frac{\\pt(\\aa)}{\\pt(\\aa\')} \\;=\\; \\frac{e^{\\zz_\\aa}}{e^{\\zz_{\\aa\'}}} \\;=\\; e^{\\zz_\\aa - \\zz_{\\aa\'}}', { size: 60 }).at(FX, 55));
    const e10 = S.add(S.tex(`\\text{51 against 41:}\\quad \\frac{\\cPolicy{q1}{${NEXT.p[0].toFixed(3)}}}{\\cPolicy{q2}{${NEXT.p[1].toFixed(3)}}} \\;\\approx\\; ${(NEXT.p[0] / NEXT.p[1]).toFixed(2)} \\;\\approx\\; e^{\\cParams{q3}{${NEXT.z[0].toFixed(2)}} \\,-\\, \\cParams{q4}{${NEXT.z[1].toFixed(2)}}}`, { size: 52 }).at(0, 225));
    const r10 = S.add(S.reason('because: the total underneath is the same for every token, so it cancels in a ratio', { y: 340 }));
    const dz = NEXT.z[0] - NEXT.z[1];
    S.beat(`So only differences between logits matter. In a ratio of two probabilities the total cancels, leaving e to the difference of their logits. Fifty-one leads forty-one by ${say2(dz)}: ${say2(NEXT.p[0] / NEXT.p[1])} times as likely.`,
      fade(add2, SH, r9), par(zVals.map((m, i) => A.Count(m, NEXT.z[i] + SHIFT, NEXT.z[i], (v) => num(v), 1.2)), eVals.map((m, i) => A.Count(m, EZ2[i], EZ[i], f2v, 1.2)), A.Count(eSum, ETOT2, ETOT, f2v, 1.2), A.Count(zSum, ZSUM + 5 * SHIFT, ZSUM, (v) => num(v), 1.2)),
      A.Write(RT, 1.8), S.writeIn(r10, 1.4), A.Write(e10, 1.6),
      { cap: `So only differences between logits matter. In a ratio of two probabilities the total cancels, leaving e to the difference of their logits. 51 leads 41 by ${dz.toFixed(2)}: ${(NEXT.p[0] / NEXT.p[1]).toFixed(2)} times as likely.` });

    // 11. the picture: probabilities as blue bars
    const BH = 470;
    const bars = S.add(S.bars({ labels: NEXT.labels, values: NEXT.p, color: POL, h: BH, w: 130, gap: 90, labelFont: 'mono', labelSize: 40 }).at(0, 250));
    const after = S.add(S.txt('after “The answer is”', { size: 36, color: C.GREY_B, italic: true }).at(-600, -60));
    const e10b = S.add(S.english('only differences matter: {five logits|zz} carry just four numbers that count', { size: 36, color: C.GREY_B, width: 1400 }).at(0, -175));
    S.beat('As a picture: blue bars, this film’s drawing of a policy. Since only differences matter, five logits carry just four numbers that count. With three answers, two would be left: in chapter four, every policy becomes a point on a floor.',
      fade(rows, hdrT, hdrZ, hdrE, hdrP, eVals, pVals, rule, totL, zSum, eSum, pSum, RT, e10, r10), par(A.MoveTo(SM, 0, -310), A.ScaleTo(SM, 0.85)), A.Set(toy, { x: 700, y: 330 }, 0.1),
      A.FadeIn(bars, { dy: 30 }), A.FadeIn(after), wait(1.4), S.writeIn(e10b, 1.6));

    // 12. temperature: a knob for sampling
    const SMT = S.add(S.tex('\\pt(\\aa \\mid \\text{context}) \\;=\\; \\frac{e^{\\zz_\\aa / \\cKnob{c1T}{T}}}{\\sum_{\\aa\'} e^{\\zz_{\\aa\'} / \\cKnob{c1T}{T}}}', { size: 62 }).at(0, -310));
    const tl = [['T = 1/2', 'sharper'], ['T = 2', 'flatter'], ['T = 1', 'as built']].map(([t, w]) => S.add(S.english(`{${t}|knob}: ${w}`, { size: 44, width: 600 }).at(620, -120)));
    const sayT = `One last knob: the temperature T, which sets how adventurous sampling is. Divide every logit by T. At T equals one half, fifty-one rises to ${say2(PH[0])}: sharper. At T equals two, it falls to ${say2(P2[0])}: flatter. We keep T at one.`;
    const tA = S.atWord(sayT, 'At T equals one');
    const tB = S.atWord(sayT, 'At T equals two');
    const tC = S.atWord(sayT, 'We keep');
    const wT = seq(fade(SM, e10b), par(A.FadeIn(SMT), A.Spot(SMT, 'c1T')));
    const at = (t, done) => wait(Math.max(0, t - done));
    S.beat(sayT,
      wT, at(tA, MV.durOf(wT)), par(A.FadeIn(tl[0], { dur: 0.4 }), bars.to(PH, 1.2)),
      at(tB, Math.max(tA, MV.durOf(wT)) + 1.2), A.FadeOut(tl[0], { dur: 0.3 }), par(A.FadeIn(tl[1], { dur: 0.4 }), bars.to(P2, 1.2)),
      at(tC, Math.max(tB, Math.max(tA, MV.durOf(wT)) + 1.2) + 1.5), A.FadeOut(tl[1], { dur: 0.3 }), par(A.FadeIn(tl[2], { dur: 0.4 }), bars.to(NEXT.p, 1.2), A.Unspot(SMT, 1.2)),
      { cap: `One last knob: the temperature T, which sets how adventurous sampling is. Divide every logit by T. At T = ½, 51 rises to ${PH[0].toFixed(2)}: sharper. At T = 2, it falls to ${P2[0].toFixed(2)}: flatter. We keep T at 1.` });
  });

  /*
   * A whole answer: the chain rule of probability makes it a product of
   * token probabilities; logs turn the product into a sum (no underflow,
   * easy gradients). Numbers: ANSWER (toy token probabilities).
   */
  video.scene('sequence', 'A sentence is a product', (S) => {
    const POL = S.color('pt');
    const h = S.add(S.title('From tokens to answers'));
    const TY = -255;
    const PY = -172;
    const xl = S.add(S.tex('\\xx', { size: 56 }).at(-520, -350));
    const pr = S.add(S.box('What is 17 × 3?', { w: 440, h: 76, color: C.GREY_B, size: 38 }).at(-240, -350));
    const yl = S.add(S.tex('\\yy', { size: 56 }).at(-520, TY));
    const toks = S.add(S.tokens(ANSWER.tokens, { size: 48, gap: 90 }).at(0, TY));
    const probs = ANSWER.p.map((p, i) => S.add(S.txt(p.toFixed(2), { size: 38, color: POL, font: 'mono' }).at(toks.items[i].x, PY)));
    const toy = S.add(S.toy(720, -350));

    // 1. one token at a time
    S.beat('An answer is many tokens. The model picks one from the softmax, appends it, and runs again on the longer text. Each token had its own chance when it was picked.',
      A.FadeIn(h), A.FadeIn(xl), A.FadeIn(pr), A.FadeIn(yl), A.FadeIn(toy), A.Show(toks), lag(0.7, toks.items.map((t, i) => seq(A.FadeIn(t.item, { dur: 0.4, dx: -20 }), A.FadeIn(probs[i], { dur: 0.4, dy: -10 })))));

    // 2. two tokens: the chance of both
    const F2 = S.add(S.tex('\\pt(\\text{The answer} \\mid \\xx) \\;=\\; \\pt(\\text{The} \\mid \\xx)\\;\\; \\pt(\\text{answer} \\mid \\xx,\\, \\text{The})', { size: 60 }).at(0, -20));
    const F2n = S.add(S.tex(`${ANSWER.p[0].toFixed(2)} \\times ${ANSWER.p[1].toFixed(2)} \\;\\approx\\; ${(ANSWER.p[0] * ANSWER.p[1]).toFixed(2)}`, { size: 56, color: POL }).at(0, 100));
    const r2 = S.add(S.reason(`because: of all the times the model starts with ‘The’, a fraction {${ANSWER.p[1].toFixed(2)}|pt} go on to say ‘answer’`));
    S.beat('How likely is the whole answer? Start with two tokens. The chance of ‘The’, then ‘answer’, is the chance of ‘The’, times the chance of ‘answer’ given ‘The’.',
      lag(0.2, [0, 1].map((i) => A.Indicate(toks.items[i].item, { color: POL, scale: 1.12 }))), A.Write(F2, 2), A.Write(F2n, 1.2), S.writeIn(r2, 1.6));

    // 3. every token: a product
    const PROD = S.add(S.tex('\\pt(\\yy \\mid \\xx) \\;=\\; \\cData{c1prod}{\\prod_{t=1}^{n}}\\; \\pt\\big(\\yy_t \\mid \\xx,\\, \\cData{c1ylt}{\\yy_{<t}}\\big)', { size: 76 }).at(0, -20));
    const prodV = ANSWER.p.reduce((a, b) => a * b, 1);
    const Pn = S.add(S.tex(`${ANSWER.p.map((p) => p.toFixed(2)).join(' \\times ')} \\;\\approx\\; ${prodV.toFixed(2)}`, { size: 56, color: POL }).at(0, 140));
    const r3 = S.add(S.reason('because: the same rule, applied once for every token: the chain rule of probability'));
    S.beat(`Repeat for every token, and the answer’s chance is a product: for each position t, the chance of that token, given the prompt and all the tokens before it. On our answer, about ${say2(prodV)}.`,
      fade(F2, F2n, r2), A.Write(PROD, 2.2), S.writeIn(r3, 1.4), A.Write(Pn, 1.6),
      { cap: `Repeat for every token, and the answer’s chance is a product: for each position t, the chance of that token, given the prompt and all the tokens before it. On our answer, about ${prodV.toFixed(2)}.` });

    // 4. the symbols
    // (written out as beats, so the old lines leave before a card arrives)
    const cY = S.add(S.symcard('yy', { w: 860, from: 'the model’s answer to the prompt x, one token at a time', why: 'it is what gets judged' }).at(-460, 225));
    const cYt = S.add(S.symcard('c1ylt', { w: 860 }).at(460, 225));
    S.beat('x is the prompt and y the response. y t is its token at position t, for t from one to n, and y less-than t is every token before it: all the model has seen.',
      fade(Pn, r3), A.Spot(PROD, ['xx', 'yy', 'c1ylt']), A.FadeIn(cY, { dy: 16 }), A.FadeIn(cYt, { dy: 16 }),
      { cap: 'x is the prompt and y the response. y_t is its token at position t, for t from 1 to n, and y_<t is every token before it: all the model has seen.' });
    const cP = S.add(S.symcard('c1prod', { w: 900 }).at(0, 225));
    S.beat('This capital pi is not the policy: it means multiply. Every token must be picked for the answer to appear, so their chances multiply. The colours keep the two apart: the policy is blue.',
      fade(cY, cYt), A.Spot(PROD, 'c1prod'), A.FadeIn(cP, { dy: 16 }));

    // 5. products shrink: underflow
    const e5 = S.add(S.english('a {1000-token answer|yy}, each token with chance {0.9|pt}:', { size: 40, width: 1400 }).at(0, 60));
    const UF = S.add(S.tex(`0.9^{1000} \\;\\approx\\; ${Math.pow(0.9, 1000).toExponential(1).replace(/e-(\d+)/, ' \\times 10^{-$1}')} \\;\\;\\longrightarrow\\;\\; 0`, { size: 64 }).at(0, 160));
    if (Math.fround(Math.pow(0.9, 1000)) !== 0) throw new Error('ch01: 0.9^1000 should underflow in 32-bit floats');
    const r5 = S.add(S.reason('because: 32-bit numbers, the kind a GPU computes with, cannot hold a positive number this small: it becomes exactly 0'));
    S.beat('But products shrink fast. A thousand tokens at zero point nine each give about ten to the minus forty-six: too small for the thirty-two-bit numbers a G P U uses. It rounds to zero, and every long answer looks impossible.',
      par(A.Unspot(PROD), A.FadeOut(cP)), UP(PROD, -60, 0.6), S.writeIn(e5, 1.4), A.Write(UF, 1.8), S.writeIn(r5, 1.8),
      { cap: 'But products shrink fast. A thousand tokens at 0.9 each give about 10⁻⁴⁶: too small for the 32-bit numbers a GPU uses. It rounds to zero, and every long answer looks impossible.' });

    // 6. logs: the product becomes a sum
    const LOG = S.add(S.tex('\\lp(\\yy \\mid \\xx) \\;=\\; \\sum_{t=1}^{n}\\; \\lp\\big(\\yy_t \\mid \\xx,\\, \\cData{c1ylt}{\\yy_{<t}}\\big)', { size: 72 }).at(0, 100));
    const L1k = S.add(S.tex(`1000 \\times \\log 0.9 \\;\\approx\\; ${(1000 * Math.log(0.9)).toFixed(0).replace('-', '-\\,')}`, { size: 52, color: POL }).at(0, 228));
    const r6 = S.add(S.reason('because: the log of a product is the sum of the logs: log(ab) = log a + log b'));
    S.beat('So we take logarithms. The log of a product is the sum of the logs, so an answer’s log-probability is a sum over its tokens. The thousand tokens now give about minus one hundred and five.',
      fade(e5, UF, r5), A.Write(LOG, 2.2), S.writeIn(r6, 1.4), A.Write(L1k, 1.4));

    // 7. on our answer: log-probabilities add up
    const logs = ANSWER.logp.map((l, i) => S.add(S.txt(num(l), { size: 38, color: POL, font: 'mono' }).at(toks.items[i].x, PY)));
    const lsum = S.add(S.english(`sum: {${num(ANSWER.total)}|pt}`, { size: 40, width: 400 }).at(toks.width / 2 + 170, PY));
    S.tour(LOG, [
      { sym: 'lp', at: [0, 215], anims: [fade(L1k, r6, PROD), A.MoveTo(LOG, 0, -40), par(probs.map((p) => A.FadeOut(p, { dur: 0.4 }))), lag(0.25, logs.map((l) => A.FadeIn(l, { dur: 0.4 }))), A.FadeIn(lsum)],
        text: { from: 'the logarithm of the policy’s probability; never above 0', why: 'it turns a product of many chances into a sum; closer to 0 means more likely' },
        say: `On our answer, the logs add up to ${say2(ANSWER.total)}; e to that is ${say2(Math.exp(ANSWER.total))} again. Log-probabilities are never positive. Closer to zero means more likely.`,
        cap: `On our answer, the logs add up to ${ANSWER.total.toFixed(2)}; e to that is ${Math.exp(ANSWER.total).toFixed(2)} again. Log-probabilities are never positive. Closer to zero means more likely.` },
    ]);

    // 8. a sum is easy to differentiate
    const GR = S.add(S.tex('\\grad \\lp(\\yy \\mid \\xx) \\;=\\; \\sum_{t=1}^{n}\\; \\grad \\lp\\big(\\yy_t \\mid \\xx,\\, \\cData{c1ylt}{\\yy_{<t}}\\big)', { size: 72 }).at(0, 150));
    const r8 = S.add(S.reason('because: the gradient of a sum is the sum of the gradients'));
    S.beat('And a sum is easy to differentiate: its gradient is the sum of the token gradients, each one computed by back-propagation. Every gradient in this film flows through this sum.',
      S.endTour(LOG), A.Write(GR, 2), S.writeIn(r8, 1.2), A.Spot(GR, 'grad'));
  });

  /*
   * The vocabulary of reinforcement learning, mapped onto a language model:
   * state, action, policy, transition, episode, reward.
   */
  video.scene('mdp', 'States, actions, rewards', (S) => {
    const POL = S.color('pt');
    const h = S.add(S.title('The language of reinforcement learning'));

    // 1. the loop
    const agent = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 1 }).at(-580, 20));
    const world = S.add(S.box('world', { w: 320, h: 160, color: C.GREY_B, size: 46 }).at(540, 20));
    const act = S.add(S.arrow(-450, -70, 360, -70, { color: C.WHITE, width: 5 }));
    const obs = S.add(S.arrow(360, 110, -450, 110, { color: C.GREY_B, width: 5 }));
    const actL = S.add(S.english('an {action|data}', { size: 40, width: 600 }).at(-45, -115));
    const obsL = S.add(S.english('a new {state|data}, and sometimes a {reward|rr}', { size: 40, width: 900 }).at(-45, 158));
    const polL = S.add(S.english('its {policy|pt}: a rule for choosing', { size: 36, width: 600 }).at(-580, 250));
    S.beat('Reinforcement learning has its own vocabulary. An agent sees a state and picks an action. The world answers with a new state, and sometimes a reward. The agent’s rule for choosing is its policy.',
      A.FadeIn(h), A.FadeIn(agent, { dx: -30 }), A.FadeIn(world, { dx: 30 }), A.Arrow(act, 0.8), A.FadeIn(actL), A.Arrow(obs, 0.8), A.FadeIn(obsL), A.FadeIn(polL));

    // 2. the state
    const SY = -300;
    const px = S.add(S.box('What is 17 × 3?', { w: 400, h: 76, color: C.GREY_B, size: 36 }).at(-430, SY));
    const stT = S.add(S.tokens(['The', 'answer', 'is'], { size: 40 }));
    stT.at(-200 + stT.width / 2, SY);
    const ST = S.add(S.tex('\\ss_t \\;=\\; \\big(\\xx,\\; \\cData{c1ylt}{\\yy_{<t}}\\big)', { size: 76 }).at(0, -150));
    const cS = S.add(S.symcard('ss', { w: 900, from: 'the prompt x, plus the tokens written so far', why: 'it is everything the model sees when it picks token t' }).at(0, 150));
    S.beat('For a language model, the state at step t is everything the model sees: the prompt x, and the tokens written so far.',
      fade(agent, world, act, obs, actL, obsL, polL), A.FadeIn(px), A.FadeIn(stT), A.Write(ST, 1.6), A.FadeIn(cS, { dy: 16 }));

    // 3. the action and the policy
    const AC = S.add(S.tex('\\aa_t \\;=\\; \\yy_t, \\qquad \\aa_t \\;\\sim\\; \\pt(\\,\\cdot \\mid \\ss_t)', { size: 72 }).at(0, -20));
    const cA = S.add(S.symcard('aa', { w: 900, name: 'an action', from: 'one move of the agent: here, the next token', why: 'the policy puts a probability on every possible action' }).at(0, 165));
    S.beat('The action is the next token: a t is y t, drawn from the policy given the state. And the policy is the softmax we built. That is why we call it pi theta.',
      A.FadeOut(cS), A.Write(AC, 1.8), A.FadeIn(cA, { dy: 16 }), A.Spot(AC, ['pt', 'aa']),
      { cap: 'The action is the next token: a_t = y_t, drawn from the policy given the state. And the policy is the softmax we built. That is why we call it π_θ.' });

    // 4. the transition: append the token
    const TR = S.add(S.tex('\\ss_{t+1} \\;=\\; \\big(\\xx,\\; \\yy_{\\le t}\\big)', { size: 72 }).at(0, 110));
    const nt = S.add(S.tokens(['51'], { size: 40, colors: [POL] }));
    nt.at(-200 + stT.width + 12 + nt.width / 2, SY);
    const r4 = S.add(S.reason('because: the world just writes the chosen token onto the end; nothing random happens here'));
    S.beat('Then the world appends the token: the next state is the old one with y t on the end. No dice are rolled here. All the randomness lives in the policy.',
      A.Unspot(AC), A.FadeOut(cA), A.FadeIn(nt, { dx: -20 }), A.Write(TR, 1.6), S.writeIn(r4, 1.6),
      { cap: 'Then the world appends the token: the next state is the old one with y_t on the end. No dice are rolled here. All the randomness lives in the policy.' });

    // 5. the episode and its reward
    const EY = -130;
    const ep = S.add(S.tokens(ANSWER.tokens.concat(['<end>']), { size: 44, gap: 30 }).at(120, EY));
    const epX = S.add(S.box('What is 17 × 3?', { w: 380, h: 76, color: C.GREY_B, size: 34 }).at(-640, EY));
    const rws = ep.items.map((it, i) => S.add(i < ep.items.length - 1 ? S.txt('0', { size: 40, color: S.color('rr'), font: 'mono' }).with({ o: 0 }).at(120 + it.x, EY + 90) : S.tex('\\RR(\\xx, \\yy)', { size: 52 }).at(120 + it.x, EY + 96)));
    const rlab = S.add(S.english('{reward|rr} at each step', { size: 34, width: 400 }).at(-640, EY + 90));
    const e5 = S.add(S.english('one {episode|data} = one complete answer; the {judge|rr} scores it at the end', { size: 40, width: 1500 }).at(0, 140));
    S.beat('One complete answer is an episode. It ends with a special end token, and only then does a judge score it: R of x and y. Here, every step before that earns zero.',
      fade(px, stT, nt, ST, AC, TR, r4), A.FadeIn(epX), A.Show(ep), lag(0.15, ep.items.map((t) => A.FadeIn(t.item, { dx: -16, dur: 0.4 }))), A.FadeIn(rlab), lag(0.15, rws.map((m) => A.FadeIn(m, { dy: 10, dur: 0.4 }))), S.writeIn(e5, 1.8),
      { cap: 'One complete answer is an episode. It ends with a special end token, and only then does a judge score it: R(x, y). Here, every step before that earns zero.' });

    // 6. the dictionary, and why it is worth having
    const dict = [
      ['state', 'ss', 'the prompt plus the text so far'],
      ['action', 'aa', 'the next token'],
      ['policy', 'pt', 'the softmax we built'],
      ['transition', 'data', 'append the token: no randomness'],
      ['episode', 'yy', 'one complete answer'],
      ['reward', 'RR', 'the judge’s score at the end'],
    ].map(([a, key, b], i) => S.add(S.group(new Text(a, { size: 42, color: key === 'data' ? C.GREY_B : S.color(key), anchor: 'end' }).at(-150, 0), new Text('→', { size: 40, color: C.GREY }).at(-100, 0), new Text(b, { size: 40, anchor: 'start' }).at(-50, 0)).at(-60, -300 + i * 78)));
    const why = S.add(S.english('decades of tools built for this loop: {policy gradients|grad}, {values|VV}, {advantages|AA}, PPO', { size: 38, width: 1500 }).at(0, 250));
    S.beat('Why borrow these words? Because reinforcement learning has decades of tools for exactly this loop: policy gradients, values, advantages, P P O. Once our model is a policy, they all apply.',
      fade(ep, epX, rws, rlab, e5), lag(0.25, dict.map((d) => A.FadeIn(d, { dx: -24, dur: 0.5 }))), S.writeIn(why, 2),
      { cap: 'Why borrow these words? Because reinforcement learning has decades of tools for exactly this loop: policy gradients, values, advantages, PPO. Once our model is a policy, they all apply.' });
  });

  /*
   * The objective J(theta) = E_{x~D} E_{y~pi_theta(.|x)} [R(x, y)], built
   * from the inside out, toured, read, and evaluated on the opening's toy.
   */
  video.scene('objective', 'The objective', (S) => {
    const h = S.add(S.title('What we want'));

    // 1. why: high reward on average
    const e1 = S.add(S.english('we want a {high reward|RR}: not once, but {on average|EE}, over the {prompts|xx} we will be asked and the {answers|yy} the model gives', { size: 46, width: 1500 }).at(0, -60));
    S.beat('So what do we want? Not one lucky answer: prompts vary, and answers are random. We want high reward on average, over the questions the model is asked and the answers it gives.',
      A.FadeIn(h), S.writeIn(e1, 2.6));

    // 2. one prompt, one answer: the reward
    const R0 = S.add(S.tex('\\RR(\\xx, \\yy)', { size: 110 }).at(0, -60));
    const cR = S.add(S.symcard('RR', { w: 900, from: 'the judge, looking at one prompt x and one finished answer y', why: 'it is the only signal of what we want: one number' }).at(0, 165));
    S.beat('Build it from the inside: one prompt x, one finished answer y, and the judge’s number, R of x and y. Gold, like every reward.',
      A.FadeOut(e1), A.Write(R0, 1.2), A.FadeIn(cR, { dy: 16 }),
      { cap: 'Build it from the inside: one prompt x, one finished answer y, and the judge’s number, R(x, y). Gold, like every reward.' });

    // 3. average over answers: an expectation
    const EY = S.add(S.tex('\\EE_{\\yy \\sim \\pt(\\cdot \\mid \\xx)}\\big[\\, \\RR(\\xx, \\yy) \\,\\big] \\;=\\; \\sum_{\\yy}\\; \\pt(\\yy \\mid \\xx)\\; \\RR(\\xx, \\yy)', { size: 76 }).at(0, -60));
    const r3 = S.add(S.reason('because: an average over random answers weights each answer’s {reward|RR} by its {probability|pt}'));
    S.beat('But the answer is random, so average over the answers the model might give: each answer’s reward, weighted by its probability. That weighted average is an expectation, written E.',
      A.FadeOut(cR), UP(R0), A.Write(EY, 2.4), S.writeIn(r3, 1.6), A.Spot(EY, 'EE'), wait(1.6), A.Unspot(EY));

    // 4. average over prompts too: the objective
    const JF = S.add(S.tex('\\JJ(\\th) \\;=\\; \\EE_{\\xx \\sim \\cData{c1D}{\\mathcal{D}}}\\; \\EE_{\\yy \\sim \\pt(\\cdot \\mid \\xx)}\\big[\\, \\RR(\\xx, \\yy) \\,\\big]', { size: 86 }).at(0, -60));
    const r4 = S.add(S.reason('because: the prompts vary too, so we average over them as well'));
    S.beat('Prompts vary too, so average again, over prompts x from a dataset D. What is left depends only on the weights: J of theta, the objective.',
      A.FadeOut(R0), A.FadeOut(r3), UP(EY), A.Write(JF, 2.4), S.writeIn(r4, 1.2),
      { cap: 'Prompts vary too, so average again, over prompts x from a dataset D. What is left depends only on the weights: J(θ), the objective.' });

    // 5. the tour
    const e7y = S.add(S.english('change {θ|th}, and you change {which answers we see|pt}', { size: 42, width: 1400 }).at(0, 170));
    S.tour(JF, [
      { sym: 'EE', at: [0, 170], anims: [fade(EY, r4)], text: { from: 'an average, each outcome weighted by its probability', why: 'the subscript says what is random; read the tilde as “is drawn from”' },
        say: 'E with something underneath means an average. The subscript says what is random. Read the tilde as: is drawn from.' },
      { sym: ['xx', 'c1D'], card: 'c1D', at: [0, 170],
        say: 'x is drawn from D: prompts come from a fixed dataset, the questions we care about. Training never changes it.' },
      { sym: ['yy', 'pt'], card: false, at: [0, 170], anims: [S.writeIn(e7y, 1.6)],
        say: 'y is drawn from pi theta given x: the answers come from the model itself. Change theta, and you change which answers we see.',
        cap: 'y is drawn from π_θ given x: the answers come from the model itself. Change θ, and you change which answers we see.' },
      { sym: ['JJ', 'th'], card: 'JJ', at: [0, 170], anims: [A.FadeOut(e7y, { dur: 0.4 })], text: { from: 'the average reward, over prompts and the model’s own answers', why: 'it is the one number training tries to increase, by changing θ' },
        say: 'J of theta is one number for every setting of the weights: the average reward. Training means finding the theta that makes it as large as possible.',
        cap: 'J(θ) is one number for every setting of the weights: the average reward. Training means finding the θ that makes it as large as possible.' },
    ]);

    // 6. in English
    const e6 = S.add(S.english('{J(θ)|JJ} = the {average reward|RR}, over {prompts from our dataset|xx}, and over {answers drawn from the model itself|pt}', { size: 42, width: 1500 }).at(0, 170));
    S.beat('As a sentence: J of theta is the average reward, over prompts from our dataset and answers drawn from the model itself.',
      S.endTour(JF), S.writeIn(e6, 2.4),
      { cap: 'As a sentence: J(θ) is the average reward, over prompts from our dataset and answers drawn from the model itself.' });

    // 7. numbers: the opening's question
    const p = BAND.pi;
    const terms = p.map((v, i) => `\\cPolicy{o${i}}{${v.toFixed(2)}} \\cdot \\cReward{q${i}}{${BAND.r[i]}}`).join(' \\;+\\; ');
    const NJ = S.add(S.tex(`\\JJ \\;=\\; ${terms} \\;\\approx\\; \\cReward{oj}{${BAND.J.toFixed(2)}}`, { size: 58 }).at(0, 145));
    const ans = S.add(S.english(`one prompt, three answers: {51|data}, {about 50|data}, {41|data}, with {rewards ${BAND.r.join(', ')}|RR}`, { size: 36, color: C.GREY_B, width: 1500 }).at(0, 58));
    let zT = BAND.z.slice();
    for (let k = 0; k < 3; k++) {
      const g = RL.exactGradient(zT, BAND.r);
      zT = zT.map((v, i) => v + 2 * g[i]);
    }
    const JT = RL.expectedReward(RL.softmax(zT), BAND.r);
    const e7 = S.add(S.english(`move {chance|pt} onto 51, as in the opening, and {J|JJ} rises to ${JT.toFixed(2)}`, { size: 38, width: 1500 }).at(0, 245));
    const toy = S.add(S.toy(0, 322));
    S.beat(`On the opening question, J is a short sum: each answer’s chance times its reward, about ${say2(BAND.J)}. Shift chance onto fifty-one, and J rises.`,
      A.FadeOut(e6), S.writeIn(ans, 1.6), A.Write(NJ, 2.4), S.writeIn(e7, 1.6), A.FadeIn(toy),
      { cap: `On the opening question, J is a short sum: each answer’s chance times its reward, about ${BAND.J.toFixed(2)}. Shift chance onto 51, and J rises.` });

    // 8. where theta lives
    const e8 = S.add(S.english('{θ|th} is not in the {reward|RR}: it lives only in the {probabilities|pt} that pick the answers', { size: 42, width: 1500 }).at(0, 170));
    S.beat('Notice where theta lives. Not in the reward: the judge knows nothing of our weights. Only in the probabilities that decide which answers we see. That is what makes the next step hard.',
      fade(NJ, ans, e7, toy), A.Spot(JF, ['th', 'pt']), S.writeIn(e8, 2),
      { cap: 'Notice where θ lives. Not in the reward: the judge knows nothing of our weights. Only in the probabilities that decide which answers we see. That is what makes the next step hard.' });
  });
});
