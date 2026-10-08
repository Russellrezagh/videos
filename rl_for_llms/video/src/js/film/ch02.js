// Chapter 2 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch02(ctx) {
  'use strict';
  // eslint-disable-next-line no-unused-vars
  const { C, A, MV, Text, Tex, Group, Line, Arrow, Creature, Bubble, circle, rect, path, dot, polyPath, seq, par, lag, wait, mix, video, card, f2, f3, NEXT, ANSWER, BAND, R10, J10, VAR, TRAIN, CREDIT, RM, LEASH, DPO, GROUP, PASS } = ctx;

  /* ---------------------------------------------------------- helpers */
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
  FILM.addSymbol('c2ys', 'data', 'y^{\\star}', 'the demonstration', 'an answer written by a person for the prompt x', 'it is the answer the model should learn to imitate');
  FILM.addSymbol('c2L', 'data', '\\mathcal{L}_{\\mathrm{SFT}}', 'the imitation loss', 'minus the log-probability of the demonstration', 'optimisers go downhill: a loss is a number to make small');

  // imitation on the next-token toy: a few gradient steps on -log pi(51) (kernel: src/js/rl.js)
  const SFT = (() => {
    let z = NEXT.z.slice();
    const out = [RL.softmax(z)];
    for (let k = 0; k < 3; k++) {
      const p = RL.softmax(z);
      // d(-log pi(51))/dz_j = pi(j) - 1[j = 51]; one step of size 1 downhill
      z = z.map((v, j) => v - (p[j] - (j === 0 ? 1 : 0)));
      out.push(RL.softmax(z));
    }
    return out;
  })();
  const nlog = (p) => -Math.log(p);

  /* =========================================================== CHAPTER 2 */
  video.chapter('ch2', 'Learning from a score');
  card(2, 'Learning from a score');

  /*
   * Imitation: maximise the probability of a demonstration, take the log,
   * flip the sign: L_SFT = -sum_t log pi(y*_t | x, y*_<t). Its gradient
   * flows straight through; its limits motivate learning from a score.
   */
  video.scene('sft', 'Imitation first', (S) => {
    const POL = S.color('pt');
    const h = S.add(S.head('Learning by imitation'));
    const stages = [['pre-training', 'imitate text from the internet', C.GREY_B], ['supervised fine-tuning', 'imitate answers written by people', C.TEAL]].map(([a, b, col], i) => S.add(S.box(a, { w: 760, h: 150, color: col, size: 46, sub: b }).at(-420 + i * 840, 0)));
    S.beat('Before any reinforcement learning, a model learns by imitation. Pre-training imitates text from the internet. Then supervised fine-tuning, S F T, imitates answers people wrote for chosen prompts.',
      A.Write(h, 1), S.toTitle(h), lag(0.8, stages.map((s) => A.FadeIn(s, { dy: 30 }))),
      { cap: 'Before any reinforcement learning, a model learns by imitation. Pre-training imitates text from the internet. Then supervised fine-tuning, SFT, imitates answers people wrote for chosen prompts.' });

    // 1. the goal: make the demonstration likely
    const DY = -300;
    const xl = S.add(S.tex('\\xx', { size: 56 }).at(-830, DY));
    const xb = S.add(S.box('What is 17 × 3?', { w: 400, h: 76, color: C.GREY_B, size: 36 }).at(-580, DY));
    const yl = S.add(S.tex('\\cData{c2ys}{\\yy^{\\star}}', { size: 56 }).at(-250, DY));
    const yt = S.add(S.tokens(ANSWER.tokens, { size: 44, colors: ANSWER.tokens.map(() => C.GREEN) }));
    yt.at(-170 + yt.width / 2, DY);
    const GOAL = S.add(S.tex('\\max_{\\th}\\;\\; \\pt(\\cData{c2ys}{\\yy^{\\star}} \\mid \\xx)', { size: 90 }).at(0, -60));
    const e1 = S.add(S.english('make the {person’s answer|data} as {likely|pt} as possible', { size: 44, width: 1400 }).at(0, 130));
    S.beat('For each prompt x, a person writes a good answer: the demonstration. Imitation asks one thing of the weights: make the demonstration as likely as possible.',
      fade(stages), A.FadeIn(xl), A.FadeIn(xb), A.FadeIn(yl), A.Show(yt), lag(0.15, yt.items.map((t) => A.FadeIn(t.item, { dx: -16, dur: 0.4 }))), A.Write(GOAL, 1.6), S.writeIn(e1, 1.6));
    S.tour(GOAL, [
      { sym: 'c2ys', at: [0, 170], anims: [A.FadeOut(e1)],
        say: 'We write it y star. The star marks the target: an answer a person wrote, not one the model sampled.' },
    ]);

    // 2. take the log
    const LG = S.add(S.tex('\\max_{\\th}\\;\\; \\lp(\\cData{c2ys}{\\yy^{\\star}} \\mid \\xx) \\;=\\; \\sum_{t}\\; \\lp\\big(\\cData{c2ys}{\\yy^{\\star}_t} \\mid \\xx,\\, \\cData{c2ys}{\\yy^{\\star}_{<t}}\\big)', { size: 72 }).at(0, -60));
    const r2 = S.add(S.reason('because: the log rises whenever its input rises, so the best {θ|th} does not change; and the log of a product is a sum'));
    S.beat('As in chapter one, take the log: the probability becomes a sum over the demonstrated tokens. The log rises whenever its input rises, so the best theta does not change.',
      S.endTour(GOAL), fade(xl, xb, yl, yt), UP(GOAL), A.Write(LG, 2.2), S.writeIn(r2, 1.8),
      { cap: 'As in chapter 1, take the log: the probability becomes a sum over the demonstrated tokens. The log rises whenever its input rises, so the best θ does not change.' });

    // 3. flip the sign: a loss
    const LOSS = S.add(S.tex('\\cData{c2L}{\\mathcal{L}_{\\mathrm{SFT}}}(\\th) \\;=\\; -\\sum_{t}\\; \\lp\\big(\\cData{c2ys}{\\yy^{\\star}_t} \\mid \\xx,\\, \\cData{c2ys}{\\yy^{\\star}_{<t}}\\big)', { size: 76 }).at(0, -60));
    const r3 = S.add(S.reason('because: making a number as large as possible is the same as making its negative as small as possible'));
    S.beat('Optimisers walk downhill, making a loss small. So flip the sign: the S F T loss is minus the log-probability of the demonstration, one term per token.',
      A.FadeOut(GOAL), A.FadeOut(r2), UP(LG), A.Write(LOSS, 2.2), S.writeIn(r3, 1.6),
      { cap: 'Optimisers walk downhill, making a loss small. So flip the sign: the SFT loss is minus the log-probability of the demonstration, one term per token.' });
    S.tour(LOSS, [
      { sym: 'c2L', at: [0, 170], anims: [fade(LG, r3)],
        say: 'Each term is minus a log-probability, so the loss is never negative. It is zero only if every demonstrated token gets a chance of one.',
        cap: 'Each term is minus a log-probability, so the loss is never negative. It is zero only if every demonstrated token gets a chance of one.' },
    ]);

    // 4. in English
    const e4 = S.add(S.english('{the loss|c2L} = the model’s total {surprise|pt} at each token the person wrote', { size: 44, width: 1500 }).at(0, 140));
    const e4b = S.add(S.english('also called the cross-entropy', { size: 36, color: C.GREY_B, width: 1200 }).at(0, 235));
    S.beat('In words: the loss adds up how surprised the model is by each token the person wrote. Minus a log-probability measures surprise. This loss is also called the cross-entropy.',
      S.endTour(LOSS), S.writeIn(e4, 2), S.writeIn(e4b, 1));

    // 5. numbers: one token's term, as a curve
    const AXX = -380;
    const AXY = 60;
    const ax = S.add(S.axes({ x0: 0, x1: 1, y0: 0, y1: 4, w: 700, h: 400, xticks: [0, 0.5, 1], yticks: [0, 1, 2, 3, 4], xfmt: (v) => String(v), size: 30 }).at(AXX, AXY));
    const curve = ax.plot((p) => -Math.log(p), { color: POL, width: 6, from: Math.exp(-4), to: 1 });
    const pL = S.add(S.english('{chance of the demonstrated token|pt}', { size: 32, width: 700 }).at(AXX + 60, AXY + 290));
    const lL = S.add(S.tex('-\\log \\pt', { size: 48 }).at(AXX - 190, AXY - 205));
    const P = (p) => [AXX + ax.fx(p), AXY + ax.fy(nlog(p))];
    const pts = [NEXT.p[0], 0.9, 0.05];
    const dots = pts.map((p) => S.add(S.dot(12, C.WHITE).at(...P(p))));
    const dl = pts.map((p, i) => S.add(S.txt(`${p.toFixed(2)} → ${nlog(p).toFixed(2)}`, { size: 32, font: 'mono', color: i === 0 ? C.WHITE : C.GREY_B }).at(P(p)[0] + (i === 2 ? 150 : 40), P(p)[1] - 44)));
    const sideX = 470;
    const s1 = S.add(S.english(`after “The answer is”, the person wrote {51|data}: the model gives it {${NEXT.p[0].toFixed(2)}|pt}`, { size: 36, width: 760 }).at(sideX, -130));
    const s2 = S.add(S.english(`so this token adds {−log ${NEXT.p[0].toFixed(2)} ≈ ${nlog(NEXT.p[0]).toFixed(2)}|c2L} to the loss`, { size: 36, width: 760 }).at(sideX, -20));
    const s3 = S.add(S.english('near 0 the cost shoots up: confident mistakes cost the most', { size: 36, width: 760, color: C.GREY_B }).at(sideX, 100));
    const toy = S.add(S.toy(sideX, 190));
    S.beat(`Numbers. The person wrote fifty-one, and our model gives it ${say2(NEXT.p[0])}, so this token adds ${say2(nlog(NEXT.p[0]))}. At zero point nine, only ${say2(nlog(0.9))}. Near zero, the cost explodes: confident mistakes cost most.`,
      fade(e4, e4b), par(A.MoveTo(LOSS, 0, -330), A.ScaleTo(LOSS, 0.7)), A.FadeIn(ax), A.Create(curve, 1.4), A.FadeIn(pL), A.FadeIn(lL),
      A.FadeIn(dots[0], { from: 2 }), A.FadeIn(dl[0]), S.writeIn(s1, 1.4), S.writeIn(s2, 1.4), A.FadeIn(toy), lag(0.8, [1, 2].map((i) => par(A.FadeIn(dots[i], { from: 2 }), A.FadeIn(dl[i])))), S.writeIn(s3, 1.4),
      { cap: `Numbers. The person wrote 51, and our model gives it ${NEXT.p[0].toFixed(2)}, so this token adds ${nlog(NEXT.p[0]).toFixed(2)}. At 0.9, only ${nlog(0.9).toFixed(2)}. Near zero, the cost explodes: confident mistakes cost most.` });

    // 6. the gradient flows straight through
    const GR = S.add(S.tex('\\grad\\, \\cData{c2L}{\\mathcal{L}_{\\mathrm{SFT}}} \\;=\\; -\\sum_{t}\\; \\grad \\lp\\big(\\cData{c2ys}{\\yy^{\\star}_t} \\mid \\xx,\\, \\cData{c2ys}{\\yy^{\\star}_{<t}}\\big)', { size: 64 }).at(0, -330));
    const bars = S.add(S.bars({ labels: NEXT.labels, values: NEXT.p, color: POL, h: 330, w: 92, gap: 40, labelFont: 'mono', labelSize: 34, valueSize: 30 }).at(sideX, 185));
    const r6 = S.add(S.reason('because: each term is the log-probability of a known token, so its gradient is direct', { y: -218 }));
    const stepTo = (k) => par(bars.to(SFT[k], 0.9), A.MoveTo(dots[0], ...P(SFT[k][0]), 0.9), A.MoveTo(dl[0], P(SFT[k][0])[0] + 40, P(SFT[k][0])[1] - 44, 0.9), A.Count(dl[0], SFT[k - 1][0], SFT[k][0], (v) => `${v.toFixed(2)} → ${nlog(v).toFixed(2)}`, 0.9));
    const last = SFT[SFT.length - 1][0];
    S.beat(`Its gradient is direct: each term is the log-probability of a known token, so back-propagation reaches the weights straight away. Three steps push fifty-one from ${say2(NEXT.p[0])} to ${say2(last)}, and the others down.`,
      fade(s1, s2, s3, dots[1], dots[2], dl[1], dl[2], LOSS), A.Write(GR, 1.8), A.Set(toy, { x: sideX + 330, y: -190 }, 0.1), A.FadeIn(bars, { dy: 20 }), S.writeIn(r6, 1.6),
      stepTo(1), wait(0.3), stepTo(2), wait(0.3), stepTo(3),
      { cap: `Its gradient is direct: each term is the log-probability of a known token, so back-propagation reaches the weights straight away. Three steps push 51 from ${NEXT.p[0].toFixed(2)} to ${last.toFixed(2)}, and the others down.` });

    // 7. the limits of imitation
    const limits = ['someone must write a good answer for every prompt', 'the model only sees the teacher’s answers, never its own mistakes', 'at best, it matches its teachers'].map((t, i) => S.add(S.group(S.cross(36).with({ o: 1 }), new Text(t, { size: 42, anchor: 'start' }).at(50, 0)).at(-640, -150 + i * 120)));
    S.beat('That is how assistants learn the shape of a good answer. But imitation has limits. Someone must write every answer. The model never sees its own mistakes. And at best, it matches its teachers.',
      fade(GR, ax, pL, lL, dots[0], dl[0], bars, r6, toy), lag(1.4, limits.map((l) => A.FadeIn(l, { dx: -30 }))));
  });

  /*
   * Judging is easier than writing; the reward is one number; the loop.
   */
  video.scene('judge', 'Judging is easier than writing', (S) => {
    const RW = S.color('RR');
    const h = S.add(S.title('Judging is easier than writing'));
    const c1 = S.add(S.group(new Text('17 × 3 = 51', { size: 56, font: 'mono' }), S.check(50).with({ o: 1 }).at(250, 0)).at(-450, -270));
    const c2 = S.add(S.group(new Text('essay A', { size: 50 }).at(-140, 0), new Text('≻', { size: 60, color: RW }), new Text('essay B', { size: 50 }).at(140, 0)).at(450, -270));
    const l1 = S.add(S.txt('a program can check it', { size: 36, color: C.GREY_B }).at(-450, -180));
    const l2 = S.add(S.txt('a person can compare them', { size: 36, color: C.GREY_B }).at(450, -180));
    S.beat('Here is a way around. Often, judging an answer is far easier than writing one. A program can check that fifty-one is right. A person can tell which essay is better without being able to write either.',
      A.FadeIn(h), A.FadeIn(c1, { dy: 20 }), A.FadeIn(l1), wait(0.8), A.FadeIn(c2, { dy: 20 }), A.FadeIn(l2));

    // the verdict is just a number
    const AX = [-420, 0, 420];
    const chips = BAND.labels.map((lab, i) => S.add(S.group(new Text(lab, { size: 46, font: 'mono' }), new Text('→', { size: 40, color: C.GREY }).at(0, 60), new Tex(`\\RR = \\cReward{jr${i}}{${BAND.r[i]}}`, { size: 50 }).at(0, 120)).at(AX[i], -20)));
    const e2 = S.add(S.english('the {reward|RR} says how good an answer is, not what would have been better', { size: 42, width: 1500 }).at(0, 230));
    S.beat(`Whatever the judge is, it hands back one number: the reward, R of x and y. Here, perhaps one, zero point three, and zero. It says how good an answer is, not how to fix it.`,
      lag(0.4, chips.map((c) => A.FadeIn(c, { dy: 16 }))), S.writeIn(e2, 2),
      { cap: `Whatever the judge is, it hands back one number: the reward, R(x, y). Here, perhaps 1, ${BAND.r[1]}, and 0. It says how good an answer is, not how to fix it.` });

    // the plan
    const loop = [['sample', S.color('pt'), -520], ['score', RW, 0], ['update', S.color('th'), 520]].map(([t, col, x]) => S.add(S.box(t, { w: 300, h: 120, color: col, size: 48 }).at(x, 120)));
    const ar = [S.add(S.arrow(-360, 120, -160, 120, { color: C.GREY_B, width: 5 })), S.add(S.arrow(160, 120, 360, 120, { color: C.GREY_B, width: 5 })), S.add(S.path('M 520 190 C 400 320 -400 320 -520 190', { stroke: C.GREY_B, width: 4 }).with({ draw: 0 }))];
    const subs = ['its own answers', 'by the judge', 'the weights'].map((t, i) => S.add(S.txt(t, { size: 32, color: C.GREY_B, italic: true }).at(-520 + 520 * i, 30)));
    S.beat('So here is the plan. The model samples its own answers, the judge scores them, and we change the weights so that high-scoring answers become more likely. No demonstrations needed.',
      fade(chips, e2), lag(0.6, loop.map((b, i) => seq(par(A.FadeIn(b, { dy: 20, dur: 0.5 }), A.FadeIn(subs[i], { dur: 0.5 })), A.Create(ar[i], 0.6)))));
  });

  /*
   * Why we cannot back-propagate through the sample and the judge: the
   * reward of one sample is a staircase in the logits (slope 0 or none),
   * while its average is smooth. Ends on the question grad E[R] = ?
   */
  video.scene('obstacle', 'The obstacle', (S) => {
    const RW = S.color('RR');
    const POL = S.color('pt');
    const h = S.add(S.title('The obstacle'));

    // the chain, along the top
    const CY = -300;
    const nodes = [
      S.add(S.tex('\\th', { size: 72 }).at(-640, CY)),
      S.add(S.tex('\\zz', { size: 72 }).at(-460, CY)),
      S.add(S.tex('\\pt', { size: 72 }).at(-270, CY)),
      S.add(S.box('sample', { w: 220, h: 90, color: C.GREY_B, size: 40 }).at(-30, CY)),
      S.add(S.tex('\\yy', { size: 72 }).at(200, CY)),
      S.add(S.box('judge', { w: 200, h: 90, color: RW, size: 40 }).at(430, CY)),
      S.add(S.tex('\\RR', { size: 72 }).at(640, CY)),
    ];
    const LX = [[-600, -500], [-425, -335], [-205, -145], [85, 165], [235, 325], [535, 600]];
    const links = LX.map(([a, b]) => S.add(S.arrow(a, CY, b, CY, { color: C.GREY_B, width: 4 })));
    const mid = (i) => (LX[i][0] + LX[i][1]) / 2;
    const ok = [0, 1].map((i) => S.add(S.check(40).at(mid(i), CY - 78)));
    const e2 = S.add(S.english('nudge {θ|th} a little: the {logits|zz} move a little, and so do the {probabilities|pt}', { size: 42, width: 1500 }).at(0, -60));
    const say1 = 'With imitation, back-propagation flowed straight from the loss to the weights. Can it flow back from the reward? Follow the chain. Nudge theta a little, and the logits and probabilities move a little: those links are smooth.';
    S.beat(say1,
      A.FadeIn(h), lag(0.35, nodes.map((n, i) => seq(A.FadeIn(n, { dur: 0.4, dx: -16 }), i < links.length ? A.Arrow(links[i], 0.35) : wait(0)))),
      wait(Math.max(0, S.atWord(say1, 'Nudge') - 4.6)), S.writeIn(e2, 2), lag(0.4, ok.map((m) => A.Create(m, 0.5))),
      { cap: 'With imitation, back-propagation flowed straight from the loss to the weights. Can it flow back from the reward? Follow the chain. Nudge θ a little, and the logits and probabilities move a little: those links are smooth.' });

    // the sample: a staircase
    const AXX = 0;
    const AXY = 80;
    const ZS = RL.sum(NEXT.z.slice(1).map(Math.exp)); // the other tokens' share, held fixed
    const U = 0.6; // the dice roll, held fixed: 51 is drawn when pi(51) > U
    const zStar = Math.log((U / (1 - U)) * ZS);
    const pi51 = (z) => Math.exp(z) / (Math.exp(z) + ZS);
    const draws51 = (z) => {
      const zz = NEXT.z.slice();
      zz[0] = z;
      return RL.sampleIndex(RL.softmax(zz), U) === 0;
    };
    if (draws51(zStar - 1e-6) || !draws51(zStar + 1e-6) || draws51(NEXT.z[0])) throw new Error('ch02: the staircase threshold is wrong');
    const ax = S.add(S.axes({ x0: -1, x1: 3, y0: 0, y1: 1, w: 1000, h: 300, xticks: [-1, 0, 1, 2, 3], yticks: [0, 1], xfmt: (v) => (v < 0 ? '−' : '') + Math.abs(v), size: 30 }).at(AXX, AXY));
    const xL = S.add(S.english('the {logit of 51|zz}', { size: 34, width: 500 }).at(AXX + 660, AXY + 150));
    const yL = S.add(S.english('{reward|RR} of the sampled answer', { size: 34, width: 600 }).at(AXX - 300, AXY - 205));
    const st1 = ax.polyline([[-1, 0], [zStar, 0]], { color: RW, width: 7 });
    const st2 = ax.polyline([[zStar, 1], [3, 1]], { color: RW, width: 7 });
    const cliff = ax.polyline([[zStar, 0], [zStar, 1]], { color: RW, width: 4, dash: '8 10' });
    const P = (z, v) => [AXX + ax.fx(z), AXY + ax.fy(v)];
    const now = S.add(S.dot(13, C.WHITE).at(...P(NEXT.z[0], 0)));
    const fixed = S.add(S.english('the dice roll held fixed', { size: 32, color: C.GREY_B, italic: true, width: 600 }).at(AXX + 300, AXY - 205));
    const rule = S.add(S.english('toy judge: {reward 1|RR} for 51, {reward 0|RR} for anything else', { size: 32, color: C.GREY_B, italic: true, width: 1200 }).at(0, 330));
    const bad = [2, 3].map((i) => S.add(S.cross(40).at(mid(i), CY - 78)));
    S.beat('Now the sample. Say the judge gives one for fifty-one, and zero otherwise. Hold the dice roll fixed, and slide the logit of fifty-one up. The sample jumps between whole tokens: the reward sits at zero, then leaps to one. A staircase.',
      A.FadeOut(e2), A.FadeIn(ax), A.FadeIn(xL), A.FadeIn(yL), A.FadeIn(rule), A.FadeIn(fixed), A.FadeIn(now, { from: 2 }), A.Create(st1, 1.2), A.Create(cliff, 0.5), A.Create(st2, 0.8), lag(0.3, bad.map((m) => A.Create(m, 0.5))));
    const sl = [S.add(S.txt('slope 0', { size: 32, color: C.GREY_B, italic: true }).at(...P(0.3, 0.18))), S.add(S.txt('slope 0', { size: 32, color: C.GREY_B, italic: true }).at(...P(2.5, 0.82))), S.add(S.txt('no slope', { size: 32, color: C.RED, italic: true }).at(...P(zStar + 0.42, 0.5)))];
    S.beat('Its slope is zero on every flat step, and does not exist at the cliff. Zero says that moving theta changes nothing. That is false, yet it is all that differentiating one sample can report.',
      lag(0.6, sl.map((m) => A.FadeIn(m, { dy: 10 }))), A.Indicate(now, { color: C.RED, scale: 1.6 }),
      { cap: 'Its slope is zero on every flat step, and does not exist at the cliff. Zero says that moving θ changes nothing. That is false, yet it is all that differentiating one sample can report.' });

    // the judge: a black box
    const bad2 = [4, 5].map((i) => S.add(S.cross(40).at(mid(i), CY - 78)));
    const e5 = S.add(S.english('the {judge|RR}: a person, or a program; it reads discrete text', { size: 38, width: 1500 }).at(0, -200));
    S.beat('The judge is no better: a person, or a program that runs tests. It reads discrete text and returns a score with no derivative attached. Nothing flows back to the weights.',
      lag(0.4, bad2.map((m) => A.Create(m, 0.5))), A.Indicate(nodes[5], { color: C.RED, scale: 1.08 }), S.writeIn(e5, 2));

    // yet the average is smooth
    const avg = ax.plot(pi51, { color: POL, width: 6, from: -1, to: 3 });
    const nowJ = S.add(S.dot(13, POL).at(...P(NEXT.z[0], pi51(NEXT.z[0]))));
    const avgL = S.add(S.english(`average over all dice rolls = {π(51)|pt}: smooth`, { size: 32, width: 700 }).at(...P(0.28, 0.8)));
    S.beat(`Yet the average over every dice roll is smooth. With this judge, the average reward is just the chance of drawing fifty-one, here ${say2(pi51(NEXT.z[0]))}, and it rises smoothly with the logit. The gradient we want exists.`,
      A.FadeOut(e5), fade(sl), A.Create(avg, 1.6), A.FadeIn(avgL), A.FadeIn(nowJ, { from: 2 }),
      { cap: `Yet the average over every dice roll is smooth. With this judge, the average reward is just the chance of drawing 51, here ${pi51(NEXT.z[0]).toFixed(2)}, and it rises smoothly with the logit. The gradient we want exists.` });

    // the question
    const Q = S.add(S.tex('\\grad\\, \\EE_{\\yy \\sim \\pt(\\cdot \\mid \\xx)}\\big[\\, \\RR(\\xx, \\yy) \\,\\big] \\;=\\; ?', { size: 100 }).at(0, 20));
    const e7 = S.add(S.english('{θ|th} hides in the sampling itself: in {which answers we draw|pt}', { size: 42, width: 1500 }).at(0, 220));
    S.beat('So the expected reward depends on theta smoothly, yet no chain of derivatives reaches it. Theta hides in the sampling: in which answers we draw. What is its gradient?',
      fade(ax, xL, yL, fixed, rule, now, nowJ, avgL), A.Write(Q, 2), wait(0.4), A.Spot(Q, ['pt', 'grad']), S.writeIn(e7, 1.8), wait(1.6), A.Unspot(Q),
      { cap: 'So the expected reward depends on θ smoothly, yet no chain of derivatives reaches it. θ hides in the sampling: in which answers we draw. What is its gradient?' });

    // next: the trick
    const trick = S.add(S.head('the log-derivative trick', { size: 80, color: S.color('grad') }).at(0, 20));
    S.beat('The way around is one line of calculus: the log-derivative trick. In the next chapter, we derive it on the smallest possible example.',
      fade(nodes, links, ok, bad, bad2, Q, e7), A.Write(trick, 1.4));
  });
});
