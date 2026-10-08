// Chapter 9 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch09(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
  // numbers on screen, with a real minus sign; and the same inside TeX
  const num = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '') + Math.abs(x).toFixed(d);
  const tnum = (x, d = 2) => (x < -0.5 * 10 ** -d ? '-' : '') + Math.abs(x).toFixed(d);
  const sgn = (x, d = 2) => (x < -0.5 * 10 ** -d ? '−' : '+') + Math.abs(x).toFixed(d);
  // numbers as a narrator says them
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = (n) => {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
    if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`;
    return `${words(Math.floor(n / 1000))} thousand${n % 1000 ? `${n % 1000 < 100 ? ' and ' : ' '}${words(n % 1000)}` : ''}`;
  };
  const sayN = (x, d = 2) => {
    const [a, b] = Math.abs(x).toFixed(d).split('.');
    return `${x < 0 ? 'minus ' : ''}${words(+a)}${b ? ` point ${b.split('').map((c) => ONES[+c]).join(' ')}` : ''}`;
  };
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  // a formula parked at the top while a picture or numbers explain it
  const TOP = (m, y = -335, s = 0.6) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, s), A.Set(m, { o: 1 }));
  // a side note in the "because" style, for layouts with a picture beside it
  const side = (S, str, x, y, w = 760, size = 34) => S.english(str, { size, color: C.GREY_B, italic: true, width: w }).at(x, y);
  const fade = (ms, dur = 0.6) => par(ms.filter(Boolean).map((m) => A.FadeOut(m, { dur })));
  const boxOf = (S, m, color, y = m.init.y) => S.add(S.rect(m.w + 80, m.h + 50, { stroke: color, width: 4, rx: 12 }).at(0, y));

  /* ---------------------------------------------------------- symbols of this chapter */
  FILM.addSymbol('c9rh', 'reward', '\\hat r_{\\th}', 'the implicit reward', 'β times the log-ratio of the policy to the reference, for one response', 'it plays the reward model’s part: the DPO loss is chapter 7’s loss with this as the score');
  FILM.addSymbol('c9gap', 'reward', '\\Delta', 'the implicit-reward gap', 'the winner’s implicit reward minus the loser’s', 'the loss only ever looks at this difference, as in chapter 7');
  FILM.addSymbol('c9L', 'data', '\\mathcal{L}_{\\mathrm{DPO}}', 'the DPO loss', 'minus the log of the chance the policy gives to each choice people made, averaged', 'pushing it down makes the policy agree with the choices people made');
  FILM.addSymbol('c9D', 'data', '\\mathcal{D}', 'the comparisons', 'a prompt, the response a person preferred and the one they rejected; collected once, in advance', 'DPO learns from this fixed pile, and nothing else');
  const RH = '\\cReward{c9rh}{\\hat r_{\\th}}';
  const GAP = '\\cReward{c9gap}{\\Delta}';
  const LD = '\\cData{c9L}{\\mathcal{L}_{\\mathrm{DPO}}}';
  const DD = '\\cData{c9D}{\\mathcal{D}}';
  // the log-ratio of a policy P to the reference, for response y
  const LR = (P, y) => `\\log \\frac{${P}(${y} \\mid \\xx)}{\\pref(${y} \\mid \\xx)}`;
  // the preference probability written with policy P
  const PREF = (P, lhs) => `${lhs} \\;=\\; \\sig\\Big(\\bt\\, ${LR(P, '\\yw')} \\;-\\; \\bt\\, ${LR(P, '\\yl')}\\Big)`;

  /* ---------------------------------------------------------- the numbers (kernel: src/js/rl.js) */
  // chapter 8's leash toy: four kinds of answer, a reference, a reward; beta = 1/2
  const REF = LEASH.ref;
  const R = LEASH.r;
  const NAMES = LEASH.labels;
  const B = DPO.beta;
  const PS = DPO.star; // pi*, the tilt of the reference at beta
  const bLogZ = B * RL.logPartition(REF, R, B);
  const Zval = Math.exp(RL.logPartition(REF, R, B));
  const IMP = PS.map((p, i) => B * Math.log(p / REF[i])); // implicit rewards of pi*
  // one comparison: helpful beats rude
  const IW = 1;
  const IL = 2;
  const sig = RL.sigmoid;
  const lossOf = (gap) => -RL.logSigmoid(gap);
  const gapStar = IMP[IW] - IMP[IL];
  // one gradient step on that pair, starting from the reference (logits = log pi_ref)
  const ETA = 2;
  const W0 = sig(0); // the weight sigma(-gap) at gap 0
  const z1 = REF.map(Math.log);
  z1[IW] += ETA * B * W0;
  z1[IL] -= ETA * B * W0;
  const P1 = RL.softmax(z1);
  const IMP1 = P1.map((p, i) => B * Math.log(p / REF[i]));
  const gap1 = IMP1[IW] - IMP1[IL];
  const W1 = sig(-gap1);
  // DPO on every pair, preferences drawn from the true reward (rl.js dpoTrain)
  const SNAP = [0, 3, 10, 30, 100].map((s) => {
    const pi = s === 0 ? REF.slice() : RL.dpoTrain(REF, R, B, { steps: s, lr: 2 }).pi;
    return { step: s, pi, kl: RL.kl(pi, PS) };
  });
  const KLend = RL.kl(DPO.run.pi, PS);
  const STEPS_END = DPO.run.trace[DPO.run.trace.length - 1].step;
  // the winner can fall (toy implicit rewards)
  const FW = -0.3;
  const FL = -1.5;
  const fallFactor = Math.exp(FW / B);

  /* =========================================================== CHAPTER 9 */
  video.chapter('ch9', 'DPO');
  card(9, 'DPO: the reward model was inside the policy');

  /*
   * From chapter 8's optimum to a reward written with policies: take logs,
   * solve for r. Then Bradley-Terry on two responses to one prompt: the
   * uncomputable beta log Z(x) cancels.
   */
  video.scene('dpo', 'Direct preference optimization', (S) => {
    const h = S.add(S.title('Solve for the reward'));

    // 1. why: the RLHF recipe has many moving parts
    const PY = -150;
    const stages = [
      S.add(S.box('comparisons', { w: 330, h: 120, color: C.GREY_B, size: 38 }).at(-690, PY)),
      S.add(S.box('reward model', { w: 330, h: 120, color: S.color('rr'), size: 38 }).at(-230, PY)),
      S.add(S.box('PPO + KL leash', { w: 380, h: 120, color: S.color('grad'), size: 38, sub: 'sample · score · critic' }).at(240, PY)),
      S.add(S.box('policy', { w: 260, h: 120, color: S.color('pt'), size: 38 }).at(690, PY)),
    ];
    const links = [[-515, -405], [-55, 40], [440, 550]].map(([a, b]) => S.add(S.arrow(a, PY, b, PY, { color: C.GREY_B, width: 4 })));
    const NX = [-570, -190, 190, 570];
    const nets = [['\\pt', 'the policy'], ['\\pref', 'its frozen reference'], ['\\rr_{\\cParams{c9phi}{\\phi}}', 'the reward model'], ['\\VV', 'the critic']]
      .map(([t, l], i) => S.add(S.group(new Tex(t, { size: 66 }).at(0, -20), new Text(l, { size: 32, color: C.GREY_B }).at(0, 50)).at(NX[i], 60)));
    const arc = S.add(S.path('M -690 -218 C -350 -400 350 -400 690 -218', { stroke: S.color('pt'), width: 4, dash: '16 14' }).with({ draw: 0 }));
    const qm = S.add(S.tex('?', { size: 64, color: S.color('pt') }).at(0, -300));
    const ask = S.add(S.english('could we skip the middle, and fit the {policy|pt} straight to the comparisons?', { size: 42 }).at(0, 250));
    S.beat('Recall R L H F. Fit a reward model to people’s comparisons, then run P P O against it, on a K L leash. That is four networks at once, and a lot of sampling. Could we skip the middle, and fit the policy straight to the comparisons?',
      A.FadeIn(h), lag(0.35, stages.map((m, i) => seq(A.FadeIn(m, { dx: -20, dur: 0.5 }), i < links.length ? A.Arrow(links[i], 0.3) : wait(0)))),
      lag(0.25, nets.map((m) => A.FadeIn(m, { dy: 16, dur: 0.6 }))), par(A.Create(arc, 1.2), A.FadeIn(qm)), S.writeIn(ask, 1.8),
      { cap: 'Recall RLHF. Fit a reward model to people’s comparisons, then run PPO against it, on a KL leash. That is four networks at once, and a lot of sampling. Could we skip the middle, and fit the policy straight to the comparisons?' });

    // 2. the way in: chapter 8's optimum, for each prompt
    const P0 = S.add(S.tex('\\pstar(\\yy \\mid \\xx) \\;=\\; \\frac{\\pref(\\yy \\mid \\xx)\\; e^{\\rr(\\xx, \\yy)/\\bt}}{\\ZZ(\\xx)}', { size: 84 }).at(0, -140));
    const Zd = S.add(S.tex('\\ZZ(\\xx) \\;=\\; \\sum_{\\yy} \\pref(\\yy \\mid \\xx)\\; e^{\\rr(\\xx, \\yy)/\\bt}', { size: 56 }).at(0, 60));
    const r2 = S.add(S.reason('because: chapter 8: the best {policy|pp} for {reward|rr} minus {β|bt} × {KL|KL}, worked out for each prompt {x|xx} on its own'));
    S.beat('The way in is chapter eight’s exact best policy for the leashed objective: pi star. For each prompt x, it is the reference, with each response reweighted by e to its reward over beta, divided by the total, Z.',
      fade([...stages, ...links, ...nets, arc, qm, ask]), A.Write(P0, 2), A.Write(Zd, 1.4), S.writeIn(r2, 1.6),
      { cap: 'The way in is chapter 8’s exact best policy for the leashed objective: π*. For each prompt x, it is the reference, with each response reweighted by e to its reward over β, divided by the total, Z.' });
    S.tour(Zd, [
      { sym: ['ZZ', 'xx'], card: 'ZZ', at: [0, 262], anims: [A.FadeOut(r2)],
        text: { w: 1400, from: 'every possible response to x, reweighted and added up', why: 'it depends on the prompt x but not on the response y; and it is far too big a sum to compute' },
        say: 'Two things about Z. It sums over every possible response, far too many to ever add up. And it depends on the prompt x, but not on the response y.' },
    ]);

    // 3. read it backwards
    const e4a = S.add(S.english('chapter 8:   a {reward|rr}  →  the {best policy|pstar}', { size: 44 }).at(0, 110));
    const e4b = S.add(S.english('now:   the {best policy|pstar}  →  its {reward|rr}', { size: 44 }).at(0, 200));
    S.paper('rafailov2023');
    S.beat('Chapter eight read this formula one way: from a reward, the best policy. In twenty twenty-three, Rafailov and colleagues read it the other way: from the best policy, its reward. Solve for r.',
      S.endTour(Zd), A.FadeOut(Zd), A.Spot(P0, ['rr', 'pstar']), S.writeIn(e4a, 1.4), wait(0.5), S.writeIn(e4b, 1.4),
      { cap: 'Chapter 8 read this formula one way: from a reward, the best policy. In 2023, Rafailov and colleagues read it the other way: from the best policy, its reward. Solve for r.' });

    // 4. take logs
    const E1 = S.add(S.tex('\\log \\pstar(\\yy \\mid \\xx) \\;=\\; \\log \\pref(\\yy \\mid \\xx) \\;+\\; \\frac{\\rr(\\xx, \\yy)}{\\bt} \\;-\\; \\log \\ZZ(\\xx)', { size: 76 }).at(0, -60));
    const r5 = S.add(S.reason('because: the log of a product is a sum, the log of a quotient a difference, and log eᵘ = u'));
    S.beat('Take the log of both sides. The product becomes a sum, the division a subtraction, and the log of e to the reward over beta is just the reward over beta.',
      A.Unspot(P0), fade([e4a, e4b]), UP(P0), A.Write(E1, 2), S.writeIn(r5, 1.6));

    // 5. the reward on its own
    const E2 = S.add(S.tex('\\frac{\\rr(\\xx, \\yy)}{\\bt} \\;=\\; \\log \\pstar(\\yy \\mid \\xx) \\;-\\; \\log \\pref(\\yy \\mid \\xx) \\;+\\; \\log \\ZZ(\\xx)', { size: 76 }).at(0, 150));
    const r6 = S.add(S.reason('because: move {the reference’s log|pref} and {log Z|ZZ} to the other side; each changes sign as it crosses'));
    S.beat('Now get the reward on its own. Move log pi ref and log Z across to the other side. Each changes sign as it crosses.',
      A.FadeOut(r5), A.Write(E2, 2), S.writeIn(r6, 1.4),
      { cap: 'Now get the reward on its own. Move log π_ref and log Z across to the other side. Each changes sign as it crosses.' });

    // 6. multiply by beta: the reward, in terms of policies
    const E3 = S.add(S.tex(`\\rr(\\xx, \\yy) \\;=\\; \\bt\\, ${LR('\\pstar', '\\yy')} \\;+\\; \\bt \\log \\ZZ(\\xx)`, { size: 84 }).at(0, -60));
    const box7 = boxOf(S, E3, S.color('rr'));
    const r7 = S.add(S.reason('because: multiply both sides by {β|bt}; and log a − log b = log (a / b)'));
    S.beat('Multiply both sides by beta, and write the difference of logs as the log of a ratio. There it is: the reward, written with the best policy and the reference, plus one more term.',
      fade([r6, P0, E1]), UP(E2), A.Write(E3, 2.2), A.Create(box7, 0.8), S.writeIn(r7, 1.4));

    // 7. read it
    const e8 = S.add(S.english('the {reward|rr} of a response = {β|bt} × the log of how many times likelier {the best policy|pstar} makes it than {the reference|pref}, + {one number for the whole prompt|ZZ}', { size: 40, width: 1500 }).at(0, 170));
    S.beat('In words: a response’s reward is beta, times the log of how many times likelier the best policy makes it than the reference, plus one number shared by every response to this prompt.',
      fade([r7, E2]), A.Spot(E3, ['pstar', 'pref', 'ZZ', 'bt']), S.writeIn(e8, 2.6));

    // 8. check it on chapter 8's toy
    const toy = S.add(S.toy(760, -400));
    const CX = [-120, 170, 450, 730];
    const RY = { a: -228, ref: -160, st: -92, lr: -10, z: 80, r: 165 };
    const rowLab = (tex, y) => {
      const m = S.add(S.tex(tex, { size: 44 }));
      return m.at(-330 - m.w / 2, y);
    };
    const labs = [
      rowLab('\\text{answer}', RY.a), rowLab('\\pref(\\yy)', RY.ref), rowLab('\\pstar(\\yy)', RY.st),
      rowLab('\\bt \\log \\frac{\\pstar(\\yy)}{\\pref(\\yy)}', RY.lr), rowLab('+\\; \\bt \\log \\ZZ', RY.z), rowLab('=\\; \\rr(\\yy)', RY.r),
    ];
    const cell = (str, i, y, color) => S.add(S.txt(str, { size: 38, font: 'mono', color }).at(CX[i], y));
    const cA = NAMES.map((l, i) => S.add(S.txt(l, { size: 38 }).at(CX[i], RY.a)));
    const cRef = REF.map((v, i) => cell(v.toFixed(2), i, RY.ref, S.color('pref')));
    const cSt = PS.map((v, i) => cell(v.toFixed(2), i, RY.st, S.color('pstar')));
    const cLr = IMP.map((v, i) => cell(num(v), i, RY.lr, C.WHITE));
    const cZ = IMP.map((_, i) => cell(sgn(bLogZ), i, RY.z, S.color('ZZ')));
    const cR = IMP.map((v, i) => cell((v + bLogZ).toFixed(2), i, RY.r, S.color('rr')));
    const rule = S.add(S.line(-640, RY.r - 40, 860, RY.r - 40, { stroke: C.GREY, width: 3 }));
    const n8 = S.add(S.english(`{β|bt} = ${B},  {Z|ZZ} = ${Zval.toFixed(2)}:  out come exactly chapter 8’s {rewards|rr}`, { size: 36, color: C.GREY_B, italic: true }).at(0, 262));
    const table = [toy, ...labs, ...cA, ...cRef, ...cSt, ...cLr, ...cZ, ...cR, rule, n8];
    S.beat(`Check it on chapter eight’s four answers, with beta one half. Beta times the log-ratio, plus the same beta log Z, ${sayN(bLogZ)}, gives back exactly the rewards we started from.`,
      fade([e8]), A.Unspot(E3), par(TOP(E3), TOP(box7)), A.FadeIn(toy),
      lag(0.12, [...labs.slice(0, 3), ...cA, ...cRef, ...cSt].map((m) => A.FadeIn(m))), lag(0.15, [labs[3], ...cLr].map((m) => A.FadeIn(m))), lag(0.15, [labs[4], ...cZ].map((m) => A.FadeIn(m))),
      A.Create(rule, 0.5), lag(0.15, [labs[5], ...cR].map((m) => A.FadeIn(m, { from: 1.3 }))), S.writeIn(n8, 1.4),
      { cap: `Check it on chapter 8’s four answers, with β = 1/2. β times the log-ratio, plus the same β log Z, ${bLogZ.toFixed(2)}, gives back exactly the rewards we started from.` });

    // 9. the obstacle, and Bradley-Terry
    const BT = S.add(S.tex('P(\\yw \\succ \\yl \\mid \\xx) \\;=\\; \\sig\\big(\\rr(\\xx, \\yw) - \\rr(\\xx, \\yl)\\big)', { size: 84 }).at(0, -60));
    const e10 = S.add(S.english('but {Z(x)|ZZ} is a sum over every response: we cannot compute it', { size: 40, color: C.GREY_B }).at(0, 110));
    const e11 = S.add(S.english('and people never hand us a {reward|rr}: they pick the better of two {responses|yy}', { size: 40 }).at(0, 180));
    const r11 = S.add(S.reason('because: chapter 7: Bradley-Terry: the chance depends only on the gap between the two {rewards|rr}'));
    S.beat('But this still needs Z of x, which we can never compute. And people never hand us rewards anyway. They compare two responses to one prompt, and by Bradley-Terry, only the gap between the rewards matters.',
      fade([...table, E3, box7]), A.Write(BT, 2), S.writeIn(e10, 1.6), S.writeIn(e11, 1.8), S.writeIn(r11, 1.4));

    // 10. both rewards, one prompt: the same beta log Z
    const SUB = S.add(S.tex(`\\begin{aligned} \\rr(\\xx, \\yw) &= \\bt\\, ${LR('\\pstar', '\\yw')} \\;+\\; \\cData{c9z}{\\bt \\log \\ZZ(\\xx)} \\\\[4pt] \\rr(\\xx, \\yl) &= \\bt\\, ${LR('\\pstar', '\\yl')} \\;+\\; \\cData{c9z}{\\bt \\log \\ZZ(\\xx)} \\end{aligned}`, { size: 56 }).at(0, -78));
    const r12 = S.add(S.reason('because: our formula holds for every response; both answer the same prompt {x|xx}, so both get the same {β log Z(x)|ZZ}'));
    S.beat('So write each of the two rewards with our new formula. Both responses answer the same prompt, x. So both carry exactly the same extra term: beta log Z of x.',
      fade([e10, e11, r11]), UP(BT), A.Write(SUB, 2.4), A.Spot(SUB, 'c9z'), S.writeIn(r12, 1.6));

    // 11. subtract: it cancels
    const DIFF = S.add(S.tex(`\\rr(\\xx, \\yw) - \\rr(\\xx, \\yl) \\;=\\; \\bt\\, ${LR('\\pstar', '\\yw')} \\;-\\; \\bt\\, ${LR('\\pstar', '\\yl')}`, { size: 56 }).at(0, 176));
    const r13 = S.add(S.reason('because: subtract the two lines: {β log Z(x)|ZZ} − {β log Z(x)|ZZ} = 0'));
    S.beat('Bradley-Terry only needs the difference. Subtract the lines, and the two copies of beta log Z cancel. The one thing we could not compute is gone.',
      A.FadeOut(r12), A.Write(DIFF, 2.2), S.writeIn(r13, 1.4));

    // 12. the preference, with no reward and no Z
    const PB = S.add(S.tex(PREF('\\pstar', 'P(\\yw \\succ \\yl \\mid \\xx)'), { size: 62 }).at(0, -60));
    const box14 = boxOf(S, PB, S.color('pstar'));
    S.beat('Put the difference into the sigmoid. The chance that people prefer y w now has no reward and no Z in it: only the best policy and the reference.',
      A.Unspot(SUB), fade([BT, SUB, DIFF, r13]), A.Write(PB, 2.4), A.Create(box14, 0.8),
      { cap: 'Put the difference into the sigmoid. The chance that people prefer y_w now has no reward and no Z in it: only the best policy and the reference.' });
    const e15 = S.add(S.english('people prefer {the winner|yw} when {the best policy|pstar} boosts it more than {the loser|yl}: each boost measured against {the reference|pref}', { size: 42, width: 1700 }).at(0, 160));
    S.beat('As a sentence: people prefer y w when the best policy boosts it, relative to the reference, by more than it boosts y l. The bigger the difference, the surer the choice.',
      S.writeIn(e15, 2.4),
      { cap: 'As a sentence: people prefer y_w when the best policy boosts it, relative to the reference, by more than it boosts y_l. The bigger the difference, the surer the choice.' });
  });

  /*
   * Put pi_theta where pi* was and fit it by maximum likelihood, as the
   * reward model was fitted in chapter 7: the DPO loss, its symbols, the
   * implicit reward, and the loss on one comparison of the toy.
   */
  video.scene('c9-loss', 'The DPO loss', (S) => {
    const h = S.add(S.title('A loss for the policy itself'));

    // 1. pi* is unknown: the policy takes its place
    const PB = S.add(S.tex(PREF('\\pstar', 'P(\\yw \\succ \\yl \\mid \\xx)'), { size: 62 }).at(0, -275).with({ s: 0.72 }));
    const PT = S.add(S.tex(PREF('\\pt', 'P_{\\th}(\\yw \\succ \\yl \\mid \\xx)'), { size: 62 }).at(0, -60));
    const r1 = S.add(S.reason('because: {π*|pstar} is unknown: it is what we want. So the {policy we train|pt} takes its place'));
    S.beat('One unknown is left: pi star, which is exactly what we want to find. So let the policy we are training, pi theta, take its place. Now every choice people made gets a probability from our policy.',
      A.FadeIn(h), seq(A.FadeIn(PB), A.Set(PB, { o: 0.5 }, 0.4)), A.Write(PT, 2.2), A.Spot(PT, 'pt'), S.writeIn(r1, 1.6),
      { cap: 'One unknown is left: π*, which is exactly what we want to find. So let the policy we are training, π_θ, take its place. Now every choice people made gets a probability from our policy.' });

    // 2. maximum likelihood, as in chapter 7
    const L = S.add(S.tex(`${LD}(\\th) \\;=\\; -\\,\\EE_{(\\xx, \\yw, \\yl) \\sim ${DD}}\\Big[\\log \\sig\\Big(\\bt\\, ${LR('\\pt', '\\yw')} \\;-\\; \\bt\\, ${LR('\\pt', '\\yl')}\\Big)\\Big]`, { size: 53 }).at(0, -60));
    const boxL = boxOf(S, L, S.color('pt'));
    const r2 = S.add(S.reason('because: chapter 7’s recipe: make people’s actual choices as likely as possible; take logs, flip the sign, average'));
    S.beat('Then fit it as chapter seven fitted the reward model: make people’s actual choices as likely as possible. Take logs, flip the sign, and average. That is the D P O loss: small when the policy agrees with people.',
      A.Unspot(PT), fade([PB, r1]), UP(PT), A.Write(L, 2.6), A.Create(boxL, 0.8), S.writeIn(r2, 1.6),
      { cap: 'Then fit it as chapter 7 fitted the reward model: make people’s actual choices as likely as possible. Take logs, flip the sign, and average. That is the DPO loss: small when the policy agrees with people.' });
    S.tour(L, [
      { sym: ['c9D', 'yw', 'yl'], card: 'c9D', at: [0, 215], anims: [A.FadeOut(r2), A.FadeOut(PT)],
        say: 'Curly D is the pile of comparisons: a prompt, the preferred response y w, and the rejected y l. It is collected once, before training starts.',
        cap: '𝓓 is the pile of comparisons: a prompt, the preferred response y_w, and the rejected y_l. It is collected once, before training starts.' },
      { sym: ['pt', 'pref'], card: 'pref', at: [0, 215], text: { w: 1100, why: 'each log-ratio says how far training has moved one response away from it; before training, every log-ratio is zero' },
        say: 'Inside are the K L leash’s log-ratios: how many times likelier the policy makes a response than the frozen reference. Before training, every log-ratio is zero.',
        cap: 'Inside are the KL leash’s log-ratios: how many times likelier the policy makes a response than the frozen reference. Before training, every log-ratio is zero.' },
      { sym: 'bt', at: [0, 215], text: { w: 1100, why: 'the same leash strength as in RLHF: DPO aims at the same π*, so a small β lets the policy stray far from the reference' },
        say: 'And beta is R L H F’s leash strength. D P O aims at the same pi star, so a small beta lets the policy stray far from the reference.',
        cap: 'And β is RLHF’s leash strength. DPO aims at the same π*, so a small β lets the policy stray far from the reference.' },
    ]);

    // 3. the implicit reward: chapter 7's loss, letter for letter
    const IR = S.add(S.tex(`${RH}(\\xx, \\yy) \\;=\\; \\bt\\, ${LR('\\pt', '\\yy')}`, { size: 80 }).at(0, -205));
    const LC = S.add(S.tex(`${LD}(\\th) \\;=\\; -\\,\\EE_{${DD}}\\Big[\\log \\sig\\big(${RH}(\\xx, \\yw) - ${RH}(\\xx, \\yl)\\big)\\Big]`, { size: 72 }).at(0, 20));
    const boxC = boxOf(S, LC, S.color('rr'));
    const r3 = S.add(S.reason('because: call {β|bt} × the log-ratio the {implicit reward|c9rh}; then the loss is chapter 7’s reward-model loss, with it as the score'));
    S.beat('Name beta times the log-ratio r hat theta: the implicit reward. Then the D P O loss is chapter seven’s reward-model loss, letter for letter, with r hat theta as the score.',
      S.endTour(L), fade([L, boxL]), A.Write(IR, 1.8), A.Write(LC, 2), A.Create(boxC, 0.8), S.writeIn(r3, 1.6),
      { cap: 'Name β times the log-ratio r̂_θ: the implicit reward. Then the DPO loss is chapter 7’s reward-model loss, letter for letter, with r̂_θ as the score.' });
    S.tour(IR, [
      { sym: 'c9rh', at: [0, 240], anims: [A.FadeOut(r3)], text: { w: 1300, from: 'β times the log-ratio of the policy to the reference', why: 'it plays the reward model’s part: the loss is chapter 7’s, with this as the score' },
        say: 'In the words of the paper’s title: your language model is secretly a reward model. Its own probabilities, against the reference, already score every response.' },
    ]);
    const e4 = S.add(S.english('the {DPO loss|c9L}: over people’s {comparisons|c9D}, minus the log of the {chance|sig} the {implicit rewards|c9rh} give to the choice they made', { size: 40, width: 1500 }).at(0, 215));
    S.beat('In a sentence: averaged over people’s comparisons, minus the log of the chance the implicit rewards give to the choice people made.',
      S.endTour(IR), S.writeIn(e4, 2.4));

    // 4. one comparison of the toy, three policies
    const toy = S.add(S.toy(760, -400));
    const pair = S.add(S.tex('\\yw = \\text{helpful} \\;\\succ\\; \\yl = \\text{rude}, \\qquad \\bt = 0.5', { size: 50 }).at(0, -235));
    const COL = [-560, -230, 70, 380, 680];
    const HY = -140;
    const heads = ['\\pt', `${RH}(\\yw)`, `${RH}(\\yl)`, 'P_{\\th}(\\yw \\succ \\yl)', '\\text{loss}'].map((t, i) => S.add(S.tex(t, { size: 42 }).at(COL[i], HY)));
    const hrule = S.add(S.line(-760, HY + 45, 860, HY + 45, { stroke: C.GREY, width: 3 }));
    const rowsData = [
      ['\\pt = \\pref', 0, 0, 'at the start: a coin flip'],
      ['\\pt = \\pstar', IMP[IW], IMP[IL], 'at π*: agrees with the choice'],
      ['\\text{reversed}', IMP[IL], IMP[IW], 'what if it ranked them the wrong way?'],
    ];
    const rows = rowsData.map(([lab, w, l, note], i) => {
      const y = HY + 110 + i * 120;
      const g = S.add(S.group(
        new Tex(lab, { size: 44 }).at(COL[0], 0),
        new Text(num(w), { size: 40, font: 'mono', color: S.color('c9rh') }).at(COL[1], 0),
        new Text(num(l), { size: 40, font: 'mono', color: S.color('c9rh') }).at(COL[2], 0),
        new Text(sig(w - l).toFixed(2), { size: 40, font: 'mono' }).at(COL[3], 0),
        new Text(lossOf(w - l).toFixed(2), { size: 40, font: 'mono', color: S.color('c9L') }).at(COL[4], 0),
        new Text(note, { size: 30, color: C.GREY_B, italic: true }).at(COL[2] + 150, 46)
      ).at(0, y));
      return g;
    });
    S.beat(`One comparison from the toy: helpful beat rude. At the start, both implicit rewards are zero: a coin flip, and a loss of ${sayN(Math.log(2))}. At pi star they are ${sayN(IMP[IW])} and ${sayN(IMP[IL])}, and the loss falls to ${sayN(lossOf(gapStar))}. Ranked the wrong way round: ${sayN(lossOf(-gapStar))}.`,
      fade([e4, IR, boxC]), TOP(LC, -340, 0.62), A.FadeIn(toy), A.Write(pair, 1.2), lag(0.12, heads.map((m) => A.FadeIn(m))), A.Create(hrule, 0.5),
      lag(2.2, rows.map((r) => A.FadeIn(r, { dx: 20 }))), A.Indicate(rows[2], { color: C.RED, scale: 1.03 }),
      { cap: `One comparison from the toy: helpful beat rude. At the start, both implicit rewards are zero: a coin flip, and a loss of ${Math.log(2).toFixed(2)}. At π* they are ${num(IMP[IW])} and ${num(IMP[IL])}, and the loss falls to ${lossOf(gapStar).toFixed(2)}. Ranked the wrong way round: ${lossOf(-gapStar).toFixed(2)}.` });
  });

  /*
   * The gradient of the DPO loss, by the chain rule: the slope of
   * -log sigma (chapter 7) times the gradient of the gap. Winner up, loser
   * down, weighted by how wrong the implicit reward model is. One step on
   * the toy.
   */
  video.scene('dpograd', 'What DPO pushes', (S) => {
    const h = S.add(S.title('Which way does DPO push?'));

    // 1. why, and the gap
    const q = S.add(S.english('training follows the slope of the loss: which {responses|yy} go up, which go down, and how hard?', { size: 42, width: 1600 }).at(0, -260));
    const G0 = S.add(S.tex(`\\ell \\;=\\; -\\log \\sig(${GAP}), \\qquad ${GAP} \\;=\\; ${RH}(\\xx, \\yw) - ${RH}(\\xx, \\yl)`, { size: 76 }).at(0, -60));
    S.beat('Training follows the slope of the loss. Which responses go up, which down, and how hard? One comparison costs ell: minus log sigma of the gap between its two implicit rewards.',
      A.FadeIn(h), S.writeIn(q, 2), A.Write(G0, 2));
    S.tour(G0, [
      { sym: 'c9gap', at: [0, 200], anims: [A.FadeOut(q)],
        say: 'Call that gap delta, as in chapter seven: the winner’s implicit reward minus the loser’s. Positive means the policy already ranks the pair the way people did.' },
    ]);

    // 2. slope in the gap
    const D1 = S.add(S.tex(`\\frac{d\\ell}{d${GAP}} \\;=\\; -\\big(1 - \\sig(${GAP})\\big) \\;=\\; -\\sig(-${GAP})`, { size: 80 }).at(0, -60));
    const r2 = S.add(S.reason('because: chapter 7: the slope of −log σ is −(1 − σ); and 1 − σ(Δ) = σ(−Δ): the sigmoid is symmetric about its middle'));
    S.beat('Chapter seven found this slope: minus, one minus sigma of delta. And one minus sigma of delta equals sigma of minus delta: the sigmoid is symmetric about its middle.',
      S.endTour(G0), UP(G0), A.Write(D1, 2), S.writeIn(r2, 1.8),
      { cap: 'Chapter 7 found the slope of −log σ: −(1 − σ(Δ)). And 1 − σ(Δ) = σ(−Δ), because the sigmoid is symmetric about its middle.' });

    // 3. gradient of the gap
    const D2 = S.add(S.tex(`\\grad ${GAP} \\;=\\; \\bt\\, \\grad \\lp(\\yw \\mid \\xx) \\;-\\; \\bt\\, \\grad \\lp(\\yl \\mid \\xx)`, { size: 76 }).at(0, 130));
    const r3 = S.add(S.reason('because: each log-ratio is {log of the policy|lp} − {log of the reference|pref}; the reference is frozen, so its gradient is zero; {β|bt} is a fixed number'));
    S.beat('How does delta move with the weights? Each log-ratio is log pi theta minus log pi ref. The reference is frozen, so it has no gradient. What is left: beta, times the winner’s gradient of log pi, minus the loser’s.',
      A.FadeOut(r2), A.Write(D2, 2), S.writeIn(r3, 1.8));

    // 4. the chain rule: the gradient of the DPO loss
    const GD = S.add(S.tex(`\\grad ${LD} \\;=\\; -\\bt\\; \\EE_{${DD}}\\Big[\\cData{c9wt}{\\sig\\big(${RH}(\\xx, \\yl) - ${RH}(\\xx, \\yw)\\big)}\\, \\big(\\grad \\lp(\\yw \\mid \\xx) - \\grad \\lp(\\yl \\mid \\xx)\\big)\\Big]`, { size: 50 }).at(0, -60));
    const boxG = boxOf(S, GD, S.color('grad'));
    const r4 = S.add(S.reason('because: the chain rule: the slope in {Δ|c9gap} × the gradient of {Δ|c9gap}; average over the comparisons; and −{Δ|c9gap} = the loser’s {implicit reward|c9rh} − the winner’s'));
    S.beat('The chain rule multiplies the two slopes. Average over the comparisons, and write minus delta as the loser’s implicit reward minus the winner’s. That is the gradient of the D P O loss.',
      fade([r3, G0]), UP(D1), A.FadeOut(D2), A.Write(GD, 2.6), A.Create(boxG, 0.8), S.writeIn(r4, 1.8));

    // 5. read it: direction
    const e5 = S.add(S.english('a step goes against the gradient: {the winner’s log-probability|pt} goes up, {the loser’s|pt} goes down', { size: 40, width: 1600 }).at(0, 120));
    const e5b = S.add(S.english('for text: every token of the winner up, every token of the loser down (chapter 3)', { size: 34, color: C.GREY_B, italic: true }).at(0, 195));
    S.beat('Training steps against the gradient, so the minus sign flips: each step raises the winner’s log-probability and lowers the loser’s. For text, that means every one of their tokens.',
      fade([r4, D1]), A.Spot(GD, ['grad', 'lp', 'yw', 'yl']), S.writeIn(e5, 2), S.writeIn(e5b, 1.6));

    // 6. read it: the weight, and the whole update in one line
    const e6 = S.add(S.english('the weight: the {chance|sig} the {implicit reward model|c9rh} gives to the wrong outcome, the loser beating the winner', { size: 40, width: 1600 }).at(0, 105));
    const sumB = S.add(S.box('push the winner up and the loser down,  ×  how wrong the implicit reward model still is', { w: 1640, h: 100, color: S.color('grad'), size: 38 }).at(0, 225));
    S.beat('The weight in front is the chance the implicit reward model gives to the wrong outcome: the loser winning. So D P O pushes the winner up and the loser down, weighted by how wrong its implicit reward model still is.',
      fade([e5, e5b]), A.Spot(GD, 'c9wt'), S.writeIn(e6, 2), A.FadeIn(sumB, { from: 0.9 }));

    // 7. the weight, with numbers
    const AX = -330;
    const AY = 60;
    const ax = S.add(S.axes({ x0: -4, x1: 4, y0: 0, y1: 1, w: 820, h: 360, xticks: [-4, -2, 0, 2, 4], yticks: [0, 0.5, 1], xlabel: 'gap Δ', ylabel: 'weight σ(−Δ)' }).at(AX, AY));
    const wc = ax.plot((t) => sig(-t), { color: C.WHITE, width: 7 });
    const ex = [2, 0, -2];
    const pts = ex.map((t) => S.add(S.dot(13, S.color('c9rh')).at(AX + ax.fx(t), AY + ax.fy(sig(-t)))));
    const wrows = [
      [ex[0], 'already ranked right'],
      [ex[1], 'a tie'],
      [ex[2], 'ranked the wrong way'],
    ].map(([t, why], i) => S.add(S.group(
      new Tex(`${GAP} = ${t > 0 ? '+' : ''}${t}`, { size: 44 }).at(-120, 0),
      new Text(`weight ${sig(-t).toFixed(2)}`, { size: 38, anchor: 'start' }).at(10, -18),
      new Text(why, { size: 32, color: C.GREY_B, italic: true, anchor: 'start' }).at(10, 24)
    ).at(560, -110 + i * 130)));
    S.beat(`With numbers: winner ahead by two, the weight is ${sayN(sig(-2))}: pairs already ranked right barely pull. A tie: one half. Behind by two: ${sayN(sig(2))}, almost the full push.`,
      fade([e6, sumB]), A.Unspot(GD), par(TOP(GD, -340, 0.62), TOP(boxG, -340, 0.62)), A.FadeIn(ax), A.Create(wc, 1.2), lag(0.8, pts.map((p, i) => par(A.FadeIn(p, { from: 2 }), A.FadeIn(wrows[i], { dx: 20 })))),
      { cap: `With numbers: winner ahead by two, the weight is ${sig(-2).toFixed(2)}: pairs already ranked right barely pull. A tie: one half. Behind by two: ${sig(2).toFixed(2)}, almost the full push.` });

    // 8. one step on the toy: the scores subtract to winner up, loser down
    const BX = -450;
    const BY = 270;
    const BH = 420;
    const bars = S.add(S.bars({ labels: NAMES, values: REF, color: S.color('pt'), h: BH, w: 120, gap: 80, labelFont: 'serif', labelSize: 36, showValues: false }).at(BX, BY));
    const refT = REF.map((p, i) => S.add(S.line(BX + bars.xs[i] - 75, BY - BH * p, BX + bars.xs[i] + 75, BY - BH * p, { stroke: S.color('pref'), width: 4, dash: '10 8' })));
    const toy = S.add(S.toy(BX, -230));
    const pairT = S.add(S.tex('\\yw = \\text{helpful} \\;\\succ\\; \\yl = \\text{rude}', { size: 44 }).at(440, -230));
    const SC = S.add(S.tex('\\frac{\\partial}{\\partial \\zz_j}\\big[\\lp(\\yw) - \\lp(\\yl)\\big] \\;=\\; \\mathbf{1}[j = \\yw] - \\mathbf{1}[j = \\yl]', { size: 38 }).at(440, -125));
    const n8 = S.add(side(S, 'each is chapter 3’s score, 1[a = j] − {π(j)|pt}; the {π(j)|pt} terms cancel, so only two {logits|zz} move', 440, -15, 780));
    S.beat('One step on chapter eight’s toy, for one comparison: helpful beats rude. The weights are the four logits. Subtract chapter three’s scores of the two responses: the pi terms cancel, and only two logits get a push.',
      fade([ax, wc, ...pts, ...wrows]), A.FadeIn(bars, { dy: 20 }), lag(0.1, refT.map((t) => A.Create(t, 0.4))), A.FadeIn(toy), A.Write(pairT, 1.2), A.Write(SC, 1.8), S.writeIn(n8, 1.6));

    // 9. the step
    const xw = BX + bars.xs[IW] + 95;
    const xl = BX + bars.xs[IL] + 95;
    const upA = S.add(S.arrow(xw, BY - BH * REF[IW], xw, BY - BH * REF[IW] - 110, { color: S.color('grad'), width: 6 }));
    const dnA = S.add(S.arrow(xl, BY - BH * REF[IL] - 20, xl, BY - BH * REF[IL] + 70, { color: S.color('grad'), width: 6 }));
    const s1 = S.add(S.tex(`\\text{start: } ${GAP} = 0, \\;\\; \\sig(-${GAP}) = ${W0.toFixed(2)}`, { size: 40 }).at(440, 110));
    const s2 = S.add(S.tex(`\\text{each logit moves } \\lr\\, \\bt\\, \\sig(-${GAP}) = ${ETA} \\times ${B} \\times ${W0.toFixed(2)} = ${(ETA * B * W0).toFixed(2)}`, { size: 38 }).at(440, 185));
    const s3 = S.add(S.tex(`\\text{after: } ${GAP} = ${gap1.toFixed(2)}, \\;\\; \\sig(-${GAP}) = ${W1.toFixed(2)}`, { size: 40 }).at(440, 260));
    const s4 = S.add(S.txt(`helpful ${REF[IW].toFixed(2)} → ${P1[IW].toFixed(2)},  rude ${REF[IL].toFixed(2)} → ${P1[IL].toFixed(2)}`, { size: 34, font: 'mono', color: S.color('pt') }).at(440, 30));
    S.beat(`At the start delta is zero, so the weight is one half. A step of size two moves both logits by a half: helpful rises to ${sayN(P1[IW])}, rude falls to ${sayN(P1[IL])}. The next step pulls less: the weight is now ${sayN(W1)}.`,
      A.FadeOut(n8), A.Write(s1, 1.2), A.Write(s2, 1.4), par(A.Arrow(upA, 0.6), A.Arrow(dnA, 0.6)), par(bars.to(P1, 1.6), A.FadeIn(s4, { dur: 1.2 })), A.Write(s3, 1.2),
      { cap: `At the start Δ is zero, so the weight is one half. A step of size 2 moves both logits by a half: helpful rises to ${P1[IW].toFixed(2)}, rude falls to ${P1[IL].toFixed(2)}. The next step pulls less: the weight is now ${W1.toFixed(2)}.` });
  });

  /*
   * With unlimited Bradley-Terry comparisons the loss is lowest at pi*:
   * matching chances, matching gaps, rewards up to a shift, normalise.
   * Checked on the toy; then what DPO gives up.
   */
  video.scene('dpoconv', 'Same destination', (S) => {
    const h = S.add(S.title('Does DPO land where RLHF lands?'));

    // 1. the question, with unlimited comparisons
    const q = S.add(S.english('swap {π*|pstar} for {the policy we train|pt} and minimise the {loss|c9L}: do we really reach {π*|pstar}?', { size: 42 }).at(0, -270));
    const C1 = S.add(S.tex(`\\begin{aligned} \\text{people:} &\\quad P(\\yy \\succ \\yy' \\mid \\xx) = \\sig\\big(\\rr(\\xx, \\yy) - \\rr(\\xx, \\yy')\\big) \\\\[6pt] \\text{policy:} &\\quad P_{\\th}(\\yy \\succ \\yy' \\mid \\xx) = \\sig\\big(${RH}(\\xx, \\yy) - ${RH}(\\xx, \\yy')\\big) \\end{aligned}`, { size: 62 }).at(0, -60));
    S.beat('Does minimising this loss really lead to pi star? Suppose comparisons never run out: every pair of responses, compared again and again, by people who choose with Bradley-Terry odds.',
      A.FadeIn(h), S.writeIn(q, 2), A.Write(C1, 2.4),
      { cap: 'Does minimising this loss really lead to π*? Suppose comparisons never run out: every pair of responses, compared again and again, by people who choose with Bradley–Terry odds.' });

    // 2. lowest when the chances match: the gaps match
    const C2 = S.add(S.tex(`P_{\\th} = P \\;\\text{ for every pair} \\quad\\Longleftrightarrow\\quad ${RH}(\\xx, \\yy) - ${RH}(\\xx, \\yy') \\;=\\; \\rr(\\xx, \\yy) - \\rr(\\xx, \\yy')`, { size: 56 }).at(0, 140));
    const r2 = S.add(S.reason('because: the average loss is a fixed amount plus a {KL|KL}, zero only when the chances match (chapter 8); and σ only goes up, so equal chances mean equal gaps'));
    S.beat('Then the loss is lowest when the policy’s chances match people’s: any mismatch costs a K L divergence, zero only when they agree. And since sigma only rises, equal chances mean equal gaps.',
      A.FadeOut(q), A.Write(C2, 2.4), S.writeIn(r2, 2));

    // 3. rewards up to a shift, then normalise: pi*
    const C3 = S.add(S.tex(`${RH}(\\xx, \\yy) = \\rr(\\xx, \\yy) + c(\\xx) \\;\\;\\Longrightarrow\\;\\; \\pt(\\yy \\mid \\xx) = \\pref(\\yy \\mid \\xx)\\, e^{\\rr(\\xx, \\yy)/\\bt}\\; e^{c(\\xx)/\\bt}`, { size: 60 }).at(0, -60));
    const C4 = S.add(S.tex('e^{c(\\xx)/\\bt} \\;=\\; \\frac{1}{\\ZZ(\\xx)} \\quad\\Longrightarrow\\quad \\pt \\;=\\; \\pstar', { size: 72 }).at(0, 130));
    const box4 = boxOf(S, C4, S.color('pstar'));
    const r3 = S.add(S.reason('because: equal gaps fix the values up to one shift c(x); unpack the {implicit reward|c9rh}, take e to both sides; and {the policy|pt} must add up to 1, which only 1/{Z(x)|ZZ} does'));
    S.beat('Equal gaps mean the implicit reward is the true reward, plus one shift c for the prompt. Unpack it: the policy is the reference, times e to the reward over beta, times a constant, which must be one over Z. That is pi star.',
      fade([r2, C1]), UP(C2), A.Write(C3, 2.4), A.Write(C4, 1.6), A.Create(box4, 0.8), S.writeIn(r3, 2),
      { cap: 'Equal gaps mean the implicit reward is the true reward, plus one shift c for the prompt. Unpack it: the policy is the reference, times e to the reward over β, times a constant, which must be 1/Z. That is π*.' });

    // 4. check on the toy
    const BX = -430;
    const BY = 235;
    const BH = 560;
    const bars = S.add(S.bars({ labels: NAMES, values: REF, color: S.color('pt'), h: BH, w: 130, gap: 80, labelFont: 'serif', labelSize: 38 }).at(BX, BY));
    const ticks = PS.map((p, i) => S.add(S.line(BX + bars.xs[i] - 85, BY - BH * p, BX + bars.xs[i] + 85, BY - BH * p, { stroke: C.WHITE, width: 5, dash: '12 8' })));
    const leg = S.add(S.group(new Line(-40, 0, 40, 0, { stroke: C.WHITE, width: 5, dash: '12 8' }), new Tex(`\\pstar, \\;\\; \\bt = ${B}`, { size: 44 }).at(150, 0)).at(330, -250));
    const toy = S.add(S.toy(760, -400));
    const klL = S.add(S.tex('\\KL(\\pt \\,\\|\\, \\pstar)', { size: 50 }).at(330, -150));
    const kl = S.add(S.txt('', { size: 40, font: 'mono', color: S.color('KL'), anchor: 'start' }).at(170, -70));
    const fmtKL = (s) => `step ${s.step}:  ${s.kl < 1e-12 ? '< 1e-12' : s.kl < 1e-3 ? s.kl.toExponential(1) : s.kl.toFixed(3)}`;
    const steps = SNAP.slice(1).map((sn) => seq(par(bars.to(sn.pi, 1.1), A.Set(kl, { str: fmtKL(sn) }, 0.01)), wait(0.35)));
    const fin = S.add(S.txt(`step ${STEPS_END}:  ${KLend < 1e-12 ? '< 1e-12' : KLend.toExponential(1)}`, { size: 40, font: 'mono', color: S.color('KL'), anchor: 'start' }).at(170, 0));
    S.beat(`On the toy, with choices drawn from the true rewards, D P O slides from the reference onto pi star. After a hundred steps the K L to pi star is ${sayN(SNAP[4].kl * 1e6, 1)} in a million; after ${words(STEPS_END)}, zero to machine precision.`,
      fade([C2, C3, C4, box4, r3]), A.FadeIn(toy), A.FadeIn(bars), lag(0.1, ticks.map((t) => A.Create(t, 0.4))), A.FadeIn(leg), A.FadeIn(klL), A.Set(kl, { o: 1, str: fmtKL(SNAP[0]) }, 0.01), seq(steps), A.FadeIn(fin),
      { cap: `On the toy, with choices drawn from the true rewards, DPO slides from the reference onto π*. After 100 steps the KL to π* is ${(SNAP[4].kl * 1e6).toFixed(1)} in a million; after ${STEPS_END.toLocaleString('en')}, zero to machine precision.` });

    // 5. what it buys
    const pros = S.add(S.english('no {reward model|rr} · no sampling · no {critic|VV}: one loss on pairs', { size: 40, width: 820 }).at(440, 130));
    S.beat('The same destination as R L H F, with no reward model, no sampling and no critic: one loss on pairs, as cheap as fine-tuning. That is why D P O spread so quickly.',
      S.writeIn(pros, 2), { cap: 'The same destination as RLHF, with no reward model, no sampling and no critic: one loss on pairs, as cheap as fine-tuning. That is why DPO spread so quickly.' });

    // 6. what it gives up: offline data, no exploration
    const assume = S.add(S.txt('the proof assumed', { size: 38, color: C.GREY_B }).at(0, -300));
    const cons = ['unlimited comparisons', 'of every response the policy might give', 'a policy flexible enough to reach π*'].map((t, i) => S.add(S.txt(t, { size: 40, color: C.RED }).at(0, -220 + i * 70)));
    const real = S.add(S.english('real DPO: a fixed pile of pairs, written by some other model. It never tries its own {responses|yy}', { size: 40, width: 1500 }).at(0, 60));
    S.beat('But the proof assumed unlimited comparisons, of every response the policy might give. Real D P O learns from a fixed pile of pairs, written by another model. It never tries its own answers, so it never learns from their mistakes.',
      fade([bars, ...ticks, leg, klL, kl, fin, pros, toy]), A.FadeIn(assume), lag(0.5, cons.map((c) => A.FadeIn(c, { dy: 12 }))), S.writeIn(real, 2),
      { cap: 'But the proof assumed unlimited comparisons, of every response the policy might give. Real DPO learns from a fixed pile of pairs, written by another model. It never tries its own answers, so it never learns from their mistakes.' });

    // 7. the loss sees only the gap: the winner can fall
    const toy2 = S.add(S.toy(760, -400));
    const F1 = S.add(S.tex(`${RH}(\\yw): 0 \\to ${tnum(FW, 1)}, \\qquad ${RH}(\\yl): 0 \\to ${tnum(FL, 1)}`, { size: 56 }).at(0, -150));
    const F2 = S.add(S.tex(`\\text{loss: } ${lossOf(0).toFixed(2)} \\to ${lossOf(FW - FL).toFixed(2)}, \\qquad \\frac{\\pt(\\yw)}{\\pref(\\yw)} \\;=\\; e^{${tnum(FW, 1)}/${B}} \\;=\\; ${fallFactor.toFixed(2)}`, { size: 56 }).at(0, -30));
    const e7 = S.add(S.english('the {loss|c9L} falls, yet {the preferred response|yw} lost almost half its {probability|pt}', { size: 42 }).at(0, 110));
    const lead = S.add(S.english('next: back to sampling, with rewards a program can check', { size: 36, color: C.GREY_B, italic: true }).at(0, 250));
    S.beat(`And the loss sees only the gap. It can fall while the preferred response gets less likely, if the rejected one falls faster. Here the winner lost almost half its probability. Next: back to sampling, with rewards a program can check.`,
      fade([assume, ...cons, real]), A.FadeIn(toy2), A.Write(F1, 1.6), A.Write(F2, 2), S.writeIn(e7, 1.8), S.writeIn(lead, 1.4));
  });
});
