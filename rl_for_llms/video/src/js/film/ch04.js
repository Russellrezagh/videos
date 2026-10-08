// Chapter 4 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch04(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  const sgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '+') + Math.abs(x).toFixed(d);
  const tsgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '-' : '+') + Math.abs(x).toFixed(d);
  const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  // words a narrator says for a decimal number
  const sayN = (x, d = 2) => {
    const s = Math.abs(x).toFixed(d);
    const [a, b] = s.split('.');
    const ints = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    const whole = +a < ints.length ? ints[+a] : a;
    return `${x < 0 ? 'minus ' : ''}${whole}${b ? ` point ${b.split('').map((c) => DIG[+c]).join(' ')}` : ''}`;
  };
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  const side = (S, str, x, y, w = 760) => S.english(str, { size: 34, color: C.GREY_B, italic: true, width: w }).at(x, y);
  // one left-aligned line of {words|key} markup (the proof table's reasons)
  const richLine = (S, markup, { size = 32, color = C.GREY_B, italic = true } = {}) => {
    const runs = [];
    const re = /\{([^{}|]+)\|([^{}]+)\}/g;
    let last = 0;
    let m;
    while ((m = re.exec(markup))) {
      if (m.index > last) runs.push([markup.slice(last, m.index), null]);
      runs.push([m[1], S.color(m[2].trim())]);
      last = re.lastIndex;
    }
    if (last < markup.length) runs.push([markup.slice(last), null]);
    return S.add(new MV.Rich(runs, { size, color, italic, anchor: 'start' }).hidden());
  };
  // the score, s = grad log pi(a): the glossary's sc, yellow like every direction
  const S_ = '\\sc';
  // the bandit's numbers (kernel: src/js/rl.js)
  const SC = BAND.labels.map((_, a) => RL.score(BAND.pi, a));
  const varAt = (b, r = R10) => RL.estimatorStats(BAND.z, r, b).variance;

  // the film's bandit as bars, with each answer's reward under its label
  const banditBars = (S, x, y, rewards, { h = 280, w = 120, gap = 150 } = {}) => {
    const bars = S.add(S.bars({ labels: BAND.labels, values: BAND.pi, color: S.color('pt'), h, w, gap, labelFont: 'serif', labelSize: 38 }).at(x, y));
    const rs = rewards.map((r, i) => S.add(S.txt(`r = ${r}`, { size: 34, color: S.color('rr'), font: 'mono' }).at(x + bars.xs[i], y + 88)));
    return { bars, rs };
  };

  /* =========================================================== CHAPTER 4 */
  video.chapter('ch4', 'Taming the noise');
  card(4, 'Taming the noise: baselines');

  /*
   * A generous judge: add 10 to every reward. The exact gradient does not
   * move (shown), but one sample's estimate swings hugely: variance 0.16 -> 68.
   */
  video.scene('offset', 'A generous judge', (S) => {
    const h = S.add(S.title('A generous judge'));
    const BX = -540;
    const BY = 200;
    const { bars, rs } = banditBars(S, BX, BY, BAND.r);
    const q = S.add(S.english('how far can one {estimate|ghat} land from the {true gradient|grad}?', { size: 44, width: 900 }).at(400, -150));
    const toy = S.add(S.toy(BX, -330));
    S.beat('REINFORCE is right on average. But one estimate can land far from that average. How far depends on something surprising: where the judge puts its zero.',
      A.FadeIn(h), A.FadeIn(bars, { dy: 20 }), lag(0.3, rs.map((r) => A.FadeIn(r))), A.FadeIn(toy), S.writeIn(q, 2));

    // 1. add ten to every reward
    const fmtR = (i) => (v) => `r = ${(Math.round(v * 10) / 10).toFixed(R10[i] % 1 ? 1 : 0)}`;
    const e1 = S.add(S.english('same ranking, same differences between answers: only the zero point moved', { size: 38, width: 900 }).at(400, -20));
    S.beat('Suppose the judge is generous, and adds ten to every reward: eleven, ten point three, and ten. Same ranking. Same differences between answers. Only the zero point has moved.',
      A.FadeOut(q), par(rs.map((r, i) => A.Count(r, BAND.r[i], R10[i], fmtR(i), 1.4))), lag(0.2, rs.map((r) => A.Indicate(r, { color: S.color('rr'), scale: 1.2 }))), S.writeIn(e1, 1.6),
      { cap: 'Suppose the judge is generous, and adds 10 to every reward: 11, 10.3 and 10. Same ranking. Same differences between answers. Only the zero point has moved.' });

    // 2. the exact gradient does not change
    const L1 = S.add(S.tex('\\JJ^{\\prime} \\;=\\; \\sum_{\\aa} \\pt(\\aa)\\,\\big(\\rr(\\aa) + 10\\big) \\;=\\; \\JJ + 10', { size: 54 }).at(400, -170));
    const L2 = S.add(S.tex('\\frac{\\partial \\JJ^{\\prime}}{\\partial \\zz_j} \\;=\\; \\pt(j)\\,\\Big(\\big(\\rr(j) + 10\\big) - \\big(\\JJ + 10\\big)\\Big)', { size: 50 }).at(400, -40));
    const L3 = S.add(S.tex('\\;=\\; \\pt(j)\\,\\big(\\rr(j) - \\JJ\\big)', { size: 54, color: C.WHITE }).at(400, 70));
    const r2 = S.add(side(S, 'because: Σ π(a) × 10 = 10, since the {probabilities|pt} add up to one; then the tens cancel', 400, 180, 860));
    S.beat('The exact gradient does not change. The average reward rises by exactly ten, because the probabilities add up to one. So in chapter three’s formula, pi times reward minus average, the two tens cancel.',
      A.FadeOut(e1), A.Write(L1, 1.6), A.Write(L2, 1.8), A.Write(L3, 1), S.writeIn(r2, 1.6),
      { cap: 'The exact gradient does not change. The average reward rises by exactly 10, because the probabilities add up to one. So in chapter 3’s formula, π(j) (r(j) − J), the two tens cancel.' });

    // 3. but one sample swings hard
    const g41 = RL.reinforceSample(BAND.z, R10, 2);
    const g51 = RL.reinforceSample(BAND.z, R10, 0);
    const K = 22;
    const arr = g41.map((g, i) => {
      const x = BX + bars.xs[i] + 82;
      const y = BY - bars.h * BAND.pi[i];
      return S.add(S.arrow(x, y, x, y - g * K, { color: S.color('grad'), width: 6 }));
    });
    const vec = (g) => `(${g.map((v) => sgn(v, 2)).join(', ')})`;
    const t41 = S.add(S.tex(`\\aa = 41: \\quad \\ghat \\;=\\; 10 \\times (${SC[2].map((v) => tsgn(v, 3)).join(',\\, ')})`, { size: 46 }).at(410, -190));
    const v41 = S.add(S.txt(`= ${vec(g41)}`, { size: 42, color: S.color('grad'), font: 'mono' }).at(440, -100));
    const v51 = S.add(S.txt(`a = 51:  ĝ = ${vec(g51)}`, { size: 38, color: S.color('grad'), font: 'mono' }).at(400, 10));
    const vt = S.add(S.txt(`true gradient:  ${vec(BAND.grad)}`, { size: 38, color: C.GREY_B, font: 'mono' }).at(400, 110));
    S.beat('One sample is another story. Sample forty-one, and the estimate used to be zero; now it is ten times the score, a big push up for the wrong answer. Sample fifty-one, and it swings hard the other way.',
      par([L1, L2, L3, r2].map((m) => A.FadeOut(m))), A.Write(t41, 1.4), lag(0.3, arr.map((a) => A.Arrow(a, 0.7))), A.FadeIn(v41), A.Indicate(bars.labs[2], { color: C.RED, scale: 1.25 }), wait(0.8), A.FadeIn(v51), A.FadeIn(vt));

    // 4. variance: the average squared miss
    const Vf = S.add(S.tex('\\operatorname{Var}\\,\\ghat \\;=\\; \\EE\\Big[\\, \\big\\|\\, \\ghat - \\grad\\JJ \\,\\big\\|^2 \\Big]', { size: 76 }).at(0, -150));
    const eV = S.add(S.english('the {variance|op}: on average, the squared distance between one {estimate|ghat} and the {true gradient|grad}', { size: 40, width: 1500 }).at(0, 10));
    const rV = S.add(S.reason('squared, so that misses in every direction count, and big misses count most'));
    S.beat('To measure the swinging, use the variance: the average squared distance between one estimate and the true gradient. Squared, so that misses in every direction count, and big misses count most.',
      par(A.FadeOut(t41), A.FadeOut(v41), A.FadeOut(v51), A.FadeOut(vt), par(arr.map((a) => A.FadeOut(a))), A.FadeOut(bars), par(rs.map((r) => A.FadeOut(r))), A.FadeOut(toy)),
      A.Write(Vf, 1.8), S.writeIn(eV, 2), S.writeIn(rV, 1.4));

    // 5. the numbers: about 430 times more
    const KX = 840 / VAR.off;
    const rowV = (label, v, y, col) => {
      const lab = S.add(S.txt(label, { size: 36, color: C.GREY_B, anchor: 'end' }).at(-230, y));
      const bar = S.add(S.line(-200, y, -200 + Math.max(8, v * KX), y, { stroke: col, width: 30 }).with({ draw: 0 }));
      const val = S.add(S.txt(v < 1 ? v.toFixed(2) : v.toFixed(1), { size: 40, color: col, font: 'mono', anchor: 'start' }).at(-200 + Math.max(8, v * KX) + 24, y));
      return [lab, bar, val];
    };
    const rA = rowV('rewards 1, 0.3, 0', VAR.plain, 120, C.GREY_B);
    const rB = rowV('rewards 11, 10.3, 10', VAR.off, 220, C.RED);
    const ratio = VAR.off / VAR.plain;
    const eN = S.add(S.english(`about ${Math.round(ratio / 10) * 10} times the variance: ${Math.round(ratio / 10) * 10} times as many samples for the same precision`, { size: 36, color: C.GREY_B }).at(0, 310));
    if (Math.round(ratio / 10) * 10 !== 430) throw new Error('ch04: the variance ratio is no longer about 430; update the narration');
    S.beat('Computed exactly: zero point one six with the original judge, sixty-eight with the generous one. About four hundred and thirty times more. Averaging divides the variance by the number of samples, so we would need four hundred and thirty times as many.',
      par(A.FadeOut(eV), A.FadeOut(rV), par(A.MoveTo(Vf, 0, -250), A.ScaleTo(Vf, 0.8))),
      A.FadeIn(rA[0]), A.Create(rA[1], 0.5), A.FadeIn(rA[2]), wait(0.6), A.FadeIn(rB[0]), A.Create(rB[1], 1.6), A.FadeIn(rB[2]), S.writeIn(eN, 1.6),
      { cap: `Computed exactly: ${VAR.plain.toFixed(2)} with the original judge, ${VAR.off.toFixed(1)} with the generous one. About ${Math.round(ratio / 10) * 10} times more. Averaging divides the variance by the number of samples, so we would need ${Math.round(ratio / 10) * 10} times as many.` });
  });

  /*
   * Subtract a baseline. Prove E[grad log pi] = 0, one reason per step, so
   * that (r - b) grad log pi is unbiased for any b that does not depend on
   * the sampled answer.
   */
  video.scene('baseline', 'Subtract a baseline', (S) => {
    const h = S.add(S.title('Subtract a baseline'));

    // 1. the idea, and the new symbol
    const est = S.add(S.tex('\\ghat \\;=\\; \\big(\\rr(\\aa) - \\bb\\big)\\; \\grad\\lp(\\aa)', { size: 90 }).at(0, -90));
    const cb = S.add(S.symcard('bb', { w: 1100, from: 'a number we choose before the answer is sampled', why: 'subtracting it removes the offset, and, as we will prove, adds no bias' }).at(0, 150));
    S.beat('The offset adds nothing but noise. If we knew it, we would subtract it. So subtract a number b from every reward before using it. We call b a baseline: the reward we expected anyway.',
      A.FadeIn(h), A.Write(est, 1.6), A.Spot(est, 'bb'), A.FadeIn(cb, { dy: 16 }));

    // 2. the worry, and linearity
    const L1 = S.add(S.tex(`\\EE\\Big[\\big(\\rr - \\bb\\big)\\, \\grad\\lp\\Big] \\;=\\; \\EE\\big[\\rr\\, \\grad\\lp\\big] \\;-\\; \\bb\\; \\cData{sE}{\\EE\\big[\\grad\\lp\\big]}`, { size: 66 }).at(0, -60));
    const r2 = S.add(S.reason('because: the average of a difference is the difference of the averages, and a fixed number {b|bb} comes out of an average'));
    S.beat('Careful: change the estimate, and its average might change too, and we would climb the wrong hill. Split the average in two. The first part is the gradient we want. All hinges on the second: b times the average score.',
      par(A.Unspot(est), A.FadeOut(cb), UP(est)), A.Write(L1, 2.2), S.writeIn(r2, 1.8), A.Spot(L1, 'sE'),
      { cap: 'Careful: change the estimate, and its average might change too, and we would climb the wrong hill. Split the average in two. The first part is the gradient we want. All hinges on the second: b times the average score.' });

    // 3 to 6. the proof table: E[grad log pi] = 0, one reason per line
    const XE = -400; // where each line's "=" starts
    const RX = 250; // where the reasons start
    const Y = [-300, -175, -50, 75, 195];
    const lhs = S.add(S.tex('\\EE_{\\aa \\sim \\pt}\\big[\\grad\\lp(\\aa)\\big]', { size: 52 }));
    lhs.at(XE - 16 - lhs.w / 2, Y[0]);
    const rhs = [
      '= \\sum_{\\aa} \\pt(\\aa)\\; \\grad\\lp(\\aa)',
      '= \\sum_{\\aa} \\pt(\\aa)\\; \\frac{\\grad\\pt(\\aa)}{\\pt(\\aa)}',
      '= \\sum_{\\aa} \\grad\\pt(\\aa)',
      '= \\grad \\sum_{\\aa} \\pt(\\aa)',
      '= \\grad\\, 1 \\;=\\; 0',
    ].map((t, i) => {
      const m = S.add(S.tex(t, { size: 52 }));
      return m.at(XE + m.w / 2, Y[i]);
    });
    const why = [
      ['an expectation is a sum,', 'weighted by {probabilities|pt}'],
      ['chain rule: ∇ log π = ∇π / π', '(chapter 3’s trick, run backwards)'],
      ['π(a) above and π(a) below cancel'],
      ['the gradient of a sum is', 'the sum of the gradients'],
      ['the {probabilities|pt} add up to one for', 'every {θ|th}: a constant has zero slope'],
    ].map((lines, i) => lines.map((ln, k) => richLine(S, ln).at(RX, Y[i] + (k - (lines.length - 1) / 2) * 40)));
    const showRow = (i) => par(A.Write(rhs[i], 1.4), lag(0.3, why[i].map((l) => A.Write(l, 1.2))));
    const dimRows = (n) => par(rhs.slice(0, n).map((m) => A.Set(m, { o: 0.55 }, 0.5)), why.slice(0, n).flat().map((m) => A.Set(m, { o: 0.55 }, 0.5)));
    S.beat('So, what is the average score? An expectation is a sum, weighted by probabilities. And by the chain rule, the gradient of log pi is the gradient of pi over pi: the trick from chapter three, run backwards.',
      par(A.Unspot(L1), A.FadeOut(r2), A.FadeOut(L1), A.FadeOut(est)), A.Write(lhs, 1.2), showRow(0), dimRows(1), showRow(1),
      { cap: 'So, what is the average score? An expectation is a sum, weighted by probabilities. And by the chain rule, ∇ log π is ∇π over π: the trick from chapter 3, run backwards.' });
    const say45 = 'Now pi of a, times something over pi of a: they cancel. And a sum of gradients is the gradient of the sum. So all we need is the slope of the total probability.';
    S.beat(say45,
      dimRows(2), showRow(2), wait(Math.max(0, S.atWord(say45, 'And a sum') - 2.2)), dimRows(3), showRow(3),
      { cap: 'Now π(a), times something over π(a): they cancel. And a sum of gradients is the gradient of the sum. So all we need is the slope of the total probability.' });
    const e6 = S.add(S.english('on average, the {score|grad} is zero: the pushes of all the answers cancel', { size: 40 }).at(0, 315));
    S.beat('But the total probability is always one, whatever the weights are. One is a constant, and a constant has zero slope. So the score averages to exactly zero.',
      dimRows(4), showRow(4), A.Indicate(rhs[4], { color: C.GREEN, scale: 1.15 }), S.writeIn(e6, 1.6));

    // 7. check it on the bandit
    const tex2 = (v) => v.toFixed(2);
    const rows = BAND.pi.map((p, a) => S.add(S.tex(`\\cPolicy{np}{${tex2(p)}} \\times \\cGrad{ns}{(${SC[a].map((v) => tsgn(+v.toFixed(2), 2)).join(',\\; ')})}`, { size: 54 }).at(160, -230 + a * 100)));
    const labs = BAND.labels.map((l, a) => S.add(S.txt(`if ${l}:`, { size: 40, color: C.GREY_B, anchor: 'end' }).at(-330, -230 + a * 100)));
    const rule = S.add(S.line(-280, 50, 620, 50, { stroke: C.GREY, width: 3 }));
    const tot = S.add(S.tex('\\text{sum} \\;=\\; (0,\\; 0,\\; 0)', { size: 54, color: S.color('grad') }).at(160, 115));
    const e7 = S.add(S.english('51 pushes its own logit up; the other two answers, when sampled, push it down just as much on average', { size: 36, color: C.GREY_B }).at(0, 250));
    S.beat('Check it on our bandit. Weight each answer’s score by its probability, and add. Fifty-one pushes its logit up, but when the other answers are sampled, they push it down, and on average the three cancel exactly.',
      par(A.FadeOut(e6), A.FadeOut(lhs), par(rhs.map((m) => A.FadeOut(m)), why.flat().map((m) => A.FadeOut(m)))),
      lag(0.4, rows.map((r, a) => par(A.FadeIn(r, { dx: 20 }), A.FadeIn(labs[a])))), A.Create(rule, 0.6), A.Write(tot, 1), S.writeIn(e7, 1.6));

    // 8. so the baseline adds no bias
    const C8 = S.add(S.tex('\\EE\\Big[\\big(\\rr - \\bb\\big)\\, \\grad\\lp\\Big] \\;=\\; \\EE\\big[\\rr\\, \\grad\\lp\\big] \\;-\\; \\bb \\cdot 0 \\;=\\; \\grad\\JJ', { size: 76 }).at(0, -60));
    const box8 = S.add(S.rect(C8.w + 80, C8.h + 50, { stroke: S.color('advantage'), width: 4, rx: 12 }).at(0, -60));
    const e8 = S.add(S.english('for any {baseline|bb}, the estimate still points the right way on average: only its noise changes', { size: 40 }).at(0, 140));
    S.beat('So the baseline term vanishes on average. Whatever b we choose, the estimate still averages to the true gradient. It stays unbiased. Only its noise changes.',
      par([...rows, ...labs, rule, tot, e7].map((m) => A.FadeOut(m))), A.Write(C8, 2), A.Create(box8, 0.8), S.writeIn(e8, 1.6));

    // 9. what b may and may not depend on
    const ok = ['a fixed number', 'the average reward', 'anything known before sampling: the prompt x', 'other, independent samples'];
    const no = ['the sampled answer itself', 'its own reward r(a)'];
    const colOK = ok.map((t, i) => S.add(S.group(S.check(30).with({ o: 1 }), new Text(t, { size: 34, anchor: 'start' }).at(36, 0)).at(-820, 10 + i * 64)));
    const colNO = no.map((t, i) => S.add(S.group(S.cross(28).with({ o: 1 }), new Text(t, { size: 34, anchor: 'start' }).at(36, 0)).at(170, 10 + i * 64)));
    const hOK = S.add(S.txt('b may use', { size: 38, color: C.GREEN, anchor: 'start' }).at(-820, -60));
    const hNO = S.add(S.txt('b may not use', { size: 38, color: C.RED, anchor: 'start' }).at(170, -60));
    const ex9 = S.add(S.tex('\\bb = \\rr(\\aa) \\;\\Rightarrow\\; \\ghat = 0 \\text{ always}', { size: 46, color: C.RED }).at(460, 190));
    S.beat('The proof pulled b out of the average, so b must not depend on the sampled answer. It may use anything fixed beforehand, like the prompt. Not the answer itself: set b to its own reward, and every estimate is zero.',
      par(A.FadeOut(e8), par(A.MoveTo(C8, 0, -270), A.ScaleTo(C8, 0.75), A.MoveTo(box8, 0, -270), A.ScaleTo(box8, 0.75))),
      A.FadeIn(hOK), lag(0.3, colOK.map((c) => A.FadeIn(c, { dx: -20 }))), A.FadeIn(hNO), lag(0.3, colNO.map((c) => A.FadeIn(c, { dx: -20 }))), A.Write(ex9, 1.2));
  });

  /*
   * The variance as a function of b is a parabola; its bottom is
   * b* = E[r |s|^2] / E[|s|^2]. Compare with the mean reward J10.
   */
  video.scene('variance', 'The best baseline', (S) => {
    const h = S.add(S.title('Which baseline is best?'));
    const VJ = varAt(J10);
    const VS = varAt(VAR.bStar);
    const V10 = varAt(10);

    // 1. the picture: variance against b
    const AX = 60;
    const AY = 40;
    const ax = S.add(S.axes({ x0: 9, x1: 12, y0: 0, y1: 1.6, w: 1100, h: 460, xticks: [9, 10, 11, 12], yticks: [0, 0.5, 1, 1.5], yfmt: (v) => String(v), xlabel: 'baseline b', ylabel: 'variance of the estimate' }).at(AX, AY));
    const cv = ax.plot((b) => varAt(b), { color: S.color('ghat'), width: 6, samples: 120 });
    const P = (b) => [AX + ax.fx(b), AY + ax.fy(varAt(b))];
    // a dot on the curve, a leader line, and a label at (dx, dy) from the dot
    const pin = (b, color, label, dx, dy, anchor = 'start') => {
      const [x, y] = P(b);
      const d = S.add(S.dot(11, color).at(x, y));
      const l = S.add(S.txt(label, { size: 32, color, anchor }).at(x + dx, y + dy));
      const ex = anchor === 'start' ? x + dx - 8 : anchor === 'end' ? x + dx + 8 : x + dx;
      const ln = S.add(S.line(x, y - 14, ex, y + dy + 20, { stroke: color, width: 3 }));
      return [d, ln, l];
    };
    const p10 = pin(10, C.GREY_B, `b = 10: ${V10.toFixed(2)}, the original judge`, -40, -170);
    const off = S.add(S.txt(`b = 0 (no baseline): ${VAR.off.toFixed(1)}, far off the chart`, { size: 32, color: C.RED, anchor: 'end' }).at(AX + 560, AY - 290));
    const toy = S.add(S.toy(AX + 460, AY - 240));
    S.beat('Every baseline gives the right average; they differ only in noise. Here is the variance for each b, computed exactly with the generous judge. A parabola. At b equals ten, we are back to the original judge.',
      A.FadeIn(h), A.FadeIn(ax), A.Create(cv, 1.6), A.FadeIn(off), A.FadeIn(toy), lag(0.2, p10.map((m) => A.FadeIn(m))));

    // 2. a short name for the score
    const est = S.add(S.tex(`\\ghat \\;=\\; \\big(\\rr - \\bb\\big)\\, ${S_}, \\qquad ${S_} \\;=\\; \\grad\\lp(\\aa)`, { size: 76 }).at(0, -60));
    const cs = S.add(S.symcard('sc', { w: 1100, from: 'the gradient of the sampled answer’s log-probability, ∇ log π(a)', why: 'the direction that makes that answer more likely; one letter keeps the variance formulas short' }).at(0, 170));
    S.beat('Why a parabola, and where is its bottom? To keep the lines short, write s for the score of the sampled answer, the gradient of log pi. Then the estimate is r minus b, times s.',
      par([ax, cv, off, toy, ...p10].map((m) => A.FadeOut(m))), A.Write(est, 1.8), A.Spot(est, 'sc'), A.FadeIn(cs, { dy: 16 }));

    // 3. the variance, written out
    const V1 = S.add(S.tex(`\\operatorname{Var}(\\bb) \\;=\\; \\EE\\Big[\\big(\\rr - \\bb\\big)^2\\, \\|${S_}\\|^2\\Big] \\;-\\; \\|\\grad\\JJ\\|^2`, { size: 76 }).at(0, -60));
    const r3 = S.add(S.reason('because: average squared distance from the mean = average squared length − squared length of the mean; and the mean is {∇J|grad} for every {b|bb}'));
    S.beat('The variance is the average squared length of the estimate, minus the squared length of its average. That average is the true gradient, whatever b is. So only the first part depends on b.',
      par(A.Unspot(est), A.FadeOut(cs), UP(est)), A.Write(V1, 2), S.writeIn(r3, 2));

    // 4. expand the square: a parabola in b
    const V2 = S.add(S.tex(`\\;=\\; \\bb^2\\; \\EE\\|${S_}\\|^2 \\;-\\; 2\\bb\\; \\EE\\big[\\rr\\, \\|${S_}\\|^2\\big] \\;+\\; \\EE\\big[\\rr^2 \\|${S_}\\|^2\\big] \\;-\\; \\|\\grad\\JJ\\|^2`, { size: 62 }).at(0, 120));
    const r4 = S.add(S.reason('because: (r − b)² = r² − 2rb + b², and the number {b|bb} comes out of each average'));
    S.beat('Expand the square. b squared comes out of the average, and so does two b. In b, this is a parabola, and it opens upward, because the average squared length of s is positive.',
      A.FadeOut(r3), A.Write(V2, 2.2), S.writeIn(r4, 1.6));

    // 5. the bottom: slope zero
    const D1 = S.add(S.tex(`\\frac{d\\,\\mathrm{Var}}{d\\bb} \\;=\\; 2\\bb\\; \\EE\\|${S_}\\|^2 \\;-\\; 2\\, \\EE\\big[\\rr\\, \\|${S_}\\|^2\\big] \\;=\\; 0`, { size: 64 }).at(0, -170));
    const BS = S.add(S.tex(`\\bb^{*} \\;=\\; \\frac{\\EE\\big[\\rr\\, \\|${S_}\\|^2\\big]}{\\EE\\big[\\|${S_}\\|^2\\big]}`, { size: 84 }).at(0, 100));
    const boxS = S.add(S.rect(BS.w + 90, BS.h + 50, { stroke: S.color('bb'), width: 4, rx: 12 }).at(0, 100));
    const r5 = S.add(S.reason('because: at the bottom of a parabola, the slope is zero'));
    S.beat('At the bottom of a parabola, the slope is zero. Set it to zero and solve: the best baseline, b star, is the average of r times the squared length of s, over the average squared length of s.',
      par(A.FadeOut(r4), A.FadeOut(est), A.FadeOut(V1), A.FadeOut(V2)), A.Write(D1, 2), A.Write(BS, 1.8), A.Create(boxS, 0.8), S.writeIn(r5, 1.2));

    // 6. read it, with the bandit's numbers
    const n2 = SC.map((s) => RL.dot(s, s));
    const Es = RL.sum(BAND.pi.map((p, a) => p * n2[a]));
    const wts = BAND.pi.map((p, a) => (p * n2[a]) / Es);
    const e6 = S.add(S.english('{b*|bb}: an average of the {rewards|rr}, each weighted by {how often it comes up|pt} × {how hard its score pushes|grad}', { size: 38, width: 1600 }).at(0, -150));
    const hd = ['answer', 'how often π', 'push ‖s‖²', 'weight', 'reward'];
    const HX = [-620, -330, -40, 250, 520];
    const heads = hd.map((t, i) => S.add(S.txt(t, { size: 32, color: [C.GREY_B, S.color('pt'), S.color('grad'), S.color('bb'), S.color('rr')][i] }).at(HX[i], -60)));
    const trows = BAND.labels.map((l, a) => S.add(S.group(
      new Text(l, { size: 38 }).at(HX[0], 0),
      new Text(BAND.pi[a].toFixed(2), { size: 38, font: 'mono', color: S.color('pt') }).at(HX[1], 0),
      new Text(n2[a].toFixed(2), { size: 38, font: 'mono', color: S.color('grad') }).at(HX[2], 0),
      new Text(wts[a].toFixed(3), { size: 38, font: 'mono', color: S.color('bb') }).at(HX[3], 0),
      new Text(String(R10[a]), { size: 38, font: 'mono', color: S.color('rr') }).at(HX[4], 0)
    ).at(0, 10 + a * 64)));
    const res = S.add(S.tex(`\\bb^{*} = ${wts.map((w, a) => `${w.toFixed(3)} \\cdot ${R10[a]}`).join(' + ')} = ${VAR.bStar.toFixed(2)} \\qquad \\text{mean reward } ${J10.toFixed(2)}`, { size: 46 }).at(0, 250));
    S.beat('Read it as a weighted average of the rewards: each answer counts by how often it comes up, times how hard its score pushes. Rare answers push hardest, so the low-reward answers count for more than their chances, and b star lands just under the mean reward.',
      par(A.FadeOut(r5), A.FadeOut(D1), par(A.MoveTo(BS, 0, -330), A.ScaleTo(BS, 0.55), A.MoveTo(boxS, 0, -330), A.ScaleTo(boxS, 0.55))),
      S.writeIn(e6, 2), lag(0.15, heads.map((m) => A.FadeIn(m))), lag(0.4, trows.map((r) => A.FadeIn(r, { dx: 20 }))), A.Write(res, 1.8),
      { cap: `Read it as a weighted average of the rewards: each answer counts by how often it comes up, times how hard its score pushes. Rare answers push hardest, so the low-reward answers count for more than their chances, and b* = ${VAR.bStar.toFixed(2)} lands just under the mean reward, ${J10.toFixed(2)}.` });

    // 7. back to the picture: the mean is nearly as good
    const ax2 = S.add(S.axes({ x0: 9, x1: 12, y0: 0, y1: 1.6, w: 1100, h: 460, xticks: [9, 10, 11, 12], yticks: [0, 0.5, 1, 1.5], yfmt: (v) => String(v), xlabel: 'baseline b', ylabel: 'variance of the estimate' }).at(AX, AY));
    const cv2 = ax2.plot((b) => varAt(b), { color: S.color('ghat'), width: 6, samples: 120 });
    const pJ = pin(J10, C.GREEN, `mean ${J10.toFixed(2)}: ${VJ.toFixed(3)}`, 150, -200, 'middle');
    const pS = pin(VAR.bStar, S.color('bb'), `best b* = ${VAR.bStar.toFixed(2)}: ${VS.toFixed(3)}`, -200, -260, 'middle');
    const off2 = S.add(S.txt(`no baseline: ${VAR.off.toFixed(1)}, far off the chart`, { size: 32, color: C.RED, anchor: 'end' }).at(AX + 560, AY - 290));
    S.beat(`No baseline: sixty-eight. The best baseline: ${sayN(VS, 3)}. The plain mean reward: ${sayN(VJ, 3)}, almost all of the gain. And the mean is easy to estimate, so in practice, baselines estimate the average reward.`,
      par([e6, ...heads, ...trows, res, BS, boxS].map((m) => A.FadeOut(m))), A.FadeIn(ax2), A.Create(cv2, 1.2), A.FadeIn(off2), lag(0.2, pS.map((m) => A.FadeIn(m))), lag(0.2, pJ.map((m) => A.FadeIn(m))),
      { cap: `No baseline: ${VAR.off.toFixed(1)}. The best baseline: ${VS.toFixed(3)}. The plain mean reward: ${VJ.toFixed(3)}, almost all of the gain. And the mean is easy to estimate, so in practice, baselines estimate the average reward.` });
  });

  /*
   * The advantage: reward minus baseline; its sign says push up or down. It
   * was already inside chapter 3's exact gradient.
   */
  video.scene('advantage', 'The advantage', (S) => {
    const h = S.add(S.title('The advantage'));
    const A0 = S.add(S.tex('\\AA(\\aa) \\;=\\; \\rr(\\aa) - \\bb \\;\\approx\\; \\rr(\\aa) - \\JJ', { size: 90 }).at(0, -90));
    const cA = S.add(S.symcard('AA', { w: 1100, why: 'its sign says which way to push: better than expected, up; worse than expected, down' }).at(0, 150));
    S.beat('Reward minus baseline gets a name: the advantage. With the baseline at the average reward, it answers a plain question: was this answer better or worse than expected?',
      A.FadeIn(h), A.Write(A0, 1.6), A.Spot(A0, 'AA'), A.FadeIn(cA, { dy: 16 }));

    // 2. its sign decides the direction: numbers on the bandit
    const est = S.add(S.tex('\\ghat \\;=\\; \\AA(\\aa)\\; \\grad\\lp(\\aa)', { size: 70 }).at(430, -150));
    const BX = -450;
    const BY = 200;
    const { bars, rs } = banditBars(S, BX, BY, R10, { gap: 190 });
    const adv = R10.map((r) => r - J10);
    const K = 230;
    const GRN = S.color('advantage');
    const arrows = adv.map((a, i) => {
      const x = BX + bars.xs[i] + 82;
      const y = BY - bars.h * BAND.pi[i];
      return S.add(S.arrow(x, y, x, y - a * K, { color: GRN, width: 6 }));
    });
    const al = adv.map((a, i) => S.add(S.txt(sgn(a, 2), { size: 34, color: GRN, font: 'mono', anchor: 'start' }).at(BX + bars.xs[i] + 100, BY - bars.h * BAND.pi[i] - a * K + (a > 0 ? 16 : -16))));
    const e2 = S.add(side(S, '{A > 0|advantage}: make the sampled answer more likely. {A < 0|advantage}: less likely, by stepping along minus the {score|grad}', 430, 10, 800));
    const e2b = S.add(side(S, `with the generous judge: A = r − ${J10.toFixed(2)}, the same as 1, 0.3, 0 minus ${BAND.J.toFixed(2)}`, 430, 170, 800));
    S.beat(`Its sign sets the direction: positive pushes the sampled answer up, negative pushes it down. With the generous judge: plus ${sayN(adv[0])} for fifty-one, ${sayN(adv[1])}, and ${sayN(adv[2])}. The offset of ten is gone.`,
      par(A.Unspot(A0), A.FadeOut(cA), A.FadeOut(A0)), A.Write(est, 1.2), A.FadeIn(bars, { dy: 20 }), lag(0.2, rs.map((r) => A.FadeIn(r))), lag(0.4, arrows.map((a, i) => par(A.Arrow(a, 0.6), A.FadeIn(al[i])))), S.writeIn(e2, 1.6), S.writeIn(e2b, 1.4),
      { cap: `Its sign sets the direction: positive pushes the sampled answer up, negative pushes it down. With the generous judge: ${adv.map((a) => sgn(a, 2)).join(', ')}. The offset of 10 is gone.` });

    // 3. it was in the exact gradient all along
    const G = S.add(S.tex('\\frac{\\partial \\JJ}{\\partial \\zz_j} \\;=\\; \\pt(j)\\, \\cAdv{Aj}{\\big(\\rr(j) - \\JJ\\big)} \\;=\\; \\pt(j)\\; \\AA(j)', { size: 84 }).at(0, -60));
    const box = S.add(S.rect(G.w + 90, G.h + 50, { stroke: GRN, width: 4, rx: 12 }).at(0, -60));
    const e3 = S.add(S.english('each {logit|zz} moves by {how often its answer comes up|pt} × {how much better than expected it is|advantage}', { size: 42, width: 1500 }).at(0, 150));
    S.beat('Look back at chapter three’s exact gradient: pi of j, times r of j minus J. That bracket was the advantage all along. Each logit moves by its answer’s probability, times its advantage.',
      par([est, bars, ...rs, ...arrows, ...al, e2, e2b].map((m) => A.FadeOut(m))), A.Write(G, 2), A.Create(box, 0.8), A.Spot(G, ['Aj', 'AA']), S.writeIn(e3, 2),
      { cap: 'Look back at chapter 3’s exact gradient: π(j) (r(j) − J). That bracket was the advantage all along. Each logit moves by its answer’s probability, times its advantage.' });
  });

  /*
   * Training with and without a baseline (five answers, rewards near 5,
   * four samples a step, 20 runs averaged; rl.js trainBandit).
   */
  video.scene('training', 'Training with and without', (S) => {
    const h = S.add(S.title('Training with and without a baseline'));
    const AX = 60;
    const AY = 40;
    const ax = S.add(S.axes({ x0: 0, x1: 80, y0: 0, y1: 1, w: 1180, h: 470, xticks: [0, 20, 40, 60, 80], yticks: [0, 0.5, 1], xlabel: 'training step', ylabel: 'probability of the best answer' }).at(AX, AY));
    const none = ax.polyline(TRAIN.none, { color: C.RED, width: 6 });
    const loo = ax.polyline(TRAIN.loo, { color: C.GREEN, width: 6 });
    const setup = S.add(S.txt('toy: 5 answers, rewards 6, 5.8, 5.6, 5.4, 5.2 · 4 samples a step · step size 0.3 · 20 runs averaged', { size: 30, color: C.GREY_B, italic: true }).at(0, -345));
    const nl = S.add(S.txt('no baseline', { size: 38, color: C.RED }).at(AX + ax.fx(50), AY + ax.fy(TRAIN.none[50][1]) - 48));
    const ll = S.add(S.txt('baseline: mean reward of the other 3 samples', { size: 36, color: C.GREEN }).at(AX + ax.fx(36), AY + ax.fy(TRAIN.loo[36][1]) - 120));
    S.beat('Does it matter in practice? A slightly bigger toy: five answers with rewards near six, four samples a step, twenty runs averaged. Red: no baseline. Green: each sample’s baseline is the mean reward of the other three.',
      A.FadeIn(h), A.FadeIn(setup), A.FadeIn(ax), A.Create(none, 2.4), A.FadeIn(nl), A.Create(loo, 2.4), A.FadeIn(ll));
    const endN = TRAIN.none[80][1];
    const endL = TRAIN.loo[80][1];
    const tN = S.add(S.txt(endN.toFixed(2), { size: 36, color: C.RED, font: 'mono', anchor: 'start' }).at(AX + ax.fx(80) + 16, AY + ax.fy(endN)));
    const tL = S.add(S.txt(endL.toFixed(2), { size: 36, color: C.GREEN, font: 'mono', anchor: 'start' }).at(AX + ax.fx(80) + 16, AY + ax.fy(endL)));
    S.beat(`Without a baseline, every sampled answer is pushed up, scaled by a reward near six; the best only slightly harder. After eighty steps, the best answer is no likelier than at the start. With the baseline: ${sayN(endL)}.`,
      A.FadeIn(tN), A.FadeIn(tL), A.Indicate(tL, { color: C.GREEN, scale: 1.3 }),
      { cap: `Without a baseline, every sampled answer is pushed up, scaled by a reward near 6; the best only slightly harder. After 80 steps, the best answer is no likelier than at the start (${endN.toFixed(2)} vs 0.20). With the baseline: ${endL.toFixed(2)}.` });
  });

  // the 3D landscape (film/landscapes.js, drawn with space3.js)
  if (FILM.landscapes && FILM.landscapes.logits) FILM.landscapes.logits(ctx);

  /*
   * Baselines for language models: a critic V(s); leave-one-out over k
   * samples (and why leaving yourself out keeps it unbiased); the group mean.
   */
  video.scene('baselines', 'Baselines for language models', (S) => {
    const h = S.add(S.title('Baselines for language models'));

    // 1. why the baseline should depend on the prompt
    const p1 = S.add(S.box('What is 2 + 2?', { w: 640, h: 100, color: C.GREY_B, size: 40, sub: 'usually right: expected reward near 1' }).at(-420, -200));
    const p2 = S.add(S.box('Prove this olympiad inequality.', { w: 640, h: 100, color: C.GREY_B, size: 40, sub: 'usually wrong: expected reward near 0' }).at(420, -200));
    const e1 = S.add(S.english('so let the {baseline|bb} depend on the {prompt x|xx}: allowed, because the prompt is fixed before any answer is sampled', { size: 40, width: 1500 }).at(0, 60));
    S.beat('For a language model, which baseline? It depends on the prompt: an easy question is usually answered right, a hard one usually wrong. So let the baseline depend on the prompt. That is allowed: the prompt is fixed before sampling.',
      A.FadeIn(h), A.FadeIn(p1, { dy: 20 }), A.FadeIn(p2, { dy: 20 }), S.writeIn(e1, 2.2));

    // 2. option one: a critic
    const V = S.add(S.tex('\\VV(\\ss) \\;\\approx\\; \\EE\\big[\\RR \\mid \\ss\\big], \\qquad \\text{trained to make } \\big(\\VV(\\ss) - \\RR\\big)^2 \\text{ small}', { size: 62 }).at(0, -150));
    const cV = S.add(S.symcard('VV', { w: 1100, name: 'the value, from a critic', from: 'a second network that reads the state s: the prompt plus the text so far', why: 'a baseline that adapts to every prompt; PPO uses one, at the cost of a second large network' }).at(0, 70));
    const r2 = S.add(S.reason('because: the number v that makes the average of (v − R)² smallest is the average of R itself'));
    S.beat('Option one: a critic. A second network, V, reads the state, the prompt and text so far, and predicts the reward. It is trained on squared error, and the best guess in squared error is the average. P P O uses one.',
      par(A.FadeOut(p1), A.FadeOut(p2), A.FadeOut(e1)), A.Write(V, 2), A.Spot(V, ['VV', 'ss']), A.FadeIn(cV, { dy: 16 }), S.writeIn(r2, 1.6),
      { cap: 'Option one: a critic. A second network, V, reads the state (the prompt and text so far) and predicts the reward. It is trained on squared error, and the best guess in squared error is the average. PPO uses one.' });

    // 3. option two: leave one out
    const LO = S.add(S.tex('\\cBase{bi}{b_i} \\;=\\; \\frac{1}{\\kk - 1} \\sum_{j \\ne i} \\rr_j, \\qquad \\cAdv{Ai}{A_i} \\;=\\; \\rr_i - \\cBase{bi}{b_i}', { size: 72 }).at(0, -230));
    const rw = [1, 0, 1, 1];
    const loo = RL.looAdvantages(rw);
    const bi = rw.map((r, i) => r - loo[i]);
    const CX = [-270, -50, 170, 390];
    const rowL = (t, y) => {
      const m = S.add(S.tex(t, { size: 42 }));
      return m.at(-440 - m.w / 2, y);
    };
    const lR = rowL('\\text{reward } \\rr_i', -50);
    const lB = rowL('\\text{mean of the others } \\cBase{bi}{b_i}', 30);
    const lA = rowL('\\text{advantage } \\cAdv{Ai}{A_i}', 110);
    const cR = rw.map((r, i) => S.add(S.txt(String(r), { size: 42, color: S.color('rr'), font: 'mono' }).at(CX[i], -50)));
    const cB = bi.map((b, i) => S.add(S.txt(b.toFixed(2), { size: 42, color: S.color('bb'), font: 'mono' }).at(CX[i], 30)));
    const cA = loo.map((a, i) => S.add(S.txt(sgn(a, 2), { size: 42, color: S.color('AA'), font: 'mono' }).at(CX[i], 110)));
    const toyL = S.add(S.toy(640, -50));
    const kn = S.add(side(S, 'k = 4 answers to one prompt; 1 = correct, 0 = wrong', 330, 215, 900));
    S.paper('kool2019');
    S.beat('Option two needs no extra network. Sample k answers to the same prompt, and give each one a baseline made of the others: the mean of their rewards. Kool, van Hoof and Welling proposed it in twenty nineteen.',
      par(A.Unspot(V), A.FadeOut(V), A.FadeOut(cV), A.FadeOut(r2)), A.Write(LO, 2), A.FadeIn(toyL), A.FadeIn(lR), lag(0.2, cR.map((m) => A.FadeIn(m))), A.FadeIn(lB), lag(0.2, cB.map((m) => A.FadeIn(m))), A.FadeIn(lA), lag(0.2, cA.map((m) => A.FadeIn(m))), S.writeIn(kn, 1.2),
      { cap: 'Option two needs no extra network. Sample k answers to the same prompt, and give each one a baseline made of the others: the mean of their rewards. Kool, van Hoof and Welling proposed it in 2019.' });

    // 4. why leaving yourself out keeps it unbiased
    const U = S.add(S.tex('\\EE\\big[\\cBase{bi}{b_i}\\; \\grad\\lp(\\yy_i)\\big] \\;=\\; \\EE\\big[\\cBase{bi}{b_i}\\big]\\cdot \\EE\\big[\\grad\\lp(\\yy_i)\\big] \\;=\\; \\EE\\big[\\cBase{bi}{b_i}\\big]\\cdot 0 \\;=\\; 0', { size: 60 }).at(0, -40));
    const r4 = S.add(S.reason('because: the k answers are sampled independently, and {b_i|bb} uses only the others; the average of a product of independent things is the product of their averages'));
    S.beat('Why leave yourself out? The k answers are drawn independently, and b i uses only the others. So b i does not depend on answer i, and the zero-average proof goes through, as for a fixed number.',
      par([lR, lB, lA, ...cR, ...cB, ...cA, toyL, kn].map((m) => A.FadeOut(m))), A.Write(U, 2.4), S.writeIn(r4, 2),
      { cap: 'Why leave yourself out? The k answers are drawn independently, and b_i uses only the others. So b_i does not depend on answer i, and the zero-average proof goes through, as for a fixed number.' });

    // 5. the group mean, yourself included: a preview of GRPO
    const GM = S.add(S.tex('\\rr_i - \\rbar \\;=\\; \\frac{\\kk - 1}{\\kk}\\, \\big(\\rr_i - \\cBase{bi}{b_i}\\big), \\qquad \\rbar = \\frac{1}{\\kk}\\sum_{j} \\rr_j', { size: 66 }).at(0, -40));
    const gm = RL.groupAdvantages(rw, { std: false });
    const r5 = S.add(S.reason('because: the group mean is (r_i + (k − 1) b_i) / k; subtract it from r_i and collect terms'));
    const n5 = S.add(S.english(`with k = 4: ${gm.map((v) => sgn(v, 2)).join(', ')} = 3/4 × (${loo.map((v) => sgn(v, 2)).join(', ')})`, { size: 36, color: C.GREY_B }).at(0, 140));
    S.beat('And the plain group mean, yourself included? r i minus the group mean is exactly k minus one over k times the leave-one-out advantage: the same direction, shrunk by a fixed factor the step size absorbs. G R P O builds on it.',
      par(A.FadeOut(U), A.FadeOut(r4)), A.Write(GM, 2.2), S.writeIn(n5, 1.6), S.writeIn(r5, 1.6),
      { cap: 'And the plain group mean, yourself included? r_i minus the group mean is exactly (k − 1)/k times the leave-one-out advantage: the same direction, shrunk by a fixed factor the step size absorbs. GRPO (chapter 10) builds on it.' });

    // 6. RLOO in practice
    const cards = [
      ['a critic', 'V(s): a second network', 'PPO'],
      ['leave one out', 'mean of the other answers', 'RLOO'],
      ['the group mean', 'mean of all the answers', 'GRPO'],
    ].map(([a, b, c], i) => S.add(S.group(
      rect(500, 250, { stroke: S.color('baseline'), width: 3, fill: mix(C.BG, S.color('baseline'), 0.1), rx: 14 }),
      new Text(a, { size: 46, color: S.color('baseline') }).at(0, -70),
      new Text(b, { size: 32 }).at(0, 0),
      new Text(c, { size: 40, font: 'mono', color: C.GREY_B }).at(0, 70)
    ).at(-560 + i * 560, 40)));
    const e7 = S.add(S.english('all three answer one question: what {reward|rr} did we {expect|bb} for this {prompt|xx}?', { size: 40 }).at(0, 225));
    const e7b = S.add(S.english('next: one reward for a whole response; which {tokens|yy} earned it?', { size: 34, color: C.GREY_B, width: 900 }).at(0, 292));
    S.paper('ahmadian2024');
    S.beat('Leave-one-out, called R L O O, is simple and cheap; in twenty twenty-four, Ahmadian and colleagues found it beat P P O in their experiments. All three baselines answer one question: what reward did we expect for this prompt? Next: which tokens earned it?',
      par(A.FadeOut(GM), A.FadeOut(r5), A.FadeOut(n5)), lag(0.5, cards.map((c) => A.FadeIn(c, { dy: 24 }))), A.Indicate(cards[1], { color: C.TEAL, scale: 1.05 }), S.writeIn(e7, 2), S.writeIn(e7b, 1.4),
      { cap: 'Leave-one-out, called RLOO, is simple and cheap; in 2024, Ahmadian and colleagues found it beat PPO in their experiments on learning from human feedback. All three baselines answer one question: what reward did we expect for this prompt? Next: which tokens earned it?' });
  });
});
