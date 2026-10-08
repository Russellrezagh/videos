// Chapter 7 of The Gradient of Reward. Registered in order; see setup.js.
FILM.parts.push(function ch07(ctx) {
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
    if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`;
    return `${words(Math.floor(n / 1000))} thousand${n % 1000 ? `${n % 1000 < 100 ? ' and ' : ' '}${words(n % 1000)}` : ''}`;
  };
  const sayN = (x, d = 2) => {
    const [a, b] = Math.abs(x).toFixed(d).split('.');
    return `${x < 0 ? 'minus ' : ''}${words(+a)}${b ? ` point ${b.split('').map((c) => ONES[+c]).join(' ')}` : ''}`;
  };
  const pct = (p) => `${Math.round(100 * p)}%`;
  const sayPct = (p) => `${words(Math.round(100 * p))} percent`;
  // where a derivation's previous line goes: above, smaller, dimmed
  const UP = (m, y = -275, o = 0.5) => par(A.MoveTo(m, 0, y), A.ScaleTo(m, 0.72), A.Set(m, { o }));
  // a side note in the "because" style, for layouts with a picture beside it
  const side = (S, str, x, y, w = 760, size = 34) => S.english(str, { size, color: C.GREY_B, italic: true, width: w }).at(x, y);
  // a framed slip of text: an answer, a step of a recipe
  const slip = (S, lines, { w = 700, size = 34, color = C.WHITE, stroke = C.GREY, title = null, tcolor = C.GREY_B } = {}) => {
    const lh = size * 1.32;
    const rows = (title ? 1 : 0) + lines.length;
    const hh = rows * lh + 44;
    const g = new Group(rect(w, hh, { stroke, width: 3, fill: mix(C.BG, stroke, 0.12), rx: 12 }));
    let y = -hh / 2 + 22 + lh / 2;
    if (title) {
      g.add(new Text(title, { size: size - 2, color: tcolor, italic: true }).at(0, y));
      y += lh;
    }
    for (const ln of lines) {
      g.add(new Text(ln, { size, color }).at(0, y));
      y += lh;
    }
    g.h = hh;
    return S.add(g.hidden());
  };
  const fade = (ms, dur = 0.6) => par(ms.filter(Boolean).map((m) => A.FadeOut(m, { dur })));

  /* ---------------------------------------------------------- symbols of this chapter */
  FILM.addSymbol('c7phi', 'params', '\\phi', 'the reward model’s weights', 'every adjustable number inside the reward model', 'a second network, with its own weights: θ stays the policy’s');
  FILM.addSymbol('c7gap', 'reward', '\\Delta', 'the score gap', 'the winner’s score minus the loser’s', 'Bradley-Terry only ever looks at this difference');
  FILM.addSymbol('c7D', 'data', '\\mathcal{D}', 'the comparisons', 'people shown two answers to one prompt, picking the better one', 'the only thing the reward model learns from');
  FILM.addSymbol('c7L', 'data', '\\mathcal{L}', 'the loss', 'minus the log-likelihood of people’s choices, averaged', 'training pushes it down, which makes the choices people really made likely');
  const PHI = '\\cParams{c7phi}{\\phi}';
  const RP = `\\rr_{${PHI}}`; // r_phi, the reward model's score
  const GAP = '\\cReward{c7gap}{\\Delta}';
  const DD = '\\cData{c7D}{\\mathcal{D}}';
  const LL = '\\cData{c7L}{\\mathcal{L}}';

  /* ---------------------------------------------------------- the numbers (kernel: src/js/rl.js) */
  const sig = RL.sigmoid;
  const T = RM.rTrue; // the toy's hidden scores, A..E
  const pAB = sig(T[0] - T[1]);
  const pAE = sig(T[0] - T[4]);
  // the same 20,000 simulated comparisons setup.js fitted RM to
  const pairs = RL.simulatePreferences(RM.rTrue, 20000, 11);
  const count = (w, l) => pairs.filter(([a, b]) => a === w && b === l).length;
  const nAE = count(0, 4);
  const nEA = count(4, 0);
  const lossOf = (r) => RL.sum(pairs.map(([w, l]) => RL.btLoss(r[w], r[l]))) / pairs.length;
  const L0 = lossOf(T.map(() => 0));
  const Lfit = lossOf(RM.fit.r);
  const Lshift = lossOf(RM.fit.r.map((x) => x + 10));
  // the leash toy (setup.js): four kinds of answer, a reference model, a proxy reward
  const Eref = RL.expectedReward(LEASH.ref, LEASH.r);
  const best = LEASH.r.indexOf(Math.max(...LEASH.r));

  /* =========================================================== CHAPTER 7 */
  video.chapter('ch7', 'Rewards from preferences');
  card(7, 'Where rewards come from: preferences');

  /*
   * Bradley-Terry, built from a wish list: strengths e^r, the winner's share
   * of the pair, divided through to a sigmoid of the score gap. Only gaps
   * matter; the gap is the log-odds.
   */
  video.scene('bt', 'Bradley and Terry', (S) => {
    const h = S.add(S.title('Where rewards come from'));

    // 1. why: no checker for open-ended answers
    const q = S.add(S.box('Explain why the sky is blue, to a child.', { w: 980, h: 90, color: C.GREY_B, size: 40 }).at(0, -330));
    const ansA = slip(S, ['Sunlight is every colour mixed.', 'The air bounces the blue part', 'around the sky the most.'], { w: 640, title: 'answer A' }).at(-390, -95);
    const ansB = slip(S, ['Rayleigh scattering: intensity', 'goes as 1/λ⁴, so short', 'wavelengths dominate.'], { w: 640, title: 'answer B' }).at(390, -95);
    const e1 = S.add(S.english('both are true. Which is better? No program can check that.', { size: 40, color: C.GREY_B }).at(0, 150));
    S.beat('Where do rewards come from? For seventeen times three, a program can check the answer. But take this prompt: explain why the sky is blue, to a child. Both answers are true. No program can say which one is better.',
      A.FadeIn(h), A.FadeIn(q, { dy: -16 }), A.FadeIn(ansA, { dx: -20 }), A.FadeIn(ansB, { dx: 20 }), S.writeIn(e1, 1.6),
      { cap: 'Where do rewards come from? For 17 × 3, a program can check the answer. But take this prompt: explain why the sky is blue, to a child. Both answers are true. No program can say which one is better.' });

    // 2. people compare well
    const who = S.add(S.creature({ color: C.GOLD, kind: 'scientist', size: 0.62 }).at(0, 165));
    const pick = S.add(S.tex('\\succ', { size: 96 }).at(0, -95));
    const e2 = S.add(S.english('asked for a score out of ten, people disagree; asked {which of two is better|rr}, they mostly agree', { size: 38, width: 1500 }).at(0, 310));
    S.beat('People are not much better at it. Ask for a score out of ten, and they disagree: is this a six or an eight? But show someone two answers side by side, and they can usually say which one is better.',
      A.FadeOut(e1), A.FadeIn(who, { dy: 30 }), A.Look(who, -1, -0.6), wait(0.6), A.Look(who, 1, -0.6), wait(0.4), A.Look(who, -1, -0.6), A.FadeIn(pick, { from: 2 }), A.Indicate(ansA, { color: C.GREEN, scale: 1.04 }), A.Mood(who, 1), S.writeIn(e2, 2));

    // 3. notation: winner and loser
    const F3 = S.add(S.tex('\\xx: \\qquad \\yw \\;\\succ\\; \\yl', { size: 110 }).at(0, -110));
    const e3 = S.add(S.english('for the {prompt x|xx}, people preferred answer {y_w|yw} to answer {y_l|yl}', { size: 42 }).at(0, 60));
    S.beat('So the data are comparisons. One comparison is a prompt, x, and two answers. The curly symbol means: is preferred to.',
      fade([q, ansA, ansB, who, pick, e2]), A.Write(F3, 1.6), S.writeIn(e3, 1.8));
    S.tour(F3, [
      { sym: 'yw', at: [0, 200], text: { why: 'it won the comparison: w for winner' },
        say: 'We call the preferred answer y w. The w is for winner: the answer the person picked.' },
      { sym: 'yl', at: [0, 200], text: { why: 'it lost the comparison: l for loser' },
        say: 'And y l, l for loser, is the answer they passed over. That is all a comparison tells us: which one won.' },
    ]);

    // 4. the plan: a hidden score, and a wish list for the rule
    const F4 = S.add(S.tex('P(\\yw \\succ \\yl) \\;=\\; \\;?', { size: 96 }).at(0, -200));
    const wish = [
      S.add(S.english('suppose every answer {y|yy} has a hidden {score r(y)|rr}: the higher, the more often people prefer it', { size: 38, width: 1500 }).at(0, -40)),
      S.add(S.english('we need a rule: two {scores|rr} in, the chance that one wins out', { size: 38 }).at(0, 40)),
      S.add(S.english('1. a chance is between 0 and 1     2. the two chances add up to 1     3. a higher {score|rr} wins more often', { size: 34, color: C.GREY_B, width: 1700 }).at(0, 150)),
    ];
    S.beat('Here is the idea. Suppose every answer has a hidden score, r, and the higher the score, the more often people prefer it. We need a rule that turns two scores into the chance that one of them wins.',
      S.endTour(F3), fade([F3, e3]), A.Write(F4, 1.4), S.writeIn(wish[0], 2.2), S.writeIn(wish[1], 1.6));
    S.beat('The rule has to give a chance between zero and one. The two chances, w wins and l wins, must add up to one. And a higher score should win more often.',
      S.writeIn(wish[2], 2.6));

    // 5. build it: strengths, and the winner's share
    const F5 = S.add(S.tex('P(\\yw \\succ \\yl) \\;=\\; \\frac{e^{\\rr(\\yw)}}{e^{\\rr(\\yw)} + e^{\\rr(\\yl)}}', { size: 92 }).at(0, -60));
    const e5 = S.add(S.english('give each answer a strength {e^r|rr}; the chance of winning is the winner’s share of the pair’s total strength', { size: 38, width: 1500 }).at(0, 140));
    const r5 = S.add(S.reason('because: e to any power is positive and grows with the power; a share lies between 0 and 1, and the two shares add to 1'));
    S.beat('Give each answer a strength: e to the power of its score. It is always positive, and grows with the score. Then let the chance of winning be the winner’s share of the two strengths. That meets all three wishes.',
      fade(wish), A.FadeOut(F4), A.Write(F5, 2), S.writeIn(e5, 2.2), S.writeIn(r5, 2));
    const e5b = S.add(S.english('this is the {softmax|pt} of chapter 3, over just two answers', { size: 38, color: C.GREY_B }).at(0, 140));
    S.beat('You have seen this before. It is the softmax from chapter three: exponentiate, then divide by the total. Here there are just two answers to share between.',
      A.FadeOut(e5), A.FadeOut(r5), S.writeIn(e5b, 1.6),
      { cap: 'You have seen this before. It is the softmax from chapter 3: exponentiate, then divide by the total. Here there are just two answers to share between.' });

    // 6. derive: divide through by the winner's strength
    const F6 = S.add(S.tex('\\;=\\; \\frac{1}{1 + e^{\\rr(\\yl) - \\rr(\\yw)}} \\;=\\; \\frac{1}{1 + e^{-(\\rr(\\yw) - \\rr(\\yl))}}', { size: 84 }).at(0, 120));
    const r6 = S.add(S.reason('because: dividing the top and the bottom by the same number changes nothing, and e^a / e^b = e^(a − b)'));
    S.beat('Now simplify. Divide the top and the bottom by the winner’s strength. That changes nothing. The top becomes one, and the bottom, one plus e to the loser’s score minus the winner’s.',
      A.FadeOut(e5b), UP(F5), A.Write(F6, 2.2), S.writeIn(r6, 1.8));

    // 7. name it: the sigmoid
    const F7 = S.add(S.tex('P(\\yw \\succ \\yl) \\;=\\; \\sig\\big(\\rr(\\yw) - \\rr(\\yl)\\big), \\qquad \\sig(t) \\;=\\; \\frac{1}{1 + e^{-t}}', { size: 80 }).at(0, -60));
    const box7 = S.add(S.rect(F7.w + 80, F7.h + 50, { stroke: S.color('rr'), width: 4, rx: 12 }).at(0, -60));
    S.paper('bradley1952');
    S.beat('The function one over one plus e to the minus t has a name: the sigmoid, sigma. So the chance that w wins is the sigmoid of the score gap. This is the Bradley-Terry model, published in nineteen fifty-two.',
      fade([F5, r6]), A.FadeOut(F6), A.Write(F7, 2.2), A.Create(box7, 0.8));
    S.tour(F7, [
      { sym: 'sig', at: [0, 160], text: { why: 'it squashes any score gap into a chance between 0 and 1' },
        say: 'The sigmoid takes any number, from minus infinity to infinity, and squashes it smoothly into a chance between zero and one.' },
    ]);
    const e7 = S.add(S.english('the {chance|sig} that people prefer {y_w|yw} is the {sigmoid|sig} of how much higher {its score|rr} is than {the other’s|rr}', { size: 40, width: 1500 }).at(0, 150));
    S.beat('Read it as a sentence: the chance that people prefer y w is the sigmoid of how much higher its score is than the other one’s.',
      S.endTour(F7), S.writeIn(e7, 2.4));

    // 8. only differences matter
    const F8 = S.add(S.tex('\\sig\\big((\\rr(\\yw) + c) - (\\rr(\\yl) + c)\\big) \\;=\\; \\sig\\big(\\rr(\\yw) - \\rr(\\yl)\\big)', { size: 76 }).at(0, 120));
    const r8 = S.add(S.reason('because: the constant c cancels in the gap; in the shares, e^(r + c) = e^c · e^r, and e^c cancels top and bottom'));
    S.beat('Notice what the formula cannot see. Add the same constant, c, to every score. The gap does not change, so neither does any chance. Comparisons pin down the gaps between scores, never their level.',
      A.FadeOut(e7), A.Write(F8, 2), S.writeIn(r8, 1.8));

    // 9. the sigmoid's shape, with numbers
    const AX = 60;
    const AY = 70;
    const ax = S.add(S.axes({ x0: -5, x1: 5, y0: 0, y1: 1, w: 1080, h: 380, xticks: [-4, -2, 0, 2, 4], yticks: [0, 0.5, 1], yfmt: (v) => String(v), xlabel: 'score gap  r(y_w) − r(y_l)', ylabel: 'chance y_w wins' }).at(AX, AY));
    const sc = ax.plot((t) => sig(t), { color: S.color('sig') === C.WHITE ? C.GREY_B : S.color('sig'), width: 7 });
    const marks = [0, 1, 2, -2].map((t) => S.add(S.group(dot(12, S.color('rr')), new Text(`${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(t)}:  ${sig(t).toFixed(2)}`, { size: 34, color: S.color('rr'), anchor: t < 0 ? 'end' : 'start' }).at(t < 0 ? -22 : 22, t === 0 ? -26 : 30)).at(AX + ax.fx(t), AY + ax.fy(sig(t)))));
    S.beat(`Here is the sigmoid. Equal scores, a gap of zero, give a coin flip. A gap of one gives ${sayPct(sig(1))}. A gap of two, ${sayPct(sig(2))}. And a gap of minus two, the mirror image: ${sayPct(sig(-2))}.`,
      fade([F7, box7, F8, r8]), A.MoveTo(h, 0, -455), A.FadeIn(ax), A.Create(sc, 1.6), lag(0.8, marks.map((m) => A.FadeIn(m, { from: 1.6 }))),
      { cap: `Here is the sigmoid. Equal scores, a gap of 0, give a coin flip. A gap of 1 gives ${pct(sig(1))}. A gap of 2, ${pct(sig(2))}. And a gap of −2, the mirror image: ${pct(sig(-2))}.` });
    const F9 = S.add(S.tex('\\sig(-t) \\;=\\; 1 - \\sig(t)', { size: 60 }).at(AX - 330, AY - 120));
    S.beat('That mirror is the second wish, built in: sigma of minus t is one minus sigma of t. The chance that l wins and the chance that w wins always add up to one.',
      A.Write(F9, 1.4), A.Indicate(marks[3], { scale: 1.3 }), A.Indicate(marks[2], { scale: 1.3 }),
      { cap: 'That mirror is the second wish, built in: σ(−t) = 1 − σ(t). The chance that l wins and the chance that w wins always add up to one.' });

    // 10. the gap is the log-odds
    const F10 = S.add(S.tex('\\log \\frac{P(\\yw \\succ \\yl)}{1 - P(\\yw \\succ \\yl)} \\;=\\; \\rr(\\yw) - \\rr(\\yl)', { size: 80 }).at(0, -60));
    const r10 = S.add(S.reason('because: 1 − σ(t) = e^(−t) / (1 + e^(−t)), so σ(t) / (1 − σ(t)) = 1 / e^(−t) = e^t, and log e^t = t'));
    const e10 = S.add(S.english(`a {score|rr} gap of 1 means odds of e to 1: about ${Math.E.toFixed(1)} to 1, or ${pct(sig(1))}`, { size: 40 }).at(0, 140));
    S.beat('Turn it around, and the scores get a meaning. The gap is the log of the odds. A gap of one point means odds of e to one, about two point seven to one.',
      fade([ax, sc, ...marks, F9]), A.Write(F10, 2), S.writeIn(r10, 2), S.writeIn(e10, 1.6),
      { cap: 'Turn it around, and the scores get a meaning. The gap is the log of the odds. A gap of one point means odds of e to one, about 2.7 to 1.' });

    // 11. a toy with five answers
    const toy = S.add(S.toy(700, -330));
    const XS = [-560, -280, 0, 280, 560];
    const names = RM.labels.map((l, i) => S.add(S.txt(l, { size: 54, font: 'mono' }).at(XS[i], -230)));
    const scores = T.map((r, i) => S.add(S.txt(num(r, 1), { size: 46, color: S.color('rr'), font: 'mono' }).at(XS[i], -150)));
    const rowL = S.add(S.txt('hidden score', { size: 34, color: C.GREY_B, anchor: 'end' }).at(-720, -150));
    const p1 = S.add(S.tex(`P(\\text{A} \\succ \\text{B}) \\;=\\; \\sig(${tnum(T[0], 1)} - ${tnum(T[1], 1)}) \\;=\\; \\sig(${tnum(T[0] - T[1], 1)}) \\;=\\; ${pAB.toFixed(2)}`, { size: 62 }).at(0, -10));
    const p2 = S.add(S.tex(`P(\\text{A} \\succ \\text{E}) \\;=\\; \\sig(${tnum(T[0], 1)} - (${tnum(T[4], 1)})) \\;=\\; \\sig(${tnum(T[0] - T[4], 1)}) \\;=\\; ${pAE.toFixed(2)}`, { size: 62 }).at(0, 100));
    const e11 = S.add(S.english(`so even the best answer loses to the worst one about one time in ten`, { size: 38, color: C.GREY_B }).at(0, 230));
    S.beat(`A small example, with made-up scores. Five answers, A to E. A beats B ${sayPct(pAB)} of the time. A beats E ${sayPct(pAE)} of the time. So even the best answer loses to the worst one, about one time in ten.`,
      fade([F10, r10, e10]), A.FadeIn(toy), A.FadeIn(rowL), lag(0.2, names.map((m) => A.FadeIn(m, { dy: 12 }))), lag(0.2, scores.map((m) => A.FadeIn(m, { dy: 12 }))), A.Write(p1, 1.6), A.Write(p2, 1.6), S.writeIn(e11, 1.6),
      { cap: `A small example, with made-up scores. Five answers, A to E. A beats B ${pct(pAB)} of the time. A beats E ${pct(pAE)} of the time. So even the best answer loses to the worst one, about one time in ten.` });

    // 12. the score as a network
    const net = S.add(S.box('language model', { w: 440, h: 130, color: C.TEAL, size: 42 }).at(-80, 40));
    const inp = S.add(S.box('prompt x + answer y', { w: 420, h: 100, color: C.GREY_B, size: 36 }).at(-640, 40));
    const head = S.add(S.box('one number', { w: 300, h: 100, color: S.color('rr'), size: 38 }).at(470, 40));
    const outT = S.add(S.tex(`${RP}(\\xx, \\yy)`, { size: 70 }).at(780, 40));
    const ar1 = S.add(S.arrow(-425, 40, -305, 40, { color: C.GREY_B, width: 5 }));
    const ar2 = S.add(S.arrow(145, 40, 315, 40, { color: C.GREY_B, width: 5 }));
    const e12 = S.add(S.english('a {reward model|rr}: a language model whose last layer gives one number instead of next-token {probabilities|pt}', { size: 38, width: 1500 }).at(0, 230));
    S.paper('christiano2017');
    S.beat('In practice, the hidden score is a neural network: a language model whose last layer outputs one number, instead of probabilities for the next token. In twenty seventeen, Christiano and colleagues trained such a reward model from human comparisons.',
      fade([toy, rowL, ...names, ...scores, p1, p2, e11]), A.FadeIn(inp, { dx: -20 }), A.Arrow(ar1, 0.5), A.FadeIn(net), A.Arrow(ar2, 0.5), A.FadeIn(head), A.Write(outT, 1), S.writeIn(e12, 2.2),
      { cap: 'In practice, the hidden score is a neural network: a language model whose last layer outputs one number, instead of probabilities for the next token. In 2017, Christiano and colleagues trained such a reward model from human comparisons.' });
  });

  /*
   * The reward model's loss as maximum likelihood, its gradient (the winner
   * up, the loser down, by the surprise 1 - sigma), and a fit on 20,000
   * simulated comparisons that recovers the true scores up to a shift.
   */
  video.scene('rmfit', 'Fitting a reward model', (S) => {
    const h = S.add(S.title('Training a reward model'));

    // 1. why: weights that explain the choices
    const goal = S.add(S.english('how should we set the {reward model’s weights|c7phi}, so that its {scores|rr} explain the choices people made?', { size: 44, width: 1500 }).at(0, -260));
    const F1 = S.add(S.tex(`${RP}(\\xx, \\yy)`, { size: 120 }).at(0, -40));
    S.beat('We have thousands of comparisons, and a network that outputs a score. How should we set its weights, so that its scores explain the choices people made?',
      A.FadeIn(h), S.writeIn(goal, 2.2), A.Write(F1, 1.4));
    S.tour(F1, [
      { sym: 'c7phi', at: [0, 200], say: 'We call the reward model’s weights phi, to keep them apart from the policy’s weights, theta. Training the reward model changes phi; the policy is not involved.',
        cap: 'We call the reward model’s weights φ, to keep them apart from the policy’s weights, θ. Training the reward model changes φ; the policy is not involved.' },
    ]);

    // 2. one comparison's probability under the model
    const L1 = S.add(S.tex(`P_{${PHI}}(\\yw \\succ \\yl) \\;=\\; \\sig(${GAP}), \\qquad ${GAP} \\;=\\; ${RP}(\\xx, \\yw) - ${RP}(\\xx, \\yl)`, { size: 70 }).at(0, -60));
    const r1 = S.add(S.reason('because: Bradley-Terry, with the network’s {scores|rr} as the hidden scores'));
    S.beat('Start with one comparison. Under the model, the choice the person actually made has a probability: the sigmoid of the gap between the network’s two scores. Call that gap delta.',
      S.endTour(F1), fade([goal, F1]), A.Write(L1, 2.2), S.writeIn(r1, 1.6), A.Spot(L1, 'c7gap'));
    const e1 = S.add(S.english('maximum likelihood: choose {φ|c7phi} so that what people actually chose looks as likely as possible', { size: 40, width: 1500 }).at(0, 140));
    S.beat('A good model of people should not be surprised by what they did. So choose phi to make the choices people actually made as likely as possible. Statisticians call this maximum likelihood.',
      A.Unspot(L1), A.FadeOut(r1), S.writeIn(e1, 2.2),
      { cap: 'A good model of people should not be surprised by what they did. So choose φ to make the choices people actually made as likely as possible. Statisticians call this maximum likelihood.' });

    // 3. all of them: a product
    const L2 = S.add(S.tex(`P_{${PHI}}(\\text{all } N \\text{ choices}) \\;=\\; \\prod_{i=1}^{N} \\sig(${GAP}_i)`, { size: 76 }).at(0, -60));
    const r2 = S.add(S.reason('because: for independent events, the chance of all of them is the product of their chances'));
    S.beat('For all the comparisons at once, assume they are independent. Then the chance of every choice together is the product of their chances, one sigmoid per comparison.',
      A.FadeOut(e1), UP(L1), A.Write(L2, 2), S.writeIn(r2, 1.6));

    // 4. take logs
    const L3 = S.add(S.tex(`\\log \\prod_{i=1}^{N} \\sig(${GAP}_i) \\;=\\; \\sum_{i=1}^{N} \\log \\sig(${GAP}_i)`, { size: 76 }).at(0, 130));
    const r3 = S.add(S.reason('because: the log of a product is the sum of the logs; and log only ever goes up, so the best {φ|c7phi} is the same'));
    S.beat('A product of twenty thousand numbers below one is too small for a computer to hold. So take the log. The product becomes a sum, and because the log only goes up, the best phi does not change.',
      A.FadeOut(r2), A.Write(L3, 2), S.writeIn(r3, 2),
      { cap: 'A product of 20,000 numbers below one is too small for a computer to hold. So take the log. The product becomes a sum, and because the log only goes up, the best φ does not change.' });

    // 5. flip the sign, average: the loss
    const L4 = S.add(S.tex(`${LL}(${PHI}) \\;=\\; -\\,\\EE_{(\\xx, \\yw, \\yl) \\sim ${DD}}\\Big[\\log \\sig\\big(${RP}(\\xx, \\yw) - ${RP}(\\xx, \\yl)\\big)\\Big]`, { size: 72 }).at(0, -60));
    const box4 = S.add(S.rect(L4.w + 80, L4.h + 50, { stroke: S.color('rr'), width: 4, rx: 12 }).at(0, -60));
    const r4 = S.add(S.reason('because: training minimises, so flip the sign; dividing by N turns the sum into an average over the comparisons'));
    S.beat('Training software minimises, so flip the sign. And divide by the number of comparisons, so the sum becomes an average. This is the reward model’s loss.',
      fade([L1, L2, r3]), A.MoveTo(L3, 0, -275), A.ScaleTo(L3, 0.72), A.Set(L3, { o: 0.5 }), A.Write(L4, 2.4), A.Create(box4, 0.8), S.writeIn(r4, 1.8));
    S.tour(L4, [
      { sym: 'c7L', at: [0, 175], say: 'Curly L is the loss: a single number that measures how surprised the model is by people’s choices. Training pushes it down.' },
      { sym: ['c7D', 'EE'], card: 'c7D', at: [0, 175], say: 'Curly D is the pile of comparisons: prompts, winners and losers, collected from people. The expectation means: averaged over that pile.' },
    ]);
    const e4 = S.add(S.english('the {loss|c7L}: on average over people’s {comparisons|c7D}, minus the log of the {chance|sig} the model gave to the choice they actually made', { size: 40, width: 1500 }).at(0, 160));
    S.beat('In a sentence: on average over the comparisons, minus the log of the chance the model gave to the choice people actually made.',
      S.endTour(L4), A.FadeOut(L3), A.FadeOut(r4), S.writeIn(e4, 2.4));

    // 6. what the loss charges, with numbers
    const AX = -330;
    const AY = 90;
    const ax = S.add(S.axes({ x0: -4, x1: 4, y0: 0, y1: 4, w: 780, h: 360, xticks: [-4, -2, 0, 2, 4], yticks: [0, 1, 2, 3, 4], xlabel: 'gap Δ', ylabel: 'loss −log σ(Δ)' }).at(AX, AY));
    const lc = ax.plot((t) => RL.btLoss(t, 0), { color: S.color('rr'), width: 7 });
    const pts = [2.2, 0, -2.2].map((t) => S.add(S.dot(12, C.WHITE).at(AX + ax.fx(t), AY + ax.fy(RL.btLoss(t, 0)))));
    const rows = [
      [`\\sig = ${sig(2.2).toFixed(2)}`, RL.btLoss(2.2, 0), 'expected the choice'],
      [`\\sig = ${sig(0).toFixed(2)}`, RL.btLoss(0, 0), 'a coin flip'],
      [`\\sig = ${sig(-2.2).toFixed(2)}`, RL.btLoss(-2.2, 0), 'confidently wrong'],
    ].map(([s, l, why], i) => S.add(S.group(
      new Tex(s, { size: 46 }).at(-120, 0),
      new Text(`loss ${l.toFixed(2)}`, { size: 38, color: S.color('rr'), anchor: 'start' }).at(20, 0),
      new Text(why, { size: 32, color: C.GREY_B, italic: true, anchor: 'start' }).at(20, 42)
    ).at(560, -110 + i * 135)));
    S.beat(`What does it charge? If the model gave people’s choice a chance of ${sayN(sig(2.2))}, the loss is small: ${sayN(RL.btLoss(2.2, 0))}. A coin flip costs ${sayN(RL.btLoss(0, 0))}. A confident mistake, ${sayN(sig(-2.2))}, costs ${sayN(RL.btLoss(-2.2, 0))}.`,
      fade([L4, box4, e4]), A.FadeIn(ax), A.Create(lc, 1.4), lag(0.9, pts.map((p, i) => par(A.FadeIn(p, { from: 2 }), A.FadeIn(rows[i], { dx: 20 })))),
      { cap: `What does it charge? If the model gave people’s choice a chance of ${sig(2.2).toFixed(2)}, the loss is small: ${RL.btLoss(2.2, 0).toFixed(2)}. A coin flip costs ${RL.btLoss(0, 0).toFixed(2)}. A confident mistake, ${sig(-2.2).toFixed(2)}, costs ${RL.btLoss(-2.2, 0).toFixed(2)}.` });

    // 7. the gradient: first the sigmoid's slope
    const G1 = S.add(S.tex('\\sig\'(t) \\;=\\; \\frac{e^{-t}}{(1 + e^{-t})^2} \\;=\\; \\sig(t)\\,\\big(1 - \\sig(t)\\big)', { size: 80 }).at(0, -60));
    const rg1 = S.add(S.reason('because: the chain rule on (1 + e^(−t))^(−1); then split the fraction as 1/(1 + e^(−t)) × e^(−t)/(1 + e^(−t))'));
    S.beat('Now, which way does training push the scores? We need one fact first: the slope of the sigmoid. It works out to sigma times one minus sigma.',
      fade([ax, lc, ...pts, ...rows]), A.Write(G1, 2.2), S.writeIn(rg1, 2));
    const G2 = S.add(S.tex(`\\frac{d}{d${GAP}}\\Big[-\\log \\sig(${GAP})\\Big] \\;=\\; -\\frac{\\sig'(${GAP})}{\\sig(${GAP})} \\;=\\; -\\big(1 - \\sig(${GAP})\\big)`, { size: 76 }).at(0, 130));
    const rg2 = S.add(S.reason('because: the chain rule, (log u)′ = u′ / u, and the slope of the sigmoid we just found'));
    S.beat('Then the loss of one comparison, minus log sigma of delta, has slope minus one minus sigma. The sigma on top cancels the sigma below.',
      A.FadeOut(rg1), A.Write(G2, 2.2), S.writeIn(rg2, 1.6),
      { cap: 'Then the loss of one comparison, −log σ(Δ), has slope −(1 − σ(Δ)). The σ on top cancels the σ below.' });

    // 8. the push: winner up, loser down
    const G3 = S.add(S.tex(`\\frac{\\partial\\, \\text{loss}}{\\partial\\, ${RP}(\\xx, \\yw)} = -\\big(1 - \\sig(${GAP})\\big), \\qquad \\frac{\\partial\\, \\text{loss}}{\\partial\\, ${RP}(\\xx, \\yl)} = +\\big(1 - \\sig(${GAP})\\big)`, { size: 62 }).at(0, -60));
    const rg3 = S.add(S.reason(`because: {Δ|c7gap} = winner’s {score|rr} − loser’s {score|rr}, so it moves +1 with the first and −1 with the second`));
    const e8 = S.add(S.english('a step downhill: the {winner’s score|rr} goes up, the {loser’s score|rr} goes down, both by {1 − σ(Δ)|c7gap}', { size: 40, width: 1500 }).at(0, 140));
    S.beat('Delta goes up with the winner’s score and down with the loser’s. So a step downhill on the loss raises the winner’s score, and lowers the loser’s, both by one minus sigma of delta.',
      A.FadeOut(rg2), A.FadeOut(G1), UP(G2), A.Write(G3, 2.4), S.writeIn(rg3, 1.6), S.writeIn(e8, 2),
      { cap: 'Δ goes up with the winner’s score and down with the loser’s. So a step downhill on the loss raises the winner’s score, and lowers the loser’s, both by 1 − σ(Δ).' });
    const e8b = S.add(S.english('for a network, back-propagation turns these two pushes on the {scores|rr} into a change of the {weights φ|c7phi}', { size: 36, color: C.GREY_B, width: 1500 }).at(0, 230));
    S.beat('For a network, back-propagation carries these two pushes on the scores back into the weights, phi, as usual.',
      A.FadeOut(rg3), S.writeIn(e8b, 2), { cap: 'For a network, back-propagation carries these two pushes on the scores back into the weights, φ, as usual.' });

    // 9. the push is the surprise
    const G4 = S.add(S.tex(`1 - \\sig(${GAP}) \\;=\\; \\sig(-${GAP})`, { size: 90 }).at(0, -60));
    const rg4 = S.add(S.reason('because: the mirror, σ(−t) = 1 − σ(t)'));
    const e9 = S.add(S.english('the size of the push is the {chance|sig} the model gave to the other outcome: how surprised it was', { size: 40, width: 1500 }).at(0, 100));
    const ex1 = S.add(S.english(`A beats E, as expected (Δ = 2.2):  push ${(1 - sig(2.2)).toFixed(2)}          E beats A, an upset (Δ = −2.2):  push ${(1 - sig(-2.2)).toFixed(2)}`, { size: 36, color: C.GREY_B, width: 1700 }).at(0, 200));
    S.beat('And one minus sigma of delta is the chance the model gave to the other outcome. The push is the model’s surprise. When A beats E, as expected, the scores barely move. When E beats A, an upset, they move a lot.',
      fade([G2, G3, e8, e8b]), A.Write(G4, 1.6), S.writeIn(rg4, 1.2), S.writeIn(e9, 2), S.writeIn(ex1, 2));

    // 10. the fit on simulated comparisons
    const toy = S.add(S.toy(760, -360));
    const AX2 = -340;
    const AY2 = 40;
    const ax2 = S.add(S.axes({ x0: -0.5, x1: 4.5, y0: -1.5, y1: 1.5, w: 900, h: 520, yticks: [-1, 0, 1], xlabel: '', ylabel: 'score' }).at(AX2, AY2));
    const xs = RM.labels.map((_, i) => AX2 + ax2.fx(i));
    const labs = RM.labels.map((l, i) => S.add(S.txt(l, { size: 44, font: 'mono' }).at(xs[i], AY2 + 300)));
    const truth = T.map((r, i) => S.add(S.line(xs[i] - 70, AY2 + ax2.fy(r), xs[i] + 70, AY2 + ax2.fy(r), { stroke: S.color('rr'), width: 6 }).with({ draw: 0 })));
    const fitD = RM.fit.r.map((r, i) => S.add(S.dot(16, S.color('c7phi')).at(xs[i], AY2 + ax2.fy(r))));
    const TX = 560;
    const th = [S.add(S.txt('true', { size: 36, color: S.color('rr') }).at(TX - 30, -250)), S.add(S.txt('fitted', { size: 36, color: S.color('c7phi') }).at(TX + 150, -250))];
    const trows = RM.labels.map((l, i) => S.add(S.group(
      new Text(l, { size: 38, font: 'mono' }).at(TX - 190, 0),
      new Text(num(T[i], 2), { size: 38, font: 'mono', color: S.color('rr') }).at(TX - 30, 0),
      new Text(num(RM.fit.r[i], 2), { size: 38, font: 'mono', color: S.color('c7phi') }).at(TX + 150, 0)
    ).at(0, -180 + i * 64)));
    const lossT = S.add(S.txt(`loss: ${L0.toFixed(3)} → ${Lfit.toFixed(3)}`, { size: 36, color: C.GREY_B }).at(TX, 175));
    S.beat(`Does it work? Take the five answers and their hidden scores, and simulate twenty thousand comparisons with Bradley-Terry odds. A beat E ${words(nAE)} times out of ${words(nAE + nEA)}: ${sayPct(nAE / (nAE + nEA))}, as predicted.`,
      fade([G4, rg4, e9, ex1]), A.FadeIn(toy), A.FadeIn(ax2), lag(0.1, labs.map((l) => A.FadeIn(l))), lag(0.15, truth.map((t) => A.Create(t, 0.4))), A.FadeIn(th[0]), lag(0.15, trows.map((r) => A.FadeIn(r))),
      { cap: `Does it work? Take the five answers and their hidden scores, and simulate 20,000 comparisons with Bradley-Terry odds. A beat E ${nAE.toLocaleString('en-US')} times out of ${(nAE + nEA).toLocaleString('en-US')}: ${pct(nAE / (nAE + nEA))}, as predicted.` });
    S.beat(`Now forget the scores, start every one at zero, and run gradient descent on the loss. It falls from ${sayN(L0)}, a coin flip on every comparison, to ${sayN(Lfit)}. The fitted scores land on the true ones.`,
      A.FadeIn(th[1]), lag(0.25, fitD.map((f) => A.FadeIn(f, { from: 2.5 }))), A.FadeIn(lossT),
      { cap: `Now forget the scores, start every one at zero, and run gradient descent on the loss. It falls from ${L0.toFixed(2)}, a coin flip on every comparison, to ${Lfit.toFixed(2)}. The fitted scores land on the true ones.` });

    // 11. up to a shift
    const shT = S.add(S.txt('+10', { size: 36, color: S.color('c7phi') }).at(TX + 300, -250));
    const shRows = RM.fit.r.map((r, i) => S.add(S.txt(num(r + 10, 2), { size: 38, font: 'mono', color: S.color('c7phi') }).at(TX + 300, -180 + i * 64)));
    const lossS = S.add(S.txt(`loss with +10: ${Lshift.toFixed(3)}`, { size: 36, color: C.GREY_B }).at(TX, 235));
    S.beat('Up to one thing. Add ten to every fitted score, and the loss does not change at all. Comparisons only ever see gaps. So a reward model’s scores have no natural zero; by convention, we centre them.',
      A.FadeIn(shT), lag(0.15, shRows.map((m) => A.FadeIn(m, { dx: -10 }))), A.FadeIn(lossS));
    const e11 = S.add(S.english('what we have now: a {score|rr} for any answer, even one nobody has compared', { size: 40 }).at(0, 330));
    S.beat('What it buys us: a reward for any answer, even one nobody has ever compared. That is exactly what policy gradients need.',
      S.writeIn(e11, 2));
  });

  /*
   * The InstructGPT recipe (numbers from the ouyang2022 record only).
   */
  video.scene('instruct', 'InstructGPT', (S) => {
    const h = S.add(S.title('The RLHF recipe'));
    const steps = [['1  imitate', 'demonstrations', C.TEAL], ['2  reward model', 'from rankings', S.color('rr')], ['3  PPO', 'with a KL penalty', S.color('grad')]];
    const BY = -270;
    const boxes = steps.map(([a, b, col], i) => S.add(S.box(a, { w: 480, h: 150, color: col, size: 42, sub: b }).at(-580 + i * 580, BY)));
    const ar = [0, 1].map((i) => S.add(S.arrow(-580 + i * 580 + 250, BY, -580 + (i + 1) * 580 - 250, BY, { color: C.GREY_B, width: 5 })));
    const e0 = S.add(S.english('imitation (chapter 2), {policy gradients|grad} and PPO (chapters 3 to 6), a {learned reward|rr} (this chapter)', { size: 38, color: C.GREY_B, width: 1600 }).at(0, -40));
    S.paper('ouyang2022');
    S.beat('Now we have every piece. In twenty twenty-two, OpenAI put them together to turn G P T 3 into InstructGPT. The recipe has three steps, and you have met all of them.',
      A.FadeIn(h), lag(1.0, boxes.map((b, i) => seq(A.FadeIn(b, { dy: 20, dur: 0.6 }), i < 2 ? A.Arrow(ar[i], 0.5) : wait(0)))), S.writeIn(e0, 2.2),
      { cap: 'Now we have every piece. In 2022, OpenAI put them together to turn GPT-3 into InstructGPT. The recipe has three steps, and you have met all of them.' });

    // step 1
    const hi = (i) => par(boxes.map((b, j) => A.Set(b, { o: j === i ? 1 : 0.35 }, 0.6)));
    const d1 = S.add(S.english('people write good answers; the model is fine-tuned to imitate them', { size: 40 }).at(0, 30));
    const d1b = S.add(S.english('the result: the {supervised model|pref}, which becomes the {reference π_ref|pref}', { size: 40 }).at(0, 120));
    S.beat('Step one: people write good answers to prompts, and the model is fine-tuned to imitate them, with the loss from chapter two. The result is the supervised model. It will be our reference, pi ref.',
      A.FadeOut(e0), hi(0), S.writeIn(d1, 1.8), S.writeIn(d1b, 1.8),
      { cap: 'Step one: people write good answers to prompts, and the model is fine-tuned to imitate them, with the loss from chapter 2. The result is the supervised model. It will be our reference, π_ref.' });

    // step 2: rankings give comparisons
    const d2 = S.add(S.english('the model writes K = 4 to 9 answers per prompt; labelers rank them', { size: 40 }).at(0, 20));
    const F2 = S.add(S.tex('\\text{pairs in a ranking of } \\cKnob{c7K}{K} \\;=\\; \\binom{\\cKnob{c7K}{K}}{2} \\;=\\; \\frac{\\cKnob{c7K}{K}(\\cKnob{c7K}{K} - 1)}{2}', { size: 62 }).at(0, 130));
    const d2b = S.add(S.english('K = 4: 6 comparisons      K = 9: 36 comparisons, each a term of the {Bradley-Terry loss|c7L}', { size: 36, color: C.GREY_B, width: 1600 }).at(0, 250));
    S.beat('Step two: the model writes four to nine answers to each prompt, and labelers rank them. A ranking of K answers contains K times K minus one over two pairs: six to thirty-six comparisons, each one a term of the loss we just built.',
      fade([d1, d1b]), hi(1), S.writeIn(d2, 1.6), A.Write(F2, 2), S.writeIn(d2b, 1.8),
      { cap: 'Step two: the model writes 4 to 9 answers to each prompt, and labelers rank them. A ranking of K answers contains K(K − 1)/2 pairs: 6 to 36 comparisons, each one a term of the loss we just built.' });

    // step 3: PPO with the penalty
    const F3 = S.add(S.tex(`${RP}(\\xx, \\yy) \\;-\\; \\bt\\, \\log \\frac{\\pt(\\yy \\mid \\xx)}{\\pref(\\yy \\mid \\xx)}`, { size: 76 }).at(0, 50));
    const d3 = S.add(S.english('the policy is rewarded by the {reward model|rr}, minus a penalty for drifting from the {supervised model|pref}; {β = 0.02|bt}, per token', { size: 38, width: 1500 }).at(0, 210));
    S.beat('Step three: P P O, against the reward model, with one more term. The policy pays a penalty for drifting from the supervised model, scaled by beta, equal to zero point zero two, and charged token by token. That penalty is the next chapter.',
      fade([d2, F2, d2b]), hi(2), A.Write(F3, 2.2), S.writeIn(d3, 2.2),
      { cap: 'Step three: PPO, against the reward model, with one more term. The policy pays a penalty for drifting from the supervised model, scaled by β = 0.02, and charged token by token. That penalty is the next chapter.' });

    // the result
    const small = S.add(S.creature({ color: C.TEAL, kind: 'agent', size: 0.5 }).at(-300, 120));
    const large = S.add(S.creature({ color: C.GREY, kind: 'agent', size: 1.25 }).at(300, 60));
    const sl = S.add(S.txt('InstructGPT, 1.3B', { size: 38, color: C.TEAL }).at(-300, 250));
    const ll = S.add(S.txt('GPT-3, 175B', { size: 38, color: C.GREY_B }).at(300, 250));
    const pref = S.add(S.tex('\\succ', { size: 96 }).at(0, 120));
    S.beat('The result: labelers preferred the answers of the one point three billion parameter InstructGPT to those of the one hundred and seventy-five billion parameter G P T 3, a model more than a hundred times larger.',
      fade([F3, d3]), par(boxes.map((b) => A.Set(b, { o: 1 }, 0.6))), A.FadeIn(small, { dy: 20 }), A.FadeIn(sl), A.FadeIn(large, { dy: 20 }), A.FadeIn(ll), A.FadeIn(pref, { from: 2 }), A.Mood(small, 1),
      { cap: 'The result: labelers preferred the answers of the 1.3B-parameter InstructGPT to those of the 175B-parameter GPT-3, a model more than 100 times larger.' });
  });

  /*
   * Reward hacking: a proxy's errors are what optimisation finds. The leash
   * toy shows it; Gao et al. measured it (functional form from the record).
   */
  video.scene('hacking', 'Reward hacking', (S) => {
    const h = S.add(S.title('Goodhart’s law'));

    // 1. why: the policy pleases the proxy
    const e1 = S.add(S.english('the {policy|pt} is trained to please the {reward model|rr}: a model of what people prefer, fitted to a finite pile of {comparisons|c7D}', { size: 42, width: 1500 }).at(0, -250));
    const F1 = S.add(S.tex(`${RP}(\\yy) \\;=\\; \\underbrace{\\cReward{c7true}{r^{\\text{true}}}(\\yy)}_{\\text{what people prefer}} \\;+\\; \\underbrace{\\text{error}(\\yy)}_{\\text{the model’s mistake}}`, { size: 76 }).at(0, -30));
    S.beat('Now the catch. The policy is not trained to please people. It is trained to please the reward model: a model of what people prefer, fitted to a finite pile of comparisons. Think of its score as the truth, plus an error.',
      A.FadeIn(h), S.writeIn(e1, 2.4), A.Write(F1, 2.4));
    const e2 = S.add(S.english('when a measure becomes a target, it stops being a good measure', { size: 44, italic: true }).at(0, 170));
    const e2b = S.add(S.english('optimisation hunts for the highest {score|rr}, and finds the answers whose {error|rr} is largest', { size: 38, color: C.GREY_B, width: 1500 }).at(0, 260));
    S.beat('Economists call this Goodhart’s law: when a measure becomes a target, it stops being a good measure. Optimisation hunts for the highest score, and the highest scores belong, more and more, to answers whose error is large.',
      S.writeIn(e2, 2), S.writeIn(e2b, 2));

    // 2. the leash toy: the proxy overrates flattery
    const toy = S.add(S.toy(720, -330));
    const BX = -330;
    const BY = 230;
    const bars = S.add(S.bars({ labels: LEASH.labels, values: LEASH.ref, h: 380, w: 130, gap: 80, color: S.color('pp'), labelFont: 'serif', labelSize: 36, valueSize: 30 }).at(BX, BY));
    const rl = LEASH.r.map((r, i) => S.add(S.txt(`r = ${r}`, { size: 32, color: S.color('rr'), font: 'mono' }).at(BX + bars.xs[i], BY + 92)));
    const pl = S.add(S.tex('\\pref', { size: 60 }).at(BX - 420, BY - 300));
    const ER = S.add(S.txt(`average reward ${Eref.toFixed(2)}`, { size: 40, color: S.color('rr') }).at(560, -60));
    const e3 = S.add(side(S, 'people prefer {helpful|#83C167} answers; the {reward model|rr} pays most for {flattery|#D147BD}', 560, 60, 620, 36));
    S.beat(`A toy version. One prompt, four kinds of answer. The starting model is mostly vague, sometimes helpful, rarely rude or flattering. People prefer helpful answers. But the reward model has a flaw: it pays one point five for flattery.`,
      fade([e1, F1, e2, e2b]), A.FadeIn(toy), A.FadeIn(bars), A.FadeIn(pl), lag(0.3, rl.map((m) => A.FadeIn(m, { dy: 10 }))), A.FadeIn(ER), S.writeIn(e3, 1.8), A.Indicate(rl[best], { color: C.RED, scale: 1.3 }),
      { cap: 'A toy version. One prompt, four kinds of answer. The starting model is mostly vague, sometimes helpful, rarely rude or flattering. People prefer helpful answers. But the reward model has a flaw: it pays 1.5 for flattery.' });
    const allIn = LEASH.r.map((_, i) => (i === best ? 1 : 0));
    const pl2 = S.add(S.tex('\\pp', { size: 60 }).at(BX - 420, BY - 300));
    const e4 = S.add(side(S, 'answers that are longer, more flattering or more confident than they should be: this is {reward hacking|rr}', 560, 200, 620, 34));
    S.beat('Maximise that reward with nothing holding the policy back, and it learns to flatter every single time. The average reward climbs to one point five. People are worse off. This is called reward hacking.',
      A.FadeOut(pl), A.FadeIn(pl2), bars.to(allIn, 2), A.Count(ER, Eref, 1.5, (v) => `average reward ${v.toFixed(2)}`, 2), S.writeIn(e4, 2),
      { cap: 'Maximise that reward with nothing holding the policy back, and it learns to flatter every single time. The average reward climbs to 1.5. People are worse off. This is called reward hacking.' });

    // 3. Gao, Schulman and Hilton: measured
    const GA = 1;
    const GB = 0.45;
    const gold = (d) => (d <= 0 ? 0 : d * (GA - GB * Math.log(d)));
    const proxy = (d) => gold(d) + 0.06 * d * d;
    const AX = -110;
    const AY = 70;
    const ax = S.add(S.axes({ x0: 0, x1: 8, y0: 0, y1: 4.5, w: 1000, h: 400, xticks: [0, 2, 4, 6, 8], yticks: [0, 1, 2, 3, 4], xlabel: 'distance d', ylabel: 'reward' }).at(AX, AY));
    const pc = ax.plot(proxy, { color: S.color('rr'), width: 6, from: 0.001, to: 8, dash: '16 12' });
    const gc = ax.plot(gold, { color: S.color('rr'), width: 7, from: 0.001, to: 8 });
    const pL = S.add(S.txt('proxy reward model', { size: 34, color: S.color('rr'), anchor: 'end' }).at(AX + ax.fx(7.3), AY + ax.fy(proxy(7.3)) - 10));
    const gL = S.add(S.txt('gold reward model', { size: 34, color: S.color('rr') }).at(AX + ax.fx(6.4), AY + ax.fy(gold(6.4)) + 44));
    const shape = S.add(S.txt('toy curves: the shape, not the paper’s numbers', { size: 30, color: C.GREY, italic: true }).at(AX + 120, -330));
    S.paper('gao2023');
    S.beat('Gao, Schulman and Hilton measured this. A large gold reward model stood in for people, and smaller proxy reward models were trained on its labels. Optimise against a proxy, and the proxy score keeps climbing. The gold score rises, peaks, and falls.',
      fade([toy, bars, ...rl, pl2, ER, e3, e4]), A.FadeIn(ax), A.FadeIn(shape), A.Create(pc, 2), A.FadeIn(pL), A.Create(gc, 2.4), A.FadeIn(gL));
    const FG = S.add(S.tex('\\cReward{c7R}{R}_{\\mathrm{RL}}(\\cLeash{c7d}{d}) \\;=\\; \\cLeash{c7d}{d}\\,\\big(\\alpha - \\beta \\log \\cLeash{c7d}{d}\\big), \\qquad \\cLeash{c7d}{d} \\;=\\; \\sqrt{\\KL(\\pp \\,\\|\\, \\pi_{\\mathrm{init}})}', { size: 52 }).at(AX + 40, -250));
    const nG = S.add(S.english('{α|#BBBBBB}, {β|#BBBBBB}: constants fitted to each experiment; this {β|#BBBBBB} is not the {leash β|bt} of chapter 8', { size: 32, color: C.GREY_B, width: 1500 }).at(0, 330));
    S.beat('They found the gold score follows a simple form in the distance travelled, d, the square root of a K L divergence we will define next chapter. Alpha and beta here are constants fitted to each experiment. This beta is not the one in our formulas.',
      A.FadeOut(shape), A.Write(FG, 2.4), S.writeIn(nG, 2),
      { cap: 'They found the gold score follows a simple form in the distance travelled, d: the square root of a KL divergence we will define next chapter. α and β here are constants fitted to each experiment. This β is not the one in our formulas.' });
    const e6 = S.add(side(S, 'a gain that grows with the distance, {d|c7d}, minus a cost, {d|c7d} log {d|c7d}, that grows a little faster and wins in the end', AX + 60, -140, 1300, 34));
    S.beat('Read it as a gain that grows with the distance, minus a cost, d log d, that grows a little faster, and wins in the end. Up to a point, optimising the proxy helps. Beyond it, it hurts.',
      S.writeIn(e6, 2.4), A.Indicate(gL, { color: C.RED, scale: 1.1 }));

    // 4. what we need
    const e7 = S.add(S.english('the {reward model|rr} learned from answers like the {starting model’s|pref}: it is trustworthy near there', { size: 40, width: 1500 }).at(0, -60));
    const e8 = S.add(S.english('so we need a leash: a price for moving away from the {starting model|pref}', { size: 46, color: S.color('bt') }).at(0, 60));
    const e9 = S.add(S.english('and to put a price on distance, first a way to measure it', { size: 38, color: C.GREY_B }).at(0, 160));
    S.beat('Where can the reward model be trusted? Near the answers it learned from: answers like the starting model’s. So we need a leash: a price for moving away from the starting model. And to put a price on distance, we first need to measure it.',
      fade([ax, pc, gc, pL, gL, FG, nG, e6]), S.writeIn(e7, 2), S.writeIn(e8, 2), S.writeIn(e9, 1.6));
  });
});
