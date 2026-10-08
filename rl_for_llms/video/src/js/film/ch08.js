// Chapter 8 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch08(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // numbers on screen, with a real minus sign; and the same inside TeX
  const num = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '') + Math.abs(x).toFixed(d);
  const tnum = (x, d = 2) => (x < -0.5 * 10 ** -d ? '-' : '') + Math.abs(x).toFixed(d);
  // numbers as a narrator says them
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = (n) => {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
    return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`;
  };
  const sayN = (x, d = 2) => {
    const [a, b] = Math.abs(x).toFixed(d).split('.');
    return `${x < 0 ? 'minus ' : ''}${words(+a)}${b ? ` point ${b.split('').map((c) => ONES[+c]).join(' ')}` : ''}`;
  };
  const pct = (p) => `${Math.round(100 * p)}%`;
  const sayPct = (p) => `${words(Math.round(100 * p))} percent`;
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  // a formula parked at the top while a picture or numbers explain it
  const TOP = (m, y = -330, s = 0.62) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, s), A.Set(m, { o: 1 }));
  // a side note in the "because" style, for layouts with a picture beside it
  const side = (S, str, x, y, w = 760, size = 34) => S.english(str, { size, color: C.GREY_B, italic: true, width: w }).at(x, y);
  const fade = (ms, dur = 0.6) => par(ms.filter(Boolean).map((m) => A.FadeOut(m, { dur })));
  const boxOf = (S, m, color, y = m.init.y) => S.add(S.rect(m.w + 80, m.h + 50, { stroke: color, width: 4, rx: 12 }).at(0, y));

  /* ---------------------------------------------------------- symbols of this chapter */
  FILM.addSymbol('c8rt', 'reward', 'r_t', 'the reward at token t', 'minus β times this token’s log-ratio; the last token also gets the reward model’s score', 'the KL penalty is paid token by token, where the change happened');
  const RT = '\\cReward{c8rt}{r_t}';
  // the objective with a leash: J_beta(pi)
  const JB = '\\JJ_{\\bt}(\\pp)';
  const KLR = '\\KL(\\pp \\,\\|\\, \\pref)';
  const KLS = '\\KL(\\pp \\,\\|\\, \\pstar)';
  const LR = '\\log \\frac{\\pp(\\yy)}{\\pref(\\yy)}';

  /* ---------------------------------------------------------- the numbers (kernel: src/js/rl.js) */
  const REF = LEASH.ref;
  const R = LEASH.r;
  const NAMES = LEASH.labels;
  // a toy policy: twenty points of probability moved from vague to flattering
  const PF = [REF[0] - 0.2, REF[1], REF[2], REF[3] + 0.2];
  // the same twenty points moved to helpful instead
  const PH = [REF[0] - 0.2, REF[1] + 0.2, REF[2], REF[3]];
  const KLF = RL.kl(PF, REF);
  const KLH = RL.kl(PH, REF);
  const KLREV = RL.kl(REF, PF);
  const lrF = PF.map((p, i) => Math.log(p / REF[i]));
  const lrH = PH.map((p, i) => Math.log(p / REF[i]));
  // the tilt at beta = 1/2
  const B = 0.5;
  const PS = LEASH.at(B);
  const W = REF.map((p, i) => p * Math.exp(R[i] / B)); // reference times e^(r / beta)
  const logZ = RL.logPartition(REF, R, B);
  const Z = Math.exp(logZ);
  const bLogZ = B * logZ;
  const Eref = RL.expectedReward(REF, R);
  const Eps = RL.expectedReward(PS, R);
  const KLps = RL.kl(PS, REF);
  const KLrefStar = RL.kl(REF, PS); // KL(pi_ref || pi*)
  const FLAT = [0, 0, 0, 1];
  const objOf = (p) => RL.regularisedObjective(p, REF, R, B);
  // a toy answer, token by token: the trained policy and a toy reference
  const TOK = ANSWER.tokens;
  const TP = ANSWER.p;
  const TREF = [0.7, 0.8, 0.93, 0.3, 0.97];
  const TLR = TP.map((p, i) => Math.log(p / TREF[i]));
  const best = R.indexOf(Math.max(...R));

  /* =========================================================== CHAPTER 8 */
  video.chapter('ch8', 'The KL leash');
  card(8, 'The leash: KL, and an exact answer');

  /*
   * The KL divergence, built from what a distance between policies should
   * do: the log-ratio of one answer, averaged under pi. Numbers on the leash
   * toy, Gibbs' inequality from log u <= u - 1, asymmetry, the penalised
   * objective, and the per-token form used in practice.
   */
  video.scene('kl', 'Kullback and Leibler', (S) => {
    const h = S.add(S.title('How far has the policy moved?'));
    const POL = S.color('pp');
    const FRZ = S.color('pref');

    // 1. why: we need a number for distance
    const BY = 150;
    const BH = 480;
    const blank = NAMES.map(() => '');
    const refB = S.add(S.bars({ labels: blank, values: REF, h: BH, w: 84, gap: 176, color: FRZ, valueSize: 30 }).at(-48, BY));
    const polB = S.add(S.bars({ labels: blank, values: PF, h: BH, w: 84, gap: 176, color: POL, valueSize: 30 }).at(48, BY));
    const xs = refB.xs;
    const labs = NAMES.map((l, i) => S.add(S.txt(l, { size: 36 }).at(xs[i], BY + 44)));
    const legR = S.add(S.tex('\\pref', { size: 56 }).at(-730, 40));
    const legP = S.add(S.tex('\\pp', { size: 60 }).at(-730, -50));
    const toy = S.add(S.toy(760, -390));
    const q1 = S.add(S.english('how far has the {policy π|pp} moved from the {reference π_ref|pref}?', { size: 44 }).at(0, -320));
    S.beat('Chapter seven ended with a need: a price for moving away from the starting model. First we need a number: how far has the policy moved from where it started?',
      A.FadeIn(h), A.FadeIn(refB), A.FadeIn(legR), lag(0.1, labs.map((l) => A.FadeIn(l))), wait(0.4), A.FadeIn(polB, { dy: 10 }), A.FadeIn(legP), A.FadeIn(toy), S.writeIn(q1, 1.8));

    // 2. what that number should do
    const wish = [
      S.add(S.english('1.  zero when nothing has moved', { size: 36 }).at(0, -380)),
      S.add(S.english('2.  bigger the further the {policy|pp} moves', { size: 36 }).at(0, -320)),
      S.add(S.english('3.  most expensive toward answers the {reference|pref} rarely gives', { size: 36 }).at(0, -260)),
    ];
    S.beat('What should that number do? Be zero when nothing moved. Grow as the policy moves. And charge most for moving toward answers the reference rarely gives, where the reward model has seen least.',
      A.FadeOut(q1), lag(1.6, wish.map((w) => S.writeIn(w, 1.2))));

    // 3. one answer: a ratio, then its log
    const F1 = S.add(S.tex(LR, { size: 70 }).at(-470, -300));
    const e1 = S.add(side(S, 'positive: {π|pp} gives y more often than {π_ref|pref} did; negative: less often; zero: unchanged', 330, -300, 980, 34));
    const rowL1 = S.add(S.tex('\\pp / \\pref', { size: 40 }).at(-680, BY + 108));
    const rowL2 = S.add(S.tex('\\log', { size: 40 }).at(-680, BY + 168));
    const ratio = PF.map((p, i) => S.add(S.txt(num(p / REF[i], 1), { size: 36, font: 'mono' }).at(xs[i], BY + 108)));
    const logs = lrF.map((v, i) => S.add(S.txt(num(v, 2), { size: 36, font: 'mono', color: S.color('KL') }).at(xs[i], BY + 168)));
    S.beat(`Start with one answer: divide its two chances, then take the log. Flattering went from five percent to twenty-five: a ratio of five, log ${sayN(lrF[3])}. Vague: a ratio of ${sayN(PF[0] / REF[0], 1)}, log ${sayN(lrF[0])}. Unchanged answers: exactly zero.`,
      fade(wish), A.Write(F1, 1.4), S.writeIn(e1, 1.8), A.FadeIn(rowL1), lag(0.3, ratio.map((m) => A.FadeIn(m, { dy: 8 }))), A.FadeIn(rowL2), lag(0.3, logs.map((m) => A.FadeIn(m, { dy: 8 }))),
      { cap: `Start with one answer: divide its two chances, then take the log. Flattering went from 5% to 25%: a ratio of 5, log ${lrF[3].toFixed(2)}. Vague: a ratio of ${(PF[0] / REF[0]).toFixed(1)}, log ${num(lrF[0])}. Unchanged answers: exactly zero.` });

    // 4. average it under pi: the definition
    const K1 = S.add(S.tex(`${KLR} \\;=\\; \\sum_{\\yy} \\pp(\\yy)\\, ${LR} \\;=\\; \\EE_{\\yy \\sim \\pp}\\Big[ ${LR} \\Big]`, { size: 64 }).at(0, -60));
    const box1 = boxOf(S, K1, S.color('KL'));
    const r4 = S.add(S.reason('because: a sum weighted by {π(y)|pp} is an average over answers drawn from {π|pp} (chapter 3)'));
    S.beat('One number for the whole policy: average those log-ratios over the answers the policy actually gives, each weighted by its chance under pi. That average is the Coolback Lyebler divergence: K L, for short.',
      fade([refB, polB, ...labs, legR, legP, toy, e1, rowL1, rowL2, ...ratio, ...logs]), UP(F1), A.Write(K1, 2.2), A.Create(box1, 0.8), S.writeIn(r4, 1.6),
      { cap: 'One number for the whole policy: average those log-ratios over the answers the policy actually gives, each weighted by its chance under π. That average is the Kullback–Leibler divergence: KL, for short.' });
    S.tour(K1, [
      { sym: 'KL', at: [0, 175], anims: [A.FadeOut(r4), A.FadeOut(F1)], text: { from: 'Kullback and Leibler: the average log-ratio of two distributions', why: 'one number for how far a policy has moved' },
        say: 'K L is named after Coolback and Lyebler, the two statisticians who defined it. It is one number: how far pi has moved away from pi ref.',
        cap: 'KL is named after Kullback and Leibler, the two statisticians who defined it. It is one number: how far π has moved away from π_ref.' },
      { sym: 'pref', at: [0, 175], text: { why: 'it is where the leash is tied: the model the reward model learned around' },
        say: 'Pi ref is the reference: the model before this training began, kept frozen. It is where the leash is tied.',
        cap: 'π_ref is the reference: the model before this training began, kept frozen. It is where the leash is tied.' },
    ]);
    const e5 = S.add(S.english('on average over the {policy’s|pp} own answers: the log of how much more often {π|pp} gives them than the {reference|pref} did', { size: 40, width: 1500 }).at(0, 160));
    S.beat('In words: on average over the policy’s own answers, the log of how much more often the policy gives them than the reference did.',
      S.endTour(K1), S.writeIn(e5, 2.2));

    // 5. numbers
    const tw = (p, q) => `\\cPolicy{np}{${p.toFixed(2)}} \\log \\frac{${p.toFixed(2)}}{\\cFrozen{nq}{${q.toFixed(2)}}}`;
    const N1 = S.add(S.tex(`${KLR} \\;=\\; ${PF.map((p, i) => tw(p, REF[i])).join(' + ')}`, { size: 52 }).at(0, -130));
    const N2 = S.add(S.tex(`\\;=\\; ${tnum(PF[0] * lrF[0], 3)} \\;+\\; 0 \\;+\\; 0 \\;+\\; ${tnum(PF[3] * lrF[3], 3)} \\;=\\; \\cLeash{nk}{${KLF.toFixed(3)}}`, { size: 60 }).at(0, -10));
    S.beat(`On our numbers: weight each log-ratio by pi. Vague: ${sayN(PF[0])} times ${sayN(lrF[0])}. Flattering: ${sayN(PF[3])} times ${sayN(lrF[3])}. The unchanged answers add nothing. Total: about ${sayN(KLF)}.`,
      fade([e5, box1]), TOP(K1), A.Write(N1, 2), A.Write(N2, 1.8),
      { cap: `On our numbers: weight each log-ratio by π. Vague: ${PF[0].toFixed(2)} × (${num(lrF[0])}). Flattering: ${PF[3].toFixed(2)} × ${lrF[3].toFixed(2)}. The unchanged answers add nothing. Total: about ${KLF.toFixed(2)}.` });
    const e6 = S.add(S.english('the same twenty points moved to helpful instead, which {π_ref|pref} already gives 30% of the time:', { size: 36, color: C.GREY_B, width: 1600 }).at(0, 120));
    const N3 = S.add(S.tex(`${tw(PH[0], REF[0])} + ${tw(PH[1], REF[1])} \\;=\\; ${tnum(PH[0] * lrH[0], 3)} + ${tnum(PH[1] * lrH[1], 3)} \\;=\\; \\cLeash{nk}{${KLH.toFixed(3)}}`, { size: 52 }).at(0, 215));
    S.beat(`Move the same twenty points to helpful instead, an answer the reference already gives thirty percent of the time, and K L is only ${sayN(KLH)}. The leash charges most where the reference rarely goes: wish three.`,
      S.writeIn(e6, 1.6), A.Write(N3, 2),
      { cap: `Move the same twenty points to helpful instead, an answer the reference already gives 30% of the time, and KL is only ${KLH.toFixed(2)}. The leash charges most where the reference rarely goes: wish 3.` });

    // 6. why it is never negative: log u <= u - 1
    const AXx = -450;
    const AXy = 40;
    const ax = S.add(S.axes({ x0: 0, x1: 3, y0: -2.5, y1: 2, w: 700, h: 440, xticks: [0, 1, 2, 3], yticks: [-2, -1, 0, 1, 2], xlabel: 'u', ylabel: '' }).at(AXx, AXy));
    const zero = S.add(S.line(AXx - 350, AXy + ax.fy(0), AXx + 350, AXy + ax.fy(0), { stroke: C.GREY, width: 3, dash: '6 8' }));
    const lc = ax.plot((u) => Math.log(u), { color: C.WHITE, width: 6, from: 0.085, to: 3 });
    const tc = ax.plot((u) => u - 1, { color: C.YELLOW, width: 5, from: 0, to: 3, dash: '16 10' });
    const lcL = S.add(S.txt('log u', { size: 36, color: C.WHITE }).at(AXx + ax.fx(2.55), AXy + ax.fy(Math.log(2.55)) + 40));
    const tcL = S.add(S.txt('u − 1', { size: 36, color: C.YELLOW }).at(AXx + ax.fx(2.2), AXy + ax.fy(1.2) - 36));
    const touch = S.add(S.dot(12, C.YELLOW).at(AXx + ax.fx(1), AXy + ax.fy(0)));
    const G1 = S.add(S.tex('\\log u \\;\\le\\; u - 1', { size: 80 }).at(450, -100));
    const eG = S.add(side(S, 'the log curve lies below its tangent line at u = 1, and touches it only there', 450, 40, 700, 36));
    S.beat('Some terms were negative. Can the total be? No. One fact about the log: its curve lies below its tangent line at one. Log u is at most u minus one, and equal only at u equals one.',
      fade([K1, N1, N2, e6, N3]), A.FadeIn(ax), A.FadeIn(zero), A.Create(lc, 1.4), A.Create(tc, 1.2), A.FadeIn(lcL), A.FadeIn(tcL), A.FadeIn(touch, { from: 2 }), A.Write(G1, 1.4), S.writeIn(eG, 1.6));

    // 7. Gibbs' inequality
    const D1 = S.add(S.tex(`-${KLR} \\;=\\; \\sum_{\\yy} \\pp(\\yy)\\, \\log \\frac{\\pref(\\yy)}{\\pp(\\yy)}`, { size: 72 }).at(0, -60));
    const D2 = S.add(S.tex('\\;\\le\\; \\sum_{\\yy} \\pp(\\yy) \\Big(\\frac{\\pref(\\yy)}{\\pp(\\yy)} - 1\\Big) \\;=\\; \\sum_{\\yy} \\pref(\\yy) \\;-\\; \\sum_{\\yy} \\pp(\\yy) \\;\\le\\; 1 - 1 \\;=\\; 0', { size: 56 }).at(0, 120));
    const r7 = S.add(S.reason('because: minus a log is the log of the flipped fraction; then log u ≤ u − 1 with u = {π_ref|pref} / {π|pp}; and chances add up to at most 1'));
    S.beat('Use it with u equal to pi ref over pi. Minus K L is an average of log u, so it is at most the average of u minus one. That is the reference’s chances minus the policy’s: at most one minus one, zero.',
      fade([ax, zero, lc, tc, lcL, tcL, touch, eG]), par(A.MoveTo(G1, 0, -275), A.ScaleTo(G1, 0.72), A.Set(G1, { o: 0.5 })), A.Write(D1, 1.8), A.Write(D2, 2.4), S.writeIn(r7, 2),
      { cap: 'Use it with u = π_ref / π. Minus KL is an average of log u, so it is at most the average of u − 1. That is the reference’s chances minus the policy’s: at most 1 − 1 = 0.' });
    const G2 = S.add(S.tex(`${KLR} \\;\\ge\\; 0, \\qquad \\text{and } = 0 \\text{ only when } \\pp = \\pref`, { size: 76 }).at(0, -60));
    const box2 = boxOf(S, G2, S.color('KL'));
    const e7 = S.add(S.english('Gibbs’ inequality: any move at all costs something, and only standing still is free', { size: 40, width: 1700 }).at(0, 120));
    S.beat('So K L is never negative. This is Gibbs’ inequality. And it is zero only when every u is one: when the two policies are equal. Wishes one and two.',
      fade([G1, D1, D2, r7]), A.Write(G2, 1.8), A.Create(box2, 0.8), S.writeIn(e7, 1.8),
      { cap: 'So KL is never negative. This is Gibbs’ inequality. And it is zero only when every u is 1: when the two policies are equal. Wishes 1 and 2.' });

    // 8. not symmetric; why this order
    const AS = S.add(S.tex(`${KLR} = ${KLF.toFixed(3)} \\;\\;\\ne\\;\\; \\KL(\\pref \\,\\|\\, \\pp) = ${KLREV.toFixed(3)}`, { size: 66 }).at(0, 100));
    const e8 = S.add(S.english('we average over the {policy’s|pp} own samples; and an answer {π_ref|pref} would never give costs without limit', { size: 36, color: C.GREY_B, width: 1750 }).at(0, 230));
    S.beat(`One warning: K L is not symmetric. Swap the two, and our example gives ${sayN(KLREV, 3)}, not ${sayN(KLF, 3)}. We use this order: we sample from the policy anyway, and it forbids answers the reference would never give.`,
      A.FadeOut(e7), A.Write(AS, 1.8), S.writeIn(e8, 2),
      { cap: `One warning: KL is not symmetric. Swap the two, and our example gives ${KLREV.toFixed(3)}, not ${KLF.toFixed(3)}. We use this order: we sample from the policy anyway, and it forbids answers the reference would never give.` });

    // 9. the leash: the penalised objective
    const O = S.add(S.tex(`${JB} \\;=\\; \\EE_{\\yy \\sim \\pp}\\big[\\rr(\\yy)\\big] \\;-\\; \\bt\\, ${KLR}`, { size: 84 }).at(0, -60));
    const boxO = boxOf(S, O, S.color('JJ'));
    const eO = S.add(S.english('the {average reward|rr}, minus {β|bt} times how far the {policy|pp} has moved from the {reference|pref}', { size: 40, width: 1500 }).at(0, 140));
    S.beat('Now the leash. The objective subtracts K L, scaled by a number we choose. In words: the average reward, minus beta times how far the policy has moved from the reference.',
      fade([G2, box2, AS, e8]), A.Write(O, 2), A.Create(boxO, 0.8), S.writeIn(eO, 2),
      { cap: 'Now the leash. The objective subtracts KL, scaled by a number we choose. In words: the average reward, minus β times how far the policy has moved from the reference.' });
    S.tour(O, [
      { sym: 'bt', at: [0, 175], anims: [A.FadeOut(eO)], text: { why: 'the price of distance: how much reward one unit of KL costs' },
        say: 'Beta is the price of distance: how many points of reward one unit of K L costs. A large beta is a short leash. A small beta, a long one.',
        cap: 'β is the price of distance: how many points of reward one unit of KL costs. A large β is a short leash. A small β, a long one.' },
    ]);

    // 10. sequences: the log-ratio is a sum over tokens
    const Q1 = S.add(S.tex('\\log \\frac{\\pt(\\yy \\mid \\xx)}{\\pref(\\yy \\mid \\xx)} \\;=\\; \\sum_{t} \\log \\frac{\\pt(\\yy_t \\mid \\ss_t)}{\\pref(\\yy_t \\mid \\ss_t)}', { size: 62 }).at(0, -300));
    const rQ = S.add(S.reason('because: a response’s probability is the product of its tokens’ (chapter 1), and the log of a product is a sum', { y: -168 }));
    S.beat('Now let pi be the model we train, pi theta. For a language model, an answer is a sequence of tokens. Its probability is a product over tokens, so its log-ratio is a sum: one log-ratio per token.',
      S.endTour(O), fade([O, boxO]), A.Write(Q1, 2), S.writeIn(rQ, 1.6),
      { cap: 'Now let π be the model we train, π_θ. For a language model, an answer is a sequence of tokens. Its probability is a product over tokens, so its log-ratio is a sum: one log-ratio per token.' });
    const toks = S.add(S.tokens(TOK, { size: 46, gap: 80 }).at(60, -60));
    const rowY = [20, 85, 150];
    const rowLab = [
      S.add(S.tex('\\pt', { size: 46 })),
      S.add(S.tex('\\pref', { size: 46 })),
      S.add(S.tex('\\log (\\pt / \\pref)', { size: 40 })),
    ].map((m, i) => m.at(60 - toks.width / 2 - 40 - m.w / 2, rowY[i]));
    const cells = toks.items.map((it, i) => [
      S.add(S.txt(TP[i].toFixed(2), { size: 34, font: 'mono', color: S.color('pt') }).at(60 + it.x, rowY[0])),
      S.add(S.txt(TREF[i].toFixed(2), { size: 34, font: 'mono', color: S.color('pref') }).at(60 + it.x, rowY[1])),
      S.add(S.txt(num(TLR[i], 2), { size: 34, font: 'mono', color: S.color('KL') }).at(60 + it.x, rowY[2])),
    ]);
    const toy2 = S.add(S.toy(760, -390));
    S.beat(`On a toy answer: most tokens barely changed, and their log-ratios are near zero. The token fifty-one, now much likelier, carries most of it. One token’s log-ratio can be negative; only the average over the policy’s own answers cannot.`,
      A.FadeOut(rQ), A.FadeIn(toy2), A.Show(toks), lag(0.15, toks.items.map((t) => A.FadeIn(t.item, { dy: 12, dur: 0.5 }))), lag(0.3, rowLab.map((m) => A.FadeIn(m))), lag(0.12, cells.map((c) => par(c.map((m) => A.FadeIn(m))))),
      A.Indicate(cells[3][2], { color: C.ORANGE, scale: 1.3 }), A.Indicate(cells[0][2], { color: C.RED, scale: 1.3 }),
      { cap: 'On a toy answer: most tokens barely changed, and their log-ratios are near zero. The token “51”, now much likelier, carries most of it. One token’s log-ratio can be negative; only the average over the policy’s own answers cannot.' });

    // 11. the per-token reward
    const PT = S.add(S.tex(`${RT} \\;=\\; -\\bt\\, \\log \\frac{\\pt(\\yy_t \\mid \\ss_t)}{\\pref(\\yy_t \\mid \\ss_t)} \\;\\;\\big(+\\; \\rr(\\xx, \\yy) \\text{ at the last token}\\big)`, { size: 54 }).at(60, 250));
    const e11 = S.add(S.english('added up: {reward|rr} − {β|bt} × the response’s log-ratio; averaged over responses: the {objective|JJ}', { size: 34, color: C.GREY_B, width: 1600 }).at(0, -175));
    S.paper('ziegler2019');
    S.beat('So the penalty can be paid token by token: each token earns minus beta times its log-ratio, and the last also earns the reward. Summed and averaged, that is exactly our objective. Ziegler and colleagues used this penalty; InstructGPT, beta zero point zero two.',
      A.Write(PT, 2.2), A.Spot(PT, ['c8rt', 'bt']), wait(1.5), A.Unspot(PT), S.writeIn(e11, 2),
      { cap: 'So the penalty can be paid token by token: each token earns −β times its log-ratio, and the last also earns the reward. Summed and averaged, that is exactly our objective. Ziegler and colleagues used this penalty; InstructGPT, β = 0.02.' });
  });

  /*
   * The exact optimum of E_pi[r] - beta KL(pi || pi_ref): gather everything
   * into one log, normalise to get pi* = pi_ref e^(r/beta) / Z, then prove
   * J_beta(pi) = beta log Z - beta KL(pi || pi*). Checked on the leash toy.
   */
  video.scene('tilt', 'The exact optimum', (S) => {
    const h = S.add(S.title('The best policy, exactly'));

    // 1. why
    const q = S.add(S.english('which {policy|pp} scores highest? If we knew, we would know where training is heading', { size: 42, width: 1750 }).at(0, -270));
    const L0 = S.add(S.tex(`${JB} \\;=\\; \\EE_{\\yy \\sim \\pp}\\big[\\rr(\\yy)\\big] \\;-\\; \\bt\\, ${KLR}`, { size: 84 }).at(0, -60));
    S.beat('Which policy maximises this objective? If we can answer exactly, we know where training is heading, before taking a single step.',
      A.FadeIn(h), S.writeIn(q, 2), A.Write(L0, 1.8));

    // 2. one average
    const L1 = S.add(S.tex(`${JB} \\;=\\; \\EE_{\\yy \\sim \\pp}\\Big[\\rr(\\yy) \\;-\\; \\bt\\, ${LR}\\Big]`, { size: 80 }).at(0, -60));
    const r1 = S.add(S.reason('because: {KL|KL} is itself an average over y ~ {π|pp}; two averages over the same answers add into one'));
    S.beat('Both terms are averages over the same answers, the policy’s own. So write them as one average: the reward, minus beta times the log-ratio.',
      A.FadeOut(q), UP(L0), A.Write(L1, 2), S.writeIn(r1, 1.8),
      { cap: 'Both terms are averages over the same answers, the policy’s own. So write them as one average: the reward, minus β times the log-ratio.' });

    // 3. take out -beta, gather into one log
    const L2 = S.add(S.tex(`\\;=\\; -\\bt\\; \\EE_{\\yy \\sim \\pp}\\Big[\\log \\frac{\\pp(\\yy)}{\\cData{c8w}{\\pref(\\yy)\\, e^{\\rr(\\yy)/\\bt}}}\\Big]`, { size: 80 }).at(0, 130));
    const r2 = S.add(S.reason('because: take out −β; then r / β = log e^(r / β), and log a − log b = log (a / b)'));
    S.beat('Take out minus beta. The reward over beta is the log of e to the reward over beta, and a difference of logs is the log of a ratio. Now everything sits inside one log.',
      A.FadeOut(r1), A.Write(L2, 2.2), S.writeIn(r2, 1.8),
      { cap: 'Take out −β. r/β is the log of e^(r/β), and a difference of logs is the log of a ratio. Now everything sits inside one log.' });

    // 4. the bottom is almost a distribution
    const e3 = S.add(S.english('the bottom: the {reference|pref}, with each answer reweighted by {e^(r/β)|rr}. Its weights do not add up to 1', { size: 38, width: 1500 }).at(0, 285));
    S.beat('Look at the bottom: the reference, with each answer reweighted by e to its reward over beta. If it were a probability distribution, this would be a K L. It is not: its weights do not add up to one.',
      A.FadeOut(r2), A.Spot(L2, 'c8w'), S.writeIn(e3, 2),
      { cap: 'Look at the bottom: the reference, with each answer reweighted by e^(r/β). If it were a probability distribution, this would be a KL. It is not: its weights do not add up to 1.' });

    // 5. normalise: pi*
    const P = S.add(S.tex('\\pstar(\\yy) \\;=\\; \\frac{\\pref(\\yy)\\, e^{\\rr(\\yy)/\\bt}}{\\ZZ}, \\qquad \\ZZ \\;=\\; \\sum_{\\yy} \\pref(\\yy)\\, e^{\\rr(\\yy)/\\bt}', { size: 76 }).at(0, -60));
    const boxP = boxOf(S, P, S.color('pstar'));
    const r5 = S.add(S.reason('because: dividing by the total makes the weights add up to one, just as in the softmax'));
    S.beat('So make it one: divide by the total weight, Z. The result is a probability distribution. Call it pi star: the reference, tilted toward reward.',
      A.Unspot(L2), fade([e3, L0, L1]), UP(L2), A.Write(P, 2.2), A.Create(boxP, 0.8), S.writeIn(r5, 1.6),
      { cap: 'So make it one: divide by the total weight, Z. The result is a probability distribution. Call it π*: the reference, tilted toward reward.' });
    S.tour(P, [
      { sym: 'pstar', at: [0, 175], anims: [A.FadeOut(r5)], text: { from: 'the reference, reweighted by e^(r/β), rescaled to add up to 1', why: 'we are about to prove it is the best policy' },
        say: 'Pi star: the reference model, with each answer’s chance multiplied by e to its reward over beta, then rescaled. We are about to prove it is the best policy.',
        cap: 'π*: the reference model, with each answer’s chance multiplied by e to its reward over β, then rescaled. We are about to prove it is the best policy.' },
      { sym: 'ZZ', at: [0, 175], text: { from: 'the sum of those weights over every possible answer', why: 'it rescales the weights to add up to 1, and does not depend on π' },
        say: 'Z is the normaliser: the sum of those weights over every possible answer. It does not depend on the policy we choose.' },
    ]);

    // 6. the proof: log pi*
    const E1 = S.add(S.tex('\\log \\pstar(\\yy) \\;=\\; \\log \\pref(\\yy) \\;+\\; \\frac{\\rr(\\yy)}{\\bt} \\;-\\; \\log \\ZZ', { size: 80 }).at(0, -60));
    const rE1 = S.add(S.reason('because: the log of a product is a sum, the log of a quotient a difference, and log e^u = u'));
    S.beat('Now the proof. Take the log of pi star: log of the reference, plus the reward over beta, minus log Z.',
      S.endTour(P), A.FadeOut(L2), A.FadeOut(boxP), UP(P), A.Write(E1, 1.8), S.writeIn(rE1, 1.6),
      { cap: 'Now the proof. Take the log of π*: log of the reference, plus the reward over β, minus log Z.' });

    // 7. the KL to pi*
    const E2 = S.add(S.tex(`${KLS} \\;=\\; \\EE_{\\pp}\\big[\\log \\pp - \\log \\pstar\\big] \\;=\\; ${KLR} \\;-\\; \\frac{\\EE_{\\pp}[\\rr]}{\\bt} \\;+\\; \\log \\ZZ`, { size: 56 }).at(0, 130));
    const rE2 = S.add(S.reason('because: put that log into the definition of {KL|KL} and split the average; {log Z|ZZ} is the same for every y, so its average is itself'));
    S.beat('Put that into the K L divergence from pi to pi star, and collect the terms: the K L to the reference, minus the average reward over beta, plus log Z.',
      A.FadeOut(rE1), A.Write(E2, 2.4), S.writeIn(rE2, 2),
      { cap: 'Put that into the KL divergence from π to π*, and collect the terms: the KL to the reference, minus the average reward over β, plus log Z.' });

    // 8. rearrange: the identity
    const E3 = S.add(S.tex(`\\EE_{\\yy \\sim \\pp}\\big[\\rr(\\yy)\\big] - \\bt\\, ${KLR} \\;=\\; \\cLeash{c8c}{\\bt \\log \\ZZ} \\;-\\; \\cLeash{c8k}{\\bt\\, ${KLS}}`, { size: 62 }).at(0, -60));
    const box3 = boxOf(S, E3, S.color('JJ'));
    const rE3 = S.add(S.reason('because: multiply both sides by −β, and move β log Z to the other side'));
    S.beat('Multiply by minus beta, and rearrange. Our objective, the reward minus beta times K L, equals beta log Z, minus beta times the K L from pi to pi star.',
      fade([rE2, E1, P]), UP(E2), A.Write(E3, 2.4), A.Create(box3, 0.8), S.writeIn(rE3, 1.6),
      { cap: 'Multiply by −β, and rearrange. Our objective, the reward minus β times KL, equals β log Z, minus β times the KL from π to π*.' });

    // 9. read it
    const e9 = S.add(S.english('{β log Z|ZZ}: a number no choice of {π|pp} can change', { size: 40 }).at(0, 120));
    S.beat('Read the right side. Beta log Z does not depend on pi at all. It is the same number, whatever policy we pick.',
      A.FadeOut(rE3), A.FadeOut(E2), A.Spot(E3, 'c8c'), S.writeIn(e9, 1.6),
      { cap: 'Read the right side. β log Z does not depend on π at all. It is the same number, whatever policy we pick.' });
    const e10 = S.add(S.english('minus {β|bt} × a {KL|KL}: never negative, and zero only when {π = π*|pstar}', { size: 40 }).at(0, 200));
    const e10b = S.add(S.english('so the best {policy|pp} is exactly {π*|pstar}, and the best value is {β log Z|ZZ}', { size: 44 }).at(0, 290));
    S.beat('The rest is minus beta times a K L divergence: never negative, and zero only when pi equals pi star. So the best policy is exactly pi star, and the best value is beta log Z.',
      A.Spot(E3, 'c8k'), S.writeIn(e10, 1.8), S.writeIn(e10b, 1.8),
      { cap: 'The rest is −β times a KL divergence: never negative, and zero only when π = π*. So the best policy is exactly π*, and the best value is β log Z.' });

    // 10. numbers at beta = 1/2
    const toy = S.add(S.toy(760, -390));
    const CX = [-170, 120, 410, 700];
    const RY = { a: -250, ref: -170, w: -95, prod: -20, star: 60 };
    const rowLab = (tex, y) => {
      const m = S.add(S.tex(tex, { size: 44 }));
      return m.at(-380 - m.w / 2, y);
    };
    const labsT = [rowLab('\\text{answer}', RY.a), rowLab('\\pref(\\yy)', RY.ref), rowLab(`e^{\\rr(\\yy)/\\bt} = e^{2\\rr(\\yy)}`, RY.w), rowLab('\\pref(\\yy)\\, e^{2\\rr(\\yy)}', RY.prod), rowLab('\\pstar(\\yy)', RY.star)];
    const cellT = (str, i, y, color) => S.add(S.txt(str, { size: 38, font: 'mono', color }).at(CX[i], y));
    const cA = NAMES.map((l, i) => S.add(S.txt(l, { size: 38 }).at(CX[i], RY.a)));
    const cR = REF.map((v, i) => cellT(v.toFixed(2), i, RY.ref, S.color('pref')));
    const cW = R.map((v, i) => cellT(Math.exp(v / B).toFixed(2), i, RY.w, S.color('rr')));
    const cP = W.map((v, i) => cellT(v.toFixed(2), i, RY.prod, C.WHITE));
    const cS = PS.map((v, i) => cellT(v.toFixed(2), i, RY.star, S.color('pstar')));
    const zN = S.add(S.tex(`\\ZZ = ${W.map((v) => v.toFixed(2)).join(' + ')} = ${Z.toFixed(2)}`, { size: 50 }).at(0, 165));
    const bN = S.add(S.tex(`\\bt = ${B}`, { size: 50 }).at(-700, -380));
    S.beat(`Our four answers, with beta one half. Multiply each reference chance by e to twice its reward: flattery’s five percent, by about twenty. The weights add up to Z, ${sayN(Z)}. Divide by it: pi star.`,
      fade([E3, box3, e9, e10, e10b]), A.FadeIn(toy), A.FadeIn(bN), lag(0.15, [...labsT, ...cA].map((m) => A.FadeIn(m))), lag(0.12, cR.map((m) => A.FadeIn(m))), lag(0.12, cW.map((m) => A.FadeIn(m))), lag(0.12, cP.map((m) => A.FadeIn(m))), A.Write(zN, 1.4), lag(0.12, cS.map((m) => A.FadeIn(m, { from: 1.4 }))),
      { cap: `Our four answers, with β = 1/2. Multiply each reference chance by e to twice its reward: flattery’s 5%, by about 20. The weights add up to Z, ${Z.toFixed(2)}. Divide by it: π*.` });

    // 11. check the identity on three policies
    const chk = (name, p) => `${name}:\\;\\; ${RL.expectedReward(p, R).toFixed(3)} - ${B} \\times ${RL.kl(p, REF).toFixed(3)} \\;=\\; ${objOf(p).toFixed(3)}`;
    const C1 = S.add(S.tex(chk('\\text{the reference}', REF), { size: 46 }).at(0, -150));
    const C2 = S.add(S.tex(chk('\\text{always flatter}', FLAT), { size: 46 }).at(0, -60));
    const C3 = S.add(S.tex(chk('\\pstar', PS), { size: 46 }).at(0, 30));
    const C4 = S.add(S.tex(`\\bt \\log \\ZZ \\;=\\; ${B} \\times \\log ${Z.toFixed(3)} \\;=\\; \\cLeash{nb}{${bLogZ.toFixed(3)}}`, { size: 56 }).at(0, 150));
    const rC = S.add(S.reason(`check: β log Z − β KL(π_ref ‖ π*) = ${bLogZ.toFixed(3)} − ${B} × ${KLrefStar.toFixed(3)} = ${(bLogZ - B * KLrefStar).toFixed(3)}, the reference’s score`));
    S.beat(`Check it. Beta log Z is ${sayN(bLogZ)}. The reference scores ${sayN(objOf(REF))}. Always flattering earns the most reward, but pays ${sayN(B * RL.kl(FLAT, REF))} in K L: ${sayN(objOf(FLAT))}. Pi star scores ${sayN(objOf(PS))}, the maximum.`,
      fade([toy, bN, ...labsT, ...cA, ...cR, ...cW, ...cP, ...cS, zN]), lag(0.5, [C1, C2, C3].map((m) => A.FadeIn(m, { dx: 20 }))), A.Write(C4, 1.4), S.writeIn(rC, 1.6), A.Indicate(C3, { color: C.GREEN, scale: 1.08 }),
      { cap: `Check it. β log Z is ${bLogZ.toFixed(2)}. The reference scores ${objOf(REF).toFixed(2)}. Always flattering earns the most reward, but pays ${(B * RL.kl(FLAT, REF)).toFixed(2)} in KL: ${objOf(FLAT).toFixed(2)}. π* scores ${objOf(PS).toFixed(2)}, the maximum.` });
  });

  /*
   * The knob: beta -> infinity keeps the reference, beta -> 0 puts all the
   * mass on the highest proxy reward; the reward-KL frontier; the Bayesian
   * reading; and why Z keeps us climbing.
   */
  video.scene('beta', 'Turning the knob', (S) => {
    const h = S.add(S.title('Turning the knob'));

    // 1. odds: Z cancels
    const O1 = S.add(S.tex('\\frac{\\pstar(\\yy)}{\\pstar(\\yy\')} \\;=\\; \\frac{\\pref(\\yy)}{\\pref(\\yy\')}\\; e^{(\\rr(\\yy) - \\rr(\\yy\'))/\\bt}', { size: 84 }).at(0, -60));
    const rO = S.add(S.reason('because: {Z|ZZ} is the same for both answers, and cancels'));
    const eO = S.add(S.english('each extra point of {reward|rr} multiplies the odds by {e^(1/β)|bt}', { size: 42 }).at(0, 150));
    S.beat('Compare two answers under pi star. Z cancels: the odds are the reference’s odds, times e to the reward gap over beta. Each extra point of reward multiplies the odds by e to the one over beta.',
      A.FadeIn(h), A.Write(O1, 2.2), S.writeIn(rO, 1.4), S.writeIn(eO, 1.8),
      { cap: 'Compare two answers under π*. Z cancels: the odds are the reference’s odds, times e to the reward gap over β. Each extra point of reward multiplies the odds by e^(1/β).' });

    // 2. large beta: stays at the reference
    const BX = 120;
    const BY = 250;
    const BH = 400;
    const betas = [8, 1, 0.5, 0.2, 0.05];
    const bars = S.add(S.bars({ labels: NAMES, values: LEASH.at(betas[0]), h: BH, w: 130, gap: 110, color: S.color('pstar'), labelFont: 'serif', labelSize: 36, valueSize: 30 }).at(BX, BY));
    const ghosts = REF.map((v, i) => S.add(S.line(BX + bars.xs[i] - 80, BY - BH * v, BX + bars.xs[i] + 80, BY - BH * v, { stroke: S.color('pref'), width: 4, dash: '10 8' })));
    const rew = R.map((v, i) => S.add(S.txt(`r = ${v}`, { size: 30, color: S.color('rr'), font: 'mono' }).at(BX + bars.xs[i], BY + 90)));
    const ghostL = S.add(S.english('dashed: {π_ref|pref}', { size: 32 }).at(-620, 120));
    const bl = betas.map((b) => S.add(S.tex(`\\bt = ${b}`, { size: 64 }).at(-620, -40)));
    const stats = betas.map((b) => {
      const p = LEASH.at(b);
      return S.add(S.english(`{reward ${RL.expectedReward(p, R).toFixed(2)}|rr}   {KL ${RL.kl(p, REF).toFixed(2)}|KL}`, { size: 34 }).at(-620, 40));
    });
    const toy = S.add(S.toy(760, -390));
    S.beat('With a large beta, e to the reward over beta is close to one for every answer. The tilt does almost nothing: pi star stays on the reference. A short leash.',
      fade([O1, rO, eO]), A.FadeIn(toy), A.FadeIn(bars), lag(0.1, ghosts.map((g) => A.FadeIn(g))), A.FadeIn(ghostL), lag(0.1, rew.map((m) => A.FadeIn(m))), A.FadeIn(bl[0]), A.FadeIn(stats[0]),
      { cap: 'With a large β, e to the reward over β is close to 1 for every answer. The tilt does almost nothing: π* stays on the reference. A short leash.' });

    // 3. shrink beta
    const steps = [];
    for (let i = 1; i < betas.length; i++) {
      steps.push(seq(par(A.FadeOut(bl[i - 1], { dur: 0.3 }), A.FadeOut(stats[i - 1], { dur: 0.3 }), A.FadeIn(bl[i], { dur: 0.3 }), A.FadeIn(stats[i], { dur: 0.3 })), bars.to(LEASH.at(betas[i]), 1.3), wait(1.2)));
    }
    const lim = [
      S.add(S.english('{β|bt} → ∞:  {π*|pstar} → {π_ref|pref}', { size: 40 }).at(-560, -330)),
      S.add(S.english('{β|bt} → 0:  all mass on the highest {reward|rr}', { size: 40 }).at(-460, -260)),
    ];
    S.beat(`Shrink beta, and mass flows toward high reward. At one half, flattery has grown from five percent to ${sayPct(LEASH.at(0.5)[best])}. As beta nears zero, the top answer’s odds grow without bound, and everything lands on flattery: the answer the reward model overrates.`,
      seq(steps), A.Indicate(bars.labs[best], { color: C.RED, scale: 1.3 }), lag(0.8, lim.map((m) => S.writeIn(m, 1.2))),
      { cap: `Shrink β, and mass flows toward high reward. At 1/2, flattery has grown from 5% to ${pct(LEASH.at(0.5)[best])}. As β nears 0, the top answer’s odds grow without bound, and everything lands on flattery: the answer the reward model overrates.` });

    // 4. the frontier
    const AX = 60;
    const AY = 0;
    const ax = S.add(S.axes({ x0: 0, x1: 3.2, y0: 0.4, y1: 1.6, w: 1100, h: 420, xticks: [0, 1, 2, 3], yticks: [0.5, 1, 1.5], yfmt: (v) => v.toFixed(1), xlabel: 'KL from the reference', ylabel: 'average reward' }).at(AX, AY));
    const fr = ax.polyline(LEASH.frontier.map((f) => [f.kl, f.reward]), { color: S.color('pstar'), width: 6 });
    const marks = [8, 1, 0.5, 0.2].map((b) => {
      const p = LEASH.at(b);
      return S.add(S.group(dot(12, S.color('bt')), new Text(`β = ${b}`, { size: 32, color: S.color('bt'), anchor: 'start' }).at(24, b === 8 ? 4 : 28)).at(AX + ax.fx(RL.kl(p, REF)), AY + ax.fy(RL.expectedReward(p, R))));
    });
    S.beat('Each beta buys some reward at some K L cost. Plot every beta, and you get a frontier: the most reward any policy can earn, for a given distance from the reference.',
      fade([bars, ...ghosts, ...rew, ghostL, ...bl, ...stats, ...lim, toy]), A.FadeIn(ax), A.Create(fr, 2), lag(0.5, marks.map((m) => A.FadeIn(m, { from: 1.6 }))),
      { cap: 'Each β buys some reward at some KL cost. Plot every β, and you get a frontier: the most reward any policy can earn, for a given distance from the reference.' });
    const rF = S.add(S.reason('because: a {π|pp} with more {reward|rr} and no more {KL|KL} would beat {π*|pstar} on reward − β KL', { y: 315 }));
    const below = S.add(side(S, 'every policy lies on or below this curve', AX + 150, AY + 70, 700, 34));
    S.beat('Why the most? A policy with more reward and no more K L would beat pi star on the objective, and nothing does. Every policy lies on or below this curve; choosing beta chooses a point on it.',
      S.writeIn(rF, 1.8), S.writeIn(below, 1.4),
      { cap: 'Why the most? A policy with more reward and no more KL would beat π* on the objective, and nothing does. Every policy lies on or below this curve; choosing β chooses a point on it.' });

    // 5. the Bayesian reading
    const bayes = S.add(S.tex('\\underbrace{\\pstar(\\yy)}_{\\text{posterior}} \\;\\propto\\; \\underbrace{\\pref(\\yy)}_{\\text{prior}}\\; \\underbrace{e^{\\rr(\\yy)/\\bt}}_{\\text{likelihood}}', { size: 84 }).at(0, -60));
    const eB = S.add(S.english('start from what the {reference|pref} believes; update it by the evidence of {reward|rr}; {β|bt} sets how strong that evidence is', { size: 38, width: 1500 }).at(0, 170));
    S.paper('korbak2022');
    S.beat('A second reading: the reference is a prior, what we believed before. E to the reward over beta is a likelihood, and pi star is the posterior. Korbak, Perez and Buckley argued that R L with a K L penalty is better viewed this way.',
      fade([ax, fr, ...marks, rF, below]), A.Write(bayes, 2.2), S.writeIn(eB, 2),
      { cap: 'A second reading: the reference is a prior, what we believed before. e^(r/β) is a likelihood, and π* is the posterior. Korbak, Perez and Buckley argued that RL with a KL penalty is better viewed this way, as Bayesian inference.' });

    // 6. what is still missing
    const zz = S.add(S.english('but {Z|ZZ} sums over every possible answer: for a language model, more than we could ever list', { size: 40, width: 1500 }).at(0, 170));
    S.beat('One catch: Z sums over every possible answer, and a language model has more than we could ever list. So we cannot write pi star down. We can only climb toward it, with P P O. Here is that climb, as a landscape.',
      A.FadeOut(eB), S.writeIn(zz, 2), { cap: 'One catch: Z sums over every possible answer, and a language model has more than we could ever list. So we cannot write π* down. We can only climb toward it, with PPO. Here is that climb, as a landscape.' });
  });

  // the 3D landscape (film/landscapes.js, drawn with space3.js)
  if (FILM.landscapes && FILM.landscapes.dome) FILM.landscapes.dome(ctx);

});
