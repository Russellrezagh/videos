// Chapter 11 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch11(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = (n) => {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
    return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`;
  };
  const sayN = (x, d = 2) => {
    const [a, b0] = Math.abs(x).toFixed(d).split('.');
    const b = b0 && b0.replace(/0+$/, '');
    return `${x < 0 ? 'minus ' : ''}${words(+a)}${b ? ` point ${b.split('').map((c) => ONES[+c]).join(' ')}` : ''}`;
  };
  const pct = (p) => `${Math.round(100 * p)}%`;
  const sayPct = (p) => `${words(Math.round(100 * p))} percent`;
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  const TOP = (m, y = -340, s = 0.6) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, s), A.Set(m, { o: 1 }));
  const side = (S, str, x, y, w = 760, size = 34) => S.english(str, { size, color: C.GREY_B, italic: true, width: w }).at(x, y);
  const fade = (ms, dur = 0.6) => par(ms.filter(Boolean).map((m) => A.FadeOut(m, { dur })));
  const boxOf = (S, m, color, y = m.init.y) => S.add(S.rect(m.w + 80, m.h + 50, { stroke: color, width: 4, rx: 12 }).at(0, y));

  /* ---------------------------------------------------------- symbols of this chapter */
  FILM.addSymbol('c11p', 'policy', 'p', 'the solve rate', 'the chance that one sampled answer to this problem is correct', 'every try is a fresh draw from the policy, right with the same chance');
  FILM.addSymbol('c11n', 'knob', 'n', 'the samples drawn', 'how many answers we sample for one problem, to measure it', 'p is unknown: we estimate from a finite sample');
  FILM.addSymbol('c11c', 'data', 'c', 'the correct ones', 'how many of the n samples the checker accepts', 'it is all the estimate gets to see');
  FILM.addSymbol('c11w', 'data', 'w', 'the weight', 'each method’s own recipe: a reward, an advantage, a sigmoid', 'how hard, and which way, to push this response: up if positive, down if negative');
  const PP = '\\cPolicy{c11p}{p}';
  const NN = '\\cKnob{c11n}{n}';
  const CC = '\\cData{c11c}{c}';
  const WW = '\\cData{c11w}{w}';
  const PASSK = '\\text{pass@}\\kk';

  /* ---------------------------------------------------------- the numbers (kernel: src/js/rl.js) */
  const P0 = 0.2;
  const pk = (p, k) => RL.passAtKExact(p, k);
  // the unbiased estimator, and the plug-in, averaged over every possible draw of n samples
  const N = 10;
  const Cn = 2;
  const K = 4;
  const est = RL.passAtK(N, Cn, K);
  const avgOver = (f) => {
    let s = 0;
    for (let c = 0; c <= N; c++) s += RL.binom(N, c) * P0 ** c * (1 - P0) ** (N - c) * f(c);
    return s;
  };
  const avgEst = avgOver((c) => RL.passAtK(N, c, K));
  const avgPlug = avgOver((c) => 1 - (1 - c / N) ** K);
  // the toy base and RL models of setup.js (PASS): per-problem solve rates
  const at = (curve, k) => curve.find(([kk]) => kk === k)[1];
  const MID = { base: 0.5, rl: 0.85 }; // a problem the base model solves half the time
  const RARE = { base: 0.01, rl: 0 }; // a problem it solves once in a hundred tries

  /* =========================================================== CHAPTER 11 */
  video.chapter('ch11', 'What RL changes');
  card(11, 'What reinforcement learning changes');

  /*
   * pass@k from first principles: one problem, independent tries, the
   * complement of "all wrong". The unbiased estimator from n samples with
   * c correct, by counting subsets. Then the toy curves: RL raises pass@1
   * and can lower pass@k at large k (sharpening).
   */
  video.scene('passk', 'Sharpening', (S) => {
    const h = S.add(S.title('What did RL change?'));

    // 1. why: new abilities, or more reliable old ones?
    const q = S.add(S.english('after RL the scores go up. Did the model learn to solve {new problems|rr}, or to solve {old ones more reliably|pt}?', { size: 44, width: 1500 }).at(0, -230));
    const prob = S.add(S.box('one hard problem', { w: 420, h: 100, color: C.GREY_B, size: 38 }).at(-560, 60));
    const tries = [0, 1, 2, 3].map((i) => S.add(S.box(`try ${i + 1}`, { w: 190, h: 90, color: C.GREY, size: 34 }).at(-150 + i * 230, 60)));
    const marks = [S.cross(40), S.cross(40), S.check(44), S.cross(40)].map((m, i) => S.add(m.at(-150 + i * 230, 150)));
    const D = S.add(S.tex(`${PASSK} \\;=\\; \\Pr\\big(\\text{at least one of } \\kk \\text{ tries is right}\\big)`, { size: 66 }).at(0, 270));
    S.beat('R L raises the scores. But did the model learn to solve new problems, or to solve old ones more reliably? To tell these apart, give it k tries. Pass at k is the chance that at least one try is right.',
      A.FadeIn(h), S.writeIn(q, 2.2), A.FadeIn(prob, { dx: -20 }), lag(0.3, tries.map((t) => A.FadeIn(t, { dy: 12 }))), lag(0.3, marks.map((m) => A.Create(m, 0.4))), A.Indicate(tries[2], { color: C.GREEN, scale: 1.08 }), A.Write(D, 1.8),
      { cap: 'RL raises the scores. But did the model learn to solve new problems, or to solve old ones more reliably? To tell these apart, give it k tries. pass@k is the chance that at least one try is right.' });

    // 3. derive: all wrong, then the complement
    const F1 = S.add(S.tex(`\\Pr(\\text{all } \\kk \\text{ tries wrong}) \\;=\\; \\underbrace{(1 - ${PP})(1 - ${PP}) \\cdots (1 - ${PP})}_{\\kk \\text{ times}} \\;=\\; (1 - ${PP})^{\\kk}`, { size: 66 }).at(0, -230));
    const F2 = S.add(S.tex(`${PASSK} \\;=\\; 1 - (1 - ${PP})^{\\kk}`, { size: 92 }).at(0, 0));
    const box2 = boxOf(S, F2, S.color('kk'));
    const r3 = S.add(S.reason('because: tries are independent samples, so their chances multiply; and “at least one right” is the opposite of “all wrong”'));
    S.beat('Say one try is right with chance p, so wrong with one minus p. Tries are independent, so all k are wrong with chance one minus p, multiplied k times. At least one right is the opposite: one, minus that.',
      fade([q, prob, ...tries, ...marks, D]), A.Write(F1, 2.4), A.Write(F2, 1.6), A.Create(box2, 0.8), S.writeIn(r3, 1.8),
      { cap: 'Say one try is right with chance p, so wrong with 1 − p. Tries are independent, so all k are wrong with chance (1 − p), multiplied k times: (1 − p)^k. At least one right is the opposite: 1 minus that.' });
    S.tour(F2, [
      { sym: 'c11p', at: [0, 230], anims: [A.FadeOut(r3)],
        say: 'p is the solve rate: the chance that one sampled answer to this problem is right. It belongs to the policy, problem by problem. And k is the number of tries we allow.' },
    ]);

    // 4. numbers: more tries help, unless p = 0
    const AX = -330;
    const AY = 90;
    const ax = S.add(S.axes({ x0: 1, x1: 64, y0: 0, y1: 1, w: 820, h: 360, logx: true, xticks: [1, 4, 16, 64], yticks: [0, 0.5, 1], xlabel: 'tries k', ylabel: 'pass@k' }).at(AX, AY));
    const c02 = ax.plot((k) => pk(P0, k), { color: S.color('c11p'), width: 6, from: 1, to: 64 });
    const c00 = ax.plot(() => 0, { color: C.RED, width: 6, from: 1, to: 64 });
    const kpts = [1, 4, 16].map((k) => S.add(S.dot(12, C.WHITE).at(AX + ax.fx(k), AY + ax.fy(pk(P0, k)))));
    const nums = [1, 4, 16, 64].map((k, i) => S.add(S.tex(`\\kk = ${k}: \\;\\; ${(pk(P0, k)).toFixed(2)}`, { size: 44 }).at(560, -150 + i * 70)));
    const pl = S.add(S.tex(`${PP} = ${P0}`, { size: 44 }).at(560, -230));
    const zl = S.add(S.english(`{p = 0|c11p}: zero, for every {k|kk}`, { size: 38, color: C.RED }).at(560, 160));
    S.beat(`With p at zero point two: one try solves it a fifth of the time, four tries ${sayPct(pk(P0, 4))}, and sixteen tries ${sayPct(pk(P0, 16))}. More tries always help, unless p is zero: then pass at k is zero.`,
      S.endTour(F2), fade([F1, box2]), TOP(F2, -350, 0.62), A.FadeIn(ax), A.Create(c02, 1.4), lag(0.4, kpts.map((m) => A.FadeIn(m, { from: 1.6 }))), A.FadeIn(pl), lag(0.3, nums.map((m) => A.FadeIn(m, { dx: 16 }))), A.Create(c00, 0.8), S.writeIn(zl, 1.2),
      { cap: `With p = 0.2: one try solves it a fifth of the time, four tries ${pct(pk(P0, 4))}, and sixteen tries ${pct(pk(P0, 16))}. More tries always help, unless p is zero: then pass@k is zero.` });

    // 5. we do not know p: n samples, c correct
    const DX = -585;
    // a tick or a cross inside a ring (raw shapes, so they show with their group)
    const tick = (sz, col) => path(`M ${-sz * 0.5} 0 L ${-sz * 0.12} ${sz * 0.38} L ${sz * 0.55} ${-sz * 0.45}`, { stroke: col, width: 6 });
    const xmark = (sz, col) => path(`M ${-sz / 2} ${-sz / 2} L ${sz / 2} ${sz / 2} M ${sz / 2} ${-sz / 2} L ${-sz / 2} ${sz / 2}`, { stroke: col, width: 5 });
    const dots = Array.from({ length: N }, (_, i) => {
      const ok = i === 2 || i === 6;
      return S.add(S.group(circle(44, { stroke: ok ? C.GREEN : C.GREY, width: 4, fill: mix(C.BG, ok ? C.GREEN : C.GREY, 0.15) }), ok ? tick(36, C.GREEN) : xmark(28, C.GREY_B)).at(DX + i * 130, -170));
    });
    const nc = S.add(S.english(`{n = ${N}|c11n} answers sampled, {c = ${Cn}|c11c} of them correct. What is {pass@4|kk}?`, { size: 42 }).at(0, -40));
    S.beat(`But we do not know p. So we sample n answers, here ten, and the checker accepts c of them, here two. How do we turn that into pass at k?`,
      fade([F2, ax, c02, c00, ...kpts, ...nums, pl, zl]), lag(0.1, dots.map((d) => A.FadeIn(d, { dy: 12 }))), S.writeIn(nc, 1.8),
      { cap: `But we do not know p. So we sample n answers, here ${N}, and the checker accepts c of them, here ${Cn}. How do we turn that into pass@k?` });

    // 6. count subsets
    const pickIdx = [0, 3, 4, 8];
    const rings = pickIdx.map((i) => S.add(S.circle(60, { stroke: S.color('kk'), width: 5 }).at(DX + i * 130, -170)));
    const F3 = S.add(S.tex(`\\Pr\\big(\\text{no correct one among } \\kk \\text{ picked}\\big) \\;=\\; \\dfrac{\\dbinom{${NN} - ${CC}}{\\kk}}{\\dbinom{${NN}}{\\kk}}`, { size: 60 }).at(0, 80));
    const r6 = S.add(S.reason('because: every set of k of the n answers is equally likely to be picked; count the sets that miss every correct one'));
    S.beat('Imagine picking k of the n answers at random. All n choose k picks are equally likely. The picks that miss every correct answer take all k from the n minus c wrong ones: n minus c choose k.',
      A.FadeOut(nc), lag(0.2, rings.map((r) => A.FadeIn(r, { from: 1.3, dur: 0.5 }))), A.Write(F3, 2.4), S.writeIn(r6, 1.8),
      { cap: 'Imagine picking k of the n answers at random. All (n choose k) picks are equally likely. The picks that miss every correct answer take all k from the n − c wrong ones: (n − c choose k).' });

    // 7. the estimator, with numbers
    const F4 = S.add(S.tex(`\\widehat{${PASSK}} \\;=\\; 1 - \\dfrac{\\dbinom{${NN} - ${CC}}{\\kk}}{\\dbinom{${NN}}{\\kk}} \\;=\\; 1 - \\dfrac{\\dbinom{${N - Cn}}{${K}}}{\\dbinom{${N}}{${K}}} \\;=\\; 1 - \\frac{${RL.binom(N - Cn, K)}}{${RL.binom(N, K)}} \\;\\approx\\; ${est.toFixed(2)}`, { size: 56 }).at(0, 75));
    const box4 = boxOf(S, F4, S.color('kk'));
    S.paper('chen2021');
    const ub = S.add(S.english(`unbiased: if {p = ${P0}|c11p}, the truth is ${pk(P0, K).toFixed(2)}; this estimate averages ${avgEst.toFixed(2)}, plugging in {c / n|c11c} averages ${avgPlug.toFixed(2)}`, { size: 34, color: C.GREY_B, italic: true, width: 1700 }).at(0, 280));
    S.beat(`So the estimate is one minus that ratio: one minus seventy over two hundred and ten, about ${sayN(est)}. Chen and colleagues use it because it is right on average. Plugging in c over n comes out too low.`,
      fade([r6, F3]), A.Write(F4, 2.4), A.Create(box4, 0.8), S.writeIn(ub, 1.8),
      { cap: `So the estimate is one minus that ratio: 1 − 70/210, about ${est.toFixed(2)}. Chen and colleagues use it because it is right on average. Plugging in c/n comes out too low.` });

    // 9. the toy curves: RL raises pass@1, the base model wins at large k
    const AX2 = 40;
    const AY2 = 60;
    const ax2 = S.add(S.axes({ x0: 1, x1: 256, y0: 0, y1: 1, w: 1100, h: 400, logx: true, xticks: [1, 4, 16, 64, 256], yticks: [0, 0.5, 1], xlabel: 'tries k', ylabel: 'pass@k, averaged over 10 problems' }).at(AX2, AY2));
    const cb = ax2.polyline(PASS.base, { color: S.color('pref'), width: 6 });
    const cr = ax2.polyline(PASS.rl, { color: S.color('pt'), width: 6 });
    const lb = S.add(S.txt('base model', { size: 36, color: S.color('pref') }).at(AX2 + ax2.fx(64), AY2 + ax2.fy(at(PASS.base, 64)) - 45));
    const lr = S.add(S.txt('after RL', { size: 36, color: S.color('pt') }).at(AX2 + ax2.fx(64), AY2 + ax2.fy(at(PASS.rl, 64)) + 45));
    const toy = S.add(S.toy(760, -390));
    const n1 = S.add(S.txt(`k = 1:  ${at(PASS.base, 1).toFixed(2)} → ${at(PASS.rl, 1).toFixed(2)}`, { size: 34, color: C.GREY_B, font: 'mono', anchor: 'start' }).at(-760, -330));
    const n2 = S.add(S.txt(`k = 256:  ${at(PASS.base, 256).toFixed(2)} → ${at(PASS.rl, 256).toFixed(2)}`, { size: 34, color: C.GREY_B, font: 'mono', anchor: 'start' }).at(-760, -280));
    // the first k (of PASS.ks) from which the base model is ahead
    const KX = PASS.ks.find((k) => at(PASS.base, k) >= at(PASS.rl, k));
    if (KX !== 8) throw new Error(`ch11: the toy curves should cross at k = 8, not ${KX}`);
    S.beat(`Now two toy models, over ten problems. R L raises pass at one, from ${sayN(at(PASS.base, 1))} to ${sayN(at(PASS.rl, 1))}. But the base model’s curve keeps climbing: from ${words(KX)} tries on, it is ahead.`,
      fade([...dots, ...rings, F4, box4, ub]), A.FadeIn(toy), A.FadeIn(ax2), A.Create(cb, 1.6), A.FadeIn(lb), A.Create(cr, 1.6), A.FadeIn(lr), A.FadeIn(n1), A.FadeIn(n2),
      { cap: `Now two toy models, over ten problems. RL raises pass@1, from ${at(PASS.base, 1).toFixed(2)} to ${at(PASS.rl, 1).toFixed(2)}. But the base model’s curve keeps climbing: from ${KX} tries on, it is ahead.` });
    S.paper('yue2025');
    S.beat('Yue and colleagues report the same pattern in real models: with enough tries, base models often solve as many problems as their R L versions, or more. To see why, look inside the toy.',
      A.Indicate(n2, { color: C.YELLOW, scale: 1.08 }), A.Indicate(lb, { color: S.color('pref'), scale: 1.15 }),
      { cap: 'Yue and colleagues report the same pattern in real models: with enough tries, base models often solve as many problems as their RL versions, or more. To see why, look inside the toy.' });

    // 10. inside the toy: sharpening
    const toy2 = S.add(S.toy(760, -390));
    const COL = [-560, -150, 230, 610];
    const HY = -230;
    const heads = ['', `${PP}`, `\\text{pass@}1`, `\\text{pass@}256`].map((t, i) => S.add(S.tex(t || '\\,', { size: 46 }).at(COL[i], HY)));
    const rowOf = (label, p0, p1, y) => S.add(S.group(
      new Text(label, { size: 36, color: C.GREY_B, italic: true }).at(COL[0], 0),
      new Text(`${p0} → ${p1}`, { size: 40, font: 'mono', color: S.color('c11p') }).at(COL[1], 0),
      new Text(`${pk(p0, 1).toFixed(2)} → ${pk(p1, 1).toFixed(2)}`, { size: 40, font: 'mono' }).at(COL[2], 0),
      new Text(`${pk(p0, 256).toFixed(2)} → ${pk(p1, 256).toFixed(2)}`, { size: 40, font: 'mono' }).at(COL[3], 0)
    ).at(0, y));
    const row1 = rowOf('solved half the time', MID.base, MID.rl, -130);
    const row2 = rowOf('solved 1 time in 100', RARE.base, RARE.rl, -30);
    const e10 = S.add(S.english('sharpening: {probability|pt} moves onto answers the model already finds, and away from rare ones', { size: 40, width: 1500 }).at(0, 110));
    if (pk(MID.base, 256).toFixed(2) !== '1.00' || pk(MID.rl, 256).toFixed(2) !== '1.00') throw new Error('ch11: both models should solve the half-the-time problem at k = 256');
    S.beat(`Inside the toy, take two problems. One the base model solves half the time: R L raises p to ${sayN(MID.rl)}, a far better pass at one. With two hundred fifty-six tries, both models solve it anyway.`,
      fade([toy, ax2, cb, cr, lb, lr, n1, n2]), A.FadeIn(toy2), lag(0.1, heads.map((m) => A.FadeIn(m))), A.FadeIn(row1, { dx: 20 }),
      { cap: `Inside the toy, take two problems. One the base model solves half the time: RL raises p to ${MID.rl}, a far better pass@1. With 256 tries, both models solve it anyway.` });
    S.beat(`The other it solves once in a hundred tries. After R L, p is zero. With two hundred fifty-six tries, the base model solves it ${sayPct(pk(RARE.base, 256))} of the time; the R L model, never. That is sharpening.`,
      A.FadeIn(row2, { dx: 20 }), A.Indicate(row2, { color: C.RED, scale: 1.03 }), S.writeIn(e10, 2),
      { cap: `The other it solves once in a hundred tries. After RL, p is zero. With 256 tries, the base model solves it ${pct(pk(RARE.base, 256))} of the time; the RL model, never. That is sharpening.` });

    // 11. why: the policy gradient only sees what the policy samples
    const PG = S.add(S.tex('\\grad\\, \\JJ(\\th) \\;=\\; \\EE_{\\cData{c11s}{\\yy \\sim \\pt}}\\Big[\\, \\RR(\\xx, \\yy)\\; \\grad \\lp(\\yy \\mid \\xx) \\,\\Big]', { size: 76 }).at(0, -40));
    const e11 = S.add(S.english('a correct answer the {policy|pt} never samples never enters the average, so it is never {pushed up|grad}', { size: 40, width: 1500 }).at(0, 130));
    const e11b = S.add(S.english('RL sharpens what the model can already, sometimes, do', { size: 36, color: C.GREY_B, italic: true }).at(0, 230));
    S.beat('The policy gradient says why: it averages over answers the policy itself samples. A correct answer it never writes never enters the average, so it is never pushed up. R L sharpens what the model can already, sometimes, do.',
      fade([toy2, ...heads, row1, row2, e10]), A.Write(PG, 2), A.Spot(PG, 'c11s'), S.writeIn(e11, 2), S.writeIn(e11b, 1.4),
      { cap: 'The policy gradient says why: it averages over answers the policy itself samples. A correct answer it never writes never enters the average, so it is never pushed up. RL sharpens what the model can already, sometimes, do.' });
  });

  /*
   * Every update in the film is E[ w * grad log pi ]: the methods differ in
   * the weight w and in where the responses come from. A colour-coded table.
   */
  video.scene('unify', 'One equation', (S) => {
    const h = S.add(S.title('Every method, one shape'));

    // 1. the shape
    const GF = S.add(S.tex(`\\ghat \\;=\\; \\EE\\Big[\\, ${WW}(\\xx, \\yy)\\;\\; \\grad \\lp(\\yy \\mid \\xx) \\,\\Big]`, { size: 96 }).at(0, -60));
    S.beat('Step back, and look at every method in this film at once. Each update has one shape: an average, over some responses, of a weight, times the direction that makes that response more likely.',
      A.FadeIn(h), A.Write(GF, 2.4));
    S.tour(GF, [
      { sym: 'c11w', at: [0, 200],
        say: 'w is the weight: how hard, and which way, to push one response. Positive pulls it up, negative pushes it down, zero leaves it alone. Each method is a recipe for w.' },
    ]);
    const e1 = S.add(S.english('every update = the average, over some {responses|yy}, of {a weight|c11w} × {the direction that makes that response more likely|grad}', { size: 40, width: 1500 }).at(0, 170));
    S.beat('The direction is the same in every method: chapter three’s gradient of log pi. So a method is two choices: which responses to average over, and what weight to give each one.',
      S.endTour(GF), A.Spot(GF, ['grad', 'lp']), S.writeIn(e1, 2.2), A.Unspot(GF),
      { cap: 'The direction is the same in every method: chapter 3’s gradient of log π_θ. So a method is two choices: which responses to average over, and what weight to give each one.' });

    // 2. the table
    const XM = -860;
    const XW = -60;
    const XS = 630;
    const HY = -255;
    const heads = [
      S.add(S.txt('method', { size: 34, color: C.GREY_B, anchor: 'start' }).at(XM, HY)),
      S.add(S.tex(`\\text{weight } ${WW}`, { size: 42 }).at(XW, HY)),
      S.add(S.txt('responses from', { size: 34, color: C.GREY_B }).at(XS, HY)),
    ];
    const rule = S.add(S.line(-880, HY + 38, 880, HY + 38, { stroke: C.GREY, width: 3 }));
    const RH = '\\cReward{c11rh}{\\hat r_{\\th}}';
    const rowsData = [
      ['SFT', '1', '\\text{demonstrations}'],
      ['REINFORCE', '\\RR(\\xx, \\yy)', '\\yy \\sim \\pt'],
      ['+ baseline', '\\RR(\\xx, \\yy) - \\bb', '\\yy \\sim \\pt'],
      ['actor-critic, GAE', '\\Ahat_t \\quad \\text{(each token)}', '\\yy \\sim \\pt'],
      ['PPO', '\\rat_t\\, \\Ahat_t \\cdot \\mathbf{1}[\\text{not clipped}]', '\\yy \\sim \\pold'],
      ['GRPO', '\\rat_{i,t}\\; \\frac{\\rr_i - \\rbar}{\\operatorname{std}(\\rr)} \\cdot \\mathbf{1}[\\text{not clipped}]', '\\GN \\text{ answers} \\sim \\pold'],
      ['DPO', `\\pm\\, \\bt\\; \\sig\\big(${RH}(\\yl) - ${RH}(\\yw)\\big)`, '(\\yw, \\yl) \\text{ fixed pairs}'],
    ];
    const RY = [-178, -104, -30, 44, 118, 204, 290];
    const rows = rowsData.map(([n, w, s], i) => S.add(S.group(
      new Text(n, { size: 38, anchor: 'start' }).at(XM, 0),
      new Tex(w, { size: 44 }).at(XW, 0),
      new Tex(s, { size: 42 }).at(XS, 0)
    ).at(0, RY[i])));
    S.beat('Supervised fine-tuning: weight one, on demonstrations people wrote. REINFORCE: the reward of a response the policy sampled. With a baseline: the reward minus what we expected, which cuts the noise without changing the average.',
      fade([e1]), TOP(GF, -370, 0.55), lag(0.15, heads.map((m) => A.FadeIn(m))), A.Create(rule, 0.5), lag(1.6, rows.slice(0, 3).map((r) => A.FadeIn(r, { dx: -24 }))));
    S.beat('Actor-critic and G A E: an estimated advantage, token by token. P P O: the same advantage, times the ratio rho, because its samples come from the old policy; and zero wherever the clip is active.',
      lag(2.4, rows.slice(3, 5).map((r) => A.FadeIn(r, { dx: -24 }))),
      { cap: 'Actor-critic and GAE: an estimated advantage, token by token. PPO: the same advantage, times the ratio ρ, because its samples come from the old policy; and zero wherever the clip is active.' });
    // the GRPO row shows the weight on one token's push; its averaging and its leash are left out
    const foot = S.add(S.english('(GRPO also averages over each answer’s tokens and the group, and adds its {leash|bt}: left out here)', { size: 30, color: C.GREY_B, italic: true, width: 1700 }).at(0, 350));
    S.beat('G R P O: P P O’s weight, with the group-normalised reward as the advantage. D P O: beta, times the sigmoid of how wrong the implicit reward is; plus for the winner, minus for the loser.',
      lag(2.6, rows.slice(5).map((r) => A.FadeIn(r, { dx: -24 }))), A.FadeIn(foot),
      { cap: 'GRPO: PPO’s weight, with the group-normalised reward as the advantage. DPO: β times the sigmoid of how wrong the implicit reward is; plus for the winner, minus for the loser.' });

    // 3. the last column
    const colBox = S.add(S.rect(470, 630, { stroke: C.WHITE, width: 4, rx: 14 }).at(XS, 47));
    S.beat('Now read the last column. Most methods average over responses the policy writes itself: they learn from their own successes and mistakes. S F T and D P O average over responses written in advance.',
      A.FadeOut(foot), A.Create(colBox, 1), par(rows.map((r, i) => (i === 0 || i === 6 ? A.Indicate(r, { color: C.YELLOW, scale: 1.03 }) : wait(0)))),
      { cap: 'Now read the last column. Most methods average over responses the policy writes itself: they learn from their own successes and mistakes. SFT and DPO average over responses written in advance.' });

    // 4. the art is in the weight
    S.beat('So a method comes down to two choices: whose responses to average over, and what weight to give each. A good weight is low in noise, right on average, and hard to game, and keeps the policy close to what it knows.',
      A.FadeOut(colBox), A.Spot(GF, 'c11w'), lag(0.12, rows.map((r) => A.Indicate(r, { color: C.YELLOW, scale: 1.03, dur: 0.6 }))));
  });

  /*
   * The film's key formulas, two at a time, each in its colours with one
   * plain sentence; ending on the policy gradient.
   */
  video.scene('recap', 'Recap', (S) => {
    const h = S.add(S.title('The whole path'));
    const item = (chap, tex, eng, y, size = 62) => {
      const f = S.add(S.tex(tex, { size }).at(0, y));
      const tag = S.add(S.txt(chap, { size: 30, color: C.GREY, italic: true }).at(0, y - f.h / 2 - 30));
      const e = S.add(S.english(eng, { size: 36, width: 1600 }));
      e.at(0, y + f.h / 2 + 16 + e.h / 2);
      return { all: [tag, f, e], show: seq(A.FadeIn(tag, { dur: 0.4 }), A.Write(f, 1.6), S.writeIn(e, 1.6)) };
    };
    const YA = -250;
    const YB = 70;
    const steps = [
      [item('chapters 1 and 3', '\\pt(\\aa) \\;=\\; \\frac{e^{\\zz_\\aa}}{\\sum_{c} e^{\\zz_c}}', 'a model turns {scores|zz} into {probabilities|pt}, and we sample from them', YA),
        item('chapter 3', '\\ghat \\;=\\; \\RR(\\xx, \\yy)\\; \\grad \\lp(\\yy \\mid \\xx), \\qquad \\yy \\sim \\pt', 'sample a {response|yy}, score it, and push it up in proportion to its {reward|RR}', YB)],
      [item('chapters 4 and 5', '\\AA \\;=\\; \\RR - \\bb, \\qquad \\Ahat_t \\;=\\; \\dd_t + \\gam\\lam\\, \\Ahat_{t+1}', 'push by how much {better than expected|AA}; a {critic|VV} spreads the credit over tokens', YA),
        item('chapter 6', '\\min\\big(\\rat_t \\Ahat_t,\\; \\operatorname{clip}(\\rat_t,\\, 1 - \\eps,\\, 1 + \\eps)\\, \\Ahat_t\\big)', 'reuse old samples through the ratio {ρ|rat}; stop pushing once {ρ|rat} passes 1 ± {ε|eps} the way the advantage wants', YB)],
      [item('chapter 7', 'P(\\yw \\succ \\yl) \\;=\\; \\sig\\big(\\rr(\\yw) - \\rr(\\yl)\\big)', 'preferences become {rewards|rr}: only the gap counts', YA),
        item('chapter 8', '\\pstar(\\yy) \\;=\\; \\frac{\\pref(\\yy)\\, e^{\\rr(\\yy)/\\bt}}{\\ZZ}', 'the best leashed policy is {the reference|pref}, tilted toward {reward|rr}', YB)],
      [item('chapter 9', '\\mathcal{L}_{\\mathrm{DPO}} \\;=\\; -\\,\\EE\\Big[\\log \\sig\\Big(\\bt \\log \\frac{\\pt(\\yw)}{\\pref(\\yw)} - \\bt \\log \\frac{\\pt(\\yl)}{\\pref(\\yl)}\\Big)\\Big]', 'the {policy|pt} is its own reward model: fit it straight to the comparisons', YA, 56),
        item('chapter 10', '\\Ahat_i \\;=\\; \\frac{\\rr_i - \\rbar}{\\operatorname{std}(\\rr)}', 'with rewards a program checks, the {group’s average|rbar} is the baseline: no critic', YB)],
    ];
    const says = [
      ['Let us walk back along the path. A language model turns scores into probabilities, and we sample from them. The log-derivative trick turns a sampled reward into a gradient: score a response, and push it up in proportion to its reward.',
        'Let us walk back along the path. A language model turns scores into probabilities, and we sample from them. The log-derivative trick turns a sampled reward into a gradient: score a response, and push it up in proportion to its reward.'],
      ['Subtract what we expected, and push by the advantage instead: the same average, far less noise. A critic spreads the credit over tokens. P P O reuses old samples through the ratio rho, but stops pushing once rho has moved too far the way the advantage wants.',
        'Subtract what we expected, and push by the advantage instead: the same average, far less noise. A critic spreads the credit over tokens. PPO reuses old samples through the ratio ρ, but stops pushing once ρ has moved too far the way the advantage wants.'],
      ['People’s preferences become rewards through Bradley-Terry, where only the gap counts. A K L leash keeps the policy near the reference, and the best leashed policy is exactly the reference, tilted toward reward.',
        'People’s preferences become rewards through Bradley–Terry, where only the gap counts. A KL leash keeps the policy near the reference, and the best leashed policy is exactly the reference, tilted toward reward.'],
      ['Read that backwards, and the policy is its own reward model: D P O fits it straight to the comparisons. With rewards a program can check, G R P O uses the group’s own average as the baseline, and needs no critic.',
        'Read that backwards, and the policy is its own reward model: DPO fits it straight to the comparisons. With rewards a program can check, GRPO uses the group’s own average as the baseline, and needs no critic.'],
    ];
    steps.forEach(([a, b], i) => {
      const prev = i > 0 ? fade([...steps[i - 1][0].all, ...steps[i - 1][1].all]) : A.FadeIn(h);
      S.beat(says[i][0], prev, a.show, b.show, { cap: says[i][1] });
    });

    // the line it all rests on
    const fin = S.add(S.tex('\\grad\\, \\JJ(\\th) \\;=\\; \\EE_{\\yy \\sim \\pt}\\Big[\\, \\RR(\\xx, \\yy)\\; \\grad \\lp(\\yy \\mid \\xx) \\,\\Big]', { size: 88 }).at(0, -90));
    const read = S.add(S.english('the slope of the {average reward|JJ} = the average, over the {model’s own responses|pt}, of {reward|RR} × {the direction that makes that response more likely|grad}', { size: 40, width: 1500 }).at(0, 90));
    const title = S.add(S.txt('The Gradient of Reward', { size: 54, color: C.GREY_B }).at(0, 250));
    const last = steps[steps.length - 1];
    S.beat('All of it rests on one line, from chapter three: the slope of the average reward is the average, over the model’s own responses, of reward times the direction that makes each one more likely. Thank you for watching.',
      fade([h, ...last[0].all, ...last[1].all]), A.Write(fin, 2.4), S.writeIn(read, 2.6), A.FadeIn(title, { dy: 16 }), { hold: 2.5 });
    S.keep();
  });
});
